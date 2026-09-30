/*
#!name=极核 ZEEHO 签到面板 V2.14.21
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.14.21

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.14.21, requires-body=true, timeout=60, tag=极核面板V2.14.21

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
// 版本: v2.14.23
// 更新日期: 2026-10-01
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.14.23";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-10-01 v2.14.23 Motoplay导航投屏：高德JS SDK+WiFi直连TCP+车机TFT推送)`);

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
  const result = { hasVehicle: false, vehicleName: "", vinNo: "", voltage: 0, current: 0, batteryTemp: 0, batteryPercent: 0, residualRangeKm: 0, rangeEstimated: false, address: "", locationTime: "", chargeState: "未充电", frontPressure: "", rearPressure: "", frontTemp: "", rearTemp: "", todayDistance: 0, todayDuration: 0, todayMaxSpeed: 0, lastRideMileage: 0, totalMileage: 0, yesterdayDistance: 0, vehicleImageUrl: "", serviceEndDate: "", serviceRemainDays: 0, serviceStatus: "", powerStatus: "", lockState: "", online: "", rideState: "", cushionState: "", longitude: "", latitude: "" };
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
      result.totalMileage = ride.totalMileage || 0;
      result.yesterdayDistance = ride.yesterdayDistance || 0;
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXNocmluazowO292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4yOCl9Ci5icmFuZC1tYXJrIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7b2JqZWN0LWZpdDpjb3Zlcn0KLmJyYW5kLXR4dHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5icmFuZC10eHQgaDF7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4ycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYnJhbmQtdHh0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHh9CgouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIGltZytzdmd7ZGlzcGxheTpub25lfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0g5YWl5Zy66Zeq5bGP77ya6aaW5bin5Y2z5pi+56S677yM5pWw5o2u5bCx57uq5ZCO5reh5Ye6ID09PT09PT09PT09PSAqLwojc3BsYXNoe3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDo5OTk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudCgxMjAlIDYwJSBhdCA1MCUgMCUscmdiYSgxNCwxNDMsMTc4LC4xNiksdHJhbnNwYXJlbnQgNjAlKSx2YXIoLS1iZyk7dHJhbnNpdGlvbjpvcGFjaXR5IC40cyB2YXIoLS1lYXNlKSx0cmFuc2Zvcm0gLjRzIHZhcigtLWVhc2UpfQojc3BsYXNoLm91dHtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKDEuMDQpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5zcC1tYXJre3dpZHRoOjg0cHg7aGVpZ2h0Ojg0cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JveC1zaGFkb3c6MCAxNHB4IDQwcHggcmdiYSgxNCwxNDMsMTc4LC40KTthbmltYXRpb246c3AtaW4gLjZzIHZhcigtLXNwcmluZykgYm90aH0KLnNwLW1hcmsgc3Zne3dpZHRoOjQ2cHg7aGVpZ2h0OjQ2cHh9Ci5zcC10aXRsZXttYXJnaW4tdG9wOjIwcHg7Zm9udC1zaXplOjIxcHg7Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOjFweDthbmltYXRpb246c3AtdXAgLjVzIC4xMnMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLXN1YnttYXJnaW4tdG9wOjdweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQzKTtsZXR0ZXItc3BhY2luZzozcHg7YW5pbWF0aW9uOnNwLXVwIC41cyAuMnMgdmFyKC0tZWFzZSkgYm90aH0KLnNwLWxvYWR7bWFyZ2luLXRvcDozNHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweDtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTthbmltYXRpb246c3AtdXAgLjVzIC4zcyB2YXIoLS1lYXNlKSBib3RofQouc3AtbG9hZCAuc3Bpbm5lcnt3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgc3AtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnNjYWxlKC42KSB0cmFuc2xhdGVZKDEwcHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06c2NhbGUoMSkgdHJhbnNsYXRlWSgwKX19CkBrZXlmcmFtZXMgc3AtdXB7ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTJweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KPC9zdHlsZT4KPHNjcmlwdCBzcmM9Imh0dHBzOi8vd2ViYXBpLmFtYXAuY29tL21hcHM/dj0yLjAma2V5PTVhOTczOWU0MmQxZDQwZWU5Yjg4YTI1ODJlZDkzODE4JnBsdWdpbj1BTWFwLkF1dG9Db21wbGV0ZSxBTWFwLkRyaXZpbmciPjwvc2NyaXB0Pgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJiZy1nbG93Ij48L2Rpdj4KPGRpdiBpZD0ic3BsYXNoIj4KICA8ZGl2IGNsYXNzPSJzcC1tYXJrIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTQgMTMuNUM0IDkuMDggNy41OCA1LjUgMTIgNS41czggMy41OCA4IDgiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMiAxM2w3LjUgNS41IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSIxNi41IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE5IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC10aXRsZSI+5p6B5qC4IFpFRUhPPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3Atc3ViIj7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLWxvYWQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIj48L3NwYW4+5q2j5Zyo5Yqg6L295pWw5o2u4oCmPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PGltZyBzcmM9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBSkFBQUFDUUNBWUFBQURuUnVLNEFBQUFBWE5TUjBJQXJzNGM2UUFBQUZCbFdFbG1UVTBBS2dBQUFBZ0FBZ0VTQUFNQUFBQUJBQUVBQUlkcEFBUUFBQUFCQUFBQUpnQUFBQUFBQTZBQkFBTUFBQUFCQUFFQUFLQUNBQVFBQUFBQkFBQUFrS0FEQUFRQUFBQUJBQUFBa0FBQUFBQXQ0aVNXQUFBQldXbFVXSFJZVFV3NlkyOXRMbUZrYjJKbExuaHRjQUFBQUFBQVBIZzZlRzF3YldWMFlTQjRiV3h1Y3pwNFBTSmhaRzlpWlRwdWN6cHRaWFJoTHlJZ2VEcDRiWEIwYXowaVdFMVFJRU52Y21VZ05pNHdMakFpUGdvZ0lDQThjbVJtT2xKRVJpQjRiV3h1Y3pweVpHWTlJbWgwZEhBNkx5OTNkM2N1ZHpNdWIzSm5MekU1T1Rrdk1ESXZNakl0Y21SbUxYTjViblJoZUMxdWN5TWlQZ29nSUNBZ0lDQThjbVJtT2tSbGMyTnlhWEIwYVc5dUlISmtaanBoWW05MWREMGlJZ29nSUNBZ0lDQWdJQ0FnSUNCNGJXeHVjenAwYVdabVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM1JwWm1Zdk1TNHdMeUkrQ2lBZ0lDQWdJQ0FnSUR4MGFXWm1Pazl5YVdWdWRHRjBhVzl1UGpFOEwzUnBabVk2VDNKcFpXNTBZWFJwYjI0K0NpQWdJQ0FnSUR3dmNtUm1Pa1JsYzJOeWFYQjBhVzl1UGdvZ0lDQThMM0prWmpwU1JFWStDand2ZURwNGJYQnRaWFJoUGdvWlh1RUhBQUFOQ0VsRVFWUjRBZTFkVzB3VlNSb3VSSUtpWWtoRW9tSXdpemhSNG8xVkp6cXJVWGd3V1RYZTBLaHhKRVpkdkNXamtNeXJpWTlHeGxzMEVWK2NqTVliM2pQUmx4R2RIUlBkMFlrODdFWldVTmRSRTBSRkVSRkVZUCt2N1Q2ZWM3ck9wZnQwdzZuVC81Lzg5T202ZGRWWFg2cXF1Lzc2U1JJOUpOM2QzZjNvVWJta28wbEhrV2JwbWtuWGROS0JwSU5JMDBoVFNWTjBUYVlydEE5cGtwL1N6NFNUYm1xUm9WMzB1MVBYRHJwQzIwbGJTZCtSdHBBMmt6YVNOdWo2bUs1MXBQVkpTVWx0ZEhWZDBDR3VDQkZtSEJWY1JEcFYxNi9vNnRyenFHeVdMd2lBaExXa3YrdjZDeEhxUDEraW5mdmxhSWNTYVFxb2F2OGduVWVhN1Z3MXVTUUhFSGhLWmZ4TVdrbGsrc09COHJRaVlpWVFrUVpsRkpOK1IvcU5WaXIvaVhjRWJsSUY5NUZXRVprd1d0bVdtQWhFNVBrYlBma0hVa3hUTE9vaGdDbXVqRWowbTkycTJ5SVFFU2VESG5pUWRLWGRCM08rdUVMZ0JOVm1DeEdweVdxdExCT0l5RE9MSG5LTWRLVFZoM0g2dUViZ1Q2cmRhaUxScjFacWlWZmpxSVhJVTA2SnEwbVpQRkdqcGt4QzlHbTEzc2RSVnpxcUVZZ0tSYm9LMHUxUmw4d0pWVVpnRDFXK1BKb0Zka1FDNmVUNWtRcjhWbVZFdU82V0VmaUpjcFJFSWxFMFV4aEdIaWFQWmZ5Vno0QStSOStIbGJBRTB1ZERucmJDUXBqUWtkc2pyWWxDVG1HVUVXOWJXRENISlZsQ3c4ZU5Bd0xZazVzVDZ1MU1TaUFpRDc3ejFKQmlaYzdDQ09BVmZ5S1J5UFNkS05Ub2dvK0VUQjRtam9FQXVBQk9tTVEwQXRIb2crMkpmNXBTY2dBaklNUk1Hb1VDdGowQ0NFVGt3ZjF0VXQ3YllycklFTURlMmRkRUl0OEdiUEFVaGwxMUpvOE1PZzREQXVBR09PS1RZQUxCSklPRkVRaUhRQUJIZkZNWVRWOHdCcnNiTGlmSE1RSTZBbitsYVV3elN2TWZnVW9aSGtZZ1NnUmdkYXFKL3dpRWQzMDJROVdCNFV0WUJKN1NDS1I5NXRGR0lKcSs4cGs4WVFIanlFQUVzb2t6T0RUaDI2WW9ESXpuTzBZZ0lnSkZTR0dzZ2FaRlRNNEpHSUZBQkRUT0dBVGlieitCNFBCZFpBUTB6aVRSWElZVG96anQ2RnRRUjg3TEtSZ0I3UVJ0R2thZ1hGSW1EelBDS2dMZ1RDNElsR2MxSjZkbkJIUUU4a0NnSElhREViQ0pRQTRJQkM4WkxJeUFIUVN5bUVCMllPTThCZ0lhZ1RLTk83NHlBaFlSeU1RSUJPZE9MSXlBSFFUU1FTQjRCbU5oQk93Z01CQUVHbVFuSitkaEJNQWRFQWcrQ1ZrWUFUc0lhRitpNGRDU2hSR3dnMEFxUmlCNFEyVmhCT3dna01JRXNnTWI1ekVRMEFpVWJOenhsUkd3aUVBeVJpQW1rRVhVT0xrUEFZMUFJQkVMSTJBSGdUNGdEOXNDMllHTzh3Q0JKQ1lRRXlFV0JKTDZna1d4bEJBcGIxVlZsV2hvd1A4Q1lRRUNuWjJkWXRteVpXTFlzR0ZTUU83ZXZTdHUzYm9samJNYU9IcjBhREYzN2x5cjJheWtUeEprRSsycVRKZ3dBWjRjV0hVTVNrdEx1MXRiVzZXWUUzRzZNek16SGNOcTRjS0YwdWM0R1lnUnlGWHAzNysvcStXclZEaVJSeHc2ZEVqMDBaYWVnVFd2cWFrUlM1Y3VGWTJOallFUk1keWxwcnEveWNCdllERjBrSldzYTlhc0VRY09ISkNTcDdhMlZpeGV2Rmc4ZS9iTVNwRnhrWllKMUFQZFVGeGNMQTRmUGl4U1VzeTdSbzhlUFJLTEZpMFN1S29vVENDWGUyM2V2SG5pNk5Ham9sOC9ITDhMRkl3NFM1WXNFZmZ2M3crTVVPaU9DZVJpWjgyWk0wY2NQMzVjREJnd3dQUVVySFV3TXQyN2Q4OFVwMUlBRThpbDNwbytmYm80ZmZxMEdEeDRzT2tKYjk2OEVjdVhMM2ZzZGQzMGdCNE1ZQUs1QVBia3laTUZ2bjhOR1RMRVZIcExTNHRZdFdxVnVINzl1aWxPeFFBbWtNTzlObmJzV0hIdTNEa3hmUGh3VThsdGJXMmlwS1JFWExseXhSU25hZ0FUeU1HZXk4M05GUmN1WEJDalJvMHlsZHJSMFNFMmJOaWdrY3NVcVhBQUU4aWh6c3ZPemhibno1OFhZOGFNTVpYWTFkVWx0bTdkS280ZHd6OTZUQ3hoQWpuUW4wT0hEaFZuejU0VjQ4ZVBsNVpXWGw0dUtpc3JwWEdxQnpLQll1ekJqSXdNY2ViTUdURnRtdG5KMjhlUEgwVlpXWm5ZdTNkdmpFK0ozK3l1NzRVNTBmVDA5SFF4ZS9ac1FaNUJuU2pPc1RLd3A3VjU4Mll4YXhiK001Wlo3dHk1SStycTZnUnRhcG9qdzRTMHQ3ZUxhOWV1Q1JBdzNrVUpBdVhrNUlpTEZ5L0dPNWFtK3MyWU1VTmN1blRKRkI0cEFOK0o4dkx5eE11WEx5TWw3ZlY0SmFZd01qOFFlSXZ4aW1BRVFwdFZFQ1VJcEFLUVhxMmpNZ1JLVHZiTzRSR1p2VkM4RWxTSk5SRE1RRis4ZUNFMWgrZ0pZREdkNEZzT1dRdUdYTWczTnpjN05zMitldlZLbVNsTUNRSTllUEJBa0dsc3lNNXprMFFHZVhiczJLRjlESlE5Qy90YTY5YXRFOWpuY2tKQVZpeWtWUkFsQ1BUcDB5ZEhUVDJ0ZHN5MmJkdkVsaTFicEFTR0FUeDIxcDAwUmJWYXY5NU1yOHdhcUxkQTJyUnBrNmlvcUpDYW9zS1d4Mms3NXQ1cXA5M25Nb0hDSUllZDgvMzc5MHZKQXl0Q1dCTStmLzQ4VEFtSkg4VUVDdEhIT0xzRk8rYStmYzJ6L01PSEQ1VzJZdzdSWkZ2QlRDQUpiUFBuejlmc21HWEhZZ3c3WnB5a1lQbnk3NTRZQ3gyQm9xSWl6ZXdpTGMzcytRK2ZFckRtd1JrdWxzOEk4QWpreHdUc1haMDhlVkpxeDl6VTFLUzliZDIrZmRzdkIvOWtBdWtjS0Nnb2lHakhmT1BHRFdaTUVBSk1JQUlrUHo5Zk16V1ZPVHlBSFROT2xWNjllalVJT3I0RkFwNG5FRHhZd0JRVkppUEJBZ3VBOWV2WGEvSEJjWHovR1FGUEUyamt5SkhheUFQYm0yREJkZ0srUHVOZ0lFdG9CRHhMb0t5c0xJMDhNanRta0FmYkYwZU9IQW1OSE1kb0NKaS9rc1VoTURCbGxYM1FzMXRWSFBqRHFkRXBVNmFZaXNETy84NmRPOFhCZ3dkN2JmY2ZsVkxGZ0U0SkFtR2RnbE1QVHBBSXUrczRianhpeEFnVGVZd0FiSTZ1V0xIQ3VPM3hLOHc1Rml4WW9NU092QklFZ21jTDJWVGpScy9DY0ExdlpiMHByMSsvRnFvWTBDbXhCc0tvb2NxUTdnVHhWR3FyRWdSeW9sTzRESGNRVUlKQXNCR1dlZmR5QjVMZUx4WDdjUEYyQmk0VUtrcXNnV0J6ZzlkcUsrc0N3eFFWWjlLeENKZEpkWFcxdUh6NWN0eDExdnYzN3dWVUJWR0NRRGhndDIvZlBzdDQ0bGd4UGhiS0JIYk1jR3o1OXUxYldUU0hSWW1BRWdTS3NpMEJ5ZURRWVBmdTNRRmh4bzFoeDh6a01SQ3hmMVZpRFdTMWVSczNiaFM3ZHUyU1pvTWRNM3dUZXRVSVhncEtESUVKUnlEWU1ZZnl4MnpZTWF2b2p6bUdQblkxYTBJUnlQREhMUHRpRFQvTVdQT282by9aVlJiRVVIakNFTWp3eHh6S2pobmtVZGtmY3d4OTdHcldoQ0JRWVdGaFdIL01iTWZzSG9lVUp4RDhNWjg2ZFVwcXgyejRZMlk3WmlhUUZBSDRZOFl1ZlNoL3pDdFhya3dZZjh4U0FPSWdVTmtSYU55NGNXSHRtUEUyeG5iTTdqTk1TUUxCSHpQc21MM2tqOWw5S3RoN2duSUVnajltZUlMM21qOW1lOTNyZmk3WENmVGh3d2ZIV2dGL3pDQVBmQVVGQzU2REw5Q0o2bzg1dUwzUjNNUFhvdHZpK2w3WTJyVnJ4Wk1uVHh4cEJ4d2VUSjA2VlZwV2ZYMjl3TC9YeEs2OUtxWVEwb1k0R0RocDBpUUhTNU1YbFVSbUQxMFVGVjhPbU9WMTVkRDRRNkFiVTVnYS9tVGpEenl1RVhHSENjUTBpQVVCalVDWXdsZ1lBVHNJZEdFRTZyU1RrL013QXVBT0U0aDVFQXNDR29HODgwOG9Zb0dLODhvUTZNQUl4QVNTUWNOaDBTQ2dFY2o5ejVYUlZJWFRxSWhBTzBhZ1ZoVnJ6bldPQ3dSYVFhQjNjVkVWcm9TS0NMd0RnWno1RHlFcU5wL3JIQ3NDTFNCUWM2eWxjSDdQSXRBTUFqVjZ0dm5jOEZnUmFBU0JHbUl0aGZON0ZvRUdKcEJuKzk2Umhtc0VldXhJVVZ5SUZ4RjRqQkdvem9zdDV6WTdna0FkTEJMN1VWSDRtTWhXaVk1ZzZwbENZSWlZMW9mc2g5dm94Mzg5MDJ4dXFGTUkxSUk3bU1JZ3YzKys4RjlHSUdvRU5NNFlCUHBYMU5rNElTUHdHWUVBQXYzQ3FEQUNGaEhRT09OYk9OTmkrazhxSU50aUlaemNtd2c4cGZXUDVyM1VtTUlBdzgvZXhJSmJiUU1CSDFmOENWUnBveURPNGswRWZGenhFWWlHcEQ4SWk1dmV4SU5iYlFHQm16cFh0Q3crQXVrRldQZm1iZUhKbkRRaEVBamdpRzhSamFiUlFocjMrTC9XY2c4R1NNVGlaUVR3NnY0MWpVQys0L0FCSTVBZVVlWmxoTGp0WVJFbzh5Y1BVZ1lRQ0FHVTREZTZuTUJ2RmtiQUQ0RVRPamY4Z2tKc29OSlVsa0dwYWtpMWQvMkFISHpqUlFUd2pYQWlFYWdwdVBHbUVRZ0o5SVNyNlNjN1hnaEd6SHYzNE1CcUdYa0FoWlJBaUtBTXY5TGxlL3htOFRRQzMrdGNrSUlROEJZbVMwSFQyUThVdmwwV3gyRUpqOEFlSWsvWWw2cG9DSVEwUDVKK20vQndjUVA5RWZpSmJrcUlRTDVYZHY5STQzZklLY3hJb0JkUVF2ZDdqREMrSmp3QzZPdUk1QUVLRVVjZ2Y2aG9PaXVuZS93bnQ0akU4OC9IdjVWQkFBdG1ySGtxb3EyeEpRS2hVQ0xSTExvY0krVlhmQUNTT0lKWGRieHQ0ZVVwYXJFOGt1Z1BtRWhQNEkrTlVjTWM5d25SbC9qT1k0azhhSlZsQWlFVFBhaUpkQlg5bkVuSzl0UUFSVTFCMzgxRVg2SlA3VFRCOGhRVy9CQ2EwbEJHTWVsM3BOOEV4L045WENJQXN4M3NxbGNSY2NLK1pVV3FmY3dFOG44QWthbUE3a3RKLzA3SzVySCs0UFQrNzZkVUJWZ1NWaEpwWVB2bGlEaEtJUDhhRVpueTZiNlFkQm9wekVQR2tMcjJQQ3FiNVFzQ0dGVncxZzlURkU3Y1hDUFMvSnV1amt1UGRTZ1Jxai9WL2kra2VhUTVwRm02WnRJMW5YUWc2U0RTTk5KVTBoUmRrK2tLeFhvTjlUV1VmaWFjb09NTnhTdDFwNjV3aEFxRlAwdWNJb1pYT1RnR2cyK25SbEo0V0lIK2ovUUJhVDBSQmdkR1haZi9BN1kxZC81SUpaZGRBQUFBQUVsRlRrU3VRbUNDIiBhbHQ9IlpFRUhPIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJyYW5kLXR4dCI+CiAgICAgIDxoMT7mnoHmoLggWkVFSE88L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIAogICAgPC9kaXY+CiAgPC9oZWFkZXI+CgogIDxtYWluIGlkPSJtYWluIj4KICAgIDxkaXYgY2xhc3M9InB0ci13cmFwIiBpZD0icHRyV3JhcCI+CiAgICAgIDxkaXYgY2xhc3M9InB0ci1pbmRpY2F0b3IiIGlkPSJwdHJJbmQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIiBpZD0icHRyU3BpbiI+PC9zcGFuPjxzcGFuIGlkPSJwdHJUeHQiPuS4i+aLieWIt+aWsDwvc3Bhbj48L2Rpdj4KICAgICAgPGRpdiBpZD0icGFnZUhvbWUiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlUG9pbnRzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VWZWhpY2xlIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VMb2dzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VDZmciIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogIDwvbWFpbj4KCiAgPG5hdiBjbGFzcz0idGFiYmFyIj4KICAgIDxidXR0b24gY2xhc3M9InRhYiBvbiIgZGF0YS10YWI9ImhvbWUiIG9uY2xpY2s9InN3aXRjaFRhYignaG9tZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTAuNSAxMiAzbDkgNy41Ii8+PHBhdGggZD0iTTUgOS41VjIxaDE0VjkuNSIvPjwvc3ZnPgogICAgICDpppbpobU8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0icG9pbnRzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3BvaW50cycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOC42Ii8+PHBhdGggZD0iTTkgOC41bDMgNCAzLTRNMTIgMTIuNVYxN005LjYgMTMuNGg0LjhNOS42IDE1LjRoNC44Ii8+PC9zdmc+CiAgICAgIOenr+WIhjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJ2ZWhpY2xlIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3ZlaGljbGUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik00IDEzbDEuNy00LjZBMiAyIDAgMCAxIDcuNiA3aDguOGEyIDIgMCAwIDEgMS45IDEuNEwyMCAxMyIvPjxwYXRoIGQ9Ik0zLjUgMTNoMTdhMSAxIDAgMCAxIDEgMXYzLjVoLTIuNk0yLjUgMTcuNVYxNGExIDEgMCAwIDEgMS0xIi8+PHBhdGggZD0iTTUuMSAxNy41SDIuNSIvPjxjaXJjbGUgY3g9IjcuMyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxjaXJjbGUgY3g9IjE2LjciIGN5PSIxNy4zIiByPSIxLjkiLz48cGF0aCBkPSJNOS4yIDE3LjNoNS42Ii8+PC9zdmc+CiAgICAgIOi9pui+hjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJsb2dzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2xvZ3MnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04IDZoMTNNOCAxMmgxM004IDE4aDEzIi8+PHBhdGggZD0iTTMgNmguMDFNMyAxMmguMDFNMyAxOGguMDEiLz48L3N2Zz4KICAgICAg5pel5b+XPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImNmZyIgb25jbGljaz0ic3dpdGNoVGFiKCdjZmcnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz48cGF0aCBkPSJNMTkuNCAxNWExLjY1IDEuNjUgMCAwIDAgLjMzIDEuODJsLjA2LjA2YTIgMiAwIDEgMS0yLjgzIDIuODNsLS4wNi0uMDZhMS42NSAxLjY1IDAgMCAwLTEuODItLjMzIDEuNjUgMS42NSAwIDAgMC0xIDEuNTFWMjFhMiAyIDAgMSAxLTQgMHYtLjA5YTEuNjUgMS42NSAwIDAgMC0xLTEuNTEgMS42NSAxLjY1IDAgMCAwLTEuODIuMzNsLS4wNi4wNmEyIDIgMCAxIDEtMi44My0yLjgzbC4wNi0uMDZhMS42NSAxLjY1IDAgMCAwIC4zMy0xLjgyIDEuNjUgMS42NSAwIDAgMC0xLjUxLTFIM2EyIDIgMCAxIDEgMC00aC4wOWExLjY1IDEuNjUgMCAwIDAgMS41MS0xIDEuNjUgMS42NSAwIDAgMC0uMzMtMS44MmwtLjA2LS4wNmEyIDIgMCAxIDEgMi44My0yLjgzbC4wNi4wNmExLjY1IDEuNjUgMCAwIDAgMS44Mi4zM2guMDFhMS42NSAxLjY1IDAgMCAwIDEtMS41MVYzYTIgMiAwIDEgMSA0IDB2LjA5YTEuNjUgMS42NSAwIDAgMCAxIDEuNTFoLjAxYTEuNjUgMS42NSAwIDAgMCAxLjgyLS4zM2wuMDYtLjA2YTIgMiAwIDEgMSAyLjgzIDIuODNsLS4wNi4wNmExLjY1IDEuNjUgMCAwIDAtLjMzIDEuODJ2LjAxYTEuNjUgMS42NSAwIDAgMCAxLjUxIDFIMjFhMiAyIDAgMSAxIDAgNGgtLjA5YTEuNjUgMS42NSAwIDAgMC0xLjUxIDF6Ii8+PC9zdmc+CiAgICAgIOiuvue9rjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgPC9uYXY+CgogIDxkaXYgY2xhc3M9InNoZWV0LWJhY2tkcm9wIiBpZD0ic2hlZXRCYWNrZHJvcCIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzaGVldCIgaWQ9InNoZWV0Ij4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWdyYWIiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtaGVhZCI+CiAgICAgIDxoMyBpZD0ic2hlZXRUaXRsZSI+PC9oMz4KICAgICAgPGJ1dHRvbiBjbGFzcz0ic2hlZXQtY2xvc2UiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ib2R5IiBpZD0ic2hlZXRCb2R5Ij48L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBpZD0idG9hc3QiIHJvbGU9InN0YXR1cyI+PC9kaXY+CiAgPGRpdiBjbGFzcz0iY29uZmlybS1sYXllciBoaWRkZW4iIGlkPSJjb25maXJtTGF5ZXIiPjwvZGl2Pgo8L2Rpdj4KPHNjcmlwdD4KInVzZSBzdHJpY3QiOwovKiA9PT09PT09PT09PT09PT09PSDluLjph48gPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQVBQX1ZFUlNJT04gPSAidjIuMTQuMjEiOwpjb25zdCBLRVlTID0geyBjZmc6InplZWhvX2NmZyIsIGFjY291bnRzOiJ6ZWVob19hY2NvdW50cyIsIGxvZ3M6InplZWhvX2xvZ3MiIH07CgovKiA9PT09PT09PT09PT09PT09PSDlt6Xlhbflh73mlbAgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZ2V0VXVpZCgpe2NvbnN0IHA9Inh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCIsYz0iYWJjZGVmMDEyMzQ1Njc4OSI7bGV0IHI9IiI7Zm9yKGNvbnN0IGNoIG9mIHApe2lmKGNoPT09IngifHxjaD09PSJ5Iil7Y29uc3Qgbj1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTYpO3IrPShjaD09PSJ5Ij8obiYweDMpfDB4ODpuKS50b1N0cmluZygxNil9ZWxzZSByKz1jaH1yZXR1cm4gcn0KZnVuY3Rpb24gZ2V0UmFuZG9tQ2hhcnMobj0xNil7Y29uc3QgYz0iMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiO2xldCByPSIiO2ZvcihsZXQgaT0wO2k8bjtpKyspcis9Yy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmMubGVuZ3RoKSk7cmV0dXJuIHJ9CmZ1bmN0aW9uIHRvUXVlcnkocD17fSl7cmV0dXJuIE9iamVjdC5rZXlzKHApLmZpbHRlcihrPT5wW2tdIT09dW5kZWZpbmVkJiZwW2tdIT09bnVsbCkuc29ydCgpLm1hcChrPT5rKyI9IitwW2tdKS5qb2luKCImIil9CmZ1bmN0aW9uIGNsZWFuVG9rZW4odCl7cmV0dXJuIFN0cmluZyh0fHwiIikudHJpbSgpLnJlcGxhY2UoL15bYkJdZWFyZXJccysvaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIil9CmZ1bmN0aW9uIGNsZWFuQmFya0tleShiKXtsZXQgcz1TdHJpbmcoYnx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWFya1xzKihrZXkpP1xzKls677yaXVxzKi9pLCIiKS5yZXBsYWNlKC9bXHMiJ2BdKy9nLCIiKS50cmltKCk7cmV0dXJuIHMucmVwbGFjZSgvXC8rJC8sIiIpfQpmdW5jdGlvbiBtYXNrVmluKHYpe2NvbnN0IHM9U3RyaW5nKHZ8fCIiKTtpZighcylyZXR1cm4iIjtpZihzLmxlbmd0aDw9NylyZXR1cm4iKioqKiI7cmV0dXJuIHMuc3Vic3RyaW5nKDAsMykrIioqKioiK3Muc3Vic3RyaW5nKHMubGVuZ3RoLTQpfQpmdW5jdGlvbiBkZWVwUGljayhvYmosa2V5cyxkZXB0aCl7aWYoIW9ianx8dHlwZW9mIG9iaiE9PSJvYmplY3QifHwoZGVwdGh8fDApPjUpcmV0dXJuIiI7Zm9yKGNvbnN0IGsgb2Yga2V5cyl7aWYob2JqW2tdIT09dW5kZWZpbmVkJiZvYmpba10hPT1udWxsJiZvYmpba10hPT0iIilyZXR1cm4gU3RyaW5nKG9ialtrXSl9Zm9yKGNvbnN0IGsgaW4gb2JqKXtpZihvYmpba10mJnR5cGVvZiBvYmpba109PT0ib2JqZWN0Iil7Y29uc3Qgcj1kZWVwUGljayhvYmpba10sa2V5cywoZGVwdGh8fDApKzEpO2lmKHIpcmV0dXJuIHJ9fXJldHVybiIifQpmdW5jdGlvbiBwaWNrSW90UHJvcChkLGlkZW50aWZ5KXtjb25zdCBhcnI9ZCYmZC5pb3RQcm9wZXJ0aWVzO2lmKEFycmF5LmlzQXJyYXkoYXJyKSl7Y29uc3Qga2V5PVN0cmluZyhpZGVudGlmeSkudG9Mb3dlckNhc2UoKTtmb3IoY29uc3QgaXQgb2YgYXJyKXtpZihpdCYmU3RyaW5nKGl0LmlkZW50aWZ5fHwiIikudG9Mb3dlckNhc2UoKT09PWtleSYmaXQudmFsdWUhPT1udWxsJiZpdC52YWx1ZSE9PXVuZGVmaW5lZCYmaXQudmFsdWUhPT0iIilyZXR1cm4gU3RyaW5nKGl0LnZhbHVlKX19cmV0dXJuIiJ9CmZ1bmN0aW9uIGdldERldmljZUlkZW50aWZ5KGFjYyl7Y29uc3Qgc2VlZD1TdHJpbmcoYWNjLnVzZXJJZHx8YWNjLnZpbk5vfHwiemVlaG8tZGV2aWNlIik7bGV0IGg9MDtmb3IobGV0IGk9MDtpPHNlZWQubGVuZ3RoO2krKyl7aD0oKGg8PDUpLWgrc2VlZC5jaGFyQ29kZUF0KGkpKXwwfXJldHVybihNYXRoLmFicyhoKS50b1N0cmluZygxNikrIjAwMDAwMDAwMDAwMDAwMDAiKS5zbGljZSgwLDE2KX0KZnVuY3Rpb24gaGFzVmFsaWRDb29yZChsYXQsbG5nKXtpZihsYXQ9PT0iInx8bGF0PT09bnVsbHx8bGF0PT09dW5kZWZpbmVkfHxsbmc9PT0iInx8bG5nPT09bnVsbHx8bG5nPT09dW5kZWZpbmVkKXJldHVybiBmYWxzZTtjb25zdCBsYT1OdW1iZXIobGF0KSxsbj1OdW1iZXIobG5nKTtyZXR1cm4gaXNGaW5pdGUobGEpJiZpc0Zpbml0ZShsbikmJk1hdGguYWJzKGxhKTw9OTAmJk1hdGguYWJzKGxuKTw9MTgwJiYhKGxhPT09MCYmbG49PT0wKX0KZnVuY3Rpb24gbm9ybWFsaXplUmVmcmVzaFNlYyh2KXtjb25zdCBuPU51bWJlcih2KTtpZighaXNGaW5pdGUobil8fG48PTApcmV0dXJuIDYwO3JldHVybiBNYXRoLm1heCgxNSxNYXRoLm1pbigzNjAwLE1hdGgucm91bmQobikpKX0KZnVuY3Rpb24gZXNjKHMpe3JldHVybiBTdHJpbmcocz09bnVsbD8iIjpzKS5yZXBsYWNlKC8mL2csIiZhbXA7IikucmVwbGFjZSgvPC9nLCImbHQ7IikucmVwbGFjZSgvPi9nLCImZ3Q7IikucmVwbGFjZSgvIi9nLCImcXVvdDsiKX0KCi8qID09PT09PT09PT09PT09PT09IE1ENSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBtZDUodCxlKXtmdW5jdGlvbiBuKHQsZSl7cmV0dXJuIHQ8PGV8dD4+PjMyLWV9ZnVuY3Rpb24gcih0LGUpe3ZhciBuLHIsbyxpLGE7cmV0dXJuIG89MjE0NzQ4MzY0OCZ0LGk9MjE0NzQ4MzY0OCZlLGE9KDEwNzM3NDE4MjMmdCkrKDEwNzM3NDE4MjMmZSksKG49MTA3Mzc0MTgyNCZ0KSYocj0xMDczNzQxODI0JmUpPzIxNDc0ODM2NDheYV5vXmk6bnxyPzEwNzM3NDE4MjQmYT8zMjIxMjI1NDcyXmFeb15pOjEwNzM3NDE4MjReYV5vXmk6YV5vXml9ZnVuY3Rpb24gbyh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZlfH50Jm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gaSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZufGUmfm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdF5lXm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gdSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gZV4odHx+bil9KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYyh0KXt2YXIgZSxuPSIiLHI9IiI7Zm9yKGU9MDtlPD0zO2UrKyluKz0ocj0iMCIrKHQ+Pj44KmUmMjU1KS50b1N0cmluZygxNikpLnN1YnN0cihyLmxlbmd0aC0yLDIpO3JldHVybiBufXZhciBzLGwsZixwLGQsaCx2LHksZyxtPUFycmF5KCk7Zm9yKG09ZnVuY3Rpb24odCl7Zm9yKHZhciBlLG49dC5sZW5ndGgscj1uKzgsbz0xNiooKHItciU2NCkvNjQrMSksaT1BcnJheShvLTEpLGE9MCx1PTA7dTxuOylhPXUlNCo4LGlbZT0odS11JTQpLzRdPWlbZV18dC5jaGFyQ29kZUF0KHUpPDxhLHUrKztyZXR1cm4gYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfDEyODw8YSxpW28tMl09bjw8MyxpW28tMV09bj4+PjI5LGl9KHQ9ZnVuY3Rpb24odCl7dD10LnJlcGxhY2UoL1xyXG4vZywiXG4iKTtmb3IodmFyIGU9IiIsbj0wO248dC5sZW5ndGg7bisrKXt2YXIgcj10LmNoYXJDb2RlQXQobik7cjwxMjg/ZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyKTpyPjEyNyYmcjwyMDQ4PyhlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjZ8MTkyKSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSk6KGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+MTJ8MjI0KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjYmNjN8MTI4KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSl9cmV0dXJuIGV9KHQpKSxoPTE3MzI1ODQxOTMsdj00MDIzMjMzNDE3LHk9MjU2MjM4MzEwMixnPTI3MTczMzg3OCxzPTA7czxtLmxlbmd0aDtzKz0xNilsPWgsZj12LHA9eSxkPWcsaD1vKGgsdix5LGcsbVtzKzBdLDcsMzYxNDA5MDM2MCksZz1vKGcsaCx2LHksbVtzKzFdLDEyLDM5MDU0MDI3MTApLHk9byh5LGcsaCx2LG1bcysyXSwxNyw2MDYxMDU4MTkpLHY9byh2LHksZyxoLG1bcyszXSwyMiwzMjUwNDQxOTY2KSxoPW8oaCx2LHksZyxtW3MrNF0sNyw0MTE4NTQ4Mzk5KSxnPW8oZyxoLHYseSxtW3MrNV0sMTIsMTIwMDA4MDQyNikseT1vKHksZyxoLHYsbVtzKzZdLDE3LDI4MjE3MzU5NTUpLHY9byh2LHksZyxoLG1bcys3XSwyMiw0MjQ5MjYxMzEzKSxoPW8oaCx2LHksZyxtW3MrOF0sNywxNzcwMDM1NDE2KSxnPW8oZyxoLHYseSxtW3MrOV0sMTIsMjMzNjU1Mjg3OSkseT1vKHksZyxoLHYsbVtzKzEwXSwxNyw0Mjk0OTI1MjMzKSx2PW8odix5LGcsaCxtW3MrMTFdLDIyLDIzMDQ1NjMxMzQpLGg9byhoLHYseSxnLG1bcysxMl0sNywxODA0NjAzNjgyKSxnPW8oZyxoLHYseSxtW3MrMTNdLDEyLDQyNTQ2MjYxOTUpLHk9byh5LGcsaCx2LG1bcysxNF0sMTcsMjc5Mjk2NTAwNiksaD1pKGgsdj1vKHYseSxnLGgsbVtzKzE1XSwyMiwxMjM2NTM1MzI5KSx5LGcsbVtzKzFdLDUsNDEyOTE3MDc4NiksZz1pKGcsaCx2LHksbVtzKzZdLDksMzIyNTQ2NTY2NCkseT1pKHksZyxoLHYsbVtzKzExXSwxNCw2NDM3MTc3MTMpLHY9aSh2LHksZyxoLG1bcyswXSwyMCwzOTIxMDY5OTk0KSxoPWkoaCx2LHksZyxtW3MrNV0sNSwzNTkzNDA4NjA1KSxnPWkoZyxoLHYseSxtW3MrMTBdLDksMzgwMTYwODMpLHk9aSh5LGcsaCx2LG1bcysxNV0sMTQsMzYzNDQ4ODk2MSksdj1pKHYseSxnLGgsbVtzKzRdLDIwLDM4ODk0Mjk0NDgpLGg9aShoLHYseSxnLG1bcys5XSw1LDU2ODQ0NjQzOCksZz1pKGcsaCx2LHksbVtzKzE0XSw5LDMyNzUxNjM2MDYpLHk9aSh5LGcsaCx2LG1bcyszXSwxNCw0MTA3NjAzMzM1KSx2PWkodix5LGcsaCxtW3MrOF0sMjAsMTE2MzUzMTUwMSksaD1pKGgsdix5LGcsbVtzKzEzXSw1LDI4NTAyODU4MjkpLGc9aShnLGgsdix5LG1bcysyXSw5LDQyNDM1NjM1MTIpLHk9aSh5LGcsaCx2LG1bcys3XSwxNCwxNzM1MzI4NDczKSxoPWEoaCx2PWkodix5LGcsaCxtW3MrMTJdLDIwLDIzNjgzNTk1NjIpLHksZyxtW3MrNV0sNCw0Mjk0NTg4NzM4KSxnPWEoZyxoLHYseSxtW3MrOF0sMTEsMjI3MjM5MjgzMykseT1hKHksZyxoLHYsbVtzKzExXSwxNiwxODM5MDMwNTYyKSx2PWEodix5LGcsaCxtW3MrMTRdLDIzLDQyNTk2NTc3NDApLGg9YShoLHYseSxnLG1bcysxXSw0LDI3NjM5NzUyMzYpLGc9YShnLGgsdix5LG1bcys0XSwxMSwxMjcyODkzMzUzKSx5PWEoeSxnLGgsdixtW3MrN10sMTYsNDEzOTQ2OTY2NCksdj1hKHYseSxnLGgsbVtzKzEwXSwyMywzMjAwMjM2NjU2KSxoPWEoaCx2LHksZyxtW3MrMTNdLDQsNjgxMjc5MTc0KSxnPWEoZyxoLHYseSxtW3MrMF0sMTEsMzkzNjQzMDA3NCkseT1hKHksZyxoLHYsbVtzKzNdLDE2LDM1NzI0NDUzMTcpLHY9YSh2LHksZyxoLG1bcys2XSwyMyw3NjAyOTE4OSksaD1hKGgsdix5LGcsbVtzKzldLDQsMzY1NDYwMjgwOSksZz1hKGcsaCx2LHksbVtzKzEyXSwxMSwzODczMTUxNDYxKSx5PWEoeSxnLGgsdixtW3MrMTVdLDE2LDUzMDc0MjUyMCksaD11KGgsdj1hKHYseSxnLGgsbVtzKzJdLDIzLDMyOTk2Mjg2NDUpLHksZyxtW3MrMF0sNiw0MDk2MzM2NDUyKSxnPXUoZyxoLHYseSxtW3MrN10sMTAsMTEyNjg5MTQxNSkseT11KHksZyxoLHYsbVtzKzE0XSwxNSwyODc4NjEyMzkxKSx2PXUodix5LGcsaCxtW3MrNV0sMjEsNDIzNzUzMzI0MSksaD11KGgsdix5LGcsbVtzKzEyXSw2LDE3MDA0ODU1NzEpLGc9dShnLGgsdix5LG1bcyszXSwxMCwyMzk5OTgwNjkwKSx5PXUoeSxnLGgsdixtW3MrMTBdLDE1LDQyOTM5MTU3NzMpLHY9dSh2LHksZyxoLG1bcysxXSwyMSwyMjQwMDQ0NDk3KSxoPXUoaCx2LHksZyxtW3MrOF0sNiwxODczMzEzMzU5KSxnPXUoZyxoLHYseSxtW3MrMTVdLDEwLDQyNjQzNTU1NTIpLHk9dSh5LGcsaCx2LG1bcys2XSwxNSwyNzM0NzY4OTE2KSx2PXUodix5LGcsaCxtW3MrMTNdLDIxLDEzMDkxNTE2NDkpLGg9dShoLHYseSxnLG1bcys0XSw2LDQxNDk0NDQyMjYpLGc9dShnLGgsdix5LG1bcysxMV0sMTAsMzE3NDc1NjkxNykseT11KHksZyxoLHYsbVtzKzJdLDE1LDcxODc4NzI1OSksdj11KHYseSxnLGgsbVtzKzldLDIxLDM5NTE0ODE3NDUpLGg9cihoLGwpLHY9cih2LGYpLHk9cih5LHApLGc9cihnLGQpO3JldHVybiAzMj09ZT8oYyhoKStjKHYpK2MoeSkrYyhnKSkudG9Mb3dlckNhc2UoKTooYyh2KStjKHkpKS50b0xvd2VyQ2FzZSgpfQovKiA9PT09PT09PT09PT09PT09PSBTSEExID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHNoYTEobXNnKXtmdW5jdGlvbiByb3RhdGVfbGVmdChuLHMpe3ZhciB0ND0objw8cyl8KG4+Pj4oMzItcykpO3JldHVybiB0NH07ZnVuY3Rpb24gY3Z0X2hleCh2YWwpe3ZhciBzdHI9Jyc7dmFyIGk7dmFyIHY7Zm9yKGk9NztpPj0wO2ktLSl7dj0odmFsPj4+KGkqNCkpJjB4MGY7c3RyKz12LnRvU3RyaW5nKDE2KX1yZXR1cm4gc3RyfTtmdW5jdGlvbiBVdGY4RW5jb2RlKHN0cmluZyl7c3RyaW5nPXN0cmluZy5yZXBsYWNlKC9cclxuL2csJ1xuJyk7dmFyIHV0ZnRleHQ9Jyc7Zm9yKHZhciBuPTA7bjxzdHJpbmcubGVuZ3RoO24rKyl7dmFyIGM9c3RyaW5nLmNoYXJDb2RlQXQobik7aWYoYzwxMjgpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYyl9ZWxzZSBpZigoYz4xMjcpJiYoYzwyMDQ4KSl7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+Nil8MTkyKTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfWVsc2V7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+MTIpfDIyNCk7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoKGM+PjYpJjYzKXwxMjgpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpfDEyOCl9fXJldHVybiB1dGZ0ZXh0fTt2YXIgYmxvY2tzdGFydDt2YXIgaSxqO3ZhciBXPW5ldyBBcnJheSg4MCk7dmFyIEgwPTB4Njc0NTIzMDE7dmFyIEgxPTB4RUZDREFCODk7dmFyIEgyPTB4OThCQURDRkU7dmFyIEgzPTB4MTAzMjU0NzY7dmFyIEg0PTB4QzNEMkUxRjA7dmFyIEEsQixDLEQsRTt2YXIgdGVtcDttc2c9VXRmOEVuY29kZShtc2cpO3ZhciBtc2dfbGVuPW1zZy5sZW5ndGg7dmFyIHdvcmRfYXJyYXk9bmV3IEFycmF5KCk7Zm9yKGk9MDtpPG1zZ19sZW4tMztpKz00KXtqPW1zZy5jaGFyQ29kZUF0KGkpPDwyNHxtc2cuY2hhckNvZGVBdChpKzEpPDwxNnxtc2cuY2hhckNvZGVBdChpKzIpPDw4fG1zZy5jaGFyQ29kZUF0KGkrMyk7d29yZF9hcnJheS5wdXNoKGopfXN3aXRjaChtc2dfbGVuJTQpe2Nhc2UgMDppPTB4MDgwMDAwMDAwO2JyZWFrO2Nhc2UgMTppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDI0fDB4MDgwMDAwMDticmVhaztjYXNlIDI6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwxNnwweDA4MDAwO2JyZWFrO2Nhc2UgMzppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMyk8PDI0fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMik8PDE2fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDh8MHg4MDticmVha313b3JkX2FycmF5LnB1c2goaSk7d2hpbGUoKHdvcmRfYXJyYXkubGVuZ3RoJTE2KSE9MTQpd29yZF9hcnJheS5wdXNoKDApO3dvcmRfYXJyYXkucHVzaChtc2dfbGVuPj4+MjkpO3dvcmRfYXJyYXkucHVzaCgobXNnX2xlbjw8MykmMHgwZmZmZmZmZmYpO2ZvcihibG9ja3N0YXJ0PTA7YmxvY2tzdGFydDx3b3JkX2FycmF5Lmxlbmd0aDtibG9ja3N0YXJ0Kz0xNil7Zm9yKGk9MDtpPDE2O2krKylXW2ldPXdvcmRfYXJyYXlbYmxvY2tzdGFydCtpXTtmb3IoaT0xNjtpPD03OTtpKyspV1tpXT1yb3RhdGVfbGVmdChXW2ktM11eV1tpLThdXldbaS0xNF1eV1tpLTE2XSwxKTtBPUgwO0I9SDE7Qz1IMjtEPUgzO0U9SDQ7Zm9yKGk9MDtpPD0xOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfCh+QiZEKSkrRStXW2ldKzB4NUE4Mjc5OTkpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTIwO2k8PTM5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweDZFRDlFQkExKSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT00MDtpPD01OTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfChCJkQpfChDJkQpKStFK1dbaV0rMHg4RjFCQkNEQykmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NjA7aTw9Nzk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKyhCXkNeRCkrRStXW2ldKzB4Q0E2MkMxRDYpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfUgwPShIMCtBKSYweDBmZmZmZmZmZjtIMT0oSDErQikmMHgwZmZmZmZmZmY7SDI9KEgyK0MpJjB4MGZmZmZmZmZmO0gzPShIMytEKSYweDBmZmZmZmZmZjtIND0oSDQrRSkmMHgwZmZmZmZmZmZ9dmFyIHRlbXA9Y3Z0X2hleChIMCkrY3Z0X2hleChIMSkrY3Z0X2hleChIMikrY3Z0X2hleChIMykrY3Z0X2hleChINCk7cmV0dXJuIHRlbXAudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gQUVTLTI1Ni1FQ0IgKyBQS0NTNyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBRVNfU0JPWD1uZXcgVWludDhBcnJheShbMHg2MywweDdjLDB4NzcsMHg3YiwweGYyLDB4NmIsMHg2ZiwweGM1LDB4MzAsMHgwMSwweDY3LDB4MmIsMHhmZSwweGQ3LDB4YWIsMHg3NiwweGNhLDB4ODIsMHhjOSwweDdkLDB4ZmEsMHg1OSwweDQ3LDB4ZjAsMHhhZCwweGQ0LDB4YTIsMHhhZiwweDljLDB4YTQsMHg3MiwweGMwLDB4YjcsMHhmZCwweDkzLDB4MjYsMHgzNiwweDNmLDB4ZjcsMHhjYywweDM0LDB4YTUsMHhlNSwweGYxLDB4NzEsMHhkOCwweDMxLDB4MTUsMHgwNCwweGM3LDB4MjMsMHhjMywweDE4LDB4OTYsMHgwNSwweDlhLDB4MDcsMHgxMiwweDgwLDB4ZTIsMHhlYiwweDI3LDB4YjIsMHg3NSwweDA5LDB4ODMsMHgyYywweDFhLDB4MWIsMHg2ZSwweDVhLDB4YTAsMHg1MiwweDNiLDB4ZDYsMHhiMywweDI5LDB4ZTMsMHgyZiwweDg0LDB4NTMsMHhkMSwweDAwLDB4ZWQsMHgyMCwweGZjLDB4YjEsMHg1YiwweDZhLDB4Y2IsMHhiZSwweDM5LDB4NGEsMHg0YywweDU4LDB4Y2YsMHhkMCwweGVmLDB4YWEsMHhmYiwweDQzLDB4NGQsMHgzMywweDg1LDB4NDUsMHhmOSwweDAyLDB4N2YsMHg1MCwweDNjLDB4OWYsMHhhOCwweDUxLDB4YTMsMHg0MCwweDhmLDB4OTIsMHg5ZCwweDM4LDB4ZjUsMHhiYywweGI2LDB4ZGEsMHgyMSwweDEwLDB4ZmYsMHhmMywweGQyLDB4Y2QsMHgwYywweDEzLDB4ZWMsMHg1ZiwweDk3LDB4NDQsMHgxNywweGM0LDB4YTcsMHg3ZSwweDNkLDB4NjQsMHg1ZCwweDE5LDB4NzMsMHg2MCwweDgxLDB4NGYsMHhkYywweDIyLDB4MmEsMHg5MCwweDg4LDB4NDYsMHhlZSwweGI4LDB4MTQsMHhkZSwweDVlLDB4MGIsMHhkYiwweGUwLDB4MzIsMHgzYSwweDBhLDB4NDksMHgwNiwweDI0LDB4NWMsMHhjMiwweGQzLDB4YWMsMHg2MiwweDkxLDB4OTUsMHhlNCwweDc5LDB4ZTcsMHhjOCwweDM3LDB4NmQsMHg4ZCwweGQ1LDB4NGUsMHhhOSwweDZjLDB4NTYsMHhmNCwweGVhLDB4NjUsMHg3YSwweGFlLDB4MDgsMHhiYSwweDc4LDB4MjUsMHgyZSwweDFjLDB4YTYsMHhiNCwweGM2LDB4ZTgsMHhkZCwweDc0LDB4MWYsMHg0YiwweGJkLDB4OGIsMHg4YSwweDcwLDB4M2UsMHhiNSwweDY2LDB4NDgsMHgwMywweGY2LDB4MGUsMHg2MSwweDM1LDB4NTcsMHhiOSwweDg2LDB4YzEsMHgxZCwweDllLDB4ZTEsMHhmOCwweDk4LDB4MTEsMHg2OSwweGQ5LDB4OGUsMHg5NCwweDliLDB4MWUsMHg4NywweGU5LDB4Y2UsMHg1NSwweDI4LDB4ZGYsMHg4YywweGExLDB4ODksMHgwZCwweGJmLDB4ZTYsMHg0MiwweDY4LDB4NDEsMHg5OSwweDJkLDB4MGYsMHhiMCwweDU0LDB4YmIsMHgxNl0pOwpjb25zdCBBRVNfUkNPTj1uZXcgVWludDhBcnJheShbMHgwMCwweDAxLDB4MDIsMHgwNCwweDA4LDB4MTAsMHgyMCwweDQwLDB4ODAsMHgxYiwweDM2LDB4NmMsMHhkOCwweGFiLDB4NGRdKTsKZnVuY3Rpb24gYWVzR011bChhLGIpe2xldCBwPTA7Zm9yKGxldCBpPTA7aTw4O2krKyl7aWYoYiYxKXBePWE7Y29uc3QgaGk9YSYweDgwO2E9KGE8PDEpJjB4ZmY7aWYoaGkpYV49MHgxYjtiPj49MX1yZXR1cm4gcH0KZnVuY3Rpb24gYWVzS2V5RXhwYW5zaW9uMjU2KGtleSl7Y29uc3QgTms9OCxOYj00LE5yPTE0O2NvbnN0IHc9bmV3IFVpbnQ4QXJyYXkoNCpOYiooTnIrMSkpO2ZvcihsZXQgaT0wO2k8TmsqNDtpKyspd1tpXT1rZXlbaV07Zm9yKGxldCBpPU5rO2k8TmIqKE5yKzEpO2krKyl7bGV0IHQwPXdbNCooaS0xKV0sdDE9d1s0KihpLTEpKzFdLHQyPXdbNCooaS0xKSsyXSx0Mz13WzQqKGktMSkrM107aWYoaSVOaz09PTApe2NvbnN0IHRtcD10MDt0MD1BRVNfU0JPWFt0MV1eQUVTX1JDT05baS9Oa107dDE9QUVTX1NCT1hbdDJdO3QyPUFFU19TQk9YW3QzXTt0Mz1BRVNfU0JPWFt0bXBdfWVsc2UgaWYoaSVOaz09PTQpe3QwPUFFU19TQk9YW3QwXTt0MT1BRVNfU0JPWFt0MV07dDI9QUVTX1NCT1hbdDJdO3QzPUFFU19TQk9YW3QzXX13WzQqaV09d1s0KihpLU5rKV1edDA7d1s0KmkrMV09d1s0KihpLU5rKSsxXV50MTt3WzQqaSsyXT13WzQqKGktTmspKzJdXnQyO3dbNCppKzNdPXdbNCooaS1OaykrM11edDN9cmV0dXJuIHd9CmZ1bmN0aW9uIGFlc0VuY3J5cHRCbG9jayhpbnB1dCx3KXtjb25zdCBOYj00LE5yPTE0O2NvbnN0IHM9bmV3IFVpbnQ4QXJyYXkoMTYpO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09aW5wdXRbaV07Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXV49d1tpXTtmb3IobGV0IHJvdW5kPTE7cm91bmQ8PU5yO3JvdW5kKyspe2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09QUVTX1NCT1hbc1tpXV07bGV0IHQ9c1sxXTtzWzFdPXNbNV07c1s1XT1zWzldO3NbOV09c1sxM107c1sxM109dDt0PXNbMl07c1syXT1zWzEwXTtzWzEwXT10O3Q9c1s2XTtzWzZdPXNbMTRdO3NbMTRdPXQ7dD1zWzNdO3NbM109c1sxNV07c1sxNV09c1sxMV07c1sxMV09c1s3XTtzWzddPXQ7aWYocm91bmQhPT1Ocil7Zm9yKGxldCBjPTA7Yzw0O2MrKyl7Y29uc3QgaT00KmM7Y29uc3QgYTA9c1tpXSxhMT1zW2krMV0sYTI9c1tpKzJdLGEzPXNbaSszXTtzW2ldPWFlc0dNdWwoYTAsMileYWVzR011bChhMSwzKV5hMl5hMztzW2krMV09YTBeYWVzR011bChhMSwyKV5hZXNHTXVsKGEyLDMpXmEzO3NbaSsyXT1hMF5hMV5hZXNHTXVsKGEyLDIpXmFlc0dNdWwoYTMsMyk7c1tpKzNdPWFlc0dNdWwoYTAsMyleYTFeYTJeYWVzR011bChhMywyKX19Y29uc3Qgb2ZmPXJvdW5kKjE2O2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbb2ZmK2ldfXJldHVybiBzfQpmdW5jdGlvbiBhZXNVdGY4Qnl0ZXMoc3RyKXtjb25zdCBvdXQ9W107Zm9yKGxldCBpPTA7aTxzdHIubGVuZ3RoO2krKyl7bGV0IGM9c3RyLmNoYXJDb2RlQXQoaSk7aWYoYzwweDgwKW91dC5wdXNoKGMpO2Vsc2UgaWYoYzwweDgwMClvdXQucHVzaCgweGMwfChjPj42KSwweDgwfChjJjB4M2YpKTtlbHNlIGlmKGM+PTB4ZDgwMCYmYzw9MHhkYmZmKXtjb25zdCBjMj1zdHIuY2hhckNvZGVBdCgrK2kpO2M9MHgxMDAwMCsoKGMtMHhkODAwKTw8MTApKyhjMi0weGRjMDApO291dC5wdXNoKDB4ZjB8KGM+PjE4KSwweDgwfCgoYz4+MTIpJjB4M2YpLDB4ODB8KChjPj42KSYweDNmKSwweDgwfChjJjB4M2YpKX1lbHNlIG91dC5wdXNoKDB4ZTB8KGM+PjEyKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9cmV0dXJuIG5ldyBVaW50OEFycmF5KG91dCl9CmZ1bmN0aW9uIGFlc0J5dGVzVG9CYXNlNjQoYnl0ZXMpe2NvbnN0IGNoYXJzPSJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvIjtsZXQgcmVzdWx0PSIiLGk9MDtmb3IoO2krMjxieXRlcy5sZW5ndGg7aSs9Myl7Y29uc3Qgbj0oYnl0ZXNbaV08PDE2KXwoYnl0ZXNbaSsxXTw8OCl8Ynl0ZXNbaSsyXTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rY2hhcnNbbiY2M119Y29uc3QgcmVtPWJ5dGVzLmxlbmd0aC1pO2lmKHJlbT09PTEpe2NvbnN0IG49Ynl0ZXNbaV08PDE2O3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rIj09In1lbHNlIGlmKHJlbT09PTIpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpO3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rY2hhcnNbKG4+PjYpJjYzXSsiPSJ9cmV0dXJuIHJlc3VsdH0KZnVuY3Rpb24gYWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbnRleHQsa2V5U3RyKXtjb25zdCBrZXk9YWVzVXRmOEJ5dGVzKGtleVN0cik7aWYoa2V5Lmxlbmd0aCE9PTMyKXRocm93IG5ldyBFcnJvcigiQUVTLTI1NumcgOimgTMy5a2X6IqC5a+G6ZKl77yM5b2T5YmNIitrZXkubGVuZ3RoKTtjb25zdCB3PWFlc0tleUV4cGFuc2lvbjI1NihrZXkpO2NvbnN0IGRhdGE9YWVzVXRmOEJ5dGVzKHBsYWludGV4dCk7Y29uc3QgcGFkTGVuPTE2LShkYXRhLmxlbmd0aCUxNik7Y29uc3QgcGFkZGVkPW5ldyBVaW50OEFycmF5KGRhdGEubGVuZ3RoK3BhZExlbik7cGFkZGVkLnNldChkYXRhKTtmb3IobGV0IGk9ZGF0YS5sZW5ndGg7aTxwYWRkZWQubGVuZ3RoO2krKylwYWRkZWRbaV09cGFkTGVuO2NvbnN0IG91dD1uZXcgVWludDhBcnJheShwYWRkZWQubGVuZ3RoKTtmb3IobGV0IG9mZj0wO29mZjxwYWRkZWQubGVuZ3RoO29mZis9MTYpe291dC5zZXQoYWVzRW5jcnlwdEJsb2NrKHBhZGRlZC5zbGljZShvZmYsb2ZmKzE2KSx3KSxvZmYpfXJldHVybiBhZXNCeXRlc1RvQmFzZTY0KG91dCl9CgovKiA9PT09PT09PT09PT09PT09PSDlrZjlgqggPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbG9hZEpTT04oayxmYWxsYmFjayl7dHJ5e2NvbnN0IHJhdz1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShrKTtpZighcmF3KXJldHVybiBmYWxsYmFjaztjb25zdCB2PUpTT04ucGFyc2UocmF3KTtyZXR1cm4gdj09PXVuZGVmaW5lZHx8dj09PW51bGw/ZmFsbGJhY2s6dn1jYXRjaChlKXtyZXR1cm4gZmFsbGJhY2t9fQpmdW5jdGlvbiBzYXZlSlNPTihrLHYpe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrLEpTT04uc3RyaW5naWZ5KHYpKTtyZXR1cm4gdHJ1ZX1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fQpjb25zdCBERUZBVUxUX0NGRz17YXBwOnthcHBJZDoiUzdxUFdQVTEiLGFwcFNlY3JldDoiYzVlMGRhN2Y0ZGEyOGRmODA1Njk0ZWMzZGQxZmM2NzkyZTlkZjk5ZCJ9LGg1OnthcHBJZDoiU3c1Rjl1SmkiLGFwcFNlY3JldDoiNDY4NzBhOGY2NzhhMDkxMDk0NjhmNWIwMTY4ODE4YjkxYzI5Mjg0NSJ9LGNvbW11bml0eTp7ZW5hYmxlUG9zdDp0cnVlLGVuYWJsZUxpa2U6dHJ1ZSxlbmFibGVDb21tZW50OnRydWUsZW5hYmxlU2hhcmU6dHJ1ZSxlbmFibGVEZWxldGU6dHJ1ZX0sdmVoaWNsZUFlc0tleToiY2UyY2Q3Y2I1NzEyNGMxMzQ5ZGQ4NTQzYmY2ZmQzMWQiLHZlaGljbGVDb250cm9sUmlzazoiIixhdXRvUmVmcmVzaFNlYzo2MCxzZXJ2ZXJCYXNlOiIiLGF1dG9TaWduaW46ZmFsc2UsYXV0b1NpZ25pblRpbWU6IjA3OjAwIix2ZWhpY2xlTW9uaXRvcjpmYWxzZSx3aWRnZXRWZWhpY2xlOiIiLGN1c3RvbUJnOiIifTsKZnVuY3Rpb24gZ2V0Q2ZnKCl7Y29uc3QgYz1sb2FkSlNPTihLRVlTLmNmZyxudWxsKTtpZighYylyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShERUZBVUxUX0NGRykpO3JldHVybnthcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fERFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH0sY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSx2ZWhpY2xlQWVzS2V5OigodHlwZW9mIGMudmVoaWNsZUFlc0tleT09PSJzdHJpbmciP2MudmVoaWNsZUFlc0tleToiIikudHJpbSgpfHxERUZBVUxUX0NGRy52ZWhpY2xlQWVzS2V5KSx2ZWhpY2xlQ29udHJvbFJpc2s6KHR5cGVvZiBjLnZlaGljbGVDb250cm9sUmlzaz09PSJzdHJpbmciP2MudmVoaWNsZUNvbnRyb2xSaXNrOiIiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSxzZXJ2ZXJCYXNlOlN0cmluZyhjLnNlcnZlckJhc2V8fCIiKS50cmltKCksYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsIHdpZGdldFZlaGljbGU6U3RyaW5nKGMud2lkZ2V0VmVoaWNsZXx8IiIpLCBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpfX0KZnVuY3Rpb24gc2F2ZUNmZyhjKXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5jZmcsYyl9CmZ1bmN0aW9uIGdldEFjY291bnRzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmFjY291bnRzLFtdKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfQpmdW5jdGlvbiBzYXZlQWNjb3VudHMobGlzdCl7cmV0dXJuIHNhdmVKU09OKEtFWVMuYWNjb3VudHMsbGlzdCl9CmZ1bmN0aW9uIGdldExvZ3MoKXtjb25zdCBhPWxvYWRKU09OKEtFWVMubG9ncyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gYWRkTG9nKGVudHJ5KXtjb25zdCBsb2dzPWdldExvZ3MoKTtsb2dzLnVuc2hpZnQoZW50cnkpO2lmKGxvZ3MubGVuZ3RoPjUwKWxvZ3MubGVuZ3RoPTUwO3NhdmVKU09OKEtFWVMubG9ncyxsb2dzKX0KZnVuY3Rpb24gY2xlYXJMb2dzKCl7cmV0dXJuIHNhdmVKU09OKEtFWVMubG9ncyxbXSl9CmZ1bmN0aW9uIGlzUHJveHlNb2RlKCl7cmV0dXJuICEhKHdpbmRvdy5fX1BBTkVMX01PREVfXyl8fCEhZ2V0Q2ZnKCkuc2VydmVyQmFzZX0KLyogPT09PT09PT09PT09PT09PT0g562+5ZCNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFNpZ24odHlwZSxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jW3R5cGVdfHxjLmFwcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXR5cGU9PT0iaDUiP2dldFV1aWQoKTp0aW1lc3RhbXArZ2V0UmFuZG9tQ2hhcnMoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj1ib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOicnO2NvbnN0IHNpZ25hdHVyZT10eXBlPT09Img1Ij8ocXVlcnkrcGFyYW0rYWMuYXBwU2VjcmV0KTooYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpO2NvbnN0IHNpZ249bWQ1KHNoYTEoc2lnbmF0dXJlKSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2NmbW90by14LXBhcmFtJzpwYXJhbSwnY2Ztb3RvLXgtc2lnbic6c2lnbiwnY2Ztb3RvLXgtc2lnbi10eXBlJzonMCcsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ25vbmNlJzpub25jZSwnc2lnbmF0dXJlJzpzaWdufX0KCi8vIEg1IOerr+WQqyBib2R5IOetvuWQje+8iGxvZ2luQnlQaG9uZSDnrYnmjqXlj6Plv4Xpobvmioror7fmsYLkvZPnurPlhaXnrb7lkI3vvIzlkKbliJnov5Tlm54gcGVybWl0IGVycm9y77yJCmZ1bmN0aW9uIGg1U2lnbldpdGhCb2R5KGJvZHksY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5oNXx8Yy5hcHA7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPWdldFV1aWQoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj10eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSk7Y29uc3Qgc2lnbj1tZDUoc2hhMShib2R5U3RyK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ2FwcElkJzphYy5hcHBJZH19CgovLyBBcHAg572R5YWz5a6M5pW0562+5ZCN77yI5Y+R56CB5LiO55m75b2V5ZCM572R5YWz77yM6YG/5YWNIEg1IGF1dGhDb2RlIOWPkeeggei/myBBcHAg5rGg6ICMIEg1IGxvZ2luQnlQaG9uZSDmn6XkuI3liLDvvIkKZnVuY3Rpb24gYXBwR2F0ZXdheVNpZ24odXJsLG1ldGhvZCxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jLmFwcHx8Yy5oNTtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHF1ZXJ5PXRvUXVlcnkocGFyYW1zKTtsZXQgcHJlU2lnbj0iIjtpZihTdHJpbmcobWV0aG9kKS50b1VwcGVyQ2FzZSgpPT09IkdFVCIpe2NvbnN0IHU9bmV3IFVSTCh1cmwpO3ByZVNpZ249dS5vcmlnaW4rdS5wYXRobmFtZSsocXVlcnk/Ij8iK3F1ZXJ5OiIiKTt9ZWxzZXtwcmVTaWduPXF1ZXJ5Kyhib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOiIiKTt9Y29uc3Qgc2lnbj1tZDUoc2hhMShwcmVTaWduK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydhcHBJZCc6YWMuYXBwSWQsJ25vbmNlJzpub25jZSwndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnc2lnbmF0dXJlJzpzaWduLCdDZm1vdG8tWC1QYXJhbSc6cGFyYW0sJ0NmbW90by1YLVNpZ24nOnNpZ24sJ0NmbW90by1YLVNpZ24tVHlwZSc6JzAnfX0KCi8qID09PT09PT09PT09PT09PT09IEhUVFDvvIhmZXRjaCDniYjvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gaHR0cEdldCh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkdFVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFBvc3QodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6aGVhZGVyc3x8e30sYm9keTp0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keT09bnVsbD97fTpib2R5KSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFB1dCh1cmwsaGVhZGVycyxib2R5LHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiUFVUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6Ym9keSE9PXVuZGVmaW5lZCYmYm9keSE9PW51bGw/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6dW5kZWZpbmVkLHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwRGVsZXRlKHVybCxoZWFkZXJzLHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiREVMRVRFIixoZWFkZXJzOmhlYWRlcnN8fHt9LHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQpmdW5jdGlvbiBuZXR3b3JrSGludChyZXMpe2NvbnN0IG09U3RyaW5nKChyZXMmJnJlcy5lcnJvcil8fCIiKTtpZigvZmFpbGVkIHRvIGZldGNofG5ldHdvcmtlcnJvcnxjb3JzfGxvYWQgZmFpbGVkfOaXoOazlei/nuaOpXznvZHnu5wvaS50ZXN0KG0pKXJldHVybiLnvZHnu5wv6Leo5Z+f5Y+X6ZmQ77ya55u06L+e5qih5byP6ZyAIFpFRUhPIOacjeWKoeerr+aUvuihjCBDT1JT77yM6K+35qOA5p+l572R57uc6L+e5o6l5ZCO6YeN6K+VIjtyZXR1cm4iIn0KCi8qID09PT09PT09PT09PT09PT09IOebtOi/nuWQjuerr++8iOa1j+iniOWZqOebtOaOpeiwgyBaRUVITyBBUEnvvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYmFzZUhlYWRlcnMoYWNjKXtjb25zdCB1YT1hY2MudXNlckFnZW50fHwiTU9CSUxFfGlPU3wxNi4xLjF8WkVFSE9fQVBQfDMuMC4xfGlQaG9uZXxXV0FOfGlPUyI7Y29uc3QgaD17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIitjbGVhblRva2VuKGFjYy50b2tlbiksIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwiQWNjZXB0LUxhbmd1YWdlIjoiemgtQ04iLCJBY2NlcHQiOiIqLyoiLCJVc2VyLUFnZW50Ijp1YSwieC1hcHAtaW5mbyI6dWF9O2lmKGFjYy51c2VySWQpe2hbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7aFsiQ29va2llIl09InVzZXJfaWQ9IithY2MudXNlcklkfXJldHVybiBofQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9O2lmKGFjYy51c2VySWQpaGVhZGVyc1sidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLGhlYWRlcnMpO2xldCBsaXN0PVtdO2lmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKXtpZihBcnJheS5pc0FycmF5KHJlcy5kYXRhKSlsaXN0PXJlcy5kYXRhO2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEubGlzdCkpbGlzdD1yZXMuZGF0YS5saXN0O2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVjb3JkcykpbGlzdD1yZXMuZGF0YS5yZWNvcmRzO2Vsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEucm93cykpbGlzdD1yZXMuZGF0YS5yb3dzfXJldHVybiBsaXN0Lm1hcCh2PT4oe3Zpbk5vOlN0cmluZyh2LnZpbk5vfHx2LmZyYW1lTm98fHYudmlufHwiIikudHJpbSgpLG5hbWU6U3RyaW5nKHYudmVoaWNsZU5hbWV8fHYudmVoaWNsZVR5cGV8fHYuZGV2aWNlTmFtZXx8di5uYW1lfHwi6L2m6L6GIikudHJpbSgpfHwi6L2m6L6GIixwaWM6U3RyaW5nKHYudmVoaWNsZVBpY1VybHx8di5waWN8fHYuaW1hZ2VVcmx8fCIiKS50cmltKCksdmVoaWNsZVR5cGU6U3RyaW5nKHYudmVoaWNsZVR5cGV8fHYudHlwZXx8IiIpLnRyaW0oKSxsaWNlbnNlUGxhdGU6di5saWNlbnNlUGxhdGV8fG51bGx9KSkuZmlsdGVyKHY9PnYudmluTm8pfWNhdGNoKGUpe3JldHVybltdfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZVdpZGdldHMoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS93aWRnZXRzLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHNvYz1OdW1iZXIoZC5ibXNzb2N8fGQuYmF0dGVyeUxldmVsfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fDApO2NvbnN0IHZvbHRhZ2U9TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHxkLnRvdGFsVm9sdGFnZXx8ZC5iYXR0ZXJ5VG90YWxWb2x0YWdlfHwwKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue2JhdHRlcnlQZXJjZW50Ok1hdGgubWF4KDAsTWF0aC5taW4oMTAwLGlzRmluaXRlKHNvYyk/c29jOjApKSxyZXNpZHVhbFJhbmdlS206aXNGaW5pdGUocmFuZ2UpP3JhbmdlOjAsdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxhZGRyZXNzOlN0cmluZyhkLmFkZHJlc3N8fCIiKS50cmltKCksbG9jYXRpb25UaW1lOlN0cmluZyhkLmxvY2F0aW9uPy5sb2NhdGlvblRpbWV8fCIiKS50cmltKCksdmVoaWNsZU5hbWU6U3RyaW5nKGQudmVoaWNsZU5hbWV8fCIiKS50cmltKCksdmVoaWNsZUltYWdlVXJsOlN0cmluZyhkLnZlaGljbGVTY2FsZVBpY1VybHx8ZC52ZWhpY2xlUGljVXJsfHwiIikudHJpbSgpLGhlYWRMb2NrU3RhdGU6U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8IiIpLnRyaW0oKSxiYXR0ZXJ5UHVsbE91dDpTdHJpbmcoZC5iYXR0ZXJ5UHVsbE91dEZsYWd8fCIiKT09PSIxIixvbmxpbmU6U3RyaW5nKGQub25saW5lU3RhdHVzfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8ZC5kZXZpY2VPbmxpbmV8fCIiKS50cmltKCksY3VzaGlvblN0YXRlOmRlZXBQaWNrKGQsWyJjdXNoaW9uU3RhdGUiLCJjdXNoaW9uU3RhdHVzIiwiY3VzaGlvbkxvY2tTdGF0ZSIsInNlYXRTdGF0ZSIsInNlYXRTdGF0dXMiLCJzZWF0TG9ja1N0YXRlIiwic2FkZGxlU3RhdGUiLCJzYWRkbGVTdGF0dXMiLCJzYWRkbGVMb2NrU3RhdGUiXSksbG9uZ2l0dWRlOihpc0Zpbml0ZShsb25naXR1ZGUpJiZNYXRoLmFicyhsb25naXR1ZGUpPD0xODAmJmxvbmdpdHVkZSE9PTApP2xvbmdpdHVkZToiIixsYXRpdHVkZTooaXNGaW5pdGUobGF0aXR1ZGUpJiZNYXRoLmFicyhsYXRpdHVkZSk8PTkwJiZsYXRpdHVkZSE9PTApP2xhdGl0dWRlOiIiLHBvd2VyU3RhdHVzOlN0cmluZyhkLmFjY1N0YXR1c3x8ZC5wb3dlclN0YXR1c3x8ZC52ZWhpY2xlU3RhdHVzfHxkLmlnbml0aW9uU3RhdHVzfHxkLnBvd2VyTW9kZXx8ZC5hY2NTdGF0ZXx8ZC5wb3dlclN0YXRlfHxkLnZlaGljbGVTdGF0ZXx8ZC5lbmdpbmVTdGF0dXN8fGQuaXNQb3dlck9ufHxkLnBvd2VyT258fCIiKS50cmltKCksbG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fGQubG9ja1N0YXRlfHxkLmxvY2tTdGF0dXN8fGQudmVoaWNsZUxvY2tTdGF0ZXx8ZC5jYXJMb2NrU3RhdGV8fGQuZG9vckxvY2tTdGF0ZXx8ZC5sb2NrRmxhZ3x8ZC5pc0xvY2tlZHx8ZC5sb2NrZWR8fGQuY2VudHJhbExvY2tpbmdTdGF0dXN8fCIiKS50cmltKCl9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGRldmljZUlkPWdldERldmljZUlkZW50aWZ5KGFjYyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVIb21lUGFnZVYyLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiP3VuaXF1ZUlkZW50aWZ5PSIrZGV2aWNlSWQrIiZwaG9uZURldmljZU5hbWU9aW9zXyIrZGV2aWNlSWQ7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQodXJsLGhlYWRlcnMpO2lmKHJlcyYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3QgdmVoaWNsZUxvY2s9cGlja0lvdFByb3AoZCwiVmVoaWNsZUxvY2tfUyIpO2NvbnN0IGhlYWRMb2NrSW90PXBpY2tJb3RQcm9wKGQsIkhlYWRMb2NrU3RhdGUiKTtjb25zdCB0b3BMb2NrPVN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fGQubG9ja1N0YXRlfHxkLmxvY2tTdGF0dXN8fGQudmVoaWNsZUxvY2tTdGF0ZXx8aGVhZExvY2tJb3R8fHZlaGljbGVMb2NrfHwiIikudHJpbSgpO2NvbnN0IGxuZ1N0cj1kZWVwUGljayhkLFsibG9uZ2l0dWRlIiwibG5nIiwibG9uIiwiZ3BzWCIsImxvbmdpdHVkZVZhbHVlIiwiY29vcmRYIiwieCJdKTtjb25zdCBsYXRTdHI9ZGVlcFBpY2soZCxbImxhdGl0dWRlIiwibGF0IiwiZ3BzWSIsImxhdGl0dWRlVmFsdWUiLCJjb29yZFkiLCJ5Il0pO2NvbnN0IGxvbmdpdHVkZT1OdW1iZXIobG5nU3RyKSxsYXRpdHVkZT1OdW1iZXIobGF0U3RyKTtyZXR1cm57cG93ZXJTdGF0dXM6ZGVlcFBpY2soZCxbImFjY1N0YXR1cyIsInBvd2VyU3RhdHVzIiwidmVoaWNsZVN0YXR1cyIsImlnbml0aW9uU3RhdHVzIiwicG93ZXJNb2RlIiwiYWNjU3RhdGUiLCJwb3dlclN0YXRlIiwidmVoaWNsZVN0YXRlIiwiZW5naW5lU3RhdHVzIiwiaXNQb3dlck9uIiwicG93ZXJPbiIsImFjYyJdKS50cmltKCksbG9ja1N0YXRlOnRvcExvY2ssb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5yaWRlU3RhdGV8fGQub25saW5lfHxkLm5ldFN0YXR1c3x8ZC50Ym94U3RhdHVzfHwiIikudHJpbSgpLHJpZGVTdGF0ZTpTdHJpbmcoZC5yaWRlU3RhdGV8fCIiKS50cmltKCksY3VzaGlvblN0YXRlOmRlZXBQaWNrKGQsWyJjdXNoaW9uU3RhdGUiLCJjdXNoaW9uU3RhdHVzIiwiY3VzaGlvbkxvY2tTdGF0ZSIsInNlYXRTdGF0ZSIsInNlYXRTdGF0dXMiLCJzZWF0TG9ja1N0YXRlIiwic2FkZGxlU3RhdGUiLCJzYWRkbGVTdGF0dXMiLCJzYWRkbGVMb2NrU3RhdGUiXSksbG9uZ2l0dWRlOihpc0Zpbml0ZShsb25naXR1ZGUpJiZNYXRoLmFicyhsb25naXR1ZGUpPD0xODAmJmxvbmdpdHVkZSE9PTApP2xvbmdpdHVkZToiIixsYXRpdHVkZTooaXNGaW5pdGUobGF0aXR1ZGUpJiZNYXRoLmFicyhsYXRpdHVkZSk8PTkwJiZsYXRpdHVkZSE9PTApP2xhdGl0dWRlOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9hcHAvdmVoaWNsZS90aXJlL21vbml0b3Jpbmc/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImdGltZVBlcmlvZFR5cGU9MSIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlYWxUaW1lRGF0YSk/cmVzLmRhdGEucmVhbFRpbWVEYXRhOihBcnJheS5pc0FycmF5KHJlcy5kYXRhKT9yZXMuZGF0YTpbXSk7Y29uc3QgYnlQb3M9e307Zm9yKGNvbnN0IGl0IG9mIGxpc3Qpe2NvbnN0IHBvcz1OdW1iZXIoaXQ/LnNlbnNvclBvc2l0aW9uKTtpZihwb3MpYnlQb3NbcG9zXT1pdH1jb25zdCBmbXQ9KGl0KT0+e2NvbnN0IHdhcm49TnVtYmVyKGl0Py53YXJuaW5nVHlwZT8/MCk7Y29uc3Qgdj1TdHJpbmcoaXQ/LnRpcmVQcmVzc3VyZT8/IiIpLnRyaW0oKTtjb25zdCBuPXBhcnNlRmxvYXQodik7aWYod2FybiE9PTB8fCF2fHwhaXNGaW5pdGUobil8fG48PTApcmV0dXJuIuacque7keWumiI7cmV0dXJuIHYrImJhciJ9O2NvbnN0IGZtdFRlbXA9KGl0KT0+e2NvbnN0IHdhcm49TnVtYmVyKGl0Py53YXJuaW5nVHlwZT8/MCk7Y29uc3Qgdj1pdD8udGlyZVRlbXA7aWYod2FybiE9PTB8fHY9PW51bGwpcmV0dXJuIiI7Y29uc3Qgcz1TdHJpbmcodikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdChzKTtpZighc3x8cy50b0xvd2VyQ2FzZSgpPT09Im51bGwifHwhaXNGaW5pdGUobil8fG48PTApcmV0dXJuIiI7cmV0dXJuIHMrIsKwQyJ9O2NvbnN0IGZyb250PWJ5UG9zWzFdfHxsaXN0WzBdO2NvbnN0IHJlYXI9YnlQb3NbMl18fGxpc3RbMV07cmV0dXJue2Zyb250UHJlc3N1cmU6ZnJvbnQ/Zm10KGZyb250KToi5pyq57uR5a6aIixyZWFyUHJlc3N1cmU6cmVhcj9mbXQocmVhcik6Iuacque7keWumiIsZnJvbnRUZW1wOmZyb250P2ZtdFRlbXAoZnJvbnQpOiIiLHJlYXJUZW1wOnJlYXI/Zm10VGVtcChyZWFyKToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hSaWRlSW5mbyhhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBtb250aD1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IFtob21lUmVzLG15UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9ob21lUmlkZUluZm8/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSksaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9teVJpZGVJbmZvP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJm1vbnRoPSIrbW9udGgseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KV0pO2NvbnN0IGg9aG9tZVJlcz8uZGF0YXx8aG9tZVJlc3x8e307Y29uc3QgZD1teVJlcz8uZGF0YXx8bXlSZXN8fHt9O2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShkLnJpZGVSZWNvcmRMaXN0KT9kLnJpZGVSZWNvcmRMaXN0OltdO2NvbnN0IHRvZGF5S2V5PW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGRheT1saXN0LmZpbmQoeD0+U3RyaW5nKHg/LmRhdGV8fCIiKT09PXRvZGF5S2V5KXx8bGlzdFtsaXN0Lmxlbmd0aC0xXXx8e307Y29uc3QgeWVzdD1uZXcgRGF0ZShEYXRlLm5vdygpLTg2NDAwMDAwKTtjb25zdCB5ZXN0S2V5PXllc3QuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKHllc3QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyh5ZXN0LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHlkPWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09eWVzdEtleSl8fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksdG90YWxNaWxlYWdlOk51bWJlcihkLnJpZGVNaWxlYWdlVG90YWw/PzApLHllc3RlcmRheURpc3RhbmNlOk51bWJlcih5ZC5yaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJhdHRlcnlMZXZlbHx8ZC5ibXNzb2N8fDApLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MH19cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19Y2F0Y2goZSl7cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJoNSIse3Zpbk5vOnZpbk5vfSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcmFwcC9hcHAvc2VydmljZS9yZWNoYXJnZS92ZWhpY2xlL2RldGFpbD92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtyZXR1cm57cmVjaGFyZ2VFbmREYXRlOlN0cmluZyhyZXMuZGF0YS5yZWNoYXJnZUVuZERhdGV8fCIiKSxsYXN0VXNlRGF0ZTpOdW1iZXIocmVzLmRhdGEubGFzdFVzZURhdGUpfHwwLHNlcnZpY2VSZWNoYXJnZVN0YXR1czpTdHJpbmcocmVzLmRhdGEuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIiksdmVoaWNsZU5hbWU6U3RyaW5nKHJlcy5kYXRhLnZlaGljbGVOYW1lfHwiIil9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXtoYXNWZWhpY2xlOmZhbHNlLHZlaGljbGVOYW1lOiIiLHZlaGljbGVNb2RlbDoiIix2aW5ObzoiIix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsYmF0dGVyeVBlcmNlbnQ6MCxyZXNpZHVhbFJhbmdlS206MCxyYW5nZUVzdGltYXRlZDpmYWxzZSxhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iixmcm9udFByZXNzdXJlOiIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsbGFzdFJpZGVEdXJhdGlvbjowLHRvdGFsTWlsZWFnZTowLHllc3RlcmRheURpc3RhbmNlOjAsdmVoaWNsZUltYWdlVXJsOiIiLHNlcnZpY2VFbmREYXRlOiIiLHNlcnZpY2VSZW1haW5EYXlzOjAsc2VydmljZVN0YXR1czoiIixwb3dlclN0YXR1czoiIixsb2NrU3RhdGU6IiIsb25saW5lOiIiLHJpZGVTdGF0ZToiIixjdXNoaW9uU3RhdGU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIifTt0cnl7Y29uc3QgYWxsVmVoaWNsZXM9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTtjb25zdCB2ZWhpY2xlcz1hbGxWZWhpY2xlcy5maWx0ZXIoeD0+IS/mqKHmi58vLnRlc3QoU3RyaW5nKHgubmFtZXx8IiIpKyIgIitTdHJpbmcoeC52ZWhpY2xlVHlwZXx8IiIpKSk7aWYodmVoaWNsZXMubGVuZ3RoPT09MClyZXR1cm4gcmVzdWx0O2NvbnN0IHY9dmVoaWNsZXNbMF07cmVzdWx0Lmhhc1ZlaGljbGU9dHJ1ZTtyZXN1bHQudmVoaWNsZU5hbWU9di5uYW1lO3Jlc3VsdC52aW5Obz12LnZpbk5vO3Jlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9di5waWM7cmVzdWx0LnZlaGljbGVNb2RlbD12LnZlaGljbGVUeXBlfHwiIjtjb25zdCBbd2lkZ2V0cyx0aXJlLHJpZGUsYmF0dGVyeSxzZXJ2aWNlLGhvbWVQYWdlXT1hd2FpdCBQcm9taXNlLmFsbChbZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pih7Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowfSkpLGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpXSk7aWYod2lkZ2V0cyl7cmVzdWx0LmJhdHRlcnlQZXJjZW50PXdpZGdldHMuYmF0dGVyeVBlcmNlbnQ7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT13aWRnZXRzLnJlc2lkdWFsUmFuZ2VLbTtyZXN1bHQudm9sdGFnZT13aWRnZXRzLnZvbHRhZ2U7cmVzdWx0LmFkZHJlc3M9d2lkZ2V0cy5hZGRyZXNzO3Jlc3VsdC5sb2NhdGlvblRpbWU9d2lkZ2V0cy5sb2NhdGlvblRpbWU7cmVzdWx0LnBvd2VyU3RhdHVzPXdpZGdldHMucG93ZXJTdGF0dXN8fCIiO3Jlc3VsdC5sb2NrU3RhdGU9d2lkZ2V0cy5sb2NrU3RhdGV8fCIiO2lmKHdpZGdldHMudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXdpZGdldHMudmVoaWNsZU5hbWU7aWYod2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmwpcmVzdWx0LnZlaGljbGVJbWFnZVVybD13aWRnZXRzLnZlaGljbGVJbWFnZVVybDtpZih3aWRnZXRzLm9ubGluZSlyZXN1bHQub25saW5lPXdpZGdldHMub25saW5lO2lmKHdpZGdldHMuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9d2lkZ2V0cy5jdXNoaW9uU3RhdGU7aWYod2lkZ2V0cy5sb25naXR1ZGUhPT0iIiYmd2lkZ2V0cy5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT13aWRnZXRzLmxvbmdpdHVkZTtpZih3aWRnZXRzLmxhdGl0dWRlIT09IiImJndpZGdldHMubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPXdpZGdldHMubGF0aXR1ZGV9aWYoaG9tZVBhZ2Upe2lmKGhvbWVQYWdlLnBvd2VyU3RhdHVzKXJlc3VsdC5wb3dlclN0YXR1cz1ob21lUGFnZS5wb3dlclN0YXR1cztpZihob21lUGFnZS5sb2NrU3RhdGUpcmVzdWx0LmxvY2tTdGF0ZT1ob21lUGFnZS5sb2NrU3RhdGU7aWYoaG9tZVBhZ2Uub25saW5lKXJlc3VsdC5vbmxpbmU9aG9tZVBhZ2Uub25saW5lO2lmKGhvbWVQYWdlLnJpZGVTdGF0ZSlyZXN1bHQucmlkZVN0YXRlPWhvbWVQYWdlLnJpZGVTdGF0ZTtpZihob21lUGFnZS5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT1ob21lUGFnZS5jdXNoaW9uU3RhdGU7aWYoKHJlc3VsdC5sb25naXR1ZGU9PT0iInx8cmVzdWx0LmxvbmdpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxvbmdpdHVkZSE9PSIiJiZob21lUGFnZS5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT1ob21lUGFnZS5sb25naXR1ZGU7aWYoKHJlc3VsdC5sYXRpdHVkZT09PSIifHxyZXN1bHQubGF0aXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sYXRpdHVkZSE9PSIiJiZob21lUGFnZS5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9aG9tZVBhZ2UubGF0aXR1ZGV9aWYodGlyZSl7cmVzdWx0LmZyb250UHJlc3N1cmU9dGlyZS5mcm9udFByZXNzdXJlO3Jlc3VsdC5yZWFyUHJlc3N1cmU9dGlyZS5yZWFyUHJlc3N1cmU7cmVzdWx0LmZyb250VGVtcD10aXJlLmZyb250VGVtcDtyZXN1bHQucmVhclRlbXA9dGlyZS5yZWFyVGVtcH1pZihyaWRlKXtyZXN1bHQudG9kYXlEaXN0YW5jZT1yaWRlLnRvZGF5RGlzdGFuY2U7cmVzdWx0LnRvZGF5RHVyYXRpb249cmlkZS50b2RheUR1cmF0aW9uO3Jlc3VsdC50b2RheU1heFNwZWVkPXJpZGUudG9kYXlNYXhTcGVlZDtyZXN1bHQubGFzdFJpZGVNaWxlYWdlPXJpZGUubGFzdFJpZGVNaWxlYWdlO3Jlc3VsdC5sYXN0UmlkZUR1cmF0aW9uPXJpZGUubGFzdFJpZGVEdXJhdGlvbnx8MDtyZXN1bHQudG90YWxNaWxlYWdlPXJpZGUudG90YWxNaWxlYWdlfHwwO3Jlc3VsdC55ZXN0ZXJkYXlEaXN0YW5jZT1yaWRlLnllc3RlcmRheURpc3RhbmNlfHwwfXJlc3VsdC5jaGFyZ2VTdGF0ZT1iYXR0ZXJ5LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IjtpZihiYXR0ZXJ5LnZvbHRhZ2UpcmVzdWx0LnZvbHRhZ2U9YmF0dGVyeS52b2x0YWdlO2lmKGJhdHRlcnkuY3VycmVudClyZXN1bHQuY3VycmVudD1iYXR0ZXJ5LmN1cnJlbnQ7aWYoYmF0dGVyeS5iYXR0ZXJ5VGVtcClyZXN1bHQuYmF0dGVyeVRlbXA9YmF0dGVyeS5iYXR0ZXJ5VGVtcDtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmYmF0dGVyeS5yZXNpZHVhbFJhbmdlS20pcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1iYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbTtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmcmVzdWx0LmJhdHRlcnlQZXJjZW50PjApe3Jlc3VsdC5yZXNpZHVhbFJhbmdlS209TWF0aC5yb3VuZChyZXN1bHQuYmF0dGVyeVBlcmNlbnQqMS41KTtyZXN1bHQucmFuZ2VFc3RpbWF0ZWQ9dHJ1ZX1pZihzZXJ2aWNlKXtyZXN1bHQuc2VydmljZUVuZERhdGU9c2VydmljZS5yZWNoYXJnZUVuZERhdGV8fCIiO3Jlc3VsdC5zZXJ2aWNlU3RhdHVzPXNlcnZpY2Uuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIjtyZXN1bHQuc2VydmljZVJlbWFpbkRheXM9c2VydmljZS5sYXN0VXNlRGF0ZXx8MDtpZihzZXJ2aWNlLnZlaGljbGVOYW1lKXJlc3VsdC52ZWhpY2xlTmFtZT1zZXJ2aWNlLnZlaGljbGVOYW1lfX1jYXRjaChlKXt9cmV0dXJuIHJlc3VsdH0KCmFzeW5jIGZ1bmN0aW9uIGNoZWNrVG9rZW4oYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7aWYoIXVzZXJJZClyZXR1cm57dmFsaWQ6dHJ1ZSxzY29yZTowLHVzZXJOYW1lOmFjYy51c2VyTmFtZX07Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQsaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOk51bWJlcihyZXMuZGF0YS5zY29yZSl8fDAsdXNlck5hbWU6cmVzLmRhdGEubmlja05hbWV8fGFjYy51c2VyTmFtZX07aWYocmVzLmNvZGU9PSI0MDAwMSJ8fHJlcy5jb2RlPT00MDEpcmV0dXJue3ZhbGlkOmZhbHNlLHJlYXNvbjoidG9rZW7lt7Lov4fmnJ8ifTtyZXR1cm57dmFsaWQ6dHJ1ZSxyZWFzb246cmVzLm1lc3NhZ2V8fCLor7fmsYLlvILluLgifX1jYXRjaChlKXtyZXR1cm57dmFsaWQ6dHJ1ZSxyZWFzb246U3RyaW5nKGUpfX19Cgphc3luYyBmdW5jdGlvbiBnZXRVc2VyaWRCeVRva2VuKHRva2VuLGNmZyl7Y29uc3QgdD1jbGVhblRva2VuKHRva2VuKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0LCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiJ9O2xldCB1c2VySWQ9IiIsdXNlck5hbWU9IiIsZXJyb3I9bnVsbDt0cnl7Y29uc3Qgc2lnbkgwPWdldFNpZ24oImg1Iix7c2VydmVyX25hbWU6IlNNQVJUIn0sJycsY2ZnKTtjb25zdCByZXMwPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9iYXNlSW5mbz9zZXJ2ZXJfbmFtZT1TTUFSVCIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IMH0pO2lmKHJlczAmJlN0cmluZyhyZXMwLmNvZGUpPT09IjEwMDAwIiYmcmVzMC5kYXRhKXt1c2VySWQ9U3RyaW5nKHJlczAuZGF0YS5pZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhyZXMwLmRhdGEubmlja05hbWV8fCIiKX19Y2F0Y2goZSl7fWlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkh9KTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzLmRhdGEuaWR8fHJlcy5kYXRhLnVzZXJJZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhyZXMuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9fWlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0Iix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkh9KTtjb25zdCBmaW5kPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NSlyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2NvbnN0IHZhbD1vYmpba2V5XTtpZigvdXNlci4/aWR8dWlkfGNyZWF0ZS4/Ynl8b3duZXIuP2lkL2kudGVzdChrZXkpJiZ2YWwmJnR5cGVvZiB2YWwhPT0ib2JqZWN0Iil7Y29uc3Qgcz1TdHJpbmcodmFsKTtpZihzLmxlbmd0aD49MTAmJi9eXGQrJC8udGVzdChzKSlyZXR1cm4gc31pZih2YWwmJnR5cGVvZiB2YWw9PT0ib2JqZWN0Iil7Y29uc3QgZj1maW5kKHZhbCxkZXB0aCsxKTtpZihmKXJldHVybiBmfX1yZXR1cm4iIn07Y29uc3QgdWlkPWZpbmQocmVzLDApO2lmKHVpZCl7dXNlcklkPXVpZDtjb25zdCBmaW5kTmFtZT0ob2JqLGRlcHRoKT0+e2lmKCFvYmp8fGRlcHRoPjQpcmV0dXJuIiI7Zm9yKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvYmopKXtpZigvbmljay4/bmFtZXx1c2VyLj9uYW1lL2kudGVzdChrZXkpJiZvYmpba2V5XSYmdHlwZW9mIG9ialtrZXldPT09InN0cmluZyIpcmV0dXJuIG9ialtrZXldO2lmKG9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ib2JqZWN0Iil7Y29uc3Qgbj1maW5kTmFtZShvYmpba2V5XSxkZXB0aCsxKTtpZihuKXJldHVybiBufX1yZXR1cm4iIn07dXNlck5hbWU9ZmluZE5hbWUocmVzLDApfX1jYXRjaChlKXt9fWlmKCF1c2VySWQpZXJyb3I9IuiHquWKqOiOt+WPluWksei0pe+8jOivt+aJi+WKqOWhq+WGmeeUqOaIt0lEIjtyZXR1cm57b2s6ISF1c2VySWQsdXNlcklkLHVzZXJOYW1lLGVycm9yfX0KLyogPT09PT09PT09PT09PT09PT0g6LSm5Y+35pWw5o2u5ouJ5Y+WID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW5Obyl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2xldCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7Y29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgdG9kYXk9bm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgcmVzdWx0PXt1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6XnlKjmiLciLHVzZXJJZCxzY29yZTowLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czowLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6MCxsYXN0NzpbXSxlcnJvcjpudWxsLHZlaGljbGU6e2hhc1ZlaGljbGU6ZmFsc2V9fTsKaWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCB2ZWhpY2xlUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0Iix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfSk7aWYodmVoaWNsZVJlcy5jb2RlPT0iMTAwMDAiJiZ2ZWhpY2xlUmVzLmRhdGEpe2NvbnN0IGF1dG9VaWQ9U3RyaW5nKHZlaGljbGVSZXMuZGF0YS51c2VySWR8fHZlaGljbGVSZXMuZGF0YS51aWR8fHZlaGljbGVSZXMuZGF0YS5pZHx8IiIpO2lmKGF1dG9VaWQpe3VzZXJJZD1hdXRvVWlkO3Jlc3VsdC51c2VySWQ9dXNlcklkO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgaWR4PWFjY291bnRzLmZpbmRJbmRleChhPT5jbGVhblRva2VuKGEudG9rZW4pPT09dG9rZW4pO2lmKGlkeD49MCYmIWFjY291bnRzW2lkeF0udXNlcklkKXthY2NvdW50c1tpZHhdLnVzZXJJZD11c2VySWQ7c2F2ZUFjY291bnRzKGFjY291bnRzKX19fX1jYXRjaChlKXt9fQp0cnl7cmVzdWx0LnZlaGljbGU9YXdhaXQgZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnLHZpbk5vKX1jYXRjaChlKXtyZXN1bHQudmVoaWNsZT17aGFzVmVoaWNsZTpmYWxzZX19CnRyeXtpZighdXNlcklkKXtyZXN1bHQuZXJyb3I9Iuivt+WcqOiuvue9rumhteWhq+WGmeeUqOaIt0lEIn1lbHNle2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nLyIrdXNlcklkLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZCwuLi5zaWduSH0pO2lmKGluZm9SZXMuY29kZT09IjEwMDAwIiYmaW5mb1Jlcy5kYXRhKXtyZXN1bHQuc2NvcmU9TnVtYmVyKGluZm9SZXMuZGF0YS5zY29yZXx8aW5mb1Jlcy5kYXRhLmludGVncmFsfHxpbmZvUmVzLmRhdGEucG9pbnR8fGluZm9SZXMuZGF0YS5wb2ludHN8fGluZm9SZXMuZGF0YS50b3RhbFNjb3JlfHxpbmZvUmVzLmRhdGEudG90YWxJbnRlZ3JhbHx8MCl9ZWxzZSBpZihpbmZvUmVzLmNvZGU9PSI0MDAwMSJ8fGluZm9SZXMuY29kZT09NDAxKXtyZXN1bHQuZXJyb3I9IlRva2Vu5bey6L+H5pyfIn1lbHNle3Jlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5aSx6LSlOiAiKyhpbmZvUmVzLm1lc3NhZ2V8fGluZm9SZXMuY29kZXx8IuacquefpemUmeivryIpfX19Y2F0Y2goZSl7aWYoIXJlc3VsdC5lcnJvcilyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluW8guW4uDogIitTdHJpbmcoZSl9CnRyeXtjb25zdCBjdXJNb250aD1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrKG5vdy5nZXRNb250aCgpKzEpO2NvbnN0IGxhc3REYXRlPW5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLG5vdy5nZXRNb250aCgpLTEsMSk7Y29uc3QgbGFzdE1vbnRoPWxhc3REYXRlLmdldEZ1bGxZZWFyKCkrIi0iKyhsYXN0RGF0ZS5nZXRNb250aCgpKzEpO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZH07Y29uc3QgW2N1clJlcyxsYXN0UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrY3VyTW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGg6Y3VyTW9udGh9LCcnLGNmZyl9KSxodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9IitsYXN0TW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGg6bGFzdE1vbnRofSwnJyxjZmcpfSldKTtjb25zdCBsYXN0TGlzdD0obGFzdFJlcy5jb2RlPT0iMTAwMDAiJiZsYXN0UmVzLmRhdGEpPyhsYXN0UmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGN1ckxpc3Q9KGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSk/KGN1clJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBsaXN0PVsuLi5sYXN0TGlzdCwuLi5jdXJMaXN0XTtpZihjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpe3Jlc3VsdC5zaWduQ291bnQ9TnVtYmVyKGN1clJlcy5kYXRhLnNpZ25Db3VudCl8fDB9Y29uc3QgdG9kYXlFbnRyeT1jdXJMaXN0LmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduZWRUb2RheT0hISh0b2RheUVudHJ5JiYodG9kYXlFbnRyeS5zaWduU3RhdHVlPT0zfHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTV8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09MCkpO3Jlc3VsdC50b2RheVNjb3JlPXRvZGF5RW50cnk/KE51bWJlcih0b2RheUVudHJ5LmludGVncmFsU2NvcmUpfHwwKTowO3RyeXtjb25zdCBfdG9kYXlMb2dzPShnZXRMb2dzKCl8fFtdKS5maWx0ZXIobD0+bCYmbC5kYXRlPT09dG9kYXkmJlN0cmluZyhsLnVzZXJJZHx8IiIpPT09U3RyaW5nKHVzZXJJZCkmJmwuc3VjY2Vzcyk7aWYoX3RvZGF5TG9ncy5sZW5ndGg+MCl7Y29uc3QgX3RsPV90b2RheUxvZ3NbMF07cmVzdWx0LnRvZGF5U2NvcmU9TnVtYmVyKF90bC50b3RhbEdhaW4pfHxyZXN1bHQudG9kYXlTY29yZTtyZXN1bHQudG9kYXlEZXRhaWw9e3NpZ25pblNjb3JlOk51bWJlcihfdGwuc2lnbmluU2NvcmUpfHwwLGJsaW5kQm94U2NvcmU6TnVtYmVyKF90bC5ibGluZEJveFNjb3JlKXx8MCxpbnRlcmFjdFNjb3JlOk51bWJlcihfdGwuaW50ZXJhY3RTY29yZSl8fDB9fX1jYXRjaChlKXt9Y29uc3QgdG9kYXlJZHg9bGlzdC5maW5kSW5kZXgoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2xldCBjb250PTA7aWYodG9kYXlJZHg+PTApe2ZvcihsZXQgaT10b2RheUlkeDtpPj0wO2ktLSl7Y29uc3Qgc3Q9bGlzdFtpXT8uc2lnblN0YXR1ZTtpZihzdD09M3x8c3Q9PTV8fChpPT09dG9kYXlJZHgmJnN0PT0wKSljb250Kys7ZWxzZSBicmVha319cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2ZvcihsZXQgaT02O2k+PTA7aS0tKXtjb25zdCBkPW5ldyBEYXRlKCk7ZC5zZXREYXRlKGQuZ2V0RGF0ZSgpLWkpO2NvbnN0IGRzPWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGVudHJ5PWxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT1kcyk7cmVzdWx0Lmxhc3Q3LnB1c2goe2RhdGU6ZHMuc2xpY2UoNSksc2lnbmVkOiEhKGVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCkpLGlzVG9kYXk6aT09PTB9KX19Y2F0Y2goZSl7aWYoIXJlc3VsdC5lcnJvcilyZXN1bHQuZXJyb3I9IuetvuWIsOeKtuaAgeiOt+WPluWksei0pSJ9CnRyeXtjb25zdCB0b2tlbkNoZWNrPWF3YWl0IGNoZWNrVG9rZW4oYWNjLGNmZyk7cmVzdWx0LnRva2VuVmFsaWQ9dG9rZW5DaGVjay52YWxpZDtyZXN1bHQudG9rZW5SZWFzb249dG9rZW5DaGVjay5yZWFzb258fG51bGw7aWYodG9rZW5DaGVjay52YWxpZCYmdG9rZW5DaGVjay51c2VyTmFtZSYmKCFyZXN1bHQudXNlck5hbWV8fHJlc3VsdC51c2VyTmFtZT09PSLmnKrnn6XnlKjmiLciKSlyZXN1bHQudXNlck5hbWU9dG9rZW5DaGVjay51c2VyTmFtZX1jYXRjaChlKXtyZXN1bHQudG9rZW5WYWxpZD10cnVlfQpyZXR1cm4gcmVzdWx0fQoKZnVuY3Rpb24gZ2V0UG9zdElkRnJvbURhdGEoZGF0YSl7aWYoIWRhdGEpcmV0dXJuIG51bGw7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nInx8dHlwZW9mIGRhdGE9PT0ibnVtYmVyIilyZXR1cm4gU3RyaW5nKGRhdGEpO2lmKEFycmF5LmlzQXJyYXkoZGF0YSkpcmV0dXJuIGdldFBvc3RJZEZyb21EYXRhKGRhdGFbMF0pO2NvbnN0IGRpcmVjdD1kYXRhLnV1aWR8fGRhdGEudHV1aWR8fGRhdGEucG9zdElkfHxkYXRhLnBvc3RpZHx8ZGF0YS5hcnRpY2xlSWR8fGRhdGEuYXJ0aWNsZUlEfHxkYXRhLmlkfHxkYXRhLmRhdGFJZHx8ZGF0YS50aWQ7aWYoZGlyZWN0KXJldHVybiBTdHJpbmcoZGlyZWN0KTtmb3IoY29uc3Qga2V5IG9mIFsicmVjb3JkcyIsImxpc3QiLCJyb3dzIiwiZGF0YSIsInJlc3VsdCJdKXtjb25zdCB2PWRhdGFba2V5XTtjb25zdCBwaWQ9Z2V0UG9zdElkRnJvbURhdGEodik7aWYocGlkKXJldHVybiBwaWR9cmV0dXJuIG51bGx9CgovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYwgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczpmYWxzZSxzaWduaW5TY29yZTowLGJsaW5kQm94U2NvcmU6MCxpbnRlcmFjdFNjb3JlOjAsdG90YWxHYWluOjAsY29udGludWVEYXlzOjAsZXJyb3I6bnVsbCxzdGVwczpbXX07dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBtb250aD10b2RheS5zbGljZSgwLDcpOwp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRvZGF5RW50cnk9KGluZm9SZXM/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtpZih0b2RheUVudHJ5JiYodG9kYXlFbnRyeS5zaWduU3RhdHVlPT0zfHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTV8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09MCkpe3Jlc3VsdC5zdGVwcy5wdXNoKCLku4rml6Xlt7Lnrb7liLAiKX1lbHNle2xldCBzaWduUmVzPW51bGwsc2lnbk1zZz0i5pyq55+lIjtmb3IobGV0IGF0PTE7YXQ8PTM7YXQrKyl7c2lnblJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbiIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7fSwnJyxjZmcpfSx7fSk7aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIilicmVhaztzaWduTXNnPXNpZ25SZXM/Lm1lc3NhZ2V8fCLmnKrnn6UiO2lmKC/or7fnqI1856iN5ZCOfOeojeWAmXzpopHnuYF857mB5b+ZfOmHjeivlS8udGVzdChzaWduTXNnKSYmYXQ8Myl7YXdhaXQgbmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLChhdCsxKSoyMDAwKSk7Y29udGludWV9YnJlYWt9aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIil7Y29uc3QgaW5mb1JlczI9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0ZT0oaW5mb1JlczI/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmluU2NvcmU9dGU/KE51bWJlcih0ZS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5oiQ5YqfICsiK3Jlc3VsdC5zaWduaW5TY29yZSl9ZWxzZXt0cnl7Y29uc3QgY2hrPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgY2U9KGNoaz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKGNlJiYoY2Uuc2lnblN0YXR1ZT09M3x8Y2Uuc2lnblN0YXR1ZT09NXx8Y2Uuc2lnblN0YXR1ZT09MCkpcmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpO2Vsc2UgcmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOWksei0pTogIitzaWduTXNnKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfX19Cn1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5byC5bi4OiAiK2UpfQp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IGxpc3Q9aW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W107Y29uc3QgdG9kYXlJZHg9bGlzdC5maW5kSW5kZXgoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2xldCBjb250PTA7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfXJlc3VsdC5jb250aW51ZURheXM9Y29udDtjb25zdCBzaWduQ291bnQ9TnVtYmVyKGluZm9SZXM/LmRhdGE/LnNpZ25Db3VudCl8fDA7aWYoc2lnbkNvdW50Pj0zMCl7Y29uc3QgYmxpbmRSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9zdXBwbGVtZW50UHJpemU/c3VwcGxlbWVudERhdGU9Iit0b2RheSx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHtzdXBwbGVtZW50RGF0ZTp0b2RheX0sJycsY2ZnKX0pO2lmKGJsaW5kUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuYmxpbmRCb3hTY29yZT1OdW1iZXIoYmxpbmRSZXM/LmRhdGE/LmludGVncmFsfHxibGluZFJlcz8uZGF0YT8uaW50ZWdyYWxTY29yZXx8MCk7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuiOt+W+lyArIityZXN1bHQuYmxpbmRCb3hTY29yZSsiICgiKyhibGluZFJlcz8uZGF0YT8ucHJpemVzTmFtZXx8Iuenr+WIhiIpKyIpIil9fWVsc2V7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuacquino+mUgSgiK3NpZ25Db3VudCsiLzMwKSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5byC5bi4OiAiK2UpfQpjb25zdCBjb21tPWNmZy5jb21tdW5pdHl8fHt9O2xldCBwb3N0SWQ9bnVsbDsKaWYoY29tbS5lbmFibGVQb3N0IT09ZmFsc2Upe3RyeXtjb25zdCBwb3N0UmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1vbkFydGljbGUiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0Y29udGVudDoi5byA5b+D55qE5LiA5aSpIn0pO2lmKHBvc3RSZXM/LmNvZGU9PSIxMDAwMCIpe3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShwb3N0UmVzLmRhdGEpO3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJbmiJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luW8guW4uDogIitlKX19CmlmKCFwb3N0SWQpe3RyeXtjb25zdCBsaXN0UmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbXVuaXR5L21pbmVBcnRpY2xlSW5mbz91c2VySWQ9Iit1c2VySWQrIiZwYWdlPTEmcGFnZVNpemU9MTAiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtjb25zdCByYXdMaXN0PUFycmF5LmlzQXJyYXkobGlzdFJlcz8uZGF0YSk/bGlzdFJlcy5kYXRhOihsaXN0UmVzPy5kYXRhPy5yZWNvcmRzfHxsaXN0UmVzPy5kYXRhPy5saXN0fHxbXSk7Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KHJhd0xpc3QpP3Jhd0xpc3Q6W107Y29uc3QgbWluZT1saXN0LmZpbmQoaXQ9PlN0cmluZyhpdC51c2VySWR8fGl0LmNyZWF0ZUJ5fHxpdC51aWR8fCIiKT09PVN0cmluZyh1c2VySWQpKTtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEobWluZXx8bGlzdFswXXx8bGlzdFJlcz8uZGF0YSl9Y2F0Y2goZSl7fX0KaWYocG9zdElkKXtpZihjb21tLmVuYWJsZUxpa2UhPT1mYWxzZSl7dHJ5e2NvbnN0IGxpa2VSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvc29jaWFsQ29tbXUvbGlrZUZhdm9yaXRlSW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RJZDpTdHJpbmcocG9zdElkKSxraW5kRmxhZzoiMCJ9KTtpZihsaWtlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7lvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKXt0cnl7YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbWVudEluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0aWQ6U3RyaW5nKHBvc3RJZCksdXNlcklkOlN0cmluZyh1c2VySWQpLGNvbW1lbnRzOiLljonlrrMiLHNlbmRUb3M6IltcblxuXSJ9KTtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665a6M5oiQIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKXt0cnl7Y29uc3Qgc2hhcmVSZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9hcnRpY2xlL3NoYXJlLyIrcG9zdElkLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtpZihzaGFyZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+aIkOWKnyArMSIpfWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9pbnRlZ3JhbC9hZGp1c3RCeVNoYXJlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSl9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+W8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVEZWxldGUhPT1mYWxzZSYmcG9zdElkKXt0cnl7YXdhaXQgaHR0cERlbGV0ZSgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlL2RlbGV0ZUFydGljbGU/YXJ0aWNsZUlkPSIrcG9zdElkKyImcG9zdFR5cGU9MSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLliqjmgIHlt7LliKDpmaQiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Yig6Zmk5byC5bi4OiAiK2UpfX19CnJlc3VsdC50b3RhbEdhaW49cmVzdWx0LnNpZ25pblNjb3JlK3Jlc3VsdC5ibGluZEJveFNjb3JlK3Jlc3VsdC5pbnRlcmFjdFNjb3JlO3Jlc3VsdC5zdWNjZXNzPXRydWV9Y2F0Y2goZSl7cmVzdWx0LmVycm9yPVN0cmluZyhlKTtyZXN1bHQuc3RlcHMucHVzaCgi5omn6KGM5byC5bi4OiAiK2UpfXJldHVybiByZXN1bHR9CgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgVkVISUNMRV9BQ1RJT05fVEVYVD17ZmluZDoi55+t5oyJ5a+76L2mIixsb3VkRmluZDoi6bij56yb6Zeq54GvIixjdXNoaW9uOiLmiZPlvIDlnZDlnqsiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTsKZnVuY3Rpb24gdmVoaWNsZUNoZWNrUmVzKHJlcyxva01zZyl7aWYocmVzJiYhcmVzLmVycm9yJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2d9O2NvbnN0IGVyclRleHQ9U3RyaW5nKChyZXMmJihyZXMuZXJyb3J8fHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCIiKS50b0xvd2VyQ2FzZSgpO2lmKHJlcyYmcmVzLmVycm9yJiYvdGltZW91dHx0aW1lZCBvdXR8dGltZSBvdXR86K+35rGC6LaF5pe2Ly50ZXN0KGVyclRleHQpKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2crIu+8iOWTjeW6lOi2heaXtuS9hui9pui+humAmuW4uOW3suaJp+ihjO+8jOWPr+S4i+aLieWIt+aWsOehruiupO+8iSJ9O3JldHVybntvazpmYWxzZSxtZXNzYWdlOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwocmVzJiZyZXMuZXJyb3IpfHwi5oyH5Luk5LiL5Y+R5aSx6LSlIixjb2RlOnJlcyYmcmVzLmNvZGV9fQphc3luYyBmdW5jdGlvbiB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyl7dHJ5e2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtsZXQgdmluPWFjYy52aW5Ob3x8IiI7aWYoIXZpbil7Y29uc3QgbGlzdD1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjKTtpZighbGlzdHx8IWxpc3QubGVuZ3RoKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrojrflj5bliLDnu5HlrprovabovoYoVklOKe+8jOivt+ehruiupOi0puWPt+W3sue7keWumui9pui+hiJ9O3Zpbj1saXN0WzBdLnZpbk5vfWNvbnN0IGJhc2U9YmFzZUhlYWRlcnMoYWNjKTtpZihhY3Rpb249PT0iZmluZCIpe2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSwiIixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbC8iK3ZpbixoKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5a+76L2m5oyH5Luk5bey5LiL5Y+R77yM6L2m6L6G5bqU6Zeq54Gv5o+Q56S6Iil9aWYoYWN0aW9uPT09ImxvdWRGaW5kIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7cGFyYW06IjQiLHZpbjp2aW59KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2xWMiIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi6bij56yb6Zeq54Gv5oyH5Luk5bey5LiL5Y+RIil9aWYoYWN0aW9uPT09ImN1c2hpb24iKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtjb21tb25kOiIyOCIsY29tbW9uZFBhcmFtOiIxIix2Y3U6dmluLHZlcnNpb246InYyIn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L3Byb3BlcnR5VHdvL29uZSIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5byA5Z2Q5Z6r5oyH5Luk5bey5LiL5Y+R77yM5Z2Q5Z6r5bqU5by56LW3Iil9aWYoYWN0aW9uPT09InVubG9jayJ8fGFjdGlvbj09PSJsb2NrIil7Y29uc3QgdktleT0oYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpO2lmKCF2S2V5KXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLlsJrmnKrphY3nva7kupHnq6/mjqfovablr4bpkqXvvJror7fliLDjgIzorr7nva4t562+5ZCN5a+G6ZKl6YWN572u44CN5aGr5YaZ5LqR56uv5o6n6L2mQUVT5a+G6ZKl5bm25L+d5a2Y5ZCO5YaN5L2/55So5byAL+WFs+mUgSJ9O2lmKCEvXlswLTlhLWZBLUZdezMyfSQvLnRlc3QodktleSkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuS6keerr+aOp+i9puWvhumSpeagvOW8j+mUmeivr++8iOW6lOS4ujMy5L2N5Y2B5YWt6L+b5Yi277yJ77yM6K+35Yiw6K6+572u6aG15qC45a+55ZCO5L+d5a2YIn07Y29uc3QgbG9ja0ZsYWc9YWN0aW9uPT09InVubG9jayI/IjEiOiIwIjtjb25zdCBwbGFpbj0ne1xuICAibG9ja0ZsYWciIDogIicrbG9ja0ZsYWcrJyIsXG4gICJ2aW5ObyIgOiAiJyt2aW4rJyJcbn0nO2NvbnN0IHNlY3JldD1hZXMyNTZFY2JFbmNyeXB0QmFzZTY0KHBsYWluLHZLZXkpO2NvbnN0IHNlbmRCb2R5PUpTT04uc3RyaW5naWZ5KHtzZWNyZXQ6c2VjcmV0fSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LHBsYWluLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9uZXR3b3JrL3VubG9jayIsaCxzZW5kQm9keSwyNTAwMCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsYWN0aW9uPT09InVubG9jayI/IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSI6IuS6keerr+WFs+mUgeaMh+S7pOW3suS4i+WPkSIpfXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrnn6Xmk43kvZznsbvlnos6ICIrYWN0aW9ufX1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5o6n5Yi25byC5bi4OiAiK1N0cmluZyhlKX19fQoKYXN5bmMgZnVuY3Rpb24gYmFya1B1c2goYmFya0tleSx0aXRsZSxib2R5KXt0cnl7bGV0IHM9U3RyaW5nKGJhcmtLZXl8fCIiKS50cmltKCkucmVwbGFjZSgvXC8rJC8sIiIpO3M9cy5yZXBsYWNlKC9eaHR0cHM/OlwvXC9hcGlcLmRheVwuYXBwXC8vaSwiIik7aWYoIXMpcmV0dXJue3NraXBwZWQ6dHJ1ZX07bGV0IGJhc2U9Imh0dHBzOi8vYXBpLmRheS5hcHAiLGtleT1zO2NvbnN0IG09cy5tYXRjaCgvXihodHRwcz86XC9cL1teL10rKVwvKC4rKSQvaSk7aWYobSl7YmFzZT1tWzFdO2tleT1tWzJdfWtleT1rZXkucmVwbGFjZSgvXlwvKy8sIiIpO2NvbnN0IHU9YmFzZSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGtleSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudCh0aXRsZSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudChib2R5KSsiP2dyb3VwPVpFRUhPJnNvdW5kPWJpcmRzb25nIjtyZXR1cm4gYXdhaXQgaHR0cEdldCh1LHt9KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKGUpfX19CgovKiA9PT09PT09PT09PT09PT09PSDku6PnkIbmqKHlvI/vvIjmjIflkJHljp/ohJrmnKwgemVlaG8uYm94IOWQjuerr++8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBwcm94eUZldGNoKHBhdGgsb3B0cyl7Y29uc3QgcmF3QmFzZT1nZXRDZmcoKS5zZXJ2ZXJCYXNlLnJlcGxhY2UoL1wvKyQvLCIiKTtjb25zdCBiYXNlPSh3aW5kb3cuX19QQU5FTF9NT0RFX18mJiFyYXdCYXNlKT8iIjpyYXdCYXNlO2NvbnN0IHI9YXdhaXQgZmV0Y2goYmFzZStwYXRoLG9wdHN8fHt9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fQpmdW5jdGlvbiBwcm94eVBvc3QocGF0aCxib2R5KXtyZXR1cm4gcHJveHlGZXRjaChwYXRoLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sYm9keTpKU09OLnN0cmluZ2lmeShib2R5fHx7fSl9KX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLGxpbWl0KXtjb25zdCBvdXQ9bmV3IEFycmF5KGFjY291bnRzLmxlbmd0aCk7bGV0IGk9MDthc3luYyBmdW5jdGlvbiB3b3JrZXIoKXt3aGlsZShpPGFjY291bnRzLmxlbmd0aCl7Y29uc3QgaWR4PWkrKzt0cnl7b3V0W2lkeF09YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2NvdW50c1tpZHhdLGNmZyl9Y2F0Y2goZSl7b3V0W2lkeF09e3VzZXJOYW1lOmFjY291bnRzW2lkeF0udXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2NvdW50c1tpZHhdLnVzZXJJZCxzdWNjZXNzOmZhbHNlLGVycm9yOlN0cmluZyhlKX19fX1jb25zdCBuPU1hdGgubWF4KDEsTWF0aC5taW4obGltaXR8fDMsYWNjb3VudHMubGVuZ3RoKSk7YXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbSh7bGVuZ3RoOm59LHdvcmtlcikpO3JldHVybiBvdXR9Cgpjb25zdCBCYWNrZW5kPXsKICBhc3luYyBzZW5kQ29kZShwaG9uZSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zZW5kLWNvZGUiLHtwaG9uZTpwaG9uZX0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLpqozor4HnoIHlt7Llj5HpgIEiOiLlj5HpgIHlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2F1dGhDb2RlLyIrZW5jb2RlVVJJQ29tcG9uZW50KHBob25lKTsKICAgIGNvbnN0IGQ9YXdhaXQgaHR0cEdldCh1cmwseyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIkdFVCIse30sIiIsY2ZnKX0pOwogICAgcmV0dXJue29rOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIixtZXNzYWdlOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIj8i6aqM6K+B56CB5bey5Y+R6YCB77yM6K+35p+l5pS255+t5L+hIjooKGQmJihkLm1lc3NhZ2V8fGQubXNnKSl8fCLlj5HpgIHlpLHotKUiKX07CiAgfSwKICBhc3luYyBwaG9uZUxvZ2luKHBob25lLGNvZGUsYmFzaWNBdXRoKXsKICAgIGNvbnN0IGJhc2ljPVN0cmluZyhiYXNpY0F1dGh8fCIiKS50cmltKCkucmVwbGFjZSgvXkJhc2ljXHMrL2ksIiIpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcGhvbmUtbG9naW4iLHtwaG9uZTpwaG9uZSxjb2RlOmNvZGUsYmFzaWNBdXRoOmJhc2ljfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IueZu+W9leaIkOWKnyI6IueZu+W9leWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgcGF5bG9hZD17cGhvbmU6cGhvbmUsYXV0aENvZGU6Y29kZX07CiAgICBjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS91c2VyL2xvZ2luQnlQaG9uZSI7CiAgICBjb25zdCBoZHI9eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIlBPU1QiLHt9LHBheWxvYWQsY2ZnKX07CiAgICBpZihiYXNpYyloZHJbIkF1dGhvcml6YXRpb24iXT0iQmFzaWMgIitiYXNpYzsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCh1cmwsaGRyLHBheWxvYWQsMjAwMDApOwogICAgY29uc3QgdG9rZW5JbmZvPXJlcyYmcmVzLmRhdGEmJnJlcy5kYXRhLnRva2VuSW5mbztjb25zdCBhY2Nlc3NUb2tlbj10b2tlbkluZm8mJlN0cmluZyh0b2tlbkluZm8uYWNjZXNzX3Rva2VufHwiIik7CiAgICBpZighcmVzfHxTdHJpbmcocmVzLmNvZGUpIT09IjEwMDAwInx8IWFjY2Vzc1Rva2VuKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLnmbvlvZXlpLHotKXvvJoiKygocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IumqjOivgeeggeacieivr+aIluW3sui/h+acnyIpfTsKICAgIGxldCB1c2VySWQ9IiIsdXNlck5hbWU9IiI7CiAgICB0cnl7Y29uc3Qgc2lnbkgwPWdldFNpZ24oImg1Iix7c2VydmVyX25hbWU6IlNNQVJUIn0sIiIsY2ZnKTtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9iYXNlSW5mbz9zZXJ2ZXJfbmFtZT1TTUFSVCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrYWNjZXNzVG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSDB9KTtpZihpbmZvUmVzJiZTdHJpbmcoaW5mb1Jlcy5jb2RlKT09PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7dXNlcklkPVN0cmluZyhpbmZvUmVzLmRhdGEuaWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcoaW5mb1Jlcy5kYXRhLm5pY2tOYW1lfHwiIik7fX1jYXRjaChlKXt9CiAgICBjb25zdCBsaXN0PWdldEFjY291bnRzKCk7bGV0IHJlcGxhY2VkPWZhbHNlOwogICAgZm9yKGxldCBpPTA7aTxsaXN0Lmxlbmd0aDtpKyspe2lmKGxpc3RbaV0mJihTdHJpbmcobGlzdFtpXS50b2tlbnx8IiIpPT09YWNjZXNzVG9rZW58fChsaXN0W2ldLnVzZXJJZCYmdXNlcklkJiZTdHJpbmcobGlzdFtpXS51c2VySWQpPT09dXNlcklkKSkpe2xpc3RbaV0udG9rZW49YWNjZXNzVG9rZW47aWYodXNlcklkKWxpc3RbaV0udXNlcklkPXVzZXJJZDtpZih1c2VyTmFtZSlsaXN0W2ldLnVzZXJOYW1lPXVzZXJOYW1lO3JlcGxhY2VkPXRydWU7YnJlYWs7fX0KICAgIGNvbnN0IG5ld0FjYz17dXNlck5hbWU6dXNlck5hbWV8fHBob25lLHVzZXJJZDp1c2VySWQsdG9rZW46YWNjZXNzVG9rZW4sYmFya0tleToiIix1c2VyQWdlbnQ6IiJ9OwogICAgaWYoIXJlcGxhY2VkKWxpc3QucHVzaChuZXdBY2MpOwogICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgcmV0dXJue29rOnRydWUsbWVzc2FnZTpyZXBsYWNlZD8i55m75b2V5oiQ5Yqf77yM5bey5pu05paw6K+l6LSm5Y+3Ijoi55m75b2V5oiQ5Yqf77yM5bey5re75Yqg6LSm5Y+3In07CiAgfSwKICBhc3luYyBnZXREYXNoYm9hcmQoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZGF0YSIpOwogICAgICBpZihkJiZkLmFjY291bnRzKXJldHVybnthY2NvdW50czpkLmFjY291bnRzLHRpbWVzdGFtcDpkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpLGNvbmZpZzpkLmNvbmZpZ3x8bnVsbCxvazp0cnVlfTsKICAgICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuS7o+eQhuacjeWKoeaXoOWTjeW6lCIscmF3OmR9OwogICAgfQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgZGF0YT1hd2FpdCBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZywzKTsKICAgIHJldHVybnthY2NvdW50czpkYXRhLHRpbWVzdGFtcDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksb2s6dHJ1ZX07CiAgfSwKICBhc3luYyBydW5TaWduaW4odXNlcklkLGFsbCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9ydW4tc2lnbmluIixhbGw/e2FsbDp0cnVlfTp7dXNlcklkOnVzZXJJZH0pO2lmKGQmJmQucmVzdWx0cylyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOmQucmVzdWx0c307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuaJp+ihjOWksei0pSJ9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgcmVzdWx0cz1bXTtjb25zdCB0YXJnZXRzPWFsbD9hY2NvdW50czphY2NvdW50cy5maWx0ZXIoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTsKICAgIGlmKCF0YXJnZXRzLmxlbmd0aClyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOltdfTsKICAgIGZvcihjb25zdCBhY2Mgb2YgdGFyZ2V0cyl7Y29uc3Qgcj1hd2FpdCBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpO3Jlc3VsdHMucHVzaChyKTtjb25zdCBfZD1uZXcgRGF0ZSgpO2NvbnN0IF9kcz1fZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX2QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X2QudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfZHMsdHlwZToic2lnbmluIix1c2VyTmFtZTpyLnVzZXJOYW1lLHVzZXJJZDpyLnVzZXJJZCxzdWNjZXNzOnIuc3VjY2Vzcyx0b3RhbEdhaW46ci50b3RhbEdhaW4sc2lnbmluU2NvcmU6ci5zaWduaW5TY29yZSxibGluZEJveFNjb3JlOnIuYmxpbmRCb3hTY29yZSxpbnRlcmFjdFNjb3JlOnIuaW50ZXJhY3RTY29yZSxjb250aW51ZURheXM6ci5jb250aW51ZURheXMsZXJyb3I6ci5lcnJvcixzdGVwczpyLnN0ZXBzfSk7aWYoci5zdWNjZXNzJiZhY2MuYmFya0tleSYmU3RyaW5nKGFjYy5iYXJrS2V5KS50cmltKCkpe3RyeXthd2FpdCBiYXJrUHVzaChhY2MuYmFya0tleSwi5p6B5qC4562+5Yiw5oiQ5YqfIMK3ICIrKHIudXNlck5hbWV8fCIiKSwi5LuK5pel6I635b6XICIrci50b3RhbEdhaW4rIiDliIbvvIjnrb7liLAiK3Iuc2lnbmluU2NvcmUrIiAvIOebsuebkiIrci5ibGluZEJveFNjb3JlKyIgLyDkupLliqgiK3IuaW50ZXJhY3RTY29yZSsi77yJ77yM6L+e562+ICIrci5jb250aW51ZURheXMrIiDlpKkiKX1jYXRjaChlKXt9fX0KICAgIHJldHVybntvazp0cnVlLHJlc3VsdHN9OwogIH0sCiAgYXN5bmMgdmVoaWNsZUN0cmwodXNlcklkLGFjdGlvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wiLHt1c2VySWQ6dXNlcklkLGFjdGlvbjphY3Rpb259KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i5oyH5Luk5bey5LiL5Y+RIjoi5oyH5Luk5aSx6LSlIil9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7bGV0IGFjYz1hY2NvdW50cy5maW5kKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7aWYoIWFjYyYmYWNjb3VudHMubGVuZ3RoKWFjYz1hY2NvdW50c1swXTtpZighYWNjKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrmib7liLDotKblj7fvvIzor7flhYjlnKjorr7nva7pobXmt7vliqAifTtpZighVkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLpnZ7ms5Xmk43kvZznsbvlnosifTtjb25zdCByPWF3YWl0IHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKTtjb25zdCBfdmQ9bmV3IERhdGUoKTtjb25zdCBfdmRzPV92ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX3ZkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX3ZkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfdmQudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfdmRzLHR5cGU6InZlaGljbGUiLGFjdGlvbjphY3Rpb24sYWN0aW9uVGV4dDpWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl18fCLovabovobmjqfliLYiLHVzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczohIXIub2ssbWVzc2FnZTpyLm1lc3NhZ2V8fCIiLGVycm9yOnIub2s/IiI6KHIubWVzc2FnZXx8IuaMh+S7pOWksei0pSIpfSk7cmV0dXJuIHI7CiAgfSwKICBhc3luYyBnZXRMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2dldC1sb2dzIik7cmV0dXJuIGQmJmQubG9ncz9kLmxvZ3M6W119cmV0dXJuIGdldExvZ3MoKX0sCiAgYXN5bmMgY2xlYXJMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvY2xlYXItbG9ncyIpO3JldHVybiAhIWQub2t9cmV0dXJuIGNsZWFyTG9ncygpfSwKICBhc3luYyBzYXZlQ29uZmlnKGMpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtY29uZmlnIixjKTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQ2ZnKGMpfSwKICBhc3luYyBzYXZlQWNjb3VudHMobGlzdCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2FjY291bnRzOmxpc3R9KTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQWNjb3VudHMobGlzdCl9LAogIGFzeW5jIGdldFVzZXJpZCh0b2tlbil7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvZ2V0LXVzZXJpZCIse3Rva2VuOnRva2VufSk7cmV0dXJue29rOiEhZC5vayx1c2VySWQ6ZC51c2VySWR8fCIiLHVzZXJOYW1lOmQudXNlck5hbWV8fCIiLGVycm9yOmQuZXJyb3J8fCIifX1yZXR1cm4gZ2V0VXNlcmlkQnlUb2tlbih0b2tlbixnZXRDZmcoKSl9LAogIGFzeW5jIGdldENvbmZpZygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9jb25maWciKTtpZihkJiZkLmNvbmZpZylyZXR1cm57b2s6dHJ1ZSxjb25maWc6ZC5jb25maWd9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLojrflj5bphY3nva7lpLHotKUifX1yZXR1cm57b2s6dHJ1ZSxjb25maWc6Z2V0Q2ZnKCl9fSwKICBhc3luYyBnZXRBY2NvdW50c0Z1bGwoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYWNjb3VudHMiKTtyZXR1cm4gQXJyYXkuaXNBcnJheShkJiZkLmFjY291bnRzKT9kLmFjY291bnRzOltdfXJldHVybiBnZXRBY2NvdW50cygpfSwKICBhc3luYyBiYWNrdXAoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9iYWNrdXAiKTtyZXR1cm4gZCYmZC5vaz9kOm51bGx9CiAgICByZXR1cm57b2s6dHJ1ZSxhcHA6IuaegeaguFpFRUhPIix0eXBlOiJ6ZWVob19iYWNrdXAiLHZlcnNpb246QVBQX1ZFUlNJT04sdGltZTpmbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSksYWNjb3VudHM6Z2V0QWNjb3VudHMoKSxjb25maWc6Z2V0Q2ZnKCl9CiAgfSwKICBhc3luYyByZXN0b3JlQmFja3VwKGpzb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvaW1wb3J0Iix7anNvbjpqc29ufSk7cmV0dXJuIGR8fHtvazpmYWxzZSxlcnJvcjoi5ZCO56uv5peg5ZON5bqUIn19CiAgICB0cnl7CiAgICAgIGNvbnN0IGI9dHlwZW9mIGpzb249PT0ic3RyaW5nIj9KU09OLnBhcnNlKGpzb24pOmpzb247CiAgICAgIGlmKCFifHwoYi50eXBlIT09InplZWhvX2JhY2t1cCImJiFBcnJheS5pc0FycmF5KGIuYWNjb3VudHMpKSlyZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuWkh+S7veagvOW8j+S4jeato+ehriJ9OwogICAgICBjb25zdCBsaXN0PShiLmFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleXx8IiIpLHVzZXJBZ2VudDphLnVzZXJBZ2VudHx8IiJ9KSk7CiAgICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgICAgaWYoYi5jb25maWcmJnR5cGVvZiBiLmNvbmZpZz09PSJvYmplY3QiKXsKICAgICAgICBjb25zdCBjdXI9Z2V0Q2ZnKCk7CiAgICAgICAgc2F2ZUNmZyh7CiAgICAgICAgICBhcHA6e2FwcElkOmIuY29uZmlnLmFwcD8uYXBwSWR8fGN1ci5hcHAuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmFwcD8uYXBwU2VjcmV0fHxjdXIuYXBwLmFwcFNlY3JldH0sCiAgICAgICAgICBoNTp7YXBwSWQ6Yi5jb25maWcuaDU/LmFwcElkfHxjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmg1Py5hcHBTZWNyZXR8fGN1ci5oNS5hcHBTZWNyZXR9LAogICAgICAgICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgICAgICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYi5jb25maWcudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKXx8Y3VyLnZlaGljbGVBZXNLZXksCiAgICAgICAgICB2ZWhpY2xlQ29udHJvbFJpc2s6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgICAgICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYi5jb25maWcuYXV0b1JlZnJlc2hTZWMpLAogICAgICAgICAgc2VydmVyQmFzZTpjdXIuc2VydmVyQmFzZQogICAgICAgIH0pOwogICAgICB9CiAgICAgIHJldHVybntvazp0cnVlLGNvdW50Omxpc3QubGVuZ3RofTsKICAgIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KICB9LAogIC8qIC0tLS0gdjIuMTQuOSDmlrDlop7lkI7nq6/og73lipvvvIjku4Xku6PnkIbmqKHlvI/vvIkgLS0tLSAqLwogIGFzeW5jIGludGVncmFsKHVzZXJJZCxwYWdlKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBERU1PX0lOVEVHUkFMOwogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvaW50ZWdyYWw/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iuenr+WIhuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHN1cHBsZW1lbnQoYWN0aW9uLHVzZXJJZCxwYXJhbXMpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIGFjdGlvbj09PSJtb250aCI/e29rOnRydWUsZGF0YTp7bm93U2lnbkRldGFpbFZvczpkZW1vQ2FsKCl9fTooREVNT19TVVBQTEVNRU5UW2FjdGlvbl18fHtvazp0cnVlLGRhdGE6MX0pOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGxldCBxPSIvYXBpL3N1cHBsZW1lbnQ/YWN0aW9uPSIrZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbikrIiZ1c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7CiAgICAgIHBhcmFtcz1wYXJhbXN8fHt9O09iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrPT57cSs9IiYiK2VuY29kZVVSSUNvbXBvbmVudChrKSsiPSIrZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1trXSl9KTsKICAgICAgcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSkKICAgIH0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6KGl562+5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgdmVoaWNsZU1vbml0b3IodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19NT05JVE9SOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvdmVoaWNsZS1tb25pdG9yP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6L2m6L6G55uR5o6n5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIHZlaGljbGVDb250cm9sRXh0KGJvZHkpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIChib2R5JiZib2R5LmFjdGlvbj09PSJvcHRpb25zIik/REVNT19DVFJMX09QVFM6e29rOnRydWUsbWVzc2FnZToi5ryU56S65qih5byP77ya5oyH5Luk5pyq55yf5a6e5LiL5Y+RIn07CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbC1leHQiLGJvZHkpfQogICAgcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6Iui9puaOp+aJqeWxleS7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBpbmZvQ2VudGVyKHVzZXJJZCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIERFTU9fSU5GTzsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL2luZm8tY2VudGVyP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi5L+h5oGv5Lit5b+D5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIGluc3RhbGxJbmZvKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYXBwLWluc3RhbGwtaW5mbyIpO3JldHVybiBkfHxudWxsfQogICAgcmV0dXJuIG51bGwKICB9Cn07Ci8qID09PT09PT09PT09PT09PT09IOmdouadv+aVsOaNruWQjOatpe+8iOmdouadv+aooeW8j++8muiuvue9rumhteS7juiEmuacrOWQjuerr+ivu+i0puWPt+S4jumFjee9ru+8iSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBhcHBseVJlbW90ZUNmZyhjKXsKICBpZighY3x8dHlwZW9mIGMhPT0ib2JqZWN0IilyZXR1cm47CiAgY29uc3QgbG9jYWw9Z2V0Q2ZnKCk7CiAgc2F2ZUNmZyh7CiAgICBhcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8bG9jYWwuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxsb2NhbC5hcHAuYXBwU2VjcmV0fSwKICAgIGg1OnthcHBJZDpjLmg1Py5hcHBJZHx8bG9jYWwuaDUuYXBwSWQsYXBwU2VjcmV0OmMuaDU/LmFwcFNlY3JldHx8bG9jYWwuaDUuYXBwU2VjcmV0fSwKICAgIGNvbW11bml0eTp7ZW5hYmxlUG9zdDpjLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmMuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmMuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sCiAgICB2ZWhpY2xlQWVzS2V5OlN0cmluZyhjLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCl8fGxvY2FsLnZlaGljbGVBZXNLZXksCiAgICB2ZWhpY2xlQ29udHJvbFJpc2s6U3RyaW5nKGMudmVoaWNsZUNvbnRyb2xSaXNrfHwiIikudHJpbSgpLAogICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSwKICAgIHNlcnZlckJhc2U6bG9jYWwuc2VydmVyQmFzZSwKICAgIGF1dG9TaWduaW46Yy5hdXRvU2lnbmluPT09dHJ1ZSwKICAgIGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksCiAgICB2ZWhpY2xlTW9uaXRvcjpjLnZlaGljbGVNb25pdG9yPT09dHJ1ZSwKICAgIHdpZGdldFZlaGljbGU6U3RyaW5nKGMud2lkZ2V0VmVoaWNsZXx8IiIpLAogICAgY3VzdG9tQmc6U3RyaW5nKGMuY3VzdG9tQmd8fCIiKQogIH0pOwp9CmxldCBwYW5lbFN5bmNpbmc9ZmFsc2U7CmFzeW5jIGZ1bmN0aW9uIGVuc3VyZVBhbmVsRGF0YShmb3JjZSl7CiAgaWYoIWlzUHJveHlNb2RlKCl8fGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApcmV0dXJuOwogIGlmKHBhbmVsU3luY2luZylyZXR1cm47CiAgaWYoIWZvcmNlJiZTVEFURS5wYW5lbExvYWRlZClyZXR1cm47CiAgcGFuZWxTeW5jaW5nPXRydWU7CiAgdHJ5ewogICAgY29uc3QgW2MsYV09YXdhaXQgUHJvbWlzZS5hbGwoW0JhY2tlbmQuZ2V0Q29uZmlnKCksQmFja2VuZC5nZXRBY2NvdW50c0Z1bGwoKV0pOwogICAgaWYoYSYmYS5sZW5ndGgpe1NUQVRFLnBhbmVsQWNjb3VudHM9YX0KICAgIGlmKGMmJmMub2smJmMuY29uZmlnKWFwcGx5UmVtb3RlQ2ZnKGMuY29uZmlnKTsKICAgIFNUQVRFLnBhbmVsTG9hZGVkPXRydWU7CiAgfWNhdGNoKGUpe30KICBwYW5lbFN5bmNpbmc9ZmFsc2U7Cn0KLyogPT09PT09PT09PT09PT09PT0g5Zu+5qCHID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEk9ewpjaGVjazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiLz48L3N2Zz4nLAp4Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+JywKemFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLApsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz4nLAp1bmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA3LjUtMS43Ii8+PC9zdmc+JywKYmVsbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggOGE2IDYgMCAxIDAtMTIgMGMwIDctMyA5LTMgOWgxOHMtMy0yLTMtOSIvPjxwYXRoIGQ9Ik0xMy43IDIxYTIgMiAwIDAgMS0zLjQgMCIvPjwvc3ZnPicsCnZvbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0VjV6Ii8+PHBhdGggZD0iTTE1LjUgOC41YTUgNSAwIDAgMSAwIDdNMTguNSA1LjVhOSA5IDAgMCAxIDAgMTMiLz48L3N2Zz4nLApzZWF0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDRoMTR2N2E0IDQgMCAwIDEtNCA0SDlhNCA0IDAgMCAxLTQtNFY0eiIvPjxwYXRoIGQ9Ik05IDE1djVoNnYtNSIvPjwvc3ZnPicsCnBpbjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDB6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPicsCnRpcmU6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjUiLz48cGF0aCBkPSJNMTIgM3Y1LjVNMTIgMTUuNVYyMU0zIDEyaDUuNU0xNS41IDEySDIxIi8+PC9zdmc+JywKYm9sdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKdGhlcm1vOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNCAxNC43NlY1YTIgMiAwIDEgMC00IDB2OS43NmE0IDQgMCAxIDAgNCAweiIvPjwvc3ZnPicsCmNhbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIzIi8+PHBhdGggZD0iTTE2IDJ2NE04IDJ2NE0zIDEwaDE4Ii8+PC9zdmc+JywKY2FyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEzIDYuNSA3LjVBMiAyIDAgMCAxIDguNCA2aDcuMmEyIDIgMCAwIDEgMS45IDEuNUwxOSAxMyIvPjxwYXRoIGQ9Ik00IDEzaDE2YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEtMSAxaC0xYTIgMiAwIDEgMS00IDBIOWEyIDIgMCAxIDEtNCAwSDRhMSAxIDAgMCAxLTEtMXYtM2ExIDEgMCAwIDEgMS0xeiIvPjwvc3ZnPicsCnNjb290ZXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+JywKcGx1ZzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAydjZNMTUgMnY2TTcgOGgxMHY0YTUgNSAwIDAgMS0xMCAwVjh6TTEyIDE3djUiLz48L3N2Zz4nLApjbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTEyIDd2NWwzIDMiLz48L3N2Zz4nLAp3aWZpOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEyLjVhMTAgMTAgMCAwIDEgMTQgME04LjUgMTZhNSA1IDAgMCAxIDcgMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTkiIHI9IjEiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPicsCmFsZXJ0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiA5djRNMTIgMTdoLjAxIi8+PHBhdGggZD0iTTEwLjMgMy45IDEuOCAxOGEyIDIgMCAwIDAgMS43IDNoMTdhMiAyIDAgMCAwIDEuNy0zTDEzLjcgMy45YTIgMiAwIDAgMC0zLjQgMHoiLz48L3N2Zz4nLAp3YXJuOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzIDIgMjFoMjBMMTIgM3oiLz48cGF0aCBkPSJNMTIgMTB2NU0xMiAxOGguMDEiLz48L3N2Zz4nLAprdjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIi8+PHBhdGggZD0iTTcgOWgzTTE0IDE1aDNNMTAgOWguMDFNMTcgMTVoLjAxIi8+PC9zdmc+JywKa2V5Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjgiIGN5PSIxNSIgcj0iNC41Ii8+PHBhdGggZD0iTTExLjIgMTEuOCAyMCAzTTE2IDdsMyAzTTEzIDEwbDIgMiIvPjwvc3ZnPicsCnVzZXJzOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjkiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIgMjFhNyA3IDAgMCAxIDE0IDBNMTYgNC42YTQgNCAwIDAgMSAwIDYuOE0xOSAyMWE2LjUgNi41IDAgMCAwLTMtNS41Ii8+PC9zdmc+JywKbWFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDMgMy41IDV2MTZMOSAxOWw2IDIgNS41LTJWM0wxNSA1IDkgM3oiLz48cGF0aCBkPSJNOSAzdjE2TTE1IDV2MTYiLz48L3N2Zz4nCn07CgovKiA9PT09PT09PT09PT09PT09PSDln7rnoYAgVUkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHRvYXN0VGltZXI9bnVsbDsKZnVuY3Rpb24gdG9hc3QobXNnLHR5cGUpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0b2FzdCIpO2VsLmNsYXNzTmFtZT10eXBlfHwiaW5mbyI7ZWwuaW5uZXJIVE1MPSh0eXBlPT09ImVyciI/SS54OnR5cGU9PT0ib2siP0kuY2hlY2s6SS53aWZpKSsnPHNwYW4+Jytlc2MobXNnKSsnPC9zcGFuPic7cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT5lbC5jbGFzc0xpc3QuYWRkKCJzaG93IikpO2NsZWFyVGltZW91dCh0b2FzdFRpbWVyKTt0b2FzdFRpbWVyPXNldFRpbWVvdXQoKCk9PmVsLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKSwyNjAwKX0KLyogdjIuMTQuMTAg5L+u5aSN77ya5pen54mI5oqK5Zue6LCD5Ye95pWw5rqQ56CB55u05o6l5ou86L+bIG9uY2xpY2sg5bGe5oCn77yMYXN5bmMg5Zue6LCD5YaF55qE5Y+M5byV5Y+35Lya5oiq5patIEhUTUwg5bGe5oCn77yMCiAgIOWvvOiHtOihpeetvi/lhZHmjaLooaXnrb7ljaEv6Ziy55uX5biD5o6n562J44CM56Gu5a6a44CN5oyJ6ZKu54K55Ye75peg5Y+N5bqU44CC5pS55Li65pqC5a2Y5Zue6LCD44CB5oyJ6ZKu6LCD55So5YWo5bGAIGNvbmZpcm1ZZXMoKSAqLwpsZXQgX19jb25maXJtQWN0PW51bGw7CmZ1bmN0aW9uIGNvbmZpcm1EaWFsb2codGl0bGUsZGVzYyxvblllcyx5ZXNUeHQpe19fY29uZmlybUFjdD1vblllcztjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7bGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+Jytlc2ModGl0bGUpKyc8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+JytkZXNjKyc8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9ImNsb3NlQ29uZmlybSgpIj7lj5bmtog8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9ImNvbmZpcm1ZZXMoKSI+Jytlc2MoeWVzVHh0fHwi56Gu5a6aIikrJzwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7bGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIil9CmZ1bmN0aW9uIGNvbmZpcm1ZZXMoKXtjbG9zZUNvbmZpcm0oKTtjb25zdCBhPV9fY29uZmlybUFjdDtfX2NvbmZpcm1BY3Q9bnVsbDtpZihhPT1udWxsKXJldHVybjt0cnl7aWYodHlwZW9mIGE9PT0iZnVuY3Rpb24iKXthKCl9ZWxzZSBpZih0eXBlb2YgYT09PSJzdHJpbmciKXtjb25zdCByPW5ldyBGdW5jdGlvbigicmV0dXJuICgiK2ErIikiKSgpO2lmKHR5cGVvZiByPT09ImZ1bmN0aW9uIilyKCl9fWNhdGNoKGUpe319CmZ1bmN0aW9uIGNsb3NlQ29uZmlybSgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKS5jbGFzc0xpc3QuYWRkKCJoaWRkZW4iKX0KZnVuY3Rpb24gb3BlblNoZWV0KHRpdGxlLGljb24saHRtbCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0VGl0bGUiKS5pbm5lckhUTUw9aWNvbisnPHNwYW4+Jytlc2ModGl0bGUpKyc8L3NwYW4+Jztkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCb2R5IikuaW5uZXJIVE1MPWh0bWw7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9ImhpZGRlbiJ9CmZ1bmN0aW9uIGNsb3NlU2hlZXQoKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iIn0KZnVuY3Rpb24gZm10VGltZShpc28pe3RyeXtjb25zdCBkPW5ldyBEYXRlKGlzbyk7Y29uc3QgcD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpO3JldHVybiBkLmdldEZ1bGxZZWFyKCkrIi0iK3AoZC5nZXRNb250aCgpKzEpKyItIitwKGQuZ2V0RGF0ZSgpKSsiICIrcChkLmdldEhvdXJzKCkpKyI6IitwKGQuZ2V0TWludXRlcygpKSsiOiIrcChkLmdldFNlY29uZHMoKSl9Y2F0Y2goZSl7cmV0dXJuIiJ9fQoKLyogPT09PT09PT09PT09PT09PT0g6aG16Z2i5YiH5o2iID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHN3aXRjaFRhYih0YWIpewogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIi50YWIiKS5mb3JFYWNoKHQ9PnQuY2xhc3NMaXN0LnRvZ2dsZSgib24iLHQuZGF0YXNldC50YWI9PT10YWIpKTsKICBjb25zdCBwYWdlcz17aG9tZToicGFnZUhvbWUiLHBvaW50czoicGFnZVBvaW50cyIsdmVoaWNsZToicGFnZVZlaGljbGUiLGxvZ3M6InBhZ2VMb2dzIixjZmc6InBhZ2VDZmcifTsKICBPYmplY3Qua2V5cyhwYWdlcykuZm9yRWFjaChrPT57Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFnZXNba10pO2lmKGVsKWVsLmNsYXNzTGlzdC50b2dnbGUoImhpZGRlbiIsayE9PXRhYil9KTsKICAvLyDnq4vljbPnrb7liLDmgqzmta7mjInpkq7ku4XpppbpobXmmL7npLoKICBjb25zdCBmYWI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpO2lmKGZhYilmYWIuc3R5bGUuZGlzcGxheT0odGFiPT09ImhvbWUiPyJmbGV4Ijoibm9uZSIpOwogIGlmKHRhYj09PSJwb2ludHMiKXJlbmRlclBvaW50cygpOwogIGlmKHRhYj09PSJ2ZWhpY2xlIil7cmVuZGVyVmVoaWNsZVBhZ2UoKTtuYXZJbml0T25UYWIoKX0KICBpZih0YWI9PT0ibG9ncyIpcmVuZGVyTG9ncygpOwogIGlmKHRhYj09PSJjZmciKXJlbmRlckNmZygpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDoh6rliqjliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHJlZnJlc2hUaW1lcj1udWxsLHJlZnJlc2hMZWZ0PTYwOwpmdW5jdGlvbiBzdGFydEF1dG9SZWZyZXNoKHNlYyl7c3RvcEF1dG9SZWZyZXNoKCk7cmVmcmVzaExlZnQ9c2VjfHxnZXRDZmcoKS5hdXRvUmVmcmVzaFNlYzt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoVGltZXI9c2V0SW50ZXJ2YWwoKCk9PntyZWZyZXNoTGVmdC0tO2lmKHJlZnJlc2hMZWZ0PD0wKXtyZWZyZXNoTGVmdD0wO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB1cGRhdGVDb3VudENoaXAoKX0sMTAwMCl9CmZ1bmN0aW9uIHN0b3BBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcil7Y2xlYXJJbnRlcnZhbChyZWZyZXNoVGltZXIpO3JlZnJlc2hUaW1lcj1udWxsfX0KZnVuY3Rpb24gdXBkYXRlQ291bnRDaGlwKCl7Y29uc3QgY2hpcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRDaGlwIik7Y29uc3QgdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudFR4dCIpO2NvbnN0IGFyYz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRBcmMiKTtjb25zdCBzZWM9Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWN8fDYwO2lmKCFjaGlwKXJldHVybjtpZihyZWZyZXNoVGltZXIpe2NoaXAuY2xhc3NMaXN0LmFkZCgib24iKTt0eHQudGV4dENvbnRlbnQ9cmVmcmVzaExlZnQrInMiO2NvbnN0IEM9MipNYXRoLlBJKjUuNjthcmMuc2V0QXR0cmlidXRlKCJzdHJva2UtZGFzaG9mZnNldCIsU3RyaW5nKEMqKDEtcmVmcmVzaExlZnQvc2VjKSkpfWVsc2V7Y2hpcC5jbGFzc0xpc3QucmVtb3ZlKCJvbiIpO3R4dC50ZXh0Q29udGVudD0i5omL5YqoIn19CmZ1bmN0aW9uIHRvZ2dsZUF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXN0b3BBdXRvUmVmcmVzaCgpO2Vsc2Ugc3RhcnRBdXRvUmVmcmVzaCgpO3VwZGF0ZUNvdW50Q2hpcCgpfQoKLyogPT09PT09PT09PT09PT09PT0g5LiL5ouJ5Yi35pawID09PT09PT09PT09PT09PT09ICovCihmdW5jdGlvbigpe2NvbnN0IHdyYXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0cldyYXAiKSxpbmQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0ckluZCIpLHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyVHh0Iiksc3Bpbj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyU3BpbiIpO2xldCBzdGFydFk9MCxwdWxsaW5nPWZhbHNlLGRpc3RhbmNlPTA7Y29uc3QgVEg9NjQ7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hzdGFydCIsZT0+e2lmKHdpbmRvdy5zY3JvbGxZPD0wJiZkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKSYmIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpLmNsYXNzTGlzdC5jb250YWlucygiaGlkZGVuIikpe3N0YXJ0WT1lLnRvdWNoZXNbMF0uY2xpZW50WTtwdWxsaW5nPXRydWU7ZGlzdGFuY2U9MH19LHtwYXNzaXZlOnRydWV9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaG1vdmUiLGU9PntpZighcHVsbGluZylyZXR1cm47Y29uc3QgZHk9ZS50b3VjaGVzWzBdLmNsaWVudFktc3RhcnRZO2lmKGR5PjAmJndpbmRvdy5zY3JvbGxZPD0wKXtkaXN0YW5jZT1NYXRoLm1pbihkeSowLjUsOTApO2luZC5zdHlsZS5oZWlnaHQ9ZGlzdGFuY2UrInB4IjtpbmQuY2xhc3NMaXN0LmFkZCgicHVsbGluZyIpO3NwaW4uc3R5bGUudHJhbnNmb3JtPSJyb3RhdGUoIisoZGlzdGFuY2UqMy42KSsiZGVnKSI7dHh0LnRleHRDb250ZW50PWRpc3RhbmNlPj1USD8i5p2+5byA5Yi35pawIjoi5LiL5ouJ5Yi35pawIjtpZihkaXN0YW5jZT49VEgmJiFlLmNhbmNlbGFibGUpcmV0dXJuO2lmKGRpc3RhbmNlPj1USCYmZS5jYW5jZWxhYmxlKWUucHJldmVudERlZmF1bHQoKX19LHtwYXNzaXZlOmZhbHNlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hlbmQiLCgpPT57aWYoIXB1bGxpbmcpcmV0dXJuO3B1bGxpbmc9ZmFsc2U7aWYoZGlzdGFuY2U+PVRIKXt0eHQudGV4dENvbnRlbnQ9IuWIt+aWsOS4reKApiI7aW5kLnN0eWxlLmhlaWdodD0iNDZweCI7c3Bpbi5jbGFzc0xpc3QuYWRkKCJzcGlubmVyIik7cmVmcmVzaEFsbCh0cnVlKS5maW5hbGx5KCgpPT57aW5kLnN0eWxlLmhlaWdodD0iMCI7aW5kLmNsYXNzTGlzdC5yZW1vdmUoInB1bGxpbmciKX0pfWVsc2V7aW5kLnN0eWxlLmhlaWdodD0iMCJ9ZGlzdGFuY2U9MH0se3Bhc3NpdmU6dHJ1ZX0pOwp9KSgpOwoKLyogPT09PT09PT09PT09PT09PT0g6aaW6aG15riy5p+TID09PT09PT09PT09PT09PT09ICovCmxldCBTVEFURT17ZGF0YTpbXSx0aW1lc3RhbXA6IiIsdHNUZXh0OiIiLHJlZnJlc2hTZWM6NjAscHJveHk6ZmFsc2UscGFuZWxBY2NvdW50czpudWxsLHBhbmVsTG9hZGVkOmZhbHNlfTsKLy8g6aaW6aG15Y2h54mH5YWl5Zy65Yqo55S75Y+q5Zyo56ys5LiA5qyh5riy5p+T5pe25pKt5pS+77yM5LmL5ZCO6Z2Z6buY5Yi35paw55u05o6l5pu/5o2i5YaF5a6577yM6YG/5YWN5bGP6ZeqCmxldCBIT01FX0FOSU09dHJ1ZTsKZnVuY3Rpb24gc2tlbGV0b25Ib21lKCl7cmV0dXJuICc8ZGl2IGNsYXNzPSJoZXJvIiBzdHlsZT0iaGVpZ2h0OjEzMnB4Ij48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NDAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzYwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2Pid9CmZ1bmN0aW9uIHNjb290ZXJGYWxsYmFjaygpe3JldHVybiAnPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPid9CgpmdW5jdGlvbiByZW5kZXJIb21lKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7Y29uc3QgZGF0YT1TVEFURS5kYXRhOwogIC8vIOS4jeWGjeWcqOavj+asoea4suafk+WJjeaPkuWFpemqqOaetuWxj++8mumdmem7mOiHquWKqOWIt+aWsOaXtuS8muWFiOa4heepuuWGjeWhq+WFhe+8jOmAoOaIkOaVtOmhtemXqueDgQogIGlmKGRhdGEubGVuZ3RoPT09MCl7CiAgICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48ZGl2IGNsYXNzPSJlLWljb24iPicrSS5jYXIrJzwvZGl2PjxoMz7ov5jmsqHmnInmnoHmoLjotKblj7c8L2gzPjxwPuWOu+OAjOiuvue9ruOAjemhtea3u+WKoOi0puWPt++8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIFRva2Vu77yIQmVhcmVyIOWJjee8gOS8muiHquWKqOWOu+aOie+8ie+8jOWGjeeCueOAjOiOt+WPlklE44CN5Y2z5Y+v6Ieq5Yqo5aGr5YWF55So5oi3SUTjgII8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5Y675re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JzsKICAgIHJldHVybjsKICB9CiAgLy8g5rKh5pyJ57uR5a6a6L2m6L6G55qE6LSm5Y+35LiN5Zyo6aaW6aG15pi+56S65Y2h54mHCiAgY29uc3QgY2FyZHM9ZGF0YS5maWx0ZXIoYT0+YS52ZWhpY2xlJiZhLnZlaGljbGUuaGFzVmVoaWNsZSkubWFwKChhLGlkeCk9PnJlbmRlckFjY291bnRDYXJkKGEsaWR4KSkuam9pbigiIik7CiAgZWwuaW5uZXJIVE1MPWNhcmRzCiAgKyc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyDmlbDmja7mm7TmlrAgJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITyIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPuS9nOiAhSBsdWNreSDCtyBHaXRIdWI8L2E+IMK3IDxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtTwvYT4gwrcg5LuF5L6b5a2m5Lmg56CU56m2PC9kaXY+JzsKICBIT01FX0FOSU09ZmFsc2U7Cn0KCmZ1bmN0aW9uIHBvd2VyVGV4dChwLGwpe3A9U3RyaW5nKHB8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtsPVN0cmluZyhsfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7Y29uc3Qgb25WYWxzPVsiMSIsIm9uIiwidHJ1ZSIsIuW8gOacuiIsIm9wZW4iLCLmv4DmtLsiLCJhY2Nfb24iLCJhY2Mgb24iLCJwb3dlcl9vbiIsInBvd2VyIG9uIiwi5bey5byA5py6Iiwi5bey5LiK55S1Il07Y29uc3Qgb2ZmVmFscz1bIjAiLCJvZmYiLCJmYWxzZSIsIuWFs+acuiIsImNsb3NlZCIsIuW+heacuiIsImFjY19vZmYiLCJhY2Mgb2ZmIiwicG93ZXJfb2ZmIiwicG93ZXIgb2ZmIiwi5bey5YWz5py6Iiwi5bey5LiL55S1Il07aWYocCl7aWYob25WYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihvZmZWYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19aWYobCl7aWYoWyIwIiwi5pyq6ZSBIiwi5byA6ZSBIiwidW5sb2NrZWQiLCJmYWxzZSIsIm9wZW4iLCLlt7LlvIDplIEiLCLmnKrplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYoWyIxIiwi5bey6ZSBIiwi6ZSB6L2mIiwibG9ja2VkIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19cmV0dXJue3RleHQ6IueKtuaAgeacquefpSIsY2xzOiJvZmYifX0KZnVuY3Rpb24gb25saW5lVGV4dChvKXtjb25zdCBzPVN0cmluZyhvfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib24iLCJvbmxpbmUiLCJ0cnVlIiwi5Zyo57q/Iiwi5bey5Zyo57q/IiwiY29ubmVjdGVkIiwibm9ybWFsIl0uaW5jbHVkZXMocykpcmV0dXJuIuWcqOe6vyI7aWYoWyIwIiwib2ZmIiwib2ZmbGluZSIsImZhbHNlIiwi56a757q/Iiwi5pyq5Zyo57q/Iiwi5bey56a757q/IiwiZGlzY29ubmVjdCIsImRpc2Nvbm5lY3RlZCIsInNsZWVwIiwi5LyR55ygIl0uaW5jbHVkZXMocykpcmV0dXJuIuemu+e6vyI7cmV0dXJuIHN9CmZ1bmN0aW9uIHJlbmRlckFjY291bnRDYXJkKGEsaWR4KXsKICBjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3Qgb25sPW9ubGluZVRleHQodi5vbmxpbmV8fHYucmlkZVN0YXRlKTsKICBjb25zdCBpc0NoYXJnaW5nPSEhKHYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1Iik7CiAgY29uc3Qgc29jPXYuYmF0dGVyeVBlcmNlbnR8fDA7CiAgY29uc3Qgc29jQ29sPXNvYzw9MjA/IiNGOTcwNkEiOnNvYzw9NTA/IiNGN0I5NTUiOiIjM0REQzk3IjsKICBjb25zdCByYW5nZT12LnJlc2lkdWFsUmFuZ2VLbXx8MDsKICBjb25zdCB2b2x0PXYudm9sdGFnZT9NYXRoLnJvdW5kKHYudm9sdGFnZSkrIlYiOiIiOwogIGNvbnN0IGZiPXNjb290ZXJGYWxsYmFjaygpOwogIC8vIG9uZXJyb3Ig6YeM5LiN6IO95YaN5bWM5aWX5byV5Y+377yI5pen5YaZ5rOV5Lya5oqKIFNWRyDlvJXlj7fmiKrmlq3vvIzpobXpnaLmrovnlZkgJyI+IOS5seeggeespuWPt++8iQogIGNvbnN0IGltZz12LnZlaGljbGVJbWFnZVVybD8nPGltZyBzcmM9IicrZXNjKHYudmVoaWNsZUltYWdlVXJsKSsnIiBhbHQ9IiIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JytmYjpmYjsKICBjb25zdCB2ZWhTdz12Lmhhc1ZlaGljbGU/cmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCk6IiI7CiAgY29uc3QgYm91bmQ9eD0+ISF4JiZ4IT09Iuacque7keWumiImJnghPT0iLSI7CiAgY29uc3Qgcm93cz1bXTsKICByb3dzLnB1c2goJ+mHjOeoi++8micrKHYudG90YWxNaWxlYWdlP3YudG90YWxNaWxlYWdlLnRvRml4ZWQoMSk6KHYubGFzdFJpZGVNaWxlYWdlP3YubGFzdFJpZGVNaWxlYWdlLnRvRml4ZWQoMSk6IjAiKSkrJ2ttJyk7CiAgcm93cy5wdXNoKCfkuIrmrKHvvJonKyh2Lnllc3RlcmRheURpc3RhbmNlP3YueWVzdGVyZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiLS0iKSsna20nKTsKICByb3dzLnB1c2goJ+W9k+aXpe+8micrKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiMCIpKydrbScrKGZtdE1pbih2LnRvZGF5RHVyYXRpb24pPyIgIitmbXRNaW4odi50b2RheUR1cmF0aW9uKToiIikrKHYudG9kYXlNYXhTcGVlZD8iICIrdi50b2RheU1heFNwZWVkKyJrbS9oIjoiIikpOwogIGlmKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSl8fGJvdW5kKHYucmVhclByZXNzdXJlKSlyb3dzLnB1c2goJ+iDjuWOi++8micrKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSk/IuWJjSAiK2VzYyh2LmZyb250UHJlc3N1cmUpOiIiKSsoKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSkmJmJvdW5kKHYucmVhclByZXNzdXJlKSk/IiAvICI6IiIpKyhib3VuZCh2LnJlYXJQcmVzc3VyZSk/IuWQjiAiK2VzYyh2LnJlYXJQcmVzc3VyZSk6IiIpKTsKICBpZihib3VuZCh2LmZyb250VGVtcCl8fGJvdW5kKHYucmVhclRlbXApKXJvd3MucHVzaCgn6IOO5rip77yaJysoYm91bmQodi5mcm9udFRlbXApPyLliY0gIitlc2Modi5mcm9udFRlbXApOiIiKSsoKGJvdW5kKHYuZnJvbnRUZW1wKSYmYm91bmQodi5yZWFyVGVtcCkpPyIgLyAiOiIiKSsoYm91bmQodi5yZWFyVGVtcCk/IuWQjiAiK2VzYyh2LnJlYXJUZW1wKToiIikpOwogIGlmKGlzQ2hhcmdpbmcmJnYuY3VycmVudClyb3dzLnB1c2goJ+eUtea1ge+8micrTnVtYmVyKHYuY3VycmVudCkudG9GaXhlZCgxKSsnQScpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNhcmQgaG9tZS1jYXJkJysoaXNDaGFyZ2luZz8nIGNoYXJnaW5nJzonJykrKEhPTUVfQU5JTT8nIGFuaW0taW4nOicnKSsnIiBzdHlsZT0iYW5pbWF0aW9uLWRlbGF5OicrKGlkeCo2MCkrJ21zIj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXVwZCI+5pu05paw77yaJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXRvcCI+PGRpdiBjbGFzcz0iaGMtbmFtZSI+Jytlc2Modi5oYXNWZWhpY2xlPyh2LnZlaGljbGVOYW1lfHxhLnVzZXJOYW1lKTphLnVzZXJOYW1lKSsnPC9kaXY+JysKICAgICh2Lmhhc1ZlaGljbGU/KG9ubD09PSLlnKjnur8iPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2Ugb24iPuWcqOe6vzwvc3Bhbj4nOihvbmw/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSI+Jytlc2Mob25sKSsnPC9zcGFuPic6IiIpKToiIikrCiAgICAoYS50b2tlblZhbGlkPT09ZmFsc2U/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSBlcnIiPlRva2Vu5aSx5pWIPC9zcGFuPic6IiIpKwogICAgKGlzQ2hhcmdpbmc/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSBjaGciPuWFheeUteS4rTwvc3Bhbj4nOiIiKSsnPC9kaXY+JysKICAgICh2Lmhhc1ZlaGljbGUmJnYudmVoaWNsZU1vZGVsPyc8ZGl2IGNsYXNzPSJoYy1tb2RlbCI+6L2m5Z6L77yaJytlc2Modi52ZWhpY2xlTW9kZWwpKyc8L2Rpdj4nOiIiKSsKICAgICh2Lmhhc1ZlaGljbGU/JzxkaXYgY2xhc3M9ImhjLW1pZCI+PGRpdiBjbGFzcz0iaGMtbGVmdCI+PGRpdiBjbGFzcz0iaGMtYmlnIG51bSI+JytNYXRoLnJvdW5kKHNvYykrJyU8c3BhbiBjbGFzcz0iaGMta20gbnVtIj4nKyhyYW5nZXx8MCkrJ2ttPC9zcGFuPicrKHZvbHQ/JzxzcGFuIGNsYXNzPSJoYy12IG51bSI+Jyt2b2x0Kyc8L3NwYW4+JzoiIikrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtYmFyIj48ZGl2IGNsYXNzPSJoYy1maWxsIiBzdHlsZT0id2lkdGg6JytNYXRoLm1heCgwLE1hdGgubWluKDEwMCxzb2MpKSsnJTtiYWNrZ3JvdW5kOicrc29jQ29sKyciPjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtcm93cyI+Jytyb3dzLm1hcChyPT4nPGRpdiBjbGFzcz0iaGMtcm93Ij4nK3IrJzwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWltZyI+JytpbWcrJzwvZGl2PjwvZGl2Pic6CiAgICAnPGRpdiBjbGFzcz0ibm8tdmVoaWNsZSIgc3R5bGU9Im1hcmdpbjoxMnB4IDAiPicrSS5jYXIrJyDor6XotKblj7fmnKrnu5HlrprovabovoY8L2Rpdj4nKSsKICAgICc8ZGl2IGNsYXNzPSJoYy1ib3R0b20iPjxkaXYgY2xhc3M9ImhjLXNjb3JlIj48c3Bhbj7mgLvnp6/liIYgPGIgY2xhc3M9Im51bSI+JytOdW1iZXIoYS5zY29yZXx8MCkudG9Mb2NhbGVTdHJpbmcoKSsnPC9iPjwvc3Bhbj48c3BhbiBjbGFzcz0icGx1cyBudW0iPuS7iisnK051bWJlcihhLnRvZGF5U2NvcmV8fDApKyc8L3NwYW4+PHNwYW4gY2xhc3M9InN0cmVhayBudW0iPui/nuetvicrTnVtYmVyKGEuY29udGludWVEYXlzfHwwKSsn5aSpPC9zcGFuPicrKGEuc2lnbmVkVG9kYXk/JzxzcGFuIGNsYXNzPSJzaWduZWQgbnVtIj7inJMg5bey562+5YiwPC9zcGFuPic6IiIpKyc8L2Rpdj48L2Rpdj4nKwogICAgdmVoU3crJzwvZGl2Pic7Cn0KZnVuY3Rpb24gZm10TWluKG1pbil7bWluPU51bWJlcihtaW4pfHwwO2lmKG1pbjw9MClyZXR1cm4iIjtjb25zdCBoPU1hdGguZmxvb3IobWluLzYwKSxtPU1hdGgucm91bmQobWluJTYwKTtyZXR1cm4gaD4wP2grImgiKyhtP20rIm1pbiI6IiIpOm0rIm1pbiJ9CgovKiA9PT09PT09PT09PT0g5aSa6L2m5YiH5o2iID09PT09PT09PT09PSAqLwpmdW5jdGlvbiByZW5kZXJWZWhpY2xlU3dpdGNoKHYsaWR4KXsKICBpZighdi52ZWhpY2xlc3x8di52ZWhpY2xlcy5sZW5ndGg8MilyZXR1cm4gIiI7CiAgY29uc3QgY3VyPXYuY3VycmVudFZpbnx8IiI7CiAgY29uc3QgaXRlbXM9di52ZWhpY2xlcy5tYXAoeD0+JzxidXR0b24gY2xhc3M9InZlaC1jaGlwJysoeC52aW5Obz09PWN1cj8iIG9uIjoiIikrJyIgb25jbGljaz0ic3dpdGNoVmVoaWNsZSgnK2lkeCsnLFwnJytlc2MoeC52aW5ObykrJ1wnKSI+Jytlc2MoeC52ZWhpY2xlVHlwZXx8eC5uYW1lKSsnPC9idXR0b24+Jykuam9pbigiIik7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJ2ZWgtc3dpdGNoIj48c3BhbiBjbGFzcz0idmVoLXN3LWxhYmVsIj7ovabovoY8L3NwYW4+JytpdGVtcysnPC9kaXY+JzsKfQphc3luYyBmdW5jdGlvbiBzd2l0Y2hWZWhpY2xlKGlkeCx2aW4pewogIGNvbnN0IHNyYz1TVEFURS5kYXRhW2lkeF07aWYoIXNyY3x8IXZpbilyZXR1cm47CiAgdHJ5ewogICAgbGV0IGQ7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3Qgcj1hd2FpdCBwcm94eUZldGNoKCIvYXBpL3ZlaGljbGU/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHNyYy51c2VySWR8fCIiKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pKTsKICAgICAgZD0ociYmci5vayk/ci5yZXN1bHQ6bnVsbDsKICAgIH1lbHNlewogICAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjPWdldEFjY291bnRzKClbaWR4XTsKICAgICAgaWYoIWFjYylyZXR1cm47CiAgICAgIGQ9YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbik7CiAgICB9CiAgICBpZihkJiZkLnZlaGljbGUmJmQudmVoaWNsZS5oYXNWZWhpY2xlKXsKICAgICAgU1RBVEUuZGF0YVtpZHhdPU9iamVjdC5hc3NpZ24oe30sU1RBVEUuZGF0YVtpZHhdLGQpOwogICAgICByZW5kZXJIb21lKCk7CiAgICB9CiAgfWNhdGNoKGUpe30KfQoKLyogPT09PT09PT09PT09IOS4u+mimO+8iHYyLjE0LjE0IOi1t+S7heS/neeVmea3seiJsuWNleS4u+mimO+8iSA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlUaGVtZSgpewogIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoImRhdGEtdGhlbWUiLCJkYXJrIik7Cn0KCi8qID09PT09PT09PT09PT09PT09IOeri+WNs+etvuWIsOaCrOa1ruaMiemSriA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBtb3VudFNpZ25pbkZhYigpewogIGlmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKSlyZXR1cm47CiAgY29uc3QgYj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJidXR0b24iKTsKICBiLmlkPSJzaWduaW5GYWIiO2IuY2xhc3NOYW1lPSJzaWduaW4tZmFiIjtiLmlubmVySFRNTD0oSS5jaGVja3x8IiIpKyI8c3Bhbj7nq4vljbPnrb7liLA8L3NwYW4+IjsKICBiLm9uY2xpY2s9cnVuU2lnbmluTm93OwogIGNvbnN0IGN1cj1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCIudGFiLm9uIik7CiAgYi5zdHlsZS5kaXNwbGF5PSghY3VyfHxjdXIuZGF0YXNldC50YWI9PT0iaG9tZSIpPyJmbGV4Ijoibm9uZSI7CiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChiKTsKfQphc3luYyBmdW5jdGlvbiBydW5TaWduaW5Ob3coKXsKICBpZihpc0RlbW8oKSl7ZGVtb1NpZ25pbigpO3JldHVybn0KICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpOwogIGlmKCFidG58fGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoImJ1c3kiKSlyZXR1cm47CiAgYnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnrb7liLDkuK3igKYiOwogIHRvYXN0KCLmraPlnKjkuLrlhajpg6jotKblj7fmiafooYznrb7liLDigKYiLCJpbmZvIik7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnJ1blNpZ25pbihudWxsLHRydWUpOwogIGJ0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i56uL5Y2z562+5YiwIjsKICBpZihkJiZkLm9rJiZkLnJlc3VsdHMpewogICAgY29uc3Qgb2tOPWQucmVzdWx0cy5maWx0ZXIocj0+ci5zdWNjZXNzKS5sZW5ndGg7CiAgICB0b2FzdCgi562+5Yiw5a6M5oiQ77yaIitva04rIi8iK2QucmVzdWx0cy5sZW5ndGgrIiDmiJDlip8iLG9rTj09PWQucmVzdWx0cy5sZW5ndGg/Im9rIjoiZXJyIik7CiAgICBvcGVuU2hlZXQoIuetvuWIsOe7k+aenCIsSS5jaGVjayxzaWduaW5SZXN1bHRIdG1sKGQucmVzdWx0cykpOwogICAgcmVmcmVzaEFsbCh0cnVlKTsKICB9ZWxzZXsKICAgIHRvYXN0KChkJiZkLmVycm9yKXx8IuetvuWIsOaJp+ihjOWksei0pSIsImVyciIpOwogIH0KfQpmdW5jdGlvbiBzaWduaW5SZXN1bHRIdG1sKHJlc3VsdHMpewogIHJldHVybiAocmVzdWx0c3x8W10pLm1hcChyPT4nPGRpdiBjbGFzcz0ic2lnLWNhcmQgJysoci5zdWNjZXNzPyJvayI6ImZhaWwiKSsnIj48ZGl2IGNsYXNzPSJoIj48c3Bhbj4nK2VzYyhyLnVzZXJOYW1lfHwi5pyq55+lIikrJzwvc3Bhbj48c3BhbiBjbGFzcz0iciI+Jysoci5zdWNjZXNzPygiKyIrKHIudG90YWxHYWlufHwwKSsiIOWIhiIpOiLlpLHotKUiKSsnPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9InN0ZXBzIj4nKyhyLnN0ZXBzfHxbXSkubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSsoci5lcnJvcj8nPGRpdiBjbGFzcz0iZXJyIj4nK2VzYyhyLmVycm9yKSsnPC9kaXY+JzoiIikrJzwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwp9Ci8qIOa8lOekuuaooeW8j++8muaooeaLn+S4gOasoeetvuWIsOW5tuW8ueWHuue7k+aenO+8jOmBv+WFjea8lOekuuaXtue7k+aenOS4uuepuiAqLwpmdW5jdGlvbiBkZW1vU2lnbmluKCl7CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTsKICBpZihidG4pe2J0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i562+5Yiw5Lit4oCmIn0KICB0b2FzdCgi5ryU56S65qih5byP77ya5qih5ouf5omn6KGM562+5Yiw4oCmIiwiaW5mbyIpOwogIHNldFRpbWVvdXQoKCk9PnsKICAgIGlmKGJ0bil7YnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAifQogICAgY29uc3QgcmVzPVsKICAgICAge3VzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSx0b3RhbEdhaW46OSxzdGVwczpbIuetvuWIsOaIkOWKnyArNiIsIuebsuebkuiOt+W+lyArMyAo56ev5YiGKSIsIuWPkeW4luaIkOWKnyArMSIsIueCuei1nuaIkOWKnyArMSIsIuWIhuS6q+aIkOWKnyArMSIsIuivhOiuuuWujOaIkCJdfSwKICAgICAge3VzZXJOYW1lOiLlsI/mu6EiLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6IlRva2Vu5bey6L+H5pyf77yM6K+36YeN5paw55m75b2VIixzdGVwczpbIuetvuWIsOWksei0pTog6K+35YWI55m75b2VIl19CiAgICBdOwogICAgdG9hc3QoIuetvuWIsOWujOaIkO+8mjEvMiDmiJDlip/vvIjmvJTnpLrmlbDmja7vvIkiLCJvayIpOwogICAgb3BlblNoZWV0KCLnrb7liLDnu5PmnpwiLEkuY2hlY2ssc2lnbmluUmVzdWx0SHRtbChyZXMpKTsKICB9LDcwMCk7Cn0KCgoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G6K+m5oOFICYg5Zyw5Zu+ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG9wZW5NYXAoaWR4KXtjb25zdCB2PVNUQVRFLmRhdGFbaWR4XSYmU1RBVEUuZGF0YVtpZHhdLnZlaGljbGU7aWYoIXYpcmV0dXJuO2lmKCFoYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpKXt0b2FzdCgi5pqC5peg5pyJ5pWIIEdQUyDlnZDmoIciLCJlcnIiKTtyZXR1cm59Y29uc3QgdXJsPSJodHRwczovL21hcHMuYXBwbGUuY29tLz9xPSIrTnVtYmVyKHYubGF0aXR1ZGUpKyIsIitOdW1iZXIodi5sb25naXR1ZGUpKyImej0xNyI7d2luZG93Lm9wZW4odXJsLCJfYmxhbmsiKX0KZnVuY3Rpb24gc2hvd1ZlaGljbGVEZXRhaWwoaWR4KXsKICBjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IHB3PXBvd2VyVGV4dCh2LnBvd2VyU3RhdHVzLHYubG9ja1N0YXRlKTsKICBjb25zdCByb3dzPVtdOwogIGlmKHYudmluTm8pcm93cy5wdXNoKFsn6L2m5p625Y+3JywnPHNwYW4gY2xhc3M9InYgbW9ubyIgaWQ9InZpbkR0bCI+Jytlc2MobWFza1Zpbih2LnZpbk5vKSkrJzwvc3Bhbj4gPGJ1dHRvbiBjbGFzcz0idmluLXNob3ciIG9uY2xpY2s9InRvZ2dsZUR0bFZpbigpIj7mmL7npLo8L2J1dHRvbj4nXSk7CiAgcm93cy5wdXNoKFsn5YWF55S154q25oCBJyxlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpXSk7CiAgcm93cy5wdXNoKFsn55S15rqQ54q25oCBJywnPHNwYW4gc3R5bGU9ImNvbG9yOicrKHB3LmNscz09PSJvbiI/InZhcigtLW9rKSI6InZhcigtLXR4dDIpIikrJyI+Jytwdy50ZXh0Kyc8L3NwYW4+J10pOwogIGlmKHYucmlkZVN0YXRlfHx2Lm9ubGluZSlyb3dzLnB1c2goWyfovabovobnirbmgIEnLGVzYyh2LnJpZGVTdGF0ZXx8di5vbmxpbmUpXSk7CiAgcm93cy5wdXNoKFsn55S16YePIFNPQycsJzxiIHN0eWxlPSJjb2xvcjonKyh2LmJhdHRlcnlQZXJjZW50PD0yMD8idmFyKC0tZXJyKSI6di5iYXR0ZXJ5UGVyY2VudDw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tYnJhbmQpIikrJyI+Jysodi5iYXR0ZXJ5UGVyY2VudHx8MCkrJyU8L2I+J10pOwogIGlmKHYudm9sdGFnZSlyb3dzLnB1c2goWyfnlLXljosnLHYudm9sdGFnZS50b0ZpeGVkKDEpKyJWIl0pOwogIGlmKHYuY3VycmVudClyb3dzLnB1c2goWyfnlLXmtYEnLHYuY3VycmVudC50b0ZpeGVkKDEpKyJBIl0pOwogIGlmKHYuYmF0dGVyeVRlbXApcm93cy5wdXNoKFsn55S15rGg5rip5bqmJyx2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrIsKwQyJdKTsKICByb3dzLnB1c2goWyfliankvZnnu63oiKonLCh2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrIiBrbSIrKHYucmFuZ2VFc3RpbWF0ZWQ/Iu+8iOS8sOeul++8iSI6IiIpXSk7CiAgcm93cy5wdXNoKFsn5LuK5pel6aqR6KGMJywodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOjApKyIga20gLyAiKyh2LnRvZGF5RHVyYXRpb258fDApKyIgbWluIl0pOwogIGlmKCh2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKXx8KHYucmVhclByZXNzdXJlJiZ2LnJlYXJQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKSlyb3dzLnB1c2goWyfog47ljosnLCfliY0gJytlc2Modi5mcm9udFByZXNzdXJlfHwiLSIpKycgLyDlkI4gJytlc2Modi5yZWFyUHJlc3N1cmV8fCItIildKTsKICBpZih2LmFkZHJlc3Mpcm93cy5wdXNoKFsn6L2m6L6G5L2N572uJywnPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5hZGRyZXNzKSsnPC9zcGFuPiddKTsKICBjb25zdCBkT2s9aGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKTsKICBpZihkT2spcm93cy5wdXNoKFsnR1BTIOWdkOaghycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iPicrTnVtYmVyKHYubGF0aXR1ZGUpLnRvRml4ZWQoNikrIiwgIitOdW1iZXIodi5sb25naXR1ZGUpLnRvRml4ZWQoNikrJzwvc3Bhbj4nXSk7CiAgaWYodi5sb2NhdGlvblRpbWUpcm93cy5wdXNoKFsn5pyA5ZCO5a6a5L2NJywnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5sb2NhdGlvblRpbWUpKyc8L3NwYW4+J10pOwogIGlmKHYuc2VydmljZUVuZERhdGUpcm93cy5wdXNoKFsn5pyN5Yqh5Yiw5pyfJyxlc2Modi5zZXJ2aWNlRW5kRGF0ZSldKTsKICBTVEFURS52aW5EdGxSYXc9di52aW5Ob3x8IiI7CiAgY29uc3QgaHRtbD1yb3dzLm1hcChyPT4nPGRpdiBjbGFzcz0ic3ItaXRlbSI+PHNwYW4gY2xhc3M9ImsiPicrclswXSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nK3JbMV0rJzwvc3Bhbj48L2Rpdj4nKS5qb2luKCIiKSsKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuICcrKGRPaz8icHJpbWFyeSI6IiIpKyciICcrKGRPaz8nb25jbGljaz0iY2xvc2VTaGVldCgpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJyDlnLDlm77mn6XnnIs8L2J1dHRvbj48L2Rpdj4nOwogIG9wZW5TaGVldCgi6L2m6L6G6K+m5oOFIMK3ICIrZXNjKHYudmVoaWNsZU5hbWV8fCLmnoHmoLjovabovoYiKSxJLmNhcixodG1sKTsKfQpmdW5jdGlvbiB0b2dnbGVEdGxWaW4oKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluRHRsIik7aWYoIWVsKXJldHVybjtpZihlbC50ZXh0Q29udGVudC5pbmRleE9mKCIqIik+PTApe2VsLnRleHRDb250ZW50PVNUQVRFLnZpbkR0bFJhdztkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLpmpDol48ifWVsc2V7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i5pi+56S6IjtlbC50ZXh0Q29udGVudD1tYXNrVmluKGVsLnRleHRDb250ZW50KX19Ci8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjO+8iOmdouadv+W3suenu+mZpOaJi+WKqOetvuWIsOWFpeWPo++8jOWumuaXtuetvuWIsOeUseiEmuacrCBjcm9uIOi0n+i0o++8iSA9PT09PT09PT09PT09PT09PSAqLwoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCi8vIHYyLjE0LjIxIOi9puaOp+mjjumZqeehruiupOaUueS4uummluasoeS9v+eUqOW8ueeql++8muWQjOaEj+WQjuWPr+eUqO+8jOS4jeWQjOaEj+WImeS4jeWQr+eUqApsZXQgX19yaXNrUGVuZGluZz1udWxsOwpmdW5jdGlvbiByaXNrT2soKXtjb25zdCByPShnZXRDZmcoKS52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCk7cmV0dXJuIHI9PT0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoInx8cj09PSLmiJHoh6rmhL/mib/mi4Xnm7jlhbPpo47pmakifQpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhfHwhYS51c2VySWQpe3RvYXN0KCLor6XotKblj7fnvLrlsJHnlKjmiLdJRCIsImVyciIpO3JldHVybn1pZighcmlza09rKCkpe3Nob3dSaXNrRGlhbG9nKGlkeCxhY3Rpb24pO3JldHVybn1jdHJsQ29uZmlybShpZHgsYWN0aW9uKX0KZnVuY3Rpb24gY3RybENvbmZpcm0oaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtjb25zdCBuYW1lcz17ZmluZDoi55+t5oyJ5a+76L2m77yI6L2m6L6G6Zeq54Gv77yJIixsb3VkRmluZDoi6bij56yb6Zeq54Gv77yI6auY5aOw5a+76L2m77yJIixjdXNoaW9uOiLmiZPlvIDlnZDlnqvvvIjlnZDlnqvkvJrlvLnotbfvvIkiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTtjb25zdCBuYW1lPW5hbWVzW2FjdGlvbl18fGFjdGlvbjtjb25maXJtRGlhbG9nKCLnoa7orqTmiafooYwgIituYW1lLCLor6XmjIfku6TkvJrpgJrov4cgNEcg572R57uc55yf5a6e5o6n5Yi25L2g55qE6L2m6L6G77yaIitlc2MoYS51c2VyTmFtZSkrIuOAgiIsJ2RvQ3RybCgnK2lkeCsiLCciK2FjdGlvbisiJykiKX0KZnVuY3Rpb24gc2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbil7CiAgX19yaXNrUGVuZGluZz17aWR4OmlkeCxhY3Rpb246YWN0aW9ufTsKICBjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7CiAgbGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+6L2m5o6n5Yqf6IO96aOO6Zmp5ZGK55+lPC9kaXY+PGRpdiBjbGFzcz0iY2QiPuWvu+i9piAvIOm4o+esmyAvIOWdkOWeqyAvIOW8gOmUgSAvIOWFs+mUgeetieaMh+S7pOe7jyA0RyDkupHnq6/kuIvlj5HvvIzkvJo8Yj7nnJ/lrp7mk43kvZzkvaDnmoTovabovoY8L2I+44CC5Y+X572R57uc5bu26L+f44CB5L+h5Y+3562J5b2x5ZON77yM5oyH5Luk5Y+v6IO95bu26L+f44CB5aSx6LSl77yM5p6B56uv5oOF5Ya15LiL6L2m6L6G5Y+v6IO95oSP5aSW5Yqo5L2c77yI5aaC6K+v5byA6ZSB77yJ44CC5L2/55So6L2m5o6n5Yqf6IO95Y2z6KeG5Li65L2g5bey5YWF5YiG55+l5oKJ5bm26Ieq5oS/5om/5ouF5LiK6L+w6aOO6Zmp77yM55Sx5q2k5Lqn55Sf55qE5LiA5YiH5ZCO5p6c55Sx5L2g6Ieq6KGM5om/5ouF44CCPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJyaXNrRGVjbGluZSgpIj7miJHkuI3lkIzmhI/po47pmankuI3kvb/nlKg8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9InJpc2tBZ3JlZSgpIj7miJHlkIzmhI/po47pmanlubbkvb/nlKg8L2J1dHRvbj48L2Rpdj48L2Rpdj4nOwogIGxheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpOwp9CmZ1bmN0aW9uIHJpc2tBZ3JlZSgpe2Nsb3NlQ29uZmlybSgpO2NvbnN0IGM9Z2V0Q2ZnKCk7Yy52ZWhpY2xlQ29udHJvbFJpc2s9IuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqCI7QmFja2VuZC5zYXZlQ29uZmlnKGMpLnRoZW4oZnVuY3Rpb24ob2spe2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKWFwcGx5UmVtb3RlQ2ZnKGMpO2Vsc2Ugc2F2ZUNmZyhjKTt0b2FzdCgi5bey5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95bey5ZCv55SoIiwib2siKTtpZihfX3Jpc2tQZW5kaW5nKXtjb25zdCBwPV9fcmlza1BlbmRpbmc7X19yaXNrUGVuZGluZz1udWxsO2N0cmxDb25maXJtKHAuaWR4LHAuYWN0aW9uKX19ZWxzZXt0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7X19yaXNrUGVuZGluZz1udWxsfX0pfQpmdW5jdGlvbiByaXNrRGVjbGluZSgpe2Nsb3NlQ29uZmlybSgpO19fcmlza1BlbmRpbmc9bnVsbDt0b2FzdCgi5bey6YCJ5oup5LiN5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95LiN5ZCv55SoIiwiaW5mbyIpfQphc3luYyBmdW5jdGlvbiBkb0N0cmwoaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgYnRuPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jdHJsLWJ0bltkYXRhLWFjdD0iJythY3Rpb24rJyJdJyk7Y29uc3Qgb2xkPWJ0bj9idG4uaW5uZXJIVE1MOiIiO2lmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4uaW5uZXJIVE1MPUkuY2xvY2t9dG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTtjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUN0cmwoYS51c2VySWQsYWN0aW9uKTtpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5pbm5lckhUTUw9b2xkfWlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IuaMh+S7pOW3suS4i+WPkSIsIm9rIil9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuaMh+S7pOWksei0pSIsImVyciIpfX0KCi8qID09PT09PT09PT09PT09PT09IOaXpeW/l+mhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9nRmlsdGVyPSJhbGwiOwphc3luYyBmdW5jdGlvbiByZW5kZXJMb2dzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VMb2dzIik7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua3YrJ+i/kOihjOaXpeW/lzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImxvZy1wYW5lbCI+PGRpdiBjbGFzcz0ibG9nLWhlYWQiPjxoMz4nK0kua3YrJzxzcGFuPuacgOi/kSA1MCDmnaE8L3NwYW4+PC9oMz48ZGl2IGNsYXNzPSJsb2ctZmlsdGVycyI+JysKICBbJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09ImFsbCI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnYWxsXCcpIj7lhajpg6g8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJzaWduaW4iPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3NpZ25pblwnKSI+562+5YiwPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0idmVoaWNsZSI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwndmVoaWNsZVwnKSI+5o6n6L2mPC9idXR0b24+J10uam9pbigiIikrCiAgJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImxvZy1saXN0IiBpZD0ibG9nTGlzdCI+PGRpdiBzdHlsZT0icGFkZGluZzo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpIj7liqDovb3kuK3igKY8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBzdHlsZT0iZmxleDoxIiBvbmNsaWNrPSJjbGVhckxvZ3NVSSgpIj7muIXnqbrml6Xlv5c8L2J1dHRvbj48L2Rpdj4nOwogIGNvbnN0IGxvZ3M9bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MD9ERU1PX0xPR1M6YXdhaXQgQmFja2VuZC5nZXRMb2dzKCk7cmVuZGVyTG9nTGlzdChsb2dzKTsKfQpmdW5jdGlvbiBzZXRMb2dGaWx0ZXIoZil7bG9nRmlsdGVyPWY7cmVuZGVyTG9ncygpfQpmdW5jdGlvbiByZW5kZXJMb2dMaXN0KGxvZ3Mpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJsb2dMaXN0Iik7aWYoIWVsKXJldHVybjtjb25zdCBsaXN0PShsb2dzfHxbXSkuZmlsdGVyKGw9Pntjb25zdCB0PWwudHlwZXx8InNpZ25pbiI7aWYobG9nRmlsdGVyPT09ImFsbCIpcmV0dXJuIHRydWU7cmV0dXJuIHQ9PT1sb2dGaWx0ZXJ9KTtpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ibG9nLWVtcHR5Ij4nK0kud2FybisnPGJyPuivpeWIhuexu+S4i+aaguaXoOaXpeW/lzwvZGl2Pic7cmV0dXJufWVsLmlubmVySFRNTD1saXN0Lm1hcCgobG9nLGkpPT57Y29uc3QgdD1sb2cudHlwZXx8InNpZ25pbiI7Y29uc3QgdGFnPXQ9PT0idmVoaWNsZSI/JzxzcGFuIGNsYXNzPSJwaWxsIGFtYmVyIj7mjqfovaY8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgY3lhbiI+562+5YiwPC9zcGFuPic7bGV0IHJlcztpZih0PT09InZlaGljbGUiKXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuYWN0aW9uVGV4dHx8Iui9pui+huaOp+WItiIpKycgJysobG9nLnN1Y2Nlc3M/IuaIkOWKnyI6IuWksei0pe+8miIrZXNjKGxvZy5tZXNzYWdlfHxsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWVsc2V7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLnN1Y2Nlc3M/IuaIkOWKnyArIitsb2cudG90YWxHYWluOiLlpLHotKU6ICIrKGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9Y29uc3Qgc3RlcHM9bG9nLnN0ZXBzPyhsb2cuc3RlcHMubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSk6IiI7cmV0dXJuICc8ZGl2IGNsYXNzPSJsb2ctaXRlbSIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpKjI1KSsnbXMiPjxkaXYgY2xhc3M9ImxvZy10aW1lIj4nK2VzYyhsb2cudGltZXx8IiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbWFpbiI+Jyt0YWcrJzxzcGFuIGNsYXNzPSJsb2ctdXNlciI+Jytlc2MobG9nLnVzZXJOYW1lfHwiIikrJzwvc3Bhbj4nK3JlcysnPC9kaXY+Jysoc3RlcHM/JzxkaXYgY2xhc3M9ImxvZy1zdGVwcyI+JytzdGVwcysnPC9kaXY+JzoiIikrJzwvZGl2Pid9KS5qb2luKCIiKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzVUkoKXtjb25maXJtRGlhbG9nKCLmuIXnqbrml6Xlv5ciLCLlsIbliKDpmaTlhajpg6jov5DooYzml6Xlv5fvvIzmraTmk43kvZzkuI3lj6/mgaLlpI3jgIIiLCJjbGVhckxvZ3NOb3ciKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzTm93KCl7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5jbGVhckxvZ3MoKTtpZihvayl7dG9hc3QoIuaXpeW/l+W3sua4heepuiIsIm9rIik7cmVuZGVyTG9ncygpfWVsc2UgdG9hc3QoIua4heepuuWksei0pSIsImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g6K6+572u6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBjZmdBY2NvdW50cz1bXTsKZnVuY3Rpb24gcmVuZGVyQ2ZnKCl7CiAgaWYoaXNQcm94eU1vZGUoKSYmbG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKTwwJiYhU1RBVEUucGFuZWxMb2FkZWQpewogICAgY29uc3QgZWwwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlQ2ZnIik7CiAgICBpZihlbDApZWwwLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyNnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mraPlnKjku47ohJrmnKzlkI7nq6/lkIzmraXotKblj7fkuI7phY3nva7igKY8L2Rpdj48L2Rpdj4nOwogICAgZW5zdXJlUGFuZWxEYXRhKCkudGhlbigoKT0+cmVuZGVyQ2ZnKCkpOwogICAgcmV0dXJuOwogIH0KICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y2ZnQWNjb3VudHM9KGlzUHJveHlNb2RlKCkmJlNUQVRFLnBhbmVsQWNjb3VudHM/U1RBVEUucGFuZWxBY2NvdW50czpnZXRBY2NvdW50cygpKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmEudG9rZW58fCIiLGJhcmtLZXk6YS5iYXJrS2V5fHwiIn0pKTsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogIGNvbnN0IGFjY1Jvd3M9Y2ZnQWNjb3VudHMubWFwKChhLGlkeCk9Pic8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJOYW1lKSsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJJZCkrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbu+8iOeymOi0tOWNs+WPr++8jOiHquWKqOWOu+aOiSBCZWFyZXIg5YmN57yA77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS50b2tlbikrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8jOetvuWIsOaIkOWKn+aOqOmAge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS5iYXJrS2V5KSsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgY29uc3QgY29tbT1jZmcuY29tbXVuaXR5OwogIGNvbnN0IHN3PShpZCxsYWJlbCxzdWIsY2hlY2tlZCk9Pic8bGFiZWwgY2xhc3M9InN3aXRjaCI+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0iJytpZCsnIiAnKyhjaGVja2VkPyJjaGVja2VkIjoiIikrJz48c3BhbiBjbGFzcz0ic3ciPjwvc3Bhbj48c3BhbiBjbGFzcz0ibGJsIj4nK2xhYmVsKyc8L3NwYW4+PHNwYW4gY2xhc3M9InNjIj4nK3N1YisnPC9zcGFuPjwvbGFiZWw+JzsKICBlbC5pbm5lckhUTUw9CiAgJzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rZXkrJ+iuvue9rjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuaJi+acuuWPt+eZu+W9lTwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCic8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7miYvmnLrlj7fvvIjmnoHmoLggQXBwIOe7keWumuWPt+egge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRlbCIgaWQ9InBsX3Bob25lIiBwbGFjZWhvbGRlcj0iMTEg5L2N5omL5py65Y+3IiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuefreS/oemqjOivgeeggTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJwbF9jb2RlIiBwbGFjZWhvbGRlcj0iNiDkvY3pqozor4HnoIEiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwonPC9kaXY+JysKJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2VuZFNtc0NvZGUoKSIgaWQ9InBsX3NlbmRfYnRuIj7ojrflj5bpqozor4HnoIE8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icGhvbmVMb2dpblVJKCkiIGlkPSJwbF9sb2dpbl9idG4iPueZu+W9leW5tua3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7nlKjmiYvmnLrlj7cgKyDnn63kv6Hpqozor4HnoIHnmbvlvZXvvIzoh6rliqjojrflj5YgVG9rZW4g5LiO55So5oi3SUTlubbliqDlhaXotKblj7fliJfooajvvIznmbvlvZXmiJDlip/lkI7oh6rliqjkv53lrZjlubbliLfmlrDpobXpnaLjgII8YnI+wrcg5bCP5Y+355m75b2V77ya5Y+v5aSa5qyh55m75b2V5LiN5ZCM5omL5py65Y+377yM5oyJ5bCP5Y+36YCQ5Liq5re75Yqg5LiO566h55CG44CCPGJyPsK3IOacjeWKoeWIsOacnyAvIOe7keWumue7rei0ue+8mui9pui+huaZuuiDveacjeWKoeWIsOacn+OAgeaIlumcgOimgee7keWumue7rei0ueaXtu+8jOmHjeaWsOeUqOaJi+acuuWPt+eZu+W9leWNs+WPr+WIt+aWsOaOiOadg++8jOWFqOeoi+aXoOmcgOaKk+WMheOAgjwvZGl2PicrCic8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPuWumuaXtuetvuWIsDwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgc3coImF1dG9fc2lnbmluIiwi5a6a5pe2562+5YiwIiwi5Yiw54K56Ieq5Yqo5Li65YWo6YOo6LSm5Y+3562+5YiwIixjZmcuYXV0b1NpZ25pbj09PXRydWUpKwogIHN3KCJ2ZWhpY2xlX21vbml0b3IiLCLovabovobnirbmgIHnm5HmjqciLCLlhYXmu6Ev56a757q/5pe25pys5Zyw6YCa55+l5o+Q6YaS77yI5omT5byA6Z2i5p2/5pe25qOA5p+l77yJIixjZmcudmVoaWNsZU1vbml0b3I9PT10cnVlKSsKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+562+5Yiw5pe26Ze077yI5q+P5aSp77yMSEg6TU3vvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0aW1lIiBpZD0iY2ZnX3NpZ25pbl90aW1lIiB2YWx1ZT0iJytlc2MoY2ZnLmF1dG9TaWduaW5UaW1lfHwiMDc6MDAiKSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5Luj55CG6ISa5pys5peg5bi46am75ZCO5Y+w77yM6YeH55So44CM5omT5byA6KGl562+44CN5py65Yi277ya5byA5ZCv5ZCO77yM5q+P5aSp6aaW5qyh5omT5byA6Z2i5p2/5LiU5bey6L+H6K6+5a6a5pe26Ze05pe277yM6Ieq5Yqo5Li65YWo6YOo6LSm5Y+35omn6KGM5LiA5qyh562+5Yiw77yI5YaZ5pel5b+X44CB5o6oIEJhcmvvvIzkuI7miYvliqjnrb7liLDkuIDoh7TvvInvvIzlkIzkuIDlpKnlj6rmiafooYzkuIDmrKHjgILpppbpobXjgIznq4vljbPnrb7liLDjgI3mgqzmta7mjInpkq7lj6/pmo/ml7bmiYvliqjmiafooYzjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuekvuWMuuS7u+WKoeW8gOWFszwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCIgc3R5bGU9ImdhcDo4cHgiPicrCiAgc3coImNvbW1fcG9zdCIsIuWPkeW4g+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVQb3N0IT09ZmFsc2UpK3N3KCJjb21tX2xpa2UiLCLngrnotZ7liqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKStzdygiY29tbV9jb21tZW50Iiwi6K+E6K665Yqo5oCBIiwi5LiN5Yqg5YiGIixjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSkrc3coImNvbW1fc2hhcmUiLCLliIbkuqvliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSkrc3coImNvbW1fZGVsZXRlIiwi5omn6KGM5ZCO5Yig6Zmk5Yqo5oCBIiwi5riF55CG55eV6L+5Iixjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlKSsKICAnPC9kaXY+PGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5YWz6Zet5a+55bqU5byA5YWz5ZCO77yM562+5Yiw6ISa5pys5bCG6Lez6L+H6K+l5Lu75Yqh44CC5L+u5pS55ZCO54K55Ye76aG16Z2i5bqV6YOo44CM5L+d5a2Y6YWN572u44CN55Sf5pWI44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIbvvIgnK2NmZ0FjY291bnRzLmxlbmd0aCsnIOS4qu+8iTwvaDM+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFkZEFjY291bnRVSSgpIj4rIOa3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0iYWNjTGlzdCI+JysoYWNjUm93c3x8JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjJweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pqC5peg6LSm5Y+377yM54K55Ye744CM5re75Yqg6LSm5Y+344CNPC9kaXY+JykrJzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVBY2NvdW50c1VJKCkiPuS/neWtmOaegeaguOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ub3RlIj48Yj7kvb/nlKjor7TmmI48L2I+PGJyPsK3IFRva2Vu77ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24g5YC85Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIDxjb2RlPkJlYXJlciA8L2NvZGU+IOWJjee8gOOAgjxicj7CtyDojrflj5ZJRO+8muWhq+WFpSBUb2tlbiDlkI7ngrnjgIzojrflj5ZJROOAje+8jOiHquWKqOS7jiBINSBiYXNlSW5mbyAvIEFwcCBzZXR0aW5nIC8g6L2m6L6G5YiX6KGo5o6l5Y+j6Kej5p6Q55So5oi3SUTkuI7mmLXnp7DjgII8YnI+wrcgQmFyayBLZXnvvJror6XotKblj7fnrb7liLDmiJDlip/lkI7mjqjpgIHpgJrnn6XvvIznlZnnqbrkuI3mjqjjgII8YnI+wrcg5o6n6L2m5oyH5Luk77yI5a+76L2mL+m4o+esmy/lnZDlnqsv5byA5YWz6ZSB77yJ5Lya55yf5a6e5pON5L2c6L2m6L6G77yM6ZyA5LqM5qyh56Gu6K6k44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lpIfku73otKblj7fphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZXhwb3J0QmFja3VwVUkoKSI+5LiA6ZSu5a+85Ye65aSH5Lu9PC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJjb3B5QmFja3VwVUkoKSI+5aSN5Yi25aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5aSH5Lu95YaF5a6577yI5YyF5ZCr5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5Y+v5aSN5Yi25L+d5a2Y77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImJhY2t1cEFyZWEiIHJvd3M9IjQiIHJlYWRvbmx5IHBsYWNlaG9sZGVyPSLngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI3nlJ/miJDigKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7mgaLlpI3lpIfku73vvIjnspjotLTlpIfku70gSlNPTiDlkI7ngrnmgaLlpI3vvIzlsIbopobnm5bnjrDmnInotKblj7fkuI7phY3nva7vvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iaW1wb3J0QXJlYSIgcm93cz0iNCIgcGxhY2Vob2xkZXI9IueymOi0tOWkh+S7vSBKU09O4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgb25jbGljaz0iaW1wb3J0QmFja3VwVUkoKSI+5oGi5aSN5aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5aSH5Lu95YyF5ZCr5YWo6YOo6LSm5Y+377yI5pi156ewL+eUqOaIt0lEL1Rva2VuL0JhcmtLZXnvvInkuI7pnaLmnb/phY3nva7vvIjnrb7lkI3lr4bpkqUv56S+5Yy65Lu75Yqh5byA5YWzL+iHquWKqOWIt+aWsOetie+8ieOAguaNouacuuaIlumHjeijheWQjueymOi0tOWNs+WPr+S4gOmUrui/mOWOn++8jOaXoOmcgOmHjeaWsOaKk+WMheWhq+WGmeOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuWwj+e7hOS7tuaYvuekuui9pui+hjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPui0puWPtzwvbGFiZWw+PHNlbGVjdCBpZD0id2lkZ2V0X2FjYyIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzoxMHB4IDEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTRweCIgb25jaGFuZ2U9IndpZGdldEFjY0NoYW5nZWQoKSI+Jyt3aWRnZXRBY2NPcHRpb25zKCkrICc8L3NlbGVjdD48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7ovabovoY8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF92ZWgiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6MTBweCAxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjE0cHgiPjwvc2VsZWN0PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumAieaLqeWQju+8jGlPUyDmoYzpnaLlsI/nu4Tku7blsIblsZXnpLror6XovabovobnmoTlrp7ml7bnirbmgIHvvIjnlLXph48v57ut6IiqL+WFheeUtS/nrb7liLDvvInjgII8Yj7kuI3pgInmi6nml7bpu5jorqTlj5bnrKzkuIDkuKrotKblj7fnmoTnrKzkuIDovobovabjgII8L2I+5L+d5a2Y6YWN572u5ZCO55Sf5pWI44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7oh6rlrprkuYnog4zmma88L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7kuIrkvKDog4zmma/nhafniYfvvIjkvJrpk7rlnKjmt7HoibLlupXoibLkuYvkuIrvvIzlu7rorq7mt7HoibIv5L2O5Lqu5bqm5Zu+54mH5Lul5L+d6K+B5paH5a2X5Y+v6K+777yJPC9sYWJlbD48aW5wdXQgdHlwZT0iZmlsZSIgaWQ9ImJnX2ZpbGUiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4IiBvbmNoYW5nZT0iYmdGaWxlQ2hhbmdlZCh0aGlzKSI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4O2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2FsaWduLWl0ZW1zOmNlbnRlciI+PGRpdiBpZD0iYmdQcmV2aWV3IiBzdHlsZT0id2lkdGg6MTIwcHg7aGVpZ2h0OjcycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7YmFja2dyb3VuZC1zaXplOmNvdmVyO2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtvdmVyZmxvdzpoaWRkZW4iPuacqumAieaLqTwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjhweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFwcGx5QmdVcGxvYWQoKSIgaWQ9ImJnX2FwcGx5X2J0biI+5bqU55So6IOM5pmvPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZXNldEJnKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWbvueJh+S7pSBiYXNlNjQg5a2Y5YWl6YWN572u77yM6ZqP5aSH5Lu95LiA5bm25a+85Ye644CC5YiH5o2i6IOM5pmv5a6e5pe255Sf5pWI77yM5peg6ZyA6YeN5ZCv44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAvLyB2Mi4xNC4yMSDliKDpmaTjgIzovabmjqfpo47pmannoa7orqTjgI3pnaLmnb/vvJrmlLnkuLrpppbmrKHkvb/nlKjovabmjqflip/og73ml7blvLnnqpfnoa7orqTvvIjlkIzmhI8v5LiN5ZCM5oSP77yJCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5b2T5YmN5a6J6KOF5L+h5oGvPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuOTtjb2xvcjp2YXIoLS10eHQyKSIgaWQ9Imluc3RhbGxJbmZvIj4nKwogICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5q2j5Zyo5qOA5rWL5a6J6KOF5pa55byP4oCmPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbjoxNHB4IDJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVDZmdVSSgpIj7kv53lrZjphY3nva48L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InJlc2V0Q2ZnVUkoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmc6NHB4IDAiPicrCiAgJzxhIGhyZWY9Im1haWx0bzptbGluazc5OEBvdXRsb29rLmNvbSIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7inInvuI88L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+bWxpbms3OThAb3V0bG9vay5jb208L3NwYW4+PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGEgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7irZA8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+R2l0SHViIOS7k+W6kzwvc3Bhbj48L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDMpIj5jbHVjazc5OC9aRUVITzwvc3Bhbj48L2E+JysKICAnPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjowIDE2cHgiPjwvZGl2PicrCiAgJzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHgiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPvCfk4s8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjp2YXIoLS10eHQyKSI+54mI5pysPC9zcGFuPjwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrQVBQX1ZFUlNJT04rJzwvc3Bhbj48L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyAnKyhpc1Byb3h5TW9kZSgpPyfotKblj7fkuI7lr4bpkqXlrZjlgqjkuo7ohJrmnKzlkI7nq6/vvIjmnKzmnLrmjIHkuYXljJbvvIknOifmlbDmja7lrZjlgqjkuo7mnKzmnLrmtY/op4jlmaggbG9jYWxTdG9yYWdlJykrJzxicj48YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OTgiIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7niLHlj5HnlLUgwrcgYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4PC9hPjwvZGl2Pic7CiAgLy8g5bCP57uE5Lu26L2m6L6G5LiL5ouJ5Yid5aeL5YyW77yI5Zue5aGr5bey5L+d5a2Y55qE6YCJ5oup77yJCiAgY29uc3Qgd3NlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2lkZ2V0X2FjYyIpOwogIGlmKHdzZWwpewogICAgY29uc3QgY3VyPWdldENmZygpLndpZGdldFZlaGljbGU7bGV0IGN1clVpZD0iIixjdXJWaW49IiI7CiAgICBpZihjdXIpe2NvbnN0IHA9Y3VyLnNwbGl0KCJ8Iik7Y3VyVWlkPXBbMF18fCIiO2N1clZpbj1wWzFdfHwiIjt9CiAgICBpZihjdXJVaWQpd3NlbC52YWx1ZT1jdXJVaWQ7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2lkZ2V0X3ZlaCIpLmlubmVySFRNTD13aWRnZXRWZWhPcHRpb25zKHdzZWwudmFsdWV8fCIiKTsKICAgIGlmKGN1clZpbil7Y29uc3QgdnNlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2lkZ2V0X3ZlaCIpO2ZvcihsZXQgaT0wO2k8dnNlbC5vcHRpb25zLmxlbmd0aDtpKyspe2lmKHZzZWwub3B0aW9uc1tpXS52YWx1ZT09PWN1clZpbil7dnNlbC5zZWxlY3RlZEluZGV4PWk7YnJlYWt9fX0KICB9CiAgLy8g6IOM5pmv6aKE6KeI5Zue5aGrCiAgY29uc3QgYnA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJnUHJldmlldyIpOwogIGlmKGJwKXtjb25zdCBiZz1nZXRDZmcoKS5jdXN0b21CZztpZihiZyl7YnAuc3R5bGUuYmFja2dyb3VuZEltYWdlPSJ1cmwoIitiZysiKSI7YnAudGV4dENvbnRlbnQ9IiI7fX0KICByZW5kZXJJbnN0YWxsSW5mbygpOwp9Ci8qID09PT09PT09PT09PT09PT09IOW9k+WJjeWuieijheS/oeaBryA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBpbnN0YWxsRW52TmFtZSgpewogIGlmKGlzRGVtbygpKXJldHVybiAi5ryU56S65qih5byP77yI56S65L6L5pWw5o2u77yJIjsKICBjb25zdCBwPSh0eXBlb2YgbG9jYXRpb24hPT0idW5kZWZpbmVkIiYmbG9jYXRpb24ucHJvdG9jb2wpfHwiIjsKICBpZihwPT09InplZWhvOiIpcmV0dXJuICJpT1MgQXBw77yI5p6B5qC4562+5Yiw6Z2i5p2/77yJIjsKICBpZih0eXBlb2YgbmF2aWdhdG9yIT09InVuZGVmaW5lZCImJi9FbGVjdHJvbi9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudHx8IiIpKXJldHVybiAi5qGM6Z2i54mI77yIV2luZG93c++8iSI7CiAgaWYoaXNQcm94eU1vZGUoKSlyZXR1cm4gIuS7o+eQhuiEmuacrCI7CiAgcmV0dXJuICLmtY/op4jlmagiOwp9CmFzeW5jIGZ1bmN0aW9uIHJlbmRlckluc3RhbGxJbmZvKCl7CiAgY29uc3QgYm94PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbnN0YWxsSW5mbyIpOwogIGxldCBodG1sPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjhweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPui/kOihjOeOr+Wig++8mjwvYj4nK2luc3RhbGxFbnZOYW1lKCkrJzwvZGl2Pic7CiAgbGV0IGluZm89bnVsbDsKICB0cnl7aW5mbz1hd2FpdCBCYWNrZW5kLmluc3RhbGxJbmZvKCk7fWNhdGNoKGUpe2luZm89bnVsbH0KICBpZighaW5mb3x8IWluZm8uaW9zKXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+562+5ZCN5pa55byP5LuF5pSv5oyBIGlPUyBBcHAg5YaF5p+l55yL77yI6K+75Y+W5b2T5YmN5a6J6KOF5YyF55qE562+5ZCN5o+P6L+w5paH5Lu277yJ44CCPC9kaXY+JzsKICB9IGVsc2UgewogICAgY29uc3QgbT1pbmZvLnNpZ25NZXRob2R8fCJ1bmtub3duIjsKICAgIGNvbnN0IGxhYmVsPXt0cm9sbHN0b3JlOiLlt6jprZQgVHJvbGxTdG9yZe+8iOawuOS5heetvuWQje+8iSIsZW50ZXJwcmlzZToi5LyB5Lia562+5ZCN77yI5YiG5Y+R77yJIixzaWRlbG9hZDoi5Liq5Lq66Ieq562+77yINyDlpKnmnInmlYjmnJ/vvIkiLGRldmVsb3Blcjoi5byA5Y+R6ICFIC8gVGVzdEZsaWdodO+8iOmVv+acn++8iSIsdW5rbm93bjoi5peg5rOV56Gu5a6aIn1bbV18fCLml6Dms5Xnoa7lrpoiOwogICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+5a6J6KOF5pa55byP77yaPC9iPicrbGFiZWwrJzwvZGl2Pic7CiAgICBpZihpbmZvLmV4cGlyYXRpb24pewogICAgICBsZXQgZXh0cmE9IiI7CiAgICAgIGlmKHR5cGVvZiBpbmZvLmRheXNSZW1haW49PT0ibnVtYmVyIiYmaXNGaW5pdGUoaW5mby5kYXlzUmVtYWluKSYmaW5mby5kYXlzUmVtYWluPj0wKWV4dHJhPSfvvIjliankvZnnuqYgJytpbmZvLmRheXNSZW1haW4rJyDlpKnvvIknOwogICAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7nrb7lkI3mnInmlYjmnJ/oh7PvvJo8L2I+Jytlc2MoU3RyaW5nKGluZm8uZXhwaXJhdGlvbikucmVwbGFjZSgiVCIsIiAiKS5yZXBsYWNlKCJaIiwiIikpKycgJytleHRyYSsnPC9kaXY+JzsKICAgIH0KICAgIGlmKGluZm8udGVhbU5hbWV8fGluZm8udGVhbUlkKXsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+562+5ZCN5Zui6Zif77yaPC9iPicrZXNjKGluZm8udGVhbU5hbWV8fGluZm8udGVhbUlkKSsnPC9kaXY+JzsKICAgIH0KICAgIGlmKG09PT0ic2lkZWxvYWQiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7kuKrkurroh6rnrb4gNyDlpKnliLDmnJ/lkI7vvIzpnIDov57mjqXnlLXohJHnlKggQWx0U3RvcmUgLyBTaWRlbG9hZGx5IOmHjeaWsOetvuWQje+8m+W7uuiuruaUueeUqOW3qOmtlCBUcm9sbFN0b3JlIOawuOS5heetvuWQjeOAgjwvZGl2Pic7fQogICAgZWxzZSBpZihtPT09ImVudGVycHJpc2UiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7lpoLpgYfjgIzmnKrlj5fkv6Hku7vnmoTlvIDlj5HogIXjgI3vvIzor7flnKgg6K6+572uIOKGkiDpgJrnlKgg4oaSIFZQTuS4juiuvuWkh+euoeeQhiDkv6Hku7vlr7nlupTkvIHkuJror4HkuabjgII8L2Rpdj4nO30KICAgIGVsc2UgaWYobT09PSJ0cm9sbHN0b3JlIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5bey6YCa6L+HIFRyb2xsU3RvcmUg5a6J6KOF77yM5rC45LmF5pyJ5pWI44CB5LiN5oCV5o6J562+77yM5peg6ZyA55S16ISR57ut562+44CCPC9kaXY+Jzt9CiAgfQogIGlmKGJveClib3guaW5uZXJIVE1MPWh0bWw7Cn0KLyogPT09PT09PT09PT09PT09PT0g5bCP57uE5Lu26L2m6L6G6YCJ5oupID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHdpZGdldEFjY09wdGlvbnMoKXsKICBjb25zdCBsaXN0PVNUQVRFLmRhdGF8fFtdOwogIGlmKCFsaXN0Lmxlbmd0aClyZXR1cm4gJzxvcHRpb24gdmFsdWU9IiI+5pqC5peg6LSm5Y+35pWw5o2u77yI6K+35YWI5Zyo6aaW6aG15Yi35paw5Yqg6L2977yJPC9vcHRpb24+JzsKICByZXR1cm4gbGlzdC5tYXAoKGEsaSk9PnsKICAgIGNvbnN0IG5tPWVzYygoYS52ZWhpY2xlJiYoYS52ZWhpY2xlLnZlaGljbGVOYW1lfHxhLnZlaGljbGUudmVoaWNsZVR5cGUpKXx8YS51c2VyTmFtZXx8KCLotKblj7ciKyhpKzEpKSk7CiAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9IicrZXNjKGEudXNlcklkfHwiIikrJyIgZGF0YS1pPSInK2krJyI+JytubSsnPC9vcHRpb24+JzsKICB9KS5qb2luKCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRWZWhPcHRpb25zKHVpZCl7CiAgY29uc3QgbGlzdD1TVEFURS5kYXRhfHxbXTsKICBjb25zdCBhPWxpc3QuZmluZCh4PT5TdHJpbmcoeC51c2VySWR8fCIiKT09PVN0cmluZyh1aWQpKTsKICBpZighYXx8IWEudmVoaWNsZXx8IWEudmVoaWNsZS5oYXNWZWhpY2xlKXJldHVybiAnPG9wdGlvbiB2YWx1ZT0iIj7or6XotKblj7fmmoLml6Dnu5HlrprovabovoY8L29wdGlvbj4nOwogIGNvbnN0IHY9YS52ZWhpY2xlOwogIGNvbnN0IGFycj0oQXJyYXkuaXNBcnJheSh2LnZlaGljbGVzKSYmdi52ZWhpY2xlcy5sZW5ndGgpP3YudmVoaWNsZXMubWFwKHg9Pih7bmFtZTp4LnZlaGljbGVUeXBlfHx4Lm5hbWV8fHgudmluTm8sdmluOngudmluTm99KSk6W3tuYW1lOnYudmVoaWNsZVR5cGV8fHYudmVoaWNsZU5hbWV8fHYudmluTm8sdmluOnYudmluTm99XTsKICByZXR1cm4gYXJyLm1hcCh4PT4nPG9wdGlvbiB2YWx1ZT0iJytlc2MoeC52aW4pKyciPicrZXNjKHgubmFtZSkrJzwvb3B0aW9uPicpLmpvaW4oIiIpOwp9CmZ1bmN0aW9uIHdpZGdldEFjY0NoYW5nZWQoKXsKICBjb25zdCBzZWw9ZWwoIndpZGdldF9hY2MiKTtpZighc2VsKXJldHVybjsKICBlbCgid2lkZ2V0X3ZlaCIpLmlubmVySFRNTD13aWRnZXRWZWhPcHRpb25zKHNlbC52YWx1ZXx8IiIpOwp9CmZ1bmN0aW9uIHdpZGdldFNlbGVjdGlvblRleHQoKXsKICBjb25zdCBhY2M9ZWwoIndpZGdldF9hY2MiKSx2ZWg9ZWwoIndpZGdldF92ZWgiKTsKICBpZighYWNjfHwhdmVofHwhYWNjLnZhbHVlfHwhdmVoLnZhbHVlKXJldHVybiAiIjsKICByZXR1cm4gYWNjLnZhbHVlKyJ8Iit2ZWgudmFsdWU7Cn0KLyogPT09PT09PT09PT09PT09PT0g6Ieq5a6a5LmJ6IOM5pmvID09PT09PT09PT09PT09PT09ICovCmxldCBfX2JnRGF0YT0iIjsKZnVuY3Rpb24gYmdGaWxlQ2hhbmdlZChpbnApewogIGNvbnN0IGY9aW5wJiZpbnAuZmlsZXMmJmlucC5maWxlc1swXTsKICBpZighZilyZXR1cm47CiAgaWYoZi5zaXplPjYqMTAyNCoxMDI0KXt0b2FzdCgi5Zu+54mH6L+H5aSn77yI6ZmQIDZNQu+8iSIsImVyciIpO2lucC52YWx1ZT0iIjtyZXR1cm47fQogIGNvbnN0IHI9bmV3IEZpbGVSZWFkZXIoKTsKICByLm9ubG9hZD1mdW5jdGlvbigpe19fYmdEYXRhPXIucmVzdWx0O2NvbnN0IHA9ZWwoImJnUHJldmlldyIpO2lmKHApe3Auc3R5bGUuYmFja2dyb3VuZEltYWdlPSJ1cmwoIitfX2JnRGF0YSsiKSI7cC50ZXh0Q29udGVudD0iIjt9dG9hc3QoIuW3sumAieaLqeWbvueJh++8jOeCueOAjOW6lOeUqOiDjOaZr+OAjeeUn+aViCIsImluZm8iKTt9OwogIHIucmVhZEFzRGF0YVVSTChmKTsKfQpmdW5jdGlvbiBhcHBseUJnVXBsb2FkKCl7CiAgaWYoIV9fYmdEYXRhKXt0b2FzdCgi6K+35YWI6YCJ5oup5Zu+54mHIiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBjPWdldENmZygpO2MuY3VzdG9tQmc9X19iZ0RhdGE7c2F2ZUNmZyhjKTsKICBhcHBseUN1c3RvbUJnKCk7CiAgY29uc3QgaW5wPWVsKCJiZ19maWxlIik7aWYoaW5wKWlucC52YWx1ZT0iIjsKICBfX2JnRGF0YT0iIjsKICB0b2FzdCgi6IOM5pmv5bey5bqU55SoIiwib2siKTsKfQpmdW5jdGlvbiByZXNldEJnKCl7CiAgY29uc3QgYz1nZXRDZmcoKTtjLmN1c3RvbUJnPSIiO3NhdmVDZmcoYyk7CiAgYXBwbHlDdXN0b21CZygpOwogIGNvbnN0IHA9ZWwoImJnUHJldmlldyIpO2lmKHApe3Auc3R5bGUuYmFja2dyb3VuZEltYWdlPSIiO3AudGV4dENvbnRlbnQ9IuacqumAieaLqSI7fQogIHRvYXN0KCLlt7LmgaLlpI3pu5jorqTog4zmma8iLCJpbmZvIik7Cn0KZnVuY3Rpb24gYXBwbHlDdXN0b21CZygpewogIGNvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnLGI9ZG9jdW1lbnQuYm9keTsKICBpZihiZyl7Yi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjtiLnN0eWxlLmJhY2tncm91bmRTaXplPSJjb3ZlciI7Yi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb249ImNlbnRlciI7Yi5zdHlsZS5iYWNrZ3JvdW5kQXR0YWNobWVudD0iZml4ZWQiO30KICBlbHNle2Iuc3R5bGUuYmFja2dyb3VuZEltYWdlPSIiO2Iuc3R5bGUuYmFja2dyb3VuZFNpemU9IiI7Yi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb249IiI7Yi5zdHlsZS5iYWNrZ3JvdW5kQXR0YWNobWVudD0iIjt9Cn0KLyogPT09PT09PT09PT09PT09PT0g5omL5py65Y+355m75b2V77yI5YWN5oqT5YyF77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHNlbmRTbXNDb2RlKCl7CiAgY29uc3QgcGhvbmU9KGVsKCJwbF9waG9uZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBpZighL14xXGR7MTB9JC8udGVzdChwaG9uZSkpe3RvYXN0KCLor7fovpPlhaXmraPnoa7nmoQxMeS9jeaJi+acuuWPtyIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYnRuPWVsKCJwbF9zZW5kX2J0biIpO2J0bi5kaXNhYmxlZD10cnVlO2J0bi50ZXh0Q29udGVudD0i5Y+R6YCB5Lit4oCmIjsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQuc2VuZENvZGUocGhvbmUpOwogIGlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IumqjOivgeeggeW3suWPkemAgSIsIm9rIik7bGV0IHQ9NjA7YnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7CiAgICBjb25zdCBpdj1zZXRJbnRlcnZhbCgoKT0+e3QtLTtpZih0PD0wKXtjbGVhckludGVydmFsKGl2KTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7YnRuLmRpc2FibGVkPWZhbHNlO31lbHNlIGJ0bi50ZXh0Q29udGVudD0i6YeN5paw6I635Y+WKCIrdCsicykiO30sMTAwMCk7CiAgfWVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLlj5HpgIHlpLHotKXvvIzor7fmo4Dmn6XnvZHnu5wiLCJlcnIiKTtidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLnRleHRDb250ZW50PSLojrflj5bpqozor4HnoIEiO30KfQphc3luYyBmdW5jdGlvbiBwaG9uZUxvZ2luVUkoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGNvbnN0IGNvZGU9KGVsKCJwbF9jb2RlIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBpZighY29kZSl7dG9hc3QoIuivt+i+k+WFpeefreS/oemqjOivgeeggSIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYnRuPWVsKCJwbF9sb2dpbl9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnBob25lTG9naW4ocGhvbmUsY29kZSwiIik7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi55m75b2V5oiQ5YqfIiwib2siKTtzZXRUaW1lb3V0KCgpPT5sb2NhdGlvbi5yZWxvYWQoKSwxMjAwKTt9CiAgZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IueZu+W9leWksei0pSIsImVyciIpO30KICBidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLnRleHRDb250ZW50PSLnmbvlvZXlubbmt7vliqDotKblj7ciOwp9Ci8vIHYyLjE0LjIxIOetvuWQjeWvhumSpemFjee9rumdouadv+W3suWIoOmZpO+8mmFwcC9oNS9BRVMg5a+G6ZKl55u05o6l5rK/55So5b2T5YmN5YC877yI5YaF572u6buY6K6k77yJ77yM5LiN5YaN5LuO6L6T5YWl5qGG6K+75Y+WCi8vIHYyLjE0LjIxIOmjjumZqeehruiupOaUueW8ueeql++8muS/neWtmOmFjee9ruaXtuayv+eUqOW9k+WJjSB2ZWhpY2xlQ29udHJvbFJpc2vvvIzkuI3muIXnqbrlkIzmhI/nirbmgIEKZnVuY3Rpb24gY29sbGVjdENmZ1VJKCl7Y29uc3QgY3VyPWdldENmZygpO3JldHVybnthcHA6e2FwcElkOmN1ci5hcHAuYXBwSWQsYXBwU2VjcmV0OmN1ci5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Y3VyLmg1LmFwcElkLGFwcFNlY3JldDpjdXIuaDUuYXBwU2VjcmV0fSx2ZWhpY2xlQWVzS2V5OmN1ci52ZWhpY2xlQWVzS2V5LHZlaGljbGVDb250cm9sUmlzazpjdXIudmVoaWNsZUNvbnRyb2xSaXNrLGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoY3VyLmF1dG9SZWZyZXNoU2VjfHw2MCksc2VydmVyQmFzZTpjdXIuc2VydmVyQmFzZXx8IiIsYXV0b1NpZ25pbjplbCgiYXV0b19zaWduaW4iKT9lbCgiYXV0b19zaWduaW4iKS5jaGVja2VkOmZhbHNlLGF1dG9TaWduaW5UaW1lOih2YWwoImNmZ19zaWduaW5fdGltZSIpfHwiMDc6MDAiKSx2ZWhpY2xlTW9uaXRvcjplbCgidmVoaWNsZV9tb25pdG9yIik/ZWwoInZlaGljbGVfbW9uaXRvciIpLmNoZWNrZWQ6ZmFsc2Usd2lkZ2V0VmVoaWNsZTp3aWRnZXRTZWxlY3Rpb25UZXh0KCl8fGN1ci53aWRnZXRWZWhpY2xlLGN1c3RvbUJnOmN1ci5jdXN0b21CZyxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6ZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQsZW5hYmxlTGlrZTplbCgiY29tbV9saWtlIikuY2hlY2tlZCxlbmFibGVDb21tZW50OmVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkLGVuYWJsZVNoYXJlOmVsKCJjb21tX3NoYXJlIikuY2hlY2tlZCxlbmFibGVEZWxldGU6ZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZH19fQpmdW5jdGlvbiB2YWwoaWQpe2NvbnN0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO3JldHVybiBlP2UudmFsdWU6IiJ9CmZ1bmN0aW9uIGVsKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpfQphc3luYyBmdW5jdGlvbiBzYXZlQ2ZnVUkoKXtjb25zdCBjPWNvbGxlY3RDZmdVSSgpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUNvbmZpZyhjKTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSl7YXBwbHlSZW1vdGVDZmcoYyk7U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9dG9hc3QoIumFjee9ruW3suS/neWtmCIsIm9rIik7c3RhcnRBdXRvUmVmcmVzaChjLmF1dG9SZWZyZXNoU2VjKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQovLyB2Mi4xNC4yMSDnrb7lkI3lr4bpkqXpnaLmnb/lt7LliKDpmaTvvJrmgaLlpI3pu5jorqTml7blr4bpkqXnm7TmjqXlhpnlm57lhoXnva7pu5jorqTlgLwKZnVuY3Rpb24gcmVzZXRDZmdVSSgpe2lmKGVsKCJhdXRvX3NpZ25pbiIpKWVsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ9ZmFsc2U7aWYoZWwoImNmZ19zaWduaW5fdGltZSIpKWVsKCJjZmdfc2lnbmluX3RpbWUiKS52YWx1ZT0iMDc6MDAiO2lmKGVsKCJjb21tX3Bvc3QiKSllbCgiY29tbV9wb3N0IikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX2xpa2UiKSllbCgiY29tbV9saWtlIikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX2NvbW1lbnQiKSllbCgiY29tbV9jb21tZW50IikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX3NoYXJlIikpZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fZGVsZXRlIikpZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZD10cnVlO2NvbnN0IGM9Z2V0Q2ZnKCk7Yy5hcHA9e2FwcElkOkRFRkFVTFRfQ0ZHLmFwcC5hcHBJZCxhcHBTZWNyZXQ6REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldH07Yy5oNT17YXBwSWQ6REVGQVVMVF9DRkcuaDUuYXBwSWQsYXBwU2VjcmV0OkRFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH07Yy52ZWhpY2xlQWVzS2V5PURFRkFVTFRfQ0ZHLnZlaGljbGVBZXNLZXk7Yy52ZWhpY2xlQ29udHJvbFJpc2s9IiI7Yy53aWRnZXRWZWhpY2xlPSIiO2MuY3VzdG9tQmc9IiI7c2F2ZUNmZyhjKTthcHBseUN1c3RvbUJnKCk7aWYoZWwoIndpZGdldF9hY2MiKSl7ZWwoIndpZGdldF9hY2MiKS52YWx1ZT0iIjtlbCgid2lkZ2V0X3ZlaCIpLmlubmVySFRNTD0iIjt9Y29uc3QgYnA9ZWwoImJnUHJldmlldyIpO2lmKGJwKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7YnAudGV4dENvbnRlbnQ9IuacqumAieaLqSI7fXRvYXN0KCLlt7LmgaLlpI3pu5jorqTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9CmZ1bmN0aW9uIGFkZEFjY291bnRVSSgpe2NmZ0FjY291bnRzLnB1c2goe3VzZXJOYW1lOiIiLHVzZXJJZDoiIix0b2tlbjoiIixiYXJrS2V5OiIifSk7Y29uc3QgbGlzdD1lbCgiYWNjTGlzdCIpO2NvbnN0IGlkeD1jZmdBY2NvdW50cy5sZW5ndGgtMTtjb25zdCBodG1sPSc8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyfvvIjmlrDvvIk8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHBsYWNlaG9sZGVyPSLlpoIgbHVja3k3OTgiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPueUqOaIt0lEPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY191aWRfJytpZHgrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5BdXRob3JpemF0aW9uIFRva2VuPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiBwbGFjZWhvbGRlcj0iYTc0Nzc5Yzct4oCmIj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2Pic7aWYobGlzdC5xdWVyeVNlbGVjdG9yKCIuYWNjLWVkaXQiKXx8bGlzdC5xdWVyeVNlbGVjdG9yKCJbc3R5bGUqPSd0ZXh0LWFsaWduJ10iKSl7bGlzdC5pbnNlcnRBZGphY2VudEhUTUwoImJlZm9yZWVuZCIsaHRtbCl9ZWxzZXtsaXN0LmlubmVySFRNTD1odG1sfX0KZnVuY3Rpb24gZGVsZXRlQWNjb3VudFVJKGlkeCl7Y29uc3Qgcm93PWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2MtZWRpdFtkYXRhLWk9IicraWR4KyciXScpO2lmKHJvdyl7cm93LnJlbW92ZSgpO2NmZ0FjY291bnRzLnNwbGljZShpZHgsMSk7dG9hc3QoIuW3suWIoOmZpO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX19CmZ1bmN0aW9uIGNvbGxlY3RBY2NvdW50c1VJKCl7Y29uc3Qgcm93cz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjYWNjTGlzdCAuYWNjLWVkaXQiKTtjb25zdCBsaXN0PVtdO3Jvd3MuZm9yRWFjaChyb3c9Pntjb25zdCBpPXJvdy5nZXRBdHRyaWJ1dGUoImRhdGEtaSIpO2NvbnN0IHRva2VuPWVsKCJhY2NfdG9rZW5fIitpKT8udmFsdWV8fCIiO2lmKHRva2VuLnRyaW0oKSl7bGlzdC5wdXNoKHt1c2VyTmFtZTplbCgiYWNjX25hbWVfIitpKT8udmFsdWV8fCIiLHVzZXJJZDplbCgiYWNjX3VpZF8iK2kpPy52YWx1ZXx8IiIsdG9rZW46Y2xlYW5Ub2tlbih0b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoZWwoImFjY19iYXJrXyIraSk/LnZhbHVlfHwiIil9KX19KTtyZXR1cm4gbGlzdH0KYXN5bmMgZnVuY3Rpb24gc2F2ZUFjY291bnRzVUkoKXtjb25zdCBsaXN0PWNvbGxlY3RBY2NvdW50c1VJKCkubWFwKGE9Pih7dXNlck5hbWU6KGEudXNlck5hbWV8fCIiKS50cmltKCksdXNlcklkOihhLnVzZXJJZHx8IiIpLnRyaW0oKSx0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleSl9KSk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQWNjb3VudHMobGlzdCk7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpU1RBVEUucGFuZWxBY2NvdW50cz1saXN0O3RvYXN0KCLmnoHmoLjotKblj7flt7Lkv53lrZgiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9CmFzeW5jIGZ1bmN0aW9uIGZldGNoVXNlcklkVUkoaWR4KXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGVsKCJhY2NfdG9rZW5fIitpZHgpPy52YWx1ZXx8IiIpO2NvbnN0IGJ0bj1lbCgidWlkQnRuXyIraWR4KTtpZighdG9rZW4pe3RvYXN0KCLor7flhYjloavlhpkgVG9rZW4iLCJlcnIiKTtyZXR1cm59YnRuLnRleHRDb250ZW50PSLojrflj5bkuK3igKYiO2J0bi5kaXNhYmxlZD10cnVlO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXRVc2VyaWQodG9rZW4pO2lmKGQmJmQub2smJmQudXNlcklkKXtpZihlbCgiYWNjX3VpZF8iK2lkeCkpZWwoImFjY191aWRfIitpZHgpLnZhbHVlPWQudXNlcklkO2lmKGQudXNlck5hbWUmJmVsKCJhY2NfbmFtZV8iK2lkeCkmJiFlbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlKWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWU9ZC51c2VyTmFtZTt0b2FzdCgi6I635Y+W5oiQ5Yqf77yaIisoZC51c2VyTmFtZXx8ZC51c2VySWQpLCJvayIpfWVsc2V7dG9hc3QoIuiOt+WPluWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuacquefpemUmeivryIpLCJlcnIiKX1idG4udGV4dENvbnRlbnQ9IuiOt+WPlklEIjtidG4uZGlzYWJsZWQ9ZmFsc2V9CgovKiA9PT09PT09PT09PT09PT09PSDlpIfku70gLyDmgaLlpI0gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZXhwb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbCl7dG9hc3QoIueVjOmdouacquWwsee7qiIsImVyciIpO3JldHVybn1lbC52YWx1ZT0i55Sf5oiQ5Lit4oCmIjtCYWNrZW5kLmJhY2t1cCgpLnRoZW4oZD0+e2lmKGQmJmQub2spe2VsLnZhbHVlPUpTT04uc3RyaW5naWZ5KGQsbnVsbCwyKTt0b2FzdCgi5aSH5Lu95bey55Sf5oiQ77yM5Y+v5aSN5Yi25L+d5a2YIiwib2siKX1lbHNle2VsLnZhbHVlPSIiO3RvYXN0KCLlr7zlh7rlpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLml6Dms5Xov57mjqXohJrmnKzlkI7nq68iKSwiZXJyIil9fSl9CmZ1bmN0aW9uIGNvcHlCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUpe3RvYXN0KCLor7flhYjngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI0iLCJlcnIiKTtyZXR1cm59aWYobmF2aWdhdG9yLmNsaXBib2FyZCYmbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpe25hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGVsLnZhbHVlKS50aGVuKCgpPT50b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKSwoKT0+e2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9KX1lbHNle2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9fQpmdW5jdGlvbiBpbXBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUudHJpbSgpKXt0b2FzdCgi6K+35YWI57KY6LS05aSH5Lu95YaF5a65IiwiZXJyIik7cmV0dXJufWNvbmZpcm1EaWFsb2coIuaBouWkjeWkh+S7vSIsIuWwhuimhuebluW9k+WJjeWFqOmDqOi0puWPt+S4jumdouadv+mFjee9ru+8jOatpOaTjeS9nOS4jeWPr+aSpOmUgOOAgiIsImltcG9ydEJhY2t1cE5vdyIpfQphc3luYyBmdW5jdGlvbiBpbXBvcnRCYWNrdXBOb3coKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2NvbnN0IHY9ZWw/ZWwudmFsdWUudHJpbSgpOiIiO2lmKCF2KXt0b2FzdCgi5aSH5Lu95YaF5a655Li656m6IiwiZXJyIik7cmV0dXJufWNvbnN0IGQ9YXdhaXQgQmFja2VuZC5yZXN0b3JlQmFja3VwKHYpO2lmKGQmJmQub2spe3RvYXN0KCLmgaLlpI3miJDlip/vvJoiKyhkLmNvdW50fHwwKSsiIOS4qui0puWPtyIsIm9rIik7aWYoaXNQcm94eU1vZGUoKSl7U1RBVEUucGFuZWxBY2NvdW50cz1bXTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX1TVEFURS5kYXRhPVtdO3JlbmRlckNmZygpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5oGi5aSN5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5aSH5Lu95YaF5a655qC85byP6ZSZ6K+vIiksImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g5ryU56S65pWw5o2u77yIP2RlbW8g6aKE6KeI55So77yM5LiN6IGU572R77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGlzRGVtbygpe3JldHVybiBsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wfQpmdW5jdGlvbiBkZW1vQ2FsKCl7CiAgY29uc3Qgbm93PW5ldyBEYXRlKCkseT1ub3cuZ2V0RnVsbFllYXIoKSxtPW5vdy5nZXRNb250aCgpKzEsZGltPW5ldyBEYXRlKHksbSwwKS5nZXREYXRlKCkscD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpLG91dD1bXTsKICBmb3IobGV0IGQ9MTtkPD1kaW07ZCsrKXsKICAgIGNvbnN0IGRzPXkrIi0iK3AobSkrIi0iK3AoZCk7CiAgICBpZihkcz55KyItIitwKG0pKyItIitwKG5vdy5nZXREYXRlKCkpKWJyZWFrOwogICAgaWYoZD09PTN8fGQ9PT0xMSljb250aW51ZTsgICAgICAgICAgLy8g5ryU56S677ya5Lik5aSp5ryP562+CiAgICBvdXQucHVzaCh7Y3JlYXRlRGF0ZTpkcyxzaWduU3RhdHVlOjV9KTsKICB9CiAgcmV0dXJuIG91dDsKfQpjb25zdCBERU1PX0lOVEVHUkFMPXtvazp0cnVlLHRvdGFsOntpbnRlZ3JhbFRvdGFsOiIxMiw4ODAifSxleHBpcmU6W3tpbnRlZ3JhbFNjb3JlOjMyMCxleHBpcnlEYXRlU3RyOiIyMDI2LTEyLTMxIn1dLGRldGFpbDpbCiAge25hbWU6Iuavj+aXpeetvuWIsCIsaW50ZWdyYWxTY29yZTo2LG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrlj5HluJYiLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy654K56LWeIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuuWIhuS6qyIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnm7Lnm5LlpZblirEiLGludGVncmFsU2NvcmU6NixteURhdGVTdHI6IjIwMjYtMDktMjggMDc6MDAifSwKICB7bmFtZToi6KGl562+5raI6ICXIixpbnRlZ3JhbFNjb3JlOi0xLG15RGF0ZVN0cjoiMjAyNi0wOS0yNyAyMToxMCJ9Cl19Owpjb25zdCBERU1PX1NVUFBMRU1FTlQ9e2NvdW50Ontvazp0cnVlLGRhdGE6e2NvdW50OjIsY2FyZE51bToyfX0sbW9udGg6e29rOnRydWUsZGF0YTp7bm93U2lnbkRldGFpbFZvczpbXX19fTsKY29uc3QgREVNT19NT05JVE9SPXtvazp0cnVlLHNuYXBzaG90Ont2aW46IkxCN0pNMUMxME5BMDAwMDAxIixzb2M6NzYscmFuZ2U6NjMsdm9sdGFnZTo4NC41LGN1cnJlbnQ6MCxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1IixoZWFkTG9jazoiMSIsb2ZmbGluZTpmYWxzZSxyZWZyZXNoVGltZToiMjAyNi0wOS0yOSAwMzoxMCIsZnJvbnRQcmVzc3VyZToiMi4zNWJhciIscmVhclByZXNzdXJlOiIyLjQwYmFyIixmcm9udFRlbXA6IjMxwrBDIixyZWFyVGVtcDoiMzLCsEMiLGJhdHRlcnlUZW1wOjI2LHRvZGF5RGlzdGFuY2U6MTIuNix0b2RheUR1cmF0aW9uOjM0LHRvZGF5TWF4U3BlZWQ6NTYsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6IixzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9LAogIHZlaGljbGVzOlt7dmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIix2ZWhpY2xlVHlwZToiQUU0IE1BWDIrIn0se3ZlaGljbGVOYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIiLHZlaGljbGVUeXBlOiJBRTYifV19Owpjb25zdCBERU1PX0NUUkxfT1BUUz17b2s6dHJ1ZSxjaGFyZ2VQb3dlcjpbe2tleToiNDAwIn0se2tleToiODAwIn0se2tleToiMTAwMCJ9XSxnZWFyczpbIjI1IiwiNDUiLCI2MCJdfTsKY29uc3QgREVNT19JTkZPPXtvazp0cnVlLHVucmVhZDp7dG90YWw6M30scHJpemVSZWNvcmRzOntyZWNvcmRzOlt7cHJpemVzTmFtZToi56ev5YiGICs2IixjcmVhdGVUaW1lOiIyMDI2LTA5LTI4IDA3OjAwIixpbnRlZ3JhbDo2fSx7cHJpemVzTmFtZToi6KGl562+5Y2hIMOXMSIsY3JlYXRlVGltZToiMjAyNi0wOS0yMSAwNzowMCJ9XX0sY291cG9uczp7cmVjb3Jkczpbe30se30se31dfSxvdGE6W119Owpjb25zdCBERU1PX0RBVEE9Wwp7dXNlck5hbWU6IumYv+azvSIsdXNlcklkOiIyMDI1MTAwOTEyMzQ1Njc4IixzY29yZToxMjg4MCxzaWduZWRUb2RheTp0cnVlLGNvbnRpbnVlRGF5czo0Mix0b2RheVNjb3JlOjEyLHNpZ25Db3VudDozNix0b2tlblZhbGlkOnRydWUsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOnRydWUsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTp0cnVlLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsYmF0dGVyeVBlcmNlbnQ6NzYscmVzaWR1YWxSYW5nZUttOjYzLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6ODQuNSxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MjYsZnJvbnRQcmVzc3VyZToiMi4zNWJhciIscmVhclByZXNzdXJlOiIyLjQwYmFyIixmcm9udFRlbXA6IjMxwrBDIixyZWFyVGVtcDoiMzLCsEMiLHRvZGF5RGlzdGFuY2U6MTIuNix0b2RheUR1cmF0aW9uOjM0LHRvZGF5TWF4U3BlZWQ6NTYsbGFzdFJpZGVNaWxlYWdlOjguMix0b3RhbE1pbGVhZ2U6MjcxMDUuMix5ZXN0ZXJkYXlEaXN0YW5jZTo4OC40LG9ubGluZToiMSIscG93ZXJTdGF0dXM6IjAiLGxvY2tTdGF0ZToiMSIsY3VzaGlvblN0YXRlOiIwIixhZGRyZXNzOiLnpo/lu7rnnIHlroHlvrfluILolYnln47ljLrkuJzkvqjlvIDlj5HljLoiLGxvY2F0aW9uVGltZToiMDg6MTIiLGxvbmdpdHVkZToxMTkuNTUwOSxsYXRpdHVkZToyNi42NjU0LHNlcnZpY2VFbmREYXRlOiIyMDI3LTAzLTE4In19LAp7dXNlck5hbWU6IuWwj+a7oSIsdXNlcklkOiIyMDI2MDEwMTExMjIzMzQ0IixzY29yZTo1MjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjMsdG9kYXlTY29yZTowLHNpZ25Db3VudDo5LHRva2VuVmFsaWQ6ZmFsc2UsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6ZmFsc2UsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6ZmFsc2UsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6ZmFsc2UsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTp0cnVlLHZlaGljbGVOYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIiLGJhdHRlcnlQZXJjZW50OjIzLHJlc2lkdWFsUmFuZ2VLbToyMCxyYW5nZUVzdGltYXRlZDp0cnVlLGNoYXJnZVN0YXRlOiLlhYXnlLXkuK0iLHZvbHRhZ2U6ODYuMixjdXJyZW50OjUuNCxiYXR0ZXJ5VGVtcDozMSx0b3RhbE1pbGVhZ2U6MCx5ZXN0ZXJkYXlEaXN0YW5jZTowLGN1cnJlbnRWaW46IkxCN0pNMUMxME5BMDAwMDAyIix2ZWhpY2xlczpbe25hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiJ9LHtuYW1lOiJBRTVpUHJvTWF4Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDMifV0sZnJvbnRQcmVzc3VyZToiMi4xMGJhciIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxvbmxpbmU6IjAiLHBvd2VyU3RhdHVzOiIxIixsb2NrU3RhdGU6IjAiLGN1c2hpb25TdGF0ZToiMSIsYWRkcmVzczoiIixsb2NhdGlvblRpbWU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIiLHNlcnZpY2VFbmREYXRlOiIifX0sCnt1c2VyTmFtZToibHXlsI/lj7ciLHVzZXJJZDoiMjAyNjA5MjUwMDA5NDEyODMiLHNjb3JlOjExNSxzaWduZWRUb2RheTp0cnVlLGNvbnRpbnVlRGF5czo0LHRvZGF5U2NvcmU6NCxzaWduQ291bnQ6NCx0b2tlblZhbGlkOnRydWUsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOnRydWUsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTpmYWxzZX19Cl07CmNvbnN0IERFTU9fTE9HUz1bCnt0aW1lOiIyMDI2LTA5LTEwIDA3OjAwOjEyIix0eXBlOiJzaWduaW4iLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSx0b3RhbEdhaW46MTIsc2lnbmluU2NvcmU6NixibGluZEJveFNjb3JlOjYsaW50ZXJhY3RTY29yZTowLGNvbnRpbnVlRGF5czo0MixzdGVwczpbIuetvuWIsOaIkOWKnyArNiIsIuebsuebkuiOt+W+lyArNiAo56ev5YiGKSIsIuebsuebkuacquino+mUgSgzNi8zMCkiXX0sCnt0aW1lOiIyMDI2LTA5LTEwIDA3OjAwOjE1Iix0eXBlOiJzaWduaW4iLHVzZXJOYW1lOiLlsI/mu6EiLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6IlRva2Vu5bey6L+H5pyfIixzdGVwczpbIuetvuWIsOWksei0pTog6K+35YWI55m75b2VIl19LAp7dGltZToiMjAyNi0wOS0wOSAyMjozMTowNSIsdHlwZToidmVoaWNsZSIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLGFjdGlvblRleHQ6IuS6keerr+W8gOmUgSIsbWVzc2FnZToi5LqR56uv5byA6ZSB5oyH5Luk5bey5LiL5Y+RIixzdGVwczpbXX0KXTsKCi8qID09PT09PT09PT09PT09PT09IOWIt+aWsCAmIOWIneWni+WMliA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9hZGluZz1mYWxzZTsKLy8g5YWl5Zy66Zeq5bGP77ya6aaW5qyh5pWw5o2u5bCx57uq77yI5peg6K665oiQ5YqfL+Wksei0pe+8ieWQjua3oeWHuuenu+mZpApmdW5jdGlvbiBoaWRlU3BsYXNoKCl7Y29uc3Qgcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3BsYXNoIik7aWYoIXMpcmV0dXJuO3MuY2xhc3NMaXN0LmFkZCgib3V0Iik7c2V0VGltZW91dCgoKT0+e2lmKHMucGFyZW50Tm9kZSlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocyl9LDQ1MCl9CmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBbGwoc2lsZW50KXsKICBpZihsb2FkaW5nKXJldHVybjtsb2FkaW5nPXRydWU7CiAgaWYoIXNpbGVudCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7aWYoIVNUQVRFLmRhdGEubGVuZ3RoKWVsLmlubmVySFRNTD1za2VsZXRvbkhvbWUoKX0KICBjb25zdCBkPWF3YWl0IEJhY2tlbmQuZ2V0RGFzaGJvYXJkKCk7CiAgbG9hZGluZz1mYWxzZTtoaWRlU3BsYXNoKCk7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg56ev5YiG6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBQVD17YWNjSWR4OjAsbW9udGg6IiIsbW9udGhTZXREYXk6IiJ9OwpmdW5jdGlvbiBwdEFjY291bnRzKCl7cmV0dXJuIFNUQVRFLmRhdGEmJlNUQVRFLmRhdGEubGVuZ3RoP1NUQVRFLmRhdGE6KFNUQVRFLnBhbmVsQWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwi6LSm5Y+3Iix1c2VySWQ6YS51c2VySWR8fCIifSkpfQpmdW5jdGlvbiBhY2NDaGlwc0h0bWwocHJlZml4KXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuIiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2hpcHMiPicrbGlzdC5tYXAoKGEsaSk9Pic8YnV0dG9uIGNsYXNzPSJhY2MtY2hpcCAnKyhpPT09KHByZWZpeD09PSJwdCI/UFQuYWNjSWR4OlZILmFjY0lkeCk/J29uJzonJykrJyIgb25jbGljaz0icGlja0FjYyhcJycrcHJlZml4KydcJywnK2krJykiPicrZXNjKGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKfQpmdW5jdGlvbiBwaWNrQWNjKHByZWZpeCxpKXtpZihwcmVmaXg9PT0icHQiKXtQVC5hY2NJZHg9aTtyZW5kZXJQb2ludHMoKX1lbHNle1ZILmFjY0lkeD1pO1ZILnZpbj0iIjtyZW5kZXJWZWhpY2xlUGFnZSgpfX0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUG9pbnRzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VQb2ludHMiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFBULmFjY0lkeD49bGlzdC5sZW5ndGgpUFQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3np6/liIbmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICAvLyB2Mi4xNC4yMCDml6Xljobot6jmnIjkv67mraPvvJrpnaLmnb/luLjpqbvml7YgUFQubW9udGgg5Y+v6IO95rue55WZ5LiK5pyI44CC6Leo5Yiw5paw5pyI5Lu977yI5LuK5aSp5LiN5piv6K6+572u6K+l5pyI5Lu96YKj5aSp77yJ5ZCO6Ieq5Yqo5Zue5Yiw5b2T5YmN5pyI77yMCiAgLy8g6YG/5YWNIDEw5pyIMeWPtyDml7bml6Xljobku43lgZzlnKggOeaciDMw5Y+377yI5LiK5pyI77yJ5pi+56S65LiN5YeG56Gu44CCCiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPV9ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgX3RkeT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX25vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihQVC5tb250aCYmUFQubW9udGhTZXREYXkmJlBULm1vbnRoU2V0RGF5IT09X3RkeSYmUFQubW9udGg8X2N1ck0pe1BULm1vbnRoPSIiO1BULm1vbnRoU2V0RGF5PSIiO30KICBjb25zdCBtb250aD1QVC5tb250aHx8X2N1ck07CiAgY29uc3QgW2l0LGNhbCxjbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLDEpLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJtb250aCIsYWNjLnVzZXJJZCx7bW9udGg6bW9udGh9KSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgiY291bnQiLGFjYy51c2VySWQse30pCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJwdCIpOwogIC8vIOaAu+iniO+8iHYyLjE0LjIwIOWFvOWuuSBkYXRhIOS4uue6r+aVsOWtl+aIluWvueixoeS4pOenjei/lOWbnu+8iQogIGNvbnN0IHRvdGFsPShpdCYmaXQudG90YWwhPW51bGwpPygodHlwZW9mIGl0LnRvdGFsPT09Im51bWJlciJ8fCh0eXBlb2YgaXQudG90YWw9PT0ic3RyaW5nIiYmaXQudG90YWwhPT0iIikpP1N0cmluZyhpdC50b3RhbCk6ZGVlcFBpY2soaXQudG90YWwsWyJpbnRlZ3JhbFRvdGFsIiwidG90YWxJbnRlZ3JhbCIsInNjb3JlIiwiaW50ZWdyYWwiLCJ0b3RhbCJdLDQpKToiIjsKICBjb25zdCBjYXJkTnVtPShjbnQmJmNudC5kYXRhIT1udWxsKT8oKHR5cGVvZiBjbnQuZGF0YT09PSJudW1iZXIifHwodHlwZW9mIGNudC5kYXRhPT09InN0cmluZyImJmNudC5kYXRhIT09IiIpKT9TdHJpbmcoY250LmRhdGEpOmRlZXBQaWNrKGNudC5kYXRhLFsiY291bnQiLCJjYXJkTnVtIiwiY2FyZENvdW50IiwibnVtYmVyIiwibnVtIiwic2lnbkNvdW50Iiwic2lnblN1cHBsZW1lbnRDb3VudCIsInJlaXNzdWVDYXJkTnVtIiwic3VwcGxlbWVudENhcmROdW0iLCJjYXJkVG90YWwiLCJ0b3RhbCJdLDQpKToiIjsKICBodG1sKz0nPGRpdiBjbGFzcz0icHQtZ3JpZCI+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5b2T5YmN5oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh0b3RhbHx8Ii0tIikrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuihpeetvuWNoTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MoY2FyZE51bXx8Ii0tIikrJzwvZGl2PjxkaXYgY2xhc3M9InN1YiI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiIG9uY2xpY2s9InN1cEdhaW4oKSI+56ev5YiG5YWR5o2i6KGl562+5Y2hPC9idXR0b24+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nOwogIC8vIOebsuebkui/m+W6pu+8iHYyLjE0LjE0IOi1t+eUsemmlumhtei/geenu+iHs+atpO+8iQogIGNvbnN0IGNvbnQ9TnVtYmVyKGFjYy5jb250aW51ZURheXN8fDApOwogIGNvbnN0IGJEYXk9Y29udD09PTA/MDooKGNvbnQtMSklMzApKzE7Y29uc3QgYlJvdW5kPWNvbnQ9PT0wPzA6TWF0aC5jZWlsKGNvbnQvMzApO2NvbnN0IGJQY3Q9TWF0aC5yb3VuZCgoYkRheS8zMCkqMTAwKTsKICBodG1sKz0nPGRpdiBjbGFzcz0iYmxpbmQiIHN0eWxlPSJtYXJnaW46MCAwIDEycHgiPjxkaXYgY2xhc3M9ImJsaW5kLXRvcCI+PHNwYW4+55uy55uS6L+b5bqm77yI56ysJytiUm91bmQrJ+i9ru+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iciBudW0iPicrYkRheSsnIC8gMzAgwrcgJytiUGN0KyclIMK3IOi/nuetviAnK2NvbnQrJyDlpKk8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iYmxpbmQtYmFyIj48ZGl2IGNsYXNzPSJibGluZC1maWxsIiBzdHlsZT0id2lkdGg6JytiUGN0KyclIj48L2Rpdj48L2Rpdj48L2Rpdj4nOwogIC8vIOetvuWIsOaXpeWOhgogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNoZWNrKyfnrb7liLDml6XljoYgwrcgJytlc2MobW9udGgpKyc8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBkYXlzPShjYWwmJmNhbC5kYXRhJiZjYWwuZGF0YS5ub3dTaWduRGV0YWlsVm9zKXx8W107CiAgaWYoZGF5cy5sZW5ndGgpewogICAgaHRtbCs9Y2FsSHRtbChkYXlzLG1vbnRoLGFjYy51c2VySWQpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPicrKGNhbCYmY2FsLm1lc3NhZ2U/ZXNjKGNhbC5tZXNzYWdlKToi5pel5Y6G5Yqg6L295aSx6LSl77yI5Y+v6IO96ZmQ5rWB77yM56iN5ZCO5YaN6K+V77yJIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIHYyLjE0LjIxIOWIoOmZpOenr+WIhua1geawtO+8iOenr+WIhuivpuaDhe+8ieWMuuWdlwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7np6/liIbmlbDmja7mnaXoh6rmnoHmoLjlrp7ml7YgQVBJIMK3IOihpeetvumZkCAzMCDlpKnlhoXmvI/nrb7vvIzmr4/mrKHmtojogJcgMSDlvKDooaXnrb7ljaE8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CmZ1bmN0aW9uIGNhbEh0bWwoZGF5cyxtb250aCx1c2VySWQpewogIGNvbnN0IHltPW1vbnRoLnNwbGl0KCItIik7Y29uc3QgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKTsKICBjb25zdCBmaXJzdD1uZXcgRGF0ZSh5LG0tMSwxKS5nZXREYXkoKTsKICBjb25zdCBkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKTsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IGg9JzxkaXYgY2xhc3M9ImNhbC1ncmlkIj4nOwogIFsi5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl0uZm9yRWFjaCh3PT57aCs9JzxkaXYgY2xhc3M9ImNhbC13ZCI+Jyt3Kyc8L2Rpdj4nfSk7CiAgZm9yKGxldCBpPTA7aTxmaXJzdDtpKyspaCs9JzxkaXYgY2xhc3M9ImNhbC1kIGJsYW5rIj48L2Rpdj4nOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9bW9udGgrIi0iK1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIik7CiAgICBjb25zdCBlbnRyeT1kYXlzLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpOwogICAgY29uc3Qgc2lnbmVkPWVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCk7CiAgICBjb25zdCBpc1RvZGF5PWRzPT09dFN0cjsKICAgIGNvbnN0IGZ1dHVyZT1kcz50U3RyOwogICAgbGV0IGNscz0iY2FsLWQiKyhzaWduZWQ/IiBzaWduZWQiOihmdXR1cmU/IiBmdXR1cmUiOihlbnRyeT8iIG1pc3MiOiIiKSkpOwogICAgaWYoaXNUb2RheSljbHMrPSIgdG9kYXkiOwogICAgY29uc3QgY2xpY2thYmxlPSFzaWduZWQmJiFmdXR1cmUmJmVudHJ5OwogICAgaCs9JzxkaXYgY2xhc3M9IicrY2xzKyciICcrKGNsaWNrYWJsZT8nc3R5bGU9ImN1cnNvcjpwb2ludGVyIiBvbmNsaWNrPSJzdXBDb25zdW1lKFwnJytkcysnXCcsXCcnK2VzYyh1c2VySWQpKydcJykiJzonJykrJz4nCiAgICAgICsnPHNwYW4+JytkKyc8L3NwYW4+JwogICAgICArJzxzcGFuIGNsYXNzPSJkb3QiPicrKHNpZ25lZD8i4pyTIjooZnV0dXJlPyIiOihlbnRyeT8i5ryPIjoiIikpKSsnPC9zcGFuPicKICAgICAgKyc8L2Rpdj4nOwogIH0KICBoKz0nPC9kaXY+JzsKICBoKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+54K55Ye744CM5ryP44CN5pel5pyf5L2/55So6KGl562+5Y2h6KGl562+77yI6ZyA5YWI5pyJ6KGl562+5Y2h77yJPC9kaXY+JzsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBwdE1vbnRoU2hpZnQoZGlyKXsKICBjb25zdCBjdXI9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCItIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBQVC5tb250aD15KyItIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIC8vIOiusOW9leiuvue9ruivpeaciOS7veeahOW9k+Wkqe+8jOi3qOaciOWQjiByZW5kZXJQb2ludHMg5o2u5q2k5oqK5rue55WZ55qE5LiK5pyI6Ieq5Yqo5aSN5L2N5Yiw5b2T5YmN5pyICiAgY29uc3QgZD1uZXcgRGF0ZSgpOwogIFBULm1vbnRoU2V0RGF5PWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIHJlbmRlclBvaW50cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cENvbnN1bWUoZGF0ZSx1c2VySWQpewogIGNvbmZpcm1EaWFsb2coIuenr+WIhuihpeetviIsIuS9v+eUqCAxIOW8oOihpeetvuWNoeihpeetviAiK2RhdGUrIiDvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi6KGl562+5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImNvbnN1bWUiLHVzZXJJZCx7ZGF0ZVRpbWU6ZGF0ZX0pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuihpeetvuaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLooaXnrb7lpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOihpeetviIpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cEdhaW4oKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25maXJtRGlhbG9nKCLlhZHmjaLooaXnrb7ljaEiLCLkvb/nlKjnp6/liIblhZHmjaIgMSDlvKDooaXnrb7ljaHvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5YWR5o2i5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImdhaW4iLGFjYy51c2VySWQse30pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuWFkeaNouaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLlhZHmjaLlpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOWFkeaNoiIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOi9pui+humhte+8iOebkeaOpyArIOi9puaOp+aJqeWxlSArIOS/oeaBr+S4reW/g++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgVkg9e2FjY0lkeDowLHZpbjoiIixjcDoiIixsb2NrVHlwZToiMSJ9Owphc3luYyBmdW5jdGlvbiByZW5kZXJWZWhpY2xlUGFnZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlVmVoaWNsZSIpO2lmKCFlbClyZXR1cm47CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pqC5peg6LSm5Y+3PC9oMz48cD7or7flhYjlnKjpppbpobXliqDovb3mlbDmja7miJblnKjorr7nva7pobXmt7vliqDotKblj7c8L3A+PC9kaXY+JztyZXR1cm59CiAgaWYoVkguYWNjSWR4Pj1saXN0Lmxlbmd0aClWSC5hY2NJZHg9MDsKICBjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdOwogIGlmKCFhY2MudXNlcklkKXtlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuivpei0puWPt+e8uuWwkeeUqOaIt0lEPC9oMz48L2Rpdj4nO3JldHVybn0KICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9vei9pui+huaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGxldCBtb249YXdhaXQgQmFja2VuZC52ZWhpY2xlTW9uaXRvcihhY2MudXNlcklkLCIiKTsKICBjb25zdCB2ZWhMaXN0PShtb24mJkFycmF5LmlzQXJyYXkobW9uLnZlaGljbGVzKSk/bW9uLnZlaGljbGVzOltdOwogIGlmKFZILnZpbiYmbW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCYmbW9uLnNuYXBzaG90LnZpbiE9PVZILnZpbil7CiAgICBjb25zdCBtb24yPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCxWSC52aW4pOwogICAgaWYobW9uMiYmbW9uMi5vayl7bW9uMi52ZWhpY2xlcz12ZWhMaXN0O21vbj1tb24yfQogIH0KICBjb25zdCBbb3B0cyxpbmZvXT1hd2FpdCBQcm9taXNlLmFsbChbCiAgICBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KHthY3Rpb246Im9wdGlvbnMiLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifSksCiAgICBCYWNrZW5kLmluZm9DZW50ZXIoYWNjLnVzZXJJZCxWSC52aW58fCIiKQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgidmgiKTsKICAvLyDovabovobpgInmi6nvvIjlpJrovabvvIkKICBpZih2ZWhMaXN0Lmxlbmd0aD4xKXsKICAgIGNvbnN0IGN1clZpbj1WSC52aW58fChtb24mJm1vbi5zbmFwc2hvdD9tb24uc25hcHNob3QudmluOnZlaExpc3RbMF0udmluTm8pOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im9wdC1yb3ciPicrdmVoTGlzdC5tYXAodj0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKGN1clZpbj09PXYudmluTm8/J29uJzonJykrJyIgb25jbGljaz0iVkgudmluPVwnJytlc2Modi52aW5ObykrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKHYudmVoaWNsZVR5cGV8fHYudmVoaWNsZU5hbWV8fHYudmluTm8pKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKICB9CiAgLy8g54q25oCB55uR5o6n5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuY2FyKyfovabovobnirbmgIE8L2g0PjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJzaG93VmVoaWNsZURldGFpbCgnK1ZILmFjY0lkeCsnKSI+6K+m5oOFPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZW5kZXJWZWhpY2xlUGFnZSgpIj7liLfmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JzsKICBpZihtb24mJm1vbi5vayYmbW9uLnNuYXBzaG90KXsKICAgIGNvbnN0IHNuPW1vbi5zbmFwc2hvdDsKICAgIGNvbnN0IHNvY0NvbD1zbi5zb2M8PTIwPyJ2YXIoLS1lcnIpIjpzbi5zb2M8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLW9rKSI7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9meeUtemHjzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nKyhzbi5zb2MhPW51bGw/c24uc29jKyIlIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9mee7reiIqjwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrKHNuLnJhbmdlIT1udWxsP3NuLnJhbmdlKyIga20iOiItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+6b6Z5aS06ZSBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nKyhzbi5oZWFkTG9jaz09PSIxIj8i5bey6ZSBIjoi5pyq6ZSBIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7lnKjnur/nirbmgIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjonKyhzbi5vZmZsaW5lPyJ2YXIoLS1lcnIpIjoidmFyKC0tb2spIikrJyI+Jysoc24ub2ZmbGluZT8i56a757q/77yIPjMw5YiG6ZKf5pyq5LiK5oql77yJIjoi5Zyo57q/IikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnIDlkI7kuIrmiqU8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKSI+Jytlc2Moc24ucmVmcmVzaFRpbWV8fCItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKG1vbiYmKG1vbi5lcnJvcnx8bW9uLm1lc3NhZ2UpKXx8IuW/q+eFp+iOt+WPluWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyDovabovobmjqfliLbljaHvvIjku47pppbpobXov4Hnp7vov4fmnaXvvIkKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9pui+huaOp+WItjwvaDQ+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJjdHJsLWdyaWQiPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJmaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdmaW5kXCcsdGhpcykiPicrSS5iZWxsKyflr7vovaY8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0ibG91ZEZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvdWRGaW5kXCcsdGhpcykiPicrSS52b2wrJ+m4o+esmzwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJjdXNoaW9uIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdjdXNoaW9uXCcsdGhpcykiPicrSS5zZWF0KyflnZDlnqs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIHVubG9jayIgZGF0YS1hY3Q9InVubG9jayIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwndW5sb2NrXCcsdGhpcykiPicrSS51bmxvY2srJ+W8gOmUgTwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gbG9jayIgZGF0YS1hY3Q9ImxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvY2tcJyx0aGlzKSI+JytJLmxvY2srJ+WFs+mUgTwvYnV0dG9uPicKICAgICsnPC9kaXY+PC9kaXY+JzsKICAvLyDovabmjqfmianlsZXljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9puaOp+aJqeWxlTwvaDQ+PC9kaXY+JzsKICBjb25zdCBjcHM9KG9wdHMmJkFycmF5LmlzQXJyYXkob3B0cy5jaGFyZ2VQb3dlcikpP29wdHMuY2hhcmdlUG93ZXI6W107CiAgaWYoY3BzLmxlbmd0aCl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1ib3R0b206NHB4Ij7lhYXnlLXlip/njofvvIhX77yJPC9kaXY+PGRpdiBjbGFzcz0ib3B0LXJvdyI+JwogICAgICArY3BzLm1hcChvPT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoVkguY3A9PT1vLmtleT8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC5jcD1cJycrZXNjKG8ua2V5KSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2Moby5rZXkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdjaGFyZ2VQb3dlclwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgLy8gdjIuMTQuMjEg5Yig6Zmk6ZmQ6YCf5qGj5L2N6K6+572uCiAgLy8gdjIuMTQuMjIg5a+86Iiq5oqV5bGP6Z2i5p2/77yITW90b3BsYXnvvIkKICBodG1sKz0nPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjoxMnB4IDAiPjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjZweCI+5a+86Iiq5oqV5bGPPC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0ibmF2LXBhbmVsIj4nOwogIGh0bWwrPSc8ZGl2IGlkPSJuYXZNYXAiIHN0eWxlPSJ3aWR0aDoxMDAlO2hlaWdodDoyMDBweDtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTttYXJnaW4tYm90dG9tOjhweDtvdmVyZmxvdzpoaWRkZW4iPjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6OHB4O21hcmdpbi1ib3R0b206OHB4Ij48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im5hdkRlc3RJbnB1dCIgcGxhY2Vob2xkZXI9IuaQnOe0ouebrueahOWcsOKApiIgc3R5bGU9ImZsZXg6MTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4IiBvbmlucHV0PSJuYXZTZWFyY2godGhpcy52YWx1ZSkiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9Im5hdkNvbm5CdG4iIG9uY2xpY2s9Im5hdlRvZ2dsZUNvbm4oKSI+6L+e5o6l6L2m5py6PC9idXR0b24+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBpZD0ibmF2UmVzdWx0cyIgc3R5bGU9Im1heC1oZWlnaHQ6MTYwcHg7b3ZlcmZsb3cteTphdXRvO21hcmdpbi1ib3R0b206OHB4Ij48L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGlkPSJuYXZSb3V0ZUluZm8iIGNsYXNzPSJuYXYtcm91dGUtaW5mbyIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIGlkPSJuYXZDYXN0QnRuIiBvbmNsaWNrPSJuYXZTdGFydENhc3QoKSIgZGlzYWJsZWQgc3R5bGU9Im9wYWNpdHk6LjUiPuW8gOWni+aKleWxjzwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgaWQ9Im5hdlN0b3BCdG4iIG9uY2xpY2s9Im5hdlN0b3BDYXN0KCkiIGRpc2FibGVkIHN0eWxlPSJvcGFjaXR5Oi41Ij7nu5PmnZ88L2J1dHRvbj48L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiPuaKleWxj+mcgOi/nuaOpei9puacuiBXaUZp77yIMTkyLjE2OC4wLjHvvInvvIzlr7zoiKrmlbDmja7pgJrov4cgV2lGaSDnm7Tov57mjqjpgIHliLDovabmnLogVEZUIOWxj+W5leOAgjwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g5L+h5oGv5Lit5b+D5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuYmVsbCsn5L+h5oGv5Lit5b+DPC9oND48L2Rpdj4nOwogIGlmKGluZm8mJmluZm8ub2spewogICAgY29uc3QgdW49aW5mby51bnJlYWQhPW51bGw/ZGVlcFBpY2soaW5mby51bnJlYWQsWyJ0b3RhbCIsImNvdW50IiwidW5SZWFkQ291bnQiLCJudW0iXSwzKToiIjsKICAgIGlmKHVuIT09IiIpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnKror7vmtojmga88L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh1bikrJzwvc3Bhbj48L2Rpdj4nOwogICAgY29uc3QgcHJpemVzPShpbmZvLnByaXplUmVjb3JkcyYmKGluZm8ucHJpemVSZWNvcmRzLnJlY29yZHN8fGluZm8ucHJpemVSZWNvcmRzLmxpc3R8fGluZm8ucHJpemVSZWNvcmRzKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShwcml6ZXMpJiZwcml6ZXMubGVuZ3RoKXsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW46OHB4IDAgNHB4Ij7nm7Lnm5Iv5Lit5aWW6K6w5b2VPC9kaXY+JzsKICAgICAgaHRtbCs9cHJpemVzLnNsaWNlKDAsNSkubWFwKHA9Pic8ZGl2IGNsYXNzPSJmbG93LWl0ZW0iPjxkaXY+PGRpdiBjbGFzcz0ibm0iPicrZXNjKHAucHJpemVzTmFtZXx8cC5uYW1lfHwi5aWW5ZOBIikrJzwvZGl2PjxkaXYgY2xhc3M9InRtIj4nK2VzYyhwLmNyZWF0ZVRpbWV8fHAuY3JlYXRlRGF0ZXx8IiIpKyc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJzYyBwbHVzIiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrZXNjKHAuaW50ZWdyYWw/KCIrIitwLmludGVncmFsKToiIikrJzwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogICAgfQogICAgY29uc3QgY291cG9ucz0oaW5mby5jb3Vwb25zJiYoaW5mby5jb3Vwb25zLnJlY29yZHN8fGluZm8uY291cG9ucy5saXN0fHxpbmZvLmNvdXBvbnMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KGNvdXBvbnMpJiZjb3Vwb25zLmxlbmd0aClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuS8mOaDoOWIuDwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrY291cG9ucy5sZW5ndGgrJyDlvKA8L3NwYW4+PC9kaXY+JzsKICAgIGlmKGluZm8ub3RhIT1udWxsKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+T1RBIOWNh+e6pzwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nKyhBcnJheS5pc0FycmF5KGluZm8ub3RhKSYmaW5mby5vdGEubGVuZ3RoPyLmnInmlrDniYjmnKwiOiLlt7LmmK/mnIDmlrAiKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChpbmZvJiYoaW5mby5lcnJvcnx8aW5mby5tZXNzYWdlKSl8fCLkv6Hmga/kuK3lv4PliqDovb3lpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPui9puaOp+aJqeWxleaMh+S7pOe7j+S6keerr+S4i+WPke+8jOWTjeW6lOWPr+iDvei+g+aFojwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7CiAgbmF2SW5pdE9uVGFiKCk7Cn0KLyogPT09PT09PT09PT09PT09PT0gdjIuMTQuMjIgTW90b3BsYXkg5a+86Iiq5oqV5bGPID09PT09PT09PT09PT09PT09ICovCmxldCBOQVY9e21hcDpudWxsLGRyaXZpbmc6bnVsbCxwbGFjZVNlYXJjaDpudWxsLGF1dG9Db21wbGV0ZTpudWxsLHJvdXRlOm51bGwsbmF2U3RlcHM6W10sY3VyU3RlcDowLGNhc3Rpbmc6ZmFsc2Usd2F0Y2hJZDpudWxsLGFtYXBMb2FkZWQ6ZmFsc2UsYW1hcEtleToiNWE5NzM5ZTQyZDFkNDBlZTliODhhMjU4MmVkOTM4MTgifTsKZnVuY3Rpb24gbmF2SW5pdEFNYXAoKXsKICBpZihOQVYuYW1hcExvYWRlZHx8dHlwZW9mIEFNYXA9PT0idW5kZWZpbmVkIilyZXR1cm47CiAgTkFWLmFtYXBMb2FkZWQ9dHJ1ZTsKICBOQVYubWFwPW5ldyBBTWFwLk1hcCgibmF2TWFwIix7em9vbToxNCxtYXBTdHlsZToiYW1hcDovL3N0eWxlcy9kYXJrIn0pOwogIEFNYXAucGx1Z2luKFsiQU1hcC5BdXRvQ29tcGxldGUiLCJBTWFwLkRyaXZpbmciXSxmdW5jdGlvbigpewogICAgTkFWLmF1dG9Db21wbGV0ZT1uZXcgQU1hcC5BdXRvQ29tcGxldGUoe2NpdHk6IuWFqOWbvSJ9KTsKICAgIE5BVi5kcml2aW5nPW5ldyBBTWFwLkRyaXZpbmcoe3BvbGljeTpBTWFwLkRyaXZpbmdQb2xpY3kuTEVBU1RfVElNRSxtYXA6TkFWLm1hcCxoaWRlTWFya2VyczpmYWxzZX0pOwogIH0pOwp9CmZ1bmN0aW9uIG5hdlNlYXJjaChrdyl7CiAgaWYoIWt3fHxrdy5sZW5ndGg8Mil7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlJlc3VsdHMiKS5pbm5lckhUTUw9IiI7cmV0dXJufQogIGlmKCFOQVYuYXV0b0NvbXBsZXRlKXtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bmF2U2VhcmNoKGt3KX0sNTAwKTtyZXR1cm59CiAgTkFWLmF1dG9Db21wbGV0ZS5zZWFyY2goa3csZnVuY3Rpb24oc3RhdHVzLHJlc3VsdCl7CiAgICBpZihzdGF0dXMhPT0iY29tcGxldGUifHwhcmVzdWx0LnRpcHMpcmV0dXJuOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdlJlc3VsdHMiKS5pbm5lckhUTUw9cmVzdWx0LnRpcHMuc2xpY2UoMCw4KS5tYXAoZnVuY3Rpb24odCl7CiAgICAgIHJldHVybiAnPGRpdiBjbGFzcz0ibmF2LXJlc3VsdC1pdGVtIiBvbmNsaWNrPSJuYXZQaWNrRGVzdCgnK3QubG9jYXRpb24uZ2V0TG5nKCkrJywnK3QubG9jYXRpb24uZ2V0TGF0KCkrJyxcJycrZXNjKHQubmFtZSkucmVwbGFjZSgvJy9nLCJcXCciKSsnXCcpIiBzdHlsZT0icGFkZGluZzo4cHggMTJweDtjdXJzb3I6cG9pbnRlcjtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKSI+PGRpdiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOnZhcigtLXR4dCkiPicrZXNjKHQubmFtZSkrJzwvZGl2PjxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpIj4nK2VzYyh0LmRpc3RyaWN0fHwiIikrJzwvZGl2PjwvZGl2Pic7CiAgICB9KS5qb2luKCIiKTsKICB9KTsKfQpmdW5jdGlvbiBuYXZQaWNrRGVzdChsbmcsbGF0LG5hbWUpewogIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZEZXN0SW5wdXQiKS52YWx1ZT1uYW1lOwogIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZSZXN1bHRzIikuaW5uZXJIVE1MPSIiOwogIGlmKCFOQVYubWFwKXtuYXZJbml0QU1hcCgpO2lmKCFOQVYubWFwKXtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bmF2UGlja0Rlc3QobG5nLGxhdCxuYW1lKX0sNTAwKTtyZXR1cm59fQogIE5BVi5tYXAuc2V0Q2VudGVyKFtsbmcsbGF0XSk7CiAgTkFWLm1hcC5zZXRab29tKDE1KTsKICAvLyDop4TliJLot6/nur/vvJrotbfngrk96L2m6L6G5L2N572u77yM57uI54K5PemAieaLqeWcsOeCuQogIHZhciB2ZWg9U1RBVEUuZGF0YSYmU1RBVEUuZGF0YVtWSC5hY2NJZHhdJiZTVEFURS5kYXRhW1ZILmFjY0lkeF0udmVoaWNsZTsKICB2YXIgc3RhcnRMbmc9dmVoJiZOdW1iZXIodmVoLmxvbmdpdHVkZSk7CiAgdmFyIHN0YXJ0TGF0PXZlaCYmTnVtYmVyKHZlaC5sYXRpdHVkZSk7CiAgaWYoIXN0YXJ0TG5nfHwhc3RhcnRMYXQpe3RvYXN0KCLovabovobmmoLml6BHUFPlnZDmoIfvvIzml6Dms5Xop4TliJLot6/nur8iLCJlcnIiKTtyZXR1cm59CiAgaWYoIU5BVi5kcml2aW5nKXt0b2FzdCgi5Zyw5Zu+5byV5pOO5Yqg6L295Lit4oCmIiwiaW5mbyIpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtuYXZQaWNrRGVzdChsbmcsbGF0LG5hbWUpfSw1MDApO3JldHVybn0KICBOQVYuZHJpdmluZy5zZWFyY2goW3N0YXJ0TG5nLHN0YXJ0TGF0XSxbbG5nLGxhdF0sZnVuY3Rpb24oc3RhdHVzLHJlc3VsdCl7CiAgICBpZihzdGF0dXMhPT0iY29tcGxldGUifHwhcmVzdWx0LnJvdXRlc3x8IXJlc3VsdC5yb3V0ZXMubGVuZ3RoKXt0b2FzdCgi6Lev57q/6KeE5YiS5aSx6LSlIiwiZXJyIik7cmV0dXJufQogICAgTkFWLnJvdXRlPXJlc3VsdC5yb3V0ZXNbMF07CiAgICBOQVYubmF2U3RlcHM9TkFWLnJvdXRlLnN0ZXBzfHxbXTsKICAgIE5BVi5jdXJTdGVwPTA7CiAgICB2YXIgaW5mbz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Um91dGVJbmZvIik7CiAgICBpbmZvLnN0eWxlLmRpc3BsYXk9ImJsb2NrIjsKICAgIGluZm8uaW5uZXJIVE1MPSc8ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OHB4IDEycHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyLXJhZGl1czoxMHB4Ij48ZGl2PjxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQpIj4nKyhOQVYucm91dGUuZGlzdGFuY2UvMTAwMCkudG9GaXhlZCgxKSsnIGttIMK3ICcrTWF0aC5jZWlsKE5BVi5yb3V0ZS50aW1lLzYwKSsnIOWIhumSnzwvZGl2PjxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpIj4nK05BVi5uYXZTdGVwcy5sZW5ndGgrJyDmraUgwrcgJytlc2MobmFtZSkrJzwvZGl2PjwvZGl2PjwvZGl2Pic7CiAgICB2YXIgY2FzdEJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q2FzdEJ0biIpO2Nhc3RCdG4uZGlzYWJsZWQ9ZmFsc2U7Y2FzdEJ0bi5zdHlsZS5vcGFjaXR5PTE7CiAgfSk7Cn0KZnVuY3Rpb24gbmF2VG9nZ2xlQ29ubigpewogIHZhciBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdkNvbm5CdG4iKTsKICBpZih0eXBlb2YgbW90b3BsYXlIYW5kbGVyIT09ImZ1bmN0aW9uIil7dG9hc3QoIuS7heaUr+aMgSBpT1MgQXBwIOWGheS9v+eUqCIsImVyciIpO3JldHVybn0KICBidG4udGV4dENvbnRlbnQ9Iui/nuaOpeS4reKApiI7YnRuLmRpc2FibGVkPXRydWU7CiAgbW90b3BsYXlIYW5kbGVyKCJpc0Nvbm5lY3RlZCIsIiIsZnVuY3Rpb24ob2spewogICAgaWYob2spe3RvYXN0KCLovabmnLrlt7Lov57mjqUiLCJvayIpO2J0bi50ZXh0Q29udGVudD0i5bey6L+e5o6lIjtidG4uZGlzYWJsZWQ9dHJ1ZTtyZXR1cm59CiAgICBtb3RvcGxheUhhbmRsZXIoImNvbm5lY3QiLCIiLGZ1bmN0aW9uKHN1Y2MpewogICAgICBpZihzdWNjKXt0b2FzdCgi6L2m5py66L+e5o6l5oiQ5YqfIiwib2siKTtidG4udGV4dENvbnRlbnQ9IuW3sui/nuaOpSI7YnRuLmRpc2FibGVkPWZhbHNlfQogICAgICBlbHNle3RvYXN0KCLov57mjqXlpLHotKXvvIzor7fnoa7orqTlt7Lov57mjqXovabmnLogV2lGae+8iDE5Mi4xNjguMC4x77yJIiwiZXJyIik7YnRuLnRleHRDb250ZW50PSLov57mjqXovabmnLoiO2J0bi5kaXNhYmxlZD1mYWxzZX0KICAgIH0pOwogIH0pOwp9CmZ1bmN0aW9uIG5hdlN0YXJ0Q2FzdCgpewogIGlmKCFOQVYucm91dGUpe3RvYXN0KCLor7flhYjop4TliJLot6/nur8iLCJlcnIiKTtyZXR1cm59CiAgaWYodHlwZW9mIG1vdG9wbGF5SGFuZGxlciE9PSJmdW5jdGlvbiIpe3RvYXN0KCLku4XmlK/mjIEgaU9TIEFwcCDlhoXkvb/nlKgiLCJlcnIiKTtyZXR1cm59CiAgbW90b3BsYXlIYW5kbGVyKCJpc0Nvbm5lY3RlZCIsIiIsZnVuY3Rpb24ob2spewogICAgaWYoIW9rKXt0b2FzdCgi6K+35YWI6L+e5o6l6L2m5py6IiwiZXJyIik7bmF2VG9nZ2xlQ29ubigpO3JldHVybn0KICAgIHZhciByb3V0ZURhdGE9e2Rpc3RhbmNlOk5BVi5yb3V0ZS5kaXN0YW5jZSx0aW1lOk5BVi5yb3V0ZS50aW1lLHN0ZXBzOk5BVi5uYXZTdGVwcy5tYXAoZnVuY3Rpb24ocyl7cmV0dXJue2luc3RydWN0aW9uOnMuaW5zdHJ1Y3Rpb24scm9hZDpzLnJvYWR8fCIiLGRpc3RhbmNlOnMuZGlzdGFuY2UsYWN0aW9uOnMuYWN0aW9ufHwiIixwb2x5bGluZTpzLnBvbHlsaW5lJiZzLnBvbHlsaW5lLnBhdGhzP3VuZGVmaW5lZDpzLnBvbHlsaW5lfX0pfTsKICAgIG1vdG9wbGF5SGFuZGxlcigic2VuZE5hdkRhdGEiLCJTVEFSVF9OQVZJR0FUSU9OfCIrSlNPTi5zdHJpbmdpZnkocm91dGVEYXRhKSxmdW5jdGlvbihzdWNjKXsKICAgICAgaWYoc3VjYyl7CiAgICAgICAgdG9hc3QoIuaKleWxj+W3suWQr+WKqCIsIm9rIik7TkFWLmNhc3Rpbmc9dHJ1ZTsKICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q2FzdEJ0biIpLnN0eWxlLm9wYWNpdHk9LjU7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIm5hdkNhc3RCdG4iKS5kaXNhYmxlZD10cnVlOwogICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZTdG9wQnRuIikuc3R5bGUub3BhY2l0eT0xO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZTdG9wQnRuIikuZGlzYWJsZWQ9ZmFsc2U7CiAgICAgICAgLy8g5byA5aeL5L2N572u6L+96Liq77yM5o6o6YCB5a6e5pe25oyH5LukCiAgICAgICAgaWYobmF2aWdhdG9yLmdlb2xvY2F0aW9uKXtOQVYud2F0Y2hJZD1uYXZpZ2F0b3IuZ2VvbG9jYXRpb24ud2F0Y2hQb3NpdGlvbihuYXZPblBvc0NoYW5nZSxuYXZPblBvc0Vycix7ZW5hYmxlSGlnaEFjY3VyYWN5OnRydWUsbWF4aW11bUFnZTozMDAwLHRpbWVvdXQ6MTAwMDB9KX0KICAgICAgfWVsc2V7dG9hc3QoIuaKleWxj+Wksei0pSIsImVyciIpfQogICAgfSk7CiAgfSk7Cn0KZnVuY3Rpb24gbmF2T25Qb3NDaGFuZ2UocG9zKXsKICBpZighTkFWLmNhc3RpbmcpcmV0dXJuOwogIHZhciBsYXQ9cG9zLmNvb3Jkcy5sYXRpdHVkZSxsbmc9cG9zLmNvb3Jkcy5sb25naXR1ZGU7CiAgLy8g5o6o6YCB6YCf5bqm5pu05pawCiAgdmFyIHNwZD1wb3MuY29vcmRzLnNwZWVkIT1udWxsP3Bvcy5jb29yZHMuc3BlZWQ6MDsKICBtb3RvcGxheUhhbmRsZXIoInNlbmROYXZEYXRhIiwiU1BFRUR8e1wic3BlZWRcIjoiK3NwZC50b0ZpeGVkKDEpKyJ9IixmdW5jdGlvbigpe30pOwogIC8vIOiuoeeul+W9k+WJjei3r+aute+8iOeugOWMlueJiO+8muaMiei3neemu+WMuemFje+8iQogIHZhciBtaW5EaXN0PTFlOSxuZXdTdGVwPU5BVi5jdXJTdGVwOwogIGZvcih2YXIgaT1OQVYuY3VyU3RlcDtpPE1hdGgubWluKE5BVi5jdXJTdGVwKzMsTkFWLm5hdlN0ZXBzLmxlbmd0aCk7aSsrKXsKICAgIHZhciBzPU5BVi5uYXZTdGVwc1tpXTsKICAgIGlmKCFzLnN0YXJ0X2xvY2F0aW9uKWNvbnRpbnVlOwogICAgdmFyIGQ9TWF0aC5oeXBvdChzLnN0YXJ0X2xvY2F0aW9uLmxhdC1sYXQscy5zdGFydF9sb2NhdGlvbi5sbmctbG5nKTsKICAgIGlmKGQ8bWluRGlzdCl7bWluRGlzdD1kO25ld1N0ZXA9aX0KICB9CiAgaWYobmV3U3RlcCE9PU5BVi5jdXJTdGVwKXsKICAgIE5BVi5jdXJTdGVwPW5ld1N0ZXA7CiAgICB2YXIgc3RlcD1OQVYubmF2U3RlcHNbTkFWLmN1clN0ZXBdOwogICAgaWYoc3RlcCl7CiAgICAgIHZhciBzdGVwRGF0YT17c3RlcEluZGV4Ok5BVi5jdXJTdGVwLGluc3RydWN0aW9uOnN0ZXAuaW5zdHJ1Y3Rpb258fCIiLHJvYWQ6c3RlcC5yb2FkfHwiIixkaXN0YW5jZTpzdGVwLmRpc3RhbmNlfHwwLGFjdGlvbjpzdGVwLmFjdGlvbnx8IiJ9OwogICAgICBtb3RvcGxheUhhbmRsZXIoInNlbmROYXZEYXRhIiwiTU9WRV9NQVB8IitKU09OLnN0cmluZ2lmeSh7bGF0OmxhdCxsbmc6bG5nLHN0ZXBJbmRleDpOQVYuY3VyU3RlcCxpbnN0cnVjdGlvbjpzdGVwRGF0YS5pbnN0cnVjdGlvbn0pLGZ1bmN0aW9uKCl7fSk7CiAgICB9CiAgfQp9CmZ1bmN0aW9uIG5hdk9uUG9zRXJyKGUpe2lmKE5BVi5jYXN0aW5nKXRvYXN0KCJHUFPlrprkvY3lvILluLg6ICIrKGUubWVzc2FnZXx8IiIpLCJlcnIiKX0KZnVuY3Rpb24gbmF2U3RvcENhc3QoKXsKICBpZih0eXBlb2YgbW90b3BsYXlIYW5kbGVyPT09ImZ1bmN0aW9uIil7CiAgICBtb3RvcGxheUhhbmRsZXIoInNlbmROYXZEYXRhIiwiU1RPUF9OQVZJR0FUSU9OfHt9IixmdW5jdGlvbigpe30pOwogIH0KICBpZihOQVYud2F0Y2hJZCl7bmF2aWdhdG9yLmdlb2xvY2F0aW9uLmNsZWFyV2F0Y2goTkFWLndhdGNoSWQpO05BVi53YXRjaElkPW51bGx9CiAgTkFWLmNhc3Rpbmc9ZmFsc2U7CiAgdG9hc3QoIuaKleWxj+W3sue7k+adnyIsImluZm8iKTsKICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q2FzdEJ0biIpLnN0eWxlLm9wYWNpdHk9MTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2Q2FzdEJ0biIpLmRpc2FibGVkPWZhbHNlOwogIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJuYXZTdG9wQnRuIikuc3R5bGUub3BhY2l0eT0uNTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2U3RvcEJ0biIpLmRpc2FibGVkPXRydWU7Cn0KLy8g6L2m6L6G6aG15Yqg6L295pe25Yid5aeL5YyW6auY5b635Zyw5Zu+CmZ1bmN0aW9uIG5hdkluaXRPblRhYigpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibmF2TWFwIikmJiFOQVYubWFwKXtuYXZJbml0QU1hcCgpfX0sMzAwKX0KCmFzeW5jIGZ1bmN0aW9uIGV4dFNldChhY3Rpb24pewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIGNvbnN0IGJvZHk9e2FjdGlvbjphY3Rpb24sdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiJ9OwogIGlmKGFjdGlvbj09PSJjaGFyZ2VQb3dlciIpe2lmKCFWSC5jcCl7dG9hc3QoIuivt+WFiOmAieaLqeWFheeUteWKn+eOhyIsImVyciIpO3JldHVybn1ib2R5LnZhbHVlPVZILmNwfQogIHRvYXN0KCLmjIfku6TkuIvlj5HkuK3igKYiLCJpbmZvIik7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KGJvZHkpOwogIHRvYXN0KChkJiZkLm1lc3NhZ2UpfHwoKGQmJmQub2spPyLmjIfku6Tlt7LkuIvlj5EiOiLmjIfku6TlpLHotKUiKSwoZCYmZC5vayk/Im9rIjoiZXJyIik7Cn0KCmZ1bmN0aW9uIGluaXQoKXsKICBhcHBseVRoZW1lKCk7YXBwbHlDdXN0b21CZygpO21vdW50U2lnbmluRmFiKCk7CiAgcmVuZGVyQ2ZnKCk7CiAgaWYobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MCl7CiAgICBTVEFURS5kYXRhPURFTU9fREFUQTtTVEFURS50c1RleHQ9Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1NUQVRFLnByb3h5PWZhbHNlOwogICAgcmVuZGVySG9tZSgpO2hpZGVTcGxhc2goKTtyZXR1cm47CiAgfQogIHN0YXJ0QXV0b1JlZnJlc2goKTtyZWZyZXNoQWxsKGZhbHNlKTsKICAvLyDlhZzlupXvvJrmnoHnq6/mg4XlhrXkuIvor7fmsYLplb/ml7bpl7Tml6Dlk43lupTvvIzpl6rlsY/kuZ/kuI3og73kuIDnm7TmjKHkvY/nlYzpnaIKICBzZXRUaW1lb3V0KGhpZGVTcGxhc2gsMTIwMDApOwp9CmluaXQoKTsKPC9zY3JpcHQ+CjwhLS1fX0pTNV9fLS0+Cg==";
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