/*
#!name=极核 ZEEHO 签到面板 V2.14.6
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.14.6

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.14.6, requires-body=true, timeout=60, tag=极核面板V2.14.6

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
// 版本: v2.14.6
// 更新日期: 2026-09-26
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.14.6";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-09-26 v2.14.6 仓库迁移至 github.com/cluck798/ZEEHO——脚本内全部 GitHub 链接与 CDN 地址已更新为新仓库；请在代理工具中更新订阅/插件后强制刷新面板，以拉取新版脚本`);

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
        basicAuth: (typeof c.basicAuth === "string" ? c.basicAuth : "").trim()
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
    basicAuth: ""
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
  const signature = type === "h5" ? `${query}${param}${ac.appSecret}` : `${bodyStr}${param}${ac.appSecret}`;
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

// ========== HTTP 请求 ==========
function httpGet(url, headers) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    if (isQX) {
      $task.fetch({ url, headers, method: "GET" }).then(
        function(resp) {
          try { resolve(JSON.parse(resp.body)); }
          catch(e) { resolve({ error: "parse error", raw: resp.body }); }
        },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.get({ url, headers }, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: "parse error", raw: body }); }
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
      if (todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5)) {
        result.steps.push("今日已签到");
      } else {
        // 多账号连签易触发“请稍后/操作频繁”限流，退避后最多重试3次
        let signRes = null, signMsg = "未知";
        for (let at = 1; at <= 3; at++) {
          signRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/signin`, { ...baseHeaders, ...getSign("h5", {}, '', cfg) }, {});
          if (signRes?.code == "10000") break;
          signMsg = signRes?.message || "未知";
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
            if (ce && (ce.signStatue == 3 || ce.signStatue == 5)) result.steps.push("今日已签到");
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
      for (let i = todayIdx; i >= 0; i--) { if (list[i]?.signStatue == 3 || list[i]?.signStatue == 5) cont++; else break; }
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
    const comm = cfg.community || {};
    let postId = null;
    if (comm.enablePost !== false) {
      try {
        const postRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle`, { ...baseHeaders, ...getSign("app", {}, '', cfg) }, { postcontent: "开心的一天" });
        if (postRes?.code == "10000") {
          postId = getPostIdFromData(postRes.data);
          result.interactScore += 1;
          result.steps.push("发帖成功 +1");
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
          const likeRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo`, { ...baseHeaders, ...getSign("app", {}, '', cfg) }, { postId: String(postId), kindFlag: "0" });
          if (likeRes?.code == "10000") { result.interactScore += 1; result.steps.push("点赞成功 +1"); }
        } catch(e) { result.steps.push(`点赞异常: ${e}`); }
      }
      if (comm.enableComment !== false) {
        try {
          await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commentInfo`, { ...baseHeaders, ...getSign("app", {}, '', cfg) }, { postid: String(postId), userId: String(userId), comments: "厉害", sendTos: "[\n\n]" });
          result.steps.push("评论完成");
        } catch(e) { result.steps.push(`评论异常: ${e}`); }
      }
      if (comm.enableShare !== false) {
        try {
          const shareRes = await httpPut(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/article/share/${postId}`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
          if (shareRes?.code == "10000") { result.interactScore += 1; result.steps.push("分享成功 +1"); }
          await httpGet(`https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
        } catch(e) { result.steps.push(`分享异常: ${e}`); }
      }
      if (comm.enableDelete !== false && postId) {
        try {
          await httpDelete(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?articleId=${postId}&postType=1`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
          result.steps.push("动态已删除");
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
        function(resp) { try { resolve(JSON.parse(resp.body)); } catch(e) { resolve({ error: "parse error", raw: resp.body }); } },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.post(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: "parse error", raw: body }); }
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
        function(resp) { try { resolve(JSON.parse(resp.body)); } catch(e) { resolve({ error: "parse error", raw: resp.body }); } },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.put(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: "parse error", raw: body }); }
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
        function(resp) { try { resolve(JSON.parse(resp.body)); } catch(e) { resolve({ error: "parse error", raw: resp.body }); } },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.delete(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: "parse error", raw: body }); }
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
    result.signedToday = !!(todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5));
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
        if (st == 3 || st == 5) cont++; else break;
      }
    }
    result.continueDays = cont;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const entry = list.find(x => x.createDate === ds);
      result.last7.push({
        date: ds.slice(5),
        signed: !!(entry && (entry.signStatue == 3 || entry.signStatue == 5)),
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQpbZGF0YS10aGVtZT0ibGlnaHQiXXstLWJnOiNGM0Y2RkI7LS1iZzI6I0ZGRkZGRjstLWNhcmQ6cmdiYSgxNSwyMyw0MiwuMDQ1KTstLWNhcmQyOiNGRkZGRkY7LS1jYXJkMzojRURGMUY3Oy0tbGluZTpyZ2JhKDE1LDIzLDQyLC4xMCk7LS1saW5lMjpyZ2JhKDE1LDIzLDQyLC4xOCk7LS10eHQ6IzBGMTcyQTstLXR4dDI6IzQ3NTU2OTstLXR4dDM6Izk0QTNCODstLWJyYW5kOiMwRThGQjI7LS1icmFuZDI6IzJCRDRGMjstLWJyYW5kU29mdDpyZ2JhKDQzLDIxMiwyNDIsLjE2KTstLW9rOiMxNkEzNEE7LS1va1NvZnQ6cmdiYSgyMiwxNjMsNzQsLjE0KTstLXdhcm46I0Q5NzcwNjstLXdhcm5Tb2Z0OnJnYmEoMjE3LDExOSw2LC4xNik7LS1lcnI6I0RDMjYyNjstLWVyclNvZnQ6cmdiYSgyMjAsMzgsMzgsLjEyKTstLXZpbzojN0M2QkYwOy0tdmlvU29mdDpyZ2JhKDEyNCwxMDcsMjQwLC4xNCk7LS1ncmFkOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzBFOEZCMiwjMkJENEYyKTstLWdyYWQtdmlvOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzdDNkJGMCwjQjdBNkZCKX0KW2RhdGEtdGhlbWU9ImdyZWVuIl17LS1iZzojMDcxNDBFOy0tYmcyOiMwODE4MEY7LS1jYXJkOnJnYmEoODAsMjAwLDEyMCwuMDYpOy0tY2FyZDI6IzBDMUYxNTstLWNhcmQzOiMwOTFBMTI7LS1saW5lOnJnYmEoODAsMjAwLDEyMCwuMTQpOy0tbGluZTI6cmdiYSg4MCwyMDAsMTIwLC4yNCk7LS10eHQ6I0U2RjdFQzstLXR4dDI6IzhGQkZBMzstLXR4dDM6IzVFOEE2RTstLWJyYW5kOiMzNEQzOTk7LS1icmFuZDI6IzA1OTY2OTstLWJyYW5kU29mdDpyZ2JhKDUyLDIxMSwxNTMsLjE2KTstLW9rOiM0QURFODA7LS1va1NvZnQ6cmdiYSg3NCwyMjIsMTI4LC4xNik7LS13YXJuOiNGQkJGMjQ7LS13YXJuU29mdDpyZ2JhKDI1MSwxOTEsMzYsLjE2KTstLWVycjojRjg3MTcxOy0tZXJyU29mdDpyZ2JhKDI0OCwxMTMsMTEzLC4xNik7LS12aW86I0E3RjNEMDstLXZpb1NvZnQ6cmdiYSgxNjcsMjQzLDIwOCwuMTQpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMzNEQzOTksIzA1OTY2OSk7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNBN0YzRDAsIzM0RDM5OSl9CltkYXRhLXRoZW1lPSJ2aW9sZXQiXXstLWJnOiMxMDBCMjA7LS1iZzI6IzE0MEQyODstLWNhcmQ6cmdiYSgxNTAsMTIwLDI1NSwuMDcpOy0tY2FyZDI6IzFBMTIzMzstLWNhcmQzOiMxNDEwMzA7LS1saW5lOnJnYmEoMTUwLDEyMCwyNTUsLjE1KTstLWxpbmUyOnJnYmEoMTUwLDEyMCwyNTUsLjI1KTstLXR4dDojRjBFQkZGOy0tdHh0MjojQjBBNkQ5Oy0tdHh0MzojN0E2RkE4Oy0tYnJhbmQ6I0E3OEJGQTstLWJyYW5kMjojN0MzQUVEOy0tYnJhbmRTb2Z0OnJnYmEoMTY3LDEzOSwyNTAsLjE4KTstLW9rOiM0QURFODA7LS1va1NvZnQ6cmdiYSg3NCwyMjIsMTI4LC4xNik7LS13YXJuOiNGQkJGMjQ7LS13YXJuU29mdDpyZ2JhKDI1MSwxOTEsMzYsLjE2KTstLWVycjojRjg3MTcxOy0tZXJyU29mdDpyZ2JhKDI0OCwxMTMsMTEzLC4xNik7LS12aW86I0M0QjVGRDstLXZpb1NvZnQ6cmdiYSgxOTYsMTgxLDI1MywuMTYpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNBNzhCRkEsIzdDM0FFRCk7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNDNEI1RkQsI0E3OEJGQSl9CltkYXRhLXRoZW1lPSJhbWJlciJdey0tYmc6IzE2MTAwOTstLWJnMjojMUExMzBBOy0tY2FyZDpyZ2JhKDI1NSwxODAsOTAsLjA3KTstLWNhcmQyOiMyNDFBMEQ7LS1jYXJkMzojMUMxNTBCOy0tbGluZTpyZ2JhKDI1NSwxODAsOTAsLjE1KTstLWxpbmUyOnJnYmEoMjU1LDE4MCw5MCwuMjUpOy0tdHh0OiNGREYzRTM7LS10eHQyOiNEOUI5OEM7LS10eHQzOiNBOTgzNTQ7LS1icmFuZDojRkJCRjI0Oy0tYnJhbmQyOiNEOTc3MDY7LS1icmFuZFNvZnQ6cmdiYSgyNTEsMTkxLDM2LC4xOCk7LS1vazojNEFERTgwOy0tb2tTb2Z0OnJnYmEoNzQsMjIyLDEyOCwuMTYpOy0td2FybjojRjU5RTBCOy0td2FyblNvZnQ6cmdiYSgyNDUsMTU4LDExLC4xOCk7LS1lcnI6I0Y4NzE3MTstLWVyclNvZnQ6cmdiYSgyNDgsMTEzLDExMywuMTYpOy0tdmlvOiNGQ0QzNEQ7LS12aW9Tb2Z0OnJnYmEoMjUyLDIxMSw3NywuMTYpOy0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNGQkJGMjQsI0Q5NzcwNik7LS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNGQ0QzNEQsI0ZCQkYyNCl9CgoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0udGhlbWUtZmFie3Bvc2l0aW9uOmZpeGVkO3RvcDoxNHB4O3JpZ2h0OjE0cHg7ei1pbmRleDo5OTk7d2lkdGg6NDBweDtoZWlnaHQ6NDBweDtib3JkZXItcmFkaXVzOjUwJTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxOHB4O2N1cnNvcjpwb2ludGVyO2JveC1zaGFkb3c6MCA0cHggMTRweCByZ2JhKDAsMCwwLC4yOCl9CgpodG1sLGJvZHl7aGVpZ2h0OjEwMCV9CmJvZHl7CiAgZm9udC1mYW1pbHk6LWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsIlBpbmdGYW5nIFNDIiwiSGVsdmV0aWNhIE5ldWUiLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjsKICBiYWNrZ3JvdW5kOnZhcigtLWJnKTsgY29sb3I6dmFyKC0tdHh0KTsgZm9udC1zaXplOjE1cHg7IGxpbmUtaGVpZ2h0OjEuNTsKICAtd2Via2l0LWZvbnQtc21vb3RoaW5nOmFudGlhbGlhc2VkOyBvdmVyc2Nyb2xsLWJlaGF2aW9yLXk6bm9uZTsKICAtd2Via2l0LXRleHQtc2l6ZS1hZGp1c3Q6MTAwJTsKfQoubnVte2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtcztmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQpidXR0b257Zm9udC1mYW1pbHk6aW5oZXJpdDtjb2xvcjppbmhlcml0O2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtjdXJzb3I6cG9pbnRlcjt0b3VjaC1hY3Rpb246bWFuaXB1bGF0aW9uO3VzZXItc2VsZWN0Om5vbmU7LXdlYmtpdC11c2VyLXNlbGVjdDpub25lfQppbnB1dCxzZWxlY3QsdGV4dGFyZWF7Zm9udC1mYW1pbHk6aW5oZXJpdDtjb2xvcjp2YXIoLS10eHQpO2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6MTFweCAxM3B4O2ZvbnQtc2l6ZToxNXB4O3dpZHRoOjEwMCU7b3V0bGluZTpub25lO3RyYW5zaXRpb246Ym9yZGVyLWNvbG9yIC4ycyxib3gtc2hhZG93IC4yczstd2Via2l0LWFwcGVhcmFuY2U6bm9uZTthcHBlYXJhbmNlOm5vbmV9CmlucHV0OmZvY3VzLHNlbGVjdDpmb2N1cyx0ZXh0YXJlYTpmb2N1c3tib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2JveC1zaGFkb3c6MCAwIDAgM3B4IHZhcigtLWJyYW5kU29mdCl9CmlucHV0OjpwbGFjZWhvbGRlcix0ZXh0YXJlYTo6cGxhY2Vob2xkZXJ7Y29sb3I6dmFyKC0tdHh0Myl9CnN2Z3tkaXNwbGF5OmJsb2NrfQo6OnNlbGVjdGlvbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Cjo6LXdlYmtpdC1zY3JvbGxiYXJ7d2lkdGg6MDtoZWlnaHQ6MH0KCi8qID09PT09PT09PT09PSBhcHAgc2hlbGwgPT09PT09PT09PT09ICovCiNhcHB7bWluLWhlaWdodDoxMDAlO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW59Ci5iZy1nbG93e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4OjA7CiAgYmFja2dyb3VuZDoKICAgIHJhZGlhbC1ncmFkaWVudCg1MiUgMzglIGF0IDEyJSAtNiUsIHJnYmEoNDMsMjEyLDI0MiwuMTQpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDQ2JSAzNCUgYXQgOTIlIDYlLCByZ2JhKDE0LDE0MywxNzgsLjEyKSwgdHJhbnNwYXJlbnQgNjIlKSwKICAgIHJhZGlhbC1ncmFkaWVudCg2MCUgNDAlIGF0IDUwJSAxMTAlLCByZ2JhKDEyNCwxMDcsMjQwLC4wOCksIHRyYW5zcGFyZW50IDY1JSk7Cn0KaGVhZGVyLmFwcC1oZWFkZXJ7CiAgcG9zaXRpb246c3RpY2t5O3RvcDowO3otaW5kZXg6NjA7CiAgcGFkZGluZzpjYWxjKDEycHggKyB2YXIoLS1zYWZlLXQpKSAxOHB4IDEycHg7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC43OCk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyMnB4KSBzYXR1cmF0ZSgxLjUpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7CiAgYm9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDkpOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7Cn0KLmJyYW5kLW1hcmt7d2lkdGg6MzhweDtoZWlnaHQ6MzhweDtib3JkZXItcmFkaXVzOjEycHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC1zaHJpbms6MDtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4zNSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4yNSl9Ci5icmFuZC1tYXJrIHN2Z3t3aWR0aDoyMnB4O2hlaWdodDoyMnB4fQouYnJhbmQtdHh0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmJyYW5kLXR4dCBoMXtmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjJweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci5icmFuZC10eHQgcHtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjFweH0KLnZlci1jaGlwe2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjIyKTtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo2cHg7bGV0dGVyLXNwYWNpbmc6LjRweH0KLmhlYWQtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC1zaHJpbms6MH0KLmljb24tYnRue3dpZHRoOjM2cHg7aGVpZ2h0OjM2cHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE4cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGNvbG9yIC4yc30KLmljb24tYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouaWNvbi1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9Ci5pY29uLWJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmNvdW50LWNoaXB7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2hlaWdodDozNnB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTFweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21pbi13aWR0aDo5NnB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouY291bnQtY2hpcC5vbntib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC40KTtjb2xvcjp2YXIoLS1icmFuZCk7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQouY291bnQtcmluZ3t3aWR0aDoxNHB4O2hlaWdodDoxNHB4O3Bvc2l0aW9uOnJlbGF0aXZlO2ZsZXgtc2hyaW5rOjB9Ci5jb3VudC1yaW5nIHN2Z3t0cmFuc2Zvcm06cm90YXRlKC05MGRlZyk7d2lkdGg6MTRweDtoZWlnaHQ6MTRweH0KLmNvdW50LXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xOCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyfQouY291bnQtcmluZyAuYXJje3N0cm9rZTp2YXIoLS1icmFuZCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjVzIGxpbmVhcn0KCm1haW57ZmxleDoxO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTtwYWRkaW5nOjE0cHggMTZweCBjYWxjKDE1MHB4ICsgdmFyKC0tc2FmZS1iKSl9CgovKiA9PT09PT09PT09PT0gcHVsbCB0byByZWZyZXNoID09PT09PT09PT09PSAqLwoucHRyLXdyYXB7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufQoucHRyLWluZGljYXRvcntoZWlnaHQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7b3ZlcmZsb3c6aGlkZGVuO3RyYW5zaXRpb246aGVpZ2h0IC4zcyB2YXIoLS1lYXNlKTtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDB9Ci5wdHItaW5kaWNhdG9yIC5zcGlubmVye3dpZHRoOjIwcHg7aGVpZ2h0OjIwcHg7bWFyZ2luLXJpZ2h0OjhweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItdG9wLWNvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItcmFkaXVzOjUwJTthbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoucHRyLWluZGljYXRvci5wdWxsaW5nIC5zcGlubmVye2FuaW1hdGlvbjpub25lO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpfQpAa2V5ZnJhbWVzIHNwaW57dG97dHJhbnNmb3JtOnJvdGF0ZSgzNjBkZWcpfX0KCi8qID09PT09PT09PT09PSBoZXJvIHN1bW1hcnkgPT09PT09PT09PT09ICovCi5oZXJvewogIHBvc2l0aW9uOnJlbGF0aXZlO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7cGFkZGluZzoxOHB4IDE4cHggMTZweDttYXJnaW4tYm90dG9tOjE2cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE2MGRlZyxyZ2JhKDQzLDIxMiwyNDIsLjE0KSxyZ2JhKDE0LDE0MywxNzgsLjA1KSA1NSUsdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpOwogIGJvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4xNik7Cn0KLmhlcm86OmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6LTYwcHg7dG9wOi03MHB4O3dpZHRoOjIyMHB4O2hlaWdodDoyMjBweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudChjaXJjbGUscmdiYSg0MywyMTIsMjQyLC4xNiksdHJhbnNwYXJlbnQgNjUlKTtwb2ludGVyLWV2ZW50czpub25lfQouaGVyby10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtZW5kO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMnB4fQouaGVyby1zY29yZSAubGJse2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDtsZXR0ZXItc3BhY2luZzoxcHh9Ci5oZXJvLXNjb3JlIC52YWx7Zm9udC1zaXplOjM4cHg7Zm9udC13ZWlnaHQ6OTAwO2xpbmUtaGVpZ2h0OjEuMTU7bGV0dGVyLXNwYWNpbmc6LS41cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTstd2Via2l0LWJhY2tncm91bmQtY2xpcDp0ZXh0O2JhY2tncm91bmQtY2xpcDp0ZXh0O2NvbG9yOnRyYW5zcGFyZW50O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5oZXJvLXNjb3JlIC52YWwgc21hbGx7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouaGVyby1yaWdodHt0ZXh0LWFsaWduOnJpZ2h0O2ZsZXgtc2hyaW5rOjB9Ci5oZXJvLXJpZ2h0IC5iaWd7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLW9rKX0KLmhlcm8tcmlnaHQgLmJpZyBzcGFue2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhlcm8tcmlnaHQgLnN1Yntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweH0KLmhlcm8tc3RhdHN7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTRweH0KLmhzdGF0e2ZsZXg6MTtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6OXB4IDEycHh9Ci5oc3RhdCAudntmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhzdGF0IC5se2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmhzdGF0LmFtYmVyIC52e2NvbG9yOnZhcigtLXdhcm4pfSAuaHN0YXQuY3lhbiAudntjb2xvcjp2YXIoLS1icmFuZCl9IC5oc3RhdC5ncmVlbiAudntjb2xvcjp2YXIoLS1vayl9CgovKiA9PT09PT09PT09PT0gYnV0dG9ucyAmIGNoaXBzID09PT09PT09PT09PSAqLwouZmFiewogIHBvc2l0aW9uOmZpeGVkO3JpZ2h0OjE2cHg7Ym90dG9tOmNhbGMoMTAwcHggKyB2YXIoLS1zYWZlLWIpKTt6LWluZGV4OjUwOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtoZWlnaHQ6NDZweDtwYWRkaW5nOjAgMTZweDtib3JkZXItcmFkaXVzOjIzcHg7CiAgYmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouM3B4OwogIGJveC1zaGFkb3c6MCAxMHB4IDI4cHggcmdiYSgxNCwxNDMsMTc4LC40NSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4zKTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMnMgdmFyKC0tc3ByaW5nKSxib3gtc2hhZG93IC4yczthbmltYXRpb246ZmFiLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGg7Cn0KLmZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5mYWIgc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9CkBrZXlmcmFtZXMgZmFiLWlue2Zyb217dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMjRweCk7b3BhY2l0eTowfXRve3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApO29wYWNpdHk6MX19Ci5idG57CiAgZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6NnB4O2hlaWdodDo0MHB4O3BhZGRpbmc6MCAxOHB4O2JvcmRlci1yYWRpdXM6MTNweDsKICBmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDA7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLXR4dCk7CiAgdHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnM7Cn0KLmJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Nil9Ci5idG4ucHJpbWFyeXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Ym9yZGVyOm5vbmV9Ci5idG4uZ2hvc3R7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS10eHQyKX0KLmJ0bi5kYW5nZXJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5idG4uc217aGVpZ2h0OjMycHg7cGFkZGluZzowIDEycHg7Zm9udC1zaXplOjEycHg7Ym9yZGVyLXJhZGl1czoxMHB4fQouYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmNoaXB7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgMTJweDtib3JkZXItcmFkaXVzOjE1cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci5jaGlwOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmNoaXAub257YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jaGlwIC5kb3R7d2lkdGg6NnB4O2hlaWdodDo2cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpjdXJyZW50Q29sb3J9Ci5waWxse2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI0cHg7cGFkZGluZzowIDEwcHg7Ym9yZGVyLXJhZGl1czoxMnB4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtmbGV4LXNocmluazowfQoucGlsbC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoucGlsbC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnBpbGwuY3lhbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpfQoucGlsbC5ncmF5e2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO2NvbG9yOnZhcigtLXR4dDIpfQoucGlsbC52aW97YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQoucGlsbC5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm5Tb2Z0KTtjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSBhY2NvdW50IGNhcmRzID09PT09PT09PT09PSAqLwouc2VjdGlvbi10aXRsZXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo0cHggMnB4IDEycHg7bGV0dGVyLXNwYWNpbmc6LjVweH0KLnNlY3Rpb24tdGl0bGUgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tYnJhbmQpfQouYWNjLWNhcmR7CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O292ZXJmbG93OmhpZGRlbjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgxNDYsMTcwLDIwNSwuMDYpLHJnYmEoMTQ2LDE3MCwyMDUsLjAzKSksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTsKICBhbmltYXRpb246Y2FyZC1pbiAuNDVzIHZhcigtLWVhc2UpIGJvdGg7CiAgdHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjJzIHZhcigtLWVhc2UpOwp9Ci5hY2MtY2FyZC5lcnJvcntib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuNCk7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHJnYmEoMjQ5LDExMiwxMDYsLjA3KSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCl9CkBrZXlmcmFtZXMgY2FyZC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxNHB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQouYWNjLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTFweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5hdmF0YXJ7d2lkdGg6NDJweDtoZWlnaHQ6NDJweDtib3JkZXItcmFkaXVzOjEzcHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtc2l6ZToxN3B4O2NvbG9yOiMwNDEyMUM7ZmxleC1zaHJpbms6MDtib3gtc2hhZG93OjAgNHB4IDE0cHggcmdiYSgxNCwxNDMsMTc4LC4zKX0KLmF2YXRhci52aW97YmFja2dyb3VuZDp2YXIoLS1ncmFkLXZpbyk7Y29sb3I6IzE0MEYyRTtib3gtc2hhZG93OjAgNHB4IDE0cHggcmdiYSgxMjQsMTA3LDI0MCwuMyl9Ci5hY2MtaW5mb3tmbGV4OjE7bWluLXdpZHRoOjB9Ci5hY2MtbmFtZXtmb250LXNpemU6MTVweDtmb250LXdlaWdodDo4MDA7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfQouYWNjLXN1Yntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjFweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsU0ZNb25vLVJlZ3VsYXIsTWVubG8sbW9ub3NwYWNlfQouYWNjLWFjdGlvbnN7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2ZsZXgtc2hyaW5rOjB9Ci5hY2MtZXJye2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLWVycik7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzo4cHggMTFweDttYXJnaW4tYm90dG9tOjEycHg7Zm9udC13ZWlnaHQ6NjAwfQoua3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo4cHg7bWFyZ2luLWJvdHRvbToxNHB4fQoua3Bpe2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6OXB4IDJweDt0ZXh0LWFsaWduOmNlbnRlcn0KLmtwaSAudntmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIjtsaW5lLWhlaWdodDoxLjJ9Ci5rcGkgLmx7Zm9udC1zaXplOjkuNXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmtwaS5jMSAudntjb2xvcjp2YXIoLS10eHQpfSAua3BpLmMyIC52e2NvbG9yOnZhcigtLW9rKX0gLmtwaS5jMyAudntjb2xvcjp2YXIoLS1icmFuZCl9IC5rcGkuYzQgLnZ7Y29sb3I6dmFyKC0tdmlvKX0KLmJsaW5ke21hcmdpbi1ib3R0b206MTRweH0KLmJsaW5kLXRvcHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tYm90dG9tOjZweH0KLmJsaW5kLXRvcCAucntjb2xvcjp2YXIoLS12aW8pO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5ibGluZC1iYXJ7aGVpZ2h0OjE0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xKTtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJsaW5kLWZpbGx7aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkLXZpbyk7dHJhbnNpdGlvbjp3aWR0aCAuN3MgdmFyKC0tZWFzZSk7Ym94LXNoYWRvdzowIDAgMTJweCByZ2JhKDEyNCwxMDcsMjQwLC41KX0KLndlZWt7bWFyZ2luLWJvdHRvbTo0cHh9Ci53ZWVrLXRvcHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tYm90dG9tOjdweH0KLndlZWstZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmRheXthc3BlY3QtcmF0aW86MTtib3JkZXItcmFkaXVzOjlweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDoxcHg7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZGF5IC5ke2ZvbnQtc2l6ZTo5cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO2xpbmUtaGVpZ2h0OjF9Ci5kYXkgLm17Zm9udC1zaXplOjhweDtsaW5lLWhlaWdodDoxfQouZGF5Lm9re2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4zNSl9Ci5kYXkub2sgLmR7Y29sb3I6dmFyKC0tYnJhbmQpfQouZGF5LnRvZGF5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Ym9yZGVyOm5vbmU7Ym94LXNoYWRvdzowIDRweCAxMnB4IHJnYmEoMTQsMTQzLDE3OCwuNCl9Ci5kYXkudG9kYXkgLmR7Y29sb3I6IzA0MTIxQ30KLmRheS50b2RheSAubXtjb2xvcjpyZ2JhKDQsMTgsMjgsLjcpfQoKLyogPT09PT09PT09PT09IHZlaGljbGUgc2VjdGlvbiA9PT09PT09PT09PT0gKi8KLnZlaGljbGV7CiAgbWFyZ2luLXRvcDoxNHB4O3BhZGRpbmctdG9wOjE0cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtjdXJzb3I6cG9pbnRlcjsKfQoudmVoaWNsZS10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDttYXJnaW4tYm90dG9tOjEzcHh9Ci52ZWhpY2xlLXJpbmd7cG9zaXRpb246cmVsYXRpdmU7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDtmbGV4LXNocmluazowfQoudmVoaWNsZS1yaW5nIHN2Z3t3aWR0aDo3NHB4O2hlaWdodDo3NHB4O3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKX0KLnZlaGljbGUtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE0KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjV9Ci52ZWhpY2xlLXJpbmcgLmFyY3tmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuOHMgdmFyKC0tZWFzZSksc3Ryb2tlIC41c30KLnZlaGljbGUtcmluZyAucGN0e3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmVoaWNsZS1tZXRhe2ZsZXg6MTttaW4td2lkdGg6MH0KLnZlaGljbGUtbmFtZXtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfQoudmVoaWNsZS12aW57Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoycHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLnZpbi1zaG93e2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLWxlZnQ6NHB4O3BhZGRpbmc6MXB4IDZweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci52ZWhpY2xlLWJhZGdlc3tkaXNwbGF5OmZsZXg7Z2FwOjVweDttYXJnaW4tdG9wOjdweDtmbGV4LXdyYXA6d3JhcH0KLnZzdGF0LXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjZweDtmbGV4LXdyYXA6d3JhcDttYXJnaW4tYm90dG9tOjEycHh9Ci52c3RhdHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDoyNnB4O3BhZGRpbmc6MCAxMXB4O2JvcmRlci1yYWRpdXM6MTNweDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDB9Ci52c3RhdCBzdmd7d2lkdGg6MTJweDtoZWlnaHQ6MTJweH0KLnZzdGF0Lm9ue2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci52c3RhdC5vZmZ7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xKTtjb2xvcjp2YXIoLS10eHQyKX0KLnZzdGF0LmxvY2tlZHtiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycil9Ci52c3RhdC51bmxvY2tlZHtiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQuc2VhdHtiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5jaGFyZ2UtYmFubmVye2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjlweDtiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDYxLDIyMCwxNTEsLjI1KTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo5cHggMTJweDttYXJnaW4tYm90dG9tOjEycHh9Ci5jaGFyZ2UtYmFubmVyIHN2Z3t3aWR0aDoxNXB4O2hlaWdodDoxNXB4O2NvbG9yOnZhcigtLW9rKTtmbGV4LXNocmluazowfQouY2hhcmdlLWJhbm5lciAuY3R7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLW9rKX0KLmNoYXJnZS1iYW5uZXIgLmNle2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLW9rKTtvcGFjaXR5Oi44NTttYXJnaW4tbGVmdDphdXRvO2JhY2tncm91bmQ6cmdiYSg2MSwyMjAsMTUxLC4xNSk7cGFkZGluZzoycHggOXB4O2JvcmRlci1yYWRpdXM6MTBweH0KLnZrcGktZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjdweDttYXJnaW4tYm90dG9tOjEycHh9Ci52a3Bpe2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OHB4IDJweDt0ZXh0LWFsaWduOmNlbnRlcn0KLnZrcGkgLnZ7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci52a3BpIC5se2ZvbnQtc2l6ZTo5cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi10b3A6MnB4fQouYmF0dC10cmFja3toZWlnaHQ6OXB4O2JvcmRlci1yYWRpdXM6NXB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbi1ib3R0b206MTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouYmF0dC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6NXB4O3RyYW5zaXRpb246d2lkdGggLjhzIHZhcigtLWVhc2UpLGJhY2tncm91bmQgLjVzO2JveC1zaGFkb3c6MCAwIDEwcHggY3VycmVudENvbG9yfQoubWV0YS1yb3d7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5tZXRhLWl0ZW17ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OXB4O3BhZGRpbmc6NXB4IDlweDtmb250LXdlaWdodDo2MDB9Ci5tZXRhLWl0ZW0gc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoubWV0YS1pdGVtIGJ7Y29sb3I6dmFyKC0tdHh0KX0KLnZlaGljbGUtYWRkcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWFyZ2luLXRvcDo0cHg7bWFyZ2luLWJvdHRvbToxMHB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpfQoudmVoaWNsZS1hZGRyIC5hdHtmbGV4OjE7bWluLXdpZHRoOjA7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfQoudmVoaWNsZS1hZGRyIHN2Z3t3aWR0aDoxM3B4O2hlaWdodDoxM3B4O2NvbG9yOnZhcigtLXdhcm4pO2ZsZXgtc2hyaW5rOjB9Ci5tYXAtYnRue2hlaWdodDoyNnB4O3BhZGRpbmc6MCAxMXB4O2JvcmRlci1yYWRpdXM6MTNweDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMyk7ZmxleC1zaHJpbms6MDt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci5tYXAtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm1hcC1idG46ZGlzYWJsZWR7b3BhY2l0eTouNDU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg1LDFmcik7Z2FwOjZweDtib3JkZXItdG9wOjFweCBkYXNoZWQgdmFyKC0tbGluZTIpO3BhZGRpbmctdG9wOjEycHh9Ci5jdHJsLWJ0bntkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O3BhZGRpbmc6MTBweCAycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTAuNXB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4ycyxjb2xvciAuMnN9Ci5jdHJsLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweDtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOmNvbG9yIC4yc30KLmN0cmwtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkyKX0KLmN0cmwtYnRuLnVubG9ja3tib3JkZXItY29sb3I6cmdiYSg2MSwyMjAsMTUxLC4zKTtjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi51bmxvY2sgc3Zne2NvbG9yOnZhcigtLW9rKX0KLmN0cmwtYnRuLmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjMpO2NvbG9yOnZhcigtLWVycil9Ci5jdHJsLWJ0bi5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY3RybC1idG4uYnVzeSBzdmd7YW5pbWF0aW9uOnNwaW4gLjhzIGxpbmVhciBpbmZpbml0ZX0KLm5vLXZlaGljbGV7cGFkZGluZzoxNHB4O2JvcmRlci1yYWRpdXM6MTRweDtiYWNrZ3JvdW5kOnZhcigtLXdhcm5Tb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMjUpO2NvbG9yOnZhcigtLXdhcm4pO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMDt0ZXh0LWFsaWduOmNlbnRlcn0KCi8qID09PT09PT09PT09PSBlbXB0eSAmIHNrZWxldG9uID09PT09PT09PT09PSAqLwouZW1wdHl7cGFkZGluZzo3MHB4IDI2cHg7dGV4dC1hbGlnbjpjZW50ZXI7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5lbXB0eSAuZS1pY29ue3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7bWFyZ2luOjAgYXV0byAxOHB4O2JvcmRlci1yYWRpdXM6MjRweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpfQouZW1wdHkgLmUtaWNvbiBzdmd7d2lkdGg6MzRweDtoZWlnaHQ6MzRweH0KLmVtcHR5IGgze2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmVtcHR5IHB7Zm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21heC13aWR0aDozMDBweDttYXJnaW46MCBhdXRvIDIwcHh9Ci5za3tiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMDBkZWcscmdiYSgxNDYsMTcwLDIwNSwuMDYpIDQwJSxyZ2JhKDE0NiwxNzAsMjA1LC4xMikgNTAlLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA2MCUpO2JhY2tncm91bmQtc2l6ZToyMDAlIDEwMCU7YW5pbWF0aW9uOnNrIDEuMnMgbGluZWFyIGluZmluaXRlO2JvcmRlci1yYWRpdXM6MTBweH0KQGtleWZyYW1lcyBza3t0b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOi0yMDAlIDB9fQouc2stY2FyZHtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7cGFkZGluZzoxNnB4O21hcmdpbi1ib3R0b206MTRweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpfQouc2stbGluZXtoZWlnaHQ6MTNweDttYXJnaW4tYm90dG9tOjEwcHh9LnNrLWxpbmUudzQwe3dpZHRoOjQwJX0uc2stbGluZS53NjB7d2lkdGg6NjAlfS5zay1saW5lLnc4MHt3aWR0aDo4MCV9Ci5zay1yb3d7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo4cHg7bWFyZ2luOjE0cHggMH0KLnNrLWNlbGx7aGVpZ2h0OjUycHg7Ym9yZGVyLXJhZGl1czoxMnB4fQouc2stYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O21hcmdpbi10b3A6MTJweH0KCi8qID09PT09PT09PT09PSBsb2dzID09PT09PT09PT09PSAqLwoubG9nLXBhbmVse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmxvZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNHB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5sb2ctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQoubG9nLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Y29sb3I6dmFyKC0tdmlvKX0KLmxvZy1maWx0ZXJze2Rpc3BsYXk6ZmxleDtnYXA6NnB4fQoubG9nLWxpc3R7bWF4LWhlaWdodDpjYWxjKDEwMHZoIC0gMjYwcHgpO292ZXJmbG93LXk6YXV0bzstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmxvZy1pdGVte3BhZGRpbmc6MTJweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA3KTthbmltYXRpb246Y2FyZC1pbiAuM3MgdmFyKC0tZWFzZSkgYm90aH0KLmxvZy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQoubG9nLXRpbWV7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLWJvdHRvbTozcHg7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmxvZy1tYWlue2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXdyYXA6d3JhcDtmb250LXNpemU6MTNweH0KLmxvZy11c2Vye2ZvbnQtd2VpZ2h0OjgwMH0KLmxvZy1yZXN7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLW9rKX0KLmxvZy1yZXMuZXJye2NvbG9yOnZhcigtLWVycil9Ci5sb2ctc3RlcHN7bWFyZ2luLXRvcDo2cHg7Zm9udC1zaXplOjExLjVweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZy1sZWZ0OjJweH0KLmxvZy1zdGVwcyBpe2ZvbnQtc3R5bGU6bm9ybWFsO2NvbG9yOnZhcigtLWJyYW5kKTttYXJnaW4tcmlnaHQ6NXB4fQoubG9nLWVtcHR5e3BhZGRpbmc6NTBweCAyMHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4fQoKLyogPT09PT09PT09PT09IGNvbmZpZyA9PT09PT09PT09PT0gKi8KLmNmZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTttYXJnaW4tYm90dG9tOjE2cHg7b3ZlcmZsb3c6aGlkZGVuO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouY2ZnLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6MTBweDtwYWRkaW5nOjE1cHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmNmZy1oZWFkIGgze2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5jZmctaGVhZCBoMyBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLmNmZy1oZWFkIC5iYXJ7d2lkdGg6M3B4O2hlaWdodDoxNXB4O2JvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6dmFyKC0tYnJhbmQpO2ZsZXgtc2hyaW5rOjB9Ci5jZmctaGVhZCAuYmFyLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2Fybil9IC5jZmctaGVhZCAuYmFyLmdyZWVue2JhY2tncm91bmQ6dmFyKC0tb2spfSAuY2ZnLWhlYWQgLmJhci52aW97YmFja2dyb3VuZDp2YXIoLS12aW8pfQouY2ZnLWJvZHl7cGFkZGluZzoxNnB4fQouZm9ybS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTJweH0KLmYtaXRlbXttaW4td2lkdGg6MH0KLmYtaXRlbS5mdWxse2dyaWQtY29sdW1uOjEvLTF9Ci5mLWl0ZW0gbGFiZWx7ZGlzcGxheTpibG9jaztmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5mLWl0ZW0gLmhpbnR7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjVweDtsaW5lLWhlaWdodDoxLjZ9Ci5mLWl0ZW0gLmhpbnQgY29kZXtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEyKTtwYWRkaW5nOjFweCA1cHg7Ym9yZGVyLXJhZGl1czo1cHg7Zm9udC1zaXplOjEwcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZX0KLnN3aXRjaHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4O3BhZGRpbmc6MTBweCAxMnB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2N1cnNvcjpwb2ludGVyO3RyYW5zaXRpb246Ym9yZGVyLWNvbG9yIC4yc30KLnN3aXRjaDphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45OCl9Ci5zd2l0Y2ggLmxibHtmb250LXNpemU6MTIuNXB4O2ZvbnQtd2VpZ2h0OjYwMDtmbGV4OjF9Ci5zd2l0Y2ggLnNje2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpfQouc3d7cG9zaXRpb246cmVsYXRpdmU7d2lkdGg6NDRweDtoZWlnaHQ6MjZweDtib3JkZXItcmFkaXVzOjEzcHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4yKTt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjI1cyB2YXIoLS1lYXNlKTtmbGV4LXNocmluazowfQouc3c6OmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7dG9wOjJweDtsZWZ0OjJweDt3aWR0aDoyMnB4O2hlaWdodDoyMnB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6I2ZmZjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMjVzIHZhcigtLXNwcmluZyk7Ym94LXNoYWRvdzowIDJweCA2cHggcmdiYSgwLDAsMCwuMzUpfQouc3dpdGNoIGlucHV0e2Rpc3BsYXk6bm9uZX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zd3tiYWNrZ3JvdW5kOnZhcigtLWdyYWQpfQouc3dpdGNoIGlucHV0OmNoZWNrZWQrLnN3OjphZnRlcnt0cmFuc2Zvcm06dHJhbnNsYXRlWCgxOHB4KX0KLmFjYy1lZGl0e2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE2cHg7cGFkZGluZzoxNHB4O21hcmdpbi1ib3R0b206MTJweH0KLmFjYy1lZGl0LWhlYWR7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC10aXRsZXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouYWNjLWVkaXQtdGl0bGUgLm57d2lkdGg6MjRweDtoZWlnaHQ6MjRweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo5MDB9Ci5hY2MtZWRpdC1oZWFkIC5hY3Rze2Rpc3BsYXk6ZmxleDtnYXA6NnB4fQouYnRuLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNnB4O2ZsZXgtd3JhcDp3cmFwfQouYnRuLXJvdyAuYnRue2ZsZXg6MTttaW4td2lkdGg6MTIwcHh9Ci5jZmctbm90ZXtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuNztwYWRkaW5nOjEycHggMTRweDtiYWNrZ3JvdW5kOnJnYmEoMjQ3LDE4NSw4NSwuMDcpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyNDcsMTg1LDg1LC4xOCk7Ym9yZGVyLXJhZGl1czoxMnB4O21hcmdpbi10b3A6MTJweH0KLmNmZy1ub3RlIGJ7Y29sb3I6dmFyKC0td2Fybil9CgovKiA9PT09PT09PT09PT0gdGFiYmFyID09PT09PT09PT09PSAqLwpuYXYudGFiYmFyewogIHBvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO3otaW5kZXg6NjA7CiAgZGlzcGxheTpmbGV4O3BhZGRpbmc6OHB4IDEwcHggY2FsYyg4cHggKyB2YXIoLS1zYWZlLWIpKTsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjgyKTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjRweCkgc2F0dXJhdGUoMS42KTsKICBib3JkZXItdG9wOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4xKTsKfQoudGFie2ZsZXg6MTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6M3B4O3BhZGRpbmc6NnB4IDA7Ym9yZGVyLXJhZGl1czoxNHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDt0cmFuc2l0aW9uOmNvbG9yIC4ycyx0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoudGFiIHN2Z3t3aWR0aDoyMnB4O2hlaWdodDoyMnB4fQoudGFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQoudGFiLm9ue2NvbG9yOnZhcigtLWJyYW5kKX0KLnRhYiAudC1pbmR7d2lkdGg6MTRweDtoZWlnaHQ6M3B4O2JvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXN9Ci50YWIub24gLnQtaW5ke2JhY2tncm91bmQ6dmFyKC0tYnJhbmQpfQoKLyogPT09PT09PT09PT09IHNoZWV0cyAmIHRvYXN0ID09PT09PT09PT09PSAqLwouc2hlZXQtYmFja2Ryb3B7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjEwMDtiYWNrZ3JvdW5kOnJnYmEoNCw4LDE4LC41NSk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDZweCk7b3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4zcyB2YXIoLS1lYXNlKX0KLnNoZWV0LWJhY2tkcm9wLnNob3d7b3BhY2l0eToxO3BvaW50ZXItZXZlbnRzOmF1dG99Ci5zaGVldHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjEwMTttYXgtaGVpZ2h0Ojg2dmg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcsdmFyKC0tY2FyZDIpLHZhcigtLWJnMikpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci1ib3R0b206bm9uZTsKICBib3JkZXItcmFkaXVzOjI2cHggMjZweCAwIDA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTA0JSk7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjM4cyB2YXIoLS1zcHJpbmcpOwogIGJveC1zaGFkb3c6MCAtMThweCA1MHB4IHJnYmEoMCwwLDAsLjUpfQouc2hlZXQuc2hvd3t0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKX0KLnNoZWV0LWdyYWJ7d2lkdGg6MzhweDtoZWlnaHQ6NHB4O2JvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMyk7bWFyZ2luOjEwcHggYXV0byA0cHg7ZmxleC1zaHJpbms6MH0KLnNoZWV0LWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjZweCAyMHB4IDEycHh9Ci5zaGVldC1oZWFkIGgze2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHh9Ci5zaGVldC1oZWFkIGgzIHN2Z3t3aWR0aDoxOHB4O2hlaWdodDoxOHB4fQouc2hlZXQtY2xvc2V7d2lkdGg6MzJweDtoZWlnaHQ6MzJweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKX0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+CjxkaXYgY2xhc3M9ImJnLWdsb3ciPjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik00IDEzLjVDNCA5LjA4IDcuNTggNS41IDEyIDUuNXM4IDMuNTggOCA4IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTIgMTNsNy41IDUuNSIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNy41IiBjeT0iMTYuNSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIxOSIgcj0iMi4yIiBmaWxsPSIjMDQxMjFDIi8+PC9zdmc+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC10eHQiPgogICAgICA8aDE+5p6B5qC4IFpFRUhPIDxzcGFuIGNsYXNzPSJ2ZXItY2hpcCI+TElURTwvc3Bhbj48L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIDxidXR0b24gY2xhc3M9Imljb24tYnRuIiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiIGFyaWEtbGFiZWw9IuWIt+aWsCI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMSAxLTIuNjQtNi4zNiIvPjxwYXRoIGQ9Ik0yMSAzdjZoLTYiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvaGVhZGVyPgoKICA8bWFpbiBpZD0ibWFpbiI+CiAgICA8ZGl2IGNsYXNzPSJwdHItd3JhcCIgaWQ9InB0cldyYXAiPgogICAgICA8ZGl2IGNsYXNzPSJwdHItaW5kaWNhdG9yIiBpZD0icHRySW5kIj48c3BhbiBjbGFzcz0ic3Bpbm5lciIgaWQ9InB0clNwaW4iPjwvc3Bhbj48c3BhbiBpZD0icHRyVHh0Ij7kuIvmi4nliLfmlrA8L3NwYW4+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InBhZ2VIb21lIj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0icGFnZUxvZ3MiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUNmZyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgPC9tYWluPgoKICA8bmF2IGNsYXNzPSJ0YWJiYXIiPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIG9uIiBkYXRhLXRhYj0iaG9tZSIgb25jbGljaz0ic3dpdGNoVGFiKCdob21lJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMC41IDEyIDNsOSA3LjUiLz48cGF0aCBkPSJNNSA5LjVWMjFoMTRWOS41Ii8+PC9zdmc+CiAgICAgIOmmlumhtTxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJsb2dzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2xvZ3MnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04IDZoMTNNOCAxMmgxM004IDE4aDEzIi8+PHBhdGggZD0iTTMgNmguMDFNMyAxMmguMDFNMyAxOGguMDEiLz48L3N2Zz4KICAgICAg5pel5b+XPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImNmZyIgb25jbGljaz0ic3dpdGNoVGFiKCdjZmcnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz48cGF0aCBkPSJNMTkuNCAxNWExLjY1IDEuNjUgMCAwIDAgLjMzIDEuODJsLjA2LjA2YTIgMiAwIDEgMS0yLjgzIDIuODNsLS4wNi0uMDZhMS42NSAxLjY1IDAgMCAwLTEuODItLjMzIDEuNjUgMS42NSAwIDAgMC0xIDEuNTFWMjFhMiAyIDAgMSAxLTQgMHYtLjA5YTEuNjUgMS42NSAwIDAgMC0xLTEuNTEgMS42NSAxLjY1IDAgMCAwLTEuODIuMzNsLS4wNi4wNmEyIDIgMCAxIDEtMi44My0yLjgzbC4wNi0uMDZhMS42NSAxLjY1IDAgMCAwIC4zMy0xLjgyIDEuNjUgMS42NSAwIDAgMC0xLjUxLTFIM2EyIDIgMCAxIDEgMC00aC4wOWExLjY1IDEuNjUgMCAwIDAgMS41MS0xIDEuNjUgMS42NSAwIDAgMC0uMzMtMS44MmwtLjA2LS4wNmEyIDIgMCAxIDEgMi44My0yLjgzbC4wNi4wNmExLjY1IDEuNjUgMCAwIDAgMS44Mi4zM2guMDFhMS42NSAxLjY1IDAgMCAwIDEtMS41MVYzYTIgMiAwIDEgMSA0IDB2LjA5YTEuNjUgMS42NSAwIDAgMCAxIDEuNTFoLjAxYTEuNjUgMS42NSAwIDAgMCAxLjgyLS4zM2wuMDYtLjA2YTIgMiAwIDEgMSAyLjgzIDIuODNsLS4wNi4wNmExLjY1IDEuNjUgMCAwIDAtLjMzIDEuODJ2LjAxYTEuNjUgMS42NSAwIDAgMCAxLjUxIDFIMjFhMiAyIDAgMSAxIDAgNGgtLjA5YTEuNjUgMS42NSAwIDAgMC0xLjUxIDF6Ii8+PC9zdmc+CiAgICAgIOiuvue9rjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgPC9uYXY+CgogIDxkaXYgY2xhc3M9InNoZWV0LWJhY2tkcm9wIiBpZD0ic2hlZXRCYWNrZHJvcCIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzaGVldCIgaWQ9InNoZWV0Ij4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWdyYWIiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtaGVhZCI+CiAgICAgIDxoMyBpZD0ic2hlZXRUaXRsZSI+PC9oMz4KICAgICAgPGJ1dHRvbiBjbGFzcz0ic2hlZXQtY2xvc2UiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ib2R5IiBpZD0ic2hlZXRCb2R5Ij48L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBpZD0idG9hc3QiIHJvbGU9InN0YXR1cyI+PC9kaXY+CiAgPGRpdiBjbGFzcz0iY29uZmlybS1sYXllciBoaWRkZW4iIGlkPSJjb25maXJtTGF5ZXIiPjwvZGl2Pgo8L2Rpdj4KPHNjcmlwdD4KInVzZSBzdHJpY3QiOwovKiA9PT09PT09PT09PT09PT09PSDluLjph48gPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQVBQX1ZFUlNJT04gPSAidjIuMTQuMyI7CmNvbnN0IEtFWVMgPSB7IGNmZzoiemVlaG9fY2ZnIiwgYWNjb3VudHM6InplZWhvX2FjY291bnRzIiwgbG9nczoiemVlaG9fbG9ncyIgfTsKCi8qID09PT09PT09PT09PT09PT09IOW3peWFt+WHveaVsCA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRVdWlkKCl7Y29uc3QgcD0ieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4IixjPSJhYmNkZWYwMTIzNDU2Nzg5IjtsZXQgcj0iIjtmb3IoY29uc3QgY2ggb2YgcCl7aWYoY2g9PT0ieCJ8fGNoPT09InkiKXtjb25zdCBuPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxNik7cis9KGNoPT09InkiPyhuJjB4Myl8MHg4Om4pLnRvU3RyaW5nKDE2KX1lbHNlIHIrPWNofXJldHVybiByfQpmdW5jdGlvbiBnZXRSYW5kb21DaGFycyhuPTE2KXtjb25zdCBjPSIwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI7bGV0IHI9IiI7Zm9yKGxldCBpPTA7aTxuO2krKylyKz1jLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqYy5sZW5ndGgpKTtyZXR1cm4gcn0KZnVuY3Rpb24gdG9RdWVyeShwPXt9KXtyZXR1cm4gT2JqZWN0LmtleXMocCkuZmlsdGVyKGs9PnBba10hPT11bmRlZmluZWQmJnBba10hPT1udWxsKS5zb3J0KCkubWFwKGs9PmsrIj0iK3Bba10pLmpvaW4oIiYiKX0KZnVuY3Rpb24gY2xlYW5Ub2tlbih0KXtyZXR1cm4gU3RyaW5nKHR8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1lYXJlclxzKy9pLCIiKS5yZXBsYWNlKC9bXHMiJ2BdKy9nLCIiKX0KZnVuY3Rpb24gY2xlYW5CYXJrS2V5KGIpe2xldCBzPVN0cmluZyhifHwiIikudHJpbSgpLnJlcGxhY2UoL15bYkJdYXJrXHMqKGtleSk/XHMqWzrvvJpdXHMqL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpLnRyaW0oKTtyZXR1cm4gcy5yZXBsYWNlKC9cLyskLywiIil9CmZ1bmN0aW9uIG1hc2tWaW4odil7Y29uc3Qgcz1TdHJpbmcodnx8IiIpO2lmKCFzKXJldHVybiIiO2lmKHMubGVuZ3RoPD03KXJldHVybiIqKioqIjtyZXR1cm4gcy5zdWJzdHJpbmcoMCwzKSsiKioqKiIrcy5zdWJzdHJpbmcocy5sZW5ndGgtNCl9CmZ1bmN0aW9uIGRlZXBQaWNrKG9iaixrZXlzLGRlcHRoKXtpZighb2JqfHx0eXBlb2Ygb2JqIT09Im9iamVjdCJ8fChkZXB0aHx8MCk+NSlyZXR1cm4iIjtmb3IoY29uc3QgayBvZiBrZXlzKXtpZihvYmpba10hPT11bmRlZmluZWQmJm9ialtrXSE9PW51bGwmJm9ialtrXSE9PSIiKXJldHVybiBTdHJpbmcob2JqW2tdKX1mb3IoY29uc3QgayBpbiBvYmope2lmKG9ialtrXSYmdHlwZW9mIG9ialtrXT09PSJvYmplY3QiKXtjb25zdCByPWRlZXBQaWNrKG9ialtrXSxrZXlzLChkZXB0aHx8MCkrMSk7aWYocilyZXR1cm4gcn19cmV0dXJuIiJ9CmZ1bmN0aW9uIHBpY2tJb3RQcm9wKGQsaWRlbnRpZnkpe2NvbnN0IGFycj1kJiZkLmlvdFByb3BlcnRpZXM7aWYoQXJyYXkuaXNBcnJheShhcnIpKXtjb25zdCBrZXk9U3RyaW5nKGlkZW50aWZ5KS50b0xvd2VyQ2FzZSgpO2Zvcihjb25zdCBpdCBvZiBhcnIpe2lmKGl0JiZTdHJpbmcoaXQuaWRlbnRpZnl8fCIiKS50b0xvd2VyQ2FzZSgpPT09a2V5JiZpdC52YWx1ZSE9PW51bGwmJml0LnZhbHVlIT09dW5kZWZpbmVkJiZpdC52YWx1ZSE9PSIiKXJldHVybiBTdHJpbmcoaXQudmFsdWUpfX1yZXR1cm4iIn0KZnVuY3Rpb24gZ2V0RGV2aWNlSWRlbnRpZnkoYWNjKXtjb25zdCBzZWVkPVN0cmluZyhhY2MudXNlcklkfHxhY2MudmluTm98fCJ6ZWVoby1kZXZpY2UiKTtsZXQgaD0wO2ZvcihsZXQgaT0wO2k8c2VlZC5sZW5ndGg7aSsrKXtoPSgoaDw8NSktaCtzZWVkLmNoYXJDb2RlQXQoaSkpfDB9cmV0dXJuKE1hdGguYWJzKGgpLnRvU3RyaW5nKDE2KSsiMDAwMDAwMDAwMDAwMDAwMCIpLnNsaWNlKDAsMTYpfQpmdW5jdGlvbiBoYXNWYWxpZENvb3JkKGxhdCxsbmcpe2lmKGxhdD09PSIifHxsYXQ9PT1udWxsfHxsYXQ9PT11bmRlZmluZWR8fGxuZz09PSIifHxsbmc9PT1udWxsfHxsbmc9PT11bmRlZmluZWQpcmV0dXJuIGZhbHNlO2NvbnN0IGxhPU51bWJlcihsYXQpLGxuPU51bWJlcihsbmcpO3JldHVybiBpc0Zpbml0ZShsYSkmJmlzRmluaXRlKGxuKSYmTWF0aC5hYnMobGEpPD05MCYmTWF0aC5hYnMobG4pPD0xODAmJiEobGE9PT0wJiZsbj09PTApfQpmdW5jdGlvbiBub3JtYWxpemVSZWZyZXNoU2VjKHYpe2NvbnN0IG49TnVtYmVyKHYpO2lmKCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4gNjA7cmV0dXJuIE1hdGgubWF4KDE1LE1hdGgubWluKDM2MDAsTWF0aC5yb3VuZChuKSkpfQpmdW5jdGlvbiBlc2Mocyl7cmV0dXJuIFN0cmluZyhzPT1udWxsPyIiOnMpLnJlcGxhY2UoLyYvZywiJmFtcDsiKS5yZXBsYWNlKC88L2csIiZsdDsiKS5yZXBsYWNlKC8+L2csIiZndDsiKS5yZXBsYWNlKC8iL2csIiZxdW90OyIpfQoKLyogPT09PT09PT09PT09PT09PT0gTUQ1ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG1kNSh0LGUpe2Z1bmN0aW9uIG4odCxlKXtyZXR1cm4gdDw8ZXx0Pj4+MzItZX1mdW5jdGlvbiByKHQsZSl7dmFyIG4scixvLGksYTtyZXR1cm4gbz0yMTQ3NDgzNjQ4JnQsaT0yMTQ3NDgzNjQ4JmUsYT0oMTA3Mzc0MTgyMyZ0KSsoMTA3Mzc0MTgyMyZlKSwobj0xMDczNzQxODI0JnQpJihyPTEwNzM3NDE4MjQmZSk/MjE0NzQ4MzY0OF5hXm9eaTpufHI/MTA3Mzc0MTgyNCZhPzMyMjEyMjU0NzJeYV5vXmk6MTA3Mzc0MTgyNF5hXm9eaTphXm9eaX1mdW5jdGlvbiBvKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0JmV8fnQmbn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBpKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0Jm58ZSZ+bn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBhKHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiB0XmVebn0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiB1KHQsZSxvLGksYSx1LGMpe3JldHVybiB0PXIodCxyKHIoZnVuY3Rpb24odCxlLG4pe3JldHVybiBlXih0fH5uKX0oZSxvLGkpLGEpLGMpKSxyKG4odCx1KSxlKX1mdW5jdGlvbiBjKHQpe3ZhciBlLG49IiIscj0iIjtmb3IoZT0wO2U8PTM7ZSsrKW4rPShyPSIwIisodD4+PjgqZSYyNTUpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKHIubGVuZ3RoLTIsMik7cmV0dXJuIG59dmFyIHMsbCxmLHAsZCxoLHYseSxnLG09QXJyYXkoKTtmb3IobT1mdW5jdGlvbih0KXtmb3IodmFyIGUsbj10Lmxlbmd0aCxyPW4rOCxvPTE2Kigoci1yJTY0KS82NCsxKSxpPUFycmF5KG8tMSksYT0wLHU9MDt1PG47KWE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXx0LmNoYXJDb2RlQXQodSk8PGEsdSsrO3JldHVybiBhPXUlNCo4LGlbZT0odS11JTQpLzRdPWlbZV18MTI4PDxhLGlbby0yXT1uPDwzLGlbby0xXT1uPj4+MjksaX0odD1mdW5jdGlvbih0KXt0PXQucmVwbGFjZSgvXHJcbi9nLCJcbiIpO2Zvcih2YXIgZT0iIixuPTA7bjx0Lmxlbmd0aDtuKyspe3ZhciByPXQuY2hhckNvZGVBdChuKTtyPDEyOD9lKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHIpOnI+MTI3JiZyPDIwNDg/KGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NnwxOTIpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUoNjMmcnwxMjgpKTooZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj4xMnwyMjQpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+NiY2M3wxMjgpLGUrPVN0cmluZy5mcm9tQ2hhckNvZGUoNjMmcnwxMjgpKX1yZXR1cm4gZX0odCkpLGg9MTczMjU4NDE5Myx2PTQwMjMyMzM0MTcseT0yNTYyMzgzMTAyLGc9MjcxNzMzODc4LHM9MDtzPG0ubGVuZ3RoO3MrPTE2KWw9aCxmPXYscD15LGQ9ZyxoPW8oaCx2LHksZyxtW3MrMF0sNywzNjE0MDkwMzYwKSxnPW8oZyxoLHYseSxtW3MrMV0sMTIsMzkwNTQwMjcxMCkseT1vKHksZyxoLHYsbVtzKzJdLDE3LDYwNjEwNTgxOSksdj1vKHYseSxnLGgsbVtzKzNdLDIyLDMyNTA0NDE5NjYpLGg9byhoLHYseSxnLG1bcys0XSw3LDQxMTg1NDgzOTkpLGc9byhnLGgsdix5LG1bcys1XSwxMiwxMjAwMDgwNDI2KSx5PW8oeSxnLGgsdixtW3MrNl0sMTcsMjgyMTczNTk1NSksdj1vKHYseSxnLGgsbVtzKzddLDIyLDQyNDkyNjEzMTMpLGg9byhoLHYseSxnLG1bcys4XSw3LDE3NzAwMzU0MTYpLGc9byhnLGgsdix5LG1bcys5XSwxMiwyMzM2NTUyODc5KSx5PW8oeSxnLGgsdixtW3MrMTBdLDE3LDQyOTQ5MjUyMzMpLHY9byh2LHksZyxoLG1bcysxMV0sMjIsMjMwNDU2MzEzNCksaD1vKGgsdix5LGcsbVtzKzEyXSw3LDE4MDQ2MDM2ODIpLGc9byhnLGgsdix5LG1bcysxM10sMTIsNDI1NDYyNjE5NSkseT1vKHksZyxoLHYsbVtzKzE0XSwxNywyNzkyOTY1MDA2KSxoPWkoaCx2PW8odix5LGcsaCxtW3MrMTVdLDIyLDEyMzY1MzUzMjkpLHksZyxtW3MrMV0sNSw0MTI5MTcwNzg2KSxnPWkoZyxoLHYseSxtW3MrNl0sOSwzMjI1NDY1NjY0KSx5PWkoeSxnLGgsdixtW3MrMTFdLDE0LDY0MzcxNzcxMyksdj1pKHYseSxnLGgsbVtzKzBdLDIwLDM5MjEwNjk5OTQpLGg9aShoLHYseSxnLG1bcys1XSw1LDM1OTM0MDg2MDUpLGc9aShnLGgsdix5LG1bcysxMF0sOSwzODAxNjA4MykseT1pKHksZyxoLHYsbVtzKzE1XSwxNCwzNjM0NDg4OTYxKSx2PWkodix5LGcsaCxtW3MrNF0sMjAsMzg4OTQyOTQ0OCksaD1pKGgsdix5LGcsbVtzKzldLDUsNTY4NDQ2NDM4KSxnPWkoZyxoLHYseSxtW3MrMTRdLDksMzI3NTE2MzYwNikseT1pKHksZyxoLHYsbVtzKzNdLDE0LDQxMDc2MDMzMzUpLHY9aSh2LHksZyxoLG1bcys4XSwyMCwxMTYzNTMxNTAxKSxoPWkoaCx2LHksZyxtW3MrMTNdLDUsMjg1MDI4NTgyOSksZz1pKGcsaCx2LHksbVtzKzJdLDksNDI0MzU2MzUxMikseT1pKHksZyxoLHYsbVtzKzddLDE0LDE3MzUzMjg0NzMpLGg9YShoLHY9aSh2LHksZyxoLG1bcysxMl0sMjAsMjM2ODM1OTU2MikseSxnLG1bcys1XSw0LDQyOTQ1ODg3MzgpLGc9YShnLGgsdix5LG1bcys4XSwxMSwyMjcyMzkyODMzKSx5PWEoeSxnLGgsdixtW3MrMTFdLDE2LDE4MzkwMzA1NjIpLHY9YSh2LHksZyxoLG1bcysxNF0sMjMsNDI1OTY1Nzc0MCksaD1hKGgsdix5LGcsbVtzKzFdLDQsMjc2Mzk3NTIzNiksZz1hKGcsaCx2LHksbVtzKzRdLDExLDEyNzI4OTMzNTMpLHk9YSh5LGcsaCx2LG1bcys3XSwxNiw0MTM5NDY5NjY0KSx2PWEodix5LGcsaCxtW3MrMTBdLDIzLDMyMDAyMzY2NTYpLGg9YShoLHYseSxnLG1bcysxM10sNCw2ODEyNzkxNzQpLGc9YShnLGgsdix5LG1bcyswXSwxMSwzOTM2NDMwMDc0KSx5PWEoeSxnLGgsdixtW3MrM10sMTYsMzU3MjQ0NTMxNyksdj1hKHYseSxnLGgsbVtzKzZdLDIzLDc2MDI5MTg5KSxoPWEoaCx2LHksZyxtW3MrOV0sNCwzNjU0NjAyODA5KSxnPWEoZyxoLHYseSxtW3MrMTJdLDExLDM4NzMxNTE0NjEpLHk9YSh5LGcsaCx2LG1bcysxNV0sMTYsNTMwNzQyNTIwKSxoPXUoaCx2PWEodix5LGcsaCxtW3MrMl0sMjMsMzI5OTYyODY0NSkseSxnLG1bcyswXSw2LDQwOTYzMzY0NTIpLGc9dShnLGgsdix5LG1bcys3XSwxMCwxMTI2ODkxNDE1KSx5PXUoeSxnLGgsdixtW3MrMTRdLDE1LDI4Nzg2MTIzOTEpLHY9dSh2LHksZyxoLG1bcys1XSwyMSw0MjM3NTMzMjQxKSxoPXUoaCx2LHksZyxtW3MrMTJdLDYsMTcwMDQ4NTU3MSksZz11KGcsaCx2LHksbVtzKzNdLDEwLDIzOTk5ODA2OTApLHk9dSh5LGcsaCx2LG1bcysxMF0sMTUsNDI5MzkxNTc3Myksdj11KHYseSxnLGgsbVtzKzFdLDIxLDIyNDAwNDQ0OTcpLGg9dShoLHYseSxnLG1bcys4XSw2LDE4NzMzMTMzNTkpLGc9dShnLGgsdix5LG1bcysxNV0sMTAsNDI2NDM1NTU1MikseT11KHksZyxoLHYsbVtzKzZdLDE1LDI3MzQ3Njg5MTYpLHY9dSh2LHksZyxoLG1bcysxM10sMjEsMTMwOTE1MTY0OSksaD11KGgsdix5LGcsbVtzKzRdLDYsNDE0OTQ0NDIyNiksZz11KGcsaCx2LHksbVtzKzExXSwxMCwzMTc0NzU2OTE3KSx5PXUoeSxnLGgsdixtW3MrMl0sMTUsNzE4Nzg3MjU5KSx2PXUodix5LGcsaCxtW3MrOV0sMjEsMzk1MTQ4MTc0NSksaD1yKGgsbCksdj1yKHYsZikseT1yKHkscCksZz1yKGcsZCk7cmV0dXJuIDMyPT1lPyhjKGgpK2ModikrYyh5KStjKGcpKS50b0xvd2VyQ2FzZSgpOihjKHYpK2MoeSkpLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IFNIQTEgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gc2hhMShtc2cpe2Z1bmN0aW9uIHJvdGF0ZV9sZWZ0KG4scyl7dmFyIHQ0PShuPDxzKXwobj4+PigzMi1zKSk7cmV0dXJuIHQ0fTtmdW5jdGlvbiBjdnRfaGV4KHZhbCl7dmFyIHN0cj0nJzt2YXIgaTt2YXIgdjtmb3IoaT03O2k+PTA7aS0tKXt2PSh2YWw+Pj4oaSo0KSkmMHgwZjtzdHIrPXYudG9TdHJpbmcoMTYpfXJldHVybiBzdHJ9O2Z1bmN0aW9uIFV0ZjhFbmNvZGUoc3RyaW5nKXtzdHJpbmc9c3RyaW5nLnJlcGxhY2UoL1xyXG4vZywnXG4nKTt2YXIgdXRmdGV4dD0nJztmb3IodmFyIG49MDtuPHN0cmluZy5sZW5ndGg7bisrKXt2YXIgYz1zdHJpbmcuY2hhckNvZGVBdChuKTtpZihjPDEyOCl7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZShjKX1lbHNlIGlmKChjPjEyNykmJihjPDIwNDgpKXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjPj42KXwxOTIpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpfDEyOCl9ZWxzZXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjPj4xMil8MjI0KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKCgoYz4+NikmNjMpfDEyOCk7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX19cmV0dXJuIHV0ZnRleHR9O3ZhciBibG9ja3N0YXJ0O3ZhciBpLGo7dmFyIFc9bmV3IEFycmF5KDgwKTt2YXIgSDA9MHg2NzQ1MjMwMTt2YXIgSDE9MHhFRkNEQUI4OTt2YXIgSDI9MHg5OEJBRENGRTt2YXIgSDM9MHgxMDMyNTQ3Njt2YXIgSDQ9MHhDM0QyRTFGMDt2YXIgQSxCLEMsRCxFO3ZhciB0ZW1wO21zZz1VdGY4RW5jb2RlKG1zZyk7dmFyIG1zZ19sZW49bXNnLmxlbmd0aDt2YXIgd29yZF9hcnJheT1uZXcgQXJyYXkoKTtmb3IoaT0wO2k8bXNnX2xlbi0zO2krPTQpe2o9bXNnLmNoYXJDb2RlQXQoaSk8PDI0fG1zZy5jaGFyQ29kZUF0KGkrMSk8PDE2fG1zZy5jaGFyQ29kZUF0KGkrMik8PDh8bXNnLmNoYXJDb2RlQXQoaSszKTt3b3JkX2FycmF5LnB1c2goail9c3dpdGNoKG1zZ19sZW4lNCl7Y2FzZSAwOmk9MHgwODAwMDAwMDA7YnJlYWs7Y2FzZSAxOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MjR8MHgwODAwMDAwO2JyZWFrO2Nhc2UgMjppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMik8PDI0fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDE2fDB4MDgwMDA7YnJlYWs7Y2FzZSAzOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0zKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MTZ8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8OHwweDgwO2JyZWFrfXdvcmRfYXJyYXkucHVzaChpKTt3aGlsZSgod29yZF9hcnJheS5sZW5ndGglMTYpIT0xNCl3b3JkX2FycmF5LnB1c2goMCk7d29yZF9hcnJheS5wdXNoKG1zZ19sZW4+Pj4yOSk7d29yZF9hcnJheS5wdXNoKChtc2dfbGVuPDwzKSYweDBmZmZmZmZmZik7Zm9yKGJsb2Nrc3RhcnQ9MDtibG9ja3N0YXJ0PHdvcmRfYXJyYXkubGVuZ3RoO2Jsb2Nrc3RhcnQrPTE2KXtmb3IoaT0wO2k8MTY7aSsrKVdbaV09d29yZF9hcnJheVtibG9ja3N0YXJ0K2ldO2ZvcihpPTE2O2k8PTc5O2krKylXW2ldPXJvdGF0ZV9sZWZ0KFdbaS0zXV5XW2ktOF1eV1tpLTE0XV5XW2ktMTZdLDEpO0E9SDA7Qj1IMTtDPUgyO0Q9SDM7RT1INDtmb3IoaT0wO2k8PTE5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoKEImQyl8KH5CJkQpKStFK1dbaV0rMHg1QTgyNzk5OSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9MjA7aTw9Mzk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKyhCXkNeRCkrRStXW2ldKzB4NkVEOUVCQTEpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTQwO2k8PTU5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoKEImQyl8KEImRCl8KEMmRCkpK0UrV1tpXSsweDhGMUJCQ0RDKSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT02MDtpPD03OTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHhDQTYyQzFENikmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9SDA9KEgwK0EpJjB4MGZmZmZmZmZmO0gxPShIMStCKSYweDBmZmZmZmZmZjtIMj0oSDIrQykmMHgwZmZmZmZmZmY7SDM9KEgzK0QpJjB4MGZmZmZmZmZmO0g0PShINCtFKSYweDBmZmZmZmZmZn12YXIgdGVtcD1jdnRfaGV4KEgwKStjdnRfaGV4KEgxKStjdnRfaGV4KEgyKStjdnRfaGV4KEgzKStjdnRfaGV4KEg0KTtyZXR1cm4gdGVtcC50b0xvd2VyQ2FzZSgpfQovKiA9PT09PT09PT09PT09PT09PSBBRVMtMjU2LUVDQiArIFBLQ1M3ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFFU19TQk9YPW5ldyBVaW50OEFycmF5KFsweDYzLDB4N2MsMHg3NywweDdiLDB4ZjIsMHg2YiwweDZmLDB4YzUsMHgzMCwweDAxLDB4NjcsMHgyYiwweGZlLDB4ZDcsMHhhYiwweDc2LDB4Y2EsMHg4MiwweGM5LDB4N2QsMHhmYSwweDU5LDB4NDcsMHhmMCwweGFkLDB4ZDQsMHhhMiwweGFmLDB4OWMsMHhhNCwweDcyLDB4YzAsMHhiNywweGZkLDB4OTMsMHgyNiwweDM2LDB4M2YsMHhmNywweGNjLDB4MzQsMHhhNSwweGU1LDB4ZjEsMHg3MSwweGQ4LDB4MzEsMHgxNSwweDA0LDB4YzcsMHgyMywweGMzLDB4MTgsMHg5NiwweDA1LDB4OWEsMHgwNywweDEyLDB4ODAsMHhlMiwweGViLDB4MjcsMHhiMiwweDc1LDB4MDksMHg4MywweDJjLDB4MWEsMHgxYiwweDZlLDB4NWEsMHhhMCwweDUyLDB4M2IsMHhkNiwweGIzLDB4MjksMHhlMywweDJmLDB4ODQsMHg1MywweGQxLDB4MDAsMHhlZCwweDIwLDB4ZmMsMHhiMSwweDViLDB4NmEsMHhjYiwweGJlLDB4MzksMHg0YSwweDRjLDB4NTgsMHhjZiwweGQwLDB4ZWYsMHhhYSwweGZiLDB4NDMsMHg0ZCwweDMzLDB4ODUsMHg0NSwweGY5LDB4MDIsMHg3ZiwweDUwLDB4M2MsMHg5ZiwweGE4LDB4NTEsMHhhMywweDQwLDB4OGYsMHg5MiwweDlkLDB4MzgsMHhmNSwweGJjLDB4YjYsMHhkYSwweDIxLDB4MTAsMHhmZiwweGYzLDB4ZDIsMHhjZCwweDBjLDB4MTMsMHhlYywweDVmLDB4OTcsMHg0NCwweDE3LDB4YzQsMHhhNywweDdlLDB4M2QsMHg2NCwweDVkLDB4MTksMHg3MywweDYwLDB4ODEsMHg0ZiwweGRjLDB4MjIsMHgyYSwweDkwLDB4ODgsMHg0NiwweGVlLDB4YjgsMHgxNCwweGRlLDB4NWUsMHgwYiwweGRiLDB4ZTAsMHgzMiwweDNhLDB4MGEsMHg0OSwweDA2LDB4MjQsMHg1YywweGMyLDB4ZDMsMHhhYywweDYyLDB4OTEsMHg5NSwweGU0LDB4NzksMHhlNywweGM4LDB4MzcsMHg2ZCwweDhkLDB4ZDUsMHg0ZSwweGE5LDB4NmMsMHg1NiwweGY0LDB4ZWEsMHg2NSwweDdhLDB4YWUsMHgwOCwweGJhLDB4NzgsMHgyNSwweDJlLDB4MWMsMHhhNiwweGI0LDB4YzYsMHhlOCwweGRkLDB4NzQsMHgxZiwweDRiLDB4YmQsMHg4YiwweDhhLDB4NzAsMHgzZSwweGI1LDB4NjYsMHg0OCwweDAzLDB4ZjYsMHgwZSwweDYxLDB4MzUsMHg1NywweGI5LDB4ODYsMHhjMSwweDFkLDB4OWUsMHhlMSwweGY4LDB4OTgsMHgxMSwweDY5LDB4ZDksMHg4ZSwweDk0LDB4OWIsMHgxZSwweDg3LDB4ZTksMHhjZSwweDU1LDB4MjgsMHhkZiwweDhjLDB4YTEsMHg4OSwweDBkLDB4YmYsMHhlNiwweDQyLDB4NjgsMHg0MSwweDk5LDB4MmQsMHgwZiwweGIwLDB4NTQsMHhiYiwweDE2XSk7CmNvbnN0IEFFU19SQ09OPW5ldyBVaW50OEFycmF5KFsweDAwLDB4MDEsMHgwMiwweDA0LDB4MDgsMHgxMCwweDIwLDB4NDAsMHg4MCwweDFiLDB4MzYsMHg2YywweGQ4LDB4YWIsMHg0ZF0pOwpmdW5jdGlvbiBhZXNHTXVsKGEsYil7bGV0IHA9MDtmb3IobGV0IGk9MDtpPDg7aSsrKXtpZihiJjEpcF49YTtjb25zdCBoaT1hJjB4ODA7YT0oYTw8MSkmMHhmZjtpZihoaSlhXj0weDFiO2I+Pj0xfXJldHVybiBwfQpmdW5jdGlvbiBhZXNLZXlFeHBhbnNpb24yNTYoa2V5KXtjb25zdCBOaz04LE5iPTQsTnI9MTQ7Y29uc3Qgdz1uZXcgVWludDhBcnJheSg0Kk5iKihOcisxKSk7Zm9yKGxldCBpPTA7aTxOayo0O2krKyl3W2ldPWtleVtpXTtmb3IobGV0IGk9Tms7aTxOYiooTnIrMSk7aSsrKXtsZXQgdDA9d1s0KihpLTEpXSx0MT13WzQqKGktMSkrMV0sdDI9d1s0KihpLTEpKzJdLHQzPXdbNCooaS0xKSszXTtpZihpJU5rPT09MCl7Y29uc3QgdG1wPXQwO3QwPUFFU19TQk9YW3QxXV5BRVNfUkNPTltpL05rXTt0MT1BRVNfU0JPWFt0Ml07dDI9QUVTX1NCT1hbdDNdO3QzPUFFU19TQk9YW3RtcF19ZWxzZSBpZihpJU5rPT09NCl7dDA9QUVTX1NCT1hbdDBdO3QxPUFFU19TQk9YW3QxXTt0Mj1BRVNfU0JPWFt0Ml07dDM9QUVTX1NCT1hbdDNdfXdbNCppXT13WzQqKGktTmspXV50MDt3WzQqaSsxXT13WzQqKGktTmspKzFdXnQxO3dbNCppKzJdPXdbNCooaS1OaykrMl1edDI7d1s0KmkrM109d1s0KihpLU5rKSszXV50M31yZXR1cm4gd30KZnVuY3Rpb24gYWVzRW5jcnlwdEJsb2NrKGlucHV0LHcpe2NvbnN0IE5iPTQsTnI9MTQ7Y29uc3Qgcz1uZXcgVWludDhBcnJheSgxNik7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXT1pbnB1dFtpXTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W2ldO2ZvcihsZXQgcm91bmQ9MTtyb3VuZDw9TnI7cm91bmQrKyl7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXT1BRVNfU0JPWFtzW2ldXTtsZXQgdD1zWzFdO3NbMV09c1s1XTtzWzVdPXNbOV07c1s5XT1zWzEzXTtzWzEzXT10O3Q9c1syXTtzWzJdPXNbMTBdO3NbMTBdPXQ7dD1zWzZdO3NbNl09c1sxNF07c1sxNF09dDt0PXNbM107c1szXT1zWzE1XTtzWzE1XT1zWzExXTtzWzExXT1zWzddO3NbN109dDtpZihyb3VuZCE9PU5yKXtmb3IobGV0IGM9MDtjPDQ7YysrKXtjb25zdCBpPTQqYztjb25zdCBhMD1zW2ldLGExPXNbaSsxXSxhMj1zW2krMl0sYTM9c1tpKzNdO3NbaV09YWVzR011bChhMCwyKV5hZXNHTXVsKGExLDMpXmEyXmEzO3NbaSsxXT1hMF5hZXNHTXVsKGExLDIpXmFlc0dNdWwoYTIsMyleYTM7c1tpKzJdPWEwXmExXmFlc0dNdWwoYTIsMileYWVzR011bChhMywzKTtzW2krM109YWVzR011bChhMCwzKV5hMV5hMl5hZXNHTXVsKGEzLDIpfX1jb25zdCBvZmY9cm91bmQqMTY7Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXV49d1tvZmYraV19cmV0dXJuIHN9CmZ1bmN0aW9uIGFlc1V0ZjhCeXRlcyhzdHIpe2NvbnN0IG91dD1bXTtmb3IobGV0IGk9MDtpPHN0ci5sZW5ndGg7aSsrKXtsZXQgYz1zdHIuY2hhckNvZGVBdChpKTtpZihjPDB4ODApb3V0LnB1c2goYyk7ZWxzZSBpZihjPDB4ODAwKW91dC5wdXNoKDB4YzB8KGM+PjYpLDB4ODB8KGMmMHgzZikpO2Vsc2UgaWYoYz49MHhkODAwJiZjPD0weGRiZmYpe2NvbnN0IGMyPXN0ci5jaGFyQ29kZUF0KCsraSk7Yz0weDEwMDAwKygoYy0weGQ4MDApPDwxMCkrKGMyLTB4ZGMwMCk7b3V0LnB1c2goMHhmMHwoYz4+MTgpLDB4ODB8KChjPj4xMikmMHgzZiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfWVsc2Ugb3V0LnB1c2goMHhlMHwoYz4+MTIpLDB4ODB8KChjPj42KSYweDNmKSwweDgwfChjJjB4M2YpKX1yZXR1cm4gbmV3IFVpbnQ4QXJyYXkob3V0KX0KZnVuY3Rpb24gYWVzQnl0ZXNUb0Jhc2U2NChieXRlcyl7Y29uc3QgY2hhcnM9IkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8iO2xldCByZXN1bHQ9IiIsaT0wO2Zvcig7aSsyPGJ5dGVzLmxlbmd0aDtpKz0zKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KXxieXRlc1tpKzJdO3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rY2hhcnNbKG4+PjYpJjYzXStjaGFyc1tuJjYzXX1jb25zdCByZW09Ynl0ZXMubGVuZ3RoLWk7aWYocmVtPT09MSl7Y29uc3Qgbj1ieXRlc1tpXTw8MTY7cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXSsiPT0ifWVsc2UgaWYocmVtPT09Mil7Y29uc3Qgbj0oYnl0ZXNbaV08PDE2KXwoYnl0ZXNbaSsxXTw8OCk7cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdKyI9In1yZXR1cm4gcmVzdWx0fQpmdW5jdGlvbiBhZXMyNTZFY2JFbmNyeXB0QmFzZTY0KHBsYWludGV4dCxrZXlTdHIpe2NvbnN0IGtleT1hZXNVdGY4Qnl0ZXMoa2V5U3RyKTtpZihrZXkubGVuZ3RoIT09MzIpdGhyb3cgbmV3IEVycm9yKCJBRVMtMjU26ZyA6KaBMzLlrZfoioLlr4bpkqXvvIzlvZPliY0iK2tleS5sZW5ndGgpO2NvbnN0IHc9YWVzS2V5RXhwYW5zaW9uMjU2KGtleSk7Y29uc3QgZGF0YT1hZXNVdGY4Qnl0ZXMocGxhaW50ZXh0KTtjb25zdCBwYWRMZW49MTYtKGRhdGEubGVuZ3RoJTE2KTtjb25zdCBwYWRkZWQ9bmV3IFVpbnQ4QXJyYXkoZGF0YS5sZW5ndGgrcGFkTGVuKTtwYWRkZWQuc2V0KGRhdGEpO2ZvcihsZXQgaT1kYXRhLmxlbmd0aDtpPHBhZGRlZC5sZW5ndGg7aSsrKXBhZGRlZFtpXT1wYWRMZW47Y29uc3Qgb3V0PW5ldyBVaW50OEFycmF5KHBhZGRlZC5sZW5ndGgpO2ZvcihsZXQgb2ZmPTA7b2ZmPHBhZGRlZC5sZW5ndGg7b2ZmKz0xNil7b3V0LnNldChhZXNFbmNyeXB0QmxvY2socGFkZGVkLnNsaWNlKG9mZixvZmYrMTYpLHcpLG9mZil9cmV0dXJuIGFlc0J5dGVzVG9CYXNlNjQob3V0KX0KCi8qID09PT09PT09PT09PT09PT09IOWtmOWCqCA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBsb2FkSlNPTihrLGZhbGxiYWNrKXt0cnl7Y29uc3QgcmF3PWxvY2FsU3RvcmFnZS5nZXRJdGVtKGspO2lmKCFyYXcpcmV0dXJuIGZhbGxiYWNrO2NvbnN0IHY9SlNPTi5wYXJzZShyYXcpO3JldHVybiB2PT09dW5kZWZpbmVkfHx2PT09bnVsbD9mYWxsYmFjazp2fWNhdGNoKGUpe3JldHVybiBmYWxsYmFja319CmZ1bmN0aW9uIHNhdmVKU09OKGssdil7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKGssSlNPTi5zdHJpbmdpZnkodikpO3JldHVybiB0cnVlfWNhdGNoKGUpe3JldHVybiBmYWxzZX19CmNvbnN0IERFRkFVTFRfQ0ZHPXthcHA6e2FwcElkOiJTN3FQV1BVMSIsYXBwU2VjcmV0OiJjNWUwZGE3ZjRkYTI4ZGY4MDU2OTRlYzNkZDFmYzY3OTJlOWRmOTlkIn0saDU6e2FwcElkOiJTdzVGOXVKaSIsYXBwU2VjcmV0OiI0Njg3MGE4ZjY3OGEwOTEwOTQ2OGY1YjAxNjg4MThiOTFjMjkyODQ1In0sY29tbXVuaXR5OntlbmFibGVQb3N0OnRydWUsZW5hYmxlTGlrZTp0cnVlLGVuYWJsZUNvbW1lbnQ6dHJ1ZSxlbmFibGVTaGFyZTp0cnVlLGVuYWJsZURlbGV0ZTp0cnVlfSx2ZWhpY2xlQWVzS2V5OiIiLGF1dG9SZWZyZXNoU2VjOjYwLHNlcnZlckJhc2U6IiJ9OwpmdW5jdGlvbiBnZXRDZmcoKXtjb25zdCBjPWxvYWRKU09OKEtFWVMuY2ZnLG51bGwpO2lmKCFjKXJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KERFRkFVTFRfQ0ZHKSk7cmV0dXJue2FwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxERUZBVUxUX0NGRy5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjLmg1Py5hcHBJZHx8REVGQVVMVF9DRkcuaDUuYXBwSWQsYXBwU2VjcmV0OmMuaDU/LmFwcFNlY3JldHx8REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LHZlaGljbGVBZXNLZXk6KHR5cGVvZiBjLnZlaGljbGVBZXNLZXk9PT0ic3RyaW5nIj9jLnZlaGljbGVBZXNLZXk6IiIpLnRyaW0oKSxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGMuYXV0b1JlZnJlc2hTZWMpLHNlcnZlckJhc2U6U3RyaW5nKGMuc2VydmVyQmFzZXx8IiIpLnRyaW0oKX19CmZ1bmN0aW9uIHNhdmVDZmcoYyl7cmV0dXJuIHNhdmVKU09OKEtFWVMuY2ZnLGMpfQpmdW5jdGlvbiBnZXRBY2NvdW50cygpe2NvbnN0IGE9bG9hZEpTT04oS0VZUy5hY2NvdW50cyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gc2F2ZUFjY291bnRzKGxpc3Qpe3JldHVybiBzYXZlSlNPTihLRVlTLmFjY291bnRzLGxpc3QpfQpmdW5jdGlvbiBnZXRMb2dzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmxvZ3MsW10pO3JldHVybiBBcnJheS5pc0FycmF5KGEpP2E6W119CmZ1bmN0aW9uIGFkZExvZyhlbnRyeSl7Y29uc3QgbG9ncz1nZXRMb2dzKCk7bG9ncy51bnNoaWZ0KGVudHJ5KTtpZihsb2dzLmxlbmd0aD41MClsb2dzLmxlbmd0aD01MDtzYXZlSlNPTihLRVlTLmxvZ3MsbG9ncyl9CmZ1bmN0aW9uIGNsZWFyTG9ncygpe3JldHVybiBzYXZlSlNPTihLRVlTLmxvZ3MsW10pfQpmdW5jdGlvbiBpc1Byb3h5TW9kZSgpe3JldHVybiAhISh3aW5kb3cuX19QQU5FTF9NT0RFX18pfHwhIWdldENmZygpLnNlcnZlckJhc2V9Ci8qID09PT09PT09PT09PT09PT09IOetvuWQjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBnZXRTaWduKHR5cGUscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Y1t0eXBlXXx8Yy5hcHA7Y29uc3QgcXVlcnk9dG9RdWVyeShwYXJhbXMpO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT10eXBlPT09Img1Ij9nZXRVdWlkKCk6dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9Ym9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKTonJztjb25zdCBzaWduYXR1cmU9dHlwZT09PSJoNSI/KHF1ZXJ5K3BhcmFtK2FjLmFwcFNlY3JldCk6KGJvZHlTdHIrcGFyYW0rYWMuYXBwU2VjcmV0KTtjb25zdCBzaWduPW1kNShzaGExKHNpZ25hdHVyZSksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ3NpZ25hdHVyZSc6c2lnbn19CgovLyBINSDnq6/lkKsgYm9keSDnrb7lkI3vvIhsb2dpbkJ5UGhvbmUg562J5o6l5Y+j5b+F6aG75oqK6K+35rGC5L2T57qz5YWl562+5ZCN77yM5ZCm5YiZ6L+U5ZueIHBlcm1pdCBlcnJvcu+8iQpmdW5jdGlvbiBoNVNpZ25XaXRoQm9keShib2R5LGNmZyl7Y29uc3QgYz1jZmd8fGdldENmZygpO2NvbnN0IGFjPWMuaDV8fGMuYXBwO2NvbnN0IHRpbWVzdGFtcD1uZXcgRGF0ZSgpLmdldFRpbWUoKTtjb25zdCBub25jZT1nZXRVdWlkKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IGJvZHlTdHI9dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpO2NvbnN0IHNpZ249bWQ1KHNoYTEoYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnY2Ztb3RvLXgtcGFyYW0nOnBhcmFtLCdjZm1vdG8teC1zaWduJzpzaWduLCdjZm1vdG8teC1zaWduLXR5cGUnOicwJywndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnbm9uY2UnOm5vbmNlLCdhcHBJZCc6YWMuYXBwSWR9fQoKLy8gQXBwIOe9keWFs+WujOaVtOetvuWQje+8iOWPkeeggeS4jueZu+W9leWQjOe9keWFs++8jOmBv+WFjSBINSBhdXRoQ29kZSDlj5HnoIHov5sgQXBwIOaxoOiAjCBINSBsb2dpbkJ5UGhvbmUg5p+l5LiN5Yiw77yJCmZ1bmN0aW9uIGFwcEdhdGV3YXlTaWduKHVybCxtZXRob2QscGFyYW1zPXt9LGJvZHk9JycsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygpO2NvbnN0IHBhcmFtPSJhcHBJZD0iK2FjLmFwcElkKyImbm9uY2U9Iitub25jZSsiJnRpbWVzdGFtcD0iK3RpbWVzdGFtcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7bGV0IHByZVNpZ249IiI7aWYoU3RyaW5nKG1ldGhvZCkudG9VcHBlckNhc2UoKT09PSJHRVQiKXtjb25zdCB1PW5ldyBVUkwodXJsKTtwcmVTaWduPXUub3JpZ2luK3UucGF0aG5hbWUrKHF1ZXJ5PyI/IitxdWVyeToiIik7fWVsc2V7cHJlU2lnbj1xdWVyeSsoYm9keT8odHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHkpKToiIik7fWNvbnN0IHNpZ249bWQ1KHNoYTEocHJlU2lnbitwYXJhbSthYy5hcHBTZWNyZXQpLDMyKS50b1N0cmluZygpO3JldHVybnsnYXBwSWQnOmFjLmFwcElkLCdub25jZSc6bm9uY2UsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ3NpZ25hdHVyZSc6c2lnbiwnQ2Ztb3RvLVgtUGFyYW0nOnBhcmFtLCdDZm1vdG8tWC1TaWduJzpzaWduLCdDZm1vdG8tWC1TaWduLVR5cGUnOicwJ319CgovKiA9PT09PT09PT09PT09PT09PSBIVFRQ77yIZmV0Y2gg54mI77yJID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIGh0dHBHZXQodXJsLGhlYWRlcnMsdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJHRVQiLGhlYWRlcnM6aGVhZGVyc3x8e30sc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQb3N0KHVybCxoZWFkZXJzLGJvZHksdGltZW91dE1zKXtjb25zdCBjdHJsPXRpbWVvdXRNcz9BYm9ydFNpZ25hbC50aW1lb3V0KHRpbWVvdXRNcyk6dW5kZWZpbmVkO3RyeXtjb25zdCByPWF3YWl0IGZldGNoKHVybCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6dHlwZW9mIGJvZHk9PT0ic3RyaW5nIj9ib2R5OkpTT04uc3RyaW5naWZ5KGJvZHk9PW51bGw/e306Ym9keSksc2lnbmFsOmN0cmx9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fWNhdGNoKGUpe3JldHVybntlcnJvcjpTdHJpbmcoKGUmJmUubWVzc2FnZSl8fGUpfX19CmFzeW5jIGZ1bmN0aW9uIGh0dHBQdXQodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBVVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxib2R5OmJvZHkhPT11bmRlZmluZWQmJmJvZHkhPT1udWxsPyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOnVuZGVmaW5lZCxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cERlbGV0ZSh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkRFTEVURSIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KZnVuY3Rpb24gbmV0d29ya0hpbnQocmVzKXtjb25zdCBtPVN0cmluZygocmVzJiZyZXMuZXJyb3IpfHwiIik7aWYoL2ZhaWxlZCB0byBmZXRjaHxuZXR3b3JrZXJyb3J8Y29yc3xsb2FkIGZhaWxlZHzml6Dms5Xov57mjqV8572R57ucL2kudGVzdChtKSlyZXR1cm4i572R57ucL+i3qOWfn+WPl+mZkO+8muebtOi/nuaooeW8j+mcgCBaRUVITyDmnI3liqHnq6/mlL7ooYwgQ09SU++8jOiLpeWksei0peivt+WcqOOAjOiuvue9ri3mnI3liqHlnLDlnYDjgI3loavlhaXljp/ohJrmnKzlnLDlnYDotbDku6PnkIbmqKHlvI8iO3JldHVybiIifQoKLyogPT09PT09PT09PT09PT09PT0g55u06L+e5ZCO56uv77yI5rWP6KeI5Zmo55u05o6l6LCDIFpFRUhPIEFQSe+8iSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBiYXNlSGVhZGVycyhhY2Mpe2NvbnN0IHVhPWFjYy51c2VyQWdlbnR8fCJNT0JJTEV8aU9TfDE2LjEuMXxaRUVIT19BUFB8My4wLjF8aVBob25lfFdXQU58aU9TIjtjb25zdCBoPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsIkFjY2VwdCI6IiovKiIsIlVzZXItQWdlbnQiOnVhLCJ4LWFwcC1pbmZvIjp1YX07aWYoYWNjLnVzZXJJZCl7aFsidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtoWyJDb29raWUiXT0idXNlcl9pZD0iK2FjYy51c2VySWR9cmV0dXJuIGh9Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IGhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH07aWYoYWNjLnVzZXJJZCloZWFkZXJzWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIsaGVhZGVycyk7bGV0IGxpc3Q9W107aWYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApe2lmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKWxpc3Q9cmVzLmRhdGE7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5saXN0KSlsaXN0PXJlcy5kYXRhLmxpc3Q7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yZWNvcmRzKSlsaXN0PXJlcy5kYXRhLnJlY29yZHM7ZWxzZSBpZihyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yb3dzKSlsaXN0PXJlcy5kYXRhLnJvd3N9cmV0dXJuIGxpc3QubWFwKHY9Pih7dmluTm86U3RyaW5nKHYudmluTm98fHYuZnJhbWVOb3x8di52aW58fCIiKS50cmltKCksbmFtZTpTdHJpbmcodi52ZWhpY2xlTmFtZXx8di52ZWhpY2xlVHlwZXx8di5kZXZpY2VOYW1lfHx2Lm5hbWV8fCLovabovoYiKS50cmltKCl8fCLovabovoYiLHBpYzpTdHJpbmcodi52ZWhpY2xlUGljVXJsfHx2LnBpY3x8di5pbWFnZVVybHx8IiIpLnRyaW0oKSx2ZWhpY2xlVHlwZTpTdHJpbmcodi52ZWhpY2xlVHlwZXx8di50eXBlfHwiIikudHJpbSgpLGxpY2Vuc2VQbGF0ZTp2LmxpY2Vuc2VQbGF0ZXx8bnVsbH0pKS5maWx0ZXIodj0+di52aW5Obyl9Y2F0Y2goZSl7cmV0dXJuW119fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL3dpZGdldHMvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfSk7aWYoKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3Qgc29jPU51bWJlcihkLmJtc3NvY3x8ZC5iYXR0ZXJ5TGV2ZWx8fDApO2NvbnN0IHJhbmdlPU51bWJlcihkLmhtaVJpZGFibGVNaWxlfHxkLnZlaGljbGVSaWRhYmxlTWlsZXx8ZC5yaWRhYmxlTWlsZWFnZXx8MCk7Y29uc3Qgdm9sdGFnZT1OdW1iZXIoZC52b2x0YWdlfHxkLmJhdHRlcnlWb2x0YWdlfHxkLmJtc1ZvbHRhZ2V8fGQudG90YWxWb2x0YWdlfHxkLmJhdHRlcnlUb3RhbFZvbHRhZ2V8fDApO2NvbnN0IGxuZ1N0cj1kZWVwUGljayhkLFsibG9uZ2l0dWRlIiwibG5nIiwibG9uIiwiZ3BzWCIsImxvbmdpdHVkZVZhbHVlIiwiY29vcmRYIiwieCJdKTtjb25zdCBsYXRTdHI9ZGVlcFBpY2soZCxbImxhdGl0dWRlIiwibGF0IiwiZ3BzWSIsImxhdGl0dWRlVmFsdWUiLCJjb29yZFkiLCJ5Il0pO2NvbnN0IGxvbmdpdHVkZT1OdW1iZXIobG5nU3RyKSxsYXRpdHVkZT1OdW1iZXIobGF0U3RyKTtyZXR1cm57YmF0dGVyeVBlcmNlbnQ6TWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsaXNGaW5pdGUoc29jKT9zb2M6MCkpLHJlc2lkdWFsUmFuZ2VLbTppc0Zpbml0ZShyYW5nZSk/cmFuZ2U6MCx2b2x0YWdlOmlzRmluaXRlKHZvbHRhZ2UpJiZ2b2x0YWdlPjA/dm9sdGFnZTowLGFkZHJlc3M6U3RyaW5nKGQuYWRkcmVzc3x8IiIpLnRyaW0oKSxsb2NhdGlvblRpbWU6U3RyaW5nKGQubG9jYXRpb24/LmxvY2F0aW9uVGltZXx8IiIpLnRyaW0oKSx2ZWhpY2xlTmFtZTpTdHJpbmcoZC52ZWhpY2xlTmFtZXx8IiIpLnRyaW0oKSx2ZWhpY2xlSW1hZ2VVcmw6U3RyaW5nKGQudmVoaWNsZVNjYWxlUGljVXJsfHxkLnZlaGljbGVQaWNVcmx8fCIiKS50cmltKCksaGVhZExvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHwiIikudHJpbSgpLGJhdHRlcnlQdWxsT3V0OlN0cmluZyhkLmJhdHRlcnlQdWxsT3V0RmxhZ3x8IiIpPT09IjEiLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQub25saW5lfHxkLm5ldFN0YXR1c3x8ZC50Ym94U3RhdHVzfHxkLmRldmljZU9ubGluZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiIscG93ZXJTdGF0dXM6U3RyaW5nKGQuYWNjU3RhdHVzfHxkLnBvd2VyU3RhdHVzfHxkLnZlaGljbGVTdGF0dXN8fGQuaWduaXRpb25TdGF0dXN8fGQucG93ZXJNb2RlfHxkLmFjY1N0YXRlfHxkLnBvd2VyU3RhdGV8fGQudmVoaWNsZVN0YXRlfHxkLmVuZ2luZVN0YXR1c3x8ZC5pc1Bvd2VyT258fGQucG93ZXJPbnx8IiIpLnRyaW0oKSxsb2NrU3RhdGU6U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxkLmNhckxvY2tTdGF0ZXx8ZC5kb29yTG9ja1N0YXRlfHxkLmxvY2tGbGFnfHxkLmlzTG9ja2VkfHxkLmxvY2tlZHx8ZC5jZW50cmFsTG9ja2luZ1N0YXR1c3x8IiIpLnRyaW0oKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOmFjYy51c2VySWR8fCIiLC4uLnNpZ25IfTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/dW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsaGVhZGVycyk7aWYocmVzJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2ZWhpY2xlTG9jaz1waWNrSW90UHJvcChkLCJWZWhpY2xlTG9ja19TIik7Y29uc3QgaGVhZExvY2tJb3Q9cGlja0lvdFByb3AoZCwiSGVhZExvY2tTdGF0ZSIpO2NvbnN0IHRvcExvY2s9U3RyaW5nKGQuaGVhZExvY2tTdGF0ZXx8ZC5sb2NrU3RhdGV8fGQubG9ja1N0YXR1c3x8ZC52ZWhpY2xlTG9ja1N0YXRlfHxoZWFkTG9ja0lvdHx8dmVoaWNsZUxvY2t8fCIiKS50cmltKCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntwb3dlclN0YXR1czpkZWVwUGljayhkLFsiYWNjU3RhdHVzIiwicG93ZXJTdGF0dXMiLCJ2ZWhpY2xlU3RhdHVzIiwiaWduaXRpb25TdGF0dXMiLCJwb3dlck1vZGUiLCJhY2NTdGF0ZSIsInBvd2VyU3RhdGUiLCJ2ZWhpY2xlU3RhdGUiLCJlbmdpbmVTdGF0dXMiLCJpc1Bvd2VyT24iLCJwb3dlck9uIiwiYWNjIl0pLnRyaW0oKSxsb2NrU3RhdGU6dG9wTG9jayxvbmxpbmU6U3RyaW5nKGQub25saW5lU3RhdHVzfHxkLnJpZGVTdGF0ZXx8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fCIiKS50cmltKCkscmlkZVN0YXRlOlN0cmluZyhkLnJpZGVTdGF0ZXx8IiIpLnRyaW0oKSxjdXNoaW9uU3RhdGU6ZGVlcFBpY2soZCxbImN1c2hpb25TdGF0ZSIsImN1c2hpb25TdGF0dXMiLCJjdXNoaW9uTG9ja1N0YXRlIiwic2VhdFN0YXRlIiwic2VhdFN0YXR1cyIsInNlYXRMb2NrU3RhdGUiLCJzYWRkbGVTdGF0ZSIsInNhZGRsZVN0YXR1cyIsInNhZGRsZUxvY2tTdGF0ZSJdKSxsb25naXR1ZGU6KGlzRmluaXRlKGxvbmdpdHVkZSkmJk1hdGguYWJzKGxvbmdpdHVkZSk8PTE4MCYmbG9uZ2l0dWRlIT09MCk/bG9uZ2l0dWRlOiIiLGxhdGl0dWRlOihpc0Zpbml0ZShsYXRpdHVkZSkmJk1hdGguYWJzKGxhdGl0dWRlKTw9OTAmJmxhdGl0dWRlIT09MCk/bGF0aXR1ZGU6IiJ9fXJldHVybiBudWxsfWNhdGNoKGUpe3JldHVybiBudWxsfX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2FwcC92ZWhpY2xlL3RpcmUvbW9uaXRvcmluZz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIix7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IG1vbnRoPW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgW2hvbWVSZXMsbXlSZXNdPWF3YWl0IFByb21pc2UuYWxsKFtodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2hvbWVSaWRlSW5mbz92aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KSxodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL215UmlkZUluZm8/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImbW9udGg9Iittb250aCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH0pXSk7Y29uc3QgaD1ob21lUmVzPy5kYXRhfHxob21lUmVzfHx7fTtjb25zdCBkPW15UmVzPy5kYXRhfHxteVJlc3x8e307Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KGQucmlkZVJlY29yZExpc3QpP2QucmlkZVJlY29yZExpc3Q6W107Y29uc3QgdG9kYXlLZXk9bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgZGF5PWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09dG9kYXlLZXkpfHxsaXN0W2xpc3QubGVuZ3RoLTFdfHx7fTtyZXR1cm57dG9kYXlEaXN0YW5jZTpOdW1iZXIoZGF5LnJpZGVNaWxlYWdlPz9oLnJpZGVNaWxlYWdlRGF5Pz8wKSx0b2RheUR1cmF0aW9uOk51bWJlcihkYXkucmlkaW5nVGltZURheVVuaXRNaW51dGU/P2gubGFzdFJpZGluZ1RpbWVVbml0TWludXRlPz8wKSx0b2RheU1heFNwZWVkOk51bWJlcihkYXkubWF4U3BlZWQ/PzApLGxhc3RSaWRlTWlsZWFnZTpOdW1iZXIoaC5sYXN0UmlkZU1pbGVhZ2U/PzApLGxhc3RSaWRlRHVyYXRpb246TnVtYmVyKGgubGFzdFJpZGluZ1RpbWVVbml0TWludXRlPz8wKX19Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXR0ZXJ5Q2hhcmdlU3RhdGUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJhcHBpZCI6Y2ZnLmFwcC5hcHBJZCwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL2JhdHRlcnlJbmZvLyIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7Y29uc3Qgdm9sdGFnZT1OdW1iZXIoZC52b2x0YWdlfHxkLmJhdHRlcnlWb2x0YWdlfHxkLmJtc1ZvbHRhZ2V8fGQudG90YWxWb2x0YWdlfHxkLmJhdHRlcnlUb3RhbFZvbHRhZ2V8fGQudm9sfHxkLmJhdFZvbHRhZ2V8fGQuYmF0dGVyeVZvbHx8MCk7Y29uc3QgY3VycmVudD1OdW1iZXIoZC5jdXJyZW50fHxkLmJhdHRlcnlDdXJyZW50fHxkLmJtc0N1cnJlbnR8fGQuY3VyfHxkLmJhdHRlcnlDdXJ8fDApO2NvbnN0IGJhdHRlcnlUZW1wPU51bWJlcihkLmJhdHRlcnlUZW1wfHxkLmJhdFRlbXB8fGQudGVtcHx8ZC50ZW1wZXJhdHVyZXx8ZC5ibXNUZW1wfHxkLmJhdHRlcnlUZW1wZXJhdHVyZXx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHxkLnJlc2lkdWFsUmFuZ2V8fDApO3JldHVybntjaGFyZ2VTdGF0ZTpTdHJpbmcoZC5jaGFyZ2VTdGF0ZVN0cnx8ZC5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsY3VycmVudDppc0Zpbml0ZShjdXJyZW50KT9jdXJyZW50OjAsYmF0dGVyeVRlbXA6aXNGaW5pdGUoYmF0dGVyeVRlbXApP2JhdHRlcnlUZW1wOjAsc29jOk51bWJlcihkLnNvY3x8ZC5iYXR0ZXJ5TGV2ZWx8fGQuYm1zc29jfHwwKSxyZXNpZHVhbFJhbmdlS206aXNGaW5pdGUocmFuZ2UpP3JhbmdlOjB9fXJldHVybntjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjAscmVzaWR1YWxSYW5nZUttOjB9fWNhdGNoKGUpe3JldHVybntjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjAscmVzaWR1YWxSYW5nZUttOjB9fX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiaDUiLHt2aW5Obzp2aW5Ob30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkh9O2lmKGFjYy51c2VySWQpaGVhZGVyc1sidXNlcl9pZCJdPVN0cmluZyhhY2MudXNlcklkKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJhcHAvYXBwL3NlcnZpY2UvcmVjaGFyZ2UvdmVoaWNsZS9kZXRhaWw/dmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7cmV0dXJue3JlY2hhcmdlRW5kRGF0ZTpTdHJpbmcocmVzLmRhdGEucmVjaGFyZ2VFbmREYXRlfHwiIiksbGFzdFVzZURhdGU6TnVtYmVyKHJlcy5kYXRhLmxhc3RVc2VEYXRlKXx8MCxzZXJ2aWNlUmVjaGFyZ2VTdGF0dXM6U3RyaW5nKHJlcy5kYXRhLnNlcnZpY2VSZWNoYXJnZVN0YXR1c3x8IiIpLHZlaGljbGVOYW1lOlN0cmluZyhyZXMuZGF0YS52ZWhpY2xlTmFtZXx8IiIpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVJbmZvKGFjYyxjZmcpe2NvbnN0IHJlc3VsdD17aGFzVmVoaWNsZTpmYWxzZSx2ZWhpY2xlTmFtZToiIix2aW5ObzoiIix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsYmF0dGVyeVBlcmNlbnQ6MCxyZXNpZHVhbFJhbmdlS206MCxyYW5nZUVzdGltYXRlZDpmYWxzZSxhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iixmcm9udFByZXNzdXJlOiIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsdmVoaWNsZUltYWdlVXJsOiIiLHNlcnZpY2VFbmREYXRlOiIiLHNlcnZpY2VSZW1haW5EYXlzOjAsc2VydmljZVN0YXR1czoiIixwb3dlclN0YXR1czoiIixsb2NrU3RhdGU6IiIsb25saW5lOiIiLHJpZGVTdGF0ZToiIixjdXNoaW9uU3RhdGU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIifTt0cnl7Y29uc3QgdmVoaWNsZXM9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTtpZih2ZWhpY2xlcy5sZW5ndGg9PT0wKXJldHVybiByZXN1bHQ7Y29uc3Qgdj12ZWhpY2xlc1swXTtyZXN1bHQuaGFzVmVoaWNsZT10cnVlO3Jlc3VsdC52ZWhpY2xlTmFtZT12Lm5hbWU7cmVzdWx0LnZpbk5vPXYudmluTm87cmVzdWx0LnZlaGljbGVJbWFnZVVybD12LnBpYztjb25zdCBbd2lkZ2V0cyx0aXJlLHJpZGUsYmF0dGVyeSxzZXJ2aWNlLGhvbWVQYWdlXT1hd2FpdCBQcm9taXNlLmFsbChbZmV0Y2hWZWhpY2xlV2lkZ2V0cyhhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFRpcmVQcmVzc3VyZShhY2MsY2ZnLHYudmluTm8pLmNhdGNoKCgpPT5udWxsKSxmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoQmF0dGVyeUNoYXJnZVN0YXRlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pih7Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowfSkpLGZldGNoU2VydmljZVJlY2hhcmdlRGV0YWlsKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVmVoaWNsZUhvbWVQYWdlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpXSk7aWYod2lkZ2V0cyl7cmVzdWx0LmJhdHRlcnlQZXJjZW50PXdpZGdldHMuYmF0dGVyeVBlcmNlbnQ7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT13aWRnZXRzLnJlc2lkdWFsUmFuZ2VLbTtyZXN1bHQudm9sdGFnZT13aWRnZXRzLnZvbHRhZ2U7cmVzdWx0LmFkZHJlc3M9d2lkZ2V0cy5hZGRyZXNzO3Jlc3VsdC5sb2NhdGlvblRpbWU9d2lkZ2V0cy5sb2NhdGlvblRpbWU7cmVzdWx0LnBvd2VyU3RhdHVzPXdpZGdldHMucG93ZXJTdGF0dXN8fCIiO3Jlc3VsdC5sb2NrU3RhdGU9d2lkZ2V0cy5sb2NrU3RhdGV8fCIiO2lmKHdpZGdldHMudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXdpZGdldHMudmVoaWNsZU5hbWU7aWYod2lkZ2V0cy52ZWhpY2xlSW1hZ2VVcmwpcmVzdWx0LnZlaGljbGVJbWFnZVVybD13aWRnZXRzLnZlaGljbGVJbWFnZVVybDtpZih3aWRnZXRzLm9ubGluZSlyZXN1bHQub25saW5lPXdpZGdldHMub25saW5lO2lmKHdpZGdldHMuY3VzaGlvblN0YXRlKXJlc3VsdC5jdXNoaW9uU3RhdGU9d2lkZ2V0cy5jdXNoaW9uU3RhdGU7aWYod2lkZ2V0cy5sb25naXR1ZGUhPT0iIiYmd2lkZ2V0cy5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT13aWRnZXRzLmxvbmdpdHVkZTtpZih3aWRnZXRzLmxhdGl0dWRlIT09IiImJndpZGdldHMubGF0aXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxhdGl0dWRlPXdpZGdldHMubGF0aXR1ZGV9aWYoaG9tZVBhZ2Upe2lmKGhvbWVQYWdlLnBvd2VyU3RhdHVzKXJlc3VsdC5wb3dlclN0YXR1cz1ob21lUGFnZS5wb3dlclN0YXR1cztpZihob21lUGFnZS5sb2NrU3RhdGUpcmVzdWx0LmxvY2tTdGF0ZT1ob21lUGFnZS5sb2NrU3RhdGU7aWYoaG9tZVBhZ2Uub25saW5lKXJlc3VsdC5vbmxpbmU9aG9tZVBhZ2Uub25saW5lO2lmKGhvbWVQYWdlLnJpZGVTdGF0ZSlyZXN1bHQucmlkZVN0YXRlPWhvbWVQYWdlLnJpZGVTdGF0ZTtpZihob21lUGFnZS5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT1ob21lUGFnZS5jdXNoaW9uU3RhdGU7aWYoKHJlc3VsdC5sb25naXR1ZGU9PT0iInx8cmVzdWx0LmxvbmdpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxvbmdpdHVkZSE9PSIiJiZob21lUGFnZS5sb25naXR1ZGUhPT11bmRlZmluZWQpcmVzdWx0LmxvbmdpdHVkZT1ob21lUGFnZS5sb25naXR1ZGU7aWYoKHJlc3VsdC5sYXRpdHVkZT09PSIifHxyZXN1bHQubGF0aXR1ZGU9PT11bmRlZmluZWQpJiZob21lUGFnZS5sYXRpdHVkZSE9PSIiJiZob21lUGFnZS5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9aG9tZVBhZ2UubGF0aXR1ZGV9aWYodGlyZSl7cmVzdWx0LmZyb250UHJlc3N1cmU9dGlyZS5mcm9udFByZXNzdXJlO3Jlc3VsdC5yZWFyUHJlc3N1cmU9dGlyZS5yZWFyUHJlc3N1cmU7cmVzdWx0LmZyb250VGVtcD10aXJlLmZyb250VGVtcDtyZXN1bHQucmVhclRlbXA9dGlyZS5yZWFyVGVtcH1pZihyaWRlKXtyZXN1bHQudG9kYXlEaXN0YW5jZT1yaWRlLnRvZGF5RGlzdGFuY2U7cmVzdWx0LnRvZGF5RHVyYXRpb249cmlkZS50b2RheUR1cmF0aW9uO3Jlc3VsdC50b2RheU1heFNwZWVkPXJpZGUudG9kYXlNYXhTcGVlZDtyZXN1bHQubGFzdFJpZGVNaWxlYWdlPXJpZGUubGFzdFJpZGVNaWxlYWdlfXJlc3VsdC5jaGFyZ2VTdGF0ZT1iYXR0ZXJ5LmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1IjtpZihiYXR0ZXJ5LnZvbHRhZ2UpcmVzdWx0LnZvbHRhZ2U9YmF0dGVyeS52b2x0YWdlO2lmKGJhdHRlcnkuY3VycmVudClyZXN1bHQuY3VycmVudD1iYXR0ZXJ5LmN1cnJlbnQ7aWYoYmF0dGVyeS5iYXR0ZXJ5VGVtcClyZXN1bHQuYmF0dGVyeVRlbXA9YmF0dGVyeS5iYXR0ZXJ5VGVtcDtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmYmF0dGVyeS5yZXNpZHVhbFJhbmdlS20pcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1iYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbTtpZigoIXJlc3VsdC5yZXNpZHVhbFJhbmdlS218fHJlc3VsdC5yZXNpZHVhbFJhbmdlS209PT0wKSYmcmVzdWx0LmJhdHRlcnlQZXJjZW50PjApe3Jlc3VsdC5yZXNpZHVhbFJhbmdlS209TWF0aC5yb3VuZChyZXN1bHQuYmF0dGVyeVBlcmNlbnQqMC44Nyk7cmVzdWx0LnJhbmdlRXN0aW1hdGVkPXRydWV9aWYoc2VydmljZSl7cmVzdWx0LnNlcnZpY2VFbmREYXRlPXNlcnZpY2UucmVjaGFyZ2VFbmREYXRlfHwiIjtyZXN1bHQuc2VydmljZVN0YXR1cz1zZXJ2aWNlLnNlcnZpY2VSZWNoYXJnZVN0YXR1c3x8IiI7cmVzdWx0LnNlcnZpY2VSZW1haW5EYXlzPXNlcnZpY2UubGFzdFVzZURhdGV8fDA7aWYoc2VydmljZS52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9c2VydmljZS52ZWhpY2xlTmFtZX19Y2F0Y2goZSl7fXJldHVybiByZXN1bHR9Cgphc3luYyBmdW5jdGlvbiBjaGVja1Rva2VuKGFjYyxjZmcpe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3QgdXNlcklkPWFjYy51c2VySWR8fCIiO2lmKCF1c2VySWQpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6MCx1c2VyTmFtZTphY2MudXNlck5hbWV9O2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZCwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9zZXR0aW5nLyIrdXNlcklkLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSlyZXR1cm57dmFsaWQ6dHJ1ZSxzY29yZTpOdW1iZXIocmVzLmRhdGEuc2NvcmUpfHwwLHVzZXJOYW1lOnJlcy5kYXRhLm5pY2tOYW1lfHxhY2MudXNlck5hbWV9O2lmKHJlcy5jb2RlPT0iNDAwMDEifHxyZXMuY29kZT09NDAxKXJldHVybnt2YWxpZDpmYWxzZSxyZWFzb246InRva2Vu5bey6L+H5pyfIn07cmV0dXJue3ZhbGlkOnRydWUscmVhc29uOnJlcy5tZXNzYWdlfHwi6K+35rGC5byC5bi4In19Y2F0Y2goZSl7cmV0dXJue3ZhbGlkOnRydWUscmVhc29uOlN0cmluZyhlKX19fQoKYXN5bmMgZnVuY3Rpb24gZ2V0VXNlcmlkQnlUb2tlbih0b2tlbixjZmcpe2NvbnN0IHQ9Y2xlYW5Ub2tlbih0b2tlbik7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdCwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIifTtsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiLGVycm9yPW51bGw7dHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCcnLGNmZyk7Y29uc3QgcmVzMD1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSDB9KTtpZihyZXMwJiZTdHJpbmcocmVzMC5jb2RlKT09PSIxMDAwMCImJnJlczAuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMwLmRhdGEuaWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcocmVzMC5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe31pZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZyIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IfSk7aWYocmVzLmNvZGU9PSIxMDAwMCImJnJlcy5kYXRhKXt1c2VySWQ9U3RyaW5nKHJlcy5kYXRhLmlkfHxyZXMuZGF0YS51c2VySWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcocmVzLmRhdGEubmlja05hbWV8fCIiKX19Y2F0Y2goZSl7fX1pZighdXNlcklkKXt0cnl7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIsey4uLmJhc2VIZWFkZXJzLC4uLnNpZ25IfSk7Y29uc3QgZmluZD0ob2JqLGRlcHRoKT0+e2lmKCFvYmp8fGRlcHRoPjUpcmV0dXJuIiI7Zm9yKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvYmopKXtjb25zdCB2YWw9b2JqW2tleV07aWYoL3VzZXIuP2lkfHVpZHxjcmVhdGUuP2J5fG93bmVyLj9pZC9pLnRlc3Qoa2V5KSYmdmFsJiZ0eXBlb2YgdmFsIT09Im9iamVjdCIpe2NvbnN0IHM9U3RyaW5nKHZhbCk7aWYocy5sZW5ndGg+PTEwJiYvXlxkKyQvLnRlc3QocykpcmV0dXJuIHN9aWYodmFsJiZ0eXBlb2YgdmFsPT09Im9iamVjdCIpe2NvbnN0IGY9ZmluZCh2YWwsZGVwdGgrMSk7aWYoZilyZXR1cm4gZn19cmV0dXJuIiJ9O2NvbnN0IHVpZD1maW5kKHJlcywwKTtpZih1aWQpe3VzZXJJZD11aWQ7Y29uc3QgZmluZE5hbWU9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD40KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7aWYoL25pY2suP25hbWV8dXNlci4/bmFtZS9pLnRlc3Qoa2V5KSYmb2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJzdHJpbmciKXJldHVybiBvYmpba2V5XTtpZihvYmpba2V5XSYmdHlwZW9mIG9ialtrZXldPT09Im9iamVjdCIpe2NvbnN0IG49ZmluZE5hbWUob2JqW2tleV0sZGVwdGgrMSk7aWYobilyZXR1cm4gbn19cmV0dXJuIiJ9O3VzZXJOYW1lPWZpbmROYW1lKHJlcywwKX19Y2F0Y2goZSl7fX1pZighdXNlcklkKWVycm9yPSLoh6rliqjojrflj5blpLHotKXvvIzor7fmiYvliqjloavlhpnnlKjmiLdJRCI7cmV0dXJue29rOiEhdXNlcklkLHVzZXJJZCx1c2VyTmFtZSxlcnJvcn19Ci8qID09PT09PT09PT09PT09PT09IOi0puWPt+aVsOaNruaLieWPliA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluTm8pe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtsZXQgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+l55So5oi3Iix1c2VySWQsc2NvcmU6MCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6MCx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjAsbGFzdDc6W10sZXJyb3I6bnVsbCx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX07CmlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgdmVoaWNsZVJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH0pO2lmKHZlaGljbGVSZXMuY29kZT09IjEwMDAwIiYmdmVoaWNsZVJlcy5kYXRhKXtjb25zdCBhdXRvVWlkPVN0cmluZyh2ZWhpY2xlUmVzLmRhdGEudXNlcklkfHx2ZWhpY2xlUmVzLmRhdGEudWlkfHx2ZWhpY2xlUmVzLmRhdGEuaWR8fCIiKTtpZihhdXRvVWlkKXt1c2VySWQ9YXV0b1VpZDtyZXN1bHQudXNlcklkPXVzZXJJZDtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGlkeD1hY2NvdW50cy5maW5kSW5kZXgoYT0+Y2xlYW5Ub2tlbihhLnRva2VuKT09PXRva2VuKTtpZihpZHg+PTAmJiFhY2NvdW50c1tpZHhdLnVzZXJJZCl7YWNjb3VudHNbaWR4XS51c2VySWQ9dXNlcklkO3NhdmVBY2NvdW50cyhhY2NvdW50cyl9fX19Y2F0Y2goZSl7fX0KdHJ5e3Jlc3VsdC52ZWhpY2xlPWF3YWl0IGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyx2aW5Obyl9Y2F0Y2goZSl7cmVzdWx0LnZlaGljbGU9e2hhc1ZlaGljbGU6ZmFsc2V9fQp0cnl7aWYoIXVzZXJJZCl7cmVzdWx0LmVycm9yPSLor7flnKjorr7nva7pobXloavlhpnnlKjmiLdJRCJ9ZWxzZXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9KTtpZihpbmZvUmVzLmNvZGU9PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7cmVzdWx0LnNjb3JlPU51bWJlcihpbmZvUmVzLmRhdGEuc2NvcmV8fGluZm9SZXMuZGF0YS5pbnRlZ3JhbHx8aW5mb1Jlcy5kYXRhLnBvaW50fHxpbmZvUmVzLmRhdGEucG9pbnRzfHxpbmZvUmVzLmRhdGEudG90YWxTY29yZXx8aW5mb1Jlcy5kYXRhLnRvdGFsSW50ZWdyYWx8fDApfWVsc2UgaWYoaW5mb1Jlcy5jb2RlPT0iNDAwMDEifHxpbmZvUmVzLmNvZGU9PTQwMSl7cmVzdWx0LmVycm9yPSJUb2tlbuW3sui/h+acnyJ9ZWxzZXtyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluWksei0pTogIisoaW5mb1Jlcy5tZXNzYWdlfHxpbmZvUmVzLmNvZGV8fCLmnKrnn6XplJnor68iKX19fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blvILluLg6ICIrU3RyaW5nKGUpfQp0cnl7Y29uc3QgY3VyTW9udGg9bm93LmdldEZ1bGxZZWFyKCkrIi0iKyhub3cuZ2V0TW9udGgoKSsxKTtjb25zdCBsYXN0RGF0ZT1uZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSxub3cuZ2V0TW9udGgoKS0xLDEpO2NvbnN0IGxhc3RNb250aD1sYXN0RGF0ZS5nZXRGdWxsWWVhcigpKyItIisobGFzdERhdGUuZ2V0TW9udGgoKSsxKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IFtjdXJSZXMsbGFzdFJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK2N1ck1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmN1ck1vbnRofSwnJyxjZmcpfSksaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbGFzdE1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmxhc3RNb250aH0sJycsY2ZnKX0pXSk7Y29uc3QgbGFzdExpc3Q9KGxhc3RSZXMuY29kZT09IjEwMDAwIiYmbGFzdFJlcy5kYXRhKT8obGFzdFJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBjdXJMaXN0PShjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpPyhjdXJSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgbGlzdD1bLi4ubGFzdExpc3QsLi4uY3VyTGlzdF07aWYoY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKXtyZXN1bHQuc2lnbkNvdW50PU51bWJlcihjdXJSZXMuZGF0YS5zaWduQ291bnQpfHwwfWNvbnN0IHRvZGF5RW50cnk9Y3VyTGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmVkVG9kYXk9ISEodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01KSk7cmVzdWx0LnRvZGF5U2NvcmU9dG9kYXlFbnRyeT8oTnVtYmVyKHRvZGF5RW50cnkuaW50ZWdyYWxTY29yZSl8fDApOjA7dHJ5e2NvbnN0IF90b2RheUxvZ3M9KGdldExvZ3MoKXx8W10pLmZpbHRlcihsPT5sJiZsLmRhdGU9PT10b2RheSYmU3RyaW5nKGwudXNlcklkfHwiIik9PT1TdHJpbmcodXNlcklkKSYmbC5zdWNjZXNzKTtpZihfdG9kYXlMb2dzLmxlbmd0aD4wKXtjb25zdCBfdGw9X3RvZGF5TG9nc1swXTtyZXN1bHQudG9kYXlTY29yZT1OdW1iZXIoX3RsLnRvdGFsR2Fpbil8fHJlc3VsdC50b2RheVNjb3JlO3Jlc3VsdC50b2RheURldGFpbD17c2lnbmluU2NvcmU6TnVtYmVyKF90bC5zaWduaW5TY29yZSl8fDAsYmxpbmRCb3hTY29yZTpOdW1iZXIoX3RsLmJsaW5kQm94U2NvcmUpfHwwLGludGVyYWN0U2NvcmU6TnVtYmVyKF90bC5pbnRlcmFjdFNjb3JlKXx8MH19fWNhdGNoKGUpe31jb25zdCB0b2RheUlkeD1saXN0LmZpbmRJbmRleCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7bGV0IGNvbnQ9MDtpZih0b2RheUlkeD49MCl7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NSljb250Kys7ZWxzZSBicmVha319cmVzdWx0LmNvbnRpbnVlRGF5cz1jb250O2ZvcihsZXQgaT02O2k+PTA7aS0tKXtjb25zdCBkPW5ldyBEYXRlKCk7ZC5zZXREYXRlKGQuZ2V0RGF0ZSgpLWkpO2NvbnN0IGRzPWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGVudHJ5PWxpc3QuZmluZCh4PT54LmNyZWF0ZURhdGU9PT1kcyk7cmVzdWx0Lmxhc3Q3LnB1c2goe2RhdGU6ZHMuc2xpY2UoNSksc2lnbmVkOiEhKGVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NSkpLGlzVG9kYXk6aT09PTB9KX19Y2F0Y2goZSl7aWYoIXJlc3VsdC5lcnJvcilyZXN1bHQuZXJyb3I9IuetvuWIsOeKtuaAgeiOt+WPluWksei0pSJ9CnRyeXtjb25zdCB0b2tlbkNoZWNrPWF3YWl0IGNoZWNrVG9rZW4oYWNjLGNmZyk7cmVzdWx0LnRva2VuVmFsaWQ9dG9rZW5DaGVjay52YWxpZDtyZXN1bHQudG9rZW5SZWFzb249dG9rZW5DaGVjay5yZWFzb258fG51bGw7aWYodG9rZW5DaGVjay52YWxpZCYmdG9rZW5DaGVjay51c2VyTmFtZSYmKCFyZXN1bHQudXNlck5hbWV8fHJlc3VsdC51c2VyTmFtZT09PSLmnKrnn6XnlKjmiLciKSlyZXN1bHQudXNlck5hbWU9dG9rZW5DaGVjay51c2VyTmFtZX1jYXRjaChlKXtyZXN1bHQudG9rZW5WYWxpZD10cnVlfQpyZXR1cm4gcmVzdWx0fQoKZnVuY3Rpb24gZ2V0UG9zdElkRnJvbURhdGEoZGF0YSl7aWYoIWRhdGEpcmV0dXJuIG51bGw7aWYodHlwZW9mIGRhdGE9PT0ic3RyaW5nInx8dHlwZW9mIGRhdGE9PT0ibnVtYmVyIilyZXR1cm4gU3RyaW5nKGRhdGEpO2lmKEFycmF5LmlzQXJyYXkoZGF0YSkpcmV0dXJuIGdldFBvc3RJZEZyb21EYXRhKGRhdGFbMF0pO2NvbnN0IGRpcmVjdD1kYXRhLnV1aWR8fGRhdGEudHV1aWR8fGRhdGEucG9zdElkfHxkYXRhLnBvc3RpZHx8ZGF0YS5hcnRpY2xlSWR8fGRhdGEuYXJ0aWNsZUlEfHxkYXRhLmlkfHxkYXRhLmRhdGFJZHx8ZGF0YS50aWQ7aWYoZGlyZWN0KXJldHVybiBTdHJpbmcoZGlyZWN0KTtmb3IoY29uc3Qga2V5IG9mIFsicmVjb3JkcyIsImxpc3QiLCJyb3dzIiwiZGF0YSIsInJlc3VsdCJdKXtjb25zdCB2PWRhdGFba2V5XTtjb25zdCBwaWQ9Z2V0UG9zdElkRnJvbURhdGEodik7aWYocGlkKXJldHVybiBwaWR9cmV0dXJuIG51bGx9CgovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYwgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e3VzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczpmYWxzZSxzaWduaW5TY29yZTowLGJsaW5kQm94U2NvcmU6MCxpbnRlcmFjdFNjb3JlOjAsdG90YWxHYWluOjAsY29udGludWVEYXlzOjAsZXJyb3I6bnVsbCxzdGVwczpbXX07dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCB1c2VySWQ9YWNjLnVzZXJJZHx8IiI7Y29uc3QgYmFzZUhlYWRlcnM9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6dXNlcklkfTtjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCB0b2RheT1ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKG5vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBtb250aD10b2RheS5zbGljZSgwLDcpOwp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IHRvZGF5RW50cnk9KGluZm9SZXM/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtpZih0b2RheUVudHJ5JiYodG9kYXlFbnRyeS5zaWduU3RhdHVlPT0zfHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTUpKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIil9ZWxzZXtsZXQgc2lnblJlcz1udWxsLHNpZ25Nc2c9IuacquefpSI7Zm9yKGxldCBhdD0xO2F0PD0zO2F0Kyspe3NpZ25SZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse30sJycsY2ZnKX0se30pO2lmKHNpZ25SZXM/LmNvZGU9PSIxMDAwMCIpYnJlYWs7c2lnbk1zZz1zaWduUmVzPy5tZXNzYWdlfHwi5pyq55+lIjtpZigv6K+356iNfOeojeWQjnznqI3lgJl86aKR57mBfOe5geW/mXzph43or5UvLnRlc3Qoc2lnbk1zZykmJmF0PDMpe2F3YWl0IG5ldyBQcm9taXNlKHI9PnNldFRpbWVvdXQociwoYXQrMSkqMjAwMCkpO2NvbnRpbnVlfWJyZWFrfWlmKHNpZ25SZXM/LmNvZGU9PSIxMDAwMCIpe2NvbnN0IGluZm9SZXMyPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgdGU9KGluZm9SZXMyPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7cmVzdWx0LnNpZ25pblNjb3JlPXRlPyhOdW1iZXIodGUuaW50ZWdyYWxTY29yZSl8fDApOjA7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOaIkOWKnyArIityZXN1bHQuc2lnbmluU2NvcmUpfWVsc2V7dHJ5e2NvbnN0IGNoaz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IGNlPShjaGs/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtpZihjZSYmKGNlLnNpZ25TdGF0dWU9PTN8fGNlLnNpZ25TdGF0dWU9PTUpKXJlc3VsdC5zdGVwcy5wdXNoKCLku4rml6Xlt7Lnrb7liLAiKTtlbHNlIHJlc3VsdC5zdGVwcy5wdXNoKCLnrb7liLDlpLHotKU6ICIrc2lnbk1zZyl9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOWksei0pTogIitzaWduTXNnKX19fQp9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOW8guW4uDogIitlKX0KdHJ5e2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCBsaXN0PWluZm9SZXM/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdO2NvbnN0IHRvZGF5SWR4PWxpc3QuZmluZEluZGV4KHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtsZXQgY29udD0wO2ZvcihsZXQgaT10b2RheUlkeDtpPj0wO2ktLSl7aWYobGlzdFtpXT8uc2lnblN0YXR1ZT09M3x8bGlzdFtpXT8uc2lnblN0YXR1ZT09NSljb250Kys7ZWxzZSBicmVha31yZXN1bHQuY29udGludWVEYXlzPWNvbnQ7Y29uc3Qgc2lnbkNvdW50PU51bWJlcihpbmZvUmVzPy5kYXRhPy5zaWduQ291bnQpfHwwO2lmKHNpZ25Db3VudD49MzApe2NvbnN0IGJsaW5kUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9zaWduaW4vc3VwcGxlbWVudFByaXplP3N1cHBsZW1lbnREYXRlPSIrdG9kYXksey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7c3VwcGxlbWVudERhdGU6dG9kYXl9LCcnLGNmZyl9KTtpZihibGluZFJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmJsaW5kQm94U2NvcmU9TnVtYmVyKGJsaW5kUmVzPy5kYXRhPy5pbnRlZ3JhbHx8YmxpbmRSZXM/LmRhdGE/LmludGVncmFsU2NvcmV8fDApO3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LojrflvpcgKyIrcmVzdWx0LmJsaW5kQm94U2NvcmUrIiAoIisoYmxpbmRSZXM/LmRhdGE/LnByaXplc05hbWV8fCLnp6/liIYiKSsiKSIpfX1lbHNle3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LmnKrop6PplIEoIitzaWduQ291bnQrIi8zMCkiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuW8guW4uDogIitlKX0KY29uc3QgY29tbT1jZmcuY29tbXVuaXR5fHx7fTtsZXQgcG9zdElkPW51bGw7CmlmKGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKXt0cnl7Y29uc3QgcG9zdFJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGNvbnRlbnQ6IuW8gOW/g+eahOS4gOWkqSJ9KTtpZihwb3N0UmVzPy5jb2RlPT0iMTAwMDAiKXtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEocG9zdFJlcy5kYXRhKTtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJblvILluLg6ICIrZSl9fQppZighcG9zdElkKXt0cnl7Y29uc3QgbGlzdFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW11bml0eS9taW5lQXJ0aWNsZUluZm8/dXNlcklkPSIrdXNlcklkKyImcGFnZT0xJnBhZ2VTaXplPTEwIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7Y29uc3QgcmF3TGlzdD1BcnJheS5pc0FycmF5KGxpc3RSZXM/LmRhdGEpP2xpc3RSZXMuZGF0YToobGlzdFJlcz8uZGF0YT8ucmVjb3Jkc3x8bGlzdFJlcz8uZGF0YT8ubGlzdHx8W10pO2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyYXdMaXN0KT9yYXdMaXN0OltdO2NvbnN0IG1pbmU9bGlzdC5maW5kKGl0PT5TdHJpbmcoaXQudXNlcklkfHxpdC5jcmVhdGVCeXx8aXQudWlkfHwiIik9PT1TdHJpbmcodXNlcklkKSk7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKG1pbmV8fGxpc3RbMF18fGxpc3RSZXM/LmRhdGEpfWNhdGNoKGUpe319CmlmKHBvc3RJZCl7aWYoY29tbS5lbmFibGVMaWtlIT09ZmFsc2Upe3RyeXtjb25zdCBsaWtlUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL3NvY2lhbENvbW11L2xpa2VGYXZvcml0ZUluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0SWQ6U3RyaW5nKHBvc3RJZCksa2luZEZsYWc6IjAifSk7aWYobGlrZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSl7dHJ5e2F3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1lbnRJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGlkOlN0cmluZyhwb3N0SWQpLHVzZXJJZDpTdHJpbmcodXNlcklkKSxjb21tZW50czoi5Y6J5a6zIixzZW5kVG9zOiJbXG5cbl0ifSk7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuWujOaIkCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSl7dHJ5e2NvbnN0IHNoYXJlUmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvYXJ0aWNsZS9zaGFyZS8iK3Bvc3RJZCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7aWYoc2hhcmVSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvmiJDlip8gKzEiKX1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvaW50ZWdyYWwvYWRqdXN0QnlTaGFyZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UmJnBvc3RJZCl7dHJ5e2F3YWl0IGh0dHBEZWxldGUoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZS9kZWxldGVBcnRpY2xlP2FydGljbGVJZD0iK3Bvc3RJZCsiJnBvc3RUeXBlPTEiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtyZXN1bHQuc3RlcHMucHVzaCgi5Yqo5oCB5bey5Yig6ZmkIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIoOmZpOW8guW4uDogIitlKX19fQpyZXN1bHQudG90YWxHYWluPXJlc3VsdC5zaWduaW5TY29yZStyZXN1bHQuYmxpbmRCb3hTY29yZStyZXN1bHQuaW50ZXJhY3RTY29yZTtyZXN1bHQuc3VjY2Vzcz10cnVlfWNhdGNoKGUpe3Jlc3VsdC5lcnJvcj1TdHJpbmcoZSk7cmVzdWx0LnN0ZXBzLnB1c2goIuaJp+ihjOW8guW4uDogIitlKX1yZXR1cm4gcmVzdWx0fQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFZFSElDTEVfQUNUSU9OX1RFWFQ9e2ZpbmQ6IuefreaMieWvu+i9piIsbG91ZEZpbmQ6Ium4o+esm+mXqueBryIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6rIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07CmZ1bmN0aW9uIHZlaGljbGVDaGVja1JlcyhyZXMsb2tNc2cpe2lmKHJlcyYmIXJlcy5lcnJvciYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnfTtjb25zdCBlcnJUZXh0PVN0cmluZygocmVzJiYocmVzLmVycm9yfHxyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwiIikudG9Mb3dlckNhc2UoKTtpZihyZXMmJnJlcy5lcnJvciYmL3RpbWVvdXR8dGltZWQgb3V0fHRpbWUgb3V0fOivt+axgui2heaXti8udGVzdChlcnJUZXh0KSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnKyLvvIjlk43lupTotoXml7bkvYbovabovobpgJrluLjlt7LmiafooYzvvIzlj6/kuIvmi4nliLfmlrDnoa7orqTvvIkifTtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8KHJlcyYmcmVzLmVycm9yKXx8IuaMh+S7pOS4i+WPkeWksei0pSIsY29kZTpyZXMmJnJlcy5jb2RlfX0KYXN5bmMgZnVuY3Rpb24gdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpe3RyeXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7bGV0IHZpbj1hY2MudmluTm98fCIiO2lmKCF2aW4pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsYyk7aWYoIWxpc3R8fCFsaXN0Lmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq6I635Y+W5Yiw57uR5a6a6L2m6L6GKFZJTinvvIzor7fnoa7orqTotKblj7flt7Lnu5HlrprovabovoYifTt2aW49bGlzdFswXS52aW5Ob31jb25zdCBiYXNlPWJhc2VIZWFkZXJzKGFjYyk7aWYoYWN0aW9uPT09ImZpbmQiKXtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sIiIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2wvIit2aW4saCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuWvu+i9puaMh+S7pOW3suS4i+WPke+8jOi9pui+huW6lOmXqueBr+aPkOekuiIpfWlmKGFjdGlvbj09PSJsb3VkRmluZCIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe3BhcmFtOiI0Iix2aW46dmlufSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sVjIiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIum4o+esm+mXqueBr+aMh+S7pOW3suS4i+WPkSIpfWlmKGFjdGlvbj09PSJjdXNoaW9uIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7Y29tbW9uZDoiMjgiLGNvbW1vbmRQYXJhbToiMSIsdmN1OnZpbix2ZXJzaW9uOiJ2MiJ9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9wcm9wZXJ0eVR3by9vbmUiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuW8gOWdkOWeq+aMh+S7pOW3suS4i+WPke+8jOWdkOWeq+W6lOW8uei1tyIpfWlmKGFjdGlvbj09PSJ1bmxvY2sifHxhY3Rpb249PT0ibG9jayIpe2NvbnN0IHZLZXk9KGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKTtpZighdktleSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5bCa5pyq6YWN572u5LqR56uv5o6n6L2m5a+G6ZKl77ya6K+35Yiw44CM6K6+572uLeetvuWQjeWvhumSpemFjee9ruOAjeWhq+WGmeS6keerr+aOp+i9pkFFU+WvhumSpeW5tuS/neWtmOWQjuWGjeS9v+eUqOW8gC/lhbPplIEifTtpZighL15bMC05YS1mQS1GXXszMn0kLy50ZXN0KHZLZXkpKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLkupHnq6/mjqfovablr4bpkqXmoLzlvI/plJnor6/vvIjlupTkuLozMuS9jeWNgeWFrei/m+WItu+8ie+8jOivt+WIsOiuvue9rumhteaguOWvueWQjuS/neWtmCJ9O2NvbnN0IGxvY2tGbGFnPWFjdGlvbj09PSJ1bmxvY2siPyIxIjoiMCI7Y29uc3QgcGxhaW49J3tcbiAgImxvY2tGbGFnIiA6ICInK2xvY2tGbGFnKyciLFxuICAidmluTm8iIDogIicrdmluKyciXG59Jztjb25zdCBzZWNyZXQ9YWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbix2S2V5KTtjb25zdCBzZW5kQm9keT1KU09OLnN0cmluZ2lmeSh7c2VjcmV0OnNlY3JldH0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxwbGFpbixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvbmV0d29yay91bmxvY2siLGgsc2VuZEJvZHksMjUwMDApO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLGFjdGlvbj09PSJ1bmxvY2siPyLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiOiLkupHnq6/lhbPplIHmjIfku6Tlt7LkuIvlj5EiKX1yZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq55+l5pON5L2c57G75Z6LOiAiK2FjdGlvbn19Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuaOp+WItuW8guW4uDogIitTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGJhcmtQdXNoKGJhcmtLZXksdGl0bGUsYm9keSl7dHJ5e2xldCBzPVN0cmluZyhiYXJrS2V5fHwiIikudHJpbSgpLnJlcGxhY2UoL1wvKyQvLCIiKTtzPXMucmVwbGFjZSgvXmh0dHBzPzpcL1wvYXBpXC5kYXlcLmFwcFwvL2ksIiIpO2lmKCFzKXJldHVybntza2lwcGVkOnRydWV9O2xldCBiYXNlPSJodHRwczovL2FwaS5kYXkuYXBwIixrZXk9cztjb25zdCBtPXMubWF0Y2goL14oaHR0cHM/OlwvXC9bXi9dKylcLyguKykkL2kpO2lmKG0pe2Jhc2U9bVsxXTtrZXk9bVsyXX1rZXk9a2V5LnJlcGxhY2UoL15cLysvLCIiKTtjb25zdCB1PWJhc2UrIi8iK2VuY29kZVVSSUNvbXBvbmVudChrZXkpKyIvIitlbmNvZGVVUklDb21wb25lbnQodGl0bGUpKyIvIitlbmNvZGVVUklDb21wb25lbnQoYm9keSkrIj9ncm91cD1aRUVITyZzb3VuZD1iaXJkc29uZyI7cmV0dXJuIGF3YWl0IGh0dHBHZXQodSx7fSl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZyhlKX19fQoKLyogPT09PT09PT09PT09PT09PT0g5Luj55CG5qih5byP77yI5oyH5ZCR5Y6f6ISa5pysIHplZWhvLmJveCDlkI7nq6/vvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcHJveHlGZXRjaChwYXRoLG9wdHMpe2NvbnN0IHJhd0Jhc2U9Z2V0Q2ZnKCkuc2VydmVyQmFzZS5yZXBsYWNlKC9cLyskLywiIik7Y29uc3QgYmFzZT0od2luZG93Ll9fUEFORUxfTU9ERV9fJiYhcmF3QmFzZSk/IiI6cmF3QmFzZTtjb25zdCByPWF3YWl0IGZldGNoKGJhc2UrcGF0aCxvcHRzfHx7fSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX0KZnVuY3Rpb24gcHJveHlQb3N0KHBhdGgsYm9keSl7cmV0dXJuIHByb3h5RmV0Y2gocGF0aCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOnsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbiJ9LGJvZHk6SlNPTi5zdHJpbmdpZnkoYm9keXx8e30pfSl9Cgphc3luYyBmdW5jdGlvbiBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZyxsaW1pdCl7Y29uc3Qgb3V0PW5ldyBBcnJheShhY2NvdW50cy5sZW5ndGgpO2xldCBpPTA7YXN5bmMgZnVuY3Rpb24gd29ya2VyKCl7d2hpbGUoaTxhY2NvdW50cy5sZW5ndGgpe2NvbnN0IGlkeD1pKys7dHJ5e291dFtpZHhdPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjb3VudHNbaWR4XSxjZmcpfWNhdGNoKGUpe291dFtpZHhdPXt1c2VyTmFtZTphY2NvdW50c1tpZHhdLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjb3VudHNbaWR4XS51c2VySWQsc3VjY2VzczpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fX19Y29uc3Qgbj1NYXRoLm1heCgxLE1hdGgubWluKGxpbWl0fHwzLGFjY291bnRzLmxlbmd0aCkpO2F3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oe2xlbmd0aDpufSx3b3JrZXIpKTtyZXR1cm4gb3V0fQoKY29uc3QgQmFja2VuZD17CiAgYXN5bmMgc2VuZENvZGUocGhvbmUpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2VuZC1jb2RlIix7cGhvbmU6cGhvbmV9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i6aqM6K+B56CB5bey5Y+R6YCBIjoi5Y+R6YCB5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9hdXRoQ29kZS8iK2VuY29kZVVSSUNvbXBvbmVudChwaG9uZSk7CiAgICBjb25zdCBkPWF3YWl0IGh0dHBHZXQodXJsLHsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJHRVQiLHt9LCIiLGNmZyl9KTsKICAgIHJldHVybntvazpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCIsbWVzc2FnZTpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCI/IumqjOivgeeggeW3suWPkemAge+8jOivt+afpeaUtuefreS/oSI6KChkJiYoZC5tZXNzYWdlfHxkLm1zZykpfHwi5Y+R6YCB5aSx6LSlIil9OwogIH0sCiAgYXN5bmMgcGhvbmVMb2dpbihwaG9uZSxjb2RlLGJhc2ljQXV0aCl7CiAgICBjb25zdCBiYXNpYz1TdHJpbmcoYmFzaWNBdXRofHwiIikudHJpbSgpLnJlcGxhY2UoL15CYXNpY1xzKy9pLCIiKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3Bob25lLWxvZ2luIix7cGhvbmU6cGhvbmUsY29kZTpjb2RlLGJhc2ljQXV0aDpiYXNpY30pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLnmbvlvZXmiJDlip8iOiLnmbvlvZXlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHBheWxvYWQ9e3Bob25lOnBob25lLGF1dGhDb2RlOmNvZGV9OwogICAgY29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvdXNlci9sb2dpbkJ5UGhvbmUiOwogICAgY29uc3QgaGRyPXsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJQT1NUIix7fSxwYXlsb2FkLGNmZyl9OwogICAgaWYoYmFzaWMpaGRyWyJBdXRob3JpemF0aW9uIl09IkJhc2ljICIrYmFzaWM7CiAgICBjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QodXJsLGhkcixwYXlsb2FkLDIwMDAwKTsKICAgIGNvbnN0IHRva2VuSW5mbz1yZXMmJnJlcy5kYXRhJiZyZXMuZGF0YS50b2tlbkluZm87Y29uc3QgYWNjZXNzVG9rZW49dG9rZW5JbmZvJiZTdHJpbmcodG9rZW5JbmZvLmFjY2Vzc190b2tlbnx8IiIpOwogICAgaWYoIXJlc3x8U3RyaW5nKHJlcy5jb2RlKSE9PSIxMDAwMCJ8fCFhY2Nlc3NUb2tlbilyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi55m75b2V5aSx6LSl77yaIisoKHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCLpqozor4HnoIHmnInor6/miJblt7Lov4fmnJ8iKX07CiAgICBsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiOwogICAgdHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCIiLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2FjY2Vzc1Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkgwfSk7aWYoaW5mb1JlcyYmU3RyaW5nKGluZm9SZXMuY29kZSk9PT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcoaW5mb1Jlcy5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKGluZm9SZXMuZGF0YS5uaWNrTmFtZXx8IiIpO319Y2F0Y2goZSl7fQogICAgY29uc3QgbGlzdD1nZXRBY2NvdW50cygpO2xldCByZXBsYWNlZD1mYWxzZTsKICAgIGZvcihsZXQgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXtpZihsaXN0W2ldJiYoU3RyaW5nKGxpc3RbaV0udG9rZW58fCIiKT09PWFjY2Vzc1Rva2VufHwobGlzdFtpXS51c2VySWQmJnVzZXJJZCYmU3RyaW5nKGxpc3RbaV0udXNlcklkKT09PXVzZXJJZCkpKXtsaXN0W2ldLnRva2VuPWFjY2Vzc1Rva2VuO2lmKHVzZXJJZClsaXN0W2ldLnVzZXJJZD11c2VySWQ7aWYodXNlck5hbWUpbGlzdFtpXS51c2VyTmFtZT11c2VyTmFtZTtyZXBsYWNlZD10cnVlO2JyZWFrO319CiAgICBjb25zdCBuZXdBY2M9e3VzZXJOYW1lOnVzZXJOYW1lfHxwaG9uZSx1c2VySWQ6dXNlcklkLHRva2VuOmFjY2Vzc1Rva2VuLGJhcmtLZXk6IiIsdXNlckFnZW50OiIifTsKICAgIGlmKCFyZXBsYWNlZClsaXN0LnB1c2gobmV3QWNjKTsKICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgIHJldHVybntvazp0cnVlLG1lc3NhZ2U6cmVwbGFjZWQ/IueZu+W9leaIkOWKn++8jOW3suabtOaWsOivpei0puWPtyI6IueZu+W9leaIkOWKn++8jOW3sua3u+WKoOi0puWPtyJ9OwogIH0sCiAgYXN5bmMgZ2V0RGFzaGJvYXJkKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2RhdGEiKTsKICAgICAgaWYoZCYmZC5hY2NvdW50cylyZXR1cm57YWNjb3VudHM6ZC5hY2NvdW50cyx0aW1lc3RhbXA6ZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxjb25maWc6ZC5jb25maWd8fG51bGwsb2s6dHJ1ZX07CiAgICAgIHJldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLku6PnkIbmnI3liqHml6Dlk43lupQiLHJhdzpkfTsKICAgIH0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGRhdGE9YXdhaXQgZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsMyk7CiAgICByZXR1cm57YWNjb3VudHM6ZGF0YSx0aW1lc3RhbXA6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLG9rOnRydWV9OwogIH0sCiAgYXN5bmMgcnVuU2lnbmluKHVzZXJJZCxhbGwpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcnVuLXNpZ25pbiIsYWxsP3thbGw6dHJ1ZX06e3VzZXJJZDp1c2VySWR9KTtpZihkJiZkLnJlc3VsdHMpcmV0dXJue29rOnRydWUscmVzdWx0czpkLnJlc3VsdHN9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLmiafooYzlpLHotKUifX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IHJlc3VsdHM9W107Y29uc3QgdGFyZ2V0cz1hbGw/YWNjb3VudHM6YWNjb3VudHMuZmlsdGVyKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7CiAgICBpZighdGFyZ2V0cy5sZW5ndGgpcmV0dXJue29rOnRydWUscmVzdWx0czpbXX07CiAgICBmb3IoY29uc3QgYWNjIG9mIHRhcmdldHMpe2NvbnN0IHI9YXdhaXQgcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKTtyZXN1bHRzLnB1c2gocik7Y29uc3QgX2Q9bmV3IERhdGUoKTtjb25zdCBfZHM9X2QuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9kLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX2QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl9kLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X2RzLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6ci51c2VyTmFtZSx1c2VySWQ6ci51c2VySWQsc3VjY2VzczpyLnN1Y2Nlc3MsdG90YWxHYWluOnIudG90YWxHYWluLHNpZ25pblNjb3JlOnIuc2lnbmluU2NvcmUsYmxpbmRCb3hTY29yZTpyLmJsaW5kQm94U2NvcmUsaW50ZXJhY3RTY29yZTpyLmludGVyYWN0U2NvcmUsY29udGludWVEYXlzOnIuY29udGludWVEYXlzLGVycm9yOnIuZXJyb3Isc3RlcHM6ci5zdGVwc30pO2lmKHIuc3VjY2VzcyYmYWNjLmJhcmtLZXkmJlN0cmluZyhhY2MuYmFya0tleSkudHJpbSgpKXt0cnl7YXdhaXQgYmFya1B1c2goYWNjLmJhcmtLZXksIuaegeaguOetvuWIsOaIkOWKnyDCtyAiKyhyLnVzZXJOYW1lfHwiIiksIuS7iuaXpeiOt+W+lyAiK3IudG90YWxHYWluKyIg5YiG77yI562+5YiwIityLnNpZ25pblNjb3JlKyIgLyDnm7Lnm5IiK3IuYmxpbmRCb3hTY29yZSsiIC8g5LqS5YqoIityLmludGVyYWN0U2NvcmUrIu+8ie+8jOi/nuetviAiK3IuY29udGludWVEYXlzKyIg5aSpIil9Y2F0Y2goZSl7fX19CiAgICByZXR1cm57b2s6dHJ1ZSxyZXN1bHRzfTsKICB9LAogIGFzeW5jIHZlaGljbGVDdHJsKHVzZXJJZCxhY3Rpb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sIix7dXNlcklkOnVzZXJJZCxhY3Rpb246YWN0aW9ufSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpfX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2xldCBhY2M9YWNjb3VudHMuZmluZChhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpO2lmKCFhY2MmJmFjY291bnRzLmxlbmd0aClhY2M9YWNjb3VudHNbMF07aWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq5om+5Yiw6LSm5Y+377yM6K+35YWI5Zyo6K6+572u6aG15re75YqgIn07aWYoIVZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6Z2e5rOV5pON5L2c57G75Z6LIn07Y29uc3Qgcj1hd2FpdCB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyk7Y29uc3QgX3ZkPW5ldyBEYXRlKCk7Y29uc3QgX3Zkcz1fdmQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF92ZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF92ZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X3ZkLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X3Zkcyx0eXBlOiJ2ZWhpY2xlIixhY3Rpb246YWN0aW9uLGFjdGlvblRleHQ6VkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dfHwi6L2m6L6G5o6n5Yi2Iix1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ISFyLm9rLG1lc3NhZ2U6ci5tZXNzYWdlfHwiIixlcnJvcjpyLm9rPyIiOihyLm1lc3NhZ2V8fCLmjIfku6TlpLHotKUiKX0pO3JldHVybiByOwogIH0sCiAgYXN5bmMgZ2V0TG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9nZXQtbG9ncyIpO3JldHVybiBkJiZkLmxvZ3M/ZC5sb2dzOltdfXJldHVybiBnZXRMb2dzKCl9LAogIGFzeW5jIGNsZWFyTG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2NsZWFyLWxvZ3MiKTtyZXR1cm4gISFkLm9rfXJldHVybiBjbGVhckxvZ3MoKX0sCiAgYXN5bmMgc2F2ZUNvbmZpZyhjKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsYyk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUNmZyhjKX0sCiAgYXN5bmMgc2F2ZUFjY291bnRzKGxpc3Qpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtYWNjb3VudHMiLHthY2NvdW50czpsaXN0fSk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUFjY291bnRzKGxpc3QpfSwKICBhc3luYyBnZXRVc2VyaWQodG9rZW4pe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2dldC11c2VyaWQiLHt0b2tlbjp0b2tlbn0pO3JldHVybntvazohIWQub2ssdXNlcklkOmQudXNlcklkfHwiIix1c2VyTmFtZTpkLnVzZXJOYW1lfHwiIixlcnJvcjpkLmVycm9yfHwiIn19cmV0dXJuIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sZ2V0Q2ZnKCkpfSwKICBhc3luYyBnZXRDb25maWcoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvY29uZmlnIik7aWYoZCYmZC5jb25maWcpcmV0dXJue29rOnRydWUsY29uZmlnOmQuY29uZmlnfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi6I635Y+W6YWN572u5aSx6LSlIn19cmV0dXJue29rOnRydWUsY29uZmlnOmdldENmZygpfX0sCiAgYXN5bmMgZ2V0QWNjb3VudHNGdWxsKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FjY291bnRzIik7cmV0dXJuIEFycmF5LmlzQXJyYXkoZCYmZC5hY2NvdW50cyk/ZC5hY2NvdW50czpbXX1yZXR1cm4gZ2V0QWNjb3VudHMoKX0sCiAgYXN5bmMgYmFja3VwKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmFja3VwIik7cmV0dXJuIGQmJmQub2s/ZDpudWxsfQogICAgcmV0dXJue29rOnRydWUsYXBwOiLmnoHmoLhaRUVITyIsdHlwZToiemVlaG9fYmFja3VwIix2ZXJzaW9uOkFQUF9WRVJTSU9OLHRpbWU6Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLGFjY291bnRzOmdldEFjY291bnRzKCksY29uZmlnOmdldENmZygpfQogIH0sCiAgYXN5bmMgcmVzdG9yZUJhY2t1cChqc29uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2ltcG9ydCIse2pzb246anNvbn0pO3JldHVybiBkfHx7b2s6ZmFsc2UsZXJyb3I6IuWQjuerr+aXoOWTjeW6lCJ9fQogICAgdHJ5ewogICAgICBjb25zdCBiPXR5cGVvZiBqc29uPT09InN0cmluZyI/SlNPTi5wYXJzZShqc29uKTpqc29uOwogICAgICBpZighYnx8KGIudHlwZSE9PSJ6ZWVob19iYWNrdXAiJiYhQXJyYXkuaXNBcnJheShiLmFjY291bnRzKSkpcmV0dXJue29rOmZhbHNlLGVycm9yOiLlpIfku73moLzlvI/kuI3mraPnoa4ifTsKICAgICAgY29uc3QgbGlzdD0oYi5hY2NvdW50c3x8W10pLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCIiLHVzZXJJZDphLnVzZXJJZHx8IiIsdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXl8fCIiKSx1c2VyQWdlbnQ6YS51c2VyQWdlbnR8fCIifSkpOwogICAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICAgIGlmKGIuY29uZmlnJiZ0eXBlb2YgYi5jb25maWc9PT0ib2JqZWN0Iil7CiAgICAgICAgY29uc3QgY3VyPWdldENmZygpOwogICAgICAgIHNhdmVDZmcoewogICAgICAgICAgYXBwOnthcHBJZDpiLmNvbmZpZy5hcHA/LmFwcElkfHxjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5hcHA/LmFwcFNlY3JldHx8Y3VyLmFwcC5hcHBTZWNyZXR9LAogICAgICAgICAgaDU6e2FwcElkOmIuY29uZmlnLmg1Py5hcHBJZHx8Y3VyLmg1LmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5oNT8uYXBwU2VjcmV0fHxjdXIuaDUuYXBwU2VjcmV0fSwKICAgICAgICAgIGNvbW11bml0eTp7ZW5hYmxlUG9zdDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgICAgICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCksCiAgICAgICAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGIuY29uZmlnLmF1dG9SZWZyZXNoU2VjKSwKICAgICAgICAgIHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2UKICAgICAgICB9KTsKICAgICAgfQogICAgICByZXR1cm57b2s6dHJ1ZSxjb3VudDpsaXN0Lmxlbmd0aH07CiAgICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19CiAgfQp9OwovKiA9PT09PT09PT09PT09PT09PSDpnaLmnb/mlbDmja7lkIzmraXvvIjpnaLmnb/mqKHlvI/vvJrorr7nva7pobXku47ohJrmnKzlkI7nq6/or7votKblj7fkuI7phY3nva7vvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlSZW1vdGVDZmcoYyl7CiAgaWYoIWN8fHR5cGVvZiBjIT09Im9iamVjdCIpcmV0dXJuOwogIGNvbnN0IGxvY2FsPWdldENmZygpOwogIHNhdmVDZmcoewogICAgYXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fGxvY2FsLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8bG9jYWwuYXBwLmFwcFNlY3JldH0sCiAgICBoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fGxvY2FsLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fGxvY2FsLmg1LmFwcFNlY3JldH0sCiAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpLAogICAgYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSwKICAgIHNlcnZlckJhc2U6bG9jYWwuc2VydmVyQmFzZQogIH0pOwp9CmxldCBwYW5lbFN5bmNpbmc9ZmFsc2U7CmFzeW5jIGZ1bmN0aW9uIGVuc3VyZVBhbmVsRGF0YShmb3JjZSl7CiAgaWYoIWlzUHJveHlNb2RlKCl8fGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApcmV0dXJuOwogIGlmKHBhbmVsU3luY2luZylyZXR1cm47CiAgaWYoIWZvcmNlJiZTVEFURS5wYW5lbExvYWRlZClyZXR1cm47CiAgcGFuZWxTeW5jaW5nPXRydWU7CiAgdHJ5ewogICAgY29uc3QgW2MsYV09YXdhaXQgUHJvbWlzZS5hbGwoW0JhY2tlbmQuZ2V0Q29uZmlnKCksQmFja2VuZC5nZXRBY2NvdW50c0Z1bGwoKV0pOwogICAgaWYoYSYmYS5sZW5ndGgpe1NUQVRFLnBhbmVsQWNjb3VudHM9YX0KICAgIGlmKGMmJmMub2smJmMuY29uZmlnKWFwcGx5UmVtb3RlQ2ZnKGMuY29uZmlnKTsKICAgIFNUQVRFLnBhbmVsTG9hZGVkPXRydWU7CiAgfWNhdGNoKGUpe30KICBwYW5lbFN5bmNpbmc9ZmFsc2U7Cn0KLyogPT09PT09PT09PT09PT09PT0g5Zu+5qCHID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEk9ewpjaGVjazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiLz48L3N2Zz4nLAp4Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+JywKemFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLApsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz4nLAp1bmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA3LjUtMS43Ii8+PC9zdmc+JywKYmVsbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggOGE2IDYgMCAxIDAtMTIgMGMwIDctMyA5LTMgOWgxOHMtMy0yLTMtOSIvPjxwYXRoIGQ9Ik0xMy43IDIxYTIgMiAwIDAgMS0zLjQgMCIvPjwvc3ZnPicsCnZvbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0VjV6Ii8+PHBhdGggZD0iTTE1LjUgOC41YTUgNSAwIDAgMSAwIDdNMTguNSA1LjVhOSA5IDAgMCAxIDAgMTMiLz48L3N2Zz4nLApzZWF0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDRoMTR2N2E0IDQgMCAwIDEtNCA0SDlhNCA0IDAgMCAxLTQtNFY0eiIvPjxwYXRoIGQ9Ik05IDE1djVoNnYtNSIvPjwvc3ZnPicsCnBpbjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDB6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPicsCnRpcmU6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjUiLz48cGF0aCBkPSJNMTIgM3Y1LjVNMTIgMTUuNVYyMU0zIDEyaDUuNU0xNS41IDEySDIxIi8+PC9zdmc+JywKYm9sdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKdGhlcm1vOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNCAxNC43NlY1YTIgMiAwIDEgMC00IDB2OS43NmE0IDQgMCAxIDAgNCAweiIvPjwvc3ZnPicsCmNhbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIzIi8+PHBhdGggZD0iTTE2IDJ2NE04IDJ2NE0zIDEwaDE4Ii8+PC9zdmc+JywKY2FyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEzIDYuNSA3LjVBMiAyIDAgMCAxIDguNCA2aDcuMmEyIDIgMCAwIDEgMS45IDEuNUwxOSAxMyIvPjxwYXRoIGQ9Ik00IDEzaDE2YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEtMSAxaC0xYTIgMiAwIDEgMS00IDBIOWEyIDIgMCAxIDEtNCAwSDRhMSAxIDAgMCAxLTEtMXYtM2ExIDEgMCAwIDEgMS0xeiIvPjwvc3ZnPicsCnNjb290ZXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+JywKcGx1ZzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAydjZNMTUgMnY2TTcgOGgxMHY0YTUgNSAwIDAgMS0xMCAwVjh6TTEyIDE3djUiLz48L3N2Zz4nLApjbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTEyIDd2NWwzIDMiLz48L3N2Zz4nLAp3aWZpOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEyLjVhMTAgMTAgMCAwIDEgMTQgME04LjUgMTZhNSA1IDAgMCAxIDcgMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTkiIHI9IjEiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPicsCmFsZXJ0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiA5djRNMTIgMTdoLjAxIi8+PHBhdGggZD0iTTEwLjMgMy45IDEuOCAxOGEyIDIgMCAwIDAgMS43IDNoMTdhMiAyIDAgMCAwIDEuNy0zTDEzLjcgMy45YTIgMiAwIDAgMC0zLjQgMHoiLz48L3N2Zz4nLAp3YXJuOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzIDIgMjFoMjBMMTIgM3oiLz48cGF0aCBkPSJNMTIgMTB2NU0xMiAxOGguMDEiLz48L3N2Zz4nLAprdjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIi8+PHBhdGggZD0iTTcgOWgzTTE0IDE1aDNNMTAgOWguMDFNMTcgMTVoLjAxIi8+PC9zdmc+JywKa2V5Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjgiIGN5PSIxNSIgcj0iNC41Ii8+PHBhdGggZD0iTTExLjIgMTEuOCAyMCAzTTE2IDdsMyAzTTEzIDEwbDIgMiIvPjwvc3ZnPicsCnVzZXJzOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjkiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIgMjFhNyA3IDAgMCAxIDE0IDBNMTYgNC42YTQgNCAwIDAgMSAwIDYuOE0xOSAyMWE2LjUgNi41IDAgMCAwLTMtNS41Ii8+PC9zdmc+JywKbWFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDMgMy41IDV2MTZMOSAxOWw2IDIgNS41LTJWM0wxNSA1IDkgM3oiLz48cGF0aCBkPSJNOSAzdjE2TTE1IDV2MTYiLz48L3N2Zz4nCn07CgovKiA9PT09PT09PT09PT09PT09PSDln7rnoYAgVUkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHRvYXN0VGltZXI9bnVsbDsKZnVuY3Rpb24gdG9hc3QobXNnLHR5cGUpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0b2FzdCIpO2VsLmNsYXNzTmFtZT10eXBlfHwiaW5mbyI7ZWwuaW5uZXJIVE1MPSh0eXBlPT09ImVyciI/SS54OnR5cGU9PT0ib2siP0kuY2hlY2s6SS53aWZpKSsnPHNwYW4+Jytlc2MobXNnKSsnPC9zcGFuPic7cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT5lbC5jbGFzc0xpc3QuYWRkKCJzaG93IikpO2NsZWFyVGltZW91dCh0b2FzdFRpbWVyKTt0b2FzdFRpbWVyPXNldFRpbWVvdXQoKCk9PmVsLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKSwyNjAwKX0KZnVuY3Rpb24gY29uZmlybURpYWxvZyh0aXRsZSxkZXNjLG9uWWVzLHllc1R4dCl7Y29uc3QgbGF5ZXI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpO2xheWVyLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY29uZmlybSI+PGRpdiBjbGFzcz0iY3QiPicrZXNjKHRpdGxlKSsnPC9kaXY+PGRpdiBjbGFzcz0iY2QiPicrZGVzYysnPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKSI+5Y+W5raIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0ieWVzIiBvbmNsaWNrPSJjbG9zZUNvbmZpcm0oKTsoJytvblllcysnKSgpIj4nK2VzYyh5ZXNUeHR8fCLnoa7lrpoiKSsnPC9idXR0b24+PC9kaXY+PC9kaXY+JztsYXllci5jbGFzc0xpc3QucmVtb3ZlKCJoaWRkZW4iKX0KZnVuY3Rpb24gY2xvc2VDb25maXJtKCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpLmNsYXNzTGlzdC5hZGQoImhpZGRlbiIpfQpmdW5jdGlvbiBvcGVuU2hlZXQodGl0bGUsaWNvbixodG1sKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRUaXRsZSIpLmlubmVySFRNTD1pY29uKyc8c3Bhbj4nK2VzYyh0aXRsZSkrJzwvc3Bhbj4nO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJvZHkiKS5pbm5lckhUTUw9aHRtbDtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iaGlkZGVuIn0KZnVuY3Rpb24gY2xvc2VTaGVldCgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSIifQpmdW5jdGlvbiBmbXRUaW1lKGlzbyl7dHJ5e2NvbnN0IGQ9bmV3IERhdGUoaXNvKTtjb25zdCBwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIik7cmV0dXJuIGQuZ2V0RnVsbFllYXIoKSsiLSIrcChkLmdldE1vbnRoKCkrMSkrIi0iK3AoZC5nZXREYXRlKCkpKyIgIitwKGQuZ2V0SG91cnMoKSkrIjoiK3AoZC5nZXRNaW51dGVzKCkpKyI6IitwKGQuZ2V0U2Vjb25kcygpKX1jYXRjaChlKXtyZXR1cm4iIn19CgovKiA9PT09PT09PT09PT09PT09PSDpobXpnaLliIfmjaIgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gc3dpdGNoVGFiKHRhYil7CiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiLnRhYiIpLmZvckVhY2godD0+dC5jbGFzc0xpc3QudG9nZ2xlKCJvbiIsdC5kYXRhc2V0LnRhYj09PXRhYikpOwogIGNvbnN0IHBhZ2VzPXtob21lOiJwYWdlSG9tZSIsbG9nczoicGFnZUxvZ3MiLGNmZzoicGFnZUNmZyJ9OwogIE9iamVjdC5rZXlzKHBhZ2VzKS5mb3JFYWNoKGs9Pntjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChwYWdlc1trXSk7ZWwuY2xhc3NMaXN0LnRvZ2dsZSgiaGlkZGVuIixrIT09dGFiKX0pOwogIGlmKHRhYj09PSJsb2dzIilyZW5kZXJMb2dzKCk7CiAgaWYodGFiPT09ImNmZyIpcmVuZGVyQ2ZnKCk7Cn0KCi8qID09PT09PT09PT09PT09PT09IOiHquWKqOWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwpsZXQgcmVmcmVzaFRpbWVyPW51bGwscmVmcmVzaExlZnQ9NjA7CmZ1bmN0aW9uIHN0YXJ0QXV0b1JlZnJlc2goc2VjKXtzdG9wQXV0b1JlZnJlc2goKTtyZWZyZXNoTGVmdD1zZWN8fGdldENmZygpLmF1dG9SZWZyZXNoU2VjO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hUaW1lcj1zZXRJbnRlcnZhbCgoKT0+e3JlZnJlc2hMZWZ0LS07aWYocmVmcmVzaExlZnQ8PTApe3JlZnJlc2hMZWZ0PTA7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHVwZGF0ZUNvdW50Q2hpcCgpfSwxMDAwKX0KZnVuY3Rpb24gc3RvcEF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXtjbGVhckludGVydmFsKHJlZnJlc2hUaW1lcik7cmVmcmVzaFRpbWVyPW51bGx9fQpmdW5jdGlvbiB1cGRhdGVDb3VudENoaXAoKXtjb25zdCBjaGlwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudENoaXAiKTtjb25zdCB0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50VHh0Iik7Y29uc3QgYXJjPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudEFyYyIpO2NvbnN0IHNlYz1nZXRDZmcoKS5hdXRvUmVmcmVzaFNlY3x8NjA7aWYoIWNoaXApcmV0dXJuO2lmKHJlZnJlc2hUaW1lcil7Y2hpcC5jbGFzc0xpc3QuYWRkKCJvbiIpO3R4dC50ZXh0Q29udGVudD1yZWZyZXNoTGVmdCsicyI7Y29uc3QgQz0yKk1hdGguUEkqNS42O2FyYy5zZXRBdHRyaWJ1dGUoInN0cm9rZS1kYXNob2Zmc2V0IixTdHJpbmcoQyooMS1yZWZyZXNoTGVmdC9zZWMpKSl9ZWxzZXtjaGlwLmNsYXNzTGlzdC5yZW1vdmUoIm9uIik7dHh0LnRleHRDb250ZW50PSLmiYvliqgifX0KZnVuY3Rpb24gdG9nZ2xlQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpc3RvcEF1dG9SZWZyZXNoKCk7ZWxzZSBzdGFydEF1dG9SZWZyZXNoKCk7dXBkYXRlQ291bnRDaGlwKCl9CgovKiA9PT09PT09PT09PT09PT09PSDkuIvmi4nliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KKGZ1bmN0aW9uKCl7Y29uc3Qgd3JhcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyV3JhcCIpLGluZD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRySW5kIiksdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJUeHQiKSxzcGluPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJTcGluIik7bGV0IHN0YXJ0WT0wLHB1bGxpbmc9ZmFsc2UsZGlzdGFuY2U9MDtjb25zdCBUSD02NDsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaHN0YXJ0IixlPT57aWYod2luZG93LnNjcm9sbFk8PTAmJmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpJiYhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJoaWRkZW4iKSl7c3RhcnRZPWUudG91Y2hlc1swXS5jbGllbnRZO3B1bGxpbmc9dHJ1ZTtkaXN0YW5jZT0wfX0se3Bhc3NpdmU6dHJ1ZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNobW92ZSIsZT0+e2lmKCFwdWxsaW5nKXJldHVybjtjb25zdCBkeT1lLnRvdWNoZXNbMF0uY2xpZW50WS1zdGFydFk7aWYoZHk+MCYmd2luZG93LnNjcm9sbFk8PTApe2Rpc3RhbmNlPU1hdGgubWluKGR5KjAuNSw5MCk7aW5kLnN0eWxlLmhlaWdodD1kaXN0YW5jZSsicHgiO2luZC5jbGFzc0xpc3QuYWRkKCJwdWxsaW5nIik7c3Bpbi5zdHlsZS50cmFuc2Zvcm09InJvdGF0ZSgiKyhkaXN0YW5jZSozLjYpKyJkZWcpIjt0eHQudGV4dENvbnRlbnQ9ZGlzdGFuY2U+PVRIPyLmnb7lvIDliLfmlrAiOiLkuIvmi4nliLfmlrAiO2lmKGRpc3RhbmNlPj1USCYmIWUuY2FuY2VsYWJsZSlyZXR1cm47aWYoZGlzdGFuY2U+PVRIJiZlLmNhbmNlbGFibGUpZS5wcmV2ZW50RGVmYXVsdCgpfX0se3Bhc3NpdmU6ZmFsc2V9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaGVuZCIsKCk9PntpZighcHVsbGluZylyZXR1cm47cHVsbGluZz1mYWxzZTtpZihkaXN0YW5jZT49VEgpe3R4dC50ZXh0Q29udGVudD0i5Yi35paw5Lit4oCmIjtpbmQuc3R5bGUuaGVpZ2h0PSI0NnB4IjtzcGluLmNsYXNzTGlzdC5hZGQoInNwaW5uZXIiKTtyZWZyZXNoQWxsKHRydWUpLmZpbmFsbHkoKCk9PntpbmQuc3R5bGUuaGVpZ2h0PSIwIjtpbmQuY2xhc3NMaXN0LnJlbW92ZSgicHVsbGluZyIpfSl9ZWxzZXtpbmQuc3R5bGUuaGVpZ2h0PSIwIn1kaXN0YW5jZT0wfSx7cGFzc2l2ZTp0cnVlfSk7Cn0pKCk7CgovKiA9PT09PT09PT09PT09PT09PSDpppbpobXmuLLmn5MgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFNUQVRFPXtkYXRhOltdLHRpbWVzdGFtcDoiIix0c1RleHQ6IiIscmVmcmVzaFNlYzo2MCxwcm94eTpmYWxzZSxwYW5lbEFjY291bnRzOm51bGwscGFuZWxMb2FkZWQ6ZmFsc2V9OwpmdW5jdGlvbiBza2VsZXRvbkhvbWUoKXtyZXR1cm4gJzxkaXYgY2xhc3M9Imhlcm8iIHN0eWxlPSJoZWlnaHQ6MTMycHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc0MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NjAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+J30KZnVuY3Rpb24gc2Nvb3RlckZhbGxiYWNrKCl7cmV0dXJuICc8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+J30KCmZ1bmN0aW9uIHJlbmRlckhvbWUoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtjb25zdCBkYXRhPVNUQVRFLmRhdGE7CiAgZWwuaW5uZXJIVE1MPXNrZWxldG9uSG9tZSgpOwogIGlmKGRhdGEubGVuZ3RoPT09MCl7CiAgICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48ZGl2IGNsYXNzPSJlLWljb24iPicrSS5jYXIrJzwvZGl2PjxoMz7ov5jmsqHmnInmnoHmoLjotKblj7c8L2gzPjxwPuWOu+OAjOiuvue9ruOAjemhtea3u+WKoOi0puWPt++8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIFRva2Vu77yIQmVhcmVyIOWJjee8gOS8muiHquWKqOWOu+aOie+8ie+8jOWGjeeCueOAjOiOt+WPlklE44CN5Y2z5Y+v6Ieq5Yqo5aGr5YWF55So5oi3SUTjgII8L3A+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5Y675re75Yqg6LSm5Y+3PC9idXR0b24+PC9kaXY+JzsKICAgIHJldHVybjsKICB9CiAgY29uc3QgdG90YWxTY29yZT1kYXRhLnJlZHVjZSgocyxhKT0+cysoYS5zY29yZXx8MCksMCk7CiAgY29uc3Qgc2lnbmVkQ291bnQ9ZGF0YS5maWx0ZXIoYT0+YS5zaWduZWRUb2RheSkubGVuZ3RoOwogIGNvbnN0IGNhcmRzPWRhdGEubWFwKChhLGlkeCk9PnJlbmRlckFjY291bnRDYXJkKGEsaWR4KSkuam9pbigiIik7CiAgY29uc3QgcHJveHlIaW50PVNUQVRFLnByb3h5Pyc8ZGl2IGNsYXNzPSJjZmctbm90ZSIgc3R5bGU9Im1hcmdpbi1ib3R0b206MTRweCI+PGI+Jysod2luZG93Ll9fUEFORUxfTU9ERV9fPyLpnaLmnb/mqKHlvI8iOiLku6PnkIbmqKHlvI8iKSsnPC9iPu+8muaVsOaNrueUseacrOacuuiEmuacrOWQjuerr+etvuWQjeS4juiOt+WPluOAgjwvZGl2Pic6IiI7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJoZXJvIj48ZGl2IGNsYXNzPSJoZXJvLXRvcCI+PGRpdiBjbGFzcz0iaGVyby1zY29yZSI+PGRpdiBjbGFzcz0ibGJsIj7otKblj7fmgLvnp6/liIY8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwgbnVtIiBpZD0idG90YWxTY29yZSI+Jyt0b3RhbFNjb3JlLnRvTG9jYWxlU3RyaW5nKCkrJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9Imhlcm8tcmlnaHQiPjxkaXYgY2xhc3M9ImJpZyBudW0iPicrc2lnbmVkQ291bnQrJzxzcGFuPiAvICcrZGF0YS5sZW5ndGgrJzwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJzdWIiPuS7iuaXpeW3suetvuWIsDwvZGl2PjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9Imhlcm8tc3RhdHMiPjxkaXYgY2xhc3M9ImhzdGF0IGN5YW4iPjxkaXYgY2xhc3M9InYgbnVtIj4nK2RhdGEuZmlsdGVyKGE9PmEudmVoaWNsZSYmYS52ZWhpY2xlLmhhc1ZlaGljbGUpLmxlbmd0aCsnPC9kaXY+PGRpdiBjbGFzcz0ibCI+57uR5a6a6L2m6L6GPC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0iaHN0YXQgZ3JlZW4iPjxkaXYgY2xhc3M9InYgbnVtIj4nK2RhdGEuZmlsdGVyKGE9PmEudG9rZW5WYWxpZCE9PWZhbHNlKS5sZW5ndGgrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPlRva2VuIOato+W4uDwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PicKICArcHJveHlIaW50CiAgKyc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kuY2FyKyfotKblj7fnirbmgIE8L2Rpdj4nK2NhcmRzCiAgKyc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyDmlbDmja7mm7TmlrAgJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vZ2l0aHViLmNvbS9tbGluazc5OC9aRUVITyIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPuS9nOiAhSBsdWNreSDCtyBHaXRIdWI8L2E+IMK3IDxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtTwvYT4gwrcg5LuF5L6b5a2m5Lmg56CU56m2PC9kaXY+JzsKfQoKZnVuY3Rpb24gcmluZ1N2ZyhwY3Qsc2l6ZSl7Y29uc3Qgcj1zaXplLzItNjtjb25zdCBDPTIqTWF0aC5QSSpyO2NvbnN0IG9mZj1DKigxLU1hdGgubWF4KDAsTWF0aC5taW4oMTAwLHBjdCkpLzEwMCk7Y29uc3QgY29sPXBjdDw9MjA/IiNGOTcwNkEiOnBjdDw9NTA/IiNGN0I5NTUiOiIjMkJENEYyIjtyZXR1cm4gJzxkaXYgY2xhc3M9InZlaGljbGUtcmluZyI+PHN2ZyB2aWV3Qm94PSIwIDAgJytzaXplKycgJytzaXplKyciPjxjaXJjbGUgY2xhc3M9InRyYWNrIiBjeD0iJytzaXplLzIrJyIgY3k9Iicrc2l6ZS8yKyciIHI9IicrcisnIi8+PGNpcmNsZSBjbGFzcz0iYXJjIiBjeD0iJytzaXplLzIrJyIgY3k9Iicrc2l6ZS8yKyciIHI9IicrcisnIiBzdHJva2U9IicrY29sKyciIHN0cm9rZS1kYXNoYXJyYXk9IicrQy50b0ZpeGVkKDEpKyciIHN0cm9rZS1kYXNob2Zmc2V0PSInK29mZi50b0ZpeGVkKDEpKyciLz48L3N2Zz48ZGl2IGNsYXNzPSJwY3QiIHN0eWxlPSJjb2xvcjonK2NvbCsnIj4nK01hdGgucm91bmQocGN0KSsnJTwvZGl2PjwvZGl2Pid9CmZ1bmN0aW9uIHBvd2VyVGV4dChwLGwpe3A9U3RyaW5nKHB8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtsPVN0cmluZyhsfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7Y29uc3Qgb25WYWxzPVsiMSIsIm9uIiwidHJ1ZSIsIuW8gOacuiIsIm9wZW4iLCLmv4DmtLsiLCJhY2Nfb24iLCJhY2Mgb24iLCJwb3dlcl9vbiIsInBvd2VyIG9uIiwi5bey5byA5py6Iiwi5bey5LiK55S1Il07Y29uc3Qgb2ZmVmFscz1bIjAiLCJvZmYiLCJmYWxzZSIsIuWFs+acuiIsImNsb3NlZCIsIuW+heacuiIsImFjY19vZmYiLCJhY2Mgb2ZmIiwicG93ZXJfb2ZmIiwicG93ZXIgb2ZmIiwi5bey5YWz5py6Iiwi5bey5LiL55S1Il07aWYocCl7aWYob25WYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihvZmZWYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19aWYobCl7aWYoWyIwIiwi5pyq6ZSBIiwi5byA6ZSBIiwidW5sb2NrZWQiLCJmYWxzZSIsIm9wZW4iLCLlt7LlvIDplIEiLCLmnKrplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYoWyIxIiwi5bey6ZSBIiwi6ZSB6L2mIiwibG9ja2VkIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19cmV0dXJue3RleHQ6IueKtuaAgeacquefpSIsY2xzOiJvZmYifX0KZnVuY3Rpb24gb25saW5lVGV4dChvKXtjb25zdCBzPVN0cmluZyhvfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib24iLCJvbmxpbmUiLCJ0cnVlIiwi5Zyo57q/Iiwi5bey5Zyo57q/IiwiY29ubmVjdGVkIiwibm9ybWFsIl0uaW5jbHVkZXMocykpcmV0dXJuIuWcqOe6vyI7aWYoWyIwIiwib2ZmIiwib2ZmbGluZSIsImZhbHNlIiwi56a757q/Iiwi5pyq5Zyo57q/Iiwi5bey56a757q/IiwiZGlzY29ubmVjdCIsImRpc2Nvbm5lY3RlZCIsInNsZWVwIiwi5LyR55ygIl0uaW5jbHVkZXMocykpcmV0dXJuIuemu+e6vyI7cmV0dXJuIHN9CmZ1bmN0aW9uIGxvY2tUZXh0KGwpe2NvbnN0IHM9U3RyaW5nKGx8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtpZighcylyZXR1cm4iIjtpZihbIjAiLCLmnKrplIEiLCLlvIDplIEiLCJ1bmxvY2tlZCIsImZhbHNlIiwib3BlbiIsIuW3suW8gOmUgSIsIuacqumUgei9piJdLmluY2x1ZGVzKHMpKXJldHVybnt0ZXh0OiLmnKrplIHovaYiLGNsczoidW5sb2NrZWQifTtpZihbIjEiLCLlt7LplIEiLCLplIHovaYiLCJsb2NrZWQiLCJ0cnVlIiwiY2xvc2VkIiwi5bey6ZSB6L2mIl0uaW5jbHVkZXMocykpcmV0dXJue3RleHQ6IuW3sumUgei9piIsY2xzOiJsb2NrZWQifTtyZXR1cm57dGV4dDpzLGNsczoib2ZmIn19CmZ1bmN0aW9uIGN1c2hpb25UZXh0KGMpe2NvbnN0IHM9U3RyaW5nKGN8fCIiKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib3BlbiIsIm9wZW5lZCIsIm9uIiwidHJ1ZSIsIuW8gCIsIuW3suW8gCIsIuaJk+W8gCIsIuW8ueW8gCJdLmluY2x1ZGVzKHMudG9Mb3dlckNhc2UoKSkpcmV0dXJuIuWdkOWeq+W3suW8gCI7aWYoWyIwIiwiY2xvc2UiLCJjbG9zZWQiLCJvZmYiLCJmYWxzZSIsIuWFsyIsIuW3suWFsyIsIumXreWQiCIsIuWFs+mXrSJdLmluY2x1ZGVzKHMudG9Mb3dlckNhc2UoKSkpcmV0dXJuIuWdkOWeq+W3suWQiCI7cmV0dXJuIuWdkOWeq8K3IitzfQoKZnVuY3Rpb24gcmVuZGVyQWNjb3VudENhcmQoYSxpZHgpewogIGNvbnN0IHY9YS52ZWhpY2xlfHx7fTsKICBjb25zdCBibGluZERheT1hLmNvbnRpbnVlRGF5cz09PTA/MDooKGEuY29udGludWVEYXlzLTEpJTMwKSsxOwogIGNvbnN0IGJsaW5kUm91bmQ9YS5jb250aW51ZURheXM9PT0wPzA6TWF0aC5jZWlsKGEuY29udGludWVEYXlzLzMwKTsKICBjb25zdCBibGluZFBjdD1NYXRoLnJvdW5kKChibGluZERheS8zMCkqMTAwKTsKICBjb25zdCBibGluZFJlbWFpbj0zMC1ibGluZERheTsKICBjb25zdCB3ZWVrPWEubGFzdDcmJmEubGFzdDcubGVuZ3RoP2EubGFzdDcubWFwKGQ9Pic8ZGl2IGNsYXNzPSJkYXkgJysoZC5zaWduZWQ/Im9rIjoiIikrIiAiKyhkLmlzVG9kYXk/InRvZGF5IjoiIikrJyIgdGl0bGU9IicrZC5kYXRlKyciPjxzcGFuIGNsYXNzPSJkIj4nK2QuZGF0ZS5zbGljZSgzKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJtIj4nKyhkLnNpZ25lZD8i4pyTIjoi4oCUIikrJzwvc3Bhbj48L2Rpdj4nKS5qb2luKCIiKToiIjsKICBjb25zdCBpc0NoYXJnaW5nPXYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1IjsKICBsZXQgY2hhcmdlRXRhPSIiOwogIGlmKGlzQ2hhcmdpbmcmJnYudm9sdGFnZSYmdi5jdXJyZW50JiZ2LmN1cnJlbnQ+MCYmdi5iYXR0ZXJ5UGVyY2VudDwxMDApe2NvbnN0IHJlbWFpbldoPSgxMDAtdi5iYXR0ZXJ5UGVyY2VudCkvMTAwKjE0NDA7Y29uc3QgcG93ZXJXPXYudm9sdGFnZSp2LmN1cnJlbnQ7Y29uc3QgaG91cnM9cmVtYWluV2gvcG93ZXJXO2NoYXJnZUV0YT1ob3Vycz49MT8i57qmIitob3Vycy50b0ZpeGVkKDEpKyLlsI/ml7blhYXmu6EiOiLnuqYiK01hdGgucm91bmQoaG91cnMqNjApKyLliIbpkp/lhYXmu6EifQogIGNvbnN0IHB3PXBvd2VyVGV4dCh2LnBvd2VyU3RhdHVzLHYubG9ja1N0YXRlKTsKICBjb25zdCBvbmw9b25saW5lVGV4dCh2Lm9ubGluZXx8di5yaWRlU3RhdGUpOwogIGNvbnN0IGxrPWxvY2tUZXh0KHYubG9ja1N0YXRlKTsKICBjb25zdCBjcz1jdXNoaW9uVGV4dCh2LmN1c2hpb25TdGF0ZSk7CiAgY29uc3QgY29vcmRPaz1oYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpOwogIGNvbnN0IHNvY0NvbD12LmJhdHRlcnlQZXJjZW50PD0yMD8iI0Y5NzA2QSI6di5iYXR0ZXJ5UGVyY2VudDw9NTA/IiNGN0I5NTUiOiIjMkJENEYyIjsKICBjb25zdCBhY2NDb2xvcj0oYS51c2VyTmFtZXx8Ij8iKS5jaGFyQ29kZUF0KDApJTI9PT0wPyIiOiJ2aW8iOwogIGNvbnN0IHVpZFNob3J0PWEudXNlcklkPyJJRCAiK1N0cmluZyhhLnVzZXJJZCkuc2xpY2UoLTYpOiLmnKrloatJRCI7CiAgY29uc3QgYmFkZ2U9YS5zaWduZWRUb2RheT8nPHNwYW4gY2xhc3M9InBpbGwgb2siPicrSS5jaGVjaysn5bey562+5YiwPC9zcGFuPic6JzxzcGFuIGNsYXNzPSJwaWxsIG1pc3MiPuacquetvuWIsDwvc3Bhbj4nOwogIGNvbnN0IHRva0JhZGdlPWEudG9rZW5WYWxpZD09PWZhbHNlPyc8c3BhbiBjbGFzcz0icGlsbCBlcnIiIHN0eWxlPSJiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycikiPicrSS5hbGVydCsn5aSx5pWIPC9zcGFuPic6JzxzcGFuIGNsYXNzPSJwaWxsIGN5YW4iPlRva2VuIOato+W4uDwvc3Bhbj4nOwogIGNvbnN0IGVyckh0bWw9IiI7CiAgY29uc3QgdmVoU3c9di5oYXNWZWhpY2xlP3JlbmRlclZlaGljbGVTd2l0Y2godixpZHgpOiIiOwogIGNvbnN0IHZIdG1sPXYuaGFzVmVoaWNsZT9yZW5kZXJWZWhpY2xlSHRtbCh2LGlkeCxpc0NoYXJnaW5nLGNoYXJnZUV0YSxwdyxvbmwsbGssY3MsY29vcmRPayxzb2NDb2wpOic8ZGl2IGNsYXNzPSJuby12ZWhpY2xlIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij4nK0kuY2FyKycg6K+l6LSm5Y+35pyq57uR5a6a6L2m6L6GPC9kaXY+JzsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jYXJkIiBzdHlsZT0iYW5pbWF0aW9uLWRlbGF5OicrKGlkeCo2MCkrJ21zIj4nKwogICAgJzxkaXYgY2xhc3M9ImFjYy1oZWFkIj48ZGl2IGNsYXNzPSJhdmF0YXIgJythY2NDb2xvcisnIj4nK2VzYygoYS51c2VyTmFtZXx8Ij8iKVswXS50b1VwcGVyQ2FzZSgpKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJhY2MtaW5mbyI+PGRpdiBjbGFzcz0iYWNjLW5hbWUiPicrZXNjKGEudXNlck5hbWUpKyc8L2Rpdj48ZGl2IGNsYXNzPSJhY2Mtc3ViIj4nK3VpZFNob3J0Kyc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImFjYy1hY3Rpb25zIj4nK3Rva0JhZGdlK2JhZGdlKyc8L2Rpdj48L2Rpdj4nK2Vyckh0bWwrCiAgICAnPGRpdiBjbGFzcz0ia3BpLWdyaWQiPjxkaXYgY2xhc3M9ImtwaSBjMSI+PGRpdiBjbGFzcz0idiBudW0iPicrTnVtYmVyKGEuc2NvcmV8fDApLnRvTG9jYWxlU3RyaW5nKCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPuaAu+enr+WIhjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ia3BpIGMyIj48ZGl2IGNsYXNzPSJ2IG51bSI+KycrTnVtYmVyKGEudG9kYXlTY29yZXx8MCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPuS7iuaXpeenr+WIhjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ia3BpIGMzIj48ZGl2IGNsYXNzPSJ2IG51bSI+JytOdW1iZXIoYS5jb250aW51ZURheXN8fDApKyc8L2Rpdj48ZGl2IGNsYXNzPSJsIj7ov57nrb7lpKnmlbA8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImtwaSBjNCI+PGRpdiBjbGFzcz0idiBudW0iPicrYmxpbmRSZW1haW4rJzwvZGl2PjxkaXYgY2xhc3M9ImwiPui3neebsuebkjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iYmxpbmQiPjxkaXYgY2xhc3M9ImJsaW5kLXRvcCI+PHNwYW4+55uy55uS6L+b5bqm77yI56ysJytibGluZFJvdW5kKyfova7vvIk8L3NwYW4+PHNwYW4gY2xhc3M9InIgbnVtIj4nK2JsaW5kRGF5KycgLyAzMCDCtyAnK2JsaW5kUGN0KyclPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImJsaW5kLWJhciI+PGRpdiBjbGFzcz0iYmxpbmQtZmlsbCIgc3R5bGU9IndpZHRoOicrYmxpbmRQY3QrJyUiPjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0id2VlayI+PGRpdiBjbGFzcz0id2Vlay10b3AiPjxzcGFuPui/kSA3IOWkqeetvuWIsDwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJ3ZWVrLWdyaWQiPicrd2VlaysnPC9kaXY+PC9kaXY+JysKICAgIHZlaFN3K3ZIdG1sKwogICAgJzxkaXYgY2xhc3M9ImN0cmwtZ3JpZCI+JysKICAgICc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytpZHgrJyxcJ2ZpbmRcJyx0aGlzKSI+JytJLmJlbGwrJ+Wvu+i9pjwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJsb3VkRmluZCIgb25jbGljaz0iY3RybEFjdCgnK2lkeCsnLFwnbG91ZEZpbmRcJyx0aGlzKSI+JytJLnZvbCsn6bij56ybPC9idXR0b24+JysKICAgICc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImN1c2hpb24iIG9uY2xpY2s9ImN0cmxBY3QoJytpZHgrJyxcJ2N1c2hpb25cJyx0aGlzKSI+JytJLnNlYXQrJ+WdkOWeqzwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gdW5sb2NrIiBkYXRhLWFjdD0idW5sb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcraWR4KycsXCd1bmxvY2tcJyx0aGlzKSI+JytJLnVubG9jaysn5byA6ZSBPC9idXR0b24+JysKICAgICc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biBsb2NrIiBkYXRhLWFjdD0ibG9jayIgb25jbGljaz0iY3RybEFjdCgnK2lkeCsnLFwnbG9ja1wnLHRoaXMpIj4nK0kubG9jaysn5YWz6ZSBPC9idXR0b24+JysKICAgICc8L2Rpdj48L2Rpdj4nOwp9CgovKiA9PT09PT09PT09PT0g5aSa6L2m5YiH5o2iID09PT09PT09PT09PSAqLwpmdW5jdGlvbiByZW5kZXJWZWhpY2xlU3dpdGNoKHYsaWR4KXsKICBpZighdi52ZWhpY2xlc3x8di52ZWhpY2xlcy5sZW5ndGg8MilyZXR1cm4gIiI7CiAgY29uc3QgY3VyPXYuY3VycmVudFZpbnx8IiI7CiAgY29uc3QgaXRlbXM9di52ZWhpY2xlcy5tYXAoeD0+JzxidXR0b24gY2xhc3M9InZlaC1jaGlwJysoeC52aW5Obz09PWN1cj8iIG9uIjoiIikrJyIgb25jbGljaz0ic3dpdGNoVmVoaWNsZSgnK2lkeCsnLFwnJytlc2MoeC52aW5ObykrJ1wnKSI+Jytlc2MoeC5uYW1lKSsnPC9idXR0b24+Jykuam9pbigiIik7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJ2ZWgtc3dpdGNoIj48c3BhbiBjbGFzcz0idmVoLXN3LWxhYmVsIj7ovabovoY8L3NwYW4+JytpdGVtcysnPC9kaXY+JzsKfQphc3luYyBmdW5jdGlvbiBzd2l0Y2hWZWhpY2xlKGlkeCx2aW4pewogIGNvbnN0IHNyYz1TVEFURS5kYXRhW2lkeF07aWYoIXNyY3x8IXZpbilyZXR1cm47CiAgdHJ5ewogICAgbGV0IGQ7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3Qgcj1hd2FpdCBwcm94eUZldGNoKCIvYXBpL3ZlaGljbGU/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHNyYy51c2VySWR8fCIiKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pKTsKICAgICAgZD0ociYmci5vayk/ci5yZXN1bHQ6bnVsbDsKICAgIH1lbHNlewogICAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgYWNjPWdldEFjY291bnRzKClbaWR4XTsKICAgICAgaWYoIWFjYylyZXR1cm47CiAgICAgIGQ9YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2MsY2ZnLHZpbik7CiAgICB9CiAgICBpZihkJiZkLnZlaGljbGUmJmQudmVoaWNsZS5oYXNWZWhpY2xlKXsKICAgICAgU1RBVEUuZGF0YVtpZHhdPU9iamVjdC5hc3NpZ24oe30sU1RBVEUuZGF0YVtpZHhdLGQpOwogICAgICByZW5kZXJIb21lKCk7CiAgICB9CiAgfWNhdGNoKGUpe30KfQoKLyogPT09PT09PT09PT09IOearuiCpC/kuLvpopjliIfmjaIgPT09PT09PT09PT09ICovCmNvbnN0IFRIRU1FUz1bImRhcmsiLCJsaWdodCIsImdyZWVuIiwidmlvbGV0IiwiYW1iZXIiXTsKY29uc3QgVExBQkVMPXtkYXJrOiLmt7Hok50iLGxpZ2h0OiLmtYXoibIiLGdyZWVuOiLnv6Hnv6AiLHZpb2xldDoi57Sr572X5YWwIixhbWJlcjoi55Cl54+AIn07CmZ1bmN0aW9uIHRoZW1lTGFiZWwodCl7cmV0dXJuIFRMQUJFTFt0XXx8dH0KZnVuY3Rpb24gdG9nZ2xlVGhlbWUoKXsKICBjb25zdCBjdXI9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmdldEF0dHJpYnV0ZSgiZGF0YS10aGVtZSIpfHwiZGFyayI7CiAgY29uc3QgaT1USEVNRVMuaW5kZXhPZihjdXIpO2NvbnN0IG5leHQ9VEhFTUVTWyhpPDA/MDppKzEpJVRIRU1FUy5sZW5ndGhdOwogIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoImRhdGEtdGhlbWUiLG5leHQpOwogIHRyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemVlaG9fdGhlbWUiLG5leHQpfWNhdGNoKGUpe30KICBjb25zdCBiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0aGVtZUZhYiIpO2lmKGIpYi50aXRsZT0i5Li76aKY77yaIit0aGVtZUxhYmVsKG5leHQpKyLvvIjngrnlh7vliIfmjaLvvIkiOwp9CmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBsZXQgdD0iZGFyayI7CiAgdHJ5e3Q9bG9jYWxTdG9yYWdlLmdldEl0ZW0oInplZWhvX3RoZW1lIil8fCJkYXJrIn1jYXRjaChlKXt9CiAgaWYoVEhFTUVTLmluZGV4T2YodCk8MCl0PSJkYXJrIjsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIix0KTsKICBjb25zdCBiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0aGVtZUZhYiIpO2lmKGIpYi50aXRsZT0i5Li76aKY77yaIit0aGVtZUxhYmVsKHQpKyLvvIjngrnlh7vliIfmjaLvvIkiOwp9CmZ1bmN0aW9uIG1vdW50VGhlbWVCdG4oKXsKICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidGhlbWVGYWIiKSlyZXR1cm47CiAgY29uc3QgYj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJidXR0b24iKTsKICBiLmlkPSJ0aGVtZUZhYiI7Yi5jbGFzc05hbWU9InRoZW1lLWZhYiI7Yi50ZXh0Q29udGVudD0iXHV7MUYzMTl9IjsKICBiLnRpdGxlPSLkuLvpopjvvJrmt7Hok53vvIjngrnlh7vliIfmjaLvvIkiO2Iub25jbGljaz10b2dnbGVUaGVtZTsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CgoKCmZ1bmN0aW9uIHJlbmRlclZlaGljbGVIdG1sKHYsaWR4LGlzQ2hhcmdpbmcsY2hhcmdlRXRhLHB3LG9ubCxsayxjcyxjb29yZE9rLHNvY0NvbCl7CiAgbGV0IGg9JzxkaXYgY2xhc3M9InZlaGljbGUiIG9uY2xpY2s9InNob3dWZWhpY2xlRGV0YWlsKCcraWR4KycpIj4nKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLXRvcCI+JytyaW5nU3ZnKHYuYmF0dGVyeVBlcmNlbnQsNzQpKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLW1ldGEiPjxkaXYgY2xhc3M9InZlaGljbGUtbmFtZSI+Jytlc2Modi52ZWhpY2xlTmFtZXx8IuaegeaguOi9pui+hiIpKyc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ2ZWhpY2xlLXZpbiI+PHNwYW4gaWQ9InZpblR4dF8nK2lkeCsnIj4nK2VzYyhtYXNrVmluKHYudmluTm8pKSsnPC9zcGFuPjxidXR0b24gY2xhc3M9InZpbi1zaG93IiBpZD0idmluQnRuXycraWR4KyciIG9uY2xpY2s9ImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RvZ2dsZVZpbignK2lkeCsnKSI+5pi+56S6PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0idmVoaWNsZS1iYWRnZXMiPicrCiAgKG9ubD8nPHNwYW4gY2xhc3M9InBpbGwgJysob25sPT09IuWcqOe6vyI/Im9rIjoiZ3JheSIpKyciPicrSS53aWZpKyhvbmw9PT0i5Zyo57q/Ij8iIOWcqOe6vyI6IiAiK29ubCkrJzwvc3Bhbj4nOiIiKSsKICAoaXNDaGFyZ2luZz8nPHNwYW4gY2xhc3M9InBpbGwgb2siPicrSS5ib2x0KyflhYXnlLXkuK08L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgZ3JheSI+Jytlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpKyc8L3NwYW4+JykrCiAgKHB3LnRleHQ/JzxzcGFuIGNsYXNzPSJwaWxsICcrKHB3LmNscz09PSJvbiI/Im9rIjoiZ3JheSIpKyciPicrcHcudGV4dCsnPC9zcGFuPic6IiIpKwogICc8L2Rpdj48L2Rpdj48L2Rpdj4nOwogIGNvbnN0IHN0YXR1c2VzPVtdOwogIGlmKGxrLnRleHQpc3RhdHVzZXMucHVzaCgnPHNwYW4gY2xhc3M9InZzdGF0ICcrKGxrLmNscz09PSJsb2NrZWQiPyJsb2NrZWQiOiJ1bmxvY2tlZCIpKyciPicrKGxrLmNscz09PSJsb2NrZWQiP0kubG9jazpJLnVubG9jaykrJyAnK2VzYyhsay50ZXh0KSsnPC9zcGFuPicpOwogIGlmKGNzKXN0YXR1c2VzLnB1c2goJzxzcGFuIGNsYXNzPSJ2c3RhdCBzZWF0Ij4nK0kuc2VhdCsnICcrZXNjKGNzKSsnPC9zcGFuPicpOwogIGlmKHN0YXR1c2VzLmxlbmd0aCloKz0nPGRpdiBjbGFzcz0idnN0YXQtcm93Ij4nK3N0YXR1c2VzLmpvaW4oIiIpKyc8L2Rpdj4nOwogIGlmKGlzQ2hhcmdpbmcpaCs9JzxkaXYgY2xhc3M9ImNoYXJnZS1iYW5uZXIiPicrSS5ib2x0Kyc8c3BhbiBjbGFzcz0iY3QiPuWFheeUteS4rSAnK3YuYmF0dGVyeVBlcmNlbnQrJyU8L3NwYW4+Jysodi5iYXR0ZXJ5UGVyY2VudD49MTAwPyc8c3BhbiBjbGFzcz0iY2UiPuW3suWFhea7oTwvc3Bhbj4nOihjaGFyZ2VFdGE/JzxzcGFuIGNsYXNzPSJjZSI+JytjaGFyZ2VFdGErJzwvc3Bhbj4nOiIiKSkrJzwvZGl2Pic7CiAgaCs9JzxkaXYgY2xhc3M9InZrcGktZ3JpZCI+JysKICAnPGRpdiBjbGFzcz0idmtwaSI+PGRpdiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nKyh2LmJhdHRlcnlQZXJjZW50fHwwKSsnJTwvZGl2PjxkaXYgY2xhc3M9ImwiPueUtemHjyBTT0M8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ2a3BpIj48ZGl2IGNsYXNzPSJ2IG51bSI+Jysodi5yYW5nZUVzdGltYXRlZD8i57qmIit2LnJlc2lkdWFsUmFuZ2VLbTp2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPue7reiIqiBrbTwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9InZrcGkiPjxkaXYgY2xhc3M9InYgbnVtIj4nKyh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6IjAiKSsnPC9kaXY+PGRpdiBjbGFzcz0ibCI+5LuK5pelIGttPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0idmtwaSI+PGRpdiBjbGFzcz0idiBudW0iPicrKHYudG9kYXlEdXJhdGlvbnx8MCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPumqkeihjCBtaW48L2Rpdj48L2Rpdj4nKwogICc8L2Rpdj4nOwogIGgrPSc8ZGl2IGNsYXNzPSJiYXR0LXRyYWNrIj48ZGl2IGNsYXNzPSJiYXR0LWZpbGwiIHN0eWxlPSJ3aWR0aDonK01hdGgubWF4KDAsTWF0aC5taW4oMTAwLHYuYmF0dGVyeVBlcmNlbnR8fDApKSsnJTtiYWNrZ3JvdW5kOicrc29jQ29sKyc7Y29sb3I6Jytzb2NDb2wrJyI+PC9kaXY+PC9kaXY+JzsKICBjb25zdCBtZXRhcz1bXTsKICBpZih2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLnRpcmUrJ+WJjSA8Yj4nK2VzYyh2LmZyb250UHJlc3N1cmUpKyc8L2I+Jysodi5mcm9udFRlbXA/JyA8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh2LmZyb250VGVtcCkrJzwvc3Bhbj4nOiIiKSsnPC9kaXY+Jyk7CiAgaWYodi5yZWFyUHJlc3N1cmUmJnYucmVhclByZXNzdXJlIT09Iuacque7keWumiIpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kudGlyZSsn5ZCOIDxiPicrZXNjKHYucmVhclByZXNzdXJlKSsnPC9iPicrKHYucmVhclRlbXA/JyA8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh2LnJlYXJUZW1wKSsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKTsKICBpZih2LnZvbHRhZ2UpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kuYm9sdCsnPGI+Jyt2LnZvbHRhZ2UudG9GaXhlZCgxKSsnVjwvYj48L2Rpdj4nKTsKICBpZihpc0NoYXJnaW5nJiZ2LmN1cnJlbnQpbWV0YXMucHVzaCgnPGRpdiBjbGFzcz0ibWV0YS1pdGVtIj4nK0kucGx1ZysnPGI+Jyt2LmN1cnJlbnQudG9GaXhlZCgxKSsnQTwvYj48L2Rpdj4nKTsKICBpZih2LmJhdHRlcnlUZW1wKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLnRoZXJtbysnPGI+Jyt2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrJ8KwQzwvYj48L2Rpdj4nKTsKICBpZih2LnNlcnZpY2VFbmREYXRlKW1ldGFzLnB1c2goJzxkaXYgY2xhc3M9Im1ldGEtaXRlbSI+JytJLmNhbCsnPGI+Jytlc2Modi5zZXJ2aWNlRW5kRGF0ZSkrJzwvYj48L2Rpdj4nKTsKICBpZihtZXRhcy5sZW5ndGgpaCs9JzxkaXYgY2xhc3M9Im1ldGEtcm93Ij4nK21ldGFzLmpvaW4oIiIpKyc8L2Rpdj4nOwogIGlmKHYuYWRkcmVzc3x8Y29vcmRPayloKz0nPGRpdiBjbGFzcz0idmVoaWNsZS1hZGRyIj4nK0kucGluKyc8c3BhbiBjbGFzcz0iYXQiPicrZXNjKHYuYWRkcmVzc3x8IuW3suiOt+WPliBHUFMg5a6a5L2NIikrKHYubG9jYXRpb25UaW1lPycgwrcgJytlc2Modi5sb2NhdGlvblRpbWUpOiIiKSsnPC9zcGFuPjxidXR0b24gY2xhc3M9Im1hcC1idG4iICcrKGNvb3JkT2s/J29uY2xpY2s9ImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJ+WcsOWbvjwvYnV0dG9uPjwvZGl2Pic7CiAgaCs9JzwvZGl2Pic7CiAgcmV0dXJuIGg7Cn0KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huivpuaDhSAmIOWcsOWbviA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBvcGVuTWFwKGlkeCl7Y29uc3Qgdj1TVEFURS5kYXRhW2lkeF0mJlNUQVRFLmRhdGFbaWR4XS52ZWhpY2xlO2lmKCF2KXJldHVybjtpZighaGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKSl7dG9hc3QoIuaaguaXoOacieaViCBHUFMg5Z2Q5qCHIiwiZXJyIik7cmV0dXJufWNvbnN0IHVybD0iaHR0cHM6Ly9tYXBzLmFwcGxlLmNvbS8/cT0iK051bWJlcih2LmxhdGl0dWRlKSsiLCIrTnVtYmVyKHYubG9uZ2l0dWRlKSsiJno9MTciO3dpbmRvdy5vcGVuKHVybCwiX2JsYW5rIil9CmZ1bmN0aW9uIHRvZ2dsZVZpbihpZHgpe2NvbnN0IHY9U1RBVEUuZGF0YVtpZHhdJiZTVEFURS5kYXRhW2lkeF0udmVoaWNsZTtpZighdnx8IXYudmluTm8pcmV0dXJuO2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aW5UeHRfIitpZHgpLGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluQnRuXyIraWR4KTtpZighZWx8fCFidG4pcmV0dXJuO2lmKGVsLnRleHRDb250ZW50LmluZGV4T2YoIioiKT49MCl7ZWwudGV4dENvbnRlbnQ9di52aW5ObztidG4udGV4dENvbnRlbnQ9IumakOiXjyJ9ZWxzZXtlbC50ZXh0Q29udGVudD1tYXNrVmluKHYudmluTm8pO2J0bi50ZXh0Q29udGVudD0i5pi+56S6In19CmZ1bmN0aW9uIHNob3dWZWhpY2xlRGV0YWlsKGlkeCl7CiAgY29uc3QgYT1TVEFURS5kYXRhW2lkeF07aWYoIWEpcmV0dXJuO2NvbnN0IHY9YS52ZWhpY2xlfHx7fTsKICBjb25zdCBwdz1wb3dlclRleHQodi5wb3dlclN0YXR1cyx2LmxvY2tTdGF0ZSk7CiAgY29uc3Qgcm93cz1bXTsKICBpZih2LnZpbk5vKXJvd3MucHVzaChbJ+i9puaetuWPtycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iIGlkPSJ2aW5EdGwiPicrZXNjKG1hc2tWaW4odi52aW5ObykpKyc8L3NwYW4+IDxidXR0b24gY2xhc3M9InZpbi1zaG93IiBvbmNsaWNrPSJ0b2dnbGVEdGxWaW4oKSI+5pi+56S6PC9idXR0b24+J10pOwogIHJvd3MucHVzaChbJ+WFheeUteeKtuaAgScsZXNjKHYuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiKV0pOwogIHJvd3MucHVzaChbJ+eUtea6kOeKtuaAgScsJzxzcGFuIHN0eWxlPSJjb2xvcjonKyhwdy5jbHM9PT0ib24iPyJ2YXIoLS1vaykiOiJ2YXIoLS10eHQyKSIpKyciPicrcHcudGV4dCsnPC9zcGFuPiddKTsKICBpZih2LnJpZGVTdGF0ZXx8di5vbmxpbmUpcm93cy5wdXNoKFsn6L2m6L6G54q25oCBJyxlc2Modi5yaWRlU3RhdGV8fHYub25saW5lKV0pOwogIHJvd3MucHVzaChbJ+eUtemHjyBTT0MnLCc8YiBzdHlsZT0iY29sb3I6Jysodi5iYXR0ZXJ5UGVyY2VudDw9MjA/InZhcigtLWVycikiOnYuYmF0dGVyeVBlcmNlbnQ8PTUwPyJ2YXIoLS13YXJuKSI6InZhcigtLWJyYW5kKSIpKyciPicrKHYuYmF0dGVyeVBlcmNlbnR8fDApKyclPC9iPiddKTsKICBpZih2LnZvbHRhZ2Upcm93cy5wdXNoKFsn55S15Y6LJyx2LnZvbHRhZ2UudG9GaXhlZCgxKSsiViJdKTsKICBpZih2LmN1cnJlbnQpcm93cy5wdXNoKFsn55S15rWBJyx2LmN1cnJlbnQudG9GaXhlZCgxKSsiQSJdKTsKICBpZih2LmJhdHRlcnlUZW1wKXJvd3MucHVzaChbJ+eUteaxoOa4qeW6picsdi5iYXR0ZXJ5VGVtcC50b0ZpeGVkKDApKyLCsEMiXSk7CiAgcm93cy5wdXNoKFsn5Ymp5L2Z57ut6IiqJywodi5yZXNpZHVhbFJhbmdlS218fDApKyIga20iKyh2LnJhbmdlRXN0aW1hdGVkPyLvvIjkvLDnrpfvvIkiOiIiKV0pOwogIHJvd3MucHVzaChbJ+S7iuaXpemqkeihjCcsKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKTowKSsiIGttIC8gIisodi50b2RheUR1cmF0aW9ufHwwKSsiIG1pbiJdKTsKICBpZigodi5mcm9udFByZXNzdXJlJiZ2LmZyb250UHJlc3N1cmUhPT0i5pyq57uR5a6aIil8fCh2LnJlYXJQcmVzc3VyZSYmdi5yZWFyUHJlc3N1cmUhPT0i5pyq57uR5a6aIikpcm93cy5wdXNoKFsn6IOO5Y6LJywn5YmNICcrZXNjKHYuZnJvbnRQcmVzc3VyZXx8Ii0iKSsnIC8g5ZCOICcrZXNjKHYucmVhclByZXNzdXJlfHwiLSIpXSk7CiAgaWYodi5hZGRyZXNzKXJvd3MucHVzaChbJ+i9pui+huS9jee9ricsJzxzcGFuIHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDAiPicrZXNjKHYuYWRkcmVzcykrJzwvc3Bhbj4nXSk7CiAgY29uc3QgZE9rPWhhc1ZhbGlkQ29vcmQodi5sYXRpdHVkZSx2LmxvbmdpdHVkZSk7CiAgaWYoZE9rKXJvd3MucHVzaChbJ0dQUyDlnZDmoIcnLCc8c3BhbiBjbGFzcz0idiBtb25vIj4nK051bWJlcih2LmxhdGl0dWRlKS50b0ZpeGVkKDYpKyIsICIrTnVtYmVyKHYubG9uZ2l0dWRlKS50b0ZpeGVkKDYpKyc8L3NwYW4+J10pOwogIGlmKHYubG9jYXRpb25UaW1lKXJvd3MucHVzaChbJ+acgOWQjuWumuS9jScsJzxzcGFuIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDAiPicrZXNjKHYubG9jYXRpb25UaW1lKSsnPC9zcGFuPiddKTsKICBpZih2LnNlcnZpY2VFbmREYXRlKXJvd3MucHVzaChbJ+acjeWKoeWIsOacnycsZXNjKHYuc2VydmljZUVuZERhdGUpXSk7CiAgU1RBVEUudmluRHRsUmF3PXYudmluTm98fCIiOwogIGNvbnN0IGh0bWw9cm93cy5tYXAocj0+JzxkaXYgY2xhc3M9InNyLWl0ZW0iPjxzcGFuIGNsYXNzPSJrIj4nK3JbMF0rJzwvc3Bhbj48c3BhbiBjbGFzcz0idiI+JytyWzFdKyc8L3NwYW4+PC9kaXY+Jykuam9pbigiIikrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjE2cHgiPjxidXR0b24gY2xhc3M9ImJ0biAnKyhkT2s/InByaW1hcnkiOiIiKSsnIiAnKyhkT2s/J29uY2xpY2s9ImNsb3NlU2hlZXQoKTtvcGVuTWFwKCcraWR4KycpIic6J2Rpc2FibGVkIHRpdGxlPSLmmoLml6DmnInmlYhHUFPlnZDmoIciJykrJz4nK0kubWFwKycg5Zyw5Zu+5p+l55yLPC9idXR0b24+PC9kaXY+JzsKICBvcGVuU2hlZXQoIui9pui+huivpuaDhSDCtyAiK2VzYyh2LnZlaGljbGVOYW1lfHwi5p6B5qC46L2m6L6GIiksSS5jYXIsaHRtbCk7Cn0KZnVuY3Rpb24gdG9nZ2xlRHRsVmluKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZpbkR0bCIpO2lmKCFlbClyZXR1cm47aWYoZWwudGV4dENvbnRlbnQuaW5kZXhPZigiKiIpPj0wKXtlbC50ZXh0Q29udGVudD1TVEFURS52aW5EdGxSYXc7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i6ZqQ6JePIn1lbHNle2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzaGVldEJvZHkgLnZpbi1zaG93JykudGV4dENvbnRlbnQ9IuaYvuekuiI7ZWwudGV4dENvbnRlbnQ9bWFza1ZpbihlbC50ZXh0Q29udGVudCl9fQovKiA9PT09PT09PT09PT09PT09PSDnrb7liLDmiafooYzvvIjpnaLmnb/lt7Lnp7vpmaTmiYvliqjnrb7liLDlhaXlj6PvvIzlrprml7bnrb7liLDnlLHohJrmnKwgY3JvbiDotJ/otKPvvIkgPT09PT09PT09PT09PT09PT0gKi8KCi8qID09PT09PT09PT09PT09PT09IOi9pui+huaOp+WItiA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYXx8IWEudXNlcklkKXt0b2FzdCgi6K+l6LSm5Y+357y65bCR55So5oi3SUQiLCJlcnIiKTtyZXR1cm59Y29uc3QgbmFtZXM9e2ZpbmQ6IuefreaMieWvu+i9pu+8iOi9pui+humXqueBr++8iSIsbG91ZEZpbmQ6Ium4o+esm+mXqueBr++8iOmrmOWjsOWvu+i9pu+8iSIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6r77yI5Z2Q5Z6r5Lya5by56LW377yJIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07Y29uc3QgbmFtZT1uYW1lc1thY3Rpb25dfHxhY3Rpb247Y29uZmlybURpYWxvZygi56Gu6K6k5omn6KGMICIrbmFtZSwi6K+l5oyH5Luk5Lya6YCa6L+HIDRHIOe9kee7nOecn+WunuaOp+WItuS9oOeahOi9pui+hu+8miIrZXNjKGEudXNlck5hbWUpKyLjgIIiLCdkb0N0cmwoJytpZHgrIiwnIithY3Rpb24rIicpIil9CmFzeW5jIGZ1bmN0aW9uIGRvQ3RybChpZHgsYWN0aW9uKXtjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgY2FyZD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIuYWNjLWNhcmQiKVtpZHhdO2NvbnN0IGJ0bj1jYXJkP2NhcmQucXVlcnlTZWxlY3RvcignLmN0cmwtYnRuW2RhdGEtYWN0PSInK2FjdGlvbisnIl0nKTpudWxsO2NvbnN0IG9sZD1idG4/YnRuLmlubmVySFRNTDoiIjtpZihidG4pe2J0bi5kaXNhYmxlZD10cnVlO2J0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLmlubmVySFRNTD1JLmNsb2NrfXRvYXN0KCLmjIfku6TkuIvlj5HkuK3igKYiLCJpbmZvIik7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDdHJsKGEudXNlcklkLGFjdGlvbik7aWYoYnRuKXtidG4uZGlzYWJsZWQ9ZmFsc2U7YnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4uaW5uZXJIVE1MPW9sZH1pZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLmjIfku6Tlt7LkuIvlj5EiLCJvayIpfWVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLmjIfku6TlpLHotKUiLCJlcnIiKX19CgovKiA9PT09PT09PT09PT09PT09PSDml6Xlv5fpobUgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvZ0ZpbHRlcj0iYWxsIjsKYXN5bmMgZnVuY3Rpb24gcmVuZGVyTG9ncygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlTG9ncyIpOwogIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ic2VjdGlvbi10aXRsZSI+JytJLmt2Kyfov5DooYzml6Xlv5c8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJsb2ctcGFuZWwiPjxkaXYgY2xhc3M9ImxvZy1oZWFkIj48aDM+JytJLmt2Kyc8c3Bhbj7mnIDov5EgNTAg5p2hPC9zcGFuPjwvaDM+PGRpdiBjbGFzcz0ibG9nLWZpbHRlcnMiPicrCiAgWyc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJhbGwiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ2FsbFwnKSI+5YWo6YOoPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0ic2lnbmluIj8ib24iOiIiKSsnIiBvbmNsaWNrPSJzZXRMb2dGaWx0ZXIoXCdzaWduaW5cJykiPuetvuWIsDwvYnV0dG9uPicsJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09InZlaGljbGUiPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3ZlaGljbGVcJykiPuaOp+i9pjwvYnV0dG9uPiddLmpvaW4oIiIpKwogICc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbGlzdCIgaWQ9ImxvZ0xpc3QiPjxkaXYgc3R5bGU9InBhZGRpbmc6NDBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L295Lit4oCmPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTRweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgc3R5bGU9ImZsZXg6MSIgb25jbGljaz0iY2xlYXJMb2dzVUkoKSI+5riF56m65pel5b+XPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBsb2dzPWxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTA/REVNT19MT0dTOmF3YWl0IEJhY2tlbmQuZ2V0TG9ncygpO3JlbmRlckxvZ0xpc3QobG9ncyk7Cn0KZnVuY3Rpb24gc2V0TG9nRmlsdGVyKGYpe2xvZ0ZpbHRlcj1mO3JlbmRlckxvZ3MoKX0KZnVuY3Rpb24gcmVuZGVyTG9nTGlzdChsb2dzKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibG9nTGlzdCIpO2lmKCFlbClyZXR1cm47Y29uc3QgbGlzdD0obG9nc3x8W10pLmZpbHRlcihsPT57Y29uc3QgdD1sLnR5cGV8fCJzaWduaW4iO2lmKGxvZ0ZpbHRlcj09PSJhbGwiKXJldHVybiB0cnVlO3JldHVybiB0PT09bG9nRmlsdGVyfSk7aWYoIWxpc3QubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImxvZy1lbXB0eSI+JytJLndhcm4rJzxicj7or6XliIbnsbvkuIvmmoLml6Dml6Xlv5c8L2Rpdj4nO3JldHVybn1lbC5pbm5lckhUTUw9bGlzdC5tYXAoKGxvZyxpKT0+e2NvbnN0IHQ9bG9nLnR5cGV8fCJzaWduaW4iO2NvbnN0IHRhZz10PT09InZlaGljbGUiPyc8c3BhbiBjbGFzcz0icGlsbCBhbWJlciI+5o6n6L2mPC9zcGFuPic6JzxzcGFuIGNsYXNzPSJwaWxsIGN5YW4iPuetvuWIsDwvc3Bhbj4nO2xldCByZXM7aWYodD09PSJ2ZWhpY2xlIil7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLmFjdGlvblRleHR8fCLovabovobmjqfliLYiKSsnICcrKGxvZy5zdWNjZXNzPyLmiJDlip8iOiLlpLHotKXvvJoiK2VzYyhsb2cubWVzc2FnZXx8bG9nLmVycm9yfHwi5pyq55+lIikpKyc8L3NwYW4+J31lbHNle3Jlcz0nPHNwYW4gY2xhc3M9ImxvZy1yZXMgJysobG9nLnN1Y2Nlc3M/IiI6ImVyciIpKyciPicrKGxvZy5zdWNjZXNzPyLmiJDlip8gKyIrbG9nLnRvdGFsR2Fpbjoi5aSx6LSlOiAiKyhsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWNvbnN0IHN0ZXBzPWxvZy5zdGVwcz8obG9nLnN0ZXBzLm1hcChzPT4nPGRpdj48aT7CtzwvaT4nK2VzYyhzKSsnPC9kaXY+Jykuam9pbigiIikpOiIiO3JldHVybiAnPGRpdiBjbGFzcz0ibG9nLWl0ZW0iIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaSoyNSkrJ21zIj48ZGl2IGNsYXNzPSJsb2ctdGltZSI+Jytlc2MobG9nLnRpbWV8fCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ibG9nLW1haW4iPicrdGFnKyc8c3BhbiBjbGFzcz0ibG9nLXVzZXIiPicrZXNjKGxvZy51c2VyTmFtZXx8IiIpKyc8L3NwYW4+JytyZXMrJzwvZGl2PicrKHN0ZXBzPyc8ZGl2IGNsYXNzPSJsb2ctc3RlcHMiPicrc3RlcHMrJzwvZGl2Pic6IiIpKyc8L2Rpdj4nfSkuam9pbigiIil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc1VJKCl7Y29uZmlybURpYWxvZygi5riF56m65pel5b+XIiwi5bCG5Yig6Zmk5YWo6YOo6L+Q6KGM5pel5b+X77yM5q2k5pON5L2c5LiN5Y+v5oGi5aSN44CCIiwiY2xlYXJMb2dzTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGNsZWFyTG9nc05vdygpe2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuY2xlYXJMb2dzKCk7aWYob2spe3RvYXN0KCLml6Xlv5flt7LmuIXnqboiLCJvayIpO3JlbmRlckxvZ3MoKX1lbHNlIHRvYXN0KCLmuIXnqbrlpLHotKUiLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOiuvue9rumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgY2ZnQWNjb3VudHM9W107CmZ1bmN0aW9uIHJlbmRlckNmZygpewogIGlmKGlzUHJveHlNb2RlKCkmJmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik8MCYmIVNUQVRFLnBhbmVsTG9hZGVkKXsKICAgIGNvbnN0IGVsMD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogICAgaWYoZWwwKWVsMC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CGPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5q2j5Zyo5LuO6ISa5pys5ZCO56uv5ZCM5q2l6LSm5Y+35LiO6YWN572u4oCmPC9kaXY+PC9kaXY+JzsKICAgIGVuc3VyZVBhbmVsRGF0YSgpLnRoZW4oKCk9PnJlbmRlckNmZygpKTsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2ZnPWdldENmZygpO2NmZ0FjY291bnRzPShpc1Byb3h5TW9kZSgpJiZTVEFURS5wYW5lbEFjY291bnRzP1NUQVRFLnBhbmVsQWNjb3VudHM6Z2V0QWNjb3VudHMoKSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjphLnRva2VufHwiIixiYXJrS2V5OmEuYmFya0tleXx8IiJ9KSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICBjb25zdCBhY2NSb3dzPWNmZ0FjY291bnRzLm1hcCgoYSxpZHgpPT4nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VyTmFtZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VySWQpKyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW7vvIjnspjotLTljbPlj6/vvIzoh6rliqjljrvmjokgQmVhcmVyIOWJjee8gO+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudG9rZW4pKyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIznrb7liLDmiJDlip/mjqjpgIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEuYmFya0tleSkrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogIGNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eTsKICBjb25zdCBzdz0oaWQsbGFiZWwsc3ViLGNoZWNrZWQpPT4nPGxhYmVsIGNsYXNzPSJzd2l0Y2giPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9IicraWQrJyIgJysoY2hlY2tlZD8iY2hlY2tlZCI6IiIpKyc+PHNwYW4gY2xhc3M9InN3Ij48L3NwYW4+PHNwYW4gY2xhc3M9ImxibCI+JytsYWJlbCsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzYyI+JytzdWIrJzwvc3Bhbj48L2xhYmVsPic7CiAgZWwuaW5uZXJIVE1MPQogICc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua2V5Kyforr7nva48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7mlbDmja7mnI3liqE8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mnI3liqHlnLDlnYDvvIjnlZnnqbogPSDnm7Tov57mqKHlvI/vvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2Jhc2UiIHZhbHVlPSInK2VzYyhjZmcuc2VydmVyQmFzZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBodHRwOi8vemVlaG8uYm94IOaIliBodHRwOi8vMTkyLjE2OC4xLjEwOjgwODAiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48ZGl2IGNsYXNzPSJoaW50Ij7nlZnnqbrml7blupTnlKjlnKjmtY/op4jlmajlhoXnm7Tov57mnoHmoLggQVBJ77yI5L6d6LWW5pyN5Yqh56uv5pS+6KGMIENPUlPvvInvvJvloavlhaXljp/ohJrmnKzpnaLmnb/lnLDlnYDvvIjlpoIgTG9vbiDomZrmi5/ln5/lkI0gPGNvZGU+emVlaG8uYm94PC9jb2RlPu+8ieWNs+WIh+aNouS4uuS7o+eQhuaooeW8j++8jOeUseWOn+iEmuacrOi0n+i0o+etvuWQjeS4juWPluaVsOOAgjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPueci+adv+iHquWKqOWIt+aWsOmXtOmalO+8iOenku+8jDE1fjM2MDDvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJjZmdfcmVmcmVzaCIgbWluPSIxNSIgbWF4PSIzNjAwIiBzdGVwPSI1IiB2YWx1ZT0iJysoY2ZnLmF1dG9SZWZyZXNoU2VjfHw2MCkrJyI+PC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7nrb7lkI3lr4bpkqXphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkFwcCDnq68gYXBwSWQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2FwcF9pZCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwSWQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD5BcHAg56uvIGFwcFNlY3JldDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjZmdfYXBwX3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5hcHAuYXBwU2VjcmV0KSsnIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCI+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+SDUg56uvIGFwcElkPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNmZ19oNV9pZCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBJZCkrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPkg1IOerryBhcHBTZWNyZXQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2ZnX2g1X3NlY3JldCIgdmFsdWU9IicrZXNjKGNmZy5oNS5hcHBTZWNyZXQpKyciIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48L2Rpdj4nKwogICc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7kupHnq6/mjqfovaYgQUVTIOWvhumSpe+8iDMyIOS9jeWNgeWFrei/m+WItu+8jOW8gC/lhbPplIHlv4XloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJwYXNzd29yZCIgaWQ9ImNmZ192ZWhpY2xlX2tleSIgdmFsdWU9IicrZXNjKGNmZy52ZWhpY2xlQWVzS2V5KSsnIiBwbGFjZWhvbGRlcj0i5aGr5YaZ5bm25L+d5a2Y5ZCO5omN6IO95L2/55So5LqR56uv5byA6ZSBL+WFs+mUgSIgYXV0b2NvbXBsZXRlPSJvZmYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4Ij48ZGl2IGNsYXNzPSJoaW50Ij7nlKjkuo7lvIAv5YWz6ZSB5oql5paHIEFFUy0yNTYtRUNCIOWKoOWvhu+8jOWHuuS6juWuieWFqOm7mOiupOS4jeWGhee9ruOAgjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlQ2ZnVUkoKSI+5L+d5a2Y6YWN572uPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJyZXNldENmZ1VJKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+56S+5Yy65Lu75Yqh5byA5YWzPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIiBzdHlsZT0iZ2FwOjhweCI+JysKICBzdygiY29tbV9wb3N0Iiwi5Y+R5biD5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSkrc3coImNvbW1fbGlrZSIsIueCuei1nuWKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVMaWtlIT09ZmFsc2UpK3N3KCJjb21tX2NvbW1lbnQiLCLor4TorrrliqjmgIEiLCLkuI3liqDliIYiLGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKStzdygiY29tbV9zaGFyZSIsIuWIhuS6q+WKqOaAgSIsIisxIOWIhiIsY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKStzdygiY29tbV9kZWxldGUiLCLmiafooYzlkI7liKDpmaTliqjmgIEiLCLmuIXnkIbnl5Xov7kiLGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UpKwogICc8L2Rpdj48ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lhbPpl63lr7nlupTlvIDlhbPlkI7vvIznrb7liLDohJrmnKzlsIbot7Pov4for6Xku7vliqHjgILkv67mlLnlkI7ngrnlh7vkuIrmlrnjgIzkv53lrZjphY3nva7jgI3nlJ/mlYjjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7miYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIk8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwonPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5omL5py65Y+377yI5p6B5qC4IEFwcCDnu5Hlrprlj7fnoIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZWwiIGlkPSJwbF9waG9uZSIgcGxhY2Vob2xkZXI9IjExIOS9jeaJi+acuuWPtyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGxfY29kZSIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjhweCI+PGxhYmVsPueZu+W9lSBCYXNpYyBBdXRo77yI5Y+v6YCJ77yM5bey5YaF572u5p6B5qC4QXBw55qEY2xpZW505Yet5o2u77yM5LiA6Iis5peg6ZyA5aGr5YaZ77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InBsX2Jhc2ljIiBwbGFjZWhvbGRlcj0i6buY6K6k5bey5YaF572u77yM55WZ56m65Y2z5Y+vIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTJweCIgYXV0b2NvbXBsZXRlPSJvZmYiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNlbmRTbXNDb2RlKCkiIGlkPSJwbF9zZW5kX2J0biI+6I635Y+W6aqM6K+B56CBPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InBob25lTG9naW5VSSgpIiBpZD0icGxfbG9naW5fYnRuIj7nmbvlvZXlubbmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+55So5omL5py65Y+3ICsg55+t5L+h6aqM6K+B56CB55m75b2V77yM6Ieq5Yqo6I635Y+WIFRva2VuIOS4jueUqOaIt0lE5bm25Yqg5YWl6LSm5Y+35YiX6KGo77yM5YWo56iL5peg6ZyA5oqT5YyF44CC55m75b2V5oiQ5Yqf5ZCO6Ieq5Yqo5L+d5a2Y5bm25Yi35paw6aG16Z2i44CCPGJyPjxiPuW3suS/ruWkjTwvYj7vvJrnmbvlvZXlt7LlhoXnva7mnoHmoLhBcHDnmoQgY2xpZW50IOWHreaNruW5tuihpeWFqOecgeS7vS/ln47luIIv5a6a5L2N5a2X5q6177yI5LiOIEFwcCDor7fmsYLlrozlhajkuIDoh7TvvInjgII8YnI+PGI+5o+Q56S6PC9iPu+8muiLpeS7jeaPkOekuuOAjOmqjOivgeeggeacieivr+aIluW3sui/h+acn+OAje+8jOivt+WFiOWcqDxiPuaegeaguCBBcHA8L2I+6YeM6I635Y+W6aqM6K+B56CB77yIQXBwIOWPkeeggeW4pua7keWdl+mqjOivge+8jOmdouadv+WPkeeggei1sOWFjea7keWdl+mAmumBk++8ie+8jOaKiuefreS/oemHjOeahOmqjOivgeeggeWhq+WIsOmdouadv+eZu+W9leWNs+WPr+OAgjwvZGl2PicrCic8L2Rpdj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7otKblj7fnrqHnkIbvvIgnK2NmZ0FjY291bnRzLmxlbmd0aCsnIOS4qu+8iTwvaDM+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFkZEFjY291bnRVSSgpIj4rIOa3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0iYWNjTGlzdCI+JysoYWNjUm93c3x8JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjJweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pqC5peg6LSm5Y+377yM54K55Ye744CM5re75Yqg6LSm5Y+344CNPC9kaXY+JykrJzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVBY2NvdW50c1VJKCkiPuS/neWtmOaegeaguOi0puWPtzwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ub3RlIj48Yj7kvb/nlKjor7TmmI48L2I+PGJyPsK3IFRva2Vu77ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24g5YC85Y2z5Y+v77yM6Ieq5Yqo5Y675o6JIDxjb2RlPkJlYXJlciA8L2NvZGU+IOWJjee8gOOAgjxicj7CtyDojrflj5ZJRO+8muWhq+WFpSBUb2tlbiDlkI7ngrnjgIzojrflj5ZJROOAje+8jOiHquWKqOS7jiBINSBiYXNlSW5mbyAvIEFwcCBzZXR0aW5nIC8g6L2m6L6G5YiX6KGo5o6l5Y+j6Kej5p6Q55So5oi3SUTkuI7mmLXnp7DjgII8YnI+wrcgQmFyayBLZXnvvJror6XotKblj7fnrb7liLDmiJDlip/lkI7mjqjpgIHpgJrnn6XvvIznlZnnqbrkuI3mjqjjgII8YnI+wrcg5o6n6L2m5oyH5Luk77yI5a+76L2mL+m4o+esmy/lnZDlnqsv5byA5YWz6ZSB77yJ5Lya55yf5a6e5pON5L2c6L2m6L6G77yM6ZyA5LqM5qyh56Gu6K6k44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7lpIfku73otKblj7fphY3nva48L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZXhwb3J0QmFja3VwVUkoKSI+5LiA6ZSu5a+85Ye65aSH5Lu9PC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIiBvbmNsaWNrPSJjb3B5QmFja3VwVUkoKSI+5aSN5Yi25aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5aSH5Lu95YaF5a6577yI5YyF5ZCr5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5Y+v5aSN5Yi25L+d5a2Y77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImJhY2t1cEFyZWEiIHJvd3M9IjQiIHJlYWRvbmx5IHBsYWNlaG9sZGVyPSLngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI3nlJ/miJDigKYiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC90ZXh0YXJlYT48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHgiPjxsYWJlbD7mgaLlpI3lpIfku73vvIjnspjotLTlpIfku70gSlNPTiDlkI7ngrnmgaLlpI3vvIzlsIbopobnm5bnjrDmnInotKblj7fkuI7phY3nva7vvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iaW1wb3J0QXJlYSIgcm93cz0iNCIgcGxhY2Vob2xkZXI9IueymOi0tOWkh+S7vSBKU09O4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIGRhbmdlciIgb25jbGljaz0iaW1wb3J0QmFja3VwVUkoKSI+5oGi5aSN5aSH5Lu9PC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5aSH5Lu95YyF5ZCr5YWo6YOo6LSm5Y+377yI5pi156ewL+eUqOaIt0lEL1Rva2VuL0JhcmtLZXnvvInkuI7pnaLmnb/phY3nva7vvIjnrb7lkI3lr4bpkqUv56S+5Yy65Lu75Yqh5byA5YWzL+iHquWKqOWIt+aWsOetie+8ieOAguaNouacuuaIlumHjeijheWQjueymOi0tOWNs+WPr+S4gOmUrui/mOWOn++8jOaXoOmcgOmHjeaWsOaKk+WMheWhq+WGmeOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKfQovKiA9PT09PT09PT09PT09PT09PSDmiYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gc2VuZFNtc0NvZGUoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX3NlbmRfYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLlj5HpgIHkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zZW5kQ29kZShwaG9uZSk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTtsZXQgdD02MDtidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjsKICAgIGNvbnN0IGl2PXNldEludGVydmFsKCgpPT57dC0tO2lmKHQ8PTApe2NsZWFySW50ZXJ2YWwoaXYpO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjtidG4uZGlzYWJsZWQ9ZmFsc2U7fWVsc2UgYnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7fSwxMDAwKTsKICB9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuWPkemAgeWksei0pe+8jOivt+ajgOafpee9kee7nCIsImVyciIpO2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7fQp9CmFzeW5jIGZ1bmN0aW9uIHBob25lTG9naW5VSSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgY29kZT0oZWwoInBsX2NvZGUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgYmFzaWM9KGVsKCJwbF9iYXNpYyIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBpZighL14xXGR7MTB9JC8udGVzdChwaG9uZSkpe3RvYXN0KCLor7fovpPlhaXmraPnoa7nmoQxMeS9jeaJi+acuuWPtyIsImVyciIpO3JldHVybjt9CiAgaWYoIWNvZGUpe3RvYXN0KCLor7fovpPlhaXnn63kv6Hpqozor4HnoIEiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfbG9naW5fYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLnmbvlvZXkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5waG9uZUxvZ2luKHBob25lLGNvZGUsYmFzaWMpOwogIGlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IueZu+W9leaIkOWKnyIsIm9rIik7c2V0VGltZW91dCgoKT0+bG9jYXRpb24ucmVsb2FkKCksMTIwMCk7fQogIGVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLnmbvlvZXlpLHotKUiLCJlcnIiKTt9CiAgYnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5bm25re75Yqg6LSm5Y+3IjsKfQpmdW5jdGlvbiBjb2xsZWN0Q2ZnVUkoKXtyZXR1cm57YXBwOnthcHBJZDp2YWwoImNmZ19hcHBfaWQiKSxhcHBTZWNyZXQ6dmFsKCJjZmdfYXBwX3NlY3JldCIpfSxoNTp7YXBwSWQ6dmFsKCJjZmdfaDVfaWQiKSxhcHBTZWNyZXQ6dmFsKCJjZmdfaDVfc2VjcmV0Iil9LHZlaGljbGVBZXNLZXk6dmFsKCJjZmdfdmVoaWNsZV9rZXkiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyh2YWwoImNmZ19yZWZyZXNoIikpLHNlcnZlckJhc2U6dmFsKCJjZmdfYmFzZSIpLnRyaW0oKSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6ZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQsZW5hYmxlTGlrZTplbCgiY29tbV9saWtlIikuY2hlY2tlZCxlbmFibGVDb21tZW50OmVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkLGVuYWJsZVNoYXJlOmVsKCJjb21tX3NoYXJlIikuY2hlY2tlZCxlbmFibGVEZWxldGU6ZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZH19fQpmdW5jdGlvbiB2YWwoaWQpe2NvbnN0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO3JldHVybiBlP2UudmFsdWU6IiJ9CmZ1bmN0aW9uIGVsKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpfQphc3luYyBmdW5jdGlvbiBzYXZlQ2ZnVUkoKXtjb25zdCBjPWNvbGxlY3RDZmdVSSgpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUNvbmZpZyhjKTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSl7YXBwbHlSZW1vdGVDZmcoYyk7U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9dG9hc3QoIumFjee9ruW3suS/neWtmCIsIm9rIik7c3RhcnRBdXRvUmVmcmVzaChjLmF1dG9SZWZyZXNoU2VjKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQpmdW5jdGlvbiByZXNldENmZ1VJKCl7ZWwoImNmZ19hcHBfaWQiKS52YWx1ZT1ERUZBVUxUX0NGRy5hcHAuYXBwSWQ7ZWwoImNmZ19hcHBfc2VjcmV0IikudmFsdWU9REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldDtlbCgiY2ZnX2g1X2lkIikudmFsdWU9REVGQVVMVF9DRkcuaDUuYXBwSWQ7ZWwoImNmZ19oNV9zZWNyZXQiKS52YWx1ZT1ERUZBVUxUX0NGRy5oNS5hcHBTZWNyZXQ7ZWwoImNmZ192ZWhpY2xlX2tleSIpLnZhbHVlPSIiO2VsKCJjZmdfcmVmcmVzaCIpLnZhbHVlPTYwO2VsKCJjZmdfYmFzZSIpLnZhbHVlPSIiO2VsKCJjb21tX3Bvc3QiKS5jaGVja2VkPXRydWU7ZWwoImNvbW1fbGlrZSIpLmNoZWNrZWQ9dHJ1ZTtlbCgiY29tbV9jb21tZW50IikuY2hlY2tlZD10cnVlO2VsKCJjb21tX3NoYXJlIikuY2hlY2tlZD10cnVlO2VsKCJjb21tX2RlbGV0ZSIpLmNoZWNrZWQ9dHJ1ZTt0b2FzdCgi5bey5oGi5aSN6buY6K6k77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfQpmdW5jdGlvbiBhZGRBY2NvdW50VUkoKXtjZmdBY2NvdW50cy5wdXNoKHt1c2VyTmFtZToiIix1c2VySWQ6IiIsdG9rZW46IiIsYmFya0tleToiIn0pO2NvbnN0IGxpc3Q9ZWwoImFjY0xpc3QiKTtjb25zdCBpZHg9Y2ZnQWNjb3VudHMubGVuZ3RoLTE7Y29uc3QgaHRtbD0nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsn77yI5paw77yJPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i5aaCIGx1Y2t5Nzk4Ij48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nlKjmiLdJRDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdWlkXycraWR4KyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSI+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgcGxhY2Vob2xkZXI9ImE3NDc3OWM3LeKApiI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QmFyayDpgJrnn6UgS2V577yI6YCJ5aGr77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19iYXJrXycraWR4KyciIHBsYWNlaG9sZGVyPSJCYXJrIEtleSDmiJboh6rlu7ogaHR0cHM6Ly/ln5/lkI0vS2V5Ij48L2Rpdj48L2Rpdj4nO2lmKGxpc3QucXVlcnlTZWxlY3RvcigiLmFjYy1lZGl0Iil8fGxpc3QucXVlcnlTZWxlY3RvcigiW3N0eWxlKj0ndGV4dC1hbGlnbiddIikpe2xpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCJiZWZvcmVlbmQiLGh0bWwpfWVsc2V7bGlzdC5pbm5lckhUTUw9aHRtbH19CmZ1bmN0aW9uIGRlbGV0ZUFjY291bnRVSShpZHgpe2NvbnN0IHJvdz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWNjLWVkaXRbZGF0YS1pPSInK2lkeCsnIl0nKTtpZihyb3cpe3Jvdy5yZW1vdmUoKTtjZmdBY2NvdW50cy5zcGxpY2UoaWR4LDEpO3RvYXN0KCLlt7LliKDpmaTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9fQpmdW5jdGlvbiBjb2xsZWN0QWNjb3VudHNVSSgpe2NvbnN0IHJvd3M9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiI2FjY0xpc3QgLmFjYy1lZGl0Iik7Y29uc3QgbGlzdD1bXTtyb3dzLmZvckVhY2gocm93PT57Y29uc3QgaT1yb3cuZ2V0QXR0cmlidXRlKCJkYXRhLWkiKTtjb25zdCB0b2tlbj1lbCgiYWNjX3Rva2VuXyIraSk/LnZhbHVlfHwiIjtpZih0b2tlbi50cmltKCkpe2xpc3QucHVzaCh7dXNlck5hbWU6ZWwoImFjY19uYW1lXyIraSk/LnZhbHVlfHwiIix1c2VySWQ6ZWwoImFjY191aWRfIitpKT8udmFsdWV8fCIiLHRva2VuOmNsZWFuVG9rZW4odG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGVsKCJhY2NfYmFya18iK2kpPy52YWx1ZXx8IiIpfSl9fSk7cmV0dXJuIGxpc3R9CmFzeW5jIGZ1bmN0aW9uIHNhdmVBY2NvdW50c1VJKCl7Y29uc3QgbGlzdD1jb2xsZWN0QWNjb3VudHNVSSgpLm1hcChhPT4oe3VzZXJOYW1lOihhLnVzZXJOYW1lfHwiIikudHJpbSgpLHVzZXJJZDooYS51c2VySWR8fCIiKS50cmltKCksdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXkpfSkpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUFjY291bnRzKGxpc3QpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKVNUQVRFLnBhbmVsQWNjb3VudHM9bGlzdDt0b2FzdCgi5p6B5qC46LSm5Y+35bey5L+d5a2YIiwib2siKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQphc3luYyBmdW5jdGlvbiBmZXRjaFVzZXJJZFVJKGlkeCl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihlbCgiYWNjX3Rva2VuXyIraWR4KT8udmFsdWV8fCIiKTtjb25zdCBidG49ZWwoInVpZEJ0bl8iK2lkeCk7aWYoIXRva2VuKXt0b2FzdCgi6K+35YWI5aGr5YaZIFRva2VuIiwiZXJyIik7cmV0dXJufWJ0bi50ZXh0Q29udGVudD0i6I635Y+W5Lit4oCmIjtidG4uZGlzYWJsZWQ9dHJ1ZTtjb25zdCBkPWF3YWl0IEJhY2tlbmQuZ2V0VXNlcmlkKHRva2VuKTtpZihkJiZkLm9rJiZkLnVzZXJJZCl7aWYoZWwoImFjY191aWRfIitpZHgpKWVsKCJhY2NfdWlkXyIraWR4KS52YWx1ZT1kLnVzZXJJZDtpZihkLnVzZXJOYW1lJiZlbCgiYWNjX25hbWVfIitpZHgpJiYhZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZSllbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlPWQudXNlck5hbWU7dG9hc3QoIuiOt+WPluaIkOWKn++8miIrKGQudXNlck5hbWV8fGQudXNlcklkKSwib2siKX1lbHNle3RvYXN0KCLojrflj5blpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLmnKrnn6XplJnor68iKSwiZXJyIil9YnRuLnRleHRDb250ZW50PSLojrflj5ZJRCI7YnRuLmRpc2FibGVkPWZhbHNlfQoKLyogPT09PT09PT09PT09PT09PT0g5aSH5Lu9IC8g5oGi5aSNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGV4cG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWwpe3RvYXN0KCLnlYzpnaLmnKrlsLHnu6oiLCJlcnIiKTtyZXR1cm59ZWwudmFsdWU9IueUn+aIkOS4reKApiI7QmFja2VuZC5iYWNrdXAoKS50aGVuKGQ9PntpZihkJiZkLm9rKXtlbC52YWx1ZT1KU09OLnN0cmluZ2lmeShkLG51bGwsMik7dG9hc3QoIuWkh+S7veW3sueUn+aIkO+8jOWPr+WkjeWItuS/neWtmCIsIm9rIil9ZWxzZXtlbC52YWx1ZT0iIjt0b2FzdCgi5a+85Ye65aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5peg5rOV6L+e5o6l6ISa5pys5ZCO56uvIiksImVyciIpfX0pfQpmdW5jdGlvbiBjb3B5QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlKXt0b2FzdCgi6K+35YWI54K55Ye744CM5LiA6ZSu5a+85Ye65aSH5Lu944CNIiwiZXJyIik7cmV0dXJufWlmKG5hdmlnYXRvci5jbGlwYm9hcmQmJm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KXtuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChlbC52YWx1ZSkudGhlbigoKT0+dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIiksKCk9PntlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfSl9ZWxzZXtlbC5zZWxlY3QoKTtkb2N1bWVudC5leGVjQ29tbWFuZCgiY29weSIpO3RvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpfX0KZnVuY3Rpb24gaW1wb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2lmKCFlbHx8IWVsLnZhbHVlLnRyaW0oKSl7dG9hc3QoIuivt+WFiOeymOi0tOWkh+S7veWGheWuuSIsImVyciIpO3JldHVybn1jb25maXJtRGlhbG9nKCLmgaLlpI3lpIfku70iLCLlsIbopobnm5blvZPliY3lhajpg6jotKblj7fkuI7pnaLmnb/phY3nva7vvIzmraTmk43kvZzkuI3lj6/mkqTplIDjgIIiLCJpbXBvcnRCYWNrdXBOb3ciKX0KYXN5bmMgZnVuY3Rpb24gaW1wb3J0QmFja3VwTm93KCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtjb25zdCB2PWVsP2VsLnZhbHVlLnRyaW0oKToiIjtpZighdil7dG9hc3QoIuWkh+S7veWGheWuueS4uuepuiIsImVyciIpO3JldHVybn1jb25zdCBkPWF3YWl0IEJhY2tlbmQucmVzdG9yZUJhY2t1cCh2KTtpZihkJiZkLm9rKXt0b2FzdCgi5oGi5aSN5oiQ5Yqf77yaIisoZC5jb3VudHx8MCkrIiDkuKrotKblj7ciLCJvayIpO2lmKGlzUHJveHlNb2RlKCkpe1NUQVRFLnBhbmVsQWNjb3VudHM9W107U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9U1RBVEUuZGF0YT1bXTtyZW5kZXJDZmcoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuaBouWkjeWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuWkh+S7veWGheWuueagvOW8j+mUmeivryIpLCJlcnIiKX0KCi8qID09PT09PT09PT09PT09PT09IOa8lOekuuaVsOaNru+8iD9kZW1vIOmihOiniOeUqO+8jOS4jeiBlOe9ke+8iSA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBERU1PX0RBVEE9Wwp7dXNlck5hbWU6IumYv+azvSIsdXNlcklkOiIyMDI1MTAwOTEyMzQ1Njc4IixzY29yZToxMjg4MCxzaWduZWRUb2RheTp0cnVlLGNvbnRpbnVlRGF5czo0Mix0b2RheVNjb3JlOjEyLHNpZ25Db3VudDozNix0b2tlblZhbGlkOnRydWUsbGFzdDc6W3tkYXRlOiIwOS0wNCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA1IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOnRydWUsaXNUb2RheTp0cnVlfV0sdmVoaWNsZTp7aGFzVmVoaWNsZTp0cnVlLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsYmF0dGVyeVBlcmNlbnQ6NzYscmVzaWR1YWxSYW5nZUttOjYzLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLHZvbHRhZ2U6ODQuNSxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MjYsZnJvbnRQcmVzc3VyZToiMi4zNWJhciIscmVhclByZXNzdXJlOiIyLjQwYmFyIixmcm9udFRlbXA6IjMxwrBDIixyZWFyVGVtcDoiMzLCsEMiLHRvZGF5RGlzdGFuY2U6MTIuNix0b2RheUR1cmF0aW9uOjM0LHRvZGF5TWF4U3BlZWQ6NTYsbGFzdFJpZGVNaWxlYWdlOjguMixvbmxpbmU6IjEiLHBvd2VyU3RhdHVzOiIwIixsb2NrU3RhdGU6IjEiLGN1c2hpb25TdGF0ZToiMCIsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6Iixsb2NhdGlvblRpbWU6IjA4OjEyIixsb25naXR1ZGU6MTE5LjU1MDksbGF0aXR1ZGU6MjYuNjY1NCxzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9fSwKe3VzZXJOYW1lOiLlsI/mu6EiLHVzZXJJZDoiMjAyNjAxMDExMTIyMzM0NCIsc2NvcmU6NTIwLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czozLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6OSx0b2tlblZhbGlkOmZhbHNlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIixiYXR0ZXJ5UGVyY2VudDoyMyxyZXNpZHVhbFJhbmdlS206MjAscmFuZ2VFc3RpbWF0ZWQ6dHJ1ZSxjaGFyZ2VTdGF0ZToi5YWF55S15LitIix2b2x0YWdlOjg2LjIsY3VycmVudDo1LjQsYmF0dGVyeVRlbXA6MzEsZnJvbnRQcmVzc3VyZToiMi4xMGJhciIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxvbmxpbmU6IjAiLHBvd2VyU3RhdHVzOiIxIixsb2NrU3RhdGU6IjAiLGN1c2hpb25TdGF0ZToiMSIsYWRkcmVzczoiIixsb2NhdGlvblRpbWU6IiIsbG9uZ2l0dWRlOiIiLGxhdGl0dWRlOiIiLHNlcnZpY2VFbmREYXRlOiIifX0KXTsKY29uc3QgREVNT19MT0dTPVsKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTIiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2FpbjoxMixzaWduaW5TY29yZTo2LGJsaW5kQm94U2NvcmU6NixpbnRlcmFjdFNjb3JlOjAsY29udGludWVEYXlzOjQyLHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICs2ICjnp6/liIYpIiwi55uy55uS5pyq6Kej6ZSBKDM2LzMwKSJdfSwKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTUiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ8iLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0sCnt0aW1lOiIyMDI2LTA5LTA5IDIyOjMxOjA1Iix0eXBlOiJ2ZWhpY2xlIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsYWN0aW9uVGV4dDoi5LqR56uv5byA6ZSBIixtZXNzYWdlOiLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiLHN0ZXBzOltdfQpdOwoKLyogPT09PT09PT09PT09PT09PT0g5Yi35pawICYg5Yid5aeL5YyWID09PT09PT09PT09PT09PT09ICovCmxldCBsb2FkaW5nPWZhbHNlOwphc3luYyBmdW5jdGlvbiByZWZyZXNoQWxsKHNpbGVudCl7CiAgaWYobG9hZGluZylyZXR1cm47bG9hZGluZz10cnVlOwogIGlmKCFzaWxlbnQpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2lmKCFTVEFURS5kYXRhLmxlbmd0aCllbC5pbm5lckhUTUw9c2tlbGV0b25Ib21lKCl9CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldERhc2hib2FyZCgpOwogIGxvYWRpbmc9ZmFsc2U7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l5pyN5Yqh5Zyw5Z2A5oiW572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9CmZ1bmN0aW9uIGluaXQoKXsKICBhcHBseVRoZW1lKCk7bW91bnRUaGVtZUJ0bigpOwogIHJlbmRlckNmZygpOwogIGlmKGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApewogICAgU1RBVEUuZGF0YT1ERU1PX0RBVEE7U1RBVEUudHNUZXh0PWZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1mYWxzZTsKICAgIHJlbmRlckhvbWUoKTtyZXR1cm47CiAgfQogIHN0YXJ0QXV0b1JlZnJlc2goKTtyZWZyZXNoQWxsKGZhbHNlKTsKfQppbml0KCk7Cjwvc2NyaXB0Pgo8IS0tX19KUzVfXy0tPgo=";
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
    const results = [];
    const targets = body.all ? accounts : accounts.filter(a => String(a.userId) === String(body.userId));
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
          // 盲盒文本：≥10分显示获得积分，低于10分显示距盲盒剩余天数（避免"盲盒0"）
          const _bScore = r.blindBoxScore || 0;
          const _bDay = (r.continueDays || 0) === 0 ? 0 : (((r.continueDays || 0) - 1) % 30) + 1;
          const _bRemain = 30 - _bDay;
          const _bbTxt = _bScore >= 10 ? "盲盒" + _bScore : "距盲盒" + _bRemain + "天";
          const _bb = "今日获得 " + r.totalGain + " 分（签到" + r.signinScore + " / " + _bbTxt + " / 互动" + r.interactScore + "），连签 " + r.continueDays + " 天";
          await barkPush(acc.barkKey, _bt, _bb);
        } catch(e) {}
      }
    }
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