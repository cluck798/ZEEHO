package com.zeeho.signpanel

import android.content.Context
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
