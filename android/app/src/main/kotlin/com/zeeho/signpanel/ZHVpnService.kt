package com.zeeho.signpanel

import android.content.Context
import android.content.Intent
import android.net.ProxyInfo
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor

/**
 * 抓包 VPN：只给「极核官方 App」挂一个 HTTP 代理（127.0.0.1:port），不接管全局流量。
 *
 * 设计要点（v2.16.18 重构）：
 * - 不再 addRoute("0.0.0.0", 0)：之前把全部流量导入 tun 却没有人转发，DNS 与所有 TCP 都被黑洞，
 *   导致官方 App「无网络」。
 * - 用 setHttpProxy 把本地 MITM 代理挂到 VPN 网络上；官方 App 走系统代理即可被拦截。
 * - addAllowedApplication 只放行极核 App，其他 App 完全不受影响。
 * - 60 秒内若没有任何代理命中（说明官方 App 不走系统代理或证书未被信任），自动关闭 VPN 恢复网络。
 */
class ZHVpnService : VpnService() {

    companion object {
        const val ACTION_STOP = "com.zeeho.signpanel.action.STOP_CAPTURE"

        /** 开启后 N 毫秒内没有任何代理命中就自动关闭，避免把官方 App 一直卡在无网状态 */
        private const val AUTO_STOP_MS = 60_000L

        @Volatile
        var running: Boolean = false
            private set

        @Volatile
        var lastError: String = ""
            internal set

        fun start(context: Context) {
            lastError = ""
            val intent = Intent(context, ZHVpnService::class.java)
            context.startService(intent)
        }

        /**
         * 停止抓包：先把状态置 false 并断开代理端口，再让 Service 收到 STOP 并 stopService。
         * 两条路径都走，避免个别机型 stopService 未能立刻回调 onDestroy 导致 VPN 一直挂着。
         */
        fun stop(context: Context) {
            running = false
            lastError = ""
            runCatching { ZHMITMProxy.get(context).stop() }
            runCatching {
                context.startService(Intent(context, ZHVpnService::class.java).setAction(ACTION_STOP))
            }
            runCatching {
                context.stopService(Intent(context, ZHVpnService::class.java))
            }
        }
    }

    private var tun: ParcelFileDescriptor? = null
    private val handler = Handler(Looper.getMainLooper())

    private val autoStopTask = Runnable {
        if (running && ZHMITMProxy.get(this).hitCount == 0) {
            lastError = "60 秒内没有流量经过代理，已自动关闭 VPN 恢复网络"
            ZHLog.log(lastError)
            teardown()
            stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            teardown()
            stopSelf()
            return START_NOT_STICKY
        }
        if (tun != null) return START_STICKY

        lastError = ""
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            lastError = "系统版本低于 Android 10，无法设置网络代理，请改用手机号登录"
            ZHLog.log(lastError)
            stopSelf()
            return START_NOT_STICKY
        }

        val targets = findOfficialPackages()
        if (targets.isEmpty()) {
            lastError = "未找到极核官方 App，请安装后再试（其他方式：手机号登录 / 粘贴 Token）"
            ZHLog.log(lastError)
            stopSelf()
            return START_NOT_STICKY
        }

        val proxy = ZHMITMProxy.get(this)
        val proxyPort = proxy.start()
        val builder = Builder()
            .addAddress("10.66.0.1", 32)
            .setSession("极核抓包")
            .setHttpProxy(ProxyInfo.buildDirectProxy("127.0.0.1", proxyPort))
        for (pkg in targets) {
            runCatching { builder.addAllowedApplication(pkg) }
                .onFailure { ZHLog.error("addAllowedApplication failed: $pkg", it) }
        }
        runCatching { builder.addDisallowedApplication(packageName) }

        tun = try {
            builder.establish()
        } catch (e: Exception) {
            ZHLog.error("vpn establish failed", e)
            null
        }
        if (tun == null) {
            lastError = "VPN 未授权或被系统拒绝"
            runCatching { proxy.stop() }
            stopSelf()
            return START_NOT_STICKY
        }

        running = true
        handler.removeCallbacks(autoStopTask)
        handler.postDelayed(autoStopTask, AUTO_STOP_MS)
        ZHLog.log("VPN started (proxy-only), port=$proxyPort, targets=$targets")
        return START_STICKY
    }

    /** 统一收尾：关 tun（真正断开 VPN）、停代理、清定时器 */
    private fun teardown() {
        running = false
        handler.removeCallbacks(autoStopTask)
        runCatching { tun?.close() }
        tun = null
        runCatching { ZHMITMProxy.get(this).stop() }
    }

    override fun onDestroy() {
        teardown()
        ZHLog.log("VPN stopped")
        super.onDestroy()
    }

    override fun onRevoke() {
        teardown()
        stopSelf()
        super.onRevoke()
    }

    /** 找出手机里安装的极核官方 App 包名（排除本面板自身） */
    private fun findOfficialPackages(): List<String> {
        val out = mutableListOf<String>()
        val self = packageName
        try {
            val pm = packageManager
            for (pi in pm.getInstalledPackages(0)) {
                val pn = pi.packageName
                if (pn == self || pn.startsWith("com.zeeho.signpanel")) continue
                val low = pn.lowercase()
                val label = runCatching {
                    pm.getApplicationLabel(pi.applicationInfo).toString()
                }.getOrDefault("")
                if (low.contains("zeeho") || low.contains("cfmoto") || label.contains("极核")) {
                    out.add(pn)
                }
            }
        } catch (e: Exception) {
            ZHLog.error("find official packages failed", e)
        }
        return out
    }
}
