/*
#!name=极核 ZEEHO 签到面板 V2.14.13
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.14.13

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.14.13, requires-body=true, timeout=60, tag=极核面板V2.14.13

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
// 版本: v2.14.13
// 更新日期: 2026-09-28
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.14.13";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-09-28 v2.14.13 修复：车辆停放休眠被误报离线——离线判断改用官方TBOX在线状态，停放休眠不算离线，未知状态回退2小时时间戳阈值)`);

// 面板入口域名：Loon 用虚拟域名 zeeho.box（Loon 可虚拟劫持不存在的域名），
// QX 必须用真实可解析域名（默认 www.example.com，IANA 保留域名保证可解析）。
// 从当前请求自动推断，面板内绝对链接统一用 PANEL_HOST。
let PANEL_HOST = "http://zeeho.box";

// ========== 自动捕获 appId/appSecret ==========
// 匹配规则需同时覆盖 zeeho.box 和极核API：^https?://(zeeho\\.box|.*zeehoev\\.com)/.*
// 打开极核App时，API请求被拦截 → 自动提取appId保存 → 放行请求
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
  vehicleAesKey: "", // 云端开/关锁AES-256-ECB密钥(32位)。默认留空不内置，需用户在配置页手动填写并保存后才能使用云端开/关锁（防滥用）
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
        vehicleAesKey: (typeof c.vehicleAesKey === "string" ? c.vehicleAesKey : "").trim(),
        autoRefreshSec: normalizeRefreshSec(c.autoRefreshSec),
        basicAuth: (typeof c.basicAuth === "string" ? c.basicAuth : "").trim(),
        vehicleMonitor: c.vehicleMonitor === true,
        autoSignin: c.autoSignin === true,
        autoSigninTime: (typeof c.autoSigninTime === "string" && /^\d{1,2}:\d{2}$/.test(c.autoSigninTime) ? c.autoSigninTime : "07:00")
      };
    }
  } catch(e) {}
  // 看板无配置时，使用捕获脚本配置 + 默认值
  return {
    app: { appId: storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
    h5:  { appId: storeH5.appId || DEFAULT_CONFIG.h5.appId, appSecret: storeH5.appSecret || DEFAULT_CONFIG.h5.appSecret },
    community: JSON.parse(JSON.stringify(DEFAULT_CONFIG.community)),
    vehicleAesKey: "",
    autoRefreshSec: 60,
    basicAuth: "",
    vehicleMonitor: false,
    autoSignin: false,
    autoSigninTime: "07:00"
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
const OFFICIAL_UA = "MOBILE|iOS|16.1.1|ZEEHO_APP|3.0.5|iPhone|iPhone 14 Pro|1179*2556|DC0C4906-A4A8-4866-9432-B31E1E252D53|WWAN|iOS";
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
  return {
    "content-type": "application/json",
    "appid": c.app.appId,
    "authorization": `Bearer ${token}`,
    "accept": "*/*",
    "accept-language": "zh-CN",
    "user-agent": OFFICIAL_UA,
    "interfaceversion": "2",
    "x-app-info": OFFICIAL_UA,
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
          const cmtBody = JSON.stringify({ postid: String(postId), userId: String(userId), comments: "厉害", sendTos: "[\n\n]" });
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
// 云端开/关锁 AES-256-ECB 密钥【不再内置】：统一从配置 cfg.vehicleAesKey 读取，用户须在配置页手动填写并保存后才能开/关锁（防滥用）。
// 算法：AES-256-ECB/PKCS7（32位密钥按ASCII），明文为带空格换行JSON、lockFlag为字符串"1"/"0"，密文Base64放进 body{"secret":...}
const VEHICLE_ACTION_TEXT = { find: "短按寻车", loudFind: "鸣笛闪灯", cushion: "打开坐垫", unlock: "云端开锁", lock: "云端关锁" };
function vehicleBaseHeaders(acc, cfg) {
  // 与官方App真实请求头对齐：UA / x-app-info / Accept；user_id 同时走独立头与 Cookie（官方放在 Cookie 里）
  const ua = acc.userAgent || "MOBILE|iOS|16.1.1|ZEEHO_APP|3.0.1|iPhone|WWAN|iOS";
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
      // 密钥来自配置页 cfg.vehicleAesKey（默认不内置，必须先填写保存，防止脚本被滥用）。
      const vKey = (c.vehicleAesKey || "").trim();
      if (!vKey) return { ok: false, message: "尚未配置云端控车密钥：请到「配置 → 签名密钥配置」填写云端控车AES密钥并保存后，再使用开/关锁" };
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
    return {
      todayDistance: Number(day.rideMileage ?? h.rideMileageDay ?? 0),
      todayDuration: Number(day.ridingTimeDayUnitMinute ?? h.lastRidingTimeUnitMinute ?? 0),
      todayMaxSpeed: Number(day.maxSpeed ?? 0),
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
      return {
        chargeState: String(d.chargeStateStr || d.chargeState || "未充电"),
        voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
        current: isFinite(current) ? current : 0,
        batteryTemp: isFinite(batteryTemp) ? batteryTemp : 0,
        soc: Number(d.soc || d.batteryLevel || d.bmssoc || 0),
        residualRangeKm: isFinite(range) ? range : 0
      };
    }
    return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0 };
  } catch(e) { return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0 }; }
}

async function fetchVehicleInfo(acc, cfg, vinNo) {
  const result = { hasVehicle: false, vehicleName: "", vinNo: "", voltage: 0, current: 0, batteryTemp: 0, batteryPercent: 0, residualRangeKm: 0, rangeEstimated: false, address: "", locationTime: "", chargeState: "未充电", frontPressure: "", rearPressure: "", frontTemp: "", rearTemp: "", todayDistance: 0, todayDuration: 0, todayMaxSpeed: 0, lastRideMileage: 0, vehicleImageUrl: "", serviceEndDate: "", serviceRemainDays: 0, serviceStatus: "", powerStatus: "", lockState: "", online: "", rideState: "", cushionState: "", longitude: "", latitude: "" };
  try {
    const vehicles = await fetchVehicleList(acc, cfg);
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
      fetchBatteryChargeState(acc, cfg, v.vinNo).catch(() => ({ chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0 })),
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
    }
    result.chargeState = battery.chargeState || "未充电";
    if (battery.voltage) result.voltage = battery.voltage;
    if (battery.current) result.current = battery.current;
    if (battery.batteryTemp) result.batteryTemp = battery.batteryTemp;
    // 续航兜底：充电时 widgets/batteryInfo 都可能返回0，先尝试 batteryInfo，再基于电量估算
    if ((!result.residualRangeKm || result.residualRangeKm === 0) && battery.residualRangeKm) {
      result.residualRangeKm = battery.residualRangeKm;
    }
    if ((!result.residualRangeKm || result.residualRangeKm === 0) && result.batteryPercent > 0) {
      // 基于电量百分比估算续航（满电按87km估算，极核AE4系列常见值）
      result.residualRangeKm = Math.round(result.batteryPercent * 0.87);
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

  // 0. 车辆信息（独立获取，不影响其他功能）
  try {
    result.vehicle = await fetchVehicleInfo(acc, cfg, vinNo);
  } catch(e) { result.vehicle = { hasVehicle: false }; }

  // 1. 积分
  try {
    if (!userId) {
      result.error = "请在配置页填写用户ID";
    } else {
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
        // 昵称始终用配置中保存的，不用API返回的nickName覆盖
      } else if (infoRes.code == "40001" || infoRes.code == 401) {
        result.error = "Token已过期";
      } else {
        result.error = "积分获取失败: " + (infoRes.message || infoRes.code || "未知错误");
      }
    }
  } catch(e) { result.error = "积分获取异常: " + String(e); }

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

  // Token 状态检测
  try {
    const tokenCheck = await checkToken(acc, cfg);
    result.tokenValid = tokenCheck.valid;
    result.tokenReason = tokenCheck.reason || null;
    // 昵称优先使用配置中保存的，配置为空时才用token检测返回的
    if (tokenCheck.valid && tokenCheck.userName && (!result.userName || result.userName === "未知用户")) result.userName = tokenCheck.userName;
  } catch(e) { result.tokenValid = true; }
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
        ${(a.vehicle.voltage || (isCharging && a.vehicle.current) || a.vehicle.batteryTemp) ? `
        <div class="battery-row">
          ${a.vehicle.voltage ? `<div class="battery-item"><span class="battery-icon">⚡</span>电压 ${a.vehicle.voltage.toFixed(1)}V</div>` : ""}
          ${isCharging && a.vehicle.current ? `<div class="battery-item"><span class="battery-icon">🔌</span>电流 ${a.vehicle.current.toFixed(1)}A</div>` : ""}
          ${a.vehicle.batteryTemp ? `<div class="battery-item"><span class="battery-icon">🌡️</span>电池温度 ${a.vehicle.batteryTemp.toFixed(0)}°C</div>` : ""}
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
        <div class="form-item" style="grid-column:1/-1"><label>云端控车 AES 密钥（开/关锁必填，32位）</label><input type="text" id="cfg_vehicle_key" value="${cfg.vehicleAesKey || ''}" placeholder="填写并保存后才能使用云端开锁/关锁；留空则开关锁功能禁用" autocomplete="off" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item"><label>看板自动刷新间隔（秒，范围15~3600，默认60；填非法值自动回退60）</label><input type="number" min="15" max="3600" step="5" id="cfg_refresh_sec" value="${cfg.autoRefreshSec || 60}"></div>
      </div>
      <div class="hint">修改后点击「保存配置」生效。App/H5 密钥用于极核 API 签名计算（md5(sha1(param+secret))）；<b>云端控车密钥用于开/关锁报文加密，出于安全默认不内置，需自行填写保存一次，未填写时开关锁会被禁用。</b></div>
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
      <div class="hint">用手机号 + 短信验证码登录，自动获取 Token 与用户ID并加入账号列表，全程无需抓包。登录成功后会自动写入并刷新页面。<br><b>已修复</b>（v2.14.4）：发码与登录统一走 App 网关（同一验证码池），登录签名按官方 App 抓包结果修正（POST 请求按 GET 风格入签），不再误报「验证码有误或已过期」。<br><b>提示</b>：验证码 5 分钟内有效，重复获取会使上一个验证码失效，请使用最新收到的那条。</div>
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQpbZGF0YS10aGVtZT0ibGlnaHQiXXstLWJnOiNGM0Y2RkI7LS1iZzI6I0ZGRkZGRjstLWNhcmQ6cmdiYSgxNSwyMyw0MiwuMDQ1KTstLWNhcmQyOiNGRkZGRkY7LS1jYXJkMzojRURGMUY3Oy0tbGluZTpyZ2JhKDE1LDIzLDQyLC4xMCk7LS1saW5lMjpyZ2JhKDE1LDIzLDQyLC4xOCk7LS10eHQ6IzBGMTcyQTstLXR4dDI6IzQ3NTU2OTstLXR4dDM6Izk0QTNCODstLWJyYW5kOiMwRThGQjI7LS1icmFuZDI6IzJCRDRGMjstLWJyYW5kU29mdDpyZ2JhKDQzLDIxMiwyNDIsLjE2KTstLW9rOiMxNkEzNEE7LS1va1NvZnQ6cmdiYSgyMiwxNjMsNzQsLjE0KTstLXdhcm46I0Q5NzcwNjstLXdhcm5Tb2Z0OnJnYmEoMjE3LDExOSw2LC4xNik7LS1lcnI6I0RDMjYyNjstLWVyclNvZnQ6cmdiYSgyMjAsMzgsMzgsLjEyKTstLXZpbzojN0M2QkYwOy0tdmlvU29mdDpyZ2JhKDEyNCwxMDcsMjQwLC4xNCk7LS1ncmFkOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzBFOEZCMiwjMkJENEYyKTstLWdyYWQtdmlvOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzdDNkJGMCwjQjdBNkZCKX0KW2RhdGEtdGhlbWU9ImdyZWVuIl17LS1iZzojMDcxNDBFOy0tYmcyOiMwODE4MEY7LS1jYXJkOnJnYmEoODAsMjAwLDEyMCwuMDYpOy0tY2FyZDI6IzBDMUYxNTstLWNhcmQzOiMwOTFBMTI7LS1saW5lOnJnYmEoODAsMjAwLDEyMCwuMTQpOy0tbGluZTI6cmdiYSg4MCwyMDAsMTIwLC4yNCk7LS10eHQ6I0U2RjdFQzstLXR4dDI6IzhGQkZBMzstLXR4dDM6IzVFOEE2RTstLWJyYW5kOiMzNEQzOTk7LS1icmFuZDI6IzA1OTY2OTstLWJyYW5kU29mdDpyZ2JhKDUyLDIxMSwxNTMsLjE2KTstLW9rOiM0QURFODA7LS1va1NvZnQ6cmdiYSg3NCwyMjIsMTI4LC4xNik7LS13YXJuOiNGQkJGMjQ7LS13YXJuU29mdDpyZ2JhKDI1MSwxOTEsMzYsLjE2KTstLWVycjojRjg3MTcxOy0tZXJyU29mdDpyZ2JhKDI0OCwxMTMsMTEzLC4xNik7LS12aW86I0E3RjNEMDstLXZpb1NvZnQ6cmdiYSgxNjcsMjQzLDIwOCwuMTQpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMzNEQzOTksIzA1OTY2OSk7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNBN0YzRDAsIzM0RDM5OSl9CltkYXRhLXRoZW1lPSJ2aW9sZXQiXXstLWJnOiMxMDBCMjA7LS1iZzI6IzE0MEQyODstLWNhcmQ6cmdiYSgxNTAsMTIwLDI1NSwuMDcpOy0tY2FyZDI6IzFBMTIzMzstLWNhcmQzOiMxNDEwMzA7LS1saW5lOnJnYmEoMTUwLDEyMCwyNTUsLjE1KTstLWxpbmUyOnJnYmEoMTUwLDEyMCwyNTUsLjI1KTstLXR4dDojRjBFQkZGOy0tdHh0MjojQjBBNkQ5Oy0tdHh0MzojN0E2RkE4Oy0tYnJhbmQ6I0E3OEJGQTstLWJyYW5kMjojN0MzQUVEOy0tYnJhbmRTb2Z0OnJnYmEoMTY3LDEzOSwyNTAsLjE4KTstLW9rOiM0QURFODA7LS1va1NvZnQ6cmdiYSg3NCwyMjIsMTI4LC4xNik7LS13YXJuOiNGQkJGMjQ7LS13YXJuU29mdDpyZ2JhKDI1MSwxOTEsMzYsLjE2KTstLWVycjojRjg3MTcxOy0tZXJyU29mdDpyZ2JhKDI0OCwxMTMsMTEzLC4xNik7LS12aW86I0M0QjVGRDstLXZpb1NvZnQ6cmdiYSgxOTYsMTgxLDI1MywuMTYpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNBNzhCRkEsIzdDM0FFRCk7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNDNEI1RkQsI0E3OEJGQSl9CltkYXRhLXRoZW1lPSJhbWJlciJdey0tYmc6IzE2MTAwOTstLWJnMjojMUExMzBBOy0tY2FyZDpyZ2JhKDI1NSwxODAsOTAsLjA3KTstLWNhcmQyOiMyNDFBMEQ7LS1jYXJkMzojMUMxNTBCOy0tbGluZTpyZ2JhKDI1NSwxODAsOTAsLjE1KTstLWxpbmUyOnJnYmEoMjU1LDE4MCw5MCwuMjUpOy0tdHh0OiNGREYzRTM7LS10eHQyOiNEOUI5OEM7LS10eHQzOiNBOTgzNTQ7LS1icmFuZDojRkJCRjI0Oy0tYnJhbmQyOiNEOTc3MDY7LS1icmFuZFNvZnQ6cmdiYSgyNTEsMTkxLDM2LC4xOCk7LS1vazojNEFERTgwOy0tb2tTb2Z0OnJnYmEoNzQsMjIyLDEyOCwuMTYpOy0td2FybjojRjU5RTBCOy0td2FyblNvZnQ6cmdiYSgyNDUsMTU4LDExLC4xOCk7LS1lcnI6I0Y4NzE3MTstLWVyclNvZnQ6cmdiYSgyNDgsMTEzLDExMywuMTYpOy0tdmlvOiNGQ0QzNEQ7LS12aW9Tb2Z0OnJnYmEoMjUyLDIxMSw3NywuMTYpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNGQkJGMjQsI0Q5NzcwNik7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNGQ0QzNEQsI0ZCQkYyNCl9CgoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0udGhlbWUtZmFie3Bvc2l0aW9uOmZpeGVkO3RvcDoxNHB4O3JpZ2h0OjE0cHg7ei1pbmRleDo5OTk7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjUwJTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxOHB4O2N1cnNvcjpwb2ludGVyO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDAsMCwwLC4yOCl9Ci5zaWduaW4tZmFie3Bvc2l0aW9uOmZpeGVkO3JpZ2h0OjE2cHg7Ym90dG9tOmNhbGMoNzhweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6OTk4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweDtwYWRkaW5nOjEycHggMThweDtib3JkZXItcmFkaXVzOjk5OXB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjVweDtib3gtc2hhZG93OjAgOHB4IDI0cHggcmdiYSgxNCwxNDMsMTc4LC40NSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4yNSk7Y3Vyc29yOnBvaW50ZXI7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLG9wYWNpdHkgLjJzOy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudH0KLnNpZ25pbi1mYWI6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTIpfQouc2lnbmluLWZhYi5idXN5e29wYWNpdHk6LjY7cG9pbnRlci1ldmVudHM6bm9uZX0KLnNpZ25pbi1mYWIgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHh9CgpodG1sLGJvZHl7aGVpZ2h0OjEwMCV9CmJvZHl7CiAgZm9udC1mYW1pbHk6LWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsIlBpbmdGYW5nIFNDIiwiSGVsdmV0aWNhIE5ldWUiLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjsKICBiYWNrZ3JvdW5kOnZhcigtLWJnKTsgY29sb3I6dmFyKC0tdHh0KTsgZm9udC1zaXplOjE1cHg7IGxpbmUtaGVpZ2h0OjEuNTsKICAtd2Via2l0LWZvbnQtc21vb3RoaW5nOmFudGlhbGlhc2VkOyBvdmVyc2Nyb2xsLWJlaGF2aW9yLXk6bm9uZTsKICAtd2Via2l0LXRleHQtc2l6ZS1hZGp1c3Q6MTAwJTsKfQoubnVte2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtcztmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQpidXR0b257Zm9udC1mYW1pbHk6aW5oZXJpdDtjb2xvcjppbmhlcml0O2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtjdXJzb3I6cG9pbnRlcjt0b3VjaC1hY3Rpb246bWFuaXB1bGF0aW9uO3VzZXItc2VsZWN0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lfQppbnB1dCxzZWxlY3QsdGV4dGFyZWF7Zm9udC1mYW1pbHk6aW5oZXJpdDtjb2xvcjp2YXIoLS10eHQpO2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6MTFweCAxM3B4O2ZvbnQtc2l6ZToxNXB4O3dpZHRoOjEwMCU7b3V0bGluZTpub25lO3RyYW5zaXRpb246Ym9yZGVyLWNvbG9yIC4ycyxib3gtc2hhZG93IC4yczstd2Via2l0LWFwcGVhcmFuY2U6bm9uZTthcHBlYXJhbmNlOm5vbmV9CmlucHV0OmZvY3VzLHNlbGVjdDpmb2N1cyx0ZXh0YXJlYTpmb2N1c3tib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2JveC1zaGFkb3c6MCAwIDAgM3B4IHZhcigtLWJyYW5kU29mdCl9CmlucHV0OjpwbGFjZWhvbGRlcix0ZXh0YXJlYTo6cGxhY2Vob2xkZXJ7Y29sb3I6dmFyKC0tdHh0Myl9CnN2Z3tkaXNwbGF5OmJsb2NrfQo6OnNlbGVjdGlvbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Cjo6LXdlYmtpdC1zY3JvbGxiYXJ7d2lkdGg6MDtoZWlnaHQ6MH0KCi8qID09PT09PT09PT09PSBhcHAgc2hlbGwgPT09PT09PT09PT09ICovCiNhcHB7bWluLWhlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59Ci5iZy1nbG93e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4OjA7CiAgYmFja2dyb3VuZDoKICAgIHJhZGlhbC1ncmFkaWVudCg1MiUgMzglIGF0IDEyJSAtNiUsIHJnYmEoNDMsMjEyLDI0MiwuMTQpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDQ2JSAzNCUgYXQgOTIlIDYlLCByZ2JhKDE0LDE0MywxNzgsLjEyKSwgdHJhbnNwYXJlbnQgNjIlKSwKICAgIHJhZGlhbC1ncmFkaWVudCg2MCUgNDAlIGF0IDUwJSAxMTAlLCByZ2JhKDEyNCwxMDcsMjQwLC4wOCksIHRyYW5zcGFyZW50IDY1JSk7Cn0KaGVhZGVyLmFwcC1oZWFkZXJ7CiAgcG9zaXRpb246c3RpY2t5O3RvcDowO3otaW5kZXg6NjA7CiAgcGFkZGluZzpjYWxjKDEycHggKyB2YXIoLS1zYWZlLXQpKSAxOHB4IDEycHg7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC43OCk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyMnB4KSBzYXR1cmF0ZSgxLjUpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7CiAgYm9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDkpOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7Cn0KLmJyYW5kLW1hcmt7d2lkdGg6MzhweDtoZWlnaHQ6MzhweDtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC1zaHJpbms6MDtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4zNSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4yNSl9Ci5icmFuZC1tYXJrIHN2Z3t3aWR0aDoyMnB4O2hlaWdodDoyMnB4fQouYnJhbmQtdHh0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmJyYW5kLXR4dCBoMXtmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjJweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci5icmFuZC10eHQgcHtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjFweH0KLnZlci1jaGlwe2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjIyKTtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo2cHg7bGV0dGVyLXNwYWNpbmc6LjRweH0KLmhlYWQtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC1zaHJpbms6MH0KLmljb24tYnRue3dpZHRoOjM2cHg7aGVpZ2h0OjM2cHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE4cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGNvbG9yIC4yc30KLmljb24tYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouaWNvbi1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9Ci5pY29uLWJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmNvdW50LWNoaXB7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2hlaWdodDozNnB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTFweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21pbi13aWR0aDo5NnB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouY291bnQtY2hpcC5vbntib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC40KTtjb2xvcjp2YXIoLS1icmFuZCk7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQouY291bnQtcmluZ3t3aWR0aDoxNHB4O2hlaWdodDoxNHB4O3Bvc2l0aW9uOnJlbGF0aXZlO2ZsZXgtc2hyaW5rOjB9Ci5jb3VudC1yaW5nIHN2Z3t0cmFuc2Zvcm06cm90YXRlKC05MGRlZyk7d2lkdGg6MTRweDtoZWlnaHQ6MTRweH0KLmNvdW50LXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xOCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyfQouY291bnQtcmluZyAuYXJje3N0cm9rZTp2YXIoLS1icmFuZCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjVzIGxpbmVhcn0KCm1haW57ZmxleDoxO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTtwYWRkaW5nOjE0cHggMTZweCBjYWxjKDE1MHB4ICsgdmFyKC0tc2FmZS1iKSl9CgovKiA9PT09PT09PT09PT0gcHVsbCB0byByZWZyZXNoID09PT09PT09PT09PSAqLwoucHRyLXdyYXB7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufQoucHRyLWluZGljYXRvcntoZWlnaHQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7b3ZlcmZsb3c6aGlkZGVuO3RyYW5zaXRpb246aGVpZ2h0IC4zcyB2YXIoLS1lYXNlKTtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDB9Ci5wdHItaW5kaWNhdG9yIC5zcGlubmVye3dpZHRoOjIwcHg7aGVpZ2h0OjIwcHg7bWFyZ2luLXJpZ2h0OjhweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItdG9wLWNvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItcmFkaXVzOjUwJTthbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoucHRyLWluZGljYXRvci5wdWxsaW5nIC5zcGlubmVye2FuaW1hdGlvbjpub25lO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpfQpAa2V5ZnJhbWVzIHNwaW57dG97dHJhbnNmb3JtOnJvdGF0ZSgzNjBkZWcpfX0KCi8qID09PT09PT09PT09PSBoZXJvIHN1bW1hcnkgPT09PT09PT09PT09ICovCi5oZXJvewogIHBvc2l0aW9uOnJlbGF0aXZlO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7cGFkZGluZzoxOHB4IDE4cHggMTZweDttYXJnaW4tYm90dG9tOjE2cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE2MGRlZyxyZ2JhKDQzLDIxMiwyNDIsLjE0KSxyZ2JhKDE0LDE0MywxNzgsLjA1KSA1NSUsdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpOwogIGJvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4xNik7Cn0KLmhlcm86OmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6LTYwcHg7dG9wOi03MHB4O3dpZHRoOjIyMHB4O2hlaWdodDoyMjBweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudChjaXJjbGUscmdiYSg0MywyMTIsMjQyLC4xNiksdHJhbnNwYXJlbnQgNjUlKTtwb2ludGVyLWV2ZW50czpub25lfQouaGVyby10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtZW5kO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMnB4fQouaGVyby1zY29yZSAubGJse2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDtsZXR0ZXItc3BhY2luZzoxcHh9Ci5oZXJvLXNjb3JlIC52YWx7Zm9udC1zaXplOjM4cHg7Zm9udC13ZWlnaHQ6OTAwO2xpbmUtaGVpZ2h0OjEuMTU7bGV0dGVyLXNwYWNpbmc6LS41cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTstd2Via2l0LWJhY2tncm91bmQtY2xpcDp0ZXh0O2JhY2tncm91bmQtY2xpcDp0ZXh0O2NvbG9yOnRyYW5zcGFyZW50O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5oZXJvLXNjb3JlIC52YWwgc21hbGx7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouaGVyby1yaWdodHt0ZXh0LWFsaWduOnJpZ2h0O2ZsZXgtc2hyaW5rOjB9Ci5oZXJvLXJpZ2h0IC5iaWd7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLW9rKX0KLmhlcm8tcmlnaHQgLmJpZyBzcGFue2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhlcm8tcmlnaHQgLnN1Yntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweH0KLmhlcm8tc3RhdHN7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTRweH0KLmhzdGF0e2ZsZXg6MTtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6OXB4IDEycHh9Ci5oc3RhdCAudntmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhzdGF0IC5se2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmhzdGF0LmFtYmVyIC52e2NvbG9yOnZhcigtLXdhcm4pfSAuaHN0YXQuY3lhbiAudntjb2xvcjp2YXIoLS1icmFuZCl9IC5oc3RhdC5ncmVlbiAudntjb2xvcjp2YXIoLS1vayl9CgovKiA9PT09PT09PT09PT0gYnV0dG9ucyAmIGNoaXBzID09PT09PT09PT09PSAqLwouZmFiewogIHBvc2l0aW9uOmZpeGVkO3JpZ2h0OjE2cHg7Ym90dG9tOmNhbGMoMTAwcHggKyB2YXIoLS1zYWZlLWIpKTt6LWluZGV4OjUwOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtoZWlnaHQ6NDZweDtwYWRkaW5nOjAgMTZweDtib3JkZXItcmFkaXVzOjIzcHg7CiAgYmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouM3B4OwogIGJveC1zaGFkb3c6MCAxMHB4IDI4cHggcmdiYSgxNCwxNDMsMTc4LC40NSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4zKTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMnMgdmFyKC0tc3ByaW5nKSxib3gtc2hhZG93IC4yczthbmltYXRpb246ZmFiLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGg7Cn0KLmZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5mYWIgc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9CkBrZXlmcmFtZXMgZmFiLWlue2Zyb217dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMjRweCk7b3BhY2l0eTowfXRve3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApO29wYWNpdHk6MX19Ci5idG57CiAgZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6NnB4O2hlaWdodDo0MHB4O3BhZGRpbmc6MCAxOHB4O2JvcmRlci1yYWRpdXM6MTNweDsKICBmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDA7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLXR4dCk7CiAgdHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnM7Cn0KLmJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Nil9Ci5idG4ucHJpbWFyeXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Ym9yZGVyOm5vbmV9Ci5idG4uZ2hvc3R7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS10eHQyKX0KLmJ0bi5kYW5nZXJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5idG4uc217aGVpZ2h0OjMycHg7cGFkZGluZzowIDEycHg7Zm9udC1zaXplOjEycHg7Ym9yZGVyLXJhZGl1czoxMHB4fQouYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmNoaXB7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgMTJweDtib3JkZXItcmFkaXVzOjE1cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci5jaGlwOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmNoaXAub257YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jaGlwIC5kb3R7d2lkdGg6NnB4O2hlaWdodDo2cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpjdXJyZW50Q29sb3J9Ci5waWxse2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI0cHg7cGFkZGluZzowIDEwcHg7Ym9yZGVyLXJhZGl1czoxMnB4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtmbGV4LXNocmluazowfQoucGlsbC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoucGlsbC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnBpbGwuY3lhbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpfQoucGlsbC5ncmF5e2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO2NvbG9yOnZhcigtLXR4dDIpfQoucGlsbC52aW97YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQoucGlsbC5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm5Tb2Z0KTtjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSBhY2NvdW50IGNhcmRzID09PT09PT09PT09PSAqLwouc2VjdGlvbi10aXRsZXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo0cHggMnB4IDEycHg7bGV0dGVyLXNwYWNpbmc6LjVweH0KLnNlY3Rpb24tdGl0bGUgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tYnJhbmQpfQouYWNjLWNhcmR7CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O292ZXJmbG93OmhpZGRlbjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgxNDYsMTcwLDIwNSwuMDYpLHJnYmEoMTQ2LDE3MCwyMDUsLjAzKSksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMnMgdmFyKC0tZWFzZSk7Cn0KLyog5YWl5Zy65Yqo55S75Y+q5Zyo6aaW5qyh5riy5p+T5pKt5pS+77yM6YG/5YWN6Ieq5Yqo5Yi35paw6YeN5bu65Y2h54mH5pe25pW05bGP6YeN6ZeqICovCi5hY2MtY2FyZC5hbmltLWlue2FuaW1hdGlvbjpjYXJkLWluIC40NXMgdmFyKC0tZWFzZSkgYm90aH0KLmFjYy1jYXJkLmVycm9ye2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC40KTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgyNDksMTEyLDEwNiwuMDcpLHRyYW5zcGFyZW50KSx2YXIoLS1jYXJkKX0KQGtleWZyYW1lcyBjYXJkLWlue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE0cHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKX19Ci5hY2MtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMXB4O21hcmdpbi1ib3R0b206MTRweH0KLmF2YXRhcnt3aWR0aDo0MnB4O2hlaWdodDo0MnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXdlaWdodDo5MDA7Zm9udC1zaXplOjE3cHg7Y29sb3I6IzA0MTIxQztmbGV4LXNocmluazowO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDE0LDE0MywxNzgsLjMpfQouYXZhdGFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTtjb2xvcjojMTQwRjJFO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDEyNCwxMDcsMjQwLC4zKX0KLmFjYy1pbmZve2ZsZXg6MTttaW4td2lkdGg6MH0KLmFjYy1uYW1le2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci5hY2Mtc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci5hY2MtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7ZmxleC1zaHJpbms6MH0KLmFjYy1lcnJ7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tZXJyKTtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjhweCAxMXB4O21hcmdpbi1ib3R0b206MTJweDtmb250LXdlaWdodDo2MDB9Ci5rcGktZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5rcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoua3BpIC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0iO2xpbmUtaGVpZ2h0OjEuMn0KLmtwaSAubHtmb250LXNpemU6OS41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi10b3A6MnB4fQoua3BpLmMxIC52e2NvbG9yOnZhcigtLXR4dCl9IC5rcGkuYzIgLnZ7Y29sb3I6dmFyKC0tb2spfSAua3BpLmMzIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmtwaS5jNCAudntjb2xvcjp2YXIoLS12aW8pfQouYmxpbmR7bWFyZ2luLWJvdHRvbToxNHB4fQouYmxpbmQtdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouYmxpbmQtdG9wIC5ye2NvbG9yOnZhcigtLXZpbyk7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmJsaW5kLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouYmxpbmQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKTtib3gtc2hhZG93OjAgMCAxMnB4IHJnYmEoMTI0LDEwNywyNDAsLjUpfQoud2Vla3ttYXJnaW4tYm90dG9tOjRweH0KLndlZWstdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206N3B4fQoud2Vlay1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsMWZyKTtnYXA6NXB4fQouZGF5e2FzcGVjdC1yYXRpbzoxO2JvcmRlci1yYWRpdXM6OXB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjFweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5kYXkgLmR7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bGluZS1oZWlnaHQ6MX0KLmRheSAubXtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjF9Ci5kYXkub2t7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KX0KLmRheS5vayAuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5kYXkudG9kYXl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgNHB4IDEycHggcmdiYSgxNCwxNDMsMTc4LC40KX0KLmRheS50b2RheSAuZHtjb2xvcjojMDQxMjFDfQouZGF5LnRvZGF5IC5te2NvbG9yOnJnYmEoNCwxOCwyOCwuNyl9CgovKiA9PT09PT09PT09PT0gdmVoaWNsZSBzZWN0aW9uID09PT09PT09PT09PSAqLwoudmVoaWNsZXsKICBtYXJnaW4tdG9wOjE0cHg7cGFkZGluZy10b3A6MTRweDtib3JkZXItdG9wOjFweCBkYXNoZWQgdmFyKC0tbGluZTIpO2N1cnNvcjpwb2ludGVyOwp9Ci52ZWhpY2xlLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O21hcmdpbi1ib3R0b206MTNweH0KLnZlaGljbGUtcmluZ3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O2ZsZXgtc2hyaW5rOjB9Ci52ZWhpY2xlLXJpbmcgc3Zne3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7dHJhbnNmb3JtOnJvdGF0ZSgtOTBkZWcpfQoudmVoaWNsZS1yaW5nIC50cmFja3tzdHJva2U6cmdiYSgxNDYsMTcwLDIwNSwuMTQpO2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NX0KLnZlaGljbGUtcmluZyAuYXJje2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpyb3VuZDt0cmFuc2l0aW9uOnN0cm9rZS1kYXNob2Zmc2V0IC44cyB2YXIoLS1lYXNlKSxzdHJva2UgLjVzfQoudmVoaWNsZS1yaW5nIC5wY3R7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci52ZWhpY2xlLW1ldGF7ZmxleDoxO21pbi13aWR0aDowfQoudmVoaWNsZS1uYW1le2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLXZpbntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsU0ZNb25vLVJlZ3VsYXIsTWVubG8sbW9ub3NwYWNlfQoudmluLXNob3d7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tbGVmdDo0cHg7cGFkZGluZzoxcHggNnB4O2JvcmRlci1yYWRpdXM6NXB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KLnZlaGljbGUtYmFkZ2Vze2Rpc3BsYXk6ZmxleDtnYXA6NXB4O21hcmdpbi10b3A6N3B4O2ZsZXgtd3JhcDp3cmFwfQoudnN0YXQtcm93e2Rpc3BsYXk6ZmxleDtnYXA6NnB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206MTJweH0KLnZzdGF0e2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMH0KLnZzdGF0IHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4fQoudnN0YXQub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0Lm9mZntiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO2NvbG9yOnZhcigtLXR4dDIpfQoudnN0YXQubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnZzdGF0LnVubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci52c3RhdC5zZWF0e2JhY2tncm91bmQ6dmFyKC0tdmlvU29mdCk7Y29sb3I6dmFyKC0tdmlvKX0KLmNoYXJnZS1iYW5uZXJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4O2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNjEsMjIwLDE1MSwuMjUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjlweCAxMnB4O21hcmdpbi1ib3R0b206MTJweH0KLmNoYXJnZS1iYW5uZXIgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tb2spO2ZsZXgtc2hyaW5rOjB9Ci5jaGFyZ2UtYmFubmVyIC5jdHtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQouY2hhcmdlLWJhbm5lciAuY2V7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tb2spO29wYWNpdHk6Ljg1O21hcmdpbi1sZWZ0OmF1dG87YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjE1KTtwYWRkaW5nOjJweCA5cHg7Ym9yZGVyLXJhZGl1czoxMHB4fQoudmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6N3B4O21hcmdpbi1ib3R0b206MTJweH0KLnZrcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo4cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoudmtwaSAudntmb250LXNpemU6MTRweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZrcGkgLmx7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5iYXR0LXRyYWNre2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xKTtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWJvdHRvbToxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5iYXR0LWZpbGx7aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo1cHg7dHJhbnNpdGlvbjp3aWR0aCAuOHMgdmFyKC0tZWFzZSksYmFja2dyb3VuZCAuNXM7Ym94LXNoYWRvdzowIDAgMTBweCBjdXJyZW50Q29sb3J9Ci5tZXRhLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjhweDtmbGV4LXdyYXA6d3JhcDttYXJnaW4tYm90dG9tOjZweH0KLm1ldGEtaXRlbXtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo5cHg7cGFkZGluZzo1cHggOXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLm1ldGEtaXRlbSBzdmd7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5tZXRhLWl0ZW0gYntjb2xvcjp2YXIoLS10eHQpfQoudmVoaWNsZS1hZGRye2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDttYXJnaW4tdG9wOjRweDttYXJnaW4tYm90dG9tOjEwcHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci52ZWhpY2xlLWFkZHIgLmF0e2ZsZXg6MTttaW4td2lkdGg6MDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLWFkZHIgc3Zne3dpZHRoOjEzcHg7aGVpZ2h0OjEzcHg7Y29sb3I6dmFyKC0td2Fybik7ZmxleC1zaHJpbms6MH0KLm1hcC1idG57aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4zKTtmbGV4LXNocmluazowO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLm1hcC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoubWFwLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi40NTtwb2ludGVyLWV2ZW50czpub25lfQouY3RybC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDUsMWZyKTtnYXA6NnB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTJweH0KLmN0cmwtYnRue2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7cGFkZGluZzoxMHB4IDJweDtib3JkZXItcmFkaXVzOjEzcHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKSxiYWNrZ3JvdW5kIC4ycyxib3JkZXItY29sb3IgLjJzLGNvbG9yIC4yc30KLmN0cmwtYnRuIHN2Z3t3aWR0aDoxN3B4O2hlaWdodDoxN3B4O2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246Y29sb3IgLjJzfQouY3RybC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTIpfQouY3RybC1idG4udW5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjMpO2NvbG9yOnZhcigtLW9rKX0KLmN0cmwtYnRuLnVubG9jayBzdmd7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4ubG9ja3tib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMyk7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuLmxvY2sgc3Zne2NvbG9yOnZhcigtLWVycil9Ci5jdHJsLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi41O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWJ0bi5idXN5IHN2Z3thbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoubm8tdmVoaWNsZXtwYWRkaW5nOjE0cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNDcsMTg1LDg1LC4yNSk7Y29sb3I6dmFyKC0td2Fybik7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO3RleHQtYWxpZ246Y2VudGVyfQoKLyogPT09PT09PT09PT09IGVtcHR5ICYgc2tlbGV0b24gPT09PT09PT09PT09ICovCi5lbXB0eXtwYWRkaW5nOjcwcHggMjZweDt0ZXh0LWFsaWduOmNlbnRlcjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmVtcHR5IC5lLWljb257d2lkdGg6NzRweDtoZWlnaHQ6NzRweDttYXJnaW46MCBhdXRvIDE4cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myl9Ci5lbXB0eSAuZS1pY29uIHN2Z3t3aWR0aDozNHB4O2hlaWdodDozNHB4fQouZW1wdHkgaDN7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouZW1wdHkgcHtmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWF4LXdpZHRoOjMwMHB4O21hcmdpbjowIGF1dG8gMjBweH0KLnNre2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDEwMGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNDAlLHJnYmEoMTQ2LDE3MCwyMDUsLjEyKSA1MCUscmdiYSgxNDYsMTcwLDIwNSwuMDYpIDYwJSk7YmFja2dyb3VuZC1zaXplOjIwMCUgMTAwJTthbmltYXRpb246c2sgMS4ycyBsaW5lYXIgaW5maW5pdGU7Ym9yZGVyLXJhZGl1czoxMHB4fQpAa2V5ZnJhbWVzIHNre3Rve2JhY2tncm91bmQtcG9zaXRpb246LTIwMCUgMH19Ci5zay1jYXJke2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCl9Ci5zay1saW5le2hlaWdodDoxM3B4O21hcmdpbi1ib3R0b206MTBweH0uc2stbGluZS53NDB7d2lkdGg6NDAlfS5zay1saW5lLnc2MHt3aWR0aDo2MCV9LnNrLWxpbmUudzgwe3dpZHRoOjgwJX0KLnNrLXJvd3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW46MTRweCAwfQouc2stY2VsbHtoZWlnaHQ6NTJweDtib3JkZXItcmFkaXVzOjEycHh9Ci5zay1iYXJ7aGVpZ2h0OjE0cHg7Ym9yZGVyLXJhZGl1czo4cHg7bWFyZ2luLXRvcDoxMnB4fQoKLyogPT09PT09PT09PT09IGxvZ3MgPT09PT09PT09PT09ICovCi5sb2ctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7b3ZlcmZsb3c6aGlkZGVuO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6MTBweDtwYWRkaW5nOjE0cHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmxvZy1oZWFkIGgze2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5sb2ctaGVhZCBoMyBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS12aW8pfQoubG9nLWZpbHRlcnN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5sb2ctbGlzdHttYXgtaGVpZ2h0OmNhbGMoMTAwdmggLSAyNjBweCk7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQoubG9nLWl0ZW17cGFkZGluZzoxMnB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDcpO2FuaW1hdGlvbjpjYXJkLWluIC4zcyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5sb2ctdGltZXtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tYm90dG9tOjNweDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoubG9nLW1haW57ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2ZvbnQtc2l6ZToxM3B4fQoubG9nLXVzZXJ7Zm9udC13ZWlnaHQ6ODAwfQoubG9nLXJlc3tmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQoubG9nLXJlcy5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KLmxvZy1zdGVwc3ttYXJnaW4tdG9wOjZweDtmb250LXNpemU6MTEuNXB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNztwYWRkaW5nLWxlZnQ6MnB4fQoubG9nLXN0ZXBzIGl7Zm9udC1zdHlsZTpub3JtYWw7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1yaWdodDo1cHh9Ci5sb2ctZW1wdHl7cGFkZGluZzo1MHB4IDIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHh9CgovKiA9PT09PT09PT09PT0gY29uZmlnID09PT09PT09PT09PSAqLwouY2ZnLXBhbmVse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5jZmctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTVweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouY2ZnLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmNmZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4fQouY2ZnLWhlYWQgLmJhcnt3aWR0aDozcHg7aGVpZ2h0OjE1cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZCk7ZmxleC1zaHJpbms6MH0KLmNmZy1oZWFkIC5iYXIuYW1iZXJ7YmFja2dyb3VuZDp2YXIoLS13YXJuKX0gLmNmZy1oZWFkIC5iYXIuZ3JlZW57YmFja2dyb3VuZDp2YXIoLS1vayl9IC5jZmctaGVhZCAuYmFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpbyl9Ci5jZmctYm9keXtwYWRkaW5nOjE2cHh9Ci5mb3JtLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMnB4fQouZi1pdGVte21pbi13aWR0aDowfQouZi1pdGVtLmZ1bGx7Z3JpZC1jb2x1bW46MS8tMX0KLmYtaXRlbSBsYWJlbHtkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tYm90dG9tOjZweH0KLmYtaXRlbSAuaGludHtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6NXB4O2xpbmUtaGVpZ2h0OjEuNn0KLmYtaXRlbSAuaGludCBjb2Rle2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO3BhZGRpbmc6MXB4IDVweDtib3JkZXItcmFkaXVzOjVweDtmb250LXNpemU6MTBweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlfQouc3dpdGNoe2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7cGFkZGluZzoxMHB4IDEycHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7Y3Vyc29yOnBvaW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouc3dpdGNoOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk4KX0KLnN3aXRjaCAubGJse2ZvbnQtc2l6ZToxMi41cHg7Zm9udC13ZWlnaHQ6NjAwO2ZsZXg6MX0KLnN3aXRjaCAuc2N7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5zd3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo0NHB4O2hlaWdodDoyNnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjIpO3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzIHZhcigtLWVhc2UpO2ZsZXgtc2hyaW5rOjB9Ci5zdzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MnB4O2xlZnQ6MnB4O3dpZHRoOjIycHg7aGVpZ2h0OjIycHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDojZmZmO3RyYW5zaXRpb246dHJhbnNmb3JtIC4yNXMgdmFyKC0tc3ByaW5nKTtib3gtc2hhZG93OjAgMnB4IDZweCByZ2JhKDAsMCwwLC4zNSl9Ci5zd2l0Y2ggaW5wdXR7ZGlzcGxheTpub25lfQouc3dpdGNoIGlucHV0OmNoZWNrZWQrLnN3e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCl9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3c6OmFmdGVye3RyYW5zZm9ybTp0cmFuc2xhdGVYKDE4cHgpfQouYWNjLWVkaXR7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE0cHg7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtaGVhZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MTJweH0KLmFjYy1lZGl0LXRpdGxle2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5hY2MtZWRpdC10aXRsZSAubnt3aWR0aDoyNHB4O2hlaWdodDoyNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjkwMH0KLmFjYy1lZGl0LWhlYWQgLmFjdHN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5idG4tcm93e2Rpc3BsYXk6ZmxleDtnYXA6MTBweDttYXJnaW4tdG9wOjE2cHg7ZmxleC13cmFwOndyYXB9Ci5idG4tcm93IC5idG57ZmxleDoxO21pbi13aWR0aDoxMjBweH0KLmNmZy1ub3Rle2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmc6MTJweCAxNHB4O2JhY2tncm91bmQ6cmdiYSgyNDcsMTg1LDg1LC4wNyk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjE4KTtib3JkZXItcmFkaXVzOjEycHg7bWFyZ2luLXRvcDoxMnB4fQouY2ZnLW5vdGUgYntjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSB0YWJiYXIgPT09PT09PT09PT09ICovCm5hdi50YWJiYXJ7CiAgcG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDo2MDsKICBkaXNwbGF5OmZsZXg7cGFkZGluZzo4cHggMTBweCBjYWxjKDhweCArIHZhcigtLXNhZmUtYikpOwogIGJhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuODIpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoMjRweCkgc2F0dXJhdGUoMS42KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpOwogIGJvcmRlci10b3A6MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjEpOwp9Ci50YWJ7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDozcHg7cGFkZGluZzo2cHggMDtib3JkZXItcmFkaXVzOjE0cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO3RyYW5zaXRpb246Y29sb3IgLjJzLHRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci50YWIgc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci50YWI6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci50YWIub257Y29sb3I6dmFyKC0tYnJhbmQpfQoudGFiIC50LWluZHt3aWR0aDoxNHB4O2hlaWdodDozcHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp0cmFuc3BhcmVudDt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjI1c30KLnRhYi5vbiAudC1pbmR7YmFja2dyb3VuZDp2YXIoLS1icmFuZCl9CgovKiA9PT09PT09PT09PT0gc2hlZXRzICYgdG9hc3QgPT09PT09PT09PT09ICovCi5zaGVldC1iYWNrZHJvcHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTAwO2JhY2tncm91bmQ6cmdiYSg0LDgsMTgsLjU1KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDZweCk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjNzIHZhcigtLWVhc2UpfQouc2hlZXQtYmFja2Ryb3Auc2hvd3tvcGFjaXR5OjE7cG9pbnRlci1ldmVudHM6YXV0b30KLnNoZWV0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO3otaW5kZXg6MTAxO21heC1oZWlnaHQ6ODZ2aDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyx2YXIoLS1jYXJkMiksdmFyKC0tYmcyKSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLWJvdHRvbTpub25lOwogIGJvcmRlci1yYWRpdXM6MjZweCAyNnB4IDAgMDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMDQlKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMzhzIHZhcigtLXNwcmluZyk7CiAgYm94LXNoYWRvdzowIC0xOHB4IDUwcHggcmdiYSgwLDAsMCwuNSl9Ci5zaGVldC5zaG93e3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfQouc2hlZXQtZ3JhYnt3aWR0aDozOHB4O2hlaWdodDo0cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4zKTttYXJnaW46MTBweCBhdXRvIDRweDtmbGV4LXNocmluazowfQouc2hlZXQtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NnB4IDIwcHggMTJweH0KLnNoZWV0LWhlYWQgaDN7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweH0KLnNoZWV0LWhlYWQgaDMgc3Zne3dpZHRoOjE4cHg7aGVpZ2h0OjE4cHh9Ci5zaGVldC1jbG9zZXt3aWR0aDozMnB4O2hlaWdodDozMnB4O2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2NvbG9yOnZhcigtLXR4dDIpfQouc2hlZXQtY2xvc2U6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5zaGVldC1ib2R5e3BhZGRpbmc6NHB4IDIwcHggMjRweDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zci1pdGVte2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7cGFkZGluZzoxMXB4IDA7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDgpO2ZvbnQtc2l6ZToxM3B4fQouc3ItaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLnNyLWl0ZW0gLmt7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NjAwO2ZsZXgtc2hyaW5rOjB9Ci5zci1pdGVtIC52e3RleHQtYWxpZ246cmlnaHQ7Zm9udC13ZWlnaHQ6ODAwfQouc3ItaXRlbSAudi5tb25ve2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEycHh9Ci5zaWctcmVzdWx0e21heC1oZWlnaHQ6NTJ2aDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zaWctY2FyZHtib3JkZXItcmFkaXVzOjE2cHg7cGFkZGluZzoxM3B4IDE0cHg7bWFyZ2luLWJvdHRvbToxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5zaWctY2FyZC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMjUpfQouc2lnLWNhcmQuZmFpbHtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5zaWctY2FyZCAuaHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLnNpZy1jYXJkIC5oIC5ye2ZvbnQtc2l6ZToxMnB4fQouc2lnLWNhcmQub2sgLmggLnJ7Y29sb3I6dmFyKC0tb2spfSAuc2lnLWNhcmQuZmFpbCAuaCAucntjb2xvcjp2YXIoLS1lcnIpfQouc2lnLWNhcmQgLnN0ZXBze2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuOH0KLnNpZy1jYXJkIC5zdGVwcyBpe2ZvbnQtc3R5bGU6bm9ybWFsO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tcmlnaHQ6NXB4fQouc2lnLWNhcmQgLnN0ZXBzIC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KI3RvYXN0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO3RvcDpjYWxjKDE4cHggKyB2YXIoLS1zYWZlLXQpKTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKC0xNnB4KTt6LWluZGV4OjIwMDsKICBkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWF4LXdpZHRoOjg2dnc7cGFkZGluZzoxMXB4IDE4cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjcwMDsKICBiYWNrZ3JvdW5kOnJnYmEoMTcsMjYsNDYsLjkyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3gtc2hhZG93OjAgMTBweCAzNHB4IHJnYmEoMCwwLDAsLjQ1KTsKICBvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjI1cyx0cmFuc2Zvcm0gLjNzIHZhcigtLXNwcmluZyl9CiN0b2FzdC5zaG93e29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKDApfQojdG9hc3Qgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7ZmxleC1zaHJpbms6MH0KI3RvYXN0Lm9re2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVycntjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mb3tjb2xvcjp2YXIoLS1icmFuZCl9CiN0b2FzdC5vayBzdmd7Y29sb3I6dmFyKC0tb2spfSAjdG9hc3QuZXJyIHN2Z3tjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mbyBzdmd7Y29sb3I6dmFyKC0tYnJhbmQpfQouY29uZmlybS1sYXllcntwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTUwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjMwcHh9Ci5jb25maXJte3dpZHRoOm1pbigzNDBweCw5MHZ3KTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItcmFkaXVzOjIwcHg7cGFkZGluZzoyMnB4IDIwcHggMThweDt0ZXh0LWFsaWduOmNlbnRlcjtib3gtc2hhZG93OjAgMjRweCA2MHB4IHJnYmEoMCwwLDAsLjU1KTthbmltYXRpb246Y2FyZC1pbiAuM3MgdmFyKC0tc3ByaW5nKSBib3RofQouY29uZmlybSAuY3R7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouY29uZmlybSAuY2R7Zm9udC1zaXplOjEyLjVweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWFyZ2luLWJvdHRvbToxOHB4fQouY29uZmlybSAuY2J7ZGlzcGxheTpmbGV4O2dhcDoxMHB4fQouY29uZmlybSAuY2IgYnV0dG9ue2ZsZXg6MTtoZWlnaHQ6NDJweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouY29uZmlybSAuY2IgLm5ve2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKX0KLmNvbmZpcm0gLmNiIC55ZXN7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDfQoKLyogPT09PT09PT09PT09IG1pc2MgPT09PT09PT09PT09ICovCi5mb290e3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAwIDRweDtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuOH0KLmZvb3QgLmxpbmt7Y29sb3I6dmFyKC0tYnJhbmQpO3RleHQtZGVjb3JhdGlvbjpub25lO2ZvbnQtd2VpZ2h0OjcwMH0KLmhpZGRlbntkaXNwbGF5Om5vbmUhaW1wb3J0YW50fQpAa2V5ZnJhbWVzIHB1bHNlezAlLDEwMCV7b3BhY2l0eToxfTUwJXtvcGFjaXR5Oi40NX19Ci5wdWxzZXthbmltYXRpb246cHVsc2UgMS42cyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOnJlZHVjZSl7CiAgKnthbmltYXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50O3RyYW5zaXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50fQp9CkBtZWRpYSAobWluLXdpZHRoOjcwMHB4KXsKICBtYWlue21heC13aWR0aDo2ODBweDttYXJnaW46MCBhdXRvfQp9CkBtZWRpYSAobWF4LXdpZHRoOjY5OXB4KXsKICBpbnB1dFt0eXBlPXRleHRdLGlucHV0W3R5cGU9cGFzc3dvcmRdLGlucHV0W3R5cGU9bnVtYmVyXSx0ZXh0YXJlYXtmb250LXNpemU6MTZweCFpbXBvcnRhbnR9Cn0KCi8qID09PT09PT09PT09PSB2Mi4xNC45IOS7v+aegeaguOWumOaWueS4u+mimO+8iFpFRUhPIOiTnSAjMTc2NUZGIMK3IOeZveW6leWNoeeJh++8iSA9PT09PT09PT09PT0gKi8KW2RhdGEtdGhlbWU9InplZWhvIl17CiAgLS1iZzojRjRGNkZBOyAtLWJnMjojRkZGRkZGOwogIC0tY2FyZDojRkZGRkZGOyAtLWNhcmQyOiNGRkZGRkY7IC0tY2FyZDM6I0YwRjNGODsKICAtLWxpbmU6cmdiYSgxOCwzNCw2NiwuMDgpOyAtLWxpbmUyOnJnYmEoMTgsMzQsNjYsLjE2KTsKICAtLXR4dDojMTQxQzJFOyAtLXR4dDI6IzU0NjU4QTsgLS10eHQzOiM5OEE2QzA7CiAgLS1icmFuZDojMTc2NUZGOyAtLWJyYW5kMjojMEU0RkQxOyAtLWJyYW5kU29mdDpyZ2JhKDIzLDEwMSwyNTUsLjExKTsKICAtLW9rOiMwMEI1Nzg7IC0tb2tTb2Z0OnJnYmEoMCwxODEsMTIwLC4xMik7CiAgLS13YXJuOiNGRjhGMUY7IC0td2FyblNvZnQ6cmdiYSgyNTUsMTQzLDMxLC4xNCk7CiAgLS1lcnI6I0ZBNTE1MTsgLS1lcnJTb2Z0OnJnYmEoMjUwLDgxLDgxLC4xMSk7CiAgLS12aW86IzE3NjVGRjsgLS12aW9Tb2Z0OnJnYmEoMjMsMTAxLDI1NSwuMTEpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMxNzY1RkYsIzVCOUJGRik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMxNzY1RkYsIzBFNEZEMSk7Cn0KW2RhdGEtdGhlbWU9InplZWhvIl0gLmFwcC1oZWFkZXJ7YmFja2dyb3VuZDpyZ2JhKDI1NSwyNTUsMjU1LC45KTtib3JkZXItYm90dG9tLWNvbG9yOnJnYmEoMTgsMzQsNjYsLjA2KX0KW2RhdGEtdGhlbWU9InplZWhvIl0gLnRhYmJhcntiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjk0KTtib3JkZXItdG9wLWNvbG9yOnJnYmEoMTgsMzQsNjYsLjA3KX0KW2RhdGEtdGhlbWU9InplZWhvIl0gLmJyYW5kLW1hcmsgc3ZnIHBhdGh7c3Ryb2tlOiNmZmZ9CltkYXRhLXRoZW1lPSJ6ZWVobyJdIC5idG4ucHJpbWFyeXtjb2xvcjojZmZmfQpbZGF0YS10aGVtZT0iemVlaG8iXSAuYmctZ2xvd3tvcGFjaXR5Oi40NX0KW2RhdGEtdGhlbWU9InplZWhvIl0gLmFjYy1jaGlwLm9uLFtkYXRhLXRoZW1lPSJ6ZWVobyJdIC5zaWduaW4tZmFie2NvbG9yOiNmZmZ9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0g5YWl5Zy66Zeq5bGP77ya6aaW5bin5Y2z5pi+56S677yM5pWw5o2u5bCx57uq5ZCO5reh5Ye6ID09PT09PT09PT09PSAqLwojc3BsYXNoe3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDo5OTk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudCgxMjAlIDYwJSBhdCA1MCUgMCUscmdiYSgxNCwxNDMsMTc4LC4xNiksdHJhbnNwYXJlbnQgNjAlKSx2YXIoLS1iZyk7dHJhbnNpdGlvbjpvcGFjaXR5IC40cyB2YXIoLS1lYXNlKSx0cmFuc2Zvcm0gLjRzIHZhcigtLWVhc2UpfQojc3BsYXNoLm91dHtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKDEuMDQpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5zcC1tYXJre3dpZHRoOjg0cHg7aGVpZ2h0Ojg0cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JveC1zaGFkb3c6MCAxNHB4IDQwcHggcmdiYSgxNCwxNDMsMTc4LC40KTthbmltYXRpb246c3AtaW4gLjZzIHZhcigtLXNwcmluZykgYm90aH0KLnNwLW1hcmsgc3Zne3dpZHRoOjQ2cHg7aGVpZ2h0OjQ2cHh9Ci5zcC10aXRsZXttYXJnaW4tdG9wOjIwcHg7Zm9udC1zaXplOjIxcHg7Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOjFweDthbmltYXRpb246c3AtdXAgLjVzIC4xMnMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLXN1YnttYXJnaW4tdG9wOjdweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQzKTtsZXR0ZXItc3BhY2luZzozcHg7YW5pbWF0aW9uOnNwLXVwIC41cyAuMnMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWR7bWFyZ2luLXRvcDozNHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTthbmltYXRpb246c3AtdXAgLjVzIC4zcyB2YXIoLS1lYXNlKSBib3RofQouc3AtbG9hZCAuc3Bpbm5lcnt3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgc3AtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKC42KSB0cmFuc2xhdGVZKDEwcHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06c2NhbGUoMSkgdHJhbnNsYXRlWSgwKX19CkBrZXlmcmFtZXMgc3AtdXB7ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTJweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KPGRpdiBjbGFzcz0iYmctZ2xvdyI+PC9kaXY+CjxkaXYgaWQ9InNwbGFzaCI+CiAgPGRpdiBjbGFzcz0ic3AtbWFyayI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik00IDEzLjVDNCA5LjA4IDcuNTggNS41IDEyIDUuNXM4IDMuNTggOCA4IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTIgMTNsNy41IDUuNSIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNy41IiBjeT0iMTYuNSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PC9zdmc+PC9kaXY+CiAgPGRpdiBjbGFzcz0ic3AtdGl0bGUiPuaegeaguCBaRUVITzwvZGl2PgogIDxkaXYgY2xhc3M9InNwLXN1YiI+562+5YiwIMK3IOi9pui+hiDCtyDmjqfovaY8L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC1sb2FkIj48c3BhbiBjbGFzcz0ic3Bpbm5lciI+PC9zcGFuPuato+WcqOWKoOi9veaVsOaNruKApjwvZGl2Pgo8L2Rpdj4KPGRpdiBpZD0iYXBwIj4KICA8aGVhZGVyIGNsYXNzPSJhcHAtaGVhZGVyIj4KICAgIDxkaXYgY2xhc3M9ImJyYW5kLW1hcmsiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNNCAxMy41QzQgOS4wOCA3LjU4IDUuNSAxMiA1LjVzOCAzLjU4IDggOCIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTEyIDEzbDcuNSA1LjUiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjcuNSIgY3k9IjE2LjUiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjxjaXJjbGUgY3g9IjE3IiBjeT0iMTkiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjwvc3ZnPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnJhbmQtdHh0Ij4KICAgICAgPGgxPuaegeaguCBaRUVITyA8c3BhbiBjbGFzcz0idmVyLWNoaXAiPkxJVEU8L3NwYW4+PC9oMT4KICAgICAgPHA+562+5YiwIMK3IOi9pui+hiDCtyDmjqfovaY8L3A+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImhlYWQtYWN0aW9ucyI+CiAgICAgIDxkaXYgY2xhc3M9ImNvdW50LWNoaXAgaGlkZGVuIiBpZD0iY291bnRDaGlwIiBvbmNsaWNrPSJ0b2dnbGVBdXRvUmVmcmVzaCgpIj4KICAgICAgICA8c3BhbiBjbGFzcz0iY291bnQtcmluZyI+PHN2ZyB2aWV3Qm94PSIwIDAgMTQgMTQiPjxjaXJjbGUgY2xhc3M9InRyYWNrIiBjeD0iNyIgY3k9IjciIHI9IjUuNiIvPjxjaXJjbGUgY2xhc3M9ImFyYyIgaWQ9ImNvdW50QXJjIiBjeD0iNyIgY3k9IjciIHI9IjUuNiIgc3Ryb2tlLWRhc2hhcnJheT0iMzUuMiIgc3Ryb2tlLWRhc2hvZmZzZXQ9IjM1LjIiLz48L3N2Zz48L3NwYW4+CiAgICAgICAgPHNwYW4gaWQ9ImNvdW50VHh0Ij42MHM8L3NwYW4+CiAgICAgIDwvZGl2PgogICAgICA8YnV0dG9uIGNsYXNzPSJpY29uLWJ0biIgb25jbGljaz0icmVmcmVzaEFsbCgpIiBhcmlhLWxhYmVsPSLliLfmlrAiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDEyYTkgOSAwIDEgMS0yLjY0LTYuMzYiLz48cGF0aCBkPSJNMjEgM3Y2aC02Ii8+PC9zdmc+PC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2hlYWRlcj4KCiAgPG1haW4gaWQ9Im1haW4iPgogICAgPGRpdiBjbGFzcz0icHRyLXdyYXAiIGlkPSJwdHJXcmFwIj4KICAgICAgPGRpdiBjbGFzcz0icHRyLWluZGljYXRvciIgaWQ9InB0ckluZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiIGlkPSJwdHJTcGluIj48L3NwYW4+PHNwYW4gaWQ9InB0clR4dCI+5LiL5ouJ5Yi35pawPC9zcGFuPjwvZGl2PgogICAgICA8ZGl2IGlkPSJwYWdlSG9tZSI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VQb2ludHMiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZVZlaGljbGUiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUxvZ3MiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUNmZyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgPC9tYWluPgoKICA8bmF2IGNsYXNzPSJ0YWJiYXIiPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIG9uIiBkYXRhLXRhYj0iaG9tZSIgb25jbGljaz0ic3dpdGNoVGFiKCdob21lJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMC41IDEyIDNsOSA3LjUiLz48cGF0aCBkPSJNNSA5LjVWMjFoMTRWOS41Ii8+PC9zdmc+CiAgICAgIOmmlumhtTxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJwb2ludHMiIG9uY2xpY2s9InN3aXRjaFRhYigncG9pbnRzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjYiLz48cGF0aCBkPSJNOSA4LjVsMyA0IDMtNE0xMiAxMi41VjE3TTkuNiAxMy40aDQuOE05LjYgMTUuNGg0LjgiLz48L3N2Zz4KICAgICAg56ev5YiGPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InZlaGljbGUiIG9uY2xpY2s9InN3aXRjaFRhYigndmVoaWNsZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTNsMS43LTQuNkEyIDIgMCAwIDEgNy42IDdoOC44YTIgMiAwIDAgMSAxLjkgMS40TDIwIDEzIi8+PHBhdGggZD0iTTMuNSAxM2gxN2ExIDEgMCAwIDEgMSAxdjMuNWgtMi42TTIuNSAxNy41VjE0YTEgMSAwIDAgMSAxLTEiLz48cGF0aCBkPSJNNS4xIDE3LjVIMi41Ii8+PGNpcmNsZSBjeD0iNy4zIiBjeT0iMTcuMyIgcj0iMS45Ii8+PGNpcmNsZSBjeD0iMTYuNyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxwYXRoIGQ9Ik05LjIgMTcuM2g1LjYiLz48L3N2Zz4KICAgICAg6L2m6L6GPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImxvZ3MiIG9uY2xpY2s9InN3aXRjaFRhYignbG9ncycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTggNmgxM004IDEyaDEzTTggMThoMTMiLz48cGF0aCBkPSJNMyA2aC4wMU0zIDEyaC4wMU0zIDE4aC4wMSIvPjwvc3ZnPgogICAgICDml6Xlv5c8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0iY2ZnIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2NmZycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxwYXRoIGQ9Ik0xOS40IDE1YTEuNjUgMS42NSAwIDAgMCAuMzMgMS44MmwuMDYuMDZhMiAyIDAgMSAxLTIuODMgMi44M2wtLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMCAwLTEgMS41MVYyMWEyIDIgMCAxIDEtNCAwdi0uMDlhMS42NSAxLjY1IDAgMCAwLTEtMS41MSAxLjY1IDEuNjUgMCAwIDAtMS44Mi4zM2wtLjA2LjA2YTIgMiAwIDEgMS0yLjgzLTIuODNsLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAgLjMzLTEuODIgMS42NSAxLjY1IDAgMCAwLTEuNTEtMUgzYTIgMiAwIDEgMSAwLTRoLjA5YTEuNjUgMS42NSAwIDAgMCAxLjUxLTEgMS42NSAxLjY1IDAgMCAwLS4zMy0xLjgybC0uMDYtLjA2YTIgMiAwIDEgMSAyLjgzLTIuODNsLjA2LjA2YTEuNjUgMS42NSAwIDAgMCAxLjgyLjMzaC4wMWExLjY1IDEuNjUgMCAwIDAgMS0xLjUxVjNhMiAyIDAgMSAxIDQgMHYuMDlhMS42NSAxLjY1IDAgMCAwIDEgMS41MWguMDFhMS42NSAxLjY1IDAgMCAwIDEuODItLjMzbC4wNi0uMDZhMiAyIDAgMSAxIDIuODMgMi44M2wtLjA2LjA2YTEuNjUgMS42NSAwIDAgMC0uMzMgMS44MnYuMDFhMS42NSAxLjY1IDAgMCAwIDEuNTEgMUgyMWEyIDIgMCAxIDEgMCA0aC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXoiLz48L3N2Zz4KICAgICAg6K6+572uPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICA8L25hdj4KCiAgPGRpdiBjbGFzcz0ic2hlZXQtYmFja2Ryb3AiIGlkPSJzaGVldEJhY2tkcm9wIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjwvZGl2PgogIDxkaXYgY2xhc3M9InNoZWV0IiBpZD0ic2hlZXQiPgogICAgPGRpdiBjbGFzcz0ic2hlZXQtZ3JhYiI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1oZWFkIj4KICAgICAgPGgzIGlkPSJzaGVldFRpdGxlIj48L2gzPgogICAgICA8YnV0dG9uIGNsYXNzPSJzaGVldC1jbG9zZSIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+PC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWJvZHkiIGlkPSJzaGVldEJvZHkiPjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGlkPSJ0b2FzdCIgcm9sZT0ic3RhdHVzIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJjb25maXJtLWxheWVyIGhpZGRlbiIgaWQ9ImNvbmZpcm1MYXllciI+PC9kaXY+CjwvZGl2Pgo8c2NyaXB0PgoidXNlIHN0cmljdCI7Ci8qID09PT09PT09PT09PT09PT09IOW4uOmHjyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBUFBfVkVSU0lPTiA9ICJ2Mi4xNC4xMSI7CmNvbnN0IEtFWVMgPSB7IGNmZzoiemVlaG9fY2ZnIiwgYWNjb3VudHM6InplZWhvX2FjY291bnRzIiwgbG9nczoiemVlaG9fbG9ncyIgfTsKCi8qID09PT09PT09PT09PT09PT09IOW3peWFt+WHveaVsCA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRVdWlkKCl7Y29uc3QgcD0ieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4IixjPSJhYmNkZWYwMTIzNDU2Nzg5IjtsZXQgcj0iIjtmb3IoY29uc3QgY2ggb2YgcCl7aWYoY2g9PT0ieCJ8fGNoPT09InkiKXtjb25zdCBuPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxNik7cis9KGNoPT09InkiPyhuJjB4Myl8MHg4Om4pLnRvU3RyaW5nKDE2KX1lbHNlIHIrPWNofXJldHVybiByfQpmdW5jdGlvbiBnZXRSYW5kb21DaGFycyhuPTE2KXtjb25zdCBjPSIwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI7bGV0IHI9IiI7Zm9yKGxldCBpPTA7aTxuO2krKylyKz1jLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqYy5sZW5ndGgpKTtyZXR1cm4gcn0KZnVuY3Rpb24gdG9RdWVyeShwPXt9KXtyZXR1cm4gT2JqZWN0LmtleXMocCkuZmlsdGVyKGs9PnBba10hPT11bmRlZmluZWQmJnBba10hPT1udWxsKS5zb3J0KCkubWFwKGs9PmsrIj0iK3Bba10pLmpvaW4oIiYiKX0KZnVuY3Rpb24gY2xlYW5Ub2tlbih0KXtyZXR1cm4gU3RyaW5nKHR8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1lYXJlclxzKy9pLCIiKS5yZXBsYWNlKC9bXHMiJ2BdKy9nLCIiKX0KZnVuY3Rpb24gY2xlYW5CYXJrS2V5KGIpe2xldCBzPVN0cmluZyhifHwiIikudHJpbSgpLnJlcGxhY2UoL15bYkJdYXJrXHMqKGtleSk/XHMqWzrvvJpdXHMqL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpLnRyaW0oKTtyZXR1cm4gcy5yZXBsYWNlKC9cLyskLywiIil9CmZ1bmN0aW9uIG1hc2tWaW4odil7Y29uc3Qgcz1TdHJpbmcodnx8IiIpO2lmKCFzKXJldHVybiIiO2lmKHMubGVuZ3RoPD03KXJldHVybiIqKioqIjtyZXR1cm4gcy5zdWJzdHJpbmcoMCwzKSsiKioqKiIrcy5zdWJzdHJpbmcocy5sZW5ndGgtNCl9CmZ1bmN0aW9uIGRlZXBQaWNrKG9iaixrZXlzLGRlcHRoKXtpZighb2JqfHx0eXBlb2Ygb2JqIT09Im9iamVjdCJ8fChkZXB0aHx8MCk+NSlyZXR1cm4iIjtmb3IoY29uc3QgayBvZiBrZXlzKXtpZihvYmpba10hPT11bmRlZmluZWQmJm9ialtrXSE9PW51bGwmJm9ialtrXSE9PSIiKXJldHVybiBTdHJpbmcob2JqW2tdKX1mb3IoY29uc3QgayBpbiBvYmope2lmKG9ialtrXSYmdHlwZW9mIG9ialtrXT09PSJvYmplY3QiKXtjb25zdCByPWRlZXBQaWNrKG9ialtrXSxrZXlzLChkZXB0aHx8MCkrMSk7aWYocilyZXR1cm4gcn19cmV0dXJuIiJ9CmZ1bmN0aW9uIHBpY2tJb3RQcm9wKGQsaWRlbnRpZnkpe2NvbnN0IGFycj1kJiZkLmlvdFByb3BlcnRpZXM7aWYoQXJyYXkuaXNBcnJheShhcnIpKXtjb25zdCBrZXk9U3RyaW5nKGlkZW50aWZ5KS50b0xvd2VyQ2FzZSgpO2Zvcihjb25zdCBpdCBvZiBhcnIpe2lmKGl0JiZTdHJpbmcoaXQuaWRlbnRpZnl8fCIiKS50b0xvd2VyQ2FzZSgpPT09a2V5JiZpdC52YWx1ZSE9PW51bGwmJml0LnZhbHVlIT09dW5kZWZpbmVkJiZpdC52YWx1ZSE9PSIiKXJldHVybiBTdHJpbmcoaXQudmFsdWUpfX1yZXR1cm4iIn0KZnVuY3Rpb24gZ2V0RGV2aWNlSWRlbnRpZnkoYWNjKXtjb25zdCBzZWVkPVN0cmluZyhhY2MudXNlcklkfHxhY2MudmluTm98fCJ6ZWVoby1kZXZpY2UiKTtsZXQgaD0wO2ZvcihsZXQgaT0wO2k8c2VlZC5sZW5ndGg7aSsrKXtoPSgoaDw8NSktaCtzZWVkLmNoYXJDb2RlQXQoaSkpfDB9cmV0dXJuKE1hdGguYWJzKGgpLnRvU3RyaW5nKDE2KSsiMDAwMDAwMDAwMDAwMDAwMCIpLnNsaWNlKDAsMTYpfQpmdW5jdGlvbiBoYXNWYWxpZENvb3JkKGxhdCxsbmcpe2lmKGxhdD09PSIifHxsYXQ9PT1udWxsfHxsYXQ9PT11bmRlZmluZWR8fGxuZz09PSIifHxsbmc9PT1udWxsfHxsbmc9PT11bmRlZmluZWQpcmV0dXJuIGZhbHNlO2NvbnN0IGxhPU51bWJlcihsYXQpLGxuPU51bWJlcihsbmcpO3JldHVybiBpc0Zpbml0ZShsYSkmJmlzRmluaXRlKGxuKSYmTWF0aC5hYnMobGEpPD05MCYmTWF0aC5hYnMobG4pPD0xODAmJiEobGE9PT0wJiZsbj09PTApfQpmdW5jdGlvbiBub3JtYWxpemVSZWZyZXNoU2VjKHYpe2NvbnN0IG49TnVtYmVyKHYpO2lmKCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4gNjA7cmV0dXJuIE1hdGgubWF4KDE1LE1hdGgubWluKDM2MDAsTWF0aC5yb3VuZChuKSkpfQpmdW5jdGlvbiBlc2Mocyl7cmV0dXJuIFN0cmluZyhzPT1udWxsPyIiOnMpLnJlcGxhY2UoLyYvZywiJmFtcDsiKS5yZXBsYWNlKC88L2csIiZsdDsiKS5yZXBsYWNlKC8+L2csIiZndDsiKS5yZXBsYWNlKC8iL2csIiZxdW90OyIpfQoKLyogPT09PT09PT09PT09PT09PT0gTUQ1ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG1kNSh0LGUpe2Z1bmN0aW9uIG4odCxlKXtyZXR1cm4gdDw8ZXx0Pj4+MzItZX1mdW5jdGlvbiByKHQsZSl7dmFyIG4scixvLGksYTtyZXR1cm4gbz0yMTQ3NDgzNjQ4JnQsaT0yMTQ3NDgzNjQ4JmUsYT0oMTA3Mzc0MTgyMyZ0KSsoMTA3Mzc0MTgyMyZlKSwobj0xMDczNzQxODI0JnQpJihyPTEwNzM3NDE4MjQmZSk/MjE0NzQ4MzY0OF5hXm9eaTpufHI/MTA3Mzc0MTgyNCZhPzMyMjEyMjU0NzJeYV5vXmk6MTA3Mzc0MTgyNF5hXm9eaTphXm9eaX1mdW5jdGlvbiBvKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0JmV8fnQmbn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBpKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0Jm58ZSZ+bn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBhKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0XmVebn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiB1KHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiBlXih0fH5uKX0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBjKHQpe3ZhciBlLG49IiIscj0iIjtmb3IoZT0wO2U8PTM7ZSsrKW4rPShyPSIwIisodD4+PjgqZSYyNTUpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKHIubGVuZ3RoLTIsMik7cmV0dXJuIG59dmFyIHMsbCxmLHAsZCxoLHYseSxnLG09QXJyYXkoKTtmb3IobT1mdW5jdGlvbih0KXtmb3IodmFyIGUsbj10Lmxlbmd0aCxyPW4rOCxvPTE2Kigoci1yJTY0KS82NCsxKSxpPUFycmF5KG8tMSksYT0wLHU9MDt1PG47KWE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXx0LmNoYXJDb2RlQXQodSk8PGEsdSsrO3JldHVybiBhPXUlNCo4LGlbZT0odS11JTQpLzRdPWlbZV18MTI4PDxhLGlbby0yXT1uPDwzLGlbby0xXT1uPj4+MjksaX0odD1mdW5jdGlvbih0KXt0PXQucmVwbGFjZSgvXHJcbi9nLCJcbiIpO2Zvcih2YXIgZT0iIixuPTA7bjx0Lmxlbmd0aDtuKyspe3ZhciByPXQuY2hhckNvZGVBdChuKTtyPDEyOD9lKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHIpOnI+MTI3JiZyPDIwNDg/KGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NnwxOTIpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUoNjMmcnwxMjgpKTooZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj4xMnwyMjQpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NiY2M3wxMjgpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUoNjMmcnwxMjgpKX1yZXR1cm4gZX0odCkpLGg9MTczMjU4NDE5Myx2PTQwMjMyMzM0MTcseT0yNTYyMzgzMTAyLGc9MjcxNzMzODc4LHM9MDtzPG0ubGVuZ3RoO3MrPTE2KWw9aCxmPXYscD15LGQ9ZyxoPW8oaCx2LHksZyxtW3MrMF0sNywzNjE0MDkwMzYwKSxnPW8oZyxoLHYseSxtW3MrMV0sMTIsMzkwNTQwMjcxMCkseT1vKHksZyxoLHYsbVtzKzJdLDE3LDYwNjEwNTgxOSksdj1vKHYseSxnLGgsbVtzKzNdLDIyLDMyNTA0NDE5NjYpLGg9byhoLHYseSxnLG1bcys0XSw3LDQxMTg1NDgzOTkpLGc9byhnLGgsdix5LG1bcys1XSwxMiwxMjAwMDgwNDI2KSx5PW8oeSxnLGgsdixtW3MrNl0sMTcsMjgyMTczNTk1NSksdj1vKHYseSxnLGgsbVtzKzddLDIyLDQyNDkyNjEzMTMpLGg9byhoLHYseSxnLG1bcys4XSw3LDE3NzAwMzU0MTYpLGc9byhnLGgsdix5LG1bcys5XSwxMiwyMzM2NTUyODc5KSx5PW8oeSxnLGgsdixtW3MrMTBdLDE3LDQyOTQ5MjUyMzMpLHY9byh2LHksZyxoLG1bcysxMV0sMjIsMjMwNDU2MzEzNCksaD1vKGgsdix5LGcsbVtzKzEyXSw3LDE4MDQ2MDM2ODIpLGc9byhnLGgsdix5LG1bcysxM10sMTIsNDI1NDYyNjE5NSkseT1vKHksZyxoLHYsbVtzKzE0XSwxNywyNzkyOTY1MDA2KSxoPWkoaCx2PW8odix5LGcsaCxtW3MrMTVdLDIyLDEyMzY1MzUzMjkpLHksZyxtW3MrMV0sNSw0MTI5MTcwNzg2KSxnPWkoZyxoLHYseSxtW3MrNl0sOSwzMjI1NDY1NjY0KSx5PWkoeSxnLGgsdixtW3MrMTFdLDE0LDY0MzcxNzcxMyksdj1pKHYseSxnLGgsbVtzKzBdLDIwLDM5MjEwNjk5OTQpLGg9aShoLHYseSxnLG1bcys1XSw1LDM1OTM0MDg2MDUpLGc9aShnLGgsdix5LG1bcysxMF0sOSwzODAxNjA4MykseT1pKHksZyxoLHYsbVtzKzE1XSwxNCwzNjM0NDg4OTYxKSx2PWkodix5LGcsaCxtW3MrNF0sMjAsMzg4OTQyOTQ0OCksaD1pKGgsdix5LGcsbVtzKzldLDUsNTY4NDQ2NDM4KSxnPWkoZyxoLHYseSxtW3MrMTRdLDksMzI3NTE2MzYwNikseT1pKHksZyxoLHYsbVtzKzNdLDE0LDQxMDc2MDMzMzUpLHY9aSh2LHksZyxoLG1bcys4XSwyMCwxMTYzNTMxNTAxKSxoPWkoaCx2LHksZyxtW3MrMTNdLDUsMjg1MDI4NTgyOSksZz1pKGcsaCx2LHksbVtzKzJdLDksNDI0MzU2MzUxMikseT1pKHksZyxoLHYsbVtzKzddLDE0LDE3MzUzMjg0NzMpLGg9YShoLHY9aSh2LHksZyxoLG1bcysxMl0sMjAsMjM2ODM1OTU2MikseSxnLG1bcys1XSw0LDQyOTQ1ODg3MzgpLGc9YShnLGgsdix5LG1bcys4XSwxMSwyMjcyMzkyODMzKSx5PWEoeSxnLGgsdixtW3MrMTFdLDE2LDE4MzkwMzA1NjIpLHY9YSh2LHksZyxoLG1bcysxNF0sMjMsNDI1OTY1Nzc0MCksaD1hKGgsdix5LGcsbVtzKzFdLDQsMjc2Mzk3NTIzNiksZz1hKGcsaCx2LHksbVtzKzRdLDExLDEyNzI4OTMzNTMpLHk9YSh5LGcsaCx2LG1bcys3XSwxNiw0MTM5NDY5NjY0KSx2PWEodix5LGcsaCxtW3MrMTBdLDIzLDMyMDAyMzY2NTYpLGg9YShoLHYseSxnLG1bcysxM10sNCw2ODEyNzkxNzQpLGc9YShnLGgsdix5LG1bcyswXSwxMSwzOTM2NDMwMDc0KSx5PWEoeSxnLGgsdixtW3MrM10sMTYsMzU3MjQ0NTMxNyksdj1hKHYseSxnLGgsbVtzKzZdLDIzLDc2MDI5MTg5KSxoPWEoaCx2LHksZyxtW3MrOV0sNCwzNjU0NjAyODA5KSxnPWEoZyxoLHYseSxtW3MrMTJdLDExLDM4NzMxNTE0NjEpLHk9YSh5LGcsaCx2LG1bcysxNV0sMTYsNTMwNzQyNTIwKSxoPXUoaCx2PWEodix5LGcsaCxtW3MrMl0sMjMsMzI5OTYyODY0NSkseSxnLG1bcyswXSw2LDQwOTYzMzY0NTIpLGc9dShnLGgsdix5LG1bcys3XSwxMCwxMTI2ODkxNDE1KSx5PXUoeSxnLGgsdixtW3MrMTRdLDE1LDI4Nzg2MTIzOTEpLHY9dSh2LHksZyxoLG1bcys1XSwyMSw0MjM3NTMzMjQxKSxoPXUoaCx2LHksZyxtW3MrMTJdLDYsMTcwMDQ4NTU3MSksZz11KGcsaCx2LHksbVtzKzNdLDEwLDIzOTk5ODA2OTApLHk9dSh5LGcsaCx2LG1bcysxMF0sMTUsNDI5MzkxNTc3Myksdj11KHYseSxnLGgsbVtzKzFdLDIxLDIyNDAwNDQ0OTcpLGg9dShoLHYseSxnLG1bcys4XSw2LDE4NzMzMTMzNTkpLGc9dShnLGgsdix5LG1bcysxNV0sMTAsNDI2NDM1NTU1MikseT11KHksZyxoLHYsbVtzKzZdLDE1LDI3MzQ3Njg5MTYpLHY9dSh2LHksZyxoLG1bcysxM10sMjEsMTMwOTE1MTY0OSksaD11KGgsdix5LGcsbVtzKzRdLDYsNDE0OTQ0NDIyNiksZz11KGcsaCx2LHksbVtzKzExXSwxMCwzMTc0NzU2OTE3KSx5PXUoeSxnLGgsdixtW3MrMl0sMTUsNzE4Nzg3MjU5KSx2PXUodix5LGcsaCxtW3MrOV0sMjEsMzk1MTQ4MTc0NSksaD1yKGgsbCksdj1yKHYsZikseT1yKHkscCksZz1yKGcsZCk7cmV0dXJuIDMyPT1lPyhjKGgpK2ModikrYyh5KStjKGcpKS50b0xvd2VyQ2FzZSgpOihjKHYpK2MoeSkpLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IFNIQTEgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gc2hhMShtc2cpe2Z1bmN0aW9uIHJvdGF0ZV9sZWZ0KG4scyl7dmFyIHQ0PShuPDxzKXwobj4+PigzMi1zKSk7cmV0dXJuIHQ0fTtmdW5jdGlvbiBjdnRfaGV4KHZhbCl7dmFyIHN0cj0nJzt2YXIgaTt2YXIgdjtmb3IoaT03O2k+PTA7aS0tKXt2PSh2YWw+Pj4oaSo0KSkmMHgwZjtzdHIrPXYudG9TdHJpbmcoMTYpfXJldHVybiBzdHJ9O2Z1bmN0aW9uIFV0ZjhFbmNvZGUoc3RyaW5nKXtzdHJpbmc9c3RyaW5nLnJlcGxhY2UoL1xyXG4vZywnXG4nKTt2YXIgdXRmdGV4dD0nJztmb3IodmFyIG49MDtuPHN0cmluZy5sZW5ndGg7bisrKXt2YXIgYz1zdHJpbmcuY2hhckNvZGVBdChuKTtpZihjPDEyOCl7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZShjKX1lbHNlIGlmKChjPjEyNykmJihjPDIwNDgpKXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjPj42KXwxOTIpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpfDEyOCl9ZWxzZXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjPj4xMil8MjI0KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKCgoYz4+NikmNjMpfDEyOCk7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX19cmV0dXJuIHV0ZnRleHR9O3ZhciBibG9ja3N0YXJ0O3ZhciBpLGo7dmFyIFc9bmV3IEFycmF5KDgwKTt2YXIgSDA9MHg2NzQ1MjMwMTt2YXIgSDE9MHhFRkNEQUI4OTt2YXIgSDI9MHg5OEJBRENGRTt2YXIgSDM9MHgxMDMyNTQ3Njt2YXIgSDQ9MHhDM0QyRTFGMDt2YXIgQSxCLEMsRCxFO3ZhciB0ZW1wO21zZz1VdGY4RW5jb2RlKG1zZyk7dmFyIG1zZ19sZW49bXNnLmxlbmd0aDt2YXIgd29yZF9hcnJheT1uZXcgQXJyYXkoKTtmb3IoaT0wO2k8bXNnX2xlbi0zO2krPTQpe2o9bXNnLmNoYXJDb2RlQXQoaSk8PDI0fG1zZy5jaGFyQ29kZUF0KGkrMSk8PDE2fG1zZy5jaGFyQ29kZUF0KGkrMik8PDh8bXNnLmNoYXJDb2RlQXQoaSszKTt3b3JkX2FycmF5LnB1c2goail9c3dpdGNoKG1zZ19sZW4lNCl7Y2FzZSAwOmk9MHgwODAwMDAwMDA7YnJlYWs7Y2FzZSAxOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MjR8MHgwODAwMDAwO2JyZWFrO2Nhc2UgMjppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMik8PDI0fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDE2fDB4MDgwMDA7YnJlYWs7Y2FzZSAzOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0zKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MTZ8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8OHwweDgwO2JyZWFrfXdvcmRfYXJyYXkucHVzaChpKTt3aGlsZSgod29yZF9hcnJheS5sZW5ndGglMTYpIT0xNCl3b3JkX2FycmF5LnB1c2goMCk7d29yZF9hcnJheS5wdXNoKG1zZ19sZW4+Pj4yOSk7d29yZF9hcnJheS5wdXNoKChtc2dfbGVuPDwzKSYweDBmZmZmZmZmZik7Zm9yKGJsb2Nrc3RhcnQ9MDtibG9ja3N0YXJ0PHdvcmRfYXJyYXkubGVuZ3RoO2Jsb2Nrc3RhcnQrPTE2KXtmb3IoaT0wO2k8MTY7aSsrKVdbaV09d29yZF9hcnJheVtibG9ja3N0YXJ0K2ldO2ZvcihpPTE2O2k8PTc5O2krKylXW2ldPXJvdGF0ZV9sZWZ0KFdbaS0zXV5XW2ktOF1eV1tpLTE0XV5XW2ktMTZdLDEpO0E9SDA7Qj1IMTtDPUgyO0Q9SDM7RT1INDtmb3IoaT0wO2k8PTE5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoKEImQyl8KH5CJkQpKStFK1dbaV0rMHg1QTgyNzk5OSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9MjA7aTw9Mzk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKyhCXkNeRCkrRStXW2ldKzB4NkVEOUVCQTEpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTQwO2k8PTU5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoKEImQyl8KEImRCl8KEMmRCkpK0UrV1tpXSsweDhGMUJCQ0RDKSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT02MDtpPD03OTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHhDQTYyQzFENikmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9SDA9KEgwK0EpJjB4MGZmZmZmZmZmO0gxPShIMStCKSYweDBmZmZmZmZmZjtIMj0oSDIrQykmMHgwZmZmZmZmZmY7SDM9KEgzK0QpJjB4MGZmZmZmZmZmO0g0PShINCtFKSYweDBmZmZmZmZmZn12YXIgdGVtcD1jdnRfaGV4KEgwKStjdnRfaGV4KEgxKStjdnRfaGV4KEgyKStjdnRfaGV4KEgzKStjdnRfaGV4KEg0KTtyZXR1cm4gdGVtcC50b0xvd2VyQ2FzZSgpfQovKiA9PT09PT09PT09PT09PT09PSBBRVMtMjU2LUVDQiArIFBLQ1M3ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFFU19TQk9YPW5ldyBVaW50OEFycmF5KFsweDYzLDB4N2MsMHg3NywweDdiLDB4ZjIsMHg2YiwweDZmLDB4YzUsMHgzMCwweDAxLDB4NjcsMHgyYiwweGZlLDB4ZDcsMHhhYiwweDc2LDB4Y2EsMHg4MiwweGM5LDB4N2QsMHhmYSwweDU5LDB4NDcsMHhmMCwweGFkLDB4ZDQsMHhhMiwweGFmLDB4OWMsMHhhNCwweDcyLDB4YzAsMHhiNywweGZkLDB4OTMsMHgyNiwweDM2LDB4M2YsMHhmNywweGNjLDB4MzQsMHhhNSwweGU1LDB4ZjEsMHg3MSwweGQ4LDB4MzEsMHgxNSwweDA0LDB4YzcsMHgyMywweGMzLDB4MTgsMHg5NiwweDA1LDB4OWEsMHgwNywweDEyLDB4ODAsMHhlMiwweGViLDB4MjcsMHhiMiwweDc1LDB4MDksMHg4MywweDJjLDB4MWEsMHgxYiwweDZlLDB4NWEsMHhhMCwweDUyLDB4M2IsMHhkNiwweGIzLDB4MjksMHhlMywweDJmLDB4ODQsMHg1MywweGQxLDB4MDAsMHhlZCwweDIwLDB4ZmMsMHhiMSwweDViLDB4NmEsMHhjYiwweGJlLDB4MzksMHg0YSwweDRjLDB4NTgsMHhjZiwweGQwLDB4ZWYsMHhhYSwweGZiLDB4NDMsMHg0ZCwweDMzLDB4ODUsMHg0NSwweGY5LDB4MDIsMHg3ZiwweDUwLDB4M2MsMHg5ZiwweGE4LDB4NTEsMHhhMywweDQwLDB4OGYsMHg5MiwweDlkLDB4MzgsMHhmNSwweGJjLDB4YjYsMHhkYSwweDIxLDB4MTAsMHhmZiwweGYzLDB4ZDIsMHhjZCwweDBjLDB4MTMsMHhlYywweDVmLDB4OTcsMHg0NCwweDE3LDB4YzQsMHhhNywweDdlLDB4M2QsMHg2NCwweDVkLDB4MTksMHg3MywweDYwLDB4ODEsMHg0ZiwweGRjLDB4MjIsMHgyYSwweDkwLDB4ODgsMHg0NiwweGVlLDB4YjgsMHgxNCwweGRlLDB4NWUsMHgwYiwweGRiLDB4ZTAsMHgzMiwweDNhLDB4MGEsMHg0OSwweDA2LDB4MjQsMHg1YywweGMyLDB4ZDMsMHhhYywweDYyLDB4OTEsMHg5NSwweGU0LDB4NzksMHhlNywweGM4LDB4MzcsMHg2ZCwweDhkLDB4ZDUsMHg0ZSwweGE5LDB4NmMsMHg1NiwweGY0LDB4ZWEsMHg2NSwweDdhLDB4YWUsMHgwOCwweGJhLDB4NzgsMHgyNSwweDJlLDB4MWMsMHhhNiwweGI0LDB4YzYsMHhlOCwweGRkLDB4NzQsMHgxZiwweDRiLDB4YmQsMHg4YiwweDhhLDB4NzAsMHgzZSwweGI1LDB4NjYsMHg0OCwweDAzLDB4ZjYsMHgwZSwweDYxLDB4MzUsMHg1NywweGI5LDB4ODYsMHhjMSwweDFkLDB4OWUsMHhlMSwweGY4LDB4OTgsMHgxMSwweDY5LDB4ZDksMHg4ZSwweDk0LDB4OWIsMHgxZSwweDg3LDB4ZTksMHhjZSwweDU1LDB4MjgsMHhkZiwweDhjLDB4YTEsMHg4OSwweDBkLDB4YmYsMHhlNiwweDQyLDB4NjgsMHg0MSwweDk5LDB4MmQsMHgwZiwweGIwLDB4NTQsMHhiYiwweDE2XSk7CmNvbnN0IEFFU19SQ09OPW5ldyBVaW50OEFycmF5KFsweDAwLDB4MDEsMHgwMiwweDA0LDB4MDgsMHgxMCwweDIwLDB4NDAsMHg4MCwweDFiLDB4MzYsMHg2YywweGQ4LDB4YWIsMHg0ZF0pOwpmdW5jdGlvbiBhZXNHTXVsKGEsYil7bGV0IHA9MDtmb3IobGV0IGk9MDtpPDg7aSsrKXtpZihiJjEpcF49YTtjb25zdCBoaT1hJjB4ODA7YT0oYTw8MSkmMHhmZjtpZihoaSlhXj0weDFiO2I+Pj0xfXJldHVybiBwfQpmdW5jdGlvbiBhZXNLZXlFeHBhbnNpb24yNTYoa2V5KXtjb25zdCBOaz04LE5iPTQsTnI9MTQ7Y29uc3Qgdz1uZXcgVWludDhBcnJheSg0Kk5iKihOcisxKSk7Zm9yKGxldCBpPTA7aTxOayo0O2krKyl3W2ldPWtleVtpXTtmb3IobGV0IGk9Tms7aTxOYiooTnIrMSk7aSsrKXtsZXQgdDA9d1s0KihpLTEpXSx0MT13WzQqKGktMSkrMV0sdDI9d1s0KihpLTEpKzJdLHQzPXdbNCooaS0xKSszXTtpZihpJU5rPT09MCl7Y29uc3QgdG1wPXQwO3QwPUFFU19TQk9YW3QxXV5BRVNfUkNPTltpL05rXTt0MT1BRVNfU0JPWFt0Ml07dDI9QUVTX1NCT1hbdDNdO3QzPUFFU19TQk9YW3RtcF19ZWxzZSBpZihpJU5rPT09NCl7dDA9QUVTX1NCT1hbdDBdO3QxPUFFU19TQk9YW3QxXTt0Mj1BRVNfU0JPWFt0Ml07dDM9QUVTX1NCT1hbdDNdfXdbNCppXT13WzQqKGktTmspXV50MDt3WzQqaSsxXT13WzQqKGktTmspKzFdXnQxO3dbNCppKzJdPXdbNCooaS1OaykrMl1edDI7d1s0KmkrM109d1s0KihpLU5rKSszXV50M31yZXR1cm4gd30KZnVuY3Rpb24gYWVzRW5jcnlwdEJsb2NrKGlucHV0LHcpe2NvbnN0IE5iPTQsTnI9MTQ7Y29uc3Qgcz1uZXcgVWludDhBcnJheSgxNik7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXT1pbnB1dFtpXTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W2ldO2ZvcihsZXQgcm91bmQ9MTtyb3VuZDw9TnI7cm91bmQrKyl7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXT1BRVNfU0JPWFtzW2ldXTtsZXQgdD1zWzFdO3NbMV09c1s1XTtzWzVdPXNbOV07c1s5XT1zWzEzXTtzWzEzXT10O3Q9c1syXTtzWzJdPXNbMTBdO3NbMTBdPXQ7dD1zWzZdO3NbNl09c1sxNF07c1sxNF09dDt0PXNbM107c1szXT1zWzE1XTtzWzE1XT1zWzExXTtzWzExXT1zWzddO3NbN109dDtpZihyb3VuZCE9PU5yKXtmb3IobGV0IGM9MDtjPDQ7YysrKXtjb25zdCBpPTQqYztjb25zdCBhMD1zW2ldLGExPXNbaSsxXSxhMj1zW2krMl0sYTM9c1tpKzNdO3NbaV09YWVzR011bChhMCwyKV5hZXNHTXVsKGExLDMpXmEyXmEzO3NbaSsxXT1hMF5hZXNHTXVsKGExLDIpXmFlc0dNdWwoYTIsMyleYTM7c1tpKzJdPWEwXmExXmFlc0dNdWwoYTIsMileYWVzR011bChhMywzKTtzW2krM109YWVzR011bChhMCwzKV5hMV5hMl5hZXNHTXVsKGEzLDIpfX1jb25zdCBvZmY9cm91bmQqMTY7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXV49d1tvZmYraV19cmV0dXJuIHN9CmZ1bmN0aW9uIGFlc1V0ZjhCeXRlcyhzdHIpe2NvbnN0IG91dD1bXTtmb3IobGV0IGk9MDtpPHN0ci5sZW5ndGg7aSsrKXtsZXQgYz1zdHIuY2hhckNvZGVBdChpKTtpZihjPDB4ODApb3V0LnB1c2goYyk7ZWxzZSBpZihjPDB4ODAwKW91dC5wdXNoKDB4YzB8KGM+PjYpLDB4ODB8KGMmMHgzZikpO2Vsc2UgaWYoYz49MHhkODAwJiZjPD0weGRiZmYpe2NvbnN0IGMyPXN0ci5jaGFyQ29kZUF0KCsraSk7Yz0weDEwMDAwKygoYy0weGQ4MDApPDwxMCkrKGMyLTB4ZGMwMCk7b3V0LnB1c2goMHhmMHwoYz4+MTgpLDB4ODB8KChjPj4xMikmMHgzZiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfWVsc2Ugb3V0LnB1c2goMHhlMHwoYz4+MTIpLDB4ODB8KChjPj42KSYweDNmKSwweDgwfChjJjB4M2YpKX1yZXR1cm4gbmV3IFVpbnQ4QXJyYXkob3V0KX0KZnVuY3Rpb24gYWVzQnl0ZXNUb0Jhc2U2NChieXRlcyl7Y29uc3QgY2hhcnM9IkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8iO2xldCByZXN1bHQ9IiIsaT0wO2Zvcig7aSsyPGJ5dGVzLmxlbmd0aDtpKz0zKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KXxieXRlc1tpKzJdO3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rY2hhcnNbKG4+PjYpJjYzXStjaGFyc1tuJjYzXX1jb25zdCByZW09Ynl0ZXMubGVuZ3RoLWk7aWYocmVtPT09MSl7Y29uc3Qgbj1ieXRlc1tpXTw8MTY7cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXSsiPT0ifWVsc2UgaWYocmVtPT09Mil7Y29uc3Qgbj0oYnl0ZXNbaV08PDE2KXwoYnl0ZXNbaSsxXTw8OCk7cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdKyI9In1yZXR1cm4gcmVzdWx0fQpmdW5jdGlvbiBhZXMyNTZFY2JFbmNyeXB0QmFzZTY0KHBsYWludGV4dCxrZXlTdHIpe2NvbnN0IGtleT1hZXNVdGY4Qnl0ZXMoa2V5U3RyKTtpZihrZXkubGVuZ3RoIT09MzIpdGhyb3cgbmV3IEVycm9yKCJBRVMtMjU26ZyA6KaBMzLlrZfoioLlr4bpkqXvvIzlvZPliY0iK2tleS5sZW5ndGgpO2NvbnN0IHc9YWVzS2V5RXhwYW5zaW9uMjU2KGtleSk7Y29uc3QgZGF0YT1hZXNVdGY4Qnl0ZXMocGxhaW50ZXh0KTtjb25zdCBwYWRMZW49MTYtKGRhdGEubGVuZ3RoJTE2KTtjb25zdCBwYWRkZWQ9bmV3IFVpbnQ4QXJyYXkoZGF0YS5sZW5ndGgrcGFkTGVuKTtwYWRkZWQuc2V0KGRhdGEpO2ZvcihsZXQgaT1kYXRhLmxlbmd0aDtpPHBhZGRlZC5sZW5ndGg7aSsrKXBhZGRlZFtpXT1wYWRMZW47Y29uc3Qgb3V0PW5ldyBVaW50OEFycmF5KHBhZGRlZC5sZW5ndGgpO2ZvcihsZXQgb2ZmPTA7b2ZmPHBhZGRlZC5sZW5ndGg7b2ZmKz0xNil7b3V0LnNldChhZXNFbmNyeXB0QmxvY2socGFkZGVkLnNsaWNlKG9mZixvZmYrMTYpLHcpLG9mZil9cmV0dXJuIGFlc0J5dGVzVG9CYXNlNjQob3V0KX0KCi8qID09PT09PT09PT09PT09PT09IOWtmOWCqCA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBsb2FkSlNPTihrLGZhbGxiYWNrKXt0cnl7Y29uc3QgcmF3PWxvY2FsU3RvcmFnZS5nZXRJdGVtKGspO2lmKCFyYXcpcmV0dXJuIGZhbGxiYWNrO2NvbnN0IHY9SlNPTi5wYXJzZShyYXcpO3JldHVybiB2PT09dW5kZWZpbmVkfHx2PT09bnVsbD9mYWxsYmFjazp2fWNhdGNoKGUpe3JldHVybiBmYWxsYmFja319CmZ1bmN0aW9uIHNhdmVKU09OKGssdil7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGssSlNPTi5zdHJpbmdpZnkodikpO3JldHVybiB0cnVlfWNhdGNoKGUpe3JldHVybiBmYWxzZX19CmNvbnN0IERFRkFVTFRfQ0ZHPXthcHA6e2FwcElkOiJTN3FQV1BVMSIsYXBwU2VjcmV0OiJjNWUwZGE3ZjRkYTI4ZGY4MDU2OTRlYzNkZDFmYzY3OTJlOWRmOTlkIn0saDU6e2FwcElkOiJTdzVGOXVKaSIsYXBwU2VjcmV0OiI0Njg3MGE4ZjY3OGEwOTEwOTQ2OGY1YjAxNjg4MThiOTFjMjkyODQ1In0sY29tbXVuaXR5OntlbmFibGVQb3N0OnRydWUsZW5hYmxlTGlrZTp0cnVlLGVuYWJsZUNvbW1lbnQ6dHJ1ZSxlbmFibGVTaGFyZTp0cnVlLGVuYWJsZURlbGV0ZTp0cnVlfSx2ZWhpY2xlQWVzS2V5OiIiLGF1dG9SZWZyZXNoU2VjOjYwLHNlcnZlckJhc2U6IiIsYXV0b1NpZ25pbjpmYWxzZSxhdXRvU2lnbmluVGltZToiMDc6MDAiLHZlaGljbGVNb25pdG9yOmZhbHNlfTsKZnVuY3Rpb24gZ2V0Q2ZnKCl7Y29uc3QgYz1sb2FkSlNPTihLRVlTLmNmZyxudWxsKTtpZighYylyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShERUZBVUxUX0NGRykpO3JldHVybnthcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fERFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH0sY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSx2ZWhpY2xlQWVzS2V5Oih0eXBlb2YgYy52ZWhpY2xlQWVzS2V5PT09InN0cmluZyI/Yy52ZWhpY2xlQWVzS2V5OiIiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSxzZXJ2ZXJCYXNlOlN0cmluZyhjLnNlcnZlckJhc2V8fCIiKS50cmltKCksYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWV9fQpmdW5jdGlvbiBzYXZlQ2ZnKGMpe3JldHVybiBzYXZlSlNPTihLRVlTLmNmZyxjKX0KZnVuY3Rpb24gZ2V0QWNjb3VudHMoKXtjb25zdCBhPWxvYWRKU09OKEtFWVMuYWNjb3VudHMsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIHNhdmVBY2NvdW50cyhsaXN0KXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5hY2NvdW50cyxsaXN0KX0KZnVuY3Rpb24gZ2V0TG9ncygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5sb2dzLFtdKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfQpmdW5jdGlvbiBhZGRMb2coZW50cnkpe2NvbnN0IGxvZ3M9Z2V0TG9ncygpO2xvZ3MudW5zaGlmdChlbnRyeSk7aWYobG9ncy5sZW5ndGg+NTApbG9ncy5sZW5ndGg9NTA7c2F2ZUpTT04oS0VZUy5sb2dzLGxvZ3MpfQpmdW5jdGlvbiBjbGVhckxvZ3MoKXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5sb2dzLFtdKX0KZnVuY3Rpb24gaXNQcm94eU1vZGUoKXtyZXR1cm4gISEod2luZG93Ll9fUEFORUxfTU9ERV9fKXx8ISFnZXRDZmcoKS5zZXJ2ZXJCYXNlfQovKiA9PT09PT09PT09PT09PT09PSDnrb7lkI0gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZ2V0U2lnbih0eXBlLHBhcmFtcz17fSxib2R5PScnLGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWNbdHlwZV18fGMuYXBwO2NvbnN0IHF1ZXJ5PXRvUXVlcnkocGFyYW1zKTtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9dHlwZT09PSJoNSI/Z2V0VXVpZCgpOnRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBib2R5U3RyPWJvZHk/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6Jyc7Y29uc3Qgc2lnbmF0dXJlPXR5cGU9PT0iaDUiPyhxdWVyeStwYXJhbSthYy5hcHBTZWNyZXQpOihib2R5U3RyK3BhcmFtK2FjLmFwcFNlY3JldCk7Y29uc3Qgc2lnbj1tZDUoc2hhMShzaWduYXR1cmUpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdzaWduYXR1cmUnOnNpZ259fQoKLy8gSDUg56uv5ZCrIGJvZHkg562+5ZCN77yIbG9naW5CeVBob25lIOetieaOpeWPo+W/hemhu+aKiuivt+axguS9k+e6s+WFpeetvuWQje+8jOWQpuWImei/lOWbniBwZXJtaXQgZXJyb3LvvIkKZnVuY3Rpb24gaDVTaWduV2l0aEJvZHkoYm9keSxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jLmg1fHxjLmFwcDtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9Z2V0VXVpZCgpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBib2R5U3RyPXR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KTtjb25zdCBzaWduPW1kNShzaGExKGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2NmbW90by14LXBhcmFtJzpwYXJhbSwnY2Ztb3RvLXgtc2lnbic6c2lnbiwnY2Ztb3RvLXgtc2lnbi10eXBlJzonMCcsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ25vbmNlJzpub25jZSwnYXBwSWQnOmFjLmFwcElkfX0KCi8vIEFwcCDnvZHlhbPlrozmlbTnrb7lkI3vvIjlj5HnoIHkuI7nmbvlvZXlkIznvZHlhbPvvIzpgb/lhY0gSDUgYXV0aENvZGUg5Y+R56CB6L+bIEFwcCDmsaDogIwgSDUgbG9naW5CeVBob25lIOafpeS4jeWIsO+8iQpmdW5jdGlvbiBhcHBHYXRld2F5U2lnbih1cmwsbWV0aG9kLHBhcmFtcz17fSxib2R5PScnLGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuYXBwfHxjLmg1O2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10aW1lc3RhbXArZ2V0UmFuZG9tQ2hhcnMoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2xldCBwcmVTaWduPSIiO2lmKFN0cmluZyhtZXRob2QpLnRvVXBwZXJDYXNlKCk9PT0iR0VUIil7Y29uc3QgdT1uZXcgVVJMKHVybCk7cHJlU2lnbj11Lm9yaWdpbit1LnBhdGhuYW1lKyhxdWVyeT8iPyIrcXVlcnk6IiIpO31lbHNle3ByZVNpZ249cXVlcnkrKGJvZHk/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6IiIpO31jb25zdCBzaWduPW1kNShzaGExKHByZVNpZ24rcGFyYW0rYWMuYXBwU2VjcmV0KSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2FwcElkJzphYy5hcHBJZCwnbm9uY2UnOm5vbmNlLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdzaWduYXR1cmUnOnNpZ24sJ0NmbW90by1YLVBhcmFtJzpwYXJhbSwnQ2Ztb3RvLVgtU2lnbic6c2lnbiwnQ2Ztb3RvLVgtU2lnbi1UeXBlJzonMCd9fQoKLyogPT09PT09PT09PT09PT09PT0gSFRUUO+8iGZldGNoIOeJiO+8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBodHRwR2V0KHVybCxoZWFkZXJzLHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiR0VUIixoZWFkZXJzOmhlYWRlcnN8fHt9LHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwUG9zdCh1cmwsaGVhZGVycyxib2R5LHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiUE9TVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OnR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5PT1udWxsP3t9OmJvZHkpLHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwUHV0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQVVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sYm9keTpib2R5IT09dW5kZWZpbmVkJiZib2R5IT09bnVsbD8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTp1bmRlZmluZWQsc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBEZWxldGUodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJERUxFVEUiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmZ1bmN0aW9uIG5ldHdvcmtIaW50KHJlcyl7Y29uc3QgbT1TdHJpbmcoKHJlcyYmcmVzLmVycm9yKXx8IiIpO2lmKC9mYWlsZWQgdG8gZmV0Y2h8bmV0d29ya2Vycm9yfGNvcnN8bG9hZCBmYWlsZWR85peg5rOV6L+e5o6lfOe9kee7nC9pLnRlc3QobSkpcmV0dXJuIue9kee7nC/ot6jln5/lj5fpmZDvvJrnm7Tov57mqKHlvI/pnIAgWkVFSE8g5pyN5Yqh56uv5pS+6KGMIENPUlPvvIzoi6XlpLHotKXor7flnKjjgIzorr7nva4t5pyN5Yqh5Zyw5Z2A44CN5aGr5YWl5Y6f6ISa5pys5Zyw5Z2A6LWw5Luj55CG5qih5byPIjtyZXR1cm4iIn0KCi8qID09PT09PT09PT09PT09PT09IOebtOi/nuWQjuerr++8iOa1j+iniOWZqOebtOaOpeiwgyBaRUVITyBBUEnvvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYmFzZUhlYWRlcnMoYWNjKXtjb25zdCB1YT1hY2MudXNlckFnZW50fHwiTU9CSUxFfGlPU3wxNi4xLjF8WkVFSE9fQVBQfDMuMC4xfGlQaG9uZXxXV0FOfGlPUyI7Y29uc3QgaD17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIitjbGVhblRva2VuKGFjYy50b2tlbiksIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwiQWNjZXB0LUxhbmd1YWdlIjoiemgtQ04iLCJBY2NlcHQiOiIqLyoiLCJVc2VyLUFnZW50Ijp1YSwieC1hcHAtaW5mbyI6dWF9O2lmKGFjYy51c2VySWQpe2hbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7aFsiQ29va2llIl09InVzZXJfaWQ9IithY2MudXNlcklkfXJldHVybiBofQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9O2lmKGFjYy51c2VySWQpaGVhZGVyc1sidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLGhlYWRlcnMpO2xldCBsaXN0PVtdO2lmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKXtpZihBcnJheS5pc0FycmF5KHJlcy5kYXRhKSlsaXN0PXJlcy5kYXRhO2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEubGlzdCkpbGlzdD1yZXMuZGF0YS5saXN0O2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVjb3JkcykpbGlzdD1yZXMuZGF0YS5yZWNvcmRzO2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEucm93cykpbGlzdD1yZXMuZGF0YS5yb3dzfXJldHVybiBsaXN0Lm1hcCh2PT4oe3Zpbk5vOlN0cmluZyh2LnZpbk5vfHx2LmZyYW1lTm98fHYudmlufHwiIikudHJpbSgpLG5hbWU6U3RyaW5nKHYudmVoaWNsZU5hbWV8fHYudmVoaWNsZVR5cGV8fHYuZGV2aWNlTmFtZXx8di5uYW1lfHwi6L2m6L6GIikudHJpbSgpfHwi6L2m6L6GIixwaWM6U3RyaW5nKHYudmVoaWNsZVBpY1VybHx8di5waWN8fHYuaW1hZ2VVcmx8fCIiKS50cmltKCksdmVoaWNsZVR5cGU6U3RyaW5nKHYudmVoaWNsZVR5cGV8fHYudHlwZXx8IiIpLnRyaW0oKSxsaWNlbnNlUGxhdGU6di5saWNlbnNlUGxhdGV8fG51bGx9KSkuZmlsdGVyKHY9PnYudmluTm8pfWNhdGNoKGUpe3JldHVybltdfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZVdpZGdldHMoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS93aWRnZXRzLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHNvYz1OdW1iZXIoZC5ibXNzb2N8fGQuYmF0dGVyeUxldmVsfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fDApO2NvbnN0IHZvbHRhZ2U9TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHxkLnRvdGFsVm9sdGFnZXx8ZC5iYXR0ZXJ5VG90YWxWb2x0YWdlfHwwKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue2JhdHRlcnlQZXJjZW50Ok1hdGgubWF4KDAsTWF0aC5taW4oMTAwLGlzRmluaXRlKHNvYyk/c29jOjApKSxyZXNpZHVhbFJhbmdlS206aXNGaW5pdGUocmFuZ2UpP3JhbmdlOjAsdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxhZGRyZXNzOlN0cmluZyhkLmFkZHJlc3N8fCIiKS50cmltKCksbG9jYXRpb25UaW1lOlN0cmluZyhkLmxvY2F0aW9uPy5sb2NhdGlvblRpbWV8fCIiKS50cmltKCksdmVoaWNsZU5hbWU6U3RyaW5nKGQudmVoaWNsZU5hbWV8fCIiKS50cmltKCksdmVoaWNsZUltYWdlVXJsOlN0cmluZyhkLnZlaGljbGVTY2FsZVBpY1VybHx8ZC52ZWhpY2xlUGljVXJsfHwiIikudHJpbSgpLGhlYWRMb2NrU3RhdGU6U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8IiIpLnRyaW0oKSxiYXR0ZXJ5UHVsbE91dDpTdHJpbmcoZC5iYXR0ZXJ5UHVsbE91dEZsYWd8fCIiKT09PSIxIixvbmxpbmU6U3RyaW5nKGQub25saW5lU3RhdHVzfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8ZC5kZXZpY2VPbmxpbmV8fCIiKS50cmltKCksY3VzaGlvblN0YXRlOmRlZXBQaWNrKGQsWyJjdXNoaW9uU3RhdGUiLCJjdXNoaW9uU3RhdHVzIiwiY3VzaGlvbkxvY2tTdGF0ZSIsInNlYXRTdGF0ZSIsInNlYXRTdGF0dXMiLCJzZWF0TG9ja1N0YXRlIiwic2FkZGxlU3RhdGUiLCJzYWRkbGVTdGF0dXMiLCJzYWRkbGVMb2NrU3RhdGUiXSksbG9uZ2l0dWRlOihpc0Zpbml0ZShsb25naXR1ZGUpJiZNYXRoLmFicyhsb25naXR1ZGUpPD0xODAmJmxvbmdpdHVkZSE9PTApP2xvbmdpdHVkZToiIixsYXRpdHVkZTooaXNGaW5pdGUobGF0aXR1ZGUpJiZNYXRoLmFicyhsYXRpdHVkZSk8PTkwJiZsYXRpdHVkZSE9PTApP2xhdGl0dWRlOiIiLHBvd2VyU3RhdHVzOlN0cmluZyhkLmFjY1N0YXR1c3x8ZC5wb3dlclN0YXR1c3x8ZC52ZWhpY2xlU3RhdHVzfHxkLmlnbml0aW9uU3RhdHVzfHxkLnBvd2VyTW9kZXx8ZC5hY2NTdGF0ZXx8ZC5wb3dlclN0YXRlfHxkLnZlaGljbGVTdGF0ZXx8ZC5lbmdpbmVTdGF0dXN8fGQuaXNQb3dlck9ufHxkLnBvd2VyT258fCIiKS50cmltKCksbG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fGQubG9ja1N0YXRlfHxkLmxvY2tTdGF0dXN8fGQudmVoaWNsZUxvY2tTdGF0ZXx8ZC5jYXJMb2NrU3RhdGV8fGQuZG9vckxvY2tTdGF0ZXx8ZC5sb2NrRmxhZ3x8ZC5pc0xvY2tlZHx8ZC5sb2NrZWR8fGQuY2VudHJhbExvY2tpbmdTdGF0dXN8fCIiKS50cmltKCl9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGRldmljZUlkPWdldERldmljZUlkZW50aWZ5KGFjYyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVIb21lUGFnZVYyLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiP3VuaXF1ZUlkZW50aWZ5PSIrZGV2aWNlSWQrIiZwaG9uZURldmljZU5hbWU9aW9zXyIrZGV2aWNlSWQ7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQodXJsLGhlYWRlcnMpO2lmKHJlcyYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3QgdmVoaWNsZUxvY2s9cGlja0lvdFByb3AoZCwiVmVoaWNsZUxvY2tfUyIpO2NvbnN0IGhlYWRMb2NrSW90PXBpY2tJb3RQcm9wKGQsIkhlYWRMb2NrU3RhdGUiKTtjb25zdCB0b3BMb2NrPVN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fGQubG9ja1N0YXRlfHxkLmxvY2tTdGF0dXN8fGQudmVoaWNsZUxvY2tTdGF0ZXx8aGVhZExvY2tJb3R8fHZlaGljbGVMb2NrfHwiIikudHJpbSgpO2NvbnN0IGxuZ1N0cj1kZWVwUGljayhkLFsibG9uZ2l0dWRlIiwibG5nIiwibG9uIiwiZ3BzWCIsImxvbmdpdHVkZVZhbHVlIiwiY29vcmRYIiwieCJdKTtjb25zdCBsYXRTdHI9ZGVlcFBpY2soZCxbImxhdGl0dWRlIiwibGF0IiwiZ3BzWSIsImxhdGl0dWRlVmFsdWUiLCJjb29yZFkiLCJ5Il0pO2NvbnN0IGxvbmdpdHVkZT1OdW1iZXIobG5nU3RyKSxsYXRpdHVkZT1OdW1iZXIobGF0U3RyKTtyZXR1cm57cG93ZXJTdGF0dXM6ZGVlcFBpY2soZCxbImFjY1N0YXR1cyIsInBvd2VyU3RhdHVzIiwidmVoaWNsZVN0YXR1cyIsImlnbml0aW9uU3RhdHVzIiwicG93ZXJNb2RlIiwiYWNjU3RhdGUiLCJwb3dlclN0YXRlIiwidmVoaWNsZVN0YXRlIiwiZW5naW5lU3RhdHVzIiwiaXNQb3dlck9uIiwicG93ZXJPbiIsImFjYyJdKS50cmltKCksbG9ja1N0YXRlOnRvcExvY2ssb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5yaWRlU3RhdGV8fGQub25saW5lfHxkLm5ldFN0YXR1c3x8ZC50Ym94U3RhdHVzfHwiIikudHJpbSgpLHJpZGVTdGF0ZTpTdHJpbmcoZC5yaWRlU3RhdGV8fCIiKS50cmltKCksY3VzaGlvblN0YXRlOmRlZXBQaWNrKGQsWyJjdXNoaW9uU3RhdGUiLCJjdXNoaW9uU3RhdHVzIiwiY3VzaGlvbkxvY2tTdGF0ZSIsInNlYXRTdGF0ZSIsInNlYXRTdGF0dXMiLCJzZWF0TG9ja1N0YXRlIiwic2FkZGxlU3RhdGUiLCJzYWRkbGVTdGF0dXMiLCJzYWRkbGVMb2NrU3RhdGUiXSksbG9uZ2l0dWRlOihpc0Zpbml0ZShsb25naXR1ZGUpJiZNYXRoLmFicyhsb25naXR1ZGUpPD0xODAmJmxvbmdpdHVkZSE9PTApP2xvbmdpdHVkZToiIixsYXRpdHVkZTooaXNGaW5pdGUobGF0aXR1ZGUpJiZNYXRoLmFicyhsYXRpdHVkZSk8PTkwJiZsYXRpdHVkZSE9PTApP2xhdGl0dWRlOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9hcHAvdmVoaWNsZS90aXJlL21vbml0b3Jpbmc/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImdGltZVBlcmlvZFR5cGU9MSIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlYWxUaW1lRGF0YSk/cmVzLmRhdGEucmVhbFRpbWVEYXRhOihBcnJheS5pc0FycmF5KHJlcy5kYXRhKT9yZXMuZGF0YTpbXSk7Y29uc3QgYnlQb3M9e307Zm9yKGNvbnN0IGl0IG9mIGxpc3Qpe2NvbnN0IHBvcz1OdW1iZXIoaXQ/LnNlbnNvclBvc2l0aW9uKTtpZihwb3MpYnlQb3NbcG9zXT1pdH1jb25zdCBmbXQ9KGl0KT0+e2NvbnN0IHdhcm49TnVtYmVyKGl0Py53YXJuaW5nVHlwZT8/MCk7Y29uc3Qgdj1TdHJpbmcoaXQ/LnRpcmVQcmVzc3VyZT8/IiIpLnRyaW0oKTtjb25zdCBuPXBhcnNlRmxvYXQodik7aWYod2FybiE9PTB8fCF2fHwhaXNGaW5pdGUobil8fG48PTApcmV0dXJuIuacque7keWumiI7cmV0dXJuIHYrImJhciJ9O2NvbnN0IGZtdFRlbXA9KGl0KT0+e2NvbnN0IHdhcm49TnVtYmVyKGl0Py53YXJuaW5nVHlwZT8/MCk7Y29uc3Qgdj1pdD8udGlyZVRlbXA7aWYod2FybiE9PTB8fHY9PW51bGwpcmV0dXJuIiI7Y29uc3Qgcz1TdHJpbmcodikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdChzKTtpZighc3x8cy50b0xvd2VyQ2FzZSgpPT09Im51bGwifHwhaXNGaW5pdGUobil8fG48PTApcmV0dXJuIiI7cmV0dXJuIHMrIsKwQyJ9O2NvbnN0IGZyb250PWJ5UG9zWzFdfHxsaXN0WzBdO2NvbnN0IHJlYXI9YnlQb3NbMl18fGxpc3RbMV07cmV0dXJue2Zyb250UHJlc3N1cmU6ZnJvbnQ/Zm10KGZyb250KToi5pyq57uR5a6aIixyZWFyUHJlc3N1cmU6cmVhcj9mbXQocmVhcik6Iuacque7keWumiIsZnJvbnRUZW1wOmZyb250P2ZtdFRlbXAoZnJvbnQpOiIiLHJlYXJUZW1wOnJlYXI/Zm10VGVtcChyZWFyKToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hSaWRlSW5mbyhhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBtb250aD1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IFtob21lUmVzLG15UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9ob21lUmlkZUluZm8/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSksaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9teVJpZGVJbmZvP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJm1vbnRoPSIrbW9udGgseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KV0pO2NvbnN0IGg9aG9tZVJlcz8uZGF0YXx8aG9tZVJlc3x8e307Y29uc3QgZD1teVJlcz8uZGF0YXx8bXlSZXN8fHt9O2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShkLnJpZGVSZWNvcmRMaXN0KT9kLnJpZGVSZWNvcmRMaXN0OltdO2NvbnN0IHRvZGF5S2V5PW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGRheT1saXN0LmZpbmQoeD0+U3RyaW5nKHg/LmRhdGV8fCIiKT09PXRvZGF5S2V5KXx8bGlzdFtsaXN0Lmxlbmd0aC0xXXx8e307cmV0dXJue3RvZGF5RGlzdGFuY2U6TnVtYmVyKGRheS5yaWRlTWlsZWFnZT8/aC5yaWRlTWlsZWFnZURheT8/MCksdG9kYXlEdXJhdGlvbjpOdW1iZXIoZGF5LnJpZGluZ1RpbWVEYXlVbml0TWludXRlPz9oLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCksdG9kYXlNYXhTcGVlZDpOdW1iZXIoZGF5Lm1heFNwZWVkPz8wKSxsYXN0UmlkZU1pbGVhZ2U6TnVtYmVyKGgubGFzdFJpZGVNaWxlYWdlPz8wKSxsYXN0UmlkZUR1cmF0aW9uOk51bWJlcihoLmxhc3RSaWRpbmdUaW1lVW5pdE1pbnV0ZT8/MCl9fWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwiYXBwaWQiOmNmZy5hcHAuYXBwSWQsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9iYXR0ZXJ5SW5mby8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZvbHRhZ2U9TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHxkLnRvdGFsVm9sdGFnZXx8ZC5iYXR0ZXJ5VG90YWxWb2x0YWdlfHxkLnZvbHx8ZC5iYXRWb2x0YWdlfHxkLmJhdHRlcnlWb2x8fDApO2NvbnN0IGN1cnJlbnQ9TnVtYmVyKGQuY3VycmVudHx8ZC5iYXR0ZXJ5Q3VycmVudHx8ZC5ibXNDdXJyZW50fHxkLmN1cnx8ZC5iYXR0ZXJ5Q3VyfHwwKTtjb25zdCBiYXR0ZXJ5VGVtcD1OdW1iZXIoZC5iYXR0ZXJ5VGVtcHx8ZC5iYXRUZW1wfHxkLnRlbXB8fGQudGVtcGVyYXR1cmV8fGQuYm1zVGVtcHx8ZC5iYXR0ZXJ5VGVtcGVyYXR1cmV8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8ZC5yZXNpZHVhbFJhbmdlfHwwKTtyZXR1cm57Y2hhcmdlU3RhdGU6U3RyaW5nKGQuY2hhcmdlU3RhdGVTdHJ8fGQuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKSx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGN1cnJlbnQ6aXNGaW5pdGUoY3VycmVudCk/Y3VycmVudDowLGJhdHRlcnlUZW1wOmlzRmluaXRlKGJhdHRlcnlUZW1wKT9iYXR0ZXJ5VGVtcDowLHNvYzpOdW1iZXIoZC5zb2N8fGQuYmF0dGVyeUxldmVsfHxkLmJtc3NvY3x8MCkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowfX1yZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX1jYXRjaChlKXtyZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImg1Iix7dmluTm86dmluTm99LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVyYXBwL2FwcC9zZXJ2aWNlL3JlY2hhcmdlL3ZlaGljbGUvZGV0YWlsP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3JldHVybntyZWNoYXJnZUVuZERhdGU6U3RyaW5nKHJlcy5kYXRhLnJlY2hhcmdlRW5kRGF0ZXx8IiIpLGxhc3RVc2VEYXRlOk51bWJlcihyZXMuZGF0YS5sYXN0VXNlRGF0ZSl8fDAsc2VydmljZVJlY2hhcmdlU3RhdHVzOlN0cmluZyhyZXMuZGF0YS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiKSx2ZWhpY2xlTmFtZTpTdHJpbmcocmVzLmRhdGEudmVoaWNsZU5hbWV8fCIiKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e2hhc1ZlaGljbGU6ZmFsc2UsdmVoaWNsZU5hbWU6IiIsdmluTm86IiIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLGJhdHRlcnlQZXJjZW50OjAscmVzaWR1YWxSYW5nZUttOjAscmFuZ2VFc3RpbWF0ZWQ6ZmFsc2UsYWRkcmVzczoiIixsb2NhdGlvblRpbWU6IiIsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsZnJvbnRQcmVzc3VyZToiIixyZWFyUHJlc3N1cmU6IiIsZnJvbnRUZW1wOiIiLHJlYXJUZW1wOiIiLHRvZGF5RGlzdGFuY2U6MCx0b2RheUR1cmF0aW9uOjAsdG9kYXlNYXhTcGVlZDowLGxhc3RSaWRlTWlsZWFnZTowLHZlaGljbGVJbWFnZVVybDoiIixzZXJ2aWNlRW5kRGF0ZToiIixzZXJ2aWNlUmVtYWluRGF5czowLHNlcnZpY2VTdGF0dXM6IiIscG93ZXJTdGF0dXM6IiIsbG9ja1N0YXRlOiIiLG9ubGluZToiIixyaWRlU3RhdGU6IiIsY3VzaGlvblN0YXRlOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIn07dHJ5e2NvbnN0IHZlaGljbGVzPWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7aWYodmVoaWNsZXMubGVuZ3RoPT09MClyZXR1cm4gcmVzdWx0O2NvbnN0IHY9dmVoaWNsZXNbMF07cmVzdWx0Lmhhc1ZlaGljbGU9dHJ1ZTtyZXN1bHQudmVoaWNsZU5hbWU9di5uYW1lO3Jlc3VsdC52aW5Obz12LnZpbk5vO3Jlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9di5waWM7Y29uc3QgW3dpZGdldHMsdGlyZSxyaWRlLGJhdHRlcnksc2VydmljZSxob21lUGFnZV09YXdhaXQgUHJvbWlzZS5hbGwoW2ZldGNoVmVoaWNsZVdpZGdldHMoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hSaWRlSW5mbyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT4oe2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MH0pKSxmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKV0pO2lmKHdpZGdldHMpe3Jlc3VsdC5iYXR0ZXJ5UGVyY2VudD13aWRnZXRzLmJhdHRlcnlQZXJjZW50O3Jlc3VsdC5yZXNpZHVhbFJhbmdlS209d2lkZ2V0cy5yZXNpZHVhbFJhbmdlS207cmVzdWx0LnZvbHRhZ2U9d2lkZ2V0cy52b2x0YWdlO3Jlc3VsdC5hZGRyZXNzPXdpZGdldHMuYWRkcmVzcztyZXN1bHQubG9jYXRpb25UaW1lPXdpZGdldHMubG9jYXRpb25UaW1lO3Jlc3VsdC5wb3dlclN0YXR1cz13aWRnZXRzLnBvd2VyU3RhdHVzfHwiIjtyZXN1bHQubG9ja1N0YXRlPXdpZGdldHMubG9ja1N0YXRlfHwiIjtpZih3aWRnZXRzLnZlaGljbGVOYW1lKXJlc3VsdC52ZWhpY2xlTmFtZT13aWRnZXRzLnZlaGljbGVOYW1lO2lmKHdpZGdldHMudmVoaWNsZUltYWdlVXJsKXJlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9d2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmw7aWYod2lkZ2V0cy5vbmxpbmUpcmVzdWx0Lm9ubGluZT13aWRnZXRzLm9ubGluZTtpZih3aWRnZXRzLmN1c2hpb25TdGF0ZSlyZXN1bHQuY3VzaGlvblN0YXRlPXdpZGdldHMuY3VzaGlvblN0YXRlO2lmKHdpZGdldHMubG9uZ2l0dWRlIT09IiImJndpZGdldHMubG9uZ2l0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sb25naXR1ZGU9d2lkZ2V0cy5sb25naXR1ZGU7aWYod2lkZ2V0cy5sYXRpdHVkZSE9PSIiJiZ3aWRnZXRzLmxhdGl0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sYXRpdHVkZT13aWRnZXRzLmxhdGl0dWRlfWlmKGhvbWVQYWdlKXtpZihob21lUGFnZS5wb3dlclN0YXR1cylyZXN1bHQucG93ZXJTdGF0dXM9aG9tZVBhZ2UucG93ZXJTdGF0dXM7aWYoaG9tZVBhZ2UubG9ja1N0YXRlKXJlc3VsdC5sb2NrU3RhdGU9aG9tZVBhZ2UubG9ja1N0YXRlO2lmKGhvbWVQYWdlLm9ubGluZSlyZXN1bHQub25saW5lPWhvbWVQYWdlLm9ubGluZTtpZihob21lUGFnZS5yaWRlU3RhdGUpcmVzdWx0LnJpZGVTdGF0ZT1ob21lUGFnZS5yaWRlU3RhdGU7aWYoaG9tZVBhZ2UuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9aG9tZVBhZ2UuY3VzaGlvblN0YXRlO2lmKChyZXN1bHQubG9uZ2l0dWRlPT09IiJ8fHJlc3VsdC5sb25naXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sb25naXR1ZGUhPT0iIiYmaG9tZVBhZ2UubG9uZ2l0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sb25naXR1ZGU9aG9tZVBhZ2UubG9uZ2l0dWRlO2lmKChyZXN1bHQubGF0aXR1ZGU9PT0iInx8cmVzdWx0LmxhdGl0dWRlPT09dW5kZWZpbmVkKSYmaG9tZVBhZ2UubGF0aXR1ZGUhPT0iIiYmaG9tZVBhZ2UubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPWhvbWVQYWdlLmxhdGl0dWRlfWlmKHRpcmUpe3Jlc3VsdC5mcm9udFByZXNzdXJlPXRpcmUuZnJvbnRQcmVzc3VyZTtyZXN1bHQucmVhclByZXNzdXJlPXRpcmUucmVhclByZXNzdXJlO3Jlc3VsdC5mcm9udFRlbXA9dGlyZS5mcm9udFRlbXA7cmVzdWx0LnJlYXJUZW1wPXRpcmUucmVhclRlbXB9aWYocmlkZSl7cmVzdWx0LnRvZGF5RGlzdGFuY2U9cmlkZS50b2RheURpc3RhbmNlO3Jlc3VsdC50b2RheUR1cmF0aW9uPXJpZGUudG9kYXlEdXJhdGlvbjtyZXN1bHQudG9kYXlNYXhTcGVlZD1yaWRlLnRvZGF5TWF4U3BlZWQ7cmVzdWx0Lmxhc3RSaWRlTWlsZWFnZT1yaWRlLmxhc3RSaWRlTWlsZWFnZX1yZXN1bHQuY2hhcmdlU3RhdGU9YmF0dGVyeS5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSI7aWYoYmF0dGVyeS52b2x0YWdlKXJlc3VsdC52b2x0YWdlPWJhdHRlcnkudm9sdGFnZTtpZihiYXR0ZXJ5LmN1cnJlbnQpcmVzdWx0LmN1cnJlbnQ9YmF0dGVyeS5jdXJyZW50O2lmKGJhdHRlcnkuYmF0dGVyeVRlbXApcmVzdWx0LmJhdHRlcnlUZW1wPWJhdHRlcnkuYmF0dGVyeVRlbXA7aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJmJhdHRlcnkucmVzaWR1YWxSYW5nZUttKXJlc3VsdC5yZXNpZHVhbFJhbmdlS209YmF0dGVyeS5yZXNpZHVhbFJhbmdlS207aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJnJlc3VsdC5iYXR0ZXJ5UGVyY2VudD4wKXtyZXN1bHQucmVzaWR1YWxSYW5nZUttPU1hdGgucm91bmQocmVzdWx0LmJhdHRlcnlQZXJjZW50KjAuODcpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSDotKblj7fmlbDmja7mi4nlj5YgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbk5vKXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7bGV0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpeeUqOaItyIsdXNlcklkLHNjb3JlOjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjAsdG9kYXlTY29yZTowLHNpZ25Db3VudDowLGxhc3Q3OltdLGVycm9yOm51bGwsdmVoaWNsZTp7aGFzVmVoaWNsZTpmYWxzZX19OwppZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHZlaGljbGVSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9KTtpZih2ZWhpY2xlUmVzLmNvZGU9PSIxMDAwMCImJnZlaGljbGVSZXMuZGF0YSl7Y29uc3QgYXV0b1VpZD1TdHJpbmcodmVoaWNsZVJlcy5kYXRhLnVzZXJJZHx8dmVoaWNsZVJlcy5kYXRhLnVpZHx8dmVoaWNsZVJlcy5kYXRhLmlkfHwiIik7aWYoYXV0b1VpZCl7dXNlcklkPWF1dG9VaWQ7cmVzdWx0LnVzZXJJZD11c2VySWQ7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBpZHg9YWNjb3VudHMuZmluZEluZGV4KGE9PmNsZWFuVG9rZW4oYS50b2tlbik9PT10b2tlbik7aWYoaWR4Pj0wJiYhYWNjb3VudHNbaWR4XS51c2VySWQpe2FjY291bnRzW2lkeF0udXNlcklkPXVzZXJJZDtzYXZlQWNjb3VudHMoYWNjb3VudHMpfX19fWNhdGNoKGUpe319CnRyeXtyZXN1bHQudmVoaWNsZT1hd2FpdCBmZXRjaFZlaGljbGVJbmZvKGFjYyxjZmcsdmluTm8pfWNhdGNoKGUpe3Jlc3VsdC52ZWhpY2xlPXtoYXNWZWhpY2xlOmZhbHNlfX0KdHJ5e2lmKCF1c2VySWQpe3Jlc3VsdC5lcnJvcj0i6K+35Zyo6K6+572u6aG15aGr5YaZ55So5oi3SUQifWVsc2V7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfSk7aWYoaW5mb1Jlcy5jb2RlPT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3Jlc3VsdC5zY29yZT1OdW1iZXIoaW5mb1Jlcy5kYXRhLnNjb3JlfHxpbmZvUmVzLmRhdGEuaW50ZWdyYWx8fGluZm9SZXMuZGF0YS5wb2ludHx8aW5mb1Jlcy5kYXRhLnBvaW50c3x8aW5mb1Jlcy5kYXRhLnRvdGFsU2NvcmV8fGluZm9SZXMuZGF0YS50b3RhbEludGVncmFsfHwwKX1lbHNlIGlmKGluZm9SZXMuY29kZT09IjQwMDAxInx8aW5mb1Jlcy5jb2RlPT00MDEpe3Jlc3VsdC5lcnJvcj0iVG9rZW7lt7Lov4fmnJ8ifWVsc2V7cmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blpLHotKU6ICIrKGluZm9SZXMubWVzc2FnZXx8aW5mb1Jlcy5jb2RlfHwi5pyq55+l6ZSZ6K+vIil9fX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5byC5bi4OiAiK1N0cmluZyhlKX0KdHJ5e2NvbnN0IGN1ck1vbnRoPW5vdy5nZXRGdWxsWWVhcigpKyItIisobm93LmdldE1vbnRoKCkrMSk7Y29uc3QgbGFzdERhdGU9bmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksbm93LmdldE1vbnRoKCktMSwxKTtjb25zdCBsYXN0TW9udGg9bGFzdERhdGUuZ2V0RnVsbFllYXIoKSsiLSIrKGxhc3REYXRlLmdldE1vbnRoKCkrMSk7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBbY3VyUmVzLGxhc3RSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9IitjdXJNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpjdXJNb250aH0sJycsY2ZnKX0pLGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2xhc3RNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpsYXN0TW9udGh9LCcnLGNmZyl9KV0pO2NvbnN0IGxhc3RMaXN0PShsYXN0UmVzLmNvZGU9PSIxMDAwMCImJmxhc3RSZXMuZGF0YSk/KGxhc3RSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgY3VyTGlzdD0oY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKT8oY3VyUmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGxpc3Q9Wy4uLmxhc3RMaXN0LC4uLmN1ckxpc3RdO2lmKGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSl7cmVzdWx0LnNpZ25Db3VudD1OdW1iZXIoY3VyUmVzLmRhdGEuc2lnbkNvdW50KXx8MH1jb25zdCB0b2RheUVudHJ5PWN1ckxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25lZFRvZGF5PSEhKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSk7cmVzdWx0LnRvZGF5U2NvcmU9dG9kYXlFbnRyeT8oTnVtYmVyKHRvZGF5RW50cnkuaW50ZWdyYWxTY29yZSl8fDApOjA7dHJ5e2NvbnN0IF90b2RheUxvZ3M9KGdldExvZ3MoKXx8W10pLmZpbHRlcihsPT5sJiZsLmRhdGU9PT10b2RheSYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcodXNlcklkKSYmbC5zdWNjZXNzKTtpZihfdG9kYXlMb2dzLmxlbmd0aD4wKXtjb25zdCBfdGw9X3RvZGF5TG9nc1swXTtyZXN1bHQudG9kYXlTY29yZT1OdW1iZXIoX3RsLnRvdGFsR2Fpbil8fHJlc3VsdC50b2RheVNjb3JlO3Jlc3VsdC50b2RheURldGFpbD17c2lnbmluU2NvcmU6TnVtYmVyKF90bC5zaWduaW5TY29yZSl8fDAsYmxpbmRCb3hTY29yZTpOdW1iZXIoX3RsLmJsaW5kQm94U2NvcmUpfHwwLGludGVyYWN0U2NvcmU6TnVtYmVyKF90bC5pbnRlcmFjdFNjb3JlKXx8MH19fWNhdGNoKGUpe31jb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtpZih0b2RheUlkeD49MCl7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfX1yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Zm9yKGxldCBpPTY7aT49MDtpLS0pe2NvbnN0IGQ9bmV3IERhdGUoKTtkLnNldERhdGUoZC5nZXREYXRlKCktaSk7Y29uc3QgZHM9ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZW50cnk9bGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTtyZXN1bHQubGFzdDcucHVzaCh7ZGF0ZTpkcy5zbGljZSg1KSxzaWduZWQ6ISEoZW50cnkmJihlbnRyeS5zaWduU3RhdHVlPT0zfHxlbnRyeS5zaWduU3RhdHVlPT01fHxlbnRyeS5zaWduU3RhdHVlPT0wKSksaXNUb2RheTppPT09MH0pfX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i562+5Yiw54q25oCB6I635Y+W5aSx6LSlIn0KdHJ5e2NvbnN0IHRva2VuQ2hlY2s9YXdhaXQgY2hlY2tUb2tlbihhY2MsY2ZnKTtyZXN1bHQudG9rZW5WYWxpZD10b2tlbkNoZWNrLnZhbGlkO3Jlc3VsdC50b2tlblJlYXNvbj10b2tlbkNoZWNrLnJlYXNvbnx8bnVsbDtpZih0b2tlbkNoZWNrLnZhbGlkJiZ0b2tlbkNoZWNrLnVzZXJOYW1lJiYoIXJlc3VsdC51c2VyTmFtZXx8cmVzdWx0LnVzZXJOYW1lPT09IuacquefpeeUqOaItyIpKXJlc3VsdC51c2VyTmFtZT10b2tlbkNoZWNrLnVzZXJOYW1lfWNhdGNoKGUpe3Jlc3VsdC50b2tlblZhbGlkPXRydWV9CnJldHVybiByZXN1bHR9CgpmdW5jdGlvbiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhKXtpZighZGF0YSlyZXR1cm4gbnVsbDtpZih0eXBlb2YgZGF0YT09PSJzdHJpbmcifHx0eXBlb2YgZGF0YT09PSJudW1iZXIiKXJldHVybiBTdHJpbmcoZGF0YSk7aWYoQXJyYXkuaXNBcnJheShkYXRhKSlyZXR1cm4gZ2V0UG9zdElkRnJvbURhdGEoZGF0YVswXSk7Y29uc3QgZGlyZWN0PWRhdGEudXVpZHx8ZGF0YS50dXVpZHx8ZGF0YS5wb3N0SWR8fGRhdGEucG9zdGlkfHxkYXRhLmFydGljbGVJZHx8ZGF0YS5hcnRpY2xlSUR8fGRhdGEuaWR8fGRhdGEuZGF0YUlkfHxkYXRhLnRpZDtpZihkaXJlY3QpcmV0dXJuIFN0cmluZyhkaXJlY3QpO2Zvcihjb25zdCBrZXkgb2YgWyJyZWNvcmRzIiwibGlzdCIsInJvd3MiLCJkYXRhIiwicmVzdWx0Il0pe2NvbnN0IHY9ZGF0YVtrZXldO2NvbnN0IHBpZD1nZXRQb3N0SWRGcm9tRGF0YSh2KTtpZihwaWQpcmV0dXJuIHBpZH1yZXR1cm4gbnVsbH0KCi8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjCA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpe2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOmZhbHNlLHNpZ25pblNjb3JlOjAsYmxpbmRCb3hTY29yZTowLGludGVyYWN0U2NvcmU6MCx0b3RhbEdhaW46MCxjb250aW51ZURheXM6MCxlcnJvcjpudWxsLHN0ZXBzOltdfTt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IG1vbnRoPXRvZGF5LnNsaWNlKDAsNyk7CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdG9kYXlFbnRyeT0oaW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSl7cmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpfWVsc2V7bGV0IHNpZ25SZXM9bnVsbCxzaWduTXNnPSLmnKrnn6UiO2ZvcihsZXQgYXQ9MTthdDw9MzthdCsrKXtzaWduUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHt9LCcnLGNmZyl9LHt9KTtpZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKWJyZWFrO3NpZ25Nc2c9c2lnblJlcz8ubWVzc2FnZXx8IuacquefpSI7aWYoL+ivt+eojXznqI3lkI5856iN5YCZfOmikee5gXznuYHlv5l86YeN6K+VLy50ZXN0KHNpZ25Nc2cpJiZhdDwzKXthd2FpdCBuZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsKGF0KzEpKjIwMDApKTtjb250aW51ZX1icmVha31pZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKXtjb25zdCBpbmZvUmVzMj1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRlPShpbmZvUmVzMj8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduaW5TY29yZT10ZT8oTnVtYmVyKHRlLmludGVncmFsU2NvcmUpfHwwKTowO3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDmiJDlip8gKyIrcmVzdWx0LnNpZ25pblNjb3JlKX1lbHNle3RyeXtjb25zdCBjaGs9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBjZT0oY2hrPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYoY2UmJihjZS5zaWduU3RhdHVlPT0zfHxjZS5zaWduU3RhdHVlPT01fHxjZS5zaWduU3RhdHVlPT0wKSlyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIik7ZWxzZSByZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9fX0KfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlvILluLg6ICIrZSl9CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgbGlzdD1pbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXTtjb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2NvbnN0IHNpZ25Db3VudD1OdW1iZXIoaW5mb1Jlcz8uZGF0YT8uc2lnbkNvdW50KXx8MDtpZihzaWduQ291bnQ+PTMwKXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL3N1cHBsZW1lbnRQcml6ZT9zdXBwbGVtZW50RGF0ZT0iK3RvZGF5LHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse3N1cHBsZW1lbnREYXRlOnRvZGF5fSwnJyxjZmcpfSk7aWYoYmxpbmRSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5ibGluZEJveFNjb3JlPU51bWJlcihibGluZFJlcz8uZGF0YT8uaW50ZWdyYWx8fGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbFNjb3JlfHwwKTtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS6I635b6XICsiK3Jlc3VsdC5ibGluZEJveFNjb3JlKyIgKCIrKGJsaW5kUmVzPy5kYXRhPy5wcml6ZXNOYW1lfHwi56ev5YiGIikrIikiKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq6Kej6ZSBKCIrc2lnbkNvdW50KyIvMzApIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LlvILluLg6ICIrZSl9CmNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eXx8e307bGV0IHBvc3RJZD1udWxsOwppZihjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSl7dHJ5e2NvbnN0IHBvc3RSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3Rjb250ZW50OiLlvIDlv4PnmoTkuIDlpKkifSk7aWYocG9zdFJlcz8uY29kZT09IjEwMDAwIil7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKHBvc3RSZXMuZGF0YSk7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5byC5bi4OiAiK2UpfX0KaWYoIXBvc3RJZCl7dHJ5e2NvbnN0IGxpc3RSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tdW5pdHkvbWluZUFydGljbGVJbmZvP3VzZXJJZD0iK3VzZXJJZCsiJnBhZ2U9MSZwYWdlU2l6ZT0xMCIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2NvbnN0IHJhd0xpc3Q9QXJyYXkuaXNBcnJheShsaXN0UmVzPy5kYXRhKT9saXN0UmVzLmRhdGE6KGxpc3RSZXM/LmRhdGE/LnJlY29yZHN8fGxpc3RSZXM/LmRhdGE/Lmxpc3R8fFtdKTtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmF3TGlzdCk/cmF3TGlzdDpbXTtjb25zdCBtaW5lPWxpc3QuZmluZChpdD0+U3RyaW5nKGl0LnVzZXJJZHx8aXQuY3JlYXRlQnl8fGl0LnVpZHx8IiIpPT09U3RyaW5nKHVzZXJJZCkpO3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShtaW5lfHxsaXN0WzBdfHxsaXN0UmVzPy5kYXRhKX1jYXRjaChlKXt9fQppZihwb3N0SWQpe2lmKGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKXt0cnl7Y29uc3QgbGlrZVJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9zb2NpYWxDb21tdS9saWtlRmF2b3JpdGVJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdElkOlN0cmluZyhwb3N0SWQpLGtpbmRGbGFnOiIwIn0pO2lmKGxpa2VSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7miJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVDb21tZW50IT09ZmFsc2Upe3RyeXthd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tZW50SW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RpZDpTdHJpbmcocG9zdElkKSx1c2VySWQ6U3RyaW5nKHVzZXJJZCksY29tbWVudHM6IuWOieWusyIsc2VuZFRvczoiW1xuXG5dIn0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlrozmiJAiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZVNoYXJlIT09ZmFsc2Upe3RyeXtjb25zdCBzaGFyZVJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2FydGljbGUvc2hhcmUvIitwb3N0SWQsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2lmKHNoYXJlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5oiQ5YqfICsxIil9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2ludGVncmFsL2FkanVzdEJ5U2hhcmUiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlJiZwb3N0SWQpe3RyeXthd2FpdCBodHRwRGVsZXRlKCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1vbkFydGljbGUvZGVsZXRlQXJ0aWNsZT9hcnRpY2xlSWQ9Iitwb3N0SWQrIiZwb3N0VHlwZT0xIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7cmVzdWx0LnN0ZXBzLnB1c2goIuWKqOaAgeW3suWIoOmZpCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliKDpmaTlvILluLg6ICIrZSl9fX0KcmVzdWx0LnRvdGFsR2Fpbj1yZXN1bHQuc2lnbmluU2NvcmUrcmVzdWx0LmJsaW5kQm94U2NvcmUrcmVzdWx0LmludGVyYWN0U2NvcmU7cmVzdWx0LnN1Y2Nlc3M9dHJ1ZX1jYXRjaChlKXtyZXN1bHQuZXJyb3I9U3RyaW5nKGUpO3Jlc3VsdC5zdGVwcy5wdXNoKCLmiafooYzlvILluLg6ICIrZSl9cmV0dXJuIHJlc3VsdH0KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBWRUhJQ0xFX0FDVElPTl9URVhUPXtmaW5kOiLnn63mjInlr7vovaYiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga8iLGN1c2hpb246IuaJk+W8gOWdkOWeqyIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9OwpmdW5jdGlvbiB2ZWhpY2xlQ2hlY2tSZXMocmVzLG9rTXNnKXtpZihyZXMmJiFyZXMuZXJyb3ImJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZ307Y29uc3QgZXJyVGV4dD1TdHJpbmcoKHJlcyYmKHJlcy5lcnJvcnx8cmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IiIpLnRvTG93ZXJDYXNlKCk7aWYocmVzJiZyZXMuZXJyb3ImJi90aW1lb3V0fHRpbWVkIG91dHx0aW1lIG91dHzor7fmsYLotoXml7YvLnRlc3QoZXJyVGV4dCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZysi77yI5ZON5bqU6LaF5pe25L2G6L2m6L6G6YCa5bi45bey5omn6KGM77yM5Y+v5LiL5ouJ5Yi35paw56Gu6K6k77yJIn07cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6KHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fChyZXMmJnJlcy5lcnJvcil8fCLmjIfku6TkuIvlj5HlpLHotKUiLGNvZGU6cmVzJiZyZXMuY29kZX19CmFzeW5jIGZ1bmN0aW9uIHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKXt0cnl7Y29uc3QgYz1jZmd8fGdldENmZygpO2xldCB2aW49YWNjLnZpbk5vfHwiIjtpZighdmluKXtjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGMpO2lmKCFsaXN0fHwhbGlzdC5sZW5ndGgpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquiOt+WPluWIsOe7keWumui9pui+hihWSU4p77yM6K+356Gu6K6k6LSm5Y+35bey57uR5a6a6L2m6L6GIn07dmluPWxpc3RbMF0udmluTm99Y29uc3QgYmFzZT1iYXNlSGVhZGVycyhhY2MpO2lmKGFjdGlvbj09PSJmaW5kIil7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LCIiLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sLyIrdmluLGgpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlr7vovabmjIfku6Tlt7LkuIvlj5HvvIzovabovoblupTpl6rnga/mj5DnpLoiKX1pZihhY3Rpb249PT0ibG91ZEZpbmQiKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtwYXJhbToiNCIsdmluOnZpbn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbFYyIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLpuKPnrJvpl6rnga/mjIfku6Tlt7LkuIvlj5EiKX1pZihhY3Rpb249PT0iY3VzaGlvbiIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe2NvbW1vbmQ6IjI4Iixjb21tb25kUGFyYW06IjEiLHZjdTp2aW4sdmVyc2lvbjoidjIifSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvcHJvcGVydHlUd28vb25lIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlvIDlnZDlnqvmjIfku6Tlt7LkuIvlj5HvvIzlnZDlnqvlupTlvLnotbciKX1pZihhY3Rpb249PT0idW5sb2NrInx8YWN0aW9uPT09ImxvY2siKXtjb25zdCB2S2V5PShjLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCk7aWYoIXZLZXkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuWwmuacqumFjee9ruS6keerr+aOp+i9puWvhumSpe+8muivt+WIsOOAjOiuvue9ri3nrb7lkI3lr4bpkqXphY3nva7jgI3loavlhpnkupHnq6/mjqfovaZBRVPlr4bpkqXlubbkv53lrZjlkI7lho3kvb/nlKjlvIAv5YWz6ZSBIn07aWYoIS9eWzAtOWEtZkEtRl17MzJ9JC8udGVzdCh2S2V5KSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5LqR56uv5o6n6L2m5a+G6ZKl5qC85byP6ZSZ6K+v77yI5bqU5Li6MzLkvY3ljYHlha3ov5vliLbvvInvvIzor7fliLDorr7nva7pobXmoLjlr7nlkI7kv53lrZgifTtjb25zdCBsb2NrRmxhZz1hY3Rpb249PT0idW5sb2NrIj8iMSI6IjAiO2NvbnN0IHBsYWluPSd7XG4gICJsb2NrRmxhZyIgOiAiJytsb2NrRmxhZysnIixcbiAgInZpbk5vIiA6ICInK3ZpbisnIlxufSc7Y29uc3Qgc2VjcmV0PWFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW4sdktleSk7Y29uc3Qgc2VuZEJvZHk9SlNPTi5zdHJpbmdpZnkoe3NlY3JldDpzZWNyZXR9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30scGxhaW4sYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L25ldHdvcmsvdW5sb2NrIixoLHNlbmRCb2R5LDI1MDAwKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcyxhY3Rpb249PT0idW5sb2NrIj8i5LqR56uv5byA6ZSB5oyH5Luk5bey5LiL5Y+RIjoi5LqR56uv5YWz6ZSB5oyH5Luk5bey5LiL5Y+RIil9cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquefpeaTjeS9nOexu+WeizogIithY3Rpb259fWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxtZXNzYWdlOiLmjqfliLblvILluLg6ICIrU3RyaW5nKGUpfX19Cgphc3luYyBmdW5jdGlvbiBiYXJrUHVzaChiYXJrS2V5LHRpdGxlLGJvZHkpe3RyeXtsZXQgcz1TdHJpbmcoYmFya0tleXx8IiIpLnRyaW0oKS5yZXBsYWNlKC9cLyskLywiIik7cz1zLnJlcGxhY2UoL15odHRwcz86XC9cL2FwaVwuZGF5XC5hcHBcLy9pLCIiKTtpZighcylyZXR1cm57c2tpcHBlZDp0cnVlfTtsZXQgYmFzZT0iaHR0cHM6Ly9hcGkuZGF5LmFwcCIsa2V5PXM7Y29uc3QgbT1zLm1hdGNoKC9eKGh0dHBzPzpcL1wvW14vXSspXC8oLispJC9pKTtpZihtKXtiYXNlPW1bMV07a2V5PW1bMl19a2V5PWtleS5yZXBsYWNlKC9eXC8rLywiIik7Y29uc3QgdT1iYXNlKyIvIitlbmNvZGVVUklDb21wb25lbnQoa2V5KSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGJvZHkpKyI/Z3JvdXA9WkVFSE8mc291bmQ9YmlyZHNvbmciO3JldHVybiBhd2FpdCBodHRwR2V0KHUse30pfWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoZSl9fX0KCi8qID09PT09PT09PT09PT09PT09IOS7o+eQhuaooeW8j++8iOaMh+WQkeWOn+iEmuacrCB6ZWVoby5ib3gg5ZCO56uv77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHByb3h5RmV0Y2gocGF0aCxvcHRzKXtjb25zdCByYXdCYXNlPWdldENmZygpLnNlcnZlckJhc2UucmVwbGFjZSgvXC8rJC8sIiIpO2NvbnN0IGJhc2U9KHdpbmRvdy5fX1BBTkVMX01PREVfXyYmIXJhd0Jhc2UpPyIiOnJhd0Jhc2U7Y29uc3Qgcj1hd2FpdCBmZXRjaChiYXNlK3BhdGgsb3B0c3x8e30pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19CmZ1bmN0aW9uIHByb3h5UG9zdChwYXRoLGJvZHkpe3JldHVybiBwcm94eUZldGNoKHBhdGgse21ldGhvZDoiUE9TVCIsaGVhZGVyczp7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb24ifSxib2R5OkpTT04uc3RyaW5naWZ5KGJvZHl8fHt9KX0pfQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsbGltaXQpe2NvbnN0IG91dD1uZXcgQXJyYXkoYWNjb3VudHMubGVuZ3RoKTtsZXQgaT0wO2FzeW5jIGZ1bmN0aW9uIHdvcmtlcigpe3doaWxlKGk8YWNjb3VudHMubGVuZ3RoKXtjb25zdCBpZHg9aSsrO3RyeXtvdXRbaWR4XT1hd2FpdCBmZXRjaEFjY291bnREYXRhKGFjY291bnRzW2lkeF0sY2ZnKX1jYXRjaChlKXtvdXRbaWR4XT17dXNlck5hbWU6YWNjb3VudHNbaWR4XS51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjY291bnRzW2lkeF0udXNlcklkLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX19fWNvbnN0IG49TWF0aC5tYXgoMSxNYXRoLm1pbihsaW1pdHx8MyxhY2NvdW50cy5sZW5ndGgpKTthd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKHtsZW5ndGg6bn0sd29ya2VyKSk7cmV0dXJuIG91dH0KCmNvbnN0IEJhY2tlbmQ9ewogIGFzeW5jIHNlbmRDb2RlKHBob25lKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NlbmQtY29kZSIse3Bob25lOnBob25lfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IumqjOivgeeggeW3suWPkemAgSI6IuWPkemAgeWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvYXV0aENvZGUvIitlbmNvZGVVUklDb21wb25lbnQocGhvbmUpOwogICAgY29uc3QgZD1hd2FpdCBodHRwR2V0KHVybCx7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiR0VUIix7fSwiIixjZmcpfSk7CiAgICByZXR1cm57b2s6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiLG1lc3NhZ2U6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiPyLpqozor4HnoIHlt7Llj5HpgIHvvIzor7fmn6XmlLbnn63kv6EiOigoZCYmKGQubWVzc2FnZXx8ZC5tc2cpKXx8IuWPkemAgeWksei0pSIpfTsKICB9LAogIGFzeW5jIHBob25lTG9naW4ocGhvbmUsY29kZSxiYXNpY0F1dGgpewogICAgY29uc3QgYmFzaWM9U3RyaW5nKGJhc2ljQXV0aHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eQmFzaWNccysvaSwiIik7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9waG9uZS1sb2dpbiIse3Bob25lOnBob25lLGNvZGU6Y29kZSxiYXNpY0F1dGg6YmFzaWN9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i55m75b2V5oiQ5YqfIjoi55m75b2V5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBwYXlsb2FkPXtwaG9uZTpwaG9uZSxhdXRoQ29kZTpjb2RlfTsKICAgIGNvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3VzZXIvbG9naW5CeVBob25lIjsKICAgIGNvbnN0IGhkcj17IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiUE9TVCIse30scGF5bG9hZCxjZmcpfTsKICAgIGlmKGJhc2ljKWhkclsiQXV0aG9yaXphdGlvbiJdPSJCYXNpYyAiK2Jhc2ljOwogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KHVybCxoZHIscGF5bG9hZCwyMDAwMCk7CiAgICBjb25zdCB0b2tlbkluZm89cmVzJiZyZXMuZGF0YSYmcmVzLmRhdGEudG9rZW5JbmZvO2NvbnN0IGFjY2Vzc1Rva2VuPXRva2VuSW5mbyYmU3RyaW5nKHRva2VuSW5mby5hY2Nlc3NfdG9rZW58fCIiKTsKICAgIGlmKCFyZXN8fFN0cmluZyhyZXMuY29kZSkhPT0iMTAwMDAifHwhYWNjZXNzVG9rZW4pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IueZu+W9leWksei0pe+8miIrKChyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwi6aqM6K+B56CB5pyJ6K+v5oiW5bey6L+H5pyfIil9OwogICAgbGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIjsKICAgIHRyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwiIixjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIithY2Nlc3NUb2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IMH0pO2lmKGluZm9SZXMmJlN0cmluZyhpbmZvUmVzLmNvZGUpPT09IjEwMDAwIiYmaW5mb1Jlcy5kYXRhKXt1c2VySWQ9U3RyaW5nKGluZm9SZXMuZGF0YS5pZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhpbmZvUmVzLmRhdGEubmlja05hbWV8fCIiKTt9fWNhdGNoKGUpe30KICAgIGNvbnN0IGxpc3Q9Z2V0QWNjb3VudHMoKTtsZXQgcmVwbGFjZWQ9ZmFsc2U7CiAgICBmb3IobGV0IGk9MDtpPGxpc3QubGVuZ3RoO2krKyl7aWYobGlzdFtpXSYmKFN0cmluZyhsaXN0W2ldLnRva2VufHwiIik9PT1hY2Nlc3NUb2tlbnx8KGxpc3RbaV0udXNlcklkJiZ1c2VySWQmJlN0cmluZyhsaXN0W2ldLnVzZXJJZCk9PT11c2VySWQpKSl7bGlzdFtpXS50b2tlbj1hY2Nlc3NUb2tlbjtpZih1c2VySWQpbGlzdFtpXS51c2VySWQ9dXNlcklkO2lmKHVzZXJOYW1lKWxpc3RbaV0udXNlck5hbWU9dXNlck5hbWU7cmVwbGFjZWQ9dHJ1ZTticmVhazt9fQogICAgY29uc3QgbmV3QWNjPXt1c2VyTmFtZTp1c2VyTmFtZXx8cGhvbmUsdXNlcklkOnVzZXJJZCx0b2tlbjphY2Nlc3NUb2tlbixiYXJrS2V5OiIiLHVzZXJBZ2VudDoiIn07CiAgICBpZighcmVwbGFjZWQpbGlzdC5wdXNoKG5ld0FjYyk7CiAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICByZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOnJlcGxhY2VkPyLnmbvlvZXmiJDlip/vvIzlt7Lmm7TmlrDor6XotKblj7ciOiLnmbvlvZXmiJDlip/vvIzlt7Lmt7vliqDotKblj7cifTsKICB9LAogIGFzeW5jIGdldERhc2hib2FyZCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9kYXRhIik7CiAgICAgIGlmKGQmJmQuYWNjb3VudHMpcmV0dXJue2FjY291bnRzOmQuYWNjb3VudHMsdGltZXN0YW1wOmQudGltZXN0YW1wfHxuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksY29uZmlnOmQuY29uZmlnfHxudWxsLG9rOnRydWV9OwogICAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5Luj55CG5pyN5Yqh5peg5ZON5bqUIixyYXc6ZH07CiAgICB9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBkYXRhPWF3YWl0IGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLDMpOwogICAgcmV0dXJue2FjY291bnRzOmRhdGEsdGltZXN0YW1wOm5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxvazp0cnVlfTsKICB9LAogIGFzeW5jIHJ1blNpZ25pbih1c2VySWQsYWxsKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3J1bi1zaWduaW4iLGFsbD97YWxsOnRydWV9Ont1c2VySWQ6dXNlcklkfSk7aWYoZCYmZC5yZXN1bHRzKXJldHVybntvazp0cnVlLHJlc3VsdHM6ZC5yZXN1bHRzfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5omn6KGM5aSx6LSlIn19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCByZXN1bHRzPVtdO2NvbnN0IHRhcmdldHM9YWxsP2FjY291bnRzOmFjY291bnRzLmZpbHRlcihhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpOwogICAgaWYoIXRhcmdldHMubGVuZ3RoKXJldHVybntvazp0cnVlLHJlc3VsdHM6W119OwogICAgZm9yKGNvbnN0IGFjYyBvZiB0YXJnZXRzKXtjb25zdCByPWF3YWl0IHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyk7cmVzdWx0cy5wdXNoKHIpO2NvbnN0IF9kPW5ldyBEYXRlKCk7Y29uc3QgX2RzPV9kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF9kLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl9kcyx0eXBlOiJzaWduaW4iLHVzZXJOYW1lOnIudXNlck5hbWUsdXNlcklkOnIudXNlcklkLHN1Y2Nlc3M6ci5zdWNjZXNzLHRvdGFsR2FpbjpyLnRvdGFsR2FpbixzaWduaW5TY29yZTpyLnNpZ25pblNjb3JlLGJsaW5kQm94U2NvcmU6ci5ibGluZEJveFNjb3JlLGludGVyYWN0U2NvcmU6ci5pbnRlcmFjdFNjb3JlLGNvbnRpbnVlRGF5czpyLmNvbnRpbnVlRGF5cyxlcnJvcjpyLmVycm9yLHN0ZXBzOnIuc3RlcHN9KTtpZihyLnN1Y2Nlc3MmJmFjYy5iYXJrS2V5JiZTdHJpbmcoYWNjLmJhcmtLZXkpLnRyaW0oKSl7dHJ5e2F3YWl0IGJhcmtQdXNoKGFjYy5iYXJrS2V5LCLmnoHmoLjnrb7liLDmiJDlip8gwrcgIisoci51c2VyTmFtZXx8IiIpLCLku4rml6XojrflvpcgIityLnRvdGFsR2FpbisiIOWIhu+8iOetvuWIsCIrci5zaWduaW5TY29yZSsiIC8g55uy55uSIityLmJsaW5kQm94U2NvcmUrIiAvIOS6kuWKqCIrci5pbnRlcmFjdFNjb3JlKyLvvInvvIzov57nrb4gIityLmNvbnRpbnVlRGF5cysiIOWkqSIpfWNhdGNoKGUpe319fQogICAgcmV0dXJue29rOnRydWUscmVzdWx0c307CiAgfSwKICBhc3luYyB2ZWhpY2xlQ3RybCh1c2VySWQsYWN0aW9uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbCIse3VzZXJJZDp1c2VySWQsYWN0aW9uOmFjdGlvbn0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLmjIfku6Tlt7LkuIvlj5EiOiLmjIfku6TlpLHotKUiKX19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtsZXQgYWNjPWFjY291bnRzLmZpbmQoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTtpZighYWNjJiZhY2NvdW50cy5sZW5ndGgpYWNjPWFjY291bnRzWzBdO2lmKCFhY2MpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquaJvuWIsOi0puWPt++8jOivt+WFiOWcqOiuvue9rumhtea3u+WKoCJ9O2lmKCFWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl0pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IumdnuazleaTjeS9nOexu+WeiyJ9O2NvbnN0IHI9YXdhaXQgdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpO2NvbnN0IF92ZD1uZXcgRGF0ZSgpO2NvbnN0IF92ZHM9X3ZkLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfdmQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfdmQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl92ZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl92ZHMsdHlwZToidmVoaWNsZSIsYWN0aW9uOmFjdGlvbixhY3Rpb25UZXh0OlZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXXx8Iui9pui+huaOp+WItiIsdXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOiEhci5vayxtZXNzYWdlOnIubWVzc2FnZXx8IiIsZXJyb3I6ci5vaz8iIjooci5tZXNzYWdlfHwi5oyH5Luk5aSx6LSlIil9KTtyZXR1cm4gcjsKICB9LAogIGFzeW5jIGdldExvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZ2V0LWxvZ3MiKTtyZXR1cm4gZCYmZC5sb2dzP2QubG9nczpbXX1yZXR1cm4gZ2V0TG9ncygpfSwKICBhc3luYyBjbGVhckxvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9jbGVhci1sb2dzIik7cmV0dXJuICEhZC5va31yZXR1cm4gY2xlYXJMb2dzKCl9LAogIGFzeW5jIHNhdmVDb25maWcoYyl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1jb25maWciLGMpO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVDZmcoYyl9LAogIGFzeW5jIHNhdmVBY2NvdW50cyhsaXN0KXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWFjY291bnRzIix7YWNjb3VudHM6bGlzdH0pO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVBY2NvdW50cyhsaXN0KX0sCiAgYXN5bmMgZ2V0VXNlcmlkKHRva2VuKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9nZXQtdXNlcmlkIix7dG9rZW46dG9rZW59KTtyZXR1cm57b2s6ISFkLm9rLHVzZXJJZDpkLnVzZXJJZHx8IiIsdXNlck5hbWU6ZC51c2VyTmFtZXx8IiIsZXJyb3I6ZC5lcnJvcnx8IiJ9fXJldHVybiBnZXRVc2VyaWRCeVRva2VuKHRva2VuLGdldENmZygpKX0sCiAgYXN5bmMgZ2V0Q29uZmlnKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2NvbmZpZyIpO2lmKGQmJmQuY29uZmlnKXJldHVybntvazp0cnVlLGNvbmZpZzpkLmNvbmZpZ307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuiOt+WPlumFjee9ruWksei0pSJ9fXJldHVybntvazp0cnVlLGNvbmZpZzpnZXRDZmcoKX19LAogIGFzeW5jIGdldEFjY291bnRzRnVsbCgpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9hY2NvdW50cyIpO3JldHVybiBBcnJheS5pc0FycmF5KGQmJmQuYWNjb3VudHMpP2QuYWNjb3VudHM6W119cmV0dXJuIGdldEFjY291bnRzKCl9LAogIGFzeW5jIGJhY2t1cCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2JhY2t1cCIpO3JldHVybiBkJiZkLm9rP2Q6bnVsbH0KICAgIHJldHVybntvazp0cnVlLGFwcDoi5p6B5qC4WkVFSE8iLHR5cGU6InplZWhvX2JhY2t1cCIsdmVyc2lvbjpBUFBfVkVSU0lPTix0aW1lOmZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxhY2NvdW50czpnZXRBY2NvdW50cygpLGNvbmZpZzpnZXRDZmcoKX0KICB9LAogIGFzeW5jIHJlc3RvcmVCYWNrdXAoanNvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9pbXBvcnQiLHtqc29uOmpzb259KTtyZXR1cm4gZHx8e29rOmZhbHNlLGVycm9yOiLlkI7nq6/ml6Dlk43lupQifX0KICAgIHRyeXsKICAgICAgY29uc3QgYj10eXBlb2YganNvbj09PSJzdHJpbmciP0pTT04ucGFyc2UoanNvbik6anNvbjsKICAgICAgaWYoIWJ8fChiLnR5cGUhPT0iemVlaG9fYmFja3VwIiYmIUFycmF5LmlzQXJyYXkoYi5hY2NvdW50cykpKXJldHVybntvazpmYWxzZSxlcnJvcjoi5aSH5Lu95qC85byP5LiN5q2j56GuIn07CiAgICAgIGNvbnN0IGxpc3Q9KGIuYWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5fHwiIiksdXNlckFnZW50OmEudXNlckFnZW50fHwiIn0pKTsKICAgICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgICBpZihiLmNvbmZpZyYmdHlwZW9mIGIuY29uZmlnPT09Im9iamVjdCIpewogICAgICAgIGNvbnN0IGN1cj1nZXRDZmcoKTsKICAgICAgICBzYXZlQ2ZnKHsKICAgICAgICAgIGFwcDp7YXBwSWQ6Yi5jb25maWcuYXBwPy5hcHBJZHx8Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuYXBwPy5hcHBTZWNyZXR8fGN1ci5hcHAuYXBwU2VjcmV0fSwKICAgICAgICAgIGg1OnthcHBJZDpiLmNvbmZpZy5oNT8uYXBwSWR8fGN1ci5oNS5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuaDU/LmFwcFNlY3JldHx8Y3VyLmg1LmFwcFNlY3JldH0sCiAgICAgICAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sCiAgICAgICAgICB2ZWhpY2xlQWVzS2V5OlN0cmluZyhiLmNvbmZpZy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpLAogICAgICAgICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhiLmNvbmZpZy5hdXRvUmVmcmVzaFNlYyksCiAgICAgICAgICBzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlCiAgICAgICAgfSk7CiAgICAgIH0KICAgICAgcmV0dXJue29rOnRydWUsY291bnQ6bGlzdC5sZW5ndGh9OwogICAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQogIH0sCiAgLyogLS0tLSB2Mi4xNC45IOaWsOWinuWQjuerr+iDveWKm++8iOS7heS7o+eQhuaooeW8j++8iSAtLS0tICovCiAgYXN5bmMgaW50ZWdyYWwodXNlcklkLHBhZ2UpewogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvaW50ZWdyYWw/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iuenr+WIhuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHN1cHBsZW1lbnQoYWN0aW9uLHVzZXJJZCxwYXJhbXMpewogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGxldCBxPSIvYXBpL3N1cHBsZW1lbnQ/YWN0aW9uPSIrZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbikrIiZ1c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7CiAgICAgIHBhcmFtcz1wYXJhbXN8fHt9O09iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrPT57cSs9IiYiK2VuY29kZVVSSUNvbXBvbmVudChrKSsiPSIrZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1trXSl9KTsKICAgICAgcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSkKICAgIH0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6KGl562+5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgdmVoaWNsZU1vbml0b3IodXNlcklkLHZpbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtsZXQgcT0iL2FwaS92ZWhpY2xlLW1vbml0b3I/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLovabovobnm5Hmjqfku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgdmVoaWNsZUNvbnRyb2xFeHQoYm9keSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbC1leHQiLGJvZHkpfQogICAgcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6Iui9puaOp+aJqeWxleS7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBpbmZvQ2VudGVyKHVzZXJJZCx2aW4pewogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvaW5mby1jZW50ZXI/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLkv6Hmga/kuK3lv4Pku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0KfTsKLyogPT09PT09PT09PT09PT09PT0g6Z2i5p2/5pWw5o2u5ZCM5q2l77yI6Z2i5p2/5qih5byP77ya6K6+572u6aG15LuO6ISa5pys5ZCO56uv6K+76LSm5Y+35LiO6YWN572u77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5UmVtb3RlQ2ZnKGMpewogIGlmKCFjfHx0eXBlb2YgYyE9PSJvYmplY3QiKXJldHVybjsKICBjb25zdCBsb2NhbD1nZXRDZmcoKTsKICBzYXZlQ2ZnKHsKICAgIGFwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxsb2NhbC5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fGxvY2FsLmFwcC5hcHBTZWNyZXR9LAogICAgaDU6e2FwcElkOmMuaDU/LmFwcElkfHxsb2NhbC5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxsb2NhbC5oNS5hcHBTZWNyZXR9LAogICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKSwKICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksCiAgICBzZXJ2ZXJCYXNlOmxvY2FsLnNlcnZlckJhc2UsCiAgICBhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsCiAgICBhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLAogICAgdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUKICB9KTsKfQpsZXQgcGFuZWxTeW5jaW5nPWZhbHNlOwphc3luYyBmdW5jdGlvbiBlbnN1cmVQYW5lbERhdGEoZm9yY2UpewogIGlmKCFpc1Byb3h5TW9kZSgpfHxsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXJldHVybjsKICBpZihwYW5lbFN5bmNpbmcpcmV0dXJuOwogIGlmKCFmb3JjZSYmU1RBVEUucGFuZWxMb2FkZWQpcmV0dXJuOwogIHBhbmVsU3luY2luZz10cnVlOwogIHRyeXsKICAgIGNvbnN0IFtjLGFdPWF3YWl0IFByb21pc2UuYWxsKFtCYWNrZW5kLmdldENvbmZpZygpLEJhY2tlbmQuZ2V0QWNjb3VudHNGdWxsKCldKTsKICAgIGlmKGEmJmEubGVuZ3RoKXtTVEFURS5wYW5lbEFjY291bnRzPWF9CiAgICBpZihjJiZjLm9rJiZjLmNvbmZpZylhcHBseVJlbW90ZUNmZyhjLmNvbmZpZyk7CiAgICBTVEFURS5wYW5lbExvYWRlZD10cnVlOwogIH1jYXRjaChlKXt9CiAgcGFuZWxTeW5jaW5nPWZhbHNlOwp9Ci8qID09PT09PT09PT09PT09PT09IOWbvuaghyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBJPXsKY2hlY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDYgOSAxN2wtNS01Ii8+PC9zdmc+JywKeDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPicsCnphcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDggMHY0Ii8+PC9zdmc+JywKdW5sb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgNy41LTEuNyIvPjwvc3ZnPicsCmJlbGw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE4IDhhNiA2IDAgMSAwLTEyIDBjMCA3LTMgOS0zIDloMThzLTMtMi0zLTkiLz48cGF0aCBkPSJNMTMuNyAyMWEyIDIgMCAwIDEtMy40IDAiLz48L3N2Zz4nLAp2b2w6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTExIDUgNiA5SDJ2Nmg0bDUgNFY1eiIvPjxwYXRoIGQ9Ik0xNS41IDguNWE1IDUgMCAwIDEgMCA3TTE4LjUgNS41YTkgOSAwIDAgMSAwIDEzIi8+PC9zdmc+JywKc2VhdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA0aDE0djdhNCA0IDAgMCAxLTQgNEg5YTQgNCAwIDAgMS00LTRWNHoiLz48cGF0aCBkPSJNOSAxNXY1aDZ2LTUiLz48L3N2Zz4nLApwaW46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYzAgNi04IDEyLTggMTJzLTgtNi04LTEyYTggOCAwIDAgMSAxNiAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4nLAp0aXJlOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMy41Ii8+PHBhdGggZD0iTTEyIDN2NS41TTEyIDE1LjVWMjFNMyAxMmg1LjVNMTUuNSAxMkgyMSIvPjwvc3ZnPicsCmJvbHQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCnRoZXJtbzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMTQuNzZWNWEyIDIgMCAxIDAtNCAwdjkuNzZhNCA0IDAgMSAwIDQgMHoiLz48L3N2Zz4nLApjYWw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMyIvPjxwYXRoIGQ9Ik0xNiAydjRNOCAydjRNMyAxMGgxOCIvPjwvc3ZnPicsCmNhcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMyA2LjUgNy41QTIgMiAwIDAgMSA4LjQgNmg3LjJhMiAyIDAgMCAxIDEuOSAxLjVMMTkgMTMiLz48cGF0aCBkPSJNNCAxM2gxNmExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxLTEgMWgtMWEyIDIgMCAxIDEtNCAwSDlhMiAyIDAgMSAxLTQgMEg0YTEgMSAwIDAgMS0xLTF2LTNhMSAxIDAgMCAxIDEtMXoiLz48L3N2Zz4nLApzY29vdGVyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPicsCnBsdWc6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMnY2TTE1IDJ2Nk03IDhoMTB2NGE1IDUgMCAwIDEtMTAgMFY4ek0xMiAxN3Y1Ii8+PC9zdmc+JywKY2xvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxwYXRoIGQ9Ik0xMiA3djVsMyAzIi8+PC9zdmc+JywKd2lmaTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMi41YTEwIDEwIDAgMCAxIDE0IDBNOC41IDE2YTUgNSAwIDAgMSA3IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4nLAphbGVydDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOXY0TTEyIDE3aC4wMSIvPjxwYXRoIGQ9Ik0xMC4zIDMuOSAxLjggMThhMiAyIDAgMCAwIDEuNyAzaDE3YTIgMiAwIDAgMCAxLjctM0wxMy43IDMuOWEyIDIgMCAwIDAtMy40IDB6Ii8+PC9zdmc+JywKd2FybjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMyAyIDIxaDIwTDEyIDN6Ii8+PHBhdGggZD0iTTEyIDEwdjVNMTIgMThoLjAxIi8+PC9zdmc+JywKa3Y6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiByeD0iMyIvPjxwYXRoIGQ9Ik03IDloM00xNCAxNWgzTTEwIDloLjAxTTE3IDE1aC4wMSIvPjwvc3ZnPicsCmtleTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI4IiBjeT0iMTUiIHI9IjQuNSIvPjxwYXRoIGQ9Ik0xMS4yIDExLjggMjAgM00xNiA3bDMgM00xMyAxMGwyIDIiLz48L3N2Zz4nLAp1c2VyczonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI5IiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik0yIDIxYTcgNyAwIDAgMSAxNCAwTTE2IDQuNmE0IDQgMCAwIDEgMCA2LjhNMTkgMjFhNi41IDYuNSAwIDAgMC0zLTUuNSIvPjwvc3ZnPicsCm1hcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAzIDMuNSA1djE2TDkgMTlsNiAyIDUuNS0yVjNMMTUgNSA5IDN6Ii8+PHBhdGggZD0iTTkgM3YxNk0xNSA1djE2Ii8+PC9zdmc+Jwp9OwoKLyogPT09PT09PT09PT09PT09PT0g5Z+656GAIFVJID09PT09PT09PT09PT09PT09ICovCmxldCB0b2FzdFRpbWVyPW51bGw7CmZ1bmN0aW9uIHRvYXN0KG1zZyx0eXBlKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidG9hc3QiKTtlbC5jbGFzc05hbWU9dHlwZXx8ImluZm8iO2VsLmlubmVySFRNTD0odHlwZT09PSJlcnIiP0kueDp0eXBlPT09Im9rIj9JLmNoZWNrOkkud2lmaSkrJzxzcGFuPicrZXNjKG1zZykrJzwvc3Bhbj4nO3JlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+ZWwuY2xhc3NMaXN0LmFkZCgic2hvdyIpKTtjbGVhclRpbWVvdXQodG9hc3RUaW1lcik7dG9hc3RUaW1lcj1zZXRUaW1lb3V0KCgpPT5lbC5jbGFzc0xpc3QucmVtb3ZlKCJzaG93IiksMjYwMCl9Ci8qIHYyLjE0LjEwIOS/ruWkje+8muaXp+eJiOaKiuWbnuiwg+WHveaVsOa6kOeggeebtOaOpeaLvOi/myBvbmNsaWNrIOWxnuaAp++8jGFzeW5jIOWbnuiwg+WGheeahOWPjOW8leWPt+S8muaIquaWrSBIVE1MIOWxnuaAp++8jAogICDlr7zoh7TooaXnrb4v5YWR5o2i6KGl562+5Y2hL+mYsuebl+W4g+aOp+etieOAjOehruWumuOAjeaMiemSrueCueWHu+aXoOWPjeW6lOOAguaUueS4uuaaguWtmOWbnuiwg+OAgeaMiemSruiwg+eUqOWFqOWxgCBjb25maXJtWWVzKCkgKi8KbGV0IF9fY29uZmlybUFjdD1udWxsOwpmdW5jdGlvbiBjb25maXJtRGlhbG9nKHRpdGxlLGRlc2Msb25ZZXMseWVzVHh0KXtfX2NvbmZpcm1BY3Q9b25ZZXM7Y29uc3QgbGF5ZXI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpO2xheWVyLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY29uZmlybSI+PGRpdiBjbGFzcz0iY3QiPicrZXNjKHRpdGxlKSsnPC9kaXY+PGRpdiBjbGFzcz0iY2QiPicrZGVzYysnPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKSI+5Y+W5raIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0ieWVzIiBvbmNsaWNrPSJjb25maXJtWWVzKCkiPicrZXNjKHllc1R4dHx8IuehruWumiIpKyc8L2J1dHRvbj48L2Rpdj48L2Rpdj4nO2xheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpfQpmdW5jdGlvbiBjb25maXJtWWVzKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYT1fX2NvbmZpcm1BY3Q7X19jb25maXJtQWN0PW51bGw7aWYoYT09bnVsbClyZXR1cm47dHJ5e2lmKHR5cGVvZiBhPT09ImZ1bmN0aW9uIil7YSgpfWVsc2UgaWYodHlwZW9mIGE9PT0ic3RyaW5nIil7Y29uc3Qgcj1uZXcgRnVuY3Rpb24oInJldHVybiAoIithKyIpIikoKTtpZih0eXBlb2Ygcj09PSJmdW5jdGlvbiIpcigpfX1jYXRjaChlKXt9fQpmdW5jdGlvbiBjbG9zZUNvbmZpcm0oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIikuY2xhc3NMaXN0LmFkZCgiaGlkZGVuIil9CmZ1bmN0aW9uIG9wZW5TaGVldCh0aXRsZSxpY29uLGh0bWwpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldFRpdGxlIikuaW5uZXJIVE1MPWljb24rJzxzcGFuPicrZXNjKHRpdGxlKSsnPC9zcGFuPic7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0Qm9keSIpLmlubmVySFRNTD1odG1sO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSJoaWRkZW4ifQpmdW5jdGlvbiBjbG9zZVNoZWV0KCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9IiJ9CmZ1bmN0aW9uIGZtdFRpbWUoaXNvKXt0cnl7Y29uc3QgZD1uZXcgRGF0ZShpc28pO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTtyZXR1cm4gZC5nZXRGdWxsWWVhcigpKyItIitwKGQuZ2V0TW9udGgoKSsxKSsiLSIrcChkLmdldERhdGUoKSkrIiAiK3AoZC5nZXRIb3VycygpKSsiOiIrcChkLmdldE1pbnV0ZXMoKSkrIjoiK3AoZC5nZXRTZWNvbmRzKCkpfWNhdGNoKGUpe3JldHVybiIifX0KCi8qID09PT09PT09PT09PT09PT09IOmhtemdouWIh+aNoiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzd2l0Y2hUYWIodGFiKXsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIudGFiIikuZm9yRWFjaCh0PT50LmNsYXNzTGlzdC50b2dnbGUoIm9uIix0LmRhdGFzZXQudGFiPT09dGFiKSk7CiAgY29uc3QgcGFnZXM9e2hvbWU6InBhZ2VIb21lIixwb2ludHM6InBhZ2VQb2ludHMiLHZlaGljbGU6InBhZ2VWZWhpY2xlIixsb2dzOiJwYWdlTG9ncyIsY2ZnOiJwYWdlQ2ZnIn07CiAgT2JqZWN0LmtleXMocGFnZXMpLmZvckVhY2goaz0+e2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhZ2VzW2tdKTtpZihlbCllbC5jbGFzc0xpc3QudG9nZ2xlKCJoaWRkZW4iLGshPT10YWIpfSk7CiAgaWYodGFiPT09InBvaW50cyIpcmVuZGVyUG9pbnRzKCk7CiAgaWYodGFiPT09InZlaGljbGUiKXJlbmRlclZlaGljbGVQYWdlKCk7CiAgaWYodGFiPT09ImxvZ3MiKXJlbmRlckxvZ3MoKTsKICBpZih0YWI9PT0iY2ZnIilyZW5kZXJDZmcoKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6Ieq5Yqo5Yi35pawID09PT09PT09PT09PT09PT09ICovCmxldCByZWZyZXNoVGltZXI9bnVsbCxyZWZyZXNoTGVmdD02MDsKZnVuY3Rpb24gc3RhcnRBdXRvUmVmcmVzaChzZWMpe3N0b3BBdXRvUmVmcmVzaCgpO3JlZnJlc2hMZWZ0PXNlY3x8Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWM7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaFRpbWVyPXNldEludGVydmFsKCgpPT57cmVmcmVzaExlZnQtLTtpZihyZWZyZXNoTGVmdDw9MCl7cmVmcmVzaExlZnQ9MDt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdXBkYXRlQ291bnRDaGlwKCl9LDEwMDApfQpmdW5jdGlvbiBzdG9wQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpe2NsZWFySW50ZXJ2YWwocmVmcmVzaFRpbWVyKTtyZWZyZXNoVGltZXI9bnVsbH19CmZ1bmN0aW9uIHVwZGF0ZUNvdW50Q2hpcCgpe2NvbnN0IGNoaXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50Q2hpcCIpO2NvbnN0IHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRUeHQiKTtjb25zdCBhcmM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50QXJjIik7Y29uc3Qgc2VjPWdldENmZygpLmF1dG9SZWZyZXNoU2VjfHw2MDtpZighY2hpcClyZXR1cm47aWYocmVmcmVzaFRpbWVyKXtjaGlwLmNsYXNzTGlzdC5hZGQoIm9uIik7dHh0LnRleHRDb250ZW50PXJlZnJlc2hMZWZ0KyJzIjtjb25zdCBDPTIqTWF0aC5QSSo1LjY7YXJjLnNldEF0dHJpYnV0ZSgic3Ryb2tlLWRhc2hvZmZzZXQiLFN0cmluZyhDKigxLXJlZnJlc2hMZWZ0L3NlYykpKX1lbHNle2NoaXAuY2xhc3NMaXN0LnJlbW92ZSgib24iKTt0eHQudGV4dENvbnRlbnQ9IuaJi+WKqCJ9fQpmdW5jdGlvbiB0b2dnbGVBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcilzdG9wQXV0b1JlZnJlc2goKTtlbHNlIHN0YXJ0QXV0b1JlZnJlc2goKTt1cGRhdGVDb3VudENoaXAoKX0KCi8qID09PT09PT09PT09PT09PT09IOS4i+aLieWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwooZnVuY3Rpb24oKXtjb25zdCB3cmFwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJXcmFwIiksaW5kPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJJbmQiKSx0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clR4dCIpLHNwaW49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clNwaW4iKTtsZXQgc3RhcnRZPTAscHVsbGluZz1mYWxzZSxkaXN0YW5jZT0wO2NvbnN0IFRIPTY0Owp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoc3RhcnQiLGU9PntpZih3aW5kb3cuc2Nyb2xsWTw9MCYmZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikmJiFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKS5jbGFzc0xpc3QuY29udGFpbnMoImhpZGRlbiIpKXtzdGFydFk9ZS50b3VjaGVzWzBdLmNsaWVudFk7cHVsbGluZz10cnVlO2Rpc3RhbmNlPTB9fSx7cGFzc2l2ZTp0cnVlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2htb3ZlIixlPT57aWYoIXB1bGxpbmcpcmV0dXJuO2NvbnN0IGR5PWUudG91Y2hlc1swXS5jbGllbnRZLXN0YXJ0WTtpZihkeT4wJiZ3aW5kb3cuc2Nyb2xsWTw9MCl7ZGlzdGFuY2U9TWF0aC5taW4oZHkqMC41LDkwKTtpbmQuc3R5bGUuaGVpZ2h0PWRpc3RhbmNlKyJweCI7aW5kLmNsYXNzTGlzdC5hZGQoInB1bGxpbmciKTtzcGluLnN0eWxlLnRyYW5zZm9ybT0icm90YXRlKCIrKGRpc3RhbmNlKjMuNikrImRlZykiO3R4dC50ZXh0Q29udGVudD1kaXN0YW5jZT49VEg/IuadvuW8gOWIt+aWsCI6IuS4i+aLieWIt+aWsCI7aWYoZGlzdGFuY2U+PVRIJiYhZS5jYW5jZWxhYmxlKXJldHVybjtpZihkaXN0YW5jZT49VEgmJmUuY2FuY2VsYWJsZSllLnByZXZlbnREZWZhdWx0KCl9fSx7cGFzc2l2ZTpmYWxzZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoZW5kIiwoKT0+e2lmKCFwdWxsaW5nKXJldHVybjtwdWxsaW5nPWZhbHNlO2lmKGRpc3RhbmNlPj1USCl7dHh0LnRleHRDb250ZW50PSLliLfmlrDkuK3igKYiO2luZC5zdHlsZS5oZWlnaHQ9IjQ2cHgiO3NwaW4uY2xhc3NMaXN0LmFkZCgic3Bpbm5lciIpO3JlZnJlc2hBbGwodHJ1ZSkuZmluYWxseSgoKT0+e2luZC5zdHlsZS5oZWlnaHQ9IjAiO2luZC5jbGFzc0xpc3QucmVtb3ZlKCJwdWxsaW5nIil9KX1lbHNle2luZC5zdHlsZS5oZWlnaHQ9IjAifWRpc3RhbmNlPTB9LHtwYXNzaXZlOnRydWV9KTsKfSkoKTsKCi8qID09PT09PT09PT09PT09PT09IOmmlumhtea4suafkyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgU1RBVEU9e2RhdGE6W10sdGltZXN0YW1wOiIiLHRzVGV4dDoiIixyZWZyZXNoU2VjOjYwLHByb3h5OmZhbHNlLHBhbmVsQWNjb3VudHM6bnVsbCxwYW5lbExvYWRlZDpmYWxzZX07Ci8vIOmmlumhteWNoeeJh+WFpeWcuuWKqOeUu+WPquWcqOesrOS4gOasoea4suafk+aXtuaSreaUvu+8jOS5i+WQjumdmem7mOWIt+aWsOebtOaOpeabv+aNouWGheWuue+8jOmBv+WFjeWxj+mXqgpsZXQgSE9NRV9BTklNPXRydWU7CmZ1bmN0aW9uIHNrZWxldG9uSG9tZSgpe3JldHVybiAnPGRpdiBjbGFzcz0iaGVybyIgc3R5bGU9ImhlaWdodDoxMzJweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzQwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc2MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nfQpmdW5jdGlvbiBzY29vdGVyRmFsbGJhY2soKXtyZXR1cm4gJzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nfQoKZnVuY3Rpb24gcmVuZGVySG9tZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2NvbnN0IGRhdGE9U1RBVEUuZGF0YTsKICAvLyDkuI3lho3lnKjmr4/mrKHmuLLmn5PliY3mj5LlhaXpqqjmnrblsY/vvJrpnZnpu5joh6rliqjliLfmlrDml7bkvJrlhYjmuIXnqbrlho3loavlhYXvvIzpgKDmiJDmlbTpobXpl6rng4EKICBpZihkYXRhLmxlbmd0aD09PTApewogICAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGRpdiBjbGFzcz0iZS1pY29uIj4nK0kuY2FyKyc8L2Rpdj48aDM+6L+Y5rKh5pyJ5p6B5qC46LSm5Y+3PC9oMz48cD7ljrvjgIzorr7nva7jgI3pobXmt7vliqDotKblj7fvvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiBUb2tlbu+8iEJlYXJlciDliY3nvIDkvJroh6rliqjljrvmjonvvInvvIzlho3ngrnjgIzojrflj5ZJROOAjeWNs+WPr+iHquWKqOWhq+WFheeUqOaIt0lE44CCPC9wPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzd2l0Y2hUYWIoXCdjZmdcJykiPuWOu+a3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIGNvbnN0IHRvdGFsU2NvcmU9ZGF0YS5yZWR1Y2UoKHMsYSk9PnMrKGEuc2NvcmV8fDApLDApOwogIGNvbnN0IHNpZ25lZENvdW50PWRhdGEuZmlsdGVyKGE9PmEuc2lnbmVkVG9kYXkpLmxlbmd0aDsKICBjb25zdCBjYXJkcz1kYXRhLm1hcCgoYSxpZHgpPT5yZW5kZXJBY2NvdW50Q2FyZChhLGlkeCkpLmpvaW4oIiIpOwogIGNvbnN0IHByb3h5SGludD1TVEFURS5wcm94eT8nPGRpdiBjbGFzcz0iY2ZnLW5vdGUiIHN0eWxlPSJtYXJnaW4tYm90dG9tOjE0cHgiPjxiPicrKHdpbmRvdy5fX1BBTkVMX01PREVfXz8i6Z2i5p2/5qih5byPIjoi5Luj55CG5qih5byPIikrJzwvYj7vvJrmlbDmja7nlLHmnKzmnLrohJrmnKzlkI7nq6/nrb7lkI3kuI7ojrflj5bjgII8L2Rpdj4nOiIiOwogIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iaGVybyI+PGRpdiBjbGFzcz0iaGVyby10b3AiPjxkaXYgY2xhc3M9Imhlcm8tc2NvcmUiPjxkaXYgY2xhc3M9ImxibCI+6LSm5Y+35oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmFsIG51bSIgaWQ9InRvdGFsU2NvcmUiPicrdG90YWxTY29yZS50b0xvY2FsZVN0cmluZygpKyc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJoZXJvLXJpZ2h0Ij48ZGl2IGNsYXNzPSJiaWcgbnVtIj4nK3NpZ25lZENvdW50Kyc8c3Bhbj4gLyAnK2RhdGEubGVuZ3RoKyc8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0ic3ViIj7ku4rml6Xlt7Lnrb7liLA8L2Rpdj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJoZXJvLXN0YXRzIj48ZGl2IGNsYXNzPSJoc3RhdCBjeWFuIj48ZGl2IGNsYXNzPSJ2IG51bSI+JytkYXRhLmZpbHRlcihhPT5hLnZlaGljbGUmJmEudmVoaWNsZS5oYXNWZWhpY2xlKS5sZW5ndGgrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPue7keWumui9pui+hjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImhzdGF0IGdyZWVuIj48ZGl2IGNsYXNzPSJ2IG51bSI+JytkYXRhLmZpbHRlcihhPT5hLnRva2VuVmFsaWQhPT1mYWxzZSkubGVuZ3RoKyc8L2Rpdj48ZGl2IGNsYXNzPSJsIj5Ub2tlbiDmraPluLg8L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj4nCiAgK3Byb3h5SGludAogICsnPGRpdiBjbGFzcz0ic2VjdGlvbi10aXRsZSI+JytJLmNhcisn6LSm5Y+354q25oCBPC9kaXY+JytjYXJkcwogICsnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcg5pWw5o2u5pu05pawICcrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8iIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7kvZzogIUgbHVja3kgwrcgR2l0SHViPC9hPiDCtyA8YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OTgiIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7niLHlj5HnlLU8L2E+IMK3IOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgSE9NRV9BTklNPWZhbHNlOwp9CgpmdW5jdGlvbiByaW5nU3ZnKHBjdCxzaXplKXtjb25zdCByPXNpemUvMi02O2NvbnN0IEM9MipNYXRoLlBJKnI7Y29uc3Qgb2ZmPUMqKDEtTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAscGN0KSkvMTAwKTtjb25zdCBjb2w9cGN0PD0yMD8iI0Y5NzA2QSI6cGN0PD01MD8iI0Y3Qjk1NSI6IiMyQkQ0RjIiO3JldHVybiAnPGRpdiBjbGFzcz0idmVoaWNsZS1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAnK3NpemUrJyAnK3NpemUrJyI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSInK3NpemUvMisnIiBjeT0iJytzaXplLzIrJyIgcj0iJytyKyciLz48Y2lyY2xlIGNsYXNzPSJhcmMiIGN4PSInK3NpemUvMisnIiBjeT0iJytzaXplLzIrJyIgcj0iJytyKyciIHN0cm9rZT0iJytjb2wrJyIgc3Ryb2tlLWRhc2hhcnJheT0iJytDLnRvRml4ZWQoMSkrJyIgc3Ryb2tlLWRhc2hvZmZzZXQ9Iicrb2ZmLnRvRml4ZWQoMSkrJyIvPjwvc3ZnPjxkaXYgY2xhc3M9InBjdCIgc3R5bGU9ImNvbG9yOicrY29sKyciPicrTWF0aC5yb3VuZChwY3QpKyclPC9kaXY+PC9kaXY+J30KZnVuY3Rpb24gcG93ZXJUZXh0KHAsbCl7cD1TdHJpbmcocHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2w9U3RyaW5nKGx8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtjb25zdCBvblZhbHM9WyIxIiwib24iLCJ0cnVlIiwi5byA5py6Iiwib3BlbiIsIua/gOa0uyIsImFjY19vbiIsImFjYyBvbiIsInBvd2VyX29uIiwicG93ZXIgb24iLCLlt7LlvIDmnLoiLCLlt7LkuIrnlLUiXTtjb25zdCBvZmZWYWxzPVsiMCIsIm9mZiIsImZhbHNlIiwi5YWz5py6IiwiY2xvc2VkIiwi5b6F5py6IiwiYWNjX29mZiIsImFjYyBvZmYiLCJwb3dlcl9vZmYiLCJwb3dlciBvZmYiLCLlt7LlhbPmnLoiLCLlt7LkuIvnlLUiXTtpZihwKXtpZihvblZhbHMuaW5jbHVkZXMocCkpcmV0dXJue3RleHQ6IuW3suW8gOacuiIsY2xzOiJvbiJ9O2lmKG9mZlZhbHMuaW5jbHVkZXMocCkpcmV0dXJue3RleHQ6IuW3suWFs+acuiIsY2xzOiJvZmYifX1pZihsKXtpZihbIjAiLCLmnKrplIEiLCLlvIDplIEiLCJ1bmxvY2tlZCIsImZhbHNlIiwib3BlbiIsIuW3suW8gOmUgSIsIuacqumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihbIjEiLCLlt7LplIEiLCLplIHovaYiLCJsb2NrZWQiLCJ0cnVlIiwiY2xvc2VkIiwi5bey6ZSB6L2mIl0uaW5jbHVkZXMobCkpcmV0dXJue3RleHQ6IuW3suWFs+acuiIsY2xzOiJvZmYifX1yZXR1cm57dGV4dDoi54q25oCB5pyq55+lIixjbHM6Im9mZiJ9fQpmdW5jdGlvbiBvbmxpbmVUZXh0KG8pe2NvbnN0IHM9U3RyaW5nKG98fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtpZighcylyZXR1cm4iIjtpZihbIjEiLCJvbiIsIm9ubGluZSIsInRydWUiLCLlnKjnur8iLCLlt7LlnKjnur8iLCJjb25uZWN0ZWQiLCJub3JtYWwiXS5pbmNsdWRlcyhzKSlyZXR1cm4i5Zyo57q/IjtpZihbIjAiLCJvZmYiLCJvZmZsaW5lIiwiZmFsc2UiLCLnprvnur8iLCLmnKrlnKjnur8iLCLlt7Lnprvnur8iLCJkaXNjb25uZWN0IiwiZGlzY29ubmVjdGVkIiwic2xlZXAiLCLkvJHnnKAiXS5pbmNsdWRlcyhzKSlyZXR1cm4i56a757q/IjtyZXR1cm4gc30KZnVuY3Rpb24gbG9ja1RleHQobCl7Y29uc3Qgcz1TdHJpbmcobHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2lmKCFzKXJldHVybiIiO2lmKFsiMCIsIuacqumUgSIsIuW8gOmUgSIsInVubG9ja2VkIiwiZmFsc2UiLCJvcGVuIiwi5bey5byA6ZSBIiwi5pyq6ZSB6L2mIl0uaW5jbHVkZXMocykpcmV0dXJue3RleHQ6IuacqumUgei9piIsY2xzOiJ1bmxvY2tlZCJ9O2lmKFsiMSIsIuW3sumUgSIsIumUgei9piIsImxvY2tlZCIsInRydWUiLCJjbG9zZWQiLCLlt7LplIHovaYiXS5pbmNsdWRlcyhzKSlyZXR1cm57dGV4dDoi5bey6ZSB6L2mIixjbHM6ImxvY2tlZCJ9O3JldHVybnt0ZXh0OnMsY2xzOiJvZmYifX0KZnVuY3Rpb24gY3VzaGlvblRleHQoYyl7Y29uc3Qgcz1TdHJpbmcoY3x8IiIpLnRyaW0oKTtpZighcylyZXR1cm4iIjtpZihbIjEiLCJvcGVuIiwib3BlbmVkIiwib24iLCJ0cnVlIiwi5byAIiwi5bey5byAIiwi5omT5byAIiwi5by55byAIl0uaW5jbHVkZXMocy50b0xvd2VyQ2FzZSgpKSlyZXR1cm4i5Z2Q5Z6r5bey5byAIjtpZihbIjAiLCJjbG9zZSIsImNsb3NlZCIsIm9mZiIsImZhbHNlIiwi5YWzIiwi5bey5YWzIiwi6Zet5ZCIIiwi5YWz6ZetIl0uaW5jbHVkZXMocy50b0xvd2VyQ2FzZSgpKSlyZXR1cm4i5Z2Q5Z6r5bey5ZCIIjtyZXR1cm4i5Z2Q5Z6rwrciK3N9CgpmdW5jdGlvbiByZW5kZXJBY2NvdW50Q2FyZChhLGlkeCl7CiAgY29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IGJsaW5kRGF5PWEuY29udGludWVEYXlzPT09MD8wOigoYS5jb250aW51ZURheXMtMSklMzApKzE7CiAgY29uc3QgYmxpbmRSb3VuZD1hLmNvbnRpbnVlRGF5cz09PTA/MDpNYXRoLmNlaWwoYS5jb250aW51ZURheXMvMzApOwogIGNvbnN0IGJsaW5kUGN0PU1hdGgucm91bmQoKGJsaW5kRGF5LzMwKSoxMDApOwogIGNvbnN0IGJsaW5kUmVtYWluPTMwLWJsaW5kRGF5OwogIGNvbnN0IHdlZWs9YS5sYXN0NyYmYS5sYXN0Ny5sZW5ndGg/YS5sYXN0Ny5tYXAoZD0+JzxkaXYgY2xhc3M9ImRheSAnKyhkLnNpZ25lZD8ib2siOiIiKSsiICIrKGQuaXNUb2RheT8idG9kYXkiOiIiKSsnIiB0aXRsZT0iJytkLmRhdGUrJyI+PHNwYW4gY2xhc3M9ImQiPicrZC5kYXRlLnNsaWNlKDMpKyc8L3NwYW4+PHNwYW4gY2xhc3M9Im0iPicrKGQuc2lnbmVkPyLinJMiOiLigJQiKSsnPC9zcGFuPjwvZGl2PicpLmpvaW4oIiIpOiIiOwogIGNvbnN0IGlzQ2hhcmdpbmc9di5jaGFyZ2VTdGF0ZSYmdi5jaGFyZ2VTdGF0ZSE9PSLmnKrlhYXnlLUiOwogIGxldCBjaGFyZ2VFdGE9IiI7CiAgaWYoaXNDaGFyZ2luZyYmdi52b2x0YWdlJiZ2LmN1cnJlbnQmJnYuY3VycmVudD4wJiZ2LmJhdHRlcnlQZXJjZW50PDEwMCl7Y29uc3QgcmVtYWluV2g9KDEwMC12LmJhdHRlcnlQZXJjZW50KS8xMDAqMTQ0MDtjb25zdCBwb3dlclc9di52b2x0YWdlKnYuY3VycmVudDtjb25zdCBob3Vycz1yZW1haW5XaC9wb3dlclc7Y2hhcmdlRXRhPWhvdXJzPj0xPyLnuqYiK2hvdXJzLnRvRml4ZWQoMSkrIuWwj+aXtuWFhea7oSI6Iue6piIrTWF0aC5yb3VuZChob3Vycyo2MCkrIuWIhumSn+WFhea7oSJ9CiAgY29uc3QgcHc9cG93ZXJUZXh0KHYucG93ZXJTdGF0dXMsdi5sb2NrU3RhdGUpOwogIGNvbnN0IG9ubD1vbmxpbmVUZXh0KHYub25saW5lfHx2LnJpZGVTdGF0ZSk7CiAgY29uc3QgbGs9bG9ja1RleHQodi5sb2NrU3RhdGUpOwogIGNvbnN0IGNzPWN1c2hpb25UZXh0KHYuY3VzaGlvblN0YXRlKTsKICBjb25zdCBjb29yZE9rPWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSk7CiAgY29uc3Qgc29jQ29sPXYuYmF0dGVyeVBlcmNlbnQ8PTIwPyIjRjk3MDZBIjp2LmJhdHRlcnlQZXJjZW50PD01MD8iI0Y3Qjk1NSI6IiMyQkQ0RjIiOwogIGNvbnN0IGFjY0NvbG9yPShhLnVzZXJOYW1lfHwiPyIpLmNoYXJDb2RlQXQoMCklMj09PTA/IiI6InZpbyI7CiAgY29uc3QgdWlkU2hvcnQ9YS51c2VySWQ/IklEICIrU3RyaW5nKGEudXNlcklkKS5zbGljZSgtNik6IuacquWhq0lEIjsKICBjb25zdCBiYWRnZT1hLnNpZ25lZFRvZGF5Pyc8c3BhbiBjbGFzcz0icGlsbCBvayI+JytJLmNoZWNrKyflt7Lnrb7liLA8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgbWlzcyI+5pyq562+5YiwPC9zcGFuPic7CiAgY29uc3QgdG9rQmFkZ2U9YS50b2tlblZhbGlkPT09ZmFsc2U/JzxzcGFuIGNsYXNzPSJwaWxsIGVyciIgc3R5bGU9ImJhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKSI+JytJLmFsZXJ0KyflpLHmlYg8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgY3lhbiI+VG9rZW4g5q2j5bi4PC9zcGFuPic7CiAgY29uc3QgZXJySHRtbD0iIjsKICBjb25zdCB2ZWhTdz12Lmhhc1ZlaGljbGU/cmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCk6IiI7CiAgY29uc3Qgdkh0bWw9di5oYXNWZWhpY2xlP3JlbmRlclZlaGljbGVIdG1sKHYsaWR4LGlzQ2hhcmdpbmcsY2hhcmdlRXRhLHB3LG9ubCxsayxjcyxjb29yZE9rLHNvY0NvbCk6JzxkaXYgY2xhc3M9Im5vLXZlaGljbGUiIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPicrSS5jYXIrJyDor6XotKblj7fmnKrnu5HlrprovabovoY8L2Rpdj4nOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNhcmQnKyhIT01FX0FOSU0/JyBhbmltLWluJzonJykrJyIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpZHgqNjApKydtcyI+JysKICAgICc8ZGl2IGNsYXNzPSJhY2MtaGVhZCI+PGRpdiBjbGFzcz0iYXZhdGFyICcrYWNjQ29sb3IrJyI+Jytlc2MoKGEudXNlck5hbWV8fCI/IilbMF0udG9VcHBlckNhc2UoKSkrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iYWNjLWluZm8iPjxkaXYgY2xhc3M9ImFjYy1uYW1lIj4nK2VzYyhhLnVzZXJOYW1lKSsnPC9kaXY+PGRpdiBjbGFzcz0iYWNjLXN1YiI+Jyt1aWRTaG9ydCsnPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJhY2MtYWN0aW9ucyI+Jyt0b2tCYWRnZStiYWRnZSsnPC9kaXY+PC9kaXY+JytlcnJIdG1sKwogICAgJzxkaXYgY2xhc3M9ImtwaS1ncmlkIj48ZGl2IGNsYXNzPSJrcGkgYzEiPjxkaXYgY2xhc3M9InYgbnVtIj4nK051bWJlcihhLnNjb3JlfHwwKS50b0xvY2FsZVN0cmluZygpKyc8L2Rpdj48ZGl2IGNsYXNzPSJsIj7mgLvnp6/liIY8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImtwaSBjMiI+PGRpdiBjbGFzcz0idiBudW0iPisnK051bWJlcihhLnRvZGF5U2NvcmV8fDApKyc8L2Rpdj48ZGl2IGNsYXNzPSJsIj7ku4rml6Xnp6/liIY8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImtwaSBjMyI+PGRpdiBjbGFzcz0idiBudW0iPicrTnVtYmVyKGEuY29udGludWVEYXlzfHwwKSsnPC9kaXY+PGRpdiBjbGFzcz0ibCI+6L+e562+5aSp5pWwPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJrcGkgYzQiPjxkaXYgY2xhc3M9InYgbnVtIj4nK2JsaW5kUmVtYWluKyc8L2Rpdj48ZGl2IGNsYXNzPSJsIj7ot53nm7Lnm5I8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImJsaW5kIj48ZGl2IGNsYXNzPSJibGluZC10b3AiPjxzcGFuPuebsuebkui/m+W6pu+8iOesrCcrYmxpbmRSb3VuZCsn6L2u77yJPC9zcGFuPjxzcGFuIGNsYXNzPSJyIG51bSI+JytibGluZERheSsnIC8gMzAgwrcgJytibGluZFBjdCsnJTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJibGluZC1iYXIiPjxkaXYgY2xhc3M9ImJsaW5kLWZpbGwiIHN0eWxlPSJ3aWR0aDonK2JsaW5kUGN0KyclIj48L2Rpdj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9IndlZWsiPjxkaXYgY2xhc3M9IndlZWstdG9wIj48c3Bhbj7ov5EgNyDlpKnnrb7liLA8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0id2Vlay1ncmlkIj4nK3dlZWsrJzwvZGl2PjwvZGl2PicrCiAgICB2ZWhTdyt2SHRtbCsKICAgICc8ZGl2IGNsYXNzPSJjdHJsLWdyaWQiPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJmaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcraWR4KycsXCdmaW5kXCcsdGhpcykiPicrSS5iZWxsKyflr7vovaY8L2J1dHRvbj4nKwogICAgJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0ibG91ZEZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytpZHgrJyxcJ2xvdWRGaW5kXCcsdGhpcykiPicrSS52b2wrJ+m4o+esmzwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJjdXNoaW9uIiBvbmNsaWNrPSJjdHJsQWN0KCcraWR4KycsXCdjdXNoaW9uXCcsdGhpcykiPicrSS5zZWF0KyflnZDlnqs8L2J1dHRvbj4nKwogICAgJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIHVubG9jayIgZGF0YS1hY3Q9InVubG9jayIgb25jbGljaz0iY3RybEFjdCgnK2lkeCsnLFwndW5sb2NrXCcsdGhpcykiPicrSS51bmxvY2srJ+W8gOmUgTwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gbG9jayIgZGF0YS1hY3Q9ImxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytpZHgrJyxcJ2xvY2tcJyx0aGlzKSI+JytJLmxvY2srJ+WFs+mUgTwvYnV0dG9uPicrCiAgICAnPC9kaXY+PC9kaXY+JzsKfQoKLyogPT09PT09PT09PT09IOWkmui9puWIh+aNoiA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCl7CiAgaWYoIXYudmVoaWNsZXN8fHYudmVoaWNsZXMubGVuZ3RoPDIpcmV0dXJuICIiOwogIGNvbnN0IGN1cj12LmN1cnJlbnRWaW58fCIiOwogIGNvbnN0IGl0ZW1zPXYudmVoaWNsZXMubWFwKHg9Pic8YnV0dG9uIGNsYXNzPSJ2ZWgtY2hpcCcrKHgudmluTm89PT1jdXI/IiBvbiI6IiIpKyciIG9uY2xpY2s9InN3aXRjaFZlaGljbGUoJytpZHgrJyxcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgubmFtZSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0idmVoLXN3aXRjaCI+PHNwYW4gY2xhc3M9InZlaC1zdy1sYWJlbCI+6L2m6L6GPC9zcGFuPicraXRlbXMrJzwvZGl2Pic7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZShpZHgsdmluKXsKICBjb25zdCBzcmM9U1RBVEUuZGF0YVtpZHhdO2lmKCFzcmN8fCF2aW4pcmV0dXJuOwogIHRyeXsKICAgIGxldCBkOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IHI9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChzcmMudXNlcklkfHwiIikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICAgIGQ9KHImJnIub2spP3IucmVzdWx0Om51bGw7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjYz1nZXRBY2NvdW50cygpW2lkeF07CiAgICAgIGlmKCFhY2MpcmV0dXJuOwogICAgICBkPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW4pOwogICAgfQogICAgaWYoZCYmZC52ZWhpY2xlJiZkLnZlaGljbGUuaGFzVmVoaWNsZSl7CiAgICAgIFNUQVRFLmRhdGFbaWR4XT1PYmplY3QuYXNzaWduKHt9LFNUQVRFLmRhdGFbaWR4XSxkKTsKICAgICAgcmVuZGVySG9tZSgpOwogICAgfQogIH1jYXRjaChlKXt9Cn0KCi8qID09PT09PT09PT09PSDnmq7ogqQv5Li76aKY5YiH5o2iID09PT09PT09PT09PSAqLwpjb25zdCBUSEVNRVM9WyJ6ZWVobyIsImRhcmsiLCJsaWdodCIsImdyZWVuIiwidmlvbGV0IiwiYW1iZXIiXTsKY29uc3QgVExBQkVMPXt6ZWVobzoi5p6B5qC46JOdIixkYXJrOiLmt7Hok50iLGxpZ2h0OiLmtYXoibIiLGdyZWVuOiLnv6Hnv6AiLHZpb2xldDoi57Sr572X5YWwIixhbWJlcjoi55Cl54+AIn07CmZ1bmN0aW9uIHRoZW1lTGFiZWwodCl7cmV0dXJuIFRMQUJFTFt0XXx8dH0KZnVuY3Rpb24gdG9nZ2xlVGhlbWUoKXsKICBjb25zdCBjdXI9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmdldEF0dHJpYnV0ZSgiZGF0YS10aGVtZSIpfHwiZGFyayI7CiAgY29uc3QgaT1USEVNRVMuaW5kZXhPZihjdXIpO2NvbnN0IG5leHQ9VEhFTUVTWyhpPDA/MDppKzEpJVRIRU1FUy5sZW5ndGhdOwogIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoImRhdGEtdGhlbWUiLG5leHQpOwogIHRyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemVlaG9fdGhlbWUiLG5leHQpfWNhdGNoKGUpe30KICBjb25zdCBiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0aGVtZUZhYiIpO2lmKGIpYi50aXRsZT0i5Li76aKY77yaIit0aGVtZUxhYmVsKG5leHQpKyLvvIjngrnlh7vliIfmjaLvvIkiOwp9CmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBsZXQgdD0iemVlaG8iOwogIHRyeXt0PWxvY2FsU3RvcmFnZS5nZXRJdGVtKCJ6ZWVob190aGVtZSIpfHwiemVlaG8ifWNhdGNoKGUpe30KICBpZihUSEVNRVMuaW5kZXhPZih0KTwwKXQ9InplZWhvIjsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIix0KTsKICBjb25zdCBiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0aGVtZUZhYiIpO2lmKGIpYi50aXRsZT0i5Li76aKY77yaIit0aGVtZUxhYmVsKHQpKyLvvIjngrnlh7vliIfmjaLvvIkiOwp9CmZ1bmN0aW9uIG1vdW50VGhlbWVCdG4oKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidGhlbWVGYWIiKSlyZXR1cm47CiAgY29uc3QgYj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJidXR0b24iKTsKICBiLmlkPSJ0aGVtZUZhYiI7Yi5jbGFzc05hbWU9InRoZW1lLWZhYiI7Yi50ZXh0Q29udGVudD0iXHV7MUYzMTl9IjsKICBiLnRpdGxlPSLkuLvpopjvvJrmt7Hok53vvIjngrnlh7vliIfmjaLvvIkiO2Iub25jbGljaz10b2dnbGVUaGVtZTsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDnq4vljbPnrb7liLDmgqzmta7mjInpkq4gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbW91bnRTaWduaW5GYWIoKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIikpcmV0dXJuOwogIGNvbnN0IGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiYnV0dG9uIik7CiAgYi5pZD0ic2lnbmluRmFiIjtiLmNsYXNzTmFtZT0ic2lnbmluLWZhYiI7Yi5pbm5lckhUTUw9KEkuY2hlY2t8fCIiKSsiPHNwYW4+56uL5Y2z562+5YiwPC9zcGFuPiI7CiAgYi5vbmNsaWNrPXJ1blNpZ25pbk5vdzsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbk5vdygpewogIGlmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufQogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoIWJ0bnx8YnRuLmNsYXNzTGlzdC5jb250YWlucygiYnVzeSIpKXJldHVybjsKICBidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiI7CiAgdG9hc3QoIuato+WcqOS4uuWFqOmDqOi0puWPt+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucnVuU2lnbmluKG51bGwsdHJ1ZSk7CiAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAiOwogIGlmKGQmJmQub2smJmQucmVzdWx0cyl7CiAgICBjb25zdCBva049ZC5yZXN1bHRzLmZpbHRlcihyPT5yLnN1Y2Nlc3MpLmxlbmd0aDsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoiK29rTisiLyIrZC5yZXN1bHRzLmxlbmd0aCsiIOaIkOWKnyIsb2tOPT09ZC5yZXN1bHRzLmxlbmd0aD8ib2siOiJlcnIiKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLGQucmVzdWx0cy5tYXAocj0+JzxkaXYgY2xhc3M9InNpZy1jYXJkICcrKHIuc3VjY2Vzcz8ib2siOiJmYWlsIikrJyI+PGRpdiBjbGFzcz0iaCI+PHNwYW4+Jytlc2Moci51c2VyTmFtZXx8IuacquefpSIpKyc8L3NwYW4+PHNwYW4gY2xhc3M9InIiPicrKHIuc3VjY2Vzcz8oIisiKyhyLnRvdGFsR2Fpbnx8MCkrIiDliIYiKToi5aSx6LSlIikrJzwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJzdGVwcyI+Jysoci5zdGVwc3x8W10pLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikrKHIuZXJyb3I/JzxkaXYgY2xhc3M9ImVyciI+Jytlc2Moci5lcnJvcikrJzwvZGl2Pic6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKSk7CiAgICByZWZyZXNoQWxsKHRydWUpOwogIH1lbHNlewogICAgdG9hc3QoKGQmJmQuZXJyb3IpfHwi562+5Yiw5omn6KGM5aSx6LSlIiwiZXJyIik7CiAgfQp9CgoKCmZ1bmN0aW9uIHJlbmRlclZlaGljbGVIdG1sKHYsaWR4LGlzQ2hhcmdpbmcsY2hhcmdlRXRhLHB3LG9ubCxsayxjcyxjb29yZE9rLHNvY0NvbCl7CiAgbGV0IGg9JzxkaXYgY2xhc3M9InZlaGljbGUiIG9uY2xpY2s9InNob3dWZWhpY2xlRGV0YWlsKCcraWR4KycpIj4nKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLXRvcCI+JytyaW5nU3ZnKHYuYmF0dGVyeVBlcmNlbnQsNzQpKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLW1ldGEiPjxkaXYgY2xhc3M9InZlaGljbGUtbmFtZSI+Jytlc2Modi52ZWhpY2xlTmFtZXx8IuaegeaguOi9pui+hiIpKyc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLXZpbiI+PHNwYW4gaWQ9InZpblR4dF8nK2lkeCsnIj4nK2VzYyhtYXNrVmluKHYudmluTm8pKSsnPC9zcGFuPjxidXR0b24gY2xhc3M9InZpbi1zaG93IiBpZD0idmluQnRuXycraWR4KyciIG9uY2xpY2s9ImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RvZ2dsZVZpbignK2lkeCsnKSI+5pi+56S6PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0idmVoaWNsZS1iYWRnZXMiPicrCiAgKG9ubD8nPHNwYW4gY2xhc3M9InBpbGwgJysob25sPT09IuWcqOe6vyI/Im9rIjoiZ3JheSIpKyciPicrSS53aWZpKyhvbmw9PT0i5Zyo57q/Ij8iIOWcqOe6vyI6IiAiK29ubCkrJzwvc3Bhbj4nOiIiKSsKICAoaXNDaGFyZ2luZz8nPHNwYW4gY2xhc3M9InBpbGwgb2siPicrSS5ib2x0KyflhYXnlLXkuK08L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgZ3JheSI+Jytlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpKyc8L3NwYW4+JykrCiAgKHB3LnRleHQ/JzxzcGFuIGNsYXNzPSJwaWxsICcrKHB3LmNscz09PSJvbiI/Im9rIjoiZ3JheSIpKyciPicrcHcudGV4dCsnPC9zcGFuPic6IiIpKwogICc8L2Rpdj48L2Rpdj48L2Rpdj4nOwogIGNvbnN0IHN0YXR1c2VzPVtdOwogIGlmKGxrLnRleHQpc3RhdHVzZXMucHVzaCgnPHNwYW4gY2xhc3M9InZzdGF0ICcrKGxrLmNscz09PSJsb2NrZWQiPyJsb2NrZWQiOiJ1bmxvY2tlZCIpKyciPicrKGxrLmNscz09PSJsb2NrZWQiP0kubG9jazpJLnVubG9jaykrJyAnK2VzYyhsay50ZXh0KSsnPC9zcGFuPicpOwogIGlmKGNzKXN0YXR1c2VzLnB1c2goJzxzcGFuIGNsYXNzPSJ2c3RhdCBzZWF0Ij4nK0kuc2VhdCsnICcrZXNjKGNzKSsnPC9zcGFuPicpOwogIGlmKHN0YXR1c2VzLmxlbmd0aCloKz0nPGRpdiBjbGFzcz0idnN0YXQtcm93Ij4nK3N0YXR1c2VzLmpvaW4oIiIpKyc8L2Rpdj4nOwogIGlmKGlzQ2hhcmdpbmcpaCs9JzxkaXYgY2xhc3M9ImNoYXJnZS1iYW5uZXIiPicrSS5ib2x0Kyc8c3BhbiBjbGFzcz0iY3QiPuWFheeUteS4rSAnK3YuYmF0dGVyeVBlcmNlbnQrJyU8L3NwYW4+Jysodi5iYXR0ZXJ5UGVyY2VudD49MTAwPyc8c3BhbiBjbGFzcz0iY2UiPuW3suWFhea7oTwvc3Bhbj4nOihjaGFyZ2VFdGE/JzxzcGFuIGNsYXNzPSJjZSI+JytjaGFyZ2VFdGErJzwvc3Bhbj4nOiIiKSkrJzwvZGl2Pic7CiAgaCs9JzxkaXYgY2xhc3M9InZrcGktZ3JpZCI+JysKICAnPGRpdiBjbGFzcz0idmtwaSI+PGRpdiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nKyh2LmJhdHRlcnlQZXJjZW50fHwwKSsnJTwvZGl2PjxkaXYgY2xhc3M9ImwiPueUtemHjyBTT0M8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ2a3BpIj48ZGl2IGNsYXNzPSJ2IG51bSI+Jysodi5yYW5nZUVzdGltYXRlZD8i57qmIit2LnJlc2lkdWFsUmFuZ2VLbTp2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPue7reiIqiBrbTwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9InZrcGkiPjxkaXYgY2xhc3M9InYgbnVtIj4nKyh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6IjAiKSsnPC9kaXY+PGRpdiBjbGFzcz0ibCI+5LuK5pelIGttPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0idmtwaSI+PGRpdiBjbGFzcz0idiBudW0iPicrKHYudG9kYXlEdXJhdGlvbnx8MCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPumqkeihjCBtaW48L2Rpdj48L2Rpdj4nKwogICc8L2Rpdj4nOwogIGgrPSc8ZGl2IGNsYXNzPSJiYXR0LXRyYWNrIj48ZGl2IGNsYXNzPSJiYXR0LWZpbGwiIHN0eWxlPSJ3aWR0aDonK01hdGgubWF4KDAsTWF0aC5taW4oMTAwLHYuYmF0dGVyeVBlcmNlbnR8fDApKSsnJTtiYWNrZ3JvdW5kOicrc29jQ29sKyc7Y29sb3I6Jytzb2NDb2wrJyI+PC9kaXY+PC9kaXY+JzsKICBjb25zdCBtZXRhcz1bXTsKICBpZih2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLnRpcmUrJ+WJjSA8Yj4nK2VzYyh2LmZyb250UHJlc3N1cmUpKyc8L2I+Jysodi5mcm9udFRlbXA/JyA8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh2LmZyb250VGVtcCkrJzwvc3Bhbj4nOiIiKSsnPC9kaXY+Jyk7CiAgaWYodi5yZWFyUHJlc3N1cmUmJnYucmVhclByZXNzdXJlIT09Iuacque7keWumiIpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kudGlyZSsn5ZCOIDxiPicrZXNjKHYucmVhclByZXNzdXJlKSsnPC9iPicrKHYucmVhclRlbXA/JyA8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh2LnJlYXJUZW1wKSsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKTsKICBpZih2LnZvbHRhZ2UpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kuYm9sdCsnPGI+Jyt2LnZvbHRhZ2UudG9GaXhlZCgxKSsnVjwvYj48L2Rpdj4nKTsKICBpZihpc0NoYXJnaW5nJiZ2LmN1cnJlbnQpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kucGx1ZysnPGI+Jyt2LmN1cnJlbnQudG9GaXhlZCgxKSsnQTwvYj48L2Rpdj4nKTsKICBpZih2LmJhdHRlcnlUZW1wKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLnRoZXJtbysnPGI+Jyt2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrJ8KwQzwvYj48L2Rpdj4nKTsKICBpZih2LnNlcnZpY2VFbmREYXRlKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLmNhbCsnPGI+Jytlc2Modi5zZXJ2aWNlRW5kRGF0ZSkrJzwvYj48L2Rpdj4nKTsKICBpZihtZXRhcy5sZW5ndGgpaCs9JzxkaXYgY2xhc3M9Im1ldGEtcm93Ij4nK21ldGFzLmpvaW4oIiIpKyc8L2Rpdj4nOwogIGlmKHYuYWRkcmVzc3x8Y29vcmRPayloKz0nPGRpdiBjbGFzcz0idmVoaWNsZS1hZGRyIj4nK0kucGluKyc8c3BhbiBjbGFzcz0iYXQiPicrZXNjKHYuYWRkcmVzc3x8IuW3suiOt+WPliBHUFMg5a6a5L2NIikrKHYubG9jYXRpb25UaW1lPycgwrcgJytlc2Modi5sb2NhdGlvblRpbWUpOiIiKSsnPC9zcGFuPjxidXR0b24gY2xhc3M9Im1hcC1idG4iICcrKGNvb3JkT2s/J29uY2xpY2s9ImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJ+WcsOWbvjwvYnV0dG9uPjwvZGl2Pic7CiAgaCs9JzwvZGl2Pic7CiAgcmV0dXJuIGg7Cn0KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huivpuaDhSAmIOWcsOWbviA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBvcGVuTWFwKGlkeCl7Y29uc3Qgdj1TVEFURS5kYXRhW2lkeF0mJlNUQVRFLmRhdGFbaWR4XS52ZWhpY2xlO2lmKCF2KXJldHVybjtpZighaGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKSl7dG9hc3QoIuaaguaXoOacieaViCBHUFMg5Z2Q5qCHIiwiZXJyIik7cmV0dXJufWNvbnN0IHVybD0iaHR0cHM6Ly9tYXBzLmFwcGxlLmNvbS8/cT0iK051bWJlcih2LmxhdGl0dWRlKSsiLCIrTnVtYmVyKHYubG9uZ2l0dWRlKSsiJno9MTciO3dpbmRvdy5vcGVuKHVybCwiX2JsYW5rIil9CmZ1bmN0aW9uIHRvZ2dsZVZpbihpZHgpe2NvbnN0IHY9U1RBVEUuZGF0YVtpZHhdJiZTVEFURS5kYXRhW2lkeF0udmVoaWNsZTtpZighdnx8IXYudmluTm8pcmV0dXJuO2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aW5UeHRfIitpZHgpLGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluQnRuXyIraWR4KTtpZighZWx8fCFidG4pcmV0dXJuO2lmKGVsLnRleHRDb250ZW50LmluZGV4T2YoIioiKT49MCl7ZWwudGV4dENvbnRlbnQ9di52aW5ObztidG4udGV4dENvbnRlbnQ9IumakOiXjyJ9ZWxzZXtlbC50ZXh0Q29udGVudD1tYXNrVmluKHYudmluTm8pO2J0bi50ZXh0Q29udGVudD0i5pi+56S6In19CmZ1bmN0aW9uIHNob3dWZWhpY2xlRGV0YWlsKGlkeCl7CiAgY29uc3QgYT1TVEFURS5kYXRhW2lkeF07aWYoIWEpcmV0dXJuO2NvbnN0IHY9YS52ZWhpY2xlfHx7fTsKICBjb25zdCBwdz1wb3dlclRleHQodi5wb3dlclN0YXR1cyx2LmxvY2tTdGF0ZSk7CiAgY29uc3Qgcm93cz1bXTsKICBpZih2LnZpbk5vKXJvd3MucHVzaChbJ+i9puaetuWPtycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iIGlkPSJ2aW5EdGwiPicrZXNjKG1hc2tWaW4odi52aW5ObykpKyc8L3NwYW4+IDxidXR0b24gY2xhc3M9InZpbi1zaG93IiBvbmNsaWNrPSJ0b2dnbGVEdGxWaW4oKSI+5pi+56S6PC9idXR0b24+J10pOwogIHJvd3MucHVzaChbJ+WFheeUteeKtuaAgScsZXNjKHYuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKV0pOwogIHJvd3MucHVzaChbJ+eUtea6kOeKtuaAgScsJzxzcGFuIHN0eWxlPSJjb2xvcjonKyhwdy5jbHM9PT0ib24iPyJ2YXIoLS1vaykiOiJ2YXIoLS10eHQyKSIpKyciPicrcHcudGV4dCsnPC9zcGFuPiddKTsKICBpZih2LnJpZGVTdGF0ZXx8di5vbmxpbmUpcm93cy5wdXNoKFsn6L2m6L6G54q25oCBJyxlc2Modi5yaWRlU3RhdGV8fHYub25saW5lKV0pOwogIHJvd3MucHVzaChbJ+eUtemHjyBTT0MnLCc8YiBzdHlsZT0iY29sb3I6Jysodi5iYXR0ZXJ5UGVyY2VudDw9MjA/InZhcigtLWVycikiOnYuYmF0dGVyeVBlcmNlbnQ8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLWJyYW5kKSIpKyciPicrKHYuYmF0dGVyeVBlcmNlbnR8fDApKyclPC9iPiddKTsKICBpZih2LnZvbHRhZ2Upcm93cy5wdXNoKFsn55S15Y6LJyx2LnZvbHRhZ2UudG9GaXhlZCgxKSsiViJdKTsKICBpZih2LmN1cnJlbnQpcm93cy5wdXNoKFsn55S15rWBJyx2LmN1cnJlbnQudG9GaXhlZCgxKSsiQSJdKTsKICBpZih2LmJhdHRlcnlUZW1wKXJvd3MucHVzaChbJ+eUteaxoOa4qeW6picsdi5iYXR0ZXJ5VGVtcC50b0ZpeGVkKDApKyLCsEMiXSk7CiAgcm93cy5wdXNoKFsn5Ymp5L2Z57ut6IiqJywodi5yZXNpZHVhbFJhbmdlS218fDApKyIga20iKyh2LnJhbmdlRXN0aW1hdGVkPyLvvIjkvLDnrpfvvIkiOiIiKV0pOwogIHJvd3MucHVzaChbJ+S7iuaXpemqkeihjCcsKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKTowKSsiIGttIC8gIisodi50b2RheUR1cmF0aW9ufHwwKSsiIG1pbiJdKTsKICBpZigodi5mcm9udFByZXNzdXJlJiZ2LmZyb250UHJlc3N1cmUhPT0i5pyq57uR5a6aIil8fCh2LnJlYXJQcmVzc3VyZSYmdi5yZWFyUHJlc3N1cmUhPT0i5pyq57uR5a6aIikpcm93cy5wdXNoKFsn6IOO5Y6LJywn5YmNICcrZXNjKHYuZnJvbnRQcmVzc3VyZXx8Ii0iKSsnIC8g5ZCOICcrZXNjKHYucmVhclByZXNzdXJlfHwiLSIpXSk7CiAgaWYodi5hZGRyZXNzKXJvd3MucHVzaChbJ+i9pui+huS9jee9ricsJzxzcGFuIHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDAiPicrZXNjKHYuYWRkcmVzcykrJzwvc3Bhbj4nXSk7CiAgY29uc3QgZE9rPWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSk7CiAgaWYoZE9rKXJvd3MucHVzaChbJ0dQUyDlnZDmoIcnLCc8c3BhbiBjbGFzcz0idiBtb25vIj4nK051bWJlcih2LmxhdGl0dWRlKS50b0ZpeGVkKDYpKyIsICIrTnVtYmVyKHYubG9uZ2l0dWRlKS50b0ZpeGVkKDYpKyc8L3NwYW4+J10pOwogIGlmKHYubG9jYXRpb25UaW1lKXJvd3MucHVzaChbJ+acgOWQjuWumuS9jScsJzxzcGFuIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDAiPicrZXNjKHYubG9jYXRpb25UaW1lKSsnPC9zcGFuPiddKTsKICBpZih2LnNlcnZpY2VFbmREYXRlKXJvd3MucHVzaChbJ+acjeWKoeWIsOacnycsZXNjKHYuc2VydmljZUVuZERhdGUpXSk7CiAgU1RBVEUudmluRHRsUmF3PXYudmluTm98fCIiOwogIGNvbnN0IGh0bWw9cm93cy5tYXAocj0+JzxkaXYgY2xhc3M9InNyLWl0ZW0iPjxzcGFuIGNsYXNzPSJrIj4nK3JbMF0rJzwvc3Bhbj48c3BhbiBjbGFzcz0idiI+JytyWzFdKyc8L3NwYW4+PC9kaXY+Jykuam9pbigiIikrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE2cHgiPjxidXR0b24gY2xhc3M9ImJ0biAnKyhkT2s/InByaW1hcnkiOiIiKSsnIiAnKyhkT2s/J29uY2xpY2s9ImNsb3NlU2hlZXQoKTtvcGVuTWFwKCcraWR4KycpIic6J2Rpc2FibGVkIHRpdGxlPSLmmoLml6DmnInmlYhHUFPlnZDmoIciJykrJz4nK0kubWFwKycg5Zyw5Zu+5p+l55yLPC9idXR0b24+PC9kaXY+JzsKICBvcGVuU2hlZXQoIui9pui+huivpuaDhSDCtyAiK2VzYyh2LnZlaGljbGVOYW1lfHwi5p6B5qC46L2m6L6GIiksSS5jYXIsaHRtbCk7Cn0KZnVuY3Rpb24gdG9nZ2xlRHRsVmluKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZpbkR0bCIpO2lmKCFlbClyZXR1cm47aWYoZWwudGV4dENvbnRlbnQuaW5kZXhPZigiKiIpPj0wKXtlbC50ZXh0Q29udGVudD1TVEFURS52aW5EdGxSYXc7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i6ZqQ6JePIn1lbHNle2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IuaYvuekuiI7ZWwudGV4dENvbnRlbnQ9bWFza1ZpbihlbC50ZXh0Q29udGVudCl9fQovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYzvvIjpnaLmnb/lt7Lnp7vpmaTmiYvliqjnrb7liLDlhaXlj6PvvIzlrprml7bnrb7liLDnlLHohJrmnKwgY3JvbiDotJ/otKPvvIkgPT09PT09PT09PT09PT09PT0gKi8KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYXx8IWEudXNlcklkKXt0b2FzdCgi6K+l6LSm5Y+357y65bCR55So5oi3SUQiLCJlcnIiKTtyZXR1cm59Y29uc3QgbmFtZXM9e2ZpbmQ6IuefreaMieWvu+i9pu+8iOi9pui+humXqueBr++8iSIsbG91ZEZpbmQ6Ium4o+esm+mXqueBr++8iOmrmOWjsOWvu+i9pu+8iSIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6r77yI5Z2Q5Z6r5Lya5by56LW377yJIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07Y29uc3QgbmFtZT1uYW1lc1thY3Rpb25dfHxhY3Rpb247Y29uZmlybURpYWxvZygi56Gu6K6k5omn6KGMICIrbmFtZSwi6K+l5oyH5Luk5Lya6YCa6L+HIDRHIOe9kee7nOecn+WunuaOp+WItuS9oOeahOi9pui+hu+8miIrZXNjKGEudXNlck5hbWUpKyLjgIIiLCdkb0N0cmwoJytpZHgrIiwnIithY3Rpb24rIicpIil9CmFzeW5jIGZ1bmN0aW9uIGRvQ3RybChpZHgsYWN0aW9uKXtjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgY2FyZD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIuYWNjLWNhcmQiKVtpZHhdO2NvbnN0IGJ0bj1jYXJkP2NhcmQucXVlcnlTZWxlY3RvcignLmN0cmwtYnRuW2RhdGEtYWN0PSInK2FjdGlvbisnIl0nKTpudWxsO2NvbnN0IG9sZD1idG4/YnRuLmlubmVySFRNTDoiIjtpZihidG4pe2J0bi5kaXNhYmxlZD10cnVlO2J0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLmlubmVySFRNTD1JLmNsb2NrfXRvYXN0KCLmjIfku6TkuIvlj5HkuK3igKYiLCJpbmZvIik7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDdHJsKGEudXNlcklkLGFjdGlvbik7aWYoYnRuKXtidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4uaW5uZXJIVE1MPW9sZH1pZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLmjIfku6Tlt7LkuIvlj5EiLCJvayIpfWVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLmjIfku6TlpLHotKUiLCJlcnIiKX19CgovKiA9PT09PT09PT09PT09PT09PSDml6Xlv5fpobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvZ0ZpbHRlcj0iYWxsIjsKYXN5bmMgZnVuY3Rpb24gcmVuZGVyTG9ncygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlTG9ncyIpOwogIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ic2VjdGlvbi10aXRsZSI+JytJLmt2Kyfov5DooYzml6Xlv5c8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJsb2ctcGFuZWwiPjxkaXYgY2xhc3M9ImxvZy1oZWFkIj48aDM+JytJLmt2Kyc8c3Bhbj7mnIDov5EgNTAg5p2hPC9zcGFuPjwvaDM+PGRpdiBjbGFzcz0ibG9nLWZpbHRlcnMiPicrCiAgWyc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJhbGwiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ2FsbFwnKSI+5YWo6YOoPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0ic2lnbmluIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdzaWduaW5cJykiPuetvuWIsDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InZlaGljbGUiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3ZlaGljbGVcJykiPuaOp+i9pjwvYnV0dG9uPiddLmpvaW4oIiIpKwogICc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbGlzdCIgaWQ9ImxvZ0xpc3QiPjxkaXYgc3R5bGU9InBhZGRpbmc6NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L295Lit4oCmPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTRweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgc3R5bGU9ImZsZXg6MSIgb25jbGljaz0iY2xlYXJMb2dzVUkoKSI+5riF56m65pel5b+XPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBsb2dzPWxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTA/REVNT19MT0dTOmF3YWl0IEJhY2tlbmQuZ2V0TG9ncygpO3JlbmRlckxvZ0xpc3QobG9ncyk7Cn0KZnVuY3Rpb24gc2V0TG9nRmlsdGVyKGYpe2xvZ0ZpbHRlcj1mO3JlbmRlckxvZ3MoKX0KZnVuY3Rpb24gcmVuZGVyTG9nTGlzdChsb2dzKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibG9nTGlzdCIpO2lmKCFlbClyZXR1cm47Y29uc3QgbGlzdD0obG9nc3x8W10pLmZpbHRlcihsPT57Y29uc3QgdD1sLnR5cGV8fCJzaWduaW4iO2lmKGxvZ0ZpbHRlcj09PSJhbGwiKXJldHVybiB0cnVlO3JldHVybiB0PT09bG9nRmlsdGVyfSk7aWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImxvZy1lbXB0eSI+JytJLndhcm4rJzxicj7or6XliIbnsbvkuIvmmoLml6Dml6Xlv5c8L2Rpdj4nO3JldHVybn1lbC5pbm5lckhUTUw9bGlzdC5tYXAoKGxvZyxpKT0+e2NvbnN0IHQ9bG9nLnR5cGV8fCJzaWduaW4iO2NvbnN0IHRhZz10PT09InZlaGljbGUiPyc8c3BhbiBjbGFzcz0icGlsbCBhbWJlciI+5o6n6L2mPC9zcGFuPic6JzxzcGFuIGNsYXNzPSJwaWxsIGN5YW4iPuetvuWIsDwvc3Bhbj4nO2xldCByZXM7aWYodD09PSJ2ZWhpY2xlIil7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLmFjdGlvblRleHR8fCLovabovobmjqfliLYiKSsnICcrKGxvZy5zdWNjZXNzPyLmiJDlip8iOiLlpLHotKXvvJoiK2VzYyhsb2cubWVzc2FnZXx8bG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31lbHNle3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5zdWNjZXNzPyLmiJDlip8gKyIrbG9nLnRvdGFsR2Fpbjoi5aSx6LSlOiAiKyhsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWNvbnN0IHN0ZXBzPWxvZy5zdGVwcz8obG9nLnN0ZXBzLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikpOiIiO3JldHVybiAnPGRpdiBjbGFzcz0ibG9nLWl0ZW0iIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaSoyNSkrJ21zIj48ZGl2IGNsYXNzPSJsb2ctdGltZSI+Jytlc2MobG9nLnRpbWV8fCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ibG9nLW1haW4iPicrdGFnKyc8c3BhbiBjbGFzcz0ibG9nLXVzZXIiPicrZXNjKGxvZy51c2VyTmFtZXx8IiIpKyc8L3NwYW4+JytyZXMrJzwvZGl2PicrKHN0ZXBzPyc8ZGl2IGNsYXNzPSJsb2ctc3RlcHMiPicrc3RlcHMrJzwvZGl2Pic6IiIpKyc8L2Rpdj4nfSkuam9pbigiIil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc1VJKCl7Y29uZmlybURpYWxvZygi5riF56m65pel5b+XIiwi5bCG5Yig6Zmk5YWo6YOo6L+Q6KGM5pel5b+X77yM5q2k5pON5L2c5LiN5Y+v5oGi5aSN44CCIiwiY2xlYXJMb2dzTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc05vdygpe2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuY2xlYXJMb2dzKCk7aWYob2spe3RvYXN0KCLml6Xlv5flt7LmuIXnqboiLCJvayIpO3JlbmRlckxvZ3MoKX1lbHNlIHRvYXN0KCLmuIXnqbrlpLHotKUiLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOiuvue9rumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgY2ZnQWNjb3VudHM9W107CmZ1bmN0aW9uIHJlbmRlckNmZygpewogIGlmKGlzUHJveHlNb2RlKCkmJmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik8MCYmIVNUQVRFLnBhbmVsTG9hZGVkKXsKICAgIGNvbnN0IGVsMD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogICAgaWYoZWwwKWVsMC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CGPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5q2j5Zyo5LuO6ISa5pys5ZCO56uv5ZCM5q2l6LSm5Y+35LiO6YWN572u4oCmPC9kaXY+PC9kaXY+JzsKICAgIGVuc3VyZVBhbmVsRGF0YSgpLnRoZW4oKCk9PnJlbmRlckNmZygpKTsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2ZnPWdldENmZygpO2NmZ0FjY291bnRzPShpc1Byb3h5TW9kZSgpJiZTVEFURS5wYW5lbEFjY291bnRzP1NUQVRFLnBhbmVsQWNjb3VudHM6Z2V0QWNjb3VudHMoKSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjphLnRva2VufHwiIixiYXJrS2V5OmEuYmFya0tleXx8IiJ9KSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICBjb25zdCBhY2NSb3dzPWNmZ0FjY291bnRzLm1hcCgoYSxpZHgpPT4nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VyTmFtZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VySWQpKyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW7vvIjnspjotLTljbPlj6/vvIzoh6rliqjljrvmjokgQmVhcmVyIOWJjee8gO+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudG9rZW4pKyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIznrb7liLDmiJDlip/mjqjpgIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEuYmFya0tleSkrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogIGNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eTsKICBjb25zdCBzdz0oaWQsbGFiZWwsc3ViLGNoZWNrZWQpPT4nPGxhYmVsIGNsYXNzPSJzd2l0Y2giPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9IicraWQrJyIgJysoY2hlY2tlZD8iY2hlY2tlZCI6IiIpKyc+PHNwYW4gY2xhc3M9InN3Ij48L3NwYW4+PHNwYW4gY2xhc3M9ImxibCI+JytsYWJlbCsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzYyI+JytzdWIrJzwvc3Bhbj48L2xhYmVsPic7CiAgZWwuaW5uZXJIVE1MPQogICc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua2V5Kyforr7nva48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7mlbDmja7mnI3liqE8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mnI3liqHlnLDlnYDvvIjnlZnnqbogPSDnm7Tov57mqKHlvI/vvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2Jhc2UiIHZhbHVlPSInK2VzYyhjZmcuc2VydmVyQmFzZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBodHRwOi8vemVlaG8uYm94IOaIliBodHRwOi8vMTkyLjE2OC4xLjEwOjgwODAiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48ZGl2IGNsYXNzPSJoaW50Ij7nlZnnqbrml7blupTnlKjlnKjmtY/op4jlmajlhoXnm7Tov57mnoHmoLggQVBJ77yI5L6d6LWW5pyN5Yqh56uv5pS+6KGMIENPUlPvvInvvJvloavlhaXljp/ohJrmnKzpnaLmnb/lnLDlnYDvvIjlpoIgTG9vbiDomZrmi5/ln5/lkI0gPGNvZGU+emVlaG8uYm94PC9jb2RlPu+8ieWNs+WIh+aNouS4uuS7o+eQhuaooeW8j++8jOeUseWOn+iEmuacrOi0n+i0o+etvuWQjeS4juWPluaVsOOAgjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPueci+adv+iHquWKqOWIt+aWsOmXtOmalO+8iOenku+8jDE1fjM2MDDvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJjZmdfcmVmcmVzaCIgbWluPSIxNSIgbWF4PSIzNjAwIiBzdGVwPSI1IiB2YWx1ZT0iJysoY2ZnLmF1dG9SZWZyZXNoU2VjfHw2MCkrJyI+PC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7lrprml7bnrb7liLA8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogIHN3KCJhdXRvX3NpZ25pbiIsIuWumuaXtuetvuWIsCIsIuWIsOeCueiHquWKqOS4uuWFqOmDqOi0puWPt+etvuWIsCIsY2ZnLmF1dG9TaWduaW49PT10cnVlKSsKICBzdygidmVoaWNsZV9tb25pdG9yIiwi6L2m6L6G54q25oCB55uR5o6nIiwi5YWF5ruhL+emu+e6v+aXtuacrOWcsOmAmuefpeaPkOmGku+8iOaJk+W8gOmdouadv+aXtuajgOafpe+8iSIsY2ZnLnZlaGljbGVNb25pdG9yPT09dHJ1ZSkrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPuetvuWIsOaXtumXtO+8iOavj+Wkqe+8jEhIOk1N77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGltZSIgaWQ9ImNmZ19zaWduaW5fdGltZSIgdmFsdWU9IicrZXNjKGNmZy5hdXRvU2lnbmluVGltZXx8IjA3OjAwIikrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuS7o+eQhuiEmuacrOaXoOW4uOmpu+WQjuWPsO+8jOmHh+eUqOOAjOaJk+W8gOihpeetvuOAjeacuuWItu+8muW8gOWQr+WQju+8jOavj+WkqemmluasoeaJk+W8gOmdouadv+S4lOW3sui/h+iuvuWumuaXtumXtOaXtu+8jOiHquWKqOS4uuWFqOmDqOi0puWPt+aJp+ihjOS4gOasoeetvuWIsO+8iOWGmeaXpeW/l+OAgeaOqCBCYXJr77yM5LiO5omL5Yqo562+5Yiw5LiA6Ie077yJ77yM5ZCM5LiA5aSp5Y+q5omn6KGM5LiA5qyh44CC6aaW6aG144CM56uL5Y2z562+5Yiw44CN5oKs5rWu5oyJ6ZKu5Y+v6ZqP5pe25omL5Yqo5omn6KGM44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7nrb7lkI3lr4bpkqXphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkFwcCDnq68gYXBwSWQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2FwcF9pZCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwSWQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD5BcHAg56uvIGFwcFNlY3JldDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjZmdfYXBwX3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwU2VjcmV0KSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+SDUg56uvIGFwcElkPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNmZ19oNV9pZCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBJZCkrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkg1IOerryBhcHBTZWNyZXQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2g1X3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBTZWNyZXQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48L2Rpdj4nKwogICc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7kupHnq6/mjqfovaYgQUVTIOWvhumSpe+8iDMyIOS9jeWNgeWFrei/m+WItu+8jOW8gC/lhbPplIHlv4XloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJwYXNzd29yZCIgaWQ9ImNmZ192ZWhpY2xlX2tleSIgdmFsdWU9IicrZXNjKGNmZy52ZWhpY2xlQWVzS2V5KSsnIiBwbGFjZWhvbGRlcj0i5aGr5YaZ5bm25L+d5a2Y5ZCO5omN6IO95L2/55So5LqR56uv5byA6ZSBL+WFs+mUgSIgYXV0b2NvbXBsZXRlPSJvZmYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48ZGl2IGNsYXNzPSJoaW50Ij7nlKjkuo7lvIAv5YWz6ZSB5oql5paHIEFFUy0yNTYtRUNCIOWKoOWvhu+8jOWHuuS6juWuieWFqOm7mOiupOS4jeWGhee9ruOAgjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlQ2ZnVUkoKSI+5L+d5a2Y6YWN572uPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJyZXNldENmZ1VJKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+56S+5Yy65Lu75Yqh5byA5YWzPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIiBzdHlsZT0iZ2FwOjhweCI+JysKICBzdygiY29tbV9wb3N0Iiwi5Y+R5biD5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSkrc3coImNvbW1fbGlrZSIsIueCuei1nuWKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVMaWtlIT09ZmFsc2UpK3N3KCJjb21tX2NvbW1lbnQiLCLor4TorrrliqjmgIEiLCLkuI3liqDliIYiLGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKStzdygiY29tbV9zaGFyZSIsIuWIhuS6q+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKStzdygiY29tbV9kZWxldGUiLCLmiafooYzlkI7liKDpmaTliqjmgIEiLCLmuIXnkIbnl5Xov7kiLGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UpKwogICc8L2Rpdj48ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lhbPpl63lr7nlupTlvIDlhbPlkI7vvIznrb7liLDohJrmnKzlsIbot7Pov4for6Xku7vliqHjgILkv67mlLnlkI7ngrnlh7vkuIrmlrnjgIzkv53lrZjphY3nva7jgI3nlJ/mlYjjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7miYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIk8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwonPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5omL5py65Y+377yI5p6B5qC4IEFwcCDnu5Hlrprlj7fnoIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZWwiIGlkPSJwbF9waG9uZSIgcGxhY2Vob2xkZXI9IjExIOS9jeaJi+acuuWPtyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGxfY29kZSIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjhweCI+PGxhYmVsPueZu+W9lSBCYXNpYyBBdXRo77yI5Y+v6YCJ77yM5bey5YaF572u5p6B5qC4QXBw55qEY2xpZW505Yet5o2u77yM5LiA6Iis5peg6ZyA5aGr5YaZ77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBsX2Jhc2ljIiBwbGFjZWhvbGRlcj0i6buY6K6k5bey5YaF572u77yM55WZ56m65Y2z5Y+vIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCIgYXV0b2NvbXBsZXRlPSJvZmYiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNlbmRTbXNDb2RlKCkiIGlkPSJwbF9zZW5kX2J0biI+6I635Y+W6aqM6K+B56CBPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InBob25lTG9naW5VSSgpIiBpZD0icGxfbG9naW5fYnRuIj7nmbvlvZXlubbmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+55So5omL5py65Y+3ICsg55+t5L+h6aqM6K+B56CB55m75b2V77yM6Ieq5Yqo6I635Y+WIFRva2VuIOS4jueUqOaIt0lE5bm25Yqg5YWl6LSm5Y+35YiX6KGo77yM5YWo56iL5peg6ZyA5oqT5YyF44CC55m75b2V5oiQ5Yqf5ZCO6Ieq5Yqo5L+d5a2Y5bm25Yi35paw6aG16Z2i44CCPC9kaXY+JysKJzwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPui0puWPt+euoeeQhu+8iCcrY2ZnQWNjb3VudHMubGVuZ3RoKycg5Liq77yJPC9oMz48YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iYWRkQWNjb3VudFVJKCkiPisg5re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiIGlkPSJhY2NMaXN0Ij4nKyhhY2NSb3dzfHwnPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mmoLml6DotKblj7fvvIzngrnlh7vjgIzmt7vliqDotKblj7fjgI08L2Rpdj4nKSsnPC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLWJvZHkiIHN0eWxlPSJwYWRkaW5nLXRvcDowIj48ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic2F2ZUFjY291bnRzVUkoKSI+5L+d5a2Y5p6B5qC46LSm5Y+3PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLW5vdGUiPjxiPuS9v+eUqOivtOaYjjwvYj48YnI+wrcgVG9rZW7vvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiDlgLzljbPlj6/vvIzoh6rliqjljrvmjokgPGNvZGU+QmVhcmVyIDwvY29kZT4g5YmN57yA44CCPGJyPsK3IOiOt+WPlklE77ya5aGr5YWlIFRva2VuIOWQjueCueOAjOiOt+WPlklE44CN77yM6Ieq5Yqo5LuOIEg1IGJhc2VJbmZvIC8gQXBwIHNldHRpbmcgLyDovabovobliJfooajmjqXlj6Pop6PmnpDnlKjmiLdJROS4juaYteensOOAgjxicj7CtyBCYXJrIEtlee+8muivpei0puWPt+etvuWIsOaIkOWKn+WQjuaOqOmAgemAmuefpe+8jOeVmeepuuS4jeaOqOOAgjxicj7CtyDmjqfovabmjIfku6TvvIjlr7vovaYv6bij56ybL+WdkOWeqy/lvIDlhbPplIHvvInkvJrnnJ/lrp7mk43kvZzovabovobvvIzpnIDkuozmrKHnoa7orqTjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuWkh+S7vei0puWPt+mFjee9rjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJleHBvcnRCYWNrdXBVSSgpIj7kuIDplK7lr7zlh7rlpIfku708L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9ImNvcHlCYWNrdXBVSSgpIj7lpI3liLblpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7lpIfku73lhoXlrrnvvIjljIXlkKvlhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzlj6/lpI3liLbkv53lrZjvvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iYmFja3VwQXJlYSIgcm93cz0iNCIgcmVhZG9ubHkgcGxhY2Vob2xkZXI9IueCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjeeUn+aIkOKApiIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48L3RleHRhcmVhPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPuaBouWkjeWkh+S7ve+8iOeymOi0tOWkh+S7vSBKU09OIOWQjueCueaBouWkje+8jOWwhuimhueblueOsOaciei0puWPt+S4jumFjee9ru+8iTwvbGFiZWw+PHRleHRhcmVhIGlkPSJpbXBvcnRBcmVhIiByb3dzPSI0IiBwbGFjZWhvbGRlcj0i57KY6LS05aSH5Lu9IEpTT07igKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBvbmNsaWNrPSJpbXBvcnRCYWNrdXBVSSgpIj7mgaLlpI3lpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lpIfku73ljIXlkKvlhajpg6jotKblj7fvvIjmmLXnp7Av55So5oi3SUQvVG9rZW4vQmFya0tlee+8ieS4jumdouadv+mFjee9ru+8iOetvuWQjeWvhumSpS/npL7ljLrku7vliqHlvIDlhbMv6Ieq5Yqo5Yi35paw562J77yJ44CC5o2i5py65oiW6YeN6KOF5ZCO57KY6LS05Y2z5Y+v5LiA6ZSu6L+Y5Y6f77yM5peg6ZyA6YeN5paw5oqT5YyF5aGr5YaZ44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcgJysoaXNQcm94eU1vZGUoKT8n6LSm5Y+35LiO5a+G6ZKl5a2Y5YKo5LqO6ISa5pys5ZCO56uv77yI5pys5py65oyB5LmF5YyW77yJJzon5pWw5o2u5a2Y5YKo5LqO5pys5py65rWP6KeI5ZmoIGxvY2FsU3RvcmFnZScpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4IiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciI+54ix5Y+R55S1IMK3IGFmZGlhbi5jb20vYS9sdWNreTc5ODwvYT48L2Rpdj4nOwp9Ci8qID09PT09PT09PT09PT09PT09IOaJi+acuuWPt+eZu+W9le+8iOWFjeaKk+WMhe+8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBzZW5kU21zQ29kZSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfc2VuZF9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuWPkemAgeS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnNlbmRDb2RlKHBob25lKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLpqozor4HnoIHlt7Llj5HpgIEiLCJvayIpO2xldCB0PTYwO2J0bi50ZXh0Q29udGVudD0i6YeN5paw6I635Y+WKCIrdCsicykiOwogICAgY29uc3QgaXY9c2V0SW50ZXJ2YWwoKCk9Pnt0LS07aWYodDw9MCl7Y2xlYXJJbnRlcnZhbChpdik7YnRuLnRleHRDb250ZW50PSLojrflj5bpqozor4HnoIEiO2J0bi5kaXNhYmxlZD1mYWxzZTt9ZWxzZSBidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjt9LDEwMDApOwogIH1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5Y+R6YCB5aSx6LSl77yM6K+35qOA5p+l572R57ucIiwiZXJyIik7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjt9Cn0KYXN5bmMgZnVuY3Rpb24gcGhvbmVMb2dpblVJKCl7CiAgY29uc3QgcGhvbmU9KGVsKCJwbF9waG9uZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBjb2RlPShlbCgicGxfY29kZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBiYXNpYz0oZWwoInBsX2Jhc2ljIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBpZighY29kZSl7dG9hc3QoIuivt+i+k+WFpeefreS/oemqjOivgeeggSIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYnRuPWVsKCJwbF9sb2dpbl9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnBob25lTG9naW4ocGhvbmUsY29kZSxiYXNpYyk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi55m75b2V5oiQ5YqfIiwib2siKTtzZXRUaW1lb3V0KCgpPT5sb2NhdGlvbi5yZWxvYWQoKSwxMjAwKTt9CiAgZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IueZu+W9leWksei0pSIsImVyciIpO30KICBidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLnRleHRDb250ZW50PSLnmbvlvZXlubbmt7vliqDotKblj7ciOwp9CmZ1bmN0aW9uIGNvbGxlY3RDZmdVSSgpe3JldHVybnthcHA6e2FwcElkOnZhbCgiY2ZnX2FwcF9pZCIpLGFwcFNlY3JldDp2YWwoImNmZ19hcHBfc2VjcmV0Iil9LGg1OnthcHBJZDp2YWwoImNmZ19oNV9pZCIpLGFwcFNlY3JldDp2YWwoImNmZ19oNV9zZWNyZXQiKX0sdmVoaWNsZUFlc0tleTp2YWwoImNmZ192ZWhpY2xlX2tleSIpLnRyaW0oKSxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKHZhbCgiY2ZnX3JlZnJlc2giKSksc2VydmVyQmFzZTp2YWwoImNmZ19iYXNlIikudHJpbSgpLGF1dG9TaWduaW46ZWwoImF1dG9fc2lnbmluIik/ZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZDpmYWxzZSxhdXRvU2lnbmluVGltZToodmFsKCJjZmdfc2lnbmluX3RpbWUiKXx8IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6ZWwoInZlaGljbGVfbW9uaXRvciIpP2VsKCJ2ZWhpY2xlX21vbml0b3IiKS5jaGVja2VkOmZhbHNlLGNvbW11bml0eTp7ZW5hYmxlUG9zdDplbCgiY29tbV9wb3N0IikuY2hlY2tlZCxlbmFibGVMaWtlOmVsKCJjb21tX2xpa2UiKS5jaGVja2VkLGVuYWJsZUNvbW1lbnQ6ZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQsZW5hYmxlU2hhcmU6ZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkLGVuYWJsZURlbGV0ZTplbCgiY29tbV9kZWxldGUiKS5jaGVja2VkfX19CmZ1bmN0aW9uIHZhbChpZCl7Y29uc3QgZT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7cmV0dXJuIGU/ZS52YWx1ZToiIn0KZnVuY3Rpb24gZWwoaWQpe3JldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCl9CmFzeW5jIGZ1bmN0aW9uIHNhdmVDZmdVSSgpe2NvbnN0IGM9Y29sbGVjdENmZ1VJKCk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQ29uZmlnKGMpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKXthcHBseVJlbW90ZUNmZyhjKTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX10b2FzdCgi6YWN572u5bey5L+d5a2YIiwib2siKTtzdGFydEF1dG9SZWZyZXNoKGMuYXV0b1JlZnJlc2hTZWMpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9CmZ1bmN0aW9uIHJlc2V0Q2ZnVUkoKXtlbCgiY2ZnX2FwcF9pZCIpLnZhbHVlPURFRkFVTFRfQ0ZHLmFwcC5hcHBJZDtlbCgiY2ZnX2FwcF9zZWNyZXQiKS52YWx1ZT1ERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0O2VsKCJjZmdfaDVfaWQiKS52YWx1ZT1ERUZBVUxUX0NGRy5oNS5hcHBJZDtlbCgiY2ZnX2g1X3NlY3JldCIpLnZhbHVlPURFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldDtlbCgiY2ZnX3ZlaGljbGVfa2V5IikudmFsdWU9IiI7ZWwoImNmZ19yZWZyZXNoIikudmFsdWU9NjA7ZWwoImNmZ19iYXNlIikudmFsdWU9IiI7aWYoZWwoImF1dG9fc2lnbmluIikpZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZD1mYWxzZTtlbCgiY2ZnX3NpZ25pbl90aW1lIikudmFsdWU9IjA3OjAwIjtlbCgiY29tbV9wb3N0IikuY2hlY2tlZD10cnVlO2VsKCJjb21tX2xpa2UiKS5jaGVja2VkPXRydWU7ZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQ9dHJ1ZTtlbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQ9dHJ1ZTtlbCgiY29tbV9kZWxldGUiKS5jaGVja2VkPXRydWU7dG9hc3QoIuW3suaBouWkjem7mOiupO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX0KZnVuY3Rpb24gYWRkQWNjb3VudFVJKCl7Y2ZnQWNjb3VudHMucHVzaCh7dXNlck5hbWU6IiIsdXNlcklkOiIiLHRva2VuOiIiLGJhcmtLZXk6IiJ9KTtjb25zdCBsaXN0PWVsKCJhY2NMaXN0Iik7Y29uc3QgaWR4PWNmZ0FjY291bnRzLmxlbmd0aC0xO2NvbnN0IGh0bWw9JzxkaXYgY2xhc3M9ImFjYy1lZGl0IiBkYXRhLWk9IicraWR4KyciPjxkaXYgY2xhc3M9ImFjYy1lZGl0LWhlYWQiPjxzcGFuIGNsYXNzPSJhY2MtZWRpdC10aXRsZSI+PHNwYW4gY2xhc3M9Im4iPicrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPui0puWPtyAnK1N0cmluZyhpZHgrMSkrJ++8iOaWsO+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iYWN0cyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBpZD0idWlkQnRuXycraWR4KyciIG9uY2xpY2s9ImZldGNoVXNlcklkVUkoJytpZHgrJykiPuiOt+WPlklEPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIGRhbmdlciIgb25jbGljaz0iZGVsZXRlQWNjb3VudFVJKCcraWR4KycpIj7liKDpmaQ8L2J1dHRvbj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mmLXnp7A8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX25hbWVfJytpZHgrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i55WZ56m65Y+v54K544CM6I635Y+WSUTjgI0iPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW48L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3Rva2VuXycraWR4KyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+JztpZihsaXN0LnF1ZXJ5U2VsZWN0b3IoIi5hY2MtZWRpdCIpfHxsaXN0LnF1ZXJ5U2VsZWN0b3IoIltzdHlsZSo9J3RleHQtYWxpZ24nXSIpKXtsaXN0Lmluc2VydEFkamFjZW50SFRNTCgiYmVmb3JlZW5kIixodG1sKX1lbHNle2xpc3QuaW5uZXJIVE1MPWh0bWx9fQpmdW5jdGlvbiBkZWxldGVBY2NvdW50VUkoaWR4KXtjb25zdCByb3c9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFjYy1lZGl0W2RhdGEtaT0iJytpZHgrJyJdJyk7aWYocm93KXtyb3cucmVtb3ZlKCk7Y2ZnQWNjb3VudHMuc3BsaWNlKGlkeCwxKTt0b2FzdCgi5bey5Yig6Zmk77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfX0KZnVuY3Rpb24gY29sbGVjdEFjY291bnRzVUkoKXtjb25zdCByb3dzPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNhY2NMaXN0IC5hY2MtZWRpdCIpO2NvbnN0IGxpc3Q9W107cm93cy5mb3JFYWNoKHJvdz0+e2NvbnN0IGk9cm93LmdldEF0dHJpYnV0ZSgiZGF0YS1pIik7Y29uc3QgdG9rZW49ZWwoImFjY190b2tlbl8iK2kpPy52YWx1ZXx8IiI7aWYodG9rZW4udHJpbSgpKXtsaXN0LnB1c2goe3VzZXJOYW1lOmVsKCJhY2NfbmFtZV8iK2kpPy52YWx1ZXx8IiIsdXNlcklkOmVsKCJhY2NfdWlkXyIraSk/LnZhbHVlfHwiIix0b2tlbjpjbGVhblRva2VuKHRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShlbCgiYWNjX2JhcmtfIitpKT8udmFsdWV8fCIiKX0pfX0pO3JldHVybiBsaXN0fQphc3luYyBmdW5jdGlvbiBzYXZlQWNjb3VudHNVSSgpe2NvbnN0IGxpc3Q9Y29sbGVjdEFjY291bnRzVUkoKS5tYXAoYT0+KHt1c2VyTmFtZTooYS51c2VyTmFtZXx8IiIpLnRyaW0oKSx1c2VySWQ6KGEudXNlcklkfHwiIikudHJpbSgpLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5KX0pKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVBY2NvdW50cyhsaXN0KTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSlTVEFURS5wYW5lbEFjY291bnRzPWxpc3Q7dG9hc3QoIuaegeaguOi0puWPt+W3suS/neWtmCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hVc2VySWRVSShpZHgpe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oZWwoImFjY190b2tlbl8iK2lkeCk/LnZhbHVlfHwiIik7Y29uc3QgYnRuPWVsKCJ1aWRCdG5fIitpZHgpO2lmKCF0b2tlbil7dG9hc3QoIuivt+WFiOWhq+WGmSBUb2tlbiIsImVyciIpO3JldHVybn1idG4udGV4dENvbnRlbnQ9IuiOt+WPluS4reKApiI7YnRuLmRpc2FibGVkPXRydWU7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldFVzZXJpZCh0b2tlbik7aWYoZCYmZC5vayYmZC51c2VySWQpe2lmKGVsKCJhY2NfdWlkXyIraWR4KSllbCgiYWNjX3VpZF8iK2lkeCkudmFsdWU9ZC51c2VySWQ7aWYoZC51c2VyTmFtZSYmZWwoImFjY19uYW1lXyIraWR4KSYmIWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWUpZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZT1kLnVzZXJOYW1lO3RvYXN0KCLojrflj5bmiJDlip/vvJoiKyhkLnVzZXJOYW1lfHxkLnVzZXJJZCksIm9rIil9ZWxzZXt0b2FzdCgi6I635Y+W5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5pyq55+l6ZSZ6K+vIiksImVyciIpfWJ0bi50ZXh0Q29udGVudD0i6I635Y+WSUQiO2J0bi5kaXNhYmxlZD1mYWxzZX0KCi8qID09PT09PT09PT09PT09PT09IOWkh+S7vSAvIOaBouWkjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBleHBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsKXt0b2FzdCgi55WM6Z2i5pyq5bCx57uqIiwiZXJyIik7cmV0dXJufWVsLnZhbHVlPSLnlJ/miJDkuK3igKYiO0JhY2tlbmQuYmFja3VwKCkudGhlbihkPT57aWYoZCYmZC5vayl7ZWwudmFsdWU9SlNPTi5zdHJpbmdpZnkoZCxudWxsLDIpO3RvYXN0KCLlpIfku73lt7LnlJ/miJDvvIzlj6/lpI3liLbkv53lrZgiLCJvayIpfWVsc2V7ZWwudmFsdWU9IiI7dG9hc3QoIuWvvOWHuuWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuaXoOazlei/nuaOpeiEmuacrOWQjuerryIpLCJlcnIiKX19KX0KZnVuY3Rpb24gY29weUJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZSl7dG9hc3QoIuivt+WFiOeCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjSIsImVyciIpO3JldHVybn1pZihuYXZpZ2F0b3IuY2xpcGJvYXJkJiZuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCl7bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZWwudmFsdWUpLnRoZW4oKCk9PnRvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpLCgpPT57ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX0pfWVsc2V7ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX19CmZ1bmN0aW9uIGltcG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZS50cmltKCkpe3RvYXN0KCLor7flhYjnspjotLTlpIfku73lhoXlrrkiLCJlcnIiKTtyZXR1cm59Y29uZmlybURpYWxvZygi5oGi5aSN5aSH5Lu9Iiwi5bCG6KaG55uW5b2T5YmN5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5q2k5pON5L2c5LiN5Y+v5pKk6ZSA44CCIiwiaW1wb3J0QmFja3VwTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGltcG9ydEJhY2t1cE5vdygpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7Y29uc3Qgdj1lbD9lbC52YWx1ZS50cmltKCk6IiI7aWYoIXYpe3RvYXN0KCLlpIfku73lhoXlrrnkuLrnqboiLCJlcnIiKTtyZXR1cm59Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnJlc3RvcmVCYWNrdXAodik7aWYoZCYmZC5vayl7dG9hc3QoIuaBouWkjeaIkOWKn++8miIrKGQuY291bnR8fDApKyIg5Liq6LSm5Y+3Iiwib2siKTtpZihpc1Byb3h5TW9kZSgpKXtTVEFURS5wYW5lbEFjY291bnRzPVtdO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfVNUQVRFLmRhdGE9W107cmVuZGVyQ2ZnKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLmgaLlpI3lpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLlpIfku73lhoXlrrnmoLzlvI/plJnor68iKSwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDmvJTnpLrmlbDmja7vvIg/ZGVtbyDpooTop4jnlKjvvIzkuI3ogZTnvZHvvIkgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgREVNT19EQVRBPVsKe3VzZXJOYW1lOiLpmL/ms70iLHVzZXJJZDoiMjAyNTEwMDkxMjM0NTY3OCIsc2NvcmU6MTI4ODAsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NDIsdG9kYXlTY29yZToxMixzaWduQ291bnQ6MzYsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGJhdHRlcnlQZXJjZW50Ojc2LHJlc2lkdWFsUmFuZ2VLbTo2MyxyYW5nZUVzdGltYXRlZDpmYWxzZSxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjg0LjUsY3VycmVudDowLGJhdHRlcnlUZW1wOjI2LGZyb250UHJlc3N1cmU6IjIuMzViYXIiLHJlYXJQcmVzc3VyZToiMi40MGJhciIsZnJvbnRUZW1wOiIzMcKwQyIscmVhclRlbXA6IjMywrBDIix0b2RheURpc3RhbmNlOjEyLjYsdG9kYXlEdXJhdGlvbjozNCx0b2RheU1heFNwZWVkOjU2LGxhc3RSaWRlTWlsZWFnZTo4LjIsb25saW5lOiIxIixwb3dlclN0YXR1czoiMCIsbG9ja1N0YXRlOiIxIixjdXNoaW9uU3RhdGU6IjAiLGFkZHJlc3M6Iuemj+W7uuecgeWugeW+t+W4guiVieWfjuWMuuS4nOS+qOW8gOWPkeWMuiIsbG9jYXRpb25UaW1lOiIwODoxMiIsbG9uZ2l0dWRlOjExOS41NTA5LGxhdGl0dWRlOjI2LjY2NTQsc2VydmljZUVuZERhdGU6IjIwMjctMDMtMTgifX0sCnt1c2VyTmFtZToi5bCP5ruhIix1c2VySWQ6IjIwMjYwMTAxMTEyMjMzNDQiLHNjb3JlOjUyMCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6Myx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjksdG9rZW5WYWxpZDpmYWxzZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsYmF0dGVyeVBlcmNlbnQ6MjMscmVzaWR1YWxSYW5nZUttOjIwLHJhbmdlRXN0aW1hdGVkOnRydWUsY2hhcmdlU3RhdGU6IuWFheeUteS4rSIsdm9sdGFnZTo4Ni4yLGN1cnJlbnQ6NS40LGJhdHRlcnlUZW1wOjMxLGZyb250UHJlc3N1cmU6IjIuMTBiYXIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsb25saW5lOiIwIixwb3dlclN0YXR1czoiMSIsbG9ja1N0YXRlOiIwIixjdXNoaW9uU3RhdGU6IjEiLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIixzZXJ2aWNlRW5kRGF0ZToiIn19Cl07CmNvbnN0IERFTU9fTE9HUz1bCnt0aW1lOiIyMDI2LTA5LTEwIDA3OjAwOjEyIix0eXBlOiJzaWduaW4iLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSx0b3RhbEdhaW46MTIsc2lnbmluU2NvcmU6NixibGluZEJveFNjb3JlOjYsaW50ZXJhY3RTY29yZTowLGNvbnRpbnVlRGF5czo0MixzdGVwczpbIuetvuWIsOaIkOWKnyArNiIsIuebsuebkuiOt+W+lyArNiAo56ev5YiGKSIsIuebsuebkuacquino+mUgSgzNi8zMCkiXX0sCnt0aW1lOiIyMDI2LTA5LTEwIDA3OjAwOjE1Iix0eXBlOiJzaWduaW4iLHVzZXJOYW1lOiLlsI/mu6EiLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6IlRva2Vu5bey6L+H5pyfIixzdGVwczpbIuetvuWIsOWksei0pTog6K+35YWI55m75b2VIl19LAp7dGltZToiMjAyNi0wOS0wOSAyMjozMTowNSIsdHlwZToidmVoaWNsZSIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLGFjdGlvblRleHQ6IuS6keerr+W8gOmUgSIsbWVzc2FnZToi5LqR56uv5byA6ZSB5oyH5Luk5bey5LiL5Y+RIixzdGVwczpbXX0KXTsKCi8qID09PT09PT09PT09PT09PT09IOWIt+aWsCAmIOWIneWni+WMliA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9hZGluZz1mYWxzZTsKLy8g5YWl5Zy66Zeq5bGP77ya6aaW5qyh5pWw5o2u5bCx57uq77yI5peg6K665oiQ5YqfL+Wksei0pe+8ieWQjua3oeWHuuenu+mZpApmdW5jdGlvbiBoaWRlU3BsYXNoKCl7Y29uc3Qgcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3BsYXNoIik7aWYoIXMpcmV0dXJuO3MuY2xhc3NMaXN0LmFkZCgib3V0Iik7c2V0VGltZW91dCgoKT0+e2lmKHMucGFyZW50Tm9kZSlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocyl9LDQ1MCl9CmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBbGwoc2lsZW50KXsKICBpZihsb2FkaW5nKXJldHVybjtsb2FkaW5nPXRydWU7CiAgaWYoIXNpbGVudCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7aWYoIVNUQVRFLmRhdGEubGVuZ3RoKWVsLmlubmVySFRNTD1za2VsZXRvbkhvbWUoKX0KICBjb25zdCBkPWF3YWl0IEJhY2tlbmQuZ2V0RGFzaGJvYXJkKCk7CiAgbG9hZGluZz1mYWxzZTtoaWRlU3BsYXNoKCk7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l5pyN5Yqh5Zyw5Z2A5oiW572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg56ev5YiG6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBQVD17YWNjSWR4OjAsbW9udGg6IiJ9OwpmdW5jdGlvbiBwdEFjY291bnRzKCl7cmV0dXJuIFNUQVRFLmRhdGEmJlNUQVRFLmRhdGEubGVuZ3RoP1NUQVRFLmRhdGE6KFNUQVRFLnBhbmVsQWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwi6LSm5Y+3Iix1c2VySWQ6YS51c2VySWR8fCIifSkpfQpmdW5jdGlvbiBhY2NDaGlwc0h0bWwocHJlZml4KXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuIiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2hpcHMiPicrbGlzdC5tYXAoKGEsaSk9Pic8YnV0dG9uIGNsYXNzPSJhY2MtY2hpcCAnKyhpPT09KHByZWZpeD09PSJwdCI/UFQuYWNjSWR4OlZILmFjY0lkeCk/J29uJzonJykrJyIgb25jbGljaz0icGlja0FjYyhcJycrcHJlZml4KydcJywnK2krJykiPicrZXNjKGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKfQpmdW5jdGlvbiBwaWNrQWNjKHByZWZpeCxpKXtpZihwcmVmaXg9PT0icHQiKXtQVC5hY2NJZHg9aTtyZW5kZXJQb2ludHMoKX1lbHNle1ZILmFjY0lkeD1pO1ZILnZpbj0iIjtyZW5kZXJWZWhpY2xlUGFnZSgpfX0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUG9pbnRzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VQb2ludHMiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFBULmFjY0lkeD49bGlzdC5sZW5ndGgpUFQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3np6/liIbmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBjb25zdCBtb250aD1QVC5tb250aHx8bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKTsKICBjb25zdCBbaXQsY2FsLGNudF0gPSBhd2FpdCBQcm9taXNlLmFsbChbCiAgICBCYWNrZW5kLmludGVncmFsKGFjYy51c2VySWQsMSksCiAgICBCYWNrZW5kLnN1cHBsZW1lbnQoIm1vbnRoIixhY2MudXNlcklkLHttb250aDptb250aH0pLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJjb3VudCIsYWNjLnVzZXJJZCx7fSkKICBdKTsKICBsZXQgaHRtbD1hY2NDaGlwc0h0bWwoInB0Iik7CiAgLy8g5oC76KeICiAgY29uc3QgdG90YWw9aXQmJml0LnRvdGFsP2RlZXBQaWNrKGl0LnRvdGFsLFsiaW50ZWdyYWxUb3RhbCIsInRvdGFsSW50ZWdyYWwiLCJzY29yZSIsImludGVncmFsIiwidG90YWwiXSw0KToiIjsKICBjb25zdCBjYXJkTnVtPWNudCYmY250LmRhdGEhPW51bGw/ZGVlcFBpY2soY250LmRhdGEsWyJjb3VudCIsImNhcmROdW0iLCJjYXJkQ291bnQiLCJudW1iZXIiLCJudW0iXSw0KToiIjsKICBsZXQgZXhwVHh0PSIiOwogIGlmKGl0JiZBcnJheS5pc0FycmF5KGl0LmV4cGlyZSkmJml0LmV4cGlyZS5sZW5ndGgpewogICAgY29uc3QgZTA9aXQuZXhwaXJlLmZpbmQoeD0+TnVtYmVyKHguaW50ZWdyYWxTY29yZSk+MCl8fGl0LmV4cGlyZVswXTsKICAgIGlmKGUwKWV4cFR4dD1TdHJpbmcoZTAuZXhwaXJ5RGF0ZVN0cnx8IiIpKyhOdW1iZXIoZTAuaW50ZWdyYWxTY29yZSk+MD8iIOWIsOacnyAiK2UwLmludGVncmFsU2NvcmUrIiDliIYiOiIiKTsKICB9CiAgaHRtbCs9JzxkaXYgY2xhc3M9InB0LWdyaWQiPicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuW9k+WJjeaAu+enr+WIhjwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModG90YWx8fCItLSIpKyc8L2Rpdj4nKyhleHBUeHQ/JzxkaXYgY2xhc3M9InN1YiI+Jytlc2MoZXhwVHh0KSsnPC9kaXY+JzonJykrJzwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuihpeetvuWNoTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MoY2FyZE51bXx8Ii0tIikrJzwvZGl2PjxkaXYgY2xhc3M9InN1YiI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiIG9uY2xpY2s9InN1cEdhaW4oKSI+56ev5YiG5YWR5o2i6KGl562+5Y2hPC9idXR0b24+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nOwogIC8vIOetvuWIsOaXpeWOhgogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNoZWNrKyfnrb7liLDml6XljoYgwrcgJytlc2MobW9udGgpKyc8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBkYXlzPShjYWwmJmNhbC5kYXRhJiZjYWwuZGF0YS5ub3dTaWduRGV0YWlsVm9zKXx8W107CiAgaWYoZGF5cy5sZW5ndGgpewogICAgaHRtbCs9Y2FsSHRtbChkYXlzLG1vbnRoLGFjYy51c2VySWQpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPicrKGNhbCYmY2FsLm1lc3NhZ2U/ZXNjKGNhbC5tZXNzYWdlKToi5pel5Y6G5Yqg6L295aSx6LSl77yI5Y+v6IO96ZmQ5rWB77yM56iN5ZCO5YaN6K+V77yJIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOenr+WIhua1geawtAogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLnphcCsn56ev5YiG5rWB5rC0PC9oND48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InB0TW9yZUZsb3coKSI+5Yqg6L295pu05aSaPC9idXR0b24+PC9kaXY+PGRpdiBpZD0icHRGbG93Ij4nOwogIGh0bWwrPWZsb3dIdG1sKChpdCYmaXQuZGV0YWlsKXx8W10pOwogIGh0bWwrPSc8L2Rpdj48L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7np6/liIbmlbDmja7mnaXoh6rmnoHmoLjlrp7ml7YgQVBJIMK3IOihpeetvumZkCAzMCDlpKnlhoXmvI/nrb7vvIzmr4/mrKHmtojogJcgMSDlvKDooaXnrb7ljaE8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwogIFBULmZsb3dQYWdlPTE7Cn0KZnVuY3Rpb24gY2FsSHRtbChkYXlzLG1vbnRoLHVzZXJJZCl7CiAgY29uc3QgeW09bW9udGguc3BsaXQoIi0iKTtjb25zdCB5PU51bWJlcih5bVswXSksbT1OdW1iZXIoeW1bMV0pOwogIGNvbnN0IGZpcnN0PW5ldyBEYXRlKHksbS0xLDEpLmdldERheSgpOwogIGNvbnN0IGRpbT1uZXcgRGF0ZSh5LG0sMCkuZ2V0RGF0ZSgpOwogIGNvbnN0IHRvZGF5PW5ldyBEYXRlKCk7Y29uc3QgdFN0cj10b2RheS5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcodG9kYXkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyh0b2RheS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBsZXQgaD0nPGRpdiBjbGFzcz0iY2FsLWdyaWQiPic7CiAgWyLml6UiLCLkuIAiLCLkuowiLCLkuIkiLCLlm5siLCLkupQiLCLlha0iXS5mb3JFYWNoKHc9PntoKz0nPGRpdiBjbGFzcz0iY2FsLXdkIj4nK3crJzwvZGl2Pid9KTsKICBmb3IobGV0IGk9MDtpPGZpcnN0O2krKyloKz0nPGRpdiBjbGFzcz0iY2FsLWQgYmxhbmsiPjwvZGl2Pic7CiAgZm9yKGxldCBkPTE7ZDw9ZGltO2QrKyl7CiAgICBjb25zdCBkcz1tb250aCsiLSIrU3RyaW5nKGQpLnBhZFN0YXJ0KDIsIjAiKTsKICAgIGNvbnN0IGVudHJ5PWRheXMuZmluZCh4PT54LmNyZWF0ZURhdGU9PT1kcyk7CiAgICBjb25zdCBzaWduZWQ9ZW50cnkmJihlbnRyeS5zaWduU3RhdHVlPT0zfHxlbnRyeS5zaWduU3RhdHVlPT01fHxlbnRyeS5zaWduU3RhdHVlPT0wKTsKICAgIGNvbnN0IGlzVG9kYXk9ZHM9PT10U3RyOwogICAgY29uc3QgZnV0dXJlPWRzPnRTdHI7CiAgICBsZXQgY2xzPSJjYWwtZCIrKHNpZ25lZD8iIHNpZ25lZCI6KGZ1dHVyZT8iIGZ1dHVyZSI6KGVudHJ5PyIgbWlzcyI6IiIpKSk7CiAgICBpZihpc1RvZGF5KWNscys9IiB0b2RheSI7CiAgICBjb25zdCBjbGlja2FibGU9IXNpZ25lZCYmIWZ1dHVyZSYmZW50cnk7CiAgICBoKz0nPGRpdiBjbGFzcz0iJytjbHMrJyIgJysoY2xpY2thYmxlPydzdHlsZT0iY3Vyc29yOnBvaW50ZXIiIG9uY2xpY2s9InN1cENvbnN1bWUoXCcnK2RzKydcJyxcJycrZXNjKHVzZXJJZCkrJ1wnKSInOicnKSsnPicKICAgICAgKyc8c3Bhbj4nK2QrJzwvc3Bhbj4nCiAgICAgICsnPHNwYW4gY2xhc3M9ImRvdCI+Jysoc2lnbmVkPyLinJMiOihmdXR1cmU/IiI6KGVudHJ5PyLmvI8iOiIiKSkpKyc8L3NwYW4+JwogICAgICArJzwvZGl2Pic7CiAgfQogIGgrPSc8L2Rpdj4nOwogIGgrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7ngrnlh7vjgIzmvI/jgI3ml6XmnJ/kvb/nlKjooaXnrb7ljaHooaXnrb7vvIjpnIDlhYjmnInooaXnrb7ljaHvvIk8L2Rpdj4nOwogIHJldHVybiBoOwp9CmZ1bmN0aW9uIGZsb3dIdG1sKGxpc3QpewogIGlmKCFsaXN0Lmxlbmd0aClyZXR1cm4gJzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPuaaguaXoOa1geawtOiusOW9lTwvZGl2Pic7CiAgcmV0dXJuIGxpc3QubWFwKHg9PnsKICAgIGNvbnN0IHNjPU51bWJlcih4LmludGVncmFsU2NvcmUpfHwwOwogICAgcmV0dXJuICc8ZGl2IGNsYXNzPSJmbG93LWl0ZW0iPjxkaXY+PGRpdiBjbGFzcz0ibm0iPicrZXNjKHgubmFtZXx8Iuenr+WIhuWPmOWKqCIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ0bSI+Jytlc2MoeC5teURhdGVTdHJ8fHguY3JlYXRlRGF0ZVN0cnx8IiIpKyc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJzYyBudW0gJysoc2M+PTA/InBsdXMiOiJtaW51cyIpKyciPicrKHNjPj0wPyIrIjoiIikrc2MrJzwvZGl2PjwvZGl2Pic7CiAgfSkuam9pbigiIik7Cn0KYXN5bmMgZnVuY3Rpb24gcHRNb3JlRmxvdygpewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1BULmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIFBULmZsb3dQYWdlPShQVC5mbG93UGFnZXx8MSkrMTsKICBjb25zdCBpdD1hd2FpdCBCYWNrZW5kLmludGVncmFsKGFjYy51c2VySWQsUFQuZmxvd1BhZ2UpOwogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdEZsb3ciKTsKICBpZihlbCYmaXQmJkFycmF5LmlzQXJyYXkoaXQuZGV0YWlsKSYmaXQuZGV0YWlsLmxlbmd0aCllbC5pbm5lckhUTUwrPWZsb3dIdG1sKGl0LmRldGFpbCk7CiAgZWxzZSB0b2FzdCgi5rKh5pyJ5pu05aSa5LqGIiwiaW5mbyIpOwp9CmZ1bmN0aW9uIHB0TW9udGhTaGlmdChkaXIpewogIGNvbnN0IGN1cj1QVC5tb250aHx8bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKTsKICBjb25zdCB5bT1jdXIuc3BsaXQoIi0iKTtsZXQgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKStkaXI7CiAgaWYobTwxKXttPTEyO3ktLX1pZihtPjEyKXttPTE7eSsrfQogIFBULm1vbnRoPXkrIi0iK1N0cmluZyhtKS5wYWRTdGFydCgyLCIwIik7CiAgcmVuZGVyUG9pbnRzKCk7Cn0KYXN5bmMgZnVuY3Rpb24gc3VwQ29uc3VtZShkYXRlLHVzZXJJZCl7CiAgY29uZmlybURpYWxvZygi56ev5YiG6KGl562+Iiwi5L2/55SoIDEg5byg6KGl562+5Y2h6KGl562+ICIrZGF0ZSsiIO+8nyIsYXN5bmMgZnVuY3Rpb24oKXsKICAgIHRvYXN0KCLooaXnrb7kuK3igKYiLCJpbmZvIik7CiAgICBjb25zdCBkPWF3YWl0IEJhY2tlbmQuc3VwcGxlbWVudCgiY29uc3VtZSIsdXNlcklkLHtkYXRlVGltZTpkYXRlfSk7CiAgICBpZihkJiZkLm9rKXt0b2FzdCgi6KGl562+5oiQ5YqfIiwib2siKTtyZW5kZXJQb2ludHMoKX0KICAgIGVsc2UgdG9hc3QoIuihpeetvuWksei0pe+8miIrKChkJiYoZC5tZXNzYWdlfHxkLmVycm9yKSl8fCLmnKrnn6UiKSwiZXJyIik7CiAgfSwi56Gu6K6k6KGl562+Iik7Cn0KYXN5bmMgZnVuY3Rpb24gc3VwR2FpbigpewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1BULmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIGNvbmZpcm1EaWFsb2coIuWFkeaNouihpeetvuWNoSIsIuS9v+eUqOenr+WIhuWFkeaNoiAxIOW8oOihpeetvuWNoe+8nyIsYXN5bmMgZnVuY3Rpb24oKXsKICAgIHRvYXN0KCLlhZHmjaLkuK3igKYiLCJpbmZvIik7CiAgICBjb25zdCBkPWF3YWl0IEJhY2tlbmQuc3VwcGxlbWVudCgiZ2FpbiIsYWNjLnVzZXJJZCx7fSk7CiAgICBpZihkJiZkLm9rKXt0b2FzdCgi5YWR5o2i5oiQ5YqfIiwib2siKTtyZW5kZXJQb2ludHMoKX0KICAgIGVsc2UgdG9hc3QoIuWFkeaNouWksei0pe+8miIrKChkJiYoZC5tZXNzYWdlfHxkLmVycm9yKSl8fCLmnKrnn6UiKSwiZXJyIik7CiAgfSwi56Gu6K6k5YWR5o2iIik7Cn0KCi8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg6L2m6L6G6aG177yI55uR5o6nICsg6L2m5o6n5omp5bGVICsg5L+h5oGv5Lit5b+D77yJID09PT09PT09PT09PT09PT09ICovCmxldCBWSD17YWNjSWR4OjAsdmluOiIiLGNwOiIiLGdlYXI6IiIsbG9ja1R5cGU6IjEifTsKYXN5bmMgZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVZlaGljbGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFZILmFjY0lkeD49bGlzdC5sZW5ndGgpVkguYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3ovabovobmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBsZXQgbW9uPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCwiIik7CiAgY29uc3QgdmVoTGlzdD0obW9uJiZBcnJheS5pc0FycmF5KG1vbi52ZWhpY2xlcykpP21vbi52ZWhpY2xlczpbXTsKICBpZihWSC52aW4mJm1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QmJm1vbi5zbmFwc2hvdC52aW4hPT1WSC52aW4pewogICAgY29uc3QgbW9uMj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsVkgudmluKTsKICAgIGlmKG1vbjImJm1vbjIub2spe21vbjIudmVoaWNsZXM9dmVoTGlzdDttb249bW9uMn0KICB9CiAgY29uc3QgW29wdHMsaW5mb109YXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dCh7YWN0aW9uOiJvcHRpb25zIix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn0pLAogICAgQmFja2VuZC5pbmZvQ2VudGVyKGFjYy51c2VySWQsVkgudmlufHwiIikKICBdKTsKICBsZXQgaHRtbD1hY2NDaGlwc0h0bWwoInZoIik7CiAgLy8g6L2m6L6G6YCJ5oup77yI5aSa6L2m77yJCiAgaWYodmVoTGlzdC5sZW5ndGg+MSl7CiAgICBjb25zdCBjdXJWaW49VkgudmlufHwobW9uJiZtb24uc25hcHNob3Q/bW9uLnNuYXBzaG90LnZpbjp2ZWhMaXN0WzBdLnZpbk5vKTsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJvcHQtcm93Ij4nK3ZlaExpc3QubWFwKHY9Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhjdXJWaW49PT12LnZpbk5vPydvbic6JycpKyciIG9uY2xpY2s9IlZILnZpbj1cJycrZXNjKHYudmluTm8pKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyh2LnZlaGljbGVOYW1lfHx2LnZpbk5vKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7CiAgfQogIC8vIOeKtuaAgeebkeaOp+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNhcisn6L2m6L6G54q25oCBPC9oND48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InJlbmRlclZlaGljbGVQYWdlKCkiPuWIt+aWsDwvYnV0dG9uPjwvZGl2Pic7CiAgaWYobW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCl7CiAgICBjb25zdCBzbj1tb24uc25hcHNob3Q7CiAgICBjb25zdCBzb2NDb2w9c24uc29jPD0yMD8idmFyKC0tZXJyKSI6c24uc29jPD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1vaykiOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnlLXph488L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6Jytzb2NDb2wrJyI+Jysoc24uc29jIT1udWxsP3NuLnNvYysiJSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnu63oiKo8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nKyhzbi5yYW5nZSE9bnVsbD9zbi5yYW5nZSsiIGttIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPum+meWktOmUgTwvc3Bhbj48c3BhbiBjbGFzcz0idiI+Jysoc24uaGVhZExvY2s9PT0iMSI/IuW3sumUgSI6IuacqumUgSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Zyo57q/54q25oCBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iY29sb3I6Jysoc24ub2ZmbGluZT8idmFyKC0tZXJyKSI6InZhcigtLW9rKSIpKyciPicrKHNuLm9mZmxpbmU/Iuemu+e6v++8iD4zMOWIhumSn+acquS4iuaKpe+8iSI6IuWcqOe6vyIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyA5ZCO5LiK5oqlPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPicrZXNjKHNuLnJlZnJlc2hUaW1lfHwiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChtb24mJihtb24uZXJyb3J8fG1vbi5tZXNzYWdlKSl8fCLlv6vnhafojrflj5blpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g6L2m5o6n5omp5bGV5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabmjqfmianlsZU8L2g0PjwvZGl2Pic7CiAgY29uc3QgY3BzPShvcHRzJiZBcnJheS5pc0FycmF5KG9wdHMuY2hhcmdlUG93ZXIpKT9vcHRzLmNoYXJnZVBvd2VyOltdOwogIGNvbnN0IGdlYXJzPShvcHRzJiZBcnJheS5pc0FycmF5KG9wdHMuZ2VhcnMpKT9vcHRzLmdlYXJzOltdOwogIGlmKGNwcy5sZW5ndGgpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjRweCI+5YWF55S15Yqf546H77yIV++8iTwvZGl2PjxkaXYgY2xhc3M9Im9wdC1yb3ciPicKICAgICAgK2Nwcy5tYXAobz0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKFZILmNwPT09by5rZXk/J29uJzonJykrJyIgb25jbGljaz0iVkguY3A9XCcnK2VzYyhvLmtleSkrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKG8ua2V5KSsnPC9idXR0b24+Jykuam9pbigiIikKICAgICAgKyc8YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iZXh0U2V0KFwnY2hhcmdlUG93ZXJcJykiPuiuvue9rjwvYnV0dG9uPjwvZGl2Pic7CiAgfQogIGlmKGdlYXJzLmxlbmd0aCl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1ib3R0b206NHB4Ij7pmZDpgJ/moaPkvY3vvIhrbS9o77yJPC9kaXY+PGRpdiBjbGFzcz0ib3B0LXJvdyI+JwogICAgICArZ2VhcnMubWFwKGc9Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhWSC5nZWFyPT09Zz8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC5nZWFyPVwnJytlc2MoZykrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKGcpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdtYXhTcGVlZFwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgaHRtbCs9JzxkaXYgY2xhc3M9InZjLWdyaWQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPicKICAgICsnPGJ1dHRvbiBjbGFzcz0idmMtYnRuIiBvbmNsaWNrPSJleHRTdGVhbCgpIj4nK0kubG9jaysn6Ziy55uX5biD5o6nPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJ2Yy1idG4iIG9uY2xpY2s9ImV4dFNldChcJ3NvdW5kRWZmZWN0XCcpIj4nK0kuemFwKyfpn7PmlYjlvIDlhbM8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9InZjLWJ0biIgb25jbGljaz0iZXh0U2V0KFwnc3RvcmFnZUJveFwnKSI+JytJLnNlYXQrJ+WCqOeJqeeusShWSVApPC9idXR0b24+JwogICAgKyc8L2Rpdj4nOwogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOS/oeaBr+S4reW/g+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmJlbGwrJ+S/oeaBr+S4reW/gzwvaDQ+PC9kaXY+JzsKICBpZihpbmZvJiZpbmZvLm9rKXsKICAgIGNvbnN0IHVuPWluZm8udW5yZWFkIT1udWxsP2RlZXBQaWNrKGluZm8udW5yZWFkLFsidG90YWwiLCJjb3VudCIsInVuUmVhZENvdW50IiwibnVtIl0sMyk6IiI7CiAgICBpZih1biE9PSIiKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyq6K+75raI5oGvPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModW4pKyc8L3NwYW4+PC9kaXY+JzsKICAgIGNvbnN0IHByaXplcz0oaW5mby5wcml6ZVJlY29yZHMmJihpbmZvLnByaXplUmVjb3Jkcy5yZWNvcmRzfHxpbmZvLnByaXplUmVjb3Jkcy5saXN0fHxpbmZvLnByaXplUmVjb3JkcykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkocHJpemVzKSYmcHJpemVzLmxlbmd0aCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjhweCAwIDRweCI+55uy55uSL+S4reWlluiusOW9lTwvZGl2Pic7CiAgICAgIGh0bWwrPXByaXplcy5zbGljZSgwLDUpLm1hcChwPT4nPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2PjxkaXYgY2xhc3M9Im5tIj4nK2VzYyhwLnByaXplc05hbWV8fHAubmFtZXx8IuWlluWTgSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ0bSI+Jytlc2MocC5jcmVhdGVUaW1lfHxwLmNyZWF0ZURhdGV8fCIiKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ic2MgcGx1cyIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nK2VzYyhwLmludGVncmFsPygiKyIrcC5pbnRlZ3JhbCk6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKICAgIH0KICAgIGNvbnN0IGNvdXBvbnM9KGluZm8uY291cG9ucyYmKGluZm8uY291cG9ucy5yZWNvcmRzfHxpbmZvLmNvdXBvbnMubGlzdHx8aW5mby5jb3Vwb25zKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShjb3Vwb25zKSYmY291cG9ucy5sZW5ndGgpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7kvJjmg6DliLg8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nK2NvdXBvbnMubGVuZ3RoKycg5bygPC9zcGFuPjwvZGl2Pic7CiAgICBpZihpbmZvLm90YSE9bnVsbClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPk9UQSDljYfnuqc8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweCI+JysoQXJyYXkuaXNBcnJheShpbmZvLm90YSkmJmluZm8ub3RhLmxlbmd0aD8i5pyJ5paw54mI5pysIjoi5bey5piv5pyA5pawIikrJzwvc3Bhbj48L2Rpdj4nOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4Ij4nK2VzYygoaW5mbyYmKGluZm8uZXJyb3J8fGluZm8ubWVzc2FnZSkpfHwi5L+h5oGv5Lit5b+D5Yqg6L295aSx6LSlIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7ovabmjqfmianlsZXmjIfku6Tnu4/kupHnq6/kuIvlj5HvvIzlk43lupTlj6/og73ovoPmhaLvvJvpmLLnm5cv6Z+z5pWI6ZyA6KaB6L2m6L6G5pSv5oyBPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQphc3luYyBmdW5jdGlvbiBleHRTZXQoYWN0aW9uKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25zdCBib2R5PXthY3Rpb246YWN0aW9uLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifTsKICBpZihhY3Rpb249PT0iY2hhcmdlUG93ZXIiKXtpZighVkguY3Ape3RvYXN0KCLor7flhYjpgInmi6nlhYXnlLXlip/njociLCJlcnIiKTtyZXR1cm59Ym9keS52YWx1ZT1WSC5jcH0KICBpZihhY3Rpb249PT0ibWF4U3BlZWQiKXtpZighVkguZ2Vhcil7dG9hc3QoIuivt+WFiOmAieaLqemZkOmAn+aho+S9jSIsImVyciIpO3JldHVybn1ib2R5LnZhbHVlPVZILmdlYXJ9CiAgaWYoYWN0aW9uPT09InNvdW5kRWZmZWN0Iil7Ym9keS52YWx1ZT0iMSJ9CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoYm9keSk7CiAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKfQphc3luYyBmdW5jdGlvbiBleHRTdGVhbCgpewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIGNvbmZpcm1EaWFsb2coIumYsuebl+W4g+aOpyIsIuWQkei9pui+huS4i+WPkemYsuebl+W4g+aOp+aMh+S7pO+8iGxvY2tUeXBlPTHvvInvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KHthY3Rpb246InZjdVN0ZWFsQ29udHJvbCIsdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiIsbG9ja1R5cGU6VkgubG9ja1R5cGV8fCIxIn0pOwogICAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKICB9LCLkuIvlj5EiKTsKfQoKZnVuY3Rpb24gaW5pdCgpewogIGFwcGx5VGhlbWUoKTttb3VudFRoZW1lQnRuKCk7bW91bnRTaWduaW5GYWIoKTsKICByZW5kZXJDZmcoKTsKICBpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXsKICAgIFNUQVRFLmRhdGE9REVNT19EQVRBO1NUQVRFLnRzVGV4dD1mbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9ZmFsc2U7CiAgICByZW5kZXJIb21lKCk7aGlkZVNwbGFzaCgpO3JldHVybjsKICB9CiAgc3RhcnRBdXRvUmVmcmVzaCgpO3JlZnJlc2hBbGwoZmFsc2UpOwogIC8vIOWFnOW6le+8muaegeerr+aDheWGteS4i+ivt+axgumVv+aXtumXtOaXoOWTjeW6lO+8jOmXquWxj+S5n+S4jeiDveS4gOebtOaMoeS9j+eVjOmdogogIHNldFRpbWVvdXQoaGlkZVNwbGFzaCwxMjAwMCk7Cn0KaW5pdCgpOwo8L3NjcmlwdD4KPCEtLV9fSlM1X18tLT4K";
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
        const name = (acc.userName || "") + " · " + (veh.vehicleName || veh.vinNo);
        if (snap.soc >= 100 && prev.socFull !== true) {
          notifyPush("车辆已充满", name + " 电量 " + snap.soc + "%，续航 " + (snap.range || "-") + " km", cfg);
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
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
        ok: true,
        detail: (dt && dt.code == "10000") ? (dt.data || []) : [],
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
        const [cp, gs] = await Promise.all([
          httpGet(T + "/vehicleSet/chargePower/options?" + cpQuery, socialHeaders(cleanToken(acc.token), acc.userId, cpQuery, '', cfg)),
          httpGet(T + "/vehicleSet/maxSpeed/gear?vinNo=" + encodeURIComponent(vin), { ...base, ...getSign("app", { vinNo: vin }, '', cfg) })
        ]);
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, chargePower: cp && cp.code == "10000" ? cp.data : [], gears: gs && gs.code == "10000" ? gs.data : [] }));
        return;
      } else if (action === "chargePower") {
        // 新协议 addVehicleSet：serviceCode 603980102 = CHARGING_POWER_STANDARD（200-1200，步长100）
        const val = String(body.value || "");
        const payload = JSON.stringify({ serviceCode: 603980102, commandParam: val, flag: true, vin: vin, vehicleSetEnum: "CHARGING_POWER_STANDARD", message: 0 });
        res = await httpPost(T + "/vehicleSet/addVehicleSet", socialHeaders(cleanToken(acc.token), acc.userId, '', payload, cfg), payload);
        okMsg = "充电功率已设为 " + val + "W";
      } else if (action === "maxSpeed") {
        const val = String(body.value || "");
        const payload = JSON.stringify({ vinNo: vin, maxSpeed: val });
        res = await httpPost(T + "/vehicleSet/maxSpeed", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "限速档位已设为 " + val + " km/h";
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