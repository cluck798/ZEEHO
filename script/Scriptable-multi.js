// ============= 极核 ZEEHO · Scriptable（多账号版 v1.1） =============
// v1.1：H5 通道密钥轮换（appId=AiTXmBrm）+ 签到/盲盒/补签接口迁到 /H5/ 前缀（服务端 2026-10 调整）
// ============= 配置与常量 =========
const BASE = "https://tapi.zeehoev.com";
const H5_BASE = "https://h5.zeehoev.com";

// ========== 🔑 Token（多账号版说明） ==========
// ⚠️ 新版为多账号模式：Token 保存在 zeeho_accounts.json，运行脚本后按菜单引导设置。
// 此处仅作为「旧版数据迁移」的兜底：从旧版升级粘贴新脚本会清空这里，
// 首次运行会弹菜单引导重新设置 Token（推荐"手机号登录"，免抓包）。
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
  baseInfo: "用户信息",
  supplementCount: "补签卡",
  supplementConsume: "补签",
  vehicleControl: "车辆控制",
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

// ========== 📝 发布动态默认配置（可在 App 菜单 → 设置 中修改） ==========
const POST_CONTENT = "开心的一天"; // 每天发布的动态内容（默认值）
const ENABLE_AUTO_POST = true; // 是否启用自动发布动态（默认值）

// ========== 🧩 全局默认配置（保存后可在 App 菜单中修改） ==========
const DEFAULT_CFG = {
  concurrency: 3,            // 多账号并发数（建议 2~3，过高可能触发风控）
  autoPost: ENABLE_AUTO_POST,
  postContent: POST_CONTENT,
  autoSupplement: true,      // 自动补签（只消耗已有补签卡，不自动花积分兑换）
  supplementMaxPerRun: 3,    // 每次最多补签天数
  voltageThreshold: 0,       // 电压满电阈值（伏）：0=未设置（按电量100%通知）；填写伏数则按电压通知
  notifyFull: true,          // 充满通知（电量100% 或 电压≥阈值）
  notifyLow: true,           // 低电量通知
  lowThreshold: 20,          // 低电量阈值（%）
  monitorIntervalMin: 2,     // 前台驻留监控检测间隔（分钟）
  monitorDurationMin: 30,    // 前台驻留监控持续时长（分钟）
  aesKey: "ce2cd7cb57124c1349dd8543bf6fd31d", // 云端控车 AES-256 密钥（可修改）
  vehicleRiskAck: false,     // 车控风险确认
  basicAuth: "bWNrOjEyMzQ1Ng==", // 手机号登录 OAuth2 Basic 凭据（mck:123456）
  defaultAccountId: "",      // 组件默认显示的账号
  refreshMin: 15,            // 小组件尝试刷新间隔（分钟，iOS 仅参考）
};

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
  signinLottery: "/cfmotoservermine/H5/signin/lottery",
  totalIntegral: "/v1.0/mine/cfmotoservermine/integral/totalIntegral",
  commonArticle: "/v1.0/social/cfmotoserversocial/commonArticle",
  mineArticleInfo: "/v1.0/social/cfmotoserversocial/community/mineArticleInfo",
  likeFavorite: "/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo",
  shareArticle: (articleId) => `/v1.0/social/cfmotoserversocial/article/share/${articleId}`,
  deleteArticle: "/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle",
  batteryInfo: (vinNo) => `/v1.0/app/cfmotoserverapp/batteryInfo/${encodeURIComponent(vinNo)}`,
  adjustByShare: "/v1.0/mine/cfmotoservermine/integral/adjustByShare",
};
const API_SIGNIN_V1 = "/cfmotoservermine/H5/signin";
const API_SIGNIN_INFO = "/cfmotoservermine/H5/signin/info";

const IMAGE_URL = "";

// ============= 本地签名 =============
const APP_CONFIG = {
  h5: {
    appId: "AiTXmBrm",
    appSecret: "70c2c7458ab88ca9504ad0521f170075bc91f2f7"
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
  const addKv = (raw) => {
    if (!raw) return;
    raw
      .split("&")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((kv) => {
        const [k, v] = kv.split("=");
        if (k) obj[k] = decodeURIComponent(v || "");
      });
  };
  try {
    const qp = args.queryParameters || {};
    for (const k of Object.keys(qp))
      obj[k] = decodeURIComponent(String(qp[k] ?? ""));
  } catch { }
  try { addKv(args.widgetParameter || ""); } catch { }
  // 支持快捷指令自动化传入参数（shortcutParameter），便于后台定时
  try {
    const sp = args.shortcutParameter;
    if (typeof sp === "string") addKv(sp);
    else if (sp && typeof sp === "object") {
      for (const k of Object.keys(sp)) obj[k] = String(sp[k] ?? "");
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

// ============= 持久化（多账号 + 全局配置） ===============
const FM = FileManager.local();
const STATE_FILE = FM.joinPath(FM.documentsDirectory(), "zeeho_signin.json"); // 旧版单账号状态（仅迁移/兼容用）
const STORE_FILE = FM.joinPath(FM.documentsDirectory(), "zeeho_accounts.json"); // 多账号 + 全局配置

const UID_BY_TOKEN = {}; // token → userId（并发批量时请求头 user_id 的来源，避免全局状态串号）
let STORE = null;        // 多账号数据（内存缓存）
let CFG = null;          // 全局配置快捷引用（= STORE.cfg）
let CURRENT_ACC = null;  // 单账号路径当前账号（批量并发不依赖它）

function readStoreFile() {
  try {
    if (!FM.fileExists(STORE_FILE)) return null;
    const txt = FM.readString(STORE_FILE) || "";
    if (!txt.trim()) return null;
    const v = JSON.parse(txt);
    return v && typeof v === "object" ? v : null;
  } catch { return null; }
}

function saveStore(store) {
  try {
    FM.writeString(STORE_FILE, JSON.stringify(store || STORE || { version: 2, cfg: CFG || {}, accounts: [] }, null, 2));
  } catch (e) {
    console.error("[saveStore] error:", String(e?.message || e));
  }
}

function legacyReadState() {
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

function applyPointsGuard(payload, prevState) {
  if (payload.totalPoints === 0 && prevState && prevState.totalPoints > 0) {
    payload.totalPoints = prevState.totalPoints;
  }
  return payload;
}

// 读取当前账号状态（兼容旧版：无账号上下文时读旧文件）
function readState() {
  if (CURRENT_ACC) {
    if (!CURRENT_ACC.state || typeof CURRENT_ACC.state !== "object") CURRENT_ACC.state = {};
    return CURRENT_ACC.state;
  }
  return legacyReadState();
}

// 写回当前账号状态（批量并发路径请使用显式 persist 回调，勿依赖全局账号）
function writeState(obj) {
  const payload = obj && typeof obj === "object" ? obj : {};
  delete payload.token;
  try {
    if (CURRENT_ACC) {
      applyPointsGuard(payload, CURRENT_ACC.state || {});
      CURRENT_ACC.state = payload;
      registerUid(CURRENT_ACC);
      saveStore(getStore());
      return;
    }
    applyPointsGuard(payload, legacyReadState());
    FM.writeString(STATE_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("[writeState] error:", String(e?.message || e));
  }
}

function registerUid(acc) {
  const t = cleanToken((acc && acc.token) || "");
  if (!t) return;
  UID_BY_TOKEN[t] = String((acc && acc.state && acc.state.userId) || (acc && acc.userId) || "");
}

function dispName(acc) {
  return String((acc && (acc.userName || acc.phone || acc.userId)) || "账号");
}

function getStore() {
  if (STORE) return STORE;
  let store = readStoreFile();
  if (!store) store = { version: 2, cfg: {}, accounts: [] };
  if (!store.cfg || typeof store.cfg !== "object") store.cfg = {};
  if (!Array.isArray(store.accounts)) store.accounts = [];
  for (const k of Object.keys(DEFAULT_CFG)) {
    if (store.cfg[k] === undefined) store.cfg[k] = DEFAULT_CFG[k];
  }
  // 旧版默认值迁移：早期版本把 84V 作为默认注入，未手动改过的这里视为"未设置"（改为按电量100%通知）
  if (store.cfg.__voltMigrated !== true) {
    store.cfg.__voltMigrated = true;
    if (Number(store.cfg.voltageThreshold) === 84) store.cfg.voltageThreshold = 0;
    saveStore(store);
  }

  // 旧版迁移：HARDCODED_TOKEN / zeeho_signin.json → 首个账号
  if (store.accounts.length === 0) {
    const legacy = legacyReadState();
    const legacyToken = cleanToken(HARDCODED_TOKEN || legacy.token || "");
    const hasLegacy = !!(legacyToken || legacy.vinNo || legacy.userId || legacy.lastSignDate);
    if (hasLegacy) {
      const acc = {
        id: "acc_legacy",
        userName: legacy.userName || "默认账号",
        userId: String(legacy.userId || ""),
        phone: "",
        token: legacyToken,
        vehicles: legacy.vinNo ? [{ vinNo: legacy.vinNo, name: legacy.vehicleName || "我的车辆", pic: legacy.vehicleImageUrl || "" }] : [],
        activeVin: legacy.vinNo || "",
        state: Object.assign({}, legacy),
      };
      delete acc.state.token;
      if (legacy.uiConfig) store.cfg.uiConfig = legacy.uiConfig;
      store.accounts.push(acc);
      if (!store.cfg.defaultAccountId) store.cfg.defaultAccountId = acc.id;
      saveStore(store);
      logStep("数据迁移", "ok", `旧版单账号数据已迁移为「${dispName(acc)}」`);
    }
  }

  for (const a of store.accounts) {
    if (!a.state || typeof a.state !== "object") a.state = {};
    if (!Array.isArray(a.vehicles)) a.vehicles = [];
    if (!a.activeVin && a.vehicles[0]) a.activeVin = a.vehicles[0].vinNo;
    registerUid(a);
  }
  STORE = store;
  return STORE;
}

function applyStoreConfig(store) {
  CFG = (store || getStore()).cfg;
  if (CFG.uiConfig && typeof CFG.uiConfig === "object") {
    for (const k of Object.keys(CFG.uiConfig)) {
      if (k in UI_CONFIG) UI_CONFIG[k] = CFG.uiConfig[k];
    }
  }
  return CFG;
}

function setCurrentAcc(acc) {
  CURRENT_ACC = acc || null;
  if (acc) registerUid(acc);
  return CURRENT_ACC;
}

function defaultOrFirstAccount(store) {
  const s = store || getStore();
  return s.accounts.find((a) => a.id === s.cfg.defaultAccountId) || s.accounts.find((a) => a.token) || s.accounts[0] || null;
}

function pickAccountForWidget(store) {
  const s = store || getStore();
  const p = (getParam("acc") || getParam("account") || getParam("userId") || "").trim();
  let acc = null;
  if (p) acc = s.accounts.find((a) => a.id === p || String(a.userId) === p || a.userName === p || a.phone === p) || null;
  if (!acc) acc = defaultOrFirstAccount(s);
  return acc;
}

// ============= 请求封装 =============

async function requestWithSign(type, method, url, params, data, token, label = "", protocol = "legacy") {
  const useV2 = protocol === "v2" && type === "app";
  let bodyStrForSign = "";
  if (data && typeof data === "object") bodyStrForSign = JSON.stringify(data);
  else if (typeof data === "string") bodyStrForSign = data;

  const signHeaders = useV2 ? newProtoSign(toQuery(params), bodyStrForSign) : getSign(type, params, data, method);

  const signQuery = toQuery(params);
  const fullUrl = signQuery ? `${url}?${signQuery}` : url;

  const req = new Request(fullUrl);
  req.method = method;
  
  req.headers = useV2
    ? {
        "content-type": "application/json",
        "appid": APP_CONFIG.app.appId,
        "authorization": `Bearer ${cleanToken(token)}`,
        "accept": "*/*",
        "accept-language": "zh-CN",
        "user-agent": OFFICIAL_UA,
        "interfaceversion": "2",
        "x-app-info": OFFICIAL_UA,
        ...signHeaders,
      }
    : {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
        "interfaceversion": "2",
        "Authorization": `Bearer ${cleanToken(token)}`,
        ...signHeaders
      };
  
  const uid = (getParam("userId") || UID_BY_TOKEN[cleanToken(token)] || readState().userId || "").trim();
  if (uid) {
    req.headers["user_id"] = uid;
    if (useV2) req.headers["cookie"] = `user_id=${uid}`;
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

// 写操作（发帖/点赞等）新协议优先，被 30121 permit error 拦截时回退旧协议
async function requestWriteWithFallback(method, url, params, data, token, label) {
  let json = await requestWithSign('app', method, url, params, data, token, label, "v2");
  if (isPermitError(json)) {
    logDebug(`${label} 新协议被拦截(30121)，回退旧协议重试`);
    json = await requestWithSign('app', method, url, params, data, token, label, "legacy");
  }
  return json;
}

// ========== Token过期处理（多账号：只更新对应账号的Token） ==========
async function handleTokenExpired() {
  if (config.runsInWidget) return false;
  
  logDebug("Token过期", "显示更新弹窗");
  const acc = CURRENT_ACC || pickAccountForWidget(getStore());
  
  const alert = new Alert();
  alert.title = "🔑 Token已过期";
  alert.message = `账号「${acc ? dispName(acc) : "默认"}」的Token已过期，请登录极核App抓包获取新Token。\n\n获取方式：\n1. 打开ZEEHO App\n2. 抓包获取Authorization头\n3. 复制Token内容粘贴到下方\n\n💡 也可在菜单→账号管理 里用「手机号登录」免抓包更新`;
  alert.addTextField("粘贴新Token", "");
  alert.addAction("✅ 更新Token");
  alert.addCancelAction("取消");
  
  const idx = await alert.present();
  if (idx === -1) return false;
  
  const newToken = cleanToken(alert.textFieldValue(0));
  if (!newToken) {
    await simpleAlert("❌ Token不能为空", "请粘贴有效的Token");
    return false;
  }
  
  if (acc) {
    acc.token = newToken;
    registerUid(acc);
    saveStore(getStore());
  } else {
    // 兼容旧版无账号场景：仍写回脚本顶部
    await saveTokenToScript(alert.textFieldValue(0).trim());
  }
  
  await simpleAlert("✅ Token已更新", `新Token: ${newToken.substring(0, 10)}...\n已保存，请重新运行脚本。`);
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
  const url = joinUrl(H5_BASE, "/cfmotoservermine/H5/signin/supplementPrize");
  return await safeRequest(requestWithSign, 'h5', "GET", url, { supplementDate }, null, token, "supplementPrize");
}

// ========== 获取电池信息（充电状态 + 电压/电流/温度 + 耗电统计） ==========
async function fetchBatteryInfo({ vinNo, token }) {
  const url = joinUrl(BASE, API.batteryInfo(vinNo));
  const result = await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "batteryInfo");
  const d = result?.data || {};
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const voltage = num(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || d.batVoltage || d.batteryVol);
  const current = num(d.current || d.batteryCurrent || d.bmsCurrent || d.batteryCur);
  const temp = num(d.batteryTemp || d.batTemp || d.bmsTemp || d.batteryTemperature || d.temperature);
  const soc = num(d.soc || d.batteryLevel || d.bmssoc);
  return {
    chargeStateStr: String(d.chargeStateStr || d.chargeState || "未充电"),
    voltage: voltage > 0 ? voltage : 0,
    current: current,
    batteryTemp: temp,
    soc: soc,
    residualRangeKm: num(d.hmiRidableMile || d.vehicleRidableMile || d.ridableMileage || d.residualRange),
    powerUseToday: num(d.powerUseToday),
    powerUseMonth: num(d.powerUseMonth),
    powerChargeMonth: num(d.powerChargeMonth),
    chargeCount: num(d.chargeCount),
  };
}

// ========== 发布动态相关接口 ==========

async function publishArticle({ content, token }) {
  const url = joinUrl(BASE, API.commonArticle);
  const body = {
    "postSubInfo": { "topicList": [] },
    "topicid": "",
    "postcontent": content
  };
  return await safeRequest(requestWriteWithFallback, "POST", url, {}, body, token, "publishArticle");
}

async function fetchArticleList({ userId, token }) {
  const url = joinUrl(BASE, API.mineArticleInfo);
  return await safeRequest(requestWithSign, 'app', "GET", url, { userId }, null, token, "fetchArticleList");
}

async function likeArticle({ postId, token }) {
  const url = joinUrl(BASE, API.likeFavorite);
  const body = { "postId": postId, "kindFlag": "0" };
  return await safeRequest(requestWriteWithFallback, "POST", url, {}, body, token, "likeArticle");
}

async function shareArticle({ articleId, token }) {
  const url = joinUrl(BASE, API.shareArticle(articleId));
  return await safeRequest(requestWithSign, 'app', "PUT", url, {}, null, token, "shareArticle");
}

async function deleteArticle({ articleId, token }) {
  const url = joinUrl(BASE, API.deleteArticle);
  return await safeRequest(requestWithSign, 'app', "DELETE", url, { articleId, postType: "1" }, null, token, "deleteArticle");
}

// ========== 领取分享积分接口（带每日检查；支持传入账号状态，供并发批量使用） ==========
async function adjustByShare({ token, state }) {
  const st = state || readState() || {};
  const today = todayISO();

  if (st.lastSharePointsDate === today) {
    return { skipped: true, message: "今日已领取" };
  }

  const url = joinUrl(BASE, API.adjustByShare);
  const result = await safeRequest(requestWithSign, 'app', "GET", url, {}, null, token, "adjustByShare");
  logDebug("领取分享积分响应", result);

  if (String(result?.code) === "10000") {
    st.lastSharePointsDate = today;
    if (!state) writeState(st);
  }

  return result;
}

// ========== 自动发布动态流程（persist 供并发批量传入，避免依赖全局账号） ==========
async function autoPublishArticle(token, state, persist = writeState) {
  const today = todayISO();
  const content = String((getStore().cfg.postContent || POST_CONTENT) || "").trim() || POST_CONTENT;

  if (!getStore().cfg.autoPost) {
    return { skipped: true, msg: "自动发布已禁用" };
  }
  
  if (state.lastPostDate === today && !FORCE_RESET && !DEBUG_MODE) {
    logStep("发布动态", "skip", "今日已发布");
    return { skipped: true };
  }
  
  if (DEBUG_MODE) logStep("🐛 调试模式", "info", "强制重新发布");
  
  logStep("发布动态流程", "start", `"${content}"`);
  
  try {
    // --- 步骤1: 发布 ---
    const publishResult = await publishArticle({ content, token });
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
          const adjustResult = await adjustByShare({ token, state });
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
    state.lastPostContent = content;
    state.lastPostLiked = likeSuccess;
    state.lastPostShared = shareSuccess;
    state.lastPostDeleted = deleteSuccess;
    state.lastSharePointsReceived = sharePointsReceived;
    persist(state);
    
    logStep("发布动态流程", "ok", `点赞${likeSuccess?"✓":"✗"} 分享${shareSuccess?"✓":"✗"} 删除${deleteSuccess?"✓":"✗"}`);
    
    return { 
      ok: true, 
      content: content,
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

// ========== 纯JS AES-256-ECB + PKCS7（云端开关锁需要，已与标准库逐向量比对验证） ==========
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
    let t0 = w[4 * (i - 1)], t1 = w[4 * (i - 1) + 1], t2 = w[4 * (i - 1) + 2], t3 = w[4 * (i - 1) + 3];
    if (i % Nk === 0) {
      const tmp = t0;
      t0 = AES_SBOX[t1] ^ AES_RCON[i / Nk];
      t1 = AES_SBOX[t2];
      t2 = AES_SBOX[t3];
      t3 = AES_SBOX[tmp];
    } else if (i % Nk === 4) {
      t0 = AES_SBOX[t0]; t1 = AES_SBOX[t1]; t2 = AES_SBOX[t2]; t3 = AES_SBOX[t3];
    }
    w[4 * i] = w[4 * (i - Nk)] ^ t0;
    w[4 * i + 1] = w[4 * (i - Nk) + 1] ^ t1;
    w[4 * i + 2] = w[4 * (i - Nk) + 2] ^ t2;
    w[4 * i + 3] = w[4 * (i - Nk) + 3] ^ t3;
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
    let t = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = t;
    t = s[2]; s[2] = s[10]; s[10] = t; t = s[6]; s[6] = s[14]; s[14] = t;
    t = s[3]; s[3] = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = t;
    if (round !== Nr) {
      for (let c = 0; c < 4; c++) {
        const i = 4 * c;
        const a0 = s[i], a1 = s[i + 1], a2 = s[i + 2], a3 = s[i + 3];
        s[i] = aesGMul(a0, 2) ^ aesGMul(a1, 3) ^ a2 ^ a3;
        s[i + 1] = a0 ^ aesGMul(a1, 2) ^ aesGMul(a2, 3) ^ a3;
        s[i + 2] = a0 ^ a1 ^ aesGMul(a2, 2) ^ aesGMul(a3, 3);
        s[i + 3] = aesGMul(a0, 3) ^ a1 ^ a2 ^ aesGMul(a3, 2);
      }
    }
    const off = round * 16;
    for (let i = 0; i < 16; i++) s[i] ^= w[off + i];
  }
  return s;
}

function aesUtf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(out);
}

function aesBytesToBase64(bytes) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "", i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) { const n = bytes[i] << 16; result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + "=="; }
  else if (rem === 2) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8); result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + "="; }
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
    out.set(aesEncryptBlock(padded.slice(off, off + 16), w), off);
  }
  return aesBytesToBase64(out);
}

// ========== 车辆控制（寻车 / 鸣笛闪灯 / 开坐垫 / 云端开关锁） ==========
// ⚠️ 以下指令会真实操作车辆，请仅在安全环境下使用
const VEHICLE_ACTION_TEXT = { find: "寻车闪灯", loudFind: "鸣笛闪灯", cushion: "打开坐垫", unlock: "云端开锁", lock: "云端关锁" };

function vehicleRiskOk() {
  const v = getStore().cfg.vehicleRiskAck;
  return v === true || v === "1" || v === "我同意风险并使用";
}

async function ensureVehicleRisk() {
  if (vehicleRiskOk()) return true;
  const a = new Alert();
  a.title = "⚠️ 车辆控制风险确认";
  a.message = "以下指令会真实操作你的车辆（闪灯 / 鸣笛 / 坐垫 / 开关锁），可能产生电量消耗或安全风险。\n\n请确认：仅在车辆处于安全环境时使用；因误操作产生的后果由使用者自行承担。";
  a.addAction("我同意风险并使用");
  a.addCancelAction("取消");
  const idx = await a.present();
  if (idx !== 0) return false;
  getStore().cfg.vehicleRiskAck = true;
  saveStore(getStore());
  return true;
}

// 车控请求头（旧通道）
function vehicleHeaders(acc, signHeaders) {
  const ua = "MOBILE|iOS|16.1.1|ZEEHO_APP|3.0.1|iPhone|WWAN|iOS";
  const h = {
    "Authorization": `Bearer ${cleanToken(acc.token)}`,
    "Content-Type": "application/json;charset=UTF-8",
    "interfaceversion": "2",
    "Accept-Language": "zh-CN",
    "Accept": "*/*",
    "User-Agent": ua,
    "x-app-info": ua,
    ...(signHeaders || {}),
  };
  if (acc.userId) h["user_id"] = String(acc.userId);
  return h;
}

// 写操作"新协议"（2026-09-24 起网关收紧：缺少 appid 头 / 官方UA / Cookie 会返回 30121 permit error。
// 与参考实现里已验证的发帖协议 1:1 一致；车控同样走这套，被拦截时再回退旧通道）
const OFFICIAL_UA = "MOBILE|iOS|16.1.1|ZEEHO_APP|3.0.5|iPhone|iPhone 14 Pro|1179*2556|DC0C4906-A4A8-4866-9432-B31E1E252D53|WWAN|iOS";

function newProtoSign(queryStr, bodyStr) {
  const ac = APP_CONFIG.app;
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
    'signature': sign,
  };
}

function vehicleHeadersV2(acc, signHeaders) {
  const h = {
    "content-type": "application/json",
    "appid": APP_CONFIG.app.appId,
    "authorization": `Bearer ${cleanToken(acc.token)}`,
    "accept": "*/*",
    "accept-language": "zh-CN",
    "user-agent": OFFICIAL_UA,
    "interfaceversion": "2",
    "x-app-info": OFFICIAL_UA,
    ...(signHeaders || {}),
  };
  if (acc.userId) h["cookie"] = `user_id=${acc.userId}`;
  return h;
}

function isPermitError(json) {
  const code = String((json && json.code) || "");
  const msg = String((json && (json.message || json.msg)) || "");
  return code === "30121" || /permit error/i.test(msg);
}

// 车控响应解析
function vehicleCheckJson(json, okMsg) {
  if (!json) return { ok: false, msg: "无响应（可能 Token 失效或网络异常）" };
  if (isPermitError(json)) return { ok: false, msg: "指令被网关拦截(30121 permit error)，请稍后重试" };
  const code = String(json.code || "");
  const msg = String(json.message || json.msg || "");
  if (code === "10000" || json.success === true) return { ok: true, msg: okMsg };
  return { ok: false, msg: msg || `失败(${code || "未知"})` };
}

async function vehicleRawRequest(acc, method, url, data, signBody, timeout = 20, protocol = "v2") {
  const bodyStr = data ? JSON.stringify(data) : "";
  const signed = signBody !== undefined ? signBody : bodyStr;
  const signHeaders = protocol === "v2" ? newProtoSign("", signed) : getSign('app', {}, signed, method);
  const req = new Request(url);
  req.method = method;
  req.timeoutInterval = timeout;
  req.headers = protocol === "v2" ? vehicleHeadersV2(acc, signHeaders) : vehicleHeaders(acc, signHeaders);
  if (bodyStr) req.body = bodyStr;
  const text = await req.loadString();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { }
  logDebug(`车控响应[${protocol}]`, json);
  return json;
}

// 下发指令：新协议优先，被 permit error 拦截时自动回退旧协议
async function vehicleDo(acc, method, url, data, signBody, timeout, okMsg) {
  let json = await vehicleRawRequest(acc, method, url, data, signBody, timeout, "v2");
  if (isPermitError(json)) {
    logDebug("新协议被拦截(30121)，回退旧协议重试", JSON.stringify(json).slice(0, 120));
    json = await vehicleRawRequest(acc, method, url, data, signBody, timeout, "legacy");
  }
  return vehicleCheckJson(json, okMsg);
}

async function vehicleAction(acc, action, vinOverride) {
  const cfg = getStore().cfg;
  const vin = String(vinOverride || getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
  if (!vin) return { ok: false, msg: "未配置车辆" };
  setCurrentAcc(acc);
  try {
    if (action === "find") {
      // 短按寻车：PUT control/{vin}，空body
      const url = joinUrl(BASE, `/v1.0/app/cfmotoserverapp/vehicleInfo/control/${encodeURIComponent(vin)}`);
      return await vehicleDo(acc, "PUT", url, null, "", 20, "指令已下发，车辆应闪灯提示");
    }
    if (action === "loudFind") {
      // 高声寻车（鸣笛+闪灯）：POST controlV2，body {"param":"4","vin":vin}
      const url = joinUrl(BASE, "/v1.0/app/cfmotoserverapp/vehicleInfo/controlV2");
      return await vehicleDo(acc, "POST", url, { param: "4", vin: vin }, undefined, 20, "鸣笛闪灯指令已下发");
    }
    if (action === "cushion") {
      // 开坐垫：PUT propertyTwo/one，commond=28
      const url = joinUrl(BASE, "/v1.0/app/cfmotoserverapp/vehicleSet/propertyTwo/one");
      return await vehicleDo(acc, "PUT", url, { commond: "28", commondParam: "1", vcu: vin, version: "v2" }, undefined, 20, "开坐垫指令已下发，坐垫应弹起");
    }
    if (action === "unlock" || action === "lock") {
      // 云端开关锁：明文JSON（带空格换行）→ AES-256-ECB/PKCS7 → Base64 → body{"secret":..}；签名签的是明文
      const key = String(cfg.aesKey || "").trim();
      if (!/^[0-9a-fA-F]{32}$/.test(key)) return { ok: false, msg: "AES密钥需为32位十六进制（菜单 → 设置 中修改）" };
      const lockFlag = action === "unlock" ? "1" : "0";
      const plain = `{\n  "lockFlag" : "${lockFlag}",\n  "vinNo" : "${vin}"\n}`;
      const secret = aes256EcbEncryptBase64(plain, key);
      logDebug("车控明文/密文", { plain: JSON.stringify(plain), secret: secret.slice(0, 24) + "..." });
      const url = joinUrl(BASE, "/v1.0/app/cfmotoserverapp/vehicleSet/network/unlock");
      return await vehicleDo(acc, "POST", url, { secret }, plain, 25, (action === "unlock" ? "云端开锁" : "云端关锁") + "指令已下发");
    }
    return { ok: false, msg: "未知指令" };
  } catch (e) {
    const m = String(e?.message || e);
    if (/timeout|timed out|网络|request/i.test(m)) return { ok: false, msg: "网络超时（指令可能已下发，请稍后查看车辆）" };
    if (m === "TOKEN_EXPIRED") return { ok: false, msg: "Token已过期，请更新Token" };
    return { ok: false, msg: m };
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
  const address = String(d.address || "").trim();
  const locationTime = String(loc.locationTime || "").trim();
  const pulledOut = String(d.batteryPullOutFlag ?? "") === "1";
  let statusText = address || "位置未知";
  if (pulledOut) statusText = "电池已拔出";
  return {
    batteryPercent: Math.max(0, Math.min(100, isFinite(soc) ? soc : 0)),
    residualRangeKm: isFinite(range) ? range : 0,
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

// ========== 通知辅助（简单本地通知） ==========
async function notifySimple(title, body) {
  try {
    const n = new Notification();
    n.threadIdentifier = "zeeho-monitor";
    n.sound = "default";
    n.title = title;
    n.body = body;
    await n.schedule();
  } catch (e) {
    logDebug("通知发送失败", String(e?.message || e));
  }
}

// ========== 充电监控（方案A：每次运行/组件刷新时检测；默认按电量100%，设置了电压则按电压伏数） ==========
function runChargeNotifyCheck(acc, b, vehName = "") {
  try {
    const cfg = getStore().cfg;
    const st = acc.state || (acc.state = {});
    const now = Date.now();
    const today = todayISO();
    const soc = Number(b?.soc || 0);
    const volt = Number(b?.voltage || 0);
    const charging = !!b && !!b.chargeStateStr && b.chargeStateStr !== "未充电";
    const name = vehName || dispName(acc);
    const res = { full: false, low: false, notifiedFull: false, notifiedLow: false };

    const voltThr = Number(cfg.voltageThreshold || 0);
    const voltMode = voltThr > 0; // 设置了电压 → 只看电压；未设置 → 只看电量100%（互斥）
    const isFull = voltMode ? (volt > 0 && volt >= voltThr) : soc >= 100;
    if (isFull) {
      res.full = true;
      const lastAt = Number(st.lastFullNotifyAt || 0);
      if (cfg.notifyFull && (now - lastAt > 12 * 3600 * 1000)) {
        notifySimple("✅ 电池已充满", `${name} 电量${soc}%${volt > 0 ? ` · ${volt.toFixed(1)}V` : ""}，可以拔枪/结束充电了`);
        st.lastFullNotifyAt = now;
        st.lastFullNotifyDate = today;
        res.notifiedFull = true;
        saveStore(getStore());
      }
    } else if (soc > 0 && soc < 100) {
      st.lastFullNotifyAt = 0; // 进入新一次充电周期，重置去重
    }

    if (cfg.notifyLow && !charging && soc > 0 && soc <= Number(cfg.lowThreshold || 20)) {
      res.low = true;
      if (st.lastLowNotifyDate !== today) {
        notifySimple("⚠️ 电量偏低", `${name} 当前${soc}%，续航 ${b.residualRangeKm || 0}km，记得充电`);
        st.lastLowNotifyDate = today;
        res.notifiedLow = true;
        saveStore(getStore());
      }
    }

    st.lastMonitorAt = now;
    st.lastSoc = soc;
    st.lastVoltage = volt;
    return res;
  } catch (e) {
    logDebug("充电监控异常", String(e?.message || e));
    return {};
  }
}

// 检测一次（菜单/快捷指令 action=monitor 使用）
async function monitorOnce(acc) {
  const vin = (getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
  if (!vin) throw new Error("未配置车辆");
  setCurrentAcc(acc);
  const b = await fetchBatteryInfo({ vinNo: vin, token: acc.token });
  const veh = acc.vehicles.find((v) => v.vinNo === vin) || {};
  const r = runChargeNotifyCheck(acc, b, veh.name || acc.userName);
  saveStore(getStore());
  return { battery: b, result: r, vin, veh };
}

// 方案B：前台驻留监控（每 N 分钟检测一次，持续 M 分钟）
async function runForegroundMonitor(acc, { intervalMin, durationMin } = {}) {
  const cfg = getStore().cfg;
  const iv = Math.max(1, Number(intervalMin || cfg.monitorIntervalMin || 2));
  const dur = Math.max(iv, Number(durationMin || cfg.monitorDurationMin || 30));
  const ticks = Math.max(1, Math.round(dur / iv));
  let notified = 0;
  let last = null;
  logStep("驻留监控", "start", `每${iv}分钟 × ${ticks}次（共${dur}分钟）`);
  for (let i = 0; i < ticks; i++) {
    try {
      const r = await monitorOnce(acc);
      last = r;
      const b = r.battery;
      logStep(`监控#${i + 1}`, "info", `${b.chargeStateStr} · ${Number(b.soc || 0)}% · ${b.voltage ? b.voltage.toFixed(1) + "V" : "-"}`);
      if (r.result && (r.result.notifiedFull || r.result.notifiedLow)) notified++;
    } catch (e) {
      logStep(`监控#${i + 1}`, "fail", String(e?.message || e));
    }
    if (i < ticks - 1) await sleep(iv * 60 * 1000);
  }
  return { ticks, notified, last };
}

// ========== 盲盒抽取（组件流水线 / 并发批量共用） ==========
async function tryBlindBox({ token, state, cont, isBlindDay, today, persist }) {
  if (!isBlindDay) return { skipped: true, reason: `非盲盒日(剩${calcDaysUntilLottery(cont)}天)` };
  if (String(state.lastBlindBoxDate || "") === today) return { skipped: true, reason: "今日已抽" };
  logStep("盲盒", "start");
  try {
    let res = await fetchSigninLottery({ token }).catch(() => null);
    if (!res || (String(res?.code) !== "10000" && !res?.success)) {
      res = await fetchSupplementPrize({ supplementDate: state.lastSignDate || today, token }).catch(() => null);
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
      if (persist) persist(state);
      logStep("盲盒", "ok", `${prizeName || "奖励"} ${integral ? integral + "分" : ""}`.trim());
      notifyBlindBoxResult({ ok: true, prizeName, integral });
      return { ok: true, prizeName, integral };
    }
    const msg = String(res?.message || "");
    if (/已领|已抽|重复|30121/i.test(msg)) {
      state.lastBlindBoxDate = today;
      if (persist) persist(state);
    }
    logStep("盲盒", "fail", msg || "请求失败（可能Token过期或网络异常，可到 6️⃣ 账号管理 检查）");
    notifyBlindBoxResult({ ok: false, msg });
    return { ok: false, msg };
  } catch (e) {
    const errMsg = String(e?.message || e);
    logStep("盲盒", "fail", errMsg);
    notifyBlindBoxResult({ ok: false, msg: errMsg });
    return { ok: false, msg: errMsg };
  }
}

// ========== 漏签自动补签（只消耗已有的补签卡，不自动花积分兑换） ==========
async function runSupplementFlow(acc) {
  const token = acc.token;
  const month = monthStrYYYY_MM();
  let info = null;
  try {
    info = await safeRequest(requestWithSign, 'h5', "GET", joinUrl(H5_BASE, API_SIGNIN_INFO), { month, server_name: SERVER_NAME }, null, token, "signin(GET status)");
  } catch (e) {
    return { found: 0, used: 0, msg: "日历查询失败" };
  }
  const list = Array.isArray(info?.data?.nowSignDetailVos) ? info.data.nowSignDetailVos : [];
  const today = todayISO();
  const missing = [];
  for (const it of list) {
    const ds = String(it?.createDate || "");
    if (!ds || ds >= today) continue; // 只补今天之前
    const st = Number(it?.signStatue);
    const signed = st === 3 || st === 5 || st === 0;
    if (!signed) missing.push(ds);
  }
  if (!missing.length) return { found: 0, used: 0, msg: "无漏签" };

  // 补签卡数量（官方已改为 POST）
  let cards = 0;
  try {
    const cnt = await safeRequest(requestWithSign, 'h5', "POST", joinUrl(H5_BASE, "/cfmotoservermine/signInSupplement/count"), {}, {}, token, "supplementCount");
    const d = cnt?.data;
    cards = Number(d?.count ?? d?.cardCount ?? d?.surplusCount ?? (typeof d === "number" ? d : 0)) || 0;
  } catch (e) {
    logDebug("补签卡查询失败", String(e?.message || e));
  }

  const maxN = Math.min(Number(getStore().cfg.supplementMaxPerRun || 3), cards || 0, missing.length);
  if (!maxN) return { found: missing.length, used: 0, msg: cards ? "已达上限" : "补签卡不足" };

  let used = 0;
  for (const ds of missing.slice(0, maxN)) {
    try {
      const r = await safeRequest(requestWithSign, 'h5', "GET", joinUrl(H5_BASE, "/cfmotoservermine/signInSupplement/consume"), { dateTime: ds }, null, token, "supplementConsume");
      const ok = String(r?.code) === "10000";
      logStep("补签", ok ? "ok" : "fail", `${ds} ${r?.message || ""}`.trim());
      if (ok) { used++; acc.state.lastSupplementDate = ds; }
      else break; // 失败即停止（多为卡不足）
    } catch (e) {
      logStep("补签", "fail", `${ds} ${String(e?.message || e)}`);
      break;
    }
  }
  saveStore(getStore());
  return { found: missing.length, used, msg: "" };
}

// ========== 单账号完整签到流程（并发批量 / action=checkin 使用，不依赖全局账号） ==========
async function runAccountFlow(acc) {
  const persist = () => saveStore(getStore());
  const out = { id: acc.id, name: dispName(acc), signed: null, signSkip: false, signScore: 0, blind: "", supplement: "", post: "", points: null, error: "" };
  if (!acc.token) { out.error = "缺少Token（到 6️⃣ 账号管理 设置）"; return out; }
  setCurrentAcc(null); // 并发安全：不依赖全局账号上下文
  registerUid(acc);
  const state = acc.state = acc.state || {};
  const today = todayISO();
  if (!state.userId && acc.userId) state.userId = acc.userId;

  try {
    let st = null;
    try { st = adaptSigninStatus(await fetchSigninStatus({ token: acc.token })); }
    catch (e) { logDebug(`${out.name} 状态查询失败`, String(e?.message || e)); }

    let alreadySigned = st ? !!st.alreadySignedToday : (state.lastSignDate === today);
    let cont = Number((st && st.continueDays) || state.continueDays || 0);

    if (!alreadySigned) {
      const r = await manualSignIn(acc.token, state, persist);
      if (r.ok) {
        out.signed = true;
        out.signSkip = !!r.skipped;
        out.signScore = Number(r.todayAward || 0) || 0;
        cont = Number(r.continueDays || cont) || 0;
      } else {
        out.signed = false;
        out.error = r.msg || "签到失败";
      }
    } else {
      out.signed = true;
      out.signSkip = true;
    }

    const isBlindDay = !!(st && st.isBlindDay) || (cont > 0 && cont % 30 === 0);
    const br = await tryBlindBox({ token: acc.token, state, cont, isBlindDay, today, persist });
    if (br && br.ok) out.blind = "盲盒" + (br.integral ? `+${br.integral}` : (br.prizeName || "✓"));
    else if (br && !br.skipped) out.blind = "盲盒✗";

    if (getStore().cfg.autoSupplement) {
      try {
        const sup = await runSupplementFlow(acc);
        if (sup.found > 0) out.supplement = sup.used > 0 ? `补签${sup.used}天` : `漏${sup.found}天(${sup.msg || "未补"})`;
      } catch (e) { logDebug("补签异常", String(e?.message || e)); }
    }

    if (getStore().cfg.autoPost && state.userId) {
      try {
        const pr = await autoPublishArticle(acc.token, state, persist);
        out.post = pr && pr.skipped ? "skip" : pr && pr.ok ? "ok" : "fail";
      } catch (e) {
        const m = String(e?.message || e);
        if (m === "TOKEN_EXPIRED") out.error = out.error || "Token过期";
        else logDebug("发布异常", m);
      }
    }

    try {
      const int2 = await fetchTotalIntegral({ token: acc.token });
      if (String(int2?.code || "") === "10000" || int2?.data != null) {
        state.totalPoints = adaptTotalIntegral(int2);
        persist();
      }
    } catch { }
    out.points = Number(state.totalPoints || 0);
  } catch (e) {
    const m = String(e?.message || e);
    out.error = out.error || (m === "TOKEN_EXPIRED" ? "Token过期（到 6️⃣ 账号管理 更新）" : m);
  }
  persist();
  return out;
}

// ========== 多账号并发签到（并发池 + 错峰启动，降低风控概率） ==========
async function runBatchSignin(accounts) {
  const cfg = getStore().cfg;
  const limit = Math.max(1, Math.min(5, Number(cfg.concurrency || 3)));
  const list = (accounts || []).filter((a) => a && a.token);
  const queue = list.slice();
  const results = new Array(list.length).fill(null);
  const idxOf = new Map(list.map((a, i) => [a.id, i]));
  const t0 = Date.now();

  const workerCount = Math.min(limit, queue.length);
  const workers = [];
  for (let wi = 0; wi < workerCount; wi++) {
    workers.push((async () => {
      await sleep(wi * 900); // 错峰启动
      while (queue.length) {
        const acc = queue.shift();
        let r = null;
        try { r = await runAccountFlow(acc); }
        catch (e) { r = { id: acc.id, name: dispName(acc), error: String(e?.message || e) }; }
        if (r) results[idxOf.get(acc.id)] = r;
        await sleep(600);
      }
    })());
  }
  await Promise.all(workers);
  return { results: results.filter(Boolean), ms: Date.now() - t0, count: list.length };
}

function batchSummaryLines(batch) {
  return batch.results.map((r) => {
    if (r.error) return `✗ ${r.name}: ${r.error}`;
    const parts = [];
    parts.push(r.signed ? (r.signSkip ? "签到(已签)" : `签到+${r.signScore}`) : "签到✗");
    if (r.blind) parts.push(r.blind);
    if (r.supplement) parts.push(r.supplement);
    if (r.post) parts.push(r.post === "ok" ? "发布✓" : r.post === "skip" ? "发布(已发)" : "发布✗");
    if (r.points != null) parts.push(`${r.points}分`);
    return `✓ ${r.name}: ${parts.join(" · ")}`;
  }).join("\n");
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

// ========== 账号管理：手机号免抓包登录 / Token添加 / 车辆选择入库 ==========
async function simpleAlert(title, message) {
  try {
    const a = new Alert();
    a.title = title;
    a.message = String(message || "");
    a.addAction("确定");
    await a.present();
  } catch { }
}

// 把技术性错误翻译成用户能看懂、能行动的提示
function friendlyErr(e) {
  const m = String((e && (e.message || e)) || "未知错误");
  if (m === "TOKEN_EXPIRED") return "Token已过期，请到 6️⃣ 账号管理 → 重新登录/更新Token";
  if (m === "缺少Token") return "该账号缺少Token，请到 6️⃣ 账号管理 设置";
  if (/获取车辆列表失败/.test(m)) return m + (m.includes("Token已过期") ? "" : "（Token可能已过期）");
  if (/timeout|timed out/i.test(m)) return "网络超时，请检查网络后重试";
  return m;
}

// App 网关签名（发码/登录用；POST 也必须按 GET 风格签名：URL入签、body不入签）
function appGatewaySign(url, method, params = {}, body = "") {
  const ac = APP_CONFIG.app;
  const timestamp = new Date().getTime();
  const nonce = getRandomChars(16) + timestamp;
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const query = toQuery(params);
  let preSign = "";
  if (String(method).toUpperCase() === "GET") {
    // 注意：Scriptable 的 URL 类没有 origin 属性，这里用纯字符串拼接（URL 不含 query 时即为完整地址）
    const base = String(url || "");
    if (query) preSign = base + (base.indexOf("?") >= 0 ? "&" : "?") + query;
    else preSign = base;
  } else {
    preSign = query + (body ? (typeof body === "string" ? body : JSON.stringify(body)) : "");
  }
  const sign = md5(sha1(preSign + param + ac.appSecret), 32).toString();
  return {
    appId: ac.appId,
    nonce: nonce,
    timestamp: String(timestamp),
    signature: sign,
    "Cfmoto-X-Param": param,
    "Cfmoto-X-Sign": sign,
    "Cfmoto-X-Sign-Type": "0",
  };
}

// 发送短信验证码（走 App 网关，与登录同一验证码池）
async function sendSmsCode(phone) {
  const url = joinUrl(BASE, "/v1.0/mine/cfmotoservermine/authCode/" + encodeURIComponent(phone));
  const req = new Request(url);
  req.method = "GET";
  req.timeoutInterval = 20;
  req.headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "okhttp/4.9.2",
    ...appGatewaySign(url, "GET", {}, ""),
  };
  try {
    const text = await req.loadString();
    return JSON.parse(text);
  } catch (e) {
    return { code: "-1", message: String(e?.message || e) };
  }
}

// 手机号 + 短信验证码登录（免抓包）
async function loginByPhoneReq(phone, code) {
  const url = joinUrl(BASE, "/v1.0/mine/cfmotoservermine/user/loginByPhone");
  const req = new Request(url);
  req.method = "POST";
  req.timeoutInterval = 20;
  const basic = String(getStore().cfg.basicAuth || "bWNrOjEyMzQ1Ng==").replace(/^Basic\s+/i, "");
  req.headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "okhttp/4.9.2",
    "Authorization": "Basic " + basic,
    ...appGatewaySign(url, "GET", {}, ""), // ⚠️ 按 GET 风格签名
  };
  req.body = JSON.stringify({ phone, authCode: String(code) });
  try {
    const text = await req.loadString();
    return JSON.parse(text);
  } catch (e) {
    return { code: "-1", message: String(e?.message || e) };
  }
}

// 用 Token 反查 userId / 昵称（H5 baseInfo）
async function fetchUserIdByToken(token) {
  try {
    const res = await safeRequest(requestWithSign, 'h5', "GET", joinUrl(H5_BASE, "/cfmotoservermine/baseInfo"), { server_name: SERVER_NAME }, null, token, "baseInfo");
    const d = res?.data || {};
    return { userId: String(d.id || d.userId || ""), nick: String(d.nickName || d.username || "").trim() };
  } catch (e) {
    logDebug("baseInfo 查询失败", String(e?.message || e));
    return { userId: "", nick: "" };
  }
}

// 查询车辆列表并弹出选择（返回 {picked, vehicles}）
async function pickVehicleForAccount(token, { title = "🚗 选择车辆" } = {}) {
  let items = [];
  try {
    const res = await safeRequest(requestWithSign, 'app', "GET", joinUrl(BASE, API.vehicleList), {}, "", token, "vehicleList");
    items = mapVehicleList(res);
  } catch (e) {
    const m = String(e?.message || e);
    if (m === "TOKEN_EXPIRED") throw new Error("获取车辆列表失败：Token已过期（到 6️⃣ 账号管理 更新）");
    throw new Error("获取车辆列表失败：" + m);
  }
  if (!items.length) throw new Error("该账号下未查到绑定车辆，请先在极核App绑定车辆");

  const a = new Alert();
  a.title = title;
  a.message = `共 ${items.length} 辆车，请选择用于该账号的默认车辆`;
  items.slice(0, 12).forEach((v) => {
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
  if (idx === -1) throw new Error("已取消");
  return { picked: items[idx], vehicles: items };
}

// 账号入库（新增或更新；同一 userId / token 视为同一账号）
async function finalizeAccount({ token, userId, userName, phone, picked, vehicles }) {
  const store = getStore();
  const uid = String(userId || "");
  const tk = cleanToken(token);
  let acc = store.accounts.find((a) => (uid && String(a.userId) === uid) || cleanToken(a.token) === tk);
  if (!acc) {
    acc = {
      id: "acc_" + (uid || Date.now().toString(36)),
      userId: uid,
      userName: userName || phone || ("账号" + (store.accounts.length + 1)),
      phone: phone || "",
      token: tk,
      vehicles: [],
      activeVin: "",
      state: {},
    };
    store.accounts.push(acc);
  }
  acc.token = tk;
  if (uid) acc.userId = uid;
  if (userName) acc.userName = userName;
  if (phone) acc.phone = phone;
  if (Array.isArray(vehicles) && vehicles.length) acc.vehicles = vehicles;
  else if (picked) acc.vehicles = [picked];
  acc.activeVin = (picked && picked.vinNo) || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "";
  acc.state = acc.state || {};
  if (uid) acc.state.userId = uid;
  if (picked) {
    acc.state.vehicleName = picked.name || acc.state.vehicleName || "";
    acc.state.vehicleType = picked.vehicleType || acc.state.vehicleType || "";
    acc.state.licensePlate = picked.licensePlate || acc.state.licensePlate || "";
    acc.state.vehicleImageUrl = acc.state.vehicleImageUrl || picked.pic || "";
  }
  if (!store.cfg.defaultAccountId) store.cfg.defaultAccountId = acc.id;
  registerUid(acc);
  saveStore(store);
  return acc;
}

// 手机号登录添加账号（免抓包）
async function addAccountByPhone() {
  const pa = new Alert();
  pa.title = "📱 手机号登录（免抓包）";
  pa.message = "输入极核 App 注册手机号，将发送短信验证码";
  pa.addTextField("手机号（11位）", "");
  pa.addAction("发送验证码");
  pa.addCancelAction("取消");
  if ((await pa.present()) === -1) return null;
  const phone = pa.textFieldValue(0).trim();
  if (!/^1\d{10}$/.test(phone)) {
    await simpleAlert("❌ 手机号格式不对", "应为11位数字");
    return null;
  }

  const send = await sendSmsCode(phone);
  if (!send || String(send.code) !== "10000") {
    await simpleAlert("❌ 验证码发送失败", String(send?.message || send?.msg || "未知错误"));
    return null;
  }

  const ca = new Alert();
  ca.title = "🔢 输入验证码";
  ca.message = `已发送至 ${phone.slice(0, 3)}****${phone.slice(-4)}`;
  ca.addTextField("短信验证码", "");
  ca.addAction("登录");
  ca.addCancelAction("取消");
  if ((await ca.present()) === -1) return null;
  const code = ca.textFieldValue(0).trim();
  if (!code) { await simpleAlert("❌ 验证码为空", "请重新输入"); return null; }

  const login = await loginByPhoneReq(phone, code);
  const token = login && login.data && login.data.tokenInfo && login.data.tokenInfo.access_token;
  if (!token) {
    await simpleAlert("❌ 登录失败", String(login?.message || login?.msg || "验证码有误或已过期"));
    return null;
  }
  let userId = String((login.data.id || login.data.userId) || "").trim();
  let userName = String(login.data.nickName || login.data.username || "").trim();
  registerUid({ token, userId: userId, state: { userId: userId } });
  if (!userId) {
    const info = await fetchUserIdByToken(token);
    userId = info.userId;
    userName = userName || info.nick;
    registerUid({ token, userId: userId, state: { userId: userId } });
  }

  let picked = null;
  try { picked = await pickVehicleForAccount(token, { title: "🚗 选择默认车辆" }); }
  catch (e) { await simpleAlert("❌ 添加失败", friendlyErr(e)); return null; }

  const acc = await finalizeAccount({ token, userId, userName, phone, picked: picked.picked, vehicles: picked.vehicles });
  await simpleAlert("✅ 添加成功", `${dispName(acc)} · 默认车辆 ${picked.picked.name}`);
  return acc;
}

// 粘贴 Token 添加账号
async function addAccountByToken() {
  let t = "";
  try { t = await promptForToken(""); } catch { return null; }
  if (!t) return null;
  const token = cleanToken(t);
  let userId = "", userName = "";
  registerUid({ token, userId: "", state: {} });
  const info = await fetchUserIdByToken(token);
  userId = info.userId; userName = info.nick;
  registerUid({ token, userId: userId, state: { userId: userId } });

  let picked = null;
  try { picked = await pickVehicleForAccount(token, { title: "🚗 选择默认车辆" }); }
  catch (e) { await simpleAlert("❌ 添加失败", friendlyErr(e)); return null; }

  const acc = await finalizeAccount({ token, userId, userName, phone: "", picked: picked.picked, vehicles: picked.vehicles });
  await simpleAlert("✅ 添加成功", `${dispName(acc)} · 默认车辆 ${picked.picked.name}`);
  return acc;
}

// 添加账号向导
async function addAccountWizard() {
  const a = new Alert();
  a.title = "➕ 添加账号";
  a.message = "选择添加方式：\n· 手机号登录：免抓包（推荐）\n· 粘贴Token：需先从 App 抓包获取 Authorization";
  a.addAction("📱 手机号登录（免抓包）");
  a.addAction("🔑 粘贴Token");
  a.addCancelAction("取消");
  const idx = await a.present();
  if (idx === -1) return null;
  if (idx === 0) return await addAccountByPhone();
  return await addAccountByToken();
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

// ========= UI：小尺寸组件 =========
function buildSmallWidget(data, batteryInfo = {}) {
  const C_BG = new Color("#ECF5FF");
  const C_BATT = new Color("#0f172a");
  const C_NAME = new Color("#1d4ed8");
  const C_TEXT_FAINT = new Color("#475569");
  const C_OK = new Color("#059669");
  const pct = Math.round(Number(data.batteryPercent || 0));
  const charging = (batteryInfo.chargeStateStr && batteryInfo.chargeStateStr !== "未充电");
  const w = new ListWidget();
  w.backgroundColor = C_BG;
  w.setPadding(10, 12, 10, 12);
  try { const runUrl = URLScheme.forRunningScript(); if (runUrl) w.url = runUrl; } catch (_) { }

  const nameTxt = w.addText(String(data.vehicleDisplayName || "车辆"));
  nameTxt.font = Font.semiboldSystemFont(11);
  nameTxt.textColor = C_NAME;
  nameTxt.lineLimit = 1;
  nameTxt.minimumScaleFactor = 0.8;

  w.addSpacer(3);

  const pctRow = w.addStack();
  pctRow.layoutHorizontally();
  pctRow.centerAlignContent();
  const pctTxt = pctRow.addText(`${pct}%`);
  pctTxt.font = Font.heavySystemFont(24);
  pctTxt.textColor = C_BATT;
  if (charging) {
    const bolt = pctRow.addText(" ⚡");
    bolt.font = Font.systemFont(11);
    bolt.textColor = C_OK;
  }
  pctRow.addSpacer();

  w.addSpacer(3);

  let barFillColor;
  if (charging) barFillColor = new Color("#10b981");
  else if (pct <= 20) barFillColor = new Color("#ef4444");
  else if (pct <= 50) barFillColor = new Color("#f59e0b");
  else barFillColor = new Color("#005782");
  const bar = w.addImage(drawProgressBar(pct, 120, 6, barFillColor, new Color("#DBEAFE")));
  bar.imageSize = new Size(120, 6);

  w.addSpacer(3);

  const bottom = w.addStack();
  bottom.layoutHorizontally();
  bottom.centerAlignContent();
  const rangeTxt = bottom.addText(`${data.residualRangeKm}km`);
  rangeTxt.font = Font.systemFont(9);
  rangeTxt.textColor = new Color("#0f172a");
  bottom.addSpacer();
  const signed = !!data.signedToday;
  const signTxt = bottom.addText(signed ? "●已签" : "○未签");
  signTxt.font = Font.systemFont(8);
  signTxt.textColor = signed ? C_OK : new Color("#dc2626");
  bottom.addSpacer(3);
  const daysTxt = bottom.addText(`连${Number(data.points && data.points.continueDays || 0)}天`);
  daysTxt.font = Font.systemFont(8);
  daysTxt.textColor = C_TEXT_FAINT;
  return w;
}

// ========= UI：大尺寸组件 =========
async function buildLargeWidget(data, batteryInfo = {}, chargeStateStr = "未充电") {
  const C_BG = new Color("#ECF5FF");
  const C_NAME = new Color("#1d4ed8");
  const C_BATT = new Color("#0f172a");
  const C_TEXT = new Color("#475569");
  const C_OK = new Color("#059669");
  const C_WARN = new Color("#d97706");
  const C_DANGER = new Color("#dc2626");
  const C_TEMP = new Color("#0284c7");
  const pct = Math.round(Number(data.batteryPercent || 0));
  const charging = chargeStateStr && chargeStateStr !== "未充电";
  const signed = !!data.signedToday;
  const cdays = Number(data.points && data.points.continueDays || 0);
  const untilBox = Number(data.points && data.points.daysUntilLottery || 0);
  const tp = data.tire || {};

  const w = new ListWidget();
  w.backgroundColor = C_BG;
  w.setPadding(14, 16, 14, 16);
  w.spacing = 6;
  try { const runUrl = URLScheme.forRunningScript(); if (runUrl) w.url = runUrl; } catch (_) { }

  // 第一行：车名 + 徽章 + 时间
  const rowTop = w.addStack();
  rowTop.layoutHorizontally();
  rowTop.centerAlignContent();
  rowTop.spacing = 5;
  const nameTxt = rowTop.addText(String(data.vehicleDisplayName || "车辆"));
  nameTxt.font = Font.boldSystemFont(16);
  nameTxt.textColor = C_NAME;
  nameTxt.lineLimit = 1;
  rowTop.addSpacer();
  const badge = rowTop.addText(signed ? "●已签" : "○未签");
  badge.font = Font.systemFont(9);
  badge.textColor = signed ? C_OK : C_DANGER;
  rowTop.addSpacer(4);
  const boxTxt = rowTop.addText(data.points && data.points.isBlindDay ? `🎁盲盒日` : `盲盒${untilBox}天`);
  boxTxt.font = Font.systemFont(9);
  boxTxt.textColor = C_WARN;
  rowTop.addSpacer(4);
  const now = new Date();
  const timeTxt = rowTop.addText(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  timeTxt.font = Font.systemFont(9);
  timeTxt.textColor = C_TEXT;

  // 第二行：电量 + 续航 + 充电状态
  const rowBatt = w.addStack();
  rowBatt.layoutHorizontally();
  rowBatt.centerAlignContent();
  const pctTxt = rowBatt.addText(`${pct}%`);
  pctTxt.font = Font.heavySystemFont(30);
  pctTxt.textColor = C_BATT;
  if (charging) {
    const bolt = rowBatt.addText(" ⚡");
    bolt.font = Font.systemFont(14);
    bolt.textColor = C_OK;
  }
  rowBatt.addSpacer(8);
  const rangeTxt = rowBatt.addText(`${data.residualRangeKm}km`);
  rangeTxt.font = Font.systemFont(13);
  rangeTxt.textColor = C_TEXT;
  rowBatt.addSpacer();
  if (charging) {
    const csTxt = rowBatt.addText(`🔋${chargeStateStr}`);
    csTxt.font = Font.systemFont(10);
    csTxt.textColor = C_OK;
  }

  // 电量条
  let barFillColor;
  if (charging) barFillColor = new Color("#10b981");
  else if (pct <= 20) barFillColor = new Color("#ef4444");
  else if (pct <= 50) barFillColor = new Color("#f59e0b");
  else barFillColor = new Color("#005782");
  const bar = w.addImage(drawProgressBar(pct, 300, 8, barFillColor, new Color("#DBEAFE")));
  bar.imageSize = new Size(300, 8);

  w.addSpacer(2);

  // 电压 / 电流 / 电池温度
  const rowVolt = w.addStack();
  rowVolt.layoutHorizontally();
  rowVolt.centerAlignContent();
  rowVolt.spacing = 4;
  const voltVal = Number(batteryInfo.voltage || 0);
  const vTxt = rowVolt.addText(`电压 ${voltVal > 0 ? voltVal.toFixed(1) + "V" : "—"}`);
  vTxt.font = Font.systemFont(10);
  vTxt.textColor = C_TEMP;
  rowVolt.addSpacer();
  const curVal = Number(batteryInfo.current || 0);
  const cTxt = rowVolt.addText(`电流 ${curVal ? curVal.toFixed(1) + "A" : "—"}`);
  cTxt.font = Font.systemFont(10);
  cTxt.textColor = C_TEXT;
  rowVolt.addSpacer();
  const tempVal = Number(batteryInfo.batteryTemp || 0);
  const tTxt = rowVolt.addText(`电池 ${tempVal ? tempVal.toFixed(0) + "℃" : "—"}`);
  tTxt.font = Font.systemFont(10);
  tTxt.textColor = C_TEMP;

  w.addSpacer(2);

  // 今日骑行
  const dist = isFinite(data.today && data.today.distanceKm) ? Number(data.today.distanceKm).toFixed(1) : "—";
  const dur = isFinite(data.today && data.today.durationMin) ? toMinutesStr(data.today.durationMin) : "—";
  const rowRide = w.addStack();
  rowRide.layoutHorizontally();
  rowRide.centerAlignContent();
  rowRide.spacing = 5;
  const rideL = rowRide.addText("今日骑行");
  rideL.font = Font.systemFont(10);
  rideL.textColor = C_TEXT;
  const rideV = rowRide.addText(`${dist}km · ${dur} · 极速${Number(data.today && data.today.maxSpeedKmh || 0)}km/h`);
  rideV.font = Font.systemFont(10);
  rideV.textColor = C_BATT;

  // 上次骑行
  const lastKm = isFinite(data.today && data.today.lastRideMileage) ? Number(data.today.lastRideMileage).toFixed(1) : "0.0";
  const lastDur = Number(data.today && data.today.lastRideDurationMin || 0);
  const rowLast = w.addStack();
  rowLast.layoutHorizontally();
  rowLast.centerAlignContent();
  rowLast.spacing = 5;
  const lastL = rowLast.addText("上次骑行");
  lastL.font = Font.systemFont(10);
  lastL.textColor = C_TEXT;
  const lastV = rowLast.addText(`${lastKm}km · ${lastDur}min`);
  lastV.font = Font.systemFont(10);
  lastV.textColor = C_BATT;

  // 胎压
  const rowTire = w.addStack();
  rowTire.layoutHorizontally();
  rowTire.centerAlignContent();
  rowTire.spacing = 5;
  const tireL = rowTire.addText("胎压");
  tireL.font = Font.systemFont(10);
  tireL.textColor = C_TEXT;
  const frontUnbound = !tp.frontPressure || tp.frontPressure === "未绑定";
  const rearUnbound = !tp.rearPressure || tp.rearPressure === "未绑定";
  const tireV = rowTire.addText(
    (frontUnbound && rearUnbound) ? "未绑定" :
      `前 ${tp.frontPressure || "未绑"}${tp.frontTemp ? " " + tp.frontTemp : ""} · 后 ${tp.rearPressure || "未绑"}${tp.rearTemp ? " " + tp.rearTemp : ""}`
  );
  tireV.font = Font.systemFont(10);
  tireV.textColor = C_BATT;

  // 积分
  const rowPts = w.addStack();
  rowPts.layoutHorizontally();
  rowPts.centerAlignContent();
  rowPts.spacing = 5;
  const ptsL = rowPts.addText("积分");
  ptsL.font = Font.systemFont(10);
  ptsL.textColor = C_TEXT;
  const ptsV = rowPts.addText(`${Number(data.points && data.points.total || 0)} +${Number(data.points && data.points.today || 0)} · 连签${cdays}天`);
  ptsV.font = Font.semiboldSystemFont(11);
  ptsV.textColor = new Color("#15609e");

  // 停车位置
  if (data.address) {
    const addr = w.addText(`📍 ${data.address}`);
    addr.font = Font.systemFont(9);
    addr.textColor = C_TEXT;
    addr.lineLimit = 2;
  }

  // 发布状态
  const rowPost = w.addStack();
  rowPost.layoutHorizontally();
  rowPost.centerAlignContent();
  rowPost.spacing = 4;
  if (data.postStatus === "success") {
    const mk = (label, ok) => {
      const t = rowPost.addText(ok ? `✓${label}` : `✕${label}`);
      t.font = Font.systemFont(9);
      t.textColor = ok ? C_OK : C_DANGER;
    };
    mk("发布", true);
    mk("点赞", data.liked);
    mk("分享", data.shared);
    mk("删除", data.deleted);
  } else if (data.postStatus === "failed") {
    const failTxt = rowPost.addText("✕发布失败");
    failTxt.font = Font.systemFont(9);
    failTxt.textColor = C_DANGER;
  } else {
    const waitTxt = rowPost.addText("⏳待发布");
    waitTxt.font = Font.systemFont(9);
    waitTxt.textColor = C_TEXT;
  }

  return w;
}

// ========= UI：锁屏组件（圆形 / 长方形 / 单行） =========
function buildAccessoryCircular(data) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(data.batteryPercent || 0))));
  const w = new ListWidget(); // 注意：ListWidget 没有 centerAlignContent（那是 Stack 的方法），内容默认居中
  try {
    const S = 64, total = 36, R = 24, dot = 3.6, cx = S / 2, cy = S / 2;
    const dc = new DrawContext();
    dc.size = new Size(S, S);
    dc.opaque = false;
    const filled = Math.round(total * pct / 100);
    const fillColor = pct <= 20 ? new Color("#ef4444") : pct <= 50 ? new Color("#f59e0b") : new Color("#10b981");
    for (let i = 0; i < total; i++) {
      const ang = (Math.PI * 2 * i / total) - Math.PI / 2;
      const x = cx + Math.cos(ang) * R - dot / 2;
      const y = cy + Math.sin(ang) * R - dot / 2;
      dc.setFillColor(i < filled ? fillColor : new Color("#9CA3AF"));
      dc.fillEllipse(new Rect(x, y, dot, dot));
    }
    const img = w.addImage(dc.getImage());
    img.imageSize = new Size(40, 40);
  } catch (e) {
    logDebug("圆形组件绘制失败，降级为纯文字", String(e?.message || e));
  }
  const t = w.addText(`${pct}%`);
  t.font = Font.semiboldSystemFont(9);
  t.centerAlignText();
  return w;
}

function buildAccessoryRectangular(data) {
  const w = new ListWidget();
  const row1 = w.addStack();
  row1.layoutHorizontally();
  row1.centerAlignContent();
  const nameT = row1.addText(String(data.vehicleDisplayName || "车辆"));
  nameT.font = Font.semiboldSystemFont(12);
  nameT.lineLimit = 1;
  row1.addSpacer();
  const signT = row1.addText(data.signedToday ? "已签" : "未签");
  signT.font = Font.systemFont(10);
  const row2 = w.addStack();
  row2.layoutHorizontally();
  row2.centerAlignContent();
  const pctT = row2.addText(`${Math.round(Number(data.batteryPercent || 0))}%`);
  pctT.font = Font.systemFont(12);
  row2.addSpacer(4);
  const rangeT = row2.addText(`${data.residualRangeKm}km`);
  rangeT.font = Font.systemFont(11);
  row2.addSpacer();
  const ptsT = row2.addText(`${Number(data.points && data.points.total || 0)}分`);
  ptsT.font = Font.systemFont(10);
  return w;
}

function buildAccessoryInline(data) {
  const w = new ListWidget();
  const t = w.addText(`${Math.round(Number(data.batteryPercent || 0))}% · ${data.residualRangeKm}km · ${data.signedToday ? "已签" : "未签"}`);
  t.font = Font.systemFont(12);
  return w;
}

// 按组件尺寸选择构建器
async function buildWidgetForFamily(data, batteryInfo, chargeStateStr, family) {
  switch (String(family || "medium")) {
    case "small": return buildSmallWidget(data, batteryInfo);
    case "large": return await buildLargeWidget(data, batteryInfo, chargeStateStr);
    case "accessoryCircular": return buildAccessoryCircular(data);
    case "accessoryRectangular": return buildAccessoryRectangular(data);
    case "accessoryInline": return buildAccessoryInline(data);
    default: return await buildWidgetCard(data, chargeStateStr);
  }
}

// ============== manualSignIn ==============
async function manualSignIn(token, state, persist = writeState) {
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
      persist(state);

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
      persist(state);
      return {
        ok: true,
        skipped: true,
        continueDays: Number(state.continueDays || 0),
      };
    }

    state.lastSignOk = false;
    persist(state);
    return { ok: false, msg: msg || "签到失败" };
  } catch (e) {
    const errMsg = String(e?.message || e);
    if (errMsg === "TOKEN_EXPIRED") {
      throw new Error("TOKEN_EXPIRED");
    }
    state.lastSignOk = false;
    state.todaySigned = false;
    persist(state);
    return { ok: false, msg: errMsg };
  }
}

// ============== 单账号完整流水线（组件刷新 / 菜单预览共用） ==============
async function runSinglePipeline(acc, vinNo, opts = {}) {
  const isWidget = !!opts.isWidget;
  let state = readState() || {};
  const token = acc.token;
  logDebug("当前State", state);
  logDebug("启动参数", __PARAMS);
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
  let batteryInfo = { chargeStateStr: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0 };
  
  try {
    [
      statusRaw,
      integralRaw,
      homeRideRaw,
      myRideRaw,
      widgetsRaw,
      tireRaw,
      batteryInfo,
    ] = await Promise.all([
      fetchSigninStatus({ token }).catch(() => ({})),
      fetchTotalIntegral({ token }).catch(() => ({})),
      fetchHomeRideInfo({ vinNo, token }).catch(() => ({})),
      fetchMyRideInfo({ vinNo, month: monthStrYYYY_MM_withDots(), token }).catch(() => ({})),
      fetchVehicleWidgets({ vinNo, token }).catch(() => ({})),
      fetchTirePressure({ vinNo, token }).catch(() => ({})),
      fetchBatteryInfo({ vinNo, token }).catch(() => ({ chargeStateStr: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0 })),
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
  const chargeStateStr = batteryInfo.chargeStateStr || "未充电";

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

  const blindRes = await tryBlindBox({ token, state, cont: continueDays, isBlindDay, today, persist: writeState });
  if (blindRes && blindRes.msg === "TOKEN_EXPIRED") {
    await handleTokenExpiredInMain(isWidget);
    return;
  }
  if (blindRes.skipped) logStep("盲盒", "skip", blindRes.reason || "");
  else if (blindRes.ok && blindRes.integral && isFinite(Number(blindRes.integral))) blindBoxScore = Number(blindRes.integral);

  // ========== 执行发布动态 ==========
  let postStatus = state.lastPostDate === today ? "success" : null;
  let postContent = "";
  let liked = false;
  let shared = false;
  let deleted = false;
  let sharePointsReceived = false;
  
  if (getStore().cfg.autoPost && state.userId) {
    try {
      const postResult = await autoPublishArticle(token, state);
      if (postResult.skipped) {
        postStatus = "success";
        postContent = state.lastPostContent || getStore().cfg.postContent || POST_CONTENT;
        liked = state.lastPostLiked || false;
        shared = state.lastPostShared || false;
        deleted = state.lastPostDeleted || false;
        sharePointsReceived = state.lastSharePointsReceived || false;
      } else if (postResult.ok) {
        postStatus = "success";
        postContent = postResult.content || getStore().cfg.postContent || POST_CONTENT;
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
        postContent = getStore().cfg.postContent || POST_CONTENT;
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
    battery: {
      voltage: Number(batteryInfo.voltage || 0),
      current: Number(batteryInfo.current || 0),
      temp: Number(batteryInfo.batteryTemp || 0),
      soc: Number(batteryInfo.soc || widgets.batteryPercent || 0),
      powerUseToday: Number(batteryInfo.powerUseToday || 0),
      powerUseMonth: Number(batteryInfo.powerUseMonth || 0),
      chargeCount: Number(batteryInfo.chargeCount || 0),
    },
    postStatus: postStatus,
    postContent: postContent || state.lastPostContent || getStore().cfg.postContent || POST_CONTENT,
    liked: liked,
    shared: shared,
    deleted: deleted,
    sharePointsReceived: sharePointsReceived,
  };
  
  logDebug("最终数据", data);

  // 方案A：充电监控（每次运行/组件刷新检测一次，充满100% 或 电压≥阈值 自动通知，已去重）
  try { runChargeNotifyCheck(acc, batteryInfo, data.vehicleDisplayName); } catch (e) { logDebug("监控异常", String(e?.message || e)); }

  state.lastSoc = data.batteryPercent;
  state.lastRange = data.residualRangeKm;
  writeState(state);

  return { data, chargeStateStr, batteryInfo };
}

// ============== 配置导出 / 导入 ==============
function exportStoreString() {
  const s = getStore();
  return JSON.stringify({
    app: "ZEEHO-Scriptable",
    version: 2,
    exportedAt: new Date().toISOString(),
    cfg: s.cfg,
    accounts: s.accounts,
  }, null, 2);
}

function replaceStore(parsed) {
  STORE = {
    version: 2,
    cfg: Object.assign({}, DEFAULT_CFG, parsed.cfg || {}),
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
  };
  for (const k of Object.keys(UID_BY_TOKEN)) delete UID_BY_TOKEN[k];
  for (const a of STORE.accounts) {
    if (!a.state || typeof a.state !== "object") a.state = {};
    if (!Array.isArray(a.vehicles)) a.vehicles = [];
    if (!a.activeVin && a.vehicles[0]) a.activeVin = a.vehicles[0].vinNo;
    registerUid(a);
  }
  CURRENT_ACC = null;
  saveStore(STORE);
  applyStoreConfig(STORE);
}

async function doExportClipboard() {
  Pasteboard.copy(exportStoreString());
  await simpleAlert("✅ 已复制到剪贴板", "配置（含 Token 与车辆信息）已复制。\n⚠️ 内含敏感信息，请勿分享给他人。");
}

async function doExportFile() {
  const p = FM.joinPath(FM.documentsDirectory(), `zeeho_backup_${todayISO()}.json`);
  FM.writeString(p, exportStoreString());
  try {
    await QuickLook.present(p);
  } catch (e) {
    await simpleAlert("✅ 已保存", `文件已保存到 Scriptable 目录：zeeho_backup_${todayISO()}.json`);
  }
}

async function doImportClipboard() {
  let txt = "";
  try { txt = String(Pasteboard.paste() || ""); } catch { }
  if (!txt.trim() || txt.indexOf("ZEEHO-Scriptable") < 0) {
    await simpleAlert("❌ 导入失败", "剪贴板里没有找到本脚本导出的配置内容");
    return false;
  }
  const ca = new Alert();
  ca.title = "⚠️ 确认导入";
  ca.message = "导入将覆盖当前所有账号与配置（含 Token），确定继续？";
  ca.addAction("覆盖导入");
  ca.addCancelAction("取消");
  if ((await ca.present()) !== 0) return false;
  try {
    const parsed = JSON.parse(txt);
    replaceStore(parsed);
    await simpleAlert("✅ 导入成功", `已恢复 ${getStore().accounts.length} 个账号。若组件未更新，请手动运行一次。`);
    return true;
  } catch (e) {
    await simpleAlert("❌ 导入失败", String(e?.message || e));
    return false;
  }
}

// ============== App 内交互菜单 ==============
let MENU_ACC = null; // 菜单当前操作账号（会话级）

async function pickAccountInteractive(prompt = "选择账号") {
  const store = getStore();
  if (!store.accounts.length) { await simpleAlert("提示", "尚未添加账号"); return null; }
  const a = new Alert();
  a.title = "👤 " + prompt;
  a.message = `共 ${store.accounts.length} 个账号`;
  store.accounts.slice(0, 12).forEach((acc) => {
    const v = acc.vehicles.find((x) => x.vinNo === acc.activeVin) || acc.vehicles[0] || {};
    a.addAction(`${dispName(acc)}${v.name ? " · " + v.name : ""}`);
  });
  a.addCancelAction("取消");
  const idx = await a.present();
  if (idx === -1) return null;
  return store.accounts[idx];
}

// 账号就绪检查：缺少Token时引导设置（手机号登录 / 粘贴Token），避免后续操作全部失败
async function ensureAccountReady(acc) {
  if (!acc) return false;
  if (acc.token) return true;
  const a = new Alert();
  a.title = "🔑 该账号尚未设置Token";
  a.message = `账号「${dispName(acc)}」缺少Token，无法签到 / 查车 / 车控。\n\n常见原因：粘贴本脚本新版时，覆盖了旧脚本里保存的 Token。\n请选择获取方式：`;
  a.addAction("📱 手机号登录（免抓包）");
  a.addAction("🔑 粘贴Token");
  a.addCancelAction("取消");
  const idx = await a.present();
  if (idx === -1) return false;
  if (idx === 0) {
    const r = await addAccountByPhone();
    if (r) { MENU_ACC = r; }
    return !!(r && r.token);
  }
  // 粘贴Token：直接更新到当前账号
  let t = "";
  try { t = await promptForToken(""); } catch { return false; }
  if (!t) return false;
  acc.token = cleanToken(t);
  registerUid(acc);
  saveStore(getStore());
  const info = await fetchUserIdByToken(acc.token);
  if (info.userId && !acc.userId) {
    acc.userId = info.userId;
    acc.state = acc.state || {};
    acc.state.userId = info.userId;
    registerUid(acc);
    saveStore(getStore());
  }
  await simpleAlert("✅ 已设置Token", `账号「${dispName(acc)}」Token 已保存`);
  return true;
}

async function showMainMenu() {
  const store0 = getStore();
  applyStoreConfig(store0);
  if (!MENU_ACC || !getStore().accounts.find((x) => x.id === MENU_ACC.id)) MENU_ACC = defaultOrFirstAccount(store0);

  while (true) {
    const store = getStore();
    applyStoreConfig(store);
    if (!MENU_ACC || !store.accounts.find((x) => x.id === MENU_ACC.id)) MENU_ACC = defaultOrFirstAccount(store);
    const acc = MENU_ACC;
    const veh = acc ? (acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {}) : {};
    const st = (acc && acc.state) || {};
    const lines = [];
    lines.push(acc ? `👤 ${dispName(acc)} · ${veh.name || "未选车"}` : "👤 未添加账号");
    if (acc) {
      const socStr = st.lastSoc != null ? `${st.lastSoc}%` : "—";
      lines.push(`🔋 ${socStr}${st.lastVoltage ? " · " + Number(st.lastVoltage).toFixed(1) + "V" : ""} · ⭐${st.totalPoints || 0}分`);
      lines.push(`📅 ${st.lastSignDate === todayISO() ? "今日已签" : "今日未签"} · 连签${st.continueDays || 0}天`);
    }
    lines.push(`👥 ${store.accounts.length}账号 · 并发${store.cfg.concurrency}`);

    const a = new Alert();
    a.title = "🏍️ ZEEHO 极核助手";
    a.message = lines.join("\n");
    a.addAction(`1️⃣ 一键全部签到（${store.accounts.length}账号 · 并发${store.cfg.concurrency}）`);
    a.addAction("2️⃣ 本账号：签到 / 补签 / 盲盒");
    a.addAction("3️⃣ 车辆控制 🔐");
    a.addAction("4️⃣ 充电监控 🔋");
    a.addAction("5️⃣ 车辆与组件显示");
    a.addAction("6️⃣ 账号管理 👥");
    a.addAction("7️⃣ 组件预览 📱");
    a.addAction("8️⃣ 配置导出 / 导入 💾");
    a.addAction("9️⃣ 设置 ⚙️");
    a.addCancelAction("🚪 退出");
    const idx = await a.present();
    if (idx === -1) return;
    try {
      if (idx === 0) await menuBatch();
      else if (idx === 1) await menuMine();
      else if (idx === 2) await menuVehicleControl();
      else if (idx === 3) await menuMonitor();
      else if (idx === 4) await menuVehicleDisplay();
      else if (idx === 5) await menuAccounts();
      else if (idx === 6) await menuPreview();
      else if (idx === 7) await menuExportImport();
      else if (idx === 8) await menuSettings();
    } catch (e) {
      console.error("[菜单操作异常]", (e && (e.stack || e.message)) || e);
      const detail = String((e && (e.message || e)) || "未知错误");
      const ca = new Alert();
      ca.title = "❌ 操作失败";
      ca.message = detail.slice(0, 300) + "\n\n若无法解决，可点「复制错误详情」发送给开发者";
      ca.addAction("📋 复制错误详情");
      ca.addAction("确定");
      ca.addCancelAction("关闭");
      const ci = await ca.present();
      if (ci === 0) {
        Pasteboard.copy(`[ZEEHO错误] ${detail}\n${(e && (e.stack || "")) || ""}`);
        await simpleAlert("✅ 已复制", "错误详情已复制到剪贴板，请发送给开发者");
      }
    }
  }
}

async function menuBatch() {
  let store = getStore();
  let list = store.accounts.filter((a) => a.token);
  if (!list.length) {
    // 没有可用账号：先引导设置Token（优先默认账号）
    const target = defaultOrFirstAccount(store);
    if (target) {
      if (!(await ensureAccountReady(target))) return;
      store = getStore();
      list = store.accounts.filter((a) => a.token);
    }
  }
  if (!list.length) { await simpleAlert("提示", "尚未添加账号"); return; }
  logStep("批量签到", "start", `${list.length}个账号 · 并发${store.cfg.concurrency}`);
  const batch = await runBatchSignin(list);
  const summary = `⏱ ${Math.round(batch.ms / 1000)}s · ${batch.count}个账号\n\n${batchSummaryLines(batch)}`;
  await notifySimple("🏍️ ZEEHO 批量签到完成", `共 ${batch.count} 个账号`);
  await simpleAlert("✅ 批量签到完成", summary);
}

async function menuMine() {
  let acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未添加账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const a = new Alert();
  a.title = `👤 ${dispName(acc)}`;
  a.message = "签到 / 补签 / 盲盒操作";
  a.addAction("✅ 立即签到（完整流程）");
  a.addAction("📅 检测漏签并补签");
  a.addAction("🎁 手动抽盲盒");
  a.addAction("🔄 刷新积分");
  a.addAction("👥 切换目标账号");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 4) {
    const p = await pickAccountInteractive("切换目标账号");
    if (p) MENU_ACC = p;
    return;
  }
  setCurrentAcc(acc);
  if (idx === 0) {
    const r = await runAccountFlow(acc);
    await simpleAlert("✅ 执行完成", batchSummaryLines({ results: [r] }));
  } else if (idx === 1) {
    const r = await runSupplementFlow(acc);
    await simpleAlert("📅 补签结果", r.found === 0 ? "无漏签" : `发现漏签 ${r.found} 天，已补 ${r.used} 天${r.msg ? "（" + r.msg + "）" : ""}`);
  } else if (idx === 2) {
    const state = acc.state = acc.state || {};
    const cont = Number(state.continueDays || 0);
    const br = await tryBlindBox({ token: acc.token, state, cont, isBlindDay: true, today: todayISO(), persist: () => saveStore(getStore()) });
    await simpleAlert("🎁 盲盒结果", br.ok ? `恭喜：${br.prizeName || "奖励"}${br.integral ? " " + br.integral + "分" : ""}` : (br.skipped ? br.reason : (br.msg || "未中")));
  } else if (idx === 3) {
    try {
      const int2 = await fetchTotalIntegral({ token: acc.token });
      const total = adaptTotalIntegral(int2);
      acc.state.totalPoints = total;
      saveStore(getStore());
      await simpleAlert("⭐ 积分", `当前总积分：${total}`);
    } catch (e) { await simpleAlert("❌ 查询失败", friendlyErr(e)); }
  }
}

async function menuVehicleControl() {
  let acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未添加账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  if (!(await ensureVehicleRisk())) return;

  // ① 选择要控制的车辆（多车 / 多账号时先说清楚控制哪台）
  let veh = acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {};
  const multiAcc = getStore().accounts.length > 1;
  if (acc.vehicles.length > 1 || multiAcc) {
    const va = new Alert();
    va.title = "🚗 选择控制车辆";
    va.message = `账号「${dispName(acc)}」${acc.vehicles.length > 1 ? `有 ${acc.vehicles.length} 辆车` : ""}\n当前车辆：${veh.name || "未命名"}${veh.vinNo === acc.activeVin ? "（默认）" : ""}`;
    acc.vehicles.slice(0, 12).forEach((v) => {
      const desc = [
        v.name || "未命名",
        v.licensePlate ? `车牌:${v.licensePlate}` : null,
        v.vinNo ? `尾号:${v.vinNo.slice(-6)}` : null,
        v.vinNo === acc.activeVin ? "默认" : null,
      ].filter(Boolean).join(" · ");
      va.addAction(desc);
    });
    if (multiAcc) va.addAction("🔁 切换账号后再选车");
    va.addCancelAction("取消");
    const vi = await va.present();
    if (vi === -1) return;
    if (multiAcc && vi === Math.min(acc.vehicles.length, 12)) {
      const p = await pickAccountInteractive("切换为哪个账号");
      if (p) MENU_ACC = p;
      return await menuVehicleControl();
    }
    if (acc.vehicles[vi]) veh = acc.vehicles[vi];
  }
  if (!veh.vinNo) { await simpleAlert("提示", "该账号下未配置车辆"); return; }

  // ② 指令菜单
  const a = new Alert();
  a.title = "🔐 车辆控制";
  a.message = `${veh.name || dispName(acc)}${veh.licensePlate ? " · " + veh.licensePlate : ""}\n⚠️ 指令会真实操作车辆，请确认车辆处于安全环境`;
  a.addAction("⚡ 寻车闪灯");
  a.addAction("📢 鸣笛 + 闪灯");
  a.addAction("🪑 打开坐垫");
  a.addAction("🔓 云端开锁");
  a.addAction("🔒 云端关锁");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  const map = ["find", "loudFind", "cushion", "unlock", "lock"];
  const action = map[idx];
  if (action === "unlock" || action === "lock") {
    const c = new Alert();
    c.title = action === "unlock" ? "🔓 确认开锁？" : "🔒 确认关锁？";
    c.message = `车辆：${veh.name || "未命名"}${veh.licensePlate ? " · " + veh.licensePlate : ""}\n将向云端下发指令，车辆需在信号良好处`;
    c.addAction("确认下发");
    c.addCancelAction("取消");
    if ((await c.present()) !== 0) return;
  }
  logStep(VEHICLE_ACTION_TEXT[action], "start", veh.name || "");
  const r = await vehicleAction(acc, action, veh.vinNo);
  logStep(VEHICLE_ACTION_TEXT[action], r.ok ? "ok" : "fail", r.msg);
  await simpleAlert(r.ok ? "✅ 指令已发送" : "❌ 指令失败", r.msg);
}

async function menuMonitor() {
  let acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未添加账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const cfg = getStore().cfg;
  const st = acc.state || {};
  const a = new Alert();
  a.title = "🔋 充电监控";
  a.message = `当前：${st.lastSoc != null ? st.lastSoc + "%" : "—"}${st.lastVoltage ? " · " + Number(st.lastVoltage).toFixed(1) + "V" : ""}\n方案A：组件刷新/运行脚本时自动检测（已启用）\n方案B：前台驻留监控（脚本保持打开）`;
  a.addAction("1️⃣ 立即检测一次");
  a.addAction(`2️⃣ 驻留监控（每${cfg.monitorIntervalMin}分×${cfg.monitorDurationMin}分）`);
  a.addAction(`3️⃣ 满电判断：${Number(cfg.voltageThreshold || 0) > 0 ? `电压≥${cfg.voltageThreshold}V` : "电量100%"}`);
  a.addAction(`4️⃣ 充满通知：${cfg.notifyFull ? "✅开" : "❌关"}`);
  a.addAction(`5️⃣ 低电量通知：${cfg.notifyLow ? "✅开" : "❌关"}（≤${cfg.lowThreshold}%）`);
  a.addAction("6️⃣ 后台定时教程（快捷指令）");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) {
    try {
      const r = await monitorOnce(acc);
      const b = r.battery;
      const hits = [];
      if (r.result.full) hits.push("已达满电条件");
      if (r.result.low) hits.push("低电量");
      const tail = hits.length ? `触发：${hits.join("、")}${(r.result.notifiedFull || r.result.notifiedLow) ? "（已通知）" : "（本次未通知）"}` : "未触发通知条件";
      await simpleAlert("🔋 检测完成", `${dispName(acc)}\n${b.chargeStateStr} · ${Number(b.soc || 0)}% · ${b.voltage ? b.voltage.toFixed(1) + "V" : "无电压数据"}\n${tail}`);
    } catch (e) { await simpleAlert("❌ 检测失败", friendlyErr(e)); }
  } else if (idx === 1) {
    const pa = new Alert();
    pa.title = "驻留监控设置";
    pa.message = "保持脚本前台运行期间，按间隔轮询充电状态并通知（充满 / 低电量）";
    pa.addTextField(`间隔分钟(默认${cfg.monitorIntervalMin})`, String(cfg.monitorIntervalMin));
    pa.addTextField(`持续分钟(默认${cfg.monitorDurationMin})`, String(cfg.monitorDurationMin));
    pa.addAction("开始监控");
    pa.addCancelAction("取消");
    if ((await pa.present()) === -1) return;
    const iv = Number(pa.textFieldValue(0)) || cfg.monitorIntervalMin;
    const dur = Number(pa.textFieldValue(1)) || cfg.monitorDurationMin;
    cfg.monitorIntervalMin = iv;
    cfg.monitorDurationMin = dur;
    saveStore(getStore());
    const res = await runForegroundMonitor(acc, { intervalMin: iv, durationMin: dur });
    const last = res.last ? `${res.last.battery.chargeStateStr} · ${Number(res.last.battery.soc || 0)}%` : "无数据";
    await simpleAlert("✅ 驻留监控结束", `共检测 ${res.ticks} 次 · 触发通知 ${res.notified} 次\n最后状态：${last}`);
  } else if (idx === 2) {
    const cur = Number(cfg.voltageThreshold || 0);
    const ma = new Alert();
    ma.title = "满电判断方式";
    ma.message = `当前：${cur > 0 ? `按电压 ≥ ${cur}V 通知` : "按电量 100% 通知"}\n\n· 未设置电压：电量到 100% 才通知\n· 设置了电压：电压达到所设伏数即通知（不再看百分比）`;
    ma.addAction("按电量100%通知（清除电压设置）");
    ma.addAction("按电压伏数通知…");
    ma.addCancelAction("取消");
    const mi = await ma.present();
    if (mi === 0) {
      cfg.voltageThreshold = 0;
      saveStore(getStore());
      await simpleAlert("✅ 已设置", "满电通知：电量达到 100% 时提醒");
    } else if (mi === 1) {
      const pa = new Alert();
      pa.title = "设置电压伏数";
      pa.message = "电压达到该数值即视为充满并通知（例如满电 84V）";
      pa.addTextField("电压(V)", String(cur > 0 ? cur : 84));
      pa.addAction("保存");
      pa.addCancelAction("取消");
      if ((await pa.present()) === -1) return;
      const v = Number(pa.textFieldValue(0));
      if (!isFinite(v) || v <= 0) { await simpleAlert("❌ 无效数值", "请输入大于0的数字，如 84"); return; }
      cfg.voltageThreshold = v;
      saveStore(getStore());
      await simpleAlert("✅ 已保存", `满电通知：电压 ≥ ${v}V 时提醒`);
    }
  } else if (idx === 3) {
    getStore().cfg.notifyFull = !getStore().cfg.notifyFull;
    saveStore(getStore());
    await simpleAlert("✅ 已更新", `充满通知：${getStore().cfg.notifyFull ? "开" : "关"}`);
  } else if (idx === 4) {
    const pa = new Alert();
    pa.title = "低电量通知";
    pa.message = `当前：${cfg.notifyLow ? "开" : "关"} · 阈值 ≤${cfg.lowThreshold}%\n修改阈值后自动开启；输入 0 表示关闭`;
    pa.addTextField("低电量阈值(%)", String(cfg.lowThreshold));
    pa.addAction("保存");
    pa.addCancelAction("取消");
    if ((await pa.present()) === -1) return;
    const v = Number(pa.textFieldValue(0));
    if (!isFinite(v) || v < 0) { await simpleAlert("❌ 无效数值", "请输入数字"); return; }
    if (v === 0) getStore().cfg.notifyLow = false;
    else { getStore().cfg.notifyLow = true; getStore().cfg.lowThreshold = v; }
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `低电量通知：${getStore().cfg.notifyLow ? "开（≤" + v + "%）" : "关"}`);
  } else if (idx === 5) {
    await simpleAlert("🕒 后台定时（快捷指令）", [
      "iOS 不允许脚本自行后台运行，用「快捷指令」自动化最接近后台定时：",
      "",
      "1. 打开「快捷指令」→ 自动化 → 新建个人自动化",
      "2. 触发条件：时间（如每小时）或「充电器」连接时",
      "3. 添加操作：打开 URL",
      "4. URL 填写：scriptable:///run/Scriptable?action=all&silent=1",
      "5. 关闭「运行前询问」并保存",
      "",
      "可选 action：all=全部签到；monitor=仅充电监控；checkin=单账号；supplement=补签",
      "silent=1 表示只发通知、不弹窗（适合无人值守）",
      "",
      "另外：桌面组件每次刷新也会自动检测充电状态（方案A）",
    ].join("\n"));
  }
}

async function menuVehicleDisplay() {
  const store = getStore();
  let acc = MENU_ACC || defaultOrFirstAccount(store);
  if (!acc) { await simpleAlert("提示", "尚未添加账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const veh = acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {};
  const defAcc = store.accounts.find((x) => x.id === store.cfg.defaultAccountId);
  const a = new Alert();
  a.title = "🚗 车辆与组件显示";
  a.message = `组件默认账号：${defAcc ? dispName(defAcc) : "未设置"}\n本账号当前车辆：${veh.name || "未选择"}${veh.licensePlate ? " · " + veh.licensePlate : ""}`;
  a.addAction("1️⃣ 选择 / 刷新车辆列表");
  a.addAction("2️⃣ 设为组件默认账号");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) {
    try {
      const r = await pickVehicleForAccount(acc.token, { title: "🚗 选择显示车辆" });
      acc.vehicles = r.vehicles;
      acc.activeVin = r.picked.vinNo;
      acc.state = acc.state || {};
      acc.state.vehicleName = r.picked.name;
      saveStore(getStore());
      await simpleAlert("✅ 已保存", `组件将显示：${r.picked.name}`);
    } catch (e) { await simpleAlert("❌ 失败", friendlyErr(e)); }
  } else if (idx === 1) {
    store.cfg.defaultAccountId = acc.id;
    saveStore(getStore());
    await simpleAlert("✅ 已设为默认", `组件将显示账号「${dispName(acc)}」的车辆\n如需指定账号/车辆，可在组件配置参数里填：acc=${acc.id}&vin=车架号`);
  }
}

async function menuAccounts() {
  const store = getStore();
  const a = new Alert();
  a.title = "👥 账号管理";
  a.message = store.accounts.length
    ? `共 ${store.accounts.length} 个账号：\n` + store.accounts.map((x, i) => `${i + 1}. ${dispName(x)}${x.id === store.cfg.defaultAccountId ? "（默认）" : ""}`).join("\n")
    : "尚未添加账号";
  a.addAction("➕ 手机号登录（免抓包）");
  a.addAction("🔑 粘贴 Token 添加");
  a.addAction("🗑 删除账号");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) { const r = await addAccountByPhone(); if (r) MENU_ACC = r; }
  else if (idx === 1) { const r = await addAccountByToken(); if (r) MENU_ACC = r; }
  else if (idx === 2) {
    if (!store.accounts.length) { await simpleAlert("提示", "暂无账号"); return; }
    const da = new Alert();
    da.title = "🗑 删除账号";
    da.message = "选择要删除的账号（不可恢复）";
    store.accounts.slice(0, 12).forEach((x) => da.addAction(dispName(x)));
    da.addCancelAction("取消");
    const di = await da.present();
    if (di === -1) return;
    const target = store.accounts[di];
    const c = new Alert();
    c.title = "⚠️ 确认删除";
    c.message = `确定删除「${dispName(target)}」？其 Token 与数据都会被移除`;
    c.addAction("确认删除");
    c.addCancelAction("取消");
    if ((await c.present()) !== 0) return;
    store.accounts = store.accounts.filter((x) => x.id !== target.id);
    delete UID_BY_TOKEN[cleanToken(target.token)];
    if (store.cfg.defaultAccountId === target.id) store.cfg.defaultAccountId = (store.accounts[0] && store.accounts[0].id) || "";
    if (MENU_ACC && MENU_ACC.id === target.id) MENU_ACC = null;
    saveStore(getStore());
    await simpleAlert("✅ 已删除", `${dispName(target)} 已移除`);
  }
}

async function menuPreview() {
  const a = new Alert();
  a.title = "📱 组件预览";
  a.message = "预览会先刷新一次数据（已签到/已发布会自动跳过）";
  a.addAction("小尺寸");
  a.addAction("中尺寸");
  a.addAction("大尺寸");
  a.addAction("锁屏圆形");
  a.addAction("锁屏长方形");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  const fams = ["small", "medium", "large", "accessoryCircular", "accessoryRectangular"];
  await previewWidget(fams[idx]);
}

async function previewWidget(family) {
  const store = getStore();
  applyStoreConfig(store);
  let acc = MENU_ACC || defaultOrFirstAccount(store);
  if (!acc) { await simpleAlert("提示", "尚未添加账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const vin = (getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
  if (!vin) { await simpleAlert("提示", "请先在「车辆与组件显示」里选择车辆"); return; }
  setCurrentAcc(acc);
  const dash = await runSinglePipeline(acc, vin, { isWidget: false });
  if (!dash) return;
  const w = await buildWidgetForFamily(dash.data, dash.batteryInfo, dash.chargeStateStr, family);
  try {
    if (family === "small") await w.presentSmall();
    else if (family === "large") await w.presentLarge();
    else if (family === "accessoryCircular") await w.presentAccessoryCircular();
    else if (family === "accessoryRectangular") await w.presentAccessoryRectangular();
    else await w.presentMedium();
  } catch (e) {
    await w.presentMedium();
  }
}

async function menuExportImport() {
  const a = new Alert();
  a.title = "💾 配置导出 / 导入";
  a.message = "导出包含所有账号 Token、车辆与设置，请妥善保管";
  a.addAction("1️⃣ 导出到剪贴板");
  a.addAction("2️⃣ 导出为文件（分享）");
  a.addAction("3️⃣ 从剪贴板导入（覆盖）");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) await doExportClipboard();
  else if (idx === 1) await doExportFile();
  else if (idx === 2) await doImportClipboard();
}

async function menuSettings() {
  const cfg = getStore().cfg;
  const a = new Alert();
  a.title = "⚙️ 设置";
  a.message = `自动发布：${cfg.autoPost ? "开" : "关"} · 内容「${cfg.postContent}」\n自动补签：${cfg.autoSupplement ? "开" : "关"} · 每次最多${cfg.supplementMaxPerRun}天\n并发数：${cfg.concurrency} · 满电判断：${Number(cfg.voltageThreshold || 0) > 0 ? `电压≥${cfg.voltageThreshold}V` : "电量100%"}`;
  a.addAction(`1️⃣ 自动发布：${cfg.autoPost ? "✅开（点按关闭）" : "❌关（点按开启）"}`);
  a.addAction("2️⃣ 修改发布内容");
  a.addAction(`3️⃣ 自动补签：${cfg.autoSupplement ? "✅开（点按关闭）" : "❌关（点按开启）"}`);
  a.addAction(`4️⃣ 并发数：${cfg.concurrency}`);
  a.addAction("5️⃣ 控车 AES 密钥");
  a.addAction("6️⃣ 重置车控风险确认");
  a.addAction("7️⃣ 🗑 清空所有数据");
  a.addAction("8️⃣ 关于 / 使用说明");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) {
    cfg.autoPost = !cfg.autoPost;
    saveStore(getStore());
    await simpleAlert("✅ 已更新", `自动发布：${cfg.autoPost ? "开" : "关"}`);
  } else if (idx === 1) {
    const pa = new Alert();
    pa.title = "发布内容";
    pa.message = "每天自动发布并删除的动态内容";
    pa.addTextField("内容", cfg.postContent);
    pa.addAction("保存");
    pa.addCancelAction("取消");
    if ((await pa.present()) === -1) return;
    const v = pa.textFieldValue(0).trim();
    if (!v) { await simpleAlert("❌ 不能为空", "请填写内容"); return; }
    cfg.postContent = v;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `发布内容：${v}`);
  } else if (idx === 2) {
    cfg.autoSupplement = !cfg.autoSupplement;
    saveStore(getStore());
    await simpleAlert("✅ 已更新", `自动补签：${cfg.autoSupplement ? "开" : "关"}`);
  } else if (idx === 3) {
    const pa = new Alert();
    pa.title = "并发数";
    pa.message = "多账号并发签到的同时请求数（建议 2~3，过高可能触发风控）";
    pa.addTextField("并发数(1~5)", String(cfg.concurrency));
    pa.addAction("保存");
    pa.addCancelAction("取消");
    if ((await pa.present()) === -1) return;
    const v = Math.max(1, Math.min(5, Number(pa.textFieldValue(0)) || 3));
    cfg.concurrency = v;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `并发数：${v}`);
  } else if (idx === 4) {
    const pa = new Alert();
    pa.title = "云端控车 AES 密钥";
    pa.message = "32位十六进制字符串，用于开/关锁加密（已内置默认密钥）";
    pa.addTextField("AES Key", cfg.aesKey);
    pa.addAction("保存");
    pa.addCancelAction("取消");
    if ((await pa.present()) === -1) return;
    const v = pa.textFieldValue(0).trim();
    if (!/^[0-9a-fA-F]{32}$/.test(v)) { await simpleAlert("❌ 格式错误", "需为32位十六进制字符"); return; }
    cfg.aesKey = v;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", "密钥已更新");
  } else if (idx === 5) {
    cfg.vehicleRiskAck = false;
    saveStore(getStore());
    await simpleAlert("✅ 已重置", "下次使用车控会重新弹出风险确认");
  } else if (idx === 6) {
    const c = new Alert();
    c.title = "⚠️ 危险操作";
    c.message = "将删除所有账号、Token、签到记录与配置，且不可恢复。确定继续？";
    c.addAction("我确定清空");
    c.addCancelAction("取消");
    if ((await c.present()) !== 0) return;
    try { if (FM.fileExists(STORE_FILE)) FM.remove(STORE_FILE); } catch { }
    try { if (FM.fileExists(STATE_FILE)) FM.remove(STATE_FILE); } catch { }
    STORE = null;
    CURRENT_ACC = null;
    MENU_ACC = null;
    for (const k of Object.keys(UID_BY_TOKEN)) delete UID_BY_TOKEN[k];
    getStore();
    applyStoreConfig(getStore());
    await simpleAlert("✅ 已清空", "所有数据已清除，请重新添加账号");
  } else if (idx === 7) {
    await simpleAlert("ℹ️ 关于", [
      "ZEEHO 极核助手 · Scriptable 多账号版",
      "",
      "· 自动签到 / 盲盒 / 补签 / 发布动态（发布→点赞→分享→领分→删除）",
      "· 多账号并发签到（错峰并发池）",
      "· 车辆控制：寻车 / 鸣笛 / 坐垫 / 云端开关锁",
      "· 充电监控：充满(100%或电压阈值) / 低电量 通知",
      "· 多尺寸组件：小 / 中 / 大 / 锁屏圆形 / 锁屏长方形",
      "· 停车地址、电压、胎压、骑行数据展示",
      "",
      "组件参数示例：acc=账号ID&vin=车架号（组件配置 Parameter 里填写）",
      "快捷指令：scriptable:///run/Scriptable?action=all&silent=1",
    ].join("\n"));
  }
}

// ============== 快捷指令 / 后台定时 直接动作 ==============
async function runDirectAction(action) {
  const silent = (getParam("silent") || "") === "1";
  const store = getStore();
  applyStoreConfig(store);
  const acc = defaultOrFirstAccount(store);

  if (action === "all" || action === "signin-all") {
    if (!store.accounts.filter((a) => a.token).length) {
      if (!silent) await simpleAlert("提示", "尚未添加账号，请先在 Scriptable 内运行脚本添加");
      Script.complete();
      return;
    }
    const batch = await runBatchSignin(store.accounts);
    const summary = `⏱ ${Math.round(batch.ms / 1000)}s · ${batch.count}个账号\n${batchSummaryLines(batch)}`;
    await notifySimple("🏍️ ZEEHO 批量签到完成", summary.replace(/\n/g, " ").slice(0, 200));
    if (!silent) await simpleAlert("✅ 批量签到完成", summary);
    Script.complete();
    return;
  }

  if (!acc || !acc.token) {
    if (!silent) await simpleAlert("提示", "尚未添加账号，请先在 Scriptable 内运行脚本添加");
    Script.complete();
    return;
  }
  setCurrentAcc(acc);

  if (action === "checkin") {
    const r = await runAccountFlow(acc);
    const line = batchSummaryLines({ results: [r] });
    await notifySimple("🏍️ ZEEHO 签到", line.replace(/\n/g, " ").slice(0, 200));
    if (!silent) await simpleAlert("✅ 签到完成", line);
  } else if (action === "monitor") {
    try {
      const r = await monitorOnce(acc);
      const b = r.battery;
      const line = `${dispName(acc)}｜${b.chargeStateStr} · ${Number(b.soc || 0)}%${b.voltage ? " · " + b.voltage.toFixed(1) + "V" : ""}`;
      logStep("充电监控", "ok", line);
      if (r.result && (r.result.notifiedFull || r.result.notifiedLow)) { /* 已在检测中通知 */ }
      if (!silent) await simpleAlert("🔋 监控结果", line);
    } catch (e) {
      if (!silent) await simpleAlert("❌ 监控失败", String(e?.message || e));
    }
  } else if (action === "supplement") {
    const r = await runSupplementFlow(acc);
    const line = r.found === 0 ? "无漏签" : (r.used > 0 ? `已补签 ${r.used} 天（漏${r.found}天）` : `漏${r.found}天：${r.msg || "未补"}`);
    if (!silent) await simpleAlert("📅 补签结果", line);
  } else {
    logStep("未知action", "warn", action);
    if (!silent) await simpleAlert("提示", `未知的 action 参数：${action}\n支持：all / checkin / monitor / supplement`);
  }
  Script.complete();
}

// ============== 主流程（路由） ===============
async function main() {
  logStep("ZEEHO 极核助手", "start");
  logDebug("DEBUG_MODE", DEBUG_MODE);

  let store = getStore();
  applyStoreConfig(store);

  // 组件运行判定双保险：某些组件预览/快照场景 runsInWidget 可能为 false，但 widgetFamily 有值
  const isWidget = !!config.runsInWidget || !!config.widgetFamily;

  if (FORCE_RESET) {
    logStep("强制重置", "info", "清除所有保存数据");
    try { if (FM.fileExists(STORE_FILE)) FM.remove(STORE_FILE); } catch { }
    try { if (FM.fileExists(STATE_FILE)) FM.remove(STATE_FILE); } catch { }
    STORE = null;
    store = getStore();
    applyStoreConfig(store);
  }
  const doReset = (getParam("reset") || "").trim() === "1" && !isWidget;
  if (doReset) {
    logStep("参数重置", "info", "reset=1");
    try { if (FM.fileExists(STORE_FILE)) FM.remove(STORE_FILE); } catch { }
    try { if (FM.fileExists(STATE_FILE)) FM.remove(STATE_FILE); } catch { }
    STORE = null;
    store = getStore();
    applyStoreConfig(store);
  }
  logDebug("启动参数", __PARAMS);

  // 兼容旧用法：URL/参数里带 token=xxx 时，更新默认账号的 Token（无账号则走添加流程）
  const pToken = cleanToken(getParam("token") || "");
  if (pToken) {
    const accT = defaultOrFirstAccount(getStore());
    if (accT) {
      accT.token = pToken;
      registerUid(accT);
      saveStore(getStore());
      logStep("更新Token", "ok", dispName(accT));
    } else if (!isWidget) {
      try {
        registerUid({ token: pToken, userId: "", state: {} });
        const info = await fetchUserIdByToken(pToken);
        registerUid({ token: pToken, userId: info.userId, state: { userId: info.userId } });
        const picked = await pickVehicleForAccount(pToken, { title: "🚗 选择默认车辆" });
        const acc2 = await finalizeAccount({ token: pToken, userId: info.userId, userName: info.nick, phone: "", picked: picked.picked, vehicles: picked.vehicles });
        await simpleAlert("✅ 添加成功", `${dispName(acc2)} · 默认车辆 ${picked.picked.name}`);
      } catch (e) {
        await simpleAlert("❌ 添加失败", String(e?.message || e));
      }
    }
  }

  const action = (getParam("action") || "").trim().toLowerCase();

  // ===== 非组件运行：action 直连 或 交互菜单 =====
  if (!isWidget) {
    if (action) { await runDirectAction(action); return; }
    if (!store.accounts.length) await addAccountWizard();
    // 有账号但都没有Token（常见于粘贴新脚本覆盖了旧Token）：先引导设置Token
    if (getStore().accounts.length && !getStore().accounts.some((a) => a.token)) {
      const t = defaultOrFirstAccount(getStore());
      if (t && !(await ensureAccountReady(t))) { /* 用户取消则继续进菜单 */ }
    }
    if (!getStore().accounts.length) {
      const a = new Alert();
      a.title = "👋 欢迎使用 ZEEHO 极核助手";
      a.message = "尚未添加账号。\n\n· 手机号登录：免抓包，短信验证码即可\n· 粘贴Token：从 App 抓包获取 Authorization\n\n添加后桌面组件会自动显示车辆状态。";
      a.addAction("知道了");
      await a.present();
      Script.complete();
      return;
    }
    await showMainMenu();
    Script.complete();
    return;
  }

  // ===== 组件运行（外层兜底：任何异常都必须 setWidget，避免出现 "Call Script.setWidget()"） =====
  try {
    const acc = pickAccountForWidget(store);
    if (!acc || !acc.token) {
      Script.setWidget(buildFallbackWidget("🔑 需要配置", acc
        ? "账号缺少Token：请在 Scriptable 内运行脚本，菜单会自动引导设置"
        : "请在 Scriptable 内运行脚本，添加账号后即可显示"));
      Script.complete();
      return;
    }
    setCurrentAcc(acc);
    const vinNo = (getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
    if (!vinNo) {
      Script.setWidget(buildFallbackWidget("🚗 未选择车辆", "请在 Scriptable 内运行脚本，选择要显示的车辆"));
      Script.complete();
      return;
    }

    try {
      const dash = await runSinglePipeline(acc, vinNo, { isWidget: true });
      if (!dash) { Script.setWidget(buildFallbackWidget()); Script.complete(); return; }
      const widget = await buildWidgetForFamily(dash.data, dash.batteryInfo, dash.chargeStateStr, config.widgetFamily || "medium");
      try {
        const refreshMin = Number(getStore().cfg.refreshMin || 15);
        widget.refreshAfterDate = new Date(Date.now() + refreshMin * 60 * 1000);
      } catch { }
      Script.setWidget(widget);
      logStep("ZEEHO 极核助手", "ok", `充电: ${dash.chargeStateStr}`);
      Script.complete();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg === "TOKEN_EXPIRED") { await handleTokenExpiredInMain(true); return; }
      logStep("运行失败", "fail", msg);
      Script.setWidget(buildFallbackWidget("⚠️ 运行失败", msg.slice(0, 60)));
      Script.complete();
    }
  } catch (e2) {
    console.error("[组件异常]", (e2 && (e2.stack || e2.message)) || e2);
    try { Script.setWidget(buildFallbackWidget("⚠️ 组件异常", String(e2?.message || e2).slice(0, 60))); } catch (_) { }
    Script.complete();
  }
}

main();