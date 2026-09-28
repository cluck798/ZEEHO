<div align="center">

<img src="https://raw.githubusercontent.com/cluck798/ZEEHO/main/ZEEHO.png" width="120" alt="ZEEHO" />

# ZEEHO-福安鹤祥店
> ⚠️本项目仅用于学习研究，禁止商用，使用产生一切风险自行承担

极核ZEEHO电动车 **Loon / Quantumult X / Surge / Shadowrocket** 脚本：自动签到、社区积分任务、盲盒抽奖、车辆状态看板、远程车辆控制。HTML 可视化 BoxJS 面板，多账号管理，自动抓取 Token。另提供 **Windows 桌面版**与 **iOS 版（TrollStore）**。

## ✨ 主要功能

### 📅 签到 & 积分任务
- 每日自动签到，统计连续签到天数（跨月连签不重置）
- 社区互动任务：发帖、点赞、评论、分享，自动清理临时动态
- 连续签到满 **30 天自动开启盲盒抽奖**
- 积分中心：积分明细、积分补签
- 面板展示**真实今日总积分（签到 + 互动 + 盲盒）**
- 多账号支持，账号异常**隔离运行**；签到限流自动退避重试

### 🚗 车辆状态监控（读取）
- SOC 电量、续航、电压、充电电流、充电状态
- 前后胎压、胎温、今日骑行里程/时长/最高速度
- 坐垫锁 / 整车锁 / 开关机 / 在线状态、GPS 定位 + 地图跳转、服务到期时间

### 🎛️ 远程车辆控制（4G 下发指令）
> ⚠️ 会真实操作车辆，请在车辆附近谨慎操作，误触风险自负
1. 🔔 寻车（闪灯）
2. 📣 鸣笛寻车
3. 💺 弹开坐垫
4. 🔓 云端开锁（需配置 AES 密钥）
5. 🔒 云端关锁（需配置 AES 密钥）

### 🖥️ 桌面版（Windows）
- 托盘常驻、定时自动签到、开机自启
- 下载：[Releases](https://github.com/cluck798/ZEEHO/releases)（Setup 安装版 / Portable 便携版）

### 📱 iOS 版（TrollStore / 巨魔）
- WKWebView 面板 + 本地通知（签到结果、充电充满、车辆离线提醒）
- 后台常驻充电监控（静音保活 + 周期轮询）
- 下载：[ios-latest Release](https://github.com/cluck798/ZEEHO/releases/tag/ios-latest)，TrollStore 中点击 + 选择 IPA 安装，永久签名不掉签

### 🔋 后台常驻增强（已内置 BackRun 注入）
App 已内置 `audio` 后台模式 + 静音循环保活 + 每 3 分钟充电/离线监控轮询，锁屏切后台后仍可较长时间存活。**从 v2.14.17 起，构建 IPA 时已自动把第三方 **BackRun** 常驻插件（`ios/BackRun.dylib`）注入到 App 的 `Frameworks/` 并添加加载命令**，无需手动操作——直接安装 [ios-latest Release](https://github.com/cluck798/ZEEHO/releases/tag/ios-latest) 即可，后台不再被系统限时回收（配合静音保活可整夜常驻）。

> 该 dylib 拦截 `beginBackgroundTaskWithExpirationHandler` / `endBackgroundTask` 等后台任务 API，由 GitHub Actions 构建时通过 `insert_dylib` 注入，不改动脚本内核与签名流程。

## 🖼️ 在线演示 & 界面预览

> **在线演示（免安装、示例数据、不联网）**：https://cluck798.github.io/ZEEHO/
>
> 也可下载仓库内的 [`demo/index.html`](demo/index.html) 直接双击打开（单文件、无依赖），支持 `?tab=home|points|vehicle|logs|cfg` 直达标签页，例如 `demo/index.html?tab=vehicle`。

| 首页 | 积分 |
| :--: | :--: |
| <img src="screenshots/demo_home.png" width="240" alt="首页" /> | <img src="screenshots/demo_points.png" width="240" alt="积分" /> |

| 车辆 | 设置 |
| :--: | :--: |
| <img src="screenshots/demo_vehicle.png" width="240" alt="车辆" /> | <img src="screenshots/demo_cfg.png" width="240" alt="设置" /> |

演示页特性：
- 内置示例账号/车辆/积分/日历/日志数据，**任何标签页都不会空白**；点「立即签到」会模拟一次签到并弹出结果
- 纯静态单文件，无后端、无网络请求、无 Token，可安全公开分享
- 顶部副标题标注「演示模式 · 示例数据（不联网）」，避免与真实面板混淆

## ⚠️ 注意事项
- `boxjs_store.json` 含 Token，已被 `.gitignore` 忽略，禁止提交
- 云端开/关锁 AES 密钥默认不内置，需手动填写，防滥用
- App 更新导致接口加密变化时脚本可能失效，等待适配
- 使用第三方脚本存在账号风控风险，请自行评估
- 官方 App 登录会顶掉面板 Token，需重新抓取
- LOON插件订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/modules/zeeho.plugin
- Surge模块订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/modules/zeeho.sgmodule
- QX订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/script/zeeho_qx.conf
- Shadowrocket配置：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/shadowrocket/zeeho.conf
- BOXJS订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/script/boxjs/zeeho.boxjs.json
- 爱发电赞助：https://afdian.com/a/lucky798
