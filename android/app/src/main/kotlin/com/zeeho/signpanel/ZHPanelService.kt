package com.zeeho.signpanel

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

/**
 * 前台 Service：宿主 NanoHTTPD 本地服务 + 3 分钟车辆监控循环。
 *
 * 对应 iOS WebViewController.m 的后台逻辑（静音音频保活 + NSTimer 车辆监控）。
 * 安卓端改用前台 Service + dataSync 类型 + 持久通知保活，更可靠。
 *
 * 端口策略：NanoHTTPD 绑定 127.0.0.1:0（ephemeral 端口），启动后写入 SharedPreferences，
 * MainActivity 轮询读取后 webView.load("http://127.0.0.1:{port}/")。
 */
class ZHPanelService : Service() {

    companion object {
        const val NOTIF_ID = 1
        const val PREF_PORT_KEY = "panel_port"
        const val PREF_NAME = "zeeho_prefs"
        const val MONITOR_INTERVAL_MS = 180_000L
        /** 监控 tick 的内部 URL，与 iOS 端约定一致（脚本会忽略 host，按 path 路由） */
        private const val MONITOR_TICK_URL = "http://zeeho.box/api/vehicle-monitor-tick"
    }

    private var server: ZHServer? = null
    private var dispatcher: ZHDispatcher? = null
    private val monitorHandler = Handler(Looper.getMainLooper())

    private val monitorRunnable = object : Runnable {
        override fun run() {
            val d = dispatcher
            if (d != null) {
                // 监控 tick 异步触发，结果丢弃（脚本侧负责发通知 / 更新 store）
                Thread {
                    runCatching {
                        runBlocking(Dispatchers.Default) {
                            withTimeoutOrNull(170_000) {
                                d.dispatch("GET", MONITOR_TICK_URL, emptyMap(), null)
                            }
                        }
                    }.onFailure { ZHLog.error("monitor tick failed", it) }
                }.start()
            }
            monitorHandler.postDelayed(this, MONITOR_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, buildForegroundNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        ZHLog.log("ZHPanelService onCreate")

        dispatcher = ZHDispatcher(this).also { ZHLog.log("ZHDispatcher ready") }
        server = ZHServer(this, dispatcher!!).also { srv ->
            try {
                srv.start()
                val port = srv.listeningPort
                if (port > 0) {
                    prefs().edit().putInt(PREF_PORT_KEY, port).apply()
                    ZHLog.log("ZHServer listening on 127.0.0.1:$port")
                } else {
                    ZHLog.error("ZHServer start returned invalid port: $port")
                }
            } catch (e: Exception) {
                ZHLog.error("ZHServer start failed", e)
            }
        }

        monitorHandler.postDelayed(monitorRunnable, MONITOR_INTERVAL_MS)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // START_STICKY 保活；被回收后系统会重启，onCreate 会再次跑
        return START_STICKY
    }

    override fun onDestroy() {
        ZHLog.log("ZHPanelService onDestroy")
        monitorHandler.removeCallbacks(monitorRunnable)
        try {
            server?.stop()
        } catch (e: Exception) {
            ZHLog.error("ZHServer stop failed", e)
        }
        server = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    private fun buildForegroundNotification(): Notification {
        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this, 0, contentIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, ZHNotifier.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle(getString(R.string.notif_fg_title))
            .setContentText(getString(R.string.notif_fg_text))
            .setOngoing(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun prefs(): SharedPreferences =
        getSharedPreferences(PREF_NAME, MODE_PRIVATE)

    /**
     * NanoHTTPD 子类：把 HTTP 请求转给 ZHDispatcher。
     *
     * 关键点：
     *   - URL：session.uri 是 path+query，前面拼 http://zeeho.box（脚本只看 path）
     *   - POST body：NanoHTTPD 不会自动解析 application/json，必须按 Content-Length
     *     从 session.inputStream 手动读字节
     *   - 响应：用 result.status / result.headers / result.body 构造，附 Cache-Control: no-store
     *     防止 WebView 缓存 /api/* GET 响应
     */
    class ZHServer(
        @Suppress("unused") private val host: ZHPanelService,
        private val dispatcher: ZHDispatcher,
    ) : NanoHTTPD("127.0.0.1", 0) {

        override fun serve(session: IHTTPSession): Response {
            val method = when (session.method) {
                Method.GET -> "GET"
                Method.POST -> "POST"
                Method.PUT -> "PUT"
                Method.DELETE -> "DELETE"
                Method.HEAD -> "HEAD"
                Method.OPTIONS -> "OPTIONS"
                else -> session.method.name
            }

            val uri = session.uri ?: "/"
            val fullUrl = if (uri.startsWith("http")) uri else "http://zeeho.box$uri"

            // 复制 headers（NanoHTTPD 的 Map 是小写键）
            val headers = LinkedHashMap<String, String>()
            for ((k, v) in session.headers) {
                if (k.equals("content-length", ignoreCase = true)) continue
                headers[k] = v
            }

            // 手动读取 POST/PUT body
            val body: String? = readBody(session)

            val result: ShimJS.DispatchResult = try {
                runBlocking(Dispatchers.Default) {
                    withTimeoutOrNull(180_000) {
                        dispatcher.dispatch(method, fullUrl, headers, body)
                    } ?: ShimJS.DispatchResult(
                        status = 500,
                        headers = mapOf("Content-Type" to "text/plain; charset=utf-8"),
                        body = "脚本执行超时(180s)",
                    )
                }
            } catch (e: Exception) {
                ZHLog.error("dispatch failed: $method $uri", e)
                ShimJS.DispatchResult(
                    status = 500,
                    headers = mapOf("Content-Type" to "text/plain; charset=utf-8"),
                    body = "调度异常: ${e.message ?: e.javaClass.simpleName}",
                )
            }

            val mime = mimeForPath(uri)
            val response = newFixedLengthResponse(
                Response.Status.lookupStatus(result.status) ?: Response.Status.OK,
                mime,
                result.body
            )
            // 防止 WebView 缓存 /api/* 的 GET 响应导致数据陈旧（对齐 iOS finalHeaders[@"Cache-Control"]=@"no-store"）
            response.setHeader("Cache-Control", "no-store")
            response.setHeader("Access-Control-Allow-Origin", "*")
            response.setHeader("Access-Control-Allow-Headers", "*")
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
            for ((k, v) in result.headers) {
                response.setHeader(k, v)
            }
            return response
        }

        /**
         * 从 session.inputStream 按 Content-Length 手动读取 body 字节。
         * NanoHTTPD 对 application/json 不会自动 parse，必须自己做。
         */
        private fun readBody(session: IHTTPSession): String? {
            return try {
                val len = session.headers["content-length"]?.toLongOrNull() ?: 0L
                if (len <= 0L) return null
                val stream = session.inputStream ?: return null
                val buf = ByteArray(len.toInt().coerceAtLeast(0))
                var read = 0
                while (read < buf.size) {
                    val n = stream.read(buf, read, buf.size - read)
                    if (n < 0) break
                    read += n
                }
                if (read == 0) null else String(buf, 0, read, Charsets.UTF_8)
            } catch (e: Exception) {
                ZHLog.error("read body failed", e)
                null
            }
        }

        /** 简单 MIME 路由：根路径返回 HTML；静态资源按扩展名；默认 JSON */
        private fun mimeForPath(path: String): String {
            val p = path.substringBefore('?').lowercase()
            if (p == "/" || p.isEmpty()) return "text/html; charset=utf-8"
            if (p.endsWith(".js")) return "application/javascript; charset=utf-8"
            if (p.endsWith(".css")) return "text/css; charset=utf-8"
            if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html; charset=utf-8"
            if (p.endsWith(".json")) return "application/json; charset=utf-8"
            if (p.endsWith(".svg")) return "image/svg+xml"
            if (p.endsWith(".png")) return "image/png"
            if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg"
            if (p.endsWith(".ico")) return "image/x-icon"
            return "application/json; charset=utf-8"
        }
    }
}
