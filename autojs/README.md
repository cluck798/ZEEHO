# AutoX.js 版签到脚本（纯 HTTP，零安装依赖）

单文件 `zeeho_autojs.js`，在 [AutoX.js](https://github.com/kkevsekk1/AutoX) 里直接运行即可每日自动签到。

适合不想装 APK、不想配 Loon/Surge/代理抓包、只想让一台闲置安卓机每天自己打卡的场景。

## 和现有方案的区别

| | 本脚本 | APK 版 | Loon / QX / Surge 脚本 |
|---|---|---|---|
| 需要抓包配代理 | 不需要 | 不需要 | 需要（首次） |
| 需要无障碍服务 | 不需要 | 不需要 | — |
| 部署成本 | 装 AutoX + 放两个文件 | 装 APK | 配代理 + 证书 |
| 可改性 | 单文件 JS，随便改 | 需重新编译 | 改脚本文件 |
| 保活 | 依赖 AutoX 后台 | 自带前台服务 | 依赖代理常驻 |

## 使用

1. 安装 AutoX.js v7（包名 `org.autojs.autoxjs.v7`），授予存储权限。
2. 把 `zeeho_autojs.js` 放到 `/sdcard/脚本/`。
3. 新建 `/sdcard/脚本/zeeho_token.txt`，内容一行：

   ```
   <access_token>,<user_id>
   ```

   例：`8f3a1c2e-1b2c-4d5e-9f00-abcdef123456,12345678901234567`
4. 在 AutoX 里打开脚本并运行。之后保持 AutoX 后台常驻即可。

保活建议（小米/红米实测）：设置 → 应用 → AutoX → 省电策略「无限制」+ 允许自启动 + 通知权限开启；
开发者选项里关掉「不保留活动」。

运行时日志写在 `/sdcard/脚本/zeeho_log.txt`：

```
[2026-11-16 22:48:45] ======== 极核签到服务启动 ========
[2026-11-16 22:48:45] token 已加载/更新: 8f3a1c2e...
[2026-11-16 22:48:45] 今日已签到（积分 1），等待下次检查
[2026-11-16 22:48:45] 今日任务完成，进入休眠监控
[2026-11-17 00:01:12] 跨天，重新检查
[2026-11-17 00:01:13] 今日未签到，开始签到...
[2026-11-17 00:01:14] ✅ 签到成功 +1 积分，连签 4 天
```

## 行为说明

- 启动即查一次，之后每 10 分钟查一次；
- 今日已签 → 进入休眠，每 5 分钟看一次日期，跨天立刻重查（所以 0 点后会自动签，不用定闹钟）；
- 未签 → 连续重试 3 次（间隔 4s / 8s），成功后回查确认；
- **token 热加载**：每轮循环比对 `zeeho_token.txt`，内容一变就换用新 token，不必重启脚本。
  换手机登录后从电脑/另一台设备推一下 token 文件，手机端 5 分钟内自己接上；
- **token 失效**（HTTP 401 / `invalid_token`）：震动 + toast 提示，改为每 2 分钟重试，等新 token 送进来。

## Token 怎么来

### 方式一：命令行一条命令（推荐，免抓包）

同目录的 `get_token.js` 零依赖，Node 14+ 直接跑：

```bash
# 1. 发验证码
node get_token.js --phone 13800000000

# 2. 拿到短信验证码后登录，结果就是 tokenFile 需要的一行
node get_token.js --phone 13800000000 --code 123456

# 也可以顺手直接写进手机（需先配好 adb）
node get_token.js --phone 13800000000 --code 123456 --write ./zeeho_token.txt
adb push ./zeeho_token.txt /sdcard/脚本/zeeho_token.txt
```

> ⚠️ 第 2 步不要再触发发码，否则第 1 步那条验证码会立刻作废。这是本接口的坑，见下方实测结论第 2 条。

### 方式二：用项目现成能力

项目自带的 BoxJS 面板 / APK 的「自动抓取 Token」都能拿到 access_token 与 user_id。

### 涉及的接口（备查）

```
发码  GET  https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/authCode/<手机号>
登录  POST https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/user/loginByPhone
      Authorization: Basic bWNrOjEyMzQ1Ng==
      body: {"phone":"<手机号>","authCode":"<验证码>"}
      → data.tokenInfo.access_token / data.id
```

网关签名（`tapi.zeehoev.com`，appId `S7qPWPU1`）：

```js
// GET：完整 URL（含 query）入签；POST：query + body 入签
const preSign = method === "GET" ? fullUrl : query + body;
const sign = md5(sha1(preSign + `appId=${appId}&nonce=${nonce}&timestamp=${ts}` + secret));
// headers: Cfmoto-X-Param / Cfmoto-X-Sign / Cfmoto-X-Sign-Type: 0
```

## 实测结论（2026-11，供后来者省时间）

1. **token 是单点的，多设备互踢。** 同一账号在 iPhone 上登录极核 App 后，安卓这边原本可用的
   token 立即返回 `401 {"error":"invalid_token"}`，几小时前刚拿到的也一样。所以「一台机器签到、
   另一台机器日常登录」这个组合，每登一次另一台就要补一次 token。
2. **发验证码接口是「后发顶前发」。** `GET /authCode/<phone>` 返回 `10000 操作成功` 只代表受理成功；
   再发一次，上一条验证码**立即作废**。所以流程必须是「发码 → 读短信 → 只提交登录，绝对不要再发」，
   否则会一直报 `3006CM0002002 验证码有误或已过期`，很容易误判成签名问题。
3. **登录接口的签名不校验 body 是否入签。** `loginByPhone` 是 POST，但按 GET 风格（URL 入签）
   和按 query+body 入签，服务端都接受，均返回业务错误码而非签名错误——排查签名时别被这一点带偏。
4. **token 有效期约 10 天**（`expires_in: 863999`），且**没有可用的 refresh 接口**：
   - `POST /user/refreshToken`、`POST /user/refresh` → `40000 网络开小差了`（不存在）
   - `POST /oauth/token`（`grant_type=refresh_token`）→ `401 Unauthorized`，需 App 内置 client 凭证
   - `GET|POST /user/tokenRefresh` → 存在，但恒返回 `data:false`，是心跳检查不是刷新

   结论：到期只能重新走一次手机号登录，本脚本的热加载就是为这个场景准备的。

## 免责声明

仅用于学习研究与个人自用。签名常量与接口信息均来自本项目其他部分的既有实现，
请遵守仓库根目录的许可协议，勿用于商业用途，使用风险自负。
