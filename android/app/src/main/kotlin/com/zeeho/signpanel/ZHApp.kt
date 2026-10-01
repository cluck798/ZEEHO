package com.zeeho.signpanel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

/**
 * Application 入口：创建通知通道、初始化 OkHttp / Store / Notifier 单例。
 *
 * 对应 iOS 端 AppDelegate.m（窗口/根 VC 部分由 MainActivity 承接；崩溃日志弹窗暂不移植）。
 */
class ZHApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        ZHHttpClient.init(this)
        ZHStore.init(this)
        ZHNotifier.init(this)
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
