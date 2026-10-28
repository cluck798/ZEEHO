package com.zeeho.signpanel

import android.content.Context
import com.dokar.quickjs.QuickJs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withTimeout
import java.io.File
import java.io.IOException

/**
 * 每请求新建 QuickJs 引擎、注入 __ 绑定、运行 shim + 核心脚本，捕获 __finish。
 *
 * 与 iOS ZHDispatcher.m 1:1 对齐：
 *   - 每请求 fresh QuickJs 实例（iOS 端 fresh JSContext）
 *   - shimSource / scriptSource 在 init 时从 assets 加载一次缓存
 *   - 服务启动时 compile() 一次得到 bytecode，请求时 evaluate(bytecode)（对齐 desktop/engine.js
 *     的 mtime 缓存模式，控制 ~20ms）
 *   - 180s 兜底超时（iOS kDispatchGuardTimeout）
 *   - __finish 写入 per-request DispatchResult；脚本提前 return 时仍返回默认 200/空响应
 *
 * 调用约定：从 NanoHTTPD worker 线程经 runBlocking(Dispatchers.Default) { dispatch(...) } 调用。
 */
class ZHDispatcher(private val context: Context) {

    private val shimSource: String = loadAsset("shim.js") ?: ""
    private val scriptSource: String = loadAsset("zeeho_box_enhanced.js") ?: ""

    /** v1.2.27 面板 HTML 进程内缓存：根路径（含 ?single=1）是静态页，二次打开直接返回，省掉一次 800KB 脚本求值 */
    private val staticHtmlCache = java.util.concurrent.ConcurrentHashMap<String, String>()

    /**
     * v1.2.40 启动提速：把首屏 HTML 持久化到 filesDir/panel_cache。
     * 下次冷启动直接读文件返回，不再等待 QuickJs 求值脚本；脚本内容变化时 hash 变化，旧缓存自动失效。
     */
    private val htmlCacheDir = File(context.filesDir, "panel_cache")
    private val scriptTag = Integer.toHexString(scriptSource.hashCode()) + "_" + scriptSource.length

    init {
        loadPersistedHtmlCache()
    }

    /** 后台预热：提前编译核心脚本字节码，避免首个 API 请求再等编译 */
    fun warmUp() {
        try {
            scriptBytecode
            ZHLog.log("ZHDispatcher warmUp done")
        } catch (e: Exception) {
            ZHLog.error("ZHDispatcher warmUp failed", e)
        }
    }

    private fun loadPersistedHtmlCache() {
        try {
            if (!htmlCacheDir.exists()) return
            val files = htmlCacheDir.listFiles() ?: return
            for (f in files) {
                if (!f.name.contains(scriptTag)) {
                    f.delete()
                    continue
                }
                if (f.length() < 1024) continue
                val key = if (f.name.startsWith("single")) "http://zeeho.box/?single=1" else "http://zeeho.box/"
                staticHtmlCache[key] = f.readText(Charsets.UTF_8)
            }
            if (staticHtmlCache.isNotEmpty()) ZHLog.log("panel html disk cache loaded: ${staticHtmlCache.size}")
        } catch (e: Exception) {
            ZHLog.error("load panel html cache failed", e)
        }
    }

    private fun persistHtmlCache(url: String, body: String) {
        try {
            Thread {
                try {
                    if (!htmlCacheDir.exists()) htmlCacheDir.mkdirs()
                    val name = (if (url.contains("single=1")) "single_" else "root_") + scriptTag + ".html"
                    File(htmlCacheDir, name).writeText(body, Charsets.UTF_8)
                    ZHLog.log("panel html cached to disk: $name")
                } catch (e: Exception) {
                    ZHLog.error("persist panel html failed", e)
                }
            }.start()
        } catch (e: Exception) {
            ZHLog.error("persist panel html thread failed", e)
        }
    }

    /** 服务启动时编译一次字节码，请求时直接 evaluate（避开每请求重编译 ~478KB 源码） */
    private val scriptBytecode: ByteArray? by lazy { compileScriptBytecode() }

    /**
     * 分发一次请求给核心脚本。
     *
     * @param method  HTTP method（GET/POST/...）
     * @param url     完整 URL（iOS 端约定 http://zeeho.box/<path>）
     * @param headers 请求头
     * @param body     请求体（GET 通常为 null）
     * @return DispatchResult，__finish 写入；脚本异常时 status=500
     */
    suspend fun dispatch(
        method: String,
        url: String,
        headers: Map<String, String>,
        body: String?,
    ): ShimJS.DispatchResult {
        if (shimSource.isEmpty() || scriptSource.isEmpty()) {
            return ShimJS.DispatchResult(
                status = 500,
                headers = mapOf("Content-Type" to "text/plain; charset=utf-8"),
                body = "未找到核心脚本或 shim",
            )
        }

        val isRootHtml = method.equals("GET", ignoreCase = true) &&
            (url == "http://zeeho.box/" || url.startsWith("http://zeeho.box/?"))
        if (isRootHtml) {
            staticHtmlCache[url]?.let { body ->
                ZHLog.log("panel html cache hit: $url")
                return ShimJS.DispatchResult(
                    status = 200,
                    headers = mapOf("Content-Type" to "text/html; charset=utf-8", "Cache-Control" to "no-cache"),
                    body = body,
                )
            }
        }

        val request = ShimJS.ZHRequest(url, method.uppercase(), headers, body)
        val result = ShimJS.DispatchResult()
        val timers = ZHTimers()

        // 每请求新建 QuickJs 实例；Dispatchers.Default 让 async 函数内的 IO 协程不在调用线程阻塞
        val quickJs = QuickJs.create(jobDispatcher = Dispatchers.Default)
        try {
            ShimJS.install(quickJs, request, result, timers)

            // 包裹 180s 兜底超时；脚本异常或 __finish 早返回时由 result.finished 判定
            withTimeout(180_000) {
                // 设置 $loon / $request 全局（shim.js 顶部也会 var $loon = true，先赋值更安全）
                quickJs.evaluate<Any?>(ShimJS.buildGlobalsJs(request))
                // 运行 shim.js（注册 console / $done / $httpClient / $persistentStore / URL / ...）
                quickJs.evaluate<Any?>(shimSource, filename = "shim.js")
                // 运行核心脚本：优先使用预编译字节码，回退到源码
                val bc = scriptBytecode
                if (bc != null) {
                    quickJs.evaluate<Any?>(bc)
                } else {
                    quickJs.evaluate<Any?>(scriptSource, filename = "zeeho_box_enhanced.js")
                }
            }
        } catch (e: Exception) {
            ZHLog.error("dispatch error: $method $url", e)
            // 异常情况下补一个 500 响应，__finish 已写入则保持原值
            if (!result.finished) {
                result.status = 500
                result.headers = mapOf("Content-Type" to "text/plain; charset=utf-8")
                result.body = "脚本执行异常: ${e.message ?: e.javaClass.simpleName}"
            }
        } finally {
            try {
                quickJs.close()
            } catch (e: Exception) {
                ZHLog.error("close quickJs failed", e)
            }
            timers.clearAll()
        }

        if (isRootHtml && result.status == 200 && result.body.contains("<html")) {
            staticHtmlCache[url] = result.body
            persistHtmlCache(url, result.body)
        }
        return result
    }

    private fun loadAsset(name: String): String? {
        return try {
            context.assets.open(name).use { stream ->
                stream.bufferedReader(Charsets.UTF_8).readText()
            }
        } catch (e: IOException) {
            ZHLog.error("load asset $name failed", e)
            null
        }
    }

    /**
     * 在专用 "编译用" QuickJs 实例里把核心脚本源码编译为字节码缓存。
     * 字节码与引擎版本绑定，初始化一次后所有请求复用。
     */
    private fun compileScriptBytecode(): ByteArray? {
        if (scriptSource.isEmpty()) return null
        val compileJs = QuickJs.create(jobDispatcher = Dispatchers.Default)
        return try {
            compileJs.compile(scriptSource, filename = "zeeho_box_enhanced.js")
        } catch (e: Exception) {
            ZHLog.error("compile script bytecode failed", e)
            null
        } finally {
            try {
                compileJs.close()
            } catch (e: Exception) {
                ZHLog.error("close compile quickJs failed", e)
            }
        }
    }
}
