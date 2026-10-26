package com.zeeho.signpanel

import android.content.Context
import android.content.Intent
import android.net.ProxyInfo
import android.net.VpnService
import android.os.ParcelFileDescriptor

/**
 * 抓包 VPN：建立本地 VPN 并把系统 HTTP 代理指向本地 MITM 代理（127.0.0.1:port）。
 *
 * - 代理只对 zeehoev.com 做 TLS 拦截，其他域名直接隧道转发（不影响其他 App 联网）
 * - 本 App 自身流量加入 disallowed，避免面板 API 请求被自己拦截
 * - 首次启动时系统会弹出 VPN 授权确认
 */
class ZHVpnService : VpnService() {

    companion object {
        @Volatile
        var running: Boolean = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, ZHVpnService::class.java)
            context.startService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, ZHVpnService::class.java))
        }
    }

    private var tun: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") {
            stopSelf()
            return START_NOT_STICKY
        }
        if (tun == null) {
            val proxy = ZHMITMProxy.get(this)
            val proxyPort = proxy.start()
            val builder = Builder()
                .addAddress("10.66.0.1", 32)
                .addRoute("0.0.0.0", 0)
                .addDnsServer("223.5.5.5")
                .addDnsServer("119.29.29.29")
                .setSession("极核抓包")
                .setHttpProxy(ProxyInfo.buildDirectProxy("127.0.0.1", proxyPort))
            try {
                builder.addDisallowedApplication(packageName)
            } catch (e: Exception) {
                ZHLog.error("vpn disallow self failed", e)
            }
            tun = try {
                builder.establish()
            } catch (e: Exception) {
                ZHLog.error("vpn establish failed", e)
                null
            }
            if (tun == null) {
                ZHLog.log("VPN establish returned null (未授权或被系统拒绝)")
                stopSelf()
                return START_NOT_STICKY
            }
            ZHMITMProxy.get(this).start()
            running = true
            ZHLog.log("VPN started, proxy port=$proxyPort")
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        try {
            tun?.close()
        } catch (e: Exception) {}
        tun = null
        ZHMITMProxy.get(this).stop()
        ZHLog.log("VPN stopped")
        super.onDestroy()
    }

    override fun onRevoke() {
        stopSelf()
        super.onRevoke()
    }
}
