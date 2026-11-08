package com.zeeho.signpanel

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 开机 / 应用更新 / 系统时间变化后重新注册后台任务。
 * WorkManager 自身会在重启后恢复，这里额外补一次闹钟与周期任务，避免厂商 ROM 丢任务。
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                ZHLog.log("BootReceiver: ${intent.action}")
                runCatching { ZHWorkScheduler.scheduleAll(context) }
                    .onFailure { ZHLog.error("reschedule after boot failed", it) }
            }
        }
    }
}
