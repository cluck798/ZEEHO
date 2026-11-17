# ZEEHO 面板 Docker 版

在 NAS / 软路由 / 服务器上 7x24 运行，浏览器直接打开面板，不依赖手机代理或 App。

## 一键启动

```bash
cd docker
docker compose up -d --build
```

打开 `http://<主机IP>:8787` 即可，数据保存在 `docker/data/store.json`。

## 直接拉取镜像

```bash
docker run -d --name zeeho-panel \
  -p 8787:8787 \
  -v /path/to/data:/data \
  -e TZ=Asia/Shanghai \
  ghcr.io/cluck798/zeeho:latest
```

## 可选：访问密码

```yaml
environment:
  PANEL_USER: admin
  PANEL_PASS: change-me
```

开启后浏览器会弹出 Basic Auth 登录框。

## 说明

- 内核与仓库 `repo/zeeho_box_enhanced.js` 同源，更新镜像即可获得最新脚本。
- 首次打开需要导入账号（面板 → 设置 → 账号与导入，粘贴 Token）。
- 定时签到：面板打开时补签；如需服务端定时，可用宿主机 cron 调用
  `curl -X POST -H 'Content-Type: application/json' -d '{"all":true}' http://127.0.0.1:8787/api/run-signin`。
- 容器不包含安卓/iOS 小组件与实时活动能力（这些需要真机 App）。
