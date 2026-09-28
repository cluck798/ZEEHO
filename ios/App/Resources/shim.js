// shim.js — JSContext 侧的 Loon 环境垫片（由 ZHDispatcher 在核心脚本之前注入）
// 原生函数（__ 前缀）由 Objective-C 注入：
//   __log / __finish / __storeRead / __storeWrite / __http
//   __setTimeout / __setInterval / __clearTimer / __atob / __btoa

var $loon = true;

// ---- console ----
var console = {
  log: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); },
  info: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); },
  warn: function () { __log("[WARN] " + Array.prototype.map.call(arguments, String).join(" ")); },
  error: function () { __log("[ERR] " + Array.prototype.map.call(arguments, String).join(" ")); },
  debug: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); }
};

// ---- 定时器 ----
function setTimeout(fn, ms) { return __setTimeout(fn, Number(ms) || 0); }
function clearTimeout(id) { __clearTimer(id); }
function setInterval(fn, ms) { return __setInterval(fn, Number(ms) || 0); }
function clearInterval(id) { __clearTimer(id); }

// ---- base64（二进制字符串语义） ----
function atob(s) { return __atob(String(s)); }
function btoa(s) { return __btoa(String(s)); }

// ---- URL 精简实现（覆盖脚本用到的 origin / pathname / search / searchParams.get） ----
if (typeof URL === "undefined") {
  var URL = function (input) {
    input = String(input);
    var m = /^([a-zA-Z][a-zA-Z0-9+.\-]*):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(input);
    if (!m) throw new TypeError("Invalid URL: " + input);
    this.protocol = m[1] + ":";
    this.host = m[2];
    this.origin = m[1] + "://" + m[2];
    this.pathname = m[3] || "/";
    this.search = m[4] || "";
    this.hash = m[5] || "";
    this.href = input;
    var self = this;
    this.searchParams = {
      get: function (name) {
        var q = self.search.replace(/^\?/, "");
        if (!q) return null;
        var pairs = q.split("&");
        for (var i = 0; i < pairs.length; i++) {
          var idx = pairs[i].indexOf("=");
          var k = idx >= 0 ? pairs[i].slice(0, idx) : pairs[i];
          var v = idx >= 0 ? pairs[i].slice(idx + 1) : "";
          try { k = decodeURIComponent(k); } catch (e) {}
          if (k === String(name)) {
            try { return decodeURIComponent(v.replace(/\+/g, " ")); } catch (e2) { return v; }
          }
        }
        return null;
      }
    };
  };
  URL.prototype.toString = function () { return this.href; };
}

// ---- $persistentStore ----
var $persistentStore = {
  read: function (key) {
    var v = __storeRead(String(key));
    return v == null ? null : v;
  },
  write: function (value, key) { __storeWrite(String(value), String(key)); }
};

// ---- $httpClient（回调签名与 Loon 一致：cb(error, {status,statusCode,headers}, body)） ----
var $httpClient = {};
(function () {
  var methods = ["get", "post", "put", "delete"];
  for (var i = 0; i < methods.length; i++) {
    (function (m) {
      $httpClient[m] = function (opts, cb) {
        if (typeof opts === "string") opts = { url: opts };
        opts = opts || {};
        __http(m.toUpperCase(), JSON.stringify(opts), function (err, status, headersJson, body) {
          if (typeof cb !== "function") return;
          if (err) { cb(err, null, null); return; }
          var headers = {};
          try { headers = JSON.parse(headersJson || "{}"); } catch (e) {}
          cb(null, { status: status, statusCode: status, headers: headers }, body);
        });
      };
    })(methods[i]);
  }
})();

// ---- $done（幂等；未带 response 视为空响应放行） ----
var __doneOnce = false;
function $done(resp) {
  if (__doneOnce) return;
  __doneOnce = true;
  resp = resp || {};
  var r = resp.response || {};
  var status = Number(r.status) || 200;
  var headers = r.headers || {};
  var body = (r.body !== undefined && r.body !== null) ? String(r.body) : "";
  __finish(status, JSON.stringify(headers), body);
}

// ---- $notification（v2.14.9 本地通知桥 → 原生 __notify / UNUserNotificationCenter） ----
var $notification = {
  post: function (title, subtitle, body) {
    try { __notify(String(title || ""), String(subtitle || ""), String(body || "")); } catch (e) {}
  }
};

// ---- 安装信息（原生 __installInfo 桥接，仅 iOS App 注入，返回当前安装包的签名方式） ----
var $appInstallInfo = function () {
  if (typeof __installInfo !== "function") return null;
  try { return __installInfo(); } catch (e) { return null; }
};
