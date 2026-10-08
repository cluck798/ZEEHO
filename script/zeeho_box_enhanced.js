/*
#!name=极核 ZEEHO 签到面板 V2.15.3
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.15.3

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.15.3, requires-body=true, timeout=60, tag=极核面板V2.15.3

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
// 版本: v2.15.3
// 更新日期: 2026-10-07
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.15.3";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-10-09 v2.15.3 官方 App 设备指纹自救（命中被拉黑指纹自动换新）+ 随机设备指纹 + 投屏桥修复 + 首屏提速)`);

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
      const knownSecrets = {
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
  h5:  { appId: "Sw5F9uJi", appSecret: "46870a8f678a09109468f5b0168818b91c292845" },
  community: { enablePost: true, enableLike: true, enableComment: true, enableShare: true, enableDelete: true },
  vehicleAesKey: "ce2cd7cb57124c1349dd8543bf6fd31d", // 云端开/关锁AES-256-ECB密钥(32位)。已内置默认密钥，可在配置页修改
  vehicleControlRisk: "", // 车控风险确认：需在设置页填写「我自愿承担相关风险」并保存后才能使用车控功能
  autoRefreshSec: 60 // 看板首页自动刷新间隔(秒)，配置页可改；规范化见 normalizeRefreshSec
};

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
        h5:  { appId: c.h5?.appId || storeH5.appId || DEFAULT_CONFIG.h5.appId, appSecret: c.h5?.appSecret || storeH5.appSecret || DEFAULT_CONFIG.h5.appSecret },
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
  // 看板无配置时，使用捕获脚本配置 + 默认值
  return {
    app: { appId: storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
    h5:  { appId: storeH5.appId || DEFAULT_CONFIG.h5.appId, appSecret: storeH5.appSecret || DEFAULT_CONFIG.h5.appSecret },
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
function getAccounts() {
  try {
    const raw = $.getdata(CK_DATA);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [arr];
    }
  } catch(e) {}
  return [];
}
function saveAccounts(list) {
  try { $.setdata(JSON.stringify(list), CK_DATA); return true; } catch(e) { return false; }
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

    // 1. 签到
    try {
      const infoRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
      const todayEntry = (infoRes?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
      // signStatue: 3/5=已签到, 0=盲盒开启日（已签到+已开盒）, 4=漏签, 2=未来
      if (todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5 || todayEntry.signStatue == 0)) {
        result.steps.push("今日已签到");
      } else {
        // 多账号连签易触发“请稍后/操作频繁”限流，退避后最多重试3次
        let signRes = null, signMsg = "未知";
        for (let at = 1; at <= 3; at++) {
          signRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/signin`, { ...baseHeaders, ...getSign("h5", {}, {}, cfg) }, {});
          if (signRes?.code == "10000") break;
          signMsg = signRes?.message || signRes?.error || "未知";
          if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(signMsg) && at < 3) {
            await new Promise(r => setTimeout(r, (at + 1) * 2000));
            continue;
          }
          break;
        }
        if (signRes?.code == "10000") {
          const infoRes2 = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
          const te = (infoRes2?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
          result.signinScore = te ? (Number(te.integralScore) || 0) : 0;
          result.steps.push(`签到成功 +${result.signinScore}`);
        } else {
          // 重试后仍未成功：回查今日是否其实已签上
          try {
            const chk = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
            const ce = (chk?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
            if (ce && (ce.signStatue == 3 || ce.signStatue == 5 || ce.signStatue == 0)) result.steps.push("今日已签到");
            else result.steps.push(`签到失败: ${signMsg}`);
          } catch(e) { result.steps.push(`签到失败: ${signMsg}`); }
        }
      }
    } catch(e) { result.steps.push(`签到异常: ${e}`); }

    // 2. 查询连签和盲盒
    try {
      const infoRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
      const list = infoRes?.data?.nowSignDetailVos || [];
      const todayIdx = list.findIndex(x => x.createDate === today);
      let cont = 0;
      // 盲盒开启日(st=0)是连签周期边界：今日是盲盒日计入1天；往前的盲盒日说明官方连签已重置，停止计数
      for (let i = todayIdx; i >= 0; i--) { const st = list[i]?.signStatue; if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break; }
      result.continueDays = cont;
      const signCount = Number(infoRes?.data?.signCount) || 0;
      if (signCount >= 30) {
        const blindRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/supplementPrize?supplementDate=${today}`, { ...baseHeaders, ...getSign("h5", { supplementDate: today }, '', cfg) });
        if (blindRes?.code == "10000") {
          result.blindBoxScore = Number(blindRes?.data?.integral || blindRes?.data?.integralScore || 0);
          // 盲盒日志：≥10分显示获得积分，低于10分显示距盲盒剩余天数（避免显示"盲盒获得 +0"）
          if (result.blindBoxScore >= 10) {
            result.steps.push(`盲盒获得 +${result.blindBoxScore} (${blindRes?.data?.prizesName || "积分"})`);
          } else {
            const _bd = result.continueDays === 0 ? 0 : ((result.continueDays - 1) % 30) + 1;
            const _br = 30 - _bd;
            result.steps.push(`距盲盒剩余 ${_br} 天`);
          }
        }
      } else {
        result.steps.push(`盲盒未解锁(${signCount}/30)`);
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
        const postBody = JSON.stringify({ postSubInfo: { topicList: [] }, topicid: "", postcontent: "开心的一天" });
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
        const listRes = await httpGet(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo?userId=${userId}&page=1&pageSize=10`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
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
          const cmtBody = JSON.stringify({ postid: String(postId), userId: String(userId), comments: "lucky", sendTos: "[\n\n]" });
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
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const deviceId = getDeviceIdentify(acc);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": acc.userId || "",
      ...signH
    };
    const url = `https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleHomePageV2/${encodeURIComponent(vinNo)}?uniqueIdentify=${deviceId}&phoneDeviceName=ios_${deviceId}`;
    const res = await httpGet(url, headers);
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
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicle/tire/monitoring?vinNo=${encodeURIComponent(vinNo)}&timePeriodType=1`, {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": acc.userId || "",
      ...signH
    });
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
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const month = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0");
    const [homeRes, myRes] = await Promise.all([
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?vinNo=${encodeURIComponent(vinNo)}`, {
        "Authorization": `Bearer ${token}`, "Content-Type": "application/json;charset=UTF-8", "interfaceversion": "2", "user_id": acc.userId || "", ...signH
      }),
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?vinNo=${encodeURIComponent(vinNo)}&month=${month}`, {
        "Authorization": `Bearer ${token}`, "Content-Type": "application/json;charset=UTF-8", "interfaceversion": "2", "user_id": acc.userId || "", ...signH
      })
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
        chargeCount: isFinite(chargeCount) ? chargeCount : 0
      };
    }
    return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0 };
  } catch(e) { return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0 }; }
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
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${curMonth}`, { ...baseHeaders, ...getSign("h5", { month: curMonth }, '', cfg) }),
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/signin/info?month=${lastMonth}`, { ...baseHeaders, ...getSign("h5", { month: lastMonth }, '', cfg) })
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXNocmluazowO292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4yOCl9Ci5icmFuZC1tYXJrIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7b2JqZWN0LWZpdDpjb3Zlcn0KLmJyYW5kLXR4dHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5icmFuZC10eHQgaDF7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4ycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYnJhbmQtdHh0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHh9CgouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIGltZytzdmd7ZGlzcGxheTpub25lfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0g5YWl5Zy66Zeq5bGP77ya6aaW5bin5Y2z5pi+56S677yM5pWw5o2u5bCx57uq5ZCO5reh5Ye6ID09PT09PT09PT09PSAqLwojc3BsYXNoe3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDo5OTk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudCgxMjAlIDYwJSBhdCA1MCUgMCUscmdiYSgxNCwxNDMsMTc4LC4xNiksdHJhbnNwYXJlbnQgNjAlKSx2YXIoLS1iZyk7dHJhbnNpdGlvbjpvcGFjaXR5IC40cyB2YXIoLS1lYXNlKSx0cmFuc2Zvcm0gLjRzIHZhcigtLWVhc2UpfQojc3BsYXNoLm91dHtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKDEuMDQpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5zcC1tYXJre3dpZHRoOjg0cHg7aGVpZ2h0Ojg0cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JveC1zaGFkb3c6MCAxNHB4IDQwcHggcmdiYSgxNCwxNDMsMTc4LC40KTthbmltYXRpb246c3AtaW4gLjVzIHZhcigtLXNwcmluZykgYm90aH0KLnNwLW1hcmsgc3Zne3dpZHRoOjQ2cHg7aGVpZ2h0OjQ2cHh9Ci5zcC10aXRsZXttYXJnaW4tdG9wOjIwcHg7Zm9udC1zaXplOjIxcHg7Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOjFweDthbmltYXRpb246c3AtdXAgLjRzIC4wNXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLXN1YnttYXJnaW4tdG9wOjdweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQzKTtsZXR0ZXItc3BhY2luZzozcHg7YW5pbWF0aW9uOnNwLXVwIC40cyAuMXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWR7bWFyZ2luLXRvcDozNHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTthbmltYXRpb246c3AtdXAgLjRzIC4xNXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWQgLnNwaW5uZXJ7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItdG9wLWNvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItcmFkaXVzOjUwJTthbmltYXRpb246c3BpbiAuN3MgbGluZWFyIGluZmluaXRlfQpAa2V5ZnJhbWVzIHNwLWlue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSguNikgdHJhbnNsYXRlWSgxMHB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnNjYWxlKDEpIHRyYW5zbGF0ZVkoMCl9fQpAa2V5ZnJhbWVzIHNwLXVwe2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEycHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKX19Cjwvc3R5bGU+CjwhLS0g6auY5b635Zyw5Zu+IFNESyDkuI3lho3lkIzmraXliqDovb3vvIjljp8gc2NyaXB0IOagh+etvuS8mumYu+WhniBsb2FkIOS6i+S7tu+8jOaXouaLluaFoummluWxj+OAgeWPiOaKiuWOn+eUn+ahpeazqOWFpeaOqOi/n+WIsOaVsOaNrui/lOWbnuS5i+WQju+8ie+8muaUueeUsSBuYXZMb2FkQU1hcCgpIOi/m+WFpei9pui+hi/lr7zoiKrpobXml7bmjInpnIDms6jlhaUgLS0+CjwvaGVhZD4KPGJvZHk+CjxkaXYgY2xhc3M9ImJnLWdsb3ciPjwvZGl2Pgo8ZGl2IGlkPSJzcGxhc2giPgogIDxkaXYgY2xhc3M9InNwLW1hcmsiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNNCAxMy41QzQgOS4wOCA3LjU4IDUuNSAxMiA1LjVzOCAzLjU4IDggOCIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTEyIDEzbDcuNSA1LjUiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjcuNSIgY3k9IjE2LjUiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjxjaXJjbGUgY3g9IjE3IiBjeT0iMTkiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjwvc3ZnPjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLXRpdGxlIj7mnoHmoLggWkVFSE88L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC1zdWIiPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3AtbG9hZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiPjwvc3Bhbj7mraPlnKjliqDovb3mlbDmja7igKY8L2Rpdj4KPC9kaXY+CjxkaXYgaWQ9ImFwcCI+CiAgPGhlYWRlciBjbGFzcz0iYXBwLWhlYWRlciI+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC1tYXJrIj48aW1nIHNyYz0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFKQUFBQUNRQ0FZQUFBRG5SdUs0QUFBQUFYTlNSMElBcnM0YzZRQUFBRkJsV0VsbVRVMEFLZ0FBQUFnQUFnRVNBQU1BQUFBQkFBRUFBSWRwQUFRQUFBQUJBQUFBSmdBQUFBQUFBNkFCQUFNQUFBQUJBQUVBQUtBQ0FBUUFBQUFCQUFBQWtLQURBQVFBQUFBQkFBQUFrQUFBQUFBdDRpU1dBQUFCV1dsVVdIUllUVXc2WTI5dExtRmtiMkpsTG5odGNBQUFBQUFBUEhnNmVHMXdiV1YwWVNCNGJXeHVjenA0UFNKaFpHOWlaVHB1Y3pwdFpYUmhMeUlnZURwNGJYQjBhejBpV0UxUUlFTnZjbVVnTmk0d0xqQWlQZ29nSUNBOGNtUm1PbEpFUmlCNGJXeHVjenB5WkdZOUltaDBkSEE2THk5M2QzY3Vkek11YjNKbkx6RTVPVGt2TURJdk1qSXRjbVJtTFhONWJuUmhlQzF1Y3lNaVBnb2dJQ0FnSUNBOGNtUm1Pa1JsYzJOeWFYQjBhVzl1SUhKa1pqcGhZbTkxZEQwaUlnb2dJQ0FnSUNBZ0lDQWdJQ0I0Yld4dWN6cDBhV1ptUFNKb2RIUndPaTh2Ym5NdVlXUnZZbVV1WTI5dEwzUnBabVl2TVM0d0x5SStDaUFnSUNBZ0lDQWdJRHgwYVdabU9rOXlhV1Z1ZEdGMGFXOXVQakU4TDNScFptWTZUM0pwWlc1MFlYUnBiMjQrQ2lBZ0lDQWdJRHd2Y21SbU9rUmxjMk55YVhCMGFXOXVQZ29nSUNBOEwzSmtaanBTUkVZK0Nqd3ZlRHA0YlhCdFpYUmhQZ29aWHVFSEFBQU5DRWxFUVZSNEFlMWRXMHdWU1JvdVJJS2lZa2hFb21Jd2l6aFI0bzFWSnpxclVYZ3dXVFhlMEtoeEpFWmR2Q1dqa015cmlZOUd4bHMwRVYrY2pNWWIzalBSbHhHZEhSUGQwWWs4N0VaV1VOZFJFMFJGRVJGRVlQK3Y3VDZlYzdyT3BmdDB3Nm5ULzUvODlPbTZkZFZYWDZxcXUvNzZTUkk5Sk4zZDNmM29VYm1rbzBsSGtXYnBta25YZE5LQnBJTkkwMGhUU1ZOMFRhWXJ0QTlwa3AvU3o0U1RibXFSb1YzMHUxUFhEcnBDMjBsYlNkK1J0cEEya3phU051ajZtSzUxcFBWSlNVbHRkSFZkMENHdUNCRm1IQlZjUkRwVjE2L282dHJ6cUd5V0x3aUFoTFdrdit2NkN4SHFQMStpbmZ2bGFJY1NhUXFvYXY4Z25VZWE3VncxdVNRSEVIaEtaZnhNV2tsaytzT0I4clFpWWlZUWtRWmxGSk4rUi9xTlZpci9pWGNFYmxJRjk1RldFWmt3V3RtV21BaEU1UGtiUGZrSFVreFRMT29oZ0NtdWpFajBtOTJxMnlJUUVTZURIbmlRZEtYZEIzTyt1RUxnQk5WbUN4R3B5V3F0TEJPSXlET0xIbktNZEtUVmgzSDZ1RWJnVDZyZGFpTFJyMVpxaVZmanFJWElVMDZKcTBtWlBGR2pwa3hDOUdtMTNzZFJWenFxRVlnS1Jib0swdTFSbDh3SlZVWmdEMVcrUEpvRmRrUUM2ZVQ1a1FyOFZtVkV1TzZXRWZpSmNwUkVJbEUwVXhoR0hpYVBaZnlWejRBK1I5K0hsYkFFMHVkRG5yYkNRcGpRa2RzanJZbENUbUdVRVc5YldEQ0hKVmxDdzhlTkF3TFlrNXNUNnUxTVNpQWlENzd6MUpCaVpjN0NDT0FWZnlLUnlQU2RLTlRvZ28rRVRCNG1qb0VBdUFCT21NUTBBdEhvZysySmY1cFNjZ0FqSU1STUdvVUN0ajBDQ0VUa3dmMXRVdDdiWXJySUVNRGUyZGRFSXQ4R2JQQVVobDExSm84TU9nNERBdUFHT09LVFlBTEJKSU9GRVFpSFFBQkhmRk1ZVFY4d0Jyc2JMaWZITVFJNkFuK2xhVXd6U3ZNZmdVb1pIa1lnU2dSZ2RhcUovd2lFZDMwMlE5V0I0VXRZQko3U0NLUjk1dEZHSUpxKzhwazhZUUhqeUVBRXNva3pPRFRoMjZZb0RJem5PMFlnSWdKRlNHR3NnYVpGVE00SkdJRkFCRFRPR0FUaWJ6K0I0UEJkWkFRMHppVFJYSVlUb3pqdDZGdFFSODdMS1JnQjdRUnRHa2FnWEZJbUR6UENLZ0xnVEM0SWxHYzFKNmRuQkhRRThrQ2dISWFERWJDSlFBNElCQzhaTEl5QUhRU3ltRUIyWU9NOEJnSWFnVEtOTzc0eUFoWVJ5TVFJQk9kT0xJeUFIUVRTUVNCNEJtTmhCT3dnTUJBRUdtUW5KK2RoQk1BZEVBZytDVmtZQVRzSWFGK2k0ZENTaFJHd2cwQXFSaUI0UTJWaEJPd2drTUlFc2dNYjV6RVEwQWlVYk56eGxSR3dpRUF5UmlBbWtFWFVPTGtQQVkxQUlCRUxJMkFIZ1Q0Z0Q5c0MyWUdPOHdDQkpDWVFFeUVXQkpMNmdrV3hsQkFwYjFWVmxXaG93UDhDWVFFQ25aMmRZdG15WldMWXNHRlNRTzdldlN0dTNib2xqYk1hT0hyMGFERjM3bHlyMmF5a1R4SmtFKzJxVEpnd0FaNGNXSFVNU2t0THUxdGJXNldZRTNHNk16TXpIY05xNGNLRjB1YzRHWWdSeUZYcDM3Ky9xK1dyVkRpUlJ4dzZkRWowMFphZWdUV3ZxYWtSUzVjdUZZMk5qWUVSTWR5bHBycS95Y0J2WURGMGtKV3NhOWFzRVFjT0hKQ1NwN2EyVml4ZXZGZzhlL2JNU3BGeGtaWUoxQVBkVUZ4Y0xBNGZQaXhTVXN5N1JvOGVQUktMRmkwU3VLb29UQ0NYZTIzZXZIbmk2Tkdqb2w4L0hMOExGSXc0UzVZc0VmZnYzdytNVU9pT0NlUmlaODJaTTBjY1AzNWNEQmd3d1BRVXJIVXdNdDI3ZDg4VXAxSUFFOGlsM3BvK2ZibzRmZnEwR0R4NHNPa0piOTY4RWN1WEwzZnNkZDMwZ0I0TVlBSzVBUGJreVpNRnZuOE5HVExFVkhwTFM0dFl0V3FWdUg3OXVpbE94UUFta01POU5uYnNXSEh1M0RreGZQaHdVOGx0YlcyaXBLUkVYTGx5eFJTbmFnQVR5TUdleTgzTkZSY3VYQkNqUm8weWxkclIwU0UyYk5pZ2tjc1VxWEFBRThpaHpzdk96aGJuejU4WFk4YU1NWlhZMWRVbHRtN2RLbzRkd3o5NlRDeGhBam5RbjBPSERoVm56NTRWNDhlUGw1WldYbDR1S2lzcnBYR3FCektCWXV6QmpJd01jZWJNR1RGdG10bkoyOGVQSDBWWldabll1M2R2akUrSjMreXU3NFU1MGZUMDlIUXhlL1pzUVo1Qm5Tak9zVEt3cDdWNTgyWXhheGIrTTVaWjd0eTVJK3JxNmdSdGFwb2p3NFMwdDdlTGE5ZXVDUkF3M2tVSkF1WGs1SWlMRnkvR081YW0rczJZTVVOY3VuVEpGQjRwQU4rSjh2THl4TXVYTHlNbDdmVjRKYVl3TWo4UWVJdnhpbUFFUXB0VkVDVUlwQUtRWHEyak1nUktUdmJPNFJHWnZWQzhFbFNKTlJETVFGKzhlQ0UxaCtnSllER2Q0RnNPV1F1R1hNZzNOemM3TnMyK2V2VkttU2xNQ1FJOWVQQkFrR2xzeU01emswUUdlWGJzMktGOURKUTlDL3RhNjlhdEU5am5ja0pBVml5a1ZSQWxDUFRwMHlkSFRUMnRkc3kyYmR2RWxpMWJwQVNHQVR4MjFwMDBSYlZhdjk1TXI4d2FxTGRBMnJScGs2aW9xSkNhb3NLV3gyazc1dDVxcDkzbk1vSENJSWVkOC8zNzkwdkpBeXRDV0JNK2YvNDhUQW1KSDhVRUN0SEhPTHNGTythK2ZjMnovTU9IRDVXMll3N1JaRnZCVENBSmJQUG56OWZzbUdYSFlndzdacHlrWVBueTc1NFlDeDJCb3FJaXpld2lMYzNzK1ErZkVyRG13Umt1bHM4SThBamt4d1RzWFowOGVWSnF4OXpVMUtTOWJkMitmZHN2Qi85a0F1a2NLQ2dvaUdqSGZPUEdEV1pNRUFKTUlBSWtQejlmTXpXVk9UeUFIVE5PbFY2OWVqVUlPcjRGQXA0bkVEeFl3QlFWSmlQQkFndUE5ZXZYYS9IQmNYei9HUUZQRTJqa3lKSGF5QVBibTJEQmRnSytQdU5nSUV0b0JEeExvS3lzTEkwOE1qdG1rQWZiRjBlT0hBbU5ITWRvQ0ppL2tzVWhNREJsbFgzUXMxdFZIUGpEcWRFcFU2YVlpc0RPLzg2ZE84WEJnd2Q3YmZjZmxWTEZnRTRKQW1HZGdsTVBUcEFJdStzNGJqeGl4QWdUZVl3QWJJNnVXTEhDdU8zeEs4dzVGaXhZb01TT3ZCSUVnbWNMMlZUalJzL0NjQTF2WmIwcHIxKy9GcW9ZMENteEJzS29vY3FRN2dUeFZHcXJFZ1J5b2xPNERIY1FVSUpBc0JHV2VmZHlCNUxlTHhYN2NQRjJCaTRVS2txc2dXQnpnOWRxSytzQ3d4UVZaOUt4Q0pkSmRYVzF1SHo1Y3R4MTF2djM3d1ZVQlZHQ1FEaGd0Mi9mUHN0NDRsZ3hQaGJLQkhiTWNHejU5dTFiV1RTSFJZbUFFZ1NLc2kwQnllRFFZUGZ1M1FGaHhvMWh4OHprTVJDeGYxVmlEV1MxZVJzM2JoUzdkdTJTWm9NZE0zd1RldFVJWGdwS0RJRUpSeURZTVlmeXgyellNYXZvanptR1BuWTFhMElSeVBESExQdGlEVC9NV1BPbzZvL1pWUmJFVUhqQ0VNand4eHpLamhua1Vka2Zjd3g5N0dyV2hDQlFZV0ZoV0gvTWJNZnNIb2VVSnhEOE1aODZkVXBxeDJ6NFkyWTdaaWFRRkFINFk4WXVmU2gvekN0WHJrd1lmOHhTQU9JZ1VOa1JhTnk0Y1dIdG1QRTJ4bmJNN2pOTVNRTEJIelBzbUwza2o5bDlLdGg3Z25JRWdqOW1lSUwzbWo5bWU5M3JmaTdYQ2ZUaHd3ZkhXZ0YvekNBUGZBVUZDNTZETDlDSjZvODV1TDNSM01QWG90dmkrbDdZMnJWcnhaTW5UeHhwQnh3ZVRKMDZWVnBXZlgyOXdML1h4SzY5S3FZUTBvWTRHRGhwMGlRSFM1TVhsVVJtRDEwVUZWOE9tT1YxNWRENFE2QWJVNWdhL21UakR6eXVFWEdIQ2NRMGlBVUJqVUNZd2xnWUFUc0lkR0VFNnJTVGsvTXdBdUFPRTRoNUVBc0NHb0c4ODA4b1lvR0s4OG9RNk1BSXhBU1NRY05oMFNDZ0Vjajl6NVhSVklYVHFJaEFPMGFnVmhWcnpuV09Dd1JhUWFCM2NWRVZyb1NLQ0x3RGdaejVEeUVxTnAvckhDc0NMU0JRYzZ5bGNIN1BJdEFNQWpWNnR2bmM4RmdSYUFTQkdtSXRoZk43Rm9FR0pwQm4rOTZSaG1zRWV1eElVVnlJRnhGNGpCR296b3N0NXpZN2drQWRMQkw3VVZING1NaFdpWTVnNnBsQ1lJaVkxb2ZzaDl2b3gzODkwMnh1cUZNSTFJSTdtTUlndjMrKzhGOUdJR29FTk00WUJQcFgxTms0SVNQd0dZRUFBdjNDcURBQ0ZoSFFPT05iT05OaStrOHFJTnRpSVp6Y213ZzhwZldQNXIzVW1NSUF3OC9leElKYmJRTUJIMWY4Q1ZScG95RE80azBFZkZ6eEVZaUdwRDhJaTV2ZXhJTmJiUUdCbXpwWHRDdytBdWtGV1BmbWJlSEpuRFFoRUFqZ2lHOFJqYWJSUWhyMytML1djZzhHU01UaVpRVHc2djQxalVDKzQvQUJJNUFlVWVabGhManRZUkVvOHljUFVnWVFDQUdVNERlNm5NQnZGa2JBRDRFVE9qZjhna0pzb05KVWxrR3Bha2kxZC8yQUhIempSUVR3alhBaUVhZ3B1UEdtRVFnSjlJU3I2U2M3WGdoR3pIdjM0TUJxR1hrQWhaUkFpS0FNdjlMbGUveG04VFFDMyt0Y2tJSVE4QlltUzBIVDJROFV2bDBXeDJFSmo4QWVJay9ZbDZwb0NJUTBQNUorbS9Cd2NRUDlFZmlKYmtxSVFMNVhkdjlJNDNmSUtjeElvQmRRUXZkN2pEQytKandDNk91STVBRUtFVWNnZjZob09pdW5lL3dudDRqRTg4L0h2NVZCQUF0bXJIa3FvcTJ4SlFLaFVDTFJMTG9jSStWWGZBQ1NPSUpYZGJ4dDRlVXBhckU4a3VnUG1FaFA0SStOVWNNYzl3blJsL2pPWTRrOGFKVmxBaUVUUGFpSmRCWDluRW5LOXRRQVJVMUIzODFFWDZKUDdUVEI4aFFXL0JDYTBsQkdNZWwzcE44RXgvTjlYQ0lBc3gzc3FsY1JjY0srWlVXcWZjd0U4bjhBa2FtQTdrdEovMDdLNXJIKzRQVCs3NmRVQlZnU1ZoSnBZUHZsaURoS0lQOGFFWm55NmI2UWRCb3B6RVBHa0xyMlBDcWI1UXNDR0ZWdzFnOVRGRTdjWENQUy9KdXVqa3VQZFNnUnFqL1YvaStrZWFRNXBGbTZadEkxblhRZzZTRFNOTkpVMGhSZGsra0t4WG9OOVRXVWZpYWNvT01OeFN0MXA2NXdoQXFGUDB1Y0lvWlhPVGdHZzIrblJsSjRXSUgrai9RQmFUMFJCZ2RHWFpmL0E3WTFkLzVJSlpkZEFBQUFBRWxGVGtTdVFtQ0MiIGFsdD0iWkVFSE8iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnJhbmQtdHh0Ij4KICAgICAgPGgxPuaegeaguCBaRUVITzwvaDE+CiAgICAgIDxwPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9wPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJoZWFkLWFjdGlvbnMiPgogICAgICA8ZGl2IGNsYXNzPSJjb3VudC1jaGlwIGhpZGRlbiIgaWQ9ImNvdW50Q2hpcCIgb25jbGljaz0idG9nZ2xlQXV0b1JlZnJlc2goKSI+CiAgICAgICAgPHNwYW4gY2xhc3M9ImNvdW50LXJpbmciPjxzdmcgdmlld0JveD0iMCAwIDE0IDE0Ij48Y2lyY2xlIGNsYXNzPSJ0cmFjayIgY3g9IjciIGN5PSI3IiByPSI1LjYiLz48Y2lyY2xlIGNsYXNzPSJhcmMiIGlkPSJjb3VudEFyYyIgY3g9IjciIGN5PSI3IiByPSI1LjYiIHN0cm9rZS1kYXNoYXJyYXk9IjM1LjIiIHN0cm9rZS1kYXNob2Zmc2V0PSIzNS4yIi8+PC9zdmc+PC9zcGFuPgogICAgICAgIDxzcGFuIGlkPSJjb3VudFR4dCI+NjBzPC9zcGFuPgogICAgICA8L2Rpdj4KICAgICAgCiAgICA8L2Rpdj4KICA8L2hlYWRlcj4KCiAgPG1haW4gaWQ9Im1haW4iPgogICAgPGRpdiBjbGFzcz0icHRyLXdyYXAiIGlkPSJwdHJXcmFwIj4KICAgICAgPGRpdiBjbGFzcz0icHRyLWluZGljYXRvciIgaWQ9InB0ckluZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiIGlkPSJwdHJTcGluIj48L3NwYW4+PHNwYW4gaWQ9InB0clR4dCI+5LiL5ouJ5Yi35pawPC9zcGFuPjwvZGl2PgogICAgICA8ZGl2IGlkPSJwYWdlSG9tZSI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VQb2ludHMiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZVZlaGljbGUiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUxvZ3MiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUNmZyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgPC9tYWluPgoKICA8bmF2IGNsYXNzPSJ0YWJiYXIiPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIG9uIiBkYXRhLXRhYj0iaG9tZSIgb25jbGljaz0ic3dpdGNoVGFiKCdob21lJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMC41IDEyIDNsOSA3LjUiLz48cGF0aCBkPSJNNSA5LjVWMjFoMTRWOS41Ii8+PC9zdmc+CiAgICAgIOmmlumhtTxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJwb2ludHMiIG9uY2xpY2s9InN3aXRjaFRhYigncG9pbnRzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjYiLz48cGF0aCBkPSJNOSA4LjVsMyA0IDMtNE0xMiAxMi41VjE3TTkuNiAxMy40aDQuOE05LjYgMTUuNGg0LjgiLz48L3N2Zz4KICAgICAg56ev5YiGPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InZlaGljbGUiIG9uY2xpY2s9InN3aXRjaFRhYigndmVoaWNsZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTNsMS43LTQuNkEyIDIgMCAwIDEgNy42IDdoOC44YTIgMiAwIDAgMSAxLjkgMS40TDIwIDEzIi8+PHBhdGggZD0iTTMuNSAxM2gxN2ExIDEgMCAwIDEgMSAxdjMuNWgtMi42TTIuNSAxNy41VjE0YTEgMSAwIDAgMSAxLTEiLz48cGF0aCBkPSJNNS4xIDE3LjVIMi41Ii8+PGNpcmNsZSBjeD0iNy4zIiBjeT0iMTcuMyIgcj0iMS45Ii8+PGNpcmNsZSBjeD0iMTYuNyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxwYXRoIGQ9Ik05LjIgMTcuM2g1LjYiLz48L3N2Zz4KICAgICAg6L2m6L6GPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImxvZ3MiIG9uY2xpY2s9InN3aXRjaFRhYignbG9ncycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTggNmgxM004IDEyaDEzTTggMThoMTMiLz48cGF0aCBkPSJNMyA2aC4wMU0zIDEyaC4wMU0zIDE4aC4wMSIvPjwvc3ZnPgogICAgICDml6Xlv5c8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0iY2ZnIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2NmZycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxwYXRoIGQ9Ik0xOS40IDE1YTEuNjUgMS42NSAwIDAgMCAuMzMgMS44MmwuMDYuMDZhMiAyIDAgMSAxLTIuODMgMi44M2wtLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMCAwLTEgMS41MVYyMWEyIDIgMCAxIDEtNCAwdi0uMDlhMS42NSAxLjY1IDAgMCAwLTEtMS41MSAxLjY1IDEuNjUgMCAwIDAtMS44Mi4zM2wtLjA2LjA2YTIgMiAwIDEgMS0yLjgzLTIuODNsLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAgLjMzLTEuODIgMS42NSAxLjY1IDAgMCAwLTEuNTEtMUgzYTIgMiAwIDEgMSAwLTRoLjA5YTEuNjUgMS42NSAwIDAgMCAxLjUxLTEgMS42NSAxLjY1IDAgMCAwLS4zMy0xLjgybC0uMDYtLjA2YTIgMiAwIDEgMSAyLjgzLTIuODNsLjA2LjA2YTEuNjUgMS42NSAwIDAgMCAxLjgyLjMzaC4wMWExLjY1IDEuNjUgMCAwIDAgMS0xLjUxVjNhMiAyIDAgMSAxIDQgMHYuMDlhMS42NSAxLjY1IDAgMCAwIDEgMS41MWguMDFhMS42NSAxLjY1IDAgMCAwIDEuODItLjMzbC4wNi0uMDZhMiAyIDAgMSAxIDIuODMgMi44M2wtLjA2LjA2YTEuNjUgMS42NSAwIDAgMC0uMzMgMS44MnYuMDFhMS42NSAxLjY1IDAgMCAwIDEuNTEgMUgyMWEyIDIgMCAxIDEgMCA0aC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXoiLz48L3N2Zz4KICAgICAg6K6+572uPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICA8L25hdj4KCiAgPGRpdiBjbGFzcz0ic2hlZXQtYmFja2Ryb3AiIGlkPSJzaGVldEJhY2tkcm9wIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjwvZGl2PgogIDxkaXYgY2xhc3M9InNoZWV0IiBpZD0ic2hlZXQiPgogICAgPGRpdiBjbGFzcz0ic2hlZXQtZ3JhYiI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1oZWFkIj4KICAgICAgPGgzIGlkPSJzaGVldFRpdGxlIj48L2gzPgogICAgICA8YnV0dG9uIGNsYXNzPSJzaGVldC1jbG9zZSIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+PC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWJvZHkiIGlkPSJzaGVldEJvZHkiPjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGlkPSJ0b2FzdCIgcm9sZT0ic3RhdHVzIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJjb25maXJtLWxheWVyIGhpZGRlbiIgaWQ9ImNvbmZpcm1MYXllciI+PC9kaXY+CjwvZGl2Pgo8c2NyaXB0PgoidXNlIHN0cmljdCI7Ci8qID09PT09PT09PT09PT09PT09IOW4uOmHjyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBUFBfVkVSU0lPTiA9ICJ2Mi4xNS4zIjsKY29uc3QgS0VZUyA9IHsgY2ZnOiJ6ZWVob19jZmciLCBhY2NvdW50czoiemVlaG9fYWNjb3VudHMiLCBsb2dzOiJ6ZWVob19sb2dzIiB9OwoKLyogPT09PT09PT09PT09PT09PT0g5bel5YW35Ye95pWwID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFV1aWQoKXtjb25zdCBwPSJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgiLGM9ImFiY2RlZjAxMjM0NTY3ODkiO2xldCByPSIiO2Zvcihjb25zdCBjaCBvZiBwKXtpZihjaD09PSJ4Inx8Y2g9PT0ieSIpe2NvbnN0IG49TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjE2KTtyKz0oY2g9PT0ieSI/KG4mMHgzKXwweDg6bikudG9TdHJpbmcoMTYpfWVsc2Ugcis9Y2h9cmV0dXJuIHJ9CmZ1bmN0aW9uIGdldFJhbmRvbUNoYXJzKG49MTYpe2NvbnN0IGM9IjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IjtsZXQgcj0iIjtmb3IobGV0IGk9MDtpPG47aSsrKXIrPWMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCkpO3JldHVybiByfQpmdW5jdGlvbiB0b1F1ZXJ5KHA9e30pe3JldHVybiBPYmplY3Qua2V5cyhwKS5maWx0ZXIoaz0+cFtrXSE9PXVuZGVmaW5lZCYmcFtrXSE9PW51bGwpLnNvcnQoKS5tYXAoaz0+aysiPSIrcFtrXSkuam9pbigiJiIpfQpmdW5jdGlvbiBjbGVhblRva2VuKHQpe3JldHVybiBTdHJpbmcodHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWVhcmVyXHMrL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpfQpmdW5jdGlvbiBjbGVhbkJhcmtLZXkoYil7bGV0IHM9U3RyaW5nKGJ8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1hcmtccyooa2V5KT9ccypbOu+8ml1ccyovaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIikudHJpbSgpO3JldHVybiBzLnJlcGxhY2UoL1wvKyQvLCIiKX0KZnVuY3Rpb24gbWFza1Zpbih2KXtjb25zdCBzPVN0cmluZyh2fHwiIik7aWYoIXMpcmV0dXJuIiI7aWYocy5sZW5ndGg8PTcpcmV0dXJuIioqKioiO3JldHVybiBzLnN1YnN0cmluZygwLDMpKyIqKioqIitzLnN1YnN0cmluZyhzLmxlbmd0aC00KX0KZnVuY3Rpb24gZGVlcFBpY2sob2JqLGtleXMsZGVwdGgpe2lmKCFvYmp8fHR5cGVvZiBvYmohPT0ib2JqZWN0Inx8KGRlcHRofHwwKT41KXJldHVybiIiO2Zvcihjb25zdCBrIG9mIGtleXMpe2lmKG9ialtrXSE9PXVuZGVmaW5lZCYmb2JqW2tdIT09bnVsbCYmb2JqW2tdIT09IiIpcmV0dXJuIFN0cmluZyhvYmpba10pfWZvcihjb25zdCBrIGluIG9iail7aWYob2JqW2tdJiZ0eXBlb2Ygb2JqW2tdPT09Im9iamVjdCIpe2NvbnN0IHI9ZGVlcFBpY2sob2JqW2tdLGtleXMsKGRlcHRofHwwKSsxKTtpZihyKXJldHVybiByfX1yZXR1cm4iIn0KZnVuY3Rpb24gcGlja0lvdFByb3AoZCxpZGVudGlmeSl7Y29uc3QgYXJyPWQmJmQuaW90UHJvcGVydGllcztpZihBcnJheS5pc0FycmF5KGFycikpe2NvbnN0IGtleT1TdHJpbmcoaWRlbnRpZnkpLnRvTG93ZXJDYXNlKCk7Zm9yKGNvbnN0IGl0IG9mIGFycil7aWYoaXQmJlN0cmluZyhpdC5pZGVudGlmeXx8IiIpLnRvTG93ZXJDYXNlKCk9PT1rZXkmJml0LnZhbHVlIT09bnVsbCYmaXQudmFsdWUhPT11bmRlZmluZWQmJml0LnZhbHVlIT09IiIpcmV0dXJuIFN0cmluZyhpdC52YWx1ZSl9fXJldHVybiIifQpmdW5jdGlvbiBnZXREZXZpY2VJZGVudGlmeShhY2Mpe2NvbnN0IHNlZWQ9U3RyaW5nKGFjYy51c2VySWR8fGFjYy52aW5Ob3x8InplZWhvLWRldmljZSIpO2xldCBoPTA7Zm9yKGxldCBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe2g9KChoPDw1KS1oK3NlZWQuY2hhckNvZGVBdChpKSl8MH1yZXR1cm4oTWF0aC5hYnMoaCkudG9TdHJpbmcoMTYpKyIwMDAwMDAwMDAwMDAwMDAwIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIGhhc1ZhbGlkQ29vcmQobGF0LGxuZyl7aWYobGF0PT09IiJ8fGxhdD09PW51bGx8fGxhdD09PXVuZGVmaW5lZHx8bG5nPT09IiJ8fGxuZz09PW51bGx8fGxuZz09PXVuZGVmaW5lZClyZXR1cm4gZmFsc2U7Y29uc3QgbGE9TnVtYmVyKGxhdCksbG49TnVtYmVyKGxuZyk7cmV0dXJuIGlzRmluaXRlKGxhKSYmaXNGaW5pdGUobG4pJiZNYXRoLmFicyhsYSk8PTkwJiZNYXRoLmFicyhsbik8PTE4MCYmIShsYT09PTAmJmxuPT09MCl9CmZ1bmN0aW9uIG5vcm1hbGl6ZVJlZnJlc2hTZWModil7Y29uc3Qgbj1OdW1iZXIodik7aWYoIWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiA2MDtyZXR1cm4gTWF0aC5tYXgoMTUsTWF0aC5taW4oMzYwMCxNYXRoLnJvdW5kKG4pKSl9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHM9PW51bGw/IiI6cykucmVwbGFjZSgvJi9nLCImYW1wOyIpLnJlcGxhY2UoLzwvZywiJmx0OyIpLnJlcGxhY2UoLz4vZywiJmd0OyIpLnJlcGxhY2UoLyIvZywiJnF1b3Q7Iil9CgovKiA9PT09PT09PT09PT09PT09PSBNRDUgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbWQ1KHQsZSl7ZnVuY3Rpb24gbih0LGUpe3JldHVybiB0PDxlfHQ+Pj4zMi1lfWZ1bmN0aW9uIHIodCxlKXt2YXIgbixyLG8saSxhO3JldHVybiBvPTIxNDc0ODM2NDgmdCxpPTIxNDc0ODM2NDgmZSxhPSgxMDczNzQxODIzJnQpKygxMDczNzQxODIzJmUpLChuPTEwNzM3NDE4MjQmdCkmKHI9MTA3Mzc0MTgyNCZlKT8yMTQ3NDgzNjQ4XmFeb15pOm58cj8xMDczNzQxODI0JmE/MzIyMTIyNTQ3Ml5hXm9eaToxMDczNzQxODI0XmFeb15pOmFeb15pfWZ1bmN0aW9uIG8odCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmZXx+dCZufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGkodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmbnxlJn5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGEodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHReZV5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIHUodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIGVeKHR8fm4pfShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGModCl7dmFyIGUsbj0iIixyPSIiO2ZvcihlPTA7ZTw9MztlKyspbis9KHI9IjAiKyh0Pj4+OCplJjI1NSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoci5sZW5ndGgtMiwyKTtyZXR1cm4gbn12YXIgcyxsLGYscCxkLGgsdix5LGcsbT1BcnJheSgpO2ZvcihtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxuPXQubGVuZ3RoLHI9bis4LG89MTYqKChyLXIlNjQpLzY0KzEpLGk9QXJyYXkoby0xKSxhPTAsdT0wO3U8bjspYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfHQuY2hhckNvZGVBdCh1KTw8YSx1Kys7cmV0dXJuIGE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXwxMjg8PGEsaVtvLTJdPW48PDMsaVtvLTFdPW4+Pj4yOSxpfSh0PWZ1bmN0aW9uKHQpe3Q9dC5yZXBsYWNlKC9cclxuL2csIlxuIik7Zm9yKHZhciBlPSIiLG49MDtuPHQubGVuZ3RoO24rKyl7dmFyIHI9dC5jaGFyQ29kZUF0KG4pO3I8MTI4P2UrPVN0cmluZy5mcm9tQ2hhckNvZGUocik6cj4xMjcmJnI8MjA0OD8oZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5MiksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpOihlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpfXJldHVybiBlfSh0KSksaD0xNzMyNTg0MTkzLHY9NDAyMzIzMzQxNyx5PTI1NjIzODMxMDIsZz0yNzE3MzM4Nzgscz0wO3M8bS5sZW5ndGg7cys9MTYpbD1oLGY9dixwPXksZD1nLGg9byhoLHYseSxnLG1bcyswXSw3LDM2MTQwOTAzNjApLGc9byhnLGgsdix5LG1bcysxXSwxMiwzOTA1NDAyNzEwKSx5PW8oeSxnLGgsdixtW3MrMl0sMTcsNjA2MTA1ODE5KSx2PW8odix5LGcsaCxtW3MrM10sMjIsMzI1MDQ0MTk2NiksaD1vKGgsdix5LGcsbVtzKzRdLDcsNDExODU0ODM5OSksZz1vKGcsaCx2LHksbVtzKzVdLDEyLDEyMDAwODA0MjYpLHk9byh5LGcsaCx2LG1bcys2XSwxNywyODIxNzM1OTU1KSx2PW8odix5LGcsaCxtW3MrN10sMjIsNDI0OTI2MTMxMyksaD1vKGgsdix5LGcsbVtzKzhdLDcsMTc3MDAzNTQxNiksZz1vKGcsaCx2LHksbVtzKzldLDEyLDIzMzY1NTI4NzkpLHk9byh5LGcsaCx2LG1bcysxMF0sMTcsNDI5NDkyNTIzMyksdj1vKHYseSxnLGgsbVtzKzExXSwyMiwyMzA0NTYzMTM0KSxoPW8oaCx2LHksZyxtW3MrMTJdLDcsMTgwNDYwMzY4MiksZz1vKGcsaCx2LHksbVtzKzEzXSwxMiw0MjU0NjI2MTk1KSx5PW8oeSxnLGgsdixtW3MrMTRdLDE3LDI3OTI5NjUwMDYpLGg9aShoLHY9byh2LHksZyxoLG1bcysxNV0sMjIsMTIzNjUzNTMyOSkseSxnLG1bcysxXSw1LDQxMjkxNzA3ODYpLGc9aShnLGgsdix5LG1bcys2XSw5LDMyMjU0NjU2NjQpLHk9aSh5LGcsaCx2LG1bcysxMV0sMTQsNjQzNzE3NzEzKSx2PWkodix5LGcsaCxtW3MrMF0sMjAsMzkyMTA2OTk5NCksaD1pKGgsdix5LGcsbVtzKzVdLDUsMzU5MzQwODYwNSksZz1pKGcsaCx2LHksbVtzKzEwXSw5LDM4MDE2MDgzKSx5PWkoeSxnLGgsdixtW3MrMTVdLDE0LDM2MzQ0ODg5NjEpLHY9aSh2LHksZyxoLG1bcys0XSwyMCwzODg5NDI5NDQ4KSxoPWkoaCx2LHksZyxtW3MrOV0sNSw1Njg0NDY0MzgpLGc9aShnLGgsdix5LG1bcysxNF0sOSwzMjc1MTYzNjA2KSx5PWkoeSxnLGgsdixtW3MrM10sMTQsNDEwNzYwMzMzNSksdj1pKHYseSxnLGgsbVtzKzhdLDIwLDExNjM1MzE1MDEpLGg9aShoLHYseSxnLG1bcysxM10sNSwyODUwMjg1ODI5KSxnPWkoZyxoLHYseSxtW3MrMl0sOSw0MjQzNTYzNTEyKSx5PWkoeSxnLGgsdixtW3MrN10sMTQsMTczNTMyODQ3MyksaD1hKGgsdj1pKHYseSxnLGgsbVtzKzEyXSwyMCwyMzY4MzU5NTYyKSx5LGcsbVtzKzVdLDQsNDI5NDU4ODczOCksZz1hKGcsaCx2LHksbVtzKzhdLDExLDIyNzIzOTI4MzMpLHk9YSh5LGcsaCx2LG1bcysxMV0sMTYsMTgzOTAzMDU2Miksdj1hKHYseSxnLGgsbVtzKzE0XSwyMyw0MjU5NjU3NzQwKSxoPWEoaCx2LHksZyxtW3MrMV0sNCwyNzYzOTc1MjM2KSxnPWEoZyxoLHYseSxtW3MrNF0sMTEsMTI3Mjg5MzM1MykseT1hKHksZyxoLHYsbVtzKzddLDE2LDQxMzk0Njk2NjQpLHY9YSh2LHksZyxoLG1bcysxMF0sMjMsMzIwMDIzNjY1NiksaD1hKGgsdix5LGcsbVtzKzEzXSw0LDY4MTI3OTE3NCksZz1hKGcsaCx2LHksbVtzKzBdLDExLDM5MzY0MzAwNzQpLHk9YSh5LGcsaCx2LG1bcyszXSwxNiwzNTcyNDQ1MzE3KSx2PWEodix5LGcsaCxtW3MrNl0sMjMsNzYwMjkxODkpLGg9YShoLHYseSxnLG1bcys5XSw0LDM2NTQ2MDI4MDkpLGc9YShnLGgsdix5LG1bcysxMl0sMTEsMzg3MzE1MTQ2MSkseT1hKHksZyxoLHYsbVtzKzE1XSwxNiw1MzA3NDI1MjApLGg9dShoLHY9YSh2LHksZyxoLG1bcysyXSwyMywzMjk5NjI4NjQ1KSx5LGcsbVtzKzBdLDYsNDA5NjMzNjQ1MiksZz11KGcsaCx2LHksbVtzKzddLDEwLDExMjY4OTE0MTUpLHk9dSh5LGcsaCx2LG1bcysxNF0sMTUsMjg3ODYxMjM5MSksdj11KHYseSxnLGgsbVtzKzVdLDIxLDQyMzc1MzMyNDEpLGg9dShoLHYseSxnLG1bcysxMl0sNiwxNzAwNDg1NTcxKSxnPXUoZyxoLHYseSxtW3MrM10sMTAsMjM5OTk4MDY5MCkseT11KHksZyxoLHYsbVtzKzEwXSwxNSw0MjkzOTE1NzczKSx2PXUodix5LGcsaCxtW3MrMV0sMjEsMjI0MDA0NDQ5NyksaD11KGgsdix5LGcsbVtzKzhdLDYsMTg3MzMxMzM1OSksZz11KGcsaCx2LHksbVtzKzE1XSwxMCw0MjY0MzU1NTUyKSx5PXUoeSxnLGgsdixtW3MrNl0sMTUsMjczNDc2ODkxNiksdj11KHYseSxnLGgsbVtzKzEzXSwyMSwxMzA5MTUxNjQ5KSxoPXUoaCx2LHksZyxtW3MrNF0sNiw0MTQ5NDQ0MjI2KSxnPXUoZyxoLHYseSxtW3MrMTFdLDEwLDMxNzQ3NTY5MTcpLHk9dSh5LGcsaCx2LG1bcysyXSwxNSw3MTg3ODcyNTkpLHY9dSh2LHksZyxoLG1bcys5XSwyMSwzOTUxNDgxNzQ1KSxoPXIoaCxsKSx2PXIodixmKSx5PXIoeSxwKSxnPXIoZyxkKTtyZXR1cm4gMzI9PWU/KGMoaCkrYyh2KStjKHkpK2MoZykpLnRvTG93ZXJDYXNlKCk6KGModikrYyh5KSkudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gU0hBMSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzaGExKG1zZyl7ZnVuY3Rpb24gcm90YXRlX2xlZnQobixzKXt2YXIgdDQ9KG48PHMpfChuPj4+KDMyLXMpKTtyZXR1cm4gdDR9O2Z1bmN0aW9uIGN2dF9oZXgodmFsKXt2YXIgc3RyPScnO3ZhciBpO3ZhciB2O2ZvcihpPTc7aT49MDtpLS0pe3Y9KHZhbD4+PihpKjQpKSYweDBmO3N0cis9di50b1N0cmluZygxNil9cmV0dXJuIHN0cn07ZnVuY3Rpb24gVXRmOEVuY29kZShzdHJpbmcpe3N0cmluZz1zdHJpbmcucmVwbGFjZSgvXHJcbi9nLCdcbicpO3ZhciB1dGZ0ZXh0PScnO2Zvcih2YXIgbj0wO248c3RyaW5nLmxlbmd0aDtuKyspe3ZhciBjPXN0cmluZy5jaGFyQ29kZUF0KG4pO2lmKGM8MTI4KXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGMpfWVsc2UgaWYoKGM+MTI3KSYmKGM8MjA0OCkpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpfDE5Mik7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX1lbHNle3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKXwyMjQpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSY2Myl8MTI4KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfX1yZXR1cm4gdXRmdGV4dH07dmFyIGJsb2Nrc3RhcnQ7dmFyIGksajt2YXIgVz1uZXcgQXJyYXkoODApO3ZhciBIMD0weDY3NDUyMzAxO3ZhciBIMT0weEVGQ0RBQjg5O3ZhciBIMj0weDk4QkFEQ0ZFO3ZhciBIMz0weDEwMzI1NDc2O3ZhciBIND0weEMzRDJFMUYwO3ZhciBBLEIsQyxELEU7dmFyIHRlbXA7bXNnPVV0ZjhFbmNvZGUobXNnKTt2YXIgbXNnX2xlbj1tc2cubGVuZ3RoO3ZhciB3b3JkX2FycmF5PW5ldyBBcnJheSgpO2ZvcihpPTA7aTxtc2dfbGVuLTM7aSs9NCl7aj1tc2cuY2hhckNvZGVBdChpKTw8MjR8bXNnLmNoYXJDb2RlQXQoaSsxKTw8MTZ8bXNnLmNoYXJDb2RlQXQoaSsyKTw8OHxtc2cuY2hhckNvZGVBdChpKzMpO3dvcmRfYXJyYXkucHVzaChqKX1zd2l0Y2gobXNnX2xlbiU0KXtjYXNlIDA6aT0weDA4MDAwMDAwMDticmVhaztjYXNlIDE6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwyNHwweDA4MDAwMDA7YnJlYWs7Y2FzZSAyOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MTZ8MHgwODAwMDticmVhaztjYXNlIDM6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTMpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwxNnxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDw4fDB4ODA7YnJlYWt9d29yZF9hcnJheS5wdXNoKGkpO3doaWxlKCh3b3JkX2FycmF5Lmxlbmd0aCUxNikhPTE0KXdvcmRfYXJyYXkucHVzaCgwKTt3b3JkX2FycmF5LnB1c2gobXNnX2xlbj4+PjI5KTt3b3JkX2FycmF5LnB1c2goKG1zZ19sZW48PDMpJjB4MGZmZmZmZmZmKTtmb3IoYmxvY2tzdGFydD0wO2Jsb2Nrc3RhcnQ8d29yZF9hcnJheS5sZW5ndGg7YmxvY2tzdGFydCs9MTYpe2ZvcihpPTA7aTwxNjtpKyspV1tpXT13b3JkX2FycmF5W2Jsb2Nrc3RhcnQraV07Zm9yKGk9MTY7aTw9Nzk7aSsrKVdbaV09cm90YXRlX2xlZnQoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0sMSk7QT1IMDtCPUgxO0M9SDI7RD1IMztFPUg0O2ZvcihpPTA7aTw9MTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwofkImRCkpK0UrV1tpXSsweDVBODI3OTk5KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT0yMDtpPD0zOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHg2RUQ5RUJBMSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NDA7aTw9NTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwoQiZEKXwoQyZEKSkrRStXW2ldKzB4OEYxQkJDREMpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTYwO2k8PTc5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweENBNjJDMUQ2KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1IMD0oSDArQSkmMHgwZmZmZmZmZmY7SDE9KEgxK0IpJjB4MGZmZmZmZmZmO0gyPShIMitDKSYweDBmZmZmZmZmZjtIMz0oSDMrRCkmMHgwZmZmZmZmZmY7SDQ9KEg0K0UpJjB4MGZmZmZmZmZmfXZhciB0ZW1wPWN2dF9oZXgoSDApK2N2dF9oZXgoSDEpK2N2dF9oZXgoSDIpK2N2dF9oZXgoSDMpK2N2dF9oZXgoSDQpO3JldHVybiB0ZW1wLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IEFFUy0yNTYtRUNCICsgUEtDUzcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQUVTX1NCT1g9bmV3IFVpbnQ4QXJyYXkoWzB4NjMsMHg3YywweDc3LDB4N2IsMHhmMiwweDZiLDB4NmYsMHhjNSwweDMwLDB4MDEsMHg2NywweDJiLDB4ZmUsMHhkNywweGFiLDB4NzYsMHhjYSwweDgyLDB4YzksMHg3ZCwweGZhLDB4NTksMHg0NywweGYwLDB4YWQsMHhkNCwweGEyLDB4YWYsMHg5YywweGE0LDB4NzIsMHhjMCwweGI3LDB4ZmQsMHg5MywweDI2LDB4MzYsMHgzZiwweGY3LDB4Y2MsMHgzNCwweGE1LDB4ZTUsMHhmMSwweDcxLDB4ZDgsMHgzMSwweDE1LDB4MDQsMHhjNywweDIzLDB4YzMsMHgxOCwweDk2LDB4MDUsMHg5YSwweDA3LDB4MTIsMHg4MCwweGUyLDB4ZWIsMHgyNywweGIyLDB4NzUsMHgwOSwweDgzLDB4MmMsMHgxYSwweDFiLDB4NmUsMHg1YSwweGEwLDB4NTIsMHgzYiwweGQ2LDB4YjMsMHgyOSwweGUzLDB4MmYsMHg4NCwweDUzLDB4ZDEsMHgwMCwweGVkLDB4MjAsMHhmYywweGIxLDB4NWIsMHg2YSwweGNiLDB4YmUsMHgzOSwweDRhLDB4NGMsMHg1OCwweGNmLDB4ZDAsMHhlZiwweGFhLDB4ZmIsMHg0MywweDRkLDB4MzMsMHg4NSwweDQ1LDB4ZjksMHgwMiwweDdmLDB4NTAsMHgzYywweDlmLDB4YTgsMHg1MSwweGEzLDB4NDAsMHg4ZiwweDkyLDB4OWQsMHgzOCwweGY1LDB4YmMsMHhiNiwweGRhLDB4MjEsMHgxMCwweGZmLDB4ZjMsMHhkMiwweGNkLDB4MGMsMHgxMywweGVjLDB4NWYsMHg5NywweDQ0LDB4MTcsMHhjNCwweGE3LDB4N2UsMHgzZCwweDY0LDB4NWQsMHgxOSwweDczLDB4NjAsMHg4MSwweDRmLDB4ZGMsMHgyMiwweDJhLDB4OTAsMHg4OCwweDQ2LDB4ZWUsMHhiOCwweDE0LDB4ZGUsMHg1ZSwweDBiLDB4ZGIsMHhlMCwweDMyLDB4M2EsMHgwYSwweDQ5LDB4MDYsMHgyNCwweDVjLDB4YzIsMHhkMywweGFjLDB4NjIsMHg5MSwweDk1LDB4ZTQsMHg3OSwweGU3LDB4YzgsMHgzNywweDZkLDB4OGQsMHhkNSwweDRlLDB4YTksMHg2YywweDU2LDB4ZjQsMHhlYSwweDY1LDB4N2EsMHhhZSwweDA4LDB4YmEsMHg3OCwweDI1LDB4MmUsMHgxYywweGE2LDB4YjQsMHhjNiwweGU4LDB4ZGQsMHg3NCwweDFmLDB4NGIsMHhiZCwweDhiLDB4OGEsMHg3MCwweDNlLDB4YjUsMHg2NiwweDQ4LDB4MDMsMHhmNiwweDBlLDB4NjEsMHgzNSwweDU3LDB4YjksMHg4NiwweGMxLDB4MWQsMHg5ZSwweGUxLDB4ZjgsMHg5OCwweDExLDB4NjksMHhkOSwweDhlLDB4OTQsMHg5YiwweDFlLDB4ODcsMHhlOSwweGNlLDB4NTUsMHgyOCwweGRmLDB4OGMsMHhhMSwweDg5LDB4MGQsMHhiZiwweGU2LDB4NDIsMHg2OCwweDQxLDB4OTksMHgyZCwweDBmLDB4YjAsMHg1NCwweGJiLDB4MTZdKTsKY29uc3QgQUVTX1JDT049bmV3IFVpbnQ4QXJyYXkoWzB4MDAsMHgwMSwweDAyLDB4MDQsMHgwOCwweDEwLDB4MjAsMHg0MCwweDgwLDB4MWIsMHgzNiwweDZjLDB4ZDgsMHhhYiwweDRkXSk7CmZ1bmN0aW9uIGFlc0dNdWwoYSxiKXtsZXQgcD0wO2ZvcihsZXQgaT0wO2k8ODtpKyspe2lmKGImMSlwXj1hO2NvbnN0IGhpPWEmMHg4MDthPShhPDwxKSYweGZmO2lmKGhpKWFePTB4MWI7Yj4+PTF9cmV0dXJuIHB9CmZ1bmN0aW9uIGFlc0tleUV4cGFuc2lvbjI1NihrZXkpe2NvbnN0IE5rPTgsTmI9NCxOcj0xNDtjb25zdCB3PW5ldyBVaW50OEFycmF5KDQqTmIqKE5yKzEpKTtmb3IobGV0IGk9MDtpPE5rKjQ7aSsrKXdbaV09a2V5W2ldO2ZvcihsZXQgaT1OaztpPE5iKihOcisxKTtpKyspe2xldCB0MD13WzQqKGktMSldLHQxPXdbNCooaS0xKSsxXSx0Mj13WzQqKGktMSkrMl0sdDM9d1s0KihpLTEpKzNdO2lmKGklTms9PT0wKXtjb25zdCB0bXA9dDA7dDA9QUVTX1NCT1hbdDFdXkFFU19SQ09OW2kvTmtdO3QxPUFFU19TQk9YW3QyXTt0Mj1BRVNfU0JPWFt0M107dDM9QUVTX1NCT1hbdG1wXX1lbHNlIGlmKGklTms9PT00KXt0MD1BRVNfU0JPWFt0MF07dDE9QUVTX1NCT1hbdDFdO3QyPUFFU19TQk9YW3QyXTt0Mz1BRVNfU0JPWFt0M119d1s0KmldPXdbNCooaS1OayldXnQwO3dbNCppKzFdPXdbNCooaS1OaykrMV1edDE7d1s0KmkrMl09d1s0KihpLU5rKSsyXV50Mjt3WzQqaSszXT13WzQqKGktTmspKzNdXnQzfXJldHVybiB3fQpmdW5jdGlvbiBhZXNFbmNyeXB0QmxvY2soaW5wdXQsdyl7Y29uc3QgTmI9NCxOcj0xNDtjb25zdCBzPW5ldyBVaW50OEFycmF5KDE2KTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPWlucHV0W2ldO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbaV07Zm9yKGxldCByb3VuZD0xO3JvdW5kPD1Ocjtyb3VuZCsrKXtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPUFFU19TQk9YW3NbaV1dO2xldCB0PXNbMV07c1sxXT1zWzVdO3NbNV09c1s5XTtzWzldPXNbMTNdO3NbMTNdPXQ7dD1zWzJdO3NbMl09c1sxMF07c1sxMF09dDt0PXNbNl07c1s2XT1zWzE0XTtzWzE0XT10O3Q9c1szXTtzWzNdPXNbMTVdO3NbMTVdPXNbMTFdO3NbMTFdPXNbN107c1s3XT10O2lmKHJvdW5kIT09TnIpe2ZvcihsZXQgYz0wO2M8NDtjKyspe2NvbnN0IGk9NCpjO2NvbnN0IGEwPXNbaV0sYTE9c1tpKzFdLGEyPXNbaSsyXSxhMz1zW2krM107c1tpXT1hZXNHTXVsKGEwLDIpXmFlc0dNdWwoYTEsMyleYTJeYTM7c1tpKzFdPWEwXmFlc0dNdWwoYTEsMileYWVzR011bChhMiwzKV5hMztzW2krMl09YTBeYTFeYWVzR011bChhMiwyKV5hZXNHTXVsKGEzLDMpO3NbaSszXT1hZXNHTXVsKGEwLDMpXmExXmEyXmFlc0dNdWwoYTMsMil9fWNvbnN0IG9mZj1yb3VuZCoxNjtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W29mZitpXX1yZXR1cm4gc30KZnVuY3Rpb24gYWVzVXRmOEJ5dGVzKHN0cil7Y29uc3Qgb3V0PVtdO2ZvcihsZXQgaT0wO2k8c3RyLmxlbmd0aDtpKyspe2xldCBjPXN0ci5jaGFyQ29kZUF0KGkpO2lmKGM8MHg4MClvdXQucHVzaChjKTtlbHNlIGlmKGM8MHg4MDApb3V0LnB1c2goMHhjMHwoYz4+NiksMHg4MHwoYyYweDNmKSk7ZWxzZSBpZihjPj0weGQ4MDAmJmM8PTB4ZGJmZil7Y29uc3QgYzI9c3RyLmNoYXJDb2RlQXQoKytpKTtjPTB4MTAwMDArKChjLTB4ZDgwMCk8PDEwKSsoYzItMHhkYzAwKTtvdXQucHVzaCgweGYwfChjPj4xOCksMHg4MHwoKGM+PjEyKSYweDNmKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9ZWxzZSBvdXQucHVzaCgweGUwfChjPj4xMiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfXJldHVybiBuZXcgVWludDhBcnJheShvdXQpfQpmdW5jdGlvbiBhZXNCeXRlc1RvQmFzZTY0KGJ5dGVzKXtjb25zdCBjaGFycz0iQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7bGV0IHJlc3VsdD0iIixpPTA7Zm9yKDtpKzI8Ynl0ZXMubGVuZ3RoO2krPTMpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpfGJ5dGVzW2krMl07cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdK2NoYXJzW24mNjNdfWNvbnN0IHJlbT1ieXRlcy5sZW5ndGgtaTtpZihyZW09PT0xKXtjb25zdCBuPWJ5dGVzW2ldPDwxNjtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdKyI9PSJ9ZWxzZSBpZihyZW09PT0yKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rIj0ifXJldHVybiByZXN1bHR9CmZ1bmN0aW9uIGFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW50ZXh0LGtleVN0cil7Y29uc3Qga2V5PWFlc1V0ZjhCeXRlcyhrZXlTdHIpO2lmKGtleS5sZW5ndGghPT0zMil0aHJvdyBuZXcgRXJyb3IoIkFFUy0yNTbpnIDopoEzMuWtl+iKguWvhumSpe+8jOW9k+WJjSIra2V5Lmxlbmd0aCk7Y29uc3Qgdz1hZXNLZXlFeHBhbnNpb24yNTYoa2V5KTtjb25zdCBkYXRhPWFlc1V0ZjhCeXRlcyhwbGFpbnRleHQpO2NvbnN0IHBhZExlbj0xNi0oZGF0YS5sZW5ndGglMTYpO2NvbnN0IHBhZGRlZD1uZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCtwYWRMZW4pO3BhZGRlZC5zZXQoZGF0YSk7Zm9yKGxldCBpPWRhdGEubGVuZ3RoO2k8cGFkZGVkLmxlbmd0aDtpKyspcGFkZGVkW2ldPXBhZExlbjtjb25zdCBvdXQ9bmV3IFVpbnQ4QXJyYXkocGFkZGVkLmxlbmd0aCk7Zm9yKGxldCBvZmY9MDtvZmY8cGFkZGVkLmxlbmd0aDtvZmYrPTE2KXtvdXQuc2V0KGFlc0VuY3J5cHRCbG9jayhwYWRkZWQuc2xpY2Uob2ZmLG9mZisxNiksdyksb2ZmKX1yZXR1cm4gYWVzQnl0ZXNUb0Jhc2U2NChvdXQpfQoKLyogPT09PT09PT09PT09PT09PT0g5a2Y5YKoID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGxvYWRKU09OKGssZmFsbGJhY2spe3RyeXtjb25zdCByYXc9bG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7aWYoIXJhdylyZXR1cm4gZmFsbGJhY2s7Y29uc3Qgdj1KU09OLnBhcnNlKHJhdyk7cmV0dXJuIHY9PT11bmRlZmluZWR8fHY9PT1udWxsP2ZhbGxiYWNrOnZ9Y2F0Y2goZSl7cmV0dXJuIGZhbGxiYWNrfX0KZnVuY3Rpb24gc2F2ZUpTT04oayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayxKU09OLnN0cmluZ2lmeSh2KSk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KY29uc3QgREVGQVVMVF9DRkc9e2FwcDp7YXBwSWQ6IlM3cVBXUFUxIixhcHBTZWNyZXQ6ImM1ZTBkYTdmNGRhMjhkZjgwNTY5NGVjM2RkMWZjNjc5MmU5ZGY5OWQifSxoNTp7YXBwSWQ6IlN3NUY5dUppIixhcHBTZWNyZXQ6IjQ2ODcwYThmNjc4YTA5MTA5NDY4ZjViMDE2ODgxOGI5MWMyOTI4NDUifSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6dHJ1ZSxlbmFibGVMaWtlOnRydWUsZW5hYmxlQ29tbWVudDp0cnVlLGVuYWJsZVNoYXJlOnRydWUsZW5hYmxlRGVsZXRlOnRydWV9LHZlaGljbGVBZXNLZXk6ImNlMmNkN2NiNTcxMjRjMTM0OWRkODU0M2JmNmZkMzFkIix2ZWhpY2xlQ29udHJvbFJpc2s6IiIsYXV0b1JlZnJlc2hTZWM6NjAsc2VydmVyQmFzZToiIixhdXRvU2lnbmluOmZhbHNlLGF1dG9TaWduaW5UaW1lOiIwNzowMCIsdmVoaWNsZU1vbml0b3I6ZmFsc2Usd2lkZ2V0VmVoaWNsZToiIixjdXN0b21CZzoiIn07CmZ1bmN0aW9uIGdldENmZygpe2NvbnN0IGM9bG9hZEpTT04oS0VZUy5jZmcsbnVsbCk7aWYoIWMpcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoREVGQVVMVF9DRkcpKTtyZXR1cm57YXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fERFRkFVTFRfQ0ZHLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldH0saDU6e2FwcElkOmMuaDU/LmFwcElkfHxERUZBVUxUX0NGRy5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5oNS5hcHBTZWNyZXR9LGNvbW11bml0eTp7ZW5hYmxlUG9zdDpjLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmMuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmMuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sdmVoaWNsZUFlc0tleTooKHR5cGVvZiBjLnZlaGljbGVBZXNLZXk9PT0ic3RyaW5nIj9jLnZlaGljbGVBZXNLZXk6IiIpLnRyaW0oKXx8REVGQVVMVF9DRkcudmVoaWNsZUFlc0tleSksdmVoaWNsZUNvbnRyb2xSaXNrOih0eXBlb2YgYy52ZWhpY2xlQ29udHJvbFJpc2s9PT0ic3RyaW5nIj9jLnZlaGljbGVDb250cm9sUmlzazoiIikudHJpbSgpLGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksc2VydmVyQmFzZTpTdHJpbmcoYy5zZXJ2ZXJCYXNlfHwiIikudHJpbSgpLGF1dG9TaWduaW46Yy5hdXRvU2lnbmluPT09dHJ1ZSxhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLHZlaGljbGVNb25pdG9yOmMudmVoaWNsZU1vbml0b3I9PT10cnVlLCB3aWRnZXRWZWhpY2xlOlN0cmluZyhjLndpZGdldFZlaGljbGV8fCIiKSwgY3VzdG9tQmc6U3RyaW5nKGMuY3VzdG9tQmd8fCIiKX19CmZ1bmN0aW9uIHNhdmVDZmcoYyl7cmV0dXJuIHNhdmVKU09OKEtFWVMuY2ZnLGMpfQpmdW5jdGlvbiBnZXRBY2NvdW50cygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5hY2NvdW50cyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gc2F2ZUFjY291bnRzKGxpc3Qpe3JldHVybiBzYXZlSlNPTihLRVlTLmFjY291bnRzLGxpc3QpfQpmdW5jdGlvbiBnZXRMb2dzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmxvZ3MsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIGFkZExvZyhlbnRyeSl7Y29uc3QgbG9ncz1nZXRMb2dzKCk7bG9ncy51bnNoaWZ0KGVudHJ5KTtpZihsb2dzLmxlbmd0aD41MClsb2dzLmxlbmd0aD01MDtzYXZlSlNPTihLRVlTLmxvZ3MsbG9ncyl9CmZ1bmN0aW9uIGNsZWFyTG9ncygpe3JldHVybiBzYXZlSlNPTihLRVlTLmxvZ3MsW10pfQpmdW5jdGlvbiBpc1Byb3h5TW9kZSgpe3JldHVybiAhISh3aW5kb3cuX19QQU5FTF9NT0RFX18pfHwhIWdldENmZygpLnNlcnZlckJhc2V9Ci8qID09PT09PT09PT09PT09PT09IOetvuWQjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRTaWduKHR5cGUscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Y1t0eXBlXXx8Yy5hcHA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10eXBlPT09Img1Ij9nZXRVdWlkKCk6dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9Ym9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTonJztjb25zdCBzaWduYXR1cmU9dHlwZT09PSJoNSI/KHF1ZXJ5K3BhcmFtK2FjLmFwcFNlY3JldCk6KGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KTtjb25zdCBzaWduPW1kNShzaGExKHNpZ25hdHVyZSksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ3NpZ25hdHVyZSc6c2lnbn19CgovLyBINSDnq6/lkKsgYm9keSDnrb7lkI3vvIhsb2dpbkJ5UGhvbmUg562J5o6l5Y+j5b+F6aG75oqK6K+35rGC5L2T57qz5YWl562+5ZCN77yM5ZCm5YiZ6L+U5ZueIHBlcm1pdCBlcnJvcu+8iQpmdW5jdGlvbiBoNVNpZ25XaXRoQm9keShib2R5LGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuaDV8fGMuYXBwO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT1nZXRVdWlkKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpO2NvbnN0IHNpZ249bWQ1KHNoYTEoYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdhcHBJZCc6YWMuYXBwSWR9fQoKLy8gQXBwIOe9keWFs+WujOaVtOetvuWQje+8iOWPkeeggeS4jueZu+W9leWQjOe9keWFs++8jOmBv+WFjSBINSBhdXRoQ29kZSDlj5HnoIHov5sgQXBwIOaxoOiAjCBINSBsb2dpbkJ5UGhvbmUg5p+l5LiN5Yiw77yJCmZ1bmN0aW9uIGFwcEdhdGV3YXlTaWduKHVybCxtZXRob2QscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7bGV0IHByZVNpZ249IiI7aWYoU3RyaW5nKG1ldGhvZCkudG9VcHBlckNhc2UoKT09PSJHRVQiKXtjb25zdCB1PW5ldyBVUkwodXJsKTtwcmVTaWduPXUub3JpZ2luK3UucGF0aG5hbWUrKHF1ZXJ5PyI/IitxdWVyeToiIik7fWVsc2V7cHJlU2lnbj1xdWVyeSsoYm9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKToiIik7fWNvbnN0IHNpZ249bWQ1KHNoYTEocHJlU2lnbitwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnYXBwSWQnOmFjLmFwcElkLCdub25jZSc6bm9uY2UsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ3NpZ25hdHVyZSc6c2lnbiwnQ2Ztb3RvLVgtUGFyYW0nOnBhcmFtLCdDZm1vdG8tWC1TaWduJzpzaWduLCdDZm1vdG8tWC1TaWduLVR5cGUnOicwJ319CgovKiA9PT09PT09PT09PT09PT09PSBIVFRQ77yIZmV0Y2gg54mI77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGh0dHBHZXQodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJHRVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQb3N0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHk9PW51bGw/e306Ym9keSksc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQdXQodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBVVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OmJvZHkhPT11bmRlZmluZWQmJmJvZHkhPT1udWxsPyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOnVuZGVmaW5lZCxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cERlbGV0ZSh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkRFTEVURSIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KZnVuY3Rpb24gbmV0d29ya0hpbnQocmVzKXtjb25zdCBtPVN0cmluZygocmVzJiZyZXMuZXJyb3IpfHwiIik7aWYoL2ZhaWxlZCB0byBmZXRjaHxuZXR3b3JrZXJyb3J8Y29yc3xsb2FkIGZhaWxlZHzml6Dms5Xov57mjqV8572R57ucL2kudGVzdChtKSlyZXR1cm4i572R57ucL+i3qOWfn+WPl+mZkO+8muebtOi/nuaooeW8j+mcgCBaRUVITyDmnI3liqHnq6/mlL7ooYwgQ09SU++8jOivt+ajgOafpee9kee7nOi/nuaOpeWQjumHjeivlSI7cmV0dXJuIiJ9CgovKiA9PT09PT09PT09PT09PT09PSDnm7Tov57lkI7nq6/vvIjmtY/op4jlmajnm7TmjqXosIMgWkVFSE8gQVBJ77yJID09PT09PT09PT09PT09PT09ICovCi8vIOmhtemdouebtOi/nuaooeW8j+S4i+eahOWFnOW6leWktO+8mlVBIOacquiHquWumuS5ieaXtuavj+asoeivt+axgumaj+acuuiuvuWkh+aMh+e6ue+8iOS4juiEmuacrOW8leaTjuWQjOetlueVpe+8jOmBv+WFjeWbuuWumuaMh+e6ueiiq+mjjuaOp+aLiem7ke+8iQpmdW5jdGlvbiBwYWdlUmFuZG9tVUEoKXtjb25zdCB2ZXJzPVsiMTYuMS4xIiwiMTYuNi4xIiwiMTYuNy44IiwiMTcuMS4xIiwiMTcuMi4xIiwiMTcuNC4xIiwiMTcuNS4xIiwiMTcuNi4xIiwiMTguMCIsIjE4LjEuMSIsIjE4LjMuMSJdO3JldHVybiAiTU9CSUxFfGlPU3wiK3ZlcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnZlcnMubGVuZ3RoKV0rInxaRUVIT19BUFB8My4wLjF8aVBob25lfCIrKE1hdGgucmFuZG9tKCk8MC43PyJXV0FOIjoiV0lGSSIpKyJ8aU9TIn0KZnVuY3Rpb24gYmFzZUhlYWRlcnMoYWNjKXtjb25zdCB1YT1hY2MudXNlckFnZW50fHxwYWdlUmFuZG9tVUEoKTtjb25zdCBoPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsIkFjY2VwdCI6IiovKiIsIlVzZXItQWdlbnQiOnVhLCJ4LWFwcC1pbmZvIjp1YX07aWYoYWNjLnVzZXJJZCl7aFsidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtoWyJDb29raWUiXT0idXNlcl9pZD0iK2FjYy51c2VySWR9cmV0dXJuIGh9Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIsaGVhZGVycyk7bGV0IGxpc3Q9W107aWYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApe2lmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKWxpc3Q9cmVzLmRhdGE7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5saXN0KSlsaXN0PXJlcy5kYXRhLmxpc3Q7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yZWNvcmRzKSlsaXN0PXJlcy5kYXRhLnJlY29yZHM7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yb3dzKSlsaXN0PXJlcy5kYXRhLnJvd3N9cmV0dXJuIGxpc3QubWFwKHY9Pih7dmluTm86U3RyaW5nKHYudmluTm98fHYuZnJhbWVOb3x8di52aW58fCIiKS50cmltKCksbmFtZTpTdHJpbmcodi52ZWhpY2xlTmFtZXx8di52ZWhpY2xlVHlwZXx8di5kZXZpY2VOYW1lfHx2Lm5hbWV8fCLovabovoYiKS50cmltKCl8fCLovabovoYiLHBpYzpTdHJpbmcodi52ZWhpY2xlUGljVXJsfHx2LnBpY3x8di5pbWFnZVVybHx8IiIpLnRyaW0oKSx2ZWhpY2xlVHlwZTpTdHJpbmcodi52ZWhpY2xlVHlwZXx8di50eXBlfHwiIikudHJpbSgpLGxpY2Vuc2VQbGF0ZTp2LmxpY2Vuc2VQbGF0ZXx8bnVsbH0pKS5maWx0ZXIodj0+di52aW5Obyl9Y2F0Y2goZSl7cmV0dXJuW119fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL3dpZGdldHMvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSk7aWYoKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3Qgc29jPU51bWJlcihkLmJtc3NvY3x8ZC5iYXR0ZXJ5TGV2ZWx8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8MCk7Y29uc3Qgdm9sdGFnZT1OdW1iZXIoZC52b2x0YWdlfHxkLmJhdHRlcnlWb2x0YWdlfHxkLmJtc1ZvbHRhZ2V8fGQudG90YWxWb2x0YWdlfHxkLmJhdHRlcnlUb3RhbFZvbHRhZ2V8fDApO2NvbnN0IGxuZ1N0cj1kZWVwUGljayhkLFsibG9uZ2l0dWRlIiwibG5nIiwibG9uIiwiZ3BzWCIsImxvbmdpdHVkZVZhbHVlIiwiY29vcmRYIiwieCJdKTtjb25zdCBsYXRTdHI9ZGVlcFBpY2soZCxbImxhdGl0dWRlIiwibGF0IiwiZ3BzWSIsImxhdGl0dWRlVmFsdWUiLCJjb29yZFkiLCJ5Il0pO2NvbnN0IGxvbmdpdHVkZT1OdW1iZXIobG5nU3RyKSxsYXRpdHVkZT1OdW1iZXIobGF0U3RyKTtyZXR1cm57YmF0dGVyeVBlcmNlbnQ6TWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsaXNGaW5pdGUoc29jKT9zb2M6MCkpLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MCx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGFkZHJlc3M6U3RyaW5nKGQuYWRkcmVzc3x8IiIpLnRyaW0oKSxsb2NhdGlvblRpbWU6U3RyaW5nKGQubG9jYXRpb24/LmxvY2F0aW9uVGltZXx8IiIpLnRyaW0oKSx2ZWhpY2xlTmFtZTpTdHJpbmcoZC52ZWhpY2xlTmFtZXx8IiIpLnRyaW0oKSx2ZWhpY2xlSW1hZ2VVcmw6U3RyaW5nKGQudmVoaWNsZVNjYWxlUGljVXJsfHxkLnZlaGljbGVQaWNVcmx8fCIiKS50cmltKCksaGVhZExvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHwiIikudHJpbSgpLGJhdHRlcnlQdWxsT3V0OlN0cmluZyhkLmJhdHRlcnlQdWxsT3V0RmxhZ3x8IiIpPT09IjEiLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQub25saW5lfHxkLm5ldFN0YXR1c3x8ZC50Ym94U3RhdHVzfHxkLmRldmljZU9ubGluZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiIscG93ZXJTdGF0dXM6U3RyaW5nKGQuYWNjU3RhdHVzfHxkLnBvd2VyU3RhdHVzfHxkLnZlaGljbGVTdGF0dXN8fGQuaWduaXRpb25TdGF0dXN8fGQucG93ZXJNb2RlfHxkLmFjY1N0YXRlfHxkLnBvd2VyU3RhdGV8fGQudmVoaWNsZVN0YXRlfHxkLmVuZ2luZVN0YXR1c3x8ZC5pc1Bvd2VyT258fGQucG93ZXJPbnx8IiIpLnRyaW0oKSxsb2NrU3RhdGU6U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxkLmNhckxvY2tTdGF0ZXx8ZC5kb29yTG9ja1N0YXRlfHxkLmxvY2tGbGFnfHxkLmlzTG9ja2VkfHxkLmxvY2tlZHx8ZC5jZW50cmFsTG9ja2luZ1N0YXR1c3x8IiIpLnRyaW0oKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/dW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsaGVhZGVycyk7aWYocmVzJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2ZWhpY2xlTG9jaz1waWNrSW90UHJvcChkLCJWZWhpY2xlTG9ja19TIik7Y29uc3QgaGVhZExvY2tJb3Q9cGlja0lvdFByb3AoZCwiSGVhZExvY2tTdGF0ZSIpO2NvbnN0IHRvcExvY2s9U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxoZWFkTG9ja0lvdHx8dmVoaWNsZUxvY2t8fCIiKS50cmltKCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntwb3dlclN0YXR1czpkZWVwUGljayhkLFsiYWNjU3RhdHVzIiwicG93ZXJTdGF0dXMiLCJ2ZWhpY2xlU3RhdHVzIiwiaWduaXRpb25TdGF0dXMiLCJwb3dlck1vZGUiLCJhY2NTdGF0ZSIsInBvd2VyU3RhdGUiLCJ2ZWhpY2xlU3RhdGUiLCJlbmdpbmVTdGF0dXMiLCJpc1Bvd2VyT24iLCJwb3dlck9uIiwiYWNjIl0pLnRyaW0oKSxsb2NrU3RhdGU6dG9wTG9jayxvbmxpbmU6U3RyaW5nKGQub25saW5lU3RhdHVzfHxkLnJpZGVTdGF0ZXx8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fCIiKS50cmltKCkscmlkZVN0YXRlOlN0cmluZyhkLnJpZGVTdGF0ZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiJ9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2FwcC92ZWhpY2xlL3RpcmUvbW9uaXRvcmluZz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IG1vbnRoPW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgW2hvbWVSZXMsbXlSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2hvbWVSaWRlSW5mbz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KSxodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL215UmlkZUluZm8/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImbW9udGg9Iittb250aCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pXSk7Y29uc3QgaD1ob21lUmVzPy5kYXRhfHxob21lUmVzfHx7fTtjb25zdCBkPW15UmVzPy5kYXRhfHxteVJlc3x8e307Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KGQucmlkZVJlY29yZExpc3QpP2QucmlkZVJlY29yZExpc3Q6W107Y29uc3QgdG9kYXlLZXk9bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZGF5PWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09dG9kYXlLZXkpfHxsaXN0W2xpc3QubGVuZ3RoLTFdfHx7fTtjb25zdCB5ZXN0PW5ldyBEYXRlKERhdGUubm93KCktODY0MDAwMDApO2NvbnN0IHllc3RLZXk9eWVzdC5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcoeWVzdC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKHllc3QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgeWQ9bGlzdC5maW5kKHg9PlN0cmluZyh4Py5kYXRlfHwiIik9PT15ZXN0S2V5KXx8e307cmV0dXJue3RvZGF5RGlzdGFuY2U6TnVtYmVyKGRheS5yaWRlTWlsZWFnZT8/aC5yaWRlTWlsZWFnZURheT8/MCksdG9kYXlEdXJhdGlvbjpOdW1iZXIoZGF5LnJpZGluZ1RpbWVEYXlVbml0TWludXRlPz9oLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCksdG9kYXlNYXhTcGVlZDpOdW1iZXIoZGF5Lm1heFNwZWVkPz8wKSx0b3RhbE1pbGVhZ2U6TnVtYmVyKGQucmlkZU1pbGVhZ2VUb3RhbD8/MCkseWVzdGVyZGF5RGlzdGFuY2U6TnVtYmVyKHlkLnJpZGVNaWxlYWdlPz8wKSxsYXN0UmlkZU1pbGVhZ2U6TnVtYmVyKGgubGFzdFJpZGVNaWxlYWdlPz8wKSxsYXN0UmlkZUR1cmF0aW9uOk51bWJlcihoLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCl9fWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwiYXBwaWQiOmNmZy5hcHAuYXBwSWQsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9iYXR0ZXJ5SW5mby8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZvbHRhZ2U9TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHxkLnRvdGFsVm9sdGFnZXx8ZC5iYXR0ZXJ5VG90YWxWb2x0YWdlfHxkLnZvbHx8ZC5iYXRWb2x0YWdlfHxkLmJhdHRlcnlWb2x8fDApO2NvbnN0IGN1cnJlbnQ9TnVtYmVyKGQuY3VycmVudHx8ZC5iYXR0ZXJ5Q3VycmVudHx8ZC5ibXNDdXJyZW50fHxkLmN1cnx8ZC5iYXR0ZXJ5Q3VyfHwwKTtjb25zdCBiYXR0ZXJ5VGVtcD1OdW1iZXIoZC5iYXR0ZXJ5VGVtcHx8ZC5iYXRUZW1wfHxkLnRlbXB8fGQudGVtcGVyYXR1cmV8fGQuYm1zVGVtcHx8ZC5iYXR0ZXJ5VGVtcGVyYXR1cmV8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8ZC5yZXNpZHVhbFJhbmdlfHwwKTtyZXR1cm57Y2hhcmdlU3RhdGU6U3RyaW5nKGQuY2hhcmdlU3RhdGVTdHJ8fGQuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKSx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGN1cnJlbnQ6aXNGaW5pdGUoY3VycmVudCk/Y3VycmVudDowLGJhdHRlcnlUZW1wOmlzRmluaXRlKGJhdHRlcnlUZW1wKT9iYXR0ZXJ5VGVtcDowLHNvYzpOdW1iZXIoZC5zb2N8fGQuYmF0dGVyeUxldmVsfHxkLmJtc3NvY3x8MCkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowfX1yZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX1jYXRjaChlKXtyZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImg1Iix7dmluTm86dmluTm99LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVyYXBwL2FwcC9zZXJ2aWNlL3JlY2hhcmdlL3ZlaGljbGUvZGV0YWlsP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3JldHVybntyZWNoYXJnZUVuZERhdGU6U3RyaW5nKHJlcy5kYXRhLnJlY2hhcmdlRW5kRGF0ZXx8IiIpLGxhc3RVc2VEYXRlOk51bWJlcihyZXMuZGF0YS5sYXN0VXNlRGF0ZSl8fDAsc2VydmljZVJlY2hhcmdlU3RhdHVzOlN0cmluZyhyZXMuZGF0YS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiKSx2ZWhpY2xlTmFtZTpTdHJpbmcocmVzLmRhdGEudmVoaWNsZU5hbWV8fCIiKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e2hhc1ZlaGljbGU6ZmFsc2UsdmVoaWNsZU5hbWU6IiIsdmVoaWNsZU1vZGVsOiIiLHZpbk5vOiIiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxiYXR0ZXJ5UGVyY2VudDowLHJlc2lkdWFsUmFuZ2VLbTowLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGZyb250UHJlc3N1cmU6IiIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxsYXN0UmlkZUR1cmF0aW9uOjAsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCx2ZWhpY2xlSW1hZ2VVcmw6IiIsc2VydmljZUVuZERhdGU6IiIsc2VydmljZVJlbWFpbkRheXM6MCxzZXJ2aWNlU3RhdHVzOiIiLHBvd2VyU3RhdHVzOiIiLGxvY2tTdGF0ZToiIixvbmxpbmU6IiIscmlkZVN0YXRlOiIiLGN1c2hpb25TdGF0ZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiJ9O3RyeXtjb25zdCBhbGxWZWhpY2xlcz1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpO2NvbnN0IHZlaGljbGVzPWFsbFZlaGljbGVzLmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZih2ZWhpY2xlcy5sZW5ndGg9PT0wKXJldHVybiByZXN1bHQ7Y29uc3Qgdj12ZWhpY2xlc1swXTtyZXN1bHQuaGFzVmVoaWNsZT10cnVlO3Jlc3VsdC52ZWhpY2xlTmFtZT12Lm5hbWU7cmVzdWx0LnZpbk5vPXYudmluTm87cmVzdWx0LnZlaGljbGVJbWFnZVVybD12LnBpYztyZXN1bHQudmVoaWNsZU1vZGVsPXYudmVoaWNsZVR5cGV8fCIiO2NvbnN0IFt3aWRnZXRzLHRpcmUscmlkZSxiYXR0ZXJ5LHNlcnZpY2UsaG9tZVBhZ2VdPWF3YWl0IFByb21pc2UuYWxsKFtmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoUmlkZUluZm8oYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hCYXR0ZXJ5Q2hhcmdlU3RhdGUoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+KHtjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjB9KSksZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCldKTtpZih3aWRnZXRzKXtyZXN1bHQuYmF0dGVyeVBlcmNlbnQ9d2lkZ2V0cy5iYXR0ZXJ5UGVyY2VudDtyZXN1bHQucmVzaWR1YWxSYW5nZUttPXdpZGdldHMucmVzaWR1YWxSYW5nZUttO3Jlc3VsdC52b2x0YWdlPXdpZGdldHMudm9sdGFnZTtyZXN1bHQuYWRkcmVzcz13aWRnZXRzLmFkZHJlc3M7cmVzdWx0LmxvY2F0aW9uVGltZT13aWRnZXRzLmxvY2F0aW9uVGltZTtyZXN1bHQucG93ZXJTdGF0dXM9d2lkZ2V0cy5wb3dlclN0YXR1c3x8IiI7cmVzdWx0LmxvY2tTdGF0ZT13aWRnZXRzLmxvY2tTdGF0ZXx8IiI7aWYod2lkZ2V0cy52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9d2lkZ2V0cy52ZWhpY2xlTmFtZTtpZih3aWRnZXRzLnZlaGljbGVJbWFnZVVybClyZXN1bHQudmVoaWNsZUltYWdlVXJsPXdpZGdldHMudmVoaWNsZUltYWdlVXJsO2lmKHdpZGdldHMub25saW5lKXJlc3VsdC5vbmxpbmU9d2lkZ2V0cy5vbmxpbmU7aWYod2lkZ2V0cy5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT13aWRnZXRzLmN1c2hpb25TdGF0ZTtpZih3aWRnZXRzLmxvbmdpdHVkZSE9PSIiJiZ3aWRnZXRzLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPXdpZGdldHMubG9uZ2l0dWRlO2lmKHdpZGdldHMubGF0aXR1ZGUhPT0iIiYmd2lkZ2V0cy5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9d2lkZ2V0cy5sYXRpdHVkZX1pZihob21lUGFnZSl7aWYoaG9tZVBhZ2UucG93ZXJTdGF0dXMpcmVzdWx0LnBvd2VyU3RhdHVzPWhvbWVQYWdlLnBvd2VyU3RhdHVzO2lmKGhvbWVQYWdlLmxvY2tTdGF0ZSlyZXN1bHQubG9ja1N0YXRlPWhvbWVQYWdlLmxvY2tTdGF0ZTtpZihob21lUGFnZS5vbmxpbmUpcmVzdWx0Lm9ubGluZT1ob21lUGFnZS5vbmxpbmU7aWYoaG9tZVBhZ2UucmlkZVN0YXRlKXJlc3VsdC5yaWRlU3RhdGU9aG9tZVBhZ2UucmlkZVN0YXRlO2lmKGhvbWVQYWdlLmN1c2hpb25TdGF0ZSlyZXN1bHQuY3VzaGlvblN0YXRlPWhvbWVQYWdlLmN1c2hpb25TdGF0ZTtpZigocmVzdWx0LmxvbmdpdHVkZT09PSIifHxyZXN1bHQubG9uZ2l0dWRlPT09dW5kZWZpbmVkKSYmaG9tZVBhZ2UubG9uZ2l0dWRlIT09IiImJmhvbWVQYWdlLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPWhvbWVQYWdlLmxvbmdpdHVkZTtpZigocmVzdWx0LmxhdGl0dWRlPT09IiJ8fHJlc3VsdC5sYXRpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxhdGl0dWRlIT09IiImJmhvbWVQYWdlLmxhdGl0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sYXRpdHVkZT1ob21lUGFnZS5sYXRpdHVkZX1pZih0aXJlKXtyZXN1bHQuZnJvbnRQcmVzc3VyZT10aXJlLmZyb250UHJlc3N1cmU7cmVzdWx0LnJlYXJQcmVzc3VyZT10aXJlLnJlYXJQcmVzc3VyZTtyZXN1bHQuZnJvbnRUZW1wPXRpcmUuZnJvbnRUZW1wO3Jlc3VsdC5yZWFyVGVtcD10aXJlLnJlYXJUZW1wfWlmKHJpZGUpe3Jlc3VsdC50b2RheURpc3RhbmNlPXJpZGUudG9kYXlEaXN0YW5jZTtyZXN1bHQudG9kYXlEdXJhdGlvbj1yaWRlLnRvZGF5RHVyYXRpb247cmVzdWx0LnRvZGF5TWF4U3BlZWQ9cmlkZS50b2RheU1heFNwZWVkO3Jlc3VsdC5sYXN0UmlkZU1pbGVhZ2U9cmlkZS5sYXN0UmlkZU1pbGVhZ2U7cmVzdWx0Lmxhc3RSaWRlRHVyYXRpb249cmlkZS5sYXN0UmlkZUR1cmF0aW9ufHwwO3Jlc3VsdC50b3RhbE1pbGVhZ2U9cmlkZS50b3RhbE1pbGVhZ2V8fDA7cmVzdWx0Lnllc3RlcmRheURpc3RhbmNlPXJpZGUueWVzdGVyZGF5RGlzdGFuY2V8fDB9cmVzdWx0LmNoYXJnZVN0YXRlPWJhdHRlcnkuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiO2lmKGJhdHRlcnkudm9sdGFnZSlyZXN1bHQudm9sdGFnZT1iYXR0ZXJ5LnZvbHRhZ2U7aWYoYmF0dGVyeS5jdXJyZW50KXJlc3VsdC5jdXJyZW50PWJhdHRlcnkuY3VycmVudDtpZihiYXR0ZXJ5LmJhdHRlcnlUZW1wKXJlc3VsdC5iYXR0ZXJ5VGVtcD1iYXR0ZXJ5LmJhdHRlcnlUZW1wO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZiYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbSlyZXN1bHQucmVzaWR1YWxSYW5nZUttPWJhdHRlcnkucmVzaWR1YWxSYW5nZUttO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZyZXN1bHQuYmF0dGVyeVBlcmNlbnQ+MCl7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1NYXRoLnJvdW5kKHJlc3VsdC5iYXR0ZXJ5UGVyY2VudCoxLjUpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSDotKblj7fmlbDmja7mi4nlj5YgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbk5vKXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7bGV0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpeeUqOaItyIsdXNlcklkLHNjb3JlOjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjAsdG9kYXlTY29yZTowLHNpZ25Db3VudDowLGxhc3Q3OltdLGVycm9yOm51bGwsdmVoaWNsZTp7aGFzVmVoaWNsZTpmYWxzZX19OwppZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHZlaGljbGVSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9KTtpZih2ZWhpY2xlUmVzLmNvZGU9PSIxMDAwMCImJnZlaGljbGVSZXMuZGF0YSl7Y29uc3QgYXV0b1VpZD1TdHJpbmcodmVoaWNsZVJlcy5kYXRhLnVzZXJJZHx8dmVoaWNsZVJlcy5kYXRhLnVpZHx8dmVoaWNsZVJlcy5kYXRhLmlkfHwiIik7aWYoYXV0b1VpZCl7dXNlcklkPWF1dG9VaWQ7cmVzdWx0LnVzZXJJZD11c2VySWQ7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBpZHg9YWNjb3VudHMuZmluZEluZGV4KGE9PmNsZWFuVG9rZW4oYS50b2tlbik9PT10b2tlbik7aWYoaWR4Pj0wJiYhYWNjb3VudHNbaWR4XS51c2VySWQpe2FjY291bnRzW2lkeF0udXNlcklkPXVzZXJJZDtzYXZlQWNjb3VudHMoYWNjb3VudHMpfX19fWNhdGNoKGUpe319CnRyeXtyZXN1bHQudmVoaWNsZT1hd2FpdCBmZXRjaFZlaGljbGVJbmZvKGFjYyxjZmcsdmluTm8pfWNhdGNoKGUpe3Jlc3VsdC52ZWhpY2xlPXtoYXNWZWhpY2xlOmZhbHNlfX0KdHJ5e2lmKCF1c2VySWQpe3Jlc3VsdC5lcnJvcj0i6K+35Zyo6K6+572u6aG15aGr5YaZ55So5oi3SUQifWVsc2V7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfSk7aWYoaW5mb1Jlcy5jb2RlPT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3Jlc3VsdC5zY29yZT1OdW1iZXIoaW5mb1Jlcy5kYXRhLnNjb3JlfHxpbmZvUmVzLmRhdGEuaW50ZWdyYWx8fGluZm9SZXMuZGF0YS5wb2ludHx8aW5mb1Jlcy5kYXRhLnBvaW50c3x8aW5mb1Jlcy5kYXRhLnRvdGFsU2NvcmV8fGluZm9SZXMuZGF0YS50b3RhbEludGVncmFsfHwwKX1lbHNlIGlmKGluZm9SZXMuY29kZT09IjQwMDAxInx8aW5mb1Jlcy5jb2RlPT00MDEpe3Jlc3VsdC5lcnJvcj0iVG9rZW7lt7Lov4fmnJ8ifWVsc2V7cmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blpLHotKU6ICIrKGluZm9SZXMubWVzc2FnZXx8aW5mb1Jlcy5jb2RlfHwi5pyq55+l6ZSZ6K+vIil9fX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5byC5bi4OiAiK1N0cmluZyhlKX0KdHJ5e2NvbnN0IGN1ck1vbnRoPW5vdy5nZXRGdWxsWWVhcigpKyItIisobm93LmdldE1vbnRoKCkrMSk7Y29uc3QgbGFzdERhdGU9bmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksbm93LmdldE1vbnRoKCktMSwxKTtjb25zdCBsYXN0TW9udGg9bGFzdERhdGUuZ2V0RnVsbFllYXIoKSsiLSIrKGxhc3REYXRlLmdldE1vbnRoKCkrMSk7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBbY3VyUmVzLGxhc3RSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9IitjdXJNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpjdXJNb250aH0sJycsY2ZnKX0pLGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2xhc3RNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpsYXN0TW9udGh9LCcnLGNmZyl9KV0pO2NvbnN0IGxhc3RMaXN0PShsYXN0UmVzLmNvZGU9PSIxMDAwMCImJmxhc3RSZXMuZGF0YSk/KGxhc3RSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgY3VyTGlzdD0oY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKT8oY3VyUmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGxpc3Q9Wy4uLmxhc3RMaXN0LC4uLmN1ckxpc3RdO2lmKGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSl7cmVzdWx0LnNpZ25Db3VudD1OdW1iZXIoY3VyUmVzLmRhdGEuc2lnbkNvdW50KXx8MH1jb25zdCB0b2RheUVudHJ5PWN1ckxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25lZFRvZGF5PSEhKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSk7cmVzdWx0LnRvZGF5U2NvcmU9dG9kYXlFbnRyeT8oTnVtYmVyKHRvZGF5RW50cnkuaW50ZWdyYWxTY29yZSl8fDApOjA7dHJ5e2NvbnN0IF90b2RheUxvZ3M9KGdldExvZ3MoKXx8W10pLmZpbHRlcihsPT5sJiZsLmRhdGU9PT10b2RheSYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcodXNlcklkKSYmbC5zdWNjZXNzKTtpZihfdG9kYXlMb2dzLmxlbmd0aD4wKXtjb25zdCBfdGw9X3RvZGF5TG9nc1swXTtyZXN1bHQudG9kYXlTY29yZT1OdW1iZXIoX3RsLnRvdGFsR2Fpbil8fHJlc3VsdC50b2RheVNjb3JlO3Jlc3VsdC50b2RheURldGFpbD17c2lnbmluU2NvcmU6TnVtYmVyKF90bC5zaWduaW5TY29yZSl8fDAsYmxpbmRCb3hTY29yZTpOdW1iZXIoX3RsLmJsaW5kQm94U2NvcmUpfHwwLGludGVyYWN0U2NvcmU6TnVtYmVyKF90bC5pbnRlcmFjdFNjb3JlKXx8MH19fWNhdGNoKGUpe31jb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtpZih0b2RheUlkeD49MCl7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfX1yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Zm9yKGxldCBpPTY7aT49MDtpLS0pe2NvbnN0IGQ9bmV3IERhdGUoKTtkLnNldERhdGUoZC5nZXREYXRlKCktaSk7Y29uc3QgZHM9ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZW50cnk9bGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTtyZXN1bHQubGFzdDcucHVzaCh7ZGF0ZTpkcy5zbGljZSg1KSxzaWduZWQ6ISEoZW50cnkmJihlbnRyeS5zaWduU3RhdHVlPT0zfHxlbnRyeS5zaWduU3RhdHVlPT01fHxlbnRyeS5zaWduU3RhdHVlPT0wKSksaXNUb2RheTppPT09MH0pfX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i562+5Yiw54q25oCB6I635Y+W5aSx6LSlIn0KdHJ5e2NvbnN0IHRva2VuQ2hlY2s9YXdhaXQgY2hlY2tUb2tlbihhY2MsY2ZnKTtyZXN1bHQudG9rZW5WYWxpZD10b2tlbkNoZWNrLnZhbGlkO3Jlc3VsdC50b2tlblJlYXNvbj10b2tlbkNoZWNrLnJlYXNvbnx8bnVsbDtpZih0b2tlbkNoZWNrLnZhbGlkJiZ0b2tlbkNoZWNrLnVzZXJOYW1lJiYoIXJlc3VsdC51c2VyTmFtZXx8cmVzdWx0LnVzZXJOYW1lPT09IuacquefpeeUqOaItyIpKXJlc3VsdC51c2VyTmFtZT10b2tlbkNoZWNrLnVzZXJOYW1lfWNhdGNoKGUpe3Jlc3VsdC50b2tlblZhbGlkPXRydWV9CnJldHVybiByZXN1bHR9CgpmdW5jdGlvbiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhKXtpZighZGF0YSlyZXR1cm4gbnVsbDtpZih0eXBlb2YgZGF0YT09PSJzdHJpbmcifHx0eXBlb2YgZGF0YT09PSJudW1iZXIiKXJldHVybiBTdHJpbmcoZGF0YSk7aWYoQXJyYXkuaXNBcnJheShkYXRhKSlyZXR1cm4gZ2V0UG9zdElkRnJvbURhdGEoZGF0YVswXSk7Y29uc3QgZGlyZWN0PWRhdGEudXVpZHx8ZGF0YS50dXVpZHx8ZGF0YS5wb3N0SWR8fGRhdGEucG9zdGlkfHxkYXRhLmFydGljbGVJZHx8ZGF0YS5hcnRpY2xlSUR8fGRhdGEuaWR8fGRhdGEuZGF0YUlkfHxkYXRhLnRpZDtpZihkaXJlY3QpcmV0dXJuIFN0cmluZyhkaXJlY3QpO2Zvcihjb25zdCBrZXkgb2YgWyJyZWNvcmRzIiwibGlzdCIsInJvd3MiLCJkYXRhIiwicmVzdWx0Il0pe2NvbnN0IHY9ZGF0YVtrZXldO2NvbnN0IHBpZD1nZXRQb3N0SWRGcm9tRGF0YSh2KTtpZihwaWQpcmV0dXJuIHBpZH1yZXR1cm4gbnVsbH0KCi8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjCA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpe2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOmZhbHNlLHNpZ25pblNjb3JlOjAsYmxpbmRCb3hTY29yZTowLGludGVyYWN0U2NvcmU6MCx0b3RhbEdhaW46MCxjb250aW51ZURheXM6MCxlcnJvcjpudWxsLHN0ZXBzOltdfTt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IG1vbnRoPXRvZGF5LnNsaWNlKDAsNyk7CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdG9kYXlFbnRyeT0oaW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSl7cmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpfWVsc2V7bGV0IHNpZ25SZXM9bnVsbCxzaWduTXNnPSLmnKrnn6UiO2ZvcihsZXQgYXQ9MTthdDw9MzthdCsrKXtzaWduUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHt9LCcnLGNmZyl9LHt9KTtpZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKWJyZWFrO3NpZ25Nc2c9c2lnblJlcz8ubWVzc2FnZXx8IuacquefpSI7aWYoL+ivt+eojXznqI3lkI5856iN5YCZfOmikee5gXznuYHlv5l86YeN6K+VLy50ZXN0KHNpZ25Nc2cpJiZhdDwzKXthd2FpdCBuZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsKGF0KzEpKjIwMDApKTtjb250aW51ZX1icmVha31pZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKXtjb25zdCBpbmZvUmVzMj1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRlPShpbmZvUmVzMj8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduaW5TY29yZT10ZT8oTnVtYmVyKHRlLmludGVncmFsU2NvcmUpfHwwKTowO3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDmiJDlip8gKyIrcmVzdWx0LnNpZ25pblNjb3JlKX1lbHNle3RyeXtjb25zdCBjaGs9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBjZT0oY2hrPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYoY2UmJihjZS5zaWduU3RhdHVlPT0zfHxjZS5zaWduU3RhdHVlPT01fHxjZS5zaWduU3RhdHVlPT0wKSlyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIik7ZWxzZSByZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9fX0KfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlvILluLg6ICIrZSl9CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgbGlzdD1pbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXTtjb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2NvbnN0IHNpZ25Db3VudD1OdW1iZXIoaW5mb1Jlcz8uZGF0YT8uc2lnbkNvdW50KXx8MDtpZihzaWduQ291bnQ+PTMwKXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL3N1cHBsZW1lbnRQcml6ZT9zdXBwbGVtZW50RGF0ZT0iK3RvZGF5LHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse3N1cHBsZW1lbnREYXRlOnRvZGF5fSwnJyxjZmcpfSk7aWYoYmxpbmRSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5ibGluZEJveFNjb3JlPU51bWJlcihibGluZFJlcz8uZGF0YT8uaW50ZWdyYWx8fGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbFNjb3JlfHwwKTtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS6I635b6XICsiK3Jlc3VsdC5ibGluZEJveFNjb3JlKyIgKCIrKGJsaW5kUmVzPy5kYXRhPy5wcml6ZXNOYW1lfHwi56ev5YiGIikrIikiKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq6Kej6ZSBKCIrc2lnbkNvdW50KyIvMzApIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LlvILluLg6ICIrZSl9CmNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eXx8e307bGV0IHBvc3RJZD1udWxsOwppZihjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSl7dHJ5e2NvbnN0IHBvc3RSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3Rjb250ZW50OiLlvIDlv4PnmoTkuIDlpKkifSk7aWYocG9zdFJlcz8uY29kZT09IjEwMDAwIil7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKHBvc3RSZXMuZGF0YSk7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5byC5bi4OiAiK2UpfX0KaWYoIXBvc3RJZCl7dHJ5e2NvbnN0IGxpc3RSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tdW5pdHkvbWluZUFydGljbGVJbmZvP3VzZXJJZD0iK3VzZXJJZCsiJnBhZ2U9MSZwYWdlU2l6ZT0xMCIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2NvbnN0IHJhd0xpc3Q9QXJyYXkuaXNBcnJheShsaXN0UmVzPy5kYXRhKT9saXN0UmVzLmRhdGE6KGxpc3RSZXM/LmRhdGE/LnJlY29yZHN8fGxpc3RSZXM/LmRhdGE/Lmxpc3R8fFtdKTtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmF3TGlzdCk/cmF3TGlzdDpbXTtjb25zdCBtaW5lPWxpc3QuZmluZChpdD0+U3RyaW5nKGl0LnVzZXJJZHx8aXQuY3JlYXRlQnl8fGl0LnVpZHx8IiIpPT09U3RyaW5nKHVzZXJJZCkpO3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShtaW5lfHxsaXN0WzBdfHxsaXN0UmVzPy5kYXRhKX1jYXRjaChlKXt9fQppZihwb3N0SWQpe2lmKGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKXt0cnl7Y29uc3QgbGlrZVJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9zb2NpYWxDb21tdS9saWtlRmF2b3JpdGVJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdElkOlN0cmluZyhwb3N0SWQpLGtpbmRGbGFnOiIwIn0pO2lmKGxpa2VSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7miJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVDb21tZW50IT09ZmFsc2Upe3RyeXthd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tZW50SW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RpZDpTdHJpbmcocG9zdElkKSx1c2VySWQ6U3RyaW5nKHVzZXJJZCksY29tbWVudHM6IuWOieWusyIsc2VuZFRvczoiW1xuXG5dIn0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlrozmiJAiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZVNoYXJlIT09ZmFsc2Upe3RyeXtjb25zdCBzaGFyZVJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2FydGljbGUvc2hhcmUvIitwb3N0SWQsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2lmKHNoYXJlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5oiQ5YqfICsxIil9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2ludGVncmFsL2FkanVzdEJ5U2hhcmUiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlJiZwb3N0SWQpe3RyeXthd2FpdCBodHRwRGVsZXRlKCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1vbkFydGljbGUvZGVsZXRlQXJ0aWNsZT9hcnRpY2xlSWQ9Iitwb3N0SWQrIiZwb3N0VHlwZT0xIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7cmVzdWx0LnN0ZXBzLnB1c2goIuWKqOaAgeW3suWIoOmZpCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliKDpmaTlvILluLg6ICIrZSl9fX0KcmVzdWx0LnRvdGFsR2Fpbj1yZXN1bHQuc2lnbmluU2NvcmUrcmVzdWx0LmJsaW5kQm94U2NvcmUrcmVzdWx0LmludGVyYWN0U2NvcmU7cmVzdWx0LnN1Y2Nlc3M9dHJ1ZX1jYXRjaChlKXtyZXN1bHQuZXJyb3I9U3RyaW5nKGUpO3Jlc3VsdC5zdGVwcy5wdXNoKCLmiafooYzlvILluLg6ICIrZSl9cmV0dXJuIHJlc3VsdH0KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBWRUhJQ0xFX0FDVElPTl9URVhUPXtmaW5kOiLnn63mjInlr7vovaYiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga8iLGN1c2hpb246IuaJk+W8gOWdkOWeqyIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9OwpmdW5jdGlvbiB2ZWhpY2xlQ2hlY2tSZXMocmVzLG9rTXNnKXtpZihyZXMmJiFyZXMuZXJyb3ImJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZ307Y29uc3QgZXJyVGV4dD1TdHJpbmcoKHJlcyYmKHJlcy5lcnJvcnx8cmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IiIpLnRvTG93ZXJDYXNlKCk7aWYocmVzJiZyZXMuZXJyb3ImJi90aW1lb3V0fHRpbWVkIG91dHx0aW1lIG91dHzor7fmsYLotoXml7YvLnRlc3QoZXJyVGV4dCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZysi77yI5ZON5bqU6LaF5pe25L2G6L2m6L6G6YCa5bi45bey5omn6KGM77yM5Y+v5LiL5ouJ5Yi35paw56Gu6K6k77yJIn07cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6KHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fChyZXMmJnJlcy5lcnJvcil8fCLmjIfku6TkuIvlj5HlpLHotKUiLGNvZGU6cmVzJiZyZXMuY29kZX19CmFzeW5jIGZ1bmN0aW9uIHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKXt0cnl7Y29uc3QgYz1jZmd8fGdldENmZygpO2xldCB2aW49YWNjLnZpbk5vfHwiIjtpZighdmluKXtjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGMpO2lmKCFsaXN0fHwhbGlzdC5sZW5ndGgpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquiOt+WPluWIsOe7keWumui9pui+hihWSU4p77yM6K+356Gu6K6k6LSm5Y+35bey57uR5a6a6L2m6L6GIn07dmluPWxpc3RbMF0udmluTm99Y29uc3QgYmFzZT1iYXNlSGVhZGVycyhhY2MpO2lmKGFjdGlvbj09PSJmaW5kIil7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LCIiLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sLyIrdmluLGgpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlr7vovabmjIfku6Tlt7LkuIvlj5HvvIzovabovoblupTpl6rnga/mj5DnpLoiKX1pZihhY3Rpb249PT0ibG91ZEZpbmQiKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtwYXJhbToiNCIsdmluOnZpbn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbFYyIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLpuKPnrJvpl6rnga/mjIfku6Tlt7LkuIvlj5EiKX1pZihhY3Rpb249PT0iY3VzaGlvbiIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe2NvbW1vbmQ6IjI4Iixjb21tb25kUGFyYW06IjEiLHZjdTp2aW4sdmVyc2lvbjoidjIifSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvcHJvcGVydHlUd28vb25lIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlvIDlnZDlnqvmjIfku6Tlt7LkuIvlj5HvvIzlnZDlnqvlupTlvLnotbciKX1pZihhY3Rpb249PT0idW5sb2NrInx8YWN0aW9uPT09ImxvY2siKXtjb25zdCB2S2V5PShjLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCk7aWYoIXZLZXkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuWwmuacqumFjee9ruS6keerr+aOp+i9puWvhumSpe+8muivt+WIsOOAjOiuvue9ri3nrb7lkI3lr4bpkqXphY3nva7jgI3loavlhpnkupHnq6/mjqfovaZBRVPlr4bpkqXlubbkv53lrZjlkI7lho3kvb/nlKjlvIAv5YWz6ZSBIn07aWYoIS9eWzAtOWEtZkEtRl17MzJ9JC8udGVzdCh2S2V5KSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5LqR56uv5o6n6L2m5a+G6ZKl5qC85byP6ZSZ6K+v77yI5bqU5Li6MzLkvY3ljYHlha3ov5vliLbvvInvvIzor7fliLDorr7nva7pobXmoLjlr7nlkI7kv53lrZgifTtjb25zdCBsb2NrRmxhZz1hY3Rpb249PT0idW5sb2NrIj8iMSI6IjAiO2NvbnN0IHBsYWluPSd7XG4gICJsb2NrRmxhZyIgOiAiJytsb2NrRmxhZysnIixcbiAgInZpbk5vIiA6ICInK3ZpbisnIlxufSc7Y29uc3Qgc2VjcmV0PWFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW4sdktleSk7Y29uc3Qgc2VuZEJvZHk9SlNPTi5zdHJpbmdpZnkoe3NlY3JldDpzZWNyZXR9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30scGxhaW4sYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L25ldHdvcmsvdW5sb2NrIixoLHNlbmRCb2R5LDI1MDAwKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcyxhY3Rpb249PT0idW5sb2NrIj8i5LqR56uv5byA6ZSB5oyH5Luk5bey5LiL5Y+RIjoi5LqR56uv5YWz6ZSB5oyH5Luk5bey5LiL5Y+RIil9cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquefpeaTjeS9nOexu+WeizogIithY3Rpb259fWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxtZXNzYWdlOiLmjqfliLblvILluLg6ICIrU3RyaW5nKGUpfX19Cgphc3luYyBmdW5jdGlvbiBiYXJrUHVzaChiYXJrS2V5LHRpdGxlLGJvZHkpe3RyeXtsZXQgcz1TdHJpbmcoYmFya0tleXx8IiIpLnRyaW0oKS5yZXBsYWNlKC9cLyskLywiIik7cz1zLnJlcGxhY2UoL15odHRwcz86XC9cL2FwaVwuZGF5XC5hcHBcLy9pLCIiKTtpZighcylyZXR1cm57c2tpcHBlZDp0cnVlfTtsZXQgYmFzZT0iaHR0cHM6Ly9hcGkuZGF5LmFwcCIsa2V5PXM7Y29uc3QgbT1zLm1hdGNoKC9eKGh0dHBzPzpcL1wvW14vXSspXC8oLispJC9pKTtpZihtKXtiYXNlPW1bMV07a2V5PW1bMl19a2V5PWtleS5yZXBsYWNlKC9eXC8rLywiIik7Y29uc3QgdT1iYXNlKyIvIitlbmNvZGVVUklDb21wb25lbnQoa2V5KSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGJvZHkpKyI/Z3JvdXA9WkVFSE8mc291bmQ9YmlyZHNvbmciO3JldHVybiBhd2FpdCBodHRwR2V0KHUse30pfWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoZSl9fX0KCi8qID09PT09PT09PT09PT09PT09IOS7o+eQhuaooeW8j++8iOaMh+WQkeWOn+iEmuacrCB6ZWVoby5ib3gg5ZCO56uv77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHByb3h5RmV0Y2gocGF0aCxvcHRzKXtjb25zdCByYXdCYXNlPWdldENmZygpLnNlcnZlckJhc2UucmVwbGFjZSgvXC8rJC8sIiIpO2NvbnN0IGJhc2U9KHdpbmRvdy5fX1BBTkVMX01PREVfXyYmIXJhd0Jhc2UpPyIiOnJhd0Jhc2U7Y29uc3Qgcj1hd2FpdCBmZXRjaChiYXNlK3BhdGgsb3B0c3x8e30pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19CmZ1bmN0aW9uIHByb3h5UG9zdChwYXRoLGJvZHkpe3JldHVybiBwcm94eUZldGNoKHBhdGgse21ldGhvZDoiUE9TVCIsaGVhZGVyczp7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb24ifSxib2R5OkpTT04uc3RyaW5naWZ5KGJvZHl8fHt9KX0pfQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsbGltaXQpe2NvbnN0IG91dD1uZXcgQXJyYXkoYWNjb3VudHMubGVuZ3RoKTtsZXQgaT0wO2FzeW5jIGZ1bmN0aW9uIHdvcmtlcigpe3doaWxlKGk8YWNjb3VudHMubGVuZ3RoKXtjb25zdCBpZHg9aSsrO3RyeXtvdXRbaWR4XT1hd2FpdCBmZXRjaEFjY291bnREYXRhKGFjY291bnRzW2lkeF0sY2ZnKX1jYXRjaChlKXtvdXRbaWR4XT17dXNlck5hbWU6YWNjb3VudHNbaWR4XS51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjY291bnRzW2lkeF0udXNlcklkLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX19fWNvbnN0IG49TWF0aC5tYXgoMSxNYXRoLm1pbihsaW1pdHx8MyxhY2NvdW50cy5sZW5ndGgpKTthd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKHtsZW5ndGg6bn0sd29ya2VyKSk7cmV0dXJuIG91dH0KCmNvbnN0IEJhY2tlbmQ9ewogIGFzeW5jIHNlbmRDb2RlKHBob25lKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NlbmQtY29kZSIse3Bob25lOnBob25lfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IumqjOivgeeggeW3suWPkemAgSI6IuWPkemAgeWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvYXV0aENvZGUvIitlbmNvZGVVUklDb21wb25lbnQocGhvbmUpOwogICAgY29uc3QgZD1hd2FpdCBodHRwR2V0KHVybCx7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiR0VUIix7fSwiIixjZmcpfSk7CiAgICByZXR1cm57b2s6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiLG1lc3NhZ2U6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiPyLpqozor4HnoIHlt7Llj5HpgIHvvIzor7fmn6XmlLbnn63kv6EiOigoZCYmKGQubWVzc2FnZXx8ZC5tc2cpKXx8IuWPkemAgeWksei0pSIpfTsKICB9LAogIGFzeW5jIHBob25lTG9naW4ocGhvbmUsY29kZSxiYXNpY0F1dGgpewogICAgY29uc3QgYmFzaWM9U3RyaW5nKGJhc2ljQXV0aHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eQmFzaWNccysvaSwiIik7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9waG9uZS1sb2dpbiIse3Bob25lOnBob25lLGNvZGU6Y29kZSxiYXNpY0F1dGg6YmFzaWN9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i55m75b2V5oiQ5YqfIjoi55m75b2V5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBwYXlsb2FkPXtwaG9uZTpwaG9uZSxhdXRoQ29kZTpjb2RlfTsKICAgIGNvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3VzZXIvbG9naW5CeVBob25lIjsKICAgIGNvbnN0IGhkcj17IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiUE9TVCIse30scGF5bG9hZCxjZmcpfTsKICAgIGlmKGJhc2ljKWhkclsiQXV0aG9yaXphdGlvbiJdPSJCYXNpYyAiK2Jhc2ljOwogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KHVybCxoZHIscGF5bG9hZCwyMDAwMCk7CiAgICBjb25zdCB0b2tlbkluZm89cmVzJiZyZXMuZGF0YSYmcmVzLmRhdGEudG9rZW5JbmZvO2NvbnN0IGFjY2Vzc1Rva2VuPXRva2VuSW5mbyYmU3RyaW5nKHRva2VuSW5mby5hY2Nlc3NfdG9rZW58fCIiKTsKICAgIGlmKCFyZXN8fFN0cmluZyhyZXMuY29kZSkhPT0iMTAwMDAifHwhYWNjZXNzVG9rZW4pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IueZu+W9leWksei0pe+8miIrKChyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwi6aqM6K+B56CB5pyJ6K+v5oiW5bey6L+H5pyfIil9OwogICAgbGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIjsKICAgIHRyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwiIixjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIithY2Nlc3NUb2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IMH0pO2lmKGluZm9SZXMmJlN0cmluZyhpbmZvUmVzLmNvZGUpPT09IjEwMDAwIiYmaW5mb1Jlcy5kYXRhKXt1c2VySWQ9U3RyaW5nKGluZm9SZXMuZGF0YS5pZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhpbmZvUmVzLmRhdGEubmlja05hbWV8fCIiKTt9fWNhdGNoKGUpe30KICAgIGNvbnN0IGxpc3Q9Z2V0QWNjb3VudHMoKTtsZXQgcmVwbGFjZWQ9ZmFsc2U7CiAgICBmb3IobGV0IGk9MDtpPGxpc3QubGVuZ3RoO2krKyl7aWYobGlzdFtpXSYmKFN0cmluZyhsaXN0W2ldLnRva2VufHwiIik9PT1hY2Nlc3NUb2tlbnx8KGxpc3RbaV0udXNlcklkJiZ1c2VySWQmJlN0cmluZyhsaXN0W2ldLnVzZXJJZCk9PT11c2VySWQpKSl7bGlzdFtpXS50b2tlbj1hY2Nlc3NUb2tlbjtpZih1c2VySWQpbGlzdFtpXS51c2VySWQ9dXNlcklkO2lmKHVzZXJOYW1lKWxpc3RbaV0udXNlck5hbWU9dXNlck5hbWU7cmVwbGFjZWQ9dHJ1ZTticmVhazt9fQogICAgY29uc3QgbmV3QWNjPXt1c2VyTmFtZTp1c2VyTmFtZXx8cGhvbmUsdXNlcklkOnVzZXJJZCx0b2tlbjphY2Nlc3NUb2tlbixiYXJrS2V5OiIiLHVzZXJBZ2VudDoiIn07CiAgICBpZighcmVwbGFjZWQpbGlzdC5wdXNoKG5ld0FjYyk7CiAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICByZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOnJlcGxhY2VkPyLnmbvlvZXmiJDlip/vvIzlt7Lmm7TmlrDor6XotKblj7ciOiLnmbvlvZXmiJDlip/vvIzlt7Lmt7vliqDotKblj7cifTsKICB9LAogIGFzeW5jIGdldERhc2hib2FyZCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9kYXRhIik7CiAgICAgIGlmKGQmJmQuYWNjb3VudHMpcmV0dXJue2FjY291bnRzOmQuYWNjb3VudHMsdGltZXN0YW1wOmQudGltZXN0YW1wfHxuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksY29uZmlnOmQuY29uZmlnfHxudWxsLG9rOnRydWV9OwogICAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5Luj55CG5pyN5Yqh5peg5ZON5bqUIixyYXc6ZH07CiAgICB9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBkYXRhPWF3YWl0IGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLDMpOwogICAgcmV0dXJue2FjY291bnRzOmRhdGEsdGltZXN0YW1wOm5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxvazp0cnVlfTsKICB9LAogIGFzeW5jIHJ1blNpZ25pbih1c2VySWQsYWxsKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3J1bi1zaWduaW4iLGFsbD97YWxsOnRydWV9Ont1c2VySWQ6dXNlcklkfSk7aWYoZCYmZC5yZXN1bHRzKXJldHVybntvazp0cnVlLHJlc3VsdHM6ZC5yZXN1bHRzfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5omn6KGM5aSx6LSlIn19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCByZXN1bHRzPVtdO2NvbnN0IHRhcmdldHM9YWxsP2FjY291bnRzOmFjY291bnRzLmZpbHRlcihhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpOwogICAgaWYoIXRhcmdldHMubGVuZ3RoKXJldHVybntvazp0cnVlLHJlc3VsdHM6W119OwogICAgZm9yKGNvbnN0IGFjYyBvZiB0YXJnZXRzKXtjb25zdCByPWF3YWl0IHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyk7cmVzdWx0cy5wdXNoKHIpO2NvbnN0IF9kPW5ldyBEYXRlKCk7Y29uc3QgX2RzPV9kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF9kLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl9kcyx0eXBlOiJzaWduaW4iLHVzZXJOYW1lOnIudXNlck5hbWUsdXNlcklkOnIudXNlcklkLHN1Y2Nlc3M6ci5zdWNjZXNzLHRvdGFsR2FpbjpyLnRvdGFsR2FpbixzaWduaW5TY29yZTpyLnNpZ25pblNjb3JlLGJsaW5kQm94U2NvcmU6ci5ibGluZEJveFNjb3JlLGludGVyYWN0U2NvcmU6ci5pbnRlcmFjdFNjb3JlLGNvbnRpbnVlRGF5czpyLmNvbnRpbnVlRGF5cyxlcnJvcjpyLmVycm9yLHN0ZXBzOnIuc3RlcHN9KTtpZihyLnN1Y2Nlc3MmJmFjYy5iYXJrS2V5JiZTdHJpbmcoYWNjLmJhcmtLZXkpLnRyaW0oKSl7dHJ5e2F3YWl0IGJhcmtQdXNoKGFjYy5iYXJrS2V5LCLmnoHmoLjnrb7liLDmiJDlip8gwrcgIisoci51c2VyTmFtZXx8IiIpLCLku4rml6XojrflvpcgIityLnRvdGFsR2FpbisiIOWIhu+8iOetvuWIsCIrci5zaWduaW5TY29yZSsiIC8g55uy55uSIityLmJsaW5kQm94U2NvcmUrIiAvIOS6kuWKqCIrci5pbnRlcmFjdFNjb3JlKyLvvInvvIzov57nrb4gIityLmNvbnRpbnVlRGF5cysiIOWkqSIpfWNhdGNoKGUpe319fQogICAgcmV0dXJue29rOnRydWUscmVzdWx0c307CiAgfSwKICBhc3luYyB2ZWhpY2xlQ3RybCh1c2VySWQsYWN0aW9uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbCIse3VzZXJJZDp1c2VySWQsYWN0aW9uOmFjdGlvbn0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLmjIfku6Tlt7LkuIvlj5EiOiLmjIfku6TlpLHotKUiKX19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtsZXQgYWNjPWFjY291bnRzLmZpbmQoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTtpZighYWNjJiZhY2NvdW50cy5sZW5ndGgpYWNjPWFjY291bnRzWzBdO2lmKCFhY2MpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquaJvuWIsOi0puWPt++8jOivt+WFiOWcqOiuvue9rumhtea3u+WKoCJ9O2lmKCFWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl0pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IumdnuazleaTjeS9nOexu+WeiyJ9O2NvbnN0IHI9YXdhaXQgdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpO2NvbnN0IF92ZD1uZXcgRGF0ZSgpO2NvbnN0IF92ZHM9X3ZkLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfdmQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfdmQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl92ZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl92ZHMsdHlwZToidmVoaWNsZSIsYWN0aW9uOmFjdGlvbixhY3Rpb25UZXh0OlZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXXx8Iui9pui+huaOp+WItiIsdXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOiEhci5vayxtZXNzYWdlOnIubWVzc2FnZXx8IiIsZXJyb3I6ci5vaz8iIjooci5tZXNzYWdlfHwi5oyH5Luk5aSx6LSlIil9KTtyZXR1cm4gcjsKICB9LAogIGFzeW5jIGdldExvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZ2V0LWxvZ3MiKTtyZXR1cm4gZCYmZC5sb2dzP2QubG9nczpbXX1yZXR1cm4gZ2V0TG9ncygpfSwKICBhc3luYyBjbGVhckxvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9jbGVhci1sb2dzIik7cmV0dXJuICEhZC5va31yZXR1cm4gY2xlYXJMb2dzKCl9LAogIGFzeW5jIHNhdmVDb25maWcoYyl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1jb25maWciLGMpO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVDZmcoYyl9LAogIGFzeW5jIHNhdmVBY2NvdW50cyhsaXN0KXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWFjY291bnRzIix7YWNjb3VudHM6bGlzdH0pO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVBY2NvdW50cyhsaXN0KX0sCiAgYXN5bmMgZ2V0VXNlcmlkKHRva2VuKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9nZXQtdXNlcmlkIix7dG9rZW46dG9rZW59KTtyZXR1cm57b2s6ISFkLm9rLHVzZXJJZDpkLnVzZXJJZHx8IiIsdXNlck5hbWU6ZC51c2VyTmFtZXx8IiIsZXJyb3I6ZC5lcnJvcnx8IiJ9fXJldHVybiBnZXRVc2VyaWRCeVRva2VuKHRva2VuLGdldENmZygpKX0sCiAgYXN5bmMgZ2V0Q29uZmlnKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2NvbmZpZyIpO2lmKGQmJmQuY29uZmlnKXJldHVybntvazp0cnVlLGNvbmZpZzpkLmNvbmZpZ307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuiOt+WPlumFjee9ruWksei0pSJ9fXJldHVybntvazp0cnVlLGNvbmZpZzpnZXRDZmcoKX19LAogIGFzeW5jIGdldEFjY291bnRzRnVsbCgpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9hY2NvdW50cyIpO3JldHVybiBBcnJheS5pc0FycmF5KGQmJmQuYWNjb3VudHMpP2QuYWNjb3VudHM6W119cmV0dXJuIGdldEFjY291bnRzKCl9LAogIGFzeW5jIGJhY2t1cCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2JhY2t1cCIpO3JldHVybiBkJiZkLm9rP2Q6bnVsbH0KICAgIHJldHVybntvazp0cnVlLGFwcDoi5p6B5qC4WkVFSE8iLHR5cGU6InplZWhvX2JhY2t1cCIsdmVyc2lvbjpBUFBfVkVSU0lPTix0aW1lOmZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxhY2NvdW50czpnZXRBY2NvdW50cygpLGNvbmZpZzpnZXRDZmcoKX0KICB9LAogIGFzeW5jIHJlc3RvcmVCYWNrdXAoanNvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9pbXBvcnQiLHtqc29uOmpzb259KTtyZXR1cm4gZHx8e29rOmZhbHNlLGVycm9yOiLlkI7nq6/ml6Dlk43lupQifX0KICAgIHRyeXsKICAgICAgY29uc3QgYj10eXBlb2YganNvbj09PSJzdHJpbmciP0pTT04ucGFyc2UoanNvbik6anNvbjsKICAgICAgaWYoIWJ8fChiLnR5cGUhPT0iemVlaG9fYmFja3VwIiYmIUFycmF5LmlzQXJyYXkoYi5hY2NvdW50cykpKXJldHVybntvazpmYWxzZSxlcnJvcjoi5aSH5Lu95qC85byP5LiN5q2j56GuIn07CiAgICAgIGNvbnN0IGxpc3Q9KGIuYWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5fHwiIiksdXNlckFnZW50OmEudXNlckFnZW50fHwiIn0pKTsKICAgICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgICBpZihiLmNvbmZpZyYmdHlwZW9mIGIuY29uZmlnPT09Im9iamVjdCIpewogICAgICAgIGNvbnN0IGN1cj1nZXRDZmcoKTsKICAgICAgICBzYXZlQ2ZnKHsKICAgICAgICAgIGFwcDp7YXBwSWQ6Yi5jb25maWcuYXBwPy5hcHBJZHx8Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuYXBwPy5hcHBTZWNyZXR8fGN1ci5hcHAuYXBwU2VjcmV0fSwKICAgICAgICAgIGg1OnthcHBJZDpiLmNvbmZpZy5oNT8uYXBwSWR8fGN1ci5oNS5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuaDU/LmFwcFNlY3JldHx8Y3VyLmg1LmFwcFNlY3JldH0sCiAgICAgICAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sCiAgICAgICAgICB2ZWhpY2xlQWVzS2V5OlN0cmluZyhiLmNvbmZpZy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpfHxjdXIudmVoaWNsZUFlc0tleSwKICAgICAgICAgIHZlaGljbGVDb250cm9sUmlzazpTdHJpbmcoYi5jb25maWcudmVoaWNsZUNvbnRyb2xSaXNrfHwiIikudHJpbSgpLAogICAgICAgICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhiLmNvbmZpZy5hdXRvUmVmcmVzaFNlYyksCiAgICAgICAgICBzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlCiAgICAgICAgfSk7CiAgICAgIH0KICAgICAgcmV0dXJue29rOnRydWUsY291bnQ6bGlzdC5sZW5ndGh9OwogICAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQogIH0sCiAgLyogLS0tLSB2Mi4xNC45IOaWsOWinuWQjuerr+iDveWKm++8iOS7heS7o+eQhuaooeW8j++8iSAtLS0tICovCiAgYXN5bmMgaW50ZWdyYWwodXNlcklkLHBhZ2UpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIERFTU9fSU5URUdSQUw7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaCgiL2FwaS9pbnRlZ3JhbD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZwYWdlPSIrKHBhZ2V8fDEpKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi56ev5YiG5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgc3VwcGxlbWVudChhY3Rpb24sdXNlcklkLHBhcmFtcyl7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gYWN0aW9uPT09Im1vbnRoIj97b2s6dHJ1ZSxkYXRhOntub3dTaWduRGV0YWlsVm9zOmRlbW9DYWwoKX19OihERU1PX1NVUFBMRU1FTlRbYWN0aW9uXXx8e29rOnRydWUsZGF0YToxfSk7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgbGV0IHE9Ii9hcGkvc3VwcGxlbWVudD9hY3Rpb249IitlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uKSsiJnVzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTsKICAgICAgcGFyYW1zPXBhcmFtc3x8e307T2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKGs9PntxKz0iJiIrZW5jb2RlVVJJQ29tcG9uZW50KGspKyI9IitlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW2tdKX0pOwogICAgICByZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKQogICAgfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLooaXnrb7lip/og73ku4XmlK/mjIHku6PnkIbmqKHlvI/vvIhpT1MgQXBwIC8g5qGM6Z2i54mIIC8gTG9vbu+8iSJ9CiAgfSwKICBhc3luYyB2ZWhpY2xlTW9uaXRvcih1c2VySWQsdmluKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBERU1PX01PTklUT1I7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtsZXQgcT0iL2FwaS92ZWhpY2xlLW1vbml0b3I/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLovabovobnm5Hmjqfku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgdmVoaWNsZUNvbnRyb2xFeHQoYm9keSl7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gKGJvZHkmJmJvZHkuYWN0aW9uPT09Im9wdGlvbnMiKT9ERU1PX0NUUkxfT1BUUzp7b2s6dHJ1ZSxtZXNzYWdlOiLmvJTnpLrmqKHlvI/vvJrmjIfku6TmnKrnnJ/lrp7kuIvlj5EifTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe3JldHVybiBhd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sLWV4dCIsYm9keSl9CiAgICByZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6L2m5o6n5omp5bGV5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIGluZm9DZW50ZXIodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19JTkZPOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvaW5mby1jZW50ZXI/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLkv6Hmga/kuK3lv4Pku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgaW5zdGFsbEluZm8oKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9hcHAtaW5zdGFsbC1pbmZvIik7cmV0dXJuIGR8fG51bGx9CiAgICByZXR1cm4gbnVsbAogIH0KfTsKLyogPT09PT09PT09PT09PT09PT0g6Z2i5p2/5pWw5o2u5ZCM5q2l77yI6Z2i5p2/5qih5byP77ya6K6+572u6aG15LuO6ISa5pys5ZCO56uv6K+76LSm5Y+35LiO6YWN572u77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5UmVtb3RlQ2ZnKGMpewogIGlmKCFjfHx0eXBlb2YgYyE9PSJvYmplY3QiKXJldHVybjsKICBjb25zdCBsb2NhbD1nZXRDZmcoKTsKICBzYXZlQ2ZnKHsKICAgIGFwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxsb2NhbC5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fGxvY2FsLmFwcC5hcHBTZWNyZXR9LAogICAgaDU6e2FwcElkOmMuaDU/LmFwcElkfHxsb2NhbC5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxsb2NhbC5oNS5hcHBTZWNyZXR9LAogICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKXx8bG9jYWwudmVoaWNsZUFlc0tleSwKICAgIHZlaGljbGVDb250cm9sUmlzazpTdHJpbmcoYy52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCksCiAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGMuYXV0b1JlZnJlc2hTZWMpLAogICAgc2VydmVyQmFzZTpsb2NhbC5zZXJ2ZXJCYXNlLAogICAgYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLAogICAgYXV0b1NpZ25pblRpbWU6KHR5cGVvZiBjLmF1dG9TaWduaW5UaW1lPT09InN0cmluZyImJi9eXGR7MSwyfTpcZHsyfSQvLnRlc3QoYy5hdXRvU2lnbmluVGltZSk/Yy5hdXRvU2lnbmluVGltZToiMDc6MDAiKSwKICAgIHZlaGljbGVNb25pdG9yOmMudmVoaWNsZU1vbml0b3I9PT10cnVlLAogICAgd2lkZ2V0VmVoaWNsZTpTdHJpbmcoYy53aWRnZXRWZWhpY2xlfHwiIiksCiAgICBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpCiAgfSk7Cn0KbGV0IHBhbmVsU3luY2luZz1mYWxzZTsKYXN5bmMgZnVuY3Rpb24gZW5zdXJlUGFuZWxEYXRhKGZvcmNlKXsKICBpZighaXNQcm94eU1vZGUoKXx8bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MClyZXR1cm47CiAgaWYocGFuZWxTeW5jaW5nKXJldHVybjsKICBpZighZm9yY2UmJlNUQVRFLnBhbmVsTG9hZGVkKXJldHVybjsKICBwYW5lbFN5bmNpbmc9dHJ1ZTsKICB0cnl7CiAgICBjb25zdCBbYyxhXT1hd2FpdCBQcm9taXNlLmFsbChbQmFja2VuZC5nZXRDb25maWcoKSxCYWNrZW5kLmdldEFjY291bnRzRnVsbCgpXSk7CiAgICBpZihhJiZhLmxlbmd0aCl7U1RBVEUucGFuZWxBY2NvdW50cz1hfQogICAgaWYoYyYmYy5vayYmYy5jb25maWcpYXBwbHlSZW1vdGVDZmcoYy5jb25maWcpOwogICAgU1RBVEUucGFuZWxMb2FkZWQ9dHJ1ZTsKICB9Y2F0Y2goZSl7fQogIHBhbmVsU3luY2luZz1mYWxzZTsKfQovKiA9PT09PT09PT09PT09PT09PSDlm77moIcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgST17CmNoZWNrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCA2IDkgMTdsLTUtNSIvPjwvc3ZnPicsCng6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz4nLAp6YXA6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA4IDB2NCIvPjwvc3ZnPicsCnVubG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDcuNS0xLjciLz48L3N2Zz4nLApiZWxsOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOCA4YTYgNiAwIDEgMC0xMiAwYzAgNy0zIDktMyA5aDE4cy0zLTItMy05Ii8+PHBhdGggZD0iTTEzLjcgMjFhMiAyIDAgMCAxLTMuNCAwIi8+PC9zdmc+JywKdm9sOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMSA1IDYgOUgydjZoNGw1IDRWNXoiLz48cGF0aCBkPSJNMTUuNSA4LjVhNSA1IDAgMCAxIDAgN00xOC41IDUuNWE5IDkgMCAwIDEgMCAxMyIvPjwvc3ZnPicsCnNlYXQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgNGgxNHY3YTQgNCAwIDAgMS00IDRIOWE0IDQgMCAwIDEtNC00VjR6Ii8+PHBhdGggZD0iTTkgMTV2NWg2di01Ii8+PC9zdmc+JywKcGluOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAxMGMwIDYtOCAxMi04IDEycy04LTYtOC0xMmE4IDggMCAwIDEgMTYgMHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIi8+PC9zdmc+JywKdGlyZTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMuNSIvPjxwYXRoIGQ9Ik0xMiAzdjUuNU0xMiAxNS41VjIxTTMgMTJoNS41TTE1LjUgMTJIMjEiLz48L3N2Zz4nLApib2x0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLAp0aGVybW86Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDE0Ljc2VjVhMiAyIDAgMSAwLTQgMHY5Ljc2YTQgNCAwIDEgMCA0IDB6Ii8+PC9zdmc+JywKY2FsOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjMiLz48cGF0aCBkPSJNMTYgMnY0TTggMnY0TTMgMTBoMTgiLz48L3N2Zz4nLApjYXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTMgNi41IDcuNUEyIDIgMCAwIDEgOC40IDZoNy4yYTIgMiAwIDAgMSAxLjkgMS41TDE5IDEzIi8+PHBhdGggZD0iTTQgMTNoMTZhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMS0xIDFoLTFhMiAyIDAgMSAxLTQgMEg5YTIgMiAwIDEgMS00IDBINGExIDEgMCAwIDEtMS0xdi0zYTEgMSAwIDAgMSAxLTF6Ii8+PC9zdmc+JywKc2Nvb3RlcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nLApwbHVnOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDJ2Nk0xNSAydjZNNyA4aDEwdjRhNSA1IDAgMCAxLTEwIDBWOHpNMTIgMTd2NSIvPjwvc3ZnPicsCmNsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48cGF0aCBkPSJNMTIgN3Y1bDMgMyIvPjwvc3ZnPicsCndpZmk6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTIuNWExMCAxMCAwIDAgMSAxNCAwTTguNSAxNmE1IDUgMCAwIDEgNyAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxOSIgcj0iMSIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+JywKYWxlcnQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDl2NE0xMiAxN2guMDEiLz48cGF0aCBkPSJNMTAuMyAzLjkgMS44IDE4YTIgMiAwIDAgMCAxLjcgM2gxN2EyIDIgMCAwIDAgMS43LTNMMTMuNyAzLjlhMiAyIDAgMCAwLTMuNCAweiIvPjwvc3ZnPicsCndhcm46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDMgMiAyMWgyMEwxMiAzeiIvPjxwYXRoIGQ9Ik0xMiAxMHY1TTEyIDE4aC4wMSIvPjwvc3ZnPicsCmt2Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjUiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxNCIgcng9IjMiLz48cGF0aCBkPSJNNyA5aDNNMTQgMTVoM00xMCA5aC4wMU0xNyAxNWguMDEiLz48L3N2Zz4nLAprZXk6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOCIgY3k9IjE1IiByPSI0LjUiLz48cGF0aCBkPSJNMTEuMiAxMS44IDIwIDNNMTYgN2wzIDNNMTMgMTBsMiAyIi8+PC9zdmc+JywKdXNlcnM6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjgiIHI9IjQiLz48cGF0aCBkPSJNMiAyMWE3IDcgMCAwIDEgMTQgME0xNiA0LjZhNCA0IDAgMCAxIDAgNi44TTE5IDIxYTYuNSA2LjUgMCAwIDAtMy01LjUiLz48L3N2Zz4nLAptYXA6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMyAzLjUgNXYxNkw5IDE5bDYgMiA1LjUtMlYzTDE1IDUgOSAzeiIvPjxwYXRoIGQ9Ik05IDN2MTZNMTUgNXYxNiIvPjwvc3ZnPicKfTsKCi8qID09PT09PT09PT09PT09PT09IOWfuuehgCBVSSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgdG9hc3RUaW1lcj1udWxsOwpmdW5jdGlvbiB0b2FzdChtc2csdHlwZSl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInRvYXN0Iik7ZWwuY2xhc3NOYW1lPXR5cGV8fCJpbmZvIjtlbC5pbm5lckhUTUw9KHR5cGU9PT0iZXJyIj9JLng6dHlwZT09PSJvayI/SS5jaGVjazpJLndpZmkpKyc8c3Bhbj4nK2VzYyhtc2cpKyc8L3NwYW4+JztyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCk9PmVsLmNsYXNzTGlzdC5hZGQoInNob3ciKSk7Y2xlYXJUaW1lb3V0KHRvYXN0VGltZXIpO3RvYXN0VGltZXI9c2V0VGltZW91dCgoKT0+ZWwuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpLDI2MDApfQovKiB2Mi4xNC4xMCDkv67lpI3vvJrml6fniYjmiorlm57osIPlh73mlbDmupDnoIHnm7TmjqXmi7zov5sgb25jbGljayDlsZ7mgKfvvIxhc3luYyDlm57osIPlhoXnmoTlj4zlvJXlj7fkvJrmiKrmlq0gSFRNTCDlsZ7mgKfvvIwKICAg5a+86Ie06KGl562+L+WFkeaNouihpeetvuWNoS/pmLLnm5fluIPmjqfnrYnjgIznoa7lrprjgI3mjInpkq7ngrnlh7vml6Dlj43lupTjgILmlLnkuLrmmoLlrZjlm57osIPjgIHmjInpkq7osIPnlKjlhajlsYAgY29uZmlybVllcygpICovCmxldCBfX2NvbmZpcm1BY3Q9bnVsbDsKZnVuY3Rpb24gY29uZmlybURpYWxvZyh0aXRsZSxkZXNjLG9uWWVzLHllc1R4dCl7X19jb25maXJtQWN0PW9uWWVzO2NvbnN0IGxheWVyPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKTtsYXllci5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNvbmZpcm0iPjxkaXYgY2xhc3M9ImN0Ij4nK2VzYyh0aXRsZSkrJzwvZGl2PjxkaXYgY2xhc3M9ImNkIj4nK2Rlc2MrJzwvZGl2PjxkaXYgY2xhc3M9ImNiIj48YnV0dG9uIGNsYXNzPSJubyIgb25jbGljaz0iY2xvc2VDb25maXJtKCkiPuWPlua2iDwvYnV0dG9uPjxidXR0b24gY2xhc3M9InllcyIgb25jbGljaz0iY29uZmlybVllcygpIj4nK2VzYyh5ZXNUeHR8fCLnoa7lrpoiKSsnPC9idXR0b24+PC9kaXY+PC9kaXY+JztsYXllci5jbGFzc0xpc3QucmVtb3ZlKCJoaWRkZW4iKX0KZnVuY3Rpb24gY29uZmlybVllcygpe2Nsb3NlQ29uZmlybSgpO2NvbnN0IGE9X19jb25maXJtQWN0O19fY29uZmlybUFjdD1udWxsO2lmKGE9PW51bGwpcmV0dXJuO3RyeXtpZih0eXBlb2YgYT09PSJmdW5jdGlvbiIpe2EoKX1lbHNlIGlmKHR5cGVvZiBhPT09InN0cmluZyIpe2NvbnN0IHI9bmV3IEZ1bmN0aW9uKCJyZXR1cm4gKCIrYSsiKSIpKCk7aWYodHlwZW9mIHI9PT0iZnVuY3Rpb24iKXIoKX19Y2F0Y2goZSl7fX0KZnVuY3Rpb24gY2xvc2VDb25maXJtKCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpLmNsYXNzTGlzdC5hZGQoImhpZGRlbiIpfQpmdW5jdGlvbiBvcGVuU2hlZXQodGl0bGUsaWNvbixodG1sKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRUaXRsZSIpLmlubmVySFRNTD1pY29uKyc8c3Bhbj4nK2VzYyh0aXRsZSkrJzwvc3Bhbj4nO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJvZHkiKS5pbm5lckhUTUw9aHRtbDtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iaGlkZGVuIn0KZnVuY3Rpb24gY2xvc2VTaGVldCgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSIifQpmdW5jdGlvbiBmbXRUaW1lKGlzbyl7dHJ5e2NvbnN0IGQ9bmV3IERhdGUoaXNvKTtjb25zdCBwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIik7cmV0dXJuIGQuZ2V0RnVsbFllYXIoKSsiLSIrcChkLmdldE1vbnRoKCkrMSkrIi0iK3AoZC5nZXREYXRlKCkpKyIgIitwKGQuZ2V0SG91cnMoKSkrIjoiK3AoZC5nZXRNaW51dGVzKCkpKyI6IitwKGQuZ2V0U2Vjb25kcygpKX1jYXRjaChlKXtyZXR1cm4iIn19CgovKiA9PT09PT09PT09PT09PT09PSDpobXpnaLliIfmjaIgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gc3dpdGNoVGFiKHRhYil7CiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiLnRhYiIpLmZvckVhY2godD0+dC5jbGFzc0xpc3QudG9nZ2xlKCJvbiIsdC5kYXRhc2V0LnRhYj09PXRhYikpOwogIGNvbnN0IHBhZ2VzPXtob21lOiJwYWdlSG9tZSIscG9pbnRzOiJwYWdlUG9pbnRzIix2ZWhpY2xlOiJwYWdlVmVoaWNsZSIsbG9nczoicGFnZUxvZ3MiLGNmZzoicGFnZUNmZyJ9OwogIE9iamVjdC5rZXlzKHBhZ2VzKS5mb3JFYWNoKGs9Pntjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChwYWdlc1trXSk7aWYoZWwpZWwuY2xhc3NMaXN0LnRvZ2dsZSgiaGlkZGVuIixrIT09dGFiKX0pOwogIC8vIOeri+WNs+etvuWIsOaCrOa1ruaMiemSruS7hemmlumhteaYvuekugogIGNvbnN0IGZhYj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7aWYoZmFiKWZhYi5zdHlsZS5kaXNwbGF5PSh0YWI9PT0iaG9tZSI/ImZsZXgiOiJub25lIik7CiAgaWYodGFiPT09InBvaW50cyIpcmVuZGVyUG9pbnRzKCk7CiAgaWYodGFiPT09InZlaGljbGUiKXtyZW5kZXJWZWhpY2xlUGFnZSgpO25hdkluaXRPblRhYigpfQogIGlmKHRhYj09PSJsb2dzIilyZW5kZXJMb2dzKCk7CiAgaWYodGFiPT09ImNmZyIpcmVuZGVyQ2ZnKCk7Cn0KCi8qID09PT09PT09PT09PT09PT09IOiHquWKqOWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwpsZXQgcmVmcmVzaFRpbWVyPW51bGwscmVmcmVzaExlZnQ9NjA7CmZ1bmN0aW9uIHN0YXJ0QXV0b1JlZnJlc2goc2VjKXtzdG9wQXV0b1JlZnJlc2goKTtyZWZyZXNoTGVmdD1zZWN8fGdldENmZygpLmF1dG9SZWZyZXNoU2VjO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hUaW1lcj1zZXRJbnRlcnZhbCgoKT0+e3JlZnJlc2hMZWZ0LS07aWYocmVmcmVzaExlZnQ8PTApe3JlZnJlc2hMZWZ0PTA7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHVwZGF0ZUNvdW50Q2hpcCgpfSwxMDAwKX0KZnVuY3Rpb24gc3RvcEF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXtjbGVhckludGVydmFsKHJlZnJlc2hUaW1lcik7cmVmcmVzaFRpbWVyPW51bGx9fQpmdW5jdGlvbiB1cGRhdGVDb3VudENoaXAoKXtjb25zdCBjaGlwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudENoaXAiKTtjb25zdCB0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50VHh0Iik7Y29uc3QgYXJjPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudEFyYyIpO2NvbnN0IHNlYz1nZXRDZmcoKS5hdXRvUmVmcmVzaFNlY3x8NjA7aWYoIWNoaXApcmV0dXJuO2lmKHJlZnJlc2hUaW1lcil7Y2hpcC5jbGFzc0xpc3QuYWRkKCJvbiIpO3R4dC50ZXh0Q29udGVudD1yZWZyZXNoTGVmdCsicyI7Y29uc3QgQz0yKk1hdGguUEkqNS42O2FyYy5zZXRBdHRyaWJ1dGUoInN0cm9rZS1kYXNob2Zmc2V0IixTdHJpbmcoQyooMS1yZWZyZXNoTGVmdC9zZWMpKSl9ZWxzZXtjaGlwLmNsYXNzTGlzdC5yZW1vdmUoIm9uIik7dHh0LnRleHRDb250ZW50PSLmiYvliqgifX0KZnVuY3Rpb24gdG9nZ2xlQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpc3RvcEF1dG9SZWZyZXNoKCk7ZWxzZSBzdGFydEF1dG9SZWZyZXNoKCk7dXBkYXRlQ291bnRDaGlwKCl9CgovKiA9PT09PT09PT09PT09PT09PSDkuIvmi4nliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KKGZ1bmN0aW9uKCl7Y29uc3Qgd3JhcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyV3JhcCIpLGluZD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRySW5kIiksdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJUeHQiKSxzcGluPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJTcGluIik7bGV0IHN0YXJ0WT0wLHB1bGxpbmc9ZmFsc2UsZGlzdGFuY2U9MDtjb25zdCBUSD02NDsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaHN0YXJ0IixlPT57aWYod2luZG93LnNjcm9sbFk8PTAmJmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpJiYhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJoaWRkZW4iKSl7c3RhcnRZPWUudG91Y2hlc1swXS5jbGllbnRZO3B1bGxpbmc9dHJ1ZTtkaXN0YW5jZT0wfX0se3Bhc3NpdmU6dHJ1ZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNobW92ZSIsZT0+e2lmKCFwdWxsaW5nKXJldHVybjtjb25zdCBkeT1lLnRvdWNoZXNbMF0uY2xpZW50WS1zdGFydFk7aWYoZHk+MCYmd2luZG93LnNjcm9sbFk8PTApe2Rpc3RhbmNlPU1hdGgubWluKGR5KjAuNSw5MCk7aW5kLnN0eWxlLmhlaWdodD1kaXN0YW5jZSsicHgiO2luZC5jbGFzc0xpc3QuYWRkKCJwdWxsaW5nIik7c3Bpbi5zdHlsZS50cmFuc2Zvcm09InJvdGF0ZSgiKyhkaXN0YW5jZSozLjYpKyJkZWcpIjt0eHQudGV4dENvbnRlbnQ9ZGlzdGFuY2U+PVRIPyLmnb7lvIDliLfmlrAiOiLkuIvmi4nliLfmlrAiO2lmKGRpc3RhbmNlPj1USCYmIWUuY2FuY2VsYWJsZSlyZXR1cm47aWYoZGlzdGFuY2U+PVRIJiZlLmNhbmNlbGFibGUpZS5wcmV2ZW50RGVmYXVsdCgpfX0se3Bhc3NpdmU6ZmFsc2V9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaGVuZCIsKCk9PntpZighcHVsbGluZylyZXR1cm47cHVsbGluZz1mYWxzZTtpZihkaXN0YW5jZT49VEgpe3R4dC50ZXh0Q29udGVudD0i5Yi35paw5Lit4oCmIjtpbmQuc3R5bGUuaGVpZ2h0PSI0NnB4IjtzcGluLmNsYXNzTGlzdC5hZGQoInNwaW5uZXIiKTtyZWZyZXNoQWxsKHRydWUpLmZpbmFsbHkoKCk9PntpbmQuc3R5bGUuaGVpZ2h0PSIwIjtpbmQuY2xhc3NMaXN0LnJlbW92ZSgicHVsbGluZyIpfSl9ZWxzZXtpbmQuc3R5bGUuaGVpZ2h0PSIwIn1kaXN0YW5jZT0wfSx7cGFzc2l2ZTp0cnVlfSk7Cn0pKCk7CgovKiA9PT09PT09PT09PT09PT09PSDpppbpobXmuLLmn5MgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFNUQVRFPXtkYXRhOltdLHRpbWVzdGFtcDoiIix0c1RleHQ6IiIscmVmcmVzaFNlYzo2MCxwcm94eTpmYWxzZSxwYW5lbEFjY291bnRzOm51bGwscGFuZWxMb2FkZWQ6ZmFsc2V9OwovLyDpppbpobXljaHniYflhaXlnLrliqjnlLvlj6rlnKjnrKzkuIDmrKHmuLLmn5Pml7bmkq3mlL7vvIzkuYvlkI7pnZnpu5jliLfmlrDnm7TmjqXmm7/mjaLlhoXlrrnvvIzpgb/lhY3lsY/pl6oKbGV0IEhPTUVfQU5JTT10cnVlOwpmdW5jdGlvbiBza2VsZXRvbkhvbWUoKXtyZXR1cm4gJzxkaXYgY2xhc3M9Imhlcm8iIHN0eWxlPSJoZWlnaHQ6MTMycHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc0MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NjAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+J30KZnVuY3Rpb24gc2Nvb3RlckZhbGxiYWNrKCl7cmV0dXJuICc8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+J30KCmZ1bmN0aW9uIHJlbmRlckhvbWUoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtjb25zdCBkYXRhPVNUQVRFLmRhdGE7CiAgLy8g5LiN5YaN5Zyo5q+P5qyh5riy5p+T5YmN5o+S5YWl6aqo5p625bGP77ya6Z2Z6buY6Ieq5Yqo5Yi35paw5pe25Lya5YWI5riF56m65YaN5aGr5YWF77yM6YCg5oiQ5pW06aG16Zeq54OBCiAgaWYoZGF0YS5sZW5ndGg9PT0wKXsKICAgIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxkaXYgY2xhc3M9ImUtaWNvbiI+JytJLmNhcisnPC9kaXY+PGgzPui/mOayoeacieaegeaguOi0puWPtzwvaDM+PHA+5Y6744CM6K6+572u44CN6aG15re75Yqg6LSm5Y+377ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24gVG9rZW7vvIhCZWFyZXIg5YmN57yA5Lya6Ieq5Yqo5Y675o6J77yJ77yM5YaN54K544CM6I635Y+WSUTjgI3ljbPlj6/oh6rliqjloavlhYXnlKjmiLdJROOAgjwvcD48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7ljrvmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nOwogICAgcmV0dXJuOwogIH0KICAvLyDmsqHmnInnu5HlrprovabovobnmoTotKblj7fkuI3lnKjpppbpobXmmL7npLrljaHniYcKICBjb25zdCBjYXJkcz1kYXRhLmZpbHRlcihhPT5hLnZlaGljbGUmJmEudmVoaWNsZS5oYXNWZWhpY2xlKS5tYXAoKGEsaWR4KT0+cmVuZGVyQWNjb3VudENhcmQoYSxpZHgpKS5qb2luKCIiKTsKICBlbC5pbm5lckhUTUw9Y2FyZHMKICArJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3IOaVsOaNruabtOaWsCAnK2VzYyhTVEFURS50c1RleHR8fCItIikrJzxicj48YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciI+5L2c6ICFIGx1Y2t5IMK3IEdpdEh1YjwvYT4gwrcgPGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4IiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciI+54ix5Y+R55S1PC9hPiDCtyDku4XkvpvlrabkuaDnoJTnqbY8L2Rpdj4nOwogIEhPTUVfQU5JTT1mYWxzZTsKfQoKZnVuY3Rpb24gcG93ZXJUZXh0KHAsbCl7cD1TdHJpbmcocHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2w9U3RyaW5nKGx8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtjb25zdCBvblZhbHM9WyIxIiwib24iLCJ0cnVlIiwi5byA5py6Iiwib3BlbiIsIua/gOa0uyIsImFjY19vbiIsImFjYyBvbiIsInBvd2VyX29uIiwicG93ZXIgb24iLCLlt7LlvIDmnLoiLCLlt7LkuIrnlLUiXTtjb25zdCBvZmZWYWxzPVsiMCIsIm9mZiIsImZhbHNlIiwi5YWz5py6IiwiY2xvc2VkIiwi5b6F5py6IiwiYWNjX29mZiIsImFjYyBvZmYiLCJwb3dlcl9vZmYiLCJwb3dlciBvZmYiLCLlt7LlhbPmnLoiLCLlt7LkuIvnlLUiXTtpZihwKXtpZihvblZhbHMuaW5jbHVkZXMocCkpcmV0dXJue3RleHQ6IuW3suW8gOacuiIsY2xzOiJvbiJ9O2lmKG9mZlZhbHMuaW5jbHVkZXMocCkpcmV0dXJue3RleHQ6IuW3suWFs+acuiIsY2xzOiJvZmYifX1pZihsKXtpZihbIjAiLCLmnKrplIEiLCLlvIDplIEiLCJ1bmxvY2tlZCIsImZhbHNlIiwib3BlbiIsIuW3suW8gOmUgSIsIuacqumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihbIjEiLCLlt7LplIEiLCLplIHovaYiLCJsb2NrZWQiLCJ0cnVlIiwiY2xvc2VkIiwi5bey6ZSB6L2mIl0uaW5jbHVkZXMobCkpcmV0dXJue3RleHQ6IuW3suWFs+acuiIsY2xzOiJvZmYifX1yZXR1cm57dGV4dDoi54q25oCB5pyq55+lIixjbHM6Im9mZiJ9fQpmdW5jdGlvbiBvbmxpbmVUZXh0KG8pe2NvbnN0IHM9U3RyaW5nKG98fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtpZighcylyZXR1cm4iIjtpZihbIjEiLCJvbiIsIm9ubGluZSIsInRydWUiLCLlnKjnur8iLCLlt7LlnKjnur8iLCJjb25uZWN0ZWQiLCJub3JtYWwiXS5pbmNsdWRlcyhzKSlyZXR1cm4i5Zyo57q/IjtpZihbIjAiLCJvZmYiLCJvZmZsaW5lIiwiZmFsc2UiLCLnprvnur8iLCLmnKrlnKjnur8iLCLlt7Lnprvnur8iLCJkaXNjb25uZWN0IiwiZGlzY29ubmVjdGVkIiwic2xlZXAiLCLkvJHnnKAiXS5pbmNsdWRlcyhzKSlyZXR1cm4i56a757q/IjtyZXR1cm4gc30KZnVuY3Rpb24gcmVuZGVyQWNjb3VudENhcmQoYSxpZHgpewogIGNvbnN0IHY9YS52ZWhpY2xlfHx7fTsKICBjb25zdCBvbmw9b25saW5lVGV4dCh2Lm9ubGluZXx8di5yaWRlU3RhdGUpOwogIGNvbnN0IGlzQ2hhcmdpbmc9ISEodi5jaGFyZ2VTdGF0ZSYmdi5jaGFyZ2VTdGF0ZSE9PSLmnKrlhYXnlLUiKTsKICBjb25zdCBzb2M9di5iYXR0ZXJ5UGVyY2VudHx8MDsKICBjb25zdCBzb2NDb2w9c29jPD0yMD8iI0Y5NzA2QSI6c29jPD01MD8iI0Y3Qjk1NSI6IiMzRERDOTciOwogIGNvbnN0IHJhbmdlPXYucmVzaWR1YWxSYW5nZUttfHwwOwogIGNvbnN0IHZvbHQ9di52b2x0YWdlP01hdGgucm91bmQodi52b2x0YWdlKSsiViI6IiI7CiAgY29uc3QgZmI9c2Nvb3RlckZhbGxiYWNrKCk7CiAgLy8gb25lcnJvciDph4zkuI3og73lho3ltYzlpZflvJXlj7fvvIjml6flhpnms5XkvJrmioogU1ZHIOW8leWPt+aIquaWre+8jOmhtemdouaui+eVmSAnIj4g5Lmx56CB56ym5Y+377yJCiAgY29uc3QgaW1nPXYudmVoaWNsZUltYWdlVXJsPyc8aW1nIHNyYz0iJytlc2Modi52ZWhpY2xlSW1hZ2VVcmwpKyciIGFsdD0iIiBvbmVycm9yPSJ0aGlzLnJlbW92ZSgpIj4nK2ZiOmZiOwogIGNvbnN0IHZlaFN3PXYuaGFzVmVoaWNsZT9yZW5kZXJWZWhpY2xlU3dpdGNoKHYsaWR4KToiIjsKICBjb25zdCBib3VuZD14PT4hIXgmJnghPT0i5pyq57uR5a6aIiYmeCE9PSItIjsKICBjb25zdCByb3dzPVtdOwogIHJvd3MucHVzaCgn6YeM56iL77yaJysodi50b3RhbE1pbGVhZ2U/di50b3RhbE1pbGVhZ2UudG9GaXhlZCgxKToodi5sYXN0UmlkZU1pbGVhZ2U/di5sYXN0UmlkZU1pbGVhZ2UudG9GaXhlZCgxKToiMCIpKSsna20nKTsKICByb3dzLnB1c2goJ+S4iuasoe+8micrKHYueWVzdGVyZGF5RGlzdGFuY2U/di55ZXN0ZXJkYXlEaXN0YW5jZS50b0ZpeGVkKDEpOiItLSIpKydrbScpOwogIHJvd3MucHVzaCgn5b2T5pel77yaJysodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOiIwIikrJ2ttJysoZm10TWluKHYudG9kYXlEdXJhdGlvbik/IiAiK2ZtdE1pbih2LnRvZGF5RHVyYXRpb24pOiIiKSsodi50b2RheU1heFNwZWVkPyIgIit2LnRvZGF5TWF4U3BlZWQrImttL2giOiIiKSk7CiAgaWYoYm91bmQodi5mcm9udFByZXNzdXJlKXx8Ym91bmQodi5yZWFyUHJlc3N1cmUpKXJvd3MucHVzaCgn6IOO5Y6L77yaJysoYm91bmQodi5mcm9udFByZXNzdXJlKT8i5YmNICIrZXNjKHYuZnJvbnRQcmVzc3VyZSk6IiIpKygoYm91bmQodi5mcm9udFByZXNzdXJlKSYmYm91bmQodi5yZWFyUHJlc3N1cmUpKT8iIC8gIjoiIikrKGJvdW5kKHYucmVhclByZXNzdXJlKT8i5ZCOICIrZXNjKHYucmVhclByZXNzdXJlKToiIikpOwogIGlmKGJvdW5kKHYuZnJvbnRUZW1wKXx8Ym91bmQodi5yZWFyVGVtcCkpcm93cy5wdXNoKCfog47muKnvvJonKyhib3VuZCh2LmZyb250VGVtcCk/IuWJjSAiK2VzYyh2LmZyb250VGVtcCk6IiIpKygoYm91bmQodi5mcm9udFRlbXApJiZib3VuZCh2LnJlYXJUZW1wKSk/IiAvICI6IiIpKyhib3VuZCh2LnJlYXJUZW1wKT8i5ZCOICIrZXNjKHYucmVhclRlbXApOiIiKSk7CiAgaWYoaXNDaGFyZ2luZyYmdi5jdXJyZW50KXJvd3MucHVzaCgn55S15rWB77yaJytOdW1iZXIodi5jdXJyZW50KS50b0ZpeGVkKDEpKydBJyk7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2FyZCBob21lLWNhcmQnKyhpc0NoYXJnaW5nPycgY2hhcmdpbmcnOicnKSsoSE9NRV9BTklNPycgYW5pbS1pbic6JycpKyciIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaWR4KjYwKSsnbXMiPicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdXBkIj7mm7TmlrDvvJonK2VzYyhTVEFURS50c1RleHR8fCItIikrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdG9wIj48ZGl2IGNsYXNzPSJoYy1uYW1lIj4nK2VzYyh2Lmhhc1ZlaGljbGU/KHYudmVoaWNsZU5hbWV8fGEudXNlck5hbWUpOmEudXNlck5hbWUpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZT8ob25sPT09IuWcqOe6vyI/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSBvbiI+5Zyo57q/PC9zcGFuPic6KG9ubD8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIj4nK2VzYyhvbmwpKyc8L3NwYW4+JzoiIikpOiIiKSsKICAgIChhLnRva2VuVmFsaWQ9PT1mYWxzZT8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGVyciI+VG9rZW7lpLHmlYg8L3NwYW4+JzoiIikrCiAgICAoaXNDaGFyZ2luZz8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGNoZyI+5YWF55S15LitPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZSYmdi52ZWhpY2xlTW9kZWw/JzxkaXYgY2xhc3M9ImhjLW1vZGVsIj7ovablnovvvJonK2VzYyh2LnZlaGljbGVNb2RlbCkrJzwvZGl2Pic6IiIpKwogICAgKHYuaGFzVmVoaWNsZT8nPGRpdiBjbGFzcz0iaGMtbWlkIj48ZGl2IGNsYXNzPSJoYy1sZWZ0Ij48ZGl2IGNsYXNzPSJoYy1iaWcgbnVtIj4nK01hdGgucm91bmQoc29jKSsnJTxzcGFuIGNsYXNzPSJoYy1rbSBudW0iPicrKHJhbmdlfHwwKSsna208L3NwYW4+Jysodm9sdD8nPHNwYW4gY2xhc3M9ImhjLXYgbnVtIj4nK3ZvbHQrJzwvc3Bhbj4nOiIiKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1iYXIiPjxkaXYgY2xhc3M9ImhjLWZpbGwiIHN0eWxlPSJ3aWR0aDonK01hdGgubWF4KDAsTWF0aC5taW4oMTAwLHNvYykpKyclO2JhY2tncm91bmQ6Jytzb2NDb2wrJyI+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1yb3dzIj4nK3Jvd3MubWFwKHI9Pic8ZGl2IGNsYXNzPSJoYy1yb3ciPicrcisnPC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtaW1nIj4nK2ltZysnPC9kaXY+PC9kaXY+JzoKICAgICc8ZGl2IGNsYXNzPSJuby12ZWhpY2xlIiBzdHlsZT0ibWFyZ2luOjEycHggMCI+JytJLmNhcisnIOivpei0puWPt+acque7keWumui9pui+hjwvZGl2PicpKwogICAgJzxkaXYgY2xhc3M9ImhjLWJvdHRvbSI+PGRpdiBjbGFzcz0iaGMtc2NvcmUiPjxzcGFuPuaAu+enr+WIhiA8YiBjbGFzcz0ibnVtIj4nK051bWJlcihhLnNjb3JlfHwwKS50b0xvY2FsZVN0cmluZygpKyc8L2I+PC9zcGFuPjxzcGFuIGNsYXNzPSJwbHVzIG51bSI+5LuKKycrTnVtYmVyKGEudG9kYXlTY29yZXx8MCkrJzwvc3Bhbj48c3BhbiBjbGFzcz0ic3RyZWFrIG51bSI+6L+e562+JytOdW1iZXIoYS5jb250aW51ZURheXN8fDApKyflpKk8L3NwYW4+JysoYS5zaWduZWRUb2RheT8nPHNwYW4gY2xhc3M9InNpZ25lZCBudW0iPuKckyDlt7Lnrb7liLA8L3NwYW4+JzoiIikrJzwvZGl2PjwvZGl2PicrCiAgICB2ZWhTdysnPC9kaXY+JzsKfQpmdW5jdGlvbiBmbXRNaW4obWluKXttaW49TnVtYmVyKG1pbil8fDA7aWYobWluPD0wKXJldHVybiIiO2NvbnN0IGg9TWF0aC5mbG9vcihtaW4vNjApLG09TWF0aC5yb3VuZChtaW4lNjApO3JldHVybiBoPjA/aCsiaCIrKG0/bSsibWluIjoiIik6bSsibWluIn0KCi8qID09PT09PT09PT09PSDlpJrovabliIfmjaIgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIHJlbmRlclZlaGljbGVTd2l0Y2godixpZHgpewogIGlmKCF2LnZlaGljbGVzfHx2LnZlaGljbGVzLmxlbmd0aDwyKXJldHVybiAiIjsKICBjb25zdCBjdXI9di5jdXJyZW50VmlufHwiIjsKICBjb25zdCBpdGVtcz12LnZlaGljbGVzLm1hcCh4PT4nPGJ1dHRvbiBjbGFzcz0idmVoLWNoaXAnKyh4LnZpbk5vPT09Y3VyPyIgb24iOiIiKSsnIiBvbmNsaWNrPSJzd2l0Y2hWZWhpY2xlKCcraWR4KycsXCcnK2VzYyh4LnZpbk5vKSsnXCcpIj4nK2VzYyh4LnZlaGljbGVUeXBlfHx4Lm5hbWUpKyc8L2J1dHRvbj4nKS5qb2luKCIiKTsKICByZXR1cm4gJzxkaXYgY2xhc3M9InZlaC1zd2l0Y2giPjxzcGFuIGNsYXNzPSJ2ZWgtc3ctbGFiZWwiPui9pui+hjwvc3Bhbj4nK2l0ZW1zKyc8L2Rpdj4nOwp9CmFzeW5jIGZ1bmN0aW9uIHN3aXRjaFZlaGljbGUoaWR4LHZpbil7CiAgY29uc3Qgc3JjPVNUQVRFLmRhdGFbaWR4XTtpZighc3JjfHwhdmluKXJldHVybjsKICB0cnl7CiAgICBsZXQgZDsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBjb25zdCByPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvdmVoaWNsZT91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoc3JjLnVzZXJJZHx8IiIpKyImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbikpOwogICAgICBkPShyJiZyLm9rKT9yLnJlc3VsdDpudWxsOwogICAgfWVsc2V7CiAgICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2M9Z2V0QWNjb3VudHMoKVtpZHhdOwogICAgICBpZighYWNjKXJldHVybjsKICAgICAgZD1hd2FpdCBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluKTsKICAgIH0KICAgIGlmKGQmJmQudmVoaWNsZSYmZC52ZWhpY2xlLmhhc1ZlaGljbGUpewogICAgICBTVEFURS5kYXRhW2lkeF09T2JqZWN0LmFzc2lnbih7fSxTVEFURS5kYXRhW2lkeF0sZCk7CiAgICAgIHJlbmRlckhvbWUoKTsKICAgIH0KICB9Y2F0Y2goZSl7fQp9CgovKiA9PT09PT09PT09PT0g5Li76aKY77yIdjIuMTQuMTQg6LW35LuF5L+d55WZ5rex6Imy5Y2V5Li76aKY77yJID09PT09PT09PT09PSAqLwpmdW5jdGlvbiBhcHBseVRoZW1lKCl7CiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNldEF0dHJpYnV0ZSgiZGF0YS10aGVtZSIsImRhcmsiKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g56uL5Y2z562+5Yiw5oKs5rWu5oyJ6ZKuID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG1vdW50U2lnbmluRmFiKCl7CiAgaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpKXJldHVybjsKICBjb25zdCBiPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImJ1dHRvbiIpOwogIGIuaWQ9InNpZ25pbkZhYiI7Yi5jbGFzc05hbWU9InNpZ25pbi1mYWIiO2IuaW5uZXJIVE1MPShJLmNoZWNrfHwiIikrIjxzcGFuPueri+WNs+etvuWIsDwvc3Bhbj4iOwogIGIub25jbGljaz1ydW5TaWduaW5Ob3c7CiAgY29uc3QgY3VyPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoIi50YWIub24iKTsKICBiLnN0eWxlLmRpc3BsYXk9KCFjdXJ8fGN1ci5kYXRhc2V0LnRhYj09PSJob21lIik/ImZsZXgiOiJub25lIjsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbk5vdygpewogIGlmKGlzRGVtbygpKXtkZW1vU2lnbmluKCk7cmV0dXJufQogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoIWJ0bnx8YnRuLmNsYXNzTGlzdC5jb250YWlucygiYnVzeSIpKXJldHVybjsKICBidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiI7CiAgdG9hc3QoIuato+WcqOS4uuWFqOmDqOi0puWPt+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucnVuU2lnbmluKG51bGwsdHJ1ZSk7CiAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAiOwogIGlmKGQmJmQub2smJmQucmVzdWx0cyl7CiAgICBjb25zdCBva049ZC5yZXN1bHRzLmZpbHRlcihyPT5yLnN1Y2Nlc3MpLmxlbmd0aDsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoiK29rTisiLyIrZC5yZXN1bHRzLmxlbmd0aCsiIOaIkOWKnyIsb2tOPT09ZC5yZXN1bHRzLmxlbmd0aD8ib2siOiJlcnIiKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLHNpZ25pblJlc3VsdEh0bWwoZC5yZXN1bHRzKSk7CiAgICByZWZyZXNoQWxsKHRydWUpOwogIH1lbHNlewogICAgdG9hc3QoKGQmJmQuZXJyb3IpfHwi562+5Yiw5omn6KGM5aSx6LSlIiwiZXJyIik7CiAgfQp9CmZ1bmN0aW9uIHNpZ25pblJlc3VsdEh0bWwocmVzdWx0cyl7CiAgcmV0dXJuIChyZXN1bHRzfHxbXSkubWFwKHI9Pic8ZGl2IGNsYXNzPSJzaWctY2FyZCAnKyhyLnN1Y2Nlc3M/Im9rIjoiZmFpbCIpKyciPjxkaXYgY2xhc3M9ImgiPjxzcGFuPicrZXNjKHIudXNlck5hbWV8fCLmnKrnn6UiKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj4nKyhyLnN1Y2Nlc3M/KCIrIisoci50b3RhbEdhaW58fDApKyIg5YiGIik6IuWksei0pSIpKyc8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0ic3RlcHMiPicrKHIuc3RlcHN8fFtdKS5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKyhyLmVycm9yPyc8ZGl2IGNsYXNzPSJlcnIiPicrZXNjKHIuZXJyb3IpKyc8L2Rpdj4nOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7Cn0KLyog5ryU56S65qih5byP77ya5qih5ouf5LiA5qyh562+5Yiw5bm25by55Ye657uT5p6c77yM6YG/5YWN5ryU56S65pe257uT5p6c5Li656m6ICovCmZ1bmN0aW9uIGRlbW9TaWduaW4oKXsKICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpOwogIGlmKGJ0bil7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnrb7liLDkuK3igKYifQogIHRvYXN0KCLmvJTnpLrmqKHlvI/vvJrmqKHmi5/miafooYznrb7liLDigKYiLCJpbmZvIik7CiAgc2V0VGltZW91dCgoKT0+ewogICAgaWYoYnRuKXtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCJ9CiAgICBjb25zdCByZXM9WwogICAgICB7dXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2Fpbjo5LHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICszICjnp6/liIYpIiwi5Y+R5biW5oiQ5YqfICsxIiwi54K56LWe5oiQ5YqfICsxIiwi5YiG5Lqr5oiQ5YqfICsxIiwi6K+E6K665a6M5oiQIl19LAogICAgICB7dXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ/vvIzor7fph43mlrDnmbvlvZUiLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0KICAgIF07CiAgICB0b2FzdCgi562+5Yiw5a6M5oiQ77yaMS8yIOaIkOWKn++8iOa8lOekuuaVsOaNru+8iSIsIm9rIik7CiAgICBvcGVuU2hlZXQoIuetvuWIsOe7k+aenCIsSS5jaGVjayxzaWduaW5SZXN1bHRIdG1sKHJlcykpOwogIH0sNzAwKTsKfQoKCgovKiA9PT09PT09PT09PT09PT09PSDovabovobor6bmg4UgJiDlnLDlm74gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gb3Blbk1hcChpZHgpe2NvbnN0IHY9U1RBVEUuZGF0YVtpZHhdJiZTVEFURS5kYXRhW2lkeF0udmVoaWNsZTtpZighdilyZXR1cm47aWYoIWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSkpe3RvYXN0KCLmmoLml6DmnInmlYggR1BTIOWdkOaghyIsImVyciIpO3JldHVybn1jb25zdCB1cmw9Imh0dHBzOi8vbWFwcy5hcHBsZS5jb20vP3E9IitOdW1iZXIodi5sYXRpdHVkZSkrIiwiK051bWJlcih2LmxvbmdpdHVkZSkrIiZ6PTE3Ijt3aW5kb3cub3Blbih1cmwsIl9ibGFuayIpfQpmdW5jdGlvbiBzaG93VmVoaWNsZURldGFpbChpZHgpewogIGNvbnN0IGE9U1RBVEUuZGF0YVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3QgcHc9cG93ZXJUZXh0KHYucG93ZXJTdGF0dXMsdi5sb2NrU3RhdGUpOwogIGNvbnN0IHJvd3M9W107CiAgaWYodi52aW5Obylyb3dzLnB1c2goWyfovabmnrblj7cnLCc8c3BhbiBjbGFzcz0idiBtb25vIiBpZD0idmluRHRsIj4nK2VzYyhtYXNrVmluKHYudmluTm8pKSsnPC9zcGFuPiA8YnV0dG9uIGNsYXNzPSJ2aW4tc2hvdyIgb25jbGljaz0idG9nZ2xlRHRsVmluKCkiPuaYvuekujwvYnV0dG9uPiddKTsKICByb3dzLnB1c2goWyflhYXnlLXnirbmgIEnLGVzYyh2LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IildKTsKICByb3dzLnB1c2goWyfnlLXmupDnirbmgIEnLCc8c3BhbiBzdHlsZT0iY29sb3I6JysocHcuY2xzPT09Im9uIj8idmFyKC0tb2spIjoidmFyKC0tdHh0MikiKSsnIj4nK3B3LnRleHQrJzwvc3Bhbj4nXSk7CiAgaWYodi5yaWRlU3RhdGV8fHYub25saW5lKXJvd3MucHVzaChbJ+i9pui+hueKtuaAgScsZXNjKHYucmlkZVN0YXRlfHx2Lm9ubGluZSldKTsKICByb3dzLnB1c2goWyfnlLXph48gU09DJywnPGIgc3R5bGU9ImNvbG9yOicrKHYuYmF0dGVyeVBlcmNlbnQ8PTIwPyJ2YXIoLS1lcnIpIjp2LmJhdHRlcnlQZXJjZW50PD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1icmFuZCkiKSsnIj4nKyh2LmJhdHRlcnlQZXJjZW50fHwwKSsnJTwvYj4nXSk7CiAgaWYodi52b2x0YWdlKXJvd3MucHVzaChbJ+eUteWOiycsdi52b2x0YWdlLnRvRml4ZWQoMSkrIlYiXSk7CiAgaWYodi5jdXJyZW50KXJvd3MucHVzaChbJ+eUtea1gScsdi5jdXJyZW50LnRvRml4ZWQoMSkrIkEiXSk7CiAgaWYodi5iYXR0ZXJ5VGVtcClyb3dzLnB1c2goWyfnlLXmsaDmuKnluqYnLHYuYmF0dGVyeVRlbXAudG9GaXhlZCgwKSsiwrBDIl0pOwogIHJvd3MucHVzaChbJ+WJqeS9mee7reiIqicsKHYucmVzaWR1YWxSYW5nZUttfHwwKSsiIGttIisodi5yYW5nZUVzdGltYXRlZD8i77yI5Lyw566X77yJIjoiIildKTsKICByb3dzLnB1c2goWyfku4rml6XpqpHooYwnLCh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6MCkrIiBrbSAvICIrKHYudG9kYXlEdXJhdGlvbnx8MCkrIiBtaW4iXSk7CiAgaWYoKHYuZnJvbnRQcmVzc3VyZSYmdi5mcm9udFByZXNzdXJlIT09Iuacque7keWumiIpfHwodi5yZWFyUHJlc3N1cmUmJnYucmVhclByZXNzdXJlIT09Iuacque7keWumiIpKXJvd3MucHVzaChbJ+iDjuWOiycsJ+WJjSAnK2VzYyh2LmZyb250UHJlc3N1cmV8fCItIikrJyAvIOWQjiAnK2VzYyh2LnJlYXJQcmVzc3VyZXx8Ii0iKV0pOwogIGlmKHYuYWRkcmVzcylyb3dzLnB1c2goWyfovabovobkvY3nva4nLCc8c3BhbiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmFkZHJlc3MpKyc8L3NwYW4+J10pOwogIGNvbnN0IGRPaz1oYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpOwogIGlmKGRPaylyb3dzLnB1c2goWydHUFMg5Z2Q5qCHJywnPHNwYW4gY2xhc3M9InYgbW9ubyI+JytOdW1iZXIodi5sYXRpdHVkZSkudG9GaXhlZCg2KSsiLCAiK051bWJlcih2LmxvbmdpdHVkZSkudG9GaXhlZCg2KSsnPC9zcGFuPiddKTsKICBpZih2LmxvY2F0aW9uVGltZSlyb3dzLnB1c2goWyfmnIDlkI7lrprkvY0nLCc8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmxvY2F0aW9uVGltZSkrJzwvc3Bhbj4nXSk7CiAgaWYodi5zZXJ2aWNlRW5kRGF0ZSlyb3dzLnB1c2goWyfmnI3liqHliLDmnJ8nLGVzYyh2LnNlcnZpY2VFbmREYXRlKV0pOwogIFNUQVRFLnZpbkR0bFJhdz12LnZpbk5vfHwiIjsKICBjb25zdCBodG1sPXJvd3MubWFwKHI9Pic8ZGl2IGNsYXNzPSJzci1pdGVtIj48c3BhbiBjbGFzcz0iayI+JytyWzBdKyc8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrclsxXSsnPC9zcGFuPjwvZGl2PicpLmpvaW4oIiIpKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gJysoZE9rPyJwcmltYXJ5IjoiIikrJyIgJysoZE9rPydvbmNsaWNrPSJjbG9zZVNoZWV0KCk7b3Blbk1hcCgnK2lkeCsnKSInOidkaXNhYmxlZCB0aXRsZT0i5pqC5peg5pyJ5pWIR1BT5Z2Q5qCHIicpKyc+JytJLm1hcCsnIOWcsOWbvuafpeecizwvYnV0dG9uPjwvZGl2Pic7CiAgb3BlblNoZWV0KCLovabovobor6bmg4UgwrcgIitlc2Modi52ZWhpY2xlTmFtZXx8IuaegeaguOi9pui+hiIpLEkuY2FyLGh0bWwpOwp9CmZ1bmN0aW9uIHRvZ2dsZUR0bFZpbigpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aW5EdGwiKTtpZighZWwpcmV0dXJuO2lmKGVsLnRleHRDb250ZW50LmluZGV4T2YoIioiKT49MCl7ZWwudGV4dENvbnRlbnQ9U1RBVEUudmluRHRsUmF3O2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IumakOiXjyJ9ZWxzZXtkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLmmL7npLoiO2VsLnRleHRDb250ZW50PW1hc2tWaW4oZWwudGV4dENvbnRlbnQpfX0KLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGM77yI6Z2i5p2/5bey56e76Zmk5omL5Yqo562+5Yiw5YWl5Y+j77yM5a6a5pe2562+5Yiw55Sx6ISa5pysIGNyb24g6LSf6LSj77yJID09PT09PT09PT09PT09PT09ICovCgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KLy8gdjIuMTQuMjEg6L2m5o6n6aOO6Zmp56Gu6K6k5pS55Li66aaW5qyh5L2/55So5by556qX77ya5ZCM5oSP5ZCO5Y+v55So77yM5LiN5ZCM5oSP5YiZ5LiN5ZCv55SoCmxldCBfX3Jpc2tQZW5kaW5nPW51bGw7CmZ1bmN0aW9uIHJpc2tPaygpe2NvbnN0IHI9KGdldENmZygpLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKTtyZXR1cm4gcj09PSLmiJHlkIzmhI/po47pmanlubbkvb/nlKgifHxyPT09IuaIkeiHquaEv+aJv+aLheebuOWFs+mjjumZqSJ9CmZ1bmN0aW9uIGN0cmxBY3QoaWR4LGFjdGlvbixidG4pe2lmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufWNvbnN0IGE9cHRBY2NvdW50cygpW2lkeF07aWYoIWF8fCFhLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufWlmKCFyaXNrT2soKSl7c2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbik7cmV0dXJufWN0cmxDb25maXJtKGlkeCxhY3Rpb24pfQpmdW5jdGlvbiBjdHJsQ29uZmlybShpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2NvbnN0IG5hbWVzPXtmaW5kOiLnn63mjInlr7vovabvvIjovabovobpl6rnga/vvIkiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga/vvIjpq5jlo7Dlr7vovabvvIkiLGN1c2hpb246IuaJk+W8gOWdkOWeq++8iOWdkOWeq+S8muW8uei1t++8iSIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9O2NvbnN0IG5hbWU9bmFtZXNbYWN0aW9uXXx8YWN0aW9uO2NvbmZpcm1EaWFsb2coIuehruiupOaJp+ihjCAiK25hbWUsIuivpeaMh+S7pOS8mumAmui/hyA0RyDnvZHnu5znnJ/lrp7mjqfliLbkvaDnmoTovabovobvvJoiK2VzYyhhLnVzZXJOYW1lKSsi44CCIiwnZG9DdHJsKCcraWR4KyIsJyIrYWN0aW9uKyInKSIpfQpmdW5jdGlvbiBzaG93Umlza0RpYWxvZyhpZHgsYWN0aW9uKXsKICBfX3Jpc2tQZW5kaW5nPXtpZHg6aWR4LGFjdGlvbjphY3Rpb259OwogIGNvbnN0IGxheWVyPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKTsKICBsYXllci5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNvbmZpcm0iPjxkaXYgY2xhc3M9ImN0Ij7ovabmjqflip/og73po47pmanlkYrnn6U8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+5a+76L2mIC8g6bij56ybIC8g5Z2Q5Z6rIC8g5byA6ZSBIC8g5YWz6ZSB562J5oyH5Luk57uPIDRHIOS6keerr+S4i+WPke+8jOS8mjxiPuecn+WunuaTjeS9nOS9oOeahOi9pui+hjwvYj7jgILlj5fnvZHnu5zlu7bov5/jgIHkv6Hlj7fnrYnlvbHlk43vvIzmjIfku6Tlj6/og73lu7bov5/jgIHlpLHotKXvvIzmnoHnq6/mg4XlhrXkuIvovabovoblj6/og73mhI/lpJbliqjkvZzvvIjlpoLor6/lvIDplIHvvInjgILkvb/nlKjovabmjqflip/og73ljbPop4bkuLrkvaDlt7LlhYXliIbnn6Xmgonlubboh6rmhL/mib/mi4XkuIrov7Dpo47pmanvvIznlLHmraTkuqfnlJ/nmoTkuIDliIflkI7mnpznlLHkvaDoh6rooYzmib/mi4XjgII8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9InJpc2tEZWNsaW5lKCkiPuaIkeS4jeWQjOaEj+mjjumZqeS4jeS9v+eUqDwvYnV0dG9uPjxidXR0b24gY2xhc3M9InllcyIgb25jbGljaz0icmlza0FncmVlKCkiPuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqDwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgbGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIik7Cn0KZnVuY3Rpb24gcmlza0FncmVlKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYz1nZXRDZmcoKTtjLnZlaGljbGVDb250cm9sUmlzaz0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoIjtCYWNrZW5kLnNhdmVDb25maWcoYykudGhlbihmdW5jdGlvbihvayl7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpYXBwbHlSZW1vdGVDZmcoYyk7ZWxzZSBzYXZlQ2ZnKGMpO3RvYXN0KCLlt7LlkIzmhI/po47pmanvvIzovabmjqflip/og73lt7LlkK/nlKgiLCJvayIpO2lmKF9fcmlza1BlbmRpbmcpe2NvbnN0IHA9X19yaXNrUGVuZGluZztfX3Jpc2tQZW5kaW5nPW51bGw7Y3RybENvbmZpcm0ocC5pZHgscC5hY3Rpb24pfX1lbHNle3RvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKTtfX3Jpc2tQZW5kaW5nPW51bGx9fSl9CmZ1bmN0aW9uIHJpc2tEZWNsaW5lKCl7Y2xvc2VDb25maXJtKCk7X19yaXNrUGVuZGluZz1udWxsO3RvYXN0KCLlt7LpgInmi6nkuI3lkIzmhI/po47pmanvvIzovabmjqflip/og73kuI3lkK/nlKgiLCJpbmZvIil9CmFzeW5jIGZ1bmN0aW9uIGRvQ3RybChpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCBidG49ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmN0cmwtYnRuW2RhdGEtYWN0PSInK2FjdGlvbisnIl0nKTtjb25zdCBvbGQ9YnRuP2J0bi5pbm5lckhUTUw6IiI7aWYoYnRuKXtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5pbm5lckhUTUw9SS5jbG9ja310b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC52ZWhpY2xlQ3RybChhLnVzZXJJZCxhY3Rpb24pO2lmKGJ0bil7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLmlubmVySFRNTD1vbGR9aWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi5oyH5Luk5bey5LiL5Y+RIiwib2siKX1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5oyH5Luk5aSx6LSlIiwiZXJyIil9fQoKLyogPT09PT09PT09PT09PT09PT0g5pel5b+X6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBsb2dGaWx0ZXI9ImFsbCI7CmFzeW5jIGZ1bmN0aW9uIHJlbmRlckxvZ3MoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUxvZ3MiKTsKICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rdisn6L+Q6KGM5pel5b+XPC9kaXY+JysKICAnPGRpdiBjbGFzcz0ibG9nLXBhbmVsIj48ZGl2IGNsYXNzPSJsb2ctaGVhZCI+PGgzPicrSS5rdisnPHNwYW4+5pyA6L+RIDUwIOadoTwvc3Bhbj48L2gzPjxkaXYgY2xhc3M9ImxvZy1maWx0ZXJzIj4nKwogIFsnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0iYWxsIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdhbGxcJykiPuWFqOmDqDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InNpZ25pbiI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnc2lnbmluXCcpIj7nrb7liLA8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJ2ZWhpY2xlIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCd2ZWhpY2xlXCcpIj7mjqfovaY8L2J1dHRvbj4nXS5qb2luKCIiKSsKICAnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ibG9nLWxpc3QiIGlkPSJsb2dMaXN0Ij48ZGl2IHN0eWxlPSJwYWRkaW5nOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0MykiPuWKoOi9veS4reKApjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE0cHgiPjxidXR0b24gY2xhc3M9ImJ0biBkYW5nZXIiIHN0eWxlPSJmbGV4OjEiIG9uY2xpY2s9ImNsZWFyTG9nc1VJKCkiPua4heepuuaXpeW/lzwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgbG9ncz1sb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wP0RFTU9fTE9HUzphd2FpdCBCYWNrZW5kLmdldExvZ3MoKTtyZW5kZXJMb2dMaXN0KGxvZ3MpOwp9CmZ1bmN0aW9uIHNldExvZ0ZpbHRlcihmKXtsb2dGaWx0ZXI9ZjtyZW5kZXJMb2dzKCl9CmZ1bmN0aW9uIHJlbmRlckxvZ0xpc3QobG9ncyl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImxvZ0xpc3QiKTtpZighZWwpcmV0dXJuO2NvbnN0IGxpc3Q9KGxvZ3N8fFtdKS5maWx0ZXIobD0+e2NvbnN0IHQ9bC50eXBlfHwic2lnbmluIjtpZihsb2dGaWx0ZXI9PT0iYWxsIilyZXR1cm4gdHJ1ZTtyZXR1cm4gdD09PWxvZ0ZpbHRlcn0pO2lmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJsb2ctZW1wdHkiPicrSS53YXJuKyc8YnI+6K+l5YiG57G75LiL5pqC5peg5pel5b+XPC9kaXY+JztyZXR1cm59ZWwuaW5uZXJIVE1MPWxpc3QubWFwKChsb2csaSk9Pntjb25zdCB0PWxvZy50eXBlfHwic2lnbmluIjtjb25zdCB0YWc9dD09PSJ2ZWhpY2xlIj8nPHNwYW4gY2xhc3M9InBpbGwgYW1iZXIiPuaOp+i9pjwvc3Bhbj4nOic8c3BhbiBjbGFzcz0icGlsbCBjeWFuIj7nrb7liLA8L3NwYW4+JztsZXQgcmVzO2lmKHQ9PT0idmVoaWNsZSIpe3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5hY3Rpb25UZXh0fHwi6L2m6L6G5o6n5Yi2IikrJyAnKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfIjoi5aSx6LSl77yaIitlc2MobG9nLm1lc3NhZ2V8fGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9ZWxzZXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfICsiK2xvZy50b3RhbEdhaW46IuWksei0pTogIisobG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31jb25zdCBzdGVwcz1sb2cuc3RlcHM/KGxvZy5zdGVwcy5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKToiIjtyZXR1cm4gJzxkaXYgY2xhc3M9ImxvZy1pdGVtIiBzdHlsZT0iYW5pbWF0aW9uLWRlbGF5OicrKGkqMjUpKydtcyI+PGRpdiBjbGFzcz0ibG9nLXRpbWUiPicrZXNjKGxvZy50aW1lfHwiIikrJzwvZGl2PjxkaXYgY2xhc3M9ImxvZy1tYWluIj4nK3RhZysnPHNwYW4gY2xhc3M9ImxvZy11c2VyIj4nK2VzYyhsb2cudXNlck5hbWV8fCIiKSsnPC9zcGFuPicrcmVzKyc8L2Rpdj4nKyhzdGVwcz8nPGRpdiBjbGFzcz0ibG9nLXN0ZXBzIj4nK3N0ZXBzKyc8L2Rpdj4nOiIiKSsnPC9kaXY+J30pLmpvaW4oIiIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NVSSgpe2NvbmZpcm1EaWFsb2coIua4heepuuaXpeW/lyIsIuWwhuWIoOmZpOWFqOmDqOi/kOihjOaXpeW/l++8jOatpOaTjeS9nOS4jeWPr+aBouWkjeOAgiIsImNsZWFyTG9nc05vdyIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NOb3coKXtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLmNsZWFyTG9ncygpO2lmKG9rKXt0b2FzdCgi5pel5b+X5bey5riF56m6Iiwib2siKTtyZW5kZXJMb2dzKCl9ZWxzZSB0b2FzdCgi5riF56m65aSx6LSlIiwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDorr7nva7pobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGNmZ0FjY291bnRzPVtdOwpmdW5jdGlvbiByZW5kZXJDZmcoKXsKICBpZihpc1Byb3h5TW9kZSgpJiZsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPDAmJiFTVEFURS5wYW5lbExvYWRlZCl7CiAgICBjb25zdCBlbDA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICAgIGlmKGVsMCllbDAuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPui0puWPt+euoeeQhjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiIHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjI2cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHgiPuato+WcqOS7juiEmuacrOWQjuerr+WQjOatpei0puWPt+S4jumFjee9ruKApjwvZGl2PjwvZGl2Pic7CiAgICBlbnN1cmVQYW5lbERhdGEoKS50aGVuKCgpPT5yZW5kZXJDZmcoKSk7CiAgICByZXR1cm47CiAgfQogIGNvbnN0IGNmZz1nZXRDZmcoKTtjZmdBY2NvdW50cz0oaXNQcm94eU1vZGUoKSYmU1RBVEUucGFuZWxBY2NvdW50cz9TVEFURS5wYW5lbEFjY291bnRzOmdldEFjY291bnRzKCkpLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCIiLHVzZXJJZDphLnVzZXJJZHx8IiIsdG9rZW46YS50b2tlbnx8IiIsYmFya0tleTphLmJhcmtLZXl8fCIifSkpOwogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlQ2ZnIik7CiAgY29uc3QgYWNjUm93cz1jZmdBY2NvdW50cy5tYXAoKGEsaWR4KT0+JzxkaXYgY2xhc3M9ImFjYy1lZGl0IiBkYXRhLWk9IicraWR4KyciPjxkaXYgY2xhc3M9ImFjYy1lZGl0LWhlYWQiPjxzcGFuIGNsYXNzPSJhY2MtZWRpdC10aXRsZSI+PHNwYW4gY2xhc3M9Im4iPicrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPui0puWPtyAnK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj48c3BhbiBjbGFzcz0iYWN0cyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBpZD0idWlkQnRuXycraWR4KyciIG9uY2xpY2s9ImZldGNoVXNlcklkVUkoJytpZHgrJykiPuiOt+WPlklEPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIGRhbmdlciIgb25jbGljaz0iZGVsZXRlQWNjb3VudFVJKCcraWR4KycpIj7liKDpmaQ8L2J1dHRvbj48L3NwYW4+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mmLXnp7A8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX25hbWVfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudXNlck5hbWUpKyciIHBsYWNlaG9sZGVyPSLlpoIgbHVja3k3OTgiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPueUqOaIt0lEPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY191aWRfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudXNlcklkKSsnIiBwbGFjZWhvbGRlcj0i55WZ56m65Y+v54K544CM6I635Y+WSUTjgI0iIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5BdXRob3JpemF0aW9uIFRva2Vu77yI57KY6LS05Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIEJlYXJlciDliY3nvIDvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3Rva2VuXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnRva2VuKSsnIiBwbGFjZWhvbGRlcj0iYTc0Nzc5Yzct4oCmIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QmFyayDpgJrnn6UgS2V577yI6YCJ5aGr77yM562+5Yiw5oiQ5Yqf5o6o6YCB77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19iYXJrXycraWR4KyciIHZhbHVlPSInK2VzYyhhLmJhcmtLZXkpKyciIHBsYWNlaG9sZGVyPSJCYXJrIEtleSDmiJboh6rlu7ogaHR0cHM6Ly/ln5/lkI0vS2V5Ij48L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKICBjb25zdCBjb21tPWNmZy5jb21tdW5pdHk7CiAgY29uc3Qgc3c9KGlkLGxhYmVsLHN1YixjaGVja2VkKT0+JzxsYWJlbCBjbGFzcz0ic3dpdGNoIj48aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSInK2lkKyciICcrKGNoZWNrZWQ/ImNoZWNrZWQiOiIiKSsnPjxzcGFuIGNsYXNzPSJzdyI+PC9zcGFuPjxzcGFuIGNsYXNzPSJsYmwiPicrbGFiZWwrJzwvc3Bhbj48c3BhbiBjbGFzcz0ic2MiPicrc3ViKyc8L3NwYW4+PC9sYWJlbD4nOwogIGVsLmlubmVySFRNTD0KICAnPGRpdiBjbGFzcz0ic2VjdGlvbi10aXRsZSI+JytJLmtleSsn6K6+572uPC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgdmlvIj48L3NwYW4+5omL5py65Y+355m75b2VPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+JysKJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaJi+acuuWPt++8iOaegeaguCBBcHAg57uR5a6a5Y+356CB77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGVsIiBpZD0icGxfcGhvbmUiIHBsYWNlaG9sZGVyPSIxMSDkvY3miYvmnLrlj7ciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55+t5L+h6aqM6K+B56CBPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBsX2NvZGUiIHBsYWNlaG9sZGVyPSI2IOS9jemqjOivgeeggSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8L2Rpdj4nKwonPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJzZW5kU21zQ29kZSgpIiBpZD0icGxfc2VuZF9idG4iPuiOt+WPlumqjOivgeeggTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJwaG9uZUxvZ2luVUkoKSIgaWQ9InBsX2xvZ2luX2J0biI+55m75b2V5bm25re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JysKJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPueUqOaJi+acuuWPtyArIOefreS/oemqjOivgeeggeeZu+W9le+8jOiHquWKqOiOt+WPliBUb2tlbiDkuI7nlKjmiLdJROW5tuWKoOWFpei0puWPt+WIl+ihqO+8jOeZu+W9leaIkOWKn+WQjuiHquWKqOS/neWtmOW5tuWIt+aWsOmhtemdouOAgjxicj7CtyDlsI/lj7fnmbvlvZXvvJrlj6/lpJrmrKHnmbvlvZXkuI3lkIzmiYvmnLrlj7fvvIzmjInlsI/lj7fpgJDkuKrmt7vliqDkuI7nrqHnkIbjgII8YnI+wrcg5pyN5Yqh5Yiw5pyfIC8g57uR5a6a57ut6LS577ya6L2m6L6G5pm66IO95pyN5Yqh5Yiw5pyf44CB5oiW6ZyA6KaB57uR5a6a57ut6LS55pe277yM6YeN5paw55So5omL5py65Y+355m75b2V5Y2z5Y+v5Yi35paw5o6I5p2D77yM5YWo56iL5peg6ZyA5oqT5YyF44CCPC9kaXY+JysKJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+5a6a5pe2562+5YiwPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICBzdygiYXV0b19zaWduaW4iLCLlrprml7bnrb7liLAiLCLliLDngrnoh6rliqjkuLrlhajpg6jotKblj7fnrb7liLAiLGNmZy5hdXRvU2lnbmluPT09dHJ1ZSkrCiAgc3coInZlaGljbGVfbW9uaXRvciIsIui9pui+hueKtuaAgeebkeaOpyIsIuWFhea7oS/nprvnur/ml7bmnKzlnLDpgJrnn6Xmj5DphpLvvIjmiZPlvIDpnaLmnb/ml7bmo4Dmn6XvvIkiLGNmZy52ZWhpY2xlTW9uaXRvcj09PXRydWUpKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7nrb7liLDml7bpl7TvvIjmr4/lpKnvvIxISDpNTe+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRpbWUiIGlkPSJjZmdfc2lnbmluX3RpbWUiIHZhbHVlPSInK2VzYyhjZmcuYXV0b1NpZ25pblRpbWV8fCIwNzowMCIpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7ku6PnkIbohJrmnKzml6DluLjpqbvlkI7lj7DvvIzph4fnlKjjgIzmiZPlvIDooaXnrb7jgI3mnLrliLbvvJrlvIDlkK/lkI7vvIzmr4/lpKnpppbmrKHmiZPlvIDpnaLmnb/kuJTlt7Lov4forr7lrprml7bpl7Tml7bvvIzoh6rliqjkuLrlhajpg6jotKblj7fmiafooYzkuIDmrKHnrb7liLDvvIjlhpnml6Xlv5fjgIHmjqggQmFya++8jOS4juaJi+WKqOetvuWIsOS4gOiHtO+8ie+8jOWQjOS4gOWkqeWPquaJp+ihjOS4gOasoeOAgummlumhteOAjOeri+WNs+etvuWIsOOAjeaCrOa1ruaMiemSruWPr+maj+aXtuaJi+WKqOaJp+ihjOOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+56S+5Yy65Lu75Yqh5byA5YWzPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIiBzdHlsZT0iZ2FwOjhweCI+JysKICBzdygiY29tbV9wb3N0Iiwi5Y+R5biD5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSkrc3coImNvbW1fbGlrZSIsIueCuei1nuWKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVMaWtlIT09ZmFsc2UpK3N3KCJjb21tX2NvbW1lbnQiLCLor4TorrrliqjmgIEiLCLkuI3liqDliIYiLGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKStzdygiY29tbV9zaGFyZSIsIuWIhuS6q+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKStzdygiY29tbV9kZWxldGUiLCLmiafooYzlkI7liKDpmaTliqjmgIEiLCLmuIXnkIbnl5Xov7kiLGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UpKwogICc8L2Rpdj48ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lhbPpl63lr7nlupTlvIDlhbPlkI7vvIznrb7liLDohJrmnKzlsIbot7Pov4for6Xku7vliqHjgILkv67mlLnlkI7ngrnlh7vpobXpnaLlupXpg6jjgIzkv53lrZjphY3nva7jgI3nlJ/mlYjjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPui0puWPt+euoeeQhu+8iCcrY2ZnQWNjb3VudHMubGVuZ3RoKycg5Liq77yJPC9oMz48YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iYWRkQWNjb3VudFVJKCkiPisg5re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiIGlkPSJhY2NMaXN0Ij4nKyhhY2NSb3dzfHwnPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mmoLml6DotKblj7fvvIzngrnlh7vjgIzmt7vliqDotKblj7fjgI08L2Rpdj4nKSsnPC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLWJvZHkiIHN0eWxlPSJwYWRkaW5nLXRvcDowIj48ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic2F2ZUFjY291bnRzVUkoKSI+5L+d5a2Y5p6B5qC46LSm5Y+3PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLW5vdGUiPjxiPuS9v+eUqOivtOaYjjwvYj48YnI+wrcgVG9rZW7vvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiDlgLzljbPlj6/vvIzoh6rliqjljrvmjokgPGNvZGU+QmVhcmVyIDwvY29kZT4g5YmN57yA44CCPGJyPsK3IOiOt+WPlklE77ya5aGr5YWlIFRva2VuIOWQjueCueOAjOiOt+WPlklE44CN77yM6Ieq5Yqo5LuOIEg1IGJhc2VJbmZvIC8gQXBwIHNldHRpbmcgLyDovabovobliJfooajmjqXlj6Pop6PmnpDnlKjmiLdJROS4juaYteensOOAgjxicj7CtyBCYXJrIEtlee+8muivpei0puWPt+etvuWIsOaIkOWKn+WQjuaOqOmAgemAmuefpe+8jOeVmeepuuS4jeaOqOOAgjxicj7CtyDmjqfovabmjIfku6TvvIjlr7vovaYv6bij56ybL+WdkOWeqy/lvIDlhbPplIHvvInkvJrnnJ/lrp7mk43kvZzovabovobvvIzpnIDkuozmrKHnoa7orqTjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuWkh+S7vei0puWPt+mFjee9rjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJleHBvcnRCYWNrdXBVSSgpIj7kuIDplK7lr7zlh7rlpIfku708L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9ImNvcHlCYWNrdXBVSSgpIj7lpI3liLblpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7lpIfku73lhoXlrrnvvIjljIXlkKvlhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzlj6/lpI3liLbkv53lrZjvvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iYmFja3VwQXJlYSIgcm93cz0iNCIgcmVhZG9ubHkgcGxhY2Vob2xkZXI9IueCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjeeUn+aIkOKApiIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48L3RleHRhcmVhPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPuaBouWkjeWkh+S7ve+8iOeymOi0tOWkh+S7vSBKU09OIOWQjueCueaBouWkje+8jOWwhuimhueblueOsOaciei0puWPt+S4jumFjee9ru+8iTwvbGFiZWw+PHRleHRhcmVhIGlkPSJpbXBvcnRBcmVhIiByb3dzPSI0IiBwbGFjZWhvbGRlcj0i57KY6LS05aSH5Lu9IEpTT07igKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBvbmNsaWNrPSJpbXBvcnRCYWNrdXBVSSgpIj7mgaLlpI3lpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lpIfku73ljIXlkKvlhajpg6jotKblj7fvvIjmmLXnp7Av55So5oi3SUQvVG9rZW4vQmFya0tlee+8ieS4jumdouadv+mFjee9ru+8iOetvuWQjeWvhumSpS/npL7ljLrku7vliqHlvIDlhbMv6Ieq5Yqo5Yi35paw562J77yJ44CC5o2i5py65oiW6YeN6KOF5ZCO57KY6LS05Y2z5Y+v5LiA6ZSu6L+Y5Y6f77yM5peg6ZyA6YeN5paw5oqT5YyF5aGr5YaZ44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgdmlvIj48L3NwYW4+5bCP57uE5Lu25pi+56S66L2m6L6GPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+6LSm5Y+3PC9sYWJlbD48c2VsZWN0IGlkPSJ3aWRnZXRfYWNjIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4IiBvbmNoYW5nZT0id2lkZ2V0QWNjQ2hhbmdlZCgpIj4nK3dpZGdldEFjY09wdGlvbnMoKSsgJzwvc2VsZWN0PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPui9pui+hjwvbGFiZWw+PHNlbGVjdCBpZD0id2lkZ2V0X3ZlaCIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzoxMHB4IDEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTRweCI+PC9zZWxlY3Q+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+6YCJ5oup5ZCO77yMaU9TIOahjOmdouWwj+e7hOS7tuWwhuWxleekuuivpei9pui+hueahOWunuaXtueKtuaAge+8iOeUtemHjy/nu63oiKov5YWF55S1L+etvuWIsO+8ieOAgjxiPuS4jemAieaLqeaXtum7mOiupOWPluesrOS4gOS4qui0puWPt+eahOesrOS4gOi+hui9puOAgjwvYj7kv53lrZjphY3nva7lkI7nlJ/mlYjjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciI+PC9zcGFuPuiHquWumuS5ieiDjOaZrzwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuS4iuS8oOiDjOaZr+eFp+eJh++8iOS8mumTuuWcqOa3seiJsuW6leiJsuS5i+S4iu+8jOW7uuiurua3seiJsi/kvY7kuq7luqblm77niYfku6Xkv53or4HmloflrZflj6/or7vvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJmaWxlIiBpZD0iYmdfZmlsZSIgYWNjZXB0PSJpbWFnZS8qIiBzdHlsZT0iZm9udC1zaXplOjEycHgiIG9uY2hhbmdlPSJiZ0ZpbGVDaGFuZ2VkKHRoaXMpIj48L2Rpdj4nKwogICc8ZGl2IHN0eWxlPSJtYXJnaW4tdG9wOjEwcHg7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXA7YWxpZ24taXRlbXM6Y2VudGVyIj48ZGl2IGlkPSJiZ1ByZXZpZXciIHN0eWxlPSJ3aWR0aDoxMjBweDtoZWlnaHQ6NzJweDtib3JkZXItcmFkaXVzOjEwcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtiYWNrZ3JvdW5kLXNpemU6Y292ZXI7YmFja2dyb3VuZC1wb3NpdGlvbjpjZW50ZXI7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMHB4O292ZXJmbG93OmhpZGRlbiI+5pyq6YCJ5oupPC9kaXY+PGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6OHB4Ij48YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iYXBwbHlCZ1VwbG9hZCgpIiBpZD0iYmdfYXBwbHlfYnRuIj7lupTnlKjog4zmma88L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InJlc2V0QmcoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5Zu+54mH5LulIGJhc2U2NCDlrZjlhaXphY3nva7vvIzpmo/lpIfku73kuIDlubblr7zlh7rjgILliIfmjaLog4zmma/lrp7ml7bnlJ/mlYjvvIzml6DpnIDph43lkK/jgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogIC8vIHYyLjE0LjIxIOWIoOmZpOOAjOi9puaOp+mjjumZqeehruiupOOAjemdouadv++8muaUueS4uummluasoeS9v+eUqOi9puaOp+WKn+iDveaXtuW8ueeql+ehruiupO+8iOWQjOaEjy/kuI3lkIzmhI/vvIkKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lvZPliY3lronoo4Xkv6Hmga88L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0iZm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MS45O2NvbG9yOnZhcigtLXR4dDIpIiBpZD0iaW5zdGFsbEluZm8iPicrCiAgJzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7mraPlnKjmo4DmtYvlronoo4XmlrnlvI/igKY8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luOjE0cHggMnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic2F2ZUNmZ1VJKCkiPuS/neWtmOmFjee9rjwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0icmVzZXRDZmdVSSgpIj7mgaLlpI3pu5jorqQ8L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiIHN0eWxlPSJtYXJnaW4tdG9wOjE0cHgiPjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZzo0cHggMCI+JysKICAnPGEgaHJlZj0ibWFpbHRvOm1saW5rNzk4QG91dGxvb2suY29tIiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEycHggMTZweDt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjp2YXIoLS1icmFuZCkiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPuKcie+4jzwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NjAwIj5tbGluazc5OEBvdXRsb29rLmNvbTwvc3Bhbj48L3NwYW4+PC9hPicrCiAgJzxkaXYgc3R5bGU9ImhlaWdodDoxcHg7YmFja2dyb3VuZDp2YXIoLS1saW5lKTttYXJnaW46MCAxNnB4Ij48L2Rpdj4nKwogICc8YSBocmVmPSJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8iIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEycHggMTZweDt0ZXh0LWRlY29yYXRpb246bm9uZTtjb2xvcjp2YXIoLS1icmFuZCkiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPuKtkDwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NjAwIj5HaXRIdWIg5LuT5bqTPC9zcGFuPjwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0MykiPmNsdWNrNzk4L1pFRUhPPC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEycHggMTZweCI+PHNwYW4gc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHgiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTZweCI+8J+Tizwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOnZhcigtLXR4dDIpIj7niYjmnKw8L3NwYW4+PC9zcGFuPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQzKSI+JytBUFBfVkVSU0lPTisnPC9zcGFuPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKICAvLyDlsI/nu4Tku7bovabovobkuIvmi4nliJ3lp4vljJbvvIjlm57loavlt7Lkv53lrZjnmoTpgInmi6nvvIkKICBjb25zdCB3c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfYWNjIik7CiAgaWYod3NlbCl7CiAgICBjb25zdCBjdXI9Z2V0Q2ZnKCkud2lkZ2V0VmVoaWNsZTtsZXQgY3VyVWlkPSIiLGN1clZpbj0iIjsKICAgIGlmKGN1cil7Y29uc3QgcD1jdXIuc3BsaXQoInwiKTtjdXJVaWQ9cFswXXx8IiI7Y3VyVmluPXBbMV18fCIiO30KICAgIGlmKGN1clVpZCl3c2VsLnZhbHVlPWN1clVpZDsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMod3NlbC52YWx1ZXx8IiIpOwogICAgaWYoY3VyVmluKXtjb25zdCB2c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIik7Zm9yKGxldCBpPTA7aTx2c2VsLm9wdGlvbnMubGVuZ3RoO2krKyl7aWYodnNlbC5vcHRpb25zW2ldLnZhbHVlPT09Y3VyVmluKXt2c2VsLnNlbGVjdGVkSW5kZXg9aTticmVha319fQogIH0KICAvLyDog4zmma/pooTop4jlm57loasKICBjb25zdCBicD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmdQcmV2aWV3Iik7CiAgaWYoYnApe2NvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnO2lmKGJnKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjticC50ZXh0Q29udGVudD0iIjt9fQogIHJlbmRlckluc3RhbGxJbmZvKCk7Cn0KLyogPT09PT09PT09PT09PT09PT0g5b2T5YmN5a6J6KOF5L+h5oGvID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGluc3RhbGxFbnZOYW1lKCl7CiAgaWYoaXNEZW1vKCkpcmV0dXJuICLmvJTnpLrmqKHlvI/vvIjnpLrkvovmlbDmja7vvIkiOwogIGNvbnN0IHA9KHR5cGVvZiBsb2NhdGlvbiE9PSJ1bmRlZmluZWQiJiZsb2NhdGlvbi5wcm90b2NvbCl8fCIiOwogIGlmKHA9PT0iemVlaG86IilyZXR1cm4gImlPUyBBcHDvvIjmnoHmoLjnrb7liLDpnaLmnb/vvIkiOwogIGlmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmL0VsZWN0cm9uL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50fHwiIikpcmV0dXJuICLmoYzpnaLniYjvvIhXaW5kb3dz77yJIjsKICBpZihpc1Byb3h5TW9kZSgpKXJldHVybiAi5Luj55CG6ISa5pysIjsKICByZXR1cm4gIua1j+iniOWZqCI7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVySW5zdGFsbEluZm8oKXsKICBjb25zdCBib3g9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImluc3RhbGxJbmZvIik7CiAgbGV0IGh0bWw9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206OHB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+6L+Q6KGM546v5aKD77yaPC9iPicraW5zdGFsbEVudk5hbWUoKSsnPC9kaXY+JzsKICAvLyDljp/nlJ/moaXmjqXoh6rmo4DvvJrmipXlsY8v6KGM6L2m6K6w5b2V5Luq5qGl55Sx5Y6f55Sf5rOo5YWl77yM57y65aSx5pe25a+55bqU5Yqf6IO95LiN5Y+v55So77yI5L6/5LqO5o6S5p+lIuS7heaUr+aMgSBpT1MgQXBwIOWGheS9v+eUqCLvvIkKICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7ljp/nlJ/moaXmjqXvvJo8L2I+5oqV5bGPICcrKCh0eXBlb2YgbW90b3BsYXlIYW5kbGVyPT09ImZ1bmN0aW9uIik/J+KckyDlj6/nlKgnOifinJcg5pyq5rOo5YWlJykrJyDCtyDorrDlvZXku6ogJysoKHR5cGVvZiBkYXNoY2FtSGFuZGxlcj09PSJmdW5jdGlvbiIpPyfinJMg5Y+v55SoJzon4pyXIOacquazqOWFpScpKyc8L2Rpdj4nOwogIGxldCBpbmZvPW51bGw7CiAgdHJ5e2luZm89YXdhaXQgQmFja2VuZC5pbnN0YWxsSW5mbygpO31jYXRjaChlKXtpbmZvPW51bGx9CiAgaWYoIWluZm98fCFpbmZvLmlvcyl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuetvuWQjeaWueW8j+S7heaUr+aMgSBpT1MgQXBwIOWGheafpeeci++8iOivu+WPluW9k+WJjeWuieijheWMheeahOetvuWQjeaPj+i/sOaWh+S7tu+8ieOAgjwvZGl2Pic7CiAgfSBlbHNlIHsKICAgIGNvbnN0IG09aW5mby5zaWduTWV0aG9kfHwidW5rbm93biI7CiAgICBjb25zdCBsYWJlbD17dHJvbGxzdG9yZToi5beo6a2UIFRyb2xsU3RvcmXvvIjmsLjkuYXnrb7lkI3vvIkiLGVudGVycHJpc2U6IuS8geS4muetvuWQje+8iOWIhuWPke+8iSIsc2lkZWxvYWQ6IuS4quS6uuiHquetvu+8iDcg5aSp5pyJ5pWI5pyf77yJIixkZXZlbG9wZXI6IuW8gOWPkeiAhSAvIFRlc3RGbGlnaHTvvIjplb/mnJ/vvIkiLHVua25vd246IuaXoOazleehruWumiJ9W21dfHwi5peg5rOV56Gu5a6aIjsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuWuieijheaWueW8j++8mjwvYj4nK2xhYmVsKyc8L2Rpdj4nOwogICAgaWYoaW5mby5leHBpcmF0aW9uKXsKICAgICAgbGV0IGV4dHJhPSIiOwogICAgICBpZih0eXBlb2YgaW5mby5kYXlzUmVtYWluPT09Im51bWJlciImJmlzRmluaXRlKGluZm8uZGF5c1JlbWFpbikmJmluZm8uZGF5c1JlbWFpbj49MClleHRyYT0n77yI5Ymp5L2Z57qmICcraW5mby5kYXlzUmVtYWluKycg5aSp77yJJzsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+562+5ZCN5pyJ5pWI5pyf6Iez77yaPC9iPicrZXNjKFN0cmluZyhpbmZvLmV4cGlyYXRpb24pLnJlcGxhY2UoIlQiLCIgIikucmVwbGFjZSgiWiIsIiIpKSsnICcrZXh0cmErJzwvZGl2Pic7CiAgICB9CiAgICBpZihpbmZvLnRlYW1OYW1lfHxpbmZvLnRlYW1JZCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuetvuWQjeWboumYn++8mjwvYj4nK2VzYyhpbmZvLnRlYW1OYW1lfHxpbmZvLnRlYW1JZCkrJzwvZGl2Pic7CiAgICB9CiAgICBpZihtPT09InNpZGVsb2FkIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5Liq5Lq66Ieq562+IDcg5aSp5Yiw5pyf5ZCO77yM6ZyA6L+e5o6l55S16ISR55SoIEFsdFN0b3JlIC8gU2lkZWxvYWRseSDph43mlrDnrb7lkI3vvJvlu7rorq7mlLnnlKjlt6jprZQgVHJvbGxTdG9yZSDmsLjkuYXnrb7lkI3jgII8L2Rpdj4nO30KICAgIGVsc2UgaWYobT09PSJlbnRlcnByaXNlIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5aaC6YGH44CM5pyq5Y+X5L+h5Lu755qE5byA5Y+R6ICF44CN77yM6K+35ZyoIOiuvue9riDihpIg6YCa55SoIOKGkiBWUE7kuI7orr7lpIfnrqHnkIYg5L+h5Lu75a+55bqU5LyB5Lia6K+B5Lmm44CCPC9kaXY+Jzt9CiAgICBlbHNlIGlmKG09PT0idHJvbGxzdG9yZSIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuW3sumAmui/hyBUcm9sbFN0b3JlIOWuieijhe+8jOawuOS5heacieaViOOAgeS4jeaAleaOieetvu+8jOaXoOmcgOeUteiEkee7reetvuOAgjwvZGl2Pic7fQogIH0KICBpZihib3gpYm94LmlubmVySFRNTD1odG1sOwp9Ci8qID09PT09PT09PT09PT09PT09IOWwj+e7hOS7tui9pui+humAieaLqSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiB3aWRnZXRBY2NPcHRpb25zKCl7CiAgY29uc3QgbGlzdD1TVEFURS5kYXRhfHxbXTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuICc8b3B0aW9uIHZhbHVlPSIiPuaaguaXoOi0puWPt+aVsOaNru+8iOivt+WFiOWcqOmmlumhteWIt+aWsOWKoOi9ve+8iTwvb3B0aW9uPic7CiAgcmV0dXJuIGxpc3QubWFwKChhLGkpPT57CiAgICBjb25zdCBubT1lc2MoKGEudmVoaWNsZSYmKGEudmVoaWNsZS52ZWhpY2xlTmFtZXx8YS52ZWhpY2xlLnZlaGljbGVUeXBlKSl8fGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpOwogICAgcmV0dXJuICc8b3B0aW9uIHZhbHVlPSInK2VzYyhhLnVzZXJJZHx8IiIpKyciIGRhdGEtaT0iJytpKyciPicrbm0rJzwvb3B0aW9uPic7CiAgfSkuam9pbigiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0VmVoT3B0aW9ucyh1aWQpewogIGNvbnN0IGxpc3Q9U1RBVEUuZGF0YXx8W107CiAgY29uc3QgYT1saXN0LmZpbmQoeD0+U3RyaW5nKHgudXNlcklkfHwiIik9PT1TdHJpbmcodWlkKSk7CiAgaWYoIWF8fCFhLnZlaGljbGV8fCFhLnZlaGljbGUuaGFzVmVoaWNsZSlyZXR1cm4gJzxvcHRpb24gdmFsdWU9IiI+6K+l6LSm5Y+35pqC5peg57uR5a6a6L2m6L6GPC9vcHRpb24+JzsKICBjb25zdCB2PWEudmVoaWNsZTsKICBjb25zdCBhcnI9KEFycmF5LmlzQXJyYXkodi52ZWhpY2xlcykmJnYudmVoaWNsZXMubGVuZ3RoKT92LnZlaGljbGVzLm1hcCh4PT4oe25hbWU6eC52ZWhpY2xlVHlwZXx8eC5uYW1lfHx4LnZpbk5vLHZpbjp4LnZpbk5vfSkpOlt7bmFtZTp2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lfHx2LnZpbk5vLHZpbjp2LnZpbk5vfV07CiAgcmV0dXJuIGFyci5tYXAoeD0+JzxvcHRpb24gdmFsdWU9IicrZXNjKHgudmluKSsnIj4nK2VzYyh4Lm5hbWUpKyc8L29wdGlvbj4nKS5qb2luKCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRBY2NDaGFuZ2VkKCl7CiAgY29uc3Qgc2VsPWVsKCJ3aWRnZXRfYWNjIik7aWYoIXNlbClyZXR1cm47CiAgZWwoIndpZGdldF92ZWgiKS5pbm5lckhUTUw9d2lkZ2V0VmVoT3B0aW9ucyhzZWwudmFsdWV8fCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRTZWxlY3Rpb25UZXh0KCl7CiAgY29uc3QgYWNjPWVsKCJ3aWRnZXRfYWNjIiksdmVoPWVsKCJ3aWRnZXRfdmVoIik7CiAgaWYoIWFjY3x8IXZlaHx8IWFjYy52YWx1ZXx8IXZlaC52YWx1ZSlyZXR1cm4gIiI7CiAgcmV0dXJuIGFjYy52YWx1ZSsifCIrdmVoLnZhbHVlOwp9Ci8qID09PT09PT09PT09PT09PT09IOiHquWumuS5ieiDjOaZryA9PT09PT09PT09PT09PT09PSAqLwpsZXQgX19iZ0RhdGE9IiI7CmZ1bmN0aW9uIGJnRmlsZUNoYW5nZWQoaW5wKXsKICBjb25zdCBmPWlucCYmaW5wLmZpbGVzJiZpbnAuZmlsZXNbMF07CiAgaWYoIWYpcmV0dXJuOwogIGlmKGYuc2l6ZT42KjEwMjQqMTAyNCl7dG9hc3QoIuWbvueJh+i/h+Wkp++8iOmZkCA2TULvvIkiLCJlcnIiKTtpbnAudmFsdWU9IiI7cmV0dXJuO30KICBjb25zdCByPW5ldyBGaWxlUmVhZGVyKCk7CiAgci5vbmxvYWQ9ZnVuY3Rpb24oKXtfX2JnRGF0YT1yLnJlc3VsdDtjb25zdCBwPWVsKCJiZ1ByZXZpZXciKTtpZihwKXtwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0idXJsKCIrX19iZ0RhdGErIikiO3AudGV4dENvbnRlbnQ9IiI7fXRvYXN0KCLlt7LpgInmi6nlm77niYfvvIzngrnjgIzlupTnlKjog4zmma/jgI3nlJ/mlYgiLCJpbmZvIik7fTsKICByLnJlYWRBc0RhdGFVUkwoZik7Cn0KZnVuY3Rpb24gYXBwbHlCZ1VwbG9hZCgpewogIGlmKCFfX2JnRGF0YSl7dG9hc3QoIuivt+WFiOmAieaLqeWbvueJhyIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYz1nZXRDZmcoKTtjLmN1c3RvbUJnPV9fYmdEYXRhO3NhdmVDZmcoYyk7CiAgYXBwbHlDdXN0b21CZygpOwogIGNvbnN0IGlucD1lbCgiYmdfZmlsZSIpO2lmKGlucClpbnAudmFsdWU9IiI7CiAgX19iZ0RhdGE9IiI7CiAgdG9hc3QoIuiDjOaZr+W3suW6lOeUqCIsIm9rIik7Cn0KZnVuY3Rpb24gcmVzZXRCZygpewogIGNvbnN0IGM9Z2V0Q2ZnKCk7Yy5jdXN0b21CZz0iIjtzYXZlQ2ZnKGMpOwogIGFwcGx5Q3VzdG9tQmcoKTsKICBjb25zdCBwPWVsKCJiZ1ByZXZpZXciKTtpZihwKXtwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjtwLnRleHRDb250ZW50PSLmnKrpgInmi6kiO30KICB0b2FzdCgi5bey5oGi5aSN6buY6K6k6IOM5pmvIiwiaW5mbyIpOwp9CmZ1bmN0aW9uIGFwcGx5Q3VzdG9tQmcoKXsKICBjb25zdCBiZz1nZXRDZmcoKS5jdXN0b21CZyxiPWRvY3VtZW50LmJvZHk7CiAgaWYoYmcpe2Iuc3R5bGUuYmFja2dyb3VuZEltYWdlPSJ1cmwoIitiZysiKSI7Yi5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT0iY292ZXIiO2Iuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPSJjZW50ZXIiO2Iuc3R5bGUuYmFja2dyb3VuZEF0dGFjaG1lbnQ9ImZpeGVkIjt9CiAgZWxzZXtiLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjtiLnN0eWxlLmJhY2tncm91bmRTaXplPSIiO2Iuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPSIiO2Iuc3R5bGUuYmFja2dyb3VuZEF0dGFjaG1lbnQ9IiI7fQp9Ci8qID09PT09PT09PT09PT09PT09IOaJi+acuuWPt+eZu+W9le+8iOWFjeaKk+WMhe+8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBzZW5kU21zQ29kZSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfc2VuZF9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuWPkemAgeS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnNlbmRDb2RlKHBob25lKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLpqozor4HnoIHlt7Llj5HpgIEiLCJvayIpO2xldCB0PTYwO2J0bi50ZXh0Q29udGVudD0i6YeN5paw6I635Y+WKCIrdCsicykiOwogICAgY29uc3QgaXY9c2V0SW50ZXJ2YWwoKCk9Pnt0LS07aWYodDw9MCl7Y2xlYXJJbnRlcnZhbChpdik7YnRuLnRleHRDb250ZW50PSLojrflj5bpqozor4HnoIEiO2J0bi5kaXNhYmxlZD1mYWxzZTt9ZWxzZSBidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjt9LDEwMDApOwogIH1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5Y+R6YCB5aSx6LSl77yM6K+35qOA5p+l572R57ucIiwiZXJyIik7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjt9Cn0KYXN5bmMgZnVuY3Rpb24gcGhvbmVMb2dpblVJKCl7CiAgY29uc3QgcGhvbmU9KGVsKCJwbF9waG9uZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBjb2RlPShlbCgicGxfY29kZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBpZighL14xXGR7MTB9JC8udGVzdChwaG9uZSkpe3RvYXN0KCLor7fovpPlhaXmraPnoa7nmoQxMeS9jeaJi+acuuWPtyIsImVyciIpO3JldHVybjt9CiAgaWYoIWNvZGUpe3RvYXN0KCLor7fovpPlhaXnn63kv6Hpqozor4HnoIEiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfbG9naW5fYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLnmbvlvZXkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5waG9uZUxvZ2luKHBob25lLGNvZGUsIiIpOwogIGlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IueZu+W9leaIkOWKnyIsIm9rIik7c2V0VGltZW91dCgoKT0+bG9jYXRpb24ucmVsb2FkKCksMTIwMCk7fQogIGVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLnmbvlvZXlpLHotKUiLCJlcnIiKTt9CiAgYnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5bm25re75Yqg6LSm5Y+3IjsKfQovLyB2Mi4xNC4yMSDnrb7lkI3lr4bpkqXphY3nva7pnaLmnb/lt7LliKDpmaTvvJphcHAvaDUvQUVTIOWvhumSpeebtOaOpeayv+eUqOW9k+WJjeWAvO+8iOWGhee9rum7mOiupO+8ie+8jOS4jeWGjeS7jui+k+WFpeahhuivu+WPlgovLyB2Mi4xNC4yMSDpo47pmannoa7orqTmlLnlvLnnqpfvvJrkv53lrZjphY3nva7ml7bmsr/nlKjlvZPliY0gdmVoaWNsZUNvbnRyb2xSaXNr77yM5LiN5riF56m65ZCM5oSP54q25oCBCmZ1bmN0aW9uIGNvbGxlY3RDZmdVSSgpe2NvbnN0IGN1cj1nZXRDZmcoKTtyZXR1cm57YXBwOnthcHBJZDpjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpjdXIuYXBwLmFwcFNlY3JldH0saDU6e2FwcElkOmN1ci5oNS5hcHBJZCxhcHBTZWNyZXQ6Y3VyLmg1LmFwcFNlY3JldH0sdmVoaWNsZUFlc0tleTpjdXIudmVoaWNsZUFlc0tleSx2ZWhpY2xlQ29udHJvbFJpc2s6Y3VyLnZlaGljbGVDb250cm9sUmlzayxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGN1ci5hdXRvUmVmcmVzaFNlY3x8NjApLHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2V8fCIiLGF1dG9TaWduaW46ZWwoImF1dG9fc2lnbmluIik/ZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZDpmYWxzZSxhdXRvU2lnbmluVGltZToodmFsKCJjZmdfc2lnbmluX3RpbWUiKXx8IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6ZWwoInZlaGljbGVfbW9uaXRvciIpP2VsKCJ2ZWhpY2xlX21vbml0b3IiKS5jaGVja2VkOmZhbHNlLHdpZGdldFZlaGljbGU6d2lkZ2V0U2VsZWN0aW9uVGV4dCgpfHxjdXIud2lkZ2V0VmVoaWNsZSxjdXN0b21CZzpjdXIuY3VzdG9tQmcsY29tbXVuaXR5OntlbmFibGVQb3N0OmVsKCJjb21tX3Bvc3QiKS5jaGVja2VkLGVuYWJsZUxpa2U6ZWwoImNvbW1fbGlrZSIpLmNoZWNrZWQsZW5hYmxlQ29tbWVudDplbCgiY29tbV9jb21tZW50IikuY2hlY2tlZCxlbmFibGVTaGFyZTplbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQsZW5hYmxlRGVsZXRlOmVsKCJjb21tX2RlbGV0ZSIpLmNoZWNrZWR9fX0KZnVuY3Rpb24gdmFsKGlkKXtjb25zdCBlPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtyZXR1cm4gZT9lLnZhbHVlOiIifQpmdW5jdGlvbiBlbChpZCl7cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKX0KYXN5bmMgZnVuY3Rpb24gc2F2ZUNmZ1VJKCl7Y29uc3QgYz1jb2xsZWN0Q2ZnVUkoKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVDb25maWcoYyk7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpe2FwcGx5UmVtb3RlQ2ZnKGMpO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfXRvYXN0KCLphY3nva7lt7Lkv53lrZgiLCJvayIpO3N0YXJ0QXV0b1JlZnJlc2goYy5hdXRvUmVmcmVzaFNlYyk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KLy8gdjIuMTQuMjEg562+5ZCN5a+G6ZKl6Z2i5p2/5bey5Yig6Zmk77ya5oGi5aSN6buY6K6k5pe25a+G6ZKl55u05o6l5YaZ5Zue5YaF572u6buY6K6k5YC8CmZ1bmN0aW9uIHJlc2V0Q2ZnVUkoKXtpZihlbCgiYXV0b19zaWduaW4iKSllbCgiYXV0b19zaWduaW4iKS5jaGVja2VkPWZhbHNlO2lmKGVsKCJjZmdfc2lnbmluX3RpbWUiKSllbCgiY2ZnX3NpZ25pbl90aW1lIikudmFsdWU9IjA3OjAwIjtpZihlbCgiY29tbV9wb3N0IikpZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9saWtlIikpZWwoImNvbW1fbGlrZSIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9jb21tZW50IikpZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9zaGFyZSIpKWVsKCJjb21tX3NoYXJlIikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX2RlbGV0ZSIpKWVsKCJjb21tX2RlbGV0ZSIpLmNoZWNrZWQ9dHJ1ZTtjb25zdCBjPWdldENmZygpO2MuYXBwPXthcHBJZDpERUZBVUxUX0NGRy5hcHAuYXBwSWQsYXBwU2VjcmV0OkRFRkFVTFRfQ0ZHLmFwcC5hcHBTZWNyZXR9O2MuaDU9e2FwcElkOkRFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpERUZBVUxUX0NGRy5oNS5hcHBTZWNyZXR9O2MudmVoaWNsZUFlc0tleT1ERUZBVUxUX0NGRy52ZWhpY2xlQWVzS2V5O2MudmVoaWNsZUNvbnRyb2xSaXNrPSIiO2Mud2lkZ2V0VmVoaWNsZT0iIjtjLmN1c3RvbUJnPSIiO3NhdmVDZmcoYyk7YXBwbHlDdXN0b21CZygpO2lmKGVsKCJ3aWRnZXRfYWNjIikpe2VsKCJ3aWRnZXRfYWNjIikudmFsdWU9IiI7ZWwoIndpZGdldF92ZWgiKS5pbm5lckhUTUw9IiI7fWNvbnN0IGJwPWVsKCJiZ1ByZXZpZXciKTtpZihicCl7YnAuc3R5bGUuYmFja2dyb3VuZEltYWdlPSIiO2JwLnRleHRDb250ZW50PSLmnKrpgInmi6kiO310b2FzdCgi5bey5oGi5aSN6buY6K6k77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfQpmdW5jdGlvbiBhZGRBY2NvdW50VUkoKXtjZmdBY2NvdW50cy5wdXNoKHt1c2VyTmFtZToiIix1c2VySWQ6IiIsdG9rZW46IiIsYmFya0tleToiIn0pO2NvbnN0IGxpc3Q9ZWwoImFjY0xpc3QiKTtjb25zdCBpZHg9Y2ZnQWNjb3VudHMubGVuZ3RoLTE7Y29uc3QgaHRtbD0nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsn77yI5paw77yJPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSI+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QmFyayDpgJrnn6UgS2V577yI6YCJ5aGr77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19iYXJrXycraWR4KyciIHBsYWNlaG9sZGVyPSJCYXJrIEtleSDmiJboh6rlu7ogaHR0cHM6Ly/ln5/lkI0vS2V5Ij48L2Rpdj48L2Rpdj4nO2lmKGxpc3QucXVlcnlTZWxlY3RvcigiLmFjYy1lZGl0Iil8fGxpc3QucXVlcnlTZWxlY3RvcigiW3N0eWxlKj0ndGV4dC1hbGlnbiddIikpe2xpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCJiZWZvcmVlbmQiLGh0bWwpfWVsc2V7bGlzdC5pbm5lckhUTUw9aHRtbH19CmZ1bmN0aW9uIGRlbGV0ZUFjY291bnRVSShpZHgpe2NvbnN0IHJvdz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWNjLWVkaXRbZGF0YS1pPSInK2lkeCsnIl0nKTtpZihyb3cpe3Jvdy5yZW1vdmUoKTtjZmdBY2NvdW50cy5zcGxpY2UoaWR4LDEpO3RvYXN0KCLlt7LliKDpmaTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9fQpmdW5jdGlvbiBjb2xsZWN0QWNjb3VudHNVSSgpe2NvbnN0IHJvd3M9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiI2FjY0xpc3QgLmFjYy1lZGl0Iik7Y29uc3QgbGlzdD1bXTtyb3dzLmZvckVhY2gocm93PT57Y29uc3QgaT1yb3cuZ2V0QXR0cmlidXRlKCJkYXRhLWkiKTtjb25zdCB0b2tlbj1lbCgiYWNjX3Rva2VuXyIraSk/LnZhbHVlfHwiIjtpZih0b2tlbi50cmltKCkpe2xpc3QucHVzaCh7dXNlck5hbWU6ZWwoImFjY19uYW1lXyIraSk/LnZhbHVlfHwiIix1c2VySWQ6ZWwoImFjY191aWRfIitpKT8udmFsdWV8fCIiLHRva2VuOmNsZWFuVG9rZW4odG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGVsKCJhY2NfYmFya18iK2kpPy52YWx1ZXx8IiIpfSl9fSk7cmV0dXJuIGxpc3R9CmFzeW5jIGZ1bmN0aW9uIHNhdmVBY2NvdW50c1VJKCl7Y29uc3QgbGlzdD1jb2xsZWN0QWNjb3VudHNVSSgpLm1hcChhPT4oe3VzZXJOYW1lOihhLnVzZXJOYW1lfHwiIikudHJpbSgpLHVzZXJJZDooYS51c2VySWR8fCIiKS50cmltKCksdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXkpfSkpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUFjY291bnRzKGxpc3QpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKVNUQVRFLnBhbmVsQWNjb3VudHM9bGlzdDt0b2FzdCgi5p6B5qC46LSm5Y+35bey5L+d5a2YIiwib2siKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQphc3luYyBmdW5jdGlvbiBmZXRjaFVzZXJJZFVJKGlkeCl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihlbCgiYWNjX3Rva2VuXyIraWR4KT8udmFsdWV8fCIiKTtjb25zdCBidG49ZWwoInVpZEJ0bl8iK2lkeCk7aWYoIXRva2VuKXt0b2FzdCgi6K+35YWI5aGr5YaZIFRva2VuIiwiZXJyIik7cmV0dXJufWJ0bi50ZXh0Q29udGVudD0i6I635Y+W5Lit4oCmIjtidG4uZGlzYWJsZWQ9dHJ1ZTtjb25zdCBkPWF3YWl0IEJhY2tlbmQuZ2V0VXNlcmlkKHRva2VuKTtpZihkJiZkLm9rJiZkLnVzZXJJZCl7aWYoZWwoImFjY191aWRfIitpZHgpKWVsKCJhY2NfdWlkXyIraWR4KS52YWx1ZT1kLnVzZXJJZDtpZihkLnVzZXJOYW1lJiZlbCgiYWNjX25hbWVfIitpZHgpJiYhZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZSllbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlPWQudXNlck5hbWU7dG9hc3QoIuiOt+WPluaIkOWKn++8miIrKGQudXNlck5hbWV8fGQudXNlcklkKSwib2siKX1lbHNle3RvYXN0KCLojrflj5blpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLmnKrnn6XplJnor68iKSwiZXJyIil9YnRuLnRleHRDb250ZW50PSLojrflj5ZJRCI7YnRuLmRpc2FibGVkPWZhbHNlfQoKLyogPT09PT09PT09PT09PT09PT0g5aSH5Lu9IC8g5oGi5aSNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGV4cG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWwpe3RvYXN0KCLnlYzpnaLmnKrlsLHnu6oiLCJlcnIiKTtyZXR1cm59ZWwudmFsdWU9IueUn+aIkOS4reKApiI7QmFja2VuZC5iYWNrdXAoKS50aGVuKGQ9PntpZihkJiZkLm9rKXtlbC52YWx1ZT1KU09OLnN0cmluZ2lmeShkLG51bGwsMik7dG9hc3QoIuWkh+S7veW3sueUn+aIkO+8jOWPr+WkjeWItuS/neWtmCIsIm9rIil9ZWxzZXtlbC52YWx1ZT0iIjt0b2FzdCgi5a+85Ye65aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5peg5rOV6L+e5o6l6ISa5pys5ZCO56uvIiksImVyciIpfX0pfQpmdW5jdGlvbiBjb3B5QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlKXt0b2FzdCgi6K+35YWI54K55Ye744CM5LiA6ZSu5a+85Ye65aSH5Lu944CNIiwiZXJyIik7cmV0dXJufWlmKG5hdmlnYXRvci5jbGlwYm9hcmQmJm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KXtuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChlbC52YWx1ZSkudGhlbigoKT0+dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIiksKCk9PntlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfSl9ZWxzZXtlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfX0KZnVuY3Rpb24gaW1wb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlLnRyaW0oKSl7dG9hc3QoIuivt+WFiOeymOi0tOWkh+S7veWGheWuuSIsImVyciIpO3JldHVybn1jb25maXJtRGlhbG9nKCLmgaLlpI3lpIfku70iLCLlsIbopobnm5blvZPliY3lhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzmraTmk43kvZzkuI3lj6/mkqTplIDjgIIiLCJpbXBvcnRCYWNrdXBOb3ciKX0KYXN5bmMgZnVuY3Rpb24gaW1wb3J0QmFja3VwTm93KCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtjb25zdCB2PWVsP2VsLnZhbHVlLnRyaW0oKToiIjtpZighdil7dG9hc3QoIuWkh+S7veWGheWuueS4uuepuiIsImVyciIpO3JldHVybn1jb25zdCBkPWF3YWl0IEJhY2tlbmQucmVzdG9yZUJhY2t1cCh2KTtpZihkJiZkLm9rKXt0b2FzdCgi5oGi5aSN5oiQ5Yqf77yaIisoZC5jb3VudHx8MCkrIiDkuKrotKblj7ciLCJvayIpO2lmKGlzUHJveHlNb2RlKCkpe1NUQVRFLnBhbmVsQWNjb3VudHM9W107U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9U1RBVEUuZGF0YT1bXTtyZW5kZXJDZmcoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuaBouWkjeWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuWkh+S7veWGheWuueagvOW8j+mUmeivryIpLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOa8lOekuuaVsOaNru+8iD9kZW1vIOmihOiniOeUqO+8jOS4jeiBlOe9ke+8iSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBpc0RlbW8oKXtyZXR1cm4gbG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MH0KZnVuY3Rpb24gZGVtb0NhbCgpewogIGNvbnN0IG5vdz1uZXcgRGF0ZSgpLHk9bm93LmdldEZ1bGxZZWFyKCksbT1ub3cuZ2V0TW9udGgoKSsxLGRpbT1uZXcgRGF0ZSh5LG0sMCkuZ2V0RGF0ZSgpLHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKSxvdXQ9W107CiAgZm9yKGxldCBkPTE7ZDw9ZGltO2QrKyl7CiAgICBjb25zdCBkcz15KyItIitwKG0pKyItIitwKGQpOwogICAgaWYoZHM+eSsiLSIrcChtKSsiLSIrcChub3cuZ2V0RGF0ZSgpKSlicmVhazsKICAgIGlmKGQ9PT0zfHxkPT09MTEpY29udGludWU7ICAgICAgICAgIC8vIOa8lOekuu+8muS4pOWkqea8j+etvgogICAgb3V0LnB1c2goe2NyZWF0ZURhdGU6ZHMsc2lnblN0YXR1ZTo1fSk7CiAgfQogIHJldHVybiBvdXQ7Cn0KY29uc3QgREVNT19JTlRFR1JBTD17b2s6dHJ1ZSx0b3RhbDp7aW50ZWdyYWxUb3RhbDoiMTIsODgwIn0sZXhwaXJlOlt7aW50ZWdyYWxTY29yZTozMjAsZXhwaXJ5RGF0ZVN0cjoiMjAyNi0xMi0zMSJ9XSxkZXRhaWw6WwogIHtuYW1lOiLmr4/ml6Xnrb7liLAiLGludGVncmFsU2NvcmU6NixteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy65Y+R5biWIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuueCuei1niIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrliIbkuqsiLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi55uy55uS5aWW5YqxIixpbnRlZ3JhbFNjb3JlOjYsbXlEYXRlU3RyOiIyMDI2LTA5LTI4IDA3OjAwIn0sCiAge25hbWU6Iuihpeetvua2iOiAlyIsaW50ZWdyYWxTY29yZTotMSxteURhdGVTdHI6IjIwMjYtMDktMjcgMjE6MTAifQpdfTsKY29uc3QgREVNT19TVVBQTEVNRU5UPXtjb3VudDp7b2s6dHJ1ZSxkYXRhOntjb3VudDoyLGNhcmROdW06Mn19LG1vbnRoOntvazp0cnVlLGRhdGE6e25vd1NpZ25EZXRhaWxWb3M6W119fX07CmNvbnN0IERFTU9fTU9OSVRPUj17b2s6dHJ1ZSxzbmFwc2hvdDp7dmluOiJMQjdKTTFDMTBOQTAwMDAwMSIsc29jOjc2LHJhbmdlOjYzLHZvbHRhZ2U6ODQuNSxjdXJyZW50OjAsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsaGVhZExvY2s6IjEiLG9mZmxpbmU6ZmFsc2UscmVmcmVzaFRpbWU6IjIwMjYtMDktMjkgMDM6MTAiLGZyb250UHJlc3N1cmU6IjIuMzViYXIiLHJlYXJQcmVzc3VyZToiMi40MGJhciIsZnJvbnRUZW1wOiIzMcKwQyIscmVhclRlbXA6IjMywrBDIixiYXR0ZXJ5VGVtcDoyNix0b2RheURpc3RhbmNlOjEyLjYsdG9kYXlEdXJhdGlvbjozNCx0b2RheU1heFNwZWVkOjU2LGFkZHJlc3M6Iuemj+W7uuecgeWugeW+t+W4guiVieWfjuWMuuS4nOS+qOW8gOWPkeWMuiIsc2VydmljZUVuZERhdGU6IjIwMjctMDMtMTgifSwKICB2ZWhpY2xlczpbe3ZlaGljbGVOYW1lOiJaRUVITyBBRTQiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsdmVoaWNsZVR5cGU6IkFFNCBNQVgyKyJ9LHt2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIix2ZWhpY2xlVHlwZToiQUU2In1dfTsKY29uc3QgREVNT19DVFJMX09QVFM9e29rOnRydWUsY2hhcmdlUG93ZXI6W3trZXk6IjQwMCJ9LHtrZXk6IjgwMCJ9LHtrZXk6IjEwMDAifV0sZ2VhcnM6WyIyNSIsIjQ1IiwiNjAiXX07CmNvbnN0IERFTU9fSU5GTz17b2s6dHJ1ZSx1bnJlYWQ6e3RvdGFsOjN9LHByaXplUmVjb3Jkczp7cmVjb3Jkczpbe3ByaXplc05hbWU6Iuenr+WIhiArNiIsY3JlYXRlVGltZToiMjAyNi0wOS0yOCAwNzowMCIsaW50ZWdyYWw6Nn0se3ByaXplc05hbWU6IuihpeetvuWNoSDDlzEiLGNyZWF0ZVRpbWU6IjIwMjYtMDktMjEgMDc6MDAifV19LGNvdXBvbnM6e3JlY29yZHM6W3t9LHt9LHt9XX0sb3RhOltdfTsKY29uc3QgREVNT19EQVRBPVsKe3VzZXJOYW1lOiLpmL/ms70iLHVzZXJJZDoiMjAyNTEwMDkxMjM0NTY3OCIsc2NvcmU6MTI4ODAsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NDIsdG9kYXlTY29yZToxMixzaWduQ291bnQ6MzYsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGJhdHRlcnlQZXJjZW50Ojc2LHJlc2lkdWFsUmFuZ2VLbTo2MyxyYW5nZUVzdGltYXRlZDpmYWxzZSxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjg0LjUsY3VycmVudDowLGJhdHRlcnlUZW1wOjI2LGZyb250UHJlc3N1cmU6IjIuMzViYXIiLHJlYXJQcmVzc3VyZToiMi40MGJhciIsZnJvbnRUZW1wOiIzMcKwQyIscmVhclRlbXA6IjMywrBDIix0b2RheURpc3RhbmNlOjEyLjYsdG9kYXlEdXJhdGlvbjozNCx0b2RheU1heFNwZWVkOjU2LGxhc3RSaWRlTWlsZWFnZTo4LjIsdG90YWxNaWxlYWdlOjI3MTA1LjIseWVzdGVyZGF5RGlzdGFuY2U6ODguNCxvbmxpbmU6IjEiLHBvd2VyU3RhdHVzOiIwIixsb2NrU3RhdGU6IjEiLGN1c2hpb25TdGF0ZToiMCIsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6Iixsb2NhdGlvblRpbWU6IjA4OjEyIixsb25naXR1ZGU6MTE5LjU1MDksbGF0aXR1ZGU6MjYuNjY1NCxzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9fSwKe3VzZXJOYW1lOiLlsI/mu6EiLHVzZXJJZDoiMjAyNjAxMDExMTIyMzM0NCIsc2NvcmU6NTIwLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czozLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6OSx0b2tlblZhbGlkOmZhbHNlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIixiYXR0ZXJ5UGVyY2VudDoyMyxyZXNpZHVhbFJhbmdlS206MjAscmFuZ2VFc3RpbWF0ZWQ6dHJ1ZSxjaGFyZ2VTdGF0ZToi5YWF55S15LitIix2b2x0YWdlOjg2LjIsY3VycmVudDo1LjQsYmF0dGVyeVRlbXA6MzEsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCxjdXJyZW50VmluOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZXM6W3tuYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIifSx7bmFtZToiQUU1aVByb01heCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAzIn1dLGZyb250UHJlc3N1cmU6IjIuMTBiYXIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsb25saW5lOiIwIixwb3dlclN0YXR1czoiMSIsbG9ja1N0YXRlOiIwIixjdXNoaW9uU3RhdGU6IjEiLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIixzZXJ2aWNlRW5kRGF0ZToiIn19LAp7dXNlck5hbWU6Imx15bCP5Y+3Iix1c2VySWQ6IjIwMjYwOTI1MDAwOTQxMjgzIixzY29yZToxMTUsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NCx0b2RheVNjb3JlOjQsc2lnbkNvdW50OjQsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6ZmFsc2V9fQpdOwpjb25zdCBERU1PX0xPR1M9Wwp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxMiIsdHlwZToic2lnbmluIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjEyLHNpZ25pblNjb3JlOjYsYmxpbmRCb3hTY29yZTo2LGludGVyYWN0U2NvcmU6MCxjb250aW51ZURheXM6NDIsc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzYgKOenr+WIhikiLCLnm7Lnm5LmnKrop6PplIEoMzYvMzApIl19LAp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxNSIsdHlwZToic2lnbmluIix1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acnyIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfSwKe3RpbWU6IjIwMjYtMDktMDkgMjI6MzE6MDUiLHR5cGU6InZlaGljbGUiLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSxhY3Rpb25UZXh0OiLkupHnq6/lvIDplIEiLG1lc3NhZ2U6IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSIsc3RlcHM6W119Cl07CgovKiA9PT09PT09PT09PT09PT09PSDliLfmlrAgJiDliJ3lp4vljJYgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvYWRpbmc9ZmFsc2U7Ci8vIOWFpeWcuumXquWxj++8mumhtemdouWPr+S6pOS6ku+8iOmqqOaetuWxj+W3sua4suafk++8ieWNs+aSpOS4i++8jOS4jeWGjeetiee9kee7nOaVsOaNru+8m+aVsOaNruWIsOi+vuWQjuWGjeWhq+WFhQpmdW5jdGlvbiBoaWRlU3BsYXNoKCl7Y29uc3Qgcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3BsYXNoIik7aWYoIXMpcmV0dXJuO3MuY2xhc3NMaXN0LmFkZCgib3V0Iik7c2V0VGltZW91dCgoKT0+e2lmKHMucGFyZW50Tm9kZSlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocyl9LDQ1MCl9CmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBbGwoc2lsZW50KXsKICBpZihsb2FkaW5nKXJldHVybjtsb2FkaW5nPXRydWU7CiAgaWYoIXNpbGVudCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7aWYoIVNUQVRFLmRhdGEubGVuZ3RoKWVsLmlubmVySFRNTD1za2VsZXRvbkhvbWUoKX0KICBoaWRlU3BsYXNoKCk7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldERhc2hib2FyZCgpOwogIGxvYWRpbmc9ZmFsc2U7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg56ev5YiG6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBQVD17YWNjSWR4OjAsbW9udGg6IiIsbW9udGhTZXREYXk6IiJ9OwpmdW5jdGlvbiBwdEFjY291bnRzKCl7cmV0dXJuIFNUQVRFLmRhdGEmJlNUQVRFLmRhdGEubGVuZ3RoP1NUQVRFLmRhdGE6KFNUQVRFLnBhbmVsQWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwi6LSm5Y+3Iix1c2VySWQ6YS51c2VySWR8fCIifSkpfQpmdW5jdGlvbiBhY2NDaGlwc0h0bWwocHJlZml4KXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuIiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2hpcHMiPicrbGlzdC5tYXAoKGEsaSk9Pic8YnV0dG9uIGNsYXNzPSJhY2MtY2hpcCAnKyhpPT09KHByZWZpeD09PSJwdCI/UFQuYWNjSWR4OlZILmFjY0lkeCk/J29uJzonJykrJyIgb25jbGljaz0icGlja0FjYyhcJycrcHJlZml4KydcJywnK2krJykiPicrZXNjKGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKfQpmdW5jdGlvbiBwaWNrQWNjKHByZWZpeCxpKXtpZihwcmVmaXg9PT0icHQiKXtQVC5hY2NJZHg9aTtyZW5kZXJQb2ludHMoKX1lbHNle1ZILmFjY0lkeD1pO1ZILnZpbj0iIjtyZW5kZXJWZWhpY2xlUGFnZSgpfX0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUG9pbnRzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VQb2ludHMiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFBULmFjY0lkeD49bGlzdC5sZW5ndGgpUFQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3np6/liIbmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICAvLyB2Mi4xNC4yMCDml6Xljobot6jmnIjkv67mraPvvJrpnaLmnb/luLjpqbvml7YgUFQubW9udGgg5Y+v6IO95rue55WZ5LiK5pyI44CC6Leo5Yiw5paw5pyI5Lu977yI5LuK5aSp5LiN5piv6K6+572u6K+l5pyI5Lu96YKj5aSp77yJ5ZCO6Ieq5Yqo5Zue5Yiw5b2T5YmN5pyI77yMCiAgLy8g6YG/5YWNIDEw5pyIMeWPtyDml7bml6Xljobku43lgZzlnKggOeaciDMw5Y+377yI5LiK5pyI77yJ5pi+56S65LiN5YeG56Gu44CCCiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPV9ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgX3RkeT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX25vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihQVC5tb250aCYmUFQubW9udGhTZXREYXkmJlBULm1vbnRoU2V0RGF5IT09X3RkeSYmUFQubW9udGg8X2N1ck0pe1BULm1vbnRoPSIiO1BULm1vbnRoU2V0RGF5PSIiO30KICBjb25zdCBtb250aD1QVC5tb250aHx8X2N1ck07CiAgY29uc3QgW2l0LGNhbCxjbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLDEpLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJtb250aCIsYWNjLnVzZXJJZCx7bW9udGg6bW9udGh9KSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgiY291bnQiLGFjYy51c2VySWQse30pCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJwdCIpOwogIC8vIOaAu+iniO+8iHYyLjE0LjIwIOWFvOWuuSBkYXRhIOS4uue6r+aVsOWtl+aIluWvueixoeS4pOenjei/lOWbnu+8iQogIGNvbnN0IHRvdGFsPShpdCYmaXQudG90YWwhPW51bGwpPygodHlwZW9mIGl0LnRvdGFsPT09Im51bWJlciJ8fCh0eXBlb2YgaXQudG90YWw9PT0ic3RyaW5nIiYmaXQudG90YWwhPT0iIikpP1N0cmluZyhpdC50b3RhbCk6ZGVlcFBpY2soaXQudG90YWwsWyJpbnRlZ3JhbFRvdGFsIiwidG90YWxJbnRlZ3JhbCIsInNjb3JlIiwiaW50ZWdyYWwiLCJ0b3RhbCJdLDQpKToiIjsKICBjb25zdCBjYXJkTnVtPShjbnQmJmNudC5kYXRhIT1udWxsKT8oKHR5cGVvZiBjbnQuZGF0YT09PSJudW1iZXIifHwodHlwZW9mIGNudC5kYXRhPT09InN0cmluZyImJmNudC5kYXRhIT09IiIpKT9TdHJpbmcoY250LmRhdGEpOmRlZXBQaWNrKGNudC5kYXRhLFsiY291bnQiLCJjYXJkTnVtIiwiY2FyZENvdW50IiwibnVtYmVyIiwibnVtIiwic2lnbkNvdW50Iiwic2lnblN1cHBsZW1lbnRDb3VudCIsInJlaXNzdWVDYXJkTnVtIiwic3VwcGxlbWVudENhcmROdW0iLCJjYXJkVG90YWwiLCJ0b3RhbCJdLDQpKToiIjsKICBodG1sKz0nPGRpdiBjbGFzcz0icHQtZ3JpZCI+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5b2T5YmN5oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh0b3RhbHx8Ii0tIikrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuihpeetvuWNoTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MoY2FyZE51bXx8Ii0tIikrJzwvZGl2PjxkaXYgY2xhc3M9InN1YiI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiIG9uY2xpY2s9InN1cEdhaW4oKSI+56ev5YiG5YWR5o2i6KGl562+5Y2hPC9idXR0b24+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nOwogIC8vIOebsuebkui/m+W6pu+8iHYyLjE0LjE0IOi1t+eUsemmlumhtei/geenu+iHs+atpO+8iQogIGNvbnN0IGNvbnQ9TnVtYmVyKGFjYy5jb250aW51ZURheXN8fDApOwogIGNvbnN0IGJEYXk9Y29udD09PTA/MDooKGNvbnQtMSklMzApKzE7Y29uc3QgYlJvdW5kPWNvbnQ9PT0wPzA6TWF0aC5jZWlsKGNvbnQvMzApO2NvbnN0IGJQY3Q9TWF0aC5yb3VuZCgoYkRheS8zMCkqMTAwKTsKICBodG1sKz0nPGRpdiBjbGFzcz0iYmxpbmQiIHN0eWxlPSJtYXJnaW46MCAwIDEycHgiPjxkaXYgY2xhc3M9ImJsaW5kLXRvcCI+PHNwYW4+55uy55uS6L+b5bqm77yI56ysJytiUm91bmQrJ+i9ru+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iciBudW0iPicrYkRheSsnIC8gMzAgwrcgJytiUGN0KyclIMK3IOi/nuetviAnK2NvbnQrJyDlpKk8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iYmxpbmQtYmFyIj48ZGl2IGNsYXNzPSJibGluZC1maWxsIiBzdHlsZT0id2lkdGg6JytiUGN0KyclIj48L2Rpdj48L2Rpdj48L2Rpdj4nOwogIC8vIOetvuWIsOaXpeWOhgogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNoZWNrKyfnrb7liLDml6XljoYgwrcgJytlc2MobW9udGgpKyc8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBkYXlzPShjYWwmJmNhbC5kYXRhJiZjYWwuZGF0YS5ub3dTaWduRGV0YWlsVm9zKXx8W107CiAgaWYoZGF5cy5sZW5ndGgpewogICAgaHRtbCs9Y2FsSHRtbChkYXlzLG1vbnRoLGFjYy51c2VySWQpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPicrKGNhbCYmY2FsLm1lc3NhZ2U/ZXNjKGNhbC5tZXNzYWdlKToi5pel5Y6G5Yqg6L295aSx6LSl77yI5Y+v6IO96ZmQ5rWB77yM56iN5ZCO5YaN6K+V77yJIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIHYyLjE0LjIxIOWIoOmZpOenr+WIhua1geawtO+8iOenr+WIhuivpuaDhe+8ieWMuuWdlwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7np6/liIbmlbDmja7mnaXoh6rmnoHmoLjlrp7ml7YgQVBJIMK3IOihpeetvumZkCAzMCDlpKnlhoXmvI/nrb7vvIzmr4/mrKHmtojogJcgMSDlvKDooaXnrb7ljaE8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CmZ1bmN0aW9uIGNhbEh0bWwoZGF5cyxtb250aCx1c2VySWQpewogIGNvbnN0IHltPW1vbnRoLnNwbGl0KCItIik7Y29uc3QgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKTsKICBjb25zdCBmaXJzdD1uZXcgRGF0ZSh5LG0tMSwxKS5nZXREYXkoKTsKICBjb25zdCBkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKTsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IGg9JzxkaXYgY2xhc3M9ImNhbC1ncmlkIj4nOwogIFsi5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl0uZm9yRWFjaCh3PT57aCs9JzxkaXYgY2xhc3M9ImNhbC13ZCI+Jyt3Kyc8L2Rpdj4nfSk7CiAgZm9yKGxldCBpPTA7aTxmaXJzdDtpKyspaCs9JzxkaXYgY2xhc3M9ImNhbC1kIGJsYW5rIj48L2Rpdj4nOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9bW9udGgrIi0iK1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIik7CiAgICBjb25zdCBlbnRyeT1kYXlzLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpOwogICAgY29uc3Qgc2lnbmVkPWVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCk7CiAgICBjb25zdCBpc1RvZGF5PWRzPT09dFN0cjsKICAgIGNvbnN0IGZ1dHVyZT1kcz50U3RyOwogICAgbGV0IGNscz0iY2FsLWQiKyhzaWduZWQ/IiBzaWduZWQiOihmdXR1cmU/IiBmdXR1cmUiOihlbnRyeT8iIG1pc3MiOiIiKSkpOwogICAgaWYoaXNUb2RheSljbHMrPSIgdG9kYXkiOwogICAgY29uc3QgY2xpY2thYmxlPSFzaWduZWQmJiFmdXR1cmUmJmVudHJ5OwogICAgaCs9JzxkaXYgY2xhc3M9IicrY2xzKyciICcrKGNsaWNrYWJsZT8nc3R5bGU9ImN1cnNvcjpwb2ludGVyIiBvbmNsaWNrPSJzdXBDb25zdW1lKFwnJytkcysnXCcsXCcnK2VzYyh1c2VySWQpKydcJykiJzonJykrJz4nCiAgICAgICsnPHNwYW4+JytkKyc8L3NwYW4+JwogICAgICArJzxzcGFuIGNsYXNzPSJkb3QiPicrKHNpZ25lZD8i4pyTIjooZnV0dXJlPyIiOihlbnRyeT8i5ryPIjoiIikpKSsnPC9zcGFuPicKICAgICAgKyc8L2Rpdj4nOwogIH0KICBoKz0nPC9kaXY+JzsKICBoKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+54K55Ye744CM5ryP44CN5pel5pyf5L2/55So6KGl562+5Y2h6KGl562+77yI6ZyA5YWI5pyJ6KGl562+5Y2h77yJPC9kaXY+JzsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBwdE1vbnRoU2hpZnQoZGlyKXsKICBjb25zdCBjdXI9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCItIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBQVC5tb250aD15KyItIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIC8vIOiusOW9leiuvue9ruivpeaciOS7veeahOW9k+Wkqe+8jOi3qOaciOWQjiByZW5kZXJQb2ludHMg5o2u5q2k5oqK5rue55WZ55qE5LiK5pyI6Ieq5Yqo5aSN5L2N5Yiw5b2T5YmN5pyICiAgY29uc3QgZD1uZXcgRGF0ZSgpOwogIFBULm1vbnRoU2V0RGF5PWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIHJlbmRlclBvaW50cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cENvbnN1bWUoZGF0ZSx1c2VySWQpewogIGNvbmZpcm1EaWFsb2coIuenr+WIhuihpeetviIsIuS9v+eUqCAxIOW8oOihpeetvuWNoeihpeetviAiK2RhdGUrIiDvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi6KGl562+5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImNvbnN1bWUiLHVzZXJJZCx7ZGF0ZVRpbWU6ZGF0ZX0pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuihpeetvuaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLooaXnrb7lpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOihpeetviIpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cEdhaW4oKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25maXJtRGlhbG9nKCLlhZHmjaLooaXnrb7ljaEiLCLkvb/nlKjnp6/liIblhZHmjaIgMSDlvKDooaXnrb7ljaHvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5YWR5o2i5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImdhaW4iLGFjYy51c2VySWQse30pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuWFkeaNouaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLlhZHmjaLlpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOWFkeaNoiIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOi9pui+humhte+8iOebkeaOpyArIOi9puaOp+aJqeWxlSArIOS/oeaBr+S4reW/g++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgVkg9e2FjY0lkeDowLHZpbjoiIixjcDoiIixsb2NrVHlwZToiMSJ9Owphc3luYyBmdW5jdGlvbiByZW5kZXJWZWhpY2xlUGFnZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlVmVoaWNsZSIpO2lmKCFlbClyZXR1cm47CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pqC5peg6LSm5Y+3PC9oMz48cD7or7flhYjlnKjpppbpobXliqDovb3mlbDmja7miJblnKjorr7nva7pobXmt7vliqDotKblj7c8L3A+PC9kaXY+JztyZXR1cm59CiAgaWYoVkguYWNjSWR4Pj1saXN0Lmxlbmd0aClWSC5hY2NJZHg9MDsKICBjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdOwogIGlmKCFhY2MudXNlcklkKXtlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuivpei0puWPt+e8uuWwkeeUqOaIt0lEPC9oMz48L2Rpdj4nO3JldHVybn0KICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9vei9pui+huaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGxldCBtb249YXdhaXQgQmFja2VuZC52ZWhpY2xlTW9uaXRvcihhY2MudXNlcklkLCIiKTsKICBjb25zdCB2ZWhMaXN0PShtb24mJkFycmF5LmlzQXJyYXkobW9uLnZlaGljbGVzKSk/bW9uLnZlaGljbGVzOltdOwogIGlmKFZILnZpbiYmbW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCYmbW9uLnNuYXBzaG90LnZpbiE9PVZILnZpbil7CiAgICBjb25zdCBtb24yPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCxWSC52aW4pOwogICAgaWYobW9uMiYmbW9uMi5vayl7bW9uMi52ZWhpY2xlcz12ZWhMaXN0O21vbj1tb24yfQogIH0KICBjb25zdCBbb3B0cyxpbmZvXT1hd2FpdCBQcm9taXNlLmFsbChbCiAgICBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KHthY3Rpb246Im9wdGlvbnMiLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifSksCiAgICBCYWNrZW5kLmluZm9DZW50ZXIoYWNjLnVzZXJJZCxWSC52aW58fCIiKQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgidmgiKTsKICAvLyDovabovobpgInmi6nvvIjlpJrovabvvIkKICBpZih2ZWhMaXN0Lmxlbmd0aD4xKXsKICAgIGNvbnN0IGN1clZpbj1WSC52aW58fChtb24mJm1vbi5zbmFwc2hvdD9tb24uc25hcHNob3QudmluOnZlaExpc3RbMF0udmluTm8pOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im9wdC1yb3ciPicrdmVoTGlzdC5tYXAodj0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKGN1clZpbj09PXYudmluTm8/J29uJzonJykrJyIgb25jbGljaz0iVkgudmluPVwnJytlc2Modi52aW5ObykrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKHYudmVoaWNsZVR5cGV8fHYudmVoaWNsZU5hbWV8fHYudmluTm8pKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKICB9CiAgLy8g54q25oCB55uR5o6n5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuY2FyKyfovabovobnirbmgIE8L2g0PjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJzaG93VmVoaWNsZURldGFpbCgnK1ZILmFjY0lkeCsnKSI+6K+m5oOFPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZW5kZXJWZWhpY2xlUGFnZSgpIj7liLfmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JzsKICBpZihtb24mJm1vbi5vayYmbW9uLnNuYXBzaG90KXsKICAgIGNvbnN0IHNuPW1vbi5zbmFwc2hvdDsKICAgIGNvbnN0IHNvY0NvbD1zbi5zb2M8PTIwPyJ2YXIoLS1lcnIpIjpzbi5zb2M8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLW9rKSI7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9meeUtemHjzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nKyhzbi5zb2MhPW51bGw/c24uc29jKyIlIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9mee7reiIqjwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrKHNuLnJhbmdlIT1udWxsP3NuLnJhbmdlKyIga20iOiItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+6b6Z5aS06ZSBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nKyhzbi5oZWFkTG9jaz09PSIxIj8i5bey6ZSBIjoi5pyq6ZSBIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7lnKjnur/nirbmgIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjonKyhzbi5vZmZsaW5lPyJ2YXIoLS1lcnIpIjoidmFyKC0tb2spIikrJyI+Jysoc24ub2ZmbGluZT8i56a757q/77yIPjMw5YiG6ZKf5pyq5LiK5oql77yJIjoi5Zyo57q/IikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnIDlkI7kuIrmiqU8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKSI+Jytlc2Moc24ucmVmcmVzaFRpbWV8fCItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKG1vbiYmKG1vbi5lcnJvcnx8bW9uLm1lc3NhZ2UpKXx8IuW/q+eFp+iOt+WPluWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyDovabovobmjqfliLbljaHvvIjku47pppbpobXov4Hnp7vov4fmnaXvvIkKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9pui+huaOp+WItjwvaDQ+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJjdHJsLWdyaWQiPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJmaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdmaW5kXCcsdGhpcykiPicrSS5iZWxsKyflr7vovaY8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0ibG91ZEZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvdWRGaW5kXCcsdGhpcykiPicrSS52b2wrJ+m4o+esmzwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJjdXNoaW9uIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdjdXNoaW9uXCcsdGhpcykiPicrSS5zZWF0KyflnZDlnqs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIHVubG9jayIgZGF0YS1hY3Q9InVubG9jayIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwndW5sb2NrXCcsdGhpcykiPicrSS51bmxvY2srJ+W8gOmUgTwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gbG9jayIgZGF0YS1hY3Q9ImxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvY2tcJyx0aGlzKSI+JytJLmxvY2srJ+WFs+mUgTwvYnV0dG9uPicKICAgICsnPC9kaXY+PC9kaXY+JzsKICAvLyDovabmjqfmianlsZXljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9puaOp+aJqeWxlTwvaDQ+PC9kaXY+JzsKICBjb25zdCBjcHM9KG9wdHMmJkFycmF5LmlzQXJyYXkob3B0cy5jaGFyZ2VQb3dlcikpP29wdHMuY2hhcmdlUG93ZXI6W107CiAgaWYoY3BzLmxlbmd0aCl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1ib3R0b206NHB4Ij7lhYXnlLXlip/njofvvIhX77yJPC9kaXY+PGRpdiBjbGFzcz0ib3B0LXJvdyI+JwogICAgICArY3BzLm1hcChvPT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoVkguY3A9PT1vLmtleT8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC5jcD1cJycrZXNjKG8ua2V5KSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2Moby5rZXkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdjaGFyZ2VQb3dlclwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgLy8gdjIuMTQuMjEg5Yig6Zmk6ZmQ6YCf5qGj5L2N6K6+572uCiAgLy8gdjIuMTQuMjIg5a+86Iiq5oqV5bGP6Z2i5p2/77yITW90b3BsYXnvvIkKICBodG1sKz0nPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjoxMnB4IDAiPjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjZweCI+5a+86Iiq5oqV5bGPPC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0ibmF2LXBhbmVsIj4nOwogIGh0bWwrPSc8ZGl2IGlkPSJuYXZNYXAiIHN0eWxlPSJ3aWR0aDoxMDAlO2hlaWdodDoyMDBweDtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTttYXJnaW4tYm90dG9tOjhweDtvdmVyZmxvdzpoaWRkZW4iPjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6OHB4O21hcmdpbi1ib3R0b206OHB4Ij48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im5hdkRlc3RJbnB1dCIgcGxhY2Vob2xkZXI9IuaQnOe0ouebrueahOWcsOKApiIgc3R5bGU9ImZsZXg6MTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4IiBvbmlucHV0PSJuYXZTZWFyY2godGhpcy52YWx1ZSkiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9Im5hdkNvbm5CdG4iIG9uY2xpY2s9Im5hdlRvZ2dsZUNvbm4oKSI+6L+e5o6l6L2m5py6PC9idXR0b24+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBpZD0ibmF2UmVzdWx0cyIgc3R5bGU9Im1heC1oZWlnaHQ6MTYwcHg7b3ZlcmZsb3cteTphdXRvO21hcmdpbi1ib3R0b206OHB4Ij48L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGlkPSJuYXZSb3V0ZUluZm8iIGNsYXNzPSJuYXYtcm91dGUtaW5mbyIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIGlkPSJuYXZDYXN0QnRuIiBvbmNsaWNrPSJuYXZTdGFydENhc3QoKSIgZGlzYWJsZWQgc3R5bGU9Im9wYWNpdHk6LjUiPuW8gOWni+aKleWxjzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgaWQ9Im5hdlN0b3BCdG4iIG9uY2xpY2s9Im5hdlN0b3BDYXN0KCkiIGRpc2FibGVkIHN0eWxlPSJvcGFjaXR5Oi41Ij7nu5PmnZ88L2J1dHRvbj48L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiPuaKleWxj+mcgOi/nuaOpei9puacuiBXaUZp77yIMTkyLjE2OC4wLjHvvInvvIzlr7zoiKrmlbDmja7pgJrov4cgV2lGaSDnm7Tov57mjqjpgIHliLDovabmnLogVEZUIOWxj+W5leOAgjwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g5L+h5oGv5Lit5b+D5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuYmVsbCsn5L+h5oGv5Lit5b+DPC9oND48L2Rpdj4nOwogIGlmKGluZm8mJmluZm8ub2spewogICAgY29uc3QgdW49aW5mby51bnJlYWQhPW51bGw/ZGVlcFBpY2soaW5mby51bnJlYWQsWyJ0b3RhbCIsImNvdW50IiwidW5SZWFkQ291bnQiLCJudW0iXSwzKToiIjsKICAgIGlmKHVuIT09IiIpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnKror7vmtojmga88L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh1bikrJzwvc3Bhbj48L2Rpdj4nOwogICAgY29uc3QgcHJpemVzPShpbmZvLnByaXplUmVjb3JkcyYmKGluZm8ucHJpemVSZWNvcmRzLnJlY29yZHN8fGluZm8ucHJpemVSZWNvcmRzLmxpc3R8fGluZm8ucHJpemVSZWNvcmRzKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShwcml6ZXMpJiZwcml6ZXMubGVuZ3RoKXsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW46OHB4IDAgNHB4Ij7nm7Lnm5Iv5Lit5aWW6K6w5b2VPC9kaXY+JzsKICAgICAgaHRtbCs9cHJpemVzLnNsaWNlKDAsNSkubWFwKHA9Pic8ZGl2IGNsYXNzPSJmbG93LWl0ZW0iPjxkaXY+PGRpdiBjbGFzcz0ibm0iPicrZXNjKHAucHJpemVzTmFtZXx8cC5uYW1lfHwi5aWW5ZOBIikrJzwvZGl2PjxkaXYgY2xhc3M9InRtIj4nK2VzYyhwLmNyZWF0ZVRpbWV8fHAuY3JlYXRlRGF0ZXx8IiIpKyc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJzYyBwbHVzIiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrZXNjKHAuaW50ZWdyYWw/KCIrIitwLmludGVncmFsKToiIikrJzwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogICAgfQogICAgY29uc3QgY291cG9ucz0oaW5mby5jb3Vwb25zJiYoaW5mby5jb3Vwb25zLnJlY29yZHN8fGluZm8uY291cG9ucy5saXN0fHxpbmZvLmNvdXBvbnMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KGNvdXBvbnMpJiZjb3Vwb25zLmxlbmd0aClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuS8mOaDoOWIuDwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrY291cG9ucy5sZW5ndGgrJyDlvKA8L3NwYW4+PC9kaXY+JzsKICAgIGlmKGluZm8ub3RhIT1udWxsKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+T1RBIOWNh+e6pzwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nKyhBcnJheS5pc0FycmF5KGluZm8ub3RhKSYmaW5mby5vdGEubGVuZ3RoPyLmnInmlrDniYjmnKwiOiLlt7LmmK/mnIDmlrAiKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChpbmZvJiYoaW5mby5lcnJvcnx8aW5mby5tZXNzYWdlKSl8fCLkv6Hmga/kuK3lv4PliqDovb3lpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPui9puaOp+aJqeWxleaMh+S7pOe7j+S6keerr+S4i+WPke+8jOWTjeW6lOWPr+iDvei+g+aFojwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7CiAgbmF2SW5pdE9uVGFiKCk7Cn0KLyogPT09PT09PT09PT09PT09PT0gdjIuMTQuMjIgTW90b3BsYXkg5a+86Iiq5oqV5bGPID09PT09PT09PT09PT09PT09ICovCmxldCBOQVY9e21hcDpudWxsLGRyaXZpbmc6bnVsbCxwbGFjZVNlYXJjaDpudWxsLGF1dG9Db21wbGV0ZTpudWxsLHJvdXRlOm51bGwsbmF2U3RlcHM6W10sY3VyU3RlcDowLGNhc3Rpbmc6ZmFsc2Usd2F0Y2hJZDpudWxsLGFtYXBMb2FkZWQ6ZmFsc2UsYW1hcExvYWRpbmc6ZmFsc2UsYW1hcENiczpbXSxhbWFwS2V5OiI1YTk3MzllNDJkMWQ0MGVlOWI4OGEyNTgyZWQ5MzgxOCJ9OwovLyDpq5jlvrflnLDlm74gU0RLIOaHkuWKoOi9ve+8mummluWxj+S4jeWKoOi9ve+8iOWQjOatpSBzY3JpcHQg5Lya6Zi75aGeIGxvYWQg5LqL5Lu277yJ77yM6L+b6L2m6L6GL+WvvOiIqumhteaXtuaMiemcgOazqOWFpe+8mwovLyDliqDovb3kuK3ph43lpI3osIPnlKjmjpLpmJ/nrYnlvoXvvIzlkIzkuIDml7bliLvlj6rms6jlhaXkuIDmrKEKZnVuY3Rpb24gbmF2TG9hZEFNYXAoY2IpewogIGlmKHR5cGVvZiBBTWFwIT09InVuZGVmaW5lZCIpe2lmKGNiKWNiKCk7cmV0dXJufQogIGlmKE5BVi5hbWFwTG9hZGluZyl7aWYoY2IpTkFWLmFtYXBDYnMucHVzaChjYik7cmV0dXJufQogIE5BVi5hbWFwTG9hZGluZz10cnVlO05BVi5hbWFwQ2JzPWNiP1tjYl06W107CiAgY29uc3Qgcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJzY3JpcHQiKTsKICBzLnNyYz0iaHR0cHM6Ly93ZWJhcGkuYW1hcC5jb20vbWFwcz92PTIuMCZrZXk9IitOQVYuYW1hcEtleSsiJnBsdWdpbj1BTWFwLkF1dG9Db21wbGV0ZSxBTWFwLkRyaXZpbmciOwogIHMub25sb2FkPWZ1bmN0aW9uKCl7TkFWLmFtYXBMb2FkaW5nPWZhbHNlO2NvbnN0IGNicz1OQVYuYW1hcENicztOQVYuYW1hcENicz1bXTtjYnMuZm9yRWFjaChmdW5jdGlvbihmKXt0cnl7ZigpfWNhdGNoKGUpe319KX07CiAgcy5vbmVycm9yPWZ1bmN0aW9uKCl7TkFWLmFtYXBMb2FkaW5nPWZhbHNlO05BVi5hbWFwQ2JzPVtdO3RyeXt0b2FzdCgi5Zyw5Zu+57uE5Lu25Yqg6L295aSx6LSl77yM6K+35qOA5p+l572R57ucIiwiZXJyIil9Y2F0Y2goZSl7fX07CiAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzKTsKfQpmdW5jdGlvbiBuYXZJbml0QU1hcCgpewogIGlmKE5BVi5hbWFwTG9hZGVkKXJldHVybjsKICBpZih0eXBlb2YgQU1hcD09PSJ1bmRlZmluZWQiKXtuYXZMb2FkQU1hcChuYXZJbml0QU1hcCk7cmV0dXJufQogIC8vIFNESyDliqDovb3lrozmiJDml7boi6Xlt7LliIfotbDpobXpnaLvvIjlr7zoiKrlrrnlmajkuI3lrZjlnKjvvInvvIzkuIvmrKHov5vpobXpnaLlho3liJ3lp4vljJYKICBpZighZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdk1hcCIpKXJldHVybjsKICBOQVYuYW1hcExvYWRlZD10cnVlOwogIE5BVi5tYXA9bmV3IEFNYXAuTWFwKCJuYXZNYXAiLHt6b29tOjE0LG1hcFN0eWxlOiJhbWFwOi8vc3R5bGVzL2RhcmsifSk7CiAgQU1hcC5wbHVnaW4oWyJBTWFwLkF1dG9Db21wbGV0ZSIsIkFNYXAuRHJpdmluZyJdLGZ1bmN0aW9uKCl7CiAgICBOQVYuYXV0b0NvbXBsZXRlPW5ldyBBTWFwLkF1dG9Db21wbGV0ZSh7Y2l0eToi5YWo5Zu9In0pOwogICAgTkFWLmRyaXZpbmc9bmV3IEFNYXAuRHJpdmluZyh7cG9saWN5OkFNYXAuRHJpdmluZ1BvbGljeS5MRUFTVF9USU1FLG1hcDpOQVYubWFwLGhpZGVNYXJrZXJzOmZhbHNlfSk7CiAgfSk7Cn0KZnVuY3Rpb24gbmF2U2VhcmNoKGt3KXsKICBpZigha3d8fGt3Lmxlbmd0aDwyKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2UmVzdWx0cyIpLmlubmVySFRNTD0iIjtyZXR1cm59CiAgaWYoIU5BVi5hdXRvQ29tcGxldGUpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtuYXZTZWFyY2goa3cpfSw1MDApO3JldHVybn0KICBOQVYuYXV0b0NvbXBsZXRlLnNlYXJjaChrdyxmdW5jdGlvbihzdGF0dXMscmVzdWx0KXsKICAgIGlmKHN0YXR1cyE9PSJjb21wbGV0ZSJ8fCFyZXN1bHQudGlwcylyZXR1cm47CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2UmVzdWx0cyIpLmlubmVySFRNTD1yZXN1bHQudGlwcy5zbGljZSgwLDgpLm1hcChmdW5jdGlvbih0KXsKICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPSJuYXYtcmVzdWx0LWl0ZW0iIG9uY2xpY2s9Im5hdlBpY2tEZXN0KCcrdC5sb2NhdGlvbi5nZXRMbmcoKSsnLCcrdC5sb2NhdGlvbi5nZXRMYXQoKSsnLFwnJytlc2ModC5uYW1lKS5yZXBsYWNlKC8nL2csIlxcJyIpKydcJykiIHN0eWxlPSJwYWRkaW5nOjhweCAxMnB4O2N1cnNvcjpwb2ludGVyO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpIj48ZGl2IHN0eWxlPSJmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDA7Y29sb3I6dmFyKC0tdHh0KSI+Jytlc2ModC5uYW1lKSsnPC9kaXY+PGRpdiBzdHlsZT0iZm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrZXNjKHQuZGlzdHJpY3R8fCIiKSsnPC9kaXY+PC9kaXY+JzsKICAgIH0pLmpvaW4oIiIpOwogIH0pOwp9CmZ1bmN0aW9uIG5hdlBpY2tEZXN0KGxuZyxsYXQsbmFtZSl7CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdkRlc3RJbnB1dCIpLnZhbHVlPW5hbWU7CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlJlc3VsdHMiKS5pbm5lckhUTUw9IiI7CiAgaWYoIU5BVi5tYXApe25hdkluaXRBTWFwKCk7aWYoIU5BVi5tYXApe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtuYXZQaWNrRGVzdChsbmcsbGF0LG5hbWUpfSw1MDApO3JldHVybn19CiAgTkFWLm1hcC5zZXRDZW50ZXIoW2xuZyxsYXRdKTsKICBOQVYubWFwLnNldFpvb20oMTUpOwogIC8vIOinhOWIkui3r+e6v++8mui1t+eCuT3ovabovobkvY3nva7vvIznu4jngrk96YCJ5oup5Zyw54K5CiAgdmFyIHZlaD1TVEFURS5kYXRhJiZTVEFURS5kYXRhW1ZILmFjY0lkeF0mJlNUQVRFLmRhdGFbVkguYWNjSWR4XS52ZWhpY2xlOwogIHZhciBzdGFydExuZz12ZWgmJk51bWJlcih2ZWgubG9uZ2l0dWRlKTsKICB2YXIgc3RhcnRMYXQ9dmVoJiZOdW1iZXIodmVoLmxhdGl0dWRlKTsKICBpZighc3RhcnRMbmd8fCFzdGFydExhdCl7dG9hc3QoIui9pui+huaaguaXoEdQU+WdkOagh++8jOaXoOazleinhOWIkui3r+e6vyIsImVyciIpO3JldHVybn0KICBpZighTkFWLmRyaXZpbmcpe3RvYXN0KCLlnLDlm77lvJXmk47liqDovb3kuK3igKYiLCJpbmZvIik7c2V0VGltZW91dChmdW5jdGlvbigpe25hdlBpY2tEZXN0KGxuZyxsYXQsbmFtZSl9LDUwMCk7cmV0dXJufQogIE5BVi5kcml2aW5nLnNlYXJjaChbc3RhcnRMbmcsc3RhcnRMYXRdLFtsbmcsbGF0XSxmdW5jdGlvbihzdGF0dXMscmVzdWx0KXsKICAgIGlmKHN0YXR1cyE9PSJjb21wbGV0ZSJ8fCFyZXN1bHQucm91dGVzfHwhcmVzdWx0LnJvdXRlcy5sZW5ndGgpe3RvYXN0KCLot6/nur/op4TliJLlpLHotKUiLCJlcnIiKTtyZXR1cm59CiAgICBOQVYucm91dGU9cmVzdWx0LnJvdXRlc1swXTsKICAgIE5BVi5uYXZTdGVwcz1OQVYucm91dGUuc3RlcHN8fFtdOwogICAgTkFWLmN1clN0ZXA9MDsKICAgIHZhciBpbmZvPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZSb3V0ZUluZm8iKTsKICAgIGluZm8uc3R5bGUuZGlzcGxheT0iYmxvY2siOwogICAgaW5mby5pbm5lckhUTUw9JzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzo4cHggMTJweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXItcmFkaXVzOjEwcHgiPjxkaXY+PGRpdiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCkiPicrKE5BVi5yb3V0ZS5kaXN0YW5jZS8xMDAwKS50b0ZpeGVkKDEpKycga20gwrcgJytNYXRoLmNlaWwoTkFWLnJvdXRlLnRpbWUvNjApKycg5YiG6ZKfPC9kaXY+PGRpdiBzdHlsZT0iZm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrTkFWLm5hdlN0ZXBzLmxlbmd0aCsnIOatpSDCtyAnK2VzYyhuYW1lKSsnPC9kaXY+PC9kaXY+PC9kaXY+JzsKICAgIHZhciBjYXN0QnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZDYXN0QnRuIik7Y2FzdEJ0bi5kaXNhYmxlZD1mYWxzZTtjYXN0QnRuLnN0eWxlLm9wYWNpdHk9MTsKICB9KTsKfQpmdW5jdGlvbiBuYXZUb2dnbGVDb25uKCl7CiAgdmFyIGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q29ubkJ0biIpOwogIGlmKHR5cGVvZiBtb3RvcGxheUhhbmRsZXIhPT0iZnVuY3Rpb24iKXt0b2FzdCgi5LuF5pSv5oyBIGlPUyBBcHAg5YaF5L2/55SoIiwiZXJyIik7cmV0dXJufQogIGJ0bi50ZXh0Q29udGVudD0i6L+e5o6l5Lit4oCmIjtidG4uZGlzYWJsZWQ9dHJ1ZTsKICBtb3RvcGxheUhhbmRsZXIoImlzQ29ubmVjdGVkIiwiIixmdW5jdGlvbihvayl7CiAgICBpZihvayl7dG9hc3QoIui9puacuuW3sui/nuaOpSIsIm9rIik7YnRuLnRleHRDb250ZW50PSLlt7Lov57mjqUiO2J0bi5kaXNhYmxlZD10cnVlO3JldHVybn0KICAgIG1vdG9wbGF5SGFuZGxlcigiY29ubmVjdCIsIiIsZnVuY3Rpb24oc3VjYyl7CiAgICAgIGlmKHN1Y2Mpe3RvYXN0KCLovabmnLrov57mjqXmiJDlip8iLCJvayIpO2J0bi50ZXh0Q29udGVudD0i5bey6L+e5o6lIjtidG4uZGlzYWJsZWQ9ZmFsc2V9CiAgICAgIGVsc2V7dG9hc3QoIui/nuaOpeWksei0pe+8jOivt+ehruiupOW3sui/nuaOpei9puacuiBXaUZp77yIMTkyLjE2OC4wLjHvvIkiLCJlcnIiKTtidG4udGV4dENvbnRlbnQ9Iui/nuaOpei9puacuiI7YnRuLmRpc2FibGVkPWZhbHNlfQogICAgfSk7CiAgfSk7Cn0KZnVuY3Rpb24gbmF2U3RhcnRDYXN0KCl7CiAgaWYoIU5BVi5yb3V0ZSl7dG9hc3QoIuivt+WFiOinhOWIkui3r+e6vyIsImVyciIpO3JldHVybn0KICBpZih0eXBlb2YgbW90b3BsYXlIYW5kbGVyIT09ImZ1bmN0aW9uIil7dG9hc3QoIuS7heaUr+aMgSBpT1MgQXBwIOWGheS9v+eUqCIsImVyciIpO3JldHVybn0KICBtb3RvcGxheUhhbmRsZXIoImlzQ29ubmVjdGVkIiwiIixmdW5jdGlvbihvayl7CiAgICBpZighb2spe3RvYXN0KCLor7flhYjov57mjqXovabmnLoiLCJlcnIiKTtuYXZUb2dnbGVDb25uKCk7cmV0dXJufQogICAgdmFyIHJvdXRlRGF0YT17ZGlzdGFuY2U6TkFWLnJvdXRlLmRpc3RhbmNlLHRpbWU6TkFWLnJvdXRlLnRpbWUsc3RlcHM6TkFWLm5hdlN0ZXBzLm1hcChmdW5jdGlvbihzKXtyZXR1cm57aW5zdHJ1Y3Rpb246cy5pbnN0cnVjdGlvbixyb2FkOnMucm9hZHx8IiIsZGlzdGFuY2U6cy5kaXN0YW5jZSxhY3Rpb246cy5hY3Rpb258fCIiLHBvbHlsaW5lOnMucG9seWxpbmUmJnMucG9seWxpbmUucGF0aHM/dW5kZWZpbmVkOnMucG9seWxpbmV9fSl9OwogICAgbW90b3BsYXlIYW5kbGVyKCJzZW5kTmF2RGF0YSIsIlNUQVJUX05BVklHQVRJT058IitKU09OLnN0cmluZ2lmeShyb3V0ZURhdGEpLGZ1bmN0aW9uKHN1Y2MpewogICAgICBpZihzdWNjKXsKICAgICAgICB0b2FzdCgi5oqV5bGP5bey5ZCv5YqoIiwib2siKTtOQVYuY2FzdGluZz10cnVlOwogICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZDYXN0QnRuIikuc3R5bGUub3BhY2l0eT0uNTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q2FzdEJ0biIpLmRpc2FibGVkPXRydWU7CiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlN0b3BCdG4iKS5zdHlsZS5vcGFjaXR5PTE7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlN0b3BCdG4iKS5kaXNhYmxlZD1mYWxzZTsKICAgICAgICAvLyDlvIDlp4vkvY3nva7ov73ouKrvvIzmjqjpgIHlrp7ml7bmjIfku6QKICAgICAgICBpZihuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pe05BVi53YXRjaElkPW5hdmlnYXRvci5nZW9sb2NhdGlvbi53YXRjaFBvc2l0aW9uKG5hdk9uUG9zQ2hhbmdlLG5hdk9uUG9zRXJyLHtlbmFibGVIaWdoQWNjdXJhY3k6dHJ1ZSxtYXhpbXVtQWdlOjMwMDAsdGltZW91dDoxMDAwMH0pfQogICAgICB9ZWxzZXt0b2FzdCgi5oqV5bGP5aSx6LSlIiwiZXJyIil9CiAgICB9KTsKICB9KTsKfQpmdW5jdGlvbiBuYXZPblBvc0NoYW5nZShwb3MpewogIGlmKCFOQVYuY2FzdGluZylyZXR1cm47CiAgdmFyIGxhdD1wb3MuY29vcmRzLmxhdGl0dWRlLGxuZz1wb3MuY29vcmRzLmxvbmdpdHVkZTsKICAvLyDmjqjpgIHpgJ/luqbmm7TmlrAKICB2YXIgc3BkPXBvcy5jb29yZHMuc3BlZWQhPW51bGw/cG9zLmNvb3Jkcy5zcGVlZDowOwogIG1vdG9wbGF5SGFuZGxlcigic2VuZE5hdkRhdGEiLCJTUEVFRHx7XCJzcGVlZFwiOiIrc3BkLnRvRml4ZWQoMSkrIn0iLGZ1bmN0aW9uKCl7fSk7CiAgLy8g6K6h566X5b2T5YmN6Lev5q6177yI566A5YyW54mI77ya5oyJ6Led56a75Yy56YWN77yJCiAgdmFyIG1pbkRpc3Q9MWU5LG5ld1N0ZXA9TkFWLmN1clN0ZXA7CiAgZm9yKHZhciBpPU5BVi5jdXJTdGVwO2k8TWF0aC5taW4oTkFWLmN1clN0ZXArMyxOQVYubmF2U3RlcHMubGVuZ3RoKTtpKyspewogICAgdmFyIHM9TkFWLm5hdlN0ZXBzW2ldOwogICAgaWYoIXMuc3RhcnRfbG9jYXRpb24pY29udGludWU7CiAgICB2YXIgZD1NYXRoLmh5cG90KHMuc3RhcnRfbG9jYXRpb24ubGF0LWxhdCxzLnN0YXJ0X2xvY2F0aW9uLmxuZy1sbmcpOwogICAgaWYoZDxtaW5EaXN0KXttaW5EaXN0PWQ7bmV3U3RlcD1pfQogIH0KICBpZihuZXdTdGVwIT09TkFWLmN1clN0ZXApewogICAgTkFWLmN1clN0ZXA9bmV3U3RlcDsKICAgIHZhciBzdGVwPU5BVi5uYXZTdGVwc1tOQVYuY3VyU3RlcF07CiAgICBpZihzdGVwKXsKICAgICAgdmFyIHN0ZXBEYXRhPXtzdGVwSW5kZXg6TkFWLmN1clN0ZXAsaW5zdHJ1Y3Rpb246c3RlcC5pbnN0cnVjdGlvbnx8IiIscm9hZDpzdGVwLnJvYWR8fCIiLGRpc3RhbmNlOnN0ZXAuZGlzdGFuY2V8fDAsYWN0aW9uOnN0ZXAuYWN0aW9ufHwiIn07CiAgICAgIG1vdG9wbGF5SGFuZGxlcigic2VuZE5hdkRhdGEiLCJNT1ZFX01BUHwiK0pTT04uc3RyaW5naWZ5KHtsYXQ6bGF0LGxuZzpsbmcsc3RlcEluZGV4Ok5BVi5jdXJTdGVwLGluc3RydWN0aW9uOnN0ZXBEYXRhLmluc3RydWN0aW9ufSksZnVuY3Rpb24oKXt9KTsKICAgIH0KICB9Cn0KZnVuY3Rpb24gbmF2T25Qb3NFcnIoZSl7aWYoTkFWLmNhc3RpbmcpdG9hc3QoIkdQU+WumuS9jeW8guW4uDogIisoZS5tZXNzYWdlfHwiIiksImVyciIpfQpmdW5jdGlvbiBuYXZTdG9wQ2FzdCgpewogIGlmKHR5cGVvZiBtb3RvcGxheUhhbmRsZXI9PT0iZnVuY3Rpb24iKXsKICAgIG1vdG9wbGF5SGFuZGxlcigic2VuZE5hdkRhdGEiLCJTVE9QX05BVklHQVRJT058e30iLGZ1bmN0aW9uKCl7fSk7CiAgfQogIGlmKE5BVi53YXRjaElkKXtuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uY2xlYXJXYXRjaChOQVYud2F0Y2hJZCk7TkFWLndhdGNoSWQ9bnVsbH0KICBOQVYuY2FzdGluZz1mYWxzZTsKICB0b2FzdCgi5oqV5bGP5bey57uT5p2fIiwiaW5mbyIpOwogIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZDYXN0QnRuIikuc3R5bGUub3BhY2l0eT0xO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZDYXN0QnRuIikuZGlzYWJsZWQ9ZmFsc2U7CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlN0b3BCdG4iKS5zdHlsZS5vcGFjaXR5PS41O2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZTdG9wQnRuIikuZGlzYWJsZWQ9dHJ1ZTsKfQovLyDovabovobpobXliqDovb3ml7bliJ3lp4vljJbpq5jlvrflnLDlm74KZnVuY3Rpb24gbmF2SW5pdE9uVGFiKCl7c2V0VGltZW91dChmdW5jdGlvbigpe2lmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZNYXAiKSYmIU5BVi5tYXApe25hdkluaXRBTWFwKCl9fSwzMDApfQoKYXN5bmMgZnVuY3Rpb24gZXh0U2V0KGFjdGlvbil7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uc3QgYm9keT17YWN0aW9uOmFjdGlvbix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn07CiAgaWYoYWN0aW9uPT09ImNoYXJnZVBvd2VyIil7aWYoIVZILmNwKXt0b2FzdCgi6K+35YWI6YCJ5oup5YWF55S15Yqf546HIiwiZXJyIik7cmV0dXJufWJvZHkudmFsdWU9VkguY3B9CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoYm9keSk7CiAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKfQoKZnVuY3Rpb24gaW5pdCgpewogIGFwcGx5VGhlbWUoKTthcHBseUN1c3RvbUJnKCk7bW91bnRTaWduaW5GYWIoKTsKICByZW5kZXJDZmcoKTsKICBpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXsKICAgIFNUQVRFLmRhdGE9REVNT19EQVRBO1NUQVRFLnRzVGV4dD1mbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9ZmFsc2U7CiAgICByZW5kZXJIb21lKCk7aGlkZVNwbGFzaCgpO3JldHVybjsKICB9CiAgc3RhcnRBdXRvUmVmcmVzaCgpO3JlZnJlc2hBbGwoZmFsc2UpOwogIC8vIOWFnOW6le+8muaegeerr+aDheWGteS4i+ivt+axgumVv+aXtumXtOaXoOWTjeW6lO+8jOmXquWxj+S5n+S4jeiDveS4gOebtOaMoeS9j+eVjOmdogogIHNldFRpbWVvdXQoaGlkZVNwbGFzaCwxMjAwMCk7Cn0KaW5pdCgpOwo8L3NjcmlwdD4KPCEtLV9fSlM1X18tLT4K";
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
    const headers = {
      "Authorization": "Bearer " + cleanToken(acc.token),
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      ...getSign("app", { vinNo: vin }, '', cfg)
    };
    if (acc.userId) headers["user_id"] = String(acc.userId);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicles/properties/snapshots?vinNo=" + encodeURIComponent(vin), headers);
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
            const rideRes = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?vinNo=${encodeURIComponent(vinNo)}`, { ...baseHeaders, ...signH });
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
            const signH = getSign("app", {}, '', cfg);
            const res = await httpGet(url, { ...baseHeaders, ...signH });
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
        httpGet(T + "/integral/detail?page=" + page + "&pageSize=" + pageSize, accHeaders(acc, getSign("app", { page: page, pageSize: pageSize }, '', cfg))),
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
      const H = "https://h5.zeehoev.com/cfmotoservermine/signInSupplement";
      let res = null;
      if (action === "count") {
        // 2026-09-27: 官方已将 /count 改为 POST（GET 返回 40000），body 传空 {}
        res = await httpPost(H + "/count", accHeaders(acc, getSign("h5", {}, '', cfg)), {});
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
        res = await httpGet("https://h5.zeehoev.com/cfmotoservermine/signin/info?month=" + encodeURIComponent(month), accHeaders(acc, getSign("h5", { month: month }, '', cfg)));
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
        okMsg = "充电功率已设为 " + val + "W";
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
      const hd = (p) => accHeaders(acc, getSign("app", p, '', cfg));
      let vin = String(_u.searchParams.get("vin") || "").trim();
      const out = { ok: true };
      const tasks = [
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/app/Message/allUnRead", hd({})).then(r => { out.unread = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mall/cfmotoservermall/app/coupon/myCoupons?page=1&pageSize=10", hd({ page: 1, pageSize: 10 })).then(r => { out.coupons = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/activityPrizeRecord/app/page?page=1&pageSize=10", hd({ page: 1, pageSize: 10 })).then(r => { out.prizeRecords = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/riderank", hd({})).then(r => { out.riderank = r && r.code == "10000" ? r.data : null; })
      ];
      if (!vin) {
        try { const list = await fetchVehicleList(acc, cfg) || []; if (list.length) vin = list[0].vinNo; } catch(e) {}
      }
      if (vin) {
        tasks.push(httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ota/list?vinNo=" + encodeURIComponent(vin), hd({ vinNo: vin })).then(r => { out.ota = r && r.code == "10000" ? r.data : null; }));
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