package com.zeeho.signpanel

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withTimeoutOrNull

/**
 * 后台定时签到 Worker：每日由 WorkManager 触发，调核心脚本 /api/run-signin（all:true）。
 *
 * 复用 ZHDispatcher：每请求新建 QuickJs 实例 → 注入 shim + 核心脚本 → 执行签到逻辑。
 * 签到结果（成功/失败/已签到）由脚本侧 runSigninBatch 通过 __notify 发通知。
 * Worker 自身只关心 dispatch 是否成功，不解析业务结果。
 *
 * 失败重试策略：脚本异常或 dispatch 超时返回 Result.retry()，WorkManager 会按指数退避重试。
 */
class SignWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        ZHLog.log("SignWorker start")
        return try {
            val dispatcher = ZHDispatcher(applicationContext)
            val headers = mapOf(
                "Content-Type" to "application/json",
                "Host" to "zeeho.box",
            )
            val body = """{"all":true}"""
            val result = withTimeoutOrNull(170_000) {
                dispatcher.dispatch(
                    "POST",
                    "http://zeeho.box/api/run-signin",
                    headers,
                    body,
                )
            } ?: run {
                ZHLog.error("SignWorker timeout")
                return Result.retry()
            }
            ZHLog.log("SignWorker done: status=${result.status}, bodyLen=${result.body.length}")
            if (result.status in 200..299) Result.success()
            else Result.retry()
        } catch (e: Exception) {
            ZHLog.error("SignWorker failed", e)
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "zeeho_daily_sign"
        /** 默认每日触发时刻（与核心脚本 cron "0 7 * * *" 对齐） */
        const val TRIGGER_HOUR = 7
        const val TRIGGER_MINUTE = 0
    }
}
