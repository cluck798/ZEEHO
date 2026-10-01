// shim.js — QuickJS 侧的 Loon 环境垫片（由 ZHDispatcher 在核心脚本之前注入）
// 原生函数（__ 前缀）由 Kotlin 注入：
//   __log / __finish / __storeRead / __storeWrite / __http (async, Promise)
//   __setTimeout / __setInterval / __clearTimer / __atob / __btoa / __notify
//
// 与 ios/App/Resources/shim.js 的差异：
//   $httpClient 块从回调式 __http(method, optsJson, cb) 改为 Promise 式
//   __http(method, optsJson) 返回 [err, status, headersJson, body] 数组
//   原因：dokar3/quickjs-kt 的 asyncFunction 绑定更顺，
//         且核心脚本里 $httpClient 调用已统一包在 new Promise(...) 内

var $loon = true;

// ---- console ----
var console = {
  log: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); },
  info: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); },
  warn: function () { __log("[WARN] " + Array.prototype.map.call(arguments, String).join(" ")); },
  error: function () { __log("[ERR] " + Array.prototype.map.call(arguments, String).join(" ")); },
  debug: function () { __log(Array.prototype.map.call(arguments, String).join(" ")); }
};

// ---- 定时器（dokar3 规范模式：Kotlin 提供 async __zhDelay + sync __zhCancelDelay；
//         JS 侧通过 Promise .then 调用 callback，避免 Kotlin 反向调用 JS 函数） ----
var __zhTimerSeq = 0;
function setTimeout(fn, ms) {
  var id = ++__zhTimerSeq;
  __zhDelay(Number(ms) || 0, id)
    .then(function () { try { fn(); } catch (e) {} })
    .catch(function () {});
  return id;
}
function clearTimeout(id) { __zhCancelDelay(id); }
function setInterval(fn, ms) {
  var id = ++__zhTimerSeq;
  var tick = function () {
    try { fn(); } catch (e) { return; }
    __zhDelay(Number(ms) || 0, id).then(tick).catch(function () {});
  };
  __zhDelay(Number(ms) || 0, id).then(tick).catch(function () {});
  return id;
}
function clearInterval(id) { __zhCancelDelay(id); }

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

// ---- $httpClient（Promise 化：__http 返回 [err, status, headersJson, body]） ----
var $httpClient = {};
(function () {
  var methods = ["get", "post", "put", "delete"];
  for (var i = 0; i < methods.length; i++) {
    (function (m) {
      $httpClient[m] = function (opts, cb) {
        if (typeof opts === "string") opts = { url: opts };
        opts = opts || {};
        var p = __http(m.toUpperCase(), JSON.stringify(opts));
        if (p && typeof p.then === "function") {
          p.then(function (r) {
            if (typeof cb !== "function") return;
            if (!r || !r.length) { cb("http: empty result", null, null); return; }
            var err = r[0], status = r[1], headersJson = r[2], body = r[3];
            if (err) { cb(err, null, null); return; }
            var headers = {};
            try { headers = JSON.parse(headersJson || "{}"); } catch (e) {}
            cb(null, { status: status, statusCode: status, headers: headers }, body);
          })["catch"](function (e) {
            if (typeof cb === "function") cb(String(e || "http: rejected"), null, null);
          });
        } else if (typeof cb === "function") {
          cb("__http did not return a Promise", null, null);
        }
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

// ---- $notification（本地通知桥 → 原生 __notify） ----
var $notification = {
  post: function (title, subtitle, body) {
    try { __notify(String(title || ""), String(subtitle || ""), String(body || "")); } catch (e) {}
  }
};

// ---- 安装信息（仅 iOS 注入；安卓端无对应桥接，返回 null） ----
var $appInstallInfo = function () {
  if (typeof __installInfo !== "function") return null;
  try { return __installInfo(); } catch (e) { return null; }
};
