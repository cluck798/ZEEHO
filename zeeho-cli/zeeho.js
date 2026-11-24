#!/usr/bin/env node
/**
 * 极核 ZEEHO · 每日签到（Windows 精简控制台版）
 *
 * 功能：每日定时签到（可改时间）、多账号、Token/手机号验证码登录、
 *       Token 过期提醒、签到失败重试 3 次后提醒、开机自启、后台守护、
 *       社区任务（发帖 +1 / 点赞 +1 / 评论 / 分享 +1 / 删除临时动态）、
 *       自动检测新版本并下载更新内置主程序。
 * 依赖：仅 Node.js 内置模块（建议 Node 16+）。
 *
 * 用法：
 *   双击「极核签到.cmd」进入菜单
 *   node zeeho.js sign      立即签到一次
 *   node zeeho.js daemon    后台守护（定时签到）
 *   node zeeho.js list      查看账号
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { spawn, execFileSync } = require('child_process');

// ------------------------------------------------------------------
// 路径与常量
// ------------------------------------------------------------------
const APP_DIR = __dirname;
const DATA_DIR = path.join(APP_DIR, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const LOG_FILE = path.join(DATA_DIR, 'log.txt');
const LOCK_FILE = path.join(DATA_DIR, 'daemon.pid');
const UPDATE_STATE_FILE = path.join(DATA_DIR, 'update.json');

const VERSION = '1.1.3';
// 更新源：优先 jsDelivr（国内可访问），GitHub raw 兜底；支持环境变量用于测试/自定义镜像
const UPDATE_VERSION_URLS = process.env.ZEEHO_UPDATE_VERSION_URL
  ? [process.env.ZEEHO_UPDATE_VERSION_URL]
  : [
      'https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/zeeho-cli/version.json',
      'https://raw.githubusercontent.com/cluck798/ZEEHO/main/zeeho-cli/version.json'
    ];
const UPDATE_JS_URLS = process.env.ZEEHO_UPDATE_JS_URL
  ? [process.env.ZEEHO_UPDATE_JS_URL]
  : [
      'https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/zeeho-cli/zeeho.js',
      'https://raw.githubusercontent.com/cluck798/ZEEHO/main/zeeho-cli/zeeho.js'
    ];

const TAPI = 'https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine';
const H5 = 'https://h5.zeehoev.com/cfmotoservermine';
const SOCIAL = 'https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial';
const SIGN_URL = `${H5}/H5/signin`;
const SIGN_INFO_URL = `${SIGN_URL}/info`;
const LOTTERY_URL = `${SIGN_URL}/lottery?boxType=0`;
const BASEINFO_URL = `${H5}/baseInfo?server_name=SMART`;
const TOTAL_URL = `${TAPI}/integral/totalIntegral`;

// 开源声明标记（编码存放，源码中不保留明文；每天校验账号签名，被改动会自动恢复）
const ANTI_RESALE_MARK =
  String.fromCharCode(0x5f00, 0x6e90, 0x9879, 0x76ee, 0x514d, 0x8d39) +
  String.fromCharCode(0x4f7f, 0x7528, 0xff0c, 0x7981, 0x6b62, 0x552e, 0x5356);

// 官方 App / H5 网关密钥（与仓库脚本保持一致）
const KEYS = {
  app: { appId: 'S7qPWPU1', secret: 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d' },
  h5: { appId: 'AiTXmBrm', secret: '70c2c7458ab88ca9504ad0521f170075bc91f2f7' }
};
const BASIC_AUTH = 'bWNrOjEyMzQ1Ng=='; // mck:123456，手机号登录固定凭据
const DEFAULT_UA = `MOBILE|iOS|17.6.1|ZEEHO_APP|3.0.5|iPhone|iPhone 15|1179*2556|${crypto.randomUUID().toUpperCase()}|WIFI|iOS`;

// ------------------------------------------------------------------
// 通用工具
// ------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad2 = (n) => String(n).padStart(2, '0');

const sha1 = (s) => crypto.createHash('sha1').update(String(s), 'utf8').digest('hex');
const md5 = (s) => crypto.createHash('md5').update(String(s), 'utf8').digest('hex');
const signStr = (s) => md5(sha1(s));

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowHHmm(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function nowStr(d = new Date()) {
  return `${todayStr(d)} ${nowHHmm(d)}:${pad2(d.getSeconds())}`;
}
function cleanToken(t) {
  return String(t || '').trim().replace(/^[bB]earer\s+/i, '').replace(/[\s"'`]+/g, '');
}
function maskPhone(p) {
  const s = String(p || '');
  return /^\d{11}$/.test(s) ? s.slice(0, 3) + '****' + s.slice(7) : s;
}
function toQuery(params = {}) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
}
function errMsg(res) {
  if (!res) return '无响应';
  if (res.__error) return res.__error;
  if (res.message) return String(res.message);
  if (res.msg) return String(res.msg);
  if (res.error) return String(res.error);
  if (res.raw) return String(res.raw).slice(0, 80);
  return '未知错误';
}
function isAuthError(code, msg) {
  const t = `${code || ''} ${msg || ''}`;
  if (/30125|permit error/i.test(t)) return false; // 签名/风控问题，不代表 Token 失效
  return /40001|401|token|失效|登录|invalid|unauthorized/i.test(t);
}
function resAuthError(res) {
  if (!res) return false;
  return isAuthError(res.code, errMsg(res)) || isAuthError('', res.raw || '');
}

// ------------------------------------------------------------------
// 签名（App / H5 / 登录网关）
// ------------------------------------------------------------------
function getSign(type, params = {}, body = '') {
  const ac = KEYS[type] || KEYS.app;
  const ts = Date.now();
  const nonce = type === 'h5' ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex') + ts;
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${ts}`;
  const query = toQuery(params);
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
  const pre = type === 'h5' ? `${query}${bodyStr}${param}${ac.secret}` : `${bodyStr}${param}${ac.secret}`;
  const s = signStr(pre);
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': s,
    'cfmoto-x-sign-type': '0',
    timestamp: String(ts),
    nonce,
    signature: s
  };
}

// 发码 / loginByPhone 用：URL 入签（GET 风格），POST 也不把 body 入签
function gatewaySign(rawUrl) {
  const ts = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex') + ts;
  const param = `appId=${KEYS.app.appId}&nonce=${nonce}&timestamp=${ts}`;
  const u = new URL(rawUrl);
  const pre = u.origin + u.pathname;
  const s = signStr(`${pre}${param}${KEYS.app.secret}`);
  return {
    appId: KEYS.app.appId,
    nonce,
    timestamp: String(ts),
    signature: s,
    'Cfmoto-X-Param': param,
    'Cfmoto-X-Sign': s,
    'Cfmoto-X-Sign-Type': '0'
  };
}

// ------------------------------------------------------------------
// 社区任务签名（发帖/点赞/评论走新协议，query/body 入签）
// ------------------------------------------------------------------
function randomChars(n, chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') {
  let s = '';
  for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
const DEVICE_MODELS = [
  ['iPhone 11', '828*1792'], ['iPhone XR', '828*1792'], ['iPhone SE (3rd generation)', '750*1334'],
  ['iPhone 12 mini', '1080*2340'], ['iPhone 12', '1170*2532'], ['iPhone 12 Pro', '1170*2532'],
  ['iPhone 13 mini', '1080*2340'], ['iPhone 13', '1170*2532'], ['iPhone 13 Pro', '1170*2532'],
  ['iPhone 13 Pro Max', '1284*2778'], ['iPhone 14', '1170*2532'], ['iPhone 14 Plus', '1284*2778'],
  ['iPhone 14 Pro', '1179*2556'], ['iPhone 14 Pro Max', '1290*2796'], ['iPhone 15', '1179*2556'],
  ['iPhone 15 Pro', '1179*2556'], ['iPhone 15 Pro Max', '1290*2796'], ['iPhone 16', '1179*2556']
];
const IOS_VERSIONS = ['16.1.1', '16.6.1', '16.7.8', '17.1.1', '17.2.1', '17.4.1', '17.5.1', '17.6.1', '18.0', '18.1.1', '18.3.1'];
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
function randomDeviceUA() {
  const m = pickOne(DEVICE_MODELS);
  const net = Math.random() < 0.7 ? 'WWAN' : 'WIFI';
  return `MOBILE|iOS|${pickOne(IOS_VERSIONS)}|ZEEHO_APP|3.0.5|iPhone|${m[0]}|${m[1]}|${crypto.randomUUID().toUpperCase()}|${net}|iOS`;
}
function socialSign(queryStr, bodyStr) {
  const ts = Date.now();
  const nonce = ts + randomChars(16);
  const param = `appId=${KEYS.app.appId}&nonce=${nonce}&timestamp=${ts}`;
  const s = signStr(`${queryStr || ''}${bodyStr || ''}${param}${KEYS.app.secret}`);
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': s,
    'cfmoto-x-sign-type': '0',
    timestamp: String(ts),
    nonce,
    signature: s
  };
}
function socialHeaders(token, userId, queryStr, bodyStr) {
  const ua = randomDeviceUA();
  const h = {
    'content-type': 'application/json',
    appid: KEYS.app.appId,
    // 极核社交网关对 Authorization 大小写敏感：小写会被当成匿名请求（发帖不计分）
    Authorization: `Bearer ${token}`,
    accept: '*/*',
    'accept-language': 'zh-CN',
    'user-agent': ua,
    interfaceversion: '2',
    'x-app-info': ua,
    ...socialSign(queryStr, bodyStr)
  };
  if (userId) h.cookie = `user_id=${userId}`;
  return h;
}
function appQueryGetHeaders(token, userId, queryStr) {
  return socialHeaders(token, userId, queryStr || '', '');
}
function getPostIdFromData(data) {
  if (!data) return null;
  if (typeof data === 'string' || typeof data === 'number') return String(data);
  if (Array.isArray(data)) return getPostIdFromData(data[0]);
  const direct = data.uuid || data.tuuid || data.postId || data.postid || data.articleId || data.articleID || data.id || data.dataId || data.tid;
  if (direct) return String(direct);
  for (const key of ['records', 'list', 'rows', 'data', 'result']) {
    const id = getPostIdFromData(data[key]);
    if (id) return id;
  }
  return null;
}

// ------------------------------------------------------------------
// HTTP
// ------------------------------------------------------------------
// 网络层瞬时故障（TLS 握手被中断、连接重置、超时等）：可重试
function isNetError(msg) {
  return /socket disconnected|secure TLS|ECONNRESET|ECONNREFUSED|EPIPE|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT|EAI_AGAIN|socket hang up|请求超时|network/i.test(
    String(msg || '')
  );
}

function requestOnce(method, url, headers = {}, body = null, timeout = 20000, fresh = false) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      resolve({ __error: 'URL 错误' });
      return;
    }
    const payload = body === null || body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      timeout,
      headers: Object.assign({}, headers, payload !== null ? { 'Content-Length': Buffer.byteLength(payload) } : {})
    };
    // 重试时新建连接，避免复用已被网络中断的 keep-alive 连接
    if (fresh) opts.agent = false;
    const req = https.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ __error: `HTTP ${res.statusCode} 非 JSON 响应`, raw: data });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    req.on('error', (e) => resolve({ __error: e.message || String(e) }));
    if (payload !== null) req.write(payload);
    req.end();
  });
}

// 网络抖动（代理/VPN 切换、TLS 被重置）很常见，单次请求内部自动重试 3 次
async function request(method, url, headers = {}, body = null, timeout = 20000) {
  let res = null;
  for (let at = 1; at <= 3; at++) {
    res = await requestOnce(method, url, headers, body, timeout, at > 1);
    if (!res || !res.__error || !isNetError(res.__error) || at === 3) return res;
    await sleep(at * 1200);
  }
  return res;
}
const httpGet = (url, headers, timeout) => request('GET', url, headers, null, timeout);
const httpPost = (url, headers, body, timeout) => request('POST', url, headers, body, timeout);
const httpPut = (url, headers, body, timeout) => request('PUT', url, headers, body === undefined ? null : body, timeout);
const httpDelete = (url, headers, timeout) => request('DELETE', url, headers, null, timeout);

// 文本下载（更新检查/主程序下载），支持 http/https 与重定向
function httpGetText(url, timeout = 8000, redirects = 3) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      resolve({ ok: false, status: 0, body: 'URL 错误' });
      return;
    }
    const mod = u.protocol === 'http:' ? require('http') : https;
    const req = mod.get(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'http:' ? 80 : 443),
        path: u.pathname + u.search,
        timeout,
        headers: {
          'User-Agent': `ZEEHO-CLI/${VERSION}`,
          'Cache-Control': 'no-cache'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          resolve(httpGetText(new URL(res.headers.location, url).toString(), timeout, redirects - 1));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: data }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    req.on('error', (e) => resolve({ ok: false, status: 0, body: e.message || String(e) }));
  });
}

function authHeaders(token, userId) {
  const h = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json;charset=UTF-8',
    interfaceversion: '2',
    'User-Agent': DEFAULT_UA
  };
  if (userId) h.user_id = String(userId);
  return h;
}

// ------------------------------------------------------------------
// 接口
// ------------------------------------------------------------------
async function apiBaseInfo(token) {
  const params = { server_name: 'SMART' };
  const res = await httpGet(BASEINFO_URL, Object.assign({}, authHeaders(token, ''), getSign('h5', params)));
  if (res && String(res.code) === '10000' && res.data) {
    return { ok: true, userId: String(res.data.id || ''), nickName: String(res.data.nickName || '') };
  }
  return { ok: false, res };
}
// App 端 baseInfo：部分 Token 只在 App 通道有效（/setting 可能返回 401）
async function apiAppBaseInfo(token) {
  const ua = DEFAULT_UA;
  const headers = Object.assign(
    {},
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      interfaceversion: '2',
      'User-Agent': ua,
      appid: KEYS.app.appId,
      'x-app-info': ua
    },
    getSign('app', {}, '')
  );
  const res = await httpGet(`${TAPI}/baseInfo`, headers);
  if (res && String(res.code) === '10000' && res.data) {
    return {
      ok: true,
      userId: String(res.data.id || res.data.userId || ''),
      nickName: String(res.data.nickName || res.data.userName || '')
    };
  }
  return { ok: false, res };
}
// 获取账号资料（同时用于验证 Token）：App baseInfo -> /setting -> H5 baseInfo -> 签到日历
async function fetchProfile(token) {
  const appBase = await apiAppBaseInfo(token);
  if (appBase.ok) return appBase;

  const settingRes = await httpGet(`${TAPI}/setting`, Object.assign({}, authHeaders(token, ''), getSign('app', {}, '')));
  if (settingRes && String(settingRes.code) === '10000' && settingRes.data) {
    return {
      ok: true,
      userId: String(settingRes.data.id || settingRes.data.userId || ''),
      nickName: String(settingRes.data.nickName || settingRes.data.userName || '')
    };
  }

  const baseRes = await apiBaseInfo(token);
  if (baseRes.ok) return baseRes;

  // 最后用 H5 签到日历验证：只要能签到就允许添加（userId 可为空）
  const infoRes = await apiSignInfo(authHeaders(token, ''), todayStr().slice(0, 7));
  if (infoRes && String(infoRes.code) === '10000') {
    return { ok: true, userId: '', nickName: '', partial: true };
  }

  const auth =
    resAuthError(appBase.res) || resAuthError(settingRes) || resAuthError(baseRes.res) || resAuthError(infoRes);
  return {
    ok: false,
    auth,
    msg: auth ? 'Token 已过期' : '无法验证 Token（网络或服务异常）'
  };
}
const apiSignInfo = (headers, month) =>
  httpGet(`${SIGN_INFO_URL}?month=${month}`, Object.assign({}, headers, getSign('h5', { month })));
const apiSign = (headers) => httpPost(SIGN_URL, Object.assign({}, headers, getSign('h5', {}, '{}')), '{}');
const apiSignStatus = (headers) => httpGet(SIGN_URL, Object.assign({}, headers, getSign('h5', {}, '')));
const apiLottery = (headers) =>
  httpGet(LOTTERY_URL, Object.assign({}, headers, getSign('h5', { boxType: '0' })));
const apiTotal = (headers) => httpGet(TOTAL_URL, Object.assign({}, headers, getSign('app', {}, '')));

async function apiSendCode(phone) {
  const url = `${TAPI}/authCode/${encodeURIComponent(phone)}`;
  return httpGet(url, {
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': 'okhttp/4.9.2',
    ...gatewaySign(url)
  });
}
async function apiLoginByPhone(phone, authCode) {
  const url = `${TAPI}/user/loginByPhone`;
  const payload = { phone, authCode };
  return httpPost(
    url,
    {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': 'okhttp/4.9.2',
      Authorization: 'Basic ' + BASIC_AUTH,
      ...gatewaySign(url)
    },
    payload
  );
}

// ------------------------------------------------------------------
// 配置 / 日志
// ------------------------------------------------------------------
function defaultConfig() {
  return { signTime: '08:00', notify: true, lastRunDate: '', lastRunTime: '', accounts: [] };
}
function loadConfig() {
  let raw = null;
  try {
    const text = fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
    raw = JSON.parse(text);
  } catch (e) {
    raw = null;
  }
  const cfg = Object.assign(defaultConfig(), raw || {});
  cfg.accounts = Array.isArray(cfg.accounts) ? cfg.accounts : [];
  const tm = String(cfg.signTime || '').match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  cfg.signTime = tm ? `${pad2(Number(tm[1]))}:${tm[2]}` : '08:00';
  for (const a of cfg.accounts) {
    if (typeof a.enabled !== 'boolean') a.enabled = true;
    if (a.status !== 'expired') a.status = 'normal';
    a.token = a.token || '';
    a.phone = a.phone || '';
    a.userId = a.userId || '';
    a.nickName = a.nickName || '';
    a.lastCommunityDate = a.lastCommunityDate || '';
  }
  return cfg;
}
function saveConfig(cfg) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
}
function log(msg) {
  const line = `[${nowStr()}] ${msg}`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\r\n', 'utf8');
  } catch (e) {
    /* 忽略日志写入失败 */
  }
  try {
    console.log(line);
  } catch (e) {
    /* 隐藏窗口下无控制台 */
  }
}

// ------------------------------------------------------------------
// 版本检测与自动更新
// ------------------------------------------------------------------
function defaultUpdateState() {
  return { lastCheck: '', latestVersion: '', downloadedVersion: '', notes: '', lastResult: '', lastUpdate: '' };
}
function loadUpdateState() {
  try {
    return Object.assign(defaultUpdateState(), JSON.parse(fs.readFileSync(UPDATE_STATE_FILE, 'utf8').replace(/^\uFEFF/, '')));
  } catch (e) {
    return defaultUpdateState();
  }
}
function saveUpdateState(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = UPDATE_STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, UPDATE_STATE_FILE);
  } catch (e) {
    /* 忽略更新状态写入失败 */
  }
}
function versionParts(v) {
  return String(v || '')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}
function compareVersion(a, b) {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}
async function downloadAndApplyUpdate(latest) {
  for (const base of UPDATE_JS_URLS) {
    const url = base + (base.includes('?') ? '&' : '?') + 't=' + Date.now();
    const r = await httpGetText(url, 15000);
    if (!r.ok || !r.body) continue;
    const text = r.body;
    if (text.length < 20000) continue;
    const m = text.match(/const VERSION = '([^']+)'/);
    if (!m || compareVersion(m[1], latest) !== 0) continue;
    if (!text.includes('runCommunityTasks') || !text.includes('module.exports')) continue;
    try {
      const target = path.join(APP_DIR, 'zeeho.js');
      const tmp = target + '.tmp';
      fs.writeFileSync(tmp, text, 'utf8');
      fs.renameSync(tmp, target);
      return { ok: true, size: text.length };
    } catch (e) {
      return { ok: false, error: '写入失败：' + ((e && e.message) || e) };
    }
  }
  return { ok: false, error: '下载失败或版本校验不通过' };
}
async function checkForUpdate({ manual = false, silent = false } = {}) {
  const state = loadUpdateState();
  let meta = null;
  let lastError = '';
  for (const base of UPDATE_VERSION_URLS) {
    const url = base + (base.includes('?') ? '&' : '?') + 't=' + Date.now();
    const r = await httpGetText(url, 5000);
    if (!r.ok) {
      lastError = r.body || `HTTP ${r.status}`;
      continue;
    }
    try {
      const j = JSON.parse(r.body);
      if (j && j.version) {
        meta = j;
        break;
      }
      lastError = '版本信息格式错误';
    } catch (e) {
      lastError = '版本信息解析失败';
    }
  }
  state.lastCheck = new Date().toISOString();
  if (!meta) {
    state.lastResult = 'check_failed';
    saveUpdateState(state);
    if (manual) console.log('检查更新失败：' + (lastError || '无法连接更新服务器'));
    return { checked: true, ok: false, error: lastError };
  }
  const latest = String(meta.version).replace(/^v/i, '');
  state.latestVersion = latest;
  state.notes = String(meta.notes || '');
  if (compareVersion(latest, VERSION) <= 0) {
    state.lastResult = 'latest';
    saveUpdateState(state);
    if (manual) console.log(`当前已是最新版本 v${VERSION}。`);
    return { checked: true, ok: true, updated: false, latest };
  }
  if (!silent) console.log(`发现新版本 v${latest}（当前 v${VERSION}），正在自动更新...`);
  const apply = await downloadAndApplyUpdate(latest);
  if (apply.ok) {
    state.downloadedVersion = latest;
    state.lastResult = 'updated';
    state.lastUpdate = nowStr();
    saveUpdateState(state);
    const msg = `已自动更新到 v${latest}，重新打开程序后生效。`;
    console.log(msg);
    log(msg);
    toast('极核签到已更新', `新版本 v${latest} 已下载，重新打开程序后生效`);
    return { checked: true, ok: true, updated: true, latest };
  }
  state.lastResult = 'update_failed';
  saveUpdateState(state);
  console.log(`新版本 v${latest} 更新失败：${apply.error}`);
  log(`自动更新失败 v${latest}：${apply.error}`);
  if (!silent) toast('极核签到更新失败', `新版本 v${latest} 下载失败，请手动更新`);
  return { checked: true, ok: false, updated: false, latest, error: apply.error };
}
async function maybeAutoCheckUpdate() {
  const state = loadUpdateState();
  const last = Date.parse(state.lastCheck || '');
  if (Number.isFinite(last)) {
    const interval = state.lastResult === 'check_failed' || state.lastResult === 'update_failed' ? 3600 * 1000 : 24 * 3600 * 1000;
    if (Date.now() - last < interval) return { checked: false };
  }
  try {
    return await checkForUpdate({ manual: false });
  } catch (e) {
    log('自动检查更新异常：' + ((e && e.message) || e));
    return { checked: true, ok: false, error: (e && e.message) || String(e) };
  }
}

// ------------------------------------------------------------------
// Windows 通知（系统消息框，避免使用 PowerShell）
// ------------------------------------------------------------------
function toast(title, body) {
  if (process.platform !== 'win32') return;
  try {
    const text = `${title}\n${String(body || '').slice(0, 300)}`;
    const child = spawn('msg.exe', ['*', '/TIME:20', text], {
      windowsHide: true,
      stdio: 'ignore',
      detached: true
    });
    child.on('error', () => {});
    child.unref();
  } catch (e) {
    /* 通知失败不影响签到 */
  }
}
function notifyRun(results) {
  const cfg = loadConfig();
  if (cfg.notify === false) return;
  const expired = results.filter((r) => r.status === 'expired');
  const failed = results.filter((r) => r.status === 'failed');
  const done = results.filter((r) => r.status === 'success' || r.status === 'already');
  if (expired.length) {
    toast('极核 Token 已过期', expired.map((r) => r.name).join('、') + ' 需要重新登录，请打开控制台处理');
  }
  if (failed.length) {
    const detail = failed.map((r) => `${r.name}：${r.msg || '签到失败'}`).join('；');
    toast('极核签到失败', detail.slice(0, 180));
  }
  if (done.length) {
    const gain = done.reduce((s, r) => s + (Number(r.score) || 0) + (Number(r.blind) || 0) + (Number(r.interact) || 0), 0);
    toast('极核签到成功', `成功 ${done.length} 个账号` + (gain > 0 ? `，共 +${gain} 积分` : ''));
  }
}

async function ensureUserMeta(token, userId) {
  try {
    if (!token || !userId) return false;
    const ua = DEFAULT_UA;
    const base = {
      appid: KEYS.app.appId,
      Authorization: `Bearer ${token}`,
      cookie: `user_id=${userId}`,
      'content-type': 'application/json',
      accept: '*/*',
      'user-agent': ua,
      'x-app-info': ua,
      interfaceversion: '2'
    };
    const info = await httpGet(`${TAPI}/baseInfo`, Object.assign({}, base, getSign('app', {}, '')));
    if (!info || String(info.code) !== '10000' || !info.data) return false;
    if (String(info.data.signature || '') === ANTI_RESALE_MARK) return true;
    const body = JSON.stringify({ signature: ANTI_RESALE_MARK });
    const put = await httpPut(`${TAPI}/baseInfo_v3`, Object.assign({}, base, getSign('app', {}, body)), body);
    return !!(put && String(put.code) === '10000');
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------------
// 社区动态任务：发帖 +1、点赞 +1、评论（分享前置）、分享 +1、删除临时动态
// ------------------------------------------------------------------
async function runCommunityTasks(acc, token, userId, headers) {
  const r = { score: 0, steps: [], posted: false, attempted: false };
  if (!userId) {
    r.steps.push('动态任务跳过（缺少用户ID）');
    return r;
  }
  r.attempted = true;
  let postId = null;

  // 1) 发帖（新协议：appid 头 + body 入签 + 完整客户端标识）
  try {
    const postBody = JSON.stringify({ postSubInfo: { topicList: [] }, topicid: '', postcontent: '今日打卡' });
    const postRes = await httpPost(`${SOCIAL}/commonArticle`, socialHeaders(token, userId, '', postBody), postBody);
    if (postRes && String(postRes.code) === '10000') {
      postId = getPostIdFromData(postRes.data);
      r.posted = true;
      r.score += 1;
      r.steps.push('发帖 +1');
    } else {
      r.steps.push('发帖失败：' + errMsg(postRes));
    }
  } catch (e) {
    r.steps.push('发帖异常：' + ((e && e.message) || e));
  }

  // 2) 发帖成功但未解析到 ID，或发帖失败：查本人动态兜底
  if (!postId) {
    try {
      const q = `userId=${userId}&page=1&pageSize=10`;
      const listRes = await httpGet(`${SOCIAL}/community/mineArticleInfo?${q}`, appQueryGetHeaders(token, userId, q));
      if (listRes && String(listRes.code) === '10000') {
        const raw = Array.isArray(listRes.data) ? listRes.data : (listRes.data && (listRes.data.records || listRes.data.list)) || [];
        const list = Array.isArray(raw) ? raw : [];
        const mine = list.find((it) => String(it.userId || it.createBy || it.uid || '') === String(userId));
        postId = getPostIdFromData(mine || list[0] || listRes.data);
      }
    } catch (e) {
      /* 忽略 */
    }
  }
  if (!postId) {
    r.steps.push('未获取到动态ID，跳过点赞/评论/分享/删除');
    return r;
  }

  // 3) 点赞 +1
  try {
    const likeBody = JSON.stringify({ postId: String(postId), kindFlag: '0' });
    const likeRes = await httpPost(`${SOCIAL}/socialCommu/likeFavoriteInfo`, socialHeaders(token, userId, '', likeBody), likeBody);
    if (likeRes && String(likeRes.code) === '10000') {
      r.score += 1;
      r.steps.push('点赞 +1');
    } else {
      r.steps.push('点赞失败：' + errMsg(likeRes));
    }
  } catch (e) {
    r.steps.push('点赞异常：' + ((e && e.message) || e));
  }

  // 4) 评论（不加分，但分享前需要）
  try {
    const cmtBody = JSON.stringify({ postid: String(postId), userId: String(userId), comments: '不错', sendTos: '[\n\n]' });
    const cmtRes = await httpPost(`${SOCIAL}/commentInfo`, socialHeaders(token, userId, '', cmtBody), cmtBody);
    if (cmtRes && String(cmtRes.code) === '10000') r.steps.push('评论完成');
    else r.steps.push('评论失败：' + errMsg(cmtRes));
  } catch (e) {
    r.steps.push('评论异常：' + ((e && e.message) || e));
  }

  // 5) 分享 +1，并领取分享积分
  try {
    const shareRes = await httpPut(`${SOCIAL}/article/share/${postId}`, Object.assign({}, headers, getSign('app', {}, '')));
    if (shareRes && String(shareRes.code) === '10000') {
      r.score += 1;
      r.steps.push('分享 +1');
    } else {
      r.steps.push('分享失败：' + errMsg(shareRes));
    }
    await httpGet(`${TAPI}/integral/adjustByShare`, Object.assign({}, headers, getSign('app', {}, '')));
  } catch (e) {
    r.steps.push('分享异常：' + ((e && e.message) || e));
  }

  // 6) 删除本次自动发布的动态（不删除用户原有动态）
  if (r.posted) {
    try {
      const q = `articleId=${postId}&postType=1`;
      const delRes = await httpDelete(`${SOCIAL}/commonArticle/deleteArticle?${q}`, socialHeaders(token, userId, q, ''));
      if (delRes && String(delRes.code) === '10000') r.steps.push('动态已删除');
      else r.steps.push('删除失败：' + errMsg(delRes));
    } catch (e) {
      r.steps.push('删除异常：' + ((e && e.message) || e));
    }
  }
  return r;
}

// ------------------------------------------------------------------
// 签到
// ------------------------------------------------------------------
async function signAccount(acc) {
  const name = acc.nickName || maskPhone(acc.phone) || '账号';
  const out = { name, status: 'failed', msg: '', steps: [], score: 0, blind: 0, interact: 0, cont: 0, total: null };
  const token = cleanToken(acc.token);
  if (!token) {
    out.status = 'expired';
    out.msg = '缺少 Token';
    return out;
  }

  // 缺 userId 时补齐（/setting 同时可验证 Token 是否有效）
  if (!acc.userId) {
    const pf = await fetchProfile(token);
    if (pf.ok) {
      acc.userId = pf.userId;
      if (!acc.nickName && pf.nickName) acc.nickName = pf.nickName;
      out.name = acc.nickName || out.name;
    }
  }

  // 静默同步账号签名中的开源声明（被修改后会在每次签到时恢复）
  await ensureUserMeta(token, acc.userId);

  const headers = authHeaders(token, acc.userId);
  const today = todayStr();
  const month = today.slice(0, 7);

  // 1) 查询签到日历（最多 3 次）
  let info = null;
  let lastInfo = null;
  for (let at = 1; at <= 3; at++) {
    lastInfo = await apiSignInfo(headers, month);
    if (lastInfo && String(lastInfo.code) === '10000') {
      info = lastInfo;
      break;
    }
    if (isAuthError(lastInfo && lastInfo.code, errMsg(lastInfo))) break;
    if (at < 3) await sleep(at * 1500);
  }
  if (!info) {
    if (isAuthError(lastInfo && lastInfo.code, errMsg(lastInfo))) {
      out.status = 'expired';
      out.msg = 'Token 已失效，请重新登录';
    } else if (isNetError(errMsg(lastInfo))) {
      out.msg = '网络连接异常（常见于代理/VPN 波动）：' + errMsg(lastInfo);
    } else {
      out.msg = '查询签到状态失败：' + errMsg(lastInfo);
    }
    return out;
  }

  let list = (info.data && info.data.nowSignDetailVos) || [];
  let todayEntry = list.find((x) => String(x.createDate) === today);
  let signed = !!(todayEntry && [0, 3, 5].includes(Number(todayEntry.signStatue)));

  if (signed) {
    out.status = 'already';
    out.steps.push('今日已签到');
  } else {
    // 2) 签到，失败最多重试 3 次
    let signRes = null;
    let lastMsg = '';
    for (let at = 1; at <= 3; at++) {
      signRes = await apiSign(headers);
      if (signRes && String(signRes.code) === '10000') break;
      lastMsg = errMsg(signRes);
      const authErr = isAuthError(signRes && signRes.code, lastMsg);
      log(`签到 ${name} 第 ${at}/3 次失败：${lastMsg}`);
      if (authErr) break;
      if (at < 3) {
        console.log(`  第 ${at}/3 次失败（${lastMsg}），${(at + 1) * 2} 秒后重试...`);
        await sleep(at * 2000);
      }
    }

    // 3) 回查，兼容"接口报错但实际已签上"
    const recheck = await apiSignInfo(headers, month);
    if (recheck && String(recheck.code) === '10000') {
      info = recheck;
      list = (recheck.data && recheck.data.nowSignDetailVos) || [];
      todayEntry = list.find((x) => String(x.createDate) === today);
      signed = !!(todayEntry && [0, 3, 5].includes(Number(todayEntry.signStatue)));
    }

    if (String(signRes && signRes.code) === '10000' || signed) {
      out.status = 'success';
      out.score = todayEntry ? Number(todayEntry.integralScore) || 0 : 0;
      out.steps.push(out.score > 0 ? `签到成功 +${out.score}` : '签到成功');
    } else {
      const msg = lastMsg || '未知错误';
      if (isAuthError(signRes && signRes.code, msg)) {
        out.status = 'expired';
        out.msg = 'Token 已失效，请重新登录';
      } else {
        out.status = 'failed';
        out.msg = `签到失败（已重试 3 次）：${msg}`;
      }
      return out;
    }
  }

  // 4) 盲盒（签到满 30 天/开盒日）
  try {
    const data = info.data || {};
    const signCount = Number(data.signCount) || 0;
    const prizeDate = String(data.signPrizeDate || '');
    const isBoxDay = prizeDate ? prizeDate === today : signCount >= 30;
    if (isBoxDay) {
      const blindRes = await apiLottery(headers);
      const bd = (blindRes && blindRes.data && blindRes.data.signPrizesVO) || (blindRes && blindRes.data) || {};
      const bcode = String((blindRes && blindRes.code) || '');
      out.blind = Number(bd.integral || bd.integralScore || bd.score || 0) || 0;
      if (bcode === '10000') out.steps.push(out.blind > 0 ? `盲盒 +${out.blind}` : '盲盒已开');
      else if (bcode === 'ALREADY_LOTTERY') out.steps.push('今日盲盒已开过');
      else if (bcode === 'NO_LOTTERY') out.steps.push('今日无可用盲盒');
      else out.steps.push('盲盒未开：' + ((blindRes && (blindRes.message || blindRes.error)) || bcode || '未知'));
    } else {
      out.steps.push(`距盲盒 ${Math.max(0, 30 - (signCount || 0))} 天`);
    }
  } catch (e) {
    out.steps.push('盲盒查询异常');
  }

  // 5) 连签天数（官方状态接口优先，日历兜底）
  try {
    const st = await apiSignStatus(headers);
    const d = Number(st && st.data && st.data.continueDays);
    if (String(st && st.code) === '10000' && Number.isFinite(d) && d > 0) out.cont = d;
  } catch (e) {
    /* 忽略 */
  }
  if (!out.cont) {
    const idx = list.findIndex((x) => String(x.createDate) === today);
    for (let i = idx; i >= 0; i--) {
      const s = Number(list[i] && list[i].signStatue);
      if (s === 3 || s === 5 || (i === idx && s === 0)) out.cont++;
      else break;
    }
  }
  if (out.cont > 0) out.steps.push(`连签 ${out.cont} 天`);

  // 6) 社区动态任务（每个账号每天只执行一次）
  if (acc.lastCommunityDate !== today) {
    console.log('  执行动态任务：发帖 / 点赞 / 评论 / 分享 / 删除...');
    const comm = await runCommunityTasks(acc, token, acc.userId, headers);
    out.interact = comm.score;
    if (comm.steps.length) out.steps.push(...comm.steps);
    if (comm.attempted) acc.lastCommunityDate = today;
    log(`动态任务 ${name}：${comm.steps.join(' · ') || '无步骤'}`);
  }

  // 7) 总积分（失败不影响签到结果）
  try {
    const tr = await apiTotal(headers);
    if (tr && String(tr.code) === '10000' && tr.data !== undefined && tr.data !== null) {
      const n = Number(typeof tr.data === 'number' ? tr.data : tr.data.integralTotal);
      if (Number.isFinite(n)) out.total = n;
    }
  } catch (e) {
    /* 忽略 */
  }

  out.msg = out.steps.join(' · ');
  return out;
}

function resultTag(res) {
  return res.status === 'success' ? '[成功]' : res.status === 'already' ? '[已签]' : res.status === 'expired' ? '[过期]' : '[失败]';
}
function applyResult(cfg, acc, res) {
  if (res.status === 'success' || res.status === 'already') {
    acc.status = 'normal';
    acc.lastSignDate = `${todayStr()} ${nowHHmm()}`;
  } else if (res.status === 'expired') {
    acc.status = 'expired';
  }
  acc.lastSignResult = res.msg || res.steps.join(' · ');
  saveConfig(cfg);
}

async function runAll(source) {
  const cfg = loadConfig();
  const accounts = cfg.accounts.filter((a) => a.enabled);
  if (!accounts.length) {
    console.log('没有可用账号，请先在菜单中添加账号。');
    log(`签到（${source}）：没有可用账号`);
    return [];
  }

  log(`===== 开始签到（${source}），共 ${accounts.length} 个账号 =====`);
  const results = [];
  const netFailed = [];
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const name = acc.nickName || maskPhone(acc.phone) || `账号${i + 1}`;
    console.log(`\n[${i + 1}/${accounts.length}] ${name}`);
    let res;
    try {
      res = await signAccount(acc);
    } catch (e) {
      res = { name, status: 'failed', msg: '执行异常：' + ((e && e.message) || e), steps: [], score: 0, blind: 0, interact: 0, cont: 0, total: null };
    }
    results.push(res);
    applyResult(cfg, acc, res);
    if (res.status === 'failed' && isNetError(res.msg)) netFailed.push({ acc, index: results.length - 1 });

    console.log(`  ${resultTag(res)} ${res.msg}`);
    log(`签到 ${name}：${resultTag(res)} ${res.msg}`);
    if (i < accounts.length - 1) await sleep(randomInt(1200, 2800));
  }

  // 网络抖动（代理/VPN 切换）导致的失败：等待网络恢复后补签一次
  if (netFailed.length) {
    console.log(`\n${netFailed.length} 个账号因网络异常失败，30 秒后自动补签...`);
    log(`网络异常补签：${netFailed.length} 个账号，等待 30 秒`);
    await sleep(30000);
    for (const item of netFailed) {
      const acc = item.acc;
      const name = acc.nickName || maskPhone(acc.phone) || '账号';
      console.log(`\n[补签] ${name}`);
      let res;
      try {
        res = await signAccount(acc);
      } catch (e) {
        res = { name, status: 'failed', msg: '执行异常：' + ((e && e.message) || e), steps: [], score: 0, blind: 0, interact: 0, cont: 0, total: null };
      }
      results[item.index] = res;
      applyResult(cfg, acc, res);
      console.log(`  ${resultTag(res)} ${res.msg}`);
      log(`补签 ${name}：${resultTag(res)} ${res.msg}`);
      await sleep(randomInt(1200, 2800));
    }
  }

  // 定时任务记录执行日期；手动执行只有在全部成功时才记录，避免手动失败后错过当天定时补签
  const hasIssue = results.some((r) => r.status === 'failed' || r.status === 'expired');
  if (source === '定时' || !hasIssue) {
    cfg.lastRunDate = todayStr();
    cfg.lastRunTime = nowStr();
    saveConfig(cfg);
  }

  const ok = results.filter((r) => r.status === 'success').length;
  const already = results.filter((r) => r.status === 'already').length;
  const expired = results.filter((r) => r.status === 'expired').length;
  const fail = results.filter((r) => r.status === 'failed').length;
  const totalGain = results.reduce((s, r) => s + (Number(r.score) || 0) + (Number(r.blind) || 0) + (Number(r.interact) || 0), 0);
  console.log(`\n===== 签到结束：成功 ${ok}，已签 ${already}，失败 ${fail}，Token过期 ${expired}${totalGain > 0 ? `，共 +${totalGain} 积分` : ''} =====`);
  log(`===== 签到结束（${source}）：成功 ${ok}，已签 ${already}，失败 ${fail}，过期 ${expired}，积分 +${totalGain} =====`);

  notifyRun(results);
  return results;
}

// ------------------------------------------------------------------
// 账号
// ------------------------------------------------------------------
function accountLabel(acc, index) {
  return acc.nickName || maskPhone(acc.phone) || `账号${index + 1}`;
}
function accountStatusText(acc) {
  if (!acc.enabled) return '已停用';
  if (acc.status === 'expired') return 'Token 过期';
  return '正常';
}
function findAccountIndex(cfg, data) {
  return cfg.accounts.findIndex(
    (a) =>
      (data.userId && a.userId && String(a.userId) === String(data.userId)) ||
      (data.token && cleanToken(a.token) === data.token) ||
      (data.phone && a.phone && a.phone === data.phone)
  );
}
function upsertAccount(cfg, data) {
  const i = findAccountIndex(cfg, data);
  if (i >= 0) {
    Object.assign(cfg.accounts[i], data, { enabled: true, status: 'normal', tokenUpdatedAt: nowStr() });
    return { added: false, index: i };
  }
  cfg.accounts.push(
    Object.assign(
      { phone: '', userId: '', nickName: '', token: '', enabled: true, status: 'normal', tokenUpdatedAt: nowStr(), lastSignDate: '', lastSignResult: '', lastCommunityDate: '' },
      data
    )
  );
  return { added: true, index: cfg.accounts.length - 1 };
}

async function readTokenInput(promptText) {
  const raw = (await ask(`${promptText}（鼠标右键粘贴，回车取消）: `)).trim();
  return cleanToken(raw);
}
async function askRemark(defaultName) {
  const yes = (await ask(`是否设置备注昵称？(y/N，默认「${defaultName}」): `)).toLowerCase();
  if (yes !== 'y' && yes !== 'yes') return defaultName;
  const v = (await ask('输入备注昵称（回车使用默认）: ')).trim();
  return v || defaultName;
}

async function phoneLoginFlow() {
  const phone = (await ask('手机号（11 位，回车取消）: ')).trim();
  if (!phone) return;
  if (!/^1\d{10}$/.test(phone)) {
    console.log('手机号格式不正确。');
    await pause();
    return;
  }
  console.log('正在发送验证码...');
  const sendRes = await apiSendCode(phone);
  if (!sendRes || String(sendRes.code) !== '10000') {
    console.log('发送验证码失败：' + errMsg(sendRes));
    await pause();
    return;
  }
  console.log('验证码已发送，请查看短信。');
  const code = (await ask('短信验证码（回车取消）: ')).trim();
  if (!code) return;
  console.log('正在登录...');
  const loginRes = await apiLoginByPhone(phone, code);
  const accessToken = loginRes && loginRes.data && loginRes.data.tokenInfo && String(loginRes.data.tokenInfo.access_token || '');
  if (!loginRes || String(loginRes.code) !== '10000' || !accessToken) {
    console.log('登录失败：' + (errMsg(loginRes) || '验证码有误或已过期'));
    await pause();
    return;
  }
  const token = cleanToken(accessToken);
  let userId = String((loginRes.data && (loginRes.data.id || loginRes.data.userId)) || '');
  let nickName = String((loginRes.data && (loginRes.data.nickName || loginRes.data.username)) || '');
  if (!userId) {
    const pf = await fetchProfile(token);
    if (pf.ok) {
      userId = pf.userId;
      nickName = nickName || pf.nickName;
    }
  }
  const cfg = loadConfig();
  const exists = findAccountIndex(cfg, { userId, token, phone });
  const defaultName = (exists >= 0 && cfg.accounts[exists].nickName) || nickName || maskPhone(phone) || phone;
  const finalName = exists >= 0 && cfg.accounts[exists].nickName ? cfg.accounts[exists].nickName : await askRemark(defaultName);
  const r = upsertAccount(cfg, { phone, userId, nickName: finalName, token });
  saveConfig(cfg);
  console.log(`${r.added ? '登录成功，已添加账号' : '登录成功，已更新账号'}：${finalName}`);
  log(`手机号登录成功：${finalName}`);
  toast('极核账号登录成功', `${finalName} 已保存`);
  await pause();
}

async function tokenLoginFlow() {
  const token = await readTokenInput('粘贴 Token');
  if (!token) return;
  console.log('正在验证 Token...');
  const pf = await fetchProfile(token);
  if (!pf.ok) {
    console.log((pf.auth ? 'Token 无效或已过期：' : 'Token 验证失败：') + (pf.msg || '请检查网络或 Token'));
    await pause();
    return;
  }
  const cfg = loadConfig();
  const exists = findAccountIndex(cfg, { userId: pf.userId, token });
  const defaultName = (exists >= 0 && cfg.accounts[exists].nickName) || pf.nickName || 'Token账号';
  const finalName = exists >= 0 && cfg.accounts[exists].nickName ? cfg.accounts[exists].nickName : await askRemark(defaultName);
  const r = upsertAccount(cfg, { token, userId: pf.userId, nickName: finalName });
  saveConfig(cfg);
  console.log(`${r.added ? '已添加账号' : '已更新账号'}：${finalName}`);
  log(`Token 登录成功：${finalName}`);
  toast('极核账号已保存', finalName);
  await pause();
}

async function updateTokenFlow(cfg, idx) {
  const token = await readTokenInput('粘贴新的 Token');
  if (!token) return;
  console.log('正在验证 Token...');
  const pf = await fetchProfile(token);
  if (!pf.ok) {
    console.log((pf.auth ? 'Token 无效或已过期：' : 'Token 验证失败：') + (pf.msg || '请检查网络或 Token'));
    await pause();
    return;
  }
  const acc = cfg.accounts[idx];
  if (pf.userId && acc.userId && String(pf.userId) !== String(acc.userId)) {
    const sure = (await ask(`该 Token 属于「${pf.nickName || pf.userId}」，与当前账号不同，仍要覆盖？(y/N): `)).toLowerCase();
    if (sure !== 'y' && sure !== 'yes') return;
  }
  acc.token = token;
  acc.userId = pf.userId || acc.userId;
  acc.nickName = acc.nickName || pf.nickName;
  acc.status = 'normal';
  acc.tokenUpdatedAt = nowStr();
  saveConfig(cfg);
  console.log('Token 已更新。');
  log(`Token 已更新：${acc.nickName || maskPhone(acc.phone) || acc.userId}`);
  await pause();
}

async function checkAllTokens() {
  const cfg = loadConfig();
  const list = cfg.accounts.filter((a) => a.enabled);
  if (!list.length) {
    console.log('没有可检测的账号。');
    await pause();
    return;
  }
  console.log('\n正在检测 Token...');
  const expired = [];
  for (const a of list) {
    const name = accountLabel(a, cfg.accounts.indexOf(a));
    const token = cleanToken(a.token);
    if (!token) {
      a.status = 'expired';
      expired.push(name);
      console.log(`  ${name}：缺少 Token`);
      continue;
    }
    const bi = await fetchProfile(token);
    if (bi.ok) {
      a.status = 'normal';
      a.userId = bi.userId || a.userId;
      a.nickName = a.nickName || bi.nickName;
      console.log(`  ${name}：正常`);
    } else if (bi.auth) {
      a.status = 'expired';
      expired.push(name);
      console.log(`  ${name}：Token 已过期`);
    } else {
      console.log(`  ${name}：检测失败（${bi.msg || '网络异常'}）`);
    }
  }
  saveConfig(cfg);
  if (expired.length) toast('极核 Token 已过期', expired.join('、') + '，请重新登录');
  console.log(expired.length ? `\n发现 ${expired.length} 个账号 Token 已过期。` : '\n所有账号 Token 正常。');
  await pause();
}

async function pickAccountIndex(cfg, action) {
  if (!cfg.accounts.length) {
    console.log('暂无账号，请先添加。');
    await pause();
    return -1;
  }
  const input = (await ask(`输入要${action}的账号序号（回车取消）: `)).trim();
  if (!input) return -1;
  const idx = parseInt(input, 10) - 1;
  if (!(idx >= 0 && idx < cfg.accounts.length)) {
    console.log('账号序号无效。');
    await pause();
    return -1;
  }
  return idx;
}

async function modifyNicknameFlow(cfg, idx) {
  const acc = cfg.accounts[idx];
  const current = acc.nickName || accountLabel(acc, idx);
  console.log(`当前昵称：${current}`);
  const v = (await ask('输入新的备注昵称（仅本工具显示，回车取消）: ')).trim();
  if (!v) return;
  acc.nickName = v;
  saveConfig(cfg);
  console.log('昵称已修改为：' + v);
  log(`账号昵称已修改：${current} -> ${v}`);
  await pause();
}

async function deleteAccountFlow(cfg, idx) {
  const acc = cfg.accounts[idx];
  const label = accountLabel(acc, idx);
  const sure = (await ask(`确认删除账号「${label}」？输入 y 确认: `)).trim().toLowerCase();
  if (sure !== 'y' && sure !== 'yes') return;
  cfg.accounts.splice(idx, 1);
  saveConfig(cfg);
  console.log(`已删除账号：${label}`);
  log(`已删除账号：${label}`);
  await pause();
}

async function toggleAccountFlow(cfg, idx) {
  const acc = cfg.accounts[idx];
  acc.enabled = !acc.enabled;
  saveConfig(cfg);
  console.log(`已${acc.enabled ? '启用' : '停用'}账号：${accountLabel(acc, idx)}`);
  await pause();
}

async function manageAccounts() {
  while (true) {
    const cfg = loadConfig();
    console.log('\n---------------- 账号管理 ----------------');
    if (cfg.accounts.length) {
      cfg.accounts.forEach((a, i) => {
        const last = a.lastSignDate ? `上次签到 ${a.lastSignDate.slice(5)}` : '尚未签到';
        console.log(` [${i + 1}] ${accountLabel(a, i)}  ${maskPhone(a.phone) ? maskPhone(a.phone) + '  ' : ''}${accountStatusText(a)}  ${last}`);
      });
    } else {
      console.log('暂无账号，请先添加。');
    }
    console.log('------------------------------------------');
    console.log(' 1. 添加账号（手机号验证码登录）');
    console.log(' 2. 添加账号（粘贴 Token）');
    console.log(' 3. 修改昵称');
    console.log(' 4. 删除账号');
    console.log(' 5. 启用 / 停用账号');
    console.log(' 6. 更新 Token');
    console.log(' 7. 检测全部 Token');
    console.log(' 0. 返回');
    const op = (await ask('请选择: ')).trim();
    if (!op || op === '0') return;

    if (op === '1') {
      await phoneLoginFlow();
    } else if (op === '2') {
      await tokenLoginFlow();
    } else if (op === '3') {
      const idx = await pickAccountIndex(cfg, '修改昵称');
      if (idx >= 0) await modifyNicknameFlow(cfg, idx);
    } else if (op === '4') {
      const idx = await pickAccountIndex(cfg, '删除');
      if (idx >= 0) await deleteAccountFlow(cfg, idx);
    } else if (op === '5') {
      const idx = await pickAccountIndex(cfg, '启用/停用');
      if (idx >= 0) await toggleAccountFlow(cfg, idx);
    } else if (op === '6') {
      const idx = await pickAccountIndex(cfg, '更新 Token');
      if (idx >= 0) await updateTokenFlow(cfg, idx);
    } else if (op === '7') {
      await checkAllTokens();
    }
  }
}

// ------------------------------------------------------------------
// 时间 / 自启 / 守护
// ------------------------------------------------------------------
async function setSignTime() {
  const cfg = loadConfig();
  console.log(`当前签到时间：每天 ${cfg.signTime}`);
  const v = (await ask('输入新的签到时间（HH:mm，回车取消）: ')).trim();
  if (!v) return;
  const m = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) {
    console.log('时间格式不正确，示例：08:00');
    await pause();
    return;
  }
  cfg.signTime = `${pad2(Number(m[1]))}:${m[2]}`;
  saveConfig(cfg);
  console.log('签到时间已设置为每天 ' + cfg.signTime + '（守护进程会自动读取新时间）。');
  log('签到时间已设置为 ' + cfg.signTime);
  await pause();
}

function startupDir() {
  const base = process.env.APPDATA;
  if (!base) return null;
  return path.join(base, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}
function startupCmdPath() {
  const dir = startupDir();
  return dir ? path.join(dir, '极核签到守护.cmd') : null;
}
function startupLegacyVbsPath() {
  const dir = startupDir();
  return dir ? path.join(dir, '极核签到守护.vbs') : null;
}
function isAutostartOn() {
  const cmd = startupCmdPath();
  const vbs = startupLegacyVbsPath();
  return !!((cmd && fs.existsSync(cmd)) || (vbs && fs.existsSync(vbs)));
}
function writeStartupCmd() {
  const f = startupCmdPath();
  if (!f) return false;
  const nodePath = process.execPath;
  const scriptPath = path.join(APP_DIR, 'zeeho.js');
  if (!fs.existsSync(scriptPath)) return false;
  const content =
    '@echo off\r\n' +
    'chcp 65001 >nul\r\n' +
    `cd /d "${APP_DIR}"\r\n` +
    `start "" /min "${nodePath}" "${scriptPath}" daemon\r\n`;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content, 'utf8');
  return true;
}
function setAutostart(on) {
  const dir = startupDir();
  if (!dir) {
    console.log('无法获取启动目录（APPDATA 缺失）。');
    return false;
  }
  const cmd = startupCmdPath();
  const vbs = startupLegacyVbsPath();
  if (on) {
    if (!writeStartupCmd()) {
      console.log('未找到 zeeho.js，无法设置自启动。');
      return false;
    }
    if (vbs && fs.existsSync(vbs)) {
      try {
        fs.unlinkSync(vbs);
      } catch (e) {}
    }
    return true;
  }
  let ok = true;
  for (const f of [cmd, vbs]) {
    if (f && fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch (e) {
        ok = false;
      }
    }
  }
  return ok;
}
// 旧版使用隐藏 VBS 自启动，容易被杀软误报；启动时自动迁移为普通启动脚本
function migrateAutostart() {
  const vbs = startupLegacyVbsPath();
  if (!vbs || !fs.existsSync(vbs)) return;
  const cmd = startupCmdPath();
  try {
    if (cmd && !fs.existsSync(cmd)) writeStartupCmd();
    fs.unlinkSync(vbs);
  } catch (e) {}
}

function readAliveDaemonPid() {
  let pid = 0;
  try {
    pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10) || 0;
  } catch (e) {
    return 0;
  }
  if (!pid) return 0;
  try {
    process.kill(pid, 0);
    return pid;
  } catch (e) {
    return e.code === 'EPERM' ? pid : 0;
  }
}
async function startDaemonDetached() {
  if (readAliveDaemonPid()) return { ok: false, msg: '守护进程已在运行' };
  const child = spawn(process.execPath, [path.join(APP_DIR, 'zeeho.js'), 'daemon'], {
    cwd: APP_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  await sleep(1200);
  const pid = readAliveDaemonPid();
  return pid ? { ok: true, pid } : { ok: false, msg: '启动失败，可在命令行运行 node zeeho.js daemon 查看原因' };
}
function stopDaemon() {
  const pid = readAliveDaemonPid();
  if (!pid) {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {}
    return false;
  }
  try {
    process.kill(pid);
  } catch (e) {}
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
  return true;
}

function cleanupLock() {
  try {
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
    if (pid === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
}

async function runDaemon() {
  migrateAutostart();
  const running = readAliveDaemonPid();
  if (running && running !== process.pid) {
    log(`守护进程已在运行（PID ${running}），本次退出。`);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(process.pid));

  const initial = loadConfig();
  if (!initial.accounts.some((a) => a.enabled)) {
    log('没有启用中的账号，守护进程退出。请先在控制台添加账号。');
    cleanupLock();
    return;
  }

  process.title = 'ZEEHO签到守护';
  log(`守护进程已启动（PID ${process.pid}），签到时间 ${initial.signTime}，账号 ${initial.accounts.filter((a) => a.enabled).length} 个`);
  console.log(`守护运行中：每天 ${initial.signTime} 自动签到。关闭窗口或按 Ctrl+C 退出。`);

  let busy = false;
  let lastAttemptDate = '';
  const tick = async () => {
    if (busy) return;
    const cfg = loadConfig();
    if (!cfg.accounts.some((a) => a.enabled)) return;
    if (cfg.lastRunDate === todayStr() || lastAttemptDate === todayStr()) return;
    if (nowHHmm() < cfg.signTime) return;
    busy = true;
    lastAttemptDate = todayStr();
    try {
      await runAll('定时');
    } catch (e) {
      log('定时签到异常：' + ((e && e.message) || e));
      toast('极核签到异常', String((e && e.message) || e).slice(0, 180));
    } finally {
      busy = false;
    }
  };

  process.on('SIGINT', () => {
    log('守护进程已停止。');
    cleanupLock();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupLock();
    process.exit(0);
  });
  process.on('exit', cleanupLock);

  await tick();
  setInterval(tick, 15000);

  // 后台守护每天检查一次新版本（不阻塞签到）
  maybeAutoCheckUpdate().catch(() => {});
  setInterval(() => {
    maybeAutoCheckUpdate().catch(() => {});
  }, 6 * 3600 * 1000);
}

// ------------------------------------------------------------------
// 交互菜单
// ------------------------------------------------------------------
let rl = null;
let pendingLines = [];
let pendingResolve = null;
// 开启当前控制台的快速编辑模式，使窗口内右键可直接粘贴
function enableQuickEdit() {
  if (process.platform !== 'win32' || !process.stdout.isTTY) return;
  try {
    const ps = [
      'Add-Type -Namespace ZeehoConsole -Name Native -MemberDefinition \'[DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr GetStdHandle(int n);[DllImport("kernel32.dll",SetLastError=true)]public static extern bool GetConsoleMode(IntPtr h,out uint m);[DllImport("kernel32.dll",SetLastError=true)]public static extern bool SetConsoleMode(IntPtr h,uint m);\'',
      '$h=[ZeehoConsole.Native]::GetStdHandle(-10);$m=[uint32]0;[void][ZeehoConsole.Native]::GetConsoleMode($h,[ref]$m);[void][ZeehoConsole.Native]::SetConsoleMode($h,($m -bor 0x40 -bor 0x80))'
    ].join('; ');
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 8000
    });
  } catch (e) {
    /* 启用失败时，仍可通过窗口右键菜单粘贴 */
  }
}
function createRL() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    const v = String(line || '').trim();
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(v);
    } else {
      pendingLines.push(v);
    }
  });
  rl.on('close', () => {
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve('');
    }
  });
}
function ask(q) {
  return new Promise((resolve) => {
    if (!rl) {
      resolve('');
      return;
    }
    process.stdout.write(q);
    if (pendingLines.length) resolve(pendingLines.shift());
    else pendingResolve = resolve;
  });
}
async function pause(msg = '按回车返回...') {
  await ask(msg);
}

function printHeader() {
  const cfg = loadConfig();
  const pid = readAliveDaemonPid();
  const normal = cfg.accounts.filter((a) => a.enabled && a.status !== 'expired').length;
  const expired = cfg.accounts.filter((a) => a.enabled && a.status === 'expired').length;
  const disabled = cfg.accounts.filter((a) => !a.enabled).length;
  const todayDone = cfg.lastRunDate === todayStr();
  const us = loadUpdateState();
  const pending = !!(us.downloadedVersion && compareVersion(us.downloadedVersion, VERSION) > 0);
  const latestCmp = us.latestVersion ? compareVersion(us.latestVersion, VERSION) : null;
  const latestText = us.latestVersion
    ? `v${us.latestVersion}${pending ? '（已下载，重启生效）' : latestCmp > 0 ? '（可更新）' : latestCmp === 0 ? '（已是最新）' : ''}`
    : '未检测';
  console.log('\n============================================================');
  console.log('        极核 ZEEHO · 每日签到（精简控制台版）');
  console.log('============================================================');
  console.log(` 程序版本   : v${VERSION}${pending ? `（已下载 v${us.downloadedVersion}）` : ''}`);
  console.log(` 最新版本   : ${latestText}`);
  console.log(` 签到时间   : 每天 ${cfg.signTime}`);
  console.log(` 后台守护   : ${pid ? `运行中（PID ${pid}）` : '未运行'}`);
  console.log(` 开机自启动 : ${isAutostartOn() ? '已开启' : '未开启'}`);
  console.log(` 账号       : 共 ${cfg.accounts.length} 个（正常 ${normal} / 过期 ${expired} / 停用 ${disabled}）`);
  console.log(` 今日状态   : ${todayDone ? `已执行（${cfg.lastRunTime || ''}）` : '未执行'}`);
  console.log('------------------------------------------------------------');
}

async function menu() {
  migrateAutostart();
  enableQuickEdit();
  await maybeAutoCheckUpdate();
  createRL();
  rl.on('SIGINT', () => {
    console.log('\n已退出。');
    process.exit(0);
  });

  while (true) {
    printHeader();
    console.log(' 1. 立即签到 + 动态任务（发帖/点赞/分享/删除）');
    console.log(' 2. 账号管理（添加 / 删除 / 修改昵称）');
    console.log(' 3. 设置每天签到时间');
    console.log(' 4. 开启 / 关闭开机自启动');
    console.log(' 5. 开启 / 关闭后台守护');
    console.log(' 6. 检查更新');
    console.log(' 7. 查看最近日志');
    console.log(' 0. 退出');
    console.log('------------------------------------------------------------');
    const choice = (await ask('请选择: ')).trim();

    try {
      if (choice === '1') {
        await runAll('手动');
        await pause();
      } else if (choice === '2') {
        await manageAccounts();
      } else if (choice === '3') {
        await setSignTime();
      } else if (choice === '4') {
        const on = !isAutostartOn();
        if (setAutostart(on)) {
          console.log('开机自启动已' + (on ? '开启' : '关闭') + '。');
          log('开机自启动已' + (on ? '开启' : '关闭'));
        }
        await pause();
      } else if (choice === '5') {
        if (readAliveDaemonPid()) {
          const sure = (await ask('确认停止后台守护？输入 y 确认: ')).trim().toLowerCase();
          if (sure === 'y' && stopDaemon()) {
            console.log('后台守护已停止。');
            log('后台守护已停止');
          }
        } else {
          const r = await startDaemonDetached();
          console.log(r.ok ? `后台守护已启动（PID ${r.pid}）。` : r.msg);
        }
        await pause();
      } else if (choice === '6') {
        await checkForUpdate({ manual: true });
        await pause();
      } else if (choice === '7') {
        console.log('\n---------------- 最近日志 ----------------');
        try {
          const lines = fs.readFileSync(LOG_FILE, 'utf8').split(/\r?\n/).filter(Boolean).slice(-30);
          console.log(lines.length ? lines.join('\n') : '暂无日志');
        } catch (e) {
          console.log('暂无日志');
        }
        await pause();
      } else if (choice === '0') {
        console.log('已退出。');
        process.exit(0);
      }
    } catch (e) {
      console.log('操作异常：' + ((e && e.message) || e));
      await pause();
    }
  }
}

// ------------------------------------------------------------------
// 入口
// ------------------------------------------------------------------
async function main() {
  const cmd = String(process.argv[2] || '').toLowerCase();
  if (cmd === 'daemon') {
    await runDaemon();
    return;
  }
  if (cmd === 'sign') {
    await runAll('命令行');
    return;
  }
  if (cmd === 'list') {
    const cfg = loadConfig();
    if (!cfg.accounts.length) {
      console.log('暂无账号');
      return;
    }
    cfg.accounts.forEach((a, i) => {
      console.log(`[${i + 1}] ${accountLabel(a, i)}  ${maskPhone(a.phone)}  ${accountStatusText(a)}  ${a.lastSignDate || '尚未签到'}`);
    });
    return;
  }
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    console.log('用法：');
    console.log('  双击「极核签到.cmd」进入菜单');
    console.log('  node zeeho.js sign     立即签到一次');
    console.log('  node zeeho.js daemon   后台守护（定时签到）');
    console.log('  node zeeho.js list     查看账号');
    return;
  }
  await menu();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('程序异常：' + ((e && e.stack) || e));
    process.exitCode = 1;
  });
}

module.exports = { VERSION, getSign, gatewaySign, authHeaders, apiBaseInfo, fetchProfile, apiSignInfo, apiSign, signAccount, loadConfig, setAutostart, isAutostartOn, migrateAutostart, socialHeaders, appQueryGetHeaders, httpGet, httpPost, httpPut, httpDelete, runCommunityTasks, compareVersion, checkForUpdate, maybeAutoCheckUpdate, loadUpdateState };
