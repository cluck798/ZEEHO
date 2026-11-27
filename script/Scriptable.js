// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: sf:wand.and.stars;
// ============= 极核 ZEEHO · Scriptable（单账号版 v2.7.1） =============
// 单账号：只维护一个账号，菜单内可随时「手机号登录 / 粘贴 Token」重设
// 功能全集：自动签到 / 盲盒 / 补签 / 发布动态 · 车辆控制 · 充电监控 · 小组件（小 / 中 / 大 + 锁屏圆形 / 长方形）
// v2.7.1：🧩 组件必定渲染——Token 过期/异常/慢网络时也 setWidget，修复组件报 "Call Script.setWidget() to set the content of the widget."
// v2.7：⌨️ 适配 Scriptable 1.8.3——Alert.textFieldValue 失效，统一改用 readTextField（WebView 输入兜底），修复手机号/验证码/Token 无法输入
// 相对 v2.4 另含：🎨 组件新版式（中尺寸 V6 / 大尺寸 V4 / 锁屏）、自定义车辆图片、组件背景图、组件签到时段控制

const BASE = "https://tapi.zeehoev.com";
const H5_BASE = "https://h5.zeehoev.com";

// ========== 🔑 Token（单账号版说明） ==========
// 单账号：Token 保存在 zeeho_accounts.json（只含一个账号），首次运行会弹菜单引导设置。
// 此处仅作为「旧版数据迁移」的兜底：从旧版升级粘贴新脚本会清空这里。
// 推荐"手机号登录"（免抓包），也可在菜单 →「账号 / Token」里粘贴 Token。
// 💡 从 v1.1（旧单账号版）升级：Token 未随脚本携带，首次运行按弹窗重设一次即可。
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
const POST_CONTENT = "极核牛B"; // 每天发布的动态内容（默认值）
const ENABLE_AUTO_POST = true; // 是否启用自动发布动态（默认值）

// ========== 🧩 全局默认配置（保存后可在 App 菜单中修改） ==========
const DEFAULT_CFG = {
  autoPost: ENABLE_AUTO_POST,
  postContent: POST_CONTENT,
  autoSupplement: true,      // 自动补签（只消耗已有补签卡，不自动花积分兑换）
  supplementMaxPerRun: 3,    // 每次最多补签天数
  widgetSignStartMin: 480,   // 组件自动签到开始时间（当天分钟数，480=08:00；之前不自动签，设置菜单可改）
  voltageThreshold: 0,       // 电压满电阈值（伏）：0=未设置（按电量100%通知）；填写伏数则按电压通知
  notifyFull: true,          // 充满通知（电量100% 或 电压≥阈值）
  notifyLow: true,           // 低电量通知
  lowThreshold: 20,          // 低电量阈值（%）
  voltageSim: false,         // ⚡电压模拟电量（v1.4）：车辆不上报百分比时按电压估算（开启后停用满电判断/充满提醒）
  vEmpty: 0,                 // 空电电压（V）：如 63（需先设置才能开启电压模拟）
  vFull: 0,                  // 满电电压（V）：如 84
  batteryAh: 0,              // 电池容量（Ah）：如 28（用于估算剩余可用电量）
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
// v1.3：H5 通道密钥轮换（服务端换发；旧 appId 一律 430 permit error）
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
  // v2.7：兼容剪贴板来源的 Token 杂质——剥离 Authorization:/Bearer 前缀、首尾引号与全部空白换行（JWT 串内无空白）
  let t = String(token || "");
  t = t.replace(/^Authorization\s*:?\s*/i, "");
  t = t.replace(/^[bB]earer\s+/i, "");
  t = t.replace(/^["'`]+|["'`]+$/g, "");
  t = t.replace(/\s+/g, "");
  return t;
}

// v2.7 WebView 网页输入（新版 Scriptable 的 Alert.textFieldValue 失效时的现场输入兜底）：
// 打开内嵌网页 textarea，用户打字/粘贴/编辑后点左上角「完成」关闭，脚本读回输入值（与 Alert 独立，不受其 bug 影响）
async function webViewPrompt(title, initial = "", placeholder = "", hint = "") {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:-apple-system;padding:16px;background:#f2f2f7;margin:0}h3{margin:0 0 10px;font-size:17px}textarea{width:100%;height:38vh;font-size:16px;padding:10px;border-radius:8px;border:1px solid #ccc;box-sizing:border-box;-webkit-user-select:text}.tip{color:#666;font-size:13px;margin-top:8px}button{margin-top:12px;width:100%;padding:12px;font-size:16px;background:#2C76F2;color:#fff;border:none;border-radius:8px}</style></head><body><h3>${esc(title)}</h3>${hint ? `<div class="tip" style="margin-bottom:8px">${esc(hint)}</div>` : ""}<textarea id="t" placeholder="${esc(placeholder)}">${esc(initial)}</textarea><div style="display:flex;gap:10px;margin-top:12px"><button style="flex:1;margin:0" onclick="document.getElementById('tip').style.display='block'">✅ 记住内容</button><button style="flex:1;margin:0;background:#8e8e93" onclick="document.getElementById('t').value='';document.getElementById('t').focus()">🗑 清空重填</button></div><div id="tip" class="tip" style="display:none">已记录，点左上角「完成」关闭本页返回脚本</div></body></html>`;
  const wv = new WebView();
  await wv.loadHTML(html);
  await wv.present(false);
  try {
    const v = await wv.evaluateJavaScript("String(document.getElementById('t').value || '')");
    return String(v || "").trim();
  } catch (e) { return ""; }
}

// v2.7c 输入（单页化 + 智能直达）：说明、剪贴板预填、输入框合并进一个 WebView 页面，点菜单后直接弹输入页
// clipboard:true 场景自动预填剪贴板内容（Token/验证码/手机号/URL 等“刚复制好”的内容）；
// smartToken:true 场景检测到剪贴板像 Token 时直接弹确认窗（连输入页都省了）；
// 编辑型场景预填 initial（当前值）；textarea 支持现场打字 / 长按粘贴 / 清空重填
function looksLikeToken(s) {
  const t = String(s || "").replace(/\s+/g, "");
  if (!t) return false;
  if (/^eyJ[A-Za-z0-9_-]{20,}\./.test(t)) return true; // JWT 形态
  return t.length >= 80;                               // 长随机串形态
}
async function readTextField(alert, idx, opts = {}) {
  let clip = "";
  try { clip = String(Pasteboard.paste() || "").trim(); } catch (e) { clip = ""; }
  // B2 智能直达：Token 场景且剪贴板内容像 Token → 一步确认，无需打开输入页
  if (opts.smartToken && clip && looksLikeToken(clip)) {
    const a = new Alert();
    a.title = "🔑 检测到剪贴板 Token";
    a.message = `长度 ${clip.replace(/\s+/g, "").length} · 开头 ${clip.replace(/\s+/g, "").substring(0, 12)}…\n\n是否直接使用？`;
    a.addAction("✅ 直接使用");
    a.addAction("⌨️ 打开输入页查看/修改");
    a.addCancelAction("取消");
    const r = await a.present();
    if (r === 0) return clip;
    if (r === -1) return "";
  }
  // 单页输入：编辑型场景预填当前值；复制型场景自动预填剪贴板
  let prefill = String(opts.initial || "");
  const clipFilled = !prefill && opts.clipboard && clip;
  if (clipFilled) prefill = clip;
  const hint2 = (opts.hint ? opts.hint + "\n\n" : "") +
    (clipFilled ? "💡 已自动填入剪贴板内容，确认无误点左上角「完成」；不对可打字或长按输入框修改\n" : "");
  try {
    return await webViewPrompt(opts.title || "请输入内容", prefill, opts.placeholder || "", hint2);
  } catch (e) { return ""; }
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

// ============= 持久化（账号 + 全局配置） ===============
const FM = FileManager.local();
const STATE_FILE = FM.joinPath(FM.documentsDirectory(), "zeeho_signin.json"); // 旧版单账号状态（仅迁移/兼容用）
const STORE_FILE = FM.joinPath(FM.documentsDirectory(), "zeeho_accounts.json"); // 账号 + 全局配置

const UID_BY_TOKEN = {}; // token → userId（请求头 user_id 的来源）
let STORE = null;        // 账号数据（内存缓存）
let CFG = null;          // 全局配置快捷引用（= STORE.cfg）
let CURRENT_ACC = null;  // 当前账号（内存上下文）

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

// 写回当前账号状态（部分路径使用显式 persist 回调，避免依赖全局上下文）
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

// ============== 单账号约束 ==============
// 本脚本为单账号版：任何时刻只保留一个账号（默认账号优先，其次第一个有Token的账号）
function enforceSingleAccount(store) {
  if (!store.accounts || store.accounts.length <= 1) return store;
  const keep = store.accounts.find((a) => a.id === store.cfg.defaultAccountId)
    || store.accounts.find((a) => a.token)
    || store.accounts[0];
  const dropped = store.accounts.filter((a) => a !== keep);
  store.accounts = [keep];
  store.cfg.defaultAccountId = keep.id;
  for (const a of dropped) delete UID_BY_TOKEN[cleanToken(a.token)];
  if (CURRENT_ACC && dropped.indexOf(CURRENT_ACC) >= 0) CURRENT_ACC = null;
  MENU_ACC = null;
  saveStore(store);
  logStep("单账号模式", "info", `仅保留「${dispName(keep)}」，已移除 ${dropped.length} 个多余账号`);
  return store;
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
  enforceSingleAccount(store);
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

  // 每次请求一套随机设备指纹：UA / x-app-info 与官方 App 同格式，避免固定指纹被风控判为脚本
  const deviceUA = randomDeviceUA();
  req.headers = useV2
    ? {
        "content-type": "application/json",
        "appid": APP_CONFIG.app.appId,
        "authorization": `Bearer ${cleanToken(token)}`,
        "accept": "*/*",
        "accept-language": "zh-CN",
        "user-agent": deviceUA,
        "interfaceversion": "2",
        "x-app-info": deviceUA,
        ...signHeaders,
      }
    : {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
        "interfaceversion": "2",
        "user-agent": deviceUA,
        "x-app-info": deviceUA,
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

// ========== Token过期处理（更新当前账号的Token） ==========
async function handleTokenExpired() {
  // 组件场景（含组件预览：runsInWidget 可能为 false，但 widgetFamily 有值）不能弹输入框
  if (config.runsInWidget || config.widgetFamily) return false;
  
  logDebug("Token过期", "显示更新弹窗");
  const acc = CURRENT_ACC || pickAccountForWidget(getStore());
  
  const newToken = cleanToken(await readTextField(null, 0, {
    title: "🔑 Token已过期 · 更新Token",
    smartToken: true,
    clipboard: true,
    hint: `账号「${acc ? dispName(acc) : "默认"}」的Token已过期。\n获取：打开ZEEHO App → 抓包获取 Authorization 头 → 复制 Token 内容后打开本页\n也可在菜单→账号 / Token 里用「手机号登录」免抓包更新`,
  }));
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
    await saveTokenToScript(newToken);
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
  return await safeRequest(requestWithSign, 'app', "GET", url, { uniqueIdentify, phoneDeviceName: "ios_" + uniqueIdentify }, "", token, "vehicleHomePage");
}

// v2.1 设备标识（与面板 repo getDeviceIdentify 同算法：userId 派生 16 位 hex）
function getDeviceIdentify(acc) {
  const seed = String((acc && (acc.userId || acc.vinNo)) || "zeeho-device");
  let h = 0; for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
  return (Math.abs(h).toString(16) + "0000000000000000").slice(0, 16);
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

// v2.4 修正：官方开盒实为 GET /H5/signin/lottery?boxType=0（2026-10-24 真实开盒日实测成功；
// 旧 POST ?dateTime= 恒 40000——v1.6 当时在非开盒日探测，NO_LOTTERY 被误判为「形态不识别」）
async function fetchSigninLottery({ token }) {
  const url = joinUrl(H5_BASE, API.signinLottery);
  return await safeRequest(requestWithSign, 'h5', "GET", url, { boxType: "0" }, null, token, "signinLottery");
}

// ========== 获取电池信息（充电状态 + 电压/电流/温度 + 耗电统计） ==========
// ⚡电压模拟电量（v1.4）：车辆不上报 soc 时按 (电压−空电电压)/(满电电压−空电电压) 线性估算
function estimateSocByVoltage(voltage, cfg) {
  const vFull = Number(cfg?.vFull || 0);
  const vEmpty = Number(cfg?.vEmpty || 0);
  if (!cfg?.voltageSim || !(vFull > vEmpty) || !(Number(voltage) > 0)) return { soc: 0, estimated: false };
  const ratio = (Number(voltage) - vEmpty) / (vFull - vEmpty);
  return { soc: Math.max(0, Math.min(100, Math.round(ratio * 100))), estimated: true };
}
async function fetchBatteryInfo({ vinNo, token }) {
  const url = joinUrl(BASE, API.batteryInfo(vinNo));
  const result = await safeRequest(requestWithSign, 'app', "GET", url, {}, "", token, "batteryInfo");
  const d = result?.data || {};
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const voltage = num(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || d.batVoltage || d.batteryVol);
  const current = num(d.current || d.batteryCurrent || d.bmsCurrent || d.batteryCur);
  const temp = num(d.batteryTemp || d.batTemp || d.bmsTemp || d.batteryTemperature || d.temperature);
  // v2.1 修正：batteryLevel 恒为 "100"（电池健康/在位标志，非电量！），真值优先 soc→bmssoc，batteryLevel 仅最后兜底
  let soc = num(d.soc || d.bmssoc || 0);
  let socEstimated = false;
  if (soc <= 0) {
    const est = estimateSocByVoltage(voltage, getStore().cfg);
    if (est.estimated) { soc = est.soc; socEstimated = true; }
  }
  return {
    chargeStateStr: String(d.chargeStateStr || d.chargeState || "未充电"),
    voltage: voltage > 0 ? voltage : 0,
    current: current,
    batteryTemp: temp,
    soc: soc,
    socEstimated: socEstimated,
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

// ========== 领取分享积分接口（带每日检查；支持传入账号状态） ==========
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

// ========== 自动发布动态流程（persist 显式传入，避免依赖全局上下文） ==========
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
// ============= 随机设备指纹 =============
// 背景：服务端风控会按"设备"标记脚本客户端——固定设备标识一旦被标记，写操作会持续返回
// 430 {"code":"31001","message":"非法的请求"}（换设备即可恢复）。因此每次请求随机生成一套
// 真实设备指纹（UA 格式与官方 App 一致），避免固定指纹被风控拉黑。
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
  const deviceUA = randomDeviceUA();
  const h = {
    "content-type": "application/json",
    "appid": APP_CONFIG.app.appId,
    "authorization": `Bearer ${cleanToken(acc.token)}`,
    "accept": "*/*",
    "accept-language": "zh-CN",
    "user-agent": deviceUA,
    "interfaceversion": "2",
    "x-app-info": deviceUA,
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

  // ===== 签到日历（参照 zeeho fetchMonthSummary：合并整月每日明细 createDate/signStatue）=====
  // signStatue：3=已签、4=漏签、2=今天待签、0=盲盒开启日；用于近7天日历与「本月已签」统计
  const dayMap = {};
  const collectDays = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const it of arr) {
      if (it && it.createDate) {
        dayMap[String(it.createDate).replace(/\./g, "-").slice(0, 10)] = Number(it.signStatue);
      }
    }
  };
  collectDays(d.beforeSignDetailVos);
  collectDays(d.nowSignDetailVos);
  const monthPrefix = todayKey.slice(0, 7); // YYYY-MM
  let monthSignedDays = 0;
  for (const k of Object.keys(dayMap)) {
    if (k.indexOf(monthPrefix) === 0 && dayMap[k] === 3) monthSignedDays++;
  }
  const last7Status = [];
  const base7 = new Date();
  base7.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(base7.getTime());
    dt.setDate(dt.getDate() - i);
    const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
    const st = dayMap[key];
    last7Status.push((st === undefined || st === null || !isFinite(st)) ? 0 : st);
  }

  return {
    todayScore,
    monthSignedDays,
    last7Status,
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
  // ⚡电压模拟电量（v1.4）：车辆不上报百分比时按电压估算（组件显示"（估）"）
  let batteryPercent = Math.max(0, Math.min(100, isFinite(soc) ? soc : 0));
  let batteryPercentEstimated = false;
  if (batteryPercent <= 0) {
    const est = estimateSocByVoltage(isFinite(voltage) ? voltage : 0, getStore().cfg);
    if (est.estimated) { batteryPercent = est.soc; batteryPercentEstimated = true; }
  }
  return {
    batteryPercent,
    batteryPercentEstimated,
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

// ⏱充电剩余时间（v1.5）：充电中且已设容量时估算；未设置/未充电返回 null（不显示）
function estimateChargeRemainMin(b, cfg) {
  const ah = Number(cfg?.batteryAh || 0);
  const soc = Number(b?.soc || 0);
  const cur = Number(b?.current || 0);
  if (!(ah > 0) || !(cur > 0.5) || !(soc > 0) || !(soc < 100)) return null;
  const charging = !!b && !!b.chargeStateStr && b.chargeStateStr !== "未充电";
  if (!charging) return null;
  return Math.max(1, Math.round(ah * (100 - soc) / 100 / cur * 60));
}
function fmtRemainMin(min) {
  const hh = Math.floor(min / 60), mm = min % 60;
  return (hh > 0 ? hh + " 时 " : "") + mm + " 分";
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
    // ⚡电压模拟开启：电压估算的"充满"不可靠 → 停用充满判断/通知（低电提醒保留，按估算%生效）
    const isFull = !cfg.voltageSim && (voltMode ? (volt > 0 && volt >= voltThr) : soc >= 100);
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
        notifySimple("⚠️ 电量偏低", `${name} 当前${soc}%${b.socEstimated ? "（估算）" : ""}，续航 ${b.residualRangeKm || 0}km，记得充电`);
        st.lastLowNotifyDate = today;
        res.notifiedLow = true;
        saveStore(getStore());
      }
    }

    st.lastMonitorAt = now;
    st.lastSoc = soc;
    st.lastSocEstimated = !!b?.socEstimated;
    st.lastVoltage = volt;
    st.lastRemainMin = estimateChargeRemainMin(b, cfg);
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

// ========== 盲盒抽取（组件流水线与菜单流程共用） ==========
async function tryBlindBox({ token, state, cont, isBlindDay, today, persist }) {
  if (!isBlindDay) return { skipped: true, reason: `非盲盒日(剩${calcDaysUntilLottery(cont)}天)` };
  if (String(state.lastBlindBoxDate || "") === today) return { skipped: true, reason: "今日已抽" };
  logStep("盲盒", "start");
  try {
    const res = await fetchSigninLottery({ token }).catch(() => null);
    const code = String(res?.code || "");
    const ok = code === "10000" || res?.success === true;
    if (ok) {
      const d = (res?.data && res.data.signPrizesVO) || res?.data || {};
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
    if (code === "ALREADY_LOTTERY") {
      state.lastBlindBoxDate = today;
      if (persist) persist(state);
      logStep("盲盒", "ok", "今日已开过");
      return { ok: false, already: true };
    }
    if (code === "NO_LOTTERY") {
      logStep("盲盒", "skip", "今日无可用盲盒");
      return { ok: false, msg: "今日无可用盲盒" };
    }
    const msg = String(res?.message || "");
    if (/已领|已抽|重复|30121/i.test(msg)) {
      state.lastBlindBoxDate = today;
      if (persist) persist(state);
    }
    logStep("盲盒", "fail", msg || "请求失败（可能Token过期或网络异常，可到 6️⃣ 账号 / Token 检查）");
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

// ========== 完整签到流程（菜单一键 / action=checkin 使用，不依赖全局上下文） ==========
async function runAccountFlow(acc) {
  const persist = () => saveStore(getStore());
  const out = { id: acc.id, name: dispName(acc), signed: null, signSkip: false, signScore: 0, blind: "", supplement: "", post: "", points: null, error: "" };
  if (!acc.token) { out.error = "缺少Token（到 6️⃣ 账号 / Token 设置）"; return out; }
  setCurrentAcc(null); // 不依赖全局账号上下文
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
      // 「一键签到」同样遵守设定的签到开始时间（设置 → 4️⃣）；未到时间跳过签到，发布随之顺延
      if (!signTimeGateOk()) {
        out.signed = false;
        out.signTimeSkip = widgetSignStartHHMM();
      } else {
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

    if (getStore().cfg.autoPost && !state.userId) {
      try {
        const uidInfo = await fetchUserIdByToken(acc.token);
        if (uidInfo && uidInfo.userId) {
          state.userId = String(uidInfo.userId);
          persist();
          out.postReason = "userId 缺失，已通过 baseInfo 接口补拉成功";
        } else {
          out.postReason = "userId 缺失，baseInfo 未返回 id（原始响应: " + JSON.stringify((uidInfo && uidInfo.raw) || {}).slice(0, 150) + "）";
        }
      } catch (e) {
        out.postReason = "userId 缺失，补拉异常: " + String(e?.message || e);
      }
    }

    // 发布联动：今天确认已签（服务端已签 或 本次签到成功）才发布，避免「已发帖未签到」
    if (getStore().cfg.autoPost && state.userId && (alreadySigned || out.signed)) {
      try {
        const pr = await autoPublishArticle(acc.token, state, persist);
        out.post = pr && pr.skipped ? "skip" : pr && pr.ok ? "ok" : "fail";
        if (out.post === "fail") out.postReason = "发布失败: " + String((pr && pr.msg) || "未知");
      } catch (e) {
        const m = String(e?.message || e);
        if (m === "TOKEN_EXPIRED") { out.error = out.error || "Token过期"; out.postReason = "Token 过期，发布中断"; }
        else { logDebug("发布异常", m); out.postReason = "发布异常: " + m; }
      }
    } else if (getStore().cfg.autoPost && state.userId) {
      out.postReason = "今日尚未签到（或未到签到时间），发布顺延至签到成功后";
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
    out.error = out.error || (m === "TOKEN_EXPIRED" ? "Token过期（到 6️⃣ 账号 / Token 更新）" : m);
  }
  // producer 标记：App 链路（一键签到/主流程）刚完整跑过，组件计划器 10 分钟内不重复签到
  try { state.producerAt = Date.now(); } catch (_) { }
  persist();
  return out;
}

function batchSummaryLines(batch) {
  return batch.results.map((r) => {
    if (r.error) return `✗ ${r.name}: ${r.error}`;
    const parts = [];
    parts.push(r.signed ? (r.signSkip ? "签到(已签)" : `签到+${r.signScore}`) : (r.signTimeSkip ? `签到(未到 ${r.signTimeSkip})` : "签到✗"));
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
  return await readTextField(null, 0, {
    title: "🔑 设置Token",
    initial: initial,
    smartToken: true,
    clipboard: true,
    hint: "获取方式：打开ZEEHO App → 抓包获取 Authorization 头 → 复制 Token 内容",
  });
}

async function promptForImageUrl(initial = "") {
  return await readTextField(null, 0, {
    title: "🖼️ 车辆图片",
    initial: initial,
    clipboard: true,
    hint: "输入URL可自定义图片，留空则自动抓取app图片",
  });
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

// ========== 账号：手机号免抓包登录 / Token 设置 / 车辆选择入库 ==========
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
  if (m === "TOKEN_EXPIRED") return "Token已过期，请到 6️⃣ 账号 / Token → 重新登录/更新Token";
  if (m === "缺少Token") return "该账号缺少Token，请到 6️⃣ 账号 / Token 设置";
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
  // v2.5 修：baseInfo 旧路径 /cfmotoservermine/baseInfo 配新 appId 一律 430 permit error（v1.3 H5 通道密钥轮换）。
  // 按 v2.4 自身可用接口的通道规律多路径尝试：H5 版（与 signin/info 同通道）→ mine 版（与 totalIntegral 同通道）→ 积分响应兜底。
  const attempts = [
    { kind: "h5", url: joinUrl(H5_BASE, "/cfmotoservermine/H5/baseInfo"), params: { server_name: SERVER_NAME } },
    { kind: "app", url: joinUrl(BASE, "/v1.0/mine/cfmotoservermine/baseInfo"), params: {} },
  ];
  let lastRaw = null;
  for (const p of attempts) {
    try {
      const res = await safeRequest(requestWithSign, p.kind, "GET", p.url, p.params, null, token, "baseInfo");
      const d = res?.data || {};
      const uid = String(d.id || d.userId || (d.user && d.user.id) || "").trim();
      if (uid) return { userId: uid, nick: String(d.nickName || d.username || "").trim(), raw: res };
      lastRaw = res;
    } catch (e) {
      logDebug("baseInfo(" + p.kind + ") 查询失败", String(e?.message || e));
      lastRaw = { error: "baseInfo(" + p.kind + "): " + String(e?.message || e) };
    }
  }
  // 兜底：从积分接口响应提取用户 id（该接口在签到/组件链路中实测稳定）
  try {
    const intRes = await fetchTotalIntegral({ token });
    const dInt = (intRes && intRes.data) || {};
    const uid2 = String(
      (dInt.id || dInt.userId || (dInt.user && dInt.user.id) ||
        intRes.userId || intRes.id || "") || ""
    ).trim();
    if (uid2) return { userId: uid2, nick: "", raw: intRes, src: "integral" };
    if (!lastRaw) lastRaw = intRes;
  } catch (e) {
    if (!lastRaw) lastRaw = { error: "integral: " + String(e?.message || e) };
  }
  return { userId: "", nick: "", raw: lastRaw || {} };
}

// 查询车辆列表并弹出选择（返回 {picked, vehicles}）
async function pickVehicleForAccount(token, { title = "🚗 选择车辆" } = {}) {
  let items = [];
  try {
    const res = await safeRequest(requestWithSign, 'app', "GET", joinUrl(BASE, API.vehicleList), {}, "", token, "vehicleList");
    items = mapVehicleList(res);
  } catch (e) {
    const m = String(e?.message || e);
    if (m === "TOKEN_EXPIRED") throw new Error("获取车辆列表失败：Token已过期（到 6️⃣ 账号 / Token 更新）");
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

// 账号入库（单账号：同一 userId / token 更新，否则替换旧账号）
async function finalizeAccount({ token, userId, userName, phone, picked, vehicles }) {
  const store = getStore();
  const uid = String(userId || "");
  const tk = cleanToken(token);
  let acc = store.accounts.find((a) => (uid && String(a.userId) === uid) || cleanToken(a.token) === tk);
  if (!acc) {
    acc = {
      id: "acc_" + (uid || Date.now().toString(36)),
      userId: uid,
      userName: userName || phone || "我的账号",
      phone: phone || "",
      token: tk,
      vehicles: [],
      activeVin: "",
      state: {},
    };
  }
  store.accounts = [acc]; // 单账号版：始终只保留一个账号
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
  store.cfg.defaultAccountId = acc.id;
  registerUid(acc);
  saveStore(store);
  return acc;
}

// 手机号登录设置账号（免抓包）
async function addAccountByPhone() {
  const phone = await readTextField(null, 0, {
    title: "📱 手机号登录（免抓包）",
    clipboard: true,
    hint: "输入极核 App 注册手机号（11位），将发送短信验证码",
  });
  if (!/^1\d{10}$/.test(phone)) {
    await simpleAlert("❌ 手机号格式不对", "应为11位数字");
    return null;
  }

  const send = await sendSmsCode(phone);
  if (!send || String(send.code) !== "10000") {
    await simpleAlert("❌ 验证码发送失败", String(send?.message || send?.msg || "未知错误"));
    return null;
  }

  const code = await readTextField(null, 0, {
    title: "🔢 输入验证码",
    clipboard: true,
    hint: `验证码已发送至 ${phone.slice(0, 3)}****${phone.slice(-4)}\n从短信直接复制验证码，打开本页即已自动填入`,
  });
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
  catch (e) { await simpleAlert("❌ 设置失败", friendlyErr(e)); return null; }

  const acc = await finalizeAccount({ token, userId, userName, phone, picked: picked.picked, vehicles: picked.vehicles });
  await simpleAlert("✅ 设置成功", `${dispName(acc)} · 默认车辆 ${picked.picked.name}`);
  return acc;
}

// 粘贴 Token 设置账号
async function addAccountByToken() {
  let t = "";
  try { t = await promptForToken(""); } catch { return null; }
  if (!t) { await simpleAlert("ℹ️ 未获取到输入", "没有读到输入内容。\n新版 Scriptable 请按弹窗提示从剪贴板读取或用网页输入；也可检查 设置 → Scriptable 的粘贴权限。"); return null; }
  const token = cleanToken(t);
  let userId = "", userName = "";
  registerUid({ token, userId: "", state: {} });
  const info = await fetchUserIdByToken(token);
  userId = info.userId; userName = info.nick;
  registerUid({ token, userId: userId, state: { userId: userId } });

  let picked = null;
  try { picked = await pickVehicleForAccount(token, { title: "🚗 选择默认车辆" }); }
  catch (e) { await simpleAlert("❌ 设置失败", friendlyErr(e)); return null; }

  const acc = await finalizeAccount({ token, userId, userName, phone: "", picked: picked.picked, vehicles: picked.vehicles });
  await simpleAlert("✅ 设置成功", `${dispName(acc)} · 默认车辆 ${picked.picked.name}`);
  return acc;
}

// 设置账号向导
async function addAccountWizard() {
  const a = new Alert();
  a.title = "➕ 设置账号";
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
  try {
    const g = new LinearGradient();
    g.colors = WIDGET_GRAD_LIGHT.map((s) => new Color(s.hex, WIDGET_GRAD_ALPHA));
    g.locations = WIDGET_GRAD_LIGHT.map((s) => s.pos);
    g.startPoint = new Point(0, 0);
    g.endPoint = new Point(1, 1);
    w.backgroundGradient = g;
  } catch (_) { try { w.backgroundColor = new Color(WIDGET_GRAD_LIGHT[0].hex, WIDGET_GRAD_ALPHA); } catch (_) { } }
  w.addSpacer(10);
  const t = w.addText(title);
  t.font = Font.semiboldSystemFont(14);
  t.textColor = new Color("#24364A");
  w.addSpacer(8);
  const m = w.addText(message);
  m.font = Font.systemFont(11);
  m.textColor = new Color("#49607A");
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
  // v1.9 按 URL 分文件缓存（多车组件不再互相挤掉缓存导致每次刷新重复下载）
  const _ck = String(url).replace(/[^a-zA-Z0-9]/g, "").slice(-40) || "default";
  const cachePath = FM.joinPath(dir, "zeeho_vehicle_" + _ck + ".jpg");
  const metaPath = FM.joinPath(dir, "zeeho_vehicle_" + _ck + ".url");
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

// ================== 组件视觉与资产（参照 zeeho签到 v1.1.0 移植） ==================
// 内容：默认渐变背景与配色、自定义组件背景图、专属定制车辆图（相册/文件导入 + 透明边框裁剪）
// 存储位置：Documents/zeeho_widget_bg.png、Documents/zeeho_custom_pics/、Documents/zeeho_vpic_index.json

// ---------- 视觉常量（对应 zeeho wvr_vA15 / wvr_vLN092 / wvr_vLN022 / wvr_vLN055 / wvr_vLN023） ----------
const WIDGET_GRAD_ALPHA = 0.92;                       // 渐变透明度
const WIDGET_GRAD_LIGHT = [                           // 默认浅色渐变（左上 → 右下）
  { pos: 0, hex: "#a9c7f0" },
  { pos: 0.5, hex: "#a7a3e8" },
  { pos: 1, hex: "#c3a6e6" },
];
const BG_OVERLAY_LIGHT = { hex: "#FFFFFF", alpha: 0.22 }; // 自定义背景为浅色时叠加白蒙层
const BG_OVERLAY_DARK = { hex: "#000000", alpha: 0.55 };  // 自定义背景为深色时叠加黑蒙层
const CARD_BG_ALPHA = 0.2;                            // 半透明卡片背景透明度

// ---------- 调色板（对应 zeeho v4Palette：深 / 浅两套，onBg 时加深文字层次） ----------
function paletteForDark(dark, onBg) {
  if (dark) {
    const p = {
      ink: "#EAF3FC", ink2: "#B7CBE0", muted: "#7E95AE", foot: "#C9DAEA",
      accent: "#6FB1FF", ok: "#4ADE80", warn: "#FBBF24", err: "#F87171",
      gain: "#6BE39A", gainBg: ["#4ADE80", 0.1],
      cardBg: ["#173054", CARD_BG_ALPHA], cardBorder: ["#FFFFFF", 0.1],
      chipOk: "#7BE8A5", chipWarn: "#F5C95B", chipErr: "#F8A1A1",
      chipOkBg: ["#4ADE80", 0.12], chipWarnBg: ["#F59E0B", 0.13], chipErrBg: ["#EF4444", 0.11],
      trk: ["#FFFFFF", 0.16], line: ["#FFFFFF", 0.1],
      dotSigned: "#1DB455", dotMissed: "#FB923C",
      lv: { d: "#4C82F2", l: "#58A6F7", m: "#79BCF7", p: "#A4D0F8", r: "#F26B62" },
    };
    if (onBg) { p.muted = "#A6BACE"; p.foot = "#D6E4F1"; p.ink2 = "#D2E2F1"; }
    p.onBg = !!onBg;
    return p;
  }
  const p = {
    ink: "#24364A", ink2: "#49607A", muted: "#71879E", foot: "#5C7189",
    accent: "#2E7CF6", ok: "#16A34A", warn: "#D97706", err: "#DC2626",
    gain: "#159A48", gainBg: ["#22C55E", 0.1],
    cardBg: ["#FFFFFF", CARD_BG_ALPHA], cardBorder: ["#C4DBF7", 0.95],
    chipOk: "#138A3F", chipWarn: "#B26A00", chipErr: "#C22A2A",
    chipOkBg: ["#22C55E", 0.12], chipWarnBg: ["#F59E0B", 0.13], chipErrBg: ["#EF4444", 0.11],
    trk: ["#D6E8FF", 1], line: ["#26568C", 0.12],
    dotSigned: "#1DB455", dotMissed: "#FB923C",
    lv: { d: "#1D4ED8", l: "#3EA0F5", m: "#6FB8F6", p: "#A9D6F9", r: "#E0483E" },
  };
  if (onBg) { p.muted = "#5B7288"; p.foot = "#42586E"; p.ink2 = "#2F4459"; }
  p.onBg = !!onBg;
  return p;
}

// 调色板取色：支持 "#RRGGBB" 或 [hex, alpha]
function palColor(c, fallback) {
  try {
    if (c === undefined || c === null) return fallback || new Color("#000000", 0);
    if (Array.isArray(c)) return new Color(c[0], c[1]);
    return new Color(c, 1);
  } catch (e) { return fallback || new Color("#000000", 0); }
}

// 电量档位（对应 zeeho socLevel：90/80/60/30 分档 d/l/m/p/r）
function socLevelOf(pct) {
  if (!(pct >= 0)) return "";
  if (pct >= 90) return "d";
  if (pct >= 80) return "l";
  if (pct >= 60) return "m";
  if (pct >= 30) return "p";
  return "r";
}
function socColor(v4, pct) {
  const lv = socLevelOf(pct);
  return (lv && v4.lv[lv]) ? new Color(v4.lv[lv]) : new Color(v4.muted);
}

// 文字阴影（对应 zeeho onBgShadow：使用自定义背景图时让文字更清晰）
function applyTextShadow(txt, v4, radius) {
  try {
    if (v4 && v4.onBg) {
      txt.shadowColor = new Color(v4.onBgDark ? "#0A1628" : "#FFFFFF", 0.9);
      txt.shadowRadius = (radius === undefined || radius === null) ? 1.5 : radius;
    }
  } catch (e) { }
  return txt;
}

// ---------- 组件背景：读取 / 保存 / 移除 / 适配 ----------
function widgetBgFilePath() {
  return FM.joinPath(FM.documentsDirectory(), "zeeho_widget_bg.png");
}
function getBackgroundImage() {
  try {
    const p = widgetBgFilePath();
    if (FM.fileExists(p)) return Image.fromFile(p);
  } catch (e) { }
  return null;
}
function removeBackgroundImage() {
  try {
    const p = widgetBgFilePath();
    if (FM.fileExists(p)) FM.remove(p);
  } catch (e) { }
}
function saveBackgroundImage(img) {
  const p = widgetBgFilePath();
  let target = img;
  try {
    const maxSide = Math.max(img.size.width, img.size.height);
    if (maxSide > 1500) { // 过大图片缩到最长边 1500，控制组件渲染开销
      const scale = 1500 / maxSide;
      const w2 = Math.max(1, Math.round(img.size.width * scale));
      const h2 = Math.max(1, Math.round(img.size.height * scale));
      const dc = new DrawContext();
      dc.size = new Size(w2, h2);
      dc.drawImageInRect(img, new Rect(0, 0, w2, h2));
      target = dc.getImage();
    }
  } catch (e) { }
  FM.writeImage(p, target);
}

// 各尺寸组件的逻辑尺寸（pt），用于把背景图裁成对应比例
function widgetFamilyPtSize(family) {
  const map = {
    small: { w: 158, h: 158 },
    medium: { w: 348, h: 158 },
    large: { w: 348, h: 354 },
  };
  return map[String(family || "medium")] || map.medium;
}

// 背景图适配组件比例（对应 zeeho fitBackgroundImage：cover 式填充 + 蒙层）
function fitBackgroundImage(img, family, overlay) {
  const pt = widgetFamilyPtSize(family);
  let scale = 3;
  try { scale = Device.screenScale() || 3; } catch (e) { }
  const W = Math.max(1, Math.round(pt.w * scale));
  const H = Math.max(1, Math.round(pt.h * scale));
  const dc = new DrawContext();
  dc.size = new Size(W, H);
  const ratio = Math.max(W / img.size.width, H / img.size.height);
  const dw = img.size.width * ratio;
  const dh = img.size.height * ratio;
  dc.drawImageInRect(img, new Rect((W - dw) / 2, (H - dh) / 2, dw, dh));
  const ov = overlay || BG_OVERLAY_DARK;
  if (ov.alpha > 0) {
    dc.setFillColor(new Color(ov.hex, ov.alpha));
    dc.fillRect(new Rect(0, 0, W, H));
  }
  return dc.getImage();
}

// 计算图片平均亮度（对应 zeeho imageLuminance：缩到 16x16 再用纯 JS 解码 PNG 算亮度）
function bgImageLuminance(img) {
  try {
    const S = 16;
    const dc = new DrawContext();
    dc.size = new Size(S, S);
    dc.drawImageInRect(img, new Rect(0, 0, S, S));
    const small = dc.getImage();
    if (!small) return null;
    const data = Data.fromPNG(small);
    const bytes = data ? data.getBytes() : null;
    if (!bytes || !bytes.length) return null;
    return wfn51(bytes);
  } catch (e) { return null; }
}
function bgIsDarkImage(img) {
  const lum = bgImageLuminance(img);
  if (lum === null || lum === undefined) return false;
  return lum < 0.5;
}

// 统一背景入口（对应 zeeho buildBackground）：
// 1) 设置了自定义背景图 → 按图裁剪适配 + 明暗蒙层 + 深浅自适应配色
// 2) 未设置 → 默认蓝紫渐变 + 浅色配色
function setupWidgetBackground(w, family) {
  const bgImg = getBackgroundImage();
  if (bgImg) {
    const dark = bgIsDarkImage(bgImg);
    const overlay = dark ? BG_OVERLAY_DARK : BG_OVERLAY_LIGHT;
    try {
      w.backgroundImage = fitBackgroundImage(bgImg, family || "medium", overlay);
    } catch (e) {
      try { w.backgroundColor = new Color(dark ? "#1a2638" : "#dfe9fa"); } catch (e2) { }
    }
    const v4 = paletteForDark(dark, true);
    v4.onBgDark = dark;
    return v4;
  }
  try {
    const g = new LinearGradient();
    g.colors = WIDGET_GRAD_LIGHT.map((s) => new Color(s.hex, WIDGET_GRAD_ALPHA));
    g.locations = WIDGET_GRAD_LIGHT.map((s) => s.pos);
    g.startPoint = new Point(0, 0);
    g.endPoint = new Point(1, 1);
    w.backgroundGradient = g;
  } catch (e) {
    try { w.backgroundColor = new Color(WIDGET_GRAD_LIGHT[0].hex, WIDGET_GRAD_ALPHA); } catch (e2) { }
  }
  const v4 = paletteForDark(false, false);
  v4.onBgDark = false;
  return v4;
}

// ---------- 通用图片工具（对应 zeeho readFileBytes / fileSizeOf / imageKindOf / headHex / cropImageByRect） ----------
function imgReadFileBytes(path) {
  try {
    const d = Data.fromFile(path);
    const b = d ? d.getBytes() : null;
    return (b && b.length > 0) ? b : null;
  } catch (e) { return null; }
}
function imgFileSizeOf(path) {
  if (!path) return 0;
  try {
    let n = 0;
    try { n = Number(FM.fileSize(path)) || 0; } catch (e) { n = 0; }
    if (n > 0) return n;
    if (!FM.fileExists(path)) return 0;
  } catch (e) { }
  const b = imgReadFileBytes(path);
  return (b && b.length) ? b.length : 0;
}
function imgImageKindOf(bytes) {
  try {
    if (!bytes || !bytes.length) return "";
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "PNG";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "JPEG";
    if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return "GIF";
    if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) {
      return (bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) ? "WebP" : "RIFF 容器";
    }
    if (bytes[4] === 102 && bytes[5] === 116 && bytes[6] === 121 && bytes[7] === 112) return "HEIC/HEIF 等 ftyp 容器";
    return "";
  } catch (e) { return ""; }
}
function imgHeadHex(bytes) {
  try {
    if (!bytes || !bytes.length) return "";
    const out = [];
    const n = Math.min(8, bytes.length);
    for (let i = 0; i < n; i++) {
      let h = (Number(bytes[i]) & 255).toString(16);
      if (h.length < 2) h = "0" + h;
      out.push(h);
    }
    return out.join(" ");
  } catch (e) { return ""; }
}
function imgCropByRect(img, rect) {
  try {
    const dc = new DrawContext();
    dc.size = new Size(rect.w, rect.h);
    dc.opaque = false;
    dc.drawImageInRect(img, new Rect(-rect.x, -rect.y, rect.width, rect.height));
    return dc.getImage() || null;
  } catch (e) { return null; }
}

// ---------- 定制车辆图资产库（对应 zeeho customAsset* 系列，存本机 Documents） ----------
function vpicDirPath() {
  const dir = FM.joinPath(FM.documentsDirectory(), "zeeho_custom_pics");
  try { if (!FM.fileExists(dir)) FM.createDirectory(dir); } catch (e) { }
  return dir;
}
function vpicIndexPath() {
  return FM.joinPath(FM.documentsDirectory(), "zeeho_vpic_index.json");
}
function vpicLoadIndex() {
  try {
    const p = vpicIndexPath();
    if (FM.fileExists(p)) {
      const parsed = JSON.parse(String(FM.readString(p) || ""));
      if (parsed && typeof parsed === "object") {
        return {
          activeId: String(parsed.activeId || ""),
          trimFp: String(parsed.trimFp || ""),
          assets: Array.isArray(parsed.assets) ? parsed.assets : [],
        };
      }
    }
  } catch (e) { }
  return { activeId: "", trimFp: "", assets: [] };
}
function vpicSaveIndex(idx) {
  try {
    FM.writeString(vpicIndexPath(), JSON.stringify({
      version: 1,
      activeId: idx.activeId || "",
      trimFp: idx.trimFp || "",
      assets: idx.assets || [],
    }));
  } catch (e) { }
}
function vpicAssetPath(id) {
  try {
    if (!id) return "";
    return FM.joinPath(vpicDirPath(), String(id) + ".png");
  } catch (e) { return ""; }
}
// 索引与目录双向校验：索引里文件丢了的剔除，目录里多出来的 PNG 自动补录
function vpicAssetsOnDisk() {
  let list = [];
  const seen = {};
  let dirty = false;
  try {
    const dir = vpicDirPath();
    const idx = vpicLoadIndex();
    for (const it of idx.assets) {
      if (!it || !it.id) { dirty = true; continue; }
      const id = String(it.id);
      if (!FM.fileExists(vpicAssetPath(id))) { dirty = true; continue; }
      seen[id] = true;
      list.push({ id, name: String(it.name || ""), at: Number(it.at || 0), size: Number(it.size || 0) });
    }
    try {
      const files = FM.listContents(dir) || [];
      for (const f of files) {
        if (!/\.png$/i.test(String(f))) continue;
        const id = String(f).replace(/\.png$/i, "");
        if (seen[id]) continue;
        list.push({ id, name: "", at: 0, size: imgFileSizeOf(FM.joinPath(dir, String(f))) });
        dirty = true;
      }
    } catch (e) { }
    list.sort((a, b) => (b.at || 0) - (a.at || 0));
    if (dirty) vpicSaveIndex({ activeId: idx.activeId, trimFp: idx.trimFp, assets: list });
  } catch (e) { }
  return list;
}
function vpicActive() {
  const idx = vpicLoadIndex();
  if (!idx.activeId) return null;
  for (const it of vpicAssetsOnDisk()) {
    if (it.id === idx.activeId) return it;
  }
  return null;
}
function vpicSetActive(id) {
  const idx = vpicLoadIndex();
  idx.activeId = String(id || "");
  vpicSaveIndex(idx);
}
function vpicCustomPath() {
  const act = vpicActive();
  return act ? vpicAssetPath(act.id) : "";
}
function vpicHasCustom() {
  try {
    const p = vpicCustomPath();
    return !!p && FM.fileExists(p);
  } catch (e) { return false; }
}
function vpicRemoveAsset(id) {
  try {
    const p = vpicAssetPath(id);
    if (p && FM.fileExists(p)) FM.remove(p);
    const idx = vpicLoadIndex();
    idx.assets = idx.assets.filter((it) => it && String(it.id) !== String(id));
    if (idx.activeId === String(id)) idx.activeId = "";
    vpicSaveIndex(idx);
    return true;
  } catch (e) { return false; }
}
function vpicClearAll() {
  try {
    for (const it of vpicAssetsOnDisk()) {
      const p = vpicAssetPath(it.id);
      try { if (FM.fileExists(p)) FM.remove(p); } catch (e) { }
    }
    vpicSaveIndex({ activeId: "", trimFp: "", assets: [] });
    return true;
  } catch (e) { return false; }
}
function vpicMarkTrimmed(path) {
  try {
    const idx = vpicLoadIndex();
    idx.trimFp = path + "|" + imgFileSizeOf(path);
    vpicSaveIndex(idx);
  } catch (e) { }
}
// 渲染前检查：文件被外部替换过（指纹变化）时自动尝试裁掉透明边框
function vpicEnsureTrimmed(path) {
  if (!path) return path;
  try {
    if (!FM.fileExists(path)) return path;
    const idx = vpicLoadIndex();
    if (idx.trimFp === path + "|" + imgFileSizeOf(path)) return path;
    const bytes = imgReadFileBytes(path);
    const rect = bytes ? wfn50(bytes) : null;
    if (rect) {
      let img = null;
      try { img = Image.fromFile(path); } catch (e) { img = null; }
      const cropped = img ? imgCropByRect(img, rect) : null;
      if (cropped) FM.writeImage(path, cropped);
    }
    vpicMarkTrimmed(path);
    return path;
  } catch (e) { return path; }
}
function vpicResolvePath() {
  try {
    if (vpicHasCustom()) return vpicEnsureTrimmed(vpicCustomPath());
  } catch (e) { }
  return "";
}
function vpicDisplayName(sourceName, atMs) {
  let name = "";
  try {
    name = String(sourceName || "").split("/").pop().split("\\").pop();
    name = name.replace(/\.(png|jpe?g|webp|gif|heic)$/i, "").trim();
    if (name.length > 16) name = name.slice(0, 16);
  } catch (e) { name = ""; }
  if (!name) {
    const d = new Date(atMs || Date.now());
    const p2 = (n) => String(n).padStart(2, "0");
    name = "定制图 " + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes());
  }
  return name;
}
function vpicShortStamp(atMs) {
  try {
    const d = new Date(Number(atMs) || Date.now());
    const p2 = (n) => String(n).padStart(2, "0");
    return p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes());
  } catch (e) { return ""; }
}

// 导入链（对应 zeeho importVehiclePic*：相册图片经临时 PNG 文件转字节；超 4MB 自动缩到 1500）
async function vpicImportFromImage(img, sourceName, displayName) {
  try {
    if (!img) return { ok: false, message: "没有拿到图片" };
    const at = Date.now();
    const id = "vp" + at.toString(36) + Math.random().toString(36).slice(2, 8);
    const path = vpicAssetPath(id);
    if (!path) return { ok: false, message: "本机存储不可用" };
    try {
      if (!FM.fileExists(path)) FM.writeImage(path, img);
    } catch (e) {
      return { ok: false, message: "保存失败：写入图片文件出错" };
    }
    vpicMarkTrimmed(path);
    const assets = vpicAssetsOnDisk().filter((it) => it.id !== id);
    assets.push({
      id,
      name: String(displayName || "").trim() || vpicDisplayName(sourceName || "", at),
      at,
      size: imgFileSizeOf(path),
    });
    assets.sort((a, b) => (b.at || 0) - (a.at || 0));
    vpicSaveIndex({ activeId: id, trimFp: vpicLoadIndex().trimFp, assets });
    return { ok: true, id, path, message: "车辆图已导入并生效（库中共 " + assets.length + " 张，刷新组件即可看到）" };
  } catch (e) {
    return { ok: false, message: "导入异常：" + String((e && e.message) ? e.message : e) };
  }
}
async function vpicImportFromBytes(bytes, sourceName) {
  if (!bytes || !bytes.length) return { ok: false, message: "文件读取失败（内容为空）" };
  if (bytes.length > VPIC_MAX_FILE_BYTES) return { ok: false, message: "文件体积超出上限（最大 4MB）" };
  let img = null;
  try { img = Image.fromData(Data.fromBytes(bytes)); } catch (e) { img = null; }
  if (!img) {
    return {
      ok: false,
      message: "无法解析成图片。\n识别结果：" + (imgImageKindOf(bytes) || "未知格式（前 8 字节 " + imgHeadHex(bytes) + "）") + "\n请确认是 PNG/JPEG 等图片文件。",
    };
  }
  return await vpicImportFromImage(img, String(sourceName || ""), "");
}
async function vpicImportFromPath(path) {
  const bytes = imgReadFileBytes(path);
  if (!bytes) return { ok: false, message: "文件读取失败（可能无权限或文件为空）" };
  return await vpicImportFromBytes(bytes, String(path || ""));
}
async function vpicImportFromPhotos() {
  let img = null;
  try { img = await Photos.fromLibrary(); } catch (e) { return { ok: false, message: "未选择图片" }; }
  if (!img) return { ok: false, message: "未选择图片" };
  let bytes = null;
  const toBytes = (image) => {
    const p = FM.joinPath(FM.documentsDirectory(), "zeeho_pick_tmp_" + Date.now() + ".png");
    try {
      FM.writeImage(p, image);
      const d = FM.read(p);
      return d ? d.getBytes() : null;
    } finally {
      try { if (FM.fileExists(p)) FM.remove(p); } catch (e) { }
    }
  };
  try { bytes = toBytes(img); } catch (e) { bytes = null; }
  if (bytes && bytes.length > VPIC_MAX_FILE_BYTES) {
    try {
      const maxSide = Math.max(img.size.width, img.size.height);
      if (maxSide > 1500) {
        const scale = 1500 / maxSide;
        const dc = new DrawContext();
        dc.size = new Size(Math.round(img.size.width * scale), Math.round(img.size.height * scale));
        dc.opaque = false;
        dc.drawImageInRect(img, new Rect(0, 0, dc.size.width, dc.size.height));
        const smaller = dc.getImage();
        if (smaller) {
          const b2 = toBytes(smaller);
          if (b2 && b2.length && b2.length <= VPIC_MAX_FILE_BYTES) bytes = b2;
        }
      }
    } catch (e) { }
  }
  if (!bytes || !bytes.length) return { ok: false, message: "所选图片读取失败，请重试或改用「📄 从文件导入」" };
  return await vpicImportFromBytes(bytes, "相册图片");
}
async function vpicImportFromFilePicker() {
  let path = "";
  try { path = await DocumentPicker.openFile(); } catch (e) { return { ok: false, message: "未选择文件" }; }
  if (!path) return { ok: false, message: "未选择文件" };
  return await vpicImportFromPath(path);
}

// 渲染用：优先定制车辆图，其次接口车辆图 URL
async function loadVehicleImagePreferCustom(url) {
  const customPath = vpicResolvePath();
  if (customPath) {
    try {
      const img = Image.fromFile(customPath);
      if (img) return img;
    } catch (e) { }
  }
  return await loadVehicleImage(url);
}

// ---------- 菜单：设置组件背景（对应 zeeho actionSetBackground） ----------
async function menuSetBackground() {
  const cur = getBackgroundImage() ? "自定义图片" : "默认渐变";
  const a = new Alert();
  a.title = "🖼️ 组件背景";
  a.message = "选择背景图片来源\n当前：" + cur + "\n\n设置后小组件用这张图片做背景，文字颜色按图片明暗自动适配；选「恢复默认」回到蓝紫渐变。";
  a.addAction("从相册选择");
  a.addAction("输入图片 URL");
  a.addAction("恢复默认（移除背景）");
  a.addCancelAction("取消");
  const sel = await a.present();
  if (sel === -1) return;
  if (sel === 0) {
    try {
      const img = await Photos.fromLibrary();
      saveBackgroundImage(img);
      await simpleAlert("✅ 设置成功", "小组件背景图片已设置！\n刷新桌面组件即可生效。");
    } catch (e) {
      await simpleAlert("❌ 设置失败", "未选择图片");
    }
  } else if (sel === 1) {
    const url = await readTextField(null, 0, {
      title: "🖼️ 背景图 URL",
      clipboard: true,
      hint: "输入图片直链（https:// 开头），留空恢复默认渐变背景",
    });
    if (!url) return;
    try {
      const req = new Request(url);
      req.timeoutInterval = 15;
      const img = await req.loadImage();
      if (!img) { await simpleAlert("❌ 设置失败", "图片下载失败，请检查 URL 或网络。"); return; }
      saveBackgroundImage(img);
      await simpleAlert("✅ 设置成功", "小组件背景图片已设置！\n刷新桌面组件即可生效。");
    } catch (e) {
      await simpleAlert("❌ 设置失败", "图片下载失败，请检查 URL。\n" + String((e && e.message) ? e.message : e));
    }
  } else if (sel === 2) {
    removeBackgroundImage();
    await simpleAlert("✅ 已移除", "小组件背景已恢复默认渐变。\n刷新桌面组件即可生效。");
  }
}

// ---------- 菜单：专属定制车辆图（对应 zeeho actionCustomVehiclePic） ----------
async function menuCustomVehiclePic() {
  const assets = vpicAssetsOnDisk();
  const active = vpicActive();
  const idx = vpicLoadIndex();
  const opts = [
    { id: "photos", label: "🖼️ 选图导入（相册）" },
    { id: "file", label: "📄 从文件导入" },
  ];
  if (assets.length) opts.push({ id: "pick", label: "🎯 选择当前生效的定制图…（共 " + assets.length + " 张）" });
  if (active) opts.push({ id: "crop", label: "✂️ 一键裁掉透明边框" });
  if (active) opts.push({ id: "cancel", label: "🚫 取消使用（回默认车辆图，保留文件）" });
  if (assets.length) opts.push({ id: "del", label: "🗑️ 删除已导入的定制图…" });
  opts.push({ id: "help", label: "❓ 导入说明" });
  const a = new Alert();
  a.title = "🎨 专属定制车辆图";
  a.message = "当前：" + (active ? "定制「" + (active.name || active.id) + "」· " + vpicShortStamp(active.at) : "接口默认车辆图") + "\n已导入 " + assets.length + " 张\n\n建议导入带透明背景的 PNG 车辆图，与组件版式更贴合。";
  for (const o of opts) a.addAction(o.label);
  a.addCancelAction("取消");
  const sel = await a.present();
  if (sel < 0 || sel >= opts.length) return;
  const pick = opts[sel].id;
  if (pick === "photos") {
    const r = await vpicImportFromPhotos();
    await simpleAlert(r.ok ? "✅ 导入成功" : "❌ 导入失败", r.message);
    return;
  }
  if (pick === "file") {
    const r = await vpicImportFromFilePicker();
    await simpleAlert(r.ok ? "✅ 导入成功" : "❌ 导入失败", r.message);
    return;
  }
  if (pick === "pick") { await menuPickCustomVpic(); return; }
  if (pick === "crop") { await menuCropVpic(); return; }
  if (pick === "cancel") {
    vpicSetActive("");
    await simpleAlert("已取消使用", "已切回接口默认车辆图。\n已导入的定制图都还在，需要时在「🎯 选择当前生效的定制图」里点回来。\n刷新桌面组件即可生效。");
    return;
  }
  if (pick === "del") { await menuDeleteCustomVpic(); return; }
  await simpleAlert("导入说明", "【怎么导入】两种方式任选：\n① 相册导入：把车辆图存到相册（微信图片长按保存即可），点「🖼️ 选图导入（相册）」从相册选；\n② 文件导入：把图片存到「文件」App，点「📄 从文件导入」选中它（支持 PNG / JPEG / WebP）。\n\n【建议】导入带透明背景的 PNG 车辆图；JPEG 相册图会自动垫白底。\n当前生效的是自己导入的图时，可点「✂️ 一键裁掉透明边框」，自动裁掉四周透明区域，让车在组件里显得更大。\n\n【多图怎么管】导入的图全部保留：点「🎯 选择当前生效的定制图」切换；「🚫 取消使用」只是回默认图、不删文件；要真删文件用「🗑️ 删除已导入的定制图」。");
}
async function menuPickCustomVpic() {
  const assets = vpicAssetsOnDisk();
  if (!assets.length) { await simpleAlert("提示", "还没有定制图，先导入一张。"); return; }
  const idx = vpicLoadIndex();
  const a = new Alert();
  a.title = "🎯 选择当前生效的定制图";
  a.message = "点一下即切换。当前生效：" + (idx.activeId ? ((vpicActive() || {}).name || idx.activeId) : "接口默认图");
  for (const it of assets) {
    a.addAction((it.id === idx.activeId ? "✔ " : "○ ") + (it.name || it.id) + " · " + vpicShortStamp(it.at));
  }
  a.addCancelAction("取消");
  const sel = await a.present();
  if (sel < 0 || sel >= assets.length) return;
  if (assets[sel].id === idx.activeId) return;
  vpicSetActive(assets[sel].id);
  await simpleAlert("✅ 已切换", "当前生效：" + (assets[sel].name || assets[sel].id) + "\n刷新桌面组件后生效。");
}
async function menuCropVpic() {
  const active = vpicActive();
  if (!active) { await simpleAlert("提示", "当前没有使用定制图。"); return; }
  const path = vpicAssetPath(active.id);
  if (!path || !FM.fileExists(path)) { await simpleAlert("提示", "定制图文件已被删除，请重新导入。"); return; }
  const bytes = imgReadFileBytes(path);
  const rect = bytes ? wfn50(bytes) : null;
  if (!rect) {
    await simpleAlert("无需裁剪", "没检测到四周的透明边框（或图片不是带透明通道的 PNG）。\n非 PNG 图片（如 JPEG 相册图）会自动垫成白底，属正常现象。");
    return;
  }
  let img = null;
  try { img = Image.fromFile(path); } catch (e) { img = null; }
  if (!img) { await simpleAlert("❌ 读取失败", "图片文件损坏或无法读取。"); return; }
  const cropped = imgCropByRect(img, rect);
  if (!cropped) { await simpleAlert("❌ 裁剪失败", "绘制过程中出错，图片保持原样。"); return; }
  try { FM.writeImage(path, cropped); } catch (e) {
    await simpleAlert("❌ 保存失败", "写入裁剪结果出错，图片保持原样。");
    return;
  }
  vpicMarkTrimmed(path);
  await simpleAlert("✅ 裁剪完成", "已裁掉透明边框 " + rect.width + "x" + rect.height + " → " + rect.w + "x" + rect.h + "。\n刷新组件即可看到效果。注意：裁剪会覆盖原图，无法撤销。");
}
async function menuDeleteCustomVpic() {
  const assets = vpicAssetsOnDisk();
  if (!assets.length) { await simpleAlert("提示", "还没有导入过定制图。"); return; }
  const idx = vpicLoadIndex();
  const a = new Alert();
  a.title = "🗑️ 删除已导入的定制图";
  a.message = "删除会真的删掉文件（点「🚫 取消使用」则只回默认图、保留文件）。";
  for (const it of assets) {
    a.addAction((it.id === idx.activeId ? "★ " : "") + "删除 " + (it.name || it.id) + " · " + vpicShortStamp(it.at));
  }
  a.addAction("🗑️ 全部删除（" + assets.length + " 张）");
  a.addCancelAction("取消");
  const sel = await a.present();
  if (sel < 0) return;
  if (sel === assets.length) {
    const c = new Alert();
    c.title = "全部删除？";
    c.message = "将删除本机全部 " + assets.length + " 张定制图并回接口默认图，此操作不可撤销。";
    c.addAction("确认全部删除");
    c.addCancelAction("取消");
    if ((await c.present()) !== 0) return;
    vpicClearAll();
    await simpleAlert("✅ 已全部删除", "库已清空，已回接口默认车辆图。");
    return;
  }
  if (sel > assets.length) return;
  const target = assets[sel];
  const wasActive = target.id === idx.activeId;
  const c = new Alert();
  c.title = "删除「" + (target.name || target.id) + "」？";
  c.message = wasActive ? "它正是当前生效的那张，删除后会自动切到最新的一张（没有别的了就回接口默认图）。" : "删除后不影响当前生效的定制图。";
  c.addAction("确认删除");
  c.addCancelAction("取消");
  if ((await c.present()) !== 0) return;
  vpicRemoveAsset(target.id);
  const remaining = vpicAssetsOnDisk();
  let switched = null;
  if (wasActive && remaining.length) { vpicSetActive(remaining[0].id); switched = remaining[0]; }
  await simpleAlert("✅ 已删除", "「" + (target.name || target.id) + "」已删除。" + (switched ? "\n已自动切换到：" + (switched.name || switched.id) : "\n没有别的已导入定制图了，已回接口默认图。"));
}

// ---------- V6/V4 版式构件（参照 zeeho签到 v1.1.0 的 Header / 统计卡 / 近7天日历 / Footer / 电量条渲染） ----------

// 近7天星期缩写（"日一二三四五六"，最后一列为今天）
function zWeekShorts() {
  const ws = "日一二三四五六";
  const out = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now.getTime());
    dt.setDate(dt.getDate() - i);
    out.push(ws.charAt(dt.getDay()));
  }
  return out;
}

// 签到状态胶囊（圆点 + 文字，对应 zeeho buildHeaderV4 的 chip）
function zStatusChip(parent, v4, ok, text, isLarge) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.setPadding(isLarge ? 3 : 2, isLarge ? 8 : 6, isLarge ? 3 : 2, isLarge ? 8 : 6);
  chip.cornerRadius = 99;
  chip.backgroundColor = palColor(ok ? v4.chipOkBg : v4.chipErrBg);
  const dot = chip.addStack();
  dot.size = new Size(6, 6);
  dot.cornerRadius = 3;
  dot.backgroundColor = new Color(ok ? v4.chipOk : v4.chipErr);
  chip.addSpacer(4);
  const t = chip.addText(text);
  t.font = Font.systemFont(isLarge ? 11 : 10);
  t.textColor = new Color(ok ? v4.chipOk : v4.chipErr);
  t.lineLimit = 1;
  return chip;
}

// 头部：圆形首字占位 + 名称 + 签到胶囊（对应 zeeho buildHeaderV4/V6）
function zHeaderRow(parent, v4, name, signed, isLarge) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const D = isLarge ? 30 : 22;
  const av = row.addStack();
  av.size = new Size(D, D);
  av.cornerRadius = D / 2;
  av.backgroundColor = new Color("#2C76F2", 1);
  av.centerAlignContent();
  av.addSpacer();
  const avT = av.addText(String((name || "Z").trim()).charAt(0).toUpperCase());
  avT.font = Font.boldSystemFont(Math.max(9, Math.round(D * 0.42)));
  avT.textColor = Color.white();
  avT.lineLimit = 1;
  av.addSpacer();
  row.addSpacer(8);
  const nameT = row.addText(String(name || "车辆"));
  nameT.font = Font.boldSystemFont(isLarge ? 17 : 13);
  nameT.textColor = new Color(v4.ink);
  nameT.lineLimit = 1;
  nameT.minimumScaleFactor = 0.7;
  applyTextShadow(nameT, v4);
  row.addSpacer();
  zStatusChip(row, v4, signed, signed ? "已签到" : "未签到", isLarge);
  return row;
}

// 等宽统计小卡片行（对应 zeeho buildEqualCardsV6 + renderInfoCard：cardBg + 边框 + 圆角 8）
// items = [{ label, value, size, color }]
function zStatCardsRow(parent, v4, items, cardH, totalW, gap) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const TOTAL_W = Math.max(120, Number(totalW) || 344);
  const g = (gap === undefined || gap === null) ? 6 : gap;
  const n = Math.max(1, items.length);
  const cardW = Math.round((TOTAL_W - g * (n - 1)) / n);
  for (let i = 0; i < items.length; i++) {
    if (i > 0) row.addSpacer(g);
    const it = items[i] || {};
    const card = row.addStack();
    card.layoutVertically();
    card.centerAlignContent();
    card.size = new Size(cardW, cardH);
    card.setPadding(2, 5, 2, 5);
    card.cornerRadius = 8;
    card.backgroundColor = palColor(v4.cardBg);
    try {
      card.borderWidth = 1;
      card.borderColor = palColor(v4.cardBorder);
    } catch (e) { }
    card.addSpacer();
    const label = card.addText(String(it.label || ""));
    label.font = Font.systemFont(7.5);
    label.textColor = new Color(v4.muted);
    label.lineLimit = 1;
    label.minimumScaleFactor = 0.6;
    const val = card.addText(String(it.value || "--"));
    val.font = Font.boldSystemFont(it.size || 11);
    val.textColor = it.color ? new Color(it.color) : new Color(v4.ink);
    val.lineLimit = 1;
    val.minimumScaleFactor = 0.6;
    applyTextShadow(val, v4, 0.8);
    card.addSpacer();
  }
  return row;
}

// 近7天签到日历（对应 zeeho buildWeekV6：3=绿已签 4=橙漏签 2=空心圈今天待签 其余=灰）
function zWeekRow(parent, v4, last7Status, totalW) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.size = new Size(Math.max(120, Number(totalW) || 344), 16);
  const lab = row.addText("近7天");
  lab.font = Font.boldSystemFont(8);
  lab.textColor = new Color(v4.muted);
  lab.lineLimit = 1;
  applyTextShadow(lab, v4, 0.8);
  row.addSpacer(8); // 标签与第一列间隔拉大，避免「近7天」文字贴近/遮挡第一列内容
  const cells = row.addStack();
  cells.layoutHorizontally();
  cells.centerAlignContent();
  // 40 = “近7天”标签宽 + 间隔；再留 16pt 安全缓冲，兼容组件实际宽度小于 348pt 假设值的机型（如 Pro 系列），
  // 避免整行溢出时最后一列（今天）被右侧裁切
  const cellsW = Math.max(80, (Number(totalW) || 344) - 40 - 16);
  cells.size = new Size(cellsW, 16);
  // 浮点精确等分：7 列总宽恰好铺满 cells，不再因 Math.round 取整使总宽超出容器（原来 7×41=287 > 284）
  const colW = cellsW / 7;
  const shorts = zWeekShorts();
  const status = (Array.isArray(last7Status) && last7Status.length === 7) ? last7Status : [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 7; i++) {
    // 每列改为水平排列：周几数字在左、圆点在其右侧，组合整体在列内水平居中、垂直居中于行高
    const col = cells.addStack();
    col.layoutHorizontally();
    col.centerAlignContent();
    col.size = new Size(colW, 16);
    col.addSpacer(); // 前弹性 spacer：数字+圆点组合在列内水平居中
    const isToday = i === 6;
    const wt = col.addText(shorts[i]);
    wt.font = isToday ? Font.boldSystemFont(7) : Font.systemFont(7);
    wt.textColor = new Color(isToday ? v4.accent : v4.muted);
    wt.lineLimit = 1;
    applyTextShadow(wt, v4, 0.8);
    col.addSpacer(2); // 数字与圆点间隔
    const st = Number(status[i]);
    const dot = col.addStack();
    dot.size = new Size(5, 5);
    dot.cornerRadius = 2.5;
    if (st === 3) dot.backgroundColor = new Color(v4.dotSigned || "#1DB455");
    else if (st === 4) dot.backgroundColor = new Color(v4.dotMissed || "#FB923C");
    else if (st === 2) { dot.borderWidth = 1.5; dot.borderColor = new Color(v4.accent || "#2E7CF6"); }
    else dot.backgroundColor = palColor(v4.trk);
    col.addSpacer(); // 后弹性 spacer：与前弹性 spacer 配对，组合水平居中
  }
  return row;
}

// 底部行：左侧小字（发布状态）+ 右侧时间（对应 zeeho buildFooterV6）
function zFooterRow(parent, v4, leftText, clockText) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const lt = row.addText(String(leftText || ""));
  lt.font = Font.systemFont(7);
  lt.textColor = new Color(v4.foot);
  lt.lineLimit = 1;
  applyTextShadow(lt, v4, 0.8);
  row.addSpacer();
  const ct = row.addText(String(clockText || ""));
  ct.font = Font.systemFont(7);
  ct.textColor = new Color(v4.foot);
  ct.lineLimit = 1;
  applyTextShadow(ct, v4, 0.8);
  return row;
}
function zShortClock() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  return p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes());
}

// 骑行行（对应 zeeho buildRideV4：普通段 ink2、极速段红色加粗）
function zRideRow(parent, v4, segs, fontSize) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  for (const s of (segs || [])) {
    const t = row.addText(String(s.text || ""));
    t.font = s.speed ? Font.boldSystemFont(fontSize) : Font.systemFont(fontSize);
    t.textColor = new Color(s.speed ? "#E23B3B" : v4.ink2);
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.7;
    applyTextShadow(t, v4);
  }
  return row;
}

// 电量条（对应 zeeho nativeChargeBar：圆角外框渐变轨道 + 按档位渐变填充）
function zBarFillStops(lv) {
  if (lv === "d") return [[0, "#3B82F6"], [1, "#1D4ED8"]];
  if (lv === "l") return [[0, "#5EA4FF"], [0.6, "#2F70F2"], [1, "#245FE0"]];
  if (lv === "m") return [[0, "#7CC1FF"], [1, "#4D93F7"]];
  if (lv === "p") return [[0, "#AFD8FF"], [1, "#7CC1FF"]];
  if (lv === "r") return [[0, "#FB6A60"], [1, "#E0483E"]];
  return [[0, "#5EA4FF"], [0.6, "#2F70F2"], [1, "#245FE0"]];
}
function zChargeBar(parent, v4, barW, barH, soc, socLv) {
  const W = Math.max(6, Math.round(barW));
  const H = Math.max(3, Math.round(barH));
  const outer = parent.addStack();
  outer.layoutHorizontally();
  outer.size = new Size(W, H);
  outer.cornerRadius = H / 2;
  try {
    const g = new LinearGradient();
    const trkHex = Array.isArray(v4.trk) ? v4.trk[0] : String(v4.trk || "#D6E8FF");
    g.colors = [new Color("#EAF3FF", 1), new Color(trkHex, 1)];
    g.locations = [0, 1];
    g.startPoint = new Point(0, 0);
    g.endPoint = new Point(0, 1);
    outer.backgroundGradient = g;
  } catch (e) { outer.backgroundColor = palColor(v4.trk); }
  const socN = (isFinite(Number(soc)) && Number(soc) > 0) ? Math.min(100, Number(soc)) : 0;
  if (socN > 0) {
    const inner = outer.addStack();
    inner.size = new Size(Math.max(2, Math.round(W * socN / 100)), H);
    inner.cornerRadius = H / 2;
    try {
      const stops = zBarFillStops(socLv);
      const g2 = new LinearGradient();
      g2.colors = stops.map((s) => new Color(s[1], 1));
      g2.locations = stops.map((s) => s[0]);
      g2.startPoint = new Point(0, 0);
      g2.endPoint = new Point(1, 0);
      inner.backgroundGradient = g2;
    } catch (e) { inner.backgroundColor = new Color((socLv && v4.lv[socLv]) || v4.accent); }
  }
  outer.addSpacer();
  return outer;
}

// 骑行数据 → zRideRow 段落（v2.4 数据源适配 zeeho「上次骑行 ｜ 今日骑行 · 极速」格式）
function zBuildRideSegs(ride) {
  const r = ride || {};
  const lastKm = isFinite(Number(r.lastRideMileage)) ? Number(r.lastRideMileage) : 0;
  const lastMin = isFinite(Number(r.lastRideDurationMin)) ? Number(r.lastRideDurationMin) : 0;
  const todayKm = isFinite(Number(r.distanceKm)) ? Number(r.distanceKm) : 0;
  const todayMin = isFinite(Number(r.durationMin)) ? Number(r.durationMin) : 0;
  const todaySpd = Number(r.maxSpeedKmh || 0);
  const segs = [];
  if (lastKm > 0 || lastMin > 0) {
    const parts = [];
    if (lastKm > 0) parts.push(lastKm.toFixed(1) + "km");
    if (lastMin > 0) parts.push(lastMin + "min");
    segs.push({ text: "上次骑行 " + parts.join(" · "), speed: false });
  }
  if (todayKm > 0 || todayMin > 0 || todaySpd > 0) {
    if (segs.length) segs.push({ text: " ｜ ", speed: false });
    const parts = [];
    if (todayKm > 0) parts.push(todayKm.toFixed(1) + "km");
    if (todayMin > 0) parts.push(todayMin + "min");
    segs.push({ text: "今日骑行 " + parts.join(" · "), speed: false });
    if (todaySpd > 0) segs.push({ text: " · " + todaySpd + "km/h", speed: true });
  }
  return segs;
}

// 发布状态 → footer 左侧文字（v2.4 特有信息，参照原展示）
function zPostStatusText(data) {
  if (data.postEnabled === false) return "📝发布动态：未开启";
  if (data.postStatus === "success") {
    const mk = (l, ok) => (ok ? "✓" + l : "✕" + l);
    return [mk("发布", true), mk("点赞", data.liked), mk("分享", data.shared), mk("删除", data.deleted)].join(" ");
  }
  if (data.postStatus === "failed") return "✕发布失败";
  return "⏳待发布";
}

// 车辆图加载（定制图优先，适配目标区域等比缩放；对应 zeeho buildBodyV6 的车图块）
async function zAddVehicleImage(parent, data, maxW, maxH, v4, alignMode) {
  parent.addSpacer();
  let img = null;
  const preferImgUrl = data.vehicleImageUrl || IMAGE_URL;
  if (vpicHasCustom() || (preferImgUrl && preferImgUrl.trim() !== "")) {
    img = await loadVehicleImagePreferCustom(preferImgUrl);
  }
  if (img) {
    const iw = (img.size && img.size.width) ? img.size.width : maxW;
    const ih = (img.size && img.size.height) ? img.size.height : maxH;
    const r = Math.min(maxW / iw, maxH / ih);
    const outW = Math.max(1, Math.round(iw * r));
    const outH = Math.max(1, Math.round(ih * r));
    if (alignMode === "center" || alignMode === "right") {
      // 水平对齐用弹性 spacer 实现（ImageWidget 自带对齐方法在垂直容器中不可靠）：
      // center = 前后弹性 spacer 平分空隙居中；right = 前弹性 spacer 推右
      const row = parent.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.addSpacer();
      const iv = row.addImage(img);
      iv.imageSize = new Size(outW, outH);
      if (alignMode === "center") row.addSpacer();
    } else {
      const iv = parent.addImage(img);
      iv.imageSize = new Size(outW, outH);
    }
  } else {
    const ph = parent.addText("🏍");
    ph.font = Font.systemFont(20);
    ph.textColor = new Color(v4.accent);
  }
  parent.addSpacer();
}

// ---------- 纯 JS PNG 解码器（原样移植自 zeeho签到 v1.1.0） ----------
// 用途：wfn50 检测定制车辆图透明边框（导入自动/手动裁剪）、wfn51 计算背景图平均亮度
// 依赖常量：wvr_vLN82（透明度阈值）、wvr_vLN16000000（像素上限）
const VPIC_MAX_FILE_BYTES = 4194304; // 定制车辆图导入体积上限 4MB（对应 zeeho wvr_vLN4194304）
const wvr_vLN82 = 82;
const wvr_vLN16000000 = 16000000;

function wfn38(wpm120, wpm121, wpm122) {
  var wvr_v159 = wpm120 + wpm121 - wpm122;
  var wvr_v160 = wvr_v159 > wpm120 ? wvr_v159 - wpm120 : wpm120 - wvr_v159;
  var wvr_v161 = wvr_v159 > wpm121 ? wvr_v159 - wpm121 : wpm121 - wvr_v159;
  var wvr_v162 = wvr_v159 > wpm122 ? wvr_v159 - wpm122 : wpm122 - wvr_v159;
  if (wvr_v160 <= wvr_v161 && wvr_v160 <= wvr_v162) {
    return wpm120;
  }
  if (wvr_v161 <= wvr_v162) {
    return wpm121;
  }
  return wpm122;
}
function wfn39(wpm123, wpm124, wpm125) {
  var wvr_v163 = new Uint8Array(Math.max(4096, (wpm125 - wpm124) * 3));
  var wvr_vLN030 = 0;
  function wfn40(wpm126) {
    if (wvr_vLN030 + wpm126 <= wvr_v163.length) {
      return;
    }
    var wvr_v164 = wvr_v163.length;
    while (wvr_v164 < wvr_vLN030 + wpm126) {
      wvr_v164 *= 2;
    }
    var wvr_v165 = new Uint8Array(wvr_v164);
    wvr_v165.set(wvr_v163.subarray(0, wvr_vLN030));
    wvr_v163 = wvr_v165;
  }
  var wvr_v166 = wpm124 + 2;
  var wvr_vLN031 = 0;
  var wvr_vLN032 = 0;
  function wfn41(wpm127) {
    while (wvr_vLN032 < wpm127) {
      if (wvr_v166 >= wpm125) {
        throw new Error("inflate eof");
      }
      wvr_vLN031 |= (wpm123[wvr_v166++] & 255) << wvr_vLN032;
      wvr_vLN032 += 8;
    }
  }
  function wfn42(wpm128) {
    if (wpm128 === 0) {
      return 0;
    }
    wfn41(wpm128);
    var wvr_v167 = wvr_vLN031 & (1 << wpm128) - 1;
    wvr_vLN031 >>>= wpm128;
    wvr_vLN032 -= wpm128;
    return wvr_v167;
  }
  function wfn43(wpm129) {
    var wvr_v168;
    var wvr_vLN033 = 0;
    for (wvr_v168 = 0; wvr_v168 < wpm129.length; wvr_v168++) {
      if (wpm129[wvr_v168] > wvr_vLN033) {
        wvr_vLN033 = wpm129[wvr_v168];
      }
    }
    if (wvr_vLN033 === 0) {
      return null;
    }
    var wvr_v169 = new Array(wvr_vLN033 + 1);
    for (wvr_v168 = 0; wvr_v168 <= wvr_vLN033; wvr_v168++) {
      wvr_v169[wvr_v168] = 0;
    }
    for (wvr_v168 = 0; wvr_v168 < wpm129.length; wvr_v168++) {
      if (wpm129[wvr_v168]) {
        wvr_v169[wpm129[wvr_v168]]++;
      }
    }
    var wvr_v170 = new Array(wvr_vLN033 + 1);
    var wvr_vLN034 = 0;
    for (var wvr_vLN17 = 1; wvr_vLN17 <= wvr_vLN033; wvr_vLN17++) {
      wvr_vLN034 = wvr_vLN034 + (wvr_v169[wvr_vLN17 - 1] || 0) << 1;
      wvr_v170[wvr_vLN17] = wvr_vLN034;
    }
    var wvr_v171 = 1 << wvr_vLN033;
    var wvr_v172 = new Int32Array(wvr_v171);
    for (wvr_v168 = 0; wvr_v168 < wvr_v171; wvr_v168++) {
      wvr_v172[wvr_v168] = -1;
    }
    for (var wvr_vLN035 = 0; wvr_vLN035 < wpm129.length; wvr_vLN035++) {
      var wvr_v173 = wpm129[wvr_vLN035];
      if (!wvr_v173) {
        continue;
      }
      var wvr_v174 = wvr_v170[wvr_v173]++;
      var wvr_vLN036 = 0;
      for (var wvr_vLN037 = 0; wvr_vLN037 < wvr_v173; wvr_vLN037++) {
        wvr_vLN036 = wvr_vLN036 << 1 | wvr_v174 & 1;
        wvr_v174 >>>= 1;
      }
      var wvr_v175 = 1 << wvr_v173;
      for (var wvr_vVLN036 = wvr_vLN036; wvr_vVLN036 < wvr_v171; wvr_vVLN036 += wvr_v175) {
        wvr_v172[wvr_vVLN036] = wvr_v173 << 16 | wvr_vLN035;
      }
    }
    return {
      table: wvr_v172,
      maxLen: wvr_vLN033
    };
  }
  function wfn44(wpm130) {
    if (!wpm130) {
      throw new Error("huffman table missing");
    }
    wfn41(wpm130.maxLen);
    var wvr_v176 = wpm130.table[wvr_vLN031 & (1 << wpm130.maxLen) - 1];
    if (wvr_v176 < 0) {
      throw new Error("bad huffman code");
    }
    var wvr_v177 = wvr_v176 >>> 16;
    wvr_vLN031 >>>= wvr_v177;
    wvr_vLN032 -= wvr_v177;
    return wvr_v176 & 65535;
  }
  var wvr_vA23 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var wvr_vA24 = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var wvr_vA25 = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var wvr_vA26 = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  var wvr_v178 = null;
  var wvr_v179 = null;
  function wfn45() {
    if (wvr_v178) {
      return;
    }
    var wvr_v180 = new Array(288);
    var wvr_v181;
    for (wvr_v181 = 0; wvr_v181 < 144; wvr_v181++) {
      wvr_v180[wvr_v181] = 8;
    }
    for (wvr_v181 = 144; wvr_v181 < 256; wvr_v181++) {
      wvr_v180[wvr_v181] = 9;
    }
    for (wvr_v181 = 256; wvr_v181 < 280; wvr_v181++) {
      wvr_v180[wvr_v181] = 7;
    }
    for (wvr_v181 = 280; wvr_v181 < 288; wvr_v181++) {
      wvr_v180[wvr_v181] = 8;
    }
    wvr_v178 = wfn43(wvr_v180);
    var wvr_v182 = new Array(30);
    for (wvr_v181 = 0; wvr_v181 < 30; wvr_v181++) {
      wvr_v182[wvr_v181] = 5;
    }
    wvr_v179 = wfn43(wvr_v182);
  }
  var wvr_vLN038 = 0;
  do {
    wvr_vLN038 = wfn42(1);
    var wvr_vF42 = wfn42(2);
    if (wvr_vF42 === 0) {
      wvr_vLN031 = 0;
      wvr_vLN032 = 0;
      if (wvr_v166 + 4 > wpm125) {
        throw new Error("stored block eof");
      }
      var wvr_v183 = wpm123[wvr_v166] & 255 | (wpm123[wvr_v166 + 1] & 255) << 8;
      wvr_v166 += 4;
      if (wvr_v166 + wvr_v183 > wpm125) {
        throw new Error("stored block overflow");
      }
      wfn40(wvr_v183);
      for (var wvr_vLN039 = 0; wvr_vLN039 < wvr_v183; wvr_vLN039++) {
        wvr_v163[wvr_vLN030++] = wpm123[wvr_v166 + wvr_vLN039];
      }
      wvr_v166 += wvr_v183;
    } else if (wvr_vF42 === 1 || wvr_vF42 === 2) {
      var wvr_v184 = null;
      var wvr_v185 = null;
      if (wvr_vF42 === 1) {
        wfn45();
        wvr_v184 = wvr_v178;
        wvr_v185 = wvr_v179;
      } else {
        var wvr_v186 = wfn42(5) + 257;
        var wvr_v187 = wfn42(5) + 1;
        var wvr_v188 = wfn42(4) + 4;
        var wvr_vA27 = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
        var wvr_v189 = new Array(19);
        var wvr_v190;
        for (wvr_v190 = 0; wvr_v190 < 19; wvr_v190++) {
          wvr_v189[wvr_v190] = 0;
        }
        for (wvr_v190 = 0; wvr_v190 < wvr_v188; wvr_v190++) {
          wvr_v189[wvr_vA27[wvr_v190]] = wfn42(3);
        }
        var wvr_vF43 = wfn43(wvr_v189);
        var wvr_v191 = wvr_v186 + wvr_v187;
        var wvr_v192 = new Array(wvr_v191);
        var wvr_vLN040 = 0;
        while (wvr_vLN040 < wvr_v191) {
          var wvr_vF44 = wfn44(wvr_vF43);
          if (wvr_vF44 < 16) {
            wvr_v192[wvr_vLN040++] = wvr_vF44;
          } else if (wvr_vF44 === 16) {
            if (wvr_vLN040 === 0) {
              throw new Error("bad repeat 16");
            }
            var wvr_v193 = wvr_v192[wvr_vLN040 - 1];
            var wvr_v194 = 3 + wfn42(2);
            if (wvr_vLN040 + wvr_v194 > wvr_v191) {
              throw new Error("repeat16 overflow");
            }
            while (wvr_v194-- > 0) {
              wvr_v192[wvr_vLN040++] = wvr_v193;
            }
          } else if (wvr_vF44 === 17) {
            var wvr_v195 = 3 + wfn42(3);
            if (wvr_vLN040 + wvr_v195 > wvr_v191) {
              throw new Error("repeat17 overflow");
            }
            while (wvr_v195-- > 0) {
              wvr_v192[wvr_vLN040++] = 0;
            }
          } else {
            var wvr_v196 = 11 + wfn42(7);
            if (wvr_vLN040 + wvr_v196 > wvr_v191) {
              throw new Error("repeat18 overflow");
            }
            while (wvr_v196-- > 0) {
              wvr_v192[wvr_vLN040++] = 0;
            }
          }
        }
        wvr_v184 = wfn43(wvr_v192.slice(0, wvr_v186));
        wvr_v185 = wfn43(wvr_v192.slice(wvr_v186, wvr_v191));
      }
      while (true) {
        var wvr_vF442 = wfn44(wvr_v184);
        if (wvr_vF442 < 256) {
          wfn40(1);
          wvr_v163[wvr_vLN030++] = wvr_vF442;
        } else if (wvr_vF442 === 256) {
          break;
        } else {
          var wvr_v197 = wvr_vF442 - 257;
          if (wvr_v197 < 0 || wvr_v197 >= wvr_vA23.length) {
            throw new Error("bad length code");
          }
          var wvr_v198 = wvr_vA23[wvr_v197] + wfn42(wvr_vA24[wvr_v197]);
          var wvr_vF443 = wfn44(wvr_v185);
          if (wvr_vF443 >= wvr_vA25.length) {
            throw new Error("bad dist code");
          }
          var wvr_v199 = wvr_vA25[wvr_vF443] + wfn42(wvr_vA26[wvr_vF443]);
          var wvr_v200 = wvr_vLN030 - wvr_v199;
          if (wvr_v200 < 0) {
            throw new Error("bad dist range");
          }
          wfn40(wvr_v198);
          for (var wvr_vLN041 = 0; wvr_vLN041 < wvr_v198; wvr_vLN041++) {
            wvr_v163[wvr_vLN030++] = wvr_v163[wvr_v200 + wvr_vLN041];
          }
        }
      }
    } else {
      throw new Error("bad block type");
    }
  } while (!wvr_vLN038);
  return wvr_v163.subarray(0, wvr_vLN030);
}
function wfn46(wpm131) {
  try {
    if (!wpm131 || wpm131.length < 33) {
      return null;
    }
    if (wpm131[0] !== 137 || wpm131[1] !== 80 || wpm131[2] !== 78 || wpm131[3] !== 71) {
      return null;
    }
    var wvr_v201 = (wpm131[8] << 24 | wpm131[9] << 16 | wpm131[10] << 8 | wpm131[11]) >>> 0;
    var wvr_v202 = String.fromCharCode(wpm131[12], wpm131[13], wpm131[14], wpm131[15]);
    if (wvr_v202 !== "IHDR" || wvr_v201 < 13) {
      return null;
    }
    var wvr_vLN163 = 16;
    return {
      width: (wpm131[wvr_vLN163] << 24 | wpm131[wvr_vLN163 + 1] << 16 | wpm131[wvr_vLN163 + 2] << 8 | wpm131[wvr_vLN163 + 3]) >>> 0,
      height: (wpm131[wvr_vLN163 + 4] << 24 | wpm131[wvr_vLN163 + 5] << 16 | wpm131[wvr_vLN163 + 6] << 8 | wpm131[wvr_vLN163 + 7]) >>> 0,
      bitDepth: wpm131[wvr_vLN163 + 8],
      colorType: wpm131[wvr_vLN163 + 9],
      interlace: wpm131[wvr_vLN163 + 12]
    };
  } catch (e13) {
    return null;
  }
}
function wfn47(wpm132) {
  try {
    wpm132 = wfn48(wpm132);
    if (!wpm132) {
      return null;
    }
    var wvr_vLN83 = 8;
    var wvr_vA28 = [];
    var wvr_vLN042 = 0;
    while (wvr_vLN83 + 8 <= wpm132.length) {
      var wvr_v203 = (wpm132[wvr_vLN83] << 24 | wpm132[wvr_vLN83 + 1] << 16 | wpm132[wvr_vLN83 + 2] << 8 | wpm132[wvr_vLN83 + 3]) >>> 0;
      var wvr_v204 = String.fromCharCode(wpm132[wvr_vLN83 + 4], wpm132[wvr_vLN83 + 5], wpm132[wvr_vLN83 + 6], wpm132[wvr_vLN83 + 7]);
      var wvr_v205 = wvr_vLN83 + 8;
      if (wvr_v203 > wpm132.length) {
        return null;
      }
      if (wvr_v204 === "IDAT") {
        wvr_vA28.push(wvr_v205);
        wvr_vA28.push(wvr_v205 + wvr_v203);
        wvr_vLN042 += wvr_v203;
      } else if (wvr_v204 === "IEND") {
        break;
      }
      wvr_vLN83 = wvr_v205 + wvr_v203 + 4;
    }
    if (wvr_vA28.length === 0 || wvr_vLN042 === 0) {
      return null;
    }
    var wvr_v206 = new Uint8Array(wvr_vLN042);
    var wvr_vLN043 = 0;
    for (var wvr_vLN044 = 0; wvr_vLN044 < wvr_vA28.length; wvr_vLN044 += 2) {
      wvr_v206.set(wpm132.subarray(wvr_vA28[wvr_vLN044], wvr_vA28[wvr_vLN044 + 1]), wvr_vLN043);
      wvr_vLN043 += wvr_vA28[wvr_vLN044 + 1] - wvr_vA28[wvr_vLN044];
    }
    return wvr_v206;
  } catch (e14) {
    return null;
  }
}
function wfn48(wpm133) {
  if (!wpm133 || !wpm133.length) {
    return null;
  }
  if (wpm133 instanceof Uint8Array) {
    return wpm133;
  } else {
    return new Uint8Array(wpm133);
  }
}
function wfn49(wpm134) {
  try {
    var wvr_vF48 = wfn48(wpm134);
    if (!wvr_vF48) {
      return null;
    }
    var wvr_vF46 = wfn46(wvr_vF48);
    if (!wvr_vF46) {
      return null;
    }
    if (wvr_vF46.interlace !== 0 || wvr_vF46.bitDepth !== 8) {
      return null;
    }
    var wvr_v207 = wvr_vF46.colorType;
    if (wvr_v207 !== 0 && wvr_v207 !== 2 && wvr_v207 !== 4 && wvr_v207 !== 6) {
      return null;
    }
    var wvr_v208 = wvr_vF46.width;
    var wvr_v209 = wvr_vF46.height;
    if (wvr_v208 <= 0 || wvr_v209 <= 0) {
      return null;
    }
    var wvr_v210 = wvr_v207 === 6 ? 4 : wvr_v207 === 2 ? 3 : wvr_v207 === 4 ? 2 : 1;
    var wvr_vF47 = wfn47(wvr_vF48);
    if (!wvr_vF47) {
      return null;
    }
    var wvr_vF39 = wfn39(wvr_vF47, 0, wvr_vF47.length);
    if (!wvr_vF39) {
      return null;
    }
    var wvr_v211 = wvr_v208 * wvr_v210;
    if (wvr_vF39.length < (wvr_v211 + 1) * wvr_v209) {
      return null;
    }
    var wvr_v212 = new Uint8Array(wvr_v211 * wvr_v209);
    var wvr_v213 = new Uint8Array(wvr_v211);
    var wvr_v214 = new Uint8Array(wvr_v211);
    var wvr_vLN045 = 0;
    for (var wvr_vLN046 = 0; wvr_vLN046 < wvr_v209; wvr_vLN046++) {
      var wvr_v215 = wvr_vF39[wvr_vLN045];
      wvr_vLN045++;
      for (var wvr_vLN047 = 0; wvr_vLN047 < wvr_v211; wvr_vLN047++) {
        var wvr_v216 = wvr_vF39[wvr_vLN045 + wvr_vLN047];
        var wvr_v217 = wvr_vLN047 >= wvr_v210 ? wvr_v214[wvr_vLN047 - wvr_v210] : 0;
        var wvr_v218 = wvr_v213[wvr_vLN047];
        var wvr_v219 = wvr_vLN047 >= wvr_v210 ? wvr_v213[wvr_vLN047 - wvr_v210] : 0;
        var wvr_v220;
        if (wvr_v215 === 0) {
          wvr_v220 = wvr_v216;
        } else if (wvr_v215 === 1) {
          wvr_v220 = wvr_v216 + wvr_v217;
        } else if (wvr_v215 === 2) {
          wvr_v220 = wvr_v216 + wvr_v218;
        } else if (wvr_v215 === 3) {
          wvr_v220 = wvr_v216 + (wvr_v217 + wvr_v218 >> 1);
        } else if (wvr_v215 === 4) {
          wvr_v220 = wvr_v216 + wfn38(wvr_v217, wvr_v218, wvr_v219);
        } else {
          return null;
        }
        wvr_v214[wvr_vLN047] = wvr_v220 & 255;
      }
      wvr_v212.set(wvr_v214, wvr_vLN046 * wvr_v211);
      wvr_vLN045 += wvr_v211;
      var wvr_vV213 = wvr_v213;
      wvr_v213 = wvr_v214;
      wvr_v214 = wvr_vV213;
    }
    return {
      width: wvr_v208,
      height: wvr_v209,
      channels: wvr_v210,
      colorType: wvr_v207,
      rows: wvr_v212
    };
  } catch (e15) {
    return null;
  }
}
function wfn50(wpm135, wpm136) {
  try {
    var wvr_v221 = wpm136 === undefined || wpm136 === null ? wvr_vLN82 : wpm136;
    var wvr_vF482 = wfn48(wpm135);
    if (!wvr_vF482) {
      return null;
    }
    var wvr_vF462 = wfn46(wvr_vF482);
    if (!wvr_vF462) {
      return null;
    }
    if (wvr_vF462.colorType !== 6 && wvr_vF462.colorType !== 4) {
      return null;
    }
    var wvr_v222 = wvr_vF462.width;
    var wvr_v223 = wvr_vF462.height;
    if (wvr_v222 * wvr_v223 > wvr_vLN16000000) {
      return null;
    }
    var wvr_vF49 = wfn49(wvr_vF482);
    if (!wvr_vF49) {
      return null;
    }
    var wvr_v224 = wvr_vF49.channels;
    var wvr_v225 = wvr_v224 - 1;
    var wvr_vV222 = wvr_v222;
    var wvr_vV223 = wvr_v223;
    var wvr_v226 = -1;
    var wvr_v227 = -1;
    for (var wvr_vLN048 = 0; wvr_vLN048 < wvr_v223; wvr_vLN048++) {
      var wvr_v228 = wvr_vLN048 * wvr_v222 * wvr_v224;
      for (var wvr_vLN049 = 0; wvr_vLN049 < wvr_v222; wvr_vLN049++) {
        if (wvr_vF49.rows[wvr_v228 + wvr_vLN049 * wvr_v224 + wvr_v225] > wvr_v221) {
          if (wvr_vLN049 < wvr_vV222) {
            wvr_vV222 = wvr_vLN049;
          }
          if (wvr_vLN049 > wvr_v226) {
            wvr_v226 = wvr_vLN049;
          }
          if (wvr_vLN048 < wvr_vV223) {
            wvr_vV223 = wvr_vLN048;
          }
          if (wvr_vLN048 > wvr_v227) {
            wvr_v227 = wvr_vLN048;
          }
        }
      }
    }
    if (wvr_v226 < wvr_vV222 || wvr_v227 < wvr_vV223) {
      return null;
    }
    if (wvr_vV222 === 0 && wvr_vV223 === 0 && wvr_v226 === wvr_v222 - 1 && wvr_v227 === wvr_v223 - 1) {
      return null;
    }
    return {
      x: wvr_vV222,
      y: wvr_vV223,
      w: wvr_v226 - wvr_vV222 + 1,
      h: wvr_v227 - wvr_vV223 + 1,
      width: wvr_v222,
      height: wvr_v223
    };
  } catch (e16) {
    return null;
  }
}
function wfn51(wpm137) {
  try {
    var wvr_vF492 = wfn49(wfn48(wpm137));
    if (!wvr_vF492) {
      return null;
    }
    var wvr_v229 = wvr_vF492.colorType;
    var wvr_v230 = wvr_vF492.channels;
    var wvr_v231 = wvr_vF492.width;
    var wvr_v232 = wvr_vF492.height;
    var wvr_vLN050 = 0;
    var wvr_vLN051 = 0;
    for (var wvr_vLN052 = 0; wvr_vLN052 < wvr_v232; wvr_vLN052++) {
      var wvr_v233 = wvr_vLN052 * wvr_v231 * wvr_v230;
      for (var wvr_vLN053 = 0; wvr_vLN053 < wvr_v231; wvr_vLN053++) {
        var wvr_v234 = wvr_v233 + wvr_vLN053 * wvr_v230;
        var wvr_v235;
        var wvr_v236;
        var wvr_v237;
        var wvr_v238;
        if (wvr_v230 === 4) {
          wvr_v235 = wvr_vF492.rows[wvr_v234];
          wvr_v236 = wvr_vF492.rows[wvr_v234 + 1];
          wvr_v237 = wvr_vF492.rows[wvr_v234 + 2];
          wvr_v238 = wvr_vF492.rows[wvr_v234 + 3];
        } else if (wvr_v230 === 3) {
          wvr_v235 = wvr_vF492.rows[wvr_v234];
          wvr_v236 = wvr_vF492.rows[wvr_v234 + 1];
          wvr_v237 = wvr_vF492.rows[wvr_v234 + 2];
          wvr_v238 = 255;
        } else if (wvr_v230 === 2) {
          wvr_v235 = wvr_vF492.rows[wvr_v234];
          wvr_v236 = wvr_vF492.rows[wvr_v234];
          wvr_v237 = wvr_vF492.rows[wvr_v234];
          wvr_v238 = wvr_vF492.rows[wvr_v234 + 1];
        } else {
          wvr_v235 = wvr_vF492.rows[wvr_v234];
          wvr_v236 = wvr_vF492.rows[wvr_v234];
          wvr_v237 = wvr_vF492.rows[wvr_v234];
          wvr_v238 = 255;
        }
        if (wvr_v238 === 0) {
          continue;
        }
        wvr_vLN050 += wvr_v235 * 0.299 + wvr_v236 * 0.587 + wvr_v237 * 0.114;
        wvr_vLN051++;
      }
    }
    if (wvr_vLN051 === 0) {
      return null;
    }
    return wvr_vLN050 / wvr_vLN051 / 255;
  } catch (e17) {
    return null;
  }
}


// ========= UI：卡片（V6 版式：参照 zeeho签到 v1.1.0 中尺寸布局重排） =========
// 结构：Header（首字圆+车名+签到胶囊）→ 骑行行 → 车图+电量区 → 统计卡片 → 近7天日历 → Footer（发布状态+时间）
async function buildWidgetCard(data, chargeStateStr = "未充电") {
  const w = new ListWidget();
  // ===== 背景（参照 zeeho签到 v1.1.0）：默认蓝紫渐变；设置了自定义背景图则自动适配明暗 =====
  const v4 = setupWidgetBackground(w, (config.widgetFamily || "medium"));
  const CONTENT_W = 324; // 348pt 组件宽 - 左右 padding 12×2
  w.setPadding(7, 12, 7, 12);
  w.spacing = 2;
  try { const runUrl = URLScheme.forRunningScript(); if (runUrl) w.url = runUrl; } catch (_) { }

  // ===== 数据抽取 =====
  const vehicleName = data.vehicleDisplayName || "车辆";
  logDebug("Widget 车辆名称", vehicleName);
  const signed = !!data.signedToday;
  const cdays = Number(data.points && data.points.continueDays || 0);
  const untilBox = Number(data.points && data.points.daysUntilLottery || 0);
  const isBlindDay = !!(data.points && data.points.isBlindDay);
  const monthSigned = Number(data.points && data.points.monthSignedDays || 0);
  const last7 = Array.isArray(data.last7Status) ? data.last7Status : [];
  const pct = Math.round(Number(data.batteryPercent || 0));
  const socLv = socLevelOf(pct);
  const range = Number(data.residualRangeKm || 0);
  const volt = Number(data.voltage || 0);
  const isCharging = chargeStateStr && chargeStateStr !== "未充电";
  const totalVal = Number(data.points && data.points.total || 0);
  const todayVal = Number(data.points && data.points.today || 0);
  const plate = String(data.licensePlate || "").trim();

  // ===== 第一行：Header =====
  zHeaderRow(w, v4, vehicleName, signed, false);

  // ===== 第二行：骑行（上次骑行 ｜ 今日骑行 · 极速）=====
  const rideSegs = zBuildRideSegs(data.today);
  if (rideSegs.length) zRideRow(w, v4, rideSegs, 11);

  // ===== 第三行：主体（左 35% 车图 | 右：电量大数字 + 续航/电压/车牌 + 电量条）=====
  const body = w.addStack();
  body.layoutHorizontally();
  body.centerAlignContent();
  body.size = new Size(CONTENT_W, 48);
  const leftW = Math.round(CONTENT_W * 0.35);
  const picCol = body.addStack();
  picCol.layoutVertically();
  picCol.centerAlignContent();
  picCol.size = new Size(leftW, 48);
  await zAddVehicleImage(picCol, data, Math.max(20, leftW - 4), 46, v4, "center");
  body.addSpacer(6);
  const infoW = Math.max(80, CONTENT_W - leftW - 6);
  const infoCol = body.addStack();
  infoCol.layoutVertically();
  infoCol.centerAlignContent();
  infoCol.size = new Size(infoW, 48);
  infoCol.addSpacer();
  const pctRow = infoCol.addStack();
  pctRow.layoutHorizontally();
  pctRow.centerAlignContent();
  const pctT = pctRow.addText(`${pct}%${data.batteryPercentEstimated ? "（估）" : ""}`);
  pctT.font = Font.boldSystemFont(24);
  pctT.textColor = socColor(v4, pct);
  pctT.lineLimit = 1;
  applyTextShadow(pctT, v4);
  if (isCharging) {
    const chT = pctRow.addText(" ⚡" + String(chargeStateStr).slice(0, 8));
    chT.font = Font.boldSystemFont(9);
    chT.textColor = new Color(v4.ink2);
    chT.lineLimit = 1;
  }
  infoCol.addSpacer(2);
  const metaRow = infoCol.addStack();
  metaRow.layoutHorizontally();
  metaRow.centerAlignContent();
  metaRow.spacing = 6;
  const rangeT = metaRow.addText(range > 0 ? `续航 ${range}km` : "续航 --");
  rangeT.font = Font.boldSystemFont(9);
  rangeT.textColor = new Color(v4.ink2);
  rangeT.lineLimit = 1;
  applyTextShadow(rangeT, v4, 0.8);
  if (volt > 0) {
    const voltT = metaRow.addText(`${volt.toFixed(1)}V`);
    voltT.font = Font.boldSystemFont(9);
    voltT.textColor = new Color(v4.ink2);
    voltT.lineLimit = 1;
    applyTextShadow(voltT, v4, 0.8);
  }
  if (plate) {
    const plateT = metaRow.addText(plate);
    plateT.font = Font.boldSystemFont(9);
    plateT.textColor = new Color(v4.ink2);
    plateT.lineLimit = 1;
    applyTextShadow(plateT, v4, 0.8);
  }
  infoCol.addSpacer(3);
  zChargeBar(infoCol, v4, infoW - 4, 6, pct, socLv);
  infoCol.addSpacer();

  // ===== 第四行：统计小卡片（积分 / 连签 / 本月已签 / 盲盒）=====
  zStatCardsRow(w, v4, [
    { label: "积分", value: String(totalVal), size: 12 },
    { label: "连签", value: cdays > 0 ? cdays + "天" : "--", size: 12 },
    { label: "本月已签", value: monthSigned > 0 ? monthSigned + "天" : "--", size: 12 },
    { label: "盲盒", value: isBlindDay ? "🎁可开" : (untilBox > 0 ? untilBox + "天" : "--"), size: 12 },
  ], 26, CONTENT_W);

  // ===== 第五行：近7天签到日历 =====
  zWeekRow(w, v4, last7, CONTENT_W);

  // ===== 第六行：Footer（发布状态 + 时间）=====
  zFooterRow(w, v4, zPostStatusText(data), zShortClock());
  return w;
}

// ========= UI：小尺寸组件 =========
async function buildSmallWidget(data, batteryInfo = {}) {
  const w = new ListWidget();
  // ===== 背景（参照 zeeho签到 v1.1.0）：默认蓝紫渐变；设置了自定义背景图则自动适配明暗 =====
  const v4 = setupWidgetBackground(w, "small");
  const pct = Math.round(Number(data.batteryPercent || 0));
  const C_BATT = socColor(v4, pct);
  const C_NAME = new Color(v4.accent);
  const C_TEXT_FAINT = new Color(v4.muted);
  const C_OK = new Color(v4.ok);
  const C_DANGER = new Color(v4.err);
  const charging = (batteryInfo.chargeStateStr && batteryInfo.chargeStateStr !== "未充电");
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
  const pctTxt = pctRow.addText(`${pct}%${data.batteryPercentEstimated ? "（估）" : ""}`);
  pctTxt.font = Font.heavySystemFont(24);
  pctTxt.textColor = C_BATT;
  applyTextShadow(pctTxt, v4);
  if (charging) {
    const bolt = pctRow.addText(" ⚡");
    bolt.font = Font.systemFont(11);
    bolt.textColor = C_OK;
  }
  pctRow.addSpacer();

  w.addSpacer(3);

  let barFillColor;
  if (charging) barFillColor = new Color(v4.ok);
  else barFillColor = socColor(v4, pct);
  const bar = w.addImage(drawProgressBar(pct, 120, 6, barFillColor, palColor(v4.trk)));
  bar.imageSize = new Size(120, 6);

  w.addSpacer(3);

  const bottom = w.addStack();
  bottom.layoutHorizontally();
  bottom.centerAlignContent();
  const rangeTxt = bottom.addText(`${data.residualRangeKm}km`);
  rangeTxt.font = Font.systemFont(9);
  rangeTxt.textColor = new Color(v4.ink);
  bottom.addSpacer();
  const signed = !!data.signedToday;
  const signTxt = bottom.addText(signed ? "●已签" : "○未签");
  signTxt.font = Font.systemFont(8);
  signTxt.textColor = signed ? C_OK : C_DANGER;
  bottom.addSpacer(3);
  const daysTxt = bottom.addText(`连${Number(data.points && data.points.continueDays || 0)}天`);
  daysTxt.font = Font.systemFont(8);
  daysTxt.textColor = C_TEXT_FAINT;
  return w;
}

// ========= UI：大尺寸组件（V4 版式：参照 zeeho签到 v1.1.0 大尺寸布局重排） =========
// 结构：Header → 骑行行 → 电量Hero（左大数字/右车图+胎压）→ 统计卡片 → 近7天日历 → 停车位置 → Footer
async function buildLargeWidget(data, batteryInfo = {}, chargeStateStr = "未充电") {
  const w = new ListWidget();
  // ===== 背景（参照 zeeho签到 v1.1.0）：默认蓝紫渐变；设置了自定义背景图则自动适配明暗 =====
  const v4 = setupWidgetBackground(w, "large");
  const CONTENT_W = 318; // 348pt 组件宽 - 左右 padding 15×2
  w.setPadding(14, 15, 14, 15);
  w.spacing = 6;
  try { const runUrl = URLScheme.forRunningScript(); if (runUrl) w.url = runUrl; } catch (_) { }

  // ===== 数据抽取 =====
  const vehicleName = data.vehicleDisplayName || "车辆";
  const signed = !!data.signedToday;
  const cdays = Number(data.points && data.points.continueDays || 0);
  const untilBox = Number(data.points && data.points.daysUntilLottery || 0);
  const isBlindDay = !!(data.points && data.points.isBlindDay);
  const monthSigned = Number(data.points && data.points.monthSignedDays || 0);
  const last7 = Array.isArray(data.last7Status) ? data.last7Status : [];
  const pct = Math.round(Number(data.batteryPercent || 0));
  const socLv = socLevelOf(pct);
  const range = Number(data.residualRangeKm || 0);
  const isCharging = chargeStateStr && chargeStateStr !== "未充电";
  const totalVal = Number(data.points && data.points.total || 0);
  const todayVal = Number(data.points && data.points.today || 0);
  const tp = data.tire || {};
  const frontUnbound = !tp.frontPressure || tp.frontPressure === "未绑定";
  const rearUnbound = !tp.rearPressure || tp.rearPressure === "未绑定";
  const hasTire = !(frontUnbound && rearUnbound);

  // ===== 第一行：Header（大）=====
  zHeaderRow(w, v4, vehicleName, signed, true);

  // ===== 第二行：骑行 =====
  const rideSegs = zBuildRideSegs(data.today);
  if (rideSegs.length) zRideRow(w, v4, rideSegs, 12);

  // ===== 第三行：电量 Hero（左 40%：大数字/充电/续航/电压电流温度/电量条 | 右 60%：车图 + 胎压）=====
  const hero = w.addStack();
  hero.layoutHorizontally();
  hero.centerAlignContent();
  hero.size = new Size(CONTENT_W, 122);
  const leftW = Math.round(CONTENT_W * 0.4);
  const leftCol = hero.addStack();
  leftCol.layoutVertically();
  leftCol.centerAlignContent();
  leftCol.size = new Size(leftW, 122);
  leftCol.addSpacer();
  const pctT = leftCol.addText(`${pct}%${data.batteryPercentEstimated ? "（估）" : ""}`);
  pctT.font = Font.boldSystemFont(38);
  pctT.textColor = socColor(v4, pct);
  pctT.lineLimit = 1;
  applyTextShadow(pctT, v4);
  leftCol.addSpacer(3);
  const chRow = leftCol.addStack();
  chRow.layoutHorizontally();
  chRow.centerAlignContent();
  const chT = chRow.addText(isCharging ? "⚡" + String(chargeStateStr).slice(0, 6) : "未充电");
  chT.font = Font.boldSystemFont(11);
  chT.textColor = new Color(v4.ink2);
  chT.lineLimit = 1;
  applyTextShadow(chT, v4);
  if (range > 0) {
    chRow.addSpacer(6);
    const rangeT = chRow.addText(`续航 ${range}km`);
    rangeT.font = Font.boldSystemFont(10);
    rangeT.textColor = new Color(v4.ink2);
    rangeT.lineLimit = 1;
    rangeT.minimumScaleFactor = 0.8;
    applyTextShadow(rangeT, v4, 0.8);
  }
  leftCol.addSpacer(4);
  const voltVal = Number(batteryInfo.voltage || 0);
  const curVal = Number(batteryInfo.current || 0);
  const tempVal = Number(batteryInfo.batteryTemp || 0);
  const vParts = [];
  if (voltVal > 0) vParts.push(voltVal.toFixed(1) + "V");
  if (curVal) vParts.push(curVal.toFixed(1) + "A");
  if (tempVal) vParts.push(tempVal.toFixed(0) + "℃");
  if (vParts.length) {
    const vT = leftCol.addText(vParts.join(" · "));
    vT.font = Font.boldSystemFont(9);
    vT.textColor = new Color(v4.ink2);
    vT.lineLimit = 1;
    applyTextShadow(vT, v4, 0.8);
  }
  leftCol.addSpacer(5);
  zChargeBar(leftCol, v4, leftW, 9, pct, socLv);
  leftCol.addSpacer();
  hero.addSpacer(8);
  const rightW = CONTENT_W - leftW - 8;
  const rightCol = hero.addStack();
  rightCol.layoutVertically();
  rightCol.centerAlignContent();
  rightCol.size = new Size(rightW, 122);
  await zAddVehicleImage(rightCol, data, rightW, hasTire ? 96 : 118, v4, "right");
  if (hasTire) {
    rightCol.addSpacer(4);
    const tireRow = rightCol.addStack();
    tireRow.layoutHorizontally();
    tireRow.centerAlignContent();
    const tireT = tireRow.addText(
      frontUnbound && !rearUnbound ? `胎压 后 ${tp.rearPressure}${tp.rearTemp ? " " + tp.rearTemp : ""}` :
        rearUnbound && !frontUnbound ? `胎压 前 ${tp.frontPressure}${tp.frontTemp ? " " + tp.frontTemp : ""}` :
          `胎压 前 ${tp.frontPressure || "未绑"}${tp.frontTemp ? " " + tp.frontTemp : ""} · 后 ${tp.rearPressure || "未绑"}${tp.rearTemp ? " " + tp.rearTemp : ""}`
    );
    tireT.font = Font.boldSystemFont(10);
    tireT.textColor = new Color(v4.ink2);
    tireT.lineLimit = 1;
    tireT.minimumScaleFactor = 0.7;
    applyTextShadow(tireT, v4, 0.8);
    tireRow.addSpacer();
  }
  rightCol.addSpacer(2);

  // ===== 第四行：统计小卡片 2×2 两排（填满地址下方的空位）=====
  zStatCardsRow(w, v4, [
    { label: "积分", value: String(totalVal), size: 14 },
    { label: "连签", value: cdays > 0 ? cdays + "天" : "--", size: 14 },
  ], 36, CONTENT_W);
  zStatCardsRow(w, v4, [
    { label: "本月已签", value: monthSigned > 0 ? monthSigned + "天" : "--", size: 14 },
    { label: "盲盒", value: isBlindDay ? "🎁可开" : (untilBox > 0 ? untilBox + "天" : "--"), size: 14 },
  ], 36, CONTENT_W);

  // ===== 第五行：近7天签到日历 =====
  zWeekRow(w, v4, last7, CONTENT_W);

  // ===== 第六行：停车位置（v2.4 特有，有数据才显示）=====
  if (data.address) {
    const addrRow = w.addStack();
    addrRow.layoutHorizontally();
    addrRow.centerAlignContent();
    const addr = addrRow.addText(`📍 ${data.address}`);
    addr.font = Font.systemFont(9);
    addr.textColor = new Color(v4.ink2);
    addr.lineLimit = 1;
    applyTextShadow(addr, v4, 0.8);
  }

  w.addSpacer();
  // ===== Footer：发布状态 + 时间 =====
  zFooterRow(w, v4, zPostStatusText(data), zShortClock());
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
  const t = w.addText(`${pct}%${data.batteryPercentEstimated ? "（估）" : ""}`);
  t.font = Font.semiboldSystemFont(9);
  t.textColor = Color.white(); // 锁屏背景偏暗，默认黑字不可见
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
  nameT.textColor = Color.white(); // 锁屏深色背景，默认黑字不可见
  row1.addSpacer();
  const signT = row1.addText(data.signedToday ? "●已签" : "○未签");
  signT.font = Font.systemFont(10);
  signT.textColor = Color.white();
  const row2 = w.addStack();
  row2.layoutHorizontally();
  row2.centerAlignContent();
  const pctT = row2.addText(`${Math.round(Number(data.batteryPercent || 0))}%${data.batteryPercentEstimated ? "（估）" : ""}`);
  pctT.font = Font.systemFont(12);
  pctT.textColor = Color.white();
  row2.addSpacer(4);
  const rangeT = row2.addText(`${data.residualRangeKm}km`);
  rangeT.font = Font.systemFont(11);
  rangeT.textColor = Color.white();
  row2.addSpacer();
  const ptsT = row2.addText(`${Number(data.points && data.points.total || 0)}分`);
  ptsT.font = Font.systemFont(10);
  ptsT.textColor = Color.white();
  return w;
}

function buildAccessoryInline(data) {
  const w = new ListWidget();
  const t = w.addText(`${Math.round(Number(data.batteryPercent || 0))}%${data.batteryPercentEstimated ? "（估）" : ""} · ${data.residualRangeKm}km · ${data.signedToday ? "●已签" : "○未签"}`);
  t.font = Font.systemFont(12);
  t.textColor = Color.white();
  return w;
}

// ============== v1.7 多车轻量状态（大尺寸组件用） ==============
// v1.8 自动同步车辆列表：App 新绑定的车辆自动并入账号（组件多车自动填充，静默失败不影响渲染）
async function syncVehiclesLite(acc, store) {
  try {
    const res = await fetchVehicleList({ token: acc.token });
    const items = mapVehicleList(res).filter((v) => v.vinNo);
    if (!items.length) return;
    const known = new Set((acc.vehicles || []).map((v) => v.vinNo));
    let changed = false;
    for (const v of items) if (!known.has(v.vinNo)) { (acc.vehicles = acc.vehicles || []).push(v); changed = true; }
    if (changed) {
      if (!acc.activeVin && acc.vehicles[0]) acc.activeVin = acc.vehicles[0].vinNo;
      if (store) saveStore(store);
    }
  } catch (e) { }
}

// ============== v2.2 当天总电耗：SOC 日追踪（放电+回充） ==============
function localDateStr10() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function trackDailyEnergy(vin, soc, store) {
  const e = (store && (store.energy = store.energy || {})) || {};
  const rec = e[vin] || (e[vin] = { date: "", start: 0, last: 0, gain: 0 });
  const today = localDateStr10();
  const s = Number(soc || 0);
  if (rec.date !== today) { rec.date = today; rec.start = s; rec.last = s; rec.gain = 0; }
  const delta = s - rec.last;
  if (delta > 0) rec.gain += delta; // 充电/换电回充补偿
  rec.last = s;
  const consumed = Math.max(0, rec.start - s) + rec.gain;
  return { consumedPct: Math.min(100, consumed), chargedPct: rec.gain };
}

async function fetchVehiclesLite(acc, store) {
  const vs = (acc.vehicles || []).slice(0, 3);
  return await Promise.all(vs.map(async (v) => {
    const dev = getDeviceIdentify(acc);
    const [wRaw, b, tireRaw, rideRaw, hpRaw] = await Promise.all([
      fetchVehicleWidgets({ vinNo: v.vinNo, token: acc.token }).catch(() => ({})),
      fetchBatteryInfo({ vinNo: v.vinNo, token: acc.token }).catch(() => ({ chargeStateStr: "未充电", soc: 0, voltage: 0 })),
      fetchTirePressure({ vinNo: v.vinNo, token: acc.token }).catch(() => ({})),
      fetchHomeRideInfo({ vinNo: v.vinNo, token: acc.token }).catch(() => ({})),
      fetchVehicleHomePage({ vehicleId: v.vinNo, uniqueIdentify: dev, token: acc.token }).catch(() => ({})),
    ]);
    const w = adaptWidgets(wRaw || {});
    const tp = adaptTirePressure(tireRaw || {});
    const rd = adaptTodayRide(rideRaw || {}, null);
    // v2.1：在线状态只有 vehicleHomePageV2 有（widgets 无该字段）；ONLINE/在线=联网（含关机），OFFLINE 才是失联
    const hd = (hpRaw && hpRaw.data) || {};
    const onlineRaw = String(hd.onlineStatus || hd.rideState || "").toLowerCase().trim();
    const online = onlineRaw.includes("online") || onlineRaw === "在线";
    const socNow = Number(w.batteryPercent || b.soc || 0);
    const chargingNow = !!b.chargeStateStr && b.chargeStateStr !== "未充电";
    // v2.2 当天总电耗：服务端 powerUseToday>0 优先；否则按容量×满电电压×当日(放电+回充)% 计算
    const srvRaw = b.powerUseToday;
    const srvKwh = (srvRaw == null || srvRaw === "" || !isFinite(Number(srvRaw))) ? null : Number(srvRaw);
    const trk = trackDailyEnergy(v.vinNo, socNow, store);
    let kwh = srvKwh && srvKwh > 0 ? srvKwh : null;
    const cfgE = (store && store.cfg) || {};
    if (kwh == null) {
      const ah = Number(cfgE.batteryAh || 0), vf = Number(cfgE.vFull || 0);
      if (ah > 0 && vf > 0) kwh = Math.round(trk.consumedPct / 100 * ah * vf) / 1000;
    }
    if (store) saveStore(store);
    return {
      vinNo: v.vinNo,
      name: v.name || "车辆",
      soc: socNow,
      socEstimated: !!(w.batteryPercentEstimated || b.socEstimated),
      range: Number(w.residualRangeKm || b.residualRangeKm || 0),
      voltage: Number(b.voltage || w.voltage || 0),
      charging: chargingNow,
      pic: String(v.pic || w.vehicleImageUrl || ""),
      online,
      address: w.address || "",
      todayKm: Number(rd.distanceKm || 0),
      powerToday: kwh,
      powerSrc: srvKwh && srvKwh > 0 ? "srv" : "calc",
      tireF: String(tp.frontPressure || ""),
      tireR: String(tp.rearPressure || ""),
      isCurrent: v.vinNo === acc.activeVin,
    };
  }));
}

async function buildLargeWidgetMulti(data) {
  const w = new ListWidget();
  // ===== 背景（参照 zeeho签到 v1.1.0）：默认蓝紫渐变；设置了自定义背景图则自动适配明暗 =====
  const v4 = setupWidgetBackground(w, "large");
  const C_NAME = new Color(v4.accent);
  const C_BATT = new Color(v4.ink);
  const C_TEXT = new Color(v4.ink2);
  const C_OK = new Color(v4.ok);
  const C_WARN = new Color(v4.warn);
  const C_DANGER = new Color(v4.err);
  const rows = Array.isArray(data.vehList) ? data.vehList.slice(0, 4) : [];
  const signed = !!data.signedToday;
  const cdays = Number(data.points && data.points.continueDays || 0);
  const untilBox = Number(data.points && data.points.daysUntilLottery || 0);
  w.setPadding(14, 16, 14, 16);
  w.spacing = 4;
  try { const runUrl = URLScheme.forRunningScript(); if (runUrl) w.url = runUrl; } catch (_) { }
  // 头部：账号名 + 签到徽章 + 盲盒 + 时间
  const rowTop = w.addStack();
  rowTop.layoutHorizontally();
  rowTop.centerAlignContent();
  rowTop.spacing = 5;
  const nameTxt = rowTop.addText(String(data.accountName || data.vehicleDisplayName || "ZEEHO"));
  nameTxt.font = Font.boldSystemFont(15);
  nameTxt.textColor = C_NAME;
  nameTxt.lineLimit = 1;
  rowTop.addSpacer();
  const badge = rowTop.addText(signed ? "●已签" : "○未签");
  badge.font = Font.systemFont(9);
  badge.textColor = signed ? C_OK : C_DANGER;
  rowTop.addSpacer(4);
  const boxTxt = rowTop.addText(data.points && data.points.isBlindDay ? "🎁盲盒日" : `盲盒${untilBox}天`);
  boxTxt.font = Font.systemFont(9);
  boxTxt.textColor = C_WARN;
  rowTop.addSpacer(4);
  const now = new Date();
  const timeTxt = rowTop.addText(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  timeTxt.font = Font.systemFont(9);
  timeTxt.textColor = C_TEXT;
  // 每车一张富信息卡片，自上而下顶部对齐；照片在右；末尾弹性 spacer 把积分行压到底部
  const show = rows.slice(0, 3);
  const tight = show.length >= 3;
  const imgH = tight ? 40 : 64;
  const imgW = Math.round(imgH * 1.55);
  const barW = Math.max(120, 300 - imgW - 12);
  for (let vi = 0; vi < show.length; vi++) {
    const v = show[vi];
    if (vi > 0) w.addSpacer(); // v2.3：剩余空间按车辆数均匀分布
    const pct = Math.round(Number(v.soc || 0));
    const card = w.addStack();
    card.layoutHorizontally();
    card.topAlignContent();
    card.spacing = 6;
    // zeeho 风格半透明卡片
    card.backgroundColor = palColor(v4.cardBg);
    card.cornerRadius = 10;
    card.setPadding(5, 8, 5, 8);
    const left = card.addStack();
    left.layoutVertically();
    left.size = new Size(barW, 0);
    const r1 = left.addStack();
    r1.layoutHorizontally();
    r1.centerAlignContent();
    r1.spacing = 4;
    const nm = r1.addText((v.isCurrent ? "★" : "") + String(v.name || "车辆"));
    nm.font = Font.semiboldSystemFont(tight ? 11 : 12);
    nm.textColor = v.isCurrent ? C_NAME : C_BATT;
    nm.lineLimit = 1;
    if (v.charging) { const ch = r1.addText(" ⚡"); ch.font = Font.systemFont(10); ch.textColor = C_OK; }
    if (v.socEstimated) { const est = r1.addText("（估）"); est.font = Font.systemFont(8); est.textColor = C_WARN; }
    r1.addSpacer(3);
    const onl = r1.addText(v.online ? "在线" : "离线");
    onl.font = Font.systemFont(8);
    onl.textColor = v.online ? C_OK : new Color(v4.muted);
    const r2 = left.addStack();
    r2.layoutHorizontally();
    r2.centerAlignContent();
    r2.spacing = 6;
    const big = r2.addText(`${pct}%`);
    big.font = Font.heavySystemFont(tight ? 18 : 21);
    big.textColor = v.charging ? C_OK : socColor(v4, pct);
    applyTextShadow(big, v4);
    const volt = Number(v.voltage || 0);
    const rangeTxt = Number(v.range) > 0 ? `${Number(v.range)}km` : (v.online ? "0km" : "—");
    const vr = r2.addText(`${rangeTxt}${volt > 0 ? " · " + volt.toFixed(1) + "V" : ""}`);
    vr.font = Font.systemFont(10);
    vr.textColor = C_TEXT;
    const barFill = v.charging ? new Color(v4.ok) : socColor(v4, pct);
    const bar = left.addImage(drawProgressBar(pct, barW, 5, barFill, palColor(v4.trk)));
    bar.imageSize = new Size(barW, 5);
    const r3 = left.addStack();
    r3.layoutHorizontally();
    const todayTxt = (v.online || Number(v.todayKm) > 0) ? `${Number(v.todayKm || 0).toFixed(1)}km` : "—";
    const kwhTxt = v.powerToday == null ? "—" : `${Number(v.powerToday).toFixed(2)}kWh${v.powerSrc === "calc" ? "（算）" : ""}`;
    const ride = r3.addText(`今日 ${todayTxt} · 电耗 ${kwhTxt}`);
    ride.font = Font.systemFont(tight ? 8 : 9);
    ride.textColor = C_TEXT;
    const hasTire = (v.tireF && v.tireF !== "未绑定") || (v.tireR && v.tireR !== "未绑定");
    if (hasTire) {
      const r4 = left.addStack();
      r4.layoutHorizontally();
      const tire = r4.addText(`胎压 前 ${v.tireF || "—"} · 后 ${v.tireR || "—"}`);
      tire.font = Font.systemFont(tight ? 8 : 9);
      tire.textColor = C_TEXT;
    }
    if (v.address) {
      const r5 = left.addStack();
      const addr = r5.addText(`📍 ${v.address}`);
      addr.font = Font.systemFont(tight ? 7 : 8);
      addr.textColor = C_TEXT;
      addr.lineLimit = 1;
    }
    card.addSpacer();
    const imgUrl = String(v.pic || "") || (v.isCurrent ? String(data.vehicleImageUrl || "") : "");
    if (imgUrl.trim() !== "") {
      try {
        const img = await loadVehicleImage(imgUrl);
        if (img) { const im = card.addImage(img); im.imageSize = new Size(imgW, imgH); im.applyFillingContentMode(); im.rightAlignImage(); }
      } catch (e) { }
    }
  }
  if (rows.length > 3) { const more = w.addText(`共 ${rows.length} 辆车（显示前 3 辆）`); more.font = Font.systemFont(8); more.textColor = C_TEXT; }
  w.addSpacer();
  w.addSpacer(2);
  // 积分行
  const rowPts = w.addStack();
  rowPts.layoutHorizontally();
  rowPts.centerAlignContent();
  rowPts.spacing = 5;
  const ptsL = rowPts.addText("积分");
  ptsL.font = Font.systemFont(10);
  ptsL.textColor = C_TEXT;
  const ptsV = rowPts.addText(`${Number(data.points && data.points.total || 0)} +${Number(data.points && data.points.today || 0)} · 连签${cdays}天`);
  ptsV.font = Font.semiboldSystemFont(11);
  ptsV.textColor = new Color(v4.accent);
  return w;
}

// ============== 组件分发（按尺寸） ==============
// 按组件尺寸选择构建器
async function buildWidgetForFamily(data, batteryInfo, chargeStateStr, family) {
  switch (String(family || "medium")) {
    case "small": return await buildSmallWidget(data, batteryInfo);
    case "large": return (Array.isArray(data.vehList) && data.vehList.length > 1) ? await buildLargeWidgetMulti(data) : await buildLargeWidget(data, batteryInfo, chargeStateStr);
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
// ========== 组件自动签到计划器（移植自竞品 zeeho签到 autoSignPlan，按需求改为 08:00 后执行） ==========
const WIDGET_SIGN_START_MIN = 480;      // 默认开始时间（当天分钟数，480=08:00）；实际以 cfg.widgetSignStartMin 为准（设置菜单可改）
const WIDGET_SIGN_RETRY_MS = 3600000;   // 08:00 后重试间隔：失败后 1 小时内不重复
const WIDGET_SIGN_PRODUCER_MS = 600000; // producer 保护：App 链路 10 分钟内刚完整跑过则组件不重复签

// 读取配置的签到开始时间（分钟数）与 HH:MM 显示
function widgetSignStartMinNow() {
  try {
    const cfg = (getStore() && getStore().cfg) || {};
    const n = Number(cfg.widgetSignStartMin);
    if (isFinite(n) && n >= 0 && n <= 1439) return Math.floor(n);
  } catch (e) { }
  return WIDGET_SIGN_START_MIN;
}
function widgetSignStartHHMM() {
  const n = widgetSignStartMinNow();
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}
// 所有链路共用的签到时间门闸：到达设定开始时间后才允许签到（一键签到 / 快捷指令 / 组件预览同样遵守）
function signTimeGateOk() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const nowMin = Math.floor((now.getTime() - dayStart) / 60000);
  return nowMin >= widgetSignStartMinNow();
}

function widgetSignState(acc) {
  const st = acc && acc.state;
  const s = (st && st.widgetSign && typeof st.widgetSign === "object") ? st.widgetSign : {};
  return {
    date: String(s.date || ""),
    ok: s.ok === true,
    lastAt: Number(s.lastAt || 0),
    attempts: Number(s.attempts || 0),
    result: String(s.result || ""),
  };
}
function rememberWidgetSign(acc, patch) {
  try {
    acc.state = acc.state || {};
    acc.state.widgetSign = Object.assign({}, widgetSignState(acc), patch || {});
    saveStore(getStore());
  } catch (e) { }
}
// 组件刷新时决定这次要不要自动签到：返回 { attempt, reason }
function widgetSignPlan(acc) {
  const s = widgetSignState(acc);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const today = todayISO();
  if (s.date === today && s.ok) return { attempt: false, reason: "signed：今天已自动签到成功" };
  const producerAt = Number((acc && acc.state && acc.state.producerAt) || 0);
  if (producerAt > 0 && now.getTime() - producerAt < WIDGET_SIGN_PRODUCER_MS) {
    return { attempt: false, reason: "producer：App 链路刚跑过（10 分钟内），不重复" };
  }
  const startMin = widgetSignStartMinNow();
  const nowMin = Math.floor((now.getTime() - dayStart) / 60000);
  if (nowMin < startMin) {
    return { attempt: false, reason: "before-morning：" + widgetSignStartHHMM() + " 后才开始自动签到" };
  }
  if (s.date === today && s.lastAt > 0 && now.getTime() - s.lastAt < WIDGET_SIGN_RETRY_MS) {
    return { attempt: false, reason: "gap：距上次尝试不足 1 小时" };
  }
  return { attempt: true, reason: "" };
}

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
  let monthSignedDays = 0;
  let last7Status = [];

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
  monthSignedDays = Number(st0.monthSignedDays || 0);
  last7Status = Array.isArray(st0.last7Status) ? st0.last7Status : [];

  // 零成本兑底：签到状态响应若含账号 id，补入 state.userId（发布动态查列表必需）
  try {
    const dSt = statusRaw && statusRaw.data;
    const uidRaw = String((dSt && (dSt.id || dSt.userId || (dSt.user && dSt.user.id))) || "").trim();
    if (uidRaw && !state.userId) {
      state.userId = uidRaw;
      writeState(state);
    }
  } catch (_) { }
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

  // 计划器：设定时间前不自动签；之后每小时试一次；App 链路 10 分钟内刚跑过不重复
  // 手动链路（组件预览）同样遵守设定的签到开始时间
  let planSkip = "";
  if (isWidget && !alreadySignedToday) {
    const plan = widgetSignPlan(acc);
    if (!plan.attempt) {
      planSkip = plan.reason;
      logStep("组件签到计划", "skip", planSkip);
    } else {
      // 先记后试：组件随时可能被系统杀掉，先记 lastAt 防止超时后高频重试
      rememberWidgetSign(acc, { date: today, lastAt: Date.now(), attempts: widgetSignState(acc).attempts + 1 });
    }
  } else if (!isWidget && !alreadySignedToday && !signTimeGateOk()) {
    planSkip = "before-morning：" + widgetSignStartHHMM() + " 后才开始自动签到";
    logStep("签到计划", "skip", planSkip);
  }

  if (!alreadySignedToday && !planSkip && (ALLOW_WIDGET_SIGN || !config.runsInWidget)) {
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
        if (isWidget) {
          rememberWidgetSign(acc, { date: today, ok: true, result: "签到成功", lastAt: Date.now() });
          if (didSignInNow) {
            try {
              await notifySimple("🏍️ ZEEHO 自动签到", `今日签到成功（组件链路）· 连签${continueDays}天 · 今日+${todayDelta}分`);
            } catch (_) { }
          }
        }
      }
    } catch (e) {
      const errMsg = String(e?.message || e);
      if (errMsg === "TOKEN_EXPIRED") {
        if (isWidget) rememberWidgetSign(acc, { date: today, ok: false, result: "Token过期", lastAt: Date.now() });
        await handleTokenExpiredInMain(isWidget);
        return;
      }
      if (isWidget) rememberWidgetSign(acc, { date: today, ok: false, result: errMsg, lastAt: Date.now() });
      logStep("签到", "fail", errMsg);
    }
  } else {
    logStep("签到", "skip", planSkip || "今日已签");
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
  
  // 自动发布需要 userId（查动态列表用）；缺失时用登录同款 baseInfo 接口补拉一次
  if (getStore().cfg.autoPost && !state.userId) {
    try {
      const uidInfo = await fetchUserIdByToken(token);
      if (uidInfo && uidInfo.userId) {
        state.userId = String(uidInfo.userId);
        writeState(state);
        logStep("发布准备", "ok", "已补拉 userId");
      }
    } catch (e) { logDebug("补拉 userId 失败", String(e?.message || e)); }
  }

  // 发布联动：今天确认已签才发布，避免「已发帖未签到」；签到成功后的那次刷新自动补发
  if (getStore().cfg.autoPost && state.userId && (alreadySignedToday || state.lastSignDate === today)) {
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
        // 组件里必须落到「Token已过期」占位组件，直接 Script.complete() 会报 Call Script.setWidget()
        await handleTokenExpiredInMain(isWidget);
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
    licensePlate: String(((acc.vehicles || []).find((v) => v.vinNo === vinNo) || {}).licensePlate || ""),
    last7Status,
    batteryPercent: widgets.batteryPercent,
    batteryPercentEstimated: !!widgets.batteryPercentEstimated,
    residualRangeKm: widgets.residualRangeKm,
    voltage: widgets.voltage || Number(batteryInfo.voltage || 0),
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
      monthSignedDays,
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
    postEnabled: !!(getStore().cfg.autoPost),
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
  enforceSingleAccount(STORE);
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
  ca.message = "导入将覆盖当前账号与配置（含 Token），确定继续？";
  ca.addAction("覆盖导入");
  ca.addCancelAction("取消");
  if ((await ca.present()) !== 0) return false;
  try {
    const parsed = JSON.parse(txt);
    replaceStore(parsed);
    const accNow = defaultOrFirstAccount(getStore());
    await simpleAlert("✅ 导入成功", `已恢复账号「${accNow ? dispName(accNow) : "—"}」。若组件未更新，请手动运行一次。`);
    return true;
  } catch (e) {
    await simpleAlert("❌ 导入失败", String(e?.message || e));
    return false;
  }
}

// ============== App 内交互菜单 ==============
let MENU_ACC = null; // 菜单当前操作账号（会话级）

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
    lines.push(acc ? `👤 ${dispName(acc)} · ${veh.name || "未选车"}` : "👤 未设置账号");
    if (acc) {
      const socStr = st.lastSoc != null ? `${st.lastSoc}%` : "—";
      lines.push(`🔋 ${socStr}${st.lastVoltage ? " · " + Number(st.lastVoltage).toFixed(1) + "V" : ""} · ⭐${st.totalPoints || 0}分`);
      lines.push(`📅 ${st.lastSignDate === todayISO() ? "今日已签" : "今日未签"} · 连签${st.continueDays || 0}天`);
    }

    const a = new Alert();
    a.title = "极核签到助手";
    a.message = lines.join("\n");
    a.addAction("一键签到（签到 / 盲盒 / 补签 / 发布）");
    a.addAction("车辆控制 🔐");
    a.addAction("充电监控 🔋");
    a.addAction("车辆与组件显示");
    a.addAction("账号 / Token 👤");
    a.addAction("组件预览 📱");
    a.addAction("配置导出 / 导入 💾");
    a.addAction("设置 ⚙️");
    a.addCancelAction("🚪 退出");
    const idx = await a.present();
    if (idx === -1) return;
    try {
      if (idx === 0) await menuBatch();
      else if (idx === 1) await menuVehicleControl();
      else if (idx === 2) await menuMonitor();
      else if (idx === 3) await menuVehicleDisplay();
      else if (idx === 4) await menuAccounts();
      else if (idx === 5) await menuPreview();
      else if (idx === 6) await menuExportImport();
      else if (idx === 7) await menuSettings();
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
  const acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未设置账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  logStep("一键签到", "start", dispName(acc));
  const r = await runAccountFlow(acc);
  const summary = batchSummaryLines({ results: [r] });
  await notifySimple("🏍️ ZEEHO 签到完成", summary.replace(/\n/g, " ").slice(0, 200));
  const postNote = getStore().cfg.autoPost
    ? ""
    : "\n\nℹ️ 「自动发布」开关当前为关闭，本次未发布动态。需要的话到「设置 → 1️⃣ 自动发布」开启。";
  const st = acc.state || {};
  const postDiag = "\n\n【发布链路诊断】\n" +
    "· 自动发布开关: " + (getStore().cfg.autoPost ? "开" : "关") + "\n" +
    "· userId: " + (st.userId ? "已获取（" + String(st.userId).slice(0, 8) + "…）" : "❌ 缺失（发布必需）") + "\n" +
    "· 上次发布日期: " + (st.lastPostDate || "无") + "｜今天: " + todayISO() + "\n" +
    "· 本次发布动作: " + (r.post === "ok" ? "✅ 成功" : r.post === "skip" ? "跳过（今日已发布过）" : r.post === "fail" ? "❌ 失败" : (!getStore().cfg.autoPost ? "未执行（原因：自动发布开关为「关」→ 到 设置→1️⃣ 开启后重跑）" : (!r.signed && (r.signTimeSkip || (st.lastSignDate || "") !== todayISO()) ? "未执行（原因：今日尚未签到" + (r.signTimeSkip ? "（未到 " + r.signTimeSkip + "）" : "") + "，发布顺延至签到后）" : "未执行（原因：userId 缺失且自动补拉未成功）"))) +
    ((r.postReason && r.post !== "ok" && r.post !== "skip") ? "\n· 详情: " + r.postReason : "");
  await simpleAlert("✅ 执行完成", summary + postNote + postDiag + "\n\nℹ️ 桌面组件不会立即刷新：请长按组件 → 编辑 → 退出（或等下一次自动刷新），即可看到最新状态。");
}

async function menuVehicleControl() {
  let acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未设置账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  if (!(await ensureVehicleRisk())) return;

  // ① 选择要控制的车辆（多车时先说清楚控制哪台）
  let veh = acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {};
  if (acc.vehicles.length > 1) {
    const va = new Alert();
    va.title = "🚗 选择控制车辆";
    va.message = `账号「${dispName(acc)}」有 ${acc.vehicles.length} 辆车\n当前车辆：${veh.name || "未命名"}${veh.vinNo === acc.activeVin ? "（默认）" : ""}`;
    acc.vehicles.slice(0, 12).forEach((v) => {
      const desc = [
        v.name || "未命名",
        v.licensePlate ? `车牌:${v.licensePlate}` : null,
        v.vinNo ? `尾号:${v.vinNo.slice(-6)}` : null,
        v.vinNo === acc.activeVin ? "默认" : null,
      ].filter(Boolean).join(" · ");
      va.addAction(desc);
    });
    va.addCancelAction("取消");
    const vi = await va.present();
    if (vi === -1) return;
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
  if (!acc) { await simpleAlert("提示", "尚未设置账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const cfg = getStore().cfg;
  const st = acc.state || {};
  const a = new Alert();
  a.title = "🔋 充电监控";
  a.message = `当前：${st.lastSoc != null ? st.lastSoc + "%" + (st.lastSocEstimated ? "（估）" : "") : "—"}${st.lastVoltage ? " · " + Number(st.lastVoltage).toFixed(1) + "V" : ""}${st.lastRemainMin ? "\n⏱ 充电剩余约 " + fmtRemainMin(st.lastRemainMin) : ""}\n方案A：组件刷新/运行脚本时自动检测（已启用）\n方案B：前台驻留监控（脚本保持打开）`;
  a.addAction("立即检测一次");
  a.addAction(`驻留监控（每${cfg.monitorIntervalMin}分×${cfg.monitorDurationMin}分）`);
  a.addAction(`⚡ 电压模拟电量：${cfg.voltageSim ? "✅开" : "❌关"}${cfg.voltageSim && Number(cfg.vEmpty) > 0 && Number(cfg.vFull) > Number(cfg.vEmpty) ? `（${cfg.vEmpty}V~${cfg.vFull}V${Number(cfg.batteryAh) > 0 ? " · " + cfg.batteryAh + "Ah" : ""}）` : ""}`);
  a.addAction(`低电量提醒：${cfg.notifyLow ? "✅开" : "❌关"}（≤${cfg.lowThreshold}%）`);
  a.addAction(`充满提醒：${cfg.voltageSim ? "已自动停用（电压模拟）" : (cfg.notifyFull ? "✅开" : "❌关")}`);
  a.addAction(`满电判断：${cfg.voltageSim ? "已停用（电压模拟）" : (Number(cfg.voltageThreshold || 0) > 0 ? `电压≥${cfg.voltageThreshold}V` : "电量100%")}`);
  a.addAction("后台定时教程（快捷指令）");
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
      const remain = estimateChargeRemainMin(b, getStore().cfg);
      await simpleAlert("🔋 检测完成", `${dispName(acc)}\n${b.chargeStateStr} · ${Number(b.soc || 0)}%${b.socEstimated ? "（估算）" : ""} · ${b.voltage ? b.voltage.toFixed(1) + "V" : "无电压数据"}${remain != null ? `\n⏱ 充电剩余约 ${fmtRemainMin(remain)}（${Number(b.current).toFixed(1)}A）` : ""}\n${tail}`);
    } catch (e) { await simpleAlert("❌ 检测失败", friendlyErr(e)); }
  } else if (idx === 1) {
    const cv = await readTextField(null, 0, {
      title: "⏱ 驻留监控参数",
      initial: `${cfg.monitorIntervalMin}\n${cfg.monitorDurationMin}`,
      hint: `保持脚本前台运行期间，按间隔轮询充电状态并通知（充满 / 低电量）\n第一行=间隔分钟，第二行=持续分钟（默认 ${cfg.monitorIntervalMin} / ${cfg.monitorDurationMin}）`,
    });
    const lines = cv.split(/\r?\n+/).map((x) => x.trim()).filter(Boolean);
    const iv = Number(lines[0]) || cfg.monitorIntervalMin;
    const dur = Number(lines[1]) || cfg.monitorDurationMin;
    cfg.monitorIntervalMin = iv;
    cfg.monitorDurationMin = dur;
    saveStore(getStore());
    const res = await runForegroundMonitor(acc, { intervalMin: iv, durationMin: dur });
    const last = res.last ? `${res.last.battery.chargeStateStr} · ${Number(res.last.battery.soc || 0)}%${res.last.battery.socEstimated ? "（估算）" : ""}` : "无数据";
    await simpleAlert("✅ 驻留监控结束", `共检测 ${res.ticks} 次 · 触发通知 ${res.notified} 次\n最后状态：${last}`);
  } else if (idx === 2) {
    const sim = !!cfg.voltageSim;
    const va = new Alert();
    va.title = "⚡ 电压模拟电量";
    va.message = [
      `当前：${sim ? "✅开启" : "❌关闭"}`,
      `空电电压：${Number(cfg.vEmpty) > 0 ? cfg.vEmpty + " V" : "未设置"} · 满电电压：${Number(cfg.vFull) > 0 ? cfg.vFull + " V" : "未设置"} · 电池容量：${Number(cfg.batteryAh) > 0 ? cfg.batteryAh + " Ah" : "未设置"}`,
      "",
      "车辆不上报电量百分比时，按 (当前电压−空电电压)/(满电电压−空电电压) 自动估算百分比；容量用于估算剩余电量。",
      "开启后将停用「满电判断 / 充满提醒」（电压估算充满不可靠）；低电提醒按估算百分比照常生效。",
    ].join("\n");
    va.addAction(sim ? "关闭该功能" : "开启该功能");
    va.addAction("设置空电电压…");
    va.addAction("设置满电电压…");
    va.addAction("设置电池容量(Ah)…");
    va.addCancelAction("返回");
    const vi = await va.present();
    if (vi === -1) return;
    const promptNum = async (title, message, curV, defV, unit) => {
      const v = Number(await readTextField(null, 0, {
        title: "🔢 " + title,
        initial: String(curV > 0 ? curV : defV),
        hint: message,
      }));
      if (!isFinite(v) || v <= 0) { await simpleAlert("❌ 无效数值", "请输入大于0的数字"); return null; }
      return v;
    };
    if (vi === 0) {
      const c = getStore().cfg;
      if (!c.voltageSim) {
        if (!(Number(c.vEmpty) > 0) || !(Number(c.vFull) > Number(c.vEmpty))) {
          await simpleAlert("⚠️ 请先设置电压", "开启前请先设置「空电电压」与「满电电压」（示例：空电 63V / 满电 84V）");
          return;
        }
        c.voltageSim = true;
        c.notifyFull = false; // 电压模拟模式下停用充满提醒
        saveStore(getStore());
        await simpleAlert("✅ 已开启", `电压模拟电量：开（${c.vEmpty}V ~ ${c.vFull}V）\n已自动停用充满提醒，低电提醒按估算%生效`);
      } else {
        c.voltageSim = false;
        saveStore(getStore());
        await simpleAlert("✅ 已关闭", "电压模拟电量：关（恢复读取车辆原始电量数据）");
      }
    } else if (vi === 1) {
      const v = await promptNum("设置空电电压", "车辆电量耗尽时的电压（示例 63V；不同车型/电池可能不同）", Number(cfg.vEmpty), 63, "空电电压(V)");
      if (v != null) { getStore().cfg.vEmpty = v; saveStore(getStore()); await simpleAlert("✅ 已保存", `空电电压：${v} V`); }
    } else if (vi === 2) {
      const v = await promptNum("设置满电电压", "充满时的电压（示例 84V；不同车型/电池可能不同）", Number(cfg.vFull), 84, "满电电压(V)");
      if (v != null) { getStore().cfg.vFull = v; saveStore(getStore()); await simpleAlert("✅ 已保存", `满电电压：${v} V`); }
    } else if (vi === 3) {
      const v = await promptNum("设置电池容量", "用于估算剩余可用电量（示例 28Ah；可查车辆铭牌或 BMS 参数）", Number(cfg.batteryAh), 28, "电池容量(Ah)");
      if (v != null) { getStore().cfg.batteryAh = v; saveStore(getStore()); await simpleAlert("✅ 已保存", `电池容量：${v} Ah`); }
    }
  } else if (idx === 5) {
    if (cfg.voltageSim) { await simpleAlert("⚡ 已停用", "电压模拟电量开启时不再用电压判断「充满」（估算不可靠）。\n如确需按电压阈值通知充满，请先关闭电压模拟。"); return; }
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
      const v = Number(await readTextField(null, 0, {
        title: "⚡ 设置电压伏数",
        initial: String(cur > 0 ? cur : 84),
        hint: "电压达到该数值即视为充满并通知（例如满电 84V）",
      }));
      if (!isFinite(v) || v <= 0) { await simpleAlert("❌ 无效数值", "请输入大于0的数字，如 84"); return; }
      cfg.voltageThreshold = v;
      saveStore(getStore());
      await simpleAlert("✅ 已保存", `满电通知：电压 ≥ ${v}V 时提醒`);
    }
  } else if (idx === 4) {
    if (cfg.voltageSim) { await simpleAlert("⚡ 已停用", "电压模拟电量开启时「充满提醒」自动停用（电压估算充满不可靠）。\n如需按电压判断充满，请先关闭电压模拟。"); return; }
    getStore().cfg.notifyFull = !getStore().cfg.notifyFull;
    saveStore(getStore());
    await simpleAlert("✅ 已更新", `充满通知：${getStore().cfg.notifyFull ? "开" : "关"}`);
  } else if (idx === 3) {
    const v = Number(await readTextField(null, 0, {
      title: "🔋 低电量阈值(%)",
      initial: String(cfg.lowThreshold),
      hint: `当前：${cfg.notifyLow ? "开" : "关"} · 阈值 ≤${cfg.lowThreshold}%\n修改阈值后自动开启；输入 0 表示关闭（电压模拟开启时，按估算百分比判断）`,
    }));
    if (!isFinite(v) || v < 0) { await simpleAlert("❌ 无效数值", "请输入数字"); return; }
    if (v === 0) getStore().cfg.notifyLow = false;
    else { getStore().cfg.notifyLow = true; getStore().cfg.lowThreshold = v; }
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `低电量通知：${getStore().cfg.notifyLow ? "开（≤" + v + "%）" : "关"}`);
  } else if (idx === 6) {
    await simpleAlert("🕒 后台定时（快捷指令）", [
      "iOS 不允许脚本自行后台运行，用「快捷指令」自动化最接近后台定时：",
      "",
      "1. 打开「快捷指令」→ 自动化 → 新建个人自动化",
      "2. 触发条件：时间（如每小时）或「充电器」连接时",
      "3. 添加操作：打开 URL",
      "4. URL 填写：scriptable:///run/Scriptable?action=all&silent=1",
      "5. 关闭「运行前询问」并保存",
      "",
      "可选 action：all / checkin=一键签到；monitor=仅充电监控；supplement=补签",
      "silent=1 表示只发通知、不弹窗（适合无人值守）",
      "",
      "另外：桌面组件每次刷新也会自动检测充电状态（方案A）",
    ].join("\n"));
  }
}

async function menuVehicleDisplay() {
  const acc = MENU_ACC || defaultOrFirstAccount(getStore());
  if (!acc) { await simpleAlert("提示", "尚未设置账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  const veh = acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {};
  const a = new Alert();
  a.title = "🚗 车辆与组件显示";
  a.message = `当前车辆：${veh.name || "未选择"}${veh.licensePlate ? " · " + veh.licensePlate : ""}`;
  a.addAction("选择 / 刷新车辆列表");
  a.addAction("🖼️ 设置组件背景");
  a.addAction("🎨 专属定制车辆图");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 1) { await menuSetBackground(); return; }
  if (idx === 2) { await menuCustomVehiclePic(); return; }
  if (idx !== 0) return;
  try {
    const r = await pickVehicleForAccount(acc.token, { title: "🚗 选择显示车辆" });
    acc.vehicles = r.vehicles;
    acc.activeVin = r.picked.vinNo;
    acc.state = acc.state || {};
    acc.state.vehicleName = r.picked.name;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `组件将显示：${r.picked.name}`);
  } catch (e) { await simpleAlert("❌ 失败", friendlyErr(e)); }
}

async function menuAccounts() {
  const store = getStore();
  const acc = defaultOrFirstAccount(store);
  const veh = acc ? (acc.vehicles.find((v) => v.vinNo === acc.activeVin) || acc.vehicles[0] || {}) : {};
  const a = new Alert();
  a.title = "👤 账号 / Token";
  a.message = acc
    ? `当前账号：${dispName(acc)}\nToken：${acc.token ? "已设置 ✓" : "未设置"}\n车辆：${veh.name || "未选择"}`
    : "尚未设置账号";
  a.addAction("📱 手机号登录（重设）");
  a.addAction("🔑 粘贴 Token（重设）");
  a.addAction("🚗 选择 / 刷新车辆列表");
  a.addCancelAction("返回");
  const idx = await a.present();
  if (idx === -1) return;
  if (idx === 0) { const r = await addAccountByPhone(); if (r) MENU_ACC = r; }
  else if (idx === 1) { const r = await addAccountByToken(); if (r) MENU_ACC = r; }
  else if (idx === 2) {
    if (!acc || !acc.token) { await simpleAlert("提示", "请先设置 Token（手机号登录 / 粘贴 Token）"); return; }
    try {
      const r = await pickVehicleForAccount(acc.token, { title: "🚗 选择显示车辆" });
      acc.vehicles = r.vehicles;
      acc.activeVin = r.picked.vinNo;
      acc.state = acc.state || {};
      acc.state.vehicleName = r.picked.name;
      saveStore(getStore());
      await simpleAlert("✅ 已保存", `组件将显示：${r.picked.name}`);
    } catch (e) { await simpleAlert("❌ 失败", friendlyErr(e)); }
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
  if (!acc) { await simpleAlert("提示", "尚未设置账号"); return; }
  if (!(await ensureAccountReady(acc))) return;
  if (MENU_ACC && MENU_ACC.token) acc = MENU_ACC;
  const vin = (getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
  if (!vin) { await simpleAlert("提示", "请先在「车辆与组件显示」里选择车辆"); return; }
  setCurrentAcc(acc);
  const dash = await runSinglePipeline(acc, vin, { isWidget: false });
  if (!dash) return;
  try { await syncVehiclesLite(acc, store); } catch (e) { }
  if (family === "large" && acc.vehicles && acc.vehicles.length > 1) {
    try { dash.data.vehList = await fetchVehiclesLite(acc, getStore()); dash.data.accountName = dispName(acc); } catch (e) { }
  }
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
  a.message = `自动发布：${cfg.autoPost ? "开" : "关"} · 内容「${cfg.postContent}」\n自动补签：${cfg.autoSupplement ? "开" : "关"} · 每次最多${cfg.supplementMaxPerRun}天\n组件自动签到：每天 ${widgetSignStartHHMM()} 后开始\n满电判断：${Number(cfg.voltageThreshold || 0) > 0 ? `电压≥${cfg.voltageThreshold}V` : "电量100%"}`;
  a.addAction(`1️⃣ 自动发布：${cfg.autoPost ? "✅开（点按关闭）" : "❌关（点按开启）"}`);
  a.addAction("2️⃣ 修改发布内容");
  a.addAction(`3️⃣ 自动补签：${cfg.autoSupplement ? "✅开（点按关闭）" : "❌关（点按开启）"}`);
  a.addAction(`4️⃣ 组件自动签到开始时间：${widgetSignStartHHMM()}`);
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
    const v = await readTextField(null, 0, {
      title: "✏️ 发布内容",
      initial: String(cfg.postContent || ""),
      hint: "每天自动发布并删除的动态内容，可现场编辑",
    });
    if (!v) { await simpleAlert("❌ 不能为空", "请填写内容"); return; }
    cfg.postContent = v;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `发布内容：${v}`);
  } else if (idx === 2) {
    cfg.autoSupplement = !cfg.autoSupplement;
    saveStore(getStore());
    await simpleAlert("✅ 已更新", `自动补签：${cfg.autoSupplement ? "开" : "关"}`);
  } else if (idx === 3) {
    const v = await readTextField(null, 0, {
      title: "⏰ 组件自动签到开始时间",
      initial: widgetSignStartHHMM(),
      hint: "桌面组件每天到了这个时间之后才自动签到（之前不执行；开始后每小时试一次直到成功）\n输入 HH:MM，如 08:00、07:30、00:00（00:00=全天允许）",
    });
    const tm = v.match(/^(\d{1,2}):(\d{2})$/);
    if (!tm) { await simpleAlert("❌ 格式错误", "请输入 HH:MM 格式，例如 08:00"); return; }
    const th = Number(tm[1]), tmi = Number(tm[2]);
    if (!(th >= 0 && th <= 23) || !(tmi >= 0 && tmi <= 59)) { await simpleAlert("❌ 时间无效", "小时 0-23，分钟 0-59"); return; }
    cfg.widgetSignStartMin = th * 60 + tmi;
    saveStore(getStore());
    await simpleAlert("✅ 已保存", `组件自动签到开始时间：${widgetSignStartHHMM()}\n每天这个时间之后，组件刷新才会自动签到。`);
  } else if (idx === 4) {
    const v = await readTextField(null, 0, {
      title: "🔐 AES 密钥（32位十六进制）",
      initial: String(cfg.aesKey || ""),
      hint: "用于开/关锁加密（已内置默认密钥）",
    });
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
    c.message = "将删除账号、Token、签到记录与配置，且不可恢复。确定继续？";
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
    await simpleAlert("✅ 已清空", "所有数据已清除，请重新设置账号");
  } else if (idx === 7) {
    await simpleAlert("ℹ️ 关于", [
      "ZEEHO 极核助手 · Scriptable 单账号版",
      "",
      "· 自动签到 / 盲盒 / 补签 / 发布动态（发布→点赞→分享→领分→删除）",
      "· 车辆控制：寻车 / 鸣笛 / 坐垫 / 云端开关锁",
      "· 充电监控：充满(100%或电压阈值) / 低电量 通知",
      "· 多尺寸组件：小 / 中 / 大 / 锁屏圆形 / 锁屏长方形",
      "· 停车地址、电压、胎压、骑行数据展示",
      "",
      "组件参数示例：vin=车架号（组件配置 Parameter 里填写）",
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

  if (action === "all" || action === "signin-all" || action === "checkin") {
    if (!acc || !acc.token) {
      if (!silent) await simpleAlert("提示", "尚未设置账号，请先在 Scriptable 内运行脚本设置");
      Script.complete();
      return;
    }
    setCurrentAcc(acc);
    const r = await runAccountFlow(acc);
    const line = batchSummaryLines({ results: [r] });
    await notifySimple("🏍️ ZEEHO 签到完成", line.replace(/\n/g, " ").slice(0, 200));
    if (!silent) await simpleAlert("✅ 执行完成", line);
    Script.complete();
    return;
  }

  if (!acc || !acc.token) {
    if (!silent) await simpleAlert("提示", "尚未设置账号，请先在 Scriptable 内运行脚本设置");
    Script.complete();
    return;
  }
  setCurrentAcc(acc);

  if (action === "monitor") {
    try {
      const r = await monitorOnce(acc);
      const b = r.battery;
      const remain = estimateChargeRemainMin(b, getStore().cfg);
      const line = `${dispName(acc)}｜${b.chargeStateStr} · ${Number(b.soc || 0)}%${b.socEstimated ? "（估算）" : ""}${b.voltage ? " · " + b.voltage.toFixed(1) + "V" : ""}${remain != null ? " · ⏱剩余约 " + fmtRemainMin(remain) : ""}`;
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

  // 兼容旧用法：URL/参数里带 token=xxx 时，更新默认账号的 Token（无账号则走设置流程）
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
        await simpleAlert("✅ 设置成功", `${dispName(acc2)} · 默认车辆 ${picked.picked.name}`);
      } catch (e) {
        await simpleAlert("❌ 设置失败", String(e?.message || e));
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
      a.message = "尚未设置账号。\n\n· 手机号登录：免抓包，短信验证码即可\n· 粘贴Token：从 App 抓包获取 Authorization\n\n设置后桌面组件会自动显示车辆状态。";
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
  // 慢网络 watchdog：20 秒还没渲染出组件就先铺占位，避免 iOS 结束时提示 Call Script.setWidget()
  let widgetShown = false;
  let watchdog = null;
  const showWidget = (w) => {
    if (widgetShown) return;
    widgetShown = true;
    try { if (watchdog) watchdog.invalidate(); } catch (_) { }
    Script.setWidget(w);
  };
  try {
    watchdog = Timer.schedule(20, false, () => {
      if (widgetShown) return;
      try {
        Script.setWidget(buildFallbackWidget("⏳ 正在加载", "网络较慢，稍后会自动刷新"));
        Script.complete();
      } catch (_) { }
    });
  } catch (_) { }
  try {
    const acc = pickAccountForWidget(store);
    if (!acc || !acc.token) {
      showWidget(buildFallbackWidget("🔑 需要配置", acc
        ? "账号缺少Token：请在 Scriptable 内运行脚本，菜单会自动引导设置"
        : "请在 Scriptable 内运行脚本，设置账号后即可显示"));
      Script.complete();
      return;
    }
    setCurrentAcc(acc);
    const vinNo = (getParam("vin") || acc.activeVin || (acc.vehicles[0] && acc.vehicles[0].vinNo) || "").trim();
    if (!vinNo) {
      showWidget(buildFallbackWidget("🚗 未选择车辆", "请在 Scriptable 内运行脚本，选择要显示的车辆"));
      Script.complete();
      return;
    }

    try {
      const dash = await runSinglePipeline(acc, vinNo, { isWidget: true });
      if (!dash) { showWidget(buildFallbackWidget()); Script.complete(); return; }
      // v1.8 大尺寸多车总览（先自动同步车辆列表，App 新绑定车辆自动填充）
      try { await syncVehiclesLite(acc, store); } catch (e) { }
      if ((config.widgetFamily || "medium") === "large" && acc.vehicles && acc.vehicles.length > 1) {
        try { dash.data.vehList = await fetchVehiclesLite(acc, getStore()); dash.data.accountName = dispName(acc); } catch (e) { logDebug("多车状态获取失败", String(e?.message || e)); }
      }
      const widget = await buildWidgetForFamily(dash.data, dash.batteryInfo, dash.chargeStateStr, config.widgetFamily || "medium");
      try {
        const refreshMin = Number(getStore().cfg.refreshMin || 15);
        widget.refreshAfterDate = new Date(Date.now() + refreshMin * 60 * 1000);
      } catch { }
      showWidget(widget);
      logStep("ZEEHO 极核助手", "ok", `充电: ${dash.chargeStateStr}`);
      Script.complete();
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg === "TOKEN_EXPIRED") { await handleTokenExpiredInMain(true); return; }
      logStep("运行失败", "fail", msg);
      showWidget(buildFallbackWidget("⚠️ 运行失败", msg.slice(0, 60)));
      Script.complete();
    }
  } catch (e2) {
    console.error("[组件异常]", (e2 && (e2.stack || e2.message)) || e2);
    try { showWidget(buildFallbackWidget("⚠️ 组件异常", String(e2?.message || e2).slice(0, 60))); } catch (_) { }
    Script.complete();
  }
}

main().catch((e) => {
  const msg = String((e && e.message) || e);
  console.error("[主流程异常]", (e && e.stack) || msg);
  if (config.runsInWidget || config.widgetFamily) {
    try {
      Script.setWidget(buildFallbackWidget("⚠️ 运行失败", msg.slice(0, 60)));
      Script.complete();
    } catch (_) { }
    return;
  }
  throw e;
});
