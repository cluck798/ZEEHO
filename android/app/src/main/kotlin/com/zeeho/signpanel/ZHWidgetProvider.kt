package com.zeeho.signpanel

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * 安卓桌面小组件：电量 / 续航 / 电压 / 充电状态 / 签到进度。
 *
 * 数据来自本地面板服务 GET /api/widget-snapshot（与 iOS 小组件使用同一接口）。
 * 刷新时机：系统 30 分钟周期（updatePeriodMillis）＋ 右上角刷新按钮 ＋ 打开面板后活动刷新。
 * 服务未运行时展示上次缓存，并提示打开 App。
 */
class ZHWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.zeeho.signpanel.action.WIDGET_REFRESH"
        const val ACTION_SIGN = "com.zeeho.signpanel.action.WIDGET_SIGN"
        const val CACHE_PREFS = "zeeho_widget"
        const val CACHE_SNAPSHOT = "snapshot"
        const val CACHE_TS = "ts"

        /** 请求后台刷新（唯一任务，避免并发重复请求；无小组件时跳过） */
        fun requestRefresh(context: Context) {
            try {
                val ids = AppWidgetManager.getInstance(context)
                    .getAppWidgetIds(ComponentName(context, ZHWidgetProvider::class.java))
                if (ids.isEmpty()) return
                WorkManager.getInstance(context).enqueueUniqueWork(
                    "zeeho_widget_refresh",
                    ExistingWorkPolicy.REPLACE,
                    OneTimeWorkRequestBuilder<ZHWidgetWorker>()
                        .setInitialDelay(1, TimeUnit.SECONDS)
                        .build()
                )
            } catch (e: Exception) {
                ZHLog.error("widget enqueue failed", e)
            }
        }

        /** 用缓存（若有）立即重绘全部小组件，再由 Worker 异步更新 */
        fun updateAll(context: Context) {
            try {
                val mgr = AppWidgetManager.getInstance(context)
                val ids = mgr.getAppWidgetIds(ComponentName(context, ZHWidgetProvider::class.java))
                if (ids.isEmpty()) return
                val prefs = context.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
                val raw = prefs.getString(CACHE_SNAPSHOT, null)
                val ts = prefs.getLong(CACHE_TS, 0L)
                val obj = try {
                    if (raw.isNullOrBlank()) null else JSONObject(raw)
                } catch (e: Exception) {
                    null
                }
                for (id in ids) {
                    mgr.updateAppWidget(id, buildViews(context, id, obj, ts))
                }
            } catch (e: Exception) {
                ZHLog.error("widget updateAll failed", e)
            }
        }

        private fun buildViews(context: Context, widgetId: Int, o: JSONObject?, ts: Long): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_zeeho)

            // 点击任意区域打开 App
            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val piOpen = PendingIntent.getActivity(
                context, widgetId, openIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_root, piOpen)

            // 右上角刷新
            val refreshIntent = Intent(context, ZHWidgetProvider::class.java).setAction(ACTION_REFRESH)
            val piRefresh = PendingIntent.getBroadcast(
                context, widgetId * 10 + 1, refreshIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_refresh, piRefresh)

            // 签到行：点击立即签到（WorkManager 执行，无需后台常驻）
            val signIntent = Intent(context, ZHWidgetProvider::class.java).setAction(ACTION_SIGN)
            val piSign = PendingIntent.getBroadcast(
                context, widgetId * 10 + 2, signIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_sign, piSign)

            if (o == null || !o.optBoolean("ok", false)) {
                val err = o?.optString("error").orEmpty()
                views.setTextViewText(R.id.widget_title, "极核 ZEEHO")
                views.setTextViewText(R.id.widget_online, "● 打开 App 刷新")
                views.setTextColor(R.id.widget_online, Color.parseColor("#F59E0B"))
                views.setTextViewText(R.id.widget_soc, "--")
                views.setTextViewText(R.id.widget_range, "续航 --")
                views.setTextViewText(R.id.widget_detail, err.ifBlank { "点右上角刷新" })
                views.setTextViewText(R.id.widget_sign, "签到 --")
                views.setTextViewText(R.id.widget_time, if (ts > 0) "更新 " + hhmm(ts) else "暂无数据")
                return views
            }

            val name = o.optString("vehicleName").ifBlank {
                o.optString("vehicleModel").ifBlank { "极核 ZEEHO" }
            }
            val online = o.optString("online")
            val isOnline = online.contains("ONLINE", true) || online.contains("在线")
            views.setTextViewText(R.id.widget_title, name)
            views.setTextViewText(R.id.widget_online, if (isOnline) "● 在线" else "● 离线")
            views.setTextColor(R.id.widget_online, Color.parseColor(if (isOnline) "#22C55E" else "#5A6A8A"))

            val soc = o.optInt("soc", 0)
            views.setTextViewText(R.id.widget_soc, if (soc in 1..100) soc.toString() else "--")
            views.setTextColor(
                R.id.widget_soc,
                Color.parseColor(
                    when {
                        soc in 1..20 -> "#FF6B6B"
                        soc in 21..50 -> "#F59E0B"
                        else -> "#FFFFFF"
                    }
                )
            )
            val range = o.optInt("range", 0)
            views.setTextViewText(R.id.widget_range, if (range > 0) "续航 $range km" else "续航 --")

            val voltage = o.optDouble("voltage", 0.0)
            val charge = o.optString("chargeState").ifBlank { "未充电" }
            val detail = StringBuilder()
            detail.append("电压 ")
            if (voltage > 0) detail.append(String.format(Locale.CHINA, "%.1f V", voltage)) else detail.append("--")
            detail.append(" · ").append(charge)
            val dist = o.optDouble("todayDistance", 0.0)
            if (dist > 0) detail.append(" · 今日 ").append(String.format(Locale.CHINA, "%.1f km", dist))
            views.setTextViewText(R.id.widget_detail, detail.toString())

            val signed = o.optBoolean("signedToday", false)
            val todayScore = o.optInt("todayScore", 0)
            views.setTextViewText(
                R.id.widget_sign,
                if (signed) "今日已签到 · +$todayScore 分" else "今日未签到 · 点此签到"
            )
            views.setTextViewText(R.id.widget_time, if (ts > 0) "更新 " + hhmm(ts) else "--")
            return views
        }

        private fun hhmm(ms: Long): String =
            SimpleDateFormat("HH:mm", Locale.CHINA).format(Date(ms))
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAll(context)
        requestRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            requestRefresh(context)
        } else if (intent.action == ACTION_SIGN) {
            SignWorker.enqueueNow(context)
            // 稍后刷新小组件，展示签到结果
            requestRefresh(context)
        }
    }
}
