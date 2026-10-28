package com.zeeho.signpanel

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * 小组件数据刷新：优先请求本地面板服务 GET /api/widget-snapshot（与 iOS 共用接口）；
 * v2.16.42 服务未运行时（App 进程已被杀）直接用 ZHDispatcher 跑脚本取数，
 * 这样桌面小组件在后台也能拿到电量/续航/充电状态，不再显示「打开 App 刷新」。
 */
class ZHWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val ctx = applicationContext
        val ids = try {
            AppWidgetManager.getInstance(ctx)
                .getAppWidgetIds(ComponentName(ctx, ZHWidgetProvider::class.java))
        } catch (e: Exception) {
            intArrayOf()
        }
        if (ids.isEmpty()) return@withContext Result.success()

        val snap = fetchViaService(ctx) ?: fetchViaDispatcher(ctx)
        if (snap != null) {
            ctx.getSharedPreferences(ZHWidgetProvider.CACHE_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(ZHWidgetProvider.CACHE_SNAPSHOT, snap)
                .putLong(ZHWidgetProvider.CACHE_TS, System.currentTimeMillis())
                .apply()
            // v2.16.44 小组件车辆照片：按快照里的图片地址下载并下采样缓存
            try {
                val imgUrl = JSONObject(snap).optString("vehicleImageUrl")
                if (imgUrl.isNotBlank()) downloadImage(ctx, imgUrl)
            } catch (e: Exception) {
                ZHLog.error("widget image parse failed", e)
            }
        }
        ZHWidgetProvider.updateAll(ctx)
        Result.success()
    }

    /** 面板前台服务在跑：走本机 HTTP，最快 */
    private fun fetchViaService(ctx: Context): String? {
        val port = ctx.getSharedPreferences(ZHPanelService.PREF_NAME, Context.MODE_PRIVATE)
            .getInt(ZHPanelService.PREF_PORT_KEY, -1)
        if (port <= 0) return null
        return try {
            val client = OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .build()
            val req = Request.Builder().url("http://127.0.0.1:$port/api/widget-snapshot").get().build()
            client.newCall(req).execute().use { resp ->
                val body = resp.body?.string()
                if (resp.isSuccessful && !body.isNullOrBlank()) body else null
            }
        } catch (e: Exception) {
            ZHLog.error("widget snapshot service failed", e)
            null
        }
    }

    /** 服务未运行：在本进程内用 QuickJS 执行核心脚本取数（与后台签到同一条链路） */
    private suspend fun fetchViaDispatcher(ctx: Context): String? {
        return try {
            val dispatcher = ZHDispatcher(ctx)
            val r = withTimeoutOrNull(60_000) {
                dispatcher.dispatch("GET", "http://zeeho.box/api/widget-snapshot", mapOf("Host" to "zeeho.box"), "")
            }
            if (r != null && r.status in 200..299 && r.body.isNotBlank()) r.body else null
        } catch (e: Exception) {
            ZHLog.error("widget snapshot dispatcher failed", e)
            null
        }
    }

    /** 下载车辆照片并按宽度 420px 下采样，写入 cacheDir/widget_vehicle.png */
    private fun downloadImage(ctx: Context, url: String) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) return
        try {
            val client = OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .build()
            val req = Request.Builder().url(url).header("User-Agent", "ZEEHO-Panel").get().build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return
                val bytes = resp.body?.bytes() ?: return
                if (bytes.isEmpty()) return
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                var sample = 1
                while (bounds.outWidth > 0 && bounds.outWidth / sample > 420) sample *= 2
                val bmp = BitmapFactory.decodeByteArray(
                    bytes, 0, bytes.size,
                    BitmapFactory.Options().apply { inSampleSize = sample }
                ) ?: return
                java.io.File(ctx.cacheDir, ZHWidgetProvider.IMAGE_FILE).outputStream().use { out ->
                    bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
                }
                bmp.recycle()
            }
        } catch (e: Exception) {
            ZHLog.error("widget image download failed", e)
        }
    }
}
