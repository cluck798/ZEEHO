package com.zeeho.signpanel

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLEncoder
import java.util.concurrent.Executors
import javax.net.ssl.SNIHostName
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory

/**
 * 本地 MITM 代理：处理系统 HTTP 代理转发来的请求。
 *
 * - CONNECT 目标域名（zeehoev.com）→ 动态签发站点证书做 TLS 拦截，解析请求头提取 Token
 * - 其它域名 → 直接 TCP 隧道转发（避免影响其他 App 联网）
 * - 普通 HTTP 请求 → 直接转发
 *
 * 抓到的 Token 通过本地面板 API /api/quick-save 自动导入（面板服务需在运行）。
 */
class ZHMITMProxy private constructor(private val context: Context) {

    companion object {
        private const val TAG = "ZHMITM"
        private val TARGET_HOSTS = listOf("zeehoev.com")

        @Volatile
        private var instance: ZHMITMProxy? = null

        fun get(context: Context): ZHMITMProxy {
            return instance ?: synchronized(this) {
                instance ?: ZHMITMProxy(context.applicationContext).also { instance = it }
            }
        }
    }

    private var server: ServerSocket? = null
    private var pool = Executors.newCachedThreadPool()
    @Volatile
    var port: Int = -1
        private set
    @Volatile
    var lastToken: String = ""
        private set
    @Volatile
    var hitCount: Int = 0
        private set

    fun isRunning(): Boolean = server?.isClosed == false

    @Synchronized
    fun start(): Int {
        if (isRunning() && port > 0) return port
        val ss = ServerSocket(0, 50, java.net.InetAddress.getByName("127.0.0.1"))
        server = ss
        port = ss.localPort
        pool = Executors.newCachedThreadPool()
        Thread {
            while (!ss.isClosed) {
                try {
                    val client = ss.accept()
                    pool.execute { runCatching { handleClient(client) }.onFailure { ZHLog.error("$TAG handle fail", it) } }
                } catch (e: Exception) {
                    if (!ss.isClosed) ZHLog.error("$TAG accept fail", e)
                }
            }
        }.apply { name = "zh-mitm-accept"; isDaemon = true }.start()
        ZHLog.log("$TAG proxy listening 127.0.0.1:$port")
        return port
    }

    @Synchronized
    fun stop() {
        try { server?.close() } catch (e: Exception) {}
        server = null
        port = -1
        try { pool.shutdownNow() } catch (e: Exception) {}
    }

    // ================= 连接处理 =================
    private fun handleClient(client: Socket) {
        client.soTimeout = 30_000
        val input = BufferedInputStream(client.getInputStream())
        val output = client.getOutputStream()
        val header = readHeaderBlock(input) ?: run { client.close(); return }
        val firstLine = header.lineSequence().firstOrNull().orEmpty()
        val parts = firstLine.split(" ")
        if (parts.size < 2) { client.close(); return }
        val method = parts[0].uppercase()
        val target = parts[1]

        if (method == "CONNECT") {
            val host = target.substringBefore(":")
            val portNum = target.substringAfter(":", "443").toIntOrNull() ?: 443
            if (isTarget(host)) {
                mitmTls(client, input, output, host, portNum)
            } else {
                tunnel(client, input, output, host, portNum)
            }
            return
        }

        // 普通 HTTP 代理请求：GET http://host/path HTTP/1.1
        val host = runCatching { java.net.URI(target).host }.getOrNull()
        if (host.isNullOrBlank()) { client.close(); return }
        val path = runCatching {
            val u = java.net.URI(target)
            (u.rawPath ?: "/") + (u.rawQuery?.let { "?$it" } ?: "")
        }.getOrDefault("/")
        plainHttp(client, input, output, host, path, header)
    }

    private fun isTarget(host: String): Boolean =
        TARGET_HOSTS.any { host == it || host.endsWith(".$it") }

    /** 非目标域名：直接 TCP 隧道（必须复用已缓冲的输入流，否则头部之后的数据会丢失） */
    private fun tunnel(client: Socket, clientIn: InputStream, clientOut: OutputStream, host: String, port: Int) {
        try {
            val upstream = Socket()
            upstream.connect(InetSocketAddress(host, port), 10_000)
            clientOut.write("HTTP/1.1 200 Connection Established\r\n\r\n".toByteArray())
            clientOut.flush()
            val upIn = upstream.getInputStream()
            val upOut = upstream.getOutputStream()
            val cIn = clientIn
            Thread {
                runCatching { cIn.copyTo(upOut, 8192); upOut.flush() }.onFailure { }
                runCatching { upstream.close() }
            }.start()
            runCatching { upIn.copyTo(clientOut, 8192); clientOut.flush() }.onFailure { }
            runCatching { client.close() }
            runCatching { upstream.close() }
        } catch (e: Exception) {
            runCatching { client.close() }
        }
    }

    /** 目标域名：TLS 拦截（服务端证书 + 上游 TLS） */
    private fun mitmTls(client: Socket, clientIn: InputStream, clientOut: OutputStream, host: String, portNum: Int) {
        val sslCtx = ZHMitmCa.serverContext(context, host)
        if (sslCtx == null) {
            // 证书不可用时退化为隧道，保证不断网
            tunnel(client, clientIn, clientOut, host, portNum)
            return
        }
        clientOut.write("HTTP/1.1 200 Connection Established\r\n\r\n".toByteArray())
        clientOut.flush()
        val sslServer = sslCtx.socketFactory.createSocket(client, host, client.port, true) as SSLSocket
        sslServer.useClientMode = false
        runCatching { sslServer.startHandshake() }.onFailure {
            ZHLog.log("$TAG handshake fail $host: ${it.message}")
            runCatching { sslServer.close() }
            runCatching { client.close() }
            return
        }
        val sIn = BufferedInputStream(sslServer.getInputStream())
        val sOut = sslServer.getOutputStream()

        // 一次连接处理一个请求（keep-alive 由客户端重连，足够抓 Token）
        val reqHeader = readHeaderBlock(sIn) ?: run { runCatching { sslServer.close() }; return }
        val headers = parseHeaders(reqHeader)
        captureToken(headers)

        // 上游 TLS
        val rawUp = Socket()
        try {
            rawUp.connect(InetSocketAddress(host, portNum), 10_000)
        } catch (e: Exception) {
            runCatching { sslServer.close() }
            return
        }
        val upFactory = SSLSocketFactory.getDefault() as SSLSocketFactory
        val upSsl = upFactory.createSocket(rawUp, host, portNum, true) as SSLSocket
        upSsl.useClientMode = true
        if (android.os.Build.VERSION.SDK_INT >= 24) {
            runCatching {
                val p = upSsl.sslParameters
                p.serverNames = listOf(SNIHostName(host))
                upSsl.sslParameters = p
            }
        }
        runCatching { upSsl.startHandshake() }.onFailure {
            ZHLog.log("$TAG upstream handshake fail $host: ${it.message}")
            runCatching { upSsl.close() }
            runCatching { sslServer.close() }
            return
        }
        val upOut = upSsl.getOutputStream()
        val upIn = BufferedInputStream(upSsl.getInputStream())

        // 转发请求（头 + body）
        upOut.write(reqHeader.toByteArray(Charsets.ISO_8859_1))
        copyRequestBody(sIn, upOut, headers)
        upOut.flush()

        // 转发响应（状态行 + 头 + body）
        relayResponse(upIn, sOut)

        runCatching { upSsl.close() }
        runCatching { sslServer.close() }
    }

    /** 普通 HTTP（非 CONNECT）转发 */
    private fun plainHttp(client: Socket, clientIn: InputStream, clientOut: OutputStream, host: String, path: String, header: String) {
        try {
            captureToken(parseHeaders(header))
            val upstream = Socket()
            upstream.connect(InetSocketAddress(host, 80), 10_000)
            val upOut = upstream.getOutputStream()
            val upIn = BufferedInputStream(upstream.getInputStream())
            val first = header.lineSequence().first()
            val rest = header.substring(first.length)
            upOut.write("${first.split(" ")[0]} $path HTTP/1.1$rest".toByteArray(Charsets.ISO_8859_1))
            copyRequestBody(clientIn, upOut, parseHeaders(header))
            upOut.flush()
            relayResponse(upIn, clientOut)
            runCatching { upstream.close() }
        } catch (e: Exception) {
            ZHLog.error("$TAG plain http fail", e)
        } finally {
            runCatching { client.close() }
        }
    }

    // ================= HTTP 工具 =================
    private fun readHeaderBlock(input: InputStream): String? {
        val out = ByteArrayOutputStream()
        var state = 0 // 0:\r 1:\n 2:\r 3:\n
        var b = input.read()
        while (b >= 0) {
            out.write(b)
            when {
                b == 13 && state == 0 -> state = 1
                b == 10 && state == 1 -> state = 2
                b == 13 && state == 2 -> state = 3
                b == 10 && state == 3 -> return out.toString("ISO-8859-1")
                else -> state = 0
            }
            if (out.size() > 128 * 1024) break
            b = input.read()
        }
        return null
    }

    private fun parseHeaders(header: String): Map<String, String> {
        val map = HashMap<String, String>()
        header.lineSequence().drop(1).forEach { line ->
            val idx = line.indexOf(':')
            if (idx > 0) map[line.substring(0, idx).trim().lowercase()] = line.substring(idx + 1).trim()
        }
        return map
    }

    private fun copyRequestBody(input: InputStream, output: OutputStream, headers: Map<String, String>) {
        val len = headers["content-length"]?.toLongOrNull() ?: 0L
        if (len <= 0) return
        var remaining = len
        val buf = ByteArray(8192)
        while (remaining > 0) {
            val n = input.read(buf, 0, minOf(buf.size.toLong(), remaining).toInt())
            if (n < 0) break
            output.write(buf, 0, n)
            remaining -= n
        }
    }

    /** 转发响应：支持 Content-Length / chunked / 读到 EOF */
    private fun relayResponse(input: InputStream, output: OutputStream) {
        val header = readHeaderBlock(input) ?: return
        output.write(header.toByteArray(Charsets.ISO_8859_1))
        val h = parseHeaders(header)
        val chunked = (h["transfer-encoding"] ?: "").contains("chunked", true)
        if (chunked) {
            // 逐块读取并透传，直到 0 长度块
            val buf = ByteArray(8192)
            while (true) {
                val line = readLine(input) ?: break
                output.write((line + "\r\n").toByteArray(Charsets.ISO_8859_1))
                val size = line.trim().substringBefore(";").toIntOrNull(16) ?: 0
                var remain = size
                while (remain > 0) {
                    val n = input.read(buf, 0, minOf(buf.size.toLong(), remain.toLong()).toInt())
                    if (n < 0) { remain = 0; break }
                    output.write(buf, 0, n)
                    remain -= n
                }
                output.write("\r\n".toByteArray())
                if (size == 0) break
            }
        } else {
            val len = h["content-length"]?.toLongOrNull()
            if (len != null && len >= 0) {
                var remain = len
                val buf = ByteArray(8192)
                while (remain > 0) {
                    val n = input.read(buf, 0, minOf(buf.size.toLong(), remain.toLong()).toInt())
                    if (n < 0) break
                    output.write(buf, 0, n)
                    remain -= n
                }
            } else {
                input.copyTo(output, 8192)
            }
        }
        output.flush()
    }

    private fun readLine(input: InputStream): String? {
        val out = ByteArrayOutputStream()
        var b = input.read()
        while (b >= 0) {
            if (b == 10) return out.toString("ISO-8859-1").trimEnd('\r')
            out.write(b)
            if (out.size() > 64 * 1024) break
            b = input.read()
        }
        return if (out.size() > 0) out.toString("ISO-8859-1") else null
    }

    // ================= Token 提取与导入 =================
    private fun captureToken(headers: Map<String, String>) {
        val auth = headers["authorization"] ?: return
        val token = auth.removePrefix("Bearer ").removePrefix("bearer ").trim()
        if (token.length < 16 || token == lastToken) return
        lastToken = token
        hitCount++
        ZHLog.log("$TAG captured token: ${token.take(8)}…")
        importToken(token)
    }

    private fun importToken(token: String) {
        try {
            val prefs = context.getSharedPreferences(ZHPanelService.PREF_NAME, Context.MODE_PRIVATE)
            val panelPort = prefs.getInt(ZHPanelService.PREF_PORT_KEY, -1)
            if (panelPort <= 0) {
                ZHLog.log("$TAG panel port not ready, token cached only")
                return
            }
            val url = "http://127.0.0.1:$panelPort/api/quick-save?token=" + URLEncoder.encode(token, "UTF-8")
            OkHttpClient().newCall(Request.Builder().url(url).build()).enqueue(object : okhttp3.Callback {
                override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                    ZHLog.error("$TAG import token fail", e)
                }
                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                    response.use { ZHLog.log("$TAG token imported http=${it.code}") }
                }
            })
        } catch (e: Exception) {
            ZHLog.error("$TAG import token error", e)
        }
    }
}
