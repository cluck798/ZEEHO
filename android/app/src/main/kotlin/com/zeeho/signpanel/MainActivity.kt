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

    /** 一次申请多个权限（POST_NOTIFICATIONS 等） */
    private val multiPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* 任意权限被拒都接受，不影响主要功能 */ }

    private val portPollRunnable = object : Runnable {
        override fun run() {
            val p = getSharedPreferences(ZHPanelService.PREF_NAME, MODE_PRIVATE)
                .getInt(ZHPanelService.PREF_PORT_KEY, -1)
            if (p > 0 && port <= 0) {
                port = p
                ZHLog.log("panel port ready: $p")
                // 单账号版判定：包名 + BuildConfig 双保险（包名以 .single 结尾）
                val singleEdition = packageName.endsWith(".single") || BuildConfig.SINGLE_EDITION
                webView.loadUrl("http://127.0.0.1:$p/" + if (singleEdition) "?single=1" else "")
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

        // 收集需要申请的权限并一次性弹窗（按版本）
        val toRequest = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            toRequest.add(android.Manifest.permission.POST_NOTIFICATIONS)
        }
        if (toRequest.isNotEmpty()) {
            multiPermissionLauncher.launch(toRequest.toTypedArray())
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

        // JS 桥：window.ZeehoNative.hideSplash() / appVersion() / openExternal(url) / startCapture()
        webView.addJavascriptInterface(
            object {
                @JavascriptInterface
                fun hideSplash() {
                    runOnUiThread { this@MainActivity.hideSplash() }
                }

                @JavascriptInterface
                fun appVersion(): String = BuildConfig.VERSION_NAME

                @JavascriptInterface
                fun openExternal(url: String) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)))
                    } catch (e: Exception) {
                        ZHLog.error("openExternal failed", e)
                    }
                }

                @JavascriptInterface
                fun installCa() {
                    runOnUiThread {
                        val der = ZHMitmCa.caEncoded(this@MainActivity)
                        if (der == null) {
                            Toast.makeText(this@MainActivity, "证书生成失败，请重启应用重试", Toast.LENGTH_LONG).show()
                            return@runOnUiThread
                        }
                        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                            // Android 10 及以下：KeyChain 可直接拉起 CA 安装
                            try {
                                val intent = android.security.KeyChain.createInstallIntent()
                                intent.putExtra(android.security.KeyChain.EXTRA_CERTIFICATE, der)
                                intent.putExtra(android.security.KeyChain.EXTRA_NAME, "ZEEHO Panel CA")
                                startActivity(intent)
                                Toast.makeText(this@MainActivity, "请在系统弹窗中选择「CA 证书」并确认安装", Toast.LENGTH_LONG).show()
                            } catch (e: Exception) {
                                ZHLog.error("KeyChain install failed", e)
                                val path = ZHMitmCa.exportCaToDownloads(this@MainActivity)
                                showCaGuide(path)
                            }
                        } else {
                            // Android 11+：系统弹窗只剩「关闭」，改为导出文件 + 引导到系统设置安装
                            val path = ZHMitmCa.exportCaToDownloads(this@MainActivity)
                            showCaGuide(path)
                        }
                    }
                }

                @JavascriptInterface
                fun startCapture() {
                    runOnUiThread {
                        try {
                            // 必须先取得系统 VPN 授权（VpnService.prepare），直接 startService 不会弹授权框
                            val prep = android.net.VpnService.prepare(this@MainActivity)
                            if (prep != null) {
                                Toast.makeText(this@MainActivity, "请在系统弹窗中允许 VPN", Toast.LENGTH_LONG).show()
                                startActivityForResult(prep, REQ_VPN)
                            } else {
                                ZHVpnService.start(this@MainActivity)
                                Toast.makeText(this@MainActivity, "已开启抓包，请打开极核 App", Toast.LENGTH_LONG).show()
                            }
                        } catch (e: Exception) {
                            ZHLog.error("start capture failed", e)
                            Toast.makeText(this@MainActivity, "开启抓包失败：" + (e.message ?: "未知错误"), Toast.LENGTH_LONG).show()
                        }
                    }
                }

                @JavascriptInterface
                fun stopCapture() {
                    runOnUiThread {
                        ZHVpnService.stop(this@MainActivity)
                        Toast.makeText(this@MainActivity, "已停止抓包", Toast.LENGTH_SHORT).show()
                    }
                }

                @JavascriptInterface
                fun captureState(): String {
                    val p = ZHMITMProxy.get(this@MainActivity)
                    return "{\"vpn\":" + ZHVpnService.running +
                        ",\"port\":" + p.port +
                        ",\"hits\":" + p.hitCount +
                        ",\"err\":" + org.json.JSONObject.quote(ZHVpnService.lastError) + "}"
                }
            },
            "ZeehoNative"
        )
    }

    /**
     * Android 11+ 的 CA 安装引导：证书已导出到「下载」，给出手动安装步骤并直达系统设置。
     */
    private fun showCaGuide(exportedPath: String?) {
        val sb = StringBuilder()
        sb.append("Android 11 及以上系统已不允许应用直接安装 CA 证书，需要你在系统设置里手动安装。\n\n")
        if (exportedPath != null) {
            sb.append("证书已导出到：").append(exportedPath).append("\n\n")
        } else {
            sb.append("证书导出失败，请重试或检查存储权限。\n\n")
        }
        sb.append("安装步骤：\n")
        sb.append("1. 点下方「打开设置」\n")
        sb.append("2. 安全 → 更多安全设置 → 加密与凭据\n")
        sb.append("3. 安装证书 → CA 证书 → 仍要安装\n")
        sb.append("4. 在「下载」中选择 zeeho-ca.crt\n\n")
        sb.append("提示：部分应用默认不信任用户安装的证书；若抓不到 Token，请改用手机号验证码登录或粘贴 Token。")
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("安装 CA 证书")
            .setMessage(sb.toString())
            .setPositiveButton("打开设置") { _, _ -> openSecuritySettings() }
            .setNeutralButton("重新导出") { _, _ ->
                val path = ZHMitmCa.exportCaToDownloads(this)
                Toast.makeText(
                    this,
                    if (path != null) "已导出到 $path" else "导出失败，请检查存储空间",
                    Toast.LENGTH_LONG
                ).show()
            }
            .setNegativeButton("关闭", null)
            .show()
    }

    /** 尽力打开系统的「凭据存储 / 安全」页面，失败则退回设置首页 */
    private fun openSecuritySettings() {
        val candidates = listOf(
            Intent("com.android.settings.TRUSTED_CREDENTIALS_USER"),
            Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS),
            Intent(android.provider.Settings.ACTION_SETTINGS)
        )
        for (intent in candidates) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                return
            } catch (e: Exception) {
                ZHLog.error("open security settings failed", e)
            }
        }
        Toast.makeText(this, "请手动打开 设置 → 安全 → 加密与凭据", Toast.LENGTH_LONG).show()
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

    override fun onResume() {
        super.onResume()
        // v1.2.15：打开 App 后同步刷新桌面小组件数据
        ZHWidgetProvider.requestRefresh(this)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_VPN) {
            if (resultCode == RESULT_OK) {
                ZHVpnService.start(this)
                Toast.makeText(this, "VPN 已授权，抓包已开启", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(this, "未授权 VPN，无法抓包；可改用手机号登录", Toast.LENGTH_LONG).show()
            }
        }
    }

    private companion object {
        /** 端口轮询间隔（首次启动后服务通常 1-2s 内就绪） */
        const val PORT_POLL_INTERVAL_MS = 250L
        /** VPN 授权请求码 */
        const val REQ_VPN = 1001
    }
}
