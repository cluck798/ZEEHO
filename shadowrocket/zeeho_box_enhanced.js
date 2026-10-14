/*
#!name=极核 ZEEHO 签到面板 V2.16.7
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.16.7

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.7, requires-body=true, timeout=60, tag=极核面板V2.16.7

# 极核Token自动捕获（打开极核App-我的页面）
http-response ^https:\/\/tapi\.zeehoev\.com\/v1\.0\/mine\/cfmotoservermine\/setting script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho.js, requires-body=true, timeout=30, tag=极核抓Token

# 极核每日签到（每天7点）
cron "0 7 * * *" script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho.js, timeout=120, tag=极核每日签到


[MITM]
hostname = tapi.zeehoev.com, h5.zeehoev.com, zeeho.box

====================================
⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
 */

const $ = new Env("极核看板增强版");

// ========== 极核 ZEEHO 签到面板脚本 ==========
// 版本: v2.16.7
// 更新日期: 2026-10-14
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.16.7";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-10-14 v2.16.7 签到与盲盒修复：盲盒改走官方 POST /H5/signin/lottery?dateTime=<开盒日>（旧实现误用补签接口 supplementPrize → 40005 无效操作），开盒日以 info.signPrizeDate 为准；签到日历查询加 3 次退避重试（07:00 并发 WAF 瞬断导致误报 签到+0/连签0天）；连签天数以官方 GET /H5/signin 直出值为准；HTML 直连通道签到路径补迁 /H5/ 且 POST 签名含 body；v2.16.6 电池设置每车独立保存（旧数据自动迁移到当前车辆）+ 首页卡片显示充电剩余时间；v2.16.5 充电剩余时间：车辆页新增「电池设置」（容量Ah/满电V），充电中按 容量×(100−电量%)/100÷充电电流 估算剩余时间，并与官方 fullChargeTime 对照显示；新增 /api/battery-state 接口；充电功率 1200 档文案修正为「无限制」（下发值不变）；三端 Release 说明增加北京时间更新时间；v2.16.4 补签路径修复：consume/gain（补签、积分兑换）改走官方新路径 /cfmotoservermine/H5/signInSupplement（旧路径被 WAF 拦为 430/30125 permit error，实测 consume 旧路径 30125 → 新路径业务码）；v2.16.3 补签修复：POST /count 需将 body「{}」纳入签名（此前 430/30121，补签卡数量/补签报错）；抓取脚本 v2.5.2（Token 剥 Bearer、同 userId 只更新不新增、保留 barkKey）；面板账号读写自动归一（去 Bearer + 同 ID 合并自愈）；v2.16.2 版本检测加固：双源（raw+jsDelivr）并发取最高版本号，避免 jsDelivr 最长 12h 缓存导致「检查更新」误判已是最新；v2.16.1 修复「扫描轨迹」：ridetrack_v2 必须带 startTime=YYYY-MM（缺失时服务端恒返回空数组，HAR 实证），支持按历史月份扫描，行程明细增加起终点/服务端急加速/轨迹缩略图；v2.16.0 新增「骑行」页：隐藏骑行数据（极速/急加速/急刹/压弯，轨迹重算算法移植自 Zeeho SpeedHunter）；修复服务端对「带 query 的 GET」收紧导致的 430/30121（胎压/首页骑行/车况/积分明细/社区回查/轨迹扫描统一改 query 入签 + 官方格式随机 UA）；v2.15.6 H5 通道密钥/接口迁移 + 软件版本检测；v2.15.5 面板首屏提速)`);

// 面板入口域名：Loon 用虚拟域名 zeeho.box（Loon 可虚拟劫持不存在的域名），
// QX 必须用真实可解析域名（默认 www.example.com，IANA 保留域名保证可解析）。
// 从当前请求自动推断，面板内绝对链接统一用 PANEL_HOST。
let PANEL_HOST = "http://zeeho.box";

// ========== 设备指纹修复（官方 App 被风控拉黑时自救） ==========
// 背景：本模块早期版本把请求 UA 固定为同一台"设备"（含固定设备 UUID），该指纹被极核风控标记后，
// 服务端对整套指纹返回 430 {"code":"31001","message":"非法的请求"}。若该指纹正好来自你自己的抓包，
// 你的官方 App 发出同一指纹也会一起被拒（表现为官方 App 大面积报错）。
// 这里在放行官方 App 请求前检测被拉黑的指纹，命中则把 user-agent / x-app-info 换成一份"仅本机生成一次"的
// 新指纹（请求签名不含 UA，不影响 cfmoto-x-sign）；正常设备不受影响。
const BURNED_DEVICE_MARK = "DC0C4906-A4A8-4866-9432-B31E1E252D53";  // 已被服务端拉黑的固定设备 UUID（历史模板）
function repairBurnedDevice(headers) {
  try {
    let ua = "", xapp = "";
    Object.keys(headers || {}).forEach(function(k) {
      const lk = String(k).toLowerCase();
      if (lk === "user-agent") ua = String(headers[k] || "");
      if (lk === "x-app-info") xapp = String(headers[k] || "");
    });
    if (ua.indexOf(BURNED_DEVICE_MARK) < 0 && xapp.indexOf(BURNED_DEVICE_MARK) < 0) return null;
    // 修复指纹：生成一次后写入持久化，同一台设备保持一致（避免"每次请求换设备"的会话异常）
    let fix = null;
    try { fix = JSON.parse($persistentStore.read("zeeho_fix_device_ua") || "null"); } catch(e) {}
    if (!fix || !fix.ua) {
      const models = [["iPhone 15", "1179*2556"], ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"], ["iPhone 14", "1170*2532"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 13", "1170*2532"], ["iPhone 12", "1170*2532"], ["iPhone 11", "828*1792"]];
      const vers = ["17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];
      const m = models[Math.floor(Math.random() * models.length)];
      const v = vers[Math.floor(Math.random() * vers.length)];
      let hex = ""; const H = "0123456789ABCDEF";
      for (let i = 0; i < 32; i++) hex += H[Math.floor(Math.random() * 16)];
      const uuid = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
      fix = { ua: "MOBILE|iOS|" + v + "|ZEEHO_APP|3.0.5|iPhone|" + m[0] + "|" + m[1] + "|" + uuid + "|" + (/WiFi/.test(ua) ? "WiFi" : "WWAN") + "|iOS" };
      try { $persistentStore.write(JSON.stringify(fix), "zeeho_fix_device_ua"); } catch(e) {}
      console.log("[极核修复] 命中被拉黑设备指纹，已生成新指纹: " + m[0] + " / iOS " + v);
    }
    const out = {};
    Object.keys(headers || {}).forEach(function(k) {
      const lk = String(k).toLowerCase();
      out[k] = (lk === "user-agent" || lk === "x-app-info") ? fix.ua : headers[k];
    });
    return out;
  } catch(e) { return null; }
}

// ========== 自动捕获 appId/appSecret ==========
// 匹配规则需同时覆盖 zeeho.box 和极核API：^https?://(zeeho\\.box|.*zeehoev\\.com)/.*
// 打开极核App时，API请求被拦截 → 自动提取appId保存 → 放行请求（放行前会做设备指纹修复检查）
(async function autoCapture() {
  try {
    const url = $request.url;


    // 只处理极核API请求（zeehoev.com），zeeho.box 走面板逻辑
    if (!url.includes('zeehoev.com')) return;
    
    const headers = $request.headers;
    const param = headers['cfmoto-x-param'] || headers['Cfmoto-X-Param'] || headers['CFMOTO-X-PARAM'] || '';
    const match = param.match(/appId=([^&]+)/i);
    
    if (match) {
      const appId = match[1];
      const type = url.includes('h5.zeehoev.com') ? 'h5' : 'app';
      const typeName = type === 'h5' ? 'H5端' : 'App端';
      
      // 已知的 appSecret（无法从请求自动捕获，需手动配置）
      // v2.15.6：H5 通道轮换为新 appId（AiTXmBrm）；旧 Sw5F9uJi 已失效（430 permit error）
      const knownSecrets = {
        'AiTXmBrm': '70c2c7458ab88ca9504ad0521f170075bc91f2f7',
        'Sw5F9uJi': '46870a8f678a09109468f5b0168818b91c292845',
        'S7qPWPU1': 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d'
      };
      const appSecret = knownSecrets[appId] || '';
      
      // 保存到 $persistentStore
      const idKey = type === 'h5' ? 'zeeho_h5_appId' : 'zeeho_app_appId';
      const secretKey = type === 'h5' ? 'zeeho_h5_appSecret' : 'zeeho_app_appSecret';
      const savedId = $persistentStore.read(idKey);
      
      if (savedId !== appId) {
        $persistentStore.write(appId, idKey);
        if (appSecret) $persistentStore.write(appSecret, secretKey);
        console.log('[极核捕获] ' + typeName + ' appId已保存: ' + appId);
      }
    }
    
    // 设备指纹修复：官方 App 若携带已被拉黑的指纹（本模块历史模板），换成新的本机指纹后再放行
    const fixedHeaders = repairBurnedDevice(headers);
    if (fixedHeaders) {
      $done({ headers: fixedHeaders });
      return true; // 标记已处理，阻止后续面板逻辑执行
    }

    // ⚠️ 关键：捕获完成后必须放行请求，否则极核App会卡住
    $done({});
    return true; // 标记已处理，阻止后续面板逻辑执行
  } catch(e) {
    console.log('[极核捕获] 异常:', e);
    $done({});
    return true;
  }
})();


// ========== 存储键名 ==========
const CK_CONFIG = "zeeho_config";
const CK_DATA = "zeeho_data";
const CK_LOGS = "zeeho_logs";

// ========== 默认配置 ==========
// 看板自动刷新间隔(秒)规范化：最小15秒、最大3600秒，0/非法/缺失一律回退60秒，避免配置成0导致疯狂刷新
function normalizeRefreshSec(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 60;
  return Math.max(15, Math.min(3600, Math.round(n)));
}
const DEFAULT_CONFIG = {
  app: { appId: "S7qPWPU1", appSecret: "c5e0da7f4da28df805694ec3dd1fc6792e9df99d" },
  // v2.15.6：H5 通道密钥轮换（服务端换发，旧值一律 430 permit error）
  h5:  { appId: "AiTXmBrm", appSecret: "70c2c7458ab88ca9504ad0521f170075bc91f2f7" },
  community: { enablePost: true, enableLike: true, enableComment: true, enableShare: true, enableDelete: true },
  vehicleAesKey: "ce2cd7cb57124c1349dd8543bf6fd31d", // 云端开/关锁AES-256-ECB密钥(32位)。已内置默认密钥，可在配置页修改
  vehicleControlRisk: "", // 车控风险确认：需在设置页填写「我自愿承担相关风险」并保存后才能使用车控功能
  autoRefreshSec: 60 // 看板首页自动刷新间隔(秒)，配置页可改；规范化见 normalizeRefreshSec
};

// ========== v2.15.6 H5 通道密钥强制迁移 ==========
// 服务端换发新 appId/appSecret，旧值（Sw5F9uJi 等）一律 430 permit error。
// 历史配置（CK_CONFIG / persistentStore / 默认值）在首次运行时统一迁移到新密钥；
// 迁移后仍可在配置页手动修改（__h5CredVer 标记保证不会被反复覆盖，除非再次升级凭据版本）。
const H5_CRED_VERSION = "2.15.6";
const H5_FIXED_CRED = { appId: "AiTXmBrm", appSecret: "70c2c7458ab88ca9504ad0521f170075bc91f2f7" };
function h5Fix(c, storeH5) {
  if (c && c.__h5CredVer !== H5_CRED_VERSION) {
    c.h5 = { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret };
    c.__h5CredVer = H5_CRED_VERSION;
    try { $.setdata(JSON.stringify(c), CK_CONFIG); } catch(e) {}
    console.log('[H5密钥迁移] 已强制更换为新 appId: ' + H5_FIXED_CRED.appId);
  }
  if (c && c.h5 && c.h5.appId) return { appId: c.h5.appId, appSecret: c.h5.appSecret || H5_FIXED_CRED.appSecret };
  // 无看板配置：捕获值已失效，直接用固定新密钥
  return { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret };
}

// ========== 版本信息 ==========
// ========== 配置读写 ==========
function getConfig() {
  // 从捕获脚本保存的 $persistentStore 读取（zeeho_h5_appId / zeeho_app_appId）
  let storeApp = { appId: '', appSecret: '' };
  let storeH5 = { appId: '', appSecret: '' };
  try {
    storeApp.appId = $persistentStore.read('zeeho_app_appId') || '';
    storeApp.appSecret = $persistentStore.read('zeeho_app_appSecret') || '';
    storeH5.appId = $persistentStore.read('zeeho_h5_appId') || '';
    storeH5.appSecret = $persistentStore.read('zeeho_h5_appSecret') || '';
  } catch(e) {}
  try {
    const raw = $.getdata(CK_CONFIG);
    if (raw) {
      const c = JSON.parse(raw);
      return {
        // 优先级：看板配置 > 捕获脚本 > 默认值
        app: { appId: c.app?.appId || storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: c.app?.appSecret || storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
        h5: h5Fix(c, storeH5),
        community: { enablePost: c.community?.enablePost !== false, enableLike: c.community?.enableLike !== false, enableComment: c.community?.enableComment !== false, enableShare: c.community?.enableShare !== false, enableDelete: c.community?.enableDelete !== false },
        vehicleAesKey: ((typeof c.vehicleAesKey === "string" ? c.vehicleAesKey : "").trim() || DEFAULT_CONFIG.vehicleAesKey),
        vehicleControlRisk: (typeof c.vehicleControlRisk === "string" ? c.vehicleControlRisk : "").trim(),
        autoRefreshSec: normalizeRefreshSec(c.autoRefreshSec),
        basicAuth: (typeof c.basicAuth === "string" ? c.basicAuth : "").trim(),
        vehicleMonitor: c.vehicleMonitor === true,
        autoSignin: c.autoSignin === true,
        autoSigninTime: (typeof c.autoSigninTime === "string" && /^\d{1,2}:\d{2}$/.test(c.autoSigninTime) ? c.autoSigninTime : "07:00"),
        widgetVehicle: (typeof c.widgetVehicle === "string" ? c.widgetVehicle : "")
      };
    }
  } catch(e) {}
  // 看板无配置时，使用捕获脚本配置 + 默认值（H5 密钥固定为新值：捕获值已失效）
  return {
    app: { appId: storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
    h5:  { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret },
    community: JSON.parse(JSON.stringify(DEFAULT_CONFIG.community)),
    vehicleAesKey: DEFAULT_CONFIG.vehicleAesKey,
    vehicleControlRisk: "",
    autoRefreshSec: 60,
    basicAuth: "",
    vehicleMonitor: false,
    autoSignin: false,
    autoSigninTime: "07:00",
    widgetVehicle: ""
  };
}
function saveConfig(cfg) {
  try { $.setdata(JSON.stringify(cfg), CK_CONFIG); return true; } catch(e) { return false; }
}

// ========== 账号读写 ==========
// v2.16.3 账号归一：①token 统一剥离 Bearer 前缀；②同一 userId 合并为一条。
// 背景：抓取脚本(script/zeeho.js)与面板双写 zeeho_data，历史版本抓取把「Bearer xxx」原样入库，
// 且同人条目可能重复；此处在读/写两侧自愈（合并时保留先前的非空 barkKey，token/昵称取较新值）。
function normalizeAccounts(list) {
  const out = [];
  const byId = new Map();
  for (const a0 of (Array.isArray(list) ? list : [])) {
    if (!a0 || typeof a0 !== "object") continue;
    const a = Object.assign({}, a0, { token: cleanToken(a0.token || "") });
    const uid = String(a.userId || "").trim();
    if (uid && byId.has(uid)) {
      const old = byId.get(uid);
      Object.assign(old, a, { barkKey: old.barkKey || a.barkKey || "" });
    } else {
      out.push(a);
      if (uid) byId.set(uid, a);
    }
  }
  return out;
}
function getAccounts() {
  try {
    const raw = $.getdata(CK_DATA);
    if (raw) {
      const arr = JSON.parse(raw);
      return normalizeAccounts(Array.isArray(arr) ? arr : [arr]);
    }
  } catch(e) {}
  return [];
}
function saveAccounts(list) {
  try { $.setdata(JSON.stringify(normalizeAccounts(list)), CK_DATA); return true; } catch(e) { return false; }
}

// ========== 运行日志 ==========
function getLogs() {
  try {
    const raw = $.getdata(CK_LOGS);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch(e) {}
  return [];
}
function addLog(entry) {
  try {
    const logs = getLogs();
    logs.unshift(entry);
    if (logs.length > 50) logs.length = 50;
    $.setdata(JSON.stringify(logs), CK_LOGS);
    return true;
  } catch(e) { return false; }
}
function clearLogs() {
  try { $.setdata("[]", CK_LOGS); return true; } catch(e) { return false; }
}


// ========== 工具函数 ==========
function getUuid() {
  const p = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", c = "abcdef0123456789";
  let r = "";
  for (const ch of p) {
    if (ch === "x" || ch === "y") {
      const n = Math.floor(Math.random() * 16);
      r += (ch === "y" ? (n & 0x3) | 0x8 : n).toString(16);
    } else r += ch;
  }
  return r;
}
function getRandomChars(n = 16) {
  const c = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let r = ""; for (let i = 0; i < n; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r;
}
function toQuery(p = {}) {
  return Object.keys(p).filter(k => p[k] !== undefined && p[k] !== null).sort()
    .map(k => `${k}=${p[k]}`).join("&");
}
function cleanToken(t) {
  return String(t || "").trim().replace(/^[bB]earer\s+/i, "").replace(/[\s"'`]+/g, "");
}
// 清洗 Bark Key：官方完整链接 https://api.day.app/xxx 只保留 xxx；纯Key原样；自建服务器完整地址保留
function cleanBarkKey(k) {
  let s = String(k || "").trim().replace(/^[bB]ark\s*(key)?\s*[:：]\s*/i, "").replace(/[\s"'`]+/g, "").trim();
  s = s.replace(/^https?:\/\/api\.day\.app\//i, "");
  return s.replace(/\/+$/, "");
}
// 车架号脱敏：保留前3位+后4位，中间打码（默认不展示完整VIN，点击按钮才显示）
function maskVin(v) {
  const s = String(v || "");
  if (!s) return "";
  if (s.length <= 7) return "****";
  return s.substring(0, 3) + "****" + s.substring(s.length - 4);
}

// ========== md5 / sha1 ==========
function md5(t,e){function n(t,e){return t<<e|t>>>32-e}function r(t,e){var n,r,o,i,a;return o=2147483648&t,i=2147483648&e,a=(1073741823&t)+(1073741823&e),(n=1073741824&t)&(r=1073741824&e)?2147483648^a^o^i:n|r?1073741824&a?3221225472^a^o^i:1073741824^a^o^i:a^o^i}function o(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&e|~t&n}(e,o,i),a),c)),r(n(t,u),e)}function i(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&n|e&~n}(e,o,i),a),c)),r(n(t,u),e)}function a(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t^e^n}(e,o,i),a),c)),r(n(t,u),e)}function u(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return e^(t|~n)}(e,o,i),a),c)),r(n(t,u),e)}function c(t){var e,n="",r="";for(e=0;e<=3;e++)n+=(r="0"+(t>>>8*e&255).toString(16)).substr(r.length-2,2);return n}var s,l,f,p,d,h,v,y,g,m=Array();for(m=function(t){for(var e,n=t.length,r=n+8,o=16*((r-r%64)/64+1),i=Array(o-1),a=0,u=0;u<n;)a=u%4*8,i[e=(u-u%4)/4]=i[e]|t.charCodeAt(u)<<a,u++;return a=u%4*8,i[e=(u-u%4)/4]=i[e]|128<<a,i[o-2]=n<<3,i[o-1]=n>>>29,i}(t=function(t){t=t.replace(/\r\n/g,"\n");for(var e="",n=0;n<t.length;n++){var r=t.charCodeAt(n);r<128?e+=String.fromCharCode(r):r>127&&r<2048?(e+=String.fromCharCode(r>>6|192),e+=String.fromCharCode(63&r|128)):(e+=String.fromCharCode(r>>12|224),e+=String.fromCharCode(r>>6&63|128),e+=String.fromCharCode(63&r|128))}return e}(t)),h=1732584193,v=4023233417,y=2562383102,g=271733878,s=0;s<m.length;s+=16)l=h,f=v,p=y,d=g,h=o(h,v,y,g,m[s+0],7,3614090360),g=o(g,h,v,y,m[s+1],12,3905402710),y=o(y,g,h,v,m[s+2],17,606105819),v=o(v,y,g,h,m[s+3],22,3250441966),h=o(h,v,y,g,m[s+4],7,4118548399),g=o(g,h,v,y,m[s+5],12,1200080426),y=o(y,g,h,v,m[s+6],17,2821735955),v=o(v,y,g,h,m[s+7],22,4249261313),h=o(h,v,y,g,m[s+8],7,1770035416),g=o(g,h,v,y,m[s+9],12,2336552879),y=o(y,g,h,v,m[s+10],17,4294925233),v=o(v,y,g,h,m[s+11],22,2304563134),h=o(h,v,y,g,m[s+12],7,1804603682),g=o(g,h,v,y,m[s+13],12,4254626195),y=o(y,g,h,v,m[s+14],17,2792965006),h=i(h,v=o(v,y,g,h,m[s+15],22,1236535329),y,g,m[s+1],5,4129170786),g=i(g,h,v,y,m[s+6],9,3225465664),y=i(y,g,h,v,m[s+11],14,643717713),v=i(v,y,g,h,m[s+0],20,3921069994),h=i(h,v,y,g,m[s+5],5,3593408605),g=i(g,h,v,y,m[s+10],9,38016083),y=i(y,g,h,v,m[s+15],14,3634488961),v=i(v,y,g,h,m[s+4],20,3889429448),h=i(h,v,y,g,m[s+9],5,568446438),g=i(g,h,v,y,m[s+14],9,3275163606),y=i(y,g,h,v,m[s+3],14,4107603335),v=i(v,y,g,h,m[s+8],20,1163531501),h=i(h,v,y,g,m[s+13],5,2850285829),g=i(g,h,v,y,m[s+2],9,4243563512),y=i(y,g,h,v,m[s+7],14,1735328473),h=a(h,v=i(v,y,g,h,m[s+12],20,2368359562),y,g,m[s+5],4,4294588738),g=a(g,h,v,y,m[s+8],11,2272392833),y=a(y,g,h,v,m[s+11],16,1839030562),v=a(v,y,g,h,m[s+14],23,4259657740),h=a(h,v,y,g,m[s+1],4,2763975236),g=a(g,h,v,y,m[s+4],11,1272893353),y=a(y,g,h,v,m[s+7],16,4139469664),v=a(v,y,g,h,m[s+10],23,3200236656),h=a(h,v,y,g,m[s+13],4,681279174),g=a(g,h,v,y,m[s+0],11,3936430074),y=a(y,g,h,v,m[s+3],16,3572445317),v=a(v,y,g,h,m[s+6],23,76029189),h=a(h,v,y,g,m[s+9],4,3654602809),g=a(g,h,v,y,m[s+12],11,3873151461),y=a(y,g,h,v,m[s+15],16,530742520),h=u(h,v=a(v,y,g,h,m[s+2],23,3299628645),y,g,m[s+0],6,4096336452),g=u(g,h,v,y,m[s+7],10,1126891415),y=u(y,g,h,v,m[s+14],15,2878612391),v=u(v,y,g,h,m[s+5],21,4237533241),h=u(h,v,y,g,m[s+12],6,1700485571),g=u(g,h,v,y,m[s+3],10,2399980690),y=u(y,g,h,v,m[s+10],15,4293915773),v=u(v,y,g,h,m[s+1],21,2240044497),h=u(h,v,y,g,m[s+8],6,1873313359),g=u(g,h,v,y,m[s+15],10,4264355552),y=u(y,g,h,v,m[s+6],15,2734768916),v=u(v,y,g,h,m[s+13],21,1309151649),h=u(h,v,y,g,m[s+4],6,4149444226),g=u(g,h,v,y,m[s+11],10,3174756917),y=u(y,g,h,v,m[s+2],15,718787259),v=u(v,y,g,h,m[s+9],21,3951481745),h=r(h,l),v=r(v,f),y=r(y,p),g=r(g,d);return 32==e?(c(h)+c(v)+c(y)+c(g)).toLowerCase():(c(v)+c(y)).toLowerCase()}
function sha1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16)}return str};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j)}switch(msg_len%4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break}word_array.push(i);while((word_array.length%16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff}var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase()}

// ========== 签名函数（使用配置中的密钥） ==========
function getSign(type, params = {}, body = '', cfg) {
  const c = cfg || getConfig();
  const ac = c[type] || c.app;
  const query = toQuery(params);
  const timestamp = new Date().getTime();
  const nonce = type === "h5" ? getUuid() : timestamp + getRandomChars();
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
  const signature = type === "h5" ? `${query}${bodyStr}${param}${ac.appSecret}` : `${bodyStr}${param}${ac.appSecret}`;
  const sign = md5(sha1(signature), 32).toString();
  // 按官方App真实请求头同时下发：cfmoto-x-* 三件套 + 独立 timestamp/nonce/signature（signature 与 sign 同值，官方冗余发送）
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'signature': sign
  };
}

// H5 端含 body 签名：极核 loginByPhone 等接口必须把请求体纳入签名，
// 默认 getSign('h5') 不含 body，直接用于登录会返回 permit error。
function h5SignWithBody(body, cfg) {
  const c = cfg || getConfig();
  const ac = c.h5 || c.app;
  const timestamp = new Date().getTime();
  const nonce = getUuid();
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const sign = md5(sha1(bodyStr + param + ac.appSecret), 32).toString();
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'appId': ac.appId
  };
}

// App 网关完整签名（与 HomeAssistant zeeho 集成一致，手机号登录走 App 网关时使用）：
//  GET:  md5(sha1(scheme://host/path + "?" + query + param + secret))
//  POST: md5(sha1(query + body + param + secret))
// 经验（v2.14.4 修复登录"验证码有误或已过期"）：
//  ① 发码(authCode)与登录(loginByPhone)必须走同一网关(App)；H5 发码的码登录侧取不到；
//  ② loginByPhone 虽然是 POST，签名必须按 GET 风格（URL入签、body不入签），
//     用 POST 风格签名(query+body)会被服务端拒绝并返回"验证码有误或已过期"；
//  ③ nonce 与官方 App 一致：16位随机字符 + 毫秒时间戳。
function appGatewaySign(url, method, params = {}, body = '', cfg) {
  const c = cfg || getConfig();
  const ac = c.app || c.h5;
  const timestamp = new Date().getTime();
  const nonce = getRandomChars(16) + timestamp;
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const query = toQuery(params);
  let preSign = '';
  if (String(method).toUpperCase() === "GET") {
    const u = new URL(url);
    preSign = u.origin + u.pathname + (query ? "?" + query : "");
  } else {
    preSign = query + (body ? (typeof body === "string" ? body : JSON.stringify(body)) : "");
  }
  const sign = md5(sha1(preSign + param + ac.appSecret), 32).toString();
  return {
    'appId': ac.appId,
    'nonce': nonce,
    'timestamp': String(timestamp),
    'signature': sign,
    'Cfmoto-X-Param': param,
    'Cfmoto-X-Sign': sign,
    'Cfmoto-X-Sign-Type': '0'
  };
}

// ========== 社交写操作签名头（v2.14.11 修复发帖/点赞/评论 30121 permit error） ==========
// 2026-09-24 起服务端收紧：发帖/点赞/评论等 POST 必须带 appid 头走"新协议"通道，
// 签名公式 md5(sha1(query + body + param + secret))（POST 把 body 入签），
// 且必须携带官方客户端标识头，否则业务层返回 430 {"code":"30121","message":"permit error"}。
// 按官方 App 真实发帖抓包 1:1 复刻（HAR ground truth 离线验证 MATCH）。
// GET/PUT/DELETE（回查/分享/删除）走旧通道不受影响，仍用 baseHeaders + getSign。
// ========== 随机设备指纹（v2.15.2） ==========
// 背景：官方对写操作做风控。此前 UA 是所有人共用的同一台"设备"（固定机型 + 固定设备 UUID），
// 一旦该指纹被标记为脚本，后续请求会持续返回 430 {"code":"31001","message":"非法的请求"}（换设备即可恢复）。
// 因此每次请求都随机生成一套真实存在的设备指纹（系统版本 / 机型 / 分辨率 / 设备 UUID / 网络类型），
// 格式与官方 App UA 完全一致（服务端按 | 分段解析）。
const ZEEHO_APP_UA_VERSION = "3.0.5";      // 官方 App 版本（保持已知可用值，不随机）
const DEVICE_MODELS = [
  ["iPhone 11", "828*1792"], ["iPhone XR", "828*1792"], ["iPhone SE (3rd generation)", "750*1334"],
  ["iPhone 12 mini", "1080*2340"], ["iPhone 12", "1170*2532"], ["iPhone 12 Pro", "1170*2532"],
  ["iPhone 13 mini", "1080*2340"], ["iPhone 13", "1170*2532"], ["iPhone 13 Pro", "1170*2532"], ["iPhone 13 Pro Max", "1284*2778"],
  ["iPhone 14", "1170*2532"], ["iPhone 14 Plus", "1284*2778"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 14 Pro Max", "1290*2796"],
  ["iPhone 15", "1179*2556"], ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"],
  ["iPhone 16", "1179*2556"], ["iPhone 16 Pro", "1206*2622"], ["iPhone 16 Pro Max", "1320*2868"]
];
const IOS_VERSIONS = ["16.1.1", "16.6.1", "16.7.8", "17.1.1", "17.2.1", "17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];
function pickRandomDevice(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomDeviceUuid() {
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
// 完整格式：MOBILE|iOS|<系统>|ZEEHO_APP|<版本>|iPhone|<机型>|<分辨率>|<设备UUID>|<网络>|iOS
// short 格式（旧版客户端）：MOBILE|iOS|<系统>|ZEEHO_APP|3.0.1|iPhone|<网络>|iOS
function randomDeviceUA(short) {
  const net = Math.random() < 0.7 ? "WWAN" : "WIFI";
  if (short) return `MOBILE|iOS|${pickRandomDevice(IOS_VERSIONS)}|ZEEHO_APP|3.0.1|iPhone|${net}|iOS`;
  const m = pickRandomDevice(DEVICE_MODELS);
  return `MOBILE|iOS|${pickRandomDevice(IOS_VERSIONS)}|ZEEHO_APP|${ZEEHO_APP_UA_VERSION}|iPhone|${m[0]}|${m[1]}|${randomDeviceUuid()}|${net}|iOS`;
}
function socialSign(queryStr, bodyStr, cfg) {
  const c = cfg || getConfig();
  const ac = c.app;
  const timestamp = new Date().getTime();
  const nonce = timestamp + getRandomChars(16);
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const sign = md5(sha1((queryStr || "") + (bodyStr || "") + param + ac.appSecret), 32).toString();
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'signature': sign
  };
}
function socialHeaders(token, userId, queryStr, bodyStr, cfg) {
  const c = cfg || getConfig();
  const ua = randomDeviceUA();   // 每次请求换一套随机设备指纹，避免固定指纹被风控标记后持续 31001
  return {
    "content-type": "application/json",
    "appid": c.app.appId,
    "authorization": `Bearer ${token}`,
    "accept": "*/*",
    "accept-language": "zh-CN",
    "user-agent": ua,
    "interfaceversion": "2",
    "x-app-info": ua,
    "cookie": `user_id=${userId}`,
    ...socialSign(queryStr, bodyStr, cfg)
  };
}

// ========== v2.16.0 「带 query 的 GET」统一新协议（服务端已收紧：UA + query 不入签直接 430/30121） ==========
// 实证（2026-10-11，真实账号逐一比对）：带旧短格式 UA（…ZEEHO_APP|3.0.1|iPhone|WWAN|iOS）时，
// tire/monitoring、homeRideInfo、myRideInfo、ridetrack_v2、vehicleHomePageV2、
// vehicles/properties/snapshots、integral/detail、mineArticleInfo、myCoupons、activityPrizeRecord、
// ota/list 等「URL 带 query」的 GET 一律要求 md5(sha1(query+param+secret))（query 原文入签）；
// 无 query 的接口（vehicle/list、setting、batteryInfo、signin/count 等）不受影响。
// 统一改走官方全格式随机 UA + query 入签（与社交写操作同一套头），最严路径实测全部放行。
function appQueryGetHeaders(acc, queryStr, cfg) {
  const h = socialHeaders(cleanToken(acc.token), acc.userId, queryStr || "", "", cfg);
  if (!acc.userId) delete h.cookie;   // 无 userId 时不下发空 cookie
  return h;
}

// ========== HTTP 请求 ==========
// 响应解析：token 失效时网关返回 XML（<InvalidTokenException>），明确提示以便用户重新登录
function parseResp(body) {
  try { return JSON.parse(body); }
  catch(e) {
    if (/invalid_token/i.test(String(body))) return { error: "token已失效，请重新登录" };
    return { error: "parse error", raw: body };
  }
}

function httpGet(url, headers) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    if (isQX) {
      $task.fetch({ url, headers, method: "GET" }).then(
        function(resp) {
          resolve(parseResp(resp.body));
        },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.get({ url, headers }, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}

// ========== 单账号 Bark 推送（仅该账号签到成功后通知） ==========
// barkKey 支持两种填法：①只填 Bark App 内的 Key（走官方 https://api.day.app）；②自建服务器完整地址 https://域名/Key
function barkPush(barkKey, title, body) {
  try {
    const k = cleanBarkKey(barkKey);
    if (!k) return Promise.resolve({ skipped: true });
    let base = "https://api.day.app";
    let key = k;
    const m = k.match(/^(https?:\/\/[^/]+)\/(.+)$/i);
    if (m) { base = m[1]; key = m[2]; }   // 自建服务器
    key = key.replace(/^\/+/, "");
    const u = base + "/" + encodeURIComponent(key)
      + "/" + encodeURIComponent(title)
      + "/" + encodeURIComponent(body)
      + "?group=ZEEHO&sound=birdsong";
    return httpGet(u, {});
  } catch(e) { return Promise.resolve({ error: String(e) }); }
}


// ========== 统一通知桥（v2.14.9） ==========
// 优先原生本地通知 $notification（Loon 自带 / iOS App 与桌面版注入），失败回退全局 Bark
function notifyPush(title, body, cfg) {
  try {
    if (typeof $notification !== "undefined" && $notification && typeof $notification.post === "function") {
      $notification.post(String(title), "", String(body || ""));
      return;
    }
  } catch(e) {}
  try {
    const c = cfg || getConfig();
    if (c.globalBarkKey && String(c.globalBarkKey).trim()) barkPush(c.globalBarkKey, title, body);
  } catch(e) {}
}

// ========== Token 状态检测 ==========
async function checkToken(acc, cfg) {
  try {
    const token = cleanToken(acc.token);
    const userId = acc.userId || "";
    // userId 为空时不检测，直接认为有效（避免误判）
    if (!userId) {
      return { valid: true, score: 0, userName: acc.userName };
    }
    const signH = getSign("app", {}, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId,
      ...signH
    };
    const res = await httpGet(
      `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`,
      headers
    );
    if (res.code == "10000" && res.data) {
      return { valid: true, score: Number(res.data.score) || 0, userName: res.data.nickName || acc.userName };
    }
    if (res.code == "40001" || res.code == 401) {
      return { valid: false, reason: "token已过期" };
    }
    // 其他错误不判定为失效，避免网络问题误判
    return { valid: true, reason: res.message || "请求异常" };
  } catch(e) {
    // 异常不判定为失效
    return { valid: true, reason: String(e) };
  }
}

// ========== 手动执行签到（单账号） ==========
async function runSigninForAccount(acc, cfg) {
  const result = { userName: acc.userName || "未知", userId: acc.userId, success: false, signinScore: 0, blindBoxScore: 0, interactScore: 0, totalGain: 0, continueDays: 0, error: null, steps: [] };
  try {
    const token = cleanToken(acc.token);
    const userId = acc.userId || "";
    const baseHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId
    };
    const today = new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0") + "-" + String(new Date().getDate()).padStart(2,"0");
    const month = today.slice(0,7);

    // v2.16.7 info 查询带退避重试（07:00 多账号并发易触发 WAF 瞬断，此前无重试导致误报 +0/连签0）
    async function getInfoRetry() {
      let last = null;
      for (let t = 1; t <= 3; t++) {
        last = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
        if (last && String(last.code) === "10000") return last;
        if (t < 3) await new Promise(r => setTimeout(r, t * 1500));
      }
      return last;
    }
    // 1. 签到
    try {
      const infoRes = await getInfoRetry();
      const todayEntry = (infoRes?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
      // signStatue: 3/5=已签到, 0=盲盒开启日（已签到+已开盒）, 4=漏签, 2=未来
      if (todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5 || todayEntry.signStatue == 0)) {
        result.steps.push("今日已签到");
      } else {
        // 多账号连签易触发“请稍后/操作频繁”限流，退避后最多重试3次
        let signRes = null, signMsg = "未知";
        for (let at = 1; at <= 3; at++) {
          signRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/H5/signin`, { ...baseHeaders, ...getSign("h5", {}, {}, cfg) }, {});
          if (signRes?.code == "10000") break;
          signMsg = signRes?.message || signRes?.error || "未知";
          if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(signMsg) && at < 3) {
            await new Promise(r => setTimeout(r, (at + 1) * 2000));
            continue;
          }
          break;
        }
        if (signRes?.code == "10000") {
          const infoRes2 = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
          const te = (infoRes2?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
          result.signinScore = te ? (Number(te.integralScore) || 0) : 0;
          result.steps.push(`签到成功 +${result.signinScore}`);
        } else {
          // 重试后仍未成功：回查今日是否其实已签上
          try {
            const chk = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
            const ce = (chk?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
            if (ce && (ce.signStatue == 3 || ce.signStatue == 5 || ce.signStatue == 0)) result.steps.push("今日已签到");
            else result.steps.push(`签到失败: ${signMsg}`);
          } catch(e) { result.steps.push(`签到失败: ${signMsg}`); }
        }
      }
    } catch(e) { result.steps.push(`签到异常: ${e}`); }

    // 2. 查询连签和盲盒（v2.16.7：盲盒改走官方 POST /H5/signin/lottery?dateTime=<开盒日>，
    //    开盒日以 info.signPrizeDate===今日 为准；旧实现误用补签接口 supplementPrize → 40005 无效操作）
    try {
      const infoRes = await getInfoRetry();
      const list = infoRes?.data?.nowSignDetailVos || [];
      const todayIdx = list.findIndex(x => x.createDate === today);
      let cont = 0;
      // 盲盒开启日(st=0)是连签周期边界：今日是盲盒日计入1天；往前的盲盒日说明官方连签已重置，停止计数
      for (let i = todayIdx; i >= 0; i--) { const st = list[i]?.signStatue; if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break; }
      result.continueDays = cont;
      // 官方状态接口直出连签（权威值，日历重算仅作兜底）
      try {
        const stRes = await httpGet("https://h5.zeehoev.com/cfmotoservermine/H5/signin", { ...baseHeaders, ...getSign("h5", {}, '', cfg) });
        const sc = Number(stRes?.data?.continueDays);
        if (String(stRes?.code) === "10000" && isFinite(sc) && sc > 0) { cont = sc; result.continueDays = cont; }
      } catch (e) {}
      const signCount = Number(infoRes?.data?.signCount) || 0;
      const prizeDate = String(infoRes?.data?.signPrizeDate || "");
      const isBoxDay = prizeDate ? (prizeDate === today) : (signCount >= 30);
      if (isBoxDay) {
        const blindRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/lottery?dateTime=${encodeURIComponent(today)}`, { ...baseHeaders, ...getSign("h5", { dateTime: today }, '', cfg) }, "");
        const bd = (blindRes?.data && blindRes.data.signPrizesVO) || blindRes?.data || {};
        result.blindBoxScore = Number(bd.integral || bd.integralScore || bd.score || 0);
        if (String(blindRes?.code) === "10000") {
          result.steps.push(`盲盒获得 +${result.blindBoxScore} (${bd.prizesName || bd.prizeName || "积分"})`);
        } else {
          result.steps.push(`盲盒未开: ${blindRes?.message || blindRes?.error || ("code=" + blindRes?.code)}`);
        }
      } else {
        result.steps.push(`距盲盒 ${Math.max(0, 30 - (signCount || cont))} 天`);
      }
    } catch(e) { result.steps.push(`盲盒异常: ${e}`); }

    // 3. 社区任务（根据配置开关）
    // v2.14.11：发帖/点赞/评论走新协议（socialHeaders：appid 头 + 含body签名 + 官方客户端标识头），
    // 回查/分享/删除仍走旧通道（baseHeaders + getSign，实证不受收紧影响）
    const comm = cfg.community || {};
    let postId = null;
    let postedNow = false;
    if (comm.enablePost !== false) {
      try {
        // 新版发帖 body 必须带 postSubInfo/topicid 字段（旧版 {postcontent} 会被拒），key 顺序须与官方一致
        const postBody = JSON.stringify({ postSubInfo: { topicList: [] }, topicid: "", postcontent: "lucky" });
        const postRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle`, socialHeaders(token, userId, '', postBody, cfg), postBody);
        if (postRes?.code == "10000") {
          postId = getPostIdFromData(postRes.data);
          postedNow = true;
          result.interactScore += 1;
          result.steps.push("发帖成功 +1");
        } else {
          result.steps.push(`发帖失败: ${postRes?.code || "?"} ${postRes?.message || postRes?.error || "未知"}`);
        }
      } catch(e) { result.steps.push(`发帖异常: ${e}`); }
    }
    if (!postId) {
      try {
        const qMine = `userId=${userId}&page=1&pageSize=10`;
        const listRes = await httpGet(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo?${qMine}`, appQueryGetHeaders(acc, qMine, cfg));
        const rawList = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data?.records || listRes?.data?.list || []);
        const list = Array.isArray(rawList) ? rawList : [];
        // mineArticleInfo 只返回本人动态，优先按 userId 命中本人，杜绝误取他人帖导致“不可删除”
        const mine = list.find(it => String(it.userId || it.createBy || it.uid || "") === String(userId));
        postId = getPostIdFromData(mine || list[0] || listRes?.data);
      } catch(e) {}
    }
    if (postId) {
      if (comm.enableLike !== false) {
        try {
          const likeBody = JSON.stringify({ postId: String(postId), kindFlag: "0" });
          const likeRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo`, socialHeaders(token, userId, '', likeBody, cfg), likeBody);
          if (likeRes?.code == "10000") { result.interactScore += 1; result.steps.push("点赞成功 +1"); }
          else result.steps.push(`点赞失败: ${likeRes?.code || "?"} ${likeRes?.message || likeRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`点赞异常: ${e}`); }
      }
      if (comm.enableComment !== false) {
        try {
          const cmtBody = JSON.stringify({ postid: String(postId), userId: String(userId), comments: "今日已签到", sendTos: "[\n\n]" });
          const cmtRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commentInfo`, socialHeaders(token, userId, '', cmtBody, cfg), cmtBody);
          if (cmtRes?.code == "10000") result.steps.push("评论完成");
          else result.steps.push(`评论失败: ${cmtRes?.code || "?"} ${cmtRes?.message || cmtRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`评论异常: ${e}`); }
      }
      if (comm.enableShare !== false) {
        try {
          const shareRes = await httpPut(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/article/share/${postId}`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
          if (shareRes?.code == "10000") { result.interactScore += 1; result.steps.push("分享成功 +1"); }
          else result.steps.push(`分享失败: ${shareRes?.code || "?"} ${shareRes?.message || shareRes?.error || "未知"}`);
          await httpGet(`https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
        } catch(e) { result.steps.push(`分享异常: ${e}`); }
      }
      // 仅删除本次脚本新发的帖（postedNow），避免发帖失败时误删用户旧帖
      // DELETE 同样被收紧：需新协议头 + query 入签（实证旧式头返回 30121）
      if (comm.enableDelete !== false && postedNow) {
        try {
          const delQuery = `articleId=${postId}&postType=1`;
          const delRes = await httpDelete(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?${delQuery}`, socialHeaders(token, userId, delQuery, '', cfg));
          if (delRes?.code == "10000") result.steps.push("动态已删除");
          else result.steps.push(`删除失败: ${delRes?.code || "?"} ${delRes?.message || delRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`删除异常: ${e}`); }
      }
    }

    result.totalGain = result.signinScore + result.blindBoxScore + result.interactScore;
    result.success = true;
  } catch(e) {
    result.error = String(e);
    result.steps.push(`执行异常: ${e}`);
  }
  return result;
}

// ========== 辅助：HTTP POST/PUT/DELETE ==========
function httpPost(url, headers, body, timeoutMs) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) };
    // 单次请求超时：QX($task.fetch)单位为毫秒，Loon/Surge($httpClient)单位为秒，分别换算
    if (timeoutMs && timeoutMs > 0) opts.timeout = isQX ? timeoutMs : Math.max(1, Math.round(timeoutMs / 1000));
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.post(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function httpPut(url, headers, body) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "PUT" };
    // 支持 PUT 携带请求体（开坐垫等接口需要）
    if (body !== undefined && body !== null) opts.body = typeof body === "string" ? body : JSON.stringify(body);
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.put(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function httpDelete(url, headers) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "DELETE" };
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.delete(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function getPostIdFromData(data) {
  if (!data) return null;
  if (typeof data === "string" || typeof data === "number") return String(data);
  if (Array.isArray(data)) return getPostIdFromData(data[0]);
  const direct = data.uuid || data.tuuid || data.postId || data.postid || data.articleId || data.articleID || data.id || data.dataId || data.tid;
  if (direct) return String(direct);
  for (const key of ["records", "list", "rows", "data", "result"]) {
    const v = data[key];
    const pid = getPostIdFromData(v);
    if (pid) return pid;
  }
  return null;
}

// ========== 纯JS AES-256-ECB + PKCS7（云端开关锁需要；Loon JS环境无原生AES，已与标准库逐向量比对验证） ==========
const AES_SBOX = new Uint8Array([
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);
const AES_RCON = new Uint8Array([0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,0x6c,0xd8,0xab,0x4d]);
function aesGMul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}
// AES-256 密钥扩展（Nk=8, Nr=14，输出240字节）
function aesKeyExpansion256(key) {
  const Nk = 8, Nb = 4, Nr = 14;
  const w = new Uint8Array(4 * Nb * (Nr + 1));
  for (let i = 0; i < Nk * 4; i++) w[i] = key[i];
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    let t0 = w[4*(i-1)], t1 = w[4*(i-1)+1], t2 = w[4*(i-1)+2], t3 = w[4*(i-1)+3];
    if (i % Nk === 0) {
      const tmp = t0;
      t0 = AES_SBOX[t1] ^ AES_RCON[i/Nk];
      t1 = AES_SBOX[t2];
      t2 = AES_SBOX[t3];
      t3 = AES_SBOX[tmp];
    } else if (i % Nk === 4) {
      t0 = AES_SBOX[t0]; t1 = AES_SBOX[t1]; t2 = AES_SBOX[t2]; t3 = AES_SBOX[t3];
    }
    w[4*i]   = w[4*(i-Nk)]   ^ t0;
    w[4*i+1] = w[4*(i-Nk)+1] ^ t1;
    w[4*i+2] = w[4*(i-Nk)+2] ^ t2;
    w[4*i+3] = w[4*(i-Nk)+3] ^ t3;
  }
  return w;
}
// 加密单个16字节块
function aesEncryptBlock(input, w) {
  const Nb = 4, Nr = 14;
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = input[i];
  for (let i = 0; i < 16; i++) s[i] ^= w[i];
  for (let round = 1; round <= Nr; round++) {
    for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
    let t = s[1]; s[1]=s[5]; s[5]=s[9]; s[9]=s[13]; s[13]=t;
    t=s[2]; s[2]=s[10]; s[10]=t; t=s[6]; s[6]=s[14]; s[14]=t;
    t=s[3]; s[3]=s[15]; s[15]=s[11]; s[11]=s[7]; s[7]=t;
    if (round !== Nr) {
      for (let c = 0; c < 4; c++) {
        const i = 4*c;
        const a0=s[i],a1=s[i+1],a2=s[i+2],a3=s[i+3];
        s[i]   = aesGMul(a0,2)^aesGMul(a1,3)^a2^a3;
        s[i+1] = a0^aesGMul(a1,2)^aesGMul(a2,3)^a3;
        s[i+2] = a0^a1^aesGMul(a2,2)^aesGMul(a3,3);
        s[i+3] = aesGMul(a0,3)^a1^a2^aesGMul(a3,2);
      }
    }
    const off = round*16;
    for (let i = 0; i < 16; i++) s[i] ^= w[off+i];
  }
  return s;
}
function aesUtf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0|(c>>6), 0x80|(c&0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c-0xd800)<<10) + (c2-0xdc00);
      out.push(0xf0|(c>>18), 0x80|((c>>12)&0x3f), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
    } else out.push(0xe0|(c>>12), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
  }
  return new Uint8Array(out);
}
function aesBytesToBase64(bytes) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "", i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];
    result += chars[(n>>18)&63]+chars[(n>>12)&63]+chars[(n>>6)&63]+chars[n&63];
  }
  const rem = bytes.length - i;
  if (rem === 1) { const n = bytes[i]<<16; result += chars[(n>>18)&63]+chars[(n>>12)&63]+"=="; }
  else if (rem === 2) { const n = (bytes[i]<<16)|(bytes[i+1]<<8); result += chars[(n>>18)&63]+chars[(n>>12)&63]+chars[(n>>6)&63]+"="; }
  return result;
}
// 对外：AES-256-ECB + PKCS7，key为32字节ASCII字符串，返回Base64
function aes256EcbEncryptBase64(plaintext, keyStr) {
  const key = aesUtf8Bytes(keyStr);
  if (key.length !== 32) throw new Error("AES-256需要32字节密钥，当前" + key.length);
  const w = aesKeyExpansion256(key);
  const data = aesUtf8Bytes(plaintext);
  const padLen = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  for (let i = data.length; i < padded.length; i++) padded[i] = padLen;
  const out = new Uint8Array(padded.length);
  for (let off = 0; off < padded.length; off += 16) {
    out.set(aesEncryptBlock(padded.slice(off, off+16), w), off);
  }
  return aesBytesToBase64(out);
}

// ========== 车辆远程控制（寻车/鸣笛闪灯/开坐垫/云端开关锁，均会真实操作车辆） ==========
// 车控风险确认：首次使用车控功能时前端弹窗告知风险，用户点「我同意风险并使用」保存（cfg.vehicleControlRisk）后才放行，否则所有控车指令均被拦截。
// 云端开/关锁 AES-256-ECB 密钥：已内置默认密钥 ce2cd7cb57124c1349dd8543bf6fd31d（可在配置页修改）。
// 算法：AES-256-ECB/PKCS7（32位密钥按ASCII），明文为带空格换行JSON、lockFlag为字符串"1"/"0"，密文Base64放进 body{"secret":...}
const VEHICLE_ACTION_TEXT = { find: "短按寻车", loudFind: "鸣笛闪灯", cushion: "打开坐垫", unlock: "云端开锁", lock: "云端关锁" };
// v2.14.21 车控风险确认检查：首次使用车控时前端弹窗，用户点「我同意风险并使用」后保存，未同意前禁止一切车控指令
function vehicleRiskOk(cfg) {
  const risk = String((cfg || {}).vehicleControlRisk || "").trim();
  return risk === "我同意风险并使用" || risk === "我自愿承担相关风险";
}
function vehicleBaseHeaders(acc, cfg) {
  // 与官方App真实请求头对齐：UA / x-app-info / Accept；user_id 同时走独立头与 Cookie（官方放在 Cookie 里）
  // UA 未在账号里自定义时，每次请求随机生成设备指纹（避免固定指纹被风控拉黑）
  const ua = acc.userAgent || randomDeviceUA(true);
  const h = {
    "Authorization": `Bearer ${cleanToken(acc.token)}`,
    "Content-Type": "application/json;charset=UTF-8",
    "interfaceversion": "2",
    "Accept-Language": "zh-CN",
    "Accept": "*/*",
    "User-Agent": ua,
    "x-app-info": ua
  };
  if (acc.userId) {
    h["user_id"] = String(acc.userId);
    h["Cookie"] = `user_id=${acc.userId}`;
  }
  return h;
}
function vehicleCheckRes(res, okMsg) {
  if (res && !res.error && (res.code == "10000" || res.code === 10000)) return { ok: true, message: okMsg };
  // 控车指令经4G云端下发到车，响应常慢于客户端默认超时时长；超时时车辆往往已实际执行，按“已下发”提示，避免明明成功却弹红叉
  const errText = String((res && (res.error || res.message || res.msg)) || "").toLowerCase();
  if (res && res.error && /timeout|timed out|time out|请求超时|reuqest/.test(errText)) {
    return { ok: true, message: okMsg + "（响应超时但车辆通常已执行，可下拉刷新车辆状态确认）" };
  }
  return { ok: false, message: (res && (res.message || res.msg)) || (res && res.error) || "指令下发失败", code: res && res.code };
}
async function vehicleControl(acc, action, cfg, customVin) {
  try {
    const c = cfg || getConfig();
    // 0) 车控风险确认：未填写「我自愿承担相关风险」前，拦截一切车控指令
    if (!vehicleRiskOk(c)) return { ok: false, message: "未完成车控风险确认：首次使用车控功能时会弹窗告知风险，点击「我同意风险并使用」后才能启用" };
    // 1) 取 VIN：优先使用传入的 customVin（切换车辆后前端传过来的），其次账号已保存，否则实时查车辆列表取第一台
    let vin = customVin || acc.vinNo || "";
    if (!vin) {
      const list = await fetchVehicleList(acc, c);
      if (!list || !list.length) return { ok: false, message: "未获取到绑定车辆(VIN)，请确认账号已绑定车辆" };
      vin = list[0].vinNo;
    }
    const base = vehicleBaseHeaders(acc, c);

    // 2026-09-20 新增：控车请求失败自动重试一次（切换车辆后偶尔 HTTPClient request failed 是网络瞬时问题）
    const retry = async (fn, okMsg) => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fn();
        const check = vehicleCheckRes(res, okMsg);
        if (check.ok) return check;
        // 网络错误才重试，业务错误（如未配置密钥）不重试
        const isNetErr = res && res.error && /HTTPClient request failed|timeout|timed out|ETIMEDOUT|ECONNRESET|网络/.test(String(res.error));
        if (!isNetErr || attempt >= 2) return check;
        await new Promise(r => setTimeout(r, 1200));
      }
    };

    // 2) 按动作下发
    if (action === "find") {
      // 短按寻车：PUT control/{vin}，空body
      const h = { ...base, ...getSign("app", {}, "", c) };
      return await retry(() => httpPut(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleInfo/control/${vin}`, h), "寻车指令已下发，车辆应闪灯提示");
    }
    if (action === "loudFind") {
      // 高声寻车（鸣笛+闪灯）：POST controlV2，body {"param":"4","vin":vin}
      const bodyStr = JSON.stringify({ param: "4", vin: vin });
      const h = { ...base, ...getSign("app", {}, bodyStr, c) };
      return await retry(() => httpPost(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleInfo/controlV2`, h, bodyStr), "鸣笛闪灯指令已下发");
    }
    if (action === "cushion") {
      // 开坐垫：PUT propertyTwo/one，commond=28
      const bodyStr = JSON.stringify({ commond: "28", commondParam: "1", vcu: vin, version: "v2" });
      const h = { ...base, ...getSign("app", {}, bodyStr, c) };
      return await retry(() => httpPut(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleSet/propertyTwo/one`, h, bodyStr), "开坐垫指令已下发，坐垫应弹起");
    }
    if (action === "unlock" || action === "lock") {
      // 云端开关锁(App 3.0.1)：POST vehicleSet/network/unlock，lockFlag "1"=开锁 / "0"=关锁（同一接口靠 lockFlag 区分，值为字符串而非数字）。
      // 密钥来自配置 cfg.vehicleAesKey（v2.14.20 起已内置默认密钥，可在设置页「签名密钥配置」修改）。
      const vKey = (c.vehicleAesKey || "").trim();
      if (!vKey) return { ok: false, message: "尚未配置云端控车密钥：请到「设置 → 签名密钥配置」填写云端控车AES密钥并保存后，再使用开/关锁" };
      if (!/^[0-9a-fA-F]{32}$/.test(vKey)) return { ok: false, message: "云端控车密钥格式错误（应为32位十六进制），请到配置页核对后保存" };
      // 明文必须与官方 NSJSONSerialization 输出逐字节一致（冒号后带空格、键值间为 ",\n  "）：
      // {\n  "lockFlag" : "1",\n  "vinNo" : "VIN"\n} → AES-256-ECB/PKCS7(密钥32字节ASCII) → Base64；
      // 实际发送 body={"secret":Base64密文}；注意【签名签的是明文 plain，不是 secret】（密钥/明文格式已用4条官方真实密文逐字节复现验证）。
      const lockFlag = action === "unlock" ? "1" : "0";
      const plain = `{\n  "lockFlag" : "${lockFlag}",\n  "vinNo" : "${vin}"\n}`;
      const secret = aes256EcbEncryptBase64(plain, vKey);
      const sendBody = JSON.stringify({ secret: secret });
      const h = { ...base, ...getSign("app", {}, plain, c) };
      console.log(`[车辆控制] ${action} 明文=${JSON.stringify(plain)} secret=${secret.slice(0,24)}...`);
      // 车辆唤醒+云端下发较慢，给25秒单次超时，避免在默认超时时长内误报（即便最终仍超时也会按“已下发”容错）
      const res = await httpPost(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleSet/network/unlock`, h, sendBody, 25000);
      try { console.log(`[车辆控制] ${action} 服务器返回=${JSON.stringify(res).slice(0,300)}`); } catch(e) {}
      return vehicleCheckRes(res, action === "unlock" ? "云端开锁指令已下发" : "云端关锁指令已下发");
    }
    return { ok: false, message: "未知操作类型: " + action };
  } catch(e) {
    return { ok: false, message: "控制异常: " + String(e) };
  }
}


// ========== 车辆信息获取 ==========
async function fetchServiceRechargeDetail(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("h5", { vinNo: vinNo }, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      ...signH
    };
    if (acc.userId) headers["user_id"] = String(acc.userId);
    const res = await httpGet(`https://h5.zeehoev.com/cfmotoserverapp/app/service/recharge/vehicle/detail?vinNo=${encodeURIComponent(vinNo)}`, headers);
    if (res.code == "10000" && res.data) {
      return {
        rechargeEndDate: String(res.data.rechargeEndDate || ""),
        lastUseDate: Number(res.data.lastUseDate) || 0,
        serviceRechargeStatus: String(res.data.serviceRechargeStatus || ""),
        vehicleName: String(res.data.vehicleName || "")
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchVehicleList(acc, cfg) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      ...signH
    };
    if (acc.userId) headers["user_id"] = String(acc.userId);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", headers);
    // 兼容多种响应格式：data 可能是数组，也可能是 { list: [...] } 或 { records: [...] }
    let list = [];
    if (res.code == "10000" || res.code === 10000) {
      if (Array.isArray(res.data)) list = res.data;
      else if (res.data && Array.isArray(res.data.list)) list = res.data.list;
      else if (res.data && Array.isArray(res.data.records)) list = res.data.records;
      else if (res.data && Array.isArray(res.data.rows)) list = res.data.rows;
    }
    return list.map(v => ({
      vinNo: String(v.vinNo || v.frameNo || v.vin || "").trim(),
      name: String(v.vehicleName || v.vehicleType || v.deviceName || v.name || "车辆").trim() || "车辆",
      pic: String(v.vehiclePicUrl || v.pic || v.imageUrl || "").trim(),
      vehicleType: String(v.vehicleType || v.type || "").trim(),
      licensePlate: v.licensePlate || null
    })).filter(v => v.vinNo);
  } catch(e) { return []; }
}

async function fetchVehicleWidgets(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/widgets/${encodeURIComponent(vinNo)}`, {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": acc.userId || "",
      ...signH
    });
    if ((res.code == "10000" || res.code === 10000) && res.data) {
      const d = res.data;
      const soc = Number(d.bmssoc || d.batteryLevel || 0);
      const range = Number(d.hmiRidableMile || d.vehicleRidableMile || d.ridableMileage || 0);
      const voltage = Number(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || 0);
      // GPS 经纬度：V2结构层级不固定，用 deepPick 在整棵树兜底找常见字段名；经度 lng/lon、纬度 lat
      const lngStr = deepPick(d, ["longitude","lng","lon","gpsX","longitudeValue","coordX","x"]);
      const latStr = deepPick(d, ["latitude","lat","gpsY","latitudeValue","coordY","y"]);
      const longitude = Number(lngStr);
      const latitude = Number(latStr);
      return {
        batteryPercent: Math.max(0, Math.min(100, isFinite(soc) ? soc : 0)),
        residualRangeKm: isFinite(range) ? range : 0,
        voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
        address: String(d.address || "").trim(),
        locationTime: String(d.location?.locationTime || "").trim(),
        vehicleName: String(d.vehicleName || "").trim(),
        vehicleImageUrl: String(d.vehicleScalePicUrl || d.vehiclePicUrl || "").trim(),
        headLockState: String(d.headLockState || "").trim(),
        batteryPullOut: String(d.batteryPullOutFlag || "") === "1",
        // 在线状态（4G/TBOX 是否在线）：尝试常见字段名
        online: String(d.onlineStatus || d.online || d.netStatus || d.tboxStatus || d.deviceOnline || "").trim(),
        // 坐垫/座桶锁状态：字段名各版本不一致，deepPick 兜底；取不到为空串，前端不显示，绝不编造
        cushionState: deepPick(d, ["cushionState","cushionStatus","cushionLockState","seatState","seatStatus","seatLockState","saddleState","saddleStatus","saddleLockState"]),
        // GPS 坐标（数值非法时置空，前端据此置灰地图按钮）
        longitude: (isFinite(longitude) && Math.abs(longitude) <= 180 && longitude !== 0) ? longitude : "",
        latitude: (isFinite(latitude) && Math.abs(latitude) <= 90 && latitude !== 0) ? latitude : "",
        // 电源/ACC状态（开关机）：尝试多种可能字段名
        powerStatus: String(d.accStatus || d.powerStatus || d.vehicleStatus || d.ignitionStatus || d.powerMode || d.accState || d.powerState || d.vehicleState || d.engineStatus || d.isPowerOn || d.powerOn || "").trim(),
        // 车锁状态：开锁=上电(开机)，锁车=下电(关机)；headLockState龙头锁为实时字段，优先取
        lockState: String(d.headLockState || d.lockState || d.lockStatus || d.vehicleLockState || d.carLockState || d.doorLockState || d.lockFlag || d.isLocked || d.locked || d.centralLockingStatus || "").trim()
      };
    }
    return null;
  } catch(e) { return null; }
}

// 基于账号生成稳定的16位hex设备标识（uniqueIdentify/phoneDeviceName 参数用，服务端仅埋点不校验）
function getDeviceIdentify(acc) {
  const seed = String(acc.userId || acc.vinNo || "zeeho-device");
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
  return (Math.abs(h).toString(16) + "0000000000000000").slice(0, 16);
}
// 深度优先在嵌套对象里找第一个匹配 keys 的非空值（V2返回结构层级不确定）
function deepPick(obj, keys, depth) {
  if (!obj || typeof obj !== "object" || (depth || 0) > 5) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return String(obj[k]);
  }
  for (const k in obj) {
    if (obj[k] && typeof obj[k] === "object") {
      const r = deepPick(obj[k], keys, (depth || 0) + 1);
      if (r) return r;
    }
  }
  return "";
}
// 从 iotProperties 数组里按 identify 提取上报值（如 VehicleLock_S 整车锁定状态、HeadLockState 龙头锁）
function pickIotProp(d, identify) {
  const arr = d && d.iotProperties;
  if (Array.isArray(arr)) {
    const key = String(identify).toLowerCase();
    for (const it of arr) {
      if (it && String(it.identify || "").toLowerCase() === key && it.value !== null && it.value !== undefined && it.value !== "") {
        return String(it.value);
      }
    }
  }
  return "";
}
// 车辆首页综合数据 vehicleHomePageV2（极核App 3.x首页接口，GET，VIN在路径，含开关机/ACC/车锁/在线状态）
async function fetchVehicleHomePage(acc, cfg, vinNo) {
  try {
    const deviceId = getDeviceIdentify(acc);
    const query = `uniqueIdentify=${deviceId}&phoneDeviceName=ios_${deviceId}`;
    const url = `https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleHomePageV2/${encodeURIComponent(vinNo)}?${query}`;
    const res = await httpGet(url, appQueryGetHeaders(acc, query, cfg));
    if (res && (res.code == "10000" || res.code === 10000) && res.data) {
      const d = res.data;
      // 整车锁定状态 VehicleLock_S：0=未锁(解锁即上电=开机)，1=锁定(锁车即下电=关机)；其次用顶层龙头锁 headLockState
      const vehicleLock = pickIotProp(d, "VehicleLock_S");
      const headLockIot = pickIotProp(d, "HeadLockState");
      // 顶层 headLockState 实时更新优先，其次iot龙头锁，最后整车锁VehicleLock_S(可能上报陈旧)
      const topLock = String(d.headLockState || d.lockState || d.lockStatus || d.vehicleLockState || headLockIot || vehicleLock || "").trim();
      const lngStr = deepPick(d, ["longitude","lng","lon","gpsX","longitudeValue","coordX","x"]);
      const latStr = deepPick(d, ["latitude","lat","gpsY","latitudeValue","coordY","y"]);
      const longitude = Number(lngStr);
      const latitude = Number(latStr);
      return {
        powerStatus: deepPick(d, ["accStatus","powerStatus","vehicleStatus","ignitionStatus","powerMode","accState","powerState","vehicleState","engineStatus","isPowerOn","powerOn","acc"]).trim(),
        lockState: topLock,
        online: String(d.onlineStatus || d.rideState || d.online || d.netStatus || d.tboxStatus || "").trim(),
        rideState: String(d.rideState || "").trim(),
        cushionState: deepPick(d, ["cushionState","cushionStatus","cushionLockState","seatState","seatStatus","seatLockState","saddleState","saddleStatus","saddleLockState"]),
        longitude: (isFinite(longitude) && Math.abs(longitude) <= 180 && longitude !== 0) ? longitude : "",
        latitude: (isFinite(latitude) && Math.abs(latitude) <= 90 && latitude !== 0) ? latitude : ""
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchTirePressure(acc, cfg, vinNo) {
  try {
    const query = `vinNo=${encodeURIComponent(vinNo)}&timePeriodType=1`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicle/tire/monitoring?${query}`, appQueryGetHeaders(acc, query, cfg));
    if ((res.code == "10000" || res.code === 10000) && res.data) {
      const list = Array.isArray(res.data.realTimeData) ? res.data.realTimeData : (Array.isArray(res.data) ? res.data : []);
      const byPos = {};
      for (const it of list) {
        const pos = Number(it?.sensorPosition);
        if (pos) byPos[pos] = it;
      }
      const fmt = (it) => {
        const warn = Number(it?.warningType ?? 0);
        const v = String(it?.tirePressure ?? "").trim();
        const n = parseFloat(v);
        if (warn !== 0 || !v || !isFinite(n) || n <= 0) return "未绑定";
        return v + "bar";
      };
      const fmtTemp = (it) => {
        const warn = Number(it?.warningType ?? 0);
        const v = it?.tireTemp;
        if (warn !== 0 || v == null) return "";
        const s = String(v).trim();
        const n = parseFloat(s);
        if (!s || s.toLowerCase() === "null" || !isFinite(n) || n <= 0) return "";
        return s + "°C";
      };
      const front = byPos[1] || list[0];
      const rear = byPos[2] || list[1];
      return {
        frontPressure: front ? fmt(front) : "未绑定",
        rearPressure: rear ? fmt(rear) : "未绑定",
        frontTemp: front ? fmtTemp(front) : "",
        rearTemp: rear ? fmtTemp(rear) : ""
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchRideInfo(acc, cfg, vinNo) {
  try {
    const month = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0");
    // v2.16.0 修复 30121：homeRideInfo/myRideInfo 需 query 入签（旧签名+旧UA 已被服务端拒）
    const qHome = `vinNo=${encodeURIComponent(vinNo)}`;
    const qMy = `vinNo=${encodeURIComponent(vinNo)}&month=${month}`;
    const [homeRes, myRes] = await Promise.all([
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qHome}`, appQueryGetHeaders(acc, qHome, cfg)),
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${qMy}`, appQueryGetHeaders(acc, qMy, cfg))
    ]);
    const h = homeRes?.data || homeRes || {};
    const d = myRes?.data || myRes || {};
    const list = Array.isArray(d.rideRecordList) ? d.rideRecordList : [];
    const todayKey = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0") + "." + String(new Date().getDate()).padStart(2,"0");
    const day = list.find(x => String(x?.date || "") === todayKey) || list[list.length - 1] || {};
    // 昨天里程：从当月骑行记录取昨天（homeRideInfo 无昨天数据，只有 lastRideMileage）
    const yest = new Date(Date.now() - 86400000);
    const yestKey = yest.getFullYear() + "." + String(yest.getMonth()+1).padStart(2,"0") + "." + String(yest.getDate()).padStart(2,"0");
    const yd = list.find(x => String(x?.date || "") === yestKey) || {};
    return {
      todayDistance: Number(day.rideMileage ?? h.rideMileageDay ?? 0),
      todayDuration: Number(day.ridingTimeDayUnitMinute ?? h.lastRidingTimeUnitMinute ?? 0),
      todayMaxSpeed: Number(day.maxSpeed ?? 0),
      totalMileage: Number(d.rideMileageTotal ?? 0),
      yesterdayDistance: Number(yd.rideMileage ?? 0),
      lastRideMileage: Number(h.lastRideMileage ?? 0),
      lastRideDuration: Number(h.lastRidingTimeUnitMinute ?? 0)
    };
  } catch(e) { return null; }
}

// v2.16.0 隐藏骑行数据：月度汇总（myRideInfo，含服务端极速/急加速/急刹/压弯日字段，原样透传 data）
async function fetchRideMonth(acc, cfg, month, vin) {
  try {
    let vinNo = String(vin || "").trim();
    let vehicleName = "";
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
      vehicleName = vehicles[0].name;
    }
    const m = month || (new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&month=${encodeURIComponent(m)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") return { ok: true, month: m, vinNo: vinNo, vehicleName: vehicleName, data: res.data || {} };
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
}

// v2.16.0 隐藏骑行数据：轨迹分页（ridetrack_v2 —— 唯一带 trajectory 的接口；服务端把 pageSize 钳在 20）
// v2.16.1 修复：必须带 startTime=YYYY-MM（月份），否则服务端恒返回空数组（HAR 实证：缺失时 days=0）
async function fetchRideTrackPage(acc, cfg, page, pageSize, vin, month) {
  try {
    let vinNo = String(vin || "").trim();
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
    }
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(200, Number(pageSize) || 20));
    const st = String(month || "").replace(".", "-") || (new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&page=${pg}&pageSize=${ps}&startTime=${encodeURIComponent(st)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ridetrack_v2?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") {
      let days = [];
      if (Array.isArray(res.data)) days = res.data;
      else if (res.data && Array.isArray(res.data.list)) days = res.data.list;
      else if (res.data && Array.isArray(res.data.dayList)) days = res.data.dayList;
      return { ok: true, page: pg, vinNo: vinNo, days: days };
    }
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", page: pg, vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
}

async function fetchBatteryChargeState(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "appid": cfg.app.appId,
      "user_id": acc.userId || "",
      ...signH
    };
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/batteryInfo/${encodeURIComponent(vinNo)}`, headers);
    if (res.code == "10000" && res.data) {
      const d = res.data;
      // 尝试提取电压（多种可能字段名）
      const voltage = Number(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || d.vol || d.batVoltage || d.batteryVol || 0);
      // 尝试提取电流
      const current = Number(d.current || d.batteryCurrent || d.bmsCurrent || d.cur || d.batteryCur || 0);
      // 尝试提取电池温度
      const batteryTemp = Number(d.batteryTemp || d.batTemp || d.temp || d.temperature || d.bmsTemp || d.batteryTemperature || 0);
      const range = Number(d.hmiRidableMile || d.vehicleRidableMile || d.ridableMileage || d.residualRange || 0);
      // 耗电统计（官方直接给累计值，单位 kWh）
      const powerUseToday = Number(d.powerUseToday || 0);
      const powerUseMonth = Number(d.powerUseMonth || 0);
      const powerChargeMonth = Number(d.powerChargeMonth || 0);
      const chargeCount = Number(d.chargeCount || 0);
      return {
        chargeState: String(d.chargeStateStr || d.chargeState || "未充电"),
        voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
        current: isFinite(current) ? current : 0,
        batteryTemp: isFinite(batteryTemp) ? batteryTemp : 0,
        soc: Number(d.soc || d.batteryLevel || d.bmssoc || 0),
        residualRangeKm: isFinite(range) ? range : 0,
        powerUseToday: isFinite(powerUseToday) ? powerUseToday : 0,
        powerUseMonth: isFinite(powerUseMonth) ? powerUseMonth : 0,
        powerChargeMonth: isFinite(powerChargeMonth) ? powerChargeMonth : 0,
        chargeCount: isFinite(chargeCount) ? chargeCount : 0,
        // v2.16.5 官方充电时长字段（充电中非0；供与本地估算对照）
        fullChargeTime: Number(d.fullChargeTime || 0),
        fullChargeTimeSecond: Number(d.fullChargeTimeSecond || 0)
      };
    }
    return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0, fullChargeTime: 0, fullChargeTimeSecond: 0 };
  } catch(e) { return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0, fullChargeTime: 0, fullChargeTimeSecond: 0 }; }
}

async function fetchVehicleInfo(acc, cfg, vinNo) {
  const result = { hasVehicle: false, vehicleName: "", vinNo: "", voltage: 0, current: 0, batteryTemp: 0, batteryPercent: 0, residualRangeKm: 0, rangeEstimated: false, address: "", locationTime: "", chargeState: "未充电", frontPressure: "", rearPressure: "", frontTemp: "", rearTemp: "", todayDistance: 0, todayDuration: 0, todayMaxSpeed: 0, lastRideMileage: 0, totalMileage: 0, yesterdayDistance: 0, vehicleImageUrl: "", serviceEndDate: "", serviceRemainDays: 0, serviceStatus: "", powerStatus: "", lockState: "", online: "", rideState: "", cushionState: "", longitude: "", latitude: "", powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0 };
  try {
    const allVehicles = await fetchVehicleList(acc, cfg);
    // 名下的模拟车不参与展示（首页不显示模拟车）
    const vehicles = allVehicles.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
    if (vehicles.length === 0) return result;
    const v = vinNo ? (vehicles.find(x => x.vinNo === vinNo) || vehicles[0]) : vehicles[0];
    result.vehicles = vehicles.map(x => ({ name: x.name, vinNo: x.vinNo }));
    result.currentVin = v.vinNo;
    result.hasVehicle = true;
    result.vehicleName = v.name;
    result.vinNo = v.vinNo;
    result.vehicleImageUrl = v.pic;
    const [widgets, tire, ride, battery, service, homePage] = await Promise.all([
      fetchVehicleWidgets(acc, cfg, v.vinNo).catch(() => null),
      fetchTirePressure(acc, cfg, v.vinNo).catch(() => null),
      fetchRideInfo(acc, cfg, v.vinNo).catch(() => null),
      fetchBatteryChargeState(acc, cfg, v.vinNo).catch(() => ({ chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0 })),
      fetchServiceRechargeDetail(acc, cfg, v.vinNo).catch(() => null),
      fetchVehicleHomePage(acc, cfg, v.vinNo).catch(() => null)
    ]);
    if (widgets) {
      result.batteryPercent = widgets.batteryPercent;
      result.residualRangeKm = widgets.residualRangeKm;
      result.voltage = widgets.voltage;
      result.address = widgets.address;
      result.locationTime = widgets.locationTime;
      result.powerStatus = widgets.powerStatus || "";
      result.lockState = widgets.lockState || "";
      if (widgets.vehicleName) result.vehicleName = widgets.vehicleName;
      if (widgets.vehicleImageUrl) result.vehicleImageUrl = widgets.vehicleImageUrl;
      if (widgets.online) result.online = widgets.online;
      if (widgets.cushionState) result.cushionState = widgets.cushionState;
      // 坐标：widgets 先取到就用
      if (widgets.longitude !== "" && widgets.longitude !== undefined) result.longitude = widgets.longitude;
      if (widgets.latitude !== "" && widgets.latitude !== undefined) result.latitude = widgets.latitude;
    }
    // homePage 优先（可能包含更准确的开关机/车锁状态）
    if (homePage) {
      if (homePage.powerStatus) result.powerStatus = homePage.powerStatus;
      if (homePage.lockState) result.lockState = homePage.lockState;
      if (homePage.online) result.online = homePage.online;
      if (homePage.rideState) result.rideState = homePage.rideState;
      if (homePage.cushionState) result.cushionState = homePage.cushionState;
      // 坐标兜底：widgets 没取到时用首页综合接口的
      if ((result.longitude === "" || result.longitude === undefined) && homePage.longitude !== "" && homePage.longitude !== undefined) result.longitude = homePage.longitude;
      if ((result.latitude === "" || result.latitude === undefined) && homePage.latitude !== "" && homePage.latitude !== undefined) result.latitude = homePage.latitude;
    }
    if (tire) {
      result.frontPressure = tire.frontPressure;
      result.rearPressure = tire.rearPressure;
      result.frontTemp = tire.frontTemp;
      result.rearTemp = tire.rearTemp;
    }
    if (ride) {
      result.todayDistance = ride.todayDistance;
      result.todayDuration = ride.todayDuration;
      result.todayMaxSpeed = ride.todayMaxSpeed;
      result.lastRideMileage = ride.lastRideMileage;
      result.totalMileage = ride.totalMileage || 0;
      result.yesterdayDistance = ride.yesterdayDistance || 0;
    }
    result.chargeState = battery.chargeState || "未充电";
    if (battery.voltage) result.voltage = battery.voltage;
    if (battery.current) result.current = battery.current;
    if (battery.batteryTemp) result.batteryTemp = battery.batteryTemp;
    // 耗电统计（官方接口累计值，0 也保留——可能确实没骑/没充）
    if (typeof battery.powerUseToday === "number") result.powerUseToday = battery.powerUseToday;
    if (typeof battery.powerUseMonth === "number") result.powerUseMonth = battery.powerUseMonth;
    if (typeof battery.powerChargeMonth === "number") result.powerChargeMonth = battery.powerChargeMonth;
    if (typeof battery.chargeCount === "number") result.chargeCount = battery.chargeCount;
    // 续航兜底：充电时 widgets/batteryInfo 都可能返回0，先尝试 batteryInfo，再基于电量估算
    if ((!result.residualRangeKm || result.residualRangeKm === 0) && battery.residualRangeKm) {
      result.residualRangeKm = battery.residualRangeKm;
    }
    if ((!result.residualRangeKm || result.residualRangeKm === 0) && result.batteryPercent > 0) {
      // 基于电量百分比估算续航（满电按150km估算）
      result.residualRangeKm = Math.round(result.batteryPercent * 1.5);
      result.rangeEstimated = true;
    }
    if (service) {
      result.serviceEndDate = service.rechargeEndDate || "";
      result.serviceStatus = service.serviceRechargeStatus || "";
      result.serviceRemainDays = service.lastUseDate || 0;
      if (service.vehicleName) result.vehicleName = service.vehicleName;
    }
  } catch(e) {}
  return result;
}

// ========== 获取单账号实时数据 ==========
async function fetchAccountData(acc, cfg, vinNo) {
  const token = cleanToken(acc.token);
  let userId = acc.userId || "";
  const month = new Date().getFullYear() + "-" + (new Date().getMonth() + 1);
  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  const result = {
    userName: acc.userName || "未知用户",
    userId: userId,
    score: 0,
    signedToday: false,
    continueDays: 0,
    todayScore: 0,
    signCount: 0,
    last7: [],
    error: null,
    vehicle: { hasVehicle: false }
  };

  // userId 为空时，尝试自动获取（兜底，主要靠配置页手动输入）
  if (!userId) {
    try {
      const signH = getSign("app", {}, '', cfg);
      // 尝试从 vehicle/list 响应中提取 userId
      const vehicleRes = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        "interfaceversion": "2",
        ...signH
      });
      if (vehicleRes.code == "10000" && vehicleRes.data) {
        const autoUid = String(vehicleRes.data.userId || vehicleRes.data.uid || vehicleRes.data.id || "");
        if (autoUid) {
          userId = autoUid;
          result.userId = userId;
          // 自动保存获取到的 userId
          try {
            const accounts = getAccounts();
            const idx = accounts.findIndex(a => cleanToken(a.token) === token);
            if (idx >= 0 && !accounts[idx].userId) {
              accounts[idx].userId = userId;
              saveAccounts(accounts);
            }
          } catch(e) {}
        }
      }
    } catch(e) {}
  }

  // 0/1/2 三段互相独立：并行发出（原顺序等待 4~5 个网络往返，是首屏慢的主因）
  //  - 车辆信息（内部 vehicle/list + 6 个并行子请求）
  //  - 积分（setting 接口，响应顺带完成 Token 状态判定，省掉 checkToken 的重复请求）
  //  - 签到状态（见下方，与上面两段同时进行）
  const pVehicle = (async () => {
    try { result.vehicle = await fetchVehicleInfo(acc, cfg, vinNo); }
    catch(e) { result.vehicle = { hasVehicle: false }; }
  })();

  const pScore = (async () => {
    try {
      if (!userId) {
        result.error = "请在配置页填写用户ID";
        result.tokenValid = true;
        result.tokenReason = null;
        return;
      }
      const signH = getSign("app", {}, '', cfg);
      const infoUrl = `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`;
      const infoRes = await httpGet(infoUrl, {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        "interfaceversion": "2",
        "user_id": userId,
        ...signH
      });
      if (infoRes.code == "10000" && infoRes.data) {
        // 尝试多种积分字段名
        result.score = Number(infoRes.data.score || infoRes.data.integral || infoRes.data.point || infoRes.data.points || infoRes.data.totalScore || infoRes.data.totalIntegral || 0);
        // 昵称始终用配置中保存的，不用API返回的nickName覆盖（配置为空时才回填）
        result.tokenValid = true;
        result.tokenReason = null;
        const nick = String(infoRes.data.nickName || "");
        if (nick && (!result.userName || result.userName === "未知用户")) result.userName = nick;
      } else if (infoRes.code == "40001" || infoRes.code == 401) {
        result.error = "Token已过期";
        result.tokenValid = false;
        result.tokenReason = "token已过期";
      } else {
        result.error = "积分获取失败: " + (infoRes.message || infoRes.code || "未知错误");
        result.tokenValid = true;
        result.tokenReason = infoRes.message || "请求异常";
      }
    } catch(e) {
      result.error = "积分获取异常: " + String(e);
      result.tokenValid = true;
      result.tokenReason = String(e);
    }
  })();

  // 2. 签到状态（跨月：并行请求当月+上月，合并计算连签，避免1号重置）
  try {
    const now = new Date();
    const curMonth = now.getFullYear() + "-" + (now.getMonth() + 1);
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastDate.getFullYear() + "-" + (lastDate.getMonth() + 1);
    const baseHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId
    };
    const [curRes, lastRes] = await Promise.all([
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${curMonth}`, { ...baseHeaders, ...getSign("h5", { month: curMonth }, '', cfg) }),
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${lastMonth}`, { ...baseHeaders, ...getSign("h5", { month: lastMonth }, '', cfg) })
    ]);
    const lastList = (lastRes.code == "10000" && lastRes.data) ? (lastRes.data.nowSignDetailVos || []) : [];
    const curList = (curRes.code == "10000" && curRes.data) ? (curRes.data.nowSignDetailVos || []) : [];
    const list = [...lastList, ...curList];
    if (curRes.code == "10000" && curRes.data) {
      result.signCount = Number(curRes.data.signCount) || 0;
    }
    const todayEntry = curList.find(x => x.createDate === today);
    result.signedToday = !!(todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5 || todayEntry.signStatue == 0));
    result.todayScore = todayEntry ? (Number(todayEntry.integralScore) || 0) : 0;
    // 优先用今日签到运行日志里的准确总得分（签到+盲盒+互动），没有运行记录则回退到签到分
    try {
      const _todayLogs = (getLogs() || []).filter(l => l && l.date === today && String(l.userId || "") === String(userId) && l.success);
      if (_todayLogs.length > 0) {
        const _tl = _todayLogs[0];
        result.todayScore = Number(_tl.totalGain) || result.todayScore;
        result.todayDetail = {
          signinScore: Number(_tl.signinScore) || 0,
          blindBoxScore: Number(_tl.blindBoxScore) || 0,
          interactScore: Number(_tl.interactScore) || 0
        };
      }
    } catch(e) {}
    // 跨月连签：从今天往前数，遇到断签停止（不按月重置）
    const todayIdx = list.findIndex(x => x.createDate === today);
    let cont = 0;
    if (todayIdx >= 0) {
      for (let i = todayIdx; i >= 0; i--) {
        const st = list[i]?.signStatue;
        if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break;
      }
    }
    result.continueDays = cont;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const entry = list.find(x => x.createDate === ds);
      result.last7.push({
        date: ds.slice(5),
        signed: !!(entry && (entry.signStatue == 3 || entry.signStatue == 5 || entry.signStatue == 0)),
        isToday: i === 0
      });
    }
  } catch(e) { if (!result.error) result.error = "签到状态获取失败"; }

  // 等待车辆信息 + 积分（Token 状态已在积分响应里判定，不再单独请求 checkToken）
  await Promise.all([pVehicle, pScore]);
  return result;
}

// ========== 并发拉取全部账号数据 ==========
// 默认并发3路，兼顾看板流畅度与极核服务端限流风险；返回顺序与账号列表一致
async function fetchAllAccounts(accounts, cfg, limit = 3) {
  const out = new Array(accounts.length);
  let i = 0;
  async function worker() {
    while (i < accounts.length) {
      const idx = i++;
      try {
        out[idx] = await fetchAccountData(accounts[idx], cfg);
      } catch(e) {
        out[idx] = { userName: accounts[idx].userName || "未知", userId: accounts[idx].userId, success: false, error: String(e) };
      }
    }
  }
  const n = Math.max(1, Math.min(limit, accounts.length));
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

// ========== 解析请求 body ==========
function parseBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    return JSON.parse(req.body);
  } catch(e) { return {}; }
}


// ========== HTML: 看板页 ==========
// 根据电源状态/车锁状态判断开关机显示（优先电源字段，其次用车锁推断：开锁=上电/开机，锁车=下电/关机）
function getPowerDisplay(powerStatus, lockState) {
  const p = String(powerStatus || "").toLowerCase().trim();
  const l = String(lockState || "").toLowerCase().trim();
  const onVals = ["1", "on", "true", "开机", "open", "激活", "acc_on", "acc on", "power_on", "power on", "已开机", "已上电"];
  const offVals = ["0", "off", "false", "关机", "closed", "待机", "acc_off", "acc off", "power_off", "power off", "已关机", "已下电"];
  if (p) {
    if (onVals.includes(p)) return { text: "已开机", cls: "power-on" };
    if (offVals.includes(p)) return { text: "已关机", cls: "power-off" };
  }
  if (l) {
    const lockOnVals = ["0", "未锁", "开锁", "unlocked", "false", "open", "已开锁", "未锁车"];
    const lockOffVals = ["1", "已锁", "锁车", "locked", "true", "closed", "已锁车"];
    if (lockOnVals.includes(l)) return { text: "已开机", cls: "power-on" };
    if (lockOffVals.includes(l)) return { text: "已关机", cls: "power-off" };
  }
  return { text: "状态未知", cls: "power-unknown" };
}

// 在线状态（4G/TBOX）：1/online/true/在线=在线，0/offline/false/离线=离线，取不到返回空串不显示
function getOnlineDisplay(online) {
  const s = String(online || "").toLowerCase().trim();
  if (!s) return { text: "", cls: "" };
  const onVals = ["1", "on", "online", "true", "在线", "已在线", "connected", "normal"];
  const offVals = ["0", "off", "offline", "false", "离线", "未在线", "已离线", "disconnect", "disconnected", "sleep", "休眠"];
  if (onVals.includes(s)) return { text: "在线", cls: "online-on" };
  if (offVals.includes(s)) return { text: "离线", cls: "online-off" };
  // 其它非标准值原样展示（如 rideState 文本），用中性色
  return { text: String(online), cls: "online-unk" };
}
// 车锁状态：返回 {text,cls}，取不到返回空串
function getLockDisplay(lockState) {
  const s = String(lockState || "").toLowerCase().trim();
  if (!s) return { text: "", cls: "" };
  const unlocked = ["0", "未锁", "开锁", "unlocked", "false", "open", "已开锁", "未锁车"];
  const locked = ["1", "已锁", "锁车", "locked", "true", "closed", "已锁车"];
  if (unlocked.includes(s)) return { text: "未锁车", cls: "lock-unlocked" };
  if (locked.includes(s)) return { text: "已锁车", cls: "lock-locked" };
  return { text: String(lockState), cls: "lock-unk" };
}
// 坐垫状态：字段语义不确定，仅在有值时原样展示，不做开/合的武断映射
function getCushionDisplay(cushionState) {
  const s = String(cushionState || "").trim();
  if (!s) return "";
  const openVals = ["1", "open", "opened", "on", "true", "开", "已开", "打开", "弹开"];
  const closedVals = ["0", "close", "closed", "off", "false", "关", "已关", "闭合", "关闭"];
  if (openVals.includes(s.toLowerCase())) return "坐垫已开";
  if (closedVals.includes(s.toLowerCase())) return "坐垫已合";
  return "坐垫·" + s;
}
// 坐标是否有效（经纬度都是非空有限数、在合法区间、且不是 0,0）
function hasValidCoord(lat, lng) {
  if (lat === "" || lat === null || lat === undefined || lng === "" || lng === null || lng === undefined) return false;
  const la = Number(lat), ln = Number(lng);
  return isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
}

function renderDashboard(accounts, data, cfg, updateTime) {
  const totalScore = data.reduce((s, a) => s + (a.score || 0), 0);
  const signedCount = data.filter(a => a.signedToday).length;

  const cards = data.map((a, idx) => {
    // 盲盒30天一轮，满30第二天重置为第1天
    const blindDay = a.continueDays === 0 ? 0 : ((a.continueDays - 1) % 30) + 1;
    const blindRound = a.continueDays === 0 ? 0 : Math.ceil(a.continueDays / 30);
    const blindPct = Math.round((blindDay / 30) * 100);
    const blindRemain = 30 - blindDay;
    const last7 = a.last7.map(d => `
      <div class="day-cell ${d.signed ? 'day-ok' : 'day-miss'} ${d.isToday ? 'day-today' : ''}" title="${d.date}">
        <span class="day-num">${d.date.slice(3)}</span>
        <span class="day-mark">${d.signed ? '✓' : '—'}</span>
      </div>`).join('');

    // 充电状态判断和预计充满时间
    const v = a.vehicle || {};
    const isCharging = v.chargeState && v.chargeState !== "未充电";
    let chargeEta = "";
    if (isCharging && v.voltage && v.current && v.current > 0 && v.batteryPercent < 100) {
      const batteryCap = 1440; // 估算72V20Ah
      const remainWh = (100 - v.batteryPercent) / 100 * batteryCap;
      const powerW = v.voltage * v.current;
      const hours = remainWh / powerW;
      if (hours >= 1) chargeEta = "约" + hours.toFixed(1) + "小时充满";
      else chargeEta = "约" + Math.round(hours * 60) + "分钟充满";
    }
    // 开关机状态（优先电源字段，其次用车锁推断）
    const powerDisplay = getPowerDisplay(v.powerStatus, v.lockState);
    // 实时状态：在线 / 车锁 / 坐垫（取不到则对应为空，不渲染）
    const onlineDisplay = getOnlineDisplay(v.online || v.rideState);
    const lockDisplay = getLockDisplay(v.lockState);
    const cushionText = getCushionDisplay(v.cushionState);
    const coordOk = hasValidCoord(v.latitude, v.longitude);

    return `
    <div class="acc-card ${a.error ? 'acc-error' : ''}">
      <div class="acc-head">
        <div class="acc-avatar">${(a.userName || '?').charAt(0).toUpperCase()}</div>
        <div class="acc-info">
          <div class="acc-name">${a.userName}</div>
        </div>
        <div class="acc-badge ${a.signedToday ? 'badge-ok' : 'badge-miss'}">${a.signedToday ? '已签到' : '未签到'}</div>
        <div class="token-badge ${a.tokenValid === false ? 'token-invalid' : 'token-valid'}" title="${a.tokenValid === false ? (a.tokenReason || 'token失效') : 'token正常'}">${a.tokenValid === false ? '⚠️失效' : '✓正常'}</div>
      <button class="acc-signin-btn" onclick="runSignin('${a.userId}')" title="立即签到此账号">签到</button>
      </div>
      ${a.error ? `<div class="acc-err-msg">${a.error}</div>` : ''}
      <div class="acc-kpi">
        <div class="kpi-item"><div class="kpi-val num">${a.score.toLocaleString()}</div><div class="kpi-lbl">总积分</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#10B981">+${a.todayScore}</div><div class="kpi-lbl">今日积分</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#0891B2">${a.continueDays}</div><div class="kpi-lbl">连签天数</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#8B5CF6">${blindRemain}</div><div class="kpi-lbl">距盲盒</div></div>
      </div>
      <div class="blind-section">
        <div class="blind-label"><span>盲盒进度（第${blindRound}轮）</span><span class="num">${blindDay}/30 · ${blindPct}%</span></div>
        <div class="blind-bar"><div class="blind-fill" style="width:${blindPct}%"></div></div>
      </div>
      <div class="week-section">
        <div class="week-label">近 7 天签到</div>
        <div class="week-grid">${last7}</div>
      </div>
      ${a.vehicle && !a.vehicle.hasVehicle ? `<div class="no-vehicle-tip">🚗 该账号未绑定车辆</div>` : ''}
      ${a.vehicle && a.vehicle.hasVehicle ? `
      <div class="vehicle-section" onclick="showVehicleDetail(${idx})" style="cursor:pointer">
        <div class="vehicle-label">
          <span>🚗 ${a.vehicle.vehicleName || "车辆"} ${a.vehicle.vinNo ? `<span class="vin-no" id="vin_mask_${idx}">${maskVin(a.vehicle.vinNo)}</span><button type="button" class="vin-toggle-btn" onclick="event.stopPropagation();toggleVin(${idx},this)">显示</button>` : ""}</span>
          <span class="vbadge-group">
            ${onlineDisplay.text ? `<span class="vehicle-online ${onlineDisplay.cls}" title="车辆网络在线状态">${onlineDisplay.text}</span>` : ""}
            <span class="vehicle-charge ${isCharging ? "charging" : ""}">${a.vehicle.chargeState || "未充电"}</span>
            <span class="vehicle-power ${powerDisplay.cls}">${powerDisplay.text}</span>
          </span>
        </div>
        ${(lockDisplay.text || cushionText) ? `
        <div class="vehicle-status-row">
          ${lockDisplay.text ? `<span class="vstat ${lockDisplay.cls}">🔒 ${lockDisplay.text}</span>` : ""}
          ${cushionText ? `<span class="vstat vstat-cushion">💺 ${cushionText}</span>` : ""}
        </div>` : ""}
        ${isCharging ? `
        <div class="charge-progress-row">
          <div class="charge-progress-info">
            <span class="charge-icon">⚡</span>
            <span class="charge-percent">充电中 ${a.vehicle.batteryPercent}%</span>
            ${a.vehicle.batteryPercent >= 100 ? `<span class="charge-eta">已充满</span>` : (chargeEta ? `<span class="charge-eta">${chargeEta}</span>` : "")}
          </div>
        </div>` : ""}
        <div class="vehicle-kpi">
          <div class="v-kpi">
            <div class="v-kpi-val" style="color:${a.vehicle.batteryPercent <= 20 ? "#EF4444" : a.vehicle.batteryPercent <= 50 ? "#F59E0B" : "#0891B2"}">${a.vehicle.batteryPercent}%</div>
            <div class="v-kpi-lbl">电量SOC</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.rangeEstimated ? "约" + a.vehicle.residualRangeKm : a.vehicle.residualRangeKm}</div>
            <div class="v-kpi-lbl">续航km</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.todayDistance ? a.vehicle.todayDistance.toFixed(1) : "0"}</div>
            <div class="v-kpi-lbl">今日km</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.todayDuration || 0}</div>
            <div class="v-kpi-lbl">骑行min</div>
          </div>
        </div>
        <div class="vehicle-bar">
          <div class="vehicle-bar-fill" style="width:${a.vehicle.batteryPercent}%;background:${a.vehicle.batteryPercent <= 20 ? "#EF4444" : a.vehicle.batteryPercent <= 50 ? "#F59E0B" : "#0891B2"}"></div>
        </div>
        ${(a.vehicle.frontPressure || a.vehicle.rearPressure) ? `
        <div class="tire-row">
          <div class="tire-item"><span class="tire-icon">🛞</span>前 ${a.vehicle.frontPressure || "-"} ${a.vehicle.frontTemp ? `<span class="tire-temp">${a.vehicle.frontTemp}</span>` : ""}</div>
          <div class="tire-item"><span class="tire-icon">🛞</span>后 ${a.vehicle.rearPressure || "-"} ${a.vehicle.rearTemp ? `<span class="tire-temp">${a.vehicle.rearTemp}</span>` : ""}</div>
        </div>` : ""}
        ${(a.vehicle.voltage || (isCharging && a.vehicle.current) || a.vehicle.batteryTemp || a.vehicle.powerUseToday > 0 || a.vehicle.powerUseMonth > 0 || a.vehicle.powerChargeMonth > 0 || a.vehicle.chargeCount > 0) ? `
        <div class="battery-row">
          ${a.vehicle.voltage ? `<div class="battery-item"><span class="battery-icon">⚡</span>电压 ${a.vehicle.voltage.toFixed(1)}V</div>` : ""}
          ${isCharging && a.vehicle.current ? `<div class="battery-item"><span class="battery-icon">🔌</span>电流 ${a.vehicle.current.toFixed(1)}A</div>` : ""}
          ${a.vehicle.batteryTemp ? `<div class="battery-item"><span class="battery-icon">🌡️</span>电池温度 ${a.vehicle.batteryTemp.toFixed(0)}°C</div>` : ""}
          ${a.vehicle.powerUseToday > 0 ? `<div class="battery-item"><span class="battery-icon">📉</span>今日耗电 ${a.vehicle.powerUseToday.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.powerUseMonth > 0 ? `<div class="battery-item"><span class="battery-icon">📊</span>本月耗电 ${a.vehicle.powerUseMonth.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.powerChargeMonth > 0 ? `<div class="battery-item"><span class="battery-icon">🔋</span>本月充电 ${a.vehicle.powerChargeMonth.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.chargeCount > 0 ? `<div class="battery-item"><span class="battery-icon">🔁</span>充电次数 ${a.vehicle.chargeCount}</div>` : ""}
        </div>` : ""}
        ${a.vehicle.serviceEndDate ? `
        <div class="service-row">
          <span class="service-icon">📅</span>
          <span class="service-text">服务到期 ${a.vehicle.serviceEndDate}</span>
        </div>` : ""}
        ${(a.vehicle.address || coordOk) ? `
        <div class="vehicle-addr">
          <span class="addr-text">📍 ${a.vehicle.address || "已获取GPS定位"}${a.vehicle.locationTime ? ` <span class="loc-time">· ${a.vehicle.locationTime}</span>` : ""}</span>
          <button type="button" class="map-btn ${coordOk ? "" : "map-btn-disabled"}" ${coordOk ? `onclick="event.stopPropagation();openMap(${idx})"` : "disabled title=\"暂无有效GPS坐标\""}>🗺️ 地图</button>
        </div>` : ""}
        <div class="vehicle-ctrl" onclick="event.stopPropagation()">
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','find',this,'${v.vinNo || ''}')">🔔 寻车</button>
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','loudFind',this,'${v.vinNo || ''}')">📣 鸣笛</button>
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','cushion',this,'${v.vinNo || ''}')">💺 坐垫</button>
          <button class="vctrl-btn vctrl-unlock" onclick="vehicleCtrl('${a.userId}','unlock',this,'${v.vinNo || ''}')">🔓 开锁</button>
          <button class="vctrl-btn vctrl-lock" onclick="vehicleCtrl('${a.userId}','lock',this,'${v.vinNo || ''}')">🔒 关锁</button>
          <button class="vctrl-btn vctrl-dashcam" id="dashcam-btn-${idx}" onclick="event.stopPropagation();openDashcam(${idx},this)">📹 行车记录仪</button>
        </div>
      </div>` : ""}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>极核 ZEEHO 签到面板</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#F0F4F8;color:#0F172A;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.num{font-variant-numeric:tabular-nums}
.topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0}
.brand-text h1{font-size:15px;font-weight:700}
.brand-text p{font-size:11px;color:#94A3B8;margin-top:1px}
.top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.stat-chip{font-size:12px;color:#475569;background:#F1F5F9;padding:5px 12px;border-radius:14px;display:flex;align-items:center;gap:5px}
.stat-chip .dot{width:7px;height:7px;border-radius:50%;background:#10B981}
.nav-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;text-decoration:none;display:inline-block;transition:all .15s;font-family:inherit}
.nav-btn:hover{background:#F1F5F9}
.nav-btn.primary{background:#0891B2;color:#fff;border-color:#0891B2}
.nav-btn.primary:hover{background:#0E7490}
.container{max-width:1100px;margin:0 auto;padding:18px 16px 40px}
.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.summary-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;position:relative;overflow:hidden}
.summary-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.summary-card.s1::before{background:#F59E0B}
.summary-card.s2::before{background:#0891B2}
.summary-card.s3::before{background:#10B981}
.summary-card .sl{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:500}
.summary-card .sv{font-size:26px;font-weight:900;margin-top:4px}
.summary-card .ss{font-size:11px;color:#64748B;margin-top:3px}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.acc-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:16px;transition:box-shadow .2s}
.acc-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.06)}
.acc-card.acc-error{border-color:#FCA5A5;background:#FEF2F2}
.acc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.acc-avatar{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0891B2,#0E7490);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
.acc-info{flex:1;min-width:0}
.acc-name{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-uid{font-size:11px;color:#94A3B8;margin-top:1px}
.acc-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:10px;flex-shrink:0}
.badge-ok{background:#D1FAE5;color:#065F46}
.badge-miss{background:#FEE2E2;color:#991B1B}
.acc-err-msg{font-size:11px;color:#DC2626;background:#FEE2E2;padding:6px 10px;border-radius:6px;margin-bottom:10px}
.acc-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.kpi-item{text-align:center;background:#F8FAFC;border-radius:8px;padding:8px 4px}
.kpi-val{font-size:18px;font-weight:800;color:#0F172A}
.kpi-lbl{font-size:10px;color:#94A3B8;margin-top:2px}
.blind-section{margin-bottom:12px}
.blind-label{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;margin-bottom:5px;font-weight:500}
.blind-bar{height:18px;background:#F1F5F9;border-radius:9px;overflow:hidden;border:1px solid #E2E8F0}
.blind-fill{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:8px;transition:width .5s ease}
.week-section{}
.week-label{font-size:11px;color:#64748B;font-weight:500;margin-bottom:6px}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.day-cell{aspect-ratio:1;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px}
.day-ok{background:#E0F7FB;border:1px solid #7DD3FC;color:#0E7490}
.day-miss{background:#F1F5F9;border:1px dashed #E2E8F0;color:#CBD5E1}
.day-today{background:#0891B2;border:1px solid #0E7490;color:#fff;box-shadow:0 0 0 2px #E0F7FB}
.day-num{font-weight:700;font-size:10px}
.day-mark{font-size:8px;margin-top:1px}
.vehicle-section{margin-top:12px;padding-top:12px;border-top:1px solid #F1F5F9}
.vehicle-label{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:#0F172A;margin-bottom:8px}
.vin-no{font-size:10px;color:#94A3B8;font-family:monospace;margin-left:6px;word-break:break-all;display:inline-block;max-width:140px}
.vin-toggle-btn{border:1px solid #CBD5E1;background:#fff;color:#0891B2;border-radius:6px;font-size:10px;font-weight:600;padding:1px 7px;margin-left:5px;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit;vertical-align:middle}
.vin-toggle-btn:active{transform:scale(.94)}
.vehicle-charge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;background:#F1F5F9;color:#64748B}
.vehicle-charge.charging{background:#D1FAE5;color:#065F46}
.vehicle-power{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;margin-left:4px}
.vehicle-power.power-on{background:#D1FAE5;color:#065F46}
.vehicle-power.power-off{background:#F1F5F9;color:#64748B}
.vehicle-power.power-unknown{background:#FEF3C7;color:#92400E}
.vehicle-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.v-kpi{text-align:center;background:#F8FAFC;border-radius:6px;padding:6px 2px}
.v-kpi-val{font-size:14px;font-weight:800;color:#0F172A}
.v-kpi-lbl{font-size:9px;color:#94A3B8;margin-top:1px}
.vehicle-bar{height:10px;background:#F1F5F9;border-radius:5px;overflow:hidden;margin-bottom:8px}
.vehicle-bar-fill{height:100%;border-radius:5px;transition:width .5s ease}
.tire-row{display:flex;gap:12px;margin-bottom:6px}
.tire-item{font-size:11px;color:#475569;display:flex;align-items:center;gap:4px}
.tire-icon{font-size:12px}
.tire-temp{color:#0EA5E9;font-size:10px}
.battery-row{display:flex;gap:12px;margin-bottom:6px;flex-wrap:wrap}
.battery-item{font-size:11px;color:#475569;display:flex;align-items:center;gap:4px;background:#F8FAFC;padding:4px 8px;border-radius:6px}
.battery-icon{font-size:12px}
.charge-progress-row{margin-bottom:8px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:8px 10px}
.charge-progress-info{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.charge-icon{font-size:14px}
.charge-percent{font-size:13px;font-weight:700;color:#059669}
.charge-eta{font-size:11px;color:#059669;background:#D1FAE5;padding:2px 8px;border-radius:10px}
.vehicle-addr{font-size:10px;color:#94A3B8;margin-top:4px;display:flex;align-items:center;gap:6px}
.addr-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.loc-time{color:#CBD5E1;font-size:9px}
.map-btn{flex-shrink:0;border:1px solid #67E8F9;background:#ECFEFF;color:#0E7490;border-radius:6px;font-size:10px;font-weight:600;padding:3px 9px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.map-btn:active{transform:scale(.94)}
.map-btn.map-btn-disabled{opacity:.5;cursor:not-allowed;background:#F1F5F9;border-color:#E2E8F0;color:#94A3B8}
.vbadge-group{display:flex;align-items:center;gap:5px;flex-shrink:0}
.vehicle-online{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;display:inline-flex;align-items:center;gap:3px}
.vehicle-online.online-on{background:#D1FAE5;color:#065F46}
.vehicle-online.online-off{background:#F1F5F9;color:#64748B}
.vehicle-online.online-unk{background:#FEF3C7;color:#92400E}
.vehicle-status-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.vstat{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;background:#F1F5F9;color:#475569}
.vstat.lock-locked{background:#FEE2E2;color:#991B1B}
.vstat.lock-unlocked{background:#D1FAE5;color:#065F46}
.vstat.vstat-cushion{background:#EDE9FE;color:#5B21B6}
.log-filter{padding:5px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;color:#334155;outline:none}
.log-tag{display:inline-block;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px;margin-right:6px;vertical-align:middle}
.log-tag.tag-signin{background:#E0F7FB;color:#0E7490}
.log-tag.tag-vehicle{background:#FEF3C7;color:#92400E}
.vehicle-ctrl{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:9px;padding-top:9px;border-top:1px dashed #E2E8F0}
.vctrl-btn{border:1px solid #CBD5E1;background:#F8FAFC;color:#334155;border-radius:8px;padding:7px 2px;font-size:11px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s}
.vctrl-btn:active{transform:scale(.94)}
.vctrl-btn:disabled{opacity:.55;cursor:not-allowed}
.vctrl-btn.vctrl-unlock{border-color:#86EFAC;background:#F0FDF4;color:#15803D}
.vctrl-btn.vctrl-lock{border-color:#FCA5A5;background:#FEF2F2;color:#B91C1C}
.service-row{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#475569;flex-wrap:wrap}
.service-icon{font-size:12px}
.service-text{font-weight:600}
.service-remain{color:#0891B2;background:#E0F7FB;padding:1px 6px;border-radius:6px;font-size:10px}
.service-expired{color:#DC2626;background:#FEE2E2;padding:1px 6px;border-radius:6px;font-size:10px}
.no-vehicle-tip{margin-top:10px;padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:11px;color:#B45309;text-align:center}
.footer{text-align:center;padding:20px;font-size:11px;color:#94A3B8;margin-top:10px}
.footer a{color:#0891B2;text-decoration:none}
.empty-state{text-align:center;padding:60px 20px;color:#94A3B8}
.empty-state p{font-size:14px;margin-bottom:6px}
.empty-state .hint{font-size:12px;opacity:.7}
.config-info{font-size:10px;color:#94A3B8;margin-top:8px;text-align:center}
.token-badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:8px;flex-shrink:0;margin-left:6px}
.token-valid{background:#D1FAE5;color:#065F46}
.token-invalid{background:#FEE2E2;color:#991B1B}
.acc-signin-btn{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid #0891B2;background:#fff;color:#0891B2;cursor:pointer;flex-shrink:0;margin-left:6px;font-family:inherit}
.acc-signin-btn:hover{background:#0891B2;color:#fff}
.log-item{padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:12px}
.log-item:last-child{border-bottom:none}
.log-time{color:#94A3B8;font-size:11px;margin-bottom:2px}
.log-user{font-weight:700;color:#0F172A;margin-right:8px}
.log-result{color:#10B981;font-weight:600}
.log-result.err{color:#DC2626}
.log-steps{color:#64748B;margin-top:4px;font-size:11px;line-height:1.6}
@media(max-width:640px){.summary-row{grid-template-columns:1fr}.cards-grid{grid-template-columns:1fr}.acc-kpi{grid-template-columns:repeat(2,1fr)}.topbar{padding:12px 14px}.container{padding:14px 12px 30px}}
</style></head><body>
<div class="topbar">
  <div class="brand"><div class="brand-mark">Z</div><div class="brand-text"><h1>极核 ZEEHO 签到面板</h1><p>${data.length} 个账号 · 实时数据</p></div></div>
  <div class="top-actions">
    <div class="stat-chip"><span class="dot"></span><span id="signedInfo">${signedCount}/${data.length} 已签到</span></div>
    <button class="nav-btn" onclick="switchTab('dashboard')">数据</button>
    <button class="nav-btn" onclick="switchTab('logs')">日志</button>
    <a href="/config" class="nav-btn">配置</a>
    <button class="nav-btn primary" onclick="runAllSignin()">立即签到</button>
    <button class="nav-btn" id="autoRefreshBtn" onclick="toggleAutoRefresh()" style="background:#0891B2;color:#fff">自动刷新(${cfg.autoRefreshSec || 60}s)</button>
    <button class="nav-btn" onclick="location.reload()">刷新</button>
  </div>
</div>
<div class="container" id="dashboardPage">
  ${data.length === 0 ? `
  <div class="empty-state">
    <p>未找到极核账号</p>
    <p class="hint">请先在「配置」页面添加账号（Authorization Bearer token），或运行签到脚本抓 Cookie</p>
    <a href="/config" class="nav-btn primary" style="margin-top:16px">去添加账号</a>
  </div>` : `
  <div class="summary-row">
    <div class="summary-card s1"><div class="sl">账号总积分</div><div class="sv num">${totalScore.toLocaleString()}</div><div class="ss">${data.length} 个账号合计</div></div>
    <div class="summary-card s2"><div class="sl">今日签到</div><div class="sv num">${signedCount} / ${data.length}</div><div class="ss">${data.length - signedCount > 0 ? (data.length - signedCount) + ' 个未签到' : '全部已签到'}</div></div>
    <div class="summary-card s3"><div class="sl">数据更新时间</div><div class="sv" style="font-size:18px;padding-top:6px">${updateTime}</div><div class="ss">来自代理工具实时 API</div></div>
  </div>
  <div class="cards-grid">${cards}</div>
  <div class="config-info">App端 appId: ${cfg.app.appId} · H5端 appId: ${cfg.h5.appId} · 可在「配置」页修改</div>
  `}
</div>
<!-- 运行日志页面 -->
<div id="logsPage" style="display:none">
  <div class="panel" style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:16px;overflow:hidden">
    <div class="panel-head" style="padding:14px 18px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between">
      <div class="panel-title" style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px"><span class="bar" style="width:3px;height:14px;border-radius:2px;background:#8B5CF6"></span>运行日志（最近50条）</div>
      <div style="display:flex;align-items:center;gap:8px">
        <select id="logFilter" class="log-filter" onchange="loadLogs()">
          <option value="all">全部类型</option>
          <option value="signin">仅签到</option>
          <option value="vehicle">仅控车</option>
        </select>
        <button class="nav-btn" onclick="clearLogs()" style="padding:5px 12px;font-size:11px">清空日志</button>
      </div>
    </div>
    <div id="logsList" style="padding:14px 18px;max-height:70vh;overflow-y:auto"></div>
  </div>
</div>

<!-- 签到结果弹窗 -->
<div id="signinModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px">
  <div style="background:#fff;border-radius:14px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h3 style="font-size:16px;font-weight:700">签到执行结果</h3>
      <button onclick="closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94A3B8">×</button>
    </div>
    <div id="signinResult"></div>
  </div>
</div>

<!-- 车辆详情弹窗 -->
<div id="vehicleModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:16px;font-weight:700" id="vModalTitle">车辆详情</h3>
      <button onclick="closeVehicleModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94A3B8">×</button>
    </div>
    <div id="vehicleDetailContent"></div>
  </div>
</div>

<div class="footer">极核 ZEEHO 签到看板 · 作者 <a href="https://github.com/cluck798">lucky</a> · 数据来自代理工具实时 API<br><span style="font-size:10px;color:#CBD5E1;margin-top:4px;display:inline-block">脚本版本 ${SCRIPT_VERSION}</span></div>
<script>
var vehicleDataList = ${JSON.stringify(data.map(function(a){ return a.vehicle || {}; }))};
var AUTO_REFRESH_SEC = ${cfg.autoRefreshSec || 60};
var autoRefreshTimer = null;
var autoRefreshCountdown = AUTO_REFRESH_SEC;
// 浏览器端坐标校验（与后端 hasValidCoord 同逻辑，独立一份供浏览器内函数调用）
function hasValidCoord(lat, lng) { if (lat === "" || lat === null || lat === undefined || lng === "" || lng === null || lng === undefined) return false; lat = Number(lat); lng = Number(lng); return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0); }
// 跳转地图查看车辆定位：iPhone 优先苹果地图（q=纬度,经度）；坐标非法时提示
function openMap(idx) {
  var v = vehicleDataList[idx]; if (!v) return;
  if (!hasValidCoord(v.latitude, v.longitude)) { showToast('暂无有效GPS坐标', 'err'); return; }
  var lat = Number(v.latitude), lng = Number(v.longitude);
  var url = 'https://maps.apple.com/?q=' + lat + ',' + lng + '&z=17';
  window.open(url, '_blank');
}
// 行车记录仪 RTSP 实时预览（iOS/Android 原生桥接，Loon/QX 等纯代理环境无 effect）
// 用户需先在系统设置连接行车记录仪 WiFi（默认 SSID: ZEEHO-DashCam, IP: 192.168.49.1）
function openDashcam(idx, btn) {
  if (typeof window.dashcamHandler !== 'function') {
    showToast('当前环境不支持行车记录仪预览（需 iOS/Android 原生 App）', 'err');
    return;
  }
  // 先 check 探测，再 play 调起播放器
  if (btn) { btn.disabled = true; btn.textContent = '📹 探测中…'; }
  window.dashcamHandler('check', function(ok) {
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = '📹 行车记录仪'; }
      showToast('未连接行车记录仪 WiFi，请在系统设置连接（SSID: ZEEHO-DashCam）', 'err');
      return;
    }
    // 探测成功 → 调起全屏播放器
    window.dashcamHandler('play', function(played) {
      if (btn) { btn.disabled = false; btn.textContent = '📹 行车记录仪'; }
      if (!played) showToast('打开播放器失败', 'err');
    });
  });
}
function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshCountdown = AUTO_REFRESH_SEC;
  updateAutoRefreshBtn();
  autoRefreshTimer = setInterval(function() {
    autoRefreshCountdown--;
    // 负数保护
    if (autoRefreshCountdown < 0) autoRefreshCountdown = 0;
    updateAutoRefreshBtn();
    if (autoRefreshCountdown <= 0) {
      if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
      location.reload();
    }
  }, 1000);
}
function updateAutoRefreshBtn() {
  var btn = document.getElementById('autoRefreshBtn');
  if (btn) btn.textContent = '自动刷新(' + autoRefreshCountdown + 's)';
}
function toggleAutoRefresh() {
  var btn = document.getElementById('autoRefreshBtn');
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    btn.textContent = '开启自动刷新';
    btn.style.background = '#fff';
    btn.style.color = '#475569';
  } else {
    startAutoRefresh();
    btn.style.background = '#0891B2';
    btn.style.color = '#fff';
  }
}
startAutoRefresh();
function switchTab(tab) {
  document.getElementById('dashboardPage').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.getElementById('logsPage').style.display = tab === 'logs' ? 'block' : 'none';
  if (tab === 'logs') loadLogs();
}
function loadLogs() {
  var filterEl = document.getElementById('logFilter');
  var filter = filterEl ? filterEl.value : 'all';
  fetch('/api/get-logs').then(function(r){return r.json()}).then(function(d){
    var list = document.getElementById('logsList');
    var all = d.logs || [];
    if (all.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">暂无运行日志</div>';
      return;
    }
    // 旧日志没有 type 字段，统一按签到(signin)兜底，避免历史记录在筛选时被吞掉
    var logs = all.filter(function(log){
      var t = log.type || 'signin';
      if (filter === 'all') return true;
      return t === filter;
    });
    if (logs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">该分类下暂无日志</div>';
      return;
    }
    list.innerHTML = logs.map(function(log){
      var t = log.type || 'signin';
      var tag = t === 'vehicle' ? '<span class="log-tag tag-vehicle">控车</span>' : '<span class="log-tag tag-signin">签到</span>';
      var result = '';
      if (t === 'vehicle') {
        result = '<span class="log-result '+(log.success?'':'err')+'">'+(log.actionText || '车辆控制')+' '+(log.success ? '成功' : ('失败：'+(log.message || log.error || '未知')))+'</span>';
      } else {
        result = '<span class="log-result '+(log.success?'':'err')+'">'+(log.success?('成功 +'+log.totalGain):('失败: '+(log.error||'未知')))+'</span>';
      }
      var steps = log.steps ? log.steps.map(function(s){return '<div>· '+s+'</div>'}).join('') : '';
      return '<div class="log-item"><div class="log-time">'+log.time+'</div><div>'+tag+'<span class="log-user">'+(log.userName || '')+'</span>'+result+'</div>'+(steps?'<div class="log-steps">'+steps+'</div>':'')+'</div>';
    }).join('');
  }).catch(function(){document.getElementById('logsList').innerHTML='<div style="text-align:center;padding:40px;color:#DC2626">加载失败</div>'});
}
function clearLogs() {
  if (!confirm('确定清空所有运行日志？')) return;
  fetch('/api/clear-logs',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
    if (d.ok) { loadLogs(); showToast('日志已清空'); }
  });
}
function runAllSignin() {
  if (!confirm('确定立即执行所有账号签到？')) return;
  showToast('正在执行签到...');
  fetch('/api/run-signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})})
    .then(function(r){return r.json()})
    .then(function(d){ showSigninResult(d); })
    .catch(function(){ showToast('执行失败','err'); });
}
function runSignin(userId) {
  showToast('正在签到...');
  fetch('/api/run-signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:userId})})
    .then(function(r){return r.json()})
    .then(function(d){ showSigninResult(d); })
    .catch(function(){ showToast('执行失败','err'); });
}
function showSigninResult(d) {
  var modal = document.getElementById('signinModal');
  var result = document.getElementById('signinResult');
  modal.style.display = 'flex';
  var html = '';
  if (d.results && d.results.length > 0) {
    html = d.results.map(function(r){
      var steps = r.steps ? r.steps.map(function(s){return '<div style="color:#64748B;font-size:12px;margin:2px 0">· '+s+'</div>'}).join('') : '';
      return '<div style="padding:12px;border:1px solid '+(r.success?'#D1FAE5':'#FEE2E2')+';border-radius:10px;margin-bottom:10px;background:'+(r.success?'#F0FDF4':'#FEF2F2')+'"><div style="font-weight:700;font-size:14px;margin-bottom:4px">'+r.userName+' <span style="color:'+(r.success?'#10B981':'#DC2626')+';font-size:12px">'+(r.success?('成功 +'+r.totalGain):'失败')+'</span></div>'+(r.error?'<div style="color:#DC2626;font-size:12px">'+r.error+'</div>':'')+steps+'</div>';
    }).join('');
  } else {
    html = '<div style="text-align:center;color:#94A3B8;padding:20px">无结果</div>';
  }
  result.innerHTML = html;
  setTimeout(function(){ location.reload(); }, 3000);
}
function closeModal() {
  document.getElementById('signinModal').style.display = 'none';
}
// 注意：vehicleDataList 已在看板脚本顶部渲染时注入真实车辆数据，此处禁止再用空数组覆盖，
// 否则卡片车架号“显示”按钮、车辆详情弹窗都会因取不到 vehicleDataList[idx] 而无反应
function showVehicleDetail(idx) {
  var v = vehicleDataList[idx];
  if (!v) return;
  var modal = document.getElementById('vehicleModal');
  var content = document.getElementById('vehicleDetailContent');
  document.getElementById('vModalTitle').textContent = v.vehicleName || '车辆详情';
  var rows = [];
  if (v.vinNo) rows.push('<div class="v-detail-row"><span class="v-detail-label">车架号</span><span><span class="v-detail-val" id="vin_detail_mask" style="font-family:monospace;font-size:12px">'+maskVin(v.vinNo)+'</span> <button type="button" class="vin-toggle-btn" onclick="toggleDetailVin('+idx+',this)">显示</button></span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">充电状态</span><span class="v-detail-val">'+(v.chargeState || '未充电')+'</span></div>');
  // 电源状态（开关机）：优先电源字段，其次用车锁推断（开锁=上电/开机，锁车=下电/关机）
  var powerText = "状态未知", powerColor = "#92400E";
  var p = String(v.powerStatus || "").toLowerCase().trim();
  var l = String(v.lockState || "").toLowerCase().trim();
  var onVals = ["1","on","true","开机","open","激活","acc_on","acc on","power_on","power on","已开机","已上电"];
  var offVals = ["0","off","false","关机","closed","待机","acc_off","acc off","power_off","power off","已关机","已下电"];
  if (p) {
    if (onVals.indexOf(p) >= 0) { powerText = "已开机"; powerColor = "#065F46"; }
    else if (offVals.indexOf(p) >= 0) { powerText = "已关机"; powerColor = "#64748B"; }
  } else if (l) {
    var lockOnVals = ["0","未锁","开锁","unlocked","false","open","已开锁","未锁车"];
    var lockOffVals = ["1","已锁","锁车","locked","true","closed","已锁车"];
    if (lockOnVals.indexOf(l) >= 0) { powerText = "已开机"; powerColor = "#065F46"; }
    else if (lockOffVals.indexOf(l) >= 0) { powerText = "已关机"; powerColor = "#64748B"; }
  }
  rows.push('<div class="v-detail-row"><span class="v-detail-label">电源状态</span><span class="v-detail-val" style="color:'+powerColor+'">'+powerText+'</span></div>');
  if (v.rideState || v.online) rows.push('<div class="v-detail-row"><span class="v-detail-label">车辆状态</span><span class="v-detail-val">'+(v.rideState || v.online)+'</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">电量SOC</span><span class="v-detail-val" style="font-weight:700;color:'+(v.batteryPercent<=20?'#EF4444':v.batteryPercent<=50?'#F59E0B':'#0891B2')+'">'+v.batteryPercent+'%</span></div>');
  if (v.voltage) rows.push('<div class="v-detail-row"><span class="v-detail-label">电压</span><span class="v-detail-val">'+v.voltage.toFixed(1)+'V</span></div>');
  if (v.current) rows.push('<div class="v-detail-row"><span class="v-detail-label">电流</span><span class="v-detail-val">'+v.current.toFixed(1)+'A</span></div>');
  if (v.batteryTemp) rows.push('<div class="v-detail-row"><span class="v-detail-label">电池温度</span><span class="v-detail-val">'+v.batteryTemp.toFixed(0)+'°C</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">剩余续航</span><span class="v-detail-val">'+v.residualRangeKm+'km</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">今日骑行</span><span class="v-detail-val">'+(v.todayDistance?v.todayDistance.toFixed(1):0)+'km / '+(v.todayDuration||0)+'min</span></div>');
  var hasTire = (v.frontPressure && v.frontPressure !== "未绑定") || (v.rearPressure && v.rearPressure !== "未绑定");
  if (hasTire) rows.push('<div class="v-detail-row"><span class="v-detail-label">胎压</span><span class="v-detail-val">前'+(v.frontPressure||'-')+' / 后'+(v.rearPressure||'-')+'</span></div>');
  if (v.address) rows.push('<div class="v-detail-row"><span class="v-detail-label">车辆位置</span><span class="v-detail-val" style="font-size:12px">'+v.address+'</span></div>');
  var dCoordOk = hasValidCoord(v.latitude, v.longitude);
  if (dCoordOk) rows.push('<div class="v-detail-row"><span class="v-detail-label">GPS坐标</span><span class="v-detail-val" style="font-family:monospace;font-size:11px">'+Number(v.latitude).toFixed(6)+', '+Number(v.longitude).toFixed(6)+'</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">地图定位</span><span><button type="button" class="vin-toggle-btn" '+(dCoordOk ? 'onclick="openMap('+idx+')"' : 'disabled')+' style="'+(dCoordOk ? '' : 'opacity:.45;cursor:not-allowed')+'">🗺️ '+(dCoordOk ? '在地图中查看' : '暂无GPS坐标')+'</button></span></div>');
  if (v.locationTime) rows.push('<div class="v-detail-row"><span class="v-detail-label">最后定位</span><span class="v-detail-val" style="font-size:11px;color:#94A3B8">'+v.locationTime+'</span></div>');
  if (v.serviceEndDate) rows.push('<div class="v-detail-row"><span class="v-detail-label">服务到期</span><span class="v-detail-val">'+v.serviceEndDate+'</span></div>');
  content.innerHTML = '<div class="v-detail-container">'+rows.join('')+'</div><style>.v-detail-container{display:flex;flex-direction:column;gap:0}.v-detail-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9}.v-detail-row:last-child{border-bottom:none}.v-detail-label{font-size:12px;color:#64748B;font-weight:500}.v-detail-val{font-size:13px;color:#0F172A;font-weight:600}</style>';
  modal.style.display = 'flex';
}
function closeVehicleModal() {
  document.getElementById('vehicleModal').style.display = 'none';
}
// 车架号默认打码，点击“显示/隐藏”切换（卡片 & 详情弹窗）
function maskVin(v){ if(!v) return ''; v=String(v); if(v.length<=7) return '****'; return v.substring(0,3)+'****'+v.substring(v.length-4); }
function toggleVin(idx, btn){
  var v = vehicleDataList[idx]; if(!v||!v.vinNo) return;
  var el = document.getElementById('vin_mask_'+idx); if(!el) return;
  if(el.textContent.indexOf('*')>=0){ el.textContent=v.vinNo; btn.textContent='隐藏'; }
  else { el.textContent=maskVin(v.vinNo); btn.textContent='显示'; }
}
function toggleDetailVin(idx, btn){
  var v = vehicleDataList[idx]; if(!v||!v.vinNo) return;
  var el = document.getElementById('vin_detail_mask'); if(!el) return;
  if(el.textContent.indexOf('*')>=0){ el.textContent=v.vinNo; btn.textContent='隐藏'; }
  else { el.textContent=maskVin(v.vinNo); btn.textContent='显示'; }
}
// 车辆远程控制：寻车/鸣笛闪灯/开坐垫/云端开关锁（均真实控车，需二次确认）
// 2026-09-20 修复：增加 vin 参数，切换车辆后控车操作对应选中车辆
function vehicleCtrl(userId, action, btn, vin) {
  var names = { find:'短按寻车（车辆闪灯）', loudFind:'鸣笛闪灯（高声寻车）', cushion:'打开坐垫（坐垫会弹起）', unlock:'云端开锁', lock:'云端关锁' };
  var name = names[action] || action;
  if (!confirm('确定执行【' + name + '】吗？\\n该指令会通过 4G 网络真实控制你的车辆！')) return;
  var old = btn.textContent;
  btn.disabled = true; btn.textContent = '···';
  showToast('指令下发中…');
  fetch('/api/vehicle-control', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:userId, action:action, vin: vin || '' }) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      btn.disabled = false; btn.textContent = old;
      showToast(d.ok ? ('✅ ' + d.message) : ('❌ ' + (d.message || '指令失败')), d.ok ? '' : 'err');
    })
    .catch(function(e){
      btn.disabled = false; btn.textContent = old;
      showToast('❌ ' + e, 'err');
    });
}
function showToast(msg, type) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:10000;'+(type==='err'?'background:#EF4444;color:#fff':'background:#10B981;color:#fff');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2000);
}
</script>
</body></html>`;
}

// ========== HTML: 配置页 ==========
function renderConfig(accounts, cfg) {
  const accRows = accounts.map((a, idx) => `
    <div class="acc-row" data-idx="${idx}">
      <div class="acc-row-head">
        <span class="acc-row-title">账号 ${idx + 1}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="refreshUserId(${idx})" id="refresh_btn_${idx}">获取ID</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAccount(${idx})">删除</button>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-item"><label>昵称</label><input type="text" id="acc_name_${idx}" value="${a.userName || ''}" placeholder="lucky798"></div>
        <div class="form-item"><label>用户ID</label><input type="text" id="acc_uid_${idx}" value="${a.userId || ''}" placeholder="20251009..." style="font-family:monospace;font-size:12px"></div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>Authorization Token（直接粘贴即可，会自动去掉 Bearer 前缀）</label>
        <input type="text" id="acc_token_${idx}" value="${a.token || ''}" placeholder="a74779c7-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:monospace;font-size:12px">
      </div>
      <div class="form-item" style="margin-top:8px"><label>Bark 通知 Key（选填，仅该账号签到成功后推送，留空不推）</label>
        <input type="text" id="acc_bark_${idx}" value="${a.barkKey || ''}" placeholder="Bark App 内的 Key，或自建服务器 https://域名/Key" style="font-family:monospace;font-size:12px">
      </div>

    </div>`).join('');


  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>极核 ZEEHO · 配置</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#F0F4F8;color:#0F172A;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.num{font-variant-numeric:tabular-nums}
.topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0}
.brand-text h1{font-size:15px;font-weight:700}
.brand-text p{font-size:11px;color:#94A3B8;margin-top:1px}
.nav-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;text-decoration:none;display:inline-block;transition:all .15s;font-family:inherit}
.nav-btn:hover{background:#F1F5F9}
.nav-btn.primary{background:#0891B2;color:#fff;border-color:#0891B2}
.container{max-width:800px;margin:0 auto;padding:18px 16px 40px}
.panel{background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:16px;overflow:hidden}
.panel-head{padding:14px 18px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between}
.panel-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
.panel-title .bar{width:3px;height:14px;border-radius:2px;background:#0891B2}
.panel-body{padding:18px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-item{margin-bottom:0}
.form-item label{display:block;font-size:11px;color:#64748B;margin-bottom:4px;font-weight:500}
.form-item input,.form-item select{width:100%;padding:9px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:#FAFBFC}
.form-item input:focus{border-color:#0891B2;box-shadow:0 0 0 3px #E0F7FB}
.form-item.full{grid-column:1/-1}
.switch-label{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#334155;padding:8px 0}
.switch-label input[type="checkbox"]{width:18px;height:18px;accent-color:#0891B2;cursor:pointer}
.btn{padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;transition:all .15s;font-family:inherit}
.btn:hover{background:#F1F5F9}
.btn-primary{background:#0891B2;color:#fff;border-color:#0891B2}
.btn-primary:hover{background:#0E7490}
.btn-danger{background:#FEE2E2;color:#991B1B;border-color:#FECACA}
.btn-danger:hover{background:#FECACA}
.btn-sm{padding:5px 12px;font-size:11px}
.btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.acc-row{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:12px}
.acc-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.acc-row-title{font-size:13px;font-weight:700;color:#0F172A}
.hint{font-size:11px;color:#94A3B8;margin-top:6px;line-height:1.6}
.hint code{background:#F1F5F9;padding:1px 5px;border-radius:4px;font-size:11px}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.toast.ok{background:#10B981;color:#fff}
.toast.err{background:#EF4444;color:#fff}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}.container{padding:14px 12px 30px}}
</style></head><body>
<div class="topbar">
  <div class="brand"><div class="brand-mark">Z</div><div class="brand-text"><h1>极核 ZEEHO · 配置</h1><p>签名密钥 & 账号管理</p></div></div>
  <div><a href="/" class="nav-btn primary">返回面板</a></div>
</div>
<div class="container">

  <!-- 签名配置 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar"></span>签名密钥配置</div>
    </div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label>App端 appId</label><input type="text" id="cfg_app_id" value="${cfg.app.appId}"></div>
        <div class="form-item"><label>App端 appSecret</label><input type="text" id="cfg_app_secret" value="${cfg.app.appSecret}" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item"><label>H5端 appId</label><input type="text" id="cfg_h5_id" value="${cfg.h5.appId}"></div>
        <div class="form-item"><label>H5端 appSecret</label><input type="text" id="cfg_h5_secret" value="${cfg.h5.appSecret}" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item" style="grid-column:1/-1"><label>云端控车 AES 密钥（开/关锁，32位十六进制，已内置默认密钥可修改）</label><input type="text" id="cfg_vehicle_key" value="${cfg.vehicleAesKey || ''}" placeholder="已内置默认密钥；留空则回退默认" autocomplete="off" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item" style="grid-column:1/-1"><label>车控风险确认</label><div class="hint" style="margin-top:2px">无需在此填写：首次使用车控功能（寻车/鸣笛/坐垫/开关锁）时会弹窗告知风险，点击「我同意风险并使用」后自动启用。</div></div>
        <div class="form-item"><label>看板自动刷新间隔（秒，范围15~3600，默认60；填非法值自动回退60）</label><input type="number" min="15" max="3600" step="5" id="cfg_refresh_sec" value="${cfg.autoRefreshSec || 60}"></div>
      </div>
      <div class="hint">修改后点击「保存配置」生效。App/H5 密钥用于极核 API 签名计算（md5(sha1(param+secret))）；<b>云端控车密钥已内置默认值，可在此修改；车控风险确认在首次使用车控功能时弹窗完成。</b></div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveConfig()">保存配置</button>
        <button class="btn" onclick="resetConfig()">恢复默认</button>
      </div>
    </div>
  </div>

  <!-- 社区任务开关 -->
  <div class="panel">
    <div class="panel-head"><div class="panel-title"><span class="bar" style="background:#F59E0B"></span>社区任务开关</div></div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_post" ${cfg.community?.enablePost !== false ? "checked" : ""}> 发布动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_like" ${cfg.community?.enableLike !== false ? "checked" : ""}> 点赞动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_comment" ${cfg.community?.enableComment !== false ? "checked" : ""}> 评论动态（不加分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_share" ${cfg.community?.enableShare !== false ? "checked" : ""}> 分享动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_delete" ${cfg.community?.enableDelete !== false ? "checked" : ""}> 执行后删除动态</label></div>
      </div>
      <div class="hint">关闭对应开关后，签到脚本将跳过该任务。修改后点击下方「保存配置」生效。</div>
    </div>
  </div>

  <!-- 手机号登录 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar" style="background:#6366F1"></span>手机号登录（免抓包）</div>
    </div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label>手机号（极核 App 绑定号码）</label><input type="tel" id="pl_phone" placeholder="11 位手机号" style="font-family:monospace;font-size:13px"></div>
        <div class="form-item"><label>短信验证码</label><input type="text" id="pl_code" placeholder="6 位验证码" style="font-family:monospace;font-size:13px"></div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>登录 Basic Auth（可选，已内置极核App的OAuth2 client凭据，一般无需填写；抓包发现变化时才需覆盖）</label><input type="text" id="pl_basic" placeholder="默认已内置，留空即可" style="font-family:monospace;font-size:11px" autocomplete="off"></div>
      <div class="btn-row">
        <button class="btn btn-sm" onclick="sendSmsCode()" id="pl_send_btn">获取验证码</button>
        <button class="btn btn-primary" onclick="phoneLogin()" id="pl_login_btn">登录并添加账号</button>
      </div>
      <div class="hint">用手机号 + 短信验证码登录，自动获取 Token 与用户ID并加入账号列表，全程无需抓包。登录成功后会自动写入并刷新页面。<br>· 建议使用小号登录，因为极核是单会话模式（手机号登录情况下只能一台设备）。<br><b>已修复</b>（v2.14.4）：发码与登录统一走 App 网关（同一验证码池），登录签名按官方 App 抓包结果修正（POST 请求按 GET 风格入签），不再误报「验证码有误或已过期」。<br><b>提示</b>：验证码 5 分钟内有效，重复获取会使上一个验证码失效，请使用最新收到的那条。</div>
    </div>
  </div>

  <!-- 账号管理 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar" style="background:#10B981"></span>账号管理（${accounts.length} 个）</div>
      <button class="btn btn-sm" onclick="addAccount()">+ 添加账号</button>
    </div>
    <div class="panel-body">
      <div id="accList">${accRows || '<div style="text-align:center;padding:20px;color:#94A3B8;font-size:13px">暂无账号，点击上方「添加账号」</div>'}</div>
      <div class="hint">Token 格式：直接粘贴抓包得到的 Authorization 值即可，即使带了 <code>Bearer </code> 前缀，保存时也会自动去掉、只保留后面的 Token。<br>每账号可单独填 Bark Key：该账号签到成功后推送一条通知（标题含昵称、内容含得分明细），留空则该账号不推送；支持官方 Key 或自建服务器地址。<br>用户ID获取：打开极核App-我的，抓包 <code>/setting/{userId}</code> 接口，响应体 <code>data.id</code> 即为用户ID。</div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveAccounts()">保存极核账号</button>
      </div>
    </div>

  </div>

</div>
<div id="toast" class="toast"></div>
<script>
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || 'ok');
  setTimeout(function(){ t.className = 'toast'; }, 2000);
}
function saveConfig() {
  var data = {
    app: { appId: document.getElementById('cfg_app_id').value, appSecret: document.getElementById('cfg_app_secret').value },
    h5: { appId: document.getElementById('cfg_h5_id').value, appSecret: document.getElementById('cfg_h5_secret').value },
    vehicleAesKey: (document.getElementById('cfg_vehicle_key').value || '').trim(),
    vehicleControlRisk: (getConfig().vehicleControlRisk || ''),
    autoRefreshSec: Number(document.getElementById('cfg_refresh_sec').value),
    community: {
      enablePost: document.getElementById('comm_post').checked,
      enableLike: document.getElementById('comm_like').checked,
      enableComment: document.getElementById('comm_comment').checked,
      enableShare: document.getElementById('comm_share').checked,
      enableDelete: document.getElementById('comm_delete').checked
    }
  };
  fetch('/api/save-config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.ok){ showToast('配置已保存'); } else { showToast('保存失败', 'err'); } })
    .catch(function(){ showToast('保存失败', 'err'); });
}
function resetConfig() {
  document.getElementById('cfg_app_id').value = 'S7qPWPU1';
  document.getElementById('cfg_app_secret').value = 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d';
  document.getElementById('cfg_h5_id').value = 'Sw5F9uJi';
  document.getElementById('cfg_h5_secret').value = '46870a8f678a09109468f5b0168818b91c292845';
  document.getElementById('cfg_vehicle_key').value = '';
  document.getElementById('cfg_refresh_sec').value = 60;
  document.getElementById('comm_post').checked = true;
  document.getElementById('comm_like').checked = true;
  document.getElementById('comm_comment').checked = true;
  document.getElementById('comm_share').checked = true;
  document.getElementById('comm_delete').checked = true;
  showToast('已恢复默认（需点击保存）');
}
var accCount = ${accounts.length};
function addAccount() {
  accCount++;
  var idx = accCount - 1;
  var html = '<div class="acc-row" data-idx="'+idx+'"><div class="acc-row-head"><span class="acc-row-title">账号 '+accCount+'（新）</span><div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="refreshUserId('+idx+')" id="refresh_btn_'+idx+'">获取ID</button><button class="btn btn-sm btn-danger" onclick="deleteAccount('+idx+')">删除</button></div></div><div class="form-grid"><div class="form-item"><label>昵称</label><input type="text" id="acc_name_'+idx+'" placeholder="lucky798"></div><div class="form-item"><label>用户ID</label><input type="text" id="acc_uid_'+idx+'" placeholder="20251009..." style="font-family:monospace;font-size:12px"></div></div><div class="form-item" style="margin-top:8px"><label>Authorization Token（自动去掉 Bearer 前缀）</label><input type="text" id="acc_token_'+idx+'" placeholder="a74779c7-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:monospace;font-size:12px"></div><div class="form-item" style="margin-top:8px"><label>Bark 通知 Key（选填）</label><input type="text" id="acc_bark_'+idx+'" placeholder="Bark Key 或自建 https://域名/Key，留空不推" style="font-family:monospace;font-size:12px"></div></div>';
  var list = document.getElementById('accList');
  if (list.querySelector('.acc-row') || list.querySelector('[style*="text-align"]')) {
    list.insertAdjacentHTML('beforeend', html);
  } else {
    list.innerHTML = html;
  }
}
function deleteAccount(idx) {
  var row = document.querySelector('.acc-row[data-idx="'+idx+'"]');
  if (row) { row.remove(); showToast('已删除（需点击保存）'); }
}
function refreshUserId(idx) {
  var tokenEl = document.getElementById('acc_token_'+idx);
  var uidEl = document.getElementById('acc_uid_'+idx);
  var nameEl = document.getElementById('acc_name_'+idx);
  var btn = document.getElementById('refresh_btn_'+idx);
  if (!tokenEl || !tokenEl.value.trim()) { showToast('请先填写Token', 'err'); return; }
  btn.textContent = '获取中...';
  btn.disabled = true;
  fetch('/api/get-userid', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: tokenEl.value.trim()}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok && d.userId) {
        if (uidEl) uidEl.value = d.userId;
        if (nameEl && d.userName && !nameEl.value) nameEl.value = d.userName;
        showToast('获取成功: '+(d.userName||d.userId));
      } else {
        showToast('获取失败: '+(d.error||'未知错误'), 'err');
      }
    })
    .catch(function(){ showToast('获取失败', 'err'); })
    .finally(function(){ btn.textContent = '获取ID'; btn.disabled = false; });
}
function sendSmsCode() {
  var phoneEl = document.getElementById('pl_phone');
  var btn = document.getElementById('pl_send_btn');
  var phone = (phoneEl ? phoneEl.value : '').trim();
  if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号', 'err'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
  fetch('/api/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone: phone}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) { showToast(d.message || '验证码已发送'); }
      else { showToast(d.message || '发送失败', 'err'); }
      var t = 60;
      if (btn) {
        btn.textContent = t + 's 后重试';
        var iv = setInterval(function(){
          t--;
          if (t <= 0) { clearInterval(iv); btn.textContent = '获取验证码'; btn.disabled = false; }
          else { btn.textContent = t + 's 后重试'; }
        }, 1000);
      }
    })
    .catch(function(){ showToast('发送失败，请检查网络', 'err'); if (btn) { btn.disabled = false; btn.textContent = '获取验证码'; } });
}
function phoneLogin() {
  var phoneEl = document.getElementById('pl_phone');
  var codeEl = document.getElementById('pl_code');
  var basicEl = document.getElementById('pl_basic');
  var btn = document.getElementById('pl_login_btn');
  var phone = (phoneEl ? phoneEl.value : '').trim();
  var code = (codeEl ? codeEl.value : '').trim();
  var basic = (basicEl ? basicEl.value : '').trim();
  if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号', 'err'); return; }
  if (!code) { showToast('请输入短信验证码', 'err'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '登录中...'; }
  fetch('/api/phone-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone: phone, code: code, basicAuth: basic}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) {
        showToast(d.message || '登录成功，已添加账号');
        setTimeout(function(){ location.reload(); }, 900);
      } else {
        showToast(d.message || '登录失败', 'err');
        if (d.detail) console.log('登录诊断:', JSON.stringify(d.detail));
      }
    })
    .catch(function(){ showToast('登录失败，请检查网络', 'err'); })
    .finally(function(){ if (btn) { btn.disabled = false; btn.textContent = '登录并添加账号'; } });
}
function saveAccounts() {
  var rows = document.querySelectorAll('#accList .acc-row');
  var list = [];
  rows.forEach(function(row) {
    var idx = row.getAttribute('data-idx');
    var name = document.getElementById('acc_name_'+idx);
    var uid = document.getElementById('acc_uid_'+idx);
    var token = document.getElementById('acc_token_'+idx);
    var bark = document.getElementById('acc_bark_'+idx);
    if (token && token.value.trim()) {
      list.push({ userName: name ? name.value : '', userId: uid ? uid.value : '', token: token.value.trim(), barkKey: bark ? bark.value.trim() : '', userAgent: '' });
    }
  });
  fetch('/api/save-accounts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({accounts: list}) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.ok){ showToast('极核账号已保存'); setTimeout(function(){ location.reload(); }, 800); } else { showToast('保存失败', 'err'); } })
    .catch(function(){ showToast('保存失败', 'err'); });
}

</script>
<div style="text-align:center;padding:16px;font-size:10px;color:#CBD5E1">脚本版本 ${SCRIPT_VERSION} · 极核 ZEEHO</div>
</body></html>`;
}

// ========== 响应辅助（兼容 QX / Loon / Surge） ==========
function sendResp(status, headers, body) {
  // Loon 专用：$done 使用 response 包装
  // 强制 no-cache：面板 HTML 每次访问都拉取最新版本，避免浏览器缓存旧界面导致新功能不生效
  const h = Object.assign({}, headers || {}, {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  $done({ response: { status: status, headers: h, body: body } });
}
// ========== 主入口：重写路由 ==========
// ========== 整合版：极核 ZEEHO LITE 轻应用界面（base64 内嵌） ==========
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXNocmluazowO292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4yOCl9Ci5icmFuZC1tYXJrIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7b2JqZWN0LWZpdDpjb3Zlcn0KLmJyYW5kLXR4dHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5icmFuZC10eHQgaDF7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4ycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYnJhbmQtdHh0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHh9CgouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIGltZytzdmd7ZGlzcGxheTpub25lfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0gdjIuMTYuMCDpqpHooYzpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5ydC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZ3JpZDN7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo4cHh9Ci5ydC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEwcHggMTFweH0KLnJ0LWNlbGwgLmxie2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NHB4fQoucnQtY2VsbCAudmx7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMX0KLnJ0LWNlbGwgLnZsIC51e2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tbGVmdDoycHh9Ci5ydC1jZWxsIC52bC5icmFuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5ydC1kYXl7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTBweCAxMnB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZGF5Omxhc3QtY2hpbGR7bWFyZ2luLWJvdHRvbTowfQoucnQtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpiYXNlbGluZTtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6OHB4fQoucnQtZGF0ZXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDB9Ci5ydC1kYXRlIC53ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLWxlZnQ6NXB4fQoucnQta217Zm9udC1zaXplOjExLjVweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDB9Ci5ydC1jaGlwc3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjZweDttYXJnaW4tdG9wOjdweH0KLnJ0LWNoaXB7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6M3B4IDhweH0KLnJ0LWNoaXAgYntjb2xvcjp2YXIoLS1icmFuZCk7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1sZWZ0OjJweH0KLnJ0LWNoaXAuY2FsIGJ7Y29sb3I6dmFyKC0tb2spfQoucnQtY2hpcC5saW5re2N1cnNvcjpwb2ludGVyO2NvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmRTb2Z0KX0KLyogPT09PT09PT09PT09IOWFpeWcuumXquWxj++8mummluW4p+WNs+aYvuekuu+8jOaVsOaNruWwsee7quWQjua3oeWHuiA9PT09PT09PT09PT0gKi8KI3NwbGFzaHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6OTk5O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoMTIwJSA2MCUgYXQgNTAlIDAlLHJnYmEoMTQsMTQzLDE3OCwuMTYpLHRyYW5zcGFyZW50IDYwJSksdmFyKC0tYmcpO3RyYW5zaXRpb246b3BhY2l0eSAuNHMgdmFyKC0tZWFzZSksdHJhbnNmb3JtIC40cyB2YXIoLS1lYXNlKX0KI3NwbGFzaC5vdXR7b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSgxLjA0KTtwb2ludGVyLWV2ZW50czpub25lfQouc3AtbWFya3t3aWR0aDo4NHB4O2hlaWdodDo4NHB4O2JvcmRlci1yYWRpdXM6MjRweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2hhZG93OjAgMTRweCA0MHB4IHJnYmEoMTQsMTQzLDE3OCwuNCk7YW5pbWF0aW9uOnNwLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGh9Ci5zcC1tYXJrIHN2Z3t3aWR0aDo0NnB4O2hlaWdodDo0NnB4fQouc3AtdGl0bGV7bWFyZ2luLXRvcDoyMHB4O2ZvbnQtc2l6ZToyMXB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzoxcHg7YW5pbWF0aW9uOnNwLXVwIC40cyAuMDVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1zdWJ7bWFyZ2luLXRvcDo3cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7bGV0dGVyLXNwYWNpbmc6M3B4O2FuaW1hdGlvbjpzcC11cCAuNHMgLjFzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2Fke21hcmdpbi10b3A6MzRweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7YW5pbWF0aW9uOnNwLXVwIC40cyAuMTVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2FkIC5zcGlubmVye3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwaW4gLjdzIGxpbmVhciBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpIHRyYW5zbGF0ZVkoMTBweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKSB0cmFuc2xhdGVZKDApfX0KQGtleWZyYW1lcyBzcC11cHtmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMnB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJiZy1nbG93Ij48L2Rpdj4KPGRpdiBpZD0ic3BsYXNoIj4KICA8ZGl2IGNsYXNzPSJzcC1tYXJrIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTQgMTMuNUM0IDkuMDggNy41OCA1LjUgMTIgNS41czggMy41OCA4IDgiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMiAxM2w3LjUgNS41IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSIxNi41IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE5IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC10aXRsZSI+5p6B5qC4IFpFRUhPPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3Atc3ViIj7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLWxvYWQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIj48L3NwYW4+5q2j5Zyo5Yqg6L295pWw5o2u4oCmPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PGltZyBzcmM9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBSkFBQUFDUUNBWUFBQURuUnVLNEFBQUFBWE5TUjBJQXJzNGM2UUFBQUZCbFdFbG1UVTBBS2dBQUFBZ0FBZ0VTQUFNQUFBQUJBQUVBQUlkcEFBUUFBQUFCQUFBQUpnQUFBQUFBQTZBQkFBTUFBQUFCQUFFQUFLQUNBQVFBQUFBQkFBQUFrS0FEQUFRQUFBQUJBQUFBa0FBQUFBQXQ0aVNXQUFBQldXbFVXSFJZVFV3NlkyOXRMbUZrYjJKbExuaHRjQUFBQUFBQVBIZzZlRzF3YldWMFlTQjRiV3h1Y3pwNFBTSmhaRzlpWlRwdWN6cHRaWFJoTHlJZ2VEcDRiWEIwYXowaVdFMVFJRU52Y21VZ05pNHdMakFpUGdvZ0lDQThjbVJtT2xKRVJpQjRiV3h1Y3pweVpHWTlJbWgwZEhBNkx5OTNkM2N1ZHpNdWIzSm5MekU1T1Rrdk1ESXZNakl0Y21SbUxYTjViblJoZUMxdWN5TWlQZ29nSUNBZ0lDQThjbVJtT2tSbGMyTnlhWEIwYVc5dUlISmtaanBoWW05MWREMGlJZ29nSUNBZ0lDQWdJQ0FnSUNCNGJXeHVjenAwYVdabVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM1JwWm1Zdk1TNHdMeUkrQ2lBZ0lDQWdJQ0FnSUR4MGFXWm1Pazl5YVdWdWRHRjBhVzl1UGpFOEwzUnBabVk2VDNKcFpXNTBZWFJwYjI0K0NpQWdJQ0FnSUR3dmNtUm1Pa1JsYzJOeWFYQjBhVzl1UGdvZ0lDQThMM0prWmpwU1JFWStDand2ZURwNGJYQnRaWFJoUGdvWlh1RUhBQUFOQ0VsRVFWUjRBZTFkVzB3VlNSb3VSSUtpWWtoRW9tSXdpemhSNG8xVkp6cXJVWGd3V1RYZTBLaHhKRVpkdkNXamtNeXJpWTlHeGxzMEVWK2NqTVliM2pQUmx4R2RIUlBkMFlrODdFWldVTmRSRTBSRkVSRkVZUCt2N1Q2ZWM3ck9wZnQwdzZuVC81Lzg5T202ZGRWWFg2cXF1Lzc2U1JJOUpOM2QzZjNvVWJta28wbEhrV2JwbWtuWGROS0JwSU5JMDBoVFNWTjBUYVlydEE5cGtwL1N6NFNUYm1xUm9WMzB1MVBYRHJwQzIwbGJTZCtSdHBBMmt6YVNOdWo2bUs1MXBQVkpTVWx0ZEhWZDBDR3VDQkZtSEJWY1JEcFYxNi9vNnRyenFHeVdMd2lBaExXa3YrdjZDeEhxUDEraW5mdmxhSWNTYVFxb2F2OGduVWVhN1Z3MXVTUUhFSGhLWmZ4TVdrbGsrc09COHJRaVlpWVFrUVpsRkpOK1IvcU5WaXIvaVhjRWJsSUY5NUZXRVprd1d0bVdtQWhFNVBrYlBma0hVa3hUTE9vaGdDbXVqRWowbTkycTJ5SVFFU2VESG5pUWRLWGRCM08rdUVMZ0JOVm1DeEdweVdxdExCT0l5RE9MSG5LTWRLVFZoM0g2dUViZ1Q2cmRhaUxScjFacWlWZmpxSVhJVTA2SnEwbVpQRkdqcGt4QzlHbTEzc2RSVnpxcUVZZ0tSYm9LMHUxUmw4d0pWVVpnRDFXK1BKb0Zka1FDNmVUNWtRcjhWbVZFdU82V0VmaUpjcFJFSWxFMFV4aEdIaWFQWmZ5Vno0QStSOStIbGJBRTB1ZERucmJDUXBqUWtkc2pyWWxDVG1HVUVXOWJXRENISlZsQ3c4ZU5Bd0xZazVzVDZ1MU1TaUFpRDc3ejFKQmlaYzdDQ09BVmZ5S1J5UFNkS05Ub2dvK0VUQjRtam9FQXVBQk9tTVEwQXRIb2crMkpmNXBTY2dBaklNUk1Hb1VDdGowQ0NFVGt3ZjF0VXQ3YllycklFTURlMmRkRUl0OEdiUEFVaGwxMUpvOE1PZzREQXVBR09PS1RZQUxCSklPRkVRaUhRQUJIZkZNWVRWOHdCcnNiTGlmSE1RSTZBbitsYVV3elN2TWZnVW9aSGtZZ1NnUmdkYXFKL3dpRWQzMDJROVdCNFV0WUJKN1NDS1I5NXRGR0lKcSs4cGs4WVFIanlFQUVzb2t6T0RUaDI2WW9ESXpuTzBZZ0lnSkZTR0dzZ2FaRlRNNEpHSUZBQkRUT0dBVGlieitCNFBCZFpBUTB6aVRSWElZVG96anQ2RnRRUjg3TEtSZ0I3UVJ0R2thZ1hGSW1EelBDS2dMZ1RDNElsR2MxSjZkbkJIUUU4a0NnSElhREViQ0pRQTRJQkM4WkxJeUFIUVN5bUVCMllPTThCZ0lhZ1RLTk83NHlBaFlSeU1RSUJPZE9MSXlBSFFUU1FTQjRCbU5oQk93Z01CQUVHbVFuSitkaEJNQWRFQWcrQ1ZrWUFUc0lhRitpNGRDU2hSR3dnMEFxUmlCNFEyVmhCT3dna01JRXNnTWI1ekVRMEFpVWJOenhsUkd3aUVBeVJpQW1rRVhVT0xrUEFZMUFJQkVMSTJBSGdUNGdEOXNDMllHTzh3Q0JKQ1lRRXlFV0JKTDZna1d4bEJBcGIxVlZsV2hvd1A4Q1lRRUNuWjJkWXRteVpXTFlzR0ZTUU83ZXZTdHUzYm9samJNYU9IcjBhREYzN2x5cjJheWtUeEprRSsycVRKZ3dBWjRjV0hVTVNrdEx1MXRiVzZXWUUzRzZNek16SGNOcTRjS0YwdWM0R1lnUnlGWHAzNysvcStXclZEaVJSeHc2ZEVqMDBaYWVnVFd2cWFrUlM1Y3VGWTJOallFUk1keWxwcnEveWNCdllERjBrSldzYTlhc0VRY09ISkNTcDdhMlZpeGV2Rmc4ZS9iTVNwRnhrWllKMUFQZFVGeGNMQTRmUGl4U1VzeTdSbzhlUFJLTEZpMFN1S29vVENDWGUyM2V2SG5pNk5Ham9sOC9ITDhMRkl3NFM1WXNFZmZ2M3crTVVPaU9DZVJpWjgyWk0wY2NQMzVjREJnd3dQUVVySFV3TXQyN2Q4OFVwMUlBRThpbDNwbytmYm80ZmZxMEdEeDRzT2tKYjk2OEVjdVhMM2ZzZGQzMGdCNE1ZQUs1QVBia3laTUZ2bjhOR1RMRVZIcExTNHRZdFdxVnVINzl1aWxPeFFBbWtNTzlObmJzV0hIdTNEa3hmUGh3VThsdGJXMmlwS1JFWExseXhSU25hZ0FUeU1HZXk4M05GUmN1WEJDalJvMHlsZHJSMFNFMmJOaWdrY3NVcVhBQUU4aWh6c3ZPemhibno1OFhZOGFNTVpYWTFkVWx0bTdkS280ZHd6OTZUQ3hoQWpuUW4wT0hEaFZuejU0VjQ4ZVBsNVpXWGw0dUtpc3JwWEdxQnpLQll1ekJqSXdNY2ViTUdURnRtdG5KMjhlUEgwVlpXWm5ZdTNkdmpFK0ozK3l1NzRVNTBmVDA5SFF4ZS9ac1FaNUJuU2pPc1RLd3A3VjU4Mll4YXhiK001Wlo3dHk1SStycTZnUnRhcG9qdzRTMHQ3ZUxhOWV1Q1JBdzNrVUpBdVhrNUlpTEZ5L0dPNWFtK3MyWU1VTmN1blRKRkI0cEFOK0o4dkx5eE11WEx5TWw3ZlY0SmFZd01qOFFlSXZ4aW1BRVFwdFZFQ1VJcEFLUVhxMmpNZ1JLVHZiTzRSR1p2VkM4RWxTSk5SRE1RRis4ZUNFMWgrZ0pZREdkNEZzT1dRdUdYTWczTnpjN05zMitldlZLbVNsTUNRSTllUEJBa0dsc3lNNXprMFFHZVhiczJLRjlESlE5Qy90YTY5YXRFOWpuY2tKQVZpeWtWUkFsQ1BUcDB5ZEhUVDJ0ZHN5MmJkdkVsaTFicEFTR0FUeDIxcDAwUmJWYXY5NU1yOHdhcUxkQTJyUnBrNmlvcUpDYW9zS1d4Mms3NXQ1cXA5M25Nb0hDSUllZDgvMzc5MHZKQXl0Q1dCTStmLzQ4VEFtSkg4VUVDdEhIT0xzRk8rYStmYzJ6L01PSEQ1VzJZdzdSWkZ2QlRDQUpiUFBuejlmc21HWEhZZ3c3WnB5a1lQbnk3NTRZQ3gyQm9xSWl6ZXdpTGMzcytRK2ZFckRtd1JrdWxzOEk4QWpreHdUc1haMDhlVkpxeDl6VTFLUzliZDIrZmRzdkIvOWtBdWtjS0Nnb2lHakhmT1BHRFdaTUVBSk1JQUlrUHo5Zk16V1ZPVHlBSFROT2xWNjllalVJT3I0RkFwNG5FRHhZd0JRVkppUEJBZ3VBOWV2WGEvSEJjWHovR1FGUEUyamt5SkhheUFQYm0yREJkZ0srUHVOZ0lFdG9CRHhMb0t5c0xJMDhNanRta0FmYkYwZU9IQW1OSE1kb0NKaS9rc1VoTURCbGxYM1FzMXRWSFBqRHFkRXBVNmFZaXNETy84NmRPOFhCZ3dkN2JmY2ZsVkxGZ0U0SkFtR2RnbE1QVHBBSXUrczRianhpeEFnVGVZd0FiSTZ1V0xIQ3VPM3hLOHc1Rml4WW9NU092QklFZ21jTDJWVGpScy9DY0ExdlpiMHByMSsvRnFvWTBDbXhCc0tvb2NxUTdnVHhWR3FyRWdSeW9sTzRESGNRVUlKQXNCR1dlZmR5QjVMZUx4WDdjUEYyQmk0VUtrcXNnV0J6ZzlkcUsrc0N3eFFWWjlLeENKZEpkWFcxdUh6NWN0eDExdnYzN3dWVUJWR0NRRGhndDIvZlBzdDQ0bGd4UGhiS0JIYk1jR3o1OXUxYldUU0hSWW1BRWdTS3NpMEJ5ZURRWVBmdTNRRmh4bzFoeDh6a01SQ3hmMVZpRFdTMWVSczNiaFM3ZHUyU1pvTWRNM3dUZXRVSVhncEtESUVKUnlEWU1ZZnl4MnpZTWF2b2p6bUdQblkxYTBJUnlQREhMUHRpRFQvTVdQT282by9aVlJiRVVIakNFTWp3eHh6S2pobmtVZGtmY3d4OTdHcldoQ0JRWVdGaFdIL01iTWZzSG9lVUp4RDhNWjg2ZFVwcXgyejRZMlk3WmlhUUZBSDRZOFl1ZlNoL3pDdFhya3dZZjh4U0FPSWdVTmtSYU55NGNXSHRtUEUyeG5iTTdqTk1TUUxCSHpQc21MM2tqOWw5S3RoN2duSUVnajltZUlMM21qOW1lOTNyZmk3WENmVGh3d2ZIV2dGL3pDQVBmQVVGQzU2REw5Q0o2bzg1dUwzUjNNUFhvdHZpK2w3WTJyVnJ4Wk1uVHh4cEJ4d2VUSjA2VlZwV2ZYMjl3TC9YeEs2OUtxWVEwb1k0R0RocDBpUUhTNU1YbFVSbUQxMFVGVjhPbU9WMTVkRDRRNkFiVTVnYS9tVGpEenl1RVhHSENjUTBpQVVCalVDWXdsZ1lBVHNJZEdFRTZyU1RrL013QXVBT0U0aDVFQXNDR29HODgwOG9Zb0dLODhvUTZNQUl4QVNTUWNOaDBTQ2dFY2o5ejVYUlZJWFRxSWhBTzBhZ1ZoVnJ6bldPQ3dSYVFhQjNjVkVWcm9TS0NMd0RnWno1RHlFcU5wL3JIQ3NDTFNCUWM2eWxjSDdQSXRBTUFqVjZ0dm5jOEZnUmFBU0JHbUl0aGZON0ZvRUdKcEJuKzk2Umhtc0VldXhJVVZ5SUZ4RjRqQkdvem9zdDV6WTdna0FkTEJMN1VWSDRtTWhXaVk1ZzZwbENZSWlZMW9mc2g5dm94Mzg5MDJ4dXFGTUkxSUk3bU1JZ3YzKys4RjlHSUdvRU5NNFlCUHBYMU5rNElTUHdHWUVBQXYzQ3FEQUNGaEhRT09OYk9OTmkrazhxSU50aUlaemNtd2c4cGZXUDVyM1VtTUlBdzgvZXhJSmJiUU1CSDFmOENWUnBveURPNGswRWZGenhFWWlHcEQ4SWk1dmV4SU5iYlFHQm16cFh0Q3crQXVrRldQZm1iZUhKbkRRaEVBamdpRzhSamFiUlFocjMrTC9XY2c4R1NNVGlaUVR3NnY0MWpVQys0L0FCSTVBZVVlWmxoTGp0WVJFbzh5Y1BVZ1lRQ0FHVTREZTZuTUJ2RmtiQUQ0RVRPamY4Z2tKc29OSlVsa0dwYWtpMWQvMkFISHpqUlFUd2pYQWlFYWdwdVBHbUVRZ0o5SVNyNlNjN1hnaEd6SHYzNE1CcUdYa0FoWlJBaUtBTXY5TGxlL3htOFRRQzMrdGNrSUlROEJZbVMwSFQyUThVdmwwV3gyRUpqOEFlSWsvWWw2cG9DSVEwUDVKK20vQndjUVA5RWZpSmJrcUlRTDVYZHY5STQzZklLY3hJb0JkUVF2ZDdqREMrSmp3QzZPdUk1QUVLRVVjZ2Y2aG9PaXVuZS93bnQ0akU4OC9IdjVWQkFBdG1ySGtxb3EyeEpRS2hVQ0xSTExvY0krVlhmQUNTT0lKWGRieHQ0ZVVwYXJFOGt1Z1BtRWhQNEkrTlVjTWM5d25SbC9qT1k0azhhSlZsQWlFVFBhaUpkQlg5bkVuSzl0UUFSVTFCMzgxRVg2SlA3VFRCOGhRVy9CQ2EwbEJHTWVsM3BOOEV4L045WENJQXN4M3NxbGNSY2NLK1pVV3FmY3dFOG44QWthbUE3a3RKLzA3SzVySCs0UFQrNzZkVUJWZ1NWaEpwWVB2bGlEaEtJUDhhRVpueTZiNlFkQm9wekVQR2tMcjJQQ3FiNVFzQ0dGVncxZzlURkU3Y1hDUFMvSnV1amt1UGRTZ1Jxai9WL2kra2VhUTVwRm02WnRJMW5YUWc2U0RTTk5KVTBoUmRrK2tLeFhvTjlUV1VmaWFjb09NTnhTdDFwNjV3aEFxRlAwdWNJb1pYT1RnR2cyK25SbEo0V0lIK2ovUUJhVDBSQmdkR1haZi9BN1kxZC81SUpaZGRBQUFBQUVsRlRrU3VRbUNDIiBhbHQ9IlpFRUhPIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJyYW5kLXR4dCI+CiAgICAgIDxoMT7mnoHmoLggWkVFSE88L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIAogICAgPC9kaXY+CiAgPC9oZWFkZXI+CgogIDxtYWluIGlkPSJtYWluIj4KICAgIDxkaXYgY2xhc3M9InB0ci13cmFwIiBpZD0icHRyV3JhcCI+CiAgICAgIDxkaXYgY2xhc3M9InB0ci1pbmRpY2F0b3IiIGlkPSJwdHJJbmQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIiBpZD0icHRyU3BpbiI+PC9zcGFuPjxzcGFuIGlkPSJwdHJUeHQiPuS4i+aLieWIt+aWsDwvc3Bhbj48L2Rpdj4KICAgICAgPGRpdiBpZD0icGFnZUhvbWUiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlUG9pbnRzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VWZWhpY2xlIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VSaWRlIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VMb2dzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VDZmciIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogIDwvbWFpbj4KCiAgPG5hdiBjbGFzcz0idGFiYmFyIj4KICAgIDxidXR0b24gY2xhc3M9InRhYiBvbiIgZGF0YS10YWI9ImhvbWUiIG9uY2xpY2s9InN3aXRjaFRhYignaG9tZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTAuNSAxMiAzbDkgNy41Ii8+PHBhdGggZD0iTTUgOS41VjIxaDE0VjkuNSIvPjwvc3ZnPgogICAgICDpppbpobU8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0icG9pbnRzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3BvaW50cycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOC42Ii8+PHBhdGggZD0iTTkgOC41bDMgNCAzLTRNMTIgMTIuNVYxN005LjYgMTMuNGg0LjhNOS42IDE1LjRoNC44Ii8+PC9zdmc+CiAgICAgIOenr+WIhjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJ2ZWhpY2xlIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3ZlaGljbGUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik00IDEzbDEuNy00LjZBMiAyIDAgMCAxIDcuNiA3aDguOGEyIDIgMCAwIDEgMS45IDEuNEwyMCAxMyIvPjxwYXRoIGQ9Ik0zLjUgMTNoMTdhMSAxIDAgMCAxIDEgMXYzLjVoLTIuNk0yLjUgMTcuNVYxNGExIDEgMCAwIDEgMS0xIi8+PHBhdGggZD0iTTUuMSAxNy41SDIuNSIvPjxjaXJjbGUgY3g9IjcuMyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxjaXJjbGUgY3g9IjE2LjciIGN5PSIxNy4zIiByPSIxLjkiLz48cGF0aCBkPSJNOS4yIDE3LjNoNS42Ii8+PC9zdmc+CiAgICAgIOi9pui+hjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJyaWRlIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3JpZGUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDE2LjVjMi41IDAgMy41LTkgOC05czQuNSA5IDEwIDkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxLjMiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPgogICAgICDpqpHooYw8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0ibG9ncyIgb25jbGljaz0ic3dpdGNoVGFiKCdsb2dzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOCA2aDEzTTggMTJoMTNNOCAxOGgxMyIvPjxwYXRoIGQ9Ik0zIDZoLjAxTTMgMTJoLjAxTTMgMThoLjAxIi8+PC9zdmc+CiAgICAgIOaXpeW/lzxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJjZmciIG9uY2xpY2s9InN3aXRjaFRhYignY2ZnJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PHBhdGggZD0iTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAxIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDEgMS00IDB2LS4wOWExLjY1IDEuNjUgMCAwIDAtMS0xLjUxIDEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMSAxLTIuODMtMi44M2wuMDYtLjA2YTEuNjUgMS42NSAwIDAgMCAuMzMtMS44MiAxLjY1IDEuNjUgMCAwIDAtMS41MS0xSDNhMiAyIDAgMSAxIDAtNGguMDlhMS42NSAxLjY1IDAgMCAwIDEuNTEtMSAxLjY1IDEuNjUgMCAwIDAtLjMzLTEuODJsLS4wNi0uMDZhMiAyIDAgMSAxIDIuODMtMi44M2wuMDYuMDZhMS42NSAxLjY1IDAgMCAwIDEuODIuMzNoLjAxYTEuNjUgMS42NSAwIDAgMCAxLTEuNTFWM2EyIDIgMCAxIDEgNCAwdi4wOWExLjY1IDEuNjUgMCAwIDAgMSAxLjUxaC4wMWExLjY1IDEuNjUgMCAwIDAgMS44Mi0uMzNsLjA2LS4wNmEyIDIgMCAxIDEgMi44MyAyLjgzbC0uMDYuMDZhMS42NSAxLjY1IDAgMCAwLS4zMyAxLjgydi4wMWExLjY1IDEuNjUgMCAwIDAgMS41MSAxSDIxYTIgMiAwIDEgMSAwIDRoLS4wOWExLjY1IDEuNjUgMCAwIDAtMS41MSAxeiIvPjwvc3ZnPgogICAgICDorr7nva48c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogIDwvbmF2PgoKICA8ZGl2IGNsYXNzPSJzaGVldC1iYWNrZHJvcCIgaWQ9InNoZWV0QmFja2Ryb3AiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PC9kaXY+CiAgPGRpdiBjbGFzcz0ic2hlZXQiIGlkPSJzaGVldCI+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ncmFiIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWhlYWQiPgogICAgICA8aDMgaWQ9InNoZWV0VGl0bGUiPjwvaDM+CiAgICAgIDxidXR0b24gY2xhc3M9InNoZWV0LWNsb3NlIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtYm9keSIgaWQ9InNoZWV0Qm9keSI+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgaWQ9InRvYXN0IiByb2xlPSJzdGF0dXMiPjwvZGl2PgogIDxkaXYgY2xhc3M9ImNvbmZpcm0tbGF5ZXIgaGlkZGVuIiBpZD0iY29uZmlybUxheWVyIj48L2Rpdj4KPC9kaXY+CjxzY3JpcHQ+CiJ1c2Ugc3RyaWN0IjsKLyogPT09PT09PT09PT09PT09PT0g5bi46YePID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFQUF9WRVJTSU9OID0gInYyLjE2LjciOwpjb25zdCBLRVlTID0geyBjZmc6InplZWhvX2NmZyIsIGFjY291bnRzOiJ6ZWVob19hY2NvdW50cyIsIGxvZ3M6InplZWhvX2xvZ3MiIH07CgovKiA9PT09PT09PT09PT09PT09PSDlt6Xlhbflh73mlbAgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZ2V0VXVpZCgpe2NvbnN0IHA9Inh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCIsYz0iYWJjZGVmMDEyMzQ1Njc4OSI7bGV0IHI9IiI7Zm9yKGNvbnN0IGNoIG9mIHApe2lmKGNoPT09IngifHxjaD09PSJ5Iil7Y29uc3Qgbj1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTYpO3IrPShjaD09PSJ5Ij8obiYweDMpfDB4ODpuKS50b1N0cmluZygxNil9ZWxzZSByKz1jaH1yZXR1cm4gcn0KZnVuY3Rpb24gZ2V0UmFuZG9tQ2hhcnMobj0xNil7Y29uc3QgYz0iMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiO2xldCByPSIiO2ZvcihsZXQgaT0wO2k8bjtpKyspcis9Yy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmMubGVuZ3RoKSk7cmV0dXJuIHJ9CmZ1bmN0aW9uIHRvUXVlcnkocD17fSl7cmV0dXJuIE9iamVjdC5rZXlzKHApLmZpbHRlcihrPT5wW2tdIT09dW5kZWZpbmVkJiZwW2tdIT09bnVsbCkuc29ydCgpLm1hcChrPT5rKyI9IitwW2tdKS5qb2luKCImIil9CmZ1bmN0aW9uIGNsZWFuVG9rZW4odCl7cmV0dXJuIFN0cmluZyh0fHwiIikudHJpbSgpLnJlcGxhY2UoL15bYkJdZWFyZXJccysvaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIil9CmZ1bmN0aW9uIGNsZWFuQmFya0tleShiKXtsZXQgcz1TdHJpbmcoYnx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWFya1xzKihrZXkpP1xzKls677yaXVxzKi9pLCIiKS5yZXBsYWNlKC9bXHMiJ2BdKy9nLCIiKS50cmltKCk7cmV0dXJuIHMucmVwbGFjZSgvXC8rJC8sIiIpfQpmdW5jdGlvbiBtYXNrVmluKHYpe2NvbnN0IHM9U3RyaW5nKHZ8fCIiKTtpZighcylyZXR1cm4iIjtpZihzLmxlbmd0aDw9NylyZXR1cm4iKioqKiI7cmV0dXJuIHMuc3Vic3RyaW5nKDAsMykrIioqKioiK3Muc3Vic3RyaW5nKHMubGVuZ3RoLTQpfQpmdW5jdGlvbiBkZWVwUGljayhvYmosa2V5cyxkZXB0aCl7aWYoIW9ianx8dHlwZW9mIG9iaiE9PSJvYmplY3QifHwoZGVwdGh8fDApPjUpcmV0dXJuIiI7Zm9yKGNvbnN0IGsgb2Yga2V5cyl7aWYob2JqW2tdIT09dW5kZWZpbmVkJiZvYmpba10hPT1udWxsJiZvYmpba10hPT0iIilyZXR1cm4gU3RyaW5nKG9ialtrXSl9Zm9yKGNvbnN0IGsgaW4gb2JqKXtpZihvYmpba10mJnR5cGVvZiBvYmpba109PT0ib2JqZWN0Iil7Y29uc3Qgcj1kZWVwUGljayhvYmpba10sa2V5cywoZGVwdGh8fDApKzEpO2lmKHIpcmV0dXJuIHJ9fXJldHVybiIifQpmdW5jdGlvbiBwaWNrSW90UHJvcChkLGlkZW50aWZ5KXtjb25zdCBhcnI9ZCYmZC5pb3RQcm9wZXJ0aWVzO2lmKEFycmF5LmlzQXJyYXkoYXJyKSl7Y29uc3Qga2V5PVN0cmluZyhpZGVudGlmeSkudG9Mb3dlckNhc2UoKTtmb3IoY29uc3QgaXQgb2YgYXJyKXtpZihpdCYmU3RyaW5nKGl0LmlkZW50aWZ5fHwiIikudG9Mb3dlckNhc2UoKT09PWtleSYmaXQudmFsdWUhPT1udWxsJiZpdC52YWx1ZSE9PXVuZGVmaW5lZCYmaXQudmFsdWUhPT0iIilyZXR1cm4gU3RyaW5nKGl0LnZhbHVlKX19cmV0dXJuIiJ9CmZ1bmN0aW9uIGdldERldmljZUlkZW50aWZ5KGFjYyl7Y29uc3Qgc2VlZD1TdHJpbmcoYWNjLnVzZXJJZHx8YWNjLnZpbk5vfHwiemVlaG8tZGV2aWNlIik7bGV0IGg9MDtmb3IobGV0IGk9MDtpPHNlZWQubGVuZ3RoO2krKyl7aD0oKGg8PDUpLWgrc2VlZC5jaGFyQ29kZUF0KGkpKXwwfXJldHVybihNYXRoLmFicyhoKS50b1N0cmluZygxNikrIjAwMDAwMDAwMDAwMDAwMDAiKS5zbGljZSgwLDE2KX0KZnVuY3Rpb24gaGFzVmFsaWRDb29yZChsYXQsbG5nKXtpZihsYXQ9PT0iInx8bGF0PT09bnVsbHx8bGF0PT09dW5kZWZpbmVkfHxsbmc9PT0iInx8bG5nPT09bnVsbHx8bG5nPT09dW5kZWZpbmVkKXJldHVybiBmYWxzZTtjb25zdCBsYT1OdW1iZXIobGF0KSxsbj1OdW1iZXIobG5nKTtyZXR1cm4gaXNGaW5pdGUobGEpJiZpc0Zpbml0ZShsbikmJk1hdGguYWJzKGxhKTw9OTAmJk1hdGguYWJzKGxuKTw9MTgwJiYhKGxhPT09MCYmbG49PT0wKX0KZnVuY3Rpb24gbm9ybWFsaXplUmVmcmVzaFNlYyh2KXtjb25zdCBuPU51bWJlcih2KTtpZighaXNGaW5pdGUobil8fG48PTApcmV0dXJuIDYwO3JldHVybiBNYXRoLm1heCgxNSxNYXRoLm1pbigzNjAwLE1hdGgucm91bmQobikpKX0KZnVuY3Rpb24gZXNjKHMpe3JldHVybiBTdHJpbmcocz09bnVsbD8iIjpzKS5yZXBsYWNlKC8mL2csIiZhbXA7IikucmVwbGFjZSgvPC9nLCImbHQ7IikucmVwbGFjZSgvPi9nLCImZ3Q7IikucmVwbGFjZSgvIi9nLCImcXVvdDsiKX0KCi8qID09PT09PT09PT09PT09PT09IE1ENSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBtZDUodCxlKXtmdW5jdGlvbiBuKHQsZSl7cmV0dXJuIHQ8PGV8dD4+PjMyLWV9ZnVuY3Rpb24gcih0LGUpe3ZhciBuLHIsbyxpLGE7cmV0dXJuIG89MjE0NzQ4MzY0OCZ0LGk9MjE0NzQ4MzY0OCZlLGE9KDEwNzM3NDE4MjMmdCkrKDEwNzM3NDE4MjMmZSksKG49MTA3Mzc0MTgyNCZ0KSYocj0xMDczNzQxODI0JmUpPzIxNDc0ODM2NDheYV5vXmk6bnxyPzEwNzM3NDE4MjQmYT8zMjIxMjI1NDcyXmFeb15pOjEwNzM3NDE4MjReYV5vXmk6YV5vXml9ZnVuY3Rpb24gbyh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZlfH50Jm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gaSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZufGUmfm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdF5lXm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gdSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gZV4odHx+bil9KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYyh0KXt2YXIgZSxuPSIiLHI9IiI7Zm9yKGU9MDtlPD0zO2UrKyluKz0ocj0iMCIrKHQ+Pj44KmUmMjU1KS50b1N0cmluZygxNikpLnN1YnN0cihyLmxlbmd0aC0yLDIpO3JldHVybiBufXZhciBzLGwsZixwLGQsaCx2LHksZyxtPUFycmF5KCk7Zm9yKG09ZnVuY3Rpb24odCl7Zm9yKHZhciBlLG49dC5sZW5ndGgscj1uKzgsbz0xNiooKHItciU2NCkvNjQrMSksaT1BcnJheShvLTEpLGE9MCx1PTA7dTxuOylhPXUlNCo4LGlbZT0odS11JTQpLzRdPWlbZV18dC5jaGFyQ29kZUF0KHUpPDxhLHUrKztyZXR1cm4gYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfDEyODw8YSxpW28tMl09bjw8MyxpW28tMV09bj4+PjI5LGl9KHQ9ZnVuY3Rpb24odCl7dD10LnJlcGxhY2UoL1xyXG4vZywiXG4iKTtmb3IodmFyIGU9IiIsbj0wO248dC5sZW5ndGg7bisrKXt2YXIgcj10LmNoYXJDb2RlQXQobik7cjwxMjg/ZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyKTpyPjEyNyYmcjwyMDQ4PyhlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjZ8MTkyKSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSk6KGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+MTJ8MjI0KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjYmNjN8MTI4KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSl9cmV0dXJuIGV9KHQpKSxoPTE3MzI1ODQxOTMsdj00MDIzMjMzNDE3LHk9MjU2MjM4MzEwMixnPTI3MTczMzg3OCxzPTA7czxtLmxlbmd0aDtzKz0xNilsPWgsZj12LHA9eSxkPWcsaD1vKGgsdix5LGcsbVtzKzBdLDcsMzYxNDA5MDM2MCksZz1vKGcsaCx2LHksbVtzKzFdLDEyLDM5MDU0MDI3MTApLHk9byh5LGcsaCx2LG1bcysyXSwxNyw2MDYxMDU4MTkpLHY9byh2LHksZyxoLG1bcyszXSwyMiwzMjUwNDQxOTY2KSxoPW8oaCx2LHksZyxtW3MrNF0sNyw0MTE4NTQ4Mzk5KSxnPW8oZyxoLHYseSxtW3MrNV0sMTIsMTIwMDA4MDQyNikseT1vKHksZyxoLHYsbVtzKzZdLDE3LDI4MjE3MzU5NTUpLHY9byh2LHksZyxoLG1bcys3XSwyMiw0MjQ5MjYxMzEzKSxoPW8oaCx2LHksZyxtW3MrOF0sNywxNzcwMDM1NDE2KSxnPW8oZyxoLHYseSxtW3MrOV0sMTIsMjMzNjU1Mjg3OSkseT1vKHksZyxoLHYsbVtzKzEwXSwxNyw0Mjk0OTI1MjMzKSx2PW8odix5LGcsaCxtW3MrMTFdLDIyLDIzMDQ1NjMxMzQpLGg9byhoLHYseSxnLG1bcysxMl0sNywxODA0NjAzNjgyKSxnPW8oZyxoLHYseSxtW3MrMTNdLDEyLDQyNTQ2MjYxOTUpLHk9byh5LGcsaCx2LG1bcysxNF0sMTcsMjc5Mjk2NTAwNiksaD1pKGgsdj1vKHYseSxnLGgsbVtzKzE1XSwyMiwxMjM2NTM1MzI5KSx5LGcsbVtzKzFdLDUsNDEyOTE3MDc4NiksZz1pKGcsaCx2LHksbVtzKzZdLDksMzIyNTQ2NTY2NCkseT1pKHksZyxoLHYsbVtzKzExXSwxNCw2NDM3MTc3MTMpLHY9aSh2LHksZyxoLG1bcyswXSwyMCwzOTIxMDY5OTk0KSxoPWkoaCx2LHksZyxtW3MrNV0sNSwzNTkzNDA4NjA1KSxnPWkoZyxoLHYseSxtW3MrMTBdLDksMzgwMTYwODMpLHk9aSh5LGcsaCx2LG1bcysxNV0sMTQsMzYzNDQ4ODk2MSksdj1pKHYseSxnLGgsbVtzKzRdLDIwLDM4ODk0Mjk0NDgpLGg9aShoLHYseSxnLG1bcys5XSw1LDU2ODQ0NjQzOCksZz1pKGcsaCx2LHksbVtzKzE0XSw5LDMyNzUxNjM2MDYpLHk9aSh5LGcsaCx2LG1bcyszXSwxNCw0MTA3NjAzMzM1KSx2PWkodix5LGcsaCxtW3MrOF0sMjAsMTE2MzUzMTUwMSksaD1pKGgsdix5LGcsbVtzKzEzXSw1LDI4NTAyODU4MjkpLGc9aShnLGgsdix5LG1bcysyXSw5LDQyNDM1NjM1MTIpLHk9aSh5LGcsaCx2LG1bcys3XSwxNCwxNzM1MzI4NDczKSxoPWEoaCx2PWkodix5LGcsaCxtW3MrMTJdLDIwLDIzNjgzNTk1NjIpLHksZyxtW3MrNV0sNCw0Mjk0NTg4NzM4KSxnPWEoZyxoLHYseSxtW3MrOF0sMTEsMjI3MjM5MjgzMykseT1hKHksZyxoLHYsbVtzKzExXSwxNiwxODM5MDMwNTYyKSx2PWEodix5LGcsaCxtW3MrMTRdLDIzLDQyNTk2NTc3NDApLGg9YShoLHYseSxnLG1bcysxXSw0LDI3NjM5NzUyMzYpLGc9YShnLGgsdix5LG1bcys0XSwxMSwxMjcyODkzMzUzKSx5PWEoeSxnLGgsdixtW3MrN10sMTYsNDEzOTQ2OTY2NCksdj1hKHYseSxnLGgsbVtzKzEwXSwyMywzMjAwMjM2NjU2KSxoPWEoaCx2LHksZyxtW3MrMTNdLDQsNjgxMjc5MTc0KSxnPWEoZyxoLHYseSxtW3MrMF0sMTEsMzkzNjQzMDA3NCkseT1hKHksZyxoLHYsbVtzKzNdLDE2LDM1NzI0NDUzMTcpLHY9YSh2LHksZyxoLG1bcys2XSwyMyw3NjAyOTE4OSksaD1hKGgsdix5LGcsbVtzKzldLDQsMzY1NDYwMjgwOSksZz1hKGcsaCx2LHksbVtzKzEyXSwxMSwzODczMTUxNDYxKSx5PWEoeSxnLGgsdixtW3MrMTVdLDE2LDUzMDc0MjUyMCksaD11KGgsdj1hKHYseSxnLGgsbVtzKzJdLDIzLDMyOTk2Mjg2NDUpLHksZyxtW3MrMF0sNiw0MDk2MzM2NDUyKSxnPXUoZyxoLHYseSxtW3MrN10sMTAsMTEyNjg5MTQxNSkseT11KHksZyxoLHYsbVtzKzE0XSwxNSwyODc4NjEyMzkxKSx2PXUodix5LGcsaCxtW3MrNV0sMjEsNDIzNzUzMzI0MSksaD11KGgsdix5LGcsbVtzKzEyXSw2LDE3MDA0ODU1NzEpLGc9dShnLGgsdix5LG1bcyszXSwxMCwyMzk5OTgwNjkwKSx5PXUoeSxnLGgsdixtW3MrMTBdLDE1LDQyOTM5MTU3NzMpLHY9dSh2LHksZyxoLG1bcysxXSwyMSwyMjQwMDQ0NDk3KSxoPXUoaCx2LHksZyxtW3MrOF0sNiwxODczMzEzMzU5KSxnPXUoZyxoLHYseSxtW3MrMTVdLDEwLDQyNjQzNTU1NTIpLHk9dSh5LGcsaCx2LG1bcys2XSwxNSwyNzM0NzY4OTE2KSx2PXUodix5LGcsaCxtW3MrMTNdLDIxLDEzMDkxNTE2NDkpLGg9dShoLHYseSxnLG1bcys0XSw2LDQxNDk0NDQyMjYpLGc9dShnLGgsdix5LG1bcysxMV0sMTAsMzE3NDc1NjkxNykseT11KHksZyxoLHYsbVtzKzJdLDE1LDcxODc4NzI1OSksdj11KHYseSxnLGgsbVtzKzldLDIxLDM5NTE0ODE3NDUpLGg9cihoLGwpLHY9cih2LGYpLHk9cih5LHApLGc9cihnLGQpO3JldHVybiAzMj09ZT8oYyhoKStjKHYpK2MoeSkrYyhnKSkudG9Mb3dlckNhc2UoKTooYyh2KStjKHkpKS50b0xvd2VyQ2FzZSgpfQovKiA9PT09PT09PT09PT09PT09PSBTSEExID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHNoYTEobXNnKXtmdW5jdGlvbiByb3RhdGVfbGVmdChuLHMpe3ZhciB0ND0objw8cyl8KG4+Pj4oMzItcykpO3JldHVybiB0NH07ZnVuY3Rpb24gY3Z0X2hleCh2YWwpe3ZhciBzdHI9Jyc7dmFyIGk7dmFyIHY7Zm9yKGk9NztpPj0wO2ktLSl7dj0odmFsPj4+KGkqNCkpJjB4MGY7c3RyKz12LnRvU3RyaW5nKDE2KX1yZXR1cm4gc3RyfTtmdW5jdGlvbiBVdGY4RW5jb2RlKHN0cmluZyl7c3RyaW5nPXN0cmluZy5yZXBsYWNlKC9cclxuL2csJ1xuJyk7dmFyIHV0ZnRleHQ9Jyc7Zm9yKHZhciBuPTA7bjxzdHJpbmcubGVuZ3RoO24rKyl7dmFyIGM9c3RyaW5nLmNoYXJDb2RlQXQobik7aWYoYzwxMjgpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYyl9ZWxzZSBpZigoYz4xMjcpJiYoYzwyMDQ4KSl7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+Nil8MTkyKTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfWVsc2V7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+MTIpfDIyNCk7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoKGM+PjYpJjYzKXwxMjgpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpfDEyOCl9fXJldHVybiB1dGZ0ZXh0fTt2YXIgYmxvY2tzdGFydDt2YXIgaSxqO3ZhciBXPW5ldyBBcnJheSg4MCk7dmFyIEgwPTB4Njc0NTIzMDE7dmFyIEgxPTB4RUZDREFCODk7dmFyIEgyPTB4OThCQURDRkU7dmFyIEgzPTB4MTAzMjU0NzY7dmFyIEg0PTB4QzNEMkUxRjA7dmFyIEEsQixDLEQsRTt2YXIgdGVtcDttc2c9VXRmOEVuY29kZShtc2cpO3ZhciBtc2dfbGVuPW1zZy5sZW5ndGg7dmFyIHdvcmRfYXJyYXk9bmV3IEFycmF5KCk7Zm9yKGk9MDtpPG1zZ19sZW4tMztpKz00KXtqPW1zZy5jaGFyQ29kZUF0KGkpPDwyNHxtc2cuY2hhckNvZGVBdChpKzEpPDwxNnxtc2cuY2hhckNvZGVBdChpKzIpPDw4fG1zZy5jaGFyQ29kZUF0KGkrMyk7d29yZF9hcnJheS5wdXNoKGopfXN3aXRjaChtc2dfbGVuJTQpe2Nhc2UgMDppPTB4MDgwMDAwMDAwO2JyZWFrO2Nhc2UgMTppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDI0fDB4MDgwMDAwMDticmVhaztjYXNlIDI6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwxNnwweDA4MDAwO2JyZWFrO2Nhc2UgMzppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMyk8PDI0fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMik8PDE2fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDh8MHg4MDticmVha313b3JkX2FycmF5LnB1c2goaSk7d2hpbGUoKHdvcmRfYXJyYXkubGVuZ3RoJTE2KSE9MTQpd29yZF9hcnJheS5wdXNoKDApO3dvcmRfYXJyYXkucHVzaChtc2dfbGVuPj4+MjkpO3dvcmRfYXJyYXkucHVzaCgobXNnX2xlbjw8MykmMHgwZmZmZmZmZmYpO2ZvcihibG9ja3N0YXJ0PTA7YmxvY2tzdGFydDx3b3JkX2FycmF5Lmxlbmd0aDtibG9ja3N0YXJ0Kz0xNil7Zm9yKGk9MDtpPDE2O2krKylXW2ldPXdvcmRfYXJyYXlbYmxvY2tzdGFydCtpXTtmb3IoaT0xNjtpPD03OTtpKyspV1tpXT1yb3RhdGVfbGVmdChXW2ktM11eV1tpLThdXldbaS0xNF1eV1tpLTE2XSwxKTtBPUgwO0I9SDE7Qz1IMjtEPUgzO0U9SDQ7Zm9yKGk9MDtpPD0xOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfCh+QiZEKSkrRStXW2ldKzB4NUE4Mjc5OTkpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTIwO2k8PTM5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweDZFRDlFQkExKSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT00MDtpPD01OTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfChCJkQpfChDJkQpKStFK1dbaV0rMHg4RjFCQkNEQykmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NjA7aTw9Nzk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKyhCXkNeRCkrRStXW2ldKzB4Q0E2MkMxRDYpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfUgwPShIMCtBKSYweDBmZmZmZmZmZjtIMT0oSDErQikmMHgwZmZmZmZmZmY7SDI9KEgyK0MpJjB4MGZmZmZmZmZmO0gzPShIMytEKSYweDBmZmZmZmZmZjtIND0oSDQrRSkmMHgwZmZmZmZmZmZ9dmFyIHRlbXA9Y3Z0X2hleChIMCkrY3Z0X2hleChIMSkrY3Z0X2hleChIMikrY3Z0X2hleChIMykrY3Z0X2hleChINCk7cmV0dXJuIHRlbXAudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gQUVTLTI1Ni1FQ0IgKyBQS0NTNyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBRVNfU0JPWD1uZXcgVWludDhBcnJheShbMHg2MywweDdjLDB4NzcsMHg3YiwweGYyLDB4NmIsMHg2ZiwweGM1LDB4MzAsMHgwMSwweDY3LDB4MmIsMHhmZSwweGQ3LDB4YWIsMHg3NiwweGNhLDB4ODIsMHhjOSwweDdkLDB4ZmEsMHg1OSwweDQ3LDB4ZjAsMHhhZCwweGQ0LDB4YTIsMHhhZiwweDljLDB4YTQsMHg3MiwweGMwLDB4YjcsMHhmZCwweDkzLDB4MjYsMHgzNiwweDNmLDB4ZjcsMHhjYywweDM0LDB4YTUsMHhlNSwweGYxLDB4NzEsMHhkOCwweDMxLDB4MTUsMHgwNCwweGM3LDB4MjMsMHhjMywweDE4LDB4OTYsMHgwNSwweDlhLDB4MDcsMHgxMiwweDgwLDB4ZTIsMHhlYiwweDI3LDB4YjIsMHg3NSwweDA5LDB4ODMsMHgyYywweDFhLDB4MWIsMHg2ZSwweDVhLDB4YTAsMHg1MiwweDNiLDB4ZDYsMHhiMywweDI5LDB4ZTMsMHgyZiwweDg0LDB4NTMsMHhkMSwweDAwLDB4ZWQsMHgyMCwweGZjLDB4YjEsMHg1YiwweDZhLDB4Y2IsMHhiZSwweDM5LDB4NGEsMHg0YywweDU4LDB4Y2YsMHhkMCwweGVmLDB4YWEsMHhmYiwweDQzLDB4NGQsMHgzMywweDg1LDB4NDUsMHhmOSwweDAyLDB4N2YsMHg1MCwweDNjLDB4OWYsMHhhOCwweDUxLDB4YTMsMHg0MCwweDhmLDB4OTIsMHg5ZCwweDM4LDB4ZjUsMHhiYywweGI2LDB4ZGEsMHgyMSwweDEwLDB4ZmYsMHhmMywweGQyLDB4Y2QsMHgwYywweDEzLDB4ZWMsMHg1ZiwweDk3LDB4NDQsMHgxNywweGM0LDB4YTcsMHg3ZSwweDNkLDB4NjQsMHg1ZCwweDE5LDB4NzMsMHg2MCwweDgxLDB4NGYsMHhkYywweDIyLDB4MmEsMHg5MCwweDg4LDB4NDYsMHhlZSwweGI4LDB4MTQsMHhkZSwweDVlLDB4MGIsMHhkYiwweGUwLDB4MzIsMHgzYSwweDBhLDB4NDksMHgwNiwweDI0LDB4NWMsMHhjMiwweGQzLDB4YWMsMHg2MiwweDkxLDB4OTUsMHhlNCwweDc5LDB4ZTcsMHhjOCwweDM3LDB4NmQsMHg4ZCwweGQ1LDB4NGUsMHhhOSwweDZjLDB4NTYsMHhmNCwweGVhLDB4NjUsMHg3YSwweGFlLDB4MDgsMHhiYSwweDc4LDB4MjUsMHgyZSwweDFjLDB4YTYsMHhiNCwweGM2LDB4ZTgsMHhkZCwweDc0LDB4MWYsMHg0YiwweGJkLDB4OGIsMHg4YSwweDcwLDB4M2UsMHhiNSwweDY2LDB4NDgsMHgwMywweGY2LDB4MGUsMHg2MSwweDM1LDB4NTcsMHhiOSwweDg2LDB4YzEsMHgxZCwweDllLDB4ZTEsMHhmOCwweDk4LDB4MTEsMHg2OSwweGQ5LDB4OGUsMHg5NCwweDliLDB4MWUsMHg4NywweGU5LDB4Y2UsMHg1NSwweDI4LDB4ZGYsMHg4YywweGExLDB4ODksMHgwZCwweGJmLDB4ZTYsMHg0MiwweDY4LDB4NDEsMHg5OSwweDJkLDB4MGYsMHhiMCwweDU0LDB4YmIsMHgxNl0pOwpjb25zdCBBRVNfUkNPTj1uZXcgVWludDhBcnJheShbMHgwMCwweDAxLDB4MDIsMHgwNCwweDA4LDB4MTAsMHgyMCwweDQwLDB4ODAsMHgxYiwweDM2LDB4NmMsMHhkOCwweGFiLDB4NGRdKTsKZnVuY3Rpb24gYWVzR011bChhLGIpe2xldCBwPTA7Zm9yKGxldCBpPTA7aTw4O2krKyl7aWYoYiYxKXBePWE7Y29uc3QgaGk9YSYweDgwO2E9KGE8PDEpJjB4ZmY7aWYoaGkpYV49MHgxYjtiPj49MX1yZXR1cm4gcH0KZnVuY3Rpb24gYWVzS2V5RXhwYW5zaW9uMjU2KGtleSl7Y29uc3QgTms9OCxOYj00LE5yPTE0O2NvbnN0IHc9bmV3IFVpbnQ4QXJyYXkoNCpOYiooTnIrMSkpO2ZvcihsZXQgaT0wO2k8TmsqNDtpKyspd1tpXT1rZXlbaV07Zm9yKGxldCBpPU5rO2k8TmIqKE5yKzEpO2krKyl7bGV0IHQwPXdbNCooaS0xKV0sdDE9d1s0KihpLTEpKzFdLHQyPXdbNCooaS0xKSsyXSx0Mz13WzQqKGktMSkrM107aWYoaSVOaz09PTApe2NvbnN0IHRtcD10MDt0MD1BRVNfU0JPWFt0MV1eQUVTX1JDT05baS9Oa107dDE9QUVTX1NCT1hbdDJdO3QyPUFFU19TQk9YW3QzXTt0Mz1BRVNfU0JPWFt0bXBdfWVsc2UgaWYoaSVOaz09PTQpe3QwPUFFU19TQk9YW3QwXTt0MT1BRVNfU0JPWFt0MV07dDI9QUVTX1NCT1hbdDJdO3QzPUFFU19TQk9YW3QzXX13WzQqaV09d1s0KihpLU5rKV1edDA7d1s0KmkrMV09d1s0KihpLU5rKSsxXV50MTt3WzQqaSsyXT13WzQqKGktTmspKzJdXnQyO3dbNCppKzNdPXdbNCooaS1OaykrM11edDN9cmV0dXJuIHd9CmZ1bmN0aW9uIGFlc0VuY3J5cHRCbG9jayhpbnB1dCx3KXtjb25zdCBOYj00LE5yPTE0O2NvbnN0IHM9bmV3IFVpbnQ4QXJyYXkoMTYpO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09aW5wdXRbaV07Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXV49d1tpXTtmb3IobGV0IHJvdW5kPTE7cm91bmQ8PU5yO3JvdW5kKyspe2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09QUVTX1NCT1hbc1tpXV07bGV0IHQ9c1sxXTtzWzFdPXNbNV07c1s1XT1zWzldO3NbOV09c1sxM107c1sxM109dDt0PXNbMl07c1syXT1zWzEwXTtzWzEwXT10O3Q9c1s2XTtzWzZdPXNbMTRdO3NbMTRdPXQ7dD1zWzNdO3NbM109c1sxNV07c1sxNV09c1sxMV07c1sxMV09c1s3XTtzWzddPXQ7aWYocm91bmQhPT1Ocil7Zm9yKGxldCBjPTA7Yzw0O2MrKyl7Y29uc3QgaT00KmM7Y29uc3QgYTA9c1tpXSxhMT1zW2krMV0sYTI9c1tpKzJdLGEzPXNbaSszXTtzW2ldPWFlc0dNdWwoYTAsMileYWVzR011bChhMSwzKV5hMl5hMztzW2krMV09YTBeYWVzR011bChhMSwyKV5hZXNHTXVsKGEyLDMpXmEzO3NbaSsyXT1hMF5hMV5hZXNHTXVsKGEyLDIpXmFlc0dNdWwoYTMsMyk7c1tpKzNdPWFlc0dNdWwoYTAsMyleYTFeYTJeYWVzR011bChhMywyKX19Y29uc3Qgb2ZmPXJvdW5kKjE2O2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbb2ZmK2ldfXJldHVybiBzfQpmdW5jdGlvbiBhZXNVdGY4Qnl0ZXMoc3RyKXtjb25zdCBvdXQ9W107Zm9yKGxldCBpPTA7aTxzdHIubGVuZ3RoO2krKyl7bGV0IGM9c3RyLmNoYXJDb2RlQXQoaSk7aWYoYzwweDgwKW91dC5wdXNoKGMpO2Vsc2UgaWYoYzwweDgwMClvdXQucHVzaCgweGMwfChjPj42KSwweDgwfChjJjB4M2YpKTtlbHNlIGlmKGM+PTB4ZDgwMCYmYzw9MHhkYmZmKXtjb25zdCBjMj1zdHIuY2hhckNvZGVBdCgrK2kpO2M9MHgxMDAwMCsoKGMtMHhkODAwKTw8MTApKyhjMi0weGRjMDApO291dC5wdXNoKDB4ZjB8KGM+PjE4KSwweDgwfCgoYz4+MTIpJjB4M2YpLDB4ODB8KChjPj42KSYweDNmKSwweDgwfChjJjB4M2YpKX1lbHNlIG91dC5wdXNoKDB4ZTB8KGM+PjEyKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9cmV0dXJuIG5ldyBVaW50OEFycmF5KG91dCl9CmZ1bmN0aW9uIGFlc0J5dGVzVG9CYXNlNjQoYnl0ZXMpe2NvbnN0IGNoYXJzPSJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvIjtsZXQgcmVzdWx0PSIiLGk9MDtmb3IoO2krMjxieXRlcy5sZW5ndGg7aSs9Myl7Y29uc3Qgbj0oYnl0ZXNbaV08PDE2KXwoYnl0ZXNbaSsxXTw8OCl8Ynl0ZXNbaSsyXTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rY2hhcnNbbiY2M119Y29uc3QgcmVtPWJ5dGVzLmxlbmd0aC1pO2lmKHJlbT09PTEpe2NvbnN0IG49Ynl0ZXNbaV08PDE2O3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rIj09In1lbHNlIGlmKHJlbT09PTIpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpO3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rY2hhcnNbKG4+PjYpJjYzXSsiPSJ9cmV0dXJuIHJlc3VsdH0KZnVuY3Rpb24gYWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbnRleHQsa2V5U3RyKXtjb25zdCBrZXk9YWVzVXRmOEJ5dGVzKGtleVN0cik7aWYoa2V5Lmxlbmd0aCE9PTMyKXRocm93IG5ldyBFcnJvcigiQUVTLTI1NumcgOimgTMy5a2X6IqC5a+G6ZKl77yM5b2T5YmNIitrZXkubGVuZ3RoKTtjb25zdCB3PWFlc0tleUV4cGFuc2lvbjI1NihrZXkpO2NvbnN0IGRhdGE9YWVzVXRmOEJ5dGVzKHBsYWludGV4dCk7Y29uc3QgcGFkTGVuPTE2LShkYXRhLmxlbmd0aCUxNik7Y29uc3QgcGFkZGVkPW5ldyBVaW50OEFycmF5KGRhdGEubGVuZ3RoK3BhZExlbik7cGFkZGVkLnNldChkYXRhKTtmb3IobGV0IGk9ZGF0YS5sZW5ndGg7aTxwYWRkZWQubGVuZ3RoO2krKylwYWRkZWRbaV09cGFkTGVuO2NvbnN0IG91dD1uZXcgVWludDhBcnJheShwYWRkZWQubGVuZ3RoKTtmb3IobGV0IG9mZj0wO29mZjxwYWRkZWQubGVuZ3RoO29mZis9MTYpe291dC5zZXQoYWVzRW5jcnlwdEJsb2NrKHBhZGRlZC5zbGljZShvZmYsb2ZmKzE2KSx3KSxvZmYpfXJldHVybiBhZXNCeXRlc1RvQmFzZTY0KG91dCl9CgovKiA9PT09PT09PT09PT09PT09PSDlrZjlgqggPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbG9hZEpTT04oayxmYWxsYmFjayl7dHJ5e2NvbnN0IHJhdz1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShrKTtpZighcmF3KXJldHVybiBmYWxsYmFjaztjb25zdCB2PUpTT04ucGFyc2UocmF3KTtyZXR1cm4gdj09PXVuZGVmaW5lZHx8dj09PW51bGw/ZmFsbGJhY2s6dn1jYXRjaChlKXtyZXR1cm4gZmFsbGJhY2t9fQpmdW5jdGlvbiBzYXZlSlNPTihrLHYpe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrLEpTT04uc3RyaW5naWZ5KHYpKTtyZXR1cm4gdHJ1ZX1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fQpjb25zdCBERUZBVUxUX0NGRz17YXBwOnthcHBJZDoiUzdxUFdQVTEiLGFwcFNlY3JldDoiYzVlMGRhN2Y0ZGEyOGRmODA1Njk0ZWMzZGQxZmM2NzkyZTlkZjk5ZCJ9LGg1OnthcHBJZDoiU3c1Rjl1SmkiLGFwcFNlY3JldDoiNDY4NzBhOGY2NzhhMDkxMDk0NjhmNWIwMTY4ODE4YjkxYzI5Mjg0NSJ9LGNvbW11bml0eTp7ZW5hYmxlUG9zdDp0cnVlLGVuYWJsZUxpa2U6dHJ1ZSxlbmFibGVDb21tZW50OnRydWUsZW5hYmxlU2hhcmU6dHJ1ZSxlbmFibGVEZWxldGU6dHJ1ZX0sdmVoaWNsZUFlc0tleToiY2UyY2Q3Y2I1NzEyNGMxMzQ5ZGQ4NTQzYmY2ZmQzMWQiLHZlaGljbGVDb250cm9sUmlzazoiIixhdXRvUmVmcmVzaFNlYzo2MCxzZXJ2ZXJCYXNlOiIiLGF1dG9TaWduaW46ZmFsc2UsYXV0b1NpZ25pblRpbWU6IjA3OjAwIix2ZWhpY2xlTW9uaXRvcjpmYWxzZSx3aWRnZXRWZWhpY2xlOiIiLGN1c3RvbUJnOiIifTsKZnVuY3Rpb24gZ2V0Q2ZnKCl7Y29uc3QgYz1sb2FkSlNPTihLRVlTLmNmZyxudWxsKTtpZighYylyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShERUZBVUxUX0NGRykpO3JldHVybnthcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fERFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH0sY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSx2ZWhpY2xlQWVzS2V5OigodHlwZW9mIGMudmVoaWNsZUFlc0tleT09PSJzdHJpbmciP2MudmVoaWNsZUFlc0tleToiIikudHJpbSgpfHxERUZBVUxUX0NGRy52ZWhpY2xlQWVzS2V5KSx2ZWhpY2xlQ29udHJvbFJpc2s6KHR5cGVvZiBjLnZlaGljbGVDb250cm9sUmlzaz09PSJzdHJpbmciP2MudmVoaWNsZUNvbnRyb2xSaXNrOiIiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSxzZXJ2ZXJCYXNlOlN0cmluZyhjLnNlcnZlckJhc2V8fCIiKS50cmltKCksYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsIHdpZGdldFZlaGljbGU6U3RyaW5nKGMud2lkZ2V0VmVoaWNsZXx8IiIpLCBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpfX0KZnVuY3Rpb24gc2F2ZUNmZyhjKXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5jZmcsYyl9CmZ1bmN0aW9uIGdldEFjY291bnRzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmFjY291bnRzLFtdKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfQpmdW5jdGlvbiBzYXZlQWNjb3VudHMobGlzdCl7cmV0dXJuIHNhdmVKU09OKEtFWVMuYWNjb3VudHMsbGlzdCl9CmZ1bmN0aW9uIGdldExvZ3MoKXtjb25zdCBhPWxvYWRKU09OKEtFWVMubG9ncyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gYWRkTG9nKGVudHJ5KXtjb25zdCBsb2dzPWdldExvZ3MoKTtsb2dzLnVuc2hpZnQoZW50cnkpO2lmKGxvZ3MubGVuZ3RoPjUwKWxvZ3MubGVuZ3RoPTUwO3NhdmVKU09OKEtFWVMubG9ncyxsb2dzKX0KZnVuY3Rpb24gY2xlYXJMb2dzKCl7cmV0dXJuIHNhdmVKU09OKEtFWVMubG9ncyxbXSl9CmZ1bmN0aW9uIGlzUHJveHlNb2RlKCl7cmV0dXJuICEhKHdpbmRvdy5fX1BBTkVMX01PREVfXyl8fCEhZ2V0Q2ZnKCkuc2VydmVyQmFzZX0KLyogPT09PT09PT09PT09PT09PT0g562+5ZCNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFNpZ24odHlwZSxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jW3R5cGVdfHxjLmFwcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXR5cGU9PT0iaDUiP2dldFV1aWQoKTp0aW1lc3RhbXArZ2V0UmFuZG9tQ2hhcnMoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj1ib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOicnO2NvbnN0IHNpZ25hdHVyZT10eXBlPT09Img1Ij8ocXVlcnkrcGFyYW0rYWMuYXBwU2VjcmV0KTooYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpO2NvbnN0IHNpZ249bWQ1KHNoYTEoc2lnbmF0dXJlKSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2NmbW90by14LXBhcmFtJzpwYXJhbSwnY2Ztb3RvLXgtc2lnbic6c2lnbiwnY2Ztb3RvLXgtc2lnbi10eXBlJzonMCcsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ25vbmNlJzpub25jZSwnc2lnbmF0dXJlJzpzaWdufX0KCi8vIEg1IOerr+WQqyBib2R5IOetvuWQje+8iGxvZ2luQnlQaG9uZSDnrYnmjqXlj6Plv4Xpobvmioror7fmsYLkvZPnurPlhaXnrb7lkI3vvIzlkKbliJnov5Tlm54gcGVybWl0IGVycm9y77yJCmZ1bmN0aW9uIGg1U2lnbldpdGhCb2R5KGJvZHksY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5oNXx8Yy5hcHA7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPWdldFV1aWQoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj10eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSk7Y29uc3Qgc2lnbj1tZDUoc2hhMShib2R5U3RyK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ2FwcElkJzphYy5hcHBJZH19CgovLyBBcHAg572R5YWz5a6M5pW0562+5ZCN77yI5Y+R56CB5LiO55m75b2V5ZCM572R5YWz77yM6YG/5YWNIEg1IGF1dGhDb2RlIOWPkeeggei/myBBcHAg5rGg6ICMIEg1IGxvZ2luQnlQaG9uZSDmn6XkuI3liLDvvIkKZnVuY3Rpb24gYXBwR2F0ZXdheVNpZ24odXJsLG1ldGhvZCxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jLmFwcHx8Yy5oNTtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHF1ZXJ5PXRvUXVlcnkocGFyYW1zKTtsZXQgcHJlU2lnbj0iIjtpZihTdHJpbmcobWV0aG9kKS50b1VwcGVyQ2FzZSgpPT09IkdFVCIpe2NvbnN0IHU9bmV3IFVSTCh1cmwpO3ByZVNpZ249dS5vcmlnaW4rdS5wYXRobmFtZSsocXVlcnk/Ij8iK3F1ZXJ5OiIiKTt9ZWxzZXtwcmVTaWduPXF1ZXJ5Kyhib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOiIiKTt9Y29uc3Qgc2lnbj1tZDUoc2hhMShwcmVTaWduK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydhcHBJZCc6YWMuYXBwSWQsJ25vbmNlJzpub25jZSwndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnc2lnbmF0dXJlJzpzaWduLCdDZm1vdG8tWC1QYXJhbSc6cGFyYW0sJ0NmbW90by1YLVNpZ24nOnNpZ24sJ0NmbW90by1YLVNpZ24tVHlwZSc6JzAnfX0KCi8vIHYyLjE2LjAg5pyN5Yqh56uv5bey5a+544CM5bimIHF1ZXJ5IOeahCBHRVTjgI3mlLbntKfvvJrluKbml6fnn63moLzlvI8gVUEg5pe25b+F6aG7IHF1ZXJ5IOWFpeetvu+8iOWQpuWImSA0MzAvMzAxMjEgcGVybWl0IGVycm9y77yJ77yMCi8vIOS4juekvuS6pOWGmeaTjeS9nOWQjOS4gOWll+etvuWQje+8iG1kNShzaGExKHF1ZXJ5K3BhcmFtK3NlY3JldCkp77yJ44CC5rWP6KeI5Zmo5peg5rOV6Ieq5a6a5LmJIENvb2tpZe+8jOS9huWunua1i+mdnuW/hemcgOOAggpmdW5jdGlvbiBhcHBRdWVyeVNpZ24ocXVlcnlTdHIsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygxNik7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHNpZ249bWQ1KHNoYTEoKHF1ZXJ5U3RyfHwiIikrcGFyYW0rYWMuYXBwU2VjcmV0KSwzMikudG9TdHJpbmcoKTtyZXR1cm57ImNmbW90by14LXBhcmFtIjpwYXJhbSwiY2Ztb3RvLXgtc2lnbiI6c2lnbiwiY2Ztb3RvLXgtc2lnbi10eXBlIjoiMCIsInRpbWVzdGFtcCI6U3RyaW5nKHRpbWVzdGFtcCksIm5vbmNlIjpub25jZSwic2lnbmF0dXJlIjpzaWdufX0KZnVuY3Rpb24gYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeVN0cixjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCB1YT0iTU9CSUxFfGlPU3wxNy41LjF8WkVFSE9fQVBQfDMuMC41fGlQaG9uZXxpUGhvbmUgMTUgUHJvfDExNzkqMjU1NnwiK2dldFJhbmRvbUNoYXJzKDMyKS50b1VwcGVyQ2FzZSgpKyJ8V1dBTnxpT1MiO3JldHVybnsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQiOiIqLyoiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsImFwcGlkIjpjLmFwcC5hcHBJZCwieC1hcHAtaW5mbyI6dWEsLi4uYXBwUXVlcnlTaWduKHF1ZXJ5U3RyLGMpfX0KCi8qID09PT09PT09PT09PT09PT09IEhUVFDvvIhmZXRjaCDniYjvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gaHR0cEdldCh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkdFVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFBvc3QodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6aGVhZGVyc3x8e30sYm9keTp0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keT09bnVsbD97fTpib2R5KSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFB1dCh1cmwsaGVhZGVycyxib2R5LHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiUFVUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6Ym9keSE9PXVuZGVmaW5lZCYmYm9keSE9PW51bGw/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6dW5kZWZpbmVkLHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwRGVsZXRlKHVybCxoZWFkZXJzLHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiREVMRVRFIixoZWFkZXJzOmhlYWRlcnN8fHt9LHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQpmdW5jdGlvbiBuZXR3b3JrSGludChyZXMpe2NvbnN0IG09U3RyaW5nKChyZXMmJnJlcy5lcnJvcil8fCIiKTtpZigvZmFpbGVkIHRvIGZldGNofG5ldHdvcmtlcnJvcnxjb3JzfGxvYWQgZmFpbGVkfOaXoOazlei/nuaOpXznvZHnu5wvaS50ZXN0KG0pKXJldHVybiLnvZHnu5wv6Leo5Z+f5Y+X6ZmQ77ya55u06L+e5qih5byP6ZyAIFpFRUhPIOacjeWKoeerr+aUvuihjCBDT1JT77yM6K+35qOA5p+l572R57uc6L+e5o6l5ZCO6YeN6K+VIjtyZXR1cm4iIn0KCi8qID09PT09PT09PT09PT09PT09IOebtOi/nuWQjuerr++8iOa1j+iniOWZqOebtOaOpeiwgyBaRUVITyBBUEnvvIkgPT09PT09PT09PT09PT09PT0gKi8KLy8g6aG16Z2i55u06L+e5qih5byP5LiL55qE5YWc5bqV5aS077yaVUEg5pyq6Ieq5a6a5LmJ5pe25q+P5qyh6K+35rGC6ZqP5py66K6+5aSH5oyH57q577yI5LiO6ISa5pys5byV5pOO5ZCM562W55Wl77yM6YG/5YWN5Zu65a6a5oyH57q56KKr6aOO5o6n5ouJ6buR77yJCmZ1bmN0aW9uIHBhZ2VSYW5kb21VQSgpe2NvbnN0IHZlcnM9WyIxNi4xLjEiLCIxNi42LjEiLCIxNi43LjgiLCIxNy4xLjEiLCIxNy4yLjEiLCIxNy40LjEiLCIxNy41LjEiLCIxNy42LjEiLCIxOC4wIiwiMTguMS4xIiwiMTguMy4xIl07cmV0dXJuICJNT0JJTEV8aU9TfCIrdmVyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqdmVycy5sZW5ndGgpXSsifFpFRUhPX0FQUHwzLjAuMXxpUGhvbmV8IisoTWF0aC5yYW5kb20oKTwwLjc/IldXQU4iOiJXSUZJIikrInxpT1MifQpmdW5jdGlvbiBiYXNlSGVhZGVycyhhY2Mpe2NvbnN0IHVhPWFjYy51c2VyQWdlbnR8fHBhZ2VSYW5kb21VQSgpO2NvbnN0IGg9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrY2xlYW5Ub2tlbihhY2MudG9rZW4pLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsIkFjY2VwdC1MYW5ndWFnZSI6InpoLUNOIiwiQWNjZXB0IjoiKi8qIiwiVXNlci1BZ2VudCI6dWEsIngtYXBwLWluZm8iOnVhfTtpZihhY2MudXNlcklkKXtoWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2hbIkNvb2tpZSJdPSJ1c2VyX2lkPSIrYWNjLnVzZXJJZH1yZXR1cm4gaH0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0IixoZWFkZXJzKTtsZXQgbGlzdD1bXTtpZihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCl7aWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpbGlzdD1yZXMuZGF0YTtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmxpc3QpKWxpc3Q9cmVzLmRhdGEubGlzdDtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlY29yZHMpKWxpc3Q9cmVzLmRhdGEucmVjb3JkcztlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJvd3MpKWxpc3Q9cmVzLmRhdGEucm93c31yZXR1cm4gbGlzdC5tYXAodj0+KHt2aW5ObzpTdHJpbmcodi52aW5Ob3x8di5mcmFtZU5vfHx2LnZpbnx8IiIpLnRyaW0oKSxuYW1lOlN0cmluZyh2LnZlaGljbGVOYW1lfHx2LnZlaGljbGVUeXBlfHx2LmRldmljZU5hbWV8fHYubmFtZXx8Iui9pui+hiIpLnRyaW0oKXx8Iui9pui+hiIscGljOlN0cmluZyh2LnZlaGljbGVQaWNVcmx8fHYucGljfHx2LmltYWdlVXJsfHwiIikudHJpbSgpLHZlaGljbGVUeXBlOlN0cmluZyh2LnZlaGljbGVUeXBlfHx2LnR5cGV8fCIiKS50cmltKCksbGljZW5zZVBsYXRlOnYubGljZW5zZVBsYXRlfHxudWxsfSkpLmZpbHRlcih2PT52LnZpbk5vKX1jYXRjaChlKXtyZXR1cm5bXX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvd2lkZ2V0cy8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCBzb2M9TnVtYmVyKGQuYm1zc29jfHxkLmJhdHRlcnlMZXZlbHx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHwwKTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8MCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntiYXR0ZXJ5UGVyY2VudDpNYXRoLm1heCgwLE1hdGgubWluKDEwMCxpc0Zpbml0ZShzb2MpP3NvYzowKSkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsYWRkcmVzczpTdHJpbmcoZC5hZGRyZXNzfHwiIikudHJpbSgpLGxvY2F0aW9uVGltZTpTdHJpbmcoZC5sb2NhdGlvbj8ubG9jYXRpb25UaW1lfHwiIikudHJpbSgpLHZlaGljbGVOYW1lOlN0cmluZyhkLnZlaGljbGVOYW1lfHwiIikudHJpbSgpLHZlaGljbGVJbWFnZVVybDpTdHJpbmcoZC52ZWhpY2xlU2NhbGVQaWNVcmx8fGQudmVoaWNsZVBpY1VybHx8IiIpLnRyaW0oKSxoZWFkTG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fCIiKS50cmltKCksYmF0dGVyeVB1bGxPdXQ6U3RyaW5nKGQuYmF0dGVyeVB1bGxPdXRGbGFnfHwiIik9PT0iMSIsb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fGQuZGV2aWNlT25saW5lfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIixwb3dlclN0YXR1czpTdHJpbmcoZC5hY2NTdGF0dXN8fGQucG93ZXJTdGF0dXN8fGQudmVoaWNsZVN0YXR1c3x8ZC5pZ25pdGlvblN0YXR1c3x8ZC5wb3dlck1vZGV8fGQuYWNjU3RhdGV8fGQucG93ZXJTdGF0ZXx8ZC52ZWhpY2xlU3RhdGV8fGQuZW5naW5lU3RhdHVzfHxkLmlzUG93ZXJPbnx8ZC5wb3dlck9ufHwiIikudHJpbSgpLGxvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGQuY2FyTG9ja1N0YXRlfHxkLmRvb3JMb2NrU3RhdGV8fGQubG9ja0ZsYWd8fGQuaXNMb2NrZWR8fGQubG9ja2VkfHxkLmNlbnRyYWxMb2NraW5nU3RhdHVzfHwiIikudHJpbSgpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBxdWVyeT0idW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/IitxdWVyeTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeSxjZmcpKTtpZihyZXMmJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZlaGljbGVMb2NrPXBpY2tJb3RQcm9wKGQsIlZlaGljbGVMb2NrX1MiKTtjb25zdCBoZWFkTG9ja0lvdD1waWNrSW90UHJvcChkLCJIZWFkTG9ja1N0YXRlIik7Y29uc3QgdG9wTG9jaz1TdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGhlYWRMb2NrSW90fHx2ZWhpY2xlTG9ja3x8IiIpLnRyaW0oKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue3Bvd2VyU3RhdHVzOmRlZXBQaWNrKGQsWyJhY2NTdGF0dXMiLCJwb3dlclN0YXR1cyIsInZlaGljbGVTdGF0dXMiLCJpZ25pdGlvblN0YXR1cyIsInBvd2VyTW9kZSIsImFjY1N0YXRlIiwicG93ZXJTdGF0ZSIsInZlaGljbGVTdGF0ZSIsImVuZ2luZVN0YXR1cyIsImlzUG93ZXJPbiIsInBvd2VyT24iLCJhY2MiXSkudHJpbSgpLGxvY2tTdGF0ZTp0b3BMb2NrLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQucmlkZVN0YXRlfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8IiIpLnRyaW0oKSxyaWRlU3RhdGU6U3RyaW5nKGQucmlkZVN0YXRlfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHF1ZXJ5PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIjtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9hcHAvdmVoaWNsZS90aXJlL21vbml0b3Jpbmc/IitxdWVyeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHF1ZXJ5LGNmZykpO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCBtb250aD1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHFIb21lPSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5Obyk7Y29uc3QgcU15PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZtb250aD0iK21vbnRoO2NvbnN0IFtob21lUmVzLG15UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9ob21lUmlkZUluZm8/IitxSG9tZSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFIb21lLGNmZykpLGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvbXlSaWRlSW5mbz8iK3FNeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFNeSxjZmcpKV0pO2NvbnN0IGg9aG9tZVJlcz8uZGF0YXx8aG9tZVJlc3x8e307Y29uc3QgZD1teVJlcz8uZGF0YXx8bXlSZXN8fHt9O2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShkLnJpZGVSZWNvcmRMaXN0KT9kLnJpZGVSZWNvcmRMaXN0OltdO2NvbnN0IHRvZGF5S2V5PW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGRheT1saXN0LmZpbmQoeD0+U3RyaW5nKHg/LmRhdGV8fCIiKT09PXRvZGF5S2V5KXx8bGlzdFtsaXN0Lmxlbmd0aC0xXXx8e307Y29uc3QgeWVzdD1uZXcgRGF0ZShEYXRlLm5vdygpLTg2NDAwMDAwKTtjb25zdCB5ZXN0S2V5PXllc3QuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKHllc3QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyh5ZXN0LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHlkPWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09eWVzdEtleSl8fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksdG90YWxNaWxlYWdlOk51bWJlcihkLnJpZGVNaWxlYWdlVG90YWw/PzApLHllc3RlcmRheURpc3RhbmNlOk51bWJlcih5ZC5yaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJhdHRlcnlMZXZlbHx8ZC5ibXNzb2N8fDApLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MH19cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19Y2F0Y2goZSl7cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJoNSIse3Zpbk5vOnZpbk5vfSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcmFwcC9hcHAvc2VydmljZS9yZWNoYXJnZS92ZWhpY2xlL2RldGFpbD92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtyZXR1cm57cmVjaGFyZ2VFbmREYXRlOlN0cmluZyhyZXMuZGF0YS5yZWNoYXJnZUVuZERhdGV8fCIiKSxsYXN0VXNlRGF0ZTpOdW1iZXIocmVzLmRhdGEubGFzdFVzZURhdGUpfHwwLHNlcnZpY2VSZWNoYXJnZVN0YXR1czpTdHJpbmcocmVzLmRhdGEuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIiksdmVoaWNsZU5hbWU6U3RyaW5nKHJlcy5kYXRhLnZlaGljbGVOYW1lfHwiIil9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXtoYXNWZWhpY2xlOmZhbHNlLHZlaGljbGVOYW1lOiIiLHZlaGljbGVNb2RlbDoiIix2aW5ObzoiIix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsYmF0dGVyeVBlcmNlbnQ6MCxyZXNpZHVhbFJhbmdlS206MCxyYW5nZUVzdGltYXRlZDpmYWxzZSxhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iixmcm9udFByZXNzdXJlOiIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsbGFzdFJpZGVEdXJhdGlvbjowLHRvdGFsTWlsZWFnZTowLHllc3RlcmRheURpc3RhbmNlOjAsdmVoaWNsZUltYWdlVXJsOiIiLHNlcnZpY2VFbmREYXRlOiIiLHNlcnZpY2VSZW1haW5EYXlzOjAsc2VydmljZVN0YXR1czoiIixwb3dlclN0YXR1czoiIixsb2NrU3RhdGU6IiIsb25saW5lOiIiLHJpZGVTdGF0ZToiIixjdXNoaW9uU3RhdGU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIifTt0cnl7Y29uc3QgYWxsVmVoaWNsZXM9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTtjb25zdCB2ZWhpY2xlcz1hbGxWZWhpY2xlcy5maWx0ZXIoeD0+IS/mqKHmi58vLnRlc3QoU3RyaW5nKHgubmFtZXx8IiIpKyIgIitTdHJpbmcoeC52ZWhpY2xlVHlwZXx8IiIpKSk7aWYodmVoaWNsZXMubGVuZ3RoPT09MClyZXR1cm4gcmVzdWx0O2NvbnN0IHY9dmVoaWNsZXNbMF07cmVzdWx0Lmhhc1ZlaGljbGU9dHJ1ZTtyZXN1bHQudmVoaWNsZU5hbWU9di5uYW1lO3Jlc3VsdC52aW5Obz12LnZpbk5vO3Jlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9di5waWM7cmVzdWx0LnZlaGljbGVNb2RlbD12LnZlaGljbGVUeXBlfHwiIjtjb25zdCBbd2lkZ2V0cyx0aXJlLHJpZGUsYmF0dGVyeSxzZXJ2aWNlLGhvbWVQYWdlXT1hd2FpdCBQcm9taXNlLmFsbChbZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pih7Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowfSkpLGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpXSk7aWYod2lkZ2V0cyl7cmVzdWx0LmJhdHRlcnlQZXJjZW50PXdpZGdldHMuYmF0dGVyeVBlcmNlbnQ7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT13aWRnZXRzLnJlc2lkdWFsUmFuZ2VLbTtyZXN1bHQudm9sdGFnZT13aWRnZXRzLnZvbHRhZ2U7cmVzdWx0LmFkZHJlc3M9d2lkZ2V0cy5hZGRyZXNzO3Jlc3VsdC5sb2NhdGlvblRpbWU9d2lkZ2V0cy5sb2NhdGlvblRpbWU7cmVzdWx0LnBvd2VyU3RhdHVzPXdpZGdldHMucG93ZXJTdGF0dXN8fCIiO3Jlc3VsdC5sb2NrU3RhdGU9d2lkZ2V0cy5sb2NrU3RhdGV8fCIiO2lmKHdpZGdldHMudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXdpZGdldHMudmVoaWNsZU5hbWU7aWYod2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmwpcmVzdWx0LnZlaGljbGVJbWFnZVVybD13aWRnZXRzLnZlaGljbGVJbWFnZVVybDtpZih3aWRnZXRzLm9ubGluZSlyZXN1bHQub25saW5lPXdpZGdldHMub25saW5lO2lmKHdpZGdldHMuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9d2lkZ2V0cy5jdXNoaW9uU3RhdGU7aWYod2lkZ2V0cy5sb25naXR1ZGUhPT0iIiYmd2lkZ2V0cy5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT13aWRnZXRzLmxvbmdpdHVkZTtpZih3aWRnZXRzLmxhdGl0dWRlIT09IiImJndpZGdldHMubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPXdpZGdldHMubGF0aXR1ZGV9aWYoaG9tZVBhZ2Upe2lmKGhvbWVQYWdlLnBvd2VyU3RhdHVzKXJlc3VsdC5wb3dlclN0YXR1cz1ob21lUGFnZS5wb3dlclN0YXR1cztpZihob21lUGFnZS5sb2NrU3RhdGUpcmVzdWx0LmxvY2tTdGF0ZT1ob21lUGFnZS5sb2NrU3RhdGU7aWYoaG9tZVBhZ2Uub25saW5lKXJlc3VsdC5vbmxpbmU9aG9tZVBhZ2Uub25saW5lO2lmKGhvbWVQYWdlLnJpZGVTdGF0ZSlyZXN1bHQucmlkZVN0YXRlPWhvbWVQYWdlLnJpZGVTdGF0ZTtpZihob21lUGFnZS5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT1ob21lUGFnZS5jdXNoaW9uU3RhdGU7aWYoKHJlc3VsdC5sb25naXR1ZGU9PT0iInx8cmVzdWx0LmxvbmdpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxvbmdpdHVkZSE9PSIiJiZob21lUGFnZS5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT1ob21lUGFnZS5sb25naXR1ZGU7aWYoKHJlc3VsdC5sYXRpdHVkZT09PSIifHxyZXN1bHQubGF0aXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sYXRpdHVkZSE9PSIiJiZob21lUGFnZS5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9aG9tZVBhZ2UubGF0aXR1ZGV9aWYodGlyZSl7cmVzdWx0LmZyb250UHJlc3N1cmU9dGlyZS5mcm9udFByZXNzdXJlO3Jlc3VsdC5yZWFyUHJlc3N1cmU9dGlyZS5yZWFyUHJlc3N1cmU7cmVzdWx0LmZyb250VGVtcD10aXJlLmZyb250VGVtcDtyZXN1bHQucmVhclRlbXA9dGlyZS5yZWFyVGVtcH1pZihyaWRlKXtyZXN1bHQudG9kYXlEaXN0YW5jZT1yaWRlLnRvZGF5RGlzdGFuY2U7cmVzdWx0LnRvZGF5RHVyYXRpb249cmlkZS50b2RheUR1cmF0aW9uO3Jlc3VsdC50b2RheU1heFNwZWVkPXJpZGUudG9kYXlNYXhTcGVlZDtyZXN1bHQubGFzdFJpZGVNaWxlYWdlPXJpZGUubGFzdFJpZGVNaWxlYWdlO3Jlc3VsdC5sYXN0UmlkZUR1cmF0aW9uPXJpZGUubGFzdFJpZGVEdXJhdGlvbnx8MDtyZXN1bHQudG90YWxNaWxlYWdlPXJpZGUudG90YWxNaWxlYWdlfHwwO3Jlc3VsdC55ZXN0ZXJkYXlEaXN0YW5jZT1yaWRlLnllc3RlcmRheURpc3RhbmNlfHwwfXJlc3VsdC5jaGFyZ2VTdGF0ZT1iYXR0ZXJ5LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IjtpZihiYXR0ZXJ5LnZvbHRhZ2UpcmVzdWx0LnZvbHRhZ2U9YmF0dGVyeS52b2x0YWdlO2lmKGJhdHRlcnkuY3VycmVudClyZXN1bHQuY3VycmVudD1iYXR0ZXJ5LmN1cnJlbnQ7aWYoYmF0dGVyeS5iYXR0ZXJ5VGVtcClyZXN1bHQuYmF0dGVyeVRlbXA9YmF0dGVyeS5iYXR0ZXJ5VGVtcDtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmYmF0dGVyeS5yZXNpZHVhbFJhbmdlS20pcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1iYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbTtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmcmVzdWx0LmJhdHRlcnlQZXJjZW50PjApe3Jlc3VsdC5yZXNpZHVhbFJhbmdlS209TWF0aC5yb3VuZChyZXN1bHQuYmF0dGVyeVBlcmNlbnQqMS41KTtyZXN1bHQucmFuZ2VFc3RpbWF0ZWQ9dHJ1ZX1pZihzZXJ2aWNlKXtyZXN1bHQuc2VydmljZUVuZERhdGU9c2VydmljZS5yZWNoYXJnZUVuZERhdGV8fCIiO3Jlc3VsdC5zZXJ2aWNlU3RhdHVzPXNlcnZpY2Uuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIjtyZXN1bHQuc2VydmljZVJlbWFpbkRheXM9c2VydmljZS5sYXN0VXNlRGF0ZXx8MDtpZihzZXJ2aWNlLnZlaGljbGVOYW1lKXJlc3VsdC52ZWhpY2xlTmFtZT1zZXJ2aWNlLnZlaGljbGVOYW1lfX1jYXRjaChlKXt9cmV0dXJuIHJlc3VsdH0KCmFzeW5jIGZ1bmN0aW9uIGNoZWNrVG9rZW4oYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7aWYoIXVzZXJJZClyZXR1cm57dmFsaWQ6dHJ1ZSxzY29yZTowLHVzZXJOYW1lOmFjYy51c2VyTmFtZX07Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQsaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOk51bWJlcihyZXMuZGF0YS5zY29yZSl8fDAsdXNlck5hbWU6cmVzLmRhdGEubmlja05hbWV8fGFjYy51c2VyTmFtZX07aWYocmVzLmNvZGU9PSI0MDAwMSJ8fHJlcy5jb2RlPT00MDEpcmV0dXJue3ZhbGlkOmZhbHNlLHJlYXNvbjoidG9rZW7lt7Lov4fmnJ8ifTtyZXR1cm57dmFsaWQ6dHJ1ZSxyZWFzb246cmVzLm1lc3NhZ2V8fCLor7fmsYLlvILluLgifX1jYXRjaChlKXtyZXR1cm57dmFsaWQ6dHJ1ZSxyZWFzb246U3RyaW5nKGUpfX19Cgphc3luYyBmdW5jdGlvbiBnZXRVc2VyaWRCeVRva2VuKHRva2VuLGNmZyl7Y29uc3QgdD1jbGVhblRva2VuKHRva2VuKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0LCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiJ9O2xldCB1c2VySWQ9IiIsdXNlck5hbWU9IiIsZXJyb3I9bnVsbDt0cnl7Y29uc3Qgc2lnbkgwPWdldFNpZ24oImg1Iix7c2VydmVyX25hbWU6IlNNQVJUIn0sJycsY2ZnKTtjb25zdCByZXMwPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9iYXNlSW5mbz9zZXJ2ZXJfbmFtZT1TTUFSVCIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IMH0pO2lmKHJlczAmJlN0cmluZyhyZXMwLmNvZGUpPT09IjEwMDAwIiYmcmVzMC5kYXRhKXt1c2VySWQ9U3RyaW5nKHJlczAuZGF0YS5pZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhyZXMwLmRhdGEubmlja05hbWV8fCIiKX19Y2F0Y2goZSl7fWlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkh9KTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzLmRhdGEuaWR8fHJlcy5kYXRhLnVzZXJJZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhyZXMuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9fWlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0Iix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkh9KTtjb25zdCBmaW5kPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NSlyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2NvbnN0IHZhbD1vYmpba2V5XTtpZigvdXNlci4/aWR8dWlkfGNyZWF0ZS4/Ynl8b3duZXIuP2lkL2kudGVzdChrZXkpJiZ2YWwmJnR5cGVvZiB2YWwhPT0ib2JqZWN0Iil7Y29uc3Qgcz1TdHJpbmcodmFsKTtpZihzLmxlbmd0aD49MTAmJi9eXGQrJC8udGVzdChzKSlyZXR1cm4gc31pZih2YWwmJnR5cGVvZiB2YWw9PT0ib2JqZWN0Iil7Y29uc3QgZj1maW5kKHZhbCxkZXB0aCsxKTtpZihmKXJldHVybiBmfX1yZXR1cm4iIn07Y29uc3QgdWlkPWZpbmQocmVzLDApO2lmKHVpZCl7dXNlcklkPXVpZDtjb25zdCBmaW5kTmFtZT0ob2JqLGRlcHRoKT0+e2lmKCFvYmp8fGRlcHRoPjQpcmV0dXJuIiI7Zm9yKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvYmopKXtpZigvbmljay4/bmFtZXx1c2VyLj9uYW1lL2kudGVzdChrZXkpJiZvYmpba2V5XSYmdHlwZW9mIG9ialtrZXldPT09InN0cmluZyIpcmV0dXJuIG9ialtrZXldO2lmKG9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ib2JqZWN0Iil7Y29uc3Qgbj1maW5kTmFtZShvYmpba2V5XSxkZXB0aCsxKTtpZihuKXJldHVybiBufX1yZXR1cm4iIn07dXNlck5hbWU9ZmluZE5hbWUocmVzLDApfX1jYXRjaChlKXt9fWlmKCF1c2VySWQpZXJyb3I9IuiHquWKqOiOt+WPluWksei0pe+8jOivt+aJi+WKqOWhq+WGmeeUqOaIt0lEIjtyZXR1cm57b2s6ISF1c2VySWQsdXNlcklkLHVzZXJOYW1lLGVycm9yfX0KLyogPT09PT09PT09PT09PT09PT0gdjIuMTYuMCDpmpDol4/pqpHooYzmlbDmja7vvIjovajov7nop6PmnpAgKyDmgKXliLkv5Y6L5byv5qOA5rWL77yJPT09PT09PT09PT09PT09PT0gKi8KLyog5a6Y5pa5IEFwcCDmiorjgIzmnoHpgJ8gLyDmgKXliqDpgJ8gLyDmgKXliLkgLyDljovlvK/jgI3ol4/kuobotbfmnaXvvIjmnI3liqHnq6/og73lipvkvY0gdmVoaWNsZUtpbmRzIC8gY3ljbGluZ0V2ZW50U3RhdGlzdGljRmxhZyDmjqfliLbvvInjgIIKICAg5pys6aG15LuOIHJpZGV0cmFja192MiDnmoTljp/lp4vovajov7nph43nrpfov5nkupvmjIfmoIfvvJvnrpfms5XkuI7pmIjlgLzpgJDooYznp7vmpI3oh6ogWkVFSE8gU3BlZWRIdW50ZXIKICAg77yIZ2l0aHViLmNvbS9SeWFuWXVGaXNoL1plZWhvLVNwZWVkSHVudGVy77yMQUdQTC0zLjDvvInnmoQgUmlkZUNvbmZpZyAvIFRyYWNrQ2FsY3VsYXRvciAvIEJyYWtlRGV0ZWN0b3IgLyBCZW5kRGV0ZWN0b3LjgIIKICAg6L2o6L+55Liy5qC85byP77yabG9uLGxhdCxzcGVlZCx0c1ssZGlyXSYuLi7vvIhyaWRldHJhY2tfdjIg55qEIHRyYWplY3Rvcnkg5a2X5q615Y6f5qC377yJICovCi8qIF9fUklERV9BTEdPX0JFR0lOX18gKi8KdmFyIFJJREVfQ0ZHPXtCRU5EX1ZfTUlOOjIwLEJFTkRfU0VFRDo1LEJFTkRfQ1VNX01JTjoxNSxCRU5EX0NVTV9DQVA6OTAsQkVORF9DT0VGOjEuMCxCRU5EX1ZfTUFYOjgwLEJFTkRfTUlOX0tNOjEuMCxCRU5EX1NURVBfTUFYOjQ1LEJFTkRfUlVOX01JTjoxLEJFTkRfTUVSR0VfR0FQOjAsQkVORF9BTExPV19HQVA6MCxCRU5EX1NFR19ESVNUX01JTjo2LEJFTkRfR0FQX01TX01BWDoyNTAwMCxCUkFLRV9WX01JTjoxNSxCUkFLRV9XSU5fTEFSR0U6NSxCUkFLRV9XSU5fU01BTEw6MyxCUkFLRV9EVl9MQVJHRToxNSxCUkFLRV9EVl9TTUFMTDoyMCxCUkFLRV9BX01JTjowLjUsQlJBS0VfTUVSR0VfR0FQOjUsQlJBS0VfTUlOX0RVUjoxLjUsQlJBS0VfQ0FMSUI6Mi41LE1PVklOR19WX01JTjo1LE1JTl9QT0lOVFM6NCxFQVJUSF9SOjYzNzEwMDB9OwpmdW5jdGlvbiByaWRlTnVtKHYpe2NvbnN0IG49TnVtYmVyKHYpO3JldHVybiBpc0Zpbml0ZShuKT9uOjB9CmZ1bmN0aW9uIHJpZGVQYXJzZVRyYWNrKHN0cil7CiAgY29uc3QgcHRzPVtdOwogIGlmKCFzdHIpcmV0dXJuIHB0czsKICBjb25zdCBzZWc9U3RyaW5nKHN0cikuc3BsaXQoIiYiKTsKICBmb3IoY29uc3QgcyBvZiBzZWcpewogICAgaWYoIXMpY29udGludWU7CiAgICBjb25zdCBwPXMuc3BsaXQoIiwiKTsKICAgIGlmKHAubGVuZ3RoPDQpY29udGludWU7CiAgICBjb25zdCBsb249cGFyc2VGbG9hdChwWzBdKSxsYXQ9cGFyc2VGbG9hdChwWzFdKSx2PXBhcnNlRmxvYXQocFsyXSksdD1wYXJzZUZsb2F0KHBbM10pOwogICAgaWYoIWlzRmluaXRlKGxvbil8fCFpc0Zpbml0ZShsYXQpfHwhaXNGaW5pdGUodil8fCFpc0Zpbml0ZSh0KSljb250aW51ZTsKICAgIHB0cy5wdXNoKHtsb246bG9uLGxhdDpsYXQsdjp2LHQ6dH0pOwogIH0KICByZXR1cm4gcHRzOwp9CmZ1bmN0aW9uIHJpZGVIYXZlcnNpbmUobG9uMSxsYXQxLGxvbjIsbGF0Mil7CiAgY29uc3QgZExhdD0obGF0Mi1sYXQxKSpNYXRoLlBJLzE4MCxkTG9uPShsb24yLWxvbjEpKk1hdGguUEkvMTgwOwogIGNvbnN0IGE9TWF0aC5zaW4oZExhdC8yKSpNYXRoLnNpbihkTGF0LzIpK01hdGguY29zKGxhdDEqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApKk1hdGguc2luKGRMb24vMikqTWF0aC5zaW4oZExvbi8yKTsKICByZXR1cm4gUklERV9DRkcuRUFSVEhfUioyKk1hdGguYXRhbjIoTWF0aC5zcXJ0KGEpLE1hdGguc3FydCgxLWEpKTsKfQpmdW5jdGlvbiByaWRlQmVhcmluZyhsb24xLGxhdDEsbG9uMixsYXQyKXsKICBjb25zdCB5PU1hdGguc2luKChsb24yLWxvbjEpKk1hdGguUEkvMTgwKSpNYXRoLmNvcyhsYXQyKk1hdGguUEkvMTgwKTsKICBjb25zdCB4PU1hdGguY29zKGxhdDEqTWF0aC5QSS8xODApKk1hdGguc2luKGxhdDIqTWF0aC5QSS8xODApLU1hdGguc2luKGxhdDEqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApKk1hdGguY29zKChsb24yLWxvbjEpKk1hdGguUEkvMTgwKTsKICByZXR1cm4gTWF0aC5hdGFuMih5LHgpKjE4MC9NYXRoLlBJOwp9CmZ1bmN0aW9uIHJpZGVBbmdEaWZmKGEsYil7bGV0IGQ9Yi1hO3doaWxlKGQ+MTgwKWQtPTM2MDt3aGlsZShkPC0xODApZCs9MzYwO3JldHVybiBkfQpmdW5jdGlvbiByaWRlTWlkKGEsYil7cmV0dXJuIGErcmlkZUFuZ0RpZmYoYSxiKS8yfQpmdW5jdGlvbiByaWRlQ2FsY01ldHJpY3MocHRzKXsKICBpZighcHRzfHxwdHMubGVuZ3RoPFJJREVfQ0ZHLk1JTl9QT0lOVFMpcmV0dXJuIG51bGw7CiAgbGV0IG1ldGVycz0wLG1vdmluZ01zPTAsbWF4U3BlZWQ9MDsKICBmb3IobGV0IGk9MTtpPHB0cy5sZW5ndGg7aSsrKXsKICAgIGNvbnN0IGE9cHRzW2ktMV0sYj1wdHNbaV07CiAgICBtZXRlcnMrPXJpZGVIYXZlcnNpbmUoYS5sb24sYS5sYXQsYi5sb24sYi5sYXQpOwogICAgY29uc3QgdkluPU1hdGgubWF4KGEudixiLnYpLGR0PWIudC1hLnQ7CiAgICBpZih2SW4+UklERV9DRkcuTU9WSU5HX1ZfTUlOJiZkdD4wJiZkdDw2MDAwMCltb3ZpbmdNcys9ZHQ7CiAgICBpZihiLnY+bWF4U3BlZWQpbWF4U3BlZWQ9Yi52OwogIH0KICBjb25zdCBkdXJhdGlvbk1pbj1NYXRoLm1heCgwLHB0c1twdHMubGVuZ3RoLTFdLnQtcHRzWzBdLnQpLzYwMDAwOwogIGNvbnN0IG1vdmluZ01pbj1tb3ZpbmdNcy82MDAwMDsKICBjb25zdCBkaXN0YW5jZUttPW1ldGVycy8xMDAwOwogIHJldHVybntwb2ludHM6cHRzLmxlbmd0aCxkaXN0YW5jZUttOmRpc3RhbmNlS20sZHVyYXRpb25NaW46ZHVyYXRpb25NaW4sbW92aW5nTWluOm1vdmluZ01pbixtYXhTcGVlZDptYXhTcGVlZDwwPzA6bWF4U3BlZWQsYXZnU3BlZWQ6ZHVyYXRpb25NaW4+MD9kaXN0YW5jZUttL2R1cmF0aW9uTWluOjAsYXZnTW92aW5nU3BlZWQ6bW92aW5nTWluPjA/ZGlzdGFuY2VLbS9tb3ZpbmdNaW46MH07Cn0KZnVuY3Rpb24gcmlkZUNvdW50QnJha2VzKHB0cyl7CiAgY29uc3Qgbj1wdHM/cHRzLmxlbmd0aDowOwogIGlmKG48NClyZXR1cm4gMDsKICBjb25zdCBjYW5kcz1bXTsKICBjb25zdCBzY2FuPSh3aW4sZHZNaW4pPT57CiAgICBmb3IobGV0IGk9MDtpPD1uLXdpbjtpKyspewogICAgICBpZihwdHNbaV0udjxSSURFX0NGRy5CUkFLRV9WX01JTiljb250aW51ZTsKICAgICAgbGV0IG1heFY9LUluZmluaXR5LG1heElkeD1pLG1pblY9SW5maW5pdHksbWluSWR4PWk7CiAgICAgIGNvbnN0IHVwcGVyPU1hdGgubWluKGkrd2luLG4tMSk7CiAgICAgIGZvcihsZXQgaj1pKzE7ajw9dXBwZXI7aisrKXsKICAgICAgICBjb25zdCB2PXB0c1tqXS52OwogICAgICAgIGlmKHY+bWF4Vil7bWF4Vj12O21heElkeD1qfQogICAgICAgIGlmKHY8bWluVil7bWluVj12O21pbklkeD1qfQogICAgICB9CiAgICAgIGNvbnN0IGR2PW1heFYtbWluVjsKICAgICAgaWYoZHY8ZHZNaW58fG1pbklkeDw9bWF4SWR4KWNvbnRpbnVlOwogICAgICBjb25zdCBkdD0ocHRzW21pbklkeF0udC1wdHNbbWF4SWR4XS50KS8xMDAwOwogICAgICBpZihkdDxSSURFX0NGRy5CUkFLRV9NSU5fRFVSfHxkdi8zLjYvZHQ8UklERV9DRkcuQlJBS0VfQV9NSU4pY29udGludWU7CiAgICAgIGNhbmRzLnB1c2goe2lkeDptYXhJZHgsZHY6ZHZ9KTsKICAgIH0KICB9OwogIHNjYW4oUklERV9DRkcuQlJBS0VfV0lOX0xBUkdFLFJJREVfQ0ZHLkJSQUtFX0RWX0xBUkdFKTsKICBzY2FuKFJJREVfQ0ZHLkJSQUtFX1dJTl9TTUFMTCxSSURFX0NGRy5CUkFLRV9EVl9TTUFMTCk7CiAgY2FuZHMuc29ydCgoYSxiKT0+YS5pZHgtYi5pZHgpOwogIGNvbnN0IG1lcmdlZD1bXTsKICBmb3IoY29uc3QgYyBvZiBjYW5kcyl7CiAgICBpZighbWVyZ2VkLmxlbmd0aHx8Yy5pZHgtbWVyZ2VkW21lcmdlZC5sZW5ndGgtMV0uaWR4Pj1SSURFX0NGRy5CUkFLRV9NRVJHRV9HQVApbWVyZ2VkLnB1c2goYyk7CiAgICBlbHNlIGlmKGMuZHY+bWVyZ2VkW21lcmdlZC5sZW5ndGgtMV0uZHYpbWVyZ2VkW21lcmdlZC5sZW5ndGgtMV09YzsKICB9CiAgY29uc3Qgcj1NYXRoLnJvdW5kKG1lcmdlZC5sZW5ndGgqUklERV9DRkcuQlJBS0VfQ0FMSUIpOwogIHJldHVybiByPDA/MDpyOwp9CmZ1bmN0aW9uIHJpZGVDb3VudEJlbmRzKHB0cyl7CiAgY29uc3Qgbj1wdHM/cHRzLmxlbmd0aDowOwogIGlmKG48NClyZXR1cm4gMDsKICBjb25zdCBoZGc9bmV3IEFycmF5KG4tMSk7CiAgZm9yKGxldCBpPTA7aTxuLTE7aSsrKXsKICAgIGNvbnN0IGE9cHRzW2ldLGI9cHRzW2krMV07CiAgICBjb25zdCBkPXJpZGVIYXZlcnNpbmUoYS5sb24sYS5sYXQsYi5sb24sYi5sYXQpLHR0PWIudC1hLnQ7CiAgICBoZGdbaV09KGQ8UklERV9DRkcuQkVORF9TRUdfRElTVF9NSU58fHR0PlJJREVfQ0ZHLkJFTkRfR0FQX01TX01BWHx8dHQ8PTApP05hTjpyaWRlQmVhcmluZyhhLmxvbixhLmxhdCxiLmxvbixiLmxhdCk7CiAgfQogIGNvbnN0IHNoPW5ldyBBcnJheShuLTEpOwogIGZvcihsZXQgaT0wO2k8bi0xO2krKyl7CiAgICBpZihpc05hTihoZGdbaV0pKXtzaFtpXT1OYU47Y29udGludWV9CiAgICBjb25zdCBwcmV2PShpPjAmJiFpc05hTihoZGdbaS0xXSkpP2hkZ1tpLTFdOm51bGw7CiAgICBjb25zdCBuZXh0PShpPG4tMiYmIWlzTmFOKGhkZ1tpKzFdKSk/aGRnW2krMV06bnVsbDsKICAgIGlmKHByZXYhPT1udWxsJiZuZXh0IT09bnVsbClzaFtpXT1yaWRlTWlkKHJpZGVNaWQocHJldixoZGdbaV0pLG5leHQpOwogICAgZWxzZSBpZihwcmV2IT09bnVsbClzaFtpXT1yaWRlTWlkKHByZXYsaGRnW2ldKTsKICAgIGVsc2UgaWYobmV4dCE9PW51bGwpc2hbaV09cmlkZU1pZChoZGdbaV0sbmV4dCk7CiAgICBlbHNlIHNoW2ldPWhkZ1tpXTsKICB9CiAgY29uc3QgdHVybj1uZXcgQXJyYXkobikuZmlsbChmYWxzZSksZGhkZz1uZXcgQXJyYXkobikuZmlsbCgwKSxzZ249bmV3IEFycmF5KG4pLmZpbGwoMCk7CiAgZm9yKGxldCBpPTE7aTxuLTE7aSsrKXsKICAgIGlmKGlzTmFOKHNoW2ktMV0pfHxpc05hTihzaFtpXSkpY29udGludWU7CiAgICBjb25zdCBkPXJpZGVBbmdEaWZmKHNoW2ktMV0sc2hbaV0pOwogICAgZGhkZ1tpXT1kOwogICAgY29uc3QgdkluPU1hdGgubWF4KHB0c1tpLTFdLnYscHRzW2ldLnYpOwogICAgaWYodkluPFJJREVfQ0ZHLkJFTkRfVl9NSU58fHZJbj5SSURFX0NGRy5CRU5EX1ZfTUFYKWNvbnRpbnVlOwogICAgaWYoTWF0aC5hYnMoZCk+PVJJREVfQ0ZHLkJFTkRfU1RFUF9NQVgpY29udGludWU7CiAgICBpZihNYXRoLmFicyhkKT49UklERV9DRkcuQkVORF9TRUVEKXt0dXJuW2ldPXRydWU7c2duW2ldPWQ+MD8xOi0xfQogIH0KICBjb25zdCBydW5zPVtdO2xldCBjdXI9bnVsbCxnYXA9MDsKICBmb3IobGV0IGk9MTtpPG4tMTtpKyspewogICAgaWYodHVybltpXSl7CiAgICAgIGlmKGN1cj09PW51bGwpe2N1cj17czppLGU6aSxjdW06TWF0aC5hYnMoZGhkZ1tpXSksc2lnbjpzZ25baV19fQogICAgICBlbHNlIGlmKHNnbltpXT09PWN1ci5zaWduKXtjdXIuY3VtKz1NYXRoLmFicyhkaGRnW2ldKX0KICAgICAgZWxzZXtydW5zLnB1c2goY3VyKTtjdXI9e3M6aSxlOmksY3VtOk1hdGguYWJzKGRoZGdbaV0pLHNpZ246c2duW2ldfX0KICAgICAgY3VyLmU9aTtnYXA9MDsKICAgIH1lbHNlIGlmKGN1ciE9PW51bGwmJmdhcDxSSURFX0NGRy5CRU5EX0FMTE9XX0dBUCl7Z2FwKys7Y3VyLmU9aX0KICAgIGVsc2UgaWYoY3VyIT09bnVsbCl7cnVucy5wdXNoKGN1cik7Y3VyPW51bGx9CiAgfQogIGlmKGN1ciE9PW51bGwpcnVucy5wdXNoKGN1cik7CiAgbGV0IGNudD0wLGxhc3RFbmQ9TmFOLGxhc3RTaWduPTA7CiAgZm9yKGNvbnN0IHIgb2YgcnVucyl7CiAgICBpZihyLmN1bTxSSURFX0NGRy5CRU5EX0NVTV9NSU58fHIuY3VtPlJJREVfQ0ZHLkJFTkRfQ1VNX0NBUCljb250aW51ZTsKICAgIGlmKHIuZS1yLnMrMTxSSURFX0NGRy5CRU5EX1JVTl9NSU4pY29udGludWU7CiAgICBsZXQgbWF4Vj0wOwogICAgZm9yKGxldCBqPXIucztqPD1yLmUmJmo8bjtqKyspe2lmKHB0c1tqXS52Pm1heFYpbWF4Vj1wdHNbal0udn0KICAgIGlmKG1heFY+UklERV9DRkcuQkVORF9WX01BWCljb250aW51ZTsKICAgIGlmKHIuc2lnbj09PWxhc3RTaWduJiYhaXNOYU4obGFzdEVuZCkmJnIucy1sYXN0RW5kPD1SSURFX0NGRy5CRU5EX01FUkdFX0dBUCl7bGFzdEVuZD1yLmU7Y29udGludWV9CiAgICBjbnQrKztsYXN0RW5kPXIuZTtsYXN0U2lnbj1yLnNpZ247CiAgfQogIHJldHVybiBNYXRoLnJvdW5kKGNudCpSSURFX0NGRy5CRU5EX0NPRUYpOwp9CmZ1bmN0aW9uIHJpZGVOb3JtRGF5KHJhdyl7CiAgaWYocmF3PT1udWxsKXJldHVybiBudWxsOwogIGxldCB0PVN0cmluZyhyYXcpLnRyaW0oKTsKICBpZighdClyZXR1cm4gbnVsbDsKICBpZih0Lmxlbmd0aD09PTgmJi9eXGR7OH0kLy50ZXN0KHQpKXJldHVybiB0LnNsaWNlKDAsNCkrIi4iK3Quc2xpY2UoNCw2KSsiLiIrdC5zbGljZSg2LDgpOwogIHQ9dC5yZXBsYWNlKC8tL2csIi4iKS5yZXBsYWNlKC9cLy9nLCIuIik7CiAgY29uc3QgcD10LnNwbGl0KCIuIik7CiAgaWYocC5sZW5ndGg9PT0zJiYvXlxkKyQvLnRlc3QocFswXSkmJi9eXGQrJC8udGVzdChwWzFdKSYmL15cZCskLy50ZXN0KHBbMl0pKQogICAgcmV0dXJuIHBbMF0rIi4iK1N0cmluZyhwYXJzZUludChwWzFdLDEwKSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcocGFyc2VJbnQocFsyXSwxMCkpLnBhZFN0YXJ0KDIsIjAiKTsKICByZXR1cm4gbnVsbDsKfQovKiDkuIDnu4QgcmlkZXRyYWNrX3YyIOWkqeWIhue7hCDihpIge2RheUtleTp7a20sZHVyLG1heFYsYnJha2VzLGJlbmRzLHJpZGVzOlsuLi5dfX0KICAg6K+t5LmJ5LiOIFNwZWVkSHVudGVyIFJpZGVGaWxsIOS4gOiHtO+8muaApeWIuS/ljovlvK/mjInovajov7nph43nrpfvvIjmnI3liqHnq6/ov5nkuKTkuKrlrZfmrrXluLjlubTnvLrlpLHvvInvvJsKICAg6YeM56iLL+aegemAn+acjeWKoeerr+mdniAwIOaXtuS7peacjeWKoeerr+S4uuWHhu+8jOS4uiAwIOaJjeihpeeul+OAgiAqLwpmdW5jdGlvbiByaWRlRGF5U2NhbihkYXlzKXsKICBjb25zdCBvdXQ9e307CiAgaWYoIUFycmF5LmlzQXJyYXkoZGF5cykpcmV0dXJuIG91dDsKICBmb3IoY29uc3QgZGF5IG9mIGRheXMpewogICAgaWYoIWRheXx8dHlwZW9mIGRheSE9PSJvYmplY3QiKWNvbnRpbnVlOwogICAgY29uc3QgbGlzdD1BcnJheS5pc0FycmF5KGRheS5oaXN0b3J5TGlzdCk/ZGF5Lmhpc3RvcnlMaXN0OltdOwogICAgZm9yKGNvbnN0IHIgb2YgbGlzdCl7CiAgICAgIGlmKCFyfHx0eXBlb2YgciE9PSJvYmplY3QiKWNvbnRpbnVlOwogICAgICBjb25zdCB0cmFqPVN0cmluZyhyLnRyYWplY3Rvcnl8fCIiKTsKICAgICAgaWYoIXRyYWopY29udGludWU7CiAgICAgIGNvbnN0IHB0cz1yaWRlUGFyc2VUcmFjayh0cmFqKTsKICAgICAgaWYocHRzLmxlbmd0aDxSSURFX0NGRy5NSU5fUE9JTlRTKWNvbnRpbnVlOwogICAgICBjb25zdCBtPXJpZGVDYWxjTWV0cmljcyhwdHMpOwogICAgICBjb25zdCBicmFrZXM9cmlkZUNvdW50QnJha2VzKHB0cyk7CiAgICAgIGxldCBiZW5kcz1yaWRlQ291bnRCZW5kcyhwdHMpOwogICAgICBpZihtJiZtLmRpc3RhbmNlS208UklERV9DRkcuQkVORF9NSU5fS00pYmVuZHM9MDsgICAvLyDnn63ooYznqIvmlbTotp/liKQw77yaPDFrbSDnmoTlr4bluqbmmK/plb/pgJTnmoQgOCDlgI3vvIhHUFMg5YGc6L2m5Lmx6aOY77yJCiAgICAgIGNvbnN0IGRrPXJpZGVOb3JtRGF5KHIuZGF5VGltZXx8ZGF5LmRheVRpbWUpOwogICAgICBpZighZGspY29udGludWU7CiAgICAgIGNvbnN0IGc9b3V0W2RrXXx8KG91dFtka109e2ttOjAsZHVyOjAsbWF4VjowLGJyYWtlczowLGJlbmRzOjAscmlkZXM6W119KTsKICAgICAgY29uc3Qgc3J2TWF4PXJpZGVOdW0oci5tYXhTcGVlZCk7CiAgICAgIGNvbnN0IG1heFY9c3J2TWF4PjA/c3J2TWF4OihtP20ubWF4U3BlZWQ6MCk7CiAgICAgIGcua20rPW0/bS5kaXN0YW5jZUttOjA7Zy5kdXIrPW0/bS5kdXJhdGlvbk1pbjowOwogICAgICBpZihtYXhWPmcubWF4VilnLm1heFY9bWF4VjsKICAgICAgZy5icmFrZXMrPWJyYWtlcztnLmJlbmRzKz1iZW5kczsKICAgICAgbGV0IGFkZHI9IiI7CiAgICAgIHRyeXsKICAgICAgICBjb25zdCBzYT1KU09OLnBhcnNlKHIuc3RhcnRBZGRyfHwie30iKSxlYT1KU09OLnBhcnNlKHIuZW5kQWRkcnx8Int9Iik7CiAgICAgICAgY29uc3QgczE9U3RyaW5nKHNhLm5hbWV8fHNhLmFkZHJlc3N8fCIiKS50cmltKCksZTE9U3RyaW5nKGVhLm5hbWV8fGVhLmFkZHJlc3N8fCIiKS50cmltKCk7CiAgICAgICAgaWYoczF8fGUxKWFkZHI9KHMxfHwiIikrIiDihpIgIisoZTF8fCIiKTsKICAgICAgfWNhdGNoKGUpe30KICAgICAgZy5yaWRlcy5wdXNoKHt0MDpwdHNbMF0udCxrbTptP20uZGlzdGFuY2VLbTowLGR1cjptP20uZHVyYXRpb25NaW46MCxtYXhWOm1heFYsYnJha2VzOmJyYWtlcyxiZW5kczpiZW5kcyxwb2ludHM6cHRzLmxlbmd0aCwKICAgICAgICB0MHN0cjpTdHJpbmcoci5zdGFydFRpbWV8fCIiKSx0MXN0cjpTdHJpbmcoci5lbmRUaW1lfHwiIiksYWRkcjphZGRyLAogICAgICAgIHNydkttOnJpZGVOdW0oci5yaWRlTWlsZWFnZSksc3J2RHVyOnJpZGVOdW0oci5yaWRpbmdUaW1lVW5pdE1pbnV0ZSksc3J2QWNjZWw6cmlkZU51bShyLmFjY2VsZXJhdGlvblRpbWVzKSwKICAgICAgICB0aHVtYjpTdHJpbmcoci50cmFja1RodW1ibmFpbHN8fCIiKX0pOwogICAgfQogIH0KICBmb3IoY29uc3QgayBpbiBvdXQpaWYob3V0W2tdJiZvdXRba10ucmlkZXMpb3V0W2tdLnJpZGVzLnNvcnQoKGEsYik9PmEudDAtYi50MCk7CiAgcmV0dXJuIG91dDsKfQovKiBfX1JJREVfQUxHT19FTkRfXyAqLwovKiDnm7Tov57mqKHlvI/vvIjpnZ7ku6PnkIbvvInmi4nlj5bvvJrmnIjluqbmsYfmgLsgLyDovajov7nliIbpobXvvIjotbDotKblj7cgVG9rZW4gKyBhcHAg562+5ZCN77yM5LiO6aaW6aG155u06L+e5LiA6Ie077yJICovCmZ1bmN0aW9uIHJpZGVBY2NMb2NhbCh1c2VySWQpe2NvbnN0IGFjY3M9Z2V0QWNjb3VudHMoKTtyZXR1cm4gYWNjcy5maW5kKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSl8fGFjY3NbMF18fG51bGx9CmFzeW5jIGZ1bmN0aW9uIGZldGNoUmlkZU1vbnRoRGlyZWN0KGFjYyxjZmcsbW9udGgsdmluKXsKICB0cnl7CiAgICBpZighYWNjKXJldHVybntvazpmYWxzZSxlcnJvcjoi5pyq5om+5Yiw6LSm5Y+3In07CiAgICBjb25zdCBtb250aDI9bW9udGh8fChuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKTsKICAgIGxldCB2aW5Obz1TdHJpbmcodmlufHwiIikudHJpbSgpLHZlaGljbGVOYW1lPSIiOwogICAgaWYoIXZpbk5vKXsKICAgICAgY29uc3QgbGlzdD1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpOwogICAgICBjb25zdCB2ZWhpY2xlcz1saXN0LmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTsKICAgICAgaWYoIXZlaGljbGVzLmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui0puWPt+acque7keWumui9pui+hiJ9OwogICAgICB2aW5Obz12ZWhpY2xlc1swXS52aW5Obzt2ZWhpY2xlTmFtZT12ZWhpY2xlc1swXS5uYW1lOwogICAgfQogICAgY29uc3QgcXVlcnk9InZpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KG1vbnRoMik7CiAgICBjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9teVJpZGVJbmZvPyIrcXVlcnksYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeSxjZmcpKTsKICAgIGlmKHJlcyYmU3RyaW5nKHJlcy5jb2RlKT09PSIxMDAwMCIpcmV0dXJue29rOnRydWUsbW9udGg6bW9udGgyLHZpbk5vOnZpbk5vLHZlaGljbGVOYW1lOnZlaGljbGVOYW1lLGRhdGE6cmVzLmRhdGF8fHt9fTsKICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5jb2RlKSl8fCLmjqXlj6Pml6Dlk43lupQiLHZpbk5vOnZpbk5vfTsKICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19Cn0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXR0ZXJ5U3RhdGVEaXJlY3QoYWNjLGNmZyx2aW4pewogIHRyeXsKICAgIGlmKCFhY2MpcmV0dXJue29rOmZhbHNlLGVycm9yOiLmnKrmib7liLDotKblj7cifTsKICAgIGxldCB2aW5Obz1TdHJpbmcodmlufHwiIikudHJpbSgpOwogICAgaWYoIXZpbk5vKXtjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7Y29uc3QgdnM9bGlzdC5maWx0ZXIoeD0+IS/mqKHmi58vLnRlc3QoU3RyaW5nKHgubmFtZXx8IiIpKyIgIitTdHJpbmcoeC52ZWhpY2xlVHlwZXx8IiIpKSk7aWYoIXZzLmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui0puWPt+acque7keWumui9pui+hiJ9O3Zpbk5vPXZzWzBdLnZpbk5vO30KICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2JhdHRlcnlJbmZvLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxiYXNlSGVhZGVycyhhY2MpKTsKICAgIGlmKHJlcyYmcmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO3JldHVybntvazp0cnVlLHZpbk5vOnZpbk5vLGNoYXJnaW5nOi/lhYXnlLUvLnRlc3QoU3RyaW5nKGQuY2hhcmdlU3RhdGVTdHJ8fGQuY2hhcmdlU3RhdGV8fCIiKSksY3VycmVudDpOdW1iZXIoZC5jdXJyZW50fHxkLmJhdHRlcnlDdXJyZW50fHxkLmJtc0N1cnJlbnR8fDApLHNvYzpOdW1iZXIoZC5zb2N8fGQuYmF0dGVyeUxldmVsfHxkLmJtc3NvY3x8MCksdm9sdGFnZTpOdW1iZXIoZC52b2x0YWdlfHxkLmJhdHRlcnlWb2x0YWdlfHxkLmJtc1ZvbHRhZ2V8fDApLGNoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IiksZnVsbENoYXJnZVRpbWU6TnVtYmVyKGQuZnVsbENoYXJnZVRpbWV8fDApLGZ1bGxDaGFyZ2VUaW1lU2Vjb25kOk51bWJlcihkLmZ1bGxDaGFyZ2VUaW1lU2Vjb25kfHwwKX07fQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwi5o6l5Y+j5peg5ZON5bqUIn07CiAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQp9CmFzeW5jIGZ1bmN0aW9uIGZldGNoUmlkZVRyYWNrRGlyZWN0KGFjYyxjZmcsdmluLHBhZ2UscGFnZVNpemUsbW9udGgpewogIHRyeXsKICAgIGlmKCFhY2MpcmV0dXJue29rOmZhbHNlLGVycm9yOiLmnKrmib7liLDotKblj7cifTsKICAgIGxldCB2aW5Obz1TdHJpbmcodmlufHwiIikudHJpbSgpOwogICAgaWYoIXZpbk5vKXsKICAgICAgY29uc3QgbGlzdD1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpOwogICAgICBjb25zdCB2ZWhpY2xlcz1saXN0LmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTsKICAgICAgaWYoIXZlaGljbGVzLmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui0puWPt+acque7keWumui9pui+hiJ9OwogICAgICB2aW5Obz12ZWhpY2xlc1swXS52aW5ObzsKICAgIH0KICAgIGNvbnN0IHBnPU1hdGgubWF4KDEsTnVtYmVyKHBhZ2UpfHwxKSxwcz1NYXRoLm1heCgxLE1hdGgubWluKDIwMCxOdW1iZXIocGFnZVNpemUpfHwyMCkpOwogICAgY29uc3Qgc3Q9U3RyaW5nKG1vbnRofHwiIikucmVwbGFjZSgiLiIsIi0iKXx8KG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikpOwogICAgY29uc3QgcXVlcnk9InZpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJnBhZ2U9IitwZysiJnBhZ2VTaXplPSIrcHMrIiZzdGFydFRpbWU9IitlbmNvZGVVUklDb21wb25lbnQoc3QpOwogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvcmlkZXRyYWNrX3YyPyIrcXVlcnksYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeSxjZmcpKTsKICAgIGlmKHJlcyYmU3RyaW5nKHJlcy5jb2RlKT09PSIxMDAwMCIpewogICAgICBsZXQgZGF5cz1bXTsKICAgICAgaWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpZGF5cz1yZXMuZGF0YTsKICAgICAgZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5saXN0KSlkYXlzPXJlcy5kYXRhLmxpc3Q7CiAgICAgIGVsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEuZGF5TGlzdCkpZGF5cz1yZXMuZGF0YS5kYXlMaXN0OwogICAgICByZXR1cm57b2s6dHJ1ZSxwYWdlOnBnLHZpbk5vOnZpbk5vLGRheXM6ZGF5c307CiAgICB9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6KHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMuY29kZSkpfHwi5o6l5Y+j5peg5ZON5bqUIixwYWdlOnBnLHZpbk5vOnZpbk5vfTsKICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19Cn0KLyogPT09PT09PT09PT09PT09PT0g6LSm5Y+35pWw5o2u5ouJ5Y+WID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW5Obyl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2xldCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7Y29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgdG9kYXk9bm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgcmVzdWx0PXt1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6XnlKjmiLciLHVzZXJJZCxzY29yZTowLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czowLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6MCxsYXN0NzpbXSxlcnJvcjpudWxsLHZlaGljbGU6e2hhc1ZlaGljbGU6ZmFsc2V9fTsKaWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCB2ZWhpY2xlUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0Iix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfSk7aWYodmVoaWNsZVJlcy5jb2RlPT0iMTAwMDAiJiZ2ZWhpY2xlUmVzLmRhdGEpe2NvbnN0IGF1dG9VaWQ9U3RyaW5nKHZlaGljbGVSZXMuZGF0YS51c2VySWR8fHZlaGljbGVSZXMuZGF0YS51aWR8fHZlaGljbGVSZXMuZGF0YS5pZHx8IiIpO2lmKGF1dG9VaWQpe3VzZXJJZD1hdXRvVWlkO3Jlc3VsdC51c2VySWQ9dXNlcklkO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgaWR4PWFjY291bnRzLmZpbmRJbmRleChhPT5jbGVhblRva2VuKGEudG9rZW4pPT09dG9rZW4pO2lmKGlkeD49MCYmIWFjY291bnRzW2lkeF0udXNlcklkKXthY2NvdW50c1tpZHhdLnVzZXJJZD11c2VySWQ7c2F2ZUFjY291bnRzKGFjY291bnRzKX19fX1jYXRjaChlKXt9fQp0cnl7cmVzdWx0LnZlaGljbGU9YXdhaXQgZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnLHZpbk5vKX1jYXRjaChlKXtyZXN1bHQudmVoaWNsZT17aGFzVmVoaWNsZTpmYWxzZX19CnRyeXtpZighdXNlcklkKXtyZXN1bHQuZXJyb3I9Iuivt+WcqOiuvue9rumhteWhq+WGmeeUqOaIt0lEIn1lbHNle2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nLyIrdXNlcklkLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZCwuLi5zaWduSH0pO2lmKGluZm9SZXMuY29kZT09IjEwMDAwIiYmaW5mb1Jlcy5kYXRhKXtyZXN1bHQuc2NvcmU9TnVtYmVyKGluZm9SZXMuZGF0YS5zY29yZXx8aW5mb1Jlcy5kYXRhLmludGVncmFsfHxpbmZvUmVzLmRhdGEucG9pbnR8fGluZm9SZXMuZGF0YS5wb2ludHN8fGluZm9SZXMuZGF0YS50b3RhbFNjb3JlfHxpbmZvUmVzLmRhdGEudG90YWxJbnRlZ3JhbHx8MCl9ZWxzZSBpZihpbmZvUmVzLmNvZGU9PSI0MDAwMSJ8fGluZm9SZXMuY29kZT09NDAxKXtyZXN1bHQuZXJyb3I9IlRva2Vu5bey6L+H5pyfIn1lbHNle3Jlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5aSx6LSlOiAiKyhpbmZvUmVzLm1lc3NhZ2V8fGluZm9SZXMuY29kZXx8IuacquefpemUmeivryIpfX19Y2F0Y2goZSl7aWYoIXJlc3VsdC5lcnJvcilyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluW8guW4uDogIitTdHJpbmcoZSl9CnRyeXtjb25zdCBjdXJNb250aD1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrKG5vdy5nZXRNb250aCgpKzEpO2NvbnN0IGxhc3REYXRlPW5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLG5vdy5nZXRNb250aCgpLTEsMSk7Y29uc3QgbGFzdE1vbnRoPWxhc3REYXRlLmdldEZ1bGxZZWFyKCkrIi0iKyhsYXN0RGF0ZS5nZXRNb250aCgpKzEpO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZH07Y29uc3QgW2N1clJlcyxsYXN0UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrY3VyTW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGg6Y3VyTW9udGh9LCcnLGNmZyl9KSxodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2luZm8/bW9udGg9IitsYXN0TW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGg6bGFzdE1vbnRofSwnJyxjZmcpfSldKTtjb25zdCBsYXN0TGlzdD0obGFzdFJlcy5jb2RlPT0iMTAwMDAiJiZsYXN0UmVzLmRhdGEpPyhsYXN0UmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGN1ckxpc3Q9KGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSk/KGN1clJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBsaXN0PVsuLi5sYXN0TGlzdCwuLi5jdXJMaXN0XTtpZihjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpe3Jlc3VsdC5zaWduQ291bnQ9TnVtYmVyKGN1clJlcy5kYXRhLnNpZ25Db3VudCl8fDB9Y29uc3QgdG9kYXlFbnRyeT1jdXJMaXN0LmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduZWRUb2RheT0hISh0b2RheUVudHJ5JiYodG9kYXlFbnRyeS5zaWduU3RhdHVlPT0zfHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTV8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09MCkpO3Jlc3VsdC50b2RheVNjb3JlPXRvZGF5RW50cnk/KE51bWJlcih0b2RheUVudHJ5LmludGVncmFsU2NvcmUpfHwwKTowO3RyeXtjb25zdCBfdG9kYXlMb2dzPShnZXRMb2dzKCl8fFtdKS5maWx0ZXIobD0+bCYmbC5kYXRlPT09dG9kYXkmJlN0cmluZyhsLnVzZXJJZHx8IiIpPT09U3RyaW5nKHVzZXJJZCkmJmwuc3VjY2Vzcyk7aWYoX3RvZGF5TG9ncy5sZW5ndGg+MCl7Y29uc3QgX3RsPV90b2RheUxvZ3NbMF07cmVzdWx0LnRvZGF5U2NvcmU9TnVtYmVyKF90bC50b3RhbEdhaW4pfHxyZXN1bHQudG9kYXlTY29yZTtyZXN1bHQudG9kYXlEZXRhaWw9e3NpZ25pblNjb3JlOk51bWJlcihfdGwuc2lnbmluU2NvcmUpfHwwLGJsaW5kQm94U2NvcmU6TnVtYmVyKF90bC5ibGluZEJveFNjb3JlKXx8MCxpbnRlcmFjdFNjb3JlOk51bWJlcihfdGwuaW50ZXJhY3RTY29yZSl8fDB9fX1jYXRjaChlKXt9Y29uc3QgdG9kYXlJZHg9bGlzdC5maW5kSW5kZXgoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2xldCBjb250PTA7aWYodG9kYXlJZHg+PTApe2ZvcihsZXQgaT10b2RheUlkeDtpPj0wO2ktLSl7Y29uc3Qgc3Q9bGlzdFtpXT8uc2lnblN0YXR1ZTtpZihzdD09M3x8c3Q9PTV8fChpPT09dG9kYXlJZHgmJnN0PT0wKSljb250Kys7ZWxzZSBicmVha319cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2ZvcihsZXQgaT02O2k+PTA7aS0tKXtjb25zdCBkPW5ldyBEYXRlKCk7ZC5zZXREYXRlKGQuZ2V0RGF0ZSgpLWkpO2NvbnN0IGRzPWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGVudHJ5PWxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT1kcyk7cmVzdWx0Lmxhc3Q3LnB1c2goe2RhdGU6ZHMuc2xpY2UoNSksc2lnbmVkOiEhKGVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCkpLGlzVG9kYXk6aT09PTB9KX19Y2F0Y2goZSl7aWYoIXJlc3VsdC5lcnJvcilyZXN1bHQuZXJyb3I9IuetvuWIsOeKtuaAgeiOt+WPluWksei0pSJ9CnRyeXtjb25zdCB0b2tlbkNoZWNrPWF3YWl0IGNoZWNrVG9rZW4oYWNjLGNmZyk7cmVzdWx0LnRva2VuVmFsaWQ9dG9rZW5DaGVjay52YWxpZDtyZXN1bHQudG9rZW5SZWFzb249dG9rZW5DaGVjay5yZWFzb258fG51bGw7aWYodG9rZW5DaGVjay52YWxpZCYmdG9rZW5DaGVjay51c2VyTmFtZSYmKCFyZXN1bHQudXNlck5hbWV8fHJlc3VsdC51c2VyTmFtZT09PSLmnKrnn6XnlKjmiLciKSlyZXN1bHQudXNlck5hbWU9dG9rZW5DaGVjay51c2VyTmFtZX1jYXRjaChlKXtyZXN1bHQudG9rZW5WYWxpZD10cnVlfQpyZXR1cm4gcmVzdWx0fQoKZnVuY3Rpb24gZ2V0UG9zdElkRnJvbURhdGEoZGF0YSl7aWYoIWRhdGEpcmV0dXJuIG51bGw7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nInx8dHlwZW9mIGRhdGE9PT0ibnVtYmVyIilyZXR1cm4gU3RyaW5nKGRhdGEpO2lmKEFycmF5LmlzQXJyYXkoZGF0YSkpcmV0dXJuIGdldFBvc3RJZEZyb21EYXRhKGRhdGFbMF0pO2NvbnN0IGRpcmVjdD1kYXRhLnV1aWR8fGRhdGEudHV1aWR8fGRhdGEucG9zdElkfHxkYXRhLnBvc3RpZHx8ZGF0YS5hcnRpY2xlSWR8fGRhdGEuYXJ0aWNsZUlEfHxkYXRhLmlkfHxkYXRhLmRhdGFJZHx8ZGF0YS50aWQ7aWYoZGlyZWN0KXJldHVybiBTdHJpbmcoZGlyZWN0KTtmb3IoY29uc3Qga2V5IG9mIFsicmVjb3JkcyIsImxpc3QiLCJyb3dzIiwiZGF0YSIsInJlc3VsdCJdKXtjb25zdCB2PWRhdGFba2V5XTtjb25zdCBwaWQ9Z2V0UG9zdElkRnJvbURhdGEodik7aWYocGlkKXJldHVybiBwaWR9cmV0dXJuIG51bGx9CgovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYwgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczpmYWxzZSxzaWduaW5TY29yZTowLGJsaW5kQm94U2NvcmU6MCxpbnRlcmFjdFNjb3JlOjAsdG90YWxHYWluOjAsY29udGludWVEYXlzOjAsZXJyb3I6bnVsbCxzdGVwczpbXX07dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBtb250aD10b2RheS5zbGljZSgwLDcpOwp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRvZGF5RW50cnk9KGluZm9SZXM/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtpZih0b2RheUVudHJ5JiYodG9kYXlFbnRyeS5zaWduU3RhdHVlPT0zfHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTV8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09MCkpe3Jlc3VsdC5zdGVwcy5wdXNoKCLku4rml6Xlt7Lnrb7liLAiKX1lbHNle2xldCBzaWduUmVzPW51bGwsc2lnbk1zZz0i5pyq55+lIjtmb3IobGV0IGF0PTE7YXQ8PTM7YXQrKyl7c2lnblJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbiIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7fSwne30nLGNmZyl9LHt9KTtpZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKWJyZWFrO3NpZ25Nc2c9c2lnblJlcz8ubWVzc2FnZXx8IuacquefpSI7aWYoL+ivt+eojXznqI3lkI5856iN5YCZfOmikee5gXznuYHlv5l86YeN6K+VLy50ZXN0KHNpZ25Nc2cpJiZhdDwzKXthd2FpdCBuZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsKGF0KzEpKjIwMDApKTtjb250aW51ZX1icmVha31pZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKXtjb25zdCBpbmZvUmVzMj1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRlPShpbmZvUmVzMj8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduaW5TY29yZT10ZT8oTnVtYmVyKHRlLmludGVncmFsU2NvcmUpfHwwKTowO3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDmiJDlip8gKyIrcmVzdWx0LnNpZ25pblNjb3JlKX1lbHNle3RyeXtjb25zdCBjaGs9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBjZT0oY2hrPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYoY2UmJihjZS5zaWduU3RhdHVlPT0zfHxjZS5zaWduU3RhdHVlPT01fHxjZS5zaWduU3RhdHVlPT0wKSlyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIik7ZWxzZSByZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9fX0KfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlvILluLg6ICIrZSl9CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgbGlzdD1pbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXTtjb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2NvbnN0IHNpZ25Db3VudD1OdW1iZXIoaW5mb1Jlcz8uZGF0YT8uc2lnbkNvdW50KXx8MDtjb25zdCBwcml6ZURhdGU9U3RyaW5nKGluZm9SZXM/LmRhdGE/LnNpZ25Qcml6ZURhdGV8fCIiKTtjb25zdCBpc0JveERheT1wcml6ZURhdGU/KHByaXplRGF0ZT09PXRvZGF5KTooc2lnbkNvdW50Pj0zMCk7aWYoaXNCb3hEYXkpe2NvbnN0IGJsaW5kUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2xvdHRlcnk/ZGF0ZVRpbWU9IitlbmNvZGVVUklDb21wb25lbnQodG9kYXkpLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse2RhdGVUaW1lOnRvZGF5fSwnJyxjZmcpfSwiIik7Y29uc3QgYmQ9KGJsaW5kUmVzPy5kYXRhJiZibGluZFJlcy5kYXRhLnNpZ25Qcml6ZXNWTyl8fGJsaW5kUmVzPy5kYXRhfHx7fTtyZXN1bHQuYmxpbmRCb3hTY29yZT1OdW1iZXIoYmQuaW50ZWdyYWx8fGJkLmludGVncmFsU2NvcmV8fGJkLnNjb3JlfHwwKTtpZihTdHJpbmcoYmxpbmRSZXM/LmNvZGUpPT0iMTAwMDAiKXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS6I635b6XICsiK3Jlc3VsdC5ibGluZEJveFNjb3JlKyIgKCIrKGJkLnByaXplc05hbWV8fGJkLnByaXplTmFtZXx8Iuenr+WIhiIpKyIpIil9ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq5byAOiAiKyhibGluZFJlcz8ubWVzc2FnZXx8YmxpbmRSZXM/LmVycm9yfHwoImNvZGU9IitibGluZFJlcz8uY29kZSkpKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi6Led55uy55uSICIrTWF0aC5tYXgoMCwzMC0oc2lnbkNvdW50fHxjb250KSkrIiDlpKkiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuW8guW4uDogIitlKX0KY29uc3QgY29tbT1jZmcuY29tbXVuaXR5fHx7fTtsZXQgcG9zdElkPW51bGw7CmlmKGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKXt0cnl7Y29uc3QgcG9zdFJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGNvbnRlbnQ6Imx1Y2t5In0pO2lmKHBvc3RSZXM/LmNvZGU9PSIxMDAwMCIpe3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShwb3N0UmVzLmRhdGEpO3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJbmiJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luW8guW4uDogIitlKX19CmlmKCFwb3N0SWQpe3RyeXtjb25zdCBsaXN0UmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbXVuaXR5L21pbmVBcnRpY2xlSW5mbz91c2VySWQ9Iit1c2VySWQrIiZwYWdlPTEmcGFnZVNpemU9MTAiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtjb25zdCByYXdMaXN0PUFycmF5LmlzQXJyYXkobGlzdFJlcz8uZGF0YSk/bGlzdFJlcy5kYXRhOihsaXN0UmVzPy5kYXRhPy5yZWNvcmRzfHxsaXN0UmVzPy5kYXRhPy5saXN0fHxbXSk7Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KHJhd0xpc3QpP3Jhd0xpc3Q6W107Y29uc3QgbWluZT1saXN0LmZpbmQoaXQ9PlN0cmluZyhpdC51c2VySWR8fGl0LmNyZWF0ZUJ5fHxpdC51aWR8fCIiKT09PVN0cmluZyh1c2VySWQpKTtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEobWluZXx8bGlzdFswXXx8bGlzdFJlcz8uZGF0YSl9Y2F0Y2goZSl7fX0KaWYocG9zdElkKXtpZihjb21tLmVuYWJsZUxpa2UhPT1mYWxzZSl7dHJ5e2NvbnN0IGxpa2VSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvc29jaWFsQ29tbXUvbGlrZUZhdm9yaXRlSW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RJZDpTdHJpbmcocG9zdElkKSxraW5kRmxhZzoiMCJ9KTtpZihsaWtlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7lvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKXt0cnl7YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbWVudEluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0aWQ6U3RyaW5nKHBvc3RJZCksdXNlcklkOlN0cmluZyh1c2VySWQpLGNvbW1lbnRzOiLku4rml6Xlt7Lnrb7liLAiLHNlbmRUb3M6IltcblxuXSJ9KTtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665a6M5oiQIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKXt0cnl7Y29uc3Qgc2hhcmVSZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9hcnRpY2xlL3NoYXJlLyIrcG9zdElkLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtpZihzaGFyZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+aIkOWKnyArMSIpfWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9pbnRlZ3JhbC9hZGp1c3RCeVNoYXJlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSl9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+W8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVEZWxldGUhPT1mYWxzZSYmcG9zdElkKXt0cnl7YXdhaXQgaHR0cERlbGV0ZSgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlL2RlbGV0ZUFydGljbGU/YXJ0aWNsZUlkPSIrcG9zdElkKyImcG9zdFR5cGU9MSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLliqjmgIHlt7LliKDpmaQiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Yig6Zmk5byC5bi4OiAiK2UpfX19CnJlc3VsdC50b3RhbEdhaW49cmVzdWx0LnNpZ25pblNjb3JlK3Jlc3VsdC5ibGluZEJveFNjb3JlK3Jlc3VsdC5pbnRlcmFjdFNjb3JlO3Jlc3VsdC5zdWNjZXNzPXRydWV9Y2F0Y2goZSl7cmVzdWx0LmVycm9yPVN0cmluZyhlKTtyZXN1bHQuc3RlcHMucHVzaCgi5omn6KGM5byC5bi4OiAiK2UpfXJldHVybiByZXN1bHR9CgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgVkVISUNMRV9BQ1RJT05fVEVYVD17ZmluZDoi55+t5oyJ5a+76L2mIixsb3VkRmluZDoi6bij56yb6Zeq54GvIixjdXNoaW9uOiLmiZPlvIDlnZDlnqsiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTsKZnVuY3Rpb24gdmVoaWNsZUNoZWNrUmVzKHJlcyxva01zZyl7aWYocmVzJiYhcmVzLmVycm9yJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2d9O2NvbnN0IGVyclRleHQ9U3RyaW5nKChyZXMmJihyZXMuZXJyb3J8fHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCIiKS50b0xvd2VyQ2FzZSgpO2lmKHJlcyYmcmVzLmVycm9yJiYvdGltZW91dHx0aW1lZCBvdXR8dGltZSBvdXR86K+35rGC6LaF5pe2Ly50ZXN0KGVyclRleHQpKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2crIu+8iOWTjeW6lOi2heaXtuS9hui9pui+humAmuW4uOW3suaJp+ihjO+8jOWPr+S4i+aLieWIt+aWsOehruiupO+8iSJ9O3JldHVybntvazpmYWxzZSxtZXNzYWdlOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwocmVzJiZyZXMuZXJyb3IpfHwi5oyH5Luk5LiL5Y+R5aSx6LSlIixjb2RlOnJlcyYmcmVzLmNvZGV9fQphc3luYyBmdW5jdGlvbiB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyl7dHJ5e2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtsZXQgdmluPWFjYy52aW5Ob3x8IiI7aWYoIXZpbil7Y29uc3QgbGlzdD1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjKTtpZighbGlzdHx8IWxpc3QubGVuZ3RoKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrojrflj5bliLDnu5HlrprovabovoYoVklOKe+8jOivt+ehruiupOi0puWPt+W3sue7keWumui9pui+hiJ9O3Zpbj1saXN0WzBdLnZpbk5vfWNvbnN0IGJhc2U9YmFzZUhlYWRlcnMoYWNjKTtpZihhY3Rpb249PT0iZmluZCIpe2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSwiIixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbC8iK3ZpbixoKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5a+76L2m5oyH5Luk5bey5LiL5Y+R77yM6L2m6L6G5bqU6Zeq54Gv5o+Q56S6Iil9aWYoYWN0aW9uPT09ImxvdWRGaW5kIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7cGFyYW06IjQiLHZpbjp2aW59KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2xWMiIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi6bij56yb6Zeq54Gv5oyH5Luk5bey5LiL5Y+RIil9aWYoYWN0aW9uPT09ImN1c2hpb24iKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtjb21tb25kOiIyOCIsY29tbW9uZFBhcmFtOiIxIix2Y3U6dmluLHZlcnNpb246InYyIn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L3Byb3BlcnR5VHdvL29uZSIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5byA5Z2Q5Z6r5oyH5Luk5bey5LiL5Y+R77yM5Z2Q5Z6r5bqU5by56LW3Iil9aWYoYWN0aW9uPT09InVubG9jayJ8fGFjdGlvbj09PSJsb2NrIil7Y29uc3QgdktleT0oYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpO2lmKCF2S2V5KXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLlsJrmnKrphY3nva7kupHnq6/mjqfovablr4bpkqXvvJror7fliLDjgIzorr7nva4t562+5ZCN5a+G6ZKl6YWN572u44CN5aGr5YaZ5LqR56uv5o6n6L2mQUVT5a+G6ZKl5bm25L+d5a2Y5ZCO5YaN5L2/55So5byAL+WFs+mUgSJ9O2lmKCEvXlswLTlhLWZBLUZdezMyfSQvLnRlc3QodktleSkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuS6keerr+aOp+i9puWvhumSpeagvOW8j+mUmeivr++8iOW6lOS4ujMy5L2N5Y2B5YWt6L+b5Yi277yJ77yM6K+35Yiw6K6+572u6aG15qC45a+55ZCO5L+d5a2YIn07Y29uc3QgbG9ja0ZsYWc9YWN0aW9uPT09InVubG9jayI/IjEiOiIwIjtjb25zdCBwbGFpbj0ne1xuICAibG9ja0ZsYWciIDogIicrbG9ja0ZsYWcrJyIsXG4gICJ2aW5ObyIgOiAiJyt2aW4rJyJcbn0nO2NvbnN0IHNlY3JldD1hZXMyNTZFY2JFbmNyeXB0QmFzZTY0KHBsYWluLHZLZXkpO2NvbnN0IHNlbmRCb2R5PUpTT04uc3RyaW5naWZ5KHtzZWNyZXQ6c2VjcmV0fSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LHBsYWluLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9uZXR3b3JrL3VubG9jayIsaCxzZW5kQm9keSwyNTAwMCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsYWN0aW9uPT09InVubG9jayI/IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSI6IuS6keerr+WFs+mUgeaMh+S7pOW3suS4i+WPkSIpfXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrnn6Xmk43kvZznsbvlnos6ICIrYWN0aW9ufX1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5o6n5Yi25byC5bi4OiAiK1N0cmluZyhlKX19fQoKYXN5bmMgZnVuY3Rpb24gYmFya1B1c2goYmFya0tleSx0aXRsZSxib2R5KXt0cnl7bGV0IHM9U3RyaW5nKGJhcmtLZXl8fCIiKS50cmltKCkucmVwbGFjZSgvXC8rJC8sIiIpO3M9cy5yZXBsYWNlKC9eaHR0cHM/OlwvXC9hcGlcLmRheVwuYXBwXC8vaSwiIik7aWYoIXMpcmV0dXJue3NraXBwZWQ6dHJ1ZX07bGV0IGJhc2U9Imh0dHBzOi8vYXBpLmRheS5hcHAiLGtleT1zO2NvbnN0IG09cy5tYXRjaCgvXihodHRwcz86XC9cL1teL10rKVwvKC4rKSQvaSk7aWYobSl7YmFzZT1tWzFdO2tleT1tWzJdfWtleT1rZXkucmVwbGFjZSgvXlwvKy8sIiIpO2NvbnN0IHU9YmFzZSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGtleSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudCh0aXRsZSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudChib2R5KSsiP2dyb3VwPVpFRUhPJnNvdW5kPWJpcmRzb25nIjtyZXR1cm4gYXdhaXQgaHR0cEdldCh1LHt9KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKGUpfX19CgovKiA9PT09PT09PT09PT09PT09PSDku6PnkIbmqKHlvI/vvIjmjIflkJHljp/ohJrmnKwgemVlaG8uYm94IOWQjuerr++8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBwcm94eUZldGNoKHBhdGgsb3B0cyl7Y29uc3QgcmF3QmFzZT1nZXRDZmcoKS5zZXJ2ZXJCYXNlLnJlcGxhY2UoL1wvKyQvLCIiKTtjb25zdCBiYXNlPSh3aW5kb3cuX19QQU5FTF9NT0RFX18mJiFyYXdCYXNlKT8iIjpyYXdCYXNlO2NvbnN0IHI9YXdhaXQgZmV0Y2goYmFzZStwYXRoLG9wdHN8fHt9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fQpmdW5jdGlvbiBwcm94eVBvc3QocGF0aCxib2R5KXtyZXR1cm4gcHJveHlGZXRjaChwYXRoLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sYm9keTpKU09OLnN0cmluZ2lmeShib2R5fHx7fSl9KX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLGxpbWl0KXtjb25zdCBvdXQ9bmV3IEFycmF5KGFjY291bnRzLmxlbmd0aCk7bGV0IGk9MDthc3luYyBmdW5jdGlvbiB3b3JrZXIoKXt3aGlsZShpPGFjY291bnRzLmxlbmd0aCl7Y29uc3QgaWR4PWkrKzt0cnl7b3V0W2lkeF09YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2NvdW50c1tpZHhdLGNmZyl9Y2F0Y2goZSl7b3V0W2lkeF09e3VzZXJOYW1lOmFjY291bnRzW2lkeF0udXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2NvdW50c1tpZHhdLnVzZXJJZCxzdWNjZXNzOmZhbHNlLGVycm9yOlN0cmluZyhlKX19fX1jb25zdCBuPU1hdGgubWF4KDEsTWF0aC5taW4obGltaXR8fDMsYWNjb3VudHMubGVuZ3RoKSk7YXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbSh7bGVuZ3RoOm59LHdvcmtlcikpO3JldHVybiBvdXR9Cgpjb25zdCBCYWNrZW5kPXsKICBhc3luYyBzZW5kQ29kZShwaG9uZSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zZW5kLWNvZGUiLHtwaG9uZTpwaG9uZX0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLpqozor4HnoIHlt7Llj5HpgIEiOiLlj5HpgIHlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2F1dGhDb2RlLyIrZW5jb2RlVVJJQ29tcG9uZW50KHBob25lKTsKICAgIGNvbnN0IGQ9YXdhaXQgaHR0cEdldCh1cmwseyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIkdFVCIse30sIiIsY2ZnKX0pOwogICAgcmV0dXJue29rOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIixtZXNzYWdlOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIj8i6aqM6K+B56CB5bey5Y+R6YCB77yM6K+35p+l5pS255+t5L+hIjooKGQmJihkLm1lc3NhZ2V8fGQubXNnKSl8fCLlj5HpgIHlpLHotKUiKX07CiAgfSwKICBhc3luYyBwaG9uZUxvZ2luKHBob25lLGNvZGUsYmFzaWNBdXRoKXsKICAgIGNvbnN0IGJhc2ljPVN0cmluZyhiYXNpY0F1dGh8fCIiKS50cmltKCkucmVwbGFjZSgvXkJhc2ljXHMrL2ksIiIpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcGhvbmUtbG9naW4iLHtwaG9uZTpwaG9uZSxjb2RlOmNvZGUsYmFzaWNBdXRoOmJhc2ljfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IueZu+W9leaIkOWKnyI6IueZu+W9leWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgcGF5bG9hZD17cGhvbmU6cGhvbmUsYXV0aENvZGU6Y29kZX07CiAgICBjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS91c2VyL2xvZ2luQnlQaG9uZSI7CiAgICBjb25zdCBoZHI9eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIlBPU1QiLHt9LHBheWxvYWQsY2ZnKX07CiAgICBpZihiYXNpYyloZHJbIkF1dGhvcml6YXRpb24iXT0iQmFzaWMgIitiYXNpYzsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCh1cmwsaGRyLHBheWxvYWQsMjAwMDApOwogICAgY29uc3QgdG9rZW5JbmZvPXJlcyYmcmVzLmRhdGEmJnJlcy5kYXRhLnRva2VuSW5mbztjb25zdCBhY2Nlc3NUb2tlbj10b2tlbkluZm8mJlN0cmluZyh0b2tlbkluZm8uYWNjZXNzX3Rva2VufHwiIik7CiAgICBpZighcmVzfHxTdHJpbmcocmVzLmNvZGUpIT09IjEwMDAwInx8IWFjY2Vzc1Rva2VuKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLnmbvlvZXlpLHotKXvvJoiKygocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IumqjOivgeeggeacieivr+aIluW3sui/h+acnyIpfTsKICAgIGxldCB1c2VySWQ9IiIsdXNlck5hbWU9IiI7CiAgICB0cnl7Y29uc3Qgc2lnbkgwPWdldFNpZ24oImg1Iix7c2VydmVyX25hbWU6IlNNQVJUIn0sIiIsY2ZnKTtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9iYXNlSW5mbz9zZXJ2ZXJfbmFtZT1TTUFSVCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrYWNjZXNzVG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSDB9KTtpZihpbmZvUmVzJiZTdHJpbmcoaW5mb1Jlcy5jb2RlKT09PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7dXNlcklkPVN0cmluZyhpbmZvUmVzLmRhdGEuaWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcoaW5mb1Jlcy5kYXRhLm5pY2tOYW1lfHwiIik7fX1jYXRjaChlKXt9CiAgICBjb25zdCBsaXN0PWdldEFjY291bnRzKCk7bGV0IHJlcGxhY2VkPWZhbHNlOwogICAgZm9yKGxldCBpPTA7aTxsaXN0Lmxlbmd0aDtpKyspe2lmKGxpc3RbaV0mJihTdHJpbmcobGlzdFtpXS50b2tlbnx8IiIpPT09YWNjZXNzVG9rZW58fChsaXN0W2ldLnVzZXJJZCYmdXNlcklkJiZTdHJpbmcobGlzdFtpXS51c2VySWQpPT09dXNlcklkKSkpe2xpc3RbaV0udG9rZW49YWNjZXNzVG9rZW47aWYodXNlcklkKWxpc3RbaV0udXNlcklkPXVzZXJJZDtpZih1c2VyTmFtZSlsaXN0W2ldLnVzZXJOYW1lPXVzZXJOYW1lO3JlcGxhY2VkPXRydWU7YnJlYWs7fX0KICAgIGNvbnN0IG5ld0FjYz17dXNlck5hbWU6dXNlck5hbWV8fHBob25lLHVzZXJJZDp1c2VySWQsdG9rZW46YWNjZXNzVG9rZW4sYmFya0tleToiIix1c2VyQWdlbnQ6IiJ9OwogICAgaWYoIXJlcGxhY2VkKWxpc3QucHVzaChuZXdBY2MpOwogICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgcmV0dXJue29rOnRydWUsbWVzc2FnZTpyZXBsYWNlZD8i55m75b2V5oiQ5Yqf77yM5bey5pu05paw6K+l6LSm5Y+3Ijoi55m75b2V5oiQ5Yqf77yM5bey5re75Yqg6LSm5Y+3In07CiAgfSwKICBhc3luYyBnZXREYXNoYm9hcmQoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZGF0YSIpOwogICAgICBpZihkJiZkLmFjY291bnRzKXJldHVybnthY2NvdW50czpkLmFjY291bnRzLHRpbWVzdGFtcDpkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpLGNvbmZpZzpkLmNvbmZpZ3x8bnVsbCxvazp0cnVlfTsKICAgICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuS7o+eQhuacjeWKoeaXoOWTjeW6lCIscmF3OmR9OwogICAgfQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgZGF0YT1hd2FpdCBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZywzKTsKICAgIHJldHVybnthY2NvdW50czpkYXRhLHRpbWVzdGFtcDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksb2s6dHJ1ZX07CiAgfSwKICBhc3luYyBydW5TaWduaW4odXNlcklkLGFsbCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9ydW4tc2lnbmluIixhbGw/e2FsbDp0cnVlfTp7dXNlcklkOnVzZXJJZH0pO2lmKGQmJmQucmVzdWx0cylyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOmQucmVzdWx0c307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuaJp+ihjOWksei0pSJ9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgcmVzdWx0cz1bXTtjb25zdCB0YXJnZXRzPWFsbD9hY2NvdW50czphY2NvdW50cy5maWx0ZXIoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTsKICAgIGlmKCF0YXJnZXRzLmxlbmd0aClyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOltdfTsKICAgIGZvcihjb25zdCBhY2Mgb2YgdGFyZ2V0cyl7Y29uc3Qgcj1hd2FpdCBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpO3Jlc3VsdHMucHVzaChyKTtjb25zdCBfZD1uZXcgRGF0ZSgpO2NvbnN0IF9kcz1fZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX2QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X2QudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfZHMsdHlwZToic2lnbmluIix1c2VyTmFtZTpyLnVzZXJOYW1lLHVzZXJJZDpyLnVzZXJJZCxzdWNjZXNzOnIuc3VjY2Vzcyx0b3RhbEdhaW46ci50b3RhbEdhaW4sc2lnbmluU2NvcmU6ci5zaWduaW5TY29yZSxibGluZEJveFNjb3JlOnIuYmxpbmRCb3hTY29yZSxpbnRlcmFjdFNjb3JlOnIuaW50ZXJhY3RTY29yZSxjb250aW51ZURheXM6ci5jb250aW51ZURheXMsZXJyb3I6ci5lcnJvcixzdGVwczpyLnN0ZXBzfSk7aWYoci5zdWNjZXNzJiZhY2MuYmFya0tleSYmU3RyaW5nKGFjYy5iYXJrS2V5KS50cmltKCkpe3RyeXthd2FpdCBiYXJrUHVzaChhY2MuYmFya0tleSwi5p6B5qC4562+5Yiw5oiQ5YqfIMK3ICIrKHIudXNlck5hbWV8fCIiKSwi5LuK5pel6I635b6XICIrci50b3RhbEdhaW4rIiDliIbvvIjnrb7liLAiK3Iuc2lnbmluU2NvcmUrIiAvIOebsuebkiIrci5ibGluZEJveFNjb3JlKyIgLyDkupLliqgiK3IuaW50ZXJhY3RTY29yZSsi77yJ77yM6L+e562+ICIrci5jb250aW51ZURheXMrIiDlpKkiKX1jYXRjaChlKXt9fX0KICAgIHJldHVybntvazp0cnVlLHJlc3VsdHN9OwogIH0sCiAgYXN5bmMgdmVoaWNsZUN0cmwodXNlcklkLGFjdGlvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wiLHt1c2VySWQ6dXNlcklkLGFjdGlvbjphY3Rpb259KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i5oyH5Luk5bey5LiL5Y+RIjoi5oyH5Luk5aSx6LSlIil9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7bGV0IGFjYz1hY2NvdW50cy5maW5kKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7aWYoIWFjYyYmYWNjb3VudHMubGVuZ3RoKWFjYz1hY2NvdW50c1swXTtpZighYWNjKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrmib7liLDotKblj7fvvIzor7flhYjlnKjorr7nva7pobXmt7vliqAifTtpZighVkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLpnZ7ms5Xmk43kvZznsbvlnosifTtjb25zdCByPWF3YWl0IHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKTtjb25zdCBfdmQ9bmV3IERhdGUoKTtjb25zdCBfdmRzPV92ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX3ZkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX3ZkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfdmQudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfdmRzLHR5cGU6InZlaGljbGUiLGFjdGlvbjphY3Rpb24sYWN0aW9uVGV4dDpWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl18fCLovabovobmjqfliLYiLHVzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczohIXIub2ssbWVzc2FnZTpyLm1lc3NhZ2V8fCIiLGVycm9yOnIub2s/IiI6KHIubWVzc2FnZXx8IuaMh+S7pOWksei0pSIpfSk7cmV0dXJuIHI7CiAgfSwKICBhc3luYyBnZXRMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2dldC1sb2dzIik7cmV0dXJuIGQmJmQubG9ncz9kLmxvZ3M6W119cmV0dXJuIGdldExvZ3MoKX0sCiAgYXN5bmMgY2xlYXJMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvY2xlYXItbG9ncyIpO3JldHVybiAhIWQub2t9cmV0dXJuIGNsZWFyTG9ncygpfSwKICBhc3luYyBzYXZlQ29uZmlnKGMpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtY29uZmlnIixjKTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQ2ZnKGMpfSwKICBhc3luYyBzYXZlQWNjb3VudHMobGlzdCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2FjY291bnRzOmxpc3R9KTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQWNjb3VudHMobGlzdCl9LAogIGFzeW5jIGdldFVzZXJpZCh0b2tlbil7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvZ2V0LXVzZXJpZCIse3Rva2VuOnRva2VufSk7cmV0dXJue29rOiEhZC5vayx1c2VySWQ6ZC51c2VySWR8fCIiLHVzZXJOYW1lOmQudXNlck5hbWV8fCIiLGVycm9yOmQuZXJyb3J8fCIifX1yZXR1cm4gZ2V0VXNlcmlkQnlUb2tlbih0b2tlbixnZXRDZmcoKSl9LAogIGFzeW5jIGdldENvbmZpZygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9jb25maWciKTtpZihkJiZkLmNvbmZpZylyZXR1cm57b2s6dHJ1ZSxjb25maWc6ZC5jb25maWd9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLojrflj5bphY3nva7lpLHotKUifX1yZXR1cm57b2s6dHJ1ZSxjb25maWc6Z2V0Q2ZnKCl9fSwKICBhc3luYyBnZXRBY2NvdW50c0Z1bGwoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYWNjb3VudHMiKTtyZXR1cm4gQXJyYXkuaXNBcnJheShkJiZkLmFjY291bnRzKT9kLmFjY291bnRzOltdfXJldHVybiBnZXRBY2NvdW50cygpfSwKICBhc3luYyBiYWNrdXAoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9iYWNrdXAiKTtyZXR1cm4gZCYmZC5vaz9kOm51bGx9CiAgICByZXR1cm57b2s6dHJ1ZSxhcHA6IuaegeaguFpFRUhPIix0eXBlOiJ6ZWVob19iYWNrdXAiLHZlcnNpb246QVBQX1ZFUlNJT04sdGltZTpmbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSksYWNjb3VudHM6Z2V0QWNjb3VudHMoKSxjb25maWc6Z2V0Q2ZnKCl9CiAgfSwKICBhc3luYyByZXN0b3JlQmFja3VwKGpzb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvaW1wb3J0Iix7anNvbjpqc29ufSk7cmV0dXJuIGR8fHtvazpmYWxzZSxlcnJvcjoi5ZCO56uv5peg5ZON5bqUIn19CiAgICB0cnl7CiAgICAgIGNvbnN0IGI9dHlwZW9mIGpzb249PT0ic3RyaW5nIj9KU09OLnBhcnNlKGpzb24pOmpzb247CiAgICAgIGlmKCFifHwoYi50eXBlIT09InplZWhvX2JhY2t1cCImJiFBcnJheS5pc0FycmF5KGIuYWNjb3VudHMpKSlyZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuWkh+S7veagvOW8j+S4jeato+ehriJ9OwogICAgICBjb25zdCBsaXN0PShiLmFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleXx8IiIpLHVzZXJBZ2VudDphLnVzZXJBZ2VudHx8IiJ9KSk7CiAgICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgICAgaWYoYi5jb25maWcmJnR5cGVvZiBiLmNvbmZpZz09PSJvYmplY3QiKXsKICAgICAgICBjb25zdCBjdXI9Z2V0Q2ZnKCk7CiAgICAgICAgc2F2ZUNmZyh7CiAgICAgICAgICBhcHA6e2FwcElkOmIuY29uZmlnLmFwcD8uYXBwSWR8fGN1ci5hcHAuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmFwcD8uYXBwU2VjcmV0fHxjdXIuYXBwLmFwcFNlY3JldH0sCiAgICAgICAgICBoNTp7YXBwSWQ6Yi5jb25maWcuaDU/LmFwcElkfHxjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmg1Py5hcHBTZWNyZXR8fGN1ci5oNS5hcHBTZWNyZXR9LAogICAgICAgICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgICAgICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYi5jb25maWcudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKXx8Y3VyLnZlaGljbGVBZXNLZXksCiAgICAgICAgICB2ZWhpY2xlQ29udHJvbFJpc2s6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgICAgICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYi5jb25maWcuYXV0b1JlZnJlc2hTZWMpLAogICAgICAgICAgc2VydmVyQmFzZTpjdXIuc2VydmVyQmFzZQogICAgICAgIH0pOwogICAgICB9CiAgICAgIHJldHVybntvazp0cnVlLGNvdW50Omxpc3QubGVuZ3RofTsKICAgIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KICB9LAogIC8qIC0tLS0gdjIuMTQuOSDmlrDlop7lkI7nq6/og73lipvvvIjku4Xku6PnkIbmqKHlvI/vvIkgLS0tLSAqLwogIGFzeW5jIGludGVncmFsKHVzZXJJZCxwYWdlKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBERU1PX0lOVEVHUkFMOwogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvaW50ZWdyYWw/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iuenr+WIhuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHN1cHBsZW1lbnQoYWN0aW9uLHVzZXJJZCxwYXJhbXMpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIGFjdGlvbj09PSJtb250aCI/e29rOnRydWUsZGF0YTp7bm93U2lnbkRldGFpbFZvczpkZW1vQ2FsKCl9fTooREVNT19TVVBQTEVNRU5UW2FjdGlvbl18fHtvazp0cnVlLGRhdGE6MX0pOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGxldCBxPSIvYXBpL3N1cHBsZW1lbnQ/YWN0aW9uPSIrZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbikrIiZ1c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7CiAgICAgIHBhcmFtcz1wYXJhbXN8fHt9O09iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrPT57cSs9IiYiK2VuY29kZVVSSUNvbXBvbmVudChrKSsiPSIrZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1trXSl9KTsKICAgICAgcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSkKICAgIH0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6KGl562+5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgdmVoaWNsZU1vbml0b3IodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19NT05JVE9SOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvdmVoaWNsZS1tb25pdG9yP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6L2m6L6G55uR5o6n5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIHZlaGljbGVDb250cm9sRXh0KGJvZHkpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIChib2R5JiZib2R5LmFjdGlvbj09PSJvcHRpb25zIik/REVNT19DVFJMX09QVFM6e29rOnRydWUsbWVzc2FnZToi5ryU56S65qih5byP77ya5oyH5Luk5pyq55yf5a6e5LiL5Y+RIn07CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbC1leHQiLGJvZHkpfQogICAgcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6Iui9puaOp+aJqeWxleS7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBiYXR0ZXJ5U3RhdGUodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm57b2s6dHJ1ZSx2aW5ObzoiREVNTyIsY2hhcmdpbmc6ZmFsc2UsY3VycmVudDowLHNvYzo3MCx2b2x0YWdlOjgwLjUsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsZnVsbENoYXJnZVRpbWU6MCxmdWxsQ2hhcmdlVGltZVNlY29uZDowfTsKICAgIGlmKGlzUHJveHlNb2RlKCkpcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmF0dGVyeS1zdGF0ZT91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrKHZpbj8iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pOiIiKSk7CiAgICByZXR1cm4gYXdhaXQgZmV0Y2hCYXR0ZXJ5U3RhdGVEaXJlY3QocmlkZUFjY0xvY2FsKHVzZXJJZCksZ2V0Q2ZnKCksdmluKTsKICB9LAogIGFzeW5jIGluZm9DZW50ZXIodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19JTkZPOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvaW5mby1jZW50ZXI/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLkv6Hmga/kuK3lv4Pku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgLyogLS0tLSB2Mi4xNi4wIOmakOiXj+mqkeihjOaVsOaNriAtLS0tICovCiAgYXN5bmMgcmlkZU1vbnRoKHVzZXJJZCxtb250aCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIGRlbW9SaWRlTW9udGgobW9udGgpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvcmlkZS1tb250aD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZtb250aD0iK2VuY29kZVVSSUNvbXBvbmVudChtb250aHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJuIGF3YWl0IGZldGNoUmlkZU1vbnRoRGlyZWN0KHJpZGVBY2NMb2NhbCh1c2VySWQpLGdldENmZygpLG1vbnRoLHZpbik7CiAgfSwKICBhc3luYyByaWRlVHJhY2sodXNlcklkLHZpbixwYWdlLHBhZ2VTaXplLG1vbnRoKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBkZW1vUmlkZVRyYWNrKHBhZ2UpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvcmlkZS10cmFjaz91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZwYWdlPSIrKHBhZ2V8fDEpKyImcGFnZVNpemU9IisocGFnZVNpemV8fDIwKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtpZihtb250aClxKz0iJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KG1vbnRoKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybiBhd2FpdCBmZXRjaFJpZGVUcmFja0RpcmVjdChyaWRlQWNjTG9jYWwodXNlcklkKSxnZXRDZmcoKSx2aW4scGFnZSxwYWdlU2l6ZSxtb250aCk7CiAgfSwKICBhc3luYyBpbnN0YWxsSW5mbygpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FwcC1pbnN0YWxsLWluZm8iKTtyZXR1cm4gZHx8bnVsbH0KICAgIHJldHVybiBudWxsCiAgfQp9OwovKiA9PT09PT09PT09PT09PT09PSDpnaLmnb/mlbDmja7lkIzmraXvvIjpnaLmnb/mqKHlvI/vvJrorr7nva7pobXku47ohJrmnKzlkI7nq6/or7votKblj7fkuI7phY3nva7vvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlSZW1vdGVDZmcoYyl7CiAgaWYoIWN8fHR5cGVvZiBjIT09Im9iamVjdCIpcmV0dXJuOwogIGNvbnN0IGxvY2FsPWdldENmZygpOwogIHNhdmVDZmcoewogICAgYXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fGxvY2FsLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8bG9jYWwuYXBwLmFwcFNlY3JldH0sCiAgICBoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fGxvY2FsLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fGxvY2FsLmg1LmFwcFNlY3JldH0sCiAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpfHxsb2NhbC52ZWhpY2xlQWVzS2V5LAogICAgdmVoaWNsZUNvbnRyb2xSaXNrOlN0cmluZyhjLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksCiAgICBzZXJ2ZXJCYXNlOmxvY2FsLnNlcnZlckJhc2UsCiAgICBhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsCiAgICBhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLAogICAgdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsCiAgICB3aWRnZXRWZWhpY2xlOlN0cmluZyhjLndpZGdldFZlaGljbGV8fCIiKSwKICAgIGN1c3RvbUJnOlN0cmluZyhjLmN1c3RvbUJnfHwiIikKICB9KTsKfQpsZXQgcGFuZWxTeW5jaW5nPWZhbHNlOwphc3luYyBmdW5jdGlvbiBlbnN1cmVQYW5lbERhdGEoZm9yY2UpewogIGlmKCFpc1Byb3h5TW9kZSgpfHxsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXJldHVybjsKICBpZihwYW5lbFN5bmNpbmcpcmV0dXJuOwogIGlmKCFmb3JjZSYmU1RBVEUucGFuZWxMb2FkZWQpcmV0dXJuOwogIHBhbmVsU3luY2luZz10cnVlOwogIHRyeXsKICAgIGNvbnN0IFtjLGFdPWF3YWl0IFByb21pc2UuYWxsKFtCYWNrZW5kLmdldENvbmZpZygpLEJhY2tlbmQuZ2V0QWNjb3VudHNGdWxsKCldKTsKICAgIGlmKGEmJmEubGVuZ3RoKXtTVEFURS5wYW5lbEFjY291bnRzPWF9CiAgICBpZihjJiZjLm9rJiZjLmNvbmZpZylhcHBseVJlbW90ZUNmZyhjLmNvbmZpZyk7CiAgICBTVEFURS5wYW5lbExvYWRlZD10cnVlOwogIH1jYXRjaChlKXt9CiAgcGFuZWxTeW5jaW5nPWZhbHNlOwp9Ci8qID09PT09PT09PT09PT09PT09IOWbvuaghyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBJPXsKY2hlY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDYgOSAxN2wtNS01Ii8+PC9zdmc+JywKeDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPicsCnphcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDggMHY0Ii8+PC9zdmc+JywKdW5sb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgNy41LTEuNyIvPjwvc3ZnPicsCmJlbGw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE4IDhhNiA2IDAgMSAwLTEyIDBjMCA3LTMgOS0zIDloMThzLTMtMi0zLTkiLz48cGF0aCBkPSJNMTMuNyAyMWEyIDIgMCAwIDEtMy40IDAiLz48L3N2Zz4nLAp2b2w6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTExIDUgNiA5SDJ2Nmg0bDUgNFY1eiIvPjxwYXRoIGQ9Ik0xNS41IDguNWE1IDUgMCAwIDEgMCA3TTE4LjUgNS41YTkgOSAwIDAgMSAwIDEzIi8+PC9zdmc+JywKc2VhdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA0aDE0djdhNCA0IDAgMCAxLTQgNEg5YTQgNCAwIDAgMS00LTRWNHoiLz48cGF0aCBkPSJNOSAxNXY1aDZ2LTUiLz48L3N2Zz4nLApwaW46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYzAgNi04IDEyLTggMTJzLTgtNi04LTEyYTggOCAwIDAgMSAxNiAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4nLAp0aXJlOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMy41Ii8+PHBhdGggZD0iTTEyIDN2NS41TTEyIDE1LjVWMjFNMyAxMmg1LjVNMTUuNSAxMkgyMSIvPjwvc3ZnPicsCmJvbHQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCnRoZXJtbzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMTQuNzZWNWEyIDIgMCAxIDAtNCAwdjkuNzZhNCA0IDAgMSAwIDQgMHoiLz48L3N2Zz4nLApjYWw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMyIvPjxwYXRoIGQ9Ik0xNiAydjRNOCAydjRNMyAxMGgxOCIvPjwvc3ZnPicsCmNhcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMyA2LjUgNy41QTIgMiAwIDAgMSA4LjQgNmg3LjJhMiAyIDAgMCAxIDEuOSAxLjVMMTkgMTMiLz48cGF0aCBkPSJNNCAxM2gxNmExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxLTEgMWgtMWEyIDIgMCAxIDEtNCAwSDlhMiAyIDAgMSAxLTQgMEg0YTEgMSAwIDAgMS0xLTF2LTNhMSAxIDAgMCAxIDEtMXoiLz48L3N2Zz4nLApzY29vdGVyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPicsCnBsdWc6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMnY2TTE1IDJ2Nk03IDhoMTB2NGE1IDUgMCAwIDEtMTAgMFY4ek0xMiAxN3Y1Ii8+PC9zdmc+JywKY2xvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxwYXRoIGQ9Ik0xMiA3djVsMyAzIi8+PC9zdmc+JywKd2lmaTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMi41YTEwIDEwIDAgMCAxIDE0IDBNOC41IDE2YTUgNSAwIDAgMSA3IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4nLAphbGVydDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOXY0TTEyIDE3aC4wMSIvPjxwYXRoIGQ9Ik0xMC4zIDMuOSAxLjggMThhMiAyIDAgMCAwIDEuNyAzaDE3YTIgMiAwIDAgMCAxLjctM0wxMy43IDMuOWEyIDIgMCAwIDAtMy40IDB6Ii8+PC9zdmc+JywKd2FybjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMyAyIDIxaDIwTDEyIDN6Ii8+PHBhdGggZD0iTTEyIDEwdjVNMTIgMThoLjAxIi8+PC9zdmc+JywKa3Y6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiByeD0iMyIvPjxwYXRoIGQ9Ik03IDloM00xNCAxNWgzTTEwIDloLjAxTTE3IDE1aC4wMSIvPjwvc3ZnPicsCmtleTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI4IiBjeT0iMTUiIHI9IjQuNSIvPjxwYXRoIGQ9Ik0xMS4yIDExLjggMjAgM00xNiA3bDMgM00xMyAxMGwyIDIiLz48L3N2Zz4nLAp1c2VyczonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI5IiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik0yIDIxYTcgNyAwIDAgMSAxNCAwTTE2IDQuNmE0IDQgMCAwIDEgMCA2LjhNMTkgMjFhNi41IDYuNSAwIDAgMC0zLTUuNSIvPjwvc3ZnPicsCm1hcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAzIDMuNSA1djE2TDkgMTlsNiAyIDUuNS0yVjNMMTUgNSA5IDN6Ii8+PHBhdGggZD0iTTkgM3YxNk0xNSA1djE2Ii8+PC9zdmc+Jwp9OwoKLyogPT09PT09PT09PT09PT09PT0g5Z+656GAIFVJID09PT09PT09PT09PT09PT09ICovCmxldCB0b2FzdFRpbWVyPW51bGw7CmZ1bmN0aW9uIHRvYXN0KG1zZyx0eXBlKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidG9hc3QiKTtlbC5jbGFzc05hbWU9dHlwZXx8ImluZm8iO2VsLmlubmVySFRNTD0odHlwZT09PSJlcnIiP0kueDp0eXBlPT09Im9rIj9JLmNoZWNrOkkud2lmaSkrJzxzcGFuPicrZXNjKG1zZykrJzwvc3Bhbj4nO3JlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+ZWwuY2xhc3NMaXN0LmFkZCgic2hvdyIpKTtjbGVhclRpbWVvdXQodG9hc3RUaW1lcik7dG9hc3RUaW1lcj1zZXRUaW1lb3V0KCgpPT5lbC5jbGFzc0xpc3QucmVtb3ZlKCJzaG93IiksMjYwMCl9Ci8qIHYyLjE0LjEwIOS/ruWkje+8muaXp+eJiOaKiuWbnuiwg+WHveaVsOa6kOeggeebtOaOpeaLvOi/myBvbmNsaWNrIOWxnuaAp++8jGFzeW5jIOWbnuiwg+WGheeahOWPjOW8leWPt+S8muaIquaWrSBIVE1MIOWxnuaAp++8jAogICDlr7zoh7TooaXnrb4v5YWR5o2i6KGl562+5Y2hL+mYsuebl+W4g+aOp+etieOAjOehruWumuOAjeaMiemSrueCueWHu+aXoOWPjeW6lOOAguaUueS4uuaaguWtmOWbnuiwg+OAgeaMiemSruiwg+eUqOWFqOWxgCBjb25maXJtWWVzKCkgKi8KbGV0IF9fY29uZmlybUFjdD1udWxsOwpmdW5jdGlvbiBjb25maXJtRGlhbG9nKHRpdGxlLGRlc2Msb25ZZXMseWVzVHh0KXtfX2NvbmZpcm1BY3Q9b25ZZXM7Y29uc3QgbGF5ZXI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpO2xheWVyLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY29uZmlybSI+PGRpdiBjbGFzcz0iY3QiPicrZXNjKHRpdGxlKSsnPC9kaXY+PGRpdiBjbGFzcz0iY2QiPicrZGVzYysnPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKSI+5Y+W5raIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0ieWVzIiBvbmNsaWNrPSJjb25maXJtWWVzKCkiPicrZXNjKHllc1R4dHx8IuehruWumiIpKyc8L2J1dHRvbj48L2Rpdj48L2Rpdj4nO2xheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpfQpmdW5jdGlvbiBjb25maXJtWWVzKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYT1fX2NvbmZpcm1BY3Q7X19jb25maXJtQWN0PW51bGw7aWYoYT09bnVsbClyZXR1cm47dHJ5e2lmKHR5cGVvZiBhPT09ImZ1bmN0aW9uIil7YSgpfWVsc2UgaWYodHlwZW9mIGE9PT0ic3RyaW5nIil7Y29uc3Qgcj1uZXcgRnVuY3Rpb24oInJldHVybiAoIithKyIpIikoKTtpZih0eXBlb2Ygcj09PSJmdW5jdGlvbiIpcigpfX1jYXRjaChlKXt9fQpmdW5jdGlvbiBjbG9zZUNvbmZpcm0oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIikuY2xhc3NMaXN0LmFkZCgiaGlkZGVuIil9CmZ1bmN0aW9uIG9wZW5TaGVldCh0aXRsZSxpY29uLGh0bWwpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldFRpdGxlIikuaW5uZXJIVE1MPWljb24rJzxzcGFuPicrZXNjKHRpdGxlKSsnPC9zcGFuPic7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0Qm9keSIpLmlubmVySFRNTD1odG1sO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSJoaWRkZW4ifQpmdW5jdGlvbiBjbG9zZVNoZWV0KCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9IiJ9CmZ1bmN0aW9uIGZtdFRpbWUoaXNvKXt0cnl7Y29uc3QgZD1uZXcgRGF0ZShpc28pO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTtyZXR1cm4gZC5nZXRGdWxsWWVhcigpKyItIitwKGQuZ2V0TW9udGgoKSsxKSsiLSIrcChkLmdldERhdGUoKSkrIiAiK3AoZC5nZXRIb3VycygpKSsiOiIrcChkLmdldE1pbnV0ZXMoKSkrIjoiK3AoZC5nZXRTZWNvbmRzKCkpfWNhdGNoKGUpe3JldHVybiIifX0KCi8qID09PT09PT09PT09PT09PT09IOmhtemdouWIh+aNoiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzd2l0Y2hUYWIodGFiKXsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIudGFiIikuZm9yRWFjaCh0PT50LmNsYXNzTGlzdC50b2dnbGUoIm9uIix0LmRhdGFzZXQudGFiPT09dGFiKSk7CiAgY29uc3QgcGFnZXM9e2hvbWU6InBhZ2VIb21lIixwb2ludHM6InBhZ2VQb2ludHMiLHZlaGljbGU6InBhZ2VWZWhpY2xlIixyaWRlOiJwYWdlUmlkZSIsbG9nczoicGFnZUxvZ3MiLGNmZzoicGFnZUNmZyJ9OwogIE9iamVjdC5rZXlzKHBhZ2VzKS5mb3JFYWNoKGs9Pntjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChwYWdlc1trXSk7aWYoZWwpZWwuY2xhc3NMaXN0LnRvZ2dsZSgiaGlkZGVuIixrIT09dGFiKX0pOwogIC8vIOeri+WNs+etvuWIsOaCrOa1ruaMiemSruS7hemmlumhteaYvuekugogIGNvbnN0IGZhYj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7aWYoZmFiKWZhYi5zdHlsZS5kaXNwbGF5PSh0YWI9PT0iaG9tZSI/ImZsZXgiOiJub25lIik7CiAgaWYodGFiPT09InBvaW50cyIpcmVuZGVyUG9pbnRzKCk7CiAgaWYodGFiPT09InZlaGljbGUiKXtyZW5kZXJWZWhpY2xlUGFnZSgpfQogIGlmKHRhYj09PSJyaWRlIil7cmVuZGVyUmlkZVBhZ2UoKX0KICBpZih0YWI9PT0ibG9ncyIpcmVuZGVyTG9ncygpOwogIGlmKHRhYj09PSJjZmciKXJlbmRlckNmZygpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDoh6rliqjliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHJlZnJlc2hUaW1lcj1udWxsLHJlZnJlc2hMZWZ0PTYwOwpmdW5jdGlvbiBzdGFydEF1dG9SZWZyZXNoKHNlYyl7c3RvcEF1dG9SZWZyZXNoKCk7cmVmcmVzaExlZnQ9c2VjfHxnZXRDZmcoKS5hdXRvUmVmcmVzaFNlYzt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoVGltZXI9c2V0SW50ZXJ2YWwoKCk9PntyZWZyZXNoTGVmdC0tO2lmKHJlZnJlc2hMZWZ0PD0wKXtyZWZyZXNoTGVmdD0wO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB1cGRhdGVDb3VudENoaXAoKX0sMTAwMCl9CmZ1bmN0aW9uIHN0b3BBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcil7Y2xlYXJJbnRlcnZhbChyZWZyZXNoVGltZXIpO3JlZnJlc2hUaW1lcj1udWxsfX0KZnVuY3Rpb24gdXBkYXRlQ291bnRDaGlwKCl7Y29uc3QgY2hpcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRDaGlwIik7Y29uc3QgdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudFR4dCIpO2NvbnN0IGFyYz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRBcmMiKTtjb25zdCBzZWM9Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWN8fDYwO2lmKCFjaGlwKXJldHVybjtpZihyZWZyZXNoVGltZXIpe2NoaXAuY2xhc3NMaXN0LmFkZCgib24iKTt0eHQudGV4dENvbnRlbnQ9cmVmcmVzaExlZnQrInMiO2NvbnN0IEM9MipNYXRoLlBJKjUuNjthcmMuc2V0QXR0cmlidXRlKCJzdHJva2UtZGFzaG9mZnNldCIsU3RyaW5nKEMqKDEtcmVmcmVzaExlZnQvc2VjKSkpfWVsc2V7Y2hpcC5jbGFzc0xpc3QucmVtb3ZlKCJvbiIpO3R4dC50ZXh0Q29udGVudD0i5omL5YqoIn19CmZ1bmN0aW9uIHRvZ2dsZUF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXN0b3BBdXRvUmVmcmVzaCgpO2Vsc2Ugc3RhcnRBdXRvUmVmcmVzaCgpO3VwZGF0ZUNvdW50Q2hpcCgpfQoKLyogPT09PT09PT09PT09PT09PT0g5LiL5ouJ5Yi35pawID09PT09PT09PT09PT09PT09ICovCihmdW5jdGlvbigpe2NvbnN0IHdyYXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0cldyYXAiKSxpbmQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0ckluZCIpLHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyVHh0Iiksc3Bpbj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyU3BpbiIpO2xldCBzdGFydFk9MCxwdWxsaW5nPWZhbHNlLGRpc3RhbmNlPTA7Y29uc3QgVEg9NjQ7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hzdGFydCIsZT0+e2lmKHdpbmRvdy5zY3JvbGxZPD0wJiZkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKSYmIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpLmNsYXNzTGlzdC5jb250YWlucygiaGlkZGVuIikpe3N0YXJ0WT1lLnRvdWNoZXNbMF0uY2xpZW50WTtwdWxsaW5nPXRydWU7ZGlzdGFuY2U9MH19LHtwYXNzaXZlOnRydWV9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaG1vdmUiLGU9PntpZighcHVsbGluZylyZXR1cm47Y29uc3QgZHk9ZS50b3VjaGVzWzBdLmNsaWVudFktc3RhcnRZO2lmKGR5PjAmJndpbmRvdy5zY3JvbGxZPD0wKXtkaXN0YW5jZT1NYXRoLm1pbihkeSowLjUsOTApO2luZC5zdHlsZS5oZWlnaHQ9ZGlzdGFuY2UrInB4IjtpbmQuY2xhc3NMaXN0LmFkZCgicHVsbGluZyIpO3NwaW4uc3R5bGUudHJhbnNmb3JtPSJyb3RhdGUoIisoZGlzdGFuY2UqMy42KSsiZGVnKSI7dHh0LnRleHRDb250ZW50PWRpc3RhbmNlPj1USD8i5p2+5byA5Yi35pawIjoi5LiL5ouJ5Yi35pawIjtpZihkaXN0YW5jZT49VEgmJiFlLmNhbmNlbGFibGUpcmV0dXJuO2lmKGRpc3RhbmNlPj1USCYmZS5jYW5jZWxhYmxlKWUucHJldmVudERlZmF1bHQoKX19LHtwYXNzaXZlOmZhbHNlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hlbmQiLCgpPT57aWYoIXB1bGxpbmcpcmV0dXJuO3B1bGxpbmc9ZmFsc2U7aWYoZGlzdGFuY2U+PVRIKXt0eHQudGV4dENvbnRlbnQ9IuWIt+aWsOS4reKApiI7aW5kLnN0eWxlLmhlaWdodD0iNDZweCI7c3Bpbi5jbGFzc0xpc3QuYWRkKCJzcGlubmVyIik7cmVmcmVzaEFsbCh0cnVlKS5maW5hbGx5KCgpPT57aW5kLnN0eWxlLmhlaWdodD0iMCI7aW5kLmNsYXNzTGlzdC5yZW1vdmUoInB1bGxpbmciKX0pfWVsc2V7aW5kLnN0eWxlLmhlaWdodD0iMCJ9ZGlzdGFuY2U9MH0se3Bhc3NpdmU6dHJ1ZX0pOwp9KSgpOwoKLyogPT09PT09PT09PT09PT09PT0g6aaW6aG15riy5p+TID09PT09PT09PT09PT09PT09ICovCmxldCBTVEFURT17ZGF0YTpbXSx0aW1lc3RhbXA6IiIsdHNUZXh0OiIiLHJlZnJlc2hTZWM6NjAscHJveHk6ZmFsc2UscGFuZWxBY2NvdW50czpudWxsLHBhbmVsTG9hZGVkOmZhbHNlfTsKLy8g6aaW6aG15Y2h54mH5YWl5Zy65Yqo55S75Y+q5Zyo56ys5LiA5qyh5riy5p+T5pe25pKt5pS+77yM5LmL5ZCO6Z2Z6buY5Yi35paw55u05o6l5pu/5o2i5YaF5a6577yM6YG/5YWN5bGP6ZeqCmxldCBIT01FX0FOSU09dHJ1ZTsKZnVuY3Rpb24gc2tlbGV0b25Ib21lKCl7cmV0dXJuICc8ZGl2IGNsYXNzPSJoZXJvIiBzdHlsZT0iaGVpZ2h0OjEzMnB4Ij48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NDAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzYwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2Pid9CmZ1bmN0aW9uIHNjb290ZXJGYWxsYmFjaygpe3JldHVybiAnPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPid9CgpmdW5jdGlvbiByZW5kZXJIb21lKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7Y29uc3QgZGF0YT1TVEFURS5kYXRhOwogIC8vIOS4jeWGjeWcqOavj+asoea4suafk+WJjeaPkuWFpemqqOaetuWxj++8mumdmem7mOiHquWKqOWIt+aWsOaXtuS8muWFiOa4heepuuWGjeWhq+WFhe+8jOmAoOaIkOaVtOmhtemXqueDgQogIGlmKGRhdGEubGVuZ3RoPT09MCl7CiAgICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48ZGl2IGNsYXNzPSJlLWljb24iPicrSS5jYXIrJzwvZGl2PjxoMz7ov5jmsqHmnInmnoHmoLjotKblj7c8L2gzPjxwPuWOu+OAjOiuvue9ruOAjemhtea3u+WKoOi0puWPt++8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIFRva2Vu77yIQmVhcmVyIOWJjee8gOS8muiHquWKqOWOu+aOie+8ie+8jOWGjeeCueOAjOiOt+WPlklE44CN5Y2z5Y+v6Ieq5Yqo5aGr5YWF55So5oi3SUTjgII8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5Y675re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JzsKICAgIHJldHVybjsKICB9CiAgLy8g5rKh5pyJ57uR5a6a6L2m6L6G55qE6LSm5Y+35LiN5Zyo6aaW6aG15pi+56S65Y2h54mHCiAgY29uc3QgY2FyZHM9ZGF0YS5maWx0ZXIoYT0+YS52ZWhpY2xlJiZhLnZlaGljbGUuaGFzVmVoaWNsZSkubWFwKChhLGlkeCk9PnJlbmRlckFjY291bnRDYXJkKGEsaWR4KSkuam9pbigiIik7CiAgZWwuaW5uZXJIVE1MPWNhcmRzCiAgKyc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyDmlbDmja7mm7TmlrAgJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITyIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPuS9nOiAhSBsdWNreSDCtyBHaXRIdWI8L2E+IMK3IDxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtTwvYT4gwrcg5LuF5L6b5a2m5Lmg56CU56m2PC9kaXY+JzsKICBIT01FX0FOSU09ZmFsc2U7Cn0KCmZ1bmN0aW9uIHBvd2VyVGV4dChwLGwpe3A9U3RyaW5nKHB8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtsPVN0cmluZyhsfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7Y29uc3Qgb25WYWxzPVsiMSIsIm9uIiwidHJ1ZSIsIuW8gOacuiIsIm9wZW4iLCLmv4DmtLsiLCJhY2Nfb24iLCJhY2Mgb24iLCJwb3dlcl9vbiIsInBvd2VyIG9uIiwi5bey5byA5py6Iiwi5bey5LiK55S1Il07Y29uc3Qgb2ZmVmFscz1bIjAiLCJvZmYiLCJmYWxzZSIsIuWFs+acuiIsImNsb3NlZCIsIuW+heacuiIsImFjY19vZmYiLCJhY2Mgb2ZmIiwicG93ZXJfb2ZmIiwicG93ZXIgb2ZmIiwi5bey5YWz5py6Iiwi5bey5LiL55S1Il07aWYocCl7aWYob25WYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihvZmZWYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19aWYobCl7aWYoWyIwIiwi5pyq6ZSBIiwi5byA6ZSBIiwidW5sb2NrZWQiLCJmYWxzZSIsIm9wZW4iLCLlt7LlvIDplIEiLCLmnKrplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYoWyIxIiwi5bey6ZSBIiwi6ZSB6L2mIiwibG9ja2VkIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19cmV0dXJue3RleHQ6IueKtuaAgeacquefpSIsY2xzOiJvZmYifX0KZnVuY3Rpb24gb25saW5lVGV4dChvKXtjb25zdCBzPVN0cmluZyhvfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib24iLCJvbmxpbmUiLCJ0cnVlIiwi5Zyo57q/Iiwi5bey5Zyo57q/IiwiY29ubmVjdGVkIiwibm9ybWFsIl0uaW5jbHVkZXMocykpcmV0dXJuIuWcqOe6vyI7aWYoWyIwIiwib2ZmIiwib2ZmbGluZSIsImZhbHNlIiwi56a757q/Iiwi5pyq5Zyo57q/Iiwi5bey56a757q/IiwiZGlzY29ubmVjdCIsImRpc2Nvbm5lY3RlZCIsInNsZWVwIiwi5LyR55ygIl0uaW5jbHVkZXMocykpcmV0dXJuIuemu+e6vyI7cmV0dXJuIHN9CmZ1bmN0aW9uIHJlbmRlckFjY291bnRDYXJkKGEsaWR4KXsKICBjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3Qgb25sPW9ubGluZVRleHQodi5vbmxpbmV8fHYucmlkZVN0YXRlKTsKICBjb25zdCBpc0NoYXJnaW5nPSEhKHYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1Iik7CiAgY29uc3Qgc29jPXYuYmF0dGVyeVBlcmNlbnR8fDA7CiAgY29uc3Qgc29jQ29sPXNvYzw9MjA/IiNGOTcwNkEiOnNvYzw9NTA/IiNGN0I5NTUiOiIjM0REQzk3IjsKICBjb25zdCByYW5nZT12LnJlc2lkdWFsUmFuZ2VLbXx8MDsKICBjb25zdCB2b2x0PXYudm9sdGFnZT9NYXRoLnJvdW5kKHYudm9sdGFnZSkrIlYiOiIiOwogIGNvbnN0IGZiPXNjb290ZXJGYWxsYmFjaygpOwogIC8vIG9uZXJyb3Ig6YeM5LiN6IO95YaN5bWM5aWX5byV5Y+377yI5pen5YaZ5rOV5Lya5oqKIFNWRyDlvJXlj7fmiKrmlq3vvIzpobXpnaLmrovnlZkgJyI+IOS5seeggeespuWPt++8iQogIGNvbnN0IGltZz12LnZlaGljbGVJbWFnZVVybD8nPGltZyBzcmM9IicrZXNjKHYudmVoaWNsZUltYWdlVXJsKSsnIiBhbHQ9IiIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JytmYjpmYjsKICBjb25zdCB2ZWhTdz12Lmhhc1ZlaGljbGU/cmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCk6IiI7CiAgY29uc3QgYm91bmQ9eD0+ISF4JiZ4IT09Iuacque7keWumiImJnghPT0iLSI7CiAgY29uc3Qgcm93cz1bXTsKICByb3dzLnB1c2goJ+mHjOeoi++8micrKHYudG90YWxNaWxlYWdlP3YudG90YWxNaWxlYWdlLnRvRml4ZWQoMSk6KHYubGFzdFJpZGVNaWxlYWdlP3YubGFzdFJpZGVNaWxlYWdlLnRvRml4ZWQoMSk6IjAiKSkrJ2ttJyk7CiAgcm93cy5wdXNoKCfkuIrmrKHvvJonKyh2Lnllc3RlcmRheURpc3RhbmNlP3YueWVzdGVyZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiLS0iKSsna20nKTsKICByb3dzLnB1c2goJ+W9k+aXpe+8micrKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiMCIpKydrbScrKGZtdE1pbih2LnRvZGF5RHVyYXRpb24pPyIgIitmbXRNaW4odi50b2RheUR1cmF0aW9uKToiIikrKHYudG9kYXlNYXhTcGVlZD8iICIrdi50b2RheU1heFNwZWVkKyJrbS9oIjoiIikpOwogIGlmKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSl8fGJvdW5kKHYucmVhclByZXNzdXJlKSlyb3dzLnB1c2goJ+iDjuWOi++8micrKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSk/IuWJjSAiK2VzYyh2LmZyb250UHJlc3N1cmUpOiIiKSsoKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSkmJmJvdW5kKHYucmVhclByZXNzdXJlKSk/IiAvICI6IiIpKyhib3VuZCh2LnJlYXJQcmVzc3VyZSk/IuWQjiAiK2VzYyh2LnJlYXJQcmVzc3VyZSk6IiIpKTsKICBpZihib3VuZCh2LmZyb250VGVtcCl8fGJvdW5kKHYucmVhclRlbXApKXJvd3MucHVzaCgn6IOO5rip77yaJysoYm91bmQodi5mcm9udFRlbXApPyLliY0gIitlc2Modi5mcm9udFRlbXApOiIiKSsoKGJvdW5kKHYuZnJvbnRUZW1wKSYmYm91bmQodi5yZWFyVGVtcCkpPyIgLyAiOiIiKSsoYm91bmQodi5yZWFyVGVtcCk/IuWQjiAiK2VzYyh2LnJlYXJUZW1wKToiIikpOwogIGlmKGlzQ2hhcmdpbmcmJnYuY3VycmVudClyb3dzLnB1c2goJ+eUtea1ge+8micrTnVtYmVyKHYuY3VycmVudCkudG9GaXhlZCgxKSsnQScpOwogIC8vIHYyLjE2LjYg5Y2h54mH5YWF55S15Ymp5L2Z77yI5YWF55S15Lit5LiU6K+l6L2m5bey6K6+5a656YeP5omN5pi+56S677yJCiAgaWYoaXNDaGFyZ2luZyYmTnVtYmVyKHYuY3VycmVudCk+MC41JiZzb2M+MCYmc29jPDEwMCl7Y29uc3QgYmM9cmlkZUJhdHRDZmcodi5jdXJyZW50VmlufHwiIik7aWYoTnVtYmVyKGJjLmFoKT4wKXJvd3MucHVzaCgn4o+xIOWFheeUteWJqeS9me+8mue6piAnK2ZtdFJlbWFpbkhtKE51bWJlcihiYy5haCkqKDEwMC1zb2MpLzEwMC9OdW1iZXIodi5jdXJyZW50KSo2MCkpO30KICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jYXJkIGhvbWUtY2FyZCcrKGlzQ2hhcmdpbmc/JyBjaGFyZ2luZyc6JycpKyhIT01FX0FOSU0/JyBhbmltLWluJzonJykrJyIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpZHgqNjApKydtcyI+JysKICAgICc8ZGl2IGNsYXNzPSJoYy11cGQiPuabtOaWsO+8micrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy10b3AiPjxkaXYgY2xhc3M9ImhjLW5hbWUiPicrZXNjKHYuaGFzVmVoaWNsZT8odi52ZWhpY2xlTmFtZXx8YS51c2VyTmFtZSk6YS51c2VyTmFtZSkrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlPyhvbmw9PT0i5Zyo57q/Ij8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIG9uIj7lnKjnur88L3NwYW4+Jzoob25sPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UiPicrZXNjKG9ubCkrJzwvc3Bhbj4nOiIiKSk6IiIpKwogICAgKGEudG9rZW5WYWxpZD09PWZhbHNlPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgZXJyIj5Ub2tlbuWkseaViDwvc3Bhbj4nOiIiKSsKICAgIChpc0NoYXJnaW5nPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgY2hnIj7lhYXnlLXkuK08L3NwYW4+JzoiIikrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlJiZ2LnZlaGljbGVNb2RlbD8nPGRpdiBjbGFzcz0iaGMtbW9kZWwiPui9puWei++8micrZXNjKHYudmVoaWNsZU1vZGVsKSsnPC9kaXY+JzoiIikrCiAgICAodi5oYXNWZWhpY2xlPyc8ZGl2IGNsYXNzPSJoYy1taWQiPjxkaXYgY2xhc3M9ImhjLWxlZnQiPjxkaXYgY2xhc3M9ImhjLWJpZyBudW0iPicrTWF0aC5yb3VuZChzb2MpKyclPHNwYW4gY2xhc3M9ImhjLWttIG51bSI+JysocmFuZ2V8fDApKydrbTwvc3Bhbj4nKyh2b2x0Pyc8c3BhbiBjbGFzcz0iaGMtdiBudW0iPicrdm9sdCsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWJhciI+PGRpdiBjbGFzcz0iaGMtZmlsbCIgc3R5bGU9IndpZHRoOicrTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsc29jKSkrJyU7YmFja2dyb3VuZDonK3NvY0NvbCsnIj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvd3MiPicrcm93cy5tYXAocj0+JzxkaXYgY2xhc3M9ImhjLXJvdyI+JytyKyc8L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1pbWciPicraW1nKyc8L2Rpdj48L2Rpdj4nOgogICAgJzxkaXYgY2xhc3M9Im5vLXZlaGljbGUiIHN0eWxlPSJtYXJnaW46MTJweCAwIj4nK0kuY2FyKycg6K+l6LSm5Y+35pyq57uR5a6a6L2m6L6GPC9kaXY+JykrCiAgICAnPGRpdiBjbGFzcz0iaGMtYm90dG9tIj48ZGl2IGNsYXNzPSJoYy1zY29yZSI+PHNwYW4+5oC756ev5YiGIDxiIGNsYXNzPSJudW0iPicrTnVtYmVyKGEuc2NvcmV8fDApLnRvTG9jYWxlU3RyaW5nKCkrJzwvYj48L3NwYW4+PHNwYW4gY2xhc3M9InBsdXMgbnVtIj7ku4orJytOdW1iZXIoYS50b2RheVNjb3JlfHwwKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzdHJlYWsgbnVtIj7ov57nrb4nK051bWJlcihhLmNvbnRpbnVlRGF5c3x8MCkrJ+WkqTwvc3Bhbj4nKyhhLnNpZ25lZFRvZGF5Pyc8c3BhbiBjbGFzcz0ic2lnbmVkIG51bSI+4pyTIOW3suetvuWIsDwvc3Bhbj4nOiIiKSsnPC9kaXY+PC9kaXY+JysKICAgIHZlaFN3Kyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIGZtdE1pbihtaW4pe21pbj1OdW1iZXIobWluKXx8MDtpZihtaW48PTApcmV0dXJuIiI7Y29uc3QgaD1NYXRoLmZsb29yKG1pbi82MCksbT1NYXRoLnJvdW5kKG1pbiU2MCk7cmV0dXJuIGg+MD9oKyJoIisobT9tKyJtaW4iOiIiKTptKyJtaW4ifQpmdW5jdGlvbiBmbXRSZW1haW5IbShtaW4pe21pbj1NYXRoLm1heCgxLE1hdGgucm91bmQoTnVtYmVyKG1pbil8fDApKTtjb25zdCBoPU1hdGguZmxvb3IobWluLzYwKSxtPW1pbiU2MDtyZXR1cm4gKGg+MD9oKyIg5pe2ICI6IiIpK20rIiDliIYifQoKLyogPT09PT09PT09PT09IOWkmui9puWIh+aNoiA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCl7CiAgaWYoIXYudmVoaWNsZXN8fHYudmVoaWNsZXMubGVuZ3RoPDIpcmV0dXJuICIiOwogIGNvbnN0IGN1cj12LmN1cnJlbnRWaW58fCIiOwogIGNvbnN0IGl0ZW1zPXYudmVoaWNsZXMubWFwKHg9Pic8YnV0dG9uIGNsYXNzPSJ2ZWgtY2hpcCcrKHgudmluTm89PT1jdXI/IiBvbiI6IiIpKyciIG9uY2xpY2s9InN3aXRjaFZlaGljbGUoJytpZHgrJyxcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgudmVoaWNsZVR5cGV8fHgubmFtZSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0idmVoLXN3aXRjaCI+PHNwYW4gY2xhc3M9InZlaC1zdy1sYWJlbCI+6L2m6L6GPC9zcGFuPicraXRlbXMrJzwvZGl2Pic7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZShpZHgsdmluKXsKICBjb25zdCBzcmM9U1RBVEUuZGF0YVtpZHhdO2lmKCFzcmN8fCF2aW4pcmV0dXJuOwogIHRyeXsKICAgIGxldCBkOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IHI9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChzcmMudXNlcklkfHwiIikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICAgIGQ9KHImJnIub2spP3IucmVzdWx0Om51bGw7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjYz1nZXRBY2NvdW50cygpW2lkeF07CiAgICAgIGlmKCFhY2MpcmV0dXJuOwogICAgICBkPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW4pOwogICAgfQogICAgaWYoZCYmZC52ZWhpY2xlJiZkLnZlaGljbGUuaGFzVmVoaWNsZSl7CiAgICAgIFNUQVRFLmRhdGFbaWR4XT1PYmplY3QuYXNzaWduKHt9LFNUQVRFLmRhdGFbaWR4XSxkKTsKICAgICAgcmVuZGVySG9tZSgpOwogICAgfQogIH1jYXRjaChlKXt9Cn0KCi8qID09PT09PT09PT09PSDkuLvpopjvvIh2Mi4xNC4xNCDotbfku4Xkv53nlZnmt7HoibLljZXkuLvpopjvvIkgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIiwiZGFyayIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDnq4vljbPnrb7liLDmgqzmta7mjInpkq4gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbW91bnRTaWduaW5GYWIoKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIikpcmV0dXJuOwogIGNvbnN0IGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiYnV0dG9uIik7CiAgYi5pZD0ic2lnbmluRmFiIjtiLmNsYXNzTmFtZT0ic2lnbmluLWZhYiI7Yi5pbm5lckhUTUw9KEkuY2hlY2t8fCIiKSsiPHNwYW4+56uL5Y2z562+5YiwPC9zcGFuPiI7CiAgYi5vbmNsaWNrPXJ1blNpZ25pbk5vdzsKICBjb25zdCBjdXI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcigiLnRhYi5vbiIpOwogIGIuc3R5bGUuZGlzcGxheT0oIWN1cnx8Y3VyLmRhdGFzZXQudGFiPT09ImhvbWUiKT8iZmxleCI6Im5vbmUiOwogIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYik7Cn0KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluTm93KCl7CiAgaWYoaXNEZW1vKCkpe2RlbW9TaWduaW4oKTtyZXR1cm59CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTsKICBpZighYnRufHxidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCJidXN5IikpcmV0dXJuOwogIGJ0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i562+5Yiw5Lit4oCmIjsKICB0b2FzdCgi5q2j5Zyo5Li65YWo6YOo6LSm5Y+35omn6KGM562+5Yiw4oCmIiwiaW5mbyIpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5ydW5TaWduaW4obnVsbCx0cnVlKTsKICBidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCI7CiAgaWYoZCYmZC5vayYmZC5yZXN1bHRzKXsKICAgIGNvbnN0IG9rTj1kLnJlc3VsdHMuZmlsdGVyKHI9PnIuc3VjY2VzcykubGVuZ3RoOwogICAgdG9hc3QoIuetvuWIsOWujOaIkO+8miIrb2tOKyIvIitkLnJlc3VsdHMubGVuZ3RoKyIg5oiQ5YqfIixva049PT1kLnJlc3VsdHMubGVuZ3RoPyJvayI6ImVyciIpOwogICAgb3BlblNoZWV0KCLnrb7liLDnu5PmnpwiLEkuY2hlY2ssc2lnbmluUmVzdWx0SHRtbChkLnJlc3VsdHMpKTsKICAgIHJlZnJlc2hBbGwodHJ1ZSk7CiAgfWVsc2V7CiAgICB0b2FzdCgoZCYmZC5lcnJvcil8fCLnrb7liLDmiafooYzlpLHotKUiLCJlcnIiKTsKICB9Cn0KZnVuY3Rpb24gc2lnbmluUmVzdWx0SHRtbChyZXN1bHRzKXsKICByZXR1cm4gKHJlc3VsdHN8fFtdKS5tYXAocj0+JzxkaXYgY2xhc3M9InNpZy1jYXJkICcrKHIuc3VjY2Vzcz8ib2siOiJmYWlsIikrJyI+PGRpdiBjbGFzcz0iaCI+PHNwYW4+Jytlc2Moci51c2VyTmFtZXx8IuacquefpSIpKyc8L3NwYW4+PHNwYW4gY2xhc3M9InIiPicrKHIuc3VjY2Vzcz8oIisiKyhyLnRvdGFsR2Fpbnx8MCkrIiDliIYiKToi5aSx6LSlIikrJzwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJzdGVwcyI+Jysoci5zdGVwc3x8W10pLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikrKHIuZXJyb3I/JzxkaXYgY2xhc3M9ImVyciI+Jytlc2Moci5lcnJvcikrJzwvZGl2Pic6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKfQovKiDmvJTnpLrmqKHlvI/vvJrmqKHmi5/kuIDmrKHnrb7liLDlubblvLnlh7rnu5PmnpzvvIzpgb/lhY3mvJTnpLrml7bnu5PmnpzkuLrnqbogKi8KZnVuY3Rpb24gZGVtb1NpZ25pbigpewogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoYnRuKXtidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiJ9CiAgdG9hc3QoIua8lOekuuaooeW8j++8muaooeaLn+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBzZXRUaW1lb3V0KCgpPT57CiAgICBpZihidG4pe2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i56uL5Y2z562+5YiwIn0KICAgIGNvbnN0IHJlcz1bCiAgICAgIHt1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjksc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzMgKOenr+WIhikiLCLlj5HluJbmiJDlip8gKzEiLCLngrnotZ7miJDlip8gKzEiLCLliIbkuqvmiJDlip8gKzEiLCLor4TorrrlrozmiJAiXX0sCiAgICAgIHt1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acn++8jOivt+mHjeaWsOeZu+W9lSIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfQogICAgXTsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoxLzIg5oiQ5Yqf77yI5ryU56S65pWw5o2u77yJIiwib2siKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLHNpZ25pblJlc3VsdEh0bWwocmVzKSk7CiAgfSw3MDApOwp9CgovKiA9PT09PT09PT09PT09PT09PSDovabovobor6bmg4UgJiDlnLDlm74gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gb3Blbk1hcChpZHgpe2NvbnN0IHY9U1RBVEUuZGF0YVtpZHhdJiZTVEFURS5kYXRhW2lkeF0udmVoaWNsZTtpZighdilyZXR1cm47aWYoIWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSkpe3RvYXN0KCLmmoLml6DmnInmlYggR1BTIOWdkOaghyIsImVyciIpO3JldHVybn1jb25zdCB1cmw9Imh0dHBzOi8vbWFwcy5hcHBsZS5jb20vP3E9IitOdW1iZXIodi5sYXRpdHVkZSkrIiwiK051bWJlcih2LmxvbmdpdHVkZSkrIiZ6PTE3Ijt3aW5kb3cub3Blbih1cmwsIl9ibGFuayIpfQpmdW5jdGlvbiBzaG93VmVoaWNsZURldGFpbChpZHgpewogIGNvbnN0IGE9U1RBVEUuZGF0YVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3QgcHc9cG93ZXJUZXh0KHYucG93ZXJTdGF0dXMsdi5sb2NrU3RhdGUpOwogIGNvbnN0IHJvd3M9W107CiAgaWYodi52aW5Obylyb3dzLnB1c2goWyfovabmnrblj7cnLCc8c3BhbiBjbGFzcz0idiBtb25vIiBpZD0idmluRHRsIj4nK2VzYyhtYXNrVmluKHYudmluTm8pKSsnPC9zcGFuPiA8YnV0dG9uIGNsYXNzPSJ2aW4tc2hvdyIgb25jbGljaz0idG9nZ2xlRHRsVmluKCkiPuaYvuekujwvYnV0dG9uPiddKTsKICByb3dzLnB1c2goWyflhYXnlLXnirbmgIEnLGVzYyh2LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IildKTsKICByb3dzLnB1c2goWyfnlLXmupDnirbmgIEnLCc8c3BhbiBzdHlsZT0iY29sb3I6JysocHcuY2xzPT09Im9uIj8idmFyKC0tb2spIjoidmFyKC0tdHh0MikiKSsnIj4nK3B3LnRleHQrJzwvc3Bhbj4nXSk7CiAgaWYodi5yaWRlU3RhdGV8fHYub25saW5lKXJvd3MucHVzaChbJ+i9pui+hueKtuaAgScsZXNjKHYucmlkZVN0YXRlfHx2Lm9ubGluZSldKTsKICByb3dzLnB1c2goWyfnlLXph48gU09DJywnPGIgc3R5bGU9ImNvbG9yOicrKHYuYmF0dGVyeVBlcmNlbnQ8PTIwPyJ2YXIoLS1lcnIpIjp2LmJhdHRlcnlQZXJjZW50PD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1icmFuZCkiKSsnIj4nKyh2LmJhdHRlcnlQZXJjZW50fHwwKSsnJTwvYj4nXSk7CiAgaWYodi52b2x0YWdlKXJvd3MucHVzaChbJ+eUteWOiycsdi52b2x0YWdlLnRvRml4ZWQoMSkrIlYiXSk7CiAgaWYodi5jdXJyZW50KXJvd3MucHVzaChbJ+eUtea1gScsdi5jdXJyZW50LnRvRml4ZWQoMSkrIkEiXSk7CiAgaWYodi5iYXR0ZXJ5VGVtcClyb3dzLnB1c2goWyfnlLXmsaDmuKnluqYnLHYuYmF0dGVyeVRlbXAudG9GaXhlZCgwKSsiwrBDIl0pOwogIHJvd3MucHVzaChbJ+WJqeS9mee7reiIqicsKHYucmVzaWR1YWxSYW5nZUttfHwwKSsiIGttIisodi5yYW5nZUVzdGltYXRlZD8i77yI5Lyw566X77yJIjoiIildKTsKICByb3dzLnB1c2goWyfku4rml6XpqpHooYwnLCh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6MCkrIiBrbSAvICIrKHYudG9kYXlEdXJhdGlvbnx8MCkrIiBtaW4iXSk7CiAgaWYoKHYuZnJvbnRQcmVzc3VyZSYmdi5mcm9udFByZXNzdXJlIT09Iuacque7keWumiIpfHwodi5yZWFyUHJlc3N1cmUmJnYucmVhclByZXNzdXJlIT09Iuacque7keWumiIpKXJvd3MucHVzaChbJ+iDjuWOiycsJ+WJjSAnK2VzYyh2LmZyb250UHJlc3N1cmV8fCItIikrJyAvIOWQjiAnK2VzYyh2LnJlYXJQcmVzc3VyZXx8Ii0iKV0pOwogIGlmKHYuYWRkcmVzcylyb3dzLnB1c2goWyfovabovobkvY3nva4nLCc8c3BhbiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmFkZHJlc3MpKyc8L3NwYW4+J10pOwogIGNvbnN0IGRPaz1oYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpOwogIGlmKGRPaylyb3dzLnB1c2goWydHUFMg5Z2Q5qCHJywnPHNwYW4gY2xhc3M9InYgbW9ubyI+JytOdW1iZXIodi5sYXRpdHVkZSkudG9GaXhlZCg2KSsiLCAiK051bWJlcih2LmxvbmdpdHVkZSkudG9GaXhlZCg2KSsnPC9zcGFuPiddKTsKICBpZih2LmxvY2F0aW9uVGltZSlyb3dzLnB1c2goWyfmnIDlkI7lrprkvY0nLCc8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmxvY2F0aW9uVGltZSkrJzwvc3Bhbj4nXSk7CiAgaWYodi5zZXJ2aWNlRW5kRGF0ZSlyb3dzLnB1c2goWyfmnI3liqHliLDmnJ8nLGVzYyh2LnNlcnZpY2VFbmREYXRlKV0pOwogIFNUQVRFLnZpbkR0bFJhdz12LnZpbk5vfHwiIjsKICBjb25zdCBodG1sPXJvd3MubWFwKHI9Pic8ZGl2IGNsYXNzPSJzci1pdGVtIj48c3BhbiBjbGFzcz0iayI+JytyWzBdKyc8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrclsxXSsnPC9zcGFuPjwvZGl2PicpLmpvaW4oIiIpKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gJysoZE9rPyJwcmltYXJ5IjoiIikrJyIgJysoZE9rPydvbmNsaWNrPSJjbG9zZVNoZWV0KCk7b3Blbk1hcCgnK2lkeCsnKSInOidkaXNhYmxlZCB0aXRsZT0i5pqC5peg5pyJ5pWIR1BT5Z2Q5qCHIicpKyc+JytJLm1hcCsnIOWcsOWbvuafpeecizwvYnV0dG9uPjwvZGl2Pic7CiAgb3BlblNoZWV0KCLovabovobor6bmg4UgwrcgIitlc2Modi52ZWhpY2xlTmFtZXx8IuaegeaguOi9pui+hiIpLEkuY2FyLGh0bWwpOwp9CmZ1bmN0aW9uIHRvZ2dsZUR0bFZpbigpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aW5EdGwiKTtpZighZWwpcmV0dXJuO2lmKGVsLnRleHRDb250ZW50LmluZGV4T2YoIioiKT49MCl7ZWwudGV4dENvbnRlbnQ9U1RBVEUudmluRHRsUmF3O2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IumakOiXjyJ9ZWxzZXtkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLmmL7npLoiO2VsLnRleHRDb250ZW50PW1hc2tWaW4oZWwudGV4dENvbnRlbnQpfX0KLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGM77yI6Z2i5p2/5bey56e76Zmk5omL5Yqo562+5Yiw5YWl5Y+j77yM5a6a5pe2562+5Yiw55Sx6ISa5pysIGNyb24g6LSf6LSj77yJID09PT09PT09PT09PT09PT09ICovCgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KLy8gdjIuMTQuMjEg6L2m5o6n6aOO6Zmp56Gu6K6k5pS55Li66aaW5qyh5L2/55So5by556qX77ya5ZCM5oSP5ZCO5Y+v55So77yM5LiN5ZCM5oSP5YiZ5LiN5ZCv55SoCmxldCBfX3Jpc2tQZW5kaW5nPW51bGw7CmZ1bmN0aW9uIHJpc2tPaygpe2NvbnN0IHI9KGdldENmZygpLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKTtyZXR1cm4gcj09PSLmiJHlkIzmhI/po47pmanlubbkvb/nlKgifHxyPT09IuaIkeiHquaEv+aJv+aLheebuOWFs+mjjumZqSJ9CmZ1bmN0aW9uIGN0cmxBY3QoaWR4LGFjdGlvbixidG4pe2lmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufWNvbnN0IGE9cHRBY2NvdW50cygpW2lkeF07aWYoIWF8fCFhLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufWlmKCFyaXNrT2soKSl7c2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbik7cmV0dXJufWN0cmxDb25maXJtKGlkeCxhY3Rpb24pfQpmdW5jdGlvbiBjdHJsQ29uZmlybShpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2NvbnN0IG5hbWVzPXtmaW5kOiLnn63mjInlr7vovabvvIjovabovobpl6rnga/vvIkiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga/vvIjpq5jlo7Dlr7vovabvvIkiLGN1c2hpb246IuaJk+W8gOWdkOWeq++8iOWdkOWeq+S8muW8uei1t++8iSIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9O2NvbnN0IG5hbWU9bmFtZXNbYWN0aW9uXXx8YWN0aW9uO2NvbmZpcm1EaWFsb2coIuehruiupOaJp+ihjCAiK25hbWUsIuivpeaMh+S7pOS8mumAmui/hyA0RyDnvZHnu5znnJ/lrp7mjqfliLbkvaDnmoTovabovobvvJoiK2VzYyhhLnVzZXJOYW1lKSsi44CCIiwnZG9DdHJsKCcraWR4KyIsJyIrYWN0aW9uKyInKSIpfQpmdW5jdGlvbiBzaG93Umlza0RpYWxvZyhpZHgsYWN0aW9uKXsKICBfX3Jpc2tQZW5kaW5nPXtpZHg6aWR4LGFjdGlvbjphY3Rpb259OwogIGNvbnN0IGxheWVyPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKTsKICBsYXllci5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNvbmZpcm0iPjxkaXYgY2xhc3M9ImN0Ij7ovabmjqflip/og73po47pmanlkYrnn6U8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+5a+76L2mIC8g6bij56ybIC8g5Z2Q5Z6rIC8g5byA6ZSBIC8g5YWz6ZSB562J5oyH5Luk57uPIDRHIOS6keerr+S4i+WPke+8jOS8mjxiPuecn+WunuaTjeS9nOS9oOeahOi9pui+hjwvYj7jgILlj5fnvZHnu5zlu7bov5/jgIHkv6Hlj7fnrYnlvbHlk43vvIzmjIfku6Tlj6/og73lu7bov5/jgIHlpLHotKXvvIzmnoHnq6/mg4XlhrXkuIvovabovoblj6/og73mhI/lpJbliqjkvZzvvIjlpoLor6/lvIDplIHvvInjgILkvb/nlKjovabmjqflip/og73ljbPop4bkuLrkvaDlt7LlhYXliIbnn6Xmgonlubboh6rmhL/mib/mi4XkuIrov7Dpo47pmanvvIznlLHmraTkuqfnlJ/nmoTkuIDliIflkI7mnpznlLHkvaDoh6rooYzmib/mi4XjgII8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9InJpc2tEZWNsaW5lKCkiPuaIkeS4jeWQjOaEj+mjjumZqeS4jeS9v+eUqDwvYnV0dG9uPjxidXR0b24gY2xhc3M9InllcyIgb25jbGljaz0icmlza0FncmVlKCkiPuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqDwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgbGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIik7Cn0KZnVuY3Rpb24gcmlza0FncmVlKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYz1nZXRDZmcoKTtjLnZlaGljbGVDb250cm9sUmlzaz0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoIjtCYWNrZW5kLnNhdmVDb25maWcoYykudGhlbihmdW5jdGlvbihvayl7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpYXBwbHlSZW1vdGVDZmcoYyk7ZWxzZSBzYXZlQ2ZnKGMpO3RvYXN0KCLlt7LlkIzmhI/po47pmanvvIzovabmjqflip/og73lt7LlkK/nlKgiLCJvayIpO2lmKF9fcmlza1BlbmRpbmcpe2NvbnN0IHA9X19yaXNrUGVuZGluZztfX3Jpc2tQZW5kaW5nPW51bGw7Y3RybENvbmZpcm0ocC5pZHgscC5hY3Rpb24pfX1lbHNle3RvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKTtfX3Jpc2tQZW5kaW5nPW51bGx9fSl9CmZ1bmN0aW9uIHJpc2tEZWNsaW5lKCl7Y2xvc2VDb25maXJtKCk7X19yaXNrUGVuZGluZz1udWxsO3RvYXN0KCLlt7LpgInmi6nkuI3lkIzmhI/po47pmanvvIzovabmjqflip/og73kuI3lkK/nlKgiLCJpbmZvIil9CmFzeW5jIGZ1bmN0aW9uIGRvQ3RybChpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCBidG49ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmN0cmwtYnRuW2RhdGEtYWN0PSInK2FjdGlvbisnIl0nKTtjb25zdCBvbGQ9YnRuP2J0bi5pbm5lckhUTUw6IiI7aWYoYnRuKXtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5pbm5lckhUTUw9SS5jbG9ja310b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC52ZWhpY2xlQ3RybChhLnVzZXJJZCxhY3Rpb24pO2lmKGJ0bil7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLmlubmVySFRNTD1vbGR9aWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi5oyH5Luk5bey5LiL5Y+RIiwib2siKX1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5oyH5Luk5aSx6LSlIiwiZXJyIil9fQoKLyogPT09PT09PT09PT09PT09PT0g5pel5b+X6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBsb2dGaWx0ZXI9ImFsbCI7CmFzeW5jIGZ1bmN0aW9uIHJlbmRlckxvZ3MoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUxvZ3MiKTsKICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rdisn6L+Q6KGM5pel5b+XPC9kaXY+JysKICAnPGRpdiBjbGFzcz0ibG9nLXBhbmVsIj48ZGl2IGNsYXNzPSJsb2ctaGVhZCI+PGgzPicrSS5rdisnPHNwYW4+5pyA6L+RIDUwIOadoTwvc3Bhbj48L2gzPjxkaXYgY2xhc3M9ImxvZy1maWx0ZXJzIj4nKwogIFsnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0iYWxsIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdhbGxcJykiPuWFqOmDqDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InNpZ25pbiI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnc2lnbmluXCcpIj7nrb7liLA8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJ2ZWhpY2xlIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCd2ZWhpY2xlXCcpIj7mjqfovaY8L2J1dHRvbj4nXS5qb2luKCIiKSsKICAnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ibG9nLWxpc3QiIGlkPSJsb2dMaXN0Ij48ZGl2IHN0eWxlPSJwYWRkaW5nOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0MykiPuWKoOi9veS4reKApjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE0cHgiPjxidXR0b24gY2xhc3M9ImJ0biBkYW5nZXIiIHN0eWxlPSJmbGV4OjEiIG9uY2xpY2s9ImNsZWFyTG9nc1VJKCkiPua4heepuuaXpeW/lzwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgbG9ncz1sb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wP0RFTU9fTE9HUzphd2FpdCBCYWNrZW5kLmdldExvZ3MoKTtyZW5kZXJMb2dMaXN0KGxvZ3MpOwp9CmZ1bmN0aW9uIHNldExvZ0ZpbHRlcihmKXtsb2dGaWx0ZXI9ZjtyZW5kZXJMb2dzKCl9CmZ1bmN0aW9uIHJlbmRlckxvZ0xpc3QobG9ncyl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImxvZ0xpc3QiKTtpZighZWwpcmV0dXJuO2NvbnN0IGxpc3Q9KGxvZ3N8fFtdKS5maWx0ZXIobD0+e2NvbnN0IHQ9bC50eXBlfHwic2lnbmluIjtpZihsb2dGaWx0ZXI9PT0iYWxsIilyZXR1cm4gdHJ1ZTtyZXR1cm4gdD09PWxvZ0ZpbHRlcn0pO2lmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJsb2ctZW1wdHkiPicrSS53YXJuKyc8YnI+6K+l5YiG57G75LiL5pqC5peg5pel5b+XPC9kaXY+JztyZXR1cm59ZWwuaW5uZXJIVE1MPWxpc3QubWFwKChsb2csaSk9Pntjb25zdCB0PWxvZy50eXBlfHwic2lnbmluIjtjb25zdCB0YWc9dD09PSJ2ZWhpY2xlIj8nPHNwYW4gY2xhc3M9InBpbGwgYW1iZXIiPuaOp+i9pjwvc3Bhbj4nOic8c3BhbiBjbGFzcz0icGlsbCBjeWFuIj7nrb7liLA8L3NwYW4+JztsZXQgcmVzO2lmKHQ9PT0idmVoaWNsZSIpe3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5hY3Rpb25UZXh0fHwi6L2m6L6G5o6n5Yi2IikrJyAnKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfIjoi5aSx6LSl77yaIitlc2MobG9nLm1lc3NhZ2V8fGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9ZWxzZXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfICsiK2xvZy50b3RhbEdhaW46IuWksei0pTogIisobG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31jb25zdCBzdGVwcz1sb2cuc3RlcHM/KGxvZy5zdGVwcy5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKToiIjtyZXR1cm4gJzxkaXYgY2xhc3M9ImxvZy1pdGVtIiBzdHlsZT0iYW5pbWF0aW9uLWRlbGF5OicrKGkqMjUpKydtcyI+PGRpdiBjbGFzcz0ibG9nLXRpbWUiPicrZXNjKGxvZy50aW1lfHwiIikrJzwvZGl2PjxkaXYgY2xhc3M9ImxvZy1tYWluIj4nK3RhZysnPHNwYW4gY2xhc3M9ImxvZy11c2VyIj4nK2VzYyhsb2cudXNlck5hbWV8fCIiKSsnPC9zcGFuPicrcmVzKyc8L2Rpdj4nKyhzdGVwcz8nPGRpdiBjbGFzcz0ibG9nLXN0ZXBzIj4nK3N0ZXBzKyc8L2Rpdj4nOiIiKSsnPC9kaXY+J30pLmpvaW4oIiIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NVSSgpe2NvbmZpcm1EaWFsb2coIua4heepuuaXpeW/lyIsIuWwhuWIoOmZpOWFqOmDqOi/kOihjOaXpeW/l++8jOatpOaTjeS9nOS4jeWPr+aBouWkjeOAgiIsImNsZWFyTG9nc05vdyIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NOb3coKXtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLmNsZWFyTG9ncygpO2lmKG9rKXt0b2FzdCgi5pel5b+X5bey5riF56m6Iiwib2siKTtyZW5kZXJMb2dzKCl9ZWxzZSB0b2FzdCgi5riF56m65aSx6LSlIiwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDorr7nva7pobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGNmZ0FjY291bnRzPVtdOwovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNS42IOi9r+S7tueJiOacrOajgOa1iyA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBjaGVja1ZlcnNpb24obWFudWFsKXsKICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZlckNoZWNrQnRuIik7CiAgaWYoYnRuKXtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuajgOa1i+S4reKApiJ9CiAgbGV0IGQ9bnVsbDsKICBpZihpc0RlbW8oKSl7ZD17b2s6dHJ1ZSxkZW1vOnRydWUsY3VycmVudDpBUFBfVkVSU0lPTi5yZXBsYWNlKC9edi8sIiIpLGhhc1VwZGF0ZTpmYWxzZSxsYXRlc3Q6e3NjcmlwdDpBUFBfVkVSU0lPTi5yZXBsYWNlKC9edi8sIiIpfX19CiAgZWxzZXtkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvdmVyc2lvbi1jaGVjayIrKG1hbnVhbD8iP2ZyZXNoPTEiOiIiKSk7fQogIFNUQVRFLnZlcj1kfHxudWxsOwogIGlmKGJ0bil7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i5qOA5p+l5pu05pawIn0KICBjb25zdCBleD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmVyRXh0cmEiKTtpZihleClleC5pbm5lckhUTUw9dmVyRXh0cmFIdG1sKCk7CiAgaWYoU1RBVEUudmVyJiZTVEFURS52ZXIub2smJlNUQVRFLnZlci5oYXNVcGRhdGUmJiFTVEFURS52ZXIuZGVtbyl7CiAgICB0b2FzdCgi5Y+R546w5paw54mI5pysIHYiK1NUQVRFLnZlci5sYXRlc3Quc2NyaXB0KyLvvIjlvZPliY0gdiIrU1RBVEUudmVyLmN1cnJlbnQrIu+8ie+8jOWPr+WIsOOAjOiuvue9ruOAjeafpeeci+abtOaWsOaWueW8jyIpOwogIH1lbHNlIGlmKG1hbnVhbCl7CiAgICB0b2FzdChTVEFURS52ZXImJlNUQVRFLnZlci5vaz8i5bey5piv5pyA5paw54mI5pysIHYiK1NUQVRFLnZlci5jdXJyZW50OigoU1RBVEUudmVyJiZTVEFURS52ZXIuZXJyb3IpfHwi5qOA5rWL5aSx6LSlIiksU1RBVEUudmVyJiZTVEFURS52ZXIub2s/Im9rIjoiZXJyIik7CiAgfQp9CmZ1bmN0aW9uIHZlckV4dHJhSHRtbCgpewogIGNvbnN0IHY9U1RBVEUudmVyOwogIGlmKCF2KXJldHVybiAn54K544CM5qOA5p+l5pu05paw44CN6I635Y+W5pyA5paw54mI5pys5LiO5ZCE56uv5o6o6I2Q54mI5pysJzsKICBpZighdi5vaylyZXR1cm4gJ+ajgOa1i+Wksei0pe+8micrZXNjKHYuZXJyb3J8fCLmnKrnn6XplJnor68iKTsKICBjb25zdCBMPXYubGF0ZXN0fHx7fTsKICBpZighdi5oYXNVcGRhdGUpcmV0dXJuICflt7LmmK/mnIDmlrDniYjmnKwgwrcg6ISa5pysIHYnK2VzYyh2LmN1cnJlbnQpKyh2LmNhY2hlZD8n77yI5pys5Zyw57yT5a2Y77yJJzonJyk7CiAgcmV0dXJuICc8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0td2Fybik7Zm9udC13ZWlnaHQ6NjAwIj7lj5HnjrDmlrDniYjmnKzvvJrohJrmnKwgdicrZXNjKEwuc2NyaXB0fHwiIikrJ++8iOW9k+WJjSB2Jytlc2Modi5jdXJyZW50KSsn77yJPC9zcGFuPicrCiAgJzxicj7mjqjojZDniYjmnKzvvJppT1MgQXBwICcrZXNjKEwuaW9zfHwiLSIpKycgwrcgV2luZG93cyAnK2VzYyhMLnBjfHwiLSIpKycgwrcgQW5kcm9pZCAnK2VzYyhMLmFuZHJvaWR8fCItIikrCiAgKEwubm90ZT8nPGJyPuabtOaWsOWGheWuue+8micrZXNjKEwubm90ZSk6JycpKwogICc8YnI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDIpIj7mm7TmlrDmlrnlvI88L2I+77yaTG9vbiAvIFNoYWRvd3JvY2tldCAvIFN1cmdlIOabtOaWsOaooeWdl+iuoumYheWNs+WPr+aLieWPluacgOaWsOiEmuacrO+8m2lPUyBBcHDvvIhUcm9sbFN0b3Jl77yJ5LiOIFdpbmRvd3MgLyBBbmRyb2lkIOerr+ivt+mHjeaWsOS4i+i9veWvueW6lOWuieijheWMheOAgic7Cn0KZnVuY3Rpb24gcmVuZGVyQ2ZnKCl7CiAgaWYoaXNQcm94eU1vZGUoKSYmbG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKTwwJiYhU1RBVEUucGFuZWxMb2FkZWQpewogICAgY29uc3QgZWwwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlQ2ZnIik7CiAgICBpZihlbDApZWwwLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyNnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mraPlnKjku47ohJrmnKzlkI7nq6/lkIzmraXotKblj7fkuI7phY3nva7igKY8L2Rpdj48L2Rpdj4nOwogICAgZW5zdXJlUGFuZWxEYXRhKCkudGhlbigoKT0+cmVuZGVyQ2ZnKCkpOwogICAgcmV0dXJuOwogIH0KICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y2ZnQWNjb3VudHM9KGlzUHJveHlNb2RlKCkmJlNUQVRFLnBhbmVsQWNjb3VudHM/U1RBVEUucGFuZWxBY2NvdW50czpnZXRBY2NvdW50cygpKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbnx8IiIpLGJhcmtLZXk6YS5iYXJrS2V5fHwiIn0pKTsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogIGNvbnN0IGFjY1Jvd3M9Y2ZnQWNjb3VudHMubWFwKChhLGlkeCk9Pic8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJOYW1lKSsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJJZCkrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbu+8iOeymOi0tOWNs+WPr++8jOiHquWKqOWOu+aOiSBCZWFyZXIg5YmN57yA77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS50b2tlbikrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8jOetvuWIsOaIkOWKn+aOqOmAge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS5iYXJrS2V5KSsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgY29uc3QgY29tbT1jZmcuY29tbXVuaXR5OwogIGNvbnN0IHN3PShpZCxsYWJlbCxzdWIsY2hlY2tlZCk9Pic8bGFiZWwgY2xhc3M9InN3aXRjaCI+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0iJytpZCsnIiAnKyhjaGVja2VkPyJjaGVja2VkIjoiIikrJz48c3BhbiBjbGFzcz0ic3ciPjwvc3Bhbj48c3BhbiBjbGFzcz0ibGJsIj4nK2xhYmVsKyc8L3NwYW4+PHNwYW4gY2xhc3M9InNjIj4nK3N1YisnPC9zcGFuPjwvbGFiZWw+JzsKICBlbC5pbm5lckhUTUw9CiAgJzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rZXkrJ+iuvue9rjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuaJi+acuuWPt+eZu+W9lTwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCic8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7miYvmnLrlj7fvvIjmnoHmoLggQXBwIOe7keWumuWPt+egge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRlbCIgaWQ9InBsX3Bob25lIiBwbGFjZWhvbGRlcj0iMTEg5L2N5omL5py65Y+3IiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuefreS/oemqjOivgeeggTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJwbF9jb2RlIiBwbGFjZWhvbGRlcj0iNiDkvY3pqozor4HnoIEiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwonPC9kaXY+JysKJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2VuZFNtc0NvZGUoKSIgaWQ9InBsX3NlbmRfYnRuIj7ojrflj5bpqozor4HnoIE8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icGhvbmVMb2dpblVJKCkiIGlkPSJwbF9sb2dpbl9idG4iPueZu+W9leW5tua3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7nlKjmiYvmnLrlj7cgKyDnn63kv6Hpqozor4HnoIHnmbvlvZXvvIzoh6rliqjojrflj5YgVG9rZW4g5LiO55So5oi3SUTlubbliqDlhaXotKblj7fliJfooajvvIznmbvlvZXmiJDlip/lkI7oh6rliqjkv53lrZjlubbliLfmlrDpobXpnaLjgII8YnI+wrcg5bCP5Y+355m75b2V77ya5Y+v5aSa5qyh55m75b2V5LiN5ZCM5omL5py65Y+377yM5oyJ5bCP5Y+36YCQ5Liq5re75Yqg5LiO566h55CG44CCPGJyPsK3IOacjeWKoeWIsOacnyAvIOe7keWumue7rei0ue+8mui9pui+huaZuuiDveacjeWKoeWIsOacn+OAgeaIlumcgOimgee7keWumue7rei0ueaXtu+8jOmHjeaWsOeUqOaJi+acuuWPt+eZu+W9leWNs+WPr+WIt+aWsOaOiOadg++8jOWFqOeoi+aXoOmcgOaKk+WMheOAgjwvZGl2PicrCic8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPuWumuaXtuetvuWIsDwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgc3coImF1dG9fc2lnbmluIiwi5a6a5pe2562+5YiwIiwi5Yiw54K56Ieq5Yqo5Li65YWo6YOo6LSm5Y+3562+5YiwIixjZmcuYXV0b1NpZ25pbj09PXRydWUpKwogIHN3KCJ2ZWhpY2xlX21vbml0b3IiLCLovabovobnirbmgIHnm5HmjqciLCLlhYXmu6Ev56a757q/5pe25pys5Zyw6YCa55+l5o+Q6YaS77yI5omT5byA6Z2i5p2/5pe25qOA5p+l77yJIixjZmcudmVoaWNsZU1vbml0b3I9PT10cnVlKSsKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+562+5Yiw5pe26Ze077yI5q+P5aSp77yMSEg6TU3vvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0aW1lIiBpZD0iY2ZnX3NpZ25pbl90aW1lIiB2YWx1ZT0iJytlc2MoY2ZnLmF1dG9TaWduaW5UaW1lfHwiMDc6MDAiKSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5Luj55CG6ISa5pys5peg5bi46am75ZCO5Y+w77yM6YeH55So44CM5omT5byA6KGl562+44CN5py65Yi277ya5byA5ZCv5ZCO77yM5q+P5aSp6aaW5qyh5omT5byA6Z2i5p2/5LiU5bey6L+H6K6+5a6a5pe26Ze05pe277yM6Ieq5Yqo5Li65YWo6YOo6LSm5Y+35omn6KGM5LiA5qyh562+5Yiw77yI5YaZ5pel5b+X44CB5o6oIEJhcmvvvIzkuI7miYvliqjnrb7liLDkuIDoh7TvvInvvIzlkIzkuIDlpKnlj6rmiafooYzkuIDmrKHjgILpppbpobXjgIznq4vljbPnrb7liLDjgI3mgqzmta7mjInpkq7lj6/pmo/ml7bmiYvliqjmiafooYzjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuekvuWMuuS7u+WKoeW8gOWFszwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCIgc3R5bGU9ImdhcDo4cHgiPicrCiAgc3coImNvbW1fcG9zdCIsIuWPkeW4g+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVQb3N0IT09ZmFsc2UpK3N3KCJjb21tX2xpa2UiLCLngrnotZ7liqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKStzdygiY29tbV9jb21tZW50Iiwi6K+E6K665Yqo5oCBIiwi5LiN5Yqg5YiGIixjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSkrc3coImNvbW1fc2hhcmUiLCLliIbkuqvliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSkrc3coImNvbW1fZGVsZXRlIiwi5omn6KGM5ZCO5Yig6Zmk5Yqo5oCBIiwi5riF55CG55eV6L+5Iixjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlKSsKICAnPC9kaXY+PGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5YWz6Zet5a+55bqU5byA5YWz5ZCO77yM562+5Yiw6ISa5pys5bCG6Lez6L+H6K+l5Lu75Yqh44CC5L+u5pS55ZCO54K55Ye76aG16Z2i5bqV6YOo44CM5L+d5a2Y6YWN572u44CN55Sf5pWI44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIbvvIgnK2NmZ0FjY291bnRzLmxlbmd0aCsnIOS4qu+8iTwvaDM+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFkZEFjY291bnRVSSgpIj4rIOa3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0iYWNjTGlzdCI+JysoYWNjUm93c3x8JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjJweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pqC5peg6LSm5Y+377yM54K55Ye744CM5re75Yqg6LSm5Y+344CNPC9kaXY+JykrJzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVBY2NvdW50c1VJKCkiPuS/neWtmOaegeaguOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ub3RlIj48Yj7kvb/nlKjor7TmmI48L2I+PGJyPsK3IFRva2Vu77ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24g5YC85Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIDxjb2RlPkJlYXJlciA8L2NvZGU+IOWJjee8gOOAgjxicj7CtyDojrflj5ZJRO+8muWhq+WFpSBUb2tlbiDlkI7ngrnjgIzojrflj5ZJROOAje+8jOiHquWKqOS7jiBINSBiYXNlSW5mbyAvIEFwcCBzZXR0aW5nIC8g6L2m6L6G5YiX6KGo5o6l5Y+j6Kej5p6Q55So5oi3SUTkuI7mmLXnp7DjgII8YnI+wrcgQmFyayBLZXnvvJror6XotKblj7fnrb7liLDmiJDlip/lkI7mjqjpgIHpgJrnn6XvvIznlZnnqbrkuI3mjqjjgII8YnI+wrcg5o6n6L2m5oyH5Luk77yI5a+76L2mL+m4o+esmy/lnZDlnqsv5byA5YWz6ZSB77yJ5Lya55yf5a6e5pON5L2c6L2m6L6G77yM6ZyA5LqM5qyh56Gu6K6k44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lpIfku73otKblj7fphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZXhwb3J0QmFja3VwVUkoKSI+5LiA6ZSu5a+85Ye65aSH5Lu9PC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJjb3B5QmFja3VwVUkoKSI+5aSN5Yi25aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5aSH5Lu95YaF5a6577yI5YyF5ZCr5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5Y+v5aSN5Yi25L+d5a2Y77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImJhY2t1cEFyZWEiIHJvd3M9IjQiIHJlYWRvbmx5IHBsYWNlaG9sZGVyPSLngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI3nlJ/miJDigKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7mgaLlpI3lpIfku73vvIjnspjotLTlpIfku70gSlNPTiDlkI7ngrnmgaLlpI3vvIzlsIbopobnm5bnjrDmnInotKblj7fkuI7phY3nva7vvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iaW1wb3J0QXJlYSIgcm93cz0iNCIgcGxhY2Vob2xkZXI9IueymOi0tOWkh+S7vSBKU09O4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgb25jbGljaz0iaW1wb3J0QmFja3VwVUkoKSI+5oGi5aSN5aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5aSH5Lu95YyF5ZCr5YWo6YOo6LSm5Y+377yI5pi156ewL+eUqOaIt0lEL1Rva2VuL0JhcmtLZXnvvInkuI7pnaLmnb/phY3nva7vvIjnrb7lkI3lr4bpkqUv56S+5Yy65Lu75Yqh5byA5YWzL+iHquWKqOWIt+aWsOetie+8ieOAguaNouacuuaIlumHjeijheWQjueymOi0tOWNs+WPr+S4gOmUrui/mOWOn++8jOaXoOmcgOmHjeaWsOaKk+WMheWhq+WGmeOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuWwj+e7hOS7tuaYvuekuui9pui+hjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPui0puWPtzwvbGFiZWw+PHNlbGVjdCBpZD0id2lkZ2V0X2FjYyIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzoxMHB4IDEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTRweCIgb25jaGFuZ2U9IndpZGdldEFjY0NoYW5nZWQoKSI+Jyt3aWRnZXRBY2NPcHRpb25zKCkrICc8L3NlbGVjdD48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7ovabovoY8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF92ZWgiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6MTBweCAxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjE0cHgiPjwvc2VsZWN0PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumAieaLqeWQju+8jGlPUyDmoYzpnaLlsI/nu4Tku7blsIblsZXnpLror6XovabovobnmoTlrp7ml7bnirbmgIHvvIjnlLXph48v57ut6IiqL+WFheeUtS/nrb7liLDvvInjgII8Yj7kuI3pgInmi6nml7bpu5jorqTlj5bnrKzkuIDkuKrotKblj7fnmoTnrKzkuIDovobovabjgII8L2I+5L+d5a2Y6YWN572u5ZCO55Sf5pWI44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7oh6rlrprkuYnog4zmma88L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7kuIrkvKDog4zmma/nhafniYfvvIjkvJrpk7rlnKjmt7HoibLlupXoibLkuYvkuIrvvIzlu7rorq7mt7HoibIv5L2O5Lqu5bqm5Zu+54mH5Lul5L+d6K+B5paH5a2X5Y+v6K+777yJPC9sYWJlbD48aW5wdXQgdHlwZT0iZmlsZSIgaWQ9ImJnX2ZpbGUiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4IiBvbmNoYW5nZT0iYmdGaWxlQ2hhbmdlZCh0aGlzKSI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4O2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2FsaWduLWl0ZW1zOmNlbnRlciI+PGRpdiBpZD0iYmdQcmV2aWV3IiBzdHlsZT0id2lkdGg6MTIwcHg7aGVpZ2h0OjcycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7YmFja2dyb3VuZC1zaXplOmNvdmVyO2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtvdmVyZmxvdzpoaWRkZW4iPuacqumAieaLqTwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjhweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFwcGx5QmdVcGxvYWQoKSIgaWQ9ImJnX2FwcGx5X2J0biI+5bqU55So6IOM5pmvPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZXNldEJnKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWbvueJh+S7pSBiYXNlNjQg5a2Y5YWl6YWN572u77yM6ZqP5aSH5Lu95LiA5bm25a+85Ye644CC5YiH5o2i6IOM5pmv5a6e5pe255Sf5pWI77yM5peg6ZyA6YeN5ZCv44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAvLyB2Mi4xNC4yMSDliKDpmaTjgIzovabmjqfpo47pmannoa7orqTjgI3pnaLmnb/vvJrmlLnkuLrpppbmrKHkvb/nlKjovabmjqflip/og73ml7blvLnnqpfnoa7orqTvvIjlkIzmhI8v5LiN5ZCM5oSP77yJCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5b2T5YmN5a6J6KOF5L+h5oGvPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuOTtjb2xvcjp2YXIoLS10eHQyKSIgaWQ9Imluc3RhbGxJbmZvIj4nKwogICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5q2j5Zyo5qOA5rWL5a6J6KOF5pa55byP4oCmPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbjoxNHB4IDJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVDZmdVSSgpIj7kv53lrZjphY3nva48L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InJlc2V0Q2ZnVUkoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmc6NHB4IDAiPicrCiAgJzxhIGhyZWY9Im1haWx0bzptbGluazc5OEBvdXRsb29rLmNvbSIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7inInvuI88L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+bWxpbms3OThAb3V0bG9vay5jb208L3NwYW4+PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGEgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7irZA8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+R2l0SHViIOS7k+W6kzwvc3Bhbj48L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDMpIj5jbHVjazc5OC9aRUVITzwvc3Bhbj48L2E+JysKICAnPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjowIDE2cHgiPjwvZGl2PicrCiAgJzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHgiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPvCfk4s8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjp2YXIoLS10eHQyKSI+54mI5pysIC8g5pu05paw5qOA5rWLPC9zcGFuPjwvc3Bhbj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrQVBQX1ZFUlNJT04rJzwvc3Bhbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ2ZXJDaGVja0J0biIgb25jbGljaz0iY2hlY2tWZXJzaW9uKHRydWUpIj7mo4Dmn6Xmm7TmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JysKICAnPGRpdiBpZD0idmVyRXh0cmEiIHN0eWxlPSJwYWRkaW5nOjAgMTZweCAxMnB4O2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuNzU7Y29sb3I6dmFyKC0tdHh0MykiPicrdmVyRXh0cmFIdG1sKCkrJzwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKICAvLyDlsI/nu4Tku7bovabovobkuIvmi4nliJ3lp4vljJbvvIjlm57loavlt7Lkv53lrZjnmoTpgInmi6nvvIkKICBjb25zdCB3c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfYWNjIik7CiAgaWYod3NlbCl7CiAgICBjb25zdCBjdXI9Z2V0Q2ZnKCkud2lkZ2V0VmVoaWNsZTtsZXQgY3VyVWlkPSIiLGN1clZpbj0iIjsKICAgIGlmKGN1cil7Y29uc3QgcD1jdXIuc3BsaXQoInwiKTtjdXJVaWQ9cFswXXx8IiI7Y3VyVmluPXBbMV18fCIiO30KICAgIGlmKGN1clVpZCl3c2VsLnZhbHVlPWN1clVpZDsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMod3NlbC52YWx1ZXx8IiIpOwogICAgaWYoY3VyVmluKXtjb25zdCB2c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIik7Zm9yKGxldCBpPTA7aTx2c2VsLm9wdGlvbnMubGVuZ3RoO2krKyl7aWYodnNlbC5vcHRpb25zW2ldLnZhbHVlPT09Y3VyVmluKXt2c2VsLnNlbGVjdGVkSW5kZXg9aTticmVha319fQogIH0KICAvLyDog4zmma/pooTop4jlm57loasKICBjb25zdCBicD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmdQcmV2aWV3Iik7CiAgaWYoYnApe2NvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnO2lmKGJnKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjticC50ZXh0Q29udGVudD0iIjt9fQogIHJlbmRlckluc3RhbGxJbmZvKCk7Cn0KLyogPT09PT09PT09PT09PT09PT0g5b2T5YmN5a6J6KOF5L+h5oGvID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGluc3RhbGxFbnZOYW1lKCl7CiAgaWYoaXNEZW1vKCkpcmV0dXJuICLmvJTnpLrmqKHlvI/vvIjnpLrkvovmlbDmja7vvIkiOwogIGNvbnN0IHA9KHR5cGVvZiBsb2NhdGlvbiE9PSJ1bmRlZmluZWQiJiZsb2NhdGlvbi5wcm90b2NvbCl8fCIiOwogIGlmKHA9PT0iemVlaG86IilyZXR1cm4gImlPUyBBcHDvvIjmnoHmoLjnrb7liLDpnaLmnb/vvIkiOwogIGlmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmL0VsZWN0cm9uL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50fHwiIikpcmV0dXJuICLmoYzpnaLniYjvvIhXaW5kb3dz77yJIjsKICBpZihpc1Byb3h5TW9kZSgpKXJldHVybiAi5Luj55CG6ISa5pysIjsKICByZXR1cm4gIua1j+iniOWZqCI7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVySW5zdGFsbEluZm8oKXsKICBjb25zdCBib3g9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImluc3RhbGxJbmZvIik7CiAgbGV0IGh0bWw9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206OHB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+6L+Q6KGM546v5aKD77yaPC9iPicraW5zdGFsbEVudk5hbWUoKSsnPC9kaXY+JzsKICAvLyDljp/nlJ/moaXmjqXoh6rmo4DvvJrooYzovaborrDlvZXku6rmoaXnlLHljp/nlJ/ms6jlhaXvvIznvLrlpLHml7blr7nlupTlip/og73kuI3lj6/nlKgKICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7ljp/nlJ/moaXmjqXvvJo8L2I+6K6w5b2V5LuqICcrKCh0eXBlb2YgZGFzaGNhbUhhbmRsZXI9PT0iZnVuY3Rpb24iKT8n4pyTIOWPr+eUqCc6J+KclyDmnKrms6jlhaUnKSsnPC9kaXY+JzsKICBsZXQgaW5mbz1udWxsOwogIHRyeXtpbmZvPWF3YWl0IEJhY2tlbmQuaW5zdGFsbEluZm8oKTt9Y2F0Y2goZSl7aW5mbz1udWxsfQogIGlmKCFpbmZvfHwhaW5mby5pb3MpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7nrb7lkI3mlrnlvI/ku4XmlK/mjIEgaU9TIEFwcCDlhoXmn6XnnIvvvIjor7vlj5blvZPliY3lronoo4XljIXnmoTnrb7lkI3mj4/ov7Dmlofku7bvvInjgII8L2Rpdj4nOwogIH0gZWxzZSB7CiAgICBjb25zdCBtPWluZm8uc2lnbk1ldGhvZHx8InVua25vd24iOwogICAgY29uc3QgbGFiZWw9e3Ryb2xsc3RvcmU6IuW3qOmtlCBUcm9sbFN0b3Jl77yI5rC45LmF562+5ZCN77yJIixlbnRlcnByaXNlOiLkvIHkuJrnrb7lkI3vvIjliIblj5HvvIkiLHNpZGVsb2FkOiLkuKrkurroh6rnrb7vvIg3IOWkqeacieaViOacn++8iSIsZGV2ZWxvcGVyOiLlvIDlj5HogIUgLyBUZXN0RmxpZ2h077yI6ZW/5pyf77yJIix1bmtub3duOiLml6Dms5Xnoa7lrpoifVttXXx8IuaXoOazleehruWumiI7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7lronoo4XmlrnlvI/vvJo8L2I+JytsYWJlbCsnPC9kaXY+JzsKICAgIGlmKGluZm8uZXhwaXJhdGlvbil7CiAgICAgIGxldCBleHRyYT0iIjsKICAgICAgaWYodHlwZW9mIGluZm8uZGF5c1JlbWFpbj09PSJudW1iZXIiJiZpc0Zpbml0ZShpbmZvLmRheXNSZW1haW4pJiZpbmZvLmRheXNSZW1haW4+PTApZXh0cmE9J++8iOWJqeS9mee6piAnK2luZm8uZGF5c1JlbWFpbisnIOWkqe+8iSc7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuetvuWQjeacieaViOacn+iHs++8mjwvYj4nK2VzYyhTdHJpbmcoaW5mby5leHBpcmF0aW9uKS5yZXBsYWNlKCJUIiwiICIpLnJlcGxhY2UoIloiLCIiKSkrJyAnK2V4dHJhKyc8L2Rpdj4nOwogICAgfQogICAgaWYoaW5mby50ZWFtTmFtZXx8aW5mby50ZWFtSWQpewogICAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7nrb7lkI3lm6LpmJ/vvJo8L2I+Jytlc2MoaW5mby50ZWFtTmFtZXx8aW5mby50ZWFtSWQpKyc8L2Rpdj4nOwogICAgfQogICAgaWYobT09PSJzaWRlbG9hZCIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuS4quS6uuiHquetviA3IOWkqeWIsOacn+WQju+8jOmcgOi/nuaOpeeUteiEkeeUqCBBbHRTdG9yZSAvIFNpZGVsb2FkbHkg6YeN5paw562+5ZCN77yb5bu66K6u5pS555So5beo6a2UIFRyb2xsU3RvcmUg5rC45LmF562+5ZCN44CCPC9kaXY+Jzt9CiAgICBlbHNlIGlmKG09PT0iZW50ZXJwcmlzZSIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuWmgumBh+OAjOacquWPl+S/oeS7u+eahOW8gOWPkeiAheOAje+8jOivt+WcqCDorr7nva4g4oaSIOmAmueUqCDihpIgVlBO5LiO6K6+5aSH566h55CGIOS/oeS7u+WvueW6lOS8geS4muivgeS5puOAgjwvZGl2Pic7fQogICAgZWxzZSBpZihtPT09InRyb2xsc3RvcmUiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7lt7LpgJrov4cgVHJvbGxTdG9yZSDlronoo4XvvIzmsLjkuYXmnInmlYjjgIHkuI3mgJXmjonnrb7vvIzml6DpnIDnlLXohJHnu63nrb7jgII8L2Rpdj4nO30KICB9CiAgaWYoYm94KWJveC5pbm5lckhUTUw9aHRtbDsKfQovKiA9PT09PT09PT09PT09PT09PSDlsI/nu4Tku7bovabovobpgInmi6kgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gd2lkZ2V0QWNjT3B0aW9ucygpewogIGNvbnN0IGxpc3Q9U1RBVEUuZGF0YXx8W107CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiAnPG9wdGlvbiB2YWx1ZT0iIj7mmoLml6DotKblj7fmlbDmja7vvIjor7flhYjlnKjpppbpobXliLfmlrDliqDovb3vvIk8L29wdGlvbj4nOwogIHJldHVybiBsaXN0Lm1hcCgoYSxpKT0+ewogICAgY29uc3Qgbm09ZXNjKChhLnZlaGljbGUmJihhLnZlaGljbGUudmVoaWNsZU5hbWV8fGEudmVoaWNsZS52ZWhpY2xlVHlwZSkpfHxhLnVzZXJOYW1lfHwoIui0puWPtyIrKGkrMSkpKTsKICAgIHJldHVybiAnPG9wdGlvbiB2YWx1ZT0iJytlc2MoYS51c2VySWR8fCIiKSsnIiBkYXRhLWk9IicraSsnIj4nK25tKyc8L29wdGlvbj4nOwogIH0pLmpvaW4oIiIpOwp9CmZ1bmN0aW9uIHdpZGdldFZlaE9wdGlvbnModWlkKXsKICBjb25zdCBsaXN0PVNUQVRFLmRhdGF8fFtdOwogIGNvbnN0IGE9bGlzdC5maW5kKHg9PlN0cmluZyh4LnVzZXJJZHx8IiIpPT09U3RyaW5nKHVpZCkpOwogIGlmKCFhfHwhYS52ZWhpY2xlfHwhYS52ZWhpY2xlLmhhc1ZlaGljbGUpcmV0dXJuICc8b3B0aW9uIHZhbHVlPSIiPuivpei0puWPt+aaguaXoOe7keWumui9pui+hjwvb3B0aW9uPic7CiAgY29uc3Qgdj1hLnZlaGljbGU7CiAgY29uc3QgYXJyPShBcnJheS5pc0FycmF5KHYudmVoaWNsZXMpJiZ2LnZlaGljbGVzLmxlbmd0aCk/di52ZWhpY2xlcy5tYXAoeD0+KHtuYW1lOngudmVoaWNsZVR5cGV8fHgubmFtZXx8eC52aW5Obyx2aW46eC52aW5Ob30pKTpbe25hbWU6di52ZWhpY2xlVHlwZXx8di52ZWhpY2xlTmFtZXx8di52aW5Obyx2aW46di52aW5Ob31dOwogIHJldHVybiBhcnIubWFwKHg9Pic8b3B0aW9uIHZhbHVlPSInK2VzYyh4LnZpbikrJyI+Jytlc2MoeC5uYW1lKSsnPC9vcHRpb24+Jykuam9pbigiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0QWNjQ2hhbmdlZCgpewogIGNvbnN0IHNlbD1lbCgid2lkZ2V0X2FjYyIpO2lmKCFzZWwpcmV0dXJuOwogIGVsKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMoc2VsLnZhbHVlfHwiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0U2VsZWN0aW9uVGV4dCgpewogIGNvbnN0IGFjYz1lbCgid2lkZ2V0X2FjYyIpLHZlaD1lbCgid2lkZ2V0X3ZlaCIpOwogIGlmKCFhY2N8fCF2ZWh8fCFhY2MudmFsdWV8fCF2ZWgudmFsdWUpcmV0dXJuICIiOwogIHJldHVybiBhY2MudmFsdWUrInwiK3ZlaC52YWx1ZTsKfQovKiA9PT09PT09PT09PT09PT09PSDoh6rlrprkuYnog4zmma8gPT09PT09PT09PT09PT09PT0gKi8KbGV0IF9fYmdEYXRhPSIiOwpmdW5jdGlvbiBiZ0ZpbGVDaGFuZ2VkKGlucCl7CiAgY29uc3QgZj1pbnAmJmlucC5maWxlcyYmaW5wLmZpbGVzWzBdOwogIGlmKCFmKXJldHVybjsKICBpZihmLnNpemU+NioxMDI0KjEwMjQpe3RvYXN0KCLlm77niYfov4flpKfvvIjpmZAgNk1C77yJIiwiZXJyIik7aW5wLnZhbHVlPSIiO3JldHVybjt9CiAgY29uc3Qgcj1uZXcgRmlsZVJlYWRlcigpOwogIHIub25sb2FkPWZ1bmN0aW9uKCl7X19iZ0RhdGE9ci5yZXN1bHQ7Y29uc3QgcD1lbCgiYmdQcmV2aWV3Iik7aWYocCl7cC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK19fYmdEYXRhKyIpIjtwLnRleHRDb250ZW50PSIiO310b2FzdCgi5bey6YCJ5oup5Zu+54mH77yM54K544CM5bqU55So6IOM5pmv44CN55Sf5pWIIiwiaW5mbyIpO307CiAgci5yZWFkQXNEYXRhVVJMKGYpOwp9CmZ1bmN0aW9uIGFwcGx5QmdVcGxvYWQoKXsKICBpZighX19iZ0RhdGEpe3RvYXN0KCLor7flhYjpgInmi6nlm77niYciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGM9Z2V0Q2ZnKCk7Yy5jdXN0b21CZz1fX2JnRGF0YTtzYXZlQ2ZnKGMpOwogIGFwcGx5Q3VzdG9tQmcoKTsKICBjb25zdCBpbnA9ZWwoImJnX2ZpbGUiKTtpZihpbnApaW5wLnZhbHVlPSIiOwogIF9fYmdEYXRhPSIiOwogIHRvYXN0KCLog4zmma/lt7LlupTnlKgiLCJvayIpOwp9CmZ1bmN0aW9uIHJlc2V0QmcoKXsKICBjb25zdCBjPWdldENmZygpO2MuY3VzdG9tQmc9IiI7c2F2ZUNmZyhjKTsKICBhcHBseUN1c3RvbUJnKCk7CiAgY29uc3QgcD1lbCgiYmdQcmV2aWV3Iik7aWYocCl7cC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7cC50ZXh0Q29udGVudD0i5pyq6YCJ5oupIjt9CiAgdG9hc3QoIuW3suaBouWkjem7mOiupOiDjOaZryIsImluZm8iKTsKfQpmdW5jdGlvbiBhcHBseUN1c3RvbUJnKCl7CiAgY29uc3QgYmc9Z2V0Q2ZnKCkuY3VzdG9tQmcsYj1kb2N1bWVudC5ib2R5OwogIGlmKGJnKXtiLnN0eWxlLmJhY2tncm91bmRJbWFnZT0idXJsKCIrYmcrIikiO2Iuc3R5bGUuYmFja2dyb3VuZFNpemU9ImNvdmVyIjtiLnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbj0iY2VudGVyIjtiLnN0eWxlLmJhY2tncm91bmRBdHRhY2htZW50PSJmaXhlZCI7fQogIGVsc2V7Yi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7Yi5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT0iIjtiLnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbj0iIjtiLnN0eWxlLmJhY2tncm91bmRBdHRhY2htZW50PSIiO30KfQovKiA9PT09PT09PT09PT09PT09PSDmiYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gc2VuZFNtc0NvZGUoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX3NlbmRfYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLlj5HpgIHkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zZW5kQ29kZShwaG9uZSk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTtsZXQgdD02MDtidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjsKICAgIGNvbnN0IGl2PXNldEludGVydmFsKCgpPT57dC0tO2lmKHQ8PTApe2NsZWFySW50ZXJ2YWwoaXYpO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjtidG4uZGlzYWJsZWQ9ZmFsc2U7fWVsc2UgYnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7fSwxMDAwKTsKICB9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuWPkemAgeWksei0pe+8jOivt+ajgOafpee9kee7nCIsImVyciIpO2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7fQp9CmFzeW5jIGZ1bmN0aW9uIHBob25lTG9naW5VSSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgY29kZT0oZWwoInBsX2NvZGUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGlmKCFjb2RlKXt0b2FzdCgi6K+36L6T5YWl55+t5L+h6aqM6K+B56CBIiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX2xvZ2luX2J0biIpO2J0bi5kaXNhYmxlZD10cnVlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5Lit4oCmIjsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucGhvbmVMb2dpbihwaG9uZSxjb2RlLCIiKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLnmbvlvZXmiJDlip8iLCJvayIpO3NldFRpbWVvdXQoKCk9PmxvY2F0aW9uLnJlbG9hZCgpLDEyMDApO30KICBlbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi55m75b2V5aSx6LSlIiwiZXJyIik7fQogIGJ0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leW5tua3u+WKoOi0puWPtyI7Cn0KLy8gdjIuMTQuMjEg562+5ZCN5a+G6ZKl6YWN572u6Z2i5p2/5bey5Yig6Zmk77yaYXBwL2g1L0FFUyDlr4bpkqXnm7TmjqXmsr/nlKjlvZPliY3lgLzvvIjlhoXnva7pu5jorqTvvInvvIzkuI3lho3ku47ovpPlhaXmoYbor7vlj5YKLy8gdjIuMTQuMjEg6aOO6Zmp56Gu6K6k5pS55by556qX77ya5L+d5a2Y6YWN572u5pe25rK/55So5b2T5YmNIHZlaGljbGVDb250cm9sUmlza++8jOS4jea4heepuuWQjOaEj+eKtuaAgQpmdW5jdGlvbiBjb2xsZWN0Q2ZnVUkoKXtjb25zdCBjdXI9Z2V0Q2ZnKCk7cmV0dXJue2FwcDp7YXBwSWQ6Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Y3VyLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmN1ci5oNS5hcHBTZWNyZXR9LHZlaGljbGVBZXNLZXk6Y3VyLnZlaGljbGVBZXNLZXksdmVoaWNsZUNvbnRyb2xSaXNrOmN1ci52ZWhpY2xlQ29udHJvbFJpc2ssYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjdXIuYXV0b1JlZnJlc2hTZWN8fDYwKSxzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlfHwiIixhdXRvU2lnbmluOmVsKCJhdXRvX3NpZ25pbiIpP2VsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ6ZmFsc2UsYXV0b1NpZ25pblRpbWU6KHZhbCgiY2ZnX3NpZ25pbl90aW1lIil8fCIwNzowMCIpLHZlaGljbGVNb25pdG9yOmVsKCJ2ZWhpY2xlX21vbml0b3IiKT9lbCgidmVoaWNsZV9tb25pdG9yIikuY2hlY2tlZDpmYWxzZSx3aWRnZXRWZWhpY2xlOndpZGdldFNlbGVjdGlvblRleHQoKXx8Y3VyLndpZGdldFZlaGljbGUsY3VzdG9tQmc6Y3VyLmN1c3RvbUJnLGNvbW11bml0eTp7ZW5hYmxlUG9zdDplbCgiY29tbV9wb3N0IikuY2hlY2tlZCxlbmFibGVMaWtlOmVsKCJjb21tX2xpa2UiKS5jaGVja2VkLGVuYWJsZUNvbW1lbnQ6ZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQsZW5hYmxlU2hhcmU6ZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkLGVuYWJsZURlbGV0ZTplbCgiY29tbV9kZWxldGUiKS5jaGVja2VkfX19CmZ1bmN0aW9uIHZhbChpZCl7Y29uc3QgZT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7cmV0dXJuIGU/ZS52YWx1ZToiIn0KZnVuY3Rpb24gZWwoaWQpe3JldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCl9CmFzeW5jIGZ1bmN0aW9uIHNhdmVDZmdVSSgpe2NvbnN0IGM9Y29sbGVjdENmZ1VJKCk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQ29uZmlnKGMpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKXthcHBseVJlbW90ZUNmZyhjKTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX10b2FzdCgi6YWN572u5bey5L+d5a2YIiwib2siKTtzdGFydEF1dG9SZWZyZXNoKGMuYXV0b1JlZnJlc2hTZWMpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9Ci8vIHYyLjE0LjIxIOetvuWQjeWvhumSpemdouadv+W3suWIoOmZpO+8muaBouWkjem7mOiupOaXtuWvhumSpeebtOaOpeWGmeWbnuWGhee9rum7mOiupOWAvApmdW5jdGlvbiByZXNldENmZ1VJKCl7aWYoZWwoImF1dG9fc2lnbmluIikpZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZD1mYWxzZTtpZihlbCgiY2ZnX3NpZ25pbl90aW1lIikpZWwoImNmZ19zaWduaW5fdGltZSIpLnZhbHVlPSIwNzowMCI7aWYoZWwoImNvbW1fcG9zdCIpKWVsKCJjb21tX3Bvc3QiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fbGlrZSIpKWVsKCJjb21tX2xpa2UiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fY29tbWVudCIpKWVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fc2hhcmUiKSllbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9kZWxldGUiKSllbCgiY29tbV9kZWxldGUiKS5jaGVja2VkPXRydWU7Y29uc3QgYz1nZXRDZmcoKTtjLmFwcD17YXBwSWQ6REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fTtjLmg1PXthcHBJZDpERUZBVUxUX0NGRy5oNS5hcHBJZCxhcHBTZWNyZXQ6REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fTtjLnZlaGljbGVBZXNLZXk9REVGQVVMVF9DRkcudmVoaWNsZUFlc0tleTtjLnZlaGljbGVDb250cm9sUmlzaz0iIjtjLndpZGdldFZlaGljbGU9IiI7Yy5jdXN0b21CZz0iIjtzYXZlQ2ZnKGMpO2FwcGx5Q3VzdG9tQmcoKTtpZihlbCgid2lkZ2V0X2FjYyIpKXtlbCgid2lkZ2V0X2FjYyIpLnZhbHVlPSIiO2VsKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPSIiO31jb25zdCBicD1lbCgiYmdQcmV2aWV3Iik7aWYoYnApe2JwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjticC50ZXh0Q29udGVudD0i5pyq6YCJ5oupIjt9dG9hc3QoIuW3suaBouWkjem7mOiupO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX0KZnVuY3Rpb24gYWRkQWNjb3VudFVJKCl7Y2ZnQWNjb3VudHMucHVzaCh7dXNlck5hbWU6IiIsdXNlcklkOiIiLHRva2VuOiIiLGJhcmtLZXk6IiJ9KTtjb25zdCBsaXN0PWVsKCJhY2NMaXN0Iik7Y29uc3QgaWR4PWNmZ0FjY291bnRzLmxlbmd0aC0xO2NvbnN0IGh0bWw9JzxkaXYgY2xhc3M9ImFjYy1lZGl0IiBkYXRhLWk9IicraWR4KyciPjxkaXYgY2xhc3M9ImFjYy1lZGl0LWhlYWQiPjxzcGFuIGNsYXNzPSJhY2MtZWRpdC10aXRsZSI+PHNwYW4gY2xhc3M9Im4iPicrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPui0puWPtyAnK1N0cmluZyhpZHgrMSkrJ++8iOaWsO+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iYWN0cyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBpZD0idWlkQnRuXycraWR4KyciIG9uY2xpY2s9ImZldGNoVXNlcklkVUkoJytpZHgrJykiPuiOt+WPlklEPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIGRhbmdlciIgb25jbGljaz0iZGVsZXRlQWNjb3VudFVJKCcraWR4KycpIj7liKDpmaQ8L2J1dHRvbj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mmLXnp7A8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX25hbWVfJytpZHgrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i55WZ56m65Y+v54K544CM6I635Y+WSUTjgI0iPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW48L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3Rva2VuXycraWR4KyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+JztpZihsaXN0LnF1ZXJ5U2VsZWN0b3IoIi5hY2MtZWRpdCIpfHxsaXN0LnF1ZXJ5U2VsZWN0b3IoIltzdHlsZSo9J3RleHQtYWxpZ24nXSIpKXtsaXN0Lmluc2VydEFkamFjZW50SFRNTCgiYmVmb3JlZW5kIixodG1sKX1lbHNle2xpc3QuaW5uZXJIVE1MPWh0bWx9fQpmdW5jdGlvbiBkZWxldGVBY2NvdW50VUkoaWR4KXtjb25zdCByb3c9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFjYy1lZGl0W2RhdGEtaT0iJytpZHgrJyJdJyk7aWYocm93KXtyb3cucmVtb3ZlKCk7Y2ZnQWNjb3VudHMuc3BsaWNlKGlkeCwxKTt0b2FzdCgi5bey5Yig6Zmk77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfX0KZnVuY3Rpb24gY29sbGVjdEFjY291bnRzVUkoKXtjb25zdCByb3dzPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNhY2NMaXN0IC5hY2MtZWRpdCIpO2NvbnN0IGxpc3Q9W107cm93cy5mb3JFYWNoKHJvdz0+e2NvbnN0IGk9cm93LmdldEF0dHJpYnV0ZSgiZGF0YS1pIik7Y29uc3QgdG9rZW49ZWwoImFjY190b2tlbl8iK2kpPy52YWx1ZXx8IiI7aWYodG9rZW4udHJpbSgpKXtsaXN0LnB1c2goe3VzZXJOYW1lOmVsKCJhY2NfbmFtZV8iK2kpPy52YWx1ZXx8IiIsdXNlcklkOmVsKCJhY2NfdWlkXyIraSk/LnZhbHVlfHwiIix0b2tlbjpjbGVhblRva2VuKHRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShlbCgiYWNjX2JhcmtfIitpKT8udmFsdWV8fCIiKX0pfX0pO3JldHVybiBsaXN0fQphc3luYyBmdW5jdGlvbiBzYXZlQWNjb3VudHNVSSgpe2NvbnN0IGxpc3Q9Y29sbGVjdEFjY291bnRzVUkoKS5tYXAoYT0+KHt1c2VyTmFtZTooYS51c2VyTmFtZXx8IiIpLnRyaW0oKSx1c2VySWQ6KGEudXNlcklkfHwiIikudHJpbSgpLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5KX0pKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVBY2NvdW50cyhsaXN0KTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSlTVEFURS5wYW5lbEFjY291bnRzPWxpc3Q7dG9hc3QoIuaegeaguOi0puWPt+W3suS/neWtmCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hVc2VySWRVSShpZHgpe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oZWwoImFjY190b2tlbl8iK2lkeCk/LnZhbHVlfHwiIik7Y29uc3QgYnRuPWVsKCJ1aWRCdG5fIitpZHgpO2lmKCF0b2tlbil7dG9hc3QoIuivt+WFiOWhq+WGmSBUb2tlbiIsImVyciIpO3JldHVybn1idG4udGV4dENvbnRlbnQ9IuiOt+WPluS4reKApiI7YnRuLmRpc2FibGVkPXRydWU7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldFVzZXJpZCh0b2tlbik7aWYoZCYmZC5vayYmZC51c2VySWQpe2lmKGVsKCJhY2NfdWlkXyIraWR4KSllbCgiYWNjX3VpZF8iK2lkeCkudmFsdWU9ZC51c2VySWQ7aWYoZC51c2VyTmFtZSYmZWwoImFjY19uYW1lXyIraWR4KSYmIWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWUpZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZT1kLnVzZXJOYW1lO3RvYXN0KCLojrflj5bmiJDlip/vvJoiKyhkLnVzZXJOYW1lfHxkLnVzZXJJZCksIm9rIil9ZWxzZXt0b2FzdCgi6I635Y+W5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5pyq55+l6ZSZ6K+vIiksImVyciIpfWJ0bi50ZXh0Q29udGVudD0i6I635Y+WSUQiO2J0bi5kaXNhYmxlZD1mYWxzZX0KCi8qID09PT09PT09PT09PT09PT09IOWkh+S7vSAvIOaBouWkjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBleHBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsKXt0b2FzdCgi55WM6Z2i5pyq5bCx57uqIiwiZXJyIik7cmV0dXJufWVsLnZhbHVlPSLnlJ/miJDkuK3igKYiO0JhY2tlbmQuYmFja3VwKCkudGhlbihkPT57aWYoZCYmZC5vayl7ZWwudmFsdWU9SlNPTi5zdHJpbmdpZnkoZCxudWxsLDIpO3RvYXN0KCLlpIfku73lt7LnlJ/miJDvvIzlj6/lpI3liLbkv53lrZgiLCJvayIpfWVsc2V7ZWwudmFsdWU9IiI7dG9hc3QoIuWvvOWHuuWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuaXoOazlei/nuaOpeiEmuacrOWQjuerryIpLCJlcnIiKX19KX0KZnVuY3Rpb24gY29weUJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZSl7dG9hc3QoIuivt+WFiOeCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjSIsImVyciIpO3JldHVybn1pZihuYXZpZ2F0b3IuY2xpcGJvYXJkJiZuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCl7bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZWwudmFsdWUpLnRoZW4oKCk9PnRvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpLCgpPT57ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX0pfWVsc2V7ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX19CmZ1bmN0aW9uIGltcG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZS50cmltKCkpe3RvYXN0KCLor7flhYjnspjotLTlpIfku73lhoXlrrkiLCJlcnIiKTtyZXR1cm59Y29uZmlybURpYWxvZygi5oGi5aSN5aSH5Lu9Iiwi5bCG6KaG55uW5b2T5YmN5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5q2k5pON5L2c5LiN5Y+v5pKk6ZSA44CCIiwiaW1wb3J0QmFja3VwTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGltcG9ydEJhY2t1cE5vdygpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7Y29uc3Qgdj1lbD9lbC52YWx1ZS50cmltKCk6IiI7aWYoIXYpe3RvYXN0KCLlpIfku73lhoXlrrnkuLrnqboiLCJlcnIiKTtyZXR1cm59Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnJlc3RvcmVCYWNrdXAodik7aWYoZCYmZC5vayl7dG9hc3QoIuaBouWkjeaIkOWKn++8miIrKGQuY291bnR8fDApKyIg5Liq6LSm5Y+3Iiwib2siKTtpZihpc1Byb3h5TW9kZSgpKXtTVEFURS5wYW5lbEFjY291bnRzPVtdO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfVNUQVRFLmRhdGE9W107cmVuZGVyQ2ZnKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLmgaLlpI3lpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLlpIfku73lhoXlrrnmoLzlvI/plJnor68iKSwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDmvJTnpLrmlbDmja7vvIg/ZGVtbyDpooTop4jnlKjvvIzkuI3ogZTnvZHvvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gaXNEZW1vKCl7cmV0dXJuIGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTB9CmZ1bmN0aW9uIGRlbW9DYWwoKXsKICBjb25zdCBub3c9bmV3IERhdGUoKSx5PW5vdy5nZXRGdWxsWWVhcigpLG09bm93LmdldE1vbnRoKCkrMSxkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKSxwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIiksb3V0PVtdOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9eSsiLSIrcChtKSsiLSIrcChkKTsKICAgIGlmKGRzPnkrIi0iK3AobSkrIi0iK3Aobm93LmdldERhdGUoKSkpYnJlYWs7CiAgICBpZihkPT09M3x8ZD09PTExKWNvbnRpbnVlOyAgICAgICAgICAvLyDmvJTnpLrvvJrkuKTlpKnmvI/nrb4KICAgIG91dC5wdXNoKHtjcmVhdGVEYXRlOmRzLHNpZ25TdGF0dWU6NX0pOwogIH0KICByZXR1cm4gb3V0Owp9CmNvbnN0IERFTU9fSU5URUdSQUw9e29rOnRydWUsdG90YWw6e2ludGVncmFsVG90YWw6IjEyLDg4MCJ9LGV4cGlyZTpbe2ludGVncmFsU2NvcmU6MzIwLGV4cGlyeURhdGVTdHI6IjIwMjYtMTItMzEifV0sZGV0YWlsOlsKICB7bmFtZToi5q+P5pel562+5YiwIixpbnRlZ3JhbFNjb3JlOjYsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuuWPkeW4liIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrngrnotZ4iLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy65YiG5LqrIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuebsuebkuWlluWKsSIsaW50ZWdyYWxTY29yZTo2LG15RGF0ZVN0cjoiMjAyNi0wOS0yOCAwNzowMCJ9LAogIHtuYW1lOiLooaXnrb7mtojogJciLGludGVncmFsU2NvcmU6LTEsbXlEYXRlU3RyOiIyMDI2LTA5LTI3IDIxOjEwIn0KXX07CmNvbnN0IERFTU9fU1VQUExFTUVOVD17Y291bnQ6e29rOnRydWUsZGF0YTp7Y291bnQ6MixjYXJkTnVtOjJ9fSxtb250aDp7b2s6dHJ1ZSxkYXRhOntub3dTaWduRGV0YWlsVm9zOltdfX19Owpjb25zdCBERU1PX01PTklUT1I9e29rOnRydWUsc25hcHNob3Q6e3ZpbjoiTEI3Sk0xQzEwTkEwMDAwMDEiLHNvYzo3NixyYW5nZTo2Myx2b2x0YWdlOjg0LjUsY3VycmVudDowLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGhlYWRMb2NrOiIxIixvZmZsaW5lOmZhbHNlLHJlZnJlc2hUaW1lOiIyMDI2LTA5LTI5IDAzOjEwIixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsYmF0dGVyeVRlbXA6MjYsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixhZGRyZXNzOiLnpo/lu7rnnIHlroHlvrfluILolYnln47ljLrkuJzkvqjlvIDlj5HljLoiLHNlcnZpY2VFbmREYXRlOiIyMDI3LTAzLTE4In0sCiAgdmVoaWNsZXM6W3t2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVUeXBlOiJBRTQgTUFYMisifSx7dmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZVR5cGU6IkFFNiJ9XX07CmNvbnN0IERFTU9fQ1RSTF9PUFRTPXtvazp0cnVlLGNoYXJnZVBvd2VyOlt7a2V5OiI0MDAifSx7a2V5OiI4MDAifSx7a2V5OiIxMDAwIn1dLGdlYXJzOlsiMjUiLCI0NSIsIjYwIl19Owpjb25zdCBERU1PX0lORk89e29rOnRydWUsdW5yZWFkOnt0b3RhbDozfSxwcml6ZVJlY29yZHM6e3JlY29yZHM6W3twcml6ZXNOYW1lOiLnp6/liIYgKzYiLGNyZWF0ZVRpbWU6IjIwMjYtMDktMjggMDc6MDAiLGludGVncmFsOjZ9LHtwcml6ZXNOYW1lOiLooaXnrb7ljaEgw5cxIixjcmVhdGVUaW1lOiIyMDI2LTA5LTIxIDA3OjAwIn1dfSxjb3Vwb25zOntyZWNvcmRzOlt7fSx7fSx7fV19LG90YTpbXX07Ci8qIHYyLjE2LjAg6aqR6KGM5ryU56S65pWw5o2u77ya5ZCI5oiQ6L2o6L+577yI56Gu5a6a5oCn55Sf5oiQ77yJ77yM5pyI5bqm6K6w5b2V5LiO6L2o6L+55omr5o+P57uT5p6c5L+d5oyB5LiA6Ie0ICovCmZ1bmN0aW9uIGRlbW9UcmFjayhzZWVkLHN0ZXBzLGRheSl7CiAgbGV0IHM9c2VlZD4+PjA7CiAgbGV0IGxvbj0xMTkuNTUwOSxsYXQ9MjYuNjY1NCxoZGc9NDUsb3V0PVtdOwogIGNvbnN0IGQwPW5ldyBEYXRlKCk7ZDAuc2V0RGF0ZShkYXkpO2QwLnNldEhvdXJzKDE0LDIwLDAsMCk7CiAgY29uc3QgdDA9ZDAuZ2V0VGltZSgpKyhzZWVkJTEzKSo2MDAwMDsKICBmb3IobGV0IGk9MDtpPHN0ZXBzO2krKyl7CiAgICBjb25zdCBwaD1pL3N0ZXBzOwogICAgY29uc3QgdGFyZ2V0PTQ1KzUwKk1hdGguc2luKHBoKk1hdGguUEkqMi42KSsxNCpNYXRoLnNpbihwaCpNYXRoLlBJKjYuMysoc2VlZCU3KSk7CiAgICBoZGc9aGRnKyh0YXJnZXQtaGRnKSowLjMyOwogICAgbGV0IHY9MzQrMTMqTWF0aC5zaW4ocGgqTWF0aC5QSSozLjMrKHNlZWQlNSkpKzEuNSpNYXRoLnNpbihwaCpNYXRoLlBJKjE3KTsKICAgIGlmKGk+TWF0aC5mbG9vcihzdGVwcyowLjYwKSYmaTxNYXRoLmZsb29yKHN0ZXBzKjAuNjQpKXYtPTI0OwogICAgdj1NYXRoLm1heCg2LE1hdGgubWluKDY0LHYpKTsKICAgIGNvbnN0IHJhZD1oZGcqTWF0aC5QSS8xODA7CiAgICBjb25zdCBzdGVwTT12KjEwMDAvMzYwMCoyOwogICAgbGF0Kz1zdGVwTSpNYXRoLmNvcyhyYWQpLzExMTMyMDsKICAgIGxvbis9c3RlcE0qTWF0aC5zaW4ocmFkKS8oMTExMzIwKk1hdGguY29zKGxhdCpNYXRoLlBJLzE4MCkpOwogICAgb3V0LnB1c2gobG9uLnRvRml4ZWQoNikrIiwiK2xhdC50b0ZpeGVkKDYpKyIsIit2LnRvRml4ZWQoMSkrIiwiKyh0MCtpKjIwMDApKTsKICB9CiAgcmV0dXJuIG91dC5qb2luKCImIik7Cn0KZnVuY3Rpb24gZGVtb1JpZGVEYXlzKCl7CiAgY29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgY3VyPW5vdy5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTsKICByZXR1cm4gW3tkYXlUaW1lOmN1cisiLiIrcCgxMCkscmlkZXM6W3tyaWRlSWQ6IkRFTU8tUjEiLHRyYWplY3Rvcnk6ZGVtb1RyYWNrKDExLDkwLDEwKX0se3JpZGVJZDoiREVNTy1SMiIsdHJhamVjdG9yeTpkZW1vVHJhY2soMjMsNzAsMTApfV19LAogICAgICAgICAge2RheVRpbWU6Y3VyKyIuIitwKDgpLHJpZGVzOlt7cmlkZUlkOiJERU1PLVIzIix0cmFqZWN0b3J5OmRlbW9UcmFjayg3LDExMCw4KX1dfV07Cn0KZnVuY3Rpb24gZGVtb1JpZGVUcmFjayhwYWdlKXsKICBpZihwYWdlJiZwYWdlPjEpcmV0dXJue29rOnRydWUscGFnZTpwYWdlLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsZGF5czpbXX07CiAgcmV0dXJue29rOnRydWUscGFnZToxLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsZGF5czpkZW1vUmlkZURheXMoKS5tYXAoZD0+KHtkYXlUaW1lOmQuZGF5VGltZSxoaXN0b3J5TGlzdDpkLnJpZGVzfSkpfTsKfQpmdW5jdGlvbiBkZW1vUmlkZU1vbnRoKG1vbnRoKXsKICBjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCBjdXI9bm93LmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgcD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpOwogIGlmKG1vbnRoJiZtb250aCE9PWN1cilyZXR1cm57b2s6dHJ1ZSxtb250aDptb250aCx2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLGRhdGE6e3JpZGVNaWxlYWdlVG90YWw6MCxyaWRlUmVjb3JkTGlzdDpbXX19OwogIGNvbnN0IHNjYW49cmlkZURheVNjYW4oZGVtb1JpZGVUcmFjaygxKS5kYXlzKTsKICBjb25zdCBtaz0oZCxleHRyYSk9PnsKICAgIGNvbnN0IGM9c2NhbltkXXx8bnVsbDsKICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtkYXRlOmQsCiAgICAgIHJpZGVNaWxlYWdlOihjJiZjLmttPjApP2Mua20udG9GaXhlZCgxKToiMCIsCiAgICAgIHJpZGluZ1RpbWVEYXlVbml0TWludXRlOihjJiZjLmR1cj4wKT9TdHJpbmcoTWF0aC5yb3VuZChjLmR1cikpOiIwIiwKICAgICAgbWF4U3BlZWQ6KGMmJmMubWF4Vj4wKT9TdHJpbmcoTWF0aC5yb3VuZChjLm1heFYpKToiMCIsCiAgICAgIGFjY2VsZXJhdGlvblRpbWVzRGF5OiIwIixicmFrZXNUaW1lc0RheToiMCIsYmVuZGluZ1RpbWVzRGF5OiIwIn0sZXh0cmF8fHt9KTsKICB9OwogIGNvbnN0IHJlY29yZHM9WwogICAge2RhdGU6Y3VyKyIuIitwKDMpLHJpZGVNaWxlYWdlOiIxMi40IixyaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZToiNDYiLG1heFNwZWVkOiI1OCIsYWNjZWxlcmF0aW9uVGltZXNEYXk6IjEiLGJyYWtlc1RpbWVzRGF5OiIwIixiZW5kaW5nVGltZXNEYXk6IjAifSwKICAgIHtkYXRlOmN1cisiLiIrcCg1KSxyaWRlTWlsZWFnZToiOC44IixyaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZToiMzEiLG1heFNwZWVkOiI1MiIsYWNjZWxlcmF0aW9uVGltZXNEYXk6IjAiLGJyYWtlc1RpbWVzRGF5OiIxIixiZW5kaW5nVGltZXNEYXk6IjQifSwKICAgIG1rKGN1cisiLiIrcCg4KSksCiAgICBtayhjdXIrIi4iK3AoMTApLHthY2NlbGVyYXRpb25UaW1lc0RheToiMSJ9KQogIF07CiAgcmV0dXJue29rOnRydWUsbW9udGg6Y3VyLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsdmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsZGF0YTp7cmlkZU1pbGVhZ2VUb3RhbDoyNjguNSxyaWRlUmVjb3JkTGlzdDpyZWNvcmRzfX07Cn0KY29uc3QgREVNT19EQVRBPVsKe3VzZXJOYW1lOiLpmL/ms70iLHVzZXJJZDoiMjAyNTEwMDkxMjM0NTY3OCIsc2NvcmU6MTI4ODAsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NDIsdG9kYXlTY29yZToxMixzaWduQ291bnQ6MzYsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGJhdHRlcnlQZXJjZW50Ojc2LHJlc2lkdWFsUmFuZ2VLbTo2MyxyYW5nZUVzdGltYXRlZDpmYWxzZSxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjg0LjUsY3VycmVudDowLGJhdHRlcnlUZW1wOjI2LGZyb250UHJlc3N1cmU6IjIuMzViYXIiLHJlYXJQcmVzc3VyZToiMi40MGJhciIsZnJvbnRUZW1wOiIzMcKwQyIscmVhclRlbXA6IjMywrBDIix0b2RheURpc3RhbmNlOjEyLjYsdG9kYXlEdXJhdGlvbjozNCx0b2RheU1heFNwZWVkOjU2LGxhc3RSaWRlTWlsZWFnZTo4LjIsdG90YWxNaWxlYWdlOjI3MTA1LjIseWVzdGVyZGF5RGlzdGFuY2U6ODguNCxvbmxpbmU6IjEiLHBvd2VyU3RhdHVzOiIwIixsb2NrU3RhdGU6IjEiLGN1c2hpb25TdGF0ZToiMCIsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6Iixsb2NhdGlvblRpbWU6IjA4OjEyIixsb25naXR1ZGU6MTE5LjU1MDksbGF0aXR1ZGU6MjYuNjY1NCxzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9fSwKe3VzZXJOYW1lOiLlsI/mu6EiLHVzZXJJZDoiMjAyNjAxMDExMTIyMzM0NCIsc2NvcmU6NTIwLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czozLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6OSx0b2tlblZhbGlkOmZhbHNlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIixiYXR0ZXJ5UGVyY2VudDoyMyxyZXNpZHVhbFJhbmdlS206MjAscmFuZ2VFc3RpbWF0ZWQ6dHJ1ZSxjaGFyZ2VTdGF0ZToi5YWF55S15LitIix2b2x0YWdlOjg2LjIsY3VycmVudDo1LjQsYmF0dGVyeVRlbXA6MzEsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCxjdXJyZW50VmluOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZXM6W3tuYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIifSx7bmFtZToiQUU1aVByb01heCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAzIn1dLGZyb250UHJlc3N1cmU6IjIuMTBiYXIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsb25saW5lOiIwIixwb3dlclN0YXR1czoiMSIsbG9ja1N0YXRlOiIwIixjdXNoaW9uU3RhdGU6IjEiLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIixzZXJ2aWNlRW5kRGF0ZToiIn19LAp7dXNlck5hbWU6Imx15bCP5Y+3Iix1c2VySWQ6IjIwMjYwOTI1MDAwOTQxMjgzIixzY29yZToxMTUsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NCx0b2RheVNjb3JlOjQsc2lnbkNvdW50OjQsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6ZmFsc2V9fQpdOwpjb25zdCBERU1PX0xPR1M9Wwp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxMiIsdHlwZToic2lnbmluIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjEyLHNpZ25pblNjb3JlOjYsYmxpbmRCb3hTY29yZTo2LGludGVyYWN0U2NvcmU6MCxjb250aW51ZURheXM6NDIsc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzYgKOenr+WIhikiLCLnm7Lnm5LmnKrop6PplIEoMzYvMzApIl19LAp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxNSIsdHlwZToic2lnbmluIix1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acnyIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfSwKe3RpbWU6IjIwMjYtMDktMDkgMjI6MzE6MDUiLHR5cGU6InZlaGljbGUiLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSxhY3Rpb25UZXh0OiLkupHnq6/lvIDplIEiLG1lc3NhZ2U6IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSIsc3RlcHM6W119Cl07CgovKiA9PT09PT09PT09PT09PT09PSDliLfmlrAgJiDliJ3lp4vljJYgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvYWRpbmc9ZmFsc2U7Ci8vIOWFpeWcuumXquWxj++8mumhtemdouWPr+S6pOS6ku+8iOmqqOaetuWxj+W3sua4suafk++8ieWNs+aSpOS4i++8jOS4jeWGjeetiee9kee7nOaVsOaNru+8m+aVsOaNruWIsOi+vuWQjuWGjeWhq+WFhQpmdW5jdGlvbiBoaWRlU3BsYXNoKCl7Y29uc3Qgcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3BsYXNoIik7aWYoIXMpcmV0dXJuO3MuY2xhc3NMaXN0LmFkZCgib3V0Iik7c2V0VGltZW91dCgoKT0+e2lmKHMucGFyZW50Tm9kZSlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocyl9LDQ1MCl9CmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBbGwoc2lsZW50KXsKICBpZihsb2FkaW5nKXJldHVybjtsb2FkaW5nPXRydWU7CiAgaWYoIXNpbGVudCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7aWYoIVNUQVRFLmRhdGEubGVuZ3RoKWVsLmlubmVySFRNTD1za2VsZXRvbkhvbWUoKX0KICBoaWRlU3BsYXNoKCk7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldERhc2hib2FyZCgpOwogIGxvYWRpbmc9ZmFsc2U7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg56ev5YiG6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBQVD17YWNjSWR4OjAsbW9udGg6IiIsbW9udGhTZXREYXk6IiJ9OwpmdW5jdGlvbiBwdEFjY291bnRzKCl7cmV0dXJuIFNUQVRFLmRhdGEmJlNUQVRFLmRhdGEubGVuZ3RoP1NUQVRFLmRhdGE6KFNUQVRFLnBhbmVsQWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwi6LSm5Y+3Iix1c2VySWQ6YS51c2VySWR8fCIifSkpfQpmdW5jdGlvbiBhY2NDaGlwc0h0bWwocHJlZml4KXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuIiI7CiAgY29uc3QgY3VyPXByZWZpeD09PSJwdCI/UFQuYWNjSWR4OihwcmVmaXg9PT0icnQiP1JULmFjY0lkeDpWSC5hY2NJZHgpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNoaXBzIj4nK2xpc3QubWFwKChhLGkpPT4nPGJ1dHRvbiBjbGFzcz0iYWNjLWNoaXAgJysoaT09PWN1cj8nb24nOicnKSsnIiBvbmNsaWNrPSJwaWNrQWNjKFwnJytwcmVmaXgrJ1wnLCcraSsnKSI+Jytlc2MoYS51c2VyTmFtZXx8KCLotKblj7ciKyhpKzEpKSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpKyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIHBpY2tBY2MocHJlZml4LGkpe2lmKHByZWZpeD09PSJwdCIpe1BULmFjY0lkeD1pO3JlbmRlclBvaW50cygpfWVsc2UgaWYocHJlZml4PT09InJ0Iil7UlQuYWNjSWR4PWk7UlQudHJhY2tzPW51bGw7UlQudHJhY2tzQXQ9IiI7UlQudHJhY2tzUmlkZXM9MDtSVC50cmFja3NEYXlzPTA7UlQuc2NhbkVycj0iIjtSVC52aW49IiI7cmVuZGVyUmlkZVBhZ2UoKX1lbHNle1ZILmFjY0lkeD1pO1ZILnZpbj0iIjtyZW5kZXJWZWhpY2xlUGFnZSgpfX0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUG9pbnRzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VQb2ludHMiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFBULmFjY0lkeD49bGlzdC5sZW5ndGgpUFQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3np6/liIbmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICAvLyB2Mi4xNC4yMCDml6Xljobot6jmnIjkv67mraPvvJrpnaLmnb/luLjpqbvml7YgUFQubW9udGgg5Y+v6IO95rue55WZ5LiK5pyI44CC6Leo5Yiw5paw5pyI5Lu977yI5LuK5aSp5LiN5piv6K6+572u6K+l5pyI5Lu96YKj5aSp77yJ5ZCO6Ieq5Yqo5Zue5Yiw5b2T5YmN5pyI77yMCiAgLy8g6YG/5YWNIDEw5pyIMeWPtyDml7bml6Xljobku43lgZzlnKggOeaciDMw5Y+377yI5LiK5pyI77yJ5pi+56S65LiN5YeG56Gu44CCCiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPV9ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgX3RkeT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX25vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihQVC5tb250aCYmUFQubW9udGhTZXREYXkmJlBULm1vbnRoU2V0RGF5IT09X3RkeSYmUFQubW9udGg8X2N1ck0pe1BULm1vbnRoPSIiO1BULm1vbnRoU2V0RGF5PSIiO30KICBjb25zdCBtb250aD1QVC5tb250aHx8X2N1ck07CiAgY29uc3QgW2l0LGNhbCxjbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLDEpLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJtb250aCIsYWNjLnVzZXJJZCx7bW9udGg6bW9udGh9KSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgiY291bnQiLGFjYy51c2VySWQse30pCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJwdCIpOwogIC8vIOaAu+iniO+8iHYyLjE0LjIwIOWFvOWuuSBkYXRhIOS4uue6r+aVsOWtl+aIluWvueixoeS4pOenjei/lOWbnu+8iQogIGNvbnN0IHRvdGFsPShpdCYmaXQudG90YWwhPW51bGwpPygodHlwZW9mIGl0LnRvdGFsPT09Im51bWJlciJ8fCh0eXBlb2YgaXQudG90YWw9PT0ic3RyaW5nIiYmaXQudG90YWwhPT0iIikpP1N0cmluZyhpdC50b3RhbCk6ZGVlcFBpY2soaXQudG90YWwsWyJpbnRlZ3JhbFRvdGFsIiwidG90YWxJbnRlZ3JhbCIsInNjb3JlIiwiaW50ZWdyYWwiLCJ0b3RhbCJdLDQpKToiIjsKICBjb25zdCBjYXJkTnVtPShjbnQmJmNudC5kYXRhIT1udWxsKT8oKHR5cGVvZiBjbnQuZGF0YT09PSJudW1iZXIifHwodHlwZW9mIGNudC5kYXRhPT09InN0cmluZyImJmNudC5kYXRhIT09IiIpKT9TdHJpbmcoY250LmRhdGEpOmRlZXBQaWNrKGNudC5kYXRhLFsiY291bnQiLCJjYXJkTnVtIiwiY2FyZENvdW50IiwibnVtYmVyIiwibnVtIiwic2lnbkNvdW50Iiwic2lnblN1cHBsZW1lbnRDb3VudCIsInJlaXNzdWVDYXJkTnVtIiwic3VwcGxlbWVudENhcmROdW0iLCJjYXJkVG90YWwiLCJ0b3RhbCJdLDQpKToiIjsKICBodG1sKz0nPGRpdiBjbGFzcz0icHQtZ3JpZCI+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5b2T5YmN5oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh0b3RhbHx8Ii0tIikrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuihpeetvuWNoTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MoY2FyZE51bXx8Ii0tIikrJzwvZGl2PjxkaXYgY2xhc3M9InN1YiI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiIG9uY2xpY2s9InN1cEdhaW4oKSI+56ev5YiG5YWR5o2i6KGl562+5Y2hPC9idXR0b24+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nOwogIC8vIOebsuebkui/m+W6pu+8iHYyLjE0LjE0IOi1t+eUsemmlumhtei/geenu+iHs+atpO+8iQogIGNvbnN0IGNvbnQ9TnVtYmVyKGFjYy5jb250aW51ZURheXN8fDApOwogIGNvbnN0IGJEYXk9Y29udD09PTA/MDooKGNvbnQtMSklMzApKzE7Y29uc3QgYlJvdW5kPWNvbnQ9PT0wPzA6TWF0aC5jZWlsKGNvbnQvMzApO2NvbnN0IGJQY3Q9TWF0aC5yb3VuZCgoYkRheS8zMCkqMTAwKTsKICBodG1sKz0nPGRpdiBjbGFzcz0iYmxpbmQiIHN0eWxlPSJtYXJnaW46MCAwIDEycHgiPjxkaXYgY2xhc3M9ImJsaW5kLXRvcCI+PHNwYW4+55uy55uS6L+b5bqm77yI56ysJytiUm91bmQrJ+i9ru+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iciBudW0iPicrYkRheSsnIC8gMzAgwrcgJytiUGN0KyclIMK3IOi/nuetviAnK2NvbnQrJyDlpKk8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iYmxpbmQtYmFyIj48ZGl2IGNsYXNzPSJibGluZC1maWxsIiBzdHlsZT0id2lkdGg6JytiUGN0KyclIj48L2Rpdj48L2Rpdj48L2Rpdj4nOwogIC8vIOetvuWIsOaXpeWOhgogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNoZWNrKyfnrb7liLDml6XljoYgwrcgJytlc2MobW9udGgpKyc8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBkYXlzPShjYWwmJmNhbC5kYXRhJiZjYWwuZGF0YS5ub3dTaWduRGV0YWlsVm9zKXx8W107CiAgaWYoZGF5cy5sZW5ndGgpewogICAgaHRtbCs9Y2FsSHRtbChkYXlzLG1vbnRoLGFjYy51c2VySWQpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPicrKGNhbCYmY2FsLm1lc3NhZ2U/ZXNjKGNhbC5tZXNzYWdlKToi5pel5Y6G5Yqg6L295aSx6LSl77yI5Y+v6IO96ZmQ5rWB77yM56iN5ZCO5YaN6K+V77yJIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIHYyLjE0LjIxIOWIoOmZpOenr+WIhua1geawtO+8iOenr+WIhuivpuaDhe+8ieWMuuWdlwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7np6/liIbmlbDmja7mnaXoh6rmnoHmoLjlrp7ml7YgQVBJIMK3IOihpeetvumZkCAzMCDlpKnlhoXmvI/nrb7vvIzmr4/mrKHmtojogJcgMSDlvKDooaXnrb7ljaE8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CmZ1bmN0aW9uIGNhbEh0bWwoZGF5cyxtb250aCx1c2VySWQpewogIGNvbnN0IHltPW1vbnRoLnNwbGl0KCItIik7Y29uc3QgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKTsKICBjb25zdCBmaXJzdD1uZXcgRGF0ZSh5LG0tMSwxKS5nZXREYXkoKTsKICBjb25zdCBkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKTsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IGg9JzxkaXYgY2xhc3M9ImNhbC1ncmlkIj4nOwogIFsi5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl0uZm9yRWFjaCh3PT57aCs9JzxkaXYgY2xhc3M9ImNhbC13ZCI+Jyt3Kyc8L2Rpdj4nfSk7CiAgZm9yKGxldCBpPTA7aTxmaXJzdDtpKyspaCs9JzxkaXYgY2xhc3M9ImNhbC1kIGJsYW5rIj48L2Rpdj4nOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9bW9udGgrIi0iK1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIik7CiAgICBjb25zdCBlbnRyeT1kYXlzLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpOwogICAgY29uc3Qgc2lnbmVkPWVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCk7CiAgICBjb25zdCBpc1RvZGF5PWRzPT09dFN0cjsKICAgIGNvbnN0IGZ1dHVyZT1kcz50U3RyOwogICAgbGV0IGNscz0iY2FsLWQiKyhzaWduZWQ/IiBzaWduZWQiOihmdXR1cmU/IiBmdXR1cmUiOihlbnRyeT8iIG1pc3MiOiIiKSkpOwogICAgaWYoaXNUb2RheSljbHMrPSIgdG9kYXkiOwogICAgY29uc3QgY2xpY2thYmxlPSFzaWduZWQmJiFmdXR1cmUmJmVudHJ5OwogICAgaCs9JzxkaXYgY2xhc3M9IicrY2xzKyciICcrKGNsaWNrYWJsZT8nc3R5bGU9ImN1cnNvcjpwb2ludGVyIiBvbmNsaWNrPSJzdXBDb25zdW1lKFwnJytkcysnXCcsXCcnK2VzYyh1c2VySWQpKydcJykiJzonJykrJz4nCiAgICAgICsnPHNwYW4+JytkKyc8L3NwYW4+JwogICAgICArJzxzcGFuIGNsYXNzPSJkb3QiPicrKHNpZ25lZD8i4pyTIjooZnV0dXJlPyIiOihlbnRyeT8i5ryPIjoiIikpKSsnPC9zcGFuPicKICAgICAgKyc8L2Rpdj4nOwogIH0KICBoKz0nPC9kaXY+JzsKICBoKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+54K55Ye744CM5ryP44CN5pel5pyf5L2/55So6KGl562+5Y2h6KGl562+77yI6ZyA5YWI5pyJ6KGl562+5Y2h77yJPC9kaXY+JzsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBwdE1vbnRoU2hpZnQoZGlyKXsKICBjb25zdCBjdXI9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCItIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBQVC5tb250aD15KyItIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIC8vIOiusOW9leiuvue9ruivpeaciOS7veeahOW9k+Wkqe+8jOi3qOaciOWQjiByZW5kZXJQb2ludHMg5o2u5q2k5oqK5rue55WZ55qE5LiK5pyI6Ieq5Yqo5aSN5L2N5Yiw5b2T5YmN5pyICiAgY29uc3QgZD1uZXcgRGF0ZSgpOwogIFBULm1vbnRoU2V0RGF5PWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIHJlbmRlclBvaW50cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cENvbnN1bWUoZGF0ZSx1c2VySWQpewogIGNvbmZpcm1EaWFsb2coIuenr+WIhuihpeetviIsIuS9v+eUqCAxIOW8oOihpeetvuWNoeihpeetviAiK2RhdGUrIiDvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi6KGl562+5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImNvbnN1bWUiLHVzZXJJZCx7ZGF0ZVRpbWU6ZGF0ZX0pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuihpeetvuaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLooaXnrb7lpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOihpeetviIpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cEdhaW4oKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25maXJtRGlhbG9nKCLlhZHmjaLooaXnrb7ljaEiLCLkvb/nlKjnp6/liIblhZHmjaIgMSDlvKDooaXnrb7ljaHvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5YWR5o2i5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImdhaW4iLGFjYy51c2VySWQse30pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuWFkeaNouaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLlhZHmjaLlpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOWFkeaNoiIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi4wIOmqkeihjOmhte+8iOmakOiXj+mqkeihjOaVsOaNru+8muaegemAny/mgKXliqDpgJ8v5oCl5Yi5L+WOi+W8r++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgUlQ9e2FjY0lkeDowLG1vbnRoOiIiLG1vbnRoU2V0RGF5OiIiLHRyYWNrczpudWxsLHRyYWNrc0F0OiIiLHRyYWNrc1JpZGVzOjAsdHJhY2tzRGF5czowLHNjYW5uaW5nOmZhbHNlLHNjYW5FcnI6IiIsdmluOiIiLGRheUNhY2hlOltdfTsKZnVuY3Rpb24gcnRDdXJNb250aCgpe2NvbnN0IG49bmV3IERhdGUoKTtyZXR1cm4gbi5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobi5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKX0KZnVuY3Rpb24gcnRNb250aFNoaWZ0KGRpcil7CiAgY29uc3QgY3VyPVJULm1vbnRofHxydEN1ck1vbnRoKCk7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCIuIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBSVC5tb250aD15KyIuIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IGQ9bmV3IERhdGUoKTtSVC5tb250aFNldERheT1kLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICByZW5kZXJSaWRlUGFnZSgpOwp9CmZ1bmN0aW9uIHJ0V2Vla2RheShkayl7CiAgdHJ5e2NvbnN0IHA9U3RyaW5nKGRrfHwiIikuc3BsaXQoIi4iKTtjb25zdCBkPW5ldyBEYXRlKE51bWJlcihwWzBdKSxOdW1iZXIocFsxXSktMSxOdW1iZXIocFsyXSkpO2lmKGlzTmFOKGQuZ2V0VGltZSgpKSlyZXR1cm4iIjtyZXR1cm4gIiDlkagiK1si5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl1bZC5nZXREYXkoKV19Y2F0Y2goZSl7cmV0dXJuIiJ9Cn0KZnVuY3Rpb24gcnREYXlIdG1sKGQsaSl7CiAgY29uc3QgbWQ9U3RyaW5nKGQuZGt8fCIiKS5zcGxpdCgiLiIpOwogIGNvbnN0IGxhYmVsPW1kLmxlbmd0aD09PTM/KG1kWzFdKyIuIittZFsyXSk6U3RyaW5nKGQuZGt8fCIiKTsKICBjb25zdCBrbVR4dD1kLmttPjA/KGQua20+PTEwMD9kLmttLnRvRml4ZWQoMCk6ZC5rbS50b0ZpeGVkKDEpKSsia20iOiIiOwogIGNvbnN0IGR1clR4dD1kLmR1cj4wPyhmbXRNaW4oZC5kdXIpfHwoTWF0aC5yb3VuZChkLmR1cikrIm1pbiIpKToiIjsKICBjb25zdCBjbGljaz1kLnJpZGVzLmxlbmd0aD8nIHN0eWxlPSJjdXJzb3I6cG9pbnRlciIgb25jbGljaz0icnRSaWRlU2hlZXQoJytpKycpIic6IiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJydC1kYXkiJytjbGljaysnPicKICAgICsnPGRpdiBjbGFzcz0icnQtdG9wIj48c3BhbiBjbGFzcz0icnQtZGF0ZSI+Jytlc2MobGFiZWwpKyc8c3BhbiBjbGFzcz0id2QiPicrZXNjKHJ0V2Vla2RheShkLmRrKSkrJzwvc3Bhbj48L3NwYW4+PHNwYW4gY2xhc3M9InJ0LWttIG51bSI+Jytlc2MoW2ttVHh0LGR1clR4dF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oIiDCtyAiKXx8Ii0tIikrJzwvc3Bhbj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNoaXBzIj4nCiAgICArJzxzcGFuIGNsYXNzPSJydC1jaGlwIj7mnoHpgJ88YiBjbGFzcz0ibnVtIj4nKyhkLm1heFY+MD9NYXRoLnJvdW5kKGQubWF4Vik6Ii0tIikrJzwvYj48L3NwYW4+JwogICAgKyc8c3BhbiBjbGFzcz0icnQtY2hpcCI+5oCl5Yqg6YCfPGIgY2xhc3M9Im51bSI+JytkLmFjY2VsKyc8L2I+PC9zcGFuPicKICAgICsnPHNwYW4gY2xhc3M9InJ0LWNoaXAnKyhkLmNhbD8nIGNhbCc6JycpKyciPuaApeWIuTxiIGNsYXNzPSJudW0iPicrZC5icmFrZXMrJzwvYj48L3NwYW4+JwogICAgKyc8c3BhbiBjbGFzcz0icnQtY2hpcCcrKGQuY2FsPycgY2FsJzonJykrJyI+5Y6L5byvPGIgY2xhc3M9Im51bSI+JytkLmJlbmRzKyc8L2I+PC9zcGFuPicKICAgICsoZC5yaWRlcy5sZW5ndGg/JzxzcGFuIGNsYXNzPSJydC1jaGlwIGxpbmsiPui9qOi/uSAnK2QucmlkZXMubGVuZ3RoKycg6LafIOKAujwvc3Bhbj4nOiIiKQogICAgKyc8L2Rpdj48L2Rpdj4nOwp9CmZ1bmN0aW9uIHJ0UmlkZVNoZWV0KGkpewogIGNvbnN0IGQ9KFJULmRheUNhY2hlfHxbXSlbaV07CiAgaWYoIWR8fCFkLnJpZGVzfHwhZC5yaWRlcy5sZW5ndGgpcmV0dXJuOwogIGNvbnN0IGh0bWw9ZC5yaWRlcy5tYXAocj0+ewogICAgY29uc3Qgc3RhcnQ9ci50MHN0cj9yLnQwc3RyLnNsaWNlKDExLDE2KTooci50MD9mbXRUaW1lKG5ldyBEYXRlKHIudDApLnRvSVNPU3RyaW5nKCkpLnNsaWNlKDExLDE2KToiLS06LS0iKTsKICAgIGNvbnN0IGVuZD1yLnQxc3RyP3IudDFzdHIuc2xpY2UoMTEsMTYpOiIiOwogICAgY29uc3Qga209ci5zcnZLbT4wP3Iuc3J2S206ci5rbTsKICAgIGNvbnN0IGR1cj1yLnNydkR1cj4wP3Iuc3J2RHVyOnIuZHVyOwogICAgY29uc3QgYXZnPWR1cj4wPyhrbS8oZHVyLzYwKSk6MDsKICAgIHJldHVybiAnPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2IHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjAiPjxkaXYgY2xhc3M9Im5tIj4nK2VzYyhzdGFydCkrKGVuZD8oJyDihpIgJytlc2MoZW5kKSk6IiIpKycg6aqR6KGMPC9kaXY+JwogICAgICArKHIuYWRkcj8nPGRpdiBjbGFzcz0idG0iIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3JtYWwiPicrZXNjKHIuYWRkcikrJzwvZGl2Pic6IiIpCiAgICAgICsnPGRpdiBjbGFzcz0idG0iPicrZXNjKGttLnRvRml4ZWQoMSkpKydrbSDCtyAnK2VzYyhmbXRNaW4oZHVyKXx8KE1hdGgucm91bmQoZHVyKSsibWluIikpKycgwrcg5Z2H6YCfICcrTWF0aC5yb3VuZChhdmcpKydrbS9oIMK3IOaegemAnyAnK01hdGgucm91bmQoci5tYXhWKSsnPC9kaXY+JwogICAgICArJzxkaXYgY2xhc3M9InRtIj7mgKXliqDpgJ8gJytyLnNydkFjY2VsKycgwrcg5oCl5Yi5ICcrci5icmFrZXMrJyDCtyDljovlvK8gJytyLmJlbmRzKyfvvIjpmpDol4/nrpfms5XvvIk8L2Rpdj48L2Rpdj4nCiAgICAgICsoci50aHVtYj8nPGltZyBzcmM9IicrZXNjKHIudGh1bWIpKyciIHN0eWxlPSJ3aWR0aDo1MnB4O2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTBweDtvYmplY3QtZml0OmNvdmVyO21hcmdpbi1sZWZ0OjhweDtmbGV4LXNocmluazowIiBvbmVycm9yPSJ0aGlzLnJlbW92ZSgpIj4nOiIiKQogICAgICArJzwvZGl2Pic7CiAgfSkuam9pbigiIik7CiAgb3BlblNoZWV0KChkLmRrfHwiIikrIiDpqpHooYzmmI7nu4YiLEkubWFwLGh0bWwrJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumHjOeoiy/ml7bplb8v5p6B6YCfL+aApeWKoOmAn+S4uuacjeWKoeerr+ecn+WAvO+8iOaApeWKoOmAnz3mnI3liqHnq6/orqHmrKHvvInvvJvmgKXliLkv5Y6L5byv5Li66ZqQ6JeP566X5rOV6K6h5pWw77yI56e75qSNIFNwZWVkSHVudGVy77yM5Y+M56qX5Y+j5ZCI5bm25ZCOIMOXMi41IOagh+Wumu+8iTwvZGl2PicpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ0U2NhbigpewogIGlmKFJULnNjYW5uaW5nKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtSVC5hY2NJZHhdfHx7fTsKICBpZighYWNjLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufQogIGNvbnN0IG1vbnRoPVJULm1vbnRofHxydEN1ck1vbnRoKCk7CiAgUlQuc2Nhbm5pbmc9dHJ1ZTtSVC5zY2FuRXJyPSIiO3JlbmRlclJpZGVQYWdlKCk7CiAgdG9hc3QoIuato+WcqOaLieWPliAiK21vbnRoKyIg6L2o6L+55bm26K6h566X6ZqQ6JeP5pWw5o2u4oCmIiwiaW5mbyIpOwogIGxldCBhbGxEYXlzPVtdLHJpZGVzPTAsZXJyPSIiOwogIHRyeXsKICAgIGZvcihsZXQgcGFnZT0xO3BhZ2U8PTE1O3BhZ2UrKyl7CiAgICAgIGNvbnN0IHI9YXdhaXQgQmFja2VuZC5yaWRlVHJhY2soYWNjLnVzZXJJZCxSVC52aW58fCIiLHBhZ2UsMjAsbW9udGgpOwogICAgICBpZighcnx8IXIub2spe2Vycj0ociYmKHIuZXJyb3J8fHIubWVzc2FnZSkpfHwi5o6l5Y+j5peg5ZON5bqUIjticmVha30KICAgICAgaWYoci52aW5ObyYmIVJULnZpbilSVC52aW49ci52aW5ObzsKICAgICAgY29uc3QgZGF5cz1BcnJheS5pc0FycmF5KHIuZGF5cyk/ci5kYXlzOltdOwogICAgICBsZXQgY250PTA7CiAgICAgIGZvcihjb25zdCBkZCBvZiBkYXlzKWlmKGRkJiZBcnJheS5pc0FycmF5KGRkLmhpc3RvcnlMaXN0KSljbnQrPWRkLmhpc3RvcnlMaXN0Lmxlbmd0aDsKICAgICAgYWxsRGF5cz1hbGxEYXlzLmNvbmNhdChkYXlzKTtyaWRlcys9Y250OwogICAgICBpZihjbnQ9PT0wKWJyZWFrOwogICAgfQogIH1jYXRjaChlKXtlcnI9U3RyaW5nKGUpfQogIGlmKGFsbERheXMubGVuZ3RoKXsKICAgIFJULnRyYWNrcz1yaWRlRGF5U2NhbihhbGxEYXlzKTsKICAgIFJULnRyYWNrc0F0PWZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtSVC50cmFja3NSaWRlcz1yaWRlczsKICAgIGxldCBuRGF5cz0wO2Zvcihjb25zdCBrIGluIFJULnRyYWNrcylpZihSVC50cmFja3Nba10mJlJULnRyYWNrc1trXS5yaWRlcyYmUlQudHJhY2tzW2tdLnJpZGVzLmxlbmd0aCluRGF5cysrOwogICAgUlQudHJhY2tzRGF5cz1uRGF5czsKICAgIGlmKCFuRGF5cylSVC5zY2FuRXJyPSLmjqXlj6Plt7Lov57pgJrvvIzkvYbmnKrov5Tlm57ovajov7nmlbDmja7vvIjor6XovabmmoLml6Dljoblj7Lovajov7norrDlvZXvvIkiOwogIH1lbHNlewogICAgUlQuc2NhbkVycj1lcnJ8fCLmnKrlj5bliLDovajov7nmlbDmja7vvIjor6Xovablj6/og73msqHmnInljoblj7Lovajov7norrDlvZXvvIkiOwogIH0KICBSVC5zY2FubmluZz1mYWxzZTsKICByZW5kZXJSaWRlUGFnZSgpOwogIGlmKFJULnNjYW5FcnIpdG9hc3QoUlQuc2NhbkVyciwiZXJyIik7ZWxzZSB0b2FzdCgi6L2o6L+55omr5o+P5a6M5oiQ77yaIityaWRlcysiIOi2n+ihjOeoiyIsIm9rIik7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUmlkZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVJpZGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFJULmFjY0lkeD49bGlzdC5sZW5ndGgpUlQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUlQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicnQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPXJ0Q3VyTW9udGgoKTsKICBjb25zdCBfdGR5PV9ub3cuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhfbm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGlmKFJULm1vbnRoJiZSVC5tb250aFNldERheSYmUlQubW9udGhTZXREYXkhPT1fdGR5JiZSVC5tb250aDxfY3VyTSl7UlQubW9udGg9IiI7UlQubW9udGhTZXREYXk9IiI7fQogIGNvbnN0IG1vbnRoPVJULm1vbnRofHxfY3VyTTsKICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJydCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9vemqkeihjOaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGNvbnN0IHJlcz1hd2FpdCBCYWNrZW5kLnJpZGVNb250aChhY2MudXNlcklkLG1vbnRoLFJULnZpbnx8IiIpOwogIGlmKHJlcyYmcmVzLnZpbk5vJiYhUlQudmluKVJULnZpbj1yZXMudmluTm87CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJydCIpOwogIGlmKCFyZXN8fCFyZXMub2spewogICAgZWwuaW5uZXJIVE1MPWh0bWwrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6aqR6KGM5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nK2VzYygocmVzJiZyZXMuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+356iN5ZCO6YeN6K+VIikrJzwvcD48ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ianVzdGlmeS1jb250ZW50OmNlbnRlciI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InJlbmRlclJpZGVQYWdlKCkiPumHjeivlTwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIGNvbnN0IHJlY29yZHM9KHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJpZGVSZWNvcmRMaXN0KSk/cmVzLmRhdGEucmlkZVJlY29yZExpc3Q6W107CiAgY29uc3QgaXNDdXI9KG1vbnRoPT09X2N1ck0pOwogIC8vIOWQiOW5tui9qOi/ueiuoeeul+e7k+aenO+8mumHjOeoiy/mnoHpgJ/mnI3liqHnq6/pnZ4w5LyY5YWI44CB5Li6MOihpeeul++8m+aApeWIuS/ljovlvK/mjInovajov7nph43nrpfvvIjmnI3liqHnq6/luLjlubTkuLow77yJCiAgY29uc3QgZGF5cz1bXTsKICBmb3IoY29uc3QgcmVjIG9mIHJlY29yZHMpewogICAgaWYoIXJlY3x8dHlwZW9mIHJlYyE9PSJvYmplY3QiKWNvbnRpbnVlOwogICAgY29uc3QgZGs9cmlkZU5vcm1EYXkocmVjLmRhdGUpfHxTdHJpbmcocmVjLmRhdGV8fCIiKTsKICAgIGNvbnN0IGNvbXA9KFJULnRyYWNrcyYmZGsmJlJULnRyYWNrc1tka10pfHxudWxsOwogICAgY29uc3Qgc3J2S209cmlkZU51bShyZWMucmlkZU1pbGVhZ2UpLHNydkR1cj1yaWRlTnVtKHJlYy5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZSksc3J2TWF4PXJpZGVOdW0ocmVjLm1heFNwZWVkKTsKICAgIGRheXMucHVzaCh7CiAgICAgIGRrOmRrLAogICAgICBrbTpzcnZLbT4wP3NydkttOihjb21wP2NvbXAua206MCksCiAgICAgIGR1cjpzcnZEdXI+MD9zcnZEdXI6KGNvbXA/Y29tcC5kdXI6MCksCiAgICAgIG1heFY6c3J2TWF4PjA/c3J2TWF4Oihjb21wP2NvbXAubWF4VjowKSwKICAgICAgYWNjZWw6cmlkZU51bShyZWMuYWNjZWxlcmF0aW9uVGltZXNEYXkpLAogICAgICBicmFrZXM6Y29tcD9jb21wLmJyYWtlczpyaWRlTnVtKHJlYy5icmFrZXNUaW1lc0RheSksCiAgICAgIGJlbmRzOmNvbXA/Y29tcC5iZW5kczpyaWRlTnVtKHJlYy5iZW5kaW5nVGltZXNEYXkpLAogICAgICBjYWw6ISFjb21wLAogICAgICByaWRlczooY29tcCYmY29tcC5yaWRlcyl8fFtdCiAgICB9KTsKICB9CiAgZGF5cy5zb3J0KChhLGIpPT5TdHJpbmcoYi5kaykubG9jYWxlQ29tcGFyZShTdHJpbmcoYS5kayksInpoIikpOwogIGNvbnN0IHZpc2libGU9ZGF5cy5maWx0ZXIoZD0+ZC5rbT4wfHxkLmR1cj4wfHxkLm1heFY+MHx8ZC5hY2NlbD4wfHxkLmJyYWtlcz4wfHxkLmJlbmRzPjApOwogIFJULmRheUNhY2hlPXZpc2libGU7CiAgbGV0IHN1bUttPTAsc3VtRHVyPTAsbWF4Vj0wLHN1bUE9MCxzdW1CPTAsc3VtRD0wOwogIGZvcihjb25zdCBkIG9mIHZpc2libGUpe3N1bUttKz1kLmttO3N1bUR1cis9ZC5kdXI7aWYoZC5tYXhWPm1heFYpbWF4Vj1kLm1heFY7c3VtQSs9ZC5hY2NlbDtzdW1CKz1kLmJyYWtlcztzdW1EKz1kLmJlbmRzfQogIGNvbnN0IGR1clR4dD1zdW1EdXI+PTYwPyhNYXRoLmZsb29yKHN1bUR1ci82MCkrImgiK1N0cmluZyhNYXRoLnJvdW5kKHN1bUR1ciU2MCkpLnBhZFN0YXJ0KDIsIjAiKSsibSIpOihzdW1EdXI+MD8oTWF0aC5yb3VuZChzdW1EdXIpKyJtaW4iKToiMCIpOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLm1hcCsn6ZqQ6JeP6aqR6KGM5pWw5o2uIMK3ICcrZXNjKG1vbnRoKSsnPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icnRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJydE1vbnRoU2hpZnQoMSkiPuS4i+aciDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWdyaWQiPicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPumHjOeoizwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2Moc3VtS20+MD9zdW1LbS50b0ZpeGVkKDEpOiIwIikrJzxzcGFuIGNsYXNzPSJ1Ij5rbTwvc3Bhbj48L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ml7bplb88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKGR1clR4dCkrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuaegemAnzwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MobWF4Vj4wP1N0cmluZyhNYXRoLnJvdW5kKG1heFYpKToiLS0iKSsnPHNwYW4gY2xhc3M9InUiPmttL2g8L3NwYW4+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWdyaWQzIj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7mgKXliqDpgJ88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0gYnJhbmQiPicrc3VtQSsnPC9kaXY+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5oCl5Yi5PC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIGJyYW5kIj4nK3N1bUIrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuWOi+W8rzwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSBicmFuZCI+JytzdW1EKyc8L2Rpdj48L2Rpdj4nCiAgICArJzwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iaGludCI+5a6Y5pa5IEFwcCDmiorov5nkupvlrZfmrrXol4/kuobotbfmnaXvvIjovablnovog73lipvkvY3mjqfliLbvvInjgILmgKXliqDpgJ/mnaXoh6rmnI3liqHnq6/vvJvmgKXliLkv5Y6L5byv5Y+v54K544CM5omr5o+P6L2o6L+544CN5oyJ6aqR6KGM6L2o6L+56YeN566X44CCPC9kaXY+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5zY29vdGVyKyfmr4/ml6XorrDlvZU8L2g0PjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweCI+JwogICAgKyhSVC5zY2FubmluZz8nPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ib3BhY2l0eTouNiI+5omr5o+P5Lit4oCmPC9idXR0b24+JzonPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9InJ0U2NhbigpIj7miavmj4/ovajov7k8L2J1dHRvbj4nKQogICAgKyc8L3NwYW4+PC9kaXY+JzsKICBpZih2aXNpYmxlLmxlbmd0aCl7CiAgICBodG1sKz12aXNpYmxlLm1hcCgoZCxpKT0+cnREYXlIdG1sKGQsaSkpLmpvaW4oIiIpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPuivpeaciOaaguaXoOmqkeihjOiusOW9le+8iOaNouS4quaciOS7veaIluehruiupOi0puWPt+W3sue7keWumui9pui+hu+8iTwvZGl2Pic7CiAgfQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50Ij7ovajov7nmjInmiYDpgInmnIjku73mn6Xor6LvvIjmr4/mrKEgMjAg6Laf6Ieq5Yqo57+76aG177yM5pyA5aSaIDE1IOmhte+8iTwvZGl2Pic7CiAgaWYoUlQudHJhY2tzQXQpaHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiPuS4iuasoeaJq+aPj++8micrZXNjKFJULnRyYWNrc0F0KSsnIMK3ICcrTnVtYmVyKFJULnRyYWNrc1JpZGVzfHwwKSsnIOi2nyAvICcrTnVtYmVyKFJULnRyYWNrc0RheXN8fDApKycg5aSpPC9kaXY+JzsKICBpZihSVC5zY2FuRXJyKWh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0iY29sb3I6dmFyKC0tZXJyKSI+Jytlc2MoUlQuc2NhbkVycikrJzwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPuaVsOaNruadpea6kO+8muaegeaguCBteVJpZGVJbmZvIC8gcmlkZXRyYWNrX3YyIMK3IOWOi+W8ry/mgKXliLnnrpfms5Xnp7vmpI3oh6ogWmVlaG8gU3BlZWRIdW50ZXLvvIhBR1BMLTMuMO+8ie+8jOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7Cn0KCi8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg6L2m6L6G6aG177yI55uR5o6nICsg6L2m5o6n5omp5bGVICsg5L+h5oGv5Lit5b+D77yJID09PT09PT09PT09PT09PT09ICovCmxldCBWSD17YWNjSWR4OjAsdmluOiIiLGNwOiIiLGxvY2tUeXBlOiIxIixiczpudWxsfTsKLy8gdjIuMTYuNiDmr4/ovabni6znq4vnlLXmsaDorr7nva7vvJrlrZjlgqjnu5PmnoQgeyAiPHZpbj4iOiB7YWgsdkZ1bGwsdkVtcHR5fSB977yb5pen54mI5omB5bmz5qC85byP5Zyo6K+75Y+WL+S/neWtmOaXtui/geenu+WIsOS8oOWFpeeahCB2aW4KZnVuY3Rpb24gcmlkZUJhdHRDZmcodmluKXt0cnl7Y29uc3Qgcz1KU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCJ6aF9iYXR0X2NmZyIpfHwie30iKXx8e307aWYodHlwZW9mIHMuYWghPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkZ1bGwhPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkVtcHR5IT09InVuZGVmaW5lZCIpe2NvbnN0IG09e307aWYodmluKW1bdmluXT17YWg6TnVtYmVyKHMuYWh8fDApLHZGdWxsOk51bWJlcihzLnZGdWxsfHwwKSx2RW1wdHk6TnVtYmVyKHMudkVtcHR5fHwwKX07bG9jYWxTdG9yYWdlLnNldEl0ZW0oInpoX2JhdHRfY2ZnIixKU09OLnN0cmluZ2lmeShtKSk7cmV0dXJuIG1bdmluXXx8e307fXJldHVybiAodmluJiZzW3Zpbl0pfHx7fTt9Y2F0Y2goZSl7cmV0dXJue319fQpmdW5jdGlvbiBzYXZlQmF0dENmZygpewogIGNvbnN0IHZpbj1WSC52aW58fCIiO2lmKCF2aW4pe3RvYXN0KCLor7flhYjpgInmi6novabovoblho3kv53lrZgiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGFoPU51bWJlcigoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZoX2JhdHRfYWgiKXx8e30pLnZhbHVlfHwwKTsKICBjb25zdCB2RnVsbD1OdW1iZXIoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aF9iYXR0X3ZmdWxsIil8fHt9KS52YWx1ZXx8MCk7CiAgbGV0IHM7dHJ5e3M9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiemhfYmF0dF9jZmciKXx8Int9Iil8fHt9fWNhdGNoKGUpe3M9e319CiAgY29uc3QgbWFwPSh0eXBlb2Ygcy5haCE9PSJ1bmRlZmluZWQifHx0eXBlb2Ygcy52RnVsbCE9PSJ1bmRlZmluZWQifHx0eXBlb2Ygcy52RW1wdHkhPT0idW5kZWZpbmVkIik/e306czsKICBjb25zdCBjdXI9bWFwW3Zpbl18fHt9OwogIG1hcFt2aW5dPXthaDphaD4wP2FoOjAsdkZ1bGw6dkZ1bGw+MD92RnVsbDowLHZFbXB0eTpjdXIudkVtcHR5fHwwfTsKICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemhfYmF0dF9jZmciLEpTT04uc3RyaW5naWZ5KG1hcCkpOwogIHRvYXN0KCLnlLXmsaDorr7nva7lt7Lkv53lrZjvvIjnu5HlrprlvZPliY3ovabovobvvIkiLCJvayIpO3JlbmRlclZlaGljbGVQYWdlKCk7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVZlaGljbGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFZILmFjY0lkeD49bGlzdC5sZW5ndGgpVkguYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3ovabovobmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBsZXQgbW9uPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCwiIik7CiAgY29uc3QgdmVoTGlzdD0obW9uJiZBcnJheS5pc0FycmF5KG1vbi52ZWhpY2xlcykpP21vbi52ZWhpY2xlczpbXTsKICBpZihWSC52aW4mJm1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QmJm1vbi5zbmFwc2hvdC52aW4hPT1WSC52aW4pewogICAgY29uc3QgbW9uMj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsVkgudmluKTsKICAgIGlmKG1vbjImJm1vbjIub2spe21vbjIudmVoaWNsZXM9dmVoTGlzdDttb249bW9uMn0KICB9CiAgY29uc3QgW29wdHMsaW5mbyxic109YXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dCh7YWN0aW9uOiJvcHRpb25zIix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn0pLAogICAgQmFja2VuZC5pbmZvQ2VudGVyKGFjYy51c2VySWQsVkgudmlufHwiIiksCiAgICBCYWNrZW5kLmJhdHRlcnlTdGF0ZShhY2MudXNlcklkLFZILnZpbnx8IiIpCiAgXSk7CiAgVkguYnM9KGJzJiZicy5vayk/YnM6bnVsbDsKICBsZXQgaHRtbD1hY2NDaGlwc0h0bWwoInZoIik7CiAgLy8g5b2T5YmN5bGV56S66L2m6L6G77yIdjIuMTYuNu+8mueUteaxoOiuvue9ruaMieatpCB2aW4g54us56uL5L+d5a2Y77yb5Y2V6L2m6LSm5Y+3IFZILnZpbiDmgZLkuLrnqbrvvIzpnIDlm57loavvvIkKICBjb25zdCBjdXJWaW49VkgudmlufHwobW9uJiZtb24uc25hcHNob3Q/bW9uLnNuYXBzaG90LnZpbjoodmVoTGlzdFswXXx8e30pLnZpbk5vKXx8IiI7CiAgVkgudmluPWN1clZpbjsKICAvLyDovabovobpgInmi6nvvIjlpJrovabvvIkKICBpZih2ZWhMaXN0Lmxlbmd0aD4xKXsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJvcHQtcm93Ij4nK3ZlaExpc3QubWFwKHY9Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhjdXJWaW49PT12LnZpbk5vPydvbic6JycpKyciIG9uY2xpY2s9IlZILnZpbj1cJycrZXNjKHYudmluTm8pKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyh2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lfHx2LnZpbk5vKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7CiAgfQogIC8vIOeKtuaAgeebkeaOp+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNhcisn6L2m6L6G54q25oCBPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2hvd1ZlaGljbGVEZXRhaWwoJytWSC5hY2NJZHgrJykiPuivpuaDhTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icmVuZGVyVmVoaWNsZVBhZ2UoKSI+5Yi35pawPC9idXR0b24+PC9zcGFuPjwvZGl2Pic7CiAgaWYobW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCl7CiAgICBjb25zdCBzbj1tb24uc25hcHNob3Q7CiAgICBjb25zdCBzb2NDb2w9c24uc29jPD0yMD8idmFyKC0tZXJyKSI6c24uc29jPD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1vaykiOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnlLXph488L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6Jytzb2NDb2wrJyI+Jysoc24uc29jIT1udWxsP3NuLnNvYysiJSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnu63oiKo8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nKyhzbi5yYW5nZSE9bnVsbD9zbi5yYW5nZSsiIGttIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPum+meWktOmUgTwvc3Bhbj48c3BhbiBjbGFzcz0idiI+Jysoc24uaGVhZExvY2s9PT0iMSI/IuW3sumUgSI6IuacqumUgSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Zyo57q/54q25oCBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iY29sb3I6Jysoc24ub2ZmbGluZT8idmFyKC0tZXJyKSI6InZhcigtLW9rKSIpKyciPicrKHNuLm9mZmxpbmU/Iuemu+e6v++8iD4zMOWIhumSn+acquS4iuaKpe+8iSI6IuWcqOe6vyIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyA5ZCO5LiK5oqlPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPicrZXNjKHNuLnJlZnJlc2hUaW1lfHwiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChtb24mJihtb24uZXJyb3J8fG1vbi5tZXNzYWdlKSl8fCLlv6vnhafojrflj5blpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g6L2m6L6G5o6n5Yi25Y2h77yI5LuO6aaW6aG16L+B56e76L+H5p2l77yJCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabovobmjqfliLY8L2g0PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iY3RybC1ncmlkIj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iZmluZCIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnZmluZFwnLHRoaXMpIj4nK0kuYmVsbCsn5a+76L2mPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImxvdWRGaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb3VkRmluZFwnLHRoaXMpIj4nK0kudm9sKyfpuKPnrJs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iY3VzaGlvbiIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnY3VzaGlvblwnLHRoaXMpIj4nK0kuc2VhdCsn5Z2Q5Z6rPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biB1bmxvY2siIGRhdGEtYWN0PSJ1bmxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ3VubG9ja1wnLHRoaXMpIj4nK0kudW5sb2NrKyflvIDplIE8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIGxvY2siIGRhdGEtYWN0PSJsb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb2NrXCcsdGhpcykiPicrSS5sb2NrKyflhbPplIE8L2J1dHRvbj4nCiAgICArJzwvZGl2PjwvZGl2Pic7CiAgLy8g6L2m5o6n5omp5bGV5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabmjqfmianlsZU8L2g0PjwvZGl2Pic7CiAgY29uc3QgY3BzPShvcHRzJiZBcnJheS5pc0FycmF5KG9wdHMuY2hhcmdlUG93ZXIpKT9vcHRzLmNoYXJnZVBvd2VyOltdOwogIGlmKGNwcy5sZW5ndGgpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjRweCI+5YWF55S15Yqf546H77yIV++8iTwvZGl2PjxkaXYgY2xhc3M9Im9wdC1yb3ciPicKICAgICAgK2Nwcy5tYXAobz0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKFZILmNwPT09by5rZXk/J29uJzonJykrJyIgb25jbGljaz0iVkguY3A9XCcnK2VzYyhvLmtleSkrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrKG8ua2V5PT09IjEyMDAiPyLml6DpmZDliLYiOmVzYyhvLmtleSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdjaGFyZ2VQb3dlclwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgLy8gdjIuMTYuNSDlhYXnlLXliankvZnml7bpl7TvvIjlhYXnlLXkuK3kuJTlt7Lorr7lrrnph4/miY3mmL7npLrvvIkrIOeUteaxoOiuvue9ru+8iHYyLjE2LjYg5oyJIHZpbiDni6znq4vvvIkKICBjb25zdCBiYz1yaWRlQmF0dENmZyhjdXJWaW4pOwogIGlmKFZILmJzJiZWSC5icy5jaGFyZ2luZyYmTnVtYmVyKGJjLmFoKT4wJiZWSC5icy5zb2M+MCYmVkguYnMuc29jPDEwMCYmVkguYnMuY3VycmVudD4wLjUpewogICAgY29uc3QgcmVtYWluTWluPU1hdGgubWF4KDEsTWF0aC5yb3VuZChOdW1iZXIoYmMuYWgpKigxMDAtVkguYnMuc29jKS8xMDAvVkguYnMuY3VycmVudCo2MCkpOwogICAgY29uc3QgaGg9TWF0aC5mbG9vcihyZW1haW5NaW4vNjApLG1tPXJlbWFpbk1pbiU2MDsKICAgIGNvbnN0IG9mZlR4dD0oVkguYnMuZnVsbENoYXJnZVRpbWVTZWNvbmQ+MCk/KCIgwrcg5a6Y5pa557qmICIrTWF0aC5yb3VuZChWSC5icy5mdWxsQ2hhcmdlVGltZVNlY29uZC82MCkrIiDliIYiKToiIjsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+4o+xIOWFheeUteWJqeS9mTwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPue6piAnKygoaGg+MD9oaCsiIOaXtiAiOiIiKSttbSsiIOWIhiIpKyc8L3NwYW4+PC9kaXY+JwogICAgICArJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjJweCI+5Lyw566XICcrVkguYnMuY3VycmVudC50b0ZpeGVkKDEpKydBIMK3ICcrVkguYnMuc29jKyclIOKGkiAnKyhiYy52RnVsbD4wP2JjLnZGdWxsKyJWIjoi5YWF5ruhIikrb2ZmVHh0Kyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi10b3A6OHB4O2ZsZXgtd3JhcDp3cmFwIj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPueUteaxoOiuvue9rjwvc3Bhbj4nCiAgICArJzxpbnB1dCBpZD0idmhfYmF0dF9haCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLlrrnph48gQWgiIHZhbHVlPSInKyhiYy5haHx8IiIpKyciIHN0eWxlPSJ3aWR0aDo4NnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo4cHg7Y29sb3I6dmFyKC0tdHh0KTtwYWRkaW5nOjZweCA4cHg7Zm9udC1zaXplOjEycHgiPicKICAgICsnPGlucHV0IGlkPSJ2aF9iYXR0X3ZmdWxsIiB0eXBlPSJudW1iZXIiIGlucHV0bW9kZT0iZGVjaW1hbCIgcGxhY2Vob2xkZXI9Iua7oeeUtSBWIiB2YWx1ZT0iJysoYmMudkZ1bGx8fCIiKSsnIiBzdHlsZT0id2lkdGg6ODZweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O2NvbG9yOnZhcigtLXR4dCk7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4Ij4nCiAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2F2ZUJhdHRDZmcoKSI+5L+d5a2YPC9idXR0b24+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiPuiuvue9ruWuuemHj+WQju+8jOWFheeUteS4reiHquWKqOS8sOeul+OAjOWFheeUteWJqeS9meOAje+8iOWuuemHj8OXKDEwMOKIkueUtemHjyUpLzEwMMO35YWF55S155S15rWB77yJ77yb5q+P6L2m54us56uL5L+d5a2Y77yM5pyq6K6+572u5LiN5pi+56S6PC9kaXY+JzsKICAvLyB2Mi4xNC4yMSDliKDpmaTpmZDpgJ/moaPkvY3orr7nva4KICBodG1sKz0nPC9kaXY+JzsKICAvLyDkv6Hmga/kuK3lv4PljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5iZWxsKyfkv6Hmga/kuK3lv4M8L2g0PjwvZGl2Pic7CiAgaWYoaW5mbyYmaW5mby5vayl7CiAgICBjb25zdCB1bj1pbmZvLnVucmVhZCE9bnVsbD9kZWVwUGljayhpbmZvLnVucmVhZCxbInRvdGFsIiwiY291bnQiLCJ1blJlYWRDb3VudCIsIm51bSJdLDMpOiIiOwogICAgaWYodW4hPT0iIilodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuacquivu+a2iOaBrzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPicrZXNjKHVuKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBjb25zdCBwcml6ZXM9KGluZm8ucHJpemVSZWNvcmRzJiYoaW5mby5wcml6ZVJlY29yZHMucmVjb3Jkc3x8aW5mby5wcml6ZVJlY29yZHMubGlzdHx8aW5mby5wcml6ZVJlY29yZHMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KHByaXplcykmJnByaXplcy5sZW5ndGgpewogICAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo4cHggMCA0cHgiPuebsuebki/kuK3lpZborrDlvZU8L2Rpdj4nOwogICAgICBodG1sKz1wcml6ZXMuc2xpY2UoMCw1KS5tYXAocD0+JzxkaXYgY2xhc3M9ImZsb3ctaXRlbSI+PGRpdj48ZGl2IGNsYXNzPSJubSI+Jytlc2MocC5wcml6ZXNOYW1lfHxwLm5hbWV8fCLlpZblk4EiKSsnPC9kaXY+PGRpdiBjbGFzcz0idG0iPicrZXNjKHAuY3JlYXRlVGltZXx8cC5jcmVhdGVEYXRlfHwiIikrJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9InNjIHBsdXMiIHN0eWxlPSJmb250LXNpemU6MTJweCI+Jytlc2MocC5pbnRlZ3JhbD8oIisiK3AuaW50ZWdyYWwpOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgICB9CiAgICBjb25zdCBjb3Vwb25zPShpbmZvLmNvdXBvbnMmJihpbmZvLmNvdXBvbnMucmVjb3Jkc3x8aW5mby5jb3Vwb25zLmxpc3R8fGluZm8uY291cG9ucykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkoY291cG9ucykmJmNvdXBvbnMubGVuZ3RoKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5LyY5oOg5Yi4PC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytjb3Vwb25zLmxlbmd0aCsnIOW8oDwvc3Bhbj48L2Rpdj4nOwogICAgaWYoaW5mby5vdGEhPW51bGwpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj5PVEEg5Y2H57qnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrKEFycmF5LmlzQXJyYXkoaW5mby5vdGEpJiZpbmZvLm90YS5sZW5ndGg/IuacieaWsOeJiOacrCI6IuW3suaYr+acgOaWsCIpKyc8L3NwYW4+PC9kaXY+JzsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKGluZm8mJihpbmZvLmVycm9yfHxpbmZvLm1lc3NhZ2UpKXx8IuS/oeaBr+S4reW/g+WKoOi9veWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+6L2m5o6n5omp5bGV5oyH5Luk57uP5LqR56uv5LiL5Y+R77yM5ZON5bqU5Y+v6IO96L6D5oWiPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQoKYXN5bmMgZnVuY3Rpb24gZXh0U2V0KGFjdGlvbil7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uc3QgYm9keT17YWN0aW9uOmFjdGlvbix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn07CiAgaWYoYWN0aW9uPT09ImNoYXJnZVBvd2VyIil7aWYoIVZILmNwKXt0b2FzdCgi6K+35YWI6YCJ5oup5YWF55S15Yqf546HIiwiZXJyIik7cmV0dXJufWJvZHkudmFsdWU9VkguY3B9CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoYm9keSk7CiAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKfQoKZnVuY3Rpb24gaW5pdCgpewogIGFwcGx5VGhlbWUoKTthcHBseUN1c3RvbUJnKCk7bW91bnRTaWduaW5GYWIoKTsKICByZW5kZXJDZmcoKTsKICBpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXsKICAgIFNUQVRFLmRhdGE9REVNT19EQVRBO1NUQVRFLnRzVGV4dD1mbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9ZmFsc2U7CiAgICByZW5kZXJIb21lKCk7aGlkZVNwbGFzaCgpO3JldHVybjsKICB9CiAgc3RhcnRBdXRvUmVmcmVzaCgpO3JlZnJlc2hBbGwoZmFsc2UpOwogIC8vIHYyLjE1LjYg54mI5pys5qOA5rWL77ya6aaW5bGP5riy5p+T5ZCO6Z2Z6buY5qOA5p+l5LiA5qyh77yI5pyJ5paw54mI5pys5omN5o+Q56S677yJCiAgaWYoIWlzRGVtbygpKXNldFRpbWVvdXQoKCk9PmNoZWNrVmVyc2lvbihmYWxzZSksMTUwMCk7CiAgLy8g5YWc5bqV77ya5p6B56uv5oOF5Ya15LiL6K+35rGC6ZW/5pe26Ze05peg5ZON5bqU77yM6Zeq5bGP5Lmf5LiN6IO95LiA55u05oyh5L2P55WM6Z2iCiAgc2V0VGltZW91dChoaWRlU3BsYXNoLDEyMDAwKTsKfQppbml0KCk7Cjwvc2NyaXB0Pgo8IS0tX19KUzVfXy0tPgo=";
function __appDecodeUtf8(b64){
  const bin = atob(b64); const out = []; let i = 0;
  while (i < bin.length) {
    const c1 = bin.charCodeAt(i++) & 0xff;
    if (c1 < 0x80) { out.push(String.fromCharCode(c1)); continue; }
    const c2 = bin.charCodeAt(i++) & 0xff;
    if ((c1 & 0xe0) === 0xc0) { out.push(String.fromCharCode(((c1 & 0x1f) << 6) | (c2 & 0x3f))); continue; }
    const c3 = bin.charCodeAt(i++) & 0xff;
    if ((c1 & 0xf0) === 0xe0) { out.push(String.fromCharCode(((c1 & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f))); continue; }
    const c4 = bin.charCodeAt(i++) & 0xff;
    const cp = ((c1 & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
    const u = cp - 0x10000;
    out.push(String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3ff)));
  }
  return out.join("");
}
function __APP_HTML(){ return __appDecodeUtf8(__APP_HTML_B64); }

// 批量执行签到：逐账号签到 + 写运行日志 + 每账号独立 Bark 推送 + 失败重试队列 + 汇总本地通知（v2.14.9）
async function runSigninBatch(targets, cfg, opts) {
  opts = opts || {};
  const results = [];
  for (const acc of targets) {
    const r = await runSigninForAccount(acc, cfg);
    results.push(r);
    // 写入日志
    const _d = new Date();
    const _ds = _d.getFullYear() + "-" + String(_d.getMonth()+1).padStart(2,"0") + "-" + String(_d.getDate()).padStart(2,"0");
    addLog({
      time: _d.toLocaleString("zh-CN", { hour12: false }),
      date: _ds,
      type: "signin",
      userName: r.userName,
      userId: r.userId,
      success: r.success,
      totalGain: r.totalGain,
      signinScore: r.signinScore,
      blindBoxScore: r.blindBoxScore,
      interactScore: r.interactScore,
      continueDays: r.continueDays,
      error: r.error,
      steps: r.steps
    });
    // 每账号独立 Bark：仅签到成功且该账号填了 Bark Key 时推送
    if (r.success && acc.barkKey && String(acc.barkKey).trim()) {
      try {
        const _bt = "极核签到成功 · " + (r.userName || "");
        const _bScore = r.blindBoxScore || 0;
        const _bDay = (r.continueDays || 0) === 0 ? 0 : (((r.continueDays || 0) - 1) % 30) + 1;
        const _bRemain = 30 - _bDay;
        const _bbTxt = _bScore >= 10 ? "盲盒" + _bScore : "距盲盒" + _bRemain + "天";
        const _bb = "今日获得 " + r.totalGain + " 分（签到" + r.signinScore + " / " + _bbTxt + " / 互动" + r.interactScore + "），连签 " + r.continueDays + " 天";
        await barkPush(acc.barkKey, _bt, _bb);
      } catch(e) {}
    }
  }
  // v2.14.9 失败自动重试：记录失败账号队列，下次打开面板/触发签到时若已过间隔则自动补一轮
  try {
    const failedIds = [];
    results.forEach((r, i) => { if (!r.success && targets[i]) failedIds.push(String(targets[i].userId || "")); });
    const cleanIds = failedIds.filter(Boolean);
    if (cleanIds.length) {
      $.setdata(JSON.stringify({ time: Date.now(), userIds: cleanIds }), "zeeho_retry_queue");
      console.log("[重试] " + cleanIds.length + " 个账号签到失败，已入延迟重试队列");
    } else {
      $.setdata("", "zeeho_retry_queue");
    }
  } catch(e) {}
  // v2.14.9 汇总通知（原生本地通知优先，回退全局 Bark）
  if (opts.notify !== false && results.length) {
    try {
      const okN = results.filter(r => r.success).length;
      const failN = results.length - okN;
      const gain = results.reduce((sum, r) => sum + (r.totalGain || 0), 0);
      const t = failN ? "极核签到部分失败" : "极核签到完成";
      const b = results.length + " 个账号：" + okN + " 成功" + (failN ? " / " + failN + " 失败（稍后自动重试）" : "") + "，共 +" + gain + " 积分";
      notifyPush(t, b, cfg);
    } catch(e) {}
  }
  return results;
}

// v2.14.9 失败重试队列检查：距入队已过间隔（默认2分钟）则自动重签一轮（打开面板补签模型）
async function checkRetryQueue(cfg) {
  try {
    const raw = $.getdata("zeeho_retry_queue");
    if (!raw) return null;
    const q = JSON.parse(raw);
    if (!q || !Array.isArray(q.userIds) || !q.userIds.length) return null;
    const delayMs = 2 * 60 * 1000;
    if (Date.now() - (Number(q.time) || 0) < delayMs) return null;
    $.setdata("", "zeeho_retry_queue");
    const accounts = getAccounts();
    const targets = accounts.filter(a => q.userIds.indexOf(String(a.userId)) >= 0);
    if (!targets.length) return null;
    console.log("[重试] 自动重试 " + targets.length + " 个失败账号");
    return await runSigninBatch(targets, cfg, { notify: true });
  } catch(e) { return null; }
}

// ========== v2.14.9 车辆快照（轻量：SOC/续航/龙头锁/离线判断） ==========
async function fetchVehicleSnapshots(acc, cfg, vin) {
  try {
    const query = "vinNo=" + encodeURIComponent(vin);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicles/properties/snapshots?" + query, appQueryGetHeaders(acc, query, cfg));
    if (res.code != "10000" || !res.data) return null;
    const props = res.data.iotProperties || [];
    const pick = (id) => props.find(p => String(p.identify || "").toLowerCase() === id.toLowerCase()) || null;
    const socIt = pick("BMSSOC"), mileIt = pick("HMIRidableMile"), lockIt = pick("HeadLockState");
    // 取全部属性中的最新时间戳判断在线（单一属性可能滞后，避免误判离线）
    let ts = 0;
    for (const p of props) { const t = Number(p.time) || 0; if (t > ts) ts = t; }
    return {
      vin: vin,
      soc: socIt ? Number(socIt.value) : null,
      range: mileIt ? Number(mileIt.value) : null,
      headLock: lockIt ? String(lockIt.value) : "",
      ts: ts,
      refreshTime: res.data.refreshTime || "",
      offline: ts > 0 ? (Date.now() - ts > 30 * 60 * 1000) : false
    };
  } catch(e) { return null; }
}

// v2.14.13 监控离线判断：以官方在线状态（TBOX 网络连接状态）为准，而非属性上报时间戳。
// 修复：停放后 TBOX 休眠、属性停报，时间戳很快"过期"，按时间戳判断会在 30 分钟后误报离线（车辆其实正常）。
//   - 官方状态在线 / 停放休眠（sleep/休眠）→ 不离线（停放是正常状态）
//   - 官方状态明确断开（offline/disconnect）→ 离线
//   - 官方状态未知 → 回退属性时间戳但阈值放宽到 2 小时，宁可少报不误报
function isMonitorOffline(onlineStr, ts) {
  const s = String(onlineStr || "").toLowerCase().trim();
  const onVals = ["1", "on", "online", "true", "在线", "已在线", "connected", "normal", "sleep", "休眠"];
  const offVals = ["0", "off", "offline", "false", "离线", "未在线", "已离线", "disconnect", "disconnected"];
  if (s) {
    if (onVals.includes(s)) return false;
    if (offVals.includes(s)) return true;
  }
  // 官方状态未知：回退属性时间戳，阈值放宽到 2 小时，避免停放误报
  if (ts > 0) return (Date.now() - ts) > 120 * 60 * 1000;
  return false;
}

// v2.14.9 车辆监控引擎（打开面板补查模型）：充满/离线状态变化时本地通知，状态记录去重
async function checkVehicleMonitor(cfg) {
  if (!cfg.vehicleMonitor) return;
  try {
    const accounts = getAccounts();
    if (!accounts.length) return;
    let state = {};
    try { state = JSON.parse($.getdata("zeeho_vehmon_state") || "{}"); } catch(e) {}
    for (const acc of accounts) {
      try {
        const list = await fetchVehicleList(acc, cfg);
        if (!list || !list.length) continue;
        const veh = list[0];
        const snap = await fetchVehicleSnapshots(acc, cfg, veh.vinNo);
        if (!snap) continue;
        // 官方在线状态（TBOX）：widgets 接口，取不到则空串，回退时间戳逻辑
        let onlineStr = "";
        try {
          const w = await fetchVehicleWidgets(acc, cfg, veh.vinNo);
          if (w) onlineStr = w.online || "";
        } catch(e) {}
        const offline = isMonitorOffline(onlineStr, snap.ts);
        const key = String(acc.userId || "") + ":" + veh.vinNo;
        const prev = state[key] || {};
        const name = (acc.userName || "") + " · " + (veh.name || veh.vehicleName || veh.vinNo);
        if (snap.soc >= 100 && prev.socFull !== true) {
          // 官方续航字段充满时常为 0/空，兜底按满电 150km 估算
          const fullRange = snap.range || Math.round(snap.soc * 1.5);
          notifyPush("车辆已充满", name + " 电量 " + snap.soc + "%，续航 " + fullRange + " km", cfg);
          state[key] = Object.assign({}, prev, { socFull: true });
        } else if (snap.soc !== null && snap.soc < 100 && prev.socFull === true) {
          state[key] = Object.assign({}, prev, { socFull: false });
        }
        if (offline && prev.offline !== true) {
          notifyPush("车辆离线", name + " TBOX 网络断开（停放休眠不算离线）", cfg);
          state[key] = Object.assign({}, prev, { offline: true });
        } else if (!offline && prev.offline === true) {
          state[key] = Object.assign({}, prev, { offline: false });
        }
      } catch(e) {}
    }
    $.setdata(JSON.stringify(state), "zeeho_vehmon_state");
  } catch(e) {}
}

// v2.14.9 通用：按 userId 找账号（找不到兜底第一个）
function findAccByUserId(userId) {
  const accounts = getAccounts();
  let acc = accounts.find(a => String(a.userId) === String(userId));
  if (!acc && accounts.length) acc = accounts[0];
  return acc || null;
}
// v2.14.9 通用：账号基础请求头
function accHeaders(acc, signH) {
  const h = {
    "Authorization": "Bearer " + cleanToken(acc.token),
    "Content-Type": "application/json;charset=UTF-8",
    "interfaceversion": "2",
    ...signH
  };
  if (acc.userId) h["user_id"] = String(acc.userId);
  return h;
}

// v2.15.5 面板打开维护（响应后后台执行，不阻塞首屏）：
// 定时签到（打开面板补签引擎）+ 失败重试队列 + 车辆监控。
// iOS 原生 App 在「原生直出面板页」后调 /api/panel-open 触发，语义与「打开面板」一致。
async function runPanelOpenMaintenance() {
  if (runPanelOpenMaintenance._running) return;
  runPanelOpenMaintenance._running = true;
  // 定时签到（补签引擎）：设置页开启后，每天首次打开面板且已过设定时间 → 全账号签到一次（日期标记去重）
  try {
    const _cfg0 = getConfig();
    if (_cfg0.autoSignin) {
      const _now = new Date();
      const _today = _now.getFullYear() + "-" + String(_now.getMonth()+1).padStart(2,"0") + "-" + String(_now.getDate()).padStart(2,"0");
      const _hm = String(_now.getHours()).padStart(2,"0") + ":" + String(_now.getMinutes()).padStart(2,"0");
      const _last = ($.getdata("zeeho_autosign_lastdate") || "");
      if (_hm >= _cfg0.autoSigninTime && _last !== _today) {
        $.setdata(_today, "zeeho_autosign_lastdate");
        const _accs = getAccounts();
        if (_accs.length) {
          console.log("[定时签到] 已过 " + _cfg0.autoSigninTime + "，自动补签 " + _accs.length + " 个账号");
          await runSigninBatch(_accs, _cfg0);
        }
      }
    }
  } catch(e) { console.log("[定时签到] 异常: " + e); }
  try { await checkRetryQueue(getConfig()); } catch(e) {}
  try { await checkVehicleMonitor(getConfig()); } catch(e) {}
  runPanelOpenMaintenance._running = false;
}

// ========== v2.15.6 软件版本检测 ==========
// 上游版本清单：jsDelivr 优先（国内可达），GitHub raw 兜底；本地缓存 6 小时避免频繁请求。
const VERSION_JSON_URLS = [
  "https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/repo/version.json",
  "https://raw.githubusercontent.com/cluck798/ZEEHO/main/repo/version.json"
];
const VERSION_CK = "zeeho_vercheck";
const VERSION_CACHE_MS = 6 * 3600 * 1000;
function verNum(s) {
  const m = String(s || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? (Number(m[1]) * 1000000 + Number(m[2]) * 1000 + Number(m[3])) : 0;
}
async function fetchLatestVersion(force) {
  if (!force) {
    try {
      const cached = $.getdata(VERSION_CK);
      if (cached) {
        const o = JSON.parse(cached);
        if (o && o.ts && (Date.now() - o.ts) < VERSION_CACHE_MS && o.latest && o.latest.script) {
          return { latest: o.latest, cached: true };
        }
      }
    } catch(e) {}
  }
  // v2.16.2 加固：jsDelivr 对 @main 分支文件有最长约 12 小时缓存（曾出现其仍返回 2.15.6，
  // 导致“检查更新”误判为已是最新）。改为两源并发拉取、取版本号更高者：
  // raw 约 5 分钟级更新（新版本发布后能立刻探测到），jsDelivr 兜底国内网络可达性。
  const fetched = await Promise.all(VERSION_JSON_URLS.map(async (u) => {
    try {
      const res = await httpGet(u + "?t=" + Math.floor(Date.now() / 300000), {});
      let o = null;
      if (res && res.script) o = res;
      else if (res && typeof res.raw === "string") { try { o = JSON.parse(res.raw); } catch(e) {} }
      return (o && o.script) ? o : null;
    } catch(e) { return null; }
  }));
  let best = null;
  for (const o of fetched) {
    if (o && (!best || verNum(o.script) > verNum(best.script))) best = o;
  }
  if (best) {
    try { $.setdata(JSON.stringify({ ts: Date.now(), latest: best }), VERSION_CK); } catch(e) {}
    return { latest: best, cached: false };
  }
  return { latest: null, cached: false, error: "版本信息获取失败（网络不可达）" };
}

!(async () => {
  if (typeof $request === "undefined" || !$request) {
    $.log("极核看板增强版：请通过重写规则访问 http://zeeho.box");
    $done();
    return;
  }

  const url = $request.url || "";
  // 自动识别当前入口域名：Loon=http://zeeho.box，QX=http://www.example.com
  try { const _u = new URL(url); PANEL_HOST = _u.origin; } catch (e) {}
  // 极核API请求由前面的autoCapture处理，主入口跳过，避免$done调用两次
  if (url.includes('zeehoev.com')) {
    console.log('[主入口] 跳过非面板请求: ' + url.substring(0, 80));
    return; // autoCapture会调用$done
  }
  const method = ($request.method || "GET").toUpperCase();
  let path = "/";
  try {
    const u = new URL(url);
    path = u.pathname || "/";
  } catch(e) { path = "/"; }

  // ========== 定时签到（补签引擎） ==========
  // 代理脚本无常驻进程，采用"打开面板补签"模型：设置页开启后，
  // 每天首次打开面板且当前时间已过设定时间 → 自动为全部账号执行一次签到（写日志+推Bark，与手动一致）。
  // 以 store 里的日期标记去重，同一天只补一次。
  if (method === "GET" && (path === "/" || path === "")) {
    try {
      const _cfg0 = getConfig();
      if (_cfg0.autoSignin) {
        const _now = new Date();
        const _today = _now.getFullYear() + "-" + String(_now.getMonth()+1).padStart(2,"0") + "-" + String(_now.getDate()).padStart(2,"0");
        const _hm = String(_now.getHours()).padStart(2,"0") + ":" + String(_now.getMinutes()).padStart(2,"0");
        const _last = ($.getdata("zeeho_autosign_lastdate") || "");
        if (_hm >= _cfg0.autoSigninTime && _last !== _today) {
          // 先写标记防并发重复触发
          $.setdata(_today, "zeeho_autosign_lastdate");
          const _accs = getAccounts();
          if (_accs.length) {
            console.log("[定时签到] 已过 " + _cfg0.autoSigninTime + "，自动补签 " + _accs.length + " 个账号");
            await runSigninBatch(_accs, _cfg0);
          }
        }
      }
    } catch(e) { console.log("[定时签到] 异常: " + e); }
  }

  // ========== v2.14.9 打开面板时：失败重试队列 + 车辆监控 ==========
  if (method === "GET" && (path === "/" || path === "")) {
    try { await checkRetryQueue(getConfig()); } catch(e) {}
    try { await checkVehicleMonitor(getConfig()); } catch(e) {}
  }

  // ========== v2.15.5 原生 App 快路径：面板 HTML 由原生直出，用它触发同一套「打开面板」维护 ==========
  // 先立即响应，维护改到响应后后台执行（不再 await 网络任务挡在首屏前面）
  if (method === "GET" && path === "/api/panel-open") {
    sendResp(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" }, '{"ok":true}');
    setTimeout(function(){ runPanelOpenMaintenance(); }, 0);
    return;
  }

  // ========== v2.15.6 API: 软件版本检测（/api/version-check?fresh=1 强制刷新） ==========
  if (method === "GET" && path === "/api/version-check") {
    const force = /fresh=1/.test(url);
    const vr = await fetchLatestVersion(force);
    const cur = SCRIPT_VERSION.replace(/^v/, "");
    const latest = vr.latest || null;
    sendResp(200, { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-cache" }, JSON.stringify({
      ok: !!latest,
      error: vr.error || "",
      cached: !!vr.cached,
      current: cur,
      latest: latest,
      hasUpdate: latest ? verNum(latest.script) > verNum(cur) : false
    }));
    return;
  }

  // API: 保存配置
  if (method === "POST" && path === "/api/save-config") {
    const body = parseBody($request);
    const ok = saveConfig(body);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok }));
    return;
  }

  // API: 验证用户ID与Token是否匹配
  if (method === "POST" && path === "/api/verify-account") {
    const body = parseBody($request);
    const userId = String(body.userId || "");
    const token = cleanToken(body.token || "");
    const cfg = getConfig();
    let valid = false;
    let message = "";
    let returnedId = "";
    if (!userId || !token) {
      message = "用户ID和Token不能为空";
    } else {
      try {
        const signH = getSign("app", {}, '', cfg);
        const res = await httpGet(`https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`, {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          "user_id": userId,
          ...signH
        });
        if (res.code == "10000" && res.data) {
          returnedId = String(res.data.id || res.data.userId || "");
          if (returnedId === userId) {
            valid = true;
            message = "验证通过，Token与用户ID匹配";
          } else {
            valid = false;
            message = `Token不匹配！该Token属于用户ID: ${returnedId || "未知"}，不是 ${userId}`;
          }
        } else if (res.code == "40001" || res.code == 401) {
          valid = false;
          message = "Token已过期，请重新获取";
        } else {
          valid = false;
          message = "验证失败: " + (res.message || res.code || "未知错误");
        }
      } catch(e) {
        valid = false;
        message = "验证异常: " + String(e);
      }
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ valid: valid, message: message, returnedId: returnedId }));
    return;
  }

  // API: 根据Token自动获取用户ID
  if (method === "POST" && path === "/api/get-userid") {
    const body = parseBody($request);
    const token = cleanToken(body.token || "");
    const cfg = getConfig();
    let userId = "";
    let userName = "";
    let error = null;
    if (!token) {
      error = "请先输入Token";
    } else {
      const baseHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        "interfaceversion": "2"
      };
      // 递归搜索对象中的 userId 字段
      const findUserId = (obj, depth = 0) => {
        if (!obj || depth > 5) return "";
        if (typeof obj === "string" || typeof obj === "number") return "";
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (/user.?id|uid|create.?by|owner.?id/i.test(key) && val && typeof val !== "object") {
            const s = String(val);
            if (s.length >= 10 && /^\d+$/.test(s)) return s;
          }
          if (val && typeof val === "object") {
            const found = findUserId(val, depth + 1);
            if (found) return found;
          }
        }
        return "";
      };
      // 方式0（最优先，最可靠）：调用 H5 端 baseInfo 接口，不需要 user_id，从 token 直接获取用户信息
      try {
        const signH0 = getSign("h5", { server_name: "SMART" }, '', cfg);
        const res0 = await httpGet("https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART", { ...baseHeaders, ...signH0 });
        if (res0 && String(res0.code) === "10000" && res0.data) {
          userId = String(res0.data.id || "");
          userName = String(res0.data.nickName || "");
        }
      } catch(e) {}
      // 方式1：调用 /setting（不带userId）获取当前用户信息
      if (!userId) {
      try {
        const signH = getSign("app", {}, '', cfg);
        const res = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting", { ...baseHeaders, ...signH });
        if (res.code == "10000" && res.data) {
          userId = String(res.data.id || res.data.userId || "");
          userName = String(res.data.nickName || "");
        }
        if (!userId && res.data) userId = findUserId(res.data);
      } catch(e) {}
      }
      // 方式2：调用积分接口获取用户信息
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const res = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare", { ...baseHeaders, ...signH });
          if (res && res.data) userId = findUserId(res.data);
        } catch(e) {}
      }
      // 方式3：从 vehicle/list 响应中递归搜索 userId
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", { ...baseHeaders, ...signH });
          if (res && res.data) userId = findUserId(res.data);
          // 也搜索整个响应
          if (!userId && res) userId = findUserId(res);
        } catch(e) {}
      }
      // 方式4：调用 homeRideInfo（需要先获取车辆VIN）
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const listRes = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", { ...baseHeaders, ...signH });
          let vinNo = "";
          const d = listRes?.data;
          if (Array.isArray(d)) vinNo = d[0]?.vinNo || d[0]?.frameNo || "";
          else if (Array.isArray(d?.list)) vinNo = d.list[0]?.vinNo || "";
          else if (Array.isArray(d?.records)) vinNo = d.records[0]?.vinNo || "";
          if (vinNo) {
            const qRide = `vinNo=${encodeURIComponent(vinNo)}`;
            const rideRes = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qRide}`, appQueryGetHeaders({ token: token, userId: "" }, qRide, cfg));
            if (rideRes && rideRes.data) userId = findUserId(rideRes.data);
          }
        } catch(e) {}
      }
      // 方式5：社区接口（粉丝列表/关注列表/用户信息），这些接口响应中通常包含 userId
      if (!userId) {
        const socialUrls = [
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/fans/list?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/follower/list?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/user/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/my/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/fans/myFans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/user/info",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/my/info",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/userInfo"
        ];
        for (const url of socialUrls) {
          if (userId) break;
          try {
            const qSoc = url.split("?")[1] || "";
            const res = await httpGet(url, appQueryGetHeaders({ token: token, userId: "" }, qSoc, cfg));
            if (res && res.data) {
              userId = findUserId(res.data);
              if (!userId && res) userId = findUserId(res);
              // 尝试从昵称中获取 userName
              if (!userName && res.data) {
                const findName = (obj, depth = 0) => {
                  if (!obj || depth > 4) return "";
                  for (const key of Object.keys(obj)) {
                    if (/nick.?name|user.?name|name/i.test(key) && obj[key] && typeof obj[key] === "string") return obj[key];
                    if (obj[key] && typeof obj[key] === "object") {
                      const n = findName(obj[key], depth + 1);
                      if (n) return n;
                    }
                  }
                  return "";
                };
                userName = findName(res.data);
              }
            }
          } catch(e) {}
        }
      }
      if (!userId) error = "自动获取失败，请手动填写用户ID（或打开极核App-我的页面自动捕获）";
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: !!userId, userId: userId, userName: userName, error: error }));
    return;
  }

  // API: 快速保存（客户端通过 zeeho.box 链接直接保存，GET请求，参数在query里）
  // API: 发送短信验证码（手机号登录，免抓包）——走 App 网关，与登录同验证码池
  if (method === "POST" && path === "/api/send-code") {
    const body = parseBody($request);
    const phone = String(body.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "手机号格式不正确（应为11位）" }));
      return;
    }
    const cfg = getConfig();
    // 发码走 App 网关（与 loginByPhone 同一验证码池；签名按 GET 风格，URL入签）
    // 曾误以为"App 网关旧 GET 已废弃返回 permit error"，实为签名风格错误所致，勿改回 H5（H5 发的码登录侧取不到）
    const url = `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/authCode/${encodeURIComponent(phone)}`;
    const signH = appGatewaySign(url, "GET", {}, '', cfg);
    const res = await httpGet(url, {
      "Content-Type": "application/json;charset=UTF-8",
      "User-Agent": "okhttp/4.9.2",
      ...signH
    });
    if (res && String(res.code) === "10000") {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, message: "验证码已发送，请查收短信" }));
    } else {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "发送失败: " + ((res && (res.message || res.msg)) || "未知错误") }));
    }
    return;
  }

  // API: 手机号 + 短信验证码登录（免抓包），成功后自动写入账号列表
  if (method === "POST" && path === "/api/phone-login") {
    const body = parseBody($request);
    const phone = String(body.phone || "").trim();
    const code = String(body.code || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "手机号格式不正确（应为11位）" }));
      return;
    }
    if (!code) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "请填写短信验证码" }));
      return;
    }
    const cfg = getConfig();
    // 登录请求体与参考实现（HomeAssistant zeeho 集成，实测可用）完全一致：phone + authCode
    const payload = { phone: phone, authCode: code };
    // 登录必须带 OAuth2 Basic 凭据（逆向自极核 App，固定 mck:123456 → base64 bWNrOjEyMzQ1Ng==）
    // 留空则用内置默认值；用户抓包发现变化时可在面板输入框覆盖
    const basicAuth = String((body && body.basicAuth) || cfg.basicAuth || "bWNrOjEyMzQ1Ng==").trim().replace(/^Basic\s+/i, "");
    // 走 App 网关（与发码同一验证码池）
    const loginUrl = "https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/user/loginByPhone";
    // ⚠️ 虽然是 POST，签名必须按 GET 风格（URL入签、body 不入签，与参考实现一致）：
    //    用 POST 风格签名(query+body) 服务端签名校验不过，返回"验证码有误或已过期"
    const signH = appGatewaySign(loginUrl, "GET", {}, '', cfg);
    const loginHeaders = { "Content-Type": "application/json;charset=UTF-8", "User-Agent": "okhttp/4.9.2", ...signH };
    if (basicAuth) loginHeaders["Authorization"] = "Basic " + basicAuth;
    const loginRes = await httpPost(
      loginUrl,
      loginHeaders,
      payload,
      20000
    );
    const tokenInfo = loginRes && loginRes.data && loginRes.data.tokenInfo;
    const accessToken = tokenInfo && String(tokenInfo.access_token || "");
    if (!loginRes || String(loginRes.code) !== "10000" || !accessToken) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "登录失败: " + ((loginRes && (loginRes.message || loginRes.msg)) || "验证码有误或已过期"), detail: loginRes }));
      return;
    }
    // 用登录 Token 自动获取用户ID与昵称（H5 baseInfo，与「获取ID」一致）
    // 用户ID与昵称：优先用登录响应自带字段（App loginByPhone 响应 data 直接返回 id/phone/nickName），失败再查 H5 baseInfo
    let userId = String((loginRes.data && (loginRes.data.id || loginRes.data.userId)) || "").trim();
    let userName = String((loginRes.data && (loginRes.data.nickName || loginRes.data.username)) || "").trim();
    if (!userId) {
      try {
        const signH0 = getSign("h5", { server_name: "SMART" }, '', cfg);
        const infoRes = await httpGet("https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART", {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          ...signH0
        });
        if (infoRes && String(infoRes.code) === "10000" && infoRes.data) {
          userId = String(infoRes.data.id || "");
          userName = String(infoRes.data.nickName || "");
        }
      } catch(e) {}
    }
    // 追加/更新账号：同一 Token 或同一用户ID视为同一账号（刷新Token），否则新增
    const list = getAccounts();
    let replaced = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && (String(list[i].token || "") === accessToken || (list[i].userId && userId && String(list[i].userId) === userId))) {
        list[i].token = accessToken;
        if (userId) list[i].userId = userId;
        if (userName) list[i].userName = userName;
        replaced = true;
        break;
      }
    }
    const newAcc = { userName: userName || phone, userId: userId, token: accessToken, barkKey: "", userAgent: "" };
    if (!replaced) list.push(newAcc);
    saveAccounts(list);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, message: replaced ? "登录成功，已更新该账号" : "登录成功，已添加账号", account: newAcc }));
    return;
  }

  if (path === "/api/quick-save" || path === "/quick-save") {
    try {
      const u = new URL(url);
      const qName = u.searchParams.get('name') || '';
      const qToken = cleanToken(u.searchParams.get('token') || '');
      if (!qToken) {
        sendResp(200, { "Content-Type": "text/html; charset=utf-8" }, '<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2 style="color:#EF4444">保存失败</h2><p>Token为空</p><a href="' + PANEL_HOST + '/config">返回配置</a></body></html>');
        return;
      }
      const cfg = getConfig();
      // 自动获取用户ID
      let qUid = '';
      let qNick = qName;
      let fetchErr = '';
      try {
        const signHeaders = getSign('h5', { server_name: 'SMART' }, '', cfg);
        const res = await httpGet('https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART', {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': 'Bearer ' + qToken,
          ...signHeaders
        });
        if (res && String(res.code) === '10000' && res.data) {
          qUid = String(res.data.id || '');
          qNick = res.data.nickName || qName;
        } else {
          fetchErr = res?.message || res?.msg || '获取用户ID失败';
        }
      } catch(e) { fetchErr = String(e); }
      // 获取失败用临时ID
      if (!qUid) qUid = 'temp_' + qToken.substring(0, 8);
      // 保存到账号列表
      let accounts = getAccounts();
      const idx = accounts.findIndex(a => String(a.userId) === String(qUid) || cleanToken(a.token) === qToken);
      const acc = { userName: qNick || ('账号' + (accounts.length + 1)), userId: qUid, token: qToken };
      if (idx >= 0) accounts[idx] = Object.assign({}, accounts[idx], acc);
      else accounts.push(acc);
      saveAccounts(accounts);
      console.log('[快速保存] 账号已保存: ' + acc.userName + ' (' + qUid + ')' + (fetchErr ? ' [获取ID失败: '+fetchErr+']' : ''));
      // 返回成功页面
      const okHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>配置已保存</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#F0F4F8;padding:30px 16px}.card{background:#fff;border-radius:14px;padding:30px 20px;max-width:420px;margin:0 auto;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}.icon{width:60px;height:60px;border-radius:50%;background:#D1FAE5;color:#059669;font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.title{font-size:18px;font-weight:700;margin-bottom:8px}.info{font-size:13px;color:#64748B;line-height:1.8;margin-bottom:20px}.info b{color:#0F172A}.btn{display:inline-block;padding:10px 24px;border-radius:8px;background:#0891B2;color:#fff;text-decoration:none;font-size:14px;font-weight:600;margin:4px}.btn2{background:#fff;color:#475569;border:1px solid #E2E8F0}.warn{font-size:11px;color:#F59E0B;margin-top:10px}</style></head><body><div class="card"><div class="icon">✓</div><div class="title">配置保存成功</div><div class="info">昵称：<b>' + (acc.userName) + '</b><br>用户ID：<b>' + qUid + '</b>' + (fetchErr ? '<div class="warn">⚠️ 自动获取用户ID失败（'+fetchErr+'），已用临时ID保存，可在配置页点「获取ID」重试</div>' : '') + '</div><a href="' + PANEL_HOST + '/" class="btn">查看面板</a> <a href="' + PANEL_HOST + '/config" class="btn btn2">配置页</a></div></body></html>';
      sendResp(200, { "Content-Type": "text/html; charset=utf-8" }, okHtml);
    } catch(e) {
      sendResp(200, { "Content-Type": "text/html; charset=utf-8" }, '<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2 style="color:#EF4444">保存异常</h2><p>' + String(e) + '</p></body></html>');
    }
    return;
  }

  // API: 保存账号
  if (method === "POST" && path === "/api/save-accounts") {
    const body = parseBody($request);
    const rawList = Array.isArray(body.accounts) ? body.accounts : [];
    // 存盘前统一剥离 Bearer 前缀，仅保留 Token 本体；其余字段（含每账号 barkKey）原样保留
    const list = rawList.map(function(a) {
      return Object.assign({}, a, {
        token: cleanToken(a.token || ""),
        barkKey: cleanBarkKey(a.barkKey || "")
      });
    });
    const ok = saveAccounts(list);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok, count: list.length }));
    return;
  }


  // API: 获取全部数据（账号+车辆+配置）
  if (method === "GET" && path === "/api/data") {
    const cfg = getConfig();
    const accounts = getAccounts();
    // 并发3路拉取（原串行逐个等待，多账号时明显卡顿）
    const data = await fetchAllAccounts(accounts, cfg, 3);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
      accounts: data,
      config: { appId: cfg.app.appId, h5AppId: cfg.h5.appId, community: cfg.community },
      timestamp: new Date().toISOString(),
      total: accounts.length
    }));
    return;
  }

  // API: 多车切换 - 获取指定账号指定车辆数据
  if (method === "GET" && path === "/api/vehicle") {
    try {
      const _u = new URL(url);
      const userId = String(_u.searchParams.get("userId") || "");
      const vin = String(_u.searchParams.get("vin") || "");
      const cfg = getConfig();
      const accounts = getAccounts();
      const acc = accounts.find(a => String(a.userId) === String(userId));
      if (!acc || !vin) {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "参数错误" }));
        return;
      }
      const result = await fetchAccountData(acc, cfg, vin);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, result: result }));
    } catch (e) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) }));
    }
    return;
  }

    // ========== v2.16.0 API: 隐藏骑行数据 · 月度汇总（myRideInfo 透传，面板「骑行」页用） ==========
  if (method === "GET" && path === "/api/ride-month") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideMonth(acc, getConfig(), String(_u.searchParams.get("month") || ""), String(_u.searchParams.get("vin") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.0 API: 隐藏骑行数据 · 轨迹分页（ridetrack_v2 透传，面板「扫描轨迹」用） ==========
  if (method === "GET" && path === "/api/ride-track") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideTrackPage(acc, getConfig(), _u.searchParams.get("page"), _u.searchParams.get("pageSize"), String(_u.searchParams.get("vin") || ""), String(_u.searchParams.get("month") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

    // API: 获取完整配置（面板模式设置页回填账号密钥用）
  if (method === "GET" && path === "/api/config") {
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, config: getConfig() }));
    return;
  }

    // API: 获取完整账号列表（含 Token / Bark Key，设置页回填用）
  if (method === "GET" && path === "/api/accounts") {
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, accounts: getAccounts() }));
    return;
  }

  // API: 获取运行日志
  if (method === "GET" && path === "/api/get-logs") {
    const logs = getLogs();
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ logs: logs }));
    return;
  }

  // API: 清空运行日志
  if (method === "POST" && path === "/api/clear-logs") {
    const ok = clearLogs();
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok }));
    return;
  }

  // API: 手动执行签到
  if (method === "POST" && path === "/api/run-signin") {
    const body = parseBody($request);
    const cfg = getConfig();
    const accounts = getAccounts();
    const targets = body.all ? accounts : accounts.filter(a => String(a.userId) === String(body.userId));
    const results = await runSigninBatch(targets, cfg);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, results: results }));
    return;
  }

  // API: 车辆远程控制（find寻车 / loudFind鸣笛闪灯 / cushion开坐垫 / unlock开锁 / lock关锁）
  if (method === "POST" && path === "/api/vehicle-control") {
    const body = parseBody($request);
    const action = String(body.action || "");
    const cfg = getConfig();
    const accounts = getAccounts();
    // 按 userId 定位账号；找不到时兜底取第一个
    let acc = accounts.find(a => String(a.userId) === String(body.userId));
    if (!acc && body.userId) acc = accounts[0];
    if (!acc && accounts.length) acc = accounts[0];
    if (!acc) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未找到账号，请先在配置页添加" }));
      return;
    }
    if (!VEHICLE_ACTION_TEXT[action]) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "非法操作类型" }));
      return;
    }
    // 2026-09-20 修复：支持传入指定 VIN，切换车辆后控车操作对应选中车辆而非默认第一台
    const customVin = String(body.vin || "").trim();
    const r = await vehicleControl(acc, action, cfg, customVin);
    console.log(`[车辆控制] ${acc.userName} ${VEHICLE_ACTION_TEXT[action]} => ${r.ok ? "成功" : "失败:" + r.message}`);
    // 控车操作写入运行日志（type=vehicle，日志页可按“控车”筛选）
    try {
      const _vd = new Date();
      const _vds = _vd.getFullYear() + "-" + String(_vd.getMonth()+1).padStart(2,"0") + "-" + String(_vd.getDate()).padStart(2,"0");
      addLog({
        time: _vd.toLocaleString("zh-CN", { hour12: false }),
        date: _vds,
        type: "vehicle",
        action: action,
        actionText: VEHICLE_ACTION_TEXT[action] || "车辆控制",
        userName: acc.userName || "未知",
        userId: acc.userId,
        success: !!r.ok,
        message: r.message || "",
        error: r.ok ? "" : (r.message || "指令失败")
      });
    } catch(e) {}
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    return;
  }

  // ========== v2.14.9 API: 积分全家桶（流水/总积分/过期/签到统计） ==========
  if (method === "GET" && path === "/api/integral") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const page = Number(_u.searchParams.get("page")) || 1;
      const pageSize = Number(_u.searchParams.get("pageSize")) || 20;
      const T = "https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine";
      const [dt, tot, exp, cnt] = await Promise.all([
        httpGet(T + "/integral/detail?page=" + page + "&pageSize=" + pageSize, appQueryGetHeaders(acc, "page=" + page + "&pageSize=" + pageSize, cfg)),
        httpGet(T + "/integral/totalIntegral", accHeaders(acc, getSign("app", {}, '', cfg))),
        httpGet(T + "/integral/expire", accHeaders(acc, getSign("app", {}, '', cfg))),
        httpGet(T + "/signin/count", accHeaders(acc, getSign("app", {}, '', cfg)))
      ]);
      // v2.14.20 防御：官方 /integral/detail 的 data 可能为数组或 {records/list/rows}，统一归一为数组
      let detailArr = [];
      if (dt && dt.code == "10000") {
        const dd = dt.data;
        if (Array.isArray(dd)) detailArr = dd;
        else if (dd && Array.isArray(dd.records)) detailArr = dd.records;
        else if (dd && Array.isArray(dd.list)) detailArr = dd.list;
        else if (dd && Array.isArray(dd.rows)) detailArr = dd.rows;
        else if (dd && Array.isArray(dd.detail)) detailArr = dd.detail;
      }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
        ok: true,
        detail: detailArr,
        detailError: dt && dt.code != "10000" ? (dt.message || "") : "",
        total: (tot && tot.code == "10000") ? tot.data : null,
        expire: (exp && exp.code == "10000") ? (exp.data || []) : [],
        signinCount: (cnt && cnt.code == "10000") ? cnt.data : null
      }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 积分补签（补签卡数/日历/连签/兑换/使用补签卡） ==========
  if (path === "/api/supplement") {
    try {
      const _u = new URL(url);
      const body = method === "POST" ? parseBody($request) : {};
      const acc = findAccByUserId(_u.searchParams.get("userId") || body.userId || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const action = String(_u.searchParams.get("action") || body.action || "count");
      const dateTime = String(_u.searchParams.get("dateTime") || body.dateTime || "");
      // 2026-10-13 路径修复：consume（补签）/ gain（积分兑换）必须走官方新路径（含 /H5/），
      // 旧路径 /cfmotoservermine/signInSupplement/* 已被 WAF 拦为 430/30125 permit error
      const H = "https://h5.zeehoev.com/cfmotoservermine/H5/signInSupplement";
      let res = null;
      if (action === "count") {
        // 2026-10-12 HAR 实证：官方 POST /count 的签名把 body "{}" 纳入（md5(sha1("{}"+param+secret)) 与官方样本逐位一致）；
        // 不签 body 会被 WAF 判 430/30121 permit error（补签卡数量/补签流程因此报错）
        res = await httpPost(H + "/count", accHeaders(acc, getSign("h5", {}, "{}", cfg)), "{}");
      } else if (action === "page") {
        // 2026-09-27: 官方已将 /page 改为 POST，分页参数放 body 内（GET 返回 40000）
        const page = Number(_u.searchParams.get("page")) || 1, pageSize = Number(_u.searchParams.get("pageSize")) || 10;
        const pageBody = JSON.stringify({ page: page, pageSize: pageSize });
        res = await httpPost(H + "/page", accHeaders(acc, getSign("h5", {}, pageBody, cfg)), pageBody);
      } else if (action === "continuity") {
        res = await httpGet(H + "/continuity?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else if (action === "detail") {
        res = await httpGet(H + "/detail?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else if (action === "month") {
        // 整月签到日历：YYYY-MM，返回 nowSignDetailVos（补签日历渲染用）
        const month = String(_u.searchParams.get("month") || "");
        if (!/^\d{4}-\d{2}$/.test(month)) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "月份格式应为 YYYY-MM" })); return; }
        res = await httpGet("https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=" + encodeURIComponent(month), accHeaders(acc, getSign("h5", { month: month }, '', cfg)));
      } else if (action === "gain") {
        // 积分兑换补签卡：sourceType 1=积分兑换 2=盲盒 3=赠送 4=活动
        res = await httpGet(H + "/gain?sourceType=1", accHeaders(acc, getSign("h5", { sourceType: 1 }, '', cfg)));
      } else if (action === "consume") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTime)) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "日期格式应为 YYYY-MM-DD" })); return; }
        res = await httpGet(H + "/consume?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未知 action" })); return;
      }
      const okFlag = res && res.code == "10000";
      console.log("[补签] " + action + " => " + (res ? res.code + " " + (res.message || "") : "无响应"));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: !!okFlag, code: res ? res.code : "", message: res ? (res.message || "") : "无响应", data: res ? res.data : null }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.5 API: 电池/充电状态（充电剩余时间估算用：电流/电量/电压/充电中） ==========
  if (method === "GET" && path === "/api/battery-state") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      let vin = String(_u.searchParams.get("vin") || "").trim();
      if (!vin) {
        const list = await fetchVehicleList(acc, cfg) || [];
        const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
        if (!vehicles.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未获取到绑定车辆" })); return; }
        vin = vehicles[0].vinNo;
      }
      const b = await fetchBatteryChargeState(acc, cfg, vin);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, vinNo: vin, charging: /充电/.test(String(b.chargeState || "")), current: b.current, soc: b.soc, voltage: b.voltage, chargeState: b.chargeState, fullChargeTime: b.fullChargeTime, fullChargeTimeSecond: b.fullChargeTimeSecond }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 车辆状态监控（快照 + 离线判断） ==========
  if (method === "GET" && path === "/api/vehicle-monitor") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      let vin = String(_u.searchParams.get("vin") || "").trim();
      let vehicles = [];
      if (!vin) {
        vehicles = await fetchVehicleList(acc, cfg) || [];
        if (!vehicles.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未获取到绑定车辆" })); return; }
        vin = vehicles[0].vinNo;
      }
      const snap = await fetchVehicleSnapshots(acc, cfg, vin);
      if (!snap) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "快照获取失败" })); return; }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, snapshot: snap, vehicles: vehicles }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.12 API: 后台监控 tick（原生定时器周期调用，跑充满/离线去重检查并本地通知） ==========
  if (method === "GET" && path === "/api/vehicle-monitor-tick") {
    try { await checkVehicleMonitor(getConfig()); } catch(e) {}
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true }));
    return;
  }

  // ========== v2.14.21 API: 小组件快照（iOS WidgetKit 读取；主 App 周期调用并写入 App Group 共享目录） ==========
  if (method === "GET" && path === "/api/widget-snapshot") {
    try {
      const cfg = getConfig();
      const accounts = getAccounts();
      if (!accounts.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "暂无账号" })); return; }
      // 小组件显示车辆：cfg.widgetVehicle = "userId|vin"，未配置取第一个账号第一台车
      let userId = "", vin = "";
      const wv = String(cfg.widgetVehicle || "");
      if (wv.indexOf("|") > 0) { const p = wv.split("|"); userId = p[0] || ""; vin = p[1] || ""; }
      let acc = userId ? accounts.find(a => String(a.userId) === String(userId)) : null;
      if (!acc) acc = accounts[0];
      const data = await fetchAccountData(acc, cfg, vin || undefined);
      const v = data.vehicle || {};
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
        ok: true, ts: new Date().toISOString(),
        accountName: data.userName || "", userId: data.userId || "",
        vehicleName: v.vehicleName || "", vehicleModel: v.vehicleModel || "",
        hasVehicle: !!v.hasVehicle,
        soc: v.batteryPercent || 0, range: v.residualRangeKm || 0, rangeEstimated: !!v.rangeEstimated,
        voltage: v.voltage || 0, current: v.current || 0, chargeState: v.chargeState || "未充电",
        online: v.online || "",
        score: data.score || 0, continueDays: data.continueDays || 0, todayScore: data.todayScore || 0,
        signedToday: !!data.signedToday,
        todayDistance: v.todayDistance || 0, totalMileage: v.totalMileage || 0
      }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 车控扩展（充电功率/限速档位/防盗/音效/储物箱） ==========
  if (method === "POST" && path === "/api/vehicle-control-ext") {
    try {
      const body = parseBody($request);
      const cfg = getConfig();
      const acc = findAccByUserId(body.userId || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未找到账号" })); return; }
      const action = String(body.action || "");
      let vin = String(body.vin || "").trim();
      let deviceName = "";
      const list = await fetchVehicleList(acc, cfg) || [];
      if (!vin && list.length) vin = list[0].vinNo;
      const veh = list.find(v => v.vinNo === vin) || list[0] || {};
      deviceName = veh.deviceName || "";
      if (!vin) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未获取到绑定车辆" })); return; }
      // 2026-09-27: 官方已将 vehicleSet 写操作迁移到新协议 addVehicleSet。
      // 旧端点 /vehicleSet/chargePower 在 OAuth 层直接返回 401 invalid_token（token 实际有效），面板曾误报"token已失效"。
      // 新协议需官方协议头（appid + 官方UA + 含body签名），即 socialHeaders 同款（HAR 抓包 1:1 复刻，实测 code 10000）。
      const base = accHeaders(acc, {});
      const T = "https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp";
      let res = null, okMsg = "指令已下发";
      if (action === "options") {
        // 充电功率选项必须带 flag=1 才返回新档位 200-1200（不带返回旧档 350-1900），且需官方协议头
        const cpQuery = "vinNo=" + encodeURIComponent(vin) + "&flag=1";
        const cp = await httpGet(T + "/vehicleSet/chargePower/options?" + cpQuery, socialHeaders(cleanToken(acc.token), acc.userId, cpQuery, '', cfg));
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, chargePower: cp && cp.code == "10000" ? cp.data : [] }));
        return;
      } else if (action === "chargePower") {
        // 新协议 addVehicleSet：serviceCode 603980102 = CHARGING_POWER_STANDARD（200-1200，步长100）
        const val = String(body.value || "");
        const payload = JSON.stringify({ serviceCode: 603980102, commandParam: val, flag: true, vin: vin, vehicleSetEnum: "CHARGING_POWER_STANDARD", message: 0 });
        res = await httpPost(T + "/vehicleSet/addVehicleSet", socialHeaders(cleanToken(acc.token), acc.userId, '', payload, cfg), payload);
        // v2.16.5：1200 档实际语义为「无限制」，文案修正（下发值不变）
        okMsg = "充电功率已设为 " + (val === "1200" ? "无限制" : val + "W");
      } else if (action === "vcuStealControl") {
        // 防盗：需 vinNo + lockType + 云端设备号(deviceName) + 手机号
        const payload = JSON.stringify({ vinNo: vin, lockType: String(body.lockType || ""), deviceName: deviceName, phone: String(body.phone || acc.phone || "") });
        res = await httpPost(T + "/vehicleSet/vcuStealControl", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "防盗指令已下发";
      } else if (action === "soundEffect") {
        const payload = JSON.stringify({ vinNo: vin, deviceName: deviceName, soundStatus: String(body.value || "") });
        res = await httpPost(T + "/vehicleSet/setSoundStatus", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "音效指令已下发";
      } else if (action === "storageBox") {
        const payload = JSON.stringify({ vinNo: vin });
        res = await httpPost(T + "/vehicleSet/storageBox/dismantle", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "储物箱指令已下发（需VIP）";
      } else {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未知操作类型" })); return;
      }
      const chk = vehicleCheckRes(res, okMsg);
      // 其余旧端点（限速/音效/防盗/储物箱）若也被官方迁移，会返回 invalid_token，不一定真是 token 失效，避免误报
      if (!chk.ok && /token已失效/.test(String(chk.message || ""))) chk.message = "官方接口调用失败（接口可能已变更，请先在首页确认 token 是否有效）";
      console.log("[车控扩展] " + action + " => " + (chk.ok ? "成功" : "失败:" + chk.message));
      try {
        const _vd = new Date();
        addLog({
          time: _vd.toLocaleString("zh-CN", { hour12: false }),
          date: _vd.getFullYear() + "-" + String(_vd.getMonth()+1).padStart(2,"0") + "-" + String(_vd.getDate()).padStart(2,"0"),
          type: "vehicle", action: "ext:" + action, actionText: "车控扩展·" + action,
          userName: acc.userName || "未知", userId: acc.userId,
          success: !!chk.ok, message: chk.message || "", error: chk.ok ? "" : (chk.message || "指令失败")
        });
      } catch(e) {}
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(chk));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 信息聚合中心（未读消息/活动/优惠券/OTA/盲盒记录/骑行排行） ==========
  if (method === "GET" && path === "/api/info-center") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const hd = (query) => appQueryGetHeaders(acc, query, cfg);
      let vin = String(_u.searchParams.get("vin") || "").trim();
      const out = { ok: true };
      const tasks = [
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/app/Message/allUnRead", hd("")).then(r => { out.unread = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mall/cfmotoservermall/app/coupon/myCoupons?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.coupons = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/activityPrizeRecord/app/page?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.prizeRecords = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/riderank", hd("")).then(r => { out.riderank = r && r.code == "10000" ? r.data : null; })
      ];
      if (!vin) {
        try { const list = await fetchVehicleList(acc, cfg) || []; if (list.length) vin = list[0].vinNo; } catch(e) {}
      }
      if (vin) {
        tasks.push(httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ota/list?vinNo=" + encodeURIComponent(vin), hd("vinNo=" + encodeURIComponent(vin))).then(r => { out.ota = r && r.code == "10000" ? r.data : null; }));
      }
      await Promise.all(tasks);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(out));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // API: 当前安装信息（iOS 签名方式检测 / 运行环境）
  if (method === "GET" && path === "/api/app-install-info") {
    let env = "unknown";
    if (typeof module !== "undefined" && module.exports) env = "desktop";
    else if (typeof $task !== "undefined") env = "quantumultx";
    else if (typeof $rocket !== "undefined") env = "shadowrocket";
    else if (typeof $loon !== "undefined") env = "loon";
    else if (typeof $environment !== "undefined" && $environment["surge-version"]) env = "surge";
    else if (typeof $environment !== "undefined" && $environment["stash-version"]) env = "stash";
    const info = { env: env, ios: false, signMethod: "", hasProvision: false, expiration: "", expirationUnix: 0, daysRemain: 0, teamId: "", teamName: "", provisionsAllDevices: false, deviceCount: 0 };
    if (env === "loon" && typeof $appInstallInfo === "function") {
      try {
        const ni = $appInstallInfo();
        if (ni && typeof ni === "object") Object.assign(info, ni, { ios: true, env: "ios" });
      } catch (e) {}
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(info));
    return;
  }

  // API: 一键备份全部账号+面板配置
  if (method === "GET" && path === "/api/backup") {
    const payload = {
      ok: true,
      app: "极核ZEEHO",
      type: "zeeho_backup",
      version: SCRIPT_VERSION,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      accounts: getAccounts(),
      config: getConfig()
    };
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(payload));
    return;
  }

  // API: 导入恢复备份（body.json 为完整备份 JSON 字符串，或 body.data 为备份对象）
  if (method === "POST" && path === "/api/import") {
    const body = parseBody($request);
    let bk = null;
    try {
      bk = typeof body.json === "string" && body.json.trim() ? JSON.parse(body.json) : (body.data || body);
    } catch(e) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "备份内容不是有效JSON" }));
      return;
    }
    if (!bk || (bk.type !== "zeeho_backup" && !Array.isArray(bk.accounts))) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "备份格式不正确" }));
      return;
    }
    // 恢复账号：统一清洗 Token / BarkKey（与保存账号同一逻辑）
    const list = (Array.isArray(bk.accounts) ? bk.accounts : []).map(a => Object.assign({}, a, {
      token: cleanToken(a.token || ""),
      barkKey: cleanBarkKey(a.barkKey || "")
    }));
    const accOk = saveAccounts(list);
    // 恢复配置：缺失字段沿用当前值
    let cfgOk = true;
    if (bk.config && typeof bk.config === "object") {
      try {
        const cur = getConfig();
        const next = {
          app: { appId: bk.config.app?.appId || cur.app.appId, appSecret: bk.config.app?.appSecret || cur.app.appSecret },
          h5: { appId: bk.config.h5?.appId || cur.h5.appId, appSecret: bk.config.h5?.appSecret || cur.h5.appSecret },
          community: {
            enablePost: bk.config.community?.enablePost !== false,
            enableLike: bk.config.community?.enableLike !== false,
            enableComment: bk.config.community?.enableComment !== false,
            enableShare: bk.config.community?.enableShare !== false,
            enableDelete: bk.config.community?.enableDelete !== false
          },
          vehicleAesKey: String(bk.config.vehicleAesKey || "").trim(),
          autoRefreshSec: normalizeRefreshSec(bk.config.autoRefreshSec)
        };
        cfgOk = saveConfig(next);
      } catch(e) { cfgOk = false; }
    }
    console.log(`[备份恢复] 账号 ${list.length} 个，配置${cfgOk ? "已" : "未"}恢复 (${SCRIPT_VERSION})`);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: accOk, count: list.length, configOk: cfgOk }));
    return;
  }

  // 配置页
  if (path === "/config") {
    const cfg = getConfig();
    const accounts = getAccounts();
    const html = renderConfig(accounts, cfg);
    sendResp(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, html);
    return;
  }

  // 看板页（默认）→ 输出整合后的 LITE 轻应用界面（数据走本机 /api/*，前端自动进入面板模式）
  sendResp(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, '<script>window.__PANEL_MODE__=1<\/script>' + __APP_HTML());
})();;

// ========== Env 类（兼容各代理工具） ==========
function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;"POST"===t&&(s=this.post);const i=new Promise((t,i)=>{s.call(this,e,(e,s,o)=>{e?i(e):t(s)})});return e.timeout?((e,t=1e3)=>Promise.race([e,new Promise((e,s)=>{setTimeout(()=>{s(new Error("请求超时"))},t)})]))(i,e.timeout):i}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null){try{return JSON.stringify(e)}catch{return t}}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(e),o=s?this.getval(s):"";if(o)try{const e=JSON.parse(o);t=e?this.lodash_get(e,i,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(t),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const t=JSON.parse(a);this.lodash_set(t,o,e),s=this.setval(JSON.stringify(t),i)}catch(t){const r={};this.lodash_set(r,o,e),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(e,t);return s}lodash_get(e,t,s){const i=t.replace(/\[(\d+)\]/g,".$1").split(".");let o=e;for(const e of i)if(o=Object(o)[e],void 0===o)return s;return o}lodash_set(e,t,s){return Object(e)!==e||(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce((e,s,i)=>Object(e[s])===e[s]?e[s]:e[s]=(Math.abs(t[i+1])|0)===+t[i+1]?[]:{},e)[t[t.length-1]]=s),e}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);case"Node.js":return this.data=this.loaddata(),this.data[e];default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);case"Node.js":return this.data=this.loaddata(),this.data[t]=e,this.writedata(),!0;default:return this.data&&this.data[t]||null}}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t);if(!s&&!i)return{};{const i=s?e:t;try{return JSON.parse(this.fs.readFileSync(i))}catch(e){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t),o=JSON.stringify(this.data);s?this.fs.writeFileSync(e,o):i?this.fs.writeFileSync(t,o):this.fs.writeFileSync(e,o)}}get(e,t=()=>{}){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$httpClient.get(e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(e),this.got(e).then(e=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=e,n=s.decode(a,this.encoding);t(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:i,response:o}=e;t(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(e,t=()=>{}){const s=e.method?e.method.toLocaleLowerCase():"post";switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$httpClient[s](e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":e.method=s,$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(e);const{url:o,...r}=e;this.got[s](o,r).then(e=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=e,n=i.decode(a,this.encoding);t(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:s,response:o}=e;t(s,o,o&&i.decode(o.rawBody,this.encoding))})}}queryStr(e){let t="";for(const s in e){let i=e[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),t+=`${s}=${i}&`)}return t=t.substring(0,t.length-1),t}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.map(e=>e??String(e)).join(this.logSeparator))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(e);break;case"Node.js":process.exit(0)}}}(e,t)}