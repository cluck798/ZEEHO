package com.zeeho.signpanel

import android.util.Log

/**
 * 极简日志器：所有 __log 绑定统一打到 logcat tag=[panel]。
 * 对应 iOS 端 NSLog(@"[panel] %@", message)。
 */
object ZHLog {
    const val TAG = "panel"

    fun log(message: String) {
        Log.i(TAG, message)
    }

    fun error(message: String, t: Throwable? = null) {
        Log.e(TAG, message, t)
    }
}
