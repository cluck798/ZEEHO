/*
#!name=极核 ZEEHO 签到面板 V2.15.6
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.15.6

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.15.6, requires-body=true, timeout=60, tag=极核面板V2.15.6

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
// 版本: v2.15.6
// 更新日期: 2026-10-10
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.15.6";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-10-10 v2.15.6 H5 通道密钥/接口迁移：appId=AiTXmBrm + 签到/盲盒/补签迁到 /H5/ 前缀（修复 30125 permit error）；新增软件版本检测（/api/version-check + 设置页「版本/更新检测」）；v2.15.5 面板首屏提速；v2.15.4 删除导航投屏（Motoplay）)`);

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
      const infoRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
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

    // 2. 查询连签和盲盒
    try {
      const infoRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
      const list = infoRes?.data?.nowSignDetailVos || [];
      const todayIdx = list.findIndex(x => x.createDate === today);
      let cont = 0;
      // 盲盒开启日(st=0)是连签周期边界：今日是盲盒日计入1天；往前的盲盒日说明官方连签已重置，停止计数
      for (let i = todayIdx; i >= 0; i--) { const st = list[i]?.signStatue; if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break; }
      result.continueDays = cont;
      const signCount = Number(infoRes?.data?.signCount) || 0;
      if (signCount >= 30) {
        const blindRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/supplementPrize?supplementDate=${today}`, { ...baseHeaders, ...getSign("h5", { supplementDate: today }, '', cfg) });
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXNocmluazowO292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4yOCl9Ci5icmFuZC1tYXJrIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7b2JqZWN0LWZpdDpjb3Zlcn0KLmJyYW5kLXR4dHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5icmFuZC10eHQgaDF7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4ycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYnJhbmQtdHh0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHh9CgouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIGltZytzdmd7ZGlzcGxheTpub25lfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0g5YWl5Zy66Zeq5bGP77ya6aaW5bin5Y2z5pi+56S677yM5pWw5o2u5bCx57uq5ZCO5reh5Ye6ID09PT09PT09PT09PSAqLwojc3BsYXNoe3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDo5OTk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudCgxMjAlIDYwJSBhdCA1MCUgMCUscmdiYSgxNCwxNDMsMTc4LC4xNiksdHJhbnNwYXJlbnQgNjAlKSx2YXIoLS1iZyk7dHJhbnNpdGlvbjpvcGFjaXR5IC40cyB2YXIoLS1lYXNlKSx0cmFuc2Zvcm0gLjRzIHZhcigtLWVhc2UpfQojc3BsYXNoLm91dHtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKDEuMDQpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5zcC1tYXJre3dpZHRoOjg0cHg7aGVpZ2h0Ojg0cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JveC1zaGFkb3c6MCAxNHB4IDQwcHggcmdiYSgxNCwxNDMsMTc4LC40KTthbmltYXRpb246c3AtaW4gLjVzIHZhcigtLXNwcmluZykgYm90aH0KLnNwLW1hcmsgc3Zne3dpZHRoOjQ2cHg7aGVpZ2h0OjQ2cHh9Ci5zcC10aXRsZXttYXJnaW4tdG9wOjIwcHg7Zm9udC1zaXplOjIxcHg7Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOjFweDthbmltYXRpb246c3AtdXAgLjRzIC4wNXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLXN1YnttYXJnaW4tdG9wOjdweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQzKTtsZXR0ZXItc3BhY2luZzozcHg7YW5pbWF0aW9uOnNwLXVwIC40cyAuMXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWR7bWFyZ2luLXRvcDozNHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTthbmltYXRpb246c3AtdXAgLjRzIC4xNXMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWQgLnNwaW5uZXJ7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItdG9wLWNvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItcmFkaXVzOjUwJTthbmltYXRpb246c3BpbiAuN3MgbGluZWFyIGluZmluaXRlfQpAa2V5ZnJhbWVzIHNwLWlue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSguNikgdHJhbnNsYXRlWSgxMHB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnNjYWxlKDEpIHRyYW5zbGF0ZVkoMCl9fQpAa2V5ZnJhbWVzIHNwLXVwe2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEycHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKX19Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+CjxkaXYgY2xhc3M9ImJnLWdsb3ciPjwvZGl2Pgo8ZGl2IGlkPSJzcGxhc2giPgogIDxkaXYgY2xhc3M9InNwLW1hcmsiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNNCAxMy41QzQgOS4wOCA3LjU4IDUuNSAxMiA1LjVzOCAzLjU4IDggOCIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTEyIDEzbDcuNSA1LjUiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjcuNSIgY3k9IjE2LjUiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjxjaXJjbGUgY3g9IjE3IiBjeT0iMTkiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjwvc3ZnPjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLXRpdGxlIj7mnoHmoLggWkVFSE88L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC1zdWIiPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3AtbG9hZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiPjwvc3Bhbj7mraPlnKjliqDovb3mlbDmja7igKY8L2Rpdj4KPC9kaXY+CjxkaXYgaWQ9ImFwcCI+CiAgPGhlYWRlciBjbGFzcz0iYXBwLWhlYWRlciI+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC1tYXJrIj48aW1nIHNyYz0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFKQUFBQUNRQ0FZQUFBRG5SdUs0QUFBQUFYTlNSMElBcnM0YzZRQUFBRkJsV0VsbVRVMEFLZ0FBQUFnQUFnRVNBQU1BQUFBQkFBRUFBSWRwQUFRQUFBQUJBQUFBSmdBQUFBQUFBNkFCQUFNQUFBQUJBQUVBQUtBQ0FBUUFBQUFCQUFBQWtLQURBQVFBQUFBQkFBQUFrQUFBQUFBdDRpU1dBQUFCV1dsVVdIUllUVXc2WTI5dExtRmtiMkpsTG5odGNBQUFBQUFBUEhnNmVHMXdiV1YwWVNCNGJXeHVjenA0UFNKaFpHOWlaVHB1Y3pwdFpYUmhMeUlnZURwNGJYQjBhejBpV0UxUUlFTnZjbVVnTmk0d0xqQWlQZ29nSUNBOGNtUm1PbEpFUmlCNGJXeHVjenB5WkdZOUltaDBkSEE2THk5M2QzY3Vkek11YjNKbkx6RTVPVGt2TURJdk1qSXRjbVJtTFhONWJuUmhlQzF1Y3lNaVBnb2dJQ0FnSUNBOGNtUm1Pa1JsYzJOeWFYQjBhVzl1SUhKa1pqcGhZbTkxZEQwaUlnb2dJQ0FnSUNBZ0lDQWdJQ0I0Yld4dWN6cDBhV1ptUFNKb2RIUndPaTh2Ym5NdVlXUnZZbVV1WTI5dEwzUnBabVl2TVM0d0x5SStDaUFnSUNBZ0lDQWdJRHgwYVdabU9rOXlhV1Z1ZEdGMGFXOXVQakU4TDNScFptWTZUM0pwWlc1MFlYUnBiMjQrQ2lBZ0lDQWdJRHd2Y21SbU9rUmxjMk55YVhCMGFXOXVQZ29nSUNBOEwzSmtaanBTUkVZK0Nqd3ZlRHA0YlhCdFpYUmhQZ29aWHVFSEFBQU5DRWxFUVZSNEFlMWRXMHdWU1JvdVJJS2lZa2hFb21Jd2l6aFI0bzFWSnpxclVYZ3dXVFhlMEtoeEpFWmR2Q1dqa015cmlZOUd4bHMwRVYrY2pNWWIzalBSbHhHZEhSUGQwWWs4N0VaV1VOZFJFMFJGRVJGRVlQK3Y3VDZlYzdyT3BmdDB3Nm5ULzUvODlPbTZkZFZYWDZxcXUvNzZTUkk5Sk4zZDNmM29VYm1rbzBsSGtXYnBta25YZE5LQnBJTkkwMGhUU1ZOMFRhWXJ0QTlwa3AvU3o0U1RibXFSb1YzMHUxUFhEcnBDMjBsYlNkK1J0cEEya3phU051ajZtSzUxcFBWSlNVbHRkSFZkMENHdUNCRm1IQlZjUkRwVjE2L282dHJ6cUd5V0x3aUFoTFdrdit2NkN4SHFQMStpbmZ2bGFJY1NhUXFvYXY4Z25VZWE3VncxdVNRSEVIaEtaZnhNV2tsaytzT0I4clFpWWlZUWtRWmxGSk4rUi9xTlZpci9pWGNFYmxJRjk1RldFWmt3V3RtV21BaEU1UGtiUGZrSFVreFRMT29oZ0NtdWpFajBtOTJxMnlJUUVTZURIbmlRZEtYZEIzTyt1RUxnQk5WbUN4R3B5V3F0TEJPSXlET0xIbktNZEtUVmgzSDZ1RWJnVDZyZGFpTFJyMVpxaVZmanFJWElVMDZKcTBtWlBGR2pwa3hDOUdtMTNzZFJWenFxRVlnS1Jib0swdTFSbDh3SlZVWmdEMVcrUEpvRmRrUUM2ZVQ1a1FyOFZtVkV1TzZXRWZpSmNwUkVJbEUwVXhoR0hpYVBaZnlWejRBK1I5K0hsYkFFMHVkRG5yYkNRcGpRa2RzanJZbENUbUdVRVc5YldEQ0hKVmxDdzhlTkF3TFlrNXNUNnUxTVNpQWlENzd6MUpCaVpjN0NDT0FWZnlLUnlQU2RLTlRvZ28rRVRCNG1qb0VBdUFCT21NUTBBdEhvZysySmY1cFNjZ0FqSU1STUdvVUN0ajBDQ0VUa3dmMXRVdDdiWXJySUVNRGUyZGRFSXQ4R2JQQVVobDExSm84TU9nNERBdUFHT09LVFlBTEJKSU9GRVFpSFFBQkhmRk1ZVFY4d0Jyc2JMaWZITVFJNkFuK2xhVXd6U3ZNZmdVb1pIa1lnU2dSZ2RhcUovd2lFZDMwMlE5V0I0VXRZQko3U0NLUjk1dEZHSUpxKzhwazhZUUhqeUVBRXNva3pPRFRoMjZZb0RJem5PMFlnSWdKRlNHR3NnYVpGVE00SkdJRkFCRFRPR0FUaWJ6K0I0UEJkWkFRMHppVFJYSVlUb3pqdDZGdFFSODdMS1JnQjdRUnRHa2FnWEZJbUR6UENLZ0xnVEM0SWxHYzFKNmRuQkhRRThrQ2dISWFERWJDSlFBNElCQzhaTEl5QUhRU3ltRUIyWU9NOEJnSWFnVEtOTzc0eUFoWVJ5TVFJQk9kT0xJeUFIUVRTUVNCNEJtTmhCT3dnTUJBRUdtUW5KK2RoQk1BZEVBZytDVmtZQVRzSWFGK2k0ZENTaFJHd2cwQXFSaUI0UTJWaEJPd2drTUlFc2dNYjV6RVEwQWlVYk56eGxSR3dpRUF5UmlBbWtFWFVPTGtQQVkxQUlCRUxJMkFIZ1Q0Z0Q5c0MyWUdPOHdDQkpDWVFFeUVXQkpMNmdrV3hsQkFwYjFWVmxXaG93UDhDWVFFQ25aMmRZdG15WldMWXNHRlNRTzdldlN0dTNib2xqYk1hT0hyMGFERjM3bHlyMmF5a1R4SmtFKzJxVEpnd0FaNGNXSFVNU2t0THUxdGJXNldZRTNHNk16TXpIY05xNGNLRjB1YzRHWWdSeUZYcDM3Ky9xK1dyVkRpUlJ4dzZkRWowMFphZWdUV3ZxYWtSUzVjdUZZMk5qWUVSTWR5bHBycS95Y0J2WURGMGtKV3NhOWFzRVFjT0hKQ1NwN2EyVml4ZXZGZzhlL2JNU3BGeGtaWUoxQVBkVUZ4Y0xBNGZQaXhTVXN5N1JvOGVQUktMRmkwU3VLb29UQ0NYZTIzZXZIbmk2Tkdqb2w4L0hMOExGSXc0UzVZc0VmZnYzdytNVU9pT0NlUmlaODJaTTBjY1AzNWNEQmd3d1BRVXJIVXdNdDI3ZDg4VXAxSUFFOGlsM3BvK2ZibzRmZnEwR0R4NHNPa0piOTY4RWN1WEwzZnNkZDMwZ0I0TVlBSzVBUGJreVpNRnZuOE5HVExFVkhwTFM0dFl0V3FWdUg3OXVpbE94UUFta01POU5uYnNXSEh1M0RreGZQaHdVOGx0YlcyaXBLUkVYTGx5eFJTbmFnQVR5TUdleTgzTkZSY3VYQkNqUm8weWxkclIwU0UyYk5pZ2tjc1VxWEFBRThpaHpzdk96aGJuejU4WFk4YU1NWlhZMWRVbHRtN2RLbzRkd3o5NlRDeGhBam5RbjBPSERoVm56NTRWNDhlUGw1WldYbDR1S2lzcnBYR3FCektCWXV6QmpJd01jZWJNR1RGdG10bkoyOGVQSDBWWldabll1M2R2akUrSjMreXU3NFU1MGZUMDlIUXhlL1pzUVo1Qm5Tak9zVEt3cDdWNTgyWXhheGIrTTVaWjd0eTVJK3JxNmdSdGFwb2p3NFMwdDdlTGE5ZXVDUkF3M2tVSkF1WGs1SWlMRnkvR081YW0rczJZTVVOY3VuVEpGQjRwQU4rSjh2THl4TXVYTHlNbDdmVjRKYVl3TWo4UWVJdnhpbUFFUXB0VkVDVUlwQUtRWHEyak1nUktUdmJPNFJHWnZWQzhFbFNKTlJETVFGKzhlQ0UxaCtnSllER2Q0RnNPV1F1R1hNZzNOemM3TnMyK2V2VkttU2xNQ1FJOWVQQkFrR2xzeU01emswUUdlWGJzMktGOURKUTlDL3RhNjlhdEU5am5ja0pBVml5a1ZSQWxDUFRwMHlkSFRUMnRkc3kyYmR2RWxpMWJwQVNHQVR4MjFwMDBSYlZhdjk1TXI4d2FxTGRBMnJScGs2aW9xSkNhb3NLV3gyazc1dDVxcDkzbk1vSENJSWVkOC8zNzkwdkpBeXRDV0JNK2YvNDhUQW1KSDhVRUN0SEhPTHNGTythK2ZjMnovTU9IRDVXMll3N1JaRnZCVENBSmJQUG56OWZzbUdYSFlndzdacHlrWVBueTc1NFlDeDJCb3FJaXpld2lMYzNzK1ErZkVyRG13Umt1bHM4SThBamt4d1RzWFowOGVWSnF4OXpVMUtTOWJkMitmZHN2Qi85a0F1a2NLQ2dvaUdqSGZPUEdEV1pNRUFKTUlBSWtQejlmTXpXVk9UeUFIVE5PbFY2OWVqVUlPcjRGQXA0bkVEeFl3QlFWSmlQQkFndUE5ZXZYYS9IQmNYei9HUUZQRTJqa3lKSGF5QVBibTJEQmRnSytQdU5nSUV0b0JEeExvS3lzTEkwOE1qdG1rQWZiRjBlT0hBbU5ITWRvQ0ppL2tzVWhNREJsbFgzUXMxdFZIUGpEcWRFcFU2YVlpc0RPLzg2ZE84WEJnd2Q3YmZjZmxWTEZnRTRKQW1HZGdsTVBUcEFJdStzNGJqeGl4QWdUZVl3QWJJNnVXTEhDdU8zeEs4dzVGaXhZb01TT3ZCSUVnbWNMMlZUalJzL0NjQTF2WmIwcHIxKy9GcW9ZMENteEJzS29vY3FRN2dUeFZHcXJFZ1J5b2xPNERIY1FVSUpBc0JHV2VmZHlCNUxlTHhYN2NQRjJCaTRVS2txc2dXQnpnOWRxSytzQ3d4UVZaOUt4Q0pkSmRYVzF1SHo1Y3R4MTF2djM3d1ZVQlZHQ1FEaGd0Mi9mUHN0NDRsZ3hQaGJLQkhiTWNHejU5dTFiV1RTSFJZbUFFZ1NLc2kwQnllRFFZUGZ1M1FGaHhvMWh4OHprTVJDeGYxVmlEV1MxZVJzM2JoUzdkdTJTWm9NZE0zd1RldFVJWGdwS0RJRUpSeURZTVlmeXgyellNYXZvanptR1BuWTFhMElSeVBESExQdGlEVC9NV1BPbzZvL1pWUmJFVUhqQ0VNand4eHpLamhua1Vka2Zjd3g5N0dyV2hDQlFZV0ZoV0gvTWJNZnNIb2VVSnhEOE1aODZkVXBxeDJ6NFkyWTdaaWFRRkFINFk4WXVmU2gvekN0WHJrd1lmOHhTQU9JZ1VOa1JhTnk0Y1dIdG1QRTJ4bmJNN2pOTVNRTEJIelBzbUwza2o5bDlLdGg3Z25JRWdqOW1lSUwzbWo5bWU5M3JmaTdYQ2ZUaHd3ZkhXZ0YvekNBUGZBVUZDNTZETDlDSjZvODV1TDNSM01QWG90dmkrbDdZMnJWcnhaTW5UeHhwQnh3ZVRKMDZWVnBXZlgyOXdML1h4SzY5S3FZUTBvWTRHRGhwMGlRSFM1TVhsVVJtRDEwVUZWOE9tT1YxNWRENFE2QWJVNWdhL21UakR6eXVFWEdIQ2NRMGlBVUJqVUNZd2xnWUFUc0lkR0VFNnJTVGsvTXdBdUFPRTRoNUVBc0NHb0c4ODA4b1lvR0s4OG9RNk1BSXhBU1NRY05oMFNDZ0Vjajl6NVhSVklYVHFJaEFPMGFnVmhWcnpuV09Dd1JhUWFCM2NWRVZyb1NLQ0x3RGdaejVEeUVxTnAvckhDc0NMU0JRYzZ5bGNIN1BJdEFNQWpWNnR2bmM4RmdSYUFTQkdtSXRoZk43Rm9FR0pwQm4rOTZSaG1zRWV1eElVVnlJRnhGNGpCR296b3N0NXpZN2drQWRMQkw3VVZING1NaFdpWTVnNnBsQ1lJaVkxb2ZzaDl2b3gzODkwMnh1cUZNSTFJSTdtTUlndjMrKzhGOUdJR29FTk00WUJQcFgxTms0SVNQd0dZRUFBdjNDcURBQ0ZoSFFPT05iT05OaStrOHFJTnRpSVp6Y213ZzhwZldQNXIzVW1NSUF3OC9leElKYmJRTUJIMWY4Q1ZScG95RE80azBFZkZ6eEVZaUdwRDhJaTV2ZXhJTmJiUUdCbXpwWHRDdytBdWtGV1BmbWJlSEpuRFFoRUFqZ2lHOFJqYWJSUWhyMytML1djZzhHU01UaVpRVHc2djQxalVDKzQvQUJJNUFlVWVabGhManRZUkVvOHljUFVnWVFDQUdVNERlNm5NQnZGa2JBRDRFVE9qZjhna0pzb05KVWxrR3Bha2kxZC8yQUhIempSUVR3alhBaUVhZ3B1UEdtRVFnSjlJU3I2U2M3WGdoR3pIdjM0TUJxR1hrQWhaUkFpS0FNdjlMbGUveG04VFFDMyt0Y2tJSVE4QlltUzBIVDJROFV2bDBXeDJFSmo4QWVJay9ZbDZwb0NJUTBQNUorbS9Cd2NRUDlFZmlKYmtxSVFMNVhkdjlJNDNmSUtjeElvQmRRUXZkN2pEQytKandDNk91STVBRUtFVWNnZjZob09pdW5lL3dudDRqRTg4L0h2NVZCQUF0bXJIa3FvcTJ4SlFLaFVDTFJMTG9jSStWWGZBQ1NPSUpYZGJ4dDRlVXBhckU4a3VnUG1FaFA0SStOVWNNYzl3blJsL2pPWTRrOGFKVmxBaUVUUGFpSmRCWDluRW5LOXRRQVJVMUIzODFFWDZKUDdUVEI4aFFXL0JDYTBsQkdNZWwzcE44RXgvTjlYQ0lBc3gzc3FsY1JjY0srWlVXcWZjd0U4bjhBa2FtQTdrdEovMDdLNXJIKzRQVCs3NmRVQlZnU1ZoSnBZUHZsaURoS0lQOGFFWm55NmI2UWRCb3B6RVBHa0xyMlBDcWI1UXNDR0ZWdzFnOVRGRTdjWENQUy9KdXVqa3VQZFNnUnFqL1YvaStrZWFRNXBGbTZadEkxblhRZzZTRFNOTkpVMGhSZGsra0t4WG9OOVRXVWZpYWNvT01OeFN0MXA2NXdoQXFGUDB1Y0lvWlhPVGdHZzIrblJsSjRXSUgrai9RQmFUMFJCZ2RHWFpmL0E3WTFkLzVJSlpkZEFBQUFBRWxGVGtTdVFtQ0MiIGFsdD0iWkVFSE8iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnJhbmQtdHh0Ij4KICAgICAgPGgxPuaegeaguCBaRUVITzwvaDE+CiAgICAgIDxwPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9wPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJoZWFkLWFjdGlvbnMiPgogICAgICA8ZGl2IGNsYXNzPSJjb3VudC1jaGlwIGhpZGRlbiIgaWQ9ImNvdW50Q2hpcCIgb25jbGljaz0idG9nZ2xlQXV0b1JlZnJlc2goKSI+CiAgICAgICAgPHNwYW4gY2xhc3M9ImNvdW50LXJpbmciPjxzdmcgdmlld0JveD0iMCAwIDE0IDE0Ij48Y2lyY2xlIGNsYXNzPSJ0cmFjayIgY3g9IjciIGN5PSI3IiByPSI1LjYiLz48Y2lyY2xlIGNsYXNzPSJhcmMiIGlkPSJjb3VudEFyYyIgY3g9IjciIGN5PSI3IiByPSI1LjYiIHN0cm9rZS1kYXNoYXJyYXk9IjM1LjIiIHN0cm9rZS1kYXNob2Zmc2V0PSIzNS4yIi8+PC9zdmc+PC9zcGFuPgogICAgICAgIDxzcGFuIGlkPSJjb3VudFR4dCI+NjBzPC9zcGFuPgogICAgICA8L2Rpdj4KICAgICAgCiAgICA8L2Rpdj4KICA8L2hlYWRlcj4KCiAgPG1haW4gaWQ9Im1haW4iPgogICAgPGRpdiBjbGFzcz0icHRyLXdyYXAiIGlkPSJwdHJXcmFwIj4KICAgICAgPGRpdiBjbGFzcz0icHRyLWluZGljYXRvciIgaWQ9InB0ckluZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiIGlkPSJwdHJTcGluIj48L3NwYW4+PHNwYW4gaWQ9InB0clR4dCI+5LiL5ouJ5Yi35pawPC9zcGFuPjwvZGl2PgogICAgICA8ZGl2IGlkPSJwYWdlSG9tZSI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VQb2ludHMiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZVZlaGljbGUiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUxvZ3MiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUNmZyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgPC9tYWluPgoKICA8bmF2IGNsYXNzPSJ0YWJiYXIiPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIG9uIiBkYXRhLXRhYj0iaG9tZSIgb25jbGljaz0ic3dpdGNoVGFiKCdob21lJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMC41IDEyIDNsOSA3LjUiLz48cGF0aCBkPSJNNSA5LjVWMjFoMTRWOS41Ii8+PC9zdmc+CiAgICAgIOmmlumhtTxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJwb2ludHMiIG9uY2xpY2s9InN3aXRjaFRhYigncG9pbnRzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjYiLz48cGF0aCBkPSJNOSA4LjVsMyA0IDMtNE0xMiAxMi41VjE3TTkuNiAxMy40aDQuOE05LjYgMTUuNGg0LjgiLz48L3N2Zz4KICAgICAg56ev5YiGPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InZlaGljbGUiIG9uY2xpY2s9InN3aXRjaFRhYigndmVoaWNsZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTNsMS43LTQuNkEyIDIgMCAwIDEgNy42IDdoOC44YTIgMiAwIDAgMSAxLjkgMS40TDIwIDEzIi8+PHBhdGggZD0iTTMuNSAxM2gxN2ExIDEgMCAwIDEgMSAxdjMuNWgtMi42TTIuNSAxNy41VjE0YTEgMSAwIDAgMSAxLTEiLz48cGF0aCBkPSJNNS4xIDE3LjVIMi41Ii8+PGNpcmNsZSBjeD0iNy4zIiBjeT0iMTcuMyIgcj0iMS45Ii8+PGNpcmNsZSBjeD0iMTYuNyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxwYXRoIGQ9Ik05LjIgMTcuM2g1LjYiLz48L3N2Zz4KICAgICAg6L2m6L6GPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImxvZ3MiIG9uY2xpY2s9InN3aXRjaFRhYignbG9ncycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTggNmgxM004IDEyaDEzTTggMThoMTMiLz48cGF0aCBkPSJNMyA2aC4wMU0zIDEyaC4wMU0zIDE4aC4wMSIvPjwvc3ZnPgogICAgICDml6Xlv5c8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0iY2ZnIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2NmZycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxwYXRoIGQ9Ik0xOS40IDE1YTEuNjUgMS42NSAwIDAgMCAuMzMgMS44MmwuMDYuMDZhMiAyIDAgMSAxLTIuODMgMi44M2wtLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMCAwLTEgMS41MVYyMWEyIDIgMCAxIDEtNCAwdi0uMDlhMS42NSAxLjY1IDAgMCAwLTEtMS41MSAxLjY1IDEuNjUgMCAwIDAtMS44Mi4zM2wtLjA2LjA2YTIgMiAwIDEgMS0yLjgzLTIuODNsLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAgLjMzLTEuODIgMS42NSAxLjY1IDAgMCAwLTEuNTEtMUgzYTIgMiAwIDEgMSAwLTRoLjA5YTEuNjUgMS42NSAwIDAgMCAxLjUxLTEgMS42NSAxLjY1IDAgMCAwLS4zMy0xLjgybC0uMDYtLjA2YTIgMiAwIDEgMSAyLjgzLTIuODNsLjA2LjA2YTEuNjUgMS42NSAwIDAgMCAxLjgyLjMzaC4wMWExLjY1IDEuNjUgMCAwIDAgMS0xLjUxVjNhMiAyIDAgMSAxIDQgMHYuMDlhMS42NSAxLjY1IDAgMCAwIDEgMS41MWguMDFhMS42NSAxLjY1IDAgMCAwIDEuODItLjMzbC4wNi0uMDZhMiAyIDAgMSAxIDIuODMgMi44M2wtLjA2LjA2YTEuNjUgMS42NSAwIDAgMC0uMzMgMS44MnYuMDFhMS42NSAxLjY1IDAgMCAwIDEuNTEgMUgyMWEyIDIgMCAxIDEgMCA0aC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXoiLz48L3N2Zz4KICAgICAg6K6+572uPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICA8L25hdj4KCiAgPGRpdiBjbGFzcz0ic2hlZXQtYmFja2Ryb3AiIGlkPSJzaGVldEJhY2tkcm9wIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjwvZGl2PgogIDxkaXYgY2xhc3M9InNoZWV0IiBpZD0ic2hlZXQiPgogICAgPGRpdiBjbGFzcz0ic2hlZXQtZ3JhYiI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1oZWFkIj4KICAgICAgPGgzIGlkPSJzaGVldFRpdGxlIj48L2gzPgogICAgICA8YnV0dG9uIGNsYXNzPSJzaGVldC1jbG9zZSIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+PC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWJvZHkiIGlkPSJzaGVldEJvZHkiPjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGlkPSJ0b2FzdCIgcm9sZT0ic3RhdHVzIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJjb25maXJtLWxheWVyIGhpZGRlbiIgaWQ9ImNvbmZpcm1MYXllciI+PC9kaXY+CjwvZGl2Pgo8c2NyaXB0PgoidXNlIHN0cmljdCI7Ci8qID09PT09PT09PT09PT09PT09IOW4uOmHjyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBUFBfVkVSU0lPTiA9ICJ2Mi4xNS42IjsKY29uc3QgS0VZUyA9IHsgY2ZnOiJ6ZWVob19jZmciLCBhY2NvdW50czoiemVlaG9fYWNjb3VudHMiLCBsb2dzOiJ6ZWVob19sb2dzIiB9OwoKLyogPT09PT09PT09PT09PT09PT0g5bel5YW35Ye95pWwID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFV1aWQoKXtjb25zdCBwPSJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgiLGM9ImFiY2RlZjAxMjM0NTY3ODkiO2xldCByPSIiO2Zvcihjb25zdCBjaCBvZiBwKXtpZihjaD09PSJ4Inx8Y2g9PT0ieSIpe2NvbnN0IG49TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjE2KTtyKz0oY2g9PT0ieSI/KG4mMHgzKXwweDg6bikudG9TdHJpbmcoMTYpfWVsc2Ugcis9Y2h9cmV0dXJuIHJ9CmZ1bmN0aW9uIGdldFJhbmRvbUNoYXJzKG49MTYpe2NvbnN0IGM9IjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IjtsZXQgcj0iIjtmb3IobGV0IGk9MDtpPG47aSsrKXIrPWMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCkpO3JldHVybiByfQpmdW5jdGlvbiB0b1F1ZXJ5KHA9e30pe3JldHVybiBPYmplY3Qua2V5cyhwKS5maWx0ZXIoaz0+cFtrXSE9PXVuZGVmaW5lZCYmcFtrXSE9PW51bGwpLnNvcnQoKS5tYXAoaz0+aysiPSIrcFtrXSkuam9pbigiJiIpfQpmdW5jdGlvbiBjbGVhblRva2VuKHQpe3JldHVybiBTdHJpbmcodHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWVhcmVyXHMrL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpfQpmdW5jdGlvbiBjbGVhbkJhcmtLZXkoYil7bGV0IHM9U3RyaW5nKGJ8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1hcmtccyooa2V5KT9ccypbOu+8ml1ccyovaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIikudHJpbSgpO3JldHVybiBzLnJlcGxhY2UoL1wvKyQvLCIiKX0KZnVuY3Rpb24gbWFza1Zpbih2KXtjb25zdCBzPVN0cmluZyh2fHwiIik7aWYoIXMpcmV0dXJuIiI7aWYocy5sZW5ndGg8PTcpcmV0dXJuIioqKioiO3JldHVybiBzLnN1YnN0cmluZygwLDMpKyIqKioqIitzLnN1YnN0cmluZyhzLmxlbmd0aC00KX0KZnVuY3Rpb24gZGVlcFBpY2sob2JqLGtleXMsZGVwdGgpe2lmKCFvYmp8fHR5cGVvZiBvYmohPT0ib2JqZWN0Inx8KGRlcHRofHwwKT41KXJldHVybiIiO2Zvcihjb25zdCBrIG9mIGtleXMpe2lmKG9ialtrXSE9PXVuZGVmaW5lZCYmb2JqW2tdIT09bnVsbCYmb2JqW2tdIT09IiIpcmV0dXJuIFN0cmluZyhvYmpba10pfWZvcihjb25zdCBrIGluIG9iail7aWYob2JqW2tdJiZ0eXBlb2Ygb2JqW2tdPT09Im9iamVjdCIpe2NvbnN0IHI9ZGVlcFBpY2sob2JqW2tdLGtleXMsKGRlcHRofHwwKSsxKTtpZihyKXJldHVybiByfX1yZXR1cm4iIn0KZnVuY3Rpb24gcGlja0lvdFByb3AoZCxpZGVudGlmeSl7Y29uc3QgYXJyPWQmJmQuaW90UHJvcGVydGllcztpZihBcnJheS5pc0FycmF5KGFycikpe2NvbnN0IGtleT1TdHJpbmcoaWRlbnRpZnkpLnRvTG93ZXJDYXNlKCk7Zm9yKGNvbnN0IGl0IG9mIGFycil7aWYoaXQmJlN0cmluZyhpdC5pZGVudGlmeXx8IiIpLnRvTG93ZXJDYXNlKCk9PT1rZXkmJml0LnZhbHVlIT09bnVsbCYmaXQudmFsdWUhPT11bmRlZmluZWQmJml0LnZhbHVlIT09IiIpcmV0dXJuIFN0cmluZyhpdC52YWx1ZSl9fXJldHVybiIifQpmdW5jdGlvbiBnZXREZXZpY2VJZGVudGlmeShhY2Mpe2NvbnN0IHNlZWQ9U3RyaW5nKGFjYy51c2VySWR8fGFjYy52aW5Ob3x8InplZWhvLWRldmljZSIpO2xldCBoPTA7Zm9yKGxldCBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe2g9KChoPDw1KS1oK3NlZWQuY2hhckNvZGVBdChpKSl8MH1yZXR1cm4oTWF0aC5hYnMoaCkudG9TdHJpbmcoMTYpKyIwMDAwMDAwMDAwMDAwMDAwIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIGhhc1ZhbGlkQ29vcmQobGF0LGxuZyl7aWYobGF0PT09IiJ8fGxhdD09PW51bGx8fGxhdD09PXVuZGVmaW5lZHx8bG5nPT09IiJ8fGxuZz09PW51bGx8fGxuZz09PXVuZGVmaW5lZClyZXR1cm4gZmFsc2U7Y29uc3QgbGE9TnVtYmVyKGxhdCksbG49TnVtYmVyKGxuZyk7cmV0dXJuIGlzRmluaXRlKGxhKSYmaXNGaW5pdGUobG4pJiZNYXRoLmFicyhsYSk8PTkwJiZNYXRoLmFicyhsbik8PTE4MCYmIShsYT09PTAmJmxuPT09MCl9CmZ1bmN0aW9uIG5vcm1hbGl6ZVJlZnJlc2hTZWModil7Y29uc3Qgbj1OdW1iZXIodik7aWYoIWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiA2MDtyZXR1cm4gTWF0aC5tYXgoMTUsTWF0aC5taW4oMzYwMCxNYXRoLnJvdW5kKG4pKSl9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHM9PW51bGw/IiI6cykucmVwbGFjZSgvJi9nLCImYW1wOyIpLnJlcGxhY2UoLzwvZywiJmx0OyIpLnJlcGxhY2UoLz4vZywiJmd0OyIpLnJlcGxhY2UoLyIvZywiJnF1b3Q7Iil9CgovKiA9PT09PT09PT09PT09PT09PSBNRDUgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbWQ1KHQsZSl7ZnVuY3Rpb24gbih0LGUpe3JldHVybiB0PDxlfHQ+Pj4zMi1lfWZ1bmN0aW9uIHIodCxlKXt2YXIgbixyLG8saSxhO3JldHVybiBvPTIxNDc0ODM2NDgmdCxpPTIxNDc0ODM2NDgmZSxhPSgxMDczNzQxODIzJnQpKygxMDczNzQxODIzJmUpLChuPTEwNzM3NDE4MjQmdCkmKHI9MTA3Mzc0MTgyNCZlKT8yMTQ3NDgzNjQ4XmFeb15pOm58cj8xMDczNzQxODI0JmE/MzIyMTIyNTQ3Ml5hXm9eaToxMDczNzQxODI0XmFeb15pOmFeb15pfWZ1bmN0aW9uIG8odCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmZXx+dCZufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGkodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmbnxlJn5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGEodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHReZV5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIHUodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIGVeKHR8fm4pfShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGModCl7dmFyIGUsbj0iIixyPSIiO2ZvcihlPTA7ZTw9MztlKyspbis9KHI9IjAiKyh0Pj4+OCplJjI1NSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoci5sZW5ndGgtMiwyKTtyZXR1cm4gbn12YXIgcyxsLGYscCxkLGgsdix5LGcsbT1BcnJheSgpO2ZvcihtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxuPXQubGVuZ3RoLHI9bis4LG89MTYqKChyLXIlNjQpLzY0KzEpLGk9QXJyYXkoby0xKSxhPTAsdT0wO3U8bjspYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfHQuY2hhckNvZGVBdCh1KTw8YSx1Kys7cmV0dXJuIGE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXwxMjg8PGEsaVtvLTJdPW48PDMsaVtvLTFdPW4+Pj4yOSxpfSh0PWZ1bmN0aW9uKHQpe3Q9dC5yZXBsYWNlKC9cclxuL2csIlxuIik7Zm9yKHZhciBlPSIiLG49MDtuPHQubGVuZ3RoO24rKyl7dmFyIHI9dC5jaGFyQ29kZUF0KG4pO3I8MTI4P2UrPVN0cmluZy5mcm9tQ2hhckNvZGUocik6cj4xMjcmJnI8MjA0OD8oZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5MiksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpOihlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpfXJldHVybiBlfSh0KSksaD0xNzMyNTg0MTkzLHY9NDAyMzIzMzQxNyx5PTI1NjIzODMxMDIsZz0yNzE3MzM4Nzgscz0wO3M8bS5sZW5ndGg7cys9MTYpbD1oLGY9dixwPXksZD1nLGg9byhoLHYseSxnLG1bcyswXSw3LDM2MTQwOTAzNjApLGc9byhnLGgsdix5LG1bcysxXSwxMiwzOTA1NDAyNzEwKSx5PW8oeSxnLGgsdixtW3MrMl0sMTcsNjA2MTA1ODE5KSx2PW8odix5LGcsaCxtW3MrM10sMjIsMzI1MDQ0MTk2NiksaD1vKGgsdix5LGcsbVtzKzRdLDcsNDExODU0ODM5OSksZz1vKGcsaCx2LHksbVtzKzVdLDEyLDEyMDAwODA0MjYpLHk9byh5LGcsaCx2LG1bcys2XSwxNywyODIxNzM1OTU1KSx2PW8odix5LGcsaCxtW3MrN10sMjIsNDI0OTI2MTMxMyksaD1vKGgsdix5LGcsbVtzKzhdLDcsMTc3MDAzNTQxNiksZz1vKGcsaCx2LHksbVtzKzldLDEyLDIzMzY1NTI4NzkpLHk9byh5LGcsaCx2LG1bcysxMF0sMTcsNDI5NDkyNTIzMyksdj1vKHYseSxnLGgsbVtzKzExXSwyMiwyMzA0NTYzMTM0KSxoPW8oaCx2LHksZyxtW3MrMTJdLDcsMTgwNDYwMzY4MiksZz1vKGcsaCx2LHksbVtzKzEzXSwxMiw0MjU0NjI2MTk1KSx5PW8oeSxnLGgsdixtW3MrMTRdLDE3LDI3OTI5NjUwMDYpLGg9aShoLHY9byh2LHksZyxoLG1bcysxNV0sMjIsMTIzNjUzNTMyOSkseSxnLG1bcysxXSw1LDQxMjkxNzA3ODYpLGc9aShnLGgsdix5LG1bcys2XSw5LDMyMjU0NjU2NjQpLHk9aSh5LGcsaCx2LG1bcysxMV0sMTQsNjQzNzE3NzEzKSx2PWkodix5LGcsaCxtW3MrMF0sMjAsMzkyMTA2OTk5NCksaD1pKGgsdix5LGcsbVtzKzVdLDUsMzU5MzQwODYwNSksZz1pKGcsaCx2LHksbVtzKzEwXSw5LDM4MDE2MDgzKSx5PWkoeSxnLGgsdixtW3MrMTVdLDE0LDM2MzQ0ODg5NjEpLHY9aSh2LHksZyxoLG1bcys0XSwyMCwzODg5NDI5NDQ4KSxoPWkoaCx2LHksZyxtW3MrOV0sNSw1Njg0NDY0MzgpLGc9aShnLGgsdix5LG1bcysxNF0sOSwzMjc1MTYzNjA2KSx5PWkoeSxnLGgsdixtW3MrM10sMTQsNDEwNzYwMzMzNSksdj1pKHYseSxnLGgsbVtzKzhdLDIwLDExNjM1MzE1MDEpLGg9aShoLHYseSxnLG1bcysxM10sNSwyODUwMjg1ODI5KSxnPWkoZyxoLHYseSxtW3MrMl0sOSw0MjQzNTYzNTEyKSx5PWkoeSxnLGgsdixtW3MrN10sMTQsMTczNTMyODQ3MyksaD1hKGgsdj1pKHYseSxnLGgsbVtzKzEyXSwyMCwyMzY4MzU5NTYyKSx5LGcsbVtzKzVdLDQsNDI5NDU4ODczOCksZz1hKGcsaCx2LHksbVtzKzhdLDExLDIyNzIzOTI4MzMpLHk9YSh5LGcsaCx2LG1bcysxMV0sMTYsMTgzOTAzMDU2Miksdj1hKHYseSxnLGgsbVtzKzE0XSwyMyw0MjU5NjU3NzQwKSxoPWEoaCx2LHksZyxtW3MrMV0sNCwyNzYzOTc1MjM2KSxnPWEoZyxoLHYseSxtW3MrNF0sMTEsMTI3Mjg5MzM1MykseT1hKHksZyxoLHYsbVtzKzddLDE2LDQxMzk0Njk2NjQpLHY9YSh2LHksZyxoLG1bcysxMF0sMjMsMzIwMDIzNjY1NiksaD1hKGgsdix5LGcsbVtzKzEzXSw0LDY4MTI3OTE3NCksZz1hKGcsaCx2LHksbVtzKzBdLDExLDM5MzY0MzAwNzQpLHk9YSh5LGcsaCx2LG1bcyszXSwxNiwzNTcyNDQ1MzE3KSx2PWEodix5LGcsaCxtW3MrNl0sMjMsNzYwMjkxODkpLGg9YShoLHYseSxnLG1bcys5XSw0LDM2NTQ2MDI4MDkpLGc9YShnLGgsdix5LG1bcysxMl0sMTEsMzg3MzE1MTQ2MSkseT1hKHksZyxoLHYsbVtzKzE1XSwxNiw1MzA3NDI1MjApLGg9dShoLHY9YSh2LHksZyxoLG1bcysyXSwyMywzMjk5NjI4NjQ1KSx5LGcsbVtzKzBdLDYsNDA5NjMzNjQ1MiksZz11KGcsaCx2LHksbVtzKzddLDEwLDExMjY4OTE0MTUpLHk9dSh5LGcsaCx2LG1bcysxNF0sMTUsMjg3ODYxMjM5MSksdj11KHYseSxnLGgsbVtzKzVdLDIxLDQyMzc1MzMyNDEpLGg9dShoLHYseSxnLG1bcysxMl0sNiwxNzAwNDg1NTcxKSxnPXUoZyxoLHYseSxtW3MrM10sMTAsMjM5OTk4MDY5MCkseT11KHksZyxoLHYsbVtzKzEwXSwxNSw0MjkzOTE1NzczKSx2PXUodix5LGcsaCxtW3MrMV0sMjEsMjI0MDA0NDQ5NyksaD11KGgsdix5LGcsbVtzKzhdLDYsMTg3MzMxMzM1OSksZz11KGcsaCx2LHksbVtzKzE1XSwxMCw0MjY0MzU1NTUyKSx5PXUoeSxnLGgsdixtW3MrNl0sMTUsMjczNDc2ODkxNiksdj11KHYseSxnLGgsbVtzKzEzXSwyMSwxMzA5MTUxNjQ5KSxoPXUoaCx2LHksZyxtW3MrNF0sNiw0MTQ5NDQ0MjI2KSxnPXUoZyxoLHYseSxtW3MrMTFdLDEwLDMxNzQ3NTY5MTcpLHk9dSh5LGcsaCx2LG1bcysyXSwxNSw3MTg3ODcyNTkpLHY9dSh2LHksZyxoLG1bcys5XSwyMSwzOTUxNDgxNzQ1KSxoPXIoaCxsKSx2PXIodixmKSx5PXIoeSxwKSxnPXIoZyxkKTtyZXR1cm4gMzI9PWU/KGMoaCkrYyh2KStjKHkpK2MoZykpLnRvTG93ZXJDYXNlKCk6KGModikrYyh5KSkudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gU0hBMSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzaGExKG1zZyl7ZnVuY3Rpb24gcm90YXRlX2xlZnQobixzKXt2YXIgdDQ9KG48PHMpfChuPj4+KDMyLXMpKTtyZXR1cm4gdDR9O2Z1bmN0aW9uIGN2dF9oZXgodmFsKXt2YXIgc3RyPScnO3ZhciBpO3ZhciB2O2ZvcihpPTc7aT49MDtpLS0pe3Y9KHZhbD4+PihpKjQpKSYweDBmO3N0cis9di50b1N0cmluZygxNil9cmV0dXJuIHN0cn07ZnVuY3Rpb24gVXRmOEVuY29kZShzdHJpbmcpe3N0cmluZz1zdHJpbmcucmVwbGFjZSgvXHJcbi9nLCdcbicpO3ZhciB1dGZ0ZXh0PScnO2Zvcih2YXIgbj0wO248c3RyaW5nLmxlbmd0aDtuKyspe3ZhciBjPXN0cmluZy5jaGFyQ29kZUF0KG4pO2lmKGM8MTI4KXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGMpfWVsc2UgaWYoKGM+MTI3KSYmKGM8MjA0OCkpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpfDE5Mik7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX1lbHNle3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKXwyMjQpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSY2Myl8MTI4KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfX1yZXR1cm4gdXRmdGV4dH07dmFyIGJsb2Nrc3RhcnQ7dmFyIGksajt2YXIgVz1uZXcgQXJyYXkoODApO3ZhciBIMD0weDY3NDUyMzAxO3ZhciBIMT0weEVGQ0RBQjg5O3ZhciBIMj0weDk4QkFEQ0ZFO3ZhciBIMz0weDEwMzI1NDc2O3ZhciBIND0weEMzRDJFMUYwO3ZhciBBLEIsQyxELEU7dmFyIHRlbXA7bXNnPVV0ZjhFbmNvZGUobXNnKTt2YXIgbXNnX2xlbj1tc2cubGVuZ3RoO3ZhciB3b3JkX2FycmF5PW5ldyBBcnJheSgpO2ZvcihpPTA7aTxtc2dfbGVuLTM7aSs9NCl7aj1tc2cuY2hhckNvZGVBdChpKTw8MjR8bXNnLmNoYXJDb2RlQXQoaSsxKTw8MTZ8bXNnLmNoYXJDb2RlQXQoaSsyKTw8OHxtc2cuY2hhckNvZGVBdChpKzMpO3dvcmRfYXJyYXkucHVzaChqKX1zd2l0Y2gobXNnX2xlbiU0KXtjYXNlIDA6aT0weDA4MDAwMDAwMDticmVhaztjYXNlIDE6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwyNHwweDA4MDAwMDA7YnJlYWs7Y2FzZSAyOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MTZ8MHgwODAwMDticmVhaztjYXNlIDM6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTMpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwxNnxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDw4fDB4ODA7YnJlYWt9d29yZF9hcnJheS5wdXNoKGkpO3doaWxlKCh3b3JkX2FycmF5Lmxlbmd0aCUxNikhPTE0KXdvcmRfYXJyYXkucHVzaCgwKTt3b3JkX2FycmF5LnB1c2gobXNnX2xlbj4+PjI5KTt3b3JkX2FycmF5LnB1c2goKG1zZ19sZW48PDMpJjB4MGZmZmZmZmZmKTtmb3IoYmxvY2tzdGFydD0wO2Jsb2Nrc3RhcnQ8d29yZF9hcnJheS5sZW5ndGg7YmxvY2tzdGFydCs9MTYpe2ZvcihpPTA7aTwxNjtpKyspV1tpXT13b3JkX2FycmF5W2Jsb2Nrc3RhcnQraV07Zm9yKGk9MTY7aTw9Nzk7aSsrKVdbaV09cm90YXRlX2xlZnQoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0sMSk7QT1IMDtCPUgxO0M9SDI7RD1IMztFPUg0O2ZvcihpPTA7aTw9MTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwofkImRCkpK0UrV1tpXSsweDVBODI3OTk5KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT0yMDtpPD0zOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHg2RUQ5RUJBMSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NDA7aTw9NTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwoQiZEKXwoQyZEKSkrRStXW2ldKzB4OEYxQkJDREMpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTYwO2k8PTc5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweENBNjJDMUQ2KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1IMD0oSDArQSkmMHgwZmZmZmZmZmY7SDE9KEgxK0IpJjB4MGZmZmZmZmZmO0gyPShIMitDKSYweDBmZmZmZmZmZjtIMz0oSDMrRCkmMHgwZmZmZmZmZmY7SDQ9KEg0K0UpJjB4MGZmZmZmZmZmfXZhciB0ZW1wPWN2dF9oZXgoSDApK2N2dF9oZXgoSDEpK2N2dF9oZXgoSDIpK2N2dF9oZXgoSDMpK2N2dF9oZXgoSDQpO3JldHVybiB0ZW1wLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IEFFUy0yNTYtRUNCICsgUEtDUzcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQUVTX1NCT1g9bmV3IFVpbnQ4QXJyYXkoWzB4NjMsMHg3YywweDc3LDB4N2IsMHhmMiwweDZiLDB4NmYsMHhjNSwweDMwLDB4MDEsMHg2NywweDJiLDB4ZmUsMHhkNywweGFiLDB4NzYsMHhjYSwweDgyLDB4YzksMHg3ZCwweGZhLDB4NTksMHg0NywweGYwLDB4YWQsMHhkNCwweGEyLDB4YWYsMHg5YywweGE0LDB4NzIsMHhjMCwweGI3LDB4ZmQsMHg5MywweDI2LDB4MzYsMHgzZiwweGY3LDB4Y2MsMHgzNCwweGE1LDB4ZTUsMHhmMSwweDcxLDB4ZDgsMHgzMSwweDE1LDB4MDQsMHhjNywweDIzLDB4YzMsMHgxOCwweDk2LDB4MDUsMHg5YSwweDA3LDB4MTIsMHg4MCwweGUyLDB4ZWIsMHgyNywweGIyLDB4NzUsMHgwOSwweDgzLDB4MmMsMHgxYSwweDFiLDB4NmUsMHg1YSwweGEwLDB4NTIsMHgzYiwweGQ2LDB4YjMsMHgyOSwweGUzLDB4MmYsMHg4NCwweDUzLDB4ZDEsMHgwMCwweGVkLDB4MjAsMHhmYywweGIxLDB4NWIsMHg2YSwweGNiLDB4YmUsMHgzOSwweDRhLDB4NGMsMHg1OCwweGNmLDB4ZDAsMHhlZiwweGFhLDB4ZmIsMHg0MywweDRkLDB4MzMsMHg4NSwweDQ1LDB4ZjksMHgwMiwweDdmLDB4NTAsMHgzYywweDlmLDB4YTgsMHg1MSwweGEzLDB4NDAsMHg4ZiwweDkyLDB4OWQsMHgzOCwweGY1LDB4YmMsMHhiNiwweGRhLDB4MjEsMHgxMCwweGZmLDB4ZjMsMHhkMiwweGNkLDB4MGMsMHgxMywweGVjLDB4NWYsMHg5NywweDQ0LDB4MTcsMHhjNCwweGE3LDB4N2UsMHgzZCwweDY0LDB4NWQsMHgxOSwweDczLDB4NjAsMHg4MSwweDRmLDB4ZGMsMHgyMiwweDJhLDB4OTAsMHg4OCwweDQ2LDB4ZWUsMHhiOCwweDE0LDB4ZGUsMHg1ZSwweDBiLDB4ZGIsMHhlMCwweDMyLDB4M2EsMHgwYSwweDQ5LDB4MDYsMHgyNCwweDVjLDB4YzIsMHhkMywweGFjLDB4NjIsMHg5MSwweDk1LDB4ZTQsMHg3OSwweGU3LDB4YzgsMHgzNywweDZkLDB4OGQsMHhkNSwweDRlLDB4YTksMHg2YywweDU2LDB4ZjQsMHhlYSwweDY1LDB4N2EsMHhhZSwweDA4LDB4YmEsMHg3OCwweDI1LDB4MmUsMHgxYywweGE2LDB4YjQsMHhjNiwweGU4LDB4ZGQsMHg3NCwweDFmLDB4NGIsMHhiZCwweDhiLDB4OGEsMHg3MCwweDNlLDB4YjUsMHg2NiwweDQ4LDB4MDMsMHhmNiwweDBlLDB4NjEsMHgzNSwweDU3LDB4YjksMHg4NiwweGMxLDB4MWQsMHg5ZSwweGUxLDB4ZjgsMHg5OCwweDExLDB4NjksMHhkOSwweDhlLDB4OTQsMHg5YiwweDFlLDB4ODcsMHhlOSwweGNlLDB4NTUsMHgyOCwweGRmLDB4OGMsMHhhMSwweDg5LDB4MGQsMHhiZiwweGU2LDB4NDIsMHg2OCwweDQxLDB4OTksMHgyZCwweDBmLDB4YjAsMHg1NCwweGJiLDB4MTZdKTsKY29uc3QgQUVTX1JDT049bmV3IFVpbnQ4QXJyYXkoWzB4MDAsMHgwMSwweDAyLDB4MDQsMHgwOCwweDEwLDB4MjAsMHg0MCwweDgwLDB4MWIsMHgzNiwweDZjLDB4ZDgsMHhhYiwweDRkXSk7CmZ1bmN0aW9uIGFlc0dNdWwoYSxiKXtsZXQgcD0wO2ZvcihsZXQgaT0wO2k8ODtpKyspe2lmKGImMSlwXj1hO2NvbnN0IGhpPWEmMHg4MDthPShhPDwxKSYweGZmO2lmKGhpKWFePTB4MWI7Yj4+PTF9cmV0dXJuIHB9CmZ1bmN0aW9uIGFlc0tleUV4cGFuc2lvbjI1NihrZXkpe2NvbnN0IE5rPTgsTmI9NCxOcj0xNDtjb25zdCB3PW5ldyBVaW50OEFycmF5KDQqTmIqKE5yKzEpKTtmb3IobGV0IGk9MDtpPE5rKjQ7aSsrKXdbaV09a2V5W2ldO2ZvcihsZXQgaT1OaztpPE5iKihOcisxKTtpKyspe2xldCB0MD13WzQqKGktMSldLHQxPXdbNCooaS0xKSsxXSx0Mj13WzQqKGktMSkrMl0sdDM9d1s0KihpLTEpKzNdO2lmKGklTms9PT0wKXtjb25zdCB0bXA9dDA7dDA9QUVTX1NCT1hbdDFdXkFFU19SQ09OW2kvTmtdO3QxPUFFU19TQk9YW3QyXTt0Mj1BRVNfU0JPWFt0M107dDM9QUVTX1NCT1hbdG1wXX1lbHNlIGlmKGklTms9PT00KXt0MD1BRVNfU0JPWFt0MF07dDE9QUVTX1NCT1hbdDFdO3QyPUFFU19TQk9YW3QyXTt0Mz1BRVNfU0JPWFt0M119d1s0KmldPXdbNCooaS1OayldXnQwO3dbNCppKzFdPXdbNCooaS1OaykrMV1edDE7d1s0KmkrMl09d1s0KihpLU5rKSsyXV50Mjt3WzQqaSszXT13WzQqKGktTmspKzNdXnQzfXJldHVybiB3fQpmdW5jdGlvbiBhZXNFbmNyeXB0QmxvY2soaW5wdXQsdyl7Y29uc3QgTmI9NCxOcj0xNDtjb25zdCBzPW5ldyBVaW50OEFycmF5KDE2KTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPWlucHV0W2ldO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbaV07Zm9yKGxldCByb3VuZD0xO3JvdW5kPD1Ocjtyb3VuZCsrKXtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPUFFU19TQk9YW3NbaV1dO2xldCB0PXNbMV07c1sxXT1zWzVdO3NbNV09c1s5XTtzWzldPXNbMTNdO3NbMTNdPXQ7dD1zWzJdO3NbMl09c1sxMF07c1sxMF09dDt0PXNbNl07c1s2XT1zWzE0XTtzWzE0XT10O3Q9c1szXTtzWzNdPXNbMTVdO3NbMTVdPXNbMTFdO3NbMTFdPXNbN107c1s3XT10O2lmKHJvdW5kIT09TnIpe2ZvcihsZXQgYz0wO2M8NDtjKyspe2NvbnN0IGk9NCpjO2NvbnN0IGEwPXNbaV0sYTE9c1tpKzFdLGEyPXNbaSsyXSxhMz1zW2krM107c1tpXT1hZXNHTXVsKGEwLDIpXmFlc0dNdWwoYTEsMyleYTJeYTM7c1tpKzFdPWEwXmFlc0dNdWwoYTEsMileYWVzR011bChhMiwzKV5hMztzW2krMl09YTBeYTFeYWVzR011bChhMiwyKV5hZXNHTXVsKGEzLDMpO3NbaSszXT1hZXNHTXVsKGEwLDMpXmExXmEyXmFlc0dNdWwoYTMsMil9fWNvbnN0IG9mZj1yb3VuZCoxNjtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W29mZitpXX1yZXR1cm4gc30KZnVuY3Rpb24gYWVzVXRmOEJ5dGVzKHN0cil7Y29uc3Qgb3V0PVtdO2ZvcihsZXQgaT0wO2k8c3RyLmxlbmd0aDtpKyspe2xldCBjPXN0ci5jaGFyQ29kZUF0KGkpO2lmKGM8MHg4MClvdXQucHVzaChjKTtlbHNlIGlmKGM8MHg4MDApb3V0LnB1c2goMHhjMHwoYz4+NiksMHg4MHwoYyYweDNmKSk7ZWxzZSBpZihjPj0weGQ4MDAmJmM8PTB4ZGJmZil7Y29uc3QgYzI9c3RyLmNoYXJDb2RlQXQoKytpKTtjPTB4MTAwMDArKChjLTB4ZDgwMCk8PDEwKSsoYzItMHhkYzAwKTtvdXQucHVzaCgweGYwfChjPj4xOCksMHg4MHwoKGM+PjEyKSYweDNmKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9ZWxzZSBvdXQucHVzaCgweGUwfChjPj4xMiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfXJldHVybiBuZXcgVWludDhBcnJheShvdXQpfQpmdW5jdGlvbiBhZXNCeXRlc1RvQmFzZTY0KGJ5dGVzKXtjb25zdCBjaGFycz0iQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7bGV0IHJlc3VsdD0iIixpPTA7Zm9yKDtpKzI8Ynl0ZXMubGVuZ3RoO2krPTMpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpfGJ5dGVzW2krMl07cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdK2NoYXJzW24mNjNdfWNvbnN0IHJlbT1ieXRlcy5sZW5ndGgtaTtpZihyZW09PT0xKXtjb25zdCBuPWJ5dGVzW2ldPDwxNjtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdKyI9PSJ9ZWxzZSBpZihyZW09PT0yKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rIj0ifXJldHVybiByZXN1bHR9CmZ1bmN0aW9uIGFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW50ZXh0LGtleVN0cil7Y29uc3Qga2V5PWFlc1V0ZjhCeXRlcyhrZXlTdHIpO2lmKGtleS5sZW5ndGghPT0zMil0aHJvdyBuZXcgRXJyb3IoIkFFUy0yNTbpnIDopoEzMuWtl+iKguWvhumSpe+8jOW9k+WJjSIra2V5Lmxlbmd0aCk7Y29uc3Qgdz1hZXNLZXlFeHBhbnNpb24yNTYoa2V5KTtjb25zdCBkYXRhPWFlc1V0ZjhCeXRlcyhwbGFpbnRleHQpO2NvbnN0IHBhZExlbj0xNi0oZGF0YS5sZW5ndGglMTYpO2NvbnN0IHBhZGRlZD1uZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCtwYWRMZW4pO3BhZGRlZC5zZXQoZGF0YSk7Zm9yKGxldCBpPWRhdGEubGVuZ3RoO2k8cGFkZGVkLmxlbmd0aDtpKyspcGFkZGVkW2ldPXBhZExlbjtjb25zdCBvdXQ9bmV3IFVpbnQ4QXJyYXkocGFkZGVkLmxlbmd0aCk7Zm9yKGxldCBvZmY9MDtvZmY8cGFkZGVkLmxlbmd0aDtvZmYrPTE2KXtvdXQuc2V0KGFlc0VuY3J5cHRCbG9jayhwYWRkZWQuc2xpY2Uob2ZmLG9mZisxNiksdyksb2ZmKX1yZXR1cm4gYWVzQnl0ZXNUb0Jhc2U2NChvdXQpfQoKLyogPT09PT09PT09PT09PT09PT0g5a2Y5YKoID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGxvYWRKU09OKGssZmFsbGJhY2spe3RyeXtjb25zdCByYXc9bG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7aWYoIXJhdylyZXR1cm4gZmFsbGJhY2s7Y29uc3Qgdj1KU09OLnBhcnNlKHJhdyk7cmV0dXJuIHY9PT11bmRlZmluZWR8fHY9PT1udWxsP2ZhbGxiYWNrOnZ9Y2F0Y2goZSl7cmV0dXJuIGZhbGxiYWNrfX0KZnVuY3Rpb24gc2F2ZUpTT04oayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayxKU09OLnN0cmluZ2lmeSh2KSk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KY29uc3QgREVGQVVMVF9DRkc9e2FwcDp7YXBwSWQ6IlM3cVBXUFUxIixhcHBTZWNyZXQ6ImM1ZTBkYTdmNGRhMjhkZjgwNTY5NGVjM2RkMWZjNjc5MmU5ZGY5OWQifSxoNTp7YXBwSWQ6IlN3NUY5dUppIixhcHBTZWNyZXQ6IjQ2ODcwYThmNjc4YTA5MTA5NDY4ZjViMDE2ODgxOGI5MWMyOTI4NDUifSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6dHJ1ZSxlbmFibGVMaWtlOnRydWUsZW5hYmxlQ29tbWVudDp0cnVlLGVuYWJsZVNoYXJlOnRydWUsZW5hYmxlRGVsZXRlOnRydWV9LHZlaGljbGVBZXNLZXk6ImNlMmNkN2NiNTcxMjRjMTM0OWRkODU0M2JmNmZkMzFkIix2ZWhpY2xlQ29udHJvbFJpc2s6IiIsYXV0b1JlZnJlc2hTZWM6NjAsc2VydmVyQmFzZToiIixhdXRvU2lnbmluOmZhbHNlLGF1dG9TaWduaW5UaW1lOiIwNzowMCIsdmVoaWNsZU1vbml0b3I6ZmFsc2Usd2lkZ2V0VmVoaWNsZToiIixjdXN0b21CZzoiIn07CmZ1bmN0aW9uIGdldENmZygpe2NvbnN0IGM9bG9hZEpTT04oS0VZUy5jZmcsbnVsbCk7aWYoIWMpcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoREVGQVVMVF9DRkcpKTtyZXR1cm57YXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fERFRkFVTFRfQ0ZHLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldH0saDU6e2FwcElkOmMuaDU/LmFwcElkfHxERUZBVUxUX0NGRy5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5oNS5hcHBTZWNyZXR9LGNvbW11bml0eTp7ZW5hYmxlUG9zdDpjLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmMuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmMuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sdmVoaWNsZUFlc0tleTooKHR5cGVvZiBjLnZlaGljbGVBZXNLZXk9PT0ic3RyaW5nIj9jLnZlaGljbGVBZXNLZXk6IiIpLnRyaW0oKXx8REVGQVVMVF9DRkcudmVoaWNsZUFlc0tleSksdmVoaWNsZUNvbnRyb2xSaXNrOih0eXBlb2YgYy52ZWhpY2xlQ29udHJvbFJpc2s9PT0ic3RyaW5nIj9jLnZlaGljbGVDb250cm9sUmlzazoiIikudHJpbSgpLGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksc2VydmVyQmFzZTpTdHJpbmcoYy5zZXJ2ZXJCYXNlfHwiIikudHJpbSgpLGF1dG9TaWduaW46Yy5hdXRvU2lnbmluPT09dHJ1ZSxhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLHZlaGljbGVNb25pdG9yOmMudmVoaWNsZU1vbml0b3I9PT10cnVlLCB3aWRnZXRWZWhpY2xlOlN0cmluZyhjLndpZGdldFZlaGljbGV8fCIiKSwgY3VzdG9tQmc6U3RyaW5nKGMuY3VzdG9tQmd8fCIiKX19CmZ1bmN0aW9uIHNhdmVDZmcoYyl7cmV0dXJuIHNhdmVKU09OKEtFWVMuY2ZnLGMpfQpmdW5jdGlvbiBnZXRBY2NvdW50cygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5hY2NvdW50cyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gc2F2ZUFjY291bnRzKGxpc3Qpe3JldHVybiBzYXZlSlNPTihLRVlTLmFjY291bnRzLGxpc3QpfQpmdW5jdGlvbiBnZXRMb2dzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmxvZ3MsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIGFkZExvZyhlbnRyeSl7Y29uc3QgbG9ncz1nZXRMb2dzKCk7bG9ncy51bnNoaWZ0KGVudHJ5KTtpZihsb2dzLmxlbmd0aD41MClsb2dzLmxlbmd0aD01MDtzYXZlSlNPTihLRVlTLmxvZ3MsbG9ncyl9CmZ1bmN0aW9uIGNsZWFyTG9ncygpe3JldHVybiBzYXZlSlNPTihLRVlTLmxvZ3MsW10pfQpmdW5jdGlvbiBpc1Byb3h5TW9kZSgpe3JldHVybiAhISh3aW5kb3cuX19QQU5FTF9NT0RFX18pfHwhIWdldENmZygpLnNlcnZlckJhc2V9Ci8qID09PT09PT09PT09PT09PT09IOetvuWQjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRTaWduKHR5cGUscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Y1t0eXBlXXx8Yy5hcHA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10eXBlPT09Img1Ij9nZXRVdWlkKCk6dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9Ym9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTonJztjb25zdCBzaWduYXR1cmU9dHlwZT09PSJoNSI/KHF1ZXJ5K3BhcmFtK2FjLmFwcFNlY3JldCk6KGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KTtjb25zdCBzaWduPW1kNShzaGExKHNpZ25hdHVyZSksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ3NpZ25hdHVyZSc6c2lnbn19CgovLyBINSDnq6/lkKsgYm9keSDnrb7lkI3vvIhsb2dpbkJ5UGhvbmUg562J5o6l5Y+j5b+F6aG75oqK6K+35rGC5L2T57qz5YWl562+5ZCN77yM5ZCm5YiZ6L+U5ZueIHBlcm1pdCBlcnJvcu+8iQpmdW5jdGlvbiBoNVNpZ25XaXRoQm9keShib2R5LGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuaDV8fGMuYXBwO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT1nZXRVdWlkKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpO2NvbnN0IHNpZ249bWQ1KHNoYTEoYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdhcHBJZCc6YWMuYXBwSWR9fQoKLy8gQXBwIOe9keWFs+WujOaVtOetvuWQje+8iOWPkeeggeS4jueZu+W9leWQjOe9keWFs++8jOmBv+WFjSBINSBhdXRoQ29kZSDlj5HnoIHov5sgQXBwIOaxoOiAjCBINSBsb2dpbkJ5UGhvbmUg5p+l5LiN5Yiw77yJCmZ1bmN0aW9uIGFwcEdhdGV3YXlTaWduKHVybCxtZXRob2QscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7bGV0IHByZVNpZ249IiI7aWYoU3RyaW5nKG1ldGhvZCkudG9VcHBlckNhc2UoKT09PSJHRVQiKXtjb25zdCB1PW5ldyBVUkwodXJsKTtwcmVTaWduPXUub3JpZ2luK3UucGF0aG5hbWUrKHF1ZXJ5PyI/IitxdWVyeToiIik7fWVsc2V7cHJlU2lnbj1xdWVyeSsoYm9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKToiIik7fWNvbnN0IHNpZ249bWQ1KHNoYTEocHJlU2lnbitwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnYXBwSWQnOmFjLmFwcElkLCdub25jZSc6bm9uY2UsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ3NpZ25hdHVyZSc6c2lnbiwnQ2Ztb3RvLVgtUGFyYW0nOnBhcmFtLCdDZm1vdG8tWC1TaWduJzpzaWduLCdDZm1vdG8tWC1TaWduLVR5cGUnOicwJ319CgovKiA9PT09PT09PT09PT09PT09PSBIVFRQ77yIZmV0Y2gg54mI77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGh0dHBHZXQodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJHRVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQb3N0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHk9PW51bGw/e306Ym9keSksc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQdXQodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBVVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OmJvZHkhPT11bmRlZmluZWQmJmJvZHkhPT1udWxsPyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOnVuZGVmaW5lZCxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cERlbGV0ZSh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkRFTEVURSIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KZnVuY3Rpb24gbmV0d29ya0hpbnQocmVzKXtjb25zdCBtPVN0cmluZygocmVzJiZyZXMuZXJyb3IpfHwiIik7aWYoL2ZhaWxlZCB0byBmZXRjaHxuZXR3b3JrZXJyb3J8Y29yc3xsb2FkIGZhaWxlZHzml6Dms5Xov57mjqV8572R57ucL2kudGVzdChtKSlyZXR1cm4i572R57ucL+i3qOWfn+WPl+mZkO+8muebtOi/nuaooeW8j+mcgCBaRUVITyDmnI3liqHnq6/mlL7ooYwgQ09SU++8jOivt+ajgOafpee9kee7nOi/nuaOpeWQjumHjeivlSI7cmV0dXJuIiJ9CgovKiA9PT09PT09PT09PT09PT09PSDnm7Tov57lkI7nq6/vvIjmtY/op4jlmajnm7TmjqXosIMgWkVFSE8gQVBJ77yJID09PT09PT09PT09PT09PT09ICovCi8vIOmhtemdouebtOi/nuaooeW8j+S4i+eahOWFnOW6leWktO+8mlVBIOacquiHquWumuS5ieaXtuavj+asoeivt+axgumaj+acuuiuvuWkh+aMh+e6ue+8iOS4juiEmuacrOW8leaTjuWQjOetlueVpe+8jOmBv+WFjeWbuuWumuaMh+e6ueiiq+mjjuaOp+aLiem7ke+8iQpmdW5jdGlvbiBwYWdlUmFuZG9tVUEoKXtjb25zdCB2ZXJzPVsiMTYuMS4xIiwiMTYuNi4xIiwiMTYuNy44IiwiMTcuMS4xIiwiMTcuMi4xIiwiMTcuNC4xIiwiMTcuNS4xIiwiMTcuNi4xIiwiMTguMCIsIjE4LjEuMSIsIjE4LjMuMSJdO3JldHVybiAiTU9CSUxFfGlPU3wiK3ZlcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnZlcnMubGVuZ3RoKV0rInxaRUVIT19BUFB8My4wLjF8aVBob25lfCIrKE1hdGgucmFuZG9tKCk8MC43PyJXV0FOIjoiV0lGSSIpKyJ8aU9TIn0KZnVuY3Rpb24gYmFzZUhlYWRlcnMoYWNjKXtjb25zdCB1YT1hY2MudXNlckFnZW50fHxwYWdlUmFuZG9tVUEoKTtjb25zdCBoPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsIkFjY2VwdCI6IiovKiIsIlVzZXItQWdlbnQiOnVhLCJ4LWFwcC1pbmZvIjp1YX07aWYoYWNjLnVzZXJJZCl7aFsidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtoWyJDb29raWUiXT0idXNlcl9pZD0iK2FjYy51c2VySWR9cmV0dXJuIGh9Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIsaGVhZGVycyk7bGV0IGxpc3Q9W107aWYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApe2lmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKWxpc3Q9cmVzLmRhdGE7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5saXN0KSlsaXN0PXJlcy5kYXRhLmxpc3Q7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yZWNvcmRzKSlsaXN0PXJlcy5kYXRhLnJlY29yZHM7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yb3dzKSlsaXN0PXJlcy5kYXRhLnJvd3N9cmV0dXJuIGxpc3QubWFwKHY9Pih7dmluTm86U3RyaW5nKHYudmluTm98fHYuZnJhbWVOb3x8di52aW58fCIiKS50cmltKCksbmFtZTpTdHJpbmcodi52ZWhpY2xlTmFtZXx8di52ZWhpY2xlVHlwZXx8di5kZXZpY2VOYW1lfHx2Lm5hbWV8fCLovabovoYiKS50cmltKCl8fCLovabovoYiLHBpYzpTdHJpbmcodi52ZWhpY2xlUGljVXJsfHx2LnBpY3x8di5pbWFnZVVybHx8IiIpLnRyaW0oKSx2ZWhpY2xlVHlwZTpTdHJpbmcodi52ZWhpY2xlVHlwZXx8di50eXBlfHwiIikudHJpbSgpLGxpY2Vuc2VQbGF0ZTp2LmxpY2Vuc2VQbGF0ZXx8bnVsbH0pKS5maWx0ZXIodj0+di52aW5Obyl9Y2F0Y2goZSl7cmV0dXJuW119fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL3dpZGdldHMvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSk7aWYoKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3Qgc29jPU51bWJlcihkLmJtc3NvY3x8ZC5iYXR0ZXJ5TGV2ZWx8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8MCk7Y29uc3Qgdm9sdGFnZT1OdW1iZXIoZC52b2x0YWdlfHxkLmJhdHRlcnlWb2x0YWdlfHxkLmJtc1ZvbHRhZ2V8fGQudG90YWxWb2x0YWdlfHxkLmJhdHRlcnlUb3RhbFZvbHRhZ2V8fDApO2NvbnN0IGxuZ1N0cj1kZWVwUGljayhkLFsibG9uZ2l0dWRlIiwibG5nIiwibG9uIiwiZ3BzWCIsImxvbmdpdHVkZVZhbHVlIiwiY29vcmRYIiwieCJdKTtjb25zdCBsYXRTdHI9ZGVlcFBpY2soZCxbImxhdGl0dWRlIiwibGF0IiwiZ3BzWSIsImxhdGl0dWRlVmFsdWUiLCJjb29yZFkiLCJ5Il0pO2NvbnN0IGxvbmdpdHVkZT1OdW1iZXIobG5nU3RyKSxsYXRpdHVkZT1OdW1iZXIobGF0U3RyKTtyZXR1cm57YmF0dGVyeVBlcmNlbnQ6TWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsaXNGaW5pdGUoc29jKT9zb2M6MCkpLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MCx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGFkZHJlc3M6U3RyaW5nKGQuYWRkcmVzc3x8IiIpLnRyaW0oKSxsb2NhdGlvblRpbWU6U3RyaW5nKGQubG9jYXRpb24/LmxvY2F0aW9uVGltZXx8IiIpLnRyaW0oKSx2ZWhpY2xlTmFtZTpTdHJpbmcoZC52ZWhpY2xlTmFtZXx8IiIpLnRyaW0oKSx2ZWhpY2xlSW1hZ2VVcmw6U3RyaW5nKGQudmVoaWNsZVNjYWxlUGljVXJsfHxkLnZlaGljbGVQaWNVcmx8fCIiKS50cmltKCksaGVhZExvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHwiIikudHJpbSgpLGJhdHRlcnlQdWxsT3V0OlN0cmluZyhkLmJhdHRlcnlQdWxsT3V0RmxhZ3x8IiIpPT09IjEiLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQub25saW5lfHxkLm5ldFN0YXR1c3x8ZC50Ym94U3RhdHVzfHxkLmRldmljZU9ubGluZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiIscG93ZXJTdGF0dXM6U3RyaW5nKGQuYWNjU3RhdHVzfHxkLnBvd2VyU3RhdHVzfHxkLnZlaGljbGVTdGF0dXN8fGQuaWduaXRpb25TdGF0dXN8fGQucG93ZXJNb2RlfHxkLmFjY1N0YXRlfHxkLnBvd2VyU3RhdGV8fGQudmVoaWNsZVN0YXRlfHxkLmVuZ2luZVN0YXR1c3x8ZC5pc1Bvd2VyT258fGQucG93ZXJPbnx8IiIpLnRyaW0oKSxsb2NrU3RhdGU6U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxkLmNhckxvY2tTdGF0ZXx8ZC5kb29yTG9ja1N0YXRlfHxkLmxvY2tGbGFnfHxkLmlzTG9ja2VkfHxkLmxvY2tlZHx8ZC5jZW50cmFsTG9ja2luZ1N0YXR1c3x8IiIpLnRyaW0oKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/dW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsaGVhZGVycyk7aWYocmVzJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2ZWhpY2xlTG9jaz1waWNrSW90UHJvcChkLCJWZWhpY2xlTG9ja19TIik7Y29uc3QgaGVhZExvY2tJb3Q9cGlja0lvdFByb3AoZCwiSGVhZExvY2tTdGF0ZSIpO2NvbnN0IHRvcExvY2s9U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxoZWFkTG9ja0lvdHx8dmVoaWNsZUxvY2t8fCIiKS50cmltKCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntwb3dlclN0YXR1czpkZWVwUGljayhkLFsiYWNjU3RhdHVzIiwicG93ZXJTdGF0dXMiLCJ2ZWhpY2xlU3RhdHVzIiwiaWduaXRpb25TdGF0dXMiLCJwb3dlck1vZGUiLCJhY2NTdGF0ZSIsInBvd2VyU3RhdGUiLCJ2ZWhpY2xlU3RhdGUiLCJlbmdpbmVTdGF0dXMiLCJpc1Bvd2VyT24iLCJwb3dlck9uIiwiYWNjIl0pLnRyaW0oKSxsb2NrU3RhdGU6dG9wTG9jayxvbmxpbmU6U3RyaW5nKGQub25saW5lU3RhdHVzfHxkLnJpZGVTdGF0ZXx8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fCIiKS50cmltKCkscmlkZVN0YXRlOlN0cmluZyhkLnJpZGVTdGF0ZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiJ9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2FwcC92ZWhpY2xlL3RpcmUvbW9uaXRvcmluZz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IG1vbnRoPW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgW2hvbWVSZXMsbXlSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2hvbWVSaWRlSW5mbz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KSxodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL215UmlkZUluZm8/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImbW9udGg9Iittb250aCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pXSk7Y29uc3QgaD1ob21lUmVzPy5kYXRhfHxob21lUmVzfHx7fTtjb25zdCBkPW15UmVzPy5kYXRhfHxteVJlc3x8e307Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KGQucmlkZVJlY29yZExpc3QpP2QucmlkZVJlY29yZExpc3Q6W107Y29uc3QgdG9kYXlLZXk9bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZGF5PWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09dG9kYXlLZXkpfHxsaXN0W2xpc3QubGVuZ3RoLTFdfHx7fTtjb25zdCB5ZXN0PW5ldyBEYXRlKERhdGUubm93KCktODY0MDAwMDApO2NvbnN0IHllc3RLZXk9eWVzdC5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcoeWVzdC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKHllc3QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgeWQ9bGlzdC5maW5kKHg9PlN0cmluZyh4Py5kYXRlfHwiIik9PT15ZXN0S2V5KXx8e307cmV0dXJue3RvZGF5RGlzdGFuY2U6TnVtYmVyKGRheS5yaWRlTWlsZWFnZT8/aC5yaWRlTWlsZWFnZURheT8/MCksdG9kYXlEdXJhdGlvbjpOdW1iZXIoZGF5LnJpZGluZ1RpbWVEYXlVbml0TWludXRlPz9oLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCksdG9kYXlNYXhTcGVlZDpOdW1iZXIoZGF5Lm1heFNwZWVkPz8wKSx0b3RhbE1pbGVhZ2U6TnVtYmVyKGQucmlkZU1pbGVhZ2VUb3RhbD8/MCkseWVzdGVyZGF5RGlzdGFuY2U6TnVtYmVyKHlkLnJpZGVNaWxlYWdlPz8wKSxsYXN0UmlkZU1pbGVhZ2U6TnVtYmVyKGgubGFzdFJpZGVNaWxlYWdlPz8wKSxsYXN0UmlkZUR1cmF0aW9uOk51bWJlcihoLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCl9fWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwiYXBwaWQiOmNmZy5hcHAuYXBwSWQsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9iYXR0ZXJ5SW5mby8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZvbHRhZ2U9TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHxkLnRvdGFsVm9sdGFnZXx8ZC5iYXR0ZXJ5VG90YWxWb2x0YWdlfHxkLnZvbHx8ZC5iYXRWb2x0YWdlfHxkLmJhdHRlcnlWb2x8fDApO2NvbnN0IGN1cnJlbnQ9TnVtYmVyKGQuY3VycmVudHx8ZC5iYXR0ZXJ5Q3VycmVudHx8ZC5ibXNDdXJyZW50fHxkLmN1cnx8ZC5iYXR0ZXJ5Q3VyfHwwKTtjb25zdCBiYXR0ZXJ5VGVtcD1OdW1iZXIoZC5iYXR0ZXJ5VGVtcHx8ZC5iYXRUZW1wfHxkLnRlbXB8fGQudGVtcGVyYXR1cmV8fGQuYm1zVGVtcHx8ZC5iYXR0ZXJ5VGVtcGVyYXR1cmV8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8ZC5yZXNpZHVhbFJhbmdlfHwwKTtyZXR1cm57Y2hhcmdlU3RhdGU6U3RyaW5nKGQuY2hhcmdlU3RhdGVTdHJ8fGQuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKSx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGN1cnJlbnQ6aXNGaW5pdGUoY3VycmVudCk/Y3VycmVudDowLGJhdHRlcnlUZW1wOmlzRmluaXRlKGJhdHRlcnlUZW1wKT9iYXR0ZXJ5VGVtcDowLHNvYzpOdW1iZXIoZC5zb2N8fGQuYmF0dGVyeUxldmVsfHxkLmJtc3NvY3x8MCkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowfX1yZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX1jYXRjaChlKXtyZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImg1Iix7dmluTm86dmluTm99LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVyYXBwL2FwcC9zZXJ2aWNlL3JlY2hhcmdlL3ZlaGljbGUvZGV0YWlsP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3JldHVybntyZWNoYXJnZUVuZERhdGU6U3RyaW5nKHJlcy5kYXRhLnJlY2hhcmdlRW5kRGF0ZXx8IiIpLGxhc3RVc2VEYXRlOk51bWJlcihyZXMuZGF0YS5sYXN0VXNlRGF0ZSl8fDAsc2VydmljZVJlY2hhcmdlU3RhdHVzOlN0cmluZyhyZXMuZGF0YS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiKSx2ZWhpY2xlTmFtZTpTdHJpbmcocmVzLmRhdGEudmVoaWNsZU5hbWV8fCIiKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e2hhc1ZlaGljbGU6ZmFsc2UsdmVoaWNsZU5hbWU6IiIsdmVoaWNsZU1vZGVsOiIiLHZpbk5vOiIiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxiYXR0ZXJ5UGVyY2VudDowLHJlc2lkdWFsUmFuZ2VLbTowLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGZyb250UHJlc3N1cmU6IiIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxsYXN0UmlkZUR1cmF0aW9uOjAsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCx2ZWhpY2xlSW1hZ2VVcmw6IiIsc2VydmljZUVuZERhdGU6IiIsc2VydmljZVJlbWFpbkRheXM6MCxzZXJ2aWNlU3RhdHVzOiIiLHBvd2VyU3RhdHVzOiIiLGxvY2tTdGF0ZToiIixvbmxpbmU6IiIscmlkZVN0YXRlOiIiLGN1c2hpb25TdGF0ZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiJ9O3RyeXtjb25zdCBhbGxWZWhpY2xlcz1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpO2NvbnN0IHZlaGljbGVzPWFsbFZlaGljbGVzLmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZih2ZWhpY2xlcy5sZW5ndGg9PT0wKXJldHVybiByZXN1bHQ7Y29uc3Qgdj12ZWhpY2xlc1swXTtyZXN1bHQuaGFzVmVoaWNsZT10cnVlO3Jlc3VsdC52ZWhpY2xlTmFtZT12Lm5hbWU7cmVzdWx0LnZpbk5vPXYudmluTm87cmVzdWx0LnZlaGljbGVJbWFnZVVybD12LnBpYztyZXN1bHQudmVoaWNsZU1vZGVsPXYudmVoaWNsZVR5cGV8fCIiO2NvbnN0IFt3aWRnZXRzLHRpcmUscmlkZSxiYXR0ZXJ5LHNlcnZpY2UsaG9tZVBhZ2VdPWF3YWl0IFByb21pc2UuYWxsKFtmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoUmlkZUluZm8oYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hCYXR0ZXJ5Q2hhcmdlU3RhdGUoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+KHtjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjB9KSksZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCldKTtpZih3aWRnZXRzKXtyZXN1bHQuYmF0dGVyeVBlcmNlbnQ9d2lkZ2V0cy5iYXR0ZXJ5UGVyY2VudDtyZXN1bHQucmVzaWR1YWxSYW5nZUttPXdpZGdldHMucmVzaWR1YWxSYW5nZUttO3Jlc3VsdC52b2x0YWdlPXdpZGdldHMudm9sdGFnZTtyZXN1bHQuYWRkcmVzcz13aWRnZXRzLmFkZHJlc3M7cmVzdWx0LmxvY2F0aW9uVGltZT13aWRnZXRzLmxvY2F0aW9uVGltZTtyZXN1bHQucG93ZXJTdGF0dXM9d2lkZ2V0cy5wb3dlclN0YXR1c3x8IiI7cmVzdWx0LmxvY2tTdGF0ZT13aWRnZXRzLmxvY2tTdGF0ZXx8IiI7aWYod2lkZ2V0cy52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9d2lkZ2V0cy52ZWhpY2xlTmFtZTtpZih3aWRnZXRzLnZlaGljbGVJbWFnZVVybClyZXN1bHQudmVoaWNsZUltYWdlVXJsPXdpZGdldHMudmVoaWNsZUltYWdlVXJsO2lmKHdpZGdldHMub25saW5lKXJlc3VsdC5vbmxpbmU9d2lkZ2V0cy5vbmxpbmU7aWYod2lkZ2V0cy5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT13aWRnZXRzLmN1c2hpb25TdGF0ZTtpZih3aWRnZXRzLmxvbmdpdHVkZSE9PSIiJiZ3aWRnZXRzLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPXdpZGdldHMubG9uZ2l0dWRlO2lmKHdpZGdldHMubGF0aXR1ZGUhPT0iIiYmd2lkZ2V0cy5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9d2lkZ2V0cy5sYXRpdHVkZX1pZihob21lUGFnZSl7aWYoaG9tZVBhZ2UucG93ZXJTdGF0dXMpcmVzdWx0LnBvd2VyU3RhdHVzPWhvbWVQYWdlLnBvd2VyU3RhdHVzO2lmKGhvbWVQYWdlLmxvY2tTdGF0ZSlyZXN1bHQubG9ja1N0YXRlPWhvbWVQYWdlLmxvY2tTdGF0ZTtpZihob21lUGFnZS5vbmxpbmUpcmVzdWx0Lm9ubGluZT1ob21lUGFnZS5vbmxpbmU7aWYoaG9tZVBhZ2UucmlkZVN0YXRlKXJlc3VsdC5yaWRlU3RhdGU9aG9tZVBhZ2UucmlkZVN0YXRlO2lmKGhvbWVQYWdlLmN1c2hpb25TdGF0ZSlyZXN1bHQuY3VzaGlvblN0YXRlPWhvbWVQYWdlLmN1c2hpb25TdGF0ZTtpZigocmVzdWx0LmxvbmdpdHVkZT09PSIifHxyZXN1bHQubG9uZ2l0dWRlPT09dW5kZWZpbmVkKSYmaG9tZVBhZ2UubG9uZ2l0dWRlIT09IiImJmhvbWVQYWdlLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPWhvbWVQYWdlLmxvbmdpdHVkZTtpZigocmVzdWx0LmxhdGl0dWRlPT09IiJ8fHJlc3VsdC5sYXRpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxhdGl0dWRlIT09IiImJmhvbWVQYWdlLmxhdGl0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sYXRpdHVkZT1ob21lUGFnZS5sYXRpdHVkZX1pZih0aXJlKXtyZXN1bHQuZnJvbnRQcmVzc3VyZT10aXJlLmZyb250UHJlc3N1cmU7cmVzdWx0LnJlYXJQcmVzc3VyZT10aXJlLnJlYXJQcmVzc3VyZTtyZXN1bHQuZnJvbnRUZW1wPXRpcmUuZnJvbnRUZW1wO3Jlc3VsdC5yZWFyVGVtcD10aXJlLnJlYXJUZW1wfWlmKHJpZGUpe3Jlc3VsdC50b2RheURpc3RhbmNlPXJpZGUudG9kYXlEaXN0YW5jZTtyZXN1bHQudG9kYXlEdXJhdGlvbj1yaWRlLnRvZGF5RHVyYXRpb247cmVzdWx0LnRvZGF5TWF4U3BlZWQ9cmlkZS50b2RheU1heFNwZWVkO3Jlc3VsdC5sYXN0UmlkZU1pbGVhZ2U9cmlkZS5sYXN0UmlkZU1pbGVhZ2U7cmVzdWx0Lmxhc3RSaWRlRHVyYXRpb249cmlkZS5sYXN0UmlkZUR1cmF0aW9ufHwwO3Jlc3VsdC50b3RhbE1pbGVhZ2U9cmlkZS50b3RhbE1pbGVhZ2V8fDA7cmVzdWx0Lnllc3RlcmRheURpc3RhbmNlPXJpZGUueWVzdGVyZGF5RGlzdGFuY2V8fDB9cmVzdWx0LmNoYXJnZVN0YXRlPWJhdHRlcnkuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiO2lmKGJhdHRlcnkudm9sdGFnZSlyZXN1bHQudm9sdGFnZT1iYXR0ZXJ5LnZvbHRhZ2U7aWYoYmF0dGVyeS5jdXJyZW50KXJlc3VsdC5jdXJyZW50PWJhdHRlcnkuY3VycmVudDtpZihiYXR0ZXJ5LmJhdHRlcnlUZW1wKXJlc3VsdC5iYXR0ZXJ5VGVtcD1iYXR0ZXJ5LmJhdHRlcnlUZW1wO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZiYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbSlyZXN1bHQucmVzaWR1YWxSYW5nZUttPWJhdHRlcnkucmVzaWR1YWxSYW5nZUttO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZyZXN1bHQuYmF0dGVyeVBlcmNlbnQ+MCl7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1NYXRoLnJvdW5kKHJlc3VsdC5iYXR0ZXJ5UGVyY2VudCoxLjUpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSDotKblj7fmlbDmja7mi4nlj5YgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbk5vKXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7bGV0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpeeUqOaItyIsdXNlcklkLHNjb3JlOjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjAsdG9kYXlTY29yZTowLHNpZ25Db3VudDowLGxhc3Q3OltdLGVycm9yOm51bGwsdmVoaWNsZTp7aGFzVmVoaWNsZTpmYWxzZX19OwppZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHZlaGljbGVSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9KTtpZih2ZWhpY2xlUmVzLmNvZGU9PSIxMDAwMCImJnZlaGljbGVSZXMuZGF0YSl7Y29uc3QgYXV0b1VpZD1TdHJpbmcodmVoaWNsZVJlcy5kYXRhLnVzZXJJZHx8dmVoaWNsZVJlcy5kYXRhLnVpZHx8dmVoaWNsZVJlcy5kYXRhLmlkfHwiIik7aWYoYXV0b1VpZCl7dXNlcklkPWF1dG9VaWQ7cmVzdWx0LnVzZXJJZD11c2VySWQ7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBpZHg9YWNjb3VudHMuZmluZEluZGV4KGE9PmNsZWFuVG9rZW4oYS50b2tlbik9PT10b2tlbik7aWYoaWR4Pj0wJiYhYWNjb3VudHNbaWR4XS51c2VySWQpe2FjY291bnRzW2lkeF0udXNlcklkPXVzZXJJZDtzYXZlQWNjb3VudHMoYWNjb3VudHMpfX19fWNhdGNoKGUpe319CnRyeXtyZXN1bHQudmVoaWNsZT1hd2FpdCBmZXRjaFZlaGljbGVJbmZvKGFjYyxjZmcsdmluTm8pfWNhdGNoKGUpe3Jlc3VsdC52ZWhpY2xlPXtoYXNWZWhpY2xlOmZhbHNlfX0KdHJ5e2lmKCF1c2VySWQpe3Jlc3VsdC5lcnJvcj0i6K+35Zyo6K6+572u6aG15aGr5YaZ55So5oi3SUQifWVsc2V7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfSk7aWYoaW5mb1Jlcy5jb2RlPT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3Jlc3VsdC5zY29yZT1OdW1iZXIoaW5mb1Jlcy5kYXRhLnNjb3JlfHxpbmZvUmVzLmRhdGEuaW50ZWdyYWx8fGluZm9SZXMuZGF0YS5wb2ludHx8aW5mb1Jlcy5kYXRhLnBvaW50c3x8aW5mb1Jlcy5kYXRhLnRvdGFsU2NvcmV8fGluZm9SZXMuZGF0YS50b3RhbEludGVncmFsfHwwKX1lbHNlIGlmKGluZm9SZXMuY29kZT09IjQwMDAxInx8aW5mb1Jlcy5jb2RlPT00MDEpe3Jlc3VsdC5lcnJvcj0iVG9rZW7lt7Lov4fmnJ8ifWVsc2V7cmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blpLHotKU6ICIrKGluZm9SZXMubWVzc2FnZXx8aW5mb1Jlcy5jb2RlfHwi5pyq55+l6ZSZ6K+vIil9fX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5byC5bi4OiAiK1N0cmluZyhlKX0KdHJ5e2NvbnN0IGN1ck1vbnRoPW5vdy5nZXRGdWxsWWVhcigpKyItIisobm93LmdldE1vbnRoKCkrMSk7Y29uc3QgbGFzdERhdGU9bmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksbm93LmdldE1vbnRoKCktMSwxKTtjb25zdCBsYXN0TW9udGg9bGFzdERhdGUuZ2V0RnVsbFllYXIoKSsiLSIrKGxhc3REYXRlLmdldE1vbnRoKCkrMSk7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBbY3VyUmVzLGxhc3RSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9IitjdXJNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpjdXJNb250aH0sJycsY2ZnKX0pLGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2xhc3RNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpsYXN0TW9udGh9LCcnLGNmZyl9KV0pO2NvbnN0IGxhc3RMaXN0PShsYXN0UmVzLmNvZGU9PSIxMDAwMCImJmxhc3RSZXMuZGF0YSk/KGxhc3RSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgY3VyTGlzdD0oY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKT8oY3VyUmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGxpc3Q9Wy4uLmxhc3RMaXN0LC4uLmN1ckxpc3RdO2lmKGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSl7cmVzdWx0LnNpZ25Db3VudD1OdW1iZXIoY3VyUmVzLmRhdGEuc2lnbkNvdW50KXx8MH1jb25zdCB0b2RheUVudHJ5PWN1ckxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25lZFRvZGF5PSEhKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSk7cmVzdWx0LnRvZGF5U2NvcmU9dG9kYXlFbnRyeT8oTnVtYmVyKHRvZGF5RW50cnkuaW50ZWdyYWxTY29yZSl8fDApOjA7dHJ5e2NvbnN0IF90b2RheUxvZ3M9KGdldExvZ3MoKXx8W10pLmZpbHRlcihsPT5sJiZsLmRhdGU9PT10b2RheSYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcodXNlcklkKSYmbC5zdWNjZXNzKTtpZihfdG9kYXlMb2dzLmxlbmd0aD4wKXtjb25zdCBfdGw9X3RvZGF5TG9nc1swXTtyZXN1bHQudG9kYXlTY29yZT1OdW1iZXIoX3RsLnRvdGFsR2Fpbil8fHJlc3VsdC50b2RheVNjb3JlO3Jlc3VsdC50b2RheURldGFpbD17c2lnbmluU2NvcmU6TnVtYmVyKF90bC5zaWduaW5TY29yZSl8fDAsYmxpbmRCb3hTY29yZTpOdW1iZXIoX3RsLmJsaW5kQm94U2NvcmUpfHwwLGludGVyYWN0U2NvcmU6TnVtYmVyKF90bC5pbnRlcmFjdFNjb3JlKXx8MH19fWNhdGNoKGUpe31jb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtpZih0b2RheUlkeD49MCl7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfX1yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Zm9yKGxldCBpPTY7aT49MDtpLS0pe2NvbnN0IGQ9bmV3IERhdGUoKTtkLnNldERhdGUoZC5nZXREYXRlKCktaSk7Y29uc3QgZHM9ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZW50cnk9bGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTtyZXN1bHQubGFzdDcucHVzaCh7ZGF0ZTpkcy5zbGljZSg1KSxzaWduZWQ6ISEoZW50cnkmJihlbnRyeS5zaWduU3RhdHVlPT0zfHxlbnRyeS5zaWduU3RhdHVlPT01fHxlbnRyeS5zaWduU3RhdHVlPT0wKSksaXNUb2RheTppPT09MH0pfX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i562+5Yiw54q25oCB6I635Y+W5aSx6LSlIn0KdHJ5e2NvbnN0IHRva2VuQ2hlY2s9YXdhaXQgY2hlY2tUb2tlbihhY2MsY2ZnKTtyZXN1bHQudG9rZW5WYWxpZD10b2tlbkNoZWNrLnZhbGlkO3Jlc3VsdC50b2tlblJlYXNvbj10b2tlbkNoZWNrLnJlYXNvbnx8bnVsbDtpZih0b2tlbkNoZWNrLnZhbGlkJiZ0b2tlbkNoZWNrLnVzZXJOYW1lJiYoIXJlc3VsdC51c2VyTmFtZXx8cmVzdWx0LnVzZXJOYW1lPT09IuacquefpeeUqOaItyIpKXJlc3VsdC51c2VyTmFtZT10b2tlbkNoZWNrLnVzZXJOYW1lfWNhdGNoKGUpe3Jlc3VsdC50b2tlblZhbGlkPXRydWV9CnJldHVybiByZXN1bHR9CgpmdW5jdGlvbiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhKXtpZighZGF0YSlyZXR1cm4gbnVsbDtpZih0eXBlb2YgZGF0YT09PSJzdHJpbmcifHx0eXBlb2YgZGF0YT09PSJudW1iZXIiKXJldHVybiBTdHJpbmcoZGF0YSk7aWYoQXJyYXkuaXNBcnJheShkYXRhKSlyZXR1cm4gZ2V0UG9zdElkRnJvbURhdGEoZGF0YVswXSk7Y29uc3QgZGlyZWN0PWRhdGEudXVpZHx8ZGF0YS50dXVpZHx8ZGF0YS5wb3N0SWR8fGRhdGEucG9zdGlkfHxkYXRhLmFydGljbGVJZHx8ZGF0YS5hcnRpY2xlSUR8fGRhdGEuaWR8fGRhdGEuZGF0YUlkfHxkYXRhLnRpZDtpZihkaXJlY3QpcmV0dXJuIFN0cmluZyhkaXJlY3QpO2Zvcihjb25zdCBrZXkgb2YgWyJyZWNvcmRzIiwibGlzdCIsInJvd3MiLCJkYXRhIiwicmVzdWx0Il0pe2NvbnN0IHY9ZGF0YVtrZXldO2NvbnN0IHBpZD1nZXRQb3N0SWRGcm9tRGF0YSh2KTtpZihwaWQpcmV0dXJuIHBpZH1yZXR1cm4gbnVsbH0KCi8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjCA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpe2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOmZhbHNlLHNpZ25pblNjb3JlOjAsYmxpbmRCb3hTY29yZTowLGludGVyYWN0U2NvcmU6MCx0b3RhbEdhaW46MCxjb250aW51ZURheXM6MCxlcnJvcjpudWxsLHN0ZXBzOltdfTt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IG1vbnRoPXRvZGF5LnNsaWNlKDAsNyk7CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdG9kYXlFbnRyeT0oaW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSl7cmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpfWVsc2V7bGV0IHNpZ25SZXM9bnVsbCxzaWduTXNnPSLmnKrnn6UiO2ZvcihsZXQgYXQ9MTthdDw9MzthdCsrKXtzaWduUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHt9LCcnLGNmZyl9LHt9KTtpZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKWJyZWFrO3NpZ25Nc2c9c2lnblJlcz8ubWVzc2FnZXx8IuacquefpSI7aWYoL+ivt+eojXznqI3lkI5856iN5YCZfOmikee5gXznuYHlv5l86YeN6K+VLy50ZXN0KHNpZ25Nc2cpJiZhdDwzKXthd2FpdCBuZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsKGF0KzEpKjIwMDApKTtjb250aW51ZX1icmVha31pZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKXtjb25zdCBpbmZvUmVzMj1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRlPShpbmZvUmVzMj8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduaW5TY29yZT10ZT8oTnVtYmVyKHRlLmludGVncmFsU2NvcmUpfHwwKTowO3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDmiJDlip8gKyIrcmVzdWx0LnNpZ25pblNjb3JlKX1lbHNle3RyeXtjb25zdCBjaGs9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBjZT0oY2hrPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYoY2UmJihjZS5zaWduU3RhdHVlPT0zfHxjZS5zaWduU3RhdHVlPT01fHxjZS5zaWduU3RhdHVlPT0wKSlyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIik7ZWxzZSByZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9fX0KfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlvILluLg6ICIrZSl9CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgbGlzdD1pbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXTtjb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2NvbnN0IHNpZ25Db3VudD1OdW1iZXIoaW5mb1Jlcz8uZGF0YT8uc2lnbkNvdW50KXx8MDtpZihzaWduQ291bnQ+PTMwKXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL3N1cHBsZW1lbnRQcml6ZT9zdXBwbGVtZW50RGF0ZT0iK3RvZGF5LHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse3N1cHBsZW1lbnREYXRlOnRvZGF5fSwnJyxjZmcpfSk7aWYoYmxpbmRSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5ibGluZEJveFNjb3JlPU51bWJlcihibGluZFJlcz8uZGF0YT8uaW50ZWdyYWx8fGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbFNjb3JlfHwwKTtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS6I635b6XICsiK3Jlc3VsdC5ibGluZEJveFNjb3JlKyIgKCIrKGJsaW5kUmVzPy5kYXRhPy5wcml6ZXNOYW1lfHwi56ev5YiGIikrIikiKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq6Kej6ZSBKCIrc2lnbkNvdW50KyIvMzApIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LlvILluLg6ICIrZSl9CmNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eXx8e307bGV0IHBvc3RJZD1udWxsOwppZihjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSl7dHJ5e2NvbnN0IHBvc3RSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3Rjb250ZW50OiJsdWNreSJ9KTtpZihwb3N0UmVzPy5jb2RlPT0iMTAwMDAiKXtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEocG9zdFJlcy5kYXRhKTtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJblvILluLg6ICIrZSl9fQppZighcG9zdElkKXt0cnl7Y29uc3QgbGlzdFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW11bml0eS9taW5lQXJ0aWNsZUluZm8/dXNlcklkPSIrdXNlcklkKyImcGFnZT0xJnBhZ2VTaXplPTEwIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7Y29uc3QgcmF3TGlzdD1BcnJheS5pc0FycmF5KGxpc3RSZXM/LmRhdGEpP2xpc3RSZXMuZGF0YToobGlzdFJlcz8uZGF0YT8ucmVjb3Jkc3x8bGlzdFJlcz8uZGF0YT8ubGlzdHx8W10pO2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyYXdMaXN0KT9yYXdMaXN0OltdO2NvbnN0IG1pbmU9bGlzdC5maW5kKGl0PT5TdHJpbmcoaXQudXNlcklkfHxpdC5jcmVhdGVCeXx8aXQudWlkfHwiIik9PT1TdHJpbmcodXNlcklkKSk7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKG1pbmV8fGxpc3RbMF18fGxpc3RSZXM/LmRhdGEpfWNhdGNoKGUpe319CmlmKHBvc3RJZCl7aWYoY29tbS5lbmFibGVMaWtlIT09ZmFsc2Upe3RyeXtjb25zdCBsaWtlUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL3NvY2lhbENvbW11L2xpa2VGYXZvcml0ZUluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0SWQ6U3RyaW5nKHBvc3RJZCksa2luZEZsYWc6IjAifSk7aWYobGlrZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSl7dHJ5e2F3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1lbnRJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGlkOlN0cmluZyhwb3N0SWQpLHVzZXJJZDpTdHJpbmcodXNlcklkKSxjb21tZW50czoi5LuK5pel5bey562+5YiwIixzZW5kVG9zOiJbXG5cbl0ifSk7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuWujOaIkCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSl7dHJ5e2NvbnN0IHNoYXJlUmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvYXJ0aWNsZS9zaGFyZS8iK3Bvc3RJZCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7aWYoc2hhcmVSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvmiJDlip8gKzEiKX1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvaW50ZWdyYWwvYWRqdXN0QnlTaGFyZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UmJnBvc3RJZCl7dHJ5e2F3YWl0IGh0dHBEZWxldGUoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZS9kZWxldGVBcnRpY2xlP2FydGljbGVJZD0iK3Bvc3RJZCsiJnBvc3RUeXBlPTEiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtyZXN1bHQuc3RlcHMucHVzaCgi5Yqo5oCB5bey5Yig6ZmkIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIoOmZpOW8guW4uDogIitlKX19fQpyZXN1bHQudG90YWxHYWluPXJlc3VsdC5zaWduaW5TY29yZStyZXN1bHQuYmxpbmRCb3hTY29yZStyZXN1bHQuaW50ZXJhY3RTY29yZTtyZXN1bHQuc3VjY2Vzcz10cnVlfWNhdGNoKGUpe3Jlc3VsdC5lcnJvcj1TdHJpbmcoZSk7cmVzdWx0LnN0ZXBzLnB1c2goIuaJp+ihjOW8guW4uDogIitlKX1yZXR1cm4gcmVzdWx0fQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFZFSElDTEVfQUNUSU9OX1RFWFQ9e2ZpbmQ6IuefreaMieWvu+i9piIsbG91ZEZpbmQ6Ium4o+esm+mXqueBryIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6rIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07CmZ1bmN0aW9uIHZlaGljbGVDaGVja1JlcyhyZXMsb2tNc2cpe2lmKHJlcyYmIXJlcy5lcnJvciYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnfTtjb25zdCBlcnJUZXh0PVN0cmluZygocmVzJiYocmVzLmVycm9yfHxyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwiIikudG9Mb3dlckNhc2UoKTtpZihyZXMmJnJlcy5lcnJvciYmL3RpbWVvdXR8dGltZWQgb3V0fHRpbWUgb3V0fOivt+axgui2heaXti8udGVzdChlcnJUZXh0KSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnKyLvvIjlk43lupTotoXml7bkvYbovabovobpgJrluLjlt7LmiafooYzvvIzlj6/kuIvmi4nliLfmlrDnoa7orqTvvIkifTtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8KHJlcyYmcmVzLmVycm9yKXx8IuaMh+S7pOS4i+WPkeWksei0pSIsY29kZTpyZXMmJnJlcy5jb2RlfX0KYXN5bmMgZnVuY3Rpb24gdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpe3RyeXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7bGV0IHZpbj1hY2MudmluTm98fCIiO2lmKCF2aW4pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsYyk7aWYoIWxpc3R8fCFsaXN0Lmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq6I635Y+W5Yiw57uR5a6a6L2m6L6GKFZJTinvvIzor7fnoa7orqTotKblj7flt7Lnu5HlrprovabovoYifTt2aW49bGlzdFswXS52aW5Ob31jb25zdCBiYXNlPWJhc2VIZWFkZXJzKGFjYyk7aWYoYWN0aW9uPT09ImZpbmQiKXtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sIiIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2wvIit2aW4saCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuWvu+i9puaMh+S7pOW3suS4i+WPke+8jOi9pui+huW6lOmXqueBr+aPkOekuiIpfWlmKGFjdGlvbj09PSJsb3VkRmluZCIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe3BhcmFtOiI0Iix2aW46dmlufSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sVjIiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIum4o+esm+mXqueBr+aMh+S7pOW3suS4i+WPkSIpfWlmKGFjdGlvbj09PSJjdXNoaW9uIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7Y29tbW9uZDoiMjgiLGNvbW1vbmRQYXJhbToiMSIsdmN1OnZpbix2ZXJzaW9uOiJ2MiJ9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9wcm9wZXJ0eVR3by9vbmUiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuW8gOWdkOWeq+aMh+S7pOW3suS4i+WPke+8jOWdkOWeq+W6lOW8uei1tyIpfWlmKGFjdGlvbj09PSJ1bmxvY2sifHxhY3Rpb249PT0ibG9jayIpe2NvbnN0IHZLZXk9KGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKTtpZighdktleSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5bCa5pyq6YWN572u5LqR56uv5o6n6L2m5a+G6ZKl77ya6K+35Yiw44CM6K6+572uLeetvuWQjeWvhumSpemFjee9ruOAjeWhq+WGmeS6keerr+aOp+i9pkFFU+WvhumSpeW5tuS/neWtmOWQjuWGjeS9v+eUqOW8gC/lhbPplIEifTtpZighL15bMC05YS1mQS1GXXszMn0kLy50ZXN0KHZLZXkpKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLkupHnq6/mjqfovablr4bpkqXmoLzlvI/plJnor6/vvIjlupTkuLozMuS9jeWNgeWFrei/m+WItu+8ie+8jOivt+WIsOiuvue9rumhteaguOWvueWQjuS/neWtmCJ9O2NvbnN0IGxvY2tGbGFnPWFjdGlvbj09PSJ1bmxvY2siPyIxIjoiMCI7Y29uc3QgcGxhaW49J3tcbiAgImxvY2tGbGFnIiA6ICInK2xvY2tGbGFnKyciLFxuICAidmluTm8iIDogIicrdmluKyciXG59Jztjb25zdCBzZWNyZXQ9YWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbix2S2V5KTtjb25zdCBzZW5kQm9keT1KU09OLnN0cmluZ2lmeSh7c2VjcmV0OnNlY3JldH0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxwbGFpbixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvbmV0d29yay91bmxvY2siLGgsc2VuZEJvZHksMjUwMDApO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLGFjdGlvbj09PSJ1bmxvY2siPyLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiOiLkupHnq6/lhbPplIHmjIfku6Tlt7LkuIvlj5EiKX1yZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq55+l5pON5L2c57G75Z6LOiAiK2FjdGlvbn19Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuaOp+WItuW8guW4uDogIitTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGJhcmtQdXNoKGJhcmtLZXksdGl0bGUsYm9keSl7dHJ5e2xldCBzPVN0cmluZyhiYXJrS2V5fHwiIikudHJpbSgpLnJlcGxhY2UoL1wvKyQvLCIiKTtzPXMucmVwbGFjZSgvXmh0dHBzPzpcL1wvYXBpXC5kYXlcLmFwcFwvL2ksIiIpO2lmKCFzKXJldHVybntza2lwcGVkOnRydWV9O2xldCBiYXNlPSJodHRwczovL2FwaS5kYXkuYXBwIixrZXk9cztjb25zdCBtPXMubWF0Y2goL14oaHR0cHM/OlwvXC9bXi9dKylcLyguKykkL2kpO2lmKG0pe2Jhc2U9bVsxXTtrZXk9bVsyXX1rZXk9a2V5LnJlcGxhY2UoL15cLysvLCIiKTtjb25zdCB1PWJhc2UrIi8iK2VuY29kZVVSSUNvbXBvbmVudChrZXkpKyIvIitlbmNvZGVVUklDb21wb25lbnQodGl0bGUpKyIvIitlbmNvZGVVUklDb21wb25lbnQoYm9keSkrIj9ncm91cD1aRUVITyZzb3VuZD1iaXJkc29uZyI7cmV0dXJuIGF3YWl0IGh0dHBHZXQodSx7fSl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZyhlKX19fQoKLyogPT09PT09PT09PT09PT09PT0g5Luj55CG5qih5byP77yI5oyH5ZCR5Y6f6ISa5pysIHplZWhvLmJveCDlkI7nq6/vvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcHJveHlGZXRjaChwYXRoLG9wdHMpe2NvbnN0IHJhd0Jhc2U9Z2V0Q2ZnKCkuc2VydmVyQmFzZS5yZXBsYWNlKC9cLyskLywiIik7Y29uc3QgYmFzZT0od2luZG93Ll9fUEFORUxfTU9ERV9fJiYhcmF3QmFzZSk/IiI6cmF3QmFzZTtjb25zdCByPWF3YWl0IGZldGNoKGJhc2UrcGF0aCxvcHRzfHx7fSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX0KZnVuY3Rpb24gcHJveHlQb3N0KHBhdGgsYm9keSl7cmV0dXJuIHByb3h5RmV0Y2gocGF0aCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOnsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbiJ9LGJvZHk6SlNPTi5zdHJpbmdpZnkoYm9keXx8e30pfSl9Cgphc3luYyBmdW5jdGlvbiBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZyxsaW1pdCl7Y29uc3Qgb3V0PW5ldyBBcnJheShhY2NvdW50cy5sZW5ndGgpO2xldCBpPTA7YXN5bmMgZnVuY3Rpb24gd29ya2VyKCl7d2hpbGUoaTxhY2NvdW50cy5sZW5ndGgpe2NvbnN0IGlkeD1pKys7dHJ5e291dFtpZHhdPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjb3VudHNbaWR4XSxjZmcpfWNhdGNoKGUpe291dFtpZHhdPXt1c2VyTmFtZTphY2NvdW50c1tpZHhdLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjb3VudHNbaWR4XS51c2VySWQsc3VjY2VzczpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fX19Y29uc3Qgbj1NYXRoLm1heCgxLE1hdGgubWluKGxpbWl0fHwzLGFjY291bnRzLmxlbmd0aCkpO2F3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oe2xlbmd0aDpufSx3b3JrZXIpKTtyZXR1cm4gb3V0fQoKY29uc3QgQmFja2VuZD17CiAgYXN5bmMgc2VuZENvZGUocGhvbmUpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2VuZC1jb2RlIix7cGhvbmU6cGhvbmV9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i6aqM6K+B56CB5bey5Y+R6YCBIjoi5Y+R6YCB5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9hdXRoQ29kZS8iK2VuY29kZVVSSUNvbXBvbmVudChwaG9uZSk7CiAgICBjb25zdCBkPWF3YWl0IGh0dHBHZXQodXJsLHsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJHRVQiLHt9LCIiLGNmZyl9KTsKICAgIHJldHVybntvazpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCIsbWVzc2FnZTpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCI/IumqjOivgeeggeW3suWPkemAge+8jOivt+afpeaUtuefreS/oSI6KChkJiYoZC5tZXNzYWdlfHxkLm1zZykpfHwi5Y+R6YCB5aSx6LSlIil9OwogIH0sCiAgYXN5bmMgcGhvbmVMb2dpbihwaG9uZSxjb2RlLGJhc2ljQXV0aCl7CiAgICBjb25zdCBiYXNpYz1TdHJpbmcoYmFzaWNBdXRofHwiIikudHJpbSgpLnJlcGxhY2UoL15CYXNpY1xzKy9pLCIiKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3Bob25lLWxvZ2luIix7cGhvbmU6cGhvbmUsY29kZTpjb2RlLGJhc2ljQXV0aDpiYXNpY30pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLnmbvlvZXmiJDlip8iOiLnmbvlvZXlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHBheWxvYWQ9e3Bob25lOnBob25lLGF1dGhDb2RlOmNvZGV9OwogICAgY29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvdXNlci9sb2dpbkJ5UGhvbmUiOwogICAgY29uc3QgaGRyPXsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJQT1NUIix7fSxwYXlsb2FkLGNmZyl9OwogICAgaWYoYmFzaWMpaGRyWyJBdXRob3JpemF0aW9uIl09IkJhc2ljICIrYmFzaWM7CiAgICBjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QodXJsLGhkcixwYXlsb2FkLDIwMDAwKTsKICAgIGNvbnN0IHRva2VuSW5mbz1yZXMmJnJlcy5kYXRhJiZyZXMuZGF0YS50b2tlbkluZm87Y29uc3QgYWNjZXNzVG9rZW49dG9rZW5JbmZvJiZTdHJpbmcodG9rZW5JbmZvLmFjY2Vzc190b2tlbnx8IiIpOwogICAgaWYoIXJlc3x8U3RyaW5nKHJlcy5jb2RlKSE9PSIxMDAwMCJ8fCFhY2Nlc3NUb2tlbilyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi55m75b2V5aSx6LSl77yaIisoKHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCLpqozor4HnoIHmnInor6/miJblt7Lov4fmnJ8iKX07CiAgICBsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiOwogICAgdHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCIiLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2FjY2Vzc1Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkgwfSk7aWYoaW5mb1JlcyYmU3RyaW5nKGluZm9SZXMuY29kZSk9PT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcoaW5mb1Jlcy5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKGluZm9SZXMuZGF0YS5uaWNrTmFtZXx8IiIpO319Y2F0Y2goZSl7fQogICAgY29uc3QgbGlzdD1nZXRBY2NvdW50cygpO2xldCByZXBsYWNlZD1mYWxzZTsKICAgIGZvcihsZXQgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXtpZihsaXN0W2ldJiYoU3RyaW5nKGxpc3RbaV0udG9rZW58fCIiKT09PWFjY2Vzc1Rva2VufHwobGlzdFtpXS51c2VySWQmJnVzZXJJZCYmU3RyaW5nKGxpc3RbaV0udXNlcklkKT09PXVzZXJJZCkpKXtsaXN0W2ldLnRva2VuPWFjY2Vzc1Rva2VuO2lmKHVzZXJJZClsaXN0W2ldLnVzZXJJZD11c2VySWQ7aWYodXNlck5hbWUpbGlzdFtpXS51c2VyTmFtZT11c2VyTmFtZTtyZXBsYWNlZD10cnVlO2JyZWFrO319CiAgICBjb25zdCBuZXdBY2M9e3VzZXJOYW1lOnVzZXJOYW1lfHxwaG9uZSx1c2VySWQ6dXNlcklkLHRva2VuOmFjY2Vzc1Rva2VuLGJhcmtLZXk6IiIsdXNlckFnZW50OiIifTsKICAgIGlmKCFyZXBsYWNlZClsaXN0LnB1c2gobmV3QWNjKTsKICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgIHJldHVybntvazp0cnVlLG1lc3NhZ2U6cmVwbGFjZWQ/IueZu+W9leaIkOWKn++8jOW3suabtOaWsOivpei0puWPtyI6IueZu+W9leaIkOWKn++8jOW3sua3u+WKoOi0puWPtyJ9OwogIH0sCiAgYXN5bmMgZ2V0RGFzaGJvYXJkKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2RhdGEiKTsKICAgICAgaWYoZCYmZC5hY2NvdW50cylyZXR1cm57YWNjb3VudHM6ZC5hY2NvdW50cyx0aW1lc3RhbXA6ZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxjb25maWc6ZC5jb25maWd8fG51bGwsb2s6dHJ1ZX07CiAgICAgIHJldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLku6PnkIbmnI3liqHml6Dlk43lupQiLHJhdzpkfTsKICAgIH0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGRhdGE9YXdhaXQgZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsMyk7CiAgICByZXR1cm57YWNjb3VudHM6ZGF0YSx0aW1lc3RhbXA6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLG9rOnRydWV9OwogIH0sCiAgYXN5bmMgcnVuU2lnbmluKHVzZXJJZCxhbGwpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcnVuLXNpZ25pbiIsYWxsP3thbGw6dHJ1ZX06e3VzZXJJZDp1c2VySWR9KTtpZihkJiZkLnJlc3VsdHMpcmV0dXJue29rOnRydWUscmVzdWx0czpkLnJlc3VsdHN9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLmiafooYzlpLHotKUifX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IHJlc3VsdHM9W107Y29uc3QgdGFyZ2V0cz1hbGw/YWNjb3VudHM6YWNjb3VudHMuZmlsdGVyKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7CiAgICBpZighdGFyZ2V0cy5sZW5ndGgpcmV0dXJue29rOnRydWUscmVzdWx0czpbXX07CiAgICBmb3IoY29uc3QgYWNjIG9mIHRhcmdldHMpe2NvbnN0IHI9YXdhaXQgcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKTtyZXN1bHRzLnB1c2gocik7Y29uc3QgX2Q9bmV3IERhdGUoKTtjb25zdCBfZHM9X2QuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9kLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX2QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl9kLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X2RzLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6ci51c2VyTmFtZSx1c2VySWQ6ci51c2VySWQsc3VjY2VzczpyLnN1Y2Nlc3MsdG90YWxHYWluOnIudG90YWxHYWluLHNpZ25pblNjb3JlOnIuc2lnbmluU2NvcmUsYmxpbmRCb3hTY29yZTpyLmJsaW5kQm94U2NvcmUsaW50ZXJhY3RTY29yZTpyLmludGVyYWN0U2NvcmUsY29udGludWVEYXlzOnIuY29udGludWVEYXlzLGVycm9yOnIuZXJyb3Isc3RlcHM6ci5zdGVwc30pO2lmKHIuc3VjY2VzcyYmYWNjLmJhcmtLZXkmJlN0cmluZyhhY2MuYmFya0tleSkudHJpbSgpKXt0cnl7YXdhaXQgYmFya1B1c2goYWNjLmJhcmtLZXksIuaegeaguOetvuWIsOaIkOWKnyDCtyAiKyhyLnVzZXJOYW1lfHwiIiksIuS7iuaXpeiOt+W+lyAiK3IudG90YWxHYWluKyIg5YiG77yI562+5YiwIityLnNpZ25pblNjb3JlKyIgLyDnm7Lnm5IiK3IuYmxpbmRCb3hTY29yZSsiIC8g5LqS5YqoIityLmludGVyYWN0U2NvcmUrIu+8ie+8jOi/nuetviAiK3IuY29udGludWVEYXlzKyIg5aSpIil9Y2F0Y2goZSl7fX19CiAgICByZXR1cm57b2s6dHJ1ZSxyZXN1bHRzfTsKICB9LAogIGFzeW5jIHZlaGljbGVDdHJsKHVzZXJJZCxhY3Rpb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sIix7dXNlcklkOnVzZXJJZCxhY3Rpb246YWN0aW9ufSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpfX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2xldCBhY2M9YWNjb3VudHMuZmluZChhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpO2lmKCFhY2MmJmFjY291bnRzLmxlbmd0aClhY2M9YWNjb3VudHNbMF07aWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq5om+5Yiw6LSm5Y+377yM6K+35YWI5Zyo6K6+572u6aG15re75YqgIn07aWYoIVZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6Z2e5rOV5pON5L2c57G75Z6LIn07Y29uc3Qgcj1hd2FpdCB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyk7Y29uc3QgX3ZkPW5ldyBEYXRlKCk7Y29uc3QgX3Zkcz1fdmQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF92ZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF92ZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X3ZkLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X3Zkcyx0eXBlOiJ2ZWhpY2xlIixhY3Rpb246YWN0aW9uLGFjdGlvblRleHQ6VkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dfHwi6L2m6L6G5o6n5Yi2Iix1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ISFyLm9rLG1lc3NhZ2U6ci5tZXNzYWdlfHwiIixlcnJvcjpyLm9rPyIiOihyLm1lc3NhZ2V8fCLmjIfku6TlpLHotKUiKX0pO3JldHVybiByOwogIH0sCiAgYXN5bmMgZ2V0TG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9nZXQtbG9ncyIpO3JldHVybiBkJiZkLmxvZ3M/ZC5sb2dzOltdfXJldHVybiBnZXRMb2dzKCl9LAogIGFzeW5jIGNsZWFyTG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2NsZWFyLWxvZ3MiKTtyZXR1cm4gISFkLm9rfXJldHVybiBjbGVhckxvZ3MoKX0sCiAgYXN5bmMgc2F2ZUNvbmZpZyhjKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsYyk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUNmZyhjKX0sCiAgYXN5bmMgc2F2ZUFjY291bnRzKGxpc3Qpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtYWNjb3VudHMiLHthY2NvdW50czpsaXN0fSk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUFjY291bnRzKGxpc3QpfSwKICBhc3luYyBnZXRVc2VyaWQodG9rZW4pe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2dldC11c2VyaWQiLHt0b2tlbjp0b2tlbn0pO3JldHVybntvazohIWQub2ssdXNlcklkOmQudXNlcklkfHwiIix1c2VyTmFtZTpkLnVzZXJOYW1lfHwiIixlcnJvcjpkLmVycm9yfHwiIn19cmV0dXJuIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sZ2V0Q2ZnKCkpfSwKICBhc3luYyBnZXRDb25maWcoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvY29uZmlnIik7aWYoZCYmZC5jb25maWcpcmV0dXJue29rOnRydWUsY29uZmlnOmQuY29uZmlnfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi6I635Y+W6YWN572u5aSx6LSlIn19cmV0dXJue29rOnRydWUsY29uZmlnOmdldENmZygpfX0sCiAgYXN5bmMgZ2V0QWNjb3VudHNGdWxsKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FjY291bnRzIik7cmV0dXJuIEFycmF5LmlzQXJyYXkoZCYmZC5hY2NvdW50cyk/ZC5hY2NvdW50czpbXX1yZXR1cm4gZ2V0QWNjb3VudHMoKX0sCiAgYXN5bmMgYmFja3VwKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmFja3VwIik7cmV0dXJuIGQmJmQub2s/ZDpudWxsfQogICAgcmV0dXJue29rOnRydWUsYXBwOiLmnoHmoLhaRUVITyIsdHlwZToiemVlaG9fYmFja3VwIix2ZXJzaW9uOkFQUF9WRVJTSU9OLHRpbWU6Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLGFjY291bnRzOmdldEFjY291bnRzKCksY29uZmlnOmdldENmZygpfQogIH0sCiAgYXN5bmMgcmVzdG9yZUJhY2t1cChqc29uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2ltcG9ydCIse2pzb246anNvbn0pO3JldHVybiBkfHx7b2s6ZmFsc2UsZXJyb3I6IuWQjuerr+aXoOWTjeW6lCJ9fQogICAgdHJ5ewogICAgICBjb25zdCBiPXR5cGVvZiBqc29uPT09InN0cmluZyI/SlNPTi5wYXJzZShqc29uKTpqc29uOwogICAgICBpZighYnx8KGIudHlwZSE9PSJ6ZWVob19iYWNrdXAiJiYhQXJyYXkuaXNBcnJheShiLmFjY291bnRzKSkpcmV0dXJue29rOmZhbHNlLGVycm9yOiLlpIfku73moLzlvI/kuI3mraPnoa4ifTsKICAgICAgY29uc3QgbGlzdD0oYi5hY2NvdW50c3x8W10pLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCIiLHVzZXJJZDphLnVzZXJJZHx8IiIsdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXl8fCIiKSx1c2VyQWdlbnQ6YS51c2VyQWdlbnR8fCIifSkpOwogICAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICAgIGlmKGIuY29uZmlnJiZ0eXBlb2YgYi5jb25maWc9PT0ib2JqZWN0Iil7CiAgICAgICAgY29uc3QgY3VyPWdldENmZygpOwogICAgICAgIHNhdmVDZmcoewogICAgICAgICAgYXBwOnthcHBJZDpiLmNvbmZpZy5hcHA/LmFwcElkfHxjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5hcHA/LmFwcFNlY3JldHx8Y3VyLmFwcC5hcHBTZWNyZXR9LAogICAgICAgICAgaDU6e2FwcElkOmIuY29uZmlnLmg1Py5hcHBJZHx8Y3VyLmg1LmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5oNT8uYXBwU2VjcmV0fHxjdXIuaDUuYXBwU2VjcmV0fSwKICAgICAgICAgIGNvbW11bml0eTp7ZW5hYmxlUG9zdDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgICAgICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCl8fGN1ci52ZWhpY2xlQWVzS2V5LAogICAgICAgICAgdmVoaWNsZUNvbnRyb2xSaXNrOlN0cmluZyhiLmNvbmZpZy52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCksCiAgICAgICAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGIuY29uZmlnLmF1dG9SZWZyZXNoU2VjKSwKICAgICAgICAgIHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2UKICAgICAgICB9KTsKICAgICAgfQogICAgICByZXR1cm57b2s6dHJ1ZSxjb3VudDpsaXN0Lmxlbmd0aH07CiAgICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19CiAgfSwKICAvKiAtLS0tIHYyLjE0Ljkg5paw5aKe5ZCO56uv6IO95Yqb77yI5LuF5Luj55CG5qih5byP77yJIC0tLS0gKi8KICBhc3luYyBpbnRlZ3JhbCh1c2VySWQscGFnZSl7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19JTlRFR1JBTDsKICAgIGlmKGlzUHJveHlNb2RlKCkpe3JldHVybiBhd2FpdCBwcm94eUZldGNoKCIvYXBpL2ludGVncmFsP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKSsiJnBhZ2U9IisocGFnZXx8MSkpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLnp6/liIblip/og73ku4XmlK/mjIHku6PnkIbmqKHlvI/vvIhpT1MgQXBwIC8g5qGM6Z2i54mIIC8gTG9vbu+8iSJ9CiAgfSwKICBhc3luYyBzdXBwbGVtZW50KGFjdGlvbix1c2VySWQscGFyYW1zKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBhY3Rpb249PT0ibW9udGgiP3tvazp0cnVlLGRhdGE6e25vd1NpZ25EZXRhaWxWb3M6ZGVtb0NhbCgpfX06KERFTU9fU1VQUExFTUVOVFthY3Rpb25dfHx7b2s6dHJ1ZSxkYXRhOjF9KTsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBsZXQgcT0iL2FwaS9zdXBwbGVtZW50P2FjdGlvbj0iK2VuY29kZVVSSUNvbXBvbmVudChhY3Rpb24pKyImdXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpOwogICAgICBwYXJhbXM9cGFyYW1zfHx7fTtPYmplY3Qua2V5cyhwYXJhbXMpLmZvckVhY2goaz0+e3ErPSImIitlbmNvZGVVUklDb21wb25lbnQoaykrIj0iK2VuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba10pfSk7CiAgICAgIHJldHVybiBhd2FpdCBwcm94eUZldGNoKHEpCiAgICB9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuihpeetvuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHZlaGljbGVNb25pdG9yKHVzZXJJZCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIERFTU9fTU9OSVRPUjsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL3ZlaGljbGUtbW9uaXRvcj91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui9pui+huebkeaOp+S7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyB2ZWhpY2xlQ29udHJvbEV4dChib2R5KXsKICAgIGlmKGlzRGVtbygpKXJldHVybiAoYm9keSYmYm9keS5hY3Rpb249PT0ib3B0aW9ucyIpP0RFTU9fQ1RSTF9PUFRTOntvazp0cnVlLG1lc3NhZ2U6Iua8lOekuuaooeW8j++8muaMh+S7pOacquecn+WunuS4i+WPkSJ9OwogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5UG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wtZXh0Iixib2R5KX0KICAgIHJldHVybntvazpmYWxzZSxtZXNzYWdlOiLovabmjqfmianlsZXku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgaW5mb0NlbnRlcih1c2VySWQsdmluKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBERU1PX0lORk87CiAgICBpZihpc1Byb3h5TW9kZSgpKXtsZXQgcT0iL2FwaS9pbmZvLWNlbnRlcj91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuS/oeaBr+S4reW/g+S7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBpbnN0YWxsSW5mbygpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FwcC1pbnN0YWxsLWluZm8iKTtyZXR1cm4gZHx8bnVsbH0KICAgIHJldHVybiBudWxsCiAgfQp9OwovKiA9PT09PT09PT09PT09PT09PSDpnaLmnb/mlbDmja7lkIzmraXvvIjpnaLmnb/mqKHlvI/vvJrorr7nva7pobXku47ohJrmnKzlkI7nq6/or7votKblj7fkuI7phY3nva7vvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlSZW1vdGVDZmcoYyl7CiAgaWYoIWN8fHR5cGVvZiBjIT09Im9iamVjdCIpcmV0dXJuOwogIGNvbnN0IGxvY2FsPWdldENmZygpOwogIHNhdmVDZmcoewogICAgYXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fGxvY2FsLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8bG9jYWwuYXBwLmFwcFNlY3JldH0sCiAgICBoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fGxvY2FsLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fGxvY2FsLmg1LmFwcFNlY3JldH0sCiAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpfHxsb2NhbC52ZWhpY2xlQWVzS2V5LAogICAgdmVoaWNsZUNvbnRyb2xSaXNrOlN0cmluZyhjLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksCiAgICBzZXJ2ZXJCYXNlOmxvY2FsLnNlcnZlckJhc2UsCiAgICBhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsCiAgICBhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLAogICAgdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsCiAgICB3aWRnZXRWZWhpY2xlOlN0cmluZyhjLndpZGdldFZlaGljbGV8fCIiKSwKICAgIGN1c3RvbUJnOlN0cmluZyhjLmN1c3RvbUJnfHwiIikKICB9KTsKfQpsZXQgcGFuZWxTeW5jaW5nPWZhbHNlOwphc3luYyBmdW5jdGlvbiBlbnN1cmVQYW5lbERhdGEoZm9yY2UpewogIGlmKCFpc1Byb3h5TW9kZSgpfHxsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXJldHVybjsKICBpZihwYW5lbFN5bmNpbmcpcmV0dXJuOwogIGlmKCFmb3JjZSYmU1RBVEUucGFuZWxMb2FkZWQpcmV0dXJuOwogIHBhbmVsU3luY2luZz10cnVlOwogIHRyeXsKICAgIGNvbnN0IFtjLGFdPWF3YWl0IFByb21pc2UuYWxsKFtCYWNrZW5kLmdldENvbmZpZygpLEJhY2tlbmQuZ2V0QWNjb3VudHNGdWxsKCldKTsKICAgIGlmKGEmJmEubGVuZ3RoKXtTVEFURS5wYW5lbEFjY291bnRzPWF9CiAgICBpZihjJiZjLm9rJiZjLmNvbmZpZylhcHBseVJlbW90ZUNmZyhjLmNvbmZpZyk7CiAgICBTVEFURS5wYW5lbExvYWRlZD10cnVlOwogIH1jYXRjaChlKXt9CiAgcGFuZWxTeW5jaW5nPWZhbHNlOwp9Ci8qID09PT09PT09PT09PT09PT09IOWbvuaghyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBJPXsKY2hlY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDYgOSAxN2wtNS01Ii8+PC9zdmc+JywKeDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPicsCnphcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDggMHY0Ii8+PC9zdmc+JywKdW5sb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgNy41LTEuNyIvPjwvc3ZnPicsCmJlbGw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE4IDhhNiA2IDAgMSAwLTEyIDBjMCA3LTMgOS0zIDloMThzLTMtMi0zLTkiLz48cGF0aCBkPSJNMTMuNyAyMWEyIDIgMCAwIDEtMy40IDAiLz48L3N2Zz4nLAp2b2w6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTExIDUgNiA5SDJ2Nmg0bDUgNFY1eiIvPjxwYXRoIGQ9Ik0xNS41IDguNWE1IDUgMCAwIDEgMCA3TTE4LjUgNS41YTkgOSAwIDAgMSAwIDEzIi8+PC9zdmc+JywKc2VhdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA0aDE0djdhNCA0IDAgMCAxLTQgNEg5YTQgNCAwIDAgMS00LTRWNHoiLz48cGF0aCBkPSJNOSAxNXY1aDZ2LTUiLz48L3N2Zz4nLApwaW46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYzAgNi04IDEyLTggMTJzLTgtNi04LTEyYTggOCAwIDAgMSAxNiAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4nLAp0aXJlOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMy41Ii8+PHBhdGggZD0iTTEyIDN2NS41TTEyIDE1LjVWMjFNMyAxMmg1LjVNMTUuNSAxMkgyMSIvPjwvc3ZnPicsCmJvbHQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCnRoZXJtbzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMTQuNzZWNWEyIDIgMCAxIDAtNCAwdjkuNzZhNCA0IDAgMSAwIDQgMHoiLz48L3N2Zz4nLApjYWw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMyIvPjxwYXRoIGQ9Ik0xNiAydjRNOCAydjRNMyAxMGgxOCIvPjwvc3ZnPicsCmNhcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMyA2LjUgNy41QTIgMiAwIDAgMSA4LjQgNmg3LjJhMiAyIDAgMCAxIDEuOSAxLjVMMTkgMTMiLz48cGF0aCBkPSJNNCAxM2gxNmExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxLTEgMWgtMWEyIDIgMCAxIDEtNCAwSDlhMiAyIDAgMSAxLTQgMEg0YTEgMSAwIDAgMS0xLTF2LTNhMSAxIDAgMCAxIDEtMXoiLz48L3N2Zz4nLApzY29vdGVyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPicsCnBsdWc6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMnY2TTE1IDJ2Nk03IDhoMTB2NGE1IDUgMCAwIDEtMTAgMFY4ek0xMiAxN3Y1Ii8+PC9zdmc+JywKY2xvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxwYXRoIGQ9Ik0xMiA3djVsMyAzIi8+PC9zdmc+JywKd2lmaTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMi41YTEwIDEwIDAgMCAxIDE0IDBNOC41IDE2YTUgNSAwIDAgMSA3IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4nLAphbGVydDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOXY0TTEyIDE3aC4wMSIvPjxwYXRoIGQ9Ik0xMC4zIDMuOSAxLjggMThhMiAyIDAgMCAwIDEuNyAzaDE3YTIgMiAwIDAgMCAxLjctM0wxMy43IDMuOWEyIDIgMCAwIDAtMy40IDB6Ii8+PC9zdmc+JywKd2FybjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMyAyIDIxaDIwTDEyIDN6Ii8+PHBhdGggZD0iTTEyIDEwdjVNMTIgMThoLjAxIi8+PC9zdmc+JywKa3Y6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiByeD0iMyIvPjxwYXRoIGQ9Ik03IDloM00xNCAxNWgzTTEwIDloLjAxTTE3IDE1aC4wMSIvPjwvc3ZnPicsCmtleTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI4IiBjeT0iMTUiIHI9IjQuNSIvPjxwYXRoIGQ9Ik0xMS4yIDExLjggMjAgM00xNiA3bDMgM00xMyAxMGwyIDIiLz48L3N2Zz4nLAp1c2VyczonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI5IiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik0yIDIxYTcgNyAwIDAgMSAxNCAwTTE2IDQuNmE0IDQgMCAwIDEgMCA2LjhNMTkgMjFhNi41IDYuNSAwIDAgMC0zLTUuNSIvPjwvc3ZnPicsCm1hcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAzIDMuNSA1djE2TDkgMTlsNiAyIDUuNS0yVjNMMTUgNSA5IDN6Ii8+PHBhdGggZD0iTTkgM3YxNk0xNSA1djE2Ii8+PC9zdmc+Jwp9OwoKLyogPT09PT09PT09PT09PT09PT0g5Z+656GAIFVJID09PT09PT09PT09PT09PT09ICovCmxldCB0b2FzdFRpbWVyPW51bGw7CmZ1bmN0aW9uIHRvYXN0KG1zZyx0eXBlKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidG9hc3QiKTtlbC5jbGFzc05hbWU9dHlwZXx8ImluZm8iO2VsLmlubmVySFRNTD0odHlwZT09PSJlcnIiP0kueDp0eXBlPT09Im9rIj9JLmNoZWNrOkkud2lmaSkrJzxzcGFuPicrZXNjKG1zZykrJzwvc3Bhbj4nO3JlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+ZWwuY2xhc3NMaXN0LmFkZCgic2hvdyIpKTtjbGVhclRpbWVvdXQodG9hc3RUaW1lcik7dG9hc3RUaW1lcj1zZXRUaW1lb3V0KCgpPT5lbC5jbGFzc0xpc3QucmVtb3ZlKCJzaG93IiksMjYwMCl9Ci8qIHYyLjE0LjEwIOS/ruWkje+8muaXp+eJiOaKiuWbnuiwg+WHveaVsOa6kOeggeebtOaOpeaLvOi/myBvbmNsaWNrIOWxnuaAp++8jGFzeW5jIOWbnuiwg+WGheeahOWPjOW8leWPt+S8muaIquaWrSBIVE1MIOWxnuaAp++8jAogICDlr7zoh7TooaXnrb4v5YWR5o2i6KGl562+5Y2hL+mYsuebl+W4g+aOp+etieOAjOehruWumuOAjeaMiemSrueCueWHu+aXoOWPjeW6lOOAguaUueS4uuaaguWtmOWbnuiwg+OAgeaMiemSruiwg+eUqOWFqOWxgCBjb25maXJtWWVzKCkgKi8KbGV0IF9fY29uZmlybUFjdD1udWxsOwpmdW5jdGlvbiBjb25maXJtRGlhbG9nKHRpdGxlLGRlc2Msb25ZZXMseWVzVHh0KXtfX2NvbmZpcm1BY3Q9b25ZZXM7Y29uc3QgbGF5ZXI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpO2xheWVyLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY29uZmlybSI+PGRpdiBjbGFzcz0iY3QiPicrZXNjKHRpdGxlKSsnPC9kaXY+PGRpdiBjbGFzcz0iY2QiPicrZGVzYysnPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKSI+5Y+W5raIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0ieWVzIiBvbmNsaWNrPSJjb25maXJtWWVzKCkiPicrZXNjKHllc1R4dHx8IuehruWumiIpKyc8L2J1dHRvbj48L2Rpdj48L2Rpdj4nO2xheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpfQpmdW5jdGlvbiBjb25maXJtWWVzKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYT1fX2NvbmZpcm1BY3Q7X19jb25maXJtQWN0PW51bGw7aWYoYT09bnVsbClyZXR1cm47dHJ5e2lmKHR5cGVvZiBhPT09ImZ1bmN0aW9uIil7YSgpfWVsc2UgaWYodHlwZW9mIGE9PT0ic3RyaW5nIil7Y29uc3Qgcj1uZXcgRnVuY3Rpb24oInJldHVybiAoIithKyIpIikoKTtpZih0eXBlb2Ygcj09PSJmdW5jdGlvbiIpcigpfX1jYXRjaChlKXt9fQpmdW5jdGlvbiBjbG9zZUNvbmZpcm0oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIikuY2xhc3NMaXN0LmFkZCgiaGlkZGVuIil9CmZ1bmN0aW9uIG9wZW5TaGVldCh0aXRsZSxpY29uLGh0bWwpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldFRpdGxlIikuaW5uZXJIVE1MPWljb24rJzxzcGFuPicrZXNjKHRpdGxlKSsnPC9zcGFuPic7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0Qm9keSIpLmlubmVySFRNTD1odG1sO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSJoaWRkZW4ifQpmdW5jdGlvbiBjbG9zZVNoZWV0KCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9IiJ9CmZ1bmN0aW9uIGZtdFRpbWUoaXNvKXt0cnl7Y29uc3QgZD1uZXcgRGF0ZShpc28pO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTtyZXR1cm4gZC5nZXRGdWxsWWVhcigpKyItIitwKGQuZ2V0TW9udGgoKSsxKSsiLSIrcChkLmdldERhdGUoKSkrIiAiK3AoZC5nZXRIb3VycygpKSsiOiIrcChkLmdldE1pbnV0ZXMoKSkrIjoiK3AoZC5nZXRTZWNvbmRzKCkpfWNhdGNoKGUpe3JldHVybiIifX0KCi8qID09PT09PT09PT09PT09PT09IOmhtemdouWIh+aNoiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzd2l0Y2hUYWIodGFiKXsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIudGFiIikuZm9yRWFjaCh0PT50LmNsYXNzTGlzdC50b2dnbGUoIm9uIix0LmRhdGFzZXQudGFiPT09dGFiKSk7CiAgY29uc3QgcGFnZXM9e2hvbWU6InBhZ2VIb21lIixwb2ludHM6InBhZ2VQb2ludHMiLHZlaGljbGU6InBhZ2VWZWhpY2xlIixsb2dzOiJwYWdlTG9ncyIsY2ZnOiJwYWdlQ2ZnIn07CiAgT2JqZWN0LmtleXMocGFnZXMpLmZvckVhY2goaz0+e2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhZ2VzW2tdKTtpZihlbCllbC5jbGFzc0xpc3QudG9nZ2xlKCJoaWRkZW4iLGshPT10YWIpfSk7CiAgLy8g56uL5Y2z562+5Yiw5oKs5rWu5oyJ6ZKu5LuF6aaW6aG15pi+56S6CiAgY29uc3QgZmFiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTtpZihmYWIpZmFiLnN0eWxlLmRpc3BsYXk9KHRhYj09PSJob21lIj8iZmxleCI6Im5vbmUiKTsKICBpZih0YWI9PT0icG9pbnRzIilyZW5kZXJQb2ludHMoKTsKICBpZih0YWI9PT0idmVoaWNsZSIpe3JlbmRlclZlaGljbGVQYWdlKCl9CiAgaWYodGFiPT09ImxvZ3MiKXJlbmRlckxvZ3MoKTsKICBpZih0YWI9PT0iY2ZnIilyZW5kZXJDZmcoKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6Ieq5Yqo5Yi35pawID09PT09PT09PT09PT09PT09ICovCmxldCByZWZyZXNoVGltZXI9bnVsbCxyZWZyZXNoTGVmdD02MDsKZnVuY3Rpb24gc3RhcnRBdXRvUmVmcmVzaChzZWMpe3N0b3BBdXRvUmVmcmVzaCgpO3JlZnJlc2hMZWZ0PXNlY3x8Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWM7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaFRpbWVyPXNldEludGVydmFsKCgpPT57cmVmcmVzaExlZnQtLTtpZihyZWZyZXNoTGVmdDw9MCl7cmVmcmVzaExlZnQ9MDt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdXBkYXRlQ291bnRDaGlwKCl9LDEwMDApfQpmdW5jdGlvbiBzdG9wQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpe2NsZWFySW50ZXJ2YWwocmVmcmVzaFRpbWVyKTtyZWZyZXNoVGltZXI9bnVsbH19CmZ1bmN0aW9uIHVwZGF0ZUNvdW50Q2hpcCgpe2NvbnN0IGNoaXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50Q2hpcCIpO2NvbnN0IHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRUeHQiKTtjb25zdCBhcmM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50QXJjIik7Y29uc3Qgc2VjPWdldENmZygpLmF1dG9SZWZyZXNoU2VjfHw2MDtpZighY2hpcClyZXR1cm47aWYocmVmcmVzaFRpbWVyKXtjaGlwLmNsYXNzTGlzdC5hZGQoIm9uIik7dHh0LnRleHRDb250ZW50PXJlZnJlc2hMZWZ0KyJzIjtjb25zdCBDPTIqTWF0aC5QSSo1LjY7YXJjLnNldEF0dHJpYnV0ZSgic3Ryb2tlLWRhc2hvZmZzZXQiLFN0cmluZyhDKigxLXJlZnJlc2hMZWZ0L3NlYykpKX1lbHNle2NoaXAuY2xhc3NMaXN0LnJlbW92ZSgib24iKTt0eHQudGV4dENvbnRlbnQ9IuaJi+WKqCJ9fQpmdW5jdGlvbiB0b2dnbGVBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcilzdG9wQXV0b1JlZnJlc2goKTtlbHNlIHN0YXJ0QXV0b1JlZnJlc2goKTt1cGRhdGVDb3VudENoaXAoKX0KCi8qID09PT09PT09PT09PT09PT09IOS4i+aLieWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwooZnVuY3Rpb24oKXtjb25zdCB3cmFwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJXcmFwIiksaW5kPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJJbmQiKSx0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clR4dCIpLHNwaW49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clNwaW4iKTtsZXQgc3RhcnRZPTAscHVsbGluZz1mYWxzZSxkaXN0YW5jZT0wO2NvbnN0IFRIPTY0Owp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoc3RhcnQiLGU9PntpZih3aW5kb3cuc2Nyb2xsWTw9MCYmZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikmJiFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKS5jbGFzc0xpc3QuY29udGFpbnMoImhpZGRlbiIpKXtzdGFydFk9ZS50b3VjaGVzWzBdLmNsaWVudFk7cHVsbGluZz10cnVlO2Rpc3RhbmNlPTB9fSx7cGFzc2l2ZTp0cnVlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2htb3ZlIixlPT57aWYoIXB1bGxpbmcpcmV0dXJuO2NvbnN0IGR5PWUudG91Y2hlc1swXS5jbGllbnRZLXN0YXJ0WTtpZihkeT4wJiZ3aW5kb3cuc2Nyb2xsWTw9MCl7ZGlzdGFuY2U9TWF0aC5taW4oZHkqMC41LDkwKTtpbmQuc3R5bGUuaGVpZ2h0PWRpc3RhbmNlKyJweCI7aW5kLmNsYXNzTGlzdC5hZGQoInB1bGxpbmciKTtzcGluLnN0eWxlLnRyYW5zZm9ybT0icm90YXRlKCIrKGRpc3RhbmNlKjMuNikrImRlZykiO3R4dC50ZXh0Q29udGVudD1kaXN0YW5jZT49VEg/IuadvuW8gOWIt+aWsCI6IuS4i+aLieWIt+aWsCI7aWYoZGlzdGFuY2U+PVRIJiYhZS5jYW5jZWxhYmxlKXJldHVybjtpZihkaXN0YW5jZT49VEgmJmUuY2FuY2VsYWJsZSllLnByZXZlbnREZWZhdWx0KCl9fSx7cGFzc2l2ZTpmYWxzZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoZW5kIiwoKT0+e2lmKCFwdWxsaW5nKXJldHVybjtwdWxsaW5nPWZhbHNlO2lmKGRpc3RhbmNlPj1USCl7dHh0LnRleHRDb250ZW50PSLliLfmlrDkuK3igKYiO2luZC5zdHlsZS5oZWlnaHQ9IjQ2cHgiO3NwaW4uY2xhc3NMaXN0LmFkZCgic3Bpbm5lciIpO3JlZnJlc2hBbGwodHJ1ZSkuZmluYWxseSgoKT0+e2luZC5zdHlsZS5oZWlnaHQ9IjAiO2luZC5jbGFzc0xpc3QucmVtb3ZlKCJwdWxsaW5nIil9KX1lbHNle2luZC5zdHlsZS5oZWlnaHQ9IjAifWRpc3RhbmNlPTB9LHtwYXNzaXZlOnRydWV9KTsKfSkoKTsKCi8qID09PT09PT09PT09PT09PT09IOmmlumhtea4suafkyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgU1RBVEU9e2RhdGE6W10sdGltZXN0YW1wOiIiLHRzVGV4dDoiIixyZWZyZXNoU2VjOjYwLHByb3h5OmZhbHNlLHBhbmVsQWNjb3VudHM6bnVsbCxwYW5lbExvYWRlZDpmYWxzZX07Ci8vIOmmlumhteWNoeeJh+WFpeWcuuWKqOeUu+WPquWcqOesrOS4gOasoea4suafk+aXtuaSreaUvu+8jOS5i+WQjumdmem7mOWIt+aWsOebtOaOpeabv+aNouWGheWuue+8jOmBv+WFjeWxj+mXqgpsZXQgSE9NRV9BTklNPXRydWU7CmZ1bmN0aW9uIHNrZWxldG9uSG9tZSgpe3JldHVybiAnPGRpdiBjbGFzcz0iaGVybyIgc3R5bGU9ImhlaWdodDoxMzJweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzQwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc2MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nfQpmdW5jdGlvbiBzY29vdGVyRmFsbGJhY2soKXtyZXR1cm4gJzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nfQoKZnVuY3Rpb24gcmVuZGVySG9tZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2NvbnN0IGRhdGE9U1RBVEUuZGF0YTsKICAvLyDkuI3lho3lnKjmr4/mrKHmuLLmn5PliY3mj5LlhaXpqqjmnrblsY/vvJrpnZnpu5joh6rliqjliLfmlrDml7bkvJrlhYjmuIXnqbrlho3loavlhYXvvIzpgKDmiJDmlbTpobXpl6rng4EKICBpZihkYXRhLmxlbmd0aD09PTApewogICAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGRpdiBjbGFzcz0iZS1pY29uIj4nK0kuY2FyKyc8L2Rpdj48aDM+6L+Y5rKh5pyJ5p6B5qC46LSm5Y+3PC9oMz48cD7ljrvjgIzorr7nva7jgI3pobXmt7vliqDotKblj7fvvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiBUb2tlbu+8iEJlYXJlciDliY3nvIDkvJroh6rliqjljrvmjonvvInvvIzlho3ngrnjgIzojrflj5ZJROOAjeWNs+WPr+iHquWKqOWhq+WFheeUqOaIt0lE44CCPC9wPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzd2l0Y2hUYWIoXCdjZmdcJykiPuWOu+a3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIC8vIOayoeaciee7keWumui9pui+hueahOi0puWPt+S4jeWcqOmmlumhteaYvuekuuWNoeeJhwogIGNvbnN0IGNhcmRzPWRhdGEuZmlsdGVyKGE9PmEudmVoaWNsZSYmYS52ZWhpY2xlLmhhc1ZlaGljbGUpLm1hcCgoYSxpZHgpPT5yZW5kZXJBY2NvdW50Q2FyZChhLGlkeCkpLmpvaW4oIiIpOwogIGVsLmlubmVySFRNTD1jYXJkcwogICsnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcg5pWw5o2u5pu05pawICcrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8iIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7kvZzogIUgbHVja3kgwrcgR2l0SHViPC9hPiDCtyA8YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OTgiIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7niLHlj5HnlLU8L2E+IMK3IOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgSE9NRV9BTklNPWZhbHNlOwp9CgpmdW5jdGlvbiBwb3dlclRleHQocCxsKXtwPVN0cmluZyhwfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7bD1TdHJpbmcobHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2NvbnN0IG9uVmFscz1bIjEiLCJvbiIsInRydWUiLCLlvIDmnLoiLCJvcGVuIiwi5r+A5rS7IiwiYWNjX29uIiwiYWNjIG9uIiwicG93ZXJfb24iLCJwb3dlciBvbiIsIuW3suW8gOacuiIsIuW3suS4iueUtSJdO2NvbnN0IG9mZlZhbHM9WyIwIiwib2ZmIiwiZmFsc2UiLCLlhbPmnLoiLCJjbG9zZWQiLCLlvoXmnLoiLCJhY2Nfb2ZmIiwiYWNjIG9mZiIsInBvd2VyX29mZiIsInBvd2VyIG9mZiIsIuW3suWFs+acuiIsIuW3suS4i+eUtSJdO2lmKHApe2lmKG9uVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYob2ZmVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fWlmKGwpe2lmKFsiMCIsIuacqumUgSIsIuW8gOmUgSIsInVubG9ja2VkIiwiZmFsc2UiLCJvcGVuIiwi5bey5byA6ZSBIiwi5pyq6ZSB6L2mIl0uaW5jbHVkZXMobCkpcmV0dXJue3RleHQ6IuW3suW8gOacuiIsY2xzOiJvbiJ9O2lmKFsiMSIsIuW3sumUgSIsIumUgei9piIsImxvY2tlZCIsInRydWUiLCJjbG9zZWQiLCLlt7LplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fXJldHVybnt0ZXh0OiLnirbmgIHmnKrnn6UiLGNsczoib2ZmIn19CmZ1bmN0aW9uIG9ubGluZVRleHQobyl7Y29uc3Qgcz1TdHJpbmcob3x8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2lmKCFzKXJldHVybiIiO2lmKFsiMSIsIm9uIiwib25saW5lIiwidHJ1ZSIsIuWcqOe6vyIsIuW3suWcqOe6vyIsImNvbm5lY3RlZCIsIm5vcm1hbCJdLmluY2x1ZGVzKHMpKXJldHVybiLlnKjnur8iO2lmKFsiMCIsIm9mZiIsIm9mZmxpbmUiLCJmYWxzZSIsIuemu+e6vyIsIuacquWcqOe6vyIsIuW3suemu+e6vyIsImRpc2Nvbm5lY3QiLCJkaXNjb25uZWN0ZWQiLCJzbGVlcCIsIuS8keecoCJdLmluY2x1ZGVzKHMpKXJldHVybiLnprvnur8iO3JldHVybiBzfQpmdW5jdGlvbiByZW5kZXJBY2NvdW50Q2FyZChhLGlkeCl7CiAgY29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IG9ubD1vbmxpbmVUZXh0KHYub25saW5lfHx2LnJpZGVTdGF0ZSk7CiAgY29uc3QgaXNDaGFyZ2luZz0hISh2LmNoYXJnZVN0YXRlJiZ2LmNoYXJnZVN0YXRlIT09IuacquWFheeUtSIpOwogIGNvbnN0IHNvYz12LmJhdHRlcnlQZXJjZW50fHwwOwogIGNvbnN0IHNvY0NvbD1zb2M8PTIwPyIjRjk3MDZBIjpzb2M8PTUwPyIjRjdCOTU1IjoiIzNEREM5NyI7CiAgY29uc3QgcmFuZ2U9di5yZXNpZHVhbFJhbmdlS218fDA7CiAgY29uc3Qgdm9sdD12LnZvbHRhZ2U/TWF0aC5yb3VuZCh2LnZvbHRhZ2UpKyJWIjoiIjsKICBjb25zdCBmYj1zY29vdGVyRmFsbGJhY2soKTsKICAvLyBvbmVycm9yIOmHjOS4jeiDveWGjeW1jOWll+W8leWPt++8iOaXp+WGmeazleS8muaKiiBTVkcg5byV5Y+35oiq5pat77yM6aG16Z2i5q6L55WZICciPiDkubHnoIHnrKblj7fvvIkKICBjb25zdCBpbWc9di52ZWhpY2xlSW1hZ2VVcmw/JzxpbWcgc3JjPSInK2VzYyh2LnZlaGljbGVJbWFnZVVybCkrJyIgYWx0PSIiIG9uZXJyb3I9InRoaXMucmVtb3ZlKCkiPicrZmI6ZmI7CiAgY29uc3QgdmVoU3c9di5oYXNWZWhpY2xlP3JlbmRlclZlaGljbGVTd2l0Y2godixpZHgpOiIiOwogIGNvbnN0IGJvdW5kPXg9PiEheCYmeCE9PSLmnKrnu5HlrpoiJiZ4IT09Ii0iOwogIGNvbnN0IHJvd3M9W107CiAgcm93cy5wdXNoKCfph4znqIvvvJonKyh2LnRvdGFsTWlsZWFnZT92LnRvdGFsTWlsZWFnZS50b0ZpeGVkKDEpOih2Lmxhc3RSaWRlTWlsZWFnZT92Lmxhc3RSaWRlTWlsZWFnZS50b0ZpeGVkKDEpOiIwIikpKydrbScpOwogIHJvd3MucHVzaCgn5LiK5qyh77yaJysodi55ZXN0ZXJkYXlEaXN0YW5jZT92Lnllc3RlcmRheURpc3RhbmNlLnRvRml4ZWQoMSk6Ii0tIikrJ2ttJyk7CiAgcm93cy5wdXNoKCflvZPml6XvvJonKyh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6IjAiKSsna20nKyhmbXRNaW4odi50b2RheUR1cmF0aW9uKT8iICIrZm10TWluKHYudG9kYXlEdXJhdGlvbik6IiIpKyh2LnRvZGF5TWF4U3BlZWQ/IiAiK3YudG9kYXlNYXhTcGVlZCsia20vaCI6IiIpKTsKICBpZihib3VuZCh2LmZyb250UHJlc3N1cmUpfHxib3VuZCh2LnJlYXJQcmVzc3VyZSkpcm93cy5wdXNoKCfog47ljovvvJonKyhib3VuZCh2LmZyb250UHJlc3N1cmUpPyLliY0gIitlc2Modi5mcm9udFByZXNzdXJlKToiIikrKChib3VuZCh2LmZyb250UHJlc3N1cmUpJiZib3VuZCh2LnJlYXJQcmVzc3VyZSkpPyIgLyAiOiIiKSsoYm91bmQodi5yZWFyUHJlc3N1cmUpPyLlkI4gIitlc2Modi5yZWFyUHJlc3N1cmUpOiIiKSk7CiAgaWYoYm91bmQodi5mcm9udFRlbXApfHxib3VuZCh2LnJlYXJUZW1wKSlyb3dzLnB1c2goJ+iDjua4qe+8micrKGJvdW5kKHYuZnJvbnRUZW1wKT8i5YmNICIrZXNjKHYuZnJvbnRUZW1wKToiIikrKChib3VuZCh2LmZyb250VGVtcCkmJmJvdW5kKHYucmVhclRlbXApKT8iIC8gIjoiIikrKGJvdW5kKHYucmVhclRlbXApPyLlkI4gIitlc2Modi5yZWFyVGVtcCk6IiIpKTsKICBpZihpc0NoYXJnaW5nJiZ2LmN1cnJlbnQpcm93cy5wdXNoKCfnlLXmtYHvvJonK051bWJlcih2LmN1cnJlbnQpLnRvRml4ZWQoMSkrJ0EnKTsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jYXJkIGhvbWUtY2FyZCcrKGlzQ2hhcmdpbmc/JyBjaGFyZ2luZyc6JycpKyhIT01FX0FOSU0/JyBhbmltLWluJzonJykrJyIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpZHgqNjApKydtcyI+JysKICAgICc8ZGl2IGNsYXNzPSJoYy11cGQiPuabtOaWsO+8micrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy10b3AiPjxkaXYgY2xhc3M9ImhjLW5hbWUiPicrZXNjKHYuaGFzVmVoaWNsZT8odi52ZWhpY2xlTmFtZXx8YS51c2VyTmFtZSk6YS51c2VyTmFtZSkrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlPyhvbmw9PT0i5Zyo57q/Ij8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIG9uIj7lnKjnur88L3NwYW4+Jzoob25sPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UiPicrZXNjKG9ubCkrJzwvc3Bhbj4nOiIiKSk6IiIpKwogICAgKGEudG9rZW5WYWxpZD09PWZhbHNlPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgZXJyIj5Ub2tlbuWkseaViDwvc3Bhbj4nOiIiKSsKICAgIChpc0NoYXJnaW5nPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgY2hnIj7lhYXnlLXkuK08L3NwYW4+JzoiIikrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlJiZ2LnZlaGljbGVNb2RlbD8nPGRpdiBjbGFzcz0iaGMtbW9kZWwiPui9puWei++8micrZXNjKHYudmVoaWNsZU1vZGVsKSsnPC9kaXY+JzoiIikrCiAgICAodi5oYXNWZWhpY2xlPyc8ZGl2IGNsYXNzPSJoYy1taWQiPjxkaXYgY2xhc3M9ImhjLWxlZnQiPjxkaXYgY2xhc3M9ImhjLWJpZyBudW0iPicrTWF0aC5yb3VuZChzb2MpKyclPHNwYW4gY2xhc3M9ImhjLWttIG51bSI+JysocmFuZ2V8fDApKydrbTwvc3Bhbj4nKyh2b2x0Pyc8c3BhbiBjbGFzcz0iaGMtdiBudW0iPicrdm9sdCsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWJhciI+PGRpdiBjbGFzcz0iaGMtZmlsbCIgc3R5bGU9IndpZHRoOicrTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsc29jKSkrJyU7YmFja2dyb3VuZDonK3NvY0NvbCsnIj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvd3MiPicrcm93cy5tYXAocj0+JzxkaXYgY2xhc3M9ImhjLXJvdyI+JytyKyc8L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1pbWciPicraW1nKyc8L2Rpdj48L2Rpdj4nOgogICAgJzxkaXYgY2xhc3M9Im5vLXZlaGljbGUiIHN0eWxlPSJtYXJnaW46MTJweCAwIj4nK0kuY2FyKycg6K+l6LSm5Y+35pyq57uR5a6a6L2m6L6GPC9kaXY+JykrCiAgICAnPGRpdiBjbGFzcz0iaGMtYm90dG9tIj48ZGl2IGNsYXNzPSJoYy1zY29yZSI+PHNwYW4+5oC756ev5YiGIDxiIGNsYXNzPSJudW0iPicrTnVtYmVyKGEuc2NvcmV8fDApLnRvTG9jYWxlU3RyaW5nKCkrJzwvYj48L3NwYW4+PHNwYW4gY2xhc3M9InBsdXMgbnVtIj7ku4orJytOdW1iZXIoYS50b2RheVNjb3JlfHwwKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzdHJlYWsgbnVtIj7ov57nrb4nK051bWJlcihhLmNvbnRpbnVlRGF5c3x8MCkrJ+WkqTwvc3Bhbj4nKyhhLnNpZ25lZFRvZGF5Pyc8c3BhbiBjbGFzcz0ic2lnbmVkIG51bSI+4pyTIOW3suetvuWIsDwvc3Bhbj4nOiIiKSsnPC9kaXY+PC9kaXY+JysKICAgIHZlaFN3Kyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIGZtdE1pbihtaW4pe21pbj1OdW1iZXIobWluKXx8MDtpZihtaW48PTApcmV0dXJuIiI7Y29uc3QgaD1NYXRoLmZsb29yKG1pbi82MCksbT1NYXRoLnJvdW5kKG1pbiU2MCk7cmV0dXJuIGg+MD9oKyJoIisobT9tKyJtaW4iOiIiKTptKyJtaW4ifQoKLyogPT09PT09PT09PT09IOWkmui9puWIh+aNoiA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCl7CiAgaWYoIXYudmVoaWNsZXN8fHYudmVoaWNsZXMubGVuZ3RoPDIpcmV0dXJuICIiOwogIGNvbnN0IGN1cj12LmN1cnJlbnRWaW58fCIiOwogIGNvbnN0IGl0ZW1zPXYudmVoaWNsZXMubWFwKHg9Pic8YnV0dG9uIGNsYXNzPSJ2ZWgtY2hpcCcrKHgudmluTm89PT1jdXI/IiBvbiI6IiIpKyciIG9uY2xpY2s9InN3aXRjaFZlaGljbGUoJytpZHgrJyxcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgudmVoaWNsZVR5cGV8fHgubmFtZSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0idmVoLXN3aXRjaCI+PHNwYW4gY2xhc3M9InZlaC1zdy1sYWJlbCI+6L2m6L6GPC9zcGFuPicraXRlbXMrJzwvZGl2Pic7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZShpZHgsdmluKXsKICBjb25zdCBzcmM9U1RBVEUuZGF0YVtpZHhdO2lmKCFzcmN8fCF2aW4pcmV0dXJuOwogIHRyeXsKICAgIGxldCBkOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IHI9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChzcmMudXNlcklkfHwiIikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICAgIGQ9KHImJnIub2spP3IucmVzdWx0Om51bGw7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjYz1nZXRBY2NvdW50cygpW2lkeF07CiAgICAgIGlmKCFhY2MpcmV0dXJuOwogICAgICBkPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW4pOwogICAgfQogICAgaWYoZCYmZC52ZWhpY2xlJiZkLnZlaGljbGUuaGFzVmVoaWNsZSl7CiAgICAgIFNUQVRFLmRhdGFbaWR4XT1PYmplY3QuYXNzaWduKHt9LFNUQVRFLmRhdGFbaWR4XSxkKTsKICAgICAgcmVuZGVySG9tZSgpOwogICAgfQogIH1jYXRjaChlKXt9Cn0KCi8qID09PT09PT09PT09PSDkuLvpopjvvIh2Mi4xNC4xNCDotbfku4Xkv53nlZnmt7HoibLljZXkuLvpopjvvIkgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIiwiZGFyayIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDnq4vljbPnrb7liLDmgqzmta7mjInpkq4gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbW91bnRTaWduaW5GYWIoKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIikpcmV0dXJuOwogIGNvbnN0IGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiYnV0dG9uIik7CiAgYi5pZD0ic2lnbmluRmFiIjtiLmNsYXNzTmFtZT0ic2lnbmluLWZhYiI7Yi5pbm5lckhUTUw9KEkuY2hlY2t8fCIiKSsiPHNwYW4+56uL5Y2z562+5YiwPC9zcGFuPiI7CiAgYi5vbmNsaWNrPXJ1blNpZ25pbk5vdzsKICBjb25zdCBjdXI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcigiLnRhYi5vbiIpOwogIGIuc3R5bGUuZGlzcGxheT0oIWN1cnx8Y3VyLmRhdGFzZXQudGFiPT09ImhvbWUiKT8iZmxleCI6Im5vbmUiOwogIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYik7Cn0KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluTm93KCl7CiAgaWYoaXNEZW1vKCkpe2RlbW9TaWduaW4oKTtyZXR1cm59CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTsKICBpZighYnRufHxidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCJidXN5IikpcmV0dXJuOwogIGJ0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i562+5Yiw5Lit4oCmIjsKICB0b2FzdCgi5q2j5Zyo5Li65YWo6YOo6LSm5Y+35omn6KGM562+5Yiw4oCmIiwiaW5mbyIpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5ydW5TaWduaW4obnVsbCx0cnVlKTsKICBidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCI7CiAgaWYoZCYmZC5vayYmZC5yZXN1bHRzKXsKICAgIGNvbnN0IG9rTj1kLnJlc3VsdHMuZmlsdGVyKHI9PnIuc3VjY2VzcykubGVuZ3RoOwogICAgdG9hc3QoIuetvuWIsOWujOaIkO+8miIrb2tOKyIvIitkLnJlc3VsdHMubGVuZ3RoKyIg5oiQ5YqfIixva049PT1kLnJlc3VsdHMubGVuZ3RoPyJvayI6ImVyciIpOwogICAgb3BlblNoZWV0KCLnrb7liLDnu5PmnpwiLEkuY2hlY2ssc2lnbmluUmVzdWx0SHRtbChkLnJlc3VsdHMpKTsKICAgIHJlZnJlc2hBbGwodHJ1ZSk7CiAgfWVsc2V7CiAgICB0b2FzdCgoZCYmZC5lcnJvcil8fCLnrb7liLDmiafooYzlpLHotKUiLCJlcnIiKTsKICB9Cn0KZnVuY3Rpb24gc2lnbmluUmVzdWx0SHRtbChyZXN1bHRzKXsKICByZXR1cm4gKHJlc3VsdHN8fFtdKS5tYXAocj0+JzxkaXYgY2xhc3M9InNpZy1jYXJkICcrKHIuc3VjY2Vzcz8ib2siOiJmYWlsIikrJyI+PGRpdiBjbGFzcz0iaCI+PHNwYW4+Jytlc2Moci51c2VyTmFtZXx8IuacquefpSIpKyc8L3NwYW4+PHNwYW4gY2xhc3M9InIiPicrKHIuc3VjY2Vzcz8oIisiKyhyLnRvdGFsR2Fpbnx8MCkrIiDliIYiKToi5aSx6LSlIikrJzwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJzdGVwcyI+Jysoci5zdGVwc3x8W10pLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikrKHIuZXJyb3I/JzxkaXYgY2xhc3M9ImVyciI+Jytlc2Moci5lcnJvcikrJzwvZGl2Pic6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKfQovKiDmvJTnpLrmqKHlvI/vvJrmqKHmi5/kuIDmrKHnrb7liLDlubblvLnlh7rnu5PmnpzvvIzpgb/lhY3mvJTnpLrml7bnu5PmnpzkuLrnqbogKi8KZnVuY3Rpb24gZGVtb1NpZ25pbigpewogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoYnRuKXtidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiJ9CiAgdG9hc3QoIua8lOekuuaooeW8j++8muaooeaLn+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBzZXRUaW1lb3V0KCgpPT57CiAgICBpZihidG4pe2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i56uL5Y2z562+5YiwIn0KICAgIGNvbnN0IHJlcz1bCiAgICAgIHt1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjksc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzMgKOenr+WIhikiLCLlj5HluJbmiJDlip8gKzEiLCLngrnotZ7miJDlip8gKzEiLCLliIbkuqvmiJDlip8gKzEiLCLor4TorrrlrozmiJAiXX0sCiAgICAgIHt1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acn++8jOivt+mHjeaWsOeZu+W9lSIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfQogICAgXTsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoxLzIg5oiQ5Yqf77yI5ryU56S65pWw5o2u77yJIiwib2siKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLHNpZ25pblJlc3VsdEh0bWwocmVzKSk7CiAgfSw3MDApOwp9CgovKiA9PT09PT09PT09PT09PT09PSDovabovobor6bmg4UgJiDlnLDlm74gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gb3Blbk1hcChpZHgpe2NvbnN0IHY9U1RBVEUuZGF0YVtpZHhdJiZTVEFURS5kYXRhW2lkeF0udmVoaWNsZTtpZighdilyZXR1cm47aWYoIWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSkpe3RvYXN0KCLmmoLml6DmnInmlYggR1BTIOWdkOaghyIsImVyciIpO3JldHVybn1jb25zdCB1cmw9Imh0dHBzOi8vbWFwcy5hcHBsZS5jb20vP3E9IitOdW1iZXIodi5sYXRpdHVkZSkrIiwiK051bWJlcih2LmxvbmdpdHVkZSkrIiZ6PTE3Ijt3aW5kb3cub3Blbih1cmwsIl9ibGFuayIpfQpmdW5jdGlvbiBzaG93VmVoaWNsZURldGFpbChpZHgpewogIGNvbnN0IGE9U1RBVEUuZGF0YVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3QgcHc9cG93ZXJUZXh0KHYucG93ZXJTdGF0dXMsdi5sb2NrU3RhdGUpOwogIGNvbnN0IHJvd3M9W107CiAgaWYodi52aW5Obylyb3dzLnB1c2goWyfovabmnrblj7cnLCc8c3BhbiBjbGFzcz0idiBtb25vIiBpZD0idmluRHRsIj4nK2VzYyhtYXNrVmluKHYudmluTm8pKSsnPC9zcGFuPiA8YnV0dG9uIGNsYXNzPSJ2aW4tc2hvdyIgb25jbGljaz0idG9nZ2xlRHRsVmluKCkiPuaYvuekujwvYnV0dG9uPiddKTsKICByb3dzLnB1c2goWyflhYXnlLXnirbmgIEnLGVzYyh2LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IildKTsKICByb3dzLnB1c2goWyfnlLXmupDnirbmgIEnLCc8c3BhbiBzdHlsZT0iY29sb3I6JysocHcuY2xzPT09Im9uIj8idmFyKC0tb2spIjoidmFyKC0tdHh0MikiKSsnIj4nK3B3LnRleHQrJzwvc3Bhbj4nXSk7CiAgaWYodi5yaWRlU3RhdGV8fHYub25saW5lKXJvd3MucHVzaChbJ+i9pui+hueKtuaAgScsZXNjKHYucmlkZVN0YXRlfHx2Lm9ubGluZSldKTsKICByb3dzLnB1c2goWyfnlLXph48gU09DJywnPGIgc3R5bGU9ImNvbG9yOicrKHYuYmF0dGVyeVBlcmNlbnQ8PTIwPyJ2YXIoLS1lcnIpIjp2LmJhdHRlcnlQZXJjZW50PD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1icmFuZCkiKSsnIj4nKyh2LmJhdHRlcnlQZXJjZW50fHwwKSsnJTwvYj4nXSk7CiAgaWYodi52b2x0YWdlKXJvd3MucHVzaChbJ+eUteWOiycsdi52b2x0YWdlLnRvRml4ZWQoMSkrIlYiXSk7CiAgaWYodi5jdXJyZW50KXJvd3MucHVzaChbJ+eUtea1gScsdi5jdXJyZW50LnRvRml4ZWQoMSkrIkEiXSk7CiAgaWYodi5iYXR0ZXJ5VGVtcClyb3dzLnB1c2goWyfnlLXmsaDmuKnluqYnLHYuYmF0dGVyeVRlbXAudG9GaXhlZCgwKSsiwrBDIl0pOwogIHJvd3MucHVzaChbJ+WJqeS9mee7reiIqicsKHYucmVzaWR1YWxSYW5nZUttfHwwKSsiIGttIisodi5yYW5nZUVzdGltYXRlZD8i77yI5Lyw566X77yJIjoiIildKTsKICByb3dzLnB1c2goWyfku4rml6XpqpHooYwnLCh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6MCkrIiBrbSAvICIrKHYudG9kYXlEdXJhdGlvbnx8MCkrIiBtaW4iXSk7CiAgaWYoKHYuZnJvbnRQcmVzc3VyZSYmdi5mcm9udFByZXNzdXJlIT09Iuacque7keWumiIpfHwodi5yZWFyUHJlc3N1cmUmJnYucmVhclByZXNzdXJlIT09Iuacque7keWumiIpKXJvd3MucHVzaChbJ+iDjuWOiycsJ+WJjSAnK2VzYyh2LmZyb250UHJlc3N1cmV8fCItIikrJyAvIOWQjiAnK2VzYyh2LnJlYXJQcmVzc3VyZXx8Ii0iKV0pOwogIGlmKHYuYWRkcmVzcylyb3dzLnB1c2goWyfovabovobkvY3nva4nLCc8c3BhbiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmFkZHJlc3MpKyc8L3NwYW4+J10pOwogIGNvbnN0IGRPaz1oYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpOwogIGlmKGRPaylyb3dzLnB1c2goWydHUFMg5Z2Q5qCHJywnPHNwYW4gY2xhc3M9InYgbW9ubyI+JytOdW1iZXIodi5sYXRpdHVkZSkudG9GaXhlZCg2KSsiLCAiK051bWJlcih2LmxvbmdpdHVkZSkudG9GaXhlZCg2KSsnPC9zcGFuPiddKTsKICBpZih2LmxvY2F0aW9uVGltZSlyb3dzLnB1c2goWyfmnIDlkI7lrprkvY0nLCc8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwIj4nK2VzYyh2LmxvY2F0aW9uVGltZSkrJzwvc3Bhbj4nXSk7CiAgaWYodi5zZXJ2aWNlRW5kRGF0ZSlyb3dzLnB1c2goWyfmnI3liqHliLDmnJ8nLGVzYyh2LnNlcnZpY2VFbmREYXRlKV0pOwogIFNUQVRFLnZpbkR0bFJhdz12LnZpbk5vfHwiIjsKICBjb25zdCBodG1sPXJvd3MubWFwKHI9Pic8ZGl2IGNsYXNzPSJzci1pdGVtIj48c3BhbiBjbGFzcz0iayI+JytyWzBdKyc8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrclsxXSsnPC9zcGFuPjwvZGl2PicpLmpvaW4oIiIpKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gJysoZE9rPyJwcmltYXJ5IjoiIikrJyIgJysoZE9rPydvbmNsaWNrPSJjbG9zZVNoZWV0KCk7b3Blbk1hcCgnK2lkeCsnKSInOidkaXNhYmxlZCB0aXRsZT0i5pqC5peg5pyJ5pWIR1BT5Z2Q5qCHIicpKyc+JytJLm1hcCsnIOWcsOWbvuafpeecizwvYnV0dG9uPjwvZGl2Pic7CiAgb3BlblNoZWV0KCLovabovobor6bmg4UgwrcgIitlc2Modi52ZWhpY2xlTmFtZXx8IuaegeaguOi9pui+hiIpLEkuY2FyLGh0bWwpOwp9CmZ1bmN0aW9uIHRvZ2dsZUR0bFZpbigpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aW5EdGwiKTtpZighZWwpcmV0dXJuO2lmKGVsLnRleHRDb250ZW50LmluZGV4T2YoIioiKT49MCl7ZWwudGV4dENvbnRlbnQ9U1RBVEUudmluRHRsUmF3O2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IumakOiXjyJ9ZWxzZXtkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLmmL7npLoiO2VsLnRleHRDb250ZW50PW1hc2tWaW4oZWwudGV4dENvbnRlbnQpfX0KLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGM77yI6Z2i5p2/5bey56e76Zmk5omL5Yqo562+5Yiw5YWl5Y+j77yM5a6a5pe2562+5Yiw55Sx6ISa5pysIGNyb24g6LSf6LSj77yJID09PT09PT09PT09PT09PT09ICovCgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KLy8gdjIuMTQuMjEg6L2m5o6n6aOO6Zmp56Gu6K6k5pS55Li66aaW5qyh5L2/55So5by556qX77ya5ZCM5oSP5ZCO5Y+v55So77yM5LiN5ZCM5oSP5YiZ5LiN5ZCv55SoCmxldCBfX3Jpc2tQZW5kaW5nPW51bGw7CmZ1bmN0aW9uIHJpc2tPaygpe2NvbnN0IHI9KGdldENmZygpLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKTtyZXR1cm4gcj09PSLmiJHlkIzmhI/po47pmanlubbkvb/nlKgifHxyPT09IuaIkeiHquaEv+aJv+aLheebuOWFs+mjjumZqSJ9CmZ1bmN0aW9uIGN0cmxBY3QoaWR4LGFjdGlvbixidG4pe2lmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufWNvbnN0IGE9cHRBY2NvdW50cygpW2lkeF07aWYoIWF8fCFhLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufWlmKCFyaXNrT2soKSl7c2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbik7cmV0dXJufWN0cmxDb25maXJtKGlkeCxhY3Rpb24pfQpmdW5jdGlvbiBjdHJsQ29uZmlybShpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2NvbnN0IG5hbWVzPXtmaW5kOiLnn63mjInlr7vovabvvIjovabovobpl6rnga/vvIkiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga/vvIjpq5jlo7Dlr7vovabvvIkiLGN1c2hpb246IuaJk+W8gOWdkOWeq++8iOWdkOWeq+S8muW8uei1t++8iSIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9O2NvbnN0IG5hbWU9bmFtZXNbYWN0aW9uXXx8YWN0aW9uO2NvbmZpcm1EaWFsb2coIuehruiupOaJp+ihjCAiK25hbWUsIuivpeaMh+S7pOS8mumAmui/hyA0RyDnvZHnu5znnJ/lrp7mjqfliLbkvaDnmoTovabovobvvJoiK2VzYyhhLnVzZXJOYW1lKSsi44CCIiwnZG9DdHJsKCcraWR4KyIsJyIrYWN0aW9uKyInKSIpfQpmdW5jdGlvbiBzaG93Umlza0RpYWxvZyhpZHgsYWN0aW9uKXsKICBfX3Jpc2tQZW5kaW5nPXtpZHg6aWR4LGFjdGlvbjphY3Rpb259OwogIGNvbnN0IGxheWVyPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKTsKICBsYXllci5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNvbmZpcm0iPjxkaXYgY2xhc3M9ImN0Ij7ovabmjqflip/og73po47pmanlkYrnn6U8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+5a+76L2mIC8g6bij56ybIC8g5Z2Q5Z6rIC8g5byA6ZSBIC8g5YWz6ZSB562J5oyH5Luk57uPIDRHIOS6keerr+S4i+WPke+8jOS8mjxiPuecn+WunuaTjeS9nOS9oOeahOi9pui+hjwvYj7jgILlj5fnvZHnu5zlu7bov5/jgIHkv6Hlj7fnrYnlvbHlk43vvIzmjIfku6Tlj6/og73lu7bov5/jgIHlpLHotKXvvIzmnoHnq6/mg4XlhrXkuIvovabovoblj6/og73mhI/lpJbliqjkvZzvvIjlpoLor6/lvIDplIHvvInjgILkvb/nlKjovabmjqflip/og73ljbPop4bkuLrkvaDlt7LlhYXliIbnn6Xmgonlubboh6rmhL/mib/mi4XkuIrov7Dpo47pmanvvIznlLHmraTkuqfnlJ/nmoTkuIDliIflkI7mnpznlLHkvaDoh6rooYzmib/mi4XjgII8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9InJpc2tEZWNsaW5lKCkiPuaIkeS4jeWQjOaEj+mjjumZqeS4jeS9v+eUqDwvYnV0dG9uPjxidXR0b24gY2xhc3M9InllcyIgb25jbGljaz0icmlza0FncmVlKCkiPuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqDwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgbGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIik7Cn0KZnVuY3Rpb24gcmlza0FncmVlKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYz1nZXRDZmcoKTtjLnZlaGljbGVDb250cm9sUmlzaz0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoIjtCYWNrZW5kLnNhdmVDb25maWcoYykudGhlbihmdW5jdGlvbihvayl7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpYXBwbHlSZW1vdGVDZmcoYyk7ZWxzZSBzYXZlQ2ZnKGMpO3RvYXN0KCLlt7LlkIzmhI/po47pmanvvIzovabmjqflip/og73lt7LlkK/nlKgiLCJvayIpO2lmKF9fcmlza1BlbmRpbmcpe2NvbnN0IHA9X19yaXNrUGVuZGluZztfX3Jpc2tQZW5kaW5nPW51bGw7Y3RybENvbmZpcm0ocC5pZHgscC5hY3Rpb24pfX1lbHNle3RvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKTtfX3Jpc2tQZW5kaW5nPW51bGx9fSl9CmZ1bmN0aW9uIHJpc2tEZWNsaW5lKCl7Y2xvc2VDb25maXJtKCk7X19yaXNrUGVuZGluZz1udWxsO3RvYXN0KCLlt7LpgInmi6nkuI3lkIzmhI/po47pmanvvIzovabmjqflip/og73kuI3lkK/nlKgiLCJpbmZvIil9CmFzeW5jIGZ1bmN0aW9uIGRvQ3RybChpZHgsYWN0aW9uKXtjb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhKXJldHVybjtjb25zdCBidG49ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmN0cmwtYnRuW2RhdGEtYWN0PSInK2FjdGlvbisnIl0nKTtjb25zdCBvbGQ9YnRuP2J0bi5pbm5lckhUTUw6IiI7aWYoYnRuKXtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5pbm5lckhUTUw9SS5jbG9ja310b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC52ZWhpY2xlQ3RybChhLnVzZXJJZCxhY3Rpb24pO2lmKGJ0bil7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLmlubmVySFRNTD1vbGR9aWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi5oyH5Luk5bey5LiL5Y+RIiwib2siKX1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5oyH5Luk5aSx6LSlIiwiZXJyIil9fQoKLyogPT09PT09PT09PT09PT09PT0g5pel5b+X6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBsb2dGaWx0ZXI9ImFsbCI7CmFzeW5jIGZ1bmN0aW9uIHJlbmRlckxvZ3MoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUxvZ3MiKTsKICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rdisn6L+Q6KGM5pel5b+XPC9kaXY+JysKICAnPGRpdiBjbGFzcz0ibG9nLXBhbmVsIj48ZGl2IGNsYXNzPSJsb2ctaGVhZCI+PGgzPicrSS5rdisnPHNwYW4+5pyA6L+RIDUwIOadoTwvc3Bhbj48L2gzPjxkaXYgY2xhc3M9ImxvZy1maWx0ZXJzIj4nKwogIFsnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0iYWxsIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdhbGxcJykiPuWFqOmDqDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InNpZ25pbiI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnc2lnbmluXCcpIj7nrb7liLA8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJ2ZWhpY2xlIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCd2ZWhpY2xlXCcpIj7mjqfovaY8L2J1dHRvbj4nXS5qb2luKCIiKSsKICAnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ibG9nLWxpc3QiIGlkPSJsb2dMaXN0Ij48ZGl2IHN0eWxlPSJwYWRkaW5nOjQwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0MykiPuWKoOi9veS4reKApjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE0cHgiPjxidXR0b24gY2xhc3M9ImJ0biBkYW5nZXIiIHN0eWxlPSJmbGV4OjEiIG9uY2xpY2s9ImNsZWFyTG9nc1VJKCkiPua4heepuuaXpeW/lzwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgbG9ncz1sb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wP0RFTU9fTE9HUzphd2FpdCBCYWNrZW5kLmdldExvZ3MoKTtyZW5kZXJMb2dMaXN0KGxvZ3MpOwp9CmZ1bmN0aW9uIHNldExvZ0ZpbHRlcihmKXtsb2dGaWx0ZXI9ZjtyZW5kZXJMb2dzKCl9CmZ1bmN0aW9uIHJlbmRlckxvZ0xpc3QobG9ncyl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImxvZ0xpc3QiKTtpZighZWwpcmV0dXJuO2NvbnN0IGxpc3Q9KGxvZ3N8fFtdKS5maWx0ZXIobD0+e2NvbnN0IHQ9bC50eXBlfHwic2lnbmluIjtpZihsb2dGaWx0ZXI9PT0iYWxsIilyZXR1cm4gdHJ1ZTtyZXR1cm4gdD09PWxvZ0ZpbHRlcn0pO2lmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJsb2ctZW1wdHkiPicrSS53YXJuKyc8YnI+6K+l5YiG57G75LiL5pqC5peg5pel5b+XPC9kaXY+JztyZXR1cm59ZWwuaW5uZXJIVE1MPWxpc3QubWFwKChsb2csaSk9Pntjb25zdCB0PWxvZy50eXBlfHwic2lnbmluIjtjb25zdCB0YWc9dD09PSJ2ZWhpY2xlIj8nPHNwYW4gY2xhc3M9InBpbGwgYW1iZXIiPuaOp+i9pjwvc3Bhbj4nOic8c3BhbiBjbGFzcz0icGlsbCBjeWFuIj7nrb7liLA8L3NwYW4+JztsZXQgcmVzO2lmKHQ9PT0idmVoaWNsZSIpe3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5hY3Rpb25UZXh0fHwi6L2m6L6G5o6n5Yi2IikrJyAnKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfIjoi5aSx6LSl77yaIitlc2MobG9nLm1lc3NhZ2V8fGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9ZWxzZXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuc3VjY2Vzcz8i5oiQ5YqfICsiK2xvZy50b3RhbEdhaW46IuWksei0pTogIisobG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31jb25zdCBzdGVwcz1sb2cuc3RlcHM/KGxvZy5zdGVwcy5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKToiIjtyZXR1cm4gJzxkaXYgY2xhc3M9ImxvZy1pdGVtIiBzdHlsZT0iYW5pbWF0aW9uLWRlbGF5OicrKGkqMjUpKydtcyI+PGRpdiBjbGFzcz0ibG9nLXRpbWUiPicrZXNjKGxvZy50aW1lfHwiIikrJzwvZGl2PjxkaXYgY2xhc3M9ImxvZy1tYWluIj4nK3RhZysnPHNwYW4gY2xhc3M9ImxvZy11c2VyIj4nK2VzYyhsb2cudXNlck5hbWV8fCIiKSsnPC9zcGFuPicrcmVzKyc8L2Rpdj4nKyhzdGVwcz8nPGRpdiBjbGFzcz0ibG9nLXN0ZXBzIj4nK3N0ZXBzKyc8L2Rpdj4nOiIiKSsnPC9kaXY+J30pLmpvaW4oIiIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NVSSgpe2NvbmZpcm1EaWFsb2coIua4heepuuaXpeW/lyIsIuWwhuWIoOmZpOWFqOmDqOi/kOihjOaXpeW/l++8jOatpOaTjeS9nOS4jeWPr+aBouWkjeOAgiIsImNsZWFyTG9nc05vdyIpfQphc3luYyBmdW5jdGlvbiBjbGVhckxvZ3NOb3coKXtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLmNsZWFyTG9ncygpO2lmKG9rKXt0b2FzdCgi5pel5b+X5bey5riF56m6Iiwib2siKTtyZW5kZXJMb2dzKCl9ZWxzZSB0b2FzdCgi5riF56m65aSx6LSlIiwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDorr7nva7pobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGNmZ0FjY291bnRzPVtdOwovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNS42IOi9r+S7tueJiOacrOajgOa1iyA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBjaGVja1ZlcnNpb24obWFudWFsKXsKICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZlckNoZWNrQnRuIik7CiAgaWYoYnRuKXtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuajgOa1i+S4reKApiJ9CiAgbGV0IGQ9bnVsbDsKICBpZihpc0RlbW8oKSl7ZD17b2s6dHJ1ZSxkZW1vOnRydWUsY3VycmVudDpBUFBfVkVSU0lPTi5yZXBsYWNlKC9edi8sIiIpLGhhc1VwZGF0ZTpmYWxzZSxsYXRlc3Q6e3NjcmlwdDpBUFBfVkVSU0lPTi5yZXBsYWNlKC9edi8sIiIpfX19CiAgZWxzZXtkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvdmVyc2lvbi1jaGVjayIrKG1hbnVhbD8iP2ZyZXNoPTEiOiIiKSk7fQogIFNUQVRFLnZlcj1kfHxudWxsOwogIGlmKGJ0bil7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i5qOA5p+l5pu05pawIn0KICBjb25zdCBleD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmVyRXh0cmEiKTtpZihleClleC5pbm5lckhUTUw9dmVyRXh0cmFIdG1sKCk7CiAgaWYoU1RBVEUudmVyJiZTVEFURS52ZXIub2smJlNUQVRFLnZlci5oYXNVcGRhdGUmJiFTVEFURS52ZXIuZGVtbyl7CiAgICB0b2FzdCgi5Y+R546w5paw54mI5pysIHYiK1NUQVRFLnZlci5sYXRlc3Quc2NyaXB0KyLvvIjlvZPliY0gdiIrU1RBVEUudmVyLmN1cnJlbnQrIu+8ie+8jOWPr+WIsOOAjOiuvue9ruOAjeafpeeci+abtOaWsOaWueW8jyIpOwogIH1lbHNlIGlmKG1hbnVhbCl7CiAgICB0b2FzdChTVEFURS52ZXImJlNUQVRFLnZlci5vaz8i5bey5piv5pyA5paw54mI5pysIHYiK1NUQVRFLnZlci5jdXJyZW50OigoU1RBVEUudmVyJiZTVEFURS52ZXIuZXJyb3IpfHwi5qOA5rWL5aSx6LSlIiksU1RBVEUudmVyJiZTVEFURS52ZXIub2s/Im9rIjoiZXJyIik7CiAgfQp9CmZ1bmN0aW9uIHZlckV4dHJhSHRtbCgpewogIGNvbnN0IHY9U1RBVEUudmVyOwogIGlmKCF2KXJldHVybiAn54K544CM5qOA5p+l5pu05paw44CN6I635Y+W5pyA5paw54mI5pys5LiO5ZCE56uv5o6o6I2Q54mI5pysJzsKICBpZighdi5vaylyZXR1cm4gJ+ajgOa1i+Wksei0pe+8micrZXNjKHYuZXJyb3J8fCLmnKrnn6XplJnor68iKTsKICBjb25zdCBMPXYubGF0ZXN0fHx7fTsKICBpZighdi5oYXNVcGRhdGUpcmV0dXJuICflt7LmmK/mnIDmlrDniYjmnKwgwrcg6ISa5pysIHYnK2VzYyh2LmN1cnJlbnQpKyh2LmNhY2hlZD8n77yI5pys5Zyw57yT5a2Y77yJJzonJyk7CiAgcmV0dXJuICc8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0td2Fybik7Zm9udC13ZWlnaHQ6NjAwIj7lj5HnjrDmlrDniYjmnKzvvJrohJrmnKwgdicrZXNjKEwuc2NyaXB0fHwiIikrJ++8iOW9k+WJjSB2Jytlc2Modi5jdXJyZW50KSsn77yJPC9zcGFuPicrCiAgJzxicj7mjqjojZDniYjmnKzvvJppT1MgQXBwICcrZXNjKEwuaW9zfHwiLSIpKycgwrcgV2luZG93cyAnK2VzYyhMLnBjfHwiLSIpKycgwrcgQW5kcm9pZCAnK2VzYyhMLmFuZHJvaWR8fCItIikrCiAgKEwubm90ZT8nPGJyPuabtOaWsOWGheWuue+8micrZXNjKEwubm90ZSk6JycpKwogICc8YnI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDIpIj7mm7TmlrDmlrnlvI88L2I+77yaTG9vbiAvIFNoYWRvd3JvY2tldCAvIFN1cmdlIOabtOaWsOaooeWdl+iuoumYheWNs+WPr+aLieWPluacgOaWsOiEmuacrO+8m2lPUyBBcHDvvIhUcm9sbFN0b3Jl77yJ5LiOIFdpbmRvd3MgLyBBbmRyb2lkIOerr+ivt+mHjeaWsOS4i+i9veWvueW6lOWuieijheWMheOAgic7Cn0KZnVuY3Rpb24gcmVuZGVyQ2ZnKCl7CiAgaWYoaXNQcm94eU1vZGUoKSYmbG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKTwwJiYhU1RBVEUucGFuZWxMb2FkZWQpewogICAgY29uc3QgZWwwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlQ2ZnIik7CiAgICBpZihlbDApZWwwLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyNnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mraPlnKjku47ohJrmnKzlkI7nq6/lkIzmraXotKblj7fkuI7phY3nva7igKY8L2Rpdj48L2Rpdj4nOwogICAgZW5zdXJlUGFuZWxEYXRhKCkudGhlbigoKT0+cmVuZGVyQ2ZnKCkpOwogICAgcmV0dXJuOwogIH0KICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y2ZnQWNjb3VudHM9KGlzUHJveHlNb2RlKCkmJlNUQVRFLnBhbmVsQWNjb3VudHM/U1RBVEUucGFuZWxBY2NvdW50czpnZXRBY2NvdW50cygpKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmEudG9rZW58fCIiLGJhcmtLZXk6YS5iYXJrS2V5fHwiIn0pKTsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogIGNvbnN0IGFjY1Jvd3M9Y2ZnQWNjb3VudHMubWFwKChhLGlkeCk9Pic8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJOYW1lKSsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJJZCkrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbu+8iOeymOi0tOWNs+WPr++8jOiHquWKqOWOu+aOiSBCZWFyZXIg5YmN57yA77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS50b2tlbikrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8jOetvuWIsOaIkOWKn+aOqOmAge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS5iYXJrS2V5KSsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgY29uc3QgY29tbT1jZmcuY29tbXVuaXR5OwogIGNvbnN0IHN3PShpZCxsYWJlbCxzdWIsY2hlY2tlZCk9Pic8bGFiZWwgY2xhc3M9InN3aXRjaCI+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0iJytpZCsnIiAnKyhjaGVja2VkPyJjaGVja2VkIjoiIikrJz48c3BhbiBjbGFzcz0ic3ciPjwvc3Bhbj48c3BhbiBjbGFzcz0ibGJsIj4nK2xhYmVsKyc8L3NwYW4+PHNwYW4gY2xhc3M9InNjIj4nK3N1YisnPC9zcGFuPjwvbGFiZWw+JzsKICBlbC5pbm5lckhUTUw9CiAgJzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rZXkrJ+iuvue9rjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuaJi+acuuWPt+eZu+W9lTwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCic8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7miYvmnLrlj7fvvIjmnoHmoLggQXBwIOe7keWumuWPt+egge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRlbCIgaWQ9InBsX3Bob25lIiBwbGFjZWhvbGRlcj0iMTEg5L2N5omL5py65Y+3IiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuefreS/oemqjOivgeeggTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJwbF9jb2RlIiBwbGFjZWhvbGRlcj0iNiDkvY3pqozor4HnoIEiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwonPC9kaXY+JysKJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2VuZFNtc0NvZGUoKSIgaWQ9InBsX3NlbmRfYnRuIj7ojrflj5bpqozor4HnoIE8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icGhvbmVMb2dpblVJKCkiIGlkPSJwbF9sb2dpbl9idG4iPueZu+W9leW5tua3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7nlKjmiYvmnLrlj7cgKyDnn63kv6Hpqozor4HnoIHnmbvlvZXvvIzoh6rliqjojrflj5YgVG9rZW4g5LiO55So5oi3SUTlubbliqDlhaXotKblj7fliJfooajvvIznmbvlvZXmiJDlip/lkI7oh6rliqjkv53lrZjlubbliLfmlrDpobXpnaLjgII8YnI+wrcg5bCP5Y+355m75b2V77ya5Y+v5aSa5qyh55m75b2V5LiN5ZCM5omL5py65Y+377yM5oyJ5bCP5Y+36YCQ5Liq5re75Yqg5LiO566h55CG44CCPGJyPsK3IOacjeWKoeWIsOacnyAvIOe7keWumue7rei0ue+8mui9pui+huaZuuiDveacjeWKoeWIsOacn+OAgeaIlumcgOimgee7keWumue7rei0ueaXtu+8jOmHjeaWsOeUqOaJi+acuuWPt+eZu+W9leWNs+WPr+WIt+aWsOaOiOadg++8jOWFqOeoi+aXoOmcgOaKk+WMheOAgjwvZGl2PicrCic8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPuWumuaXtuetvuWIsDwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgc3coImF1dG9fc2lnbmluIiwi5a6a5pe2562+5YiwIiwi5Yiw54K56Ieq5Yqo5Li65YWo6YOo6LSm5Y+3562+5YiwIixjZmcuYXV0b1NpZ25pbj09PXRydWUpKwogIHN3KCJ2ZWhpY2xlX21vbml0b3IiLCLovabovobnirbmgIHnm5HmjqciLCLlhYXmu6Ev56a757q/5pe25pys5Zyw6YCa55+l5o+Q6YaS77yI5omT5byA6Z2i5p2/5pe25qOA5p+l77yJIixjZmcudmVoaWNsZU1vbml0b3I9PT10cnVlKSsKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+562+5Yiw5pe26Ze077yI5q+P5aSp77yMSEg6TU3vvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0aW1lIiBpZD0iY2ZnX3NpZ25pbl90aW1lIiB2YWx1ZT0iJytlc2MoY2ZnLmF1dG9TaWduaW5UaW1lfHwiMDc6MDAiKSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5Luj55CG6ISa5pys5peg5bi46am75ZCO5Y+w77yM6YeH55So44CM5omT5byA6KGl562+44CN5py65Yi277ya5byA5ZCv5ZCO77yM5q+P5aSp6aaW5qyh5omT5byA6Z2i5p2/5LiU5bey6L+H6K6+5a6a5pe26Ze05pe277yM6Ieq5Yqo5Li65YWo6YOo6LSm5Y+35omn6KGM5LiA5qyh562+5Yiw77yI5YaZ5pel5b+X44CB5o6oIEJhcmvvvIzkuI7miYvliqjnrb7liLDkuIDoh7TvvInvvIzlkIzkuIDlpKnlj6rmiafooYzkuIDmrKHjgILpppbpobXjgIznq4vljbPnrb7liLDjgI3mgqzmta7mjInpkq7lj6/pmo/ml7bmiYvliqjmiafooYzjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuekvuWMuuS7u+WKoeW8gOWFszwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCIgc3R5bGU9ImdhcDo4cHgiPicrCiAgc3coImNvbW1fcG9zdCIsIuWPkeW4g+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVQb3N0IT09ZmFsc2UpK3N3KCJjb21tX2xpa2UiLCLngrnotZ7liqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKStzdygiY29tbV9jb21tZW50Iiwi6K+E6K665Yqo5oCBIiwi5LiN5Yqg5YiGIixjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSkrc3coImNvbW1fc2hhcmUiLCLliIbkuqvliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSkrc3coImNvbW1fZGVsZXRlIiwi5omn6KGM5ZCO5Yig6Zmk5Yqo5oCBIiwi5riF55CG55eV6L+5Iixjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlKSsKICAnPC9kaXY+PGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5YWz6Zet5a+55bqU5byA5YWz5ZCO77yM562+5Yiw6ISa5pys5bCG6Lez6L+H6K+l5Lu75Yqh44CC5L+u5pS55ZCO54K55Ye76aG16Z2i5bqV6YOo44CM5L+d5a2Y6YWN572u44CN55Sf5pWI44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIbvvIgnK2NmZ0FjY291bnRzLmxlbmd0aCsnIOS4qu+8iTwvaDM+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFkZEFjY291bnRVSSgpIj4rIOa3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0iYWNjTGlzdCI+JysoYWNjUm93c3x8JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjJweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pqC5peg6LSm5Y+377yM54K55Ye744CM5re75Yqg6LSm5Y+344CNPC9kaXY+JykrJzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVBY2NvdW50c1VJKCkiPuS/neWtmOaegeaguOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ub3RlIj48Yj7kvb/nlKjor7TmmI48L2I+PGJyPsK3IFRva2Vu77ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24g5YC85Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIDxjb2RlPkJlYXJlciA8L2NvZGU+IOWJjee8gOOAgjxicj7CtyDojrflj5ZJRO+8muWhq+WFpSBUb2tlbiDlkI7ngrnjgIzojrflj5ZJROOAje+8jOiHquWKqOS7jiBINSBiYXNlSW5mbyAvIEFwcCBzZXR0aW5nIC8g6L2m6L6G5YiX6KGo5o6l5Y+j6Kej5p6Q55So5oi3SUTkuI7mmLXnp7DjgII8YnI+wrcgQmFyayBLZXnvvJror6XotKblj7fnrb7liLDmiJDlip/lkI7mjqjpgIHpgJrnn6XvvIznlZnnqbrkuI3mjqjjgII8YnI+wrcg5o6n6L2m5oyH5Luk77yI5a+76L2mL+m4o+esmy/lnZDlnqsv5byA5YWz6ZSB77yJ5Lya55yf5a6e5pON5L2c6L2m6L6G77yM6ZyA5LqM5qyh56Gu6K6k44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lpIfku73otKblj7fphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZXhwb3J0QmFja3VwVUkoKSI+5LiA6ZSu5a+85Ye65aSH5Lu9PC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJjb3B5QmFja3VwVUkoKSI+5aSN5Yi25aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5aSH5Lu95YaF5a6577yI5YyF5ZCr5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5Y+v5aSN5Yi25L+d5a2Y77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImJhY2t1cEFyZWEiIHJvd3M9IjQiIHJlYWRvbmx5IHBsYWNlaG9sZGVyPSLngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI3nlJ/miJDigKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7mgaLlpI3lpIfku73vvIjnspjotLTlpIfku70gSlNPTiDlkI7ngrnmgaLlpI3vvIzlsIbopobnm5bnjrDmnInotKblj7fkuI7phY3nva7vvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iaW1wb3J0QXJlYSIgcm93cz0iNCIgcGxhY2Vob2xkZXI9IueymOi0tOWkh+S7vSBKU09O4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgb25jbGljaz0iaW1wb3J0QmFja3VwVUkoKSI+5oGi5aSN5aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5aSH5Lu95YyF5ZCr5YWo6YOo6LSm5Y+377yI5pi156ewL+eUqOaIt0lEL1Rva2VuL0JhcmtLZXnvvInkuI7pnaLmnb/phY3nva7vvIjnrb7lkI3lr4bpkqUv56S+5Yy65Lu75Yqh5byA5YWzL+iHquWKqOWIt+aWsOetie+8ieOAguaNouacuuaIlumHjeijheWQjueymOi0tOWNs+WPr+S4gOmUrui/mOWOn++8jOaXoOmcgOmHjeaWsOaKk+WMheWhq+WGmeOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuWwj+e7hOS7tuaYvuekuui9pui+hjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPui0puWPtzwvbGFiZWw+PHNlbGVjdCBpZD0id2lkZ2V0X2FjYyIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzoxMHB4IDEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTRweCIgb25jaGFuZ2U9IndpZGdldEFjY0NoYW5nZWQoKSI+Jyt3aWRnZXRBY2NPcHRpb25zKCkrICc8L3NlbGVjdD48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7ovabovoY8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF92ZWgiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6MTBweCAxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjE0cHgiPjwvc2VsZWN0PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumAieaLqeWQju+8jGlPUyDmoYzpnaLlsI/nu4Tku7blsIblsZXnpLror6XovabovobnmoTlrp7ml7bnirbmgIHvvIjnlLXph48v57ut6IiqL+WFheeUtS/nrb7liLDvvInjgII8Yj7kuI3pgInmi6nml7bpu5jorqTlj5bnrKzkuIDkuKrotKblj7fnmoTnrKzkuIDovobovabjgII8L2I+5L+d5a2Y6YWN572u5ZCO55Sf5pWI44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7oh6rlrprkuYnog4zmma88L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7kuIrkvKDog4zmma/nhafniYfvvIjkvJrpk7rlnKjmt7HoibLlupXoibLkuYvkuIrvvIzlu7rorq7mt7HoibIv5L2O5Lqu5bqm5Zu+54mH5Lul5L+d6K+B5paH5a2X5Y+v6K+777yJPC9sYWJlbD48aW5wdXQgdHlwZT0iZmlsZSIgaWQ9ImJnX2ZpbGUiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4IiBvbmNoYW5nZT0iYmdGaWxlQ2hhbmdlZCh0aGlzKSI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4O2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2FsaWduLWl0ZW1zOmNlbnRlciI+PGRpdiBpZD0iYmdQcmV2aWV3IiBzdHlsZT0id2lkdGg6MTIwcHg7aGVpZ2h0OjcycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7YmFja2dyb3VuZC1zaXplOmNvdmVyO2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtvdmVyZmxvdzpoaWRkZW4iPuacqumAieaLqTwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjhweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFwcGx5QmdVcGxvYWQoKSIgaWQ9ImJnX2FwcGx5X2J0biI+5bqU55So6IOM5pmvPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZXNldEJnKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWbvueJh+S7pSBiYXNlNjQg5a2Y5YWl6YWN572u77yM6ZqP5aSH5Lu95LiA5bm25a+85Ye644CC5YiH5o2i6IOM5pmv5a6e5pe255Sf5pWI77yM5peg6ZyA6YeN5ZCv44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAvLyB2Mi4xNC4yMSDliKDpmaTjgIzovabmjqfpo47pmannoa7orqTjgI3pnaLmnb/vvJrmlLnkuLrpppbmrKHkvb/nlKjovabmjqflip/og73ml7blvLnnqpfnoa7orqTvvIjlkIzmhI8v5LiN5ZCM5oSP77yJCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5b2T5YmN5a6J6KOF5L+h5oGvPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuOTtjb2xvcjp2YXIoLS10eHQyKSIgaWQ9Imluc3RhbGxJbmZvIj4nKwogICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5q2j5Zyo5qOA5rWL5a6J6KOF5pa55byP4oCmPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbjoxNHB4IDJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVDZmdVSSgpIj7kv53lrZjphY3nva48L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InJlc2V0Q2ZnVUkoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmc6NHB4IDAiPicrCiAgJzxhIGhyZWY9Im1haWx0bzptbGluazc5OEBvdXRsb29rLmNvbSIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7inInvuI88L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+bWxpbms3OThAb3V0bG9vay5jb208L3NwYW4+PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGEgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7irZA8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+R2l0SHViIOS7k+W6kzwvc3Bhbj48L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDMpIj5jbHVjazc5OC9aRUVITzwvc3Bhbj48L2E+JysKICAnPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjowIDE2cHgiPjwvZGl2PicrCiAgJzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHgiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPvCfk4s8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjp2YXIoLS10eHQyKSI+54mI5pysIC8g5pu05paw5qOA5rWLPC9zcGFuPjwvc3Bhbj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrQVBQX1ZFUlNJT04rJzwvc3Bhbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ2ZXJDaGVja0J0biIgb25jbGljaz0iY2hlY2tWZXJzaW9uKHRydWUpIj7mo4Dmn6Xmm7TmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JysKICAnPGRpdiBpZD0idmVyRXh0cmEiIHN0eWxlPSJwYWRkaW5nOjAgMTZweCAxMnB4O2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuNzU7Y29sb3I6dmFyKC0tdHh0MykiPicrdmVyRXh0cmFIdG1sKCkrJzwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKICAvLyDlsI/nu4Tku7bovabovobkuIvmi4nliJ3lp4vljJbvvIjlm57loavlt7Lkv53lrZjnmoTpgInmi6nvvIkKICBjb25zdCB3c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfYWNjIik7CiAgaWYod3NlbCl7CiAgICBjb25zdCBjdXI9Z2V0Q2ZnKCkud2lkZ2V0VmVoaWNsZTtsZXQgY3VyVWlkPSIiLGN1clZpbj0iIjsKICAgIGlmKGN1cil7Y29uc3QgcD1jdXIuc3BsaXQoInwiKTtjdXJVaWQ9cFswXXx8IiI7Y3VyVmluPXBbMV18fCIiO30KICAgIGlmKGN1clVpZCl3c2VsLnZhbHVlPWN1clVpZDsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMod3NlbC52YWx1ZXx8IiIpOwogICAgaWYoY3VyVmluKXtjb25zdCB2c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIik7Zm9yKGxldCBpPTA7aTx2c2VsLm9wdGlvbnMubGVuZ3RoO2krKyl7aWYodnNlbC5vcHRpb25zW2ldLnZhbHVlPT09Y3VyVmluKXt2c2VsLnNlbGVjdGVkSW5kZXg9aTticmVha319fQogIH0KICAvLyDog4zmma/pooTop4jlm57loasKICBjb25zdCBicD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmdQcmV2aWV3Iik7CiAgaWYoYnApe2NvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnO2lmKGJnKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjticC50ZXh0Q29udGVudD0iIjt9fQogIHJlbmRlckluc3RhbGxJbmZvKCk7Cn0KLyogPT09PT09PT09PT09PT09PT0g5b2T5YmN5a6J6KOF5L+h5oGvID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGluc3RhbGxFbnZOYW1lKCl7CiAgaWYoaXNEZW1vKCkpcmV0dXJuICLmvJTnpLrmqKHlvI/vvIjnpLrkvovmlbDmja7vvIkiOwogIGNvbnN0IHA9KHR5cGVvZiBsb2NhdGlvbiE9PSJ1bmRlZmluZWQiJiZsb2NhdGlvbi5wcm90b2NvbCl8fCIiOwogIGlmKHA9PT0iemVlaG86IilyZXR1cm4gImlPUyBBcHDvvIjmnoHmoLjnrb7liLDpnaLmnb/vvIkiOwogIGlmKHR5cGVvZiBuYXZpZ2F0b3IhPT0idW5kZWZpbmVkIiYmL0VsZWN0cm9uL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50fHwiIikpcmV0dXJuICLmoYzpnaLniYjvvIhXaW5kb3dz77yJIjsKICBpZihpc1Byb3h5TW9kZSgpKXJldHVybiAi5Luj55CG6ISa5pysIjsKICByZXR1cm4gIua1j+iniOWZqCI7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVySW5zdGFsbEluZm8oKXsKICBjb25zdCBib3g9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImluc3RhbGxJbmZvIik7CiAgbGV0IGh0bWw9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206OHB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+6L+Q6KGM546v5aKD77yaPC9iPicraW5zdGFsbEVudk5hbWUoKSsnPC9kaXY+JzsKICAvLyDljp/nlJ/moaXmjqXoh6rmo4DvvJrooYzovaborrDlvZXku6rmoaXnlLHljp/nlJ/ms6jlhaXvvIznvLrlpLHml7blr7nlupTlip/og73kuI3lj6/nlKgKICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7ljp/nlJ/moaXmjqXvvJo8L2I+6K6w5b2V5LuqICcrKCh0eXBlb2YgZGFzaGNhbUhhbmRsZXI9PT0iZnVuY3Rpb24iKT8n4pyTIOWPr+eUqCc6J+KclyDmnKrms6jlhaUnKSsnPC9kaXY+JzsKICBsZXQgaW5mbz1udWxsOwogIHRyeXtpbmZvPWF3YWl0IEJhY2tlbmQuaW5zdGFsbEluZm8oKTt9Y2F0Y2goZSl7aW5mbz1udWxsfQogIGlmKCFpbmZvfHwhaW5mby5pb3MpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7nrb7lkI3mlrnlvI/ku4XmlK/mjIEgaU9TIEFwcCDlhoXmn6XnnIvvvIjor7vlj5blvZPliY3lronoo4XljIXnmoTnrb7lkI3mj4/ov7Dmlofku7bvvInjgII8L2Rpdj4nOwogIH0gZWxzZSB7CiAgICBjb25zdCBtPWluZm8uc2lnbk1ldGhvZHx8InVua25vd24iOwogICAgY29uc3QgbGFiZWw9e3Ryb2xsc3RvcmU6IuW3qOmtlCBUcm9sbFN0b3Jl77yI5rC45LmF562+5ZCN77yJIixlbnRlcnByaXNlOiLkvIHkuJrnrb7lkI3vvIjliIblj5HvvIkiLHNpZGVsb2FkOiLkuKrkurroh6rnrb7vvIg3IOWkqeacieaViOacn++8iSIsZGV2ZWxvcGVyOiLlvIDlj5HogIUgLyBUZXN0RmxpZ2h077yI6ZW/5pyf77yJIix1bmtub3duOiLml6Dms5Xnoa7lrpoifVttXXx8IuaXoOazleehruWumiI7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7lronoo4XmlrnlvI/vvJo8L2I+JytsYWJlbCsnPC9kaXY+JzsKICAgIGlmKGluZm8uZXhwaXJhdGlvbil7CiAgICAgIGxldCBleHRyYT0iIjsKICAgICAgaWYodHlwZW9mIGluZm8uZGF5c1JlbWFpbj09PSJudW1iZXIiJiZpc0Zpbml0ZShpbmZvLmRheXNSZW1haW4pJiZpbmZvLmRheXNSZW1haW4+PTApZXh0cmE9J++8iOWJqeS9mee6piAnK2luZm8uZGF5c1JlbWFpbisnIOWkqe+8iSc7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuetvuWQjeacieaViOacn+iHs++8mjwvYj4nK2VzYyhTdHJpbmcoaW5mby5leHBpcmF0aW9uKS5yZXBsYWNlKCJUIiwiICIpLnJlcGxhY2UoIloiLCIiKSkrJyAnK2V4dHJhKyc8L2Rpdj4nOwogICAgfQogICAgaWYoaW5mby50ZWFtTmFtZXx8aW5mby50ZWFtSWQpewogICAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7nrb7lkI3lm6LpmJ/vvJo8L2I+Jytlc2MoaW5mby50ZWFtTmFtZXx8aW5mby50ZWFtSWQpKyc8L2Rpdj4nOwogICAgfQogICAgaWYobT09PSJzaWRlbG9hZCIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuS4quS6uuiHquetviA3IOWkqeWIsOacn+WQju+8jOmcgOi/nuaOpeeUteiEkeeUqCBBbHRTdG9yZSAvIFNpZGVsb2FkbHkg6YeN5paw562+5ZCN77yb5bu66K6u5pS555So5beo6a2UIFRyb2xsU3RvcmUg5rC45LmF562+5ZCN44CCPC9kaXY+Jzt9CiAgICBlbHNlIGlmKG09PT0iZW50ZXJwcmlzZSIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuWmgumBh+OAjOacquWPl+S/oeS7u+eahOW8gOWPkeiAheOAje+8jOivt+WcqCDorr7nva4g4oaSIOmAmueUqCDihpIgVlBO5LiO6K6+5aSH566h55CGIOS/oeS7u+WvueW6lOS8geS4muivgeS5puOAgjwvZGl2Pic7fQogICAgZWxzZSBpZihtPT09InRyb2xsc3RvcmUiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7lt7LpgJrov4cgVHJvbGxTdG9yZSDlronoo4XvvIzmsLjkuYXmnInmlYjjgIHkuI3mgJXmjonnrb7vvIzml6DpnIDnlLXohJHnu63nrb7jgII8L2Rpdj4nO30KICB9CiAgaWYoYm94KWJveC5pbm5lckhUTUw9aHRtbDsKfQovKiA9PT09PT09PT09PT09PT09PSDlsI/nu4Tku7bovabovobpgInmi6kgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gd2lkZ2V0QWNjT3B0aW9ucygpewogIGNvbnN0IGxpc3Q9U1RBVEUuZGF0YXx8W107CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiAnPG9wdGlvbiB2YWx1ZT0iIj7mmoLml6DotKblj7fmlbDmja7vvIjor7flhYjlnKjpppbpobXliLfmlrDliqDovb3vvIk8L29wdGlvbj4nOwogIHJldHVybiBsaXN0Lm1hcCgoYSxpKT0+ewogICAgY29uc3Qgbm09ZXNjKChhLnZlaGljbGUmJihhLnZlaGljbGUudmVoaWNsZU5hbWV8fGEudmVoaWNsZS52ZWhpY2xlVHlwZSkpfHxhLnVzZXJOYW1lfHwoIui0puWPtyIrKGkrMSkpKTsKICAgIHJldHVybiAnPG9wdGlvbiB2YWx1ZT0iJytlc2MoYS51c2VySWR8fCIiKSsnIiBkYXRhLWk9IicraSsnIj4nK25tKyc8L29wdGlvbj4nOwogIH0pLmpvaW4oIiIpOwp9CmZ1bmN0aW9uIHdpZGdldFZlaE9wdGlvbnModWlkKXsKICBjb25zdCBsaXN0PVNUQVRFLmRhdGF8fFtdOwogIGNvbnN0IGE9bGlzdC5maW5kKHg9PlN0cmluZyh4LnVzZXJJZHx8IiIpPT09U3RyaW5nKHVpZCkpOwogIGlmKCFhfHwhYS52ZWhpY2xlfHwhYS52ZWhpY2xlLmhhc1ZlaGljbGUpcmV0dXJuICc8b3B0aW9uIHZhbHVlPSIiPuivpei0puWPt+aaguaXoOe7keWumui9pui+hjwvb3B0aW9uPic7CiAgY29uc3Qgdj1hLnZlaGljbGU7CiAgY29uc3QgYXJyPShBcnJheS5pc0FycmF5KHYudmVoaWNsZXMpJiZ2LnZlaGljbGVzLmxlbmd0aCk/di52ZWhpY2xlcy5tYXAoeD0+KHtuYW1lOngudmVoaWNsZVR5cGV8fHgubmFtZXx8eC52aW5Obyx2aW46eC52aW5Ob30pKTpbe25hbWU6di52ZWhpY2xlVHlwZXx8di52ZWhpY2xlTmFtZXx8di52aW5Obyx2aW46di52aW5Ob31dOwogIHJldHVybiBhcnIubWFwKHg9Pic8b3B0aW9uIHZhbHVlPSInK2VzYyh4LnZpbikrJyI+Jytlc2MoeC5uYW1lKSsnPC9vcHRpb24+Jykuam9pbigiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0QWNjQ2hhbmdlZCgpewogIGNvbnN0IHNlbD1lbCgid2lkZ2V0X2FjYyIpO2lmKCFzZWwpcmV0dXJuOwogIGVsKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMoc2VsLnZhbHVlfHwiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0U2VsZWN0aW9uVGV4dCgpewogIGNvbnN0IGFjYz1lbCgid2lkZ2V0X2FjYyIpLHZlaD1lbCgid2lkZ2V0X3ZlaCIpOwogIGlmKCFhY2N8fCF2ZWh8fCFhY2MudmFsdWV8fCF2ZWgudmFsdWUpcmV0dXJuICIiOwogIHJldHVybiBhY2MudmFsdWUrInwiK3ZlaC52YWx1ZTsKfQovKiA9PT09PT09PT09PT09PT09PSDoh6rlrprkuYnog4zmma8gPT09PT09PT09PT09PT09PT0gKi8KbGV0IF9fYmdEYXRhPSIiOwpmdW5jdGlvbiBiZ0ZpbGVDaGFuZ2VkKGlucCl7CiAgY29uc3QgZj1pbnAmJmlucC5maWxlcyYmaW5wLmZpbGVzWzBdOwogIGlmKCFmKXJldHVybjsKICBpZihmLnNpemU+NioxMDI0KjEwMjQpe3RvYXN0KCLlm77niYfov4flpKfvvIjpmZAgNk1C77yJIiwiZXJyIik7aW5wLnZhbHVlPSIiO3JldHVybjt9CiAgY29uc3Qgcj1uZXcgRmlsZVJlYWRlcigpOwogIHIub25sb2FkPWZ1bmN0aW9uKCl7X19iZ0RhdGE9ci5yZXN1bHQ7Y29uc3QgcD1lbCgiYmdQcmV2aWV3Iik7aWYocCl7cC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK19fYmdEYXRhKyIpIjtwLnRleHRDb250ZW50PSIiO310b2FzdCgi5bey6YCJ5oup5Zu+54mH77yM54K544CM5bqU55So6IOM5pmv44CN55Sf5pWIIiwiaW5mbyIpO307CiAgci5yZWFkQXNEYXRhVVJMKGYpOwp9CmZ1bmN0aW9uIGFwcGx5QmdVcGxvYWQoKXsKICBpZighX19iZ0RhdGEpe3RvYXN0KCLor7flhYjpgInmi6nlm77niYciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGM9Z2V0Q2ZnKCk7Yy5jdXN0b21CZz1fX2JnRGF0YTtzYXZlQ2ZnKGMpOwogIGFwcGx5Q3VzdG9tQmcoKTsKICBjb25zdCBpbnA9ZWwoImJnX2ZpbGUiKTtpZihpbnApaW5wLnZhbHVlPSIiOwogIF9fYmdEYXRhPSIiOwogIHRvYXN0KCLog4zmma/lt7LlupTnlKgiLCJvayIpOwp9CmZ1bmN0aW9uIHJlc2V0QmcoKXsKICBjb25zdCBjPWdldENmZygpO2MuY3VzdG9tQmc9IiI7c2F2ZUNmZyhjKTsKICBhcHBseUN1c3RvbUJnKCk7CiAgY29uc3QgcD1lbCgiYmdQcmV2aWV3Iik7aWYocCl7cC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7cC50ZXh0Q29udGVudD0i5pyq6YCJ5oupIjt9CiAgdG9hc3QoIuW3suaBouWkjem7mOiupOiDjOaZryIsImluZm8iKTsKfQpmdW5jdGlvbiBhcHBseUN1c3RvbUJnKCl7CiAgY29uc3QgYmc9Z2V0Q2ZnKCkuY3VzdG9tQmcsYj1kb2N1bWVudC5ib2R5OwogIGlmKGJnKXtiLnN0eWxlLmJhY2tncm91bmRJbWFnZT0idXJsKCIrYmcrIikiO2Iuc3R5bGUuYmFja2dyb3VuZFNpemU9ImNvdmVyIjtiLnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbj0iY2VudGVyIjtiLnN0eWxlLmJhY2tncm91bmRBdHRhY2htZW50PSJmaXhlZCI7fQogIGVsc2V7Yi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7Yi5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT0iIjtiLnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbj0iIjtiLnN0eWxlLmJhY2tncm91bmRBdHRhY2htZW50PSIiO30KfQovKiA9PT09PT09PT09PT09PT09PSDmiYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gc2VuZFNtc0NvZGUoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX3NlbmRfYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLlj5HpgIHkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zZW5kQ29kZShwaG9uZSk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTtsZXQgdD02MDtidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjsKICAgIGNvbnN0IGl2PXNldEludGVydmFsKCgpPT57dC0tO2lmKHQ8PTApe2NsZWFySW50ZXJ2YWwoaXYpO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjtidG4uZGlzYWJsZWQ9ZmFsc2U7fWVsc2UgYnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7fSwxMDAwKTsKICB9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuWPkemAgeWksei0pe+8jOivt+ajgOafpee9kee7nCIsImVyciIpO2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7fQp9CmFzeW5jIGZ1bmN0aW9uIHBob25lTG9naW5VSSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgY29kZT0oZWwoInBsX2NvZGUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGlmKCFjb2RlKXt0b2FzdCgi6K+36L6T5YWl55+t5L+h6aqM6K+B56CBIiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX2xvZ2luX2J0biIpO2J0bi5kaXNhYmxlZD10cnVlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5Lit4oCmIjsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucGhvbmVMb2dpbihwaG9uZSxjb2RlLCIiKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLnmbvlvZXmiJDlip8iLCJvayIpO3NldFRpbWVvdXQoKCk9PmxvY2F0aW9uLnJlbG9hZCgpLDEyMDApO30KICBlbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi55m75b2V5aSx6LSlIiwiZXJyIik7fQogIGJ0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leW5tua3u+WKoOi0puWPtyI7Cn0KLy8gdjIuMTQuMjEg562+5ZCN5a+G6ZKl6YWN572u6Z2i5p2/5bey5Yig6Zmk77yaYXBwL2g1L0FFUyDlr4bpkqXnm7TmjqXmsr/nlKjlvZPliY3lgLzvvIjlhoXnva7pu5jorqTvvInvvIzkuI3lho3ku47ovpPlhaXmoYbor7vlj5YKLy8gdjIuMTQuMjEg6aOO6Zmp56Gu6K6k5pS55by556qX77ya5L+d5a2Y6YWN572u5pe25rK/55So5b2T5YmNIHZlaGljbGVDb250cm9sUmlza++8jOS4jea4heepuuWQjOaEj+eKtuaAgQpmdW5jdGlvbiBjb2xsZWN0Q2ZnVUkoKXtjb25zdCBjdXI9Z2V0Q2ZnKCk7cmV0dXJue2FwcDp7YXBwSWQ6Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Y3VyLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmN1ci5oNS5hcHBTZWNyZXR9LHZlaGljbGVBZXNLZXk6Y3VyLnZlaGljbGVBZXNLZXksdmVoaWNsZUNvbnRyb2xSaXNrOmN1ci52ZWhpY2xlQ29udHJvbFJpc2ssYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjdXIuYXV0b1JlZnJlc2hTZWN8fDYwKSxzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlfHwiIixhdXRvU2lnbmluOmVsKCJhdXRvX3NpZ25pbiIpP2VsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ6ZmFsc2UsYXV0b1NpZ25pblRpbWU6KHZhbCgiY2ZnX3NpZ25pbl90aW1lIil8fCIwNzowMCIpLHZlaGljbGVNb25pdG9yOmVsKCJ2ZWhpY2xlX21vbml0b3IiKT9lbCgidmVoaWNsZV9tb25pdG9yIikuY2hlY2tlZDpmYWxzZSx3aWRnZXRWZWhpY2xlOndpZGdldFNlbGVjdGlvblRleHQoKXx8Y3VyLndpZGdldFZlaGljbGUsY3VzdG9tQmc6Y3VyLmN1c3RvbUJnLGNvbW11bml0eTp7ZW5hYmxlUG9zdDplbCgiY29tbV9wb3N0IikuY2hlY2tlZCxlbmFibGVMaWtlOmVsKCJjb21tX2xpa2UiKS5jaGVja2VkLGVuYWJsZUNvbW1lbnQ6ZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQsZW5hYmxlU2hhcmU6ZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkLGVuYWJsZURlbGV0ZTplbCgiY29tbV9kZWxldGUiKS5jaGVja2VkfX19CmZ1bmN0aW9uIHZhbChpZCl7Y29uc3QgZT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7cmV0dXJuIGU/ZS52YWx1ZToiIn0KZnVuY3Rpb24gZWwoaWQpe3JldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCl9CmFzeW5jIGZ1bmN0aW9uIHNhdmVDZmdVSSgpe2NvbnN0IGM9Y29sbGVjdENmZ1VJKCk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQ29uZmlnKGMpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKXthcHBseVJlbW90ZUNmZyhjKTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX10b2FzdCgi6YWN572u5bey5L+d5a2YIiwib2siKTtzdGFydEF1dG9SZWZyZXNoKGMuYXV0b1JlZnJlc2hTZWMpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9Ci8vIHYyLjE0LjIxIOetvuWQjeWvhumSpemdouadv+W3suWIoOmZpO+8muaBouWkjem7mOiupOaXtuWvhumSpeebtOaOpeWGmeWbnuWGhee9rum7mOiupOWAvApmdW5jdGlvbiByZXNldENmZ1VJKCl7aWYoZWwoImF1dG9fc2lnbmluIikpZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZD1mYWxzZTtpZihlbCgiY2ZnX3NpZ25pbl90aW1lIikpZWwoImNmZ19zaWduaW5fdGltZSIpLnZhbHVlPSIwNzowMCI7aWYoZWwoImNvbW1fcG9zdCIpKWVsKCJjb21tX3Bvc3QiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fbGlrZSIpKWVsKCJjb21tX2xpa2UiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fY29tbWVudCIpKWVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fc2hhcmUiKSllbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9kZWxldGUiKSllbCgiY29tbV9kZWxldGUiKS5jaGVja2VkPXRydWU7Y29uc3QgYz1nZXRDZmcoKTtjLmFwcD17YXBwSWQ6REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fTtjLmg1PXthcHBJZDpERUZBVUxUX0NGRy5oNS5hcHBJZCxhcHBTZWNyZXQ6REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fTtjLnZlaGljbGVBZXNLZXk9REVGQVVMVF9DRkcudmVoaWNsZUFlc0tleTtjLnZlaGljbGVDb250cm9sUmlzaz0iIjtjLndpZGdldFZlaGljbGU9IiI7Yy5jdXN0b21CZz0iIjtzYXZlQ2ZnKGMpO2FwcGx5Q3VzdG9tQmcoKTtpZihlbCgid2lkZ2V0X2FjYyIpKXtlbCgid2lkZ2V0X2FjYyIpLnZhbHVlPSIiO2VsKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPSIiO31jb25zdCBicD1lbCgiYmdQcmV2aWV3Iik7aWYoYnApe2JwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjticC50ZXh0Q29udGVudD0i5pyq6YCJ5oupIjt9dG9hc3QoIuW3suaBouWkjem7mOiupO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX0KZnVuY3Rpb24gYWRkQWNjb3VudFVJKCl7Y2ZnQWNjb3VudHMucHVzaCh7dXNlck5hbWU6IiIsdXNlcklkOiIiLHRva2VuOiIiLGJhcmtLZXk6IiJ9KTtjb25zdCBsaXN0PWVsKCJhY2NMaXN0Iik7Y29uc3QgaWR4PWNmZ0FjY291bnRzLmxlbmd0aC0xO2NvbnN0IGh0bWw9JzxkaXYgY2xhc3M9ImFjYy1lZGl0IiBkYXRhLWk9IicraWR4KyciPjxkaXYgY2xhc3M9ImFjYy1lZGl0LWhlYWQiPjxzcGFuIGNsYXNzPSJhY2MtZWRpdC10aXRsZSI+PHNwYW4gY2xhc3M9Im4iPicrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPui0puWPtyAnK1N0cmluZyhpZHgrMSkrJ++8iOaWsO+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iYWN0cyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBpZD0idWlkQnRuXycraWR4KyciIG9uY2xpY2s9ImZldGNoVXNlcklkVUkoJytpZHgrJykiPuiOt+WPlklEPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIGRhbmdlciIgb25jbGljaz0iZGVsZXRlQWNjb3VudFVJKCcraWR4KycpIj7liKDpmaQ8L2J1dHRvbj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mmLXnp7A8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX25hbWVfJytpZHgrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i55WZ56m65Y+v54K544CM6I635Y+WSUTjgI0iPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW48L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3Rva2VuXycraWR4KyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+JztpZihsaXN0LnF1ZXJ5U2VsZWN0b3IoIi5hY2MtZWRpdCIpfHxsaXN0LnF1ZXJ5U2VsZWN0b3IoIltzdHlsZSo9J3RleHQtYWxpZ24nXSIpKXtsaXN0Lmluc2VydEFkamFjZW50SFRNTCgiYmVmb3JlZW5kIixodG1sKX1lbHNle2xpc3QuaW5uZXJIVE1MPWh0bWx9fQpmdW5jdGlvbiBkZWxldGVBY2NvdW50VUkoaWR4KXtjb25zdCByb3c9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFjYy1lZGl0W2RhdGEtaT0iJytpZHgrJyJdJyk7aWYocm93KXtyb3cucmVtb3ZlKCk7Y2ZnQWNjb3VudHMuc3BsaWNlKGlkeCwxKTt0b2FzdCgi5bey5Yig6Zmk77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfX0KZnVuY3Rpb24gY29sbGVjdEFjY291bnRzVUkoKXtjb25zdCByb3dzPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNhY2NMaXN0IC5hY2MtZWRpdCIpO2NvbnN0IGxpc3Q9W107cm93cy5mb3JFYWNoKHJvdz0+e2NvbnN0IGk9cm93LmdldEF0dHJpYnV0ZSgiZGF0YS1pIik7Y29uc3QgdG9rZW49ZWwoImFjY190b2tlbl8iK2kpPy52YWx1ZXx8IiI7aWYodG9rZW4udHJpbSgpKXtsaXN0LnB1c2goe3VzZXJOYW1lOmVsKCJhY2NfbmFtZV8iK2kpPy52YWx1ZXx8IiIsdXNlcklkOmVsKCJhY2NfdWlkXyIraSk/LnZhbHVlfHwiIix0b2tlbjpjbGVhblRva2VuKHRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShlbCgiYWNjX2JhcmtfIitpKT8udmFsdWV8fCIiKX0pfX0pO3JldHVybiBsaXN0fQphc3luYyBmdW5jdGlvbiBzYXZlQWNjb3VudHNVSSgpe2NvbnN0IGxpc3Q9Y29sbGVjdEFjY291bnRzVUkoKS5tYXAoYT0+KHt1c2VyTmFtZTooYS51c2VyTmFtZXx8IiIpLnRyaW0oKSx1c2VySWQ6KGEudXNlcklkfHwiIikudHJpbSgpLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5KX0pKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVBY2NvdW50cyhsaXN0KTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSlTVEFURS5wYW5lbEFjY291bnRzPWxpc3Q7dG9hc3QoIuaegeaguOi0puWPt+W3suS/neWtmCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hVc2VySWRVSShpZHgpe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oZWwoImFjY190b2tlbl8iK2lkeCk/LnZhbHVlfHwiIik7Y29uc3QgYnRuPWVsKCJ1aWRCdG5fIitpZHgpO2lmKCF0b2tlbil7dG9hc3QoIuivt+WFiOWhq+WGmSBUb2tlbiIsImVyciIpO3JldHVybn1idG4udGV4dENvbnRlbnQ9IuiOt+WPluS4reKApiI7YnRuLmRpc2FibGVkPXRydWU7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldFVzZXJpZCh0b2tlbik7aWYoZCYmZC5vayYmZC51c2VySWQpe2lmKGVsKCJhY2NfdWlkXyIraWR4KSllbCgiYWNjX3VpZF8iK2lkeCkudmFsdWU9ZC51c2VySWQ7aWYoZC51c2VyTmFtZSYmZWwoImFjY19uYW1lXyIraWR4KSYmIWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWUpZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZT1kLnVzZXJOYW1lO3RvYXN0KCLojrflj5bmiJDlip/vvJoiKyhkLnVzZXJOYW1lfHxkLnVzZXJJZCksIm9rIil9ZWxzZXt0b2FzdCgi6I635Y+W5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5pyq55+l6ZSZ6K+vIiksImVyciIpfWJ0bi50ZXh0Q29udGVudD0i6I635Y+WSUQiO2J0bi5kaXNhYmxlZD1mYWxzZX0KCi8qID09PT09PT09PT09PT09PT09IOWkh+S7vSAvIOaBouWkjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBleHBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsKXt0b2FzdCgi55WM6Z2i5pyq5bCx57uqIiwiZXJyIik7cmV0dXJufWVsLnZhbHVlPSLnlJ/miJDkuK3igKYiO0JhY2tlbmQuYmFja3VwKCkudGhlbihkPT57aWYoZCYmZC5vayl7ZWwudmFsdWU9SlNPTi5zdHJpbmdpZnkoZCxudWxsLDIpO3RvYXN0KCLlpIfku73lt7LnlJ/miJDvvIzlj6/lpI3liLbkv53lrZgiLCJvayIpfWVsc2V7ZWwudmFsdWU9IiI7dG9hc3QoIuWvvOWHuuWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuaXoOazlei/nuaOpeiEmuacrOWQjuerryIpLCJlcnIiKX19KX0KZnVuY3Rpb24gY29weUJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZSl7dG9hc3QoIuivt+WFiOeCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjSIsImVyciIpO3JldHVybn1pZihuYXZpZ2F0b3IuY2xpcGJvYXJkJiZuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCl7bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZWwudmFsdWUpLnRoZW4oKCk9PnRvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpLCgpPT57ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX0pfWVsc2V7ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX19CmZ1bmN0aW9uIGltcG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZS50cmltKCkpe3RvYXN0KCLor7flhYjnspjotLTlpIfku73lhoXlrrkiLCJlcnIiKTtyZXR1cm59Y29uZmlybURpYWxvZygi5oGi5aSN5aSH5Lu9Iiwi5bCG6KaG55uW5b2T5YmN5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5q2k5pON5L2c5LiN5Y+v5pKk6ZSA44CCIiwiaW1wb3J0QmFja3VwTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGltcG9ydEJhY2t1cE5vdygpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7Y29uc3Qgdj1lbD9lbC52YWx1ZS50cmltKCk6IiI7aWYoIXYpe3RvYXN0KCLlpIfku73lhoXlrrnkuLrnqboiLCJlcnIiKTtyZXR1cm59Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnJlc3RvcmVCYWNrdXAodik7aWYoZCYmZC5vayl7dG9hc3QoIuaBouWkjeaIkOWKn++8miIrKGQuY291bnR8fDApKyIg5Liq6LSm5Y+3Iiwib2siKTtpZihpc1Byb3h5TW9kZSgpKXtTVEFURS5wYW5lbEFjY291bnRzPVtdO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfVNUQVRFLmRhdGE9W107cmVuZGVyQ2ZnKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLmgaLlpI3lpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLlpIfku73lhoXlrrnmoLzlvI/plJnor68iKSwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDmvJTnpLrmlbDmja7vvIg/ZGVtbyDpooTop4jnlKjvvIzkuI3ogZTnvZHvvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gaXNEZW1vKCl7cmV0dXJuIGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTB9CmZ1bmN0aW9uIGRlbW9DYWwoKXsKICBjb25zdCBub3c9bmV3IERhdGUoKSx5PW5vdy5nZXRGdWxsWWVhcigpLG09bm93LmdldE1vbnRoKCkrMSxkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKSxwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIiksb3V0PVtdOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9eSsiLSIrcChtKSsiLSIrcChkKTsKICAgIGlmKGRzPnkrIi0iK3AobSkrIi0iK3Aobm93LmdldERhdGUoKSkpYnJlYWs7CiAgICBpZihkPT09M3x8ZD09PTExKWNvbnRpbnVlOyAgICAgICAgICAvLyDmvJTnpLrvvJrkuKTlpKnmvI/nrb4KICAgIG91dC5wdXNoKHtjcmVhdGVEYXRlOmRzLHNpZ25TdGF0dWU6NX0pOwogIH0KICByZXR1cm4gb3V0Owp9CmNvbnN0IERFTU9fSU5URUdSQUw9e29rOnRydWUsdG90YWw6e2ludGVncmFsVG90YWw6IjEyLDg4MCJ9LGV4cGlyZTpbe2ludGVncmFsU2NvcmU6MzIwLGV4cGlyeURhdGVTdHI6IjIwMjYtMTItMzEifV0sZGV0YWlsOlsKICB7bmFtZToi5q+P5pel562+5YiwIixpbnRlZ3JhbFNjb3JlOjYsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuuWPkeW4liIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrngrnotZ4iLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy65YiG5LqrIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuebsuebkuWlluWKsSIsaW50ZWdyYWxTY29yZTo2LG15RGF0ZVN0cjoiMjAyNi0wOS0yOCAwNzowMCJ9LAogIHtuYW1lOiLooaXnrb7mtojogJciLGludGVncmFsU2NvcmU6LTEsbXlEYXRlU3RyOiIyMDI2LTA5LTI3IDIxOjEwIn0KXX07CmNvbnN0IERFTU9fU1VQUExFTUVOVD17Y291bnQ6e29rOnRydWUsZGF0YTp7Y291bnQ6MixjYXJkTnVtOjJ9fSxtb250aDp7b2s6dHJ1ZSxkYXRhOntub3dTaWduRGV0YWlsVm9zOltdfX19Owpjb25zdCBERU1PX01PTklUT1I9e29rOnRydWUsc25hcHNob3Q6e3ZpbjoiTEI3Sk0xQzEwTkEwMDAwMDEiLHNvYzo3NixyYW5nZTo2Myx2b2x0YWdlOjg0LjUsY3VycmVudDowLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGhlYWRMb2NrOiIxIixvZmZsaW5lOmZhbHNlLHJlZnJlc2hUaW1lOiIyMDI2LTA5LTI5IDAzOjEwIixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsYmF0dGVyeVRlbXA6MjYsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixhZGRyZXNzOiLnpo/lu7rnnIHlroHlvrfluILolYnln47ljLrkuJzkvqjlvIDlj5HljLoiLHNlcnZpY2VFbmREYXRlOiIyMDI3LTAzLTE4In0sCiAgdmVoaWNsZXM6W3t2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVUeXBlOiJBRTQgTUFYMisifSx7dmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZVR5cGU6IkFFNiJ9XX07CmNvbnN0IERFTU9fQ1RSTF9PUFRTPXtvazp0cnVlLGNoYXJnZVBvd2VyOlt7a2V5OiI0MDAifSx7a2V5OiI4MDAifSx7a2V5OiIxMDAwIn1dLGdlYXJzOlsiMjUiLCI0NSIsIjYwIl19Owpjb25zdCBERU1PX0lORk89e29rOnRydWUsdW5yZWFkOnt0b3RhbDozfSxwcml6ZVJlY29yZHM6e3JlY29yZHM6W3twcml6ZXNOYW1lOiLnp6/liIYgKzYiLGNyZWF0ZVRpbWU6IjIwMjYtMDktMjggMDc6MDAiLGludGVncmFsOjZ9LHtwcml6ZXNOYW1lOiLooaXnrb7ljaEgw5cxIixjcmVhdGVUaW1lOiIyMDI2LTA5LTIxIDA3OjAwIn1dfSxjb3Vwb25zOntyZWNvcmRzOlt7fSx7fSx7fV19LG90YTpbXX07CmNvbnN0IERFTU9fREFUQT1bCnt1c2VyTmFtZToi6Zi/5rO9Iix1c2VySWQ6IjIwMjUxMDA5MTIzNDU2NzgiLHNjb3JlOjEyODgwLHNpZ25lZFRvZGF5OnRydWUsY29udGludWVEYXlzOjQyLHRvZGF5U2NvcmU6MTIsc2lnbkNvdW50OjM2LHRva2VuVmFsaWQ6dHJ1ZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6dHJ1ZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIixiYXR0ZXJ5UGVyY2VudDo3NixyZXNpZHVhbFJhbmdlS206NjMscmFuZ2VFc3RpbWF0ZWQ6ZmFsc2UsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTo4NC41LGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDoyNixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixsYXN0UmlkZU1pbGVhZ2U6OC4yLHRvdGFsTWlsZWFnZToyNzEwNS4yLHllc3RlcmRheURpc3RhbmNlOjg4LjQsb25saW5lOiIxIixwb3dlclN0YXR1czoiMCIsbG9ja1N0YXRlOiIxIixjdXNoaW9uU3RhdGU6IjAiLGFkZHJlc3M6Iuemj+W7uuecgeWugeW+t+W4guiVieWfjuWMuuS4nOS+qOW8gOWPkeWMuiIsbG9jYXRpb25UaW1lOiIwODoxMiIsbG9uZ2l0dWRlOjExOS41NTA5LGxhdGl0dWRlOjI2LjY2NTQsc2VydmljZUVuZERhdGU6IjIwMjctMDMtMTgifX0sCnt1c2VyTmFtZToi5bCP5ruhIix1c2VySWQ6IjIwMjYwMTAxMTEyMjMzNDQiLHNjb3JlOjUyMCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6Myx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjksdG9rZW5WYWxpZDpmYWxzZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsYmF0dGVyeVBlcmNlbnQ6MjMscmVzaWR1YWxSYW5nZUttOjIwLHJhbmdlRXN0aW1hdGVkOnRydWUsY2hhcmdlU3RhdGU6IuWFheeUteS4rSIsdm9sdGFnZTo4Ni4yLGN1cnJlbnQ6NS40LGJhdHRlcnlUZW1wOjMxLHRvdGFsTWlsZWFnZTowLHllc3RlcmRheURpc3RhbmNlOjAsY3VycmVudFZpbjoiTEI3Sk0xQzEwTkEwMDAwMDIiLHZlaGljbGVzOlt7bmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIn0se25hbWU6IkFFNWlQcm9NYXgiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMyJ9XSxmcm9udFByZXNzdXJlOiIyLjEwYmFyIixyZWFyUHJlc3N1cmU6IiIsZnJvbnRUZW1wOiIiLHJlYXJUZW1wOiIiLHRvZGF5RGlzdGFuY2U6MCx0b2RheUR1cmF0aW9uOjAsdG9kYXlNYXhTcGVlZDowLGxhc3RSaWRlTWlsZWFnZTowLG9ubGluZToiMCIscG93ZXJTdGF0dXM6IjEiLGxvY2tTdGF0ZToiMCIsY3VzaGlvblN0YXRlOiIxIixhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiIsc2VydmljZUVuZERhdGU6IiJ9fSwKe3VzZXJOYW1lOiJsdeWwj+WPtyIsdXNlcklkOiIyMDI2MDkyNTAwMDk0MTI4MyIsc2NvcmU6MTE1LHNpZ25lZFRvZGF5OnRydWUsY29udGludWVEYXlzOjQsdG9kYXlTY29yZTo0LHNpZ25Db3VudDo0LHRva2VuVmFsaWQ6dHJ1ZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6dHJ1ZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX0KXTsKY29uc3QgREVNT19MT0dTPVsKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTIiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2FpbjoxMixzaWduaW5TY29yZTo2LGJsaW5kQm94U2NvcmU6NixpbnRlcmFjdFNjb3JlOjAsY29udGludWVEYXlzOjQyLHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICs2ICjnp6/liIYpIiwi55uy55uS5pyq6Kej6ZSBKDM2LzMwKSJdfSwKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTUiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ8iLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0sCnt0aW1lOiIyMDI2LTA5LTA5IDIyOjMxOjA1Iix0eXBlOiJ2ZWhpY2xlIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsYWN0aW9uVGV4dDoi5LqR56uv5byA6ZSBIixtZXNzYWdlOiLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiLHN0ZXBzOltdfQpdOwoKLyogPT09PT09PT09PT09PT09PT0g5Yi35pawICYg5Yid5aeL5YyWID09PT09PT09PT09PT09PT09ICovCmxldCBsb2FkaW5nPWZhbHNlOwovLyDlhaXlnLrpl6rlsY/vvJrpobXpnaLlj6/kuqTkupLvvIjpqqjmnrblsY/lt7LmuLLmn5PvvInljbPmkqTkuIvvvIzkuI3lho3nrYnnvZHnu5zmlbDmja7vvJvmlbDmja7liLDovr7lkI7lho3loavlhYUKZnVuY3Rpb24gaGlkZVNwbGFzaCgpe2NvbnN0IHM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNwbGFzaCIpO2lmKCFzKXJldHVybjtzLmNsYXNzTGlzdC5hZGQoIm91dCIpO3NldFRpbWVvdXQoKCk9PntpZihzLnBhcmVudE5vZGUpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHMpfSw0NTApfQphc3luYyBmdW5jdGlvbiByZWZyZXNoQWxsKHNpbGVudCl7CiAgaWYobG9hZGluZylyZXR1cm47bG9hZGluZz10cnVlOwogIGlmKCFzaWxlbnQpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2lmKCFTVEFURS5kYXRhLmxlbmd0aCllbC5pbm5lckhUTUw9c2tlbGV0b25Ib21lKCl9CiAgaGlkZVNwbGFzaCgpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXREYXNoYm9hcmQoKTsKICBsb2FkaW5nPWZhbHNlOwogIGlmKGQmJmQub2spe1NUQVRFLmRhdGE9ZC5hY2NvdW50c3x8W107U1RBVEUudHNUZXh0PWZtdFRpbWUoZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9aXNQcm94eU1vZGUoKTtyZW5kZXJIb21lKCl9CiAgZWxzZXtjb25zdCBoaW50PWQmJmQucmF3JiZkLnJhdy5lcnJvcj9uZXR3b3JrSGludChkLnJhdyk6IiI7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaVsOaNruWKoOi9veWksei0pTwvaDM+PHA+JysoaGludHx8ZXNjKChkJiZkLmVycm9yKXx8Iue9kee7nOW8guW4uO+8jOivt+ajgOafpee9kee7nOi/nuaOpSIpKSsnPC9wPjxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyIj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icmVmcmVzaEFsbCgpIj7ph43or5U8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5qOA5p+l6K6+572uPC9idXR0b24+PC9kaXY+PC9kaXY+J30KfQovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOenr+WIhumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgUFQ9e2FjY0lkeDowLG1vbnRoOiIiLG1vbnRoU2V0RGF5OiIifTsKZnVuY3Rpb24gcHRBY2NvdW50cygpe3JldHVybiBTVEFURS5kYXRhJiZTVEFURS5kYXRhLmxlbmd0aD9TVEFURS5kYXRhOihTVEFURS5wYW5lbEFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8Iui0puWPtyIsdXNlcklkOmEudXNlcklkfHwiIn0pKX0KZnVuY3Rpb24gYWNjQ2hpcHNIdG1sKHByZWZpeCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiIiOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNoaXBzIj4nK2xpc3QubWFwKChhLGkpPT4nPGJ1dHRvbiBjbGFzcz0iYWNjLWNoaXAgJysoaT09PShwcmVmaXg9PT0icHQiP1BULmFjY0lkeDpWSC5hY2NJZHgpPydvbic6JycpKyciIG9uY2xpY2s9InBpY2tBY2MoXCcnK3ByZWZpeCsnXCcsJytpKycpIj4nK2VzYyhhLnVzZXJOYW1lfHwoIui0puWPtyIrKGkrMSkpKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7Cn0KZnVuY3Rpb24gcGlja0FjYyhwcmVmaXgsaSl7aWYocHJlZml4PT09InB0Iil7UFQuYWNjSWR4PWk7cmVuZGVyUG9pbnRzKCl9ZWxzZXtWSC5hY2NJZHg9aTtWSC52aW49IiI7cmVuZGVyVmVoaWNsZVBhZ2UoKX19CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclBvaW50cygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlUG9pbnRzIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihQVC5hY2NJZHg+PWxpc3QubGVuZ3RoKVBULmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1BULmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjxwPuivt+WIsOiuvue9rumhteihpeWFqOeUqOaIt0lEPC9wPjwvZGl2Pic7cmV0dXJufQogIGVsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5IiBzdHlsZT0icGFkZGluZzo0MHB4IDIwcHgiPjxwIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L2956ev5YiG5pWw5o2u5Lit4oCmPC9wPjwvZGl2Pic7CiAgLy8gdjIuMTQuMjAg5pel5Y6G6Leo5pyI5L+u5q2j77ya6Z2i5p2/5bi46am75pe2IFBULm1vbnRoIOWPr+iDvea7nueVmeS4iuaciOOAgui3qOWIsOaWsOaciOS7ve+8iOS7iuWkqeS4jeaYr+iuvue9ruivpeaciOS7vemCo+Wkqe+8ieWQjuiHquWKqOWbnuWIsOW9k+WJjeaciO+8jAogIC8vIOmBv+WFjSAxMOaciDHlj7cg5pe25pel5Y6G5LuN5YGc5ZyoIDnmnIgzMOWPt++8iOS4iuaciO+8ieaYvuekuuS4jeWHhuehruOAggogIGNvbnN0IF9ub3c9bmV3IERhdGUoKTsKICBjb25zdCBfY3VyTT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IF90ZHk9X25vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX25vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF9ub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgaWYoUFQubW9udGgmJlBULm1vbnRoU2V0RGF5JiZQVC5tb250aFNldERheSE9PV90ZHkmJlBULm1vbnRoPF9jdXJNKXtQVC5tb250aD0iIjtQVC5tb250aFNldERheT0iIjt9CiAgY29uc3QgbW9udGg9UFQubW9udGh8fF9jdXJNOwogIGNvbnN0IFtpdCxjYWwsY250XSA9IGF3YWl0IFByb21pc2UuYWxsKFsKICAgIEJhY2tlbmQuaW50ZWdyYWwoYWNjLnVzZXJJZCwxKSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgibW9udGgiLGFjYy51c2VySWQse21vbnRoOm1vbnRofSksCiAgICBCYWNrZW5kLnN1cHBsZW1lbnQoImNvdW50IixhY2MudXNlcklkLHt9KQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgicHQiKTsKICAvLyDmgLvop4jvvIh2Mi4xNC4yMCDlhbzlrrkgZGF0YSDkuLrnuq/mlbDlrZfmiJblr7nosaHkuKTnp43ov5Tlm57vvIkKICBjb25zdCB0b3RhbD0oaXQmJml0LnRvdGFsIT1udWxsKT8oKHR5cGVvZiBpdC50b3RhbD09PSJudW1iZXIifHwodHlwZW9mIGl0LnRvdGFsPT09InN0cmluZyImJml0LnRvdGFsIT09IiIpKT9TdHJpbmcoaXQudG90YWwpOmRlZXBQaWNrKGl0LnRvdGFsLFsiaW50ZWdyYWxUb3RhbCIsInRvdGFsSW50ZWdyYWwiLCJzY29yZSIsImludGVncmFsIiwidG90YWwiXSw0KSk6IiI7CiAgY29uc3QgY2FyZE51bT0oY250JiZjbnQuZGF0YSE9bnVsbCk/KCh0eXBlb2YgY250LmRhdGE9PT0ibnVtYmVyInx8KHR5cGVvZiBjbnQuZGF0YT09PSJzdHJpbmciJiZjbnQuZGF0YSE9PSIiKSk/U3RyaW5nKGNudC5kYXRhKTpkZWVwUGljayhjbnQuZGF0YSxbImNvdW50IiwiY2FyZE51bSIsImNhcmRDb3VudCIsIm51bWJlciIsIm51bSIsInNpZ25Db3VudCIsInNpZ25TdXBwbGVtZW50Q291bnQiLCJyZWlzc3VlQ2FyZE51bSIsInN1cHBsZW1lbnRDYXJkTnVtIiwiY2FyZFRvdGFsIiwidG90YWwiXSw0KSk6IiI7CiAgaHRtbCs9JzxkaXYgY2xhc3M9InB0LWdyaWQiPicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuW9k+WJjeaAu+enr+WIhjwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModG90YWx8fCItLSIpKyc8L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InB0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ooaXnrb7ljaE8L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKGNhcmROdW18fCItLSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzdWIiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgc3R5bGU9Im1hcmdpbi10b3A6NHB4IiBvbmNsaWNrPSJzdXBHYWluKCkiPuenr+WIhuWFkeaNouihpeetvuWNoTwvYnV0dG9uPjwvZGl2PjwvZGl2PicKICAgICsnPC9kaXY+JzsKICAvLyDnm7Lnm5Lov5vluqbvvIh2Mi4xNC4xNCDotbfnlLHpppbpobXov4Hnp7voh7PmraTvvIkKICBjb25zdCBjb250PU51bWJlcihhY2MuY29udGludWVEYXlzfHwwKTsKICBjb25zdCBiRGF5PWNvbnQ9PT0wPzA6KChjb250LTEpJTMwKSsxO2NvbnN0IGJSb3VuZD1jb250PT09MD8wOk1hdGguY2VpbChjb250LzMwKTtjb25zdCBiUGN0PU1hdGgucm91bmQoKGJEYXkvMzApKjEwMCk7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImJsaW5kIiBzdHlsZT0ibWFyZ2luOjAgMCAxMnB4Ij48ZGl2IGNsYXNzPSJibGluZC10b3AiPjxzcGFuPuebsuebkui/m+W6pu+8iOesrCcrYlJvdW5kKyfova7vvIk8L3NwYW4+PHNwYW4gY2xhc3M9InIgbnVtIj4nK2JEYXkrJyAvIDMwIMK3ICcrYlBjdCsnJSDCtyDov57nrb4gJytjb250Kycg5aSpPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImJsaW5kLWJhciI+PGRpdiBjbGFzcz0iYmxpbmQtZmlsbCIgc3R5bGU9IndpZHRoOicrYlBjdCsnJSI+PC9kaXY+PC9kaXY+PC9kaXY+JzsKICAvLyDnrb7liLDml6XljoYKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5jaGVjaysn562+5Yiw5pel5Y6GIMK3ICcrZXNjKG1vbnRoKSsnPC9oND48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InB0TW9udGhTaGlmdCgtMSkiPuS4iuaciDwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgZGF5cz0oY2FsJiZjYWwuZGF0YSYmY2FsLmRhdGEubm93U2lnbkRldGFpbFZvcyl8fFtdOwogIGlmKGRheXMubGVuZ3RoKXsKICAgIGh0bWwrPWNhbEh0bWwoZGF5cyxtb250aCxhY2MudXNlcklkKTsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtwYWRkaW5nOjhweCAwIj4nKyhjYWwmJmNhbC5tZXNzYWdlP2VzYyhjYWwubWVzc2FnZSk6IuaXpeWOhuWKoOi9veWksei0pe+8iOWPr+iDvemZkOa1ge+8jOeojeWQjuWGjeivle+8iSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyB2Mi4xNC4yMSDliKDpmaTnp6/liIbmtYHmsLTvvIjnp6/liIbor6bmg4XvvInljLrlnZcKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+56ev5YiG5pWw5o2u5p2l6Ieq5p6B5qC45a6e5pe2IEFQSSDCtyDooaXnrb7pmZAgMzAg5aSp5YaF5ryP562+77yM5q+P5qyh5raI6ICXIDEg5byg6KGl562+5Y2hPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQpmdW5jdGlvbiBjYWxIdG1sKGRheXMsbW9udGgsdXNlcklkKXsKICBjb25zdCB5bT1tb250aC5zcGxpdCgiLSIpO2NvbnN0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSk7CiAgY29uc3QgZmlyc3Q9bmV3IERhdGUoeSxtLTEsMSkuZ2V0RGF5KCk7CiAgY29uc3QgZGltPW5ldyBEYXRlKHksbSwwKS5nZXREYXRlKCk7CiAgY29uc3QgdG9kYXk9bmV3IERhdGUoKTtjb25zdCB0U3RyPXRvZGF5LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyh0b2RheS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKHRvZGF5LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGxldCBoPSc8ZGl2IGNsYXNzPSJjYWwtZ3JpZCI+JzsKICBbIuaXpSIsIuS4gCIsIuS6jCIsIuS4iSIsIuWbmyIsIuS6lCIsIuWFrSJdLmZvckVhY2godz0+e2grPSc8ZGl2IGNsYXNzPSJjYWwtd2QiPicrdysnPC9kaXY+J30pOwogIGZvcihsZXQgaT0wO2k8Zmlyc3Q7aSsrKWgrPSc8ZGl2IGNsYXNzPSJjYWwtZCBibGFuayI+PC9kaXY+JzsKICBmb3IobGV0IGQ9MTtkPD1kaW07ZCsrKXsKICAgIGNvbnN0IGRzPW1vbnRoKyItIitTdHJpbmcoZCkucGFkU3RhcnQoMiwiMCIpOwogICAgY29uc3QgZW50cnk9ZGF5cy5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTsKICAgIGNvbnN0IHNpZ25lZD1lbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApOwogICAgY29uc3QgaXNUb2RheT1kcz09PXRTdHI7CiAgICBjb25zdCBmdXR1cmU9ZHM+dFN0cjsKICAgIGxldCBjbHM9ImNhbC1kIisoc2lnbmVkPyIgc2lnbmVkIjooZnV0dXJlPyIgZnV0dXJlIjooZW50cnk/IiBtaXNzIjoiIikpKTsKICAgIGlmKGlzVG9kYXkpY2xzKz0iIHRvZGF5IjsKICAgIGNvbnN0IGNsaWNrYWJsZT0hc2lnbmVkJiYhZnV0dXJlJiZlbnRyeTsKICAgIGgrPSc8ZGl2IGNsYXNzPSInK2NscysnIiAnKyhjbGlja2FibGU/J3N0eWxlPSJjdXJzb3I6cG9pbnRlciIgb25jbGljaz0ic3VwQ29uc3VtZShcJycrZHMrJ1wnLFwnJytlc2ModXNlcklkKSsnXCcpIic6JycpKyc+JwogICAgICArJzxzcGFuPicrZCsnPC9zcGFuPicKICAgICAgKyc8c3BhbiBjbGFzcz0iZG90Ij4nKyhzaWduZWQ/IuKckyI6KGZ1dHVyZT8iIjooZW50cnk/Iua8jyI6IiIpKSkrJzwvc3Bhbj4nCiAgICAgICsnPC9kaXY+JzsKICB9CiAgaCs9JzwvZGl2Pic7CiAgaCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPueCueWHu+OAjOa8j+OAjeaXpeacn+S9v+eUqOihpeetvuWNoeihpeetvu+8iOmcgOWFiOacieihpeetvuWNoe+8iTwvZGl2Pic7CiAgcmV0dXJuIGg7Cn0KZnVuY3Rpb24gcHRNb250aFNoaWZ0KGRpcil7CiAgY29uc3QgY3VyPVBULm1vbnRofHxuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IHltPWN1ci5zcGxpdCgiLSIpO2xldCB5PU51bWJlcih5bVswXSksbT1OdW1iZXIoeW1bMV0pK2RpcjsKICBpZihtPDEpe209MTI7eS0tfWlmKG0+MTIpe209MTt5Kyt9CiAgUFQubW9udGg9eSsiLSIrU3RyaW5nKG0pLnBhZFN0YXJ0KDIsIjAiKTsKICAvLyDorrDlvZXorr7nva7or6XmnIjku73nmoTlvZPlpKnvvIzot6jmnIjlkI4gcmVuZGVyUG9pbnRzIOaNruatpOaKiua7nueVmeeahOS4iuaciOiHquWKqOWkjeS9jeWIsOW9k+WJjeaciAogIGNvbnN0IGQ9bmV3IERhdGUoKTsKICBQVC5tb250aFNldERheT1kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICByZW5kZXJQb2ludHMoKTsKfQphc3luYyBmdW5jdGlvbiBzdXBDb25zdW1lKGRhdGUsdXNlcklkKXsKICBjb25maXJtRGlhbG9nKCLnp6/liIbooaXnrb4iLCLkvb/nlKggMSDlvKDooaXnrb7ljaHooaXnrb4gIitkYXRlKyIg77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuihpeetvuS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJjb25zdW1lIix1c2VySWQse2RhdGVUaW1lOmRhdGV9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLooaXnrb7miJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi6KGl562+5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTooaXnrb4iKTsKfQphc3luYyBmdW5jdGlvbiBzdXBHYWluKCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uZmlybURpYWxvZygi5YWR5o2i6KGl562+5Y2hIiwi5L2/55So56ev5YiG5YWR5o2iIDEg5byg6KGl562+5Y2h77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuWFkeaNouS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJnYWluIixhY2MudXNlcklkLHt9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLlhZHmjaLmiJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi5YWR5o2i5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTlhZHmjaIiKTsKfQoKLyogPT09PT09PT09PT09PT09PT0gdjIuMTQuOSDovabovobpobXvvIjnm5HmjqcgKyDovabmjqfmianlsZUgKyDkv6Hmga/kuK3lv4PvvIkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFZIPXthY2NJZHg6MCx2aW46IiIsY3A6IiIsbG9ja1R5cGU6IjEifTsKYXN5bmMgZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVZlaGljbGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFZILmFjY0lkeD49bGlzdC5sZW5ndGgpVkguYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3ovabovobmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBsZXQgbW9uPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCwiIik7CiAgY29uc3QgdmVoTGlzdD0obW9uJiZBcnJheS5pc0FycmF5KG1vbi52ZWhpY2xlcykpP21vbi52ZWhpY2xlczpbXTsKICBpZihWSC52aW4mJm1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QmJm1vbi5zbmFwc2hvdC52aW4hPT1WSC52aW4pewogICAgY29uc3QgbW9uMj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsVkgudmluKTsKICAgIGlmKG1vbjImJm1vbjIub2spe21vbjIudmVoaWNsZXM9dmVoTGlzdDttb249bW9uMn0KICB9CiAgY29uc3QgW29wdHMsaW5mb109YXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dCh7YWN0aW9uOiJvcHRpb25zIix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn0pLAogICAgQmFja2VuZC5pbmZvQ2VudGVyKGFjYy51c2VySWQsVkgudmlufHwiIikKICBdKTsKICBsZXQgaHRtbD1hY2NDaGlwc0h0bWwoInZoIik7CiAgLy8g6L2m6L6G6YCJ5oup77yI5aSa6L2m77yJCiAgaWYodmVoTGlzdC5sZW5ndGg+MSl7CiAgICBjb25zdCBjdXJWaW49VkgudmlufHwobW9uJiZtb24uc25hcHNob3Q/bW9uLnNuYXBzaG90LnZpbjp2ZWhMaXN0WzBdLnZpbk5vKTsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJvcHQtcm93Ij4nK3ZlaExpc3QubWFwKHY9Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhjdXJWaW49PT12LnZpbk5vPydvbic6JycpKyciIG9uY2xpY2s9IlZILnZpbj1cJycrZXNjKHYudmluTm8pKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyh2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lfHx2LnZpbk5vKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7CiAgfQogIC8vIOeKtuaAgeebkeaOp+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNhcisn6L2m6L6G54q25oCBPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2hvd1ZlaGljbGVEZXRhaWwoJytWSC5hY2NJZHgrJykiPuivpuaDhTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icmVuZGVyVmVoaWNsZVBhZ2UoKSI+5Yi35pawPC9idXR0b24+PC9zcGFuPjwvZGl2Pic7CiAgaWYobW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCl7CiAgICBjb25zdCBzbj1tb24uc25hcHNob3Q7CiAgICBjb25zdCBzb2NDb2w9c24uc29jPD0yMD8idmFyKC0tZXJyKSI6c24uc29jPD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1vaykiOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnlLXph488L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6Jytzb2NDb2wrJyI+Jysoc24uc29jIT1udWxsP3NuLnNvYysiJSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnu63oiKo8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nKyhzbi5yYW5nZSE9bnVsbD9zbi5yYW5nZSsiIGttIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPum+meWktOmUgTwvc3Bhbj48c3BhbiBjbGFzcz0idiI+Jysoc24uaGVhZExvY2s9PT0iMSI/IuW3sumUgSI6IuacqumUgSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Zyo57q/54q25oCBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iY29sb3I6Jysoc24ub2ZmbGluZT8idmFyKC0tZXJyKSI6InZhcigtLW9rKSIpKyciPicrKHNuLm9mZmxpbmU/Iuemu+e6v++8iD4zMOWIhumSn+acquS4iuaKpe+8iSI6IuWcqOe6vyIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyA5ZCO5LiK5oqlPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPicrZXNjKHNuLnJlZnJlc2hUaW1lfHwiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChtb24mJihtb24uZXJyb3J8fG1vbi5tZXNzYWdlKSl8fCLlv6vnhafojrflj5blpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g6L2m6L6G5o6n5Yi25Y2h77yI5LuO6aaW6aG16L+B56e76L+H5p2l77yJCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabovobmjqfliLY8L2g0PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iY3RybC1ncmlkIj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iZmluZCIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnZmluZFwnLHRoaXMpIj4nK0kuYmVsbCsn5a+76L2mPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImxvdWRGaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb3VkRmluZFwnLHRoaXMpIj4nK0kudm9sKyfpuKPnrJs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iY3VzaGlvbiIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnY3VzaGlvblwnLHRoaXMpIj4nK0kuc2VhdCsn5Z2Q5Z6rPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biB1bmxvY2siIGRhdGEtYWN0PSJ1bmxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ3VubG9ja1wnLHRoaXMpIj4nK0kudW5sb2NrKyflvIDplIE8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIGxvY2siIGRhdGEtYWN0PSJsb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb2NrXCcsdGhpcykiPicrSS5sb2NrKyflhbPplIE8L2J1dHRvbj4nCiAgICArJzwvZGl2PjwvZGl2Pic7CiAgLy8g6L2m5o6n5omp5bGV5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabmjqfmianlsZU8L2g0PjwvZGl2Pic7CiAgY29uc3QgY3BzPShvcHRzJiZBcnJheS5pc0FycmF5KG9wdHMuY2hhcmdlUG93ZXIpKT9vcHRzLmNoYXJnZVBvd2VyOltdOwogIGlmKGNwcy5sZW5ndGgpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjRweCI+5YWF55S15Yqf546H77yIV++8iTwvZGl2PjxkaXYgY2xhc3M9Im9wdC1yb3ciPicKICAgICAgK2Nwcy5tYXAobz0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKFZILmNwPT09by5rZXk/J29uJzonJykrJyIgb25jbGljaz0iVkguY3A9XCcnK2VzYyhvLmtleSkrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKG8ua2V5KSsnPC9idXR0b24+Jykuam9pbigiIikKICAgICAgKyc8YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iZXh0U2V0KFwnY2hhcmdlUG93ZXJcJykiPuiuvue9rjwvYnV0dG9uPjwvZGl2Pic7CiAgfQogIC8vIHYyLjE0LjIxIOWIoOmZpOmZkOmAn+aho+S9jeiuvue9rgogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOS/oeaBr+S4reW/g+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmJlbGwrJ+S/oeaBr+S4reW/gzwvaDQ+PC9kaXY+JzsKICBpZihpbmZvJiZpbmZvLm9rKXsKICAgIGNvbnN0IHVuPWluZm8udW5yZWFkIT1udWxsP2RlZXBQaWNrKGluZm8udW5yZWFkLFsidG90YWwiLCJjb3VudCIsInVuUmVhZENvdW50IiwibnVtIl0sMyk6IiI7CiAgICBpZih1biE9PSIiKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyq6K+75raI5oGvPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModW4pKyc8L3NwYW4+PC9kaXY+JzsKICAgIGNvbnN0IHByaXplcz0oaW5mby5wcml6ZVJlY29yZHMmJihpbmZvLnByaXplUmVjb3Jkcy5yZWNvcmRzfHxpbmZvLnByaXplUmVjb3Jkcy5saXN0fHxpbmZvLnByaXplUmVjb3JkcykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkocHJpemVzKSYmcHJpemVzLmxlbmd0aCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjhweCAwIDRweCI+55uy55uSL+S4reWlluiusOW9lTwvZGl2Pic7CiAgICAgIGh0bWwrPXByaXplcy5zbGljZSgwLDUpLm1hcChwPT4nPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2PjxkaXYgY2xhc3M9Im5tIj4nK2VzYyhwLnByaXplc05hbWV8fHAubmFtZXx8IuWlluWTgSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ0bSI+Jytlc2MocC5jcmVhdGVUaW1lfHxwLmNyZWF0ZURhdGV8fCIiKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ic2MgcGx1cyIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nK2VzYyhwLmludGVncmFsPygiKyIrcC5pbnRlZ3JhbCk6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKICAgIH0KICAgIGNvbnN0IGNvdXBvbnM9KGluZm8uY291cG9ucyYmKGluZm8uY291cG9ucy5yZWNvcmRzfHxpbmZvLmNvdXBvbnMubGlzdHx8aW5mby5jb3Vwb25zKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShjb3Vwb25zKSYmY291cG9ucy5sZW5ndGgpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7kvJjmg6DliLg8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nK2NvdXBvbnMubGVuZ3RoKycg5bygPC9zcGFuPjwvZGl2Pic7CiAgICBpZihpbmZvLm90YSE9bnVsbClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPk9UQSDljYfnuqc8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweCI+JysoQXJyYXkuaXNBcnJheShpbmZvLm90YSkmJmluZm8ub3RhLmxlbmd0aD8i5pyJ5paw54mI5pysIjoi5bey5piv5pyA5pawIikrJzwvc3Bhbj48L2Rpdj4nOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4Ij4nK2VzYygoaW5mbyYmKGluZm8uZXJyb3J8fGluZm8ubWVzc2FnZSkpfHwi5L+h5oGv5Lit5b+D5Yqg6L295aSx6LSlIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7ovabmjqfmianlsZXmjIfku6Tnu4/kupHnq6/kuIvlj5HvvIzlk43lupTlj6/og73ovoPmhaI8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9Cgphc3luYyBmdW5jdGlvbiBleHRTZXQoYWN0aW9uKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25zdCBib2R5PXthY3Rpb246YWN0aW9uLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifTsKICBpZihhY3Rpb249PT0iY2hhcmdlUG93ZXIiKXtpZighVkguY3Ape3RvYXN0KCLor7flhYjpgInmi6nlhYXnlLXlip/njociLCJlcnIiKTtyZXR1cm59Ym9keS52YWx1ZT1WSC5jcH0KICB0b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dChib2R5KTsKICB0b2FzdCgoZCYmZC5tZXNzYWdlKXx8KChkJiZkLm9rKT8i5oyH5Luk5bey5LiL5Y+RIjoi5oyH5Luk5aSx6LSlIiksKGQmJmQub2spPyJvayI6ImVyciIpOwp9CgpmdW5jdGlvbiBpbml0KCl7CiAgYXBwbHlUaGVtZSgpO2FwcGx5Q3VzdG9tQmcoKTttb3VudFNpZ25pbkZhYigpOwogIHJlbmRlckNmZygpOwogIGlmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApewogICAgU1RBVEUuZGF0YT1ERU1PX0RBVEE7U1RBVEUudHNUZXh0PWZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1mYWxzZTsKICAgIHJlbmRlckhvbWUoKTtoaWRlU3BsYXNoKCk7cmV0dXJuOwogIH0KICBzdGFydEF1dG9SZWZyZXNoKCk7cmVmcmVzaEFsbChmYWxzZSk7CiAgLy8gdjIuMTUuNiDniYjmnKzmo4DmtYvvvJrpppblsY/muLLmn5PlkI7pnZnpu5jmo4Dmn6XkuIDmrKHvvIjmnInmlrDniYjmnKzmiY3mj5DnpLrvvIkKICBpZighaXNEZW1vKCkpc2V0VGltZW91dCgoKT0+Y2hlY2tWZXJzaW9uKGZhbHNlKSwxNTAwKTsKICAvLyDlhZzlupXvvJrmnoHnq6/mg4XlhrXkuIvor7fmsYLplb/ml7bpl7Tml6Dlk43lupTvvIzpl6rlsY/kuZ/kuI3og73kuIDnm7TmjKHkvY/nlYzpnaIKICBzZXRUaW1lb3V0KGhpZGVTcGxhc2gsMTIwMDApOwp9CmluaXQoKTsKPC9zY3JpcHQ+CjwhLS1fX0pTNV9fLS0+Cg==";
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
  for (const u of VERSION_JSON_URLS) {
    try {
      const res = await httpGet(u + "?t=" + Math.floor(Date.now() / 300000), {});
      let o = null;
      if (res && res.script) o = res;
      else if (res && typeof res.raw === "string") { try { o = JSON.parse(res.raw); } catch(e) {} }
      if (o && o.script) {
        try { $.setdata(JSON.stringify({ ts: Date.now(), latest: o }), VERSION_CK); } catch(e) {}
        return { latest: o, cached: false };
      }
    } catch(e) {}
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