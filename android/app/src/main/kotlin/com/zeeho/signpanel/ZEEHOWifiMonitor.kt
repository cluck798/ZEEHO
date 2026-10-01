package com.zeeho.signpanel

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build

/**
 * 车机 WiFi 检测 + 自动启动投屏。
 *
 * 设计权衡：
 *   - Android 10+（API 29+）普通应用无法主动连接指定 WiFi（系统限制，需 WifiNetworkSpecifier
 *     且弹系统对话框，不符合"自动"诉求），故仅做"检测已连接 SSID 是 ZEEHO 车机时自动启动投屏"
 *   - 用户在系统设置里手动连过车机热点后，App 在后台轮询检测 SSID，匹配则触发
 *     MotoplayManager.connectInternal() 建立 TCP 投屏通道；离开车机 WiFi 自动断开
 *
 * SSID 识别：前缀匹配（忽略大小写）。ZEEHO 车机热点 SSID 默认按 "ZEEHO" 前缀识别；
 * 如需调整可在 ZEEHO_SSID_PREFIX 修改。
 *
 * 权限要求：
 *   - ACCESS_WIFI_STATE：读 WiFi 连接信息（Manifest 已声明）
 *   - ACCESS_FINE_LOCATION：Android 10+ 读 SSID 必需（运行时申请，MainActivity 处理）
 *   - Android 13+ 还需 NEARBY_WIFI_DEVICES（minSdk 24，本类做版本兼容判断）
 */
object ZEEHOWifiMonitor {

    /** ZEEHO 车机 WiFi SSID 前缀（忽略大小写匹配） */
    private const val ZEEHO_SSID_PREFIX = "ZEEHO"

    /** 上次检测到的"是否在 ZEEHO 车机 WiFi"状态，用于变化检测避免重复 connect/disconnect */
    @Volatile private var lastOnZeehoWifi: Boolean = false

    /**
     * 读取当前连接的 WiFi SSID（去掉包裹的双引号）。
     * Android 10+ 未授予 ACCESS_FINE_LOCATION 时返回 "<unknown ssid>"。
     */
    fun currentSsid(context: Context): String? {
        return try {
            @Suppress("DEPRECATION")
            val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                ?: return null
            @Suppress("DEPRECATION")
            val info = wifiManager.connectionInfo ?: return null
            @Suppress("DEPRECATION")
            val raw = info.ssid ?: return null
            // 系统 SSID 形如 "\"ZEEHO-XXXX\"" 或 "<unknown ssid>"
            raw.removeSurrounding("\"").takeIf { it.isNotBlank() && it != "<unknown ssid>" }
        } catch (e: Exception) {
            ZHLog.error("read current ssid failed", e)
            null
        }
    }

    /** 判断给定 SSID 是否为 ZEEHO 车机热点（前缀匹配，忽略大小写） */
    fun isZeehoWifi(ssid: String?): Boolean {
        if (ssid.isNullOrBlank()) return false
        return ssid.startsWith(ZEEHO_SSID_PREFIX, ignoreCase = true)
    }

    /**
     * 检测当前 WiFi 是否为 ZEEHO 车机，并按状态变化触发投屏连接/断开。
     * 由 ZHPanelService 监控循环定期调用。
     *
     * @return true 表示当前在 ZEEHO 车机 WiFi 上（已尝试触发 connect）
     */
    fun checkAndAutoConnect(context: Context): Boolean {
        val ssid = currentSsid(context)
        val onZeeho = isZeehoWifi(ssid)
        ZHLog.log("ZEEHOWifiMonitor: ssid=$ssid, onZeeho=$onZeeho, last=$lastOnZeehoWifi")

        if (onZeeho == lastOnZeehoWifi) {
            // 状态未变：若仍连着车机但 TCP 掉了，重连一次
            if (onZeeho && !MotoplayManager.isConnected()) {
                ZHLog.log("ZEEHOWifiMonitor: still on ZEEHO wifi but TCP dropped, reconnecting")
                MotoplayManager.connectInternal()
            }
            return onZeeho
        }

        // 状态变化：触发 connect 或 disconnect
        lastOnZeehoWifi = onZeeho
        if (onZeeho) {
            ZHLog.log("ZEEHOWifiMonitor: detected ZEEHO wifi, auto-connecting motoplay")
            MotoplayManager.connectInternal()
        } else {
            ZHLog.log("ZEEHOWifiMonitor: left ZEEHO wifi, disconnecting motoplay")
            MotoplayManager.disconnectInternalPublic()
        }
        return onZeeho
    }

    /** 重置缓存状态（如 App 重启时强制重新检测） */
    fun resetState() {
        lastOnZeehoWifi = false
    }
}
