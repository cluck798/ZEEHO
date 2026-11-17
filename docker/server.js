// ZEEHO 面板 Docker 版：直接用 Node 跑代理脚本内核，浏览器访问 http://<host>:8787
// 数据持久化：/data/store.json（挂载卷即可）
const http = require("http");
const path = require("path");
const Engine = require("/app/engine.js");

const PORT = Number(process.env.PORT) || 8787;
const STORE = process.env.STORE || "/data/store.json";
const USER = process.env.PANEL_USER || "";
const PASS = process.env.PANEL_PASS || "";

const engine = new Engine({
  scriptPath: "/app/zeeho_box_enhanced.js",
  storePath: STORE,
  log: (m) => console.log(new Date().toISOString(), m),
});

function unauthorized(res) {
  res.writeHead(401, { "WWW-Authenticate": 'Basic realm="ZEEHO"' });
  res.end("auth required");
}

const server = http.createServer(async (req, res) => {
  try {
    if (USER || PASS) {
      const h = String(req.headers.authorization || "");
      const ok = h.startsWith("Basic ") &&
        Buffer.from(h.slice(6), "base64").toString("utf8") === `${USER}:${PASS}`;
      if (!ok) return unauthorized(res);
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks).toString("utf8") : null;
    const r = await engine.dispatch({
      url: "http://zeeho.box" + (req.url || "/"),
      method: req.method || "GET",
      headers: req.headers,
      body,
    });
    const ct = r.headers["Content-Type"] || r.headers["content-type"] || "application/json";
    res.writeHead(r.status, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(r.body);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String((e && e.stack) || e));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ZEEHO panel listening on http://0.0.0.0:${PORT}  store=${STORE}`);
});
