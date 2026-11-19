// 极核 token 导入（Scriptable 小工具）
// 作用：把电脑上抓到的 token 写进 zeeho_checkin 使用的 account.json
//
// 用法：
//   1. 复制电脑发给你的那一行（格式：token,userId）
//   2. 在 Scriptable 里运行本脚本
//   3. 自动读取剪贴板并写入；如果剪贴板没有内容，会弹窗让你粘贴

const fm = FileManager.iCloud();
const DIR = fm.joinPath(fm.documentsDirectory(), "zeeho");
const CFG = fm.joinPath(DIR, "account.json");

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function ensureDir() {
  if (!fm.fileExists(DIR)) fm.createDirectory(DIR, true);
}

function parse(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const parts = s.split(/[,\s;]+/).filter((x) => x.length > 0);
  let token = "";
  let uid = "";
  for (const p of parts) {
    const t = p.replace(/^bearer[:\s]*/i, "").trim();
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(t)) {
      token = t;
    } else if (/^\d{8,24}$/.test(t)) {
      uid = t;
    }
  }
  if (!token) {
    // 兜底：长度像 token 的当 token
    for (const p of parts) {
      const t = p.replace(/^bearer[:\s]*/i, "").trim();
      if (t.length >= 16 && t.length <= 64 && !/^\d+$/.test(t)) { token = t; break; }
    }
  }
  return token ? { token: token, userId: uid } : null;
}

async function main() {
  ensureDir();

  // 1) 先读剪贴板
  let raw = "";
  try { raw = Pasteboard.paste() || ""; } catch (e) { raw = ""; }

  let got = parse(raw);

  // 2) 剪贴板不像 token 就弹窗输入
  if (!got) {
    const a = new Alert();
    a.title = "导入极核 token";
    a.message = "粘贴电脑给你的那一行，格式：token,userId\n例：\n8f3a1c2e-1b2c-4d5e-9f00-abcdef123456,12345678901234567";
    a.addTextField("token,userId", raw.slice(0, 200));
    a.addAction("保存");
    a.addCancelAction("取消");
    if ((await a.presentAlert()) === -1) { Script.complete(); return; }
    got = parse(a.textFieldValue(0));
  }

  if (!got) {
    const bad = new Alert();
    bad.title = "没识别出 token";
    bad.message = "需要形如 8-4-4-4-12 的 uuid 格式 token，以及后面的 17 位用户 ID。\n\n收到的是：\n" + raw.slice(0, 150);
    bad.addAction("知道了");
    await bad.presentAlert();
    Script.complete();
    return;
  }

  if (!got.userId) {
    const warn = new Alert();
    warn.title = "缺少 userId";
    warn.message = "只识别到 token，没找到用户 ID。请把完整的一行一起复制（token 后跟逗号和用户ID）。\n\n仍要以空 ID 保存吗？";
    warn.addAction("仍然保存");
    warn.addCancelAction("取消");
    if ((await warn.presentAlert()) === -1) { Script.complete(); return; }
  }

  let old = {};
  try { if (fm.fileExists(CFG)) old = JSON.parse(fm.readString(CFG)) || {}; } catch (e) { old = {}; }

  const cfg = {
    token: got.token,
    userId: got.userId || old.userId || "",
    phone: old.phone || "",
    loginAt: stamp(),
    source: "App 抓包导入（与极核 App 共用）",
  };
  fm.writeString(CFG, JSON.stringify(cfg, null, 2));

  const logPath = fm.joinPath(DIR, "log.txt");
  const line = "[" + stamp() + "] 已导入 token: " + got.token.substring(0, 8) + "...  userId=" + cfg.userId;
  try {
    const prev = fm.fileExists(logPath) ? fm.readString(logPath) : "";
    fm.writeString(logPath, (prev + line + "\n").split("\n").slice(-300).join("\n"));
  } catch (e) {}
  console.log(line);

  const ok = new Alert();
  ok.title = "✅ 已保存";
  ok.message = "token: " + got.token.substring(0, 8) + "…\n用户 ID: " + (cfg.userId || "（空）") +
    "\n\n现在可以运行 zeeho_checkin 验证一下。";
  ok.addAction("好");
  await ok.presentAlert();
  Script.setShortcutOutput("token 已导入");
}

await main();
Script.complete();
