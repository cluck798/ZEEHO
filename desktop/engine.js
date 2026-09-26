// engine.js — 在 Node vm 沙箱中运行 zeeho_box_enhanced.js
// 通过注入 $loon/$persistentStore/$httpClient/$done 等 shim，
// 让代理脚本原封不动地以 "Loon 环境" 运行在桌面端。
const vm = require("vm");
const fs = require("fs");
const path = require("path");

class Engine {
  /**
   * @param {object} opts
   * @param {string} opts.scriptPath 核心脚本绝对路径
   * @param {string} opts.storePath  持久化 JSON 文件路径
   * @param {(msg:string)=>void} [opts.log]
   */
  constructor({ scriptPath, storePath, log }) {
    this.scriptPath = scriptPath;
    this.storePath = storePath;
    this.log = log || (() => {});
    this._compiled = null; // { mtimeMs, script }
    this._store = this._loadStore();
  }

  // ---------- 持久化（$persistentStore 后端） ----------
  _loadStore() {
    try {
      return JSON.parse(fs.readFileSync(this.storePath, "utf8"));
    } catch (e) {
      return { kv: {} };
    }
  }
  _saveStore() {
    try {
      fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this._store, null, 2), "utf8");
    } catch (e) {
      this.log("[engine] 持久化写入失败: " + e.message);
    }
  }

  // ---------- 脚本编译（mtime 变更自动重编译，开发时改脚本即时生效） ----------
  _getScript() {
    const st = fs.statSync(this.scriptPath);
    if (!this._compiled || this._compiled.mtimeMs !== st.mtimeMs) {
      const code = fs.readFileSync(this.scriptPath, "utf8");
      this._compiled = { mtimeMs: st.mtimeMs, script: new vm.Script(code, { filename: "zeeho_box_enhanced.js" }) };
      this.log("[engine] 核心脚本已加载/重载: " + this.scriptPath);
    }
    return this._compiled.script;
  }

  // ---------- HTTP shim 底层 ----------
  async _fetch(method, opts) {
    if (typeof opts === "string") opts = { url: opts };
    const timeoutSec = Number(opts.timeout) > 0 ? Number(opts.timeout) : 60;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutSec * 1000);
    try {
      const init = {
        method,
        headers: opts.headers || {},
        redirect: "follow",
        signal: ctrl.signal
      };
      if (method !== "GET" && method !== "HEAD" && opts.body != null) init.body = opts.body;
      const res = await fetch(opts.url, init);
      const body = await res.text();
      const headers = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return { status: res.status, headers, body };
    } finally {
      clearTimeout(timer);
    }
  }

  _makeHttpClient() {
    const wrap = (method) => (opts, cb) => {
      this._fetch(method, opts)
        .then((r) => cb(null, { status: r.status, statusCode: r.status, headers: r.headers }, r.body))
        .catch((e) => cb(String((e && e.message) || e), null, null));
    };
    return { get: wrap("GET"), post: wrap("POST"), put: wrap("PUT"), delete: wrap("DELETE") };
  }

  /**
   * 分发一次请求给核心脚本
   * @param {object} req { url, method, headers, body }
   * @returns {Promise<{status:number, headers:object, body:string}>}
   */
  dispatch(req) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (resp) => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        // sendResp 使用 Loon 风格 { response: {status, headers, body} }；$done({}) 视为放行
        const r = (resp && resp.response) || {};
        resolve({
          status: Number(r.status) || 200,
          headers: r.headers || {},
          body: r.body != null ? String(r.body) : ""
        });
      };
      const guard = setTimeout(() => {
        if (!settled) { settled = true; reject(new Error("脚本执行超时(180s)")); }
      }, 180000);

      const store = this._store;
      const engine = this;
      const context = vm.createContext({
        // ---- 代理环境 shim ----
        $loon: true, // Env 类据此走 Loon 分支（$persistentStore/$httpClient/$done）
        $request: {
          url: req.url,
          method: (req.method || "GET").toUpperCase(),
          headers: req.headers || {},
          body: req.body != null ? String(req.body) : undefined
        },
        $done: finish,
        $persistentStore: {
          read: (key) => (key in store.kv ? store.kv[key] : null),
          write: (value, key) => { store.kv[String(key)] = String(value); engine._saveStore(); }
        },
        $httpClient: this._makeHttpClient(),
        // ---- v2.14.9 本地通知：桌面版走 Electron 系统通知（纯 Node 环境兜底为日志） ----
        $notification: {
          post: (title, subtitle, body) => {
            const text = [subtitle, body].filter(Boolean).join(" ");
            try {
              const { Notification } = require("electron");
              if (Notification.isSupported()) { new Notification({ title: String(title || ""), body: text, silent: false }).show(); return; }
            } catch (e) {}
            this.log(`[通知] ${title} ${text}`);
          }
        },
        // ---- Node 全局（vm 沙箱默认没有） ----
        console: {
          log: (...a) => this.log(a.map(String).join(" ")),
          error: (...a) => this.log("[ERR] " + a.map(String).join(" ")),
          warn: (...a) => this.log("[WARN] " + a.map(String).join(" "))
        },
        setTimeout, clearTimeout, setInterval, clearInterval,
        URL, URLSearchParams, TextEncoder, TextDecoder,
        btoa, atob, crypto,
        isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, JSON, Math, Date, Promise, Proxy, Reflect, Symbol, RegExp
      });

      try {
        this._getScript().runInContext(context, { timeout: 10000 });
      } catch (e) {
        finish({ response: { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: "脚本执行异常: " + String(e && e.stack || e) } });
      }
    });
  }
}

module.exports = Engine;
