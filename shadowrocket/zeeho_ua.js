/*
 * 极核 ZEEHO · UA 风控自愈（每个请求都换全新 UA）
 * 供 Loon / Surge / Shadowrocket / Quantumult X 的 http-request（请求头阶段）使用。
 * 作用：把官方 App 的 user-agent / x-app-info 换成一份全新的官方格式设备指纹。
 * 说明：请求签名不含 UA，替换不会影响 cfmoto-x-sign。
 *
 * Loon 规则示例（timeout 建议 10 秒，脚本很小，不会拖住请求）：
 * http-request ^https?://.*zeehoev\.com/.* script-path=https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/script/zeeho_ua.js?v=1, timeout=10, tag=极核UA
 */
(function () {
  function finish(headers) {
    try { $done(headers ? { headers: headers } : {}); } catch (e) {}
  }
  try {
    var req = (typeof $request !== "undefined" && $request) || {};
    var headers = req.headers || {};
    var ua = "", xapp = "";
    Object.keys(headers).forEach(function (k) {
      var lk = String(k).toLowerCase();
      if (lk === "user-agent") ua = String(headers[k] || "");
      if (lk === "x-app-info") xapp = String(headers[k] || "");
    });
    var official = /^MOBILE\|iOS\|[\d.]+\|ZEEHO_APP\|[\d.]+\|/i;
    // 只处理官方 App 形态的 UA；H5 / 浏览器请求保持原样
    if (!official.test(ua) && !official.test(xapp)) { finish(); return; }

    var models = [
      ["iPhone 12", "1170*2532"], ["iPhone 13", "1170*2532"], ["iPhone 13 Pro", "1170*2532"],
      ["iPhone 14", "1170*2532"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 15", "1179*2556"],
      ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"], ["iPhone 16", "1179*2556"]
    ];
    var vers = ["17.2.1", "17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];
    var m = models[Math.floor(Math.random() * models.length)];
    var v = vers[Math.floor(Math.random() * vers.length)];
    var hex = "0123456789ABCDEF", s = "";
    for (var i = 0; i < 32; i++) s += hex.charAt(Math.floor(Math.random() * 16));
    var uuid = s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20);
    var net = /WiFi/i.test(ua) ? "WiFi" : "WWAN";
    var newUA = "MOBILE|iOS|" + v + "|ZEEHO_APP|3.0.5|iPhone|" + m[0] + "|" + m[1] + "|" + uuid + "|" + net + "|iOS";

    var out = {};
    Object.keys(headers).forEach(function (k) {
      var lk = String(k).toLowerCase();
      out[k] = (lk === "user-agent" || lk === "x-app-info") ? newUA : headers[k];
    });
    // 诊断标记：抓到的 HAR 里出现这个头，说明本脚本确实执行了
    out["x-zeeho-ua"] = "v1";

    var oldId = (xapp || ua).split("|")[8] || "-";
    console.log("[极核UA] 已换新UA " + oldId.slice(0, 8) + " -> " + uuid.slice(0, 8) + " " + String(req.url || "").split("?")[0].slice(0, 70));
    finish(out);
  } catch (e) {
    console.log("[极核UA] 异常: " + e);
    finish();
  }
})();
