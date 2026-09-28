/*
#!name=极核 ZEEHO 签到面板 V2.14.14
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.14.14

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.14.14, requires-body=true, timeout=60, tag=极核面板V2.14.14

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
// 版本: v2.14.14
// 更新日期: 2026-09-29
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.14.14";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-09-29 v2.14.14 界面重构：首页改车辆卡片风格、车控移至车辆页、仅保留深色主题、移除服务地址/充电预计时间/防盗布控等入口、充满通知补续航)`);

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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXNocmluazowO2JveC1zaGFkb3c6MCA2cHggMThweCByZ2JhKDE0LDE0MywxNzgsLjM1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KX0KLmJyYW5kLW1hcmsgc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci5icmFuZC10eHR7ZmxleDoxO21pbi13aWR0aDowfQouYnJhbmQtdHh0IGgxe2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouMnB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweH0KLmJyYW5kLXR4dCBwe2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4fQoudmVyLWNoaXB7Zm9udC1zaXplOjlweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMjIpO3BhZGRpbmc6MXB4IDZweDtib3JkZXItcmFkaXVzOjZweDtsZXR0ZXItc3BhY2luZzouNHB4fQouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy10YXNrc3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7ZmxleC13cmFwOndyYXB9Ci5odC10e2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQzKX0KLmh0LXQub24uZ3tjb2xvcjp2YXIoLS1vayl9Ci5odC10Lm9uLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLXNjb3Jle2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpiYXNlbGluZTtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7ZmxleC13cmFwOndyYXB9Ci5oYy1zY29yZSBie2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEzcHh9Ci5oYy1zY29yZSAucGx1c3tjb2xvcjp2YXIoLS1icmFuZCl9Ci5oYy1zY29yZSAuc3RyZWFre2NvbG9yOnZhcigtLWVycil9Ci5hY2MtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMXB4O21hcmdpbi1ib3R0b206MTRweH0KLmF2YXRhcnt3aWR0aDo0MnB4O2hlaWdodDo0MnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXdlaWdodDo5MDA7Zm9udC1zaXplOjE3cHg7Y29sb3I6IzA0MTIxQztmbGV4LXNocmluazowO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDE0LDE0MywxNzgsLjMpfQouYXZhdGFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTtjb2xvcjojMTQwRjJFO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDEyNCwxMDcsMjQwLC4zKX0KLmFjYy1pbmZve2ZsZXg6MTttaW4td2lkdGg6MH0KLmFjYy1uYW1le2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci5hY2Mtc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci5hY2MtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7ZmxleC1zaHJpbms6MH0KLmFjYy1lcnJ7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tZXJyKTtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjhweCAxMXB4O21hcmdpbi1ib3R0b206MTJweDtmb250LXdlaWdodDo2MDB9Ci5rcGktZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5rcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoua3BpIC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0iO2xpbmUtaGVpZ2h0OjEuMn0KLmtwaSAubHtmb250LXNpemU6OS41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi10b3A6MnB4fQoua3BpLmMxIC52e2NvbG9yOnZhcigtLXR4dCl9IC5rcGkuYzIgLnZ7Y29sb3I6dmFyKC0tb2spfSAua3BpLmMzIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmtwaS5jNCAudntjb2xvcjp2YXIoLS12aW8pfQouYmxpbmR7bWFyZ2luLWJvdHRvbToxNHB4fQouYmxpbmQtdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouYmxpbmQtdG9wIC5ye2NvbG9yOnZhcigtLXZpbyk7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmJsaW5kLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouYmxpbmQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKTtib3gtc2hhZG93OjAgMCAxMnB4IHJnYmEoMTI0LDEwNywyNDAsLjUpfQoud2Vla3ttYXJnaW4tYm90dG9tOjRweH0KLndlZWstdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206N3B4fQoud2Vlay1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsMWZyKTtnYXA6NXB4fQouZGF5e2FzcGVjdC1yYXRpbzoxO2JvcmRlci1yYWRpdXM6OXB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjFweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5kYXkgLmR7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bGluZS1oZWlnaHQ6MX0KLmRheSAubXtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjF9Ci5kYXkub2t7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KX0KLmRheS5vayAuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5kYXkudG9kYXl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgNHB4IDEycHggcmdiYSgxNCwxNDMsMTc4LC40KX0KLmRheS50b2RheSAuZHtjb2xvcjojMDQxMjFDfQouZGF5LnRvZGF5IC5te2NvbG9yOnJnYmEoNCwxOCwyOCwuNyl9CgovKiA9PT09PT09PT09PT0gdmVoaWNsZSBzZWN0aW9uID09PT09PT09PT09PSAqLwoudmVoaWNsZXsKICBtYXJnaW4tdG9wOjE0cHg7cGFkZGluZy10b3A6MTRweDtib3JkZXItdG9wOjFweCBkYXNoZWQgdmFyKC0tbGluZTIpO2N1cnNvcjpwb2ludGVyOwp9Ci52ZWhpY2xlLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O21hcmdpbi1ib3R0b206MTNweH0KLnZlaGljbGUtcmluZ3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O2ZsZXgtc2hyaW5rOjB9Ci52ZWhpY2xlLXJpbmcgc3Zne3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7dHJhbnNmb3JtOnJvdGF0ZSgtOTBkZWcpfQoudmVoaWNsZS1yaW5nIC50cmFja3tzdHJva2U6cmdiYSgxNDYsMTcwLDIwNSwuMTQpO2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NX0KLnZlaGljbGUtcmluZyAuYXJje2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpyb3VuZDt0cmFuc2l0aW9uOnN0cm9rZS1kYXNob2Zmc2V0IC44cyB2YXIoLS1lYXNlKSxzdHJva2UgLjVzfQoudmVoaWNsZS1yaW5nIC5wY3R7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci52ZWhpY2xlLW1ldGF7ZmxleDoxO21pbi13aWR0aDowfQoudmVoaWNsZS1uYW1le2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLXZpbntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsU0ZNb25vLVJlZ3VsYXIsTWVubG8sbW9ub3NwYWNlfQoudmluLXNob3d7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tbGVmdDo0cHg7cGFkZGluZzoxcHggNnB4O2JvcmRlci1yYWRpdXM6NXB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KLnZlaGljbGUtYmFkZ2Vze2Rpc3BsYXk6ZmxleDtnYXA6NXB4O21hcmdpbi10b3A6N3B4O2ZsZXgtd3JhcDp3cmFwfQoudnN0YXQtcm93e2Rpc3BsYXk6ZmxleDtnYXA6NnB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206MTJweH0KLnZzdGF0e2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMH0KLnZzdGF0IHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4fQoudnN0YXQub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0Lm9mZntiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO2NvbG9yOnZhcigtLXR4dDIpfQoudnN0YXQubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnZzdGF0LnVubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci52c3RhdC5zZWF0e2JhY2tncm91bmQ6dmFyKC0tdmlvU29mdCk7Y29sb3I6dmFyKC0tdmlvKX0KLmNoYXJnZS1iYW5uZXJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4O2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNjEsMjIwLDE1MSwuMjUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjlweCAxMnB4O21hcmdpbi1ib3R0b206MTJweH0KLmNoYXJnZS1iYW5uZXIgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tb2spO2ZsZXgtc2hyaW5rOjB9Ci5jaGFyZ2UtYmFubmVyIC5jdHtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQouY2hhcmdlLWJhbm5lciAuY2V7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tb2spO29wYWNpdHk6Ljg1O21hcmdpbi1sZWZ0OmF1dG87YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjE1KTtwYWRkaW5nOjJweCA5cHg7Ym9yZGVyLXJhZGl1czoxMHB4fQoudmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6N3B4O21hcmdpbi1ib3R0b206MTJweH0KLnZrcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo4cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoudmtwaSAudntmb250LXNpemU6MTRweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZrcGkgLmx7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5iYXR0LXRyYWNre2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xKTtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWJvdHRvbToxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5iYXR0LWZpbGx7aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo1cHg7dHJhbnNpdGlvbjp3aWR0aCAuOHMgdmFyKC0tZWFzZSksYmFja2dyb3VuZCAuNXM7Ym94LXNoYWRvdzowIDAgMTBweCBjdXJyZW50Q29sb3J9Ci5tZXRhLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjhweDtmbGV4LXdyYXA6d3JhcDttYXJnaW4tYm90dG9tOjZweH0KLm1ldGEtaXRlbXtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo5cHg7cGFkZGluZzo1cHggOXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLm1ldGEtaXRlbSBzdmd7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5tZXRhLWl0ZW0gYntjb2xvcjp2YXIoLS10eHQpfQoudmVoaWNsZS1hZGRye2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDttYXJnaW4tdG9wOjRweDttYXJnaW4tYm90dG9tOjEwcHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci52ZWhpY2xlLWFkZHIgLmF0e2ZsZXg6MTttaW4td2lkdGg6MDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLWFkZHIgc3Zne3dpZHRoOjEzcHg7aGVpZ2h0OjEzcHg7Y29sb3I6dmFyKC0td2Fybik7ZmxleC1zaHJpbms6MH0KLm1hcC1idG57aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4zKTtmbGV4LXNocmluazowO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLm1hcC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoubWFwLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi40NTtwb2ludGVyLWV2ZW50czpub25lfQouY3RybC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDUsMWZyKTtnYXA6NnB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTJweH0KLmN0cmwtYnRue2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7cGFkZGluZzoxMHB4IDJweDtib3JkZXItcmFkaXVzOjEzcHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKSxiYWNrZ3JvdW5kIC4ycyxib3JkZXItY29sb3IgLjJzLGNvbG9yIC4yc30KLmN0cmwtYnRuIHN2Z3t3aWR0aDoxN3B4O2hlaWdodDoxN3B4O2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246Y29sb3IgLjJzfQouY3RybC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTIpfQouY3RybC1idG4udW5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjMpO2NvbG9yOnZhcigtLW9rKX0KLmN0cmwtYnRuLnVubG9jayBzdmd7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4ubG9ja3tib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMyk7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuLmxvY2sgc3Zne2NvbG9yOnZhcigtLWVycil9Ci5jdHJsLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi41O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWJ0bi5idXN5IHN2Z3thbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoubm8tdmVoaWNsZXtwYWRkaW5nOjE0cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNDcsMTg1LDg1LC4yNSk7Y29sb3I6dmFyKC0td2Fybik7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO3RleHQtYWxpZ246Y2VudGVyfQoKLyogPT09PT09PT09PT09IGVtcHR5ICYgc2tlbGV0b24gPT09PT09PT09PT09ICovCi5lbXB0eXtwYWRkaW5nOjcwcHggMjZweDt0ZXh0LWFsaWduOmNlbnRlcjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmVtcHR5IC5lLWljb257d2lkdGg6NzRweDtoZWlnaHQ6NzRweDttYXJnaW46MCBhdXRvIDE4cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myl9Ci5lbXB0eSAuZS1pY29uIHN2Z3t3aWR0aDozNHB4O2hlaWdodDozNHB4fQouZW1wdHkgaDN7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouZW1wdHkgcHtmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWF4LXdpZHRoOjMwMHB4O21hcmdpbjowIGF1dG8gMjBweH0KLnNre2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDEwMGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNDAlLHJnYmEoMTQ2LDE3MCwyMDUsLjEyKSA1MCUscmdiYSgxNDYsMTcwLDIwNSwuMDYpIDYwJSk7YmFja2dyb3VuZC1zaXplOjIwMCUgMTAwJTthbmltYXRpb246c2sgMS4ycyBsaW5lYXIgaW5maW5pdGU7Ym9yZGVyLXJhZGl1czoxMHB4fQpAa2V5ZnJhbWVzIHNre3Rve2JhY2tncm91bmQtcG9zaXRpb246LTIwMCUgMH19Ci5zay1jYXJke2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCl9Ci5zay1saW5le2hlaWdodDoxM3B4O21hcmdpbi1ib3R0b206MTBweH0uc2stbGluZS53NDB7d2lkdGg6NDAlfS5zay1saW5lLnc2MHt3aWR0aDo2MCV9LnNrLWxpbmUudzgwe3dpZHRoOjgwJX0KLnNrLXJvd3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW46MTRweCAwfQouc2stY2VsbHtoZWlnaHQ6NTJweDtib3JkZXItcmFkaXVzOjEycHh9Ci5zay1iYXJ7aGVpZ2h0OjE0cHg7Ym9yZGVyLXJhZGl1czo4cHg7bWFyZ2luLXRvcDoxMnB4fQoKLyogPT09PT09PT09PT09IGxvZ3MgPT09PT09PT09PT09ICovCi5sb2ctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7b3ZlcmZsb3c6aGlkZGVuO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6MTBweDtwYWRkaW5nOjE0cHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmxvZy1oZWFkIGgze2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5sb2ctaGVhZCBoMyBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS12aW8pfQoubG9nLWZpbHRlcnN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5sb2ctbGlzdHttYXgtaGVpZ2h0OmNhbGMoMTAwdmggLSAyNjBweCk7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQoubG9nLWl0ZW17cGFkZGluZzoxMnB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDcpO2FuaW1hdGlvbjpjYXJkLWluIC4zcyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5sb2ctdGltZXtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tYm90dG9tOjNweDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoubG9nLW1haW57ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2ZvbnQtc2l6ZToxM3B4fQoubG9nLXVzZXJ7Zm9udC13ZWlnaHQ6ODAwfQoubG9nLXJlc3tmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQoubG9nLXJlcy5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KLmxvZy1zdGVwc3ttYXJnaW4tdG9wOjZweDtmb250LXNpemU6MTEuNXB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNztwYWRkaW5nLWxlZnQ6MnB4fQoubG9nLXN0ZXBzIGl7Zm9udC1zdHlsZTpub3JtYWw7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1yaWdodDo1cHh9Ci5sb2ctZW1wdHl7cGFkZGluZzo1MHB4IDIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHh9CgovKiA9PT09PT09PT09PT0gY29uZmlnID09PT09PT09PT09PSAqLwouY2ZnLXBhbmVse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5jZmctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTVweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouY2ZnLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmNmZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4fQouY2ZnLWhlYWQgLmJhcnt3aWR0aDozcHg7aGVpZ2h0OjE1cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZCk7ZmxleC1zaHJpbms6MH0KLmNmZy1oZWFkIC5iYXIuYW1iZXJ7YmFja2dyb3VuZDp2YXIoLS13YXJuKX0gLmNmZy1oZWFkIC5iYXIuZ3JlZW57YmFja2dyb3VuZDp2YXIoLS1vayl9IC5jZmctaGVhZCAuYmFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpbyl9Ci5jZmctYm9keXtwYWRkaW5nOjE2cHh9Ci5mb3JtLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMnB4fQouZi1pdGVte21pbi13aWR0aDowfQouZi1pdGVtLmZ1bGx7Z3JpZC1jb2x1bW46MS8tMX0KLmYtaXRlbSBsYWJlbHtkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tYm90dG9tOjZweH0KLmYtaXRlbSAuaGludHtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6NXB4O2xpbmUtaGVpZ2h0OjEuNn0KLmYtaXRlbSAuaGludCBjb2Rle2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO3BhZGRpbmc6MXB4IDVweDtib3JkZXItcmFkaXVzOjVweDtmb250LXNpemU6MTBweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlfQouc3dpdGNoe2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7cGFkZGluZzoxMHB4IDEycHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7Y3Vyc29yOnBvaW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouc3dpdGNoOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk4KX0KLnN3aXRjaCAubGJse2ZvbnQtc2l6ZToxMi41cHg7Zm9udC13ZWlnaHQ6NjAwO2ZsZXg6MX0KLnN3aXRjaCAuc2N7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5zd3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo0NHB4O2hlaWdodDoyNnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjIpO3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzIHZhcigtLWVhc2UpO2ZsZXgtc2hyaW5rOjB9Ci5zdzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MnB4O2xlZnQ6MnB4O3dpZHRoOjIycHg7aGVpZ2h0OjIycHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDojZmZmO3RyYW5zaXRpb246dHJhbnNmb3JtIC4yNXMgdmFyKC0tc3ByaW5nKTtib3gtc2hhZG93OjAgMnB4IDZweCByZ2JhKDAsMCwwLC4zNSl9Ci5zd2l0Y2ggaW5wdXR7ZGlzcGxheTpub25lfQouc3dpdGNoIGlucHV0OmNoZWNrZWQrLnN3e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCl9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3c6OmFmdGVye3RyYW5zZm9ybTp0cmFuc2xhdGVYKDE4cHgpfQouYWNjLWVkaXR7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE0cHg7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtaGVhZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MTJweH0KLmFjYy1lZGl0LXRpdGxle2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5hY2MtZWRpdC10aXRsZSAubnt3aWR0aDoyNHB4O2hlaWdodDoyNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjkwMH0KLmFjYy1lZGl0LWhlYWQgLmFjdHN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5idG4tcm93e2Rpc3BsYXk6ZmxleDtnYXA6MTBweDttYXJnaW4tdG9wOjE2cHg7ZmxleC13cmFwOndyYXB9Ci5idG4tcm93IC5idG57ZmxleDoxO21pbi13aWR0aDoxMjBweH0KLmNmZy1ub3Rle2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmc6MTJweCAxNHB4O2JhY2tncm91bmQ6cmdiYSgyNDcsMTg1LDg1LC4wNyk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjE4KTtib3JkZXItcmFkaXVzOjEycHg7bWFyZ2luLXRvcDoxMnB4fQouY2ZnLW5vdGUgYntjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSB0YWJiYXIgPT09PT09PT09PT09ICovCm5hdi50YWJiYXJ7CiAgcG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDo2MDsKICBkaXNwbGF5OmZsZXg7cGFkZGluZzo4cHggMTBweCBjYWxjKDhweCArIHZhcigtLXNhZmUtYikpOwogIGJhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuODIpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoMjRweCkgc2F0dXJhdGUoMS42KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpOwogIGJvcmRlci10b3A6MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjEpOwp9Ci50YWJ7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDozcHg7cGFkZGluZzo2cHggMDtib3JkZXItcmFkaXVzOjE0cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO3RyYW5zaXRpb246Y29sb3IgLjJzLHRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci50YWIgc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci50YWI6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci50YWIub257Y29sb3I6dmFyKC0tYnJhbmQpfQoudGFiIC50LWluZHt3aWR0aDoxNHB4O2hlaWdodDozcHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp0cmFuc3BhcmVudDt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjI1c30KLnRhYi5vbiAudC1pbmR7YmFja2dyb3VuZDp2YXIoLS1icmFuZCl9CgovKiA9PT09PT09PT09PT0gc2hlZXRzICYgdG9hc3QgPT09PT09PT09PT09ICovCi5zaGVldC1iYWNrZHJvcHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTAwO2JhY2tncm91bmQ6cmdiYSg0LDgsMTgsLjU1KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDZweCk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjNzIHZhcigtLWVhc2UpfQouc2hlZXQtYmFja2Ryb3Auc2hvd3tvcGFjaXR5OjE7cG9pbnRlci1ldmVudHM6YXV0b30KLnNoZWV0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO3otaW5kZXg6MTAxO21heC1oZWlnaHQ6ODZ2aDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyx2YXIoLS1jYXJkMiksdmFyKC0tYmcyKSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLWJvdHRvbTpub25lOwogIGJvcmRlci1yYWRpdXM6MjZweCAyNnB4IDAgMDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMDQlKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMzhzIHZhcigtLXNwcmluZyk7CiAgYm94LXNoYWRvdzowIC0xOHB4IDUwcHggcmdiYSgwLDAsMCwuNSl9Ci5zaGVldC5zaG93e3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfQouc2hlZXQtZ3JhYnt3aWR0aDozOHB4O2hlaWdodDo0cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4zKTttYXJnaW46MTBweCBhdXRvIDRweDtmbGV4LXNocmluazowfQouc2hlZXQtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NnB4IDIwcHggMTJweH0KLnNoZWV0LWhlYWQgaDN7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweH0KLnNoZWV0LWhlYWQgaDMgc3Zne3dpZHRoOjE4cHg7aGVpZ2h0OjE4cHh9Ci5zaGVldC1jbG9zZXt3aWR0aDozMnB4O2hlaWdodDozMnB4O2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2NvbG9yOnZhcigtLXR4dDIpfQouc2hlZXQtY2xvc2U6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5zaGVldC1ib2R5e3BhZGRpbmc6NHB4IDIwcHggMjRweDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zci1pdGVte2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7cGFkZGluZzoxMXB4IDA7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDgpO2ZvbnQtc2l6ZToxM3B4fQouc3ItaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLnNyLWl0ZW0gLmt7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NjAwO2ZsZXgtc2hyaW5rOjB9Ci5zci1pdGVtIC52e3RleHQtYWxpZ246cmlnaHQ7Zm9udC13ZWlnaHQ6ODAwfQouc3ItaXRlbSAudi5tb25ve2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEycHh9Ci5zaWctcmVzdWx0e21heC1oZWlnaHQ6NTJ2aDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zaWctY2FyZHtib3JkZXItcmFkaXVzOjE2cHg7cGFkZGluZzoxM3B4IDE0cHg7bWFyZ2luLWJvdHRvbToxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5zaWctY2FyZC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMjUpfQouc2lnLWNhcmQuZmFpbHtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5zaWctY2FyZCAuaHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLnNpZy1jYXJkIC5oIC5ye2ZvbnQtc2l6ZToxMnB4fQouc2lnLWNhcmQub2sgLmggLnJ7Y29sb3I6dmFyKC0tb2spfSAuc2lnLWNhcmQuZmFpbCAuaCAucntjb2xvcjp2YXIoLS1lcnIpfQouc2lnLWNhcmQgLnN0ZXBze2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuOH0KLnNpZy1jYXJkIC5zdGVwcyBpe2ZvbnQtc3R5bGU6bm9ybWFsO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tcmlnaHQ6NXB4fQouc2lnLWNhcmQgLnN0ZXBzIC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KI3RvYXN0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO3RvcDpjYWxjKDE4cHggKyB2YXIoLS1zYWZlLXQpKTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKC0xNnB4KTt6LWluZGV4OjIwMDsKICBkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWF4LXdpZHRoOjg2dnc7cGFkZGluZzoxMXB4IDE4cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjcwMDsKICBiYWNrZ3JvdW5kOnJnYmEoMTcsMjYsNDYsLjkyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3gtc2hhZG93OjAgMTBweCAzNHB4IHJnYmEoMCwwLDAsLjQ1KTsKICBvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjI1cyx0cmFuc2Zvcm0gLjNzIHZhcigtLXNwcmluZyl9CiN0b2FzdC5zaG93e29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKDApfQojdG9hc3Qgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7ZmxleC1zaHJpbms6MH0KI3RvYXN0Lm9re2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVycntjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mb3tjb2xvcjp2YXIoLS1icmFuZCl9CiN0b2FzdC5vayBzdmd7Y29sb3I6dmFyKC0tb2spfSAjdG9hc3QuZXJyIHN2Z3tjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mbyBzdmd7Y29sb3I6dmFyKC0tYnJhbmQpfQouY29uZmlybS1sYXllcntwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTUwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjMwcHh9Ci5jb25maXJte3dpZHRoOm1pbigzNDBweCw5MHZ3KTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItcmFkaXVzOjIwcHg7cGFkZGluZzoyMnB4IDIwcHggMThweDt0ZXh0LWFsaWduOmNlbnRlcjtib3gtc2hhZG93OjAgMjRweCA2MHB4IHJnYmEoMCwwLDAsLjU1KTthbmltYXRpb246Y2FyZC1pbiAuM3MgdmFyKC0tc3ByaW5nKSBib3RofQouY29uZmlybSAuY3R7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouY29uZmlybSAuY2R7Zm9udC1zaXplOjEyLjVweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWFyZ2luLWJvdHRvbToxOHB4fQouY29uZmlybSAuY2J7ZGlzcGxheTpmbGV4O2dhcDoxMHB4fQouY29uZmlybSAuY2IgYnV0dG9ue2ZsZXg6MTtoZWlnaHQ6NDJweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouY29uZmlybSAuY2IgLm5ve2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKX0KLmNvbmZpcm0gLmNiIC55ZXN7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDfQoKLyogPT09PT09PT09PT09IG1pc2MgPT09PT09PT09PT09ICovCi5mb290e3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAwIDRweDtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuOH0KLmZvb3QgLmxpbmt7Y29sb3I6dmFyKC0tYnJhbmQpO3RleHQtZGVjb3JhdGlvbjpub25lO2ZvbnQtd2VpZ2h0OjcwMH0KLmhpZGRlbntkaXNwbGF5Om5vbmUhaW1wb3J0YW50fQpAa2V5ZnJhbWVzIHB1bHNlezAlLDEwMCV7b3BhY2l0eToxfTUwJXtvcGFjaXR5Oi40NX19Ci5wdWxzZXthbmltYXRpb246cHVsc2UgMS42cyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOnJlZHVjZSl7CiAgKnthbmltYXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50O3RyYW5zaXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50fQp9CkBtZWRpYSAobWluLXdpZHRoOjcwMHB4KXsKICBtYWlue21heC13aWR0aDo2ODBweDttYXJnaW46MCBhdXRvfQp9CkBtZWRpYSAobWF4LXdpZHRoOjY5OXB4KXsKICBpbnB1dFt0eXBlPXRleHRdLGlucHV0W3R5cGU9cGFzc3dvcmRdLGlucHV0W3R5cGU9bnVtYmVyXSx0ZXh0YXJlYXtmb250LXNpemU6MTZweCFpbXBvcnRhbnR9Cn0KCi8qID09PT09PT09PT09PSB2Mi4xNC45IOenr+WIhiAvIOi9pui+humhtee7hOS7tiA9PT09PT09PT09PT0gKi8KLmFjYy1jaGlwc3tkaXNwbGF5OmZsZXg7Z2FwOjdweDtvdmVyZmxvdy14OmF1dG87cGFkZGluZzoycHggMCAxMnB4Oy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouYWNjLWNoaXBzOjotd2Via2l0LXNjcm9sbGJhcntkaXNwbGF5Om5vbmV9Ci5hY2MtY2hpcHtmbGV4LXNocmluazowO3BhZGRpbmc6N3B4IDE1cHg7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpfQouYWNjLWNoaXAub257YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtib3gtc2hhZG93OjAgNHB4IDE0cHggdmFyKC0tYnJhbmRTb2Z0KX0KLnB0LWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMHB4O21hcmdpbi1ib3R0b206MTRweH0KLnB0LWNlbGx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1tZCk7cGFkZGluZzoxM3B4IDE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wdC1jZWxsIC5sYntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLWJvdHRvbTo1cHh9Ci5wdC1jZWxsIC52bHtmb250LXNpemU6MjJweDtmb250LXdlaWdodDo4MDA7bGluZS1oZWlnaHQ6MS4xNX0KLnB0LWNlbGwgLnN1Yntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjNweH0KLnBhbmVsLWNhcmR7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7cGFkZGluZzoxNXB4O21hcmdpbi1ib3R0b206MTRweDthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLnBhbmVsLWNhcmQgLnBjLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjExcHh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFkIGg0e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFkIGg0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLmNhbC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsMWZyKTtnYXA6NXB4fQouY2FsLXdke2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nLWJvdHRvbTozcHh9Ci5jYWwtZHthc3BlY3QtcmF0aW86MTtib3JkZXItcmFkaXVzOjlweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtjb2xvcjp2YXIoLS10eHQyKTtib3JkZXI6MS41cHggc29saWQgdHJhbnNwYXJlbnR9Ci5jYWwtZC5zaWduZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLmNhbC1kLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQouY2FsLWQudG9kYXl7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKX0KLmNhbC1kLmZ1dHVyZXtvcGFjaXR5Oi4zOH0KLmNhbC1kLmJsYW5re2JhY2tncm91bmQ6dHJhbnNwYXJlbnR9Ci5jYWwtZCAuZG90e2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MTttYXJnaW4tdG9wOjFweH0KLnZjLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo5cHh9Ci52Yy1idG57YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCA2cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0KX0KLnZjLWJ0biBzdmd7d2lkdGg6MjFweDtoZWlnaHQ6MjFweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci52Yy1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoub3B0LXJvd3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjhweDttYXJnaW46OXB4IDB9Ci5vcHQtY2hpcHtwYWRkaW5nOjhweCAxNHB4O2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLm9wdC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmZsb3ctaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6MTFweCAycHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5mbG93LWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5mbG93LWl0ZW0gLm5te2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjYwMH0KLmZsb3ctaXRlbSAudG17Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoycHh9Ci5mbG93LWl0ZW0gLnNje2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMH0KLmZsb3ctaXRlbSAuc2MucGx1c3tjb2xvcjp2YXIoLS1vayl9Ci5mbG93LWl0ZW0gLnNjLm1pbnVze2NvbG9yOnZhcigtLWVycil9Ci5tb24tcm93e2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzo5cHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxM3B4fQoubW9uLXJvdzpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLm1vbi1yb3cgLmt7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQoubW9uLXJvdyAudntmb250LXdlaWdodDo3MDB9Ci8qID09PT09PT09PT09PSDlhaXlnLrpl6rlsY/vvJrpppbluKfljbPmmL7npLrvvIzmlbDmja7lsLHnu6rlkI7mt6Hlh7ogPT09PT09PT09PT09ICovCiNzcGxhc2h7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4Ojk5OTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KDEyMCUgNjAlIGF0IDUwJSAwJSxyZ2JhKDE0LDE0MywxNzgsLjE2KSx0cmFuc3BhcmVudCA2MCUpLHZhcigtLWJnKTt0cmFuc2l0aW9uOm9wYWNpdHkgLjRzIHZhcigtLWVhc2UpLHRyYW5zZm9ybSAuNHMgdmFyKC0tZWFzZSl9CiNzcGxhc2gub3V0e29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoMS4wNCk7cG9pbnRlci1ldmVudHM6bm9uZX0KLnNwLW1hcmt7d2lkdGg6ODRweDtoZWlnaHQ6ODRweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Ym94LXNoYWRvdzowIDE0cHggNDBweCByZ2JhKDE0LDE0MywxNzgsLjQpO2FuaW1hdGlvbjpzcC1pbiAuNnMgdmFyKC0tc3ByaW5nKSBib3RofQouc3AtbWFyayBzdmd7d2lkdGg6NDZweDtoZWlnaHQ6NDZweH0KLnNwLXRpdGxle21hcmdpbi10b3A6MjBweDtmb250LXNpemU6MjFweDtmb250LXdlaWdodDo5MDA7bGV0dGVyLXNwYWNpbmc6MXB4O2FuaW1hdGlvbjpzcC11cCAuNXMgLjEycyB2YXIoLS1lYXNlKSBib3RofQouc3Atc3Vie21hcmdpbi10b3A6N3B4O2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDMpO2xldHRlci1zcGFjaW5nOjNweDthbmltYXRpb246c3AtdXAgLjVzIC4ycyB2YXIoLS1lYXNlKSBib3RofQouc3AtbG9hZHttYXJnaW4tdG9wOjM0cHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4O2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2FuaW1hdGlvbjpzcC11cCAuNXMgLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2FkIC5zcGlubmVye3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwaW4gLjhzIGxpbmVhciBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpIHRyYW5zbGF0ZVkoMTBweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKSB0cmFuc2xhdGVZKDApfX0KQGtleWZyYW1lcyBzcC11cHtmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMnB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJiZy1nbG93Ij48L2Rpdj4KPGRpdiBpZD0ic3BsYXNoIj4KICA8ZGl2IGNsYXNzPSJzcC1tYXJrIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTQgMTMuNUM0IDkuMDggNy41OCA1LjUgMTIgNS41czggMy41OCA4IDgiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMiAxM2w3LjUgNS41IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSIxNi41IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE5IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC10aXRsZSI+5p6B5qC4IFpFRUhPPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3Atc3ViIj7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLWxvYWQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIj48L3NwYW4+5q2j5Zyo5Yqg6L295pWw5o2u4oCmPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik00IDEzLjVDNCA5LjA4IDcuNTggNS41IDEyIDUuNXM4IDMuNTggOCA4IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTIgMTNsNy41IDUuNSIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNy41IiBjeT0iMTYuNSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PC9zdmc+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC10eHQiPgogICAgICA8aDE+5p6B5qC4IFpFRUhPIDxzcGFuIGNsYXNzPSJ2ZXItY2hpcCI+TElURTwvc3Bhbj48L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIDxidXR0b24gY2xhc3M9Imljb24tYnRuIiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiIGFyaWEtbGFiZWw9IuWIt+aWsCI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMSAxLTIuNjQtNi4zNiIvPjxwYXRoIGQ9Ik0yMSAzdjZoLTYiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvaGVhZGVyPgoKICA8bWFpbiBpZD0ibWFpbiI+CiAgICA8ZGl2IGNsYXNzPSJwdHItd3JhcCIgaWQ9InB0cldyYXAiPgogICAgICA8ZGl2IGNsYXNzPSJwdHItaW5kaWNhdG9yIiBpZD0icHRySW5kIj48c3BhbiBjbGFzcz0ic3Bpbm5lciIgaWQ9InB0clNwaW4iPjwvc3Bhbj48c3BhbiBpZD0icHRyVHh0Ij7kuIvmi4nliLfmlrA8L3NwYW4+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InBhZ2VIb21lIj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0icGFnZVBvaW50cyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlVmVoaWNsZSIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlTG9ncyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlQ2ZnIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICA8L21haW4+CgogIDxuYXYgY2xhc3M9InRhYmJhciI+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIgb24iIGRhdGEtdGFiPSJob21lIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2hvbWUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDEwLjUgMTIgM2w5IDcuNSIvPjxwYXRoIGQ9Ik01IDkuNVYyMWgxNFY5LjUiLz48L3N2Zz4KICAgICAg6aaW6aG1PHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InBvaW50cyIgb25jbGljaz0ic3dpdGNoVGFiKCdwb2ludHMnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjguNiIvPjxwYXRoIGQ9Ik05IDguNWwzIDQgMy00TTEyIDEyLjVWMTdNOS42IDEzLjRoNC44TTkuNiAxNS40aDQuOCIvPjwvc3ZnPgogICAgICDnp6/liIY8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0idmVoaWNsZSIgb25jbGljaz0ic3dpdGNoVGFiKCd2ZWhpY2xlJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNCAxM2wxLjctNC42QTIgMiAwIDAgMSA3LjYgN2g4LjhhMiAyIDAgMCAxIDEuOSAxLjRMMjAgMTMiLz48cGF0aCBkPSJNMy41IDEzaDE3YTEgMSAwIDAgMSAxIDF2My41aC0yLjZNMi41IDE3LjVWMTRhMSAxIDAgMCAxIDEtMSIvPjxwYXRoIGQ9Ik01LjEgMTcuNUgyLjUiLz48Y2lyY2xlIGN4PSI3LjMiIGN5PSIxNy4zIiByPSIxLjkiLz48Y2lyY2xlIGN4PSIxNi43IiBjeT0iMTcuMyIgcj0iMS45Ii8+PHBhdGggZD0iTTkuMiAxNy4zaDUuNiIvPjwvc3ZnPgogICAgICDovabovoY8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0ibG9ncyIgb25jbGljaz0ic3dpdGNoVGFiKCdsb2dzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOCA2aDEzTTggMTJoMTNNOCAxOGgxMyIvPjxwYXRoIGQ9Ik0zIDZoLjAxTTMgMTJoLjAxTTMgMThoLjAxIi8+PC9zdmc+CiAgICAgIOaXpeW/lzxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJjZmciIG9uY2xpY2s9InN3aXRjaFRhYignY2ZnJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PHBhdGggZD0iTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAxIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDEgMS00IDB2LS4wOWExLjY1IDEuNjUgMCAwIDAtMS0xLjUxIDEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMSAxLTIuODMtMi44M2wuMDYtLjA2YTEuNjUgMS42NSAwIDAgMCAuMzMtMS44MiAxLjY1IDEuNjUgMCAwIDAtMS41MS0xSDNhMiAyIDAgMSAxIDAtNGguMDlhMS42NSAxLjY1IDAgMCAwIDEuNTEtMSAxLjY1IDEuNjUgMCAwIDAtLjMzLTEuODJsLS4wNi0uMDZhMiAyIDAgMSAxIDIuODMtMi44M2wuMDYuMDZhMS42NSAxLjY1IDAgMCAwIDEuODIuMzNoLjAxYTEuNjUgMS42NSAwIDAgMCAxLTEuNTFWM2EyIDIgMCAxIDEgNCAwdi4wOWExLjY1IDEuNjUgMCAwIDAgMSAxLjUxaC4wMWExLjY1IDEuNjUgMCAwIDAgMS44Mi0uMzNsLjA2LS4wNmEyIDIgMCAxIDEgMi44MyAyLjgzbC0uMDYuMDZhMS42NSAxLjY1IDAgMCAwLS4zMyAxLjgydi4wMWExLjY1IDEuNjUgMCAwIDAgMS41MSAxSDIxYTIgMiAwIDEgMSAwIDRoLS4wOWExLjY1IDEuNjUgMCAwIDAtMS41MSAxeiIvPjwvc3ZnPgogICAgICDorr7nva48c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogIDwvbmF2PgoKICA8ZGl2IGNsYXNzPSJzaGVldC1iYWNrZHJvcCIgaWQ9InNoZWV0QmFja2Ryb3AiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PC9kaXY+CiAgPGRpdiBjbGFzcz0ic2hlZXQiIGlkPSJzaGVldCI+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ncmFiIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWhlYWQiPgogICAgICA8aDMgaWQ9InNoZWV0VGl0bGUiPjwvaDM+CiAgICAgIDxidXR0b24gY2xhc3M9InNoZWV0LWNsb3NlIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtYm9keSIgaWQ9InNoZWV0Qm9keSI+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgaWQ9InRvYXN0IiByb2xlPSJzdGF0dXMiPjwvZGl2PgogIDxkaXYgY2xhc3M9ImNvbmZpcm0tbGF5ZXIgaGlkZGVuIiBpZD0iY29uZmlybUxheWVyIj48L2Rpdj4KPC9kaXY+CjxzY3JpcHQ+CiJ1c2Ugc3RyaWN0IjsKLyogPT09PT09PT09PT09PT09PT0g5bi46YePID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFQUF9WRVJTSU9OID0gInYyLjE0LjE0IjsKY29uc3QgS0VZUyA9IHsgY2ZnOiJ6ZWVob19jZmciLCBhY2NvdW50czoiemVlaG9fYWNjb3VudHMiLCBsb2dzOiJ6ZWVob19sb2dzIiB9OwoKLyogPT09PT09PT09PT09PT09PT0g5bel5YW35Ye95pWwID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFV1aWQoKXtjb25zdCBwPSJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgiLGM9ImFiY2RlZjAxMjM0NTY3ODkiO2xldCByPSIiO2Zvcihjb25zdCBjaCBvZiBwKXtpZihjaD09PSJ4Inx8Y2g9PT0ieSIpe2NvbnN0IG49TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjE2KTtyKz0oY2g9PT0ieSI/KG4mMHgzKXwweDg6bikudG9TdHJpbmcoMTYpfWVsc2Ugcis9Y2h9cmV0dXJuIHJ9CmZ1bmN0aW9uIGdldFJhbmRvbUNoYXJzKG49MTYpe2NvbnN0IGM9IjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IjtsZXQgcj0iIjtmb3IobGV0IGk9MDtpPG47aSsrKXIrPWMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCkpO3JldHVybiByfQpmdW5jdGlvbiB0b1F1ZXJ5KHA9e30pe3JldHVybiBPYmplY3Qua2V5cyhwKS5maWx0ZXIoaz0+cFtrXSE9PXVuZGVmaW5lZCYmcFtrXSE9PW51bGwpLnNvcnQoKS5tYXAoaz0+aysiPSIrcFtrXSkuam9pbigiJiIpfQpmdW5jdGlvbiBjbGVhblRva2VuKHQpe3JldHVybiBTdHJpbmcodHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWVhcmVyXHMrL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpfQpmdW5jdGlvbiBjbGVhbkJhcmtLZXkoYil7bGV0IHM9U3RyaW5nKGJ8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1hcmtccyooa2V5KT9ccypbOu+8ml1ccyovaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIikudHJpbSgpO3JldHVybiBzLnJlcGxhY2UoL1wvKyQvLCIiKX0KZnVuY3Rpb24gbWFza1Zpbih2KXtjb25zdCBzPVN0cmluZyh2fHwiIik7aWYoIXMpcmV0dXJuIiI7aWYocy5sZW5ndGg8PTcpcmV0dXJuIioqKioiO3JldHVybiBzLnN1YnN0cmluZygwLDMpKyIqKioqIitzLnN1YnN0cmluZyhzLmxlbmd0aC00KX0KZnVuY3Rpb24gZGVlcFBpY2sob2JqLGtleXMsZGVwdGgpe2lmKCFvYmp8fHR5cGVvZiBvYmohPT0ib2JqZWN0Inx8KGRlcHRofHwwKT41KXJldHVybiIiO2Zvcihjb25zdCBrIG9mIGtleXMpe2lmKG9ialtrXSE9PXVuZGVmaW5lZCYmb2JqW2tdIT09bnVsbCYmb2JqW2tdIT09IiIpcmV0dXJuIFN0cmluZyhvYmpba10pfWZvcihjb25zdCBrIGluIG9iail7aWYob2JqW2tdJiZ0eXBlb2Ygb2JqW2tdPT09Im9iamVjdCIpe2NvbnN0IHI9ZGVlcFBpY2sob2JqW2tdLGtleXMsKGRlcHRofHwwKSsxKTtpZihyKXJldHVybiByfX1yZXR1cm4iIn0KZnVuY3Rpb24gcGlja0lvdFByb3AoZCxpZGVudGlmeSl7Y29uc3QgYXJyPWQmJmQuaW90UHJvcGVydGllcztpZihBcnJheS5pc0FycmF5KGFycikpe2NvbnN0IGtleT1TdHJpbmcoaWRlbnRpZnkpLnRvTG93ZXJDYXNlKCk7Zm9yKGNvbnN0IGl0IG9mIGFycil7aWYoaXQmJlN0cmluZyhpdC5pZGVudGlmeXx8IiIpLnRvTG93ZXJDYXNlKCk9PT1rZXkmJml0LnZhbHVlIT09bnVsbCYmaXQudmFsdWUhPT11bmRlZmluZWQmJml0LnZhbHVlIT09IiIpcmV0dXJuIFN0cmluZyhpdC52YWx1ZSl9fXJldHVybiIifQpmdW5jdGlvbiBnZXREZXZpY2VJZGVudGlmeShhY2Mpe2NvbnN0IHNlZWQ9U3RyaW5nKGFjYy51c2VySWR8fGFjYy52aW5Ob3x8InplZWhvLWRldmljZSIpO2xldCBoPTA7Zm9yKGxldCBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe2g9KChoPDw1KS1oK3NlZWQuY2hhckNvZGVBdChpKSl8MH1yZXR1cm4oTWF0aC5hYnMoaCkudG9TdHJpbmcoMTYpKyIwMDAwMDAwMDAwMDAwMDAwIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIGhhc1ZhbGlkQ29vcmQobGF0LGxuZyl7aWYobGF0PT09IiJ8fGxhdD09PW51bGx8fGxhdD09PXVuZGVmaW5lZHx8bG5nPT09IiJ8fGxuZz09PW51bGx8fGxuZz09PXVuZGVmaW5lZClyZXR1cm4gZmFsc2U7Y29uc3QgbGE9TnVtYmVyKGxhdCksbG49TnVtYmVyKGxuZyk7cmV0dXJuIGlzRmluaXRlKGxhKSYmaXNGaW5pdGUobG4pJiZNYXRoLmFicyhsYSk8PTkwJiZNYXRoLmFicyhsbik8PTE4MCYmIShsYT09PTAmJmxuPT09MCl9CmZ1bmN0aW9uIG5vcm1hbGl6ZVJlZnJlc2hTZWModil7Y29uc3Qgbj1OdW1iZXIodik7aWYoIWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiA2MDtyZXR1cm4gTWF0aC5tYXgoMTUsTWF0aC5taW4oMzYwMCxNYXRoLnJvdW5kKG4pKSl9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHM9PW51bGw/IiI6cykucmVwbGFjZSgvJi9nLCImYW1wOyIpLnJlcGxhY2UoLzwvZywiJmx0OyIpLnJlcGxhY2UoLz4vZywiJmd0OyIpLnJlcGxhY2UoLyIvZywiJnF1b3Q7Iil9CgovKiA9PT09PT09PT09PT09PT09PSBNRDUgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbWQ1KHQsZSl7ZnVuY3Rpb24gbih0LGUpe3JldHVybiB0PDxlfHQ+Pj4zMi1lfWZ1bmN0aW9uIHIodCxlKXt2YXIgbixyLG8saSxhO3JldHVybiBvPTIxNDc0ODM2NDgmdCxpPTIxNDc0ODM2NDgmZSxhPSgxMDczNzQxODIzJnQpKygxMDczNzQxODIzJmUpLChuPTEwNzM3NDE4MjQmdCkmKHI9MTA3Mzc0MTgyNCZlKT8yMTQ3NDgzNjQ4XmFeb15pOm58cj8xMDczNzQxODI0JmE/MzIyMTIyNTQ3Ml5hXm9eaToxMDczNzQxODI0XmFeb15pOmFeb15pfWZ1bmN0aW9uIG8odCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmZXx+dCZufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGkodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmbnxlJn5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGEodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHReZV5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIHUodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIGVeKHR8fm4pfShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGModCl7dmFyIGUsbj0iIixyPSIiO2ZvcihlPTA7ZTw9MztlKyspbis9KHI9IjAiKyh0Pj4+OCplJjI1NSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoci5sZW5ndGgtMiwyKTtyZXR1cm4gbn12YXIgcyxsLGYscCxkLGgsdix5LGcsbT1BcnJheSgpO2ZvcihtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxuPXQubGVuZ3RoLHI9bis4LG89MTYqKChyLXIlNjQpLzY0KzEpLGk9QXJyYXkoby0xKSxhPTAsdT0wO3U8bjspYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfHQuY2hhckNvZGVBdCh1KTw8YSx1Kys7cmV0dXJuIGE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXwxMjg8PGEsaVtvLTJdPW48PDMsaVtvLTFdPW4+Pj4yOSxpfSh0PWZ1bmN0aW9uKHQpe3Q9dC5yZXBsYWNlKC9cclxuL2csIlxuIik7Zm9yKHZhciBlPSIiLG49MDtuPHQubGVuZ3RoO24rKyl7dmFyIHI9dC5jaGFyQ29kZUF0KG4pO3I8MTI4P2UrPVN0cmluZy5mcm9tQ2hhckNvZGUocik6cj4xMjcmJnI8MjA0OD8oZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5MiksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpOihlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpfXJldHVybiBlfSh0KSksaD0xNzMyNTg0MTkzLHY9NDAyMzIzMzQxNyx5PTI1NjIzODMxMDIsZz0yNzE3MzM4Nzgscz0wO3M8bS5sZW5ndGg7cys9MTYpbD1oLGY9dixwPXksZD1nLGg9byhoLHYseSxnLG1bcyswXSw3LDM2MTQwOTAzNjApLGc9byhnLGgsdix5LG1bcysxXSwxMiwzOTA1NDAyNzEwKSx5PW8oeSxnLGgsdixtW3MrMl0sMTcsNjA2MTA1ODE5KSx2PW8odix5LGcsaCxtW3MrM10sMjIsMzI1MDQ0MTk2NiksaD1vKGgsdix5LGcsbVtzKzRdLDcsNDExODU0ODM5OSksZz1vKGcsaCx2LHksbVtzKzVdLDEyLDEyMDAwODA0MjYpLHk9byh5LGcsaCx2LG1bcys2XSwxNywyODIxNzM1OTU1KSx2PW8odix5LGcsaCxtW3MrN10sMjIsNDI0OTI2MTMxMyksaD1vKGgsdix5LGcsbVtzKzhdLDcsMTc3MDAzNTQxNiksZz1vKGcsaCx2LHksbVtzKzldLDEyLDIzMzY1NTI4NzkpLHk9byh5LGcsaCx2LG1bcysxMF0sMTcsNDI5NDkyNTIzMyksdj1vKHYseSxnLGgsbVtzKzExXSwyMiwyMzA0NTYzMTM0KSxoPW8oaCx2LHksZyxtW3MrMTJdLDcsMTgwNDYwMzY4MiksZz1vKGcsaCx2LHksbVtzKzEzXSwxMiw0MjU0NjI2MTk1KSx5PW8oeSxnLGgsdixtW3MrMTRdLDE3LDI3OTI5NjUwMDYpLGg9aShoLHY9byh2LHksZyxoLG1bcysxNV0sMjIsMTIzNjUzNTMyOSkseSxnLG1bcysxXSw1LDQxMjkxNzA3ODYpLGc9aShnLGgsdix5LG1bcys2XSw5LDMyMjU0NjU2NjQpLHk9aSh5LGcsaCx2LG1bcysxMV0sMTQsNjQzNzE3NzEzKSx2PWkodix5LGcsaCxtW3MrMF0sMjAsMzkyMTA2OTk5NCksaD1pKGgsdix5LGcsbVtzKzVdLDUsMzU5MzQwODYwNSksZz1pKGcsaCx2LHksbVtzKzEwXSw5LDM4MDE2MDgzKSx5PWkoeSxnLGgsdixtW3MrMTVdLDE0LDM2MzQ0ODg5NjEpLHY9aSh2LHksZyxoLG1bcys0XSwyMCwzODg5NDI5NDQ4KSxoPWkoaCx2LHksZyxtW3MrOV0sNSw1Njg0NDY0MzgpLGc9aShnLGgsdix5LG1bcysxNF0sOSwzMjc1MTYzNjA2KSx5PWkoeSxnLGgsdixtW3MrM10sMTQsNDEwNzYwMzMzNSksdj1pKHYseSxnLGgsbVtzKzhdLDIwLDExNjM1MzE1MDEpLGg9aShoLHYseSxnLG1bcysxM10sNSwyODUwMjg1ODI5KSxnPWkoZyxoLHYseSxtW3MrMl0sOSw0MjQzNTYzNTEyKSx5PWkoeSxnLGgsdixtW3MrN10sMTQsMTczNTMyODQ3MyksaD1hKGgsdj1pKHYseSxnLGgsbVtzKzEyXSwyMCwyMzY4MzU5NTYyKSx5LGcsbVtzKzVdLDQsNDI5NDU4ODczOCksZz1hKGcsaCx2LHksbVtzKzhdLDExLDIyNzIzOTI4MzMpLHk9YSh5LGcsaCx2LG1bcysxMV0sMTYsMTgzOTAzMDU2Miksdj1hKHYseSxnLGgsbVtzKzE0XSwyMyw0MjU5NjU3NzQwKSxoPWEoaCx2LHksZyxtW3MrMV0sNCwyNzYzOTc1MjM2KSxnPWEoZyxoLHYseSxtW3MrNF0sMTEsMTI3Mjg5MzM1MykseT1hKHksZyxoLHYsbVtzKzddLDE2LDQxMzk0Njk2NjQpLHY9YSh2LHksZyxoLG1bcysxMF0sMjMsMzIwMDIzNjY1NiksaD1hKGgsdix5LGcsbVtzKzEzXSw0LDY4MTI3OTE3NCksZz1hKGcsaCx2LHksbVtzKzBdLDExLDM5MzY0MzAwNzQpLHk9YSh5LGcsaCx2LG1bcyszXSwxNiwzNTcyNDQ1MzE3KSx2PWEodix5LGcsaCxtW3MrNl0sMjMsNzYwMjkxODkpLGg9YShoLHYseSxnLG1bcys5XSw0LDM2NTQ2MDI4MDkpLGc9YShnLGgsdix5LG1bcysxMl0sMTEsMzg3MzE1MTQ2MSkseT1hKHksZyxoLHYsbVtzKzE1XSwxNiw1MzA3NDI1MjApLGg9dShoLHY9YSh2LHksZyxoLG1bcysyXSwyMywzMjk5NjI4NjQ1KSx5LGcsbVtzKzBdLDYsNDA5NjMzNjQ1MiksZz11KGcsaCx2LHksbVtzKzddLDEwLDExMjY4OTE0MTUpLHk9dSh5LGcsaCx2LG1bcysxNF0sMTUsMjg3ODYxMjM5MSksdj11KHYseSxnLGgsbVtzKzVdLDIxLDQyMzc1MzMyNDEpLGg9dShoLHYseSxnLG1bcysxMl0sNiwxNzAwNDg1NTcxKSxnPXUoZyxoLHYseSxtW3MrM10sMTAsMjM5OTk4MDY5MCkseT11KHksZyxoLHYsbVtzKzEwXSwxNSw0MjkzOTE1NzczKSx2PXUodix5LGcsaCxtW3MrMV0sMjEsMjI0MDA0NDQ5NyksaD11KGgsdix5LGcsbVtzKzhdLDYsMTg3MzMxMzM1OSksZz11KGcsaCx2LHksbVtzKzE1XSwxMCw0MjY0MzU1NTUyKSx5PXUoeSxnLGgsdixtW3MrNl0sMTUsMjczNDc2ODkxNiksdj11KHYseSxnLGgsbVtzKzEzXSwyMSwxMzA5MTUxNjQ5KSxoPXUoaCx2LHksZyxtW3MrNF0sNiw0MTQ5NDQ0MjI2KSxnPXUoZyxoLHYseSxtW3MrMTFdLDEwLDMxNzQ3NTY5MTcpLHk9dSh5LGcsaCx2LG1bcysyXSwxNSw3MTg3ODcyNTkpLHY9dSh2LHksZyxoLG1bcys5XSwyMSwzOTUxNDgxNzQ1KSxoPXIoaCxsKSx2PXIodixmKSx5PXIoeSxwKSxnPXIoZyxkKTtyZXR1cm4gMzI9PWU/KGMoaCkrYyh2KStjKHkpK2MoZykpLnRvTG93ZXJDYXNlKCk6KGModikrYyh5KSkudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gU0hBMSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzaGExKG1zZyl7ZnVuY3Rpb24gcm90YXRlX2xlZnQobixzKXt2YXIgdDQ9KG48PHMpfChuPj4+KDMyLXMpKTtyZXR1cm4gdDR9O2Z1bmN0aW9uIGN2dF9oZXgodmFsKXt2YXIgc3RyPScnO3ZhciBpO3ZhciB2O2ZvcihpPTc7aT49MDtpLS0pe3Y9KHZhbD4+PihpKjQpKSYweDBmO3N0cis9di50b1N0cmluZygxNil9cmV0dXJuIHN0cn07ZnVuY3Rpb24gVXRmOEVuY29kZShzdHJpbmcpe3N0cmluZz1zdHJpbmcucmVwbGFjZSgvXHJcbi9nLCdcbicpO3ZhciB1dGZ0ZXh0PScnO2Zvcih2YXIgbj0wO248c3RyaW5nLmxlbmd0aDtuKyspe3ZhciBjPXN0cmluZy5jaGFyQ29kZUF0KG4pO2lmKGM8MTI4KXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGMpfWVsc2UgaWYoKGM+MTI3KSYmKGM8MjA0OCkpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpfDE5Mik7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX1lbHNle3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKXwyMjQpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSY2Myl8MTI4KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfX1yZXR1cm4gdXRmdGV4dH07dmFyIGJsb2Nrc3RhcnQ7dmFyIGksajt2YXIgVz1uZXcgQXJyYXkoODApO3ZhciBIMD0weDY3NDUyMzAxO3ZhciBIMT0weEVGQ0RBQjg5O3ZhciBIMj0weDk4QkFEQ0ZFO3ZhciBIMz0weDEwMzI1NDc2O3ZhciBIND0weEMzRDJFMUYwO3ZhciBBLEIsQyxELEU7dmFyIHRlbXA7bXNnPVV0ZjhFbmNvZGUobXNnKTt2YXIgbXNnX2xlbj1tc2cubGVuZ3RoO3ZhciB3b3JkX2FycmF5PW5ldyBBcnJheSgpO2ZvcihpPTA7aTxtc2dfbGVuLTM7aSs9NCl7aj1tc2cuY2hhckNvZGVBdChpKTw8MjR8bXNnLmNoYXJDb2RlQXQoaSsxKTw8MTZ8bXNnLmNoYXJDb2RlQXQoaSsyKTw8OHxtc2cuY2hhckNvZGVBdChpKzMpO3dvcmRfYXJyYXkucHVzaChqKX1zd2l0Y2gobXNnX2xlbiU0KXtjYXNlIDA6aT0weDA4MDAwMDAwMDticmVhaztjYXNlIDE6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwyNHwweDA4MDAwMDA7YnJlYWs7Y2FzZSAyOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MTZ8MHgwODAwMDticmVhaztjYXNlIDM6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTMpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwxNnxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDw4fDB4ODA7YnJlYWt9d29yZF9hcnJheS5wdXNoKGkpO3doaWxlKCh3b3JkX2FycmF5Lmxlbmd0aCUxNikhPTE0KXdvcmRfYXJyYXkucHVzaCgwKTt3b3JkX2FycmF5LnB1c2gobXNnX2xlbj4+PjI5KTt3b3JkX2FycmF5LnB1c2goKG1zZ19sZW48PDMpJjB4MGZmZmZmZmZmKTtmb3IoYmxvY2tzdGFydD0wO2Jsb2Nrc3RhcnQ8d29yZF9hcnJheS5sZW5ndGg7YmxvY2tzdGFydCs9MTYpe2ZvcihpPTA7aTwxNjtpKyspV1tpXT13b3JkX2FycmF5W2Jsb2Nrc3RhcnQraV07Zm9yKGk9MTY7aTw9Nzk7aSsrKVdbaV09cm90YXRlX2xlZnQoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0sMSk7QT1IMDtCPUgxO0M9SDI7RD1IMztFPUg0O2ZvcihpPTA7aTw9MTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwofkImRCkpK0UrV1tpXSsweDVBODI3OTk5KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT0yMDtpPD0zOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHg2RUQ5RUJBMSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NDA7aTw9NTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwoQiZEKXwoQyZEKSkrRStXW2ldKzB4OEYxQkJDREMpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTYwO2k8PTc5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweENBNjJDMUQ2KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1IMD0oSDArQSkmMHgwZmZmZmZmZmY7SDE9KEgxK0IpJjB4MGZmZmZmZmZmO0gyPShIMitDKSYweDBmZmZmZmZmZjtIMz0oSDMrRCkmMHgwZmZmZmZmZmY7SDQ9KEg0K0UpJjB4MGZmZmZmZmZmfXZhciB0ZW1wPWN2dF9oZXgoSDApK2N2dF9oZXgoSDEpK2N2dF9oZXgoSDIpK2N2dF9oZXgoSDMpK2N2dF9oZXgoSDQpO3JldHVybiB0ZW1wLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IEFFUy0yNTYtRUNCICsgUEtDUzcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQUVTX1NCT1g9bmV3IFVpbnQ4QXJyYXkoWzB4NjMsMHg3YywweDc3LDB4N2IsMHhmMiwweDZiLDB4NmYsMHhjNSwweDMwLDB4MDEsMHg2NywweDJiLDB4ZmUsMHhkNywweGFiLDB4NzYsMHhjYSwweDgyLDB4YzksMHg3ZCwweGZhLDB4NTksMHg0NywweGYwLDB4YWQsMHhkNCwweGEyLDB4YWYsMHg5YywweGE0LDB4NzIsMHhjMCwweGI3LDB4ZmQsMHg5MywweDI2LDB4MzYsMHgzZiwweGY3LDB4Y2MsMHgzNCwweGE1LDB4ZTUsMHhmMSwweDcxLDB4ZDgsMHgzMSwweDE1LDB4MDQsMHhjNywweDIzLDB4YzMsMHgxOCwweDk2LDB4MDUsMHg5YSwweDA3LDB4MTIsMHg4MCwweGUyLDB4ZWIsMHgyNywweGIyLDB4NzUsMHgwOSwweDgzLDB4MmMsMHgxYSwweDFiLDB4NmUsMHg1YSwweGEwLDB4NTIsMHgzYiwweGQ2LDB4YjMsMHgyOSwweGUzLDB4MmYsMHg4NCwweDUzLDB4ZDEsMHgwMCwweGVkLDB4MjAsMHhmYywweGIxLDB4NWIsMHg2YSwweGNiLDB4YmUsMHgzOSwweDRhLDB4NGMsMHg1OCwweGNmLDB4ZDAsMHhlZiwweGFhLDB4ZmIsMHg0MywweDRkLDB4MzMsMHg4NSwweDQ1LDB4ZjksMHgwMiwweDdmLDB4NTAsMHgzYywweDlmLDB4YTgsMHg1MSwweGEzLDB4NDAsMHg4ZiwweDkyLDB4OWQsMHgzOCwweGY1LDB4YmMsMHhiNiwweGRhLDB4MjEsMHgxMCwweGZmLDB4ZjMsMHhkMiwweGNkLDB4MGMsMHgxMywweGVjLDB4NWYsMHg5NywweDQ0LDB4MTcsMHhjNCwweGE3LDB4N2UsMHgzZCwweDY0LDB4NWQsMHgxOSwweDczLDB4NjAsMHg4MSwweDRmLDB4ZGMsMHgyMiwweDJhLDB4OTAsMHg4OCwweDQ2LDB4ZWUsMHhiOCwweDE0LDB4ZGUsMHg1ZSwweDBiLDB4ZGIsMHhlMCwweDMyLDB4M2EsMHgwYSwweDQ5LDB4MDYsMHgyNCwweDVjLDB4YzIsMHhkMywweGFjLDB4NjIsMHg5MSwweDk1LDB4ZTQsMHg3OSwweGU3LDB4YzgsMHgzNywweDZkLDB4OGQsMHhkNSwweDRlLDB4YTksMHg2YywweDU2LDB4ZjQsMHhlYSwweDY1LDB4N2EsMHhhZSwweDA4LDB4YmEsMHg3OCwweDI1LDB4MmUsMHgxYywweGE2LDB4YjQsMHhjNiwweGU4LDB4ZGQsMHg3NCwweDFmLDB4NGIsMHhiZCwweDhiLDB4OGEsMHg3MCwweDNlLDB4YjUsMHg2NiwweDQ4LDB4MDMsMHhmNiwweDBlLDB4NjEsMHgzNSwweDU3LDB4YjksMHg4NiwweGMxLDB4MWQsMHg5ZSwweGUxLDB4ZjgsMHg5OCwweDExLDB4NjksMHhkOSwweDhlLDB4OTQsMHg5YiwweDFlLDB4ODcsMHhlOSwweGNlLDB4NTUsMHgyOCwweGRmLDB4OGMsMHhhMSwweDg5LDB4MGQsMHhiZiwweGU2LDB4NDIsMHg2OCwweDQxLDB4OTksMHgyZCwweDBmLDB4YjAsMHg1NCwweGJiLDB4MTZdKTsKY29uc3QgQUVTX1JDT049bmV3IFVpbnQ4QXJyYXkoWzB4MDAsMHgwMSwweDAyLDB4MDQsMHgwOCwweDEwLDB4MjAsMHg0MCwweDgwLDB4MWIsMHgzNiwweDZjLDB4ZDgsMHhhYiwweDRkXSk7CmZ1bmN0aW9uIGFlc0dNdWwoYSxiKXtsZXQgcD0wO2ZvcihsZXQgaT0wO2k8ODtpKyspe2lmKGImMSlwXj1hO2NvbnN0IGhpPWEmMHg4MDthPShhPDwxKSYweGZmO2lmKGhpKWFePTB4MWI7Yj4+PTF9cmV0dXJuIHB9CmZ1bmN0aW9uIGFlc0tleUV4cGFuc2lvbjI1NihrZXkpe2NvbnN0IE5rPTgsTmI9NCxOcj0xNDtjb25zdCB3PW5ldyBVaW50OEFycmF5KDQqTmIqKE5yKzEpKTtmb3IobGV0IGk9MDtpPE5rKjQ7aSsrKXdbaV09a2V5W2ldO2ZvcihsZXQgaT1OaztpPE5iKihOcisxKTtpKyspe2xldCB0MD13WzQqKGktMSldLHQxPXdbNCooaS0xKSsxXSx0Mj13WzQqKGktMSkrMl0sdDM9d1s0KihpLTEpKzNdO2lmKGklTms9PT0wKXtjb25zdCB0bXA9dDA7dDA9QUVTX1NCT1hbdDFdXkFFU19SQ09OW2kvTmtdO3QxPUFFU19TQk9YW3QyXTt0Mj1BRVNfU0JPWFt0M107dDM9QUVTX1NCT1hbdG1wXX1lbHNlIGlmKGklTms9PT00KXt0MD1BRVNfU0JPWFt0MF07dDE9QUVTX1NCT1hbdDFdO3QyPUFFU19TQk9YW3QyXTt0Mz1BRVNfU0JPWFt0M119d1s0KmldPXdbNCooaS1OayldXnQwO3dbNCppKzFdPXdbNCooaS1OaykrMV1edDE7d1s0KmkrMl09d1s0KihpLU5rKSsyXV50Mjt3WzQqaSszXT13WzQqKGktTmspKzNdXnQzfXJldHVybiB3fQpmdW5jdGlvbiBhZXNFbmNyeXB0QmxvY2soaW5wdXQsdyl7Y29uc3QgTmI9NCxOcj0xNDtjb25zdCBzPW5ldyBVaW50OEFycmF5KDE2KTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPWlucHV0W2ldO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbaV07Zm9yKGxldCByb3VuZD0xO3JvdW5kPD1Ocjtyb3VuZCsrKXtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPUFFU19TQk9YW3NbaV1dO2xldCB0PXNbMV07c1sxXT1zWzVdO3NbNV09c1s5XTtzWzldPXNbMTNdO3NbMTNdPXQ7dD1zWzJdO3NbMl09c1sxMF07c1sxMF09dDt0PXNbNl07c1s2XT1zWzE0XTtzWzE0XT10O3Q9c1szXTtzWzNdPXNbMTVdO3NbMTVdPXNbMTFdO3NbMTFdPXNbN107c1s3XT10O2lmKHJvdW5kIT09TnIpe2ZvcihsZXQgYz0wO2M8NDtjKyspe2NvbnN0IGk9NCpjO2NvbnN0IGEwPXNbaV0sYTE9c1tpKzFdLGEyPXNbaSsyXSxhMz1zW2krM107c1tpXT1hZXNHTXVsKGEwLDIpXmFlc0dNdWwoYTEsMyleYTJeYTM7c1tpKzFdPWEwXmFlc0dNdWwoYTEsMileYWVzR011bChhMiwzKV5hMztzW2krMl09YTBeYTFeYWVzR011bChhMiwyKV5hZXNHTXVsKGEzLDMpO3NbaSszXT1hZXNHTXVsKGEwLDMpXmExXmEyXmFlc0dNdWwoYTMsMil9fWNvbnN0IG9mZj1yb3VuZCoxNjtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W29mZitpXX1yZXR1cm4gc30KZnVuY3Rpb24gYWVzVXRmOEJ5dGVzKHN0cil7Y29uc3Qgb3V0PVtdO2ZvcihsZXQgaT0wO2k8c3RyLmxlbmd0aDtpKyspe2xldCBjPXN0ci5jaGFyQ29kZUF0KGkpO2lmKGM8MHg4MClvdXQucHVzaChjKTtlbHNlIGlmKGM8MHg4MDApb3V0LnB1c2goMHhjMHwoYz4+NiksMHg4MHwoYyYweDNmKSk7ZWxzZSBpZihjPj0weGQ4MDAmJmM8PTB4ZGJmZil7Y29uc3QgYzI9c3RyLmNoYXJDb2RlQXQoKytpKTtjPTB4MTAwMDArKChjLTB4ZDgwMCk8PDEwKSsoYzItMHhkYzAwKTtvdXQucHVzaCgweGYwfChjPj4xOCksMHg4MHwoKGM+PjEyKSYweDNmKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9ZWxzZSBvdXQucHVzaCgweGUwfChjPj4xMiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfXJldHVybiBuZXcgVWludDhBcnJheShvdXQpfQpmdW5jdGlvbiBhZXNCeXRlc1RvQmFzZTY0KGJ5dGVzKXtjb25zdCBjaGFycz0iQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7bGV0IHJlc3VsdD0iIixpPTA7Zm9yKDtpKzI8Ynl0ZXMubGVuZ3RoO2krPTMpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpfGJ5dGVzW2krMl07cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdK2NoYXJzW24mNjNdfWNvbnN0IHJlbT1ieXRlcy5sZW5ndGgtaTtpZihyZW09PT0xKXtjb25zdCBuPWJ5dGVzW2ldPDwxNjtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdKyI9PSJ9ZWxzZSBpZihyZW09PT0yKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rIj0ifXJldHVybiByZXN1bHR9CmZ1bmN0aW9uIGFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW50ZXh0LGtleVN0cil7Y29uc3Qga2V5PWFlc1V0ZjhCeXRlcyhrZXlTdHIpO2lmKGtleS5sZW5ndGghPT0zMil0aHJvdyBuZXcgRXJyb3IoIkFFUy0yNTbpnIDopoEzMuWtl+iKguWvhumSpe+8jOW9k+WJjSIra2V5Lmxlbmd0aCk7Y29uc3Qgdz1hZXNLZXlFeHBhbnNpb24yNTYoa2V5KTtjb25zdCBkYXRhPWFlc1V0ZjhCeXRlcyhwbGFpbnRleHQpO2NvbnN0IHBhZExlbj0xNi0oZGF0YS5sZW5ndGglMTYpO2NvbnN0IHBhZGRlZD1uZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCtwYWRMZW4pO3BhZGRlZC5zZXQoZGF0YSk7Zm9yKGxldCBpPWRhdGEubGVuZ3RoO2k8cGFkZGVkLmxlbmd0aDtpKyspcGFkZGVkW2ldPXBhZExlbjtjb25zdCBvdXQ9bmV3IFVpbnQ4QXJyYXkocGFkZGVkLmxlbmd0aCk7Zm9yKGxldCBvZmY9MDtvZmY8cGFkZGVkLmxlbmd0aDtvZmYrPTE2KXtvdXQuc2V0KGFlc0VuY3J5cHRCbG9jayhwYWRkZWQuc2xpY2Uob2ZmLG9mZisxNiksdyksb2ZmKX1yZXR1cm4gYWVzQnl0ZXNUb0Jhc2U2NChvdXQpfQoKLyogPT09PT09PT09PT09PT09PT0g5a2Y5YKoID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGxvYWRKU09OKGssZmFsbGJhY2spe3RyeXtjb25zdCByYXc9bG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7aWYoIXJhdylyZXR1cm4gZmFsbGJhY2s7Y29uc3Qgdj1KU09OLnBhcnNlKHJhdyk7cmV0dXJuIHY9PT11bmRlZmluZWR8fHY9PT1udWxsP2ZhbGxiYWNrOnZ9Y2F0Y2goZSl7cmV0dXJuIGZhbGxiYWNrfX0KZnVuY3Rpb24gc2F2ZUpTT04oayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayxKU09OLnN0cmluZ2lmeSh2KSk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KY29uc3QgREVGQVVMVF9DRkc9e2FwcDp7YXBwSWQ6IlM3cVBXUFUxIixhcHBTZWNyZXQ6ImM1ZTBkYTdmNGRhMjhkZjgwNTY5NGVjM2RkMWZjNjc5MmU5ZGY5OWQifSxoNTp7YXBwSWQ6IlN3NUY5dUppIixhcHBTZWNyZXQ6IjQ2ODcwYThmNjc4YTA5MTA5NDY4ZjViMDE2ODgxOGI5MWMyOTI4NDUifSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6dHJ1ZSxlbmFibGVMaWtlOnRydWUsZW5hYmxlQ29tbWVudDp0cnVlLGVuYWJsZVNoYXJlOnRydWUsZW5hYmxlRGVsZXRlOnRydWV9LHZlaGljbGVBZXNLZXk6IiIsYXV0b1JlZnJlc2hTZWM6NjAsc2VydmVyQmFzZToiIixhdXRvU2lnbmluOmZhbHNlLGF1dG9TaWduaW5UaW1lOiIwNzowMCIsdmVoaWNsZU1vbml0b3I6ZmFsc2V9OwpmdW5jdGlvbiBnZXRDZmcoKXtjb25zdCBjPWxvYWRKU09OKEtFWVMuY2ZnLG51bGwpO2lmKCFjKXJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KERFRkFVTFRfQ0ZHKSk7cmV0dXJue2FwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxERUZBVUxUX0NGRy5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjLmg1Py5hcHBJZHx8REVGQVVMVF9DRkcuaDUuYXBwSWQsYXBwU2VjcmV0OmMuaDU/LmFwcFNlY3JldHx8REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LHZlaGljbGVBZXNLZXk6KHR5cGVvZiBjLnZlaGljbGVBZXNLZXk9PT0ic3RyaW5nIj9jLnZlaGljbGVBZXNLZXk6IiIpLnRyaW0oKSxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGMuYXV0b1JlZnJlc2hTZWMpLHNlcnZlckJhc2U6U3RyaW5nKGMuc2VydmVyQmFzZXx8IiIpLnRyaW0oKSxhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsYXV0b1NpZ25pblRpbWU6KHR5cGVvZiBjLmF1dG9TaWduaW5UaW1lPT09InN0cmluZyImJi9eXGR7MSwyfTpcZHsyfSQvLnRlc3QoYy5hdXRvU2lnbmluVGltZSk/Yy5hdXRvU2lnbmluVGltZToiMDc6MDAiKSx2ZWhpY2xlTW9uaXRvcjpjLnZlaGljbGVNb25pdG9yPT09dHJ1ZX19CmZ1bmN0aW9uIHNhdmVDZmcoYyl7cmV0dXJuIHNhdmVKU09OKEtFWVMuY2ZnLGMpfQpmdW5jdGlvbiBnZXRBY2NvdW50cygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5hY2NvdW50cyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gc2F2ZUFjY291bnRzKGxpc3Qpe3JldHVybiBzYXZlSlNPTihLRVlTLmFjY291bnRzLGxpc3QpfQpmdW5jdGlvbiBnZXRMb2dzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmxvZ3MsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIGFkZExvZyhlbnRyeSl7Y29uc3QgbG9ncz1nZXRMb2dzKCk7bG9ncy51bnNoaWZ0KGVudHJ5KTtpZihsb2dzLmxlbmd0aD41MClsb2dzLmxlbmd0aD01MDtzYXZlSlNPTihLRVlTLmxvZ3MsbG9ncyl9CmZ1bmN0aW9uIGNsZWFyTG9ncygpe3JldHVybiBzYXZlSlNPTihLRVlTLmxvZ3MsW10pfQpmdW5jdGlvbiBpc1Byb3h5TW9kZSgpe3JldHVybiAhISh3aW5kb3cuX19QQU5FTF9NT0RFX18pfHwhIWdldENmZygpLnNlcnZlckJhc2V9Ci8qID09PT09PT09PT09PT09PT09IOetvuWQjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRTaWduKHR5cGUscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Y1t0eXBlXXx8Yy5hcHA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10eXBlPT09Img1Ij9nZXRVdWlkKCk6dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9Ym9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTonJztjb25zdCBzaWduYXR1cmU9dHlwZT09PSJoNSI/KHF1ZXJ5K3BhcmFtK2FjLmFwcFNlY3JldCk6KGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KTtjb25zdCBzaWduPW1kNShzaGExKHNpZ25hdHVyZSksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ3NpZ25hdHVyZSc6c2lnbn19CgovLyBINSDnq6/lkKsgYm9keSDnrb7lkI3vvIhsb2dpbkJ5UGhvbmUg562J5o6l5Y+j5b+F6aG75oqK6K+35rGC5L2T57qz5YWl562+5ZCN77yM5ZCm5YiZ6L+U5ZueIHBlcm1pdCBlcnJvcu+8iQpmdW5jdGlvbiBoNVNpZ25XaXRoQm9keShib2R5LGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuaDV8fGMuYXBwO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT1nZXRVdWlkKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpO2NvbnN0IHNpZ249bWQ1KHNoYTEoYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdhcHBJZCc6YWMuYXBwSWR9fQoKLy8gQXBwIOe9keWFs+WujOaVtOetvuWQje+8iOWPkeeggeS4jueZu+W9leWQjOe9keWFs++8jOmBv+WFjSBINSBhdXRoQ29kZSDlj5HnoIHov5sgQXBwIOaxoOiAjCBINSBsb2dpbkJ5UGhvbmUg5p+l5LiN5Yiw77yJCmZ1bmN0aW9uIGFwcEdhdGV3YXlTaWduKHVybCxtZXRob2QscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7bGV0IHByZVNpZ249IiI7aWYoU3RyaW5nKG1ldGhvZCkudG9VcHBlckNhc2UoKT09PSJHRVQiKXtjb25zdCB1PW5ldyBVUkwodXJsKTtwcmVTaWduPXUub3JpZ2luK3UucGF0aG5hbWUrKHF1ZXJ5PyI/IitxdWVyeToiIik7fWVsc2V7cHJlU2lnbj1xdWVyeSsoYm9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKToiIik7fWNvbnN0IHNpZ249bWQ1KHNoYTEocHJlU2lnbitwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnYXBwSWQnOmFjLmFwcElkLCdub25jZSc6bm9uY2UsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ3NpZ25hdHVyZSc6c2lnbiwnQ2Ztb3RvLVgtUGFyYW0nOnBhcmFtLCdDZm1vdG8tWC1TaWduJzpzaWduLCdDZm1vdG8tWC1TaWduLVR5cGUnOicwJ319CgovKiA9PT09PT09PT09PT09PT09PSBIVFRQ77yIZmV0Y2gg54mI77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGh0dHBHZXQodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJHRVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQb3N0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHk9PW51bGw/e306Ym9keSksc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQdXQodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBVVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OmJvZHkhPT11bmRlZmluZWQmJmJvZHkhPT1udWxsPyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOnVuZGVmaW5lZCxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cERlbGV0ZSh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkRFTEVURSIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KZnVuY3Rpb24gbmV0d29ya0hpbnQocmVzKXtjb25zdCBtPVN0cmluZygocmVzJiZyZXMuZXJyb3IpfHwiIik7aWYoL2ZhaWxlZCB0byBmZXRjaHxuZXR3b3JrZXJyb3J8Y29yc3xsb2FkIGZhaWxlZHzml6Dms5Xov57mjqV8572R57ucL2kudGVzdChtKSlyZXR1cm4i572R57ucL+i3qOWfn+WPl+mZkO+8muebtOi/nuaooeW8j+mcgCBaRUVITyDmnI3liqHnq6/mlL7ooYwgQ09SU++8jOivt+ajgOafpee9kee7nOi/nuaOpeWQjumHjeivlSI7cmV0dXJuIiJ9CgovKiA9PT09PT09PT09PT09PT09PSDnm7Tov57lkI7nq6/vvIjmtY/op4jlmajnm7TmjqXosIMgWkVFSE8gQVBJ77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGJhc2VIZWFkZXJzKGFjYyl7Y29uc3QgdWE9YWNjLnVzZXJBZ2VudHx8Ik1PQklMRXxpT1N8MTYuMS4xfFpFRUhPX0FQUHwzLjAuMXxpUGhvbmV8V1dBTnxpT1MiO2NvbnN0IGg9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrY2xlYW5Ub2tlbihhY2MudG9rZW4pLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsIkFjY2VwdC1MYW5ndWFnZSI6InpoLUNOIiwiQWNjZXB0IjoiKi8qIiwiVXNlci1BZ2VudCI6dWEsIngtYXBwLWluZm8iOnVhfTtpZihhY2MudXNlcklkKXtoWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2hbIkNvb2tpZSJdPSJ1c2VyX2lkPSIrYWNjLnVzZXJJZH1yZXR1cm4gaH0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0IixoZWFkZXJzKTtsZXQgbGlzdD1bXTtpZihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCl7aWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpbGlzdD1yZXMuZGF0YTtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmxpc3QpKWxpc3Q9cmVzLmRhdGEubGlzdDtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlY29yZHMpKWxpc3Q9cmVzLmRhdGEucmVjb3JkcztlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJvd3MpKWxpc3Q9cmVzLmRhdGEucm93c31yZXR1cm4gbGlzdC5tYXAodj0+KHt2aW5ObzpTdHJpbmcodi52aW5Ob3x8di5mcmFtZU5vfHx2LnZpbnx8IiIpLnRyaW0oKSxuYW1lOlN0cmluZyh2LnZlaGljbGVOYW1lfHx2LnZlaGljbGVUeXBlfHx2LmRldmljZU5hbWV8fHYubmFtZXx8Iui9pui+hiIpLnRyaW0oKXx8Iui9pui+hiIscGljOlN0cmluZyh2LnZlaGljbGVQaWNVcmx8fHYucGljfHx2LmltYWdlVXJsfHwiIikudHJpbSgpLHZlaGljbGVUeXBlOlN0cmluZyh2LnZlaGljbGVUeXBlfHx2LnR5cGV8fCIiKS50cmltKCksbGljZW5zZVBsYXRlOnYubGljZW5zZVBsYXRlfHxudWxsfSkpLmZpbHRlcih2PT52LnZpbk5vKX1jYXRjaChlKXtyZXR1cm5bXX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvd2lkZ2V0cy8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCBzb2M9TnVtYmVyKGQuYm1zc29jfHxkLmJhdHRlcnlMZXZlbHx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHwwKTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8MCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntiYXR0ZXJ5UGVyY2VudDpNYXRoLm1heCgwLE1hdGgubWluKDEwMCxpc0Zpbml0ZShzb2MpP3NvYzowKSkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsYWRkcmVzczpTdHJpbmcoZC5hZGRyZXNzfHwiIikudHJpbSgpLGxvY2F0aW9uVGltZTpTdHJpbmcoZC5sb2NhdGlvbj8ubG9jYXRpb25UaW1lfHwiIikudHJpbSgpLHZlaGljbGVOYW1lOlN0cmluZyhkLnZlaGljbGVOYW1lfHwiIikudHJpbSgpLHZlaGljbGVJbWFnZVVybDpTdHJpbmcoZC52ZWhpY2xlU2NhbGVQaWNVcmx8fGQudmVoaWNsZVBpY1VybHx8IiIpLnRyaW0oKSxoZWFkTG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fCIiKS50cmltKCksYmF0dGVyeVB1bGxPdXQ6U3RyaW5nKGQuYmF0dGVyeVB1bGxPdXRGbGFnfHwiIik9PT0iMSIsb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fGQuZGV2aWNlT25saW5lfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIixwb3dlclN0YXR1czpTdHJpbmcoZC5hY2NTdGF0dXN8fGQucG93ZXJTdGF0dXN8fGQudmVoaWNsZVN0YXR1c3x8ZC5pZ25pdGlvblN0YXR1c3x8ZC5wb3dlck1vZGV8fGQuYWNjU3RhdGV8fGQucG93ZXJTdGF0ZXx8ZC52ZWhpY2xlU3RhdGV8fGQuZW5naW5lU3RhdHVzfHxkLmlzUG93ZXJPbnx8ZC5wb3dlck9ufHwiIikudHJpbSgpLGxvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGQuY2FyTG9ja1N0YXRlfHxkLmRvb3JMb2NrU3RhdGV8fGQubG9ja0ZsYWd8fGQuaXNMb2NrZWR8fGQubG9ja2VkfHxkLmNlbnRyYWxMb2NraW5nU3RhdHVzfHwiIikudHJpbSgpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBkZXZpY2VJZD1nZXREZXZpY2VJZGVudGlmeShhY2MpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9O2NvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSG9tZVBhZ2VWMi8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIj91bmlxdWVJZGVudGlmeT0iK2RldmljZUlkKyImcGhvbmVEZXZpY2VOYW1lPWlvc18iK2RldmljZUlkO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KHVybCxoZWFkZXJzKTtpZihyZXMmJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZlaGljbGVMb2NrPXBpY2tJb3RQcm9wKGQsIlZlaGljbGVMb2NrX1MiKTtjb25zdCBoZWFkTG9ja0lvdD1waWNrSW90UHJvcChkLCJIZWFkTG9ja1N0YXRlIik7Y29uc3QgdG9wTG9jaz1TdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGhlYWRMb2NrSW90fHx2ZWhpY2xlTG9ja3x8IiIpLnRyaW0oKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue3Bvd2VyU3RhdHVzOmRlZXBQaWNrKGQsWyJhY2NTdGF0dXMiLCJwb3dlclN0YXR1cyIsInZlaGljbGVTdGF0dXMiLCJpZ25pdGlvblN0YXR1cyIsInBvd2VyTW9kZSIsImFjY1N0YXRlIiwicG93ZXJTdGF0ZSIsInZlaGljbGVTdGF0ZSIsImVuZ2luZVN0YXR1cyIsImlzUG93ZXJPbiIsInBvd2VyT24iLCJhY2MiXSkudHJpbSgpLGxvY2tTdGF0ZTp0b3BMb2NrLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQucmlkZVN0YXRlfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8IiIpLnRyaW0oKSxyaWRlU3RhdGU6U3RyaW5nKGQucmlkZVN0YXRlfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYXBwL3ZlaGljbGUvdGlyZS9tb25pdG9yaW5nP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJnRpbWVQZXJpb2RUeXBlPTEiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSk7aWYoKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyZXMuZGF0YS5yZWFsVGltZURhdGEpP3Jlcy5kYXRhLnJlYWxUaW1lRGF0YTooQXJyYXkuaXNBcnJheShyZXMuZGF0YSk/cmVzLmRhdGE6W10pO2NvbnN0IGJ5UG9zPXt9O2Zvcihjb25zdCBpdCBvZiBsaXN0KXtjb25zdCBwb3M9TnVtYmVyKGl0Py5zZW5zb3JQb3NpdGlvbik7aWYocG9zKWJ5UG9zW3Bvc109aXR9Y29uc3QgZm10PShpdCk9Pntjb25zdCB3YXJuPU51bWJlcihpdD8ud2FybmluZ1R5cGU/PzApO2NvbnN0IHY9U3RyaW5nKGl0Py50aXJlUHJlc3N1cmU/PyIiKS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHYpO2lmKHdhcm4hPT0wfHwhdnx8IWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiLmnKrnu5HlrpoiO3JldHVybiB2KyJiYXIifTtjb25zdCBmbXRUZW1wPShpdCk9Pntjb25zdCB3YXJuPU51bWJlcihpdD8ud2FybmluZ1R5cGU/PzApO2NvbnN0IHY9aXQ/LnRpcmVUZW1wO2lmKHdhcm4hPT0wfHx2PT1udWxsKXJldHVybiIiO2NvbnN0IHM9U3RyaW5nKHYpLnRyaW0oKTtjb25zdCBuPXBhcnNlRmxvYXQocyk7aWYoIXN8fHMudG9Mb3dlckNhc2UoKT09PSJudWxsInx8IWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiIiO3JldHVybiBzKyLCsEMifTtjb25zdCBmcm9udD1ieVBvc1sxXXx8bGlzdFswXTtjb25zdCByZWFyPWJ5UG9zWzJdfHxsaXN0WzFdO3JldHVybntmcm9udFByZXNzdXJlOmZyb250P2ZtdChmcm9udCk6Iuacque7keWumiIscmVhclByZXNzdXJlOnJlYXI/Zm10KHJlYXIpOiLmnKrnu5HlrpoiLGZyb250VGVtcDpmcm9udD9mbXRUZW1wKGZyb250KToiIixyZWFyVGVtcDpyZWFyP2ZtdFRlbXAocmVhcik6IiJ9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoUmlkZUluZm8oYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgbW9udGg9bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBbaG9tZVJlcyxteVJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvaG9tZVJpZGVJbmZvP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pLGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvbXlSaWRlSW5mbz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZtb250aD0iK21vbnRoLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSldKTtjb25zdCBoPWhvbWVSZXM/LmRhdGF8fGhvbWVSZXN8fHt9O2NvbnN0IGQ9bXlSZXM/LmRhdGF8fG15UmVzfHx7fTtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkoZC5yaWRlUmVjb3JkTGlzdCk/ZC5yaWRlUmVjb3JkTGlzdDpbXTtjb25zdCB0b2RheUtleT1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBkYXk9bGlzdC5maW5kKHg9PlN0cmluZyh4Py5kYXRlfHwiIik9PT10b2RheUtleSl8fGxpc3RbbGlzdC5sZW5ndGgtMV18fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJhdHRlcnlMZXZlbHx8ZC5ibXNzb2N8fDApLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MH19cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19Y2F0Y2goZSl7cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJoNSIse3Zpbk5vOnZpbk5vfSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcmFwcC9hcHAvc2VydmljZS9yZWNoYXJnZS92ZWhpY2xlL2RldGFpbD92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtyZXR1cm57cmVjaGFyZ2VFbmREYXRlOlN0cmluZyhyZXMuZGF0YS5yZWNoYXJnZUVuZERhdGV8fCIiKSxsYXN0VXNlRGF0ZTpOdW1iZXIocmVzLmRhdGEubGFzdFVzZURhdGUpfHwwLHNlcnZpY2VSZWNoYXJnZVN0YXR1czpTdHJpbmcocmVzLmRhdGEuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIiksdmVoaWNsZU5hbWU6U3RyaW5nKHJlcy5kYXRhLnZlaGljbGVOYW1lfHwiIil9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXtoYXNWZWhpY2xlOmZhbHNlLHZlaGljbGVOYW1lOiIiLHZlaGljbGVNb2RlbDoiIix2aW5ObzoiIix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsYmF0dGVyeVBlcmNlbnQ6MCxyZXNpZHVhbFJhbmdlS206MCxyYW5nZUVzdGltYXRlZDpmYWxzZSxhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iixmcm9udFByZXNzdXJlOiIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsbGFzdFJpZGVEdXJhdGlvbjowLHZlaGljbGVJbWFnZVVybDoiIixzZXJ2aWNlRW5kRGF0ZToiIixzZXJ2aWNlUmVtYWluRGF5czowLHNlcnZpY2VTdGF0dXM6IiIscG93ZXJTdGF0dXM6IiIsbG9ja1N0YXRlOiIiLG9ubGluZToiIixyaWRlU3RhdGU6IiIsY3VzaGlvblN0YXRlOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIn07dHJ5e2NvbnN0IHZlaGljbGVzPWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7aWYodmVoaWNsZXMubGVuZ3RoPT09MClyZXR1cm4gcmVzdWx0O2NvbnN0IHY9dmVoaWNsZXNbMF07cmVzdWx0Lmhhc1ZlaGljbGU9dHJ1ZTtyZXN1bHQudmVoaWNsZU5hbWU9di5uYW1lO3Jlc3VsdC52aW5Obz12LnZpbk5vO3Jlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9di5waWM7cmVzdWx0LnZlaGljbGVNb2RlbD12LnZlaGljbGVUeXBlfHwiIjtjb25zdCBbd2lkZ2V0cyx0aXJlLHJpZGUsYmF0dGVyeSxzZXJ2aWNlLGhvbWVQYWdlXT1hd2FpdCBQcm9taXNlLmFsbChbZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pih7Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowfSkpLGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpXSk7aWYod2lkZ2V0cyl7cmVzdWx0LmJhdHRlcnlQZXJjZW50PXdpZGdldHMuYmF0dGVyeVBlcmNlbnQ7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT13aWRnZXRzLnJlc2lkdWFsUmFuZ2VLbTtyZXN1bHQudm9sdGFnZT13aWRnZXRzLnZvbHRhZ2U7cmVzdWx0LmFkZHJlc3M9d2lkZ2V0cy5hZGRyZXNzO3Jlc3VsdC5sb2NhdGlvblRpbWU9d2lkZ2V0cy5sb2NhdGlvblRpbWU7cmVzdWx0LnBvd2VyU3RhdHVzPXdpZGdldHMucG93ZXJTdGF0dXN8fCIiO3Jlc3VsdC5sb2NrU3RhdGU9d2lkZ2V0cy5sb2NrU3RhdGV8fCIiO2lmKHdpZGdldHMudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXdpZGdldHMudmVoaWNsZU5hbWU7aWYod2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmwpcmVzdWx0LnZlaGljbGVJbWFnZVVybD13aWRnZXRzLnZlaGljbGVJbWFnZVVybDtpZih3aWRnZXRzLm9ubGluZSlyZXN1bHQub25saW5lPXdpZGdldHMub25saW5lO2lmKHdpZGdldHMuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9d2lkZ2V0cy5jdXNoaW9uU3RhdGU7aWYod2lkZ2V0cy5sb25naXR1ZGUhPT0iIiYmd2lkZ2V0cy5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT13aWRnZXRzLmxvbmdpdHVkZTtpZih3aWRnZXRzLmxhdGl0dWRlIT09IiImJndpZGdldHMubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPXdpZGdldHMubGF0aXR1ZGV9aWYoaG9tZVBhZ2Upe2lmKGhvbWVQYWdlLnBvd2VyU3RhdHVzKXJlc3VsdC5wb3dlclN0YXR1cz1ob21lUGFnZS5wb3dlclN0YXR1cztpZihob21lUGFnZS5sb2NrU3RhdGUpcmVzdWx0LmxvY2tTdGF0ZT1ob21lUGFnZS5sb2NrU3RhdGU7aWYoaG9tZVBhZ2Uub25saW5lKXJlc3VsdC5vbmxpbmU9aG9tZVBhZ2Uub25saW5lO2lmKGhvbWVQYWdlLnJpZGVTdGF0ZSlyZXN1bHQucmlkZVN0YXRlPWhvbWVQYWdlLnJpZGVTdGF0ZTtpZihob21lUGFnZS5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT1ob21lUGFnZS5jdXNoaW9uU3RhdGU7aWYoKHJlc3VsdC5sb25naXR1ZGU9PT0iInx8cmVzdWx0LmxvbmdpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxvbmdpdHVkZSE9PSIiJiZob21lUGFnZS5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT1ob21lUGFnZS5sb25naXR1ZGU7aWYoKHJlc3VsdC5sYXRpdHVkZT09PSIifHxyZXN1bHQubGF0aXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sYXRpdHVkZSE9PSIiJiZob21lUGFnZS5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9aG9tZVBhZ2UubGF0aXR1ZGV9aWYodGlyZSl7cmVzdWx0LmZyb250UHJlc3N1cmU9dGlyZS5mcm9udFByZXNzdXJlO3Jlc3VsdC5yZWFyUHJlc3N1cmU9dGlyZS5yZWFyUHJlc3N1cmU7cmVzdWx0LmZyb250VGVtcD10aXJlLmZyb250VGVtcDtyZXN1bHQucmVhclRlbXA9dGlyZS5yZWFyVGVtcH1pZihyaWRlKXtyZXN1bHQudG9kYXlEaXN0YW5jZT1yaWRlLnRvZGF5RGlzdGFuY2U7cmVzdWx0LnRvZGF5RHVyYXRpb249cmlkZS50b2RheUR1cmF0aW9uO3Jlc3VsdC50b2RheU1heFNwZWVkPXJpZGUudG9kYXlNYXhTcGVlZDtyZXN1bHQubGFzdFJpZGVNaWxlYWdlPXJpZGUubGFzdFJpZGVNaWxlYWdlO3Jlc3VsdC5sYXN0UmlkZUR1cmF0aW9uPXJpZGUubGFzdFJpZGVEdXJhdGlvbnx8MH1yZXN1bHQuY2hhcmdlU3RhdGU9YmF0dGVyeS5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSI7aWYoYmF0dGVyeS52b2x0YWdlKXJlc3VsdC52b2x0YWdlPWJhdHRlcnkudm9sdGFnZTtpZihiYXR0ZXJ5LmN1cnJlbnQpcmVzdWx0LmN1cnJlbnQ9YmF0dGVyeS5jdXJyZW50O2lmKGJhdHRlcnkuYmF0dGVyeVRlbXApcmVzdWx0LmJhdHRlcnlUZW1wPWJhdHRlcnkuYmF0dGVyeVRlbXA7aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJmJhdHRlcnkucmVzaWR1YWxSYW5nZUttKXJlc3VsdC5yZXNpZHVhbFJhbmdlS209YmF0dGVyeS5yZXNpZHVhbFJhbmdlS207aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJnJlc3VsdC5iYXR0ZXJ5UGVyY2VudD4wKXtyZXN1bHQucmVzaWR1YWxSYW5nZUttPU1hdGgucm91bmQocmVzdWx0LmJhdHRlcnlQZXJjZW50KjAuODcpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSDotKblj7fmlbDmja7mi4nlj5YgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbk5vKXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7bGV0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpeeUqOaItyIsdXNlcklkLHNjb3JlOjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjAsdG9kYXlTY29yZTowLHNpZ25Db3VudDowLGxhc3Q3OltdLGVycm9yOm51bGwsdmVoaWNsZTp7aGFzVmVoaWNsZTpmYWxzZX19OwppZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHZlaGljbGVSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9KTtpZih2ZWhpY2xlUmVzLmNvZGU9PSIxMDAwMCImJnZlaGljbGVSZXMuZGF0YSl7Y29uc3QgYXV0b1VpZD1TdHJpbmcodmVoaWNsZVJlcy5kYXRhLnVzZXJJZHx8dmVoaWNsZVJlcy5kYXRhLnVpZHx8dmVoaWNsZVJlcy5kYXRhLmlkfHwiIik7aWYoYXV0b1VpZCl7dXNlcklkPWF1dG9VaWQ7cmVzdWx0LnVzZXJJZD11c2VySWQ7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBpZHg9YWNjb3VudHMuZmluZEluZGV4KGE9PmNsZWFuVG9rZW4oYS50b2tlbik9PT10b2tlbik7aWYoaWR4Pj0wJiYhYWNjb3VudHNbaWR4XS51c2VySWQpe2FjY291bnRzW2lkeF0udXNlcklkPXVzZXJJZDtzYXZlQWNjb3VudHMoYWNjb3VudHMpfX19fWNhdGNoKGUpe319CnRyeXtyZXN1bHQudmVoaWNsZT1hd2FpdCBmZXRjaFZlaGljbGVJbmZvKGFjYyxjZmcsdmluTm8pfWNhdGNoKGUpe3Jlc3VsdC52ZWhpY2xlPXtoYXNWZWhpY2xlOmZhbHNlfX0KdHJ5e2lmKCF1c2VySWQpe3Jlc3VsdC5lcnJvcj0i6K+35Zyo6K6+572u6aG15aGr5YaZ55So5oi3SUQifWVsc2V7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmcvIit1c2VySWQseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkLC4uLnNpZ25IfSk7aWYoaW5mb1Jlcy5jb2RlPT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3Jlc3VsdC5zY29yZT1OdW1iZXIoaW5mb1Jlcy5kYXRhLnNjb3JlfHxpbmZvUmVzLmRhdGEuaW50ZWdyYWx8fGluZm9SZXMuZGF0YS5wb2ludHx8aW5mb1Jlcy5kYXRhLnBvaW50c3x8aW5mb1Jlcy5kYXRhLnRvdGFsU2NvcmV8fGluZm9SZXMuZGF0YS50b3RhbEludGVncmFsfHwwKX1lbHNlIGlmKGluZm9SZXMuY29kZT09IjQwMDAxInx8aW5mb1Jlcy5jb2RlPT00MDEpe3Jlc3VsdC5lcnJvcj0iVG9rZW7lt7Lov4fmnJ8ifWVsc2V7cmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blpLHotKU6ICIrKGluZm9SZXMubWVzc2FnZXx8aW5mb1Jlcy5jb2RlfHwi5pyq55+l6ZSZ6K+vIil9fX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i56ev5YiG6I635Y+W5byC5bi4OiAiK1N0cmluZyhlKX0KdHJ5e2NvbnN0IGN1ck1vbnRoPW5vdy5nZXRGdWxsWWVhcigpKyItIisobm93LmdldE1vbnRoKCkrMSk7Y29uc3QgbGFzdERhdGU9bmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksbm93LmdldE1vbnRoKCktMSwxKTtjb25zdCBsYXN0TW9udGg9bGFzdERhdGUuZ2V0RnVsbFllYXIoKSsiLSIrKGxhc3REYXRlLmdldE1vbnRoKCkrMSk7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBbY3VyUmVzLGxhc3RSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9IitjdXJNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpjdXJNb250aH0sJycsY2ZnKX0pLGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2xhc3RNb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aDpsYXN0TW9udGh9LCcnLGNmZyl9KV0pO2NvbnN0IGxhc3RMaXN0PShsYXN0UmVzLmNvZGU9PSIxMDAwMCImJmxhc3RSZXMuZGF0YSk/KGxhc3RSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgY3VyTGlzdD0oY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKT8oY3VyUmVzLmRhdGEubm93U2lnbkRldGFpbFZvc3x8W10pOltdO2NvbnN0IGxpc3Q9Wy4uLmxhc3RMaXN0LC4uLmN1ckxpc3RdO2lmKGN1clJlcy5jb2RlPT0iMTAwMDAiJiZjdXJSZXMuZGF0YSl7cmVzdWx0LnNpZ25Db3VudD1OdW1iZXIoY3VyUmVzLmRhdGEuc2lnbkNvdW50KXx8MH1jb25zdCB0b2RheUVudHJ5PWN1ckxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25lZFRvZGF5PSEhKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSk7cmVzdWx0LnRvZGF5U2NvcmU9dG9kYXlFbnRyeT8oTnVtYmVyKHRvZGF5RW50cnkuaW50ZWdyYWxTY29yZSl8fDApOjA7dHJ5e2NvbnN0IF90b2RheUxvZ3M9KGdldExvZ3MoKXx8W10pLmZpbHRlcihsPT5sJiZsLmRhdGU9PT10b2RheSYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcodXNlcklkKSYmbC5zdWNjZXNzKTtpZihfdG9kYXlMb2dzLmxlbmd0aD4wKXtjb25zdCBfdGw9X3RvZGF5TG9nc1swXTtyZXN1bHQudG9kYXlTY29yZT1OdW1iZXIoX3RsLnRvdGFsR2Fpbil8fHJlc3VsdC50b2RheVNjb3JlO3Jlc3VsdC50b2RheURldGFpbD17c2lnbmluU2NvcmU6TnVtYmVyKF90bC5zaWduaW5TY29yZSl8fDAsYmxpbmRCb3hTY29yZTpOdW1iZXIoX3RsLmJsaW5kQm94U2NvcmUpfHwwLGludGVyYWN0U2NvcmU6TnVtYmVyKF90bC5pbnRlcmFjdFNjb3JlKXx8MH19fWNhdGNoKGUpe31jb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtpZih0b2RheUlkeD49MCl7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfX1yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Zm9yKGxldCBpPTY7aT49MDtpLS0pe2NvbnN0IGQ9bmV3IERhdGUoKTtkLnNldERhdGUoZC5nZXREYXRlKCktaSk7Y29uc3QgZHM9ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZW50cnk9bGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTtyZXN1bHQubGFzdDcucHVzaCh7ZGF0ZTpkcy5zbGljZSg1KSxzaWduZWQ6ISEoZW50cnkmJihlbnRyeS5zaWduU3RhdHVlPT0zfHxlbnRyeS5zaWduU3RhdHVlPT01fHxlbnRyeS5zaWduU3RhdHVlPT0wKSksaXNUb2RheTppPT09MH0pfX1jYXRjaChlKXtpZighcmVzdWx0LmVycm9yKXJlc3VsdC5lcnJvcj0i562+5Yiw54q25oCB6I635Y+W5aSx6LSlIn0KdHJ5e2NvbnN0IHRva2VuQ2hlY2s9YXdhaXQgY2hlY2tUb2tlbihhY2MsY2ZnKTtyZXN1bHQudG9rZW5WYWxpZD10b2tlbkNoZWNrLnZhbGlkO3Jlc3VsdC50b2tlblJlYXNvbj10b2tlbkNoZWNrLnJlYXNvbnx8bnVsbDtpZih0b2tlbkNoZWNrLnZhbGlkJiZ0b2tlbkNoZWNrLnVzZXJOYW1lJiYoIXJlc3VsdC51c2VyTmFtZXx8cmVzdWx0LnVzZXJOYW1lPT09IuacquefpeeUqOaItyIpKXJlc3VsdC51c2VyTmFtZT10b2tlbkNoZWNrLnVzZXJOYW1lfWNhdGNoKGUpe3Jlc3VsdC50b2tlblZhbGlkPXRydWV9CnJldHVybiByZXN1bHR9CgpmdW5jdGlvbiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhKXtpZighZGF0YSlyZXR1cm4gbnVsbDtpZih0eXBlb2YgZGF0YT09PSJzdHJpbmcifHx0eXBlb2YgZGF0YT09PSJudW1iZXIiKXJldHVybiBTdHJpbmcoZGF0YSk7aWYoQXJyYXkuaXNBcnJheShkYXRhKSlyZXR1cm4gZ2V0UG9zdElkRnJvbURhdGEoZGF0YVswXSk7Y29uc3QgZGlyZWN0PWRhdGEudXVpZHx8ZGF0YS50dXVpZHx8ZGF0YS5wb3N0SWR8fGRhdGEucG9zdGlkfHxkYXRhLmFydGljbGVJZHx8ZGF0YS5hcnRpY2xlSUR8fGRhdGEuaWR8fGRhdGEuZGF0YUlkfHxkYXRhLnRpZDtpZihkaXJlY3QpcmV0dXJuIFN0cmluZyhkaXJlY3QpO2Zvcihjb25zdCBrZXkgb2YgWyJyZWNvcmRzIiwibGlzdCIsInJvd3MiLCJkYXRhIiwicmVzdWx0Il0pe2NvbnN0IHY9ZGF0YVtrZXldO2NvbnN0IHBpZD1nZXRQb3N0SWRGcm9tRGF0YSh2KTtpZihwaWQpcmV0dXJuIHBpZH1yZXR1cm4gbnVsbH0KCi8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjCA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpe2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOmZhbHNlLHNpZ25pblNjb3JlOjAsYmxpbmRCb3hTY29yZTowLGludGVyYWN0U2NvcmU6MCx0b3RhbEdhaW46MCxjb250aW51ZURheXM6MCxlcnJvcjpudWxsLHN0ZXBzOltdfTt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IG1vbnRoPXRvZGF5LnNsaWNlKDAsNyk7CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdG9kYXlFbnRyeT0oaW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKHRvZGF5RW50cnkmJih0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTN8fHRvZGF5RW50cnkuc2lnblN0YXR1ZT09NXx8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT0wKSl7cmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpfWVsc2V7bGV0IHNpZ25SZXM9bnVsbCxzaWduTXNnPSLmnKrnn6UiO2ZvcihsZXQgYXQ9MTthdDw9MzthdCsrKXtzaWduUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHt9LCcnLGNmZyl9LHt9KTtpZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKWJyZWFrO3NpZ25Nc2c9c2lnblJlcz8ubWVzc2FnZXx8IuacquefpSI7aWYoL+ivt+eojXznqI3lkI5856iN5YCZfOmikee5gXznuYHlv5l86YeN6K+VLy50ZXN0KHNpZ25Nc2cpJiZhdDwzKXthd2FpdCBuZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsKGF0KzEpKjIwMDApKTtjb250aW51ZX1icmVha31pZihzaWduUmVzPy5jb2RlPT0iMTAwMDAiKXtjb25zdCBpbmZvUmVzMj1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRlPShpbmZvUmVzMj8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO3Jlc3VsdC5zaWduaW5TY29yZT10ZT8oTnVtYmVyKHRlLmludGVncmFsU2NvcmUpfHwwKTowO3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDmiJDlip8gKyIrcmVzdWx0LnNpZ25pblNjb3JlKX1lbHNle3RyeXtjb25zdCBjaGs9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBjZT0oY2hrPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYoY2UmJihjZS5zaWduU3RhdHVlPT0zfHxjZS5zaWduU3RhdHVlPT01fHxjZS5zaWduU3RhdHVlPT0wKSlyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIik7ZWxzZSByZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9fX0KfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlvILluLg6ICIrZSl9CnRyeXtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgbGlzdD1pbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXTtjb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2NvbnN0IHNpZ25Db3VudD1OdW1iZXIoaW5mb1Jlcz8uZGF0YT8uc2lnbkNvdW50KXx8MDtpZihzaWduQ291bnQ+PTMwKXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL3N1cHBsZW1lbnRQcml6ZT9zdXBwbGVtZW50RGF0ZT0iK3RvZGF5LHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse3N1cHBsZW1lbnREYXRlOnRvZGF5fSwnJyxjZmcpfSk7aWYoYmxpbmRSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5ibGluZEJveFNjb3JlPU51bWJlcihibGluZFJlcz8uZGF0YT8uaW50ZWdyYWx8fGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbFNjb3JlfHwwKTtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS6I635b6XICsiK3Jlc3VsdC5ibGluZEJveFNjb3JlKyIgKCIrKGJsaW5kUmVzPy5kYXRhPy5wcml6ZXNOYW1lfHwi56ev5YiGIikrIikiKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq6Kej6ZSBKCIrc2lnbkNvdW50KyIvMzApIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LlvILluLg6ICIrZSl9CmNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eXx8e307bGV0IHBvc3RJZD1udWxsOwppZihjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSl7dHJ5e2NvbnN0IHBvc3RSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3Rjb250ZW50OiLlvIDlv4PnmoTkuIDlpKkifSk7aWYocG9zdFJlcz8uY29kZT09IjEwMDAwIil7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKHBvc3RSZXMuZGF0YSk7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5byC5bi4OiAiK2UpfX0KaWYoIXBvc3RJZCl7dHJ5e2NvbnN0IGxpc3RSZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tdW5pdHkvbWluZUFydGljbGVJbmZvP3VzZXJJZD0iK3VzZXJJZCsiJnBhZ2U9MSZwYWdlU2l6ZT0xMCIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2NvbnN0IHJhd0xpc3Q9QXJyYXkuaXNBcnJheShsaXN0UmVzPy5kYXRhKT9saXN0UmVzLmRhdGE6KGxpc3RSZXM/LmRhdGE/LnJlY29yZHN8fGxpc3RSZXM/LmRhdGE/Lmxpc3R8fFtdKTtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmF3TGlzdCk/cmF3TGlzdDpbXTtjb25zdCBtaW5lPWxpc3QuZmluZChpdD0+U3RyaW5nKGl0LnVzZXJJZHx8aXQuY3JlYXRlQnl8fGl0LnVpZHx8IiIpPT09U3RyaW5nKHVzZXJJZCkpO3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShtaW5lfHxsaXN0WzBdfHxsaXN0UmVzPy5kYXRhKX1jYXRjaChlKXt9fQppZihwb3N0SWQpe2lmKGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKXt0cnl7Y29uc3QgbGlrZVJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9zb2NpYWxDb21tdS9saWtlRmF2b3JpdGVJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdElkOlN0cmluZyhwb3N0SWQpLGtpbmRGbGFnOiIwIn0pO2lmKGxpa2VSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7miJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVDb21tZW50IT09ZmFsc2Upe3RyeXthd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tZW50SW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RpZDpTdHJpbmcocG9zdElkKSx1c2VySWQ6U3RyaW5nKHVzZXJJZCksY29tbWVudHM6IuWOieWusyIsc2VuZFRvczoiW1xuXG5dIn0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlrozmiJAiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZVNoYXJlIT09ZmFsc2Upe3RyeXtjb25zdCBzaGFyZVJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2FydGljbGUvc2hhcmUvIitwb3N0SWQsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO2lmKHNoYXJlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5oiQ5YqfICsxIil9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2ludGVncmFsL2FkanVzdEJ5U2hhcmUiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5YiG5Lqr5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlJiZwb3N0SWQpe3RyeXthd2FpdCBodHRwRGVsZXRlKCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1vbkFydGljbGUvZGVsZXRlQXJ0aWNsZT9hcnRpY2xlSWQ9Iitwb3N0SWQrIiZwb3N0VHlwZT0xIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7cmVzdWx0LnN0ZXBzLnB1c2goIuWKqOaAgeW3suWIoOmZpCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliKDpmaTlvILluLg6ICIrZSl9fX0KcmVzdWx0LnRvdGFsR2Fpbj1yZXN1bHQuc2lnbmluU2NvcmUrcmVzdWx0LmJsaW5kQm94U2NvcmUrcmVzdWx0LmludGVyYWN0U2NvcmU7cmVzdWx0LnN1Y2Nlc3M9dHJ1ZX1jYXRjaChlKXtyZXN1bHQuZXJyb3I9U3RyaW5nKGUpO3Jlc3VsdC5zdGVwcy5wdXNoKCLmiafooYzlvILluLg6ICIrZSl9cmV0dXJuIHJlc3VsdH0KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBWRUhJQ0xFX0FDVElPTl9URVhUPXtmaW5kOiLnn63mjInlr7vovaYiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga8iLGN1c2hpb246IuaJk+W8gOWdkOWeqyIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9OwpmdW5jdGlvbiB2ZWhpY2xlQ2hlY2tSZXMocmVzLG9rTXNnKXtpZihyZXMmJiFyZXMuZXJyb3ImJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZ307Y29uc3QgZXJyVGV4dD1TdHJpbmcoKHJlcyYmKHJlcy5lcnJvcnx8cmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IiIpLnRvTG93ZXJDYXNlKCk7aWYocmVzJiZyZXMuZXJyb3ImJi90aW1lb3V0fHRpbWVkIG91dHx0aW1lIG91dHzor7fmsYLotoXml7YvLnRlc3QoZXJyVGV4dCkpcmV0dXJue29rOnRydWUsbWVzc2FnZTpva01zZysi77yI5ZON5bqU6LaF5pe25L2G6L2m6L6G6YCa5bi45bey5omn6KGM77yM5Y+v5LiL5ouJ5Yi35paw56Gu6K6k77yJIn07cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6KHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fChyZXMmJnJlcy5lcnJvcil8fCLmjIfku6TkuIvlj5HlpLHotKUiLGNvZGU6cmVzJiZyZXMuY29kZX19CmFzeW5jIGZ1bmN0aW9uIHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKXt0cnl7Y29uc3QgYz1jZmd8fGdldENmZygpO2xldCB2aW49YWNjLnZpbk5vfHwiIjtpZighdmluKXtjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGMpO2lmKCFsaXN0fHwhbGlzdC5sZW5ndGgpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquiOt+WPluWIsOe7keWumui9pui+hihWSU4p77yM6K+356Gu6K6k6LSm5Y+35bey57uR5a6a6L2m6L6GIn07dmluPWxpc3RbMF0udmluTm99Y29uc3QgYmFzZT1iYXNlSGVhZGVycyhhY2MpO2lmKGFjdGlvbj09PSJmaW5kIil7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LCIiLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sLyIrdmluLGgpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlr7vovabmjIfku6Tlt7LkuIvlj5HvvIzovabovoblupTpl6rnga/mj5DnpLoiKX1pZihhY3Rpb249PT0ibG91ZEZpbmQiKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtwYXJhbToiNCIsdmluOnZpbn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbFYyIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLpuKPnrJvpl6rnga/mjIfku6Tlt7LkuIvlj5EiKX1pZihhY3Rpb249PT0iY3VzaGlvbiIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe2NvbW1vbmQ6IjI4Iixjb21tb25kUGFyYW06IjEiLHZjdTp2aW4sdmVyc2lvbjoidjIifSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvcHJvcGVydHlUd28vb25lIixoLGJvZHlTdHIpO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLCLlvIDlnZDlnqvmjIfku6Tlt7LkuIvlj5HvvIzlnZDlnqvlupTlvLnotbciKX1pZihhY3Rpb249PT0idW5sb2NrInx8YWN0aW9uPT09ImxvY2siKXtjb25zdCB2S2V5PShjLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCk7aWYoIXZLZXkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuWwmuacqumFjee9ruS6keerr+aOp+i9puWvhumSpe+8muivt+WIsOOAjOiuvue9ri3nrb7lkI3lr4bpkqXphY3nva7jgI3loavlhpnkupHnq6/mjqfovaZBRVPlr4bpkqXlubbkv53lrZjlkI7lho3kvb/nlKjlvIAv5YWz6ZSBIn07aWYoIS9eWzAtOWEtZkEtRl17MzJ9JC8udGVzdCh2S2V5KSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5LqR56uv5o6n6L2m5a+G6ZKl5qC85byP6ZSZ6K+v77yI5bqU5Li6MzLkvY3ljYHlha3ov5vliLbvvInvvIzor7fliLDorr7nva7pobXmoLjlr7nlkI7kv53lrZgifTtjb25zdCBsb2NrRmxhZz1hY3Rpb249PT0idW5sb2NrIj8iMSI6IjAiO2NvbnN0IHBsYWluPSd7XG4gICJsb2NrRmxhZyIgOiAiJytsb2NrRmxhZysnIixcbiAgInZpbk5vIiA6ICInK3ZpbisnIlxufSc7Y29uc3Qgc2VjcmV0PWFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW4sdktleSk7Y29uc3Qgc2VuZEJvZHk9SlNPTi5zdHJpbmdpZnkoe3NlY3JldDpzZWNyZXR9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30scGxhaW4sYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L25ldHdvcmsvdW5sb2NrIixoLHNlbmRCb2R5LDI1MDAwKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcyxhY3Rpb249PT0idW5sb2NrIj8i5LqR56uv5byA6ZSB5oyH5Luk5bey5LiL5Y+RIjoi5LqR56uv5YWz6ZSB5oyH5Luk5bey5LiL5Y+RIil9cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquefpeaTjeS9nOexu+WeizogIithY3Rpb259fWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxtZXNzYWdlOiLmjqfliLblvILluLg6ICIrU3RyaW5nKGUpfX19Cgphc3luYyBmdW5jdGlvbiBiYXJrUHVzaChiYXJrS2V5LHRpdGxlLGJvZHkpe3RyeXtsZXQgcz1TdHJpbmcoYmFya0tleXx8IiIpLnRyaW0oKS5yZXBsYWNlKC9cLyskLywiIik7cz1zLnJlcGxhY2UoL15odHRwcz86XC9cL2FwaVwuZGF5XC5hcHBcLy9pLCIiKTtpZighcylyZXR1cm57c2tpcHBlZDp0cnVlfTtsZXQgYmFzZT0iaHR0cHM6Ly9hcGkuZGF5LmFwcCIsa2V5PXM7Y29uc3QgbT1zLm1hdGNoKC9eKGh0dHBzPzpcL1wvW14vXSspXC8oLispJC9pKTtpZihtKXtiYXNlPW1bMV07a2V5PW1bMl19a2V5PWtleS5yZXBsYWNlKC9eXC8rLywiIik7Y29uc3QgdT1iYXNlKyIvIitlbmNvZGVVUklDb21wb25lbnQoa2V5KSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGJvZHkpKyI/Z3JvdXA9WkVFSE8mc291bmQ9YmlyZHNvbmciO3JldHVybiBhd2FpdCBodHRwR2V0KHUse30pfWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoZSl9fX0KCi8qID09PT09PT09PT09PT09PT09IOS7o+eQhuaooeW8j++8iOaMh+WQkeWOn+iEmuacrCB6ZWVoby5ib3gg5ZCO56uv77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHByb3h5RmV0Y2gocGF0aCxvcHRzKXtjb25zdCByYXdCYXNlPWdldENmZygpLnNlcnZlckJhc2UucmVwbGFjZSgvXC8rJC8sIiIpO2NvbnN0IGJhc2U9KHdpbmRvdy5fX1BBTkVMX01PREVfXyYmIXJhd0Jhc2UpPyIiOnJhd0Jhc2U7Y29uc3Qgcj1hd2FpdCBmZXRjaChiYXNlK3BhdGgsb3B0c3x8e30pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19CmZ1bmN0aW9uIHByb3h5UG9zdChwYXRoLGJvZHkpe3JldHVybiBwcm94eUZldGNoKHBhdGgse21ldGhvZDoiUE9TVCIsaGVhZGVyczp7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb24ifSxib2R5OkpTT04uc3RyaW5naWZ5KGJvZHl8fHt9KX0pfQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsbGltaXQpe2NvbnN0IG91dD1uZXcgQXJyYXkoYWNjb3VudHMubGVuZ3RoKTtsZXQgaT0wO2FzeW5jIGZ1bmN0aW9uIHdvcmtlcigpe3doaWxlKGk8YWNjb3VudHMubGVuZ3RoKXtjb25zdCBpZHg9aSsrO3RyeXtvdXRbaWR4XT1hd2FpdCBmZXRjaEFjY291bnREYXRhKGFjY291bnRzW2lkeF0sY2ZnKX1jYXRjaChlKXtvdXRbaWR4XT17dXNlck5hbWU6YWNjb3VudHNbaWR4XS51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjY291bnRzW2lkeF0udXNlcklkLHN1Y2Nlc3M6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX19fWNvbnN0IG49TWF0aC5tYXgoMSxNYXRoLm1pbihsaW1pdHx8MyxhY2NvdW50cy5sZW5ndGgpKTthd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKHtsZW5ndGg6bn0sd29ya2VyKSk7cmV0dXJuIG91dH0KCmNvbnN0IEJhY2tlbmQ9ewogIGFzeW5jIHNlbmRDb2RlKHBob25lKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NlbmQtY29kZSIse3Bob25lOnBob25lfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IumqjOivgeeggeW3suWPkemAgSI6IuWPkemAgeWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvYXV0aENvZGUvIitlbmNvZGVVUklDb21wb25lbnQocGhvbmUpOwogICAgY29uc3QgZD1hd2FpdCBodHRwR2V0KHVybCx7IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiR0VUIix7fSwiIixjZmcpfSk7CiAgICByZXR1cm57b2s6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiLG1lc3NhZ2U6U3RyaW5nKGQuY29kZSk9PT0iMTAwMDAiPyLpqozor4HnoIHlt7Llj5HpgIHvvIzor7fmn6XmlLbnn63kv6EiOigoZCYmKGQubWVzc2FnZXx8ZC5tc2cpKXx8IuWPkemAgeWksei0pSIpfTsKICB9LAogIGFzeW5jIHBob25lTG9naW4ocGhvbmUsY29kZSxiYXNpY0F1dGgpewogICAgY29uc3QgYmFzaWM9U3RyaW5nKGJhc2ljQXV0aHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eQmFzaWNccysvaSwiIik7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9waG9uZS1sb2dpbiIse3Bob25lOnBob25lLGNvZGU6Y29kZSxiYXNpY0F1dGg6YmFzaWN9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i55m75b2V5oiQ5YqfIjoi55m75b2V5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBwYXlsb2FkPXtwaG9uZTpwaG9uZSxhdXRoQ29kZTpjb2RlfTsKICAgIGNvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3VzZXIvbG9naW5CeVBob25lIjsKICAgIGNvbnN0IGhkcj17IkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsIlVzZXItQWdlbnQiOiJva2h0dHAvNC45LjIiLC4uLmFwcEdhdGV3YXlTaWduKHVybCwiUE9TVCIse30scGF5bG9hZCxjZmcpfTsKICAgIGlmKGJhc2ljKWhkclsiQXV0aG9yaXphdGlvbiJdPSJCYXNpYyAiK2Jhc2ljOwogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KHVybCxoZHIscGF5bG9hZCwyMDAwMCk7CiAgICBjb25zdCB0b2tlbkluZm89cmVzJiZyZXMuZGF0YSYmcmVzLmRhdGEudG9rZW5JbmZvO2NvbnN0IGFjY2Vzc1Rva2VuPXRva2VuSW5mbyYmU3RyaW5nKHRva2VuSW5mby5hY2Nlc3NfdG9rZW58fCIiKTsKICAgIGlmKCFyZXN8fFN0cmluZyhyZXMuY29kZSkhPT0iMTAwMDAifHwhYWNjZXNzVG9rZW4pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IueZu+W9leWksei0pe+8miIrKChyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwi6aqM6K+B56CB5pyJ6K+v5oiW5bey6L+H5pyfIil9OwogICAgbGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIjsKICAgIHRyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwiIixjZmcpO2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIithY2Nlc3NUb2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IMH0pO2lmKGluZm9SZXMmJlN0cmluZyhpbmZvUmVzLmNvZGUpPT09IjEwMDAwIiYmaW5mb1Jlcy5kYXRhKXt1c2VySWQ9U3RyaW5nKGluZm9SZXMuZGF0YS5pZHx8IiIpO3VzZXJOYW1lPVN0cmluZyhpbmZvUmVzLmRhdGEubmlja05hbWV8fCIiKTt9fWNhdGNoKGUpe30KICAgIGNvbnN0IGxpc3Q9Z2V0QWNjb3VudHMoKTtsZXQgcmVwbGFjZWQ9ZmFsc2U7CiAgICBmb3IobGV0IGk9MDtpPGxpc3QubGVuZ3RoO2krKyl7aWYobGlzdFtpXSYmKFN0cmluZyhsaXN0W2ldLnRva2VufHwiIik9PT1hY2Nlc3NUb2tlbnx8KGxpc3RbaV0udXNlcklkJiZ1c2VySWQmJlN0cmluZyhsaXN0W2ldLnVzZXJJZCk9PT11c2VySWQpKSl7bGlzdFtpXS50b2tlbj1hY2Nlc3NUb2tlbjtpZih1c2VySWQpbGlzdFtpXS51c2VySWQ9dXNlcklkO2lmKHVzZXJOYW1lKWxpc3RbaV0udXNlck5hbWU9dXNlck5hbWU7cmVwbGFjZWQ9dHJ1ZTticmVhazt9fQogICAgY29uc3QgbmV3QWNjPXt1c2VyTmFtZTp1c2VyTmFtZXx8cGhvbmUsdXNlcklkOnVzZXJJZCx0b2tlbjphY2Nlc3NUb2tlbixiYXJrS2V5OiIiLHVzZXJBZ2VudDoiIn07CiAgICBpZighcmVwbGFjZWQpbGlzdC5wdXNoKG5ld0FjYyk7CiAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICByZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOnJlcGxhY2VkPyLnmbvlvZXmiJDlip/vvIzlt7Lmm7TmlrDor6XotKblj7ciOiLnmbvlvZXmiJDlip/vvIzlt7Lmt7vliqDotKblj7cifTsKICB9LAogIGFzeW5jIGdldERhc2hib2FyZCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9kYXRhIik7CiAgICAgIGlmKGQmJmQuYWNjb3VudHMpcmV0dXJue2FjY291bnRzOmQuYWNjb3VudHMsdGltZXN0YW1wOmQudGltZXN0YW1wfHxuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksY29uZmlnOmQuY29uZmlnfHxudWxsLG9rOnRydWV9OwogICAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5Luj55CG5pyN5Yqh5peg5ZON5bqUIixyYXc6ZH07CiAgICB9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCBkYXRhPWF3YWl0IGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLDMpOwogICAgcmV0dXJue2FjY291bnRzOmRhdGEsdGltZXN0YW1wOm5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxvazp0cnVlfTsKICB9LAogIGFzeW5jIHJ1blNpZ25pbih1c2VySWQsYWxsKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3J1bi1zaWduaW4iLGFsbD97YWxsOnRydWV9Ont1c2VySWQ6dXNlcklkfSk7aWYoZCYmZC5yZXN1bHRzKXJldHVybntvazp0cnVlLHJlc3VsdHM6ZC5yZXN1bHRzfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi5omn6KGM5aSx6LSlIn19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtjb25zdCByZXN1bHRzPVtdO2NvbnN0IHRhcmdldHM9YWxsP2FjY291bnRzOmFjY291bnRzLmZpbHRlcihhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpOwogICAgaWYoIXRhcmdldHMubGVuZ3RoKXJldHVybntvazp0cnVlLHJlc3VsdHM6W119OwogICAgZm9yKGNvbnN0IGFjYyBvZiB0YXJnZXRzKXtjb25zdCByPWF3YWl0IHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyk7cmVzdWx0cy5wdXNoKHIpO2NvbnN0IF9kPW5ldyBEYXRlKCk7Y29uc3QgX2RzPV9kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF9kLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl9kcyx0eXBlOiJzaWduaW4iLHVzZXJOYW1lOnIudXNlck5hbWUsdXNlcklkOnIudXNlcklkLHN1Y2Nlc3M6ci5zdWNjZXNzLHRvdGFsR2FpbjpyLnRvdGFsR2FpbixzaWduaW5TY29yZTpyLnNpZ25pblNjb3JlLGJsaW5kQm94U2NvcmU6ci5ibGluZEJveFNjb3JlLGludGVyYWN0U2NvcmU6ci5pbnRlcmFjdFNjb3JlLGNvbnRpbnVlRGF5czpyLmNvbnRpbnVlRGF5cyxlcnJvcjpyLmVycm9yLHN0ZXBzOnIuc3RlcHN9KTtpZihyLnN1Y2Nlc3MmJmFjYy5iYXJrS2V5JiZTdHJpbmcoYWNjLmJhcmtLZXkpLnRyaW0oKSl7dHJ5e2F3YWl0IGJhcmtQdXNoKGFjYy5iYXJrS2V5LCLmnoHmoLjnrb7liLDmiJDlip8gwrcgIisoci51c2VyTmFtZXx8IiIpLCLku4rml6XojrflvpcgIityLnRvdGFsR2FpbisiIOWIhu+8iOetvuWIsCIrci5zaWduaW5TY29yZSsiIC8g55uy55uSIityLmJsaW5kQm94U2NvcmUrIiAvIOS6kuWKqCIrci5pbnRlcmFjdFNjb3JlKyLvvInvvIzov57nrb4gIityLmNvbnRpbnVlRGF5cysiIOWkqSIpfWNhdGNoKGUpe319fQogICAgcmV0dXJue29rOnRydWUscmVzdWx0c307CiAgfSwKICBhc3luYyB2ZWhpY2xlQ3RybCh1c2VySWQsYWN0aW9uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbCIse3VzZXJJZDp1c2VySWQsYWN0aW9uOmFjdGlvbn0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLmjIfku6Tlt7LkuIvlj5EiOiLmjIfku6TlpLHotKUiKX19CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjb3VudHM9Z2V0QWNjb3VudHMoKTtsZXQgYWNjPWFjY291bnRzLmZpbmQoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTtpZighYWNjJiZhY2NvdW50cy5sZW5ndGgpYWNjPWFjY291bnRzWzBdO2lmKCFhY2MpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuacquaJvuWIsOi0puWPt++8jOivt+WFiOWcqOiuvue9rumhtea3u+WKoCJ9O2lmKCFWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl0pcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IumdnuazleaTjeS9nOexu+WeiyJ9O2NvbnN0IHI9YXdhaXQgdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpO2NvbnN0IF92ZD1uZXcgRGF0ZSgpO2NvbnN0IF92ZHM9X3ZkLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfdmQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfdmQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl92ZC50b0xvY2FsZVN0cmluZygiemgtQ04iLHtob3VyMTI6ZmFsc2V9KSxkYXRlOl92ZHMsdHlwZToidmVoaWNsZSIsYWN0aW9uOmFjdGlvbixhY3Rpb25UZXh0OlZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXXx8Iui9pui+huaOp+WItiIsdXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjLnVzZXJJZCxzdWNjZXNzOiEhci5vayxtZXNzYWdlOnIubWVzc2FnZXx8IiIsZXJyb3I6ci5vaz8iIjooci5tZXNzYWdlfHwi5oyH5Luk5aSx6LSlIil9KTtyZXR1cm4gcjsKICB9LAogIGFzeW5jIGdldExvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZ2V0LWxvZ3MiKTtyZXR1cm4gZCYmZC5sb2dzP2QubG9nczpbXX1yZXR1cm4gZ2V0TG9ncygpfSwKICBhc3luYyBjbGVhckxvZ3MoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9jbGVhci1sb2dzIik7cmV0dXJuICEhZC5va31yZXR1cm4gY2xlYXJMb2dzKCl9LAogIGFzeW5jIHNhdmVDb25maWcoYyl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1jb25maWciLGMpO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVDZmcoYyl9LAogIGFzeW5jIHNhdmVBY2NvdW50cyhsaXN0KXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWFjY291bnRzIix7YWNjb3VudHM6bGlzdH0pO3JldHVybiAhIWQub2t9cmV0dXJuIHNhdmVBY2NvdW50cyhsaXN0KX0sCiAgYXN5bmMgZ2V0VXNlcmlkKHRva2VuKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9nZXQtdXNlcmlkIix7dG9rZW46dG9rZW59KTtyZXR1cm57b2s6ISFkLm9rLHVzZXJJZDpkLnVzZXJJZHx8IiIsdXNlck5hbWU6ZC51c2VyTmFtZXx8IiIsZXJyb3I6ZC5lcnJvcnx8IiJ9fXJldHVybiBnZXRVc2VyaWRCeVRva2VuKHRva2VuLGdldENmZygpKX0sCiAgYXN5bmMgZ2V0Q29uZmlnKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2NvbmZpZyIpO2lmKGQmJmQuY29uZmlnKXJldHVybntvazp0cnVlLGNvbmZpZzpkLmNvbmZpZ307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuiOt+WPlumFjee9ruWksei0pSJ9fXJldHVybntvazp0cnVlLGNvbmZpZzpnZXRDZmcoKX19LAogIGFzeW5jIGdldEFjY291bnRzRnVsbCgpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9hY2NvdW50cyIpO3JldHVybiBBcnJheS5pc0FycmF5KGQmJmQuYWNjb3VudHMpP2QuYWNjb3VudHM6W119cmV0dXJuIGdldEFjY291bnRzKCl9LAogIGFzeW5jIGJhY2t1cCgpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2JhY2t1cCIpO3JldHVybiBkJiZkLm9rP2Q6bnVsbH0KICAgIHJldHVybntvazp0cnVlLGFwcDoi5p6B5qC4WkVFSE8iLHR5cGU6InplZWhvX2JhY2t1cCIsdmVyc2lvbjpBUFBfVkVSU0lPTix0aW1lOmZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxhY2NvdW50czpnZXRBY2NvdW50cygpLGNvbmZpZzpnZXRDZmcoKX0KICB9LAogIGFzeW5jIHJlc3RvcmVCYWNrdXAoanNvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9pbXBvcnQiLHtqc29uOmpzb259KTtyZXR1cm4gZHx8e29rOmZhbHNlLGVycm9yOiLlkI7nq6/ml6Dlk43lupQifX0KICAgIHRyeXsKICAgICAgY29uc3QgYj10eXBlb2YganNvbj09PSJzdHJpbmciP0pTT04ucGFyc2UoanNvbik6anNvbjsKICAgICAgaWYoIWJ8fChiLnR5cGUhPT0iemVlaG9fYmFja3VwIiYmIUFycmF5LmlzQXJyYXkoYi5hY2NvdW50cykpKXJldHVybntvazpmYWxzZSxlcnJvcjoi5aSH5Lu95qC85byP5LiN5q2j56GuIn07CiAgICAgIGNvbnN0IGxpc3Q9KGIuYWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5fHwiIiksdXNlckFnZW50OmEudXNlckFnZW50fHwiIn0pKTsKICAgICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgICBpZihiLmNvbmZpZyYmdHlwZW9mIGIuY29uZmlnPT09Im9iamVjdCIpewogICAgICAgIGNvbnN0IGN1cj1nZXRDZmcoKTsKICAgICAgICBzYXZlQ2ZnKHsKICAgICAgICAgIGFwcDp7YXBwSWQ6Yi5jb25maWcuYXBwPy5hcHBJZHx8Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuYXBwPy5hcHBTZWNyZXR8fGN1ci5hcHAuYXBwU2VjcmV0fSwKICAgICAgICAgIGg1OnthcHBJZDpiLmNvbmZpZy5oNT8uYXBwSWR8fGN1ci5oNS5hcHBJZCxhcHBTZWNyZXQ6Yi5jb25maWcuaDU/LmFwcFNlY3JldHx8Y3VyLmg1LmFwcFNlY3JldH0sCiAgICAgICAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUxpa2UhPT1mYWxzZSxlbmFibGVDb21tZW50OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVEZWxldGUhPT1mYWxzZX0sCiAgICAgICAgICB2ZWhpY2xlQWVzS2V5OlN0cmluZyhiLmNvbmZpZy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpLAogICAgICAgICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhiLmNvbmZpZy5hdXRvUmVmcmVzaFNlYyksCiAgICAgICAgICBzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlCiAgICAgICAgfSk7CiAgICAgIH0KICAgICAgcmV0dXJue29rOnRydWUsY291bnQ6bGlzdC5sZW5ndGh9OwogICAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQogIH0sCiAgLyogLS0tLSB2Mi4xNC45IOaWsOWinuWQjuerr+iDveWKm++8iOS7heS7o+eQhuaooeW8j++8iSAtLS0tICovCiAgYXN5bmMgaW50ZWdyYWwodXNlcklkLHBhZ2UpewogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvaW50ZWdyYWw/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iuenr+WIhuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHN1cHBsZW1lbnQoYWN0aW9uLHVzZXJJZCxwYXJhbXMpewogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGxldCBxPSIvYXBpL3N1cHBsZW1lbnQ/YWN0aW9uPSIrZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbikrIiZ1c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7CiAgICAgIHBhcmFtcz1wYXJhbXN8fHt9O09iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrPT57cSs9IiYiK2VuY29kZVVSSUNvbXBvbmVudChrKSsiPSIrZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1trXSl9KTsKICAgICAgcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSkKICAgIH0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6KGl562+5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgdmVoaWNsZU1vbml0b3IodXNlcklkLHZpbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtsZXQgcT0iL2FwaS92ZWhpY2xlLW1vbml0b3I/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLovabovobnm5Hmjqfku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgdmVoaWNsZUNvbnRyb2xFeHQoYm9keSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbC1leHQiLGJvZHkpfQogICAgcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6Iui9puaOp+aJqeWxleS7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBpbmZvQ2VudGVyKHVzZXJJZCx2aW4pewogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvaW5mby1jZW50ZXI/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLkv6Hmga/kuK3lv4Pku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0KfTsKLyogPT09PT09PT09PT09PT09PT0g6Z2i5p2/5pWw5o2u5ZCM5q2l77yI6Z2i5p2/5qih5byP77ya6K6+572u6aG15LuO6ISa5pys5ZCO56uv6K+76LSm5Y+35LiO6YWN572u77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5UmVtb3RlQ2ZnKGMpewogIGlmKCFjfHx0eXBlb2YgYyE9PSJvYmplY3QiKXJldHVybjsKICBjb25zdCBsb2NhbD1nZXRDZmcoKTsKICBzYXZlQ2ZnKHsKICAgIGFwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxsb2NhbC5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fGxvY2FsLmFwcC5hcHBTZWNyZXR9LAogICAgaDU6e2FwcElkOmMuaDU/LmFwcElkfHxsb2NhbC5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxsb2NhbC5oNS5hcHBTZWNyZXR9LAogICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKSwKICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksCiAgICBzZXJ2ZXJCYXNlOmxvY2FsLnNlcnZlckJhc2UsCiAgICBhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsCiAgICBhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLAogICAgdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUKICB9KTsKfQpsZXQgcGFuZWxTeW5jaW5nPWZhbHNlOwphc3luYyBmdW5jdGlvbiBlbnN1cmVQYW5lbERhdGEoZm9yY2UpewogIGlmKCFpc1Byb3h5TW9kZSgpfHxsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXJldHVybjsKICBpZihwYW5lbFN5bmNpbmcpcmV0dXJuOwogIGlmKCFmb3JjZSYmU1RBVEUucGFuZWxMb2FkZWQpcmV0dXJuOwogIHBhbmVsU3luY2luZz10cnVlOwogIHRyeXsKICAgIGNvbnN0IFtjLGFdPWF3YWl0IFByb21pc2UuYWxsKFtCYWNrZW5kLmdldENvbmZpZygpLEJhY2tlbmQuZ2V0QWNjb3VudHNGdWxsKCldKTsKICAgIGlmKGEmJmEubGVuZ3RoKXtTVEFURS5wYW5lbEFjY291bnRzPWF9CiAgICBpZihjJiZjLm9rJiZjLmNvbmZpZylhcHBseVJlbW90ZUNmZyhjLmNvbmZpZyk7CiAgICBTVEFURS5wYW5lbExvYWRlZD10cnVlOwogIH1jYXRjaChlKXt9CiAgcGFuZWxTeW5jaW5nPWZhbHNlOwp9Ci8qID09PT09PT09PT09PT09PT09IOWbvuaghyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBJPXsKY2hlY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDYgOSAxN2wtNS01Ii8+PC9zdmc+JywKeDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPicsCnphcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDggMHY0Ii8+PC9zdmc+JywKdW5sb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgNy41LTEuNyIvPjwvc3ZnPicsCmJlbGw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE4IDhhNiA2IDAgMSAwLTEyIDBjMCA3LTMgOS0zIDloMThzLTMtMi0zLTkiLz48cGF0aCBkPSJNMTMuNyAyMWEyIDIgMCAwIDEtMy40IDAiLz48L3N2Zz4nLAp2b2w6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTExIDUgNiA5SDJ2Nmg0bDUgNFY1eiIvPjxwYXRoIGQ9Ik0xNS41IDguNWE1IDUgMCAwIDEgMCA3TTE4LjUgNS41YTkgOSAwIDAgMSAwIDEzIi8+PC9zdmc+JywKc2VhdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA0aDE0djdhNCA0IDAgMCAxLTQgNEg5YTQgNCAwIDAgMS00LTRWNHoiLz48cGF0aCBkPSJNOSAxNXY1aDZ2LTUiLz48L3N2Zz4nLApwaW46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYzAgNi04IDEyLTggMTJzLTgtNi04LTEyYTggOCAwIDAgMSAxNiAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4nLAp0aXJlOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMy41Ii8+PHBhdGggZD0iTTEyIDN2NS41TTEyIDE1LjVWMjFNMyAxMmg1LjVNMTUuNSAxMkgyMSIvPjwvc3ZnPicsCmJvbHQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCnRoZXJtbzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMTQuNzZWNWEyIDIgMCAxIDAtNCAwdjkuNzZhNCA0IDAgMSAwIDQgMHoiLz48L3N2Zz4nLApjYWw6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMyIvPjxwYXRoIGQ9Ik0xNiAydjRNOCAydjRNMyAxMGgxOCIvPjwvc3ZnPicsCmNhcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMyA2LjUgNy41QTIgMiAwIDAgMSA4LjQgNmg3LjJhMiAyIDAgMCAxIDEuOSAxLjVMMTkgMTMiLz48cGF0aCBkPSJNNCAxM2gxNmExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxLTEgMWgtMWEyIDIgMCAxIDEtNCAwSDlhMiAyIDAgMSAxLTQgMEg0YTEgMSAwIDAgMS0xLTF2LTNhMSAxIDAgMCAxIDEtMXoiLz48L3N2Zz4nLApzY29vdGVyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPicsCnBsdWc6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMnY2TTE1IDJ2Nk03IDhoMTB2NGE1IDUgMCAwIDEtMTAgMFY4ek0xMiAxN3Y1Ii8+PC9zdmc+JywKY2xvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxwYXRoIGQ9Ik0xMiA3djVsMyAzIi8+PC9zdmc+JywKd2lmaTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSAxMi41YTEwIDEwIDAgMCAxIDE0IDBNOC41IDE2YTUgNSAwIDAgMSA3IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4nLAphbGVydDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOXY0TTEyIDE3aC4wMSIvPjxwYXRoIGQ9Ik0xMC4zIDMuOSAxLjggMThhMiAyIDAgMCAwIDEuNyAzaDE3YTIgMiAwIDAgMCAxLjctM0wxMy43IDMuOWEyIDIgMCAwIDAtMy40IDB6Ii8+PC9zdmc+JywKd2FybjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMyAyIDIxaDIwTDEyIDN6Ii8+PHBhdGggZD0iTTEyIDEwdjVNMTIgMThoLjAxIi8+PC9zdmc+JywKa3Y6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE0IiByeD0iMyIvPjxwYXRoIGQ9Ik03IDloM00xNCAxNWgzTTEwIDloLjAxTTE3IDE1aC4wMSIvPjwvc3ZnPicsCmtleTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI4IiBjeT0iMTUiIHI9IjQuNSIvPjxwYXRoIGQ9Ik0xMS4yIDExLjggMjAgM00xNiA3bDMgM00xMyAxMGwyIDIiLz48L3N2Zz4nLAp1c2VyczonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI5IiBjeT0iOCIgcj0iNCIvPjxwYXRoIGQ9Ik0yIDIxYTcgNyAwIDAgMSAxNCAwTTE2IDQuNmE0IDQgMCAwIDEgMCA2LjhNMTkgMjFhNi41IDYuNSAwIDAgMC0zLTUuNSIvPjwvc3ZnPicsCm1hcDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAzIDMuNSA1djE2TDkgMTlsNiAyIDUuNS0yVjNMMTUgNSA5IDN6Ii8+PHBhdGggZD0iTTkgM3YxNk0xNSA1djE2Ii8+PC9zdmc+Jwp9OwoKLyogPT09PT09PT09PT09PT09PT0g5Z+656GAIFVJID09PT09PT09PT09PT09PT09ICovCmxldCB0b2FzdFRpbWVyPW51bGw7CmZ1bmN0aW9uIHRvYXN0KG1zZyx0eXBlKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidG9hc3QiKTtlbC5jbGFzc05hbWU9dHlwZXx8ImluZm8iO2VsLmlubmVySFRNTD0odHlwZT09PSJlcnIiP0kueDp0eXBlPT09Im9rIj9JLmNoZWNrOkkud2lmaSkrJzxzcGFuPicrZXNjKG1zZykrJzwvc3Bhbj4nO3JlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+ZWwuY2xhc3NMaXN0LmFkZCgic2hvdyIpKTtjbGVhclRpbWVvdXQodG9hc3RUaW1lcik7dG9hc3RUaW1lcj1zZXRUaW1lb3V0KCgpPT5lbC5jbGFzc0xpc3QucmVtb3ZlKCJzaG93IiksMjYwMCl9Ci8qIHYyLjE0LjEwIOS/ruWkje+8muaXp+eJiOaKiuWbnuiwg+WHveaVsOa6kOeggeebtOaOpeaLvOi/myBvbmNsaWNrIOWxnuaAp++8jGFzeW5jIOWbnuiwg+WGheeahOWPjOW8leWPt+S8muaIquaWrSBIVE1MIOWxnuaAp++8jAogICDlr7zoh7TooaXnrb4v5YWR5o2i6KGl562+5Y2hL+mYsuebl+W4g+aOp+etieOAjOehruWumuOAjeaMiemSrueCueWHu+aXoOWPjeW6lOOAguaUueS4uuaaguWtmOWbnuiwg+OAgeaMiemSruiwg+eUqOWFqOWxgCBjb25maXJtWWVzKCkgKi8KbGV0IF9fY29uZmlybUFjdD1udWxsOwpmdW5jdGlvbiBjb25maXJtRGlhbG9nKHRpdGxlLGRlc2Msb25ZZXMseWVzVHh0KXtfX2NvbmZpcm1BY3Q9b25ZZXM7Y29uc3QgbGF5ZXI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpO2xheWVyLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY29uZmlybSI+PGRpdiBjbGFzcz0iY3QiPicrZXNjKHRpdGxlKSsnPC9kaXY+PGRpdiBjbGFzcz0iY2QiPicrZGVzYysnPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKSI+5Y+W5raIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0ieWVzIiBvbmNsaWNrPSJjb25maXJtWWVzKCkiPicrZXNjKHllc1R4dHx8IuehruWumiIpKyc8L2J1dHRvbj48L2Rpdj48L2Rpdj4nO2xheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpfQpmdW5jdGlvbiBjb25maXJtWWVzKCl7Y2xvc2VDb25maXJtKCk7Y29uc3QgYT1fX2NvbmZpcm1BY3Q7X19jb25maXJtQWN0PW51bGw7aWYoYT09bnVsbClyZXR1cm47dHJ5e2lmKHR5cGVvZiBhPT09ImZ1bmN0aW9uIil7YSgpfWVsc2UgaWYodHlwZW9mIGE9PT0ic3RyaW5nIil7Y29uc3Qgcj1uZXcgRnVuY3Rpb24oInJldHVybiAoIithKyIpIikoKTtpZih0eXBlb2Ygcj09PSJmdW5jdGlvbiIpcigpfX1jYXRjaChlKXt9fQpmdW5jdGlvbiBjbG9zZUNvbmZpcm0oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIikuY2xhc3NMaXN0LmFkZCgiaGlkZGVuIil9CmZ1bmN0aW9uIG9wZW5TaGVldCh0aXRsZSxpY29uLGh0bWwpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldFRpdGxlIikuaW5uZXJIVE1MPWljb24rJzxzcGFuPicrZXNjKHRpdGxlKSsnPC9zcGFuPic7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0Qm9keSIpLmlubmVySFRNTD1odG1sO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSJoaWRkZW4ifQpmdW5jdGlvbiBjbG9zZVNoZWV0KCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9IiJ9CmZ1bmN0aW9uIGZtdFRpbWUoaXNvKXt0cnl7Y29uc3QgZD1uZXcgRGF0ZShpc28pO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTtyZXR1cm4gZC5nZXRGdWxsWWVhcigpKyItIitwKGQuZ2V0TW9udGgoKSsxKSsiLSIrcChkLmdldERhdGUoKSkrIiAiK3AoZC5nZXRIb3VycygpKSsiOiIrcChkLmdldE1pbnV0ZXMoKSkrIjoiK3AoZC5nZXRTZWNvbmRzKCkpfWNhdGNoKGUpe3JldHVybiIifX0KCi8qID09PT09PT09PT09PT09PT09IOmhtemdouWIh+aNoiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzd2l0Y2hUYWIodGFiKXsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIudGFiIikuZm9yRWFjaCh0PT50LmNsYXNzTGlzdC50b2dnbGUoIm9uIix0LmRhdGFzZXQudGFiPT09dGFiKSk7CiAgY29uc3QgcGFnZXM9e2hvbWU6InBhZ2VIb21lIixwb2ludHM6InBhZ2VQb2ludHMiLHZlaGljbGU6InBhZ2VWZWhpY2xlIixsb2dzOiJwYWdlTG9ncyIsY2ZnOiJwYWdlQ2ZnIn07CiAgT2JqZWN0LmtleXMocGFnZXMpLmZvckVhY2goaz0+e2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhZ2VzW2tdKTtpZihlbCllbC5jbGFzc0xpc3QudG9nZ2xlKCJoaWRkZW4iLGshPT10YWIpfSk7CiAgaWYodGFiPT09InBvaW50cyIpcmVuZGVyUG9pbnRzKCk7CiAgaWYodGFiPT09InZlaGljbGUiKXJlbmRlclZlaGljbGVQYWdlKCk7CiAgaWYodGFiPT09ImxvZ3MiKXJlbmRlckxvZ3MoKTsKICBpZih0YWI9PT0iY2ZnIilyZW5kZXJDZmcoKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6Ieq5Yqo5Yi35pawID09PT09PT09PT09PT09PT09ICovCmxldCByZWZyZXNoVGltZXI9bnVsbCxyZWZyZXNoTGVmdD02MDsKZnVuY3Rpb24gc3RhcnRBdXRvUmVmcmVzaChzZWMpe3N0b3BBdXRvUmVmcmVzaCgpO3JlZnJlc2hMZWZ0PXNlY3x8Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWM7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaFRpbWVyPXNldEludGVydmFsKCgpPT57cmVmcmVzaExlZnQtLTtpZihyZWZyZXNoTGVmdDw9MCl7cmVmcmVzaExlZnQ9MDt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdXBkYXRlQ291bnRDaGlwKCl9LDEwMDApfQpmdW5jdGlvbiBzdG9wQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpe2NsZWFySW50ZXJ2YWwocmVmcmVzaFRpbWVyKTtyZWZyZXNoVGltZXI9bnVsbH19CmZ1bmN0aW9uIHVwZGF0ZUNvdW50Q2hpcCgpe2NvbnN0IGNoaXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50Q2hpcCIpO2NvbnN0IHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRUeHQiKTtjb25zdCBhcmM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50QXJjIik7Y29uc3Qgc2VjPWdldENmZygpLmF1dG9SZWZyZXNoU2VjfHw2MDtpZighY2hpcClyZXR1cm47aWYocmVmcmVzaFRpbWVyKXtjaGlwLmNsYXNzTGlzdC5hZGQoIm9uIik7dHh0LnRleHRDb250ZW50PXJlZnJlc2hMZWZ0KyJzIjtjb25zdCBDPTIqTWF0aC5QSSo1LjY7YXJjLnNldEF0dHJpYnV0ZSgic3Ryb2tlLWRhc2hvZmZzZXQiLFN0cmluZyhDKigxLXJlZnJlc2hMZWZ0L3NlYykpKX1lbHNle2NoaXAuY2xhc3NMaXN0LnJlbW92ZSgib24iKTt0eHQudGV4dENvbnRlbnQ9IuaJi+WKqCJ9fQpmdW5jdGlvbiB0b2dnbGVBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcilzdG9wQXV0b1JlZnJlc2goKTtlbHNlIHN0YXJ0QXV0b1JlZnJlc2goKTt1cGRhdGVDb3VudENoaXAoKX0KCi8qID09PT09PT09PT09PT09PT09IOS4i+aLieWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwooZnVuY3Rpb24oKXtjb25zdCB3cmFwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJXcmFwIiksaW5kPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJJbmQiKSx0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clR4dCIpLHNwaW49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clNwaW4iKTtsZXQgc3RhcnRZPTAscHVsbGluZz1mYWxzZSxkaXN0YW5jZT0wO2NvbnN0IFRIPTY0Owp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoc3RhcnQiLGU9PntpZih3aW5kb3cuc2Nyb2xsWTw9MCYmZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikmJiFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKS5jbGFzc0xpc3QuY29udGFpbnMoImhpZGRlbiIpKXtzdGFydFk9ZS50b3VjaGVzWzBdLmNsaWVudFk7cHVsbGluZz10cnVlO2Rpc3RhbmNlPTB9fSx7cGFzc2l2ZTp0cnVlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2htb3ZlIixlPT57aWYoIXB1bGxpbmcpcmV0dXJuO2NvbnN0IGR5PWUudG91Y2hlc1swXS5jbGllbnRZLXN0YXJ0WTtpZihkeT4wJiZ3aW5kb3cuc2Nyb2xsWTw9MCl7ZGlzdGFuY2U9TWF0aC5taW4oZHkqMC41LDkwKTtpbmQuc3R5bGUuaGVpZ2h0PWRpc3RhbmNlKyJweCI7aW5kLmNsYXNzTGlzdC5hZGQoInB1bGxpbmciKTtzcGluLnN0eWxlLnRyYW5zZm9ybT0icm90YXRlKCIrKGRpc3RhbmNlKjMuNikrImRlZykiO3R4dC50ZXh0Q29udGVudD1kaXN0YW5jZT49VEg/IuadvuW8gOWIt+aWsCI6IuS4i+aLieWIt+aWsCI7aWYoZGlzdGFuY2U+PVRIJiYhZS5jYW5jZWxhYmxlKXJldHVybjtpZihkaXN0YW5jZT49VEgmJmUuY2FuY2VsYWJsZSllLnByZXZlbnREZWZhdWx0KCl9fSx7cGFzc2l2ZTpmYWxzZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoZW5kIiwoKT0+e2lmKCFwdWxsaW5nKXJldHVybjtwdWxsaW5nPWZhbHNlO2lmKGRpc3RhbmNlPj1USCl7dHh0LnRleHRDb250ZW50PSLliLfmlrDkuK3igKYiO2luZC5zdHlsZS5oZWlnaHQ9IjQ2cHgiO3NwaW4uY2xhc3NMaXN0LmFkZCgic3Bpbm5lciIpO3JlZnJlc2hBbGwodHJ1ZSkuZmluYWxseSgoKT0+e2luZC5zdHlsZS5oZWlnaHQ9IjAiO2luZC5jbGFzc0xpc3QucmVtb3ZlKCJwdWxsaW5nIil9KX1lbHNle2luZC5zdHlsZS5oZWlnaHQ9IjAifWRpc3RhbmNlPTB9LHtwYXNzaXZlOnRydWV9KTsKfSkoKTsKCi8qID09PT09PT09PT09PT09PT09IOmmlumhtea4suafkyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgU1RBVEU9e2RhdGE6W10sdGltZXN0YW1wOiIiLHRzVGV4dDoiIixyZWZyZXNoU2VjOjYwLHByb3h5OmZhbHNlLHBhbmVsQWNjb3VudHM6bnVsbCxwYW5lbExvYWRlZDpmYWxzZX07Ci8vIOmmlumhteWNoeeJh+WFpeWcuuWKqOeUu+WPquWcqOesrOS4gOasoea4suafk+aXtuaSreaUvu+8jOS5i+WQjumdmem7mOWIt+aWsOebtOaOpeabv+aNouWGheWuue+8jOmBv+WFjeWxj+mXqgpsZXQgSE9NRV9BTklNPXRydWU7CmZ1bmN0aW9uIHNrZWxldG9uSG9tZSgpe3JldHVybiAnPGRpdiBjbGFzcz0iaGVybyIgc3R5bGU9ImhlaWdodDoxMzJweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzQwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc2MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nfQpmdW5jdGlvbiBzY29vdGVyRmFsbGJhY2soKXtyZXR1cm4gJzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nfQoKZnVuY3Rpb24gcmVuZGVySG9tZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2NvbnN0IGRhdGE9U1RBVEUuZGF0YTsKICAvLyDkuI3lho3lnKjmr4/mrKHmuLLmn5PliY3mj5LlhaXpqqjmnrblsY/vvJrpnZnpu5joh6rliqjliLfmlrDml7bkvJrlhYjmuIXnqbrlho3loavlhYXvvIzpgKDmiJDmlbTpobXpl6rng4EKICBpZihkYXRhLmxlbmd0aD09PTApewogICAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGRpdiBjbGFzcz0iZS1pY29uIj4nK0kuY2FyKyc8L2Rpdj48aDM+6L+Y5rKh5pyJ5p6B5qC46LSm5Y+3PC9oMz48cD7ljrvjgIzorr7nva7jgI3pobXmt7vliqDotKblj7fvvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiBUb2tlbu+8iEJlYXJlciDliY3nvIDkvJroh6rliqjljrvmjonvvInvvIzlho3ngrnjgIzojrflj5ZJROOAjeWNs+WPr+iHquWKqOWhq+WFheeUqOaIt0lE44CCPC9wPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzd2l0Y2hUYWIoXCdjZmdcJykiPuWOu+a3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIGNvbnN0IGNhcmRzPWRhdGEubWFwKChhLGlkeCk9PnJlbmRlckFjY291bnRDYXJkKGEsaWR4KSkuam9pbigiIik7CiAgY29uc3QgcHJveHlIaW50PVNUQVRFLnByb3h5Pyc8ZGl2IGNsYXNzPSJjZmctbm90ZSIgc3R5bGU9Im1hcmdpbi1ib3R0b206MTRweCI+PGI+Jysod2luZG93Ll9fUEFORUxfTU9ERV9fPyLpnaLmnb/mqKHlvI8iOiLku6PnkIbmqKHlvI8iKSsnPC9iPu+8muaVsOaNrueUseacrOacuuiEmuacrOWQjuerr+etvuWQjeS4juiOt+WPluOAgjwvZGl2Pic6IiI7CiAgZWwuaW5uZXJIVE1MPXByb3h5SGludCtjYXJkcwogICsnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcg5pWw5o2u5pu05pawICcrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8iIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7kvZzogIUgbHVja3kgwrcgR2l0SHViPC9hPiDCtyA8YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OTgiIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7niLHlj5HnlLU8L2E+IMK3IOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgSE9NRV9BTklNPWZhbHNlOwp9CgpmdW5jdGlvbiBwb3dlclRleHQocCxsKXtwPVN0cmluZyhwfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7bD1TdHJpbmcobHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2NvbnN0IG9uVmFscz1bIjEiLCJvbiIsInRydWUiLCLlvIDmnLoiLCJvcGVuIiwi5r+A5rS7IiwiYWNjX29uIiwiYWNjIG9uIiwicG93ZXJfb24iLCJwb3dlciBvbiIsIuW3suW8gOacuiIsIuW3suS4iueUtSJdO2NvbnN0IG9mZlZhbHM9WyIwIiwib2ZmIiwiZmFsc2UiLCLlhbPmnLoiLCJjbG9zZWQiLCLlvoXmnLoiLCJhY2Nfb2ZmIiwiYWNjIG9mZiIsInBvd2VyX29mZiIsInBvd2VyIG9mZiIsIuW3suWFs+acuiIsIuW3suS4i+eUtSJdO2lmKHApe2lmKG9uVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYob2ZmVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fWlmKGwpe2lmKFsiMCIsIuacqumUgSIsIuW8gOmUgSIsInVubG9ja2VkIiwiZmFsc2UiLCJvcGVuIiwi5bey5byA6ZSBIiwi5pyq6ZSB6L2mIl0uaW5jbHVkZXMobCkpcmV0dXJue3RleHQ6IuW3suW8gOacuiIsY2xzOiJvbiJ9O2lmKFsiMSIsIuW3sumUgSIsIumUgei9piIsImxvY2tlZCIsInRydWUiLCJjbG9zZWQiLCLlt7LplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fXJldHVybnt0ZXh0OiLnirbmgIHmnKrnn6UiLGNsczoib2ZmIn19CmZ1bmN0aW9uIG9ubGluZVRleHQobyl7Y29uc3Qgcz1TdHJpbmcob3x8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2lmKCFzKXJldHVybiIiO2lmKFsiMSIsIm9uIiwib25saW5lIiwidHJ1ZSIsIuWcqOe6vyIsIuW3suWcqOe6vyIsImNvbm5lY3RlZCIsIm5vcm1hbCJdLmluY2x1ZGVzKHMpKXJldHVybiLlnKjnur8iO2lmKFsiMCIsIm9mZiIsIm9mZmxpbmUiLCJmYWxzZSIsIuemu+e6vyIsIuacquWcqOe6vyIsIuW3suemu+e6vyIsImRpc2Nvbm5lY3QiLCJkaXNjb25uZWN0ZWQiLCJzbGVlcCIsIuS8keecoCJdLmluY2x1ZGVzKHMpKXJldHVybiLnprvnur8iO3JldHVybiBzfQpmdW5jdGlvbiByZW5kZXJBY2NvdW50Q2FyZChhLGlkeCl7CiAgY29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IG9ubD1vbmxpbmVUZXh0KHYub25saW5lfHx2LnJpZGVTdGF0ZSk7CiAgY29uc3QgaXNDaGFyZ2luZz12LmNoYXJnZVN0YXRlJiZ2LmNoYXJnZVN0YXRlIT09IuacquWFheeUtSI7CiAgY29uc3Qgc29jPXYuYmF0dGVyeVBlcmNlbnR8fDA7CiAgY29uc3Qgc29jQ29sPXNvYzw9MjA/IiNGOTcwNkEiOnNvYzw9NTA/IiNGN0I5NTUiOiIjM0REQzk3IjsKICBjb25zdCByYW5nZT12LnJlc2lkdWFsUmFuZ2VLbXx8MDsKICBjb25zdCB2b2x0PXYudm9sdGFnZT9NYXRoLnJvdW5kKHYudm9sdGFnZSkrIlYiOiIiOwogIGNvbnN0IGltZz12LnZlaGljbGVJbWFnZVVybD8nPGltZyBzcmM9IicrZXNjKHYudmVoaWNsZUltYWdlVXJsKSsnIiBhbHQ9IiIgb25lcnJvcj0idGhpcy5wYXJlbnROb2RlLmlubmVySFRNTD1cJycrc2Nvb3RlckZhbGxiYWNrKCkucmVwbGFjZSgvJy9nLCJcXCciKSsnXCciPic6c2Nvb3RlckZhbGxiYWNrKCk7CiAgY29uc3QgdmVoU3c9di5oYXNWZWhpY2xlP3JlbmRlclZlaGljbGVTd2l0Y2godixpZHgpOiIiOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNhcmQgaG9tZS1jYXJkJysoSE9NRV9BTklNPycgYW5pbS1pbic6JycpKyciIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaWR4KjYwKSsnbXMiPicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdXBkIj7mm7TmlrDvvJonK2VzYyhTVEFURS50c1RleHR8fCItIikrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdG9wIj48ZGl2IGNsYXNzPSJoYy1uYW1lIj4nK2VzYyh2Lmhhc1ZlaGljbGU/KHYudmVoaWNsZU5hbWV8fGEudXNlck5hbWUpOmEudXNlck5hbWUpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZT8ob25sPT09IuWcqOe6vyI/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSBvbiI+5Zyo57q/PC9zcGFuPic6KG9ubD8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIj4nK2VzYyhvbmwpKyc8L3NwYW4+JzoiIikpOiIiKSsKICAgIChhLnRva2VuVmFsaWQ9PT1mYWxzZT8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGVyciI+VG9rZW7lpLHmlYg8L3NwYW4+JzoiIikrCiAgICAoaXNDaGFyZ2luZz8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGNoZyI+5YWF55S15LitPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZSYmdi52ZWhpY2xlTW9kZWw/JzxkaXYgY2xhc3M9ImhjLW1vZGVsIj7ovablnovvvJonK2VzYyh2LnZlaGljbGVNb2RlbCkrJzwvZGl2Pic6IiIpKwogICAgKHYuaGFzVmVoaWNsZT8nPGRpdiBjbGFzcz0iaGMtbWlkIj48ZGl2IGNsYXNzPSJoYy1sZWZ0Ij48ZGl2IGNsYXNzPSJoYy1iaWcgbnVtIj4nK01hdGgucm91bmQoc29jKSsnJTxzcGFuIGNsYXNzPSJoYy1rbSBudW0iPicrKHJhbmdlfHwwKSsna208L3NwYW4+Jysodm9sdD8nPHNwYW4gY2xhc3M9ImhjLXYgbnVtIj4nK3ZvbHQrJzwvc3Bhbj4nOiIiKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1iYXIiPjxkaXYgY2xhc3M9ImhjLWZpbGwiIHN0eWxlPSJ3aWR0aDonK01hdGgubWF4KDAsTWF0aC5taW4oMTAwLHNvYykpKyclO2JhY2tncm91bmQ6Jytzb2NDb2wrJyI+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1yb3dzIj48ZGl2IGNsYXNzPSJoYy1yb3ciPumHjOeoi++8micrKHYubGFzdFJpZGVNaWxlYWdlP3YubGFzdFJpZGVNaWxlYWdlLnRvRml4ZWQoMSk6IjAiKSsna208L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvdyI+5LiK5qyh77yaJysodi5sYXN0UmlkZU1pbGVhZ2U/di5sYXN0UmlkZU1pbGVhZ2UudG9GaXhlZCgxKSsia20iOiItLSIpKyhmbXRNaW4odi5sYXN0UmlkZUR1cmF0aW9uKT8iICIrZm10TWluKHYubGFzdFJpZGVEdXJhdGlvbik6IiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvdyI+5b2T5pel77yaJysodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOiIwIikrJ2ttJysoZm10TWluKHYudG9kYXlEdXJhdGlvbik/IiAiK2ZtdE1pbih2LnRvZGF5RHVyYXRpb24pOiIiKSsodi50b2RheU1heFNwZWVkPyIgIit2LnRvZGF5TWF4U3BlZWQrImttL2giOiIiKSsnPC9kaXY+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1pbWciPicraW1nKyc8L2Rpdj48L2Rpdj4nOgogICAgJzxkaXYgY2xhc3M9Im5vLXZlaGljbGUiIHN0eWxlPSJtYXJnaW46MTJweCAwIj4nK0kuY2FyKycg6K+l6LSm5Y+35pyq57uR5a6a6L2m6L6GPC9kaXY+JykrCiAgICAnPGRpdiBjbGFzcz0iaGMtYm90dG9tIj48ZGl2IGNsYXNzPSJoYy10YXNrcyI+Jyt0b2RheVRhc2tzSHRtbChhKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1zY29yZSI+PHNwYW4+5oC756ev5YiGIDxiIGNsYXNzPSJudW0iPicrTnVtYmVyKGEuc2NvcmV8fDApLnRvTG9jYWxlU3RyaW5nKCkrJzwvYj48L3NwYW4+PHNwYW4gY2xhc3M9InBsdXMgbnVtIj7ku4orJytOdW1iZXIoYS50b2RheVNjb3JlfHwwKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzdHJlYWsgbnVtIj7ov57nrb4nK051bWJlcihhLmNvbnRpbnVlRGF5c3x8MCkrJ+WkqTwvc3Bhbj48L2Rpdj48L2Rpdj4nKwogICAgdmVoU3crJzwvZGl2Pic7Cn0KZnVuY3Rpb24gdG9kYXlUYXNrc0h0bWwoYSl7CiAgY29uc3QgdG9kYXk9bmV3IERhdGUoKTtjb25zdCB0U3RyPXRvZGF5LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyh0b2RheS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKHRvZGF5LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGxldCBwb3N0PWZhbHNlLGxpa2U9ZmFsc2Usc2hhcmU9ZmFsc2U7CiAgdHJ5ewogICAgY29uc3QgbG9nPShnZXRMb2dzKCl8fFtdKS5maW5kKGw9PmwmJmwuZGF0ZT09PXRTdHImJlN0cmluZyhsLnVzZXJJZHx8IiIpPT09U3RyaW5nKGEudXNlcklkfHwiIikmJmwuc3VjY2VzcyYmQXJyYXkuaXNBcnJheShsLnN0ZXBzKSk7CiAgICBpZihsb2cpe2NvbnN0IHN0PWxvZy5zdGVwcy5qb2luKCJ8Iik7cG9zdD0v5Y+R5biW5oiQ5YqfLy50ZXN0KHN0KTtsaWtlPS/ngrnotZ7miJDlip8vLnRlc3Qoc3QpO3NoYXJlPS/liIbkuqvmiJDlip8vLnRlc3Qoc3QpfQogIH1jYXRjaChlKXt9CiAgY29uc3QgdD0ob24sdHh0LGNscyk9Pic8c3BhbiBjbGFzcz0iaHQtdCAnKyhvbj8ib24gIitjbHM6Im9mZiIpKyciPicrKG9uPyLinJMgIjoiwrcgIikrdHh0Kyc8L3NwYW4+JzsKICByZXR1cm4gdChhLnNpZ25lZFRvZGF5LCLlt7Lnrb7liLAiLCJnIikrdChwb3N0LCLlj5HluIMiLCJnIikrdChzaGFyZSwi5YiG5LqrIiwiZyIpK3QobGlrZSwi5bey6LWeIiwiciIpOwp9CmZ1bmN0aW9uIGZtdE1pbihtaW4pe21pbj1OdW1iZXIobWluKXx8MDtpZihtaW48PTApcmV0dXJuIiI7Y29uc3QgaD1NYXRoLmZsb29yKG1pbi82MCksbT1NYXRoLnJvdW5kKG1pbiU2MCk7cmV0dXJuIGg+MD9oKyJoIisobT9tKyJtaW4iOiIiKTptKyJtaW4ifQoKLyogPT09PT09PT09PT09IOWkmui9puWIh+aNoiA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCl7CiAgaWYoIXYudmVoaWNsZXN8fHYudmVoaWNsZXMubGVuZ3RoPDIpcmV0dXJuICIiOwogIGNvbnN0IGN1cj12LmN1cnJlbnRWaW58fCIiOwogIGNvbnN0IGl0ZW1zPXYudmVoaWNsZXMubWFwKHg9Pic8YnV0dG9uIGNsYXNzPSJ2ZWgtY2hpcCcrKHgudmluTm89PT1jdXI/IiBvbiI6IiIpKyciIG9uY2xpY2s9InN3aXRjaFZlaGljbGUoJytpZHgrJyxcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgubmFtZSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0idmVoLXN3aXRjaCI+PHNwYW4gY2xhc3M9InZlaC1zdy1sYWJlbCI+6L2m6L6GPC9zcGFuPicraXRlbXMrJzwvZGl2Pic7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZShpZHgsdmluKXsKICBjb25zdCBzcmM9U1RBVEUuZGF0YVtpZHhdO2lmKCFzcmN8fCF2aW4pcmV0dXJuOwogIHRyeXsKICAgIGxldCBkOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IHI9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChzcmMudXNlcklkfHwiIikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICAgIGQ9KHImJnIub2spP3IucmVzdWx0Om51bGw7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjYz1nZXRBY2NvdW50cygpW2lkeF07CiAgICAgIGlmKCFhY2MpcmV0dXJuOwogICAgICBkPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW4pOwogICAgfQogICAgaWYoZCYmZC52ZWhpY2xlJiZkLnZlaGljbGUuaGFzVmVoaWNsZSl7CiAgICAgIFNUQVRFLmRhdGFbaWR4XT1PYmplY3QuYXNzaWduKHt9LFNUQVRFLmRhdGFbaWR4XSxkKTsKICAgICAgcmVuZGVySG9tZSgpOwogICAgfQogIH1jYXRjaChlKXt9Cn0KCi8qID09PT09PT09PT09PSDkuLvpopjvvIh2Mi4xNC4xNCDotbfku4Xkv53nlZnmt7HoibLljZXkuLvpopjvvIkgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIiwiZGFyayIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDnq4vljbPnrb7liLDmgqzmta7mjInpkq4gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbW91bnRTaWduaW5GYWIoKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIikpcmV0dXJuOwogIGNvbnN0IGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiYnV0dG9uIik7CiAgYi5pZD0ic2lnbmluRmFiIjtiLmNsYXNzTmFtZT0ic2lnbmluLWZhYiI7Yi5pbm5lckhUTUw9KEkuY2hlY2t8fCIiKSsiPHNwYW4+56uL5Y2z562+5YiwPC9zcGFuPiI7CiAgYi5vbmNsaWNrPXJ1blNpZ25pbk5vdzsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbk5vdygpewogIGlmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufQogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoIWJ0bnx8YnRuLmNsYXNzTGlzdC5jb250YWlucygiYnVzeSIpKXJldHVybjsKICBidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiI7CiAgdG9hc3QoIuato+WcqOS4uuWFqOmDqOi0puWPt+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucnVuU2lnbmluKG51bGwsdHJ1ZSk7CiAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAiOwogIGlmKGQmJmQub2smJmQucmVzdWx0cyl7CiAgICBjb25zdCBva049ZC5yZXN1bHRzLmZpbHRlcihyPT5yLnN1Y2Nlc3MpLmxlbmd0aDsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoiK29rTisiLyIrZC5yZXN1bHRzLmxlbmd0aCsiIOaIkOWKnyIsb2tOPT09ZC5yZXN1bHRzLmxlbmd0aD8ib2siOiJlcnIiKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLGQucmVzdWx0cy5tYXAocj0+JzxkaXYgY2xhc3M9InNpZy1jYXJkICcrKHIuc3VjY2Vzcz8ib2siOiJmYWlsIikrJyI+PGRpdiBjbGFzcz0iaCI+PHNwYW4+Jytlc2Moci51c2VyTmFtZXx8IuacquefpSIpKyc8L3NwYW4+PHNwYW4gY2xhc3M9InIiPicrKHIuc3VjY2Vzcz8oIisiKyhyLnRvdGFsR2Fpbnx8MCkrIiDliIYiKToi5aSx6LSlIikrJzwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJzdGVwcyI+Jysoci5zdGVwc3x8W10pLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikrKHIuZXJyb3I/JzxkaXYgY2xhc3M9ImVyciI+Jytlc2Moci5lcnJvcikrJzwvZGl2Pic6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKSk7CiAgICByZWZyZXNoQWxsKHRydWUpOwogIH1lbHNlewogICAgdG9hc3QoKGQmJmQuZXJyb3IpfHwi562+5Yiw5omn6KGM5aSx6LSlIiwiZXJyIik7CiAgfQp9CgoKCi8qID09PT09PT09PT09PT09PT09IOi9pui+huivpuaDhSAmIOWcsOWbviA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBvcGVuTWFwKGlkeCl7Y29uc3Qgdj1TVEFURS5kYXRhW2lkeF0mJlNUQVRFLmRhdGFbaWR4XS52ZWhpY2xlO2lmKCF2KXJldHVybjtpZighaGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKSl7dG9hc3QoIuaaguaXoOacieaViCBHUFMg5Z2Q5qCHIiwiZXJyIik7cmV0dXJufWNvbnN0IHVybD0iaHR0cHM6Ly9tYXBzLmFwcGxlLmNvbS8/cT0iK051bWJlcih2LmxhdGl0dWRlKSsiLCIrTnVtYmVyKHYubG9uZ2l0dWRlKSsiJno9MTciO3dpbmRvdy5vcGVuKHVybCwiX2JsYW5rIil9CmZ1bmN0aW9uIHNob3dWZWhpY2xlRGV0YWlsKGlkeCl7CiAgY29uc3QgYT1TVEFURS5kYXRhW2lkeF07aWYoIWEpcmV0dXJuO2NvbnN0IHY9YS52ZWhpY2xlfHx7fTsKICBjb25zdCBwdz1wb3dlclRleHQodi5wb3dlclN0YXR1cyx2LmxvY2tTdGF0ZSk7CiAgY29uc3Qgcm93cz1bXTsKICBpZih2LnZpbk5vKXJvd3MucHVzaChbJ+i9puaetuWPtycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iIGlkPSJ2aW5EdGwiPicrZXNjKG1hc2tWaW4odi52aW5ObykpKyc8L3NwYW4+IDxidXR0b24gY2xhc3M9InZpbi1zaG93IiBvbmNsaWNrPSJ0b2dnbGVEdGxWaW4oKSI+5pi+56S6PC9idXR0b24+J10pOwogIHJvd3MucHVzaChbJ+WFheeUteeKtuaAgScsZXNjKHYuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKV0pOwogIHJvd3MucHVzaChbJ+eUtea6kOeKtuaAgScsJzxzcGFuIHN0eWxlPSJjb2xvcjonKyhwdy5jbHM9PT0ib24iPyJ2YXIoLS1vaykiOiJ2YXIoLS10eHQyKSIpKyciPicrcHcudGV4dCsnPC9zcGFuPiddKTsKICBpZih2LnJpZGVTdGF0ZXx8di5vbmxpbmUpcm93cy5wdXNoKFsn6L2m6L6G54q25oCBJyxlc2Modi5yaWRlU3RhdGV8fHYub25saW5lKV0pOwogIHJvd3MucHVzaChbJ+eUtemHjyBTT0MnLCc8YiBzdHlsZT0iY29sb3I6Jysodi5iYXR0ZXJ5UGVyY2VudDw9MjA/InZhcigtLWVycikiOnYuYmF0dGVyeVBlcmNlbnQ8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLWJyYW5kKSIpKyciPicrKHYuYmF0dGVyeVBlcmNlbnR8fDApKyclPC9iPiddKTsKICBpZih2LnZvbHRhZ2Upcm93cy5wdXNoKFsn55S15Y6LJyx2LnZvbHRhZ2UudG9GaXhlZCgxKSsiViJdKTsKICBpZih2LmN1cnJlbnQpcm93cy5wdXNoKFsn55S15rWBJyx2LmN1cnJlbnQudG9GaXhlZCgxKSsiQSJdKTsKICBpZih2LmJhdHRlcnlUZW1wKXJvd3MucHVzaChbJ+eUteaxoOa4qeW6picsdi5iYXR0ZXJ5VGVtcC50b0ZpeGVkKDApKyLCsEMiXSk7CiAgcm93cy5wdXNoKFsn5Ymp5L2Z57ut6IiqJywodi5yZXNpZHVhbFJhbmdlS218fDApKyIga20iKyh2LnJhbmdlRXN0aW1hdGVkPyLvvIjkvLDnrpfvvIkiOiIiKV0pOwogIHJvd3MucHVzaChbJ+S7iuaXpemqkeihjCcsKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKTowKSsiIGttIC8gIisodi50b2RheUR1cmF0aW9ufHwwKSsiIG1pbiJdKTsKICBpZigodi5mcm9udFByZXNzdXJlJiZ2LmZyb250UHJlc3N1cmUhPT0i5pyq57uR5a6aIil8fCh2LnJlYXJQcmVzc3VyZSYmdi5yZWFyUHJlc3N1cmUhPT0i5pyq57uR5a6aIikpcm93cy5wdXNoKFsn6IOO5Y6LJywn5YmNICcrZXNjKHYuZnJvbnRQcmVzc3VyZXx8Ii0iKSsnIC8g5ZCOICcrZXNjKHYucmVhclByZXNzdXJlfHwiLSIpXSk7CiAgaWYodi5hZGRyZXNzKXJvd3MucHVzaChbJ+i9pui+huS9jee9ricsJzxzcGFuIHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDAiPicrZXNjKHYuYWRkcmVzcykrJzwvc3Bhbj4nXSk7CiAgY29uc3QgZE9rPWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSk7CiAgaWYoZE9rKXJvd3MucHVzaChbJ0dQUyDlnZDmoIcnLCc8c3BhbiBjbGFzcz0idiBtb25vIj4nK051bWJlcih2LmxhdGl0dWRlKS50b0ZpeGVkKDYpKyIsICIrTnVtYmVyKHYubG9uZ2l0dWRlKS50b0ZpeGVkKDYpKyc8L3NwYW4+J10pOwogIGlmKHYubG9jYXRpb25UaW1lKXJvd3MucHVzaChbJ+acgOWQjuWumuS9jScsJzxzcGFuIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDAiPicrZXNjKHYubG9jYXRpb25UaW1lKSsnPC9zcGFuPiddKTsKICBpZih2LnNlcnZpY2VFbmREYXRlKXJvd3MucHVzaChbJ+acjeWKoeWIsOacnycsZXNjKHYuc2VydmljZUVuZERhdGUpXSk7CiAgU1RBVEUudmluRHRsUmF3PXYudmluTm98fCIiOwogIGNvbnN0IGh0bWw9cm93cy5tYXAocj0+JzxkaXYgY2xhc3M9InNyLWl0ZW0iPjxzcGFuIGNsYXNzPSJrIj4nK3JbMF0rJzwvc3Bhbj48c3BhbiBjbGFzcz0idiI+JytyWzFdKyc8L3NwYW4+PC9kaXY+Jykuam9pbigiIikrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE2cHgiPjxidXR0b24gY2xhc3M9ImJ0biAnKyhkT2s/InByaW1hcnkiOiIiKSsnIiAnKyhkT2s/J29uY2xpY2s9ImNsb3NlU2hlZXQoKTtvcGVuTWFwKCcraWR4KycpIic6J2Rpc2FibGVkIHRpdGxlPSLmmoLml6DmnInmlYhHUFPlnZDmoIciJykrJz4nK0kubWFwKycg5Zyw5Zu+5p+l55yLPC9idXR0b24+PC9kaXY+JzsKICBvcGVuU2hlZXQoIui9pui+huivpuaDhSDCtyAiK2VzYyh2LnZlaGljbGVOYW1lfHwi5p6B5qC46L2m6L6GIiksSS5jYXIsaHRtbCk7Cn0KZnVuY3Rpb24gdG9nZ2xlRHRsVmluKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZpbkR0bCIpO2lmKCFlbClyZXR1cm47aWYoZWwudGV4dENvbnRlbnQuaW5kZXhPZigiKiIpPj0wKXtlbC50ZXh0Q29udGVudD1TVEFURS52aW5EdGxSYXc7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i6ZqQ6JePIn1lbHNle2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IuaYvuekuiI7ZWwudGV4dENvbnRlbnQ9bWFza1ZpbihlbC50ZXh0Q29udGVudCl9fQovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYzvvIjpnaLmnb/lt7Lnp7vpmaTmiYvliqjnrb7liLDlhaXlj6PvvIzlrprml7bnrb7liLDnlLHohJrmnKwgY3JvbiDotJ/otKPvvIkgPT09PT09PT09PT09PT09PT0gKi8KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhfHwhYS51c2VySWQpe3RvYXN0KCLor6XotKblj7fnvLrlsJHnlKjmiLdJRCIsImVyciIpO3JldHVybn1jb25zdCBuYW1lcz17ZmluZDoi55+t5oyJ5a+76L2m77yI6L2m6L6G6Zeq54Gv77yJIixsb3VkRmluZDoi6bij56yb6Zeq54Gv77yI6auY5aOw5a+76L2m77yJIixjdXNoaW9uOiLmiZPlvIDlnZDlnqvvvIjlnZDlnqvkvJrlvLnotbfvvIkiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTtjb25zdCBuYW1lPW5hbWVzW2FjdGlvbl18fGFjdGlvbjtjb25maXJtRGlhbG9nKCLnoa7orqTmiafooYwgIituYW1lLCLor6XmjIfku6TkvJrpgJrov4cgNEcg572R57uc55yf5a6e5o6n5Yi25L2g55qE6L2m6L6G77yaIitlc2MoYS51c2VyTmFtZSkrIuOAgiIsJ2RvQ3RybCgnK2lkeCsiLCciK2FjdGlvbisiJykiKX0KYXN5bmMgZnVuY3Rpb24gZG9DdHJsKGlkeCxhY3Rpb24pe2NvbnN0IGE9cHRBY2NvdW50cygpW2lkeF07aWYoIWEpcmV0dXJuO2NvbnN0IGJ0bj1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY3RybC1idG5bZGF0YS1hY3Q9IicrYWN0aW9uKyciXScpO2NvbnN0IG9sZD1idG4/YnRuLmlubmVySFRNTDoiIjtpZihidG4pe2J0bi5kaXNhYmxlZD10cnVlO2J0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLmlubmVySFRNTD1JLmNsb2NrfXRvYXN0KCLmjIfku6TkuIvlj5HkuK3igKYiLCJpbmZvIik7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDdHJsKGEudXNlcklkLGFjdGlvbik7aWYoYnRuKXtidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4uaW5uZXJIVE1MPW9sZH1pZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLmjIfku6Tlt7LkuIvlj5EiLCJvayIpfWVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLmjIfku6TlpLHotKUiLCJlcnIiKX19CgovKiA9PT09PT09PT09PT09PT09PSDml6Xlv5fpobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvZ0ZpbHRlcj0iYWxsIjsKYXN5bmMgZnVuY3Rpb24gcmVuZGVyTG9ncygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlTG9ncyIpOwogIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ic2VjdGlvbi10aXRsZSI+JytJLmt2Kyfov5DooYzml6Xlv5c8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJsb2ctcGFuZWwiPjxkaXYgY2xhc3M9ImxvZy1oZWFkIj48aDM+JytJLmt2Kyc8c3Bhbj7mnIDov5EgNTAg5p2hPC9zcGFuPjwvaDM+PGRpdiBjbGFzcz0ibG9nLWZpbHRlcnMiPicrCiAgWyc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJhbGwiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ2FsbFwnKSI+5YWo6YOoPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0ic2lnbmluIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdzaWduaW5cJykiPuetvuWIsDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InZlaGljbGUiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3ZlaGljbGVcJykiPuaOp+i9pjwvYnV0dG9uPiddLmpvaW4oIiIpKwogICc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbGlzdCIgaWQ9ImxvZ0xpc3QiPjxkaXYgc3R5bGU9InBhZGRpbmc6NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L295Lit4oCmPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTRweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgc3R5bGU9ImZsZXg6MSIgb25jbGljaz0iY2xlYXJMb2dzVUkoKSI+5riF56m65pel5b+XPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBsb2dzPWxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTA/REVNT19MT0dTOmF3YWl0IEJhY2tlbmQuZ2V0TG9ncygpO3JlbmRlckxvZ0xpc3QobG9ncyk7Cn0KZnVuY3Rpb24gc2V0TG9nRmlsdGVyKGYpe2xvZ0ZpbHRlcj1mO3JlbmRlckxvZ3MoKX0KZnVuY3Rpb24gcmVuZGVyTG9nTGlzdChsb2dzKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibG9nTGlzdCIpO2lmKCFlbClyZXR1cm47Y29uc3QgbGlzdD0obG9nc3x8W10pLmZpbHRlcihsPT57Y29uc3QgdD1sLnR5cGV8fCJzaWduaW4iO2lmKGxvZ0ZpbHRlcj09PSJhbGwiKXJldHVybiB0cnVlO3JldHVybiB0PT09bG9nRmlsdGVyfSk7aWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImxvZy1lbXB0eSI+JytJLndhcm4rJzxicj7or6XliIbnsbvkuIvmmoLml6Dml6Xlv5c8L2Rpdj4nO3JldHVybn1lbC5pbm5lckhUTUw9bGlzdC5tYXAoKGxvZyxpKT0+e2NvbnN0IHQ9bG9nLnR5cGV8fCJzaWduaW4iO2NvbnN0IHRhZz10PT09InZlaGljbGUiPyc8c3BhbiBjbGFzcz0icGlsbCBhbWJlciI+5o6n6L2mPC9zcGFuPic6JzxzcGFuIGNsYXNzPSJwaWxsIGN5YW4iPuetvuWIsDwvc3Bhbj4nO2xldCByZXM7aWYodD09PSJ2ZWhpY2xlIil7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLmFjdGlvblRleHR8fCLovabovobmjqfliLYiKSsnICcrKGxvZy5zdWNjZXNzPyLmiJDlip8iOiLlpLHotKXvvJoiK2VzYyhsb2cubWVzc2FnZXx8bG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31lbHNle3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5zdWNjZXNzPyLmiJDlip8gKyIrbG9nLnRvdGFsR2Fpbjoi5aSx6LSlOiAiKyhsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWNvbnN0IHN0ZXBzPWxvZy5zdGVwcz8obG9nLnN0ZXBzLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikpOiIiO3JldHVybiAnPGRpdiBjbGFzcz0ibG9nLWl0ZW0iIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaSoyNSkrJ21zIj48ZGl2IGNsYXNzPSJsb2ctdGltZSI+Jytlc2MobG9nLnRpbWV8fCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ibG9nLW1haW4iPicrdGFnKyc8c3BhbiBjbGFzcz0ibG9nLXVzZXIiPicrZXNjKGxvZy51c2VyTmFtZXx8IiIpKyc8L3NwYW4+JytyZXMrJzwvZGl2PicrKHN0ZXBzPyc8ZGl2IGNsYXNzPSJsb2ctc3RlcHMiPicrc3RlcHMrJzwvZGl2Pic6IiIpKyc8L2Rpdj4nfSkuam9pbigiIil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc1VJKCl7Y29uZmlybURpYWxvZygi5riF56m65pel5b+XIiwi5bCG5Yig6Zmk5YWo6YOo6L+Q6KGM5pel5b+X77yM5q2k5pON5L2c5LiN5Y+v5oGi5aSN44CCIiwiY2xlYXJMb2dzTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc05vdygpe2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuY2xlYXJMb2dzKCk7aWYob2spe3RvYXN0KCLml6Xlv5flt7LmuIXnqboiLCJvayIpO3JlbmRlckxvZ3MoKX1lbHNlIHRvYXN0KCLmuIXnqbrlpLHotKUiLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOiuvue9rumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgY2ZnQWNjb3VudHM9W107CmZ1bmN0aW9uIHJlbmRlckNmZygpewogIGlmKGlzUHJveHlNb2RlKCkmJmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik8MCYmIVNUQVRFLnBhbmVsTG9hZGVkKXsKICAgIGNvbnN0IGVsMD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogICAgaWYoZWwwKWVsMC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CGPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5q2j5Zyo5LuO6ISa5pys5ZCO56uv5ZCM5q2l6LSm5Y+35LiO6YWN572u4oCmPC9kaXY+PC9kaXY+JzsKICAgIGVuc3VyZVBhbmVsRGF0YSgpLnRoZW4oKCk9PnJlbmRlckNmZygpKTsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2ZnPWdldENmZygpO2NmZ0FjY291bnRzPShpc1Byb3h5TW9kZSgpJiZTVEFURS5wYW5lbEFjY291bnRzP1NUQVRFLnBhbmVsQWNjb3VudHM6Z2V0QWNjb3VudHMoKSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjphLnRva2VufHwiIixiYXJrS2V5OmEuYmFya0tleXx8IiJ9KSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICBjb25zdCBhY2NSb3dzPWNmZ0FjY291bnRzLm1hcCgoYSxpZHgpPT4nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VyTmFtZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VySWQpKyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW7vvIjnspjotLTljbPlj6/vvIzoh6rliqjljrvmjokgQmVhcmVyIOWJjee8gO+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudG9rZW4pKyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIznrb7liLDmiJDlip/mjqjpgIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEuYmFya0tleSkrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogIGNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eTsKICBjb25zdCBzdz0oaWQsbGFiZWwsc3ViLGNoZWNrZWQpPT4nPGxhYmVsIGNsYXNzPSJzd2l0Y2giPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9IicraWQrJyIgJysoY2hlY2tlZD8iY2hlY2tlZCI6IiIpKyc+PHNwYW4gY2xhc3M9InN3Ij48L3NwYW4+PHNwYW4gY2xhc3M9ImxibCI+JytsYWJlbCsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzYyI+JytzdWIrJzwvc3Bhbj48L2xhYmVsPic7CiAgZWwuaW5uZXJIVE1MPQogICc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua2V5Kyforr7nva48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7mlbDmja7mnI3liqE8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nnIvmnb/oh6rliqjliLfmlrDpl7TpmpTvvIjnp5LvvIwxNX4zNjAw77yJPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0iY2ZnX3JlZnJlc2giIG1pbj0iMTUiIG1heD0iMzYwMCIgc3RlcD0iNSIgdmFsdWU9IicrKGNmZy5hdXRvUmVmcmVzaFNlY3x8NjApKyciPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+5a6a5pe2562+5YiwPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICBzdygiYXV0b19zaWduaW4iLCLlrprml7bnrb7liLAiLCLliLDngrnoh6rliqjkuLrlhajpg6jotKblj7fnrb7liLAiLGNmZy5hdXRvU2lnbmluPT09dHJ1ZSkrCiAgc3coInZlaGljbGVfbW9uaXRvciIsIui9pui+hueKtuaAgeebkeaOpyIsIuWFhea7oS/nprvnur/ml7bmnKzlnLDpgJrnn6Xmj5DphpLvvIjmiZPlvIDpnaLmnb/ml7bmo4Dmn6XvvIkiLGNmZy52ZWhpY2xlTW9uaXRvcj09PXRydWUpKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7nrb7liLDml7bpl7TvvIjmr4/lpKnvvIxISDpNTe+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRpbWUiIGlkPSJjZmdfc2lnbmluX3RpbWUiIHZhbHVlPSInK2VzYyhjZmcuYXV0b1NpZ25pblRpbWV8fCIwNzowMCIpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7ku6PnkIbohJrmnKzml6DluLjpqbvlkI7lj7DvvIzph4fnlKjjgIzmiZPlvIDooaXnrb7jgI3mnLrliLbvvJrlvIDlkK/lkI7vvIzmr4/lpKnpppbmrKHmiZPlvIDpnaLmnb/kuJTlt7Lov4forr7lrprml7bpl7Tml7bvvIzoh6rliqjkuLrlhajpg6jotKblj7fmiafooYzkuIDmrKHnrb7liLDvvIjlhpnml6Xlv5fjgIHmjqggQmFya++8jOS4juaJi+WKqOetvuWIsOS4gOiHtO+8ie+8jOWQjOS4gOWkqeWPquaJp+ihjOS4gOasoeOAgummlumhteOAjOeri+WNs+etvuWIsOOAjeaCrOa1ruaMiemSruWPr+maj+aXtuaJi+WKqOaJp+ihjOOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIj48L3NwYW4+562+5ZCN5a+G6ZKl6YWN572uPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICAnPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD5BcHAg56uvIGFwcElkPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNmZ19hcHBfaWQiIHZhbHVlPSInK2VzYyhjZmcuYXBwLmFwcElkKSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+QXBwIOerryBhcHBTZWNyZXQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2FwcF9zZWNyZXQiIHZhbHVlPSInK2VzYyhjZmcuYXBwLmFwcFNlY3JldCkrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEycHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkg1IOerryBhcHBJZDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjZmdfaDVfaWQiIHZhbHVlPSInK2VzYyhjZmcuaDUuYXBwSWQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD5INSDnq68gYXBwU2VjcmV0PC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNmZ19oNV9zZWNyZXQiIHZhbHVlPSInK2VzYyhjZmcuaDUuYXBwU2VjcmV0KSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCI+PC9kaXY+JysKICAnPC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5LqR56uv5o6n6L2mIEFFUyDlr4bpkqXvvIgzMiDkvY3ljYHlha3ov5vliLbvvIzlvIAv5YWz6ZSB5b+F5aGr77yJPC9sYWJlbD48aW5wdXQgdHlwZT0icGFzc3dvcmQiIGlkPSJjZmdfdmVoaWNsZV9rZXkiIHZhbHVlPSInK2VzYyhjZmcudmVoaWNsZUFlc0tleSkrJyIgcGxhY2Vob2xkZXI9IuWhq+WGmeW5tuS/neWtmOWQjuaJjeiDveS9v+eUqOS6keerr+W8gOmUgS/lhbPplIEiIGF1dG9jb21wbGV0ZT0ib2ZmIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCI+PGRpdiBjbGFzcz0iaGludCI+55So5LqO5byAL+WFs+mUgeaKpeaWhyBBRVMtMjU2LUVDQiDliqDlr4bvvIzlh7rkuo7lronlhajpu5jorqTkuI3lhoXnva7jgII8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic2F2ZUNmZ1VJKCkiPuS/neWtmOmFjee9rjwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0icmVzZXRDZmdVSSgpIj7mgaLlpI3pu5jorqQ8L2J1dHRvbj48L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuekvuWMuuS7u+WKoeW8gOWFszwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCIgc3R5bGU9ImdhcDo4cHgiPicrCiAgc3coImNvbW1fcG9zdCIsIuWPkeW4g+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVQb3N0IT09ZmFsc2UpK3N3KCJjb21tX2xpa2UiLCLngrnotZ7liqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlTGlrZSE9PWZhbHNlKStzdygiY29tbV9jb21tZW50Iiwi6K+E6K665Yqo5oCBIiwi5LiN5Yqg5YiGIixjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSkrc3coImNvbW1fc2hhcmUiLCLliIbkuqvliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSkrc3coImNvbW1fZGVsZXRlIiwi5omn6KGM5ZCO5Yig6Zmk5Yqo5oCBIiwi5riF55CG55eV6L+5Iixjb21tLmVuYWJsZURlbGV0ZSE9PWZhbHNlKSsKICAnPC9kaXY+PGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5YWz6Zet5a+55bqU5byA5YWz5ZCO77yM562+5Yiw6ISa5pys5bCG6Lez6L+H6K+l5Lu75Yqh44CC5L+u5pS55ZCO54K55Ye75LiK5pa544CM5L+d5a2Y6YWN572u44CN55Sf5pWI44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgdmlvIj48L3NwYW4+5omL5py65Y+355m75b2V77yI5YWN5oqT5YyF77yJPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+JysKJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaJi+acuuWPt++8iOaegeaguCBBcHAg57uR5a6a5Y+356CB77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGVsIiBpZD0icGxfcGhvbmUiIHBsYWNlaG9sZGVyPSIxMSDkvY3miYvmnLrlj7ciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55+t5L+h6aqM6K+B56CBPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBsX2NvZGUiIHBsYWNlaG9sZGVyPSI2IOS9jemqjOivgeeggSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8L2Rpdj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiPjxsYWJlbD7nmbvlvZUgQmFzaWMgQXV0aO+8iOWPr+mAie+8jOW3suWGhee9ruaegeaguEFwcOeahGNsaWVudOWHreaNru+8jOS4gOiIrOaXoOmcgOWhq+WGme+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJwbF9iYXNpYyIgcGxhY2Vob2xkZXI9Ium7mOiupOW3suWGhee9ru+8jOeVmeepuuWNs+WPryIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEycHgiIGF1dG9jb21wbGV0ZT0ib2ZmIj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJzZW5kU21zQ29kZSgpIiBpZD0icGxfc2VuZF9idG4iPuiOt+WPlumqjOivgeeggTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJwaG9uZUxvZ2luVUkoKSIgaWQ9InBsX2xvZ2luX2J0biI+55m75b2V5bm25re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JysKJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPueUqOaJi+acuuWPtyArIOefreS/oemqjOivgeeggeeZu+W9le+8jOiHquWKqOiOt+WPliBUb2tlbiDkuI7nlKjmiLdJROW5tuWKoOWFpei0puWPt+WIl+ihqO+8jOWFqOeoi+aXoOmcgOaKk+WMheOAgueZu+W9leaIkOWKn+WQjuiHquWKqOS/neWtmOW5tuWIt+aWsOmhtemdouOAgjwvZGl2PicrCic8L2Rpdj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIbvvIgnK2NmZ0FjY291bnRzLmxlbmd0aCsnIOS4qu+8iTwvaDM+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFkZEFjY291bnRVSSgpIj4rIOa3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0iYWNjTGlzdCI+JysoYWNjUm93c3x8JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjJweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pqC5peg6LSm5Y+377yM54K55Ye744CM5re75Yqg6LSm5Y+344CNPC9kaXY+JykrJzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVBY2NvdW50c1VJKCkiPuS/neWtmOaegeaguOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ub3RlIj48Yj7kvb/nlKjor7TmmI48L2I+PGJyPsK3IFRva2Vu77ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24g5YC85Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIDxjb2RlPkJlYXJlciA8L2NvZGU+IOWJjee8gOOAgjxicj7CtyDojrflj5ZJRO+8muWhq+WFpSBUb2tlbiDlkI7ngrnjgIzojrflj5ZJROOAje+8jOiHquWKqOS7jiBINSBiYXNlSW5mbyAvIEFwcCBzZXR0aW5nIC8g6L2m6L6G5YiX6KGo5o6l5Y+j6Kej5p6Q55So5oi3SUTkuI7mmLXnp7DjgII8YnI+wrcgQmFyayBLZXnvvJror6XotKblj7fnrb7liLDmiJDlip/lkI7mjqjpgIHpgJrnn6XvvIznlZnnqbrkuI3mjqjjgII8YnI+wrcg5o6n6L2m5oyH5Luk77yI5a+76L2mL+m4o+esmy/lnZDlnqsv5byA5YWz6ZSB77yJ5Lya55yf5a6e5pON5L2c6L2m6L6G77yM6ZyA5LqM5qyh56Gu6K6k44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lpIfku73otKblj7fphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZXhwb3J0QmFja3VwVUkoKSI+5LiA6ZSu5a+85Ye65aSH5Lu9PC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJjb3B5QmFja3VwVUkoKSI+5aSN5Yi25aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5aSH5Lu95YaF5a6577yI5YyF5ZCr5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5Y+v5aSN5Yi25L+d5a2Y77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImJhY2t1cEFyZWEiIHJvd3M9IjQiIHJlYWRvbmx5IHBsYWNlaG9sZGVyPSLngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI3nlJ/miJDigKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7mgaLlpI3lpIfku73vvIjnspjotLTlpIfku70gSlNPTiDlkI7ngrnmgaLlpI3vvIzlsIbopobnm5bnjrDmnInotKblj7fkuI7phY3nva7vvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iaW1wb3J0QXJlYSIgcm93cz0iNCIgcGxhY2Vob2xkZXI9IueymOi0tOWkh+S7vSBKU09O4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgb25jbGljaz0iaW1wb3J0QmFja3VwVUkoKSI+5oGi5aSN5aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5aSH5Lu95YyF5ZCr5YWo6YOo6LSm5Y+377yI5pi156ewL+eUqOaIt0lEL1Rva2VuL0JhcmtLZXnvvInkuI7pnaLmnb/phY3nva7vvIjnrb7lkI3lr4bpkqUv56S+5Yy65Lu75Yqh5byA5YWzL+iHquWKqOWIt+aWsOetie+8ieOAguaNouacuuaIlumHjeijheWQjueymOi0tOWNs+WPr+S4gOmUrui/mOWOn++8jOaXoOmcgOmHjeaWsOaKk+WMheWhq+WGmeOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKfQovKiA9PT09PT09PT09PT09PT09PSDmiYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gc2VuZFNtc0NvZGUoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX3NlbmRfYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLlj5HpgIHkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zZW5kQ29kZShwaG9uZSk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTtsZXQgdD02MDtidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjsKICAgIGNvbnN0IGl2PXNldEludGVydmFsKCgpPT57dC0tO2lmKHQ8PTApe2NsZWFySW50ZXJ2YWwoaXYpO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjtidG4uZGlzYWJsZWQ9ZmFsc2U7fWVsc2UgYnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7fSwxMDAwKTsKICB9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuWPkemAgeWksei0pe+8jOivt+ajgOafpee9kee7nCIsImVyciIpO2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7fQp9CmFzeW5jIGZ1bmN0aW9uIHBob25lTG9naW5VSSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgY29kZT0oZWwoInBsX2NvZGUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgYmFzaWM9KGVsKCJwbF9iYXNpYyIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBpZighL14xXGR7MTB9JC8udGVzdChwaG9uZSkpe3RvYXN0KCLor7fovpPlhaXmraPnoa7nmoQxMeS9jeaJi+acuuWPtyIsImVyciIpO3JldHVybjt9CiAgaWYoIWNvZGUpe3RvYXN0KCLor7fovpPlhaXnn63kv6Hpqozor4HnoIEiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfbG9naW5fYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLnmbvlvZXkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5waG9uZUxvZ2luKHBob25lLGNvZGUsYmFzaWMpOwogIGlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IueZu+W9leaIkOWKnyIsIm9rIik7c2V0VGltZW91dCgoKT0+bG9jYXRpb24ucmVsb2FkKCksMTIwMCk7fQogIGVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLnmbvlvZXlpLHotKUiLCJlcnIiKTt9CiAgYnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5bm25re75Yqg6LSm5Y+3IjsKfQpmdW5jdGlvbiBjb2xsZWN0Q2ZnVUkoKXtyZXR1cm57YXBwOnthcHBJZDp2YWwoImNmZ19hcHBfaWQiKSxhcHBTZWNyZXQ6dmFsKCJjZmdfYXBwX3NlY3JldCIpfSxoNTp7YXBwSWQ6dmFsKCJjZmdfaDVfaWQiKSxhcHBTZWNyZXQ6dmFsKCJjZmdfaDVfc2VjcmV0Iil9LHZlaGljbGVBZXNLZXk6dmFsKCJjZmdfdmVoaWNsZV9rZXkiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyh2YWwoImNmZ19yZWZyZXNoIikpLHNlcnZlckJhc2U6Z2V0Q2ZnKCkuc2VydmVyQmFzZXx8IiIsYXV0b1NpZ25pbjplbCgiYXV0b19zaWduaW4iKT9lbCgiYXV0b19zaWduaW4iKS5jaGVja2VkOmZhbHNlLGF1dG9TaWduaW5UaW1lOih2YWwoImNmZ19zaWduaW5fdGltZSIpfHwiMDc6MDAiKSx2ZWhpY2xlTW9uaXRvcjplbCgidmVoaWNsZV9tb25pdG9yIik/ZWwoInZlaGljbGVfbW9uaXRvciIpLmNoZWNrZWQ6ZmFsc2UsY29tbXVuaXR5OntlbmFibGVQb3N0OmVsKCJjb21tX3Bvc3QiKS5jaGVja2VkLGVuYWJsZUxpa2U6ZWwoImNvbW1fbGlrZSIpLmNoZWNrZWQsZW5hYmxlQ29tbWVudDplbCgiY29tbV9jb21tZW50IikuY2hlY2tlZCxlbmFibGVTaGFyZTplbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQsZW5hYmxlRGVsZXRlOmVsKCJjb21tX2RlbGV0ZSIpLmNoZWNrZWR9fX0KZnVuY3Rpb24gdmFsKGlkKXtjb25zdCBlPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtyZXR1cm4gZT9lLnZhbHVlOiIifQpmdW5jdGlvbiBlbChpZCl7cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKX0KYXN5bmMgZnVuY3Rpb24gc2F2ZUNmZ1VJKCl7Y29uc3QgYz1jb2xsZWN0Q2ZnVUkoKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVDb25maWcoYyk7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpe2FwcGx5UmVtb3RlQ2ZnKGMpO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfXRvYXN0KCLphY3nva7lt7Lkv53lrZgiLCJvayIpO3N0YXJ0QXV0b1JlZnJlc2goYy5hdXRvUmVmcmVzaFNlYyk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KZnVuY3Rpb24gcmVzZXRDZmdVSSgpe2VsKCJjZmdfYXBwX2lkIikudmFsdWU9REVGQVVMVF9DRkcuYXBwLmFwcElkO2VsKCJjZmdfYXBwX3NlY3JldCIpLnZhbHVlPURFRkFVTFRfQ0ZHLmFwcC5hcHBTZWNyZXQ7ZWwoImNmZ19oNV9pZCIpLnZhbHVlPURFRkFVTFRfQ0ZHLmg1LmFwcElkO2VsKCJjZmdfaDVfc2VjcmV0IikudmFsdWU9REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0O2VsKCJjZmdfdmVoaWNsZV9rZXkiKS52YWx1ZT0iIjtlbCgiY2ZnX3JlZnJlc2giKS52YWx1ZT02MDtpZihlbCgiYXV0b19zaWduaW4iKSllbCgiYXV0b19zaWduaW4iKS5jaGVja2VkPWZhbHNlO2VsKCJjZmdfc2lnbmluX3RpbWUiKS52YWx1ZT0iMDc6MDAiO2VsKCJjb21tX3Bvc3QiKS5jaGVja2VkPXRydWU7ZWwoImNvbW1fbGlrZSIpLmNoZWNrZWQ9dHJ1ZTtlbCgiY29tbV9jb21tZW50IikuY2hlY2tlZD10cnVlO2VsKCJjb21tX3NoYXJlIikuY2hlY2tlZD10cnVlO2VsKCJjb21tX2RlbGV0ZSIpLmNoZWNrZWQ9dHJ1ZTt0b2FzdCgi5bey5oGi5aSN6buY6K6k77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfQpmdW5jdGlvbiBhZGRBY2NvdW50VUkoKXtjZmdBY2NvdW50cy5wdXNoKHt1c2VyTmFtZToiIix1c2VySWQ6IiIsdG9rZW46IiIsYmFya0tleToiIn0pO2NvbnN0IGxpc3Q9ZWwoImFjY0xpc3QiKTtjb25zdCBpZHg9Y2ZnQWNjb3VudHMubGVuZ3RoLTE7Y29uc3QgaHRtbD0nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsn77yI5paw77yJPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSI+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QmFyayDpgJrnn6UgS2V577yI6YCJ5aGr77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19iYXJrXycraWR4KyciIHBsYWNlaG9sZGVyPSJCYXJrIEtleSDmiJboh6rlu7ogaHR0cHM6Ly/ln5/lkI0vS2V5Ij48L2Rpdj48L2Rpdj4nO2lmKGxpc3QucXVlcnlTZWxlY3RvcigiLmFjYy1lZGl0Iil8fGxpc3QucXVlcnlTZWxlY3RvcigiW3N0eWxlKj0ndGV4dC1hbGlnbiddIikpe2xpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCJiZWZvcmVlbmQiLGh0bWwpfWVsc2V7bGlzdC5pbm5lckhUTUw9aHRtbH19CmZ1bmN0aW9uIGRlbGV0ZUFjY291bnRVSShpZHgpe2NvbnN0IHJvdz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWNjLWVkaXRbZGF0YS1pPSInK2lkeCsnIl0nKTtpZihyb3cpe3Jvdy5yZW1vdmUoKTtjZmdBY2NvdW50cy5zcGxpY2UoaWR4LDEpO3RvYXN0KCLlt7LliKDpmaTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9fQpmdW5jdGlvbiBjb2xsZWN0QWNjb3VudHNVSSgpe2NvbnN0IHJvd3M9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiI2FjY0xpc3QgLmFjYy1lZGl0Iik7Y29uc3QgbGlzdD1bXTtyb3dzLmZvckVhY2gocm93PT57Y29uc3QgaT1yb3cuZ2V0QXR0cmlidXRlKCJkYXRhLWkiKTtjb25zdCB0b2tlbj1lbCgiYWNjX3Rva2VuXyIraSk/LnZhbHVlfHwiIjtpZih0b2tlbi50cmltKCkpe2xpc3QucHVzaCh7dXNlck5hbWU6ZWwoImFjY19uYW1lXyIraSk/LnZhbHVlfHwiIix1c2VySWQ6ZWwoImFjY191aWRfIitpKT8udmFsdWV8fCIiLHRva2VuOmNsZWFuVG9rZW4odG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGVsKCJhY2NfYmFya18iK2kpPy52YWx1ZXx8IiIpfSl9fSk7cmV0dXJuIGxpc3R9CmFzeW5jIGZ1bmN0aW9uIHNhdmVBY2NvdW50c1VJKCl7Y29uc3QgbGlzdD1jb2xsZWN0QWNjb3VudHNVSSgpLm1hcChhPT4oe3VzZXJOYW1lOihhLnVzZXJOYW1lfHwiIikudHJpbSgpLHVzZXJJZDooYS51c2VySWR8fCIiKS50cmltKCksdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXkpfSkpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUFjY291bnRzKGxpc3QpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKVNUQVRFLnBhbmVsQWNjb3VudHM9bGlzdDt0b2FzdCgi5p6B5qC46LSm5Y+35bey5L+d5a2YIiwib2siKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQphc3luYyBmdW5jdGlvbiBmZXRjaFVzZXJJZFVJKGlkeCl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihlbCgiYWNjX3Rva2VuXyIraWR4KT8udmFsdWV8fCIiKTtjb25zdCBidG49ZWwoInVpZEJ0bl8iK2lkeCk7aWYoIXRva2VuKXt0b2FzdCgi6K+35YWI5aGr5YaZIFRva2VuIiwiZXJyIik7cmV0dXJufWJ0bi50ZXh0Q29udGVudD0i6I635Y+W5Lit4oCmIjtidG4uZGlzYWJsZWQ9dHJ1ZTtjb25zdCBkPWF3YWl0IEJhY2tlbmQuZ2V0VXNlcmlkKHRva2VuKTtpZihkJiZkLm9rJiZkLnVzZXJJZCl7aWYoZWwoImFjY191aWRfIitpZHgpKWVsKCJhY2NfdWlkXyIraWR4KS52YWx1ZT1kLnVzZXJJZDtpZihkLnVzZXJOYW1lJiZlbCgiYWNjX25hbWVfIitpZHgpJiYhZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZSllbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlPWQudXNlck5hbWU7dG9hc3QoIuiOt+WPluaIkOWKn++8miIrKGQudXNlck5hbWV8fGQudXNlcklkKSwib2siKX1lbHNle3RvYXN0KCLojrflj5blpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLmnKrnn6XplJnor68iKSwiZXJyIil9YnRuLnRleHRDb250ZW50PSLojrflj5ZJRCI7YnRuLmRpc2FibGVkPWZhbHNlfQoKLyogPT09PT09PT09PT09PT09PT0g5aSH5Lu9IC8g5oGi5aSNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGV4cG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWwpe3RvYXN0KCLnlYzpnaLmnKrlsLHnu6oiLCJlcnIiKTtyZXR1cm59ZWwudmFsdWU9IueUn+aIkOS4reKApiI7QmFja2VuZC5iYWNrdXAoKS50aGVuKGQ9PntpZihkJiZkLm9rKXtlbC52YWx1ZT1KU09OLnN0cmluZ2lmeShkLG51bGwsMik7dG9hc3QoIuWkh+S7veW3sueUn+aIkO+8jOWPr+WkjeWItuS/neWtmCIsIm9rIil9ZWxzZXtlbC52YWx1ZT0iIjt0b2FzdCgi5a+85Ye65aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5peg5rOV6L+e5o6l6ISa5pys5ZCO56uvIiksImVyciIpfX0pfQpmdW5jdGlvbiBjb3B5QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlKXt0b2FzdCgi6K+35YWI54K55Ye744CM5LiA6ZSu5a+85Ye65aSH5Lu944CNIiwiZXJyIik7cmV0dXJufWlmKG5hdmlnYXRvci5jbGlwYm9hcmQmJm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KXtuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChlbC52YWx1ZSkudGhlbigoKT0+dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIiksKCk9PntlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfSl9ZWxzZXtlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfX0KZnVuY3Rpb24gaW1wb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlLnRyaW0oKSl7dG9hc3QoIuivt+WFiOeymOi0tOWkh+S7veWGheWuuSIsImVyciIpO3JldHVybn1jb25maXJtRGlhbG9nKCLmgaLlpI3lpIfku70iLCLlsIbopobnm5blvZPliY3lhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzmraTmk43kvZzkuI3lj6/mkqTplIDjgIIiLCJpbXBvcnRCYWNrdXBOb3ciKX0KYXN5bmMgZnVuY3Rpb24gaW1wb3J0QmFja3VwTm93KCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtjb25zdCB2PWVsP2VsLnZhbHVlLnRyaW0oKToiIjtpZighdil7dG9hc3QoIuWkh+S7veWGheWuueS4uuepuiIsImVyciIpO3JldHVybn1jb25zdCBkPWF3YWl0IEJhY2tlbmQucmVzdG9yZUJhY2t1cCh2KTtpZihkJiZkLm9rKXt0b2FzdCgi5oGi5aSN5oiQ5Yqf77yaIisoZC5jb3VudHx8MCkrIiDkuKrotKblj7ciLCJvayIpO2lmKGlzUHJveHlNb2RlKCkpe1NUQVRFLnBhbmVsQWNjb3VudHM9W107U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9U1RBVEUuZGF0YT1bXTtyZW5kZXJDZmcoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuaBouWkjeWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuWkh+S7veWGheWuueagvOW8j+mUmeivryIpLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOa8lOekuuaVsOaNru+8iD9kZW1vIOmihOiniOeUqO+8jOS4jeiBlOe9ke+8iSA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBERU1PX0RBVEE9Wwp7dXNlck5hbWU6IumYv+azvSIsdXNlcklkOiIyMDI1MTAwOTEyMzQ1Njc4IixzY29yZToxMjg4MCxzaWduZWRUb2RheTp0cnVlLGNvbnRpbnVlRGF5czo0Mix0b2RheVNjb3JlOjEyLHNpZ25Db3VudDozNix0b2tlblZhbGlkOnRydWUsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOnRydWUsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTp0cnVlLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsYmF0dGVyeVBlcmNlbnQ6NzYscmVzaWR1YWxSYW5nZUttOjYzLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6ODQuNSxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MjYsZnJvbnRQcmVzc3VyZToiMi4zNWJhciIscmVhclByZXNzdXJlOiIyLjQwYmFyIixmcm9udFRlbXA6IjMxwrBDIixyZWFyVGVtcDoiMzLCsEMiLHRvZGF5RGlzdGFuY2U6MTIuNix0b2RheUR1cmF0aW9uOjM0LHRvZGF5TWF4U3BlZWQ6NTYsbGFzdFJpZGVNaWxlYWdlOjguMixvbmxpbmU6IjEiLHBvd2VyU3RhdHVzOiIwIixsb2NrU3RhdGU6IjEiLGN1c2hpb25TdGF0ZToiMCIsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6Iixsb2NhdGlvblRpbWU6IjA4OjEyIixsb25naXR1ZGU6MTE5LjU1MDksbGF0aXR1ZGU6MjYuNjY1NCxzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9fSwKe3VzZXJOYW1lOiLlsI/mu6EiLHVzZXJJZDoiMjAyNjAxMDExMTIyMzM0NCIsc2NvcmU6NTIwLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czozLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6OSx0b2tlblZhbGlkOmZhbHNlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIixiYXR0ZXJ5UGVyY2VudDoyMyxyZXNpZHVhbFJhbmdlS206MjAscmFuZ2VFc3RpbWF0ZWQ6dHJ1ZSxjaGFyZ2VTdGF0ZToi5YWF55S15LitIix2b2x0YWdlOjg2LjIsY3VycmVudDo1LjQsYmF0dGVyeVRlbXA6MzEsZnJvbnRQcmVzc3VyZToiMi4xMGJhciIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxvbmxpbmU6IjAiLHBvd2VyU3RhdHVzOiIxIixsb2NrU3RhdGU6IjAiLGN1c2hpb25TdGF0ZToiMSIsYWRkcmVzczoiIixsb2NhdGlvblRpbWU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIiLHNlcnZpY2VFbmREYXRlOiIifX0KXTsKY29uc3QgREVNT19MT0dTPVsKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTIiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2FpbjoxMixzaWduaW5TY29yZTo2LGJsaW5kQm94U2NvcmU6NixpbnRlcmFjdFNjb3JlOjAsY29udGludWVEYXlzOjQyLHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICs2ICjnp6/liIYpIiwi55uy55uS5pyq6Kej6ZSBKDM2LzMwKSJdfSwKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTUiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ8iLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0sCnt0aW1lOiIyMDI2LTA5LTA5IDIyOjMxOjA1Iix0eXBlOiJ2ZWhpY2xlIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsYWN0aW9uVGV4dDoi5LqR56uv5byA6ZSBIixtZXNzYWdlOiLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiLHN0ZXBzOltdfQpdOwoKLyogPT09PT09PT09PT09PT09PT0g5Yi35pawICYg5Yid5aeL5YyWID09PT09PT09PT09PT09PT09ICovCmxldCBsb2FkaW5nPWZhbHNlOwovLyDlhaXlnLrpl6rlsY/vvJrpppbmrKHmlbDmja7lsLHnu6rvvIjml6DorrrmiJDlip8v5aSx6LSl77yJ5ZCO5reh5Ye656e76ZmkCmZ1bmN0aW9uIGhpZGVTcGxhc2goKXtjb25zdCBzPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzcGxhc2giKTtpZighcylyZXR1cm47cy5jbGFzc0xpc3QuYWRkKCJvdXQiKTtzZXRUaW1lb3V0KCgpPT57aWYocy5wYXJlbnROb2RlKXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzKX0sNDUwKX0KYXN5bmMgZnVuY3Rpb24gcmVmcmVzaEFsbChzaWxlbnQpewogIGlmKGxvYWRpbmcpcmV0dXJuO2xvYWRpbmc9dHJ1ZTsKICBpZighc2lsZW50KXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtpZighU1RBVEUuZGF0YS5sZW5ndGgpZWwuaW5uZXJIVE1MPXNrZWxldG9uSG9tZSgpfQogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXREYXNoYm9hcmQoKTsKICBsb2FkaW5nPWZhbHNlO2hpZGVTcGxhc2goKTsKICBpZihkJiZkLm9rKXtTVEFURS5kYXRhPWQuYWNjb3VudHN8fFtdO1NUQVRFLnRzVGV4dD1mbXRUaW1lKGQudGltZXN0YW1wfHxuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1NUQVRFLnByb3h5PWlzUHJveHlNb2RlKCk7cmVuZGVySG9tZSgpfQogIGVsc2V7Y29uc3QgaGludD1kJiZkLnJhdyYmZC5yYXcuZXJyb3I/bmV0d29ya0hpbnQoZC5yYXcpOiIiO2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mlbDmja7liqDovb3lpLHotKU8L2gzPjxwPicrKGhpbnR8fGVzYygoZCYmZC5lcnJvcil8fCLnvZHnu5zlvILluLjvvIzor7fmo4Dmn6XnvZHnu5zov57mjqUiKSkrJzwvcD48ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ianVzdGlmeS1jb250ZW50OmNlbnRlciI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InJlZnJlc2hBbGwoKSI+6YeN6K+VPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJzd2l0Y2hUYWIoXCdjZmdcJykiPuajgOafpeiuvue9rjwvYnV0dG9uPjwvZGl2PjwvZGl2Pid9Cn0KLyogPT09PT09PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIbpobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFBUPXthY2NJZHg6MCxtb250aDoiIn07CmZ1bmN0aW9uIHB0QWNjb3VudHMoKXtyZXR1cm4gU1RBVEUuZGF0YSYmU1RBVEUuZGF0YS5sZW5ndGg/U1RBVEUuZGF0YTooU1RBVEUucGFuZWxBY2NvdW50c3x8W10pLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCLotKblj7ciLHVzZXJJZDphLnVzZXJJZHx8IiJ9KSl9CmZ1bmN0aW9uIGFjY0NoaXBzSHRtbChwcmVmaXgpewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aClyZXR1cm4iIjsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jaGlwcyI+JytsaXN0Lm1hcCgoYSxpKT0+JzxidXR0b24gY2xhc3M9ImFjYy1jaGlwICcrKGk9PT0ocHJlZml4PT09InB0Ij9QVC5hY2NJZHg6VkguYWNjSWR4KT8nb24nOicnKSsnIiBvbmNsaWNrPSJwaWNrQWNjKFwnJytwcmVmaXgrJ1wnLCcraSsnKSI+Jytlc2MoYS51c2VyTmFtZXx8KCLotKblj7ciKyhpKzEpKSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpKyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIHBpY2tBY2MocHJlZml4LGkpe2lmKHByZWZpeD09PSJwdCIpe1BULmFjY0lkeD1pO3JlbmRlclBvaW50cygpfWVsc2V7VkguYWNjSWR4PWk7VkgudmluPSIiO3JlbmRlclZlaGljbGVQYWdlKCl9fQphc3luYyBmdW5jdGlvbiByZW5kZXJQb2ludHMoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVBvaW50cyIpO2lmKCFlbClyZXR1cm47CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pqC5peg6LSm5Y+3PC9oMz48cD7or7flhYjlnKjpppbpobXliqDovb3mlbDmja7miJblnKjorr7nva7pobXmt7vliqDotKblj7c8L3A+PC9kaXY+JztyZXR1cm59CiAgaWYoUFQuYWNjSWR4Pj1saXN0Lmxlbmd0aClQVC5hY2NJZHg9MDsKICBjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdOwogIGlmKCFhY2MudXNlcklkKXtlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJwdCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuivpei0puWPt+e8uuWwkeeUqOaIt0lEPC9oMz48cD7or7fliLDorr7nva7pobXooaXlhajnlKjmiLdJRDwvcD48L2Rpdj4nO3JldHVybn0KICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJwdCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9veenr+WIhuaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGNvbnN0IG1vbnRoPVBULm1vbnRofHxuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IFtpdCxjYWwsY250XSA9IGF3YWl0IFByb21pc2UuYWxsKFsKICAgIEJhY2tlbmQuaW50ZWdyYWwoYWNjLnVzZXJJZCwxKSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgibW9udGgiLGFjYy51c2VySWQse21vbnRoOm1vbnRofSksCiAgICBCYWNrZW5kLnN1cHBsZW1lbnQoImNvdW50IixhY2MudXNlcklkLHt9KQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgicHQiKTsKICAvLyDmgLvop4gKICBjb25zdCB0b3RhbD1pdCYmaXQudG90YWw/ZGVlcFBpY2soaXQudG90YWwsWyJpbnRlZ3JhbFRvdGFsIiwidG90YWxJbnRlZ3JhbCIsInNjb3JlIiwiaW50ZWdyYWwiLCJ0b3RhbCJdLDQpOiIiOwogIGNvbnN0IGNhcmROdW09Y250JiZjbnQuZGF0YSE9bnVsbD9kZWVwUGljayhjbnQuZGF0YSxbImNvdW50IiwiY2FyZE51bSIsImNhcmRDb3VudCIsIm51bWJlciIsIm51bSJdLDQpOiIiOwogIGxldCBleHBUeHQ9IiI7CiAgaWYoaXQmJkFycmF5LmlzQXJyYXkoaXQuZXhwaXJlKSYmaXQuZXhwaXJlLmxlbmd0aCl7CiAgICBjb25zdCBlMD1pdC5leHBpcmUuZmluZCh4PT5OdW1iZXIoeC5pbnRlZ3JhbFNjb3JlKT4wKXx8aXQuZXhwaXJlWzBdOwogICAgaWYoZTApZXhwVHh0PVN0cmluZyhlMC5leHBpcnlEYXRlU3RyfHwiIikrKE51bWJlcihlMC5pbnRlZ3JhbFNjb3JlKT4wPyIg5Yiw5pyfICIrZTAuaW50ZWdyYWxTY29yZSsiIOWIhiI6IiIpOwogIH0KICBodG1sKz0nPGRpdiBjbGFzcz0icHQtZ3JpZCI+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5b2T5YmN5oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh0b3RhbHx8Ii0tIikrJzwvZGl2PicrKGV4cFR4dD8nPGRpdiBjbGFzcz0ic3ViIj4nK2VzYyhleHBUeHQpKyc8L2Rpdj4nOicnKSsnPC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+6KGl562+5Y2hPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIj4nK2VzYyhjYXJkTnVtfHwiLS0iKSsnPC9kaXY+PGRpdiBjbGFzcz0ic3ViIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIHN0eWxlPSJtYXJnaW4tdG9wOjRweCIgb25jbGljaz0ic3VwR2FpbigpIj7np6/liIblhZHmjaLooaXnrb7ljaE8L2J1dHRvbj48L2Rpdj48L2Rpdj4nCiAgICArJzwvZGl2Pic7CiAgLy8g55uy55uS6L+b5bqm77yIdjIuMTQuMTQg6LW355Sx6aaW6aG16L+B56e76Iez5q2k77yJCiAgY29uc3QgY29udD1OdW1iZXIoYWNjLmNvbnRpbnVlRGF5c3x8MCk7CiAgY29uc3QgYkRheT1jb250PT09MD8wOigoY29udC0xKSUzMCkrMTtjb25zdCBiUm91bmQ9Y29udD09PTA/MDpNYXRoLmNlaWwoY29udC8zMCk7Y29uc3QgYlBjdD1NYXRoLnJvdW5kKChiRGF5LzMwKSoxMDApOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJibGluZCIgc3R5bGU9Im1hcmdpbjowIDAgMTJweCI+PGRpdiBjbGFzcz0iYmxpbmQtdG9wIj48c3Bhbj7nm7Lnm5Lov5vluqbvvIjnrKwnK2JSb3VuZCsn6L2u77yJPC9zcGFuPjxzcGFuIGNsYXNzPSJyIG51bSI+JytiRGF5KycgLyAzMCDCtyAnK2JQY3QrJyUgwrcg6L+e562+ICcrY29udCsnIOWkqTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJibGluZC1iYXIiPjxkaXYgY2xhc3M9ImJsaW5kLWZpbGwiIHN0eWxlPSJ3aWR0aDonK2JQY3QrJyUiPjwvZGl2PjwvZGl2PjwvZGl2Pic7CiAgLy8g562+5Yiw5pel5Y6GCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuY2hlY2srJ+etvuWIsOaXpeWOhiDCtyAnK2VzYyhtb250aCkrJzwvaDQ+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJwdE1vbnRoU2hpZnQoLTEpIj7kuIrmnIg8L2J1dHRvbj48L2Rpdj4nOwogIGNvbnN0IGRheXM9KGNhbCYmY2FsLmRhdGEmJmNhbC5kYXRhLm5vd1NpZ25EZXRhaWxWb3MpfHxbXTsKICBpZihkYXlzLmxlbmd0aCl7CiAgICBodG1sKz1jYWxIdG1sKGRheXMsbW9udGgsYWNjLnVzZXJJZCk7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHg7cGFkZGluZzo4cHggMCI+JysoY2FsJiZjYWwubWVzc2FnZT9lc2MoY2FsLm1lc3NhZ2UpOiLml6XljobliqDovb3lpLHotKXvvIjlj6/og73pmZDmtYHvvIznqI3lkI7lho3or5XvvIkiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g56ev5YiG5rWB5rC0CiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfnp6/liIbmtYHmsLQ8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb3JlRmxvdygpIj7liqDovb3mm7TlpJo8L2J1dHRvbj48L2Rpdj48ZGl2IGlkPSJwdEZsb3ciPic7CiAgaHRtbCs9Zmxvd0h0bWwoKGl0JiZpdC5kZXRhaWwpfHxbXSk7CiAgaHRtbCs9JzwvZGl2PjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPuenr+WIhuaVsOaNruadpeiHquaegeaguOWunuaXtiBBUEkgwrcg6KGl562+6ZmQIDMwIOWkqeWGhea8j+etvu+8jOavj+asoea2iOiAlyAxIOW8oOihpeetvuWNoTwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7CiAgUFQuZmxvd1BhZ2U9MTsKfQpmdW5jdGlvbiBjYWxIdG1sKGRheXMsbW9udGgsdXNlcklkKXsKICBjb25zdCB5bT1tb250aC5zcGxpdCgiLSIpO2NvbnN0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSk7CiAgY29uc3QgZmlyc3Q9bmV3IERhdGUoeSxtLTEsMSkuZ2V0RGF5KCk7CiAgY29uc3QgZGltPW5ldyBEYXRlKHksbSwwKS5nZXREYXRlKCk7CiAgY29uc3QgdG9kYXk9bmV3IERhdGUoKTtjb25zdCB0U3RyPXRvZGF5LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyh0b2RheS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKHRvZGF5LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGxldCBoPSc8ZGl2IGNsYXNzPSJjYWwtZ3JpZCI+JzsKICBbIuaXpSIsIuS4gCIsIuS6jCIsIuS4iSIsIuWbmyIsIuS6lCIsIuWFrSJdLmZvckVhY2godz0+e2grPSc8ZGl2IGNsYXNzPSJjYWwtd2QiPicrdysnPC9kaXY+J30pOwogIGZvcihsZXQgaT0wO2k8Zmlyc3Q7aSsrKWgrPSc8ZGl2IGNsYXNzPSJjYWwtZCBibGFuayI+PC9kaXY+JzsKICBmb3IobGV0IGQ9MTtkPD1kaW07ZCsrKXsKICAgIGNvbnN0IGRzPW1vbnRoKyItIitTdHJpbmcoZCkucGFkU3RhcnQoMiwiMCIpOwogICAgY29uc3QgZW50cnk9ZGF5cy5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTsKICAgIGNvbnN0IHNpZ25lZD1lbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApOwogICAgY29uc3QgaXNUb2RheT1kcz09PXRTdHI7CiAgICBjb25zdCBmdXR1cmU9ZHM+dFN0cjsKICAgIGxldCBjbHM9ImNhbC1kIisoc2lnbmVkPyIgc2lnbmVkIjooZnV0dXJlPyIgZnV0dXJlIjooZW50cnk/IiBtaXNzIjoiIikpKTsKICAgIGlmKGlzVG9kYXkpY2xzKz0iIHRvZGF5IjsKICAgIGNvbnN0IGNsaWNrYWJsZT0hc2lnbmVkJiYhZnV0dXJlJiZlbnRyeTsKICAgIGgrPSc8ZGl2IGNsYXNzPSInK2NscysnIiAnKyhjbGlja2FibGU/J3N0eWxlPSJjdXJzb3I6cG9pbnRlciIgb25jbGljaz0ic3VwQ29uc3VtZShcJycrZHMrJ1wnLFwnJytlc2ModXNlcklkKSsnXCcpIic6JycpKyc+JwogICAgICArJzxzcGFuPicrZCsnPC9zcGFuPicKICAgICAgKyc8c3BhbiBjbGFzcz0iZG90Ij4nKyhzaWduZWQ/IuKckyI6KGZ1dHVyZT8iIjooZW50cnk/Iua8jyI6IiIpKSkrJzwvc3Bhbj4nCiAgICAgICsnPC9kaXY+JzsKICB9CiAgaCs9JzwvZGl2Pic7CiAgaCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPueCueWHu+OAjOa8j+OAjeaXpeacn+S9v+eUqOihpeetvuWNoeihpeetvu+8iOmcgOWFiOacieihpeetvuWNoe+8iTwvZGl2Pic7CiAgcmV0dXJuIGg7Cn0KZnVuY3Rpb24gZmxvd0h0bWwobGlzdCl7CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiAnPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHg7cGFkZGluZzo4cHggMCI+5pqC5peg5rWB5rC06K6w5b2VPC9kaXY+JzsKICByZXR1cm4gbGlzdC5tYXAoeD0+ewogICAgY29uc3Qgc2M9TnVtYmVyKHguaW50ZWdyYWxTY29yZSl8fDA7CiAgICByZXR1cm4gJzxkaXYgY2xhc3M9ImZsb3ctaXRlbSI+PGRpdj48ZGl2IGNsYXNzPSJubSI+Jytlc2MoeC5uYW1lfHwi56ev5YiG5Y+Y5YqoIikrJzwvZGl2PjxkaXYgY2xhc3M9InRtIj4nK2VzYyh4Lm15RGF0ZVN0cnx8eC5jcmVhdGVEYXRlU3RyfHwiIikrJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9InNjIG51bSAnKyhzYz49MD8icGx1cyI6Im1pbnVzIikrJyI+Jysoc2M+PTA/IisiOiIiKStzYysnPC9kaXY+PC9kaXY+JzsKICB9KS5qb2luKCIiKTsKfQphc3luYyBmdW5jdGlvbiBwdE1vcmVGbG93KCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgUFQuZmxvd1BhZ2U9KFBULmZsb3dQYWdlfHwxKSsxOwogIGNvbnN0IGl0PWF3YWl0IEJhY2tlbmQuaW50ZWdyYWwoYWNjLnVzZXJJZCxQVC5mbG93UGFnZSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0RmxvdyIpOwogIGlmKGVsJiZpdCYmQXJyYXkuaXNBcnJheShpdC5kZXRhaWwpJiZpdC5kZXRhaWwubGVuZ3RoKWVsLmlubmVySFRNTCs9Zmxvd0h0bWwoaXQuZGV0YWlsKTsKICBlbHNlIHRvYXN0KCLmsqHmnInmm7TlpJrkuoYiLCJpbmZvIik7Cn0KZnVuY3Rpb24gcHRNb250aFNoaWZ0KGRpcil7CiAgY29uc3QgY3VyPVBULm1vbnRofHxuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IHltPWN1ci5zcGxpdCgiLSIpO2xldCB5PU51bWJlcih5bVswXSksbT1OdW1iZXIoeW1bMV0pK2RpcjsKICBpZihtPDEpe209MTI7eS0tfWlmKG0+MTIpe209MTt5Kyt9CiAgUFQubW9udGg9eSsiLSIrU3RyaW5nKG0pLnBhZFN0YXJ0KDIsIjAiKTsKICByZW5kZXJQb2ludHMoKTsKfQphc3luYyBmdW5jdGlvbiBzdXBDb25zdW1lKGRhdGUsdXNlcklkKXsKICBjb25maXJtRGlhbG9nKCLnp6/liIbooaXnrb4iLCLkvb/nlKggMSDlvKDooaXnrb7ljaHooaXnrb4gIitkYXRlKyIg77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuihpeetvuS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJjb25zdW1lIix1c2VySWQse2RhdGVUaW1lOmRhdGV9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLooaXnrb7miJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi6KGl562+5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTooaXnrb4iKTsKfQphc3luYyBmdW5jdGlvbiBzdXBHYWluKCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uZmlybURpYWxvZygi5YWR5o2i6KGl562+5Y2hIiwi5L2/55So56ev5YiG5YWR5o2iIDEg5byg6KGl562+5Y2h77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuWFkeaNouS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJnYWluIixhY2MudXNlcklkLHt9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLlhZHmjaLmiJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi5YWR5o2i5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTlhZHmjaIiKTsKfQoKLyogPT09PT09PT09PT09PT09PT0gdjIuMTQuOSDovabovobpobXvvIjnm5HmjqcgKyDovabmjqfmianlsZUgKyDkv6Hmga/kuK3lv4PvvIkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFZIPXthY2NJZHg6MCx2aW46IiIsY3A6IiIsZ2VhcjoiIixsb2NrVHlwZToiMSJ9Owphc3luYyBmdW5jdGlvbiByZW5kZXJWZWhpY2xlUGFnZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlVmVoaWNsZSIpO2lmKCFlbClyZXR1cm47CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pqC5peg6LSm5Y+3PC9oMz48cD7or7flhYjlnKjpppbpobXliqDovb3mlbDmja7miJblnKjorr7nva7pobXmt7vliqDotKblj7c8L3A+PC9kaXY+JztyZXR1cm59CiAgaWYoVkguYWNjSWR4Pj1saXN0Lmxlbmd0aClWSC5hY2NJZHg9MDsKICBjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdOwogIGlmKCFhY2MudXNlcklkKXtlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuivpei0puWPt+e8uuWwkeeUqOaIt0lEPC9oMz48L2Rpdj4nO3JldHVybn0KICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJ2aCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9vei9pui+huaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGxldCBtb249YXdhaXQgQmFja2VuZC52ZWhpY2xlTW9uaXRvcihhY2MudXNlcklkLCIiKTsKICBjb25zdCB2ZWhMaXN0PShtb24mJkFycmF5LmlzQXJyYXkobW9uLnZlaGljbGVzKSk/bW9uLnZlaGljbGVzOltdOwogIGlmKFZILnZpbiYmbW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCYmbW9uLnNuYXBzaG90LnZpbiE9PVZILnZpbil7CiAgICBjb25zdCBtb24yPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCxWSC52aW4pOwogICAgaWYobW9uMiYmbW9uMi5vayl7bW9uMi52ZWhpY2xlcz12ZWhMaXN0O21vbj1tb24yfQogIH0KICBjb25zdCBbb3B0cyxpbmZvXT1hd2FpdCBQcm9taXNlLmFsbChbCiAgICBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KHthY3Rpb246Im9wdGlvbnMiLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifSksCiAgICBCYWNrZW5kLmluZm9DZW50ZXIoYWNjLnVzZXJJZCxWSC52aW58fCIiKQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgidmgiKTsKICAvLyDovabovobpgInmi6nvvIjlpJrovabvvIkKICBpZih2ZWhMaXN0Lmxlbmd0aD4xKXsKICAgIGNvbnN0IGN1clZpbj1WSC52aW58fChtb24mJm1vbi5zbmFwc2hvdD9tb24uc25hcHNob3QudmluOnZlaExpc3RbMF0udmluTm8pOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im9wdC1yb3ciPicrdmVoTGlzdC5tYXAodj0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKGN1clZpbj09PXYudmluTm8/J29uJzonJykrJyIgb25jbGljaz0iVkgudmluPVwnJytlc2Modi52aW5ObykrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrZXNjKHYudmVoaWNsZU5hbWV8fHYudmluTm8pKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKICB9CiAgLy8g54q25oCB55uR5o6n5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuY2FyKyfovabovobnirbmgIE8L2g0PjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJzaG93VmVoaWNsZURldGFpbCgnK1ZILmFjY0lkeCsnKSI+6K+m5oOFPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZW5kZXJWZWhpY2xlUGFnZSgpIj7liLfmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JzsKICBpZihtb24mJm1vbi5vayYmbW9uLnNuYXBzaG90KXsKICAgIGNvbnN0IHNuPW1vbi5zbmFwc2hvdDsKICAgIGNvbnN0IHNvY0NvbD1zbi5zb2M8PTIwPyJ2YXIoLS1lcnIpIjpzbi5zb2M8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLW9rKSI7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9meeUtemHjzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nKyhzbi5zb2MhPW51bGw/c24uc29jKyIlIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWJqeS9mee7reiIqjwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrKHNuLnJhbmdlIT1udWxsP3NuLnJhbmdlKyIga20iOiItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+6b6Z5aS06ZSBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nKyhzbi5oZWFkTG9jaz09PSIxIj8i5bey6ZSBIjoi5pyq6ZSBIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7lnKjnur/nirbmgIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjonKyhzbi5vZmZsaW5lPyJ2YXIoLS1lcnIpIjoidmFyKC0tb2spIikrJyI+Jysoc24ub2ZmbGluZT8i56a757q/77yIPjMw5YiG6ZKf5pyq5LiK5oql77yJIjoi5Zyo57q/IikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnIDlkI7kuIrmiqU8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKSI+Jytlc2Moc24ucmVmcmVzaFRpbWV8fCItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKG1vbiYmKG1vbi5lcnJvcnx8bW9uLm1lc3NhZ2UpKXx8IuW/q+eFp+iOt+WPluWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyDovabovobmjqfliLbljaHvvIjku47pppbpobXov4Hnp7vov4fmnaXvvIkKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9pui+huaOp+WItjwvaDQ+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJjdHJsLWdyaWQiPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJmaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdmaW5kXCcsdGhpcykiPicrSS5iZWxsKyflr7vovaY8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0ibG91ZEZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvdWRGaW5kXCcsdGhpcykiPicrSS52b2wrJ+m4o+esmzwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJjdXNoaW9uIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdjdXNoaW9uXCcsdGhpcykiPicrSS5zZWF0KyflnZDlnqs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIHVubG9jayIgZGF0YS1hY3Q9InVubG9jayIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwndW5sb2NrXCcsdGhpcykiPicrSS51bmxvY2srJ+W8gOmUgTwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gbG9jayIgZGF0YS1hY3Q9ImxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2xvY2tcJyx0aGlzKSI+JytJLmxvY2srJ+WFs+mUgTwvYnV0dG9uPicKICAgICsnPC9kaXY+PC9kaXY+JzsKICAvLyDovabmjqfmianlsZXljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+i9puaOp+aJqeWxlTwvaDQ+PC9kaXY+JzsKICBjb25zdCBjcHM9KG9wdHMmJkFycmF5LmlzQXJyYXkob3B0cy5jaGFyZ2VQb3dlcikpP29wdHMuY2hhcmdlUG93ZXI6W107CiAgY29uc3QgZ2VhcnM9KG9wdHMmJkFycmF5LmlzQXJyYXkob3B0cy5nZWFycykpP29wdHMuZ2VhcnM6W107CiAgaWYoY3BzLmxlbmd0aCl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1ib3R0b206NHB4Ij7lhYXnlLXlip/njofvvIhX77yJPC9kaXY+PGRpdiBjbGFzcz0ib3B0LXJvdyI+JwogICAgICArY3BzLm1hcChvPT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoVkguY3A9PT1vLmtleT8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC5jcD1cJycrZXNjKG8ua2V5KSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2Moby5rZXkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdjaGFyZ2VQb3dlclwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgaWYoZ2VhcnMubGVuZ3RoKXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbTo0cHgiPumZkOmAn+aho+S9je+8iGttL2jvvIk8L2Rpdj48ZGl2IGNsYXNzPSJvcHQtcm93Ij4nCiAgICAgICtnZWFycy5tYXAoZz0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKFZILmdlYXI9PT1nPydvbic6JycpKyciIG9uY2xpY2s9IlZILmdlYXI9XCcnK2VzYyhnKSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2MoZykrJzwvYnV0dG9uPicpLmpvaW4oIiIpCiAgICAgICsnPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImV4dFNldChcJ21heFNwZWVkXCcpIj7orr7nva48L2J1dHRvbj48L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyDkv6Hmga/kuK3lv4PljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5iZWxsKyfkv6Hmga/kuK3lv4M8L2g0PjwvZGl2Pic7CiAgaWYoaW5mbyYmaW5mby5vayl7CiAgICBjb25zdCB1bj1pbmZvLnVucmVhZCE9bnVsbD9kZWVwUGljayhpbmZvLnVucmVhZCxbInRvdGFsIiwiY291bnQiLCJ1blJlYWRDb3VudCIsIm51bSJdLDMpOiIiOwogICAgaWYodW4hPT0iIilodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuacquivu+a2iOaBrzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPicrZXNjKHVuKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBjb25zdCBwcml6ZXM9KGluZm8ucHJpemVSZWNvcmRzJiYoaW5mby5wcml6ZVJlY29yZHMucmVjb3Jkc3x8aW5mby5wcml6ZVJlY29yZHMubGlzdHx8aW5mby5wcml6ZVJlY29yZHMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KHByaXplcykmJnByaXplcy5sZW5ndGgpewogICAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo4cHggMCA0cHgiPuebsuebki/kuK3lpZborrDlvZU8L2Rpdj4nOwogICAgICBodG1sKz1wcml6ZXMuc2xpY2UoMCw1KS5tYXAocD0+JzxkaXYgY2xhc3M9ImZsb3ctaXRlbSI+PGRpdj48ZGl2IGNsYXNzPSJubSI+Jytlc2MocC5wcml6ZXNOYW1lfHxwLm5hbWV8fCLlpZblk4EiKSsnPC9kaXY+PGRpdiBjbGFzcz0idG0iPicrZXNjKHAuY3JlYXRlVGltZXx8cC5jcmVhdGVEYXRlfHwiIikrJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9InNjIHBsdXMiIHN0eWxlPSJmb250LXNpemU6MTJweCI+Jytlc2MocC5pbnRlZ3JhbD8oIisiK3AuaW50ZWdyYWwpOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgICB9CiAgICBjb25zdCBjb3Vwb25zPShpbmZvLmNvdXBvbnMmJihpbmZvLmNvdXBvbnMucmVjb3Jkc3x8aW5mby5jb3Vwb25zLmxpc3R8fGluZm8uY291cG9ucykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkoY291cG9ucykmJmNvdXBvbnMubGVuZ3RoKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5LyY5oOg5Yi4PC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytjb3Vwb25zLmxlbmd0aCsnIOW8oDwvc3Bhbj48L2Rpdj4nOwogICAgaWYoaW5mby5vdGEhPW51bGwpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj5PVEEg5Y2H57qnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrKEFycmF5LmlzQXJyYXkoaW5mby5vdGEpJiZpbmZvLm90YS5sZW5ndGg/IuacieaWsOeJiOacrCI6IuW3suaYr+acgOaWsCIpKyc8L3NwYW4+PC9kaXY+JzsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKGluZm8mJihpbmZvLmVycm9yfHxpbmZvLm1lc3NhZ2UpKXx8IuS/oeaBr+S4reW/g+WKoOi9veWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+6L2m5o6n5omp5bGV5oyH5Luk57uP5LqR56uv5LiL5Y+R77yM5ZON5bqU5Y+v6IO96L6D5oWiPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQphc3luYyBmdW5jdGlvbiBleHRTZXQoYWN0aW9uKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtWSC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25zdCBib2R5PXthY3Rpb246YWN0aW9uLHVzZXJJZDphY2MudXNlcklkLHZpbjpWSC52aW58fCIifTsKICBpZihhY3Rpb249PT0iY2hhcmdlUG93ZXIiKXtpZighVkguY3Ape3RvYXN0KCLor7flhYjpgInmi6nlhYXnlLXlip/njociLCJlcnIiKTtyZXR1cm59Ym9keS52YWx1ZT1WSC5jcH0KICBpZihhY3Rpb249PT0ibWF4U3BlZWQiKXtpZighVkguZ2Vhcil7dG9hc3QoIuivt+WFiOmAieaLqemZkOmAn+aho+S9jSIsImVyciIpO3JldHVybn1ib2R5LnZhbHVlPVZILmdlYXJ9CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoYm9keSk7CiAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKfQoKZnVuY3Rpb24gaW5pdCgpewogIGFwcGx5VGhlbWUoKTttb3VudFNpZ25pbkZhYigpOwogIHJlbmRlckNmZygpOwogIGlmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApewogICAgU1RBVEUuZGF0YT1ERU1PX0RBVEE7U1RBVEUudHNUZXh0PWZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1mYWxzZTsKICAgIHJlbmRlckhvbWUoKTtoaWRlU3BsYXNoKCk7cmV0dXJuOwogIH0KICBzdGFydEF1dG9SZWZyZXNoKCk7cmVmcmVzaEFsbChmYWxzZSk7CiAgLy8g5YWc5bqV77ya5p6B56uv5oOF5Ya15LiL6K+35rGC6ZW/5pe26Ze05peg5ZON5bqU77yM6Zeq5bGP5Lmf5LiN6IO95LiA55u05oyh5L2P55WM6Z2iCiAgc2V0VGltZW91dChoaWRlU3BsYXNoLDEyMDAwKTsKfQppbml0KCk7Cjwvc2NyaXB0Pgo8IS0tX19KUzVfXy0tPgo=";
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
          // 官方续航字段充满时常为 0/空，兜底按满电 87km 估算
          const fullRange = snap.range || Math.round(snap.soc * 0.87);
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