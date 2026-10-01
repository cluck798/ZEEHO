package com.zeeho.signpanel

import android.util.Base64

/**
 * atob / btoa 的二进制字符串语义实现。
 *
 * 与 Web/Node 的 atob/btoa 一致：输入输出均为"二进制字符串"（每个字符对应一个字节，
 * 即 ISO-8859-1 编码），而非 UTF-8 字符串。这样脚本侧 btoa(unescape(encodeURIComponent(...)))
 * 之类标准 trick 才能正确工作。
 *
 * 对应 iOS 端 [NSData alloc] initWithBase64EncodedString + NSISOLatin1StringEncoding。
 */
object ZHBase64 {
    fun atob(s: String): String {
        val bytes = Base64.decode(s, Base64.NO_PADDING or Base64.NO_WRAP)
        return String(bytes, Charsets.ISO_8859_1)
    }

    fun btoa(s: String): String {
        val bytes = s.toByteArray(Charsets.ISO_8859_1)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
