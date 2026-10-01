package com.zeeho.signpanel

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * 本地通知桥：__notify(title, subtitle, body) → NotificationManager。
 *
 * 通道在 ZHApp.onCreate 统一创建（id=zeeho_default，importance=DEFAULT）。
 * 安卓 13+ 需运行时申请 POST_NOTIFICATIONS（在 MainActivity 里做）；权限被拒时降级 Toast，
 * 至少签到/车控结果反馈不丢。
 *
 * 对应 iOS 端 ZHDispatcher 内的 __notify + UNUserNotificationCenter。
 */
object ZHNotifier {
    const val CHANNEL_ID = "zeeho_default"

    private lateinit var context: Context
    private var nextId = 1

    fun init(context: Context) {
        this.context = context.applicationContext
        // 通道也在 ZHApp.onCreate 创建一次，这里幂等
        createChannelIfNeeded()
    }

    private fun createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = context.getSystemService(NotificationManager::class.java) ?: return
            if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
            val name = context.getString(R.string.notif_channel_name)
            val chan = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = context.getString(R.string.notif_channel_desc)
                enableVibration(true)
                enableLights(false)
            }
            mgr.createNotificationChannel(chan)
        }
    }

    fun isGranted(): Boolean = NotificationManagerCompat.from(context).areNotificationsEnabled()

    fun notify(title: String, subtitle: String, body: String) {
        if (!this::context.isInitialized) return
        createChannelIfNeeded()

        val text = listOf(subtitle, body).filter { it.isNotEmpty() }.joinToString(" ").trim()
        val notif = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle(if (title.isNotEmpty()) title else context.getString(R.string.app_name))
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(nextId++, notif)
        } catch (e: SecurityException) {
            // 安卓 13+ 未授予 POST_NOTIFICATIONS 时降级 Toast
            Toast.makeText(context, "$title $body", Toast.LENGTH_LONG).show()
        }
    }
}
