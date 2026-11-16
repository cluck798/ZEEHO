/**
 * 极核 ZEEHO 自动签到 —— AutoX.js 版（纯 HTTP，不需要无障碍服务）
 *
 * 运行环境：AutoX.js v7（org.autojs.autoxjs.v7）或任意支持 http / files / device 的 Auto.js 分支
 * 用法：把 token 和 user_id 写进 /sdcard/脚本/zeeho_token.txt（格式：token,user_id），
 *       然后直接在 AutoX 里运行本脚本，保持后台即可。脚本自己跨天重签。
 *
 * 特点：
 *   - 不依赖抓包、代理、无障碍，纯 HTTP + 签名
 *   - token 文件热加载：外部（电脑 / 另一台手机）换了 token，脚本无需重启即可接管
 *   - 每 10 分钟检查一次；token 失效时每 2 分钟快速重试并震动提醒
 *
 * 签名算法（H5 端）：
 *   payload = 排序后的 query + body + "appId=<appId>&nonce=<uuid>&timestamp=<ms>" + appSecret
 *   sign    = md5(sha1(payload))
 * 算法与常量来自 github.com/cluck798/ZEEHO，仅用于学习研究，请遵守原项目许可协议。
 */
var CONFIG = {
    tokenFile: "/sdcard/脚本/zeeho_token.txt",   // 必填：内容为 "token,user_id"
    logFile: "/sdcard/脚本/zeeho_log.txt",       // 运行日志
    token: "",                                    // 运行时从 tokenFile 读取，不用手改
    userId: "",
    checkIntervalMs: 10 * 60 * 1000,              // 正常检查间隔
    retryBadTokenMs: 2 * 60 * 1000                // token 失效后的重试间隔
};

// token 一律从外部文件读取；每轮循环都会检查，文件一变就热加载（无需重启脚本）
var lastTokenRaw = "";
function reloadToken() {
    try {
        if (!files.exists(CONFIG.tokenFile)) return false;
        var raw = files.read(CONFIG.tokenFile).trim();
        if (raw === lastTokenRaw) return false;
        var parts = raw.split(/[,\s]+/);
        var changed = !!parts[0] && parts[0] !== CONFIG.token;
        if (parts[0]) CONFIG.token = parts[0];
        if (parts[1]) CONFIG.userId = parts[1];
        lastTokenRaw = raw;
        if (changed) logLine("token 已加载/更新: " + CONFIG.token.substring(0, 8) + "...");
        return changed;
    } catch (e) { return false; }
}

var H5_APPID = "AiTXmBrm";
var H5_SECRET = "70c2c7458ab88ca9504ad0521f170075bc91f2f7";
var BASE = "https://h5.zeehoev.com/cfmotoservermine";
var UA = "Mozilla/5.0 (Linux; Android 16; 2211133C Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.111 Mobile Safari/537.36 Zeeho/3.0.9 (Xiaomi 2211133C Build/16)";
// 设备指纹：每次启动随机生成一个，签到接口不校验它；如需固定可写死
var DEVICE_ID = uuid4();
var ZUA = "MOBILE|Android|16|ZEEHO_APP|3.0.9|Xiaomi 2211133C|393*873|" + DEVICE_ID + "|4g|AndroidOS";

// ===== 以下 md5 / sha1 由 repo 提取，纯 ES5 实现 =====
function md5(t,e){function n(t,e){return t<<e|t>>>32-e}function r(t,e){var n,r,o,i,a;return o=2147483648&t,i=2147483648&e,a=(1073741823&t)+(1073741823&e),(n=1073741824&t)&(r=1073741824&e)?2147483648^a^o^i:n|r?1073741824&a?3221225472^a^o^i:1073741824^a^o^i:a^o^i}function o(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&e|~t&n}(e,o,i),a),c)),r(n(t,u),e)}function i(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&n|e&~n}(e,o,i),a),c)),r(n(t,u),e)}function a(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t^e^n}(e,o,i),a),c)),r(n(t,u),e)}function u(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return e^(t|~n)}(e,o,i),a),c)),r(n(t,u),e)}function c(t){var e,n="",r="";for(e=0;e<=3;e++)n+=(r="0"+(t>>>8*e&255).toString(16)).substr(r.length-2,2);return n}var s,l,f,p,d,h,v,y,g,m=Array();for(m=function(t){for(var e,n=t.length,r=n+8,o=16*((r-r%64)/64+1),i=Array(o-1),a=0,u=0;u<n;)a=u%4*8,i[e=(u-u%4)/4]=i[e]|t.charCodeAt(u)<<a,u++;return a=u%4*8,i[e=(u-u%4)/4]=i[e]|128<<a,i[o-2]=n<<3,i[o-1]=n>>>29,i}(t=function(t){t=t.replace(/\r\n/g,"\n");for(var e="",n=0;n<t.length;n++){var r=t.charCodeAt(n);r<128?e+=String.fromCharCode(r):r>127&&r<2048?(e+=String.fromCharCode(r>>6|192),e+=String.fromCharCode(63&r|128)):(e+=String.fromCharCode(r>>12|224),e+=String.fromCharCode(r>>6&63|128),e+=String.fromCharCode(63&r|128))}return e}(t)),h=1732584193,v=4023233417,y=2562383102,g=271733878,s=0;s<m.length;s+=16)l=h,f=v,p=y,d=g,h=o(h,v,y,g,m[s+0],7,3614090360),g=o(g,h,v,y,m[s+1],12,3905402710),y=o(y,g,h,v,m[s+2],17,606105819),v=o(v,y,g,h,m[s+3],22,3250441966),h=o(h,v,y,g,m[s+4],7,4118548399),g=o(g,h,v,y,m[s+5],12,1200080426),y=o(y,g,h,v,m[s+6],17,2821735955),v=o(v,y,g,h,m[s+7],22,4249261313),h=o(h,v,y,g,m[s+8],7,1770035416),g=o(g,h,v,y,m[s+9],12,2336552879),y=o(y,g,h,v,m[s+10],17,4294925233),v=o(v,y,g,h,m[s+11],22,2304563134),h=o(h,v,y,g,m[s+12],7,1804603682),g=o(g,h,v,y,m[s+13],12,4254626195),y=o(y,g,h,v,m[s+14],17,2792965006),h=i(h,v=o(v,y,g,h,m[s+15],22,1236535329),y,g,m[s+1],5,4129170786),g=i(g,h,v,y,m[s+6],9,3225465664),y=i(y,g,h,v,m[s+11],14,643717713),v=i(v,y,g,h,m[s+0],20,3921069994),h=i(h,v,y,g,m[s+5],5,3593408605),g=i(g,h,v,y,m[s+10],9,38016083),y=i(y,g,h,v,m[s+15],14,3634488961),v=i(v,y,g,h,m[s+4],20,3889429448),h=i(h,v,y,g,m[s+9],5,568446438),g=i(g,h,v,y,m[s+14],9,3275163606),y=i(y,g,h,v,m[s+3],14,4107603335),v=i(v,y,g,h,m[s+8],20,1163531501),h=i(h,v,y,g,m[s+13],5,2850285829),g=i(g,h,v,y,m[s+2],9,4243563512),y=i(y,g,h,v,m[s+7],14,1735328473),h=a(h,v=i(v,y,g,h,m[s+12],20,2368359562),y,g,m[s+5],4,4294588738),g=a(g,h,v,y,m[s+8],11,2272392833),y=a(y,g,h,v,m[s+11],16,1839030562),v=a(v,y,g,h,m[s+14],23,4259657740),h=a(h,v,y,g,m[s+1],4,2763975236),g=a(g,h,v,y,m[s+4],11,1272893353),y=a(y,g,h,v,m[s+7],16,4139469664),v=a(v,y,g,h,m[s+10],23,3200236656),h=a(h,v,y,g,m[s+13],4,681279174),g=a(g,h,v,y,m[s+0],11,3936430074),y=a(y,g,h,v,m[s+3],16,3572445317),v=a(v,y,g,h,m[s+6],23,76029189),h=a(h,v,y,g,m[s+9],4,3654602809),g=a(g,h,v,y,m[s+12],11,3873151461),y=a(y,g,h,v,m[s+15],16,530742520),h=u(h,v=a(v,y,g,h,m[s+2],23,3299628645),y,g,m[s+0],6,4096336452),g=u(g,h,v,y,m[s+7],10,1126891415),y=u(y,g,h,v,m[s+14],15,2878612391),v=u(v,y,g,h,m[s+5],21,4237533241),h=u(h,v,y,g,m[s+12],6,1700485571),g=u(g,h,v,y,m[s+3],10,2399980690),y=u(y,g,h,v,m[s+10],15,4293915773),v=u(v,y,g,h,m[s+1],21,2240044497),h=u(h,v,y,g,m[s+8],6,1873313359),g=u(g,h,v,y,m[s+15],10,4264355552),y=u(y,g,h,v,m[s+6],15,2734768916),v=u(v,y,g,h,m[s+13],21,1309151649),h=u(h,v,y,g,m[s+4],6,4149444226),g=u(g,h,v,y,m[s+11],10,3174756917),y=u(y,g,h,v,m[s+2],15,718787259),v=u(v,y,g,h,m[s+9],21,3951481745),h=r(h,l),v=r(v,f),y=r(y,p),g=r(g,d);return 32==e?(c(h)+c(v)+c(y)+c(g)).toLowerCase():(c(v)+c(y)).toLowerCase()}
function sha1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4};function lsb_hex(val){var str='';var i;var vh;var vl;for(i=0;i<=6;i+=2){vh=(val>>>(i*4+4))&0x0f;vl=(val>>>(i*4))&0x0f;str+=vh.toString(16)+vl.toString(16)}return str};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16)}return str};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j)}switch(msg_len%4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break}word_array.push(i);while((word_array.length%16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff}var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase()}

// ===== 工具函数 =====
function pad2(n) { return n < 10 ? "0" + n : "" + n; }

function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function monthStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
}

function nowStr() {
    var d = new Date();
    return todayStr() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}

function logLine(msg) {
    var line = "[" + nowStr() + "] " + msg;
    console.log(line);
    try {
        files.append(CONFIG.logFile, line + "\n");
    } catch (e) {}
}

function uuid4() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
    return s4() + s4() + "-" + s4() + "-4" + s4().substring(1) + "-" + s4() + "-" + s4() + s4() + s4();
}

function buildQuery(params) {
    if (!params) return "";
    var keys = Object.keys(params).sort();
    var arr = [];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (params[k] !== undefined && params[k] !== null) arr.push(k + "=" + params[k]);
    }
    return arr.join("&");
}

function getSign(params, bodyStr) {
    var query = buildQuery(params || {});
    var ts = String(new Date().getTime());
    var nonce = uuid4();
    var param = "appId=" + H5_APPID + "&nonce=" + nonce + "&timestamp=" + ts;
    var payload = query + (bodyStr || "") + param + H5_SECRET;
    var sign = md5(sha1(payload), 32);
    return {
        "Cfmoto-X-Param": param,
        "Cfmoto-X-Sign": sign,
        "Cfmoto-X-Sign-Type": "0"
    };
}

function baseHeaders() {
    return {
        "Authorization": "Bearer " + CONFIG.token,
        "user_id": CONFIG.userId,
        "User-Agent": UA,
        "Zeeho-User-Agent": ZUA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Requested-With": "com.cfmoto",
        "interfaceversion": "2",
        "Referer": "https://h5.zeehoev.com/activity/signin?hideNavigationBar=true"
    };
}

function api(path, method, params, bodyStr) {
    var hdrs = baseHeaders();
    var sh = getSign(params || {}, bodyStr || "");
    for (var k in sh) { if (sh.hasOwnProperty(k)) hdrs[k] = sh[k]; }
    var url = BASE + path;
    var q = buildQuery(params || {});
    if (q) url += (url.indexOf("?") > -1 ? "&" : "?") + q;
    var opts = { method: method, headers: hdrs, timeout: 20000 };
    if (method !== "GET") {
        hdrs["Content-Type"] = "application/json;charset=UTF-8";
        opts.body = bodyStr || "";
    }
    opts.headers = hdrs;
    try {
        var res = http.request(url, opts);
        var sc = res.statusCode || 200;
        var text = res.body.string();
        var js;
        try { js = JSON.parse(text) || {}; } catch (e2) { js = { code: "-1", message: String(text).substring(0, 120) }; }
        js.__http = sc;
        return js;
    } catch (e) {
        var em = String(e);
        logLine("请求异常 " + path + " : " + em);
        return { code: "-1", message: em, __http: /401/.test(em) ? 401 : 0 };
    }
}

function getInfo() {
    return api("/H5/signin/info", "GET", { month: monthStr() }, "");
}

function findToday(js) {
    if (!js || !js.data || !js.data.nowSignDetailVos) return null;
    var list = js.data.nowSignDetailVos;
    var t = todayStr();
    for (var i = 0; i < list.length; i++) {
        if (list[i].createDate === t) return list[i];
    }
    return null;
}

// token 失效判定：HTTP 401 或 invalid_token
function isTokenBroken(js) {
    if (!js) return false;
    if (js.__http === 401) return true;
    var s = String(js.code) + " " + (js.message || "") + " " + (js.error || "") + " " + (js.error_description || "");
    return /invalid_token|invalid token|unauthor/i.test(s);
}

// 返回 true 表示今日已签到；"TOKEN_BAD" 表示 token 失效
function checkAndSign() {
    var info = getInfo();
    if (String(info.code) !== "10000") {
        if (isTokenBroken(info)) {
            logLine("!! token 已失效（多半是在另一台手机登录了极核 App）");
            logLine("!! 等电脑端推送新 token，本脚本每 2 分钟自动重试，无需重启");
            return "TOKEN_BAD";
        }
        logLine("查询失败: code=" + info.code + " msg=" + info.message);
        return false;
    }
    var te = findToday(info);
    if (te && (te.signStatue === 3 || te.signStatue === 5)) {
        logLine("今日已签到（积分 " + (te.integralScore || 0) + "），等待下次检查");
        return true;
    }
    logLine("今日未签到，开始签到...");
    for (var attempt = 1; attempt <= 3; attempt++) {
        var res = api("/H5/signin", "POST", {}, "{}");
        logLine("  第" + attempt + "次: code=" + res.code + " msg=" + res.message);
        if (String(res.code) === "10000" && res.message === "操作成功") break;
        if (attempt < 3) sleep(4000 * attempt);
    }
    sleep(2500);
    var info2 = getInfo();
    var te2 = findToday(info2);
    if (te2 && (te2.signStatue === 3 || te2.signStatue === 5)) {
        var days = (info2.data && info2.data.signContinuousCount) || "?";
        logLine("✅ 签到成功 +" + (te2.integralScore || 0) + " 积分，连签 " + days + " 天");
        return true;
    }
    logLine("⚠️ 签到未确认成功，稍后重试");
    return false;
}

// ===== 主循环 =====
logLine("======== 极核签到服务启动 ========");
reloadToken();
logLine("当前 token: " + (CONFIG.token ? CONFIG.token.substring(0, 8) + "..." : "缺失（请推送 zeeho_token.txt）"));
var lastDay = "";

while (true) {
    reloadToken();   // 电脑推来新 token 就立即生效，不必重启

    try {
        if (!device.isScreenOn()) {
            device.wakeUp();
            sleep(500);
        }
    } catch (e) {}

    var done = false;
    try {
        done = checkAndSign();
    } catch (e) {
        logLine("异常: " + e);
    }

    if (done === "TOKEN_BAD") {
        try { device.vibrate(800); } catch (e) {}
        try { toast("极核 token 失效，需重新登录"); } catch (e) {}
        sleep(CONFIG.retryBadTokenMs);
        continue;
    }

    if (done) {
        lastDay = todayStr();
        logLine("今日任务完成，进入休眠监控");
        while (todayStr() === lastDay) {
            sleep(5 * 60 * 1000);
        }
        logLine("跨天，重新检查");
    } else {
        sleep(CONFIG.checkIntervalMs);
    }
}
