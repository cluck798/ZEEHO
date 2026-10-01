package com.zeeho.signpanel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Application 入口：创建通知通道、初始化 OkHttp / Store / Notifier 单例、调度后台签到 Work。
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
        scheduleDailySignWork()
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

    /**
     * 注册每日定时签到 Work：每日 7:00 触发（与核心脚本 cron "0 7 * * *" 对齐）。
     *
     * PeriodicWorkRequest 最短周期 15min，且系统在 Doze 模式下可能延迟，但 daily 周期 +
     * setInitialDelay 计算到下次 7:00 的毫秒数，可在大多数情况下准时触发。
     * KEEP 策略：若已存在同名 Work，新注册被忽略（避免重启 App 后重复调度）。
     */
    private fun scheduleDailySignWork() {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, SignWorker.TRIGGER_HOUR)
            set(Calendar.MINUTE, SignWorker.TRIGGER_MINUTE)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(now)) add(Calendar.DAY_OF_MONTH, 1)
        }
        val initialDelay = (target.timeInMillis - now.timeInMillis).coerceAtLeast(0L)

        val request = PeriodicWorkRequestBuilder<SignWorker>(1, TimeUnit.DAYS)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SignWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
        ZHLog.log("SignWorker scheduled, initial delay ${initialDelay}ms")
    }
}
