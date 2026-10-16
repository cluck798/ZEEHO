/*
#!name=极核 ZEEHO 签到面板 V2.16.11
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.16.11

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板 + 极核API自动捕获appId/appSecret
http-request ^https?://(zeeho\.box|.*zeehoev\.com)/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.11, requires-body=true, timeout=60, tag=极核面板V2.16.11

# 车辆图片替换（v2.16.11：http-response 直改响应体图片 URL，需在面板设置页配置）
http-response ^https:\/\/tapi\.zeehoev\.com\/v1\.0\/app\/cfmotoserverapp\/(vehicle\/(list|widgets|details)|vehicleHomePageV2|vehicleInfo|vehicle\/properties) script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.11, timeout=30, tag=车辆图片改写
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
// 版本: v2.16.11
// 更新日期: 2026-10-17
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.16.11";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-10-17 v2.16.11 车辆图片替换架构重构：放弃 http-request 转发改写（Loon 下 $httpClient 转发不可靠导致持续无效），改为新增 http-response 规则直改车辆接口响应体图片 URL——不转发、无 MITM 自拦截循环，插件/模块/SG 模块/QX 订阅均已附「车辆图片改写」响应规则，需重新订阅插件生效；v2.16.10 车辆图片替换修复：转发请求加 x-zeeho-bypass 旁路头，防止被自身 MITM 规则再次拦截导致改写静默失效（官方App无变化的根因）；接口覆盖扩至 vehicle/details·vehicleInfo·vehicle/properties；新增 [车辆图片] 已改写/未覆盖接口/转发失败 诊断日志（Loon 日志过滤「车辆图片」可见）；v2.16.9 新增「车辆图片替换」：设置页按车辆选官方车型图（含 AE5i 电轻摩版四色/自定义URL），面板 MITM 转发改写 vehicle/list·widgets·homePageV2 图片字段，官方App照片同步生效；v2.16.8 数据准确性修复：batteryInfo.batteryLevel 恒为100是电池健康标志非电量，soc 取数链改 soc→bmssoc（充电监控/充电剩余时间电量不再假100%）；v2.16.7 签到与盲盒修复：盲盒改走官方 POST /H5/signin/lottery?dateTime=<开盒日>（旧实现误用补签接口 supplementPrize → 40005 无效操作），开盒日以 info.signPrizeDate 为准；签到日历查询加 3 次退避重试（07:00 并发 WAF 瞬断导致误报 签到+0/连签0天）；连签天数以官方 GET /H5/signin 直出值为准；HTML 直连通道签到路径补迁 /H5/ 且 POST 签名含 body；v2.16.6 电池设置每车独立保存（旧数据自动迁移到当前车辆）+ 首页卡片显示充电剩余时间；v2.16.5 充电剩余时间：车辆页新增「电池设置」（容量Ah/满电V），充电中按 容量×(100−电量%)/100÷充电电流 估算剩余时间，并与官方 fullChargeTime 对照显示；新增 /api/battery-state 接口；充电功率 1200 档文案修正为「无限制」（下发值不变）；三端 Release 说明增加北京时间更新时间；v2.16.4 补签路径修复：consume/gain（补签、积分兑换）改走官方新路径 /cfmotoservermine/H5/signInSupplement（旧路径被 WAF 拦为 430/30125 permit error，实测 consume 旧路径 30125 → 新路径业务码）；v2.16.3 补签修复：POST /count 需将 body「{}」纳入签名（此前 430/30121，补签卡数量/补签报错）；抓取脚本 v2.5.2（Token 剥 Bearer、同 userId 只更新不新增、保留 barkKey）；面板账号读写自动归一（去 Bearer + 同 ID 合并自愈）；v2.16.2 版本检测加固：双源（raw+jsDelivr）并发取最高版本号，避免 jsDelivr 最长 12h 缓存导致「检查更新」误判已是最新；v2.16.1 修复「扫描轨迹」：ridetrack_v2 必须带 startTime=YYYY-MM（缺失时服务端恒返回空数组，HAR 实证），支持按历史月份扫描，行程明细增加起终点/服务端急加速/轨迹缩略图；v2.16.0 新增「骑行」页：隐藏骑行数据（极速/急加速/急刹/压弯，轨迹重算算法移植自 Zeeho SpeedHunter）；修复服务端对「带 query 的 GET」收紧导致的 430/30121（胎压/首页骑行/车况/积分明细/社区回查/轨迹扫描统一改 query 入签 + 官方格式随机 UA）；v2.15.6 H5 通道密钥/接口迁移 + 软件版本检测；v2.15.5 面板首屏提速)`);

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
    
    // v2.16.11 http-response 上下文：直接改写车辆接口响应体里的图片 URL（不转发，从根本消除 MITM 自拦截循环）
    if (typeof $response !== "undefined" && $response) {
      try { picRewriteResponse(url); } catch (e) { console.log("[车辆图片] 响应改写异常，放行:", e); $done({}); }
      return true;
    }
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
  autoRefreshSec: 60, // 看板首页自动刷新间隔(秒)，配置页可改；规范化见 normalizeRefreshSec
  pics: {} // v2.16.9 车辆图片替换：{ "<vin>": "<图片URL>" }，设置页配置，仅面板 MITM 环境生效
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
        widgetVehicle: (typeof c.widgetVehicle === "string" ? c.widgetVehicle : ""),
        pics: (c.pics && typeof c.pics === "object") ? c.pics : {}
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
// v2.16.3 账号归一：①token 统一剥离 Bearer 前缀；②同一 userId 合并为一条。
// 背景：抓取脚本(script/zeeho.js)与面板双写 zeeho_data，历史版本抓取把「Bearer xxx」原样入库，
// 且同人条目可能重复；此处在读/写两侧自愈（合并时保留先前的非空 barkKey，token/昵称取较新值）。
function normalizeAccounts(list) {
  const out = [];
  const byId = new Map();
  for (const a0 of (Array.isArray(list) ? list : [])) {
    if (!a0 || typeof a0 !== "object") continue;
    const a = Object.assign({}, a0, { token: cleanToken(a0.token || "") });
    const uid = String(a.userId || "").trim();
    if (uid && byId.has(uid)) {
      const old = byId.get(uid);
      Object.assign(old, a, { barkKey: old.barkKey || a.barkKey || "" });
    } else {
      out.push(a);
      if (uid) byId.set(uid, a);
    }
  }
  return out;
}
function getAccounts() {
  try {
    const raw = $.getdata(CK_DATA);
    if (raw) {
      const arr = JSON.parse(raw);
      return normalizeAccounts(Array.isArray(arr) ? arr : [arr]);
    }
  } catch(e) {}
  return [];
}
function saveAccounts(list) {
  try { $.setdata(JSON.stringify(normalizeAccounts(list)), CK_DATA); return true; } catch(e) { return false; }
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

// ========== v2.16.0 「带 query 的 GET」统一新协议（服务端已收紧：UA + query 不入签直接 430/30121） ==========
// 实证（2026-10-11，真实账号逐一比对）：带旧短格式 UA（…ZEEHO_APP|3.0.1|iPhone|WWAN|iOS）时，
// tire/monitoring、homeRideInfo、myRideInfo、ridetrack_v2、vehicleHomePageV2、
// vehicles/properties/snapshots、integral/detail、mineArticleInfo、myCoupons、activityPrizeRecord、
// ota/list 等「URL 带 query」的 GET 一律要求 md5(sha1(query+param+secret))（query 原文入签）；
// 无 query 的接口（vehicle/list、setting、batteryInfo、signin/count 等）不受影响。
// 统一改走官方全格式随机 UA + query 入签（与社交写操作同一套头），最严路径实测全部放行。
function appQueryGetHeaders(acc, queryStr, cfg) {
  const h = socialHeaders(cleanToken(acc.token), acc.userId, queryStr || "", "", cfg);
  if (!acc.userId) delete h.cookie;   // 无 userId 时不下发空 cookie
  return h;
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

// ========== v2.16.11 车辆图片替换：http-response 上下文直改响应体（不转发，杜绝 MITM 自拦截循环） ==========
function picRewriteResponse(url) {
  const short = (String(url).split("cfmotoserverapp/")[1] || String(url)).slice(0, 80);
  const pics = (getConfig() || {}).pics || {};
  if (!Object.keys(pics).length) { $done({}); return; }
  if (!new RegExp("tapi[.]zeehoev[.]com/v1[.]0/app/cfmotoserverapp/(vehicle/(list|widgets|details)|vehicleHomePageV2|vehicleInfo|vehicle/properties)").test(url)) { $done({}); return; }
  const st = Number($response.status || $response.statusCode || 0);
  const body = $response.body;
  let obj = null;
  if (st === 200 && typeof body === "string" && body) { try { obj = JSON.parse(body); } catch (e) {} }
  if (!obj || !obj.data) { console.log("[车辆图片] 响应不可解析 status=" + st + " url=" + short); $done({}); return; }
  const n = rewritePicUrls(obj, pics);
  if (n > 0) {
    console.log("[车辆图片] 响应已改写 " + n + " 字段 url=" + short);
    const nb = JSON.stringify(obj);
    if (typeof $task !== "undefined") $done({ body: nb });
    else $done({ response: { body: nb } });
  } else {
    console.log("[车辆图片] 命中接口但无配置VIN url=" + short);
    $done({});
  }
}
// 命中 VIN 配置的替换 vehiclePicUrl / vehicleScalePicUrl，返回改写条数
function rewritePicUrls(obj, pics) {
  let n = 0;
  const items = Array.isArray(obj.data) ? obj.data : (obj.data && typeof obj.data === "object" ? [obj.data] : []);
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const vin = String(it.vinNo || it.vin || "").trim();
    const u = vin ? pics[vin] : "";
    if (!u) continue;
    if (it.vehiclePicUrl !== undefined) { it.vehiclePicUrl = u; n++; }
    if (it.vehicleScalePicUrl !== undefined) { it.vehicleScalePicUrl = u; n++; }
  }
  return n;
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

    // v2.16.7 info 查询带退避重试（07:00 多账号并发易触发 WAF 瞬断，此前无重试导致误报 +0/连签0）
    async function getInfoRetry() {
      let last = null;
      for (let t = 1; t <= 3; t++) {
        last = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
        if (last && String(last.code) === "10000") return last;
        if (t < 3) await new Promise(r => setTimeout(r, t * 1500));
      }
      return last;
    }
    // 1. 签到
    try {
      const infoRes = await getInfoRetry();
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

    // 2. 查询连签和盲盒（v2.16.7：盲盒改走官方 POST /H5/signin/lottery?dateTime=<开盒日>，
    //    开盒日以 info.signPrizeDate===今日 为准；旧实现误用补签接口 supplementPrize → 40005 无效操作）
    try {
      const infoRes = await getInfoRetry();
      const list = infoRes?.data?.nowSignDetailVos || [];
      const todayIdx = list.findIndex(x => x.createDate === today);
      let cont = 0;
      // 盲盒开启日(st=0)是连签周期边界：今日是盲盒日计入1天；往前的盲盒日说明官方连签已重置，停止计数
      for (let i = todayIdx; i >= 0; i--) { const st = list[i]?.signStatue; if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break; }
      result.continueDays = cont;
      // 官方状态接口直出连签（权威值，日历重算仅作兜底）
      try {
        const stRes = await httpGet("https://h5.zeehoev.com/cfmotoservermine/H5/signin", { ...baseHeaders, ...getSign("h5", {}, '', cfg) });
        const sc = Number(stRes?.data?.continueDays);
        if (String(stRes?.code) === "10000" && isFinite(sc) && sc > 0) { cont = sc; result.continueDays = cont; }
      } catch (e) {}
      const signCount = Number(infoRes?.data?.signCount) || 0;
      const prizeDate = String(infoRes?.data?.signPrizeDate || "");
      const isBoxDay = prizeDate ? (prizeDate === today) : (signCount >= 30);
      if (isBoxDay) {
        const blindRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/lottery?dateTime=${encodeURIComponent(today)}`, { ...baseHeaders, ...getSign("h5", { dateTime: today }, '', cfg) }, "");
        const bd = (blindRes?.data && blindRes.data.signPrizesVO) || blindRes?.data || {};
        result.blindBoxScore = Number(bd.integral || bd.integralScore || bd.score || 0);
        if (String(blindRes?.code) === "10000") {
          result.steps.push(`盲盒获得 +${result.blindBoxScore} (${bd.prizesName || bd.prizeName || "积分"})`);
        } else {
          result.steps.push(`盲盒未开: ${blindRes?.message || blindRes?.error || ("code=" + blindRes?.code)}`);
        }
      } else {
        result.steps.push(`距盲盒 ${Math.max(0, 30 - (signCount || cont))} 天`);
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
        const qMine = `userId=${userId}&page=1&pageSize=10`;
        const listRes = await httpGet(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo?${qMine}`, appQueryGetHeaders(acc, qMine, cfg));
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
    const deviceId = getDeviceIdentify(acc);
    const query = `uniqueIdentify=${deviceId}&phoneDeviceName=ios_${deviceId}`;
    const url = `https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleHomePageV2/${encodeURIComponent(vinNo)}?${query}`;
    const res = await httpGet(url, appQueryGetHeaders(acc, query, cfg));
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
    const query = `vinNo=${encodeURIComponent(vinNo)}&timePeriodType=1`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicle/tire/monitoring?${query}`, appQueryGetHeaders(acc, query, cfg));
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
    const month = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0");
    // v2.16.0 修复 30121：homeRideInfo/myRideInfo 需 query 入签（旧签名+旧UA 已被服务端拒）
    const qHome = `vinNo=${encodeURIComponent(vinNo)}`;
    const qMy = `vinNo=${encodeURIComponent(vinNo)}&month=${month}`;
    const [homeRes, myRes] = await Promise.all([
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qHome}`, appQueryGetHeaders(acc, qHome, cfg)),
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${qMy}`, appQueryGetHeaders(acc, qMy, cfg))
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

// v2.16.0 隐藏骑行数据：月度汇总（myRideInfo，含服务端极速/急加速/急刹/压弯日字段，原样透传 data）
async function fetchRideMonth(acc, cfg, month, vin) {
  try {
    let vinNo = String(vin || "").trim();
    let vehicleName = "";
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
      vehicleName = vehicles[0].name;
    }
    const m = month || (new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&month=${encodeURIComponent(m)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") return { ok: true, month: m, vinNo: vinNo, vehicleName: vehicleName, data: res.data || {} };
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
}

// v2.16.0 隐藏骑行数据：轨迹分页（ridetrack_v2 —— 唯一带 trajectory 的接口；服务端把 pageSize 钳在 20）
// v2.16.1 修复：必须带 startTime=YYYY-MM（月份），否则服务端恒返回空数组（HAR 实证：缺失时 days=0）
async function fetchRideTrackPage(acc, cfg, page, pageSize, vin, month) {
  try {
    let vinNo = String(vin || "").trim();
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
    }
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(200, Number(pageSize) || 20));
    const st = String(month || "").replace(".", "-") || (new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&page=${pg}&pageSize=${ps}&startTime=${encodeURIComponent(st)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ridetrack_v2?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") {
      let days = [];
      if (Array.isArray(res.data)) days = res.data;
      else if (res.data && Array.isArray(res.data.list)) days = res.data.list;
      else if (res.data && Array.isArray(res.data.dayList)) days = res.data.dayList;
      return { ok: true, page: pg, vinNo: vinNo, days: days };
    }
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", page: pg, vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
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
        // v2.16.8 修正：batteryLevel 恒为 "100"（电池健康/在位标志，非电量），真值 soc→bmssoc
        soc: Number(d.soc || d.bmssoc || 0),
        residualRangeKm: isFinite(range) ? range : 0,
        powerUseToday: isFinite(powerUseToday) ? powerUseToday : 0,
        powerUseMonth: isFinite(powerUseMonth) ? powerUseMonth : 0,
        powerChargeMonth: isFinite(powerChargeMonth) ? powerChargeMonth : 0,
        chargeCount: isFinite(chargeCount) ? chargeCount : 0,
        // v2.16.5 官方充电时长字段（充电中非0；供与本地估算对照）
        fullChargeTime: Number(d.fullChargeTime || 0),
        fullChargeTimeSecond: Number(d.fullChargeTimeSecond || 0)
      };
    }
    return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0, fullChargeTime: 0, fullChargeTimeSecond: 0 };
  } catch(e) { return { chargeState: "未充电", voltage: 0, current: 0, batteryTemp: 0, soc: 0, residualRangeKm: 0, powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0, fullChargeTime: 0, fullChargeTimeSecond: 0 }; }
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
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLmJnLWdsb3d7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtwb2ludGVyLWV2ZW50czpub25lO3otaW5kZXg6MDsKICBiYWNrZ3JvdW5kOgogICAgcmFkaWFsLWdyYWRpZW50KDUyJSAzOCUgYXQgMTIlIC02JSwgcmdiYSg0MywyMTIsMjQyLC4xNCksIHRyYW5zcGFyZW50IDYyJSksCiAgICByYWRpYWwtZ3JhZGllbnQoNDYlIDM0JSBhdCA5MiUgNiUsIHJnYmEoMTQsMTQzLDE3OCwuMTIpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDYwJSA0MCUgYXQgNTAlIDExMCUsIHJnYmEoMTI0LDEwNywyNDAsLjA4KSwgdHJhbnNwYXJlbnQgNjUlKTsKfQpoZWFkZXIuYXBwLWhlYWRlcnsKICBwb3NpdGlvbjpzdGlja3k7dG9wOjA7ei1pbmRleDo2MDsKICBwYWRkaW5nOmNhbGMoMTJweCArIHZhcigtLXNhZmUtdCkpIDE4cHggMTJweDsKICBiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjc4KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wOSk7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDsKfQouYnJhbmQtbWFya3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXNocmluazowO292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4yOCl9Ci5icmFuZC1tYXJrIGltZ3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7b2JqZWN0LWZpdDpjb3Zlcn0KLmJyYW5kLXR4dHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5icmFuZC10eHQgaDF7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4ycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYnJhbmQtdHh0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHh9CgouaGVhZC1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmbGV4LXNocmluazowfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMThzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsY29sb3IgLjJzfQouaWNvbi1idG46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOSl9Ci5pY29uLWJ0biBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KLmljb24tYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2JvcmRlcjpub25lfQouY291bnQtY2hpcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjM2cHg7cGFkZGluZzowIDEycHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWluLXdpZHRoOjk2cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5jb3VudC1jaGlwLm9ue2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jb3VudC1yaW5ne3dpZHRoOjE0cHg7aGVpZ2h0OjE0cHg7cG9zaXRpb246cmVsYXRpdmU7ZmxleC1zaHJpbms6MH0KLmNvdW50LXJpbmcgc3Zne3RyYW5zZm9ybTpyb3RhdGUoLTkwZGVnKTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4fQouY291bnQtcmluZyAudHJhY2t7c3Ryb2tlOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjJ9Ci5jb3VudC1yaW5nIC5hcmN7c3Ryb2tlOnZhcigtLWJyYW5kKTtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7dHJhbnNpdGlvbjpzdHJva2UtZGFzaG9mZnNldCAuNXMgbGluZWFyfQoKbWFpbntmbGV4OjE7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMTUwcHggKyB2YXIoLS1zYWZlLWIpKX0KCi8qID09PT09PT09PT09PSBwdWxsIHRvIHJlZnJlc2ggPT09PT09PT09PT09ICovCi5wdHItd3JhcHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5wdHItaW5kaWNhdG9ye2hlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzpoaWRkZW47dHJhbnNpdGlvbjpoZWlnaHQgLjNzIHZhcigtLWVhc2UpO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLnB0ci1pbmRpY2F0b3IgLnNwaW5uZXJ7d2lkdGg6MjBweDtoZWlnaHQ6MjBweDttYXJnaW4tcmlnaHQ6OHB4O2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5wdHItaW5kaWNhdG9yLnB1bGxpbmcgLnNwaW5uZXJ7YW5pbWF0aW9uOm5vbmU7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCl9CkBrZXlmcmFtZXMgc3Bpbnt0b3t0cmFuc2Zvcm06cm90YXRlKDM2MGRlZyl9fQoKLyogPT09PT09PT09PT09IGhlcm8gc3VtbWFyeSA9PT09PT09PT09PT0gKi8KLmhlcm97CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE4cHggMThweCAxNnB4O21hcmdpbi1ib3R0b206MTZweDtvdmVyZmxvdzpoaWRkZW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTYwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTQpLHJnYmEoMTQsMTQzLDE3OCwuMDUpIDU1JSx0cmFuc3BhcmVudCksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjE2KTsKfQouaGVybzo6YWZ0ZXJ7Y29udGVudDonJztwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDotNjBweDt0b3A6LTcwcHg7d2lkdGg6MjIwcHg7aGVpZ2h0OjIyMHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2NSUpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5oZXJvLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEycHh9Ci5oZXJvLXNjb3JlIC5sYmx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweH0KLmhlcm8tc2NvcmUgLnZhbHtmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtsZXR0ZXItc3BhY2luZzotLjVweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpOy13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7YmFja2dyb3VuZC1jbGlwOnRleHQ7Y29sb3I6dHJhbnNwYXJlbnQ7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhlcm8tc2NvcmUgLnZhbCBzbWFsbHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDB9Ci5oZXJvLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ZmxleC1zaHJpbms6MH0KLmhlcm8tcmlnaHQgLmJpZ3tmb250LXNpemU6MjJweDtmb250LXdlaWdodDo5MDA7Y29sb3I6dmFyKC0tb2spfQouaGVyby1yaWdodCAuYmlnIHNwYW57Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouaGVyby1yaWdodCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouaGVyby1zdGF0c3tkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4fQouaHN0YXR7ZmxleDoxO2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzo5cHggMTJweH0KLmhzdGF0IC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjgwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouaHN0YXQgLmx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC13ZWlnaHQ6NjAwfQouaHN0YXQuYW1iZXIgLnZ7Y29sb3I6dmFyKC0td2Fybil9IC5oc3RhdC5jeWFuIC52e2NvbG9yOnZhcigtLWJyYW5kKX0gLmhzdGF0LmdyZWVuIC52e2NvbG9yOnZhcigtLW9rKX0KCi8qID09PT09PT09PT09PSBidXR0b25zICYgY2hpcHMgPT09PT09PT09PT09ICovCi5mYWJ7CiAgcG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYygxMDBweCArIHZhcigtLXNhZmUtYikpO3otaW5kZXg6NTA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O2hlaWdodDo0NnB4O3BhZGRpbmc6MCAxNnB4O2JvcmRlci1yYWRpdXM6MjNweDsKICBiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHg7CiAgYm94LXNoYWRvdzowIDEwcHggMjhweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1zcHJpbmcpLGJveC1zaGFkb3cgLjJzO2FuaW1hdGlvbjpmYWItaW4gLjVzIHZhcigtLXNwcmluZykgYm90aDsKfQouZmFiOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmZhYiBzdmd7d2lkdGg6MTdweDtoZWlnaHQ6MTdweH0KQGtleWZyYW1lcyBmYWItaW57ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgyNHB4KTtvcGFjaXR5OjB9dG97dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCk7b3BhY2l0eToxfX0KLmJ0bnsKICBkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDo2cHg7aGVpZ2h0OjQwcHg7cGFkZGluZzowIDE4cHg7Ym9yZGVyLXJhZGl1czoxM3B4OwogIGZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0KTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksYmFja2dyb3VuZCAuMnMsYm9yZGVyLWNvbG9yIC4yczsKfQouYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmJ0bi5naG9zdHtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLXR4dDIpfQouYnRuLmRhbmdlcntiYWNrZ3JvdW5kOnZhcigtLWVyclNvZnQpO2NvbG9yOnZhcigtLWVycik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjI4KX0KLmJ0bi5zbXtoZWlnaHQ6MzJweDtwYWRkaW5nOjAgMTJweDtmb250LXNpemU6MTJweDtib3JkZXItcmFkaXVzOjEwcHh9Ci5idG46ZGlzYWJsZWR7b3BhY2l0eTouNTtwb2ludGVyLWV2ZW50czpub25lfQouY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4O2hlaWdodDozMHB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTVweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLmNoaXA6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpO2NvbG9yOnZhcigtLWJyYW5kKX0KLmNoaXAgLmRvdHt3aWR0aDo2cHg7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmN1cnJlbnRDb2xvcn0KLnBpbGx7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjRweDtwYWRkaW5nOjAgMTBweDtib3JkZXItcmFkaXVzOjEycHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjB9Ci5waWxsLm9re2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5waWxsLm1pc3N7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoucGlsbC5jeWFue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5waWxsLmdyYXl7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7Y29sb3I6dmFyKC0tdHh0Mil9Ci5waWxsLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpb1NvZnQpO2NvbG9yOnZhcigtLXZpbyl9Ci5waWxsLmFtYmVye2JhY2tncm91bmQ6dmFyKC0td2FyblNvZnQpO2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IGFjY291bnQgY2FyZHMgPT09PT09PT09PT09ICovCi5zZWN0aW9uLXRpdGxle2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjRweCAycHggMTJweDtsZXR0ZXItc3BhY2luZzouNXB4fQouc2VjdGlvbi10aXRsZSBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHsKICBwb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNikscmdiYSgxNDYsMTcwLDIwNSwuMDMpKSx2YXIoLS1jYXJkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIHRyYW5zaXRpb246dHJhbnNmb3JtIC4ycyB2YXIoLS1lYXNlKTsKfQovKiDlhaXlnLrliqjnlLvlj6rlnKjpppbmrKHmuLLmn5Pmkq3mlL7vvIzpgb/lhY3oh6rliqjliLfmlrDph43lu7rljaHniYfml7bmlbTlsY/ph43pl6ogKi8KLmFjYy1jYXJkLmFuaW0taW57YW5pbWF0aW9uOmNhcmQtaW4gLjQ1cyB2YXIoLS1lYXNlKSBib3RofQouYWNjLWNhcmQuZXJyb3J7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjQpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyxyZ2JhKDI0OSwxMTIsMTA2LC4wNyksdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQpAa2V5ZnJhbWVzIGNhcmQtaW57ZnJvbXtvcGFjaXR5OjA7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTRweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApfX0KLyogPT09PT09PT09PT09IHYyLjE0LjE0IOmmlumhteWNoeeJh++8iOWbvjPpo47moLzvvIkgPT09PT09PT09PT09ICovCi5ob21lLWNhcmR7cGFkZGluZzoxNnB4IDE2cHggMTRweH0KLmhjLXVwZHtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MTJweDtyaWdodDoxNHB4O2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi1ib3R0b206MnB4fQouaGMtbmFtZXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjNweH0KLmhjLWJhZGdle2ZvbnQtc2l6ZToxMC41cHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6M3B4IDlweDtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFkZ2Uub257YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1vayl9Ci5oYy1iYWRnZS5lcnJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tZXJyKX0KLmhjLWJhZGdlLmNoZ3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLW1vZGVse2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbToxMHB4fQouaGMtbWlke2Rpc3BsYXk6ZmxleDtnYXA6MTJweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luOjZweCAwIDEwcHh9Ci5oYy1sZWZ0e2ZsZXg6MTttaW4td2lkdGg6MH0KLmhjLWJpZ3tmb250LXNpemU6MzhweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xO2xldHRlci1zcGFjaW5nOi0xcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmJhc2VsaW5lO2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5oYy1rbXtmb250LXNpemU6MTlweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0KX0KLmhjLXZ7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpfQouaGMtYmFye2hlaWdodDo5cHg7Ym9yZGVyLXJhZGl1czo2cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xNik7b3ZlcmZsb3c6aGlkZGVuO21hcmdpbjo4cHggMCAxMHB4fQouaGMtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjZweDt0cmFuc2l0aW9uOndpZHRoIC43cyB2YXIoLS1lYXNlKX0KLmhjLXJvd3N7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6M3B4fQouaGMtcm93e2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhjLWltZ3t3aWR0aDoxMThweDtoZWlnaHQ6OTZweDtmbGV4LXNocmluazowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmhjLWltZyBpbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCA2cHggMTRweCByZ2JhKDAsMCwwLC4zNSkpfQouaGMtaW1nIGltZytzdmd7ZGlzcGxheTpub25lfQouaGMtaW1nIHN2Z3t3aWR0aDo3MnB4O2hlaWdodDo3MnB4fQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0gdjIuMTYuMCDpqpHooYzpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5ydC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZ3JpZDN7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo4cHh9Ci5ydC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEwcHggMTFweH0KLnJ0LWNlbGwgLmxie2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NHB4fQoucnQtY2VsbCAudmx7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMX0KLnJ0LWNlbGwgLnZsIC51e2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tbGVmdDoycHh9Ci5ydC1jZWxsIC52bC5icmFuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5ydC1kYXl7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTBweCAxMnB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZGF5Omxhc3QtY2hpbGR7bWFyZ2luLWJvdHRvbTowfQoucnQtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpiYXNlbGluZTtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6OHB4fQoucnQtZGF0ZXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDB9Ci5ydC1kYXRlIC53ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLWxlZnQ6NXB4fQoucnQta217Zm9udC1zaXplOjExLjVweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDB9Ci5ydC1jaGlwc3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjZweDttYXJnaW4tdG9wOjdweH0KLnJ0LWNoaXB7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6M3B4IDhweH0KLnJ0LWNoaXAgYntjb2xvcjp2YXIoLS1icmFuZCk7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1sZWZ0OjJweH0KLnJ0LWNoaXAuY2FsIGJ7Y29sb3I6dmFyKC0tb2spfQoucnQtY2hpcC5saW5re2N1cnNvcjpwb2ludGVyO2NvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmRTb2Z0KX0KLyogPT09PT09PT09PT09IOWFpeWcuumXquWxj++8mummluW4p+WNs+aYvuekuu+8jOaVsOaNruWwsee7quWQjua3oeWHuiA9PT09PT09PT09PT0gKi8KI3NwbGFzaHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6OTk5O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoMTIwJSA2MCUgYXQgNTAlIDAlLHJnYmEoMTQsMTQzLDE3OCwuMTYpLHRyYW5zcGFyZW50IDYwJSksdmFyKC0tYmcpO3RyYW5zaXRpb246b3BhY2l0eSAuNHMgdmFyKC0tZWFzZSksdHJhbnNmb3JtIC40cyB2YXIoLS1lYXNlKX0KI3NwbGFzaC5vdXR7b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSgxLjA0KTtwb2ludGVyLWV2ZW50czpub25lfQouc3AtbWFya3t3aWR0aDo4NHB4O2hlaWdodDo4NHB4O2JvcmRlci1yYWRpdXM6MjRweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2hhZG93OjAgMTRweCA0MHB4IHJnYmEoMTQsMTQzLDE3OCwuNCk7YW5pbWF0aW9uOnNwLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGh9Ci5zcC1tYXJrIHN2Z3t3aWR0aDo0NnB4O2hlaWdodDo0NnB4fQouc3AtdGl0bGV7bWFyZ2luLXRvcDoyMHB4O2ZvbnQtc2l6ZToyMXB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzoxcHg7YW5pbWF0aW9uOnNwLXVwIC40cyAuMDVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1zdWJ7bWFyZ2luLXRvcDo3cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7bGV0dGVyLXNwYWNpbmc6M3B4O2FuaW1hdGlvbjpzcC11cCAuNHMgLjFzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2Fke21hcmdpbi10b3A6MzRweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7YW5pbWF0aW9uOnNwLXVwIC40cyAuMTVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2FkIC5zcGlubmVye3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwaW4gLjdzIGxpbmVhciBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpIHRyYW5zbGF0ZVkoMTBweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKSB0cmFuc2xhdGVZKDApfX0KQGtleWZyYW1lcyBzcC11cHtmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMnB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJiZy1nbG93Ij48L2Rpdj4KPGRpdiBpZD0ic3BsYXNoIj4KICA8ZGl2IGNsYXNzPSJzcC1tYXJrIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTQgMTMuNUM0IDkuMDggNy41OCA1LjUgMTIgNS41czggMy41OCA4IDgiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMiAxM2w3LjUgNS41IiBzdHJva2U9IiMwNDEyMUMiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI3LjUiIGN5PSIxNi41IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE5IiByPSIyLjIiIGZpbGw9IiMwNDEyMUMiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC10aXRsZSI+5p6B5qC4IFpFRUhPPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3Atc3ViIj7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLWxvYWQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIj48L3NwYW4+5q2j5Zyo5Yqg6L295pWw5o2u4oCmPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJhcHAiPgogIDxoZWFkZXIgY2xhc3M9ImFwcC1oZWFkZXIiPgogICAgPGRpdiBjbGFzcz0iYnJhbmQtbWFyayI+PGltZyBzcmM9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBSkFBQUFDUUNBWUFBQURuUnVLNEFBQUFBWE5TUjBJQXJzNGM2UUFBQUZCbFdFbG1UVTBBS2dBQUFBZ0FBZ0VTQUFNQUFBQUJBQUVBQUlkcEFBUUFBQUFCQUFBQUpnQUFBQUFBQTZBQkFBTUFBQUFCQUFFQUFLQUNBQVFBQUFBQkFBQUFrS0FEQUFRQUFBQUJBQUFBa0FBQUFBQXQ0aVNXQUFBQldXbFVXSFJZVFV3NlkyOXRMbUZrYjJKbExuaHRjQUFBQUFBQVBIZzZlRzF3YldWMFlTQjRiV3h1Y3pwNFBTSmhaRzlpWlRwdWN6cHRaWFJoTHlJZ2VEcDRiWEIwYXowaVdFMVFJRU52Y21VZ05pNHdMakFpUGdvZ0lDQThjbVJtT2xKRVJpQjRiV3h1Y3pweVpHWTlJbWgwZEhBNkx5OTNkM2N1ZHpNdWIzSm5MekU1T1Rrdk1ESXZNakl0Y21SbUxYTjViblJoZUMxdWN5TWlQZ29nSUNBZ0lDQThjbVJtT2tSbGMyTnlhWEIwYVc5dUlISmtaanBoWW05MWREMGlJZ29nSUNBZ0lDQWdJQ0FnSUNCNGJXeHVjenAwYVdabVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM1JwWm1Zdk1TNHdMeUkrQ2lBZ0lDQWdJQ0FnSUR4MGFXWm1Pazl5YVdWdWRHRjBhVzl1UGpFOEwzUnBabVk2VDNKcFpXNTBZWFJwYjI0K0NpQWdJQ0FnSUR3dmNtUm1Pa1JsYzJOeWFYQjBhVzl1UGdvZ0lDQThMM0prWmpwU1JFWStDand2ZURwNGJYQnRaWFJoUGdvWlh1RUhBQUFOQ0VsRVFWUjRBZTFkVzB3VlNSb3VSSUtpWWtoRW9tSXdpemhSNG8xVkp6cXJVWGd3V1RYZTBLaHhKRVpkdkNXamtNeXJpWTlHeGxzMEVWK2NqTVliM2pQUmx4R2RIUlBkMFlrODdFWldVTmRSRTBSRkVSRkVZUCt2N1Q2ZWM3ck9wZnQwdzZuVC81Lzg5T202ZGRWWFg2cXF1Lzc2U1JJOUpOM2QzZjNvVWJta28wbEhrV2JwbWtuWGROS0JwSU5JMDBoVFNWTjBUYVlydEE5cGtwL1N6NFNUYm1xUm9WMzB1MVBYRHJwQzIwbGJTZCtSdHBBMmt6YVNOdWo2bUs1MXBQVkpTVWx0ZEhWZDBDR3VDQkZtSEJWY1JEcFYxNi9vNnRyenFHeVdMd2lBaExXa3YrdjZDeEhxUDEraW5mdmxhSWNTYVFxb2F2OGduVWVhN1Z3MXVTUUhFSGhLWmZ4TVdrbGsrc09COHJRaVlpWVFrUVpsRkpOK1IvcU5WaXIvaVhjRWJsSUY5NUZXRVprd1d0bVdtQWhFNVBrYlBma0hVa3hUTE9vaGdDbXVqRWowbTkycTJ5SVFFU2VESG5pUWRLWGRCM08rdUVMZ0JOVm1DeEdweVdxdExCT0l5RE9MSG5LTWRLVFZoM0g2dUViZ1Q2cmRhaUxScjFacWlWZmpxSVhJVTA2SnEwbVpQRkdqcGt4QzlHbTEzc2RSVnpxcUVZZ0tSYm9LMHUxUmw4d0pWVVpnRDFXK1BKb0Zka1FDNmVUNWtRcjhWbVZFdU82V0VmaUpjcFJFSWxFMFV4aEdIaWFQWmZ5Vno0QStSOStIbGJBRTB1ZERucmJDUXBqUWtkc2pyWWxDVG1HVUVXOWJXRENISlZsQ3c4ZU5Bd0xZazVzVDZ1MU1TaUFpRDc3ejFKQmlaYzdDQ09BVmZ5S1J5UFNkS05Ub2dvK0VUQjRtam9FQXVBQk9tTVEwQXRIb2crMkpmNXBTY2dBaklNUk1Hb1VDdGowQ0NFVGt3ZjF0VXQ3YllycklFTURlMmRkRUl0OEdiUEFVaGwxMUpvOE1PZzREQXVBR09PS1RZQUxCSklPRkVRaUhRQUJIZkZNWVRWOHdCcnNiTGlmSE1RSTZBbitsYVV3elN2TWZnVW9aSGtZZ1NnUmdkYXFKL3dpRWQzMDJROVdCNFV0WUJKN1NDS1I5NXRGR0lKcSs4cGs4WVFIanlFQUVzb2t6T0RUaDI2WW9ESXpuTzBZZ0lnSkZTR0dzZ2FaRlRNNEpHSUZBQkRUT0dBVGlieitCNFBCZFpBUTB6aVRSWElZVG96anQ2RnRRUjg3TEtSZ0I3UVJ0R2thZ1hGSW1EelBDS2dMZ1RDNElsR2MxSjZkbkJIUUU4a0NnSElhREViQ0pRQTRJQkM4WkxJeUFIUVN5bUVCMllPTThCZ0lhZ1RLTk83NHlBaFlSeU1RSUJPZE9MSXlBSFFUU1FTQjRCbU5oQk93Z01CQUVHbVFuSitkaEJNQWRFQWcrQ1ZrWUFUc0lhRitpNGRDU2hSR3dnMEFxUmlCNFEyVmhCT3dna01JRXNnTWI1ekVRMEFpVWJOenhsUkd3aUVBeVJpQW1rRVhVT0xrUEFZMUFJQkVMSTJBSGdUNGdEOXNDMllHTzh3Q0JKQ1lRRXlFV0JKTDZna1d4bEJBcGIxVlZsV2hvd1A4Q1lRRUNuWjJkWXRteVpXTFlzR0ZTUU83ZXZTdHUzYm9samJNYU9IcjBhREYzN2x5cjJheWtUeEprRSsycVRKZ3dBWjRjV0hVTVNrdEx1MXRiVzZXWUUzRzZNek16SGNOcTRjS0YwdWM0R1lnUnlGWHAzNysvcStXclZEaVJSeHc2ZEVqMDBaYWVnVFd2cWFrUlM1Y3VGWTJOallFUk1keWxwcnEveWNCdllERjBrSldzYTlhc0VRY09ISkNTcDdhMlZpeGV2Rmc4ZS9iTVNwRnhrWllKMUFQZFVGeGNMQTRmUGl4U1VzeTdSbzhlUFJLTEZpMFN1S29vVENDWGUyM2V2SG5pNk5Ham9sOC9ITDhMRkl3NFM1WXNFZmZ2M3crTVVPaU9DZVJpWjgyWk0wY2NQMzVjREJnd3dQUVVySFV3TXQyN2Q4OFVwMUlBRThpbDNwbytmYm80ZmZxMEdEeDRzT2tKYjk2OEVjdVhMM2ZzZGQzMGdCNE1ZQUs1QVBia3laTUZ2bjhOR1RMRVZIcExTNHRZdFdxVnVINzl1aWxPeFFBbWtNTzlObmJzV0hIdTNEa3hmUGh3VThsdGJXMmlwS1JFWExseXhSU25hZ0FUeU1HZXk4M05GUmN1WEJDalJvMHlsZHJSMFNFMmJOaWdrY3NVcVhBQUU4aWh6c3ZPemhibno1OFhZOGFNTVpYWTFkVWx0bTdkS280ZHd6OTZUQ3hoQWpuUW4wT0hEaFZuejU0VjQ4ZVBsNVpXWGw0dUtpc3JwWEdxQnpLQll1ekJqSXdNY2ViTUdURnRtdG5KMjhlUEgwVlpXWm5ZdTNkdmpFK0ozK3l1NzRVNTBmVDA5SFF4ZS9ac1FaNUJuU2pPc1RLd3A3VjU4Mll4YXhiK001Wlo3dHk1SStycTZnUnRhcG9qdzRTMHQ3ZUxhOWV1Q1JBdzNrVUpBdVhrNUlpTEZ5L0dPNWFtK3MyWU1VTmN1blRKRkI0cEFOK0o4dkx5eE11WEx5TWw3ZlY0SmFZd01qOFFlSXZ4aW1BRVFwdFZFQ1VJcEFLUVhxMmpNZ1JLVHZiTzRSR1p2VkM4RWxTSk5SRE1RRis4ZUNFMWgrZ0pZREdkNEZzT1dRdUdYTWczTnpjN05zMitldlZLbVNsTUNRSTllUEJBa0dsc3lNNXprMFFHZVhiczJLRjlESlE5Qy90YTY5YXRFOWpuY2tKQVZpeWtWUkFsQ1BUcDB5ZEhUVDJ0ZHN5MmJkdkVsaTFicEFTR0FUeDIxcDAwUmJWYXY5NU1yOHdhcUxkQTJyUnBrNmlvcUpDYW9zS1d4Mms3NXQ1cXA5M25Nb0hDSUllZDgvMzc5MHZKQXl0Q1dCTStmLzQ4VEFtSkg4VUVDdEhIT0xzRk8rYStmYzJ6L01PSEQ1VzJZdzdSWkZ2QlRDQUpiUFBuejlmc21HWEhZZ3c3WnB5a1lQbnk3NTRZQ3gyQm9xSWl6ZXdpTGMzcytRK2ZFckRtd1JrdWxzOEk4QWpreHdUc1haMDhlVkpxeDl6VTFLUzliZDIrZmRzdkIvOWtBdWtjS0Nnb2lHakhmT1BHRFdaTUVBSk1JQUlrUHo5Zk16V1ZPVHlBSFROT2xWNjllalVJT3I0RkFwNG5FRHhZd0JRVkppUEJBZ3VBOWV2WGEvSEJjWHovR1FGUEUyamt5SkhheUFQYm0yREJkZ0srUHVOZ0lFdG9CRHhMb0t5c0xJMDhNanRta0FmYkYwZU9IQW1OSE1kb0NKaS9rc1VoTURCbGxYM1FzMXRWSFBqRHFkRXBVNmFZaXNETy84NmRPOFhCZ3dkN2JmY2ZsVkxGZ0U0SkFtR2RnbE1QVHBBSXUrczRianhpeEFnVGVZd0FiSTZ1V0xIQ3VPM3hLOHc1Rml4WW9NU092QklFZ21jTDJWVGpScy9DY0ExdlpiMHByMSsvRnFvWTBDbXhCc0tvb2NxUTdnVHhWR3FyRWdSeW9sTzRESGNRVUlKQXNCR1dlZmR5QjVMZUx4WDdjUEYyQmk0VUtrcXNnV0J6ZzlkcUsrc0N3eFFWWjlLeENKZEpkWFcxdUh6NWN0eDExdnYzN3dWVUJWR0NRRGhndDIvZlBzdDQ0bGd4UGhiS0JIYk1jR3o1OXUxYldUU0hSWW1BRWdTS3NpMEJ5ZURRWVBmdTNRRmh4bzFoeDh6a01SQ3hmMVZpRFdTMWVSczNiaFM3ZHUyU1pvTWRNM3dUZXRVSVhncEtESUVKUnlEWU1ZZnl4MnpZTWF2b2p6bUdQblkxYTBJUnlQREhMUHRpRFQvTVdQT282by9aVlJiRVVIakNFTWp3eHh6S2pobmtVZGtmY3d4OTdHcldoQ0JRWVdGaFdIL01iTWZzSG9lVUp4RDhNWjg2ZFVwcXgyejRZMlk3WmlhUUZBSDRZOFl1ZlNoL3pDdFhya3dZZjh4U0FPSWdVTmtSYU55NGNXSHRtUEUyeG5iTTdqTk1TUUxCSHpQc21MM2tqOWw5S3RoN2duSUVnajltZUlMM21qOW1lOTNyZmk3WENmVGh3d2ZIV2dGL3pDQVBmQVVGQzU2REw5Q0o2bzg1dUwzUjNNUFhvdHZpK2w3WTJyVnJ4Wk1uVHh4cEJ4d2VUSjA2VlZwV2ZYMjl3TC9YeEs2OUtxWVEwb1k0R0RocDBpUUhTNU1YbFVSbUQxMFVGVjhPbU9WMTVkRDRRNkFiVTVnYS9tVGpEenl1RVhHSENjUTBpQVVCalVDWXdsZ1lBVHNJZEdFRTZyU1RrL013QXVBT0U0aDVFQXNDR29HODgwOG9Zb0dLODhvUTZNQUl4QVNTUWNOaDBTQ2dFY2o5ejVYUlZJWFRxSWhBTzBhZ1ZoVnJ6bldPQ3dSYVFhQjNjVkVWcm9TS0NMd0RnWno1RHlFcU5wL3JIQ3NDTFNCUWM2eWxjSDdQSXRBTUFqVjZ0dm5jOEZnUmFBU0JHbUl0aGZON0ZvRUdKcEJuKzk2Umhtc0VldXhJVVZ5SUZ4RjRqQkdvem9zdDV6WTdna0FkTEJMN1VWSDRtTWhXaVk1ZzZwbENZSWlZMW9mc2g5dm94Mzg5MDJ4dXFGTUkxSUk3bU1JZ3YzKys4RjlHSUdvRU5NNFlCUHBYMU5rNElTUHdHWUVBQXYzQ3FEQUNGaEhRT09OYk9OTmkrazhxSU50aUlaemNtd2c4cGZXUDVyM1VtTUlBdzgvZXhJSmJiUU1CSDFmOENWUnBveURPNGswRWZGenhFWWlHcEQ4SWk1dmV4SU5iYlFHQm16cFh0Q3crQXVrRldQZm1iZUhKbkRRaEVBamdpRzhSamFiUlFocjMrTC9XY2c4R1NNVGlaUVR3NnY0MWpVQys0L0FCSTVBZVVlWmxoTGp0WVJFbzh5Y1BVZ1lRQ0FHVTREZTZuTUJ2RmtiQUQ0RVRPamY4Z2tKc29OSlVsa0dwYWtpMWQvMkFISHpqUlFUd2pYQWlFYWdwdVBHbUVRZ0o5SVNyNlNjN1hnaEd6SHYzNE1CcUdYa0FoWlJBaUtBTXY5TGxlL3htOFRRQzMrdGNrSUlROEJZbVMwSFQyUThVdmwwV3gyRUpqOEFlSWsvWWw2cG9DSVEwUDVKK20vQndjUVA5RWZpSmJrcUlRTDVYZHY5STQzZklLY3hJb0JkUVF2ZDdqREMrSmp3QzZPdUk1QUVLRVVjZ2Y2aG9PaXVuZS93bnQ0akU4OC9IdjVWQkFBdG1ySGtxb3EyeEpRS2hVQ0xSTExvY0krVlhmQUNTT0lKWGRieHQ0ZVVwYXJFOGt1Z1BtRWhQNEkrTlVjTWM5d25SbC9qT1k0azhhSlZsQWlFVFBhaUpkQlg5bkVuSzl0UUFSVTFCMzgxRVg2SlA3VFRCOGhRVy9CQ2EwbEJHTWVsM3BOOEV4L045WENJQXN4M3NxbGNSY2NLK1pVV3FmY3dFOG44QWthbUE3a3RKLzA3SzVySCs0UFQrNzZkVUJWZ1NWaEpwWVB2bGlEaEtJUDhhRVpueTZiNlFkQm9wekVQR2tMcjJQQ3FiNVFzQ0dGVncxZzlURkU3Y1hDUFMvSnV1amt1UGRTZ1Jxai9WL2kra2VhUTVwRm02WnRJMW5YUWc2U0RTTk5KVTBoUmRrK2tLeFhvTjlUV1VmaWFjb09NTnhTdDFwNjV3aEFxRlAwdWNJb1pYT1RnR2cyK25SbEo0V0lIK2ovUUJhVDBSQmdkR1haZi9BN1kxZC81SUpaZGRBQUFBQUVsRlRrU3VRbUNDIiBhbHQ9IlpFRUhPIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJyYW5kLXR4dCI+CiAgICAgIDxoMT7mnoHmoLggWkVFSE88L2gxPgogICAgICA8cD7nrb7liLAgwrcg6L2m6L6GIMK3IOaOp+i9pjwvcD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGVhZC1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iY291bnQtY2hpcCBoaWRkZW4iIGlkPSJjb3VudENoaXAiIG9uY2xpY2s9InRvZ2dsZUF1dG9SZWZyZXNoKCkiPgogICAgICAgIDxzcGFuIGNsYXNzPSJjb3VudC1yaW5nIj48c3ZnIHZpZXdCb3g9IjAgMCAxNCAxNCI+PGNpcmNsZSBjbGFzcz0idHJhY2siIGN4PSI3IiBjeT0iNyIgcj0iNS42Ii8+PGNpcmNsZSBjbGFzcz0iYXJjIiBpZD0iY291bnRBcmMiIGN4PSI3IiBjeT0iNyIgcj0iNS42IiBzdHJva2UtZGFzaGFycmF5PSIzNS4yIiBzdHJva2UtZGFzaG9mZnNldD0iMzUuMiIvPjwvc3ZnPjwvc3Bhbj4KICAgICAgICA8c3BhbiBpZD0iY291bnRUeHQiPjYwczwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICAgIAogICAgPC9kaXY+CiAgPC9oZWFkZXI+CgogIDxtYWluIGlkPSJtYWluIj4KICAgIDxkaXYgY2xhc3M9InB0ci13cmFwIiBpZD0icHRyV3JhcCI+CiAgICAgIDxkaXYgY2xhc3M9InB0ci1pbmRpY2F0b3IiIGlkPSJwdHJJbmQiPjxzcGFuIGNsYXNzPSJzcGlubmVyIiBpZD0icHRyU3BpbiI+PC9zcGFuPjxzcGFuIGlkPSJwdHJUeHQiPuS4i+aLieWIt+aWsDwvc3Bhbj48L2Rpdj4KICAgICAgPGRpdiBpZD0icGFnZUhvbWUiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJwYWdlUG9pbnRzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VWZWhpY2xlIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VSaWRlIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VMb2dzIiBjbGFzcz0iaGlkZGVuIj48L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VDZmciIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogIDwvbWFpbj4KCiAgPG5hdiBjbGFzcz0idGFiYmFyIj4KICAgIDxidXR0b24gY2xhc3M9InRhYiBvbiIgZGF0YS10YWI9ImhvbWUiIG9uY2xpY2s9InN3aXRjaFRhYignaG9tZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTAuNSAxMiAzbDkgNy41Ii8+PHBhdGggZD0iTTUgOS41VjIxaDE0VjkuNSIvPjwvc3ZnPgogICAgICDpppbpobU8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0icG9pbnRzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3BvaW50cycpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOC42Ii8+PHBhdGggZD0iTTkgOC41bDMgNCAzLTRNMTIgMTIuNVYxN005LjYgMTMuNGg0LjhNOS42IDE1LjRoNC44Ii8+PC9zdmc+CiAgICAgIOenr+WIhjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJ2ZWhpY2xlIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3ZlaGljbGUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik00IDEzbDEuNy00LjZBMiAyIDAgMCAxIDcuNiA3aDguOGEyIDIgMCAwIDEgMS45IDEuNEwyMCAxMyIvPjxwYXRoIGQ9Ik0zLjUgMTNoMTdhMSAxIDAgMCAxIDEgMXYzLjVoLTIuNk0yLjUgMTcuNVYxNGExIDEgMCAwIDEgMS0xIi8+PHBhdGggZD0iTTUuMSAxNy41SDIuNSIvPjxjaXJjbGUgY3g9IjcuMyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxjaXJjbGUgY3g9IjE2LjciIGN5PSIxNy4zIiByPSIxLjkiLz48cGF0aCBkPSJNOS4yIDE3LjNoNS42Ii8+PC9zdmc+CiAgICAgIOi9pui+hjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJyaWRlIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ3JpZGUnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDE2LjVjMi41IDAgMy41LTkgOC05czQuNSA5IDEwIDkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE5IiByPSIxLjMiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPgogICAgICDpqpHooYw8c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIiBkYXRhLXRhYj0ibG9ncyIgb25jbGljaz0ic3dpdGNoVGFiKCdsb2dzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOCA2aDEzTTggMTJoMTNNOCAxOGgxMyIvPjxwYXRoIGQ9Ik0zIDZoLjAxTTMgMTJoLjAxTTMgMThoLjAxIi8+PC9zdmc+CiAgICAgIOaXpeW/lzxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJjZmciIG9uY2xpY2s9InN3aXRjaFRhYignY2ZnJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIi8+PHBhdGggZD0iTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAxIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDEgMS00IDB2LS4wOWExLjY1IDEuNjUgMCAwIDAtMS0xLjUxIDEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMSAxLTIuODMtMi44M2wuMDYtLjA2YTEuNjUgMS42NSAwIDAgMCAuMzMtMS44MiAxLjY1IDEuNjUgMCAwIDAtMS41MS0xSDNhMiAyIDAgMSAxIDAtNGguMDlhMS42NSAxLjY1IDAgMCAwIDEuNTEtMSAxLjY1IDEuNjUgMCAwIDAtLjMzLTEuODJsLS4wNi0uMDZhMiAyIDAgMSAxIDIuODMtMi44M2wuMDYuMDZhMS42NSAxLjY1IDAgMCAwIDEuODIuMzNoLjAxYTEuNjUgMS42NSAwIDAgMCAxLTEuNTFWM2EyIDIgMCAxIDEgNCAwdi4wOWExLjY1IDEuNjUgMCAwIDAgMSAxLjUxaC4wMWExLjY1IDEuNjUgMCAwIDAgMS44Mi0uMzNsLjA2LS4wNmEyIDIgMCAxIDEgMi44MyAyLjgzbC0uMDYuMDZhMS42NSAxLjY1IDAgMCAwLS4zMyAxLjgydi4wMWExLjY1IDEuNjUgMCAwIDAgMS41MSAxSDIxYTIgMiAwIDEgMSAwIDRoLS4wOWExLjY1IDEuNjUgMCAwIDAtMS41MSAxeiIvPjwvc3ZnPgogICAgICDorr7nva48c3BhbiBjbGFzcz0idC1pbmQiPjwvc3Bhbj4KICAgIDwvYnV0dG9uPgogIDwvbmF2PgoKICA8ZGl2IGNsYXNzPSJzaGVldC1iYWNrZHJvcCIgaWQ9InNoZWV0QmFja2Ryb3AiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PC9kaXY+CiAgPGRpdiBjbGFzcz0ic2hlZXQiIGlkPSJzaGVldCI+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ncmFiIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWhlYWQiPgogICAgICA8aDMgaWQ9InNoZWV0VGl0bGUiPjwvaDM+CiAgICAgIDxidXR0b24gY2xhc3M9InNoZWV0LWNsb3NlIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz48L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtYm9keSIgaWQ9InNoZWV0Qm9keSI+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgaWQ9InRvYXN0IiByb2xlPSJzdGF0dXMiPjwvZGl2PgogIDxkaXYgY2xhc3M9ImNvbmZpcm0tbGF5ZXIgaGlkZGVuIiBpZD0iY29uZmlybUxheWVyIj48L2Rpdj4KPC9kaXY+CjxzY3JpcHQ+CiJ1c2Ugc3RyaWN0IjsKLyogPT09PT09PT09PT09PT09PT0g5bi46YePID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEFQUF9WRVJTSU9OID0gInYyLjE2LjExIjsKY29uc3QgS0VZUyA9IHsgY2ZnOiJ6ZWVob19jZmciLCBhY2NvdW50czoiemVlaG9fYWNjb3VudHMiLCBsb2dzOiJ6ZWVob19sb2dzIiB9OwoKLyogPT09PT09PT09PT09PT09PT0g5bel5YW35Ye95pWwID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFV1aWQoKXtjb25zdCBwPSJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgiLGM9ImFiY2RlZjAxMjM0NTY3ODkiO2xldCByPSIiO2Zvcihjb25zdCBjaCBvZiBwKXtpZihjaD09PSJ4Inx8Y2g9PT0ieSIpe2NvbnN0IG49TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjE2KTtyKz0oY2g9PT0ieSI/KG4mMHgzKXwweDg6bikudG9TdHJpbmcoMTYpfWVsc2Ugcis9Y2h9cmV0dXJuIHJ9CmZ1bmN0aW9uIGdldFJhbmRvbUNoYXJzKG49MTYpe2NvbnN0IGM9IjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IjtsZXQgcj0iIjtmb3IobGV0IGk9MDtpPG47aSsrKXIrPWMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpjLmxlbmd0aCkpO3JldHVybiByfQpmdW5jdGlvbiB0b1F1ZXJ5KHA9e30pe3JldHVybiBPYmplY3Qua2V5cyhwKS5maWx0ZXIoaz0+cFtrXSE9PXVuZGVmaW5lZCYmcFtrXSE9PW51bGwpLnNvcnQoKS5tYXAoaz0+aysiPSIrcFtrXSkuam9pbigiJiIpfQpmdW5jdGlvbiBjbGVhblRva2VuKHQpe3JldHVybiBTdHJpbmcodHx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWVhcmVyXHMrL2ksIiIpLnJlcGxhY2UoL1tccyInYF0rL2csIiIpfQpmdW5jdGlvbiBjbGVhbkJhcmtLZXkoYil7bGV0IHM9U3RyaW5nKGJ8fCIiKS50cmltKCkucmVwbGFjZSgvXltiQl1hcmtccyooa2V5KT9ccypbOu+8ml1ccyovaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIikudHJpbSgpO3JldHVybiBzLnJlcGxhY2UoL1wvKyQvLCIiKX0KZnVuY3Rpb24gbWFza1Zpbih2KXtjb25zdCBzPVN0cmluZyh2fHwiIik7aWYoIXMpcmV0dXJuIiI7aWYocy5sZW5ndGg8PTcpcmV0dXJuIioqKioiO3JldHVybiBzLnN1YnN0cmluZygwLDMpKyIqKioqIitzLnN1YnN0cmluZyhzLmxlbmd0aC00KX0KZnVuY3Rpb24gZGVlcFBpY2sob2JqLGtleXMsZGVwdGgpe2lmKCFvYmp8fHR5cGVvZiBvYmohPT0ib2JqZWN0Inx8KGRlcHRofHwwKT41KXJldHVybiIiO2Zvcihjb25zdCBrIG9mIGtleXMpe2lmKG9ialtrXSE9PXVuZGVmaW5lZCYmb2JqW2tdIT09bnVsbCYmb2JqW2tdIT09IiIpcmV0dXJuIFN0cmluZyhvYmpba10pfWZvcihjb25zdCBrIGluIG9iail7aWYob2JqW2tdJiZ0eXBlb2Ygb2JqW2tdPT09Im9iamVjdCIpe2NvbnN0IHI9ZGVlcFBpY2sob2JqW2tdLGtleXMsKGRlcHRofHwwKSsxKTtpZihyKXJldHVybiByfX1yZXR1cm4iIn0KZnVuY3Rpb24gcGlja0lvdFByb3AoZCxpZGVudGlmeSl7Y29uc3QgYXJyPWQmJmQuaW90UHJvcGVydGllcztpZihBcnJheS5pc0FycmF5KGFycikpe2NvbnN0IGtleT1TdHJpbmcoaWRlbnRpZnkpLnRvTG93ZXJDYXNlKCk7Zm9yKGNvbnN0IGl0IG9mIGFycil7aWYoaXQmJlN0cmluZyhpdC5pZGVudGlmeXx8IiIpLnRvTG93ZXJDYXNlKCk9PT1rZXkmJml0LnZhbHVlIT09bnVsbCYmaXQudmFsdWUhPT11bmRlZmluZWQmJml0LnZhbHVlIT09IiIpcmV0dXJuIFN0cmluZyhpdC52YWx1ZSl9fXJldHVybiIifQpmdW5jdGlvbiBnZXREZXZpY2VJZGVudGlmeShhY2Mpe2NvbnN0IHNlZWQ9U3RyaW5nKGFjYy51c2VySWR8fGFjYy52aW5Ob3x8InplZWhvLWRldmljZSIpO2xldCBoPTA7Zm9yKGxldCBpPTA7aTxzZWVkLmxlbmd0aDtpKyspe2g9KChoPDw1KS1oK3NlZWQuY2hhckNvZGVBdChpKSl8MH1yZXR1cm4oTWF0aC5hYnMoaCkudG9TdHJpbmcoMTYpKyIwMDAwMDAwMDAwMDAwMDAwIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIGhhc1ZhbGlkQ29vcmQobGF0LGxuZyl7aWYobGF0PT09IiJ8fGxhdD09PW51bGx8fGxhdD09PXVuZGVmaW5lZHx8bG5nPT09IiJ8fGxuZz09PW51bGx8fGxuZz09PXVuZGVmaW5lZClyZXR1cm4gZmFsc2U7Y29uc3QgbGE9TnVtYmVyKGxhdCksbG49TnVtYmVyKGxuZyk7cmV0dXJuIGlzRmluaXRlKGxhKSYmaXNGaW5pdGUobG4pJiZNYXRoLmFicyhsYSk8PTkwJiZNYXRoLmFicyhsbik8PTE4MCYmIShsYT09PTAmJmxuPT09MCl9CmZ1bmN0aW9uIG5vcm1hbGl6ZVJlZnJlc2hTZWModil7Y29uc3Qgbj1OdW1iZXIodik7aWYoIWlzRmluaXRlKG4pfHxuPD0wKXJldHVybiA2MDtyZXR1cm4gTWF0aC5tYXgoMTUsTWF0aC5taW4oMzYwMCxNYXRoLnJvdW5kKG4pKSl9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHM9PW51bGw/IiI6cykucmVwbGFjZSgvJi9nLCImYW1wOyIpLnJlcGxhY2UoLzwvZywiJmx0OyIpLnJlcGxhY2UoLz4vZywiJmd0OyIpLnJlcGxhY2UoLyIvZywiJnF1b3Q7Iil9CgovKiA9PT09PT09PT09PT09PT09PSBNRDUgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbWQ1KHQsZSl7ZnVuY3Rpb24gbih0LGUpe3JldHVybiB0PDxlfHQ+Pj4zMi1lfWZ1bmN0aW9uIHIodCxlKXt2YXIgbixyLG8saSxhO3JldHVybiBvPTIxNDc0ODM2NDgmdCxpPTIxNDc0ODM2NDgmZSxhPSgxMDczNzQxODIzJnQpKygxMDczNzQxODIzJmUpLChuPTEwNzM3NDE4MjQmdCkmKHI9MTA3Mzc0MTgyNCZlKT8yMTQ3NDgzNjQ4XmFeb15pOm58cj8xMDczNzQxODI0JmE/MzIyMTIyNTQ3Ml5hXm9eaToxMDczNzQxODI0XmFeb15pOmFeb15pfWZ1bmN0aW9uIG8odCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmZXx+dCZufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGkodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHQmbnxlJn5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGEodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIHReZV5ufShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIHUodCxlLG8saSxhLHUsYyl7cmV0dXJuIHQ9cih0LHIocihmdW5jdGlvbih0LGUsbil7cmV0dXJuIGVeKHR8fm4pfShlLG8saSksYSksYykpLHIobih0LHUpLGUpfWZ1bmN0aW9uIGModCl7dmFyIGUsbj0iIixyPSIiO2ZvcihlPTA7ZTw9MztlKyspbis9KHI9IjAiKyh0Pj4+OCplJjI1NSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoci5sZW5ndGgtMiwyKTtyZXR1cm4gbn12YXIgcyxsLGYscCxkLGgsdix5LGcsbT1BcnJheSgpO2ZvcihtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxuPXQubGVuZ3RoLHI9bis4LG89MTYqKChyLXIlNjQpLzY0KzEpLGk9QXJyYXkoby0xKSxhPTAsdT0wO3U8bjspYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfHQuY2hhckNvZGVBdCh1KTw8YSx1Kys7cmV0dXJuIGE9dSU0KjgsaVtlPSh1LXUlNCkvNF09aVtlXXwxMjg8PGEsaVtvLTJdPW48PDMsaVtvLTFdPW4+Pj4yOSxpfSh0PWZ1bmN0aW9uKHQpe3Q9dC5yZXBsYWNlKC9cclxuL2csIlxuIik7Zm9yKHZhciBlPSIiLG49MDtuPHQubGVuZ3RoO24rKyl7dmFyIHI9dC5jaGFyQ29kZUF0KG4pO3I8MTI4P2UrPVN0cmluZy5mcm9tQ2hhckNvZGUocik6cj4xMjcmJnI8MjA0OD8oZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42fDE5MiksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpOihlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjEyfDIyNCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyPj42JjYzfDEyOCksZSs9U3RyaW5nLmZyb21DaGFyQ29kZSg2MyZyfDEyOCkpfXJldHVybiBlfSh0KSksaD0xNzMyNTg0MTkzLHY9NDAyMzIzMzQxNyx5PTI1NjIzODMxMDIsZz0yNzE3MzM4Nzgscz0wO3M8bS5sZW5ndGg7cys9MTYpbD1oLGY9dixwPXksZD1nLGg9byhoLHYseSxnLG1bcyswXSw3LDM2MTQwOTAzNjApLGc9byhnLGgsdix5LG1bcysxXSwxMiwzOTA1NDAyNzEwKSx5PW8oeSxnLGgsdixtW3MrMl0sMTcsNjA2MTA1ODE5KSx2PW8odix5LGcsaCxtW3MrM10sMjIsMzI1MDQ0MTk2NiksaD1vKGgsdix5LGcsbVtzKzRdLDcsNDExODU0ODM5OSksZz1vKGcsaCx2LHksbVtzKzVdLDEyLDEyMDAwODA0MjYpLHk9byh5LGcsaCx2LG1bcys2XSwxNywyODIxNzM1OTU1KSx2PW8odix5LGcsaCxtW3MrN10sMjIsNDI0OTI2MTMxMyksaD1vKGgsdix5LGcsbVtzKzhdLDcsMTc3MDAzNTQxNiksZz1vKGcsaCx2LHksbVtzKzldLDEyLDIzMzY1NTI4NzkpLHk9byh5LGcsaCx2LG1bcysxMF0sMTcsNDI5NDkyNTIzMyksdj1vKHYseSxnLGgsbVtzKzExXSwyMiwyMzA0NTYzMTM0KSxoPW8oaCx2LHksZyxtW3MrMTJdLDcsMTgwNDYwMzY4MiksZz1vKGcsaCx2LHksbVtzKzEzXSwxMiw0MjU0NjI2MTk1KSx5PW8oeSxnLGgsdixtW3MrMTRdLDE3LDI3OTI5NjUwMDYpLGg9aShoLHY9byh2LHksZyxoLG1bcysxNV0sMjIsMTIzNjUzNTMyOSkseSxnLG1bcysxXSw1LDQxMjkxNzA3ODYpLGc9aShnLGgsdix5LG1bcys2XSw5LDMyMjU0NjU2NjQpLHk9aSh5LGcsaCx2LG1bcysxMV0sMTQsNjQzNzE3NzEzKSx2PWkodix5LGcsaCxtW3MrMF0sMjAsMzkyMTA2OTk5NCksaD1pKGgsdix5LGcsbVtzKzVdLDUsMzU5MzQwODYwNSksZz1pKGcsaCx2LHksbVtzKzEwXSw5LDM4MDE2MDgzKSx5PWkoeSxnLGgsdixtW3MrMTVdLDE0LDM2MzQ0ODg5NjEpLHY9aSh2LHksZyxoLG1bcys0XSwyMCwzODg5NDI5NDQ4KSxoPWkoaCx2LHksZyxtW3MrOV0sNSw1Njg0NDY0MzgpLGc9aShnLGgsdix5LG1bcysxNF0sOSwzMjc1MTYzNjA2KSx5PWkoeSxnLGgsdixtW3MrM10sMTQsNDEwNzYwMzMzNSksdj1pKHYseSxnLGgsbVtzKzhdLDIwLDExNjM1MzE1MDEpLGg9aShoLHYseSxnLG1bcysxM10sNSwyODUwMjg1ODI5KSxnPWkoZyxoLHYseSxtW3MrMl0sOSw0MjQzNTYzNTEyKSx5PWkoeSxnLGgsdixtW3MrN10sMTQsMTczNTMyODQ3MyksaD1hKGgsdj1pKHYseSxnLGgsbVtzKzEyXSwyMCwyMzY4MzU5NTYyKSx5LGcsbVtzKzVdLDQsNDI5NDU4ODczOCksZz1hKGcsaCx2LHksbVtzKzhdLDExLDIyNzIzOTI4MzMpLHk9YSh5LGcsaCx2LG1bcysxMV0sMTYsMTgzOTAzMDU2Miksdj1hKHYseSxnLGgsbVtzKzE0XSwyMyw0MjU5NjU3NzQwKSxoPWEoaCx2LHksZyxtW3MrMV0sNCwyNzYzOTc1MjM2KSxnPWEoZyxoLHYseSxtW3MrNF0sMTEsMTI3Mjg5MzM1MykseT1hKHksZyxoLHYsbVtzKzddLDE2LDQxMzk0Njk2NjQpLHY9YSh2LHksZyxoLG1bcysxMF0sMjMsMzIwMDIzNjY1NiksaD1hKGgsdix5LGcsbVtzKzEzXSw0LDY4MTI3OTE3NCksZz1hKGcsaCx2LHksbVtzKzBdLDExLDM5MzY0MzAwNzQpLHk9YSh5LGcsaCx2LG1bcyszXSwxNiwzNTcyNDQ1MzE3KSx2PWEodix5LGcsaCxtW3MrNl0sMjMsNzYwMjkxODkpLGg9YShoLHYseSxnLG1bcys5XSw0LDM2NTQ2MDI4MDkpLGc9YShnLGgsdix5LG1bcysxMl0sMTEsMzg3MzE1MTQ2MSkseT1hKHksZyxoLHYsbVtzKzE1XSwxNiw1MzA3NDI1MjApLGg9dShoLHY9YSh2LHksZyxoLG1bcysyXSwyMywzMjk5NjI4NjQ1KSx5LGcsbVtzKzBdLDYsNDA5NjMzNjQ1MiksZz11KGcsaCx2LHksbVtzKzddLDEwLDExMjY4OTE0MTUpLHk9dSh5LGcsaCx2LG1bcysxNF0sMTUsMjg3ODYxMjM5MSksdj11KHYseSxnLGgsbVtzKzVdLDIxLDQyMzc1MzMyNDEpLGg9dShoLHYseSxnLG1bcysxMl0sNiwxNzAwNDg1NTcxKSxnPXUoZyxoLHYseSxtW3MrM10sMTAsMjM5OTk4MDY5MCkseT11KHksZyxoLHYsbVtzKzEwXSwxNSw0MjkzOTE1NzczKSx2PXUodix5LGcsaCxtW3MrMV0sMjEsMjI0MDA0NDQ5NyksaD11KGgsdix5LGcsbVtzKzhdLDYsMTg3MzMxMzM1OSksZz11KGcsaCx2LHksbVtzKzE1XSwxMCw0MjY0MzU1NTUyKSx5PXUoeSxnLGgsdixtW3MrNl0sMTUsMjczNDc2ODkxNiksdj11KHYseSxnLGgsbVtzKzEzXSwyMSwxMzA5MTUxNjQ5KSxoPXUoaCx2LHksZyxtW3MrNF0sNiw0MTQ5NDQ0MjI2KSxnPXUoZyxoLHYseSxtW3MrMTFdLDEwLDMxNzQ3NTY5MTcpLHk9dSh5LGcsaCx2LG1bcysyXSwxNSw3MTg3ODcyNTkpLHY9dSh2LHksZyxoLG1bcys5XSwyMSwzOTUxNDgxNzQ1KSxoPXIoaCxsKSx2PXIodixmKSx5PXIoeSxwKSxnPXIoZyxkKTtyZXR1cm4gMzI9PWU/KGMoaCkrYyh2KStjKHkpK2MoZykpLnRvTG93ZXJDYXNlKCk6KGModikrYyh5KSkudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gU0hBMSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBzaGExKG1zZyl7ZnVuY3Rpb24gcm90YXRlX2xlZnQobixzKXt2YXIgdDQ9KG48PHMpfChuPj4+KDMyLXMpKTtyZXR1cm4gdDR9O2Z1bmN0aW9uIGN2dF9oZXgodmFsKXt2YXIgc3RyPScnO3ZhciBpO3ZhciB2O2ZvcihpPTc7aT49MDtpLS0pe3Y9KHZhbD4+PihpKjQpKSYweDBmO3N0cis9di50b1N0cmluZygxNil9cmV0dXJuIHN0cn07ZnVuY3Rpb24gVXRmOEVuY29kZShzdHJpbmcpe3N0cmluZz1zdHJpbmcucmVwbGFjZSgvXHJcbi9nLCdcbicpO3ZhciB1dGZ0ZXh0PScnO2Zvcih2YXIgbj0wO248c3RyaW5nLmxlbmd0aDtuKyspe3ZhciBjPXN0cmluZy5jaGFyQ29kZUF0KG4pO2lmKGM8MTI4KXt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKGMpfWVsc2UgaWYoKGM+MTI3KSYmKGM8MjA0OCkpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjYpfDE5Mik7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2Myl8MTI4KX1lbHNle3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKXwyMjQpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSY2Myl8MTI4KTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfX1yZXR1cm4gdXRmdGV4dH07dmFyIGJsb2Nrc3RhcnQ7dmFyIGksajt2YXIgVz1uZXcgQXJyYXkoODApO3ZhciBIMD0weDY3NDUyMzAxO3ZhciBIMT0weEVGQ0RBQjg5O3ZhciBIMj0weDk4QkFEQ0ZFO3ZhciBIMz0weDEwMzI1NDc2O3ZhciBIND0weEMzRDJFMUYwO3ZhciBBLEIsQyxELEU7dmFyIHRlbXA7bXNnPVV0ZjhFbmNvZGUobXNnKTt2YXIgbXNnX2xlbj1tc2cubGVuZ3RoO3ZhciB3b3JkX2FycmF5PW5ldyBBcnJheSgpO2ZvcihpPTA7aTxtc2dfbGVuLTM7aSs9NCl7aj1tc2cuY2hhckNvZGVBdChpKTw8MjR8bXNnLmNoYXJDb2RlQXQoaSsxKTw8MTZ8bXNnLmNoYXJDb2RlQXQoaSsyKTw8OHxtc2cuY2hhckNvZGVBdChpKzMpO3dvcmRfYXJyYXkucHVzaChqKX1zd2l0Y2gobXNnX2xlbiU0KXtjYXNlIDA6aT0weDA4MDAwMDAwMDticmVhaztjYXNlIDE6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwyNHwweDA4MDAwMDA7YnJlYWs7Y2FzZSAyOmk9bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0yKTw8MjR8bXNnLmNoYXJDb2RlQXQobXNnX2xlbi0xKTw8MTZ8MHgwODAwMDticmVhaztjYXNlIDM6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTMpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwxNnxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDw4fDB4ODA7YnJlYWt9d29yZF9hcnJheS5wdXNoKGkpO3doaWxlKCh3b3JkX2FycmF5Lmxlbmd0aCUxNikhPTE0KXdvcmRfYXJyYXkucHVzaCgwKTt3b3JkX2FycmF5LnB1c2gobXNnX2xlbj4+PjI5KTt3b3JkX2FycmF5LnB1c2goKG1zZ19sZW48PDMpJjB4MGZmZmZmZmZmKTtmb3IoYmxvY2tzdGFydD0wO2Jsb2Nrc3RhcnQ8d29yZF9hcnJheS5sZW5ndGg7YmxvY2tzdGFydCs9MTYpe2ZvcihpPTA7aTwxNjtpKyspV1tpXT13b3JkX2FycmF5W2Jsb2Nrc3RhcnQraV07Zm9yKGk9MTY7aTw9Nzk7aSsrKVdbaV09cm90YXRlX2xlZnQoV1tpLTNdXldbaS04XV5XW2ktMTRdXldbaS0xNl0sMSk7QT1IMDtCPUgxO0M9SDI7RD1IMztFPUg0O2ZvcihpPTA7aTw9MTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwofkImRCkpK0UrV1tpXSsweDVBODI3OTk5KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT0yMDtpPD0zOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKEJeQ15EKStFK1dbaV0rMHg2RUQ5RUJBMSkmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NDA7aTw9NTk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKygoQiZDKXwoQiZEKXwoQyZEKSkrRStXW2ldKzB4OEYxQkJDREMpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTYwO2k8PTc5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweENBNjJDMUQ2KSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1IMD0oSDArQSkmMHgwZmZmZmZmZmY7SDE9KEgxK0IpJjB4MGZmZmZmZmZmO0gyPShIMitDKSYweDBmZmZmZmZmZjtIMz0oSDMrRCkmMHgwZmZmZmZmZmY7SDQ9KEg0K0UpJjB4MGZmZmZmZmZmfXZhciB0ZW1wPWN2dF9oZXgoSDApK2N2dF9oZXgoSDEpK2N2dF9oZXgoSDIpK2N2dF9oZXgoSDMpK2N2dF9oZXgoSDQpO3JldHVybiB0ZW1wLnRvTG93ZXJDYXNlKCl9Ci8qID09PT09PT09PT09PT09PT09IEFFUy0yNTYtRUNCICsgUEtDUzcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQUVTX1NCT1g9bmV3IFVpbnQ4QXJyYXkoWzB4NjMsMHg3YywweDc3LDB4N2IsMHhmMiwweDZiLDB4NmYsMHhjNSwweDMwLDB4MDEsMHg2NywweDJiLDB4ZmUsMHhkNywweGFiLDB4NzYsMHhjYSwweDgyLDB4YzksMHg3ZCwweGZhLDB4NTksMHg0NywweGYwLDB4YWQsMHhkNCwweGEyLDB4YWYsMHg5YywweGE0LDB4NzIsMHhjMCwweGI3LDB4ZmQsMHg5MywweDI2LDB4MzYsMHgzZiwweGY3LDB4Y2MsMHgzNCwweGE1LDB4ZTUsMHhmMSwweDcxLDB4ZDgsMHgzMSwweDE1LDB4MDQsMHhjNywweDIzLDB4YzMsMHgxOCwweDk2LDB4MDUsMHg5YSwweDA3LDB4MTIsMHg4MCwweGUyLDB4ZWIsMHgyNywweGIyLDB4NzUsMHgwOSwweDgzLDB4MmMsMHgxYSwweDFiLDB4NmUsMHg1YSwweGEwLDB4NTIsMHgzYiwweGQ2LDB4YjMsMHgyOSwweGUzLDB4MmYsMHg4NCwweDUzLDB4ZDEsMHgwMCwweGVkLDB4MjAsMHhmYywweGIxLDB4NWIsMHg2YSwweGNiLDB4YmUsMHgzOSwweDRhLDB4NGMsMHg1OCwweGNmLDB4ZDAsMHhlZiwweGFhLDB4ZmIsMHg0MywweDRkLDB4MzMsMHg4NSwweDQ1LDB4ZjksMHgwMiwweDdmLDB4NTAsMHgzYywweDlmLDB4YTgsMHg1MSwweGEzLDB4NDAsMHg4ZiwweDkyLDB4OWQsMHgzOCwweGY1LDB4YmMsMHhiNiwweGRhLDB4MjEsMHgxMCwweGZmLDB4ZjMsMHhkMiwweGNkLDB4MGMsMHgxMywweGVjLDB4NWYsMHg5NywweDQ0LDB4MTcsMHhjNCwweGE3LDB4N2UsMHgzZCwweDY0LDB4NWQsMHgxOSwweDczLDB4NjAsMHg4MSwweDRmLDB4ZGMsMHgyMiwweDJhLDB4OTAsMHg4OCwweDQ2LDB4ZWUsMHhiOCwweDE0LDB4ZGUsMHg1ZSwweDBiLDB4ZGIsMHhlMCwweDMyLDB4M2EsMHgwYSwweDQ5LDB4MDYsMHgyNCwweDVjLDB4YzIsMHhkMywweGFjLDB4NjIsMHg5MSwweDk1LDB4ZTQsMHg3OSwweGU3LDB4YzgsMHgzNywweDZkLDB4OGQsMHhkNSwweDRlLDB4YTksMHg2YywweDU2LDB4ZjQsMHhlYSwweDY1LDB4N2EsMHhhZSwweDA4LDB4YmEsMHg3OCwweDI1LDB4MmUsMHgxYywweGE2LDB4YjQsMHhjNiwweGU4LDB4ZGQsMHg3NCwweDFmLDB4NGIsMHhiZCwweDhiLDB4OGEsMHg3MCwweDNlLDB4YjUsMHg2NiwweDQ4LDB4MDMsMHhmNiwweDBlLDB4NjEsMHgzNSwweDU3LDB4YjksMHg4NiwweGMxLDB4MWQsMHg5ZSwweGUxLDB4ZjgsMHg5OCwweDExLDB4NjksMHhkOSwweDhlLDB4OTQsMHg5YiwweDFlLDB4ODcsMHhlOSwweGNlLDB4NTUsMHgyOCwweGRmLDB4OGMsMHhhMSwweDg5LDB4MGQsMHhiZiwweGU2LDB4NDIsMHg2OCwweDQxLDB4OTksMHgyZCwweDBmLDB4YjAsMHg1NCwweGJiLDB4MTZdKTsKY29uc3QgQUVTX1JDT049bmV3IFVpbnQ4QXJyYXkoWzB4MDAsMHgwMSwweDAyLDB4MDQsMHgwOCwweDEwLDB4MjAsMHg0MCwweDgwLDB4MWIsMHgzNiwweDZjLDB4ZDgsMHhhYiwweDRkXSk7CmZ1bmN0aW9uIGFlc0dNdWwoYSxiKXtsZXQgcD0wO2ZvcihsZXQgaT0wO2k8ODtpKyspe2lmKGImMSlwXj1hO2NvbnN0IGhpPWEmMHg4MDthPShhPDwxKSYweGZmO2lmKGhpKWFePTB4MWI7Yj4+PTF9cmV0dXJuIHB9CmZ1bmN0aW9uIGFlc0tleUV4cGFuc2lvbjI1NihrZXkpe2NvbnN0IE5rPTgsTmI9NCxOcj0xNDtjb25zdCB3PW5ldyBVaW50OEFycmF5KDQqTmIqKE5yKzEpKTtmb3IobGV0IGk9MDtpPE5rKjQ7aSsrKXdbaV09a2V5W2ldO2ZvcihsZXQgaT1OaztpPE5iKihOcisxKTtpKyspe2xldCB0MD13WzQqKGktMSldLHQxPXdbNCooaS0xKSsxXSx0Mj13WzQqKGktMSkrMl0sdDM9d1s0KihpLTEpKzNdO2lmKGklTms9PT0wKXtjb25zdCB0bXA9dDA7dDA9QUVTX1NCT1hbdDFdXkFFU19SQ09OW2kvTmtdO3QxPUFFU19TQk9YW3QyXTt0Mj1BRVNfU0JPWFt0M107dDM9QUVTX1NCT1hbdG1wXX1lbHNlIGlmKGklTms9PT00KXt0MD1BRVNfU0JPWFt0MF07dDE9QUVTX1NCT1hbdDFdO3QyPUFFU19TQk9YW3QyXTt0Mz1BRVNfU0JPWFt0M119d1s0KmldPXdbNCooaS1OayldXnQwO3dbNCppKzFdPXdbNCooaS1OaykrMV1edDE7d1s0KmkrMl09d1s0KihpLU5rKSsyXV50Mjt3WzQqaSszXT13WzQqKGktTmspKzNdXnQzfXJldHVybiB3fQpmdW5jdGlvbiBhZXNFbmNyeXB0QmxvY2soaW5wdXQsdyl7Y29uc3QgTmI9NCxOcj0xNDtjb25zdCBzPW5ldyBVaW50OEFycmF5KDE2KTtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPWlucHV0W2ldO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbaV07Zm9yKGxldCByb3VuZD0xO3JvdW5kPD1Ocjtyb3VuZCsrKXtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldPUFFU19TQk9YW3NbaV1dO2xldCB0PXNbMV07c1sxXT1zWzVdO3NbNV09c1s5XTtzWzldPXNbMTNdO3NbMTNdPXQ7dD1zWzJdO3NbMl09c1sxMF07c1sxMF09dDt0PXNbNl07c1s2XT1zWzE0XTtzWzE0XT10O3Q9c1szXTtzWzNdPXNbMTVdO3NbMTVdPXNbMTFdO3NbMTFdPXNbN107c1s3XT10O2lmKHJvdW5kIT09TnIpe2ZvcihsZXQgYz0wO2M8NDtjKyspe2NvbnN0IGk9NCpjO2NvbnN0IGEwPXNbaV0sYTE9c1tpKzFdLGEyPXNbaSsyXSxhMz1zW2krM107c1tpXT1hZXNHTXVsKGEwLDIpXmFlc0dNdWwoYTEsMyleYTJeYTM7c1tpKzFdPWEwXmFlc0dNdWwoYTEsMileYWVzR011bChhMiwzKV5hMztzW2krMl09YTBeYTFeYWVzR011bChhMiwyKV5hZXNHTXVsKGEzLDMpO3NbaSszXT1hZXNHTXVsKGEwLDMpXmExXmEyXmFlc0dNdWwoYTMsMil9fWNvbnN0IG9mZj1yb3VuZCoxNjtmb3IobGV0IGk9MDtpPDE2O2krKylzW2ldXj13W29mZitpXX1yZXR1cm4gc30KZnVuY3Rpb24gYWVzVXRmOEJ5dGVzKHN0cil7Y29uc3Qgb3V0PVtdO2ZvcihsZXQgaT0wO2k8c3RyLmxlbmd0aDtpKyspe2xldCBjPXN0ci5jaGFyQ29kZUF0KGkpO2lmKGM8MHg4MClvdXQucHVzaChjKTtlbHNlIGlmKGM8MHg4MDApb3V0LnB1c2goMHhjMHwoYz4+NiksMHg4MHwoYyYweDNmKSk7ZWxzZSBpZihjPj0weGQ4MDAmJmM8PTB4ZGJmZil7Y29uc3QgYzI9c3RyLmNoYXJDb2RlQXQoKytpKTtjPTB4MTAwMDArKChjLTB4ZDgwMCk8PDEwKSsoYzItMHhkYzAwKTtvdXQucHVzaCgweGYwfChjPj4xOCksMHg4MHwoKGM+PjEyKSYweDNmKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9ZWxzZSBvdXQucHVzaCgweGUwfChjPj4xMiksMHg4MHwoKGM+PjYpJjB4M2YpLDB4ODB8KGMmMHgzZikpfXJldHVybiBuZXcgVWludDhBcnJheShvdXQpfQpmdW5jdGlvbiBhZXNCeXRlc1RvQmFzZTY0KGJ5dGVzKXtjb25zdCBjaGFycz0iQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7bGV0IHJlc3VsdD0iIixpPTA7Zm9yKDtpKzI8Ynl0ZXMubGVuZ3RoO2krPTMpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpfGJ5dGVzW2krMl07cmVzdWx0Kz1jaGFyc1sobj4+MTgpJjYzXStjaGFyc1sobj4+MTIpJjYzXStjaGFyc1sobj4+NikmNjNdK2NoYXJzW24mNjNdfWNvbnN0IHJlbT1ieXRlcy5sZW5ndGgtaTtpZihyZW09PT0xKXtjb25zdCBuPWJ5dGVzW2ldPDwxNjtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdKyI9PSJ9ZWxzZSBpZihyZW09PT0yKXtjb25zdCBuPShieXRlc1tpXTw8MTYpfChieXRlc1tpKzFdPDw4KTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rIj0ifXJldHVybiByZXN1bHR9CmZ1bmN0aW9uIGFlczI1NkVjYkVuY3J5cHRCYXNlNjQocGxhaW50ZXh0LGtleVN0cil7Y29uc3Qga2V5PWFlc1V0ZjhCeXRlcyhrZXlTdHIpO2lmKGtleS5sZW5ndGghPT0zMil0aHJvdyBuZXcgRXJyb3IoIkFFUy0yNTbpnIDopoEzMuWtl+iKguWvhumSpe+8jOW9k+WJjSIra2V5Lmxlbmd0aCk7Y29uc3Qgdz1hZXNLZXlFeHBhbnNpb24yNTYoa2V5KTtjb25zdCBkYXRhPWFlc1V0ZjhCeXRlcyhwbGFpbnRleHQpO2NvbnN0IHBhZExlbj0xNi0oZGF0YS5sZW5ndGglMTYpO2NvbnN0IHBhZGRlZD1uZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCtwYWRMZW4pO3BhZGRlZC5zZXQoZGF0YSk7Zm9yKGxldCBpPWRhdGEubGVuZ3RoO2k8cGFkZGVkLmxlbmd0aDtpKyspcGFkZGVkW2ldPXBhZExlbjtjb25zdCBvdXQ9bmV3IFVpbnQ4QXJyYXkocGFkZGVkLmxlbmd0aCk7Zm9yKGxldCBvZmY9MDtvZmY8cGFkZGVkLmxlbmd0aDtvZmYrPTE2KXtvdXQuc2V0KGFlc0VuY3J5cHRCbG9jayhwYWRkZWQuc2xpY2Uob2ZmLG9mZisxNiksdyksb2ZmKX1yZXR1cm4gYWVzQnl0ZXNUb0Jhc2U2NChvdXQpfQoKLyogPT09PT09PT09PT09PT09PT0g5a2Y5YKoID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGxvYWRKU09OKGssZmFsbGJhY2spe3RyeXtjb25zdCByYXc9bG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7aWYoIXJhdylyZXR1cm4gZmFsbGJhY2s7Y29uc3Qgdj1KU09OLnBhcnNlKHJhdyk7cmV0dXJuIHY9PT11bmRlZmluZWR8fHY9PT1udWxsP2ZhbGxiYWNrOnZ9Y2F0Y2goZSl7cmV0dXJuIGZhbGxiYWNrfX0KZnVuY3Rpb24gc2F2ZUpTT04oayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayxKU09OLnN0cmluZ2lmeSh2KSk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KY29uc3QgREVGQVVMVF9DRkc9e2FwcDp7YXBwSWQ6IlM3cVBXUFUxIixhcHBTZWNyZXQ6ImM1ZTBkYTdmNGRhMjhkZjgwNTY5NGVjM2RkMWZjNjc5MmU5ZGY5OWQifSxoNTp7YXBwSWQ6IlN3NUY5dUppIixhcHBTZWNyZXQ6IjQ2ODcwYThmNjc4YTA5MTA5NDY4ZjViMDE2ODgxOGI5MWMyOTI4NDUifSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6dHJ1ZSxlbmFibGVMaWtlOnRydWUsZW5hYmxlQ29tbWVudDp0cnVlLGVuYWJsZVNoYXJlOnRydWUsZW5hYmxlRGVsZXRlOnRydWV9LHZlaGljbGVBZXNLZXk6ImNlMmNkN2NiNTcxMjRjMTM0OWRkODU0M2JmNmZkMzFkIix2ZWhpY2xlQ29udHJvbFJpc2s6IiIsYXV0b1JlZnJlc2hTZWM6NjAsc2VydmVyQmFzZToiIixhdXRvU2lnbmluOmZhbHNlLGF1dG9TaWduaW5UaW1lOiIwNzowMCIsdmVoaWNsZU1vbml0b3I6ZmFsc2Usd2lkZ2V0VmVoaWNsZToiIixjdXN0b21CZzoiIixwaWNzOnt9fTsKZnVuY3Rpb24gZ2V0Q2ZnKCl7Y29uc3QgYz1sb2FkSlNPTihLRVlTLmNmZyxudWxsKTtpZighYylyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShERUZBVUxUX0NGRykpO3JldHVybnthcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fERFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH0sY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSx2ZWhpY2xlQWVzS2V5OigodHlwZW9mIGMudmVoaWNsZUFlc0tleT09PSJzdHJpbmciP2MudmVoaWNsZUFlc0tleToiIikudHJpbSgpfHxERUZBVUxUX0NGRy52ZWhpY2xlQWVzS2V5KSx2ZWhpY2xlQ29udHJvbFJpc2s6KHR5cGVvZiBjLnZlaGljbGVDb250cm9sUmlzaz09PSJzdHJpbmciP2MudmVoaWNsZUNvbnRyb2xSaXNrOiIiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSxzZXJ2ZXJCYXNlOlN0cmluZyhjLnNlcnZlckJhc2V8fCIiKS50cmltKCksYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsIHdpZGdldFZlaGljbGU6U3RyaW5nKGMud2lkZ2V0VmVoaWNsZXx8IiIpLCBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpfX0KZnVuY3Rpb24gc2F2ZUNmZyhjKXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5jZmcsYyl9CmZ1bmN0aW9uIGdldEFjY291bnRzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmFjY291bnRzLFtdKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfQpmdW5jdGlvbiBzYXZlQWNjb3VudHMobGlzdCl7cmV0dXJuIHNhdmVKU09OKEtFWVMuYWNjb3VudHMsbGlzdCl9CmZ1bmN0aW9uIGdldExvZ3MoKXtjb25zdCBhPWxvYWRKU09OKEtFWVMubG9ncyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gYWRkTG9nKGVudHJ5KXtjb25zdCBsb2dzPWdldExvZ3MoKTtsb2dzLnVuc2hpZnQoZW50cnkpO2lmKGxvZ3MubGVuZ3RoPjUwKWxvZ3MubGVuZ3RoPTUwO3NhdmVKU09OKEtFWVMubG9ncyxsb2dzKX0KZnVuY3Rpb24gY2xlYXJMb2dzKCl7cmV0dXJuIHNhdmVKU09OKEtFWVMubG9ncyxbXSl9CmZ1bmN0aW9uIGlzUHJveHlNb2RlKCl7cmV0dXJuICEhKHdpbmRvdy5fX1BBTkVMX01PREVfXyl8fCEhZ2V0Q2ZnKCkuc2VydmVyQmFzZX0KLyogPT09PT09PT09PT09PT09PT0g562+5ZCNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFNpZ24odHlwZSxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jW3R5cGVdfHxjLmFwcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXR5cGU9PT0iaDUiP2dldFV1aWQoKTp0aW1lc3RhbXArZ2V0UmFuZG9tQ2hhcnMoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj1ib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOicnO2NvbnN0IHNpZ25hdHVyZT10eXBlPT09Img1Ij8ocXVlcnkrcGFyYW0rYWMuYXBwU2VjcmV0KTooYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpO2NvbnN0IHNpZ249bWQ1KHNoYTEoc2lnbmF0dXJlKSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2NmbW90by14LXBhcmFtJzpwYXJhbSwnY2Ztb3RvLXgtc2lnbic6c2lnbiwnY2Ztb3RvLXgtc2lnbi10eXBlJzonMCcsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ25vbmNlJzpub25jZSwnc2lnbmF0dXJlJzpzaWdufX0KCi8vIEg1IOerr+WQqyBib2R5IOetvuWQje+8iGxvZ2luQnlQaG9uZSDnrYnmjqXlj6Plv4Xpobvmioror7fmsYLkvZPnurPlhaXnrb7lkI3vvIzlkKbliJnov5Tlm54gcGVybWl0IGVycm9y77yJCmZ1bmN0aW9uIGg1U2lnbldpdGhCb2R5KGJvZHksY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5oNXx8Yy5hcHA7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPWdldFV1aWQoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj10eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSk7Y29uc3Qgc2lnbj1tZDUoc2hhMShib2R5U3RyK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ2FwcElkJzphYy5hcHBJZH19CgovLyBBcHAg572R5YWz5a6M5pW0562+5ZCN77yI5Y+R56CB5LiO55m75b2V5ZCM572R5YWz77yM6YG/5YWNIEg1IGF1dGhDb2RlIOWPkeeggei/myBBcHAg5rGg6ICMIEg1IGxvZ2luQnlQaG9uZSDmn6XkuI3liLDvvIkKZnVuY3Rpb24gYXBwR2F0ZXdheVNpZ24odXJsLG1ldGhvZCxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jLmFwcHx8Yy5oNTtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHF1ZXJ5PXRvUXVlcnkocGFyYW1zKTtsZXQgcHJlU2lnbj0iIjtpZihTdHJpbmcobWV0aG9kKS50b1VwcGVyQ2FzZSgpPT09IkdFVCIpe2NvbnN0IHU9bmV3IFVSTCh1cmwpO3ByZVNpZ249dS5vcmlnaW4rdS5wYXRobmFtZSsocXVlcnk/Ij8iK3F1ZXJ5OiIiKTt9ZWxzZXtwcmVTaWduPXF1ZXJ5Kyhib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOiIiKTt9Y29uc3Qgc2lnbj1tZDUoc2hhMShwcmVTaWduK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydhcHBJZCc6YWMuYXBwSWQsJ25vbmNlJzpub25jZSwndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnc2lnbmF0dXJlJzpzaWduLCdDZm1vdG8tWC1QYXJhbSc6cGFyYW0sJ0NmbW90by1YLVNpZ24nOnNpZ24sJ0NmbW90by1YLVNpZ24tVHlwZSc6JzAnfX0KCi8vIHYyLjE2LjAg5pyN5Yqh56uv5bey5a+544CM5bimIHF1ZXJ5IOeahCBHRVTjgI3mlLbntKfvvJrluKbml6fnn63moLzlvI8gVUEg5pe25b+F6aG7IHF1ZXJ5IOWFpeetvu+8iOWQpuWImSA0MzAvMzAxMjEgcGVybWl0IGVycm9y77yJ77yMCi8vIOS4juekvuS6pOWGmeaTjeS9nOWQjOS4gOWll+etvuWQje+8iG1kNShzaGExKHF1ZXJ5K3BhcmFtK3NlY3JldCkp77yJ44CC5rWP6KeI5Zmo5peg5rOV6Ieq5a6a5LmJIENvb2tpZe+8jOS9huWunua1i+mdnuW/hemcgOOAggpmdW5jdGlvbiBhcHBRdWVyeVNpZ24ocXVlcnlTdHIsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygxNik7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHNpZ249bWQ1KHNoYTEoKHF1ZXJ5U3RyfHwiIikrcGFyYW0rYWMuYXBwU2VjcmV0KSwzMikudG9TdHJpbmcoKTtyZXR1cm57ImNmbW90by14LXBhcmFtIjpwYXJhbSwiY2Ztb3RvLXgtc2lnbiI6c2lnbiwiY2Ztb3RvLXgtc2lnbi10eXBlIjoiMCIsInRpbWVzdGFtcCI6U3RyaW5nKHRpbWVzdGFtcCksIm5vbmNlIjpub25jZSwic2lnbmF0dXJlIjpzaWdufX0KZnVuY3Rpb24gYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeVN0cixjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCB1YT0iTU9CSUxFfGlPU3wxNy41LjF8WkVFSE9fQVBQfDMuMC41fGlQaG9uZXxpUGhvbmUgMTUgUHJvfDExNzkqMjU1NnwiK2dldFJhbmRvbUNoYXJzKDMyKS50b1VwcGVyQ2FzZSgpKyJ8V1dBTnxpT1MiO3JldHVybnsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQiOiIqLyoiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsImFwcGlkIjpjLmFwcC5hcHBJZCwieC1hcHAtaW5mbyI6dWEsLi4uYXBwUXVlcnlTaWduKHF1ZXJ5U3RyLGMpfX0KCi8qID09PT09PT09PT09PT09PT09IEhUVFDvvIhmZXRjaCDniYjvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gaHR0cEdldCh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkdFVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFBvc3QodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6aGVhZGVyc3x8e30sYm9keTp0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keT09bnVsbD97fTpib2R5KSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFB1dCh1cmwsaGVhZGVycyxib2R5LHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiUFVUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6Ym9keSE9PXVuZGVmaW5lZCYmYm9keSE9PW51bGw/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6dW5kZWZpbmVkLHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwRGVsZXRlKHVybCxoZWFkZXJzLHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiREVMRVRFIixoZWFkZXJzOmhlYWRlcnN8fHt9LHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQpmdW5jdGlvbiBuZXR3b3JrSGludChyZXMpe2NvbnN0IG09U3RyaW5nKChyZXMmJnJlcy5lcnJvcil8fCIiKTtpZigvZmFpbGVkIHRvIGZldGNofG5ldHdvcmtlcnJvcnxjb3JzfGxvYWQgZmFpbGVkfOaXoOazlei/nuaOpXznvZHnu5wvaS50ZXN0KG0pKXJldHVybiLnvZHnu5wv6Leo5Z+f5Y+X6ZmQ77ya55u06L+e5qih5byP6ZyAIFpFRUhPIOacjeWKoeerr+aUvuihjCBDT1JT77yM6K+35qOA5p+l572R57uc6L+e5o6l5ZCO6YeN6K+VIjtyZXR1cm4iIn0KCi8qID09PT09PT09PT09PT09PT09IOebtOi/nuWQjuerr++8iOa1j+iniOWZqOebtOaOpeiwgyBaRUVITyBBUEnvvIkgPT09PT09PT09PT09PT09PT0gKi8KLy8g6aG16Z2i55u06L+e5qih5byP5LiL55qE5YWc5bqV5aS077yaVUEg5pyq6Ieq5a6a5LmJ5pe25q+P5qyh6K+35rGC6ZqP5py66K6+5aSH5oyH57q577yI5LiO6ISa5pys5byV5pOO5ZCM562W55Wl77yM6YG/5YWN5Zu65a6a5oyH57q56KKr6aOO5o6n5ouJ6buR77yJCmZ1bmN0aW9uIHBhZ2VSYW5kb21VQSgpe2NvbnN0IHZlcnM9WyIxNi4xLjEiLCIxNi42LjEiLCIxNi43LjgiLCIxNy4xLjEiLCIxNy4yLjEiLCIxNy40LjEiLCIxNy41LjEiLCIxNy42LjEiLCIxOC4wIiwiMTguMS4xIiwiMTguMy4xIl07cmV0dXJuICJNT0JJTEV8aU9TfCIrdmVyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqdmVycy5sZW5ndGgpXSsifFpFRUhPX0FQUHwzLjAuMXxpUGhvbmV8IisoTWF0aC5yYW5kb20oKTwwLjc/IldXQU4iOiJXSUZJIikrInxpT1MifQpmdW5jdGlvbiBiYXNlSGVhZGVycyhhY2Mpe2NvbnN0IHVhPWFjYy51c2VyQWdlbnR8fHBhZ2VSYW5kb21VQSgpO2NvbnN0IGg9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrY2xlYW5Ub2tlbihhY2MudG9rZW4pLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsIkFjY2VwdC1MYW5ndWFnZSI6InpoLUNOIiwiQWNjZXB0IjoiKi8qIiwiVXNlci1BZ2VudCI6dWEsIngtYXBwLWluZm8iOnVhfTtpZihhY2MudXNlcklkKXtoWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2hbIkNvb2tpZSJdPSJ1c2VyX2lkPSIrYWNjLnVzZXJJZH1yZXR1cm4gaH0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0IixoZWFkZXJzKTtsZXQgbGlzdD1bXTtpZihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCl7aWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpbGlzdD1yZXMuZGF0YTtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmxpc3QpKWxpc3Q9cmVzLmRhdGEubGlzdDtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlY29yZHMpKWxpc3Q9cmVzLmRhdGEucmVjb3JkcztlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJvd3MpKWxpc3Q9cmVzLmRhdGEucm93c31yZXR1cm4gbGlzdC5tYXAodj0+KHt2aW5ObzpTdHJpbmcodi52aW5Ob3x8di5mcmFtZU5vfHx2LnZpbnx8IiIpLnRyaW0oKSxuYW1lOlN0cmluZyh2LnZlaGljbGVOYW1lfHx2LnZlaGljbGVUeXBlfHx2LmRldmljZU5hbWV8fHYubmFtZXx8Iui9pui+hiIpLnRyaW0oKXx8Iui9pui+hiIscGljOlN0cmluZyh2LnZlaGljbGVQaWNVcmx8fHYucGljfHx2LmltYWdlVXJsfHwiIikudHJpbSgpLHZlaGljbGVUeXBlOlN0cmluZyh2LnZlaGljbGVUeXBlfHx2LnR5cGV8fCIiKS50cmltKCksbGljZW5zZVBsYXRlOnYubGljZW5zZVBsYXRlfHxudWxsfSkpLmZpbHRlcih2PT52LnZpbk5vKX1jYXRjaChlKXtyZXR1cm5bXX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvd2lkZ2V0cy8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCBzb2M9TnVtYmVyKGQuYm1zc29jfHxkLmJhdHRlcnlMZXZlbHx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHwwKTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8MCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntiYXR0ZXJ5UGVyY2VudDpNYXRoLm1heCgwLE1hdGgubWluKDEwMCxpc0Zpbml0ZShzb2MpP3NvYzowKSkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsYWRkcmVzczpTdHJpbmcoZC5hZGRyZXNzfHwiIikudHJpbSgpLGxvY2F0aW9uVGltZTpTdHJpbmcoZC5sb2NhdGlvbj8ubG9jYXRpb25UaW1lfHwiIikudHJpbSgpLHZlaGljbGVOYW1lOlN0cmluZyhkLnZlaGljbGVOYW1lfHwiIikudHJpbSgpLHZlaGljbGVJbWFnZVVybDpTdHJpbmcoZC52ZWhpY2xlU2NhbGVQaWNVcmx8fGQudmVoaWNsZVBpY1VybHx8IiIpLnRyaW0oKSxoZWFkTG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fCIiKS50cmltKCksYmF0dGVyeVB1bGxPdXQ6U3RyaW5nKGQuYmF0dGVyeVB1bGxPdXRGbGFnfHwiIik9PT0iMSIsb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fGQuZGV2aWNlT25saW5lfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIixwb3dlclN0YXR1czpTdHJpbmcoZC5hY2NTdGF0dXN8fGQucG93ZXJTdGF0dXN8fGQudmVoaWNsZVN0YXR1c3x8ZC5pZ25pdGlvblN0YXR1c3x8ZC5wb3dlck1vZGV8fGQuYWNjU3RhdGV8fGQucG93ZXJTdGF0ZXx8ZC52ZWhpY2xlU3RhdGV8fGQuZW5naW5lU3RhdHVzfHxkLmlzUG93ZXJPbnx8ZC5wb3dlck9ufHwiIikudHJpbSgpLGxvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGQuY2FyTG9ja1N0YXRlfHxkLmRvb3JMb2NrU3RhdGV8fGQubG9ja0ZsYWd8fGQuaXNMb2NrZWR8fGQubG9ja2VkfHxkLmNlbnRyYWxMb2NraW5nU3RhdHVzfHwiIikudHJpbSgpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBxdWVyeT0idW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/IitxdWVyeTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeSxjZmcpKTtpZihyZXMmJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZlaGljbGVMb2NrPXBpY2tJb3RQcm9wKGQsIlZlaGljbGVMb2NrX1MiKTtjb25zdCBoZWFkTG9ja0lvdD1waWNrSW90UHJvcChkLCJIZWFkTG9ja1N0YXRlIik7Y29uc3QgdG9wTG9jaz1TdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGhlYWRMb2NrSW90fHx2ZWhpY2xlTG9ja3x8IiIpLnRyaW0oKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue3Bvd2VyU3RhdHVzOmRlZXBQaWNrKGQsWyJhY2NTdGF0dXMiLCJwb3dlclN0YXR1cyIsInZlaGljbGVTdGF0dXMiLCJpZ25pdGlvblN0YXR1cyIsInBvd2VyTW9kZSIsImFjY1N0YXRlIiwicG93ZXJTdGF0ZSIsInZlaGljbGVTdGF0ZSIsImVuZ2luZVN0YXR1cyIsImlzUG93ZXJPbiIsInBvd2VyT24iLCJhY2MiXSkudHJpbSgpLGxvY2tTdGF0ZTp0b3BMb2NrLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQucmlkZVN0YXRlfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8IiIpLnRyaW0oKSxyaWRlU3RhdGU6U3RyaW5nKGQucmlkZVN0YXRlfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHF1ZXJ5PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIjtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9hcHAvdmVoaWNsZS90aXJlL21vbml0b3Jpbmc/IitxdWVyeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHF1ZXJ5LGNmZykpO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCBtb250aD1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHFIb21lPSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5Obyk7Y29uc3QgcU15PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZtb250aD0iK21vbnRoO2NvbnN0IFtob21lUmVzLG15UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9ob21lUmlkZUluZm8/IitxSG9tZSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFIb21lLGNmZykpLGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvbXlSaWRlSW5mbz8iK3FNeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFNeSxjZmcpKV0pO2NvbnN0IGg9aG9tZVJlcz8uZGF0YXx8aG9tZVJlc3x8e307Y29uc3QgZD1teVJlcz8uZGF0YXx8bXlSZXN8fHt9O2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShkLnJpZGVSZWNvcmRMaXN0KT9kLnJpZGVSZWNvcmRMaXN0OltdO2NvbnN0IHRvZGF5S2V5PW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGRheT1saXN0LmZpbmQoeD0+U3RyaW5nKHg/LmRhdGV8fCIiKT09PXRvZGF5S2V5KXx8bGlzdFtsaXN0Lmxlbmd0aC0xXXx8e307Y29uc3QgeWVzdD1uZXcgRGF0ZShEYXRlLm5vdygpLTg2NDAwMDAwKTtjb25zdCB5ZXN0S2V5PXllc3QuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKHllc3QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyh5ZXN0LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHlkPWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09eWVzdEtleSl8fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksdG90YWxNaWxlYWdlOk51bWJlcihkLnJpZGVNaWxlYWdlVG90YWw/PzApLHllc3RlcmRheURpc3RhbmNlOk51bWJlcih5ZC5yaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJtc3NvY3x8MCkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowfX1yZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX1jYXRjaChlKXtyZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImg1Iix7dmluTm86dmluTm99LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVyYXBwL2FwcC9zZXJ2aWNlL3JlY2hhcmdlL3ZlaGljbGUvZGV0YWlsP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3JldHVybntyZWNoYXJnZUVuZERhdGU6U3RyaW5nKHJlcy5kYXRhLnJlY2hhcmdlRW5kRGF0ZXx8IiIpLGxhc3RVc2VEYXRlOk51bWJlcihyZXMuZGF0YS5sYXN0VXNlRGF0ZSl8fDAsc2VydmljZVJlY2hhcmdlU3RhdHVzOlN0cmluZyhyZXMuZGF0YS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiKSx2ZWhpY2xlTmFtZTpTdHJpbmcocmVzLmRhdGEudmVoaWNsZU5hbWV8fCIiKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e2hhc1ZlaGljbGU6ZmFsc2UsdmVoaWNsZU5hbWU6IiIsdmVoaWNsZU1vZGVsOiIiLHZpbk5vOiIiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxiYXR0ZXJ5UGVyY2VudDowLHJlc2lkdWFsUmFuZ2VLbTowLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGZyb250UHJlc3N1cmU6IiIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxsYXN0UmlkZUR1cmF0aW9uOjAsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCx2ZWhpY2xlSW1hZ2VVcmw6IiIsc2VydmljZUVuZERhdGU6IiIsc2VydmljZVJlbWFpbkRheXM6MCxzZXJ2aWNlU3RhdHVzOiIiLHBvd2VyU3RhdHVzOiIiLGxvY2tTdGF0ZToiIixvbmxpbmU6IiIscmlkZVN0YXRlOiIiLGN1c2hpb25TdGF0ZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiJ9O3RyeXtjb25zdCBhbGxWZWhpY2xlcz1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpO2NvbnN0IHZlaGljbGVzPWFsbFZlaGljbGVzLmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZih2ZWhpY2xlcy5sZW5ndGg9PT0wKXJldHVybiByZXN1bHQ7Y29uc3Qgdj12ZWhpY2xlc1swXTtyZXN1bHQuaGFzVmVoaWNsZT10cnVlO3Jlc3VsdC52ZWhpY2xlTmFtZT12Lm5hbWU7cmVzdWx0LnZpbk5vPXYudmluTm87cmVzdWx0LnZlaGljbGVJbWFnZVVybD12LnBpYztyZXN1bHQudmVoaWNsZU1vZGVsPXYudmVoaWNsZVR5cGV8fCIiO2NvbnN0IFt3aWRnZXRzLHRpcmUscmlkZSxiYXR0ZXJ5LHNlcnZpY2UsaG9tZVBhZ2VdPWF3YWl0IFByb21pc2UuYWxsKFtmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoUmlkZUluZm8oYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hCYXR0ZXJ5Q2hhcmdlU3RhdGUoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+KHtjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjB9KSksZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCldKTtpZih3aWRnZXRzKXtyZXN1bHQuYmF0dGVyeVBlcmNlbnQ9d2lkZ2V0cy5iYXR0ZXJ5UGVyY2VudDtyZXN1bHQucmVzaWR1YWxSYW5nZUttPXdpZGdldHMucmVzaWR1YWxSYW5nZUttO3Jlc3VsdC52b2x0YWdlPXdpZGdldHMudm9sdGFnZTtyZXN1bHQuYWRkcmVzcz13aWRnZXRzLmFkZHJlc3M7cmVzdWx0LmxvY2F0aW9uVGltZT13aWRnZXRzLmxvY2F0aW9uVGltZTtyZXN1bHQucG93ZXJTdGF0dXM9d2lkZ2V0cy5wb3dlclN0YXR1c3x8IiI7cmVzdWx0LmxvY2tTdGF0ZT13aWRnZXRzLmxvY2tTdGF0ZXx8IiI7aWYod2lkZ2V0cy52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9d2lkZ2V0cy52ZWhpY2xlTmFtZTtpZih3aWRnZXRzLnZlaGljbGVJbWFnZVVybClyZXN1bHQudmVoaWNsZUltYWdlVXJsPXdpZGdldHMudmVoaWNsZUltYWdlVXJsO2lmKHdpZGdldHMub25saW5lKXJlc3VsdC5vbmxpbmU9d2lkZ2V0cy5vbmxpbmU7aWYod2lkZ2V0cy5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT13aWRnZXRzLmN1c2hpb25TdGF0ZTtpZih3aWRnZXRzLmxvbmdpdHVkZSE9PSIiJiZ3aWRnZXRzLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPXdpZGdldHMubG9uZ2l0dWRlO2lmKHdpZGdldHMubGF0aXR1ZGUhPT0iIiYmd2lkZ2V0cy5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9d2lkZ2V0cy5sYXRpdHVkZX1pZihob21lUGFnZSl7aWYoaG9tZVBhZ2UucG93ZXJTdGF0dXMpcmVzdWx0LnBvd2VyU3RhdHVzPWhvbWVQYWdlLnBvd2VyU3RhdHVzO2lmKGhvbWVQYWdlLmxvY2tTdGF0ZSlyZXN1bHQubG9ja1N0YXRlPWhvbWVQYWdlLmxvY2tTdGF0ZTtpZihob21lUGFnZS5vbmxpbmUpcmVzdWx0Lm9ubGluZT1ob21lUGFnZS5vbmxpbmU7aWYoaG9tZVBhZ2UucmlkZVN0YXRlKXJlc3VsdC5yaWRlU3RhdGU9aG9tZVBhZ2UucmlkZVN0YXRlO2lmKGhvbWVQYWdlLmN1c2hpb25TdGF0ZSlyZXN1bHQuY3VzaGlvblN0YXRlPWhvbWVQYWdlLmN1c2hpb25TdGF0ZTtpZigocmVzdWx0LmxvbmdpdHVkZT09PSIifHxyZXN1bHQubG9uZ2l0dWRlPT09dW5kZWZpbmVkKSYmaG9tZVBhZ2UubG9uZ2l0dWRlIT09IiImJmhvbWVQYWdlLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPWhvbWVQYWdlLmxvbmdpdHVkZTtpZigocmVzdWx0LmxhdGl0dWRlPT09IiJ8fHJlc3VsdC5sYXRpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxhdGl0dWRlIT09IiImJmhvbWVQYWdlLmxhdGl0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sYXRpdHVkZT1ob21lUGFnZS5sYXRpdHVkZX1pZih0aXJlKXtyZXN1bHQuZnJvbnRQcmVzc3VyZT10aXJlLmZyb250UHJlc3N1cmU7cmVzdWx0LnJlYXJQcmVzc3VyZT10aXJlLnJlYXJQcmVzc3VyZTtyZXN1bHQuZnJvbnRUZW1wPXRpcmUuZnJvbnRUZW1wO3Jlc3VsdC5yZWFyVGVtcD10aXJlLnJlYXJUZW1wfWlmKHJpZGUpe3Jlc3VsdC50b2RheURpc3RhbmNlPXJpZGUudG9kYXlEaXN0YW5jZTtyZXN1bHQudG9kYXlEdXJhdGlvbj1yaWRlLnRvZGF5RHVyYXRpb247cmVzdWx0LnRvZGF5TWF4U3BlZWQ9cmlkZS50b2RheU1heFNwZWVkO3Jlc3VsdC5sYXN0UmlkZU1pbGVhZ2U9cmlkZS5sYXN0UmlkZU1pbGVhZ2U7cmVzdWx0Lmxhc3RSaWRlRHVyYXRpb249cmlkZS5sYXN0UmlkZUR1cmF0aW9ufHwwO3Jlc3VsdC50b3RhbE1pbGVhZ2U9cmlkZS50b3RhbE1pbGVhZ2V8fDA7cmVzdWx0Lnllc3RlcmRheURpc3RhbmNlPXJpZGUueWVzdGVyZGF5RGlzdGFuY2V8fDB9cmVzdWx0LmNoYXJnZVN0YXRlPWJhdHRlcnkuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiO2lmKGJhdHRlcnkudm9sdGFnZSlyZXN1bHQudm9sdGFnZT1iYXR0ZXJ5LnZvbHRhZ2U7aWYoYmF0dGVyeS5jdXJyZW50KXJlc3VsdC5jdXJyZW50PWJhdHRlcnkuY3VycmVudDtpZihiYXR0ZXJ5LmJhdHRlcnlUZW1wKXJlc3VsdC5iYXR0ZXJ5VGVtcD1iYXR0ZXJ5LmJhdHRlcnlUZW1wO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZiYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbSlyZXN1bHQucmVzaWR1YWxSYW5nZUttPWJhdHRlcnkucmVzaWR1YWxSYW5nZUttO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZyZXN1bHQuYmF0dGVyeVBlcmNlbnQ+MCl7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1NYXRoLnJvdW5kKHJlc3VsdC5iYXR0ZXJ5UGVyY2VudCoxLjUpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi4wIOmakOiXj+mqkeihjOaVsOaNru+8iOi9qOi/ueino+aekCArIOaApeWIuS/ljovlvK/mo4DmtYvvvIk9PT09PT09PT09PT09PT09PSAqLwovKiDlrpjmlrkgQXBwIOaKiuOAjOaegemAnyAvIOaApeWKoOmAnyAvIOaApeWIuSAvIOWOi+W8r+OAjeiXj+S6hui1t+adpe+8iOacjeWKoeerr+iDveWKm+S9jSB2ZWhpY2xlS2luZHMgLyBjeWNsaW5nRXZlbnRTdGF0aXN0aWNGbGFnIOaOp+WItu+8ieOAggogICDmnKzpobXku44gcmlkZXRyYWNrX3YyIOeahOWOn+Wni+i9qOi/uemHjeeul+i/meS6m+aMh+agh++8m+eul+azleS4jumYiOWAvOmAkOihjOenu+akjeiHqiBaRUVITyBTcGVlZEh1bnRlcgogICDvvIhnaXRodWIuY29tL1J5YW5ZdUZpc2gvWmVlaG8tU3BlZWRIdW50ZXLvvIxBR1BMLTMuMO+8ieeahCBSaWRlQ29uZmlnIC8gVHJhY2tDYWxjdWxhdG9yIC8gQnJha2VEZXRlY3RvciAvIEJlbmREZXRlY3RvcuOAggogICDovajov7nkuLLmoLzlvI/vvJpsb24sbGF0LHNwZWVkLHRzWyxkaXJdJi4uLu+8iHJpZGV0cmFja192MiDnmoQgdHJhamVjdG9yeSDlrZfmrrXljp/moLfvvIkgKi8KLyogX19SSURFX0FMR09fQkVHSU5fXyAqLwp2YXIgUklERV9DRkc9e0JFTkRfVl9NSU46MjAsQkVORF9TRUVEOjUsQkVORF9DVU1fTUlOOjE1LEJFTkRfQ1VNX0NBUDo5MCxCRU5EX0NPRUY6MS4wLEJFTkRfVl9NQVg6ODAsQkVORF9NSU5fS006MS4wLEJFTkRfU1RFUF9NQVg6NDUsQkVORF9SVU5fTUlOOjEsQkVORF9NRVJHRV9HQVA6MCxCRU5EX0FMTE9XX0dBUDowLEJFTkRfU0VHX0RJU1RfTUlOOjYsQkVORF9HQVBfTVNfTUFYOjI1MDAwLEJSQUtFX1ZfTUlOOjE1LEJSQUtFX1dJTl9MQVJHRTo1LEJSQUtFX1dJTl9TTUFMTDozLEJSQUtFX0RWX0xBUkdFOjE1LEJSQUtFX0RWX1NNQUxMOjIwLEJSQUtFX0FfTUlOOjAuNSxCUkFLRV9NRVJHRV9HQVA6NSxCUkFLRV9NSU5fRFVSOjEuNSxCUkFLRV9DQUxJQjoyLjUsTU9WSU5HX1ZfTUlOOjUsTUlOX1BPSU5UUzo0LEVBUlRIX1I6NjM3MTAwMH07CmZ1bmN0aW9uIHJpZGVOdW0odil7Y29uc3Qgbj1OdW1iZXIodik7cmV0dXJuIGlzRmluaXRlKG4pP246MH0KZnVuY3Rpb24gcmlkZVBhcnNlVHJhY2soc3RyKXsKICBjb25zdCBwdHM9W107CiAgaWYoIXN0cilyZXR1cm4gcHRzOwogIGNvbnN0IHNlZz1TdHJpbmcoc3RyKS5zcGxpdCgiJiIpOwogIGZvcihjb25zdCBzIG9mIHNlZyl7CiAgICBpZighcyljb250aW51ZTsKICAgIGNvbnN0IHA9cy5zcGxpdCgiLCIpOwogICAgaWYocC5sZW5ndGg8NCljb250aW51ZTsKICAgIGNvbnN0IGxvbj1wYXJzZUZsb2F0KHBbMF0pLGxhdD1wYXJzZUZsb2F0KHBbMV0pLHY9cGFyc2VGbG9hdChwWzJdKSx0PXBhcnNlRmxvYXQocFszXSk7CiAgICBpZighaXNGaW5pdGUobG9uKXx8IWlzRmluaXRlKGxhdCl8fCFpc0Zpbml0ZSh2KXx8IWlzRmluaXRlKHQpKWNvbnRpbnVlOwogICAgcHRzLnB1c2goe2xvbjpsb24sbGF0OmxhdCx2OnYsdDp0fSk7CiAgfQogIHJldHVybiBwdHM7Cn0KZnVuY3Rpb24gcmlkZUhhdmVyc2luZShsb24xLGxhdDEsbG9uMixsYXQyKXsKICBjb25zdCBkTGF0PShsYXQyLWxhdDEpKk1hdGguUEkvMTgwLGRMb249KGxvbjItbG9uMSkqTWF0aC5QSS8xODA7CiAgY29uc3QgYT1NYXRoLnNpbihkTGF0LzIpKk1hdGguc2luKGRMYXQvMikrTWF0aC5jb3MobGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5jb3MobGF0MipNYXRoLlBJLzE4MCkqTWF0aC5zaW4oZExvbi8yKSpNYXRoLnNpbihkTG9uLzIpOwogIHJldHVybiBSSURFX0NGRy5FQVJUSF9SKjIqTWF0aC5hdGFuMihNYXRoLnNxcnQoYSksTWF0aC5zcXJ0KDEtYSkpOwp9CmZ1bmN0aW9uIHJpZGVCZWFyaW5nKGxvbjEsbGF0MSxsb24yLGxhdDIpewogIGNvbnN0IHk9TWF0aC5zaW4oKGxvbjItbG9uMSkqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApOwogIGNvbnN0IHg9TWF0aC5jb3MobGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5zaW4obGF0MipNYXRoLlBJLzE4MCktTWF0aC5zaW4obGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5jb3MobGF0MipNYXRoLlBJLzE4MCkqTWF0aC5jb3MoKGxvbjItbG9uMSkqTWF0aC5QSS8xODApOwogIHJldHVybiBNYXRoLmF0YW4yKHkseCkqMTgwL01hdGguUEk7Cn0KZnVuY3Rpb24gcmlkZUFuZ0RpZmYoYSxiKXtsZXQgZD1iLWE7d2hpbGUoZD4xODApZC09MzYwO3doaWxlKGQ8LTE4MClkKz0zNjA7cmV0dXJuIGR9CmZ1bmN0aW9uIHJpZGVNaWQoYSxiKXtyZXR1cm4gYStyaWRlQW5nRGlmZihhLGIpLzJ9CmZ1bmN0aW9uIHJpZGVDYWxjTWV0cmljcyhwdHMpewogIGlmKCFwdHN8fHB0cy5sZW5ndGg8UklERV9DRkcuTUlOX1BPSU5UUylyZXR1cm4gbnVsbDsKICBsZXQgbWV0ZXJzPTAsbW92aW5nTXM9MCxtYXhTcGVlZD0wOwogIGZvcihsZXQgaT0xO2k8cHRzLmxlbmd0aDtpKyspewogICAgY29uc3QgYT1wdHNbaS0xXSxiPXB0c1tpXTsKICAgIG1ldGVycys9cmlkZUhhdmVyc2luZShhLmxvbixhLmxhdCxiLmxvbixiLmxhdCk7CiAgICBjb25zdCB2SW49TWF0aC5tYXgoYS52LGIudiksZHQ9Yi50LWEudDsKICAgIGlmKHZJbj5SSURFX0NGRy5NT1ZJTkdfVl9NSU4mJmR0PjAmJmR0PDYwMDAwKW1vdmluZ01zKz1kdDsKICAgIGlmKGIudj5tYXhTcGVlZCltYXhTcGVlZD1iLnY7CiAgfQogIGNvbnN0IGR1cmF0aW9uTWluPU1hdGgubWF4KDAscHRzW3B0cy5sZW5ndGgtMV0udC1wdHNbMF0udCkvNjAwMDA7CiAgY29uc3QgbW92aW5nTWluPW1vdmluZ01zLzYwMDAwOwogIGNvbnN0IGRpc3RhbmNlS209bWV0ZXJzLzEwMDA7CiAgcmV0dXJue3BvaW50czpwdHMubGVuZ3RoLGRpc3RhbmNlS206ZGlzdGFuY2VLbSxkdXJhdGlvbk1pbjpkdXJhdGlvbk1pbixtb3ZpbmdNaW46bW92aW5nTWluLG1heFNwZWVkOm1heFNwZWVkPDA/MDptYXhTcGVlZCxhdmdTcGVlZDpkdXJhdGlvbk1pbj4wP2Rpc3RhbmNlS20vZHVyYXRpb25NaW46MCxhdmdNb3ZpbmdTcGVlZDptb3ZpbmdNaW4+MD9kaXN0YW5jZUttL21vdmluZ01pbjowfTsKfQpmdW5jdGlvbiByaWRlQ291bnRCcmFrZXMocHRzKXsKICBjb25zdCBuPXB0cz9wdHMubGVuZ3RoOjA7CiAgaWYobjw0KXJldHVybiAwOwogIGNvbnN0IGNhbmRzPVtdOwogIGNvbnN0IHNjYW49KHdpbixkdk1pbik9PnsKICAgIGZvcihsZXQgaT0wO2k8PW4td2luO2krKyl7CiAgICAgIGlmKHB0c1tpXS52PFJJREVfQ0ZHLkJSQUtFX1ZfTUlOKWNvbnRpbnVlOwogICAgICBsZXQgbWF4Vj0tSW5maW5pdHksbWF4SWR4PWksbWluVj1JbmZpbml0eSxtaW5JZHg9aTsKICAgICAgY29uc3QgdXBwZXI9TWF0aC5taW4oaSt3aW4sbi0xKTsKICAgICAgZm9yKGxldCBqPWkrMTtqPD11cHBlcjtqKyspewogICAgICAgIGNvbnN0IHY9cHRzW2pdLnY7CiAgICAgICAgaWYodj5tYXhWKXttYXhWPXY7bWF4SWR4PWp9CiAgICAgICAgaWYodjxtaW5WKXttaW5WPXY7bWluSWR4PWp9CiAgICAgIH0KICAgICAgY29uc3QgZHY9bWF4Vi1taW5WOwogICAgICBpZihkdjxkdk1pbnx8bWluSWR4PD1tYXhJZHgpY29udGludWU7CiAgICAgIGNvbnN0IGR0PShwdHNbbWluSWR4XS50LXB0c1ttYXhJZHhdLnQpLzEwMDA7CiAgICAgIGlmKGR0PFJJREVfQ0ZHLkJSQUtFX01JTl9EVVJ8fGR2LzMuNi9kdDxSSURFX0NGRy5CUkFLRV9BX01JTiljb250aW51ZTsKICAgICAgY2FuZHMucHVzaCh7aWR4Om1heElkeCxkdjpkdn0pOwogICAgfQogIH07CiAgc2NhbihSSURFX0NGRy5CUkFLRV9XSU5fTEFSR0UsUklERV9DRkcuQlJBS0VfRFZfTEFSR0UpOwogIHNjYW4oUklERV9DRkcuQlJBS0VfV0lOX1NNQUxMLFJJREVfQ0ZHLkJSQUtFX0RWX1NNQUxMKTsKICBjYW5kcy5zb3J0KChhLGIpPT5hLmlkeC1iLmlkeCk7CiAgY29uc3QgbWVyZ2VkPVtdOwogIGZvcihjb25zdCBjIG9mIGNhbmRzKXsKICAgIGlmKCFtZXJnZWQubGVuZ3RofHxjLmlkeC1tZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXS5pZHg+PVJJREVfQ0ZHLkJSQUtFX01FUkdFX0dBUCltZXJnZWQucHVzaChjKTsKICAgIGVsc2UgaWYoYy5kdj5tZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXS5kdiltZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXT1jOwogIH0KICBjb25zdCByPU1hdGgucm91bmQobWVyZ2VkLmxlbmd0aCpSSURFX0NGRy5CUkFLRV9DQUxJQik7CiAgcmV0dXJuIHI8MD8wOnI7Cn0KZnVuY3Rpb24gcmlkZUNvdW50QmVuZHMocHRzKXsKICBjb25zdCBuPXB0cz9wdHMubGVuZ3RoOjA7CiAgaWYobjw0KXJldHVybiAwOwogIGNvbnN0IGhkZz1uZXcgQXJyYXkobi0xKTsKICBmb3IobGV0IGk9MDtpPG4tMTtpKyspewogICAgY29uc3QgYT1wdHNbaV0sYj1wdHNbaSsxXTsKICAgIGNvbnN0IGQ9cmlkZUhhdmVyc2luZShhLmxvbixhLmxhdCxiLmxvbixiLmxhdCksdHQ9Yi50LWEudDsKICAgIGhkZ1tpXT0oZDxSSURFX0NGRy5CRU5EX1NFR19ESVNUX01JTnx8dHQ+UklERV9DRkcuQkVORF9HQVBfTVNfTUFYfHx0dDw9MCk/TmFOOnJpZGVCZWFyaW5nKGEubG9uLGEubGF0LGIubG9uLGIubGF0KTsKICB9CiAgY29uc3Qgc2g9bmV3IEFycmF5KG4tMSk7CiAgZm9yKGxldCBpPTA7aTxuLTE7aSsrKXsKICAgIGlmKGlzTmFOKGhkZ1tpXSkpe3NoW2ldPU5hTjtjb250aW51ZX0KICAgIGNvbnN0IHByZXY9KGk+MCYmIWlzTmFOKGhkZ1tpLTFdKSk/aGRnW2ktMV06bnVsbDsKICAgIGNvbnN0IG5leHQ9KGk8bi0yJiYhaXNOYU4oaGRnW2krMV0pKT9oZGdbaSsxXTpudWxsOwogICAgaWYocHJldiE9PW51bGwmJm5leHQhPT1udWxsKXNoW2ldPXJpZGVNaWQocmlkZU1pZChwcmV2LGhkZ1tpXSksbmV4dCk7CiAgICBlbHNlIGlmKHByZXYhPT1udWxsKXNoW2ldPXJpZGVNaWQocHJldixoZGdbaV0pOwogICAgZWxzZSBpZihuZXh0IT09bnVsbClzaFtpXT1yaWRlTWlkKGhkZ1tpXSxuZXh0KTsKICAgIGVsc2Ugc2hbaV09aGRnW2ldOwogIH0KICBjb25zdCB0dXJuPW5ldyBBcnJheShuKS5maWxsKGZhbHNlKSxkaGRnPW5ldyBBcnJheShuKS5maWxsKDApLHNnbj1uZXcgQXJyYXkobikuZmlsbCgwKTsKICBmb3IobGV0IGk9MTtpPG4tMTtpKyspewogICAgaWYoaXNOYU4oc2hbaS0xXSl8fGlzTmFOKHNoW2ldKSljb250aW51ZTsKICAgIGNvbnN0IGQ9cmlkZUFuZ0RpZmYoc2hbaS0xXSxzaFtpXSk7CiAgICBkaGRnW2ldPWQ7CiAgICBjb25zdCB2SW49TWF0aC5tYXgocHRzW2ktMV0udixwdHNbaV0udik7CiAgICBpZih2SW48UklERV9DRkcuQkVORF9WX01JTnx8dkluPlJJREVfQ0ZHLkJFTkRfVl9NQVgpY29udGludWU7CiAgICBpZihNYXRoLmFicyhkKT49UklERV9DRkcuQkVORF9TVEVQX01BWCljb250aW51ZTsKICAgIGlmKE1hdGguYWJzKGQpPj1SSURFX0NGRy5CRU5EX1NFRUQpe3R1cm5baV09dHJ1ZTtzZ25baV09ZD4wPzE6LTF9CiAgfQogIGNvbnN0IHJ1bnM9W107bGV0IGN1cj1udWxsLGdhcD0wOwogIGZvcihsZXQgaT0xO2k8bi0xO2krKyl7CiAgICBpZih0dXJuW2ldKXsKICAgICAgaWYoY3VyPT09bnVsbCl7Y3VyPXtzOmksZTppLGN1bTpNYXRoLmFicyhkaGRnW2ldKSxzaWduOnNnbltpXX19CiAgICAgIGVsc2UgaWYoc2duW2ldPT09Y3VyLnNpZ24pe2N1ci5jdW0rPU1hdGguYWJzKGRoZGdbaV0pfQogICAgICBlbHNle3J1bnMucHVzaChjdXIpO2N1cj17czppLGU6aSxjdW06TWF0aC5hYnMoZGhkZ1tpXSksc2lnbjpzZ25baV19fQogICAgICBjdXIuZT1pO2dhcD0wOwogICAgfWVsc2UgaWYoY3VyIT09bnVsbCYmZ2FwPFJJREVfQ0ZHLkJFTkRfQUxMT1dfR0FQKXtnYXArKztjdXIuZT1pfQogICAgZWxzZSBpZihjdXIhPT1udWxsKXtydW5zLnB1c2goY3VyKTtjdXI9bnVsbH0KICB9CiAgaWYoY3VyIT09bnVsbClydW5zLnB1c2goY3VyKTsKICBsZXQgY250PTAsbGFzdEVuZD1OYU4sbGFzdFNpZ249MDsKICBmb3IoY29uc3QgciBvZiBydW5zKXsKICAgIGlmKHIuY3VtPFJJREVfQ0ZHLkJFTkRfQ1VNX01JTnx8ci5jdW0+UklERV9DRkcuQkVORF9DVU1fQ0FQKWNvbnRpbnVlOwogICAgaWYoci5lLXIucysxPFJJREVfQ0ZHLkJFTkRfUlVOX01JTiljb250aW51ZTsKICAgIGxldCBtYXhWPTA7CiAgICBmb3IobGV0IGo9ci5zO2o8PXIuZSYmajxuO2orKyl7aWYocHRzW2pdLnY+bWF4ViltYXhWPXB0c1tqXS52fQogICAgaWYobWF4Vj5SSURFX0NGRy5CRU5EX1ZfTUFYKWNvbnRpbnVlOwogICAgaWYoci5zaWduPT09bGFzdFNpZ24mJiFpc05hTihsYXN0RW5kKSYmci5zLWxhc3RFbmQ8PVJJREVfQ0ZHLkJFTkRfTUVSR0VfR0FQKXtsYXN0RW5kPXIuZTtjb250aW51ZX0KICAgIGNudCsrO2xhc3RFbmQ9ci5lO2xhc3RTaWduPXIuc2lnbjsKICB9CiAgcmV0dXJuIE1hdGgucm91bmQoY250KlJJREVfQ0ZHLkJFTkRfQ09FRik7Cn0KZnVuY3Rpb24gcmlkZU5vcm1EYXkocmF3KXsKICBpZihyYXc9PW51bGwpcmV0dXJuIG51bGw7CiAgbGV0IHQ9U3RyaW5nKHJhdykudHJpbSgpOwogIGlmKCF0KXJldHVybiBudWxsOwogIGlmKHQubGVuZ3RoPT09OCYmL15cZHs4fSQvLnRlc3QodCkpcmV0dXJuIHQuc2xpY2UoMCw0KSsiLiIrdC5zbGljZSg0LDYpKyIuIit0LnNsaWNlKDYsOCk7CiAgdD10LnJlcGxhY2UoLy0vZywiLiIpLnJlcGxhY2UoL1wvL2csIi4iKTsKICBjb25zdCBwPXQuc3BsaXQoIi4iKTsKICBpZihwLmxlbmd0aD09PTMmJi9eXGQrJC8udGVzdChwWzBdKSYmL15cZCskLy50ZXN0KHBbMV0pJiYvXlxkKyQvLnRlc3QocFsyXSkpCiAgICByZXR1cm4gcFswXSsiLiIrU3RyaW5nKHBhcnNlSW50KHBbMV0sMTApKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhwYXJzZUludChwWzJdLDEwKSkucGFkU3RhcnQoMiwiMCIpOwogIHJldHVybiBudWxsOwp9Ci8qIOS4gOe7hCByaWRldHJhY2tfdjIg5aSp5YiG57uEIOKGkiB7ZGF5S2V5OntrbSxkdXIsbWF4VixicmFrZXMsYmVuZHMscmlkZXM6Wy4uLl19fQogICDor63kuYnkuI4gU3BlZWRIdW50ZXIgUmlkZUZpbGwg5LiA6Ie077ya5oCl5Yi5L+WOi+W8r+aMiei9qOi/uemHjeeul++8iOacjeWKoeerr+i/meS4pOS4quWtl+auteW4uOW5tOe8uuWkse+8ie+8mwogICDph4znqIsv5p6B6YCf5pyN5Yqh56uv6Z2eIDAg5pe25Lul5pyN5Yqh56uv5Li65YeG77yM5Li6IDAg5omN6KGl566X44CCICovCmZ1bmN0aW9uIHJpZGVEYXlTY2FuKGRheXMpewogIGNvbnN0IG91dD17fTsKICBpZighQXJyYXkuaXNBcnJheShkYXlzKSlyZXR1cm4gb3V0OwogIGZvcihjb25zdCBkYXkgb2YgZGF5cyl7CiAgICBpZighZGF5fHx0eXBlb2YgZGF5IT09Im9iamVjdCIpY29udGludWU7CiAgICBjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkoZGF5Lmhpc3RvcnlMaXN0KT9kYXkuaGlzdG9yeUxpc3Q6W107CiAgICBmb3IoY29uc3QgciBvZiBsaXN0KXsKICAgICAgaWYoIXJ8fHR5cGVvZiByIT09Im9iamVjdCIpY29udGludWU7CiAgICAgIGNvbnN0IHRyYWo9U3RyaW5nKHIudHJhamVjdG9yeXx8IiIpOwogICAgICBpZighdHJhailjb250aW51ZTsKICAgICAgY29uc3QgcHRzPXJpZGVQYXJzZVRyYWNrKHRyYWopOwogICAgICBpZihwdHMubGVuZ3RoPFJJREVfQ0ZHLk1JTl9QT0lOVFMpY29udGludWU7CiAgICAgIGNvbnN0IG09cmlkZUNhbGNNZXRyaWNzKHB0cyk7CiAgICAgIGNvbnN0IGJyYWtlcz1yaWRlQ291bnRCcmFrZXMocHRzKTsKICAgICAgbGV0IGJlbmRzPXJpZGVDb3VudEJlbmRzKHB0cyk7CiAgICAgIGlmKG0mJm0uZGlzdGFuY2VLbTxSSURFX0NGRy5CRU5EX01JTl9LTSliZW5kcz0wOyAgIC8vIOefreihjOeoi+aVtOi2n+WIpDDvvJo8MWttIOeahOWvhuW6puaYr+mVv+mAlOeahCA4IOWAje+8iEdQUyDlgZzovabkubHpo5jvvIkKICAgICAgY29uc3QgZGs9cmlkZU5vcm1EYXkoci5kYXlUaW1lfHxkYXkuZGF5VGltZSk7CiAgICAgIGlmKCFkayljb250aW51ZTsKICAgICAgY29uc3QgZz1vdXRbZGtdfHwob3V0W2RrXT17a206MCxkdXI6MCxtYXhWOjAsYnJha2VzOjAsYmVuZHM6MCxyaWRlczpbXX0pOwogICAgICBjb25zdCBzcnZNYXg9cmlkZU51bShyLm1heFNwZWVkKTsKICAgICAgY29uc3QgbWF4Vj1zcnZNYXg+MD9zcnZNYXg6KG0/bS5tYXhTcGVlZDowKTsKICAgICAgZy5rbSs9bT9tLmRpc3RhbmNlS206MDtnLmR1cis9bT9tLmR1cmF0aW9uTWluOjA7CiAgICAgIGlmKG1heFY+Zy5tYXhWKWcubWF4Vj1tYXhWOwogICAgICBnLmJyYWtlcys9YnJha2VzO2cuYmVuZHMrPWJlbmRzOwogICAgICBsZXQgYWRkcj0iIjsKICAgICAgdHJ5ewogICAgICAgIGNvbnN0IHNhPUpTT04ucGFyc2Uoci5zdGFydEFkZHJ8fCJ7fSIpLGVhPUpTT04ucGFyc2Uoci5lbmRBZGRyfHwie30iKTsKICAgICAgICBjb25zdCBzMT1TdHJpbmcoc2EubmFtZXx8c2EuYWRkcmVzc3x8IiIpLnRyaW0oKSxlMT1TdHJpbmcoZWEubmFtZXx8ZWEuYWRkcmVzc3x8IiIpLnRyaW0oKTsKICAgICAgICBpZihzMXx8ZTEpYWRkcj0oczF8fCIiKSsiIOKGkiAiKyhlMXx8IiIpOwogICAgICB9Y2F0Y2goZSl7fQogICAgICBnLnJpZGVzLnB1c2goe3QwOnB0c1swXS50LGttOm0/bS5kaXN0YW5jZUttOjAsZHVyOm0/bS5kdXJhdGlvbk1pbjowLG1heFY6bWF4VixicmFrZXM6YnJha2VzLGJlbmRzOmJlbmRzLHBvaW50czpwdHMubGVuZ3RoLAogICAgICAgIHQwc3RyOlN0cmluZyhyLnN0YXJ0VGltZXx8IiIpLHQxc3RyOlN0cmluZyhyLmVuZFRpbWV8fCIiKSxhZGRyOmFkZHIsCiAgICAgICAgc3J2S206cmlkZU51bShyLnJpZGVNaWxlYWdlKSxzcnZEdXI6cmlkZU51bShyLnJpZGluZ1RpbWVVbml0TWludXRlKSxzcnZBY2NlbDpyaWRlTnVtKHIuYWNjZWxlcmF0aW9uVGltZXMpLAogICAgICAgIHRodW1iOlN0cmluZyhyLnRyYWNrVGh1bWJuYWlsc3x8IiIpfSk7CiAgICB9CiAgfQogIGZvcihjb25zdCBrIGluIG91dClpZihvdXRba10mJm91dFtrXS5yaWRlcylvdXRba10ucmlkZXMuc29ydCgoYSxiKT0+YS50MC1iLnQwKTsKICByZXR1cm4gb3V0Owp9Ci8qIF9fUklERV9BTEdPX0VORF9fICovCi8qIOebtOi/nuaooeW8j++8iOmdnuS7o+eQhu+8ieaLieWPlu+8muaciOW6puaxh+aAuyAvIOi9qOi/ueWIhumhte+8iOi1sOi0puWPtyBUb2tlbiArIGFwcCDnrb7lkI3vvIzkuI7pppbpobXnm7Tov57kuIDoh7TvvIkgKi8KZnVuY3Rpb24gcmlkZUFjY0xvY2FsKHVzZXJJZCl7Y29uc3QgYWNjcz1nZXRBY2NvdW50cygpO3JldHVybiBhY2NzLmZpbmQoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKXx8YWNjc1swXXx8bnVsbH0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hSaWRlTW9udGhEaXJlY3QoYWNjLGNmZyxtb250aCx2aW4pewogIHRyeXsKICAgIGlmKCFhY2MpcmV0dXJue29rOmZhbHNlLGVycm9yOiLmnKrmib7liLDotKblj7cifTsKICAgIGNvbnN0IG1vbnRoMj1tb250aHx8KG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikpOwogICAgbGV0IHZpbk5vPVN0cmluZyh2aW58fCIiKS50cmltKCksdmVoaWNsZU5hbWU9IiI7CiAgICBpZighdmluTm8pewogICAgICBjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7CiAgICAgIGNvbnN0IHZlaGljbGVzPWxpc3QuZmlsdGVyKHg9PiEv5qih5oufLy50ZXN0KFN0cmluZyh4Lm5hbWV8fCIiKSsiICIrU3RyaW5nKHgudmVoaWNsZVR5cGV8fCIiKSkpOwogICAgICBpZighdmVoaWNsZXMubGVuZ3RoKXJldHVybntvazpmYWxzZSxlcnJvcjoi6LSm5Y+35pyq57uR5a6a6L2m6L6GIn07CiAgICAgIHZpbk5vPXZlaGljbGVzWzBdLnZpbk5vO3ZlaGljbGVOYW1lPXZlaGljbGVzWzBdLm5hbWU7CiAgICB9CiAgICBjb25zdCBxdWVyeT0idmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImbW9udGg9IitlbmNvZGVVUklDb21wb25lbnQobW9udGgyKTsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL215UmlkZUluZm8/IitxdWVyeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHF1ZXJ5LGNmZykpOwogICAgaWYocmVzJiZTdHJpbmcocmVzLmNvZGUpPT09IjEwMDAwIilyZXR1cm57b2s6dHJ1ZSxtb250aDptb250aDIsdmluTm86dmluTm8sdmVoaWNsZU5hbWU6dmVoaWNsZU5hbWUsZGF0YTpyZXMuZGF0YXx8e319OwogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLmNvZGUpKXx8IuaOpeWPo+aXoOWTjeW6lCIsdmluTm86dmluTm99OwogIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KfQphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlTdGF0ZURpcmVjdChhY2MsY2ZnLHZpbil7CiAgdHJ5ewogICAgaWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuacquaJvuWIsOi0puWPtyJ9OwogICAgbGV0IHZpbk5vPVN0cmluZyh2aW58fCIiKS50cmltKCk7CiAgICBpZighdmluTm8pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTtjb25zdCB2cz1saXN0LmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZighdnMubGVuZ3RoKXJldHVybntvazpmYWxzZSxlcnJvcjoi6LSm5Y+35pyq57uR5a6a6L2m6L6GIn07dmluTm89dnNbMF0udmluTm87fQogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGJhc2VIZWFkZXJzKGFjYykpOwogICAgaWYocmVzJiZyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7cmV0dXJue29rOnRydWUsdmluTm86dmluTm8sY2hhcmdpbmc6L+WFheeUtS8udGVzdChTdHJpbmcoZC5jaGFyZ2VTdGF0ZVN0cnx8ZC5jaGFyZ2VTdGF0ZXx8IiIpKSxjdXJyZW50Ok51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8MCksc29jOk51bWJlcihkLnNvY3x8ZC5ibXNzb2N8fDApLHZvbHRhZ2U6TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHwwKSxjaGFyZ2VTdGF0ZTpTdHJpbmcoZC5jaGFyZ2VTdGF0ZVN0cnx8ZC5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpLGZ1bGxDaGFyZ2VUaW1lOk51bWJlcihkLmZ1bGxDaGFyZ2VUaW1lfHwwKSxmdWxsQ2hhcmdlVGltZVNlY29uZDpOdW1iZXIoZC5mdWxsQ2hhcmdlVGltZVNlY29uZHx8MCl9O30KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IuaOpeWPo+aXoOWTjeW6lCJ9OwogIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KfQphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVUcmFja0RpcmVjdChhY2MsY2ZnLHZpbixwYWdlLHBhZ2VTaXplLG1vbnRoKXsKICB0cnl7CiAgICBpZighYWNjKXJldHVybntvazpmYWxzZSxlcnJvcjoi5pyq5om+5Yiw6LSm5Y+3In07CiAgICBsZXQgdmluTm89U3RyaW5nKHZpbnx8IiIpLnRyaW0oKTsKICAgIGlmKCF2aW5Obyl7CiAgICAgIGNvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTsKICAgICAgY29uc3QgdmVoaWNsZXM9bGlzdC5maWx0ZXIoeD0+IS/mqKHmi58vLnRlc3QoU3RyaW5nKHgubmFtZXx8IiIpKyIgIitTdHJpbmcoeC52ZWhpY2xlVHlwZXx8IiIpKSk7CiAgICAgIGlmKCF2ZWhpY2xlcy5sZW5ndGgpcmV0dXJue29rOmZhbHNlLGVycm9yOiLotKblj7fmnKrnu5HlrprovabovoYifTsKICAgICAgdmluTm89dmVoaWNsZXNbMF0udmluTm87CiAgICB9CiAgICBjb25zdCBwZz1NYXRoLm1heCgxLE51bWJlcihwYWdlKXx8MSkscHM9TWF0aC5tYXgoMSxNYXRoLm1pbigyMDAsTnVtYmVyKHBhZ2VTaXplKXx8MjApKTsKICAgIGNvbnN0IHN0PVN0cmluZyhtb250aHx8IiIpLnJlcGxhY2UoIi4iLCItIil8fChuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKTsKICAgIGNvbnN0IHF1ZXJ5PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZwYWdlPSIrcGcrIiZwYWdlU2l6ZT0iK3BzKyImc3RhcnRUaW1lPSIrZW5jb2RlVVJJQ29tcG9uZW50KHN0KTsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3JpZGV0cmFja192Mj8iK3F1ZXJ5LGFwcFF1ZXJ5SGVhZGVycyhhY2MscXVlcnksY2ZnKSk7CiAgICBpZihyZXMmJlN0cmluZyhyZXMuY29kZSk9PT0iMTAwMDAiKXsKICAgICAgbGV0IGRheXM9W107CiAgICAgIGlmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKWRheXM9cmVzLmRhdGE7CiAgICAgIGVsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEubGlzdCkpZGF5cz1yZXMuZGF0YS5saXN0OwogICAgICBlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmRheUxpc3QpKWRheXM9cmVzLmRhdGEuZGF5TGlzdDsKICAgICAgcmV0dXJue29rOnRydWUscGFnZTpwZyx2aW5Obzp2aW5ObyxkYXlzOmRheXN9OwogICAgfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLmNvZGUpKXx8IuaOpeWPo+aXoOWTjeW6lCIscGFnZTpwZyx2aW5Obzp2aW5Ob307CiAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQp9Ci8qID09PT09PT09PT09PT09PT09IOi0puWPt+aVsOaNruaLieWPliA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluTm8pe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtsZXQgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+l55So5oi3Iix1c2VySWQsc2NvcmU6MCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6MCx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjAsbGFzdDc6W10sZXJyb3I6bnVsbCx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX07CmlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgdmVoaWNsZVJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH0pO2lmKHZlaGljbGVSZXMuY29kZT09IjEwMDAwIiYmdmVoaWNsZVJlcy5kYXRhKXtjb25zdCBhdXRvVWlkPVN0cmluZyh2ZWhpY2xlUmVzLmRhdGEudXNlcklkfHx2ZWhpY2xlUmVzLmRhdGEudWlkfHx2ZWhpY2xlUmVzLmRhdGEuaWR8fCIiKTtpZihhdXRvVWlkKXt1c2VySWQ9YXV0b1VpZDtyZXN1bHQudXNlcklkPXVzZXJJZDtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGlkeD1hY2NvdW50cy5maW5kSW5kZXgoYT0+Y2xlYW5Ub2tlbihhLnRva2VuKT09PXRva2VuKTtpZihpZHg+PTAmJiFhY2NvdW50c1tpZHhdLnVzZXJJZCl7YWNjb3VudHNbaWR4XS51c2VySWQ9dXNlcklkO3NhdmVBY2NvdW50cyhhY2NvdW50cyl9fX19Y2F0Y2goZSl7fX0KdHJ5e3Jlc3VsdC52ZWhpY2xlPWF3YWl0IGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyx2aW5Obyl9Y2F0Y2goZSl7cmVzdWx0LnZlaGljbGU9e2hhc1ZlaGljbGU6ZmFsc2V9fQp0cnl7aWYoIXVzZXJJZCl7cmVzdWx0LmVycm9yPSLor7flnKjorr7nva7pobXloavlhpnnlKjmiLdJRCJ9ZWxzZXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9KTtpZihpbmZvUmVzLmNvZGU9PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7cmVzdWx0LnNjb3JlPU51bWJlcihpbmZvUmVzLmRhdGEuc2NvcmV8fGluZm9SZXMuZGF0YS5pbnRlZ3JhbHx8aW5mb1Jlcy5kYXRhLnBvaW50fHxpbmZvUmVzLmRhdGEucG9pbnRzfHxpbmZvUmVzLmRhdGEudG90YWxTY29yZXx8aW5mb1Jlcy5kYXRhLnRvdGFsSW50ZWdyYWx8fDApfWVsc2UgaWYoaW5mb1Jlcy5jb2RlPT0iNDAwMDEifHxpbmZvUmVzLmNvZGU9PTQwMSl7cmVzdWx0LmVycm9yPSJUb2tlbuW3sui/h+acnyJ9ZWxzZXtyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluWksei0pTogIisoaW5mb1Jlcy5tZXNzYWdlfHxpbmZvUmVzLmNvZGV8fCLmnKrnn6XplJnor68iKX19fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blvILluLg6ICIrU3RyaW5nKGUpfQp0cnl7Y29uc3QgY3VyTW9udGg9bm93LmdldEZ1bGxZZWFyKCkrIi0iKyhub3cuZ2V0TW9udGgoKSsxKTtjb25zdCBsYXN0RGF0ZT1uZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSxub3cuZ2V0TW9udGgoKS0xLDEpO2NvbnN0IGxhc3RNb250aD1sYXN0RGF0ZS5nZXRGdWxsWWVhcigpKyItIisobGFzdERhdGUuZ2V0TW9udGgoKSsxKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IFtjdXJSZXMsbGFzdFJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4vaW5mbz9tb250aD0iK2N1ck1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmN1ck1vbnRofSwnJyxjZmcpfSksaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbGFzdE1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmxhc3RNb250aH0sJycsY2ZnKX0pXSk7Y29uc3QgbGFzdExpc3Q9KGxhc3RSZXMuY29kZT09IjEwMDAwIiYmbGFzdFJlcy5kYXRhKT8obGFzdFJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBjdXJMaXN0PShjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpPyhjdXJSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgbGlzdD1bLi4ubGFzdExpc3QsLi4uY3VyTGlzdF07aWYoY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKXtyZXN1bHQuc2lnbkNvdW50PU51bWJlcihjdXJSZXMuZGF0YS5zaWduQ291bnQpfHwwfWNvbnN0IHRvZGF5RW50cnk9Y3VyTGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmVkVG9kYXk9ISEodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKTtyZXN1bHQudG9kYXlTY29yZT10b2RheUVudHJ5PyhOdW1iZXIodG9kYXlFbnRyeS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDt0cnl7Y29uc3QgX3RvZGF5TG9ncz0oZ2V0TG9ncygpfHxbXSkuZmlsdGVyKGw9PmwmJmwuZGF0ZT09PXRvZGF5JiZTdHJpbmcobC51c2VySWR8fCIiKT09PVN0cmluZyh1c2VySWQpJiZsLnN1Y2Nlc3MpO2lmKF90b2RheUxvZ3MubGVuZ3RoPjApe2NvbnN0IF90bD1fdG9kYXlMb2dzWzBdO3Jlc3VsdC50b2RheVNjb3JlPU51bWJlcihfdGwudG90YWxHYWluKXx8cmVzdWx0LnRvZGF5U2NvcmU7cmVzdWx0LnRvZGF5RGV0YWlsPXtzaWduaW5TY29yZTpOdW1iZXIoX3RsLnNpZ25pblNjb3JlKXx8MCxibGluZEJveFNjb3JlOk51bWJlcihfdGwuYmxpbmRCb3hTY29yZSl8fDAsaW50ZXJhY3RTY29yZTpOdW1iZXIoX3RsLmludGVyYWN0U2NvcmUpfHwwfX19Y2F0Y2goZSl7fWNvbnN0IHRvZGF5SWR4PWxpc3QuZmluZEluZGV4KHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtsZXQgY29udD0wO2lmKHRvZGF5SWR4Pj0wKXtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9fXJlc3VsdC5jb250aW51ZURheXM9Y29udDtmb3IobGV0IGk9NjtpPj0wO2ktLSl7Y29uc3QgZD1uZXcgRGF0ZSgpO2Quc2V0RGF0ZShkLmdldERhdGUoKS1pKTtjb25zdCBkcz1kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBlbnRyeT1saXN0LmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpO3Jlc3VsdC5sYXN0Ny5wdXNoKHtkYXRlOmRzLnNsaWNlKDUpLHNpZ25lZDohIShlbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApKSxpc1RvZGF5Omk9PT0wfSl9fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnrb7liLDnirbmgIHojrflj5blpLHotKUifQp0cnl7Y29uc3QgdG9rZW5DaGVjaz1hd2FpdCBjaGVja1Rva2VuKGFjYyxjZmcpO3Jlc3VsdC50b2tlblZhbGlkPXRva2VuQ2hlY2sudmFsaWQ7cmVzdWx0LnRva2VuUmVhc29uPXRva2VuQ2hlY2sucmVhc29ufHxudWxsO2lmKHRva2VuQ2hlY2sudmFsaWQmJnRva2VuQ2hlY2sudXNlck5hbWUmJighcmVzdWx0LnVzZXJOYW1lfHxyZXN1bHQudXNlck5hbWU9PT0i5pyq55+l55So5oi3IikpcmVzdWx0LnVzZXJOYW1lPXRva2VuQ2hlY2sudXNlck5hbWV9Y2F0Y2goZSl7cmVzdWx0LnRva2VuVmFsaWQ9dHJ1ZX0KcmV0dXJuIHJlc3VsdH0KCmZ1bmN0aW9uIGdldFBvc3RJZEZyb21EYXRhKGRhdGEpe2lmKCFkYXRhKXJldHVybiBudWxsO2lmKHR5cGVvZiBkYXRhPT09InN0cmluZyJ8fHR5cGVvZiBkYXRhPT09Im51bWJlciIpcmV0dXJuIFN0cmluZyhkYXRhKTtpZihBcnJheS5pc0FycmF5KGRhdGEpKXJldHVybiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhWzBdKTtjb25zdCBkaXJlY3Q9ZGF0YS51dWlkfHxkYXRhLnR1dWlkfHxkYXRhLnBvc3RJZHx8ZGF0YS5wb3N0aWR8fGRhdGEuYXJ0aWNsZUlkfHxkYXRhLmFydGljbGVJRHx8ZGF0YS5pZHx8ZGF0YS5kYXRhSWR8fGRhdGEudGlkO2lmKGRpcmVjdClyZXR1cm4gU3RyaW5nKGRpcmVjdCk7Zm9yKGNvbnN0IGtleSBvZiBbInJlY29yZHMiLCJsaXN0Iiwicm93cyIsImRhdGEiLCJyZXN1bHQiXSl7Y29uc3Qgdj1kYXRhW2tleV07Y29uc3QgcGlkPWdldFBvc3RJZEZyb21EYXRhKHYpO2lmKHBpZClyZXR1cm4gcGlkfXJldHVybiBudWxsfQoKLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGMID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXt1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ZmFsc2Usc2lnbmluU2NvcmU6MCxibGluZEJveFNjb3JlOjAsaW50ZXJhY3RTY29yZTowLHRvdGFsR2FpbjowLGNvbnRpbnVlRGF5czowLGVycm9yOm51bGwsc3RlcHM6W119O3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3QgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZH07Y29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgdG9kYXk9bm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgbW9udGg9dG9kYXkuc2xpY2UoMCw3KTsKdHJ5e2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0b2RheUVudHJ5PShpbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIil9ZWxzZXtsZXQgc2lnblJlcz1udWxsLHNpZ25Nc2c9IuacquefpSI7Zm9yKGxldCBhdD0xO2F0PD0zO2F0Kyspe3NpZ25SZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse30sJ3t9JyxjZmcpfSx7fSk7aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIilicmVhaztzaWduTXNnPXNpZ25SZXM/Lm1lc3NhZ2V8fCLmnKrnn6UiO2lmKC/or7fnqI1856iN5ZCOfOeojeWAmXzpopHnuYF857mB5b+ZfOmHjeivlS8udGVzdChzaWduTXNnKSYmYXQ8Myl7YXdhaXQgbmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLChhdCsxKSoyMDAwKSk7Y29udGludWV9YnJlYWt9aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIil7Y29uc3QgaW5mb1JlczI9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0ZT0oaW5mb1JlczI/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmluU2NvcmU9dGU/KE51bWJlcih0ZS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5oiQ5YqfICsiK3Jlc3VsdC5zaWduaW5TY29yZSl9ZWxzZXt0cnl7Y29uc3QgY2hrPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgY2U9KGNoaz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKGNlJiYoY2Uuc2lnblN0YXR1ZT09M3x8Y2Uuc2lnblN0YXR1ZT09NXx8Y2Uuc2lnblN0YXR1ZT09MCkpcmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpO2Vsc2UgcmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOWksei0pTogIitzaWduTXNnKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfX19Cn1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5byC5bi4OiAiK2UpfQp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IGxpc3Q9aW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W107Y29uc3QgdG9kYXlJZHg9bGlzdC5maW5kSW5kZXgoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2xldCBjb250PTA7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfXJlc3VsdC5jb250aW51ZURheXM9Y29udDtjb25zdCBzaWduQ291bnQ9TnVtYmVyKGluZm9SZXM/LmRhdGE/LnNpZ25Db3VudCl8fDA7Y29uc3QgcHJpemVEYXRlPVN0cmluZyhpbmZvUmVzPy5kYXRhPy5zaWduUHJpemVEYXRlfHwiIik7Y29uc3QgaXNCb3hEYXk9cHJpemVEYXRlPyhwcml6ZURhdGU9PT10b2RheSk6KHNpZ25Db3VudD49MzApO2lmKGlzQm94RGF5KXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9sb3R0ZXJ5P2RhdGVUaW1lPSIrZW5jb2RlVVJJQ29tcG9uZW50KHRvZGF5KSx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHtkYXRlVGltZTp0b2RheX0sJycsY2ZnKX0sIiIpO2NvbnN0IGJkPShibGluZFJlcz8uZGF0YSYmYmxpbmRSZXMuZGF0YS5zaWduUHJpemVzVk8pfHxibGluZFJlcz8uZGF0YXx8e307cmVzdWx0LmJsaW5kQm94U2NvcmU9TnVtYmVyKGJkLmludGVncmFsfHxiZC5pbnRlZ3JhbFNjb3JlfHxiZC5zY29yZXx8MCk7aWYoU3RyaW5nKGJsaW5kUmVzPy5jb2RlKT09IjEwMDAwIil7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuiOt+W+lyArIityZXN1bHQuYmxpbmRCb3hTY29yZSsiICgiKyhiZC5wcml6ZXNOYW1lfHxiZC5wcml6ZU5hbWV8fCLnp6/liIYiKSsiKSIpfWVsc2V7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuacquW8gDogIisoYmxpbmRSZXM/Lm1lc3NhZ2V8fGJsaW5kUmVzPy5lcnJvcnx8KCJjb2RlPSIrYmxpbmRSZXM/LmNvZGUpKSl9fWVsc2V7cmVzdWx0LnN0ZXBzLnB1c2goIui3neebsuebkiAiK01hdGgubWF4KDAsMzAtKHNpZ25Db3VudHx8Y29udCkpKyIg5aSpIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLnm7Lnm5LlvILluLg6ICIrZSl9CmNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eXx8e307bGV0IHBvc3RJZD1udWxsOwppZihjb21tLmVuYWJsZVBvc3QhPT1mYWxzZSl7dHJ5e2NvbnN0IHBvc3RSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3Rjb250ZW50OiJsdWNreSJ9KTtpZihwb3N0UmVzPy5jb2RlPT0iMTAwMDAiKXtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEocG9zdFJlcy5kYXRhKTtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi5Y+R5biW5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJblvILluLg6ICIrZSl9fQppZighcG9zdElkKXt0cnl7Y29uc3QgbGlzdFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW11bml0eS9taW5lQXJ0aWNsZUluZm8/dXNlcklkPSIrdXNlcklkKyImcGFnZT0xJnBhZ2VTaXplPTEwIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7Y29uc3QgcmF3TGlzdD1BcnJheS5pc0FycmF5KGxpc3RSZXM/LmRhdGEpP2xpc3RSZXMuZGF0YToobGlzdFJlcz8uZGF0YT8ucmVjb3Jkc3x8bGlzdFJlcz8uZGF0YT8ubGlzdHx8W10pO2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShyYXdMaXN0KT9yYXdMaXN0OltdO2NvbnN0IG1pbmU9bGlzdC5maW5kKGl0PT5TdHJpbmcoaXQudXNlcklkfHxpdC5jcmVhdGVCeXx8aXQudWlkfHwiIik9PT1TdHJpbmcodXNlcklkKSk7cG9zdElkPWdldFBvc3RJZEZyb21EYXRhKG1pbmV8fGxpc3RbMF18fGxpc3RSZXM/LmRhdGEpfWNhdGNoKGUpe319CmlmKHBvc3RJZCl7aWYoY29tbS5lbmFibGVMaWtlIT09ZmFsc2Upe3RyeXtjb25zdCBsaWtlUmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL3NvY2lhbENvbW11L2xpa2VGYXZvcml0ZUluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0SWQ6U3RyaW5nKHBvc3RJZCksa2luZEZsYWc6IjAifSk7aWYobGlrZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIueCuei1nuaIkOWKnyArMSIpfX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5byC5bi4OiAiK2UpfX1pZihjb21tLmVuYWJsZUNvbW1lbnQhPT1mYWxzZSl7dHJ5e2F3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9zb2NpYWwvY2Ztb3Rvc2VydmVyc29jaWFsL2NvbW1lbnRJbmZvIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGlkOlN0cmluZyhwb3N0SWQpLHVzZXJJZDpTdHJpbmcodXNlcklkKSxjb21tZW50czoi5LuK5pel5bey562+5YiwIixzZW5kVG9zOiJbXG5cbl0ifSk7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuWujOaIkCIpfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLor4TorrrlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlU2hhcmUhPT1mYWxzZSl7dHJ5e2NvbnN0IHNoYXJlUmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvYXJ0aWNsZS9zaGFyZS8iK3Bvc3RJZCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSk7aWYoc2hhcmVSZXM/LmNvZGU9PSIxMDAwMCIpe3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvmiJDlip8gKzEiKX1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvaW50ZWdyYWwvYWRqdXN0QnlTaGFyZSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pfWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLliIbkuqvlvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlRGVsZXRlIT09ZmFsc2UmJnBvc3RJZCl7dHJ5e2F3YWl0IGh0dHBEZWxldGUoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbW9uQXJ0aWNsZS9kZWxldGVBcnRpY2xlP2FydGljbGVJZD0iK3Bvc3RJZCsiJnBvc3RUeXBlPTEiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtyZXN1bHQuc3RlcHMucHVzaCgi5Yqo5oCB5bey5Yig6ZmkIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIoOmZpOW8guW4uDogIitlKX19fQpyZXN1bHQudG90YWxHYWluPXJlc3VsdC5zaWduaW5TY29yZStyZXN1bHQuYmxpbmRCb3hTY29yZStyZXN1bHQuaW50ZXJhY3RTY29yZTtyZXN1bHQuc3VjY2Vzcz10cnVlfWNhdGNoKGUpe3Jlc3VsdC5lcnJvcj1TdHJpbmcoZSk7cmVzdWx0LnN0ZXBzLnB1c2goIuaJp+ihjOW8guW4uDogIitlKX1yZXR1cm4gcmVzdWx0fQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFZFSElDTEVfQUNUSU9OX1RFWFQ9e2ZpbmQ6IuefreaMieWvu+i9piIsbG91ZEZpbmQ6Ium4o+esm+mXqueBryIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6rIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07CmZ1bmN0aW9uIHZlaGljbGVDaGVja1JlcyhyZXMsb2tNc2cpe2lmKHJlcyYmIXJlcy5lcnJvciYmKHJlcy5jb2RlPT0iMTAwMDAifHxyZXMuY29kZT09PTEwMDAwKSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnfTtjb25zdCBlcnJUZXh0PVN0cmluZygocmVzJiYocmVzLmVycm9yfHxyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwiIikudG9Mb3dlckNhc2UoKTtpZihyZXMmJnJlcy5lcnJvciYmL3RpbWVvdXR8dGltZWQgb3V0fHRpbWUgb3V0fOivt+axgui2heaXti8udGVzdChlcnJUZXh0KSlyZXR1cm57b2s6dHJ1ZSxtZXNzYWdlOm9rTXNnKyLvvIjlk43lupTotoXml7bkvYbovabovobpgJrluLjlt7LmiafooYzvvIzlj6/kuIvmi4nliLfmlrDnoa7orqTvvIkifTtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8KHJlcyYmcmVzLmVycm9yKXx8IuaMh+S7pOS4i+WPkeWksei0pSIsY29kZTpyZXMmJnJlcy5jb2RlfX0KYXN5bmMgZnVuY3Rpb24gdmVoaWNsZUNvbnRyb2woYWNjLGFjdGlvbixjZmcpe3RyeXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7bGV0IHZpbj1hY2MudmluTm98fCIiO2lmKCF2aW4pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsYyk7aWYoIWxpc3R8fCFsaXN0Lmxlbmd0aClyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq6I635Y+W5Yiw57uR5a6a6L2m6L6GKFZJTinvvIzor7fnoa7orqTotKblj7flt7Lnu5HlrprovabovoYifTt2aW49bGlzdFswXS52aW5Ob31jb25zdCBiYXNlPWJhc2VIZWFkZXJzKGFjYyk7aWYoYWN0aW9uPT09ImZpbmQiKXtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sIiIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUHV0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2wvIit2aW4saCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuWvu+i9puaMh+S7pOW3suS4i+WPke+8jOi9pui+huW6lOmXqueBr+aPkOekuiIpfWlmKGFjdGlvbj09PSJsb3VkRmluZCIpe2NvbnN0IGJvZHlTdHI9SlNPTi5zdHJpbmdpZnkoe3BhcmFtOiI0Iix2aW46dmlufSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LGJvZHlTdHIsYyl9O2NvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlSW5mby9jb250cm9sVjIiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIum4o+esm+mXqueBr+aMh+S7pOW3suS4i+WPkSIpfWlmKGFjdGlvbj09PSJjdXNoaW9uIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7Y29tbW9uZDoiMjgiLGNvbW1vbmRQYXJhbToiMSIsdmN1OnZpbix2ZXJzaW9uOiJ2MiJ9KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9wcm9wZXJ0eVR3by9vbmUiLGgsYm9keVN0cik7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsIuW8gOWdkOWeq+aMh+S7pOW3suS4i+WPke+8jOWdkOWeq+W6lOW8uei1tyIpfWlmKGFjdGlvbj09PSJ1bmxvY2sifHxhY3Rpb249PT0ibG9jayIpe2NvbnN0IHZLZXk9KGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKTtpZighdktleSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5bCa5pyq6YWN572u5LqR56uv5o6n6L2m5a+G6ZKl77ya6K+35Yiw44CM6K6+572uLeetvuWQjeWvhumSpemFjee9ruOAjeWhq+WGmeS6keerr+aOp+i9pkFFU+WvhumSpeW5tuS/neWtmOWQjuWGjeS9v+eUqOW8gC/lhbPplIEifTtpZighL15bMC05YS1mQS1GXXszMn0kLy50ZXN0KHZLZXkpKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLkupHnq6/mjqfovablr4bpkqXmoLzlvI/plJnor6/vvIjlupTkuLozMuS9jeWNgeWFrei/m+WItu+8ie+8jOivt+WIsOiuvue9rumhteaguOWvueWQjuS/neWtmCJ9O2NvbnN0IGxvY2tGbGFnPWFjdGlvbj09PSJ1bmxvY2siPyIxIjoiMCI7Y29uc3QgcGxhaW49J3tcbiAgImxvY2tGbGFnIiA6ICInK2xvY2tGbGFnKyciLFxuICAidmluTm8iIDogIicrdmluKyciXG59Jztjb25zdCBzZWNyZXQ9YWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbix2S2V5KTtjb25zdCBzZW5kQm9keT1KU09OLnN0cmluZ2lmeSh7c2VjcmV0OnNlY3JldH0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxwbGFpbixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVTZXQvbmV0d29yay91bmxvY2siLGgsc2VuZEJvZHksMjUwMDApO3JldHVybiB2ZWhpY2xlQ2hlY2tSZXMocmVzLGFjdGlvbj09PSJ1bmxvY2siPyLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiOiLkupHnq6/lhbPplIHmjIfku6Tlt7LkuIvlj5EiKX1yZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq55+l5pON5L2c57G75Z6LOiAiK2FjdGlvbn19Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuaOp+WItuW8guW4uDogIitTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGJhcmtQdXNoKGJhcmtLZXksdGl0bGUsYm9keSl7dHJ5e2xldCBzPVN0cmluZyhiYXJrS2V5fHwiIikudHJpbSgpLnJlcGxhY2UoL1wvKyQvLCIiKTtzPXMucmVwbGFjZSgvXmh0dHBzPzpcL1wvYXBpXC5kYXlcLmFwcFwvL2ksIiIpO2lmKCFzKXJldHVybntza2lwcGVkOnRydWV9O2xldCBiYXNlPSJodHRwczovL2FwaS5kYXkuYXBwIixrZXk9cztjb25zdCBtPXMubWF0Y2goL14oaHR0cHM/OlwvXC9bXi9dKylcLyguKykkL2kpO2lmKG0pe2Jhc2U9bVsxXTtrZXk9bVsyXX1rZXk9a2V5LnJlcGxhY2UoL15cLysvLCIiKTtjb25zdCB1PWJhc2UrIi8iK2VuY29kZVVSSUNvbXBvbmVudChrZXkpKyIvIitlbmNvZGVVUklDb21wb25lbnQodGl0bGUpKyIvIitlbmNvZGVVUklDb21wb25lbnQoYm9keSkrIj9ncm91cD1aRUVITyZzb3VuZD1iaXJkc29uZyI7cmV0dXJuIGF3YWl0IGh0dHBHZXQodSx7fSl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZyhlKX19fQoKLyogPT09PT09PT09PT09PT09PT0g5Luj55CG5qih5byP77yI5oyH5ZCR5Y6f6ISa5pysIHplZWhvLmJveCDlkI7nq6/vvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcHJveHlGZXRjaChwYXRoLG9wdHMpe2NvbnN0IHJhd0Jhc2U9Z2V0Q2ZnKCkuc2VydmVyQmFzZS5yZXBsYWNlKC9cLyskLywiIik7Y29uc3QgYmFzZT0od2luZG93Ll9fUEFORUxfTU9ERV9fJiYhcmF3QmFzZSk/IiI6cmF3QmFzZTtjb25zdCByPWF3YWl0IGZldGNoKGJhc2UrcGF0aCxvcHRzfHx7fSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX0KZnVuY3Rpb24gcHJveHlQb3N0KHBhdGgsYm9keSl7cmV0dXJuIHByb3h5RmV0Y2gocGF0aCx7bWV0aG9kOiJQT1NUIixoZWFkZXJzOnsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbiJ9LGJvZHk6SlNPTi5zdHJpbmdpZnkoYm9keXx8e30pfSl9Cgphc3luYyBmdW5jdGlvbiBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZyxsaW1pdCl7Y29uc3Qgb3V0PW5ldyBBcnJheShhY2NvdW50cy5sZW5ndGgpO2xldCBpPTA7YXN5bmMgZnVuY3Rpb24gd29ya2VyKCl7d2hpbGUoaTxhY2NvdW50cy5sZW5ndGgpe2NvbnN0IGlkeD1pKys7dHJ5e291dFtpZHhdPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjb3VudHNbaWR4XSxjZmcpfWNhdGNoKGUpe291dFtpZHhdPXt1c2VyTmFtZTphY2NvdW50c1tpZHhdLnVzZXJOYW1lfHwi5pyq55+lIix1c2VySWQ6YWNjb3VudHNbaWR4XS51c2VySWQsc3VjY2VzczpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fX19Y29uc3Qgbj1NYXRoLm1heCgxLE1hdGgubWluKGxpbWl0fHwzLGFjY291bnRzLmxlbmd0aCkpO2F3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oe2xlbmd0aDpufSx3b3JrZXIpKTtyZXR1cm4gb3V0fQoKY29uc3QgQmFja2VuZD17CiAgYXN5bmMgc2VuZENvZGUocGhvbmUpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2VuZC1jb2RlIix7cGhvbmU6cGhvbmV9KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i6aqM6K+B56CB5bey5Y+R6YCBIjoi5Y+R6YCB5aSx6LSlIil9O30KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9hdXRoQ29kZS8iK2VuY29kZVVSSUNvbXBvbmVudChwaG9uZSk7CiAgICBjb25zdCBkPWF3YWl0IGh0dHBHZXQodXJsLHsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJHRVQiLHt9LCIiLGNmZyl9KTsKICAgIHJldHVybntvazpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCIsbWVzc2FnZTpTdHJpbmcoZC5jb2RlKT09PSIxMDAwMCI/IumqjOivgeeggeW3suWPkemAge+8jOivt+afpeaUtuefreS/oSI6KChkJiYoZC5tZXNzYWdlfHxkLm1zZykpfHwi5Y+R6YCB5aSx6LSlIil9OwogIH0sCiAgYXN5bmMgcGhvbmVMb2dpbihwaG9uZSxjb2RlLGJhc2ljQXV0aCl7CiAgICBjb25zdCBiYXNpYz1TdHJpbmcoYmFzaWNBdXRofHwiIikudHJpbSgpLnJlcGxhY2UoL15CYXNpY1xzKy9pLCIiKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3Bob25lLWxvZ2luIix7cGhvbmU6cGhvbmUsY29kZTpjb2RlLGJhc2ljQXV0aDpiYXNpY30pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLnmbvlvZXmiJDlip8iOiLnmbvlvZXlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHBheWxvYWQ9e3Bob25lOnBob25lLGF1dGhDb2RlOmNvZGV9OwogICAgY29uc3QgdXJsPSJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvdXNlci9sb2dpbkJ5UGhvbmUiOwogICAgY29uc3QgaGRyPXsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiVXNlci1BZ2VudCI6Im9raHR0cC80LjkuMiIsLi4uYXBwR2F0ZXdheVNpZ24odXJsLCJQT1NUIix7fSxwYXlsb2FkLGNmZyl9OwogICAgaWYoYmFzaWMpaGRyWyJBdXRob3JpemF0aW9uIl09IkJhc2ljICIrYmFzaWM7CiAgICBjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QodXJsLGhkcixwYXlsb2FkLDIwMDAwKTsKICAgIGNvbnN0IHRva2VuSW5mbz1yZXMmJnJlcy5kYXRhJiZyZXMuZGF0YS50b2tlbkluZm87Y29uc3QgYWNjZXNzVG9rZW49dG9rZW5JbmZvJiZTdHJpbmcodG9rZW5JbmZvLmFjY2Vzc190b2tlbnx8IiIpOwogICAgaWYoIXJlc3x8U3RyaW5nKHJlcy5jb2RlKSE9PSIxMDAwMCJ8fCFhY2Nlc3NUb2tlbilyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi55m75b2V5aSx6LSl77yaIisoKHJlcyYmKHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCLpqozor4HnoIHmnInor6/miJblt7Lov4fmnJ8iKX07CiAgICBsZXQgdXNlcklkPSIiLHVzZXJOYW1lPSIiOwogICAgdHJ5e2NvbnN0IHNpZ25IMD1nZXRTaWduKCJoNSIse3NlcnZlcl9uYW1lOiJTTUFSVCJ9LCIiLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvYmFzZUluZm8/c2VydmVyX25hbWU9U01BUlQiLHsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2FjY2Vzc1Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsLi4uc2lnbkgwfSk7aWYoaW5mb1JlcyYmU3RyaW5nKGluZm9SZXMuY29kZSk9PT0iMTAwMDAiJiZpbmZvUmVzLmRhdGEpe3VzZXJJZD1TdHJpbmcoaW5mb1Jlcy5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKGluZm9SZXMuZGF0YS5uaWNrTmFtZXx8IiIpO319Y2F0Y2goZSl7fQogICAgY29uc3QgbGlzdD1nZXRBY2NvdW50cygpO2xldCByZXBsYWNlZD1mYWxzZTsKICAgIGZvcihsZXQgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXtpZihsaXN0W2ldJiYoU3RyaW5nKGxpc3RbaV0udG9rZW58fCIiKT09PWFjY2Vzc1Rva2VufHwobGlzdFtpXS51c2VySWQmJnVzZXJJZCYmU3RyaW5nKGxpc3RbaV0udXNlcklkKT09PXVzZXJJZCkpKXtsaXN0W2ldLnRva2VuPWFjY2Vzc1Rva2VuO2lmKHVzZXJJZClsaXN0W2ldLnVzZXJJZD11c2VySWQ7aWYodXNlck5hbWUpbGlzdFtpXS51c2VyTmFtZT11c2VyTmFtZTtyZXBsYWNlZD10cnVlO2JyZWFrO319CiAgICBjb25zdCBuZXdBY2M9e3VzZXJOYW1lOnVzZXJOYW1lfHxwaG9uZSx1c2VySWQ6dXNlcklkLHRva2VuOmFjY2Vzc1Rva2VuLGJhcmtLZXk6IiIsdXNlckFnZW50OiIifTsKICAgIGlmKCFyZXBsYWNlZClsaXN0LnB1c2gobmV3QWNjKTsKICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgIHJldHVybntvazp0cnVlLG1lc3NhZ2U6cmVwbGFjZWQ/IueZu+W9leaIkOWKn++8jOW3suabtOaWsOivpei0puWPtyI6IueZu+W9leaIkOWKn++8jOW3sua3u+WKoOi0puWPtyJ9OwogIH0sCiAgYXN5bmMgZ2V0RGFzaGJvYXJkKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXsKICAgICAgY29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2RhdGEiKTsKICAgICAgaWYoZCYmZC5hY2NvdW50cylyZXR1cm57YWNjb3VudHM6ZC5hY2NvdW50cyx0aW1lc3RhbXA6ZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxjb25maWc6ZC5jb25maWd8fG51bGwsb2s6dHJ1ZX07CiAgICAgIHJldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLku6PnkIbmnI3liqHml6Dlk43lupQiLHJhdzpkfTsKICAgIH0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGRhdGE9YXdhaXQgZmV0Y2hBbGxBY2NvdW50cyhhY2NvdW50cyxjZmcsMyk7CiAgICByZXR1cm57YWNjb3VudHM6ZGF0YSx0aW1lc3RhbXA6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLG9rOnRydWV9OwogIH0sCiAgYXN5bmMgcnVuU2lnbmluKHVzZXJJZCxhbGwpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcnVuLXNpZ25pbiIsYWxsP3thbGw6dHJ1ZX06e3VzZXJJZDp1c2VySWR9KTtpZihkJiZkLnJlc3VsdHMpcmV0dXJue29rOnRydWUscmVzdWx0czpkLnJlc3VsdHN9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLmiafooYzlpLHotKUifX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IHJlc3VsdHM9W107Y29uc3QgdGFyZ2V0cz1hbGw/YWNjb3VudHM6YWNjb3VudHMuZmlsdGVyKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7CiAgICBpZighdGFyZ2V0cy5sZW5ndGgpcmV0dXJue29rOnRydWUscmVzdWx0czpbXX07CiAgICBmb3IoY29uc3QgYWNjIG9mIHRhcmdldHMpe2NvbnN0IHI9YXdhaXQgcnVuU2lnbmluRm9yQWNjb3VudChhY2MsY2ZnKTtyZXN1bHRzLnB1c2gocik7Y29uc3QgX2Q9bmV3IERhdGUoKTtjb25zdCBfZHM9X2QuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9kLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX2QuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7YWRkTG9nKHt0aW1lOl9kLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X2RzLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6ci51c2VyTmFtZSx1c2VySWQ6ci51c2VySWQsc3VjY2VzczpyLnN1Y2Nlc3MsdG90YWxHYWluOnIudG90YWxHYWluLHNpZ25pblNjb3JlOnIuc2lnbmluU2NvcmUsYmxpbmRCb3hTY29yZTpyLmJsaW5kQm94U2NvcmUsaW50ZXJhY3RTY29yZTpyLmludGVyYWN0U2NvcmUsY29udGludWVEYXlzOnIuY29udGludWVEYXlzLGVycm9yOnIuZXJyb3Isc3RlcHM6ci5zdGVwc30pO2lmKHIuc3VjY2VzcyYmYWNjLmJhcmtLZXkmJlN0cmluZyhhY2MuYmFya0tleSkudHJpbSgpKXt0cnl7YXdhaXQgYmFya1B1c2goYWNjLmJhcmtLZXksIuaegeaguOetvuWIsOaIkOWKnyDCtyAiKyhyLnVzZXJOYW1lfHwiIiksIuS7iuaXpeiOt+W+lyAiK3IudG90YWxHYWluKyIg5YiG77yI562+5YiwIityLnNpZ25pblNjb3JlKyIgLyDnm7Lnm5IiK3IuYmxpbmRCb3hTY29yZSsiIC8g5LqS5YqoIityLmludGVyYWN0U2NvcmUrIu+8ie+8jOi/nuetviAiK3IuY29udGludWVEYXlzKyIg5aSpIil9Y2F0Y2goZSl7fX19CiAgICByZXR1cm57b2s6dHJ1ZSxyZXN1bHRzfTsKICB9LAogIGFzeW5jIHZlaGljbGVDdHJsKHVzZXJJZCxhY3Rpb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sIix7dXNlcklkOnVzZXJJZCxhY3Rpb246YWN0aW9ufSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpfX0KICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2xldCBhY2M9YWNjb3VudHMuZmluZChhPT5TdHJpbmcoYS51c2VySWQpPT09U3RyaW5nKHVzZXJJZCkpO2lmKCFhY2MmJmFjY291bnRzLmxlbmd0aClhY2M9YWNjb3VudHNbMF07aWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5pyq5om+5Yiw6LSm5Y+377yM6K+35YWI5Zyo6K6+572u6aG15re75YqgIn07aWYoIVZFSElDTEVfQUNUSU9OX1RFWFRbYWN0aW9uXSlyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi6Z2e5rOV5pON5L2c57G75Z6LIn07Y29uc3Qgcj1hd2FpdCB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyk7Y29uc3QgX3ZkPW5ldyBEYXRlKCk7Y29uc3QgX3Zkcz1fdmQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF92ZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF92ZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X3ZkLnRvTG9jYWxlU3RyaW5nKCJ6aC1DTiIse2hvdXIxMjpmYWxzZX0pLGRhdGU6X3Zkcyx0eXBlOiJ2ZWhpY2xlIixhY3Rpb246YWN0aW9uLGFjdGlvblRleHQ6VkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dfHwi6L2m6L6G5o6n5Yi2Iix1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ISFyLm9rLG1lc3NhZ2U6ci5tZXNzYWdlfHwiIixlcnJvcjpyLm9rPyIiOihyLm1lc3NhZ2V8fCLmjIfku6TlpLHotKUiKX0pO3JldHVybiByOwogIH0sCiAgYXN5bmMgZ2V0TG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9nZXQtbG9ncyIpO3JldHVybiBkJiZkLmxvZ3M/ZC5sb2dzOltdfXJldHVybiBnZXRMb2dzKCl9LAogIGFzeW5jIGNsZWFyTG9ncygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2NsZWFyLWxvZ3MiKTtyZXR1cm4gISFkLm9rfXJldHVybiBjbGVhckxvZ3MoKX0sCiAgYXN5bmMgc2F2ZUNvbmZpZyhjKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsYyk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUNmZyhjKX0sCiAgYXN5bmMgc2F2ZUFjY291bnRzKGxpc3Qpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtYWNjb3VudHMiLHthY2NvdW50czpsaXN0fSk7cmV0dXJuICEhZC5va31yZXR1cm4gc2F2ZUFjY291bnRzKGxpc3QpfSwKICBhc3luYyBnZXRVc2VyaWQodG9rZW4pe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2dldC11c2VyaWQiLHt0b2tlbjp0b2tlbn0pO3JldHVybntvazohIWQub2ssdXNlcklkOmQudXNlcklkfHwiIix1c2VyTmFtZTpkLnVzZXJOYW1lfHwiIixlcnJvcjpkLmVycm9yfHwiIn19cmV0dXJuIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sZ2V0Q2ZnKCkpfSwKICBhc3luYyBnZXRDb25maWcoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvY29uZmlnIik7aWYoZCYmZC5jb25maWcpcmV0dXJue29rOnRydWUsY29uZmlnOmQuY29uZmlnfTtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6KGQmJmQuZXJyb3IpfHwi6I635Y+W6YWN572u5aSx6LSlIn19cmV0dXJue29rOnRydWUsY29uZmlnOmdldENmZygpfX0sCiAgYXN5bmMgZ2V0QWNjb3VudHNGdWxsKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FjY291bnRzIik7cmV0dXJuIEFycmF5LmlzQXJyYXkoZCYmZC5hY2NvdW50cyk/ZC5hY2NvdW50czpbXX1yZXR1cm4gZ2V0QWNjb3VudHMoKX0sCiAgYXN5bmMgYmFja3VwKCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmFja3VwIik7cmV0dXJuIGQmJmQub2s/ZDpudWxsfQogICAgcmV0dXJue29rOnRydWUsYXBwOiLmnoHmoLhaRUVITyIsdHlwZToiemVlaG9fYmFja3VwIix2ZXJzaW9uOkFQUF9WRVJTSU9OLHRpbWU6Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLGFjY291bnRzOmdldEFjY291bnRzKCksY29uZmlnOmdldENmZygpfQogIH0sCiAgYXN5bmMgcmVzdG9yZUJhY2t1cChqc29uKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL2ltcG9ydCIse2pzb246anNvbn0pO3JldHVybiBkfHx7b2s6ZmFsc2UsZXJyb3I6IuWQjuerr+aXoOWTjeW6lCJ9fQogICAgdHJ5ewogICAgICBjb25zdCBiPXR5cGVvZiBqc29uPT09InN0cmluZyI/SlNPTi5wYXJzZShqc29uKTpqc29uOwogICAgICBpZighYnx8KGIudHlwZSE9PSJ6ZWVob19iYWNrdXAiJiYhQXJyYXkuaXNBcnJheShiLmFjY291bnRzKSkpcmV0dXJue29rOmZhbHNlLGVycm9yOiLlpIfku73moLzlvI/kuI3mraPnoa4ifTsKICAgICAgY29uc3QgbGlzdD0oYi5hY2NvdW50c3x8W10pLm1hcChhPT4oe3VzZXJOYW1lOmEudXNlck5hbWV8fCIiLHVzZXJJZDphLnVzZXJJZHx8IiIsdG9rZW46Y2xlYW5Ub2tlbihhLnRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShhLmJhcmtLZXl8fCIiKSx1c2VyQWdlbnQ6YS51c2VyQWdlbnR8fCIifSkpOwogICAgICBzYXZlQWNjb3VudHMobGlzdCk7CiAgICAgIGlmKGIuY29uZmlnJiZ0eXBlb2YgYi5jb25maWc9PT0ib2JqZWN0Iil7CiAgICAgICAgY29uc3QgY3VyPWdldENmZygpOwogICAgICAgIHNhdmVDZmcoewogICAgICAgICAgYXBwOnthcHBJZDpiLmNvbmZpZy5hcHA/LmFwcElkfHxjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5hcHA/LmFwcFNlY3JldHx8Y3VyLmFwcC5hcHBTZWNyZXR9LAogICAgICAgICAgaDU6e2FwcElkOmIuY29uZmlnLmg1Py5hcHBJZHx8Y3VyLmg1LmFwcElkLGFwcFNlY3JldDpiLmNvbmZpZy5oNT8uYXBwU2VjcmV0fHxjdXIuaDUuYXBwU2VjcmV0fSwKICAgICAgICAgIGNvbW11bml0eTp7ZW5hYmxlUG9zdDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVDb21tZW50IT09ZmFsc2UsZW5hYmxlU2hhcmU6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgICAgICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVBZXNLZXl8fCIiKS50cmltKCl8fGN1ci52ZWhpY2xlQWVzS2V5LAogICAgICAgICAgdmVoaWNsZUNvbnRyb2xSaXNrOlN0cmluZyhiLmNvbmZpZy52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCksCiAgICAgICAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGIuY29uZmlnLmF1dG9SZWZyZXNoU2VjKSwKICAgICAgICAgIHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2UKICAgICAgICB9KTsKICAgICAgfQogICAgICByZXR1cm57b2s6dHJ1ZSxjb3VudDpsaXN0Lmxlbmd0aH07CiAgICB9Y2F0Y2goZSl7cmV0dXJue29rOmZhbHNlLGVycm9yOlN0cmluZyhlKX19CiAgfSwKICAvKiAtLS0tIHYyLjE0Ljkg5paw5aKe5ZCO56uv6IO95Yqb77yI5LuF5Luj55CG5qih5byP77yJIC0tLS0gKi8KICBhc3luYyBpbnRlZ3JhbCh1c2VySWQscGFnZSl7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19JTlRFR1JBTDsKICAgIGlmKGlzUHJveHlNb2RlKCkpe3JldHVybiBhd2FpdCBwcm94eUZldGNoKCIvYXBpL2ludGVncmFsP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKSsiJnBhZ2U9IisocGFnZXx8MSkpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLnp6/liIblip/og73ku4XmlK/mjIHku6PnkIbmqKHlvI/vvIhpT1MgQXBwIC8g5qGM6Z2i54mIIC8gTG9vbu+8iSJ9CiAgfSwKICBhc3luYyBzdXBwbGVtZW50KGFjdGlvbix1c2VySWQscGFyYW1zKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBhY3Rpb249PT0ibW9udGgiP3tvazp0cnVlLGRhdGE6e25vd1NpZ25EZXRhaWxWb3M6ZGVtb0NhbCgpfX06KERFTU9fU1VQUExFTUVOVFthY3Rpb25dfHx7b2s6dHJ1ZSxkYXRhOjF9KTsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBsZXQgcT0iL2FwaS9zdXBwbGVtZW50P2FjdGlvbj0iK2VuY29kZVVSSUNvbXBvbmVudChhY3Rpb24pKyImdXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpOwogICAgICBwYXJhbXM9cGFyYW1zfHx7fTtPYmplY3Qua2V5cyhwYXJhbXMpLmZvckVhY2goaz0+e3ErPSImIitlbmNvZGVVUklDb21wb25lbnQoaykrIj0iK2VuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba10pfSk7CiAgICAgIHJldHVybiBhd2FpdCBwcm94eUZldGNoKHEpCiAgICB9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuihpeetvuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHZlaGljbGVNb25pdG9yKHVzZXJJZCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIERFTU9fTU9OSVRPUjsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL3ZlaGljbGUtbW9uaXRvcj91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iui9pui+huebkeaOp+S7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyB2ZWhpY2xlQ29udHJvbEV4dChib2R5KXsKICAgIGlmKGlzRGVtbygpKXJldHVybiAoYm9keSYmYm9keS5hY3Rpb249PT0ib3B0aW9ucyIpP0RFTU9fQ1RSTF9PUFRTOntvazp0cnVlLG1lc3NhZ2U6Iua8lOekuuaooeW8j++8muaMh+S7pOacquecn+WunuS4i+WPkSJ9OwogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5UG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wtZXh0Iixib2R5KX0KICAgIHJldHVybntvazpmYWxzZSxtZXNzYWdlOiLovabmjqfmianlsZXku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgYXN5bmMgYmF0dGVyeVN0YXRlKHVzZXJJZCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJue29rOnRydWUsdmluTm86IkRFTU8iLGNoYXJnaW5nOmZhbHNlLGN1cnJlbnQ6MCxzb2M6NzAsdm9sdGFnZTo4MC41LGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGZ1bGxDaGFyZ2VUaW1lOjAsZnVsbENoYXJnZVRpbWVTZWNvbmQ6MH07CiAgICBpZihpc1Byb3h5TW9kZSgpKXJldHVybiBhd2FpdCBwcm94eUZldGNoKCIvYXBpL2JhdHRlcnktc3RhdGU/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyh2aW4/IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKToiIikpOwogICAgcmV0dXJuIGF3YWl0IGZldGNoQmF0dGVyeVN0YXRlRGlyZWN0KHJpZGVBY2NMb2NhbCh1c2VySWQpLGdldENmZygpLHZpbik7CiAgfSwKICBhc3luYyBpbmZvQ2VudGVyKHVzZXJJZCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIERFTU9fSU5GTzsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL2luZm8tY2VudGVyP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi5L+h5oGv5Lit5b+D5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIC8qIC0tLS0gdjIuMTYuMCDpmpDol4/pqpHooYzmlbDmja4gLS0tLSAqLwogIGFzeW5jIHJpZGVNb250aCh1c2VySWQsbW9udGgsdmluKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBkZW1vUmlkZU1vbnRoKG1vbnRoKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL3JpZGUtbW9udGg/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImbW9udGg9IitlbmNvZGVVUklDb21wb25lbnQobW9udGh8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybiBhd2FpdCBmZXRjaFJpZGVNb250aERpcmVjdChyaWRlQWNjTG9jYWwodXNlcklkKSxnZXRDZmcoKSxtb250aCx2aW4pOwogIH0sCiAgYXN5bmMgcmlkZVRyYWNrKHVzZXJJZCx2aW4scGFnZSxwYWdlU2l6ZSxtb250aCl7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gZGVtb1JpZGVUcmFjayhwYWdlKTsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2xldCBxPSIvYXBpL3JpZGUtdHJhY2s/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSsiJnBhZ2VTaXplPSIrKHBhZ2VTaXplfHwyMCk7aWYodmluKXErPSImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbik7aWYobW9udGgpcSs9IiZtb250aD0iK2VuY29kZVVSSUNvbXBvbmVudChtb250aCk7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSl9CiAgICByZXR1cm4gYXdhaXQgZmV0Y2hSaWRlVHJhY2tEaXJlY3QocmlkZUFjY0xvY2FsKHVzZXJJZCksZ2V0Q2ZnKCksdmluLHBhZ2UscGFnZVNpemUsbW9udGgpOwogIH0sCiAgYXN5bmMgaW5zdGFsbEluZm8oKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9hcHAtaW5zdGFsbC1pbmZvIik7cmV0dXJuIGR8fG51bGx9CiAgICByZXR1cm4gbnVsbAogIH0KfTsKLyogPT09PT09PT09PT09PT09PT0g6Z2i5p2/5pWw5o2u5ZCM5q2l77yI6Z2i5p2/5qih5byP77ya6K6+572u6aG15LuO6ISa5pys5ZCO56uv6K+76LSm5Y+35LiO6YWN572u77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5UmVtb3RlQ2ZnKGMpewogIGlmKCFjfHx0eXBlb2YgYyE9PSJvYmplY3QiKXJldHVybjsKICBjb25zdCBsb2NhbD1nZXRDZmcoKTsKICBzYXZlQ2ZnKHsKICAgIGFwcDp7YXBwSWQ6Yy5hcHA/LmFwcElkfHxsb2NhbC5hcHAuYXBwSWQsYXBwU2VjcmV0OmMuYXBwPy5hcHBTZWNyZXR8fGxvY2FsLmFwcC5hcHBTZWNyZXR9LAogICAgaDU6e2FwcElkOmMuaDU/LmFwcElkfHxsb2NhbC5oNS5hcHBJZCxhcHBTZWNyZXQ6Yy5oNT8uYXBwU2VjcmV0fHxsb2NhbC5oNS5hcHBTZWNyZXR9LAogICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSwKICAgIHZlaGljbGVBZXNLZXk6U3RyaW5nKGMudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKXx8bG9jYWwudmVoaWNsZUFlc0tleSwKICAgIHZlaGljbGVDb250cm9sUmlzazpTdHJpbmcoYy52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCksCiAgICBhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGMuYXV0b1JlZnJlc2hTZWMpLAogICAgc2VydmVyQmFzZTpsb2NhbC5zZXJ2ZXJCYXNlLAogICAgYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLAogICAgYXV0b1NpZ25pblRpbWU6KHR5cGVvZiBjLmF1dG9TaWduaW5UaW1lPT09InN0cmluZyImJi9eXGR7MSwyfTpcZHsyfSQvLnRlc3QoYy5hdXRvU2lnbmluVGltZSk/Yy5hdXRvU2lnbmluVGltZToiMDc6MDAiKSwKICAgIHZlaGljbGVNb25pdG9yOmMudmVoaWNsZU1vbml0b3I9PT10cnVlLAogICAgd2lkZ2V0VmVoaWNsZTpTdHJpbmcoYy53aWRnZXRWZWhpY2xlfHwiIiksCiAgICBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpLAogICAgcGljczooYy5waWNzJiZ0eXBlb2YgYy5waWNzPT09Im9iamVjdCIpP2MucGljczoobG9jYWwucGljc3x8e30pCiAgfSk7Cn0KbGV0IHBhbmVsU3luY2luZz1mYWxzZTsKYXN5bmMgZnVuY3Rpb24gZW5zdXJlUGFuZWxEYXRhKGZvcmNlKXsKICBpZighaXNQcm94eU1vZGUoKXx8bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MClyZXR1cm47CiAgaWYocGFuZWxTeW5jaW5nKXJldHVybjsKICBpZighZm9yY2UmJlNUQVRFLnBhbmVsTG9hZGVkKXJldHVybjsKICBwYW5lbFN5bmNpbmc9dHJ1ZTsKICB0cnl7CiAgICBjb25zdCBbYyxhXT1hd2FpdCBQcm9taXNlLmFsbChbQmFja2VuZC5nZXRDb25maWcoKSxCYWNrZW5kLmdldEFjY291bnRzRnVsbCgpXSk7CiAgICBpZihhJiZhLmxlbmd0aCl7U1RBVEUucGFuZWxBY2NvdW50cz1hfQogICAgaWYoYyYmYy5vayYmYy5jb25maWcpYXBwbHlSZW1vdGVDZmcoYy5jb25maWcpOwogICAgU1RBVEUucGFuZWxMb2FkZWQ9dHJ1ZTsKICB9Y2F0Y2goZSl7fQogIHBhbmVsU3luY2luZz1mYWxzZTsKfQovKiA9PT09PT09PT09PT09PT09PSDlm77moIcgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgST17CmNoZWNrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCA2IDkgMTdsLTUtNSIvPjwvc3ZnPicsCng6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTE4IDYgNiAxOE02IDZsMTIgMTIiLz48L3N2Zz4nLAp6YXA6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEzIDIgMyAxNGg3bC0xIDggMTAtMTJoLTdsMS04eiIvPjwvc3ZnPicsCmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA4IDB2NCIvPjwvc3ZnPicsCnVubG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSIxMSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiByeD0iMyIvPjxwYXRoIGQ9Ik04IDExVjdhNCA0IDAgMCAxIDcuNS0xLjciLz48L3N2Zz4nLApiZWxsOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOCA4YTYgNiAwIDEgMC0xMiAwYzAgNy0zIDktMyA5aDE4cy0zLTItMy05Ii8+PHBhdGggZD0iTTEzLjcgMjFhMiAyIDAgMCAxLTMuNCAwIi8+PC9zdmc+JywKdm9sOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMSA1IDYgOUgydjZoNGw1IDRWNXoiLz48cGF0aCBkPSJNMTUuNSA4LjVhNSA1IDAgMCAxIDAgN00xOC41IDUuNWE5IDkgMCAwIDEgMCAxMyIvPjwvc3ZnPicsCnNlYXQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgNGgxNHY3YTQgNCAwIDAgMS00IDRIOWE0IDQgMCAwIDEtNC00VjR6Ii8+PHBhdGggZD0iTTkgMTV2NWg2di01Ii8+PC9zdmc+JywKcGluOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAxMGMwIDYtOCAxMi04IDEycy04LTYtOC0xMmE4IDggMCAwIDEgMTYgMHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIi8+PC9zdmc+JywKdGlyZTonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMuNSIvPjxwYXRoIGQ9Ik0xMiAzdjUuNU0xMiAxNS41VjIxTTMgMTJoNS41TTE1LjUgMTJIMjEiLz48L3N2Zz4nLApib2x0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLAp0aGVybW86Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDE0Ljc2VjVhMiAyIDAgMSAwLTQgMHY5Ljc2YTQgNCAwIDEgMCA0IDB6Ii8+PC9zdmc+JywKY2FsOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjMiLz48cGF0aCBkPSJNMTYgMnY0TTggMnY0TTMgMTBoMTgiLz48L3N2Zz4nLApjYXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTMgNi41IDcuNUEyIDIgMCAwIDEgOC40IDZoNy4yYTIgMiAwIDAgMSAxLjkgMS41TDE5IDEzIi8+PHBhdGggZD0iTTQgMTNoMTZhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMS0xIDFoLTFhMiAyIDAgMSAxLTQgMEg5YTIgMiAwIDEgMS00IDBINGExIDEgMCAwIDEtMS0xdi0zYTEgMSAwIDAgMSAxLTF6Ii8+PC9zdmc+JywKc2Nvb3RlcjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nLApwbHVnOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDJ2Nk0xNSAydjZNNyA4aDEwdjRhNSA1IDAgMCAxLTEwIDBWOHpNMTIgMTd2NSIvPjwvc3ZnPicsCmNsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48cGF0aCBkPSJNMTIgN3Y1bDMgMyIvPjwvc3ZnPicsCndpZmk6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTIuNWExMCAxMCAwIDAgMSAxNCAwTTguNSAxNmE1IDUgMCAwIDEgNyAwIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxOSIgcj0iMSIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+JywKYWxlcnQ6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDl2NE0xMiAxN2guMDEiLz48cGF0aCBkPSJNMTAuMyAzLjkgMS44IDE4YTIgMiAwIDAgMCAxLjcgM2gxN2EyIDIgMCAwIDAgMS43LTNMMTMuNyAzLjlhMiAyIDAgMCAwLTMuNCAweiIvPjwvc3ZnPicsCndhcm46Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDMgMiAyMWgyMEwxMiAzeiIvPjxwYXRoIGQ9Ik0xMiAxMHY1TTEyIDE4aC4wMSIvPjwvc3ZnPicsCmt2Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjUiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxNCIgcng9IjMiLz48cGF0aCBkPSJNNyA5aDNNMTQgMTVoM00xMCA5aC4wMU0xNyAxNWguMDEiLz48L3N2Zz4nLAprZXk6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOCIgY3k9IjE1IiByPSI0LjUiLz48cGF0aCBkPSJNMTEuMiAxMS44IDIwIDNNMTYgN2wzIDNNMTMgMTBsMiAyIi8+PC9zdmc+JywKdXNlcnM6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjgiIHI9IjQiLz48cGF0aCBkPSJNMiAyMWE3IDcgMCAwIDEgMTQgME0xNiA0LjZhNCA0IDAgMCAxIDAgNi44TTE5IDIxYTYuNSA2LjUgMCAwIDAtMy01LjUiLz48L3N2Zz4nLAptYXA6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMyAzLjUgNXYxNkw5IDE5bDYgMiA1LjUtMlYzTDE1IDUgOSAzeiIvPjxwYXRoIGQ9Ik05IDN2MTZNMTUgNXYxNiIvPjwvc3ZnPicKfTsKCi8qID09PT09PT09PT09PT09PT09IOWfuuehgCBVSSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgdG9hc3RUaW1lcj1udWxsOwpmdW5jdGlvbiB0b2FzdChtc2csdHlwZSl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInRvYXN0Iik7ZWwuY2xhc3NOYW1lPXR5cGV8fCJpbmZvIjtlbC5pbm5lckhUTUw9KHR5cGU9PT0iZXJyIj9JLng6dHlwZT09PSJvayI/SS5jaGVjazpJLndpZmkpKyc8c3Bhbj4nK2VzYyhtc2cpKyc8L3NwYW4+JztyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCk9PmVsLmNsYXNzTGlzdC5hZGQoInNob3ciKSk7Y2xlYXJUaW1lb3V0KHRvYXN0VGltZXIpO3RvYXN0VGltZXI9c2V0VGltZW91dCgoKT0+ZWwuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpLDI2MDApfQovKiB2Mi4xNC4xMCDkv67lpI3vvJrml6fniYjmiorlm57osIPlh73mlbDmupDnoIHnm7TmjqXmi7zov5sgb25jbGljayDlsZ7mgKfvvIxhc3luYyDlm57osIPlhoXnmoTlj4zlvJXlj7fkvJrmiKrmlq0gSFRNTCDlsZ7mgKfvvIwKICAg5a+86Ie06KGl562+L+WFkeaNouihpeetvuWNoS/pmLLnm5fluIPmjqfnrYnjgIznoa7lrprjgI3mjInpkq7ngrnlh7vml6Dlj43lupTjgILmlLnkuLrmmoLlrZjlm57osIPjgIHmjInpkq7osIPnlKjlhajlsYAgY29uZmlybVllcygpICovCmxldCBfX2NvbmZpcm1BY3Q9bnVsbDsKZnVuY3Rpb24gY29uZmlybURpYWxvZyh0aXRsZSxkZXNjLG9uWWVzLHllc1R4dCl7X19jb25maXJtQWN0PW9uWWVzO2NvbnN0IGxheWVyPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKTtsYXllci5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNvbmZpcm0iPjxkaXYgY2xhc3M9ImN0Ij4nK2VzYyh0aXRsZSkrJzwvZGl2PjxkaXYgY2xhc3M9ImNkIj4nK2Rlc2MrJzwvZGl2PjxkaXYgY2xhc3M9ImNiIj48YnV0dG9uIGNsYXNzPSJubyIgb25jbGljaz0iY2xvc2VDb25maXJtKCkiPuWPlua2iDwvYnV0dG9uPjxidXR0b24gY2xhc3M9InllcyIgb25jbGljaz0iY29uZmlybVllcygpIj4nK2VzYyh5ZXNUeHR8fCLnoa7lrpoiKSsnPC9idXR0b24+PC9kaXY+PC9kaXY+JztsYXllci5jbGFzc0xpc3QucmVtb3ZlKCJoaWRkZW4iKX0KZnVuY3Rpb24gY29uZmlybVllcygpe2Nsb3NlQ29uZmlybSgpO2NvbnN0IGE9X19jb25maXJtQWN0O19fY29uZmlybUFjdD1udWxsO2lmKGE9PW51bGwpcmV0dXJuO3RyeXtpZih0eXBlb2YgYT09PSJmdW5jdGlvbiIpe2EoKX1lbHNlIGlmKHR5cGVvZiBhPT09InN0cmluZyIpe2NvbnN0IHI9bmV3IEZ1bmN0aW9uKCJyZXR1cm4gKCIrYSsiKSIpKCk7aWYodHlwZW9mIHI9PT0iZnVuY3Rpb24iKXIoKX19Y2F0Y2goZSl7fX0KZnVuY3Rpb24gY2xvc2VDb25maXJtKCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvbmZpcm1MYXllciIpLmNsYXNzTGlzdC5hZGQoImhpZGRlbiIpfQpmdW5jdGlvbiBvcGVuU2hlZXQodGl0bGUsaWNvbixodG1sKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRUaXRsZSIpLmlubmVySFRNTD1pY29uKyc8c3Bhbj4nK2VzYyh0aXRsZSkrJzwvc3Bhbj4nO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJvZHkiKS5pbm5lckhUTUw9aHRtbDtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5hZGQoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iaGlkZGVuIn0KZnVuY3Rpb24gY2xvc2VTaGVldCgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldEJhY2tkcm9wIikuY2xhc3NMaXN0LnJlbW92ZSgic2hvdyIpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaGVldCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PSIifQpmdW5jdGlvbiBmbXRUaW1lKGlzbyl7dHJ5e2NvbnN0IGQ9bmV3IERhdGUoaXNvKTtjb25zdCBwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIik7cmV0dXJuIGQuZ2V0RnVsbFllYXIoKSsiLSIrcChkLmdldE1vbnRoKCkrMSkrIi0iK3AoZC5nZXREYXRlKCkpKyIgIitwKGQuZ2V0SG91cnMoKSkrIjoiK3AoZC5nZXRNaW51dGVzKCkpKyI6IitwKGQuZ2V0U2Vjb25kcygpKX1jYXRjaChlKXtyZXR1cm4iIn19CgovKiA9PT09PT09PT09PT09PT09PSDpobXpnaLliIfmjaIgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gc3dpdGNoVGFiKHRhYil7CiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiLnRhYiIpLmZvckVhY2godD0+dC5jbGFzc0xpc3QudG9nZ2xlKCJvbiIsdC5kYXRhc2V0LnRhYj09PXRhYikpOwogIGNvbnN0IHBhZ2VzPXtob21lOiJwYWdlSG9tZSIscG9pbnRzOiJwYWdlUG9pbnRzIix2ZWhpY2xlOiJwYWdlVmVoaWNsZSIscmlkZToicGFnZVJpZGUiLGxvZ3M6InBhZ2VMb2dzIixjZmc6InBhZ2VDZmcifTsKICBPYmplY3Qua2V5cyhwYWdlcykuZm9yRWFjaChrPT57Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFnZXNba10pO2lmKGVsKWVsLmNsYXNzTGlzdC50b2dnbGUoImhpZGRlbiIsayE9PXRhYil9KTsKICAvLyDnq4vljbPnrb7liLDmgqzmta7mjInpkq7ku4XpppbpobXmmL7npLoKICBjb25zdCBmYWI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpO2lmKGZhYilmYWIuc3R5bGUuZGlzcGxheT0odGFiPT09ImhvbWUiPyJmbGV4Ijoibm9uZSIpOwogIGlmKHRhYj09PSJwb2ludHMiKXJlbmRlclBvaW50cygpOwogIGlmKHRhYj09PSJ2ZWhpY2xlIil7cmVuZGVyVmVoaWNsZVBhZ2UoKX0KICBpZih0YWI9PT0icmlkZSIpe3JlbmRlclJpZGVQYWdlKCl9CiAgaWYodGFiPT09ImxvZ3MiKXJlbmRlckxvZ3MoKTsKICBpZih0YWI9PT0iY2ZnIilyZW5kZXJDZmcoKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6Ieq5Yqo5Yi35pawID09PT09PT09PT09PT09PT09ICovCmxldCByZWZyZXNoVGltZXI9bnVsbCxyZWZyZXNoTGVmdD02MDsKZnVuY3Rpb24gc3RhcnRBdXRvUmVmcmVzaChzZWMpe3N0b3BBdXRvUmVmcmVzaCgpO3JlZnJlc2hMZWZ0PXNlY3x8Z2V0Q2ZnKCkuYXV0b1JlZnJlc2hTZWM7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaFRpbWVyPXNldEludGVydmFsKCgpPT57cmVmcmVzaExlZnQtLTtpZihyZWZyZXNoTGVmdDw9MCl7cmVmcmVzaExlZnQ9MDt1cGRhdGVDb3VudENoaXAoKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdXBkYXRlQ291bnRDaGlwKCl9LDEwMDApfQpmdW5jdGlvbiBzdG9wQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpe2NsZWFySW50ZXJ2YWwocmVmcmVzaFRpbWVyKTtyZWZyZXNoVGltZXI9bnVsbH19CmZ1bmN0aW9uIHVwZGF0ZUNvdW50Q2hpcCgpe2NvbnN0IGNoaXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50Q2hpcCIpO2NvbnN0IHR4dD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY291bnRUeHQiKTtjb25zdCBhcmM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50QXJjIik7Y29uc3Qgc2VjPWdldENmZygpLmF1dG9SZWZyZXNoU2VjfHw2MDtpZighY2hpcClyZXR1cm47aWYocmVmcmVzaFRpbWVyKXtjaGlwLmNsYXNzTGlzdC5hZGQoIm9uIik7dHh0LnRleHRDb250ZW50PXJlZnJlc2hMZWZ0KyJzIjtjb25zdCBDPTIqTWF0aC5QSSo1LjY7YXJjLnNldEF0dHJpYnV0ZSgic3Ryb2tlLWRhc2hvZmZzZXQiLFN0cmluZyhDKigxLXJlZnJlc2hMZWZ0L3NlYykpKX1lbHNle2NoaXAuY2xhc3NMaXN0LnJlbW92ZSgib24iKTt0eHQudGV4dENvbnRlbnQ9IuaJi+WKqCJ9fQpmdW5jdGlvbiB0b2dnbGVBdXRvUmVmcmVzaCgpe2lmKHJlZnJlc2hUaW1lcilzdG9wQXV0b1JlZnJlc2goKTtlbHNlIHN0YXJ0QXV0b1JlZnJlc2goKTt1cGRhdGVDb3VudENoaXAoKX0KCi8qID09PT09PT09PT09PT09PT09IOS4i+aLieWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwooZnVuY3Rpb24oKXtjb25zdCB3cmFwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJXcmFwIiksaW5kPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJJbmQiKSx0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clR4dCIpLHNwaW49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInB0clNwaW4iKTtsZXQgc3RhcnRZPTAscHVsbGluZz1mYWxzZSxkaXN0YW5jZT0wO2NvbnN0IFRIPTY0Owp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoc3RhcnQiLGU9PntpZih3aW5kb3cuc2Nyb2xsWTw9MCYmZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikmJiFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKS5jbGFzc0xpc3QuY29udGFpbnMoImhpZGRlbiIpKXtzdGFydFk9ZS50b3VjaGVzWzBdLmNsaWVudFk7cHVsbGluZz10cnVlO2Rpc3RhbmNlPTB9fSx7cGFzc2l2ZTp0cnVlfSk7CndyYXAuYWRkRXZlbnRMaXN0ZW5lcigidG91Y2htb3ZlIixlPT57aWYoIXB1bGxpbmcpcmV0dXJuO2NvbnN0IGR5PWUudG91Y2hlc1swXS5jbGllbnRZLXN0YXJ0WTtpZihkeT4wJiZ3aW5kb3cuc2Nyb2xsWTw9MCl7ZGlzdGFuY2U9TWF0aC5taW4oZHkqMC41LDkwKTtpbmQuc3R5bGUuaGVpZ2h0PWRpc3RhbmNlKyJweCI7aW5kLmNsYXNzTGlzdC5hZGQoInB1bGxpbmciKTtzcGluLnN0eWxlLnRyYW5zZm9ybT0icm90YXRlKCIrKGRpc3RhbmNlKjMuNikrImRlZykiO3R4dC50ZXh0Q29udGVudD1kaXN0YW5jZT49VEg/IuadvuW8gOWIt+aWsCI6IuS4i+aLieWIt+aWsCI7aWYoZGlzdGFuY2U+PVRIJiYhZS5jYW5jZWxhYmxlKXJldHVybjtpZihkaXN0YW5jZT49VEgmJmUuY2FuY2VsYWJsZSllLnByZXZlbnREZWZhdWx0KCl9fSx7cGFzc2l2ZTpmYWxzZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNoZW5kIiwoKT0+e2lmKCFwdWxsaW5nKXJldHVybjtwdWxsaW5nPWZhbHNlO2lmKGRpc3RhbmNlPj1USCl7dHh0LnRleHRDb250ZW50PSLliLfmlrDkuK3igKYiO2luZC5zdHlsZS5oZWlnaHQ9IjQ2cHgiO3NwaW4uY2xhc3NMaXN0LmFkZCgic3Bpbm5lciIpO3JlZnJlc2hBbGwodHJ1ZSkuZmluYWxseSgoKT0+e2luZC5zdHlsZS5oZWlnaHQ9IjAiO2luZC5jbGFzc0xpc3QucmVtb3ZlKCJwdWxsaW5nIil9KX1lbHNle2luZC5zdHlsZS5oZWlnaHQ9IjAifWRpc3RhbmNlPTB9LHtwYXNzaXZlOnRydWV9KTsKfSkoKTsKCi8qID09PT09PT09PT09PT09PT09IOmmlumhtea4suafkyA9PT09PT09PT09PT09PT09PSAqLwpsZXQgU1RBVEU9e2RhdGE6W10sdGltZXN0YW1wOiIiLHRzVGV4dDoiIixyZWZyZXNoU2VjOjYwLHByb3h5OmZhbHNlLHBhbmVsQWNjb3VudHM6bnVsbCxwYW5lbExvYWRlZDpmYWxzZX07Ci8vIOmmlumhteWNoeeJh+WFpeWcuuWKqOeUu+WPquWcqOesrOS4gOasoea4suafk+aXtuaSreaUvu+8jOS5i+WQjumdmem7mOWIt+aWsOebtOaOpeabv+aNouWGheWuue+8jOmBv+WFjeWxj+mXqgpsZXQgSE9NRV9BTklNPXRydWU7CmZ1bmN0aW9uIHNrZWxldG9uSG9tZSgpe3JldHVybiAnPGRpdiBjbGFzcz0iaGVybyIgc3R5bGU9ImhlaWdodDoxMzJweCI+PC9kaXY+JysKJzxkaXYgY2xhc3M9InNrLWNhcmQiPjxkaXYgY2xhc3M9InNrLWxpbmUgdzQwIj48L2Rpdj48ZGl2IGNsYXNzPSJzay1yb3ciPicrQXJyYXkoNCkuZmlsbCgnPGRpdiBjbGFzcz0ic2stY2VsbCI+PC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjxkaXYgY2xhc3M9InNrLWJhciB3ODAiPjwvZGl2PjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc2MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nfQpmdW5jdGlvbiBzY29vdGVyRmFsbGJhY2soKXtyZXR1cm4gJzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjE4IiByPSIyLjQiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE3IiByPSIyLjQiLz48cGF0aCBkPSJNNSAxOGgxMGw0LTEtMi41LTRIOU03IDloNE0xMiAxM1Y3bTAgMCAyIDIiLz48L3N2Zz4nfQoKZnVuY3Rpb24gcmVuZGVySG9tZSgpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2NvbnN0IGRhdGE9U1RBVEUuZGF0YTsKICAvLyDkuI3lho3lnKjmr4/mrKHmuLLmn5PliY3mj5LlhaXpqqjmnrblsY/vvJrpnZnpu5joh6rliqjliLfmlrDml7bkvJrlhYjmuIXnqbrlho3loavlhYXvvIzpgKDmiJDmlbTpobXpl6rng4EKICBpZihkYXRhLmxlbmd0aD09PTApewogICAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGRpdiBjbGFzcz0iZS1pY29uIj4nK0kuY2FyKyc8L2Rpdj48aDM+6L+Y5rKh5pyJ5p6B5qC46LSm5Y+3PC9oMz48cD7ljrvjgIzorr7nva7jgI3pobXmt7vliqDotKblj7fvvJrnspjotLTmipPljIXlvpfliLDnmoQgQXV0aG9yaXphdGlvbiBUb2tlbu+8iEJlYXJlciDliY3nvIDkvJroh6rliqjljrvmjonvvInvvIzlho3ngrnjgIzojrflj5ZJROOAjeWNs+WPr+iHquWKqOWhq+WFheeUqOaIt0lE44CCPC9wPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzd2l0Y2hUYWIoXCdjZmdcJykiPuWOu+a3u+WKoOi0puWPtzwvYnV0dG9uPjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIC8vIOayoeaciee7keWumui9pui+hueahOi0puWPt+S4jeWcqOmmlumhteaYvuekuuWNoeeJhwogIGNvbnN0IGNhcmRzPWRhdGEuZmlsdGVyKGE9PmEudmVoaWNsZSYmYS52ZWhpY2xlLmhhc1ZlaGljbGUpLm1hcCgoYSxpZHgpPT5yZW5kZXJBY2NvdW50Q2FyZChhLGlkeCkpLmpvaW4oIiIpOwogIGVsLmlubmVySFRNTD1jYXJkcwogICsnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcg5pWw5o2u5pu05pawICcrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8iIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7kvZzogIUgbHVja3kgwrcgR2l0SHViPC9hPiDCtyA8YSBjbGFzcz0ibGluayIgaHJlZj0iaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OTgiIHRhcmdldD0iX2JsYW5rIiByZWw9Im5vb3BlbmVyIj7niLHlj5HnlLU8L2E+IMK3IOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgSE9NRV9BTklNPWZhbHNlOwp9CgpmdW5jdGlvbiBwb3dlclRleHQocCxsKXtwPVN0cmluZyhwfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7bD1TdHJpbmcobHx8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2NvbnN0IG9uVmFscz1bIjEiLCJvbiIsInRydWUiLCLlvIDmnLoiLCJvcGVuIiwi5r+A5rS7IiwiYWNjX29uIiwiYWNjIG9uIiwicG93ZXJfb24iLCJwb3dlciBvbiIsIuW3suW8gOacuiIsIuW3suS4iueUtSJdO2NvbnN0IG9mZlZhbHM9WyIwIiwib2ZmIiwiZmFsc2UiLCLlhbPmnLoiLCJjbG9zZWQiLCLlvoXmnLoiLCJhY2Nfb2ZmIiwiYWNjIG9mZiIsInBvd2VyX29mZiIsInBvd2VyIG9mZiIsIuW3suWFs+acuiIsIuW3suS4i+eUtSJdO2lmKHApe2lmKG9uVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYob2ZmVmFscy5pbmNsdWRlcyhwKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fWlmKGwpe2lmKFsiMCIsIuacqumUgSIsIuW8gOmUgSIsInVubG9ja2VkIiwiZmFsc2UiLCJvcGVuIiwi5bey5byA6ZSBIiwi5pyq6ZSB6L2mIl0uaW5jbHVkZXMobCkpcmV0dXJue3RleHQ6IuW3suW8gOacuiIsY2xzOiJvbiJ9O2lmKFsiMSIsIuW3sumUgSIsIumUgei9piIsImxvY2tlZCIsInRydWUiLCJjbG9zZWQiLCLlt7LplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5YWz5py6IixjbHM6Im9mZiJ9fXJldHVybnt0ZXh0OiLnirbmgIHmnKrnn6UiLGNsczoib2ZmIn19CmZ1bmN0aW9uIG9ubGluZVRleHQobyl7Y29uc3Qgcz1TdHJpbmcob3x8IiIpLnRvTG93ZXJDYXNlKCkudHJpbSgpO2lmKCFzKXJldHVybiIiO2lmKFsiMSIsIm9uIiwib25saW5lIiwidHJ1ZSIsIuWcqOe6vyIsIuW3suWcqOe6vyIsImNvbm5lY3RlZCIsIm5vcm1hbCJdLmluY2x1ZGVzKHMpKXJldHVybiLlnKjnur8iO2lmKFsiMCIsIm9mZiIsIm9mZmxpbmUiLCJmYWxzZSIsIuemu+e6vyIsIuacquWcqOe6vyIsIuW3suemu+e6vyIsImRpc2Nvbm5lY3QiLCJkaXNjb25uZWN0ZWQiLCJzbGVlcCIsIuS8keecoCJdLmluY2x1ZGVzKHMpKXJldHVybiLnprvnur8iO3JldHVybiBzfQpmdW5jdGlvbiByZW5kZXJBY2NvdW50Q2FyZChhLGlkeCl7CiAgY29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IG9ubD1vbmxpbmVUZXh0KHYub25saW5lfHx2LnJpZGVTdGF0ZSk7CiAgY29uc3QgaXNDaGFyZ2luZz0hISh2LmNoYXJnZVN0YXRlJiZ2LmNoYXJnZVN0YXRlIT09IuacquWFheeUtSIpOwogIGNvbnN0IHNvYz12LmJhdHRlcnlQZXJjZW50fHwwOwogIGNvbnN0IHNvY0NvbD1zb2M8PTIwPyIjRjk3MDZBIjpzb2M8PTUwPyIjRjdCOTU1IjoiIzNEREM5NyI7CiAgY29uc3QgcmFuZ2U9di5yZXNpZHVhbFJhbmdlS218fDA7CiAgY29uc3Qgdm9sdD12LnZvbHRhZ2U/TWF0aC5yb3VuZCh2LnZvbHRhZ2UpKyJWIjoiIjsKICBjb25zdCBmYj1zY29vdGVyRmFsbGJhY2soKTsKICAvLyBvbmVycm9yIOmHjOS4jeiDveWGjeW1jOWll+W8leWPt++8iOaXp+WGmeazleS8muaKiiBTVkcg5byV5Y+35oiq5pat77yM6aG16Z2i5q6L55WZICciPiDkubHnoIHnrKblj7fvvIkKICBjb25zdCBpbWc9di52ZWhpY2xlSW1hZ2VVcmw/JzxpbWcgc3JjPSInK2VzYyh2LnZlaGljbGVJbWFnZVVybCkrJyIgYWx0PSIiIG9uZXJyb3I9InRoaXMucmVtb3ZlKCkiPicrZmI6ZmI7CiAgY29uc3QgdmVoU3c9di5oYXNWZWhpY2xlP3JlbmRlclZlaGljbGVTd2l0Y2godixpZHgpOiIiOwogIGNvbnN0IGJvdW5kPXg9PiEheCYmeCE9PSLmnKrnu5HlrpoiJiZ4IT09Ii0iOwogIGNvbnN0IHJvd3M9W107CiAgcm93cy5wdXNoKCfph4znqIvvvJonKyh2LnRvdGFsTWlsZWFnZT92LnRvdGFsTWlsZWFnZS50b0ZpeGVkKDEpOih2Lmxhc3RSaWRlTWlsZWFnZT92Lmxhc3RSaWRlTWlsZWFnZS50b0ZpeGVkKDEpOiIwIikpKydrbScpOwogIHJvd3MucHVzaCgn5LiK5qyh77yaJysodi55ZXN0ZXJkYXlEaXN0YW5jZT92Lnllc3RlcmRheURpc3RhbmNlLnRvRml4ZWQoMSk6Ii0tIikrJ2ttJyk7CiAgcm93cy5wdXNoKCflvZPml6XvvJonKyh2LnRvZGF5RGlzdGFuY2U/di50b2RheURpc3RhbmNlLnRvRml4ZWQoMSk6IjAiKSsna20nKyhmbXRNaW4odi50b2RheUR1cmF0aW9uKT8iICIrZm10TWluKHYudG9kYXlEdXJhdGlvbik6IiIpKyh2LnRvZGF5TWF4U3BlZWQ/IiAiK3YudG9kYXlNYXhTcGVlZCsia20vaCI6IiIpKTsKICBpZihib3VuZCh2LmZyb250UHJlc3N1cmUpfHxib3VuZCh2LnJlYXJQcmVzc3VyZSkpcm93cy5wdXNoKCfog47ljovvvJonKyhib3VuZCh2LmZyb250UHJlc3N1cmUpPyLliY0gIitlc2Modi5mcm9udFByZXNzdXJlKToiIikrKChib3VuZCh2LmZyb250UHJlc3N1cmUpJiZib3VuZCh2LnJlYXJQcmVzc3VyZSkpPyIgLyAiOiIiKSsoYm91bmQodi5yZWFyUHJlc3N1cmUpPyLlkI4gIitlc2Modi5yZWFyUHJlc3N1cmUpOiIiKSk7CiAgaWYoYm91bmQodi5mcm9udFRlbXApfHxib3VuZCh2LnJlYXJUZW1wKSlyb3dzLnB1c2goJ+iDjua4qe+8micrKGJvdW5kKHYuZnJvbnRUZW1wKT8i5YmNICIrZXNjKHYuZnJvbnRUZW1wKToiIikrKChib3VuZCh2LmZyb250VGVtcCkmJmJvdW5kKHYucmVhclRlbXApKT8iIC8gIjoiIikrKGJvdW5kKHYucmVhclRlbXApPyLlkI4gIitlc2Modi5yZWFyVGVtcCk6IiIpKTsKICBpZihpc0NoYXJnaW5nJiZ2LmN1cnJlbnQpcm93cy5wdXNoKCfnlLXmtYHvvJonK051bWJlcih2LmN1cnJlbnQpLnRvRml4ZWQoMSkrJ0EnKTsKICAvLyB2Mi4xNi42IOWNoeeJh+WFheeUteWJqeS9me+8iOWFheeUteS4reS4lOivpei9puW3suiuvuWuuemHj+aJjeaYvuekuu+8iQogIGlmKGlzQ2hhcmdpbmcmJk51bWJlcih2LmN1cnJlbnQpPjAuNSYmc29jPjAmJnNvYzwxMDApe2NvbnN0IGJjPXJpZGVCYXR0Q2ZnKHYuY3VycmVudFZpbnx8IiIpO2lmKE51bWJlcihiYy5haCk+MClyb3dzLnB1c2goJ+KPsSDlhYXnlLXliankvZnvvJrnuqYgJytmbXRSZW1haW5IbShOdW1iZXIoYmMuYWgpKigxMDAtc29jKS8xMDAvTnVtYmVyKHYuY3VycmVudCkqNjApKTt9CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJhY2MtY2FyZCBob21lLWNhcmQnKyhpc0NoYXJnaW5nPycgY2hhcmdpbmcnOicnKSsoSE9NRV9BTklNPycgYW5pbS1pbic6JycpKyciIHN0eWxlPSJhbmltYXRpb24tZGVsYXk6JysoaWR4KjYwKSsnbXMiPicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdXBkIj7mm7TmlrDvvJonK2VzYyhTVEFURS50c1RleHR8fCItIikrJzwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtdG9wIj48ZGl2IGNsYXNzPSJoYy1uYW1lIj4nK2VzYyh2Lmhhc1ZlaGljbGU/KHYudmVoaWNsZU5hbWV8fGEudXNlck5hbWUpOmEudXNlck5hbWUpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZT8ob25sPT09IuWcqOe6vyI/JzxzcGFuIGNsYXNzPSJoYy1iYWRnZSBvbiI+5Zyo57q/PC9zcGFuPic6KG9ubD8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIj4nK2VzYyhvbmwpKyc8L3NwYW4+JzoiIikpOiIiKSsKICAgIChhLnRva2VuVmFsaWQ9PT1mYWxzZT8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGVyciI+VG9rZW7lpLHmlYg8L3NwYW4+JzoiIikrCiAgICAoaXNDaGFyZ2luZz8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIGNoZyI+5YWF55S15LitPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgKHYuaGFzVmVoaWNsZSYmdi52ZWhpY2xlTW9kZWw/JzxkaXYgY2xhc3M9ImhjLW1vZGVsIj7ovablnovvvJonK2VzYyh2LnZlaGljbGVNb2RlbCkrJzwvZGl2Pic6IiIpKwogICAgKHYuaGFzVmVoaWNsZT8nPGRpdiBjbGFzcz0iaGMtbWlkIj48ZGl2IGNsYXNzPSJoYy1sZWZ0Ij48ZGl2IGNsYXNzPSJoYy1iaWcgbnVtIj4nK01hdGgucm91bmQoc29jKSsnJTxzcGFuIGNsYXNzPSJoYy1rbSBudW0iPicrKHJhbmdlfHwwKSsna208L3NwYW4+Jysodm9sdD8nPHNwYW4gY2xhc3M9ImhjLXYgbnVtIj4nK3ZvbHQrJzwvc3Bhbj4nOiIiKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1iYXIiPjxkaXYgY2xhc3M9ImhjLWZpbGwiIHN0eWxlPSJ3aWR0aDonK01hdGgubWF4KDAsTWF0aC5taW4oMTAwLHNvYykpKyclO2JhY2tncm91bmQ6Jytzb2NDb2wrJyI+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1yb3dzIj4nK3Jvd3MubWFwKHI9Pic8ZGl2IGNsYXNzPSJoYy1yb3ciPicrcisnPC9kaXY+Jykuam9pbigiIikrJzwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGMtaW1nIj4nK2ltZysnPC9kaXY+PC9kaXY+JzoKICAgICc8ZGl2IGNsYXNzPSJuby12ZWhpY2xlIiBzdHlsZT0ibWFyZ2luOjEycHggMCI+JytJLmNhcisnIOivpei0puWPt+acque7keWumui9pui+hjwvZGl2PicpKwogICAgJzxkaXYgY2xhc3M9ImhjLWJvdHRvbSI+PGRpdiBjbGFzcz0iaGMtc2NvcmUiPjxzcGFuPuaAu+enr+WIhiA8YiBjbGFzcz0ibnVtIj4nK051bWJlcihhLnNjb3JlfHwwKS50b0xvY2FsZVN0cmluZygpKyc8L2I+PC9zcGFuPjxzcGFuIGNsYXNzPSJwbHVzIG51bSI+5LuKKycrTnVtYmVyKGEudG9kYXlTY29yZXx8MCkrJzwvc3Bhbj48c3BhbiBjbGFzcz0ic3RyZWFrIG51bSI+6L+e562+JytOdW1iZXIoYS5jb250aW51ZURheXN8fDApKyflpKk8L3NwYW4+JysoYS5zaWduZWRUb2RheT8nPHNwYW4gY2xhc3M9InNpZ25lZCBudW0iPuKckyDlt7Lnrb7liLA8L3NwYW4+JzoiIikrJzwvZGl2PjwvZGl2PicrCiAgICB2ZWhTdysnPC9kaXY+JzsKfQpmdW5jdGlvbiBmbXRNaW4obWluKXttaW49TnVtYmVyKG1pbil8fDA7aWYobWluPD0wKXJldHVybiIiO2NvbnN0IGg9TWF0aC5mbG9vcihtaW4vNjApLG09TWF0aC5yb3VuZChtaW4lNjApO3JldHVybiBoPjA/aCsiaCIrKG0/bSsibWluIjoiIik6bSsibWluIn0KZnVuY3Rpb24gZm10UmVtYWluSG0obWluKXttaW49TWF0aC5tYXgoMSxNYXRoLnJvdW5kKE51bWJlcihtaW4pfHwwKSk7Y29uc3QgaD1NYXRoLmZsb29yKG1pbi82MCksbT1taW4lNjA7cmV0dXJuIChoPjA/aCsiIOaXtiAiOiIiKSttKyIg5YiGIn0KCi8qID09PT09PT09PT09PSDlpJrovabliIfmjaIgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIHJlbmRlclZlaGljbGVTd2l0Y2godixpZHgpewogIGlmKCF2LnZlaGljbGVzfHx2LnZlaGljbGVzLmxlbmd0aDwyKXJldHVybiAiIjsKICBjb25zdCBjdXI9di5jdXJyZW50VmlufHwiIjsKICBjb25zdCBpdGVtcz12LnZlaGljbGVzLm1hcCh4PT4nPGJ1dHRvbiBjbGFzcz0idmVoLWNoaXAnKyh4LnZpbk5vPT09Y3VyPyIgb24iOiIiKSsnIiBvbmNsaWNrPSJzd2l0Y2hWZWhpY2xlKCcraWR4KycsXCcnK2VzYyh4LnZpbk5vKSsnXCcpIj4nK2VzYyh4LnZlaGljbGVUeXBlfHx4Lm5hbWUpKyc8L2J1dHRvbj4nKS5qb2luKCIiKTsKICByZXR1cm4gJzxkaXYgY2xhc3M9InZlaC1zd2l0Y2giPjxzcGFuIGNsYXNzPSJ2ZWgtc3ctbGFiZWwiPui9pui+hjwvc3Bhbj4nK2l0ZW1zKyc8L2Rpdj4nOwp9CmFzeW5jIGZ1bmN0aW9uIHN3aXRjaFZlaGljbGUoaWR4LHZpbil7CiAgY29uc3Qgc3JjPVNUQVRFLmRhdGFbaWR4XTtpZighc3JjfHwhdmluKXJldHVybjsKICB0cnl7CiAgICBsZXQgZDsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBjb25zdCByPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvdmVoaWNsZT91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoc3JjLnVzZXJJZHx8IiIpKyImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbikpOwogICAgICBkPShyJiZyLm9rKT9yLnJlc3VsdDpudWxsOwogICAgfWVsc2V7CiAgICAgIGNvbnN0IGNmZz1nZXRDZmcoKTtjb25zdCBhY2M9Z2V0QWNjb3VudHMoKVtpZHhdOwogICAgICBpZighYWNjKXJldHVybjsKICAgICAgZD1hd2FpdCBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluKTsKICAgIH0KICAgIGlmKGQmJmQudmVoaWNsZSYmZC52ZWhpY2xlLmhhc1ZlaGljbGUpewogICAgICBTVEFURS5kYXRhW2lkeF09T2JqZWN0LmFzc2lnbih7fSxTVEFURS5kYXRhW2lkeF0sZCk7CiAgICAgIHJlbmRlckhvbWUoKTsKICAgIH0KICB9Y2F0Y2goZSl7fQp9CgovKiA9PT09PT09PT09PT0g5Li76aKY77yIdjIuMTQuMTQg6LW35LuF5L+d55WZ5rex6Imy5Y2V5Li76aKY77yJID09PT09PT09PT09PSAqLwpmdW5jdGlvbiBhcHBseVRoZW1lKCl7CiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNldEF0dHJpYnV0ZSgiZGF0YS10aGVtZSIsImRhcmsiKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g56uL5Y2z562+5Yiw5oKs5rWu5oyJ6ZKuID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG1vdW50U2lnbmluRmFiKCl7CiAgaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpKXJldHVybjsKICBjb25zdCBiPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImJ1dHRvbiIpOwogIGIuaWQ9InNpZ25pbkZhYiI7Yi5jbGFzc05hbWU9InNpZ25pbi1mYWIiO2IuaW5uZXJIVE1MPShJLmNoZWNrfHwiIikrIjxzcGFuPueri+WNs+etvuWIsDwvc3Bhbj4iOwogIGIub25jbGljaz1ydW5TaWduaW5Ob3c7CiAgY29uc3QgY3VyPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoIi50YWIub24iKTsKICBiLnN0eWxlLmRpc3BsYXk9KCFjdXJ8fGN1ci5kYXRhc2V0LnRhYj09PSJob21lIik/ImZsZXgiOiJub25lIjsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbk5vdygpewogIGlmKGlzRGVtbygpKXtkZW1vU2lnbmluKCk7cmV0dXJufQogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoIWJ0bnx8YnRuLmNsYXNzTGlzdC5jb250YWlucygiYnVzeSIpKXJldHVybjsKICBidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiI7CiAgdG9hc3QoIuato+WcqOS4uuWFqOmDqOi0puWPt+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucnVuU2lnbmluKG51bGwsdHJ1ZSk7CiAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAiOwogIGlmKGQmJmQub2smJmQucmVzdWx0cyl7CiAgICBjb25zdCBva049ZC5yZXN1bHRzLmZpbHRlcihyPT5yLnN1Y2Nlc3MpLmxlbmd0aDsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoiK29rTisiLyIrZC5yZXN1bHRzLmxlbmd0aCsiIOaIkOWKnyIsb2tOPT09ZC5yZXN1bHRzLmxlbmd0aD8ib2siOiJlcnIiKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLHNpZ25pblJlc3VsdEh0bWwoZC5yZXN1bHRzKSk7CiAgICByZWZyZXNoQWxsKHRydWUpOwogIH1lbHNlewogICAgdG9hc3QoKGQmJmQuZXJyb3IpfHwi562+5Yiw5omn6KGM5aSx6LSlIiwiZXJyIik7CiAgfQp9CmZ1bmN0aW9uIHNpZ25pblJlc3VsdEh0bWwocmVzdWx0cyl7CiAgcmV0dXJuIChyZXN1bHRzfHxbXSkubWFwKHI9Pic8ZGl2IGNsYXNzPSJzaWctY2FyZCAnKyhyLnN1Y2Nlc3M/Im9rIjoiZmFpbCIpKyciPjxkaXYgY2xhc3M9ImgiPjxzcGFuPicrZXNjKHIudXNlck5hbWV8fCLmnKrnn6UiKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj4nKyhyLnN1Y2Nlc3M/KCIrIisoci50b3RhbEdhaW58fDApKyIg5YiGIik6IuWksei0pSIpKyc8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0ic3RlcHMiPicrKHIuc3RlcHN8fFtdKS5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKyhyLmVycm9yPyc8ZGl2IGNsYXNzPSJlcnIiPicrZXNjKHIuZXJyb3IpKyc8L2Rpdj4nOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7Cn0KLyog5ryU56S65qih5byP77ya5qih5ouf5LiA5qyh562+5Yiw5bm25by55Ye657uT5p6c77yM6YG/5YWN5ryU56S65pe257uT5p6c5Li656m6ICovCmZ1bmN0aW9uIGRlbW9TaWduaW4oKXsKICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpOwogIGlmKGJ0bil7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnrb7liLDkuK3igKYifQogIHRvYXN0KCLmvJTnpLrmqKHlvI/vvJrmqKHmi5/miafooYznrb7liLDigKYiLCJpbmZvIik7CiAgc2V0VGltZW91dCgoKT0+ewogICAgaWYoYnRuKXtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCJ9CiAgICBjb25zdCByZXM9WwogICAgICB7dXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2Fpbjo5LHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICszICjnp6/liIYpIiwi5Y+R5biW5oiQ5YqfICsxIiwi54K56LWe5oiQ5YqfICsxIiwi5YiG5Lqr5oiQ5YqfICsxIiwi6K+E6K665a6M5oiQIl19LAogICAgICB7dXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ/vvIzor7fph43mlrDnmbvlvZUiLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0KICAgIF07CiAgICB0b2FzdCgi562+5Yiw5a6M5oiQ77yaMS8yIOaIkOWKn++8iOa8lOekuuaVsOaNru+8iSIsIm9rIik7CiAgICBvcGVuU2hlZXQoIuetvuWIsOe7k+aenCIsSS5jaGVjayxzaWduaW5SZXN1bHRIdG1sKHJlcykpOwogIH0sNzAwKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G6K+m5oOFICYg5Zyw5Zu+ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG9wZW5NYXAoaWR4KXtjb25zdCB2PVNUQVRFLmRhdGFbaWR4XSYmU1RBVEUuZGF0YVtpZHhdLnZlaGljbGU7aWYoIXYpcmV0dXJuO2lmKCFoYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpKXt0b2FzdCgi5pqC5peg5pyJ5pWIIEdQUyDlnZDmoIciLCJlcnIiKTtyZXR1cm59Y29uc3QgdXJsPSJodHRwczovL21hcHMuYXBwbGUuY29tLz9xPSIrTnVtYmVyKHYubGF0aXR1ZGUpKyIsIitOdW1iZXIodi5sb25naXR1ZGUpKyImej0xNyI7d2luZG93Lm9wZW4odXJsLCJfYmxhbmsiKX0KZnVuY3Rpb24gc2hvd1ZlaGljbGVEZXRhaWwoaWR4KXsKICBjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IHB3PXBvd2VyVGV4dCh2LnBvd2VyU3RhdHVzLHYubG9ja1N0YXRlKTsKICBjb25zdCByb3dzPVtdOwogIGlmKHYudmluTm8pcm93cy5wdXNoKFsn6L2m5p625Y+3JywnPHNwYW4gY2xhc3M9InYgbW9ubyIgaWQ9InZpbkR0bCI+Jytlc2MobWFza1Zpbih2LnZpbk5vKSkrJzwvc3Bhbj4gPGJ1dHRvbiBjbGFzcz0idmluLXNob3ciIG9uY2xpY2s9InRvZ2dsZUR0bFZpbigpIj7mmL7npLo8L2J1dHRvbj4nXSk7CiAgcm93cy5wdXNoKFsn5YWF55S154q25oCBJyxlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpXSk7CiAgcm93cy5wdXNoKFsn55S15rqQ54q25oCBJywnPHNwYW4gc3R5bGU9ImNvbG9yOicrKHB3LmNscz09PSJvbiI/InZhcigtLW9rKSI6InZhcigtLXR4dDIpIikrJyI+Jytwdy50ZXh0Kyc8L3NwYW4+J10pOwogIGlmKHYucmlkZVN0YXRlfHx2Lm9ubGluZSlyb3dzLnB1c2goWyfovabovobnirbmgIEnLGVzYyh2LnJpZGVTdGF0ZXx8di5vbmxpbmUpXSk7CiAgcm93cy5wdXNoKFsn55S16YePIFNPQycsJzxiIHN0eWxlPSJjb2xvcjonKyh2LmJhdHRlcnlQZXJjZW50PD0yMD8idmFyKC0tZXJyKSI6di5iYXR0ZXJ5UGVyY2VudDw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tYnJhbmQpIikrJyI+Jysodi5iYXR0ZXJ5UGVyY2VudHx8MCkrJyU8L2I+J10pOwogIGlmKHYudm9sdGFnZSlyb3dzLnB1c2goWyfnlLXljosnLHYudm9sdGFnZS50b0ZpeGVkKDEpKyJWIl0pOwogIGlmKHYuY3VycmVudClyb3dzLnB1c2goWyfnlLXmtYEnLHYuY3VycmVudC50b0ZpeGVkKDEpKyJBIl0pOwogIGlmKHYuYmF0dGVyeVRlbXApcm93cy5wdXNoKFsn55S15rGg5rip5bqmJyx2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrIsKwQyJdKTsKICByb3dzLnB1c2goWyfliankvZnnu63oiKonLCh2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrIiBrbSIrKHYucmFuZ2VFc3RpbWF0ZWQ/Iu+8iOS8sOeul++8iSI6IiIpXSk7CiAgcm93cy5wdXNoKFsn5LuK5pel6aqR6KGMJywodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOjApKyIga20gLyAiKyh2LnRvZGF5RHVyYXRpb258fDApKyIgbWluIl0pOwogIGlmKCh2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKXx8KHYucmVhclByZXNzdXJlJiZ2LnJlYXJQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKSlyb3dzLnB1c2goWyfog47ljosnLCfliY0gJytlc2Modi5mcm9udFByZXNzdXJlfHwiLSIpKycgLyDlkI4gJytlc2Modi5yZWFyUHJlc3N1cmV8fCItIildKTsKICBpZih2LmFkZHJlc3Mpcm93cy5wdXNoKFsn6L2m6L6G5L2N572uJywnPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5hZGRyZXNzKSsnPC9zcGFuPiddKTsKICBjb25zdCBkT2s9aGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKTsKICBpZihkT2spcm93cy5wdXNoKFsnR1BTIOWdkOaghycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iPicrTnVtYmVyKHYubGF0aXR1ZGUpLnRvRml4ZWQoNikrIiwgIitOdW1iZXIodi5sb25naXR1ZGUpLnRvRml4ZWQoNikrJzwvc3Bhbj4nXSk7CiAgaWYodi5sb2NhdGlvblRpbWUpcm93cy5wdXNoKFsn5pyA5ZCO5a6a5L2NJywnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5sb2NhdGlvblRpbWUpKyc8L3NwYW4+J10pOwogIGlmKHYuc2VydmljZUVuZERhdGUpcm93cy5wdXNoKFsn5pyN5Yqh5Yiw5pyfJyxlc2Modi5zZXJ2aWNlRW5kRGF0ZSldKTsKICBTVEFURS52aW5EdGxSYXc9di52aW5Ob3x8IiI7CiAgY29uc3QgaHRtbD1yb3dzLm1hcChyPT4nPGRpdiBjbGFzcz0ic3ItaXRlbSI+PHNwYW4gY2xhc3M9ImsiPicrclswXSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nK3JbMV0rJzwvc3Bhbj48L2Rpdj4nKS5qb2luKCIiKSsKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuICcrKGRPaz8icHJpbWFyeSI6IiIpKyciICcrKGRPaz8nb25jbGljaz0iY2xvc2VTaGVldCgpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJyDlnLDlm77mn6XnnIs8L2J1dHRvbj48L2Rpdj4nOwogIG9wZW5TaGVldCgi6L2m6L6G6K+m5oOFIMK3ICIrZXNjKHYudmVoaWNsZU5hbWV8fCLmnoHmoLjovabovoYiKSxJLmNhcixodG1sKTsKfQpmdW5jdGlvbiB0b2dnbGVEdGxWaW4oKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluRHRsIik7aWYoIWVsKXJldHVybjtpZihlbC50ZXh0Q29udGVudC5pbmRleE9mKCIqIik+PTApe2VsLnRleHRDb250ZW50PVNUQVRFLnZpbkR0bFJhdztkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLpmpDol48ifWVsc2V7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i5pi+56S6IjtlbC50ZXh0Q29udGVudD1tYXNrVmluKGVsLnRleHRDb250ZW50KX19Ci8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjO+8iOmdouadv+W3suenu+mZpOaJi+WKqOetvuWIsOWFpeWPo++8jOWumuaXtuetvuWIsOeUseiEmuacrCBjcm9uIOi0n+i0o++8iSA9PT09PT09PT09PT09PT09PSAqLwoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCi8vIHYyLjE0LjIxIOi9puaOp+mjjumZqeehruiupOaUueS4uummluasoeS9v+eUqOW8ueeql++8muWQjOaEj+WQjuWPr+eUqO+8jOS4jeWQjOaEj+WImeS4jeWQr+eUqApsZXQgX19yaXNrUGVuZGluZz1udWxsOwpmdW5jdGlvbiByaXNrT2soKXtjb25zdCByPShnZXRDZmcoKS52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCk7cmV0dXJuIHI9PT0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoInx8cj09PSLmiJHoh6rmhL/mib/mi4Xnm7jlhbPpo47pmakifQpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhfHwhYS51c2VySWQpe3RvYXN0KCLor6XotKblj7fnvLrlsJHnlKjmiLdJRCIsImVyciIpO3JldHVybn1pZighcmlza09rKCkpe3Nob3dSaXNrRGlhbG9nKGlkeCxhY3Rpb24pO3JldHVybn1jdHJsQ29uZmlybShpZHgsYWN0aW9uKX0KZnVuY3Rpb24gY3RybENvbmZpcm0oaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtjb25zdCBuYW1lcz17ZmluZDoi55+t5oyJ5a+76L2m77yI6L2m6L6G6Zeq54Gv77yJIixsb3VkRmluZDoi6bij56yb6Zeq54Gv77yI6auY5aOw5a+76L2m77yJIixjdXNoaW9uOiLmiZPlvIDlnZDlnqvvvIjlnZDlnqvkvJrlvLnotbfvvIkiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTtjb25zdCBuYW1lPW5hbWVzW2FjdGlvbl18fGFjdGlvbjtjb25maXJtRGlhbG9nKCLnoa7orqTmiafooYwgIituYW1lLCLor6XmjIfku6TkvJrpgJrov4cgNEcg572R57uc55yf5a6e5o6n5Yi25L2g55qE6L2m6L6G77yaIitlc2MoYS51c2VyTmFtZSkrIuOAgiIsJ2RvQ3RybCgnK2lkeCsiLCciK2FjdGlvbisiJykiKX0KZnVuY3Rpb24gc2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbil7CiAgX19yaXNrUGVuZGluZz17aWR4OmlkeCxhY3Rpb246YWN0aW9ufTsKICBjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7CiAgbGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+6L2m5o6n5Yqf6IO96aOO6Zmp5ZGK55+lPC9kaXY+PGRpdiBjbGFzcz0iY2QiPuWvu+i9piAvIOm4o+esmyAvIOWdkOWeqyAvIOW8gOmUgSAvIOWFs+mUgeetieaMh+S7pOe7jyA0RyDkupHnq6/kuIvlj5HvvIzkvJo8Yj7nnJ/lrp7mk43kvZzkvaDnmoTovabovoY8L2I+44CC5Y+X572R57uc5bu26L+f44CB5L+h5Y+3562J5b2x5ZON77yM5oyH5Luk5Y+v6IO95bu26L+f44CB5aSx6LSl77yM5p6B56uv5oOF5Ya15LiL6L2m6L6G5Y+v6IO95oSP5aSW5Yqo5L2c77yI5aaC6K+v5byA6ZSB77yJ44CC5L2/55So6L2m5o6n5Yqf6IO95Y2z6KeG5Li65L2g5bey5YWF5YiG55+l5oKJ5bm26Ieq5oS/5om/5ouF5LiK6L+w6aOO6Zmp77yM55Sx5q2k5Lqn55Sf55qE5LiA5YiH5ZCO5p6c55Sx5L2g6Ieq6KGM5om/5ouF44CCPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJyaXNrRGVjbGluZSgpIj7miJHkuI3lkIzmhI/po47pmankuI3kvb/nlKg8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9InJpc2tBZ3JlZSgpIj7miJHlkIzmhI/po47pmanlubbkvb/nlKg8L2J1dHRvbj48L2Rpdj48L2Rpdj4nOwogIGxheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpOwp9CmZ1bmN0aW9uIHJpc2tBZ3JlZSgpe2Nsb3NlQ29uZmlybSgpO2NvbnN0IGM9Z2V0Q2ZnKCk7Yy52ZWhpY2xlQ29udHJvbFJpc2s9IuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqCI7QmFja2VuZC5zYXZlQ29uZmlnKGMpLnRoZW4oZnVuY3Rpb24ob2spe2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKWFwcGx5UmVtb3RlQ2ZnKGMpO2Vsc2Ugc2F2ZUNmZyhjKTt0b2FzdCgi5bey5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95bey5ZCv55SoIiwib2siKTtpZihfX3Jpc2tQZW5kaW5nKXtjb25zdCBwPV9fcmlza1BlbmRpbmc7X19yaXNrUGVuZGluZz1udWxsO2N0cmxDb25maXJtKHAuaWR4LHAuYWN0aW9uKX19ZWxzZXt0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7X19yaXNrUGVuZGluZz1udWxsfX0pfQpmdW5jdGlvbiByaXNrRGVjbGluZSgpe2Nsb3NlQ29uZmlybSgpO19fcmlza1BlbmRpbmc9bnVsbDt0b2FzdCgi5bey6YCJ5oup5LiN5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95LiN5ZCv55SoIiwiaW5mbyIpfQphc3luYyBmdW5jdGlvbiBkb0N0cmwoaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgYnRuPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jdHJsLWJ0bltkYXRhLWFjdD0iJythY3Rpb24rJyJdJyk7Y29uc3Qgb2xkPWJ0bj9idG4uaW5uZXJIVE1MOiIiO2lmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4uaW5uZXJIVE1MPUkuY2xvY2t9dG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTtjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUN0cmwoYS51c2VySWQsYWN0aW9uKTtpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5pbm5lckhUTUw9b2xkfWlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IuaMh+S7pOW3suS4i+WPkSIsIm9rIil9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuaMh+S7pOWksei0pSIsImVyciIpfX0KCi8qID09PT09PT09PT09PT09PT09IOaXpeW/l+mhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9nRmlsdGVyPSJhbGwiOwphc3luYyBmdW5jdGlvbiByZW5kZXJMb2dzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VMb2dzIik7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua3YrJ+i/kOihjOaXpeW/lzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImxvZy1wYW5lbCI+PGRpdiBjbGFzcz0ibG9nLWhlYWQiPjxoMz4nK0kua3YrJzxzcGFuPuacgOi/kSA1MCDmnaE8L3NwYW4+PC9oMz48ZGl2IGNsYXNzPSJsb2ctZmlsdGVycyI+JysKICBbJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09ImFsbCI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnYWxsXCcpIj7lhajpg6g8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJzaWduaW4iPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3NpZ25pblwnKSI+562+5YiwPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0idmVoaWNsZSI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwndmVoaWNsZVwnKSI+5o6n6L2mPC9idXR0b24+J10uam9pbigiIikrCiAgJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImxvZy1saXN0IiBpZD0ibG9nTGlzdCI+PGRpdiBzdHlsZT0icGFkZGluZzo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpIj7liqDovb3kuK3igKY8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBzdHlsZT0iZmxleDoxIiBvbmNsaWNrPSJjbGVhckxvZ3NVSSgpIj7muIXnqbrml6Xlv5c8L2J1dHRvbj48L2Rpdj4nOwogIGNvbnN0IGxvZ3M9bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MD9ERU1PX0xPR1M6YXdhaXQgQmFja2VuZC5nZXRMb2dzKCk7cmVuZGVyTG9nTGlzdChsb2dzKTsKfQpmdW5jdGlvbiBzZXRMb2dGaWx0ZXIoZil7bG9nRmlsdGVyPWY7cmVuZGVyTG9ncygpfQpmdW5jdGlvbiByZW5kZXJMb2dMaXN0KGxvZ3Mpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJsb2dMaXN0Iik7aWYoIWVsKXJldHVybjtjb25zdCBsaXN0PShsb2dzfHxbXSkuZmlsdGVyKGw9Pntjb25zdCB0PWwudHlwZXx8InNpZ25pbiI7aWYobG9nRmlsdGVyPT09ImFsbCIpcmV0dXJuIHRydWU7cmV0dXJuIHQ9PT1sb2dGaWx0ZXJ9KTtpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ibG9nLWVtcHR5Ij4nK0kud2FybisnPGJyPuivpeWIhuexu+S4i+aaguaXoOaXpeW/lzwvZGl2Pic7cmV0dXJufWVsLmlubmVySFRNTD1saXN0Lm1hcCgobG9nLGkpPT57Y29uc3QgdD1sb2cudHlwZXx8InNpZ25pbiI7Y29uc3QgdGFnPXQ9PT0idmVoaWNsZSI/JzxzcGFuIGNsYXNzPSJwaWxsIGFtYmVyIj7mjqfovaY8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgY3lhbiI+562+5YiwPC9zcGFuPic7bGV0IHJlcztpZih0PT09InZlaGljbGUiKXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuYWN0aW9uVGV4dHx8Iui9pui+huaOp+WItiIpKycgJysobG9nLnN1Y2Nlc3M/IuaIkOWKnyI6IuWksei0pe+8miIrZXNjKGxvZy5tZXNzYWdlfHxsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWVsc2V7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLnN1Y2Nlc3M/IuaIkOWKnyArIitsb2cudG90YWxHYWluOiLlpLHotKU6ICIrKGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9Y29uc3Qgc3RlcHM9bG9nLnN0ZXBzPyhsb2cuc3RlcHMubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSk6IiI7cmV0dXJuICc8ZGl2IGNsYXNzPSJsb2ctaXRlbSIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpKjI1KSsnbXMiPjxkaXYgY2xhc3M9ImxvZy10aW1lIj4nK2VzYyhsb2cudGltZXx8IiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbWFpbiI+Jyt0YWcrJzxzcGFuIGNsYXNzPSJsb2ctdXNlciI+Jytlc2MobG9nLnVzZXJOYW1lfHwiIikrJzwvc3Bhbj4nK3JlcysnPC9kaXY+Jysoc3RlcHM/JzxkaXYgY2xhc3M9ImxvZy1zdGVwcyI+JytzdGVwcysnPC9kaXY+JzoiIikrJzwvZGl2Pid9KS5qb2luKCIiKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzVUkoKXtjb25maXJtRGlhbG9nKCLmuIXnqbrml6Xlv5ciLCLlsIbliKDpmaTlhajpg6jov5DooYzml6Xlv5fvvIzmraTmk43kvZzkuI3lj6/mgaLlpI3jgIIiLCJjbGVhckxvZ3NOb3ciKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzTm93KCl7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5jbGVhckxvZ3MoKTtpZihvayl7dG9hc3QoIuaXpeW/l+W3sua4heepuiIsIm9rIik7cmVuZGVyTG9ncygpfWVsc2UgdG9hc3QoIua4heepuuWksei0pSIsImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g6K6+572u6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBjZmdBY2NvdW50cz1bXTsKLyogPT09PT09PT09PT09PT09PT0gdjIuMTUuNiDova/ku7bniYjmnKzmo4DmtYsgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gY2hlY2tWZXJzaW9uKG1hbnVhbCl7CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2ZXJDaGVja0J0biIpOwogIGlmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLmo4DmtYvkuK3igKYifQogIGxldCBkPW51bGw7CiAgaWYoaXNEZW1vKCkpe2Q9e29rOnRydWUsZGVtbzp0cnVlLGN1cnJlbnQ6QVBQX1ZFUlNJT04ucmVwbGFjZSgvXnYvLCIiKSxoYXNVcGRhdGU6ZmFsc2UsbGF0ZXN0OntzY3JpcHQ6QVBQX1ZFUlNJT04ucmVwbGFjZSgvXnYvLCIiKX19fQogIGVsc2V7ZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL3ZlcnNpb24tY2hlY2siKyhtYW51YWw/Ij9mcmVzaD0xIjoiIikpO30KICBTVEFURS52ZXI9ZHx8bnVsbDsKICBpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuajgOafpeabtOaWsCJ9CiAgY29uc3QgZXg9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZlckV4dHJhIik7aWYoZXgpZXguaW5uZXJIVE1MPXZlckV4dHJhSHRtbCgpOwogIGlmKFNUQVRFLnZlciYmU1RBVEUudmVyLm9rJiZTVEFURS52ZXIuaGFzVXBkYXRlJiYhU1RBVEUudmVyLmRlbW8pewogICAgdG9hc3QoIuWPkeeOsOaWsOeJiOacrCB2IitTVEFURS52ZXIubGF0ZXN0LnNjcmlwdCsi77yI5b2T5YmNIHYiK1NUQVRFLnZlci5jdXJyZW50KyLvvInvvIzlj6/liLDjgIzorr7nva7jgI3mn6XnnIvmm7TmlrDmlrnlvI8iKTsKICB9ZWxzZSBpZihtYW51YWwpewogICAgdG9hc3QoU1RBVEUudmVyJiZTVEFURS52ZXIub2s/IuW3suaYr+acgOaWsOeJiOacrCB2IitTVEFURS52ZXIuY3VycmVudDooKFNUQVRFLnZlciYmU1RBVEUudmVyLmVycm9yKXx8IuajgOa1i+Wksei0pSIpLFNUQVRFLnZlciYmU1RBVEUudmVyLm9rPyJvayI6ImVyciIpOwogIH0KfQpmdW5jdGlvbiB2ZXJFeHRyYUh0bWwoKXsKICBjb25zdCB2PVNUQVRFLnZlcjsKICBpZighdilyZXR1cm4gJ+eCueOAjOajgOafpeabtOaWsOOAjeiOt+WPluacgOaWsOeJiOacrOS4juWQhOerr+aOqOiNkOeJiOacrCc7CiAgaWYoIXYub2spcmV0dXJuICfmo4DmtYvlpLHotKXvvJonK2VzYyh2LmVycm9yfHwi5pyq55+l6ZSZ6K+vIik7CiAgY29uc3QgTD12LmxhdGVzdHx8e307CiAgaWYoIXYuaGFzVXBkYXRlKXJldHVybiAn5bey5piv5pyA5paw54mI5pysIMK3IOiEmuacrCB2Jytlc2Modi5jdXJyZW50KSsodi5jYWNoZWQ/J++8iOacrOWcsOe8k+WtmO+8iSc6JycpOwogIHJldHVybiAnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXdhcm4pO2ZvbnQtd2VpZ2h0OjYwMCI+5Y+R546w5paw54mI5pys77ya6ISa5pysIHYnK2VzYyhMLnNjcmlwdHx8IiIpKyfvvIjlvZPliY0gdicrZXNjKHYuY3VycmVudCkrJ++8iTwvc3Bhbj4nKwogICc8YnI+5o6o6I2Q54mI5pys77yaaU9TIEFwcCAnK2VzYyhMLmlvc3x8Ii0iKSsnIMK3IFdpbmRvd3MgJytlc2MoTC5wY3x8Ii0iKSsnIMK3IEFuZHJvaWQgJytlc2MoTC5hbmRyb2lkfHwiLSIpKwogIChMLm5vdGU/Jzxicj7mm7TmlrDlhoXlrrnvvJonK2VzYyhMLm5vdGUpOicnKSsKICAnPGJyPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQyKSI+5pu05paw5pa55byPPC9iPu+8mkxvb24gLyBTaGFkb3dyb2NrZXQgLyBTdXJnZSDmm7TmlrDmqKHlnZforqLpmIXljbPlj6/mi4nlj5bmnIDmlrDohJrmnKzvvJtpT1MgQXBw77yIVHJvbGxTdG9yZe+8ieS4jiBXaW5kb3dzIC8gQW5kcm9pZCDnq6/or7fph43mlrDkuIvovb3lr7nlupTlronoo4XljIXjgIInOwp9CmZ1bmN0aW9uIHJlbmRlckNmZygpewogIGlmKGlzUHJveHlNb2RlKCkmJmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik8MCYmIVNUQVRFLnBhbmVsTG9hZGVkKXsKICAgIGNvbnN0IGVsMD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogICAgaWYoZWwwKWVsMC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CGPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5q2j5Zyo5LuO6ISa5pys5ZCO56uv5ZCM5q2l6LSm5Y+35LiO6YWN572u4oCmPC9kaXY+PC9kaXY+JzsKICAgIGVuc3VyZVBhbmVsRGF0YSgpLnRoZW4oKCk9PnJlbmRlckNmZygpKTsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2ZnPWdldENmZygpO2NmZ0FjY291bnRzPShpc1Byb3h5TW9kZSgpJiZTVEFURS5wYW5lbEFjY291bnRzP1NUQVRFLnBhbmVsQWNjb3VudHM6Z2V0QWNjb3VudHMoKSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjpjbGVhblRva2VuKGEudG9rZW58fCIiKSxiYXJrS2V5OmEuYmFya0tleXx8IiJ9KSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICBjb25zdCBhY2NSb3dzPWNmZ0FjY291bnRzLm1hcCgoYSxpZHgpPT4nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VyTmFtZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VySWQpKyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW7vvIjnspjotLTljbPlj6/vvIzoh6rliqjljrvmjokgQmVhcmVyIOWJjee8gO+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudG9rZW4pKyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIznrb7liLDmiJDlip/mjqjpgIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEuYmFya0tleSkrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogIGNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eTsKICBjb25zdCBzdz0oaWQsbGFiZWwsc3ViLGNoZWNrZWQpPT4nPGxhYmVsIGNsYXNzPSJzd2l0Y2giPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9IicraWQrJyIgJysoY2hlY2tlZD8iY2hlY2tlZCI6IiIpKyc+PHNwYW4gY2xhc3M9InN3Ij48L3NwYW4+PHNwYW4gY2xhc3M9ImxibCI+JytsYWJlbCsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzYyI+JytzdWIrJzwvc3Bhbj48L2xhYmVsPic7CiAgZWwuaW5uZXJIVE1MPQogICc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua2V5Kyforr7nva48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7miYvmnLrlj7fnmbvlvZU8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwonPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5omL5py65Y+377yI5p6B5qC4IEFwcCDnu5Hlrprlj7fnoIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZWwiIGlkPSJwbF9waG9uZSIgcGxhY2Vob2xkZXI9IjExIOS9jeaJi+acuuWPtyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGxfY29kZSIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzwvZGl2PicrCic8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNlbmRTbXNDb2RlKCkiIGlkPSJwbF9zZW5kX2J0biI+6I635Y+W6aqM6K+B56CBPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InBob25lTG9naW5VSSgpIiBpZD0icGxfbG9naW5fYnRuIj7nmbvlvZXlubbmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+55So5omL5py65Y+3ICsg55+t5L+h6aqM6K+B56CB55m75b2V77yM6Ieq5Yqo6I635Y+WIFRva2VuIOS4jueUqOaIt0lE5bm25Yqg5YWl6LSm5Y+35YiX6KGo77yM55m75b2V5oiQ5Yqf5ZCO6Ieq5Yqo5L+d5a2Y5bm25Yi35paw6aG16Z2i44CCPGJyPsK3IOWwj+WPt+eZu+W9le+8muWPr+WkmuasoeeZu+W9leS4jeWQjOaJi+acuuWPt++8jOaMieWwj+WPt+mAkOS4qua3u+WKoOS4jueuoeeQhuOAgjxicj7CtyDmnI3liqHliLDmnJ8gLyDnu5Hlrprnu63otLnvvJrovabovobmmbrog73mnI3liqHliLDmnJ/jgIHmiJbpnIDopoHnu5Hlrprnu63otLnml7bvvIzph43mlrDnlKjmiYvmnLrlj7fnmbvlvZXljbPlj6/liLfmlrDmjojmnYPvvIzlhajnqIvml6DpnIDmipPljIXjgII8L2Rpdj4nKwonPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7lrprml7bnrb7liLA8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogIHN3KCJhdXRvX3NpZ25pbiIsIuWumuaXtuetvuWIsCIsIuWIsOeCueiHquWKqOS4uuWFqOmDqOi0puWPt+etvuWIsCIsY2ZnLmF1dG9TaWduaW49PT10cnVlKSsKICBzdygidmVoaWNsZV9tb25pdG9yIiwi6L2m6L6G54q25oCB55uR5o6nIiwi5YWF5ruhL+emu+e6v+aXtuacrOWcsOmAmuefpeaPkOmGku+8iOaJk+W8gOmdouadv+aXtuajgOafpe+8iSIsY2ZnLnZlaGljbGVNb25pdG9yPT09dHJ1ZSkrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPuetvuWIsOaXtumXtO+8iOavj+Wkqe+8jEhIOk1N77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGltZSIgaWQ9ImNmZ19zaWduaW5fdGltZSIgdmFsdWU9IicrZXNjKGNmZy5hdXRvU2lnbmluVGltZXx8IjA3OjAwIikrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuS7o+eQhuiEmuacrOaXoOW4uOmpu+WQjuWPsO+8jOmHh+eUqOOAjOaJk+W8gOihpeetvuOAjeacuuWItu+8muW8gOWQr+WQju+8jOavj+WkqemmluasoeaJk+W8gOmdouadv+S4lOW3sui/h+iuvuWumuaXtumXtOaXtu+8jOiHquWKqOS4uuWFqOmDqOi0puWPt+aJp+ihjOS4gOasoeetvuWIsO+8iOWGmeaXpeW/l+OAgeaOqCBCYXJr77yM5LiO5omL5Yqo562+5Yiw5LiA6Ie077yJ77yM5ZCM5LiA5aSp5Y+q5omn6KGM5LiA5qyh44CC6aaW6aG144CM56uL5Y2z562+5Yiw44CN5oKs5rWu5oyJ6ZKu5Y+v6ZqP5pe25omL5Yqo5omn6KGM44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7npL7ljLrku7vliqHlvIDlhbM8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij48ZGl2IGNsYXNzPSJmb3JtLWdyaWQiIHN0eWxlPSJnYXA6OHB4Ij4nKwogIHN3KCJjb21tX3Bvc3QiLCLlj5HluIPliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKStzdygiY29tbV9saWtlIiwi54K56LWe5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZUxpa2UhPT1mYWxzZSkrc3coImNvbW1fY29tbWVudCIsIuivhOiuuuWKqOaAgSIsIuS4jeWKoOWIhiIsY29tbS5lbmFibGVDb21tZW50IT09ZmFsc2UpK3N3KCJjb21tX3NoYXJlIiwi5YiG5Lqr5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVNoYXJlIT09ZmFsc2UpK3N3KCJjb21tX2RlbGV0ZSIsIuaJp+ihjOWQjuWIoOmZpOWKqOaAgSIsIua4heeQhueXlei/uSIsY29tbS5lbmFibGVEZWxldGUhPT1mYWxzZSkrCiAgJzwvZGl2PjxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWFs+mXreWvueW6lOW8gOWFs+WQju+8jOetvuWIsOiEmuacrOWwhui3s+i/h+ivpeS7u+WKoeOAguS/ruaUueWQjueCueWHu+mhtemdouW6lemDqOOAjOS/neWtmOmFjee9ruOAjeeUn+aViOOAgjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CG77yIJytjZmdBY2NvdW50cy5sZW5ndGgrJyDkuKrvvIk8L2gzPjxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJhZGRBY2NvdW50VUkoKSI+KyDmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgaWQ9ImFjY0xpc3QiPicrKGFjY1Jvd3N8fCc8ZGl2IHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjIycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHgiPuaaguaXoOi0puWPt++8jOeCueWHu+OAjOa3u+WKoOi0puWPt+OAjTwvZGl2PicpKyc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmctdG9wOjAiPjxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlQWNjb3VudHNVSSgpIj7kv53lrZjmnoHmoLjotKblj7c8L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctbm90ZSI+PGI+5L2/55So6K+05piOPC9iPjxicj7CtyBUb2tlbu+8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIOWAvOWNs+WPr++8jOiHquWKqOWOu+aOiSA8Y29kZT5CZWFyZXIgPC9jb2RlPiDliY3nvIDjgII8YnI+wrcg6I635Y+WSUTvvJrloavlhaUgVG9rZW4g5ZCO54K544CM6I635Y+WSUTjgI3vvIzoh6rliqjku44gSDUgYmFzZUluZm8gLyBBcHAgc2V0dGluZyAvIOi9pui+huWIl+ihqOaOpeWPo+ino+aekOeUqOaIt0lE5LiO5pi156ew44CCPGJyPsK3IEJhcmsgS2V577ya6K+l6LSm5Y+3562+5Yiw5oiQ5Yqf5ZCO5o6o6YCB6YCa55+l77yM55WZ56m65LiN5o6o44CCPGJyPsK3IOaOp+i9puaMh+S7pO+8iOWvu+i9pi/puKPnrJsv5Z2Q5Z6rL+W8gOWFs+mUge+8ieS8muecn+WunuaTjeS9nOi9pui+hu+8jOmcgOS6jOasoeehruiupOOAgjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5aSH5Lu96LSm5Y+36YWN572uPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9ImV4cG9ydEJhY2t1cFVJKCkiPuS4gOmUruWvvOWHuuWkh+S7vTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0iY29weUJhY2t1cFVJKCkiPuWkjeWItuWkh+S7vTwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPuWkh+S7veWGheWuue+8iOWMheWQq+WFqOmDqOi0puWPt+S4jumdouadv+mFjee9ru+8jOWPr+WkjeWItuS/neWtmO+8iTwvbGFiZWw+PHRleHRhcmVhIGlkPSJiYWNrdXBBcmVhIiByb3dzPSI0IiByZWFkb25seSBwbGFjZWhvbGRlcj0i54K55Ye744CM5LiA6ZSu5a+85Ye65aSH5Lu944CN55Sf5oiQ4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5oGi5aSN5aSH5Lu977yI57KY6LS05aSH5Lu9IEpTT04g5ZCO54K55oGi5aSN77yM5bCG6KaG55uW546w5pyJ6LSm5Y+35LiO6YWN572u77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImltcG9ydEFyZWEiIHJvd3M9IjQiIHBsYWNlaG9sZGVyPSLnspjotLTlpIfku70gSlNPTuKApiIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48L3RleHRhcmVhPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBkYW5nZXIiIG9uY2xpY2s9ImltcG9ydEJhY2t1cFVJKCkiPuaBouWkjeWkh+S7vTwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWkh+S7veWMheWQq+WFqOmDqOi0puWPt++8iOaYteensC/nlKjmiLdJRC9Ub2tlbi9CYXJrS2V577yJ5LiO6Z2i5p2/6YWN572u77yI562+5ZCN5a+G6ZKlL+ekvuWMuuS7u+WKoeW8gOWFsy/oh6rliqjliLfmlrDnrYnvvInjgILmjaLmnLrmiJbph43oo4XlkI7nspjotLTljbPlj6/kuIDplK7ov5jljp/vvIzml6DpnIDph43mlrDmipPljIXloavlhpnjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7lsI/nu4Tku7bmmL7npLrovabovoY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7otKblj7c8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF9hY2MiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6MTBweCAxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjE0cHgiIG9uY2hhbmdlPSJ3aWRnZXRBY2NDaGFuZ2VkKCkiPicrd2lkZ2V0QWNjT3B0aW9ucygpKyAnPC9zZWxlY3Q+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+6L2m6L6GPC9sYWJlbD48c2VsZWN0IGlkPSJ3aWRnZXRfdmVoIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4Ij48L3NlbGVjdD48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7pgInmi6nlkI7vvIxpT1Mg5qGM6Z2i5bCP57uE5Lu25bCG5bGV56S66K+l6L2m6L6G55qE5a6e5pe254q25oCB77yI55S16YePL+e7reiIqi/lhYXnlLUv562+5Yiw77yJ44CCPGI+5LiN6YCJ5oup5pe26buY6K6k5Y+W56ys5LiA5Liq6LSm5Y+355qE56ys5LiA6L6G6L2m44CCPC9iPuS/neWtmOmFjee9ruWQjueUn+aViOOAgjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIj48L3NwYW4+6L2m6L6G5Zu+54mH5pu/5o2iPC9oMz48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9ImxvYWRQaWNSb3dzKCkiPuWIt+aWsOi9pui+hjwvYnV0dG9uPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5IiBpZD0icGljTGlzdCI+PGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxOHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7liqDovb3kuK3igKY8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmctdG9wOjAiPjxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlUGljQ2ZnKCkiPuS/neWtmOWbvueJh+abv+aNojwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuS4uuavj+i+hui9pumAieaLqeWumOaWuei9puWei+Wbvu+8iOWQqyA8Yj5BRTVpIOeUtei9u+aRqeeJiDwvYj7lm5vnp43phY3oibLvvInjgILkv53lrZjlkI7lnKggPGI+TG9vbi/ku6PnkIbohJrmnKznjq/looM8L2I+5LiL77yM5a6Y5pa5IEFwcCDkuI7pnaLmnb/ph4znmoTor6XovabovobnhafniYfljbPooqvmm7/mjaLvvIjpnIDpnaLmnb/ohJrmnKzlpITkuo7ov5DooYznirbmgIHvvInvvJvpgInjgIzkuI3mm7/mjaLjgI3mgaLlpI3lrpjmlrnljp/lm77jgILmtY/op4jlmajnm7TlvIDmqKHlvI/ku4Xkv53lrZjphY3nva7jgIHkuI3mlLnlhpkgQXBw44CCPC9kaXY+PC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7oh6rlrprkuYnog4zmma88L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7kuIrkvKDog4zmma/nhafniYfvvIjkvJrpk7rlnKjmt7HoibLlupXoibLkuYvkuIrvvIzlu7rorq7mt7HoibIv5L2O5Lqu5bqm5Zu+54mH5Lul5L+d6K+B5paH5a2X5Y+v6K+777yJPC9sYWJlbD48aW5wdXQgdHlwZT0iZmlsZSIgaWQ9ImJnX2ZpbGUiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4IiBvbmNoYW5nZT0iYmdGaWxlQ2hhbmdlZCh0aGlzKSI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4O2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2FsaWduLWl0ZW1zOmNlbnRlciI+PGRpdiBpZD0iYmdQcmV2aWV3IiBzdHlsZT0id2lkdGg6MTIwcHg7aGVpZ2h0OjcycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7YmFja2dyb3VuZC1zaXplOmNvdmVyO2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtvdmVyZmxvdzpoaWRkZW4iPuacqumAieaLqTwvZGl2PjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjhweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9ImFwcGx5QmdVcGxvYWQoKSIgaWQ9ImJnX2FwcGx5X2J0biI+5bqU55So6IOM5pmvPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJyZXNldEJnKCkiPuaBouWkjem7mOiupDwvYnV0dG9uPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWbvueJh+S7pSBiYXNlNjQg5a2Y5YWl6YWN572u77yM6ZqP5aSH5Lu95LiA5bm25a+85Ye644CC5YiH5o2i6IOM5pmv5a6e5pe255Sf5pWI77yM5peg6ZyA6YeN5ZCv44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAvLyB2Mi4xNC4yMSDliKDpmaTjgIzovabmjqfpo47pmannoa7orqTjgI3pnaLmnb/vvJrmlLnkuLrpppbmrKHkvb/nlKjovabmjqflip/og73ml7blvLnnqpfnoa7orqTvvIjlkIzmhI8v5LiN5ZCM5oSP77yJCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5b2T5YmN5a6J6KOF5L+h5oGvPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuOTtjb2xvcjp2YXIoLS10eHQyKSIgaWQ9Imluc3RhbGxJbmZvIj4nKwogICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5q2j5Zyo5qOA5rWL5a6J6KOF5pa55byP4oCmPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbjoxNHB4IDJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVDZmdVSSgpIj7kv53lrZjphY3nva48L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InJlc2V0Q2ZnVUkoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmc6NHB4IDAiPicrCiAgJzxhIGhyZWY9Im1haWx0bzptbGluazc5OEBvdXRsb29rLmNvbSIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7inInvuI88L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+bWxpbms3OThAb3V0bG9vay5jb208L3NwYW4+PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGEgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7irZA8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+R2l0SHViIOS7k+W6kzwvc3Bhbj48L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDMpIj5jbHVjazc5OC9aRUVITzwvc3Bhbj48L2E+JysKICAnPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjowIDE2cHgiPjwvZGl2PicrCiAgJzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHgiPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE2cHgiPvCfk4s8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMDtjb2xvcjp2YXIoLS10eHQyKSI+54mI5pysIC8g5pu05paw5qOA5rWLPC9zcGFuPjwvc3Bhbj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4Ij48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0MykiPicrQVBQX1ZFUlNJT04rJzwvc3Bhbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ2ZXJDaGVja0J0biIgb25jbGljaz0iY2hlY2tWZXJzaW9uKHRydWUpIj7mo4Dmn6Xmm7TmlrA8L2J1dHRvbj48L3NwYW4+PC9kaXY+JysKICAnPGRpdiBpZD0idmVyRXh0cmEiIHN0eWxlPSJwYWRkaW5nOjAgMTZweCAxMnB4O2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuNzU7Y29sb3I6dmFyKC0tdHh0MykiPicrdmVyRXh0cmFIdG1sKCkrJzwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImZvb3QiPuaegeaguCBaRUVITyDpnaLmnb8gJytBUFBfVkVSU0lPTisnIMK3ICcrKGlzUHJveHlNb2RlKCk/J+i0puWPt+S4juWvhumSpeWtmOWCqOS6juiEmuacrOWQjuerr++8iOacrOacuuaMgeS5heWMlu+8iSc6J+aVsOaNruWtmOWCqOS6juacrOacuua1j+iniOWZqCBsb2NhbFN0b3JhZ2UnKSsnPGJyPjxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtSDCtyBhZmRpYW4uY29tL2EvbHVja3k3OTg8L2E+PC9kaXY+JzsKICAvLyDlsI/nu4Tku7bovabovobkuIvmi4nliJ3lp4vljJbvvIjlm57loavlt7Lkv53lrZjnmoTpgInmi6nvvIkKICBjb25zdCB3c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfYWNjIik7CiAgaWYod3NlbCl7CiAgICBjb25zdCBjdXI9Z2V0Q2ZnKCkud2lkZ2V0VmVoaWNsZTtsZXQgY3VyVWlkPSIiLGN1clZpbj0iIjsKICAgIGlmKGN1cil7Y29uc3QgcD1jdXIuc3BsaXQoInwiKTtjdXJVaWQ9cFswXXx8IiI7Y3VyVmluPXBbMV18fCIiO30KICAgIGlmKGN1clVpZCl3c2VsLnZhbHVlPWN1clVpZDsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPXdpZGdldFZlaE9wdGlvbnMod3NlbC52YWx1ZXx8IiIpOwogICAgaWYoY3VyVmluKXtjb25zdCB2c2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfdmVoIik7Zm9yKGxldCBpPTA7aTx2c2VsLm9wdGlvbnMubGVuZ3RoO2krKyl7aWYodnNlbC5vcHRpb25zW2ldLnZhbHVlPT09Y3VyVmluKXt2c2VsLnNlbGVjdGVkSW5kZXg9aTticmVha319fQogIH0KICAvLyDog4zmma/pooTop4jlm57loasKICBjb25zdCBicD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmdQcmV2aWV3Iik7CiAgaWYoYnApe2NvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnO2lmKGJnKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjticC50ZXh0Q29udGVudD0iIjt9fQogIGxvYWRQaWNDZmcoKTsKICByZW5kZXJJbnN0YWxsSW5mbygpOwp9Ci8qID09PT09PT09PT09PT09PT09IOW9k+WJjeWuieijheS/oeaBryA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBpbnN0YWxsRW52TmFtZSgpewogIGlmKGlzRGVtbygpKXJldHVybiAi5ryU56S65qih5byP77yI56S65L6L5pWw5o2u77yJIjsKICBjb25zdCBwPSh0eXBlb2YgbG9jYXRpb24hPT0idW5kZWZpbmVkIiYmbG9jYXRpb24ucHJvdG9jb2wpfHwiIjsKICBpZihwPT09InplZWhvOiIpcmV0dXJuICJpT1MgQXBw77yI5p6B5qC4562+5Yiw6Z2i5p2/77yJIjsKICBpZih0eXBlb2YgbmF2aWdhdG9yIT09InVuZGVmaW5lZCImJi9FbGVjdHJvbi9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudHx8IiIpKXJldHVybiAi5qGM6Z2i54mI77yIV2luZG93c++8iSI7CiAgaWYoaXNQcm94eU1vZGUoKSlyZXR1cm4gIuS7o+eQhuiEmuacrCI7CiAgcmV0dXJuICLmtY/op4jlmagiOwp9CmFzeW5jIGZ1bmN0aW9uIHJlbmRlckluc3RhbGxJbmZvKCl7CiAgY29uc3QgYm94PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbnN0YWxsSW5mbyIpOwogIGxldCBodG1sPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjhweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPui/kOihjOeOr+Wig++8mjwvYj4nK2luc3RhbGxFbnZOYW1lKCkrJzwvZGl2Pic7CiAgLy8g5Y6f55Sf5qGl5o6l6Ieq5qOA77ya6KGM6L2m6K6w5b2V5Luq5qGl55Sx5Y6f55Sf5rOo5YWl77yM57y65aSx5pe25a+55bqU5Yqf6IO95LiN5Y+v55SoCiAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206OHB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+5Y6f55Sf5qGl5o6l77yaPC9iPuiusOW9leS7qiAnKygodHlwZW9mIGRhc2hjYW1IYW5kbGVyPT09ImZ1bmN0aW9uIik/J+KckyDlj6/nlKgnOifinJcg5pyq5rOo5YWlJykrJzwvZGl2Pic7CiAgbGV0IGluZm89bnVsbDsKICB0cnl7aW5mbz1hd2FpdCBCYWNrZW5kLmluc3RhbGxJbmZvKCk7fWNhdGNoKGUpe2luZm89bnVsbH0KICBpZighaW5mb3x8IWluZm8uaW9zKXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+562+5ZCN5pa55byP5LuF5pSv5oyBIGlPUyBBcHAg5YaF5p+l55yL77yI6K+75Y+W5b2T5YmN5a6J6KOF5YyF55qE562+5ZCN5o+P6L+w5paH5Lu277yJ44CCPC9kaXY+JzsKICB9IGVsc2UgewogICAgY29uc3QgbT1pbmZvLnNpZ25NZXRob2R8fCJ1bmtub3duIjsKICAgIGNvbnN0IGxhYmVsPXt0cm9sbHN0b3JlOiLlt6jprZQgVHJvbGxTdG9yZe+8iOawuOS5heetvuWQje+8iSIsZW50ZXJwcmlzZToi5LyB5Lia562+5ZCN77yI5YiG5Y+R77yJIixzaWRlbG9hZDoi5Liq5Lq66Ieq562+77yINyDlpKnmnInmlYjmnJ/vvIkiLGRldmVsb3Blcjoi5byA5Y+R6ICFIC8gVGVzdEZsaWdodO+8iOmVv+acn++8iSIsdW5rbm93bjoi5peg5rOV56Gu5a6aIn1bbV18fCLml6Dms5Xnoa7lrpoiOwogICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+5a6J6KOF5pa55byP77yaPC9iPicrbGFiZWwrJzwvZGl2Pic7CiAgICBpZihpbmZvLmV4cGlyYXRpb24pewogICAgICBsZXQgZXh0cmE9IiI7CiAgICAgIGlmKHR5cGVvZiBpbmZvLmRheXNSZW1haW49PT0ibnVtYmVyIiYmaXNGaW5pdGUoaW5mby5kYXlzUmVtYWluKSYmaW5mby5kYXlzUmVtYWluPj0wKWV4dHJhPSfvvIjliankvZnnuqYgJytpbmZvLmRheXNSZW1haW4rJyDlpKnvvIknOwogICAgICBodG1sKz0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo2cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7nrb7lkI3mnInmlYjmnJ/oh7PvvJo8L2I+Jytlc2MoU3RyaW5nKGluZm8uZXhwaXJhdGlvbikucmVwbGFjZSgiVCIsIiAiKS5yZXBsYWNlKCJaIiwiIikpKycgJytleHRyYSsnPC9kaXY+JzsKICAgIH0KICAgIGlmKGluZm8udGVhbU5hbWV8fGluZm8udGVhbUlkKXsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+562+5ZCN5Zui6Zif77yaPC9iPicrZXNjKGluZm8udGVhbU5hbWV8fGluZm8udGVhbUlkKSsnPC9kaXY+JzsKICAgIH0KICAgIGlmKG09PT0ic2lkZWxvYWQiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7kuKrkurroh6rnrb4gNyDlpKnliLDmnJ/lkI7vvIzpnIDov57mjqXnlLXohJHnlKggQWx0U3RvcmUgLyBTaWRlbG9hZGx5IOmHjeaWsOetvuWQje+8m+W7uuiuruaUueeUqOW3qOmtlCBUcm9sbFN0b3JlIOawuOS5heetvuWQjeOAgjwvZGl2Pic7fQogICAgZWxzZSBpZihtPT09ImVudGVycHJpc2UiKXtodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij7lpoLpgYfjgIzmnKrlj5fkv6Hku7vnmoTlvIDlj5HogIXjgI3vvIzor7flnKgg6K6+572uIOKGkiDpgJrnlKgg4oaSIFZQTuS4juiuvuWkh+euoeeQhiDkv6Hku7vlr7nlupTkvIHkuJror4HkuabjgII8L2Rpdj4nO30KICAgIGVsc2UgaWYobT09PSJ0cm9sbHN0b3JlIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5bey6YCa6L+HIFRyb2xsU3RvcmUg5a6J6KOF77yM5rC45LmF5pyJ5pWI44CB5LiN5oCV5o6J562+77yM5peg6ZyA55S16ISR57ut562+44CCPC9kaXY+Jzt9CiAgfQogIGlmKGJveClib3guaW5uZXJIVE1MPWh0bWw7Cn0KLyogPT09PT09PT09PT09PT09PT0g5bCP57uE5Lu26L2m6L6G6YCJ5oupID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHdpZGdldEFjY09wdGlvbnMoKXsKICBjb25zdCBsaXN0PVNUQVRFLmRhdGF8fFtdOwogIGlmKCFsaXN0Lmxlbmd0aClyZXR1cm4gJzxvcHRpb24gdmFsdWU9IiI+5pqC5peg6LSm5Y+35pWw5o2u77yI6K+35YWI5Zyo6aaW6aG15Yi35paw5Yqg6L2977yJPC9vcHRpb24+JzsKICByZXR1cm4gbGlzdC5tYXAoKGEsaSk9PnsKICAgIGNvbnN0IG5tPWVzYygoYS52ZWhpY2xlJiYoYS52ZWhpY2xlLnZlaGljbGVOYW1lfHxhLnZlaGljbGUudmVoaWNsZVR5cGUpKXx8YS51c2VyTmFtZXx8KCLotKblj7ciKyhpKzEpKSk7CiAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9IicrZXNjKGEudXNlcklkfHwiIikrJyIgZGF0YS1pPSInK2krJyI+JytubSsnPC9vcHRpb24+JzsKICB9KS5qb2luKCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRWZWhPcHRpb25zKHVpZCl7CiAgY29uc3QgbGlzdD1TVEFURS5kYXRhfHxbXTsKICBjb25zdCBhPWxpc3QuZmluZCh4PT5TdHJpbmcoeC51c2VySWR8fCIiKT09PVN0cmluZyh1aWQpKTsKICBpZighYXx8IWEudmVoaWNsZXx8IWEudmVoaWNsZS5oYXNWZWhpY2xlKXJldHVybiAnPG9wdGlvbiB2YWx1ZT0iIj7or6XotKblj7fmmoLml6Dnu5HlrprovabovoY8L29wdGlvbj4nOwogIGNvbnN0IHY9YS52ZWhpY2xlOwogIGNvbnN0IGFycj0oQXJyYXkuaXNBcnJheSh2LnZlaGljbGVzKSYmdi52ZWhpY2xlcy5sZW5ndGgpP3YudmVoaWNsZXMubWFwKHg9Pih7bmFtZTp4LnZlaGljbGVUeXBlfHx4Lm5hbWV8fHgudmluTm8sdmluOngudmluTm99KSk6W3tuYW1lOnYudmVoaWNsZVR5cGV8fHYudmVoaWNsZU5hbWV8fHYudmluTm8sdmluOnYudmluTm99XTsKICByZXR1cm4gYXJyLm1hcCh4PT4nPG9wdGlvbiB2YWx1ZT0iJytlc2MoeC52aW4pKyciPicrZXNjKHgubmFtZSkrJzwvb3B0aW9uPicpLmpvaW4oIiIpOwp9CmZ1bmN0aW9uIHdpZGdldEFjY0NoYW5nZWQoKXsKICBjb25zdCBzZWw9ZWwoIndpZGdldF9hY2MiKTtpZighc2VsKXJldHVybjsKICBlbCgid2lkZ2V0X3ZlaCIpLmlubmVySFRNTD13aWRnZXRWZWhPcHRpb25zKHNlbC52YWx1ZXx8IiIpOwp9CmZ1bmN0aW9uIHdpZGdldFNlbGVjdGlvblRleHQoKXsKICBjb25zdCBhY2M9ZWwoIndpZGdldF9hY2MiKSx2ZWg9ZWwoIndpZGdldF92ZWgiKTsKICBpZighYWNjfHwhdmVofHwhYWNjLnZhbHVlfHwhdmVoLnZhbHVlKXJldHVybiAiIjsKICByZXR1cm4gYWNjLnZhbHVlKyJ8Iit2ZWgudmFsdWU7Cn0KLyogPT09PT09PT09PT09PT09PT0gdjIuMTYuOSDovabovoblm77niYfmm7/mjaIgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgUElDX0NBVEFMT0c9W3tuOiLkuI3mm7/mjaLvvIjlrpjmlrnljp/lm77vvIkiLHU6IiJ9LHtuOiJBRTVpIOeUtei9u+aRqSDCtyDmmJ/lhYnpu5EiLHU6Imh0dHBzOi8vYWthLmRvdWJhb2Nkbi5jb20vcy9MYkh6ZkNKcTVZIn0se246IkFFNWkg55S16L275pGpIMK3IOmAn+aEn+eBsCIsdToiaHR0cHM6Ly9ha2EuZG91YmFvY2RuLmNvbS9zL296UktJY2FTWkcifSx7bjoiQUU1aSDnlLXovbvmkakgwrcg5pif5YWJ55m9Iix1OiJodHRwczovL2FrYS5kb3ViYW9jZG4uY29tL3MvTjVkOUEzbXNQWSJ9LHtuOiJBRTVpIOeUtei9u+aRqSDCtyDmnoHmoLjmqZkiLHU6Imh0dHBzOi8vYWthLmRvdWJhb2Nkbi5jb20vcy9Sc1ZEVkdNSXZGIn0se246IkFFNWkgUHJvIOWumOaWuSDCtyDngbAiLHU6Imh0dHBzOi8vb3NzLWNmbW90by56ZWVob2V2LmNvbS91cGxvYWRzL3plZWhvLWNsaWVudC1wYy9tZWRpYS8xNzU4MTcyNjQxNjg0LnBuZyJ9LHtuOiJBRTVpIFBybyBNYXgg5a6Y5pa5IMK3IOeZvSIsdToiaHR0cHM6Ly9vc3MtY2Ztb3RvLnplZWhvZXYuY29tL3VwbG9hZHMvemVlaG8tY2xpZW50LXBjL21lZGlhLzE3NTgxNzI2MzA4NTcucG5nIn0se246IkFFOCBTKyBNWTI1IOWumOaWuSIsdToiaHR0cHM6Ly9vc3MtY2Ztb3RvLnplZWhvZXYuY29tL3VwbG9hZHMvemVlaG8tY2xpZW50LXBjL21lZGlhLzE3ODQ2MjY2NzgyMjIucG5nIn1dOwpsZXQgUElDX0NGRz17fTsKZnVuY3Rpb24gcGljS25vd24odSl7cmV0dXJuIFBJQ19DQVRBTE9HLnNvbWUobz0+by51JiZvLnU9PT11KX0KZnVuY3Rpb24gcGljUm93KHZpbixuYW1lLGFjYyl7CiAgY29uc3QgY3VyPVBJQ19DRkdbdmluXXx8IiI7CiAgY29uc3Qgb3B0cz1QSUNfQ0FUQUxPRy5tYXAobz0+JzxvcHRpb24gdmFsdWU9IicrZXNjKG8udSkrJyInKygoby51fHwiIik9PT1jdXI/IiBzZWxlY3RlZCI6IiIpKyI+Iitlc2Moby5uKSsiPC9vcHRpb24+Iikuam9pbigiIikrJzxvcHRpb24gdmFsdWU9Il9fY3VzdG9tX18iJysoY3VyJiYhcGljS25vd24oY3VyKT8iIHNlbGVjdGVkIjoiIikrIj7oh6rlrprkuYkgVVJM4oCmPC9vcHRpb24+IjsKICBjb25zdCBzaG93Q3VzdG9tPWN1ciYmIXBpY0tub3duKGN1cik7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tYm90dG9tOjEycHgiIGRhdGEtdmluPSInK2VzYyh2aW4pKyciPjxsYWJlbD4nK2VzYyhuYW1lKSsoYWNjPycgPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMXB4Ij4oJytlc2MoYWNjKSsnKTwvc3Bhbj4nOicnKSsnIMK3IDxjb2RlIHN0eWxlPSJmb250LXNpemU6MTBweCI+Jytlc2MoU3RyaW5nKHZpbikuc2xpY2UoLTYpKSsnPC9jb2RlPjwvbGFiZWw+JysKICAnPHNlbGVjdCBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEzcHgiIG9uY2hhbmdlPSJwaWNTZWxDaGFuZ2VkKHRoaXMpIj4nK29wdHMrJzwvc2VsZWN0PicrCiAgJzxpbnB1dCBjbGFzcz0icGljLWN1c3RvbSIgcGxhY2Vob2xkZXI9IuiHquWumuS5ieWbvueJhyBVUkzvvIhodHRwcyDlvIDlpLTvvIzlu7rorq7lrpjmlrkgT1NTL+WbvuW6iuebtOmTvu+8iSIgdmFsdWU9IicrZXNjKHNob3dDdXN0b20/Y3VyOiIiKSsnIiBzdHlsZT0iZGlzcGxheTonKyhzaG93Q3VzdG9tPyJibG9jayI6Im5vbmUiKSsnO21hcmdpbi10b3A6NnB4O3dpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxMnB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PC9kaXY+JzsKfQpmdW5jdGlvbiBwaWNTZWxDaGFuZ2VkKHMpe2NvbnN0IGl0ZW09cy5jbG9zZXN0KCIuZi1pdGVtIik7Y29uc3QgaW5wPWl0ZW0/aXRlbS5xdWVyeVNlbGVjdG9yKCIucGljLWN1c3RvbSIpOm51bGw7aWYoIWlucClyZXR1cm47aWYocy52YWx1ZT09PSJfX2N1c3RvbV9fIil7aW5wLnN0eWxlLmRpc3BsYXk9ImJsb2NrIjtpbnAuZm9jdXMoKX1lbHNle2lucC5zdHlsZS5kaXNwbGF5PSJub25lIn19CmZ1bmN0aW9uIHBpY1Jvd3NIdG1sKCl7CiAgY29uc3QgbGlzdD1TVEFURS5kYXRhfHxbXTtjb25zdCByb3dzPVtdO2NvbnN0IHNlZW49e307CiAgZm9yKGNvbnN0IGEgb2YgbGlzdCl7CiAgICBjb25zdCB2PWEudmVoaWNsZTsKICAgIGlmKHYmJnYuaGFzVmVoaWNsZSl7CiAgICAgIGNvbnN0IGFycj0oQXJyYXkuaXNBcnJheSh2LnZlaGljbGVzKSYmdi52ZWhpY2xlcy5sZW5ndGgpP3YudmVoaWNsZXM6W3t2ZWhpY2xlVHlwZTp2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lLHZpbk5vOnYudmluTm99XTsKICAgICAgZm9yKGNvbnN0IHggb2YgYXJyKXtjb25zdCB2aW49U3RyaW5nKHgudmluTm98fCIiKS50cmltKCk7aWYoIXZpbnx8c2Vlblt2aW5dKWNvbnRpbnVlO3NlZW5bdmluXT0xO3Jvd3MucHVzaCh7dmluLG5hbWU6U3RyaW5nKHgudmVoaWNsZVR5cGV8fHgubmFtZXx8di52ZWhpY2xlVHlwZXx8di52ZWhpY2xlTmFtZXx8Iui9pui+hiIpLGFjYzphLnVzZXJOYW1lfHwiIn0pfQogICAgfQogIH0KICBmb3IoY29uc3QgdmluIG9mIE9iamVjdC5rZXlzKFBJQ19DRkcpKXtpZighc2Vlblt2aW5dKXJvd3MucHVzaCh7dmluLG5hbWU6IuW3sumFjee9rui9pui+hiIsYWNjOiIifSl9CiAgcmV0dXJuIHJvd3MubGVuZ3RoP3Jvd3MubWFwKHI9PnBpY1JvdyhyLnZpbixyLm5hbWUsci5hY2MpKS5qb2luKCIiKTonPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxNnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxM3B4Ij7mnKrmo4DmtYvliLDlt7Lnu5HlrprovabovobvvIzlj6/lnKjkuIvmlrnmjIkgVklOIOaJi+WKqOa3u+WKoDwvZGl2Pic7Cn0KZnVuY3Rpb24gcGljTWFudWFsSHRtbCgpewogIGNvbnN0IG9wdHM9UElDX0NBVEFMT0cubWFwKG89Pic8b3B0aW9uIHZhbHVlPSInK2VzYyhvLnUpKyciPicrZXNjKG8ubikrJzwvb3B0aW9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiPjxsYWJlbD7mjIkgVklOIOaJi+WKqOa3u+WKoO+8iOWujOaVtCBWSU4g6KeBIEFwcCDovabovobkv6Hmga/vvIk8L2xhYmVsPjxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwIj48aW5wdXQgaWQ9InBpY19tYW51YWxfdmluIiBwbGFjZWhvbGRlcj0i5a6M5pW0IFZJTu+8iDE35L2N77yJIiBzdHlsZT0iZmxleDoxO21pbi13aWR0aDoxNTBweDtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEycHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48c2VsZWN0IGlkPSJwaWNfbWFudWFsX3BpYyIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MTMwcHg7cGFkZGluZzo5cHggMTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxMnB4Ij4nK29wdHMrJzwvc2VsZWN0PjxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJhZGRQaWNNYW51YWwoKSI+5re75YqgPC9idXR0b24+PC9kaXY+PC9kaXY+JzsKfQpmdW5jdGlvbiBsb2FkUGljUm93cygpe2NvbnN0IGJveD1lbCgicGljTGlzdCIpO2lmKCFib3gpcmV0dXJuO2JveC5pbm5lckhUTUw9cGljUm93c0h0bWwoKStwaWNNYW51YWxIdG1sKCl9CmZ1bmN0aW9uIGFkZFBpY01hbnVhbCgpewogIGNvbnN0IHZpbj0oKGVsKCJwaWNfbWFudWFsX3ZpbiIpfHx7fSkudmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgdT0oZWwoInBpY19tYW51YWxfcGljIil8fHt9KS52YWx1ZXx8IiI7CiAgaWYoIXZpbil7dG9hc3QoIuivt+i+k+WFpeWujOaVtCBWSU4iLCJlcnIiKTtyZXR1cm59CiAgaWYodSlQSUNfQ0ZHW3Zpbl09dTtlbHNlIGRlbGV0ZSBQSUNfQ0ZHW3Zpbl07CiAgbG9hZFBpY1Jvd3MoKTsKfQpmdW5jdGlvbiBjb2xsZWN0UGljQ2ZnKCl7CiAgY29uc3Qgb3V0PXt9OwogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNwaWNMaXN0IC5mLWl0ZW1bZGF0YS12aW5dIikuZm9yRWFjaChpdGVtPT57CiAgICBjb25zdCB2aW49aXRlbS5nZXRBdHRyaWJ1dGUoImRhdGEtdmluIik7aWYoIXZpbilyZXR1cm47CiAgICBjb25zdCBzPWl0ZW0ucXVlcnlTZWxlY3Rvcigic2VsZWN0Iik7Y29uc3QgaW5wPWl0ZW0ucXVlcnlTZWxlY3RvcigiLnBpYy1jdXN0b20iKTsKICAgIGNvbnN0IHU9cy52YWx1ZT09PSJfX2N1c3RvbV9fIj8oaW5wP2lucC52YWx1ZS50cmltKCk6IiIpOnMudmFsdWU7CiAgICBpZih1JiYvXmh0dHBzPzpbL11bL10vLnRlc3QodSkpb3V0W3Zpbl09dTsKICB9KTsKICByZXR1cm4gb3V0Owp9CmFzeW5jIGZ1bmN0aW9uIGxvYWRQaWNDZmcoKXsKICBQSUNfQ0ZHPXt9OwogIHRyeXtjb25zdCByPWF3YWl0IGZldGNoKCIvYXBpL3BpYy1jZmciKS50aGVuKHg9PnguanNvbigpKTtpZihyJiZyLm9rKVBJQ19DRkc9ci5waWNzfHx7fX1jYXRjaChlKXtQSUNfQ0ZHPWdldENmZygpLnBpY3N8fHt9fQogIGxvYWRQaWNSb3dzKCk7Cn0KYXN5bmMgZnVuY3Rpb24gc2F2ZVBpY0NmZygpewogIGNvbnN0IHBpY3M9Y29sbGVjdFBpY0NmZygpO1BJQ19DRkc9cGljczsKICBpZihpc1Byb3h5TW9kZSgpKXsKICAgIHRyeXtjb25zdCByPWF3YWl0IGZldGNoKCIvYXBpL3BpYy1jZmciLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sYm9keTpKU09OLnN0cmluZ2lmeSh7cGljc30pfSkudGhlbih4PT54Lmpzb24oKSk7CiAgICAgIGlmKHImJnIub2spe3RvYXN0KCLlm77niYfmm7/mjaLlt7Lkv53lrZjvvIgiK3IuY291bnQrIiDovobovabvvInvvIzmiZPlvIDmnoHmoLhBcHDovabovobpobXljbPnlJ/mlYgiLCJvayIpfWVsc2V7dG9hc3QoIuS/neWtmOWksei0pToiKygociYmci5lcnJvcil8fCLmnKrnn6UiKSwiZXJyIil9CiAgICB9Y2F0Y2goZSl7dG9hc3QoIuS/neWtmOWksei0pToiK2UsImVyciIpfQogIH1lbHNle2NvbnN0IGM9Z2V0Q2ZnKCk7Yy5waWNzPXBpY3M7c2F2ZUNmZyhjKTt0b2FzdCgi5bey5L+d5a2Y5Yiw5pys5Zyw77yI5rWP6KeI5Zmo5qih5byP5LiN5pS55YaZ5a6Y5pa5QXBw77yJIiwiaW5mbyIpfQp9Ci8qID09PT09PT09PT09PT09PT09IOiHquWumuS5ieiDjOaZryA9PT09PT09PT09PT09PT09PSAqLwpsZXQgX19iZ0RhdGE9IiI7CmZ1bmN0aW9uIGJnRmlsZUNoYW5nZWQoaW5wKXsKICBjb25zdCBmPWlucCYmaW5wLmZpbGVzJiZpbnAuZmlsZXNbMF07CiAgaWYoIWYpcmV0dXJuOwogIGlmKGYuc2l6ZT42KjEwMjQqMTAyNCl7dG9hc3QoIuWbvueJh+i/h+Wkp++8iOmZkCA2TULvvIkiLCJlcnIiKTtpbnAudmFsdWU9IiI7cmV0dXJuO30KICBjb25zdCByPW5ldyBGaWxlUmVhZGVyKCk7CiAgci5vbmxvYWQ9ZnVuY3Rpb24oKXtfX2JnRGF0YT1yLnJlc3VsdDtjb25zdCBwPWVsKCJiZ1ByZXZpZXciKTtpZihwKXtwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0idXJsKCIrX19iZ0RhdGErIikiO3AudGV4dENvbnRlbnQ9IiI7fXRvYXN0KCLlt7LpgInmi6nlm77niYfvvIzngrnjgIzlupTnlKjog4zmma/jgI3nlJ/mlYgiLCJpbmZvIik7fTsKICByLnJlYWRBc0RhdGFVUkwoZik7Cn0KZnVuY3Rpb24gYXBwbHlCZ1VwbG9hZCgpewogIGlmKCFfX2JnRGF0YSl7dG9hc3QoIuivt+WFiOmAieaLqeWbvueJhyIsImVyciIpO3JldHVybjt9CiAgY29uc3QgYz1nZXRDZmcoKTtjLmN1c3RvbUJnPV9fYmdEYXRhO3NhdmVDZmcoYyk7CiAgYXBwbHlDdXN0b21CZygpOwogIGNvbnN0IGlucD1lbCgiYmdfZmlsZSIpO2lmKGlucClpbnAudmFsdWU9IiI7CiAgX19iZ0RhdGE9IiI7CiAgdG9hc3QoIuiDjOaZr+W3suW6lOeUqCIsIm9rIik7Cn0KZnVuY3Rpb24gcmVzZXRCZygpewogIGNvbnN0IGM9Z2V0Q2ZnKCk7Yy5jdXN0b21CZz0iIjtzYXZlQ2ZnKGMpOwogIGFwcGx5Q3VzdG9tQmcoKTsKICBjb25zdCBwPWVsKCJiZ1ByZXZpZXciKTtpZihwKXtwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjtwLnRleHRDb250ZW50PSLmnKrpgInmi6kiO30KICB0b2FzdCgi5bey5oGi5aSN6buY6K6k6IOM5pmvIiwiaW5mbyIpOwp9CmZ1bmN0aW9uIGFwcGx5Q3VzdG9tQmcoKXsKICBjb25zdCBiZz1nZXRDZmcoKS5jdXN0b21CZyxiPWRvY3VtZW50LmJvZHk7CiAgaWYoYmcpe2Iuc3R5bGUuYmFja2dyb3VuZEltYWdlPSJ1cmwoIitiZysiKSI7Yi5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT0iY292ZXIiO2Iuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPSJjZW50ZXIiO2Iuc3R5bGUuYmFja2dyb3VuZEF0dGFjaG1lbnQ9ImZpeGVkIjt9CiAgZWxzZXtiLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjtiLnN0eWxlLmJhY2tncm91bmRTaXplPSIiO2Iuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPSIiO2Iuc3R5bGUuYmFja2dyb3VuZEF0dGFjaG1lbnQ9IiI7fQp9Ci8qID09PT09PT09PT09PT09PT09IOaJi+acuuWPt+eZu+W9le+8iOWFjeaKk+WMhe+8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBzZW5kU21zQ29kZSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfc2VuZF9idG4iKTtidG4uZGlzYWJsZWQ9dHJ1ZTtidG4udGV4dENvbnRlbnQ9IuWPkemAgeS4reKApiI7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnNlbmRDb2RlKHBob25lKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLpqozor4HnoIHlt7Llj5HpgIEiLCJvayIpO2xldCB0PTYwO2J0bi50ZXh0Q29udGVudD0i6YeN5paw6I635Y+WKCIrdCsicykiOwogICAgY29uc3QgaXY9c2V0SW50ZXJ2YWwoKCk9Pnt0LS07aWYodDw9MCl7Y2xlYXJJbnRlcnZhbChpdik7YnRuLnRleHRDb250ZW50PSLojrflj5bpqozor4HnoIEiO2J0bi5kaXNhYmxlZD1mYWxzZTt9ZWxzZSBidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjt9LDEwMDApOwogIH1lbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi5Y+R6YCB5aSx6LSl77yM6K+35qOA5p+l572R57ucIiwiZXJyIik7YnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjt9Cn0KYXN5bmMgZnVuY3Rpb24gcGhvbmVMb2dpblVJKCl7CiAgY29uc3QgcGhvbmU9KGVsKCJwbF9waG9uZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBjb25zdCBjb2RlPShlbCgicGxfY29kZSIpPy52YWx1ZXx8IiIpLnRyaW0oKTsKICBpZighL14xXGR7MTB9JC8udGVzdChwaG9uZSkpe3RvYXN0KCLor7fovpPlhaXmraPnoa7nmoQxMeS9jeaJi+acuuWPtyIsImVyciIpO3JldHVybjt9CiAgaWYoIWNvZGUpe3RvYXN0KCLor7fovpPlhaXnn63kv6Hpqozor4HnoIEiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGJ0bj1lbCgicGxfbG9naW5fYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLnmbvlvZXkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5waG9uZUxvZ2luKHBob25lLGNvZGUsIiIpOwogIGlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IueZu+W9leaIkOWKnyIsIm9rIik7c2V0VGltZW91dCgoKT0+bG9jYXRpb24ucmVsb2FkKCksMTIwMCk7fQogIGVsc2V7dG9hc3QoKGQmJmQubWVzc2FnZSl8fCLnmbvlvZXlpLHotKUiLCJlcnIiKTt9CiAgYnRuLmRpc2FibGVkPWZhbHNlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5bm25re75Yqg6LSm5Y+3IjsKfQovLyB2Mi4xNC4yMSDnrb7lkI3lr4bpkqXphY3nva7pnaLmnb/lt7LliKDpmaTvvJphcHAvaDUvQUVTIOWvhumSpeebtOaOpeayv+eUqOW9k+WJjeWAvO+8iOWGhee9rum7mOiupO+8ie+8jOS4jeWGjeS7jui+k+WFpeahhuivu+WPlgovLyB2Mi4xNC4yMSDpo47pmannoa7orqTmlLnlvLnnqpfvvJrkv53lrZjphY3nva7ml7bmsr/nlKjlvZPliY0gdmVoaWNsZUNvbnRyb2xSaXNr77yM5LiN5riF56m65ZCM5oSP54q25oCBCmZ1bmN0aW9uIGNvbGxlY3RDZmdVSSgpe2NvbnN0IGN1cj1nZXRDZmcoKTtyZXR1cm57YXBwOnthcHBJZDpjdXIuYXBwLmFwcElkLGFwcFNlY3JldDpjdXIuYXBwLmFwcFNlY3JldH0saDU6e2FwcElkOmN1ci5oNS5hcHBJZCxhcHBTZWNyZXQ6Y3VyLmg1LmFwcFNlY3JldH0sdmVoaWNsZUFlc0tleTpjdXIudmVoaWNsZUFlc0tleSx2ZWhpY2xlQ29udHJvbFJpc2s6Y3VyLnZlaGljbGVDb250cm9sUmlzayxhdXRvUmVmcmVzaFNlYzpub3JtYWxpemVSZWZyZXNoU2VjKGN1ci5hdXRvUmVmcmVzaFNlY3x8NjApLHNlcnZlckJhc2U6Y3VyLnNlcnZlckJhc2V8fCIiLGF1dG9TaWduaW46ZWwoImF1dG9fc2lnbmluIik/ZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZDpmYWxzZSxhdXRvU2lnbmluVGltZToodmFsKCJjZmdfc2lnbmluX3RpbWUiKXx8IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6ZWwoInZlaGljbGVfbW9uaXRvciIpP2VsKCJ2ZWhpY2xlX21vbml0b3IiKS5jaGVja2VkOmZhbHNlLHdpZGdldFZlaGljbGU6d2lkZ2V0U2VsZWN0aW9uVGV4dCgpfHxjdXIud2lkZ2V0VmVoaWNsZSxjdXN0b21CZzpjdXIuY3VzdG9tQmcscGljczooY3VyLnBpY3N8fHt9KSxjb21tdW5pdHk6e2VuYWJsZVBvc3Q6ZWwoImNvbW1fcG9zdCIpLmNoZWNrZWQsZW5hYmxlTGlrZTplbCgiY29tbV9saWtlIikuY2hlY2tlZCxlbmFibGVDb21tZW50OmVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkLGVuYWJsZVNoYXJlOmVsKCJjb21tX3NoYXJlIikuY2hlY2tlZCxlbmFibGVEZWxldGU6ZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZH19fQpmdW5jdGlvbiB2YWwoaWQpe2NvbnN0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO3JldHVybiBlP2UudmFsdWU6IiJ9CmZ1bmN0aW9uIGVsKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpfQphc3luYyBmdW5jdGlvbiBzYXZlQ2ZnVUkoKXtjb25zdCBjPWNvbGxlY3RDZmdVSSgpO2NvbnN0IG9rPWF3YWl0IEJhY2tlbmQuc2F2ZUNvbmZpZyhjKTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSl7YXBwbHlSZW1vdGVDZmcoYyk7U1RBVEUucGFuZWxMb2FkZWQ9ZmFsc2V9dG9hc3QoIumFjee9ruW3suS/neWtmCIsIm9rIik7c3RhcnRBdXRvUmVmcmVzaChjLmF1dG9SZWZyZXNoU2VjKTtyZWZyZXNoQWxsKHRydWUpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpfQovLyB2Mi4xNC4yMSDnrb7lkI3lr4bpkqXpnaLmnb/lt7LliKDpmaTvvJrmgaLlpI3pu5jorqTml7blr4bpkqXnm7TmjqXlhpnlm57lhoXnva7pu5jorqTlgLwKZnVuY3Rpb24gcmVzZXRDZmdVSSgpe2lmKGVsKCJhdXRvX3NpZ25pbiIpKWVsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ9ZmFsc2U7aWYoZWwoImNmZ19zaWduaW5fdGltZSIpKWVsKCJjZmdfc2lnbmluX3RpbWUiKS52YWx1ZT0iMDc6MDAiO2lmKGVsKCJjb21tX3Bvc3QiKSllbCgiY29tbV9wb3N0IikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX2xpa2UiKSllbCgiY29tbV9saWtlIikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX2NvbW1lbnQiKSllbCgiY29tbV9jb21tZW50IikuY2hlY2tlZD10cnVlO2lmKGVsKCJjb21tX3NoYXJlIikpZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fZGVsZXRlIikpZWwoImNvbW1fZGVsZXRlIikuY2hlY2tlZD10cnVlO2NvbnN0IGM9Z2V0Q2ZnKCk7Yy5hcHA9e2FwcElkOkRFRkFVTFRfQ0ZHLmFwcC5hcHBJZCxhcHBTZWNyZXQ6REVGQVVMVF9DRkcuYXBwLmFwcFNlY3JldH07Yy5oNT17YXBwSWQ6REVGQVVMVF9DRkcuaDUuYXBwSWQsYXBwU2VjcmV0OkRFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH07Yy52ZWhpY2xlQWVzS2V5PURFRkFVTFRfQ0ZHLnZlaGljbGVBZXNLZXk7Yy52ZWhpY2xlQ29udHJvbFJpc2s9IiI7Yy53aWRnZXRWZWhpY2xlPSIiO2MuY3VzdG9tQmc9IiI7c2F2ZUNmZyhjKTthcHBseUN1c3RvbUJnKCk7aWYoZWwoIndpZGdldF9hY2MiKSl7ZWwoIndpZGdldF9hY2MiKS52YWx1ZT0iIjtlbCgid2lkZ2V0X3ZlaCIpLmlubmVySFRNTD0iIjt9Y29uc3QgYnA9ZWwoImJnUHJldmlldyIpO2lmKGJwKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7YnAudGV4dENvbnRlbnQ9IuacqumAieaLqSI7fXRvYXN0KCLlt7LmgaLlpI3pu5jorqTvvIjpnIDngrnlh7vkv53lrZjvvIkiLCJpbmZvIil9CmZ1bmN0aW9uIGFkZEFjY291bnRVSSgpe2NmZ0FjY291bnRzLnB1c2goe3VzZXJOYW1lOiIiLHVzZXJJZDoiIix0b2tlbjoiIixiYXJrS2V5OiIifSk7Y29uc3QgbGlzdD1lbCgiYWNjTGlzdCIpO2NvbnN0IGlkeD1jZmdBY2NvdW50cy5sZW5ndGgtMTtjb25zdCBodG1sPSc8ZGl2IGNsYXNzPSJhY2MtZWRpdCIgZGF0YS1pPSInK2lkeCsnIj48ZGl2IGNsYXNzPSJhY2MtZWRpdC1oZWFkIj48c3BhbiBjbGFzcz0iYWNjLWVkaXQtdGl0bGUiPjxzcGFuIGNsYXNzPSJuIj4nK1N0cmluZyhpZHgrMSkrJzwvc3Bhbj7otKblj7cgJytTdHJpbmcoaWR4KzEpKyfvvIjmlrDvvIk8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdHMiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InVpZEJ0bl8nK2lkeCsnIiBvbmNsaWNrPSJmZXRjaFVzZXJJZFVJKCcraWR4KycpIj7ojrflj5ZJRDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSBkYW5nZXIiIG9uY2xpY2s9ImRlbGV0ZUFjY291bnRVSSgnK2lkeCsnKSI+5Yig6ZmkPC9idXR0b24+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImZvcm0tZ3JpZCI+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5pi156ewPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY19uYW1lXycraWR4KyciIHBsYWNlaG9sZGVyPSLlpoIgbHVja3k3OTgiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPueUqOaIt0lEPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY191aWRfJytpZHgrJyIgcGxhY2Vob2xkZXI9IueVmeepuuWPr+eCueOAjOiOt+WPlklE44CNIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5BdXRob3JpemF0aW9uIFRva2VuPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImFjY190b2tlbl8nK2lkeCsnIiBwbGFjZWhvbGRlcj0iYTc0Nzc5Yzct4oCmIj48L2Rpdj48ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2Pic7aWYobGlzdC5xdWVyeVNlbGVjdG9yKCIuYWNjLWVkaXQiKXx8bGlzdC5xdWVyeVNlbGVjdG9yKCJbc3R5bGUqPSd0ZXh0LWFsaWduJ10iKSl7bGlzdC5pbnNlcnRBZGphY2VudEhUTUwoImJlZm9yZWVuZCIsaHRtbCl9ZWxzZXtsaXN0LmlubmVySFRNTD1odG1sfX0KZnVuY3Rpb24gZGVsZXRlQWNjb3VudFVJKGlkeCl7Y29uc3Qgcm93PWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2MtZWRpdFtkYXRhLWk9IicraWR4KyciXScpO2lmKHJvdyl7cm93LnJlbW92ZSgpO2NmZ0FjY291bnRzLnNwbGljZShpZHgsMSk7dG9hc3QoIuW3suWIoOmZpO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX19CmZ1bmN0aW9uIGNvbGxlY3RBY2NvdW50c1VJKCl7Y29uc3Qgcm93cz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjYWNjTGlzdCAuYWNjLWVkaXQiKTtjb25zdCBsaXN0PVtdO3Jvd3MuZm9yRWFjaChyb3c9Pntjb25zdCBpPXJvdy5nZXRBdHRyaWJ1dGUoImRhdGEtaSIpO2NvbnN0IHRva2VuPWVsKCJhY2NfdG9rZW5fIitpKT8udmFsdWV8fCIiO2lmKHRva2VuLnRyaW0oKSl7bGlzdC5wdXNoKHt1c2VyTmFtZTplbCgiYWNjX25hbWVfIitpKT8udmFsdWV8fCIiLHVzZXJJZDplbCgiYWNjX3VpZF8iK2kpPy52YWx1ZXx8IiIsdG9rZW46Y2xlYW5Ub2tlbih0b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoZWwoImFjY19iYXJrXyIraSk/LnZhbHVlfHwiIil9KX19KTtyZXR1cm4gbGlzdH0KYXN5bmMgZnVuY3Rpb24gc2F2ZUFjY291bnRzVUkoKXtjb25zdCBsaXN0PWNvbGxlY3RBY2NvdW50c1VJKCkubWFwKGE9Pih7dXNlck5hbWU6KGEudXNlck5hbWV8fCIiKS50cmltKCksdXNlcklkOihhLnVzZXJJZHx8IiIpLnRyaW0oKSx0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleSl9KSk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQWNjb3VudHMobGlzdCk7aWYob2spe2lmKGlzUHJveHlNb2RlKCkpU1RBVEUucGFuZWxBY2NvdW50cz1saXN0O3RvYXN0KCLmnoHmoLjotKblj7flt7Lkv53lrZgiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9CmFzeW5jIGZ1bmN0aW9uIGZldGNoVXNlcklkVUkoaWR4KXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGVsKCJhY2NfdG9rZW5fIitpZHgpPy52YWx1ZXx8IiIpO2NvbnN0IGJ0bj1lbCgidWlkQnRuXyIraWR4KTtpZighdG9rZW4pe3RvYXN0KCLor7flhYjloavlhpkgVG9rZW4iLCJlcnIiKTtyZXR1cm59YnRuLnRleHRDb250ZW50PSLojrflj5bkuK3igKYiO2J0bi5kaXNhYmxlZD10cnVlO2NvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXRVc2VyaWQodG9rZW4pO2lmKGQmJmQub2smJmQudXNlcklkKXtpZihlbCgiYWNjX3VpZF8iK2lkeCkpZWwoImFjY191aWRfIitpZHgpLnZhbHVlPWQudXNlcklkO2lmKGQudXNlck5hbWUmJmVsKCJhY2NfbmFtZV8iK2lkeCkmJiFlbCgiYWNjX25hbWVfIitpZHgpLnZhbHVlKWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWU9ZC51c2VyTmFtZTt0b2FzdCgi6I635Y+W5oiQ5Yqf77yaIisoZC51c2VyTmFtZXx8ZC51c2VySWQpLCJvayIpfWVsc2V7dG9hc3QoIuiOt+WPluWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuacquefpemUmeivryIpLCJlcnIiKX1idG4udGV4dENvbnRlbnQ9IuiOt+WPlklEIjtidG4uZGlzYWJsZWQ9ZmFsc2V9CgovKiA9PT09PT09PT09PT09PT09PSDlpIfku70gLyDmgaLlpI0gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZXhwb3J0QmFja3VwVUkoKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmFja3VwQXJlYSIpO2lmKCFlbCl7dG9hc3QoIueVjOmdouacquWwsee7qiIsImVyciIpO3JldHVybn1lbC52YWx1ZT0i55Sf5oiQ5Lit4oCmIjtCYWNrZW5kLmJhY2t1cCgpLnRoZW4oZD0+e2lmKGQmJmQub2spe2VsLnZhbHVlPUpTT04uc3RyaW5naWZ5KGQsbnVsbCwyKTt0b2FzdCgi5aSH5Lu95bey55Sf5oiQ77yM5Y+v5aSN5Yi25L+d5a2YIiwib2siKX1lbHNle2VsLnZhbHVlPSIiO3RvYXN0KCLlr7zlh7rlpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLml6Dms5Xov57mjqXohJrmnKzlkI7nq68iKSwiZXJyIil9fSl9CmZ1bmN0aW9uIGNvcHlCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUpe3RvYXN0KCLor7flhYjngrnlh7vjgIzkuIDplK7lr7zlh7rlpIfku73jgI0iLCJlcnIiKTtyZXR1cm59aWYobmF2aWdhdG9yLmNsaXBib2FyZCYmbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpe25hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGVsLnZhbHVlKS50aGVuKCgpPT50b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKSwoKT0+e2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9KX1lbHNle2VsLnNlbGVjdCgpO2RvY3VtZW50LmV4ZWNDb21tYW5kKCJjb3B5Iik7dG9hc3QoIuW3suWkjeWItuWIsOWJqui0tOadvyIsIm9rIil9fQpmdW5jdGlvbiBpbXBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7aWYoIWVsfHwhZWwudmFsdWUudHJpbSgpKXt0b2FzdCgi6K+35YWI57KY6LS05aSH5Lu95YaF5a65IiwiZXJyIik7cmV0dXJufWNvbmZpcm1EaWFsb2coIuaBouWkjeWkh+S7vSIsIuWwhuimhuebluW9k+WJjeWFqOmDqOi0puWPt+S4jumdouadv+mFjee9ru+8jOatpOaTjeS9nOS4jeWPr+aSpOmUgOOAgiIsImltcG9ydEJhY2t1cE5vdyIpfQphc3luYyBmdW5jdGlvbiBpbXBvcnRCYWNrdXBOb3coKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW1wb3J0QXJlYSIpO2NvbnN0IHY9ZWw/ZWwudmFsdWUudHJpbSgpOiIiO2lmKCF2KXt0b2FzdCgi5aSH5Lu95YaF5a655Li656m6IiwiZXJyIik7cmV0dXJufWNvbnN0IGQ9YXdhaXQgQmFja2VuZC5yZXN0b3JlQmFja3VwKHYpO2lmKGQmJmQub2spe3RvYXN0KCLmgaLlpI3miJDlip/vvJoiKyhkLmNvdW50fHwwKSsiIOS4qui0puWPtyIsIm9rIik7aWYoaXNQcm94eU1vZGUoKSl7U1RBVEUucGFuZWxBY2NvdW50cz1bXTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX1TVEFURS5kYXRhPVtdO3JlbmRlckNmZygpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5oGi5aSN5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5aSH5Lu95YaF5a655qC85byP6ZSZ6K+vIiksImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g5ryU56S65pWw5o2u77yIP2RlbW8g6aKE6KeI55So77yM5LiN6IGU572R77yJID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGlzRGVtbygpe3JldHVybiBsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wfQpmdW5jdGlvbiBkZW1vQ2FsKCl7CiAgY29uc3Qgbm93PW5ldyBEYXRlKCkseT1ub3cuZ2V0RnVsbFllYXIoKSxtPW5vdy5nZXRNb250aCgpKzEsZGltPW5ldyBEYXRlKHksbSwwKS5nZXREYXRlKCkscD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpLG91dD1bXTsKICBmb3IobGV0IGQ9MTtkPD1kaW07ZCsrKXsKICAgIGNvbnN0IGRzPXkrIi0iK3AobSkrIi0iK3AoZCk7CiAgICBpZihkcz55KyItIitwKG0pKyItIitwKG5vdy5nZXREYXRlKCkpKWJyZWFrOwogICAgaWYoZD09PTN8fGQ9PT0xMSljb250aW51ZTsgICAgICAgICAgLy8g5ryU56S677ya5Lik5aSp5ryP562+CiAgICBvdXQucHVzaCh7Y3JlYXRlRGF0ZTpkcyxzaWduU3RhdHVlOjV9KTsKICB9CiAgcmV0dXJuIG91dDsKfQpjb25zdCBERU1PX0lOVEVHUkFMPXtvazp0cnVlLHRvdGFsOntpbnRlZ3JhbFRvdGFsOiIxMiw4ODAifSxleHBpcmU6W3tpbnRlZ3JhbFNjb3JlOjMyMCxleHBpcnlEYXRlU3RyOiIyMDI2LTEyLTMxIn1dLGRldGFpbDpbCiAge25hbWU6Iuavj+aXpeetvuWIsCIsaW50ZWdyYWxTY29yZTo2LG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrlj5HluJYiLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy654K56LWeIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuuWIhuS6qyIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnm7Lnm5LlpZblirEiLGludGVncmFsU2NvcmU6NixteURhdGVTdHI6IjIwMjYtMDktMjggMDc6MDAifSwKICB7bmFtZToi6KGl562+5raI6ICXIixpbnRlZ3JhbFNjb3JlOi0xLG15RGF0ZVN0cjoiMjAyNi0wOS0yNyAyMToxMCJ9Cl19Owpjb25zdCBERU1PX1NVUFBMRU1FTlQ9e2NvdW50Ontvazp0cnVlLGRhdGE6e2NvdW50OjIsY2FyZE51bToyfX0sbW9udGg6e29rOnRydWUsZGF0YTp7bm93U2lnbkRldGFpbFZvczpbXX19fTsKY29uc3QgREVNT19NT05JVE9SPXtvazp0cnVlLHNuYXBzaG90Ont2aW46IkxCN0pNMUMxME5BMDAwMDAxIixzb2M6NzYscmFuZ2U6NjMsdm9sdGFnZTo4NC41LGN1cnJlbnQ6MCxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1IixoZWFkTG9jazoiMSIsb2ZmbGluZTpmYWxzZSxyZWZyZXNoVGltZToiMjAyNi0wOS0yOSAwMzoxMCIsZnJvbnRQcmVzc3VyZToiMi4zNWJhciIscmVhclByZXNzdXJlOiIyLjQwYmFyIixmcm9udFRlbXA6IjMxwrBDIixyZWFyVGVtcDoiMzLCsEMiLGJhdHRlcnlUZW1wOjI2LHRvZGF5RGlzdGFuY2U6MTIuNix0b2RheUR1cmF0aW9uOjM0LHRvZGF5TWF4U3BlZWQ6NTYsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6IixzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9LAogIHZlaGljbGVzOlt7dmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIix2ZWhpY2xlVHlwZToiQUU0IE1BWDIrIn0se3ZlaGljbGVOYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIiLHZlaGljbGVUeXBlOiJBRTYifV19Owpjb25zdCBERU1PX0NUUkxfT1BUUz17b2s6dHJ1ZSxjaGFyZ2VQb3dlcjpbe2tleToiNDAwIn0se2tleToiODAwIn0se2tleToiMTAwMCJ9XSxnZWFyczpbIjI1IiwiNDUiLCI2MCJdfTsKY29uc3QgREVNT19JTkZPPXtvazp0cnVlLHVucmVhZDp7dG90YWw6M30scHJpemVSZWNvcmRzOntyZWNvcmRzOlt7cHJpemVzTmFtZToi56ev5YiGICs2IixjcmVhdGVUaW1lOiIyMDI2LTA5LTI4IDA3OjAwIixpbnRlZ3JhbDo2fSx7cHJpemVzTmFtZToi6KGl562+5Y2hIMOXMSIsY3JlYXRlVGltZToiMjAyNi0wOS0yMSAwNzowMCJ9XX0sY291cG9uczp7cmVjb3Jkczpbe30se30se31dfSxvdGE6W119OwovKiB2Mi4xNi4wIOmqkeihjOa8lOekuuaVsOaNru+8muWQiOaIkOi9qOi/ue+8iOehruWumuaAp+eUn+aIkO+8ie+8jOaciOW6puiusOW9leS4jui9qOi/ueaJq+aPj+e7k+aenOS/neaMgeS4gOiHtCAqLwpmdW5jdGlvbiBkZW1vVHJhY2soc2VlZCxzdGVwcyxkYXkpewogIGxldCBzPXNlZWQ+Pj4wOwogIGxldCBsb249MTE5LjU1MDksbGF0PTI2LjY2NTQsaGRnPTQ1LG91dD1bXTsKICBjb25zdCBkMD1uZXcgRGF0ZSgpO2QwLnNldERhdGUoZGF5KTtkMC5zZXRIb3VycygxNCwyMCwwLDApOwogIGNvbnN0IHQwPWQwLmdldFRpbWUoKSsoc2VlZCUxMykqNjAwMDA7CiAgZm9yKGxldCBpPTA7aTxzdGVwcztpKyspewogICAgY29uc3QgcGg9aS9zdGVwczsKICAgIGNvbnN0IHRhcmdldD00NSs1MCpNYXRoLnNpbihwaCpNYXRoLlBJKjIuNikrMTQqTWF0aC5zaW4ocGgqTWF0aC5QSSo2LjMrKHNlZWQlNykpOwogICAgaGRnPWhkZysodGFyZ2V0LWhkZykqMC4zMjsKICAgIGxldCB2PTM0KzEzKk1hdGguc2luKHBoKk1hdGguUEkqMy4zKyhzZWVkJTUpKSsxLjUqTWF0aC5zaW4ocGgqTWF0aC5QSSoxNyk7CiAgICBpZihpPk1hdGguZmxvb3Ioc3RlcHMqMC42MCkmJmk8TWF0aC5mbG9vcihzdGVwcyowLjY0KSl2LT0yNDsKICAgIHY9TWF0aC5tYXgoNixNYXRoLm1pbig2NCx2KSk7CiAgICBjb25zdCByYWQ9aGRnKk1hdGguUEkvMTgwOwogICAgY29uc3Qgc3RlcE09dioxMDAwLzM2MDAqMjsKICAgIGxhdCs9c3RlcE0qTWF0aC5jb3MocmFkKS8xMTEzMjA7CiAgICBsb24rPXN0ZXBNKk1hdGguc2luKHJhZCkvKDExMTMyMCpNYXRoLmNvcyhsYXQqTWF0aC5QSS8xODApKTsKICAgIG91dC5wdXNoKGxvbi50b0ZpeGVkKDYpKyIsIitsYXQudG9GaXhlZCg2KSsiLCIrdi50b0ZpeGVkKDEpKyIsIisodDAraSoyMDAwKSk7CiAgfQogIHJldHVybiBvdXQuam9pbigiJiIpOwp9CmZ1bmN0aW9uIGRlbW9SaWRlRGF5cygpewogIGNvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IGN1cj1ub3cuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIik7CiAgcmV0dXJuIFt7ZGF5VGltZTpjdXIrIi4iK3AoMTApLHJpZGVzOlt7cmlkZUlkOiJERU1PLVIxIix0cmFqZWN0b3J5OmRlbW9UcmFjaygxMSw5MCwxMCl9LHtyaWRlSWQ6IkRFTU8tUjIiLHRyYWplY3Rvcnk6ZGVtb1RyYWNrKDIzLDcwLDEwKX1dfSwKICAgICAgICAgIHtkYXlUaW1lOmN1cisiLiIrcCg4KSxyaWRlczpbe3JpZGVJZDoiREVNTy1SMyIsdHJhamVjdG9yeTpkZW1vVHJhY2soNywxMTAsOCl9XX1dOwp9CmZ1bmN0aW9uIGRlbW9SaWRlVHJhY2socGFnZSl7CiAgaWYocGFnZSYmcGFnZT4xKXJldHVybntvazp0cnVlLHBhZ2U6cGFnZSx2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGRheXM6W119OwogIHJldHVybntvazp0cnVlLHBhZ2U6MSx2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGRheXM6ZGVtb1JpZGVEYXlzKCkubWFwKGQ9Pih7ZGF5VGltZTpkLmRheVRpbWUsaGlzdG9yeUxpc3Q6ZC5yaWRlc30pKX07Cn0KZnVuY3Rpb24gZGVtb1JpZGVNb250aChtb250aCl7CiAgY29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgY3VyPW5vdy5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihtb250aCYmbW9udGghPT1jdXIpcmV0dXJue29rOnRydWUsbW9udGg6bW9udGgsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIix2ZWhpY2xlTmFtZToiWkVFSE8gQUU0IixkYXRhOntyaWRlTWlsZWFnZVRvdGFsOjAscmlkZVJlY29yZExpc3Q6W119fTsKICBjb25zdCBzY2FuPXJpZGVEYXlTY2FuKGRlbW9SaWRlVHJhY2soMSkuZGF5cyk7CiAgY29uc3QgbWs9KGQsZXh0cmEpPT57CiAgICBjb25zdCBjPXNjYW5bZF18fG51bGw7CiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ZGF0ZTpkLAogICAgICByaWRlTWlsZWFnZTooYyYmYy5rbT4wKT9jLmttLnRvRml4ZWQoMSk6IjAiLAogICAgICByaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZTooYyYmYy5kdXI+MCk/U3RyaW5nKE1hdGgucm91bmQoYy5kdXIpKToiMCIsCiAgICAgIG1heFNwZWVkOihjJiZjLm1heFY+MCk/U3RyaW5nKE1hdGgucm91bmQoYy5tYXhWKSk6IjAiLAogICAgICBhY2NlbGVyYXRpb25UaW1lc0RheToiMCIsYnJha2VzVGltZXNEYXk6IjAiLGJlbmRpbmdUaW1lc0RheToiMCJ9LGV4dHJhfHx7fSk7CiAgfTsKICBjb25zdCByZWNvcmRzPVsKICAgIHtkYXRlOmN1cisiLiIrcCgzKSxyaWRlTWlsZWFnZToiMTIuNCIscmlkaW5nVGltZURheVVuaXRNaW51dGU6IjQ2IixtYXhTcGVlZDoiNTgiLGFjY2VsZXJhdGlvblRpbWVzRGF5OiIxIixicmFrZXNUaW1lc0RheToiMCIsYmVuZGluZ1RpbWVzRGF5OiIwIn0sCiAgICB7ZGF0ZTpjdXIrIi4iK3AoNSkscmlkZU1pbGVhZ2U6IjguOCIscmlkaW5nVGltZURheVVuaXRNaW51dGU6IjMxIixtYXhTcGVlZDoiNTIiLGFjY2VsZXJhdGlvblRpbWVzRGF5OiIwIixicmFrZXNUaW1lc0RheToiMSIsYmVuZGluZ1RpbWVzRGF5OiI0In0sCiAgICBtayhjdXIrIi4iK3AoOCkpLAogICAgbWsoY3VyKyIuIitwKDEwKSx7YWNjZWxlcmF0aW9uVGltZXNEYXk6IjEifSkKICBdOwogIHJldHVybntvazp0cnVlLG1vbnRoOmN1cix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLGRhdGE6e3JpZGVNaWxlYWdlVG90YWw6MjY4LjUscmlkZVJlY29yZExpc3Q6cmVjb3Jkc319Owp9CmNvbnN0IERFTU9fREFUQT1bCnt1c2VyTmFtZToi6Zi/5rO9Iix1c2VySWQ6IjIwMjUxMDA5MTIzNDU2NzgiLHNjb3JlOjEyODgwLHNpZ25lZFRvZGF5OnRydWUsY29udGludWVEYXlzOjQyLHRvZGF5U2NvcmU6MTIsc2lnbkNvdW50OjM2LHRva2VuVmFsaWQ6dHJ1ZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6dHJ1ZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAxIixiYXR0ZXJ5UGVyY2VudDo3NixyZXNpZHVhbFJhbmdlS206NjMscmFuZ2VFc3RpbWF0ZWQ6ZmFsc2UsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTo4NC41LGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDoyNixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixsYXN0UmlkZU1pbGVhZ2U6OC4yLHRvdGFsTWlsZWFnZToyNzEwNS4yLHllc3RlcmRheURpc3RhbmNlOjg4LjQsb25saW5lOiIxIixwb3dlclN0YXR1czoiMCIsbG9ja1N0YXRlOiIxIixjdXNoaW9uU3RhdGU6IjAiLGFkZHJlc3M6Iuemj+W7uuecgeWugeW+t+W4guiVieWfjuWMuuS4nOS+qOW8gOWPkeWMuiIsbG9jYXRpb25UaW1lOiIwODoxMiIsbG9uZ2l0dWRlOjExOS41NTA5LGxhdGl0dWRlOjI2LjY2NTQsc2VydmljZUVuZERhdGU6IjIwMjctMDMtMTgifX0sCnt1c2VyTmFtZToi5bCP5ruhIix1c2VySWQ6IjIwMjYwMTAxMTEyMjMzNDQiLHNjb3JlOjUyMCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6Myx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjksdG9rZW5WYWxpZDpmYWxzZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDYiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDpmYWxzZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOnRydWUsdmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsYmF0dGVyeVBlcmNlbnQ6MjMscmVzaWR1YWxSYW5nZUttOjIwLHJhbmdlRXN0aW1hdGVkOnRydWUsY2hhcmdlU3RhdGU6IuWFheeUteS4rSIsdm9sdGFnZTo4Ni4yLGN1cnJlbnQ6NS40LGJhdHRlcnlUZW1wOjMxLHRvdGFsTWlsZWFnZTowLHllc3RlcmRheURpc3RhbmNlOjAsY3VycmVudFZpbjoiTEI3Sk0xQzEwTkEwMDAwMDIiLHZlaGljbGVzOlt7bmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIn0se25hbWU6IkFFNWlQcm9NYXgiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMyJ9XSxmcm9udFByZXNzdXJlOiIyLjEwYmFyIixyZWFyUHJlc3N1cmU6IiIsZnJvbnRUZW1wOiIiLHJlYXJUZW1wOiIiLHRvZGF5RGlzdGFuY2U6MCx0b2RheUR1cmF0aW9uOjAsdG9kYXlNYXhTcGVlZDowLGxhc3RSaWRlTWlsZWFnZTowLG9ubGluZToiMCIscG93ZXJTdGF0dXM6IjEiLGxvY2tTdGF0ZToiMCIsY3VzaGlvblN0YXRlOiIxIixhZGRyZXNzOiIiLGxvY2F0aW9uVGltZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiIsc2VydmljZUVuZERhdGU6IiJ9fSwKe3VzZXJOYW1lOiJsdeWwj+WPtyIsdXNlcklkOiIyMDI2MDkyNTAwMDk0MTI4MyIsc2NvcmU6MTE1LHNpZ25lZFRvZGF5OnRydWUsY29udGludWVEYXlzOjQsdG9kYXlTY29yZTo0LHNpZ25Db3VudDo0LHRva2VuVmFsaWQ6dHJ1ZSxsYXN0Nzpbe2RhdGU6IjA5LTA0IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDUiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA3IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDgiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTEwIixzaWduZWQ6dHJ1ZSxpc1RvZGF5OnRydWV9XSx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX0KXTsKY29uc3QgREVNT19MT0dTPVsKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTIiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2FpbjoxMixzaWduaW5TY29yZTo2LGJsaW5kQm94U2NvcmU6NixpbnRlcmFjdFNjb3JlOjAsY29udGludWVEYXlzOjQyLHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICs2ICjnp6/liIYpIiwi55uy55uS5pyq6Kej6ZSBKDM2LzMwKSJdfSwKe3RpbWU6IjIwMjYtMDktMTAgMDc6MDA6MTUiLHR5cGU6InNpZ25pbiIsdXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ8iLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0sCnt0aW1lOiIyMDI2LTA5LTA5IDIyOjMxOjA1Iix0eXBlOiJ2ZWhpY2xlIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsYWN0aW9uVGV4dDoi5LqR56uv5byA6ZSBIixtZXNzYWdlOiLkupHnq6/lvIDplIHmjIfku6Tlt7LkuIvlj5EiLHN0ZXBzOltdfQpdOwoKLyogPT09PT09PT09PT09PT09PT0g5Yi35pawICYg5Yid5aeL5YyWID09PT09PT09PT09PT09PT09ICovCmxldCBsb2FkaW5nPWZhbHNlOwovLyDlhaXlnLrpl6rlsY/vvJrpobXpnaLlj6/kuqTkupLvvIjpqqjmnrblsY/lt7LmuLLmn5PvvInljbPmkqTkuIvvvIzkuI3lho3nrYnnvZHnu5zmlbDmja7vvJvmlbDmja7liLDovr7lkI7lho3loavlhYUKZnVuY3Rpb24gaGlkZVNwbGFzaCgpe2NvbnN0IHM9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNwbGFzaCIpO2lmKCFzKXJldHVybjtzLmNsYXNzTGlzdC5hZGQoIm91dCIpO3NldFRpbWVvdXQoKCk9PntpZihzLnBhcmVudE5vZGUpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHMpfSw0NTApfQphc3luYyBmdW5jdGlvbiByZWZyZXNoQWxsKHNpbGVudCl7CiAgaWYobG9hZGluZylyZXR1cm47bG9hZGluZz10cnVlOwogIGlmKCFzaWxlbnQpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpO2lmKCFTVEFURS5kYXRhLmxlbmd0aCllbC5pbm5lckhUTUw9c2tlbGV0b25Ib21lKCl9CiAgaGlkZVNwbGFzaCgpOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5nZXREYXNoYm9hcmQoKTsKICBsb2FkaW5nPWZhbHNlOwogIGlmKGQmJmQub2spe1NUQVRFLmRhdGE9ZC5hY2NvdW50c3x8W107U1RBVEUudHNUZXh0PWZtdFRpbWUoZC50aW1lc3RhbXB8fG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7U1RBVEUucHJveHk9aXNQcm94eU1vZGUoKTtyZW5kZXJIb21lKCl9CiAgZWxzZXtjb25zdCBoaW50PWQmJmQucmF3JiZkLnJhdy5lcnJvcj9uZXR3b3JrSGludChkLnJhdyk6IiI7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaVsOaNruWKoOi9veWksei0pTwvaDM+PHA+JysoaGludHx8ZXNjKChkJiZkLmVycm9yKXx8Iue9kee7nOW8guW4uO+8jOivt+ajgOafpee9kee7nOi/nuaOpSIpKSsnPC9wPjxkaXYgY2xhc3M9ImJ0bi1yb3ciIHN0eWxlPSJqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyIj48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0icmVmcmVzaEFsbCgpIj7ph43or5U8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InN3aXRjaFRhYihcJ2NmZ1wnKSI+5qOA5p+l6K6+572uPC9idXR0b24+PC9kaXY+PC9kaXY+J30KfQovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOenr+WIhumhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgUFQ9e2FjY0lkeDowLG1vbnRoOiIiLG1vbnRoU2V0RGF5OiIifTsKZnVuY3Rpb24gcHRBY2NvdW50cygpe3JldHVybiBTVEFURS5kYXRhJiZTVEFURS5kYXRhLmxlbmd0aD9TVEFURS5kYXRhOihTVEFURS5wYW5lbEFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8Iui0puWPtyIsdXNlcklkOmEudXNlcklkfHwiIn0pKX0KZnVuY3Rpb24gYWNjQ2hpcHNIdG1sKHByZWZpeCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXJldHVybiIiOwogIGNvbnN0IGN1cj1wcmVmaXg9PT0icHQiP1BULmFjY0lkeDoocHJlZml4PT09InJ0Ij9SVC5hY2NJZHg6VkguYWNjSWR4KTsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jaGlwcyI+JytsaXN0Lm1hcCgoYSxpKT0+JzxidXR0b24gY2xhc3M9ImFjYy1jaGlwICcrKGk9PT1jdXI/J29uJzonJykrJyIgb25jbGljaz0icGlja0FjYyhcJycrcHJlZml4KydcJywnK2krJykiPicrZXNjKGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKSsnPC9kaXY+JzsKfQpmdW5jdGlvbiBwaWNrQWNjKHByZWZpeCxpKXtpZihwcmVmaXg9PT0icHQiKXtQVC5hY2NJZHg9aTtyZW5kZXJQb2ludHMoKX1lbHNlIGlmKHByZWZpeD09PSJydCIpe1JULmFjY0lkeD1pO1JULnRyYWNrcz1udWxsO1JULnRyYWNrc0F0PSIiO1JULnRyYWNrc1JpZGVzPTA7UlQudHJhY2tzRGF5cz0wO1JULnNjYW5FcnI9IiI7UlQudmluPSIiO3JlbmRlclJpZGVQYWdlKCl9ZWxzZXtWSC5hY2NJZHg9aTtWSC52aW49IiI7cmVuZGVyVmVoaWNsZVBhZ2UoKX19CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclBvaW50cygpewogIGNvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlUG9pbnRzIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihQVC5hY2NJZHg+PWxpc3QubGVuZ3RoKVBULmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1BULmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjxwPuivt+WIsOiuvue9rumhteihpeWFqOeUqOaIt0lEPC9wPjwvZGl2Pic7cmV0dXJufQogIGVsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInB0IikrJzxkaXYgY2xhc3M9ImVtcHR5IiBzdHlsZT0icGFkZGluZzo0MHB4IDIwcHgiPjxwIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L2956ev5YiG5pWw5o2u5Lit4oCmPC9wPjwvZGl2Pic7CiAgLy8gdjIuMTQuMjAg5pel5Y6G6Leo5pyI5L+u5q2j77ya6Z2i5p2/5bi46am75pe2IFBULm1vbnRoIOWPr+iDvea7nueVmeS4iuaciOOAgui3qOWIsOaWsOaciOS7ve+8iOS7iuWkqeS4jeaYr+iuvue9ruivpeaciOS7vemCo+Wkqe+8ieWQjuiHquWKqOWbnuWIsOW9k+WJjeaciO+8jAogIC8vIOmBv+WFjSAxMOaciDHlj7cg5pe25pel5Y6G5LuN5YGc5ZyoIDnmnIgzMOWPt++8iOS4iuaciO+8ieaYvuekuuS4jeWHhuehruOAggogIGNvbnN0IF9ub3c9bmV3IERhdGUoKTsKICBjb25zdCBfY3VyTT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IF90ZHk9X25vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX25vdy5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKF9ub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgaWYoUFQubW9udGgmJlBULm1vbnRoU2V0RGF5JiZQVC5tb250aFNldERheSE9PV90ZHkmJlBULm1vbnRoPF9jdXJNKXtQVC5tb250aD0iIjtQVC5tb250aFNldERheT0iIjt9CiAgY29uc3QgbW9udGg9UFQubW9udGh8fF9jdXJNOwogIGNvbnN0IFtpdCxjYWwsY250XSA9IGF3YWl0IFByb21pc2UuYWxsKFsKICAgIEJhY2tlbmQuaW50ZWdyYWwoYWNjLnVzZXJJZCwxKSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgibW9udGgiLGFjYy51c2VySWQse21vbnRoOm1vbnRofSksCiAgICBCYWNrZW5kLnN1cHBsZW1lbnQoImNvdW50IixhY2MudXNlcklkLHt9KQogIF0pOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgicHQiKTsKICAvLyDmgLvop4jvvIh2Mi4xNC4yMCDlhbzlrrkgZGF0YSDkuLrnuq/mlbDlrZfmiJblr7nosaHkuKTnp43ov5Tlm57vvIkKICBjb25zdCB0b3RhbD0oaXQmJml0LnRvdGFsIT1udWxsKT8oKHR5cGVvZiBpdC50b3RhbD09PSJudW1iZXIifHwodHlwZW9mIGl0LnRvdGFsPT09InN0cmluZyImJml0LnRvdGFsIT09IiIpKT9TdHJpbmcoaXQudG90YWwpOmRlZXBQaWNrKGl0LnRvdGFsLFsiaW50ZWdyYWxUb3RhbCIsInRvdGFsSW50ZWdyYWwiLCJzY29yZSIsImludGVncmFsIiwidG90YWwiXSw0KSk6IiI7CiAgY29uc3QgY2FyZE51bT0oY250JiZjbnQuZGF0YSE9bnVsbCk/KCh0eXBlb2YgY250LmRhdGE9PT0ibnVtYmVyInx8KHR5cGVvZiBjbnQuZGF0YT09PSJzdHJpbmciJiZjbnQuZGF0YSE9PSIiKSk/U3RyaW5nKGNudC5kYXRhKTpkZWVwUGljayhjbnQuZGF0YSxbImNvdW50IiwiY2FyZE51bSIsImNhcmRDb3VudCIsIm51bWJlciIsIm51bSIsInNpZ25Db3VudCIsInNpZ25TdXBwbGVtZW50Q291bnQiLCJyZWlzc3VlQ2FyZE51bSIsInN1cHBsZW1lbnRDYXJkTnVtIiwiY2FyZFRvdGFsIiwidG90YWwiXSw0KSk6IiI7CiAgaHRtbCs9JzxkaXYgY2xhc3M9InB0LWdyaWQiPicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuW9k+WJjeaAu+enr+WIhjwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSIgc3R5bGU9ImNvbG9yOnZhcigtLWJyYW5kKSI+Jytlc2ModG90YWx8fCItLSIpKyc8L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InB0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ooaXnrb7ljaE8L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKGNhcmROdW18fCItLSIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzdWIiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgc3R5bGU9Im1hcmdpbi10b3A6NHB4IiBvbmNsaWNrPSJzdXBHYWluKCkiPuenr+WIhuWFkeaNouihpeetvuWNoTwvYnV0dG9uPjwvZGl2PjwvZGl2PicKICAgICsnPC9kaXY+JzsKICAvLyDnm7Lnm5Lov5vluqbvvIh2Mi4xNC4xNCDotbfnlLHpppbpobXov4Hnp7voh7PmraTvvIkKICBjb25zdCBjb250PU51bWJlcihhY2MuY29udGludWVEYXlzfHwwKTsKICBjb25zdCBiRGF5PWNvbnQ9PT0wPzA6KChjb250LTEpJTMwKSsxO2NvbnN0IGJSb3VuZD1jb250PT09MD8wOk1hdGguY2VpbChjb250LzMwKTtjb25zdCBiUGN0PU1hdGgucm91bmQoKGJEYXkvMzApKjEwMCk7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImJsaW5kIiBzdHlsZT0ibWFyZ2luOjAgMCAxMnB4Ij48ZGl2IGNsYXNzPSJibGluZC10b3AiPjxzcGFuPuebsuebkui/m+W6pu+8iOesrCcrYlJvdW5kKyfova7vvIk8L3NwYW4+PHNwYW4gY2xhc3M9InIgbnVtIj4nK2JEYXkrJyAvIDMwIMK3ICcrYlBjdCsnJSDCtyDov57nrb4gJytjb250Kycg5aSpPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImJsaW5kLWJhciI+PGRpdiBjbGFzcz0iYmxpbmQtZmlsbCIgc3R5bGU9IndpZHRoOicrYlBjdCsnJSI+PC9kaXY+PC9kaXY+PC9kaXY+JzsKICAvLyDnrb7liLDml6XljoYKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5jaGVjaysn562+5Yiw5pel5Y6GIMK3ICcrZXNjKG1vbnRoKSsnPC9oND48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InB0TW9udGhTaGlmdCgtMSkiPuS4iuaciDwvYnV0dG9uPjwvZGl2Pic7CiAgY29uc3QgZGF5cz0oY2FsJiZjYWwuZGF0YSYmY2FsLmRhdGEubm93U2lnbkRldGFpbFZvcyl8fFtdOwogIGlmKGRheXMubGVuZ3RoKXsKICAgIGh0bWwrPWNhbEh0bWwoZGF5cyxtb250aCxhY2MudXNlcklkKTsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtwYWRkaW5nOjhweCAwIj4nKyhjYWwmJmNhbC5tZXNzYWdlP2VzYyhjYWwubWVzc2FnZSk6IuaXpeWOhuWKoOi9veWksei0pe+8iOWPr+iDvemZkOa1ge+8jOeojeWQjuWGjeivle+8iSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICAvLyB2Mi4xNC4yMSDliKDpmaTnp6/liIbmtYHmsLTvvIjnp6/liIbor6bmg4XvvInljLrlnZcKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+56ev5YiG5pWw5o2u5p2l6Ieq5p6B5qC45a6e5pe2IEFQSSDCtyDooaXnrb7pmZAgMzAg5aSp5YaF5ryP562+77yM5q+P5qyh5raI6ICXIDEg5byg6KGl562+5Y2hPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQpmdW5jdGlvbiBjYWxIdG1sKGRheXMsbW9udGgsdXNlcklkKXsKICBjb25zdCB5bT1tb250aC5zcGxpdCgiLSIpO2NvbnN0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSk7CiAgY29uc3QgZmlyc3Q9bmV3IERhdGUoeSxtLTEsMSkuZ2V0RGF5KCk7CiAgY29uc3QgZGltPW5ldyBEYXRlKHksbSwwKS5nZXREYXRlKCk7CiAgY29uc3QgdG9kYXk9bmV3IERhdGUoKTtjb25zdCB0U3RyPXRvZGF5LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyh0b2RheS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKHRvZGF5LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGxldCBoPSc8ZGl2IGNsYXNzPSJjYWwtZ3JpZCI+JzsKICBbIuaXpSIsIuS4gCIsIuS6jCIsIuS4iSIsIuWbmyIsIuS6lCIsIuWFrSJdLmZvckVhY2godz0+e2grPSc8ZGl2IGNsYXNzPSJjYWwtd2QiPicrdysnPC9kaXY+J30pOwogIGZvcihsZXQgaT0wO2k8Zmlyc3Q7aSsrKWgrPSc8ZGl2IGNsYXNzPSJjYWwtZCBibGFuayI+PC9kaXY+JzsKICBmb3IobGV0IGQ9MTtkPD1kaW07ZCsrKXsKICAgIGNvbnN0IGRzPW1vbnRoKyItIitTdHJpbmcoZCkucGFkU3RhcnQoMiwiMCIpOwogICAgY29uc3QgZW50cnk9ZGF5cy5maW5kKHg9PnguY3JlYXRlRGF0ZT09PWRzKTsKICAgIGNvbnN0IHNpZ25lZD1lbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApOwogICAgY29uc3QgaXNUb2RheT1kcz09PXRTdHI7CiAgICBjb25zdCBmdXR1cmU9ZHM+dFN0cjsKICAgIGxldCBjbHM9ImNhbC1kIisoc2lnbmVkPyIgc2lnbmVkIjooZnV0dXJlPyIgZnV0dXJlIjooZW50cnk/IiBtaXNzIjoiIikpKTsKICAgIGlmKGlzVG9kYXkpY2xzKz0iIHRvZGF5IjsKICAgIGNvbnN0IGNsaWNrYWJsZT0hc2lnbmVkJiYhZnV0dXJlJiZlbnRyeTsKICAgIGgrPSc8ZGl2IGNsYXNzPSInK2NscysnIiAnKyhjbGlja2FibGU/J3N0eWxlPSJjdXJzb3I6cG9pbnRlciIgb25jbGljaz0ic3VwQ29uc3VtZShcJycrZHMrJ1wnLFwnJytlc2ModXNlcklkKSsnXCcpIic6JycpKyc+JwogICAgICArJzxzcGFuPicrZCsnPC9zcGFuPicKICAgICAgKyc8c3BhbiBjbGFzcz0iZG90Ij4nKyhzaWduZWQ/IuKckyI6KGZ1dHVyZT8iIjooZW50cnk/Iua8jyI6IiIpKSkrJzwvc3Bhbj4nCiAgICAgICsnPC9kaXY+JzsKICB9CiAgaCs9JzwvZGl2Pic7CiAgaCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPueCueWHu+OAjOa8j+OAjeaXpeacn+S9v+eUqOihpeetvuWNoeihpeetvu+8iOmcgOWFiOacieihpeetvuWNoe+8iTwvZGl2Pic7CiAgcmV0dXJuIGg7Cn0KZnVuY3Rpb24gcHRNb250aFNoaWZ0KGRpcil7CiAgY29uc3QgY3VyPVBULm1vbnRofHxuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IHltPWN1ci5zcGxpdCgiLSIpO2xldCB5PU51bWJlcih5bVswXSksbT1OdW1iZXIoeW1bMV0pK2RpcjsKICBpZihtPDEpe209MTI7eS0tfWlmKG0+MTIpe209MTt5Kyt9CiAgUFQubW9udGg9eSsiLSIrU3RyaW5nKG0pLnBhZFN0YXJ0KDIsIjAiKTsKICAvLyDorrDlvZXorr7nva7or6XmnIjku73nmoTlvZPlpKnvvIzot6jmnIjlkI4gcmVuZGVyUG9pbnRzIOaNruatpOaKiua7nueVmeeahOS4iuaciOiHquWKqOWkjeS9jeWIsOW9k+WJjeaciAogIGNvbnN0IGQ9bmV3IERhdGUoKTsKICBQVC5tb250aFNldERheT1kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICByZW5kZXJQb2ludHMoKTsKfQphc3luYyBmdW5jdGlvbiBzdXBDb25zdW1lKGRhdGUsdXNlcklkKXsKICBjb25maXJtRGlhbG9nKCLnp6/liIbooaXnrb4iLCLkvb/nlKggMSDlvKDooaXnrb7ljaHooaXnrb4gIitkYXRlKyIg77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuihpeetvuS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJjb25zdW1lIix1c2VySWQse2RhdGVUaW1lOmRhdGV9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLooaXnrb7miJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi6KGl562+5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTooaXnrb4iKTsKfQphc3luYyBmdW5jdGlvbiBzdXBHYWluKCl7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uZmlybURpYWxvZygi5YWR5o2i6KGl562+5Y2hIiwi5L2/55So56ev5YiG5YWR5o2iIDEg5byg6KGl562+5Y2h77yfIixhc3luYyBmdW5jdGlvbigpewogICAgdG9hc3QoIuWFkeaNouS4reKApiIsImluZm8iKTsKICAgIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zdXBwbGVtZW50KCJnYWluIixhY2MudXNlcklkLHt9KTsKICAgIGlmKGQmJmQub2spe3RvYXN0KCLlhZHmjaLmiJDlip8iLCJvayIpO3JlbmRlclBvaW50cygpfQogICAgZWxzZSB0b2FzdCgi5YWR5o2i5aSx6LSl77yaIisoKGQmJihkLm1lc3NhZ2V8fGQuZXJyb3IpKXx8IuacquefpSIpLCJlcnIiKTsKICB9LCLnoa7orqTlhZHmjaIiKTsKfQoKLyogPT09PT09PT09PT09PT09PT0gdjIuMTYuMCDpqpHooYzpobXvvIjpmpDol4/pqpHooYzmlbDmja7vvJrmnoHpgJ8v5oCl5Yqg6YCfL+aApeWIuS/ljovlvK/vvIkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFJUPXthY2NJZHg6MCxtb250aDoiIixtb250aFNldERheToiIix0cmFja3M6bnVsbCx0cmFja3NBdDoiIix0cmFja3NSaWRlczowLHRyYWNrc0RheXM6MCxzY2FubmluZzpmYWxzZSxzY2FuRXJyOiIiLHZpbjoiIixkYXlDYWNoZTpbXX07CmZ1bmN0aW9uIHJ0Q3VyTW9udGgoKXtjb25zdCBuPW5ldyBEYXRlKCk7cmV0dXJuIG4uZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG4uZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIil9CmZ1bmN0aW9uIHJ0TW9udGhTaGlmdChkaXIpewogIGNvbnN0IGN1cj1SVC5tb250aHx8cnRDdXJNb250aCgpOwogIGNvbnN0IHltPWN1ci5zcGxpdCgiLiIpO2xldCB5PU51bWJlcih5bVswXSksbT1OdW1iZXIoeW1bMV0pK2RpcjsKICBpZihtPDEpe209MTI7eS0tfWlmKG0+MTIpe209MTt5Kyt9CiAgUlQubW9udGg9eSsiLiIrU3RyaW5nKG0pLnBhZFN0YXJ0KDIsIjAiKTsKICBjb25zdCBkPW5ldyBEYXRlKCk7UlQubW9udGhTZXREYXk9ZC5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgcmVuZGVyUmlkZVBhZ2UoKTsKfQpmdW5jdGlvbiBydFdlZWtkYXkoZGspewogIHRyeXtjb25zdCBwPVN0cmluZyhka3x8IiIpLnNwbGl0KCIuIik7Y29uc3QgZD1uZXcgRGF0ZShOdW1iZXIocFswXSksTnVtYmVyKHBbMV0pLTEsTnVtYmVyKHBbMl0pKTtpZihpc05hTihkLmdldFRpbWUoKSkpcmV0dXJuIiI7cmV0dXJuICIg5ZGoIitbIuaXpSIsIuS4gCIsIuS6jCIsIuS4iSIsIuWbmyIsIuS6lCIsIuWFrSJdW2QuZ2V0RGF5KCldfWNhdGNoKGUpe3JldHVybiIifQp9CmZ1bmN0aW9uIHJ0RGF5SHRtbChkLGkpewogIGNvbnN0IG1kPVN0cmluZyhkLmRrfHwiIikuc3BsaXQoIi4iKTsKICBjb25zdCBsYWJlbD1tZC5sZW5ndGg9PT0zPyhtZFsxXSsiLiIrbWRbMl0pOlN0cmluZyhkLmRrfHwiIik7CiAgY29uc3Qga21UeHQ9ZC5rbT4wPyhkLmttPj0xMDA/ZC5rbS50b0ZpeGVkKDApOmQua20udG9GaXhlZCgxKSkrImttIjoiIjsKICBjb25zdCBkdXJUeHQ9ZC5kdXI+MD8oZm10TWluKGQuZHVyKXx8KE1hdGgucm91bmQoZC5kdXIpKyJtaW4iKSk6IiI7CiAgY29uc3QgY2xpY2s9ZC5yaWRlcy5sZW5ndGg/JyBzdHlsZT0iY3Vyc29yOnBvaW50ZXIiIG9uY2xpY2s9InJ0UmlkZVNoZWV0KCcraSsnKSInOiIiOwogIHJldHVybiAnPGRpdiBjbGFzcz0icnQtZGF5IicrY2xpY2srJz4nCiAgICArJzxkaXYgY2xhc3M9InJ0LXRvcCI+PHNwYW4gY2xhc3M9InJ0LWRhdGUiPicrZXNjKGxhYmVsKSsnPHNwYW4gY2xhc3M9IndkIj4nK2VzYyhydFdlZWtkYXkoZC5kaykpKyc8L3NwYW4+PC9zcGFuPjxzcGFuIGNsYXNzPSJydC1rbSBudW0iPicrZXNjKFtrbVR4dCxkdXJUeHRdLmZpbHRlcihCb29sZWFuKS5qb2luKCIgwrcgIil8fCItLSIpKyc8L3NwYW4+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1jaGlwcyI+JwogICAgKyc8c3BhbiBjbGFzcz0icnQtY2hpcCI+5p6B6YCfPGIgY2xhc3M9Im51bSI+JysoZC5tYXhWPjA/TWF0aC5yb3VuZChkLm1heFYpOiItLSIpKyc8L2I+PC9zcGFuPicKICAgICsnPHNwYW4gY2xhc3M9InJ0LWNoaXAiPuaApeWKoOmAnzxiIGNsYXNzPSJudW0iPicrZC5hY2NlbCsnPC9iPjwvc3Bhbj4nCiAgICArJzxzcGFuIGNsYXNzPSJydC1jaGlwJysoZC5jYWw/JyBjYWwnOicnKSsnIj7mgKXliLk8YiBjbGFzcz0ibnVtIj4nK2QuYnJha2VzKyc8L2I+PC9zcGFuPicKICAgICsnPHNwYW4gY2xhc3M9InJ0LWNoaXAnKyhkLmNhbD8nIGNhbCc6JycpKyciPuWOi+W8rzxiIGNsYXNzPSJudW0iPicrZC5iZW5kcysnPC9iPjwvc3Bhbj4nCiAgICArKGQucmlkZXMubGVuZ3RoPyc8c3BhbiBjbGFzcz0icnQtY2hpcCBsaW5rIj7ovajov7kgJytkLnJpZGVzLmxlbmd0aCsnIOi2nyDigLo8L3NwYW4+JzoiIikKICAgICsnPC9kaXY+PC9kaXY+JzsKfQpmdW5jdGlvbiBydFJpZGVTaGVldChpKXsKICBjb25zdCBkPShSVC5kYXlDYWNoZXx8W10pW2ldOwogIGlmKCFkfHwhZC5yaWRlc3x8IWQucmlkZXMubGVuZ3RoKXJldHVybjsKICBjb25zdCBodG1sPWQucmlkZXMubWFwKHI9PnsKICAgIGNvbnN0IHN0YXJ0PXIudDBzdHI/ci50MHN0ci5zbGljZSgxMSwxNik6KHIudDA/Zm10VGltZShuZXcgRGF0ZShyLnQwKS50b0lTT1N0cmluZygpKS5zbGljZSgxMSwxNik6Ii0tOi0tIik7CiAgICBjb25zdCBlbmQ9ci50MXN0cj9yLnQxc3RyLnNsaWNlKDExLDE2KToiIjsKICAgIGNvbnN0IGttPXIuc3J2S20+MD9yLnNydkttOnIua207CiAgICBjb25zdCBkdXI9ci5zcnZEdXI+MD9yLnNydkR1cjpyLmR1cjsKICAgIGNvbnN0IGF2Zz1kdXI+MD8oa20vKGR1ci82MCkpOjA7CiAgICByZXR1cm4gJzxkaXYgY2xhc3M9ImZsb3ctaXRlbSI+PGRpdiBzdHlsZT0iZmxleDoxO21pbi13aWR0aDowIj48ZGl2IGNsYXNzPSJubSI+Jytlc2Moc3RhcnQpKyhlbmQ/KCcg4oaSICcrZXNjKGVuZCkpOiIiKSsnIOmqkeihjDwvZGl2PicKICAgICAgKyhyLmFkZHI/JzxkaXYgY2xhc3M9InRtIiBzdHlsZT0id2hpdGUtc3BhY2U6bm9ybWFsIj4nK2VzYyhyLmFkZHIpKyc8L2Rpdj4nOiIiKQogICAgICArJzxkaXYgY2xhc3M9InRtIj4nK2VzYyhrbS50b0ZpeGVkKDEpKSsna20gwrcgJytlc2MoZm10TWluKGR1cil8fChNYXRoLnJvdW5kKGR1cikrIm1pbiIpKSsnIMK3IOWdh+mAnyAnK01hdGgucm91bmQoYXZnKSsna20vaCDCtyDmnoHpgJ8gJytNYXRoLnJvdW5kKHIubWF4VikrJzwvZGl2PicKICAgICAgKyc8ZGl2IGNsYXNzPSJ0bSI+5oCl5Yqg6YCfICcrci5zcnZBY2NlbCsnIMK3IOaApeWIuSAnK3IuYnJha2VzKycgwrcg5Y6L5byvICcrci5iZW5kcysn77yI6ZqQ6JeP566X5rOV77yJPC9kaXY+PC9kaXY+JwogICAgICArKHIudGh1bWI/JzxpbWcgc3JjPSInK2VzYyhyLnRodW1iKSsnIiBzdHlsZT0id2lkdGg6NTJweDtoZWlnaHQ6NTJweDtib3JkZXItcmFkaXVzOjEwcHg7b2JqZWN0LWZpdDpjb3ZlcjttYXJnaW4tbGVmdDo4cHg7ZmxleC1zaHJpbms6MCIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JzoiIikKICAgICAgKyc8L2Rpdj4nOwogIH0pLmpvaW4oIiIpOwogIG9wZW5TaGVldCgoZC5ka3x8IiIpKyIg6aqR6KGM5piO57uGIixJLm1hcCxodG1sKyc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7ph4znqIsv5pe26ZW/L+aegemAny/mgKXliqDpgJ/kuLrmnI3liqHnq6/nnJ/lgLzvvIjmgKXliqDpgJ895pyN5Yqh56uv6K6h5qyh77yJ77yb5oCl5Yi5L+WOi+W8r+S4uumakOiXj+eul+azleiuoeaVsO+8iOenu+akjSBTcGVlZEh1bnRlcu+8jOWPjOeql+WPo+WQiOW5tuWQjiDDlzIuNSDmoIflrprvvIk8L2Rpdj4nKTsKfQphc3luYyBmdW5jdGlvbiBydFNjYW4oKXsKICBpZihSVC5zY2FubmluZylyZXR1cm47CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbUlQuYWNjSWR4XXx8e307CiAgaWYoIWFjYy51c2VySWQpe3RvYXN0KCLor6XotKblj7fnvLrlsJHnlKjmiLdJRCIsImVyciIpO3JldHVybn0KICBjb25zdCBtb250aD1SVC5tb250aHx8cnRDdXJNb250aCgpOwogIFJULnNjYW5uaW5nPXRydWU7UlQuc2NhbkVycj0iIjtyZW5kZXJSaWRlUGFnZSgpOwogIHRvYXN0KCLmraPlnKjmi4nlj5YgIittb250aCsiIOi9qOi/ueW5tuiuoeeul+makOiXj+aVsOaNruKApiIsImluZm8iKTsKICBsZXQgYWxsRGF5cz1bXSxyaWRlcz0wLGVycj0iIjsKICB0cnl7CiAgICBmb3IobGV0IHBhZ2U9MTtwYWdlPD0xNTtwYWdlKyspewogICAgICBjb25zdCByPWF3YWl0IEJhY2tlbmQucmlkZVRyYWNrKGFjYy51c2VySWQsUlQudmlufHwiIixwYWdlLDIwLG1vbnRoKTsKICAgICAgaWYoIXJ8fCFyLm9rKXtlcnI9KHImJihyLmVycm9yfHxyLm1lc3NhZ2UpKXx8IuaOpeWPo+aXoOWTjeW6lCI7YnJlYWt9CiAgICAgIGlmKHIudmluTm8mJiFSVC52aW4pUlQudmluPXIudmluTm87CiAgICAgIGNvbnN0IGRheXM9QXJyYXkuaXNBcnJheShyLmRheXMpP3IuZGF5czpbXTsKICAgICAgbGV0IGNudD0wOwogICAgICBmb3IoY29uc3QgZGQgb2YgZGF5cylpZihkZCYmQXJyYXkuaXNBcnJheShkZC5oaXN0b3J5TGlzdCkpY250Kz1kZC5oaXN0b3J5TGlzdC5sZW5ndGg7CiAgICAgIGFsbERheXM9YWxsRGF5cy5jb25jYXQoZGF5cyk7cmlkZXMrPWNudDsKICAgICAgaWYoY250PT09MClicmVhazsKICAgIH0KICB9Y2F0Y2goZSl7ZXJyPVN0cmluZyhlKX0KICBpZihhbGxEYXlzLmxlbmd0aCl7CiAgICBSVC50cmFja3M9cmlkZURheVNjYW4oYWxsRGF5cyk7CiAgICBSVC50cmFja3NBdD1mbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7UlQudHJhY2tzUmlkZXM9cmlkZXM7CiAgICBsZXQgbkRheXM9MDtmb3IoY29uc3QgayBpbiBSVC50cmFja3MpaWYoUlQudHJhY2tzW2tdJiZSVC50cmFja3Nba10ucmlkZXMmJlJULnRyYWNrc1trXS5yaWRlcy5sZW5ndGgpbkRheXMrKzsKICAgIFJULnRyYWNrc0RheXM9bkRheXM7CiAgICBpZighbkRheXMpUlQuc2NhbkVycj0i5o6l5Y+j5bey6L+e6YCa77yM5L2G5pyq6L+U5Zue6L2o6L+55pWw5o2u77yI6K+l6L2m5pqC5peg5Y6G5Y+y6L2o6L+56K6w5b2V77yJIjsKICB9ZWxzZXsKICAgIFJULnNjYW5FcnI9ZXJyfHwi5pyq5Y+W5Yiw6L2o6L+55pWw5o2u77yI6K+l6L2m5Y+v6IO95rKh5pyJ5Y6G5Y+y6L2o6L+56K6w5b2V77yJIjsKICB9CiAgUlQuc2Nhbm5pbmc9ZmFsc2U7CiAgcmVuZGVyUmlkZVBhZ2UoKTsKICBpZihSVC5zY2FuRXJyKXRvYXN0KFJULnNjYW5FcnIsImVyciIpO2Vsc2UgdG9hc3QoIui9qOi/ueaJq+aPj+WujOaIkO+8miIrcmlkZXMrIiDotp/ooYznqIsiLCJvayIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclJpZGVQYWdlKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VSaWRlIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihSVC5hY2NJZHg+PWxpc3QubGVuZ3RoKVJULmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1JULmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInJ0IikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjxwPuivt+WIsOiuvue9rumhteihpeWFqOeUqOaIt0lEPC9wPjwvZGl2Pic7cmV0dXJufQogIGNvbnN0IF9ub3c9bmV3IERhdGUoKTsKICBjb25zdCBfY3VyTT1ydEN1ck1vbnRoKCk7CiAgY29uc3QgX3RkeT1fbm93LmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcoX25vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihSVC5tb250aCYmUlQubW9udGhTZXREYXkmJlJULm1vbnRoU2V0RGF5IT09X3RkeSYmUlQubW9udGg8X2N1ck0pe1JULm1vbnRoPSIiO1JULm1vbnRoU2V0RGF5PSIiO30KICBjb25zdCBtb250aD1SVC5tb250aHx8X2N1ck07CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicnQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3pqpHooYzmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBjb25zdCByZXM9YXdhaXQgQmFja2VuZC5yaWRlTW9udGgoYWNjLnVzZXJJZCxtb250aCxSVC52aW58fCIiKTsKICBpZihyZXMmJnJlcy52aW5ObyYmIVJULnZpbilSVC52aW49cmVzLnZpbk5vOwogIGxldCBodG1sPWFjY0NoaXBzSHRtbCgicnQiKTsKICBpZighcmVzfHwhcmVzLm9rKXsKICAgIGVsLmlubmVySFRNTD1odG1sKyc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPumqkeihjOaVsOaNruWKoOi9veWksei0pTwvaDM+PHA+Jytlc2MoKHJlcyYmcmVzLmVycm9yKXx8Iue9kee7nOW8guW4uO+8jOivt+eojeWQjumHjeivlSIpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZW5kZXJSaWRlUGFnZSgpIj7ph43or5U8L2J1dHRvbj48L2Rpdj48L2Rpdj4nOwogICAgcmV0dXJuOwogIH0KICBjb25zdCByZWNvcmRzPShyZXMuZGF0YSYmQXJyYXkuaXNBcnJheShyZXMuZGF0YS5yaWRlUmVjb3JkTGlzdCkpP3Jlcy5kYXRhLnJpZGVSZWNvcmRMaXN0OltdOwogIGNvbnN0IGlzQ3VyPShtb250aD09PV9jdXJNKTsKICAvLyDlkIjlubbovajov7norqHnrpfnu5PmnpzvvJrph4znqIsv5p6B6YCf5pyN5Yqh56uv6Z2eMOS8mOWFiOOAgeS4ujDooaXnrpfvvJvmgKXliLkv5Y6L5byv5oyJ6L2o6L+56YeN566X77yI5pyN5Yqh56uv5bi45bm05Li6MO+8iQogIGNvbnN0IGRheXM9W107CiAgZm9yKGNvbnN0IHJlYyBvZiByZWNvcmRzKXsKICAgIGlmKCFyZWN8fHR5cGVvZiByZWMhPT0ib2JqZWN0Iiljb250aW51ZTsKICAgIGNvbnN0IGRrPXJpZGVOb3JtRGF5KHJlYy5kYXRlKXx8U3RyaW5nKHJlYy5kYXRlfHwiIik7CiAgICBjb25zdCBjb21wPShSVC50cmFja3MmJmRrJiZSVC50cmFja3NbZGtdKXx8bnVsbDsKICAgIGNvbnN0IHNydkttPXJpZGVOdW0ocmVjLnJpZGVNaWxlYWdlKSxzcnZEdXI9cmlkZU51bShyZWMucmlkaW5nVGltZURheVVuaXRNaW51dGUpLHNydk1heD1yaWRlTnVtKHJlYy5tYXhTcGVlZCk7CiAgICBkYXlzLnB1c2goewogICAgICBkazpkaywKICAgICAga206c3J2S20+MD9zcnZLbTooY29tcD9jb21wLmttOjApLAogICAgICBkdXI6c3J2RHVyPjA/c3J2RHVyOihjb21wP2NvbXAuZHVyOjApLAogICAgICBtYXhWOnNydk1heD4wP3Nydk1heDooY29tcD9jb21wLm1heFY6MCksCiAgICAgIGFjY2VsOnJpZGVOdW0ocmVjLmFjY2VsZXJhdGlvblRpbWVzRGF5KSwKICAgICAgYnJha2VzOmNvbXA/Y29tcC5icmFrZXM6cmlkZU51bShyZWMuYnJha2VzVGltZXNEYXkpLAogICAgICBiZW5kczpjb21wP2NvbXAuYmVuZHM6cmlkZU51bShyZWMuYmVuZGluZ1RpbWVzRGF5KSwKICAgICAgY2FsOiEhY29tcCwKICAgICAgcmlkZXM6KGNvbXAmJmNvbXAucmlkZXMpfHxbXQogICAgfSk7CiAgfQogIGRheXMuc29ydCgoYSxiKT0+U3RyaW5nKGIuZGspLmxvY2FsZUNvbXBhcmUoU3RyaW5nKGEuZGspLCJ6aCIpKTsKICBjb25zdCB2aXNpYmxlPWRheXMuZmlsdGVyKGQ9PmQua20+MHx8ZC5kdXI+MHx8ZC5tYXhWPjB8fGQuYWNjZWw+MHx8ZC5icmFrZXM+MHx8ZC5iZW5kcz4wKTsKICBSVC5kYXlDYWNoZT12aXNpYmxlOwogIGxldCBzdW1LbT0wLHN1bUR1cj0wLG1heFY9MCxzdW1BPTAsc3VtQj0wLHN1bUQ9MDsKICBmb3IoY29uc3QgZCBvZiB2aXNpYmxlKXtzdW1LbSs9ZC5rbTtzdW1EdXIrPWQuZHVyO2lmKGQubWF4Vj5tYXhWKW1heFY9ZC5tYXhWO3N1bUErPWQuYWNjZWw7c3VtQis9ZC5icmFrZXM7c3VtRCs9ZC5iZW5kc30KICBjb25zdCBkdXJUeHQ9c3VtRHVyPj02MD8oTWF0aC5mbG9vcihzdW1EdXIvNjApKyJoIitTdHJpbmcoTWF0aC5yb3VuZChzdW1EdXIlNjApKS5wYWRTdGFydCgyLCIwIikrIm0iKTooc3VtRHVyPjA/KE1hdGgucm91bmQoc3VtRHVyKSsibWluIik6IjAiKTsKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5tYXArJ+makOiXj+mqkeihjOaVsOaNriDCtyAnK2VzYyhtb250aCkrJzwvaDQ+PHNwYW4gc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InJ0TW9udGhTaGlmdCgtMSkiPuS4iuaciDwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icnRNb250aFNoaWZ0KDEpIj7kuIvmnIg8L2J1dHRvbj48L3NwYW4+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1ncmlkIj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ph4znqIs8L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKHN1bUttPjA/c3VtS20udG9GaXhlZCgxKToiMCIpKyc8c3BhbiBjbGFzcz0idSI+a208L3NwYW4+PC9kaXY+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5pe26ZW/PC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIj4nK2VzYyhkdXJUeHQpKyc8L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7mnoHpgJ88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKG1heFY+MD9TdHJpbmcoTWF0aC5yb3VuZChtYXhWKSk6Ii0tIikrJzxzcGFuIGNsYXNzPSJ1Ij5rbS9oPC9zcGFuPjwvZGl2PjwvZGl2PicKICAgICsnPC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1ncmlkMyI+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5oCl5Yqg6YCfPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIGJyYW5kIj4nK3N1bUErJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuaApeWIuTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSBicmFuZCI+JytzdW1CKyc8L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ljovlvK88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0gYnJhbmQiPicrc3VtRCsnPC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9ImhpbnQiPuWumOaWuSBBcHAg5oqK6L+Z5Lqb5a2X5q616JeP5LqG6LW35p2l77yI6L2m5Z6L6IO95Yqb5L2N5o6n5Yi277yJ44CC5oCl5Yqg6YCf5p2l6Ieq5pyN5Yqh56uv77yb5oCl5Yi5L+WOi+W8r+WPr+eCueOAjOaJq+aPj+i9qOi/ueOAjeaMiemqkeihjOi9qOi/uemHjeeul+OAgjwvZGl2PjwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuc2Nvb3Rlcisn5q+P5pel6K6w5b2VPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPicKICAgICsoUlQuc2Nhbm5pbmc/JzxidXR0b24gY2xhc3M9ImJ0biBzbSIgc3R5bGU9Im9wYWNpdHk6LjYiPuaJq+aPj+S4reKApjwvYnV0dG9uPic6JzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJydFNjYW4oKSI+5omr5o+P6L2o6L+5PC9idXR0b24+JykKICAgICsnPC9zcGFuPjwvZGl2Pic7CiAgaWYodmlzaWJsZS5sZW5ndGgpewogICAgaHRtbCs9dmlzaWJsZS5tYXAoKGQsaSk9PnJ0RGF5SHRtbChkLGkpKS5qb2luKCIiKTsKICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtwYWRkaW5nOjhweCAwIj7or6XmnIjmmoLml6DpqpHooYzorrDlvZXvvIjmjaLkuKrmnIjku73miJbnoa7orqTotKblj7flt7Lnu5HlrprovabovobvvIk8L2Rpdj4nOwogIH0KICBodG1sKz0nPGRpdiBjbGFzcz0iaGludCI+6L2o6L+55oyJ5omA6YCJ5pyI5Lu95p+l6K+i77yI5q+P5qyhIDIwIOi2n+iHquWKqOe/u+mhte+8jOacgOWkmiAxNSDpobXvvIk8L2Rpdj4nOwogIGlmKFJULnRyYWNrc0F0KWh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50Ij7kuIrmrKHmiavmj4/vvJonK2VzYyhSVC50cmFja3NBdCkrJyDCtyAnK051bWJlcihSVC50cmFja3NSaWRlc3x8MCkrJyDotp8gLyAnK051bWJlcihSVC50cmFja3NEYXlzfHwwKSsnIOWkqTwvZGl2Pic7CiAgaWYoUlQuc2NhbkVycilodG1sKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9ImNvbG9yOnZhcigtLWVycikiPicrZXNjKFJULnNjYW5FcnIpKyc8L2Rpdj4nOwogIGh0bWwrPSc8L2Rpdj4nOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7mlbDmja7mnaXmupDvvJrmnoHmoLggbXlSaWRlSW5mbyAvIHJpZGV0cmFja192MiDCtyDljovlvK8v5oCl5Yi5566X5rOV56e75qSN6IeqIFplZWhvIFNwZWVkSHVudGVy77yIQUdQTC0zLjDvvInvvIzku4XkvpvlrabkuaDnoJTnqbY8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNC45IOi9pui+humhte+8iOebkeaOpyArIOi9puaOp+aJqeWxlSArIOS/oeaBr+S4reW/g++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgVkg9e2FjY0lkeDowLHZpbjoiIixjcDoiIixsb2NrVHlwZToiMSIsYnM6bnVsbH07Ci8vIHYyLjE2LjYg5q+P6L2m54us56uL55S15rGg6K6+572u77ya5a2Y5YKo57uT5p6EIHsgIjx2aW4+Ijoge2FoLHZGdWxsLHZFbXB0eX0gfe+8m+aXp+eJiOaJgeW5s+agvOW8j+WcqOivu+WPli/kv53lrZjml7bov4Hnp7vliLDkvKDlhaXnmoQgdmluCmZ1bmN0aW9uIHJpZGVCYXR0Q2ZnKHZpbil7dHJ5e2NvbnN0IHM9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiemhfYmF0dF9jZmciKXx8Int9Iil8fHt9O2lmKHR5cGVvZiBzLmFoIT09InVuZGVmaW5lZCJ8fHR5cGVvZiBzLnZGdWxsIT09InVuZGVmaW5lZCJ8fHR5cGVvZiBzLnZFbXB0eSE9PSJ1bmRlZmluZWQiKXtjb25zdCBtPXt9O2lmKHZpbiltW3Zpbl09e2FoOk51bWJlcihzLmFofHwwKSx2RnVsbDpOdW1iZXIocy52RnVsbHx8MCksdkVtcHR5Ok51bWJlcihzLnZFbXB0eXx8MCl9O2xvY2FsU3RvcmFnZS5zZXRJdGVtKCJ6aF9iYXR0X2NmZyIsSlNPTi5zdHJpbmdpZnkobSkpO3JldHVybiBtW3Zpbl18fHt9O31yZXR1cm4gKHZpbiYmc1t2aW5dKXx8e307fWNhdGNoKGUpe3JldHVybnt9fX0KZnVuY3Rpb24gc2F2ZUJhdHRDZmcoKXsKICBjb25zdCB2aW49VkgudmlufHwiIjtpZighdmluKXt0b2FzdCgi6K+35YWI6YCJ5oup6L2m6L6G5YaN5L+d5a2YIiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBhaD1OdW1iZXIoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aF9iYXR0X2FoIil8fHt9KS52YWx1ZXx8MCk7CiAgY29uc3QgdkZ1bGw9TnVtYmVyKChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmhfYmF0dF92ZnVsbCIpfHx7fSkudmFsdWV8fDApOwogIGxldCBzO3RyeXtzPUpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oInpoX2JhdHRfY2ZnIil8fCJ7fSIpfHx7fX1jYXRjaChlKXtzPXt9fQogIGNvbnN0IG1hcD0odHlwZW9mIHMuYWghPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkZ1bGwhPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkVtcHR5IT09InVuZGVmaW5lZCIpP3t9OnM7CiAgY29uc3QgY3VyPW1hcFt2aW5dfHx7fTsKICBtYXBbdmluXT17YWg6YWg+MD9haDowLHZGdWxsOnZGdWxsPjA/dkZ1bGw6MCx2RW1wdHk6Y3VyLnZFbXB0eXx8MH07CiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oInpoX2JhdHRfY2ZnIixKU09OLnN0cmluZ2lmeShtYXApKTsKICB0b2FzdCgi55S15rGg6K6+572u5bey5L+d5a2Y77yI57uR5a6a5b2T5YmN6L2m6L6G77yJIiwib2siKTtyZW5kZXJWZWhpY2xlUGFnZSgpOwp9CmFzeW5jIGZ1bmN0aW9uIHJlbmRlclZlaGljbGVQYWdlKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VWZWhpY2xlIik7aWYoIWVsKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7mmoLml6DotKblj7c8L2gzPjxwPuivt+WFiOWcqOmmlumhteWKoOi9veaVsOaNruaIluWcqOiuvue9rumhtea3u+WKoOi0puWPtzwvcD48L2Rpdj4nO3JldHVybn0KICBpZihWSC5hY2NJZHg+PWxpc3QubGVuZ3RoKVZILmFjY0lkeD0wOwogIGNvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07CiAgaWYoIWFjYy51c2VySWQpe2VsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInZoIikrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6K+l6LSm5Y+357y65bCR55So5oi3SUQ8L2gzPjwvZGl2Pic7cmV0dXJufQogIGVsLmlubmVySFRNTD1hY2NDaGlwc0h0bWwoInZoIikrJzxkaXYgY2xhc3M9ImVtcHR5IiBzdHlsZT0icGFkZGluZzo0MHB4IDIwcHgiPjxwIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5Yqg6L296L2m6L6G5pWw5o2u5Lit4oCmPC9wPjwvZGl2Pic7CiAgbGV0IG1vbj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsIiIpOwogIGNvbnN0IHZlaExpc3Q9KG1vbiYmQXJyYXkuaXNBcnJheShtb24udmVoaWNsZXMpKT9tb24udmVoaWNsZXM6W107CiAgaWYoVkgudmluJiZtb24mJm1vbi5vayYmbW9uLnNuYXBzaG90JiZtb24uc25hcHNob3QudmluIT09VkgudmluKXsKICAgIGNvbnN0IG1vbjI9YXdhaXQgQmFja2VuZC52ZWhpY2xlTW9uaXRvcihhY2MudXNlcklkLFZILnZpbik7CiAgICBpZihtb24yJiZtb24yLm9rKXttb24yLnZlaGljbGVzPXZlaExpc3Q7bW9uPW1vbjJ9CiAgfQogIGNvbnN0IFtvcHRzLGluZm8sYnNdPWF3YWl0IFByb21pc2UuYWxsKFsKICAgIEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoe2FjdGlvbjoib3B0aW9ucyIsdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiJ9KSwKICAgIEJhY2tlbmQuaW5mb0NlbnRlcihhY2MudXNlcklkLFZILnZpbnx8IiIpLAogICAgQmFja2VuZC5iYXR0ZXJ5U3RhdGUoYWNjLnVzZXJJZCxWSC52aW58fCIiKQogIF0pOwogIFZILmJzPShicyYmYnMub2spP2JzOm51bGw7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJ2aCIpOwogIC8vIOW9k+WJjeWxleekuui9pui+hu+8iHYyLjE2LjbvvJrnlLXmsaDorr7nva7mjInmraQgdmluIOeLrOeri+S/neWtmO+8m+WNlei9pui0puWPtyBWSC52aW4g5oGS5Li656m677yM6ZyA5Zue5aGr77yJCiAgY29uc3QgY3VyVmluPVZILnZpbnx8KG1vbiYmbW9uLnNuYXBzaG90P21vbi5zbmFwc2hvdC52aW46KHZlaExpc3RbMF18fHt9KS52aW5Obyl8fCIiOwogIFZILnZpbj1jdXJWaW47CiAgLy8g6L2m6L6G6YCJ5oup77yI5aSa6L2m77yJCiAgaWYodmVoTGlzdC5sZW5ndGg+MSl7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ib3B0LXJvdyI+Jyt2ZWhMaXN0Lm1hcCh2PT4nPGJ1dHRvbiBjbGFzcz0ib3B0LWNoaXAgJysoY3VyVmluPT09di52aW5Obz8nb24nOicnKSsnIiBvbmNsaWNrPSJWSC52aW49XCcnK2VzYyh2LnZpbk5vKSsnXCc7cmVuZGVyVmVoaWNsZVBhZ2UoKSI+Jytlc2Modi52ZWhpY2xlVHlwZXx8di52ZWhpY2xlTmFtZXx8di52aW5ObykrJzwvYnV0dG9uPicpLmpvaW4oIiIpKyc8L2Rpdj4nOwogIH0KICAvLyDnirbmgIHnm5HmjqfljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5jYXIrJ+i9pui+hueKtuaAgTwvaDQ+PHNwYW4gc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NnB4Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNob3dWZWhpY2xlRGV0YWlsKCcrVkguYWNjSWR4KycpIj7or6bmg4U8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InJlbmRlclZlaGljbGVQYWdlKCkiPuWIt+aWsDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nOwogIGlmKG1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QpewogICAgY29uc3Qgc249bW9uLnNuYXBzaG90OwogICAgY29uc3Qgc29jQ29sPXNuLnNvYzw9MjA/InZhcigtLWVycikiOnNuLnNvYzw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tb2spIjsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Ymp5L2Z55S16YePPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSIgc3R5bGU9ImNvbG9yOicrc29jQ29sKyciPicrKHNuLnNvYyE9bnVsbD9zbi5zb2MrIiUiOiItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Ymp5L2Z57ut6IiqPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jysoc24ucmFuZ2UhPW51bGw/c24ucmFuZ2UrIiBrbSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7pvpnlpLTplIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrKHNuLmhlYWRMb2NrPT09IjEiPyLlt7LplIEiOiLmnKrplIEiKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuWcqOe6v+eKtuaAgTwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImNvbG9yOicrKHNuLm9mZmxpbmU/InZhcigtLWVycikiOiJ2YXIoLS1vaykiKSsnIj4nKyhzbi5vZmZsaW5lPyLnprvnur/vvIg+MzDliIbpkp/mnKrkuIrmiqXvvIkiOiLlnKjnur8iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuacgOWQjuS4iuaKpTwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpIj4nK2VzYyhzbi5yZWZyZXNoVGltZXx8Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4Ij4nK2VzYygobW9uJiYobW9uLmVycm9yfHxtb24ubWVzc2FnZSkpfHwi5b+r54Wn6I635Y+W5aSx6LSlIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIOi9pui+huaOp+WItuWNoe+8iOS7jummlumhtei/geenu+i/h+adpe+8iQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLnphcCsn6L2m6L6G5o6n5Yi2PC9oND48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9ImN0cmwtZ3JpZCI+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImZpbmQiIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2ZpbmRcJyx0aGlzKSI+JytJLmJlbGwrJ+Wvu+i9pjwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4iIGRhdGEtYWN0PSJsb3VkRmluZCIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnbG91ZEZpbmRcJyx0aGlzKSI+JytJLnZvbCsn6bij56ybPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImN1c2hpb24iIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ2N1c2hpb25cJyx0aGlzKSI+JytJLnNlYXQrJ+WdkOWeqzwvYnV0dG9uPicKICAgICsnPGJ1dHRvbiBjbGFzcz0iY3RybC1idG4gdW5sb2NrIiBkYXRhLWFjdD0idW5sb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCd1bmxvY2tcJyx0aGlzKSI+JytJLnVubG9jaysn5byA6ZSBPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biBsb2NrIiBkYXRhLWFjdD0ibG9jayIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnbG9ja1wnLHRoaXMpIj4nK0kubG9jaysn5YWz6ZSBPC9idXR0b24+JwogICAgKyc8L2Rpdj48L2Rpdj4nOwogIC8vIOi9puaOp+aJqeWxleWNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLnphcCsn6L2m5o6n5omp5bGVPC9oND48L2Rpdj4nOwogIGNvbnN0IGNwcz0ob3B0cyYmQXJyYXkuaXNBcnJheShvcHRzLmNoYXJnZVBvd2VyKSk/b3B0cy5jaGFyZ2VQb3dlcjpbXTsKICBpZihjcHMubGVuZ3RoKXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWJvdHRvbTo0cHgiPuWFheeUteWKn+eOh++8iFfvvIk8L2Rpdj48ZGl2IGNsYXNzPSJvcHQtcm93Ij4nCiAgICAgICtjcHMubWFwKG89Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhWSC5jcD09PW8ua2V5Pydvbic6JycpKyciIG9uY2xpY2s9IlZILmNwPVwnJytlc2Moby5rZXkpKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nKyhvLmtleT09PSIxMjAwIj8i5peg6ZmQ5Yi2Ijplc2Moby5rZXkpKSsnPC9idXR0b24+Jykuam9pbigiIikKICAgICAgKyc8YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iZXh0U2V0KFwnY2hhcmdlUG93ZXJcJykiPuiuvue9rjwvYnV0dG9uPjwvZGl2Pic7CiAgfQogIC8vIHYyLjE2LjUg5YWF55S15Ymp5L2Z5pe26Ze077yI5YWF55S15Lit5LiU5bey6K6+5a656YeP5omN5pi+56S677yJKyDnlLXmsaDorr7nva7vvIh2Mi4xNi42IOaMiSB2aW4g54us56uL77yJCiAgY29uc3QgYmM9cmlkZUJhdHRDZmcoY3VyVmluKTsKICBpZihWSC5icyYmVkguYnMuY2hhcmdpbmcmJk51bWJlcihiYy5haCk+MCYmVkguYnMuc29jPjAmJlZILmJzLnNvYzwxMDAmJlZILmJzLmN1cnJlbnQ+MC41KXsKICAgIGNvbnN0IHJlbWFpbk1pbj1NYXRoLm1heCgxLE1hdGgucm91bmQoTnVtYmVyKGJjLmFoKSooMTAwLVZILmJzLnNvYykvMTAwL1ZILmJzLmN1cnJlbnQqNjApKTsKICAgIGNvbnN0IGhoPU1hdGguZmxvb3IocmVtYWluTWluLzYwKSxtbT1yZW1haW5NaW4lNjA7CiAgICBjb25zdCBvZmZUeHQ9KFZILmJzLmZ1bGxDaGFyZ2VUaW1lU2Vjb25kPjApPygiIMK3IOWumOaWuee6piAiK01hdGgucm91bmQoVkguYnMuZnVsbENoYXJnZVRpbWVTZWNvbmQvNjApKyIg5YiGIik6IiI7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuKPsSDlhYXnlLXliankvZk8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj7nuqYgJysoKGhoPjA/aGgrIiDml7YgIjoiIikrbW0rIiDliIYiKSsnPC9zcGFuPjwvZGl2PicKICAgICAgKyc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoycHgiPuS8sOeulyAnK1ZILmJzLmN1cnJlbnQudG9GaXhlZCgxKSsnQSDCtyAnK1ZILmJzLnNvYysnJSDihpIgJysoYmMudkZ1bGw+MD9iYy52RnVsbCsiViI6IuWFhea7oSIpK29mZlR4dCsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NnB4O2FsaWduLWl0ZW1zOmNlbnRlcjttYXJnaW4tdG9wOjhweDtmbGV4LXdyYXA6d3JhcCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpIj7nlLXmsaDorr7nva48L3NwYW4+JwogICAgKyc8aW5wdXQgaWQ9InZoX2JhdHRfYWgiIHR5cGU9Im51bWJlciIgaW5wdXRtb2RlPSJkZWNpbWFsIiBwbGFjZWhvbGRlcj0i5a656YePIEFoIiB2YWx1ZT0iJysoYmMuYWh8fCIiKSsnIiBzdHlsZT0id2lkdGg6ODZweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O2NvbG9yOnZhcigtLXR4dCk7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4Ij4nCiAgICArJzxpbnB1dCBpZD0idmhfYmF0dF92ZnVsbCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLmu6HnlLUgViIgdmFsdWU9IicrKGJjLnZGdWxsfHwiIikrJyIgc3R5bGU9IndpZHRoOjg2cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjhweDtjb2xvcjp2YXIoLS10eHQpO3BhZGRpbmc6NnB4IDhweDtmb250LXNpemU6MTJweCI+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNhdmVCYXR0Q2ZnKCkiPuS/neWtmDwvYnV0dG9uPjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6NHB4Ij7orr7nva7lrrnph4/lkI7vvIzlhYXnlLXkuK3oh6rliqjkvLDnrpfjgIzlhYXnlLXliankvZnjgI3vvIjlrrnph4/DlygxMDDiiJLnlLXph48lKS8xMDDDt+WFheeUteeUtea1ge+8ie+8m+avj+i9pueLrOeri+S/neWtmO+8jOacquiuvue9ruS4jeaYvuekujwvZGl2Pic7CiAgLy8gdjIuMTQuMjEg5Yig6Zmk6ZmQ6YCf5qGj5L2N6K6+572uCiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g5L+h5oGv5Lit5b+D5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuYmVsbCsn5L+h5oGv5Lit5b+DPC9oND48L2Rpdj4nOwogIGlmKGluZm8mJmluZm8ub2spewogICAgY29uc3QgdW49aW5mby51bnJlYWQhPW51bGw/ZGVlcFBpY2soaW5mby51bnJlYWQsWyJ0b3RhbCIsImNvdW50IiwidW5SZWFkQ291bnQiLCJudW0iXSwzKToiIjsKICAgIGlmKHVuIT09IiIpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7mnKror7vmtojmga88L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh1bikrJzwvc3Bhbj48L2Rpdj4nOwogICAgY29uc3QgcHJpemVzPShpbmZvLnByaXplUmVjb3JkcyYmKGluZm8ucHJpemVSZWNvcmRzLnJlY29yZHN8fGluZm8ucHJpemVSZWNvcmRzLmxpc3R8fGluZm8ucHJpemVSZWNvcmRzKSl8fFtdOwogICAgaWYoQXJyYXkuaXNBcnJheShwcml6ZXMpJiZwcml6ZXMubGVuZ3RoKXsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW46OHB4IDAgNHB4Ij7nm7Lnm5Iv5Lit5aWW6K6w5b2VPC9kaXY+JzsKICAgICAgaHRtbCs9cHJpemVzLnNsaWNlKDAsNSkubWFwKHA9Pic8ZGl2IGNsYXNzPSJmbG93LWl0ZW0iPjxkaXY+PGRpdiBjbGFzcz0ibm0iPicrZXNjKHAucHJpemVzTmFtZXx8cC5uYW1lfHwi5aWW5ZOBIikrJzwvZGl2PjxkaXYgY2xhc3M9InRtIj4nK2VzYyhwLmNyZWF0ZVRpbWV8fHAuY3JlYXRlRGF0ZXx8IiIpKyc8L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJzYyBwbHVzIiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrZXNjKHAuaW50ZWdyYWw/KCIrIitwLmludGVncmFsKToiIikrJzwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogICAgfQogICAgY29uc3QgY291cG9ucz0oaW5mby5jb3Vwb25zJiYoaW5mby5jb3Vwb25zLnJlY29yZHN8fGluZm8uY291cG9ucy5saXN0fHxpbmZvLmNvdXBvbnMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KGNvdXBvbnMpJiZjb3Vwb25zLmxlbmd0aClodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuS8mOaDoOWIuDwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPicrY291cG9ucy5sZW5ndGgrJyDlvKA8L3NwYW4+PC9kaXY+JzsKICAgIGlmKGluZm8ub3RhIT1udWxsKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+T1RBIOWNh+e6pzwvc3Bhbj48c3BhbiBjbGFzcz0idiIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4Ij4nKyhBcnJheS5pc0FycmF5KGluZm8ub3RhKSYmaW5mby5vdGEubGVuZ3RoPyLmnInmlrDniYjmnKwiOiLlt7LmmK/mnIDmlrAiKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChpbmZvJiYoaW5mby5lcnJvcnx8aW5mby5tZXNzYWdlKSl8fCLkv6Hmga/kuK3lv4PliqDovb3lpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPui9puaOp+aJqeWxleaMh+S7pOe7j+S6keerr+S4i+WPke+8jOWTjeW6lOWPr+iDvei+g+aFojwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7Cn0KCmFzeW5jIGZ1bmN0aW9uIGV4dFNldChhY3Rpb24pewogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpO2NvbnN0IGFjYz1saXN0W1ZILmFjY0lkeF07aWYoIWFjY3x8IWFjYy51c2VySWQpcmV0dXJuOwogIGNvbnN0IGJvZHk9e2FjdGlvbjphY3Rpb24sdXNlcklkOmFjYy51c2VySWQsdmluOlZILnZpbnx8IiJ9OwogIGlmKGFjdGlvbj09PSJjaGFyZ2VQb3dlciIpe2lmKCFWSC5jcCl7dG9hc3QoIuivt+WFiOmAieaLqeWFheeUteWKn+eOhyIsImVyciIpO3JldHVybn1ib2R5LnZhbHVlPVZILmNwfQogIHRvYXN0KCLmjIfku6TkuIvlj5HkuK3igKYiLCJpbmZvIik7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnZlaGljbGVDb250cm9sRXh0KGJvZHkpOwogIHRvYXN0KChkJiZkLm1lc3NhZ2UpfHwoKGQmJmQub2spPyLmjIfku6Tlt7LkuIvlj5EiOiLmjIfku6TlpLHotKUiKSwoZCYmZC5vayk/Im9rIjoiZXJyIik7Cn0KCmZ1bmN0aW9uIGluaXQoKXsKICBhcHBseVRoZW1lKCk7YXBwbHlDdXN0b21CZygpO21vdW50U2lnbmluRmFiKCk7CiAgcmVuZGVyQ2ZnKCk7CiAgaWYobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MCl7CiAgICBTVEFURS5kYXRhPURFTU9fREFUQTtTVEFURS50c1RleHQ9Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1NUQVRFLnByb3h5PWZhbHNlOwogICAgcmVuZGVySG9tZSgpO2hpZGVTcGxhc2goKTtyZXR1cm47CiAgfQogIHN0YXJ0QXV0b1JlZnJlc2goKTtyZWZyZXNoQWxsKGZhbHNlKTsKICAvLyB2Mi4xNS42IOeJiOacrOajgOa1i++8mummluWxj+a4suafk+WQjumdmem7mOajgOafpeS4gOasoe+8iOacieaWsOeJiOacrOaJjeaPkOekuu+8iQogIGlmKCFpc0RlbW8oKSlzZXRUaW1lb3V0KCgpPT5jaGVja1ZlcnNpb24oZmFsc2UpLDE1MDApOwogIC8vIOWFnOW6le+8muaegeerr+aDheWGteS4i+ivt+axgumVv+aXtumXtOaXoOWTjeW6lO+8jOmXquWxj+S5n+S4jeiDveS4gOebtOaMoeS9j+eVjOmdogogIHNldFRpbWVvdXQoaGlkZVNwbGFzaCwxMjAwMCk7Cn0KaW5pdCgpOwo8L3NjcmlwdD4KPCEtLV9fSlM1X18tLT4K";
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
    const query = "vinNo=" + encodeURIComponent(vin);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicles/properties/snapshots?" + query, appQueryGetHeaders(acc, query, cfg));
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
  // v2.16.2 加固：jsDelivr 对 @main 分支文件有最长约 12 小时缓存（曾出现其仍返回 2.15.6，
  // 导致“检查更新”误判为已是最新）。改为两源并发拉取、取版本号更高者：
  // raw 约 5 分钟级更新（新版本发布后能立刻探测到），jsDelivr 兜底国内网络可达性。
  const fetched = await Promise.all(VERSION_JSON_URLS.map(async (u) => {
    try {
      const res = await httpGet(u + "?t=" + Math.floor(Date.now() / 300000), {});
      let o = null;
      if (res && res.script) o = res;
      else if (res && typeof res.raw === "string") { try { o = JSON.parse(res.raw); } catch(e) {} }
      return (o && o.script) ? o : null;
    } catch(e) { return null; }
  }));
  let best = null;
  for (const o of fetched) {
    if (o && (!best || verNum(o.script) > verNum(best.script))) best = o;
  }
  if (best) {
    try { $.setdata(JSON.stringify({ ts: Date.now(), latest: best }), VERSION_CK); } catch(e) {}
    return { latest: best, cached: false };
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
    // v2.16.9 设置页表单不含 pics，保存其它配置时保留车辆图片替换配置
    try { if (body && body.pics === undefined) { const _p = JSON.parse($.getdata(CK_CONFIG) || "{}"); if (_p && _p.pics) body.pics = _p.pics; } } catch(e) {}
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
            const qRide = `vinNo=${encodeURIComponent(vinNo)}`;
            const rideRes = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qRide}`, appQueryGetHeaders({ token: token, userId: "" }, qRide, cfg));
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
            const qSoc = url.split("?")[1] || "";
            const res = await httpGet(url, appQueryGetHeaders({ token: token, userId: "" }, qSoc, cfg));
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

    // ========== v2.16.0 API: 隐藏骑行数据 · 月度汇总（myRideInfo 透传，面板「骑行」页用） ==========
  if (method === "GET" && path === "/api/ride-month") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideMonth(acc, getConfig(), String(_u.searchParams.get("month") || ""), String(_u.searchParams.get("vin") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.0 API: 隐藏骑行数据 · 轨迹分页（ridetrack_v2 透传，面板「扫描轨迹」用） ==========
  if (method === "GET" && path === "/api/ride-track") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideTrackPage(acc, getConfig(), _u.searchParams.get("page"), _u.searchParams.get("pageSize"), String(_u.searchParams.get("vin") || ""), String(_u.searchParams.get("month") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
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
        httpGet(T + "/integral/detail?page=" + page + "&pageSize=" + pageSize, appQueryGetHeaders(acc, "page=" + page + "&pageSize=" + pageSize, cfg)),
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
      // 2026-10-13 路径修复：consume（补签）/ gain（积分兑换）必须走官方新路径（含 /H5/），
      // 旧路径 /cfmotoservermine/signInSupplement/* 已被 WAF 拦为 430/30125 permit error
      const H = "https://h5.zeehoev.com/cfmotoservermine/H5/signInSupplement";
      let res = null;
      if (action === "count") {
        // 2026-10-12 HAR 实证：官方 POST /count 的签名把 body "{}" 纳入（md5(sha1("{}"+param+secret)) 与官方样本逐位一致）；
        // 不签 body 会被 WAF 判 430/30121 permit error（补签卡数量/补签流程因此报错）
        res = await httpPost(H + "/count", accHeaders(acc, getSign("h5", {}, "{}", cfg)), "{}");
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

  // ========== v2.16.9 API: 车辆图片替换配置 ==========
  if (path === "/api/pic-cfg") {
    if (method === "GET") {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, pics: getConfig().pics || {} }));
      return;
    }
    if (method === "POST") {
      let r = { ok: false };
      try {
        const body = JSON.parse($request.body || "{}");
        let c = {}; try { c = JSON.parse($.getdata(CK_CONFIG) || "{}") || {}; } catch(e) {}
        const next = {};
        const src = (body.pics && typeof body.pics === "object") ? body.pics : {};
        for (const k of Object.keys(src)) { const u = String(src[k] || "").trim(); if (/^https?:\/\//.test(u)) next[String(k).trim()] = u; }
        c.pics = next;
        saveConfig(c);
        r = { ok: true, count: Object.keys(next).length };
      } catch(e) { r = { ok: false, error: String(e) }; }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
      return;
    }
  }

  // ========== v2.16.5 API: 电池/充电状态（充电剩余时间估算用：电流/电量/电压/充电中） ==========
  if (method === "GET" && path === "/api/battery-state") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      let vin = String(_u.searchParams.get("vin") || "").trim();
      if (!vin) {
        const list = await fetchVehicleList(acc, cfg) || [];
        const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
        if (!vehicles.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未获取到绑定车辆" })); return; }
        vin = vehicles[0].vinNo;
      }
      const b = await fetchBatteryChargeState(acc, cfg, vin);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, vinNo: vin, charging: /充电/.test(String(b.chargeState || "")), current: b.current, soc: b.soc, voltage: b.voltage, chargeState: b.chargeState, fullChargeTime: b.fullChargeTime, fullChargeTimeSecond: b.fullChargeTimeSecond }));
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
        // v2.16.5：1200 档实际语义为「无限制」，文案修正（下发值不变）
        okMsg = "充电功率已设为 " + (val === "1200" ? "无限制" : val + "W");
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
      const hd = (query) => appQueryGetHeaders(acc, query, cfg);
      let vin = String(_u.searchParams.get("vin") || "").trim();
      const out = { ok: true };
      const tasks = [
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/app/Message/allUnRead", hd("")).then(r => { out.unread = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mall/cfmotoservermall/app/coupon/myCoupons?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.coupons = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/activityPrizeRecord/app/page?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.prizeRecords = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/riderank", hd("")).then(r => { out.riderank = r && r.code == "10000" ? r.data : null; })
      ];
      if (!vin) {
        try { const list = await fetchVehicleList(acc, cfg) || []; if (list.length) vin = list[0].vinNo; } catch(e) {}
      }
      if (vin) {
        tasks.push(httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ota/list?vinNo=" + encodeURIComponent(vin), hd("vinNo=" + encodeURIComponent(vin))).then(r => { out.ota = r && r.code == "10000" ? r.data : null; }));
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