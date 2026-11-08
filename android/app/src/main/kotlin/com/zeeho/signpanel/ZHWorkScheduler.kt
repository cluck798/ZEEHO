package com.zeeho.signpanel

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * 后台任务调度：WorkManager 每日签到 + AlarmManager 精确闹钟兜底 + 桌面小组件周期刷新。
 *
 * 两条路并存的原因：
 * - WorkManager 在 Doze / 厂商省电策略下可能被延后数小时甚至不执行；
 * - AlarmManager.setExactAndAllowWhileIdle 可在 Doze 下唤醒（Android 12+ 需精确闹钟权限，
 *   无权限时降级为 setAndAllowWhileIdle），更适合「每天固定时间必须签到」。
 * - 应用被「强行停止」后系统会取消全部任务，只能等用户再次打开 App（系统限制）。
 */
object ZHWorkScheduler {
    private const val PREFS = "zeeho_sched"
    private const val KEY_DAILY_AT = "daily_at"
    private const val ALARM_REQ = 0x5A17

    fun scheduleAll(context: Context) {
        scheduleDailySignWork(context)
        scheduleWidgetWork(context)
        scheduleDailyAlarm(context)
    }

    /** 每日 7:00 的后台签到（WorkManager，重启后由系统恢复） */
    fun scheduleDailySignWork(context: Context) {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, SignWorker.TRIGGER_HOUR)
            set(Calendar.MINUTE, SignWorker.TRIGGER_MINUTE)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(now)) add(Calendar.DAY_OF_MONTH, 1)
        }
        val delay = (target.timeInMillis - now.timeInMillis).coerceAtLeast(0L)
        val request = PeriodicWorkRequestBuilder<SignWorker>(1, TimeUnit.DAYS)
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .build()
        runCatching {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                SignWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }.onFailure { ZHLog.error("schedule daily work failed", it) }
        ZHLog.log("SignWorker scheduled, initial delay ${delay}ms")
    }

    /** 桌面小组件后台刷新：每 30 分钟 */
    fun scheduleWidgetWork(context: Context) {
        val request = PeriodicWorkRequestBuilder<ZHWidgetWorker>(30, TimeUnit.MINUTES).build()
        runCatching {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "zeeho_widget_periodic",
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }.onFailure { ZHLog.error("schedule widget work failed", it) }
    }

    /**
     * 每日 7:00 的精确闹钟（WorkManager 被省电策略压住时的兜底）。
     * 闹钟触发后由 SignAlarmReceiver 入队一次签到并自动排下一天。
     */
    fun scheduleDailyAlarm(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, SignWorker.TRIGGER_HOUR)
            set(Calendar.MINUTE, SignWorker.TRIGGER_MINUTE)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(Calendar.getInstance())) add(Calendar.DAY_OF_MONTH, 1)
        }
        val at = target.timeInMillis
        val pi = alarmPendingIntent(context)
        try {
            val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
            if (canExact) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            }
            ZHLog.log("daily alarm scheduled at ${target.time}")
        } catch (e: Exception) {
            runCatching { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi) }
            ZHLog.error("schedule daily alarm failed", e)
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putLong(KEY_DAILY_AT, at).apply()
    }

    private fun alarmPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, SignAlarmReceiver::class.java)
            .setAction(SignAlarmReceiver.ACTION_FIRE)
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        return PendingIntent.getBroadcast(context, ALARM_REQ, intent, flags)
    }
}
