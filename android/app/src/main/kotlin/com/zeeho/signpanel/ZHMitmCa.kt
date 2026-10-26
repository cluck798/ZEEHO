package com.zeeho.signpanel

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.asn1.x509.BasicConstraints
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.GeneralName
import org.bouncycastle.asn1.x509.GeneralNames
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import java.io.File
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.Date
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import java.util.concurrent.ConcurrentHashMap

/**
 * MITM 证书中心：本地 CA（首次生成并持久化）+ 按域名动态签发站点证书。
 *
 * 用户需把导出的 CA 安装到系统（或 root 装为系统证书）。Android 7+ 默认不信任用户 CA，
 * 因此非 root 设备上官方 App 的 HTTPS 可能无法被拦截——UI 会提示并用手机号登录兜底。
 */
object ZHMitmCa {
    private const val CA_PASS = "zeeho-mitm-ca"
    private const val CA_FILE = "zeeho_mitm_ca.p12"
    private const val CA_ALIAS = "zeeho-mitm-ca"
    private const val CA_EXPORT_NAME = "zeeho-ca.crt"

    private var caKey: PrivateKey? = null
    private var caCert: X509Certificate? = null
    private val ctxCache = ConcurrentHashMap<String, SSLContext>()

    /** 生成或加载 CA；成功返回 true */
    @Synchronized
    fun ensure(context: Context): Boolean {
        if (caKey != null && caCert != null) return true
        val file = File(context.filesDir, CA_FILE)
        if (file.exists()) {
            try {
                val ks = KeyStore.getInstance("PKCS12")
                file.inputStream().use { ks.load(it, CA_PASS.toCharArray()) }
                val alias = ks.aliases().toList().firstOrNull() ?: return false
                val key = ks.getKey(alias, CA_PASS.toCharArray()) as? PrivateKey ?: return false
                val cert = ks.getCertificate(alias) as? X509Certificate ?: return false
                caKey = key
                caCert = cert
                return true
            } catch (e: Exception) {
                ZHLog.error("load CA failed", e)
            }
        }
        return try {
            val kpg = KeyPairGenerator.getInstance("RSA")
            kpg.initialize(2048)
            val kp = kpg.generateKeyPair()
            val subject = X500Name("CN=ZEEHO Panel CA, O=ZEEHO, C=CN")
            val now = System.currentTimeMillis()
            val builder = JcaX509v3CertificateBuilder(
                subject,
                BigInteger.valueOf(now),
                Date(now - 86_400_000L),
                Date(now + 3650L * 86_400_000L),
                subject,
                kp.public
            )
            builder.addExtension(Extension.basicConstraints, true, BasicConstraints(true))
            val signer = JcaContentSignerBuilder("SHA256withRSA").build(kp.private)
            val cert = JcaX509CertificateConverter().getCertificate(builder.build(signer))
            val ks = KeyStore.getInstance("PKCS12")
            ks.load(null, null)
            ks.setKeyEntry(CA_ALIAS, kp.private, CA_PASS.toCharArray(), arrayOf(cert))
            file.outputStream().use { ks.store(it, CA_PASS.toCharArray()) }
            caKey = kp.private
            caCert = cert
            true
        } catch (e: Exception) {
            ZHLog.error("create CA failed", e)
            false
        }
    }

    /** 为指定 host 动态签发站点证书并返回 SSLContext（服务端模式） */
    fun serverContext(context: Context, host: String): SSLContext? {
        ctxCache[host]?.let { return it }
        synchronized(this) {
            ctxCache[host]?.let { return it }
            if (!ensure(context)) return null
            return try {
                val kpg = KeyPairGenerator.getInstance("RSA")
                kpg.initialize(2048)
                val kp = kpg.generateKeyPair()
                val issuer = X500Name(caCert!!.subjectX500Principal.name)
                val subject = X500Name("CN=$host")
                val now = System.currentTimeMillis()
                val builder = JcaX509v3CertificateBuilder(
                    issuer,
                    BigInteger.valueOf(now),
                    Date(now - 86_400_000L),
                    Date(now + 365L * 86_400_000L),
                    subject,
                    kp.public
                )
                builder.addExtension(
                    Extension.subjectAlternativeName,
                    false,
                    GeneralNames(arrayOf(GeneralName(GeneralName.dNSName, host)))
                )
                builder.addExtension(Extension.basicConstraints, true, BasicConstraints(false))
                val signer = JcaContentSignerBuilder("SHA256withRSA").build(caKey)
                val cert = JcaX509CertificateConverter().getCertificate(builder.build(signer))
                val ks = KeyStore.getInstance("PKCS12")
                ks.load(null, null)
                ks.setKeyEntry(host, kp.private, "".toCharArray(), arrayOf(cert, caCert))
                val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
                kmf.init(ks, "".toCharArray())
                val sc = SSLContext.getInstance("TLS")
                sc.init(kmf.keyManagers, null, SecureRandom())
                ctxCache[host] = sc
                sc
            } catch (e: Exception) {
                ZHLog.error("issue cert failed: $host", e)
                null
            }
        }
    }

    /** CA 证书 DER 编码（供 KeyChain 系统安装） */
    fun caEncoded(context: Context): ByteArray? {
        if (!ensure(context) || caCert == null) return null
        return try {
            caCert!!.encoded
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 导出 CA 到系统「下载」目录（DER 格式 .crt）。
     *
     * Android 11+ 已禁止应用用 KeyChain 直接拉起 CA 安装（弹窗只剩「关闭」），
     * 只能把证书放到用户可见的位置，由用户在 设置 → 加密与凭据 → 安装证书 里选择文件安装。
     *
     * @return 导出的相对路径（如「下载/zeeho-ca.crt」），失败返回 null
     */
    fun exportCaToDownloads(context: Context): String? {
        val der = caEncoded(context) ?: return null
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = context.contentResolver
                val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                // 覆盖旧文件，避免出现多份同名证书
                runCatching {
                    resolver.delete(
                        collection,
                        "${MediaStore.MediaColumns.DISPLAY_NAME}=?",
                        arrayOf(CA_EXPORT_NAME)
                    )
                }
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, CA_EXPORT_NAME)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/x-x509-ca-cert")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(collection, values) ?: return null
                resolver.openOutputStream(uri)?.use { it.write(der) } ?: return null
                "下载/$CA_EXPORT_NAME"
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!dir.exists()) dir.mkdirs()
                File(dir, CA_EXPORT_NAME).writeBytes(der)
                "下载/$CA_EXPORT_NAME"
            }
        } catch (e: Exception) {
            ZHLog.error("export CA to downloads failed", e)
            null
        }
    }

    /** 导出 CA 证书（PEM .crt），供系统安装 */
    fun exportCa(context: Context): File? {
        if (!ensure(context) || caCert == null) return null
        return try {
            val f = File(context.cacheDir, "zeeho-ca.crt")
            val b64 = android.util.Base64.encodeToString(caCert!!.encoded, android.util.Base64.NO_WRAP)
            val sb = StringBuilder()
            sb.append("-----BEGIN CERTIFICATE-----\n")
            var i = 0
            while (i < b64.length) {
                sb.append(b64, i, minOf(i + 64, b64.length)).append("\n")
                i += 64
            }
            sb.append("-----END CERTIFICATE-----\n")
            f.writeText(sb.toString())
            f
        } catch (e: Exception) {
            ZHLog.error("export CA failed", e)
            null
        }
    }
}
