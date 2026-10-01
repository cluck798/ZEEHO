package com.zeeho.signpanel

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * 持久化 KV 存储，结构对齐 iOS/desktop 的 store.json：{"kv": {key: value, ...}}。
 *
 * 在安卓端用 SharedPreferences 单文件 "zeeho_store" 持久化整张 KV 表（序列化为 JSON 字符串）。
 * 读写均加 @Synchronized，避免 NanoHTTPD 多 worker 线程并发写竞争。
 *
 * 对应 iOS 端 ZHDispatcher.loadStore / saveStore。
 */
object ZHStore {
    private lateinit var prefs: SharedPreferences
    private val kv: MutableMap<String, String> = HashMap()

    fun init(context: Context) {
        prefs = context.getSharedPreferences("zeeho_store", Context.MODE_PRIVATE)
        loadFromPrefs()
    }

    @Synchronized
    private fun loadFromPrefs() {
        kv.clear()
        val json = prefs.getString("kv_json", null) ?: "{\"kv\":{}}"
        try {
            val root = JSONObject(json)
            val kvObj = root.optJSONObject("kv")
            if (kvObj != null) {
                val keys = kvObj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    kv[k] = kvObj.getString(k)
                }
            }
        } catch (e: Exception) {
            // 损坏的 JSON 视为空表，避免崩溃
            ZHLog.error("store load failed", e)
        }
    }

    @Synchronized
    private fun saveToPrefs() {
        try {
            val root = JSONObject()
            val kvObj = JSONObject()
            for ((k, v) in kv) {
                kvObj.put(k, v)
            }
            root.put("kv", kvObj)
            prefs.edit().putString("kv_json", root.toString()).apply()
        } catch (e: Exception) {
            ZHLog.error("store save failed", e)
        }
    }

    @Synchronized
    fun read(key: String): String? {
        return kv[key]
    }

    @Synchronized
    fun write(key: String, value: String) {
        kv[key] = value
        saveToPrefs()
    }
}
