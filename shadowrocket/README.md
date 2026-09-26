# 极核 ZEEHO · Shadowrocket 适配版 使用说明

## 文件清单（`shadowrocket/` 目录）

| 文件 | 用途 |
|------|------|
| `zeeho.conf` | 远程脚本版配置（jsDelivr CDN，国内无节点可直连） |
| `zeeho.local.conf` | **本地脚本版配置（推荐，最稳）** |
| `zeeho.js` | 签到 + Token 抓取脚本 |
| `zeeho_box_enhanced.js` | 网页面板 + appId 捕获脚本 |

## 快速开始（本地脚本版，推荐）

### 第 1 步：放入脚本文件

将 `zeeho.js` 和 `zeeho_box_enhanced.js` 放入 Shadowrocket 本地目录，二选一：

- **方式 A（手机直接操作）**：用「文件」App → 浏览 → 我的 iPhone → Shadowrocket，把两个 `.js` 文件拷进去。
- **方式 B（电脑传输）**：电脑连接 iPhone，打开 iTunes / 访达 → 设备 → 文件共享 → Shadowrocket，把两个 `.js` 拖入。

### 第 2 步：导入配置

1. 将 `zeeho.local.conf` 导入 Shadowrocket（AirDrop、iCloud 或文件 App 打开均可）。
2. 首页 → **配置**（不是「模块」！）→ 选中 `zeeho.local.conf` 使其成为当前配置。

> **为什么不能用「模块」？** `[Host]` 域名映射只在「配置」模式下生效，模块模式不支持 `[Host]`，会导致 `zeeho.box` 无法解析。

### 第 3 步：安装并信任 CA 证书

1. Shadowrocket → 设置 → 证书 → 生成 CA 证书 → 安装。
2. iOS 设置 → 通用 → VPN与设备管理 → 安装描述文件。
3. iOS 设置 → 通用 → 关于本机 → **证书信任设置** → 对 Shadowrocket CA 开启完全信任。

### 第 4 步：开启 MITM

Shadowrocket → 设置 → MITM → 打开开关 → 确认 hostname 包含：
```
tapi.zeehoev.com, h5.zeehoev.com, zeeho.box
```

### 第 5 步：验证面板

1. 打开 Safari 或 Chrome。
2. 地址栏手动输入 **`http://zeeho.box`**（注意是 **http**，不是 https）。
3. 能看到极核面板页面即配置成功。

> 如果浏览器自动跳转 https，改用 Safari 并关闭「强制 https」选项，或手动补全 `http://` 前缀。

### 第 6 步：捕获 Token 并配置账号

1. 打开极核 App → 进入「我的」页面（触发 Token 自动抓取）。
2. 回到面板 `http://zeeho.box` → 添加/配置账号。
3. 面板内点「获取ID」按钮自动获取 userId。

---

## 远程脚本版（可选）

如果你的网络环境可以访问 `cdn.jsdelivr.net`，也可以用 `zeeho.conf`（远程脚本版）：
- 导入 `zeeho.conf` 即可，无需手动放入 `.js` 文件。
- 脚本地址：`https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/shadowrocket/zeeho.js`
- 脚本更新后若未生效，浏览器访问 `https://purge.jsdelivr.net/gh/cluck798/ZEEHO@main/shadowrocket/zeeho.js` 刷新缓存。

> jsDelivr 在国内部分地区存在 DNS 污染，如遇下载失败请用本地脚本版。

---

## 配置文件结构说明

```ini
[Host]
# 将 zeeho.box 占位解析到 127.0.0.1
# 实际响应由 http-request 脚本拦截并直接返回，请求不会真正发往 127.0.0.1
zeeho.box = 127.0.0.1

[Script]
# 1. 面板入口 + appId 捕获（http-request 拦截）
http-request ^https?:\/\/(zeeho\.box|.*zeehoev\.com)\/.* script-path=zeeho_box_enhanced.js, requires-body=true, timeout=60

# 2. Token 自动抓取（http-response 拦截 /setting 接口响应）
http-response ^https?:\/\/tapi\.zeehoev\.com\/v1\.0\/mine\/cfmotoservermine\/setting script-path=zeeho.js, requires-body=true, timeout=60

# 3. 每日签到（cron 定时，每天 07:00）
cron "0 7 * * *" script-path=zeeho.js

[MITM]
hostname = tapi.zeehoev.com, h5.zeehoev.com, zeeho.box
```

### 为什么 Token 用 `http-response` 而其他用 `http-request`？

- `zeeho.js` 的 Token 抓取逻辑读取 `$response.body`（即服务端返回的 setting 接口数据），需要 `http-response` 才能拿到响应体。
- `zeeho_box_enhanced.js` 的面板逻辑读取 `$request.url` 和 `$request.headers`，用 `http-request` 即可在请求阶段直接拦截并返回面板 HTML，无需等待响应。

---

## 常见问题

### Q: 访问 `zeeho.box` 提示「无法连接」/「连接被拒绝」

1. **确认配置模式**：首页 → 配置 → 选中 `zeeho.local.conf`（不是模块）。
2. **确认脚本已放入本地目录**：「文件」App → Shadowrocket 目录下应有 `zeeho.js` 和 `zeeho_box_enhanced.js`。
3. **确认地址是 http**：输入 `http://zeeho.box`，不是 `https://`。
4. **确认 MITM 已开启**：设置 → MITM → 开关打开，hostname 含 `zeeho.box`。
5. **确认 Shadowrocket 已连接**：首页顶部 VPN 开关为已连接状态。

### Q: 远程脚本版（`zeeho.conf`）面板打不开

jsDelivr CDN 在你所在地区可能被阻断。改用本地脚本版 `zeeho.local.conf`。

### Q: Token 抓不到

1. 确认 MITM hostname 含 `tapi.zeehoev.com`。
2. 确认 CA 证书已安装并开启完全信任（第 3 步两步都做了）。
3. 打开极核 App → 「我的」页面 → 等待几秒 → 检查面板是否已有 Token。
4. 极核 App 需通过 Shadowrocket 代理访问（首页 VPN 开关已连接）。

### Q: 签到不执行

1. 确认 cron 规则存在且 `script-path` 正确。
2. 确认 Shadowrocket 后台未被系统杀掉（iOS 后台限制）。可将 cron 时间改到白天的测试时间验证。
3. 确认账号 Token 和 userId 均已配置（userId 为空时脚本会跳过）。

### Q: 多账号配置

- 多账号 Token 用 `@` 分隔，存入 `zeeho_data` 键。
- 面板内可逐个添加/管理账号。
