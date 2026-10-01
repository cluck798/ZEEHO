package com.zeeho.signpanel

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * OkHttp 单例，__http 绑定统一走它发请求（绕过 WebView 的 CORS 限制）。
 *
 * execute() 是同步调用（在 Dispatchers.IO 协程内调用），
 * 返回 HttpResult(error, status, headers, body) 四元组，
 * 直接对应 __http 返回的 [err, status, headersJson, body] 数组。
 *
 * 对应 iOS 端 ZHDispatcher 内的 NSURLSession 回调式 __http。
 */
object ZHHttpClient {
    private lateinit var client: OkHttpClient

    fun init(context: Context) {
        client = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    data class HttpResult(
        val error: String?,
        val status: Int,
        val headers: Map<String, String>,
        val body: String,
    )

    /**
     * 同步发起 HTTP 请求。仅在 IO 协程内调用。
     *
     * @param method  HTTP 方法（GET/POST/PUT/DELETE 等）
     * @param url     完整 URL
     * @param headers 请求头；OkHttp 会规范化键名大小写（last wins on duplicate）
     * @param body    请求体（POST/PUT 时使用；GET/HEAD 会被忽略）
     * @param timeoutSec 单次请求超时（秒），默认 60
     */
    fun execute(
        method: String,
        url: String,
        headers: Map<String, String>,
        body: String?,
        timeoutSec: Long = 60,
    ): HttpResult {
        if (!this::client.isInitialized) {
            return HttpResult(error = "OkHttp 未初始化", status = 0, headers = emptyMap(), body = "")
        }

        // 为单次请求覆盖超时（OkHttp 通过 newBuilder 派生 client，复用连接池）
        val reqClient = if (timeoutSec in 1..600 && timeoutSec != 60L) {
            client.newBuilder()
                .connectTimeout(timeoutSec, TimeUnit.SECONDS)
                .readTimeout(timeoutSec, TimeUnit.SECONDS)
                .writeTimeout(timeoutSec, TimeUnit.SECONDS)
                .build()
        } else {
            client
        }

        val builder = Request.Builder().url(url)
        for ((k, v) in headers) {
            builder.header(k, v)
        }

        val upperMethod = method.uppercase()
        val hasBody = body != null && upperMethod != "GET" && upperMethod != "HEAD"
        val mediaType = headers.entries.firstOrNull {
            it.key.equals("Content-Type", ignoreCase = true)
        }?.value?.toMediaTypeOrNull()
        val reqBody: RequestBody? = if (hasBody) {
            (body ?: "").toRequestBody(mediaType)
        } else {
            null
        }

        builder.method(upperMethod, reqBody)

        return try {
            reqClient.newCall(builder.build()).execute().use { resp ->
                val respHeaders = LinkedHashMap<String, String>()
                for ((k, v) in resp.headers) {
                    // 同名多值用逗号合并，对齐 iOS allHeaderFields 行为
                    val existing = respHeaders[k]
                    respHeaders[k] = if (existing == null) v else "$existing, $v"
                }
                val respBody = resp.body?.string() ?: ""
                HttpResult(
                    error = null,
                    status = resp.code,
                    headers = respHeaders,
                    body = respBody,
                )
            }
        } catch (e: IOException) {
            HttpResult(
                error = e.message ?: "网络请求失败",
                status = 0,
                headers = emptyMap(),
                body = "",
            )
        } catch (e: Exception) {
            HttpResult(
                error = e.message ?: "未知错误",
                status = 0,
                headers = emptyMap(),
                body = "",
            )
        }
    }
}
