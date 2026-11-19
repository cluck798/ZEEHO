# 极核（ZEEHO）自动签到 · iOS Scriptable 版

用 iPhone 自带的 **Scriptable** App 跑签到，配合**快捷指令个人自动化**定时执行。
不装 APK、不挂代理、不常驻后台，锁屏状态下也能签到。

> 这个目录是 `autojs/`（安卓 AutoX 版）的 iOS 对应方案，两者任选其一即可。

## 为什么要有这一版

安卓上的常驻脚本很容易被系统清理掉（MIUI / EMUI 的省电策略会杀掉后台进程），
实测过一整夜被终止、第二天没签到的情况。iOS 的快捷指令自动化由系统调度，
配合 iOS 27 的「锁定时允许运行」，不需要 App 保活。

## 需要什么

| 项目 | 说明 |
|---|---|
| iPhone | iOS 16 及以上（自动化入口在 iOS 27 有变化，见下文） |
| Scriptable | App Store 免费，开发者 Simon Støvring |
| 极核账号 | 手机号 + 短信验证码 |
| 网络 | 只在签到瞬间需要联网，约 2 秒 |

## 安装

### 1. 安装 Scriptable

App Store 搜索 `Scriptable`，认准开发者 **Simon Støvring**（免费）。
装好后打开一次，让它创建自己的脚本目录。

### 2. 把脚本放进 Scriptable

`Scriptable` 目录在「文件」App 的 **iCloud 云盘** 下，装完 App 才会出现。

把 `zeeho_checkin.js` 复制进这个目录，方法任选：

- **AirDrop / 微信传文件**到自己，长按 → 存储到「文件」→ iCloud 云盘 → Scriptable
- 或电脑起一个静态服务，手机 Safari 下载后移动到该目录

> 注意：在「文件」App 里点 `.js` 文件只会当纯文本预览，这是正常的。
> 要**长按 → 移动**到 Scriptable 目录，然后在 Scriptable App 里运行。

### 3. 首次运行，登录一次

在 Scriptable 里点 `zeeho_checkin` → 运行。会依次弹窗：

1. 输入极核注册手机号
2. 收到短信后输入 6 位验证码
3. 登录成功后 token 自动存到 `iCloud/Scriptable/zeeho/account.json`

看到「今日已签到（积分 X）」或「签到成功 +X 积分」就成功了。

> **重要**：极核是**单点登录**。脚本登录会让你手机上的极核 App 下线，反之亦然。
> 两边都想同时用，请走下面的「与 App 共用同一条 token」。

### 4.（可选）与极核 App 共用同一条 token

不想每次打开极核 App 都被踢下线的话，让脚本借用 App 自己的那条会话：

1. 在 App 里正常登录极核
2. 抓到 App 的 token（用 mitmproxy / Stream 等抓包工具，或参考上游项目的 token 获取方式）
3. 运行 `zeeho_set_token.js`，把 `token,userId` 粘进弹窗（或先复制到剪贴板，它会自动读取）

这样服务端只有一个会话，App 和脚本可以同时在线、互不踢。
代价是 token 有效期约 10 天，到期需要重新抓一次。

## 设置定时（关键步骤）

### iOS 27

iOS 27 把自动化**并进了快捷指令本身**，底部不再有独立的「自动化」标签页。

1. 快捷指令 App → 「快捷指令」标签 → 右上角「+」
2. 搜索动作 `Run Script`，选 **Scriptable** 提供的那个
3. 脚本选 `zeeho_checkin`，给快捷指令起个名字（如「极核签到」）→ 完成
4. 打开这个快捷指令 → 「编辑」→ **最上面第一步就是触发器** → 点触发器右侧「›」
5. 选「特定时间」，设 `00:05`，重复「每天」
6. 展开触发器后有两个开关：
   - 「自动化」→ 保持**打开**
   - 「运行前确认 / Confirm Before Run」→ **关掉**（否则每次到点会弹通知等你点）
7. 滚到**页面最底部**点「ⓘ」→「隐私」→ 打开「**锁定时允许运行**」
   （这个按钮在底部，不在右上角；不打开则锁屏时不执行）

### iOS 16 – 26

1. 快捷指令 App → 底部「自动化」→ 右上角「+」→「创建个人自动化」
2. 选「特定时间」→ 设 `00:05`、重复「每天」
3. 添加动作 → 搜索 `Run Script` → 选 Scriptable → 脚本选 `zeeho_checkin`
4. **关闭「运行前询问」**
5. 完成

### 建议留两个时间点

只设 `00:05` 一个，遇上手机没电、重启或系统延迟就会漏签。
多设一个 `12:30` 作兜底几乎零成本——脚本是幂等的，已签到会直接退出。

## 通知

脚本通过系统通知告知结果，不需要打开 App：

| 场景 | 通知 |
|---|---|
| 签到成功 | 极核签到成功 · +X 积分，连签 N 天 |
| 今日已签到 | 极核签到：今日已完成 |
| token 失效 | 极核 token 已失效 · 需重新登录 |
| 执行异常 | 极核签到异常 · 错误信息 |

首次运行时如果系统询问通知权限，请选「允许」，否则收不到提醒。

## 常见问题

**运行后没有任何反应？**
在 Scriptable 里手动运行应该弹窗；从快捷指令调用时只发通知不弹窗
（后台/锁屏下弹窗会卡住，脚本已自动识别 `config.runsInShortcut` 并切换成通知模式）。

**到点了没签到？**
依次检查：①「锁定时允许运行」是否打开；②「运行前确认」是否关闭；
③ 触发器里的「自动化」开关是否打开；④ 手机是否处于低电量模式（会延迟触发）。

**token 多久失效？**
登录返回的 `expires_in` 是 863999 秒（约 10 天）。失效后脚本会推通知，
手动运行一次重新登录即可。用「共用 App token」方式的话，重新抓一次包。

**能自动续期吗？**
不能。`refresh_token` 拿得到，但刷新端点需要 App 内置的 client 凭证
（`/oauth/token` 直接 401，`/user/tokenRefresh` 是心跳接口不是刷新）。

**补签怎么算？**
当天往前 30 天内的漏签可补，1 天消耗 1 张补签卡；补签卡可积分兑换，
每 30 天限 1 次。规则全文可从 `GET /H5/ruleExplain/one?type=9` 取到。

## 接口参考

签到走 H5 端接口（`h5.zeehoev.com`），与安卓版一致：

```
GET  /cfmotoservermine/H5/signin/info?month=YYYY-MM   查询当月签到状态
POST /cfmotoservermine/H5/signin                      签到（body 为 {}）
POST /cfmotoservermine/H5/signInSupplement/count      补签卡数量
GET  /cfmotoservermine/H5/ruleExplain/one?type=9      签到规则全文
```

请求头需要 `Authorization: Bearer <token>`、`user_id`，以及 H5 签名三件套
`Cfmoto-X-Param` / `Cfmoto-X-Sign` / `Cfmoto-X-Sign-Type: 0`。

签名算法与 appSecret 沿用上游项目 `script/zeeho.js` 里的实现，未做改动：

```
payload = 排序后的 query + body + "appId=..&nonce=<uuid>&timestamp=<ms>" + secret
sign    = md5( sha1(payload), 32 )      // 两个哈希都是小写 hex
```

> 坑：JS 版 md5 实现默认可能返回 16 位短哈希，必须显式取 32 位，
> 否则服务端返回 `30121 permit error`。

## 安全说明

- token 只存在**本机 iCloud** 的 `Scriptable/zeeho/account.json`，不上传任何服务器
- 脚本不收集设备信息，不改动账号任何设置（只调签到相关接口）
- 建议定期在极核 App 里退出登录，让旧 token 立即失效

## 许可

签名算法与接口信息来自 [cluck798/ZEEHO](https://github.com/cluck798/ZEEHO)，
请遵循原项目的许可条款使用。本项目仅供个人学习与自用，请勿用于商业用途。
