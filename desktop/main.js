// main.js — 极核签到面板桌面版主进程
// 架构：本地 HTTP 服务 + vm 引擎原样运行代理脚本；托盘常驻；定时自动签到
const { app, BrowserWindow, Tray, Menu, Notification, shell, nativeImage, dialog } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const Engine = require("./engine");

// ---------- 单实例 ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// ---------- 路径 ----------
function resolveCoreScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "zeeho_box_enhanced.js");
  }
  const dev = path.join(__dirname, "..", "repo", "zeeho_box_enhanced.js");
  if (fs.existsSync(dev)) return dev;
  return path.join(__dirname, "zeeho_box_enhanced.js");
}
function iconPath() {
  const candidates = [
    path.join(__dirname, "build", "icon.png"),
    path.join(__dirname, "..", "ZEEHO.png"),
    path.join(__dirname, "..", "..", "ZEEHO.png")
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return p; }
  return null;
}

// ---------- 桌面端设置（与脚本的 $persistentStore 分离） ----------
const settingsFile = () => path.join(app.getPath("userData"), "desktop-settings.json");
const DEFAULT_SETTINGS = { autoSignin: true, signinTime: "08:30", launchAtStartup: false, lastSigninDate: "" };
function loadSettings() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(fs.readFileSync(settingsFile(), "utf8"))); }
  catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}
function saveSettings(s) {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2), "utf8"); } catch (e) {}
}
let settings = {}; // app ready 后初始化

// ---------- 全局对象 ----------
let engine = null;
let server = null;
let serverPort = 0;
let win = null;
let tray = null;
let signinTimer = null;
let isQuitting = false;
let signinRunning = false;

const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const logLine = (msg) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${msg}`);

// ---------- 本地 HTTP 服务：把请求喂给核心脚本 ----------
function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
        const body = Buffer.concat(chunks).toString("utf8");
        const url = `http://127.0.0.1:${serverPort}${req.url}`;
        try {
          const out = await engine.dispatch({ url, method: req.method, headers: req.headers, body });
          res.writeHead(out.status, out.headers);
          res.end(out.body);
        } catch (e) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("内部错误: " + String(e && e.message || e));
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      logLine("本地服务已启动: http://127.0.0.1:" + serverPort);
      resolve();
    });
    server.on("error", reject);
  });
}

// ---------- 签到执行（手动/定时共用） ----------
async function runSignin(source) {
  if (signinRunning) { logLine("签到正在进行中，跳过本次触发"); return null; }
  signinRunning = true;
  logLine(`触发签到（${source}）…`);
  try {
    const out = await engine.dispatch({
      url: `http://127.0.0.1:${serverPort}/api/run-signin`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    let results = [];
    try { results = JSON.parse(out.body).results || []; } catch (e) {}
    const okList = results.filter((r) => r.success);
    const failList = results.filter((r) => !r.success);
    const totalGain = okList.reduce((s, r) => s + (Number(r.totalGain) || 0), 0);
    let title, bodyText;
    if (!results.length) {
      title = "极核签到提醒";
      bodyText = "没有已配置的账号，请先在面板配置页添加";
    } else if (!failList.length) {
      title = `极核签到成功 · ${okList.length}个账号`;
      bodyText = `共获得 ${totalGain} 分` + (okList[0] ? `，${okList[0].userName} 连签 ${okList[0].continueDays} 天` : "");
    } else if (!okList.length) {
      title = "极核签到失败";
      bodyText = failList.map((r) => `${r.userName}: ${r.error || "失败"}`).join("；").slice(0, 200);
    } else {
      title = `极核签到 ${okList.length}成功/${failList.length}失败`;
      bodyText = `成功获得 ${totalGain} 分；失败: ` + failList.map((r) => r.userName).join("、");
    }
    logLine(`签到结果（${source}）: ${title} | ${bodyText}`);
    showNotification(title, bodyText);
    settings.lastSigninDate = todayStr();
    saveSettings(settings);
    if (tray) tray.setToolTip(`极核签到面板 · 今日已签到 ${okList.length}/${results.length}`);
    return results;
  } catch (e) {
    logLine("签到异常: " + String(e && e.message || e));
    showNotification("极核签到异常", String(e && e.message || e));
    return null;
  } finally {
    signinRunning = false;
  }
}

function showNotification(title, body) {
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: false });
      n.on("click", () => showWindow());
      n.show();
    }
  } catch (e) {}
}

// ---------- 定时调度 ----------
function nextRunDate(timeStr) {
  const parts = String(timeStr || "08:30").split(":");
  const h = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
function scheduleNext() {
  if (signinTimer) { clearTimeout(signinTimer); signinTimer = null; }
  if (!settings.autoSignin) { logLine("定时签到已关闭"); return; }
  const next = nextRunDate(settings.signinTime);
  const delay = next.getTime() - Date.now();
  logLine(`下次定时签到: ${next.toLocaleString("zh-CN", { hour12: false })}`);
  signinTimer = setTimeout(async () => {
    await runSignin("定时");
    scheduleNext();
  }, delay);
}

// ---------- 窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: "极核签到面板",
    icon: iconPath() || undefined,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  win.loadURL(`http://127.0.0.1:${serverPort}/`);
  // 外部链接交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
      if (process.platform === "win32" && tray) {
        try { tray.displayBalloon({ title: "极核签到面板", content: "已最小化到托盘，定时签到将继续在后台运行" }); } catch (err) {}
      }
    }
  });
}
function showWindow() {
  if (!win) createWindow();
  else {
    if (!win.isVisible()) win.show();
    if (win.isMinimized()) win.restore();
    win.focus();
  }
}

// ---------- 托盘 ----------
function buildTrayMenu() {
  const timeOptions = ["07:00", "08:30", "09:00", "12:00", "18:00", "21:00"];
  return Menu.buildFromTemplate([
    { label: "显示面板", click: () => showWindow() },
    { label: "立即签到", click: () => runSignin("手动") },
    { type: "separator" },
    {
      label: "定时自动签到",
      type: "checkbox",
      checked: !!settings.autoSignin,
      click: (item) => {
        settings.autoSignin = item.checked;
        saveSettings(settings);
        scheduleNext();
      }
    },
    {
      label: "签到时间",
      submenu: timeOptions.map((t) => ({
        label: t,
        type: "radio",
        checked: settings.signinTime === t,
        click: () => {
          settings.signinTime = t;
          saveSettings(settings);
          scheduleNext();
        }
      }))
    },
    {
      label: "开机自启动",
      type: "checkbox",
      checked: !!settings.launchAtStartup,
      click: (item) => {
        settings.launchAtStartup = item.checked;
        saveSettings(settings);
        try {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath,
            args: []
          });
        } catch (e) { logLine("设置开机自启失败: " + e.message); }
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}
function createTray() {
  const ip = iconPath();
  let img = ip ? nativeImage.createFromPath(ip) : nativeImage.createEmpty();
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip("极核签到面板");
  tray.setContextMenu(buildTrayMenu());
  tray.on("double-click", () => showWindow());
  tray.on("click", () => { if (tray) tray.popUpContextMenu(); });
}
function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

// ---------- 生命周期 ----------
app.whenReady().then(async () => {
  settings = loadSettings();

  // CLI 配置开机自启：极核签到面板.exe --autostart=on|off（配置完即退出，不弹窗）
  const autostartArg = process.argv.find((a) => a.startsWith("--autostart="));
  if (autostartArg) {
    const on = autostartArg.split("=")[1] === "on";
    settings.launchAtStartup = on;
    saveSettings(settings);
    try {
      app.setLoginItemSettings({ openAtLogin: on, path: process.execPath, args: [] });
      logLine("开机自启已" + (on ? "开启" : "关闭") + "（CLI 配置）");
    } catch (e) {
      logLine("CLI 配置开机自启失败: " + e.message);
    }
    app.quit();
    return;
  }

  const scriptPath = resolveCoreScript();
  if (!fs.existsSync(scriptPath)) {
    dialog.showErrorBox("极核签到面板", "找不到核心脚本: " + scriptPath);
    app.quit();
    return;
  }
  engine = new Engine({
    scriptPath,
    storePath: path.join(app.getPath("userData"), "store.json"),
    log: logLine
  });
  await startServer();
  createTray();
  createWindow();

  // 开机自启状态同步（以系统实际设置为准）
  try {
    const cur = app.getLoginItemSettings();
    if (!!cur.openAtLogin !== !!settings.launchAtStartup) {
      settings.launchAtStartup = !!cur.openAtLogin;
      saveSettings(settings);
    }
  } catch (e) {}
  refreshTrayMenu();

  // 启动补偿：若今天的签到时间已过且今天还没签到，启动 15 秒后补签一次
  if (settings.autoSignin && settings.lastSigninDate !== todayStr()) {
    const parts = String(settings.signinTime || "08:30").split(":");
    const t = new Date();
    t.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    if (Date.now() >= t.getTime()) {
      logLine("今日签到时间已过且未签到，15秒后自动补签");
      setTimeout(() => runSignin("启动补签"), 15000);
    }
  }
  scheduleNext();
});

app.on("second-instance", () => showWindow());
app.on("window-all-closed", (e) => {
  // 托盘常驻：窗口全部关闭也不退出
});
app.on("before-quit", () => { isQuitting = true; });
