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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmbGV4LXNocmluazowO2JveC1zaGFkb3c6MCA2cHggMThweCByZ2JhKDE0LDE0MywxNzgsLjM1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KX0KLmJyYW5kLW1hcmsgc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci5icmFuZC10eHR7ZmxleDoxO21pbi13aWR0aDowfQouYnJhbmQtdHh0IGgxe2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouMnB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweH0KLmJyYW5kLXR4dCBwe2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4fQoudmVyLWNoaXB7Zm9udC1zaXplOjlweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMjIpO3BhZGRpbmc6MXB4IDZweDtib3JkZXItcmFkaXVzOjZweDtsZXR0ZXItc3BhY2luZzouNHB4fQouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy10YXNrc3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7ZmxleC13cmFwOndyYXB9Ci5odC10e2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQzKX0KLmh0LXQub24uZ3tjb2xvcjp2YXIoLS1vayl9Ci5odC10Lm9uLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLXNjb3Jle2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpiYXNlbGluZTtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7ZmxleC13cmFwOndyYXB9Ci5oYy1zY29yZSBie2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEzcHh9Ci5oYy1zY29yZSAucGx1c3tjb2xvcjp2YXIoLS1icmFuZCl9Ci5oYy1zY29yZSAuc3RyZWFre2NvbG9yOnZhcigtLWVycil9Ci5hY2MtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMXB4O21hcmdpbi1ib3R0b206MTRweH0KLmF2YXRhcnt3aWR0aDo0MnB4O2hlaWdodDo0MnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXdlaWdodDo5MDA7Zm9udC1zaXplOjE3cHg7Y29sb3I6IzA0MTIxQztmbGV4LXNocmluazowO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDE0LDE0MywxNzgsLjMpfQouYXZhdGFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTtjb2xvcjojMTQwRjJFO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDEyNCwxMDcsMjQwLC4zKX0KLmFjYy1pbmZve2ZsZXg6MTttaW4td2lkdGg6MH0KLmFjYy1uYW1le2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci5hY2Mtc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci5hY2MtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7ZmxleC1zaHJpbms6MH0KLmFjYy1lcnJ7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tZXJyKTtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjhweCAxMXB4O21hcmdpbi1ib3R0b206MTJweDtmb250LXdlaWdodDo2MDB9Ci5rcGktZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5rcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoua3BpIC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0iO2xpbmUtaGVpZ2h0OjEuMn0KLmtwaSAubHtmb250LXNpemU6OS41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi10b3A6MnB4fQoua3BpLmMxIC52e2NvbG9yOnZhcigtLXR4dCl9IC5rcGkuYzIgLnZ7Y29sb3I6dmFyKC0tb2spfSAua3BpLmMzIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmtwaS5jNCAudntjb2xvcjp2YXIoLS12aW8pfQouYmxpbmR7bWFyZ2luLWJvdHRvbToxNHB4fQouYmxpbmQtdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouYmxpbmQtdG9wIC5ye2NvbG9yOnZhcigtLXZpbyk7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmJsaW5kLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouYmxpbmQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQtdmlvKTt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKTtib3gtc2hhZG93OjAgMCAxMnB4IHJnYmEoMTI0LDEwNywyNDAsLjUpfQoud2Vla3ttYXJnaW4tYm90dG9tOjRweH0KLndlZWstdG9we2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206N3B4fQoud2Vlay1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsMWZyKTtnYXA6NXB4fQouZGF5e2FzcGVjdC1yYXRpbzoxO2JvcmRlci1yYWRpdXM6OXB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjFweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5kYXkgLmR7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bGluZS1oZWlnaHQ6MX0KLmRheSAubXtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjF9Ci5kYXkub2t7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KX0KLmRheS5vayAuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5kYXkudG9kYXl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtib3JkZXI6bm9uZTtib3gtc2hhZG93OjAgNHB4IDEycHggcmdiYSgxNCwxNDMsMTc4LC40KX0KLmRheS50b2RheSAuZHtjb2xvcjojMDQxMjFDfQouZGF5LnRvZGF5IC5te2NvbG9yOnJnYmEoNCwxOCwyOCwuNyl9CgovKiA9PT09PT09PT09PT0gdmVoaWNsZSBzZWN0aW9uID09PT09PT09PT09PSAqLwoudmVoaWNsZXsKICBtYXJnaW4tdG9wOjE0cHg7cGFkZGluZy10b3A6MTRweDtib3JkZXItdG9wOjFweCBkYXNoZWQgdmFyKC0tbGluZTIpO2N1cnNvcjpwb2ludGVyOwp9Ci52ZWhpY2xlLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O21hcmdpbi1ib3R0b206MTNweH0KLnZlaGljbGUtcmluZ3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O2ZsZXgtc2hyaW5rOjB9Ci52ZWhpY2xlLXJpbmcgc3Zne3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7dHJhbnNmb3JtOnJvdGF0ZSgtOTBkZWcpfQoudmVoaWNsZS1yaW5nIC50cmFja3tzdHJva2U6cmdiYSgxNDYsMTcwLDIwNSwuMTQpO2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NX0KLnZlaGljbGUtcmluZyAuYXJje2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpyb3VuZDt0cmFuc2l0aW9uOnN0cm9rZS1kYXNob2Zmc2V0IC44cyB2YXIoLS1lYXNlKSxzdHJva2UgLjVzfQoudmVoaWNsZS1yaW5nIC5wY3R7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci52ZWhpY2xlLW1ldGF7ZmxleDoxO21pbi13aWR0aDowfQoudmVoaWNsZS1uYW1le2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLXZpbntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsU0ZNb25vLVJlZ3VsYXIsTWVubG8sbW9ub3NwYWNlfQoudmluLXNob3d7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tbGVmdDo0cHg7cGFkZGluZzoxcHggNnB4O2JvcmRlci1yYWRpdXM6NXB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KLnZlaGljbGUtYmFkZ2Vze2Rpc3BsYXk6ZmxleDtnYXA6NXB4O21hcmdpbi10b3A6N3B4O2ZsZXgtd3JhcDp3cmFwfQoudnN0YXQtcm93e2Rpc3BsYXk6ZmxleDtnYXA6NnB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206MTJweH0KLnZzdGF0e2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMH0KLnZzdGF0IHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4fQoudnN0YXQub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0Lm9mZntiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO2NvbG9yOnZhcigtLXR4dDIpfQoudnN0YXQubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnZzdGF0LnVubG9ja2Vke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci52c3RhdC5zZWF0e2JhY2tncm91bmQ6dmFyKC0tdmlvU29mdCk7Y29sb3I6dmFyKC0tdmlvKX0KLmNoYXJnZS1iYW5uZXJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4O2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNjEsMjIwLDE1MSwuMjUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjlweCAxMnB4O21hcmdpbi1ib3R0b206MTJweH0KLmNoYXJnZS1iYW5uZXIgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tb2spO2ZsZXgtc2hyaW5rOjB9Ci5jaGFyZ2UtYmFubmVyIC5jdHtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQouY2hhcmdlLWJhbm5lciAuY2V7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tb2spO29wYWNpdHk6Ljg1O21hcmdpbi1sZWZ0OmF1dG87YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjE1KTtwYWRkaW5nOjJweCA5cHg7Ym9yZGVyLXJhZGl1czoxMHB4fQoudmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6N3B4O21hcmdpbi1ib3R0b206MTJweH0KLnZrcGl7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo4cHggMnB4O3RleHQtYWxpZ246Y2VudGVyfQoudmtwaSAudntmb250LXNpemU6MTRweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZrcGkgLmx7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5iYXR0LXRyYWNre2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xKTtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWJvdHRvbToxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5iYXR0LWZpbGx7aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo1cHg7dHJhbnNpdGlvbjp3aWR0aCAuOHMgdmFyKC0tZWFzZSksYmFja2dyb3VuZCAuNXM7Ym94LXNoYWRvdzowIDAgMTBweCBjdXJyZW50Q29sb3J9Ci5tZXRhLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjhweDtmbGV4LXdyYXA6d3JhcDttYXJnaW4tYm90dG9tOjZweH0KLm1ldGEtaXRlbXtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo5cHg7cGFkZGluZzo1cHggOXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLm1ldGEtaXRlbSBzdmd7d2lkdGg6MTJweDtoZWlnaHQ6MTJweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5tZXRhLWl0ZW0gYntjb2xvcjp2YXIoLS10eHQpfQoudmVoaWNsZS1hZGRye2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDttYXJnaW4tdG9wOjRweDttYXJnaW4tYm90dG9tOjEwcHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci52ZWhpY2xlLWFkZHIgLmF0e2ZsZXg6MTttaW4td2lkdGg6MDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci52ZWhpY2xlLWFkZHIgc3Zne3dpZHRoOjEzcHg7aGVpZ2h0OjEzcHg7Y29sb3I6dmFyKC0td2Fybik7ZmxleC1zaHJpbms6MH0KLm1hcC1idG57aGVpZ2h0OjI2cHg7cGFkZGluZzowIDExcHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4zKTtmbGV4LXNocmluazowO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLm1hcC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoubWFwLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi40NTtwb2ludGVyLWV2ZW50czpub25lfQouY3RybC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDUsMWZyKTtnYXA6NnB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTJweH0KLmN0cmwtYnRue2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7cGFkZGluZzoxMHB4IDJweDtib3JkZXItcmFkaXVzOjEzcHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKSxiYWNrZ3JvdW5kIC4ycyxib3JkZXItY29sb3IgLjJzLGNvbG9yIC4yc30KLmN0cmwtYnRuIHN2Z3t3aWR0aDoxN3B4O2hlaWdodDoxN3B4O2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246Y29sb3IgLjJzfQouY3RybC1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTIpfQouY3RybC1idG4udW5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjMpO2NvbG9yOnZhcigtLW9rKX0KLmN0cmwtYnRuLnVubG9jayBzdmd7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4ubG9ja3tib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMyk7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuLmxvY2sgc3Zne2NvbG9yOnZhcigtLWVycil9Ci5jdHJsLWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi41O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWJ0bi5idXN5IHN2Z3thbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoubm8tdmVoaWNsZXtwYWRkaW5nOjE0cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNDcsMTg1LDg1LC4yNSk7Y29sb3I6dmFyKC0td2Fybik7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO3RleHQtYWxpZ246Y2VudGVyfQoKLyogPT09PT09PT09PT09IGVtcHR5ICYgc2tlbGV0b24gPT09PT09PT09PT09ICovCi5lbXB0eXtwYWRkaW5nOjcwcHggMjZweDt0ZXh0LWFsaWduOmNlbnRlcjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmVtcHR5IC5lLWljb257d2lkdGg6NzRweDtoZWlnaHQ6NzRweDttYXJnaW46MCBhdXRvIDE4cHg7Ym9yZGVyLXJhZGl1czoyNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myl9Ci5lbXB0eSAuZS1pY29uIHN2Z3t3aWR0aDozNHB4O2hlaWdodDozNHB4fQouZW1wdHkgaDN7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouZW1wdHkgcHtmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWF4LXdpZHRoOjMwMHB4O21hcmdpbjowIGF1dG8gMjBweH0KLnNre2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDEwMGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNDAlLHJnYmEoMTQ2LDE3MCwyMDUsLjEyKSA1MCUscmdiYSgxNDYsMTcwLDIwNSwuMDYpIDYwJSk7YmFja2dyb3VuZC1zaXplOjIwMCUgMTAwJTthbmltYXRpb246c2sgMS4ycyBsaW5lYXIgaW5maW5pdGU7Ym9yZGVyLXJhZGl1czoxMHB4fQpAa2V5ZnJhbWVzIHNre3Rve2JhY2tncm91bmQtcG9zaXRpb246LTIwMCUgMH19Ci5zay1jYXJke2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCl9Ci5zay1saW5le2hlaWdodDoxM3B4O21hcmdpbi1ib3R0b206MTBweH0uc2stbGluZS53NDB7d2lkdGg6NDAlfS5zay1saW5lLnc2MHt3aWR0aDo2MCV9LnNrLWxpbmUudzgwe3dpZHRoOjgwJX0KLnNrLXJvd3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjhweDttYXJnaW46MTRweCAwfQouc2stY2VsbHtoZWlnaHQ6NTJweDtib3JkZXItcmFkaXVzOjEycHh9Ci5zay1iYXJ7aGVpZ2h0OjE0cHg7Ym9yZGVyLXJhZGl1czo4cHg7bWFyZ2luLXRvcDoxMnB4fQoKLyogPT09PT09PT09PT09IGxvZ3MgPT09PT09PT09PT09ICovCi5sb2ctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7b3ZlcmZsb3c6aGlkZGVuO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6MTBweDtwYWRkaW5nOjE0cHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmxvZy1oZWFkIGgze2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5sb2ctaGVhZCBoMyBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS12aW8pfQoubG9nLWZpbHRlcnN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5sb2ctbGlzdHttYXgtaGVpZ2h0OmNhbGMoMTAwdmggLSAyNjBweCk7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQoubG9nLWl0ZW17cGFkZGluZzoxMnB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDcpO2FuaW1hdGlvbjpjYXJkLWluIC4zcyB2YXIoLS1lYXNlKSBib3RofQoubG9nLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5sb2ctdGltZXtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tYm90dG9tOjNweDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoubG9nLW1haW57ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2ZvbnQtc2l6ZToxM3B4fQoubG9nLXVzZXJ7Zm9udC13ZWlnaHQ6ODAwfQoubG9nLXJlc3tmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spfQoubG9nLXJlcy5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KLmxvZy1zdGVwc3ttYXJnaW4tdG9wOjZweDtmb250LXNpemU6MTEuNXB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNztwYWRkaW5nLWxlZnQ6MnB4fQoubG9nLXN0ZXBzIGl7Zm9udC1zdHlsZTpub3JtYWw7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1yaWdodDo1cHh9Ci5sb2ctZW1wdHl7cGFkZGluZzo1MHB4IDIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHh9CgovKiA9PT09PT09PT09PT0gY29uZmlnID09PT09PT09PT09PSAqLwouY2ZnLXBhbmVse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5jZmctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTVweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouY2ZnLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmNmZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4fQouY2ZnLWhlYWQgLmJhcnt3aWR0aDozcHg7aGVpZ2h0OjE1cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZCk7ZmxleC1zaHJpbms6MH0KLmNmZy1oZWFkIC5iYXIuYW1iZXJ7YmFja2dyb3VuZDp2YXIoLS13YXJuKX0gLmNmZy1oZWFkIC5iYXIuZ3JlZW57YmFja2dyb3VuZDp2YXIoLS1vayl9IC5jZmctaGVhZCAuYmFyLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpbyl9Ci5jZmctYm9keXtwYWRkaW5nOjE2cHh9Ci5mb3JtLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMnB4fQouZi1pdGVte21pbi13aWR0aDowfQouZi1pdGVtLmZ1bGx7Z3JpZC1jb2x1bW46MS8tMX0KLmYtaXRlbSBsYWJlbHtkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tYm90dG9tOjZweH0KLmYtaXRlbSAuaGludHtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6NXB4O2xpbmUtaGVpZ2h0OjEuNn0KLmYtaXRlbSAuaGludCBjb2Rle2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO3BhZGRpbmc6MXB4IDVweDtib3JkZXItcmFkaXVzOjVweDtmb250LXNpemU6MTBweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlfQouc3dpdGNoe2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7cGFkZGluZzoxMHB4IDEycHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7Y3Vyc29yOnBvaW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouc3dpdGNoOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk4KX0KLnN3aXRjaCAubGJse2ZvbnQtc2l6ZToxMi41cHg7Zm9udC13ZWlnaHQ6NjAwO2ZsZXg6MX0KLnN3aXRjaCAuc2N7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5zd3twb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDo0NHB4O2hlaWdodDoyNnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjIpO3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzIHZhcigtLWVhc2UpO2ZsZXgtc2hyaW5rOjB9Ci5zdzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MnB4O2xlZnQ6MnB4O3dpZHRoOjIycHg7aGVpZ2h0OjIycHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDojZmZmO3RyYW5zaXRpb246dHJhbnNmb3JtIC4yNXMgdmFyKC0tc3ByaW5nKTtib3gtc2hhZG93OjAgMnB4IDZweCByZ2JhKDAsMCwwLC4zNSl9Ci5zd2l0Y2ggaW5wdXR7ZGlzcGxheTpub25lfQouc3dpdGNoIGlucHV0OmNoZWNrZWQrLnN3e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCl9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3c6OmFmdGVye3RyYW5zZm9ybTp0cmFuc2xhdGVYKDE4cHgpfQouYWNjLWVkaXR7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE0cHg7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtaGVhZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi1ib3R0b206MTJweH0KLmFjYy1lZGl0LXRpdGxle2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5hY2MtZWRpdC10aXRsZSAubnt3aWR0aDoyNHB4O2hlaWdodDoyNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjkwMH0KLmFjYy1lZGl0LWhlYWQgLmFjdHN7ZGlzcGxheTpmbGV4O2dhcDo2cHh9Ci5idG4tcm93e2Rpc3BsYXk6ZmxleDtnYXA6MTBweDttYXJnaW4tdG9wOjE2cHg7ZmxleC13cmFwOndyYXB9Ci5idG4tcm93IC5idG57ZmxleDoxO21pbi13aWR0aDoxMjBweH0KLmNmZy1ub3Rle2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmc6MTJweCAxNHB4O2JhY2tncm91bmQ6cmdiYSgyNDcsMTg1LDg1LC4wNyk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjE4KTtib3JkZXItcmFkaXVzOjEycHg7bWFyZ2luLXRvcDoxMnB4fQouY2ZnLW5vdGUgYntjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSB0YWJiYXIgPT09PT09PT09PT09ICovCm5hdi50YWJiYXJ7CiAgcG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDo2MDsKICBkaXNwbGF5OmZsZXg7cGFkZGluZzo4cHggMTBweCBjYWxjKDhweCArIHZhcigtLXNhZmUtYikpOwogIGJhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuODIpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoMjRweCkgc2F0dXJhdGUoMS42KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpOwogIGJvcmRlci10b3A6MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjEpOwp9Ci50YWJ7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDozcHg7cGFkZGluZzo2cHggMDtib3JkZXItcmFkaXVzOjE0cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO3RyYW5zaXRpb246Y29sb3IgLjJzLHRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci50YWIgc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci50YWI6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci50YWIub257Y29sb3I6dmFyKC0tYnJhbmQpfQoudGFiIC50LWluZHt3aWR0aDoxNHB4O2hlaWdodDozcHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDp0cmFuc3BhcmVudDt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjI1c30KLnRhYi5vbiAudC1pbmR7YmFja2dyb3VuZDp2YXIoLS1icmFuZCl9CgovKiA9PT09PT09PT09PT0gc2hlZXRzICYgdG9hc3QgPT09PT09PT09PT09ICovCi5zaGVldC1iYWNrZHJvcHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTAwO2JhY2tncm91bmQ6cmdiYSg0LDgsMTgsLjU1KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDZweCk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjNzIHZhcigtLWVhc2UpfQouc2hlZXQtYmFja2Ryb3Auc2hvd3tvcGFjaXR5OjE7cG9pbnRlci1ldmVudHM6YXV0b30KLnNoZWV0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO3otaW5kZXg6MTAxO21heC1oZWlnaHQ6ODZ2aDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyx2YXIoLS1jYXJkMiksdmFyKC0tYmcyKSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLWJvdHRvbTpub25lOwogIGJvcmRlci1yYWRpdXM6MjZweCAyNnB4IDAgMDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMDQlKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMzhzIHZhcigtLXNwcmluZyk7CiAgYm94LXNoYWRvdzowIC0xOHB4IDUwcHggcmdiYSgwLDAsMCwuNSl9Ci5zaGVldC5zaG93e3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfQouc2hlZXQtZ3JhYnt3aWR0aDozOHB4O2hlaWdodDo0cHg7Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4zKTttYXJnaW46MTBweCBhdXRvIDRweDtmbGV4LXNocmluazowfQouc2hlZXQtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NnB4IDIwcHggMTJweH0KLnNoZWV0LWhlYWQgaDN7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweH0KLnNoZWV0LWhlYWQgaDMgc3Zne3dpZHRoOjE4cHg7aGVpZ2h0OjE4cHh9Ci5zaGVldC1jbG9zZXt3aWR0aDozMnB4O2hlaWdodDozMnB4O2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2NvbG9yOnZhcigtLXR4dDIpfQouc2hlZXQtY2xvc2U6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5zaGVldC1ib2R5e3BhZGRpbmc6NHB4IDIwcHggMjRweDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zci1pdGVte2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7cGFkZGluZzoxMXB4IDA7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDgpO2ZvbnQtc2l6ZToxM3B4fQouc3ItaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLnNyLWl0ZW0gLmt7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NjAwO2ZsZXgtc2hyaW5rOjB9Ci5zci1pdGVtIC52e3RleHQtYWxpZ246cmlnaHQ7Zm9udC13ZWlnaHQ6ODAwfQouc3ItaXRlbSAudi5tb25ve2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEycHh9Ci5zaWctcmVzdWx0e21heC1oZWlnaHQ6NTJ2aDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5zaWctY2FyZHtib3JkZXItcmFkaXVzOjE2cHg7cGFkZGluZzoxM3B4IDE0cHg7bWFyZ2luLWJvdHRvbToxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5zaWctY2FyZC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMjUpfQouc2lnLWNhcmQuZmFpbHtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5zaWctY2FyZCAuaHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLnNpZy1jYXJkIC5oIC5ye2ZvbnQtc2l6ZToxMnB4fQouc2lnLWNhcmQub2sgLmggLnJ7Y29sb3I6dmFyKC0tb2spfSAuc2lnLWNhcmQuZmFpbCAuaCAucntjb2xvcjp2YXIoLS1lcnIpfQouc2lnLWNhcmQgLnN0ZXBze2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuOH0KLnNpZy1jYXJkIC5zdGVwcyBpe2ZvbnQtc3R5bGU6bm9ybWFsO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tcmlnaHQ6NXB4fQouc2lnLWNhcmQgLnN0ZXBzIC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0KI3RvYXN0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO3RvcDpjYWxjKDE4cHggKyB2YXIoLS1zYWZlLXQpKTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKC0xNnB4KTt6LWluZGV4OjIwMDsKICBkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWF4LXdpZHRoOjg2dnc7cGFkZGluZzoxMXB4IDE4cHg7Ym9yZGVyLXJhZGl1czoxNHB4O2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjcwMDsKICBiYWNrZ3JvdW5kOnJnYmEoMTcsMjYsNDYsLjkyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3gtc2hhZG93OjAgMTBweCAzNHB4IHJnYmEoMCwwLDAsLjQ1KTsKICBvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOm9wYWNpdHkgLjI1cyx0cmFuc2Zvcm0gLjNzIHZhcigtLXNwcmluZyl9CiN0b2FzdC5zaG93e29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKDApfQojdG9hc3Qgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7ZmxleC1zaHJpbms6MH0KI3RvYXN0Lm9re2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVycntjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mb3tjb2xvcjp2YXIoLS1icmFuZCl9CiN0b2FzdC5vayBzdmd7Y29sb3I6dmFyKC0tb2spfSAjdG9hc3QuZXJyIHN2Z3tjb2xvcjp2YXIoLS1lcnIpfSAjdG9hc3QuaW5mbyBzdmd7Y29sb3I6dmFyKC0tYnJhbmQpfQouY29uZmlybS1sYXllcntwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MTUwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjMwcHh9Ci5jb25maXJte3dpZHRoOm1pbigzNDBweCw5MHZ3KTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItcmFkaXVzOjIwcHg7cGFkZGluZzoyMnB4IDIwcHggMThweDt0ZXh0LWFsaWduOmNlbnRlcjtib3gtc2hhZG93OjAgMjRweCA2MHB4IHJnYmEoMCwwLDAsLjU1KTthbmltYXRpb246Y2FyZC1pbiAuM3MgdmFyKC0tc3ByaW5nKSBib3RofQouY29uZmlybSAuY3R7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1ib3R0b206NnB4fQouY29uZmlybSAuY2R7Zm9udC1zaXplOjEyLjVweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7bWFyZ2luLWJvdHRvbToxOHB4fQouY29uZmlybSAuY2J7ZGlzcGxheTpmbGV4O2dhcDoxMHB4fQouY29uZmlybSAuY2IgYnV0dG9ue2ZsZXg6MTtoZWlnaHQ6NDJweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouY29uZmlybSAuY2IgLm5ve2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKX0KLmNvbmZpcm0gLmNiIC55ZXN7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDfQoKLyogPT09PT09PT09PT09IG1pc2MgPT09PT09PT09PT09ICovCi5mb290e3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTBweCAwIDRweDtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuOH0KLmZvb3QgLmxpbmt7Y29sb3I6dmFyKC0tYnJhbmQpO3RleHQtZGVjb3JhdGlvbjpub25lO2ZvbnQtd2VpZ2h0OjcwMH0KLmhpZGRlbntkaXNwbGF5Om5vbmUhaW1wb3J0YW50fQpAa2V5ZnJhbWVzIHB1bHNlezAlLDEwMCV7b3BhY2l0eToxfTUwJXtvcGFjaXR5Oi40NX19Ci5wdWxzZXthbmltYXRpb246cHVsc2UgMS42cyBlYXNlLWluLW91dCBpbmZpbml0ZX0KQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOnJlZHVjZSl7CiAgKnthbmltYXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50O3RyYW5zaXRpb24tZHVyYXRpb246LjAxbXMhaW1wb3J0YW50fQp9CkBtZWRpYSAobWluLXdpZHRoOjcwMHB4KXsKICBtYWlue21heC13aWR0aDo2ODBweDttYXJnaW46MCBhdXRvfQp9CkBtZWRpYSAobWF4LXdpZHRoOjY5OXB4KXsKICBpbnB1dFt0eXBlPXRleHRdLGlucHV0W3R5cGU9cGFzc3dvcmRdLGlucHV0W3R5cGU9bnVtYmVyXSx0ZXh0YXJlYXtmb250LXNpemU6MTZweCFpbXBvcnRhbnR9Cn0KCi8qID09PT09PT09PT09PSB2Mi4xNC45IOenr+WIhiAvIOi9pui+humhtee7hOS7tiA9PT09PT09PT09PT0gKi8KLmFjYy1jaGlwc3tkaXNwbGF5OmZsZXg7Z2FwOjdweDtvdmVyZmxvdy14OmF1dG87cGFkZGluZzoycHggMCAxMnB4Oy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouYWNjLWNoaXBzOjotd2Via2l0LXNjcm9sbGJhcntkaXNwbGF5Om5vbmV9Ci5hY2MtY2hpcHtmbGV4LXNocmluazowO3BhZGRpbmc6N3B4IDE1cHg7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpfQouYWNjLWNoaXAub257YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtib3gtc2hhZG93OjAgNHB4IDE0cHggdmFyKC0tYnJhbmRTb2Z0KX0KLnB0LWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMHB4O21hcmdpbi1ib3R0b206MTRweH0KLnB0LWNlbGx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1tZCk7cGFkZGluZzoxM3B4IDE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wdC1jZWxsIC5sYntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLWJvdHRvbTo1cHh9Ci5wdC1jZWxsIC52bHtmb250LXNpemU6MjJweDtmb250LXdlaWdodDo4MDA7bGluZS1oZWlnaHQ6MS4xNX0KLnB0LWNlbGwgLnN1Yntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjNweH0KLnBhbmVsLWNhcmR7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7cGFkZGluZzoxNXB4O21hcmdpbi1ib3R0b206MTRweDthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLnBhbmVsLWNhcmQgLnBjLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjExcHh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFkIGg0e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFkIGg0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLmNhbC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDcsMWZyKTtnYXA6NXB4fQouY2FsLXdke2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nLWJvdHRvbTozcHh9Ci5jYWwtZHthc3BlY3QtcmF0aW86MTtib3JkZXItcmFkaXVzOjlweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtjb2xvcjp2YXIoLS10eHQyKTtib3JkZXI6MS41cHggc29saWQgdHJhbnNwYXJlbnR9Ci5jYWwtZC5zaWduZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLmNhbC1kLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQouY2FsLWQudG9kYXl7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKX0KLmNhbC1kLmZ1dHVyZXtvcGFjaXR5Oi4zOH0KLmNhbC1kLmJsYW5re2JhY2tncm91bmQ6dHJhbnNwYXJlbnR9Ci5jYWwtZCAuZG90e2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MTttYXJnaW4tdG9wOjFweH0KLnZjLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo5cHh9Ci52Yy1idG57YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCA2cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0KX0KLnZjLWJ0biBzdmd7d2lkdGg6MjFweDtoZWlnaHQ6MjFweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci52Yy1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoub3B0LXJvd3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjhweDttYXJnaW46OXB4IDB9Ci5vcHQtY2hpcHtwYWRkaW5nOjhweCAxNHB4O2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLm9wdC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmZsb3ctaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6MTFweCAycHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5mbG93LWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5mbG93LWl0ZW0gLm5te2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjYwMH0KLmZsb3ctaXRlbSAudG17Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoycHh9Ci5mbG93LWl0ZW0gLnNje2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMH0KLmZsb3ctaXRlbSAuc2MucGx1c3tjb2xvcjp2YXIoLS1vayl9Ci5mbG93LWl0ZW0gLnNjLm1pbnVze2NvbG9yOnZhcigtLWVycil9Ci5tb24tcm93e2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzo5cHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxM3B4fQoubW9uLXJvdzpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLm1vbi1yb3cgLmt7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQoubW9uLXJvdyAudntmb250LXdlaWdodDo3MDB9Ci8qID09PT09PT09PT09PSDlhaXlnLrpl6rlsY/vvJrpppbluKfljbPmmL7npLrvvIzmlbDmja7lsLHnu6rlkI7mt6Hlh7ogPT09PT09PT09PT09ICovCiNzcGxhc2h7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4Ojk5OTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KDEyMCUgNjAlIGF0IDUwJSAwJSxyZ2JhKDE0LDE0MywxNzgsLjE2KSx0cmFuc3BhcmVudCA2MCUpLHZhcigtLWJnKTt0cmFuc2l0aW9uOm9wYWNpdHkgLjRzIHZhcigtLWVhc2UpLHRyYW5zZm9ybSAuNHMgdmFyKC0tZWFzZSl9CiNzcGxhc2gub3V0e29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoMS4wNCk7cG9pbnRlci1ldmVudHM6bm9uZX0KLnNwLW1hcmt7d2lkdGg6ODRweDtoZWlnaHQ6ODRweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Ym94LXNoYWRvdzowIDE0cHggNDBweCByZ2JhKDE0LDE0MywxNzgsLjQpO2FuaW1hdGlvbjpzcC1pbiAuNnMgdmFyKC0tc3ByaW5nKSBib3RofQouc3AtbWFyayBzdmd7d2lkdGg6NDZweDtoZWlnaHQ6NDZweH0KLnNwLXRpdGxle21hcmdpbi10b3A6MjBweDtmb250LXNpemU6MjFweDtmb250LXdlaWdodDo5MDA7bGV0dGVyLXNwYWNpbmc6MXB4O2FuaW1hdGlvbjpzcC11cCAuNXMgLjEycyB2YXIoLS1lYXNlKSBib3RofQouc3Atc3Vie21hcmdpbi10b3A6N3B4O2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDMpO2xldHRlci1zcGFjaW5nOjNweDthbmltYXRpb246c3AtdXAgLjVzIC4ycyB2YXIoLS1lYXNlKSBib3RofQouc3AtbG9hZHttYXJnaW4tdG9wOjM0cHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4O2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2FuaW1hdGlvbjpzcC11cCAuNXMgLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2FkIC5zcGlubmVye3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwaW4gLjhzIGxpbmVhciBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpIHRyYW5zbGF0ZVkoMTBweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKSB0cmFuc2xhdGVZKDApfX0KQGtleWZyYW1lcyBzcC11cHtmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMnB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJiZy1nbG93Ij48L2Rpdj4KPGRpdiBpZD0ic3BsYXNoIj4KICA8ZGl2IGNsYXNzPSJzcC1tYXJrIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTQgMTMuNUM0IDkuMDggNy41OCA1LjUgMTIgNS41czggMy41OCA4IDgiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMiAxM2w3LjUgNS41IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSIxNi41IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE5IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC10aXRsZSI+5p6B5qC4IFpFRUhPPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3Atc3ViIj7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLWxvYWQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIj48L3NwYW4+5q2j5Zyo5Yqg6L295pWw5o2u4oCmPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik00IDEzLjVDNCA5LjA4IDcuNTggNS41IDEyIDUuNXM4IDMuNTggOCA4IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTIgMTNsNy41IDUuNSIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNy41IiBjeT0iMTYuNSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PC9zdmc+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC10eHQiPgogICAgICA8aDE+5p6B5qC4IFpFRUhPIDxzcGFuIGNsYXNzPSJ2ZXItY2hpcCI+TElURTwvc3Bhbj48L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIDxidXR0b24gY2xhc3M9Imljb24tYnRuIiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiIGFyaWEtbGFiZWw9IuWIt+aWsCI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMSAxLTIuNjQtNi4zNiIvPjxwYXRoIGQ9Ik0yMSAzdjZoLTYiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvaGVhZGVyPgoKICA8bWFpbiBpZD0ibWFpbiI+CiAgICA8ZGl2IGNsYXNzPSJwdHItd3JhcCIgaWQ9InB0cldyYXAiPgogICAgICA8ZGl2IGNsYXNzPSJwdHItaW5kaWNhdG9yIiBpZD0icHRySW5kIj48c3BhbiBjbGFzcz0ic3Bpbm5lciIgaWQ9InB0clNwaW4iPjwvc3Bhbj48c3BhbiBpZD0icHRyVHh0Ij7kuIvmi4nliLfmlrA8L3NwYW4+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InBhZ2VIb21lIj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0icGFnZVBvaW50cyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlVmVoaWNsZSIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlTG9ncyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlQ2ZnIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICA8L21haW4+CgogIDxuYXYgY2xhc3M9InRhYmJhciI+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIgb24iIGRhdGEtdGFiPSJob21lIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2hvbWUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDEwLjUgMTIgM2w5IDcuNSIvPjxwYXRoIGQ9Ik01IDkuNVYyMWgxNFY5LjUiLz48L3N2Zz4KICAgICAg6aaW6aG1PHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InBvaW50cyIgb25jbGljaz0ic3dpdGNoVGFiKCdwb2ludHMnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjguNiIvPjxwYXRoIGQ9Ik05IDguNWwzIDQgMy00TTEyIDEyLjVWMTdNOS42IDEzLjRoNC44TTkuNiAxNS40aDQuOCIvPjwvc3ZnPgogICAgICDnp6/liIY8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0idmVoaWNsZSIgb25jbGljaz0ic3dpdGNoVGFiKCd2ZWhpY2xlJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNCAxM2wxLjctNC42QTIgMiAwIDAgMSA3LjYgN2g4LjhhMiAyIDAgMCAxIDEuOSAxLjRMMjAgMTMiLz48cGF0aCBkPSJNMy41IDEzaDE3YTEgMSAwIDAgMSAxIDF2My41aC0yLjZNMi41IDE3LjVWMTRhMSAxIDAgMCAxIDEtMSIvPjxwYXRoIGQ9Ik01LjEgMTcuNUgyLjUiLz48Y2lyY2xlIGN4PSI3LjMiIGN5PSIxNy4zIiByPSIxLjkiLz48Y2lyY2xlIGN4PSIxNi43IiBjeT0iMTcuMyIgcj0iMS45Ii8+PHBhdGggZD0iTTkuMiAxNy4zaDUuNiIvPjwvc3ZnPgogICAgICDovabovoY8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0ibG9ncyIgb25jbGljaz0ic3dpdGNoVGFiKCdsb2dzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOCA2aDEzTTggMTJoMTNNOCAxOGgxMyIvPjxwYXRoIGQ9Ik0zIDZoLjAxTTMgMTJoLjAxTTMgMThoLjAxIi8+PC9zdmc+CiAgICAgIOaXpeW/lzxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJjZmciIG9uY2xpY2s9InN3aXRjaFRhYignY2ZnJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PHBhdGggZD0iTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAxIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDEgMS00IDB2LS4wOWExLjY1IDEuNjUgMCAwIDAtMS0xLjUxIDEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMSAxLTIuODMtMi44M2wuMDYtLjA2YTEuNjUgMS42NSAwIDAgMCAuMzMtMS44MiAxLjY1IDEuNjUgMCAwIDAtMS41MS0xSDNhMiAyIDAgMSAxIDAtNGguMDlhMS42NSAxLjY1IDAgMCAwIDEuNTEtMSAxLjY1IDEuNjUgMCAwIDAtLjMzLTEuODJsLS4wNi0uMDZhMiAyIDAgMSAxIDIuODMtMi44M2wuMDYuMDZhMS42NSAxLjY1IDAgMCAwIDEuODIuMzNoLjAxYTEuNjUgMS42NSAwIDAgMCAxLTEuNTFWM2EyIDIgMCAxIDEgNCAwdi4wOWExLjY1IDEuNjUgMCAwIDAgMSAxLjUxaC4wMWExLjY1IDEuNjUgMCAwIDAgMS44Mi0uMzNsLjA2LS4wNmEyIDIgMCAxIDEgMi44MyAyLjgzbC0uMDYuMDZhMS42NSAxLjY1IDAgMCAwLS4zMyAxLjgydi4wMWExLjY1IDEuNjUgMCAwIDAgMS41MSAxSDIxYTIgMiAwIDEgMSAwIDRoLS4wOWExLjY1IDEuNjUgMCAwIDAtMS41MSAxeiIvPjwvc3ZnPgogICAgICDorr7nva48c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogIDwvbmF2PgoKICA8ZGl2IGNsYXNzPSJzaGVldC1iYWNrZHJvcCIgaWQ9InNoZWV0QmFja2Ryb3AiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PC9kaXY+CiAgPGRpdiBjbGFzcz0ic2hlZXQiIGlkPSJzaGVldCI+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ncmFiIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWhlYWQiPgogICAgICA8aDMgaWQ9InNoZWV0VGl0bGUiPjwvaDM+CiAgICAgIDxidXR0b24gY2xhc3M9InNoZWV0LWNsb3NlIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtYm9keSIgaWQ9InNoZWV0Qm9keSI+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgaWQ9InRvYXN0IiByb2xlPSJzdGF0dXMiPjwvZGl2PgogIDxkaXYgY2xhc3M9ImNvbmZpcm0tbGF5ZXIgaGlkZGVuIiBpZD0iY29uZmlybUxheWVyIj48L2Rpdj4KPC9kaXY+CjxzY3JpcHQ+CiJ1c2Ugc3RyaWN0IjsKLyogPT09PT09PT09PT09PT09PT0g5bi46YePID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFQUF9WRVJTSU9OID0gInYyLjE0LjE0IjsKY29uc3QgS0VZUyA9IHsgY2ZnOiJ6ZWVob19jZmciLCBhY2NvdW50czoiemVlaG9fYWNjb3VudHMiLCBsb2dzOiJ6ZWVob19sb2dzIiB9OwoKLyogPT09PT09PT09PT09PT09PT0g5bel5YW35Ye95pWwID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFV1aWQoKXtjb25zdCBwPSJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgiLGM9ImFiY2RlZjAxMjM0NTY3ODkiO2xldCByPSIiO2Zvcihjb25zdCBjaCBvZiBwKXtpZihjaD09PSJ4Inx8Y2g9PT0ieSIpe2NvbnN0IG49TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjE2KTtyKz0oY2g9PT0ieSI/KG4mMHgzKXwweDg6bikudG9TdHJpbmcoMTYpfWVsc2Ugcis9Y2h9cmV0dXJuIHJ9CmZ1bmN0aW9uIGdldFJhbmRvbUNoYXJzKG49MTYpe2NvbnN0IGM9IjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IjtsZXQgcj0iIjtmb3IobGV0IGk9MDtpPG47aSsrKXIrPWMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCkpO3JldHVybiByfQpmdW5jdGlvbiB0b1F1ZXJ5KHA9e30pe3JldHVybiBPYmplY3Qua2V5cyhwKS5maWx0ZXIoaz0+cFtrXSE9PXVuZGVmaW5lZCYmcFtrXSE9PW51bGwpLnNvcnQoKS5tYXAoaz0+aysiPSIrcFtrXSkuam9pbigiJiIpfQpmdW5jdGlvbiBjbGVhblRva2VuKHQpe3JldHVybiBTdHJpbmcodHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWVhcmVyXHMrL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpfQpmdW5jdGlvbiBjbGVhbkJhcmtLZXkoYil7bGV0IHM9U3RyaW5nKGJ8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1hcmtccyooa2V5KT9ccypbOu+8ml1ccyovaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIikudHJpbSgpO3JldHVybiBzLnJlcGxhY2UoL1wvKyQvLCIiKX0KZnVuY3Rpb24gbWFza1Zpbih2KXtjb25zdCBzPVN0cmluZyh2fHwiIik7aWYoIXMpcmV0dXJuIiI7aWYocy5sZW5ndGg8PTcpcmV0dXJuIioqKioiO3JldHVybiBzLnN1YnN0cmluZygwLDMpKyIqKioqIitzLnN1YnN0cmluZyhzLmxlbmd0aC00KX0KZnVuY3Rpb24gZGVlcFBpY2sob2JqLGtleXMsZGVwdGgpe2lmKCFvYmp8fHR5cGVvZiBvYmohPT0ib2JqZWN0Inx8KGRlcHRofHwwKT41KXJldHVybiIiO2Zvcihjb25zdCBrIG9mIGtleXMpe2lmKG9ialtrXSE9PXVuZGVmaW5lZCYmb2JqW2tdIT09bnVsbCYmb2JqW2tdIT09IiIpcmV0dXJuIFN0cmluZyhvYmpba10pfWZvcihjb25zdCBrIGluIG9iail7aWYob2JqW2tdJiZ0eXBlb2Ygb2JqW2tdPT09Im9iamVjdCIpe2NvbnN0IHI9ZGVlcFBpY2sob2JqW2tdLGtleXMsKGRlcHRofHwwKSsxKTtpZihyKXJldHVybiByfX1yZXR1cm4iIn0KZnVuY3Rpb24gcGlja0lvdFByb3AoZCxpZGVudGlmeSl7Y29uc3QgYXJyPWQmJmQuaW90UHJvcGVydGllcztpZihBcnJheS5pc0FycmF5KGFycikpe2NvbnN0IGtleT1TdHJpbmcoaWRlbnRpZnkpLnRvTG93ZXJDYXNlKCk7Zm9yKGNvbnN0IGl0IG9mIGFycil7aWYoaXQmJlN0cmluZyhpdC5pZGVudGlmeXx8IiIpLnRvTG93ZXJDYXNlKCk9PT1rZXkmJml0LnZhbHVlIT09bnVsbCYmaXQudmFsdWUhPT11bmRlZmluZWQmJml0LnZhbHVlIT09IiIpcmV0dXJuIFN0cmluZyhpdC52YWx1ZSl9fXJldHVybiIifQpmdW5jdGlvbiBnZXREZXZpY2VJZGVudGlmeShhY2Mpe2NvbnN0IHNlZWQ9U3RyaW5nKGFjYy51c2VySWR8fGFjYy52aW5Ob3x8InplZWhvLWRldmljZSIpO2xldCBoPTA7Zm9yKGxldCBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe2g9KChoPDw1KS1oK3NlZWQuY2hhckNvZGVBdChpKSl8MH1yZXR1cm4oTWF0aC5hYnMoaCkudG9TdHJpbmcoMTYpKyIwMDAwMDAwMDAwMDAwMDAwIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIGhhc1ZhbGlkQ29vcmQobGF0LGxuZyl7aWYobGF0PT09IiJ8fGxhdD09PW51bGx8fGxhdD09PXVuZGVmaW5lZHx8bG5nPT09IiJ8fGxuZz09PW51bGx8fGxuZz09PXVuZGVmaW5lZClyZXR1cm4gZmFsc2U7Y29uc3QgbGE9TnVtYmVyKGxhdCksbG49TnVtYmVyKGxuZyk7cmV0dXJuIGlzRmluaXRlKGxhKSYmaXNGaW5pdGUobG4pJiZNYXRoLmFicyhsYSk8PTkwJiZNYXRoLmFicyhsbik8PTE4MCYmIShsYT09PTAmJmxuPT09MCl9CmZ1bmN0aW9uIG5vcm1hbGl6ZVJlZnJlc2hTZWModil7Y29uc3Qgbj1OdW1iZXIodik7aWYoIWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiA2MDtyZXR1cm4gTWF0aC5tYXgoMTUsTWF0aC5taW4oMzYwMCxNYXRoLnJvdW5kKG4pKSl9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHM9PW51bGw/IiI6cykucmVwbGFjZSgvJi9nLCImYW1wOyIpLnJlcGxhY2UoLzwvZywiJmx0OyIpLnJlcGxhY2UoLz4vZywiJmd0OyIpLnJlcGxhY2UoLyIvZywiJnF1b3Q7Iil9CgovKiA9PT09PT09PT09PT09PT09PSBNRDUgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbWQ1KHQsZSl7ZnVuY3Rpb24gbih0LGUpe3JldHVybiB0PDxlfHQ+Pj4zMi1lfWZ1bmN0aW9uIHIodCxlKXt2YXIgbixyLG8saSxhO3JldHVybiBvPTIxNDc0ODM2NDgmdCxpPTIxNDc0ODM2NDgmZSxhPSgxMDczNzQxODIzJnQpKygxMDczNzQxODIzJmUpLChuPTEwNzM3NDE4MjQmdCkmKHI9MTA3Mzc0MTgyNCZlKT8yMTQ3NDgzNjQ4XmFeb15pOm58cj8xMDczNzQxODI0JmE/MzIyMTIyNTQ3Ml5hXm9eaToxMDczNzQxODI0XmFeb15pOmFeb15pfWZ1bmN0aW9uIG8odCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmZXx+dCZufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGkodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmbnxlJn5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGEodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHReZV5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIHUodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIGVeKHR8fm4pfShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGModCl7dmFyIGUsbj0iIixyPSIiO2ZvcihlPTA7ZTw9MztlKyspbis9KHI9IjAiKyh0Pj4+OCplJjI1NSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoci5sZW5ndGgtMiwyKTtyZXR1cm4gbn12YXIgcyxsLGYscCxkLGgsdix5LGcsbT1BcnJheSgpO2ZvcihtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxuPXQubGVuZ3RoLHI9bis4LG89MTYqKChyLXIlNjQpLzY0KzEpLGk9QXJyYXkoby0xKSxhPTAsdT0wO3U8bjspYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfHQuY2hhckNvZGVBdCh1KTw8YSx1Kys7cmV0dXJuIGE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXwxMjg8PGEsaVtvLTJdPW48PDMsaVtvLTFdPW4+Pj4yOSxpfSh0PWZ1bmN0aW9uKHQpe3Q9dC5yZXBsYWNlKC9cclxuL2csIlxuIik7Zm9yKHZhciBlPSIiLG49MDtuPHQubGVuZ3RoO24rKyl7dmFyIHI9dC5jaGFyQ29kZUF0KG4pO3I8MTI4P2UrPVN0cmluZy5mcm9tQ2hhckNvZGUocik6cj4xMjcmJnI8MjA0OD8oZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5MiksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpOihlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpfXJldHVybiBlfSh0KSksaD0xNzMyNTg0MTkzLHY9NDAyMzIzMzQxNyx5PTI1NjIzODMxMDIsZz0yNzE3MzM4Nzgscz0wO3M8bS5sZW5ndGg7cys9MTYpbD1oLGY9dixwPXksZD1nLGg9byhoLHYseSxnLG1bcyswXSw3LDM2MTQwOTAzNjApLGc9byhnLGgsdix5LG1bcysxXSwxMiwzOTA1NDAyNzEwKSx5PW8oeSxnLGgsdixtW3MrMl0sMTcsNjA2MTA1ODE5KSx2PW8odix5LGcsaCxtW3MrM10sMjIsMzI1MDQ0MTk2NiksaD1vKGgsdix5LGcsbVtzKzRdLDcsNDExODU0ODM5OSksZz1vKGcsaCx2LHksbVtzKzVdLDEyLDEyMDAwODA0MjYpLHk9byh5LGcsaCx2LG1bcys2XSwxNywyODIxNzM1OTU1KSx2PW8odix5LGcsaCxtW3MrN10sMjIsNDI0OTI2MTMxMyksaD1vKGgsdix5LGcsbVtzKzhdLDcsMTc3MDAzNTQxNiksZz1vKGcsaCx2LHksbVtzKzldLDEyLDIzMzY1NTI4NzkpLHk9byh5LGcsaCx2LG1bcysxMF0sMTcsNDI5NDkyNTIzMyksdj1vKHYseSxnLGgsbVtzKzExXSwyMiwyMzA0NTYzMTM0KSxoPW8oaCx2LHksZyxtW3MrMTJdLDcsMTgwNDYwMzY4MiksZz1vKGcsaCx2LHksbVtzKzEzXSwxMiw0MjU0NjI2MTk1KSx5PW8oeSxnLGgsdixtW3MrMTRdLDE3LDI3OTI5NjUwMDYpLGg9aShoLHY9byh2LHksZyxoLG1bcysxNV0sMjIsMTIzNjUzNTMyOSkseSxnLG1bcysxXSw1LDQxMjkxNzA3ODYpLGc9aShnLGgsdix5LG1bcys2XSw5LDMyMjU0NjU2NjQpLHk9aSh5LGcsaCx2LG1bcysxMV0sMTQsNjQzNzE3NzEzKSx2PWkodix5LGcsaCxtW3MrMF0sMjAsMzkyMTA2OTk5NCksaD1pKGgsdix5LGcsbVtzKzVdLDUsMzU5MzQwODYwNSksZz1pKGcsaCx2LHksbVtzKzEwXSw5LDM4MDE2MDgzKSx5PWkoeSxnLGgsdixtW3MrMTVdLDE0LDM2MzQ0ODg5NjEpLHY9aSh2LHksZyxoLG1bcys0XSwyMCwzODg5NDI5NDQ4KSxoPWkoaCx2LHksZyxtW3MrOV0sNSw1Njg0NDY0MzgpLGc9aShnLGgsdix5LG1bcysxNF0sOSwzMjc1MTYzNjA2KSx5PWkoeSxnLGgsdixtW3MrM10sMTQsNDEwNzYwMzMzNSksdj1pKHYseSxnLGgsbVtzKzhdLDIwLDExNjM1MzE1MDEpLGg9aShoLHYseSxnLG1bcysxM10sNSwyODUwMjg1ODI5KSxnPWkoZyxoLHYseSxtW3MrMl0sOSw0MjQzNTYzNTEyKSx5PWkoeSxnLGgsdixtW3MrN10sMTQsMTczNTMyODQ3MyksaD1hKGgsdj1pKHYseSxnLGgsbVtzKzEyXSwyMCwyMzY4MzU5NTYyKSx5LGcsbVtzKzVdLDQsNDI5NDU4ODczOCksZz1hKGcsaCx2LHksbVtzKzhdLDExLDIyNzIzOTI4MzMpLHk9YSh5LGcsaCx2LG1bcysxMV0sMTYsMTgzOTAzMDU2Miksdj1hKHYseSxnLGgsbVtzKzE0XSwyMyw0MjU5NjU3NzQwKSxoPWEoaCx2LHksZyxtW3MrMV0sNCwyNzYzOTc1MjM2KSxnPWEoZyxoLHYseSxtW3MrNF0sMTEsMTI3Mjg5MzM1MykseT1hKHksZyxoLHYsbVtzKzddLDE2LDQxMzk0Njk2NjQpLHY9YSh2LHksZyxoLG1bcysxMF0sMjMsMzIwMDIzNjY1NiksaD1hKGgsdix5LGcsbVtzKzEzXSw0LDY4MTI3OTE3NCksZz1hKGcsaCx2LHksbVtzKzBdLDExLDM5MzY0MzAwNzQpLHk9YSh5LGcsaCx2LG1bcyszXSwxNiwzNTcyNDQ1MzE3KSx2PWEodix5LGcsaCxtW3MrNl0sMjMsNzYwMjkxODkpLGg9YShoLHYseSxnLG1bcys5XSw0LDM2NTQ2MDI4MDkpLGc9YShnLGgsdix5LG1bcysxMl0sMTEsMzg3MzE1MTQ2MSkseT1hKHksZyxoLHYsbVtzKzE1XSwxNiw1MzA3NDI1MjApLGg9dShoLHY9YSh2LHksZyxoLG1bcysyXSwyMywzMjk5NjI4NjQ1KSx5LGcsbVtzKzBdLDYsNDA5NjMzNjQ1MiksZz11KGcsaCx2LHksbVtzKzddLDEwLDExMjY4OTE0MTUpLHk9dSh5LGcsaCx2LG1bcysxNF0sMTUsMjg3ODYxMjM5MSksdj11KHYseSxnLGgsbVtzKzVdLDIxLDQyMzc1MzMyNDEpLGg9dShoLHYseSxnLG1bcysxMl0sNiwxNzAwNDg1NTcxKSxnPXUoZyxoLHYseSxtW3MrM10sMTAsMjM5OTk4MDY5MCkseT11KHksZyxoLHYsbVtzKzEwXSwxNSw0MjkzOTE1NzczKSx2PXUodix5LGcsaCxtW3MrMV0sMjEsMjI0MDA0NDQ5NyksaD11KGgsdix5LGcsbVtzKzhdLDYsMTg3MzMxMzM1OSksZz11KGcsaCx2LHksbVtzKzE1XSwxMCw0MjY0MzU1NTUyKSx5PXUoeSxnLGgsdixtW3MrNl0sMTUsMjczNDc2ODkxNiksdj11KHYseSxnLGgsbVtzKzEzXSwyMSwxMzA5MTUxNjQ5KSxoPXUoaCx2LHksZyxtW3MrNF0sNiw0MTQ5NDQ0MjI2KSxnPXUoZyxoLHYseSxtW3MrMTFdLDEwLDMxNzQ3NTY5MTcpLHk9dSh5LGcsaCx2LG1bcysyXSwxNSw3MTg3ODcyNTkpLHY9dSh2LHksZyxoLG1bcys5XSwyMSwzOTUxNDgxNzQ1KSxoPXIoaCxsKSx2PXIodixmKSx5PXIoeSxwKSxnPXIoZyxkKTtyZXR1cm4gMzI9PWU/KGMoaCkrYyh2KStjKHkpK2MoZykpLnRvTG93ZXJDYXNlKCk6KGModikrYyh5KSkudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gU0hBMSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzaGExKG1zZyl7ZnVuY3Rpb24gcm90YXRlX2xlZnQobixzKXt2YXIgdDQ9KG48PHMpfChuPj4+KDMyLXMpKTtyZXR1cm4gdDR9O2Z1bmN0aW9uIGN2dF9oZXgodmFsKXt2YXIgc3RyPScnO3ZhciBpO3ZhciB2O2ZvcihpPTc7aT49MDtpLS0pe3Y9KHZhbD4+PihpKjQpKSYweDBmO3N0cis9di50b1N0cmluZygxNil9cmV0dXJuIHN0cn07ZnVuY3Rpb24gVXRmOEVuY29kZShzdHJpbmcpe3N0cmluZz1zdHJpbmcucmVwbGFjZSgvXHJcbi9nLCdcbicpO3ZhciB1dGZ0ZXh0PScnO2Zvcih2YXIgbj0wO248c3RyaW5nLmxlbmd0aDtuKyspe3ZhciBjPXN0cmluZy5jaGFyQ29kZUF0KG4pO2lmKGM8MTI4KXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGMpfWVsc2UgaWYoKGM+MTI3KSYmKGM8MjA0OCkpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpfDE5Mik7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX1lbHNle3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKXwyMjQpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSY2Myl8MTI4KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfX1yZXR1cm4gdXRmdGV4dH07dmFyIGJsb2Nrc3RhcnQ7dmFyIGksajt2YXIgVz1uZXcgQXJyYXkoODApO3ZhciBIMD0weDY3NDUyMzAxO3ZhciBIMT0weEVGQ0RBQjg5O3ZhciBIMj0weDk4QkFEQ0ZFO3ZhciBIMz0weDEwMzI1NDc2O3ZhciBIND0weEMzRDJFMUYwO3ZhciBBLEIsQyxELEU7dmFyIHRlbXA7bXNnPVV0ZjhFbmNvZGUobXNnKTt2YXIgbXNnX2xlbj1tc2cubGVuZ3RoO3ZhciB3b3JkX2FycmF5PW5ldyBBcnJheSgpO2ZvcihpPTA7aTxtc2dfbGVuLTM7aSs9NCl7aj1tc2cuY2hhckNvZGVBdChpKTw8MjR8bXNnLmNoYXJDb2RlQXQoaSsxKTw8MTZ8bXNnLmNoYXJDb2RlQXQoaSsyKTw8OHxtc2cuY2hhckNvZGVBdChpKzMpO3dvcmRfYXJyYXkucHVzaChqKX1zd2l0Y2gobXNnX2xlbiU0KXtjYXNlIDA6aT0weDA4MDAwMDAwMDticmVhaztjYXNlIDE6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwyNHwweDA4MDAwMDA7YnJlYWs7Y2FzZSAyOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MTZ8MHgwODAwMDticmVhaztjYXNlIDM6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTMpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwxNnxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDw4fDB4ODA7YnJlYWt9d29yZF9hcnJheS5wdXNoKGkpO3doaWxlKCh3b3JkX2FycmF5Lmxlbmd0aCUxNikhPTE0KXdvcmRfYXJyYXkucHVzaCgwKTt3b3JkX2FycmF5LnB1c2gobXNnX2xlbj4+PjI5KTt3b3JkX2FycmF5LnB1c2goKG1zZ19sZW48PDMpJjB4MGZmZmZmZmZmKTtmb3IoYmxvY2tzdGFydD0wO2Jsb2Nrc3RhcnQ8d29yZF9hcnJheS5sZW5ndGg7YmxvY2tzdGFydCs9MTYpe2ZvcihpPTA7aTwxNjtpKyspV1tpXT13b3JkX2FycmF5W2Jsb2Nrc3RhcnQraV07Zm9yKGk9MTY7aTw9Nzk7aSsrKVdbaV09cm90YXRlX2xlZnQoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0sMSk7QT1IMDtCPUgxO0M9SDI7RD1IMztFPUg0O2ZvcihpPTA7aTw9MTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwofkImRCkpK0UrV1tpXSsweDVBODI3OTk5KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT0yMDtpPD0zOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHg2RUQ5RUJBMSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NDA7aTw9NTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwoQiZEKXwoQyZEKSkrRStXW2ldKzB4OEYxQkJDREMpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTYwO2k8PTc5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweENBNjJDMUQ2KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1IMD0oSDArQSkmMHgwZmZmZmZmZmY7SDE9KEgxK0IpJjB4MGZmZmZmZmZmO0gyPShIMitDKSYweDBmZmZmZmZmZjtIMz0oSDMrRCkmMHgwZmZmZmZmZmY7SDQ9KEg0K0UpJjB4MGZmZmZmZmZmfXZhciB0ZW1wPWN2dF9oZXgoSDApK2N2dF9oZXgoSDEpK2N2dF9oZXgoSDIpK2N2dF9oZXgoSDMpK2N2dF9oZXgoSDQpO3JldHVybiB0ZW1wLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IEFFUy0yNTYtRUNCICsgUEtDUzcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQUVTX1NCT1g9bmV3IFVpbnQ4QXJyYXkoWzB4NjMsMHg3YywweDc3LDB4N2IsMHhmMiwweDZiLDB4NmYsMHhjNSwweDMwLDB4MDEsMHg2NywweDJiLDB4ZmUsMHhkNywweGFiLDB4NzYsMHhjYSwweDgyLDB4YzksMHg3ZCwweGZhLDB4NTksMHg0NywweGYwLDB4YWQsMHhkNCwweGEyLDB4YWYsMHg5YywweGE0LDB4NzIsMHhjMCwweGI3LDB4ZmQsMHg5MywweDI2LDB4MzYsMHgzZiwweGY3LDB4Y2MsMHgzNCwweGE1LDB4ZTUsMHhmMSwweDcxLDB4ZDgsMHgzMSwweDE1LDB4MDQsMHhjNywweDIzLDB4YzMsMHgxOCwweDk2LDB4MDUsMHg5YSwweDA3LDB4MTIsMHg4MCwweGUyLDB4ZWIsMHgyNywweGIyLDB4NzUsMHgwOSwweDgzLDB4MmMsMHgxYSwweDFiLDB4NmUsMHg1YSwweGEwLDB4NTIsMHgzYiwweGQ2LDB4YjMsMHgyOSwweGUzLDB4MmYsMHg4NCwweDUzLDB4ZDEsMHgwMCwweGVkLDB4MjAsMHhmYywweGIxLDB4NWIsMHg2YSwweGNiLDB4YmUsMHgzOSwweDRhLDB4NGMsMHg1OCwweGNmLDB4ZDAsMHhlZiwweGFhLDB4ZmIsMHg0MywweDRkLDB4MzMsMHg4NSwweDQ1LDB4ZjksMHgwMiwweDdmLDB4NTAsMHgzYywweDlmLDB4YTgsMHg1MSwweGEzLDB4NDAsMHg4ZiwweDkyLDB4OWQsMHgzOCwweGY1LDB4YmMsMHhiNiwweGRhLDB4MjEsMHgxMCwweGZmLDB4ZjMsMHhkMiwweGNkLDB4MGMsMHgxMywweGVjLDB4NWYsMHg5NywweDQ0LDB4MTcsMHhjNCwweGE3LDB4N2UsMHgzZCwweDY0LDB4NWQsMHgxOSwweDczLDB4NjAsMHg4MSwweDRmLDB4ZGMsMHgyMiwweDJhLDB4OTAsMHg4OCwweDQ2LDB4ZWUsMHhiOCwweDE0LDB4ZGUsMHg1ZSwweDBiLDB4ZGIsMHhlMCwweDMyLDB4M2EsMHgwYSwweDQ5LDB4MDYsMHgyNCwweDVjLDB4YzIsMHhkMywweGFjLDB4NjIsMHg5MSwweDk1LDB4ZTQsMHg3OSwweGU3LDB4YzgsMHgzNywweDZkLDB4OGQsMHhkNSwweDRlLDB4YTksMHg2YywweDU2LDB4ZjQsMHhlYSwweDY1LDB4N2EsMHhhZSwweDA4LDB4YmEsMHg3OCwweDI1LDB4MmUsMHgxYywweGE2LDB4YjQsMHhjNiwweGU4LDB4ZGQsMHg3NCwweDFmLDB4NGIsMHhiZCwweDhiLDB4OGEsMHg3MCwweDNlLDB4YjUsMHg2NiwweDQ4LDB4MDMsMHhmNiwweDBlLDB4NjEsMHgzNSwweDU3LDB4YjksMHg4NiwweGMxLDB4MWQsMHg5ZSwweGUxLDB4ZjgsMHg5OCwweDExLDB4NjksMHhkOSwweDhlLDB4OTQsMHg5YiwweDFlLDB4ODcsMHhlOSwweGNlLDB4NTUsMHgyOCwweGRmLDB4OGMsMHhhMSwweDg5LDB4MGQsMHhiZiwweGU2LDB4NDIsMHg2OCwweDQxLDB4OTksMHgyZCwweDBmLDB4YjAsMHg1NCwweGJiLDB4MTZdKTsKY29uc3QgQUVTX1JDT049bmV3IFVpbnQ4QXJyYXkoWzB4MDAsMHgwMSwweDAyLDB4MDQsMHgwOCwweDEwLDB4MjAsMHg0MCwweDgwLDB4MWIsMHgzNiwweDZjLDB4ZDgsMHhhYiwweDRkXSk7CmZ1bmN0aW9uIGFlc0dNdWwoYSxiKXtsZXQgcD0wO2ZvcihsZXQgaT0wO2k8ODtpKyspe2lmKGImMSlwXj1hO2NvbnN0IGhpPWEmMHg4MDthPShhPDwxKSYweGZmO2lmKGhpKWFePTB4MWI7Yj4+PTF9cmV0dXJuIHB9CmZ1bmN0aW9uIGFlc0tleUV4cGFuc2lvbjI1NihrZXkpe2NvbnN0IE5rPTgsTmI9NCxOcj0xNDtjb25zdCB3PW5ldyBVaW50OEFycmF5KDQqTmIqKE5yKzEpKTtmb3IobGV0IGk9MDtpPE5rKjQ7aSsrKXdbaV09a2V5W2ldO2ZvcihsZXQgaT1OaztpPE5iKihOcisxKTtpKyspe2xldCB0MD13WzQqKGktMSldLHQxPXdbNCooaS0xKSsxXSx0Mj13WzQqKGktMSkrMl0sdDM9d1s0KihpLTEpKzNdO2lmKGklTms9PT0wKXtjb25zdCB0bXA9dDA7dDA9QUVTX1NCT1hbdDFdXkFFU19SQ09OW2kvTmtdO3QxPUFFU19TQk9YW3QyXTt0Mj1BRVNfU0JPWFt0M107dDM9QUVTX1NCT1hbdG1wXX1lbHNlIGlmKGklTms9PT00KXt0MD1BRVNfU0JPWFt0MF07dDE9QUVTX1NCT1hbdDFdO3QyPUFFU19TQk9YW3QyXTt0Mz1BRVNfU0JPWFt0M119d1s0KmldPXdbNCooaS1OayldXnQwO3dbNCppKzFdPXdbNCooaS1OaykrMV1edDE7d1s0KmkrMl09d1s0KihpLU5rKSsyXV50Mjt3WzQqaSszXT13WzQqKGktTmspKzNdXnQzfXJldHVybiB3fQpmdW5jdGlvbiBhZXNFbmNyeXB0QmxvY2soaW5wdXQsdyl7Y29uc3QgTmI9NCxOcj0xNDtjb25zdCBzPW5ldyBVaW50OEFycmF5KDE2KTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPWlucHV0W2ldO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbaV07Zm9yKGxldCByb3VuZD0xO3JvdW5kPD1Ocjtyb3VuZCsrKXtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPUFFU19TQk9YW3NbaV1dO2xldCB0PXNbMV07c1sxXT1zWzVdO3NbNV09c1s5XTtzWzldPXNbMTNdO3NbMTNdPXQ7dD1zWzJdO3NbMl09c1sxMF07c1sxMF09dDt0PXNbNl07c1s2XT1zWzE0XTtzWzE0XT10O3Q9c1szXTtzWzNdPXNbMTVdO3NbMTVdPXNbMTFdO3NbMTFdPXNbN107c1s3XT10O2lmKHJvdW5kIT09TnIpe2ZvcihsZXQgYz0wO2M8NDtjKyspe2NvbnN0IGk9NCpjO2NvbnN0IGEwPXNbaV0sYTE9c1tpKzFdLGEyPXNbaSsyXSxhMz1zW2krM107c1tpXT1hZXNHTXVsKGEwLDIpXmFlc0dNdWwoYTEsMyleYTJeYTM7c1tpKzFdPWEwXmFlc0dNdWwoYTEsMileYWVzR011bChhMiwzKV5hMztzW2krMl09YTBeYTFeYWVzR011bChhMiwyKV5hZXNHTXVsKGEzLDMpO3NbaSszXT1hZXNHTXVsKGEwLDMpXmExXmEyXmFlc0dNdWwoYTMsMil9fWNvbnN0IG9mZj1yb3VuZCoxNjtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W29mZitpXX1yZXR1cm4gc30KZnVuY3Rpb24gYWVzVXRmOEJ5dGVzKHN0cil7Y29uc3Qgb3V0PVtdO2ZvcihsZXQgaT0wO2k8c3RyLmxlbmd0aDtpKyspe2xldCBjPXN0ci5jaGFyQ29kZUF0KGkpO2lmKGM8MHg4MClvdXQucHVzaChjKTtlbHNlIGlmKGM8MHg4MDApb3V0LnB1c2goMHhjMHwoYz4+NiksMHg4MHwoYyYweDNmKSk7ZWxzZSBpZihjPj0weGQ4MDAmJmM8PTB4ZGJmZil7Y29uc3QgYzI9c3RyLmNoYXJDb2RlQXQoKytpKTtjPTB4MTAwMDArKChjLTB4ZDgwMCk8PDEwKSsoYzItMHhkYzAwKTtvdXQucHVzaCgweGYwfChjPj4xOCksMHg4MHwoKGM+PjEyKSYweDNmKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9ZWxzZSBvdXQucHVzaCgweGUwfChjPj4xMiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfXJldHVybiBuZXcgVWludDhBcnJheShvdXQpfQpmdW5jdGlvbiBhZXNCeXRlc1RvQmFzZTY0KGJ5dGVzKXtjb25zdCBjaGFycz0iQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7bGV0IHJlc3VsdD0iIixpPTA7Zm9yKDtpKzI8Ynl0ZXMubGVuZ3RoO2krPTMpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpfGJ5dGVzW2krMl07cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdK2NoYXJzW24mNjNdfWNvbnN0IHJlbT1ieXRlcy5sZW5ndGgtaTtpZihyZW09PT0xKXtjb25zdCBuPWJ5dGVzW2ldPDwxNjtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdKyI9PSJ9ZWxzZSBpZihyZW09PT0yKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rIj0ifXJldHVybiByZXN1bHR9CmZ1bmN0aW9uIGFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW50ZXh0LGtleVN0cil7Y29uc3Qga2V5PWFlc1V0ZjhCeXRlcyhrZXlTdHIpO2lmKGtleS5sZW5ndGghPT0zMil0aHJvdyBuZXcgRXJyb3IoIkFFUy0yNTbpnIDopoEzMuWtl+iKguWvhumSpe+8jOW9k+WJjSIra2V5Lmxlbmd0aCk7Y29uc3Qgdz1hZXNLZXlFeHBhbnNpb24yNTYoa2V5KTtjb25zdCBkYXRhPWFlc1V0ZjhCeXRlcyhwbGFpbnRleHQpO2NvbnN0IHBhZExlbj0xNi0oZGF0YS5sZW5ndGglMTYpO2NvbnN0IHBhZGRlZD1uZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCtwYWRMZW4pO3BhZGRlZC5zZXQoZGF0YSk7Zm9yKGxldCBpPWRhdGEubGVuZ3RoO2k8cGFkZGVkLmxlbmd0aDtpKyspcGFkZGVkW2ldPXBhZExlbjtjb25zdCBvdXQ9bmV3IFVpbnQ4QXJyYXkocGFkZGVkLmxlbmd0aCk7Zm9yKGxldCBvZmY9MDtvZmY8cGFkZGVkLmxlbmd0aDtvZmYrPTE2KXtvdXQuc2V0KGFlc0VuY3J5cHRCbG9jayhwYWRkZWQuc2xpY2Uob2ZmLG9mZisxNiksdyksb2ZmKX1yZXR1cm4gYWVzQnl0ZXNUb0Jhc2U2NChvdXQpfQoKLyogPT09PT09PT09PT09PT09PT0g5a2Y5YKoID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGxvYWRKU09OKGssZmFsbGJhY2spe3RyeXtjb25zdCByYXc9bG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7aWYoIXJhdylyZXR1cm4gZmFsbGJhY2s7Y29uc3Qgdj1KU09OLnBhcnNlKHJhdyk7cmV0dXJuIHY9PT11bmRlZmluZWR8fHY9PT1udWxsP2ZhbGxiYWNrOnZ9Y2F0Y2goZSl7cmV0dXJuIGZhbGxiYWNrfX0KZnVuY3Rpb24gc2F2ZUpTT04oayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayxKU09OLnN0cmluZ2lmeSh2KSk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KY29uc3QgREVGQVVMVF9DRkc9e2FwcDp7YXBwSWQ6IlM3cVBXUFUxIixhcHBTZWNyZXQ6ImM1ZTBkYTdmNGRhMjhkZjgwNTY5NGVjM2RkMWZjNjc5MmU5ZGY5OWQifSxoNTp7YXBwSWQ6IlN3NUY5dUppIixhcHBTZWNyZXQ6IjQ2ODcwYThmNjc4YTA5MTA5NDY4ZjViMDE2ODgxOGI5MWMyOTI4NDUifSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6dHJ1ZSxlbmFibGVMaWtlOnRydWUsZW5hYmxlQ29tbWVudDp0cnVlLGVuYWJsZVNoYXJlOnRydWUsZW5hYmxlRGVsZXRlOnRydWV9LHZlaGljbGVBZXNLZXk6IiIsYXV0b1JlZnJlc2hTZWM6NjAsc2VydmVyQmFzZToiIixhdXRvU2lnbmluOmZhbHNlLGF1dG9TaWduaW5UaW1lOiIwNzowMCIsdmVoaWNsZU1vbml0b3I6ZmFsc2V9OwpmdW5jdGlvbiBnZXRDZmcoKXtjb25zdCBjPWxvYWRKU09OKEtFWVMuY2ZnLG51bGwpO2lmKCFjKXJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KERFRkFVTFRfQ0ZHKSk7cmV0dXJue2FwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxERUZBVUxUX0NGRy5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjLmg1Py5hcHBJZHx8REVGQVVMVF9DRkcuaDUuYXBwSWQsYXBwU2VjcmV0OmMuaDU/LmFwcFNlY3JldHx8REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LHZlaGljbGVBZXNLZXk6KHR5cGVvZiBjLnZlaGljbGVBZXNLZXk9PT0ic3RyaW5nIj9jLnZlaGljbGVBZXNLZXk6IiIpLnRyaW0oKSxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGMuYXV0b1JlZnJlc2hTZWMpLHNlcnZlckJhc2U6U3RyaW5nKGMuc2VydmVyQmFzZXx8IiIpLnRyaW0oKSxhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsYXV0b1NpZ25pblRpbWU6KHR5cGVvZiBjLmF1dG9TaWduaW5UaW1lPT09InN0cmluZyImJi9eXGR7MSwyfTpcZHsyfSQvLnRlc3QoYy5hdXRvU2lnbmluVGltZSk/Yy5hdXRvU2lnbmluVGltZToiMDc6MDAiKSx2ZWhpY2xlTW9uaXRvcjpjLnZlaGljbGVNb25pdG9yPT09dHJ1ZX19CmZ1bmN0aW9uIHNhdmVDZmcoYyl7cmV0dXJuIHNhdmVKU09OKEtFWVMuY2ZnLGMpfQpmdW5jdGlvbiBnZXRBY2NvdW50cygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5hY2NvdW50cyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gc2F2ZUFjY291bnRzKGxpc3Qpe3JldHVybiBzYXZlSlNPTihLRVlTLmFjY291bnRzLGxpc3QpfQpmdW5jdGlvbiBnZXRMb2dzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmxvZ3MsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIGFkZExvZyhlbnRyeSl7Y29uc3QgbG9ncz1nZXRMb2dzKCk7bG9ncy51bnNoaWZ0KGVudHJ5KTtpZihsb2dzLmxlbmd0aD41MClsb2dzLmxlbmd0aD01MDtzYXZlSlNPTihLRVlTLmxvZ3MsbG9ncyl9CmZ1bmN0aW9uIGNsZWFyTG9ncygpe3JldHVybiBzYXZlSlNPTihLRVlTLmxvZ3MsW10pfQpmdW5jdGlvbiBpc1Byb3h5TW9kZSgpe3JldHVybiAhISh3aW5kb3cuX19QQU5FTF9NT0RFX18pfHwhIWdldENmZygpLnNlcnZlckJhc2V9Ci8qID09PT09PT09PT09PT09PT09IOetvuWQjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRTaWduKHR5cGUscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Y1t0eXBlXXx8Yy5hcHA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10eXBlPT09Img1Ij9nZXRVdWlkKCk6dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9Ym9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTonJztjb25zdCBzaWduYXR1cmU9dHlwZT09PSJoNSI/KHF1ZXJ5K3BhcmFtK2FjLmFwcFNlY3JldCk6KGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KTtjb25zdCBzaWduPW1kNShzaGExKHNpZ25hdHVyZSksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ3NpZ25hdHVyZSc6c2lnbn19CgovLyBINSDnq6/lkKsgYm9keSDnrb7lkI3vvIhsb2dpbkJ5UGhvbmUg562J5o6l5Y+j5b+F6aG75oqK6K+35rGC5L2T57qz5YWl562+5ZCN77yM5ZCm5YiZ6L+U5ZueIHBlcm1pdCBlcnJvcu+8iQpmdW5jdGlvbiBoNVNpZ25XaXRoQm9keShib2R5LGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuaDV8fGMuYXBwO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT1nZXRVdWlkKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpO2NvbnN0IHNpZ249bWQ1KHNoYTEoYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdhcHBJZCc6YWMuYXBwSWR9fQoKLy8gQXBwIOe9keWFs+WujOaVtOetvuWQje+8iOWPkeeggeS4jueZu+W9leWQjOe9keWFs++8jOmBv+WFjSBINSBhdXRoQ29kZSDlj5HnoIHov5sgQXBwIOaxoOiAjCBINSBsb2dpbkJ5UGhvbmUg5p+l5LiN5Yiw77yJCmZ1bmN0aW9uIGFwcEdhdGV3YXlTaWduKHVybCxtZXRob2QscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7bGV0IHByZVNpZ249IiI7aWYoU3RyaW5nKG1ldGhvZCkudG9VcHBlckNhc2UoKT09PSJHRVQiKXtjb25zdCB1PW5ldyBVUkwodXJsKTtwcmVTaWduPXUub3JpZ2luK3UucGF0aG5hbWUrKHF1ZXJ5PyI/IitxdWVyeToiIik7fWVsc2V7cHJlU2lnbj1xdWVyeSsoYm9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKToiIik7fWNvbnN0IHNpZ249bWQ1KHNoYTEocHJlU2lnbitwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnYXBwSWQnOmFjLmFwcElkLCdub25jZSc6bm9uY2UsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ3NpZ25hdHVyZSc6c2lnbiwnQ2Ztb3RvLVgtUGFyYW0nOnBhcmFtLCdDZm1vdG8tWC1TaWduJzpzaWduLCdDZm1vdG8tWC1TaWduLVR5cGUnOicwJ319CgovKiA9PT09PT09PT09PT09PT09PSBIVFRQ77yIZmV0Y2gg54mI77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGh0dHBHZXQodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJHRVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQb3N0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHk9PW51bGw/e306Ym9keSksc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQdXQodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBVVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OmJvZHkhPT11bmRlZmluZWQmJmJvZHkhPT1udWxsPyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOnVuZGVmaW5lZCxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cERlbGV0ZSh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkRFTEVURSIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KZnVuY3Rpb24gbmV0d29ya0hpbnQocmVzKXtjb25zdCBtPVN0cmluZygocmVzJiZyZXMuZXJyb3IpfHwiIik7aWYoL2ZhaWxlZCB0byBmZXRjaHxuZXR3b3JrZXJyb3J8Y29yc3xsb2FkIGZhaWxlZHzml6Dms5Xov57mjqV8572R57ucL2kudGVzdChtKSlyZXR1cm4i572R57ucL+i3qOWfn+WPl+mZkO+8muebtOi/nuaooeW8j+mcgCBaRUVITyDmnI3liqHnq6/mlL7ooYwgQ09SU++8jOivt+ajgOafpee9kee7nOi/nuaOpeWQjumHjeivlSI7cmV0dXJuIiJ9CgovKiA9PT09PT09PT09PT09PT09PSDnm7Tov57lkI7nq6/vvIjmtY/op4jlmajnm7TmjqXosIMgWkVFSE8gQVBJ77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGJhc2VIZWFkZXJzKGFjYyl7Y29uc3QgdWE9YWNjLnVzZXJBZ2VudHx8Ik1PQklMRXxpT1N8MTYuMS4xfFpFRUhPX0FQUHwzLjAuMXxpUGhvbmV8V1dBTnxpT1MiO2NvbnN0IGg9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrY2xlYW5Ub2tlbihhY2MudG9rZW4pLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsIkFjY2VwdC1MYW5ndWFnZSI6InpoLUNOIiwiQWNjZXB0IjoiKi8qIiwiVXNlci1BZ2VudCI6dWEsIngtYXBwLWluZm8iOnVhfTtpZihhY2MudXNlcklkKXtoWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2hbIkNvb2tpZSJdPSJ1c2VyX2lkPSIrYWNjLnVzZXJJZH1yZXR1cm4gaH0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0IixoZWFkZXJzKTtsZXQgbGlzdD1bXTtpZihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCl7aWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpbGlzdD1yZXMuZGF0YTtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmxpc3QpKWxpc3Q9cmVzLmRhdGEubGlzdDtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlY29yZHMpKWxpc3Q9cmVzLmRhdGEucmVjb3JkcztlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJvd3MpKWxpc3Q9cmVzLmRhdGEucm93c31yZXR1cm4gbGlzdC5tYXAodj0+KHt2aW5ObzpTdHJpbmcodi52aW5Ob3x8di5mcmFtZU5vfHx2LnZpbnx8IiIpLnRyaW0oKSxuYW1lOlN0cmluZyh2LnZlaGljbGVOYW1lfHx2LnZlaGljbGVUeXBlfHx2LmRldmljZU5hbWV8fHYubmFtZXx8Iui9pui+hiIpLnRyaW0oKXx8Iui9pui+hiIscGljOlN0cmluZyh2LnZlaGljbGVQaWNVcmx8fHYucGljfHx2LmltYWdlVXJsfHwiIikudHJpbSgpLHZlaGljbGVUeXBlOlN0cmluZyh2LnZlaGljbGVUeXBlfHx2LnR5cGV8fCIiKS50cmltKCksbGljZW5zZVBsYXRlOnYubGljZW5zZVBsYXRlfHxudWxsfSkpLmZpbHRlcih2PT52LnZpbk5vKX1jYXRjaChlKXtyZXR1cm5bXX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvd2lkZ2V0cy8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCBzb2M9TnVtYmVyKGQuYm1zc29jfHxkLmJhdHRlcnlMZXZlbHx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHwwKTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8MCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntiYXR0ZXJ5UGVyY2VudDpNYXRoLm1heCgwLE1hdGgubWluKDEwMCxpc0Zpbml0ZShzb2MpP3NvYzowKSkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsYWRkcmVzczpTdHJpbmcoZC5hZGRyZXNzfHwiIikudHJpbSgpLGxvY2F0aW9uVGltZTpTdHJpbmcoZC5sb2NhdGlvbj8ubG9jYXRpb25UaW1lfHwiIikudHJpbSgpLHZlaGljbGVOYW1lOlN0cmluZyhkLnZlaGljbGVOYW1lfHwiIikudHJpbSgpLHZlaGljbGVJbWFnZVVybDpTdHJpbmcoZC52ZWhpY2xlU2NhbGVQaWNVcmx8fGQudmVoaWNsZVBpY1VybHx8IiIpLnRyaW0oKSxoZWFkTG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fCIiKS50cmltKCksYmF0dGVyeVB1bGxPdXQ6U3RyaW5nKGQuYmF0dGVyeVB1bGxPdXRGbGFnfHwiIik9PT0iMSIsb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fGQuZGV2aWNlT25saW5lfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIixwb3dlclN0YXR1czpTdHJpbmcoZC5hY2NTdGF0dXN8fGQucG93ZXJTdGF0dXN8fGQudmVoaWNsZVN0YXR1c3x8ZC5pZ25pdGlvblN0YXR1c3x8ZC5wb3dlck1vZGV8fGQuYWNjU3RhdGV8fGQucG93ZXJTdGF0ZXx8ZC52ZWhpY2xlU3RhdGV8fGQuZW5naW5lU3RhdHVzfHxkLmlzUG93ZXJPbnx8ZC5wb3dlck9ufHwiIikudHJpbSgpLGxvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGQuY2FyTG9ja1N0YXRlfHxkLmRvb3JMb2NrU3RhdGV8fGQubG9ja0ZsYWd8fGQuaXNMb2NrZWR8fGQubG9ja2VkfHxkLmNlbnRyYWxMb2NraW5nU3RhdHVzfHwiIikudHJpbSgpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBkZXZpY2VJZD1nZXREZXZpY2VJZGVudGlmeShhY2MpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9O2NvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSG9tZVBhZ2VWMi8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIj91bmlxdWVJZGVudGlmeT0iK2RldmljZUlkKyImcGhvbmVEZXZpY2VOYW1lPWlvc18iK2RldmljZUlkO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KHVybCxoZWFkZXJzKTtpZihyZXMmJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZlaGljbGVMb2NrPXBpY2tJb3RQcm9wKGQsIlZlaGljbGVMb2NrX1MiKTtjb25zdCBoZWFkTG9ja0lvdD1waWNrSW90UHJvcChkLCJIZWFkTG9ja1N0YXRlIik7Y29uc3QgdG9wTG9jaz1TdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGhlYWRMb2NrSW90fHx2ZWhpY2xlTG9ja3x8IiIpLnRyaW0oKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue3Bvd2VyU3RhdHVzOmRlZXBQaWNrKGQsWyJhY2NTdGF0dXMiLCJwb3dlclN0YXR1cyIsInZlaGljbGVTdGF0dXMiLCJpZ25pdGlvblN0YXR1cyIsInBvd2VyTW9kZSIsImFjY1N0YXRlIiwicG93ZXJTdGF0ZSIsInZlaGljbGVTdGF0ZSIsImVuZ2luZVN0YXR1cyIsImlzUG93ZXJPbiIsInBvd2VyT24iLCJhY2MiXSkudHJpbSgpLGxvY2tTdGF0ZTp0b3BMb2NrLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQucmlkZVN0YXRlfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8IiIpLnRyaW0oKSxyaWRlU3RhdGU6U3RyaW5nKGQucmlkZVN0YXRlfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYXBwL3ZlaGljbGUvdGlyZS9tb25pdG9yaW5nP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSsiJnRpbWVQZXJpb2RUeXBlPTEiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSk7aWYoKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyZXMuZGF0YS5yZWFsVGltZURhdGEpP3Jlcy5kYXRhLnJlYWxUaW1lRGF0YTooQXJyYXkuaXNBcnJheShyZXMuZGF0YSk/cmVzLmRhdGE6W10pO2NvbnN0IGJ5UG9zPXt9O2Zvcihjb25zdCBpdCBvZiBsaXN0KXtjb25zdCBwb3M9TnVtYmVyKGl0Py5zZW5zb3JQb3NpdGlvbik7aWYocG9zKWJ5UG9zW3Bvc109aXR9Y29uc3QgZm10PShpdCk9Pntjb25zdCB3YXJuPU51bWJlcihpdD8ud2FybmluZ1R5cGU/PzApO2NvbnN0IHY9U3RyaW5nKGl0Py50aXJlUHJlc3N1cmU/PyIiKS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHYpO2lmKHdhcm4hPT0wfHwhdnx8IWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiLmnKrnu5HlrpoiO3JldHVybiB2KyJiYXIifTtjb25zdCBmbXRUZW1wPShpdCk9Pntjb25zdCB3YXJuPU51bWJlcihpdD8ud2FybmluZ1R5cGU/PzApO2NvbnN0IHY9aXQ/LnRpcmVUZW1wO2lmKHdhcm4hPT0wfHx2PT1udWxsKXJldHVybiIiO2NvbnN0IHM9U3RyaW5nKHYpLnRyaW0oKTtjb25zdCBuPXBhcnNlRmxvYXQocyk7aWYoIXN8fHMudG9Mb3dlckNhc2UoKT09PSJudWxsInx8IWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiIiO3JldHVybiBzKyLCsEMifTtjb25zdCBmcm9udD1ieVBvc1sxXXx8bGlzdFswXTtjb25zdCByZWFyPWJ5UG9zWzJdfHxsaXN0WzFdO3JldHVybntmcm9udFByZXNzdXJlOmZyb250P2ZtdChmcm9udCk6Iuacque7keWumiIscmVhclByZXNzdXJlOnJlYXI/Zm10KHJlYXIpOiLmnKrnu5HlrpoiLGZyb250VGVtcDpmcm9udD9mbXRUZW1wKGZyb250KToiIixyZWFyVGVtcDpyZWFyP2ZtdFRlbXAocmVhcik6IiJ9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoUmlkZUluZm8oYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgbW9udGg9bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBbaG9tZVJlcyxteVJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvaG9tZVJpZGVJbmZvP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pLGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvbXlSaWRlSW5mbz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZtb250aD0iK21vbnRoLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSldKTtjb25zdCBoPWhvbWVSZXM/LmRhdGF8fGhvbWVSZXN8fHt9O2NvbnN0IGQ9bXlSZXM/LmRhdGF8fG15UmVzfHx7fTtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkoZC5yaWRlUmVjb3JkTGlzdCk/ZC5yaWRlUmVjb3JkTGlzdDpbXTtjb25zdCB0b2RheUtleT1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBkYXk9bGlzdC5maW5kKHg9PlN0cmluZyh4Py5kYXRlfHwiIik9PT10b2RheUtleSl8fGxpc3RbbGlzdC5sZW5ndGgtMV18fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJhdHRlcnlMZXZlbHx8ZC5ibXNzb2N8fDApLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MH19cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19Y2F0Y2goZSl7cmV0dXJue2NoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxzb2M6MCxyZXNpZHVhbFJhbmdlS206MH19fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJoNSIse3Zpbk5vOnZpbk5vfSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcmFwcC9hcHAvc2VydmljZS9yZWNoYXJnZS92ZWhpY2xlL2RldGFpbD92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObyksaGVhZGVycyk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXtyZXR1cm57cmVjaGFyZ2VFbmREYXRlOlN0cmluZyhyZXMuZGF0YS5yZWNoYXJnZUVuZERhdGV8fCIiKSxsYXN0VXNlRGF0ZTpOdW1iZXIocmVzLmRhdGEubGFzdFVzZURhdGUpfHwwLHNlcnZpY2VSZWNoYXJnZVN0YXR1czpTdHJpbmcocmVzLmRhdGEuc2VydmljZVJlY2hhcmdlU3RhdHVzfHwiIiksdmVoaWNsZU5hbWU6U3RyaW5nKHJlcy5kYXRhLnZlaGljbGVOYW1lfHwiIil9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXtoYXNWZWhpY2xlOmZhbHNlLHZlaGljbGVOYW1lOiIiLHZlaGljbGVNb2RlbDoiIix2aW5ObzoiIix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsYmF0dGVyeVBlcmNlbnQ6MCxyZXNpZHVhbFJhbmdlS206MCxyYW5nZUVzdGltYXRlZDpmYWxzZSxhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iixmcm9udFByZXNzdXJlOiIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsbGFzdFJpZGVEdXJhdGlvbjowLHZlaGljbGVJbWFnZVVybDoiIixzZXJ2aWNlRW5kRGF0ZToiIixzZXJ2aWNlUmVtYWluRGF5czowLHNlcnZpY2VTdGF0dXM6IiIscG93ZXJTdGF0dXM6IiIsbG9ja1N0YXRlOiIiLG9ubGluZToiIixyaWRlU3RhdGU6IiIsY3VzaGlvblN0YXRlOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIn07dHJ5e2NvbnN0IHZlaGljbGVzPWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7aWYodmVoaWNsZXMubGVuZ3RoPT09MClyZXR1cm4gcmVzdWx0O2NvbnN0IHY9dmVoaWNsZXNbMF07cmVzdWx0Lmhhc1ZlaGljbGU9dHJ1ZTtyZXN1bHQudmVoaWNsZU5hbWU9di5uYW1lO3Jlc3VsdC52aW5Obz12LnZpbk5vO3Jlc3VsdC52ZWhpY2xlSW1hZ2VVcmw9di5waWM7cmVzdWx0LnZlaGljbGVNb2RlbD12LnZlaGljbGVUeXBlfHwiIjtjb25zdCBbd2lkZ2V0cyx0aXJlLHJpZGUsYmF0dGVyeSxzZXJ2aWNlLGhvbWVQYWdlXT1hd2FpdCBQcm9taXNlLmFsbChbZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pih7Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowfSkpLGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpXSk7aWYod2lkZ2V0cyl7cmVzdWx0LmJhdHRlcnlQZXJjZW50PXdpZGdldHMuYmF0dGVyeVBlcmNlbnQ7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT13aWRnZXRzLnJlc2lkdWFsUmFuZ2VLbTtyZXN1bHQudm9sdGFnZT13aWRnZXRzLnZvbHRhZ2U7cmVzdWx0LmFkZHJlc3M9d2lkZ2V0cy5hZGRyZXNzO3Jlc3VsdC5sb2NhdGlvblRpbWU9d2lkZ2V0cy5sb2NhdGlvblRpbWU7cmVzdWx0LnBvd2VyU3RhdHVzPXdpZGdldHMucG93ZXJTdGF0dXN8fCIiO3Jlc3VsdC5sb2NrU3RhdGU9d2lkZ2V0cy5sb2NrU3RhdGV8fCIiO2lmKHdpZGdldHMudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXdpZGdldHMudmVoaWNsZU5hbWU7aWYod2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmwpcmVzdWx0LnZlaGljbGVJbWFnZVVybD13aWRnZXRzLnZlaGljbGVJbWFnZVVybDtpZih3aWRnZXRzLm9ubGluZSlyZXN1bHQub25saW5lPXdpZGdldHMub25saW5lO2lmKHdpZGdldHMuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9d2lkZ2V0cy5jdXNoaW9uU3RhdGU7aWYod2lkZ2V0cy5sb25naXR1ZGUhPT0iIiYmd2lkZ2V0cy5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT13aWRnZXRzLmxvbmdpdHVkZTtpZih3aWRnZXRzLmxhdGl0dWRlIT09IiImJndpZGdldHMubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPXdpZGdldHMubGF0aXR1ZGV9aWYoaG9tZVBhZ2Upe2lmKGhvbWVQYWdlLnBvd2VyU3RhdHVzKXJlc3VsdC5wb3dlclN0YXR1cz1ob21lUGFnZS5wb3dlclN0YXR1cztpZihob21lUGFnZS5sb2NrU3RhdGUpcmVzdWx0LmxvY2tTdGF0ZT1ob21lUGFnZS5sb2NrU3RhdGU7aWYoaG9tZVBhZ2Uub25saW5lKXJlc3VsdC5vbmxpbmU9aG9tZVBhZ2Uub25saW5lO2lmKGhvbWVQYWdlLnJpZGVTdGF0ZSlyZXN1bHQucmlkZVN0YXRlPWhvbWVQYWdlLnJpZGVTdGF0ZTtpZihob21lUGFnZS5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT1ob21lUGFnZS5jdXNoaW9uU3RhdGU7aWYoKHJlc3VsdC5sb25naXR1ZGU9PT0iInx8cmVzdWx0LmxvbmdpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxvbmdpdHVkZSE9PSIiJiZob21lUGFnZS5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT1ob21lUGFnZS5sb25naXR1ZGU7aWYoKHJlc3VsdC5sYXRpdHVkZT09PSIifHxyZXN1bHQubGF0aXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sYXRpdHVkZSE9PSIiJiZob21lUGFnZS5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9aG9tZVBhZ2UubGF0aXR1ZGV9aWYodGlyZSl7cmVzdWx0LmZyb250UHJlc3N1cmU9dGlyZS5mcm9udFByZXNzdXJlO3Jlc3VsdC5yZWFyUHJlc3N1cmU9dGlyZS5yZWFyUHJlc3N1cmU7cmVzdWx0LmZyb250VGVtcD10aXJlLmZyb250VGVtcDtyZXN1bHQucmVhclRlbXA9dGlyZS5yZWFyVGVtcH1pZihyaWRlKXtyZXN1bHQudG9kYXlEaXN0YW5jZT1yaWRlLnRvZGF5RGlzdGFuY2U7cmVzdWx0LnRvZGF5RHVyYXRpb249cmlkZS50b2RheUR1cmF0aW9uO3Jlc3VsdC50b2RheU1heFNwZWVkPXJpZGUudG9kYXlNYXhTcGVlZDtyZXN1bHQubGFzdFJpZGVNaWxlYWdlPXJpZGUubGFzdFJpZGVNaWxlYWdlO3Jlc3VsdC5sYXN0UmlkZUR1cmF0aW9uPXJpZGUubGFzdFJpZGVEdXJhdGlvbnx8MH1yZXN1bHQuY2hhcmdlU3RhdGU9YmF0dGVyeS5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSI7aWYoYmF0dGVyeS52b2x0YWdlKXJlc3VsdC52b2x0YWdlPWJhdHRlcnkudm9sdGFnZTtpZihiYXR0ZXJ5LmN1cnJlbnQpcmVzdWx0LmN1cnJlbnQ9YmF0dGVyeS5jdXJyZW50O2lmKGJhdHRlcnkuYmF0dGVyeVRlbXApcmVzdWx0LmJhdHRlcnlUZW1wPWJhdHRlcnkuYmF0dGVyeVRlbXA7aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJmJhdHRlcnkucmVzaWR1YWxSYW5nZUttKXJlc3VsdC5yZXNpZHVhbFJhbmdlS209YmF0dGVyeS5yZXNpZHVhbFJhbmdlS207aWYoKCFyZXN1bHQucmVzaWR1YWxSYW5nZUttfHxyZXN1bHQucmVzaWR1YWxSYW5nZUttPT09MCkmJnJlc3VsdC5iYXR0ZXJ5UGVyY2VudD4wKXtyZXN1bHQucmVzaWR1YWxSYW5nZUttPU1hdGgucm91bmQocmVzdWx0LmJhdHRlcnlQZXJjZW50KjEuNSk7cmVzdWx0LnJhbmdlRXN0aW1hdGVkPXRydWV9aWYoc2VydmljZSl7cmVzdWx0LnNlcnZpY2VFbmREYXRlPXNlcnZpY2UucmVjaGFyZ2VFbmREYXRlfHwiIjtyZXN1bHQuc2VydmljZVN0YXR1cz1zZXJ2aWNlLnNlcnZpY2VSZWNoYXJnZVN0YXR1c3x8IiI7cmVzdWx0LnNlcnZpY2VSZW1haW5EYXlzPXNlcnZpY2UubGFzdFVzZURhdGV8fDA7aWYoc2VydmljZS52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9c2VydmljZS52ZWhpY2xlTmFtZX19Y2F0Y2goZSl7fXJldHVybiByZXN1bHR9Cgphc3luYyBmdW5jdGlvbiBjaGVja1Rva2VuKGFjYyxjZmcpe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3QgdXNlcklkPWFjYy51c2VySWR8fCIiO2lmKCF1c2VySWQpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6MCx1c2VyTmFtZTphY2MudXNlck5hbWV9O2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZCwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nLyIrdXNlcklkLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSlyZXR1cm57dmFsaWQ6dHJ1ZSxzY29yZTpOdW1iZXIocmVzLmRhdGEuc2NvcmUpfHwwLHVzZXJOYW1lOnJlcy5kYXRhLm5pY2tOYW1lfHxhY2MudXNlck5hbWV9O2lmKHJlcy5jb2RlPT0iNDAwMDEifHxyZXMuY29kZT09NDAxKXJldHVybnt2YWxpZDpmYWxzZSxyZWFzb246InRva2Vu5bey6L+H5pyfIn07cmV0dXJue3ZhbGlkOnRydWUscmVhc29uOnJlcy5tZXNzYWdlfHwi6K+35rGC5byC5bi4In19Y2F0Y2goZSl7cmV0dXJue3ZhbGlkOnRydWUscmVhc29uOlN0cmluZyhlKX19fQoKYXN5bmMgZnVuY3Rpb24gZ2V0VXNlcmlkQnlUb2tlbih0b2tlbixjZmcpe2NvbnN0IHQ9Y2xlYW5Ub2tlbih0b2tlbik7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdCwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIifTtsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiLGVycm9yPW51bGw7dHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCcnLGNmZyk7Y29uc3QgcmVzMD1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSDB9KTtpZihyZXMwJiZTdHJpbmcocmVzMC5jb2RlKT09PSIxMDAwMCImJnJlczAuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMwLmRhdGEuaWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcocmVzMC5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe31pZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZyIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IfSk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXt1c2VySWQ9U3RyaW5nKHJlcy5kYXRhLmlkfHxyZXMuZGF0YS51c2VySWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcocmVzLmRhdGEubmlja05hbWV8fCIiKX19Y2F0Y2goZSl7fX1pZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IfSk7Y29uc3QgZmluZD0ob2JqLGRlcHRoKT0+e2lmKCFvYmp8fGRlcHRoPjUpcmV0dXJuIiI7Zm9yKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvYmopKXtjb25zdCB2YWw9b2JqW2tleV07aWYoL3VzZXIuP2lkfHVpZHxjcmVhdGUuP2J5fG93bmVyLj9pZC9pLnRlc3Qoa2V5KSYmdmFsJiZ0eXBlb2YgdmFsIT09Im9iamVjdCIpe2NvbnN0IHM9U3RyaW5nKHZhbCk7aWYocy5sZW5ndGg+PTEwJiYvXlxkKyQvLnRlc3QocykpcmV0dXJuIHN9aWYodmFsJiZ0eXBlb2YgdmFsPT09Im9iamVjdCIpe2NvbnN0IGY9ZmluZCh2YWwsZGVwdGgrMSk7aWYoZilyZXR1cm4gZn19cmV0dXJuIiJ9O2NvbnN0IHVpZD1maW5kKHJlcywwKTtpZih1aWQpe3VzZXJJZD11aWQ7Y29uc3QgZmluZE5hbWU9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD40KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7aWYoL25pY2suP25hbWV8dXNlci4/bmFtZS9pLnRlc3Qoa2V5KSYmb2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJzdHJpbmciKXJldHVybiBvYmpba2V5XTtpZihvYmpba2V5XSYmdHlwZW9mIG9ialtrZXldPT09Im9iamVjdCIpe2NvbnN0IG49ZmluZE5hbWUob2JqW2tleV0sZGVwdGgrMSk7aWYobilyZXR1cm4gbn19cmV0dXJuIiJ9O3VzZXJOYW1lPWZpbmROYW1lKHJlcywwKX19Y2F0Y2goZSl7fX1pZighdXNlcklkKWVycm9yPSLoh6rliqjojrflj5blpLHotKXvvIzor7fmiYvliqjloavlhpnnlKjmiLdJRCI7cmV0dXJue29rOiEhdXNlcklkLHVzZXJJZCx1c2VyTmFtZSxlcnJvcn19Ci8qID09PT09PT09PT09PT09PT09IOi0puWPt+aVsOaNruaLieWPliA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluTm8pe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtsZXQgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+l55So5oi3Iix1c2VySWQsc2NvcmU6MCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6MCx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjAsbGFzdDc6W10sZXJyb3I6bnVsbCx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX07CmlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgdmVoaWNsZVJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH0pO2lmKHZlaGljbGVSZXMuY29kZT09IjEwMDAwIiYmdmVoaWNsZVJlcy5kYXRhKXtjb25zdCBhdXRvVWlkPVN0cmluZyh2ZWhpY2xlUmVzLmRhdGEudXNlcklkfHx2ZWhpY2xlUmVzLmRhdGEudWlkfHx2ZWhpY2xlUmVzLmRhdGEuaWR8fCIiKTtpZihhdXRvVWlkKXt1c2VySWQ9YXV0b1VpZDtyZXN1bHQudXNlcklkPXVzZXJJZDtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGlkeD1hY2NvdW50cy5maW5kSW5kZXgoYT0+Y2xlYW5Ub2tlbihhLnRva2VuKT09PXRva2VuKTtpZihpZHg+PTAmJiFhY2NvdW50c1tpZHhdLnVzZXJJZCl7YWNjb3VudHNbaWR4XS51c2VySWQ9dXNlcklkO3NhdmVBY2NvdW50cyhhY2NvdW50cyl9fX19Y2F0Y2goZSl7fX0KdHJ5e3Jlc3VsdC52ZWhpY2xlPWF3YWl0IGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyx2aW5Obyl9Y2F0Y2goZSl7cmVzdWx0LnZlaGljbGU9e2hhc1ZlaGljbGU6ZmFsc2V9fQp0cnl7aWYoIXVzZXJJZCl7cmVzdWx0LmVycm9yPSLor7flnKjorr7nva7pobXloavlhpnnlKjmiLdJRCJ9ZWxzZXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9KTtpZihpbmZvUmVzLmNvZGU9PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7cmVzdWx0LnNjb3JlPU51bWJlcihpbmZvUmVzLmRhdGEuc2NvcmV8fGluZm9SZXMuZGF0YS5pbnRlZ3JhbHx8aW5mb1Jlcy5kYXRhLnBvaW50fHxpbmZvUmVzLmRhdGEucG9pbnRzfHxpbmZvUmVzLmRhdGEudG90YWxTY29yZXx8aW5mb1Jlcy5kYXRhLnRvdGFsSW50ZWdyYWx8fDApfWVsc2UgaWYoaW5mb1Jlcy5jb2RlPT0iNDAwMDEifHxpbmZvUmVzLmNvZGU9PTQwMSl7cmVzdWx0LmVycm9yPSJUb2tlbuW3sui/h+acnyJ9ZWxzZXtyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluWksei0pTogIisoaW5mb1Jlcy5tZXNzYWdlfHxpbmZvUmVzLmNvZGV8fCLmnKrnn6XplJnor68iKX19fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blvILluLg6ICIrU3RyaW5nKGUpfQp0cnl7Y29uc3QgY3VyTW9udGg9bm93LmdldEZ1bGxZZWFyKCkrIi0iKyhub3cuZ2V0TW9udGgoKSsxKTtjb25zdCBsYXN0RGF0ZT1uZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSxub3cuZ2V0TW9udGgoKS0xLDEpO2NvbnN0IGxhc3RNb250aD1sYXN0RGF0ZS5nZXRGdWxsWWVhcigpKyItIisobGFzdERhdGUuZ2V0TW9udGgoKSsxKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IFtjdXJSZXMsbGFzdFJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2N1ck1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmN1ck1vbnRofSwnJyxjZmcpfSksaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbGFzdE1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmxhc3RNb250aH0sJycsY2ZnKX0pXSk7Y29uc3QgbGFzdExpc3Q9KGxhc3RSZXMuY29kZT09IjEwMDAwIiYmbGFzdFJlcy5kYXRhKT8obGFzdFJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBjdXJMaXN0PShjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpPyhjdXJSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgbGlzdD1bLi4ubGFzdExpc3QsLi4uY3VyTGlzdF07aWYoY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKXtyZXN1bHQuc2lnbkNvdW50PU51bWJlcihjdXJSZXMuZGF0YS5zaWduQ291bnQpfHwwfWNvbnN0IHRvZGF5RW50cnk9Y3VyTGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmVkVG9kYXk9ISEodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKTtyZXN1bHQudG9kYXlTY29yZT10b2RheUVudHJ5PyhOdW1iZXIodG9kYXlFbnRyeS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDt0cnl7Y29uc3QgX3RvZGF5TG9ncz0oZ2V0TG9ncygpfHxbXSkuZmlsdGVyKGw9PmwmJmwuZGF0ZT09PXRvZGF5JiZTdHJpbmcobC51c2VySWR8fCIiKT09PVN0cmluZyh1c2VySWQpJiZsLnN1Y2Nlc3MpO2lmKF90b2RheUxvZ3MubGVuZ3RoPjApe2NvbnN0IF90bD1fdG9kYXlMb2dzWzBdO3Jlc3VsdC50b2RheVNjb3JlPU51bWJlcihfdGwudG90YWxHYWluKXx8cmVzdWx0LnRvZGF5U2NvcmU7cmVzdWx0LnRvZGF5RGV0YWlsPXtzaWduaW5TY29yZTpOdW1iZXIoX3RsLnNpZ25pblNjb3JlKXx8MCxibGluZEJveFNjb3JlOk51bWJlcihfdGwuYmxpbmRCb3hTY29yZSl8fDAsaW50ZXJhY3RTY29yZTpOdW1iZXIoX3RsLmludGVyYWN0U2NvcmUpfHwwfX19Y2F0Y2goZSl7fWNvbnN0IHRvZGF5SWR4PWxpc3QuZmluZEluZGV4KHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtsZXQgY29udD0wO2lmKHRvZGF5SWR4Pj0wKXtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9fXJlc3VsdC5jb250aW51ZURheXM9Y29udDtmb3IobGV0IGk9NjtpPj0wO2ktLSl7Y29uc3QgZD1uZXcgRGF0ZSgpO2Quc2V0RGF0ZShkLmdldERhdGUoKS1pKTtjb25zdCBkcz1kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBlbnRyeT1saXN0LmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpO3Jlc3VsdC5sYXN0Ny5wdXNoKHtkYXRlOmRzLnNsaWNlKDUpLHNpZ25lZDohIShlbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApKSxpc1RvZGF5Omk9PT0wfSl9fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnrb7liLDnirbmgIHojrflj5blpLHotKUifQp0cnl7Y29uc3QgdG9rZW5DaGVjaz1hd2FpdCBjaGVja1Rva2VuKGFjYyxjZmcpO3Jlc3VsdC50b2tlblZhbGlkPXRva2VuQ2hlY2sudmFsaWQ7cmVzdWx0LnRva2VuUmVhc29uPXRva2VuQ2hlY2sucmVhc29ufHxudWxsO2lmKHRva2VuQ2hlY2sudmFsaWQmJnRva2VuQ2hlY2sudXNlck5hbWUmJighcmVzdWx0LnVzZXJOYW1lfHxyZXN1bHQudXNlck5hbWU9PT0i5pyq55+l55So5oi3IikpcmVzdWx0LnVzZXJOYW1lPXRva2VuQ2hlY2sudXNlck5hbWV9Y2F0Y2goZSl7cmVzdWx0LnRva2VuVmFsaWQ9dHJ1ZX0KcmV0dXJuIHJlc3VsdH0KCmZ1bmN0aW9uIGdldFBvc3RJZEZyb21EYXRhKGRhdGEpe2lmKCFkYXRhKXJldHVybiBudWxsO2lmKHR5cGVvZiBkYXRhPT09InN0cmluZyJ8fHR5cGVvZiBkYXRhPT09Im51bWJlciIpcmV0dXJuIFN0cmluZyhkYXRhKTtpZihBcnJheS5pc0FycmF5KGRhdGEpKXJldHVybiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhWzBdKTtjb25zdCBkaXJlY3Q9ZGF0YS51dWlkfHxkYXRhLnR1dWlkfHxkYXRhLnBvc3RJZHx8ZGF0YS5wb3N0aWR8fGRhdGEuYXJ0aWNsZUlkfHxkYXRhLmFydGljbGVJRHx8ZGF0YS5pZHx8ZGF0YS5kYXRhSWR8fGRhdGEudGlkO2lmKGRpcmVjdClyZXR1cm4gU3RyaW5nKGRpcmVjdCk7Zm9yKGNvbnN0IGtleSBvZiBbInJlY29yZHMiLCJsaXN0Iiwicm93cyIsImRhdGEiLCJyZXN1bHQiXSl7Y29uc3Qgdj1kYXRhW2tleV07Y29uc3QgcGlkPWdldFBvc3RJZEZyb21EYXRhKHYpO2lmKHBpZClyZXR1cm4gcGlkfXJldHVybiBudWxsfQoKLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGMID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXt1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ZmFsc2Usc2lnbmluU2NvcmU6MCxibGluZEJveFNjb3JlOjAsaW50ZXJhY3RTY29yZTowLHRvdGFsR2FpbjowLGNvbnRpbnVlRGF5czowLGVycm9yOm51bGwsc3RlcHM6W119O3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3QgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZH07Y29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgdG9kYXk9bm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgbW9udGg9dG9kYXkuc2xpY2UoMCw3KTsKdHJ5e2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0b2RheUVudHJ5PShpbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIil9ZWxzZXtsZXQgc2lnblJlcz1udWxsLHNpZ25Nc2c9IuacquefpSI7Zm9yKGxldCBhdD0xO2F0PD0zO2F0Kyspe3NpZ25SZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse30sJycsY2ZnKX0se30pO2lmKHNpZ25SZXM/LmNvZGU9PSIxMDAwMCIpYnJlYWs7c2lnbk1zZz1zaWduUmVzPy5tZXNzYWdlfHwi5pyq55+lIjtpZigv6K+356iNfOeojeWQjnznqI3lgJl86aKR57mBfOe5geW/mXzph43or5UvLnRlc3Qoc2lnbk1zZykmJmF0PDMpe2F3YWl0IG5ldyBQcm9taXNlKHI9PnNldFRpbWVvdXQociwoYXQrMSkqMjAwMCkpO2NvbnRpbnVlfWJyZWFrfWlmKHNpZ25SZXM/LmNvZGU9PSIxMDAwMCIpe2NvbnN0IGluZm9SZXMyPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdGU9KGluZm9SZXMyPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25pblNjb3JlPXRlPyhOdW1iZXIodGUuaW50ZWdyYWxTY29yZSl8fDApOjA7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOaIkOWKnyArIityZXN1bHQuc2lnbmluU2NvcmUpfWVsc2V7dHJ5e2NvbnN0IGNoaz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IGNlPShjaGs/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtpZihjZSYmKGNlLnNpZ25TdGF0dWU9PTN8fGNlLnNpZ25TdGF0dWU9PTV8fGNlLnNpZ25TdGF0dWU9PTApKXJlc3VsdC5zdGVwcy5wdXNoKCLku4rml6Xlt7Lnrb7liLAiKTtlbHNlIHJlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOWksei0pTogIitzaWduTXNnKX19fQp9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOW8guW4uDogIitlKX0KdHJ5e2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBsaXN0PWluZm9SZXM/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdO2NvbnN0IHRvZGF5SWR4PWxpc3QuZmluZEluZGV4KHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtsZXQgY29udD0wO2ZvcihsZXQgaT10b2RheUlkeDtpPj0wO2ktLSl7Y29uc3Qgc3Q9bGlzdFtpXT8uc2lnblN0YXR1ZTtpZihzdD09M3x8c3Q9PTV8fChpPT09dG9kYXlJZHgmJnN0PT0wKSljb250Kys7ZWxzZSBicmVha31yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Y29uc3Qgc2lnbkNvdW50PU51bWJlcihpbmZvUmVzPy5kYXRhPy5zaWduQ291bnQpfHwwO2lmKHNpZ25Db3VudD49MzApe2NvbnN0IGJsaW5kUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vc3VwcGxlbWVudFByaXplP3N1cHBsZW1lbnREYXRlPSIrdG9kYXksey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7c3VwcGxlbWVudERhdGU6dG9kYXl9LCcnLGNmZyl9KTtpZihibGluZFJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmJsaW5kQm94U2NvcmU9TnVtYmVyKGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbHx8YmxpbmRSZXM/LmRhdGE/LmludGVncmFsU2NvcmV8fDApO3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LojrflvpcgKyIrcmVzdWx0LmJsaW5kQm94U2NvcmUrIiAoIisoYmxpbmRSZXM/LmRhdGE/LnByaXplc05hbWV8fCLnp6/liIYiKSsiKSIpfX1lbHNle3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LmnKrop6PplIEoIitzaWduQ291bnQrIi8zMCkiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuW8guW4uDogIitlKX0KY29uc3QgY29tbT1jZmcuY29tbXVuaXR5fHx7fTtsZXQgcG9zdElkPW51bGw7CmlmKGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKXt0cnl7Y29uc3QgcG9zdFJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGNvbnRlbnQ6IuW8gOW/g+eahOS4gOWkqSJ9KTtpZihwb3N0UmVzPy5jb2RlPT0iMTAwMDAiKXtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEocG9zdFJlcy5kYXRhKTtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJblvILluLg6ICIrZSl9fQppZighcG9zdElkKXt0cnl7Y29uc3QgbGlzdFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW11bml0eS9taW5lQXJ0aWNsZUluZm8/dXNlcklkPSIrdXNlcklkKyImcGFnZT0xJnBhZ2VTaXplPTEwIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7Y29uc3QgcmF3TGlzdD1BcnJheS5pc0FycmF5KGxpc3RSZXM/LmRhdGEpP2xpc3RSZXMuZGF0YToobGlzdFJlcz8uZGF0YT8ucmVjb3Jkc3x8bGlzdFJlcz8uZGF0YT8ubGlzdHx8W10pO2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyYXdMaXN0KT9yYXdMaXN0OltdO2NvbnN0IG1pbmU9bGlzdC5maW5kKGl0PT5TdHJpbmcoaXQudXNlcklkfHxpdC5jcmVhdGVCeXx8aXQudWlkfHwiIik9PT1TdHJpbmcodXNlcklkKSk7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKG1pbmV8fGxpc3RbMF18fGxpc3RSZXM/LmRhdGEpfWNhdGNoKGUpe319CmlmKHBvc3RJZCl7aWYoY29tbS5lbmFibGVMaWtlIT09ZmFsc2Upe3RyeXtjb25zdCBsaWtlUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL3NvY2lhbENvbW11L2xpa2VGYXZvcml0ZUluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0SWQ6U3RyaW5nKHBvc3RJZCksa2luZEZsYWc6IjAifSk7aWYobGlrZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSl7dHJ5e2F3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1lbnRJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGlkOlN0cmluZyhwb3N0SWQpLHVzZXJJZDpTdHJpbmcodXNlcklkKSxjb21tZW50czoi5Y6J5a6zIixzZW5kVG9zOiJbXG5cbl0ifSk7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuWujOaIkCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSl7dHJ5e2NvbnN0IHNoYXJlUmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvYXJ0aWNsZS9zaGFyZS8iK3Bvc3RJZCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7aWYoc2hhcmVSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvmiJDlip8gKzEiKX1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvaW50ZWdyYWwvYWRqdXN0QnlTaGFyZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UmJnBvc3RJZCl7dHJ5e2F3YWl0IGh0dHBEZWxldGUoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZS9kZWxldGVBcnRpY2xlP2FydGljbGVJZD0iK3Bvc3RJZCsiJnBvc3RUeXBlPTEiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtyZXN1bHQuc3RlcHMucHVzaCgi5Yqo5oCB5bey5Yig6ZmkIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIoOmZpOW8guW4uDogIitlKX19fQpyZXN1bHQudG90YWxHYWluPXJlc3VsdC5zaWduaW5TY29yZStyZXN1bHQuYmxpbmRCb3hTY29yZStyZXN1bHQuaW50ZXJhY3RTY29yZTtyZXN1bHQuc3VjY2Vzcz10cnVlfWNhdGNoKGUpe3Jlc3VsdC5lcnJvcj1TdHJpbmcoZSk7cmVzdWx0LnN0ZXBzLnB1c2goIuaJp+ihjOW8guW4uDogIitlKX1yZXR1cm4gcmVzdWx0fQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFZFSElDTEVfQUNUSU9OX1RFWFQ9e2ZpbmQ6IuefreaMieWvu+i9piIsbG91ZEZpbmQ6Ium4o+esm+mXqueBryIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6rIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07CmZ1bmN0aW9uIHZlaGljbGVDaGVja1JlcyhyZXMsb2tNc2cpe2lmKHJlcyYmIXJlcy5lcnJvciYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnfTtjb25zdCBlcnJUZXh0PVN0cmluZygocmVzJiYocmVzLmVycm9yfHxyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwiIikudG9Mb3dlckNhc2UoKTtpZihyZXMmJnJlcy5lcnJvciYmL3RpbWVvdXR8dGltZWQgb3V0fHRpbWUgb3V0fOivt+axgui2heaXti8udGVzdChlcnJUZXh0KSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnKyLvvIjlk43lupTotoXml7bkvYbovabovobpgJrluLjlt7LmiafooYzvvIzlj6/kuIvmi4nliLfmlrDnoa7orqTvvIkifTtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8KHJlcyYmcmVzLmVycm9yKXx8IuaMh+S7pOS4i+WPkeWksei0pSIsY29kZTpyZXMmJnJlcy5jb2RlfX0KYXN5bmMgZnVuY3Rpb24gdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpe3RyeXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7bGV0IHZpbj1hY2MudmluTm98fCIiO2lmKCF2aW4pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsYyk7aWYoIWxpc3R8fCFsaXN0Lmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq6I635Y+W5Yiw57uR5a6a6L2m6L6GKFZJTinvvIzor7fnoa7orqTotKblj7flt7Lnu5HlrprovabovoYifTt2aW49bGlzdFswXS52aW5Ob31jb25zdCBiYXNlPWJhc2VIZWFkZXJzKGFjYyk7aWYoYWN0aW9uPT09ImZpbmQiKXtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sIiIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2wvIit2aW4saCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuWvu+i9puaMh+S7pOW3suS4i+WPke+8jOi9pui+huW6lOmXqueBr+aPkOekuiIpfWlmKGFjdGlvbj09PSJsb3VkRmluZCIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe3BhcmFtOiI0Iix2aW46dmlufSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sVjIiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIum4o+esm+mXqueBr+aMh+S7pOW3suS4i+WPkSIpfWlmKGFjdGlvbj09PSJjdXNoaW9uIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7Y29tbW9uZDoiMjgiLGNvbW1vbmRQYXJhbToiMSIsdmN1OnZpbix2ZXJzaW9uOiJ2MiJ9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9wcm9wZXJ0eVR3by9vbmUiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuW8gOWdkOWeq+aMh+S7pOW3suS4i+WPke+8jOWdkOWeq+W6lOW8uei1tyIpfWlmKGFjdGlvbj09PSJ1bmxvY2sifHxhY3Rpb249PT0ibG9jayIpe2NvbnN0IHZLZXk9KGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKTtpZighdktleSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5bCa5pyq6YWN572u5LqR56uv5o6n6L2m5a+G6ZKl77ya6K+35Yiw44CM6K6+572uLeetvuWQjeWvhumSpemFjee9ruOAjeWhq+WGmeS6keerr+aOp+i9pkFFU+WvhumSpeW5tuS/neWtmOWQjuWGjeS9v+eUqOW8gC/lhbPplIEifTtpZighL15bMC05YS1mQS1GXXszMn0kLy50ZXN0KHZLZXkpKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLkupHnq6/mjqfovablr4bpkqXmoLzlvI/plJnor6/vvIjlupTkuLozMuS9jeWNgeWFrei/m+WItu+8ie+8jOivt+WIsOiuvue9rumhteaguOWvueWQjuS/neWtmCJ9O2NvbnN0IGxvY2tGbGFnPWFjdGlvbj09PSJ1bmxvY2siPyIxIjoiMCI7Y29uc3QgcGxhaW49J3tcbiAgImxvY2tGbGFnIiA6ICInK2xvY2tGbGFnKyciLFxuICAidmluTm8iIDogIicrdmluKyciXG59Jztjb25zdCBzZWNyZXQ9YWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbix2S2V5KTtjb25zdCBzZW5kQm9keT1KU09OLnN0cmluZ2lmeSh7c2VjcmV0OnNlY3JldH0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxwbGFpbixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvbmV0d29yay91bmxvY2siLGgsc2VuZEJvZHksMjUwMDApO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLGFjdGlvbj09PSJ1bmxvY2siPyLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiOiLkupHnq6/lhbPplIHmjIfku6Tlt7LkuIvlj5EiKX1yZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq55+l5pON5L2c57G75Z6LOiAiK2FjdGlvbn19Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuaOp+WItuW8guW4uDogIitTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGJhcmtQdXNoKGJhcmtLZXksdGl0bGUsYm9keSl7dHJ5e2xldCBzPVN0cmluZyhiYXJrS2V5fHwiIikudHJpbSgpLnJlcGxhY2UoL1wvKyQvLCIiKTtzPXMucmVwbGFjZSgvXmh0dHBzPzpcL1wvYXBpXC5kYXlcLmFwcFwvL2ksIiIpO2lmKCFzKXJldHVybntza2lwcGVkOnRydWV9O2xldCBiYXNlPSJodHRwczovL2FwaS5kYXkuYXBwIixrZXk9cztjb25zdCBtPXMubWF0Y2goL14oaHR0cHM/OlwvXC9bXi9dKylcLyguKykkL2kpO2lmKG0pe2Jhc2U9bVsxXTtrZXk9bVsyXX1rZXk9a2V5LnJlcGxhY2UoL15cLysvLCIiKTtjb25zdCB1PWJhc2UrIi8iK2VuY29kZVVSSUNvbXBvbmVudChrZXkpKyIvIitlbmNvZGVVUklDb21wb25lbnQodGl0bGUpKyIvIitlbmNvZGVVUklDb21wb25lbnQoYm9keSkrIj9ncm91cD1aRUVITyZzb3VuZD1iaXJkc29uZyI7cmV0dXJuIGF3YWl0IGh0dHBHZXQodSx7fSl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZyhlKX19fQoKLyogPT09PT09PT09PT09PT09PT0g5Luj55CG5qih5byP77yI5oyH5ZCR5Y6f6ISa5pysIHplZWhvLmJveCDlkI7nq6/vvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcHJveHlGZXRjaChwYXRoLG9wdHMpe2NvbnN0IHJhd0Jhc2U9Z2V0Q2ZnKCkuc2VydmVyQmFzZS5yZXBsYWNlKC9cLyskLywiIik7Y29uc3QgYmFzZT0od2luZG93Ll9fUEFORUxfTU9ERV9fJiYhcmF3QmFzZSk/IiI6cmF3QmFzZTtjb25zdCByPWF3YWl0IGZldGNoKGJhc2UrcGF0aCxvcHRzfHx7fSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX0KZnVuY3Rpb24gcHJveHlQb3N0KHBhdGgsYm9keSl7cmV0dXJuIHByb3h5RmV0Y2gocGF0aCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOnsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbiJ9LGJvZHk6SlNPTi5zdHJpbmdpZnkoYm9keXx8e30pfSl9Cgphc3luYyBmdW5jdGlvbiBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZyxsaW1pdCl7Y29uc3Qgb3V0PW5ldyBBcnJheShhY2NvdW50cy5sZW5ndGgpO2xldCBpPTA7YXN5bmMgZnVuY3Rpb24gd29ya2VyKCl7d2hpbGUoaTxhY2NvdW50cy5sZW5ndGgpe2NvbnN0IGlkeD1pKys7dHJ5e291dFtpZHhdPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjb3VudHNbaWR4XSxjZmcpfWNhdGNoKGUpe291dFtpZHhdPXt1c2VyTmFtZTphY2NvdW50c1tpZHhdLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjb3VudHNbaWR4XS51c2VySWQsc3VjY2VzczpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fX19Y29uc3Qgbj1NYXRoLm1heCgxLE1hdGgubWluKGxpbWl0fHwzLGFjY291bnRzLmxlbmd0aCkpO2F3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oe2xlbmd0aDpufSx3b3JrZXIpKTtyZXR1cm4gb3V0fQoKY29uc3QgQmFja2VuZD17CiAgYXN5bmMgc2VuZENvZGUocGhvbmUpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2VuZC1jb2RlIix7cGhvbmU6cGhvbmV9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i6aqM6K+B56CB5bey5Y+R6YCBIjoi5Y+R6YCB5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9hdXRoQ29kZS8iK2VuY29kZVVSSUNvbXBvbmVudChwaG9uZSk7CiAgICBjb25zdCBkPWF3YWl0IGh0dHBHZXQodXJsLHsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJHRVQiLHt9LCIiLGNmZyl9KTsKICAgIHJldHVybntvazpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCIsbWVzc2FnZTpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCI/IumqjOivgeeggeW3suWPkemAge+8jOivt+afpeaUtuefreS/oSI6KChkJiYoZC5tZXNzYWdlfHxkLm1zZykpfHwi5Y+R6YCB5aSx6LSlIil9OwogIH0sCiAgYXN5bmMgcGhvbmVMb2dpbihwaG9uZSxjb2RlLGJhc2ljQXV0aCl7CiAgICBjb25zdCBiYXNpYz1TdHJpbmcoYmFzaWNBdXRofHwiIikudHJpbSgpLnJlcGxhY2UoL15CYXNpY1xzKy9pLCIiKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3Bob25lLWxvZ2luIix7cGhvbmU6cGhvbmUsY29kZTpjb2RlLGJhc2ljQXV0aDpiYXNpY30pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLnmbvlvZXmiJDlip8iOiLnmbvlvZXlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHBheWxvYWQ9e3Bob25lOnBob25lLGF1dGhDb2RlOmNvZGV9OwogICAgY29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvdXNlci9sb2dpbkJ5UGhvbmUiOwogICAgY29uc3QgaGRyPXsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJQT1NUIix7fSxwYXlsb2FkLGNmZyl9OwogICAgaWYoYmFzaWMpaGRyWyJBdXRob3JpemF0aW9uIl09IkJhc2ljICIrYmFzaWM7CiAgICBjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QodXJsLGhkcixwYXlsb2FkLDIwMDAwKTsKICAgIGNvbnN0IHRva2VuSW5mbz1yZXMmJnJlcy5kYXRhJiZyZXMuZGF0YS50b2tlbkluZm87Y29uc3QgYWNjZXNzVG9rZW49dG9rZW5JbmZvJiZTdHJpbmcodG9rZW5JbmZvLmFjY2Vzc190b2tlbnx8IiIpOwogICAgaWYoIXJlc3x8U3RyaW5nKHJlcy5jb2RlKSE9PSIxMDAwMCJ8fCFhY2Nlc3NUb2tlbilyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi55m75b2V5aSx6LSl77yaIisoKHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCLpqozor4HnoIHmnInor6/miJblt7Lov4fmnJ8iKX07CiAgICBsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiOwogICAgdHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCIiLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2FjY2Vzc1Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkgwfSk7aWYoaW5mb1JlcyYmU3RyaW5nKGluZm9SZXMuY29kZSk9PT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcoaW5mb1Jlcy5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKGluZm9SZXMuZGF0YS5uaWNrTmFtZXx8IiIpO319Y2F0Y2goZSl7fQogICAgY29uc3QgbGlzdD1nZXRBY2NvdW50cygpO2xldCByZXBsYWNlZD1mYWxzZTsKICAgIGZvcihsZXQgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXtpZihsaXN0W2ldJiYoU3RyaW5nKGxpc3RbaV0udG9rZW58fCIiKT09PWFjY2Vzc1Rva2VufHwobGlzdFtpXS51c2VySWQmJnVzZXJJZCYmU3RyaW5nKGxpc3RbaV0udXNlcklkKT09PXVzZXJJZCkpKXtsaXN0W2ldLnRva2VuPWFjY2Vzc1Rva2VuO2lmKHVzZXJJZClsaXN0W2ldLnVzZXJJZD11c2VySWQ7aWYodXNlck5hbWUpbGlzdFtpXS51c2VyTmFtZT11c2VyTmFtZTtyZXBsYWNlZD10cnVlO2JyZWFrO319CiAgICBjb25zdCBuZXdBY2M9e3VzZXJOYW1lOnVzZXJOYW1lfHxwaG9uZSx1c2VySWQ6dXNlcklkLHRva2VuOmFjY2Vzc1Rva2VuLGJhcmtLZXk6IiIsdXNlckFnZW50OiIifTsKICAgIGlmKCFyZXBsYWNlZClsaXN0LnB1c2gobmV3QWNjKTsKICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgIHJldHVybntvazp0cnVlLG1lc3NhZ2U6cmVwbGFjZWQ/IueZu+W9leaIkOWKn++8jOW3suabtOaWsOivpei0puWPtyI6IueZu+W9leaIkOWKn++8jOW3sua3u+WKoOi0puWPtyJ9OwogIH0sCiAgYXN5bmMgZ2V0RGFzaGJvYXJkKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2RhdGEiKTsKICAgICAgaWYoZCYmZC5hY2NvdW50cylyZXR1cm57YWNjb3VudHM6ZC5hY2NvdW50cyx0aW1lc3RhbXA6ZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxjb25maWc6ZC5jb25maWd8fG51bGwsb2s6dHJ1ZX07CiAgICAgIHJldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLku6PnkIbmnI3liqHml6Dlk43lupQiLHJhdzpkfTsKICAgIH0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGRhdGE9YXdhaXQgZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsMyk7CiAgICByZXR1cm57YWNjb3VudHM6ZGF0YSx0aW1lc3RhbXA6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLG9rOnRydWV9OwogIH0sCiAgYXN5bmMgcnVuU2lnbmluKHVzZXJJZCxhbGwpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcnVuLXNpZ25pbiIsYWxsP3thbGw6dHJ1ZX06e3VzZXJJZDp1c2VySWR9KTtpZihkJiZkLnJlc3VsdHMpcmV0dXJue29rOnRydWUscmVzdWx0czpkLnJlc3VsdHN9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLmiafooYzlpLHotKUifX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IHJlc3VsdHM9W107Y29uc3QgdGFyZ2V0cz1hbGw/YWNjb3VudHM6YWNjb3VudHMuZmlsdGVyKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7CiAgICBpZighdGFyZ2V0cy5sZW5ndGgpcmV0dXJue29rOnRydWUscmVzdWx0czpbXX07CiAgICBmb3IoY29uc3QgYWNjIG9mIHRhcmdldHMpe2NvbnN0IHI9YXdhaXQgcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKTtyZXN1bHRzLnB1c2gocik7Y29uc3QgX2Q9bmV3IERhdGUoKTtjb25zdCBfZHM9X2QuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9kLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX2QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl9kLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X2RzLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6ci51c2VyTmFtZSx1c2VySWQ6ci51c2VySWQsc3VjY2VzczpyLnN1Y2Nlc3MsdG90YWxHYWluOnIudG90YWxHYWluLHNpZ25pblNjb3JlOnIuc2lnbmluU2NvcmUsYmxpbmRCb3hTY29yZTpyLmJsaW5kQm94U2NvcmUsaW50ZXJhY3RTY29yZTpyLmludGVyYWN0U2NvcmUsY29udGludWVEYXlzOnIuY29udGludWVEYXlzLGVycm9yOnIuZXJyb3Isc3RlcHM6ci5zdGVwc30pO2lmKHIuc3VjY2VzcyYmYWNjLmJhcmtLZXkmJlN0cmluZyhhY2MuYmFya0tleSkudHJpbSgpKXt0cnl7YXdhaXQgYmFya1B1c2goYWNjLmJhcmtLZXksIuaegeaguOetvuWIsOaIkOWKnyDCtyAiKyhyLnVzZXJOYW1lfHwiIiksIuS7iuaXpeiOt+W+lyAiK3IudG90YWxHYWluKyIg5YiG77yI562+5YiwIityLnNpZ25pblNjb3JlKyIgLyDnm7Lnm5IiK3IuYmxpbmRCb3hTY29yZSsiIC8g5LqS5YqoIityLmludGVyYWN0U2NvcmUrIu+8ie+8jOi/nuetviAiK3IuY29udGludWVEYXlzKyIg5aSpIil9Y2F0Y2goZSl7fX19CiAgICByZXR1cm57b2s6dHJ1ZSxyZXN1bHRzfTsKICB9LAogIGFzeW5jIHZlaGljbGVDdHJsKHVzZXJJZCxhY3Rpb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sIix7dXNlcklkOnVzZXJJZCxhY3Rpb246YWN0aW9ufSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpfX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2xldCBhY2M9YWNjb3VudHMuZmluZChhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpO2lmKCFhY2MmJmFjY291bnRzLmxlbmd0aClhY2M9YWNjb3VudHNbMF07aWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq5om+5Yiw6LSm5Y+377yM6K+35YWI5Zyo6K6+572u6aG15re75YqgIn07aWYoIVZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6Z2e5rOV5pON5L2c57G75Z6LIn07Y29uc3Qgcj1hd2FpdCB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyk7Y29uc3QgX3ZkPW5ldyBEYXRlKCk7Y29uc3QgX3Zkcz1fdmQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF92ZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF92ZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X3ZkLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X3Zkcyx0eXBlOiJ2ZWhpY2xlIixhY3Rpb246YWN0aW9uLGFjdGlvblRleHQ6VkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dfHwi6L2m6L6G5o6n5Yi2Iix1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ISFyLm9rLG1lc3NhZ2U6ci5tZXNzYWdlfHwiIixlcnJvcjpyLm9rPyIiOihyLm1lc3NhZ2V8fCLmjIfku6TlpLHotKUiKX0pO3JldHVybiByOwogIH0sCiAgYXN5bmMgZ2V0TG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9nZXQtbG9ncyIpO3JldHVybiBkJiZkLmxvZ3M/ZC5sb2dzOltdfXJldHVybiBnZXRMb2dzKCl9LAogIGFzeW5jIGNsZWFyTG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2NsZWFyLWxvZ3MiKTtyZXR1cm4gISFkLm9rfXJldHVybiBjbGVhckxvZ3MoKX0sCiAgYXN5bmMgc2F2ZUNvbmZpZyhjKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsYyk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUNmZyhjKX0sCiAgYXN5bmMgc2F2ZUFjY291bnRzKGxpc3Qpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtYWNjb3VudHMiLHthY2NvdW50czpsaXN0fSk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUFjY291bnRzKGxpc3QpfSwKICBhc3luYyBnZXRVc2VyaWQodG9rZW4pe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2dldC11c2VyaWQiLHt0b2tlbjp0b2tlbn0pO3JldHVybntvazohIWQub2ssdXNlcklkOmQudXNlcklkfHwiIix1c2VyTmFtZTpkLnVzZXJOYW1lfHwiIixlcnJvcjpkLmVycm9yfHwiIn19cmV0dXJuIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sZ2V0Q2ZnKCkpfSwKICBhc3luYyBnZXRDb25maWcoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvY29uZmlnIik7aWYoZCYmZC5jb25maWcpcmV0dXJue29rOnRydWUsY29uZmlnOmQuY29uZmlnfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi6I635Y+W6YWN572u5aSx6LSlIn19cmV0dXJue29rOnRydWUsY29uZmlnOmdldENmZygpfX0sCiAgYXN5bmMgZ2V0QWNjb3VudHNGdWxsKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FjY291bnRzIik7cmV0dXJuIEFycmF5LmlzQXJyYXkoZCYmZC5hY2NvdW50cyk/ZC5hY2NvdW50czpbXX1yZXR1cm4gZ2V0QWNjb3VudHMoKX0sCiAgYXN5bmMgYmFja3VwKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmFja3VwIik7cmV0dXJuIGQmJmQub2s/ZDpudWxsfQogICAgcmV0dXJue29rOnRydWUsYXBwOiLmnoHmoLhaRUVITyIsdHlwZToiemVlaG9fYmFja3VwIix2ZXJzaW9uOkFQUF9WRVJTSU9OLHRpbWU6Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLGFjY291bnRzOmdldEFjY291bnRzKCksY29uZmlnOmdldENmZygpfQogIH0sCiAgYXN5bmMgcmVzdG9yZUJhY2t1cChqc29uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2ltcG9ydCIse2pzb246anNvbn0pO3JldHVybiBkfHx7b2s6ZmFsc2UsZXJyb3I6IuWQjuerr+aXoOWTjeW6lCJ9fQogICAgdHJ5ewogICAgICBjb25zdCBiPXR5cGVvZiBqc29uPT09InN0cmluZyI/SlNPTi5wYXJzZShqc29uKTpqc29uOwogICAgICBpZighYnx8KGIudHlwZSE9PSJ6ZWVob19iYWNrdXAiJiYhQXJyYXkuaXNBcnJheShiLmFjY291bnRzKSkpcmV0dXJue29rOmZhbHNlLGVycm9yOiLlpIfku73moLzlvI/kuI3mraPnoa4ifTsKICAgICAgY29uc3QgbGlzdD0oYi5hY2NvdW50c3x8W10pLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCIiLHVzZXJJZDphLnVzZXJJZHx8IiIsdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXl8fCIiKSx1c2VyQWdlbnQ6YS51c2VyQWdlbnR8fCIifSkpOwogICAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICAgIGlmKGIuY29uZmlnJiZ0eXBlb2YgYi5jb25maWc9PT0ib2JqZWN0Iil7CiAgICAgICAgY29uc3QgY3VyPWdldENmZygpOwogICAgICAgIHNhdmVDZmcoewogICAgICAgICAgYXBwOnthcHBJZDpiLmNvbmZpZy5hcHA/LmFwcElkfHxjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5hcHA/LmFwcFNlY3JldHx8Y3VyLmFwcC5hcHBTZWNyZXR9LAogICAgICAgICAgaDU6e2FwcElkOmIuY29uZmlnLmg1Py5hcHBJZHx8Y3VyLmg1LmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5oNT8uYXBwU2VjcmV0fHxjdXIuaDUuYXBwU2VjcmV0fSwKICAgICAgICAgIGNvbW11bml0eTp7ZW5hYmxlUG9zdDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgICAgICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCksCiAgICAgICAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGIuY29uZmlnLmF1dG9SZWZyZXNoU2VjKSwKICAgICAgICAgIHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2UKICAgICAgICB9KTsKICAgICAgfQogICAgICByZXR1cm57b2s6dHJ1ZSxjb3VudDpsaXN0Lmxlbmd0aH07CiAgICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19CiAgfSwKICAvKiAtLS0tIHYyLjE0Ljkg5paw5aKe5ZCO56uv6IO95Yqb77yI5LuF5Luj55CG5qih5byP77yJIC0tLS0gKi8KICBhc3luYyBpbnRlZ3JhbCh1c2VySWQscGFnZSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaCgiL2FwaS9pbnRlZ3JhbD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZwYWdlPSIrKHBhZ2V8fDEpKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi56ev5YiG5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgc3VwcGxlbWVudChhY3Rpb24sdXNlcklkLHBhcmFtcyl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgbGV0IHE9Ii9hcGkvc3VwcGxlbWVudD9hY3Rpb249IitlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uKSsiJnVzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTsKICAgICAgcGFyYW1zPXBhcmFtc3x8e307T2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKGs9PntxKz0iJiIrZW5jb2RlVVJJQ29tcG9uZW50KGspKyI9IitlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW2tdKX0pOwogICAgICByZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKQogICAgfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLooaXnrb7lip/og73ku4XmlK/mjIHku6PnkIbmqKHlvI/vvIhpT1MgQXBwIC8g5qGM6Z2i54mIIC8gTG9vbu+8iSJ9CiAgfSwKICBhc3luYyB2ZWhpY2xlTW9uaXRvcih1c2VySWQsdmluKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL3ZlaGljbGUtbW9uaXRvcj91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui9pui+huebkeaOp+S7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyB2ZWhpY2xlQ29udHJvbEV4dChib2R5KXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe3JldHVybiBhd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sLWV4dCIsYm9keSl9CiAgICByZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6L2m5o6n5omp5bGV5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIGluZm9DZW50ZXIodXNlcklkLHZpbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtsZXQgcT0iL2FwaS9pbmZvLWNlbnRlcj91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuS/oeaBr+S4reW/g+S7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfQp9OwovKiA9PT09PT09PT09PT09PT09PSDpnaLmnb/mlbDmja7lkIzmraXvvIjpnaLmnb/mqKHlvI/vvJrorr7nva7pobXku47ohJrmnKzlkI7nq6/or7votKblj7fkuI7phY3nva7vvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlSZW1vdGVDZmcoYyl7CiAgaWYoIWN8fHR5cGVvZiBjIT09Im9iamVjdCIpcmV0dXJuOwogIGNvbnN0IGxvY2FsPWdldENmZygpOwogIHNhdmVDZmcoewogICAgYXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fGxvY2FsLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8bG9jYWwuYXBwLmFwcFNlY3JldH0sCiAgICBoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fGxvY2FsLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fGxvY2FsLmg1LmFwcFNlY3JldH0sCiAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpLAogICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSwKICAgIHNlcnZlckJhc2U6bG9jYWwuc2VydmVyQmFzZSwKICAgIGF1dG9TaWduaW46Yy5hdXRvU2lnbmluPT09dHJ1ZSwKICAgIGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksCiAgICB2ZWhpY2xlTW9uaXRvcjpjLnZlaGljbGVNb25pdG9yPT09dHJ1ZQogIH0pOwp9CmxldCBwYW5lbFN5bmNpbmc9ZmFsc2U7CmFzeW5jIGZ1bmN0aW9uIGVuc3VyZVBhbmVsRGF0YShmb3JjZSl7CiAgaWYoIWlzUHJveHlNb2RlKCl8fGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApcmV0dXJuOwogIGlmKHBhbmVsU3luY2luZylyZXR1cm47CiAgaWYoIWZvcmNlJiZTVEFURS5wYW5lbExvYWRlZClyZXR1cm47CiAgcGFuZWxTeW5jaW5nPXRydWU7CiAgdHJ5ewogICAgY29uc3QgW2MsYV09YXdhaXQgUHJvbWlzZS5hbGwoW0JhY2tlbmQuZ2V0Q29uZmlnKCksQmFja2VuZC5nZXRBY2NvdW50c0Z1bGwoKV0pOwogICAgaWYoYSYmYS5sZW5ndGgpe1NUQVRFLnBhbmVsQWNjb3VudHM9YX0KICAgIGlmKGMmJmMub2smJmMuY29uZmlnKWFwcGx5UmVtb3RlQ2ZnKGMuY29uZmlnKTsKICAgIFNUQVRFLnBhbmVsTG9hZGVkPXRydWU7CiAgfWNhdGNoKGUpe30KICBwYW5lbFN5bmNpbmc9ZmFsc2U7Cn0KLyogPT09PT09PT09PT09PT09PT0g5Zu+5qCHID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEk9ewpjaGVjazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiLz48L3N2Zz4nLAp4Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+JywKemFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLApsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz4nLAp1bmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA3LjUtMS43Ii8+PC9zdmc+JywKYmVsbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggOGE2IDYgMCAxIDAtMTIgMGMwIDctMyA5LTMgOWgxOHMtMy0yLTMtOSIvPjxwYXRoIGQ9Ik0xMy43IDIxYTIgMiAwIDAgMS0zLjQgMCIvPjwvc3ZnPicsCnZvbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0VjV6Ii8+PHBhdGggZD0iTTE1LjUgOC41YTUgNSAwIDAgMSAwIDdNMTguNSA1LjVhOSA5IDAgMCAxIDAgMTMiLz48L3N2Zz4nLApzZWF0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDRoMTR2N2E0IDQgMCAwIDEtNCA0SDlhNCA0IDAgMCAxLTQtNFY0eiIvPjxwYXRoIGQ9Ik05IDE1djVoNnYtNSIvPjwvc3ZnPicsCnBpbjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDB6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPicsCnRpcmU6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjUiLz48cGF0aCBkPSJNMTIgM3Y1LjVNMTIgMTUuNVYyMU0zIDEyaDUuNU0xNS41IDEySDIxIi8+PC9zdmc+JywKYm9sdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKdGhlcm1vOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNCAxNC43NlY1YTIgMiAwIDEgMC00IDB2OS43NmE0IDQgMCAxIDAgNCAweiIvPjwvc3ZnPicsCmNhbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIzIi8+PHBhdGggZD0iTTE2IDJ2NE04IDJ2NE0zIDEwaDE4Ii8+PC9zdmc+JywKY2FyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEzIDYuNSA3LjVBMiAyIDAgMCAxIDguNCA2aDcuMmEyIDIgMCAwIDEgMS45IDEuNUwxOSAxMyIvPjxwYXRoIGQ9Ik00IDEzaDE2YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEtMSAxaC0xYTIgMiAwIDEgMS00IDBIOWEyIDIgMCAxIDEtNCAwSDRhMSAxIDAgMCAxLTEtMXYtM2ExIDEgMCAwIDEgMS0xeiIvPjwvc3ZnPicsCnNjb290ZXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+JywKcGx1ZzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAydjZNMTUgMnY2TTcgOGgxMHY0YTUgNSAwIDAgMS0xMCAwVjh6TTEyIDE3djUiLz48L3N2Zz4nLApjbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTEyIDd2NWwzIDMiLz48L3N2Zz4nLAp3aWZpOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEyLjVhMTAgMTAgMCAwIDEgMTQgME04LjUgMTZhNSA1IDAgMCAxIDcgMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTkiIHI9IjEiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPicsCmFsZXJ0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiA5djRNMTIgMTdoLjAxIi8+PHBhdGggZD0iTTEwLjMgMy45IDEuOCAxOGEyIDIgMCAwIDAgMS43IDNoMTdhMiAyIDAgMCAwIDEuNy0zTDEzLjcgMy45YTIgMiAwIDAgMC0zLjQgMHoiLz48L3N2Zz4nLAp3YXJuOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzIDIgMjFoMjBMMTIgM3oiLz48cGF0aCBkPSJNMTIgMTB2NU0xMiAxOGguMDEiLz48L3N2Zz4nLAprdjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIi8+PHBhdGggZD0iTTcgOWgzTTE0IDE1aDNNMTAgOWguMDFNMTcgMTVoLjAxIi8+PC9zdmc+JywKa2V5Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjgiIGN5PSIxNSIgcj0iNC41Ii8+PHBhdGggZD0iTTExLjIgMTEuOCAyMCAzTTE2IDdsMyAzTTEzIDEwbDIgMiIvPjwvc3ZnPicsCnVzZXJzOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjkiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIgMjFhNyA3IDAgMCAxIDE0IDBNMTYgNC42YTQgNCAwIDAgMSAwIDYuOE0xOSAyMWE2LjUgNi41IDAgMCAwLTMtNS41Ii8+PC9zdmc+JywKbWFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDMgMy41IDV2MTZMOSAxOWw2IDIgNS41LTJWM0wxNSA1IDkgM3oiLz48cGF0aCBkPSJNOSAzdjE2TTE1IDV2MTYiLz48L3N2Zz4nCn07CgovKiA9PT09PT09PT09PT09PT09PSDln7rnoYAgVUkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHRvYXN0VGltZXI9bnVsbDsKZnVuY3Rpb24gdG9hc3QobXNnLHR5cGUpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0b2FzdCIpO2VsLmNsYXNzTmFtZT10eXBlfHwiaW5mbyI7ZWwuaW5uZXJIVE1MPSh0eXBlPT09ImVyciI/SS54OnR5cGU9PT0ib2siP0kuY2hlY2s6SS53aWZpKSsnPHNwYW4+Jytlc2MobXNnKSsnPC9zcGFuPic7cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT5lbC5jbGFzc0xpc3QuYWRkKCJzaG93IikpO2NsZWFyVGltZW91dCh0b2FzdFRpbWVyKTt0b2FzdFRpbWVyPXNldFRpbWVvdXQoKCk9PmVsLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKSwyNjAwKX0KLyogdjIuMTQuMTAg5L+u5aSN77ya5pen54mI5oqK5Zue6LCD5Ye95pWw5rqQ56CB55u05o6l5ou86L+bIG9uY2xpY2sg5bGe5oCn77yMYXN5bmMg5Zue6LCD5YaF55qE5Y+M5byV5Y+35Lya5oiq5patIEhUTUwg5bGe5oCn77yMCiAgIOWvvOiHtOihpeetvi/lhZHmjaLooaXnrb7ljaEv6Ziy55uX5biD5o6n562J44CM56Gu5a6a44CN5oyJ6ZKu54K55Ye75peg5Y+N5bqU44CC5pS55Li65pqC5a2Y5Zue6LCD44CB5oyJ6ZKu6LCD55So5YWo5bGAIGNvbmZpcm1ZZXMoKSAqLwpsZXQgX19jb25maXJtQWN0PW51bGw7CmZ1bmN0aW9uIGNvbmZpcm1EaWFsb2codGl0bGUsZGVzYyxvblllcyx5ZXNUeHQpe19fY29uZmlybUFjdD1vblllcztjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7bGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+Jytlc2ModGl0bGUpKyc8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+JytkZXNjKyc8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9ImNsb3NlQ29uZmlybSgpIj7lj5bmtog8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9ImNvbmZpcm1ZZXMoKSI+Jytlc2MoeWVzVHh0fHwi56Gu5a6aIikrJzwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7bGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIil9CmZ1bmN0aW9uIGNvbmZpcm1ZZXMoKXtjbG9zZUNvbmZpcm0oKTtjb25zdCBhPV9fY29uZmlybUFjdDtfX2NvbmZpcm1BY3Q9bnVsbDtpZihhPT1udWxsKXJldHVybjt0cnl7aWYodHlwZW9mIGE9PT0iZnVuY3Rpb24iKXthKCl9ZWxzZSBpZih0eXBlb2YgYT09PSJzdHJpbmciKXtjb25zdCByPW5ldyBGdW5jdGlvbigicmV0dXJuICgiK2ErIikiKSgpO2lmKHR5cGVvZiByPT09ImZ1bmN0aW9uIilyKCl9fWNhdGNoKGUpe319CmZ1bmN0aW9uIGNsb3NlQ29uZmlybSgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKS5jbGFzc0xpc3QuYWRkKCJoaWRkZW4iKX0KZnVuY3Rpb24gb3BlblNoZWV0KHRpdGxlLGljb24saHRtbCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0VGl0bGUiKS5pbm5lckhUTUw9aWNvbisnPHNwYW4+Jytlc2ModGl0bGUpKyc8L3NwYW4+Jztkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCb2R5IikuaW5uZXJIVE1MPWh0bWw7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9ImhpZGRlbiJ9CmZ1bmN0aW9uIGNsb3NlU2hlZXQoKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iIn0KZnVuY3Rpb24gZm10VGltZShpc28pe3RyeXtjb25zdCBkPW5ldyBEYXRlKGlzbyk7Y29uc3QgcD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpO3JldHVybiBkLmdldEZ1bGxZZWFyKCkrIi0iK3AoZC5nZXRNb250aCgpKzEpKyItIitwKGQuZ2V0RGF0ZSgpKSsiICIrcChkLmdldEhvdXJzKCkpKyI6IitwKGQuZ2V0TWludXRlcygpKSsiOiIrcChkLmdldFNlY29uZHMoKSl9Y2F0Y2goZSl7cmV0dXJuIiJ9fQoKLyogPT09PT09PT09PT09PT09PT0g6aG16Z2i5YiH5o2iID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHN3aXRjaFRhYih0YWIpewogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIi50YWIiKS5mb3JFYWNoKHQ9PnQuY2xhc3NMaXN0LnRvZ2dsZSgib24iLHQuZGF0YXNldC50YWI9PT10YWIpKTsKICBjb25zdCBwYWdlcz17aG9tZToicGFnZUhvbWUiLHBvaW50czoicGFnZVBvaW50cyIsdmVoaWNsZToicGFnZVZlaGljbGUiLGxvZ3M6InBhZ2VMb2dzIixjZmc6InBhZ2VDZmcifTsKICBPYmplY3Qua2V5cyhwYWdlcykuZm9yRWFjaChrPT57Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFnZXNba10pO2lmKGVsKWVsLmNsYXNzTGlzdC50b2dnbGUoImhpZGRlbiIsayE9PXRhYil9KTsKICBpZih0YWI9PT0icG9pbnRzIilyZW5kZXJQb2ludHMoKTsKICBpZih0YWI9PT0idmVoaWNsZSIpcmVuZGVyVmVoaWNsZVBhZ2UoKTsKICBpZih0YWI9PT0ibG9ncyIpcmVuZGVyTG9ncygpOwogIGlmKHRhYj09PSJjZmciKXJlbmRlckNmZygpOwp9CgovKiA9PT09PT09PT09PT09PT09PSDoh6rliqjliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHJlZnJlc2hUaW1lcj1udWxsLHJlZnJlc2hMZWZ0PTYwOwpmdW5jdGlvbiBzdGFydEF1dG9SZWZyZXNoKHNlYyl7c3RvcEF1dG9SZWZyZXNoKCk7cmVmcmVzaExlZnQ9c2VjfHxnZXRDZmcoKS5hdXRvUmVmcmVzaFNlYzt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoVGltZXI9c2V0SW50ZXJ2YWwoKCk9PntyZWZyZXNoTGVmdC0tO2lmKHJlZnJlc2hMZWZ0PD0wKXtyZWZyZXNoTGVmdD0wO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB1cGRhdGVDb3VudENoaXAoKX0sMTAwMCl9CmZ1bmN0aW9uIHN0b3BBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcil7Y2xlYXJJbnRlcnZhbChyZWZyZXNoVGltZXIpO3JlZnJlc2hUaW1lcj1udWxsfX0KZnVuY3Rpb24gdXBkYXRlQ291bnRDaGlwKCl7Y29uc3QgY2hpcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRDaGlwIik7Y29uc3QgdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudFR4dCIpO2NvbnN0IGFyYz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRBcmMiKTtjb25zdCBzZWM9Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWN8fDYwO2lmKCFjaGlwKXJldHVybjtpZihyZWZyZXNoVGltZXIpe2NoaXAuY2xhc3NMaXN0LmFkZCgib24iKTt0eHQudGV4dENvbnRlbnQ9cmVmcmVzaExlZnQrInMiO2NvbnN0IEM9MipNYXRoLlBJKjUuNjthcmMuc2V0QXR0cmlidXRlKCJzdHJva2UtZGFzaG9mZnNldCIsU3RyaW5nKEMqKDEtcmVmcmVzaExlZnQvc2VjKSkpfWVsc2V7Y2hpcC5jbGFzc0xpc3QucmVtb3ZlKCJvbiIpO3R4dC50ZXh0Q29udGVudD0i5omL5YqoIn19CmZ1bmN0aW9uIHRvZ2dsZUF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXN0b3BBdXRvUmVmcmVzaCgpO2Vsc2Ugc3RhcnRBdXRvUmVmcmVzaCgpO3VwZGF0ZUNvdW50Q2hpcCgpfQoKLyogPT09PT09PT09PT09PT09PT0g5LiL5ouJ5Yi35pawID09PT09PT09PT09PT09PT09ICovCihmdW5jdGlvbigpe2NvbnN0IHdyYXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0cldyYXAiKSxpbmQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0ckluZCIpLHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyVHh0Iiksc3Bpbj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyU3BpbiIpO2xldCBzdGFydFk9MCxwdWxsaW5nPWZhbHNlLGRpc3RhbmNlPTA7Y29uc3QgVEg9NjQ7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hzdGFydCIsZT0+e2lmKHdpbmRvdy5zY3JvbGxZPD0wJiZkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKSYmIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpLmNsYXNzTGlzdC5jb250YWlucygiaGlkZGVuIikpe3N0YXJ0WT1lLnRvdWNoZXNbMF0uY2xpZW50WTtwdWxsaW5nPXRydWU7ZGlzdGFuY2U9MH19LHtwYXNzaXZlOnRydWV9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaG1vdmUiLGU9PntpZighcHVsbGluZylyZXR1cm47Y29uc3QgZHk9ZS50b3VjaGVzWzBdLmNsaWVudFktc3RhcnRZO2lmKGR5PjAmJndpbmRvdy5zY3JvbGxZPD0wKXtkaXN0YW5jZT1NYXRoLm1pbihkeSowLjUsOTApO2luZC5zdHlsZS5oZWlnaHQ9ZGlzdGFuY2UrInB4IjtpbmQuY2xhc3NMaXN0LmFkZCgicHVsbGluZyIpO3NwaW4uc3R5bGUudHJhbnNmb3JtPSJyb3RhdGUoIisoZGlzdGFuY2UqMy42KSsiZGVnKSI7dHh0LnRleHRDb250ZW50PWRpc3RhbmNlPj1USD8i5p2+5byA5Yi35pawIjoi5LiL5ouJ5Yi35pawIjtpZihkaXN0YW5jZT49VEgmJiFlLmNhbmNlbGFibGUpcmV0dXJuO2lmKGRpc3RhbmNlPj1USCYmZS5jYW5jZWxhYmxlKWUucHJldmVudERlZmF1bHQoKX19LHtwYXNzaXZlOmZhbHNlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2hlbmQiLCgpPT57aWYoIXB1bGxpbmcpcmV0dXJuO3B1bGxpbmc9ZmFsc2U7aWYoZGlzdGFuY2U+PVRIKXt0eHQudGV4dENvbnRlbnQ9IuWIt+aWsOS4reKApiI7aW5kLnN0eWxlLmhlaWdodD0iNDZweCI7c3Bpbi5jbGFzc0xpc3QuYWRkKCJzcGlubmVyIik7cmVmcmVzaEFsbCh0cnVlKS5maW5hbGx5KCgpPT57aW5kLnN0eWxlLmhlaWdodD0iMCI7aW5kLmNsYXNzTGlzdC5yZW1vdmUoInB1bGxpbmciKX0pfWVsc2V7aW5kLnN0eWxlLmhlaWdodD0iMCJ9ZGlzdGFuY2U9MH0se3Bhc3NpdmU6dHJ1ZX0pOwp9KSgpOwoKLyogPT09PT09PT09PT09PT09PT0g6aaW6aG15riy5p+TID09PT09PT09PT09PT09PT09ICovCmxldCBTVEFURT17ZGF0YTpbXSx0aW1lc3RhbXA6IiIsdHNUZXh0OiIiLHJlZnJlc2hTZWM6NjAscHJveHk6ZmFsc2UscGFuZWxBY2NvdW50czpudWxsLHBhbmVsTG9hZGVkOmZhbHNlfTsKLy8g6aaW6aG15Y2h54mH5YWl5Zy65Yqo55S75Y+q5Zyo56ys5LiA5qyh5riy5p+T5pe25pKt5pS+77yM5LmL5ZCO6Z2Z6buY5Yi35paw55u05o6l5pu/5o2i5YaF5a6577yM6YG/5YWN5bGP6ZeqCmxldCBIT01FX0FOSU09dHJ1ZTsKZnVuY3Rpb24gc2tlbGV0b25Ib21lKCl7cmV0dXJuICc8ZGl2IGNsYXNzPSJoZXJvIiBzdHlsZT0iaGVpZ2h0OjEzMnB4Ij48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NDAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzYwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2Pid9CmZ1bmN0aW9uIHNjb290ZXJGYWxsYmFjaygpe3JldHVybiAnPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTgiIHI9IjIuNCIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTciIHI9IjIuNCIvPjxwYXRoIGQ9Ik01IDE4aDEwbDQtMS0yLjUtNEg5TTcgOWg0TTEyIDEzVjdtMCAwIDIgMiIvPjwvc3ZnPid9CgpmdW5jdGlvbiByZW5kZXJIb21lKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7Y29uc3QgZGF0YT1TVEFURS5kYXRhOwogIC8vIOS4jeWGjeWcqOavj+asoea4suafk+WJjeaPkuWFpemqqOaetuWxj++8mumdmem7mOiHquWKqOWIt+aWsOaXtuS8muWFiOa4heepuuWGjeWhq+WFhe+8jOmAoOaIkOaVtOmhtemXqueDgQogIGlmKGRhdGEubGVuZ3RoPT09MCl7CiAgICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48ZGl2IGNsYXNzPSJlLWljb24iPicrSS5jYXIrJzwvZGl2PjxoMz7ov5jmsqHmnInmnoHmoLjotKblj7c8L2gzPjxwPuWOu+OAjOiuvue9ruOAjemhtea3u+WKoOi0puWPt++8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIFRva2Vu77yIQmVhcmVyIOWJjee8gOS8muiHquWKqOWOu+aOie+8ie+8jOWGjeeCueOAjOiOt+WPlklE44CN5Y2z5Y+v6Ieq5Yqo5aGr5YWF55So5oi3SUTjgII8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5Y675re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JzsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2FyZHM9ZGF0YS5tYXAoKGEsaWR4KT0+cmVuZGVyQWNjb3VudENhcmQoYSxpZHgpKS5qb2luKCIiKTsKICBjb25zdCBwcm94eUhpbnQ9U1RBVEUucHJveHk/JzxkaXYgY2xhc3M9ImNmZy1ub3RlIiBzdHlsZT0ibWFyZ2luLWJvdHRvbToxNHB4Ij48Yj4nKyh3aW5kb3cuX19QQU5FTF9NT0RFX18/Iumdouadv+aooeW8jyI6IuS7o+eQhuaooeW8jyIpKyc8L2I+77ya5pWw5o2u55Sx5pys5py66ISa5pys5ZCO56uv562+5ZCN5LiO6I635Y+W44CCPC9kaXY+JzoiIjsKICBlbC5pbm5lckhUTUw9cHJveHlIaW50K2NhcmRzCiAgKyc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyDmlbDmja7mm7TmlrAgJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITyIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPuS9nOiAhSBsdWNreSDCtyBHaXRIdWI8L2E+IMK3IDxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtTwvYT4gwrcg5LuF5L6b5a2m5Lmg56CU56m2PC9kaXY+JzsKICBIT01FX0FOSU09ZmFsc2U7Cn0KCmZ1bmN0aW9uIHBvd2VyVGV4dChwLGwpe3A9U3RyaW5nKHB8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtsPVN0cmluZyhsfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7Y29uc3Qgb25WYWxzPVsiMSIsIm9uIiwidHJ1ZSIsIuW8gOacuiIsIm9wZW4iLCLmv4DmtLsiLCJhY2Nfb24iLCJhY2Mgb24iLCJwb3dlcl9vbiIsInBvd2VyIG9uIiwi5bey5byA5py6Iiwi5bey5LiK55S1Il07Y29uc3Qgb2ZmVmFscz1bIjAiLCJvZmYiLCJmYWxzZSIsIuWFs+acuiIsImNsb3NlZCIsIuW+heacuiIsImFjY19vZmYiLCJhY2Mgb2ZmIiwicG93ZXJfb2ZmIiwicG93ZXIgb2ZmIiwi5bey5YWz5py6Iiwi5bey5LiL55S1Il07aWYocCl7aWYob25WYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihvZmZWYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19aWYobCl7aWYoWyIwIiwi5pyq6ZSBIiwi5byA6ZSBIiwidW5sb2NrZWQiLCJmYWxzZSIsIm9wZW4iLCLlt7LlvIDplIEiLCLmnKrplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYoWyIxIiwi5bey6ZSBIiwi6ZSB6L2mIiwibG9ja2VkIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19cmV0dXJue3RleHQ6IueKtuaAgeacquefpSIsY2xzOiJvZmYifX0KZnVuY3Rpb24gb25saW5lVGV4dChvKXtjb25zdCBzPVN0cmluZyhvfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib24iLCJvbmxpbmUiLCJ0cnVlIiwi5Zyo57q/Iiwi5bey5Zyo57q/IiwiY29ubmVjdGVkIiwibm9ybWFsIl0uaW5jbHVkZXMocykpcmV0dXJuIuWcqOe6vyI7aWYoWyIwIiwib2ZmIiwib2ZmbGluZSIsImZhbHNlIiwi56a757q/Iiwi5pyq5Zyo57q/Iiwi5bey56a757q/IiwiZGlzY29ubmVjdCIsImRpc2Nvbm5lY3RlZCIsInNsZWVwIiwi5LyR55ygIl0uaW5jbHVkZXMocykpcmV0dXJuIuemu+e6vyI7cmV0dXJuIHN9CmZ1bmN0aW9uIHJlbmRlckFjY291bnRDYXJkKGEsaWR4KXsKICBjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3Qgb25sPW9ubGluZVRleHQodi5vbmxpbmV8fHYucmlkZVN0YXRlKTsKICBjb25zdCBpc0NoYXJnaW5nPXYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1IjsKICBjb25zdCBzb2M9di5iYXR0ZXJ5UGVyY2VudHx8MDsKICBjb25zdCBzb2NDb2w9c29jPD0yMD8iI0Y5NzA2QSI6c29jPD01MD8iI0Y3Qjk1NSI6IiMzRERDOTciOwogIGNvbnN0IHJhbmdlPXYucmVzaWR1YWxSYW5nZUttfHwwOwogIGNvbnN0IHZvbHQ9di52b2x0YWdlP01hdGgucm91bmQodi52b2x0YWdlKSsiViI6IiI7CiAgY29uc3QgaW1nPXYudmVoaWNsZUltYWdlVXJsPyc8aW1nIHNyYz0iJytlc2Modi52ZWhpY2xlSW1hZ2VVcmwpKyciIGFsdD0iIiBvbmVycm9yPSJ0aGlzLnBhcmVudE5vZGUuaW5uZXJIVE1MPVwnJytzY29vdGVyRmFsbGJhY2soKS5yZXBsYWNlKC8nL2csIlxcJyIpKydcJyI+JzpzY29vdGVyRmFsbGJhY2soKTsKICBjb25zdCB2ZWhTdz12Lmhhc1ZlaGljbGU/cmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCk6IiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2FyZCBob21lLWNhcmQnKyhIT01FX0FOSU0/JyBhbmltLWluJzonJykrJyIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpZHgqNjApKydtcyI+JysKICAgICc8ZGl2IGNsYXNzPSJoYy11cGQiPuabtOaWsO+8micrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy10b3AiPjxkaXYgY2xhc3M9ImhjLW5hbWUiPicrZXNjKHYuaGFzVmVoaWNsZT8odi52ZWhpY2xlTmFtZXx8YS51c2VyTmFtZSk6YS51c2VyTmFtZSkrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlPyhvbmw9PT0i5Zyo57q/Ij8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIG9uIj7lnKjnur88L3NwYW4+Jzoob25sPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UiPicrZXNjKG9ubCkrJzwvc3Bhbj4nOiIiKSk6IiIpKwogICAgKGEudG9rZW5WYWxpZD09PWZhbHNlPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgZXJyIj5Ub2tlbuWkseaViDwvc3Bhbj4nOiIiKSsKICAgIChpc0NoYXJnaW5nPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgY2hnIj7lhYXnlLXkuK08L3NwYW4+JzoiIikrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlJiZ2LnZlaGljbGVNb2RlbD8nPGRpdiBjbGFzcz0iaGMtbW9kZWwiPui9puWei++8micrZXNjKHYudmVoaWNsZU1vZGVsKSsnPC9kaXY+JzoiIikrCiAgICAodi5oYXNWZWhpY2xlPyc8ZGl2IGNsYXNzPSJoYy1taWQiPjxkaXYgY2xhc3M9ImhjLWxlZnQiPjxkaXYgY2xhc3M9ImhjLWJpZyBudW0iPicrTWF0aC5yb3VuZChzb2MpKyclPHNwYW4gY2xhc3M9ImhjLWttIG51bSI+JysocmFuZ2V8fDApKydrbTwvc3Bhbj4nKyh2b2x0Pyc8c3BhbiBjbGFzcz0iaGMtdiBudW0iPicrdm9sdCsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWJhciI+PGRpdiBjbGFzcz0iaGMtZmlsbCIgc3R5bGU9IndpZHRoOicrTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsc29jKSkrJyU7YmFja2dyb3VuZDonK3NvY0NvbCsnIj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvd3MiPjxkaXYgY2xhc3M9ImhjLXJvdyI+6YeM56iL77yaJysodi5sYXN0UmlkZU1pbGVhZ2U/di5sYXN0UmlkZU1pbGVhZ2UudG9GaXhlZCgxKToiMCIpKydrbTwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtcm93Ij7kuIrmrKHvvJonKyh2Lmxhc3RSaWRlTWlsZWFnZT92Lmxhc3RSaWRlTWlsZWFnZS50b0ZpeGVkKDEpKyJrbSI6Ii0tIikrKGZtdE1pbih2Lmxhc3RSaWRlRHVyYXRpb24pPyIgIitmbXRNaW4odi5sYXN0UmlkZUR1cmF0aW9uKToiIikrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtcm93Ij7lvZPml6XvvJonKyh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6IjAiKSsna20nKyhmbXRNaW4odi50b2RheUR1cmF0aW9uKT8iICIrZm10TWluKHYudG9kYXlEdXJhdGlvbik6IiIpKyh2LnRvZGF5TWF4U3BlZWQ/IiAiK3YudG9kYXlNYXhTcGVlZCsia20vaCI6IiIpKyc8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWltZyI+JytpbWcrJzwvZGl2PjwvZGl2Pic6CiAgICAnPGRpdiBjbGFzcz0ibm8tdmVoaWNsZSIgc3R5bGU9Im1hcmdpbjoxMnB4IDAiPicrSS5jYXIrJyDor6XotKblj7fmnKrnu5HlrprovabovoY8L2Rpdj4nKSsKICAgICc8ZGl2IGNsYXNzPSJoYy1ib3R0b20iPjxkaXYgY2xhc3M9ImhjLXRhc2tzIj4nK3RvZGF5VGFza3NIdG1sKGEpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXNjb3JlIj48c3Bhbj7mgLvnp6/liIYgPGIgY2xhc3M9Im51bSI+JytOdW1iZXIoYS5zY29yZXx8MCkudG9Mb2NhbGVTdHJpbmcoKSsnPC9iPjwvc3Bhbj48c3BhbiBjbGFzcz0icGx1cyBudW0iPuS7iisnK051bWJlcihhLnRvZGF5U2NvcmV8fDApKyc8L3NwYW4+PHNwYW4gY2xhc3M9InN0cmVhayBudW0iPui/nuetvicrTnVtYmVyKGEuY29udGludWVEYXlzfHwwKSsn5aSpPC9zcGFuPjwvZGl2PjwvZGl2PicrCiAgICB2ZWhTdysnPC9kaXY+JzsKfQpmdW5jdGlvbiB0b2RheVRhc2tzSHRtbChhKXsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IHBvc3Q9ZmFsc2UsbGlrZT1mYWxzZSxzaGFyZT1mYWxzZTsKICB0cnl7CiAgICBjb25zdCBsb2c9KGdldExvZ3MoKXx8W10pLmZpbmQobD0+bCYmbC5kYXRlPT09dFN0ciYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcoYS51c2VySWR8fCIiKSYmbC5zdWNjZXNzJiZBcnJheS5pc0FycmF5KGwuc3RlcHMpKTsKICAgIGlmKGxvZyl7Y29uc3Qgc3Q9bG9nLnN0ZXBzLmpvaW4oInwiKTtwb3N0PS/lj5HluJbmiJDlip8vLnRlc3Qoc3QpO2xpa2U9L+eCuei1nuaIkOWKny8udGVzdChzdCk7c2hhcmU9L+WIhuS6q+aIkOWKny8udGVzdChzdCl9CiAgfWNhdGNoKGUpe30KICBjb25zdCB0PShvbix0eHQsY2xzKT0+JzxzcGFuIGNsYXNzPSJodC10ICcrKG9uPyJvbiAiK2Nsczoib2ZmIikrJyI+Jysob24/IuKckyAiOiLCtyAiKSt0eHQrJzwvc3Bhbj4nOwogIHJldHVybiB0KGEuc2lnbmVkVG9kYXksIuW3suetvuWIsCIsImciKSt0KHBvc3QsIuWPkeW4gyIsImciKSt0KHNoYXJlLCLliIbkuqsiLCJnIikrdChsaWtlLCLlt7LotZ4iLCJyIik7Cn0KZnVuY3Rpb24gZm10TWluKG1pbil7bWluPU51bWJlcihtaW4pfHwwO2lmKG1pbjw9MClyZXR1cm4iIjtjb25zdCBoPU1hdGguZmxvb3IobWluLzYwKSxtPU1hdGgucm91bmQobWluJTYwKTtyZXR1cm4gaD4wP2grImgiKyhtP20rIm1pbiI6IiIpOm0rIm1pbiJ9CgovKiA9PT09PT09PT09PT0g5aSa6L2m5YiH5o2iID09PT09PT09PT09PSAqLwpmdW5jdGlvbiByZW5kZXJWZWhpY2xlU3dpdGNoKHYsaWR4KXsKICBpZighdi52ZWhpY2xlc3x8di52ZWhpY2xlcy5sZW5ndGg8MilyZXR1cm4gIiI7CiAgY29uc3QgY3VyPXYuY3VycmVudFZpbnx8IiI7CiAgY29uc3QgaXRlbXM9di52ZWhpY2xlcy5tYXAoeD0+JzxidXR0b24gY2xhc3M9InZlaC1jaGlwJysoeC52aW5Obz09PWN1cj8iIG9uIjoiIikrJyIgb25jbGljaz0ic3dpdGNoVmVoaWNsZSgnK2lkeCsnLFwnJytlc2MoeC52aW5ObykrJ1wnKSI+Jytlc2MoeC5uYW1lKSsnPC9idXR0b24+Jykuam9pbigiIik7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJ2ZWgtc3dpdGNoIj48c3BhbiBjbGFzcz0idmVoLXN3LWxhYmVsIj7ovabovoY8L3NwYW4+JytpdGVtcysnPC9kaXY+JzsKfQphc3luYyBmdW5jdGlvbiBzd2l0Y2hWZWhpY2xlKGlkeCx2aW4pewogIGNvbnN0IHNyYz1TVEFURS5kYXRhW2lkeF07aWYoIXNyY3x8IXZpbilyZXR1cm47CiAgdHJ5ewogICAgbGV0IGQ7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3Qgcj1hd2FpdCBwcm94eUZldGNoKCIvYXBpL3ZlaGljbGU/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHNyYy51c2VySWR8fCIiKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pKTsKICAgICAgZD0ociYmci5vayk/ci5yZXN1bHQ6bnVsbDsKICAgIH1lbHNlewogICAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjPWdldEFjY291bnRzKClbaWR4XTsKICAgICAgaWYoIWFjYylyZXR1cm47CiAgICAgIGQ9YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbik7CiAgICB9CiAgICBpZihkJiZkLnZlaGljbGUmJmQudmVoaWNsZS5oYXNWZWhpY2xlKXsKICAgICAgU1RBVEUuZGF0YVtpZHhdPU9iamVjdC5hc3NpZ24oe30sU1RBVEUuZGF0YVtpZHhdLGQpOwogICAgICByZW5kZXJIb21lKCk7CiAgICB9CiAgfWNhdGNoKGUpe30KfQoKLyogPT09PT09PT09PT09IOS4u+mimO+8iHYyLjE0LjE0IOi1t+S7heS/neeVmea3seiJsuWNleS4u+mimO+8iSA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlUaGVtZSgpewogIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoImRhdGEtdGhlbWUiLCJkYXJrIik7Cn0KCi8qID09PT09PT09PT09PT09PT09IOeri+WNs+etvuWIsOaCrOa1ruaMiemSriA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBtb3VudFNpZ25pbkZhYigpewogIGlmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKSlyZXR1cm47CiAgY29uc3QgYj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJidXR0b24iKTsKICBiLmlkPSJzaWduaW5GYWIiO2IuY2xhc3NOYW1lPSJzaWduaW4tZmFiIjtiLmlubmVySFRNTD0oSS5jaGVja3x8IiIpKyI8c3Bhbj7nq4vljbPnrb7liLA8L3NwYW4+IjsKICBiLm9uY2xpY2s9cnVuU2lnbmluTm93OwogIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYik7Cn0KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluTm93KCl7CiAgaWYobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MCl7dG9hc3QoIua8lOekuuaooeW8j++8muS7hemihOiniOeVjOmdoiIsImluZm8iKTtyZXR1cm59CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTsKICBpZighYnRufHxidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCJidXN5IikpcmV0dXJuOwogIGJ0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLnF1ZXJ5U2VsZWN0b3IoInNwYW4iKS50ZXh0Q29udGVudD0i562+5Yiw5Lit4oCmIjsKICB0b2FzdCgi5q2j5Zyo5Li65YWo6YOo6LSm5Y+35omn6KGM562+5Yiw4oCmIiwiaW5mbyIpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5ydW5TaWduaW4obnVsbCx0cnVlKTsKICBidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCI7CiAgaWYoZCYmZC5vayYmZC5yZXN1bHRzKXsKICAgIGNvbnN0IG9rTj1kLnJlc3VsdHMuZmlsdGVyKHI9PnIuc3VjY2VzcykubGVuZ3RoOwogICAgdG9hc3QoIuetvuWIsOWujOaIkO+8miIrb2tOKyIvIitkLnJlc3VsdHMubGVuZ3RoKyIg5oiQ5YqfIixva049PT1kLnJlc3VsdHMubGVuZ3RoPyJvayI6ImVyciIpOwogICAgb3BlblNoZWV0KCLnrb7liLDnu5PmnpwiLEkuY2hlY2ssZC5yZXN1bHRzLm1hcChyPT4nPGRpdiBjbGFzcz0ic2lnLWNhcmQgJysoci5zdWNjZXNzPyJvayI6ImZhaWwiKSsnIj48ZGl2IGNsYXNzPSJoIj48c3Bhbj4nK2VzYyhyLnVzZXJOYW1lfHwi5pyq55+lIikrJzwvc3Bhbj48c3BhbiBjbGFzcz0iciI+Jysoci5zdWNjZXNzPygiKyIrKHIudG90YWxHYWlufHwwKSsiIOWIhiIpOiLlpLHotKUiKSsnPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9InN0ZXBzIj4nKyhyLnN0ZXBzfHxbXSkubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSsoci5lcnJvcj8nPGRpdiBjbGFzcz0iZXJyIj4nK2VzYyhyLmVycm9yKSsnPC9kaXY+JzoiIikrJzwvZGl2PjwvZGl2PicpLmpvaW4oIiIpKTsKICAgIHJlZnJlc2hBbGwodHJ1ZSk7CiAgfWVsc2V7CiAgICB0b2FzdCgoZCYmZC5lcnJvcil8fCLnrb7liLDmiafooYzlpLHotKUiLCJlcnIiKTsKICB9Cn0KCgoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G6K+m5oOFICYg5Zyw5Zu+ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG9wZW5NYXAoaWR4KXtjb25zdCB2PVNUQVRFLmRhdGFbaWR4XSYmU1RBVEUuZGF0YVtpZHhdLnZlaGljbGU7aWYoIXYpcmV0dXJuO2lmKCFoYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpKXt0b2FzdCgi5pqC5peg5pyJ5pWIIEdQUyDlnZDmoIciLCJlcnIiKTtyZXR1cm59Y29uc3QgdXJsPSJodHRwczovL21hcHMuYXBwbGUuY29tLz9xPSIrTnVtYmVyKHYubGF0aXR1ZGUpKyIsIitOdW1iZXIodi5sb25naXR1ZGUpKyImej0xNyI7d2luZG93Lm9wZW4odXJsLCJfYmxhbmsiKX0KZnVuY3Rpb24gc2hvd1ZlaGljbGVEZXRhaWwoaWR4KXsKICBjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IHB3PXBvd2VyVGV4dCh2LnBvd2VyU3RhdHVzLHYubG9ja1N0YXRlKTsKICBjb25zdCByb3dzPVtdOwogIGlmKHYudmluTm8pcm93cy5wdXNoKFsn6L2m5p625Y+3JywnPHNwYW4gY2xhc3M9InYgbW9ubyIgaWQ9InZpbkR0bCI+Jytlc2MobWFza1Zpbih2LnZpbk5vKSkrJzwvc3Bhbj4gPGJ1dHRvbiBjbGFzcz0idmluLXNob3ciIG9uY2xpY2s9InRvZ2dsZUR0bFZpbigpIj7mmL7npLo8L2J1dHRvbj4nXSk7CiAgcm93cy5wdXNoKFsn5YWF55S154q25oCBJyxlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpXSk7CiAgcm93cy5wdXNoKFsn55S15rqQ54q25oCBJywnPHNwYW4gc3R5bGU9ImNvbG9yOicrKHB3LmNscz09PSJvbiI/InZhcigtLW9rKSI6InZhcigtLXR4dDIpIikrJyI+Jytwdy50ZXh0Kyc8L3NwYW4+J10pOwogIGlmKHYucmlkZVN0YXRlfHx2Lm9ubGluZSlyb3dzLnB1c2goWyfovabovobnirbmgIEnLGVzYyh2LnJpZGVTdGF0ZXx8di5vbmxpbmUpXSk7CiAgcm93cy5wdXNoKFsn55S16YePIFNPQycsJzxiIHN0eWxlPSJjb2xvcjonKyh2LmJhdHRlcnlQZXJjZW50PD0yMD8idmFyKC0tZXJyKSI6di5iYXR0ZXJ5UGVyY2VudDw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tYnJhbmQpIikrJyI+Jysodi5iYXR0ZXJ5UGVyY2VudHx8MCkrJyU8L2I+J10pOwogIGlmKHYudm9sdGFnZSlyb3dzLnB1c2goWyfnlLXljosnLHYudm9sdGFnZS50b0ZpeGVkKDEpKyJWIl0pOwogIGlmKHYuY3VycmVudClyb3dzLnB1c2goWyfnlLXmtYEnLHYuY3VycmVudC50b0ZpeGVkKDEpKyJBIl0pOwogIGlmKHYuYmF0dGVyeVRlbXApcm93cy5wdXNoKFsn55S15rGg5rip5bqmJyx2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrIsKwQyJdKTsKICByb3dzLnB1c2goWyfliankvZnnu63oiKonLCh2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrIiBrbSIrKHYucmFuZ2VFc3RpbWF0ZWQ/Iu+8iOS8sOeul++8iSI6IiIpXSk7CiAgcm93cy5wdXNoKFsn5LuK5pel6aqR6KGMJywodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOjApKyIga20gLyAiKyh2LnRvZGF5RHVyYXRpb258fDApKyIgbWluIl0pOwogIGlmKCh2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKXx8KHYucmVhclByZXNzdXJlJiZ2LnJlYXJQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKSlyb3dzLnB1c2goWyfog47ljosnLCfliY0gJytlc2Modi5mcm9udFByZXNzdXJlfHwiLSIpKycgLyDlkI4gJytlc2Modi5yZWFyUHJlc3N1cmV8fCItIildKTsKICBpZih2LmFkZHJlc3Mpcm93cy5wdXNoKFsn6L2m6L6G5L2N572uJywnPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5hZGRyZXNzKSsnPC9zcGFuPiddKTsKICBjb25zdCBkT2s9aGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKTsKICBpZihkT2spcm93cy5wdXNoKFsnR1BTIOWdkOaghycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iPicrTnVtYmVyKHYubGF0aXR1ZGUpLnRvRml4ZWQoNikrIiwgIitOdW1iZXIodi5sb25naXR1ZGUpLnRvRml4ZWQoNikrJzwvc3Bhbj4nXSk7CiAgaWYodi5sb2NhdGlvblRpbWUpcm93cy5wdXNoKFsn5pyA5ZCO5a6a5L2NJywnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5sb2NhdGlvblRpbWUpKyc8L3NwYW4+J10pOwogIGlmKHYuc2VydmljZUVuZERhdGUpcm93cy5wdXNoKFsn5pyN5Yqh5Yiw5pyfJyxlc2Modi5zZXJ2aWNlRW5kRGF0ZSldKTsKICBTVEFURS52aW5EdGxSYXc9di52aW5Ob3x8IiI7CiAgY29uc3QgaHRtbD1yb3dzLm1hcChyPT4nPGRpdiBjbGFzcz0ic3ItaXRlbSI+PHNwYW4gY2xhc3M9ImsiPicrclswXSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nK3JbMV0rJzwvc3Bhbj48L2Rpdj4nKS5qb2luKCIiKSsKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuICcrKGRPaz8icHJpbWFyeSI6IiIpKyciICcrKGRPaz8nb25jbGljaz0iY2xvc2VTaGVldCgpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJyDlnLDlm77mn6XnnIs8L2J1dHRvbj48L2Rpdj4nOwogIG9wZW5TaGVldCgi6L2m6L6G6K+m5oOFIMK3ICIrZXNjKHYudmVoaWNsZU5hbWV8fCLmnoHmoLjovabovoYiKSxJLmNhcixodG1sKTsKfQpmdW5jdGlvbiB0b2dnbGVEdGxWaW4oKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluRHRsIik7aWYoIWVsKXJldHVybjtpZihlbC50ZXh0Q29udGVudC5pbmRleE9mKCIqIik+PTApe2VsLnRleHRDb250ZW50PVNUQVRFLnZpbkR0bFJhdztkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLpmpDol48ifWVsc2V7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i5pi+56S6IjtlbC50ZXh0Q29udGVudD1tYXNrVmluKGVsLnRleHRDb250ZW50KX19Ci8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjO+8iOmdouadv+W3suenu+mZpOaJi+WKqOetvuWIsOWFpeWPo++8jOWumuaXtuetvuWIsOeUseiEmuacrCBjcm9uIOi0n+i0o++8iSA9PT09PT09PT09PT09PT09PSAqLwoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGN0cmxBY3QoaWR4LGFjdGlvbixidG4pe2lmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApe3RvYXN0KCLmvJTnpLrmqKHlvI/vvJrku4XpooTop4jnlYzpnaIiLCJpbmZvIik7cmV0dXJufWNvbnN0IGE9cHRBY2NvdW50cygpW2lkeF07aWYoIWF8fCFhLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufWNvbnN0IG5hbWVzPXtmaW5kOiLnn63mjInlr7vovabvvIjovabovobpl6rnga/vvIkiLGxvdWRGaW5kOiLpuKPnrJvpl6rnga/vvIjpq5jlo7Dlr7vovabvvIkiLGN1c2hpb246IuaJk+W8gOWdkOWeq++8iOWdkOWeq+S8muW8uei1t++8iSIsdW5sb2NrOiLkupHnq6/lvIDplIEiLGxvY2s6IuS6keerr+WFs+mUgSJ9O2NvbnN0IG5hbWU9bmFtZXNbYWN0aW9uXXx8YWN0aW9uO2NvbmZpcm1EaWFsb2coIuehruiupOaJp+ihjCAiK25hbWUsIuivpeaMh+S7pOS8mumAmui/hyA0RyDnvZHnu5znnJ/lrp7mjqfliLbkvaDnmoTovabovobvvJoiK2VzYyhhLnVzZXJOYW1lKSsi44CCIiwnZG9DdHJsKCcraWR4KyIsJyIrYWN0aW9uKyInKSIpfQphc3luYyBmdW5jdGlvbiBkb0N0cmwoaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgYnRuPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jdHJsLWJ0bltkYXRhLWFjdD0iJythY3Rpb24rJyJdJyk7Y29uc3Qgb2xkPWJ0bj9idG4uaW5uZXJIVE1MOiIiO2lmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4uaW5uZXJIVE1MPUkuY2xvY2t9dG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTtjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUN0cmwoYS51c2VySWQsYWN0aW9uKTtpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5pbm5lckhUTUw9b2xkfWlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IuaMh+S7pOW3suS4i+WPkSIsIm9rIil9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuaMh+S7pOWksei0pSIsImVyciIpfX0KCi8qID09PT09PT09PT09PT09PT09IOaXpeW/l+mhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9nRmlsdGVyPSJhbGwiOwphc3luYyBmdW5jdGlvbiByZW5kZXJMb2dzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VMb2dzIik7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua3YrJ+i/kOihjOaXpeW/lzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImxvZy1wYW5lbCI+PGRpdiBjbGFzcz0ibG9nLWhlYWQiPjxoMz4nK0kua3YrJzxzcGFuPuacgOi/kSA1MCDmnaE8L3NwYW4+PC9oMz48ZGl2IGNsYXNzPSJsb2ctZmlsdGVycyI+JysKICBbJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09ImFsbCI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnYWxsXCcpIj7lhajpg6g8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJzaWduaW4iPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3NpZ25pblwnKSI+562+5YiwPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0idmVoaWNsZSI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwndmVoaWNsZVwnKSI+5o6n6L2mPC9idXR0b24+J10uam9pbigiIikrCiAgJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImxvZy1saXN0IiBpZD0ibG9nTGlzdCI+PGRpdiBzdHlsZT0icGFkZGluZzo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpIj7liqDovb3kuK3igKY8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBzdHlsZT0iZmxleDoxIiBvbmNsaWNrPSJjbGVhckxvZ3NVSSgpIj7muIXnqbrml6Xlv5c8L2J1dHRvbj48L2Rpdj4nOwogIGNvbnN0IGxvZ3M9bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MD9ERU1PX0xPR1M6YXdhaXQgQmFja2VuZC5nZXRMb2dzKCk7cmVuZGVyTG9nTGlzdChsb2dzKTsKfQpmdW5jdGlvbiBzZXRMb2dGaWx0ZXIoZil7bG9nRmlsdGVyPWY7cmVuZGVyTG9ncygpfQpmdW5jdGlvbiByZW5kZXJMb2dMaXN0KGxvZ3Mpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJsb2dMaXN0Iik7aWYoIWVsKXJldHVybjtjb25zdCBsaXN0PShsb2dzfHxbXSkuZmlsdGVyKGw9Pntjb25zdCB0PWwudHlwZXx8InNpZ25pbiI7aWYobG9nRmlsdGVyPT09ImFsbCIpcmV0dXJuIHRydWU7cmV0dXJuIHQ9PT1sb2dGaWx0ZXJ9KTtpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ibG9nLWVtcHR5Ij4nK0kud2FybisnPGJyPuivpeWIhuexu+S4i+aaguaXoOaXpeW/lzwvZGl2Pic7cmV0dXJufWVsLmlubmVySFRNTD1saXN0Lm1hcCgobG9nLGkpPT57Y29uc3QgdD1sb2cudHlwZXx8InNpZ25pbiI7Y29uc3QgdGFnPXQ9PT0idmVoaWNsZSI/JzxzcGFuIGNsYXNzPSJwaWxsIGFtYmVyIj7mjqfovaY8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgY3lhbiI+562+5YiwPC9zcGFuPic7bGV0IHJlcztpZih0PT09InZlaGljbGUiKXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuYWN0aW9uVGV4dHx8Iui9pui+huaOp+WItiIpKycgJysobG9nLnN1Y2Nlc3M/IuaIkOWKnyI6IuWksei0pe+8miIrZXNjKGxvZy5tZXNzYWdlfHxsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWVsc2V7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLnN1Y2Nlc3M/IuaIkOWKnyArIitsb2cudG90YWxHYWluOiLlpLHotKU6ICIrKGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9Y29uc3Qgc3RlcHM9bG9nLnN0ZXBzPyhsb2cuc3RlcHMubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSk6IiI7cmV0dXJuICc8ZGl2IGNsYXNzPSJsb2ctaXRlbSIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpKjI1KSsnbXMiPjxkaXYgY2xhc3M9ImxvZy10aW1lIj4nK2VzYyhsb2cudGltZXx8IiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbWFpbiI+Jyt0YWcrJzxzcGFuIGNsYXNzPSJsb2ctdXNlciI+Jytlc2MobG9nLnVzZXJOYW1lfHwiIikrJzwvc3Bhbj4nK3JlcysnPC9kaXY+Jysoc3RlcHM/JzxkaXYgY2xhc3M9ImxvZy1zdGVwcyI+JytzdGVwcysnPC9kaXY+JzoiIikrJzwvZGl2Pid9KS5qb2luKCIiKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzVUkoKXtjb25maXJtRGlhbG9nKCLmuIXnqbrml6Xlv5ciLCLlsIbliKDpmaTlhajpg6jov5DooYzml6Xlv5fvvIzmraTmk43kvZzkuI3lj6/mgaLlpI3jgIIiLCJjbGVhckxvZ3NOb3ciKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzTm93KCl7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5jbGVhckxvZ3MoKTtpZihvayl7dG9hc3QoIuaXpeW/l+W3sua4heepuiIsIm9rIik7cmVuZGVyTG9ncygpfWVsc2UgdG9hc3QoIua4heepuuWksei0pSIsImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g6K6+572u6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBjZmdBY2NvdW50cz1bXTsKZnVuY3Rpb24gcmVuZGVyQ2ZnKCl7CiAgaWYoaXNQcm94eU1vZGUoKSYmbG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKTwwJiYhU1RBVEUucGFuZWxMb2FkZWQpewogICAgY29uc3QgZWwwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlQ2ZnIik7CiAgICBpZihlbDApZWwwLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyNnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mraPlnKjku47ohJrmnKzlkI7nq6/lkIzmraXotKblj7fkuI7phY3nva7igKY8L2Rpdj48L2Rpdj4nOwogICAgZW5zdXJlUGFuZWxEYXRhKCkudGhlbigoKT0+cmVuZGVyQ2ZnKCkpOwogICAgcmV0dXJuOwogIH0KICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y2ZnQWNjb3VudHM9KGlzUHJveHlNb2RlKCkmJlNUQVRFLnBhbmVsQWNjb3VudHM/U1RBVEUucGFuZWxBY2NvdW50czpnZXRBY2NvdW50cygpKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwiIix1c2VySWQ6YS51c2VySWR8fCIiLHRva2VuOmEudG9rZW58fCIiLGJhcmtLZXk6YS5iYXJrS2V5fHwiIn0pKTsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogIGNvbnN0IGFjY1Jvd3M9Y2ZnQWNjb3VudHMubWFwKChhLGlkeCk9Pic8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJOYW1lKSsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHZhbHVlPSInK2VzYyhhLnVzZXJJZCkrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbu+8iOeymOi0tOWNs+WPr++8jOiHquWKqOWOu+aOiSBCZWFyZXIg5YmN57yA77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS50b2tlbikrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8jOetvuWIsOaIkOWKn+aOqOmAge+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS5iYXJrS2V5KSsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgY29uc3QgY29tbT1jZmcuY29tbXVuaXR5OwogIGNvbnN0IHN3PShpZCxsYWJlbCxzdWIsY2hlY2tlZCk9Pic8bGFiZWwgY2xhc3M9InN3aXRjaCI+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0iJytpZCsnIiAnKyhjaGVja2VkPyJjaGVja2VkIjoiIikrJz48c3BhbiBjbGFzcz0ic3ciPjwvc3Bhbj48c3BhbiBjbGFzcz0ibGJsIj4nK2xhYmVsKyc8L3NwYW4+PHNwYW4gY2xhc3M9InNjIj4nK3N1YisnPC9zcGFuPjwvbGFiZWw+JzsKICBlbC5pbm5lckhUTUw9CiAgJzxkaXYgY2xhc3M9InNlY3Rpb24tdGl0bGUiPicrSS5rZXkrJ+iuvue9rjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIHZpbyI+PC9zcGFuPuaVsOaNruacjeWKoTwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPueci+adv+iHquWKqOWIt+aWsOmXtOmalO+8iOenku+8jDE1fjM2MDDvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJjZmdfcmVmcmVzaCIgbWluPSIxNSIgbWF4PSIzNjAwIiBzdGVwPSI1IiB2YWx1ZT0iJysoY2ZnLmF1dG9SZWZyZXNoU2VjfHw2MCkrJyI+PC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7lrprml7bnrb7liLA8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogIHN3KCJhdXRvX3NpZ25pbiIsIuWumuaXtuetvuWIsCIsIuWIsOeCueiHquWKqOS4uuWFqOmDqOi0puWPt+etvuWIsCIsY2ZnLmF1dG9TaWduaW49PT10cnVlKSsKICBzdygidmVoaWNsZV9tb25pdG9yIiwi6L2m6L6G54q25oCB55uR5o6nIiwi5YWF5ruhL+emu+e6v+aXtuacrOWcsOmAmuefpeaPkOmGku+8iOaJk+W8gOmdouadv+aXtuajgOafpe+8iSIsY2ZnLnZlaGljbGVNb25pdG9yPT09dHJ1ZSkrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPuetvuWIsOaXtumXtO+8iOavj+Wkqe+8jEhIOk1N77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGltZSIgaWQ9ImNmZ19zaWduaW5fdGltZSIgdmFsdWU9IicrZXNjKGNmZy5hdXRvU2lnbmluVGltZXx8IjA3OjAwIikrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuS7o+eQhuiEmuacrOaXoOW4uOmpu+WQjuWPsO+8jOmHh+eUqOOAjOaJk+W8gOihpeetvuOAjeacuuWItu+8muW8gOWQr+WQju+8jOavj+WkqemmluasoeaJk+W8gOmdouadv+S4lOW3sui/h+iuvuWumuaXtumXtOaXtu+8jOiHquWKqOS4uuWFqOmDqOi0puWPt+aJp+ihjOS4gOasoeetvuWIsO+8iOWGmeaXpeW/l+OAgeaOqCBCYXJr77yM5LiO5omL5Yqo562+5Yiw5LiA6Ie077yJ77yM5ZCM5LiA5aSp5Y+q5omn6KGM5LiA5qyh44CC6aaW6aG144CM56uL5Y2z562+5Yiw44CN5oKs5rWu5oyJ6ZKu5Y+v6ZqP5pe25omL5Yqo5omn6KGM44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7nrb7lkI3lr4bpkqXphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkFwcCDnq68gYXBwSWQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2FwcF9pZCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwSWQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD5BcHAg56uvIGFwcFNlY3JldDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjZmdfYXBwX3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwU2VjcmV0KSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+SDUg56uvIGFwcElkPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNmZ19oNV9pZCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBJZCkrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkg1IOerryBhcHBTZWNyZXQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2g1X3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBTZWNyZXQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48L2Rpdj4nKwogICc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7kupHnq6/mjqfovaYgQUVTIOWvhumSpe+8iDMyIOS9jeWNgeWFrei/m+WItu+8jOW8gC/lhbPplIHlv4XloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJwYXNzd29yZCIgaWQ9ImNmZ192ZWhpY2xlX2tleSIgdmFsdWU9IicrZXNjKGNmZy52ZWhpY2xlQWVzS2V5KSsnIiBwbGFjZWhvbGRlcj0i5aGr5YaZ5bm25L+d5a2Y5ZCO5omN6IO95L2/55So5LqR56uv5byA6ZSBL+WFs+mUgSIgYXV0b2NvbXBsZXRlPSJvZmYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48ZGl2IGNsYXNzPSJoaW50Ij7nlKjkuo7lvIAv5YWz6ZSB5oql5paHIEFFUy0yNTYtRUNCIOWKoOWvhu+8jOWHuuS6juWuieWFqOm7mOiupOS4jeWGhee9ruOAgjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlQ2ZnVUkoKSI+5L+d5a2Y6YWN572uPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJyZXNldENmZ1VJKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+56S+5Yy65Lu75Yqh5byA5YWzPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIiBzdHlsZT0iZ2FwOjhweCI+JysKICBzdygiY29tbV9wb3N0Iiwi5Y+R5biD5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSkrc3coImNvbW1fbGlrZSIsIueCuei1nuWKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVMaWtlIT09ZmFsc2UpK3N3KCJjb21tX2NvbW1lbnQiLCLor4TorrrliqjmgIEiLCLkuI3liqDliIYiLGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKStzdygiY29tbV9zaGFyZSIsIuWIhuS6q+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKStzdygiY29tbV9kZWxldGUiLCLmiafooYzlkI7liKDpmaTliqjmgIEiLCLmuIXnkIbnl5Xov7kiLGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UpKwogICc8L2Rpdj48ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lhbPpl63lr7nlupTlvIDlhbPlkI7vvIznrb7liLDohJrmnKzlsIbot7Pov4for6Xku7vliqHjgILkv67mlLnlkI7ngrnlh7vkuIrmlrnjgIzkv53lrZjphY3nva7jgI3nlJ/mlYjjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7miYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIk8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwonPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5omL5py65Y+377yI5p6B5qC4IEFwcCDnu5Hlrprlj7fnoIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZWwiIGlkPSJwbF9waG9uZSIgcGxhY2Vob2xkZXI9IjExIOS9jeaJi+acuuWPtyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGxfY29kZSIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjhweCI+PGxhYmVsPueZu+W9lSBCYXNpYyBBdXRo77yI5Y+v6YCJ77yM5bey5YaF572u5p6B5qC4QXBw55qEY2xpZW505Yet5o2u77yM5LiA6Iis5peg6ZyA5aGr5YaZ77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBsX2Jhc2ljIiBwbGFjZWhvbGRlcj0i6buY6K6k5bey5YaF572u77yM55WZ56m65Y2z5Y+vIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCIgYXV0b2NvbXBsZXRlPSJvZmYiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNlbmRTbXNDb2RlKCkiIGlkPSJwbF9zZW5kX2J0biI+6I635Y+W6aqM6K+B56CBPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InBob25lTG9naW5VSSgpIiBpZD0icGxfbG9naW5fYnRuIj7nmbvlvZXlubbmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+55So5omL5py65Y+3ICsg55+t5L+h6aqM6K+B56CB55m75b2V77yM6Ieq5Yqo6I635Y+WIFRva2VuIOS4jueUqOaIt0lE5bm25Yqg5YWl6LSm5Y+35YiX6KGo77yM5YWo56iL5peg6ZyA5oqT5YyF44CC55m75b2V5oiQ5Yqf5ZCO6Ieq5Yqo5L+d5a2Y5bm25Yi35paw6aG16Z2i44CCPC9kaXY+JysKJzwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBncmVlbiI+PC9zcGFuPui0puWPt+euoeeQhu+8iCcrY2ZnQWNjb3VudHMubGVuZ3RoKycg5Liq77yJPC9oMz48YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iYWRkQWNjb3VudFVJKCkiPisg5re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiIGlkPSJhY2NMaXN0Ij4nKyhhY2NSb3dzfHwnPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mmoLml6DotKblj7fvvIzngrnlh7vjgIzmt7vliqDotKblj7fjgI08L2Rpdj4nKSsnPC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLWJvZHkiIHN0eWxlPSJwYWRkaW5nLXRvcDowIj48ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic2F2ZUFjY291bnRzVUkoKSI+5L+d5a2Y5p6B5qC46LSm5Y+3PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLW5vdGUiPjxiPuS9v+eUqOivtOaYjjwvYj48YnI+wrcgVG9rZW7vvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiDlgLzljbPlj6/vvIzoh6rliqjljrvmjokgPGNvZGU+QmVhcmVyIDwvY29kZT4g5YmN57yA44CCPGJyPsK3IOiOt+WPlklE77ya5aGr5YWlIFRva2VuIOWQjueCueOAjOiOt+WPlklE44CN77yM6Ieq5Yqo5LuOIEg1IGJhc2VJbmZvIC8gQXBwIHNldHRpbmcgLyDovabovobliJfooajmjqXlj6Pop6PmnpDnlKjmiLdJROS4juaYteensOOAgjxicj7CtyBCYXJrIEtlee+8muivpei0puWPt+etvuWIsOaIkOWKn+WQjuaOqOmAgemAmuefpe+8jOeVmeepuuS4jeaOqOOAgjxicj7CtyDmjqfovabmjIfku6TvvIjlr7vovaYv6bij56ybL+WdkOWeqy/lvIDlhbPplIHvvInkvJrnnJ/lrp7mk43kvZzovabovobvvIzpnIDkuozmrKHnoa7orqTjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciBhbWJlciI+PC9zcGFuPuWkh+S7vei0puWPt+mFjee9rjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiPicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJleHBvcnRCYWNrdXBVSSgpIj7kuIDplK7lr7zlh7rlpIfku708L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9ImNvcHlCYWNrdXBVSSgpIj7lpI3liLblpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7lpIfku73lhoXlrrnvvIjljIXlkKvlhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzlj6/lpI3liLbkv53lrZjvvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iYmFja3VwQXJlYSIgcm93cz0iNCIgcmVhZG9ubHkgcGxhY2Vob2xkZXI9IueCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjeeUn+aIkOKApiIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48L3RleHRhcmVhPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPuaBouWkjeWkh+S7ve+8iOeymOi0tOWkh+S7vSBKU09OIOWQjueCueaBouWkje+8jOWwhuimhueblueOsOaciei0puWPt+S4jumFjee9ru+8iTwvbGFiZWw+PHRleHRhcmVhIGlkPSJpbXBvcnRBcmVhIiByb3dzPSI0IiBwbGFjZWhvbGRlcj0i57KY6LS05aSH5Lu9IEpTT07igKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBvbmNsaWNrPSJpbXBvcnRCYWNrdXBVSSgpIj7mgaLlpI3lpIfku708L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lpIfku73ljIXlkKvlhajpg6jotKblj7fvvIjmmLXnp7Av55So5oi3SUQvVG9rZW4vQmFya0tlee+8ieS4jumdouadv+mFjee9ru+8iOetvuWQjeWvhumSpS/npL7ljLrku7vliqHlvIDlhbMv6Ieq5Yqo5Yi35paw562J77yJ44CC5o2i5py65oiW6YeN6KOF5ZCO57KY6LS05Y2z5Y+v5LiA6ZSu6L+Y5Y6f77yM5peg6ZyA6YeN5paw5oqT5YyF5aGr5YaZ44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcgJysoaXNQcm94eU1vZGUoKT8n6LSm5Y+35LiO5a+G6ZKl5a2Y5YKo5LqO6ISa5pys5ZCO56uv77yI5pys5py65oyB5LmF5YyW77yJJzon5pWw5o2u5a2Y5YKo5LqO5pys5py65rWP6KeI5ZmoIGxvY2FsU3RvcmFnZScpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4IiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciI+54ix5Y+R55S1IMK3IGFmZGlhbi5jb20vYS9sdWNreTc5ODwvYT48L2Rpdj4nOwp9Ci8qID09PT09PT09PT09PT09PT09IOaJi+acuuWPt+eZu+W9le+8iOWFjeaKk+WMhe+8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBzZW5kU21zQ29kZSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfc2VuZF9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuWPkemAgeS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnNlbmRDb2RlKHBob25lKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLpqozor4HnoIHlt7Llj5HpgIEiLCJvayIpO2xldCB0PTYwO2J0bi50ZXh0Q29udGVudD0i6YeN5paw6I635Y+WKCIrdCsicykiOwogICAgY29uc3QgaXY9c2V0SW50ZXJ2YWwoKCk9Pnt0LS07aWYodDw9MCl7Y2xlYXJJbnRlcnZhbChpdik7YnRuLnRleHRDb250ZW50PSLojrflj5bpqozor4HnoIEiO2J0bi5kaXNhYmxlZD1mYWxzZTt9ZWxzZSBidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjt9LDEwMDApOwogIH1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5Y+R6YCB5aSx6LSl77yM6K+35qOA5p+l572R57ucIiwiZXJyIik7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjt9Cn0KYXN5bmMgZnVuY3Rpb24gcGhvbmVMb2dpblVJKCl7CiAgY29uc3QgcGhvbmU9KGVsKCJwbF9waG9uZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBjb2RlPShlbCgicGxfY29kZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBiYXNpYz0oZWwoInBsX2Jhc2ljIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBpZighY29kZSl7dG9hc3QoIuivt+i+k+WFpeefreS/oemqjOivgeeggSIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYnRuPWVsKCJwbF9sb2dpbl9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnBob25lTG9naW4ocGhvbmUsY29kZSxiYXNpYyk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi55m75b2V5oiQ5YqfIiwib2siKTtzZXRUaW1lb3V0KCgpPT5sb2NhdGlvbi5yZWxvYWQoKSwxMjAwKTt9CiAgZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IueZu+W9leWksei0pSIsImVyciIpO30KICBidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLnRleHRDb250ZW50PSLnmbvlvZXlubbmt7vliqDotKblj7ciOwp9CmZ1bmN0aW9uIGNvbGxlY3RDZmdVSSgpe3JldHVybnthcHA6e2FwcElkOnZhbCgiY2ZnX2FwcF9pZCIpLGFwcFNlY3JldDp2YWwoImNmZ19hcHBfc2VjcmV0Iil9LGg1OnthcHBJZDp2YWwoImNmZ19oNV9pZCIpLGFwcFNlY3JldDp2YWwoImNmZ19oNV9zZWNyZXQiKX0sdmVoaWNsZUFlc0tleTp2YWwoImNmZ192ZWhpY2xlX2tleSIpLnRyaW0oKSxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKHZhbCgiY2ZnX3JlZnJlc2giKSksc2VydmVyQmFzZTpnZXRDZmcoKS5zZXJ2ZXJCYXNlfHwiIixhdXRvU2lnbmluOmVsKCJhdXRvX3NpZ25pbiIpP2VsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ6ZmFsc2UsYXV0b1NpZ25pblRpbWU6KHZhbCgiY2ZnX3NpZ25pbl90aW1lIil8fCIwNzowMCIpLHZlaGljbGVNb25pdG9yOmVsKCJ2ZWhpY2xlX21vbml0b3IiKT9lbCgidmVoaWNsZV9tb25pdG9yIikuY2hlY2tlZDpmYWxzZSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6ZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQsZW5hYmxlTGlrZTplbCgiY29tbV9saWtlIikuY2hlY2tlZCxlbmFibGVDb21tZW50OmVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkLGVuYWJsZVNoYXJlOmVsKCJjb21tX3NoYXJlIikuY2hlY2tlZCxlbmFibGVEZWxldGU6ZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZH19fQpmdW5jdGlvbiB2YWwoaWQpe2NvbnN0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO3JldHVybiBlP2UudmFsdWU6IiJ9CmZ1bmN0aW9uIGVsKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpfQphc3luYyBmdW5jdGlvbiBzYXZlQ2ZnVUkoKXtjb25zdCBjPWNvbGxlY3RDZmdVSSgpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUNvbmZpZyhjKTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSl7YXBwbHlSZW1vdGVDZmcoYyk7U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9dG9hc3QoIumFjee9ruW3suS/neWtmCIsIm9rIik7c3RhcnRBdXRvUmVmcmVzaChjLmF1dG9SZWZyZXNoU2VjKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQpmdW5jdGlvbiByZXNldENmZ1VJKCl7ZWwoImNmZ19hcHBfaWQiKS52YWx1ZT1ERUZBVUxUX0NGRy5hcHAuYXBwSWQ7ZWwoImNmZ19hcHBfc2VjcmV0IikudmFsdWU9REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldDtlbCgiY2ZnX2g1X2lkIikudmFsdWU9REVGQVVMVF9DRkcuaDUuYXBwSWQ7ZWwoImNmZ19oNV9zZWNyZXQiKS52YWx1ZT1ERUZBVUxUX0NGRy5oNS5hcHBTZWNyZXQ7ZWwoImNmZ192ZWhpY2xlX2tleSIpLnZhbHVlPSIiO2VsKCJjZmdfcmVmcmVzaCIpLnZhbHVlPTYwO2lmKGVsKCJhdXRvX3NpZ25pbiIpKWVsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ9ZmFsc2U7ZWwoImNmZ19zaWduaW5fdGltZSIpLnZhbHVlPSIwNzowMCI7ZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQ9dHJ1ZTtlbCgiY29tbV9saWtlIikuY2hlY2tlZD10cnVlO2VsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkPXRydWU7ZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkPXRydWU7ZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZD10cnVlO3RvYXN0KCLlt7LmgaLlpI3pu5jorqTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9CmZ1bmN0aW9uIGFkZEFjY291bnRVSSgpe2NmZ0FjY291bnRzLnB1c2goe3VzZXJOYW1lOiIiLHVzZXJJZDoiIix0b2tlbjoiIixiYXJrS2V5OiIifSk7Y29uc3QgbGlzdD1lbCgiYWNjTGlzdCIpO2NvbnN0IGlkeD1jZmdBY2NvdW50cy5sZW5ndGgtMTtjb25zdCBodG1sPSc8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyfvvIjmlrDvvIk8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHBsYWNlaG9sZGVyPSLlpoIgbHVja3k3OTgiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPueUqOaIt0lEPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY191aWRfJytpZHgrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5BdXRob3JpemF0aW9uIFRva2VuPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiBwbGFjZWhvbGRlcj0iYTc0Nzc5Yzct4oCmIj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2Pic7aWYobGlzdC5xdWVyeVNlbGVjdG9yKCIuYWNjLWVkaXQiKXx8bGlzdC5xdWVyeVNlbGVjdG9yKCJbc3R5bGUqPSd0ZXh0LWFsaWduJ10iKSl7bGlzdC5pbnNlcnRBZGphY2VudEhUTUwoImJlZm9yZWVuZCIsaHRtbCl9ZWxzZXtsaXN0LmlubmVySFRNTD1odG1sfX0KZnVuY3Rpb24gZGVsZXRlQWNjb3VudFVJKGlkeCl7Y29uc3Qgcm93PWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2MtZWRpdFtkYXRhLWk9IicraWR4KyciXScpO2lmKHJvdyl7cm93LnJlbW92ZSgpO2NmZ0FjY291bnRzLnNwbGljZShpZHgsMSk7dG9hc3QoIuW3suWIoOmZpO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX19CmZ1bmN0aW9uIGNvbGxlY3RBY2NvdW50c1VJKCl7Y29uc3Qgcm93cz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjYWNjTGlzdCAuYWNjLWVkaXQiKTtjb25zdCBsaXN0PVtdO3Jvd3MuZm9yRWFjaChyb3c9Pntjb25zdCBpPXJvdy5nZXRBdHRyaWJ1dGUoImRhdGEtaSIpO2NvbnN0IHRva2VuPWVsKCJhY2NfdG9rZW5fIitpKT8udmFsdWV8fCIiO2lmKHRva2VuLnRyaW0oKSl7bGlzdC5wdXNoKHt1c2VyTmFtZTplbCgiYWNjX25hbWVfIitpKT8udmFsdWV8fCIiLHVzZXJJZDplbCgiYWNjX3VpZF8iK2kpPy52YWx1ZXx8IiIsdG9rZW46Y2xlYW5Ub2tlbih0b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoZWwoImFjY19iYXJrXyIraSk/LnZhbHVlfHwiIil9KX19KTtyZXR1cm4gbGlzdH0KYXN5bmMgZnVuY3Rpb24gc2F2ZUFjY291bnRzVUkoKXtjb25zdCBsaXN0PWNvbGxlY3RBY2NvdW50c1VJKCkubWFwKGE9Pih7dXNlck5hbWU6KGEudXNlck5hbWV8fCIiKS50cmltKCksdXNlcklkOihhLnVzZXJJZHx8IiIpLnRyaW0oKSx0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleSl9KSk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQWNjb3VudHMobGlzdCk7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpU1RBVEUucGFuZWxBY2NvdW50cz1saXN0O3RvYXN0KCLmnoHmoLjotKblj7flt7Lkv53lrZgiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9CmFzeW5jIGZ1bmN0aW9uIGZldGNoVXNlcklkVUkoaWR4KXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGVsKCJhY2NfdG9rZW5fIitpZHgpPy52YWx1ZXx8IiIpO2NvbnN0IGJ0bj1lbCgidWlkQnRuXyIraWR4KTtpZighdG9rZW4pe3RvYXN0KCLor7flhYjloavlhpkgVG9rZW4iLCJlcnIiKTtyZXR1cm59YnRuLnRleHRDb250ZW50PSLojrflj5bkuK3igKYiO2J0bi5kaXNhYmxlZD10cnVlO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXRVc2VyaWQodG9rZW4pO2lmKGQmJmQub2smJmQudXNlcklkKXtpZihlbCgiYWNjX3VpZF8iK2lkeCkpZWwoImFjY191aWRfIitpZHgpLnZhbHVlPWQudXNlcklkO2lmKGQudXNlck5hbWUmJmVsKCJhY2NfbmFtZV8iK2lkeCkmJiFlbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlKWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWU9ZC51c2VyTmFtZTt0b2FzdCgi6I635Y+W5oiQ5Yqf77yaIisoZC51c2VyTmFtZXx8ZC51c2VySWQpLCJvayIpfWVsc2V7dG9hc3QoIuiOt+WPluWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuacquefpemUmeivryIpLCJlcnIiKX1idG4udGV4dENvbnRlbnQ9IuiOt+WPlklEIjtidG4uZGlzYWJsZWQ9ZmFsc2V9CgovKiA9PT09PT09PT09PT09PT09PSDlpIfku70gLyDmgaLlpI0gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZXhwb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbCl7dG9hc3QoIueVjOmdouacquWwsee7qiIsImVyciIpO3JldHVybn1lbC52YWx1ZT0i55Sf5oiQ5Lit4oCmIjtCYWNrZW5kLmJhY2t1cCgpLnRoZW4oZD0+e2lmKGQmJmQub2spe2VsLnZhbHVlPUpTT04uc3RyaW5naWZ5KGQsbnVsbCwyKTt0b2FzdCgi5aSH5Lu95bey55Sf5oiQ77yM5Y+v5aSN5Yi25L+d5a2YIiwib2siKX1lbHNle2VsLnZhbHVlPSIiO3RvYXN0KCLlr7zlh7rlpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLml6Dms5Xov57mjqXohJrmnKzlkI7nq68iKSwiZXJyIil9fSl9CmZ1bmN0aW9uIGNvcHlCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUpe3RvYXN0KCLor7flhYjngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI0iLCJlcnIiKTtyZXR1cm59aWYobmF2aWdhdG9yLmNsaXBib2FyZCYmbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpe25hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGVsLnZhbHVlKS50aGVuKCgpPT50b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKSwoKT0+e2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9KX1lbHNle2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9fQpmdW5jdGlvbiBpbXBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUudHJpbSgpKXt0b2FzdCgi6K+35YWI57KY6LS05aSH5Lu95YaF5a65IiwiZXJyIik7cmV0dXJufWNvbmZpcm1EaWFsb2coIuaBouWkjeWkh+S7vSIsIuWwhuimhuebluW9k+WJjeWFqOmDqOi0puWPt+S4jumdouadv+mFjee9ru+8jOatpOaTjeS9nOS4jeWPr+aSpOmUgOOAgiIsImltcG9ydEJhY2t1cE5vdyIpfQphc3luYyBmdW5jdGlvbiBpbXBvcnRCYWNrdXBOb3coKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2NvbnN0IHY9ZWw/ZWwudmFsdWUudHJpbSgpOiIiO2lmKCF2KXt0b2FzdCgi5aSH5Lu95YaF5a655Li656m6IiwiZXJyIik7cmV0dXJufWNvbnN0IGQ9YXdhaXQgQmFja2VuZC5yZXN0b3JlQmFja3VwKHYpO2lmKGQmJmQub2spe3RvYXN0KCLmgaLlpI3miJDlip/vvJoiKyhkLmNvdW50fHwwKSsiIOS4qui0puWPtyIsIm9rIik7aWYoaXNQcm94eU1vZGUoKSl7U1RBVEUucGFuZWxBY2NvdW50cz1bXTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX1TVEFURS5kYXRhPVtdO3JlbmRlckNmZygpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5oGi5aSN5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5aSH5Lu95YaF5a655qC85byP6ZSZ6K+vIiksImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g5ryU56S65pWw5o2u77yIP2RlbW8g6aKE6KeI55So77yM5LiN6IGU572R77yJID09PT09PT09PT09PT09PT09ICovCmNvbnN0IERFTU9fREFUQT1bCnt1c2VyTmFtZToi6Zi/5rO9Iix1c2VySWQ6IjIwMjUxMDA5MTIzNDU2NzgiLHNjb3JlOjEyODgwLHNpZ25lZFRvZGF5OnRydWUsY29udGludWVEYXlzOjQyLHRvZGF5U2NvcmU6MTIsc2lnbkNvdW50OjM2LHRva2VuVmFsaWQ6dHJ1ZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6dHJ1ZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIixiYXR0ZXJ5UGVyY2VudDo3NixyZXNpZHVhbFJhbmdlS206NjMscmFuZ2VFc3RpbWF0ZWQ6ZmFsc2UsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTo4NC41LGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDoyNixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixsYXN0UmlkZU1pbGVhZ2U6OC4yLG9ubGluZToiMSIscG93ZXJTdGF0dXM6IjAiLGxvY2tTdGF0ZToiMSIsY3VzaGlvblN0YXRlOiIwIixhZGRyZXNzOiLnpo/lu7rnnIHlroHlvrfluILolYnln47ljLrkuJzkvqjlvIDlj5HljLoiLGxvY2F0aW9uVGltZToiMDg6MTIiLGxvbmdpdHVkZToxMTkuNTUwOSxsYXRpdHVkZToyNi42NjU0LHNlcnZpY2VFbmREYXRlOiIyMDI3LTAzLTE4In19LAp7dXNlck5hbWU6IuWwj+a7oSIsdXNlcklkOiIyMDI2MDEwMTExMjIzMzQ0IixzY29yZTo1MjAsc2lnbmVkVG9kYXk6ZmFsc2UsY29udGludWVEYXlzOjMsdG9kYXlTY29yZTowLHNpZ25Db3VudDo5LHRva2VuVmFsaWQ6ZmFsc2UsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6ZmFsc2UsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6ZmFsc2UsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6ZmFsc2UsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTp0cnVlLHZlaGljbGVOYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIiLGJhdHRlcnlQZXJjZW50OjIzLHJlc2lkdWFsUmFuZ2VLbToyMCxyYW5nZUVzdGltYXRlZDp0cnVlLGNoYXJnZVN0YXRlOiLlhYXnlLXkuK0iLHZvbHRhZ2U6ODYuMixjdXJyZW50OjUuNCxiYXR0ZXJ5VGVtcDozMSxmcm9udFByZXNzdXJlOiIyLjEwYmFyIixyZWFyUHJlc3N1cmU6IiIsZnJvbnRUZW1wOiIiLHJlYXJUZW1wOiIiLHRvZGF5RGlzdGFuY2U6MCx0b2RheUR1cmF0aW9uOjAsdG9kYXlNYXhTcGVlZDowLGxhc3RSaWRlTWlsZWFnZTowLG9ubGluZToiMCIscG93ZXJTdGF0dXM6IjEiLGxvY2tTdGF0ZToiMCIsY3VzaGlvblN0YXRlOiIxIixhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiIsc2VydmljZUVuZERhdGU6IiJ9fQpdOwpjb25zdCBERU1PX0xPR1M9Wwp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxMiIsdHlwZToic2lnbmluIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjEyLHNpZ25pblNjb3JlOjYsYmxpbmRCb3hTY29yZTo2LGludGVyYWN0U2NvcmU6MCxjb250aW51ZURheXM6NDIsc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzYgKOenr+WIhikiLCLnm7Lnm5LmnKrop6PplIEoMzYvMzApIl19LAp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxNSIsdHlwZToic2lnbmluIix1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acnyIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfSwKe3RpbWU6IjIwMjYtMDktMDkgMjI6MzE6MDUiLHR5cGU6InZlaGljbGUiLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSxhY3Rpb25UZXh0OiLkupHnq6/lvIDplIEiLG1lc3NhZ2U6IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSIsc3RlcHM6W119Cl07CgovKiA9PT09PT09PT09PT09PT09PSDliLfmlrAgJiDliJ3lp4vljJYgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvYWRpbmc9ZmFsc2U7Ci8vIOWFpeWcuumXquWxj++8mummluasoeaVsOaNruWwsee7qu+8iOaXoOiuuuaIkOWKny/lpLHotKXvvInlkI7mt6Hlh7rnp7vpmaQKZnVuY3Rpb24gaGlkZVNwbGFzaCgpe2NvbnN0IHM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNwbGFzaCIpO2lmKCFzKXJldHVybjtzLmNsYXNzTGlzdC5hZGQoIm91dCIpO3NldFRpbWVvdXQoKCk9PntpZihzLnBhcmVudE5vZGUpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHMpfSw0NTApfQphc3luYyBmdW5jdGlvbiByZWZyZXNoQWxsKHNpbGVudCl7CiAgaWYobG9hZGluZylyZXR1cm47bG9hZGluZz10cnVlOwogIGlmKCFzaWxlbnQpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2lmKCFTVEFURS5kYXRhLmxlbmd0aCllbC5pbm5lckhUTUw9c2tlbGV0b25Ib21lKCl9CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldERhc2hib2FyZCgpOwogIGxvYWRpbmc9ZmFsc2U7aGlkZVNwbGFzaCgpOwogIGlmKGQmJmQub2spe1NUQVRFLmRhdGE9ZC5hY2NvdW50c3x8W107U1RBVEUudHNUZXh0PWZtdFRpbWUoZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9aXNQcm94eU1vZGUoKTtyZW5kZXJIb21lKCl9CiAgZWxzZXtjb25zdCBoaW50PWQmJmQucmF3JiZkLnJhdy5lcnJvcj9uZXR3b3JrSGludChkLnJhdyk6IiI7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaVsOaNruWKoOi9veWksei0pTwvaDM+PHA+JysoaGludHx8ZXNjKChkJiZkLmVycm9yKXx8Iue9kee7nOW8guW4uO+8jOivt+ajgOafpee9kee7nOi/nuaOpSIpKSsnPC9wPjxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyIj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icmVmcmVzaEFsbCgpIj7ph43or5U8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5qOA5p+l6K6+572uPC9idXR0b24+PC9kaXY+PC9kaXY+J30KfQovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOenr+WIhumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgUFQ9e2FjY0lkeDowLG1vbnRoOiIifTsKZnVuY3Rpb24gcHRBY2NvdW50cygpe3JldHVybiBTVEFURS5kYXRhJiZTVEFURS5kYXRhLmxlbmd0aD9TVEFURS5kYXRhOihTVEFURS5wYW5lbEFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8Iui0puWPtyIsdXNlcklkOmEudXNlcklkfHwiIn0pKX0KZnVuY3Rpb24gYWNjQ2hpcHNIdG1sKHByZWZpeCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiIiOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNoaXBzIj4nK2xpc3QubWFwKChhLGkpPT4nPGJ1dHRvbiBjbGFzcz0iYWNjLWNoaXAgJysoaT09PShwcmVmaXg9PT0icHQiP1BULmFjY0lkeDpWSC5hY2NJZHgpPydvbic6JycpKyciIG9uY2xpY2s9InBpY2tBY2MoXCcnK3ByZWZpeCsnXCcsJytpKycpIj4nK2VzYyhhLnVzZXJOYW1lfHwoIui0puWPtyIrKGkrMSkpKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7Cn0KZnVuY3Rpb24gcGlja0FjYyhwcmVmaXgsaSl7aWYocHJlZml4PT09InB0Iil7UFQuYWNjSWR4PWk7cmVuZGVyUG9pbnRzKCl9ZWxzZXtWSC5hY2NJZHg9aTtWSC52aW49IiI7cmVuZGVyVmVoaWNsZVBhZ2UoKX19CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclBvaW50cygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlUG9pbnRzIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihQVC5hY2NJZHg+PWxpc3QubGVuZ3RoKVBULmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1BULmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjxwPuivt+WIsOiuvue9rumhteihpeWFqOeUqOaIt0lEPC9wPjwvZGl2Pic7cmV0dXJufQogIGVsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5IiBzdHlsZT0icGFkZGluZzo0MHB4IDIwcHgiPjxwIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L2956ev5YiG5pWw5o2u5Lit4oCmPC9wPjwvZGl2Pic7CiAgY29uc3QgbW9udGg9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgW2l0LGNhbCxjbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLDEpLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJtb250aCIsYWNjLnVzZXJJZCx7bW9udGg6bW9udGh9KSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgiY291bnQiLGFjYy51c2VySWQse30pCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJwdCIpOwogIC8vIOaAu+iniAogIGNvbnN0IHRvdGFsPWl0JiZpdC50b3RhbD9kZWVwUGljayhpdC50b3RhbCxbImludGVncmFsVG90YWwiLCJ0b3RhbEludGVncmFsIiwic2NvcmUiLCJpbnRlZ3JhbCIsInRvdGFsIl0sNCk6IiI7CiAgY29uc3QgY2FyZE51bT1jbnQmJmNudC5kYXRhIT1udWxsP2RlZXBQaWNrKGNudC5kYXRhLFsiY291bnQiLCJjYXJkTnVtIiwiY2FyZENvdW50IiwibnVtYmVyIiwibnVtIl0sNCk6IiI7CiAgbGV0IGV4cFR4dD0iIjsKICBpZihpdCYmQXJyYXkuaXNBcnJheShpdC5leHBpcmUpJiZpdC5leHBpcmUubGVuZ3RoKXsKICAgIGNvbnN0IGUwPWl0LmV4cGlyZS5maW5kKHg9Pk51bWJlcih4LmludGVncmFsU2NvcmUpPjApfHxpdC5leHBpcmVbMF07CiAgICBpZihlMClleHBUeHQ9U3RyaW5nKGUwLmV4cGlyeURhdGVTdHJ8fCIiKSsoTnVtYmVyKGUwLmludGVncmFsU2NvcmUpPjA/IiDliLDmnJ8gIitlMC5pbnRlZ3JhbFNjb3JlKyIg5YiGIjoiIik7CiAgfQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwdC1ncmlkIj4nCiAgICArJzxkaXYgY2xhc3M9InB0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7lvZPliY3mgLvnp6/liIY8L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPicrZXNjKHRvdGFsfHwiLS0iKSsnPC9kaXY+JysoZXhwVHh0Pyc8ZGl2IGNsYXNzPSJzdWIiPicrZXNjKGV4cFR4dCkrJzwvZGl2Pic6JycpKyc8L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InB0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ooaXnrb7ljaE8L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKGNhcmROdW18fCItLSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzdWIiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgc3R5bGU9Im1hcmdpbi10b3A6NHB4IiBvbmNsaWNrPSJzdXBHYWluKCkiPuenr+WIhuWFkeaNouihpeetvuWNoTwvYnV0dG9uPjwvZGl2PjwvZGl2PicKICAgICsnPC9kaXY+JzsKICAvLyDnm7Lnm5Lov5vluqbvvIh2Mi4xNC4xNCDotbfnlLHpppbpobXov4Hnp7voh7PmraTvvIkKICBjb25zdCBjb250PU51bWJlcihhY2MuY29udGludWVEYXlzfHwwKTsKICBjb25zdCBiRGF5PWNvbnQ9PT0wPzA6KChjb250LTEpJTMwKSsxO2NvbnN0IGJSb3VuZD1jb250PT09MD8wOk1hdGguY2VpbChjb250LzMwKTtjb25zdCBiUGN0PU1hdGgucm91bmQoKGJEYXkvMzApKjEwMCk7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImJsaW5kIiBzdHlsZT0ibWFyZ2luOjAgMCAxMnB4Ij48ZGl2IGNsYXNzPSJibGluZC10b3AiPjxzcGFuPuebsuebkui/m+W6pu+8iOesrCcrYlJvdW5kKyfova7vvIk8L3NwYW4+PHNwYW4gY2xhc3M9InIgbnVtIj4nK2JEYXkrJyAvIDMwIMK3ICcrYlBjdCsnJSDCtyDov57nrb4gJytjb250Kycg5aSpPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImJsaW5kLWJhciI+PGRpdiBjbGFzcz0iYmxpbmQtZmlsbCIgc3R5bGU9IndpZHRoOicrYlBjdCsnJSI+PC9kaXY+PC9kaXY+PC9kaXY+JzsKICAvLyDnrb7liLDml6XljoYKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5jaGVjaysn562+5Yiw5pel5Y6GIMK3ICcrZXNjKG1vbnRoKSsnPC9oND48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InB0TW9udGhTaGlmdCgtMSkiPuS4iuaciDwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgZGF5cz0oY2FsJiZjYWwuZGF0YSYmY2FsLmRhdGEubm93U2lnbkRldGFpbFZvcyl8fFtdOwogIGlmKGRheXMubGVuZ3RoKXsKICAgIGh0bWwrPWNhbEh0bWwoZGF5cyxtb250aCxhY2MudXNlcklkKTsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtwYWRkaW5nOjhweCAwIj4nKyhjYWwmJmNhbC5tZXNzYWdlP2VzYyhjYWwubWVzc2FnZSk6IuaXpeWOhuWKoOi9veWksei0pe+8iOWPr+iDvemZkOa1ge+8jOeojeWQjuWGjeivle+8iSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyDnp6/liIbmtYHmsLQKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS56YXArJ+enr+WIhua1geawtDwvaDQ+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJwdE1vcmVGbG93KCkiPuWKoOi9veabtOWkmjwvYnV0dG9uPjwvZGl2PjxkaXYgaWQ9InB0RmxvdyI+JzsKICBodG1sKz1mbG93SHRtbCgoaXQmJml0LmRldGFpbCl8fFtdKTsKICBodG1sKz0nPC9kaXY+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+56ev5YiG5pWw5o2u5p2l6Ieq5p6B5qC45a6e5pe2IEFQSSDCtyDooaXnrb7pmZAgMzAg5aSp5YaF5ryP562+77yM5q+P5qyh5raI6ICXIDEg5byg6KGl562+5Y2hPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKICBQVC5mbG93UGFnZT0xOwp9CmZ1bmN0aW9uIGNhbEh0bWwoZGF5cyxtb250aCx1c2VySWQpewogIGNvbnN0IHltPW1vbnRoLnNwbGl0KCItIik7Y29uc3QgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKTsKICBjb25zdCBmaXJzdD1uZXcgRGF0ZSh5LG0tMSwxKS5nZXREYXkoKTsKICBjb25zdCBkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKTsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IGg9JzxkaXYgY2xhc3M9ImNhbC1ncmlkIj4nOwogIFsi5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl0uZm9yRWFjaCh3PT57aCs9JzxkaXYgY2xhc3M9ImNhbC13ZCI+Jyt3Kyc8L2Rpdj4nfSk7CiAgZm9yKGxldCBpPTA7aTxmaXJzdDtpKyspaCs9JzxkaXYgY2xhc3M9ImNhbC1kIGJsYW5rIj48L2Rpdj4nOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9bW9udGgrIi0iK1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIik7CiAgICBjb25zdCBlbnRyeT1kYXlzLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpOwogICAgY29uc3Qgc2lnbmVkPWVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCk7CiAgICBjb25zdCBpc1RvZGF5PWRzPT09dFN0cjsKICAgIGNvbnN0IGZ1dHVyZT1kcz50U3RyOwogICAgbGV0IGNscz0iY2FsLWQiKyhzaWduZWQ/IiBzaWduZWQiOihmdXR1cmU/IiBmdXR1cmUiOihlbnRyeT8iIG1pc3MiOiIiKSkpOwogICAgaWYoaXNUb2RheSljbHMrPSIgdG9kYXkiOwogICAgY29uc3QgY2xpY2thYmxlPSFzaWduZWQmJiFmdXR1cmUmJmVudHJ5OwogICAgaCs9JzxkaXYgY2xhc3M9IicrY2xzKyciICcrKGNsaWNrYWJsZT8nc3R5bGU9ImN1cnNvcjpwb2ludGVyIiBvbmNsaWNrPSJzdXBDb25zdW1lKFwnJytkcysnXCcsXCcnK2VzYyh1c2VySWQpKydcJykiJzonJykrJz4nCiAgICAgICsnPHNwYW4+JytkKyc8L3NwYW4+JwogICAgICArJzxzcGFuIGNsYXNzPSJkb3QiPicrKHNpZ25lZD8i4pyTIjooZnV0dXJlPyIiOihlbnRyeT8i5ryPIjoiIikpKSsnPC9zcGFuPicKICAgICAgKyc8L2Rpdj4nOwogIH0KICBoKz0nPC9kaXY+JzsKICBoKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+54K55Ye744CM5ryP44CN5pel5pyf5L2/55So6KGl562+5Y2h6KGl562+77yI6ZyA5YWI5pyJ6KGl562+5Y2h77yJPC9kaXY+JzsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBmbG93SHRtbChsaXN0KXsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtwYWRkaW5nOjhweCAwIj7mmoLml6DmtYHmsLTorrDlvZU8L2Rpdj4nOwogIHJldHVybiBsaXN0Lm1hcCh4PT57CiAgICBjb25zdCBzYz1OdW1iZXIoeC5pbnRlZ3JhbFNjb3JlKXx8MDsKICAgIHJldHVybiAnPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2PjxkaXYgY2xhc3M9Im5tIj4nK2VzYyh4Lm5hbWV8fCLnp6/liIblj5jliqgiKSsnPC9kaXY+PGRpdiBjbGFzcz0idG0iPicrZXNjKHgubXlEYXRlU3RyfHx4LmNyZWF0ZURhdGVTdHJ8fCIiKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ic2MgbnVtICcrKHNjPj0wPyJwbHVzIjoibWludXMiKSsnIj4nKyhzYz49MD8iKyI6IiIpK3NjKyc8L2Rpdj48L2Rpdj4nOwogIH0pLmpvaW4oIiIpOwp9CmFzeW5jIGZ1bmN0aW9uIHB0TW9yZUZsb3coKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBQVC5mbG93UGFnZT0oUFQuZmxvd1BhZ2V8fDEpKzE7CiAgY29uc3QgaXQ9YXdhaXQgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLFBULmZsb3dQYWdlKTsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRGbG93Iik7CiAgaWYoZWwmJml0JiZBcnJheS5pc0FycmF5KGl0LmRldGFpbCkmJml0LmRldGFpbC5sZW5ndGgpZWwuaW5uZXJIVE1MKz1mbG93SHRtbChpdC5kZXRhaWwpOwogIGVsc2UgdG9hc3QoIuayoeacieabtOWkmuS6hiIsImluZm8iKTsKfQpmdW5jdGlvbiBwdE1vbnRoU2hpZnQoZGlyKXsKICBjb25zdCBjdXI9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCItIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBQVC5tb250aD15KyItIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIHJlbmRlclBvaW50cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cENvbnN1bWUoZGF0ZSx1c2VySWQpewogIGNvbmZpcm1EaWFsb2coIuenr+WIhuihpeetviIsIuS9v+eUqCAxIOW8oOihpeetvuWNoeihpeetviAiK2RhdGUrIiDvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi6KGl562+5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImNvbnN1bWUiLHVzZXJJZCx7ZGF0ZVRpbWU6ZGF0ZX0pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuihpeetvuaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLooaXnrb7lpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOihpeetviIpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cEdhaW4oKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25maXJtRGlhbG9nKCLlhZHmjaLooaXnrb7ljaEiLCLkvb/nlKjnp6/liIblhZHmjaIgMSDlvKDooaXnrb7ljaHvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5YWR5o2i5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImdhaW4iLGFjYy51c2VySWQse30pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuWFkeaNouaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLlhZHmjaLlpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOWFkeaNoiIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOi9pui+humhte+8iOebkeaOpyArIOi9puaOp+aJqeWxlSArIOS/oeaBr+S4reW/g++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgVkg9e2FjY0lkeDowLHZpbjoiIixjcDoiIixnZWFyOiIiLGxvY2tUeXBlOiIxIn07CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclZlaGljbGVQYWdlKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VWZWhpY2xlIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihWSC5hY2NJZHg+PWxpc3QubGVuZ3RoKVZILmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInZoIikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjwvZGl2Pic7cmV0dXJufQogIGVsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInZoIikrJzxkaXYgY2xhc3M9ImVtcHR5IiBzdHlsZT0icGFkZGluZzo0MHB4IDIwcHgiPjxwIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L296L2m6L6G5pWw5o2u5Lit4oCmPC9wPjwvZGl2Pic7CiAgbGV0IG1vbj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsIiIpOwogIGNvbnN0IHZlaExpc3Q9KG1vbiYmQXJyYXkuaXNBcnJheShtb24udmVoaWNsZXMpKT9tb24udmVoaWNsZXM6W107CiAgaWYoVkgudmluJiZtb24mJm1vbi5vayYmbW9uLnNuYXBzaG90JiZtb24uc25hcHNob3QudmluIT09VkgudmluKXsKICAgIGNvbnN0IG1vbjI9YXdhaXQgQmFja2VuZC52ZWhpY2xlTW9uaXRvcihhY2MudXNlcklkLFZILnZpbik7CiAgICBpZihtb24yJiZtb24yLm9rKXttb24yLnZlaGljbGVzPXZlaExpc3Q7bW9uPW1vbjJ9CiAgfQogIGNvbnN0IFtvcHRzLGluZm9dPWF3YWl0IFByb21pc2UuYWxsKFsKICAgIEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoe2FjdGlvbjoib3B0aW9ucyIsdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiJ9KSwKICAgIEJhY2tlbmQuaW5mb0NlbnRlcihhY2MudXNlcklkLFZILnZpbnx8IiIpCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJ2aCIpOwogIC8vIOi9pui+humAieaLqe+8iOWkmui9pu+8iQogIGlmKHZlaExpc3QubGVuZ3RoPjEpewogICAgY29uc3QgY3VyVmluPVZILnZpbnx8KG1vbiYmbW9uLnNuYXBzaG90P21vbi5zbmFwc2hvdC52aW46dmVoTGlzdFswXS52aW5Obyk7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ib3B0LXJvdyI+Jyt2ZWhMaXN0Lm1hcCh2PT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoY3VyVmluPT09di52aW5Obz8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC52aW49XCcnK2VzYyh2LnZpbk5vKSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2Modi52ZWhpY2xlTmFtZXx8di52aW5ObykrJzwvYnV0dG9uPicpLmpvaW4oIiIpKyc8L2Rpdj4nOwogIH0KICAvLyDnirbmgIHnm5HmjqfljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5jYXIrJ+i9pui+hueKtuaAgTwvaDQ+PHNwYW4gc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNob3dWZWhpY2xlRGV0YWlsKCcrVkguYWNjSWR4KycpIj7or6bmg4U8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InJlbmRlclZlaGljbGVQYWdlKCkiPuWIt+aWsDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nOwogIGlmKG1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QpewogICAgY29uc3Qgc249bW9uLnNuYXBzaG90OwogICAgY29uc3Qgc29jQ29sPXNuLnNvYzw9MjA/InZhcigtLWVycikiOnNuLnNvYzw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tb2spIjsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Ymp5L2Z55S16YePPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSIgc3R5bGU9ImNvbG9yOicrc29jQ29sKyciPicrKHNuLnNvYyE9bnVsbD9zbi5zb2MrIiUiOiItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Ymp5L2Z57ut6IiqPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jysoc24ucmFuZ2UhPW51bGw/c24ucmFuZ2UrIiBrbSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7pvpnlpLTplIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrKHNuLmhlYWRMb2NrPT09IjEiPyLlt7LplIEiOiLmnKrplIEiKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWcqOe6v+eKtuaAgTwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImNvbG9yOicrKHNuLm9mZmxpbmU/InZhcigtLWVycikiOiJ2YXIoLS1vaykiKSsnIj4nKyhzbi5vZmZsaW5lPyLnprvnur/vvIg+MzDliIbpkp/mnKrkuIrmiqXvvIkiOiLlnKjnur8iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuacgOWQjuS4iuaKpTwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpIj4nK2VzYyhzbi5yZWZyZXNoVGltZXx8Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4Ij4nK2VzYygobW9uJiYobW9uLmVycm9yfHxtb24ubWVzc2FnZSkpfHwi5b+r54Wn6I635Y+W5aSx6LSlIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOi9pui+huaOp+WItuWNoe+8iOS7jummlumhtei/geenu+i/h+adpe+8iQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLnphcCsn6L2m6L6G5o6n5Yi2PC9oND48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9ImN0cmwtZ3JpZCI+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2ZpbmRcJyx0aGlzKSI+JytJLmJlbGwrJ+Wvu+i9pjwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJsb3VkRmluZCIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnbG91ZEZpbmRcJyx0aGlzKSI+JytJLnZvbCsn6bij56ybPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImN1c2hpb24iIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2N1c2hpb25cJyx0aGlzKSI+JytJLnNlYXQrJ+WdkOWeqzwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gdW5sb2NrIiBkYXRhLWFjdD0idW5sb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCd1bmxvY2tcJyx0aGlzKSI+JytJLnVubG9jaysn5byA6ZSBPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biBsb2NrIiBkYXRhLWFjdD0ibG9jayIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnbG9ja1wnLHRoaXMpIj4nK0kubG9jaysn5YWz6ZSBPC9idXR0b24+JwogICAgKyc8L2Rpdj48L2Rpdj4nOwogIC8vIOi9puaOp+aJqeWxleWNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLnphcCsn6L2m5o6n5omp5bGVPC9oND48L2Rpdj4nOwogIGNvbnN0IGNwcz0ob3B0cyYmQXJyYXkuaXNBcnJheShvcHRzLmNoYXJnZVBvd2VyKSk/b3B0cy5jaGFyZ2VQb3dlcjpbXTsKICBjb25zdCBnZWFycz0ob3B0cyYmQXJyYXkuaXNBcnJheShvcHRzLmdlYXJzKSk/b3B0cy5nZWFyczpbXTsKICBpZihjcHMubGVuZ3RoKXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbTo0cHgiPuWFheeUteWKn+eOh++8iFfvvIk8L2Rpdj48ZGl2IGNsYXNzPSJvcHQtcm93Ij4nCiAgICAgICtjcHMubWFwKG89Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhWSC5jcD09PW8ua2V5Pydvbic6JycpKyciIG9uY2xpY2s9IlZILmNwPVwnJytlc2Moby5rZXkpKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyhvLmtleSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpCiAgICAgICsnPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImV4dFNldChcJ2NoYXJnZVBvd2VyXCcpIj7orr7nva48L2J1dHRvbj48L2Rpdj4nOwogIH0KICBpZihnZWFycy5sZW5ndGgpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjRweCI+6ZmQ6YCf5qGj5L2N77yIa20vaO+8iTwvZGl2PjxkaXYgY2xhc3M9Im9wdC1yb3ciPicKICAgICAgK2dlYXJzLm1hcChnPT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoVkguZ2Vhcj09PWc/J29uJzonJykrJyIgb25jbGljaz0iVkguZ2Vhcj1cJycrZXNjKGcpKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyhnKSsnPC9idXR0b24+Jykuam9pbigiIikKICAgICAgKyc8YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iZXh0U2V0KFwnbWF4U3BlZWRcJykiPuiuvue9rjwvYnV0dG9uPjwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOS/oeaBr+S4reW/g+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmJlbGwrJ+S/oeaBr+S4reW/gzwvaDQ+PC9kaXY+JzsKICBpZihpbmZvJiZpbmZvLm9rKXsKICAgIGNvbnN0IHVuPWluZm8udW5yZWFkIT1udWxsP2RlZXBQaWNrKGluZm8udW5yZWFkLFsidG90YWwiLCJjb3VudCIsInVuUmVhZENvdW50IiwibnVtIl0sMyk6IiI7CiAgICBpZih1biE9PSIiKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyq6K+75raI5oGvPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModW4pKyc8L3NwYW4+PC9kaXY+JzsKICAgIGNvbnN0IHByaXplcz0oaW5mby5wcml6ZVJlY29yZHMmJihpbmZvLnByaXplUmVjb3Jkcy5yZWNvcmRzfHxpbmZvLnByaXplUmVjb3Jkcy5saXN0fHxpbmZvLnByaXplUmVjb3JkcykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkocHJpemVzKSYmcHJpemVzLmxlbmd0aCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjhweCAwIDRweCI+55uy55uSL+S4reWlluiusOW9lTwvZGl2Pic7CiAgICAgIGh0bWwrPXByaXplcy5zbGljZSgwLDUpLm1hcChwPT4nPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2PjxkaXYgY2xhc3M9Im5tIj4nK2VzYyhwLnByaXplc05hbWV8fHAubmFtZXx8IuWlluWTgSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ0bSI+Jytlc2MocC5jcmVhdGVUaW1lfHxwLmNyZWF0ZURhdGV8fCIiKSsnPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0ic2MgcGx1cyIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nK2VzYyhwLmludGVncmFsPygiKyIrcC5pbnRlZ3JhbCk6IiIpKyc8L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKICAgIH0KICAgIGNvbnN0IGNvdXBvbnM9KGluZm8uY291cG9ucyYmKGluZm8uY291cG9ucy5yZWNvcmRzfHxpbmZvLmNvdXBvbnMubGlzdHx8aW5mby5jb3Vwb25zKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShjb3Vwb25zKSYmY291cG9ucy5sZW5ndGgpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7kvJjmg6DliLg8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nK2NvdXBvbnMubGVuZ3RoKycg5bygPC9zcGFuPjwvZGl2Pic7CiAgICBpZihpbmZvLm90YSE9bnVsbClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPk9UQSDljYfnuqc8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJmb250LXNpemU6MTJweCI+JysoQXJyYXkuaXNBcnJheShpbmZvLm90YSkmJmluZm8ub3RhLmxlbmd0aD8i5pyJ5paw54mI5pysIjoi5bey5piv5pyA5pawIikrJzwvc3Bhbj48L2Rpdj4nOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4Ij4nK2VzYygoaW5mbyYmKGluZm8uZXJyb3J8fGluZm8ubWVzc2FnZSkpfHwi5L+h5oGv5Lit5b+D5Yqg6L295aSx6LSlIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7ovabmjqfmianlsZXmjIfku6Tnu4/kupHnq6/kuIvlj5HvvIzlk43lupTlj6/og73ovoPmhaI8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CmFzeW5jIGZ1bmN0aW9uIGV4dFNldChhY3Rpb24pewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIGNvbnN0IGJvZHk9e2FjdGlvbjphY3Rpb24sdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiJ9OwogIGlmKGFjdGlvbj09PSJjaGFyZ2VQb3dlciIpe2lmKCFWSC5jcCl7dG9hc3QoIuivt+WFiOmAieaLqeWFheeUteWKn+eOhyIsImVyciIpO3JldHVybn1ib2R5LnZhbHVlPVZILmNwfQogIGlmKGFjdGlvbj09PSJtYXhTcGVlZCIpe2lmKCFWSC5nZWFyKXt0b2FzdCgi6K+35YWI6YCJ5oup6ZmQ6YCf5qGj5L2NIiwiZXJyIik7cmV0dXJufWJvZHkudmFsdWU9VkguZ2Vhcn0KICB0b2FzdCgi5oyH5Luk5LiL5Y+R5Lit4oCmIiwiaW5mbyIpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dChib2R5KTsKICB0b2FzdCgoZCYmZC5tZXNzYWdlKXx8KChkJiZkLm9rKT8i5oyH5Luk5bey5LiL5Y+RIjoi5oyH5Luk5aSx6LSlIiksKGQmJmQub2spPyJvayI6ImVyciIpOwp9CgpmdW5jdGlvbiBpbml0KCl7CiAgYXBwbHlUaGVtZSgpO21vdW50U2lnbmluRmFiKCk7CiAgcmVuZGVyQ2ZnKCk7CiAgaWYobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MCl7CiAgICBTVEFURS5kYXRhPURFTU9fREFUQTtTVEFURS50c1RleHQ9Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1NUQVRFLnByb3h5PWZhbHNlOwogICAgcmVuZGVySG9tZSgpO2hpZGVTcGxhc2goKTtyZXR1cm47CiAgfQogIHN0YXJ0QXV0b1JlZnJlc2goKTtyZWZyZXNoQWxsKGZhbHNlKTsKICAvLyDlhZzlupXvvJrmnoHnq6/mg4XlhrXkuIvor7fmsYLplb/ml7bpl7Tml6Dlk43lupTvvIzpl6rlsY/kuZ/kuI3og73kuIDnm7TmjKHkvY/nlYzpnaIKICBzZXRUaW1lb3V0KGhpZGVTcGxhc2gsMTIwMDApOwp9CmluaXQoKTsKPC9zY3JpcHQ+CjwhLS1fX0pTNV9fLS0+Cg==";
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