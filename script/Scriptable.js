// ============= 极核 ZEEHO · Scriptable 小组件（单账号版 v1.1） =============
// 单账号：顶部 HARDCODED_TOKEN 一个 Token 对应一个账号（多账号请复制本文件各用一份）
// v1.1：① 每次运行按服务端当日签到记录（nowSignDetailVos）判断"今天是否已签"，以此为前提决定是否执行签到
//       ② 中尺寸（medium）显示电池电压 ③ 设备指纹随机化（防风控拉黑）
// ============= 配置与常量 =========
const BASE = "https://tapi.zeehoev.com";
const H5_BASE = "https://h5.zeehoev.com";

// ========== 🔑 在此处粘贴您的 Token ==========
// 💡 首次运行时会弹窗让你输入，会自动填入这里
// 💡 Token过期时也会弹窗让你更新
const HARDCODED_TOKEN = "";

// ========== 🔄 强制重置（调试用） ==========
// ⚙️ 设为 true 会清空所有保存的数据（签到记录、发布记录等）
// 用于测试或重置状态，正常使用设为 false
const FORCE_RESET = false;

// ========== 🐛 调试模式 ==========
// ⚙️ 开启后：1) 忽略"今天已发布"的限制  2) 输出完整请求/响应日志
// 用于调试发布功能，true是开启，正常使用设为 false
const DEBUG_MODE = false;

const API_LABELS = {
  signinStatus: "签到状态",
  "signin(GET status)": "查询签到",
  "signin(POST)": "执行签到",
  signin: "签到",
  totalIntegral: "总积分",
  homeRideInfo: "首页车况",
  myRideInfo: "我的车况",
  vehicleWidgets: "车辆小组件",
  vehicleList: "车辆列表",
  vehicleHomePage: "车辆主页",
  tirePressure: "胎压",
  batteryInfo: "电池信息",
  batteryCharge: "充电状态",
  publishArticle: "发布动态",
  fetchArticleList: "动态列表",
  likeArticle: "点赞",
  shareArticle: "分享",
  deleteArticle: "删除动态",
  adjustByShare: "分享积分",
  signinLottery: "签到盲盒",
  supplementPrize: "补签奖励",
};

function logStep(name, status, detail) {
  const icons = { ok: "✅", skip: "⏭️", fail: "❌", info: "ℹ️", warn: "⚠️", start: "🚀" };
  const icon = icons[status] || "•";
  let line = `${icon} ${name}`;
  if (detail != null && String(detail).trim()) line += `: ${detail}`;
  console.log(line);
  console.log("");
}

function logDebug(...args) {
  if (!DEBUG_MODE) return;
  const label = args.length > 0 ? args[0] : "";
  const rest = args.slice(1);
  if (rest.length === 0) {
    console.log(`🔍 [DEBUG] ${label}`);
  } else if (rest.length === 1 && typeof rest[0] === "object") {
    try {
      console.log(`🔍 [DEBUG] ${label}`, JSON.stringify(rest[0]));
    } catch {
      console.log(`🔍 [DEBUG] ${label}`, rest[0]);
    }
  } else {
    console.log(`🔍 [DEBUG] ${label}`, ...rest);
  }
}

// ========== 📝 发布动态配置 ==========
const POST_CONTENT = "lucky"; // 每天发布的动态内容
const ENABLE_AUTO_POST = true; // 是否启用自动发布动态

// =============================================

// ========== 🎨 UI 配置（可调整） ==========
const UI_CONFIG = {
  verticalSpacing: 1,   // 行与行之间的垂直间距（pt），越大越松
  horizontalSpacing: 3,
  padding: 10,          // 四周内边距
  imageWidth: 130,       // 右侧车辆图片宽度（pt）
  imageHeight: 80,      // 右侧车辆图片高度（pt）
  imageOffsetY: 20,      // 图片垂直偏移（pt），正数向下移，负数向上移
  rideRowSpacing: 4,     // 骑行数据行的水平间距
  rideVerticalSpacing: 0, // 骑行数据行之间的垂直间距（减小到1，让两行更紧凑）
  rideRowOffsetY: 0,     // 今日骑行行的垂直偏移（正数向下，负数向上）
  lastRideRowOffsetY: 0, // 上次骑行行的垂直偏移（正数向下，负数向上）
  extraVerticalSpacing: 0, // 额外垂直间距，正数增加间距，负数减少间距
};

// API 路径
const API = {
  homeRideInfo: "/v1.0/app/cfmotoserverapp/homeRideInfo",
  myRideInfo: "/v1.0/app/cfmotoserverapp/myRideInfo",
  vehicleWidgets: (vinNo) =>
    `/v1.0/app/cfmotoserverapp/vehicle/widgets/${encodeURIComponent(vinNo)}`,
  tirePressure: "/v1.0/app/cfmotoserverapp/app/vehicle/tire/monitoring",
  vehicleList: "/v1.0/app/cfmotoserverapp/vehicle/list",
  vehicleHomePage: (vehicleId) =>
    `/v1.0/app/cfmotoserverapp/vehicleHomePage/${encodeURIComponent(vehicleId)}`,
  signinLottery: "/cfmotoservermine/signin/lottery",
  totalIntegral: "/v1.0/mine/cfmotoservermine/integral/totalIntegral",
  commonArticle: "/v1.0/social/cfmotoserversocial/commonArticle",
  mineArticleInfo: "/v1.0/social/cfmotoserversocial/community/mineArticleInfo",
  likeFavorite: "/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo",
  shareArticle: (articleId) => `/v1.0/social/cfmotoserversocial/article/share/${articleId}`,
  deleteArticle: "/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle",
  batteryInfo: (vinNo) => `/v1.0/app/cfmotoserverapp/batteryInfo/${encodeURIComponent(vinNo)}`,
  adjustByShare: "/v1.0/mine/cfmotoservermine/integral/adjustByShare",
};
const API_SIGNIN_V1 = "/cfmotoservermine/signin";
const API_SIGNIN_INFO = "/cfmotoservermine/signin/info";

const IMAGE_URL = "";

// ============= 本地签名 =============
const APP_CONFIG = {
  h5: {
    appId: "S7qPWPU1",
    appSecret: "c5e0da7f4da28df805694ec3dd1fc6792e9df99d"
  },
  app: {
    appId: "S7qPWPU1",
    appSecret: "c5e0da7f4da28df805694ec3dd1fc6792e9df99d"
  }
};

function getUuid() {
  const pattern = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  let result = "";
  const chars = "abcdef0123456789";
  for (let char of pattern) {
    if (char === "x" || char === "y") {
      const random = Math.floor(Math.random() * 16);
      const value = char === "y" ? (random & 0x3) | 0x8 : random;
      result += value.toString(16);
    } else {
      result += char;
    }
  }
  return result;
}

function getRandomChars(n = 16) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function md5(t, e) {
  function n(t, e) { return t << e | t >>> 32 - e }

  function r(t, e) {
    var n, r, o, i, a;
    return o = 2147483648 & t, i = 2147483648 & e, a = (1073741823 & t) + (1073741823 & e),
      (n = 1073741824 & t) & (r = 1073741824 & e) ? 2147483648 ^ a ^ o ^ i : n | r ? 1073741824 & a ? 3221225472 ^ a ^ o ^ i : 1073741824 ^ a ^ o ^ i : a ^ o ^ i
  }

  function o(t, e, o, i, a, u, c) {
    return t = r(t, r(r(function(t, e, n) { return t & e | ~t & n }(e, o, i), a), c)), r(n(t, u), e)
  }

  function i(t, e, o, i, a, u, c) {
    return t = r(t, r(r(function(t, e, n) { return t & n | e & ~n }(e, o, i), a), c)), r(n(t, u), e)
  }

  function a(t, e, o, i, a, u, c) {
    return t = r(t, r(r(function(t, e, n) { return t ^ e ^ n }(e, o, i), a), c)), r(n(t, u), e)
  }

  function u(t, e, o, i, a, u, c) {
    return t = r(t, r(r(function(t, e, n) { return e ^ (t | ~n) }(e, o, i), a), c)), r(n(t, u), e)
  }

  function c(t) {
    var e, n = "",
      r = "";
    for (e = 0; e <= 3; e++) n += (r = "0" + (t >>> 8 * e & 255).toString(16)).substr(r.length - 2, 2);
    return n
  }
  var s, l, f, p, d, h, v, y, g, m = Array();
  for (m = function(t) {
      for (var e, n = t.length, r = n + 8, o = 16 * ((r - r % 64) / 64 + 1), i = Array(o - 1), a = 0, u = 0; u < n;)
        a = u % 4 * 8, i[e = (u - u % 4) / 4] = i[e] | t.charCodeAt(u) << a, u++;
      return a = u % 4 * 8, i[e = (u - u % 4) / 4] = i[e] | 128 << a, i[o - 2] = n << 3, i[o - 1] = n >>> 29, i
    }(t = function(t) {
      t = t.replace(/\r\n/g, "\n");
      for (var e = "", n = 0; n < t.length; n++) {
        var r = t.charCodeAt(n);
        r < 128 ? e += String.fromCharCode(r) : r > 127 && r < 2048 ? (e += String.fromCharCode(r >> 6 | 192), e += String.fromCharCode(63 & r | 128)) : (e += String.fromCharCode(r >> 12 | 224), e += String.fromCharCode(r >> 6 & 63 | 128), e += String.fromCharCode(63 & r | 128))
      }
      return e
    }(t)), h = 1732584193, v = 4023233417, y = 2562383102, g = 271733878, s = 0; s < m.length; s += 16)
    l = h, f = v, p = y, d = g, h = o(h, v, y, g, m[s + 0], 7, 3614090360), g = o(g, h, v, y, m[s + 1], 12, 3905402710),
    y = o(y, g, h, v, m[s + 2], 17, 606105819), v = o(v, y, g, h, m[s + 3], 22, 3250441966),
    h = o(h, v, y, g, m[s + 4], 7, 4118548399), g = o(g, h, v, y, m[s + 5], 12, 1200080426),
    y = o(y, g, h, v, m[s + 6], 17, 2821735955), v = o(v, y, g, h, m[s + 7], 22, 4249261313),
    h = o(h, v, y, g, m[s + 8], 7, 1770035416), g = o(g, h, v, y, m[s + 9], 12, 2336552879),
    y = o(y, g, h, v, m[s + 10], 17, 4294925233), v = o(v, y, g, h, m[s + 11], 22, 2304563134),
    h = o(h, v, y, g, m[s + 12], 7, 1804603682), g = o(g, h, v, y, m[s + 13], 12, 4254626195),
    y = o(y, g, h, v, m[s + 14], 17, 2792965006), h = i(h, v = o(v, y, g, h, m[s + 15], 22, 1236535329), y, g, m[s + 1], 5, 4129170786),
    g = i(g, h, v, y, m[s + 6], 9, 3225465664), y = i(y, g, h, v, m[s + 11], 14, 643717713),
    v = i(v, y, g, h, m[s + 0], 20, 3921069994), h = i(h, v, y, g, m[s + 5], 5, 3593408605),
    g = i(g, h, v, y, m[s + 10], 9, 38016083), y = i(y, g, h, v, m[s + 15], 14, 3634488961),
    v = i(v, y, g, h, m[s + 4], 20, 3889429448), h = i(h, v, y, g, m[s + 9], 5, 568446438),
    g = i(g, h, v, y, m[s + 14], 9, 3275163606), y = i(y, g, h, v, m[s + 3], 14, 4107603335),
    v = i(v, y, g, h, m[s + 8], 20, 1163531501), h = i(h, v, y, g, m[s + 13], 5, 2850285829),
    g = i(g, h, v, y, m[s + 2], 9, 4243563512), y = i(y, g, h, v, m[s + 7], 14, 1735328473),
    h = a(h, v = i(v, y, g, h, m[s + 12], 20, 2368359562), y, g, m[s + 5], 4, 4294588738),
    g = a(g, h, v, y, m[s + 8], 11, 2272392833), y = a(y, g, h, v, m[s + 11], 16, 1839030562),
    v = a(v, y, g, h, m[s + 14], 23, 4259657740), h = a(h, v, y, g, m[s + 1], 4, 2763975236),
    g = a(g, h, v, y, m[s + 4], 11, 1272893353), y = a(y, g, h, v, m[s + 7], 16, 4139469664),
    v = a(v, y, g, h, m[s + 10], 23, 3200236656), h = a(h, v, y, g, m[s + 13], 4, 681279174),
    g = a(g, h, v, y, m[s + 0], 11, 3936430074), y = a(y, g, h, v, m[s + 3], 16, 3572445317),
    v = a(v, y, g, h, m[s + 6], 23, 76029189), h = a(h, v, y, g, m[s + 9], 4, 3654602809),
    g = a(g, h, v, y, m[s + 12], 11, 3873151461), y = a(y, g, h, v, m[s + 15], 16, 530742520),
    h = u(h, v = a(v, y, g, h, m[s + 2], 23, 3299628645), y, g, m[s + 0], 6, 4096336452),
    g = u(g, h, v, y, m[s + 7], 10, 1126891415), y = u(y, g, h, v, m[s + 14], 15, 2878612391),
    v = u(v, y, g, h, m[s + 5], 21, 4237533241), h = u(h, v, y, g, m[s + 12], 6, 1700485571),
    g = u(g, h, v, y, m[s + 3], 10, 2399980690), y = u(y, g, h, v, m[s + 10], 15, 4293915773),
    v = u(v, y, g, h, m[s + 1], 21, 2240044497), h = u(h, v, y, g, m[s + 8], 6, 1873313359),
    g = u(g, h, v, y, m[s + 15], 10, 4264355552), y = u(y, g, h, v, m[s + 6], 15, 2734768916),
    v = u(v, y, g, h, m[s + 13], 21, 1309151649), h = u(h, v, y, g, m[s + 4], 6, 4149444226),
    g = u(g, h, v, y, m[s + 11], 10, 3174756917), y = u(y, g, h, v, m[s + 2], 15, 718787259),
    v = u(v, y, g, h, m[s + 9], 21, 3951481745), h = r(h, l), v = r(v, f), y = r(y, p), g = r(g, d);
  return 32 == e ? (c(h) + c(v) + c(y) + c(g)).toLowerCase() : (c(v) + c(y)).toLowerCase()
}

function sha1(msg) {
  function rotate_left(n, s) { var t4 = (n << s) | (n >>> (32 - s)); return t4 };

  function cvt_hex(val) { var str = ''; var i; var v; for (i = 7; i >= 0; i--) { v = (val >>> (i * 4)) & 0x0f; str += v.toString(16) } return str };

  function Utf8Encode(string) { string = string.replace(/\r\n/g, '\n'); var utftext = ''; for (var n = 0; n < string.length; n++) { var c = string.charCodeAt(n); if (c < 128) { utftext += String.fromCharCode(c) } else if ((c > 127) && (c < 2048)) { utftext += String.fromCharCode((c >> 6) | 192); utftext += String.fromCharCode((c & 63) | 128) } else { utftext += String.fromCharCode((c >> 12) | 224); utftext += String.fromCharCode(((c >> 6) & 63) | 128); utftext += String.fromCharCode((c & 63) | 128) } } return utftext };
  var blockstart;
  var i, j;
  var W = new Array(80);
  var H0 = 0x67452301;
  var H1 = 0xEFCDAB89;
  var H2 = 0x98BADCFE;
  var H3 = 0x10325476;
  var H4 = 0xC3D2E1F0;
  var A, B, C, D, E;
  var temp;
  msg = Utf8Encode(msg);
  var msg_len = msg.length;
  var word_array = new Array();
  for (i = 0; i < msg_len - 3; i += 4) {
    j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 | msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
    word_array.push(j)
  }
  switch (msg_len % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
      break;
    case 2:
      i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
      break;
    case 3:
      i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
      break
  }
  word_array.push(i);
  while ((word_array.length % 16) != 14) word_array.push(0);
  word_array.push(msg_len >>> 29);
  word_array.push((msg_len << 3) & 0x0ffffffff);
  for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
    for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
    for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    A = H0;
    B = H1;
    C = H2;
    D = H3;
    E = H4;
    for (i = 0; i <= 19; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp
    }
    for (i = 20; i <= 39; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp
    }
    for (i = 40; i <= 59; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp
    }
    for (i = 60; i <= 79; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp
    }
    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff
  }
  var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
  return temp.toLowerCase()
}

// ============= 签名函数 =============
function getSign(type = 'app', params = {}, body = null, method = 'GET') {
  const config = type === 'h5' ? APP_CONFIG.h5 : APP_CONFIG.app;

  const querySortedStr = toQuery(params);

  const timestamp = new Date().getTime();
  const nonce = type === 'h5' ? getUuid() : timestamp + getRandomChars();

  let bodyStr = '';
  if (method === 'DELETE') {
    bodyStr = '';
  } else if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    bodyStr = JSON.stringify(body);
  }

  let signature;
  if (type === 'h5') {
    signature = `${querySortedStr}appId=${config.appId}&nonce=${nonce}&timestamp=${timestamp}${config.appSecret}`;
  } else {
    signature = `${querySortedStr}${bodyStr}appId=${config.appId}&nonce=${nonce}&timestamp=${timestamp}${config.appSecret}`;
  }

  const sign = md5(sha1(signature), 32).toString();

  logDebug(`签名[${type}] method=${method}`, { nonce, timestamp, querySortedStr, bodyStr, signature, sign });

  return {
    'cfmoto-x-param': `appId=${config.appId}&nonce=${nonce}&timestamp=${timestamp}`,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0'
  };
}

// ============= 工具函数 ===============
const __PARAMS = (() => {
  const obj = {};
  try {
    const qp = args.queryParameters || {};
    for (const k of Object.keys(qp))
      obj[k] = decodeURIComponent(String(qp[k] ?? ""));
  } catch { }
  try {
    const raw = args.widgetParameter || "";
    if (raw) {
      raw
        .split("&")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((kv) => {
          const [k, v] = kv.split("=");
          if (k) obj[k] = decodeURIComponent(v || "");
        });
    }
  } catch { }
  return obj;
})();

function getParam(key) {
  const v = __PARAMS[key];
  return v == null ? null : String(v);
}

const ALLOW_WIDGET_SIGN = (getParam("widgetSign") || "1") !== "0";

function todayStrYYYY_MM_DD_withDots() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function monthStrYYYY_MM_withDots() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}.${m}`;
}

function monthStrYYYY_MM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${m}`;
}

function calcDaysUntilLottery(continueDays) {
  const cd = Number(continueDays || 0);
  if (!isFinite(cd) || cd <= 0) return 30;
  let days = 30 - (cd % 30);
  if (cd % 30 === 0) days = 0;
  return days;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function joinUrl(base, path) {
  const b = String(base || "").trim().replace(/\/+$/, "");
  const p = String(path || "").trim().replace(/^\/+/, "");
  return `${b}/${p}`;
}

function toQuery(params = {}) {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort();
  if (keys.length === 0) return "";
  return keys.map((k) => `${k}=${params[k]}`).join("&");
}

function cleanToken(token) {
  return String(token || "").replace(/^[bB]earer\s+/i, "").trim();
}

const SERVER_NAME = getParam("server_name") || getParam("serverName") || "SMART";

function toMinutesStr(min) {
  const m = Number(min || 0);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h${rest}m` : `${h}h`;
}

// ============= 延迟函数 =============
function sleep(ms) {
  return new Promise(resolve => {
    Timer.schedule(ms / 1000, false, resolve);
  });
}

// ============= 持久化 ===============
const FM = FileManager.local();
const STATE_FILE = FM.joinPath(FM.documentsDirectory(), "zeeho_signin.json");

function readState() {
  try {
    if (!FM.fileExists(STATE_FILE)) return {};
    const txt = FM.readString(STATE_FILE) || "";
    if (!txt.trim()) return {};
    const v = JSON.parse(txt);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writeState(obj) {
  try {
    const payload = obj && typeof obj === "object" ? obj : {};
    delete payload.token;
    const prevState = readState();
    if (payload.totalPoints === 0 && prevState.totalPoints > 0) {
      payload.totalPoints = prevState.totalPoints;
    }
    FM.writeString(STATE_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("[writeState] error:", String(e?.message || e));
  }
}

// ============= 随机设备指纹 =============
// 背景：服务端风控会按"设备"标记脚本客户端——固定设备标识一旦被标记，写操作会持续返回
// 430 {"code":"31001","message":"非法的请求"}（换设备即可恢复）。此前本脚本请求完全不带 UA，
// 更容易被识别为脚本。因此每次请求随机生成一套真实设备指纹，UA 格式与官方 App 一致。
const ZEEHO_APP_UA_VERSION = "3.0.5";
const DEVICE_MODELS = [
  ["iPhone 11", "828*1792"], ["iPhone XR", "828*1792"], ["iPhone SE (3rd generation)", "750*1334"],
  ["iPhone 12 mini", "1080*2340"], ["iPhone 12", "1170*2532"], ["iPhone 12 Pro", "1170*2532"],
  ["iPhone 13 mini", "1080*2340"], ["iPhone 13", "1170*2532"], ["iPhone 13 Pro", "1170*2532"], ["iPhone 13 Pro Max", "1284*2778"],
  ["iPhone 14", "1170*2532"], ["iPhone 14 Plus", "1284*2778"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 14 Pro Max", "1290*2796"],
  ["iPhone 15", "1179*2556"], ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"],
  ["iPhone 16", "1179*2556"], ["iPhone 16 Pro", "1206*2622"], ["iPhone 16 Pro Max", "1320*2868"]
];
const IOS_VERSIONS = ["16.1.1", "16.6.1", "16.7.8", "17.1.1", "17.2.1", "17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];

function pickRandomDevice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomDeviceUuid() {
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// 官方 App UA：MOBILE|iOS|<系统>|ZEEHO_APP|<版本>|iPhone|<机型>|<分辨率>|<设备UUID>|<网络>|iOS
function randomDeviceUA() {
  const m = pickRandomDevice(DEVICE_MODELS);
  const net = Math.random() < 0.7 ? "WWAN" : "WIFI";
  return `MOBILE|iOS|${pickRandomDevice(IOS_VERSIONS)}|ZEEHO_APP|${ZEEHO_APP_UA_VERSION}|iPhone|${m[0]}|${m[1]}|${randomDeviceUuid()}|${net}|iOS`;
}

// ============= 请求封装 =============

async function requestWithSign(type, method, url, params, data, token, label = "") {
  const signHeaders = getSign(type, params, data, method);
  
  const signQuery = toQuery(params);
  const fullUrl = signQuery ? `${url}?${signQuery}` : url;

  const req = new Request(fullUrl);
  req.method = method;
  
  // 每次请求一套随机设备指纹：UA / x-app-info 与官方 App 同格式，避免固定/缺失指纹被风控判为脚本
  const deviceUA = randomDeviceUA();
  req.headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "Accept-Language": "zh-CN",
    "Accept": "*/*",
    "interfaceversion": "2",
    "user-agent": deviceUA,
    "x-app-info": deviceUA,
    "Authorization": `Bearer ${cleanToken(token)}`,
    ...signHeaders
  };
  
  const uid = (getParam("userId") || readState().userId || "").trim();
  if (uid) {
    req.headers["user_id"] = uid;
  }
  
  req.timeoutInterval = 10;

  if (data && (method === "POST" || method === "DELETE" || method === "PUT")) {
    req.body = typeof data === "string" ? data : JSON.stringify(data);
  }

  const t0 = Date.now();
  let text = "",
    status = -1;
  try {
    text = await req.loadString();
    status = req.response?.statusCode || -1;
  } catch (e) {
    console.error(`[${label}] Request error:`, String(e?.message || e));
    throw e;
  }

  const cost = Date.now() - t0;
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) { }

  const ok = status >= 200 && status < 400 && json;
  const cnLabel = API_LABELS[label] || label;
  logStep(cnLabel, ok ? "ok" : "fail", `${cost}ms`);
  if (DEBUG_MODE) {
    logDebug(`${cnLabel}[${label}] 请求详情`, { url: fullUrl, status, cost, response: text ? text.substring(0, 500) : "empty" });
  }

  if (status === 401 || status === 403) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (status >= 400 || !json) {
    throw new Error(`${label} failed with status ${status}: ${text || "empty"}`);
  }
  return json;
}

// ========== Token过期处理 ==========
async function handleTokenExpired() {
  if (config.runsInWidget) return false;
  
  logDebug("Token过期", "显示更新弹窗");
  
  const alert = new Alert();
  alert.title = "🔑 Token已过期";
  alert.message = "您的Token已过期，请重新获取并更新Token。\n\n获取方式：\n1. 打开ZEEHO App\n2. 抓包获取Authorization头\n3. 复制Token内容粘贴到下方\n\n💡 更新后会自动保存到脚本顶部的 HARDCODED_TOKEN";
  alert.addTextField("粘贴新Token", "");
  alert.addAction("✅ 更新Token");
  alert.addCancelAction("取消");
  
  const idx = await alert.present();
  if (idx === -1) return false;
  
  const newToken = alert.textFieldValue(0).trim();
  if (!newToken) {
    const alert2 = new Alert();
    alert2.title = "❌ Token不能为空";
    alert2.message = "请粘贴有效的Token";
    alert2.addAction("确定");
    await alert2.present();
    return false;
  }
  
  const script = await FM.readString(module.filename);
  const updatedScript = script.replace(
    /const HARDCODED_TOKEN = ".*?";/,
    `const HARDCODED_TOKEN = "${newToken}";`
  );
  await FM.writeString(module.filename, updatedScript);
  
  const alert2 = new Alert();
  alert2.title = "✅ Token已更新";
  alert2.message = `新Token: ${newToken.substring(0, 10)}...\n已保存到脚本顶部，请重新运行脚本。`;
  alert2.addAction("确定");
  await alert2.present();
  
  return true;
}

async function handleTokenExpiredInMain(isWidget) {
  const updated = await handleTokenExpired();
  if (updated) return true;
  if (isWidget) {
    Script.setWidget(buildFallbackWidget("🔑 Token已过期", "请在Scriptable内运行脚本更新Token"));
  } else {
    const alert = new Alert();
    alert.title = "⚠️ Token已过期";
    alert.message = "请更新Token后重新运行脚本。";
    alert.addAction("确定");
    await alert.present();
  }
  Script.complete();
  return false;
}

// ========== 安全请求包装器 ==========
async function safeRequest(fn, ...args) {
  try {
    return await fn(...args);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg === "TOKEN_EXPIRED") {
      throw new Error("TOKEN_EXPIRED");
    }
    throw e;
  }
}

// ========== 接口封装 ==========

async function fetchHomeRideInfo({ vinNo, token }) {
  const url = joinUrl(BASE, API.homeRideInfo);
  return await safeRequest(requestWithSign, 'app', "GET", url, { vinNo }, "", token, "homeRideInfo");
}

async function fetchMyRideInfo({ vinNo, month, token }) {
  const url = joinUrl(BASE, API.myRideInfo);
  return await safeRequest(requestWithSign, 'app', "GET", url, { vinNo, month }, "", token, "myRideInfo");
}

async function fetchVehicleWidgets({ vinNo, token }) {
  const url = joinUrl(BASE, API.vehicleWidgets(vinNo));
  return await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "vehicleWidgets");
}

async function fetchTotalIntegral({ token }) {
  const url = joinUrl(BASE, API.totalIntegral);
  return await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "totalIntegral");
}

async function fetchTirePressure({ vinNo, token }) {
  const url = joinUrl(BASE, API.tirePressure);
  return await safeRequest(requestWithSign, 'app', "GET", url, { vinNo, timePeriodType: 1 }, "", token, "tirePressure");
}

async function fetchVehicleList({ token }) {
  const url = joinUrl(BASE, API.vehicleList);
  return await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "vehicleList");
}

async function fetchVehicleHomePage({ vehicleId, uniqueIdentify, token }) {
  const url = joinUrl(BASE, API.vehicleHomePage(vehicleId));
  return await safeRequest(requestWithSign, 'app', "GET", url, { uniqueIdentify }, "", token, "vehicleHomePage");
}

async function postSignIn({ token }) {
  const url = joinUrl(H5_BASE, API_SIGNIN_V1);
  const params = { server_name: SERVER_NAME };
  return await safeRequest(requestWithSign, 'h5', "POST", url, params, null, token, "signin(POST)");
}

async function fetchSigninStatus({ token }) {
  const url = joinUrl(H5_BASE, API_SIGNIN_INFO);
  const params = { 
    month: monthStrYYYY_MM(),
    server_name: SERVER_NAME 
  };
  return await safeRequest(requestWithSign, 'h5', "GET", url, params, null, token, "signin(GET status)");
}

async function fetchSigninLottery({ token }) {
  const url = joinUrl(H5_BASE, API.signinLottery);
  const params = { 
    boxType: 0,
    server_name: SERVER_NAME 
  };
  return await safeRequest(requestWithSign, 'h5', "GET", url, params, null, token, "signinLottery");
}

async function fetchSupplementPrize({ supplementDate, token }) {
  const url = joinUrl(H5_BASE, "/cfmotoservermine/signin/supplementPrize");
  return await safeRequest(requestWithSign, 'h5', "GET", url, { supplementDate }, null, token, "supplementPrize");
}

// ========== 获取电池充电状态 ==========
async function fetchBatteryChargeState({ vinNo, token }) {
  const url = joinUrl(BASE, API.batteryInfo(vinNo));
  const result = await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "batteryInfo");
  return result?.data?.chargeStateStr || "未充电";
}

// ========== 发布动态相关接口 ==========

async function publishArticle({ content, token }) {
  const url = joinUrl(BASE, API.commonArticle);
  const body = {
    "postSubInfo": { "topicList": [] },
    "topicid": "",
    "postcontent": content
  };
  return await safeRequest(requestWithSign, 'app', "POST", url, {}, body, token, "publishArticle");
}

async function fetchArticleList({ userId, token }) {
  const url = joinUrl(BASE, API.mineArticleInfo);
  return await safeRequest(requestWithSign, 'app', "GET", url, { userId }, null, token, "fetchArticleList");
}

async function likeArticle({ postId, token }) {
  const url = joinUrl(BASE, API.likeFavorite);
  const body = { "postId": postId, "kindFlag": "0" };
  return await safeRequest(requestWithSign, 'app', "POST", url, {}, body, token, "likeArticle");
}

async function shareArticle({ articleId, token }) {
  const url = joinUrl(BASE, API.shareArticle(articleId));
  return await safeRequest(requestWithSign, 'app', "PUT", url, {}, null, token, "shareArticle");
}

async function deleteArticle({ articleId, token }) {
  const url = joinUrl(BASE, API.deleteArticle);
  return await safeRequest(requestWithSign, 'app', "DELETE", url, { articleId, postType: "1" }, null, token, "deleteArticle");
}

// ========== 领取分享积分接口（带每日检查） ==========
async function adjustByShare({ token }) {
  const state = readState() || {};
  const today = todayISO();
  
  if (state.lastSharePointsDate === today) {
    return { skipped: true, message: "今日已领取" };
  }
  
  const url = joinUrl(BASE, API.adjustByShare);
  const result = await safeRequest(requestWithSign, 'app', "GET", url, {}, null, token, "adjustByShare");
  logDebug("领取分享积分响应", result);
  
  if (String(result?.code) === "10000") {
    state.lastSharePointsDate = today;
    writeState(state);
  }
  
  return result;
}

// ========== 自动发布动态流程 ==========
async function autoPublishArticle(token, state) {
  const today = todayISO();
  
  if (!ENABLE_AUTO_POST) {
    return { skipped: true, msg: "自动发布已禁用" };
  }
  
  if (state.lastPostDate === today && !FORCE_RESET && !DEBUG_MODE) {
    logStep("发布动态", "skip", "今日已发布");
    return { skipped: true };
  }
  
  if (DEBUG_MODE) logStep("🐛 调试模式", "info", "强制重新发布");
  
  logStep("发布动态流程", "start", `"${POST_CONTENT}"`);
  
  try {
    // --- 步骤1: 发布 ---
    const publishResult = await publishArticle({ content: POST_CONTENT, token });
    logDebug("步骤1-发布动态 响应", publishResult);
    
    if (!publishResult || String(publishResult?.code) !== "10000") {
      logStep("步骤1-发布动态", "fail", publishResult?.message || "响应为空");
      return { ok: false, msg: publishResult?.message || "发布失败" };
    }
    logStep("步骤1-发布动态", "ok");
    
    await sleep(2000);
    
    // --- 步骤2: 取动态列表 ---
    const userId = state.userId || getParam("userId") || "";
    if (!userId) {
      logStep("步骤2-获取动态列表", "fail", "缺少userId");
      return { ok: false, msg: "缺少userId" };
    }
    
    const listResult = await fetchArticleList({ userId, token });
    logDebug("步骤2-获取动态列表 响应", listResult);
    
    if (!listResult || String(listResult?.code) !== "10000") {
      logStep("步骤2-获取动态列表", "fail", listResult?.message || "响应为空");
      return { ok: false, msg: listResult?.message || "获取动态列表失败" };
    }
    
    const articles = listResult?.data || [];
    if (articles.length === 0) {
      logStep("步骤2-获取动态列表", "fail", "没有找到动态");
      return { ok: false, msg: "没有找到动态" };
    }
    const articleId = articles[0].tuuid || articles[0].id || articles[0].articleId;
    logStep("步骤2-获取动态列表", "ok", `${articles.length}条 → ID: ${articleId}`);
    
    await sleep(1000);
    
    // --- 步骤3: 点赞 ---
    let likeSuccess = false;
    try {
      const likeResult = await likeArticle({ postId: articleId, token });
      logDebug("步骤3-点赞 响应", likeResult);
      likeSuccess = String(likeResult?.code) === "10000";
      logStep("步骤3-点赞", likeSuccess ? "ok" : "fail", likeResult?.message || "");
    } catch (e) {
      logStep("步骤3-点赞", "fail", String(e?.message || e));
    }
    
    await sleep(1000);
    
    // --- 步骤4: 分享 + 领取积分 ---
    let shareSuccess = false;
    let sharePointsReceived = false;
    try {
      const shareResult = await shareArticle({ articleId, token });
      logDebug("步骤4-分享 响应", shareResult);
      shareSuccess = String(shareResult?.code) === "10000";
      logStep("步骤4-分享", shareSuccess ? "ok" : "fail", shareResult?.message || "");
      
      if (shareSuccess) {
        try {
          const adjustResult = await adjustByShare({ token });
          if (adjustResult.skipped) {
            logStep("分享积分", "skip", "今日已领");
            sharePointsReceived = true;
          } else if (String(adjustResult?.code) === "10000") {
            logStep("分享积分", "ok");
            sharePointsReceived = true;
          } else {
            logStep("分享积分", "fail", adjustResult?.message || "");
          }
        } catch (adjustErr) {
          logStep("分享积分", "fail", String(adjustErr?.message || adjustErr));
        }
      }
    } catch (e) {
      logStep("步骤4-分享", "fail", String(e?.message || e));
    }
    
    await sleep(2000);
    
    // --- 步骤5: 删除 ---
    let deleteSuccess = false;
    try {
      const deleteResult = await deleteArticle({ articleId, token });
      logDebug("步骤5-删除 响应", deleteResult);
      deleteSuccess = String(deleteResult?.code) === "10000";
      logStep("步骤5-删除", deleteSuccess ? "ok" : "fail", deleteResult?.message || "");
    } catch (e) {
      logStep("步骤5-删除", "fail", String(e?.message || e));
    }
    
    state.lastPostDate = today;
    state.lastPostContent = POST_CONTENT;
    state.lastPostLiked = likeSuccess;
    state.lastPostShared = shareSuccess;
    state.lastPostDeleted = deleteSuccess;
    state.lastSharePointsReceived = sharePointsReceived;
    writeState(state);
    
    logStep("发布动态流程", "ok", `点赞${likeSuccess?"✓":"✗"} 分享${shareSuccess?"✓":"✗"} 删除${deleteSuccess?"✓":"✗"}`);
    
    return { 
      ok: true, 
      content: POST_CONTENT,
      articleId,
      liked: likeSuccess,
      shared: shareSuccess,
      deleted: deleteSuccess,
      sharePointsReceived
    };
    
  } catch (e) {
    const errMsg = String(e?.message || e);
    logStep("发布动态流程", "fail", errMsg);
    if (errMsg === "TOKEN_EXPIRED" || errMsg.includes("TOKEN_EXPIRED")) {
      throw new Error("TOKEN_EXPIRED");
    }
    return { ok: false, msg: errMsg || "发布流程异常" };
  }
}

// ========== 数据适配函数 =========
function adaptTirePressure(raw) {
  const d = raw?.data || raw || {};
  const list = Array.isArray(d.realTimeData) ? d.realTimeData : [];
  const byPos = {};
  for (const it of list) {
    const pos = Number(it?.sensorPosition);
    if (pos) byPos[pos] = it;
  }
  const fmtPressure = (it) => {
    const warn = Number(it?.warningType ?? 0);
    const v = String(it?.tirePressure ?? "").trim();
    const n = parseFloat(v);
    if (warn !== 0 || !v || !isFinite(n) || n <= 0) return "未绑定";
    return `${v}bar`;
  };
  const fTempVal = byPos[1]?.tireTemp;
  const rTempVal = byPos[2]?.tireTemp;
  const fWarn = Number(byPos[1]?.warningType ?? 0);
  const rWarn = Number(byPos[2]?.warningType ?? 0);
  const fmtTemp = (v, warn = 0) => {
    if (warn !== 0 || v == null) return "";
    const s = String(v).trim();
    const n = parseFloat(s);
    if (!s || s.toLowerCase() === "null" || !isFinite(n) || n <= 0) return "";
    return `${s}°C`;
  };
  const first = list[0] || null;
  const second = list[1] || null;
  const frontIt = byPos[1] || first;
  const rearIt = byPos[2] || second;
  const frontTempStr = fmtTemp(fTempVal, fWarn);
  const rearTempStr = fmtTemp(rTempVal, rWarn);
  return {
    frontPressure: frontIt ? fmtPressure(frontIt) : "未绑定",
    rearPressure: rearIt ? fmtPressure(rearIt) : "未绑定",
    frontTemp: frontTempStr,
    rearTemp: rearTempStr,
    ambientTemp: frontTempStr || rearTempStr,
  };
}

function adaptSigninStatus(raw) {
  const d = raw?.data || raw || {};
  const cont = Number(d.signCount ?? d.continueDays ?? d.days ?? 0);
  const list = Array.isArray(d.scoreList) ? d.scoreList : [];
  
  const cycleLen = list.length;
  const idx = cont > 0 && cycleLen > 0 ? ((cont - 1) % cycleLen) + 1 : 0;
  
  let todayScore = 0;
  if (idx > 0) {
    const hit = list.find((x) => Number(x.days) === idx);
    const scr = Number(hit?.score ?? 0);
    todayScore = isFinite(scr) ? scr : 0;
  }
  
  const daysUntil = calcDaysUntilLottery(cont);
  const isBlindDay = cont > 0 && cont % 30 === 0;
  let blindBoxScore = 0;
  if (isBlindDay && cycleLen > 0) {
    const hit30 = list.find((x) => Number(x.days) === 30);
    const hitCycle = idx > 0 ? list.find((x) => Number(x.days) === idx) : null;
    const scr = Number(hit30?.score ?? hitCycle?.score ?? todayScore ?? 0);
    blindBoxScore = isFinite(scr) ? scr : 0;
  }

  const lastTime = String(d.lastTime || "").trim();
  let alreadySignedToday = false;
  let lastSignDate = "";
  if (lastTime) {
    const datePart = lastTime.split(/\s+/)[0].replace(/\./g, "-").slice(0, 10);
    lastSignDate = datePart;
    alreadySignedToday = datePart === todayISO();
  }
  // 以服务端返回的"当日记录"为准（nowSignDetailVos: createDate + signStatue；3/5=已签，0=盲盒开启日也计已签）
  // 每次运行都按接口数据判断今天是否已签 → 决定是否执行签到（本地状态仅作缓存，避免状态文件与实际不一致）
  const todayKey = todayISO();
  const vos = Array.isArray(d.nowSignDetailVos) ? d.nowSignDetailVos : [];
  const todayVo = vos.find((x) => String(x?.createDate || "") === todayKey);
  if (todayVo) {
    const st = Number(todayVo.signStatue);
    alreadySignedToday = (st === 3 || st === 5 || st === 0);
    if (alreadySignedToday) lastSignDate = todayKey;
  }

  return {
    todayScore,
    continueDays: isFinite(cont) ? cont : 0,
    daysUntilLottery: daysUntil,
    isBlindDay,
    blindBoxScore,
    alreadySignedToday,
    lastSignDate,
    lastTime,
  };
}

function adaptTotalIntegral(raw) {
  const d = raw?.data || raw || {};
  const n = Number(d.integralTotal ?? d.totalIntegral ?? d.integral ?? d.score ?? 0);
  return isFinite(n) && n >= 0 ? n : 0;
}

function adaptTodayRide(homeRaw, myRideRaw) {
  const h = homeRaw?.data || homeRaw || {};
  const d = myRideRaw?.data || myRideRaw || {};
  const list = Array.isArray(d.rideRecordList) ? d.rideRecordList : [];
  const todayKey = todayStrYYYY_MM_DD_withDots();
  const day = list.find((x) => String(x?.date || "") === todayKey) || list[list.length - 1] || {};
  const mileages = Array.isArray(h.mileages) ? h.mileages : [];
  const avg = mileages.length > 0 ? mileages.reduce((s, x) => s + Number(x || 0), 0) / mileages.length : 0;
  return {
    distanceKm: Number(day.rideMileage ?? h.rideMileageDay ?? 0),
    durationMin: Number(day.ridingTimeDayUnitMinute ?? h.lastRidingTimeUnitMinute ?? 0),
    maxSpeedKmh: Number(day.maxSpeed ?? 0),
    accelCount: Number(day.accelerationTimesDay ?? 0),
    brakeCount: Number(day.brakesTimesDay ?? 0),
    lastRideMileage: Number(h.lastRideMileage ?? 0),
    lastRideDurationMin: Number(h.lastRidingTimeUnitMinute ?? 0),
    lastMaxSpeed: Number(h.lastMaxSpeed ?? 0),
    avgMileageKm: isFinite(avg) ? Number(avg.toFixed(1)) : 0,
  };
}

function adaptWidgets(raw) {
  const d = raw?.data || raw || {};
  const loc = d.location || {};
  const soc = Number(d.bmssoc ?? d.batteryLevel ?? 0);
  const range = Number(d.hmiRidableMile ?? d.vehicleRidableMile ?? d.ridableMileage ?? 0);
  // 电压（中尺寸组件显示）：兼容官方多种字段名
  const voltage = Number(d.voltage ?? d.batteryVoltage ?? d.bmsVoltage ?? d.totalVoltage ?? d.batteryTotalVoltage ?? 0);
  const address = String(d.address || "").trim();
  const locationTime = String(loc.locationTime || "").trim();
  const pulledOut = String(d.batteryPullOutFlag ?? "") === "1";
  let statusText = address || "位置未知";
  if (pulledOut) statusText = "电池已拔出";
  return {
    batteryPercent: Math.max(0, Math.min(100, isFinite(soc) ? soc : 0)),
    residualRangeKm: isFinite(range) ? range : 0,
    voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
    address,
    locationTime,
    longitude: Number(loc.longitude),
    latitude: Number(loc.latitude),
    statusText,
    vehicleName: String(d.vehicleName || "").trim(),
    vehicleImageUrl: String(d.vehicleScalePicUrl || d.vehiclePicUrl || "").trim(),
    headLockState: String(d.headLockState ?? "").trim(),
    batteryPullOutFlag: String(d.batteryPullOutFlag ?? "").trim(),
  };
}

// ========== 配置函数 ==========
function mapVehicleList(raw) {
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return list.map((it) => ({
    vinNo: String(it?.vinNo || it?.frameNo || "").trim(),
    name: String(it?.vehicleName || it?.vehicleType || it?.deviceName || "车辆").trim() || "车辆",
    pic: String(it?.vehiclePicUrl || "").trim(),
    bmssoc: String(it?.bmssoc || it?.bmssocStr || "").trim(),
    vehicleType: String(it?.vehicleType || "").trim(),
    licensePlate: it?.licensePlate || null,
  })).filter((x) => x.vinNo);
}

async function chooseVehicle(token) {
  let items = [];
  try {
    const url = joinUrl(BASE, API.vehicleList);
    const res = await requestWithSign('app', "GET", url, {}, "", token, "vehicleList");
    items = mapVehicleList(res);
  } catch (e) {
    console.error("获取车辆列表失败:", e);
    throw new Error("获取车辆列表失败，请检查Token");
  }
  
  if (!items.length) {
    throw new Error("未能获取到车辆列表，请检查Token或稍后再试");
  }

  const a = new Alert();
  a.title = "🚗 选择你的车辆";
  a.message = `找到 ${items.length} 辆车，请选择用于小组件显示的车辆`;
  
  const show = items.slice(0, 12);
  show.forEach((v) => {
    const desc = [
      v.name,
      v.vehicleType ? `型号:${v.vehicleType}` : null,
      v.licensePlate ? `车牌:${v.licensePlate}` : null,
      v.vinNo ? `车架号:${v.vinNo.slice(-6)}` : null,
    ].filter(Boolean).join(" · ");
    a.addAction(desc);
  });
  a.addCancelAction("取消");
  
  const idx = await a.present();
  if (idx === -1) throw new Error("已取消选择");
  return show[idx];
}

async function promptForToken(initial = "") {
  const a = new Alert();
  a.title = "🔑 设置Token";
  a.message = "请粘贴ZEEHO Token。\n\n获取方式：\n1. 打开ZEEHO App\n2. 抓包获取Authorization头\n3. 复制Token内容粘贴到下方\n\n💡 输入后会自动保存到脚本顶部的 HARDCODED_TOKEN";
  a.addTextField("在此粘贴Token包括Bearer ", initial);
  a.addAction("确定");
  a.addCancelAction("取消");
  const idx = await a.present();
  if (idx === -1) throw new Error("已取消");
  return a.textFieldValue(0).trim();
}

async function promptForImageUrl(initial = "") {
  const a = new Alert();
  a.title = "车辆图片";
  a.message = "输入URL可自定义图片，留空则自动抓取app图片";
  a.addTextField("默认留空自动抓取图片", initial);
  a.addAction("确定");
  a.addCancelAction("跳过");
  const idx = await a.present();
  if (idx === -1) return "";
  return a.textFieldValue(0).trim();
}

async function saveTokenToScript(token) {
  try {
    const script = await FM.readString(module.filename);
    const updatedScript = script.replace(
      /const HARDCODED_TOKEN = ".*?";/,
      `const HARDCODED_TOKEN = "${token}";`
    );
    await FM.writeString(module.filename, updatedScript);
    return true;
  } catch (e) {
    console.error("保存Token到脚本失败:", e);
    return false;
  }
}

async function selectVehicleAndSave(token, state) {
  const picked = await chooseVehicle(token);
  state.vinNo = picked.vinNo;
  state.vehicleName = picked.name;
  state.vehicleType = picked.vehicleType || "";
  state.licensePlate = picked.licensePlate || "";
  const imgInput = await promptForImageUrl("");
  state.vehicleImageUrl = imgInput || picked.pic || "";
  writeState(state);
  return picked;
}

async function selectVehicleForce(token, state) {
  try {
    const picked = await selectVehicleAndSave(token, state);
    logStep("选择车辆", "ok", `${picked.name} (${picked.vinNo})`);
    return true;
  } catch (e) {
    logStep("选择车辆", "fail", String(e));
    return false;
  }
}

async function ensureFirstRunConfig(state) {
  const pToken = (getParam("token") || "").trim();
  let token = pToken || HARDCODED_TOKEN || "";
  
  if (pToken) {
    await saveTokenToScript(pToken);
    token = pToken;
  }

  if (!token) {
    const t = await promptForToken("");
    if (!t) throw new Error("Token为空");
    token = t;
    await saveTokenToScript(t);
  }
  
  logStep("选择车辆", "start");
  const picked = await selectVehicleAndSave(token, state);
  logStep("选择车辆", "ok", `${picked.name} (${picked.vinNo})`);
  return state;
}

function buildFallbackWidget(title = "🔑 需要配置", message = "请在Scriptable内运行脚本进行配置") {
  const w = new ListWidget();
  w.addSpacer(10);
  const t = w.addText(title);
  t.font = Font.semiboldSystemFont(14);
  t.textColor = Color.black();
  w.addSpacer(8);
  const m = w.addText(message);
  m.font = Font.systemFont(11);
  m.textColor = new Color("#6b7280");
  w.addSpacer();
  return w;
}

// ========== 通知和UI辅助 =========
async function notifyBlindBoxResult({ ok, msg = "", prizeName = "", integral = "" }) {
  try {
    const n = new Notification();
    n.threadIdentifier = "zeeho-blindbox-status";
    n.sound = "default";
    n.title = ok ? "🎁 ZEEHO 盲盒签到成功" : "⚠️ ZEEHO 盲盒签到失败";
    if (ok) {
      const parts = [];
      if (prizeName) parts.push(String(prizeName).trim());
      if (integral != null && String(integral).trim()) parts.push(`${String(integral).trim()}积分`);
      n.body = parts.length ? parts.join(" · ") : "盲盒奖励已触发";
    } else {
      n.body = msg || "盲盒请求失败";
    }
    await n.schedule();
  } catch (e) {
    console.error("[notifyBlindBoxResult] error:", String(e?.message || e));
  }
}

async function notifyPostResult({ ok, msg = "", content = "" }) {
  try {
    const n = new Notification();
    n.threadIdentifier = "zeeho-post-status";
    n.sound = "default";
    n.title = ok ? "📝 ZEEHO 动态发布成功" : "⚠️ ZEEHO 动态发布失败";
    if (ok) {
      n.body = `已发布并删除: ${content}`;
    } else {
      n.body = msg || "发布失败";
    }
    await n.schedule();
  } catch (e) {
    console.error("[notifyPostResult] error:", String(e?.message || e));
  }
}

function drawProgressBar(percent = 0, width = 120, height = 6, barColor = new Color("#10b981"), bgColor = new Color("#E5E7EB")) {
  const p = Math.max(0, Math.min(100, Number(percent || 0)));
  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  const r = height / 2;
  dc.setFillColor(bgColor);
  dc.fillEllipse(new Rect(0, 0, height, height));
  if (width - height > 0) dc.fillRect(new Rect(r, 0, width - 2 * r, height));
  dc.fillEllipse(new Rect(width - height, 0, height, height));
  const fw = Math.round(width * (p / 100));
  if (fw <= 0) return dc.getImage();
  dc.setFillColor(barColor);
  if (fw <= height) {
    dc.fillEllipse(new Rect(0, 0, Math.max(2, fw), height));
  } else {
    dc.fillEllipse(new Rect(0, 0, height, height));
    if (fw - height > 0) dc.fillRect(new Rect(r, 0, fw - height, height));
    if (fw >= height) dc.fillEllipse(new Rect(fw - height, 0, height, height));
  }
  return dc.getImage();
}

async function loadVehicleImage(url) {
  if (!url || url.trim() === "") return null;
  const dir = FM.cacheDirectory?.() || FM.documentsDirectory();
  const cachePath = FM.joinPath(dir, "zeeho_vehicle_cache.jpg");
  const metaPath = FM.joinPath(dir, "zeeho_vehicle_cache.url");
  try {
    if (FM.fileExists(cachePath) && FM.fileExists(metaPath)) {
      const cachedUrl = String(FM.readString(metaPath) || "");
      if (cachedUrl === String(url)) {
        return FM.readImage(cachePath);
      }
    }
  } catch { }
  try {
    const req = new Request(url);
    req.timeoutInterval = 6;
    const img = await req.loadImage();
    if (img) {
      try {
        FM.writeImage(cachePath, img);
        FM.writeString(metaPath, String(url));
      } catch { }
    }
    return img;
  } catch {
    try {
      if (FM.fileExists(cachePath)) return FM.readImage(cachePath);
    } catch { }
    return null;
  }
}

// ========= UI：卡片 =========
async function buildWidgetCard(data, chargeStateStr = "未充电") {
// ===== 浅色配色 =====
const C_BG = new Color("#ECF5FF");        // 组件背景色 - 淡蓝色
const C_BATT = new Color("#0f172a");      // 电量百分比数字 - 深灰蓝
const C_NAME = new Color("#1d4ed8");      // 车辆名称 - 宝蓝色
const C_PTS = new Color("#15609eff");     // 总积分数字 - 中蓝色
const C_TEMP = new Color("#0284c7");      // 胎压温度值 - 亮蓝色
const C_TEXT = new Color("#475569");      // 主要文本 - 石板灰
const C_TEXT_DIM = new Color("#0f172a");  // 次要文本 - 深灰蓝
const C_TEXT_FAINT = new Color("#475569");// 淡化文本 - 石板灰
const C_OK = new Color("#059669");        // 成功/已签/充电中 - 翠绿色
const C_WARN = new Color("#d97706");      // 警告/极速 - 琥珀色
const C_DANGER = new Color("#dc2626");    // 危险/低电量 - 红色
const C_BAR_BG = new Color("#DBEAFE");    // 电量进度条背景 - 淡蓝色
const C_DIVIDER = new Color("#475569");   // 分隔符 · - 石板灰

  const w = new ListWidget();
  w.backgroundColor = C_BG;

  // ===== 读取 UI_CONFIG =====
  const vSpacing = (UI_CONFIG.verticalSpacing != null) ? UI_CONFIG.verticalSpacing : 2;
  const extraVSpacing = (UI_CONFIG.extraVerticalSpacing != null) ? UI_CONFIG.extraVerticalSpacing : 0;
  const padding = (UI_CONFIG.padding != null) ? UI_CONFIG.padding : 10;
  const imgW = (UI_CONFIG.imageWidth != null) ? UI_CONFIG.imageWidth : 90;
  const imgH = (UI_CONFIG.imageHeight != null) ? UI_CONFIG.imageHeight : 56;
  const imgOffsetY = (UI_CONFIG.imageOffsetY != null) ? UI_CONFIG.imageOffsetY : 0;
  const rideRowSpacing = (UI_CONFIG.rideRowSpacing != null) ? UI_CONFIG.rideRowSpacing : 4;
  const rideVerticalSpacing = (UI_CONFIG.rideVerticalSpacing != null) ? UI_CONFIG.rideVerticalSpacing : 1;
  const rideRowOffsetY = (UI_CONFIG.rideRowOffsetY != null) ? UI_CONFIG.rideRowOffsetY : 0;
  const lastRideRowOffsetY = (UI_CONFIG.lastRideRowOffsetY != null) ? UI_CONFIG.lastRideRowOffsetY : 0;

  // 应用额外的垂直间距
  w.setPadding(padding, padding + 2, padding, padding + 2);
  w.spacing = vSpacing + extraVSpacing;

  try {
    const runUrl = URLScheme.forRunningScript();
    if (runUrl) w.url = runUrl;
  } catch (_) { }

  const pctBarW = Math.max(120, 305 - imgW - 12);
  const pctBarH = 6;

  // ===== 数据抽取 =====
  const vehicleName = data.vehicleDisplayName || "车辆";
  logDebug("Widget 车辆名称", vehicleName);

  const signed = !!data.signedToday;
  const cdays = isFinite(Number(data.points.continueDays)) ? Number(data.points.continueDays) : 0;
  const untilBox = isFinite(Number(data.points.daysUntilLottery)) ? Number(data.points.daysUntilLottery) : calcDaysUntilLottery(cdays);
  const isBlindDay = !!data.points.isBlindDay || (cdays > 0 && cdays % 30 === 0);
  const blindScore = isFinite(Number(data.points.blindBoxScore)) ? Number(data.points.blindBoxScore) : Number(data.points.today || 0);
  const percent = Math.round(data.batteryPercent);
  const range = data.residualRangeKm;
  // 电压：中/大尺寸显示（小尺寸空间不足，自动隐藏）
  const volt = Number(data.voltage || 0);
  const showVolt = volt > 0 && config.widgetFamily !== "small";
  const isCharging = chargeStateStr && chargeStateStr !== "未充电";
  const dist = isFinite(data.today.distanceKm) ? data.today.distanceKm.toFixed(1) : "—";
  const dur = isFinite(data.today.durationMin) ? toMinutesStr(data.today.durationMin) : "—";
  const maxSpd = Number(data.today.maxSpeedKmh ?? 0);
  const tp = data.tire || {};
  const frontUnbound = !tp.frontPressure || tp.frontPressure === "未绑定";
  const rearUnbound = !tp.rearPressure || tp.rearPressure === "未绑定";
  const totalVal = isFinite(Number(data.points.total)) ? Number(data.points.total) : 0;
  const todayVal = isFinite(Number(data.points.today)) ? Number(data.points.today) : 0;
  
  // 上次骑行数据
  const lastKm = isFinite(Number(data.today.lastRideMileage)) ? Number(data.today.lastRideMileage).toFixed(1) : "0.0";
  const lastDur = isFinite(Number(data.today.lastRideDurationMin)) ? Number(data.today.lastRideDurationMin) : 0;
  const lastMaxSpd = Number(data.today.lastMaxSpeed ?? 0);

  // ========== 第一行：车名 + 签到badge + 盲盒badge + 时间 ==========
  const rowTop = w.addStack();
  rowTop.layoutHorizontally();
  rowTop.centerAlignContent();
  rowTop.spacing = 4;

  const nameTxt = rowTop.addText(vehicleName);
  nameTxt.font = Font.boldSystemFont(14);
  nameTxt.textColor = C_NAME;
  nameTxt.lineLimit = 1;
  nameTxt.minimumScaleFactor = 0.8;
  rowTop.addSpacer();

  const badge = rowTop.addStack();
  badge.layoutHorizontally();
  badge.setPadding(2, 5, 2, 5);
  badge.cornerRadius = 2;
  badge.backgroundColor = signed ? new Color("#DCFCE7") : new Color("#FEE2E2");
  const badgeText = badge.addText(signed ? "●已签" : "○未签");
  badgeText.font = Font.systemFont(8);
  badgeText.textColor = signed ? new Color("#166534") : new Color("#991B1B");

  rowTop.addSpacer(2);

  const boxBadge = rowTop.addStack();
  boxBadge.layoutHorizontally();
  boxBadge.setPadding(2, 5, 2, 5);
  boxBadge.cornerRadius = 2;
  boxBadge.backgroundColor = new Color("#FEF3C7");
  const boxTxt = boxBadge.addText(isBlindDay ? `盲盒+${blindScore}` : `盲盒${untilBox}天`);
  boxTxt.font = Font.systemFont(8);
  boxTxt.textColor = new Color("#92400E");

  rowTop.addSpacer(2);

  const refreshTime = new Date();
  const timeStr = `${String(refreshTime.getHours()).padStart(2, "0")}:${String(refreshTime.getMinutes()).padStart(2, "0")}`;
  const timeTxt = rowTop.addText(timeStr);
  timeTxt.font = Font.systemFont(8);
  timeTxt.textColor = C_TEXT_FAINT;

  // ========== 主视觉区：左电量 + 右图片 ==========
  const rowMain = w.addStack();
  rowMain.layoutHorizontally();
  rowMain.centerAlignContent();
  rowMain.spacing = 8;

  const leftCol = rowMain.addStack();
  leftCol.layoutVertically();
  leftCol.spacing = 2;

  const pctRow = leftCol.addStack();
  pctRow.layoutHorizontally();
  pctRow.centerAlignContent();
  pctRow.spacing = 3;

  // 电量百分比数字 - 使用独立的颜色 C_BATT（深灰蓝）
  const pctTxt = pctRow.addText(`${percent}%`);
  pctTxt.font = Font.heavySystemFont(22);
  pctTxt.textColor = C_BATT;
  pctTxt.lineLimit = 1;

  if (isCharging) {
    const chargeTxt = pctRow.addText("⚡️");
    chargeTxt.font = Font.systemFont(12);
    chargeTxt.textColor = C_OK;
  }

  const rangeTxt = pctRow.addText(`${range}km`);
  rangeTxt.font = Font.systemFont(9);
  rangeTxt.textColor = C_TEXT_DIM;
  rangeTxt.lineLimit = 1;

  if (showVolt) {
    const voltTxt = pctRow.addText(`·${Math.round(volt)}V`);
    voltTxt.font = Font.systemFont(9);
    voltTxt.textColor = C_TEXT_DIM;
    voltTxt.lineLimit = 1;
  }

  if (isCharging) {
    const chargeStateTxt = pctRow.addText(`·🔋${chargeStateStr}`);
    chargeStateTxt.font = Font.systemFont(8);
    chargeStateTxt.textColor = C_OK;
    chargeStateTxt.lineLimit = 1;
  }

  // 进度条颜色 - 独立设置，与百分比文字颜色分开
  let barFillColor;
  if (isCharging) {
    barFillColor = new Color("#10b981"); // 充电时绿色
  } else if (percent <= 20) {
    barFillColor = new Color("#ef4444"); // 低电量红色
  } else if (percent <= 50) {
    barFillColor = new Color("#f59e0b"); // 中等电量橙色
  } else {
    barFillColor = new Color("#005782"); // 正常电量蓝色
  }

  const barImg = drawProgressBar(percent, pctBarW, pctBarH, barFillColor, C_BAR_BG);
  const barView = leftCol.addImage(barImg);
  barView.imageSize = new Size(pctBarW, pctBarH);

  // ========== 电量条下方：今日骑行数据 ==========
  // 添加一个小间距
  leftCol.addSpacer(1);

  // 今日骑行行
  const rowRideContainer = leftCol.addStack();
  rowRideContainer.layoutHorizontally();
  rowRideContainer.centerAlignContent();
  rowRideContainer.spacing = rideRowSpacing;

  const rideLabel = rowRideContainer.addText("今日");
  rideLabel.font = Font.systemFont(8);
  rideLabel.textColor = C_TEXT_FAINT;

  const distTxt = rowRideContainer.addText(`${dist}km`);
  distTxt.font = Font.systemFont(8);
  distTxt.textColor = C_TEXT;
  distTxt.lineLimit = 1;

  const rideSep1 = rowRideContainer.addText("·");
  rideSep1.font = Font.systemFont(8);
  rideSep1.textColor = C_DIVIDER;

  const durTxt = rowRideContainer.addText(dur);
  durTxt.font = Font.systemFont(8);
  durTxt.textColor = C_TEXT_DIM;

  const rideSep2 = rowRideContainer.addText("·");
  rideSep2.font = Font.systemFont(8);
  rideSep2.textColor = C_DIVIDER;

  const spdLabel = rowRideContainer.addText("极速");
  spdLabel.font = Font.systemFont(8);
  spdLabel.textColor = C_TEXT_FAINT;

  const spdTxt = rowRideContainer.addText(`${maxSpd}km/h`);
  spdTxt.font = Font.systemFont(8);
  spdTxt.textColor = C_WARN;

  rowRideContainer.addSpacer();

  // ========== 上次骑行数据（紧挨着今日骑行） ==========
  // 添加骑行数据行之间的间距
  if (rideVerticalSpacing > 0) {
    leftCol.addSpacer(rideVerticalSpacing);
  }

  const rowLastRideContainer = leftCol.addStack();
  rowLastRideContainer.layoutHorizontally();
  rowLastRideContainer.centerAlignContent();
  rowLastRideContainer.spacing = rideRowSpacing;

  const lastLabel = rowLastRideContainer.addText("上次");
  lastLabel.font = Font.systemFont(8);
  lastLabel.textColor = C_TEXT_FAINT;

  const lastKmTxt = rowLastRideContainer.addText(`${lastKm}km`);
  lastKmTxt.font = Font.systemFont(8);
  lastKmTxt.textColor = C_TEXT_DIM;

  const lastSep = rowLastRideContainer.addText("·");
  lastSep.font = Font.systemFont(8);
  lastSep.textColor = C_DIVIDER;

  const lastDurTxt = rowLastRideContainer.addText(`${lastDur}min`);
  lastDurTxt.font = Font.systemFont(8);
  lastDurTxt.textColor = C_TEXT_DIM;

  // 如果有上次极速数据，也显示
  if (lastMaxSpd > 0) {
    const lastSep2 = rowLastRideContainer.addText("·");
    lastSep2.font = Font.systemFont(8);
    lastSep2.textColor = C_DIVIDER;
    
    const lastSpdLabel = rowLastRideContainer.addText("极速");
    lastSpdLabel.font = Font.systemFont(8);
    lastSpdLabel.textColor = C_TEXT_FAINT;
    
    const lastSpdTxt = rowLastRideContainer.addText(`${lastMaxSpd}km/h`);
    lastSpdTxt.font = Font.systemFont(8);
    lastSpdTxt.textColor = C_WARN;
  }

  rowLastRideContainer.addSpacer();

  // —— 右侧：车辆图片 ——
  const rightCol = rowMain.addStack();
  rightCol.layoutVertically();
  rightCol.bottomAlignContent();
  rightCol.size = new Size(imgW + 4, 0);

  if (imgOffsetY > 0) rightCol.addSpacer(imgOffsetY);

  const preferImgUrl = data.vehicleImageUrl || IMAGE_URL;
  if (preferImgUrl && preferImgUrl.trim() !== "") {
    const img = await loadVehicleImage(preferImgUrl);
    if (img) {
      const vehicleImg = rightCol.addImage(img);
      vehicleImg.imageSize = new Size(imgW, imgH);
      vehicleImg.applyFillingContentMode();
      vehicleImg.rightAlignImage();
    }
  }

  if (imgOffsetY < 0) rightCol.addSpacer(-imgOffsetY);

  // ========== 底部第1行：胎压 ==========
  if (!(frontUnbound && rearUnbound)) {
    const rowTire = w.addStack();
    rowTire.layoutHorizontally();
    rowTire.centerAlignContent();
    rowTire.spacing = 4;

    const fL = rowTire.addText("前"); fL.font = Font.systemFont(8); fL.textColor = C_TEXT_FAINT;
    const fP = rowTire.addText(tp.frontPressure || "未绑"); fP.font = Font.systemFont(8); fP.textColor = C_TEXT_DIM;
    if (tp.frontTemp) {
      const fT = rowTire.addText(tp.frontTemp); fT.font = Font.systemFont(8); fT.textColor = C_TEMP;
    }

    rowTire.addSpacer();

    const rL = rowTire.addText("后"); rL.font = Font.systemFont(8); rL.textColor = C_TEXT_FAINT;
    const rP = rowTire.addText(tp.rearPressure || "未绑"); rP.font = Font.systemFont(8); rP.textColor = C_TEXT_DIM;
    const rightTempVal = tp.rearTemp || tp.ambientTemp || "";
    if (rightTempVal) {
      const rT = rowTire.addText(rightTempVal); rT.font = Font.systemFont(8); rT.textColor = C_TEMP;
    }
  }

  // ========== 底部第2行：积分 + 发布状态 ==========
  const rowBottom = w.addStack();
  rowBottom.layoutHorizontally();
  rowBottom.centerAlignContent();
  rowBottom.spacing = 4;

  const totalTxt = rowBottom.addText(`${totalVal}`);
  totalTxt.font = Font.semiboldSystemFont(10);
  totalTxt.textColor = C_PTS;
  totalTxt.lineLimit = 1;

  const plusTxt = rowBottom.addText(`+${todayVal}`);
  plusTxt.font = Font.systemFont(8);
  plusTxt.textColor = C_OK;
  plusTxt.lineLimit = 1;

  const dot1 = rowBottom.addText("·");
  dot1.font = Font.systemFont(8);
  dot1.textColor = C_DIVIDER;

  const cdTxt = rowBottom.addText(`连签${cdays}天`);
  cdTxt.font = Font.systemFont(8);
  cdTxt.textColor = C_TEXT_DIM;
  cdTxt.lineLimit = 1;

  rowBottom.addSpacer();

  if (DEBUG_MODE) {
    const debugLabel = rowBottom.addText("🐛");
    debugLabel.font = Font.systemFont(8);
    debugLabel.textColor = C_WARN;
    rowBottom.addSpacer(2);
  }

  const actionsStack = rowBottom.addStack();
  actionsStack.layoutHorizontally();
  actionsStack.centerAlignContent();
  actionsStack.spacing = 2;

  if (data.postStatus === "success") {
    const mk = (label, ok) => {
      const t = actionsStack.addText(ok ? `✓${label}` : `✕${label}`);
      t.font = Font.systemFont(7);
      t.textColor = ok ? C_OK : C_DANGER;
    };
    mk("发布", true);
    mk("点赞", data.liked);
    mk("分享", data.shared);
    mk("删除", data.deleted);
  } else if (data.postStatus === "failed") {
    const failTxt = actionsStack.addText("✕发布");
    failTxt.font = Font.systemFont(7);
    failTxt.textColor = C_DANGER;
  } else {
    const waitTxt = actionsStack.addText("⏳待发布");
    waitTxt.font = Font.systemFont(7);
    waitTxt.textColor = C_TEXT_FAINT;
  }

  return w;
}

// ============== manualSignIn ==============
async function manualSignIn(token, state) {
  try {
    const res = await postSignIn({ token });
    const code = String(res?.code || "");
    const data = res?.data || {};

    if (code === "10000") {
      const todayAward = Number(data?.integralScore ?? 0);
      const cont = Number(data?.continueDays ?? 0);
      const uid = String(data?.id || data?.userId || data?.user?.id || "").trim();
      const today = todayISO();

      if (uid) state.userId = uid;
      state.lastSignDate = today;
      state.lastSignOk = true;
      state.lastSignTime = new Date().toISOString();
      state.todaySigned = true;
      if (isFinite(cont) && cont > 0) state.continueDays = cont;
      writeState(state);

      return {
        ok: true,
        userId: state.userId || null,
        todayAward: isFinite(todayAward) ? todayAward : null,
        continueDays: Number(state.continueDays || 0),
      };
    }

    const msg = String(res?.message || "");
    if (/已签|重复|repeatedly/i.test(msg) || code === "repeatedly_operation") {
      state.lastSignDate = todayISO();
      state.todaySigned = true;
      state.lastSignOk = true;
      writeState(state);
      return {
        ok: true,
        skipped: true,
        continueDays: Number(state.continueDays || 0),
      };
    }

    state.lastSignOk = false;
    writeState(state);
    return { ok: false, msg: msg || "签到失败" };
  } catch (e) {
    const errMsg = String(e?.message || e);
    if (errMsg === "TOKEN_EXPIRED") {
      throw new Error("TOKEN_EXPIRED");
    }
    state.lastSignOk = false;
    state.todaySigned = false;
    writeState(state);
    return { ok: false, msg: errMsg };
  }
}

// ============== 主流程 ===============
async function main() {
  logStep("ZEEHO 小组件", "start");
  logDebug("DEBUG_MODE", DEBUG_MODE);
  
  let state = readState() || {};
  
  if (state.uiConfig) {
    UI_CONFIG.verticalSpacing = state.uiConfig.verticalSpacing ?? UI_CONFIG.verticalSpacing;
    UI_CONFIG.horizontalSpacing = state.uiConfig.horizontalSpacing ?? UI_CONFIG.horizontalSpacing;
    UI_CONFIG.padding = state.uiConfig.padding ?? UI_CONFIG.padding;
    UI_CONFIG.imageWidth = state.uiConfig.imageWidth ?? UI_CONFIG.imageWidth;
    UI_CONFIG.imageHeight = state.uiConfig.imageHeight ?? UI_CONFIG.imageHeight;
    UI_CONFIG.imageOffsetY = state.uiConfig.imageOffsetY ?? UI_CONFIG.imageOffsetY;
    UI_CONFIG.rideRowSpacing = state.uiConfig.rideRowSpacing ?? UI_CONFIG.rideRowSpacing;
    UI_CONFIG.rideVerticalSpacing = state.uiConfig.rideVerticalSpacing ?? UI_CONFIG.rideVerticalSpacing;
    UI_CONFIG.rideRowOffsetY = state.uiConfig.rideRowOffsetY ?? UI_CONFIG.rideRowOffsetY;
    UI_CONFIG.lastRideRowOffsetY = state.uiConfig.lastRideRowOffsetY ?? UI_CONFIG.lastRideRowOffsetY;
    UI_CONFIG.extraVerticalSpacing = state.uiConfig.extraVerticalSpacing ?? UI_CONFIG.extraVerticalSpacing;
  }
  
  if (FORCE_RESET) {
    logStep("强制重置", "info", "清除所有保存数据");
    try {
      if (FM.fileExists(STATE_FILE)) FM.remove(STATE_FILE);
    } catch { }
    state = {};
  }
  
  const doReset = (getParam("reset") || "").trim() === "1" && !config.runsInWidget;
  if (doReset) {
    logStep("参数重置", "info", "reset=1");
    try {
      if (FM.fileExists(STATE_FILE)) FM.remove(STATE_FILE);
    } catch { }
    state = {};
  }
  
  logDebug("当前State", state);
  logDebug("启动参数", __PARAMS);

  const isWidget = config.runsInWidget;
  
  const pToken = (getParam("token") || "").trim();
  let token = pToken || HARDCODED_TOKEN || "";
  
  if (pToken && pToken !== HARDCODED_TOKEN) {
    await saveTokenToScript(pToken);
    token = pToken;
  }
  
  if ((!token || !state.vinNo) && !isWidget) {
    try {
      state = await ensureFirstRunConfig(state) || state;
      token = HARDCODED_TOKEN;
      logStep("首次配置", "ok", `车辆: ${state.vehicleName}`);
    } catch (e) {
      logStep("首次配置", "fail", String(e));
      const alert = new Alert();
      alert.title = "❌ 配置取消";
      alert.message = "需要配置Token和车辆才能使用此脚本。";
      alert.addAction("确定");
      await alert.present();
      Script.complete();
      return;
    }
  }
  
  const vinNo = state.vinNo || "";
  
  if (!token || !vinNo) {
    if (isWidget) {
      Script.setWidget(buildFallbackWidget());
      Script.complete();
      return;
    }
    const alert = new Alert();
    alert.title = "❌ 配置不完整";
    alert.message = "请确保已配置Token和车辆。";
    alert.addAction("确定");
    await alert.present();
    Script.complete();
    return;
  }

  logStep("加载配置", "ok", `车辆: ${state.vehicleName || vinNo}`);

  const today = todayISO();

  if ((state.baselineDate || "") !== today) {
    state.baselineDate = today;
    state.baselinePoints = isFinite(Number(state.totalPoints)) ? Number(state.totalPoints) : 0;
    if ((state.lastSignDate || "") !== today) {
      state.todaySigned = false;
    }
    writeState(state);
  }

  let alreadySignedToday = false;
  let pointsTotal = Number(state.totalPoints || 0);
  let continueDays = Number(state.continueDays || 0);
  let todayDelta = 0;
  let todayAwardFromSignin = null;
  let didSignInNow = false;
  let daysUntilLottery = calcDaysUntilLottery(continueDays);
  let isBlindDay = continueDays > 0 && continueDays % 30 === 0;
  let blindBoxScore = 0;

  let homeRideRaw = {}, myRideRaw = {}, widgetsRaw = {}, tireRaw = {}, statusRaw = {}, integralRaw = {};
  let chargeStateStr = "未充电";
  
  try {
    [
      statusRaw,
      integralRaw,
      homeRideRaw,
      myRideRaw,
      widgetsRaw,
      tireRaw,
      chargeStateStr,
    ] = await Promise.all([
      fetchSigninStatus({ token }).catch(() => ({})),
      fetchTotalIntegral({ token }).catch(() => ({})),
      fetchHomeRideInfo({ vinNo, token }).catch(() => ({})),
      fetchMyRideInfo({ vinNo, month: monthStrYYYY_MM_withDots(), token }).catch(() => ({})),
      fetchVehicleWidgets({ vinNo, token }).catch(() => ({})),
      fetchTirePressure({ vinNo, token }).catch(() => ({})),
      fetchBatteryChargeState({ vinNo, token }).catch(() => "未充电"),
    ]);
    logStep("数据获取", "ok", "7项");
  } catch (e) {
    const errMsg = String(e?.message || e);
    if (errMsg === "TOKEN_EXPIRED") {
      await handleTokenExpiredInMain(isWidget);
      return;
    }
    logStep("数据获取", "fail", errMsg);
  }

  const st0 = adaptSigninStatus(statusRaw);
  alreadySignedToday = !!st0.alreadySignedToday;
  continueDays = Number(st0.continueDays || continueDays);
  todayDelta = Number(st0.todayScore || 0);
  daysUntilLottery = Number(st0.daysUntilLottery ?? daysUntilLottery);
  isBlindDay = !!st0.isBlindDay;
  blindBoxScore = Number(st0.blindBoxScore || 0);
  if (st0.lastSignDate) {
    state.lastSignDate = st0.lastSignDate;
    state.lastSignTime = st0.lastTime || "";
  }
  state.todaySigned = alreadySignedToday;
  state.lastSignOk = alreadySignedToday;
  if (continueDays > 0) state.continueDays = continueDays;

  const integralOk = String(integralRaw?.code || "") === "10000" || integralRaw?.data != null;
  if (integralOk) {
    pointsTotal = adaptTotalIntegral(integralRaw);
    state.totalPoints = pointsTotal;
  }
  writeState(state);

  if (!alreadySignedToday && (ALLOW_WIDGET_SIGN || !config.runsInWidget)) {
    logStep("签到", "start");
    try {
      const signRes = await manualSignIn(token, state);
      if (signRes.ok) {
        didSignInNow = !signRes.skipped;
        alreadySignedToday = true;
        continueDays = Number(signRes.continueDays || state.continueDays || continueDays) || 0;
        todayAwardFromSignin = isFinite(Number(signRes.todayAward)) ? Number(signRes.todayAward) : null;
        daysUntilLottery = calcDaysUntilLottery(continueDays);
        isBlindDay = continueDays > 0 && continueDays % 30 === 0;
        if (todayAwardFromSignin > 0) todayDelta = todayAwardFromSignin;
        logStep("签到", "ok", `连签${continueDays}天 +${todayDelta}分`);
        try {
          const int2 = await fetchTotalIntegral({ token });
          if (String(int2?.code || "") === "10000" || int2?.data != null) {
            pointsTotal = adaptTotalIntegral(int2);
            state.totalPoints = pointsTotal;
            writeState(state);
          }
        } catch { }
      }
    } catch (e) {
      const errMsg = String(e?.message || e);
      if (errMsg === "TOKEN_EXPIRED") {
        await handleTokenExpiredInMain(isWidget);
        return;
      }
      logStep("签到", "fail", errMsg);
    }
  } else {
    logStep("签到", "skip", "今日已签");
  }

  if (didSignInNow && isBlindDay && String(state.lastBlindBoxDate || "") !== today) {
    logStep("盲盒", "start");
    try {
      let res = await fetchSigninLottery({ token }).catch(() => null);
      if (!res || (String(res?.code) !== "10000" && !res?.success)) {
        res = await fetchSupplementPrize({ supplementDate: state.lastSignDate || today, token });
      }
      const code = String(res?.code || "");
      const ok = code === "10000" || res?.success === true;
      if (ok) {
        const d = res?.data || {};
        const prizeName = String(d.prizesName || d.prizeName || "").trim();
        const integral = String(d.integral ?? d.score ?? "").trim();
        state.lastBlindBoxDate = today;
        state.lastBlindBoxPrize = prizeName || "";
        state.lastBlindBoxIntegral = integral || "";
        if (integral && isFinite(Number(integral))) {
          blindBoxScore = Number(integral);
        }
        writeState(state);
        logStep("盲盒", "ok", `${prizeName || "奖励"} ${integral ? integral + "分" : ""}`.trim());
        notifyBlindBoxResult({ ok: true, prizeName, integral });
      } else {
        const msg = String(res?.message || "");
        if (/已领|已抽|重复|30121/i.test(msg)) {
          state.lastBlindBoxDate = today;
          writeState(state);
        }
        logStep("盲盒", "fail", msg || "未知错误");
        notifyBlindBoxResult({ ok: false, msg });
      }
    } catch (e) {
      const errMsg = String(e?.message || e);
      if (errMsg === "TOKEN_EXPIRED") {
        await handleTokenExpired();
        Script.complete();
        return;
      }
      logStep("盲盒", "fail", errMsg);
      notifyBlindBoxResult({ ok: false, msg: errMsg });
    }
  } else {
    const reason = !isBlindDay ? `非盲盒日(剩${calcDaysUntilLottery(continueDays)}天)` : "今日已抽";
    logStep("盲盒", "skip", reason);
  }

  // ========== 执行发布动态 ==========
  let postStatus = state.lastPostDate === today ? "success" : null;
  let postContent = "";
  let liked = false;
  let shared = false;
  let deleted = false;
  let sharePointsReceived = false;
  
  if (ENABLE_AUTO_POST && state.userId) {
    try {
      const postResult = await autoPublishArticle(token, state);
      if (postResult.skipped) {
        postStatus = "success";
        postContent = state.lastPostContent || POST_CONTENT;
        liked = state.lastPostLiked || false;
        shared = state.lastPostShared || false;
        deleted = state.lastPostDeleted || false;
        sharePointsReceived = state.lastSharePointsReceived || false;
      } else if (postResult.ok) {
        postStatus = "success";
        postContent = postResult.content || POST_CONTENT;
        liked = postResult.liked || false;
        shared = postResult.shared || false;
        deleted = postResult.deleted || false;
        sharePointsReceived = postResult.sharePointsReceived || false;
        await notifyPostResult({ ok: true, content: postContent });
        try {
          const int3 = await fetchTotalIntegral({ token });
          if (String(int3?.code || "") === "10000" || int3?.data != null) {
            pointsTotal = adaptTotalIntegral(int3);
            state.totalPoints = pointsTotal;
            writeState(state);
          }
        } catch { }
      } else {
        postStatus = "failed";
        postContent = POST_CONTENT;
        await notifyPostResult({ ok: false, msg: postResult.msg || "发布失败" });
      }
    } catch (e) {
      const errMsg = String(e?.message || e);
      if (errMsg === "TOKEN_EXPIRED") {
        await handleTokenExpired();
        Script.complete();
        return;
      }
      postStatus = "failed";
      logStep("发布动态", "fail", errMsg);
    }
  }

  if (!isFinite(todayDelta) || todayDelta <= 0) {
    if (isFinite(Number(todayAwardFromSignin)) && Number(todayAwardFromSignin) > 0) {
      todayDelta = Number(todayAwardFromSignin);
    } else {
      todayDelta = Math.max(0, Number(state.totalPoints || pointsTotal) - Number(state.baselinePoints || 0));
    }
  }

  const ride = adaptTodayRide(homeRideRaw, myRideRaw);
  const widgets = adaptWidgets(widgetsRaw);
  const tire = adaptTirePressure(tireRaw);

  if (widgets.vehicleImageUrl && !state.vehicleImageUrl) {
    state.vehicleImageUrl = widgets.vehicleImageUrl;
    writeState(state);
  }

  logDebug("车辆名称", state.vehicleName || widgets.vehicleName || "车辆");

  const data = {
    signedToday: alreadySignedToday,
    batteryPercent: widgets.batteryPercent,
    residualRangeKm: widgets.residualRangeKm,
    voltage: widgets.voltage,
    address: widgets.address,
    locationTime: widgets.locationTime,
    statusText: widgets.statusText,
    tire,
    vehicleImageUrl: state.vehicleImageUrl || IMAGE_URL,
    vehicleDisplayName: state.vehicleName || widgets.vehicleName || "车辆",
    today: ride,
    points: {
      total: Number(pointsTotal || state.totalPoints || 0),
      today: todayDelta,
      continueDays: Number(continueDays || state.continueDays || 0),
      daysUntilLottery,
      isBlindDay,
      blindBoxScore: blindBoxScore || Number(state.lastBlindBoxIntegral || 0) || todayDelta,
    },
    postStatus: postStatus,
    postContent: postContent || state.lastPostContent || POST_CONTENT,
    liked: liked,
    shared: shared,
    deleted: deleted,
    sharePointsReceived: sharePointsReceived,
  };
  
  logDebug("最终数据", data);

  const widget = await buildWidgetCard(data, chargeStateStr);
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }

  logStep("ZEEHO 小组件", "ok", `充电: ${chargeStateStr}`);
  Script.complete();
}

main();