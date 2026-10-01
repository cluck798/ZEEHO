package com.zeeho.signpanel

import android.os.Handler
import android.os.Looper

/**
 * 每请求一份的定时器注册表，基于主线程 Handler 实现 setTimeout/setInterval/clear。
 *
 * 注意：dokar3/quickjs-kt 的 setTimeout/setInterval 走的是规范化的 async __zhDelay + Promise .then 模式
 * （见 ShimJS.kt），JS 函数 callback 在 JS 侧被调用，因此 ZHTimers 主要用于 Kotlin 侧的原生定时任务
 * （如 ZHPanelService 的 3 分钟监控循环，目前由 monitorRunnable 直接复用 Handler，但后续若需更细粒度
 * 的"原生侧 setTimeout"——例如面板 Service 自己发起异步任务——可统一走 ZHTimers）。
 *
 * 对应 iOS 端 ZHDispatcher 内的 __setTimeout/__setInterval/__clearTimer 块（iOS 直接用 dispatch_after）。
 */
class ZHTimers {
    private val handler = Handler(Looper.getMainLooper())
    private val timers = mutableMapOf<Int, Runnable>()
    private var nextId = 1

    private fun nextId(): Int {
        val id = nextId
        nextId += 1
        return id
    }

    /**
     * 延迟执行一次。
     *
     * @param fn      回调（在主线程触发）
     * @param delayMs 延迟毫秒
     * @return timer id，可传给 clear 取消
     */
    @Synchronized
    fun setTimeout(fn: () -> Unit, delayMs: Long): Int {
        val id = nextId()
        val runnable = object : Runnable {
            override fun run() {
                synchronized(this@ZHTimers) { timers.remove(id) }
                try {
                    fn()
                } catch (e: Exception) {
                    ZHLog.error("timer callback error", e)
                }
            }
        }
        timers[id] = runnable
        handler.postDelayed(runnable, delayMs.coerceAtLeast(0L))
        return id
    }

    /**
     * 周期执行。
     *
     * @param fn      回调（在主线程触发）
     * @param delayMs 周期毫秒
     * @return timer id，可传给 clear 取消
     */
    @Synchronized
    fun setInterval(fn: () -> Unit, delayMs: Long): Int {
        val id = nextId()
        val interval = delayMs.coerceAtLeast(1L)
        val runnable = object : Runnable {
            override fun run() {
                synchronized(this@ZHTimers) {
                    if (!timers.containsKey(id)) return // 已被 clear
                }
                try {
                    fn()
                } catch (e: Exception) {
                    ZHLog.error("interval callback error", e)
                }
                synchronized(this@ZHTimers) {
                    if (timers.containsKey(id)) {
                        handler.postDelayed(this, interval)
                    }
                }
            }
        }
        timers[id] = runnable
        handler.postDelayed(runnable, interval)
        return id
    }

    @Synchronized
    fun clear(id: Int) {
        val r = timers.remove(id)
        if (r != null) {
            handler.removeCallbacks(r)
        }
    }

    @Synchronized
    fun clearAll() {
        for ((_, r) in timers) {
            handler.removeCallbacks(r)
        }
        timers.clear()
    }
}
