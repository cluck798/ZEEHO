package com.zeeho.signpanel

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * 安卓桌面小组件：车辆卡片（名称 / 车型 / 在线 / 坐垫·车锁 / 车辆图 / 电量续航电压 / 进度条 /
 * 充电功率与剩余时间 / 前后胎压胎温 / 定位地址 / 签到与更新时间）。
 *
 * 数据来自本地面板服务 GET /api/widget-snapshot（与 iOS 小组件使用同一接口）；
 * 服务未运行时由 ZHWidgetWorker 用 ZHDispatcher 直取。
 * 刷新时机：系统 30 分钟周期 ＋ 30 分钟周期 Work ＋ 右上角刷新按钮 ＋ 打开面板后刷新。
 */
class ZHWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.zeeho.signpanel.action.WIDGET_REFRESH"
        const val ACTION_SIGN = "com.zeeho.signpanel.action.WIDGET_SIGN"
        const val CACHE_PREFS = "zeeho_widget"
        const val CACHE_SNAPSHOT = "snapshot"
        const val CACHE_TS = "ts"
        const val IMAGE_FILE = "widget_vehicle.png"

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

            val img = vehicleBitmap(context)
            if (img != null) {
                views.setImageViewBitmap(R.id.widget_img, img)
                views.setViewVisibility(R.id.widget_img, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_img, View.GONE)
            }

            if (o == null || !o.optBoolean("ok", false)) {
                val err = o?.optString("error").orEmpty()
                views.setTextViewText(R.id.widget_title, "极核 ZEEHO")
                views.setTextViewText(R.id.widget_online, "● 打开 App 刷新")
                views.setTextColor(R.id.widget_online, Color.parseColor("#F59E0B"))
                views.setTextViewText(R.id.widget_model, "")
                views.setViewVisibility(R.id.widget_model, View.GONE)
                views.setViewVisibility(R.id.widget_chip_seat, View.GONE)
                views.setViewVisibility(R.id.widget_chip_lock, View.GONE)
                views.setTextViewText(R.id.widget_soc, "--")
                views.setTextViewText(R.id.widget_range, "-- km")
                views.setTextViewText(R.id.widget_volt, "-- V")
                views.setProgressBar(R.id.widget_socbar, 100, 0, false)
                views.setTextViewText(R.id.widget_state, err.ifBlank { "点右上角刷新" })
                views.setTextViewText(R.id.widget_tires, "")
                views.setViewVisibility(R.id.widget_tires, View.GONE)
                views.setTextViewText(R.id.widget_loc, "")
                views.setViewVisibility(R.id.widget_loc, View.GONE)
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

            // 车型
            val model = o.optString("vehicleModel").trim()
            views.setTextViewText(R.id.widget_model, model)
            views.setViewVisibility(R.id.widget_model, if (model.isNotEmpty()) View.VISIBLE else View.GONE)

            // 坐垫 / 车锁状态胶囊
            val seat = cushionText(o.optString("cushionState"))
            if (seat.isNotEmpty()) {
                views.setTextViewText(R.id.widget_chip_seat, seat)
                views.setViewVisibility(R.id.widget_chip_seat, View.VISIBLE)
            } else views.setViewVisibility(R.id.widget_chip_seat, View.GONE)
            val lock = lockText(o.optString("lockState"))
            if (lock.isNotEmpty()) {
                views.setTextViewText(R.id.widget_chip_lock, lock)
                views.setViewVisibility(R.id.widget_chip_lock, View.VISIBLE)
            } else views.setViewVisibility(R.id.widget_chip_lock, View.GONE)

            // 电量 / 续航 / 电压 / 进度条
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
            views.setTextViewText(R.id.widget_range, if (range > 0) "$range km" else "-- km")
            val voltage = o.optDouble("voltage", 0.0)
            views.setTextViewText(
                R.id.widget_volt,
                if (voltage > 0) String.format(Locale.CHINA, "%.0f V", voltage) else "-- V"
            )
            views.setProgressBar(R.id.widget_socbar, 100, soc.coerceIn(0, 100), false)

            // 充电中显示功率与剩余时间，否则显示充电状态 + 今日里程
            val charge = o.optString("chargeState").ifBlank { "未充电" }
            val power = o.optInt("power", 0)
            val remainSec = o.optLong("chargeRemainSec", 0L)
            val charging = charge.contains("充电") && !charge.contains("未充电")
            val state = StringBuilder()
            if (charging) {
                state.append("⚡ 充电中")
                if (power > 0) state.append(" · ${power}W")
                if (remainSec > 0) state.append(" · 剩余 ").append(fmtRemain(remainSec))
            } else {
                state.append(charge)
                val dist = o.optDouble("todayDistance", 0.0)
                if (dist > 0) state.append(" · 今日 ").append(String.format(Locale.CHINA, "%.1f km", dist))
            }
            views.setTextViewText(R.id.widget_state, state.toString())

            // 胎压 / 胎温
            val fp = pressure(o.optString("frontPressure"))
            val ft = o.optString("frontTemp").trim()
            val rp = pressure(o.optString("rearPressure"))
            val rt = o.optString("rearTemp").trim()
            val tires = StringBuilder()
            if (fp.isNotEmpty()) tires.append("前 $fp").append(if (ft.isNotEmpty()) " $ft" else "")
            if (rp.isNotEmpty()) tires.append(if (tires.isNotEmpty()) "  " else "").append("后 $rp")
                .append(if (rt.isNotEmpty()) " $rt" else "")
            views.setTextViewText(R.id.widget_tires, tires.toString())
            views.setViewVisibility(R.id.widget_tires, if (tires.isNotEmpty()) View.VISIBLE else View.GONE)

            // 定位地址
            val addr = o.optString("address").trim()
            views.setTextViewText(R.id.widget_loc, if (addr.isNotEmpty()) "📍 $addr" else "")
            views.setViewVisibility(R.id.widget_loc, if (addr.isNotEmpty()) View.VISIBLE else View.GONE)

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

        /** 剩余秒数 → 42 分 / 1 时 05 分 */
        private fun fmtRemain(sec: Long): String {
            val m = (sec / 60).coerceAtLeast(1)
            return if (m >= 60) "${m / 60} 时 " + (if (m % 60 > 0) "${m % 60} 分" else "") else "$m 分"
        }

        /** 与服务端一致的车锁语义：1=已关锁，0=未关锁，文本含未/开=未关 */
        private fun lockText(s: String): String {
            val t = s.trim()
            if (t.isEmpty()) return ""
            if (t == "1") return "已关锁"
            if (t == "0") return "未关锁"
            if (t.contains("未") || t.contains("开")) return "未关锁"
            if (t.contains("关") || t.contains("锁")) return "已关锁"
            return ""
        }

        /** 坐垫语义：1=坐垫已关，0=坐垫未关 */
        private fun cushionText(s: String): String {
            val t = s.trim()
            if (t.isEmpty()) return ""
            if (t == "1") return "坐垫已关"
            if (t == "0") return "坐垫未关"
            if (t.contains("未") || t.contains("开")) return "坐垫未关"
            if (t.contains("关") || t.contains("合") || t.contains("锁")) return "坐垫已关"
            return "坐垫$t"
        }

        /** 「未绑定」/空 视为无数据 */
        private fun pressure(s: String): String {
            val t = s.trim()
            return if (t.isEmpty() || t == "未绑定" || t == "null") "" else t
        }

        /** 读取 Worker 缓存下来的车辆图片（已按宽度 ~420px 下采样） */
        private fun vehicleBitmap(context: Context): Bitmap? {
            return try {
                val f = File(context.cacheDir, IMAGE_FILE)
                if (!f.exists() || f.length() <= 0) null else BitmapFactory.decodeFile(f.absolutePath)
            } catch (e: Exception) {
                ZHLog.error("widget bitmap decode failed", e)
                null
            }
        }
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
