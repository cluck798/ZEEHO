package com.zeeho.signpanel

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * 小组件数据刷新：请求本地面板服务 GET /api/widget-snapshot（与 iOS 共用接口）。
 * 成功后写入缓存并重绘全部小组件；服务未启动时保留缓存并提示打开 App。
 */
class ZHWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val ctx = applicationContext
        val port = ctx.getSharedPreferences(ZHPanelService.PREF_NAME, Context.MODE_PRIVATE)
            .getInt(ZHPanelService.PREF_PORT_KEY, -1)
        if (port > 0) {
            val client = OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .build()
            val req = Request.Builder()
                .url("http://127.0.0.1:$port/api/widget-snapshot")
                .get()
                .build()
            try {
                client.newCall(req).execute().use { resp ->
                    val body = resp.body?.string()
                    if (resp.isSuccessful && !body.isNullOrBlank()) {
                        ctx.getSharedPreferences(ZHWidgetProvider.CACHE_PREFS, Context.MODE_PRIVATE)
                            .edit()
                            .putString(ZHWidgetProvider.CACHE_SNAPSHOT, body)
                            .putLong(ZHWidgetProvider.CACHE_TS, System.currentTimeMillis())
                            .apply()
                    } else {
                        ZHLog.error("widget snapshot http ${resp.code}")
                    }
                }
            } catch (e: Exception) {
                ZHLog.error("widget snapshot failed", e)
            }
        }
        ZHWidgetProvider.updateAll(ctx)
        Result.success()
    }
}
