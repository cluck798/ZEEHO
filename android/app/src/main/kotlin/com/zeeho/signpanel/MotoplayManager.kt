package com.zeeho.signpanel

import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.ByteBuffer
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 投屏管理器（object 单例）：通过 WiFi 直连车机 TFT 屏幕（192.168.0.1:6000），发送导航指令。
 *
 * 改为 object 单例：让 ZHPanelService（后台 WiFi 监控）与 MainActivity（JS 桥）共享
 * 同一 TCP socket 与 connected 状态，避免连接冲突。ZHPanelService 检测到 ZEEHO 车机
 * WiFi 时调 connectInternal() 主动建连；JS 端 motoplayHandler("isConnected") 会读到 true。
 *
 * 对应 iOS MotoplayManager.swift：
 *   - JS 桥 window.motoplayHandler(action, data, callback) → motoplayHandler(...)
 *   - 协议：4 字节命令长度（big endian）+ 命令字符串 + JSON 数据
 *   - 命令：START_NAVIGATION / STOP_NAVIGATION / MOVE_MAP / SPEED / ...
 *
 * 数据流：WebView 高德JS导航 → JavascriptInterface → 本类 → TCP → 车机 TFT
 */
object MotoplayManager {

    private val executor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "MotoplayManager").apply { isDaemon = true }
    }

    @Volatile private var socket: Socket? = null
    private val connected = AtomicBoolean(false)

    @Volatile private var mainHandler: android.os.Handler? = null
    @Volatile private var webViewRef: WebView? = null

    /**
     * 初始化主线程 Handler 与 WebView 引用（应用启动时调用一次）。
     * 必须在主线程调用：JS 回调线程是 WebView JavaBridge 线程，不能直接操作 WebView。
     */
    fun init(webView: WebView) {
        mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
        webViewRef = webView
    }

    /** 注册 JavascriptInterface（ZeehoMotoplay）；JS 包装函数由调用方在 onPageFinished 注入 */
    fun inject(webView: WebView) {
        webView.addJavascriptInterface(this, "ZeehoMotoplay")
    }

    /**
     * JS 桥入口：window.motoplayHandler(action, data, callback)
     *
     * action 取值：
     *   - "isConnected" → callback(true/false)
     *   - "connect"     → callback(true/false)
     *   - "sendNavData" → data 形如 "COMMAND|{json}"，例如 "START_NAVIGATION|{...}"
     *   - "disconnect"  → callback(true)
     *
     * 注：JavascriptInterface 方法签名仅支持基础类型/字符串，回调通过 callback: String
     * （回调函数名）传入，再用 WebView.evaluateJavascript 触发。
     */
    @JavascriptInterface
    fun motoplayHandler(action: String, data: String, callback: String) {
        when (action) {
            "isConnected" -> execAsync(callback, connected.get())
            "connect" -> executor.execute {
                val ok = tryConnect()
                connected.set(ok)
                evalCallback(callback, ok)
            }
            "disconnect" -> executor.execute {
                disconnectInternal()
                evalCallback(callback, true)
            }
            "sendNavData" -> executor.execute {
                val ok = sendNavDataInternal(data)
                evalCallback(callback, ok)
            }
            else -> evalCallback(callback, false)
        }
    }

    /** 主动建立 TCP 连接（不依赖 WebView/JS，可由后台 Service 调用） */
    fun connectInternal(): Boolean = try {
        executor.submit(java.util.concurrent.Callable { tryConnect() }).get()
    } catch (e: Exception) {
        ZHLog.error("motoplay connectInternal failed", e)
        false
    }

    /** 主动断开 TCP 连接（可由后台 Service 调用） */
    fun disconnectInternalPublic() = executor.execute { disconnectInternal() }

    /** 当前是否已连接车机 TFT */
    fun isConnected(): Boolean = connected.get()

    /**
     * 在 WebView 的 onPageFinished 中调用：注入 window.motoplayHandler 包装。
     * 对齐 iOS WKScriptMessageHandler motoplay：cb 是函数，用 ID 注册到 __mpCbs，
     * 原生完成后再通过 evaluateJavascript 触发 window.__mpResolve(id, ok)
     */
    val JS_HOOK = """(function(){
        |if(window.motoplayHandler)return;
        |window.__mpCbs=window.__mpCbs||{};
        |window.__mpResolve=function(id,ok){var cb=window.__mpCbs[id];if(cb){try{cb(ok)}finally{try{delete window.__mpCbs[id]}catch(e){}}}};
        |window.motoplayHandler=function(cmd,data,cb){
        | try{
        |   var id='mp_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        |   if(cb)window.__mpCbs[id]=cb;
        |   window.ZeehoMotoplay.motoplayHandler(cmd,data||'',id);
        | }catch(e){if(cb)cb(false)}
        |};
        |})();""".trimMargin()

    private const val HOST = "192.168.0.1"
    private const val PORT = 6000

    private fun execAsync(callback: String, value: Boolean) {
        // isConnected 是同步结果，直接回调
        evalCallback(callback, value)
    }

    private fun tryConnect(): Boolean {
        return try {
            disconnectInternal()
            val sock = Socket()
            socket = sock
            // 5 秒连接超时
            sock.connect(InetSocketAddress(HOST, PORT), 5000)
            connected.set(true)
            true
        } catch (e: Exception) {
            ZHLog.error("motoplay connect failed", e)
            connected.set(false)
            false
        }
    }

    private fun disconnectInternal() {
        try {
            socket?.run {
                if (!isClosed) close()
            }
        } catch (e: Exception) {
            ZHLog.error("motoplay disconnect failed", e)
        } finally {
            socket = null
            connected.set(false)
        }
    }

    /**
     * 发送导航数据：data 格式 "COMMAND|{json}"
     * 协议包：[4 字节命令长度（big endian）][命令字符串][JSON 数据]
     */
    private fun sendNavDataInternal(data: String): Boolean {
        return try {
            val parts = data.split("|", limit = 2)
            if (parts.size != 2) return false
            val cmd = parts[0].byteInputStream().readBytes()
            val json = parts[1].byteInputStream().readBytes()

            val sock = socket
            if (sock == null || !connected.get() || sock.isClosed) {
                if (!tryConnect()) return false
            }
            val out = DataOutputStream(socket!!.getOutputStream())
            // 4 字节命令长度（big endian）
            val lenBuf = ByteBuffer.allocate(4).putInt(cmd.size).array()
            out.write(lenBuf)
            out.write(cmd)
            out.write(json)
            out.flush()
            true
        } catch (e: Exception) {
            ZHLog.error("motoplay sendNavData failed: $data", e)
            connected.set(false)
            false
        }
    }

    /**
     * 在 WebView 主线程执行回调：window.__mpResolve(id, true/false)
     */
    private fun evalCallback(cbId: String, ok: Boolean) {
        if (cbId.isBlank()) return
        mainHandler?.post {
            try {
                webViewRef?.evaluateJavascript(
                    "try{if(window.__mpResolve)window.__mpResolve('$cbId',${if (ok) "true" else "false"});}catch(e){};",
                    null
                )
            } catch (e: Exception) {
                ZHLog.error("motoplay evalCallback failed: $cbId", e)
            }
        }
    }
}
