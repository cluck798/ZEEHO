package com.zeeho.signpanel

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

/**
 * WebView 容器 + 闪屏 overlay + hideSplash JS 桥。
 *
 * 对应 iOS WebViewController.m 的 UI 部分：
 *   - WKWebView → WebView 加载本地 HTTP 服务（127.0.0.1:{port}）
 *   - splash overlay 由原生 FrameLayout 实现（res/layout/activity_main.xml）
 *   - hideSplash 经 JavascriptInterface 桥（iOS 用 WKScriptMessageHandler）
 *   - shouldOverrideUrlLoading 把外部 http/https / mailto / tel 交给系统浏览器（iOS WKNavigationDelegate decidePolicyForNavigationAction）
 *   - onPageFinished 注入 splash hook + 15s 兜底强制隐藏
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splash: View
    private var port: Int = -1
    private val mainHandler = Handler(Looper.getMainLooper())

    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* granted 或被拒都接受；ZHNotifier 内部会降级 Toast */ }

    private val portPollRunnable = object : Runnable {
        override fun run() {
            val p = getSharedPreferences(ZHPanelService.PREF_NAME, MODE_PRIVATE)
                .getInt(ZHPanelService.PREF_PORT_KEY, -1)
            if (p > 0 && port <= 0) {
                port = p
                ZHLog.log("panel port ready: $p")
                webView.loadUrl("http://127.0.0.1:$p/")
            } else if (port <= 0) {
                if (pollStartElapsedMs >= 10_000L) {
                    ZHLog.error("panel port not ready after 10s")
                    Toast.makeText(this@MainActivity, "面板服务启动失败，请重启应用", Toast.LENGTH_LONG).show()
                    return
                }
                pollStartElapsedMs += PORT_POLL_INTERVAL_MS
                mainHandler.postDelayed(this, PORT_POLL_INTERVAL_MS)
            }
        }
    }
    private var pollStartElapsedMs = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 安卓 13+ 申请 POST_NOTIFICATIONS（ZHNotifier 在被拒时降级 Toast）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        // 启动前台 Service（NanoHTTPD + 监控循环）
        startForegroundService(Intent(this, ZHPanelService::class.java))

        webView = findViewById(R.id.webView)
        splash = findViewById(R.id.splash)

        configureWebView()

        // 启动端口轮询
        pollStartElapsedMs = 0L
        mainHandler.postDelayed(portPollRunnable, PORT_POLL_INTERVAL_MS)

        // 15s 兜底：若 JS hook 未触发 hideSplash，强制淡出
        mainHandler.postDelayed({ hideSplash() }, 15_000L)
    }

    private fun configureWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        settings.userAgentString = "ZeehoPanel/Android"
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportZoom(false)

        // 与面板页底色一致（colors.xml panel_bg #0A0F1E），避免全面屏上下露出白/黑边
        webView.setBackgroundColor(Color.parseColor("#0A0F1E"))
        webView.isVerticalScrollBarEnabled = true
        webView.isHorizontalScrollBarEnabled = false

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url ?: return false
                val scheme = url.scheme?.lowercase()
                // 同源 http://127.0.0.1:{port} 放行让 WebView 自己加载
                if (scheme == "http" || scheme == "https") {
                    val host = url.host?.lowercase()
                    if (host == "127.0.0.1" || host == "localhost") {
                        return false
                    }
                    // 外部链接交给系统浏览器
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    return true
                }
                if (scheme == "mailto" || scheme == "tel") {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    return true
                }
                return false
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                // 注入 splash hook：链式调用前端 hideSplash（若存在）+ 原生 ZeehoNative.hideSplash
                view.evaluateJavascript(
                    """(function(){
                      |var o=window.hideSplash;
                      |if(typeof o==='function'){
                      |  window.hideSplash=function(){
                      |    try{o.apply(this,arguments)}catch(e){}
                      |    if(window.ZeehoNative&&window.ZeehoNative.hideSplash){window.ZeehoNative.hideSplash()}
                      |  };
                      |}
                      |})();""".trimMargin(),
                    null
                )
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // 可选：拦截 window.alert / confirm 转 Android 原生对话框（对齐 iOS WKUIDelegate）
            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: android.webkit.JsResult,
            ): Boolean {
                androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton("确定") { _, _ -> result.confirm() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(
                view: WebView?,
                url: String?,
                message: String?,
                result: android.webkit.JsResult,
            ): Boolean {
                androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton("确定") { _, _ -> result.confirm() }
                    .setNegativeButton("取消") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }
        }

        // JS 桥：window.ZeehoNative.hideSplash()
        webView.addJavascriptInterface(
            object {
                @JavascriptInterface
                fun hideSplash() {
                    runOnUiThread { this@MainActivity.hideSplash() }
                }
            },
            "ZeehoNative"
        )
    }

    /**
     * 闪屏淡出（300ms）。幂等，多次调用安全。
     */
    private fun hideSplash() {
        if (!this::splash.isInitialized) return
        if (splash.visibility != View.VISIBLE) return
        splash.animate()
            .alpha(0f)
            .setDuration(300)
            .withEndAction { splash.visibility = View.GONE }
            .start()
    }

    override fun onDestroy() {
        // 仅移除回调，不停止 Service（让其继续保活后台监控）
        mainHandler.removeCallbacks(portPollRunnable)
        try {
            webView.destroy()
        } catch (e: Exception) {
            ZHLog.error("webView destroy failed", e)
        }
        super.onDestroy()
    }

    private companion object {
        /** 端口轮询间隔（首次启动后服务通常 1-2s 内就绪） */
        const val PORT_POLL_INTERVAL_MS = 250L
    }
}
