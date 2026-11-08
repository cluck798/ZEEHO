package com.zeeho.signpanel

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 每日签到闹钟：到点后立即入队一次签到（由 SignWorker 执行），并排下一天的闹钟。
 * 闹钟路径用于兜底 WorkManager 被厂商省电策略延后的场景。
 */
class SignAlarmReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_FIRE = "com.zeeho.signpanel.SIGN_ALARM"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        ZHLog.log("SignAlarmReceiver fired")
        runCatching { SignWorker.enqueueNow(context) }
            .onFailure { ZHLog.error("alarm enqueue sign failed", it) }
        runCatching { ZHWorkScheduler.scheduleDailyAlarm(context) }
            .onFailure { ZHLog.error("alarm reschedule failed", it) }
    }
}
