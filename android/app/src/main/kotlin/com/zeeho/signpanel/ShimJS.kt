package com.zeeho.signpanel

import com.dokar.quickjs.QuickJs
import com.dokar.quickjs.binding.asyncFunction
import com.dokar.quickjs.binding.function
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * 把 `__` 前缀的原生函数绑定到 QuickJS 实例。
 *
 * 与 ios/App/Resources/shim.js（已改造为 Promise 式 __http）对应的 Kotlin 注入侧。
 * 调用顺序（在 ZHDispatcher.dispatch 内）：
 *   1. ShimJS.install(quickJs, request, result, timers)        —— 注册所有 __ 绑定
 *   2. quickJs.evaluate<Any?>(ShimJS.buildGlobalsJs(request))  —— 设置 $loon / $request
 *   3. quickJs.evaluate<Any?>(shimSource)                       —— 运行 shim.js
 *   4. quickJs.evaluate<Any?>(scriptBytecode)                  —— 运行 zeeho_box_enhanced.js 字节码
 *
 * 定时器说明：dokar3/quickjs-kt 不暴露 "Kotlin 反向调用 JS function 引用" 的能力，
 * 因此 __setTimeout(fn, ms) 直接接收 JS 函数引用并后续回放的方案不易实现。
 * 这里采用 dokar3 官方 samples/openai 的规范化做法：Kotlin 提供 async __zhDelay(ms, id)
 * 返回 Promise，JS 侧 setTimeout 自己 .then(() => fn()) 触发回调（见 shim.js 已打补丁）。
 * __zhCancelDelay(id) 用于 clearTimeout / clearInterval。
 *
 * 对应 iOS 端 ZHDispatcher.m 内 ctx[@"__xxx"] = ^... 块。
 */
object ShimJS {

    /**
     * 单次 dispatch 的响应持有对象，由 __finish 写入。
     * 字段可变，便于在 sync function 绑定里直接赋值。
     */
    class DispatchResult(
        var status: Int = 200,
        var headers: Map<String, String> = emptyMap(),
        var body: String = "",
        @Volatile var finished: Boolean = false,
    )

    /**
     * 进 dispatch 时的请求描述；会生成 $request 全局变量。
     */
    class ZHRequest(
        val url: String,
        val method: String,
        val headers: Map<String, String>,
        val body: String?,
    )

    /**
     * 在 quickJs 上注册所有 __ 前缀原生绑定。非 suspend——只调用 function/asyncFunction
     * 这些扩展函数（它们内部走 defineBinding 同步注册）。
     *
     * @param quickJs  本请求的 QuickJs 实例
     * @param request  请求元信息，仅用于调试日志与未来扩展；$request 全局由 buildGlobalsJs 单独设置
     * @param result   响应持有对象，__finish 写入它
     * @param timers   每请求一份的 ZHTimers（当前 __zhDelay 用协程实现，timers 预留给原生侧定时任务）
     */
    fun install(
        quickJs: QuickJs,
        request: ZHRequest,
        result: DispatchResult,
        @Suppress("UNUSED_PARAMETER") timers: ZHTimers,
    ) {
        // 每请求一份的 delay 任务表，用于 __zhCancelDelay 取消
        val pendingDelays = ConcurrentHashMap<Int, Job>()

        // ---- __log ----
        quickJs.function("__log") { args ->
            val msg = args.getOrNull(0)?.toString() ?: ""
            ZHLog.log(msg)
            null
        }

        // ---- __finish(status, headersJson, body) ----
        // 写入 result 持有对象；幂等，多次调用只生效第一次（对齐 iOS finished 标志）
        quickJs.function("__finish") { args ->
            if (result.finished) return@function null
            val status = (args.getOrNull(0) as? Number)?.toInt() ?: 200
            val headersJson = args.getOrNull(1)?.toString() ?: "{}"
            val body = args.getOrNull(2)?.toString() ?: ""
            val headers = parseHeadersJson(headersJson)
            result.status = status
            result.headers = headers
            result.body = body
            result.finished = true
            null
        }

        // ---- __storeRead(key): String? ----
        quickJs.function("__storeRead") { args ->
            val key = args.getOrNull(0)?.toString() ?: ""
            ZHStore.read(key)
        }

        // ---- __storeWrite(value, key) ----
        // 注意参数顺序与 iOS/desktop 一致：先 value 后 key
        quickJs.function("__storeWrite") { args ->
            val value = args.getOrNull(0)?.toString() ?: ""
            val key = args.getOrNull(1)?.toString() ?: ""
            ZHStore.write(key, value)
            null
        }

        // ---- __http(method, optsJson): Promise<[err, status, headersJson, body]> ----
        // asyncFunction lambda 是 suspend；withContext(Dispatchers.IO) 切到 IO 线程跑同步 OkHttp，
        // 避免阻塞 QuickJs jobDispatcher（Dispatchers.Default）
        quickJs.asyncFunction("__http") { args ->
            val method = args.getOrNull(0)?.toString() ?: "GET"
            val optsJson = args.getOrNull(1)?.toString() ?: "{}"
            val (url, headers, body, timeoutSec) = parseHttpOpts(optsJson)
            val httpResult = withContext(Dispatchers.IO) {
                ZHHttpClient.execute(
                    method = method,
                    url = url,
                    headers = headers,
                    body = body,
                    timeoutSec = timeoutSec,
                )
            }
            val headersJson = JSONObject(httpResult.headers).toString()
            listOf<Any?>(httpResult.error, httpResult.status, headersJson, httpResult.body)
        }

        // ---- __zhDelay(ms, id): Promise<void> ----
        // dokar3 规范：返回 Promise，resolve 后由 JS 侧 setTimeout 的 .then 回调触发 fn
        quickJs.asyncFunction("__zhDelay") { args ->
            val ms = (args.getOrNull(0) as? Number)?.toLong() ?: 0L
            val id = (args.getOrNull(1) as? Number)?.toInt() ?: 0
            coroutineScope {
                val job = async { delay(ms.coerceAtLeast(0L)) }
                pendingDelays[id] = job
                try {
                    job.await()
                } finally {
                    pendingDelays.remove(id)
                }
            }
        }

        // ---- __zhCancelDelay(id) ----
        quickJs.function("__zhCancelDelay") { args ->
            val id = (args.getOrNull(0) as? Number)?.toInt() ?: 0
            pendingDelays.remove(id)?.cancel()
            null
        }

        // ---- __atob(s): String（二进制字符串语义） ----
        quickJs.function("__atob") { args ->
            val s = args.getOrNull(0)?.toString() ?: ""
            ZHBase64.atob(s)
        }

        // ---- __btoa(s): String ----
        quickJs.function("__btoa") { args ->
            val s = args.getOrNull(0)?.toString() ?: ""
            ZHBase64.btoa(s)
        }

        // ---- __notify(title, subtitle, body) ----
        quickJs.function("__notify") { args ->
            val title = args.getOrNull(0)?.toString() ?: ""
            val subtitle = args.getOrNull(1)?.toString() ?: ""
            val body = args.getOrNull(2)?.toString() ?: ""
            ZHNotifier.notify(title, subtitle, body)
            null
        }
    }

    /**
     * 生成设置 $loon / $request 全局的 JS 代码片段。
     * 由 ZHDispatcher 在 install 之后、evaluate shim 之前调用。
     */
    fun buildGlobalsJs(request: ZHRequest): String {
        val reqJson = buildRequestJson(request)
        // $loon 也由 shim.js 顶部 var $loon = true 再次声明；这里先赋值保证 shim 运行前已就位
        return "\$loon = true; \$request = $reqJson;"
    }

    private fun buildRequestJson(request: ZHRequest): String {
        val obj = JSONObject()
        obj.put("url", request.url)
        obj.put("method", request.method.uppercase())
        val headersObj = JSONObject()
        for ((k, v) in request.headers) {
            headersObj.put(k, v)
        }
        obj.put("headers", headersObj)
        // body 为 null 时设 JS null，对齐 iOS [NSNull null] 语义
        obj.put("body", if (request.body != null) request.body else JSONObject.NULL)
        return obj.toString()
    }

    private fun parseHeadersJson(headersJson: String): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        if (headersJson.isEmpty()) return out
        return try {
            val obj = JSONObject(headersJson)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                out[k] = obj.optString(k, "")
            }
            out
        } catch (e: Exception) {
            ZHLog.error("parse headers json failed: $headersJson", e)
            out
        }
    }

    /** 解析 __http 调用入参 optsJson：{url, headers, body, timeout} */
    private fun parseHttpOpts(optsJson: String): HttpCallOpts {
        if (optsJson.isEmpty()) return HttpCallOpts("", emptyMap(), null, 60L)
        return try {
            val obj = JSONObject(optsJson)
            val url = obj.optString("url", "")
            val headers = LinkedHashMap<String, String>()
            val headersObj = obj.optJSONObject("headers")
            if (headersObj != null) {
                val keys = headersObj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    headers[k] = headersObj.optString(k, "")
                }
            }
            val body: String? = if (obj.has("body") && !obj.isNull("body")) {
                obj.get("body").toString()
            } else {
                null
            }
            val timeout = if (obj.has("timeout") && !obj.isNull("timeout")) {
                (obj.opt("timeout") as? Number)?.toDouble()?.toLong()?.takeIf { it > 0 } ?: 60L
            } else {
                60L
            }
            HttpCallOpts(url, headers, body, timeout)
        } catch (e: Exception) {
            ZHLog.error("parse http opts failed: $optsJson", e)
            HttpCallOpts("", emptyMap(), null, 60L)
        }
    }

    private data class HttpCallOpts(
        val url: String,
        val headers: Map<String, String>,
        val body: String?,
        val timeoutSec: Long,
    )
}
