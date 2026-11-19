#!/usr/bin/env node
/**
 * 极核 ZEEHO token 获取工具（手机号 + 短信验证码，免抓包）
 *
 * 零依赖，Node 14+ 即可运行。
 *
 *   node get_token.js --phone 13800000000              仅发送验证码
 *   node get_token.js --phone 13800000000 --code 123456 登录并输出 token,user_id
 *   node get_token.js --phone ... --code ... --write /sdcard/脚本/zeeho_token.txt
 *
 * ⚠️ 发码接口是「后发顶前发」：重发会让上一条验证码立即作废。
 *    所以拿到验证码后提交时不要再带 --resend，也不要在中间重复发码。
 *
 * 签名常量来自 github.com/cluck798/ZEEHO，仅用于学习研究，请遵守原项目许可协议。
 */
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");

const APP_BASE = "https://tapi.zeehoev.com";
const APP_ID = "S7qPWPU1";
const APP_SECRET = "c5e0da7f4da28df805694ec3dd1fc6792e9df99d";
const APP_BASIC = "bWNrOjEyMzQ1Ng=="; // mck:123456

function argv(name) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && i + 1 < process.argv.length ? String(process.argv[i + 1]).trim() : "";
}

function md5sha1(text) {
  const sha = crypto.createHash("sha1").update(text, "utf8").digest("hex");
  return crypto.createHash("md5").update(sha, "utf8").digest("hex");
}

function uuidHex() {
  return crypto.randomBytes(16).toString("hex");
}

/** GET 用完整 URL 入签，POST 用 query + body 入签 */
function signHeaders(target, method, body) {
  const ts = String(Date.now());
  const nonce = uuidHex().slice(0, 16) + ts;
  const param = `appId=${APP_ID}&nonce=${nonce}&timestamp=${ts}`;
  const preSign = String(method).toUpperCase() === "GET" ? target : body || "";
  const sign = md5sha1(preSign + param + APP_SECRET);
  return {
    appId: APP_ID,
    nonce: nonce,
    timestamp: ts,
    signature: sign,
    "Cfmoto-X-Param": param,
    "Cfmoto-X-Sign": sign,
    "Cfmoto-X-Sign-Type": "0",
  };
}

function request(target, method, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = url.parse(target);
    const headers = Object.assign(
      {
        "Content-Type": "application/json;charset=UTF-8",
        "User-Agent": "okhttp/4.9.2",
        "Content-Length": body ? Buffer.byteLength(body) : 0,
      },
      extraHeaders || {}
    );
    const req = https.request(
      { hostname: u.hostname, path: u.path, method: method, headers: headers, timeout: 20000 },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let js;
          try {
            js = JSON.parse(text);
          } catch (e) {
            js = { code: "-1", message: String(text).slice(0, 200) };
          }
          js.__http = res.statusCode;
          resolve(js);
        });
      }
    );
    req.on("timeout", () => reject(new Error("请求超时")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sendSms(phone) {
  const target = `${APP_BASE}/v1.0/mine/cfmotoservermine/authCode/${encodeURIComponent(phone)}`;
  return request(target, "GET", null, signHeaders(target, "GET", ""));
}

async function loginByPhone(phone, code) {
  const target = `${APP_BASE}/v1.0/mine/cfmotoservermine/user/loginByPhone`;
  const body = JSON.stringify({ phone: String(phone), authCode: String(code) });
  const headers = Object.assign(
    { Authorization: "Basic " + APP_BASIC },
    signHeaders(target, "GET", "") // 与既有实现一致：POST 也按 GET 风格入签，服务端接受
  );
  return request(target, "POST", body, headers);
}

(async () => {
  const phone = argv("phone");
  const code = argv("code");
  if (!phone) {
    console.error("用法: node get_token.js --phone <手机号> [--code <验证码>] [--write <路径>]");
    process.exit(2);
  }

  if (!code) {
    const res = await sendSms(phone);
    console.log("发送验证码:", res.code, res.message);
    if (String(res.code) !== "10000") process.exit(1);
    console.log("已下发。收到短信后执行：node get_token.js --phone %s --code <验证码>", phone);
    console.log("注意：中途不要再发码，否则这条会作废。");
    return;
  }

  const res = await loginByPhone(phone, code);
  const data = res.data || {};
  const info = data.tokenInfo || {};
  const token = String(info.access_token || "").replace(/^bearer\s+/i, "");
  if (!token) {
    console.error("登录失败:", res.message || JSON.stringify(res));
    process.exit(1);
  }
  const userId = String(data.id || data.userId || "");
  const line = `${token},${userId}`;
  console.log("登录成功");
  console.log("  昵称:", data.nickName || data.username || "-");
  console.log("  user_id:", userId);
  console.log("  有效期:", info.expires_in ? Math.round(Number(info.expires_in) / 86400) + " 天" : "未知");
  console.log("  token,user_id →", line);

  const out = argv("write");
  if (out) {
    fs.writeFileSync(out, line + "\n", "utf8");
    console.log("已写入", out);
  }
})().catch((e) => {
  console.error("出错:", e.message);
  process.exit(1);
});
