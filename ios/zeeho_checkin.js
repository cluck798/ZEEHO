// 极核（ZEEHO）自动签到 · Scriptable 版
// 签名算法来源: github.com/cluck798/ZEEHO (script/zeeho.js getSign)
//   sign = md5( sha1( query + body + "appId=..&nonce=..&timestamp=.." + appSecret ) )
//
// 用法：
//   首次：在 Scriptable 里点运行 → 按提示输入手机号和短信验证码（自动换 token 并存到 iCloud）
//   之后：可挂到「快捷指令 → 个人自动化 → 每天 00:05」静默运行
//   手动：直接点脚本图标运行即可；token 失效时会自动引导重新登录

function md5(t,e){function n(t,e){return t<<e|t>>>32-e}function r(t,e){var n,r,o,i,a;return o=2147483648&t,i=2147483648&e,a=(1073741823&t)+(1073741823&e),(n=1073741824&t)&(r=1073741824&e)?2147483648^a^o^i:n|r?1073741824&a?3221225472^a^o^i:1073741824^a^o^i:a^o^i}function o(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&e|~t&n}(e,o,i),a),c)),r(n(t,u),e)}function i(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&n|e&~n}(e,o,i),a),c)),r(n(t,u),e)}function a(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t^e^n}(e,o,i),a),c)),r(n(t,u),e)}function u(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return e^(t|~n)}(e,o,i),a),c)),r(n(t,u),e)}function c(t){var e,n="",r="";for(e=0;e<=3;e++)n+=(r="0"+(t>>>8*e&255).toString(16)).substr(r.length-2,2);return n}var s,l,f,p,d,h,v,y,g,m=Array();for(m=function(t){for(var e,n=t.length,r=n+8,o=16*((r-r%64)/64+1),i=Array(o-1),a=0,u=0;u<n;)a=u%4*8,i[e=(u-u%4)/4]=i[e]|t.charCodeAt(u)<<a,u++;return a=u%4*8,i[e=(u-u%4)/4]=i[e]|128<<a,i[o-2]=n<<3,i[o-1]=n>>>29,i}(t=function(t){t=t.replace(/\r\n/g,"\n");for(var e="",n=0;n<t.length;n++){var r=t.charCodeAt(n);r<128?e+=String.fromCharCode(r):r>127&&r<2048?(e+=String.fromCharCode(r>>6|192),e+=String.fromCharCode(63&r|128)):(e+=String.fromCharCode(r>>12|224),e+=String.fromCharCode(r>>6&63|128),e+=String.fromCharCode(63&r|128))}return e}(t)),h=1732584193,v=4023233417,y=2562383102,g=271733878,s=0;s<m.length;s+=16)l=h,f=v,p=y,d=g,h=o(h,v,y,g,m[s+0],7,3614090360),g=o(g,h,v,y,m[s+1],12,3905402710),y=o(y,g,h,v,m[s+2],17,606105819),v=o(v,y,g,h,m[s+3],22,3250441966),h=o(h,v,y,g,m[s+4],7,4118548399),g=o(g,h,v,y,m[s+5],12,1200080426),y=o(y,g,h,v,m[s+6],17,2821735955),v=o(v,y,g,h,m[s+7],22,4249261313),h=o(h,v,y,g,m[s+8],7,1770035416),g=o(g,h,v,y,m[s+9],12,2336552879),y=o(y,g,h,v,m[s+10],17,4294925233),v=o(v,y,g,h,m[s+11],22,2304563134),h=o(h,v,y,g,m[s+12],7,1804603682),g=o(g,h,v,y,m[s+13],12,4254626195),y=o(y,g,h,v,m[s+14],17,2792965006),h=i(h,v=o(v,y,g,h,m[s+15],22,1236535329),y,g,m[s+1],5,4129170786),g=i(g,h,v,y,m[s+6],9,3225465664),y=i(y,g,h,v,m[s+11],14,643717713),v=i(v,y,g,h,m[s+0],20,3921069994),h=i(h,v,y,g,m[s+5],5,3593408605),g=i(g,h,v,y,m[s+10],9,38016083),y=i(y,g,h,v,m[s+15],14,3634488961),v=i(v,y,g,h,m[s+4],20,3889429448),h=i(h,v,y,g,m[s+9],5,568446438),g=i(g,h,v,y,m[s+14],9,3275163606),y=i(y,g,h,v,m[s+3],14,4107603335),v=i(v,y,g,h,m[s+8],20,1163531501),h=i(h,v,y,g,m[s+13],5,2850285829),g=i(g,h,v,y,m[s+2],9,4243563512),y=i(y,g,h,v,m[s+7],14,1735328473),h=a(h,v=i(v,y,g,h,m[s+12],20,2368359562),y,g,m[s+5],4,4294588738),g=a(g,h,v,y,m[s+8],11,2272392833),y=a(y,g,h,v,m[s+11],16,1839030562),v=a(v,y,g,h,m[s+14],23,4259657740),h=a(h,v,y,g,m[s+1],4,2763975236),g=a(g,h,v,y,m[s+4],11,1272893353),y=a(y,g,h,v,m[s+7],16,4139469664),v=a(v,y,g,h,m[s+10],23,3200236656),h=a(h,v,y,g,m[s+13],4,681279174),g=a(g,h,v,y,m[s+0],11,3936430074),y=a(y,g,h,v,m[s+3],16,3572445317),v=a(v,y,g,h,m[s+6],23,76029189),h=a(h,v,y,g,m[s+9],4,3654602809),g=a(g,h,v,y,m[s+12],11,3873151461),y=a(y,g,h,v,m[s+15],16,530742520),h=u(h,v=a(v,y,g,h,m[s+2],23,3299628645),y,g,m[s+0],6,4096336452),g=u(g,h,v,y,m[s+7],10,1126891415),y=u(y,g,h,v,m[s+14],15,2878612391),v=u(v,y,g,h,m[s+5],21,4237533241),h=u(h,v,y,g,m[s+12],6,1700485571),g=u(g,h,v,y,m[s+3],10,2399980690),y=u(y,g,h,v,m[s+10],15,4293915773),v=u(v,y,g,h,m[s+1],21,2240044497),h=u(h,v,y,g,m[s+8],6,1873313359),g=u(g,h,v,y,m[s+15],10,4264355552),y=u(y,g,h,v,m[s+6],15,2734768916),v=u(v,y,g,h,m[s+13],21,1309151649),h=u(h,v,y,g,m[s+4],6,4149444226),g=u(g,h,v,y,m[s+11],10,3174756917),y=u(y,g,h,v,m[s+2],15,718787259),v=u(v,y,g,h,m[s+9],21,3951481745),h=r(h,l),v=r(v,f),y=r(y,p),g=r(g,d);return 32==e?(c(h)+c(v)+c(y)+c(g)).toLowerCase():(c(v)+c(y)).toLowerCase()}
function sha1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4};function lsb_hex(val){var str='';var i;var vh;var vl;for(i=0;i<=6;i+=2){vh=(val>>>(i*4+4))&0x0f;vl=(val>>>(i*4))&0x0f;str+=vh.toString(16)+vl.toString(16)}return str};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16)}return str};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j)}switch(msg_len%4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break}word_array.push(i);while((word_array.length%16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff}var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase()}

// ==================== 常量 ====================
const BASE = "https://h5.zeehoev.com/cfmotoservermine";
const H5_APPID = "AiTXmBrm";
const H5_SECRET = "70c2c7458ab88ca9504ad0521f170075bc91f2f7";

const APP_BASE = "https://tapi.zeehoev.com";
const APP_APPID = "S7qPWPU1";
const APP_SECRET = "c5e0da7f4da28df805694ec3dd1fc6792e9df99d";
const APP_BASIC = "bWNrOjEyMzQ1Ng=="; // mck:123456

// 与已验证可用的 Python 版保持一致，不要随意改动
const UA = "Mozilla/5.0 (Linux; Android 16; 2211133C Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.111 Mobile Safari/537.36 Zeeho/3.0.9 (Xiaomi 2211133C Build/16)";
const ZUA = "MOBILE|Android|16|ZEEHO_APP|3.0.9|Xiaomi 2211133C|393*873|192c08e0-23d0-4b35-9d94-27a7196043b8|4g|AndroidOS";

// ==================== 存储 ====================
const fm = FileManager.iCloud();
const DIR = fm.joinPath(fm.documentsDirectory(), "zeeho");
const CFG_PATH = fm.joinPath(DIR, "account.json");
const LOG_PATH = fm.joinPath(DIR, "log.txt");

function ensureDir() {
  if (!fm.fileExists(DIR)) fm.createDirectory(DIR, true);
}

function readFileSafe(p) {
  try {
    if (!fm.fileExists(p)) return null;
    try { fm.downloadFileFromiCloud(p); } catch (e) {}
    return fm.readString(p);
  } catch (e) {
    return null;
  }
}

function writeFileSafe(p, text) {
  try {
    ensureDir();
    fm.writeString(p, text);
  } catch (e) {}
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function monthStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function logLine(msg) {
  const line = "[" + stamp() + "] " + msg;
  console.log(line);
  const old = readFileSafe(LOG_PATH) || "";
  const rows = old.split("\n").filter((x) => x.length > 0);
  rows.push(line);
  // 只保留最近 300 行
  writeFileSafe(LOG_PATH, rows.slice(-300).join("\n") + "\n");
}

function loadCfg() {
  const raw = readFileSafe(CFG_PATH);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || !o.token) return null;
    return o;
  } catch (e) {
    return null;
  }
}

function saveCfg(o) {
  writeFileSafe(CFG_PATH, JSON.stringify(o, null, 2));
}

// ==================== 签名 ====================
function buildQuery(params) {
  if (!params) return "";
  return Object.keys(params)
    .filter((k) => params[k] !== null && params[k] !== undefined)
    .sort()
    .map((k) => k + "=" + params[k])
    .join("&");
}

function uuid4() {
  function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
  return s4() + s4() + "-" + s4() + "-4" + s4().substring(1) + "-" + s4() + "-" + s4() + s4() + s4();
}

function h5Sign(params, bodyStr) {
  const query = buildQuery(params || {});
  const ts = String(Date.now());
  const nonce = uuid4();
  const param = "appId=" + H5_APPID + "&nonce=" + nonce + "&timestamp=" + ts;
  const payload = query + (bodyStr || "") + param + H5_SECRET;
  // 注意：内嵌的 md5 默认返回 16 位短哈希，必须传 32 才拿到完整 32 位
  const sign = md5(sha1(payload), 32).toLowerCase();
  return {
    "Cfmoto-X-Param": param,
    "Cfmoto-X-Sign": sign,
    "Cfmoto-X-Sign-Type": "0",
  };
}

function gatewaySign(url, method, params, bodyStr) {
  const ts = String(Date.now());
  const nonce = uuid4().replace(/-/g, "").substring(0, 16) + ts;
  const param = "appId=" + APP_APPID + "&nonce=" + nonce + "&timestamp=" + ts;
  const query = buildQuery(params || {});
  let pre;
  if (String(method).toUpperCase() === "GET") {
    pre = url + (query ? (url.indexOf("?") >= 0 ? "&" : "?") + query : "");
  } else {
    pre = query + (bodyStr || "");
  }
  const sign = md5(sha1(pre + param + APP_SECRET), 32).toLowerCase();
  return {
    "Cfmoto-X-Param": param,
    "Cfmoto-X-Sign": sign,
    "Cfmoto-X-Sign-Type": "0",
  };
}

// ==================== HTTP ====================
async function http(url, method, headers, bodyStr) {
  const req = new Request(url);
  req.method = method || "GET";
  req.headers = headers || {};
  req.timeoutInterval = 25;
  if (bodyStr) req.body = bodyStr;
  try {
    const text = await req.loadString();
    let js;
    try { js = JSON.parse(text); } catch (e) { js = { _raw: String(text).substring(0, 300) }; }
    return { status: req.response ? req.response.statusCode : 0, json: js };
  } catch (e) {
    return { status: -1, json: { _err: String(e) } };
  }
}

async function apiCall(cfg, path, method, params, bodyStr) {
  method = method || "GET";
  bodyStr = bodyStr || "";
  const h = {
    "Authorization": "Bearer " + cfg.token,
    "user_id": String(cfg.userId || ""),
    "User-Agent": UA,
    "Zeeho-User-Agent": ZUA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "X-Requested-With": "com.cfmoto",
    "interfaceversion": "2",
    "Referer": "https://h5.zeehoev.com/activity/signin?hideNavigationBar=true",
  };
  Object.assign(h, h5Sign(params || {}, bodyStr));
  if (method !== "GET") h["Content-Type"] = "application/json;charset=UTF-8";
  let url = BASE + path;
  const q = buildQuery(params || {});
  if (q) url += (url.indexOf("?") >= 0 ? "&" : "?") + q;
  return await http(url, method, h, method === "GET" ? null : (bodyStr || "{}"));
}

function isTokenBroken(r) {
  if (!r) return false;
  if (r.status === 401) return true;
  const j = r.json || {};
  const t = JSON.stringify(j);
  return t.indexOf("invalid_token") >= 0 || t.indexOf("Unauthorized") >= 0;
}

// ==================== 登录 ====================
async function sendSms(phone) {
  const url = APP_BASE + "/v1.0/mine/cfmotoservermine/authCode/" + encodeURIComponent(phone);
  const h = {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "okhttp/4.9.2",
  };
  Object.assign(h, gatewaySign(url, "GET", {}, ""));
  return await http(url, "GET", h, null);
}

async function loginByPhone(phone, code) {
  const url = APP_BASE + "/v1.0/mine/cfmotoservermine/user/loginByPhone";
  const body = JSON.stringify({ phone: String(phone), authCode: String(code) });
  const h = {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "okhttp/4.9.2",
    "Authorization": "Basic " + APP_BASIC,
  };
  // 项目实测：该接口按 GET 风格（完整 URL 入签）通过校验
  Object.assign(h, gatewaySign(url, "GET", {}, body));
  return await http(url, "POST", h, body);
}

async function interactiveLogin(reason) {
  const a1 = new Alert();
  a1.title = "极核登录";
  a1.message = (reason ? reason + "\n\n" : "") + "输入极核 App 绑定手机号，会收到短信验证码";
  a1.addTextField("手机号", "");
  a1.addAction("发送验证码");
  a1.addCancelAction("取消");
  const i1 = await a1.presentAlert();
  if (i1 === -1) return null;
  const phone = String(a1.textFieldValue(0)).trim();
  if (!/^\d{6,15}$/.test(phone)) {
    logLine("登录取消：手机号格式不对");
    return null;
  }

  const r1 = await sendSms(phone);
  logLine("发送验证码: HTTP=" + r1.status + " " + JSON.stringify(r1.json).substring(0, 120));

  const a2 = new Alert();
  a2.title = "输入验证码";
  a2.message = "短信已发送到 " + phone + "\n（如果没收到，稍等 10 秒再点「重发」）";
  a2.addTextField("6 位验证码", "");
  a2.addAction("登录");
  a2.addDestructiveAction("重发验证码");
  a2.addCancelAction("取消");
  let i2 = await a2.presentAlert();
  if (i2 === -1) return null;
  let code = String(a2.textFieldValue(0)).trim();
  if (i2 === 1) {
    await sendSms(phone);
    const a3 = new Alert();
    a3.title = "输入新验证码";
    a3.message = "已重发短信，旧码已作废";
    a3.addTextField("6 位验证码", "");
    a3.addAction("登录");
    a3.addCancelAction("取消");
    if ((await a3.presentAlert()) === -1) return null;
    code = String(a3.textFieldValue(0)).trim();
  }
  if (!code) return null;

  const r2 = await loginByPhone(phone, code);
  const data = (r2.json && r2.json.data) || {};
  const ti = data.tokenInfo || {};
  let tk = String(ti.access_token || "").trim();
  if (!tk) {
    logLine("登录失败: " + JSON.stringify(r2.json).substring(0, 200));
    const bad = new Alert();
    bad.title = "登录失败";
    bad.message = String((r2.json && r2.json.message) || "验证码可能有误或已过期") +
      "\n\n再试一次？";
    bad.addAction("重新登录");
    bad.addCancelAction("算了");
    if ((await bad.presentAlert()) === 0) return await interactiveLogin("上次验证码无效。");
    return null;
  }
  if (tk.toLowerCase().indexOf("bearer ") === 0) tk = tk.substring(7);

  let uid = String(data.id || data.userId || "").trim();
  const cfg = { token: tk, userId: uid, phone: phone, loginAt: stamp() };
  if (!uid) {
    const base = await apiCall({ token: tk, userId: "" }, "/baseInfo", "GET", { server_name: "cfmoto" }, "");
    const d = (base.json && base.json.data) || {};
    cfg.userId = String(d.id || d.userId || "");
  }
  saveCfg(cfg);
  logLine("登录成功，token 前 8 位: " + tk.substring(0, 8) + "  userId=" + cfg.userId);
  return cfg;
}

// ==================== 业务 ====================
function pickToday(js, day) {
  const data = (js && js.data) || {};
  const rows = data.nowSignDetailVos || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].createDate === day) return rows[i];
  }
  return null;
}

async function notify(title, body) {
  const n = new Notification();
  n.title = title;
  n.body = body;
  n.sound = "default";
  try { await n.schedule(); } catch (e) { logLine("通知失败: " + e); }
}

// 是否"无人值守"模式：弹窗在后台/锁屏无法显示，会让脚本卡住等用户点击，
// 所以只要是从快捷指令/自动化调用（runsInShortcut），或者显式传了 silent，
// 一律走通知，绝不弹窗。
function isSilent() {
  try {
    if (config && config.runsInShortcut === true) return true;
  } catch (e) {}
  return (args.plainTexts || []).indexOf("silent") >= 0;
}

async function main() {
  ensureDir();
  const silent = isSilent();

  let cfg = loadCfg();
  const manualLogin = (args.plainTexts || []).indexOf("login") >= 0;

  if (!cfg || manualLogin) {
    cfg = await interactiveLogin(manualLogin ? "手动重新登录。" : "首次使用，需要先登录。");
    if (!cfg) {
      if (!silent) Script.complete();
      return;
    }
  }

  logLine("==== 开始检查 ====");
  const info = await apiCall(cfg, "/H5/signin/info", "GET", { month: monthStr() }, "");

  if (isTokenBroken(info)) {
    logLine("token 已失效（多半是在极核 App 里重新登录过）");
    if (silent) {
      await notify("极核 token 已失效", "今天没签到。打开 Scriptable 手动运行一次脚本即可重新登录。");
      return;
    }
    const again = await interactiveLogin("token 已失效，需要重新登录。");
    if (!again) {
      await notify("极核签到失败", "token 失效且未重新登录");
      return;
    }
    return await mainCore(again);
  }

  if (String(info.json.code) !== "10000") {
    const msg = "查询失败: code=" + info.json.code + " " + (info.json.message || "");
    logLine(msg);
    await notify("极核签到失败", msg);
    return;
  }

  return await mainCore(cfg, info);
}

async function mainCore(cfg, preInfo) {
  const day = todayStr();
  const info = preInfo || await apiCall(cfg, "/H5/signin/info", "GET", { month: monthStr() }, "");
  let te = pickToday(info.json, day);
  if (te && (te.signStatue === 3 || te.signStatue === 5)) {
    const cnt = ((info.json.data || {}).signContinuousCount) || "?";
    const msg = "今日已签到（积分 " + (te.integralScore || 0) + "，连签 " + cnt + " 天）";
    logLine(msg);
    // 自动化跑完也要有反馈，否则用户不知道它到底有没有执行
    await notify("极核签到：今日已完成", msg);
    return msg;
  }

  logLine("今日未签到，开始签到");
  let ok = false;
  for (let i = 1; i <= 3; i++) {
    const r = await apiCall(cfg, "/H5/signin", "POST", {}, "{}");
    logLine("  第" + i + "次: HTTP=" + r.status + " code=" + r.json.code + " msg=" + (r.json.message || ""));
    if (String(r.json.code) === "10000" && r.json.message === "操作成功") { ok = true; break; }
    if (i < 3) await new Promise((r2) => Timer.schedule(4000 * i, false, r2));
  }

  await new Promise((r2) => Timer.schedule(2500, false, r2));
  const after = await apiCall(cfg, "/H5/signin/info", "GET", { month: monthStr() }, "");
  const te2 = pickToday(after.json, day);
  if (te2 && (te2.signStatue === 3 || te2.signStatue === 5)) {
    const cnt = ((after.json.data || {}).signContinuousCount) || "?";
    const msg = "签到成功 +" + (te2.integralScore || 0) + " 积分，连签 " + cnt + " 天";
    logLine("✅ " + msg);
    await notify("极核签到成功", msg);
    return msg;
  }
  const fail = "签到后未确认成功（最后一次返回 " + JSON.stringify(after.json).substring(0, 120) + "）";
  logLine("⚠️ " + fail);
  await notify("极核签到失败", fail);
  return fail;
}

// ==================== 运行上报（可选，失败静默） ====================
// 把本次运行结果回传到电脑，方便远程查看真机到底跑成什么样；连不上就忽略。
// 可选：把运行结果回传到你自己电脑上的小服务（留空=关闭）。
// 例：const REPORT_URL = "http://192.168.1.10:8001/report";
const REPORT_URL = "";

async function report(payload) {
  if (!REPORT_URL) return;
  try {
    const r = new Request(REPORT_URL);
    r.method = "POST";
    r.headers = { "Content-Type": "application/json" };
    r.body = JSON.stringify(payload);
    r.timeoutInterval = 8;
    await r.loadString();
  } catch (e) {}
}

// 手动运行时弹窗告知结果（自动化 silent 运行时不打扰）
async function showResult(msg) {
  try {
    const a = new Alert();
    a.title = "极核签到";
    a.message = msg;
    a.addAction("好");
    await a.presentAlert();
  } catch (e) {}
}

// ==================== 入口 ====================
const ENTRY_SILENT = isSilent();
let _cfg8 = "";
try { const _c = loadCfg(); _cfg8 = _c && _c.token ? String(_c.token).substring(0, 8) : ""; } catch (e) {}

try {
  const result = await main();
  if (result) {
    logLine("结果: " + result);
    Script.setShortcutOutput(String(result));
    await report({ ok: true, result: String(result), token8: _cfg8, silent: ENTRY_SILENT, at: stamp() });
    if (!ENTRY_SILENT) await showResult(String(result));
  } else {
    await report({ ok: false, reason: "无结果（可能已提前退出）", token8: _cfg8, silent: ENTRY_SILENT, at: stamp() });
  }
} catch (e) {
  logLine("异常: " + String(e) + " @ " + (e.stack || "").substring(0, 200));
  try { await notify("极核签到异常", String(e).substring(0, 100)); } catch (e2) {}
  await report({ ok: false, error: String(e), stack: String(e.stack || "").substring(0, 300), token8: _cfg8, at: stamp() });
}
Script.complete();
