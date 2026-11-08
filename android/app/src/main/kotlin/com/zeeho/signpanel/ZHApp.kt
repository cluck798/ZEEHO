package com.zeeho.signpanel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

/**
 * Application 入口：创建通知通道、初始化 OkHttp / Store / Notifier 单例、调度后台任务。
 *
 * 后台任务统一交给 ZHWorkScheduler：WorkManager 每日签到 + AlarmManager 精确闹钟兜底 + 小组件刷新。
 */
class ZHApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        ZHHttpClient.init(this)
        ZHStore.init(this)
        ZHNotifier.init(this)
        ZHWorkScheduler.scheduleAll(this)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(NotificationManager::class.java) ?: return
        val id = ZHNotifier.CHANNEL_ID
        if (mgr.getNotificationChannel(id) != null) return
        val name = getString(R.string.notif_channel_name)
        val chan = NotificationChannel(id, name, NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = getString(R.string.notif_channel_desc)
            enableVibration(true)
            enableLights(false)
        }
        mgr.createNotificationChannel(chan)
    }
}
