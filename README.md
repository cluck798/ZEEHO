<div align="center">

<img src="https://raw.githubusercontent.com/cluck798/ZEEHO/main/ZEEHO.png" width="120" alt="ZEEHO" />

# ZEEHO-福安鹤祥店
> ⚠️本项目仅用于学习研究，禁止商用，使用产生一切风险自行承担

极核ZEEHO电动车 **Loon / Quantumult X / Surge** 脚本：自动签到、社区积分任务、盲盒抽奖、车辆状态看板、远程车辆控制。HTML 可视化 BoxJS 面板，多账号管理，自动抓取 Token。

## ✨ 主要功能

### 📅 签到 & 积分任务
- 每日自动签到，统计连续签到天数（跨月连签不重置）
- 社区互动任务：发帖、点赞、评论、分享，自动清理临时动态
- 连续签到满 **30 天自动开启盲盒抽奖**
- 面板展示**真实今日总积分（签到 + 互动 + 盲盒）**
- 多账号支持，账号异常**隔离运行**

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

## ⚠️ 注意事项
- `boxjs_store.json` 含 Token，已被 `.gitignore` 忽略，禁止提交
- 云端开/关锁 AES 密钥默认不内置，需手动填写，防滥用
- App 更新导致接口加密变化时脚本可能失效，等待适配
- 使用第三方脚本存在账号风控风险，请自行评估
- LOON插件订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js
- Shadowrocket配置：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/shadowrocket/zeeho.conf
- BOXJS订阅：https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/script/boxjs/zeeho.boxjs.json
- 爱发电赞助：https://afdian.com/a/lucky798