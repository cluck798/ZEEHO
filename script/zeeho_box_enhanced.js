/*
#!name=极核 ZEEHO 签到面板 V2.16.57
#!desc=极核ZEEHO多账号签到面板 + 网页配置，访问 http://zeeho.box
#!author=lucky
#!homepage=https://github.com/cluck798/ZEEHO
#!version=2.16.57

图标: https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/ZEEHO.png

[Script]
# ========== 极核 ZEEHO ==========
# 面板入口（http://zeeho.box；面板 POST API 需要读取 body）
http-request ^https?://zeeho\.box/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.57, requires-body=true, timeout=60, tag=极核面板

# 官方 App 请求：独立小脚本，每个请求换新 UA（jsDelivr 国内可访问）
# 同一请求只会执行第一个匹配的请求脚本；若被其它通配脚本抢占，请把本规则放到本地配置（优先级最高）
http-request ^https?://.*zeehoev\.com/.* script-path=https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/script/zeeho_ua.js?v=1, timeout=10, tag=极核App请求

# 车辆图片替换（v2.16.11：http-response 直改响应体图片 URL，需在面板设置页配置）
http-response ^https:\/\/tapi\.zeehoev\.com\/v1\.0\/app\/cfmotoserverapp\/(vehicle\/(list|widgets|details)|vehicleHomePageV2|vehicleInfo|vehicle\/properties) script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.57, requires-body=true, timeout=30, tag=车辆图片改写
# 极核Token自动捕获（打开极核App-我的页面）
http-response ^https:\/\/tapi\.zeehoev\.com\/v1\.0\/mine\/cfmotoservermine\/setting script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho.js?v=2.5.8, requires-body=true, timeout=30, tag=极核抓Token

# UA 风控自愈（v2.16.55，需放在更具体的响应规则之后）
http-response ^https?://(tapi|h5)\.zeehoev\.com/.* script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho_box_enhanced.js?v=2.16.57, requires-body=true, timeout=30, tag=极核UA风控

# 极核每日签到（每天7点）
cron "0 7 * * *" script-path=https://raw.githubusercontent.com/cluck798/ZEEHO/refs/heads/main/repo/zeeho.js?v=2.5.8, timeout=120, tag=极核每日签到


[MITM]
hostname = tapi.zeehoev.com, h5.zeehoev.com, zeeho.box

====================================
⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
 */

const $ = new Env("极核看板增强版");

// ========== 极核 ZEEHO 签到面板脚本 ==========
// 版本: v2.16.57
// 更新日期: 2026-11-23
// 作者: @lucky
// 主页: https://github.com/cluck798/ZEEHO
// ============================================
const SCRIPT_VERSION = "v2.16.57";
console.log(`🚀 [极核面板] 脚本版本: ${SCRIPT_VERSION} (2026-11-23 v2.16.57 每个请求都换全新 UA：官方 App / 面板 / 定时脚本全部改为「每次请求现场生成随机官方格式指纹」，不再复用固定或修复指纹；v2.16.56 拆分面板/App 请求脚本：官方 App 请求不再 requires-body，避免 GET 等 body 被挂起导致 UA 替换不生效；被风控指纹每次替换都会写一条「[极核修复]」日志；v2.16.55 UA 风控自愈：被服务端拉黑的设备指纹自动识别并换新（官方 App 430/31001 → 记录 UUID → 下次请求换指纹放行；面板不再复用被拉黑 UA）；v2.16.54 Issues 集中修复：①充电统计新增「手动充电记录」，按实际账单记录电量/金额/备注并可删除（独立统计不重复计算）；②新增桌面小组件字号设置（标准/大号/特大），安卓与 iOS 小组件同步；③新增 Docker 部署（docker/ + GHCR 镜像），可在 NAS/软路由 7x24 运行面板；④修复多账号面板版本号长期显示 v2.16.16；⑤修复后台实时活动不刷新（iOS 16.1 音频常驻限制）；v2.16.53 实时活动 100% 时显示「已充满」不再出现「剩余 --」；通知与提醒新增 TrollStore 提示：把应用从「系统」切换为「用户」状态后灵动岛才可用；v2.16.52 通知与提醒新增「系统实时活动开关」：一键跳转本应用系统设置，实时活动被系统关闭时可直接打开；实时活动启动失败会回执真实原因（含 App 实际名称，单账号版为「极核单账号版」）；v2.16.51 修复点击锁屏卡片后灵动岛不再显示：充电接口临时失败时快照把状态回落成「未充电」，原生据此结束了实时活动；快照新增 chargeKnown 标记，状态未知时保持活动不结束（超过 30 分钟仍拿不到状态才结束）；v2.16.50 修复「重新显示充电活动」点了没反应：设置弹层内的提示 toast 层级低于弹层被遮挡、原生侧快照缺失或未充电时静默无回执；现在点击立即提示，原生刷新车辆状态后回执真实结果，并强制重建一次实时活动；v2.16.49 通知与提醒新增「重新显示充电活动」：锁屏卡片被手动关闭后可在面板内一键重新唤起；v2.16.48 修复「附近充电桩」点击无反应：充电桩对象 CP 与旧的充电功率对象重名被覆盖，改名 CPS；iOS 实时活动只在快照成功且有车辆时更新，避免一次网络失败被误判未充电而结束活动；v2.16.47 充电剩余时间兜底：官方 fullChargeTime 常为空时，按电池容量(Ah, 默认30)与实时电流估算，小组件/实时活动/面板统一口径；电池容量设置同步写入内核配置；v2.16.46 修复三处问题：①车辆提醒（震动/忘关锁/电池拔出/低电量）改为随 3 分钟监控 tick 检查，安卓无小组件时也由 30 分钟后台任务检查；②修复电价保存后读不回来（配置白名单漏掉 chargePrice/amapKey/chargeDonePush）；③修复「附近充电桩」弹层被设置弹层盖住打不开（先关设置再打开，检查更新弹层同步修复）；v2.16.45 桌面小组件换位：电量区下移到胎压/定位/签到之后（照片 + 胎压两行/定位/签到 → 电量续航电压 → 进度条 → 充电状态/更新时间），安卓与 iOS 中号/大号同步，iOS 车辆照片经 App Group 传图；安卓小组件新增后胎压独立一行；v2.16.44 安卓桌面小组件升级为完整车辆卡片：车型 / 在线 / 坐垫·车锁胶囊 / 车辆照片（后台下载并缓存）/ 大号电量+续航+电压 / 电量进度条 / 充电功率与剩余时间 / 前后胎压胎温 / 定位地址 / 签到与更新时间，最小尺寸 4×3，快照接口同步新增这些字段；v2.16.43 设置→充电与电池新增「附近充电桩」：地图 + 分类（汽车直流快充 / 交流慢充 / 交直流一体 / 50V起充直流 / 小区路边两轮），按车辆定位搜索 3 公里内站点并显示距离与参考价，一键跳高德查看实时电价与空闲桩；预留高德 Key 配置（未填也可用，默认跳转高德）；v2.16.42 新增充电完成提醒（充满/拔枪时系统通知 + 本次充入电量，设置→通知与提醒可开关，Android/iOS 原生通知桥）；安卓桌面小组件补全后台取数（服务未运行时走脚本直取，充电中显示功率与剩余时间，新增 30 分钟周期刷新，不再显示「打开 App 刷新」）；v2.16.41 修复充电统计无数据：官方 batteryInfo 不含月度充电字段，改为本地记录充电过程（充电中逐次采样 + 重启后按电量增幅补记，容量取电池设置、未设置按 30Ah/72V 估算），电价保存后估算电费立即生效；v2.16.40 关于新增「爱发电 · 支持作者」入口（单账号面板与多账号面板同步）；v2.16.39 新增检查更新与下载：设置→关于「检查更新」+ 启动后自动检测，发现新版本弹层显示当前/最新版本并可一键下载；Android 1.2.42；v2.16.38 启动再提速：安卓命中 HTML 缓存时完全跳过 700KB 脚本读取、字节码预热延后到首屏后、首帧可见即撤开屏、通知权限弹窗延后；iOS 页面 didFinish 即撤开屏（原本 15 秒兜底）、通知授权与小组件快照延后；Android 1.2.41；v2.16.37 安卓启动提速：首屏 HTML 持久化到本地（脚本变更自动失效），冷启动直接读盘不再等待 QuickJs；服务启动后台预热脚本字节码；端口轮询 250ms→80ms 且首轮立即执行；Android 1.2.40；v2.16.36 社区发帖/评论统一使用防倒卖声明（按账号与日期轮换 5 种措辞，避免固定文案被判重复；历史 lucky 及含仓库地址的自动贴自动清理）；Android 1.2.39；v2.16.35 修复积分获取失败：账号 userId 为 temp_ 占位时（快速导入 H5 baseInfo 失败）先解析真实数字 ID 并回写账号，避免官方 setting 接口 NumberFormatException；快速导入新增 App setting / vehicle/list 兜底解析；Android 1.2.38；v2.16.34 新增充电统计（本月次数/充入电量/用电量/电费估算 + 电价设置）、首页模块自定义（显示/隐藏/排序）、月报按轨迹自动计算急加速/急刹/压弯；Android 小组件点击直接签到（WorkManager，无需后台常驻）；iOS 单账号版新增桌面小组件（独立 App Group）；Android 1.2.37；v2.16.33 新增骑行月报（近 6 个月趋势、当月里程/时长/均速/极速、每日里程、急加速/急刹）与移车提醒（围栏中心/半径、移出提示并 Bark 推送）；修正最近骑行「本月」误用整车累计里程；Android 1.2.36；v2.16.32 新增骑行轨迹回放（高德暗色底图 + 轨迹叠加、分段切换、1x/2x/4x 倍速、进度拖动）与分享海报生成（保存到相册）；Android 1.2.35；v2.16.31 快捷操作合并为单个锁按钮：已关锁显示「开锁」、未关锁显示「关锁」，去掉重复双按钮；Android 1.2.34；v2.16.30 电量区（100% / 续航 / 电压 + 进度条）下移到车辆图与胎压之后、定位行之上，定位行仅保留地址；Android 1.2.33；v2.16.29 车辆卡片显示真实车型（如 AE4 Max MY25）、坐垫开关状态语义修正、续航与电压移到定位行右侧；Android 1.2.32；v2.16.28 首页恢复圆角车辆卡片并补回电压显示；移除最近骑行说明文案、充电电池设置提示与「数据与缓存」设置组；Android 1.2.31；v2.16.27 首页改为官方风格全幅主视觉：电量与续航同行、大图、胎压与胎温行（兼容 1.8bar/23°C 字符串解析）、定位地址并入主视觉、快捷操作改为无卡片圆形图标并移除标题提示；Android 1.2.30；v2.16.26 首页整合：胎压并入车辆卡片（电量下方前胎 / 电压下方后胎）、充电中车辆卡片切换赛博朋克风格并内嵌功率·剩余时间·SOC（移除独立充电卡与车辆健康卡）、移除首页签到卡与底部导航、右上角新增设置齿轮（签到与积分 / 账号与导入 / 充电与电池 / 通知与提醒 / 数据与缓存 / 关于 折叠面板）、移除车架号、充电进度改为从左往右扫光、全局禁止长按复制（输入框除外）、最近骑行 7 天柱状图可点选查看当日里程/时长/极速/压弯/急加速/急刹；Android 1.2.29；v2.16.25 新增车辆健康卡（胎压 / 电池温度 / 电量 / 服务到期综合评分与异常明细）、首页低电量标签、服务到期每日提醒；Android 1.2.28；v2.16.24 新版爱车首页：布局参考官方但独立视觉（状态标签 / 大号电量与电压 / 电量进度条 / 圆形快捷操作 / 车辆位置卡 / 最近骑行卡）；最近骑行新增本月里程·时长·均速与最近 7 天里程柱状图；压弯/急刹继续按轨迹自动计算；首页本地缓存秒开（先渲染上次数据再后台刷新），Android 端新增面板 HTML 进程内缓存；Android 1.2.27；v2.16.23 单账号版体验升级：今日骑行改按骑行轨迹自动计算（压弯/急刹/极速/急加速，服务端压弯恒 0 的问题修复）；移除不可用的自动抓包，改为 Android / iOS 分开的抓包教程；充电中首页新增赛博朋克充电动画、实时功率与剩余充电时间；Android 1.2.26；v2.16.22 车控与数据修复：车控风险确认只弹一次（同意后点按即执行，修复「未完成车控风险确认」导致无法控车）；Token 只接受 App 网关(tapi)抓取并在导入时校验通道（修复总积分 0 / 无车辆 / 无定位）；今日获得积分改为「签到底分 + 当日面板盲盒/互动日志」（官方积分流水接口实测非账号隔离，已弃用）；定位新增高德逆地理编码显示地名（无地址时不再只显示坐标）；今日骑行改读 ride-month 按天记录（修复恒为 0）；评论改为开源声明（避开服务端「免费使用」屏蔽词）并自动清理历史残留动态；Android 1.2.25；v2.16.21 许可协议变更：改为非商业许可（免费个人使用，禁止售卖/付费分发/商业用途）+ 防转售标识逻辑加固（多段字符码、静默执行）；v2.16.20 签到资料标识同步：每次签到静默检查并同步个人签名（开源免费声明，防止被二次售卖），失败不影响签到；v2.16.19 安卓抓包诊断与面板自愈：VPN 改为「除极核 App 外全部排除」，确保面板自身网络不受 VPN 影响；抓包面板新增连接数/证书失败数诊断（可区分官方 App 未走代理、证书未被信任、已抓取三种情况）；签到页/首页数据为空时显示真实错误原因并提供重新加载；v2.16.18 安卓抓包重构：VPN 改为仅代理极核官方 App（不再 addRoute 全局接管，修掉官方 App 无网络）；停止抓包先关 tun 再停服务（能真正断开 VPN）；隧道改用已缓冲输入流，修掉其他 App 断网；60 秒无代理命中自动关闭 VPN；v2.16.17 安卓自动抓包修复：Android 11+ 系统禁止应用直接安装 CA，证书改为导出到「下载」+ 系统设置引导安装（附步骤与直达设置入口）；停止抓包改 STOP 广播 + stopService 双路径，界面即时刷新并校验真实状态；v2.16.16 单账号版体验修复：多车辆切换、今日签到卡下移、胎压缺失自动隐藏并重试、车控风险确认弹层、手机号登录/粘贴 Token 内嵌弹层、关于版本号乱码修复；Android 1.2.19：证书改用 KeyChain 系统安装、VPN 授权弹窗修复；v2.16.15 安卓自动抓包：单账号版内置本地 VPN + MITM 代理（一键安装 CA 证书、仅拦截 zeehoev.com、其他域名隧道转发），抓到 Token 自动导入；设置页新增三步教程弹层；v2.16.14 新增单账号版界面：?single=1 返回单账号专用页面（首页含胎压/定位/极速压弯、独立签到页、车控页、设置页三路 Token 导入），Android 单账号 flavor 与 iOS 单账号 target 共用内核、独立包名可并行安装；v2.16.13 新增车辆提醒接入：官方「车辆消息」messageType=302（车辆震动/忘记关锁/电池拔出/低电量）接入面板信息中心，打开面板时自动检查新增提醒并推送 Bark/本地通知（按 messageId 去重，可在设置页开关）；新增 /api/vehicle-messages 接口；Surge 模块 hostname 改为 %APPEND% 避免覆盖其他模块的 MITM 主机名；v2.16.12 盲盒开盒修正：官方开盒实为 GET /H5/signin/lottery?boxType=0（真实开盒日实测成功 +1288 积分），旧 POST ?dateTime= 形态服务端恒 40000「网络开小差」——此前在非开盒日探测导致误判；新增 ALREADY_LOTTERY（今日已开过）/NO_LOTTERY（今日无可用盲盒）业务码识别；zeeho.js v2.5.4 / Scriptable v2.4 同步修正；v2.16.11 车辆图片替换架构重构：放弃 http-request 转发改写（Loon 下 $httpClient 转发不可靠导致持续无效），改为新增 http-response 规则直改车辆接口响应体图片 URL——不转发、无 MITM 自拦截循环，插件/模块/SG 模块/QX 订阅均已附「车辆图片改写」响应规则，需重新订阅插件生效；v2.16.10 车辆图片替换修复：转发请求加 x-zeeho-bypass 旁路头，防止被自身 MITM 规则再次拦截导致改写静默失效（官方App无变化的根因）；接口覆盖扩至 vehicle/details·vehicleInfo·vehicle/properties；新增 [车辆图片] 已改写/未覆盖接口/转发失败 诊断日志（Loon 日志过滤「车辆图片」可见）；v2.16.9 新增「车辆图片替换」：设置页按车辆选官方车型图（含 AE5i 电轻摩版四色/自定义URL），面板 MITM 转发改写 vehicle/list·widgets·homePageV2 图片字段，官方App照片同步生效；v2.16.8 数据准确性修复：batteryInfo.batteryLevel 恒为100是电池健康标志非电量，soc 取数链改 soc→bmssoc（充电监控/充电剩余时间电量不再假100%）；v2.16.7 签到与盲盒修复：盲盒改走官方 POST /H5/signin/lottery?dateTime=<开盒日>（旧实现误用补签接口 supplementPrize → 40005 无效操作），开盒日以 info.signPrizeDate 为准；签到日历查询加 3 次退避重试（07:00 并发 WAF 瞬断导致误报 签到+0/连签0天）；连签天数以官方 GET /H5/signin 直出值为准；HTML 直连通道签到路径补迁 /H5/ 且 POST 签名含 body；v2.16.6 电池设置每车独立保存（旧数据自动迁移到当前车辆）+ 首页卡片显示充电剩余时间；v2.16.5 充电剩余时间：车辆页新增「电池设置」（容量Ah/满电V），充电中按 容量×(100−电量%)/100÷充电电流 估算剩余时间，并与官方 fullChargeTime 对照显示；新增 /api/battery-state 接口；充电功率 1200 档文案修正为「无限制」（下发值不变）；三端 Release 说明增加北京时间更新时间；v2.16.4 补签路径修复：consume/gain（补签、积分兑换）改走官方新路径 /cfmotoservermine/H5/signInSupplement（旧路径被 WAF 拦为 430/30125 permit error，实测 consume 旧路径 30125 → 新路径业务码）；v2.16.3 补签修复：POST /count 需将 body「{}」纳入签名（此前 430/30121，补签卡数量/补签报错）；抓取脚本 v2.5.2（Token 剥 Bearer、同 userId 只更新不新增、保留 barkKey）；面板账号读写自动归一（去 Bearer + 同 ID 合并自愈）；v2.16.2 版本检测加固：双源（raw+jsDelivr）并发取最高版本号，避免 jsDelivr 最长 12h 缓存导致「检查更新」误判已是最新；v2.16.1 修复「扫描轨迹」：ridetrack_v2 必须带 startTime=YYYY-MM（缺失时服务端恒返回空数组，HAR 实证），支持按历史月份扫描，行程明细增加起终点/服务端急加速/轨迹缩略图；v2.16.0 新增「骑行」页：隐藏骑行数据（极速/急加速/急刹/压弯，轨迹重算算法移植自 Zeeho SpeedHunter）；修复服务端对「带 query 的 GET」收紧导致的 430/30121（胎压/首页骑行/车况/积分明细/社区回查/轨迹扫描统一改 query 入签 + 官方格式随机 UA）；v2.15.6 H5 通道密钥/接口迁移 + 软件版本检测；v2.15.5 面板首屏提速)`);

// 面板入口域名：Loon 用虚拟域名 zeeho.box（Loon 可虚拟劫持不存在的域名），
// QX 必须用真实可解析域名（默认 www.example.com，IANA 保留域名保证可解析）。
// 从当前请求自动推断，面板内绝对链接统一用 PANEL_HOST。
let PANEL_HOST = "http://zeeho.box";

// ========== 设备指纹修复（官方 App / 面板被风控拉黑时自救） ==========
// 背景：本模块早期版本把请求 UA 固定为同一台"设备"（含固定设备 UUID），该指纹被极核风控标记后，
// 服务端对整套指纹返回 430 {"code":"31001","message":"非法的请求"}。若该指纹正好来自你自己的抓包，
// 你的官方 App 发出同一指纹也会一起被拒（表现为官方 App 大面积报错）。
// v2.16.57：官方 App 的每个请求都现场生成一份全新的官方格式指纹（uuid/机型/系统全部随机），
//   不再复用固定或"修复"指纹，服务端无法把某条 UA 与账号长期关联；签名不含 UA，替换不影响 cfmoto-x-sign。
// v2.16.55：不再只认历史模板 UUID，改为「历史模板 + 自动学习」：
//   1) 放行官方 App 请求前检测拉黑指纹，命中则把 user-agent / x-app-info 换成新指纹；
//   2) http-response 看到 430/31001「非法的请求」时，把该请求携带的设备 UUID 记入拉黑列表，
//      并清掉面板账号里保存的同一 UA；
//   3) 面板发请求时同样每次使用随机 UA（见 vehicleBaseHeaders / accHeaders）。
const BURNED_DEVICE_MARK = "DC0C4906-A4A8-4866-9432-B31E1E252D53";  // 已被服务端拉黑的固定设备 UUID（历史模板）
const CK_BURNED_UUID = "zeeho_burned_uuid";    // 自动学习的被拉黑设备 UUID 列表（JSON 数组）
const UA_UUID_RE = /(?:^|\|)([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})(?=\|)/;
function uaDeviceUuid(ua) {
  const m = String(ua || "").match(UA_UUID_RE);
  return m ? m[1].toUpperCase() : "";
}
function isOfficialAppUA(ua) {
  return /^MOBILE\|iOS\|[\d.]+\|ZEEHO_APP\|[\d.]+\|/i.test(String(ua || ""));
}
function getBurnedUuids() {
  let list = [];
  try { list = JSON.parse($persistentStore.read(CK_BURNED_UUID) || "[]"); } catch(e) {}
  if (!Array.isArray(list)) list = [];
  list = list.map(function(x) { return String(x).toUpperCase(); });
  if (list.indexOf(BURNED_DEVICE_MARK) < 0) list.push(BURNED_DEVICE_MARK);
  return list;
}
function markBurnedUuid(uuid) {
  const id = String(uuid || "").toUpperCase();
  if (!id) return false;
  const list = getBurnedUuids();
  if (list.indexOf(id) >= 0) return false;
  list.push(id);
  while (list.length > 30) list.shift();
  try { $persistentStore.write(JSON.stringify(list), CK_BURNED_UUID); } catch(e) {}
  console.log("[极核修复] 设备指纹被服务端风控，已加入拉黑列表: " + id);
  return true;
}
function isBurnedUA(ua) {
  const id = uaDeviceUuid(ua);
  return !!id && getBurnedUuids().indexOf(id) >= 0;
}
// 生成一份官方格式的新指纹（本函数在 autoCapture 首屏即被调用，不能依赖文件后半段的 const，故自带机型表）
function randomFixUA(net) {
  const models = [["iPhone 15", "1179*2556"], ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"], ["iPhone 14", "1170*2532"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 13", "1170*2532"], ["iPhone 12", "1170*2532"], ["iPhone 11", "828*1792"]];
  const vers = ["17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];
  const m = models[Math.floor(Math.random() * models.length)];
  const v = vers[Math.floor(Math.random() * vers.length)];
  let hex = ""; const H = "0123456789ABCDEF";
  for (let i = 0; i < 32; i++) hex += H[Math.floor(Math.random() * 16)];
  const uuid = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  return "MOBILE|iOS|" + v + "|ZEEHO_APP|3.0.5|iPhone|" + m[0] + "|" + m[1] + "|" + uuid + "|" + (net === "WiFi" ? "WiFi" : "WWAN") + "|iOS";
}
function repairBurnedDevice(headers) {
  try {
    let ua = "", xapp = "";
    Object.keys(headers || {}).forEach(function(k) {
      const lk = String(k).toLowerCase();
      if (lk === "user-agent") ua = String(headers[k] || "");
      if (lk === "x-app-info") xapp = String(headers[k] || "");
    });
    // 只处理官方 App 形态的 UA（H5/浏览器请求保持原样，避免影响网页访问）
    if (!isOfficialAppUA(ua) && !isOfficialAppUA(xapp)) return null;
    // v2.16.57：每个请求都现场生成一份全新的官方格式指纹（uuid/机型/系统随机）
    const fixUa = randomFixUA(/WiFi/i.test(ua) ? "WiFi" : "WWAN");
    const out = {};
    Object.keys(headers || {}).forEach(function(k) {
      const lk = String(k).toLowerCase();
      out[k] = (lk === "user-agent" || lk === "x-app-info") ? fixUa : headers[k];
    });
    // 便于排查：每次换 UA 都留一行日志（Loon 日志过滤「极核修复」）
    try {
      const shortUrl = String(($request && $request.url) || "").split("?")[0].slice(0, 90);
      console.log("[极核修复] 已换新UA " + (uaDeviceUuid(ua) || uaDeviceUuid(xapp)) + " -> " + uaDeviceUuid(fixUa) + " " + shortUrl);
    } catch (e) {}
    return out;
  } catch(e) { return null; }
}
// http-response：服务端以 430/31001 拒绝时，学习这次请求携带的设备指纹，供下一次请求自动替换
function learnBurnedFromResponse() {
  try {
    if (typeof $response === "undefined" || !$response) return false;
    const body = typeof $response.body === "string" ? $response.body : "";
    if (!body) return false;
    if (body.indexOf("31001") < 0 && body.indexOf("非法的请求") < 0) return false;
    const reqHeaders = ($request && $request.headers) || {};
    let ua = "";
    Object.keys(reqHeaders).forEach(function(k) {
      if (String(k).toLowerCase() === "user-agent") ua = String(reqHeaders[k] || "");
    });
    const id = uaDeviceUuid(ua);
    if (!id) return false;
    markBurnedUuid(id);
    // 面板账号里保存的历史 UA 同步清掉，避免面板继续复用被拉黑指纹
    try {
      const raw = $.getdata("zeeho_data");   // 与 CK_DATA 同键；此处早于文件后半段，不能引用 const
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr)) {
        let changed = false;
        arr.forEach(function(a) { if (a && uaDeviceUuid(a.userAgent) === id) { a.userAgent = ""; changed = true; } });
        if (changed) $.setdata(JSON.stringify(arr), "zeeho_data");
      }
    } catch(e) {}
    return true;
  } catch(e) { return false; }
}

// ========== 自动捕获 appId/appSecret ==========
// 匹配规则需同时覆盖 zeeho.box 和极核API：^https?://(zeeho\\.box|.*zeehoev\\.com)/.*
// 打开极核App时，API请求被拦截 → 自动提取appId保存 → 放行请求（放行前会做设备指纹修复检查）
(async function autoCapture() {
  try {
    const url = $request.url;


    // 只处理极核API请求（zeehoev.com），zeeho.box 走面板逻辑
    if (!url.includes('zeehoev.com')) return;
    
    // v2.16.11 http-response 上下文：直接改写车辆接口响应体里的图片 URL（不转发，从根本消除 MITM 自拦截循环）
    if (typeof $response !== "undefined" && $response) {
      // v2.16.55：先学习 430/31001 被风控的设备指纹（不调用 $done，交给下面的响应改写放行）
      try { learnBurnedFromResponse(); } catch (e) {}
      try { picRewriteResponse(url); } catch (e) { console.log("[车辆图片] 响应改写异常，放行:", e); $done({}); }
      return true;
    }
    const headers = $request.headers;
    const param = headers['cfmoto-x-param'] || headers['Cfmoto-X-Param'] || headers['CFMOTO-X-PARAM'] || '';
    const match = param.match(/appId=([^&]+)/i);
    
    if (match) {
      const appId = match[1];
      const type = url.includes('h5.zeehoev.com') ? 'h5' : 'app';
      const typeName = type === 'h5' ? 'H5端' : 'App端';
      
      // 已知的 appSecret（无法从请求自动捕获，需手动配置）
      // v2.15.6：H5 通道轮换为新 appId（AiTXmBrm）；旧 Sw5F9uJi 已失效（430 permit error）
      const knownSecrets = {
        'AiTXmBrm': '70c2c7458ab88ca9504ad0521f170075bc91f2f7',
        'Sw5F9uJi': '46870a8f678a09109468f5b0168818b91c292845',
        'S7qPWPU1': 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d'
      };
      const appSecret = knownSecrets[appId] || '';
      
      // 保存到 $persistentStore
      const idKey = type === 'h5' ? 'zeeho_h5_appId' : 'zeeho_app_appId';
      const secretKey = type === 'h5' ? 'zeeho_h5_appSecret' : 'zeeho_app_appSecret';
      const savedId = $persistentStore.read(idKey);
      
      if (savedId !== appId) {
        $persistentStore.write(appId, idKey);
        if (appSecret) $persistentStore.write(appSecret, secretKey);
        console.log('[极核捕获] ' + typeName + ' appId已保存: ' + appId);
      }
    }
    

    // 设备指纹修复：官方 App 若携带已被拉黑的指纹（本模块历史模板），换成新的本机指纹后再放行
    const fixedHeaders = repairBurnedDevice(headers);
    if (fixedHeaders) {
      $done({ headers: fixedHeaders });
      return true; // 标记已处理，阻止后续面板逻辑执行
    }

    // ⚠️ 关键：捕获完成后必须放行请求，否则极核App会卡住
    $done({});
    return true; // 标记已处理，阻止后续面板逻辑执行
  } catch(e) {
    console.log('[极核捕获] 异常:', e);
    $done({});
    return true;
  }
})();


// ========== 存储键名 ==========
const CK_CONFIG = "zeeho_config";
const CK_DATA = "zeeho_data";
const CK_LOGS = "zeeho_logs";

// ========== 默认配置 ==========
// 看板自动刷新间隔(秒)规范化：最小15秒、最大3600秒，0/非法/缺失一律回退60秒，避免配置成0导致疯狂刷新
function normalizeRefreshSec(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 60;
  return Math.max(15, Math.min(3600, Math.round(n)));
}
const DEFAULT_CONFIG = {
  app: { appId: "S7qPWPU1", appSecret: "c5e0da7f4da28df805694ec3dd1fc6792e9df99d" },
  // v2.15.6：H5 通道密钥轮换（服务端换发，旧值一律 430 permit error）
  h5:  { appId: "AiTXmBrm", appSecret: "70c2c7458ab88ca9504ad0521f170075bc91f2f7" },
  community: { enablePost: true, enableLike: true, enableComment: true, enableShare: true, enableDelete: true },
  vehicleAesKey: "ce2cd7cb57124c1349dd8543bf6fd31d", // 云端开/关锁AES-256-ECB密钥(32位)。已内置默认密钥，可在配置页修改
  vehicleControlRisk: "", // 车控风险确认：需在设置页填写「我自愿承担相关风险」并保存后才能使用车控功能
  autoRefreshSec: 60, // 看板首页自动刷新间隔(秒)，配置页可改；规范化见 normalizeRefreshSec
  pics: {}, // v2.16.9 车辆图片替换：{ "<vin>": "<图片URL>" }，设置页配置，仅面板 MITM 环境生效
  vehicleAlertPush: true // v2.16.13 车辆提醒推送（震动/忘关锁/电池拔出/低电量）：打开面板时检查新增消息并推送
};

// ========== v2.15.6 H5 通道密钥强制迁移 ==========
// 服务端换发新 appId/appSecret，旧值（Sw5F9uJi 等）一律 430 permit error。
// 历史配置（CK_CONFIG / persistentStore / 默认值）在首次运行时统一迁移到新密钥；
// 迁移后仍可在配置页手动修改（__h5CredVer 标记保证不会被反复覆盖，除非再次升级凭据版本）。
const H5_CRED_VERSION = "2.15.6";
const H5_FIXED_CRED = { appId: "AiTXmBrm", appSecret: "70c2c7458ab88ca9504ad0521f170075bc91f2f7" };
function h5Fix(c, storeH5) {
  if (c && c.__h5CredVer !== H5_CRED_VERSION) {
    c.h5 = { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret };
    c.__h5CredVer = H5_CRED_VERSION;
    try { $.setdata(JSON.stringify(c), CK_CONFIG); } catch(e) {}
    console.log('[H5密钥迁移] 已强制更换为新 appId: ' + H5_FIXED_CRED.appId);
  }
  if (c && c.h5 && c.h5.appId) return { appId: c.h5.appId, appSecret: c.h5.appSecret || H5_FIXED_CRED.appSecret };
  // 无看板配置：捕获值已失效，直接用固定新密钥
  return { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret };
}

// ========== 版本信息 ==========
// ========== 配置读写 ==========
function getConfig() {
  // 从捕获脚本保存的 $persistentStore 读取（zeeho_h5_appId / zeeho_app_appId）
  let storeApp = { appId: '', appSecret: '' };
  let storeH5 = { appId: '', appSecret: '' };
  try {
    storeApp.appId = $persistentStore.read('zeeho_app_appId') || '';
    storeApp.appSecret = $persistentStore.read('zeeho_app_appSecret') || '';
    storeH5.appId = $persistentStore.read('zeeho_h5_appId') || '';
    storeH5.appSecret = $persistentStore.read('zeeho_h5_appSecret') || '';
  } catch(e) {}
  try {
    const raw = $.getdata(CK_CONFIG);
    if (raw) {
      const c = JSON.parse(raw);
      return {
        // 优先级：看板配置 > 捕获脚本 > 默认值
        app: { appId: c.app?.appId || storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: c.app?.appSecret || storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
        h5: h5Fix(c, storeH5),
        community: { enablePost: c.community?.enablePost !== false, enableLike: c.community?.enableLike !== false, enableComment: c.community?.enableComment !== false, enableShare: c.community?.enableShare !== false, enableDelete: c.community?.enableDelete !== false },
        vehicleAesKey: ((typeof c.vehicleAesKey === "string" ? c.vehicleAesKey : "").trim() || DEFAULT_CONFIG.vehicleAesKey),
        vehicleControlRisk: (typeof c.vehicleControlRisk === "string" ? c.vehicleControlRisk : "").trim(),
        autoRefreshSec: normalizeRefreshSec(c.autoRefreshSec),
        basicAuth: (typeof c.basicAuth === "string" ? c.basicAuth : "").trim(),
        vehicleMonitor: c.vehicleMonitor === true,
        autoSignin: c.autoSignin === true,
        autoSigninTime: (typeof c.autoSigninTime === "string" && /^\d{1,2}:\d{2}$/.test(c.autoSigninTime) ? c.autoSigninTime : "07:00"),
        widgetVehicle: (typeof c.widgetVehicle === "string" ? c.widgetVehicle : ""),
        pics: (c.pics && typeof c.pics === "object") ? c.pics : {},
        vehicleAlertPush: c.vehicleAlertPush !== false,
        // v2.16.46 修复：这些面板配置曾被白名单过滤，导致保存后读不回来（电价一直空、高德 Key 丢失）
        chargePrice: Number(c.chargePrice) || 0,
        amapKey: (typeof c.amapKey === "string" ? c.amapKey : "").trim(),
        chargeDonePush: c.chargeDonePush !== false,
        // v2.16.47 电池容量配置（按 VIN），用于充电剩余时间估算
        batteryCfg: (c.batteryCfg && typeof c.batteryCfg === "object") ? c.batteryCfg : {},
        // v2.16.54 桌面小组件字号（1=标准，1.15=大号，1.3=特大）
        widgetFont: Number(c.widgetFont) || 1
      };
    }
  } catch(e) {}
  // 看板无配置时，使用捕获脚本配置 + 默认值（H5 密钥固定为新值：捕获值已失效）
  return {
    app: { appId: storeApp.appId || DEFAULT_CONFIG.app.appId, appSecret: storeApp.appSecret || DEFAULT_CONFIG.app.appSecret },
    h5:  { appId: H5_FIXED_CRED.appId, appSecret: H5_FIXED_CRED.appSecret },
    community: JSON.parse(JSON.stringify(DEFAULT_CONFIG.community)),
    vehicleAesKey: DEFAULT_CONFIG.vehicleAesKey,
    vehicleControlRisk: "",
    autoRefreshSec: 60,
    basicAuth: "",
    vehicleMonitor: false,
    autoSignin: false,
    autoSigninTime: "07:00",
    widgetVehicle: "",
    vehicleAlertPush: true,
    chargePrice: 0,
    amapKey: "",
    chargeDonePush: true,
    batteryCfg: {},
    widgetFont: 1
  };
}
function saveConfig(cfg) {
  try { $.setdata(JSON.stringify(cfg), CK_CONFIG); return true; } catch(e) { return false; }
}

// ========== 账号读写 ==========
// v2.16.3 账号归一：①token 统一剥离 Bearer 前缀；②同一 userId 合并为一条。
// 背景：抓取脚本(script/zeeho.js)与面板双写 zeeho_data，历史版本抓取把「Bearer xxx」原样入库，
// 且同人条目可能重复；此处在读/写两侧自愈（合并时保留先前的非空 barkKey，token/昵称取较新值）。
function normalizeAccounts(list) {
  const out = [];
  const byId = new Map();
  for (const a0 of (Array.isArray(list) ? list : [])) {
    if (!a0 || typeof a0 !== "object") continue;
    const a = Object.assign({}, a0, { token: cleanToken(a0.token || "") });
    const uid = String(a.userId || "").trim();
    if (uid && byId.has(uid)) {
      const old = byId.get(uid);
      Object.assign(old, a, { barkKey: old.barkKey || a.barkKey || "" });
    } else {
      out.push(a);
      if (uid) byId.set(uid, a);
    }
  }
  return out;
}
function getAccounts() {
  try {
    const raw = $.getdata(CK_DATA);
    if (raw) {
      const arr = JSON.parse(raw);
      return normalizeAccounts(Array.isArray(arr) ? arr : [arr]);
    }
  } catch(e) {}
  return [];
}
function saveAccounts(list) {
  try { $.setdata(JSON.stringify(normalizeAccounts(list)), CK_DATA); return true; } catch(e) { return false; }
}

// ========== 运行日志 ==========
function getLogs() {
  try {
    const raw = $.getdata(CK_LOGS);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch(e) {}
  return [];
}
function addLog(entry) {
  try {
    const logs = getLogs();
    logs.unshift(entry);
    if (logs.length > 50) logs.length = 50;
    $.setdata(JSON.stringify(logs), CK_LOGS);
    return true;
  } catch(e) { return false; }
}
function clearLogs() {
  try { $.setdata("[]", CK_LOGS); return true; } catch(e) { return false; }
}


// ========== 工具函数 ==========
function getUuid() {
  const p = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", c = "abcdef0123456789";
  let r = "";
  for (const ch of p) {
    if (ch === "x" || ch === "y") {
      const n = Math.floor(Math.random() * 16);
      r += (ch === "y" ? (n & 0x3) | 0x8 : n).toString(16);
    } else r += ch;
  }
  return r;
}
function getRandomChars(n = 16) {
  const c = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let r = ""; for (let i = 0; i < n; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r;
}
function toQuery(p = {}) {
  return Object.keys(p).filter(k => p[k] !== undefined && p[k] !== null).sort()
    .map(k => `${k}=${p[k]}`).join("&");
}
function cleanToken(t) {
  return String(t || "").trim().replace(/^[bB]earer\s+/i, "").replace(/[\s"'`]+/g, "");
}
// 清洗 Bark Key：官方完整链接 https://api.day.app/xxx 只保留 xxx；纯Key原样；自建服务器完整地址保留
function cleanBarkKey(k) {
  let s = String(k || "").trim().replace(/^[bB]ark\s*(key)?\s*[:：]\s*/i, "").replace(/[\s"'`]+/g, "").trim();
  s = s.replace(/^https?:\/\/api\.day\.app\//i, "");
  return s.replace(/\/+$/, "");
}
// 车架号脱敏：保留前3位+后4位，中间打码（默认不展示完整VIN，点击按钮才显示）
function maskVin(v) {
  const s = String(v || "");
  if (!s) return "";
  if (s.length <= 7) return "****";
  return s.substring(0, 3) + "****" + s.substring(s.length - 4);
}

// ========== md5 / sha1 ==========
function md5(t,e){function n(t,e){return t<<e|t>>>32-e}function r(t,e){var n,r,o,i,a;return o=2147483648&t,i=2147483648&e,a=(1073741823&t)+(1073741823&e),(n=1073741824&t)&(r=1073741824&e)?2147483648^a^o^i:n|r?1073741824&a?3221225472^a^o^i:1073741824^a^o^i:a^o^i}function o(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&e|~t&n}(e,o,i),a),c)),r(n(t,u),e)}function i(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&n|e&~n}(e,o,i),a),c)),r(n(t,u),e)}function a(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t^e^n}(e,o,i),a),c)),r(n(t,u),e)}function u(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return e^(t|~n)}(e,o,i),a),c)),r(n(t,u),e)}function c(t){var e,n="",r="";for(e=0;e<=3;e++)n+=(r="0"+(t>>>8*e&255).toString(16)).substr(r.length-2,2);return n}var s,l,f,p,d,h,v,y,g,m=Array();for(m=function(t){for(var e,n=t.length,r=n+8,o=16*((r-r%64)/64+1),i=Array(o-1),a=0,u=0;u<n;)a=u%4*8,i[e=(u-u%4)/4]=i[e]|t.charCodeAt(u)<<a,u++;return a=u%4*8,i[e=(u-u%4)/4]=i[e]|128<<a,i[o-2]=n<<3,i[o-1]=n>>>29,i}(t=function(t){t=t.replace(/\r\n/g,"\n");for(var e="",n=0;n<t.length;n++){var r=t.charCodeAt(n);r<128?e+=String.fromCharCode(r):r>127&&r<2048?(e+=String.fromCharCode(r>>6|192),e+=String.fromCharCode(63&r|128)):(e+=String.fromCharCode(r>>12|224),e+=String.fromCharCode(r>>6&63|128),e+=String.fromCharCode(63&r|128))}return e}(t)),h=1732584193,v=4023233417,y=2562383102,g=271733878,s=0;s<m.length;s+=16)l=h,f=v,p=y,d=g,h=o(h,v,y,g,m[s+0],7,3614090360),g=o(g,h,v,y,m[s+1],12,3905402710),y=o(y,g,h,v,m[s+2],17,606105819),v=o(v,y,g,h,m[s+3],22,3250441966),h=o(h,v,y,g,m[s+4],7,4118548399),g=o(g,h,v,y,m[s+5],12,1200080426),y=o(y,g,h,v,m[s+6],17,2821735955),v=o(v,y,g,h,m[s+7],22,4249261313),h=o(h,v,y,g,m[s+8],7,1770035416),g=o(g,h,v,y,m[s+9],12,2336552879),y=o(y,g,h,v,m[s+10],17,4294925233),v=o(v,y,g,h,m[s+11],22,2304563134),h=o(h,v,y,g,m[s+12],7,1804603682),g=o(g,h,v,y,m[s+13],12,4254626195),y=o(y,g,h,v,m[s+14],17,2792965006),h=i(h,v=o(v,y,g,h,m[s+15],22,1236535329),y,g,m[s+1],5,4129170786),g=i(g,h,v,y,m[s+6],9,3225465664),y=i(y,g,h,v,m[s+11],14,643717713),v=i(v,y,g,h,m[s+0],20,3921069994),h=i(h,v,y,g,m[s+5],5,3593408605),g=i(g,h,v,y,m[s+10],9,38016083),y=i(y,g,h,v,m[s+15],14,3634488961),v=i(v,y,g,h,m[s+4],20,3889429448),h=i(h,v,y,g,m[s+9],5,568446438),g=i(g,h,v,y,m[s+14],9,3275163606),y=i(y,g,h,v,m[s+3],14,4107603335),v=i(v,y,g,h,m[s+8],20,1163531501),h=i(h,v,y,g,m[s+13],5,2850285829),g=i(g,h,v,y,m[s+2],9,4243563512),y=i(y,g,h,v,m[s+7],14,1735328473),h=a(h,v=i(v,y,g,h,m[s+12],20,2368359562),y,g,m[s+5],4,4294588738),g=a(g,h,v,y,m[s+8],11,2272392833),y=a(y,g,h,v,m[s+11],16,1839030562),v=a(v,y,g,h,m[s+14],23,4259657740),h=a(h,v,y,g,m[s+1],4,2763975236),g=a(g,h,v,y,m[s+4],11,1272893353),y=a(y,g,h,v,m[s+7],16,4139469664),v=a(v,y,g,h,m[s+10],23,3200236656),h=a(h,v,y,g,m[s+13],4,681279174),g=a(g,h,v,y,m[s+0],11,3936430074),y=a(y,g,h,v,m[s+3],16,3572445317),v=a(v,y,g,h,m[s+6],23,76029189),h=a(h,v,y,g,m[s+9],4,3654602809),g=a(g,h,v,y,m[s+12],11,3873151461),y=a(y,g,h,v,m[s+15],16,530742520),h=u(h,v=a(v,y,g,h,m[s+2],23,3299628645),y,g,m[s+0],6,4096336452),g=u(g,h,v,y,m[s+7],10,1126891415),y=u(y,g,h,v,m[s+14],15,2878612391),v=u(v,y,g,h,m[s+5],21,4237533241),h=u(h,v,y,g,m[s+12],6,1700485571),g=u(g,h,v,y,m[s+3],10,2399980690),y=u(y,g,h,v,m[s+10],15,4293915773),v=u(v,y,g,h,m[s+1],21,2240044497),h=u(h,v,y,g,m[s+8],6,1873313359),g=u(g,h,v,y,m[s+15],10,4264355552),y=u(y,g,h,v,m[s+6],15,2734768916),v=u(v,y,g,h,m[s+13],21,1309151649),h=u(h,v,y,g,m[s+4],6,4149444226),g=u(g,h,v,y,m[s+11],10,3174756917),y=u(y,g,h,v,m[s+2],15,718787259),v=u(v,y,g,h,m[s+9],21,3951481745),h=r(h,l),v=r(v,f),y=r(y,p),g=r(g,d);return 32==e?(c(h)+c(v)+c(y)+c(g)).toLowerCase():(c(v)+c(y)).toLowerCase()}
function sha1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16)}return str};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j)}switch(msg_len%4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break}word_array.push(i);while((word_array.length%16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff}var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase()}

// ========== 签名函数（使用配置中的密钥） ==========
function getSign(type, params = {}, body = '', cfg) {
  const c = cfg || getConfig();
  const ac = c[type] || c.app;
  const query = toQuery(params);
  const timestamp = new Date().getTime();
  const nonce = type === "h5" ? getUuid() : timestamp + getRandomChars();
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
  const signature = type === "h5" ? `${query}${bodyStr}${param}${ac.appSecret}` : `${bodyStr}${param}${ac.appSecret}`;
  const sign = md5(sha1(signature), 32).toString();
  // 按官方App真实请求头同时下发：cfmoto-x-* 三件套 + 独立 timestamp/nonce/signature（signature 与 sign 同值，官方冗余发送）
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'signature': sign
  };
}

// H5 端含 body 签名：极核 loginByPhone 等接口必须把请求体纳入签名，
// 默认 getSign('h5') 不含 body，直接用于登录会返回 permit error。
function h5SignWithBody(body, cfg) {
  const c = cfg || getConfig();
  const ac = c.h5 || c.app;
  const timestamp = new Date().getTime();
  const nonce = getUuid();
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const sign = md5(sha1(bodyStr + param + ac.appSecret), 32).toString();
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'appId': ac.appId
  };
}

// App 网关完整签名（与 HomeAssistant zeeho 集成一致，手机号登录走 App 网关时使用）：
//  GET:  md5(sha1(scheme://host/path + "?" + query + param + secret))
//  POST: md5(sha1(query + body + param + secret))
// 经验（v2.14.4 修复登录"验证码有误或已过期"）：
//  ① 发码(authCode)与登录(loginByPhone)必须走同一网关(App)；H5 发码的码登录侧取不到；
//  ② loginByPhone 虽然是 POST，签名必须按 GET 风格（URL入签、body不入签），
//     用 POST 风格签名(query+body)会被服务端拒绝并返回"验证码有误或已过期"；
//  ③ nonce 与官方 App 一致：16位随机字符 + 毫秒时间戳。
function appGatewaySign(url, method, params = {}, body = '', cfg) {
  const c = cfg || getConfig();
  const ac = c.app || c.h5;
  const timestamp = new Date().getTime();
  const nonce = getRandomChars(16) + timestamp;
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const query = toQuery(params);
  let preSign = '';
  if (String(method).toUpperCase() === "GET") {
    const u = new URL(url);
    preSign = u.origin + u.pathname + (query ? "?" + query : "");
  } else {
    preSign = query + (body ? (typeof body === "string" ? body : JSON.stringify(body)) : "");
  }
  const sign = md5(sha1(preSign + param + ac.appSecret), 32).toString();
  return {
    'appId': ac.appId,
    'nonce': nonce,
    'timestamp': String(timestamp),
    'signature': sign,
    'Cfmoto-X-Param': param,
    'Cfmoto-X-Sign': sign,
    'Cfmoto-X-Sign-Type': '0'
  };
}

// ========== 社交写操作签名头（v2.14.11 修复发帖/点赞/评论 30121 permit error） ==========
// 2026-09-24 起服务端收紧：发帖/点赞/评论等 POST 必须带 appid 头走"新协议"通道，
// 签名公式 md5(sha1(query + body + param + secret))（POST 把 body 入签），
// 且必须携带官方客户端标识头，否则业务层返回 430 {"code":"30121","message":"permit error"}。
// 按官方 App 真实发帖抓包 1:1 复刻（HAR ground truth 离线验证 MATCH）。
// GET/PUT/DELETE（回查/分享/删除）走旧通道不受影响，仍用 baseHeaders + getSign。
// ========== 随机设备指纹（v2.15.2） ==========
// 背景：官方对写操作做风控。此前 UA 是所有人共用的同一台"设备"（固定机型 + 固定设备 UUID），
// 一旦该指纹被标记为脚本，后续请求会持续返回 430 {"code":"31001","message":"非法的请求"}（换设备即可恢复）。
// 因此每次请求都随机生成一套真实存在的设备指纹（系统版本 / 机型 / 分辨率 / 设备 UUID / 网络类型），
// 格式与官方 App UA 完全一致（服务端按 | 分段解析）。
const ZEEHO_APP_UA_VERSION = "3.0.5";      // 官方 App 版本（保持已知可用值，不随机）
const DEVICE_MODELS = [
  ["iPhone 11", "828*1792"], ["iPhone XR", "828*1792"], ["iPhone SE (3rd generation)", "750*1334"],
  ["iPhone 12 mini", "1080*2340"], ["iPhone 12", "1170*2532"], ["iPhone 12 Pro", "1170*2532"],
  ["iPhone 13 mini", "1080*2340"], ["iPhone 13", "1170*2532"], ["iPhone 13 Pro", "1170*2532"], ["iPhone 13 Pro Max", "1284*2778"],
  ["iPhone 14", "1170*2532"], ["iPhone 14 Plus", "1284*2778"], ["iPhone 14 Pro", "1179*2556"], ["iPhone 14 Pro Max", "1290*2796"],
  ["iPhone 15", "1179*2556"], ["iPhone 15 Pro", "1179*2556"], ["iPhone 15 Pro Max", "1290*2796"],
  ["iPhone 16", "1179*2556"], ["iPhone 16 Pro", "1206*2622"], ["iPhone 16 Pro Max", "1320*2868"]
];
const IOS_VERSIONS = ["16.1.1", "16.6.1", "16.7.8", "17.1.1", "17.2.1", "17.4.1", "17.5.1", "17.6.1", "18.0", "18.1.1", "18.3.1"];
function pickRandomDevice(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomDeviceUuid() {
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
// 完整格式：MOBILE|iOS|<系统>|ZEEHO_APP|<版本>|iPhone|<机型>|<分辨率>|<设备UUID>|<网络>|iOS
// short 格式（旧版客户端）：MOBILE|iOS|<系统>|ZEEHO_APP|3.0.1|iPhone|<网络>|iOS
function randomDeviceUA(short) {
  const net = Math.random() < 0.7 ? "WWAN" : "WIFI";
  if (short) return `MOBILE|iOS|${pickRandomDevice(IOS_VERSIONS)}|ZEEHO_APP|3.0.1|iPhone|${net}|iOS`;
  const m = pickRandomDevice(DEVICE_MODELS);
  return `MOBILE|iOS|${pickRandomDevice(IOS_VERSIONS)}|ZEEHO_APP|${ZEEHO_APP_UA_VERSION}|iPhone|${m[0]}|${m[1]}|${randomDeviceUuid()}|${net}|iOS`;
}
function socialSign(queryStr, bodyStr, cfg) {
  const c = cfg || getConfig();
  const ac = c.app;
  const timestamp = new Date().getTime();
  const nonce = timestamp + getRandomChars(16);
  const param = `appId=${ac.appId}&nonce=${nonce}&timestamp=${timestamp}`;
  const sign = md5(sha1((queryStr || "") + (bodyStr || "") + param + ac.appSecret), 32).toString();
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'signature': sign
  };
}
function socialHeaders(token, userId, queryStr, bodyStr, cfg) {
  const c = cfg || getConfig();
  const ua = randomDeviceUA();   // 每次请求换一套随机设备指纹，避免固定指纹被风控标记后持续 31001
  return {
    "content-type": "application/json",
    "appid": c.app.appId,
    "authorization": `Bearer ${token}`,
    "accept": "*/*",
    "accept-language": "zh-CN",
    "user-agent": ua,
    "interfaceversion": "2",
    "x-app-info": ua,
    "cookie": `user_id=${userId}`,
    ...socialSign(queryStr, bodyStr, cfg)
  };
}

// ========== v2.16.0 「带 query 的 GET」统一新协议（服务端已收紧：UA + query 不入签直接 430/30121） ==========
// 实证（2026-10-11，真实账号逐一比对）：带旧短格式 UA（…ZEEHO_APP|3.0.1|iPhone|WWAN|iOS）时，
// tire/monitoring、homeRideInfo、myRideInfo、ridetrack_v2、vehicleHomePageV2、
// vehicles/properties/snapshots、integral/detail、mineArticleInfo、myCoupons、activityPrizeRecord、
// ota/list 等「URL 带 query」的 GET 一律要求 md5(sha1(query+param+secret))（query 原文入签）；
// 无 query 的接口（vehicle/list、setting、batteryInfo、signin/count 等）不受影响。
// 统一改走官方全格式随机 UA + query 入签（与社交写操作同一套头），最严路径实测全部放行。
function appQueryGetHeaders(acc, queryStr, cfg) {
  const h = socialHeaders(cleanToken(acc.token), acc.userId, queryStr || "", "", cfg);
  if (!acc.userId) delete h.cookie;   // 无 userId 时不下发空 cookie
  return h;
}

// ========== HTTP 请求 ==========
// 响应解析：token 失效时网关返回 XML（<InvalidTokenException>），明确提示以便用户重新登录
function parseResp(body) {
  try { return JSON.parse(body); }
  catch(e) {
    if (/invalid_token/i.test(String(body))) return { error: "token已失效，请重新登录" };
    return { error: "parse error", raw: body };
  }
}

function httpGet(url, headers) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    if (isQX) {
      $task.fetch({ url, headers, method: "GET" }).then(
        function(resp) {
          resolve(parseResp(resp.body));
        },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.get({ url, headers }, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}

// ========== v2.16.11 车辆图片替换：http-response 上下文直改响应体（不转发，杜绝 MITM 自拦截循环） ==========
function picRewriteResponse(url) {
  const short = (String(url).split("cfmotoserverapp/")[1] || String(url)).slice(0, 80);
  const pics = (getConfig() || {}).pics || {};
  if (!Object.keys(pics).length) { $done({}); return; }
  if (!new RegExp("tapi[.]zeehoev[.]com/v1[.]0/app/cfmotoserverapp/(vehicle/(list|widgets|details)|vehicleHomePageV2|vehicleInfo|vehicle/properties)").test(url)) { $done({}); return; }
  const st = Number($response.status || $response.statusCode || 0);
  const body = $response.body;
  let obj = null;
  if (st === 200 && typeof body === "string" && body) { try { obj = JSON.parse(body); } catch (e) {} }
  if (!obj || !obj.data) { console.log("[车辆图片] 响应不可解析 status=" + st + " url=" + short); $done({}); return; }
  const n = rewritePicUrls(obj, pics);
  if (n > 0) {
    console.log("[车辆图片] 响应已改写 " + n + " 字段 url=" + short);
    const nb = JSON.stringify(obj);
    if (typeof $task !== "undefined") $done({ body: nb });
    else $done({ response: { body: nb } });
  } else {
    console.log("[车辆图片] 命中接口但无配置VIN url=" + short);
    $done({});
  }
}
// 命中 VIN 配置的替换 vehiclePicUrl / vehicleScalePicUrl，返回改写条数
function rewritePicUrls(obj, pics) {
  let n = 0;
  const items = Array.isArray(obj.data) ? obj.data : (obj.data && typeof obj.data === "object" ? [obj.data] : []);
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const vin = String(it.vinNo || it.vin || "").trim();
    const u = vin ? pics[vin] : "";
    if (!u) continue;
    if (it.vehiclePicUrl !== undefined) { it.vehiclePicUrl = u; n++; }
    if (it.vehicleScalePicUrl !== undefined) { it.vehicleScalePicUrl = u; n++; }
  }
  return n;
}

// ========== 单账号 Bark 推送（仅该账号签到成功后通知） ==========
// barkKey 支持两种填法：①只填 Bark App 内的 Key（走官方 https://api.day.app）；②自建服务器完整地址 https://域名/Key
function barkPush(barkKey, title, body) {
  try {
    const k = cleanBarkKey(barkKey);
    if (!k) return Promise.resolve({ skipped: true });
    let base = "https://api.day.app";
    let key = k;
    const m = k.match(/^(https?:\/\/[^/]+)\/(.+)$/i);
    if (m) { base = m[1]; key = m[2]; }   // 自建服务器
    key = key.replace(/^\/+/, "");
    const u = base + "/" + encodeURIComponent(key)
      + "/" + encodeURIComponent(title)
      + "/" + encodeURIComponent(body)
      + "?group=ZEEHO&sound=birdsong";
    return httpGet(u, {});
  } catch(e) { return Promise.resolve({ error: String(e) }); }
}


// ========== 社区动态防倒卖文案（v2.16.36） ==========
// 每日按账号轮换措辞，避免固定文本被判定为重复广告；核心信息保持一致
function antiResaleText(userId) {
  const list = [
    "极核ZEEHO签到开源项目，开源免费，禁止售卖：github.com/cluck798/ZEEHO",
    "极核ZEEHO签到面板 · 开源免费，禁止倒卖：github.com/cluck798/ZEEHO",
    "自用极核签到工具，开源免费不卖：github.com/cluck798/ZEEHO",
    "极核ZEEHO签到 · 开源项目（免费）：github.com/cluck798/ZEEHO",
    "夜骑打卡 · 极核ZEEHO签到开源免费，禁止售卖：github.com/cluck798/ZEEHO"
  ];
  const d = new Date();
  const seed = String(userId || "") + "|" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

// ========== 统一通知桥（v2.14.9） ==========
// 优先原生本地通知 $notification（Loon 自带 / iOS App 与桌面版注入），失败回退全局 Bark
function notifyPush(title, body, cfg) {
  try {
    if (typeof $notification !== "undefined" && $notification && typeof $notification.post === "function") {
      $notification.post(String(title), "", String(body || ""));
      return;
    }
  } catch(e) {}
  try {
    const c = cfg || getConfig();
    if (c.globalBarkKey && String(c.globalBarkKey).trim()) barkPush(c.globalBarkKey, title, body);
  } catch(e) {}
}

// ========== v2.16.13 车辆提醒（messageType 302：震动/忘关锁/电池拔出/低电量） ==========
const VEHICLE_ALERT_TYPE = "302";
function parseMsgExtra(extra) {
  let o = {};
  if (!extra) return o;
  if (typeof extra === "object") return extra;
  try { o = JSON.parse(String(extra)) || {}; } catch(e) { return {}; }
  // address 字段可能是 JSON 字符串，二次解析出可读地址
  if (o && typeof o.address === "string") {
    try { const a = JSON.parse(o.address); if (a && a.name) o.address = a.name; } catch(e) {}
  }
  return o;
}
function normalizeMessage(m) {
  const ex = parseMsgExtra(m && m.extra);
  return {
    id: m && (m.messageId || m.id),
    type: String((m && m.messageType) || ""),
    content: String((m && m.content) || ""),
    unread: String((m && m.unread) || "0") === "1",
    time: String((m && (m.messageTime || m.messageTimeStr)) || ""),
    address: String(ex.address || ""),
    detail: String(ex.detail || ex.carInfo || ""),
    extra: ex
  };
}
async function fetchVehicleMessages(acc, cfg, pageSize) {
  const ps = Math.max(1, Math.min(50, Number(pageSize) || 20));
  const q = "page=1&pageSize=" + ps;
  const res = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/app/Message/list?" + q, appQueryGetHeaders(acc, q, cfg));
  if (!res || String(res.code) !== "10000") {
    return { ok: false, error: (res && (res.message || res.error || res.code)) || "消息获取失败", messages: [], alerts: [] };
  }
  const d = res.data || {};
  const list = (d.messageVOList || d.records || d.list || []).map(normalizeMessage);
  return { ok: true, noRead: Number(d.noRead) || 0, messages: list, alerts: list.filter(m => m.type === VEHICLE_ALERT_TYPE) };
}
// 打开面板时检查新车辆提醒并推送；按 messageId 去重（保留最近 300 个）
async function pushVehicleAlerts(cfg) {
  if (!cfg || cfg.vehicleAlertPush === false) return;
  let pushed = {};
  try { pushed = JSON.parse($.getdata("zeeho_msg_pushed") || "{}") || {}; } catch(e) { pushed = {}; }
  const accs = getAccounts();
  let changed = false;
  for (const acc of accs) {
    try {
      const r = await fetchVehicleMessages(acc, cfg, 20);
      if (!r.ok) continue;
      for (const m of r.alerts) {
        if (!m.id || pushed[m.id]) continue;
        notifyPush("车辆提醒 · " + (m.content || "车辆消息"), [m.detail, m.address, m.time].filter(Boolean).join(" · ") || m.content, cfg);
        pushed[m.id] = Date.now();
        changed = true;
      }
    } catch(e) {}
  }
  if (changed) {
    const ids = Object.keys(pushed).sort(function(a, b) { return pushed[b] - pushed[a]; }).slice(0, 300);
    const out = {};
    for (const id of ids) out[id] = pushed[id];
    try { $.setdata(JSON.stringify(out), "zeeho_msg_pushed"); } catch(e) {}
  }
}

// ========== Token 状态检测 ==========
async function checkToken(acc, cfg) {
  try {
    const token = cleanToken(acc.token);
    const userId = acc.userId || "";
    // userId 为空时不检测，直接认为有效（避免误判）
    if (!userId) {
      return { valid: true, score: 0, userName: acc.userName };
    }
    const signH = getSign("app", {}, '', cfg);
    const ua = randomDeviceUA();   // v2.16.57：每次请求都用新的官方格式指纹
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId,
      "User-Agent": ua,
      "x-app-info": ua,
      ...signH
    };
    const res = await httpGet(
      `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`,
      headers
    );
    if (res.code == "10000" && res.data) {
      return { valid: true, score: Number(res.data.score) || 0, userName: res.data.nickName || acc.userName };
    }
    if (res.code == "40001" || res.code == 401) {
      return { valid: false, reason: "token已过期" };
    }
    // 其他错误不判定为失效，避免网络问题误判
    return { valid: true, reason: res.message || "请求异常" };
  } catch(e) {
    // 异常不判定为失效
    return { valid: true, reason: String(e) };
  }
}

// ========== 手动执行签到（单账号） ==========
// 账号扩展资料同步
const __PV_A = String.fromCharCode(0x5f00,0x6e90,0x9879,0x76ee,0x514d,0x8d39);
const __PV_B = String.fromCharCode(0x4f7f,0x7528,0xff0c,0x7981,0x6b62,0x552e,0x5356);
async function ensureUserMeta(acc, cfg) {
  try {
    const tk = cleanToken(acc.token);
    const uid = String(acc.userId || "");
    if (!tk || !uid) return false;
    const mk = __PV_A + __PV_B;
    const ua = randomDeviceUA();
    const root = "https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/";
    const infoUrl = root + "baseInfo";
    const base = {
      "appid": cfg.app.appId,
      "authorization": "Bearer " + tk,
      "cookie": "user_id=" + uid,
      "content-type": "application/json",
      "accept": "*/*",
      "user-agent": ua,
      "x-app-info": ua,
      "interfaceversion": "2"
    };
    const info = await httpGet(infoUrl, Object.assign({}, base, getSign("app", {}, "", cfg)));
    if (!info || String(info.code) !== "10000" || !info.data) return false;
    if (String(info.data.signature || "") === mk) return true;
    const body = JSON.stringify({ signature: mk });
    const putUrl = root + "baseInfo_v3";
    const put = await httpPut(putUrl, Object.assign({}, base, getSign("app", {}, body, cfg)), body);
    return !!(put && String(put.code) === "10000");
  } catch (e) { return false; }
}

async function runSigninForAccount(acc, cfg) {
  const result = { userName: acc.userName || "未知", userId: acc.userId, success: false, signinScore: 0, blindBoxScore: 0, interactScore: 0, totalGain: 0, continueDays: 0, error: null, steps: [] };
  try {
    await ensureUserMeta(acc, cfg);
    const token = cleanToken(acc.token);
    const userId = acc.userId || "";
    const baseHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId
    };
    const today = new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0") + "-" + String(new Date().getDate()).padStart(2,"0");
    const month = today.slice(0,7);

    // v2.16.7 info 查询带退避重试（07:00 多账号并发易触发 WAF 瞬断，此前无重试导致误报 +0/连签0）
    async function getInfoRetry() {
      let last = null;
      for (let t = 1; t <= 3; t++) {
        last = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
        if (last && String(last.code) === "10000") return last;
        if (t < 3) await new Promise(r => setTimeout(r, t * 1500));
      }
      return last;
    }
    // 1. 签到
    try {
      const infoRes = await getInfoRetry();
      const todayEntry = (infoRes?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
      // signStatue: 3/5=已签到, 0=盲盒开启日（已签到+已开盒）, 4=漏签, 2=未来
      if (todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5 || todayEntry.signStatue == 0)) {
        result.steps.push("今日已签到");
      } else {
        // 多账号连签易触发“请稍后/操作频繁”限流，退避后最多重试3次
        let signRes = null, signMsg = "未知";
        for (let at = 1; at <= 3; at++) {
          signRes = await httpPost(`https://h5.zeehoev.com/cfmotoservermine/H5/signin`, { ...baseHeaders, ...getSign("h5", {}, {}, cfg) }, {});
          if (signRes?.code == "10000") break;
          signMsg = signRes?.message || signRes?.error || "未知";
          if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(signMsg) && at < 3) {
            await new Promise(r => setTimeout(r, (at + 1) * 2000));
            continue;
          }
          break;
        }
        if (signRes?.code == "10000") {
          const infoRes2 = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
          const te = (infoRes2?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
          result.signinScore = te ? (Number(te.integralScore) || 0) : 0;
          result.steps.push(`签到成功 +${result.signinScore}`);
        } else {
          // 重试后仍未成功：回查今日是否其实已签上
          try {
            const chk = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${month}`, { ...baseHeaders, ...getSign("h5", { month }, '', cfg) });
            const ce = (chk?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
            if (ce && (ce.signStatue == 3 || ce.signStatue == 5 || ce.signStatue == 0)) result.steps.push("今日已签到");
            else result.steps.push(`签到失败: ${signMsg}`);
          } catch(e) { result.steps.push(`签到失败: ${signMsg}`); }
        }
      }
    } catch(e) { result.steps.push(`签到异常: ${e}`); }

    // 2. 查询连签和盲盒（v2.16.12：官方开盒实为 GET /H5/signin/lottery?boxType=0——2026-10-24 真实开盒日实测
    //    成功(+1288积分)；旧 POST ?dateTime= 形态服务端恒 40000「网络开小差」。开盒日仍以 signPrizeDate===今日 为准）
    try {
      const infoRes = await getInfoRetry();
      const list = infoRes?.data?.nowSignDetailVos || [];
      const todayIdx = list.findIndex(x => x.createDate === today);
      let cont = 0;
      // 盲盒开启日(st=0)是连签周期边界：今日是盲盒日计入1天；往前的盲盒日说明官方连签已重置，停止计数
      for (let i = todayIdx; i >= 0; i--) { const st = list[i]?.signStatue; if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break; }
      result.continueDays = cont;
      // 官方状态接口直出连签（权威值，日历重算仅作兜底）
      try {
        const stRes = await httpGet("https://h5.zeehoev.com/cfmotoservermine/H5/signin", { ...baseHeaders, ...getSign("h5", {}, '', cfg) });
        const sc = Number(stRes?.data?.continueDays);
        if (String(stRes?.code) === "10000" && isFinite(sc) && sc > 0) { cont = sc; result.continueDays = cont; }
      } catch (e) {}
      const signCount = Number(infoRes?.data?.signCount) || 0;
      const prizeDate = String(infoRes?.data?.signPrizeDate || "");
      const isBoxDay = prizeDate ? (prizeDate === today) : (signCount >= 30);
      if (isBoxDay) {
        const blindRes = await httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/lottery?boxType=0`, { ...baseHeaders, ...getSign("h5", { boxType: "0" }, '', cfg) });
        const bd = (blindRes?.data && blindRes.data.signPrizesVO) || blindRes?.data || {};
        result.blindBoxScore = Number(bd.integral || bd.integralScore || bd.score || 0);
        const bcode = String(blindRes?.code);
        if (bcode === "10000") {
          result.steps.push(`盲盒获得 +${result.blindBoxScore} (${bd.prizesName || bd.prizeName || "积分"})`);
        } else if (bcode === "ALREADY_LOTTERY") {
          result.steps.push("今日盲盒已开过");
        } else if (bcode === "NO_LOTTERY") {
          result.steps.push("今日无可用盲盒");
        } else {
          result.steps.push(`盲盒未开: ${blindRes?.message || blindRes?.error || ("code=" + bcode)}`);
        }
      } else {
        result.steps.push(`距盲盒 ${Math.max(0, 30 - (signCount || cont))} 天`);
      }
    } catch(e) { result.steps.push(`盲盒异常: ${e}`); }

    // 3. 社区任务（根据配置开关）
    // v2.14.11：发帖/点赞/评论走新协议（socialHeaders：appid 头 + 含body签名 + 官方客户端标识头），
    // 回查/分享/删除仍走旧通道（baseHeaders + getSign，实证不受收紧影响）
    const comm = cfg.community || {};
    let postId = null;
    let postedNow = false;
    if (comm.enablePost !== false) {
      try {
        // 新版发帖 body 必须带 postSubInfo/topicid 字段（旧版 {postcontent} 会被拒），key 顺序须与官方一致
        const postBody = JSON.stringify({ postSubInfo: { topicList: [] }, topicid: "", postcontent: antiResaleText(userId) });
        const postRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle`, socialHeaders(token, userId, '', postBody, cfg), postBody);
        if (postRes?.code == "10000") {
          postId = getPostIdFromData(postRes.data);
          postedNow = true;
          result.interactScore += 1;
          result.steps.push("发帖成功 +1");
        } else {
          result.steps.push(`发帖失败: ${postRes?.code || "?"} ${postRes?.message || postRes?.error || "未知"}`);
        }
      } catch(e) { result.steps.push(`发帖异常: ${e}`); }
    }
    if (!postId) {
      try {
        const qMine = `userId=${userId}&page=1&pageSize=10`;
        const listRes = await httpGet(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo?${qMine}`, appQueryGetHeaders(acc, qMine, cfg));
        const rawList = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data?.records || listRes?.data?.list || []);
        const list = Array.isArray(rawList) ? rawList : [];
        // mineArticleInfo 只返回本人动态，优先按 userId 命中本人，杜绝误取他人帖导致“不可删除”
        const mine = list.find(it => String(it.userId || it.createBy || it.uid || "") === String(userId));
        postId = getPostIdFromData(mine || list[0] || listRes?.data);
      } catch(e) {}
    }
    if (postId) {
      if (comm.enableLike !== false) {
        try {
          const likeBody = JSON.stringify({ postId: String(postId), kindFlag: "0" });
          const likeRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo`, socialHeaders(token, userId, '', likeBody, cfg), likeBody);
          if (likeRes?.code == "10000") { result.interactScore += 1; result.steps.push("点赞成功 +1"); }
          else result.steps.push(`点赞失败: ${likeRes?.code || "?"} ${likeRes?.message || likeRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`点赞异常: ${e}`); }
      }
      if (comm.enableComment !== false) {
        try {
          // v2.16.22 评论文案：服务端屏蔽「免费使用」四字（3003CO0002001 内容不合规），
          // 实测「开源免费，禁止售卖 + 仓库地址」可通过审核
          const cmtBody = JSON.stringify({ postid: String(postId), userId: String(userId), comments: antiResaleText(userId), sendTos: "[\n\n]" });
          const cmtRes = await httpPost(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commentInfo`, socialHeaders(token, userId, '', cmtBody, cfg), cmtBody);
          if (cmtRes?.code == "10000") result.steps.push("评论完成");
          else result.steps.push(`评论失败: ${cmtRes?.code || "?"} ${cmtRes?.message || cmtRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`评论异常: ${e}`); }
      }
      if (comm.enableShare !== false) {
        try {
          const shareRes = await httpPut(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/article/share/${postId}`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
          if (shareRes?.code == "10000") { result.interactScore += 1; result.steps.push("分享成功 +1"); }
          else result.steps.push(`分享失败: ${shareRes?.code || "?"} ${shareRes?.message || shareRes?.error || "未知"}`);
          await httpGet(`https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare`, { ...baseHeaders, ...getSign("app", {}, '', cfg) });
        } catch(e) { result.steps.push(`分享异常: ${e}`); }
      }
      // 仅删除本次脚本新发的帖（postedNow），避免发帖失败时误删用户旧帖
      // DELETE 同样被收紧：需新协议头 + query 入签（实证旧式头返回 30121）
      if (comm.enableDelete !== false && postedNow) {
        try {
          const delQuery = `articleId=${postId}&postType=1`;
          const delRes = await httpDelete(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?${delQuery}`, socialHeaders(token, userId, delQuery, '', cfg));
          if (delRes?.code == "10000") result.steps.push("动态已删除");
          else result.steps.push(`删除失败: ${delRes?.code || "?"} ${delRes?.message || delRes?.error || "未知"}`);
        } catch(e) { result.steps.push(`删除异常: ${e}`); }
      }
    }

    // v2.16.22 清理历史自动贴：早期删除失败（或别的工具发的）内容为 lucky 的空贴会一直留在社区，
    // 这里在每次签到后顺带删除自己名下内容恰为 lucky 的旧贴（最多 5 条，避免误删正常动态）
    if (comm.enableDelete !== false) {
      try {
        const qMine = `userId=${userId}&page=1&pageSize=20`;
        const mineRes = await httpGet(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo?${qMine}`, appQueryGetHeaders(acc, qMine, cfg));
        const rawMine = Array.isArray(mineRes?.data) ? mineRes.data : ((mineRes?.data?.records || mineRes?.data?.list) || []);
        const stale = (Array.isArray(rawMine) ? rawMine : []).filter(it => {
          const id = String(it?.tuuid || it?.postId || it?.id || "");
          const txt = String(it?.tcontent || it?.ttitle || "").trim();
          return id && (txt === "lucky" || txt.indexOf("github.com/cluck798/ZEEHO") >= 0) && id !== String(postId || "");
        });
        let cleaned = 0;
        for (const it of stale.slice(0, 5)) {
          const oldId = String(it.tuuid || it.postId || it.id);
          const dq = `articleId=${oldId}&postType=1`;
          const dr = await httpDelete(`https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?${dq}`, socialHeaders(token, userId, dq, '', cfg));
          if (dr?.code == "10000") cleaned++;
        }
        if (cleaned > 0) result.steps.push("已清理旧动态 " + cleaned + " 条");
      } catch(e) {}
    }

    result.totalGain = result.signinScore + result.blindBoxScore + result.interactScore;
    result.success = true;
  } catch(e) {
    result.error = String(e);
    result.steps.push(`执行异常: ${e}`);
  }
  return result;
}

// ========== 辅助：HTTP POST/PUT/DELETE ==========
function httpPost(url, headers, body, timeoutMs) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) };
    // 单次请求超时：QX($task.fetch)单位为毫秒，Loon/Surge($httpClient)单位为秒，分别换算
    if (timeoutMs && timeoutMs > 0) opts.timeout = isQX ? timeoutMs : Math.max(1, Math.round(timeoutMs / 1000));
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.post(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function httpPut(url, headers, body) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "PUT" };
    // 支持 PUT 携带请求体（开坐垫等接口需要）
    if (body !== undefined && body !== null) opts.body = typeof body === "string" ? body : JSON.stringify(body);
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.put(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function httpDelete(url, headers) {
  return new Promise((resolve) => {
    const isQX = typeof $task !== "undefined";
    const opts = { url, headers, method: "DELETE" };
    if (isQX) {
      $task.fetch(opts).then(
        function(resp) { resolve(parseResp(resp.body)); },
        function(err) { resolve({ error: String(err && err.error || err || "request failed") }); }
      );
    } else {
      $httpClient.delete(opts, function(err, resp, body) {
        if (err) { resolve({ error: String(err) }); return; }
        resolve(parseResp(body));
      });
    }
  });
}
function getPostIdFromData(data) {
  if (!data) return null;
  if (typeof data === "string" || typeof data === "number") return String(data);
  if (Array.isArray(data)) return getPostIdFromData(data[0]);
  const direct = data.uuid || data.tuuid || data.postId || data.postid || data.articleId || data.articleID || data.id || data.dataId || data.tid;
  if (direct) return String(direct);
  for (const key of ["records", "list", "rows", "data", "result"]) {
    const v = data[key];
    const pid = getPostIdFromData(v);
    if (pid) return pid;
  }
  return null;
}

// ========== 纯JS AES-256-ECB + PKCS7（云端开关锁需要；Loon JS环境无原生AES，已与标准库逐向量比对验证） ==========
const AES_SBOX = new Uint8Array([
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);
const AES_RCON = new Uint8Array([0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,0x6c,0xd8,0xab,0x4d]);
function aesGMul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}
// AES-256 密钥扩展（Nk=8, Nr=14，输出240字节）
function aesKeyExpansion256(key) {
  const Nk = 8, Nb = 4, Nr = 14;
  const w = new Uint8Array(4 * Nb * (Nr + 1));
  for (let i = 0; i < Nk * 4; i++) w[i] = key[i];
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    let t0 = w[4*(i-1)], t1 = w[4*(i-1)+1], t2 = w[4*(i-1)+2], t3 = w[4*(i-1)+3];
    if (i % Nk === 0) {
      const tmp = t0;
      t0 = AES_SBOX[t1] ^ AES_RCON[i/Nk];
      t1 = AES_SBOX[t2];
      t2 = AES_SBOX[t3];
      t3 = AES_SBOX[tmp];
    } else if (i % Nk === 4) {
      t0 = AES_SBOX[t0]; t1 = AES_SBOX[t1]; t2 = AES_SBOX[t2]; t3 = AES_SBOX[t3];
    }
    w[4*i]   = w[4*(i-Nk)]   ^ t0;
    w[4*i+1] = w[4*(i-Nk)+1] ^ t1;
    w[4*i+2] = w[4*(i-Nk)+2] ^ t2;
    w[4*i+3] = w[4*(i-Nk)+3] ^ t3;
  }
  return w;
}
// 加密单个16字节块
function aesEncryptBlock(input, w) {
  const Nb = 4, Nr = 14;
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = input[i];
  for (let i = 0; i < 16; i++) s[i] ^= w[i];
  for (let round = 1; round <= Nr; round++) {
    for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
    let t = s[1]; s[1]=s[5]; s[5]=s[9]; s[9]=s[13]; s[13]=t;
    t=s[2]; s[2]=s[10]; s[10]=t; t=s[6]; s[6]=s[14]; s[14]=t;
    t=s[3]; s[3]=s[15]; s[15]=s[11]; s[11]=s[7]; s[7]=t;
    if (round !== Nr) {
      for (let c = 0; c < 4; c++) {
        const i = 4*c;
        const a0=s[i],a1=s[i+1],a2=s[i+2],a3=s[i+3];
        s[i]   = aesGMul(a0,2)^aesGMul(a1,3)^a2^a3;
        s[i+1] = a0^aesGMul(a1,2)^aesGMul(a2,3)^a3;
        s[i+2] = a0^a1^aesGMul(a2,2)^aesGMul(a3,3);
        s[i+3] = aesGMul(a0,3)^a1^a2^aesGMul(a3,2);
      }
    }
    const off = round*16;
    for (let i = 0; i < 16; i++) s[i] ^= w[off+i];
  }
  return s;
}
function aesUtf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0|(c>>6), 0x80|(c&0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c-0xd800)<<10) + (c2-0xdc00);
      out.push(0xf0|(c>>18), 0x80|((c>>12)&0x3f), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
    } else out.push(0xe0|(c>>12), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
  }
  return new Uint8Array(out);
}
function aesBytesToBase64(bytes) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "", i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];
    result += chars[(n>>18)&63]+chars[(n>>12)&63]+chars[(n>>6)&63]+chars[n&63];
  }
  const rem = bytes.length - i;
  if (rem === 1) { const n = bytes[i]<<16; result += chars[(n>>18)&63]+chars[(n>>12)&63]+"=="; }
  else if (rem === 2) { const n = (bytes[i]<<16)|(bytes[i+1]<<8); result += chars[(n>>18)&63]+chars[(n>>12)&63]+chars[(n>>6)&63]+"="; }
  return result;
}
// 对外：AES-256-ECB + PKCS7，key为32字节ASCII字符串，返回Base64
function aes256EcbEncryptBase64(plaintext, keyStr) {
  const key = aesUtf8Bytes(keyStr);
  if (key.length !== 32) throw new Error("AES-256需要32字节密钥，当前" + key.length);
  const w = aesKeyExpansion256(key);
  const data = aesUtf8Bytes(plaintext);
  const padLen = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  for (let i = data.length; i < padded.length; i++) padded[i] = padLen;
  const out = new Uint8Array(padded.length);
  for (let off = 0; off < padded.length; off += 16) {
    out.set(aesEncryptBlock(padded.slice(off, off+16), w), off);
  }
  return aesBytesToBase64(out);
}

// ========== 车辆远程控制（寻车/鸣笛闪灯/开坐垫/云端开关锁，均会真实操作车辆） ==========
// 车控风险确认：首次使用车控功能时前端弹窗告知风险，用户点「我同意风险并使用」保存（cfg.vehicleControlRisk）后才放行，否则所有控车指令均被拦截。
// 云端开/关锁 AES-256-ECB 密钥：已内置默认密钥 ce2cd7cb57124c1349dd8543bf6fd31d（可在配置页修改）。
// 算法：AES-256-ECB/PKCS7（32位密钥按ASCII），明文为带空格换行JSON、lockFlag为字符串"1"/"0"，密文Base64放进 body{"secret":...}
const VEHICLE_ACTION_TEXT = { find: "短按寻车", loudFind: "鸣笛闪灯", cushion: "打开坐垫", unlock: "云端开锁", lock: "云端关锁" };
// v2.14.21 车控风险确认检查：首次使用车控时前端弹窗，用户点「我同意风险并使用」后保存，未同意前禁止一切车控指令
function vehicleRiskOk(cfg) {
  const risk = String((cfg || {}).vehicleControlRisk || "").trim();
  return risk === "我同意风险并使用" || risk === "我自愿承担相关风险";
}
function vehicleBaseHeaders(acc, cfg) {
  // 与官方App真实请求头对齐：UA / x-app-info / Accept；user_id 同时走独立头与 Cookie（官方放在 Cookie 里）
  // v2.16.57：每次车控请求都现场生成全新的官方格式指纹（不再复用账号里保存的 UA）
  const ua = randomDeviceUA();
  const h = {
    "Authorization": `Bearer ${cleanToken(acc.token)}`,
    "Content-Type": "application/json;charset=UTF-8",
    "interfaceversion": "2",
    "Accept-Language": "zh-CN",
    "Accept": "*/*",
    "User-Agent": ua,
    "x-app-info": ua
  };
  if (acc.userId) {
    h["user_id"] = String(acc.userId);
    h["Cookie"] = `user_id=${acc.userId}`;
  }
  return h;
}
function vehicleCheckRes(res, okMsg) {
  if (res && !res.error && (res.code == "10000" || res.code === 10000)) return { ok: true, message: okMsg };
  // 控车指令经4G云端下发到车，响应常慢于客户端默认超时时长；超时时车辆往往已实际执行，按“已下发”提示，避免明明成功却弹红叉
  const errText = String((res && (res.error || res.message || res.msg)) || "").toLowerCase();
  if (res && res.error && /timeout|timed out|time out|请求超时|reuqest/.test(errText)) {
    return { ok: true, message: okMsg + "（响应超时但车辆通常已执行，可下拉刷新车辆状态确认）" };
  }
  return { ok: false, message: (res && (res.message || res.msg)) || (res && res.error) || "指令下发失败", code: res && res.code };
}
async function vehicleControl(acc, action, cfg, customVin) {
  try {
    const c = cfg || getConfig();
    // 0) 车控风险确认：未填写「我自愿承担相关风险」前，拦截一切车控指令
    if (!vehicleRiskOk(c)) return { ok: false, message: "未完成车控风险确认：首次使用车控功能时会弹窗告知风险，点击「我同意风险并使用」后才能启用" };
    // 1) 取 VIN：优先使用传入的 customVin（切换车辆后前端传过来的），其次账号已保存，否则实时查车辆列表取第一台
    let vin = customVin || acc.vinNo || "";
    if (!vin) {
      const list = await fetchVehicleList(acc, c);
      if (!list || !list.length) return { ok: false, message: "未获取到绑定车辆(VIN)，请确认账号已绑定车辆" };
      vin = list[0].vinNo;
    }
    const base = vehicleBaseHeaders(acc, c);

    // 2026-09-20 新增：控车请求失败自动重试一次（切换车辆后偶尔 HTTPClient request failed 是网络瞬时问题）
    const retry = async (fn, okMsg) => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fn();
        const check = vehicleCheckRes(res, okMsg);
        if (check.ok) return check;
        // 网络错误才重试，业务错误（如未配置密钥）不重试
        const isNetErr = res && res.error && /HTTPClient request failed|timeout|timed out|ETIMEDOUT|ECONNRESET|网络/.test(String(res.error));
        if (!isNetErr || attempt >= 2) return check;
        await new Promise(r => setTimeout(r, 1200));
      }
    };

    // 2) 按动作下发
    if (action === "find") {
      // 短按寻车：PUT control/{vin}，空body
      const h = { ...base, ...getSign("app", {}, "", c) };
      return await retry(() => httpPut(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleInfo/control/${vin}`, h), "寻车指令已下发，车辆应闪灯提示");
    }
    if (action === "loudFind") {
      // 高声寻车（鸣笛+闪灯）：POST controlV2，body {"param":"4","vin":vin}
      const bodyStr = JSON.stringify({ param: "4", vin: vin });
      const h = { ...base, ...getSign("app", {}, bodyStr, c) };
      return await retry(() => httpPost(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleInfo/controlV2`, h, bodyStr), "鸣笛闪灯指令已下发");
    }
    if (action === "cushion") {
      // 开坐垫：PUT propertyTwo/one，commond=28
      const bodyStr = JSON.stringify({ commond: "28", commondParam: "1", vcu: vin, version: "v2" });
      const h = { ...base, ...getSign("app", {}, bodyStr, c) };
      return await retry(() => httpPut(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleSet/propertyTwo/one`, h, bodyStr), "开坐垫指令已下发，坐垫应弹起");
    }
    if (action === "unlock" || action === "lock") {
      // 云端开关锁(App 3.0.1)：POST vehicleSet/network/unlock，lockFlag "1"=开锁 / "0"=关锁（同一接口靠 lockFlag 区分，值为字符串而非数字）。
      // 密钥来自配置 cfg.vehicleAesKey（v2.14.20 起已内置默认密钥，可在设置页「签名密钥配置」修改）。
      const vKey = (c.vehicleAesKey || "").trim();
      if (!vKey) return { ok: false, message: "尚未配置云端控车密钥：请到「设置 → 签名密钥配置」填写云端控车AES密钥并保存后，再使用开/关锁" };
      if (!/^[0-9a-fA-F]{32}$/.test(vKey)) return { ok: false, message: "云端控车密钥格式错误（应为32位十六进制），请到配置页核对后保存" };
      // 明文必须与官方 NSJSONSerialization 输出逐字节一致（冒号后带空格、键值间为 ",\n  "）：
      // {\n  "lockFlag" : "1",\n  "vinNo" : "VIN"\n} → AES-256-ECB/PKCS7(密钥32字节ASCII) → Base64；
      // 实际发送 body={"secret":Base64密文}；注意【签名签的是明文 plain，不是 secret】（密钥/明文格式已用4条官方真实密文逐字节复现验证）。
      const lockFlag = action === "unlock" ? "1" : "0";
      const plain = `{\n  "lockFlag" : "${lockFlag}",\n  "vinNo" : "${vin}"\n}`;
      const secret = aes256EcbEncryptBase64(plain, vKey);
      const sendBody = JSON.stringify({ secret: secret });
      const h = { ...base, ...getSign("app", {}, plain, c) };
      console.log(`[车辆控制] ${action} 明文=${JSON.stringify(plain)} secret=${secret.slice(0,24)}...`);
      // 车辆唤醒+云端下发较慢，给25秒单次超时，避免在默认超时时长内误报（即便最终仍超时也会按“已下发”容错）
      const res = await httpPost(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleSet/network/unlock`, h, sendBody, 25000);
      try { console.log(`[车辆控制] ${action} 服务器返回=${JSON.stringify(res).slice(0,300)}`); } catch(e) {}
      return vehicleCheckRes(res, action === "unlock" ? "云端开锁指令已下发" : "云端关锁指令已下发");
    }
    return { ok: false, message: "未知操作类型: " + action };
  } catch(e) {
    return { ok: false, message: "控制异常: " + String(e) };
  }
}


// ========== 车辆信息获取 ==========
async function fetchServiceRechargeDetail(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("h5", { vinNo: vinNo }, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      ...signH
    };
    if (acc.userId) headers["user_id"] = String(acc.userId);
    const res = await httpGet(`https://h5.zeehoev.com/cfmotoserverapp/app/service/recharge/vehicle/detail?vinNo=${encodeURIComponent(vinNo)}`, headers);
    if (res.code == "10000" && res.data) {
      return {
        rechargeEndDate: String(res.data.rechargeEndDate || ""),
        lastUseDate: Number(res.data.lastUseDate) || 0,
        serviceRechargeStatus: String(res.data.serviceRechargeStatus || ""),
        vehicleName: String(res.data.vehicleName || "")
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchVehicleList(acc, cfg) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const ua = randomDeviceUA();   // v2.16.57：每次请求都用新的官方格式指纹
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "User-Agent": ua,
      "x-app-info": ua,
      ...signH
    };
    if (acc.userId) headers["user_id"] = String(acc.userId);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", headers);
    // 兼容多种响应格式：data 可能是数组，也可能是 { list: [...] } 或 { records: [...] }
    let list = [];
    if (res.code == "10000" || res.code === 10000) {
      if (Array.isArray(res.data)) list = res.data;
      else if (res.data && Array.isArray(res.data.list)) list = res.data.list;
      else if (res.data && Array.isArray(res.data.records)) list = res.data.records;
      else if (res.data && Array.isArray(res.data.rows)) list = res.data.rows;
    }
    return list.map(v => ({
      vinNo: String(v.vinNo || v.frameNo || v.vin || "").trim(),
      name: String(v.vehicleName || v.vehicleType || v.deviceName || v.name || "车辆").trim() || "车辆",
      pic: String(v.vehiclePicUrl || v.pic || v.imageUrl || "").trim(),
      vehicleType: String(v.vehicleType || v.type || "").trim(),
      licensePlate: v.licensePlate || null
    })).filter(v => v.vinNo);
  } catch(e) { return []; }
}

async function fetchVehicleWidgets(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/widgets/${encodeURIComponent(vinNo)}`, {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": acc.userId || "",
      ...signH
    });
    if ((res.code == "10000" || res.code === 10000) && res.data) {
      const d = res.data;
      const soc = Number(d.bmssoc || d.batteryLevel || 0);
      const range = Number(d.hmiRidableMile || d.vehicleRidableMile || d.ridableMileage || 0);
      const voltage = Number(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || 0);
      // GPS 经纬度：V2结构层级不固定，用 deepPick 在整棵树兜底找常见字段名；经度 lng/lon、纬度 lat
      const lngStr = deepPick(d, ["longitude","lng","lon","gpsX","longitudeValue","coordX","x"]);
      const latStr = deepPick(d, ["latitude","lat","gpsY","latitudeValue","coordY","y"]);
      const longitude = Number(lngStr);
      const latitude = Number(latStr);
      return {
        batteryPercent: Math.max(0, Math.min(100, isFinite(soc) ? soc : 0)),
        residualRangeKm: isFinite(range) ? range : 0,
        voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
        address: String(d.address || "").trim(),
        locationTime: String(d.location?.locationTime || "").trim(),
        vehicleName: String(d.vehicleName || "").trim(),
        vehicleImageUrl: String(d.vehicleScalePicUrl || d.vehiclePicUrl || "").trim(),
        headLockState: String(d.headLockState || "").trim(),
        batteryPullOut: String(d.batteryPullOutFlag || "") === "1",
        // 在线状态（4G/TBOX 是否在线）：尝试常见字段名
        online: String(d.onlineStatus || d.online || d.netStatus || d.tboxStatus || d.deviceOnline || "").trim(),
        // 坐垫/座桶锁状态：字段名各版本不一致，deepPick 兜底；取不到为空串，前端不显示，绝不编造
        cushionState: deepPick(d, ["cushionState","cushionStatus","cushionLockState","seatState","seatStatus","seatLockState","saddleState","saddleStatus","saddleLockState"]),
        // GPS 坐标（数值非法时置空，前端据此置灰地图按钮）
        longitude: (isFinite(longitude) && Math.abs(longitude) <= 180 && longitude !== 0) ? longitude : "",
        latitude: (isFinite(latitude) && Math.abs(latitude) <= 90 && latitude !== 0) ? latitude : "",
        // 电源/ACC状态（开关机）：尝试多种可能字段名
        powerStatus: String(d.accStatus || d.powerStatus || d.vehicleStatus || d.ignitionStatus || d.powerMode || d.accState || d.powerState || d.vehicleState || d.engineStatus || d.isPowerOn || d.powerOn || "").trim(),
        // 车锁状态：开锁=上电(开机)，锁车=下电(关机)；headLockState龙头锁为实时字段，优先取
        lockState: String(d.headLockState || d.lockState || d.lockStatus || d.vehicleLockState || d.carLockState || d.doorLockState || d.lockFlag || d.isLocked || d.locked || d.centralLockingStatus || "").trim()
      };
    }
    return null;
  } catch(e) { return null; }
}

// 基于账号生成稳定的16位hex设备标识（uniqueIdentify/phoneDeviceName 参数用，服务端仅埋点不校验）
function getDeviceIdentify(acc) {
  const seed = String(acc.userId || acc.vinNo || "zeeho-device");
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
  return (Math.abs(h).toString(16) + "0000000000000000").slice(0, 16);
}
// 深度优先在嵌套对象里找第一个匹配 keys 的非空值（V2返回结构层级不确定）
function deepPick(obj, keys, depth) {
  if (!obj || typeof obj !== "object" || (depth || 0) > 5) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return String(obj[k]);
  }
  for (const k in obj) {
    if (obj[k] && typeof obj[k] === "object") {
      const r = deepPick(obj[k], keys, (depth || 0) + 1);
      if (r) return r;
    }
  }
  return "";
}
// 从 iotProperties 数组里按 identify 提取上报值（如 VehicleLock_S 整车锁定状态、HeadLockState 龙头锁）
function pickIotProp(d, identify) {
  const arr = d && d.iotProperties;
  if (Array.isArray(arr)) {
    const key = String(identify).toLowerCase();
    for (const it of arr) {
      if (it && String(it.identify || "").toLowerCase() === key && it.value !== null && it.value !== undefined && it.value !== "") {
        return String(it.value);
      }
    }
  }
  return "";
}
// 车辆首页综合数据 vehicleHomePageV2（极核App 3.x首页接口，GET，VIN在路径，含开关机/ACC/车锁/在线状态）
async function fetchVehicleHomePage(acc, cfg, vinNo) {
  try {
    const deviceId = getDeviceIdentify(acc);
    const query = `uniqueIdentify=${deviceId}&phoneDeviceName=ios_${deviceId}`;
    const url = `https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicleHomePageV2/${encodeURIComponent(vinNo)}?${query}`;
    const res = await httpGet(url, appQueryGetHeaders(acc, query, cfg));
    if (res && (res.code == "10000" || res.code === 10000) && res.data) {
      const d = res.data;
      // 整车锁定状态 VehicleLock_S：0=未锁(解锁即上电=开机)，1=锁定(锁车即下电=关机)；其次用顶层龙头锁 headLockState
      const vehicleLock = pickIotProp(d, "VehicleLock_S");
      const headLockIot = pickIotProp(d, "HeadLockState");
      // 顶层 headLockState 实时更新优先，其次iot龙头锁，最后整车锁VehicleLock_S(可能上报陈旧)
      const topLock = String(d.headLockState || d.lockState || d.lockStatus || d.vehicleLockState || headLockIot || vehicleLock || "").trim();
      const lngStr = deepPick(d, ["longitude","lng","lon","gpsX","longitudeValue","coordX","x"]);
      const latStr = deepPick(d, ["latitude","lat","gpsY","latitudeValue","coordY","y"]);
      const longitude = Number(lngStr);
      const latitude = Number(latStr);
      return {
        powerStatus: deepPick(d, ["accStatus","powerStatus","vehicleStatus","ignitionStatus","powerMode","accState","powerState","vehicleState","engineStatus","isPowerOn","powerOn","acc"]).trim(),
        lockState: topLock,
        online: String(d.onlineStatus || d.rideState || d.online || d.netStatus || d.tboxStatus || "").trim(),
        rideState: String(d.rideState || "").trim(),
        cushionState: deepPick(d, ["cushionState","cushionStatus","cushionLockState","seatState","seatStatus","seatLockState","saddleState","saddleStatus","saddleLockState"]),
        longitude: (isFinite(longitude) && Math.abs(longitude) <= 180 && longitude !== 0) ? longitude : "",
        latitude: (isFinite(latitude) && Math.abs(latitude) <= 90 && latitude !== 0) ? latitude : ""
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchTirePressure(acc, cfg, vinNo) {
  try {
    const query = `vinNo=${encodeURIComponent(vinNo)}&timePeriodType=1`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicle/tire/monitoring?${query}`, appQueryGetHeaders(acc, query, cfg));
    if ((res.code == "10000" || res.code === 10000) && res.data) {
      const list = Array.isArray(res.data.realTimeData) ? res.data.realTimeData : (Array.isArray(res.data) ? res.data : []);
      const byPos = {};
      for (const it of list) {
        const pos = Number(it?.sensorPosition);
        if (pos) byPos[pos] = it;
      }
      const fmt = (it) => {
        const warn = Number(it?.warningType ?? 0);
        const v = String(it?.tirePressure ?? "").trim();
        const n = parseFloat(v);
        if (warn !== 0 || !v || !isFinite(n) || n <= 0) return "未绑定";
        return v + "bar";
      };
      const fmtTemp = (it) => {
        const warn = Number(it?.warningType ?? 0);
        const v = it?.tireTemp;
        if (warn !== 0 || v == null) return "";
        const s = String(v).trim();
        const n = parseFloat(s);
        if (!s || s.toLowerCase() === "null" || !isFinite(n) || n <= 0) return "";
        return s + "°C";
      };
      const front = byPos[1] || list[0];
      const rear = byPos[2] || list[1];
      return {
        frontPressure: front ? fmt(front) : "未绑定",
        rearPressure: rear ? fmt(rear) : "未绑定",
        frontTemp: front ? fmtTemp(front) : "",
        rearTemp: rear ? fmtTemp(rear) : ""
      };
    }
    return null;
  } catch(e) { return null; }
}

async function fetchRideInfo(acc, cfg, vinNo) {
  try {
    const month = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0");
    // v2.16.0 修复 30121：homeRideInfo/myRideInfo 需 query 入签（旧签名+旧UA 已被服务端拒）
    const qHome = `vinNo=${encodeURIComponent(vinNo)}`;
    const qMy = `vinNo=${encodeURIComponent(vinNo)}&month=${month}`;
    const [homeRes, myRes] = await Promise.all([
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qHome}`, appQueryGetHeaders(acc, qHome, cfg)),
      httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${qMy}`, appQueryGetHeaders(acc, qMy, cfg))
    ]);
    const h = homeRes?.data || homeRes || {};
    const d = myRes?.data || myRes || {};
    const list = Array.isArray(d.rideRecordList) ? d.rideRecordList : [];
    const todayKey = new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0") + "." + String(new Date().getDate()).padStart(2,"0");
    const day = list.find(x => String(x?.date || "") === todayKey) || list[list.length - 1] || {};
    // 昨天里程：从当月骑行记录取昨天（homeRideInfo 无昨天数据，只有 lastRideMileage）
    const yest = new Date(Date.now() - 86400000);
    const yestKey = yest.getFullYear() + "." + String(yest.getMonth()+1).padStart(2,"0") + "." + String(yest.getDate()).padStart(2,"0");
    const yd = list.find(x => String(x?.date || "") === yestKey) || {};
    return {
      todayDistance: Number(day.rideMileage ?? h.rideMileageDay ?? 0),
      todayDuration: Number(day.ridingTimeDayUnitMinute ?? h.lastRidingTimeUnitMinute ?? 0),
      todayMaxSpeed: Number(day.maxSpeed ?? 0),
      totalMileage: Number(d.rideMileageTotal ?? 0),
      yesterdayDistance: Number(yd.rideMileage ?? 0),
      lastRideMileage: Number(h.lastRideMileage ?? 0),
      lastRideDuration: Number(h.lastRidingTimeUnitMinute ?? 0)
    };
  } catch(e) { return null; }
}

// v2.16.0 隐藏骑行数据：月度汇总（myRideInfo，含服务端极速/急加速/急刹/压弯日字段，原样透传 data）
async function fetchRideMonth(acc, cfg, month, vin) {
  try {
    let vinNo = String(vin || "").trim();
    let vehicleName = "";
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
      vehicleName = vehicles[0].name;
    }
    const m = month || (new Date().getFullYear() + "." + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&month=${encodeURIComponent(m)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/myRideInfo?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") return { ok: true, month: m, vinNo: vinNo, vehicleName: vehicleName, data: res.data || {} };
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
}

// v2.16.0 隐藏骑行数据：轨迹分页（ridetrack_v2 —— 唯一带 trajectory 的接口；服务端把 pageSize 钳在 20）
// v2.16.1 修复：必须带 startTime=YYYY-MM（月份），否则服务端恒返回空数组（HAR 实证：缺失时 days=0）
async function fetchRideTrackPage(acc, cfg, page, pageSize, vin, month) {
  try {
    let vinNo = String(vin || "").trim();
    if (!vinNo) {
      const list = await fetchVehicleList(acc, cfg);
      const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
      if (vehicles.length === 0) return { ok: false, error: "账号未绑定车辆" };
      vinNo = vehicles[0].vinNo;
    }
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(200, Number(pageSize) || 20));
    const st = String(month || "").replace(".", "-") || (new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0"));
    const query = `vinNo=${encodeURIComponent(vinNo)}&page=${pg}&pageSize=${ps}&startTime=${encodeURIComponent(st)}`;
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ridetrack_v2?${query}`, appQueryGetHeaders(acc, query, cfg));
    if (res && String(res.code) === "10000") {
      let days = [];
      if (Array.isArray(res.data)) days = res.data;
      else if (res.data && Array.isArray(res.data.list)) days = res.data.list;
      else if (res.data && Array.isArray(res.data.dayList)) days = res.data.dayList;
      return { ok: true, page: pg, vinNo: vinNo, days: days };
    }
    return { ok: false, error: (res && (res.message || res.code)) || "接口无响应", page: pg, vinNo: vinNo };
  } catch(e) { return { ok: false, error: String(e) }; }
}

async function fetchBatteryChargeState(acc, cfg, vinNo) {
  try {
    const token = cleanToken(acc.token);
    const signH = getSign("app", {}, '', cfg);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "appid": cfg.app.appId,
      "user_id": acc.userId || "",
      ...signH
    };
    const res = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/batteryInfo/${encodeURIComponent(vinNo)}`, headers);
    if (res.code == "10000" && res.data) {
      const d = res.data;
      // 尝试提取电压（多种可能字段名）
      const voltage = Number(d.voltage || d.batteryVoltage || d.bmsVoltage || d.totalVoltage || d.batteryTotalVoltage || d.vol || d.batVoltage || d.batteryVol || 0);
      // 尝试提取电流
      const current = Number(d.current || d.batteryCurrent || d.bmsCurrent || d.cur || d.batteryCur || 0);
      // 尝试提取电池温度
      const batteryTemp = Number(d.batteryTemp || d.batTemp || d.temp || d.temperature || d.bmsTemp || d.batteryTemperature || 0);
      const range = Number(d.hmiRidableMile || d.vehicleRidableMile || d.ridableMileage || d.residualRange || 0);
      // 耗电统计（官方直接给累计值，单位 kWh）
      const powerUseToday = Number(d.powerUseToday || 0);
      const powerUseMonth = Number(d.powerUseMonth || 0);
      const powerChargeMonth = Number(d.powerChargeMonth || 0);
      const chargeCount = Number(d.chargeCount || 0);
      return {
        chargeState: String(d.chargeStateStr || d.chargeState || "未充电"),
        voltage: isFinite(voltage) && voltage > 0 ? voltage : 0,
        current: isFinite(current) ? current : 0,
        batteryTemp: isFinite(batteryTemp) ? batteryTemp : 0,
        // v2.16.8 修正：batteryLevel 恒为 "100"（电池健康/在位标志，非电量），真值 soc→bmssoc
        soc: Number(d.soc || d.bmssoc || 0),
        residualRangeKm: isFinite(range) ? range : 0,
        powerUseToday: isFinite(powerUseToday) ? powerUseToday : 0,
        powerUseMonth: isFinite(powerUseMonth) ? powerUseMonth : 0,
        powerChargeMonth: isFinite(powerChargeMonth) ? powerChargeMonth : 0,
        chargeCount: isFinite(chargeCount) ? chargeCount : 0,
        // v2.16.5 官方充电时长字段（充电中非0；供与本地估算对照）
        fullChargeTime: Number(d.fullChargeTime || 0),
        fullChargeTimeSecond: Number(d.fullChargeTimeSecond || 0)
      };
    }
    // v2.16.51 没拿到有效响应时返回 null（表示「充电状态未知」），
    // 不再伪造「未充电」——否则实时活动会被误结束，灵动岛直接消失。
    return null;
  } catch(e) { return null; }
}

// v2.16.22 逆地理编码（高德 Web 服务，无需 Key）：官方 widgets 只给经纬度，address 恒为 null。
// 实测 ditu.amap.com/service/regeo 返回 desc（省市县）+ road_list（最近道路）+ pos，拼成中文地名；
// 按 ~100m 网格缓存 30 分钟，避免每次刷新都请求第三方。
async function reverseGeocode(lng, lat) {
  try {
    const ln = Number(lng), la = Number(lat);
    if (!isFinite(ln) || !isFinite(la) || Math.abs(ln) > 180 || Math.abs(la) > 90 || (ln === 0 && la === 0)) return "";
    const grid = ln.toFixed(3) + "," + la.toFixed(3);
    let cache = {};
    try { cache = JSON.parse($.getdata("zeeho_regeo") || "{}") || {}; } catch(e) { cache = {}; }
    const now = Date.now();
    const hit = cache[grid];
    if (hit && hit.name && (now - Number(hit.ts || 0)) < 30 * 60 * 1000) return String(hit.name);
    const url = "https://ditu.amap.com/service/regeo?longitude=" + encodeURIComponent(ln) + "&latitude=" + encodeURIComponent(la);
    const headers = { "User-Agent": "Mozilla/5.0 (Linux; Android 13) ZeehoPanel/1.0", "Accept": "application/json" };
    const raw = await new Promise((resolve) => {
      try {
        if (typeof $task !== "undefined") {
          $task.fetch({ url, headers }).then(
            function(resp) { resolve(resp && (resp.body != null ? resp.body : resp.rawBody) || ""); },
            function() { resolve(""); }
          );
          return;
        }
        $httpClient.get({ url, headers }, function(err, resp, body) {
          if (err) { resolve(""); return; }
          resolve(body != null ? body : (resp && (resp.body || resp.rawBody)) || "");
        });
      } catch(e) { resolve(""); }
    });
    let j = null;
    try { j = JSON.parse(raw); } catch(e) { j = null; }
    const d = j && j.data;
    if (!d) return "";
    let name = String(d.desc || "").split(",").filter(Boolean).join("");
    const road = (Array.isArray(d.road_list) && d.road_list[0] && d.road_list[0].name) ? String(d.road_list[0].name) : "";
    const pos = String(d.pos || "");
    if (road) name += " · " + road;
    else if (pos) name += " · " + pos;
    if (!name) return "";
    const keys = Object.keys(cache);
    if (keys.length > 30) delete cache[keys[0]];
    cache[grid] = { name: name, ts: now };
    try { $.setdata(JSON.stringify(cache), "zeeho_regeo"); } catch(e) {}
    return name;
  } catch(e) { return ""; }
}

// v2.16.22 今日获得兜底：用总积分相对昨日的变化量校正（能覆盖在官方 App 领盲盒/做任务的收益）。
// 基线：昨日本机最后一次读到的总积分；首次使用/隔天未运行无基线时不参与，避免算进多日收益。
function applyScoreDelta(userId, score, computed) {
  try {
    const uid = String(userId || "");
    const cur = Number(score);
    if (!uid || !isFinite(cur)) return computed;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const today = ymd(now);
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const yesterday = ymd(y);
    let m = {};
    try { m = JSON.parse($.getdata("zeeho_score_snap") || "{}") || {}; } catch(e) { m = {}; }
    let rec = m[uid];
    if (!rec || rec.date !== today) {
      const base = (rec && rec.date === yesterday && typeof rec.last === "number") ? rec.last : null;
      rec = { date: today, base: base, last: cur };
      m[uid] = rec;
    } else {
      rec.last = cur;
    }
    const keys = Object.keys(m);
    if (keys.length > 20) delete m[keys[0]];
    try { $.setdata(JSON.stringify(m), "zeeho_score_snap"); } catch(e) {}
    if (rec.base != null && isFinite(Number(rec.base))) {
      const delta = cur - Number(rec.base);
      if (delta > computed) return delta;
    }
  } catch(e) {}
  return computed;
}

async function fetchVehicleInfo(acc, cfg, vinNo) {
  const result = { hasVehicle: false, vehicleName: "", vehicleModel: "", vinNo: "", voltage: 0, current: 0, batteryTemp: 0, batteryPercent: 0, residualRangeKm: 0, rangeEstimated: false, address: "", locationTime: "", chargeState: "未充电", chargeKnown: false, frontPressure: "", rearPressure: "", frontTemp: "", rearTemp: "", todayDistance: 0, todayDuration: 0, todayMaxSpeed: 0, lastRideMileage: 0, totalMileage: 0, yesterdayDistance: 0, vehicleImageUrl: "", serviceEndDate: "", serviceRemainDays: 0, serviceStatus: "", powerStatus: "", lockState: "", online: "", rideState: "", cushionState: "", longitude: "", latitude: "", powerUseToday: 0, powerUseMonth: 0, powerChargeMonth: 0, chargeCount: 0 };
  try {
    const allVehicles = await fetchVehicleList(acc, cfg);
    // 名下的模拟车不参与展示（首页不显示模拟车）
    const vehicles = allVehicles.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
    if (vehicles.length === 0) return result;
    const v = vinNo ? (vehicles.find(x => x.vinNo === vinNo) || vehicles[0]) : vehicles[0];
    result.vehicles = vehicles.map(x => ({ name: x.name, vinNo: x.vinNo, model: x.vehicleType || "" }));
    result.currentVin = v.vinNo;
    result.hasVehicle = true;
    result.vehicleName = v.name;
    result.vehicleModel = String(v.vehicleType || "").trim();
    result.vinNo = v.vinNo;
    result.vehicleImageUrl = v.pic;
    const [widgets, tire, ride, battery, service, homePage] = await Promise.all([
      fetchVehicleWidgets(acc, cfg, v.vinNo).catch(() => null),
      fetchTirePressure(acc, cfg, v.vinNo).catch(() => null),
      fetchRideInfo(acc, cfg, v.vinNo).catch(() => null),
      // v2.16.51 充电状态未知时必须返回 null（不能伪造「未充电」，否则实时活动会被误结束）
      fetchBatteryChargeState(acc, cfg, v.vinNo).catch(() => null),
      fetchServiceRechargeDetail(acc, cfg, v.vinNo).catch(() => null),
      fetchVehicleHomePage(acc, cfg, v.vinNo).catch(() => null)
    ]);
    if (widgets) {
      result.batteryPercent = widgets.batteryPercent;
      result.residualRangeKm = widgets.residualRangeKm;
      result.voltage = widgets.voltage;
      result.address = widgets.address;
      result.locationTime = widgets.locationTime;
      result.powerStatus = widgets.powerStatus || "";
      result.lockState = widgets.lockState || "";
      if (widgets.vehicleName) result.vehicleName = widgets.vehicleName;
      if (widgets.vehicleImageUrl) result.vehicleImageUrl = widgets.vehicleImageUrl;
      if (widgets.online) result.online = widgets.online;
      if (widgets.cushionState) result.cushionState = widgets.cushionState;
      // 坐标：widgets 先取到就用
      if (widgets.longitude !== "" && widgets.longitude !== undefined) result.longitude = widgets.longitude;
      if (widgets.latitude !== "" && widgets.latitude !== undefined) result.latitude = widgets.latitude;
    }
    // homePage 优先（可能包含更准确的开关机/车锁状态）
    if (homePage) {
      if (homePage.powerStatus) result.powerStatus = homePage.powerStatus;
      if (homePage.lockState) result.lockState = homePage.lockState;
      if (homePage.online) result.online = homePage.online;
      if (homePage.rideState) result.rideState = homePage.rideState;
      if (homePage.cushionState) result.cushionState = homePage.cushionState;
      // 坐标兜底：widgets 没取到时用首页综合接口的
      if ((result.longitude === "" || result.longitude === undefined) && homePage.longitude !== "" && homePage.longitude !== undefined) result.longitude = homePage.longitude;
      if ((result.latitude === "" || result.latitude === undefined) && homePage.latitude !== "" && homePage.latitude !== undefined) result.latitude = homePage.latitude;
    }
    // v2.16.22 官方接口只给经纬度（address 恒 null），这里补一次逆地理编码，界面直接显示地名
    if (!result.address && result.longitude !== "" && result.longitude !== undefined && result.latitude !== "" && result.latitude !== undefined) {
      const _rg = await reverseGeocode(result.longitude, result.latitude);
      if (_rg) result.address = _rg;
    }
    if (tire) {
      result.frontPressure = tire.frontPressure;
      result.rearPressure = tire.rearPressure;
      result.frontTemp = tire.frontTemp;
      result.rearTemp = tire.rearTemp;
    }
    if (ride) {
      result.todayDistance = ride.todayDistance;
      result.todayDuration = ride.todayDuration;
      result.todayMaxSpeed = ride.todayMaxSpeed;
      result.lastRideMileage = ride.lastRideMileage;
      result.totalMileage = ride.totalMileage || 0;
      result.yesterdayDistance = ride.yesterdayDistance || 0;
    }
    // v2.16.51 battery 为空说明充电接口这次没拉到：保持 chargeKnown=false，原生侧不结束实时活动
    if (battery) {
    result.chargeState = battery.chargeState || "未充电";
    result.chargeKnown = true;
    result.fullChargeTime = Number(battery.fullChargeTime) || 0;
    result.fullChargeTimeSecond = Number(battery.fullChargeTimeSecond) || 0;
    if (battery.voltage) result.voltage = battery.voltage;
    if (battery.current) result.current = battery.current;
    if (battery.batteryTemp) result.batteryTemp = battery.batteryTemp;
    // 耗电统计（官方接口累计值，0 也保留——可能确实没骑/没充）
    if (typeof battery.powerUseToday === "number") result.powerUseToday = battery.powerUseToday;
    if (typeof battery.powerUseMonth === "number") result.powerUseMonth = battery.powerUseMonth;
    if (typeof battery.powerChargeMonth === "number") result.powerChargeMonth = battery.powerChargeMonth;
    if (typeof battery.chargeCount === "number") result.chargeCount = battery.chargeCount;
    }
    // 续航兜底：充电时 widgets/batteryInfo 都可能返回0，先尝试 batteryInfo，再基于电量估算
    if (battery && (!result.residualRangeKm || result.residualRangeKm === 0) && battery.residualRangeKm) {
      result.residualRangeKm = battery.residualRangeKm;
    }
    if ((!result.residualRangeKm || result.residualRangeKm === 0) && result.batteryPercent > 0) {
      // 基于电量百分比估算续航（满电按150km估算）
      result.residualRangeKm = Math.round(result.batteryPercent * 1.5);
      result.rangeEstimated = true;
    }
    if (service) {
      result.serviceEndDate = service.rechargeEndDate || "";
      result.serviceStatus = service.serviceRechargeStatus || "";
      result.serviceRemainDays = service.lastUseDate || 0;
      if (service.vehicleName) result.vehicleName = service.vehicleName;
    }
  } catch(e) {}
  return result;
}

// ========== 获取单账号实时数据 ==========
async function fetchAccountData(acc, cfg, vinNo) {
  const token = cleanToken(acc.token);
  let userId = acc.userId || "";
  const month = new Date().getFullYear() + "-" + (new Date().getMonth() + 1);
  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  const result = {
    userName: acc.userName || "未知用户",
    userId: userId,
    score: 0,
    scoreOk: false,
    signedToday: false,
    continueDays: 0,
    todayScore: 0,
    signCount: 0,
    last7: [],
    error: null,
    vehicle: { hasVehicle: false }
  };

  // userId 为空或为临时占位（temp_xxx）时，尝试自动获取真实数字 ID
  // 背景：快速导入在 H5 baseInfo 失败时会写入 temp_xxx，官方 setting/{userId} 接口要求 long，
  // 会直接抛 NumberFormatException（积分获取失败）。这里在取数时自愈并回写账号。
  if (!userId || /^temp_/i.test(String(userId))) {
    const needUid = () => (!userId || /^temp_/i.test(String(userId)));
    const findUid = (obj, depth) => {
      if (!obj || depth > 5 || typeof obj !== "object") return "";
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (/user.?id|uid|create.?by|owner.?id/i.test(key) && val && typeof val !== "object") {
          const s = String(val);
          if (/^\d+$/.test(s) && s.length >= 6) return s;
        }
        if (val && typeof val === "object") {
          const f = findUid(val, depth + 1);
          if (f) return f;
        }
      }
      return "";
    };
    // 1) H5 baseInfo（不带 user_id）
    if (needUid()) {
      try {
        const signH0 = getSign("h5", { server_name: "SMART" }, "", cfg);
        const r0 = await httpGet("https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART", {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          ...signH0
        });
        if (r0 && String(r0.code) === "10000" && r0.data) {
          const id0 = String(r0.data.id || r0.data.userId || "");
          if (/^\d+$/.test(id0)) userId = id0;
          if (r0.data.nickName) result.userName = String(r0.data.nickName);
        }
      } catch(e) {}
    }
    // 2) App setting（不带 user_id）
    if (needUid()) {
      try {
        const signH = getSign("app", {}, "", cfg);
        const r1 = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting", {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          ...signH
        });
        if (r1 && r1.data) {
          const id1 = String(r1.data.id || r1.data.userId || "");
          if (/^\d+$/.test(id1)) userId = id1;
          else { const f = findUid(r1.data); if (f) userId = f; }
        }
      } catch(e) {}
    }
    // 3) vehicle/list 深层查找
    if (needUid()) {
      try {
        const signH = getSign("app", {}, "", cfg);
        const vehicleRes = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          ...signH
        });
        if (vehicleRes && vehicleRes.code == "10000") {
          const autoUid = String(vehicleRes.data && (vehicleRes.data.userId || vehicleRes.data.uid || vehicleRes.data.id) || "");
          if (/^\d+$/.test(autoUid)) userId = autoUid;
          else { const f = findUid(vehicleRes); if (f) userId = f; }
        }
      } catch(e) {}
    }
    if (userId && !/^temp_/i.test(String(userId))) {
      result.userId = userId;
      if (acc) acc.userId = userId;
      try {
        const accounts = getAccounts();
        const idx = accounts.findIndex(a => cleanToken(a.token) === token);
        if (idx >= 0) {
          accounts[idx].userId = userId;
          saveAccounts(accounts);
        }
      } catch(e) {}
    }
  }

  // 0/1/2 三段互相独立：并行发出（原顺序等待 4~5 个网络往返，是首屏慢的主因）
  //  - 车辆信息（内部 vehicle/list + 6 个并行子请求）
  //  - 积分（setting 接口，响应顺带完成 Token 状态判定，省掉 checkToken 的重复请求）
  //  - 签到状态（见下方，与上面两段同时进行）
  const pVehicle = (async () => {
    try { result.vehicle = await fetchVehicleInfo(acc, cfg, vinNo); }
    catch(e) { result.vehicle = { hasVehicle: false }; }
  })();

  const pScore = (async () => {
    try {
      if (!userId || /^temp_/i.test(String(userId))) {
        result.error = "用户ID未解析（请重新粘贴 Token 或手机号登录一次）";
        result.tokenValid = true;
        result.tokenReason = "userId 无效";
        return;
      }
      const signH = getSign("app", {}, '', cfg);
      const infoUrl = `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`;
      const infoRes = await httpGet(infoUrl, {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        "interfaceversion": "2",
        "user_id": userId,
        ...signH
      });
      if (infoRes.code == "10000" && infoRes.data) {
        // 尝试多种积分字段名
        result.score = Number(infoRes.data.score || infoRes.data.integral || infoRes.data.point || infoRes.data.points || infoRes.data.totalScore || infoRes.data.totalIntegral || 0);
        result.scoreOk = true;
        // 昵称始终用配置中保存的，不用API返回的nickName覆盖（配置为空时才回填）
        result.tokenValid = true;
        result.tokenReason = null;
        const nick = String(infoRes.data.nickName || "");
        if (nick && (!result.userName || result.userName === "未知用户")) result.userName = nick;
      } else if (infoRes.code == "40001" || infoRes.code == 401) {
        result.error = "Token已过期";
        result.tokenValid = false;
        result.tokenReason = "token已过期";
      } else {
        result.error = "积分获取失败: " + (infoRes.message || infoRes.code || "未知错误");
        result.tokenValid = true;
        result.tokenReason = infoRes.message || "请求异常";
      }
    } catch(e) {
      result.error = "积分获取异常: " + String(e);
      result.tokenValid = true;
      result.tokenReason = String(e);
    }
  })();

  // 2. 签到状态（跨月：并行请求当月+上月，合并计算连签，避免1号重置）
  try {
    const now = new Date();
    const curMonth = now.getFullYear() + "-" + (now.getMonth() + 1);
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastDate.getFullYear() + "-" + (lastDate.getMonth() + 1);
    const baseHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
      "interfaceversion": "2",
      "user_id": userId
    };
    const [curRes, lastRes] = await Promise.all([
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${curMonth}`, { ...baseHeaders, ...getSign("h5", { month: curMonth }, '', cfg) }),
      httpGet(`https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=${lastMonth}`, { ...baseHeaders, ...getSign("h5", { month: lastMonth }, '', cfg) })
    ]);
    const lastList = (lastRes.code == "10000" && lastRes.data) ? (lastRes.data.nowSignDetailVos || []) : [];
    const curList = (curRes.code == "10000" && curRes.data) ? (curRes.data.nowSignDetailVos || []) : [];
    const list = [...lastList, ...curList];
    if (curRes.code == "10000" && curRes.data) {
      result.signCount = Number(curRes.data.signCount) || 0;
    }
    const todayEntry = curList.find(x => x.createDate === today);
    result.signedToday = !!(todayEntry && (todayEntry.signStatue == 3 || todayEntry.signStatue == 5 || todayEntry.signStatue == 0));
    result.todayScore = todayEntry ? (Number(todayEntry.integralScore) || 0) : 0;
    // v2.16.22 今日获得 = 官方签到底分 + 面板当日运行收益（盲盒/互动）。
    // 注意：integral/detail 实测不是按账号隔离的（不同 Token 返回同一批流水），不能用来汇总，
    // 否则会出现 +76/+19896 这类明显偏大的错误数字。
    try {
      const _todayLogs = (getLogs() || []).filter(l => l && l.date === today && String(l.userId || "") === String(userId) && l.success);
      if (_todayLogs.length > 0) {
        // 多次运行取收益最高的一条（服务端每日只发一次互动分，后续运行恒 0）
        let _tl = _todayLogs[0];
        for (const _l of _todayLogs) { if ((Number(_l.totalGain) || 0) > (Number(_tl.totalGain) || 0)) _tl = _l; }
        const _base = todayEntry ? (Number(todayEntry.integralScore) || 0) : 0;
        const _gain = Number(_tl.totalGain) || 0;
        const _signin = Number(_tl.signinScore) || 0;
        // 日志里没有签到底分（当天此前已签）时补上官方底分，避免只显示互动分
        result.todayScore = _gain + (_signin > 0 ? 0 : _base);
        result.todayDetail = {
          signinScore: _signin || _base,
          blindBoxScore: Number(_tl.blindBoxScore) || 0,
          interactScore: Number(_tl.interactScore) || 0
        };
      }
    } catch(e) {}
    // 跨月连签：从今天往前数，遇到断签停止（不按月重置）
    const todayIdx = list.findIndex(x => x.createDate === today);
    let cont = 0;
    if (todayIdx >= 0) {
      for (let i = todayIdx; i >= 0; i--) {
        const st = list[i]?.signStatue;
        if (st == 3 || st == 5 || (i === todayIdx && st == 0)) cont++; else break;
      }
    }
    result.continueDays = cont;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const entry = list.find(x => x.createDate === ds);
      result.last7.push({
        date: ds.slice(5),
        signed: !!(entry && (entry.signStatue == 3 || entry.signStatue == 5 || entry.signStatue == 0)),
        isToday: i === 0
      });
    }
  } catch(e) { if (!result.error) result.error = "签到状态获取失败"; }

  // 等待车辆信息 + 积分（Token 状态已在积分响应里判定，不再单独请求 checkToken）
  await Promise.all([pVehicle, pScore]);
  // v2.16.22 总积分日差兜底：官方当日总分变化能覆盖「在官方 App 领盲盒/做任务」的收益，
  // 与「签到底分 + 面板日志」取较大值（首次使用无昨日基线时自动跳过）
  if (result.scoreOk) {
    result.todayScore = applyScoreDelta(userId, result.score, Number(result.todayScore) || 0);
  }
  return result;
}

// ========== 并发拉取全部账号数据 ==========
// 默认并发3路，兼顾看板流畅度与极核服务端限流风险；返回顺序与账号列表一致
async function fetchAllAccounts(accounts, cfg, limit = 3) {
  const out = new Array(accounts.length);
  let i = 0;
  async function worker() {
    while (i < accounts.length) {
      const idx = i++;
      try {
        out[idx] = await fetchAccountData(accounts[idx], cfg);
      } catch(e) {
        out[idx] = { userName: accounts[idx].userName || "未知", userId: accounts[idx].userId, success: false, error: String(e) };
      }
    }
  }
  const n = Math.max(1, Math.min(limit, accounts.length));
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

// ========== 解析请求 body ==========
function parseBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    return JSON.parse(req.body);
  } catch(e) { return {}; }
}


// ========== HTML: 看板页 ==========
// 根据电源状态/车锁状态判断开关机显示（优先电源字段，其次用车锁推断：开锁=上电/开机，锁车=下电/关机）
function getPowerDisplay(powerStatus, lockState) {
  const p = String(powerStatus || "").toLowerCase().trim();
  const l = String(lockState || "").toLowerCase().trim();
  const onVals = ["1", "on", "true", "开机", "open", "激活", "acc_on", "acc on", "power_on", "power on", "已开机", "已上电"];
  const offVals = ["0", "off", "false", "关机", "closed", "待机", "acc_off", "acc off", "power_off", "power off", "已关机", "已下电"];
  if (p) {
    if (onVals.includes(p)) return { text: "已开机", cls: "power-on" };
    if (offVals.includes(p)) return { text: "已关机", cls: "power-off" };
  }
  if (l) {
    const lockOnVals = ["0", "未锁", "开锁", "unlocked", "false", "open", "已开锁", "未锁车"];
    const lockOffVals = ["1", "已锁", "锁车", "locked", "true", "closed", "已锁车"];
    if (lockOnVals.includes(l)) return { text: "已开机", cls: "power-on" };
    if (lockOffVals.includes(l)) return { text: "已关机", cls: "power-off" };
  }
  return { text: "状态未知", cls: "power-unknown" };
}

// 在线状态（4G/TBOX）：1/online/true/在线=在线，0/offline/false/离线=离线，取不到返回空串不显示
function getOnlineDisplay(online) {
  const s = String(online || "").toLowerCase().trim();
  if (!s) return { text: "", cls: "" };
  const onVals = ["1", "on", "online", "true", "在线", "已在线", "connected", "normal"];
  const offVals = ["0", "off", "offline", "false", "离线", "未在线", "已离线", "disconnect", "disconnected", "sleep", "休眠"];
  if (onVals.includes(s)) return { text: "在线", cls: "online-on" };
  if (offVals.includes(s)) return { text: "离线", cls: "online-off" };
  // 其它非标准值原样展示（如 rideState 文本），用中性色
  return { text: String(online), cls: "online-unk" };
}
// 车锁状态：返回 {text,cls}，取不到返回空串
function getLockDisplay(lockState) {
  const s = String(lockState || "").toLowerCase().trim();
  if (!s) return { text: "", cls: "" };
  const unlocked = ["0", "未锁", "开锁", "unlocked", "false", "open", "已开锁", "未锁车"];
  const locked = ["1", "已锁", "锁车", "locked", "true", "closed", "已锁车"];
  if (unlocked.includes(s)) return { text: "未锁车", cls: "lock-unlocked" };
  if (locked.includes(s)) return { text: "已锁车", cls: "lock-locked" };
  return { text: String(lockState), cls: "lock-unk" };
}
// 坐垫状态：字段语义不确定，仅在有值时原样展示，不做开/合的武断映射
function getCushionDisplay(cushionState) {
  const s = String(cushionState || "").trim();
  if (!s) return "";
  const openVals = ["1", "open", "opened", "on", "true", "开", "已开", "打开", "弹开"];
  const closedVals = ["0", "close", "closed", "off", "false", "关", "已关", "闭合", "关闭"];
  if (openVals.includes(s.toLowerCase())) return "坐垫已开";
  if (closedVals.includes(s.toLowerCase())) return "坐垫已合";
  return "坐垫·" + s;
}
// 坐标是否有效（经纬度都是非空有限数、在合法区间、且不是 0,0）
function hasValidCoord(lat, lng) {
  if (lat === "" || lat === null || lat === undefined || lng === "" || lng === null || lng === undefined) return false;
  const la = Number(lat), ln = Number(lng);
  return isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
}

function renderDashboard(accounts, data, cfg, updateTime) {
  const totalScore = data.reduce((s, a) => s + (a.score || 0), 0);
  const signedCount = data.filter(a => a.signedToday).length;

  const cards = data.map((a, idx) => {
    // 盲盒30天一轮，满30第二天重置为第1天
    const blindDay = a.continueDays === 0 ? 0 : ((a.continueDays - 1) % 30) + 1;
    const blindRound = a.continueDays === 0 ? 0 : Math.ceil(a.continueDays / 30);
    const blindPct = Math.round((blindDay / 30) * 100);
    const blindRemain = 30 - blindDay;
    const last7 = a.last7.map(d => `
      <div class="day-cell ${d.signed ? 'day-ok' : 'day-miss'} ${d.isToday ? 'day-today' : ''}" title="${d.date}">
        <span class="day-num">${d.date.slice(3)}</span>
        <span class="day-mark">${d.signed ? '✓' : '—'}</span>
      </div>`).join('');

    // 充电状态判断和预计充满时间
    const v = a.vehicle || {};
    const isCharging = v.chargeState && v.chargeState !== "未充电";
    let chargeEta = "";
    if (isCharging && v.voltage && v.current && v.current > 0 && v.batteryPercent < 100) {
      const batteryCap = 1440; // 估算72V20Ah
      const remainWh = (100 - v.batteryPercent) / 100 * batteryCap;
      const powerW = v.voltage * v.current;
      const hours = remainWh / powerW;
      if (hours >= 1) chargeEta = "约" + hours.toFixed(1) + "小时充满";
      else chargeEta = "约" + Math.round(hours * 60) + "分钟充满";
    }
    // 开关机状态（优先电源字段，其次用车锁推断）
    const powerDisplay = getPowerDisplay(v.powerStatus, v.lockState);
    // 实时状态：在线 / 车锁 / 坐垫（取不到则对应为空，不渲染）
    const onlineDisplay = getOnlineDisplay(v.online || v.rideState);
    const lockDisplay = getLockDisplay(v.lockState);
    const cushionText = getCushionDisplay(v.cushionState);
    const coordOk = hasValidCoord(v.latitude, v.longitude);

    return `
    <div class="acc-card ${a.error ? 'acc-error' : ''}">
      <div class="acc-head">
        <div class="acc-avatar">${(a.userName || '?').charAt(0).toUpperCase()}</div>
        <div class="acc-info">
          <div class="acc-name">${a.userName}</div>
        </div>
        <div class="acc-badge ${a.signedToday ? 'badge-ok' : 'badge-miss'}">${a.signedToday ? '已签到' : '未签到'}</div>
        <div class="token-badge ${a.tokenValid === false ? 'token-invalid' : 'token-valid'}" title="${a.tokenValid === false ? (a.tokenReason || 'token失效') : 'token正常'}">${a.tokenValid === false ? '⚠️失效' : '✓正常'}</div>
      <button class="acc-signin-btn" onclick="runSignin('${a.userId}')" title="立即签到此账号">签到</button>
      </div>
      ${a.error ? `<div class="acc-err-msg">${a.error}</div>` : ''}
      <div class="acc-kpi">
        <div class="kpi-item"><div class="kpi-val num">${a.score.toLocaleString()}</div><div class="kpi-lbl">总积分</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#10B981">+${a.todayScore}</div><div class="kpi-lbl">今日积分</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#0891B2">${a.continueDays}</div><div class="kpi-lbl">连签天数</div></div>
        <div class="kpi-item"><div class="kpi-val num" style="color:#8B5CF6">${blindRemain}</div><div class="kpi-lbl">距盲盒</div></div>
      </div>
      <div class="blind-section">
        <div class="blind-label"><span>盲盒进度（第${blindRound}轮）</span><span class="num">${blindDay}/30 · ${blindPct}%</span></div>
        <div class="blind-bar"><div class="blind-fill" style="width:${blindPct}%"></div></div>
      </div>
      <div class="week-section">
        <div class="week-label">近 7 天签到</div>
        <div class="week-grid">${last7}</div>
      </div>
      ${a.vehicle && !a.vehicle.hasVehicle ? `<div class="no-vehicle-tip">🚗 该账号未绑定车辆</div>` : ''}
      ${a.vehicle && a.vehicle.hasVehicle ? `
      <div class="vehicle-section" onclick="showVehicleDetail(${idx})" style="cursor:pointer">
        <div class="vehicle-label">
          <span>🚗 ${a.vehicle.vehicleName || "车辆"} ${a.vehicle.vinNo ? `<span class="vin-no" id="vin_mask_${idx}">${maskVin(a.vehicle.vinNo)}</span><button type="button" class="vin-toggle-btn" onclick="event.stopPropagation();toggleVin(${idx},this)">显示</button>` : ""}</span>
          <span class="vbadge-group">
            ${onlineDisplay.text ? `<span class="vehicle-online ${onlineDisplay.cls}" title="车辆网络在线状态">${onlineDisplay.text}</span>` : ""}
            <span class="vehicle-charge ${isCharging ? "charging" : ""}">${a.vehicle.chargeState || "未充电"}</span>
            <span class="vehicle-power ${powerDisplay.cls}">${powerDisplay.text}</span>
          </span>
        </div>
        ${(lockDisplay.text || cushionText) ? `
        <div class="vehicle-status-row">
          ${lockDisplay.text ? `<span class="vstat ${lockDisplay.cls}">🔒 ${lockDisplay.text}</span>` : ""}
          ${cushionText ? `<span class="vstat vstat-cushion">💺 ${cushionText}</span>` : ""}
        </div>` : ""}
        ${isCharging ? `
        <div class="charge-progress-row">
          <div class="charge-progress-info">
            <span class="charge-icon">⚡</span>
            <span class="charge-percent">充电中 ${a.vehicle.batteryPercent}%</span>
            ${a.vehicle.batteryPercent >= 100 ? `<span class="charge-eta">已充满</span>` : (chargeEta ? `<span class="charge-eta">${chargeEta}</span>` : "")}
          </div>
        </div>` : ""}
        <div class="vehicle-kpi">
          <div class="v-kpi">
            <div class="v-kpi-val" style="color:${a.vehicle.batteryPercent <= 20 ? "#EF4444" : a.vehicle.batteryPercent <= 50 ? "#F59E0B" : "#0891B2"}">${a.vehicle.batteryPercent}%</div>
            <div class="v-kpi-lbl">电量SOC</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.rangeEstimated ? "约" + a.vehicle.residualRangeKm : a.vehicle.residualRangeKm}</div>
            <div class="v-kpi-lbl">续航km</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.todayDistance ? a.vehicle.todayDistance.toFixed(1) : "0"}</div>
            <div class="v-kpi-lbl">今日km</div>
          </div>
          <div class="v-kpi">
            <div class="v-kpi-val">${a.vehicle.todayDuration || 0}</div>
            <div class="v-kpi-lbl">骑行min</div>
          </div>
        </div>
        <div class="vehicle-bar">
          <div class="vehicle-bar-fill" style="width:${a.vehicle.batteryPercent}%;background:${a.vehicle.batteryPercent <= 20 ? "#EF4444" : a.vehicle.batteryPercent <= 50 ? "#F59E0B" : "#0891B2"}"></div>
        </div>
        ${(a.vehicle.frontPressure || a.vehicle.rearPressure) ? `
        <div class="tire-row">
          <div class="tire-item"><span class="tire-icon">🛞</span>前 ${a.vehicle.frontPressure || "-"} ${a.vehicle.frontTemp ? `<span class="tire-temp">${a.vehicle.frontTemp}</span>` : ""}</div>
          <div class="tire-item"><span class="tire-icon">🛞</span>后 ${a.vehicle.rearPressure || "-"} ${a.vehicle.rearTemp ? `<span class="tire-temp">${a.vehicle.rearTemp}</span>` : ""}</div>
        </div>` : ""}
        ${(a.vehicle.voltage || (isCharging && a.vehicle.current) || a.vehicle.batteryTemp || a.vehicle.powerUseToday > 0 || a.vehicle.powerUseMonth > 0 || a.vehicle.powerChargeMonth > 0 || a.vehicle.chargeCount > 0) ? `
        <div class="battery-row">
          ${a.vehicle.voltage ? `<div class="battery-item"><span class="battery-icon">⚡</span>电压 ${a.vehicle.voltage.toFixed(1)}V</div>` : ""}
          ${isCharging && a.vehicle.current ? `<div class="battery-item"><span class="battery-icon">🔌</span>电流 ${a.vehicle.current.toFixed(1)}A</div>` : ""}
          ${a.vehicle.batteryTemp ? `<div class="battery-item"><span class="battery-icon">🌡️</span>电池温度 ${a.vehicle.batteryTemp.toFixed(0)}°C</div>` : ""}
          ${a.vehicle.powerUseToday > 0 ? `<div class="battery-item"><span class="battery-icon">📉</span>今日耗电 ${a.vehicle.powerUseToday.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.powerUseMonth > 0 ? `<div class="battery-item"><span class="battery-icon">📊</span>本月耗电 ${a.vehicle.powerUseMonth.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.powerChargeMonth > 0 ? `<div class="battery-item"><span class="battery-icon">🔋</span>本月充电 ${a.vehicle.powerChargeMonth.toFixed(2)}kWh</div>` : ""}
          ${a.vehicle.chargeCount > 0 ? `<div class="battery-item"><span class="battery-icon">🔁</span>充电次数 ${a.vehicle.chargeCount}</div>` : ""}
        </div>` : ""}
        ${a.vehicle.serviceEndDate ? `
        <div class="service-row">
          <span class="service-icon">📅</span>
          <span class="service-text">服务到期 ${a.vehicle.serviceEndDate}</span>
        </div>` : ""}
        ${(a.vehicle.address || coordOk) ? `
        <div class="vehicle-addr">
          <span class="addr-text">📍 ${a.vehicle.address || "已获取GPS定位"}${a.vehicle.locationTime ? ` <span class="loc-time">· ${a.vehicle.locationTime}</span>` : ""}</span>
          <button type="button" class="map-btn ${coordOk ? "" : "map-btn-disabled"}" ${coordOk ? `onclick="event.stopPropagation();openMap(${idx})"` : "disabled title=\"暂无有效GPS坐标\""}>🗺️ 地图</button>
        </div>` : ""}
        <div class="vehicle-ctrl" onclick="event.stopPropagation()">
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','find',this,'${v.vinNo || ''}')">🔔 寻车</button>
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','loudFind',this,'${v.vinNo || ''}')">📣 鸣笛</button>
          <button class="vctrl-btn" onclick="vehicleCtrl('${a.userId}','cushion',this,'${v.vinNo || ''}')">💺 坐垫</button>
          <button class="vctrl-btn vctrl-unlock" onclick="vehicleCtrl('${a.userId}','unlock',this,'${v.vinNo || ''}')">🔓 开锁</button>
          <button class="vctrl-btn vctrl-lock" onclick="vehicleCtrl('${a.userId}','lock',this,'${v.vinNo || ''}')">🔒 关锁</button>
          <button class="vctrl-btn vctrl-dashcam" id="dashcam-btn-${idx}" onclick="event.stopPropagation();openDashcam(${idx},this)">📹 行车记录仪</button>
        </div>
      </div>` : ""}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>极核 ZEEHO 签到面板</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#F0F4F8;color:#0F172A;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.num{font-variant-numeric:tabular-nums}
.topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0}
.brand-text h1{font-size:15px;font-weight:700}
.brand-text p{font-size:11px;color:#94A3B8;margin-top:1px}
.top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.stat-chip{font-size:12px;color:#475569;background:#F1F5F9;padding:5px 12px;border-radius:14px;display:flex;align-items:center;gap:5px}
.stat-chip .dot{width:7px;height:7px;border-radius:50%;background:#10B981}
.nav-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;text-decoration:none;display:inline-block;transition:all .15s;font-family:inherit}
.nav-btn:hover{background:#F1F5F9}
.nav-btn.primary{background:#0891B2;color:#fff;border-color:#0891B2}
.nav-btn.primary:hover{background:#0E7490}
.container{max-width:1100px;margin:0 auto;padding:18px 16px 40px}
.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.summary-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;position:relative;overflow:hidden}
.summary-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.summary-card.s1::before{background:#F59E0B}
.summary-card.s2::before{background:#0891B2}
.summary-card.s3::before{background:#10B981}
.summary-card .sl{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;font-weight:500}
.summary-card .sv{font-size:26px;font-weight:900;margin-top:4px}
.summary-card .ss{font-size:11px;color:#64748B;margin-top:3px}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.acc-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:16px;transition:box-shadow .2s}
.acc-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.06)}
.acc-card.acc-error{border-color:#FCA5A5;background:#FEF2F2}
.acc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.acc-avatar{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0891B2,#0E7490);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
.acc-info{flex:1;min-width:0}
.acc-name{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-uid{font-size:11px;color:#94A3B8;margin-top:1px}
.acc-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:10px;flex-shrink:0}
.badge-ok{background:#D1FAE5;color:#065F46}
.badge-miss{background:#FEE2E2;color:#991B1B}
.acc-err-msg{font-size:11px;color:#DC2626;background:#FEE2E2;padding:6px 10px;border-radius:6px;margin-bottom:10px}
.acc-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.kpi-item{text-align:center;background:#F8FAFC;border-radius:8px;padding:8px 4px}
.kpi-val{font-size:18px;font-weight:800;color:#0F172A}
.kpi-lbl{font-size:10px;color:#94A3B8;margin-top:2px}
.blind-section{margin-bottom:12px}
.blind-label{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;margin-bottom:5px;font-weight:500}
.blind-bar{height:18px;background:#F1F5F9;border-radius:9px;overflow:hidden;border:1px solid #E2E8F0}
.blind-fill{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:8px;transition:width .5s ease}
.week-section{}
.week-label{font-size:11px;color:#64748B;font-weight:500;margin-bottom:6px}
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.day-cell{aspect-ratio:1;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px}
.day-ok{background:#E0F7FB;border:1px solid #7DD3FC;color:#0E7490}
.day-miss{background:#F1F5F9;border:1px dashed #E2E8F0;color:#CBD5E1}
.day-today{background:#0891B2;border:1px solid #0E7490;color:#fff;box-shadow:0 0 0 2px #E0F7FB}
.day-num{font-weight:700;font-size:10px}
.day-mark{font-size:8px;margin-top:1px}
.vehicle-section{margin-top:12px;padding-top:12px;border-top:1px solid #F1F5F9}
.vehicle-label{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:#0F172A;margin-bottom:8px}
.vin-no{font-size:10px;color:#94A3B8;font-family:monospace;margin-left:6px;word-break:break-all;display:inline-block;max-width:140px}
.vin-toggle-btn{border:1px solid #CBD5E1;background:#fff;color:#0891B2;border-radius:6px;font-size:10px;font-weight:600;padding:1px 7px;margin-left:5px;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit;vertical-align:middle}
.vin-toggle-btn:active{transform:scale(.94)}
.vehicle-charge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;background:#F1F5F9;color:#64748B}
.vehicle-charge.charging{background:#D1FAE5;color:#065F46}
.vehicle-power{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;margin-left:4px}
.vehicle-power.power-on{background:#D1FAE5;color:#065F46}
.vehicle-power.power-off{background:#F1F5F9;color:#64748B}
.vehicle-power.power-unknown{background:#FEF3C7;color:#92400E}
.vehicle-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.v-kpi{text-align:center;background:#F8FAFC;border-radius:6px;padding:6px 2px}
.v-kpi-val{font-size:14px;font-weight:800;color:#0F172A}
.v-kpi-lbl{font-size:9px;color:#94A3B8;margin-top:1px}
.vehicle-bar{height:10px;background:#F1F5F9;border-radius:5px;overflow:hidden;margin-bottom:8px}
.vehicle-bar-fill{height:100%;border-radius:5px;transition:width .5s ease}
.tire-row{display:flex;gap:12px;margin-bottom:6px}
.tire-item{font-size:11px;color:#475569;display:flex;align-items:center;gap:4px}
.tire-icon{font-size:12px}
.tire-temp{color:#0EA5E9;font-size:10px}
.battery-row{display:flex;gap:12px;margin-bottom:6px;flex-wrap:wrap}
.battery-item{font-size:11px;color:#475569;display:flex;align-items:center;gap:4px;background:#F8FAFC;padding:4px 8px;border-radius:6px}
.battery-icon{font-size:12px}
.charge-progress-row{margin-bottom:8px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:8px 10px}
.charge-progress-info{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.charge-icon{font-size:14px}
.charge-percent{font-size:13px;font-weight:700;color:#059669}
.charge-eta{font-size:11px;color:#059669;background:#D1FAE5;padding:2px 8px;border-radius:10px}
.vehicle-addr{font-size:10px;color:#94A3B8;margin-top:4px;display:flex;align-items:center;gap:6px}
.addr-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.loc-time{color:#CBD5E1;font-size:9px}
.map-btn{flex-shrink:0;border:1px solid #67E8F9;background:#ECFEFF;color:#0E7490;border-radius:6px;font-size:10px;font-weight:600;padding:3px 9px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.map-btn:active{transform:scale(.94)}
.map-btn.map-btn-disabled{opacity:.5;cursor:not-allowed;background:#F1F5F9;border-color:#E2E8F0;color:#94A3B8}
.vbadge-group{display:flex;align-items:center;gap:5px;flex-shrink:0}
.vehicle-online{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;display:inline-flex;align-items:center;gap:3px}
.vehicle-online.online-on{background:#D1FAE5;color:#065F46}
.vehicle-online.online-off{background:#F1F5F9;color:#64748B}
.vehicle-online.online-unk{background:#FEF3C7;color:#92400E}
.vehicle-status-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.vstat{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;background:#F1F5F9;color:#475569}
.vstat.lock-locked{background:#FEE2E2;color:#991B1B}
.vstat.lock-unlocked{background:#D1FAE5;color:#065F46}
.vstat.vstat-cushion{background:#EDE9FE;color:#5B21B6}
.log-filter{padding:5px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;color:#334155;outline:none}
.log-tag{display:inline-block;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px;margin-right:6px;vertical-align:middle}
.log-tag.tag-signin{background:#E0F7FB;color:#0E7490}
.log-tag.tag-vehicle{background:#FEF3C7;color:#92400E}
.vehicle-ctrl{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:9px;padding-top:9px;border-top:1px dashed #E2E8F0}
.vctrl-btn{border:1px solid #CBD5E1;background:#F8FAFC;color:#334155;border-radius:8px;padding:7px 2px;font-size:11px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s}
.vctrl-btn:active{transform:scale(.94)}
.vctrl-btn:disabled{opacity:.55;cursor:not-allowed}
.vctrl-btn.vctrl-unlock{border-color:#86EFAC;background:#F0FDF4;color:#15803D}
.vctrl-btn.vctrl-lock{border-color:#FCA5A5;background:#FEF2F2;color:#B91C1C}
.service-row{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#475569;flex-wrap:wrap}
.service-icon{font-size:12px}
.service-text{font-weight:600}
.service-remain{color:#0891B2;background:#E0F7FB;padding:1px 6px;border-radius:6px;font-size:10px}
.service-expired{color:#DC2626;background:#FEE2E2;padding:1px 6px;border-radius:6px;font-size:10px}
.no-vehicle-tip{margin-top:10px;padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:11px;color:#B45309;text-align:center}
.footer{text-align:center;padding:20px;font-size:11px;color:#94A3B8;margin-top:10px}
.footer a{color:#0891B2;text-decoration:none}
.empty-state{text-align:center;padding:60px 20px;color:#94A3B8}
.empty-state p{font-size:14px;margin-bottom:6px}
.empty-state .hint{font-size:12px;opacity:.7}
.config-info{font-size:10px;color:#94A3B8;margin-top:8px;text-align:center}
.token-badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:8px;flex-shrink:0;margin-left:6px}
.token-valid{background:#D1FAE5;color:#065F46}
.token-invalid{background:#FEE2E2;color:#991B1B}
.acc-signin-btn{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid #0891B2;background:#fff;color:#0891B2;cursor:pointer;flex-shrink:0;margin-left:6px;font-family:inherit}
.acc-signin-btn:hover{background:#0891B2;color:#fff}
.log-item{padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:12px}
.log-item:last-child{border-bottom:none}
.log-time{color:#94A3B8;font-size:11px;margin-bottom:2px}
.log-user{font-weight:700;color:#0F172A;margin-right:8px}
.log-result{color:#10B981;font-weight:600}
.log-result.err{color:#DC2626}
.log-steps{color:#64748B;margin-top:4px;font-size:11px;line-height:1.6}
@media(max-width:640px){.summary-row{grid-template-columns:1fr}.cards-grid{grid-template-columns:1fr}.acc-kpi{grid-template-columns:repeat(2,1fr)}.topbar{padding:12px 14px}.container{padding:14px 12px 30px}}
</style></head><body>
<div class="topbar">
  <div class="brand"><div class="brand-mark">Z</div><div class="brand-text"><h1>极核 ZEEHO 签到面板</h1><p>${data.length} 个账号 · 实时数据</p></div></div>
  <div class="top-actions">
    <div class="stat-chip"><span class="dot"></span><span id="signedInfo">${signedCount}/${data.length} 已签到</span></div>
    <button class="nav-btn" onclick="switchTab('dashboard')">数据</button>
    <button class="nav-btn" onclick="switchTab('logs')">日志</button>
    <a href="/config" class="nav-btn">配置</a>
    <button class="nav-btn primary" onclick="runAllSignin()">立即签到</button>
    <button class="nav-btn" id="autoRefreshBtn" onclick="toggleAutoRefresh()" style="background:#0891B2;color:#fff">自动刷新(${cfg.autoRefreshSec || 60}s)</button>
    <button class="nav-btn" onclick="location.reload()">刷新</button>
  </div>
</div>
<div class="container" id="dashboardPage">
  ${data.length === 0 ? `
  <div class="empty-state">
    <p>未找到极核账号</p>
    <p class="hint">请先在「配置」页面添加账号（Authorization Bearer token），或运行签到脚本抓 Cookie</p>
    <a href="/config" class="nav-btn primary" style="margin-top:16px">去添加账号</a>
  </div>` : `
  <div class="summary-row">
    <div class="summary-card s1"><div class="sl">账号总积分</div><div class="sv num">${totalScore.toLocaleString()}</div><div class="ss">${data.length} 个账号合计</div></div>
    <div class="summary-card s2"><div class="sl">今日签到</div><div class="sv num">${signedCount} / ${data.length}</div><div class="ss">${data.length - signedCount > 0 ? (data.length - signedCount) + ' 个未签到' : '全部已签到'}</div></div>
    <div class="summary-card s3"><div class="sl">数据更新时间</div><div class="sv" style="font-size:18px;padding-top:6px">${updateTime}</div><div class="ss">来自代理工具实时 API</div></div>
  </div>
  <div class="cards-grid">${cards}</div>
  <div class="config-info">App端 appId: ${cfg.app.appId} · H5端 appId: ${cfg.h5.appId} · 可在「配置」页修改</div>
  `}
</div>
<!-- 运行日志页面 -->
<div id="logsPage" style="display:none">
  <div class="panel" style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:16px;overflow:hidden">
    <div class="panel-head" style="padding:14px 18px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between">
      <div class="panel-title" style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px"><span class="bar" style="width:3px;height:14px;border-radius:2px;background:#8B5CF6"></span>运行日志（最近50条）</div>
      <div style="display:flex;align-items:center;gap:8px">
        <select id="logFilter" class="log-filter" onchange="loadLogs()">
          <option value="all">全部类型</option>
          <option value="signin">仅签到</option>
          <option value="vehicle">仅控车</option>
        </select>
        <button class="nav-btn" onclick="clearLogs()" style="padding:5px 12px;font-size:11px">清空日志</button>
      </div>
    </div>
    <div id="logsList" style="padding:14px 18px;max-height:70vh;overflow-y:auto"></div>
  </div>
</div>

<!-- 签到结果弹窗 -->
<div id="signinModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px">
  <div style="background:#fff;border-radius:14px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h3 style="font-size:16px;font-weight:700">签到执行结果</h3>
      <button onclick="closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94A3B8">×</button>
    </div>
    <div id="signinResult"></div>
  </div>
</div>

<!-- 车辆详情弹窗 -->
<div id="vehicleModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:16px;font-weight:700" id="vModalTitle">车辆详情</h3>
      <button onclick="closeVehicleModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94A3B8">×</button>
    </div>
    <div id="vehicleDetailContent"></div>
  </div>
</div>

<div class="footer">极核 ZEEHO 签到看板 · 作者 <a href="https://github.com/cluck798">lucky</a> · 数据来自代理工具实时 API<br><span style="font-size:10px;color:#CBD5E1;margin-top:4px;display:inline-block">脚本版本 ${SCRIPT_VERSION}</span></div>
<script>
var vehicleDataList = ${JSON.stringify(data.map(function(a){ return a.vehicle || {}; }))};
var AUTO_REFRESH_SEC = ${cfg.autoRefreshSec || 60};
var autoRefreshTimer = null;
var autoRefreshCountdown = AUTO_REFRESH_SEC;
// 浏览器端坐标校验（与后端 hasValidCoord 同逻辑，独立一份供浏览器内函数调用）
function hasValidCoord(lat, lng) { if (lat === "" || lat === null || lat === undefined || lng === "" || lng === null || lng === undefined) return false; lat = Number(lat); lng = Number(lng); return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0); }
// 跳转地图查看车辆定位：iPhone 优先苹果地图（q=纬度,经度）；坐标非法时提示
function openMap(idx) {
  var v = vehicleDataList[idx]; if (!v) return;
  if (!hasValidCoord(v.latitude, v.longitude)) { showToast('暂无有效GPS坐标', 'err'); return; }
  var lat = Number(v.latitude), lng = Number(v.longitude);
  var url = 'https://maps.apple.com/?q=' + lat + ',' + lng + '&z=17';
  window.open(url, '_blank');
}
// 行车记录仪 RTSP 实时预览（iOS/Android 原生桥接，Loon/QX 等纯代理环境无 effect）
// 用户需先在系统设置连接行车记录仪 WiFi（默认 SSID: ZEEHO-DashCam, IP: 192.168.49.1）
function openDashcam(idx, btn) {
  if (typeof window.dashcamHandler !== 'function') {
    showToast('当前环境不支持行车记录仪预览（需 iOS/Android 原生 App）', 'err');
    return;
  }
  // 先 check 探测，再 play 调起播放器
  if (btn) { btn.disabled = true; btn.textContent = '📹 探测中…'; }
  window.dashcamHandler('check', function(ok) {
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = '📹 行车记录仪'; }
      showToast('未连接行车记录仪 WiFi，请在系统设置连接（SSID: ZEEHO-DashCam）', 'err');
      return;
    }
    // 探测成功 → 调起全屏播放器
    window.dashcamHandler('play', function(played) {
      if (btn) { btn.disabled = false; btn.textContent = '📹 行车记录仪'; }
      if (!played) showToast('打开播放器失败', 'err');
    });
  });
}
function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshCountdown = AUTO_REFRESH_SEC;
  updateAutoRefreshBtn();
  autoRefreshTimer = setInterval(function() {
    autoRefreshCountdown--;
    // 负数保护
    if (autoRefreshCountdown < 0) autoRefreshCountdown = 0;
    updateAutoRefreshBtn();
    if (autoRefreshCountdown <= 0) {
      if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
      location.reload();
    }
  }, 1000);
}
function updateAutoRefreshBtn() {
  var btn = document.getElementById('autoRefreshBtn');
  if (btn) btn.textContent = '自动刷新(' + autoRefreshCountdown + 's)';
}
function toggleAutoRefresh() {
  var btn = document.getElementById('autoRefreshBtn');
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    btn.textContent = '开启自动刷新';
    btn.style.background = '#fff';
    btn.style.color = '#475569';
  } else {
    startAutoRefresh();
    btn.style.background = '#0891B2';
    btn.style.color = '#fff';
  }
}
startAutoRefresh();
function switchTab(tab) {
  document.getElementById('dashboardPage').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.getElementById('logsPage').style.display = tab === 'logs' ? 'block' : 'none';
  if (tab === 'logs') loadLogs();
}
function loadLogs() {
  var filterEl = document.getElementById('logFilter');
  var filter = filterEl ? filterEl.value : 'all';
  fetch('/api/get-logs').then(function(r){return r.json()}).then(function(d){
    var list = document.getElementById('logsList');
    var all = d.logs || [];
    if (all.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">暂无运行日志</div>';
      return;
    }
    // 旧日志没有 type 字段，统一按签到(signin)兜底，避免历史记录在筛选时被吞掉
    var logs = all.filter(function(log){
      var t = log.type || 'signin';
      if (filter === 'all') return true;
      return t === filter;
    });
    if (logs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">该分类下暂无日志</div>';
      return;
    }
    list.innerHTML = logs.map(function(log){
      var t = log.type || 'signin';
      var tag = t === 'vehicle' ? '<span class="log-tag tag-vehicle">控车</span>' : '<span class="log-tag tag-signin">签到</span>';
      var result = '';
      if (t === 'vehicle') {
        result = '<span class="log-result '+(log.success?'':'err')+'">'+(log.actionText || '车辆控制')+' '+(log.success ? '成功' : ('失败：'+(log.message || log.error || '未知')))+'</span>';
      } else {
        result = '<span class="log-result '+(log.success?'':'err')+'">'+(log.success?('成功 +'+log.totalGain):('失败: '+(log.error||'未知')))+'</span>';
      }
      var steps = log.steps ? log.steps.map(function(s){return '<div>· '+s+'</div>'}).join('') : '';
      return '<div class="log-item"><div class="log-time">'+log.time+'</div><div>'+tag+'<span class="log-user">'+(log.userName || '')+'</span>'+result+'</div>'+(steps?'<div class="log-steps">'+steps+'</div>':'')+'</div>';
    }).join('');
  }).catch(function(){document.getElementById('logsList').innerHTML='<div style="text-align:center;padding:40px;color:#DC2626">加载失败</div>'});
}
function clearLogs() {
  if (!confirm('确定清空所有运行日志？')) return;
  fetch('/api/clear-logs',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
    if (d.ok) { loadLogs(); showToast('日志已清空'); }
  });
}
function runAllSignin() {
  if (!confirm('确定立即执行所有账号签到？')) return;
  showToast('正在执行签到...');
  fetch('/api/run-signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})})
    .then(function(r){return r.json()})
    .then(function(d){ showSigninResult(d); })
    .catch(function(){ showToast('执行失败','err'); });
}
function runSignin(userId) {
  showToast('正在签到...');
  fetch('/api/run-signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:userId})})
    .then(function(r){return r.json()})
    .then(function(d){ showSigninResult(d); })
    .catch(function(){ showToast('执行失败','err'); });
}
function showSigninResult(d) {
  var modal = document.getElementById('signinModal');
  var result = document.getElementById('signinResult');
  modal.style.display = 'flex';
  var html = '';
  if (d.results && d.results.length > 0) {
    html = d.results.map(function(r){
      var steps = r.steps ? r.steps.map(function(s){return '<div style="color:#64748B;font-size:12px;margin:2px 0">· '+s+'</div>'}).join('') : '';
      return '<div style="padding:12px;border:1px solid '+(r.success?'#D1FAE5':'#FEE2E2')+';border-radius:10px;margin-bottom:10px;background:'+(r.success?'#F0FDF4':'#FEF2F2')+'"><div style="font-weight:700;font-size:14px;margin-bottom:4px">'+r.userName+' <span style="color:'+(r.success?'#10B981':'#DC2626')+';font-size:12px">'+(r.success?('成功 +'+r.totalGain):'失败')+'</span></div>'+(r.error?'<div style="color:#DC2626;font-size:12px">'+r.error+'</div>':'')+steps+'</div>';
    }).join('');
  } else {
    html = '<div style="text-align:center;color:#94A3B8;padding:20px">无结果</div>';
  }
  result.innerHTML = html;
  setTimeout(function(){ location.reload(); }, 3000);
}
function closeModal() {
  document.getElementById('signinModal').style.display = 'none';
}
// 注意：vehicleDataList 已在看板脚本顶部渲染时注入真实车辆数据，此处禁止再用空数组覆盖，
// 否则卡片车架号“显示”按钮、车辆详情弹窗都会因取不到 vehicleDataList[idx] 而无反应
function showVehicleDetail(idx) {
  var v = vehicleDataList[idx];
  if (!v) return;
  var modal = document.getElementById('vehicleModal');
  var content = document.getElementById('vehicleDetailContent');
  document.getElementById('vModalTitle').textContent = v.vehicleName || '车辆详情';
  var rows = [];
  if (v.vinNo) rows.push('<div class="v-detail-row"><span class="v-detail-label">车架号</span><span><span class="v-detail-val" id="vin_detail_mask" style="font-family:monospace;font-size:12px">'+maskVin(v.vinNo)+'</span> <button type="button" class="vin-toggle-btn" onclick="toggleDetailVin('+idx+',this)">显示</button></span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">充电状态</span><span class="v-detail-val">'+(v.chargeState || '未充电')+'</span></div>');
  // 电源状态（开关机）：优先电源字段，其次用车锁推断（开锁=上电/开机，锁车=下电/关机）
  var powerText = "状态未知", powerColor = "#92400E";
  var p = String(v.powerStatus || "").toLowerCase().trim();
  var l = String(v.lockState || "").toLowerCase().trim();
  var onVals = ["1","on","true","开机","open","激活","acc_on","acc on","power_on","power on","已开机","已上电"];
  var offVals = ["0","off","false","关机","closed","待机","acc_off","acc off","power_off","power off","已关机","已下电"];
  if (p) {
    if (onVals.indexOf(p) >= 0) { powerText = "已开机"; powerColor = "#065F46"; }
    else if (offVals.indexOf(p) >= 0) { powerText = "已关机"; powerColor = "#64748B"; }
  } else if (l) {
    var lockOnVals = ["0","未锁","开锁","unlocked","false","open","已开锁","未锁车"];
    var lockOffVals = ["1","已锁","锁车","locked","true","closed","已锁车"];
    if (lockOnVals.indexOf(l) >= 0) { powerText = "已开机"; powerColor = "#065F46"; }
    else if (lockOffVals.indexOf(l) >= 0) { powerText = "已关机"; powerColor = "#64748B"; }
  }
  rows.push('<div class="v-detail-row"><span class="v-detail-label">电源状态</span><span class="v-detail-val" style="color:'+powerColor+'">'+powerText+'</span></div>');
  if (v.rideState || v.online) rows.push('<div class="v-detail-row"><span class="v-detail-label">车辆状态</span><span class="v-detail-val">'+(v.rideState || v.online)+'</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">电量SOC</span><span class="v-detail-val" style="font-weight:700;color:'+(v.batteryPercent<=20?'#EF4444':v.batteryPercent<=50?'#F59E0B':'#0891B2')+'">'+v.batteryPercent+'%</span></div>');
  if (v.voltage) rows.push('<div class="v-detail-row"><span class="v-detail-label">电压</span><span class="v-detail-val">'+v.voltage.toFixed(1)+'V</span></div>');
  if (v.current) rows.push('<div class="v-detail-row"><span class="v-detail-label">电流</span><span class="v-detail-val">'+v.current.toFixed(1)+'A</span></div>');
  if (v.batteryTemp) rows.push('<div class="v-detail-row"><span class="v-detail-label">电池温度</span><span class="v-detail-val">'+v.batteryTemp.toFixed(0)+'°C</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">剩余续航</span><span class="v-detail-val">'+v.residualRangeKm+'km</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">今日骑行</span><span class="v-detail-val">'+(v.todayDistance?v.todayDistance.toFixed(1):0)+'km / '+(v.todayDuration||0)+'min</span></div>');
  var hasTire = (v.frontPressure && v.frontPressure !== "未绑定") || (v.rearPressure && v.rearPressure !== "未绑定");
  if (hasTire) rows.push('<div class="v-detail-row"><span class="v-detail-label">胎压</span><span class="v-detail-val">前'+(v.frontPressure||'-')+' / 后'+(v.rearPressure||'-')+'</span></div>');
  if (v.address) rows.push('<div class="v-detail-row"><span class="v-detail-label">车辆位置</span><span class="v-detail-val" style="font-size:12px">'+v.address+'</span></div>');
  var dCoordOk = hasValidCoord(v.latitude, v.longitude);
  if (dCoordOk) rows.push('<div class="v-detail-row"><span class="v-detail-label">GPS坐标</span><span class="v-detail-val" style="font-family:monospace;font-size:11px">'+Number(v.latitude).toFixed(6)+', '+Number(v.longitude).toFixed(6)+'</span></div>');
  rows.push('<div class="v-detail-row"><span class="v-detail-label">地图定位</span><span><button type="button" class="vin-toggle-btn" '+(dCoordOk ? 'onclick="openMap('+idx+')"' : 'disabled')+' style="'+(dCoordOk ? '' : 'opacity:.45;cursor:not-allowed')+'">🗺️ '+(dCoordOk ? '在地图中查看' : '暂无GPS坐标')+'</button></span></div>');
  if (v.locationTime) rows.push('<div class="v-detail-row"><span class="v-detail-label">最后定位</span><span class="v-detail-val" style="font-size:11px;color:#94A3B8">'+v.locationTime+'</span></div>');
  if (v.serviceEndDate) rows.push('<div class="v-detail-row"><span class="v-detail-label">服务到期</span><span class="v-detail-val">'+v.serviceEndDate+'</span></div>');
  content.innerHTML = '<div class="v-detail-container">'+rows.join('')+'</div><style>.v-detail-container{display:flex;flex-direction:column;gap:0}.v-detail-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9}.v-detail-row:last-child{border-bottom:none}.v-detail-label{font-size:12px;color:#64748B;font-weight:500}.v-detail-val{font-size:13px;color:#0F172A;font-weight:600}</style>';
  modal.style.display = 'flex';
}
function closeVehicleModal() {
  document.getElementById('vehicleModal').style.display = 'none';
}
// 车架号默认打码，点击“显示/隐藏”切换（卡片 & 详情弹窗）
function maskVin(v){ if(!v) return ''; v=String(v); if(v.length<=7) return '****'; return v.substring(0,3)+'****'+v.substring(v.length-4); }
function toggleVin(idx, btn){
  var v = vehicleDataList[idx]; if(!v||!v.vinNo) return;
  var el = document.getElementById('vin_mask_'+idx); if(!el) return;
  if(el.textContent.indexOf('*')>=0){ el.textContent=v.vinNo; btn.textContent='隐藏'; }
  else { el.textContent=maskVin(v.vinNo); btn.textContent='显示'; }
}
function toggleDetailVin(idx, btn){
  var v = vehicleDataList[idx]; if(!v||!v.vinNo) return;
  var el = document.getElementById('vin_detail_mask'); if(!el) return;
  if(el.textContent.indexOf('*')>=0){ el.textContent=v.vinNo; btn.textContent='隐藏'; }
  else { el.textContent=maskVin(v.vinNo); btn.textContent='显示'; }
}
// 车辆远程控制：寻车/鸣笛闪灯/开坐垫/云端开关锁（均真实控车，需二次确认）
// 2026-09-20 修复：增加 vin 参数，切换车辆后控车操作对应选中车辆
function vehicleCtrl(userId, action, btn, vin) {
  var names = { find:'短按寻车（车辆闪灯）', loudFind:'鸣笛闪灯（高声寻车）', cushion:'打开坐垫（坐垫会弹起）', unlock:'云端开锁', lock:'云端关锁' };
  var name = names[action] || action;
  if (!confirm('确定执行【' + name + '】吗？\\n该指令会通过 4G 网络真实控制你的车辆！')) return;
  var old = btn.textContent;
  btn.disabled = true; btn.textContent = '···';
  showToast('指令下发中…');
  fetch('/api/vehicle-control', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:userId, action:action, vin: vin || '' }) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      btn.disabled = false; btn.textContent = old;
      showToast(d.ok ? ('✅ ' + d.message) : ('❌ ' + (d.message || '指令失败')), d.ok ? '' : 'err');
    })
    .catch(function(e){
      btn.disabled = false; btn.textContent = old;
      showToast('❌ ' + e, 'err');
    });
}
function showToast(msg, type) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:10000;'+(type==='err'?'background:#EF4444;color:#fff':'background:#10B981;color:#fff');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2000);
}
</script>
</body></html>`;
}

// ========== HTML: 配置页 ==========
function renderConfig(accounts, cfg) {
  const accRows = accounts.map((a, idx) => `
    <div class="acc-row" data-idx="${idx}">
      <div class="acc-row-head">
        <span class="acc-row-title">账号 ${idx + 1}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="refreshUserId(${idx})" id="refresh_btn_${idx}">获取ID</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAccount(${idx})">删除</button>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-item"><label>昵称</label><input type="text" id="acc_name_${idx}" value="${a.userName || ''}" placeholder="lucky798"></div>
        <div class="form-item"><label>用户ID</label><input type="text" id="acc_uid_${idx}" value="${a.userId || ''}" placeholder="20251009..." style="font-family:monospace;font-size:12px"></div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>Authorization Token（直接粘贴即可，会自动去掉 Bearer 前缀）</label>
        <input type="text" id="acc_token_${idx}" value="${a.token || ''}" placeholder="a74779c7-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:monospace;font-size:12px">
      </div>
      <div class="form-item" style="margin-top:8px"><label>Bark 通知 Key（选填，仅该账号签到成功后推送，留空不推）</label>
        <input type="text" id="acc_bark_${idx}" value="${a.barkKey || ''}" placeholder="Bark App 内的 Key，或自建服务器 https://域名/Key" style="font-family:monospace;font-size:12px">
      </div>

    </div>`).join('');


  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>极核 ZEEHO · 配置</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#F0F4F8;color:#0F172A;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.num{font-variant-numeric:tabular-nums}
.topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0}
.brand-text h1{font-size:15px;font-weight:700}
.brand-text p{font-size:11px;color:#94A3B8;margin-top:1px}
.nav-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;text-decoration:none;display:inline-block;transition:all .15s;font-family:inherit}
.nav-btn:hover{background:#F1F5F9}
.nav-btn.primary{background:#0891B2;color:#fff;border-color:#0891B2}
.container{max-width:800px;margin:0 auto;padding:18px 16px 40px}
.panel{background:#fff;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:16px;overflow:hidden}
.panel-head{padding:14px 18px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between}
.panel-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
.panel-title .bar{width:3px;height:14px;border-radius:2px;background:#0891B2}
.panel-body{padding:18px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-item{margin-bottom:0}
.form-item label{display:block;font-size:11px;color:#64748B;margin-bottom:4px;font-weight:500}
.form-item input,.form-item select{width:100%;padding:9px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:#FAFBFC}
.form-item input:focus{border-color:#0891B2;box-shadow:0 0 0 3px #E0F7FB}
.form-item.full{grid-column:1/-1}
.switch-label{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#334155;padding:8px 0}
.switch-label input[type="checkbox"]{width:18px;height:18px;accent-color:#0891B2;cursor:pointer}
.btn{padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #E2E8F0;background:#fff;color:#475569;cursor:pointer;transition:all .15s;font-family:inherit}
.btn:hover{background:#F1F5F9}
.btn-primary{background:#0891B2;color:#fff;border-color:#0891B2}
.btn-primary:hover{background:#0E7490}
.btn-danger{background:#FEE2E2;color:#991B1B;border-color:#FECACA}
.btn-danger:hover{background:#FECACA}
.btn-sm{padding:5px 12px;font-size:11px}
.btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.acc-row{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:12px}
.acc-row-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.acc-row-title{font-size:13px;font-weight:700;color:#0F172A}
.hint{font-size:11px;color:#94A3B8;margin-top:6px;line-height:1.6}
.hint code{background:#F1F5F9;padding:1px 5px;border-radius:4px;font-size:11px}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.toast.ok{background:#10B981;color:#fff}
.toast.err{background:#EF4444;color:#fff}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}.container{padding:14px 12px 30px}}
</style></head><body>
<div class="topbar">
  <div class="brand"><div class="brand-mark">Z</div><div class="brand-text"><h1>极核 ZEEHO · 配置</h1><p>签名密钥 & 账号管理</p></div></div>
  <div><a href="/" class="nav-btn primary">返回面板</a></div>
</div>
<div class="container">

  <!-- 签名配置 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar"></span>签名密钥配置</div>
    </div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label>App端 appId</label><input type="text" id="cfg_app_id" value="${cfg.app.appId}"></div>
        <div class="form-item"><label>App端 appSecret</label><input type="text" id="cfg_app_secret" value="${cfg.app.appSecret}" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item"><label>H5端 appId</label><input type="text" id="cfg_h5_id" value="${cfg.h5.appId}"></div>
        <div class="form-item"><label>H5端 appSecret</label><input type="text" id="cfg_h5_secret" value="${cfg.h5.appSecret}" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item" style="grid-column:1/-1"><label>云端控车 AES 密钥（开/关锁，32位十六进制，已内置默认密钥可修改）</label><input type="text" id="cfg_vehicle_key" value="${cfg.vehicleAesKey || ''}" placeholder="已内置默认密钥；留空则回退默认" autocomplete="off" style="font-family:monospace;font-size:11px"></div>
        <div class="form-item" style="grid-column:1/-1"><label>车控风险确认</label><div class="hint" style="margin-top:2px">无需在此填写：首次使用车控功能（寻车/鸣笛/坐垫/开关锁）时会弹窗告知风险，点击「我同意风险并使用」后自动启用。</div></div>
        <div class="form-item"><label>看板自动刷新间隔（秒，范围15~3600，默认60；填非法值自动回退60）</label><input type="number" min="15" max="3600" step="5" id="cfg_refresh_sec" value="${cfg.autoRefreshSec || 60}"></div>
      </div>
      <div class="hint">修改后点击「保存配置」生效。App/H5 密钥用于极核 API 签名计算（md5(sha1(param+secret))）；<b>云端控车密钥已内置默认值，可在此修改；车控风险确认在首次使用车控功能时弹窗完成。</b></div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveConfig()">保存配置</button>
        <button class="btn" onclick="resetConfig()">恢复默认</button>
      </div>
    </div>
  </div>

  <!-- 社区任务开关 -->
  <div class="panel">
    <div class="panel-head"><div class="panel-title"><span class="bar" style="background:#F59E0B"></span>社区任务开关</div></div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_post" ${cfg.community?.enablePost !== false ? "checked" : ""}> 发布动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_like" ${cfg.community?.enableLike !== false ? "checked" : ""}> 点赞动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_comment" ${cfg.community?.enableComment !== false ? "checked" : ""}> 评论动态（不加分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_share" ${cfg.community?.enableShare !== false ? "checked" : ""}> 分享动态（+1分）</label></div>
        <div class="form-item"><label class="switch-label"><input type="checkbox" id="comm_delete" ${cfg.community?.enableDelete !== false ? "checked" : ""}> 执行后删除动态</label></div>
      </div>
      <div class="hint">关闭对应开关后，签到脚本将跳过该任务。修改后点击下方「保存配置」生效。</div>
    </div>
  </div>

  <!-- 手机号登录 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar" style="background:#6366F1"></span>手机号登录（免抓包）</div>
    </div>
    <div class="panel-body">
      <div class="form-grid">
        <div class="form-item"><label>手机号（极核 App 绑定号码）</label><input type="tel" id="pl_phone" placeholder="11 位手机号" style="font-family:monospace;font-size:13px"></div>
        <div class="form-item"><label>短信验证码</label><input type="text" id="pl_code" placeholder="6 位验证码" style="font-family:monospace;font-size:13px"></div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>登录 Basic Auth（可选，已内置极核App的OAuth2 client凭据，一般无需填写；抓包发现变化时才需覆盖）</label><input type="text" id="pl_basic" placeholder="默认已内置，留空即可" style="font-family:monospace;font-size:11px" autocomplete="off"></div>
      <div class="btn-row">
        <button class="btn btn-sm" onclick="sendSmsCode()" id="pl_send_btn">获取验证码</button>
        <button class="btn btn-primary" onclick="phoneLogin()" id="pl_login_btn">登录并添加账号</button>
      </div>
      <div class="hint">用手机号 + 短信验证码登录，自动获取 Token 与用户ID并加入账号列表，全程无需抓包。登录成功后会自动写入并刷新页面。<br>· 建议使用小号登录，因为极核是单会话模式（手机号登录情况下只能一台设备）。<br><b>已修复</b>（v2.14.4）：发码与登录统一走 App 网关（同一验证码池），登录签名按官方 App 抓包结果修正（POST 请求按 GET 风格入签），不再误报「验证码有误或已过期」。<br><b>提示</b>：验证码 5 分钟内有效，重复获取会使上一个验证码失效，请使用最新收到的那条。</div>
    </div>
  </div>

  <!-- 账号管理 -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title"><span class="bar" style="background:#10B981"></span>账号管理（${accounts.length} 个）</div>
      <button class="btn btn-sm" onclick="addAccount()">+ 添加账号</button>
    </div>
    <div class="panel-body">
      <div id="accList">${accRows || '<div style="text-align:center;padding:20px;color:#94A3B8;font-size:13px">暂无账号，点击上方「添加账号」</div>'}</div>
      <div class="hint">Token 格式：直接粘贴抓包得到的 Authorization 值即可，即使带了 <code>Bearer </code> 前缀，保存时也会自动去掉、只保留后面的 Token。<br>每账号可单独填 Bark Key：该账号签到成功后推送一条通知（标题含昵称、内容含得分明细），留空则该账号不推送；支持官方 Key 或自建服务器地址。<br>用户ID获取：打开极核App-我的，抓包 <code>/setting/{userId}</code> 接口，响应体 <code>data.id</code> 即为用户ID。</div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveAccounts()">保存极核账号</button>
      </div>
    </div>

  </div>

</div>
<div id="toast" class="toast"></div>
<script>
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || 'ok');
  setTimeout(function(){ t.className = 'toast'; }, 2000);
}
function saveConfig() {
  var data = {
    app: { appId: document.getElementById('cfg_app_id').value, appSecret: document.getElementById('cfg_app_secret').value },
    h5: { appId: document.getElementById('cfg_h5_id').value, appSecret: document.getElementById('cfg_h5_secret').value },
    vehicleAesKey: (document.getElementById('cfg_vehicle_key').value || '').trim(),
    vehicleControlRisk: (getConfig().vehicleControlRisk || ''),
    autoRefreshSec: Number(document.getElementById('cfg_refresh_sec').value),
    community: {
      enablePost: document.getElementById('comm_post').checked,
      enableLike: document.getElementById('comm_like').checked,
      enableComment: document.getElementById('comm_comment').checked,
      enableShare: document.getElementById('comm_share').checked,
      enableDelete: document.getElementById('comm_delete').checked
    }
  };
  fetch('/api/save-config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.ok){ showToast('配置已保存'); } else { showToast('保存失败', 'err'); } })
    .catch(function(){ showToast('保存失败', 'err'); });
}
function resetConfig() {
  document.getElementById('cfg_app_id').value = 'S7qPWPU1';
  document.getElementById('cfg_app_secret').value = 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d';
  document.getElementById('cfg_h5_id').value = 'Sw5F9uJi';
  document.getElementById('cfg_h5_secret').value = '46870a8f678a09109468f5b0168818b91c292845';
  document.getElementById('cfg_vehicle_key').value = '';
  document.getElementById('cfg_refresh_sec').value = 60;
  document.getElementById('comm_post').checked = true;
  document.getElementById('comm_like').checked = true;
  document.getElementById('comm_comment').checked = true;
  document.getElementById('comm_share').checked = true;
  document.getElementById('comm_delete').checked = true;
  showToast('已恢复默认（需点击保存）');
}
var accCount = ${accounts.length};
function addAccount() {
  accCount++;
  var idx = accCount - 1;
  var html = '<div class="acc-row" data-idx="'+idx+'"><div class="acc-row-head"><span class="acc-row-title">账号 '+accCount+'（新）</span><div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="refreshUserId('+idx+')" id="refresh_btn_'+idx+'">获取ID</button><button class="btn btn-sm btn-danger" onclick="deleteAccount('+idx+')">删除</button></div></div><div class="form-grid"><div class="form-item"><label>昵称</label><input type="text" id="acc_name_'+idx+'" placeholder="lucky798"></div><div class="form-item"><label>用户ID</label><input type="text" id="acc_uid_'+idx+'" placeholder="20251009..." style="font-family:monospace;font-size:12px"></div></div><div class="form-item" style="margin-top:8px"><label>Authorization Token（自动去掉 Bearer 前缀）</label><input type="text" id="acc_token_'+idx+'" placeholder="a74779c7-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:monospace;font-size:12px"></div><div class="form-item" style="margin-top:8px"><label>Bark 通知 Key（选填）</label><input type="text" id="acc_bark_'+idx+'" placeholder="Bark Key 或自建 https://域名/Key，留空不推" style="font-family:monospace;font-size:12px"></div></div>';
  var list = document.getElementById('accList');
  if (list.querySelector('.acc-row') || list.querySelector('[style*="text-align"]')) {
    list.insertAdjacentHTML('beforeend', html);
  } else {
    list.innerHTML = html;
  }
}
function deleteAccount(idx) {
  var row = document.querySelector('.acc-row[data-idx="'+idx+'"]');
  if (row) { row.remove(); showToast('已删除（需点击保存）'); }
}
function refreshUserId(idx) {
  var tokenEl = document.getElementById('acc_token_'+idx);
  var uidEl = document.getElementById('acc_uid_'+idx);
  var nameEl = document.getElementById('acc_name_'+idx);
  var btn = document.getElementById('refresh_btn_'+idx);
  if (!tokenEl || !tokenEl.value.trim()) { showToast('请先填写Token', 'err'); return; }
  btn.textContent = '获取中...';
  btn.disabled = true;
  fetch('/api/get-userid', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: tokenEl.value.trim()}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok && d.userId) {
        if (uidEl) uidEl.value = d.userId;
        if (nameEl && d.userName && !nameEl.value) nameEl.value = d.userName;
        showToast('获取成功: '+(d.userName||d.userId));
      } else {
        showToast('获取失败: '+(d.error||'未知错误'), 'err');
      }
    })
    .catch(function(){ showToast('获取失败', 'err'); })
    .finally(function(){ btn.textContent = '获取ID'; btn.disabled = false; });
}
function sendSmsCode() {
  var phoneEl = document.getElementById('pl_phone');
  var btn = document.getElementById('pl_send_btn');
  var phone = (phoneEl ? phoneEl.value : '').trim();
  if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号', 'err'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
  fetch('/api/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone: phone}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) { showToast(d.message || '验证码已发送'); }
      else { showToast(d.message || '发送失败', 'err'); }
      var t = 60;
      if (btn) {
        btn.textContent = t + 's 后重试';
        var iv = setInterval(function(){
          t--;
          if (t <= 0) { clearInterval(iv); btn.textContent = '获取验证码'; btn.disabled = false; }
          else { btn.textContent = t + 's 后重试'; }
        }, 1000);
      }
    })
    .catch(function(){ showToast('发送失败，请检查网络', 'err'); if (btn) { btn.disabled = false; btn.textContent = '获取验证码'; } });
}
function phoneLogin() {
  var phoneEl = document.getElementById('pl_phone');
  var codeEl = document.getElementById('pl_code');
  var basicEl = document.getElementById('pl_basic');
  var btn = document.getElementById('pl_login_btn');
  var phone = (phoneEl ? phoneEl.value : '').trim();
  var code = (codeEl ? codeEl.value : '').trim();
  var basic = (basicEl ? basicEl.value : '').trim();
  if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号', 'err'); return; }
  if (!code) { showToast('请输入短信验证码', 'err'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '登录中...'; }
  fetch('/api/phone-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone: phone, code: code, basicAuth: basic}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) {
        showToast(d.message || '登录成功，已添加账号');
        setTimeout(function(){ location.reload(); }, 900);
      } else {
        showToast(d.message || '登录失败', 'err');
        if (d.detail) console.log('登录诊断:', JSON.stringify(d.detail));
      }
    })
    .catch(function(){ showToast('登录失败，请检查网络', 'err'); })
    .finally(function(){ if (btn) { btn.disabled = false; btn.textContent = '登录并添加账号'; } });
}
function saveAccounts() {
  var rows = document.querySelectorAll('#accList .acc-row');
  var list = [];
  rows.forEach(function(row) {
    var idx = row.getAttribute('data-idx');
    var name = document.getElementById('acc_name_'+idx);
    var uid = document.getElementById('acc_uid_'+idx);
    var token = document.getElementById('acc_token_'+idx);
    var bark = document.getElementById('acc_bark_'+idx);
    if (token && token.value.trim()) {
      list.push({ userName: name ? name.value : '', userId: uid ? uid.value : '', token: token.value.trim(), barkKey: bark ? bark.value.trim() : '', userAgent: '' });
    }
  });
  fetch('/api/save-accounts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({accounts: list}) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.ok){ showToast('极核账号已保存'); setTimeout(function(){ location.reload(); }, 800); } else { showToast('保存失败', 'err'); } })
    .catch(function(){ showToast('保存失败', 'err'); });
}

</script>
<div style="text-align:center;padding:16px;font-size:10px;color:#CBD5E1">脚本版本 ${SCRIPT_VERSION} · 极核 ZEEHO</div>
</body></html>`;
}

// ========== 响应辅助（兼容 QX / Loon / Surge） ==========
function sendResp(status, headers, body) {
  // Loon 专用：$done 使用 response 包装
  // 强制 no-cache：面板 HTML 每次访问都拉取最新版本，避免浏览器缓存旧界面导致新功能不生效
  const h = Object.assign({}, headers || {}, {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  $done({ response: { status: status, headers: h, body: body } });
}
// ========== 主入口：重写路由 ==========
// ========== 整合版：极核 ZEEHO LITE 轻应用界面（base64 内嵌） ==========
const __APP_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8sIHZpZXdwb3J0LWZpdD1jb3ZlciI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyI+CjxtZXRhIG5hbWU9ImFwcGxlLW1vYmlsZS13ZWItYXBwLXN0YXR1cy1iYXItc3R5bGUiIGNvbnRlbnQ9ImJsYWNrLXRyYW5zbHVjZW50Ij4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGUiIGNvbnRlbnQ9IuaegeaguOmdouadvyI+CjxtZXRhIG5hbWU9InRoZW1lLWNvbG9yIiBjb250ZW50PSIjMEEwRjFFIj4KPGxpbmsgcmVsPSJpY29uIiBocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgdmlld0JveD0nMCAwIDY0IDY0JyUzRSUzQ3JlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTYnIGZpbGw9JyUyMzBBMEYxRScvJTNFJTNDcGF0aCBkPSdNMTQgMzhjMC0xMCA4LTE4IDE4LTE4czE4IDggMTggMTgnIGZpbGw9J25vbmUnIHN0cm9rZT0nJTIzMkJENEYyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDcGF0aCBkPSdNMzIgMzZsMTYgMTMnIHN0cm9rZT0nJTIzMEU4RkIyJyBzdHJva2Utd2lkdGg9JzYnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvJTNFJTNDY2lyY2xlIGN4PScyMScgY3k9JzQ0JyByPSc1JyBmaWxsPSclMjMyQkQ0RjInLyUzRSUzQ2NpcmNsZSBjeD0nNDQnIGN5PSc0OCcgcj0nNScgZmlsbD0nJTIzMEU4RkIyJy8lM0UlM0Mvc3ZnJTNFIj4KPGxpbmsgcmVsPSJhcHBsZS10b3VjaC1pY29uIiBocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUxRQUFBQzBDQUlBQUFDeXI1RmxBQUFFYjBsRVFWUjRuTzNkd1hIVk1CU0ZZWWZKaWcwZE1NT2VEbWdwUmJ3aTBoSWRzS2VSTEZpSVNVenlqckV0V1RyMzZ2L1d6S0JuL2I3V09PSHg4UG5MMXdXNDU5UG9CY0FYY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUQyT1hzQXczMzcrMnYrSGYvLzRmdDFLYkQzTTh4VU1oMnJZTmtrcitlTm8yTVJIdVN0Skc4ZWxUWHlVc3BLRWNYVE9ZaTFaSXFuaUdKakZXcHBFa3NSaGtzVmFna1RDeDJHWXhWcm9SR0svQkRNdlk0bXd3ZzFSSjBlNGl4NXhoSVNjSE9IS1dHS3VPVjRjRWE5eUVXN2xrUjRyNFM2dUV1VVJFMlp5cENsamlmTlpZc1FSNVdydUYrSVRCWWdqeEhVOHdmOXp1Y2ZoZndWcm1IODY2d05waDJ2MzM3T2h3eHBHbWZFM3dRNXR4dm9QbTkvb3pmbE9qdVk3MGZBR2RWNWJRNlp4UlBtVnZpanJQTWZ4UUJyb2lqdFBvM3Bwenh6ZGJzVHlGeGx1YlQyN3lkSGtLdmNmMFUzK1JyZkN2TTRjOVZkbitKTTd3VWQ0WlRjNWFqaGNWb2MxdEdJVVIrVTk1N01ybFN2eGViZ1l4VkhEcDR6Q2JUM251TVJSYzd0NDdrVE5xa3lHaDBzY3AzbVdVVGl2YlErTE9FeHVGQ3NPMThRaWp0UDhiMDMvRlc0WUg4ZnBXeVRLZFQrOXp1SERZM3djc0JVMWppaGpvNGkxMmxlRDR6ZzNPU05lNjNOckh2dGtpVG81MEFGeFFCb1p4enpQbENMY2s0WEpBWWs0SUFXTEkrNHpwWWkxL21CeG9LZGhjUXgvTnh6SXFHdkY1SUFVS1k1WUQyd2wwS2VJRkFjNkl3NUl4QUdKT0NBUkJ5U3ZmdzRKSzB3T1NNUUJpVGdnRVFjazRvQkVISkNJQXhKeFFDSU9TTVFCaVRnZ0VRY2s0b0JFSEZzZWI4K2psekFTY1VpbGpKbjdJSTc3MWsxTTJ3ZHg3UEo0ZTU0d0VlSzRRM1V3V3gvRThkNTJBVlAxUVJ6LzJMUDM4L1JCSEcvMjcvb2tmZkRiNTMrZDIrK1gyMVB6bGZoZ2NsVEpQVUtJWTFucTlqaHhIOFRSWUhlejlqRjdISzMyTldVZkhFZ2I3MnVtSStyc2syTnB2WjJaUmdpVDQwM0RmYzB4UDVnY2J4cnVhSTc1RVd4eXZQdlN4U3UrZkkzNThTcE1IQnZmeGRrOEVZNm9SWXpIeXZhM3REYi9EbGVPcUVXQXliRno3M25FTk9jK09mWlBoU3UrQTNyeUk2cDdITU8xN1NOV0l0WnhIQjBHRjMyQi9MUkhFT3M0Zk16WkIzSHM5WEo3bXUwSVFoekhUTlVIY1J3Mnp4SFZPbzZqcnk2Ni9WY21reHhCck9Od05rTWZ2Q0d0bGZndGFvREpzV2ZYQi83ZldJbVBxQUVtUjlIenA3SW5wUHhCYnBnNGlnNi96M0Zhdmo2Q3hlRXYweEVrd0pramxreEhFT0pvTDAwZlBGYXVrdUFJd3VTNFNvSzNaRXlPeThVOW9qSTV3dWovWkNHT0dEaHo1RlMvcjZOZWVCQUhKT0xvb2ViV0gvaWVsRGc2T2JmSFk5K2dFMGMvUjNkNitNOVdlTTh4d0o0M0g4UExXSWhqdUx1aE9KU3g4RmdacnUwL2gybUxPQ3lzKy9CcGhUaGNsQ1o4eWxnNGMyQURrd01TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRaUFNU2NVQWlEa2pFQVlrNElCRUhKT0tBUkJ5UWlBTVNjVUFpRGtqRUFZazRJQkVISk9LQVJCeVFpQU1TY1VBaURrakVBWWs0SUJFSEpPS0FSQnlRL2dDU2tWZGk1QkJ4aGdBQUFBQkpSVTVFcmtKZ2dnPT0iPgo8dGl0bGU+5p6B5qC4IFpFRUhPIOmdouadvzwvdGl0bGU+CjxzdHlsZT4KLyogPT09PT09PT09PT09IHJlc2V0ICYgdG9rZW5zID09PT09PT09PT09PSAqLwoqe21hcmdpbjowO3BhZGRpbmc6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQo6cm9vdHsKICAtLWJnOiMwQTBGMUU7IC0tYmcyOiMwQzEzMjQ7CiAgLS1jYXJkOnJnYmEoMTQ2LDE3MCwyMDUsLjA1NSk7IC0tY2FyZDI6IzExMUEyRTsgLS1jYXJkMzojMEUxNjI4OwogIC0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7IC0tbGluZTI6cmdiYSgxNDYsMTcwLDIwNSwuMjIpOwogIC0tdHh0OiNFQUYxRkI7IC0tdHh0MjojOTNBMEI4OyAtLXR4dDM6IzVFNkU4ODsKICAtLWJyYW5kOiMyQkQ0RjI7IC0tYnJhbmQyOiMwRThGQjI7IC0tYnJhbmRTb2Z0OnJnYmEoNDMsMjEyLDI0MiwuMTMpOwogIC0tb2s6IzNEREM5NzsgLS1va1NvZnQ6cmdiYSg2MSwyMjAsMTUxLC4xNCk7CiAgLS13YXJuOiNGN0I5NTU7IC0td2FyblNvZnQ6cmdiYSgyNDcsMTg1LDg1LC4xNCk7CiAgLS1lcnI6I0Y5NzA2QTsgLS1lcnJTb2Z0OnJnYmEoMjQ5LDExMiwxMDYsLjE0KTsKICAtLXZpbzojQjdBNkZCOyAtLXZpb1NvZnQ6cmdiYSgxODMsMTY2LDI1MSwuMTQpOwogIC0tZ3JhZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyQkQ0RjIsIzBFOEZCMik7CiAgLS1ncmFkLXZpbzpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCNCN0E2RkIsIzdDNkJGMCk7CiAgLS1yLWxnOjIycHg7IC0tci1tZDoxNnB4OyAtLXItc206MTJweDsKICAtLXNwcmluZzpjdWJpYy1iZXppZXIoLjMyLDEuNCwuNDQsMSk7CiAgLS1lYXNlOmN1YmljLWJlemllciguNCwwLC4yLDEpOwogIC0tc2FmZS10OmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7CiAgLS1zYWZlLWI6ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KTsKfQoKLnZlaC1zd2l0Y2h7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjoxMnB4IDAgNHB4fS52ZWgtc3ctbGFiZWx7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXJpZ2h0OjJweH0udmVoLWNoaXB7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6NXB4IDExcHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXJ9LnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KLnNpZ25pbi1mYWJ7cG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTZweDtib3R0b206Y2FsYyg3OHB4ICsgdmFyKC0tc2FmZS1iKSk7ei1pbmRleDo5OTg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O3BhZGRpbmc6MTJweCAxOHB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouNXB4O2JveC1zaGFkb3c6MCA4cHggMjRweCByZ2JhKDE0LDE0MywxNzgsLjQ1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyksb3BhY2l0eSAuMnM7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQouc2lnbmluLWZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5zaWduaW4tZmFiLmJ1c3l7b3BhY2l0eTouNjtwb2ludGVyLWV2ZW50czpub25lfQouc2lnbmluLWZhYiBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweH0KCmh0bWwsYm9keXtoZWlnaHQ6MTAwJX0KYm9keXsKICBmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiUGluZ0ZhbmcgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsIlNlZ29lIFVJIixzYW5zLXNlcmlmOwogIGJhY2tncm91bmQ6dmFyKC0tYmcpOyBjb2xvcjp2YXIoLS10eHQpOyBmb250LXNpemU6MTVweDsgbGluZS1oZWlnaHQ6MS41OwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6YW50aWFsaWFzZWQ7IG92ZXJzY3JvbGwtYmVoYXZpb3IteTpub25lOwogIC13ZWJraXQtdGV4dC1zaXplLWFkanVzdDoxMDAlOwp9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9CmJ1dHRvbntmb250LWZhbWlseTppbmhlcml0O2NvbG9yOmluaGVyaXQ7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO2N1cnNvcjpwb2ludGVyO3RvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CmlucHV0LHNlbGVjdCx0ZXh0YXJlYXtmb250LWZhbWlseTppbmhlcml0O2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzoxMXB4IDEzcHg7Zm9udC1zaXplOjE1cHg7d2lkdGg6MTAwJTtvdXRsaW5lOm5vbmU7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzLGJveC1zaGFkb3cgLjJzOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2FwcGVhcmFuY2U6bm9uZX0KaW5wdXQ6Zm9jdXMsc2VsZWN0OmZvY3VzLHRleHRhcmVhOmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Ym94LXNoYWRvdzowIDAgMCAzcHggdmFyKC0tYnJhbmRTb2Z0KX0KaW5wdXQ6OnBsYWNlaG9sZGVyLHRleHRhcmVhOjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0Kc3Zne2Rpc3BsYXk6YmxvY2t9Cjo6c2VsZWN0aW9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KOjotd2Via2l0LXNjcm9sbGJhcnt3aWR0aDowO2hlaWdodDowfQoKLyogPT09PT09PT09PT09IGFwcCBzaGVsbCA9PT09PT09PT09PT0gKi8KI2FwcHttaW4taGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjJ9Ci5iZy1nbG93e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4OjE7CiAgYmFja2dyb3VuZDoKICAgIHJhZGlhbC1ncmFkaWVudCg1MiUgMzglIGF0IDEyJSAtNiUsIHJnYmEoNDMsMjEyLDI0MiwuMTQpLCB0cmFuc3BhcmVudCA2MiUpLAogICAgcmFkaWFsLWdyYWRpZW50KDQ2JSAzNCUgYXQgOTIlIDYlLCByZ2JhKDE0LDE0MywxNzgsLjEyKSwgdHJhbnNwYXJlbnQgNjIlKSwKICAgIHJhZGlhbC1ncmFkaWVudCg2MCUgNDAlIGF0IDUwJSAxMTAlLCByZ2JhKDEyNCwxMDcsMjQwLC4wOCksIHRyYW5zcGFyZW50IDY1JSk7Cn0KaGVhZGVyLmFwcC1oZWFkZXJ7CiAgcG9zaXRpb246c3RpY2t5O3RvcDowO3otaW5kZXg6NjA7CiAgcGFkZGluZzpjYWxjKDEycHggKyB2YXIoLS1zYWZlLXQpKSAxOHB4IDEycHg7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC43OCk7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyMnB4KSBzYXR1cmF0ZSgxLjUpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDIycHgpIHNhdHVyYXRlKDEuNSk7CiAgYm9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDkpOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7Cn0KLmJyYW5kLW1hcmt7d2lkdGg6MzhweDtoZWlnaHQ6MzhweDtib3JkZXItcmFkaXVzOjEycHg7ZmxleC1zaHJpbms6MDtvdmVyZmxvdzpoaWRkZW47Ym94LXNoYWRvdzowIDZweCAxOHB4IHJnYmEoMTQsMTQzLDE3OCwuMjgpfQouYnJhbmQtbWFyayBpbWd7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtkaXNwbGF5OmJsb2NrO29iamVjdC1maXQ6Y292ZXJ9Ci5icmFuZC10eHR7ZmxleDoxO21pbi13aWR0aDowfQouYnJhbmQtdHh0IGgxe2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouMnB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweH0KLmJyYW5kLXR4dCBwe2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4fQoKLmhlYWQtYWN0aW9uc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC1zaHJpbms6MH0KLmljb24tYnRue3dpZHRoOjM2cHg7aGVpZ2h0OjM2cHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE4cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGNvbG9yIC4yc30KLmljb24tYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouaWNvbi1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9Ci5pY29uLWJ0bi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQztib3JkZXI6bm9uZX0KLmNvdW50LWNoaXB7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2hlaWdodDozNnB4O3BhZGRpbmc6MCAxMnB4O2JvcmRlci1yYWRpdXM6MTFweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21pbi13aWR0aDo5NnB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjJzfQouY291bnQtY2hpcC5vbntib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC40KTtjb2xvcjp2YXIoLS1icmFuZCk7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQouY291bnQtcmluZ3t3aWR0aDoxNHB4O2hlaWdodDoxNHB4O3Bvc2l0aW9uOnJlbGF0aXZlO2ZsZXgtc2hyaW5rOjB9Ci5jb3VudC1yaW5nIHN2Z3t0cmFuc2Zvcm06cm90YXRlKC05MGRlZyk7d2lkdGg6MTRweDtoZWlnaHQ6MTRweH0KLmNvdW50LXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xOCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyfQouY291bnQtcmluZyAuYXJje3N0cm9rZTp2YXIoLS1icmFuZCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDoyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjVzIGxpbmVhcn0KCm1haW57ZmxleDoxO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTtwYWRkaW5nOjE0cHggMTZweCBjYWxjKDE1MHB4ICsgdmFyKC0tc2FmZS1iKSl9CgovKiA9PT09PT09PT09PT0gcHVsbCB0byByZWZyZXNoID09PT09PT09PT09PSAqLwoucHRyLXdyYXB7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufQoucHRyLWluZGljYXRvcntoZWlnaHQ6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7b3ZlcmZsb3c6aGlkZGVuO3RyYW5zaXRpb246aGVpZ2h0IC4zcyB2YXIoLS1lYXNlKTtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDB9Ci5wdHItaW5kaWNhdG9yIC5zcGlubmVye3dpZHRoOjIwcHg7aGVpZ2h0OjIwcHg7bWFyZ2luLXJpZ2h0OjhweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItdG9wLWNvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItcmFkaXVzOjUwJTthbmltYXRpb246c3BpbiAuOHMgbGluZWFyIGluZmluaXRlfQoucHRyLWluZGljYXRvci5wdWxsaW5nIC5zcGlubmVye2FuaW1hdGlvbjpub25lO2JvcmRlci10b3AtY29sb3I6dmFyKC0tYnJhbmQpfQpAa2V5ZnJhbWVzIHNwaW57dG97dHJhbnNmb3JtOnJvdGF0ZSgzNjBkZWcpfX0KCi8qID09PT09PT09PT09PSBoZXJvIHN1bW1hcnkgPT09PT09PT09PT09ICovCi5oZXJvewogIHBvc2l0aW9uOnJlbGF0aXZlO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7cGFkZGluZzoxOHB4IDE4cHggMTZweDttYXJnaW4tYm90dG9tOjE2cHg7b3ZlcmZsb3c6aGlkZGVuOwogIGJhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE2MGRlZyxyZ2JhKDQzLDIxMiwyNDIsLjE0KSxyZ2JhKDE0LDE0MywxNzgsLjA1KSA1NSUsdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpOwogIGJvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4xNik7Cn0KLmhlcm86OmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6LTYwcHg7dG9wOi03MHB4O3dpZHRoOjIyMHB4O2hlaWdodDoyMjBweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudChjaXJjbGUscmdiYSg0MywyMTIsMjQyLC4xNiksdHJhbnNwYXJlbnQgNjUlKTtwb2ludGVyLWV2ZW50czpub25lfQouaGVyby10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtZW5kO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMnB4fQouaGVyby1zY29yZSAubGJse2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDtsZXR0ZXItc3BhY2luZzoxcHh9Ci5oZXJvLXNjb3JlIC52YWx7Zm9udC1zaXplOjM4cHg7Zm9udC13ZWlnaHQ6OTAwO2xpbmUtaGVpZ2h0OjEuMTU7bGV0dGVyLXNwYWNpbmc6LS41cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTstd2Via2l0LWJhY2tncm91bmQtY2xpcDp0ZXh0O2JhY2tncm91bmQtY2xpcDp0ZXh0O2NvbG9yOnRyYW5zcGFyZW50O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5oZXJvLXNjb3JlIC52YWwgc21hbGx7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NzAwfQouaGVyby1yaWdodHt0ZXh0LWFsaWduOnJpZ2h0O2ZsZXgtc2hyaW5rOjB9Ci5oZXJvLXJpZ2h0IC5iaWd7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLW9rKX0KLmhlcm8tcmlnaHQgLmJpZyBzcGFue2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLmhlcm8tcmlnaHQgLnN1Yntmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjJweH0KLmhlcm8tc3RhdHN7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTRweH0KLmhzdGF0e2ZsZXg6MTtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6OXB4IDEycHh9Ci5oc3RhdCAudntmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLmhzdGF0IC5se2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MXB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmhzdGF0LmFtYmVyIC52e2NvbG9yOnZhcigtLXdhcm4pfSAuaHN0YXQuY3lhbiAudntjb2xvcjp2YXIoLS1icmFuZCl9IC5oc3RhdC5ncmVlbiAudntjb2xvcjp2YXIoLS1vayl9CgovKiA9PT09PT09PT09PT0gYnV0dG9ucyAmIGNoaXBzID09PT09PT09PT09PSAqLwouZmFiewogIHBvc2l0aW9uOmZpeGVkO3JpZ2h0OjE2cHg7Ym90dG9tOmNhbGMoMTAwcHggKyB2YXIoLS1zYWZlLWIpKTt6LWluZGV4OjUwOwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtoZWlnaHQ6NDZweDtwYWRkaW5nOjAgMTZweDtib3JkZXItcmFkaXVzOjIzcHg7CiAgYmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouM3B4OwogIGJveC1zaGFkb3c6MCAxMHB4IDI4cHggcmdiYSgxNCwxNDMsMTc4LC40NSksaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4zKTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMnMgdmFyKC0tc3ByaW5nKSxib3gtc2hhZG93IC4yczthbmltYXRpb246ZmFiLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGg7Cn0KLmZhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5mYWIgc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9CkBrZXlmcmFtZXMgZmFiLWlue2Zyb217dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMjRweCk7b3BhY2l0eTowfXRve3RyYW5zZm9ybTp0cmFuc2xhdGVZKDApO29wYWNpdHk6MX19Ci5idG57CiAgZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6NnB4O2hlaWdodDo0MHB4O3BhZGRpbmc6MCAxOHB4O2JvcmRlci1yYWRpdXM6MTNweDsKICBmb250LXNpemU6MTRweDtmb250LXdlaWdodDo3MDA7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLXR4dCk7CiAgdHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnM7Cn0KLmJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Nil9Ci5idG4ucHJpbWFyeXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2NvbG9yOiMwNDEyMUM7Ym9yZGVyOm5vbmV9Ci5idG4uZ2hvc3R7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS10eHQyKX0KLmJ0bi5kYW5nZXJ7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCl9Ci5idG4uc217aGVpZ2h0OjMycHg7cGFkZGluZzowIDEycHg7Zm9udC1zaXplOjEycHg7Ym9yZGVyLXJhZGl1czoxMHB4fQouYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmNoaXB7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgMTJweDtib3JkZXItcmFkaXVzOjE1cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKTt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTZzIHZhcigtLXNwcmluZyl9Ci5jaGlwOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLmNoaXAub257YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jaGlwIC5kb3R7d2lkdGg6NnB4O2hlaWdodDo2cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpjdXJyZW50Q29sb3J9Ci5waWxse2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo1cHg7aGVpZ2h0OjI0cHg7cGFkZGluZzowIDEwcHg7Ym9yZGVyLXJhZGl1czoxMnB4O2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMDtmbGV4LXNocmluazowfQoucGlsbC5va3tiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoucGlsbC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLnBpbGwuY3lhbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpfQoucGlsbC5ncmF5e2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTIpO2NvbG9yOnZhcigtLXR4dDIpfQoucGlsbC52aW97YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQoucGlsbC5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm5Tb2Z0KTtjb2xvcjp2YXIoLS13YXJuKX0KCi8qID09PT09PT09PT09PSBhY2NvdW50IGNhcmRzID09PT09PT09PT09PSAqLwouc2VjdGlvbi10aXRsZXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo0cHggMnB4IDEycHg7bGV0dGVyLXNwYWNpbmc6LjVweH0KLnNlY3Rpb24tdGl0bGUgc3Zne3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHg7Y29sb3I6dmFyKC0tYnJhbmQpfQouYWNjLWNhcmR7CiAgcG9zaXRpb246cmVsYXRpdmU7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtwYWRkaW5nOjE2cHg7bWFyZ2luLWJvdHRvbToxNHB4O292ZXJmbG93OmhpZGRlbjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgxNDYsMTcwLDIwNSwuMDYpLHJnYmEoMTQ2LDE3MCwyMDUsLjAzKSksdmFyKC0tY2FyZCk7CiAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMnMgdmFyKC0tZWFzZSk7Cn0KLyog5YWl5Zy65Yqo55S75Y+q5Zyo6aaW5qyh5riy5p+T5pKt5pS+77yM6YG/5YWN6Ieq5Yqo5Yi35paw6YeN5bu65Y2h54mH5pe25pW05bGP6YeN6ZeqICovCi5hY2MtY2FyZC5hbmltLWlue2FuaW1hdGlvbjpjYXJkLWluIC40NXMgdmFyKC0tZWFzZSkgYm90aH0KLmFjYy1jYXJkLmVycm9ye2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC40KTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgyNDksMTEyLDEwNiwuMDcpLHRyYW5zcGFyZW50KSx2YXIoLS1jYXJkKX0KQGtleWZyYW1lcyBjYXJkLWlue2Zyb217b3BhY2l0eTowO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDE0cHgpfXRve29wYWNpdHk6MTt0cmFuc2Zvcm06dHJhbnNsYXRlWSgwKX19Ci8qID09PT09PT09PT09PSB2Mi4xNC4xNCDpppbpobXljaHniYfvvIjlm74z6aOO5qC877yJID09PT09PT09PT09PSAqLwouaG9tZS1jYXJke3BhZGRpbmc6MTZweCAxNnB4IDE0cHh9Ci5oYy11cGR7cG9zaXRpb246YWJzb2x1dGU7dG9wOjEycHg7cmlnaHQ6MTRweDtmb250LXNpemU6MTAuNXB4O2NvbG9yOnZhcigtLXR4dDMpfQouaGMtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDttYXJnaW4tYm90dG9tOjJweH0KLmhjLW5hbWV7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOi4zcHh9Ci5oYy1iYWRnZXtmb250LXNpemU6MTAuNXB4O2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nOjNweCA5cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKX0KLmhjLWJhZGdlLm9ue2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tb2spfQouaGMtYmFkZ2UuZXJye2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLWNvbG9yOnRyYW5zcGFyZW50O2NvbG9yOnZhcigtLWVycil9Ci5oYy1iYWRnZS5jaGd7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5oYy1tb2RlbHtmb250LXNpemU6MTEuNXB4O2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1ib3R0b206MTBweH0KLmhjLW1pZHtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbjo2cHggMCAxMHB4fQouaGMtbGVmdHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5oYy1iaWd7Zm9udC1zaXplOjM4cHg7Zm9udC13ZWlnaHQ6OTAwO2xpbmUtaGVpZ2h0OjEuMTtsZXR0ZXItc3BhY2luZzotMXB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpiYXNlbGluZTtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwfQouaGMta217Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dCl9Ci5oYy12e2ZvbnQtc2l6ZToxOXB4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmhjLWJhcntoZWlnaHQ6OXB4O2JvcmRlci1yYWRpdXM6NnB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTYpO292ZXJmbG93OmhpZGRlbjttYXJnaW46OHB4IDAgMTBweH0KLmhjLWZpbGx7aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo2cHg7dHJhbnNpdGlvbjp3aWR0aCAuN3MgdmFyKC0tZWFzZSl9Ci5oYy1yb3dze2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjNweH0KLmhjLXJvd3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo2MDB9Ci5oYy1pbWd7d2lkdGg6MTE4cHg7aGVpZ2h0Ojk2cHg7ZmxleC1zaHJpbms6MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oYy1pbWcgaW1ne21heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6MTAwJTtvYmplY3QtZml0OmNvbnRhaW47ZmlsdGVyOmRyb3Atc2hhZG93KDAgNnB4IDE0cHggcmdiYSgwLDAsMCwuMzUpKX0KLmhjLWltZyBpbWcrc3Zne2Rpc3BsYXk6bm9uZX0KLmhjLWltZyBzdmd7d2lkdGg6NzJweDtoZWlnaHQ6NzJweH0KLyogPT09PT09PT09PT09IHYyLjE2LjU1IOWFqOWxj+Wjgee6uCA9PT09PT09PT09PT0gKi8KI3dhbGxMYXllcntwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6MDtwb2ludGVyLWV2ZW50czpub25lO292ZXJmbG93OmhpZGRlbjtvcGFjaXR5OjA7dHJhbnNpdGlvbjpvcGFjaXR5IC4zNXMgdmFyKC0tZWFzZSl9CiN3YWxsTGF5ZXIub257b3BhY2l0eToxfQojd2FsbEltZ3twb3NpdGlvbjphYnNvbHV0ZTtpbnNldDotMzBweDtiYWNrZ3JvdW5kLXNpemU6Y292ZXI7YmFja2dyb3VuZC1wb3NpdGlvbjpjZW50ZXI7YmFja2dyb3VuZC1yZXBlYXQ6bm8tcmVwZWF0O2ZpbHRlcjpibHVyKHZhcigtLXdwLWJsdXIsMHB4KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVooMCl9CiN3YWxsU2NyaW17cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtiYWNrZ3JvdW5kOnJnYmEoNSw4LDE2LC4zNCl9CmJvZHkuaGFzLXdhbGx7YmFja2dyb3VuZDojMDUwODBGfQpib2R5Lmhhcy13YWxsIC5iZy1nbG93e29wYWNpdHk6LjU1fQovKiA9PT09PT09PT09PT0gdjIuMTYuNTUgM0Qg6L2m5qihID09PT09PT09PT09PSAqLwouZzNke3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1ib3R0b206MTRweDtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO292ZXJmbG93OmhpZGRlbjtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpOwogIGJhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KDEyMCUgOTAlIGF0IDUwJSA2JSxyZ2JhKDQzLDIxMiwyNDIsLjE0KSxyZ2JhKDEwLDE1LDMwLDApIDYyJSksbGluZWFyLWdyYWRpZW50KDE4MGRlZywjMEMxNTI2LCMwODBEMTgpOwogIGJveC1zaGFkb3c6MCAxNnB4IDM2cHggcmdiYSgwLDAsMCwuMzApfQouZzNkIGNhbnZhc3tkaXNwbGF5OmJsb2NrO3dpZHRoOjEwMCU7aGVpZ2h0OjIyOHB4O3RvdWNoLWFjdGlvbjpwYW4teTtjdXJzb3I6Z3JhYn0KLmczZCBjYW52YXM6YWN0aXZle2N1cnNvcjpncmFiYmluZ30KLmczZC1odWR7cG9zaXRpb246YWJzb2x1dGU7bGVmdDoxNXB4O3RvcDoxM3B4O3JpZ2h0OjE1cHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtc3RhcnQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cG9pbnRlci1ldmVudHM6bm9uZX0KLmczZC1uYW1le2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDtsZXR0ZXItc3BhY2luZzouM3B4O21heC13aWR0aDoxOTBweDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5nM2Qtc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi10b3A6MnB4fQouZzNkLXNvY3t0ZXh0LWFsaWduOnJpZ2h0O2ZsZXgtc2hyaW5rOjB9Ci5nM2Qtc29jIGJ7Zm9udC1zaXplOjI3cHg7Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOi0xcHg7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouZzNkLXNvYyBzcGFue2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tdG9wOjFweH0KLmczZC1jaGlwc3twb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjE1cHg7Ym90dG9tOjEycHg7ZGlzcGxheTpmbGV4O2dhcDo2cHg7cG9pbnRlci1ldmVudHM6bm9uZTtmbGV4LXdyYXA6d3JhcH0KLmczZC1jaGlwe2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nOjNweCA4cHg7Ym9yZGVyLXJhZGl1czo3cHg7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtjb2xvcjp2YXIoLS10eHQyKX0KLmczZC1jaGlwLm9re2NvbG9yOnZhcigtLW9rKTtib3JkZXItY29sb3I6cmdiYSg2MSwyMjAsMTUxLC4zMik7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjEwKX0KLmczZC1jaGlwLndhcm57Y29sb3I6dmFyKC0td2Fybik7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ3LDE4NSw4NSwuMzIpO2JhY2tncm91bmQ6cmdiYSgyNDcsMTg1LDg1LC4xMCl9Ci5nM2QtY2hpcC5lcnJ7Y29sb3I6dmFyKC0tZXJyKTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMzIpO2JhY2tncm91bmQ6cmdiYSgyNDksMTEyLDEwNiwuMTApfQouZzNkLXRpcHtwb3NpdGlvbjphYnNvbHV0ZTtyaWdodDoxNXB4O2JvdHRvbToxMnB4O2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci8qID09PT09PT09PT09PSB2Mi4xNi41NSDlpJbop4Lorr7nva4gPT09PT09PT09PT09ICovCi53cC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXA7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi10b3A6MTBweH0KLndwLWNoaXB7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NjAwO3BhZGRpbmc6N3B4IDEycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2NvbG9yOnZhcigtLXR4dDIpO2N1cnNvcjpwb2ludGVyO3RyYW5zaXRpb246Ym9yZGVyLWNvbG9yIC4xOHMsY29sb3IgLjE4cyxiYWNrZ3JvdW5kIC4xOHN9Ci53cC1jaGlwLm9ue2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KLndwLXByZXZpZXd7d2lkdGg6MTE4cHg7aGVpZ2h0Ojc2cHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7YmFja2dyb3VuZC1zaXplOmNvdmVyO2JhY2tncm91bmQtcG9zaXRpb246Y2VudGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTAuNXB4O292ZXJmbG93OmhpZGRlbjtmbGV4LXNocmluazowfQoud3Atc2xpZGVye2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7bWFyZ2luLXRvcDo2cHh9Ci53cC1zbGlkZXI+c3BhbjpmaXJzdC1jaGlsZHtmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTt3aWR0aDozMHB4O2ZsZXgtc2hyaW5rOjB9Ci53cC1zbGlkZXIgaW5wdXRbdHlwZT1yYW5nZV17ZmxleDoxO3BhZGRpbmc6MDtib3JkZXI6bm9uZTtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O2JveC1zaGFkb3c6bm9uZTstd2Via2l0LWFwcGVhcmFuY2U6YXV0bzthcHBlYXJhbmNlOmF1dG99Ci53cC1zbGlkZXIgLnZ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7d2lkdGg6NDBweDt0ZXh0LWFsaWduOnJpZ2h0O2ZsZXgtc2hyaW5rOjA7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouaGMtYm90dG9te2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7cGFkZGluZy10b3A6MTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDo2cHh9Ci5oYy1zY29yZXtkaXNwbGF5OmZsZXg7Z2FwOjEycHg7YWxpZ24taXRlbXM6YmFzZWxpbmU7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtd3JhcDp3cmFwfQouaGMtc2NvcmUgLnNpZ25lZHtjb2xvcjp2YXIoLS1vayl9Ci8qIOWFheeUteS4re+8muaVtOW8oOWNoeeJh+a1geWFie+8iOWNoemdouS9jumAj+aYjuW6pua4kOWPmOa1geWKqCArIOi+uee8mOaPj+i+uea1geWFie+8iSAqLwouaG9tZS1jYXJkLmNoYXJnaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MDtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yOCl9Ci5ob21lLWNhcmQuY2hhcmdpbmc6OmJlZm9yZXtjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ei1pbmRleDotMTtib3JkZXItcmFkaXVzOmluaGVyaXQ7cG9pbnRlci1ldmVudHM6bm9uZTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMTVkZWcscmdiYSg0MywyMTIsMjQyLDApIDAlLHJnYmEoNDMsMjEyLDI0MiwuMTApIDIyJSxyZ2JhKDYxLDIyMCwxNTEsLjIwKSA0MiUscmdiYSg0MywyMTIsMjQyLC4xMCkgNjIlLHJnYmEoNDMsMjEyLDI0MiwwKSAxMDAlKTtiYWNrZ3JvdW5kLXNpemU6MjIwJSAyMjAlO2FuaW1hdGlvbjpoYy1mbG93IDMuNHMgbGluZWFyIGluZmluaXRlfQouaG9tZS1jYXJkLmNoYXJnaW5nOjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7Ym9yZGVyLXJhZGl1czppbmhlcml0O3BhZGRpbmc6MXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSg0MywyMTIsMjQyLDApLCMyQkQ0RjIsIzNEREM5NyxyZ2JhKDQzLDIxMiwyNDIsMCkpO2JhY2tncm91bmQtc2l6ZTozMDAlIDEwMCU7LXdlYmtpdC1tYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTstd2Via2l0LW1hc2stY29tcG9zaXRlOnhvcjttYXNrOmxpbmVhci1ncmFkaWVudCgjMDAwIDAgMCkgY29udGVudC1ib3gsbGluZWFyLWdyYWRpZW50KCMwMDAgMCAwKTttYXNrLWNvbXBvc2l0ZTpleGNsdWRlO2FuaW1hdGlvbjpoYy1ydW4gMi40cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgaGMtZmxvd3tmcm9te2JhY2tncm91bmQtcG9zaXRpb246MCUgMH10b3tiYWNrZ3JvdW5kLXBvc2l0aW9uOjIyMCUgMH19CkBrZXlmcmFtZXMgaGMtcnVue2Zyb217YmFja2dyb3VuZC1wb3NpdGlvbjowJSAwfXRve2JhY2tncm91bmQtcG9zaXRpb246MzAwJSAwfX0KLmhjLXNjb3JlIGJ7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweH0KLmhjLXNjb3JlIC5wbHVze2NvbG9yOnZhcigtLWJyYW5kKX0KLmhjLXNjb3JlIC5zdHJlYWt7Y29sb3I6dmFyKC0tZXJyKX0KLmFjYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7bWFyZ2luLWJvdHRvbToxNHB4fQouYXZhdGFye3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQtd2VpZ2h0OjkwMDtmb250LXNpemU6MTdweDtjb2xvcjojMDQxMjFDO2ZsZXgtc2hyaW5rOjA7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTQsMTQzLDE3OCwuMyl9Ci5hdmF0YXIudmlve2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO2NvbG9yOiMxNDBGMkU7Ym94LXNoYWRvdzowIDRweCAxNHB4IHJnYmEoMTI0LDEwNywyNDAsLjMpfQouYWNjLWluZm97ZmxleDoxO21pbi13aWR0aDowfQouYWNjLW5hbWV7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLmFjYy1zdWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLFNGTW9uby1SZWd1bGFyLE1lbmxvLG1vbm9zcGFjZX0KLmFjYy1hY3Rpb25ze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDtmbGV4LXNocmluazowfQouYWNjLWVycntmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6OHB4IDExcHg7bWFyZ2luLWJvdHRvbToxMnB4O2ZvbnQtd2VpZ2h0OjYwMH0KLmtwaS1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206MTRweH0KLmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjlweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5rcGkgLnZ7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSI7bGluZS1oZWlnaHQ6MS4yfQoua3BpIC5se2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLXRvcDoycHh9Ci5rcGkuYzEgLnZ7Y29sb3I6dmFyKC0tdHh0KX0gLmtwaS5jMiAudntjb2xvcjp2YXIoLS1vayl9IC5rcGkuYzMgLnZ7Y29sb3I6dmFyKC0tYnJhbmQpfSAua3BpLmM0IC52e2NvbG9yOnZhcigtLXZpbyl9Ci5ibGluZHttYXJnaW4tYm90dG9tOjE0cHh9Ci5ibGluZC10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5ibGluZC10b3AgLnJ7Y29sb3I6dmFyKC0tdmlvKTtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQouYmxpbmQtYmFye2hlaWdodDoxNHB4O2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7b3ZlcmZsb3c6aGlkZGVuO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5ibGluZC1maWxse2hlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6dmFyKC0tZ3JhZC12aW8pO3RyYW5zaXRpb246d2lkdGggLjdzIHZhcigtLWVhc2UpO2JveC1zaGFkb3c6MCAwIDEycHggcmdiYSgxMjQsMTA3LDI0MCwuNSl9Ci53ZWVre21hcmdpbi1ib3R0b206NHB4fQoud2Vlay10b3B7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWJvdHRvbTo3cHh9Ci53ZWVrLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNywxZnIpO2dhcDo1cHh9Ci5kYXl7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MXB4O2JhY2tncm91bmQ6cmdiYSgxMCwxNSwzMCwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmRheSAuZHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtsaW5lLWhlaWdodDoxfQouZGF5IC5te2ZvbnQtc2l6ZTo4cHg7bGluZS1oZWlnaHQ6MX0KLmRheS5va3tiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnJnYmEoNDMsMjEyLDI0MiwuMzUpfQouZGF5Lm9rIC5ke2NvbG9yOnZhcigtLWJyYW5kKX0KLmRheS50b2RheXtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2JvcmRlcjpub25lO2JveC1zaGFkb3c6MCA0cHggMTJweCByZ2JhKDE0LDE0MywxNzgsLjQpfQouZGF5LnRvZGF5IC5ke2NvbG9yOiMwNDEyMUN9Ci5kYXkudG9kYXkgLm17Y29sb3I6cmdiYSg0LDE4LDI4LC43KX0KCi8qID09PT09PT09PT09PSB2ZWhpY2xlIHNlY3Rpb24gPT09PT09PT09PT09ICovCi52ZWhpY2xlewogIG1hcmdpbi10b3A6MTRweDtwYWRkaW5nLXRvcDoxNHB4O2JvcmRlci10b3A6MXB4IGRhc2hlZCB2YXIoLS1saW5lMik7Y3Vyc29yOnBvaW50ZXI7Cn0KLnZlaGljbGUtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEycHg7bWFyZ2luLWJvdHRvbToxM3B4fQoudmVoaWNsZS1yaW5ne3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjc0cHg7aGVpZ2h0Ojc0cHg7ZmxleC1zaHJpbms6MH0KLnZlaGljbGUtcmluZyBzdmd7d2lkdGg6NzRweDtoZWlnaHQ6NzRweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci52ZWhpY2xlLXJpbmcgLnRyYWNre3N0cm9rZTpyZ2JhKDE0NiwxNzAsMjA1LC4xNCk7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1fQoudmVoaWNsZS1yaW5nIC5hcmN7ZmlsbDpub25lO3N0cm9rZS13aWR0aDo1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjhzIHZhcigtLWVhc2UpLHN0cm9rZSAuNXN9Ci52ZWhpY2xlLXJpbmcgLnBjdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTdweDtmb250LXdlaWdodDo5MDA7Zm9udC1mZWF0dXJlLXNldHRpbmdzOiJ0bnVtIn0KLnZlaGljbGUtbWV0YXtmbGV4OjE7bWluLXdpZHRoOjB9Ci52ZWhpY2xlLW5hbWV7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtdmlue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxTRk1vbm8tUmVndWxhcixNZW5sbyxtb25vc3BhY2V9Ci52aW4tc2hvd3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO21hcmdpbi1sZWZ0OjRweDtwYWRkaW5nOjFweCA2cHg7Ym9yZGVyLXJhZGl1czo1cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoudmVoaWNsZS1iYWRnZXN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7bWFyZ2luLXRvcDo3cHg7ZmxleC13cmFwOndyYXB9Ci52c3RhdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luLWJvdHRvbToxMnB4fQoudnN0YXR7ZGlzcGxheTppbmxpbmUtZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwfQoudnN0YXQgc3Zne3dpZHRoOjEycHg7aGVpZ2h0OjEycHh9Ci52c3RhdC5vbntiYWNrZ3JvdW5kOnZhcigtLW9rU29mdCk7Y29sb3I6dmFyKC0tb2spfQoudnN0YXQub2Zme2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci52c3RhdC5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtjb2xvcjp2YXIoLS1lcnIpfQoudnN0YXQudW5sb2NrZWR7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2NvbG9yOnZhcigtLW9rKX0KLnZzdGF0LnNlYXR7YmFja2dyb3VuZDp2YXIoLS12aW9Tb2Z0KTtjb2xvcjp2YXIoLS12aW8pfQouY2hhcmdlLWJhbm5lcntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6OXB4IDEycHg7bWFyZ2luLWJvdHRvbToxMnB4fQouY2hhcmdlLWJhbm5lciBzdmd7d2lkdGg6MTVweDtoZWlnaHQ6MTVweDtjb2xvcjp2YXIoLS1vayk7ZmxleC1zaHJpbms6MH0KLmNoYXJnZS1iYW5uZXIgLmN0e2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5jaGFyZ2UtYmFubmVyIC5jZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1vayk7b3BhY2l0eTouODU7bWFyZ2luLWxlZnQ6YXV0bztiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTUpO3BhZGRpbmc6MnB4IDlweDtib3JkZXItcmFkaXVzOjEwcHh9Ci52a3BpLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7bWFyZ2luLWJvdHRvbToxMnB4fQoudmtwaXtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjhweCAycHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52a3BpIC52e2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LWZlYXR1cmUtc2V0dGluZ3M6InRudW0ifQoudmtwaSAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMDttYXJnaW4tdG9wOjJweH0KLmJhdHQtdHJhY2t7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjVweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tYm90dG9tOjEycHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJhdHQtZmlsbHtoZWlnaHQ6MTAwJTtib3JkZXItcmFkaXVzOjVweDt0cmFuc2l0aW9uOndpZHRoIC44cyB2YXIoLS1lYXNlKSxiYWNrZ3JvdW5kIC41cztib3gtc2hhZG93OjAgMCAxMHB4IGN1cnJlbnRDb2xvcn0KLm1ldGEtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206NnB4fQoubWV0YS1pdGVte2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo2cHg7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjlweDtwYWRkaW5nOjVweCA5cHg7Zm9udC13ZWlnaHQ6NjAwfQoubWV0YS1pdGVtIHN2Z3t3aWR0aDoxMnB4O2hlaWdodDoxMnB4O2NvbG9yOnZhcigtLWJyYW5kKX0KLm1ldGEtaXRlbSBie2NvbG9yOnZhcigtLXR4dCl9Ci52ZWhpY2xlLWFkZHJ7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21hcmdpbi10b3A6NHB4O21hcmdpbi1ib3R0b206MTBweDtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKX0KLnZlaGljbGUtYWRkciAuYXR7ZmxleDoxO21pbi13aWR0aDowO3doaXRlLXNwYWNlOm5vd3JhcDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpc30KLnZlaGljbGUtYWRkciBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS13YXJuKTtmbGV4LXNocmluazowfQoubWFwLWJ0bntoZWlnaHQ6MjZweDtwYWRkaW5nOjAgMTFweDtib3JkZXItcmFkaXVzOjEzcHg7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtjb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2ZsZXgtc2hyaW5rOjA7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpfQoubWFwLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5tYXAtYnRuOmRpc2FibGVke29wYWNpdHk6LjQ1O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5jdHJsLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNSwxZnIpO2dhcDo2cHg7Ym9yZGVyLXRvcDoxcHggZGFzaGVkIHZhcigtLWxpbmUyKTtwYWRkaW5nLXRvcDoxMnB4fQouY3RybC1idG57ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtwYWRkaW5nOjEwcHggMnB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyB2YXIoLS1zcHJpbmcpLGJhY2tncm91bmQgLjJzLGJvcmRlci1jb2xvciAuMnMsY29sb3IgLjJzfQouY3RybC1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHg7Y29sb3I6dmFyKC0tdHh0Mik7dHJhbnNpdGlvbjpjb2xvciAuMnN9Ci5jdHJsLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Ci5jdHJsLWJ0bi51bmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoNjEsMjIwLDE1MSwuMyk7Y29sb3I6dmFyKC0tb2spfQouY3RybC1idG4udW5sb2NrIHN2Z3tjb2xvcjp2YXIoLS1vayl9Ci5jdHJsLWJ0bi5sb2Nre2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4zKTtjb2xvcjp2YXIoLS1lcnIpfQouY3RybC1idG4ubG9jayBzdmd7Y29sb3I6dmFyKC0tZXJyKX0KLmN0cmwtYnRuOmRpc2FibGVke29wYWNpdHk6LjU7cG9pbnRlci1ldmVudHM6bm9uZX0KLmN0cmwtYnRuLmJ1c3kgc3Zne2FuaW1hdGlvbjpzcGluIC44cyBsaW5lYXIgaW5maW5pdGV9Ci5uby12ZWhpY2xle3BhZGRpbmc6MTRweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS13YXJuU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI0NywxODUsODUsLjI1KTtjb2xvcjp2YXIoLS13YXJuKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7dGV4dC1hbGlnbjpjZW50ZXJ9CgovKiA9PT09PT09PT09PT0gZW1wdHkgJiBza2VsZXRvbiA9PT09PT09PT09PT0gKi8KLmVtcHR5e3BhZGRpbmc6NzBweCAyNnB4O3RleHQtYWxpZ246Y2VudGVyO2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQouZW1wdHkgLmUtaWNvbnt3aWR0aDo3NHB4O2hlaWdodDo3NHB4O21hcmdpbjowIGF1dG8gMThweDtib3JkZXItcmFkaXVzOjI0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKX0KLmVtcHR5IC5lLWljb24gc3Zne3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHh9Ci5lbXB0eSBoM3tmb250LXNpemU6MTdweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5lbXB0eSBwe2ZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDIpO2xpbmUtaGVpZ2h0OjEuNzttYXgtd2lkdGg6MzAwcHg7bWFyZ2luOjAgYXV0byAyMHB4fQouc2t7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTAwZGVnLHJnYmEoMTQ2LDE3MCwyMDUsLjA2KSA0MCUscmdiYSgxNDYsMTcwLDIwNSwuMTIpIDUwJSxyZ2JhKDE0NiwxNzAsMjA1LC4wNikgNjAlKTtiYWNrZ3JvdW5kLXNpemU6MjAwJSAxMDAlO2FuaW1hdGlvbjpzayAxLjJzIGxpbmVhciBpbmZpbml0ZTtib3JkZXItcmFkaXVzOjEwcHh9CkBrZXlmcmFtZXMgc2t7dG97YmFja2dyb3VuZC1wb3NpdGlvbjotMjAwJSAwfX0KLnNrLWNhcmR7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO3BhZGRpbmc6MTZweDttYXJnaW4tYm90dG9tOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKX0KLnNrLWxpbmV7aGVpZ2h0OjEzcHg7bWFyZ2luLWJvdHRvbToxMHB4fS5zay1saW5lLnc0MHt3aWR0aDo0MCV9LnNrLWxpbmUudzYwe3dpZHRoOjYwJX0uc2stbGluZS53ODB7d2lkdGg6ODAlfQouc2stcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsMWZyKTtnYXA6OHB4O21hcmdpbjoxNHB4IDB9Ci5zay1jZWxse2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTJweH0KLnNrLWJhcntoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjhweDttYXJnaW4tdG9wOjEycHh9CgovKiA9PT09PT09PT09PT0gbG9ncyA9PT09PT09PT09PT0gKi8KLmxvZy1wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLWxnKTtvdmVyZmxvdzpoaWRkZW47YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6MTRweCAxNnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoubG9nLWhlYWQgaDN7Zm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmxvZy1oZWFkIGgzIHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2NvbG9yOnZhcigtLXZpbyl9Ci5sb2ctZmlsdGVyc3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmxvZy1saXN0e21heC1oZWlnaHQ6Y2FsYygxMDB2aCAtIDI2MHB4KTtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2h9Ci5sb2ctaXRlbXtwYWRkaW5nOjEycHggMTZweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLWVhc2UpIGJvdGh9Ci5sb2ctaXRlbTpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxvZy10aW1le2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtZmVhdHVyZS1zZXR0aW5nczoidG51bSJ9Ci5sb2ctbWFpbntkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7ZmxleC13cmFwOndyYXA7Zm9udC1zaXplOjEzcHh9Ci5sb2ctdXNlcntmb250LXdlaWdodDo4MDB9Ci5sb2ctcmVze2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayl9Ci5sb2ctcmVzLmVycntjb2xvcjp2YXIoLS1lcnIpfQoubG9nLXN0ZXBze21hcmdpbi10b3A6NnB4O2ZvbnQtc2l6ZToxMS41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O3BhZGRpbmctbGVmdDoycHh9Ci5sb2ctc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLmxvZy1lbXB0eXtwYWRkaW5nOjUwcHggMjBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweH0KCi8qID09PT09PT09PT09PSBjb25maWcgPT09PT09PT09PT09ICovCi5jZmctcGFuZWx7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6dmFyKC0tci1sZyk7bWFyZ2luLWJvdHRvbToxNnB4O292ZXJmbG93OmhpZGRlbjthbmltYXRpb246Y2FyZC1pbiAuNHMgdmFyKC0tZWFzZSkgYm90aH0KLmNmZy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7cGFkZGluZzoxNXB4IDE2cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSl9Ci5jZmctaGVhZCBoM3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4fQouY2ZnLWhlYWQgaDMgc3Zne3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHh9Ci5jZmctaGVhZCAuYmFye3dpZHRoOjNweDtoZWlnaHQ6MTVweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtmbGV4LXNocmluazowfQouY2ZnLWhlYWQgLmJhci5hbWJlcntiYWNrZ3JvdW5kOnZhcigtLXdhcm4pfSAuY2ZnLWhlYWQgLmJhci5ncmVlbntiYWNrZ3JvdW5kOnZhcigtLW9rKX0gLmNmZy1oZWFkIC5iYXIudmlve2JhY2tncm91bmQ6dmFyKC0tdmlvKX0KLmNmZy1ib2R5e3BhZGRpbmc6MTZweH0KLmZvcm0tZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHh9Ci5mLWl0ZW17bWluLXdpZHRoOjB9Ci5mLWl0ZW0uZnVsbHtncmlkLWNvbHVtbjoxLy0xfQouZi1pdGVtIGxhYmVse2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NnB4fQouZi1pdGVtIC5oaW50e2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDo1cHg7bGluZS1oZWlnaHQ6MS42fQouZi1pdGVtIC5oaW50IGNvZGV7YmFja2dyb3VuZDpyZ2JhKDE0NiwxNzAsMjA1LC4xMik7cGFkZGluZzoxcHggNXB4O2JvcmRlci1yYWRpdXM6NXB4O2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2V9Ci5zd2l0Y2h7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjEwcHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtjdXJzb3I6cG9pbnRlcjt0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMnN9Ci5zd2l0Y2g6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTgpfQouc3dpdGNoIC5sYmx7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo2MDA7ZmxleDoxfQouc3dpdGNoIC5zY3tmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLnN3e3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjQ0cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czoxM3B4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yNXMgdmFyKC0tZWFzZSk7ZmxleC1zaHJpbms6MH0KLnN3OjphZnRlcntjb250ZW50OicnO3Bvc2l0aW9uOmFic29sdXRlO3RvcDoycHg7bGVmdDoycHg7d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjI1cyB2YXIoLS1zcHJpbmcpO2JveC1zaGFkb3c6MCAycHggNnB4IHJnYmEoMCwwLDAsLjM1KX0KLnN3aXRjaCBpbnB1dHtkaXNwbGF5Om5vbmV9Ci5zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc3d7YmFja2dyb3VuZDp2YXIoLS1ncmFkKX0KLnN3aXRjaCBpbnB1dDpjaGVja2VkKy5zdzo6YWZ0ZXJ7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMThweCl9Ci5hY2MtZWRpdHtiYWNrZ3JvdW5kOnJnYmEoMTAsMTUsMzAsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTRweDttYXJnaW4tYm90dG9tOjEycHh9Ci5hY2MtZWRpdC1oZWFke2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLWJvdHRvbToxMnB4fQouYWNjLWVkaXQtdGl0bGV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweH0KLmFjYy1lZGl0LXRpdGxlIC5ue3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2NvbG9yOnZhcigtLWJyYW5kKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6OTAwfQouYWNjLWVkaXQtaGVhZCAuYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjZweH0KLmJ0bi1yb3d7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi10b3A6MTZweDtmbGV4LXdyYXA6d3JhcH0KLmJ0bi1yb3cgLmJ0bntmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQouY2ZnLW5vdGV7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7cGFkZGluZzoxMnB4IDE0cHg7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjA3KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ3LDE4NSw4NSwuMTgpO2JvcmRlci1yYWRpdXM6MTJweDttYXJnaW4tdG9wOjEycHh9Ci5jZmctbm90ZSBie2NvbG9yOnZhcigtLXdhcm4pfQoKLyogPT09PT09PT09PT09IHRhYmJhciA9PT09PT09PT09PT0gKi8KbmF2LnRhYmJhcnsKICBwb3NpdGlvbjpmaXhlZDtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDt6LWluZGV4OjYwOwogIGRpc3BsYXk6ZmxleDtwYWRkaW5nOjhweCAxMHB4IGNhbGMoOHB4ICsgdmFyKC0tc2FmZS1iKSk7CiAgYmFja2dyb3VuZDpyZ2JhKDEwLDE1LDMwLC44Mik7LXdlYmtpdC1iYWNrZHJvcC1maWx0ZXI6Ymx1cigyNHB4KSBzYXR1cmF0ZSgxLjYpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7Cn0KLnRhYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjNweDtwYWRkaW5nOjZweCAwO2JvcmRlci1yYWRpdXM6MTRweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7dHJhbnNpdGlvbjpjb2xvciAuMnMsdHJhbnNmb3JtIC4xNnMgdmFyKC0tc3ByaW5nKX0KLnRhYiBzdmd7d2lkdGg6MjJweDtoZWlnaHQ6MjJweH0KLnRhYjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45KX0KLnRhYi5vbntjb2xvcjp2YXIoLS1icmFuZCl9Ci50YWIgLnQtaW5ke3dpZHRoOjE0cHg7aGVpZ2h0OjNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQoudGFiLm9uIC50LWluZHtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKX0KCi8qID09PT09PT09PT09PSBzaGVldHMgJiB0b2FzdCA9PT09PT09PT09PT0gKi8KLnNoZWV0LWJhY2tkcm9we3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMDA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxOCwuNTUpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoNnB4KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cig2cHgpO29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuM3MgdmFyKC0tZWFzZSl9Ci5zaGVldC1iYWNrZHJvcC5zaG93e29wYWNpdHk6MTtwb2ludGVyLWV2ZW50czphdXRvfQouc2hlZXR7cG9zaXRpb246Zml4ZWQ7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7ei1pbmRleDoxMDE7bWF4LWhlaWdodDo4NnZoO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLHZhcigtLWNhcmQyKSx2YXIoLS1iZzIpKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtib3JkZXItYm90dG9tOm5vbmU7CiAgYm9yZGVyLXJhZGl1czoyNnB4IDI2cHggMCAwO3RyYW5zZm9ybTp0cmFuc2xhdGVZKDEwNCUpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4zOHMgdmFyKC0tc3ByaW5nKTsKICBib3gtc2hhZG93OjAgLTE4cHggNTBweCByZ2JhKDAsMCwwLC41KX0KLnNoZWV0LnNob3d7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zaGVldC1ncmFie3dpZHRoOjM4cHg7aGVpZ2h0OjRweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjMpO21hcmdpbjoxMHB4IGF1dG8gNHB4O2ZsZXgtc2hyaW5rOjB9Ci5zaGVldC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzo2cHggMjBweCAxMnB4fQouc2hlZXQtaGVhZCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OXB4fQouc2hlZXQtaGVhZCBoMyBzdmd7d2lkdGg6MThweDtoZWlnaHQ6MThweH0KLnNoZWV0LWNsb3Nle3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mil9Ci5zaGVldC1jbG9zZSBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLnNoZWV0LWNsb3NlOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjkpfQouc2hlZXQtYm9keXtwYWRkaW5nOjRweCAyMHB4IDI0cHg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc3ItaXRlbXtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTFweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtmb250LXNpemU6MTNweH0KLnNyLWl0ZW06bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5zci1pdGVtIC5re2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtd2VpZ2h0OjYwMDtmbGV4LXNocmluazowfQouc3ItaXRlbSAudnt0ZXh0LWFsaWduOnJpZ2h0O2ZvbnQtd2VpZ2h0OjgwMH0KLnNyLWl0ZW0gLnYubW9ub3tmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB4fQouc2lnLXJlc3VsdHttYXgtaGVpZ2h0OjUydmg7b3ZlcmZsb3cteTphdXRvOy13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNofQouc2lnLWNhcmR7Ym9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MTNweCAxNHB4O21hcmdpbi1ib3R0b206MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouc2lnLWNhcmQub2t7YmFja2dyb3VuZDp2YXIoLS1va1NvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI1KX0KLnNpZy1jYXJkLmZhaWx7YmFja2dyb3VuZDp2YXIoLS1lcnJTb2Z0KTtib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuMjgpfQouc2lnLWNhcmQgLmh7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLWJvdHRvbTo2cHh9Ci5zaWctY2FyZCAuaCAucntmb250LXNpemU6MTJweH0KLnNpZy1jYXJkLm9rIC5oIC5ye2NvbG9yOnZhcigtLW9rKX0gLnNpZy1jYXJkLmZhaWwgLmggLnJ7Y29sb3I6dmFyKC0tZXJyKX0KLnNpZy1jYXJkIC5zdGVwc3tmb250LXNpemU6MTJweDtjb2xvcjp2YXIoLS10eHQyKTtsaW5lLWhlaWdodDoxLjh9Ci5zaWctY2FyZCAuc3RlcHMgaXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXJpZ2h0OjVweH0KLnNpZy1jYXJkIC5zdGVwcyAuZXJye2NvbG9yOnZhcigtLWVycil9CiN0b2FzdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjUwJTt0b3A6Y2FsYygxOHB4ICsgdmFyKC0tc2FmZS10KSk7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgtMTZweCk7ei1pbmRleDoyMDA7CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O21heC13aWR0aDo4NnZ3O3BhZGRpbmc6MTFweCAxOHB4O2JvcmRlci1yYWRpdXM6MTRweDtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo3MDA7CiAgYmFja2dyb3VuZDpyZ2JhKDE3LDI2LDQ2LC45Mik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym94LXNoYWRvdzowIDEwcHggMzRweCByZ2JhKDAsMCwwLC40NSk7CiAgb3BhY2l0eTowO3BvaW50ZXItZXZlbnRzOm5vbmU7dHJhbnNpdGlvbjpvcGFjaXR5IC4yNXMsdHJhbnNmb3JtIC4zcyB2YXIoLS1zcHJpbmcpfQojdG9hc3Quc2hvd3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KI3RvYXN0IHN2Z3t3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2ZsZXgtc2hyaW5rOjB9CiN0b2FzdC5va3tjb2xvcjp2YXIoLS1vayl9ICN0b2FzdC5lcnJ7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm97Y29sb3I6dmFyKC0tYnJhbmQpfQojdG9hc3Qub2sgc3Zne2NvbG9yOnZhcigtLW9rKX0gI3RvYXN0LmVyciBzdmd7Y29sb3I6dmFyKC0tZXJyKX0gI3RvYXN0LmluZm8gc3Zne2NvbG9yOnZhcigtLWJyYW5kKX0KLmNvbmZpcm0tbGF5ZXJ7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjE1MDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7cGFkZGluZzozMHB4fQouY29uZmlybXt3aWR0aDptaW4oMzQwcHgsOTB2dyk7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXJhZGl1czoyMHB4O3BhZGRpbmc6MjJweCAyMHB4IDE4cHg7dGV4dC1hbGlnbjpjZW50ZXI7Ym94LXNoYWRvdzowIDI0cHggNjBweCByZ2JhKDAsMCwwLC41NSk7YW5pbWF0aW9uOmNhcmQtaW4gLjNzIHZhcigtLXNwcmluZykgYm90aH0KLmNvbmZpcm0gLmN0e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDttYXJnaW4tYm90dG9tOjZweH0KLmNvbmZpcm0gLmNke2ZvbnQtc2l6ZToxMi41cHg7Y29sb3I6dmFyKC0tdHh0Mik7bGluZS1oZWlnaHQ6MS43O21hcmdpbi1ib3R0b206MThweH0KLmNvbmZpcm0gLmNie2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KLmNvbmZpcm0gLmNiIGJ1dHRvbntmbGV4OjE7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czoxM3B4O2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmNvbmZpcm0gLmNiIC5ub3tiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5jb25maXJtIC5jYiAueWVze2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6IzA0MTIxQ30KCi8qID09PT09PT09PT09PSBtaXNjID09PT09PT09PT09PSAqLwouZm9vdHt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjEwcHggMCA0cHg7Zm9udC1zaXplOjEwLjVweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjh9Ci5mb290IC5saW5re2NvbG9yOnZhcigtLWJyYW5kKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDB9Ci5oaWRkZW57ZGlzcGxheTpub25lIWltcG9ydGFudH0KQGtleWZyYW1lcyBwdWxzZXswJSwxMDAle29wYWNpdHk6MX01MCV7b3BhY2l0eTouNDV9fQoucHVsc2V7YW5pbWF0aW9uOnB1bHNlIDEuNnMgZWFzZS1pbi1vdXQgaW5maW5pdGV9CkBtZWRpYSAocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2UpewogICp7YW5pbWF0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudDt0cmFuc2l0aW9uLWR1cmF0aW9uOi4wMW1zIWltcG9ydGFudH0KfQpAbWVkaWEgKG1pbi13aWR0aDo3MDBweCl7CiAgbWFpbnttYXgtd2lkdGg6NjgwcHg7bWFyZ2luOjAgYXV0b30KfQpAbWVkaWEgKG1heC13aWR0aDo2OTlweCl7CiAgaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPXBhc3N3b3JkXSxpbnB1dFt0eXBlPW51bWJlcl0sdGV4dGFyZWF7Zm9udC1zaXplOjE2cHghaW1wb3J0YW50fQp9CgovKiA9PT09PT09PT09PT0gdjIuMTQuOSDnp6/liIYgLyDovabovobpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5hY2MtY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo3cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MnB4IDAgMTJweDstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaH0KLmFjYy1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQouYWNjLWNoaXB7ZmxleC1zaHJpbms6MDtwYWRkaW5nOjdweCAxNXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKX0KLmFjYy1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tZ3JhZCk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dHJhbnNwYXJlbnQ7Ym94LXNoYWRvdzowIDRweCAxNHB4IHZhcigtLWJyYW5kU29mdCl9Ci5wdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE0cHh9Ci5wdC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTNweCAxNHB4O2FuaW1hdGlvbjpjYXJkLWluIC40cyB2YXIoLS1lYXNlKSBib3RofQoucHQtY2VsbCAubGJ7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NXB4fQoucHQtY2VsbCAudmx7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMTV9Ci5wdC1jZWxsIC5zdWJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHh9Ci5wYW5lbC1jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbGcpO3BhZGRpbmc6MTVweDttYXJnaW4tYm90dG9tOjE0cHg7YW5pbWF0aW9uOmNhcmQtaW4gLjRzIHZhcigtLWVhc2UpIGJvdGh9Ci5wYW5lbC1jYXJkIC5wYy1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47bWFyZ2luLWJvdHRvbToxMXB4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNHtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQoucGFuZWwtY2FyZCAucGMtaGVhZCBoNCBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg3LDFmcik7Z2FwOjVweH0KLmNhbC13ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXdlaWdodDo3MDA7cGFkZGluZy1ib3R0b206M3B4fQouY2FsLWR7YXNwZWN0LXJhdGlvOjE7Ym9yZGVyLXJhZGl1czo5cHg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Ym9yZGVyOjEuNXB4IHNvbGlkIHRyYW5zcGFyZW50fQouY2FsLWQuc2lnbmVke2JhY2tncm91bmQ6dmFyKC0tb2tTb2Z0KTtjb2xvcjp2YXIoLS1vayl9Ci5jYWwtZC5taXNze2JhY2tncm91bmQ6dmFyKC0tZXJyU29mdCk7Y29sb3I6dmFyKC0tZXJyKX0KLmNhbC1kLnRvZGF5e2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCl9Ci5jYWwtZC5mdXR1cmV7b3BhY2l0eTouMzh9Ci5jYWwtZC5ibGFua3tiYWNrZ3JvdW5kOnRyYW5zcGFyZW50fQouY2FsLWQgLmRvdHtmb250LXNpemU6OHB4O2xpbmUtaGVpZ2h0OjE7bWFyZ2luLXRvcDoxcHh9Ci52Yy1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQoudmMtYnRue2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEzcHggNnB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dCl9Ci52Yy1idG4gc3Zne3dpZHRoOjIxcHg7aGVpZ2h0OjIxcHg7Y29sb3I6dmFyKC0tYnJhbmQpfQoudmMtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk0KX0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luOjlweCAwfQoub3B0LWNoaXB7cGFkZGluZzo4cHggMTRweDtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mil9Ci5vcHQtY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5mbG93LWl0ZW17ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtwYWRkaW5nOjExcHggMnB4O2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouZmxvdy1pdGVtOmxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouZmxvdy1pdGVtIC5ubXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo2MDB9Ci5mbG93LWl0ZW0gLnRte2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6MnB4fQouZmxvdy1pdGVtIC5zY3tmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDB9Ci5mbG93LWl0ZW0gLnNjLnBsdXN7Y29sb3I6dmFyKC0tb2spfQouZmxvdy1pdGVtIC5zYy5taW51c3tjb2xvcjp2YXIoLS1lcnIpfQoubW9uLXJvd3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OXB4IDJweDtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTNweH0KLm1vbi1yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5tb24tcm93IC5re2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0KLm1vbi1yb3cgLnZ7Zm9udC13ZWlnaHQ6NzAwfQovKiA9PT09PT09PT09PT0gdjIuMTYuMCDpqpHooYzpobXnu4Tku7YgPT09PT09PT09PT09ICovCi5ydC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OHB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZ3JpZDN7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo4cHh9Ci5ydC1jZWxse2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yLW1kKTtwYWRkaW5nOjEwcHggMTFweH0KLnJ0LWNlbGwgLmxie2ZvbnQtc2l6ZToxMC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwO21hcmdpbi1ib3R0b206NHB4fQoucnQtY2VsbCAudmx7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjEuMX0KLnJ0LWNlbGwgLnZsIC51e2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tbGVmdDoycHh9Ci5ydC1jZWxsIC52bC5icmFuZHtjb2xvcjp2YXIoLS1icmFuZCl9Ci5ydC1kYXl7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOnZhcigtLXItbWQpO3BhZGRpbmc6MTBweCAxMnB4O21hcmdpbi1ib3R0b206OHB4fQoucnQtZGF5Omxhc3QtY2hpbGR7bWFyZ2luLWJvdHRvbTowfQoucnQtdG9we2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpiYXNlbGluZTtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6OHB4fQoucnQtZGF0ZXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDB9Ci5ydC1kYXRlIC53ZHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo2MDA7bWFyZ2luLWxlZnQ6NXB4fQoucnQta217Zm9udC1zaXplOjExLjVweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo3MDB9Ci5ydC1jaGlwc3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjZweDttYXJnaW4tdG9wOjdweH0KLnJ0LWNoaXB7Zm9udC1zaXplOjEwLjVweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6M3B4IDhweH0KLnJ0LWNoaXAgYntjb2xvcjp2YXIoLS1icmFuZCk7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi1sZWZ0OjJweH0KLnJ0LWNoaXAuY2FsIGJ7Y29sb3I6dmFyKC0tb2spfQoucnQtY2hpcC5saW5re2N1cnNvcjpwb2ludGVyO2NvbG9yOnZhcigtLWJyYW5kKTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmRTb2Z0KX0KLyogPT09PT09PT09PT09IOWFpeWcuumXquWxj++8mummluW4p+WNs+aYvuekuu+8jOaVsOaNruWwsee7quWQjua3oeWHuiA9PT09PT09PT09PT0gKi8KI3NwbGFzaHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO3otaW5kZXg6OTk5O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7YmFja2dyb3VuZDpyYWRpYWwtZ3JhZGllbnQoMTIwJSA2MCUgYXQgNTAlIDAlLHJnYmEoMTQsMTQzLDE3OCwuMTYpLHRyYW5zcGFyZW50IDYwJSksdmFyKC0tYmcpO3RyYW5zaXRpb246b3BhY2l0eSAuNHMgdmFyKC0tZWFzZSksdHJhbnNmb3JtIC40cyB2YXIoLS1lYXNlKX0KI3NwbGFzaC5vdXR7b3BhY2l0eTowO3RyYW5zZm9ybTpzY2FsZSgxLjA0KTtwb2ludGVyLWV2ZW50czpub25lfQouc3AtbWFya3t3aWR0aDo4NHB4O2hlaWdodDo4NHB4O2JvcmRlci1yYWRpdXM6MjRweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2hhZG93OjAgMTRweCA0MHB4IHJnYmEoMTQsMTQzLDE3OCwuNCk7YW5pbWF0aW9uOnNwLWluIC41cyB2YXIoLS1zcHJpbmcpIGJvdGh9Ci5zcC1tYXJrIHN2Z3t3aWR0aDo0NnB4O2hlaWdodDo0NnB4fQouc3AtdGl0bGV7bWFyZ2luLXRvcDoyMHB4O2ZvbnQtc2l6ZToyMXB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzoxcHg7YW5pbWF0aW9uOnNwLXVwIC40cyAuMDVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1zdWJ7bWFyZ2luLXRvcDo3cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Myk7bGV0dGVyLXNwYWNpbmc6M3B4O2FuaW1hdGlvbjpzcC11cCAuNHMgLjFzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2Fke21hcmdpbi10b3A6MzRweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo5cHg7Zm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0Mik7YW5pbWF0aW9uOnNwLXVwIC40cyAuMTVzIHZhcigtLWVhc2UpIGJvdGh9Ci5zcC1sb2FkIC5zcGlubmVye3dpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1saW5lMik7Ym9yZGVyLXRvcC1jb2xvcjp2YXIoLS1icmFuZCk7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwaW4gLjdzIGxpbmVhciBpbmZpbml0ZX0KQGtleWZyYW1lcyBzcC1pbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjYpIHRyYW5zbGF0ZVkoMTBweCl9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpzY2FsZSgxKSB0cmFuc2xhdGVZKDApfX0KQGtleWZyYW1lcyBzcC11cHtmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06dHJhbnNsYXRlWSgxMnB4KX10b3tvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9fQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGlkPSJ3YWxsTGF5ZXIiPjxkaXYgaWQ9IndhbGxJbWciPjwvZGl2PjxkaXYgaWQ9IndhbGxTY3JpbSI+PC9kaXY+PC9kaXY+CjxkaXYgY2xhc3M9ImJnLWdsb3ciPjwvZGl2Pgo8ZGl2IGlkPSJzcGxhc2giPgogIDxkaXYgY2xhc3M9InNwLW1hcmsiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNNCAxMy41QzQgOS4wOCA3LjU4IDUuNSAxMiA1LjVzOCAzLjU4IDggOCIgc3Ryb2tlPSIjMDQxMjFDIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTEyIDEzbDcuNSA1LjUiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjcuNSIgY3k9IjE2LjUiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjxjaXJjbGUgY3g9IjE3IiBjeT0iMTkiIHI9IjIuMiIgZmlsbD0iIzA0MTIxQyIvPjwvc3ZnPjwvZGl2PgogIDxkaXYgY2xhc3M9InNwLXRpdGxlIj7mnoHmoLggWkVFSE88L2Rpdj4KICA8ZGl2IGNsYXNzPSJzcC1zdWIiPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9kaXY+CiAgPGRpdiBjbGFzcz0ic3AtbG9hZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiPjwvc3Bhbj7mraPlnKjliqDovb3mlbDmja7igKY8L2Rpdj4KPC9kaXY+CjxkaXYgaWQ9ImFwcCI+CiAgPGhlYWRlciBjbGFzcz0iYXBwLWhlYWRlciI+CiAgICA8ZGl2IGNsYXNzPSJicmFuZC1tYXJrIj48aW1nIHNyYz0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFKQUFBQUNRQ0FZQUFBRG5SdUs0QUFBQUFYTlNSMElBcnM0YzZRQUFBRkJsV0VsbVRVMEFLZ0FBQUFnQUFnRVNBQU1BQUFBQkFBRUFBSWRwQUFRQUFBQUJBQUFBSmdBQUFBQUFBNkFCQUFNQUFBQUJBQUVBQUtBQ0FBUUFBQUFCQUFBQWtLQURBQVFBQUFBQkFBQUFrQUFBQUFBdDRpU1dBQUFCV1dsVVdIUllUVXc2WTI5dExtRmtiMkpsTG5odGNBQUFBQUFBUEhnNmVHMXdiV1YwWVNCNGJXeHVjenA0UFNKaFpHOWlaVHB1Y3pwdFpYUmhMeUlnZURwNGJYQjBhejBpV0UxUUlFTnZjbVVnTmk0d0xqQWlQZ29nSUNBOGNtUm1PbEpFUmlCNGJXeHVjenB5WkdZOUltaDBkSEE2THk5M2QzY3Vkek11YjNKbkx6RTVPVGt2TURJdk1qSXRjbVJtTFhONWJuUmhlQzF1Y3lNaVBnb2dJQ0FnSUNBOGNtUm1Pa1JsYzJOeWFYQjBhVzl1SUhKa1pqcGhZbTkxZEQwaUlnb2dJQ0FnSUNBZ0lDQWdJQ0I0Yld4dWN6cDBhV1ptUFNKb2RIUndPaTh2Ym5NdVlXUnZZbVV1WTI5dEwzUnBabVl2TVM0d0x5SStDaUFnSUNBZ0lDQWdJRHgwYVdabU9rOXlhV1Z1ZEdGMGFXOXVQakU4TDNScFptWTZUM0pwWlc1MFlYUnBiMjQrQ2lBZ0lDQWdJRHd2Y21SbU9rUmxjMk55YVhCMGFXOXVQZ29nSUNBOEwzSmtaanBTUkVZK0Nqd3ZlRHA0YlhCdFpYUmhQZ29aWHVFSEFBQU5DRWxFUVZSNEFlMWRXMHdWU1JvdVJJS2lZa2hFb21Jd2l6aFI0bzFWSnpxclVYZ3dXVFhlMEtoeEpFWmR2Q1dqa015cmlZOUd4bHMwRVYrY2pNWWIzalBSbHhHZEhSUGQwWWs4N0VaV1VOZFJFMFJGRVJGRVlQK3Y3VDZlYzdyT3BmdDB3Nm5ULzUvODlPbTZkZFZYWDZxcXUvNzZTUkk5Sk4zZDNmM29VYm1rbzBsSGtXYnBta25YZE5LQnBJTkkwMGhUU1ZOMFRhWXJ0QTlwa3AvU3o0U1RibXFSb1YzMHUxUFhEcnBDMjBsYlNkK1J0cEEya3phU051ajZtSzUxcFBWSlNVbHRkSFZkMENHdUNCRm1IQlZjUkRwVjE2L282dHJ6cUd5V0x3aUFoTFdrdit2NkN4SHFQMStpbmZ2bGFJY1NhUXFvYXY4Z25VZWE3VncxdVNRSEVIaEtaZnhNV2tsaytzT0I4clFpWWlZUWtRWmxGSk4rUi9xTlZpci9pWGNFYmxJRjk1RldFWmt3V3RtV21BaEU1UGtiUGZrSFVreFRMT29oZ0NtdWpFajBtOTJxMnlJUUVTZURIbmlRZEtYZEIzTyt1RUxnQk5WbUN4R3B5V3F0TEJPSXlET0xIbktNZEtUVmgzSDZ1RWJnVDZyZGFpTFJyMVpxaVZmanFJWElVMDZKcTBtWlBGR2pwa3hDOUdtMTNzZFJWenFxRVlnS1Jib0swdTFSbDh3SlZVWmdEMVcrUEpvRmRrUUM2ZVQ1a1FyOFZtVkV1TzZXRWZpSmNwUkVJbEUwVXhoR0hpYVBaZnlWejRBK1I5K0hsYkFFMHVkRG5yYkNRcGpRa2RzanJZbENUbUdVRVc5YldEQ0hKVmxDdzhlTkF3TFlrNXNUNnUxTVNpQWlENzd6MUpCaVpjN0NDT0FWZnlLUnlQU2RLTlRvZ28rRVRCNG1qb0VBdUFCT21NUTBBdEhvZysySmY1cFNjZ0FqSU1STUdvVUN0ajBDQ0VUa3dmMXRVdDdiWXJySUVNRGUyZGRFSXQ4R2JQQVVobDExSm84TU9nNERBdUFHT09LVFlBTEJKSU9GRVFpSFFBQkhmRk1ZVFY4d0Jyc2JMaWZITVFJNkFuK2xhVXd6U3ZNZmdVb1pIa1lnU2dSZ2RhcUovd2lFZDMwMlE5V0I0VXRZQko3U0NLUjk1dEZHSUpxKzhwazhZUUhqeUVBRXNva3pPRFRoMjZZb0RJem5PMFlnSWdKRlNHR3NnYVpGVE00SkdJRkFCRFRPR0FUaWJ6K0I0UEJkWkFRMHppVFJYSVlUb3pqdDZGdFFSODdMS1JnQjdRUnRHa2FnWEZJbUR6UENLZ0xnVEM0SWxHYzFKNmRuQkhRRThrQ2dISWFERWJDSlFBNElCQzhaTEl5QUhRU3ltRUIyWU9NOEJnSWFnVEtOTzc0eUFoWVJ5TVFJQk9kT0xJeUFIUVRTUVNCNEJtTmhCT3dnTUJBRUdtUW5KK2RoQk1BZEVBZytDVmtZQVRzSWFGK2k0ZENTaFJHd2cwQXFSaUI0UTJWaEJPd2drTUlFc2dNYjV6RVEwQWlVYk56eGxSR3dpRUF5UmlBbWtFWFVPTGtQQVkxQUlCRUxJMkFIZ1Q0Z0Q5c0MyWUdPOHdDQkpDWVFFeUVXQkpMNmdrV3hsQkFwYjFWVmxXaG93UDhDWVFFQ25aMmRZdG15WldMWXNHRlNRTzdldlN0dTNib2xqYk1hT0hyMGFERjM3bHlyMmF5a1R4SmtFKzJxVEpnd0FaNGNXSFVNU2t0THUxdGJXNldZRTNHNk16TXpIY05xNGNLRjB1YzRHWWdSeUZYcDM3Ky9xK1dyVkRpUlJ4dzZkRWowMFphZWdUV3ZxYWtSUzVjdUZZMk5qWUVSTWR5bHBycS95Y0J2WURGMGtKV3NhOWFzRVFjT0hKQ1NwN2EyVml4ZXZGZzhlL2JNU3BGeGtaWUoxQVBkVUZ4Y0xBNGZQaXhTVXN5N1JvOGVQUktMRmkwU3VLb29UQ0NYZTIzZXZIbmk2Tkdqb2w4L0hMOExGSXc0UzVZc0VmZnYzdytNVU9pT0NlUmlaODJaTTBjY1AzNWNEQmd3d1BRVXJIVXdNdDI3ZDg4VXAxSUFFOGlsM3BvK2ZibzRmZnEwR0R4NHNPa0piOTY4RWN1WEwzZnNkZDMwZ0I0TVlBSzVBUGJreVpNRnZuOE5HVExFVkhwTFM0dFl0V3FWdUg3OXVpbE94UUFta01POU5uYnNXSEh1M0RreGZQaHdVOGx0YlcyaXBLUkVYTGx5eFJTbmFnQVR5TUdleTgzTkZSY3VYQkNqUm8weWxkclIwU0UyYk5pZ2tjc1VxWEFBRThpaHpzdk96aGJuejU4WFk4YU1NWlhZMWRVbHRtN2RLbzRkd3o5NlRDeGhBam5RbjBPSERoVm56NTRWNDhlUGw1WldYbDR1S2lzcnBYR3FCektCWXV6QmpJd01jZWJNR1RGdG10bkoyOGVQSDBWWldabll1M2R2akUrSjMreXU3NFU1MGZUMDlIUXhlL1pzUVo1Qm5Tak9zVEt3cDdWNTgyWXhheGIrTTVaWjd0eTVJK3JxNmdSdGFwb2p3NFMwdDdlTGE5ZXVDUkF3M2tVSkF1WGs1SWlMRnkvR081YW0rczJZTVVOY3VuVEpGQjRwQU4rSjh2THl4TXVYTHlNbDdmVjRKYVl3TWo4UWVJdnhpbUFFUXB0VkVDVUlwQUtRWHEyak1nUktUdmJPNFJHWnZWQzhFbFNKTlJETVFGKzhlQ0UxaCtnSllER2Q0RnNPV1F1R1hNZzNOemM3TnMyK2V2VkttU2xNQ1FJOWVQQkFrR2xzeU01emswUUdlWGJzMktGOURKUTlDL3RhNjlhdEU5am5ja0pBVml5a1ZSQWxDUFRwMHlkSFRUMnRkc3kyYmR2RWxpMWJwQVNHQVR4MjFwMDBSYlZhdjk1TXI4d2FxTGRBMnJScGs2aW9xSkNhb3NLV3gyazc1dDVxcDkzbk1vSENJSWVkOC8zNzkwdkpBeXRDV0JNK2YvNDhUQW1KSDhVRUN0SEhPTHNGTythK2ZjMnovTU9IRDVXMll3N1JaRnZCVENBSmJQUG56OWZzbUdYSFlndzdacHlrWVBueTc1NFlDeDJCb3FJaXpld2lMYzNzK1ErZkVyRG13Umt1bHM4SThBamt4d1RzWFowOGVWSnF4OXpVMUtTOWJkMitmZHN2Qi85a0F1a2NLQ2dvaUdqSGZPUEdEV1pNRUFKTUlBSWtQejlmTXpXVk9UeUFIVE5PbFY2OWVqVUlPcjRGQXA0bkVEeFl3QlFWSmlQQkFndUE5ZXZYYS9IQmNYei9HUUZQRTJqa3lKSGF5QVBibTJEQmRnSytQdU5nSUV0b0JEeExvS3lzTEkwOE1qdG1rQWZiRjBlT0hBbU5ITWRvQ0ppL2tzVWhNREJsbFgzUXMxdFZIUGpEcWRFcFU2YVlpc0RPLzg2ZE84WEJnd2Q3YmZjZmxWTEZnRTRKQW1HZGdsTVBUcEFJdStzNGJqeGl4QWdUZVl3QWJJNnVXTEhDdU8zeEs4dzVGaXhZb01TT3ZCSUVnbWNMMlZUalJzL0NjQTF2WmIwcHIxKy9GcW9ZMENteEJzS29vY3FRN2dUeFZHcXJFZ1J5b2xPNERIY1FVSUpBc0JHV2VmZHlCNUxlTHhYN2NQRjJCaTRVS2txc2dXQnpnOWRxSytzQ3d4UVZaOUt4Q0pkSmRYVzF1SHo1Y3R4MTF2djM3d1ZVQlZHQ1FEaGd0Mi9mUHN0NDRsZ3hQaGJLQkhiTWNHejU5dTFiV1RTSFJZbUFFZ1NLc2kwQnllRFFZUGZ1M1FGaHhvMWh4OHprTVJDeGYxVmlEV1MxZVJzM2JoUzdkdTJTWm9NZE0zd1RldFVJWGdwS0RJRUpSeURZTVlmeXgyellNYXZvanptR1BuWTFhMElSeVBESExQdGlEVC9NV1BPbzZvL1pWUmJFVUhqQ0VNand4eHpLamhua1Vka2Zjd3g5N0dyV2hDQlFZV0ZoV0gvTWJNZnNIb2VVSnhEOE1aODZkVXBxeDJ6NFkyWTdaaWFRRkFINFk4WXVmU2gvekN0WHJrd1lmOHhTQU9JZ1VOa1JhTnk0Y1dIdG1QRTJ4bmJNN2pOTVNRTEJIelBzbUwza2o5bDlLdGg3Z25JRWdqOW1lSUwzbWo5bWU5M3JmaTdYQ2ZUaHd3ZkhXZ0YvekNBUGZBVUZDNTZETDlDSjZvODV1TDNSM01QWG90dmkrbDdZMnJWcnhaTW5UeHhwQnh3ZVRKMDZWVnBXZlgyOXdML1h4SzY5S3FZUTBvWTRHRGhwMGlRSFM1TVhsVVJtRDEwVUZWOE9tT1YxNWRENFE2QWJVNWdhL21UakR6eXVFWEdIQ2NRMGlBVUJqVUNZd2xnWUFUc0lkR0VFNnJTVGsvTXdBdUFPRTRoNUVBc0NHb0c4ODA4b1lvR0s4OG9RNk1BSXhBU1NRY05oMFNDZ0Vjajl6NVhSVklYVHFJaEFPMGFnVmhWcnpuV09Dd1JhUWFCM2NWRVZyb1NLQ0x3RGdaejVEeUVxTnAvckhDc0NMU0JRYzZ5bGNIN1BJdEFNQWpWNnR2bmM4RmdSYUFTQkdtSXRoZk43Rm9FR0pwQm4rOTZSaG1zRWV1eElVVnlJRnhGNGpCR296b3N0NXpZN2drQWRMQkw3VVZING1NaFdpWTVnNnBsQ1lJaVkxb2ZzaDl2b3gzODkwMnh1cUZNSTFJSTdtTUlndjMrKzhGOUdJR29FTk00WUJQcFgxTms0SVNQd0dZRUFBdjNDcURBQ0ZoSFFPT05iT05OaStrOHFJTnRpSVp6Y213ZzhwZldQNXIzVW1NSUF3OC9leElKYmJRTUJIMWY4Q1ZScG95RE80azBFZkZ6eEVZaUdwRDhJaTV2ZXhJTmJiUUdCbXpwWHRDdytBdWtGV1BmbWJlSEpuRFFoRUFqZ2lHOFJqYWJSUWhyMytML1djZzhHU01UaVpRVHc2djQxalVDKzQvQUJJNUFlVWVabGhManRZUkVvOHljUFVnWVFDQUdVNERlNm5NQnZGa2JBRDRFVE9qZjhna0pzb05KVWxrR3Bha2kxZC8yQUhIempSUVR3alhBaUVhZ3B1UEdtRVFnSjlJU3I2U2M3WGdoR3pIdjM0TUJxR1hrQWhaUkFpS0FNdjlMbGUveG04VFFDMyt0Y2tJSVE4QlltUzBIVDJROFV2bDBXeDJFSmo4QWVJay9ZbDZwb0NJUTBQNUorbS9Cd2NRUDlFZmlKYmtxSVFMNVhkdjlJNDNmSUtjeElvQmRRUXZkN2pEQytKandDNk91STVBRUtFVWNnZjZob09pdW5lL3dudDRqRTg4L0h2NVZCQUF0bXJIa3FvcTJ4SlFLaFVDTFJMTG9jSStWWGZBQ1NPSUpYZGJ4dDRlVXBhckU4a3VnUG1FaFA0SStOVWNNYzl3blJsL2pPWTRrOGFKVmxBaUVUUGFpSmRCWDluRW5LOXRRQVJVMUIzODFFWDZKUDdUVEI4aFFXL0JDYTBsQkdNZWwzcE44RXgvTjlYQ0lBc3gzc3FsY1JjY0srWlVXcWZjd0U4bjhBa2FtQTdrdEovMDdLNXJIKzRQVCs3NmRVQlZnU1ZoSnBZUHZsaURoS0lQOGFFWm55NmI2UWRCb3B6RVBHa0xyMlBDcWI1UXNDR0ZWdzFnOVRGRTdjWENQUy9KdXVqa3VQZFNnUnFqL1YvaStrZWFRNXBGbTZadEkxblhRZzZTRFNOTkpVMGhSZGsra0t4WG9OOVRXVWZpYWNvT01OeFN0MXA2NXdoQXFGUDB1Y0lvWlhPVGdHZzIrblJsSjRXSUgrai9RQmFUMFJCZ2RHWFpmL0E3WTFkLzVJSlpkZEFBQUFBRWxGVGtTdVFtQ0MiIGFsdD0iWkVFSE8iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnJhbmQtdHh0Ij4KICAgICAgPGgxPuaegeaguCBaRUVITzwvaDE+CiAgICAgIDxwPuetvuWIsCDCtyDovabovoYgwrcg5o6n6L2mPC9wPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJoZWFkLWFjdGlvbnMiPgogICAgICA8ZGl2IGNsYXNzPSJjb3VudC1jaGlwIGhpZGRlbiIgaWQ9ImNvdW50Q2hpcCIgb25jbGljaz0idG9nZ2xlQXV0b1JlZnJlc2goKSI+CiAgICAgICAgPHNwYW4gY2xhc3M9ImNvdW50LXJpbmciPjxzdmcgdmlld0JveD0iMCAwIDE0IDE0Ij48Y2lyY2xlIGNsYXNzPSJ0cmFjayIgY3g9IjciIGN5PSI3IiByPSI1LjYiLz48Y2lyY2xlIGNsYXNzPSJhcmMiIGlkPSJjb3VudEFyYyIgY3g9IjciIGN5PSI3IiByPSI1LjYiIHN0cm9rZS1kYXNoYXJyYXk9IjM1LjIiIHN0cm9rZS1kYXNob2Zmc2V0PSIzNS4yIi8+PC9zdmc+PC9zcGFuPgogICAgICAgIDxzcGFuIGlkPSJjb3VudFR4dCI+NjBzPC9zcGFuPgogICAgICA8L2Rpdj4KICAgICAgCiAgICA8L2Rpdj4KICA8L2hlYWRlcj4KCiAgPG1haW4gaWQ9Im1haW4iPgogICAgPGRpdiBjbGFzcz0icHRyLXdyYXAiIGlkPSJwdHJXcmFwIj4KICAgICAgPGRpdiBjbGFzcz0icHRyLWluZGljYXRvciIgaWQ9InB0ckluZCI+PHNwYW4gY2xhc3M9InNwaW5uZXIiIGlkPSJwdHJTcGluIj48L3NwYW4+PHNwYW4gaWQ9InB0clR4dCI+5LiL5ouJ5Yi35pawPC9zcGFuPjwvZGl2PgogICAgICA8ZGl2IGlkPSJwYWdlSG9tZSI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InBhZ2VQb2ludHMiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZVZlaGljbGUiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZVJpZGUiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUxvZ3MiIGNsYXNzPSJoaWRkZW4iPjwvZGl2PgogICAgPGRpdiBpZD0icGFnZUNmZyIgY2xhc3M9ImhpZGRlbiI+PC9kaXY+CiAgPC9tYWluPgoKICA8bmF2IGNsYXNzPSJ0YWJiYXIiPgogICAgPGJ1dHRvbiBjbGFzcz0idGFiIG9uIiBkYXRhLXRhYj0iaG9tZSIgb25jbGljaz0ic3dpdGNoVGFiKCdob21lJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMC41IDEyIDNsOSA3LjUiLz48cGF0aCBkPSJNNSA5LjVWMjFoMTRWOS41Ii8+PC9zdmc+CiAgICAgIOmmlumhtTxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJwb2ludHMiIG9uY2xpY2s9InN3aXRjaFRhYigncG9pbnRzJykiPgogICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjYiLz48cGF0aCBkPSJNOSA4LjVsMyA0IDMtNE0xMiAxMi41VjE3TTkuNiAxMy40aDQuOE05LjYgMTUuNGg0LjgiLz48L3N2Zz4KICAgICAg56ev5YiGPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InZlaGljbGUiIG9uY2xpY2s9InN3aXRjaFRhYigndmVoaWNsZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTNsMS43LTQuNkEyIDIgMCAwIDEgNy42IDdoOC44YTIgMiAwIDAgMSAxLjkgMS40TDIwIDEzIi8+PHBhdGggZD0iTTMuNSAxM2gxN2ExIDEgMCAwIDEgMSAxdjMuNWgtMi42TTIuNSAxNy41VjE0YTEgMSAwIDAgMSAxLTEiLz48cGF0aCBkPSJNNS4xIDE3LjVIMi41Ii8+PGNpcmNsZSBjeD0iNy4zIiBjeT0iMTcuMyIgcj0iMS45Ii8+PGNpcmNsZSBjeD0iMTYuNyIgY3k9IjE3LjMiIHI9IjEuOSIvPjxwYXRoIGQ9Ik05LjIgMTcuM2g1LjYiLz48L3N2Zz4KICAgICAg6L2m6L6GPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9InJpZGUiIG9uY2xpY2s9InN3aXRjaFRhYigncmlkZScpIj4KICAgICAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTYuNWMyLjUgMCAzLjUtOSA4LTlzNC41IDkgMTAgOSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTkiIHI9IjEuMyIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+CiAgICAgIOmqkeihjDxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJ0YWIiIGRhdGEtdGFiPSJsb2dzIiBvbmNsaWNrPSJzd2l0Y2hUYWIoJ2xvZ3MnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04IDZoMTNNOCAxMmgxM004IDE4aDEzIi8+PHBhdGggZD0iTTMgNmguMDFNMyAxMmguMDFNMyAxOGguMDEiLz48L3N2Zz4KICAgICAg5pel5b+XPHNwYW4gY2xhc3M9InQtaW5kIj48L3NwYW4+CiAgICA8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InRhYiIgZGF0YS10YWI9ImNmZyIgb25jbGljaz0ic3dpdGNoVGFiKCdjZmcnKSI+CiAgICAgIDxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz48cGF0aCBkPSJNMTkuNCAxNWExLjY1IDEuNjUgMCAwIDAgLjMzIDEuODJsLjA2LjA2YTIgMiAwIDEgMS0yLjgzIDIuODNsLS4wNi0uMDZhMS42NSAxLjY1IDAgMCAwLTEuODItLjMzIDEuNjUgMS42NSAwIDAgMC0xIDEuNTFWMjFhMiAyIDAgMSAxLTQgMHYtLjA5YTEuNjUgMS42NSAwIDAgMC0xLTEuNTEgMS42NSAxLjY1IDAgMCAwLTEuODIuMzNsLS4wNi4wNmEyIDIgMCAxIDEtMi44My0yLjgzbC4wNi0uMDZhMS42NSAxLjY1IDAgMCAwIC4zMy0xLjgyIDEuNjUgMS42NSAwIDAgMC0xLjUxLTFIM2EyIDIgMCAxIDEgMC00aC4wOWExLjY1IDEuNjUgMCAwIDAgMS41MS0xIDEuNjUgMS42NSAwIDAgMC0uMzMtMS44MmwtLjA2LS4wNmEyIDIgMCAxIDEgMi44My0yLjgzbC4wNi4wNmExLjY1IDEuNjUgMCAwIDAgMS44Mi4zM2guMDFhMS42NSAxLjY1IDAgMCAwIDEtMS41MVYzYTIgMiAwIDEgMSA0IDB2LjA5YTEuNjUgMS42NSAwIDAgMCAxIDEuNTFoLjAxYTEuNjUgMS42NSAwIDAgMCAxLjgyLS4zM2wuMDYtLjA2YTIgMiAwIDEgMSAyLjgzIDIuODNsLS4wNi4wNmExLjY1IDEuNjUgMCAwIDAtLjMzIDEuODJ2LjAxYTEuNjUgMS42NSAwIDAgMCAxLjUxIDFIMjFhMiAyIDAgMSAxIDAgNGgtLjA5YTEuNjUgMS42NSAwIDAgMC0xLjUxIDF6Ii8+PC9zdmc+CiAgICAgIOiuvue9rjxzcGFuIGNsYXNzPSJ0LWluZCI+PC9zcGFuPgogICAgPC9idXR0b24+CiAgPC9uYXY+CgogIDxkaXYgY2xhc3M9InNoZWV0LWJhY2tkcm9wIiBpZD0ic2hlZXRCYWNrZHJvcCIgb25jbGljaz0iY2xvc2VTaGVldCgpIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJzaGVldCIgaWQ9InNoZWV0Ij4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWdyYWIiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2hlZXQtaGVhZCI+CiAgICAgIDxoMyBpZD0ic2hlZXRUaXRsZSI+PC9oMz4KICAgICAgPGJ1dHRvbiBjbGFzcz0ic2hlZXQtY2xvc2UiIG9uY2xpY2s9ImNsb3NlU2hlZXQoKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4TTYgNmwxMiAxMiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1ib2R5IiBpZD0ic2hlZXRCb2R5Ij48L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBpZD0idG9hc3QiIHJvbGU9InN0YXR1cyI+PC9kaXY+CiAgPGRpdiBjbGFzcz0iY29uZmlybS1sYXllciBoaWRkZW4iIGlkPSJjb25maXJtTGF5ZXIiPjwvZGl2Pgo8L2Rpdj4KPHNjcmlwdD4KInVzZSBzdHJpY3QiOwovKiA9PT09PT09PT09PT09PT09PSDluLjph48gPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgQVBQX1ZFUlNJT04gPSAidjIuMTYuNTQiOwpjb25zdCBLRVlTID0geyBjZmc6InplZWhvX2NmZyIsIGFjY291bnRzOiJ6ZWVob19hY2NvdW50cyIsIGxvZ3M6InplZWhvX2xvZ3MiIH07CgovKiA9PT09PT09PT09PT09PT09PSDlt6Xlhbflh73mlbAgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gZ2V0VXVpZCgpe2NvbnN0IHA9Inh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCIsYz0iYWJjZGVmMDEyMzQ1Njc4OSI7bGV0IHI9IiI7Zm9yKGNvbnN0IGNoIG9mIHApe2lmKGNoPT09IngifHxjaD09PSJ5Iil7Y29uc3Qgbj1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTYpO3IrPShjaD09PSJ5Ij8obiYweDMpfDB4ODpuKS50b1N0cmluZygxNil9ZWxzZSByKz1jaH1yZXR1cm4gcn0KZnVuY3Rpb24gZ2V0UmFuZG9tQ2hhcnMobj0xNil7Y29uc3QgYz0iMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiO2xldCByPSIiO2ZvcihsZXQgaT0wO2k8bjtpKyspcis9Yy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmMubGVuZ3RoKSk7cmV0dXJuIHJ9CmZ1bmN0aW9uIHRvUXVlcnkocD17fSl7cmV0dXJuIE9iamVjdC5rZXlzKHApLmZpbHRlcihrPT5wW2tdIT09dW5kZWZpbmVkJiZwW2tdIT09bnVsbCkuc29ydCgpLm1hcChrPT5rKyI9IitwW2tdKS5qb2luKCImIil9CmZ1bmN0aW9uIGNsZWFuVG9rZW4odCl7cmV0dXJuIFN0cmluZyh0fHwiIikudHJpbSgpLnJlcGxhY2UoL15bYkJdZWFyZXJccysvaSwiIikucmVwbGFjZSgvW1xzIidgXSsvZywiIil9CmZ1bmN0aW9uIGNsZWFuQmFya0tleShiKXtsZXQgcz1TdHJpbmcoYnx8IiIpLnRyaW0oKS5yZXBsYWNlKC9eW2JCXWFya1xzKihrZXkpP1xzKls677yaXVxzKi9pLCIiKS5yZXBsYWNlKC9bXHMiJ2BdKy9nLCIiKS50cmltKCk7cmV0dXJuIHMucmVwbGFjZSgvXC8rJC8sIiIpfQpmdW5jdGlvbiBtYXNrVmluKHYpe2NvbnN0IHM9U3RyaW5nKHZ8fCIiKTtpZighcylyZXR1cm4iIjtpZihzLmxlbmd0aDw9NylyZXR1cm4iKioqKiI7cmV0dXJuIHMuc3Vic3RyaW5nKDAsMykrIioqKioiK3Muc3Vic3RyaW5nKHMubGVuZ3RoLTQpfQpmdW5jdGlvbiBkZWVwUGljayhvYmosa2V5cyxkZXB0aCl7aWYoIW9ianx8dHlwZW9mIG9iaiE9PSJvYmplY3QifHwoZGVwdGh8fDApPjUpcmV0dXJuIiI7Zm9yKGNvbnN0IGsgb2Yga2V5cyl7aWYob2JqW2tdIT09dW5kZWZpbmVkJiZvYmpba10hPT1udWxsJiZvYmpba10hPT0iIilyZXR1cm4gU3RyaW5nKG9ialtrXSl9Zm9yKGNvbnN0IGsgaW4gb2JqKXtpZihvYmpba10mJnR5cGVvZiBvYmpba109PT0ib2JqZWN0Iil7Y29uc3Qgcj1kZWVwUGljayhvYmpba10sa2V5cywoZGVwdGh8fDApKzEpO2lmKHIpcmV0dXJuIHJ9fXJldHVybiIifQpmdW5jdGlvbiBwaWNrSW90UHJvcChkLGlkZW50aWZ5KXtjb25zdCBhcnI9ZCYmZC5pb3RQcm9wZXJ0aWVzO2lmKEFycmF5LmlzQXJyYXkoYXJyKSl7Y29uc3Qga2V5PVN0cmluZyhpZGVudGlmeSkudG9Mb3dlckNhc2UoKTtmb3IoY29uc3QgaXQgb2YgYXJyKXtpZihpdCYmU3RyaW5nKGl0LmlkZW50aWZ5fHwiIikudG9Mb3dlckNhc2UoKT09PWtleSYmaXQudmFsdWUhPT1udWxsJiZpdC52YWx1ZSE9PXVuZGVmaW5lZCYmaXQudmFsdWUhPT0iIilyZXR1cm4gU3RyaW5nKGl0LnZhbHVlKX19cmV0dXJuIiJ9CmZ1bmN0aW9uIGdldERldmljZUlkZW50aWZ5KGFjYyl7Y29uc3Qgc2VlZD1TdHJpbmcoYWNjLnVzZXJJZHx8YWNjLnZpbk5vfHwiemVlaG8tZGV2aWNlIik7bGV0IGg9MDtmb3IobGV0IGk9MDtpPHNlZWQubGVuZ3RoO2krKyl7aD0oKGg8PDUpLWgrc2VlZC5jaGFyQ29kZUF0KGkpKXwwfXJldHVybihNYXRoLmFicyhoKS50b1N0cmluZygxNikrIjAwMDAwMDAwMDAwMDAwMDAiKS5zbGljZSgwLDE2KX0KZnVuY3Rpb24gaGFzVmFsaWRDb29yZChsYXQsbG5nKXtpZihsYXQ9PT0iInx8bGF0PT09bnVsbHx8bGF0PT09dW5kZWZpbmVkfHxsbmc9PT0iInx8bG5nPT09bnVsbHx8bG5nPT09dW5kZWZpbmVkKXJldHVybiBmYWxzZTtjb25zdCBsYT1OdW1iZXIobGF0KSxsbj1OdW1iZXIobG5nKTtyZXR1cm4gaXNGaW5pdGUobGEpJiZpc0Zpbml0ZShsbikmJk1hdGguYWJzKGxhKTw9OTAmJk1hdGguYWJzKGxuKTw9MTgwJiYhKGxhPT09MCYmbG49PT0wKX0KZnVuY3Rpb24gbm9ybWFsaXplUmVmcmVzaFNlYyh2KXtjb25zdCBuPU51bWJlcih2KTtpZighaXNGaW5pdGUobil8fG48PTApcmV0dXJuIDYwO3JldHVybiBNYXRoLm1heCgxNSxNYXRoLm1pbigzNjAwLE1hdGgucm91bmQobikpKX0KZnVuY3Rpb24gZXNjKHMpe3JldHVybiBTdHJpbmcocz09bnVsbD8iIjpzKS5yZXBsYWNlKC8mL2csIiZhbXA7IikucmVwbGFjZSgvPC9nLCImbHQ7IikucmVwbGFjZSgvPi9nLCImZ3Q7IikucmVwbGFjZSgvIi9nLCImcXVvdDsiKX0KCi8qID09PT09PT09PT09PT09PT09IE1ENSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBtZDUodCxlKXtmdW5jdGlvbiBuKHQsZSl7cmV0dXJuIHQ8PGV8dD4+PjMyLWV9ZnVuY3Rpb24gcih0LGUpe3ZhciBuLHIsbyxpLGE7cmV0dXJuIG89MjE0NzQ4MzY0OCZ0LGk9MjE0NzQ4MzY0OCZlLGE9KDEwNzM3NDE4MjMmdCkrKDEwNzM3NDE4MjMmZSksKG49MTA3Mzc0MTgyNCZ0KSYocj0xMDczNzQxODI0JmUpPzIxNDc0ODM2NDheYV5vXmk6bnxyPzEwNzM3NDE4MjQmYT8zMjIxMjI1NDcyXmFeb15pOjEwNzM3NDE4MjReYV5vXmk6YV5vXml9ZnVuY3Rpb24gbyh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZlfH50Jm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gaSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdCZufGUmfm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdF5lXm59KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gdSh0LGUsbyxpLGEsdSxjKXtyZXR1cm4gdD1yKHQscihyKGZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gZV4odHx+bil9KGUsbyxpKSxhKSxjKSkscihuKHQsdSksZSl9ZnVuY3Rpb24gYyh0KXt2YXIgZSxuPSIiLHI9IiI7Zm9yKGU9MDtlPD0zO2UrKyluKz0ocj0iMCIrKHQ+Pj44KmUmMjU1KS50b1N0cmluZygxNikpLnN1YnN0cihyLmxlbmd0aC0yLDIpO3JldHVybiBufXZhciBzLGwsZixwLGQsaCx2LHksZyxtPUFycmF5KCk7Zm9yKG09ZnVuY3Rpb24odCl7Zm9yKHZhciBlLG49dC5sZW5ndGgscj1uKzgsbz0xNiooKHItciU2NCkvNjQrMSksaT1BcnJheShvLTEpLGE9MCx1PTA7dTxuOylhPXUlNCo4LGlbZT0odS11JTQpLzRdPWlbZV18dC5jaGFyQ29kZUF0KHUpPDxhLHUrKztyZXR1cm4gYT11JTQqOCxpW2U9KHUtdSU0KS80XT1pW2VdfDEyODw8YSxpW28tMl09bjw8MyxpW28tMV09bj4+PjI5LGl9KHQ9ZnVuY3Rpb24odCl7dD10LnJlcGxhY2UoL1xyXG4vZywiXG4iKTtmb3IodmFyIGU9IiIsbj0wO248dC5sZW5ndGg7bisrKXt2YXIgcj10LmNoYXJDb2RlQXQobik7cjwxMjg/ZSs9U3RyaW5nLmZyb21DaGFyQ29kZShyKTpyPjEyNyYmcjwyMDQ4PyhlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjZ8MTkyKSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSk6KGUrPVN0cmluZy5mcm9tQ2hhckNvZGUocj4+MTJ8MjI0KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKHI+PjYmNjN8MTI4KSxlKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDYzJnJ8MTI4KSl9cmV0dXJuIGV9KHQpKSxoPTE3MzI1ODQxOTMsdj00MDIzMjMzNDE3LHk9MjU2MjM4MzEwMixnPTI3MTczMzg3OCxzPTA7czxtLmxlbmd0aDtzKz0xNilsPWgsZj12LHA9eSxkPWcsaD1vKGgsdix5LGcsbVtzKzBdLDcsMzYxNDA5MDM2MCksZz1vKGcsaCx2LHksbVtzKzFdLDEyLDM5MDU0MDI3MTApLHk9byh5LGcsaCx2LG1bcysyXSwxNyw2MDYxMDU4MTkpLHY9byh2LHksZyxoLG1bcyszXSwyMiwzMjUwNDQxOTY2KSxoPW8oaCx2LHksZyxtW3MrNF0sNyw0MTE4NTQ4Mzk5KSxnPW8oZyxoLHYseSxtW3MrNV0sMTIsMTIwMDA4MDQyNikseT1vKHksZyxoLHYsbVtzKzZdLDE3LDI4MjE3MzU5NTUpLHY9byh2LHksZyxoLG1bcys3XSwyMiw0MjQ5MjYxMzEzKSxoPW8oaCx2LHksZyxtW3MrOF0sNywxNzcwMDM1NDE2KSxnPW8oZyxoLHYseSxtW3MrOV0sMTIsMjMzNjU1Mjg3OSkseT1vKHksZyxoLHYsbVtzKzEwXSwxNyw0Mjk0OTI1MjMzKSx2PW8odix5LGcsaCxtW3MrMTFdLDIyLDIzMDQ1NjMxMzQpLGg9byhoLHYseSxnLG1bcysxMl0sNywxODA0NjAzNjgyKSxnPW8oZyxoLHYseSxtW3MrMTNdLDEyLDQyNTQ2MjYxOTUpLHk9byh5LGcsaCx2LG1bcysxNF0sMTcsMjc5Mjk2NTAwNiksaD1pKGgsdj1vKHYseSxnLGgsbVtzKzE1XSwyMiwxMjM2NTM1MzI5KSx5LGcsbVtzKzFdLDUsNDEyOTE3MDc4NiksZz1pKGcsaCx2LHksbVtzKzZdLDksMzIyNTQ2NTY2NCkseT1pKHksZyxoLHYsbVtzKzExXSwxNCw2NDM3MTc3MTMpLHY9aSh2LHksZyxoLG1bcyswXSwyMCwzOTIxMDY5OTk0KSxoPWkoaCx2LHksZyxtW3MrNV0sNSwzNTkzNDA4NjA1KSxnPWkoZyxoLHYseSxtW3MrMTBdLDksMzgwMTYwODMpLHk9aSh5LGcsaCx2LG1bcysxNV0sMTQsMzYzNDQ4ODk2MSksdj1pKHYseSxnLGgsbVtzKzRdLDIwLDM4ODk0Mjk0NDgpLGg9aShoLHYseSxnLG1bcys5XSw1LDU2ODQ0NjQzOCksZz1pKGcsaCx2LHksbVtzKzE0XSw5LDMyNzUxNjM2MDYpLHk9aSh5LGcsaCx2LG1bcyszXSwxNCw0MTA3NjAzMzM1KSx2PWkodix5LGcsaCxtW3MrOF0sMjAsMTE2MzUzMTUwMSksaD1pKGgsdix5LGcsbVtzKzEzXSw1LDI4NTAyODU4MjkpLGc9aShnLGgsdix5LG1bcysyXSw5LDQyNDM1NjM1MTIpLHk9aSh5LGcsaCx2LG1bcys3XSwxNCwxNzM1MzI4NDczKSxoPWEoaCx2PWkodix5LGcsaCxtW3MrMTJdLDIwLDIzNjgzNTk1NjIpLHksZyxtW3MrNV0sNCw0Mjk0NTg4NzM4KSxnPWEoZyxoLHYseSxtW3MrOF0sMTEsMjI3MjM5MjgzMykseT1hKHksZyxoLHYsbVtzKzExXSwxNiwxODM5MDMwNTYyKSx2PWEodix5LGcsaCxtW3MrMTRdLDIzLDQyNTk2NTc3NDApLGg9YShoLHYseSxnLG1bcysxXSw0LDI3NjM5NzUyMzYpLGc9YShnLGgsdix5LG1bcys0XSwxMSwxMjcyODkzMzUzKSx5PWEoeSxnLGgsdixtW3MrN10sMTYsNDEzOTQ2OTY2NCksdj1hKHYseSxnLGgsbVtzKzEwXSwyMywzMjAwMjM2NjU2KSxoPWEoaCx2LHksZyxtW3MrMTNdLDQsNjgxMjc5MTc0KSxnPWEoZyxoLHYseSxtW3MrMF0sMTEsMzkzNjQzMDA3NCkseT1hKHksZyxoLHYsbVtzKzNdLDE2LDM1NzI0NDUzMTcpLHY9YSh2LHksZyxoLG1bcys2XSwyMyw3NjAyOTE4OSksaD1hKGgsdix5LGcsbVtzKzldLDQsMzY1NDYwMjgwOSksZz1hKGcsaCx2LHksbVtzKzEyXSwxMSwzODczMTUxNDYxKSx5PWEoeSxnLGgsdixtW3MrMTVdLDE2LDUzMDc0MjUyMCksaD11KGgsdj1hKHYseSxnLGgsbVtzKzJdLDIzLDMyOTk2Mjg2NDUpLHksZyxtW3MrMF0sNiw0MDk2MzM2NDUyKSxnPXUoZyxoLHYseSxtW3MrN10sMTAsMTEyNjg5MTQxNSkseT11KHksZyxoLHYsbVtzKzE0XSwxNSwyODc4NjEyMzkxKSx2PXUodix5LGcsaCxtW3MrNV0sMjEsNDIzNzUzMzI0MSksaD11KGgsdix5LGcsbVtzKzEyXSw2LDE3MDA0ODU1NzEpLGc9dShnLGgsdix5LG1bcyszXSwxMCwyMzk5OTgwNjkwKSx5PXUoeSxnLGgsdixtW3MrMTBdLDE1LDQyOTM5MTU3NzMpLHY9dSh2LHksZyxoLG1bcysxXSwyMSwyMjQwMDQ0NDk3KSxoPXUoaCx2LHksZyxtW3MrOF0sNiwxODczMzEzMzU5KSxnPXUoZyxoLHYseSxtW3MrMTVdLDEwLDQyNjQzNTU1NTIpLHk9dSh5LGcsaCx2LG1bcys2XSwxNSwyNzM0NzY4OTE2KSx2PXUodix5LGcsaCxtW3MrMTNdLDIxLDEzMDkxNTE2NDkpLGg9dShoLHYseSxnLG1bcys0XSw2LDQxNDk0NDQyMjYpLGc9dShnLGgsdix5LG1bcysxMV0sMTAsMzE3NDc1NjkxNykseT11KHksZyxoLHYsbVtzKzJdLDE1LDcxODc4NzI1OSksdj11KHYseSxnLGgsbVtzKzldLDIxLDM5NTE0ODE3NDUpLGg9cihoLGwpLHY9cih2LGYpLHk9cih5LHApLGc9cihnLGQpO3JldHVybiAzMj09ZT8oYyhoKStjKHYpK2MoeSkrYyhnKSkudG9Mb3dlckNhc2UoKTooYyh2KStjKHkpKS50b0xvd2VyQ2FzZSgpfQovKiA9PT09PT09PT09PT09PT09PSBTSEExID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHNoYTEobXNnKXtmdW5jdGlvbiByb3RhdGVfbGVmdChuLHMpe3ZhciB0ND0objw8cyl8KG4+Pj4oMzItcykpO3JldHVybiB0NH07ZnVuY3Rpb24gY3Z0X2hleCh2YWwpe3ZhciBzdHI9Jyc7dmFyIGk7dmFyIHY7Zm9yKGk9NztpPj0wO2ktLSl7dj0odmFsPj4+KGkqNCkpJjB4MGY7c3RyKz12LnRvU3RyaW5nKDE2KX1yZXR1cm4gc3RyfTtmdW5jdGlvbiBVdGY4RW5jb2RlKHN0cmluZyl7c3RyaW5nPXN0cmluZy5yZXBsYWNlKC9cclxuL2csJ1xuJyk7dmFyIHV0ZnRleHQ9Jyc7Zm9yKHZhciBuPTA7bjxzdHJpbmcubGVuZ3RoO24rKyl7dmFyIGM9c3RyaW5nLmNoYXJDb2RlQXQobik7aWYoYzwxMjgpe3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoYyl9ZWxzZSBpZigoYz4xMjcpJiYoYzwyMDQ4KSl7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+Nil8MTkyKTt1dGZ0ZXh0Kz1TdHJpbmcuZnJvbUNoYXJDb2RlKChjJjYzKXwxMjgpfWVsc2V7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+MTIpfDIyNCk7dXRmdGV4dCs9U3RyaW5nLmZyb21DaGFyQ29kZSgoKGM+PjYpJjYzKXwxMjgpO3V0ZnRleHQrPVN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpfDEyOCl9fXJldHVybiB1dGZ0ZXh0fTt2YXIgYmxvY2tzdGFydDt2YXIgaSxqO3ZhciBXPW5ldyBBcnJheSg4MCk7dmFyIEgwPTB4Njc0NTIzMDE7dmFyIEgxPTB4RUZDREFCODk7dmFyIEgyPTB4OThCQURDRkU7dmFyIEgzPTB4MTAzMjU0NzY7dmFyIEg0PTB4QzNEMkUxRjA7dmFyIEEsQixDLEQsRTt2YXIgdGVtcDttc2c9VXRmOEVuY29kZShtc2cpO3ZhciBtc2dfbGVuPW1zZy5sZW5ndGg7dmFyIHdvcmRfYXJyYXk9bmV3IEFycmF5KCk7Zm9yKGk9MDtpPG1zZ19sZW4tMztpKz00KXtqPW1zZy5jaGFyQ29kZUF0KGkpPDwyNHxtc2cuY2hhckNvZGVBdChpKzEpPDwxNnxtc2cuY2hhckNvZGVBdChpKzIpPDw4fG1zZy5jaGFyQ29kZUF0KGkrMyk7d29yZF9hcnJheS5wdXNoKGopfXN3aXRjaChtc2dfbGVuJTQpe2Nhc2UgMDppPTB4MDgwMDAwMDAwO2JyZWFrO2Nhc2UgMTppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDI0fDB4MDgwMDAwMDticmVhaztjYXNlIDI6aT1tc2cuY2hhckNvZGVBdChtc2dfbGVuLTIpPDwyNHxtc2cuY2hhckNvZGVBdChtc2dfbGVuLTEpPDwxNnwweDA4MDAwO2JyZWFrO2Nhc2UgMzppPW1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMyk8PDI0fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMik8PDE2fG1zZy5jaGFyQ29kZUF0KG1zZ19sZW4tMSk8PDh8MHg4MDticmVha313b3JkX2FycmF5LnB1c2goaSk7d2hpbGUoKHdvcmRfYXJyYXkubGVuZ3RoJTE2KSE9MTQpd29yZF9hcnJheS5wdXNoKDApO3dvcmRfYXJyYXkucHVzaChtc2dfbGVuPj4+MjkpO3dvcmRfYXJyYXkucHVzaCgobXNnX2xlbjw8MykmMHgwZmZmZmZmZmYpO2ZvcihibG9ja3N0YXJ0PTA7YmxvY2tzdGFydDx3b3JkX2FycmF5Lmxlbmd0aDtibG9ja3N0YXJ0Kz0xNil7Zm9yKGk9MDtpPDE2O2krKylXW2ldPXdvcmRfYXJyYXlbYmxvY2tzdGFydCtpXTtmb3IoaT0xNjtpPD03OTtpKyspV1tpXT1yb3RhdGVfbGVmdChXW2ktM11eV1tpLThdXldbaS0xNF1eV1tpLTE2XSwxKTtBPUgwO0I9SDE7Qz1IMjtEPUgzO0U9SDQ7Zm9yKGk9MDtpPD0xOTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfCh+QiZEKSkrRStXW2ldKzB4NUE4Mjc5OTkpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfWZvcihpPTIwO2k8PTM5O2krKyl7dGVtcD0ocm90YXRlX2xlZnQoQSw1KSsoQl5DXkQpK0UrV1tpXSsweDZFRDlFQkExKSYweDBmZmZmZmZmZjtFPUQ7RD1DO0M9cm90YXRlX2xlZnQoQiwzMCk7Qj1BO0E9dGVtcH1mb3IoaT00MDtpPD01OTtpKyspe3RlbXA9KHJvdGF0ZV9sZWZ0KEEsNSkrKChCJkMpfChCJkQpfChDJkQpKStFK1dbaV0rMHg4RjFCQkNEQykmMHgwZmZmZmZmZmY7RT1EO0Q9QztDPXJvdGF0ZV9sZWZ0KEIsMzApO0I9QTtBPXRlbXB9Zm9yKGk9NjA7aTw9Nzk7aSsrKXt0ZW1wPShyb3RhdGVfbGVmdChBLDUpKyhCXkNeRCkrRStXW2ldKzB4Q0E2MkMxRDYpJjB4MGZmZmZmZmZmO0U9RDtEPUM7Qz1yb3RhdGVfbGVmdChCLDMwKTtCPUE7QT10ZW1wfUgwPShIMCtBKSYweDBmZmZmZmZmZjtIMT0oSDErQikmMHgwZmZmZmZmZmY7SDI9KEgyK0MpJjB4MGZmZmZmZmZmO0gzPShIMytEKSYweDBmZmZmZmZmZjtIND0oSDQrRSkmMHgwZmZmZmZmZmZ9dmFyIHRlbXA9Y3Z0X2hleChIMCkrY3Z0X2hleChIMSkrY3Z0X2hleChIMikrY3Z0X2hleChIMykrY3Z0X2hleChINCk7cmV0dXJuIHRlbXAudG9Mb3dlckNhc2UoKX0KLyogPT09PT09PT09PT09PT09PT0gQUVTLTI1Ni1FQ0IgKyBQS0NTNyA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBBRVNfU0JPWD1uZXcgVWludDhBcnJheShbMHg2MywweDdjLDB4NzcsMHg3YiwweGYyLDB4NmIsMHg2ZiwweGM1LDB4MzAsMHgwMSwweDY3LDB4MmIsMHhmZSwweGQ3LDB4YWIsMHg3NiwweGNhLDB4ODIsMHhjOSwweDdkLDB4ZmEsMHg1OSwweDQ3LDB4ZjAsMHhhZCwweGQ0LDB4YTIsMHhhZiwweDljLDB4YTQsMHg3MiwweGMwLDB4YjcsMHhmZCwweDkzLDB4MjYsMHgzNiwweDNmLDB4ZjcsMHhjYywweDM0LDB4YTUsMHhlNSwweGYxLDB4NzEsMHhkOCwweDMxLDB4MTUsMHgwNCwweGM3LDB4MjMsMHhjMywweDE4LDB4OTYsMHgwNSwweDlhLDB4MDcsMHgxMiwweDgwLDB4ZTIsMHhlYiwweDI3LDB4YjIsMHg3NSwweDA5LDB4ODMsMHgyYywweDFhLDB4MWIsMHg2ZSwweDVhLDB4YTAsMHg1MiwweDNiLDB4ZDYsMHhiMywweDI5LDB4ZTMsMHgyZiwweDg0LDB4NTMsMHhkMSwweDAwLDB4ZWQsMHgyMCwweGZjLDB4YjEsMHg1YiwweDZhLDB4Y2IsMHhiZSwweDM5LDB4NGEsMHg0YywweDU4LDB4Y2YsMHhkMCwweGVmLDB4YWEsMHhmYiwweDQzLDB4NGQsMHgzMywweDg1LDB4NDUsMHhmOSwweDAyLDB4N2YsMHg1MCwweDNjLDB4OWYsMHhhOCwweDUxLDB4YTMsMHg0MCwweDhmLDB4OTIsMHg5ZCwweDM4LDB4ZjUsMHhiYywweGI2LDB4ZGEsMHgyMSwweDEwLDB4ZmYsMHhmMywweGQyLDB4Y2QsMHgwYywweDEzLDB4ZWMsMHg1ZiwweDk3LDB4NDQsMHgxNywweGM0LDB4YTcsMHg3ZSwweDNkLDB4NjQsMHg1ZCwweDE5LDB4NzMsMHg2MCwweDgxLDB4NGYsMHhkYywweDIyLDB4MmEsMHg5MCwweDg4LDB4NDYsMHhlZSwweGI4LDB4MTQsMHhkZSwweDVlLDB4MGIsMHhkYiwweGUwLDB4MzIsMHgzYSwweDBhLDB4NDksMHgwNiwweDI0LDB4NWMsMHhjMiwweGQzLDB4YWMsMHg2MiwweDkxLDB4OTUsMHhlNCwweDc5LDB4ZTcsMHhjOCwweDM3LDB4NmQsMHg4ZCwweGQ1LDB4NGUsMHhhOSwweDZjLDB4NTYsMHhmNCwweGVhLDB4NjUsMHg3YSwweGFlLDB4MDgsMHhiYSwweDc4LDB4MjUsMHgyZSwweDFjLDB4YTYsMHhiNCwweGM2LDB4ZTgsMHhkZCwweDc0LDB4MWYsMHg0YiwweGJkLDB4OGIsMHg4YSwweDcwLDB4M2UsMHhiNSwweDY2LDB4NDgsMHgwMywweGY2LDB4MGUsMHg2MSwweDM1LDB4NTcsMHhiOSwweDg2LDB4YzEsMHgxZCwweDllLDB4ZTEsMHhmOCwweDk4LDB4MTEsMHg2OSwweGQ5LDB4OGUsMHg5NCwweDliLDB4MWUsMHg4NywweGU5LDB4Y2UsMHg1NSwweDI4LDB4ZGYsMHg4YywweGExLDB4ODksMHgwZCwweGJmLDB4ZTYsMHg0MiwweDY4LDB4NDEsMHg5OSwweDJkLDB4MGYsMHhiMCwweDU0LDB4YmIsMHgxNl0pOwpjb25zdCBBRVNfUkNPTj1uZXcgVWludDhBcnJheShbMHgwMCwweDAxLDB4MDIsMHgwNCwweDA4LDB4MTAsMHgyMCwweDQwLDB4ODAsMHgxYiwweDM2LDB4NmMsMHhkOCwweGFiLDB4NGRdKTsKZnVuY3Rpb24gYWVzR011bChhLGIpe2xldCBwPTA7Zm9yKGxldCBpPTA7aTw4O2krKyl7aWYoYiYxKXBePWE7Y29uc3QgaGk9YSYweDgwO2E9KGE8PDEpJjB4ZmY7aWYoaGkpYV49MHgxYjtiPj49MX1yZXR1cm4gcH0KZnVuY3Rpb24gYWVzS2V5RXhwYW5zaW9uMjU2KGtleSl7Y29uc3QgTms9OCxOYj00LE5yPTE0O2NvbnN0IHc9bmV3IFVpbnQ4QXJyYXkoNCpOYiooTnIrMSkpO2ZvcihsZXQgaT0wO2k8TmsqNDtpKyspd1tpXT1rZXlbaV07Zm9yKGxldCBpPU5rO2k8TmIqKE5yKzEpO2krKyl7bGV0IHQwPXdbNCooaS0xKV0sdDE9d1s0KihpLTEpKzFdLHQyPXdbNCooaS0xKSsyXSx0Mz13WzQqKGktMSkrM107aWYoaSVOaz09PTApe2NvbnN0IHRtcD10MDt0MD1BRVNfU0JPWFt0MV1eQUVTX1JDT05baS9Oa107dDE9QUVTX1NCT1hbdDJdO3QyPUFFU19TQk9YW3QzXTt0Mz1BRVNfU0JPWFt0bXBdfWVsc2UgaWYoaSVOaz09PTQpe3QwPUFFU19TQk9YW3QwXTt0MT1BRVNfU0JPWFt0MV07dDI9QUVTX1NCT1hbdDJdO3QzPUFFU19TQk9YW3QzXX13WzQqaV09d1s0KihpLU5rKV1edDA7d1s0KmkrMV09d1s0KihpLU5rKSsxXV50MTt3WzQqaSsyXT13WzQqKGktTmspKzJdXnQyO3dbNCppKzNdPXdbNCooaS1OaykrM11edDN9cmV0dXJuIHd9CmZ1bmN0aW9uIGFlc0VuY3J5cHRCbG9jayhpbnB1dCx3KXtjb25zdCBOYj00LE5yPTE0O2NvbnN0IHM9bmV3IFVpbnQ4QXJyYXkoMTYpO2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09aW5wdXRbaV07Zm9yKGxldCBpPTA7aTwxNjtpKyspc1tpXV49d1tpXTtmb3IobGV0IHJvdW5kPTE7cm91bmQ8PU5yO3JvdW5kKyspe2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV09QUVTX1NCT1hbc1tpXV07bGV0IHQ9c1sxXTtzWzFdPXNbNV07c1s1XT1zWzldO3NbOV09c1sxM107c1sxM109dDt0PXNbMl07c1syXT1zWzEwXTtzWzEwXT10O3Q9c1s2XTtzWzZdPXNbMTRdO3NbMTRdPXQ7dD1zWzNdO3NbM109c1sxNV07c1sxNV09c1sxMV07c1sxMV09c1s3XTtzWzddPXQ7aWYocm91bmQhPT1Ocil7Zm9yKGxldCBjPTA7Yzw0O2MrKyl7Y29uc3QgaT00KmM7Y29uc3QgYTA9c1tpXSxhMT1zW2krMV0sYTI9c1tpKzJdLGEzPXNbaSszXTtzW2ldPWFlc0dNdWwoYTAsMileYWVzR011bChhMSwzKV5hMl5hMztzW2krMV09YTBeYWVzR011bChhMSwyKV5hZXNHTXVsKGEyLDMpXmEzO3NbaSsyXT1hMF5hMV5hZXNHTXVsKGEyLDIpXmFlc0dNdWwoYTMsMyk7c1tpKzNdPWFlc0dNdWwoYTAsMyleYTFeYTJeYWVzR011bChhMywyKX19Y29uc3Qgb2ZmPXJvdW5kKjE2O2ZvcihsZXQgaT0wO2k8MTY7aSsrKXNbaV1ePXdbb2ZmK2ldfXJldHVybiBzfQpmdW5jdGlvbiBhZXNVdGY4Qnl0ZXMoc3RyKXtjb25zdCBvdXQ9W107Zm9yKGxldCBpPTA7aTxzdHIubGVuZ3RoO2krKyl7bGV0IGM9c3RyLmNoYXJDb2RlQXQoaSk7aWYoYzwweDgwKW91dC5wdXNoKGMpO2Vsc2UgaWYoYzwweDgwMClvdXQucHVzaCgweGMwfChjPj42KSwweDgwfChjJjB4M2YpKTtlbHNlIGlmKGM+PTB4ZDgwMCYmYzw9MHhkYmZmKXtjb25zdCBjMj1zdHIuY2hhckNvZGVBdCgrK2kpO2M9MHgxMDAwMCsoKGMtMHhkODAwKTw8MTApKyhjMi0weGRjMDApO291dC5wdXNoKDB4ZjB8KGM+PjE4KSwweDgwfCgoYz4+MTIpJjB4M2YpLDB4ODB8KChjPj42KSYweDNmKSwweDgwfChjJjB4M2YpKX1lbHNlIG91dC5wdXNoKDB4ZTB8KGM+PjEyKSwweDgwfCgoYz4+NikmMHgzZiksMHg4MHwoYyYweDNmKSl9cmV0dXJuIG5ldyBVaW50OEFycmF5KG91dCl9CmZ1bmN0aW9uIGFlc0J5dGVzVG9CYXNlNjQoYnl0ZXMpe2NvbnN0IGNoYXJzPSJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvIjtsZXQgcmVzdWx0PSIiLGk9MDtmb3IoO2krMjxieXRlcy5sZW5ndGg7aSs9Myl7Y29uc3Qgbj0oYnl0ZXNbaV08PDE2KXwoYnl0ZXNbaSsxXTw8OCl8Ynl0ZXNbaSsyXTtyZXN1bHQrPWNoYXJzWyhuPj4xOCkmNjNdK2NoYXJzWyhuPj4xMikmNjNdK2NoYXJzWyhuPj42KSY2M10rY2hhcnNbbiY2M119Y29uc3QgcmVtPWJ5dGVzLmxlbmd0aC1pO2lmKHJlbT09PTEpe2NvbnN0IG49Ynl0ZXNbaV08PDE2O3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rIj09In1lbHNlIGlmKHJlbT09PTIpe2NvbnN0IG49KGJ5dGVzW2ldPDwxNil8KGJ5dGVzW2krMV08PDgpO3Jlc3VsdCs9Y2hhcnNbKG4+PjE4KSY2M10rY2hhcnNbKG4+PjEyKSY2M10rY2hhcnNbKG4+PjYpJjYzXSsiPSJ9cmV0dXJuIHJlc3VsdH0KZnVuY3Rpb24gYWVzMjU2RWNiRW5jcnlwdEJhc2U2NChwbGFpbnRleHQsa2V5U3RyKXtjb25zdCBrZXk9YWVzVXRmOEJ5dGVzKGtleVN0cik7aWYoa2V5Lmxlbmd0aCE9PTMyKXRocm93IG5ldyBFcnJvcigiQUVTLTI1NumcgOimgTMy5a2X6IqC5a+G6ZKl77yM5b2T5YmNIitrZXkubGVuZ3RoKTtjb25zdCB3PWFlc0tleUV4cGFuc2lvbjI1NihrZXkpO2NvbnN0IGRhdGE9YWVzVXRmOEJ5dGVzKHBsYWludGV4dCk7Y29uc3QgcGFkTGVuPTE2LShkYXRhLmxlbmd0aCUxNik7Y29uc3QgcGFkZGVkPW5ldyBVaW50OEFycmF5KGRhdGEubGVuZ3RoK3BhZExlbik7cGFkZGVkLnNldChkYXRhKTtmb3IobGV0IGk9ZGF0YS5sZW5ndGg7aTxwYWRkZWQubGVuZ3RoO2krKylwYWRkZWRbaV09cGFkTGVuO2NvbnN0IG91dD1uZXcgVWludDhBcnJheShwYWRkZWQubGVuZ3RoKTtmb3IobGV0IG9mZj0wO29mZjxwYWRkZWQubGVuZ3RoO29mZis9MTYpe291dC5zZXQoYWVzRW5jcnlwdEJsb2NrKHBhZGRlZC5zbGljZShvZmYsb2ZmKzE2KSx3KSxvZmYpfXJldHVybiBhZXNCeXRlc1RvQmFzZTY0KG91dCl9CgovKiA9PT09PT09PT09PT09PT09PSDlrZjlgqggPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gbG9hZEpTT04oayxmYWxsYmFjayl7dHJ5e2NvbnN0IHJhdz1sb2NhbFN0b3JhZ2UuZ2V0SXRlbShrKTtpZighcmF3KXJldHVybiBmYWxsYmFjaztjb25zdCB2PUpTT04ucGFyc2UocmF3KTtyZXR1cm4gdj09PXVuZGVmaW5lZHx8dj09PW51bGw/ZmFsbGJhY2s6dn1jYXRjaChlKXtyZXR1cm4gZmFsbGJhY2t9fQpmdW5jdGlvbiBzYXZlSlNPTihrLHYpe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrLEpTT04uc3RyaW5naWZ5KHYpKTtyZXR1cm4gdHJ1ZX1jYXRjaChlKXtyZXR1cm4gZmFsc2V9fQpjb25zdCBERUZBVUxUX0NGRz17YXBwOnthcHBJZDoiUzdxUFdQVTEiLGFwcFNlY3JldDoiYzVlMGRhN2Y0ZGEyOGRmODA1Njk0ZWMzZGQxZmM2NzkyZTlkZjk5ZCJ9LGg1OnthcHBJZDoiU3c1Rjl1SmkiLGFwcFNlY3JldDoiNDY4NzBhOGY2NzhhMDkxMDk0NjhmNWIwMTY4ODE4YjkxYzI5Mjg0NSJ9LGNvbW11bml0eTp7ZW5hYmxlUG9zdDp0cnVlLGVuYWJsZUxpa2U6dHJ1ZSxlbmFibGVDb21tZW50OnRydWUsZW5hYmxlU2hhcmU6dHJ1ZSxlbmFibGVEZWxldGU6dHJ1ZX0sdmVoaWNsZUFlc0tleToiY2UyY2Q3Y2I1NzEyNGMxMzQ5ZGQ4NTQzYmY2ZmQzMWQiLHZlaGljbGVDb250cm9sUmlzazoiIixhdXRvUmVmcmVzaFNlYzo2MCxzZXJ2ZXJCYXNlOiIiLGF1dG9TaWduaW46ZmFsc2UsYXV0b1NpZ25pblRpbWU6IjA3OjAwIix2ZWhpY2xlTW9uaXRvcjpmYWxzZSx3aWRnZXRWZWhpY2xlOiIiLGN1c3RvbUJnOiIiLHBpY3M6e30sdmVoaWNsZUFsZXJ0UHVzaDp0cnVlfTsKZnVuY3Rpb24gZ2V0Q2ZnKCl7Y29uc3QgYz1sb2FkSlNPTihLRVlTLmNmZyxudWxsKTtpZighYylyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShERUZBVUxUX0NGRykpO3JldHVybnthcHA6e2FwcElkOmMuYXBwPy5hcHBJZHx8REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpjLmFwcD8uYXBwU2VjcmV0fHxERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fSxoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fERFRkFVTFRfQ0ZHLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fERFRkFVTFRfQ0ZHLmg1LmFwcFNlY3JldH0sY29tbXVuaXR5OntlbmFibGVQb3N0OmMuY29tbXVuaXR5Py5lbmFibGVQb3N0IT09ZmFsc2UsZW5hYmxlTGlrZTpjLmNvbW11bml0eT8uZW5hYmxlTGlrZSE9PWZhbHNlLGVuYWJsZUNvbW1lbnQ6Yy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpjLmNvbW11bml0eT8uZW5hYmxlU2hhcmUhPT1mYWxzZSxlbmFibGVEZWxldGU6Yy5jb21tdW5pdHk/LmVuYWJsZURlbGV0ZSE9PWZhbHNlfSx2ZWhpY2xlQWVzS2V5OigodHlwZW9mIGMudmVoaWNsZUFlc0tleT09PSJzdHJpbmciP2MudmVoaWNsZUFlc0tleToiIikudHJpbSgpfHxERUZBVUxUX0NGRy52ZWhpY2xlQWVzS2V5KSx2ZWhpY2xlQ29udHJvbFJpc2s6KHR5cGVvZiBjLnZlaGljbGVDb250cm9sUmlzaz09PSJzdHJpbmciP2MudmVoaWNsZUNvbnRyb2xSaXNrOiIiKS50cmltKCksYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjLmF1dG9SZWZyZXNoU2VjKSxzZXJ2ZXJCYXNlOlN0cmluZyhjLnNlcnZlckJhc2V8fCIiKS50cmltKCksYXV0b1NpZ25pbjpjLmF1dG9TaWduaW49PT10cnVlLGF1dG9TaWduaW5UaW1lOih0eXBlb2YgYy5hdXRvU2lnbmluVGltZT09PSJzdHJpbmciJiYvXlxkezEsMn06XGR7Mn0kLy50ZXN0KGMuYXV0b1NpZ25pblRpbWUpP2MuYXV0b1NpZ25pblRpbWU6IjA3OjAwIiksdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsIHdpZGdldFZlaGljbGU6U3RyaW5nKGMud2lkZ2V0VmVoaWNsZXx8IiIpLCBjdXN0b21CZzpTdHJpbmcoYy5jdXN0b21CZ3x8IiIpLCB2ZWhpY2xlQWxlcnRQdXNoOmMudmVoaWNsZUFsZXJ0UHVzaCE9PWZhbHNlfX0KZnVuY3Rpb24gc2F2ZUNmZyhjKXtyZXR1cm4gc2F2ZUpTT04oS0VZUy5jZmcsYyl9CmZ1bmN0aW9uIGdldEFjY291bnRzKCl7Y29uc3QgYT1sb2FkSlNPTihLRVlTLmFjY291bnRzLFtdKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfQpmdW5jdGlvbiBzYXZlQWNjb3VudHMobGlzdCl7cmV0dXJuIHNhdmVKU09OKEtFWVMuYWNjb3VudHMsbGlzdCl9CmZ1bmN0aW9uIGdldExvZ3MoKXtjb25zdCBhPWxvYWRKU09OKEtFWVMubG9ncyxbXSk7cmV0dXJuIEFycmF5LmlzQXJyYXkoYSk/YTpbXX0KZnVuY3Rpb24gYWRkTG9nKGVudHJ5KXtjb25zdCBsb2dzPWdldExvZ3MoKTtsb2dzLnVuc2hpZnQoZW50cnkpO2lmKGxvZ3MubGVuZ3RoPjUwKWxvZ3MubGVuZ3RoPTUwO3NhdmVKU09OKEtFWVMubG9ncyxsb2dzKX0KZnVuY3Rpb24gY2xlYXJMb2dzKCl7cmV0dXJuIHNhdmVKU09OKEtFWVMubG9ncyxbXSl9CmZ1bmN0aW9uIGlzUHJveHlNb2RlKCl7cmV0dXJuICEhKHdpbmRvdy5fX1BBTkVMX01PREVfXyl8fCEhZ2V0Q2ZnKCkuc2VydmVyQmFzZX0KLyogPT09PT09PT09PT09PT09PT0g562+5ZCNID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIGdldFNpZ24odHlwZSxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jW3R5cGVdfHxjLmFwcDtjb25zdCBxdWVyeT10b1F1ZXJ5KHBhcmFtcyk7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXR5cGU9PT0iaDUiP2dldFV1aWQoKTp0aW1lc3RhbXArZ2V0UmFuZG9tQ2hhcnMoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj1ib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOicnO2NvbnN0IHNpZ25hdHVyZT10eXBlPT09Img1Ij8ocXVlcnkrcGFyYW0rYWMuYXBwU2VjcmV0KTooYm9keVN0citwYXJhbSthYy5hcHBTZWNyZXQpO2NvbnN0IHNpZ249bWQ1KHNoYTEoc2lnbmF0dXJlKSwzMikudG9TdHJpbmcoKTtyZXR1cm57J2NmbW90by14LXBhcmFtJzpwYXJhbSwnY2Ztb3RvLXgtc2lnbic6c2lnbiwnY2Ztb3RvLXgtc2lnbi10eXBlJzonMCcsJ3RpbWVzdGFtcCc6U3RyaW5nKHRpbWVzdGFtcCksJ25vbmNlJzpub25jZSwnc2lnbmF0dXJlJzpzaWdufX0KCi8vIEg1IOerr+WQqyBib2R5IOetvuWQje+8iGxvZ2luQnlQaG9uZSDnrYnmjqXlj6Plv4Xpobvmioror7fmsYLkvZPnurPlhaXnrb7lkI3vvIzlkKbliJnov5Tlm54gcGVybWl0IGVycm9y77yJCmZ1bmN0aW9uIGg1U2lnbldpdGhCb2R5KGJvZHksY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5oNXx8Yy5hcHA7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPWdldFV1aWQoKTtjb25zdCBwYXJhbT0iYXBwSWQ9IithYy5hcHBJZCsiJm5vbmNlPSIrbm9uY2UrIiZ0aW1lc3RhbXA9Iit0aW1lc3RhbXA7Y29uc3QgYm9keVN0cj10eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSk7Y29uc3Qgc2lnbj1tZDUoc2hhMShib2R5U3RyK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydjZm1vdG8teC1wYXJhbSc6cGFyYW0sJ2NmbW90by14LXNpZ24nOnNpZ24sJ2NmbW90by14LXNpZ24tdHlwZSc6JzAnLCd0aW1lc3RhbXAnOlN0cmluZyh0aW1lc3RhbXApLCdub25jZSc6bm9uY2UsJ2FwcElkJzphYy5hcHBJZH19CgovLyBBcHAg572R5YWz5a6M5pW0562+5ZCN77yI5Y+R56CB5LiO55m75b2V5ZCM572R5YWz77yM6YG/5YWNIEg1IGF1dGhDb2RlIOWPkeeggei/myBBcHAg5rGg6ICMIEg1IGxvZ2luQnlQaG9uZSDmn6XkuI3liLDvvIkKZnVuY3Rpb24gYXBwR2F0ZXdheVNpZ24odXJsLG1ldGhvZCxwYXJhbXM9e30sYm9keT0nJyxjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCBhYz1jLmFwcHx8Yy5oNTtjb25zdCB0aW1lc3RhbXA9bmV3IERhdGUoKS5nZXRUaW1lKCk7Y29uc3Qgbm9uY2U9dGltZXN0YW1wK2dldFJhbmRvbUNoYXJzKCk7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHF1ZXJ5PXRvUXVlcnkocGFyYW1zKTtsZXQgcHJlU2lnbj0iIjtpZihTdHJpbmcobWV0aG9kKS50b1VwcGVyQ2FzZSgpPT09IkdFVCIpe2NvbnN0IHU9bmV3IFVSTCh1cmwpO3ByZVNpZ249dS5vcmlnaW4rdS5wYXRobmFtZSsocXVlcnk/Ij8iK3F1ZXJ5OiIiKTt9ZWxzZXtwcmVTaWduPXF1ZXJ5Kyhib2R5Pyh0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keSkpOiIiKTt9Y29uc3Qgc2lnbj1tZDUoc2hhMShwcmVTaWduK3BhcmFtK2FjLmFwcFNlY3JldCksMzIpLnRvU3RyaW5nKCk7cmV0dXJueydhcHBJZCc6YWMuYXBwSWQsJ25vbmNlJzpub25jZSwndGltZXN0YW1wJzpTdHJpbmcodGltZXN0YW1wKSwnc2lnbmF0dXJlJzpzaWduLCdDZm1vdG8tWC1QYXJhbSc6cGFyYW0sJ0NmbW90by1YLVNpZ24nOnNpZ24sJ0NmbW90by1YLVNpZ24tVHlwZSc6JzAnfX0KCi8vIHYyLjE2LjAg5pyN5Yqh56uv5bey5a+544CM5bimIHF1ZXJ5IOeahCBHRVTjgI3mlLbntKfvvJrluKbml6fnn63moLzlvI8gVUEg5pe25b+F6aG7IHF1ZXJ5IOWFpeetvu+8iOWQpuWImSA0MzAvMzAxMjEgcGVybWl0IGVycm9y77yJ77yMCi8vIOS4juekvuS6pOWGmeaTjeS9nOWQjOS4gOWll+etvuWQje+8iG1kNShzaGExKHF1ZXJ5K3BhcmFtK3NlY3JldCkp77yJ44CC5rWP6KeI5Zmo5peg5rOV6Ieq5a6a5LmJIENvb2tpZe+8jOS9huWunua1i+mdnuW/hemcgOOAggpmdW5jdGlvbiBhcHBRdWVyeVNpZ24ocXVlcnlTdHIsY2ZnKXtjb25zdCBjPWNmZ3x8Z2V0Q2ZnKCk7Y29uc3QgYWM9Yy5hcHB8fGMuaDU7Y29uc3QgdGltZXN0YW1wPW5ldyBEYXRlKCkuZ2V0VGltZSgpO2NvbnN0IG5vbmNlPXRpbWVzdGFtcCtnZXRSYW5kb21DaGFycygxNik7Y29uc3QgcGFyYW09ImFwcElkPSIrYWMuYXBwSWQrIiZub25jZT0iK25vbmNlKyImdGltZXN0YW1wPSIrdGltZXN0YW1wO2NvbnN0IHNpZ249bWQ1KHNoYTEoKHF1ZXJ5U3RyfHwiIikrcGFyYW0rYWMuYXBwU2VjcmV0KSwzMikudG9TdHJpbmcoKTtyZXR1cm57ImNmbW90by14LXBhcmFtIjpwYXJhbSwiY2Ztb3RvLXgtc2lnbiI6c2lnbiwiY2Ztb3RvLXgtc2lnbi10eXBlIjoiMCIsInRpbWVzdGFtcCI6U3RyaW5nKHRpbWVzdGFtcCksIm5vbmNlIjpub25jZSwic2lnbmF0dXJlIjpzaWdufX0KZnVuY3Rpb24gYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeVN0cixjZmcpe2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtjb25zdCB1YT0iTU9CSUxFfGlPU3wxNy41LjF8WkVFSE9fQVBQfDMuMC41fGlQaG9uZXxpUGhvbmUgMTUgUHJvfDExNzkqMjU1NnwiK2dldFJhbmRvbUNoYXJzKDMyKS50b1VwcGVyQ2FzZSgpKyJ8V1dBTnxpT1MiO3JldHVybnsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK2NsZWFuVG9rZW4oYWNjLnRva2VuKSwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJBY2NlcHQiOiIqLyoiLCJBY2NlcHQtTGFuZ3VhZ2UiOiJ6aC1DTiIsImFwcGlkIjpjLmFwcC5hcHBJZCwieC1hcHAtaW5mbyI6dWEsLi4uYXBwUXVlcnlTaWduKHF1ZXJ5U3RyLGMpfX0KCi8qID09PT09PT09PT09PT09PT09IEhUVFDvvIhmZXRjaCDniYjvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gaHR0cEdldCh1cmwsaGVhZGVycyx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IkdFVCIsaGVhZGVyczpoZWFkZXJzfHx7fSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFBvc3QodXJsLGhlYWRlcnMsYm9keSx0aW1lb3V0TXMpe2NvbnN0IGN0cmw9dGltZW91dE1zP0Fib3J0U2lnbmFsLnRpbWVvdXQodGltZW91dE1zKTp1bmRlZmluZWQ7dHJ5e2NvbnN0IHI9YXdhaXQgZmV0Y2godXJsLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6aGVhZGVyc3x8e30sYm9keTp0eXBlb2YgYm9keT09PSJzdHJpbmciP2JvZHk6SlNPTi5zdHJpbmdpZnkoYm9keT09bnVsbD97fTpib2R5KSxzaWduYWw6Y3RybH0pO2NvbnN0IHQ9YXdhaXQgci50ZXh0KCk7dHJ5e3JldHVybiBKU09OLnBhcnNlKHQpfWNhdGNoKGUpe3JldHVybntlcnJvcjoicGFyc2UgZXJyb3IiLHJhdzp0fX19Y2F0Y2goZSl7cmV0dXJue2Vycm9yOlN0cmluZygoZSYmZS5tZXNzYWdlKXx8ZSl9fX0KYXN5bmMgZnVuY3Rpb24gaHR0cFB1dCh1cmwsaGVhZGVycyxib2R5LHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiUFVUIixoZWFkZXJzOmhlYWRlcnN8fHt9LGJvZHk6Ym9keSE9PXVuZGVmaW5lZCYmYm9keSE9PW51bGw/KHR5cGVvZiBib2R5PT09InN0cmluZyI/Ym9keTpKU09OLnN0cmluZ2lmeShib2R5KSk6dW5kZWZpbmVkLHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQphc3luYyBmdW5jdGlvbiBodHRwRGVsZXRlKHVybCxoZWFkZXJzLHRpbWVvdXRNcyl7Y29uc3QgY3RybD10aW1lb3V0TXM/QWJvcnRTaWduYWwudGltZW91dCh0aW1lb3V0TXMpOnVuZGVmaW5lZDt0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCh1cmwse21ldGhvZDoiREVMRVRFIixoZWFkZXJzOmhlYWRlcnN8fHt9LHNpZ25hbDpjdHJsfSk7Y29uc3QgdD1hd2FpdCByLnRleHQoKTt0cnl7cmV0dXJuIEpTT04ucGFyc2UodCl9Y2F0Y2goZSl7cmV0dXJue2Vycm9yOiJwYXJzZSBlcnJvciIscmF3OnR9fX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKChlJiZlLm1lc3NhZ2UpfHxlKX19fQpmdW5jdGlvbiBuZXR3b3JrSGludChyZXMpe2NvbnN0IG09U3RyaW5nKChyZXMmJnJlcy5lcnJvcil8fCIiKTtpZigvZmFpbGVkIHRvIGZldGNofG5ldHdvcmtlcnJvcnxjb3JzfGxvYWQgZmFpbGVkfOaXoOazlei/nuaOpXznvZHnu5wvaS50ZXN0KG0pKXJldHVybiLnvZHnu5wv6Leo5Z+f5Y+X6ZmQ77ya55u06L+e5qih5byP6ZyAIFpFRUhPIOacjeWKoeerr+aUvuihjCBDT1JT77yM6K+35qOA5p+l572R57uc6L+e5o6l5ZCO6YeN6K+VIjtyZXR1cm4iIn0KCi8qID09PT09PT09PT09PT09PT09IOebtOi/nuWQjuerr++8iOa1j+iniOWZqOebtOaOpeiwgyBaRUVITyBBUEnvvIkgPT09PT09PT09PT09PT09PT0gKi8KLy8g6aG16Z2i55u06L+e5qih5byP5LiL55qE5YWc5bqV5aS077yaVUEg5pyq6Ieq5a6a5LmJ5pe25q+P5qyh6K+35rGC6ZqP5py66K6+5aSH5oyH57q577yI5LiO6ISa5pys5byV5pOO5ZCM562W55Wl77yM6YG/5YWN5Zu65a6a5oyH57q56KKr6aOO5o6n5ouJ6buR77yJCmZ1bmN0aW9uIHBhZ2VSYW5kb21VQSgpe2NvbnN0IHZlcnM9WyIxNi4xLjEiLCIxNi42LjEiLCIxNi43LjgiLCIxNy4xLjEiLCIxNy4yLjEiLCIxNy40LjEiLCIxNy41LjEiLCIxNy42LjEiLCIxOC4wIiwiMTguMS4xIiwiMTguMy4xIl07cmV0dXJuICJNT0JJTEV8aU9TfCIrdmVyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqdmVycy5sZW5ndGgpXSsifFpFRUhPX0FQUHwzLjAuMXxpUGhvbmV8IisoTWF0aC5yYW5kb20oKTwwLjc/IldXQU4iOiJXSUZJIikrInxpT1MifQpmdW5jdGlvbiBiYXNlSGVhZGVycyhhY2Mpe2NvbnN0IHVhPWFjYy51c2VyQWdlbnR8fHBhZ2VSYW5kb21VQSgpO2NvbnN0IGg9eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrY2xlYW5Ub2tlbihhY2MudG9rZW4pLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsIkFjY2VwdC1MYW5ndWFnZSI6InpoLUNOIiwiQWNjZXB0IjoiKi8qIiwiVXNlci1BZ2VudCI6dWEsIngtYXBwLWluZm8iOnVhfTtpZihhY2MudXNlcklkKXtoWyJ1c2VyX2lkIl09U3RyaW5nKGFjYy51c2VySWQpO2hbIkNvb2tpZSJdPSJ1c2VyX2lkPSIrYWNjLnVzZXJJZH1yZXR1cm4gaH0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyl7dHJ5e2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZS9saXN0IixoZWFkZXJzKTtsZXQgbGlzdD1bXTtpZihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCl7aWYoQXJyYXkuaXNBcnJheShyZXMuZGF0YSkpbGlzdD1yZXMuZGF0YTtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmxpc3QpKWxpc3Q9cmVzLmRhdGEubGlzdDtlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJlY29yZHMpKWxpc3Q9cmVzLmRhdGEucmVjb3JkcztlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJvd3MpKWxpc3Q9cmVzLmRhdGEucm93c31yZXR1cm4gbGlzdC5tYXAodj0+KHt2aW5ObzpTdHJpbmcodi52aW5Ob3x8di5mcmFtZU5vfHx2LnZpbnx8IiIpLnRyaW0oKSxuYW1lOlN0cmluZyh2LnZlaGljbGVOYW1lfHx2LnZlaGljbGVUeXBlfHx2LmRldmljZU5hbWV8fHYubmFtZXx8Iui9pui+hiIpLnRyaW0oKXx8Iui9pui+hiIscGljOlN0cmluZyh2LnZlaGljbGVQaWNVcmx8fHYucGljfHx2LmltYWdlVXJsfHwiIikudHJpbSgpLHZlaGljbGVUeXBlOlN0cmluZyh2LnZlaGljbGVUeXBlfHx2LnR5cGV8fCIiKS50cmltKCksbGljZW5zZVBsYXRlOnYubGljZW5zZVBsYXRlfHxudWxsfSkpLmZpbHRlcih2PT52LnZpbk5vKX1jYXRjaChlKXtyZXR1cm5bXX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3Qgc2lnbkg9Z2V0U2lnbigiYXBwIix7fSwnJyxjZmcpO2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvd2lkZ2V0cy8iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwidXNlcl9pZCI6YWNjLnVzZXJJZHx8IiIsLi4uc2lnbkh9KTtpZigocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCBzb2M9TnVtYmVyKGQuYm1zc29jfHxkLmJhdHRlcnlMZXZlbHx8MCk7Y29uc3QgcmFuZ2U9TnVtYmVyKGQuaG1pUmlkYWJsZU1pbGV8fGQudmVoaWNsZVJpZGFibGVNaWxlfHxkLnJpZGFibGVNaWxlYWdlfHwwKTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8MCk7Y29uc3QgbG5nU3RyPWRlZXBQaWNrKGQsWyJsb25naXR1ZGUiLCJsbmciLCJsb24iLCJncHNYIiwibG9uZ2l0dWRlVmFsdWUiLCJjb29yZFgiLCJ4Il0pO2NvbnN0IGxhdFN0cj1kZWVwUGljayhkLFsibGF0aXR1ZGUiLCJsYXQiLCJncHNZIiwibGF0aXR1ZGVWYWx1ZSIsImNvb3JkWSIsInkiXSk7Y29uc3QgbG9uZ2l0dWRlPU51bWJlcihsbmdTdHIpLGxhdGl0dWRlPU51bWJlcihsYXRTdHIpO3JldHVybntiYXR0ZXJ5UGVyY2VudDpNYXRoLm1heCgwLE1hdGgubWluKDEwMCxpc0Zpbml0ZShzb2MpP3NvYzowKSkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowLHZvbHRhZ2U6aXNGaW5pdGUodm9sdGFnZSkmJnZvbHRhZ2U+MD92b2x0YWdlOjAsYWRkcmVzczpTdHJpbmcoZC5hZGRyZXNzfHwiIikudHJpbSgpLGxvY2F0aW9uVGltZTpTdHJpbmcoZC5sb2NhdGlvbj8ubG9jYXRpb25UaW1lfHwiIikudHJpbSgpLHZlaGljbGVOYW1lOlN0cmluZyhkLnZlaGljbGVOYW1lfHwiIikudHJpbSgpLHZlaGljbGVJbWFnZVVybDpTdHJpbmcoZC52ZWhpY2xlU2NhbGVQaWNVcmx8fGQudmVoaWNsZVBpY1VybHx8IiIpLnRyaW0oKSxoZWFkTG9ja1N0YXRlOlN0cmluZyhkLmhlYWRMb2NrU3RhdGV8fCIiKS50cmltKCksYmF0dGVyeVB1bGxPdXQ6U3RyaW5nKGQuYmF0dGVyeVB1bGxPdXRGbGFnfHwiIik9PT0iMSIsb25saW5lOlN0cmluZyhkLm9ubGluZVN0YXR1c3x8ZC5vbmxpbmV8fGQubmV0U3RhdHVzfHxkLnRib3hTdGF0dXN8fGQuZGV2aWNlT25saW5lfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIixwb3dlclN0YXR1czpTdHJpbmcoZC5hY2NTdGF0dXN8fGQucG93ZXJTdGF0dXN8fGQudmVoaWNsZVN0YXR1c3x8ZC5pZ25pdGlvblN0YXR1c3x8ZC5wb3dlck1vZGV8fGQuYWNjU3RhdGV8fGQucG93ZXJTdGF0ZXx8ZC52ZWhpY2xlU3RhdGV8fGQuZW5naW5lU3RhdHVzfHxkLmlzUG93ZXJPbnx8ZC5wb3dlck9ufHwiIikudHJpbSgpLGxvY2tTdGF0ZTpTdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGQuY2FyTG9ja1N0YXRlfHxkLmRvb3JMb2NrU3RhdGV8fGQubG9ja0ZsYWd8fGQuaXNMb2NrZWR8fGQubG9ja2VkfHxkLmNlbnRyYWxMb2NraW5nU3RhdHVzfHwiIikudHJpbSgpfX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFZlaGljbGVIb21lUGFnZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgZGV2aWNlSWQ9Z2V0RGV2aWNlSWRlbnRpZnkoYWNjKTtjb25zdCBxdWVyeT0idW5pcXVlSWRlbnRpZnk9IitkZXZpY2VJZCsiJnBob25lRGV2aWNlTmFtZT1pb3NfIitkZXZpY2VJZDtjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUhvbWVQYWdlVjIvIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyI/IitxdWVyeTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCh1cmwsYXBwUXVlcnlIZWFkZXJzKGFjYyxxdWVyeSxjZmcpKTtpZihyZXMmJihyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBkPXJlcy5kYXRhO2NvbnN0IHZlaGljbGVMb2NrPXBpY2tJb3RQcm9wKGQsIlZlaGljbGVMb2NrX1MiKTtjb25zdCBoZWFkTG9ja0lvdD1waWNrSW90UHJvcChkLCJIZWFkTG9ja1N0YXRlIik7Y29uc3QgdG9wTG9jaz1TdHJpbmcoZC5oZWFkTG9ja1N0YXRlfHxkLmxvY2tTdGF0ZXx8ZC5sb2NrU3RhdHVzfHxkLnZlaGljbGVMb2NrU3RhdGV8fGhlYWRMb2NrSW90fHx2ZWhpY2xlTG9ja3x8IiIpLnRyaW0oKTtjb25zdCBsbmdTdHI9ZGVlcFBpY2soZCxbImxvbmdpdHVkZSIsImxuZyIsImxvbiIsImdwc1giLCJsb25naXR1ZGVWYWx1ZSIsImNvb3JkWCIsIngiXSk7Y29uc3QgbGF0U3RyPWRlZXBQaWNrKGQsWyJsYXRpdHVkZSIsImxhdCIsImdwc1kiLCJsYXRpdHVkZVZhbHVlIiwiY29vcmRZIiwieSJdKTtjb25zdCBsb25naXR1ZGU9TnVtYmVyKGxuZ1N0ciksbGF0aXR1ZGU9TnVtYmVyKGxhdFN0cik7cmV0dXJue3Bvd2VyU3RhdHVzOmRlZXBQaWNrKGQsWyJhY2NTdGF0dXMiLCJwb3dlclN0YXR1cyIsInZlaGljbGVTdGF0dXMiLCJpZ25pdGlvblN0YXR1cyIsInBvd2VyTW9kZSIsImFjY1N0YXRlIiwicG93ZXJTdGF0ZSIsInZlaGljbGVTdGF0ZSIsImVuZ2luZVN0YXR1cyIsImlzUG93ZXJPbiIsInBvd2VyT24iLCJhY2MiXSkudHJpbSgpLGxvY2tTdGF0ZTp0b3BMb2NrLG9ubGluZTpTdHJpbmcoZC5vbmxpbmVTdGF0dXN8fGQucmlkZVN0YXRlfHxkLm9ubGluZXx8ZC5uZXRTdGF0dXN8fGQudGJveFN0YXR1c3x8IiIpLnRyaW0oKSxyaWRlU3RhdGU6U3RyaW5nKGQucmlkZVN0YXRlfHwiIikudHJpbSgpLGN1c2hpb25TdGF0ZTpkZWVwUGljayhkLFsiY3VzaGlvblN0YXRlIiwiY3VzaGlvblN0YXR1cyIsImN1c2hpb25Mb2NrU3RhdGUiLCJzZWF0U3RhdGUiLCJzZWF0U3RhdHVzIiwic2VhdExvY2tTdGF0ZSIsInNhZGRsZVN0YXRlIiwic2FkZGxlU3RhdHVzIiwic2FkZGxlTG9ja1N0YXRlIl0pLGxvbmdpdHVkZTooaXNGaW5pdGUobG9uZ2l0dWRlKSYmTWF0aC5hYnMobG9uZ2l0dWRlKTw9MTgwJiZsb25naXR1ZGUhPT0wKT9sb25naXR1ZGU6IiIsbGF0aXR1ZGU6KGlzRmluaXRlKGxhdGl0dWRlKSYmTWF0aC5hYnMobGF0aXR1ZGUpPD05MCYmbGF0aXR1ZGUhPT0wKT9sYXRpdHVkZToiIn19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hUaXJlUHJlc3N1cmUoYWNjLGNmZyx2aW5Obyl7dHJ5e2NvbnN0IHF1ZXJ5PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZ0aW1lUGVyaW9kVHlwZT0xIjtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9hcHAvdmVoaWNsZS90aXJlL21vbml0b3Jpbmc/IitxdWVyeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHF1ZXJ5LGNmZykpO2lmKChyZXMuY29kZT09IjEwMDAwInx8cmVzLmNvZGU9PT0xMDAwMCkmJnJlcy5kYXRhKXtjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkocmVzLmRhdGEucmVhbFRpbWVEYXRhKT9yZXMuZGF0YS5yZWFsVGltZURhdGE6KEFycmF5LmlzQXJyYXkocmVzLmRhdGEpP3Jlcy5kYXRhOltdKTtjb25zdCBieVBvcz17fTtmb3IoY29uc3QgaXQgb2YgbGlzdCl7Y29uc3QgcG9zPU51bWJlcihpdD8uc2Vuc29yUG9zaXRpb24pO2lmKHBvcylieVBvc1twb3NdPWl0fWNvbnN0IGZtdD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PVN0cmluZyhpdD8udGlyZVByZXNzdXJlPz8iIikudHJpbSgpO2NvbnN0IG49cGFyc2VGbG9hdCh2KTtpZih3YXJuIT09MHx8IXZ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4i5pyq57uR5a6aIjtyZXR1cm4gdisiYmFyIn07Y29uc3QgZm10VGVtcD0oaXQpPT57Y29uc3Qgd2Fybj1OdW1iZXIoaXQ/Lndhcm5pbmdUeXBlPz8wKTtjb25zdCB2PWl0Py50aXJlVGVtcDtpZih3YXJuIT09MHx8dj09bnVsbClyZXR1cm4iIjtjb25zdCBzPVN0cmluZyh2KS50cmltKCk7Y29uc3Qgbj1wYXJzZUZsb2F0KHMpO2lmKCFzfHxzLnRvTG93ZXJDYXNlKCk9PT0ibnVsbCJ8fCFpc0Zpbml0ZShuKXx8bjw9MClyZXR1cm4iIjtyZXR1cm4gcysiwrBDIn07Y29uc3QgZnJvbnQ9YnlQb3NbMV18fGxpc3RbMF07Y29uc3QgcmVhcj1ieVBvc1syXXx8bGlzdFsxXTtyZXR1cm57ZnJvbnRQcmVzc3VyZTpmcm9udD9mbXQoZnJvbnQpOiLmnKrnu5HlrpoiLHJlYXJQcmVzc3VyZTpyZWFyP2ZtdChyZWFyKToi5pyq57uR5a6aIixmcm9udFRlbXA6ZnJvbnQ/Zm10VGVtcChmcm9udCk6IiIscmVhclRlbXA6cmVhcj9mbXRUZW1wKHJlYXIpOiIifX1yZXR1cm4gbnVsbH1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVJbmZvKGFjYyxjZmcsdmluTm8pe3RyeXtjb25zdCBtb250aD1uZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHFIb21lPSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5Obyk7Y29uc3QgcU15PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZtb250aD0iK21vbnRoO2NvbnN0IFtob21lUmVzLG15UmVzXT1hd2FpdCBQcm9taXNlLmFsbChbaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC9ob21lUmlkZUluZm8/IitxSG9tZSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFIb21lLGNmZykpLGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvbXlSaWRlSW5mbz8iK3FNeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHFNeSxjZmcpKV0pO2NvbnN0IGg9aG9tZVJlcz8uZGF0YXx8aG9tZVJlc3x8e307Y29uc3QgZD1teVJlcz8uZGF0YXx8bXlSZXN8fHt9O2NvbnN0IGxpc3Q9QXJyYXkuaXNBcnJheShkLnJpZGVSZWNvcmRMaXN0KT9kLnJpZGVSZWNvcmRMaXN0OltdO2NvbnN0IHRvZGF5S2V5PW5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IGRheT1saXN0LmZpbmQoeD0+U3RyaW5nKHg/LmRhdGV8fCIiKT09PXRvZGF5S2V5KXx8bGlzdFtsaXN0Lmxlbmd0aC0xXXx8e307Y29uc3QgeWVzdD1uZXcgRGF0ZShEYXRlLm5vdygpLTg2NDAwMDAwKTtjb25zdCB5ZXN0S2V5PXllc3QuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKHllc3QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyh5ZXN0LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHlkPWxpc3QuZmluZCh4PT5TdHJpbmcoeD8uZGF0ZXx8IiIpPT09eWVzdEtleSl8fHt9O3JldHVybnt0b2RheURpc3RhbmNlOk51bWJlcihkYXkucmlkZU1pbGVhZ2U/P2gucmlkZU1pbGVhZ2VEYXk/PzApLHRvZGF5RHVyYXRpb246TnVtYmVyKGRheS5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZT8/aC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApLHRvZGF5TWF4U3BlZWQ6TnVtYmVyKGRheS5tYXhTcGVlZD8/MCksdG90YWxNaWxlYWdlOk51bWJlcihkLnJpZGVNaWxlYWdlVG90YWw/PzApLHllc3RlcmRheURpc3RhbmNlOk51bWJlcih5ZC5yaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVNaWxlYWdlOk51bWJlcihoLmxhc3RSaWRlTWlsZWFnZT8/MCksbGFzdFJpZGVEdXJhdGlvbjpOdW1iZXIoaC5sYXN0UmlkaW5nVGltZVVuaXRNaW51dGU/PzApfX1jYXRjaChlKXtyZXR1cm4gbnVsbH19Cgphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlDaGFyZ2VTdGF0ZShhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCBoZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsImFwcGlkIjpjZmcuYXBwLmFwcElkLCJ1c2VyX2lkIjphY2MudXNlcklkfHwiIiwuLi5zaWduSH07Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGhlYWRlcnMpO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7Y29uc3QgZD1yZXMuZGF0YTtjb25zdCB2b2x0YWdlPU51bWJlcihkLnZvbHRhZ2V8fGQuYmF0dGVyeVZvbHRhZ2V8fGQuYm1zVm9sdGFnZXx8ZC50b3RhbFZvbHRhZ2V8fGQuYmF0dGVyeVRvdGFsVm9sdGFnZXx8ZC52b2x8fGQuYmF0Vm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sfHwwKTtjb25zdCBjdXJyZW50PU51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8ZC5jdXJ8fGQuYmF0dGVyeUN1cnx8MCk7Y29uc3QgYmF0dGVyeVRlbXA9TnVtYmVyKGQuYmF0dGVyeVRlbXB8fGQuYmF0VGVtcHx8ZC50ZW1wfHxkLnRlbXBlcmF0dXJlfHxkLmJtc1RlbXB8fGQuYmF0dGVyeVRlbXBlcmF0dXJlfHwwKTtjb25zdCByYW5nZT1OdW1iZXIoZC5obWlSaWRhYmxlTWlsZXx8ZC52ZWhpY2xlUmlkYWJsZU1pbGV8fGQucmlkYWJsZU1pbGVhZ2V8fGQucmVzaWR1YWxSYW5nZXx8MCk7cmV0dXJue2NoYXJnZVN0YXRlOlN0cmluZyhkLmNoYXJnZVN0YXRlU3RyfHxkLmNoYXJnZVN0YXRlfHwi5pyq5YWF55S1Iiksdm9sdGFnZTppc0Zpbml0ZSh2b2x0YWdlKSYmdm9sdGFnZT4wP3ZvbHRhZ2U6MCxjdXJyZW50OmlzRmluaXRlKGN1cnJlbnQpP2N1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDppc0Zpbml0ZShiYXR0ZXJ5VGVtcCk/YmF0dGVyeVRlbXA6MCxzb2M6TnVtYmVyKGQuc29jfHxkLmJtc3NvY3x8MCkscmVzaWR1YWxSYW5nZUttOmlzRmluaXRlKHJhbmdlKT9yYW5nZTowfX1yZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX1jYXRjaChlKXtyZXR1cm57Y2hhcmdlU3RhdGU6IuacquWFheeUtSIsdm9sdGFnZTowLGN1cnJlbnQ6MCxiYXR0ZXJ5VGVtcDowLHNvYzowLHJlc2lkdWFsUmFuZ2VLbTowfX19Cgphc3luYyBmdW5jdGlvbiBmZXRjaFNlcnZpY2VSZWNoYXJnZURldGFpbChhY2MsY2ZnLHZpbk5vKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHNpZ25IPWdldFNpZ24oImg1Iix7dmluTm86dmluTm99LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLC4uLnNpZ25IfTtpZihhY2MudXNlcklkKWhlYWRlcnNbInVzZXJfaWQiXT1TdHJpbmcoYWNjLnVzZXJJZCk7Y29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVyYXBwL2FwcC9zZXJ2aWNlL3JlY2hhcmdlL3ZlaGljbGUvZGV0YWlsP3Zpbk5vPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbk5vKSxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe3JldHVybntyZWNoYXJnZUVuZERhdGU6U3RyaW5nKHJlcy5kYXRhLnJlY2hhcmdlRW5kRGF0ZXx8IiIpLGxhc3RVc2VEYXRlOk51bWJlcihyZXMuZGF0YS5sYXN0VXNlRGF0ZSl8fDAsc2VydmljZVJlY2hhcmdlU3RhdHVzOlN0cmluZyhyZXMuZGF0YS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiKSx2ZWhpY2xlTmFtZTpTdHJpbmcocmVzLmRhdGEudmVoaWNsZU5hbWV8fCIiKX19cmV0dXJuIG51bGx9Y2F0Y2goZSl7cmV0dXJuIG51bGx9fQoKYXN5bmMgZnVuY3Rpb24gZmV0Y2hWZWhpY2xlSW5mbyhhY2MsY2ZnKXtjb25zdCByZXN1bHQ9e2hhc1ZlaGljbGU6ZmFsc2UsdmVoaWNsZU5hbWU6IiIsdmVoaWNsZU1vZGVsOiIiLHZpbk5vOiIiLHZvbHRhZ2U6MCxjdXJyZW50OjAsYmF0dGVyeVRlbXA6MCxiYXR0ZXJ5UGVyY2VudDowLHJlc2lkdWFsUmFuZ2VLbTowLHJhbmdlRXN0aW1hdGVkOmZhbHNlLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGZyb250UHJlc3N1cmU6IiIscmVhclByZXNzdXJlOiIiLGZyb250VGVtcDoiIixyZWFyVGVtcDoiIix0b2RheURpc3RhbmNlOjAsdG9kYXlEdXJhdGlvbjowLHRvZGF5TWF4U3BlZWQ6MCxsYXN0UmlkZU1pbGVhZ2U6MCxsYXN0UmlkZUR1cmF0aW9uOjAsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCx2ZWhpY2xlSW1hZ2VVcmw6IiIsc2VydmljZUVuZERhdGU6IiIsc2VydmljZVJlbWFpbkRheXM6MCxzZXJ2aWNlU3RhdHVzOiIiLHBvd2VyU3RhdHVzOiIiLGxvY2tTdGF0ZToiIixvbmxpbmU6IiIscmlkZVN0YXRlOiIiLGN1c2hpb25TdGF0ZToiIixsb25naXR1ZGU6IiIsbGF0aXR1ZGU6IiJ9O3RyeXtjb25zdCBhbGxWZWhpY2xlcz1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjZmcpO2NvbnN0IHZlaGljbGVzPWFsbFZlaGljbGVzLmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZih2ZWhpY2xlcy5sZW5ndGg9PT0wKXJldHVybiByZXN1bHQ7Y29uc3Qgdj12ZWhpY2xlc1swXTtyZXN1bHQuaGFzVmVoaWNsZT10cnVlO3Jlc3VsdC52ZWhpY2xlTmFtZT12Lm5hbWU7cmVzdWx0LnZpbk5vPXYudmluTm87cmVzdWx0LnZlaGljbGVJbWFnZVVybD12LnBpYztyZXN1bHQudmVoaWNsZU1vZGVsPXYudmVoaWNsZVR5cGV8fCIiO2NvbnN0IFt3aWRnZXRzLHRpcmUscmlkZSxiYXR0ZXJ5LHNlcnZpY2UsaG9tZVBhZ2VdPWF3YWl0IFByb21pc2UuYWxsKFtmZXRjaFZlaGljbGVXaWRnZXRzKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoVGlyZVByZXNzdXJlKGFjYyxjZmcsdi52aW5ObykuY2F0Y2goKCk9Pm51bGwpLGZldGNoUmlkZUluZm8oYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hCYXR0ZXJ5Q2hhcmdlU3RhdGUoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+KHtjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjAsY3VycmVudDowLGJhdHRlcnlUZW1wOjAsc29jOjB9KSksZmV0Y2hTZXJ2aWNlUmVjaGFyZ2VEZXRhaWwoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCksZmV0Y2hWZWhpY2xlSG9tZVBhZ2UoYWNjLGNmZyx2LnZpbk5vKS5jYXRjaCgoKT0+bnVsbCldKTtpZih3aWRnZXRzKXtyZXN1bHQuYmF0dGVyeVBlcmNlbnQ9d2lkZ2V0cy5iYXR0ZXJ5UGVyY2VudDtyZXN1bHQucmVzaWR1YWxSYW5nZUttPXdpZGdldHMucmVzaWR1YWxSYW5nZUttO3Jlc3VsdC52b2x0YWdlPXdpZGdldHMudm9sdGFnZTtyZXN1bHQuYWRkcmVzcz13aWRnZXRzLmFkZHJlc3M7cmVzdWx0LmxvY2F0aW9uVGltZT13aWRnZXRzLmxvY2F0aW9uVGltZTtyZXN1bHQucG93ZXJTdGF0dXM9d2lkZ2V0cy5wb3dlclN0YXR1c3x8IiI7cmVzdWx0LmxvY2tTdGF0ZT13aWRnZXRzLmxvY2tTdGF0ZXx8IiI7aWYod2lkZ2V0cy52ZWhpY2xlTmFtZSlyZXN1bHQudmVoaWNsZU5hbWU9d2lkZ2V0cy52ZWhpY2xlTmFtZTtpZih3aWRnZXRzLnZlaGljbGVJbWFnZVVybClyZXN1bHQudmVoaWNsZUltYWdlVXJsPXdpZGdldHMudmVoaWNsZUltYWdlVXJsO2lmKHdpZGdldHMub25saW5lKXJlc3VsdC5vbmxpbmU9d2lkZ2V0cy5vbmxpbmU7aWYod2lkZ2V0cy5jdXNoaW9uU3RhdGUpcmVzdWx0LmN1c2hpb25TdGF0ZT13aWRnZXRzLmN1c2hpb25TdGF0ZTtpZih3aWRnZXRzLmxvbmdpdHVkZSE9PSIiJiZ3aWRnZXRzLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPXdpZGdldHMubG9uZ2l0dWRlO2lmKHdpZGdldHMubGF0aXR1ZGUhPT0iIiYmd2lkZ2V0cy5sYXRpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubGF0aXR1ZGU9d2lkZ2V0cy5sYXRpdHVkZX1pZihob21lUGFnZSl7aWYoaG9tZVBhZ2UucG93ZXJTdGF0dXMpcmVzdWx0LnBvd2VyU3RhdHVzPWhvbWVQYWdlLnBvd2VyU3RhdHVzO2lmKGhvbWVQYWdlLmxvY2tTdGF0ZSlyZXN1bHQubG9ja1N0YXRlPWhvbWVQYWdlLmxvY2tTdGF0ZTtpZihob21lUGFnZS5vbmxpbmUpcmVzdWx0Lm9ubGluZT1ob21lUGFnZS5vbmxpbmU7aWYoaG9tZVBhZ2UucmlkZVN0YXRlKXJlc3VsdC5yaWRlU3RhdGU9aG9tZVBhZ2UucmlkZVN0YXRlO2lmKGhvbWVQYWdlLmN1c2hpb25TdGF0ZSlyZXN1bHQuY3VzaGlvblN0YXRlPWhvbWVQYWdlLmN1c2hpb25TdGF0ZTtpZigocmVzdWx0LmxvbmdpdHVkZT09PSIifHxyZXN1bHQubG9uZ2l0dWRlPT09dW5kZWZpbmVkKSYmaG9tZVBhZ2UubG9uZ2l0dWRlIT09IiImJmhvbWVQYWdlLmxvbmdpdHVkZSE9PXVuZGVmaW5lZClyZXN1bHQubG9uZ2l0dWRlPWhvbWVQYWdlLmxvbmdpdHVkZTtpZigocmVzdWx0LmxhdGl0dWRlPT09IiJ8fHJlc3VsdC5sYXRpdHVkZT09PXVuZGVmaW5lZCkmJmhvbWVQYWdlLmxhdGl0dWRlIT09IiImJmhvbWVQYWdlLmxhdGl0dWRlIT09dW5kZWZpbmVkKXJlc3VsdC5sYXRpdHVkZT1ob21lUGFnZS5sYXRpdHVkZX1pZih0aXJlKXtyZXN1bHQuZnJvbnRQcmVzc3VyZT10aXJlLmZyb250UHJlc3N1cmU7cmVzdWx0LnJlYXJQcmVzc3VyZT10aXJlLnJlYXJQcmVzc3VyZTtyZXN1bHQuZnJvbnRUZW1wPXRpcmUuZnJvbnRUZW1wO3Jlc3VsdC5yZWFyVGVtcD10aXJlLnJlYXJUZW1wfWlmKHJpZGUpe3Jlc3VsdC50b2RheURpc3RhbmNlPXJpZGUudG9kYXlEaXN0YW5jZTtyZXN1bHQudG9kYXlEdXJhdGlvbj1yaWRlLnRvZGF5RHVyYXRpb247cmVzdWx0LnRvZGF5TWF4U3BlZWQ9cmlkZS50b2RheU1heFNwZWVkO3Jlc3VsdC5sYXN0UmlkZU1pbGVhZ2U9cmlkZS5sYXN0UmlkZU1pbGVhZ2U7cmVzdWx0Lmxhc3RSaWRlRHVyYXRpb249cmlkZS5sYXN0UmlkZUR1cmF0aW9ufHwwO3Jlc3VsdC50b3RhbE1pbGVhZ2U9cmlkZS50b3RhbE1pbGVhZ2V8fDA7cmVzdWx0Lnllc3RlcmRheURpc3RhbmNlPXJpZGUueWVzdGVyZGF5RGlzdGFuY2V8fDB9cmVzdWx0LmNoYXJnZVN0YXRlPWJhdHRlcnkuY2hhcmdlU3RhdGV8fCLmnKrlhYXnlLUiO2lmKGJhdHRlcnkudm9sdGFnZSlyZXN1bHQudm9sdGFnZT1iYXR0ZXJ5LnZvbHRhZ2U7aWYoYmF0dGVyeS5jdXJyZW50KXJlc3VsdC5jdXJyZW50PWJhdHRlcnkuY3VycmVudDtpZihiYXR0ZXJ5LmJhdHRlcnlUZW1wKXJlc3VsdC5iYXR0ZXJ5VGVtcD1iYXR0ZXJ5LmJhdHRlcnlUZW1wO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZiYXR0ZXJ5LnJlc2lkdWFsUmFuZ2VLbSlyZXN1bHQucmVzaWR1YWxSYW5nZUttPWJhdHRlcnkucmVzaWR1YWxSYW5nZUttO2lmKCghcmVzdWx0LnJlc2lkdWFsUmFuZ2VLbXx8cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT09PTApJiZyZXN1bHQuYmF0dGVyeVBlcmNlbnQ+MCl7cmVzdWx0LnJlc2lkdWFsUmFuZ2VLbT1NYXRoLnJvdW5kKHJlc3VsdC5iYXR0ZXJ5UGVyY2VudCoxLjUpO3Jlc3VsdC5yYW5nZUVzdGltYXRlZD10cnVlfWlmKHNlcnZpY2Upe3Jlc3VsdC5zZXJ2aWNlRW5kRGF0ZT1zZXJ2aWNlLnJlY2hhcmdlRW5kRGF0ZXx8IiI7cmVzdWx0LnNlcnZpY2VTdGF0dXM9c2VydmljZS5zZXJ2aWNlUmVjaGFyZ2VTdGF0dXN8fCIiO3Jlc3VsdC5zZXJ2aWNlUmVtYWluRGF5cz1zZXJ2aWNlLmxhc3RVc2VEYXRlfHwwO2lmKHNlcnZpY2UudmVoaWNsZU5hbWUpcmVzdWx0LnZlaGljbGVOYW1lPXNlcnZpY2UudmVoaWNsZU5hbWV9fWNhdGNoKGUpe31yZXR1cm4gcmVzdWx0fQoKYXN5bmMgZnVuY3Rpb24gY2hlY2tUb2tlbihhY2MsY2ZnKXt0cnl7Y29uc3QgdG9rZW49Y2xlYW5Ub2tlbihhY2MudG9rZW4pO2NvbnN0IHVzZXJJZD1hY2MudXNlcklkfHwiIjtpZighdXNlcklkKXJldHVybnt2YWxpZDp0cnVlLHNjb3JlOjAsdXNlck5hbWU6YWNjLnVzZXJOYW1lfTtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9O2NvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCxoZWFkZXJzKTtpZihyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpcmV0dXJue3ZhbGlkOnRydWUsc2NvcmU6TnVtYmVyKHJlcy5kYXRhLnNjb3JlKXx8MCx1c2VyTmFtZTpyZXMuZGF0YS5uaWNrTmFtZXx8YWNjLnVzZXJOYW1lfTtpZihyZXMuY29kZT09IjQwMDAxInx8cmVzLmNvZGU9PTQwMSlyZXR1cm57dmFsaWQ6ZmFsc2UscmVhc29uOiJ0b2tlbuW3sui/h+acnyJ9O3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpyZXMubWVzc2FnZXx8Iuivt+axguW8guW4uCJ9fWNhdGNoKGUpe3JldHVybnt2YWxpZDp0cnVlLHJlYXNvbjpTdHJpbmcoZSl9fX0KCmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJpZEJ5VG9rZW4odG9rZW4sY2ZnKXtjb25zdCB0PWNsZWFuVG9rZW4odG9rZW4pO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3QsIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIn07bGV0IHVzZXJJZD0iIix1c2VyTmFtZT0iIixlcnJvcj1udWxsO3RyeXtjb25zdCBzaWduSDA9Z2V0U2lnbigiaDUiLHtzZXJ2ZXJfbmFtZToiU01BUlQifSwnJyxjZmcpO2NvbnN0IHJlczA9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL2Jhc2VJbmZvP3NlcnZlcl9uYW1lPVNNQVJUIix7Li4uYmFzZUhlYWRlcnMsLi4uc2lnbkgwfSk7aWYocmVzMCYmU3RyaW5nKHJlczAuY29kZSk9PT0iMTAwMDAiJiZyZXMwLmRhdGEpe3VzZXJJZD1TdHJpbmcocmVzMC5kYXRhLmlkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlczAuZGF0YS5uaWNrTmFtZXx8IiIpfX1jYXRjaChlKXt9aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL3NldHRpbmciLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2lmKHJlcy5jb2RlPT0iMTAwMDAiJiZyZXMuZGF0YSl7dXNlcklkPVN0cmluZyhyZXMuZGF0YS5pZHx8cmVzLmRhdGEudXNlcklkfHwiIik7dXNlck5hbWU9U3RyaW5nKHJlcy5kYXRhLm5pY2tOYW1lfHwiIil9fWNhdGNoKGUpe319aWYoIXVzZXJJZCl7dHJ5e2NvbnN0IHNpZ25IPWdldFNpZ24oImFwcCIse30sJycsY2ZnKTtjb25zdCByZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlL2xpc3QiLHsuLi5iYXNlSGVhZGVycywuLi5zaWduSH0pO2NvbnN0IGZpbmQ9KG9iaixkZXB0aCk9PntpZighb2JqfHxkZXB0aD41KXJldHVybiIiO2Zvcihjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob2JqKSl7Y29uc3QgdmFsPW9ialtrZXldO2lmKC91c2VyLj9pZHx1aWR8Y3JlYXRlLj9ieXxvd25lci4/aWQvaS50ZXN0KGtleSkmJnZhbCYmdHlwZW9mIHZhbCE9PSJvYmplY3QiKXtjb25zdCBzPVN0cmluZyh2YWwpO2lmKHMubGVuZ3RoPj0xMCYmL15cZCskLy50ZXN0KHMpKXJldHVybiBzfWlmKHZhbCYmdHlwZW9mIHZhbD09PSJvYmplY3QiKXtjb25zdCBmPWZpbmQodmFsLGRlcHRoKzEpO2lmKGYpcmV0dXJuIGZ9fXJldHVybiIifTtjb25zdCB1aWQ9ZmluZChyZXMsMCk7aWYodWlkKXt1c2VySWQ9dWlkO2NvbnN0IGZpbmROYW1lPShvYmosZGVwdGgpPT57aWYoIW9ianx8ZGVwdGg+NClyZXR1cm4iIjtmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG9iaikpe2lmKC9uaWNrLj9uYW1lfHVzZXIuP25hbWUvaS50ZXN0KGtleSkmJm9ialtrZXldJiZ0eXBlb2Ygb2JqW2tleV09PT0ic3RyaW5nIilyZXR1cm4gb2JqW2tleV07aWYob2JqW2tleV0mJnR5cGVvZiBvYmpba2V5XT09PSJvYmplY3QiKXtjb25zdCBuPWZpbmROYW1lKG9ialtrZXldLGRlcHRoKzEpO2lmKG4pcmV0dXJuIG59fXJldHVybiIifTt1c2VyTmFtZT1maW5kTmFtZShyZXMsMCl9fWNhdGNoKGUpe319aWYoIXVzZXJJZCllcnJvcj0i6Ieq5Yqo6I635Y+W5aSx6LSl77yM6K+35omL5Yqo5aGr5YaZ55So5oi3SUQiO3JldHVybntvazohIXVzZXJJZCx1c2VySWQsdXNlck5hbWUsZXJyb3J9fQovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi4wIOmakOiXj+mqkeihjOaVsOaNru+8iOi9qOi/ueino+aekCArIOaApeWIuS/ljovlvK/mo4DmtYvvvIk9PT09PT09PT09PT09PT09PSAqLwovKiDlrpjmlrkgQXBwIOaKiuOAjOaegemAnyAvIOaApeWKoOmAnyAvIOaApeWIuSAvIOWOi+W8r+OAjeiXj+S6hui1t+adpe+8iOacjeWKoeerr+iDveWKm+S9jSB2ZWhpY2xlS2luZHMgLyBjeWNsaW5nRXZlbnRTdGF0aXN0aWNGbGFnIOaOp+WItu+8ieOAggogICDmnKzpobXku44gcmlkZXRyYWNrX3YyIOeahOWOn+Wni+i9qOi/uemHjeeul+i/meS6m+aMh+agh++8m+eul+azleS4jumYiOWAvOmAkOihjOenu+akjeiHqiBaRUVITyBTcGVlZEh1bnRlcgogICDvvIhnaXRodWIuY29tL1J5YW5ZdUZpc2gvWmVlaG8tU3BlZWRIdW50ZXLvvIxBR1BMLTMuMO+8ieeahCBSaWRlQ29uZmlnIC8gVHJhY2tDYWxjdWxhdG9yIC8gQnJha2VEZXRlY3RvciAvIEJlbmREZXRlY3RvcuOAggogICDovajov7nkuLLmoLzlvI/vvJpsb24sbGF0LHNwZWVkLHRzWyxkaXJdJi4uLu+8iHJpZGV0cmFja192MiDnmoQgdHJhamVjdG9yeSDlrZfmrrXljp/moLfvvIkgKi8KLyogX19SSURFX0FMR09fQkVHSU5fXyAqLwp2YXIgUklERV9DRkc9e0JFTkRfVl9NSU46MjAsQkVORF9TRUVEOjUsQkVORF9DVU1fTUlOOjE1LEJFTkRfQ1VNX0NBUDo5MCxCRU5EX0NPRUY6MS4wLEJFTkRfVl9NQVg6ODAsQkVORF9NSU5fS006MS4wLEJFTkRfU1RFUF9NQVg6NDUsQkVORF9SVU5fTUlOOjEsQkVORF9NRVJHRV9HQVA6MCxCRU5EX0FMTE9XX0dBUDowLEJFTkRfU0VHX0RJU1RfTUlOOjYsQkVORF9HQVBfTVNfTUFYOjI1MDAwLEJSQUtFX1ZfTUlOOjE1LEJSQUtFX1dJTl9MQVJHRTo1LEJSQUtFX1dJTl9TTUFMTDozLEJSQUtFX0RWX0xBUkdFOjE1LEJSQUtFX0RWX1NNQUxMOjIwLEJSQUtFX0FfTUlOOjAuNSxCUkFLRV9NRVJHRV9HQVA6NSxCUkFLRV9NSU5fRFVSOjEuNSxCUkFLRV9DQUxJQjoyLjUsTU9WSU5HX1ZfTUlOOjUsTUlOX1BPSU5UUzo0LEVBUlRIX1I6NjM3MTAwMH07CmZ1bmN0aW9uIHJpZGVOdW0odil7Y29uc3Qgbj1OdW1iZXIodik7cmV0dXJuIGlzRmluaXRlKG4pP246MH0KZnVuY3Rpb24gcmlkZVBhcnNlVHJhY2soc3RyKXsKICBjb25zdCBwdHM9W107CiAgaWYoIXN0cilyZXR1cm4gcHRzOwogIGNvbnN0IHNlZz1TdHJpbmcoc3RyKS5zcGxpdCgiJiIpOwogIGZvcihjb25zdCBzIG9mIHNlZyl7CiAgICBpZighcyljb250aW51ZTsKICAgIGNvbnN0IHA9cy5zcGxpdCgiLCIpOwogICAgaWYocC5sZW5ndGg8NCljb250aW51ZTsKICAgIGNvbnN0IGxvbj1wYXJzZUZsb2F0KHBbMF0pLGxhdD1wYXJzZUZsb2F0KHBbMV0pLHY9cGFyc2VGbG9hdChwWzJdKSx0PXBhcnNlRmxvYXQocFszXSk7CiAgICBpZighaXNGaW5pdGUobG9uKXx8IWlzRmluaXRlKGxhdCl8fCFpc0Zpbml0ZSh2KXx8IWlzRmluaXRlKHQpKWNvbnRpbnVlOwogICAgcHRzLnB1c2goe2xvbjpsb24sbGF0OmxhdCx2OnYsdDp0fSk7CiAgfQogIHJldHVybiBwdHM7Cn0KZnVuY3Rpb24gcmlkZUhhdmVyc2luZShsb24xLGxhdDEsbG9uMixsYXQyKXsKICBjb25zdCBkTGF0PShsYXQyLWxhdDEpKk1hdGguUEkvMTgwLGRMb249KGxvbjItbG9uMSkqTWF0aC5QSS8xODA7CiAgY29uc3QgYT1NYXRoLnNpbihkTGF0LzIpKk1hdGguc2luKGRMYXQvMikrTWF0aC5jb3MobGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5jb3MobGF0MipNYXRoLlBJLzE4MCkqTWF0aC5zaW4oZExvbi8yKSpNYXRoLnNpbihkTG9uLzIpOwogIHJldHVybiBSSURFX0NGRy5FQVJUSF9SKjIqTWF0aC5hdGFuMihNYXRoLnNxcnQoYSksTWF0aC5zcXJ0KDEtYSkpOwp9CmZ1bmN0aW9uIHJpZGVCZWFyaW5nKGxvbjEsbGF0MSxsb24yLGxhdDIpewogIGNvbnN0IHk9TWF0aC5zaW4oKGxvbjItbG9uMSkqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApOwogIGNvbnN0IHg9TWF0aC5jb3MobGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5zaW4obGF0MipNYXRoLlBJLzE4MCktTWF0aC5zaW4obGF0MSpNYXRoLlBJLzE4MCkqTWF0aC5jb3MobGF0MipNYXRoLlBJLzE4MCkqTWF0aC5jb3MoKGxvbjItbG9uMSkqTWF0aC5QSS8xODApOwogIHJldHVybiBNYXRoLmF0YW4yKHkseCkqMTgwL01hdGguUEk7Cn0KZnVuY3Rpb24gcmlkZUFuZ0RpZmYoYSxiKXtsZXQgZD1iLWE7d2hpbGUoZD4xODApZC09MzYwO3doaWxlKGQ8LTE4MClkKz0zNjA7cmV0dXJuIGR9CmZ1bmN0aW9uIHJpZGVNaWQoYSxiKXtyZXR1cm4gYStyaWRlQW5nRGlmZihhLGIpLzJ9CmZ1bmN0aW9uIHJpZGVDYWxjTWV0cmljcyhwdHMpewogIGlmKCFwdHN8fHB0cy5sZW5ndGg8UklERV9DRkcuTUlOX1BPSU5UUylyZXR1cm4gbnVsbDsKICBsZXQgbWV0ZXJzPTAsbW92aW5nTXM9MCxtYXhTcGVlZD0wOwogIGZvcihsZXQgaT0xO2k8cHRzLmxlbmd0aDtpKyspewogICAgY29uc3QgYT1wdHNbaS0xXSxiPXB0c1tpXTsKICAgIG1ldGVycys9cmlkZUhhdmVyc2luZShhLmxvbixhLmxhdCxiLmxvbixiLmxhdCk7CiAgICBjb25zdCB2SW49TWF0aC5tYXgoYS52LGIudiksZHQ9Yi50LWEudDsKICAgIGlmKHZJbj5SSURFX0NGRy5NT1ZJTkdfVl9NSU4mJmR0PjAmJmR0PDYwMDAwKW1vdmluZ01zKz1kdDsKICAgIGlmKGIudj5tYXhTcGVlZCltYXhTcGVlZD1iLnY7CiAgfQogIGNvbnN0IGR1cmF0aW9uTWluPU1hdGgubWF4KDAscHRzW3B0cy5sZW5ndGgtMV0udC1wdHNbMF0udCkvNjAwMDA7CiAgY29uc3QgbW92aW5nTWluPW1vdmluZ01zLzYwMDAwOwogIGNvbnN0IGRpc3RhbmNlS209bWV0ZXJzLzEwMDA7CiAgcmV0dXJue3BvaW50czpwdHMubGVuZ3RoLGRpc3RhbmNlS206ZGlzdGFuY2VLbSxkdXJhdGlvbk1pbjpkdXJhdGlvbk1pbixtb3ZpbmdNaW46bW92aW5nTWluLG1heFNwZWVkOm1heFNwZWVkPDA/MDptYXhTcGVlZCxhdmdTcGVlZDpkdXJhdGlvbk1pbj4wP2Rpc3RhbmNlS20vZHVyYXRpb25NaW46MCxhdmdNb3ZpbmdTcGVlZDptb3ZpbmdNaW4+MD9kaXN0YW5jZUttL21vdmluZ01pbjowfTsKfQpmdW5jdGlvbiByaWRlQ291bnRCcmFrZXMocHRzKXsKICBjb25zdCBuPXB0cz9wdHMubGVuZ3RoOjA7CiAgaWYobjw0KXJldHVybiAwOwogIGNvbnN0IGNhbmRzPVtdOwogIGNvbnN0IHNjYW49KHdpbixkdk1pbik9PnsKICAgIGZvcihsZXQgaT0wO2k8PW4td2luO2krKyl7CiAgICAgIGlmKHB0c1tpXS52PFJJREVfQ0ZHLkJSQUtFX1ZfTUlOKWNvbnRpbnVlOwogICAgICBsZXQgbWF4Vj0tSW5maW5pdHksbWF4SWR4PWksbWluVj1JbmZpbml0eSxtaW5JZHg9aTsKICAgICAgY29uc3QgdXBwZXI9TWF0aC5taW4oaSt3aW4sbi0xKTsKICAgICAgZm9yKGxldCBqPWkrMTtqPD11cHBlcjtqKyspewogICAgICAgIGNvbnN0IHY9cHRzW2pdLnY7CiAgICAgICAgaWYodj5tYXhWKXttYXhWPXY7bWF4SWR4PWp9CiAgICAgICAgaWYodjxtaW5WKXttaW5WPXY7bWluSWR4PWp9CiAgICAgIH0KICAgICAgY29uc3QgZHY9bWF4Vi1taW5WOwogICAgICBpZihkdjxkdk1pbnx8bWluSWR4PD1tYXhJZHgpY29udGludWU7CiAgICAgIGNvbnN0IGR0PShwdHNbbWluSWR4XS50LXB0c1ttYXhJZHhdLnQpLzEwMDA7CiAgICAgIGlmKGR0PFJJREVfQ0ZHLkJSQUtFX01JTl9EVVJ8fGR2LzMuNi9kdDxSSURFX0NGRy5CUkFLRV9BX01JTiljb250aW51ZTsKICAgICAgY2FuZHMucHVzaCh7aWR4Om1heElkeCxkdjpkdn0pOwogICAgfQogIH07CiAgc2NhbihSSURFX0NGRy5CUkFLRV9XSU5fTEFSR0UsUklERV9DRkcuQlJBS0VfRFZfTEFSR0UpOwogIHNjYW4oUklERV9DRkcuQlJBS0VfV0lOX1NNQUxMLFJJREVfQ0ZHLkJSQUtFX0RWX1NNQUxMKTsKICBjYW5kcy5zb3J0KChhLGIpPT5hLmlkeC1iLmlkeCk7CiAgY29uc3QgbWVyZ2VkPVtdOwogIGZvcihjb25zdCBjIG9mIGNhbmRzKXsKICAgIGlmKCFtZXJnZWQubGVuZ3RofHxjLmlkeC1tZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXS5pZHg+PVJJREVfQ0ZHLkJSQUtFX01FUkdFX0dBUCltZXJnZWQucHVzaChjKTsKICAgIGVsc2UgaWYoYy5kdj5tZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXS5kdiltZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXT1jOwogIH0KICBjb25zdCByPU1hdGgucm91bmQobWVyZ2VkLmxlbmd0aCpSSURFX0NGRy5CUkFLRV9DQUxJQik7CiAgcmV0dXJuIHI8MD8wOnI7Cn0KZnVuY3Rpb24gcmlkZUNvdW50QmVuZHMocHRzKXsKICBjb25zdCBuPXB0cz9wdHMubGVuZ3RoOjA7CiAgaWYobjw0KXJldHVybiAwOwogIGNvbnN0IGhkZz1uZXcgQXJyYXkobi0xKTsKICBmb3IobGV0IGk9MDtpPG4tMTtpKyspewogICAgY29uc3QgYT1wdHNbaV0sYj1wdHNbaSsxXTsKICAgIGNvbnN0IGQ9cmlkZUhhdmVyc2luZShhLmxvbixhLmxhdCxiLmxvbixiLmxhdCksdHQ9Yi50LWEudDsKICAgIGhkZ1tpXT0oZDxSSURFX0NGRy5CRU5EX1NFR19ESVNUX01JTnx8dHQ+UklERV9DRkcuQkVORF9HQVBfTVNfTUFYfHx0dDw9MCk/TmFOOnJpZGVCZWFyaW5nKGEubG9uLGEubGF0LGIubG9uLGIubGF0KTsKICB9CiAgY29uc3Qgc2g9bmV3IEFycmF5KG4tMSk7CiAgZm9yKGxldCBpPTA7aTxuLTE7aSsrKXsKICAgIGlmKGlzTmFOKGhkZ1tpXSkpe3NoW2ldPU5hTjtjb250aW51ZX0KICAgIGNvbnN0IHByZXY9KGk+MCYmIWlzTmFOKGhkZ1tpLTFdKSk/aGRnW2ktMV06bnVsbDsKICAgIGNvbnN0IG5leHQ9KGk8bi0yJiYhaXNOYU4oaGRnW2krMV0pKT9oZGdbaSsxXTpudWxsOwogICAgaWYocHJldiE9PW51bGwmJm5leHQhPT1udWxsKXNoW2ldPXJpZGVNaWQocmlkZU1pZChwcmV2LGhkZ1tpXSksbmV4dCk7CiAgICBlbHNlIGlmKHByZXYhPT1udWxsKXNoW2ldPXJpZGVNaWQocHJldixoZGdbaV0pOwogICAgZWxzZSBpZihuZXh0IT09bnVsbClzaFtpXT1yaWRlTWlkKGhkZ1tpXSxuZXh0KTsKICAgIGVsc2Ugc2hbaV09aGRnW2ldOwogIH0KICBjb25zdCB0dXJuPW5ldyBBcnJheShuKS5maWxsKGZhbHNlKSxkaGRnPW5ldyBBcnJheShuKS5maWxsKDApLHNnbj1uZXcgQXJyYXkobikuZmlsbCgwKTsKICBmb3IobGV0IGk9MTtpPG4tMTtpKyspewogICAgaWYoaXNOYU4oc2hbaS0xXSl8fGlzTmFOKHNoW2ldKSljb250aW51ZTsKICAgIGNvbnN0IGQ9cmlkZUFuZ0RpZmYoc2hbaS0xXSxzaFtpXSk7CiAgICBkaGRnW2ldPWQ7CiAgICBjb25zdCB2SW49TWF0aC5tYXgocHRzW2ktMV0udixwdHNbaV0udik7CiAgICBpZih2SW48UklERV9DRkcuQkVORF9WX01JTnx8dkluPlJJREVfQ0ZHLkJFTkRfVl9NQVgpY29udGludWU7CiAgICBpZihNYXRoLmFicyhkKT49UklERV9DRkcuQkVORF9TVEVQX01BWCljb250aW51ZTsKICAgIGlmKE1hdGguYWJzKGQpPj1SSURFX0NGRy5CRU5EX1NFRUQpe3R1cm5baV09dHJ1ZTtzZ25baV09ZD4wPzE6LTF9CiAgfQogIGNvbnN0IHJ1bnM9W107bGV0IGN1cj1udWxsLGdhcD0wOwogIGZvcihsZXQgaT0xO2k8bi0xO2krKyl7CiAgICBpZih0dXJuW2ldKXsKICAgICAgaWYoY3VyPT09bnVsbCl7Y3VyPXtzOmksZTppLGN1bTpNYXRoLmFicyhkaGRnW2ldKSxzaWduOnNnbltpXX19CiAgICAgIGVsc2UgaWYoc2duW2ldPT09Y3VyLnNpZ24pe2N1ci5jdW0rPU1hdGguYWJzKGRoZGdbaV0pfQogICAgICBlbHNle3J1bnMucHVzaChjdXIpO2N1cj17czppLGU6aSxjdW06TWF0aC5hYnMoZGhkZ1tpXSksc2lnbjpzZ25baV19fQogICAgICBjdXIuZT1pO2dhcD0wOwogICAgfWVsc2UgaWYoY3VyIT09bnVsbCYmZ2FwPFJJREVfQ0ZHLkJFTkRfQUxMT1dfR0FQKXtnYXArKztjdXIuZT1pfQogICAgZWxzZSBpZihjdXIhPT1udWxsKXtydW5zLnB1c2goY3VyKTtjdXI9bnVsbH0KICB9CiAgaWYoY3VyIT09bnVsbClydW5zLnB1c2goY3VyKTsKICBsZXQgY250PTAsbGFzdEVuZD1OYU4sbGFzdFNpZ249MDsKICBmb3IoY29uc3QgciBvZiBydW5zKXsKICAgIGlmKHIuY3VtPFJJREVfQ0ZHLkJFTkRfQ1VNX01JTnx8ci5jdW0+UklERV9DRkcuQkVORF9DVU1fQ0FQKWNvbnRpbnVlOwogICAgaWYoci5lLXIucysxPFJJREVfQ0ZHLkJFTkRfUlVOX01JTiljb250aW51ZTsKICAgIGxldCBtYXhWPTA7CiAgICBmb3IobGV0IGo9ci5zO2o8PXIuZSYmajxuO2orKyl7aWYocHRzW2pdLnY+bWF4ViltYXhWPXB0c1tqXS52fQogICAgaWYobWF4Vj5SSURFX0NGRy5CRU5EX1ZfTUFYKWNvbnRpbnVlOwogICAgaWYoci5zaWduPT09bGFzdFNpZ24mJiFpc05hTihsYXN0RW5kKSYmci5zLWxhc3RFbmQ8PVJJREVfQ0ZHLkJFTkRfTUVSR0VfR0FQKXtsYXN0RW5kPXIuZTtjb250aW51ZX0KICAgIGNudCsrO2xhc3RFbmQ9ci5lO2xhc3RTaWduPXIuc2lnbjsKICB9CiAgcmV0dXJuIE1hdGgucm91bmQoY250KlJJREVfQ0ZHLkJFTkRfQ09FRik7Cn0KZnVuY3Rpb24gcmlkZU5vcm1EYXkocmF3KXsKICBpZihyYXc9PW51bGwpcmV0dXJuIG51bGw7CiAgbGV0IHQ9U3RyaW5nKHJhdykudHJpbSgpOwogIGlmKCF0KXJldHVybiBudWxsOwogIGlmKHQubGVuZ3RoPT09OCYmL15cZHs4fSQvLnRlc3QodCkpcmV0dXJuIHQuc2xpY2UoMCw0KSsiLiIrdC5zbGljZSg0LDYpKyIuIit0LnNsaWNlKDYsOCk7CiAgdD10LnJlcGxhY2UoLy0vZywiLiIpLnJlcGxhY2UoL1wvL2csIi4iKTsKICBjb25zdCBwPXQuc3BsaXQoIi4iKTsKICBpZihwLmxlbmd0aD09PTMmJi9eXGQrJC8udGVzdChwWzBdKSYmL15cZCskLy50ZXN0KHBbMV0pJiYvXlxkKyQvLnRlc3QocFsyXSkpCiAgICByZXR1cm4gcFswXSsiLiIrU3RyaW5nKHBhcnNlSW50KHBbMV0sMTApKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhwYXJzZUludChwWzJdLDEwKSkucGFkU3RhcnQoMiwiMCIpOwogIHJldHVybiBudWxsOwp9Ci8qIOS4gOe7hCByaWRldHJhY2tfdjIg5aSp5YiG57uEIOKGkiB7ZGF5S2V5OntrbSxkdXIsbWF4VixicmFrZXMsYmVuZHMscmlkZXM6Wy4uLl19fQogICDor63kuYnkuI4gU3BlZWRIdW50ZXIgUmlkZUZpbGwg5LiA6Ie077ya5oCl5Yi5L+WOi+W8r+aMiei9qOi/uemHjeeul++8iOacjeWKoeerr+i/meS4pOS4quWtl+auteW4uOW5tOe8uuWkse+8ie+8mwogICDph4znqIsv5p6B6YCf5pyN5Yqh56uv6Z2eIDAg5pe25Lul5pyN5Yqh56uv5Li65YeG77yM5Li6IDAg5omN6KGl566X44CCICovCmZ1bmN0aW9uIHJpZGVEYXlTY2FuKGRheXMpewogIGNvbnN0IG91dD17fTsKICBpZighQXJyYXkuaXNBcnJheShkYXlzKSlyZXR1cm4gb3V0OwogIGZvcihjb25zdCBkYXkgb2YgZGF5cyl7CiAgICBpZighZGF5fHx0eXBlb2YgZGF5IT09Im9iamVjdCIpY29udGludWU7CiAgICBjb25zdCBsaXN0PUFycmF5LmlzQXJyYXkoZGF5Lmhpc3RvcnlMaXN0KT9kYXkuaGlzdG9yeUxpc3Q6W107CiAgICBmb3IoY29uc3QgciBvZiBsaXN0KXsKICAgICAgaWYoIXJ8fHR5cGVvZiByIT09Im9iamVjdCIpY29udGludWU7CiAgICAgIGNvbnN0IHRyYWo9U3RyaW5nKHIudHJhamVjdG9yeXx8IiIpOwogICAgICBpZighdHJhailjb250aW51ZTsKICAgICAgY29uc3QgcHRzPXJpZGVQYXJzZVRyYWNrKHRyYWopOwogICAgICBpZihwdHMubGVuZ3RoPFJJREVfQ0ZHLk1JTl9QT0lOVFMpY29udGludWU7CiAgICAgIGNvbnN0IG09cmlkZUNhbGNNZXRyaWNzKHB0cyk7CiAgICAgIGNvbnN0IGJyYWtlcz1yaWRlQ291bnRCcmFrZXMocHRzKTsKICAgICAgbGV0IGJlbmRzPXJpZGVDb3VudEJlbmRzKHB0cyk7CiAgICAgIGlmKG0mJm0uZGlzdGFuY2VLbTxSSURFX0NGRy5CRU5EX01JTl9LTSliZW5kcz0wOyAgIC8vIOefreihjOeoi+aVtOi2n+WIpDDvvJo8MWttIOeahOWvhuW6puaYr+mVv+mAlOeahCA4IOWAje+8iEdQUyDlgZzovabkubHpo5jvvIkKICAgICAgY29uc3QgZGs9cmlkZU5vcm1EYXkoci5kYXlUaW1lfHxkYXkuZGF5VGltZSk7CiAgICAgIGlmKCFkayljb250aW51ZTsKICAgICAgY29uc3QgZz1vdXRbZGtdfHwob3V0W2RrXT17a206MCxkdXI6MCxtYXhWOjAsYnJha2VzOjAsYmVuZHM6MCxyaWRlczpbXX0pOwogICAgICBjb25zdCBzcnZNYXg9cmlkZU51bShyLm1heFNwZWVkKTsKICAgICAgY29uc3QgbWF4Vj1zcnZNYXg+MD9zcnZNYXg6KG0/bS5tYXhTcGVlZDowKTsKICAgICAgZy5rbSs9bT9tLmRpc3RhbmNlS206MDtnLmR1cis9bT9tLmR1cmF0aW9uTWluOjA7CiAgICAgIGlmKG1heFY+Zy5tYXhWKWcubWF4Vj1tYXhWOwogICAgICBnLmJyYWtlcys9YnJha2VzO2cuYmVuZHMrPWJlbmRzOwogICAgICBsZXQgYWRkcj0iIjsKICAgICAgdHJ5ewogICAgICAgIGNvbnN0IHNhPUpTT04ucGFyc2Uoci5zdGFydEFkZHJ8fCJ7fSIpLGVhPUpTT04ucGFyc2Uoci5lbmRBZGRyfHwie30iKTsKICAgICAgICBjb25zdCBzMT1TdHJpbmcoc2EubmFtZXx8c2EuYWRkcmVzc3x8IiIpLnRyaW0oKSxlMT1TdHJpbmcoZWEubmFtZXx8ZWEuYWRkcmVzc3x8IiIpLnRyaW0oKTsKICAgICAgICBpZihzMXx8ZTEpYWRkcj0oczF8fCIiKSsiIOKGkiAiKyhlMXx8IiIpOwogICAgICB9Y2F0Y2goZSl7fQogICAgICBnLnJpZGVzLnB1c2goe3QwOnB0c1swXS50LGttOm0/bS5kaXN0YW5jZUttOjAsZHVyOm0/bS5kdXJhdGlvbk1pbjowLG1heFY6bWF4VixicmFrZXM6YnJha2VzLGJlbmRzOmJlbmRzLHBvaW50czpwdHMubGVuZ3RoLAogICAgICAgIHQwc3RyOlN0cmluZyhyLnN0YXJ0VGltZXx8IiIpLHQxc3RyOlN0cmluZyhyLmVuZFRpbWV8fCIiKSxhZGRyOmFkZHIsCiAgICAgICAgc3J2S206cmlkZU51bShyLnJpZGVNaWxlYWdlKSxzcnZEdXI6cmlkZU51bShyLnJpZGluZ1RpbWVVbml0TWludXRlKSxzcnZBY2NlbDpyaWRlTnVtKHIuYWNjZWxlcmF0aW9uVGltZXMpLAogICAgICAgIHRodW1iOlN0cmluZyhyLnRyYWNrVGh1bWJuYWlsc3x8IiIpfSk7CiAgICB9CiAgfQogIGZvcihjb25zdCBrIGluIG91dClpZihvdXRba10mJm91dFtrXS5yaWRlcylvdXRba10ucmlkZXMuc29ydCgoYSxiKT0+YS50MC1iLnQwKTsKICByZXR1cm4gb3V0Owp9Ci8qIF9fUklERV9BTEdPX0VORF9fICovCi8qIOebtOi/nuaooeW8j++8iOmdnuS7o+eQhu+8ieaLieWPlu+8muaciOW6puaxh+aAuyAvIOi9qOi/ueWIhumhte+8iOi1sOi0puWPtyBUb2tlbiArIGFwcCDnrb7lkI3vvIzkuI7pppbpobXnm7Tov57kuIDoh7TvvIkgKi8KZnVuY3Rpb24gcmlkZUFjY0xvY2FsKHVzZXJJZCl7Y29uc3QgYWNjcz1nZXRBY2NvdW50cygpO3JldHVybiBhY2NzLmZpbmQoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKXx8YWNjc1swXXx8bnVsbH0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hSaWRlTW9udGhEaXJlY3QoYWNjLGNmZyxtb250aCx2aW4pewogIHRyeXsKICAgIGlmKCFhY2MpcmV0dXJue29rOmZhbHNlLGVycm9yOiLmnKrmib7liLDotKblj7cifTsKICAgIGNvbnN0IG1vbnRoMj1tb250aHx8KG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikpOwogICAgbGV0IHZpbk5vPVN0cmluZyh2aW58fCIiKS50cmltKCksdmVoaWNsZU5hbWU9IiI7CiAgICBpZighdmluTm8pewogICAgICBjb25zdCBsaXN0PWF3YWl0IGZldGNoVmVoaWNsZUxpc3QoYWNjLGNmZyk7CiAgICAgIGNvbnN0IHZlaGljbGVzPWxpc3QuZmlsdGVyKHg9PiEv5qih5oufLy50ZXN0KFN0cmluZyh4Lm5hbWV8fCIiKSsiICIrU3RyaW5nKHgudmVoaWNsZVR5cGV8fCIiKSkpOwogICAgICBpZighdmVoaWNsZXMubGVuZ3RoKXJldHVybntvazpmYWxzZSxlcnJvcjoi6LSm5Y+35pyq57uR5a6a6L2m6L6GIn07CiAgICAgIHZpbk5vPXZlaGljbGVzWzBdLnZpbk5vO3ZlaGljbGVOYW1lPXZlaGljbGVzWzBdLm5hbWU7CiAgICB9CiAgICBjb25zdCBxdWVyeT0idmluTm89IitlbmNvZGVVUklDb21wb25lbnQodmluTm8pKyImbW9udGg9IitlbmNvZGVVUklDb21wb25lbnQobW9udGgyKTsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL215UmlkZUluZm8/IitxdWVyeSxhcHBRdWVyeUhlYWRlcnMoYWNjLHF1ZXJ5LGNmZykpOwogICAgaWYocmVzJiZTdHJpbmcocmVzLmNvZGUpPT09IjEwMDAwIilyZXR1cm57b2s6dHJ1ZSxtb250aDptb250aDIsdmluTm86dmluTm8sdmVoaWNsZU5hbWU6dmVoaWNsZU5hbWUsZGF0YTpyZXMuZGF0YXx8e319OwogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLmNvZGUpKXx8IuaOpeWPo+aXoOWTjeW6lCIsdmluTm86dmluTm99OwogIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KfQphc3luYyBmdW5jdGlvbiBmZXRjaEJhdHRlcnlTdGF0ZURpcmVjdChhY2MsY2ZnLHZpbil7CiAgdHJ5ewogICAgaWYoIWFjYylyZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuacquaJvuWIsOi0puWPtyJ9OwogICAgbGV0IHZpbk5vPVN0cmluZyh2aW58fCIiKS50cmltKCk7CiAgICBpZighdmluTm8pe2NvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTtjb25zdCB2cz1saXN0LmZpbHRlcih4PT4hL+aooeaLny8udGVzdChTdHJpbmcoeC5uYW1lfHwiIikrIiAiK1N0cmluZyh4LnZlaGljbGVUeXBlfHwiIikpKTtpZighdnMubGVuZ3RoKXJldHVybntvazpmYWxzZSxlcnJvcjoi6LSm5Y+35pyq57uR5a6a6L2m6L6GIn07dmluTm89dnNbMF0udmluTm87fQogICAgY29uc3QgcmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvYmF0dGVyeUluZm8vIitlbmNvZGVVUklDb21wb25lbnQodmluTm8pLGJhc2VIZWFkZXJzKGFjYykpOwogICAgaWYocmVzJiZyZXMuY29kZT09IjEwMDAwIiYmcmVzLmRhdGEpe2NvbnN0IGQ9cmVzLmRhdGE7cmV0dXJue29rOnRydWUsdmluTm86dmluTm8sY2hhcmdpbmc6L+WFheeUtS8udGVzdChTdHJpbmcoZC5jaGFyZ2VTdGF0ZVN0cnx8ZC5jaGFyZ2VTdGF0ZXx8IiIpKSxjdXJyZW50Ok51bWJlcihkLmN1cnJlbnR8fGQuYmF0dGVyeUN1cnJlbnR8fGQuYm1zQ3VycmVudHx8MCksc29jOk51bWJlcihkLnNvY3x8ZC5ibXNzb2N8fDApLHZvbHRhZ2U6TnVtYmVyKGQudm9sdGFnZXx8ZC5iYXR0ZXJ5Vm9sdGFnZXx8ZC5ibXNWb2x0YWdlfHwwKSxjaGFyZ2VTdGF0ZTpTdHJpbmcoZC5jaGFyZ2VTdGF0ZVN0cnx8ZC5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpLGZ1bGxDaGFyZ2VUaW1lOk51bWJlcihkLmZ1bGxDaGFyZ2VUaW1lfHwwKSxmdWxsQ2hhcmdlVGltZVNlY29uZDpOdW1iZXIoZC5mdWxsQ2hhcmdlVGltZVNlY29uZHx8MCl9O30KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IuaOpeWPo+aXoOWTjeW6lCJ9OwogIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KfQphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVUcmFja0RpcmVjdChhY2MsY2ZnLHZpbixwYWdlLHBhZ2VTaXplLG1vbnRoKXsKICB0cnl7CiAgICBpZighYWNjKXJldHVybntvazpmYWxzZSxlcnJvcjoi5pyq5om+5Yiw6LSm5Y+3In07CiAgICBsZXQgdmluTm89U3RyaW5nKHZpbnx8IiIpLnRyaW0oKTsKICAgIGlmKCF2aW5Obyl7CiAgICAgIGNvbnN0IGxpc3Q9YXdhaXQgZmV0Y2hWZWhpY2xlTGlzdChhY2MsY2ZnKTsKICAgICAgY29uc3QgdmVoaWNsZXM9bGlzdC5maWx0ZXIoeD0+IS/mqKHmi58vLnRlc3QoU3RyaW5nKHgubmFtZXx8IiIpKyIgIitTdHJpbmcoeC52ZWhpY2xlVHlwZXx8IiIpKSk7CiAgICAgIGlmKCF2ZWhpY2xlcy5sZW5ndGgpcmV0dXJue29rOmZhbHNlLGVycm9yOiLotKblj7fmnKrnu5HlrprovabovoYifTsKICAgICAgdmluTm89dmVoaWNsZXNbMF0udmluTm87CiAgICB9CiAgICBjb25zdCBwZz1NYXRoLm1heCgxLE51bWJlcihwYWdlKXx8MSkscHM9TWF0aC5tYXgoMSxNYXRoLm1pbigyMDAsTnVtYmVyKHBhZ2VTaXplKXx8MjApKTsKICAgIGNvbnN0IHN0PVN0cmluZyhtb250aHx8IiIpLnJlcGxhY2UoIi4iLCItIil8fChuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKTsKICAgIGNvbnN0IHF1ZXJ5PSJ2aW5Obz0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW5ObykrIiZwYWdlPSIrcGcrIiZwYWdlU2l6ZT0iK3BzKyImc3RhcnRUaW1lPSIrZW5jb2RlVVJJQ29tcG9uZW50KHN0KTsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3JpZGV0cmFja192Mj8iK3F1ZXJ5LGFwcFF1ZXJ5SGVhZGVycyhhY2MscXVlcnksY2ZnKSk7CiAgICBpZihyZXMmJlN0cmluZyhyZXMuY29kZSk9PT0iMTAwMDAiKXsKICAgICAgbGV0IGRheXM9W107CiAgICAgIGlmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKWRheXM9cmVzLmRhdGE7CiAgICAgIGVsc2UgaWYocmVzLmRhdGEmJkFycmF5LmlzQXJyYXkocmVzLmRhdGEubGlzdCkpZGF5cz1yZXMuZGF0YS5saXN0OwogICAgICBlbHNlIGlmKHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLmRheUxpc3QpKWRheXM9cmVzLmRhdGEuZGF5TGlzdDsKICAgICAgcmV0dXJue29rOnRydWUscGFnZTpwZyx2aW5Obzp2aW5ObyxkYXlzOmRheXN9OwogICAgfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLmNvZGUpKXx8IuaOpeWPo+aXoOWTjeW6lCIscGFnZTpwZyx2aW5Obzp2aW5Ob307CiAgfWNhdGNoKGUpe3JldHVybntvazpmYWxzZSxlcnJvcjpTdHJpbmcoZSl9fQp9Ci8qID09PT09PT09PT09PT09PT09IOi0puWPt+aVsOaNruaLieWPliA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBmZXRjaEFjY291bnREYXRhKGFjYyxjZmcsdmluTm8pe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oYWNjLnRva2VuKTtsZXQgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IG5vdz1uZXcgRGF0ZSgpO2NvbnN0IHRvZGF5PW5vdy5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHJlc3VsdD17dXNlck5hbWU6YWNjLnVzZXJOYW1lfHwi5pyq55+l55So5oi3Iix1c2VySWQsc2NvcmU6MCxzaWduZWRUb2RheTpmYWxzZSxjb250aW51ZURheXM6MCx0b2RheVNjb3JlOjAsc2lnbkNvdW50OjAsbGFzdDc6W10sZXJyb3I6bnVsbCx2ZWhpY2xlOntoYXNWZWhpY2xlOmZhbHNlfX07CmlmKCF1c2VySWQpe3RyeXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgdmVoaWNsZVJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGUvbGlzdCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrdG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSH0pO2lmKHZlaGljbGVSZXMuY29kZT09IjEwMDAwIiYmdmVoaWNsZVJlcy5kYXRhKXtjb25zdCBhdXRvVWlkPVN0cmluZyh2ZWhpY2xlUmVzLmRhdGEudXNlcklkfHx2ZWhpY2xlUmVzLmRhdGEudWlkfHx2ZWhpY2xlUmVzLmRhdGEuaWR8fCIiKTtpZihhdXRvVWlkKXt1c2VySWQ9YXV0b1VpZDtyZXN1bHQudXNlcklkPXVzZXJJZDtjb25zdCBhY2NvdW50cz1nZXRBY2NvdW50cygpO2NvbnN0IGlkeD1hY2NvdW50cy5maW5kSW5kZXgoYT0+Y2xlYW5Ub2tlbihhLnRva2VuKT09PXRva2VuKTtpZihpZHg+PTAmJiFhY2NvdW50c1tpZHhdLnVzZXJJZCl7YWNjb3VudHNbaWR4XS51c2VySWQ9dXNlcklkO3NhdmVBY2NvdW50cyhhY2NvdW50cyl9fX19Y2F0Y2goZSl7fX0KdHJ5e3Jlc3VsdC52ZWhpY2xlPWF3YWl0IGZldGNoVmVoaWNsZUluZm8oYWNjLGNmZyx2aW5Obyl9Y2F0Y2goZSl7cmVzdWx0LnZlaGljbGU9e2hhc1ZlaGljbGU6ZmFsc2V9fQp0cnl7aWYoIXVzZXJJZCl7cmVzdWx0LmVycm9yPSLor7flnKjorr7nva7pobXloavlhpnnlKjmiLdJRCJ9ZWxzZXtjb25zdCBzaWduSD1nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyk7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9taW5lL2NmbW90b3NlcnZlcm1pbmUvc2V0dGluZy8iK3VzZXJJZCx7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWQsLi4uc2lnbkh9KTtpZihpbmZvUmVzLmNvZGU9PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7cmVzdWx0LnNjb3JlPU51bWJlcihpbmZvUmVzLmRhdGEuc2NvcmV8fGluZm9SZXMuZGF0YS5pbnRlZ3JhbHx8aW5mb1Jlcy5kYXRhLnBvaW50fHxpbmZvUmVzLmRhdGEucG9pbnRzfHxpbmZvUmVzLmRhdGEudG90YWxTY29yZXx8aW5mb1Jlcy5kYXRhLnRvdGFsSW50ZWdyYWx8fDApfWVsc2UgaWYoaW5mb1Jlcy5jb2RlPT0iNDAwMDEifHxpbmZvUmVzLmNvZGU9PTQwMSl7cmVzdWx0LmVycm9yPSJUb2tlbuW3sui/h+acnyJ9ZWxzZXtyZXN1bHQuZXJyb3I9Iuenr+WIhuiOt+WPluWksei0pTogIisoaW5mb1Jlcy5tZXNzYWdlfHxpbmZvUmVzLmNvZGV8fCLmnKrnn6XplJnor68iKX19fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnp6/liIbojrflj5blvILluLg6ICIrU3RyaW5nKGUpfQp0cnl7Y29uc3QgY3VyTW9udGg9bm93LmdldEZ1bGxZZWFyKCkrIi0iKyhub3cuZ2V0TW9udGgoKSsxKTtjb25zdCBsYXN0RGF0ZT1uZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSxub3cuZ2V0TW9udGgoKS0xLDEpO2NvbnN0IGxhc3RNb250aD1sYXN0RGF0ZS5nZXRGdWxsWWVhcigpKyItIisobGFzdERhdGUuZ2V0TW9udGgoKSsxKTtjb25zdCBiYXNlSGVhZGVycz17IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgIit0b2tlbiwiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04IiwiaW50ZXJmYWNldmVyc2lvbiI6IjIiLCJ1c2VyX2lkIjp1c2VySWR9O2NvbnN0IFtjdXJSZXMsbGFzdFJlc109YXdhaXQgUHJvbWlzZS5hbGwoW2h0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4vaW5mbz9tb250aD0iK2N1ck1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmN1ck1vbnRofSwnJyxjZmcpfSksaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbGFzdE1vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRoOmxhc3RNb250aH0sJycsY2ZnKX0pXSk7Y29uc3QgbGFzdExpc3Q9KGxhc3RSZXMuY29kZT09IjEwMDAwIiYmbGFzdFJlcy5kYXRhKT8obGFzdFJlcy5kYXRhLm5vd1NpZ25EZXRhaWxWb3N8fFtdKTpbXTtjb25zdCBjdXJMaXN0PShjdXJSZXMuY29kZT09IjEwMDAwIiYmY3VyUmVzLmRhdGEpPyhjdXJSZXMuZGF0YS5ub3dTaWduRGV0YWlsVm9zfHxbXSk6W107Y29uc3QgbGlzdD1bLi4ubGFzdExpc3QsLi4uY3VyTGlzdF07aWYoY3VyUmVzLmNvZGU9PSIxMDAwMCImJmN1clJlcy5kYXRhKXtyZXN1bHQuc2lnbkNvdW50PU51bWJlcihjdXJSZXMuZGF0YS5zaWduQ291bnQpfHwwfWNvbnN0IHRvZGF5RW50cnk9Y3VyTGlzdC5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmVkVG9kYXk9ISEodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKTtyZXN1bHQudG9kYXlTY29yZT10b2RheUVudHJ5PyhOdW1iZXIodG9kYXlFbnRyeS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDt0cnl7Y29uc3QgX3RvZGF5TG9ncz0oZ2V0TG9ncygpfHxbXSkuZmlsdGVyKGw9PmwmJmwuZGF0ZT09PXRvZGF5JiZTdHJpbmcobC51c2VySWR8fCIiKT09PVN0cmluZyh1c2VySWQpJiZsLnN1Y2Nlc3MpO2lmKF90b2RheUxvZ3MubGVuZ3RoPjApe2NvbnN0IF90bD1fdG9kYXlMb2dzWzBdO3Jlc3VsdC50b2RheVNjb3JlPU51bWJlcihfdGwudG90YWxHYWluKXx8cmVzdWx0LnRvZGF5U2NvcmU7cmVzdWx0LnRvZGF5RGV0YWlsPXtzaWduaW5TY29yZTpOdW1iZXIoX3RsLnNpZ25pblNjb3JlKXx8MCxibGluZEJveFNjb3JlOk51bWJlcihfdGwuYmxpbmRCb3hTY29yZSl8fDAsaW50ZXJhY3RTY29yZTpOdW1iZXIoX3RsLmludGVyYWN0U2NvcmUpfHwwfX19Y2F0Y2goZSl7fWNvbnN0IHRvZGF5SWR4PWxpc3QuZmluZEluZGV4KHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtsZXQgY29udD0wO2lmKHRvZGF5SWR4Pj0wKXtmb3IobGV0IGk9dG9kYXlJZHg7aT49MDtpLS0pe2NvbnN0IHN0PWxpc3RbaV0/LnNpZ25TdGF0dWU7aWYoc3Q9PTN8fHN0PT01fHwoaT09PXRvZGF5SWR4JiZzdD09MCkpY29udCsrO2Vsc2UgYnJlYWt9fXJlc3VsdC5jb250aW51ZURheXM9Y29udDtmb3IobGV0IGk9NjtpPj0wO2ktLSl7Y29uc3QgZD1uZXcgRGF0ZSgpO2Quc2V0RGF0ZShkLmdldERhdGUoKS1pKTtjb25zdCBkcz1kLmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTtjb25zdCBlbnRyeT1saXN0LmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpO3Jlc3VsdC5sYXN0Ny5wdXNoKHtkYXRlOmRzLnNsaWNlKDUpLHNpZ25lZDohIShlbnRyeSYmKGVudHJ5LnNpZ25TdGF0dWU9PTN8fGVudHJ5LnNpZ25TdGF0dWU9PTV8fGVudHJ5LnNpZ25TdGF0dWU9PTApKSxpc1RvZGF5Omk9PT0wfSl9fWNhdGNoKGUpe2lmKCFyZXN1bHQuZXJyb3IpcmVzdWx0LmVycm9yPSLnrb7liLDnirbmgIHojrflj5blpLHotKUifQp0cnl7Y29uc3QgdG9rZW5DaGVjaz1hd2FpdCBjaGVja1Rva2VuKGFjYyxjZmcpO3Jlc3VsdC50b2tlblZhbGlkPXRva2VuQ2hlY2sudmFsaWQ7cmVzdWx0LnRva2VuUmVhc29uPXRva2VuQ2hlY2sucmVhc29ufHxudWxsO2lmKHRva2VuQ2hlY2sudmFsaWQmJnRva2VuQ2hlY2sudXNlck5hbWUmJighcmVzdWx0LnVzZXJOYW1lfHxyZXN1bHQudXNlck5hbWU9PT0i5pyq55+l55So5oi3IikpcmVzdWx0LnVzZXJOYW1lPXRva2VuQ2hlY2sudXNlck5hbWV9Y2F0Y2goZSl7cmVzdWx0LnRva2VuVmFsaWQ9dHJ1ZX0KcmV0dXJuIHJlc3VsdH0KCmZ1bmN0aW9uIGdldFBvc3RJZEZyb21EYXRhKGRhdGEpe2lmKCFkYXRhKXJldHVybiBudWxsO2lmKHR5cGVvZiBkYXRhPT09InN0cmluZyJ8fHR5cGVvZiBkYXRhPT09Im51bWJlciIpcmV0dXJuIFN0cmluZyhkYXRhKTtpZihBcnJheS5pc0FycmF5KGRhdGEpKXJldHVybiBnZXRQb3N0SWRGcm9tRGF0YShkYXRhWzBdKTtjb25zdCBkaXJlY3Q9ZGF0YS51dWlkfHxkYXRhLnR1dWlkfHxkYXRhLnBvc3RJZHx8ZGF0YS5wb3N0aWR8fGRhdGEuYXJ0aWNsZUlkfHxkYXRhLmFydGljbGVJRHx8ZGF0YS5pZHx8ZGF0YS5kYXRhSWR8fGRhdGEudGlkO2lmKGRpcmVjdClyZXR1cm4gU3RyaW5nKGRpcmVjdCk7Zm9yKGNvbnN0IGtleSBvZiBbInJlY29yZHMiLCJsaXN0Iiwicm93cyIsImRhdGEiLCJyZXN1bHQiXSl7Y29uc3Qgdj1kYXRhW2tleV07Y29uc3QgcGlkPWdldFBvc3RJZEZyb21EYXRhKHYpO2lmKHBpZClyZXR1cm4gcGlkfXJldHVybiBudWxsfQoKLyogPT09PT09PT09PT09PT09PT0g562+5Yiw5omn6KGMID09PT09PT09PT09PT09PT09ICovCmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbkZvckFjY291bnQoYWNjLGNmZyl7Y29uc3QgcmVzdWx0PXt1c2VyTmFtZTphY2MudXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2MudXNlcklkLHN1Y2Nlc3M6ZmFsc2Usc2lnbmluU2NvcmU6MCxibGluZEJveFNjb3JlOjAsaW50ZXJhY3RTY29yZTowLHRvdGFsR2FpbjowLGNvbnRpbnVlRGF5czowLGVycm9yOm51bGwsc3RlcHM6W119O3RyeXtjb25zdCB0b2tlbj1jbGVhblRva2VuKGFjYy50b2tlbik7Y29uc3QgdXNlcklkPWFjYy51c2VySWR8fCIiO2NvbnN0IGJhc2VIZWFkZXJzPXsiQXV0aG9yaXphdGlvbiI6IkJlYXJlciAiK3Rva2VuLCJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJpbnRlcmZhY2V2ZXJzaW9uIjoiMiIsInVzZXJfaWQiOnVzZXJJZH07Y29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgdG9kYXk9bm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhub3cuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgbW9udGg9dG9kYXkuc2xpY2UoMCw3KTsKdHJ5e2NvbnN0IGluZm9SZXM9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0b2RheUVudHJ5PShpbmZvUmVzPy5kYXRhPy5ub3dTaWduRGV0YWlsVm9zfHxbXSkuZmluZCh4PT54LmNyZWF0ZURhdGU9PT10b2RheSk7aWYodG9kYXlFbnRyeSYmKHRvZGF5RW50cnkuc2lnblN0YXR1ZT09M3x8dG9kYXlFbnRyeS5zaWduU3RhdHVlPT01fHx0b2RheUVudHJ5LnNpZ25TdGF0dWU9PTApKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5bey562+5YiwIil9ZWxzZXtsZXQgc2lnblJlcz1udWxsLHNpZ25Nc2c9IuacquefpSI7Zm9yKGxldCBhdD0xO2F0PD0zO2F0Kyspe3NpZ25SZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse30sJ3t9JyxjZmcpfSx7fSk7aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIilicmVhaztzaWduTXNnPXNpZ25SZXM/Lm1lc3NhZ2V8fCLmnKrnn6UiO2lmKC/or7fnqI1856iN5ZCOfOeojeWAmXzpopHnuYF857mB5b+ZfOmHjeivlS8udGVzdChzaWduTXNnKSYmYXQ8Myl7YXdhaXQgbmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLChhdCsxKSoyMDAwKSk7Y29udGludWV9YnJlYWt9aWYoc2lnblJlcz8uY29kZT09IjEwMDAwIil7Y29uc3QgaW5mb1JlczI9YXdhaXQgaHR0cEdldCgiaHR0cHM6Ly9oNS56ZWVob2V2LmNvbS9jZm1vdG9zZXJ2ZXJtaW5lL0g1L3NpZ25pbi9pbmZvP21vbnRoPSIrbW9udGgsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImg1Iix7bW9udGh9LCcnLGNmZyl9KTtjb25zdCB0ZT0oaW5mb1JlczI/LmRhdGE/Lm5vd1NpZ25EZXRhaWxWb3N8fFtdKS5maW5kKHg9PnguY3JlYXRlRGF0ZT09PXRvZGF5KTtyZXN1bHQuc2lnbmluU2NvcmU9dGU/KE51bWJlcih0ZS5pbnRlZ3JhbFNjb3JlKXx8MCk6MDtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5oiQ5YqfICsiK3Jlc3VsdC5zaWduaW5TY29yZSl9ZWxzZXt0cnl7Y29uc3QgY2hrPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9INS9zaWduaW4vaW5mbz9tb250aD0iK21vbnRoLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJoNSIse21vbnRofSwnJyxjZmcpfSk7Y29uc3QgY2U9KGNoaz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W10pLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2lmKGNlJiYoY2Uuc2lnblN0YXR1ZT09M3x8Y2Uuc2lnblN0YXR1ZT09NXx8Y2Uuc2lnblN0YXR1ZT09MCkpcmVzdWx0LnN0ZXBzLnB1c2goIuS7iuaXpeW3suetvuWIsCIpO2Vsc2UgcmVzdWx0LnN0ZXBzLnB1c2goIuetvuWIsOWksei0pTogIitzaWduTXNnKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5aSx6LSlOiAiK3NpZ25Nc2cpfX19Cn1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi562+5Yiw5byC5bi4OiAiK2UpfQp0cnl7Y29uc3QgaW5mb1Jlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2luZm8/bW9udGg9Iittb250aCx7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHttb250aH0sJycsY2ZnKX0pO2NvbnN0IGxpc3Q9aW5mb1Jlcz8uZGF0YT8ubm93U2lnbkRldGFpbFZvc3x8W107Y29uc3QgdG9kYXlJZHg9bGlzdC5maW5kSW5kZXgoeD0+eC5jcmVhdGVEYXRlPT09dG9kYXkpO2xldCBjb250PTA7Zm9yKGxldCBpPXRvZGF5SWR4O2k+PTA7aS0tKXtjb25zdCBzdD1saXN0W2ldPy5zaWduU3RhdHVlO2lmKHN0PT0zfHxzdD09NXx8KGk9PT10b2RheUlkeCYmc3Q9PTApKWNvbnQrKztlbHNlIGJyZWFrfXJlc3VsdC5jb250aW51ZURheXM9Y29udDtjb25zdCBzaWduQ291bnQ9TnVtYmVyKGluZm9SZXM/LmRhdGE/LnNpZ25Db3VudCl8fDA7Y29uc3QgcHJpemVEYXRlPVN0cmluZyhpbmZvUmVzPy5kYXRhPy5zaWduUHJpemVEYXRlfHwiIik7Y29uc3QgaXNCb3hEYXk9cHJpemVEYXRlPyhwcml6ZURhdGU9PT10b2RheSk6KHNpZ25Db3VudD49MzApO2lmKGlzQm94RGF5KXtjb25zdCBibGluZFJlcz1hd2FpdCBodHRwR2V0KCJodHRwczovL2g1LnplZWhvZXYuY29tL2NmbW90b3NlcnZlcm1pbmUvSDUvc2lnbmluL2xvdHRlcnk/Ym94VHlwZT0wIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiaDUiLHtib3hUeXBlOiIwIn0sJycsY2ZnKX0pO2NvbnN0IGJkPShibGluZFJlcz8uZGF0YSYmYmxpbmRSZXMuZGF0YS5zaWduUHJpemVzVk8pfHxibGluZFJlcz8uZGF0YXx8e307cmVzdWx0LmJsaW5kQm94U2NvcmU9TnVtYmVyKGJkLmludGVncmFsfHxiZC5pbnRlZ3JhbFNjb3JlfHxiZC5zY29yZXx8MCk7Y29uc3QgYmNvZGU9U3RyaW5nKGJsaW5kUmVzPy5jb2RlKTtpZihiY29kZT09IjEwMDAwIil7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuiOt+W+lyArIityZXN1bHQuYmxpbmRCb3hTY29yZSsiICgiKyhiZC5wcml6ZXNOYW1lfHxiZC5wcml6ZU5hbWV8fCLnp6/liIYiKSsiKSIpfWVsc2UgaWYoYmNvZGU9PSJBTFJFQURZX0xPVFRFUlkiKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel55uy55uS5bey5byA6L+HIil9ZWxzZSBpZihiY29kZT09Ik5PX0xPVFRFUlkiKXtyZXN1bHQuc3RlcHMucHVzaCgi5LuK5pel5peg5Y+v55So55uy55uSIil9ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi55uy55uS5pyq5byAOiAiKyhibGluZFJlcz8ubWVzc2FnZXx8YmxpbmRSZXM/LmVycm9yfHwoImNvZGU9IitiY29kZSkpKX19ZWxzZXtyZXN1bHQuc3RlcHMucHVzaCgi6Led55uy55uSICIrTWF0aC5tYXgoMCwzMC0oc2lnbkNvdW50fHxjb250KSkrIiDlpKkiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuebsuebkuW8guW4uDogIitlKX0KY29uc3QgY29tbT1jZmcuY29tbXVuaXR5fHx7fTtsZXQgcG9zdElkPW51bGw7CmlmKGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKXt0cnl7Y29uc3QgcG9zdFJlcz1hd2FpdCBodHRwUG9zdCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSx7cG9zdGNvbnRlbnQ6Imx1Y2t5In0pO2lmKHBvc3RSZXM/LmNvZGU9PSIxMDAwMCIpe3Bvc3RJZD1nZXRQb3N0SWRGcm9tRGF0YShwb3N0UmVzLmRhdGEpO3Jlc3VsdC5pbnRlcmFjdFNjb3JlKz0xO3Jlc3VsdC5zdGVwcy5wdXNoKCLlj5HluJbmiJDlip8gKzEiKX19Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWPkeW4luW8guW4uDogIitlKX19CmlmKCFwb3N0SWQpe3RyeXtjb25zdCBsaXN0UmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbXVuaXR5L21pbmVBcnRpY2xlSW5mbz91c2VySWQ9Iit1c2VySWQrIiZwYWdlPTEmcGFnZVNpemU9MTAiLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtjb25zdCByYXdMaXN0PUFycmF5LmlzQXJyYXkobGlzdFJlcz8uZGF0YSk/bGlzdFJlcy5kYXRhOihsaXN0UmVzPy5kYXRhPy5yZWNvcmRzfHxsaXN0UmVzPy5kYXRhPy5saXN0fHxbXSk7Y29uc3QgbGlzdD1BcnJheS5pc0FycmF5KHJhd0xpc3QpP3Jhd0xpc3Q6W107Y29uc3QgbWluZT1saXN0LmZpbmQoaXQ9PlN0cmluZyhpdC51c2VySWR8fGl0LmNyZWF0ZUJ5fHxpdC51aWR8fCIiKT09PVN0cmluZyh1c2VySWQpKTtwb3N0SWQ9Z2V0UG9zdElkRnJvbURhdGEobWluZXx8bGlzdFswXXx8bGlzdFJlcz8uZGF0YSl9Y2F0Y2goZSl7fX0KaWYocG9zdElkKXtpZihjb21tLmVuYWJsZUxpa2UhPT1mYWxzZSl7dHJ5e2NvbnN0IGxpa2VSZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvc29jaWFsQ29tbXUvbGlrZUZhdm9yaXRlSW5mbyIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0se3Bvc3RJZDpTdHJpbmcocG9zdElkKSxraW5kRmxhZzoiMCJ9KTtpZihsaWtlUmVzPy5jb2RlPT0iMTAwMDAiKXtyZXN1bHQuaW50ZXJhY3RTY29yZSs9MTtyZXN1bHQuc3RlcHMucHVzaCgi54K56LWe5oiQ5YqfICsxIil9fWNhdGNoKGUpe3Jlc3VsdC5zdGVwcy5wdXNoKCLngrnotZ7lvILluLg6ICIrZSl9fWlmKGNvbW0uZW5hYmxlQ29tbWVudCE9PWZhbHNlKXt0cnl7YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL3NvY2lhbC9jZm1vdG9zZXJ2ZXJzb2NpYWwvY29tbWVudEluZm8iLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9LHtwb3N0aWQ6U3RyaW5nKHBvc3RJZCksdXNlcklkOlN0cmluZyh1c2VySWQpLGNvbW1lbnRzOiLku4rml6Xlt7Lnrb7liLAiLHNlbmRUb3M6IltcblxuXSJ9KTtyZXN1bHQuc3RlcHMucHVzaCgi6K+E6K665a6M5oiQIil9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuivhOiuuuW8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVTaGFyZSE9PWZhbHNlKXt0cnl7Y29uc3Qgc2hhcmVSZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9hcnRpY2xlL3NoYXJlLyIrcG9zdElkLHsuLi5iYXNlSGVhZGVycywuLi5nZXRTaWduKCJhcHAiLHt9LCcnLGNmZyl9KTtpZihzaGFyZVJlcz8uY29kZT09IjEwMDAwIil7cmVzdWx0LmludGVyYWN0U2NvcmUrPTE7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+aIkOWKnyArMSIpfWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS9pbnRlZ3JhbC9hZGp1c3RCeVNoYXJlIix7Li4uYmFzZUhlYWRlcnMsLi4uZ2V0U2lnbigiYXBwIix7fSwnJyxjZmcpfSl9Y2F0Y2goZSl7cmVzdWx0LnN0ZXBzLnB1c2goIuWIhuS6q+W8guW4uDogIitlKX19aWYoY29tbS5lbmFibGVEZWxldGUhPT1mYWxzZSYmcG9zdElkKXt0cnl7YXdhaXQgaHR0cERlbGV0ZSgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvc29jaWFsL2NmbW90b3NlcnZlcnNvY2lhbC9jb21tb25BcnRpY2xlL2RlbGV0ZUFydGljbGU/YXJ0aWNsZUlkPSIrcG9zdElkKyImcG9zdFR5cGU9MSIsey4uLmJhc2VIZWFkZXJzLC4uLmdldFNpZ24oImFwcCIse30sJycsY2ZnKX0pO3Jlc3VsdC5zdGVwcy5wdXNoKCLliqjmgIHlt7LliKDpmaQiKX1jYXRjaChlKXtyZXN1bHQuc3RlcHMucHVzaCgi5Yig6Zmk5byC5bi4OiAiK2UpfX19CnJlc3VsdC50b3RhbEdhaW49cmVzdWx0LnNpZ25pblNjb3JlK3Jlc3VsdC5ibGluZEJveFNjb3JlK3Jlc3VsdC5pbnRlcmFjdFNjb3JlO3Jlc3VsdC5zdWNjZXNzPXRydWV9Y2F0Y2goZSl7cmVzdWx0LmVycm9yPVN0cmluZyhlKTtyZXN1bHQuc3RlcHMucHVzaCgi5omn6KGM5byC5bi4OiAiK2UpfXJldHVybiByZXN1bHR9CgovKiA9PT09PT09PT09PT09PT09PSDovabovobmjqfliLYgPT09PT09PT09PT09PT09PT0gKi8KY29uc3QgVkVISUNMRV9BQ1RJT05fVEVYVD17ZmluZDoi55+t5oyJ5a+76L2mIixsb3VkRmluZDoi6bij56yb6Zeq54GvIixjdXNoaW9uOiLmiZPlvIDlnZDlnqsiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTsKZnVuY3Rpb24gdmVoaWNsZUNoZWNrUmVzKHJlcyxva01zZyl7aWYocmVzJiYhcmVzLmVycm9yJiYocmVzLmNvZGU9PSIxMDAwMCJ8fHJlcy5jb2RlPT09MTAwMDApKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2d9O2NvbnN0IGVyclRleHQ9U3RyaW5nKChyZXMmJihyZXMuZXJyb3J8fHJlcy5tZXNzYWdlfHxyZXMubXNnKSl8fCIiKS50b0xvd2VyQ2FzZSgpO2lmKHJlcyYmcmVzLmVycm9yJiYvdGltZW91dHx0aW1lZCBvdXR8dGltZSBvdXR86K+35rGC6LaF5pe2Ly50ZXN0KGVyclRleHQpKXJldHVybntvazp0cnVlLG1lc3NhZ2U6b2tNc2crIu+8iOWTjeW6lOi2heaXtuS9hui9pui+humAmuW4uOW3suaJp+ihjO+8jOWPr+S4i+aLieWIt+aWsOehruiupO+8iSJ9O3JldHVybntvazpmYWxzZSxtZXNzYWdlOihyZXMmJihyZXMubWVzc2FnZXx8cmVzLm1zZykpfHwocmVzJiZyZXMuZXJyb3IpfHwi5oyH5Luk5LiL5Y+R5aSx6LSlIixjb2RlOnJlcyYmcmVzLmNvZGV9fQphc3luYyBmdW5jdGlvbiB2ZWhpY2xlQ29udHJvbChhY2MsYWN0aW9uLGNmZyl7dHJ5e2NvbnN0IGM9Y2ZnfHxnZXRDZmcoKTtsZXQgdmluPWFjYy52aW5Ob3x8IiI7aWYoIXZpbil7Y29uc3QgbGlzdD1hd2FpdCBmZXRjaFZlaGljbGVMaXN0KGFjYyxjKTtpZighbGlzdHx8IWxpc3QubGVuZ3RoKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrojrflj5bliLDnu5HlrprovabovoYoVklOKe+8jOivt+ehruiupOi0puWPt+W3sue7keWumui9pui+hiJ9O3Zpbj1saXN0WzBdLnZpbk5vfWNvbnN0IGJhc2U9YmFzZUhlYWRlcnMoYWNjKTtpZihhY3Rpb249PT0iZmluZCIpe2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSwiIixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQdXQoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZUluZm8vY29udHJvbC8iK3ZpbixoKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5a+76L2m5oyH5Luk5bey5LiL5Y+R77yM6L2m6L6G5bqU6Zeq54Gv5o+Q56S6Iil9aWYoYWN0aW9uPT09ImxvdWRGaW5kIil7Y29uc3QgYm9keVN0cj1KU09OLnN0cmluZ2lmeSh7cGFyYW06IjQiLHZpbjp2aW59KTtjb25zdCBoPXsuLi5iYXNlLC4uLmdldFNpZ24oImFwcCIse30sYm9keVN0cixjKX07Y29uc3QgcmVzPWF3YWl0IGh0dHBQb3N0KCJodHRwczovL3RhcGkuemVlaG9ldi5jb20vdjEuMC9hcHAvY2Ztb3Rvc2VydmVyYXBwL3ZlaGljbGVJbmZvL2NvbnRyb2xWMiIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi6bij56yb6Zeq54Gv5oyH5Luk5bey5LiL5Y+RIil9aWYoYWN0aW9uPT09ImN1c2hpb24iKXtjb25zdCBib2R5U3RyPUpTT04uc3RyaW5naWZ5KHtjb21tb25kOiIyOCIsY29tbW9uZFBhcmFtOiIxIix2Y3U6dmluLHZlcnNpb246InYyIn0pO2NvbnN0IGg9ey4uLmJhc2UsLi4uZ2V0U2lnbigiYXBwIix7fSxib2R5U3RyLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFB1dCgiaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvYXBwL2NmbW90b3NlcnZlcmFwcC92ZWhpY2xlU2V0L3Byb3BlcnR5VHdvL29uZSIsaCxib2R5U3RyKTtyZXR1cm4gdmVoaWNsZUNoZWNrUmVzKHJlcywi5byA5Z2Q5Z6r5oyH5Luk5bey5LiL5Y+R77yM5Z2Q5Z6r5bqU5by56LW3Iil9aWYoYWN0aW9uPT09InVubG9jayJ8fGFjdGlvbj09PSJsb2NrIil7Y29uc3QgdktleT0oYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpO2lmKCF2S2V5KXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLlsJrmnKrphY3nva7kupHnq6/mjqfovablr4bpkqXvvJror7fliLDjgIzorr7nva4t562+5ZCN5a+G6ZKl6YWN572u44CN5aGr5YaZ5LqR56uv5o6n6L2mQUVT5a+G6ZKl5bm25L+d5a2Y5ZCO5YaN5L2/55So5byAL+WFs+mUgSJ9O2lmKCEvXlswLTlhLWZBLUZdezMyfSQvLnRlc3QodktleSkpcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6IuS6keerr+aOp+i9puWvhumSpeagvOW8j+mUmeivr++8iOW6lOS4ujMy5L2N5Y2B5YWt6L+b5Yi277yJ77yM6K+35Yiw6K6+572u6aG15qC45a+55ZCO5L+d5a2YIn07Y29uc3QgbG9ja0ZsYWc9YWN0aW9uPT09InVubG9jayI/IjEiOiIwIjtjb25zdCBwbGFpbj0ne1xuICAibG9ja0ZsYWciIDogIicrbG9ja0ZsYWcrJyIsXG4gICJ2aW5ObyIgOiAiJyt2aW4rJyJcbn0nO2NvbnN0IHNlY3JldD1hZXMyNTZFY2JFbmNyeXB0QmFzZTY0KHBsYWluLHZLZXkpO2NvbnN0IHNlbmRCb2R5PUpTT04uc3RyaW5naWZ5KHtzZWNyZXQ6c2VjcmV0fSk7Y29uc3QgaD17Li4uYmFzZSwuLi5nZXRTaWduKCJhcHAiLHt9LHBsYWluLGMpfTtjb25zdCByZXM9YXdhaXQgaHR0cFBvc3QoImh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL2FwcC9jZm1vdG9zZXJ2ZXJhcHAvdmVoaWNsZVNldC9uZXR3b3JrL3VubG9jayIsaCxzZW5kQm9keSwyNTAwMCk7cmV0dXJuIHZlaGljbGVDaGVja1JlcyhyZXMsYWN0aW9uPT09InVubG9jayI/IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSI6IuS6keerr+WFs+mUgeaMh+S7pOW3suS4i+WPkSIpfXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrnn6Xmk43kvZznsbvlnos6ICIrYWN0aW9ufX1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsbWVzc2FnZToi5o6n5Yi25byC5bi4OiAiK1N0cmluZyhlKX19fQoKYXN5bmMgZnVuY3Rpb24gYmFya1B1c2goYmFya0tleSx0aXRsZSxib2R5KXt0cnl7bGV0IHM9U3RyaW5nKGJhcmtLZXl8fCIiKS50cmltKCkucmVwbGFjZSgvXC8rJC8sIiIpO3M9cy5yZXBsYWNlKC9eaHR0cHM/OlwvXC9hcGlcLmRheVwuYXBwXC8vaSwiIik7aWYoIXMpcmV0dXJue3NraXBwZWQ6dHJ1ZX07bGV0IGJhc2U9Imh0dHBzOi8vYXBpLmRheS5hcHAiLGtleT1zO2NvbnN0IG09cy5tYXRjaCgvXihodHRwcz86XC9cL1teL10rKVwvKC4rKSQvaSk7aWYobSl7YmFzZT1tWzFdO2tleT1tWzJdfWtleT1rZXkucmVwbGFjZSgvXlwvKy8sIiIpO2NvbnN0IHU9YmFzZSsiLyIrZW5jb2RlVVJJQ29tcG9uZW50KGtleSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudCh0aXRsZSkrIi8iK2VuY29kZVVSSUNvbXBvbmVudChib2R5KSsiP2dyb3VwPVpFRUhPJnNvdW5kPWJpcmRzb25nIjtyZXR1cm4gYXdhaXQgaHR0cEdldCh1LHt9KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6U3RyaW5nKGUpfX19CgovKiA9PT09PT09PT09PT09PT09PSDku6PnkIbmqKHlvI/vvIjmjIflkJHljp/ohJrmnKwgemVlaG8uYm94IOWQjuerr++8iSA9PT09PT09PT09PT09PT09PSAqLwphc3luYyBmdW5jdGlvbiBwcm94eUZldGNoKHBhdGgsb3B0cyl7Y29uc3QgcmF3QmFzZT1nZXRDZmcoKS5zZXJ2ZXJCYXNlLnJlcGxhY2UoL1wvKyQvLCIiKTtjb25zdCBiYXNlPSh3aW5kb3cuX19QQU5FTF9NT0RFX18mJiFyYXdCYXNlKT8iIjpyYXdCYXNlO2NvbnN0IHI9YXdhaXQgZmV0Y2goYmFzZStwYXRoLG9wdHN8fHt9KTtjb25zdCB0PWF3YWl0IHIudGV4dCgpO3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm57ZXJyb3I6InBhcnNlIGVycm9yIixyYXc6dH19fQpmdW5jdGlvbiBwcm94eVBvc3QocGF0aCxib2R5KXtyZXR1cm4gcHJveHlGZXRjaChwYXRoLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sYm9keTpKU09OLnN0cmluZ2lmeShib2R5fHx7fSl9KX0KCmFzeW5jIGZ1bmN0aW9uIGZldGNoQWxsQWNjb3VudHMoYWNjb3VudHMsY2ZnLGxpbWl0KXtjb25zdCBvdXQ9bmV3IEFycmF5KGFjY291bnRzLmxlbmd0aCk7bGV0IGk9MDthc3luYyBmdW5jdGlvbiB3b3JrZXIoKXt3aGlsZShpPGFjY291bnRzLmxlbmd0aCl7Y29uc3QgaWR4PWkrKzt0cnl7b3V0W2lkeF09YXdhaXQgZmV0Y2hBY2NvdW50RGF0YShhY2NvdW50c1tpZHhdLGNmZyl9Y2F0Y2goZSl7b3V0W2lkeF09e3VzZXJOYW1lOmFjY291bnRzW2lkeF0udXNlck5hbWV8fCLmnKrnn6UiLHVzZXJJZDphY2NvdW50c1tpZHhdLnVzZXJJZCxzdWNjZXNzOmZhbHNlLGVycm9yOlN0cmluZyhlKX19fX1jb25zdCBuPU1hdGgubWF4KDEsTWF0aC5taW4obGltaXR8fDMsYWNjb3VudHMubGVuZ3RoKSk7YXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbSh7bGVuZ3RoOm59LHdvcmtlcikpO3JldHVybiBvdXR9Cgpjb25zdCBCYWNrZW5kPXsKICBhc3luYyBzZW5kQ29kZShwaG9uZSl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9zZW5kLWNvZGUiLHtwaG9uZTpwaG9uZX0pO3JldHVybntvazohIWQub2ssbWVzc2FnZTpkLm1lc3NhZ2V8fChkLm9rPyLpqozor4HnoIHlt7Llj5HpgIEiOiLlj5HpgIHlpLHotKUiKX07fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IHVybD0iaHR0cHM6Ly90YXBpLnplZWhvZXYuY29tL3YxLjAvbWluZS9jZm1vdG9zZXJ2ZXJtaW5lL2F1dGhDb2RlLyIrZW5jb2RlVVJJQ29tcG9uZW50KHBob25lKTsKICAgIGNvbnN0IGQ9YXdhaXQgaHR0cEdldCh1cmwseyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIkdFVCIse30sIiIsY2ZnKX0pOwogICAgcmV0dXJue29rOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIixtZXNzYWdlOlN0cmluZyhkLmNvZGUpPT09IjEwMDAwIj8i6aqM6K+B56CB5bey5Y+R6YCB77yM6K+35p+l5pS255+t5L+hIjooKGQmJihkLm1lc3NhZ2V8fGQubXNnKSl8fCLlj5HpgIHlpLHotKUiKX07CiAgfSwKICBhc3luYyBwaG9uZUxvZ2luKHBob25lLGNvZGUsYmFzaWNBdXRoKXsKICAgIGNvbnN0IGJhc2ljPVN0cmluZyhiYXNpY0F1dGh8fCIiKS50cmltKCkucmVwbGFjZSgvXkJhc2ljXHMrL2ksIiIpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvcGhvbmUtbG9naW4iLHtwaG9uZTpwaG9uZSxjb2RlOmNvZGUsYmFzaWNBdXRoOmJhc2ljfSk7cmV0dXJue29rOiEhZC5vayxtZXNzYWdlOmQubWVzc2FnZXx8KGQub2s/IueZu+W9leaIkOWKnyI6IueZu+W9leWksei0pSIpfTt9CiAgICBjb25zdCBjZmc9Z2V0Q2ZnKCk7Y29uc3QgcGF5bG9hZD17cGhvbmU6cGhvbmUsYXV0aENvZGU6Y29kZX07CiAgICBjb25zdCB1cmw9Imh0dHBzOi8vdGFwaS56ZWVob2V2LmNvbS92MS4wL21pbmUvY2Ztb3Rvc2VydmVybWluZS91c2VyL2xvZ2luQnlQaG9uZSI7CiAgICBjb25zdCBoZHI9eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLTgiLCJVc2VyLUFnZW50Ijoib2todHRwLzQuOS4yIiwuLi5hcHBHYXRld2F5U2lnbih1cmwsIlBPU1QiLHt9LHBheWxvYWQsY2ZnKX07CiAgICBpZihiYXNpYyloZHJbIkF1dGhvcml6YXRpb24iXT0iQmFzaWMgIitiYXNpYzsKICAgIGNvbnN0IHJlcz1hd2FpdCBodHRwUG9zdCh1cmwsaGRyLHBheWxvYWQsMjAwMDApOwogICAgY29uc3QgdG9rZW5JbmZvPXJlcyYmcmVzLmRhdGEmJnJlcy5kYXRhLnRva2VuSW5mbztjb25zdCBhY2Nlc3NUb2tlbj10b2tlbkluZm8mJlN0cmluZyh0b2tlbkluZm8uYWNjZXNzX3Rva2VufHwiIik7CiAgICBpZighcmVzfHxTdHJpbmcocmVzLmNvZGUpIT09IjEwMDAwInx8IWFjY2Vzc1Rva2VuKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLnmbvlvZXlpLHotKXvvJoiKygocmVzJiYocmVzLm1lc3NhZ2V8fHJlcy5tc2cpKXx8IumqjOivgeeggeacieivr+aIluW3sui/h+acnyIpfTsKICAgIGxldCB1c2VySWQ9IiIsdXNlck5hbWU9IiI7CiAgICB0cnl7Y29uc3Qgc2lnbkgwPWdldFNpZ24oImg1Iix7c2VydmVyX25hbWU6IlNNQVJUIn0sIiIsY2ZnKTtjb25zdCBpbmZvUmVzPWF3YWl0IGh0dHBHZXQoImh0dHBzOi8vaDUuemVlaG9ldi5jb20vY2Ztb3Rvc2VydmVybWluZS9iYXNlSW5mbz9zZXJ2ZXJfbmFtZT1TTUFSVCIseyJBdXRob3JpemF0aW9uIjoiQmVhcmVyICIrYWNjZXNzVG9rZW4sIkNvbnRlbnQtVHlwZSI6ImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOCIsImludGVyZmFjZXZlcnNpb24iOiIyIiwuLi5zaWduSDB9KTtpZihpbmZvUmVzJiZTdHJpbmcoaW5mb1Jlcy5jb2RlKT09PSIxMDAwMCImJmluZm9SZXMuZGF0YSl7dXNlcklkPVN0cmluZyhpbmZvUmVzLmRhdGEuaWR8fCIiKTt1c2VyTmFtZT1TdHJpbmcoaW5mb1Jlcy5kYXRhLm5pY2tOYW1lfHwiIik7fX1jYXRjaChlKXt9CiAgICBjb25zdCBsaXN0PWdldEFjY291bnRzKCk7bGV0IHJlcGxhY2VkPWZhbHNlOwogICAgZm9yKGxldCBpPTA7aTxsaXN0Lmxlbmd0aDtpKyspe2lmKGxpc3RbaV0mJihTdHJpbmcobGlzdFtpXS50b2tlbnx8IiIpPT09YWNjZXNzVG9rZW58fChsaXN0W2ldLnVzZXJJZCYmdXNlcklkJiZTdHJpbmcobGlzdFtpXS51c2VySWQpPT09dXNlcklkKSkpe2xpc3RbaV0udG9rZW49YWNjZXNzVG9rZW47aWYodXNlcklkKWxpc3RbaV0udXNlcklkPXVzZXJJZDtpZih1c2VyTmFtZSlsaXN0W2ldLnVzZXJOYW1lPXVzZXJOYW1lO3JlcGxhY2VkPXRydWU7YnJlYWs7fX0KICAgIGNvbnN0IG5ld0FjYz17dXNlck5hbWU6dXNlck5hbWV8fHBob25lLHVzZXJJZDp1c2VySWQsdG9rZW46YWNjZXNzVG9rZW4sYmFya0tleToiIix1c2VyQWdlbnQ6IiJ9OwogICAgaWYoIXJlcGxhY2VkKWxpc3QucHVzaChuZXdBY2MpOwogICAgc2F2ZUFjY291bnRzKGxpc3QpOwogICAgcmV0dXJue29rOnRydWUsbWVzc2FnZTpyZXBsYWNlZD8i55m75b2V5oiQ5Yqf77yM5bey5pu05paw6K+l6LSm5Y+3Ijoi55m75b2V5oiQ5Yqf77yM5bey5re75Yqg6LSm5Y+3In07CiAgfSwKICBhc3luYyBnZXREYXNoYm9hcmQoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpewogICAgICBjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvZGF0YSIpOwogICAgICBpZihkJiZkLmFjY291bnRzKXJldHVybnthY2NvdW50czpkLmFjY291bnRzLHRpbWVzdGFtcDpkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpLGNvbmZpZzpkLmNvbmZpZ3x8bnVsbCxvazp0cnVlfTsKICAgICAgcmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuS7o+eQhuacjeWKoeaXoOWTjeW6lCIscmF3OmR9OwogICAgfQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgZGF0YT1hd2FpdCBmZXRjaEFsbEFjY291bnRzKGFjY291bnRzLGNmZywzKTsKICAgIHJldHVybnthY2NvdW50czpkYXRhLHRpbWVzdGFtcDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksb2s6dHJ1ZX07CiAgfSwKICBhc3luYyBydW5TaWduaW4odXNlcklkLGFsbCl7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS9ydW4tc2lnbmluIixhbGw/e2FsbDp0cnVlfTp7dXNlcklkOnVzZXJJZH0pO2lmKGQmJmQucmVzdWx0cylyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOmQucmVzdWx0c307cmV0dXJue29rOmZhbHNlLGVycm9yOihkJiZkLmVycm9yKXx8IuaJp+ihjOWksei0pSJ9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7Y29uc3QgcmVzdWx0cz1bXTtjb25zdCB0YXJnZXRzPWFsbD9hY2NvdW50czphY2NvdW50cy5maWx0ZXIoYT0+U3RyaW5nKGEudXNlcklkKT09PVN0cmluZyh1c2VySWQpKTsKICAgIGlmKCF0YXJnZXRzLmxlbmd0aClyZXR1cm57b2s6dHJ1ZSxyZXN1bHRzOltdfTsKICAgIGZvcihjb25zdCBhY2Mgb2YgdGFyZ2V0cyl7Y29uc3Qgcj1hd2FpdCBydW5TaWduaW5Gb3JBY2NvdW50KGFjYyxjZmcpO3Jlc3VsdHMucHVzaChyKTtjb25zdCBfZD1uZXcgRGF0ZSgpO2NvbnN0IF9kcz1fZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX2QuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhfZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTthZGRMb2coe3RpbWU6X2QudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfZHMsdHlwZToic2lnbmluIix1c2VyTmFtZTpyLnVzZXJOYW1lLHVzZXJJZDpyLnVzZXJJZCxzdWNjZXNzOnIuc3VjY2Vzcyx0b3RhbEdhaW46ci50b3RhbEdhaW4sc2lnbmluU2NvcmU6ci5zaWduaW5TY29yZSxibGluZEJveFNjb3JlOnIuYmxpbmRCb3hTY29yZSxpbnRlcmFjdFNjb3JlOnIuaW50ZXJhY3RTY29yZSxjb250aW51ZURheXM6ci5jb250aW51ZURheXMsZXJyb3I6ci5lcnJvcixzdGVwczpyLnN0ZXBzfSk7aWYoci5zdWNjZXNzJiZhY2MuYmFya0tleSYmU3RyaW5nKGFjYy5iYXJrS2V5KS50cmltKCkpe3RyeXthd2FpdCBiYXJrUHVzaChhY2MuYmFya0tleSwi5p6B5qC4562+5Yiw5oiQ5YqfIMK3ICIrKHIudXNlck5hbWV8fCIiKSwi5LuK5pel6I635b6XICIrci50b3RhbEdhaW4rIiDliIbvvIjnrb7liLAiK3Iuc2lnbmluU2NvcmUrIiAvIOebsuebkiIrci5ibGluZEJveFNjb3JlKyIgLyDkupLliqgiK3IuaW50ZXJhY3RTY29yZSsi77yJ77yM6L+e562+ICIrci5jb250aW51ZURheXMrIiDlpKkiKX1jYXRjaChlKXt9fX0KICAgIHJldHVybntvazp0cnVlLHJlc3VsdHN9OwogIH0sCiAgYXN5bmMgdmVoaWNsZUN0cmwodXNlcklkLGFjdGlvbil7CiAgICBpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5UG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wiLHt1c2VySWQ6dXNlcklkLGFjdGlvbjphY3Rpb259KTtyZXR1cm57b2s6ISFkLm9rLG1lc3NhZ2U6ZC5tZXNzYWdlfHwoZC5vaz8i5oyH5Luk5bey5LiL5Y+RIjoi5oyH5Luk5aSx6LSlIil9fQogICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjY291bnRzPWdldEFjY291bnRzKCk7bGV0IGFjYz1hY2NvdW50cy5maW5kKGE9PlN0cmluZyhhLnVzZXJJZCk9PT1TdHJpbmcodXNlcklkKSk7aWYoIWFjYyYmYWNjb3VudHMubGVuZ3RoKWFjYz1hY2NvdW50c1swXTtpZighYWNjKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLmnKrmib7liLDotKblj7fvvIzor7flhYjlnKjorr7nva7pobXmt7vliqAifTtpZighVkVISUNMRV9BQ1RJT05fVEVYVFthY3Rpb25dKXJldHVybntvazpmYWxzZSxtZXNzYWdlOiLpnZ7ms5Xmk43kvZznsbvlnosifTtjb25zdCByPWF3YWl0IHZlaGljbGVDb250cm9sKGFjYyxhY3Rpb24sY2ZnKTtjb25zdCBfdmQ9bmV3IERhdGUoKTtjb25zdCBfdmRzPV92ZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoX3ZkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX3ZkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpO2FkZExvZyh7dGltZTpfdmQudG9Mb2NhbGVTdHJpbmcoInpoLUNOIix7aG91cjEyOmZhbHNlfSksZGF0ZTpfdmRzLHR5cGU6InZlaGljbGUiLGFjdGlvbjphY3Rpb24sYWN0aW9uVGV4dDpWRUhJQ0xFX0FDVElPTl9URVhUW2FjdGlvbl18fCLovabovobmjqfliLYiLHVzZXJOYW1lOmFjYy51c2VyTmFtZXx8IuacquefpSIsdXNlcklkOmFjYy51c2VySWQsc3VjY2VzczohIXIub2ssbWVzc2FnZTpyLm1lc3NhZ2V8fCIiLGVycm9yOnIub2s/IiI6KHIubWVzc2FnZXx8IuaMh+S7pOWksei0pSIpfSk7cmV0dXJuIHI7CiAgfSwKICBhc3luYyBnZXRMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2dldC1sb2dzIik7cmV0dXJuIGQmJmQubG9ncz9kLmxvZ3M6W119cmV0dXJuIGdldExvZ3MoKX0sCiAgYXN5bmMgY2xlYXJMb2dzKCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvY2xlYXItbG9ncyIpO3JldHVybiAhIWQub2t9cmV0dXJuIGNsZWFyTG9ncygpfSwKICBhc3luYyBzYXZlQ29uZmlnKGMpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlQb3N0KCIvYXBpL3NhdmUtY29uZmlnIixjKTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQ2ZnKGMpfSwKICBhc3luYyBzYXZlQWNjb3VudHMobGlzdCl7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2FjY291bnRzOmxpc3R9KTtyZXR1cm4gISFkLm9rfXJldHVybiBzYXZlQWNjb3VudHMobGlzdCl9LAogIGFzeW5jIGdldFVzZXJpZCh0b2tlbil7aWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvZ2V0LXVzZXJpZCIse3Rva2VuOnRva2VufSk7cmV0dXJue29rOiEhZC5vayx1c2VySWQ6ZC51c2VySWR8fCIiLHVzZXJOYW1lOmQudXNlck5hbWV8fCIiLGVycm9yOmQuZXJyb3J8fCIifX1yZXR1cm4gZ2V0VXNlcmlkQnlUb2tlbih0b2tlbixnZXRDZmcoKSl9LAogIGFzeW5jIGdldENvbmZpZygpe2lmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9jb25maWciKTtpZihkJiZkLmNvbmZpZylyZXR1cm57b2s6dHJ1ZSxjb25maWc6ZC5jb25maWd9O3JldHVybntvazpmYWxzZSxlcnJvcjooZCYmZC5lcnJvcil8fCLojrflj5bphY3nva7lpLHotKUifX1yZXR1cm57b2s6dHJ1ZSxjb25maWc6Z2V0Q2ZnKCl9fSwKICBhc3luYyBnZXRBY2NvdW50c0Z1bGwoKXtpZihpc1Byb3h5TW9kZSgpKXtjb25zdCBkPWF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYWNjb3VudHMiKTtyZXR1cm4gQXJyYXkuaXNBcnJheShkJiZkLmFjY291bnRzKT9kLmFjY291bnRzOltdfXJldHVybiBnZXRBY2NvdW50cygpfSwKICBhc3luYyBiYWNrdXAoKXsKICAgIGlmKGlzUHJveHlNb2RlKCkpe2NvbnN0IGQ9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS9iYWNrdXAiKTtyZXR1cm4gZCYmZC5vaz9kOm51bGx9CiAgICByZXR1cm57b2s6dHJ1ZSxhcHA6IuaegeaguFpFRUhPIix0eXBlOiJ6ZWVob19iYWNrdXAiLHZlcnNpb246QVBQX1ZFUlNJT04sdGltZTpmbXRUaW1lKG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSksYWNjb3VudHM6Z2V0QWNjb3VudHMoKSxjb25maWc6Z2V0Q2ZnKCl9CiAgfSwKICBhc3luYyByZXN0b3JlQmFja3VwKGpzb24pewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eVBvc3QoIi9hcGkvaW1wb3J0Iix7anNvbjpqc29ufSk7cmV0dXJuIGR8fHtvazpmYWxzZSxlcnJvcjoi5ZCO56uv5peg5ZON5bqUIn19CiAgICB0cnl7CiAgICAgIGNvbnN0IGI9dHlwZW9mIGpzb249PT0ic3RyaW5nIj9KU09OLnBhcnNlKGpzb24pOmpzb247CiAgICAgIGlmKCFifHwoYi50eXBlIT09InplZWhvX2JhY2t1cCImJiFBcnJheS5pc0FycmF5KGIuYWNjb3VudHMpKSlyZXR1cm57b2s6ZmFsc2UsZXJyb3I6IuWkh+S7veagvOW8j+S4jeato+ehriJ9OwogICAgICBjb25zdCBsaXN0PShiLmFjY291bnRzfHxbXSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjpjbGVhblRva2VuKGEudG9rZW4pLGJhcmtLZXk6Y2xlYW5CYXJrS2V5KGEuYmFya0tleXx8IiIpLHVzZXJBZ2VudDphLnVzZXJBZ2VudHx8IiJ9KSk7CiAgICAgIHNhdmVBY2NvdW50cyhsaXN0KTsKICAgICAgaWYoYi5jb25maWcmJnR5cGVvZiBiLmNvbmZpZz09PSJvYmplY3QiKXsKICAgICAgICBjb25zdCBjdXI9Z2V0Q2ZnKCk7CiAgICAgICAgc2F2ZUNmZyh7CiAgICAgICAgICBhcHA6e2FwcElkOmIuY29uZmlnLmFwcD8uYXBwSWR8fGN1ci5hcHAuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmFwcD8uYXBwU2VjcmV0fHxjdXIuYXBwLmFwcFNlY3JldH0sCiAgICAgICAgICBoNTp7YXBwSWQ6Yi5jb25maWcuaDU/LmFwcElkfHxjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmIuY29uZmlnLmg1Py5hcHBTZWNyZXR8fGN1ci5oNS5hcHBTZWNyZXR9LAogICAgICAgICAgY29tbXVuaXR5OntlbmFibGVQb3N0OmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlUG9zdCE9PWZhbHNlLGVuYWJsZUxpa2U6Yi5jb25maWcuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZUNvbW1lbnQhPT1mYWxzZSxlbmFibGVTaGFyZTpiLmNvbmZpZy5jb21tdW5pdHk/LmVuYWJsZVNoYXJlIT09ZmFsc2UsZW5hYmxlRGVsZXRlOmIuY29uZmlnLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgICAgICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYi5jb25maWcudmVoaWNsZUFlc0tleXx8IiIpLnRyaW0oKXx8Y3VyLnZlaGljbGVBZXNLZXksCiAgICAgICAgICB2ZWhpY2xlQ29udHJvbFJpc2s6U3RyaW5nKGIuY29uZmlnLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgICAgICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYi5jb25maWcuYXV0b1JlZnJlc2hTZWMpLAogICAgICAgICAgc2VydmVyQmFzZTpjdXIuc2VydmVyQmFzZQogICAgICAgIH0pOwogICAgICB9CiAgICAgIHJldHVybntvazp0cnVlLGNvdW50Omxpc3QubGVuZ3RofTsKICAgIH1jYXRjaChlKXtyZXR1cm57b2s6ZmFsc2UsZXJyb3I6U3RyaW5nKGUpfX0KICB9LAogIC8qIC0tLS0gdjIuMTQuOSDmlrDlop7lkI7nq6/og73lipvvvIjku4Xku6PnkIbmqKHlvI/vvIkgLS0tLSAqLwogIGFzeW5jIGludGVncmFsKHVzZXJJZCxwYWdlKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBERU1PX0lOVEVHUkFMOwogICAgaWYoaXNQcm94eU1vZGUoKSl7cmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvaW50ZWdyYWw/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpKyImcGFnZT0iKyhwYWdlfHwxKSl9CiAgICByZXR1cm57b2s6ZmFsc2UsZXJyb3I6Iuenr+WIhuWKn+iDveS7heaUr+aMgeS7o+eQhuaooeW8j++8iGlPUyBBcHAgLyDmoYzpnaLniYggLyBMb29u77yJIn0KICB9LAogIGFzeW5jIHN1cHBsZW1lbnQoYWN0aW9uLHVzZXJJZCxwYXJhbXMpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIGFjdGlvbj09PSJtb250aCI/e29rOnRydWUsZGF0YTp7bm93U2lnbkRldGFpbFZvczpkZW1vQ2FsKCl9fTooREVNT19TVVBQTEVNRU5UW2FjdGlvbl18fHtvazp0cnVlLGRhdGE6MX0pOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGxldCBxPSIvYXBpL3N1cHBsZW1lbnQ/YWN0aW9uPSIrZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbikrIiZ1c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIik7CiAgICAgIHBhcmFtcz1wYXJhbXN8fHt9O09iamVjdC5rZXlzKHBhcmFtcykuZm9yRWFjaChrPT57cSs9IiYiK2VuY29kZVVSSUNvbXBvbmVudChrKSsiPSIrZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1trXSl9KTsKICAgICAgcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2gocSkKICAgIH0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6KGl562+5Yqf6IO95LuF5pSv5oyB5Luj55CG5qih5byP77yIaU9TIEFwcCAvIOahjOmdoueJiCAvIExvb27vvIkifQogIH0sCiAgYXN5bmMgdmVoaWNsZU1vbml0b3IodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19NT05JVE9SOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvdmVoaWNsZS1tb25pdG9yP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWR8fCIiKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybntvazpmYWxzZSxlcnJvcjoi6L2m6L6G55uR5o6n5LuF5pSv5oyB5Luj55CG5qih5byPIn0KICB9LAogIGFzeW5jIHZlaGljbGVDb250cm9sRXh0KGJvZHkpewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIChib2R5JiZib2R5LmFjdGlvbj09PSJvcHRpb25zIik/REVNT19DVFJMX09QVFM6e29rOnRydWUsbWVzc2FnZToi5ryU56S65qih5byP77ya5oyH5Luk5pyq55yf5a6e5LiL5Y+RIn07CiAgICBpZihpc1Byb3h5TW9kZSgpKXtyZXR1cm4gYXdhaXQgcHJveHlQb3N0KCIvYXBpL3ZlaGljbGUtY29udHJvbC1leHQiLGJvZHkpfQogICAgcmV0dXJue29rOmZhbHNlLG1lc3NhZ2U6Iui9puaOp+aJqeWxleS7heaUr+aMgeS7o+eQhuaooeW8jyJ9CiAgfSwKICBhc3luYyBiYXR0ZXJ5U3RhdGUodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm57b2s6dHJ1ZSx2aW5ObzoiREVNTyIsY2hhcmdpbmc6ZmFsc2UsY3VycmVudDowLHNvYzo3MCx2b2x0YWdlOjgwLjUsY2hhcmdlU3RhdGU6IuacquWFheeUtSIsZnVsbENoYXJnZVRpbWU6MCxmdWxsQ2hhcmdlVGltZVNlY29uZDowfTsKICAgIGlmKGlzUHJveHlNb2RlKCkpcmV0dXJuIGF3YWl0IHByb3h5RmV0Y2goIi9hcGkvYmF0dGVyeS1zdGF0ZT91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrKHZpbj8iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pOiIiKSk7CiAgICByZXR1cm4gYXdhaXQgZmV0Y2hCYXR0ZXJ5U3RhdGVEaXJlY3QocmlkZUFjY0xvY2FsKHVzZXJJZCksZ2V0Q2ZnKCksdmluKTsKICB9LAogIGFzeW5jIGluZm9DZW50ZXIodXNlcklkLHZpbil7CiAgICBpZihpc0RlbW8oKSlyZXR1cm4gREVNT19JTkZPOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvaW5mby1jZW50ZXI/dXNlcklkPSIrZW5jb2RlVVJJQ29tcG9uZW50KHVzZXJJZHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJue29rOmZhbHNlLGVycm9yOiLkv6Hmga/kuK3lv4Pku4XmlK/mjIHku6PnkIbmqKHlvI8ifQogIH0sCiAgLyogLS0tLSB2Mi4xNi4wIOmakOiXj+mqkeihjOaVsOaNriAtLS0tICovCiAgYXN5bmMgcmlkZU1vbnRoKHVzZXJJZCxtb250aCx2aW4pewogICAgaWYoaXNEZW1vKCkpcmV0dXJuIGRlbW9SaWRlTW9udGgobW9udGgpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvcmlkZS1tb250aD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZtb250aD0iK2VuY29kZVVSSUNvbXBvbmVudChtb250aHx8IiIpO2lmKHZpbilxKz0iJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2aW4pO3JldHVybiBhd2FpdCBwcm94eUZldGNoKHEpfQogICAgcmV0dXJuIGF3YWl0IGZldGNoUmlkZU1vbnRoRGlyZWN0KHJpZGVBY2NMb2NhbCh1c2VySWQpLGdldENmZygpLG1vbnRoLHZpbik7CiAgfSwKICBhc3luYyByaWRlVHJhY2sodXNlcklkLHZpbixwYWdlLHBhZ2VTaXplLG1vbnRoKXsKICAgIGlmKGlzRGVtbygpKXJldHVybiBkZW1vUmlkZVRyYWNrKHBhZ2UpOwogICAgaWYoaXNQcm94eU1vZGUoKSl7bGV0IHE9Ii9hcGkvcmlkZS10cmFjaz91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQodXNlcklkfHwiIikrIiZwYWdlPSIrKHBhZ2V8fDEpKyImcGFnZVNpemU9IisocGFnZVNpemV8fDIwKTtpZih2aW4pcSs9IiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKTtpZihtb250aClxKz0iJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KG1vbnRoKTtyZXR1cm4gYXdhaXQgcHJveHlGZXRjaChxKX0KICAgIHJldHVybiBhd2FpdCBmZXRjaFJpZGVUcmFja0RpcmVjdChyaWRlQWNjTG9jYWwodXNlcklkKSxnZXRDZmcoKSx2aW4scGFnZSxwYWdlU2l6ZSxtb250aCk7CiAgfSwKICBhc3luYyBpbnN0YWxsSW5mbygpewogICAgaWYoaXNQcm94eU1vZGUoKSl7Y29uc3QgZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL2FwcC1pbnN0YWxsLWluZm8iKTtyZXR1cm4gZHx8bnVsbH0KICAgIHJldHVybiBudWxsCiAgfQp9OwovKiA9PT09PT09PT09PT09PT09PSDpnaLmnb/mlbDmja7lkIzmraXvvIjpnaLmnb/mqKHlvI/vvJrorr7nva7pobXku47ohJrmnKzlkI7nq6/or7votKblj7fkuI7phY3nva7vvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gYXBwbHlSZW1vdGVDZmcoYyl7CiAgaWYoIWN8fHR5cGVvZiBjIT09Im9iamVjdCIpcmV0dXJuOwogIGNvbnN0IGxvY2FsPWdldENmZygpOwogIHNhdmVDZmcoewogICAgYXBwOnthcHBJZDpjLmFwcD8uYXBwSWR8fGxvY2FsLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Yy5hcHA/LmFwcFNlY3JldHx8bG9jYWwuYXBwLmFwcFNlY3JldH0sCiAgICBoNTp7YXBwSWQ6Yy5oNT8uYXBwSWR8fGxvY2FsLmg1LmFwcElkLGFwcFNlY3JldDpjLmg1Py5hcHBTZWNyZXR8fGxvY2FsLmg1LmFwcFNlY3JldH0sCiAgICBjb21tdW5pdHk6e2VuYWJsZVBvc3Q6Yy5jb21tdW5pdHk/LmVuYWJsZVBvc3QhPT1mYWxzZSxlbmFibGVMaWtlOmMuY29tbXVuaXR5Py5lbmFibGVMaWtlIT09ZmFsc2UsZW5hYmxlQ29tbWVudDpjLmNvbW11bml0eT8uZW5hYmxlQ29tbWVudCE9PWZhbHNlLGVuYWJsZVNoYXJlOmMuY29tbXVuaXR5Py5lbmFibGVTaGFyZSE9PWZhbHNlLGVuYWJsZURlbGV0ZTpjLmNvbW11bml0eT8uZW5hYmxlRGVsZXRlIT09ZmFsc2V9LAogICAgdmVoaWNsZUFlc0tleTpTdHJpbmcoYy52ZWhpY2xlQWVzS2V5fHwiIikudHJpbSgpfHxsb2NhbC52ZWhpY2xlQWVzS2V5LAogICAgdmVoaWNsZUNvbnRyb2xSaXNrOlN0cmluZyhjLnZlaGljbGVDb250cm9sUmlza3x8IiIpLnRyaW0oKSwKICAgIGF1dG9SZWZyZXNoU2VjOm5vcm1hbGl6ZVJlZnJlc2hTZWMoYy5hdXRvUmVmcmVzaFNlYyksCiAgICBzZXJ2ZXJCYXNlOmxvY2FsLnNlcnZlckJhc2UsCiAgICBhdXRvU2lnbmluOmMuYXV0b1NpZ25pbj09PXRydWUsCiAgICBhdXRvU2lnbmluVGltZToodHlwZW9mIGMuYXV0b1NpZ25pblRpbWU9PT0ic3RyaW5nIiYmL15cZHsxLDJ9OlxkezJ9JC8udGVzdChjLmF1dG9TaWduaW5UaW1lKT9jLmF1dG9TaWduaW5UaW1lOiIwNzowMCIpLAogICAgdmVoaWNsZU1vbml0b3I6Yy52ZWhpY2xlTW9uaXRvcj09PXRydWUsCiAgICB2ZWhpY2xlQWxlcnRQdXNoOmMudmVoaWNsZUFsZXJ0UHVzaCE9PWZhbHNlLAogICAgd2lkZ2V0VmVoaWNsZTpTdHJpbmcoYy53aWRnZXRWZWhpY2xlfHwiIiksCiAgICB3aWRnZXRGb250Ok51bWJlcihjLndpZGdldEZvbnQpfHwxLAogICAgY3VzdG9tQmc6U3RyaW5nKGMuY3VzdG9tQmd8fCIiKSwKICAgIHBpY3M6KGMucGljcyYmdHlwZW9mIGMucGljcz09PSJvYmplY3QiKT9jLnBpY3M6KGxvY2FsLnBpY3N8fHt9KQogIH0pOwp9CmxldCBwYW5lbFN5bmNpbmc9ZmFsc2U7CmFzeW5jIGZ1bmN0aW9uIGVuc3VyZVBhbmVsRGF0YShmb3JjZSl7CiAgaWYoIWlzUHJveHlNb2RlKCl8fGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTApcmV0dXJuOwogIGlmKHBhbmVsU3luY2luZylyZXR1cm47CiAgaWYoIWZvcmNlJiZTVEFURS5wYW5lbExvYWRlZClyZXR1cm47CiAgcGFuZWxTeW5jaW5nPXRydWU7CiAgdHJ5ewogICAgY29uc3QgW2MsYV09YXdhaXQgUHJvbWlzZS5hbGwoW0JhY2tlbmQuZ2V0Q29uZmlnKCksQmFja2VuZC5nZXRBY2NvdW50c0Z1bGwoKV0pOwogICAgaWYoYSYmYS5sZW5ndGgpe1NUQVRFLnBhbmVsQWNjb3VudHM9YX0KICAgIGlmKGMmJmMub2smJmMuY29uZmlnKWFwcGx5UmVtb3RlQ2ZnKGMuY29uZmlnKTsKICAgIFNUQVRFLnBhbmVsTG9hZGVkPXRydWU7CiAgfWNhdGNoKGUpe30KICBwYW5lbFN5bmNpbmc9ZmFsc2U7Cn0KLyogPT09PT09PT09PT09PT09PT0g5Zu+5qCHID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEk9ewpjaGVjazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiLz48L3N2Zz4nLAp4Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi42IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0xOCA2IDYgMThNNiA2bDEyIDEyIi8+PC9zdmc+JywKemFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAyIDMgMTRoN2wtMSA4IDEwLTEyaC03bDEtOHoiLz48L3N2Zz4nLApsb2NrOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjQiIHk9IjExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIzIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz4nLAp1bmxvY2s6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNCIgeT0iMTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCIgcng9IjMiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA3LjUtMS43Ii8+PC9zdmc+JywKYmVsbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggOGE2IDYgMCAxIDAtMTIgMGMwIDctMyA5LTMgOWgxOHMtMy0yLTMtOSIvPjxwYXRoIGQ9Ik0xMy43IDIxYTIgMiAwIDAgMS0zLjQgMCIvPjwvc3ZnPicsCnZvbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0VjV6Ii8+PHBhdGggZD0iTTE1LjUgOC41YTUgNSAwIDAgMSAwIDdNMTguNSA1LjVhOSA5IDAgMCAxIDAgMTMiLz48L3N2Zz4nLApzZWF0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDRoMTR2N2E0IDQgMCAwIDEtNCA0SDlhNCA0IDAgMCAxLTQtNFY0eiIvPjxwYXRoIGQ9Ik05IDE1djVoNnYtNSIvPjwvc3ZnPicsCnBpbjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDB6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPicsCnRpcmU6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjUiLz48cGF0aCBkPSJNMTIgM3Y1LjVNMTIgMTUuNVYyMU0zIDEyaDUuNU0xNS41IDEySDIxIi8+PC9zdmc+JywKYm9sdDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMiAzIDE0aDdsLTEgOCAxMC0xMmgtN2wxLTh6Ii8+PC9zdmc+JywKdGhlcm1vOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNCAxNC43NlY1YTIgMiAwIDEgMC00IDB2OS43NmE0IDQgMCAxIDAgNCAweiIvPjwvc3ZnPicsCmNhbDonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIzIi8+PHBhdGggZD0iTTE2IDJ2NE04IDJ2NE0zIDEwaDE4Ii8+PC9zdmc+JywKY2FyOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEzIDYuNSA3LjVBMiAyIDAgMCAxIDguNCA2aDcuMmEyIDIgMCAwIDEgMS45IDEuNUwxOSAxMyIvPjxwYXRoIGQ9Ik00IDEzaDE2YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEtMSAxaC0xYTIgMiAwIDEgMS00IDBIOWEyIDIgMCAxIDEtNCAwSDRhMSAxIDAgMCAxLTEtMXYtM2ExIDEgMCAwIDEgMS0xeiIvPjwvc3ZnPicsCnNjb290ZXI6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+JywKcGx1ZzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAydjZNMTUgMnY2TTcgOGgxMHY0YTUgNSAwIDAgMS0xMCAwVjh6TTEyIDE3djUiLz48L3N2Zz4nLApjbG9jazonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTEyIDd2NWwzIDMiLz48L3N2Zz4nLAp3aWZpOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDEyLjVhMTAgMTAgMCAwIDEgMTQgME04LjUgMTZhNSA1IDAgMCAxIDcgMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTkiIHI9IjEiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPicsCmFsZXJ0Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiA5djRNMTIgMTdoLjAxIi8+PHBhdGggZD0iTTEwLjMgMy45IDEuOCAxOGEyIDIgMCAwIDAgMS43IDNoMTdhMiAyIDAgMCAwIDEuNy0zTDEzLjcgMy45YTIgMiAwIDAgMC0zLjQgMHoiLz48L3N2Zz4nLAp3YXJuOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzIDIgMjFoMjBMMTIgM3oiLz48cGF0aCBkPSJNMTIgMTB2NU0xMiAxOGguMDEiLz48L3N2Zz4nLAprdjonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTQiIHJ4PSIzIi8+PHBhdGggZD0iTTcgOWgzTTE0IDE1aDNNMTAgOWguMDFNMTcgMTVoLjAxIi8+PC9zdmc+JywKa2V5Oic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjgiIGN5PSIxNSIgcj0iNC41Ii8+PHBhdGggZD0iTTExLjIgMTEuOCAyMCAzTTE2IDdsMyAzTTEzIDEwbDIgMiIvPjwvc3ZnPicsCnVzZXJzOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjkiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIgMjFhNyA3IDAgMCAxIDE0IDBNMTYgNC42YTQgNCAwIDAgMSAwIDYuOE0xOSAyMWE2LjUgNi41IDAgMCAwLTMtNS41Ii8+PC9zdmc+JywKbWFwOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDMgMy41IDV2MTZMOSAxOWw2IDIgNS41LTJWM0wxNSA1IDkgM3oiLz48cGF0aCBkPSJNOSAzdjE2TTE1IDV2MTYiLz48L3N2Zz4nCn07CgovKiA9PT09PT09PT09PT09PT09PSDln7rnoYAgVUkgPT09PT09PT09PT09PT09PT0gKi8KbGV0IHRvYXN0VGltZXI9bnVsbDsKZnVuY3Rpb24gdG9hc3QobXNnLHR5cGUpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ0b2FzdCIpO2VsLmNsYXNzTmFtZT10eXBlfHwiaW5mbyI7ZWwuaW5uZXJIVE1MPSh0eXBlPT09ImVyciI/SS54OnR5cGU9PT0ib2siP0kuY2hlY2s6SS53aWZpKSsnPHNwYW4+Jytlc2MobXNnKSsnPC9zcGFuPic7cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT5lbC5jbGFzc0xpc3QuYWRkKCJzaG93IikpO2NsZWFyVGltZW91dCh0b2FzdFRpbWVyKTt0b2FzdFRpbWVyPXNldFRpbWVvdXQoKCk9PmVsLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKSwyNjAwKX0KLyogdjIuMTQuMTAg5L+u5aSN77ya5pen54mI5oqK5Zue6LCD5Ye95pWw5rqQ56CB55u05o6l5ou86L+bIG9uY2xpY2sg5bGe5oCn77yMYXN5bmMg5Zue6LCD5YaF55qE5Y+M5byV5Y+35Lya5oiq5patIEhUTUwg5bGe5oCn77yMCiAgIOWvvOiHtOihpeetvi/lhZHmjaLooaXnrb7ljaEv6Ziy55uX5biD5o6n562J44CM56Gu5a6a44CN5oyJ6ZKu54K55Ye75peg5Y+N5bqU44CC5pS55Li65pqC5a2Y5Zue6LCD44CB5oyJ6ZKu6LCD55So5YWo5bGAIGNvbmZpcm1ZZXMoKSAqLwpsZXQgX19jb25maXJtQWN0PW51bGw7CmZ1bmN0aW9uIGNvbmZpcm1EaWFsb2codGl0bGUsZGVzYyxvblllcyx5ZXNUeHQpe19fY29uZmlybUFjdD1vblllcztjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7bGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+Jytlc2ModGl0bGUpKyc8L2Rpdj48ZGl2IGNsYXNzPSJjZCI+JytkZXNjKyc8L2Rpdj48ZGl2IGNsYXNzPSJjYiI+PGJ1dHRvbiBjbGFzcz0ibm8iIG9uY2xpY2s9ImNsb3NlQ29uZmlybSgpIj7lj5bmtog8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9ImNvbmZpcm1ZZXMoKSI+Jytlc2MoeWVzVHh0fHwi56Gu5a6aIikrJzwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7bGF5ZXIuY2xhc3NMaXN0LnJlbW92ZSgiaGlkZGVuIil9CmZ1bmN0aW9uIGNvbmZpcm1ZZXMoKXtjbG9zZUNvbmZpcm0oKTtjb25zdCBhPV9fY29uZmlybUFjdDtfX2NvbmZpcm1BY3Q9bnVsbDtpZihhPT1udWxsKXJldHVybjt0cnl7aWYodHlwZW9mIGE9PT0iZnVuY3Rpb24iKXthKCl9ZWxzZSBpZih0eXBlb2YgYT09PSJzdHJpbmciKXtjb25zdCByPW5ldyBGdW5jdGlvbigicmV0dXJuICgiK2ErIikiKSgpO2lmKHR5cGVvZiByPT09ImZ1bmN0aW9uIilyKCl9fWNhdGNoKGUpe319CmZ1bmN0aW9uIGNsb3NlQ29uZmlybSgpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb25maXJtTGF5ZXIiKS5jbGFzc0xpc3QuYWRkKCJoaWRkZW4iKX0KZnVuY3Rpb24gb3BlblNoZWV0KHRpdGxlLGljb24saHRtbCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0VGl0bGUiKS5pbm5lckhUTUw9aWNvbisnPHNwYW4+Jytlc2ModGl0bGUpKyc8L3NwYW4+Jztkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCb2R5IikuaW5uZXJIVE1MPWh0bWw7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0QmFja2Ryb3AiKS5jbGFzc0xpc3QuYWRkKCJzaG93Iik7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNoZWV0IikuY2xhc3NMaXN0LmFkZCgic2hvdyIpO2RvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9ImhpZGRlbiJ9CmZ1bmN0aW9uIGNsb3NlU2hlZXQoKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXRCYWNrZHJvcCIpLmNsYXNzTGlzdC5yZW1vdmUoInNob3ciKTtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2hlZXQiKS5jbGFzc0xpc3QucmVtb3ZlKCJzaG93Iik7ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz0iIn0KZnVuY3Rpb24gZm10VGltZShpc28pe3RyeXtjb25zdCBkPW5ldyBEYXRlKGlzbyk7Y29uc3QgcD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpO3JldHVybiBkLmdldEZ1bGxZZWFyKCkrIi0iK3AoZC5nZXRNb250aCgpKzEpKyItIitwKGQuZ2V0RGF0ZSgpKSsiICIrcChkLmdldEhvdXJzKCkpKyI6IitwKGQuZ2V0TWludXRlcygpKSsiOiIrcChkLmdldFNlY29uZHMoKSl9Y2F0Y2goZSl7cmV0dXJuIiJ9fQoKLyogPT09PT09PT09PT09PT09PT0g6aG16Z2i5YiH5o2iID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIHN3aXRjaFRhYih0YWIpewogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIi50YWIiKS5mb3JFYWNoKHQ9PnQuY2xhc3NMaXN0LnRvZ2dsZSgib24iLHQuZGF0YXNldC50YWI9PT10YWIpKTsKICBjb25zdCBwYWdlcz17aG9tZToicGFnZUhvbWUiLHBvaW50czoicGFnZVBvaW50cyIsdmVoaWNsZToicGFnZVZlaGljbGUiLHJpZGU6InBhZ2VSaWRlIixsb2dzOiJwYWdlTG9ncyIsY2ZnOiJwYWdlQ2ZnIn07CiAgT2JqZWN0LmtleXMocGFnZXMpLmZvckVhY2goaz0+e2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhZ2VzW2tdKTtpZihlbCllbC5jbGFzc0xpc3QudG9nZ2xlKCJoaWRkZW4iLGshPT10YWIpfSk7CiAgLy8g56uL5Y2z562+5Yiw5oKs5rWu5oyJ6ZKu5LuF6aaW6aG15pi+56S6CiAgY29uc3QgZmFiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJzaWduaW5GYWIiKTtpZihmYWIpZmFiLnN0eWxlLmRpc3BsYXk9KHRhYj09PSJob21lIj8iZmxleCI6Im5vbmUiKTsKICBpZih0YWI9PT0icG9pbnRzIilyZW5kZXJQb2ludHMoKTsKICBpZih0YWI9PT0idmVoaWNsZSIpe3JlbmRlclZlaGljbGVQYWdlKCl9CiAgaWYodGFiPT09InJpZGUiKXtyZW5kZXJSaWRlUGFnZSgpfQogIGlmKHRhYj09PSJsb2dzIilyZW5kZXJMb2dzKCk7CiAgaWYodGFiPT09ImNmZyIpcmVuZGVyQ2ZnKCk7Cn0KCi8qID09PT09PT09PT09PT09PT09IOiHquWKqOWIt+aWsCA9PT09PT09PT09PT09PT09PSAqLwpsZXQgcmVmcmVzaFRpbWVyPW51bGwscmVmcmVzaExlZnQ9NjA7CmZ1bmN0aW9uIHN0YXJ0QXV0b1JlZnJlc2goc2VjKXtzdG9wQXV0b1JlZnJlc2goKTtyZWZyZXNoTGVmdD1zZWN8fGdldENmZygpLmF1dG9SZWZyZXNoU2VjO3VwZGF0ZUNvdW50Q2hpcCgpO3JlZnJlc2hUaW1lcj1zZXRJbnRlcnZhbCgoKT0+e3JlZnJlc2hMZWZ0LS07aWYocmVmcmVzaExlZnQ8PTApe3JlZnJlc2hMZWZ0PTA7dXBkYXRlQ291bnRDaGlwKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHVwZGF0ZUNvdW50Q2hpcCgpfSwxMDAwKX0KZnVuY3Rpb24gc3RvcEF1dG9SZWZyZXNoKCl7aWYocmVmcmVzaFRpbWVyKXtjbGVhckludGVydmFsKHJlZnJlc2hUaW1lcik7cmVmcmVzaFRpbWVyPW51bGx9fQpmdW5jdGlvbiB1cGRhdGVDb3VudENoaXAoKXtjb25zdCBjaGlwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudENoaXAiKTtjb25zdCB0eHQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImNvdW50VHh0Iik7Y29uc3QgYXJjPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb3VudEFyYyIpO2NvbnN0IHNlYz1nZXRDZmcoKS5hdXRvUmVmcmVzaFNlY3x8NjA7aWYoIWNoaXApcmV0dXJuO2lmKHJlZnJlc2hUaW1lcil7Y2hpcC5jbGFzc0xpc3QuYWRkKCJvbiIpO3R4dC50ZXh0Q29udGVudD1yZWZyZXNoTGVmdCsicyI7Y29uc3QgQz0yKk1hdGguUEkqNS42O2FyYy5zZXRBdHRyaWJ1dGUoInN0cm9rZS1kYXNob2Zmc2V0IixTdHJpbmcoQyooMS1yZWZyZXNoTGVmdC9zZWMpKSl9ZWxzZXtjaGlwLmNsYXNzTGlzdC5yZW1vdmUoIm9uIik7dHh0LnRleHRDb250ZW50PSLmiYvliqgifX0KZnVuY3Rpb24gdG9nZ2xlQXV0b1JlZnJlc2goKXtpZihyZWZyZXNoVGltZXIpc3RvcEF1dG9SZWZyZXNoKCk7ZWxzZSBzdGFydEF1dG9SZWZyZXNoKCk7dXBkYXRlQ291bnRDaGlwKCl9CgovKiA9PT09PT09PT09PT09PT09PSDkuIvmi4nliLfmlrAgPT09PT09PT09PT09PT09PT0gKi8KKGZ1bmN0aW9uKCl7Y29uc3Qgd3JhcD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRyV3JhcCIpLGluZD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicHRySW5kIiksdHh0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJUeHQiKSxzcGluPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwdHJTcGluIik7bGV0IHN0YXJ0WT0wLHB1bGxpbmc9ZmFsc2UsZGlzdGFuY2U9MDtjb25zdCBUSD02NDsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaHN0YXJ0IixlPT57aWYod2luZG93LnNjcm9sbFk8PTAmJmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJwYWdlSG9tZSIpJiYhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJoaWRkZW4iKSl7c3RhcnRZPWUudG91Y2hlc1swXS5jbGllbnRZO3B1bGxpbmc9dHJ1ZTtkaXN0YW5jZT0wfX0se3Bhc3NpdmU6dHJ1ZX0pOwp3cmFwLmFkZEV2ZW50TGlzdGVuZXIoInRvdWNobW92ZSIsZT0+e2lmKCFwdWxsaW5nKXJldHVybjtjb25zdCBkeT1lLnRvdWNoZXNbMF0uY2xpZW50WS1zdGFydFk7aWYoZHk+MCYmd2luZG93LnNjcm9sbFk8PTApe2Rpc3RhbmNlPU1hdGgubWluKGR5KjAuNSw5MCk7aW5kLnN0eWxlLmhlaWdodD1kaXN0YW5jZSsicHgiO2luZC5jbGFzc0xpc3QuYWRkKCJwdWxsaW5nIik7c3Bpbi5zdHlsZS50cmFuc2Zvcm09InJvdGF0ZSgiKyhkaXN0YW5jZSozLjYpKyJkZWcpIjt0eHQudGV4dENvbnRlbnQ9ZGlzdGFuY2U+PVRIPyLmnb7lvIDliLfmlrAiOiLkuIvmi4nliLfmlrAiO2lmKGRpc3RhbmNlPj1USCYmIWUuY2FuY2VsYWJsZSlyZXR1cm47aWYoZGlzdGFuY2U+PVRIJiZlLmNhbmNlbGFibGUpZS5wcmV2ZW50RGVmYXVsdCgpfX0se3Bhc3NpdmU6ZmFsc2V9KTsKd3JhcC5hZGRFdmVudExpc3RlbmVyKCJ0b3VjaGVuZCIsKCk9PntpZighcHVsbGluZylyZXR1cm47cHVsbGluZz1mYWxzZTtpZihkaXN0YW5jZT49VEgpe3R4dC50ZXh0Q29udGVudD0i5Yi35paw5Lit4oCmIjtpbmQuc3R5bGUuaGVpZ2h0PSI0NnB4IjtzcGluLmNsYXNzTGlzdC5hZGQoInNwaW5uZXIiKTtyZWZyZXNoQWxsKHRydWUpLmZpbmFsbHkoKCk9PntpbmQuc3R5bGUuaGVpZ2h0PSIwIjtpbmQuY2xhc3NMaXN0LnJlbW92ZSgicHVsbGluZyIpfSl9ZWxzZXtpbmQuc3R5bGUuaGVpZ2h0PSIwIn1kaXN0YW5jZT0wfSx7cGFzc2l2ZTp0cnVlfSk7Cn0pKCk7CgovKiA9PT09PT09PT09PT09PT09PSDpppbpobXmuLLmn5MgPT09PT09PT09PT09PT09PT0gKi8KbGV0IFNUQVRFPXtkYXRhOltdLHRpbWVzdGFtcDoiIix0c1RleHQ6IiIscmVmcmVzaFNlYzo2MCxwcm94eTpmYWxzZSxwYW5lbEFjY291bnRzOm51bGwscGFuZWxMb2FkZWQ6ZmFsc2V9OwovLyDpppbpobXljaHniYflhaXlnLrliqjnlLvlj6rlnKjnrKzkuIDmrKHmuLLmn5Pml7bmkq3mlL7vvIzkuYvlkI7pnZnpu5jliLfmlrDnm7TmjqXmm7/mjaLlhoXlrrnvvIzpgb/lhY3lsY/pl6oKbGV0IEhPTUVfQU5JTT10cnVlOwpmdW5jdGlvbiBza2VsZXRvbkhvbWUoKXtyZXR1cm4gJzxkaXYgY2xhc3M9Imhlcm8iIHN0eWxlPSJoZWlnaHQ6MTMycHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJzay1jYXJkIj48ZGl2IGNsYXNzPSJzay1saW5lIHc0MCI+PC9kaXY+PGRpdiBjbGFzcz0ic2stcm93Ij4nK0FycmF5KDQpLmZpbGwoJzxkaXYgY2xhc3M9InNrLWNlbGwiPjwvZGl2PicpLmpvaW4oIiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJzay1iYXIgdzgwIj48L2Rpdj48L2Rpdj4nKwonPGRpdiBjbGFzcz0ic2stY2FyZCI+PGRpdiBjbGFzcz0ic2stbGluZSB3NjAiPjwvZGl2PjxkaXYgY2xhc3M9InNrLXJvdyI+JytBcnJheSg0KS5maWxsKCc8ZGl2IGNsYXNzPSJzay1jZWxsIj48L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PGRpdiBjbGFzcz0ic2stYmFyIHc4MCI+PC9kaXY+PC9kaXY+J30KZnVuY3Rpb24gc2Nvb3RlckZhbGxiYWNrKCl7cmV0dXJuICc8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjUiIGN5PSIxOCIgcj0iMi40Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxNyIgcj0iMi40Ii8+PHBhdGggZD0iTTUgMThoMTBsNC0xLTIuNS00SDlNNyA5aDRNMTIgMTNWN20wIDAgMiAyIi8+PC9zdmc+J30KCmZ1bmN0aW9uIHJlbmRlckhvbWUoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtjb25zdCBkYXRhPVNUQVRFLmRhdGE7CiAgLy8g5LiN5YaN5Zyo5q+P5qyh5riy5p+T5YmN5o+S5YWl6aqo5p625bGP77ya6Z2Z6buY6Ieq5Yqo5Yi35paw5pe25Lya5YWI5riF56m65YaN5aGr5YWF77yM6YCg5oiQ5pW06aG16Zeq54OBCiAgaWYoZGF0YS5sZW5ndGg9PT0wKXsKICAgIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPjxkaXYgY2xhc3M9ImUtaWNvbiI+JytJLmNhcisnPC9kaXY+PGgzPui/mOayoeacieaegeaguOi0puWPtzwvaDM+PHA+5Y6744CM6K6+572u44CN6aG15re75Yqg6LSm5Y+377ya57KY6LS05oqT5YyF5b6X5Yiw55qEIEF1dGhvcml6YXRpb24gVG9rZW7vvIhCZWFyZXIg5YmN57yA5Lya6Ieq5Yqo5Y675o6J77yJ77yM5YaN54K544CM6I635Y+WSUTjgI3ljbPlj6/oh6rliqjloavlhYXnlKjmiLdJROOAgjwvcD48YnV0dG9uIGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7ljrvmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nOwogICAgcmV0dXJuOwogIH0KICAvLyDmsqHmnInnu5HlrprovabovobnmoTotKblj7fkuI3lnKjpppbpobXmmL7npLrljaHniYcKICBjb25zdCB3aXRoVmVoPWRhdGEuZmlsdGVyKGE9PmEudmVoaWNsZSYmYS52ZWhpY2xlLmhhc1ZlaGljbGUpOwogIGNvbnN0IGNhcmRzPXdpdGhWZWgubWFwKChhLGlkeCk9PnJlbmRlckFjY291bnRDYXJkKGEsaWR4KSkuam9pbigiIik7CiAgY29uc3Qgc3RhZ2U9d2l0aFZlaC5sZW5ndGg/cmVuZGVyR2FyYWdlU3RhZ2Uod2l0aFZlaFswXSk6IiI7CiAgZWwuaW5uZXJIVE1MPXN0YWdlK2NhcmRzCiAgKyc8ZGl2IGNsYXNzPSJmb290Ij7mnoHmoLggWkVFSE8g6Z2i5p2/ICcrQVBQX1ZFUlNJT04rJyDCtyDmlbDmja7mm7TmlrAgJytlc2MoU1RBVEUudHNUZXh0fHwiLSIpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITyIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPuS9nOiAhSBsdWNreSDCtyBHaXRIdWI8L2E+IMK3IDxhIGNsYXNzPSJsaW5rIiBocmVmPSJodHRwczovL2FmZGlhbi5jb20vYS9sdWNreTc5OCIgdGFyZ2V0PSJfYmxhbmsiIHJlbD0ibm9vcGVuZXIiPueIseWPkeeUtTwvYT4gwrcg5LuF5L6b5a2m5Lmg56CU56m2PC9kaXY+JzsKICBpZihzdGFnZSlTY29vdGVyM0QubW91bnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImczZFN0YWdlIiksZ2FyYWdlU3RhdGUod2l0aFZlaFswXSkpOwogIGVsc2UgU2Nvb3RlcjNELnN0b3AoKTsKICBIT01FX0FOSU09ZmFsc2U7Cn0KCmZ1bmN0aW9uIHBvd2VyVGV4dChwLGwpe3A9U3RyaW5nKHB8fCIiKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtsPVN0cmluZyhsfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7Y29uc3Qgb25WYWxzPVsiMSIsIm9uIiwidHJ1ZSIsIuW8gOacuiIsIm9wZW4iLCLmv4DmtLsiLCJhY2Nfb24iLCJhY2Mgb24iLCJwb3dlcl9vbiIsInBvd2VyIG9uIiwi5bey5byA5py6Iiwi5bey5LiK55S1Il07Y29uc3Qgb2ZmVmFscz1bIjAiLCJvZmYiLCJmYWxzZSIsIuWFs+acuiIsImNsb3NlZCIsIuW+heacuiIsImFjY19vZmYiLCJhY2Mgb2ZmIiwicG93ZXJfb2ZmIiwicG93ZXIgb2ZmIiwi5bey5YWz5py6Iiwi5bey5LiL55S1Il07aWYocCl7aWYob25WYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlvIDmnLoiLGNsczoib24ifTtpZihvZmZWYWxzLmluY2x1ZGVzKHApKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19aWYobCl7aWYoWyIwIiwi5pyq6ZSBIiwi5byA6ZSBIiwidW5sb2NrZWQiLCJmYWxzZSIsIm9wZW4iLCLlt7LlvIDplIEiLCLmnKrplIHovaYiXS5pbmNsdWRlcyhsKSlyZXR1cm57dGV4dDoi5bey5byA5py6IixjbHM6Im9uIn07aWYoWyIxIiwi5bey6ZSBIiwi6ZSB6L2mIiwibG9ja2VkIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluY2x1ZGVzKGwpKXJldHVybnt0ZXh0OiLlt7LlhbPmnLoiLGNsczoib2ZmIn19cmV0dXJue3RleHQ6IueKtuaAgeacquefpSIsY2xzOiJvZmYifX0KZnVuY3Rpb24gb25saW5lVGV4dChvKXtjb25zdCBzPVN0cmluZyhvfHwiIikudG9Mb3dlckNhc2UoKS50cmltKCk7aWYoIXMpcmV0dXJuIiI7aWYoWyIxIiwib24iLCJvbmxpbmUiLCJ0cnVlIiwi5Zyo57q/Iiwi5bey5Zyo57q/IiwiY29ubmVjdGVkIiwibm9ybWFsIl0uaW5jbHVkZXMocykpcmV0dXJuIuWcqOe6vyI7aWYoWyIwIiwib2ZmIiwib2ZmbGluZSIsImZhbHNlIiwi56a757q/Iiwi5pyq5Zyo57q/Iiwi5bey56a757q/IiwiZGlzY29ubmVjdCIsImRpc2Nvbm5lY3RlZCIsInNsZWVwIiwi5LyR55ygIl0uaW5jbHVkZXMocykpcmV0dXJuIuemu+e6vyI7cmV0dXJuIHN9CmZ1bmN0aW9uIHJlbmRlckFjY291bnRDYXJkKGEsaWR4KXsKICBjb25zdCB2PWEudmVoaWNsZXx8e307CiAgY29uc3Qgb25sPW9ubGluZVRleHQodi5vbmxpbmV8fHYucmlkZVN0YXRlKTsKICBjb25zdCBpc0NoYXJnaW5nPSEhKHYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1Iik7CiAgY29uc3Qgc29jPXYuYmF0dGVyeVBlcmNlbnR8fDA7CiAgY29uc3Qgc29jQ29sPXNvYzw9MjA/IiNGOTcwNkEiOnNvYzw9NTA/IiNGN0I5NTUiOiIjM0REQzk3IjsKICBjb25zdCByYW5nZT12LnJlc2lkdWFsUmFuZ2VLbXx8MDsKICBjb25zdCB2b2x0PXYudm9sdGFnZT9NYXRoLnJvdW5kKHYudm9sdGFnZSkrIlYiOiIiOwogIGNvbnN0IGZiPXNjb290ZXJGYWxsYmFjaygpOwogIC8vIG9uZXJyb3Ig6YeM5LiN6IO95YaN5bWM5aWX5byV5Y+377yI5pen5YaZ5rOV5Lya5oqKIFNWRyDlvJXlj7fmiKrmlq3vvIzpobXpnaLmrovnlZkgJyI+IOS5seeggeespuWPt++8iQogIGNvbnN0IGltZz12LnZlaGljbGVJbWFnZVVybD8nPGltZyBzcmM9IicrZXNjKHYudmVoaWNsZUltYWdlVXJsKSsnIiBhbHQ9IiIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JytmYjpmYjsKICBjb25zdCB2ZWhTdz12Lmhhc1ZlaGljbGU/cmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCk6IiI7CiAgY29uc3QgYm91bmQ9eD0+ISF4JiZ4IT09Iuacque7keWumiImJnghPT0iLSI7CiAgY29uc3Qgcm93cz1bXTsKICByb3dzLnB1c2goJ+mHjOeoi++8micrKHYudG90YWxNaWxlYWdlP3YudG90YWxNaWxlYWdlLnRvRml4ZWQoMSk6KHYubGFzdFJpZGVNaWxlYWdlP3YubGFzdFJpZGVNaWxlYWdlLnRvRml4ZWQoMSk6IjAiKSkrJ2ttJyk7CiAgcm93cy5wdXNoKCfkuIrmrKHvvJonKyh2Lnllc3RlcmRheURpc3RhbmNlP3YueWVzdGVyZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiLS0iKSsna20nKTsKICByb3dzLnB1c2goJ+W9k+aXpe+8micrKHYudG9kYXlEaXN0YW5jZT92LnRvZGF5RGlzdGFuY2UudG9GaXhlZCgxKToiMCIpKydrbScrKGZtdE1pbih2LnRvZGF5RHVyYXRpb24pPyIgIitmbXRNaW4odi50b2RheUR1cmF0aW9uKToiIikrKHYudG9kYXlNYXhTcGVlZD8iICIrdi50b2RheU1heFNwZWVkKyJrbS9oIjoiIikpOwogIGlmKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSl8fGJvdW5kKHYucmVhclByZXNzdXJlKSlyb3dzLnB1c2goJ+iDjuWOi++8micrKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSk/IuWJjSAiK2VzYyh2LmZyb250UHJlc3N1cmUpOiIiKSsoKGJvdW5kKHYuZnJvbnRQcmVzc3VyZSkmJmJvdW5kKHYucmVhclByZXNzdXJlKSk/IiAvICI6IiIpKyhib3VuZCh2LnJlYXJQcmVzc3VyZSk/IuWQjiAiK2VzYyh2LnJlYXJQcmVzc3VyZSk6IiIpKTsKICBpZihib3VuZCh2LmZyb250VGVtcCl8fGJvdW5kKHYucmVhclRlbXApKXJvd3MucHVzaCgn6IOO5rip77yaJysoYm91bmQodi5mcm9udFRlbXApPyLliY0gIitlc2Modi5mcm9udFRlbXApOiIiKSsoKGJvdW5kKHYuZnJvbnRUZW1wKSYmYm91bmQodi5yZWFyVGVtcCkpPyIgLyAiOiIiKSsoYm91bmQodi5yZWFyVGVtcCk/IuWQjiAiK2VzYyh2LnJlYXJUZW1wKToiIikpOwogIGlmKGlzQ2hhcmdpbmcmJnYuY3VycmVudClyb3dzLnB1c2goJ+eUtea1ge+8micrTnVtYmVyKHYuY3VycmVudCkudG9GaXhlZCgxKSsnQScpOwogIC8vIHYyLjE2LjYg5Y2h54mH5YWF55S15Ymp5L2Z77yI5YWF55S15Lit5LiU6K+l6L2m5bey6K6+5a656YeP5omN5pi+56S677yJCiAgaWYoaXNDaGFyZ2luZyYmTnVtYmVyKHYuY3VycmVudCk+MC41JiZzb2M+MCYmc29jPDEwMCl7Y29uc3QgYmM9cmlkZUJhdHRDZmcodi5jdXJyZW50VmlufHwiIik7aWYoTnVtYmVyKGJjLmFoKT4wKXJvd3MucHVzaCgn4o+xIOWFheeUteWJqeS9me+8mue6piAnK2ZtdFJlbWFpbkhtKE51bWJlcihiYy5haCkqKDEwMC1zb2MpLzEwMC9OdW1iZXIodi5jdXJyZW50KSo2MCkpO30KICByZXR1cm4gJzxkaXYgY2xhc3M9ImFjYy1jYXJkIGhvbWUtY2FyZCcrKGlzQ2hhcmdpbmc/JyBjaGFyZ2luZyc6JycpKyhIT01FX0FOSU0/JyBhbmltLWluJzonJykrJyIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpZHgqNjApKydtcyI+JysKICAgICc8ZGl2IGNsYXNzPSJoYy11cGQiPuabtOaWsO+8micrZXNjKFNUQVRFLnRzVGV4dHx8Ii0iKSsnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy10b3AiPjxkaXYgY2xhc3M9ImhjLW5hbWUiPicrZXNjKHYuaGFzVmVoaWNsZT8odi52ZWhpY2xlTmFtZXx8YS51c2VyTmFtZSk6YS51c2VyTmFtZSkrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlPyhvbmw9PT0i5Zyo57q/Ij8nPHNwYW4gY2xhc3M9ImhjLWJhZGdlIG9uIj7lnKjnur88L3NwYW4+Jzoob25sPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UiPicrZXNjKG9ubCkrJzwvc3Bhbj4nOiIiKSk6IiIpKwogICAgKGEudG9rZW5WYWxpZD09PWZhbHNlPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgZXJyIj5Ub2tlbuWkseaViDwvc3Bhbj4nOiIiKSsKICAgIChpc0NoYXJnaW5nPyc8c3BhbiBjbGFzcz0iaGMtYmFkZ2UgY2hnIj7lhYXnlLXkuK08L3NwYW4+JzoiIikrJzwvZGl2PicrCiAgICAodi5oYXNWZWhpY2xlJiZ2LnZlaGljbGVNb2RlbD8nPGRpdiBjbGFzcz0iaGMtbW9kZWwiPui9puWei++8micrZXNjKHYudmVoaWNsZU1vZGVsKSsnPC9kaXY+JzoiIikrCiAgICAodi5oYXNWZWhpY2xlPyc8ZGl2IGNsYXNzPSJoYy1taWQiPjxkaXYgY2xhc3M9ImhjLWxlZnQiPjxkaXYgY2xhc3M9ImhjLWJpZyBudW0iPicrTWF0aC5yb3VuZChzb2MpKyclPHNwYW4gY2xhc3M9ImhjLWttIG51bSI+JysocmFuZ2V8fDApKydrbTwvc3Bhbj4nKyh2b2x0Pyc8c3BhbiBjbGFzcz0iaGMtdiBudW0iPicrdm9sdCsnPC9zcGFuPic6IiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLWJhciI+PGRpdiBjbGFzcz0iaGMtZmlsbCIgc3R5bGU9IndpZHRoOicrTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsc29jKSkrJyU7YmFja2dyb3VuZDonK3NvY0NvbCsnIj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhjLXJvd3MiPicrcm93cy5tYXAocj0+JzxkaXYgY2xhc3M9ImhjLXJvdyI+JytyKyc8L2Rpdj4nKS5qb2luKCIiKSsnPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoYy1pbWciPicraW1nKyc8L2Rpdj48L2Rpdj4nOgogICAgJzxkaXYgY2xhc3M9Im5vLXZlaGljbGUiIHN0eWxlPSJtYXJnaW46MTJweCAwIj4nK0kuY2FyKycg6K+l6LSm5Y+35pyq57uR5a6a6L2m6L6GPC9kaXY+JykrCiAgICAnPGRpdiBjbGFzcz0iaGMtYm90dG9tIj48ZGl2IGNsYXNzPSJoYy1zY29yZSI+PHNwYW4+5oC756ev5YiGIDxiIGNsYXNzPSJudW0iPicrTnVtYmVyKGEuc2NvcmV8fDApLnRvTG9jYWxlU3RyaW5nKCkrJzwvYj48L3NwYW4+PHNwYW4gY2xhc3M9InBsdXMgbnVtIj7ku4orJytOdW1iZXIoYS50b2RheVNjb3JlfHwwKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzdHJlYWsgbnVtIj7ov57nrb4nK051bWJlcihhLmNvbnRpbnVlRGF5c3x8MCkrJ+WkqTwvc3Bhbj4nKyhhLnNpZ25lZFRvZGF5Pyc8c3BhbiBjbGFzcz0ic2lnbmVkIG51bSI+4pyTIOW3suetvuWIsDwvc3Bhbj4nOiIiKSsnPC9kaXY+PC9kaXY+JysKICAgIHZlaFN3Kyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIGZtdE1pbihtaW4pe21pbj1OdW1iZXIobWluKXx8MDtpZihtaW48PTApcmV0dXJuIiI7Y29uc3QgaD1NYXRoLmZsb29yKG1pbi82MCksbT1NYXRoLnJvdW5kKG1pbiU2MCk7cmV0dXJuIGg+MD9oKyJoIisobT9tKyJtaW4iOiIiKTptKyJtaW4ifQpmdW5jdGlvbiBmbXRSZW1haW5IbShtaW4pe21pbj1NYXRoLm1heCgxLE1hdGgucm91bmQoTnVtYmVyKG1pbil8fDApKTtjb25zdCBoPU1hdGguZmxvb3IobWluLzYwKSxtPW1pbiU2MDtyZXR1cm4gKGg+MD9oKyIg5pe2ICI6IiIpK20rIiDliIYifQoKLyogPT09PT09PT09PT09IOWkmui9puWIh+aNoiA9PT09PT09PT09PT0gKi8KZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVN3aXRjaCh2LGlkeCl7CiAgaWYoIXYudmVoaWNsZXN8fHYudmVoaWNsZXMubGVuZ3RoPDIpcmV0dXJuICIiOwogIGNvbnN0IGN1cj12LmN1cnJlbnRWaW58fCIiOwogIGNvbnN0IGl0ZW1zPXYudmVoaWNsZXMubWFwKHg9Pic8YnV0dG9uIGNsYXNzPSJ2ZWgtY2hpcCcrKHgudmluTm89PT1jdXI/IiBvbiI6IiIpKyciIG9uY2xpY2s9InN3aXRjaFZlaGljbGUoJytpZHgrJyxcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgudmVoaWNsZVR5cGV8fHgubmFtZSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0idmVoLXN3aXRjaCI+PHNwYW4gY2xhc3M9InZlaC1zdy1sYWJlbCI+6L2m6L6GPC9zcGFuPicraXRlbXMrJzwvZGl2Pic7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZShpZHgsdmluKXsKICBjb25zdCBzcmM9U1RBVEUuZGF0YVtpZHhdO2lmKCFzcmN8fCF2aW4pcmV0dXJuOwogIHRyeXsKICAgIGxldCBkOwogICAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICAgIGNvbnN0IHI9YXdhaXQgcHJveHlGZXRjaCgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChzcmMudXNlcklkfHwiIikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICAgIGQ9KHImJnIub2spP3IucmVzdWx0Om51bGw7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgY2ZnPWdldENmZygpO2NvbnN0IGFjYz1nZXRBY2NvdW50cygpW2lkeF07CiAgICAgIGlmKCFhY2MpcmV0dXJuOwogICAgICBkPWF3YWl0IGZldGNoQWNjb3VudERhdGEoYWNjLGNmZyx2aW4pOwogICAgfQogICAgaWYoZCYmZC52ZWhpY2xlJiZkLnZlaGljbGUuaGFzVmVoaWNsZSl7CiAgICAgIFNUQVRFLmRhdGFbaWR4XT1PYmplY3QuYXNzaWduKHt9LFNUQVRFLmRhdGFbaWR4XSxkKTsKICAgICAgcmVuZGVySG9tZSgpOwogICAgfQogIH1jYXRjaChlKXt9Cn0KCi8qID09PT09PT09PT09PSDkuLvpopjvvIh2Mi4xNC4xNCDotbfku4Xkv53nlZnmt7HoibLljZXkuLvpopjvvIkgPT09PT09PT09PT09ICovCmZ1bmN0aW9uIGFwcGx5VGhlbWUoKXsKICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCJkYXRhLXRoZW1lIiwiZGFyayIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi41NSAzRCDovabmqKHvvIhDYW52YXMg6L2v5riy5p+T77yM5peg5aSW6YOo5L6d6LWW77yJID09PT09PT09PT09PT09PT09ICovCmNvbnN0IEczRF9LRVk9InplZWhvX2czZF9vZmYiOwpmdW5jdGlvbiBnM2RFbmFibGVkKCl7dHJ5e3JldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShHM0RfS0VZKSE9PSIxIn1jYXRjaChlKXtyZXR1cm4gdHJ1ZX19CmZ1bmN0aW9uIGczZFRvZ2dsZShvbil7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKEczRF9LRVksb24/IjAiOiIxIil9Y2F0Y2goZSl7fWlmKG9uKXJlbmRlckhvbWUoKTtlbHNle1Njb290ZXIzRC5zdG9wKCk7cmVuZGVySG9tZSgpfX0KZnVuY3Rpb24gZ2FyYWdlU3RhdGUoYSl7CiAgY29uc3Qgdj0oYSYmYS52ZWhpY2xlKXx8e307CiAgY29uc3QgbHM9U3RyaW5nKHYubG9ja1N0YXRlPT1udWxsPyIiOnYubG9ja1N0YXRlKS50b0xvd2VyQ2FzZSgpLnRyaW0oKTsKICBsZXQgbG9ja2VkPW51bGw7CiAgaWYoWyIxIiwibG9ja2VkIiwi5bey6ZSBIiwi6ZSB6L2mIiwidHJ1ZSIsImNsb3NlZCIsIuW3sumUgei9piJdLmluZGV4T2YobHMpPj0wKWxvY2tlZD10cnVlOwogIGVsc2UgaWYoWyIwIiwidW5sb2NrZWQiLCLmnKrplIEiLCLlvIDplIEiLCJmYWxzZSIsIm9wZW4iLCLmnKrplIHovaYiXS5pbmRleE9mKGxzKT49MClsb2NrZWQ9ZmFsc2U7CiAgZWxzZSBpZihTdHJpbmcodi5oZWFkTG9ja3x8IiIpPT09IjEiKWxvY2tlZD10cnVlOwogIGVsc2UgaWYoU3RyaW5nKHYuaGVhZExvY2t8fCIiKT09PSIwIilsb2NrZWQ9ZmFsc2U7CiAgcmV0dXJuIHsKICAgIG1vZGVsOnYudmVoaWNsZU1vZGVsfHx2LnZlaGljbGVOYW1lfHwiWkVFSE8iLAogICAgc29jOk1hdGgubWF4KDAsTWF0aC5taW4oMTAwLE1hdGgucm91bmQoTnVtYmVyKHYuYmF0dGVyeVBlcmNlbnQpfHwwKSkpLAogICAgcmFuZ2U6TWF0aC5yb3VuZChOdW1iZXIodi5yZXNpZHVhbFJhbmdlS20pfHwwKSwKICAgIGNoYXJnaW5nOiEhKHYuY2hhcmdlU3RhdGUmJnYuY2hhcmdlU3RhdGUhPT0i5pyq5YWF55S1IiksCiAgICBvbmxpbmU6b25saW5lVGV4dCh2Lm9ubGluZXx8di5yaWRlU3RhdGUpPT09IuWcqOe6vyIsCiAgICBsb2NrZWQ6bG9ja2VkCiAgfTsKfQpmdW5jdGlvbiByZW5kZXJHYXJhZ2VTdGFnZShhKXsKICBpZighZzNkRW5hYmxlZCgpKXJldHVybiAiIjsKICBjb25zdCBzdD1nYXJhZ2VTdGF0ZShhKTsKICBjb25zdCBzb2NDb2w9c3Quc29jPD0yMD8idmFyKC0tZXJyKSI6c3Quc29jPD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1vaykiOwogIGNvbnN0IGNoaXBzPVsnPHNwYW4gY2xhc3M9ImczZC1jaGlwICcrKHN0Lm9ubGluZT8ib2siOiIiKSsnIj4nKyhzdC5vbmxpbmU/IuWcqOe6vyI6Iuemu+e6vyIpKyc8L3NwYW4+J107CiAgaWYoc3QuY2hhcmdpbmcpY2hpcHMucHVzaCgnPHNwYW4gY2xhc3M9ImczZC1jaGlwIHdhcm4iPuWFheeUteS4rTwvc3Bhbj4nKTsKICBpZihzdC5sb2NrZWQhPT1udWxsKWNoaXBzLnB1c2goJzxzcGFuIGNsYXNzPSJnM2QtY2hpcCAnKyhzdC5sb2NrZWQ/ImVyciI6Im9rIikrJyI+Jysoc3QubG9ja2VkPyLlt7LplIHovaYiOiLmnKrplIHovaYiKSsnPC9zcGFuPicpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iZzNkIiBpZD0iZzNkU3RhZ2UiPicrCiAgICAnPGNhbnZhcyBpZD0iZzNkQ2FudmFzIiBhcmlhLWxhYmVsPSIzRCDovabmqKHvvIzlj6/mi5bliqjml4vovawiPjwvY2FudmFzPicrCiAgICAnPGRpdiBjbGFzcz0iZzNkLWh1ZCI+PGRpdj48ZGl2IGNsYXNzPSJnM2QtbmFtZSI+Jytlc2Moc3QubW9kZWwpKyc8L2Rpdj48ZGl2IGNsYXNzPSJnM2Qtc3ViIj4nKyhzdC5vbmxpbmU/Iui9pui+huWcqOe6vyI6Iui9pui+huemu+e6vyIpKyc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImczZC1zb2MiPjxiIHN0eWxlPSJjb2xvcjonK3NvY0NvbCsnIj4nK3N0LnNvYysnJTwvYj48c3Bhbj4nK3N0LnJhbmdlKycga20g57ut6IiqPC9zcGFuPjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iZzNkLWNoaXBzIj4nK2NoaXBzLmpvaW4oIiIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImczZC10aXAiPuaLluWKqOaXi+i9rDwvZGl2PjwvZGl2Pic7Cn0KY29uc3QgU2Nvb3RlcjNEPShmdW5jdGlvbigpewogIGNvbnN0IExUPShmdW5jdGlvbigpe2NvbnN0IHY9Wy0wLjQ1LDAuODYsMC41NV0sbj1NYXRoLnNxcnQodlswXSp2WzBdK3ZbMV0qdlsxXSt2WzJdKnZbMl0pO3JldHVyblt2WzBdL24sdlsxXS9uLHZbMl0vbl19KSgpOwogIGxldCBjdXI9bnVsbDsKICBmdW5jdGlvbiByZ2IoaCl7aD1TdHJpbmcoaHx8IiMyQkQ0RjIiKS5yZXBsYWNlKCIjIiwiIik7aWYoaC5sZW5ndGg9PT0zKWg9aC5zcGxpdCgiIikubWFwKGZ1bmN0aW9uKGMpe3JldHVybiBjK2N9KS5qb2luKCIiKTtyZXR1cm5bcGFyc2VJbnQoaC5zdWJzdHIoMCwyKSwxNikscGFyc2VJbnQoaC5zdWJzdHIoMiwyKSwxNikscGFyc2VJbnQoaC5zdWJzdHIoNCwyKSwxNildfQogIGZ1bmN0aW9uIG11bChjLGspe2s9TWF0aC5tYXgoMCxNYXRoLm1pbigyLjIsaykpO3JldHVybiJyZ2IoIitNYXRoLm1pbigyNTUsTWF0aC5yb3VuZChjWzBdKmspKSsiLCIrTWF0aC5taW4oMjU1LE1hdGgucm91bmQoY1sxXSprKSkrIiwiK01hdGgubWluKDI1NSxNYXRoLnJvdW5kKGNbMl0qaykpKyIpIn0KICBmdW5jdGlvbiBidWlsZChzdCl7CiAgICBjb25zdCBGPVtdOwogICAgY29uc3QgQk9EWT1yZ2IoIiMzNTQzNUUiKSxCT0RZMj1yZ2IoIiM0NzU4NzMiKSxTRUFUPXJnYigiIzEwMTQxQyIpLFRJUkU9cmdiKCIjMTExNTFDIiksVElSRTI9cmdiKCIjMjQyQjM3IiksCiAgICAgIFJJTT1yZ2IoIiNEQ0U1RjIiKSxSSU0yPXJnYigiI0EzQjRDQSIpLERBUks9cmdiKCIjMEEwRTE1IiksR0xBU1M9cmdiKCIjQThERUYyIiksSEVBRD1yZ2IoIiNFQUY5RkYiKSwKICAgICAgQUNDPXJnYihzdC5jaGFyZ2luZz8iIzQ3RTNBMCI6IiMzNUQ4RjUiKSxUQUlMPXJnYihzdC5sb2NrZWQ/IiNGOTcwNkEiOiIjMzVEOEY1Iik7CiAgICBmdW5jdGlvbiBwcmlzbShwb2x5LHpIYWxmLGNvbG9yLG9wdCl7CiAgICAgIG9wdD1vcHR8fHt9OwogICAgICBjb25zdCB6MD0tekhhbGYsejE9ekhhbGY7CiAgICAgIEYucHVzaCh7cDpwb2x5Lm1hcChmdW5jdGlvbihxKXtyZXR1cm5bcVswXSxxWzFdLHoxXX0pLGM6Y29sb3IsYTpvcHQuYSxlOm9wdC5lfSk7CiAgICAgIEYucHVzaCh7cDpwb2x5LnNsaWNlKCkucmV2ZXJzZSgpLm1hcChmdW5jdGlvbihxKXtyZXR1cm5bcVswXSxxWzFdLHowXX0pLGM6Y29sb3IsYTpvcHQuYSxlOm9wdC5lfSk7CiAgICAgIGZvcihsZXQgaT0wO2k8cG9seS5sZW5ndGg7aSsrKXsKICAgICAgICBjb25zdCBhPXBvbHlbaV0sYj1wb2x5WyhpKzEpJXBvbHkubGVuZ3RoXTsKICAgICAgICBGLnB1c2goe3A6W1thWzBdLGFbMV0sejBdLFtiWzBdLGJbMV0sejBdLFtiWzBdLGJbMV0sejFdLFthWzBdLGFbMV0sejFdXSxjOmNvbG9yLGE6b3B0LmF9KTsKICAgICAgfQogICAgfQogICAgZnVuY3Rpb24gYm94KHgwLHgxLHkwLHkxLHowLHoxLGNvbG9yLG9wdCl7cHJpc20oW1t4MCx5MF0sW3gxLHkwXSxbeDEseTFdLFt4MCx5MV1dLCh6MS16MCkvMixjb2xvcixvcHQpO30KICAgIGZ1bmN0aW9uIHBsYXRlKHB0cyx6LGNvbG9yLG9wdCl7Ri5wdXNoKHtwOnB0cy5tYXAoZnVuY3Rpb24ocSl7cmV0dXJuW3FbMF0scVsxXSx6XX0pLGM6Y29sb3IsYTpvcHQmJm9wdC5hLGU6b3B0JiZvcHQuZX0pfQogICAgZnVuY3Rpb24gd2hlZWwoY3gsY3kscix3KXsKICAgICAgY29uc3Qgc2VnPTIwO2NvbnN0IHoxPXcvMix6MD0tdy8yOwogICAgICBjb25zdCByaW5nPWZ1bmN0aW9uKHope2NvbnN0IGE9W107Zm9yKGxldCBpPTA7aTxzZWc7aSsrKXtjb25zdCB0PWkvc2VnKk1hdGguUEkqMjthLnB1c2goW2N4K01hdGguY29zKHQpKnIsY3krTWF0aC5zaW4odCkqcix6XSl9cmV0dXJuIGF9OwogICAgICBjb25zdCBuej1yaW5nKHoxKSxmej1yaW5nKHowKTsKICAgICAgZm9yKGxldCBpPTA7aTxzZWc7aSsrKXtjb25zdCBqPShpKzEpJXNlZztGLnB1c2goe3A6W2Z6W2ldLGZ6W2pdLG56W2pdLG56W2ldXSxjOlRJUkV9KX0KICAgICAgRi5wdXNoKHtwOm56LGM6VElSRTJ9KTtGLnB1c2goe3A6Znouc2xpY2UoKS5yZXZlcnNlKCksYzpUSVJFMn0pOwogICAgICBjb25zdCByaW1SPXIqMC41OCxyaT1bXTsKICAgICAgZm9yKGxldCBpPTA7aTxzZWc7aSsrKXtjb25zdCB0PWkvc2VnKk1hdGguUEkqMjtyaS5wdXNoKFtjeCtNYXRoLmNvcyh0KSpyaW1SLGN5K01hdGguc2luKHQpKnJpbVIsejErMC4wMDZdKX0KICAgICAgRi5wdXNoKHtwOnJpLGM6UklNfSk7CiAgICAgIGZvcihsZXQgaz0wO2s8NTtrKyspewogICAgICAgIGNvbnN0IHQwPWsvNSpNYXRoLlBJKjIsdDE9dDArMC4xNix6ej16MSswLjAxMjsKICAgICAgICBGLnB1c2goe3A6W1tjeCtNYXRoLmNvcyh0MCkqciowLjEwLGN5K01hdGguc2luKHQwKSpyKjAuMTAsenpdLFtjeCtNYXRoLmNvcyh0MSkqciowLjEwLGN5K01hdGguc2luKHQxKSpyKjAuMTAsenpdLFtjeCtNYXRoLmNvcyh0MSkqcmltUiowLjkyLGN5K01hdGguc2luKHQxKSpyaW1SKjAuOTIsenpdLFtjeCtNYXRoLmNvcyh0MCkqcmltUiowLjkyLGN5K01hdGguc2luKHQwKSpyaW1SKjAuOTIsenpdXSxjOlJJTTJ9KTsKICAgICAgfQogICAgICBjb25zdCBodWI9W107CiAgICAgIGZvcihsZXQgaT0wO2k8c2VnO2krKyl7Y29uc3QgdD1pL3NlZypNYXRoLlBJKjI7aHViLnB1c2goW2N4K01hdGguY29zKHQpKnIqMC4xMyxjeStNYXRoLnNpbih0KSpyKjAuMTMsejErMC4wMThdKX0KICAgICAgRi5wdXNoKHtwOmh1YixjOkFDQ30pOwogICAgfQogICAgLy8g6L2m6L2uCiAgICB3aGVlbCgtMC42NCwwLjMxLDAuMzEsMC4xNyk7CiAgICB3aGVlbCgwLjY4LDAuMzEsMC4zMSwwLjEzKTsKICAgIC8vIOWQjuaRh+iHgiAvIOWJjeWPiQogICAgcGxhdGUoW1stMC42NiwwLjMyXSxbLTAuNTgsMC4zMF0sWy0wLjI4LDAuNTBdLFstMC4zMiwwLjU2XV0sMC4xMSxEQVJLKTsKICAgIHBsYXRlKFtbLTAuNjYsMC4zMl0sWy0wLjU4LDAuMzBdLFstMC4yOCwwLjUwXSxbLTAuMzIsMC41Nl1dLC0wLjExLERBUkspOwogICAgcGxhdGUoW1swLjY0LDAuMzJdLFswLjcwLDAuMzJdLFswLjU4LDAuOTRdLFswLjUwLDAuOTJdXSwwLjEwLERBUkspOwogICAgcGxhdGUoW1swLjY0LDAuMzJdLFswLjcwLDAuMzJdLFswLjU4LDAuOTRdLFswLjUwLDAuOTJdXSwtMC4xMCxEQVJLKTsKICAgIC8vIOi4j+adv+S4juS+p+ijmQogICAgcHJpc20oW1stMC4zMiwwLjQ4XSxbLTAuMDYsMC40NV0sWzAuMzQsMC40OF0sWzAuMzgsMC41N10sWzAuMzAsMC42MV0sWy0wLjMyLDAuNTldXSwwLjE5LEJPRFkyKTsKICAgIC8vIOW6p+S4i+i9pui6qwogICAgcHJpc20oW1stMC42NiwwLjU0XSxbLTAuMjQsMC41MV0sWy0wLjA4LDAuNjRdLFstMC4wNCwwLjk5XSxbLTAuMjgsMS4wNV0sWy0wLjY0LDAuOTddLFstMC43MiwwLjcyXV0sMC4xOCxCT0RZKTsKICAgIC8vIOS+p+i6q+mlsOadoQogICAgcGxhdGUoW1stMC41OCwwLjkzXSxbLTAuMTIsMC45NV0sWy0wLjEyLDAuOThdLFstMC41OCwwLjk2XV0sMC4xODUsQUNDLHtlOjF9KTsKICAgIHBsYXRlKFtbLTAuMzAsMC40OV0sWzAuMzAsMC41MV0sWzAuMzQsMC41NTVdLFswLjAyLDAuNTQ1XV0sMC4yMCxBQ0Mse2U6MX0pOwogICAgcGxhdGUoW1swLjE5LDAuNzJdLFswLjMzLDAuOTJdLFswLjQ1LDEuMTNdLFswLjM3LDEuMTVdLFswLjI1LDAuOTNdLFswLjEzLDAuNzRdXSwwLjE4NSxBQ0Mse2U6MX0pOwogICAgLy8g5Z2Q5Z6rCiAgICBwcmlzbShbWy0wLjYyLDEuMDNdLFstMC4wOCwxLjA0XSxbLTAuMDIsMS4xMF0sWy0wLjE0LDEuMTddLFstMC42MiwxLjE1XSxbLTAuNzAsMS4wOV1dLDAuMTUsU0VBVCk7CiAgICAvLyDliY3mlbTmtYHnvakKICAgIHByaXNtKFtbMC4xNCwwLjU0XSxbMC4zOCwwLjU2XSxbMC41NCwwLjg0XSxbMC41OCwxLjE3XSxbMC40NCwxLjIxXSxbMC4zMiwwLjkwXSxbMC4wNiwwLjcwXV0sMC4xOCxCT0RZKTsKICAgIC8vIOWJjeaMoeazpeadvwogICAgcHJpc20oW1swLjQwLDAuNjZdLFswLjUwLDAuNzJdLFswLjY0LDAuNzVdLFswLjc4LDAuNzJdLFswLjkwLDAuNjRdLFswLjkyLDAuNThdLFswLjg0LDAuNjRdLFswLjcwLDAuNjhdLFswLjU2LDAuNjZdLFswLjQ2LDAuNjJdXSwwLjEwLEJPRFkyKTsKICAgIC8vIOaMoemjjgogICAgcHJpc20oW1swLjUyLDEuMTRdLFswLjYwLDEuMjBdLFswLjcwLDEuNDJdLFswLjU4LDEuNDRdLFswLjQ2LDEuMjJdXSwwLjEzLEdMQVNTLHthOi41NX0pOwogICAgLy8g5aSn54GvIC8g5bC+54GvCiAgICBwcmlzbShbWzAuNTUsMC45NF0sWzAuNjIsMC45MF0sWzAuNjUsMS4wNl0sWzAuNTgsMS4xMF1dLDAuMTMsSEVBRCx7ZToxfSk7CiAgICBwcmlzbShbWy0wLjc0LDAuNzRdLFstMC42OCwwLjcwXSxbLTAuNjYsMC45MF0sWy0wLjcyLDAuOTRdXSwwLjE0LFRBSUwse2U6MX0pOwogICAgLy8g5ZCO6LSn5p62CiAgICBib3goLTAuNzgsLTAuNjAsMS4wNiwxLjEwLC0wLjIwLDAuMjAsQk9EWTIpOwogICAgLy8g6L2m5oqKIC8g5omL5oqKIC8g5ZCO6KeG6ZWcCiAgICBib3goMC40OCwwLjU2LDEuMzAsMS4zNiwtMC4zNiwwLjM2LEJPRFkyKTsKICAgIGJveCgwLjQ3LDAuNTcsMS4yNywxLjM5LC0wLjQwLC0wLjMzLERBUkspOwogICAgYm94KDAuNDcsMC41NywxLjI3LDEuMzksMC4zMywwLjQwLERBUkspOwogICAgcGxhdGUoW1swLjU2LDEuMzZdLFswLjYwLDEuNDJdLFswLjY0LDEuNDRdLFswLjYyLDEuMzhdXSwwLjMwLERBUkspOwogICAgcGxhdGUoW1swLjU2LDEuMzZdLFswLjYwLDEuNDJdLFswLjY0LDEuNDRdLFswLjYyLDEuMzhdXSwtMC4zMCxEQVJLKTsKICAgIGJveCgwLjYwLDAuNzAsMS40MiwxLjQ3LDAuMjYsMC4zNCxCT0RZMik7CiAgICBib3goMC42MCwwLjcwLDEuNDIsMS40NywtMC4zNCwtMC4yNixCT0RZMik7CiAgICAvLyDnlLXmsaDku5MKICAgIGJveCgtMC4zMCwtMC4wMiwwLjYwLDAuODYsLTAuMTQsMC4xNCxEQVJLKTsKICAgIHJldHVybiBGOwogIH0KICBmdW5jdGlvbiBzdG9wKCl7CiAgICBpZighY3VyKXJldHVybjsKICAgIHRyeXtpZihjdXIucmFmKWNhbmNlbEFuaW1hdGlvbkZyYW1lKGN1ci5yYWYpfWNhdGNoKGUpe30KICAgIHRyeXtpZihjdXIuYWMpY3VyLmFjLmFib3J0KCl9Y2F0Y2goZSl7fQogICAgY3VyPW51bGw7CiAgfQogIGZ1bmN0aW9uIG1vdW50KGhvc3Qsc3QpewogICAgaWYoIWhvc3R8fCFnM2RFbmFibGVkKCkpe3N0b3AoKTtyZXR1cm59CiAgICBjb25zdCBjYW52YXM9aG9zdC5xdWVyeVNlbGVjdG9yKCJjYW52YXMiKTsKICAgIGlmKCFjYW52YXN8fCFjYW52YXMuZ2V0Q29udGV4dCl7c3RvcCgpO3JldHVybn0KICAgIGlmKGN1ciYmY3VyLmNhbnZhcz09PWNhbnZhcyl7Y3VyLnN0PXN0O2N1ci5mYWNlcz1idWlsZChzdCk7cmV0dXJufQogICAgc3RvcCgpOwogICAgY29uc3QgY3R4PWNhbnZhcy5nZXRDb250ZXh0KCIyZCIpOwogICAgaWYoIWN0eClyZXR1cm47CiAgICBjb25zdCBpbnN0PXtjYW52YXM6Y2FudmFzLGN0eDpjdHgsc3Q6c3QsZmFjZXM6YnVpbGQoc3QpLHlhdzotMC40OCxwaXRjaDowLjA2LGlkbGU6MCxkcmFnOmZhbHNlLHN0YXJ0WDowLHN0YXJ0WTowLGJhc2VZYXc6LTAuNDgsYmFzZVBpdGNoOjAuMDYsbGFzdE1vdmU6MCxsYXN0OjAscmFmOjB9OwogICAgdHJ5e2luc3QuYWM9bmV3IEFib3J0Q29udHJvbGxlcigpfWNhdGNoKGUpe2luc3QuYWM9bnVsbH0KICAgIGNvbnN0IG9wdHM9aW5zdC5hYz97c2lnbmFsOmluc3QuYWMuc2lnbmFsfTp1bmRlZmluZWQ7CiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcmRvd24iLGZ1bmN0aW9uKGUpewogICAgICBpbnN0LmRyYWc9dHJ1ZTtpbnN0LnN0YXJ0WD1lLmNsaWVudFg7aW5zdC5zdGFydFk9ZS5jbGllbnRZO2luc3QuYmFzZVlhdz1pbnN0LnlhdztpbnN0LmJhc2VQaXRjaD1pbnN0LnBpdGNoO2luc3QubGFzdE1vdmU9cGVyZm9ybWFuY2Uubm93KCk7CiAgICAgIHRyeXtjYW52YXMuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpfWNhdGNoKHgpe30KICAgIH0sb3B0cyk7CiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcm1vdmUiLGZ1bmN0aW9uKGUpewogICAgICBpZighaW5zdC5kcmFnKXJldHVybjsKICAgICAgaW5zdC55YXc9TWF0aC5tYXgoLTEuMjUsTWF0aC5taW4oMS4yNSxpbnN0LmJhc2VZYXcrKGUuY2xpZW50WC1pbnN0LnN0YXJ0WCkqMC4wMDg1KSk7CiAgICAgIGluc3QucGl0Y2g9TWF0aC5tYXgoLTAuMDUsTWF0aC5taW4oMC4zMCxpbnN0LmJhc2VQaXRjaCsoZS5jbGllbnRZLWluc3Quc3RhcnRZKSowLjAwMzUpKTsKICAgICAgaW5zdC5sYXN0TW92ZT1wZXJmb3JtYW5jZS5ub3coKTsKICAgIH0sb3B0cyk7CiAgICBjb25zdCB1cD1mdW5jdGlvbigpe2luc3QuZHJhZz1mYWxzZTtpbnN0Lmxhc3RNb3ZlPXBlcmZvcm1hbmNlLm5vdygpfTsKICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCJwb2ludGVydXAiLHVwLG9wdHMpOwogICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJjYW5jZWwiLHVwLG9wdHMpOwogICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJsZWF2ZSIsZnVuY3Rpb24oKXtpZihpbnN0LmRyYWcpdXAoKX0sb3B0cyk7CiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCJ2aXNpYmlsaXR5Y2hhbmdlIixmdW5jdGlvbigpe2lmKGN1cj09PWluc3QpaW5zdC5wYXVzZWQ9ZG9jdW1lbnQuaGlkZGVufSxvcHRzKTsKICAgIGN1cj1pbnN0OwogICAgaW5zdC5sYXN0PTA7CiAgICBpbnN0LnJhZj1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24odCl7dGljayhpbnN0LHQpfSk7CiAgfQogIGZ1bmN0aW9uIHRpY2soaW5zdCx0KXsKICAgIGlmKGN1ciE9PWluc3QpcmV0dXJuOwogICAgaW5zdC5yYWY9cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKHgpe3RpY2soaW5zdCx4KX0pOwogICAgaWYoaW5zdC5wYXVzZWQpcmV0dXJuOwogICAgaWYodC1pbnN0Lmxhc3Q8MzIpcmV0dXJuOwogICAgaW5zdC5sYXN0PXQ7CiAgICBkcmF3KGluc3QsdCk7CiAgfQogIGZ1bmN0aW9uIHByb2plY3QoaW5zdCx4LHkseix3LGgpewogICAgY29uc3QgY3k9TWF0aC5jb3MoaW5zdC5waXRjaCksc3k9TWF0aC5zaW4oaW5zdC5waXRjaCk7CiAgICBjb25zdCByeT0oeS0wLjY0KSpjeS16KnN5LCByej0oeS0wLjY0KSpzeSt6KmN5OwogICAgY29uc3QgY3g9TWF0aC5jb3MoaW5zdC55YXcpLHN4PU1hdGguc2luKGluc3QueWF3KTsKICAgIGNvbnN0IHJ4PXgqY3grcnoqc3gsIHJ6ej0teCpzeCtyeipjeDsKICAgIGNvbnN0IGNhbT0yLjU1LCBkPXJ6eitjYW0sIGs9TWF0aC5taW4ody8yLjE4LGgvMS45MCkqY2FtL01hdGgubWF4KDAuNDIsZCk7CiAgICByZXR1cm4ge3g6dy8yK3J4KmsseTpoKjAuNjAtcnkqayx6OmQsazprfTsKICB9CiAgZnVuY3Rpb24gZHJhdyhpbnN0LHQpewogICAgY29uc3QgY3Y9aW5zdC5jYW52YXMsY3R4PWluc3QuY3R4LHc9Y3YuY2xpZW50V2lkdGh8fGN2LndpZHRoLGg9Y3YuY2xpZW50SGVpZ2h0fHxjdi5oZWlnaHQ7CiAgICBpZighd3x8IWgpcmV0dXJuOwogICAgY29uc3QgZHByPU1hdGgubWluKDIsd2luZG93LmRldmljZVBpeGVsUmF0aW98fDEpOwogICAgY29uc3QgcHc9TWF0aC5yb3VuZCh3KmRwcikscGg9TWF0aC5yb3VuZChoKmRwcik7CiAgICBpZihjdi53aWR0aCE9PXB3fHxjdi5oZWlnaHQhPT1waCl7Y3Yud2lkdGg9cHc7Y3YuaGVpZ2h0PXBofQogICAgY3R4LnNldFRyYW5zZm9ybShkcHIsMCwwLGRwciwwLDApOwogICAgY3R4LmNsZWFyUmVjdCgwLDAsdyxoKTsKICAgIGlmKCFpbnN0LmRyYWcpewogICAgICBpZih0LWluc3QubGFzdE1vdmU+MjQwMCl7aW5zdC5pZGxlKz0wLjAxNjtpbnN0Lnlhdz1pbnN0LmJhc2VZYXcrTWF0aC5zaW4oaW5zdC5pZGxlKjAuNSkqMC4yNH0KICAgICAgZWxzZXtpbnN0LmlkbGU9MH0KICAgIH1lbHNle2luc3QuaWRsZT0wfQogICAgY29uc3QgcHVsc2U9aW5zdC5zdC5jaGFyZ2luZz8oMC43MiswLjI4Kk1hdGguc2luKHQvMzIwKSk6MTsKICAgIC8vIOiDjOaZr+WFiQogICAgY29uc3QgZz1jdHguY3JlYXRlUmFkaWFsR3JhZGllbnQodyowLjUsaCowLjYwLDgsdyowLjUsaCowLjYwLHcqMC42Mik7CiAgICBnLmFkZENvbG9yU3RvcCgwLGluc3Quc3QuY2hhcmdpbmc/InJnYmEoNjEsMjIwLDE1MSwuMjApIjoicmdiYSg0MywyMTIsMjQyLC4xNykiKTsKICAgIGcuYWRkQ29sb3JTdG9wKDEsInJnYmEoNDMsMjEyLDI0MiwwKSIpOwogICAgY3R4LmZpbGxTdHlsZT1nO2N0eC5maWxsUmVjdCgwLDAsdyxoKTsKICAgIC8vIOWcsOmdogogICAgY29uc3QgcDA9cHJvamVjdChpbnN0LDAsMCwwLHcsaCk7CiAgICBjdHguc2F2ZSgpOwogICAgY3R4LnRyYW5zbGF0ZSh3LzIscDAueSs0KTsKICAgIGN0eC5zY2FsZSgxLDAuMTcpOwogICAgY29uc3Qgc2g9Y3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KDAsMCw0LDAsMCxwMC5rKjEuMDUpOwogICAgc2guYWRkQ29sb3JTdG9wKDAsInJnYmEoMCwwLDAsLjUyKSIpO3NoLmFkZENvbG9yU3RvcCgxLCJyZ2JhKDAsMCwwLDApIik7CiAgICBjdHguZmlsbFN0eWxlPXNoO2N0eC5iZWdpblBhdGgoKTtjdHguYXJjKDAsMCxwMC5rKjEuMDUsMCxNYXRoLlBJKjIpO2N0eC5maWxsKCk7CiAgICBjdHgucmVzdG9yZSgpOwogICAgY29uc3QgcmluZz1wcm9qZWN0KGluc3QsMCwwLjAyLDAsdyxoKTsKICAgIGN0eC5zYXZlKCk7Y3R4LnRyYW5zbGF0ZSh3LzIscmluZy55KzMpO2N0eC5zY2FsZSgxLDAuMik7CiAgICBjdHguc3Ryb2tlU3R5bGU9aW5zdC5zdC5jaGFyZ2luZz8icmdiYSg2MSwyMjAsMTUxLC4zNCkiOiJyZ2JhKDQzLDIxMiwyNDIsLjI2KSI7CiAgICBjdHgubGluZVdpZHRoPTEuNDtjdHguYmVnaW5QYXRoKCk7Y3R4LmFyYygwLDAscmluZy5rKjAuOTIsMCxNYXRoLlBJKjIpO2N0eC5zdHJva2UoKTsKICAgIGlmKGluc3Quc3QuY2hhcmdpbmcpe2N0eC5zdHJva2VTdHlsZT0icmdiYSg2MSwyMjAsMTUxLC4xOCkiO2N0eC5iZWdpblBhdGgoKTtjdHguYXJjKDAsMCxyaW5nLmsqKDEuMDIrMC4wNipNYXRoLnNpbih0LzQyMCkpLDAsTWF0aC5QSSoyKTtjdHguc3Ryb2tlKCl9CiAgICBjdHgucmVzdG9yZSgpOwogICAgLy8g57uE6KOF6Z2iCiAgICBjb25zdCBsaXN0PVtdOwogICAgZm9yKGxldCBpPTA7aTxpbnN0LmZhY2VzLmxlbmd0aDtpKyspewogICAgICBjb25zdCBmPWluc3QuZmFjZXNbaV0scHRzPVtdOwogICAgICBsZXQgenN1bT0wOwogICAgICBmb3IobGV0IGo9MDtqPGYucC5sZW5ndGg7aisrKXsKICAgICAgICBjb25zdCBxPXByb2plY3QoaW5zdCxmLnBbal1bMF0sZi5wW2pdWzFdLGYucFtqXVsyXSx3LGgpOwogICAgICAgIHB0cy5wdXNoKHEpO3pzdW0rPXEuejsKICAgICAgfQogICAgICBjb25zdCBhPXB0c1swXSxiPXB0c1sxXSxjPXB0c1syXTsKICAgICAgY29uc3QgdXg9Yi54LWEueCx1eT1iLnktYS55LHV6PWIuei1hLnosdng9Yy54LWEueCx2eT1jLnktYS55LHZ6PWMuei1hLno7CiAgICAgIGxldCBueD11eSp2ei11eip2eSxueT11eip2eC11eCp2eixuej11eCp2eS11eSp2eDsKICAgICAgY29uc3Qgbmw9TWF0aC5zcXJ0KG54Km54K255Km55K256Km56KXx8MTsKICAgICAgY29uc3QgbGFtPU1hdGguYWJzKChueCpMVFswXStueSpMVFsxXStueipMVFsyXSkvbmwpOwogICAgICBsZXQgaz0wLjUyKzAuNzgqbGFtOwogICAgICBpZihmLmUpaz0oMS4wKzAuMzYqbGFtKSpwdWxzZTsKICAgICAgbGlzdC5wdXNoKHtwdHM6cHRzLGM6Zi5jLGE6Zi5hLHo6enN1bS9wdHMubGVuZ3RoLGs6a30pOwogICAgfQogICAgbGlzdC5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGIuei1hLnp9KTsKICAgIGZvcihsZXQgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXsKICAgICAgY29uc3QgZj1saXN0W2ldLHA9Zi5wdHM7CiAgICAgIGN0eC5iZWdpblBhdGgoKTtjdHgubW92ZVRvKHBbMF0ueCxwWzBdLnkpOwogICAgICBmb3IobGV0IGo9MTtqPHAubGVuZ3RoO2orKyljdHgubGluZVRvKHBbal0ueCxwW2pdLnkpOwogICAgICBjdHguY2xvc2VQYXRoKCk7CiAgICAgIGNvbnN0IGNvbD1tdWwoZi5jLGYuayk7CiAgICAgIGlmKGYuYSE9bnVsbCljdHguZ2xvYmFsQWxwaGE9Zi5hOwogICAgICBjdHguZmlsbFN0eWxlPWNvbDtjdHguZmlsbCgpOwogICAgICBjdHguc3Ryb2tlU3R5bGU9Y29sO2N0eC5saW5lV2lkdGg9MC45O2N0eC5zdHJva2UoKTsKICAgICAgY3R4Lmdsb2JhbEFscGhhPTE7CiAgICB9CiAgICAvLyDlpKfnga/ovonlhYkKICAgIGNvbnN0IGhwPXByb2plY3QoaW5zdCwwLjYyLDEuMDAsMCx3LGgpOwogICAgY29uc3QgaGc9Y3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KGhwLngsaHAueSwxLGhwLngsaHAueSwyMik7CiAgICBoZy5hZGRDb2xvclN0b3AoMCwicmdiYSgyMjYsMjQ4LDI1NSwuMzIpIik7aGcuYWRkQ29sb3JTdG9wKDEsInJnYmEoMjI2LDI0OCwyNTUsMCkiKTsKICAgIGN0eC5maWxsU3R5bGU9aGc7Y3R4LmJlZ2luUGF0aCgpO2N0eC5hcmMoaHAueCxocC55LDIyLDAsTWF0aC5QSSoyKTtjdHguZmlsbCgpOwogIH0KICByZXR1cm4ge21vdW50Om1vdW50LHN0b3A6c3RvcH07Cn0pKCk7CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi41NSDlhajlsY/lo4HnurjvvIhJbmRleGVkREIg5a2Y5Zu+ICsg6aKE6K6+ICsg5qih57OKL+aal+WMlu+8iSA9PT09PT09PT09PT09PT09PSAqLwpjb25zdCBXYWxscGFwZXJNZ3I9KGZ1bmN0aW9uKCl7CiAgY29uc3QgTUVUQT0iemVlaG9fd2FsbHBhcGVyX3YxIixEQj0iemVlaG9fd2FsbHBhcGVyX2RiIixTVE9SRT0iaW1nIjsKICBjb25zdCBQUkVTRVRTPVsKICAgIHtpZDoiZGVlcCIsbmFtZToi5rex56m6Iixjc3M6InJhZGlhbC1ncmFkaWVudCgxMjAlIDkwJSBhdCAxOCUgMCUsIzEyM0E1MiAwJSwjMEExMjI2IDQyJSwjMDQwNzBFIDEwMCUpIn0sCiAgICB7aWQ6ImF1cm9yYSIsbmFtZToi5p6B5YWJIixjc3M6InJhZGlhbC1ncmFkaWVudCg5MCUgNzAlIGF0IDE4JSA4JSwjMEU0QzRBIDAlLCMwQTE2MjYgNDYlLCMwNDA3MEUgMTAwJSkscmFkaWFsLWdyYWRpZW50KDcwJSA2MCUgYXQgOTIlIDkyJSwjMkExRTVDIDAlLHJnYmEoMCwwLDAsMCkgNjIlKSJ9LAogICAge2lkOiJlbWJlciIsbmFtZToi5L2Z54OsIixjc3M6InJhZGlhbC1ncmFkaWVudCg5MCUgNzAlIGF0IDgyJSAwJSwjNEEyNDEwIDAlLCMxQTBFMEEgNDYlLCMwNTA3MEMgMTAwJSkifSwKICAgIHtpZDoiY2FyYm9uIixuYW1lOiLnorPnuqQiLGNzczoicmVwZWF0aW5nLWxpbmVhci1ncmFkaWVudCg0NWRlZywjMEIwRjE2IDAgOHB4LCMwRTEzMUMgOHB4IDE2cHgpIn0KICBdOwogIGxldCBtZXRhPXttb2RlOiJub25lIixwcmVzZXQ6ImRlZXAiLGJsdXI6MTAsZGltOjM0fTsKICBsZXQgb2JqVXJsPW51bGwsYnVzeT1mYWxzZTsKICBmdW5jdGlvbiBsb2FkTWV0YSgpe3RyeXtjb25zdCBqPUpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oTUVUQSl8fCJudWxsIik7aWYoaiYmdHlwZW9mIGo9PT0ib2JqZWN0IiltZXRhPU9iamVjdC5hc3NpZ24obWV0YSxqKX1jYXRjaChlKXt9fQogIGZ1bmN0aW9uIHNhdmVNZXRhKCl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKE1FVEEsSlNPTi5zdHJpbmdpZnkobWV0YSkpfWNhdGNoKGUpe319CiAgZnVuY3Rpb24gbGF5ZXIoKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndhbGxMYXllciIpfQogIGZ1bmN0aW9uIGltZ0VsKCl7cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3YWxsSW1nIil9CiAgZnVuY3Rpb24gc2NyaW1FbCgpe3JldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2FsbFNjcmltIil9CiAgZnVuY3Rpb24gYXBwbHlWYXJzKCl7CiAgICBjb25zdCBsPWxheWVyKCk7aWYoIWwpcmV0dXJuOwogICAgbC5zdHlsZS5zZXRQcm9wZXJ0eSgiLS13cC1ibHVyIiwobWV0YS5tb2RlPT09ImltYWdlInx8bWV0YS5tb2RlPT09ImxlZ2FjeSI/TnVtYmVyKG1ldGEuYmx1cil8fDA6MCkrInB4Iik7CiAgICBjb25zdCBzPXNjcmltRWwoKTtpZihzKXMuc3R5bGUuYmFja2dyb3VuZD0icmdiYSg1LDgsMTYsIisoTWF0aC5tYXgoMCxNYXRoLm1pbig4MCxOdW1iZXIobWV0YS5kaW0pfHwwKSkvMTAwKSsiKSI7CiAgfQogIGZ1bmN0aW9uIHNob3cob24pewogICAgY29uc3QgbD1sYXllcigpO2lmKGwpbC5jbGFzc0xpc3QudG9nZ2xlKCJvbiIsISFvbik7CiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoImhhcy13YWxsIiwhIW9uKTsKICB9CiAgZnVuY3Rpb24gcGFpbnRJbWFnZShzcmMpewogICAgY29uc3QgaW09aW1nRWwoKTtpZighaW0pcmV0dXJuOwogICAgaW0uc3R5bGUuYmFja2dyb3VuZD0iIjtpbS5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9J3VybCgiJytzcmMrJyIpJzsKICAgIGFwcGx5VmFycygpO3Nob3codHJ1ZSk7CiAgfQogIGZ1bmN0aW9uIHBhaW50UHJlc2V0KGlkKXsKICAgIGNvbnN0IHA9UFJFU0VUUy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIHguaWQ9PT1pZH0pWzBdfHxQUkVTRVRTWzBdOwogICAgY29uc3QgaW09aW1nRWwoKTtpZighaW0pcmV0dXJuOwogICAgaW0uc3R5bGUuYmFja2dyb3VuZEltYWdlPSJub25lIjtpbS5zdHlsZS5iYWNrZ3JvdW5kPXAuY3NzOwogICAgYXBwbHlWYXJzKCk7c2hvdyh0cnVlKTsKICB9CiAgZnVuY3Rpb24gZGIoKXsKICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXMscmVqKXsKICAgICAgaWYoIXdpbmRvdy5pbmRleGVkREIpcmV0dXJuIHJlaihuZXcgRXJyb3IoIkluZGV4ZWREQiDkuI3lj6/nlKgiKSk7CiAgICAgIGNvbnN0IHI9aW5kZXhlZERCLm9wZW4oREIsMSk7CiAgICAgIHIub251cGdyYWRlbmVlZGVkPWZ1bmN0aW9uKCl7Y29uc3QgZD1yLnJlc3VsdDtpZighZC5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKFNUT1JFKSlkLmNyZWF0ZU9iamVjdFN0b3JlKFNUT1JFKX07CiAgICAgIHIub25zdWNjZXNzPWZ1bmN0aW9uKCl7cmVzKHIucmVzdWx0KX07CiAgICAgIHIub25lcnJvcj1mdW5jdGlvbigpe3JlaihyLmVycm9yfHxuZXcgRXJyb3IoIuaJk+W8gOaVsOaNruW6k+Wksei0pSIpKX07CiAgICB9KTsKICB9CiAgZnVuY3Rpb24gaWRiUHV0KGJsb2IpewogICAgcmV0dXJuIGRiKCkudGhlbihmdW5jdGlvbihkKXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzLHJlail7CiAgICAgIGNvbnN0IHR4PWQudHJhbnNhY3Rpb24oU1RPUkUsInJlYWR3cml0ZSIpO3R4Lm9iamVjdFN0b3JlKFNUT1JFKS5wdXQoYmxvYiwiY3VycmVudCIpOwogICAgICB0eC5vbmNvbXBsZXRlPWZ1bmN0aW9uKCl7ZC5jbG9zZSgpO3JlcygpfTt0eC5vbmVycm9yPWZ1bmN0aW9uKCl7ZC5jbG9zZSgpO3Jlaih0eC5lcnJvcil9OwogICAgfSl9KTsKICB9CiAgZnVuY3Rpb24gaWRiR2V0KCl7CiAgICByZXR1cm4gZGIoKS50aGVuKGZ1bmN0aW9uKGQpe3JldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXMscmVqKXsKICAgICAgY29uc3QgdHg9ZC50cmFuc2FjdGlvbihTVE9SRSwicmVhZG9ubHkiKSxxPXR4Lm9iamVjdFN0b3JlKFNUT1JFKS5nZXQoImN1cnJlbnQiKTsKICAgICAgcS5vbnN1Y2Nlc3M9ZnVuY3Rpb24oKXtkLmNsb3NlKCk7cmVzKHEucmVzdWx0fHxudWxsKX07cS5vbmVycm9yPWZ1bmN0aW9uKCl7ZC5jbG9zZSgpO3JlaihxLmVycm9yKX07CiAgICB9KX0pOwogIH0KICBmdW5jdGlvbiBpZGJEZWwoKXsKICAgIHJldHVybiBkYigpLnRoZW4oZnVuY3Rpb24oZCl7cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlcyl7CiAgICAgIGNvbnN0IHR4PWQudHJhbnNhY3Rpb24oU1RPUkUsInJlYWR3cml0ZSIpO3R4Lm9iamVjdFN0b3JlKFNUT1JFKS5kZWxldGUoImN1cnJlbnQiKTsKICAgICAgdHgub25jb21wbGV0ZT1mdW5jdGlvbigpe2QuY2xvc2UoKTtyZXMoKX07dHgub25lcnJvcj1mdW5jdGlvbigpe2QuY2xvc2UoKTtyZXMoKX07CiAgICB9KX0pOwogIH0KICBmdW5jdGlvbiBkYXRhVVJMdG9CbG9iKGQpewogICAgY29uc3QgcD1kLnNwbGl0KCIsIiksbT1wWzBdLm1hdGNoKC86KC4qPyk7LyksYj1hdG9iKHBbMV0pOwogICAgY29uc3QgdT1uZXcgVWludDhBcnJheShiLmxlbmd0aCk7CiAgICBmb3IobGV0IGk9MDtpPGIubGVuZ3RoO2krKyl1W2ldPWIuY2hhckNvZGVBdChpKTsKICAgIHJldHVybiBuZXcgQmxvYihbdV0se3R5cGU6KG0mJm1bMV0pfHwiaW1hZ2UvanBlZyJ9KTsKICB9CiAgZnVuY3Rpb24gY29tcHJlc3MoZmlsZSl7CiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzLHJlail7CiAgICAgIGNvbnN0IHVybD1VUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpLGltPW5ldyBJbWFnZSgpOwogICAgICBpbS5vbmxvYWQ9ZnVuY3Rpb24oKXsKICAgICAgICB0cnl7CiAgICAgICAgICBjb25zdCBtYXg9MjQwMDtsZXQgdz1pbS5uYXR1cmFsV2lkdGh8fGltLndpZHRoLGg9aW0ubmF0dXJhbEhlaWdodHx8aW0uaGVpZ2h0OwogICAgICAgICAgY29uc3Qgcz1NYXRoLm1pbigxLG1heC9NYXRoLm1heCh3LGgpKTt3PU1hdGgubWF4KDEsTWF0aC5yb3VuZCh3KnMpKTtoPU1hdGgubWF4KDEsTWF0aC5yb3VuZChoKnMpKTsKICAgICAgICAgIGNvbnN0IGM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgiY2FudmFzIik7Yy53aWR0aD13O2MuaGVpZ2h0PWg7CiAgICAgICAgICBjb25zdCB4PWMuZ2V0Q29udGV4dCgiMmQiKTtpZigheCl0aHJvdyBuZXcgRXJyb3IoIkNhbnZhcyDkuI3lj6/nlKgiKTsKICAgICAgICAgIHguZHJhd0ltYWdlKGltLDAsMCx3LGgpOwogICAgICAgICAgY29uc3QgZG9uZT1mdW5jdGlvbihiKXtVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7aWYoYilyZXMoYik7ZWxzZSByZWoobmV3IEVycm9yKCLlm77niYfnvJbnoIHlpLHotKUiKSl9OwogICAgICAgICAgaWYoYy50b0Jsb2IpYy50b0Jsb2IoZG9uZSwiaW1hZ2UvanBlZyIsLjg2KTsKICAgICAgICAgIGVsc2UgZG9uZShkYXRhVVJMdG9CbG9iKGMudG9EYXRhVVJMKCJpbWFnZS9qcGVnIiwuODYpKSk7CiAgICAgICAgfWNhdGNoKGUpe1VSTC5yZXZva2VPYmplY3RVUkwodXJsKTtyZWooZSl9CiAgICAgIH07CiAgICAgIGltLm9uZXJyb3I9ZnVuY3Rpb24oKXtVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7cmVqKG5ldyBFcnJvcigi5Zu+54mH6K+75Y+W5aSx6LSlIikpfTsKICAgICAgaW0uc3JjPXVybDsKICAgIH0pOwogIH0KICBhc3luYyBmdW5jdGlvbiBpbml0KCl7CiAgICBsb2FkTWV0YSgpOwogICAgaWYobWV0YS5tb2RlPT09ImltYWdlIil7CiAgICAgIHRyeXsKICAgICAgICBjb25zdCBibG9iPWF3YWl0IGlkYkdldCgpOwogICAgICAgIGlmKGJsb2Ipe2lmKG9ialVybClVUkwucmV2b2tlT2JqZWN0VVJMKG9ialVybCk7b2JqVXJsPVVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7cGFpbnRJbWFnZShvYmpVcmwpfQogICAgICAgIGVsc2V7cGFpbnRQcmVzZXQobWV0YS5wcmVzZXQpO21ldGEubW9kZT0icHJlc2V0IjtzYXZlTWV0YSgpfQogICAgICB9Y2F0Y2goZSl7cGFpbnRQcmVzZXQobWV0YS5wcmVzZXQpO21ldGEubW9kZT0icHJlc2V0IjtzYXZlTWV0YSgpfQogICAgfWVsc2UgaWYobWV0YS5tb2RlPT09InByZXNldCIpewogICAgICBwYWludFByZXNldChtZXRhLnByZXNldCk7CiAgICB9ZWxzZXsKICAgICAgY29uc3QgbGVnYWN5PShnZXRDZmcoKSYmZ2V0Q2ZnKCkuY3VzdG9tQmcpfHwiIjsKICAgICAgaWYobGVnYWN5KXttZXRhLm1vZGU9ImxlZ2FjeSI7cGFpbnRJbWFnZShsZWdhY3kpfQogICAgICBlbHNle21ldGEubW9kZT0ibm9uZSI7c2hvdyhmYWxzZSl9CiAgICB9CiAgICBzeW5jVUkoKTsKICB9CiAgYXN5bmMgZnVuY3Rpb24gcGljayhpbnApewogICAgY29uc3QgZj1pbnAmJmlucC5maWxlcyYmaW5wLmZpbGVzWzBdOwogICAgaWYoaW5wKWlucC52YWx1ZT0iIjsKICAgIGlmKCFmKXJldHVybjsKICAgIGlmKCEvXmltYWdlXC8vLnRlc3QoZi50eXBlfHwiIikpe3RvYXN0KCLor7fpgInmi6nlm77niYfmlofku7YiLCJlcnIiKTtyZXR1cm59CiAgICBpZihidXN5KXJldHVybjsKICAgIGJ1c3k9dHJ1ZTsKICAgIHRyeXsKICAgICAgdG9hc3QoIuato+WcqOWkhOeQhuWbvueJh+KApiIsImluZm8iKTsKICAgICAgY29uc3QgYmxvYj1hd2FpdCBjb21wcmVzcyhmKTsKICAgICAgYXdhaXQgaWRiUHV0KGJsb2IpOwogICAgICBpZihvYmpVcmwpVVJMLnJldm9rZU9iamVjdFVSTChvYmpVcmwpOwogICAgICBvYmpVcmw9VVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTsKICAgICAgbWV0YS5tb2RlPSJpbWFnZSI7c2F2ZU1ldGEoKTsKICAgICAgcGFpbnRJbWFnZShvYmpVcmwpOwogICAgICBjb25zdCBjPWdldENmZygpO2lmKGMuY3VzdG9tQmcpe2MuY3VzdG9tQmc9IiI7c2F2ZUNmZyhjKX0KICAgICAgc3luY1VJKCk7CiAgICAgIHRvYXN0KCLlo4Hnurjlt7LlupTnlKjvvIgiK01hdGgubWF4KDEsTWF0aC5yb3VuZChibG9iLnNpemUvMTAyNCkpKyIgS0LvvIkiLCJvayIpOwogICAgfWNhdGNoKGUpewogICAgICB0b2FzdCgi5aOB57q45aSE55CG5aSx6LSl77yaIisoKGUmJmUubWVzc2FnZSl8fGUpLCJlcnIiKTsKICAgIH0KICAgIGJ1c3k9ZmFsc2U7CiAgfQogIGZ1bmN0aW9uIHByZXNldChpZCl7CiAgICBtZXRhLm1vZGU9InByZXNldCI7bWV0YS5wcmVzZXQ9aWQ7c2F2ZU1ldGEoKTsKICAgIGlmKG9ialVybCl7VVJMLnJldm9rZU9iamVjdFVSTChvYmpVcmwpO29ialVybD1udWxsfQogICAgcGFpbnRQcmVzZXQoaWQpOwogICAgY29uc3QgYz1nZXRDZmcoKTtpZihjLmN1c3RvbUJnKXtjLmN1c3RvbUJnPSIiO3NhdmVDZmcoYyl9CiAgICBzeW5jVUkoKTsKICB9CiAgZnVuY3Rpb24gc2V0Qmx1cih2KXttZXRhLmJsdXI9TWF0aC5tYXgoMCxNYXRoLm1pbigyNCxOdW1iZXIodil8fDApKTtzYXZlTWV0YSgpO2FwcGx5VmFycygpO3N5bmNVSSgpfQogIGZ1bmN0aW9uIHNldERpbSh2KXttZXRhLmRpbT1NYXRoLm1heCgwLE1hdGgubWluKDgwLE51bWJlcih2KXx8MCkpO3NhdmVNZXRhKCk7YXBwbHlWYXJzKCk7c3luY1VJKCl9CiAgZnVuY3Rpb24gY2xlYXIoKXsKICAgIG1ldGEubW9kZT0ibm9uZSI7c2F2ZU1ldGEoKTsKICAgIGlmKG9ialVybCl7VVJMLnJldm9rZU9iamVjdFVSTChvYmpVcmwpO29ialVybD1udWxsfQogICAgaWRiRGVsKCkuY2F0Y2goZnVuY3Rpb24oKXt9KTsKICAgIHNob3coZmFsc2UpOwogICAgY29uc3QgYz1nZXRDZmcoKTtpZihjLmN1c3RvbUJnKXtjLmN1c3RvbUJnPSIiO3NhdmVDZmcoYyl9CiAgICBzeW5jVUkoKTt0b2FzdCgi5bey5oGi5aSN6buY6K6k6IOM5pmvIiwiaW5mbyIpOwogIH0KICBmdW5jdGlvbiBzeW5jVUkoKXsKICAgIGNvbnN0IGJveD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid3BQcmVzZXRzIik7CiAgICBpZihib3gpewogICAgICBjb25zdCBjaGlwcz1ib3gucXVlcnlTZWxlY3RvckFsbCgiLndwLWNoaXAiKTsKICAgICAgZm9yKGxldCBpPTA7aTxjaGlwcy5sZW5ndGg7aSsrKWNoaXBzW2ldLmNsYXNzTGlzdC50b2dnbGUoIm9uIixtZXRhLm1vZGU9PT0icHJlc2V0IiYmY2hpcHNbaV0uZ2V0QXR0cmlidXRlKCJkYXRhLWlkIik9PT1tZXRhLnByZXNldCk7CiAgICB9CiAgICBjb25zdCBwdj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid3BQcmV2aWV3Iik7CiAgICBpZihwdil7CiAgICAgIGlmKG1ldGEubW9kZT09PSJpbWFnZSImJm9ialVybCl7cHYuc3R5bGUuYmFja2dyb3VuZD1wdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7cHYuc3R5bGUuYmFja2dyb3VuZEltYWdlPSd1cmwoIicrb2JqVXJsKyciKSc7cHYudGV4dENvbnRlbnQ9IiJ9CiAgICAgIGVsc2UgaWYobWV0YS5tb2RlPT09ImxlZ2FjeSIpe2NvbnN0IGxnPWdldENmZygpLmN1c3RvbUJnfHwiIjtwdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9bGc/J3VybCgiJytsZysnIiknOiIiO3B2LnRleHRDb250ZW50PWxnPyLml6fog4zmma8iOiLmnKrorr7nva4ifQogICAgICBlbHNlIGlmKG1ldGEubW9kZT09PSJwcmVzZXQiKXtjb25zdCBwPVBSRVNFVFMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkPT09bWV0YS5wcmVzZXR9KVswXTtwdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9Im5vbmUiO3B2LnN0eWxlLmJhY2tncm91bmQ9cD9wLmNzczoiIjtwdi50ZXh0Q29udGVudD0iIn0KICAgICAgZWxzZXtwdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7cHYuc3R5bGUuYmFja2dyb3VuZD0iIjtwdi50ZXh0Q29udGVudD0i5pyq6K6+572uIn0KICAgIH0KICAgIGNvbnN0IGI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndwX2JsdXIiKSxidj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid3BfYmx1cl92Iik7CiAgICBpZihiKWIudmFsdWU9U3RyaW5nKG1ldGEuYmx1cik7aWYoYnYpYnYudGV4dENvbnRlbnQ9KG1ldGEuYmx1cnx8MCkrInB4IjsKICAgIGNvbnN0IGQ9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndwX2RpbSIpLGR2PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3cF9kaW1fdiIpOwogICAgaWYoZClkLnZhbHVlPVN0cmluZyhtZXRhLmRpbSk7aWYoZHYpZHYudGV4dENvbnRlbnQ9KG1ldGEuZGltfHwwKSsiJSI7CiAgICBjb25zdCB0Zz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiZzNkX3RvZ2dsZSIpOwogICAgaWYodGcpdGcuY2hlY2tlZD1nM2RFbmFibGVkKCk7CiAgICBjb25zdCB0aXA9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndwTW9kZVRpcCIpOwogICAgaWYodGlwKXRpcC50ZXh0Q29udGVudD1tZXRhLm1vZGU9PT0iaW1hZ2UiPyLlvZPliY3vvJroh6rlrprkuYnlm77niYciOihtZXRhLm1vZGU9PT0ibGVnYWN5Ij8i5b2T5YmN77ya5pen54mI6IOM5pmvIjoobWV0YS5tb2RlPT09InByZXNldCI/IuW9k+WJje+8mumihOiuviAiKygoUFJFU0VUUy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIHguaWQ9PT1tZXRhLnByZXNldH0pWzBdfHx7fSkubmFtZXx8IiIpOiLlvZPliY3vvJrpu5jorqTog4zmma8iKSk7CiAgfQogIHJldHVybiB7aW5pdDppbml0LHBpY2s6cGljayxwcmVzZXQ6cHJlc2V0LHNldEJsdXI6c2V0Qmx1cixzZXREaW06c2V0RGltLGNsZWFyOmNsZWFyLHN5bmNVSTpzeW5jVUkscHJlc2V0czpQUkVTRVRTfTsKfSkoKTsKZnVuY3Rpb24gYXBwbHlDdXN0b21CZygpewogIGNvbnN0IGJnPShnZXRDZmcoKSYmZ2V0Q2ZnKCkuY3VzdG9tQmcpfHwiIjsKICBjb25zdCBiPWRvY3VtZW50LmJvZHk7CiAgYi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9IiI7Yi5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT0iIjtiLnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbj0iIjtiLnN0eWxlLmJhY2tncm91bmRBdHRhY2htZW50PSIiOwogIGlmKGJnJiZkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2FsbExheWVyIikmJiFkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2FsbExheWVyIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJvbiIpKXsKICAgIGNvbnN0IGltPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3YWxsSW1nIik7CiAgICBpZihpbSl7aW0uc3R5bGUuYmFja2dyb3VuZEltYWdlPSd1cmwoIicrYmcrJyIpJztpbS5zdHlsZS5iYWNrZ3JvdW5kPSIiO30KICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3YWxsTGF5ZXIiKS5jbGFzc0xpc3QuYWRkKCJvbiIpOwogICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCJoYXMtd2FsbCIpOwogIH0KfQoKLyogPT09PT09PT09PT09PT09PT0g56uL5Y2z562+5Yiw5oKs5rWu5oyJ6ZKuID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG1vdW50U2lnbmluRmFiKCl7CiAgaWYoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpKXJldHVybjsKICBjb25zdCBiPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImJ1dHRvbiIpOwogIGIuaWQ9InNpZ25pbkZhYiI7Yi5jbGFzc05hbWU9InNpZ25pbi1mYWIiO2IuaW5uZXJIVE1MPShJLmNoZWNrfHwiIikrIjxzcGFuPueri+WNs+etvuWIsDwvc3Bhbj4iOwogIGIub25jbGljaz1ydW5TaWduaW5Ob3c7CiAgY29uc3QgY3VyPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoIi50YWIub24iKTsKICBiLnN0eWxlLmRpc3BsYXk9KCFjdXJ8fGN1ci5kYXRhc2V0LnRhYj09PSJob21lIik/ImZsZXgiOiJub25lIjsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ1blNpZ25pbk5vdygpewogIGlmKGlzRGVtbygpKXtkZW1vU2lnbmluKCk7cmV0dXJufQogIGNvbnN0IGJ0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic2lnbmluRmFiIik7CiAgaWYoIWJ0bnx8YnRuLmNsYXNzTGlzdC5jb250YWlucygiYnVzeSIpKXJldHVybjsKICBidG4uY2xhc3NMaXN0LmFkZCgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9IuetvuWIsOS4reKApiI7CiAgdG9hc3QoIuato+WcqOS4uuWFqOmDqOi0puWPt+aJp+ihjOetvuWIsOKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucnVuU2lnbmluKG51bGwsdHJ1ZSk7CiAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnq4vljbPnrb7liLAiOwogIGlmKGQmJmQub2smJmQucmVzdWx0cyl7CiAgICBjb25zdCBva049ZC5yZXN1bHRzLmZpbHRlcihyPT5yLnN1Y2Nlc3MpLmxlbmd0aDsKICAgIHRvYXN0KCLnrb7liLDlrozmiJDvvJoiK29rTisiLyIrZC5yZXN1bHRzLmxlbmd0aCsiIOaIkOWKnyIsb2tOPT09ZC5yZXN1bHRzLmxlbmd0aD8ib2siOiJlcnIiKTsKICAgIG9wZW5TaGVldCgi562+5Yiw57uT5p6cIixJLmNoZWNrLHNpZ25pblJlc3VsdEh0bWwoZC5yZXN1bHRzKSk7CiAgICByZWZyZXNoQWxsKHRydWUpOwogIH1lbHNlewogICAgdG9hc3QoKGQmJmQuZXJyb3IpfHwi562+5Yiw5omn6KGM5aSx6LSlIiwiZXJyIik7CiAgfQp9CmZ1bmN0aW9uIHNpZ25pblJlc3VsdEh0bWwocmVzdWx0cyl7CiAgcmV0dXJuIChyZXN1bHRzfHxbXSkubWFwKHI9Pic8ZGl2IGNsYXNzPSJzaWctY2FyZCAnKyhyLnN1Y2Nlc3M/Im9rIjoiZmFpbCIpKyciPjxkaXYgY2xhc3M9ImgiPjxzcGFuPicrZXNjKHIudXNlck5hbWV8fCLmnKrnn6UiKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj4nKyhyLnN1Y2Nlc3M/KCIrIisoci50b3RhbEdhaW58fDApKyIg5YiGIik6IuWksei0pSIpKyc8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0ic3RlcHMiPicrKHIuc3RlcHN8fFtdKS5tYXAocz0+JzxkaXY+PGk+wrc8L2k+Jytlc2MocykrJzwvZGl2PicpLmpvaW4oIiIpKyhyLmVycm9yPyc8ZGl2IGNsYXNzPSJlcnIiPicrZXNjKHIuZXJyb3IpKyc8L2Rpdj4nOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7Cn0KLyog5ryU56S65qih5byP77ya5qih5ouf5LiA5qyh562+5Yiw5bm25by55Ye657uT5p6c77yM6YG/5YWN5ryU56S65pe257uT5p6c5Li656m6ICovCmZ1bmN0aW9uIGRlbW9TaWduaW4oKXsKICBjb25zdCBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInNpZ25pbkZhYiIpOwogIGlmKGJ0bil7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4ucXVlcnlTZWxlY3Rvcigic3BhbiIpLnRleHRDb250ZW50PSLnrb7liLDkuK3igKYifQogIHRvYXN0KCLmvJTnpLrmqKHlvI/vvJrmqKHmi5/miafooYznrb7liLDigKYiLCJpbmZvIik7CiAgc2V0VGltZW91dCgoKT0+ewogICAgaWYoYnRuKXtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5xdWVyeVNlbGVjdG9yKCJzcGFuIikudGV4dENvbnRlbnQ9Iueri+WNs+etvuWIsCJ9CiAgICBjb25zdCByZXM9WwogICAgICB7dXNlck5hbWU6IumYv+azvSIsc3VjY2Vzczp0cnVlLHRvdGFsR2Fpbjo5LHN0ZXBzOlsi562+5Yiw5oiQ5YqfICs2Iiwi55uy55uS6I635b6XICszICjnp6/liIYpIiwi5Y+R5biW5oiQ5YqfICsxIiwi54K56LWe5oiQ5YqfICsxIiwi5YiG5Lqr5oiQ5YqfICsxIiwi6K+E6K665a6M5oiQIl19LAogICAgICB7dXNlck5hbWU6IuWwj+a7oSIsc3VjY2VzczpmYWxzZSxlcnJvcjoiVG9rZW7lt7Lov4fmnJ/vvIzor7fph43mlrDnmbvlvZUiLHN0ZXBzOlsi562+5Yiw5aSx6LSlOiDor7flhYjnmbvlvZUiXX0KICAgIF07CiAgICB0b2FzdCgi562+5Yiw5a6M5oiQ77yaMS8yIOaIkOWKn++8iOa8lOekuuaVsOaNru+8iSIsIm9rIik7CiAgICBvcGVuU2hlZXQoIuetvuWIsOe7k+aenCIsSS5jaGVjayxzaWduaW5SZXN1bHRIdG1sKHJlcykpOwogIH0sNzAwKTsKfQoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G6K+m5oOFICYg5Zyw5Zu+ID09PT09PT09PT09PT09PT09ICovCmZ1bmN0aW9uIG9wZW5NYXAoaWR4KXtjb25zdCB2PVNUQVRFLmRhdGFbaWR4XSYmU1RBVEUuZGF0YVtpZHhdLnZlaGljbGU7aWYoIXYpcmV0dXJuO2lmKCFoYXNWYWxpZENvb3JkKHYubGF0aXR1ZGUsdi5sb25naXR1ZGUpKXt0b2FzdCgi5pqC5peg5pyJ5pWIIEdQUyDlnZDmoIciLCJlcnIiKTtyZXR1cm59Y29uc3QgdXJsPSJodHRwczovL21hcHMuYXBwbGUuY29tLz9xPSIrTnVtYmVyKHYubGF0aXR1ZGUpKyIsIitOdW1iZXIodi5sb25naXR1ZGUpKyImej0xNyI7d2luZG93Lm9wZW4odXJsLCJfYmxhbmsiKX0KZnVuY3Rpb24gc2hvd1ZlaGljbGVEZXRhaWwoaWR4KXsKICBjb25zdCBhPVNUQVRFLmRhdGFbaWR4XTtpZighYSlyZXR1cm47Y29uc3Qgdj1hLnZlaGljbGV8fHt9OwogIGNvbnN0IHB3PXBvd2VyVGV4dCh2LnBvd2VyU3RhdHVzLHYubG9ja1N0YXRlKTsKICBjb25zdCByb3dzPVtdOwogIGlmKHYudmluTm8pcm93cy5wdXNoKFsn6L2m5p625Y+3JywnPHNwYW4gY2xhc3M9InYgbW9ubyIgaWQ9InZpbkR0bCI+Jytlc2MobWFza1Zpbih2LnZpbk5vKSkrJzwvc3Bhbj4gPGJ1dHRvbiBjbGFzcz0idmluLXNob3ciIG9uY2xpY2s9InRvZ2dsZUR0bFZpbigpIj7mmL7npLo8L2J1dHRvbj4nXSk7CiAgcm93cy5wdXNoKFsn5YWF55S154q25oCBJyxlc2Modi5jaGFyZ2VTdGF0ZXx8IuacquWFheeUtSIpXSk7CiAgcm93cy5wdXNoKFsn55S15rqQ54q25oCBJywnPHNwYW4gc3R5bGU9ImNvbG9yOicrKHB3LmNscz09PSJvbiI/InZhcigtLW9rKSI6InZhcigtLXR4dDIpIikrJyI+Jytwdy50ZXh0Kyc8L3NwYW4+J10pOwogIGlmKHYucmlkZVN0YXRlfHx2Lm9ubGluZSlyb3dzLnB1c2goWyfovabovobnirbmgIEnLGVzYyh2LnJpZGVTdGF0ZXx8di5vbmxpbmUpXSk7CiAgcm93cy5wdXNoKFsn55S16YePIFNPQycsJzxiIHN0eWxlPSJjb2xvcjonKyh2LmJhdHRlcnlQZXJjZW50PD0yMD8idmFyKC0tZXJyKSI6di5iYXR0ZXJ5UGVyY2VudDw9NTA/InZhcigtLXdhcm4pIjoidmFyKC0tYnJhbmQpIikrJyI+Jysodi5iYXR0ZXJ5UGVyY2VudHx8MCkrJyU8L2I+J10pOwogIGlmKHYudm9sdGFnZSlyb3dzLnB1c2goWyfnlLXljosnLHYudm9sdGFnZS50b0ZpeGVkKDEpKyJWIl0pOwogIGlmKHYuY3VycmVudClyb3dzLnB1c2goWyfnlLXmtYEnLHYuY3VycmVudC50b0ZpeGVkKDEpKyJBIl0pOwogIGlmKHYuYmF0dGVyeVRlbXApcm93cy5wdXNoKFsn55S15rGg5rip5bqmJyx2LmJhdHRlcnlUZW1wLnRvRml4ZWQoMCkrIsKwQyJdKTsKICByb3dzLnB1c2goWyfliankvZnnu63oiKonLCh2LnJlc2lkdWFsUmFuZ2VLbXx8MCkrIiBrbSIrKHYucmFuZ2VFc3RpbWF0ZWQ/Iu+8iOS8sOeul++8iSI6IiIpXSk7CiAgcm93cy5wdXNoKFsn5LuK5pel6aqR6KGMJywodi50b2RheURpc3RhbmNlP3YudG9kYXlEaXN0YW5jZS50b0ZpeGVkKDEpOjApKyIga20gLyAiKyh2LnRvZGF5RHVyYXRpb258fDApKyIgbWluIl0pOwogIGlmKCh2LmZyb250UHJlc3N1cmUmJnYuZnJvbnRQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKXx8KHYucmVhclByZXNzdXJlJiZ2LnJlYXJQcmVzc3VyZSE9PSLmnKrnu5HlrpoiKSlyb3dzLnB1c2goWyfog47ljosnLCfliY0gJytlc2Modi5mcm9udFByZXNzdXJlfHwiLSIpKycgLyDlkI4gJytlc2Modi5yZWFyUHJlc3N1cmV8fCItIildKTsKICBpZih2LmFkZHJlc3Mpcm93cy5wdXNoKFsn6L2m6L6G5L2N572uJywnPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5hZGRyZXNzKSsnPC9zcGFuPiddKTsKICBjb25zdCBkT2s9aGFzVmFsaWRDb29yZCh2LmxhdGl0dWRlLHYubG9uZ2l0dWRlKTsKICBpZihkT2spcm93cy5wdXNoKFsnR1BTIOWdkOaghycsJzxzcGFuIGNsYXNzPSJ2IG1vbm8iPicrTnVtYmVyKHYubGF0aXR1ZGUpLnRvRml4ZWQoNikrIiwgIitOdW1iZXIodi5sb25naXR1ZGUpLnRvRml4ZWQoNikrJzwvc3Bhbj4nXSk7CiAgaWYodi5sb2NhdGlvblRpbWUpcm93cy5wdXNoKFsn5pyA5ZCO5a6a5L2NJywnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMCI+Jytlc2Modi5sb2NhdGlvblRpbWUpKyc8L3NwYW4+J10pOwogIGlmKHYuc2VydmljZUVuZERhdGUpcm93cy5wdXNoKFsn5pyN5Yqh5Yiw5pyfJyxlc2Modi5zZXJ2aWNlRW5kRGF0ZSldKTsKICBTVEFURS52aW5EdGxSYXc9di52aW5Ob3x8IiI7CiAgY29uc3QgaHRtbD1yb3dzLm1hcChyPT4nPGRpdiBjbGFzcz0ic3ItaXRlbSI+PHNwYW4gY2xhc3M9ImsiPicrclswXSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nK3JbMV0rJzwvc3Bhbj48L2Rpdj4nKS5qb2luKCIiKSsKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTZweCI+PGJ1dHRvbiBjbGFzcz0iYnRuICcrKGRPaz8icHJpbWFyeSI6IiIpKyciICcrKGRPaz8nb25jbGljaz0iY2xvc2VTaGVldCgpO29wZW5NYXAoJytpZHgrJykiJzonZGlzYWJsZWQgdGl0bGU9IuaaguaXoOacieaViEdQU+WdkOaghyInKSsnPicrSS5tYXArJyDlnLDlm77mn6XnnIs8L2J1dHRvbj48L2Rpdj4nOwogIG9wZW5TaGVldCgi6L2m6L6G6K+m5oOFIMK3ICIrZXNjKHYudmVoaWNsZU5hbWV8fCLmnoHmoLjovabovoYiKSxJLmNhcixodG1sKTsKfQpmdW5jdGlvbiB0b2dnbGVEdGxWaW4oKXtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgidmluRHRsIik7aWYoIWVsKXJldHVybjtpZihlbC50ZXh0Q29udGVudC5pbmRleE9mKCIqIik+PTApe2VsLnRleHRDb250ZW50PVNUQVRFLnZpbkR0bFJhdztkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2hlZXRCb2R5IC52aW4tc2hvdycpLnRleHRDb250ZW50PSLpmpDol48ifWVsc2V7ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NoZWV0Qm9keSAudmluLXNob3cnKS50ZXh0Q29udGVudD0i5pi+56S6IjtlbC50ZXh0Q29udGVudD1tYXNrVmluKGVsLnRleHRDb250ZW50KX19Ci8qID09PT09PT09PT09PT09PT09IOetvuWIsOaJp+ihjO+8iOmdouadv+W3suenu+mZpOaJi+WKqOetvuWIsOWFpeWPo++8jOWumuaXtuetvuWIsOeUseiEmuacrCBjcm9uIOi0n+i0o++8iSA9PT09PT09PT09PT09PT09PSAqLwoKLyogPT09PT09PT09PT09PT09PT0g6L2m6L6G5o6n5Yi2ID09PT09PT09PT09PT09PT09ICovCi8vIHYyLjE0LjIxIOi9puaOp+mjjumZqeehruiupOaUueS4uummluasoeS9v+eUqOW8ueeql++8muWQjOaEj+WQjuWPr+eUqO+8jOS4jeWQjOaEj+WImeS4jeWQr+eUqApsZXQgX19yaXNrUGVuZGluZz1udWxsOwpmdW5jdGlvbiByaXNrT2soKXtjb25zdCByPShnZXRDZmcoKS52ZWhpY2xlQ29udHJvbFJpc2t8fCIiKS50cmltKCk7cmV0dXJuIHI9PT0i5oiR5ZCM5oSP6aOO6Zmp5bm25L2/55SoInx8cj09PSLmiJHoh6rmhL/mib/mi4Xnm7jlhbPpo47pmakifQpmdW5jdGlvbiBjdHJsQWN0KGlkeCxhY3Rpb24sYnRuKXtpZihsb2NhdGlvbi5zZWFyY2guaW5kZXhPZigiZGVtbyIpPj0wKXt0b2FzdCgi5ryU56S65qih5byP77ya5LuF6aKE6KeI55WM6Z2iIiwiaW5mbyIpO3JldHVybn1jb25zdCBhPXB0QWNjb3VudHMoKVtpZHhdO2lmKCFhfHwhYS51c2VySWQpe3RvYXN0KCLor6XotKblj7fnvLrlsJHnlKjmiLdJRCIsImVyciIpO3JldHVybn1pZighcmlza09rKCkpe3Nob3dSaXNrRGlhbG9nKGlkeCxhY3Rpb24pO3JldHVybn1jdHJsQ29uZmlybShpZHgsYWN0aW9uKX0KZnVuY3Rpb24gY3RybENvbmZpcm0oaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtjb25zdCBuYW1lcz17ZmluZDoi55+t5oyJ5a+76L2m77yI6L2m6L6G6Zeq54Gv77yJIixsb3VkRmluZDoi6bij56yb6Zeq54Gv77yI6auY5aOw5a+76L2m77yJIixjdXNoaW9uOiLmiZPlvIDlnZDlnqvvvIjlnZDlnqvkvJrlvLnotbfvvIkiLHVubG9jazoi5LqR56uv5byA6ZSBIixsb2NrOiLkupHnq6/lhbPplIEifTtjb25zdCBuYW1lPW5hbWVzW2FjdGlvbl18fGFjdGlvbjtjb25maXJtRGlhbG9nKCLnoa7orqTmiafooYwgIituYW1lLCLor6XmjIfku6TkvJrpgJrov4cgNEcg572R57uc55yf5a6e5o6n5Yi25L2g55qE6L2m6L6G77yaIitlc2MoYS51c2VyTmFtZSkrIuOAgiIsJ2RvQ3RybCgnK2lkeCsiLCciK2FjdGlvbisiJykiKX0KZnVuY3Rpb24gc2hvd1Jpc2tEaWFsb2coaWR4LGFjdGlvbil7CiAgX19yaXNrUGVuZGluZz17aWR4OmlkeCxhY3Rpb246YWN0aW9ufTsKICBjb25zdCBsYXllcj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29uZmlybUxheWVyIik7CiAgbGF5ZXIuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjb25maXJtIj48ZGl2IGNsYXNzPSJjdCI+6L2m5o6n5Yqf6IO96aOO6Zmp5ZGK55+lPC9kaXY+PGRpdiBjbGFzcz0iY2QiPuWvu+i9piAvIOm4o+esmyAvIOWdkOWeqyAvIOW8gOmUgSAvIOWFs+mUgeetieaMh+S7pOe7jyA0RyDkupHnq6/kuIvlj5HvvIzkvJo8Yj7nnJ/lrp7mk43kvZzkvaDnmoTovabovoY8L2I+44CC5Y+X572R57uc5bu26L+f44CB5L+h5Y+3562J5b2x5ZON77yM5oyH5Luk5Y+v6IO95bu26L+f44CB5aSx6LSl77yM5p6B56uv5oOF5Ya15LiL6L2m6L6G5Y+v6IO95oSP5aSW5Yqo5L2c77yI5aaC6K+v5byA6ZSB77yJ44CC5L2/55So6L2m5o6n5Yqf6IO95Y2z6KeG5Li65L2g5bey5YWF5YiG55+l5oKJ5bm26Ieq5oS/5om/5ouF5LiK6L+w6aOO6Zmp77yM55Sx5q2k5Lqn55Sf55qE5LiA5YiH5ZCO5p6c55Sx5L2g6Ieq6KGM5om/5ouF44CCPC9kaXY+PGRpdiBjbGFzcz0iY2IiPjxidXR0b24gY2xhc3M9Im5vIiBvbmNsaWNrPSJyaXNrRGVjbGluZSgpIj7miJHkuI3lkIzmhI/po47pmankuI3kvb/nlKg8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJ5ZXMiIG9uY2xpY2s9InJpc2tBZ3JlZSgpIj7miJHlkIzmhI/po47pmanlubbkvb/nlKg8L2J1dHRvbj48L2Rpdj48L2Rpdj4nOwogIGxheWVyLmNsYXNzTGlzdC5yZW1vdmUoImhpZGRlbiIpOwp9CmZ1bmN0aW9uIHJpc2tBZ3JlZSgpe2Nsb3NlQ29uZmlybSgpO2NvbnN0IGM9Z2V0Q2ZnKCk7Yy52ZWhpY2xlQ29udHJvbFJpc2s9IuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqCI7QmFja2VuZC5zYXZlQ29uZmlnKGMpLnRoZW4oZnVuY3Rpb24ob2spe2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKWFwcGx5UmVtb3RlQ2ZnKGMpO2Vsc2Ugc2F2ZUNmZyhjKTt0b2FzdCgi5bey5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95bey5ZCv55SoIiwib2siKTtpZihfX3Jpc2tQZW5kaW5nKXtjb25zdCBwPV9fcmlza1BlbmRpbmc7X19yaXNrUGVuZGluZz1udWxsO2N0cmxDb25maXJtKHAuaWR4LHAuYWN0aW9uKX19ZWxzZXt0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7X19yaXNrUGVuZGluZz1udWxsfX0pfQpmdW5jdGlvbiByaXNrRGVjbGluZSgpe2Nsb3NlQ29uZmlybSgpO19fcmlza1BlbmRpbmc9bnVsbDt0b2FzdCgi5bey6YCJ5oup5LiN5ZCM5oSP6aOO6Zmp77yM6L2m5o6n5Yqf6IO95LiN5ZCv55SoIiwiaW5mbyIpfQphc3luYyBmdW5jdGlvbiBkb0N0cmwoaWR4LGFjdGlvbil7Y29uc3QgYT1wdEFjY291bnRzKClbaWR4XTtpZighYSlyZXR1cm47Y29uc3QgYnRuPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jdHJsLWJ0bltkYXRhLWFjdD0iJythY3Rpb24rJyJdJyk7Y29uc3Qgb2xkPWJ0bj9idG4uaW5uZXJIVE1MOiIiO2lmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLmNsYXNzTGlzdC5hZGQoImJ1c3kiKTtidG4uaW5uZXJIVE1MPUkuY2xvY2t9dG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTtjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUN0cmwoYS51c2VySWQsYWN0aW9uKTtpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4uY2xhc3NMaXN0LnJlbW92ZSgiYnVzeSIpO2J0bi5pbm5lckhUTUw9b2xkfWlmKGQmJmQub2spe3RvYXN0KGQubWVzc2FnZXx8IuaMh+S7pOW3suS4i+WPkSIsIm9rIil9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuaMh+S7pOWksei0pSIsImVyciIpfX0KCi8qID09PT09PT09PT09PT09PT09IOaXpeW/l+mhtSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgbG9nRmlsdGVyPSJhbGwiOwphc3luYyBmdW5jdGlvbiByZW5kZXJMb2dzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VMb2dzIik7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua3YrJ+i/kOihjOaXpeW/lzwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImxvZy1wYW5lbCI+PGRpdiBjbGFzcz0ibG9nLWhlYWQiPjxoMz4nK0kua3YrJzxzcGFuPuacgOi/kSA1MCDmnaE8L3NwYW4+PC9oMz48ZGl2IGNsYXNzPSJsb2ctZmlsdGVycyI+JysKICBbJzxidXR0b24gY2xhc3M9ImNoaXAgJysobG9nRmlsdGVyPT09ImFsbCI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwnYWxsXCcpIj7lhajpg6g8L2J1dHRvbj4nLCc8YnV0dG9uIGNsYXNzPSJjaGlwICcrKGxvZ0ZpbHRlcj09PSJzaWduaW4iPyJvbiI6IiIpKyciIG9uY2xpY2s9InNldExvZ0ZpbHRlcihcJ3NpZ25pblwnKSI+562+5YiwPC9idXR0b24+JywnPGJ1dHRvbiBjbGFzcz0iY2hpcCAnKyhsb2dGaWx0ZXI9PT0idmVoaWNsZSI/Im9uIjoiIikrJyIgb25jbGljaz0ic2V0TG9nRmlsdGVyKFwndmVoaWNsZVwnKSI+5o6n6L2mPC9idXR0b24+J10uam9pbigiIikrCiAgJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImxvZy1saXN0IiBpZD0ibG9nTGlzdCI+PGRpdiBzdHlsZT0icGFkZGluZzo0MHB4O3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOnZhcigtLXR4dDMpIj7liqDovb3kuK3igKY8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48YnV0dG9uIGNsYXNzPSJidG4gZGFuZ2VyIiBzdHlsZT0iZmxleDoxIiBvbmNsaWNrPSJjbGVhckxvZ3NVSSgpIj7muIXnqbrml6Xlv5c8L2J1dHRvbj48L2Rpdj4nOwogIGNvbnN0IGxvZ3M9bG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MD9ERU1PX0xPR1M6YXdhaXQgQmFja2VuZC5nZXRMb2dzKCk7cmVuZGVyTG9nTGlzdChsb2dzKTsKfQpmdW5jdGlvbiBzZXRMb2dGaWx0ZXIoZil7bG9nRmlsdGVyPWY7cmVuZGVyTG9ncygpfQpmdW5jdGlvbiByZW5kZXJMb2dMaXN0KGxvZ3Mpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJsb2dMaXN0Iik7aWYoIWVsKXJldHVybjtjb25zdCBsaXN0PShsb2dzfHxbXSkuZmlsdGVyKGw9Pntjb25zdCB0PWwudHlwZXx8InNpZ25pbiI7aWYobG9nRmlsdGVyPT09ImFsbCIpcmV0dXJuIHRydWU7cmV0dXJuIHQ9PT1sb2dGaWx0ZXJ9KTtpZighbGlzdC5sZW5ndGgpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0ibG9nLWVtcHR5Ij4nK0kud2FybisnPGJyPuivpeWIhuexu+S4i+aaguaXoOaXpeW/lzwvZGl2Pic7cmV0dXJufWVsLmlubmVySFRNTD1saXN0Lm1hcCgobG9nLGkpPT57Y29uc3QgdD1sb2cudHlwZXx8InNpZ25pbiI7Y29uc3QgdGFnPXQ9PT0idmVoaWNsZSI/JzxzcGFuIGNsYXNzPSJwaWxsIGFtYmVyIj7mjqfovaY8L3NwYW4+JzonPHNwYW4gY2xhc3M9InBpbGwgY3lhbiI+562+5YiwPC9zcGFuPic7bGV0IHJlcztpZih0PT09InZlaGljbGUiKXtyZXM9JzxzcGFuIGNsYXNzPSJsb2ctcmVzICcrKGxvZy5zdWNjZXNzPyIiOiJlcnIiKSsnIj4nKyhsb2cuYWN0aW9uVGV4dHx8Iui9pui+huaOp+WItiIpKycgJysobG9nLnN1Y2Nlc3M/IuaIkOWKnyI6IuWksei0pe+8miIrZXNjKGxvZy5tZXNzYWdlfHxsb2cuZXJyb3J8fCLmnKrnn6UiKSkrJzwvc3Bhbj4nfWVsc2V7cmVzPSc8c3BhbiBjbGFzcz0ibG9nLXJlcyAnKyhsb2cuc3VjY2Vzcz8iIjoiZXJyIikrJyI+JysobG9nLnN1Y2Nlc3M/IuaIkOWKnyArIitsb2cudG90YWxHYWluOiLlpLHotKU6ICIrKGxvZy5lcnJvcnx8IuacquefpSIpKSsnPC9zcGFuPid9Y29uc3Qgc3RlcHM9bG9nLnN0ZXBzPyhsb2cuc3RlcHMubWFwKHM9Pic8ZGl2PjxpPsK3PC9pPicrZXNjKHMpKyc8L2Rpdj4nKS5qb2luKCIiKSk6IiI7cmV0dXJuICc8ZGl2IGNsYXNzPSJsb2ctaXRlbSIgc3R5bGU9ImFuaW1hdGlvbi1kZWxheTonKyhpKjI1KSsnbXMiPjxkaXYgY2xhc3M9ImxvZy10aW1lIj4nK2VzYyhsb2cudGltZXx8IiIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJsb2ctbWFpbiI+Jyt0YWcrJzxzcGFuIGNsYXNzPSJsb2ctdXNlciI+Jytlc2MobG9nLnVzZXJOYW1lfHwiIikrJzwvc3Bhbj4nK3JlcysnPC9kaXY+Jysoc3RlcHM/JzxkaXYgY2xhc3M9ImxvZy1zdGVwcyI+JytzdGVwcysnPC9kaXY+JzoiIikrJzwvZGl2Pid9KS5qb2luKCIiKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzVUkoKXtjb25maXJtRGlhbG9nKCLmuIXnqbrml6Xlv5ciLCLlsIbliKDpmaTlhajpg6jov5DooYzml6Xlv5fvvIzmraTmk43kvZzkuI3lj6/mgaLlpI3jgIIiLCJjbGVhckxvZ3NOb3ciKX0KYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzTm93KCl7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5jbGVhckxvZ3MoKTtpZihvayl7dG9hc3QoIuaXpeW/l+W3sua4heepuiIsIm9rIik7cmVuZGVyTG9ncygpfWVsc2UgdG9hc3QoIua4heepuuWksei0pSIsImVyciIpfQoKLyogPT09PT09PT09PT09PT09PT0g6K6+572u6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBjZmdBY2NvdW50cz1bXTsKLyogPT09PT09PT09PT09PT09PT0gdjIuMTUuNiDova/ku7bniYjmnKzmo4DmtYsgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gY2hlY2tWZXJzaW9uKG1hbnVhbCl7CiAgY29uc3QgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2ZXJDaGVja0J0biIpOwogIGlmKGJ0bil7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLmo4DmtYvkuK3igKYifQogIGxldCBkPW51bGw7CiAgaWYoaXNEZW1vKCkpe2Q9e29rOnRydWUsZGVtbzp0cnVlLGN1cnJlbnQ6QVBQX1ZFUlNJT04ucmVwbGFjZSgvXnYvLCIiKSxoYXNVcGRhdGU6ZmFsc2UsbGF0ZXN0OntzY3JpcHQ6QVBQX1ZFUlNJT04ucmVwbGFjZSgvXnYvLCIiKX19fQogIGVsc2V7ZD1hd2FpdCBwcm94eUZldGNoKCIvYXBpL3ZlcnNpb24tY2hlY2siKyhtYW51YWw/Ij9mcmVzaD0xIjoiIikpO30KICBTVEFURS52ZXI9ZHx8bnVsbDsKICBpZihidG4pe2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuajgOafpeabtOaWsCJ9CiAgY29uc3QgZXg9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZlckV4dHJhIik7aWYoZXgpZXguaW5uZXJIVE1MPXZlckV4dHJhSHRtbCgpOwogIGlmKFNUQVRFLnZlciYmU1RBVEUudmVyLm9rJiZTVEFURS52ZXIuaGFzVXBkYXRlJiYhU1RBVEUudmVyLmRlbW8pewogICAgdG9hc3QoIuWPkeeOsOaWsOeJiOacrCB2IitTVEFURS52ZXIubGF0ZXN0LnNjcmlwdCsi77yI5b2T5YmNIHYiK1NUQVRFLnZlci5jdXJyZW50KyLvvInvvIzlj6/liLDjgIzorr7nva7jgI3mn6XnnIvmm7TmlrDmlrnlvI8iKTsKICB9ZWxzZSBpZihtYW51YWwpewogICAgdG9hc3QoU1RBVEUudmVyJiZTVEFURS52ZXIub2s/IuW3suaYr+acgOaWsOeJiOacrCB2IitTVEFURS52ZXIuY3VycmVudDooKFNUQVRFLnZlciYmU1RBVEUudmVyLmVycm9yKXx8IuajgOa1i+Wksei0pSIpLFNUQVRFLnZlciYmU1RBVEUudmVyLm9rPyJvayI6ImVyciIpOwogIH0KfQpmdW5jdGlvbiB2ZXJFeHRyYUh0bWwoKXsKICBjb25zdCB2PVNUQVRFLnZlcjsKICBpZighdilyZXR1cm4gJ+eCueOAjOajgOafpeabtOaWsOOAjeiOt+WPluacgOaWsOeJiOacrOS4juWQhOerr+aOqOiNkOeJiOacrCc7CiAgaWYoIXYub2spcmV0dXJuICfmo4DmtYvlpLHotKXvvJonK2VzYyh2LmVycm9yfHwi5pyq55+l6ZSZ6K+vIik7CiAgY29uc3QgTD12LmxhdGVzdHx8e307CiAgaWYoIXYuaGFzVXBkYXRlKXJldHVybiAn5bey5piv5pyA5paw54mI5pysIMK3IOiEmuacrCB2Jytlc2Modi5jdXJyZW50KSsodi5jYWNoZWQ/J++8iOacrOWcsOe8k+WtmO+8iSc6JycpOwogIHJldHVybiAnPHNwYW4gc3R5bGU9ImNvbG9yOnZhcigtLXdhcm4pO2ZvbnQtd2VpZ2h0OjYwMCI+5Y+R546w5paw54mI5pys77ya6ISa5pysIHYnK2VzYyhMLnNjcmlwdHx8IiIpKyfvvIjlvZPliY0gdicrZXNjKHYuY3VycmVudCkrJ++8iTwvc3Bhbj4nKwogICc8YnI+5o6o6I2Q54mI5pys77yaaU9TIEFwcCAnK2VzYyhMLmlvc3x8Ii0iKSsnIMK3IFdpbmRvd3MgJytlc2MoTC5wY3x8Ii0iKSsnIMK3IEFuZHJvaWQgJytlc2MoTC5hbmRyb2lkfHwiLSIpKwogIChMLm5vdGU/Jzxicj7mm7TmlrDlhoXlrrnvvJonK2VzYyhMLm5vdGUpOicnKSsKICAnPGJyPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQyKSI+5pu05paw5pa55byPPC9iPu+8mkxvb24gLyBTaGFkb3dyb2NrZXQgLyBTdXJnZSDmm7TmlrDmqKHlnZforqLpmIXljbPlj6/mi4nlj5bmnIDmlrDohJrmnKzvvJtpT1MgQXBw77yIVHJvbGxTdG9yZe+8ieS4jiBXaW5kb3dzIC8gQW5kcm9pZCDnq6/or7fph43mlrDkuIvovb3lr7nlupTlronoo4XljIXjgIInOwp9CmZ1bmN0aW9uIHJlbmRlckNmZygpewogIGlmKGlzUHJveHlNb2RlKCkmJmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik8MCYmIVNUQVRFLnBhbmVsTG9hZGVkKXsKICAgIGNvbnN0IGVsMD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUNmZyIpOwogICAgaWYoZWwwKWVsMC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CGPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5q2j5Zyo5LuO6ISa5pys5ZCO56uv5ZCM5q2l6LSm5Y+35LiO6YWN572u4oCmPC9kaXY+PC9kaXY+JzsKICAgIGVuc3VyZVBhbmVsRGF0YSgpLnRoZW4oKCk9PnJlbmRlckNmZygpKTsKICAgIHJldHVybjsKICB9CiAgY29uc3QgY2ZnPWdldENmZygpO2NmZ0FjY291bnRzPShpc1Byb3h5TW9kZSgpJiZTVEFURS5wYW5lbEFjY291bnRzP1NUQVRFLnBhbmVsQWNjb3VudHM6Z2V0QWNjb3VudHMoKSkubWFwKGE9Pih7dXNlck5hbWU6YS51c2VyTmFtZXx8IiIsdXNlcklkOmEudXNlcklkfHwiIix0b2tlbjpjbGVhblRva2VuKGEudG9rZW58fCIiKSxiYXJrS2V5OmEuYmFya0tleXx8IiJ9KSk7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VDZmciKTsKICBjb25zdCBhY2NSb3dzPWNmZ0FjY291bnRzLm1hcCgoYSxpZHgpPT4nPGRpdiBjbGFzcz0iYWNjLWVkaXQiIGRhdGEtaT0iJytpZHgrJyI+PGRpdiBjbGFzcz0iYWNjLWVkaXQtaGVhZCI+PHNwYW4gY2xhc3M9ImFjYy1lZGl0LXRpdGxlIj48c3BhbiBjbGFzcz0ibiI+JytTdHJpbmcoaWR4KzEpKyc8L3NwYW4+6LSm5Y+3ICcrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPjxzcGFuIGNsYXNzPSJhY3RzIj48YnV0dG9uIGNsYXNzPSJidG4gc20iIGlkPSJ1aWRCdG5fJytpZHgrJyIgb25jbGljaz0iZmV0Y2hVc2VySWRVSSgnK2lkeCsnKSI+6I635Y+WSUQ8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gc20gZGFuZ2VyIiBvbmNsaWNrPSJkZWxldGVBY2NvdW50VUkoJytpZHgrJykiPuWIoOmZpDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmb3JtLWdyaWQiPjxkaXYgY2xhc3M9ImYtaXRlbSI+PGxhYmVsPuaYteensDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfbmFtZV8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VyTmFtZSkrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiB2YWx1ZT0iJytlc2MoYS51c2VySWQpKyciIHBsYWNlaG9sZGVyPSLnlZnnqbrlj6/ngrnjgIzojrflj5ZJROOAjSIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW7vvIjnspjotLTljbPlj6/vvIzoh6rliqjljrvmjokgQmVhcmVyIOWJjee8gO+8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfdG9rZW5fJytpZHgrJyIgdmFsdWU9IicrZXNjKGEudG9rZW4pKyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiIHN0eWxlPSJmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxM3B4Ij48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD5CYXJrIOmAmuefpSBLZXnvvIjpgInloavvvIznrb7liLDmiJDlip/mjqjpgIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX2JhcmtfJytpZHgrJyIgdmFsdWU9IicrZXNjKGEuYmFya0tleSkrJyIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uiBodHRwczovL+Wfn+WQjS9LZXkiPjwvZGl2PjwvZGl2PicpLmpvaW4oIiIpOwogIGNvbnN0IGNvbW09Y2ZnLmNvbW11bml0eTsKICBjb25zdCBzdz0oaWQsbGFiZWwsc3ViLGNoZWNrZWQpPT4nPGxhYmVsIGNsYXNzPSJzd2l0Y2giPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9IicraWQrJyIgJysoY2hlY2tlZD8iY2hlY2tlZCI6IiIpKyc+PHNwYW4gY2xhc3M9InN3Ij48L3NwYW4+PHNwYW4gY2xhc3M9ImxibCI+JytsYWJlbCsnPC9zcGFuPjxzcGFuIGNsYXNzPSJzYyI+JytzdWIrJzwvc3Bhbj48L2xhYmVsPic7CiAgZWwuaW5uZXJIVE1MPQogICc8ZGl2IGNsYXNzPSJzZWN0aW9uLXRpdGxlIj4nK0kua2V5Kyforr7nva48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7miYvmnLrlj7fnmbvlvZU8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwonPGRpdiBjbGFzcz0iZm9ybS1ncmlkIj4nKwonPGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+5omL5py65Y+377yI5p6B5qC4IEFwcCDnu5Hlrprlj7fnoIHvvIk8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZWwiIGlkPSJwbF9waG9uZSIgcGxhY2Vob2xkZXI9IjExIOS9jeaJi+acuuWPtyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCic8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGxfY29kZSIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBzdHlsZT0iZm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTNweCI+PC9kaXY+JysKJzwvZGl2PicrCic8ZGl2IGNsYXNzPSJidG4tcm93Ij48YnV0dG9uIGNsYXNzPSJidG4gc20iIG9uY2xpY2s9InNlbmRTbXNDb2RlKCkiIGlkPSJwbF9zZW5kX2J0biI+6I635Y+W6aqM6K+B56CBPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InBob25lTG9naW5VSSgpIiBpZD0icGxfbG9naW5fYnRuIj7nmbvlvZXlubbmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj4nKwonPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+55So5omL5py65Y+3ICsg55+t5L+h6aqM6K+B56CB55m75b2V77yM6Ieq5Yqo6I635Y+WIFRva2VuIOS4jueUqOaIt0lE5bm25Yqg5YWl6LSm5Y+35YiX6KGo77yM55m75b2V5oiQ5Yqf5ZCO6Ieq5Yqo5L+d5a2Y5bm25Yi35paw6aG16Z2i44CCPGJyPsK3IOWwj+WPt+eZu+W9le+8muWPr+WkmuasoeeZu+W9leS4jeWQjOaJi+acuuWPt++8jOaMieWwj+WPt+mAkOS4qua3u+WKoOS4jueuoeeQhuOAgjxicj7CtyDmnI3liqHliLDmnJ8gLyDnu5Hlrprnu63otLnvvJrovabovobmmbrog73mnI3liqHliLDmnJ/jgIHmiJbpnIDopoHnu5Hlrprnu63otLnml7bvvIzph43mlrDnlKjmiYvmnLrlj7fnmbvlvZXljbPlj6/liLfmlrDmjojmnYPvvIzlhajnqIvml6DpnIDmipPljIXjgII8L2Rpdj4nKwonPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgZ3JlZW4iPjwvc3Bhbj7lrprml7bnrb7liLA8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogIHN3KCJhdXRvX3NpZ25pbiIsIuWumuaXtuetvuWIsCIsIuWIsOeCueiHquWKqOS4uuWFqOmDqOi0puWPt+etvuWIsCIsY2ZnLmF1dG9TaWduaW49PT10cnVlKSsKICBzdygidmVoaWNsZV9tb25pdG9yIiwi6L2m6L6G54q25oCB55uR5o6nIiwi5YWF5ruhL+emu+e6v+aXtuacrOWcsOmAmuefpeaPkOmGku+8iOaJk+W8gOmdouadv+aXtuajgOafpe+8iSIsY2ZnLnZlaGljbGVNb25pdG9yPT09dHJ1ZSkrCiAgc3coInZlaGljbGVfYWxlcnRfcHVzaCIsIui9pui+huaPkOmGkuaOqOmAgSIsIumch+WKqC/lv5jlhbPplIEv55S15rGg5ouU5Ye6L+S9jueUtemHj++8iOaJk+W8gOmdouadv+aXtuajgOafpeW5tuaOqOmAge+8iSIsY2ZnLnZlaGljbGVBbGVydFB1c2ghPT1mYWxzZSkrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPuetvuWIsOaXtumXtO+8iOavj+Wkqe+8jEhIOk1N77yJPC9sYWJlbD48aW5wdXQgdHlwZT0idGltZSIgaWQ9ImNmZ19zaWduaW5fdGltZSIgdmFsdWU9IicrZXNjKGNmZy5hdXRvU2lnbmluVGltZXx8IjA3OjAwIikrJyIgc3R5bGU9ImZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjEzcHgiPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuS7o+eQhuiEmuacrOaXoOW4uOmpu+WQjuWPsO+8jOmHh+eUqOOAjOaJk+W8gOihpeetvuOAjeacuuWItu+8muW8gOWQr+WQju+8jOavj+WkqemmluasoeaJk+W8gOmdouadv+S4lOW3sui/h+iuvuWumuaXtumXtOaXtu+8jOiHquWKqOS4uuWFqOmDqOi0puWPt+aJp+ihjOS4gOasoeetvuWIsO+8iOWGmeaXpeW/l+OAgeaOqCBCYXJr77yM5LiO5omL5Yqo562+5Yiw5LiA6Ie077yJ77yM5ZCM5LiA5aSp5Y+q5omn6KGM5LiA5qyh44CC6aaW6aG144CM56uL5Y2z562+5Yiw44CN5oKs5rWu5oyJ6ZKu5Y+v6ZqP5pe25omL5Yqo5omn6KGM44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIgYW1iZXIiPjwvc3Bhbj7npL7ljLrku7vliqHlvIDlhbM8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij48ZGl2IGNsYXNzPSJmb3JtLWdyaWQiIHN0eWxlPSJnYXA6OHB4Ij4nKwogIHN3KCJjb21tX3Bvc3QiLCLlj5HluIPliqjmgIEiLCIrMSDliIYiLGNvbW0uZW5hYmxlUG9zdCE9PWZhbHNlKStzdygiY29tbV9saWtlIiwi54K56LWe5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZUxpa2UhPT1mYWxzZSkrc3coImNvbW1fY29tbWVudCIsIuivhOiuuuWKqOaAgSIsIuS4jeWKoOWIhiIsY29tbS5lbmFibGVDb21tZW50IT09ZmFsc2UpK3N3KCJjb21tX3NoYXJlIiwi5YiG5Lqr5Yqo5oCBIiwiKzEg5YiGIixjb21tLmVuYWJsZVNoYXJlIT09ZmFsc2UpK3N3KCJjb21tX2RlbGV0ZSIsIuaJp+ihjOWQjuWIoOmZpOWKqOaAgSIsIua4heeQhueXlei/uSIsY29tbS5lbmFibGVEZWxldGUhPT1mYWxzZSkrCiAgJzwvZGl2PjxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWFs+mXreWvueW6lOW8gOWFs+WQju+8jOetvuWIsOiEmuacrOWwhui3s+i/h+ivpeS7u+WKoeOAguS/ruaUueWQjueCueWHu+mhtemdouW6lemDqOOAjOS/neWtmOmFjee9ruOAjeeUn+aViOOAgjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGdyZWVuIj48L3NwYW4+6LSm5Y+3566h55CG77yIJytjZmdBY2NvdW50cy5sZW5ndGgrJyDkuKrvvIk8L2gzPjxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJhZGRBY2NvdW50VUkoKSI+KyDmt7vliqDotKblj7c8L2J1dHRvbj48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgaWQ9ImFjY0xpc3QiPicrKGFjY1Jvd3N8fCc8ZGl2IHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjIycHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHgiPuaaguaXoOi0puWPt++8jOeCueWHu+OAjOa3u+WKoOi0puWPt+OAjTwvZGl2PicpKyc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmctdG9wOjAiPjxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJzYXZlQWNjb3VudHNVSSgpIj7kv53lrZjmnoHmoLjotKblj7c8L2J1dHRvbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctbm90ZSI+PGI+5L2/55So6K+05piOPC9iPjxicj7CtyBUb2tlbu+8mueymOi0tOaKk+WMheW+l+WIsOeahCBBdXRob3JpemF0aW9uIOWAvOWNs+WPr++8jOiHquWKqOWOu+aOiSA8Y29kZT5CZWFyZXIgPC9jb2RlPiDliY3nvIDjgII8YnI+wrcg6I635Y+WSUTvvJrloavlhaUgVG9rZW4g5ZCO54K544CM6I635Y+WSUTjgI3vvIzoh6rliqjku44gSDUgYmFzZUluZm8gLyBBcHAgc2V0dGluZyAvIOi9pui+huWIl+ihqOaOpeWPo+ino+aekOeUqOaIt0lE5LiO5pi156ew44CCPGJyPsK3IEJhcmsgS2V577ya6K+l6LSm5Y+3562+5Yiw5oiQ5Yqf5ZCO5o6o6YCB6YCa55+l77yM55WZ56m65LiN5o6o44CCPGJyPsK3IOaOp+i9puaMh+S7pO+8iOWvu+i9pi/puKPnrJsv5Z2Q5Z6rL+W8gOWFs+mUge+8ieS8muecn+WunuaTjeS9nOi9pui+hu+8jOmcgOS6jOasoeehruiupOOAgjwvZGl2PjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5aSH5Lu96LSm5Y+36YWN572uPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSI+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9ImV4cG9ydEJhY2t1cFVJKCkiPuS4gOmUruWvvOWHuuWkh+S7vTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0iY29weUJhY2t1cFVJKCkiPuWkjeWItuWkh+S7vTwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGxhYmVsPuWkh+S7veWGheWuue+8iOWMheWQq+WFqOmDqOi0puWPt+S4jumdouadv+mFjee9ru+8jOWPr+WkjeWItuS/neWtmO+8iTwvbGFiZWw+PHRleHRhcmVhIGlkPSJiYWNrdXBBcmVhIiByb3dzPSI0IiByZWFkb25seSBwbGFjZWhvbGRlcj0i54K55Ye744CM5LiA6ZSu5a+85Ye65aSH5Lu944CN55Sf5oiQ4oCmIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMXB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLG1vbm9zcGFjZTtmb250LXNpemU6MTFweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvdGV4dGFyZWE+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij48bGFiZWw+5oGi5aSN5aSH5Lu977yI57KY6LS05aSH5Lu9IEpTT04g5ZCO54K55oGi5aSN77yM5bCG6KaG55uW546w5pyJ6LSm5Y+35LiO6YWN572u77yJPC9sYWJlbD48dGV4dGFyZWEgaWQ9ImltcG9ydEFyZWEiIHJvd3M9IjQiIHBsYWNlaG9sZGVyPSLnspjotLTlpIfku70gSlNPTuKApiIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Ym94LXNpemluZzpib3JkZXItYm94Ij48L3RleHRhcmVhPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxidXR0b24gY2xhc3M9ImJ0biBkYW5nZXIiIG9uY2xpY2s9ImltcG9ydEJhY2t1cFVJKCkiPuaBouWkjeWkh+S7vTwvYnV0dG9uPjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWkh+S7veWMheWQq+WFqOmDqOi0puWPt++8iOaYteensC/nlKjmiLdJRC9Ub2tlbi9CYXJrS2V577yJ5LiO6Z2i5p2/6YWN572u77yI562+5ZCN5a+G6ZKlL+ekvuWMuuS7u+WKoeW8gOWFsy/oh6rliqjliLfmlrDnrYnvvInjgILmjaLmnLrmiJbph43oo4XlkI7nspjotLTljbPlj6/kuIDplK7ov5jljp/vvIzml6DpnIDph43mlrDmipPljIXloavlhpnjgII8L2Rpdj4nKwogICc8L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciB2aW8iPjwvc3Bhbj7lsI/nu4Tku7bmmL7npLrovabovoY8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7otKblj7c8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF9hY2MiIHN0eWxlPSJ3aWR0aDoxMDAlO3BhZGRpbmc6MTBweCAxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjE0cHgiIG9uY2hhbmdlPSJ3aWRnZXRBY2NDaGFuZ2VkKCkiPicrd2lkZ2V0QWNjT3B0aW9ucygpKyAnPC9zZWxlY3Q+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+6L2m6L6GPC9sYWJlbD48c2VsZWN0IGlkPSJ3aWRnZXRfdmVoIiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4Ij48L3NlbGVjdD48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJmLWl0ZW0iIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7lsI/nu4Tku7blrZflj7c8L2xhYmVsPjxzZWxlY3QgaWQ9IndpZGdldF9mb250IiBzdHlsZT0id2lkdGg6MTAwJTtwYWRkaW5nOjEwcHggMTJweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNHB4Ij48b3B0aW9uIHZhbHVlPSIxIj7moIflh4Y8L29wdGlvbj48b3B0aW9uIHZhbHVlPSIxLjE1Ij7lpKflj7c8L29wdGlvbj48b3B0aW9uIHZhbHVlPSIxLjMiPueJueWkpzwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumAieaLqeWQju+8jGlPUyDmoYzpnaLlsI/nu4Tku7blsIblsZXnpLror6XovabovobnmoTlrp7ml7bnirbmgIHvvIjnlLXph48v57ut6IiqL+WFheeUtS/nrb7liLDvvInjgII8Yj7kuI3pgInmi6nml7bpu5jorqTlj5bnrKzkuIDkuKrotKblj7fnmoTnrKzkuIDovobovabjgII8L2I+5L+d5a2Y6YWN572u5ZCO55Sf5pWI44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIj48ZGl2IGNsYXNzPSJjZmctaGVhZCI+PGgzPjxzcGFuIGNsYXNzPSJiYXIiPjwvc3Bhbj7ovabovoblm77niYfmm7/mjaI8L2gzPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ibG9hZFBpY1Jvd3MoKSI+5Yi35paw6L2m6L6GPC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz0iY2ZnLWJvZHkiIGlkPSJwaWNMaXN0Ij48ZGl2IHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjE4cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEzcHgiPuWKoOi9veS4reKApjwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImNmZy1ib2R5IiBzdHlsZT0icGFkZGluZy10b3A6MCI+PGRpdiBjbGFzcz0iYnRuLXJvdyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVQaWNDZmcoKSI+5L+d5a2Y5Zu+54mH5pu/5o2iPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+5Li65q+P6L6G6L2m6YCJ5oup5a6Y5pa56L2m5Z6L5Zu+77yI5ZCrIDxiPkFFNWkg55S16L275pGp54mIPC9iPuWbm+enjemFjeiJsu+8ieOAguS/neWtmOWQjuWcqCA8Yj5Mb29uL+S7o+eQhuiEmuacrOeOr+WigzwvYj7kuIvvvIzlrpjmlrkgQXBwIOS4jumdouadv+mHjOeahOivpei9pui+hueFp+eJh+WNs+iiq+abv+aNou+8iOmcgOmdouadv+iEmuacrOWkhOS6jui/kOihjOeKtuaAge+8ie+8m+mAieOAjOS4jeabv+aNouOAjeaBouWkjeWumOaWueWOn+WbvuOAgua1j+iniOWZqOebtOW8gOaooeW8j+S7heS/neWtmOmFjee9ruOAgeS4jeaUueWGmSBBcHDjgII8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJjZmctcGFuZWwiPjxkaXYgY2xhc3M9ImNmZy1oZWFkIj48aDM+PHNwYW4gY2xhc3M9ImJhciI+PC9zcGFuPuWkluingiDCtyAzRCDovabmqKHkuI7lo4Hnurg8L2gzPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKSIgaWQ9IndwTW9kZVRpcCI+6K+75Y+W5Lit4oCmPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9ImNmZy1ib2R5Ij4nKwogICc8bGFiZWwgY2xhc3M9InN3aXRjaCI+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0iZzNkX3RvZ2dsZSIgJysoZzNkRW5hYmxlZCgpPyJjaGVja2VkIjoiIikrJyBvbmNoYW5nZT0iZzNkVG9nZ2xlKHRoaXMuY2hlY2tlZCkiPjxzcGFuIGNsYXNzPSJzdyI+PC9zcGFuPjxzcGFuIGNsYXNzPSJsYmwiPummlumhtSAzRCDovabmqKE8L3NwYW4+PHNwYW4gY2xhc3M9InNjIj7lj6/mi5bliqjml4vovazvvIzlhbPpl63lj6/nnIHnlLU8L3NwYW4+PC9sYWJlbD4nKwogICc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij7lo4HnurjpooTorr48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ3cC1yb3ciIGlkPSJ3cFByZXNldHMiPicrV2FsbHBhcGVyTWdyLnByZXNldHMubWFwKGZ1bmN0aW9uKHApe3JldHVybiAnPGJ1dHRvbiBjbGFzcz0id3AtY2hpcCIgZGF0YS1pZD0iJytwLmlkKyciIG9uY2xpY2s9IldhbGxwYXBlck1nci5wcmVzZXQoXCcnK3AuaWQrJ1wnKSI+Jytlc2MocC5uYW1lKSsnPC9idXR0b24+J30pLmpvaW4oIiIpKyc8L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ3cC1yb3ciPjxsYWJlbCBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIHN0eWxlPSJkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2N1cnNvcjpwb2ludGVyIj7pgInmi6nlm77niYc8aW5wdXQgdHlwZT0iZmlsZSIgYWNjZXB0PSJpbWFnZS8qIiBzdHlsZT0iZGlzcGxheTpub25lIiBvbmNoYW5nZT0iV2FsbHBhcGVyTWdyLnBpY2sodGhpcykiPjwvbGFiZWw+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJXYWxscGFwZXJNZ3IuY2xlYXIoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0id3Atcm93Ij48ZGl2IGlkPSJ3cFByZXZpZXciIGNsYXNzPSJ3cC1wcmV2aWV3Ij7mnKrorr7nva48L2Rpdj48ZGl2IHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjE4MHB4Ij4nKwogICc8ZGl2IGNsYXNzPSJ3cC1zbGlkZXIiPjxzcGFuPuaooeezijwvc3Bhbj48aW5wdXQgdHlwZT0icmFuZ2UiIGlkPSJ3cF9ibHVyIiBtaW49IjAiIG1heD0iMjQiIHN0ZXA9IjEiIG9uaW5wdXQ9IldhbGxwYXBlck1nci5zZXRCbHVyKHRoaXMudmFsdWUpIj48c3BhbiBjbGFzcz0idiIgaWQ9IndwX2JsdXJfdiI+MTBweDwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGNsYXNzPSJ3cC1zbGlkZXIiPjxzcGFuPuaal+WMljwvc3Bhbj48aW5wdXQgdHlwZT0icmFuZ2UiIGlkPSJ3cF9kaW0iIG1pbj0iMCIgbWF4PSI4MCIgc3RlcD0iMSIgb25pbnB1dD0iV2FsbHBhcGVyTWdyLnNldERpbSh0aGlzLnZhbHVlKSI+PHNwYW4gY2xhc3M9InYiIGlkPSJ3cF9kaW1fdiI+MzQlPC9zcGFuPjwvZGl2PicrCiAgJzwvZGl2PjwvZGl2PicrCiAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPuWFqOWxj+Wjgee6uOWbuuWumumTuua7oeaVtOS4qumhtemdouW5tuWeq+WcqOWNoeeJh+S4i+aWueOAguiHquWumuS5ieWbvueJh+S8muiHquWKqOWOi+e8qeWIsCAyNDAwcHgg5YaF44CB5L+d5a2Y5Zyo5pys5py65rWP6KeI5Zmo5pWw5o2u5bqT77yISW5kZXhlZERC77yJ77yM5LiN5YaZ5YWl6YWN572u5aSH5Lu977yb5o2i6K6+5aSH6ZyA6YeN5paw6YCJ5oup44CCPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAvLyB2Mi4xNC4yMSDliKDpmaTjgIzovabmjqfpo47pmannoa7orqTjgI3pnaLmnb/vvJrmlLnkuLrpppbmrKHkvb/nlKjovabmjqflip/og73ml7blvLnnqpfnoa7orqTvvIjlkIzmhI8v5LiN5ZCM5oSP77yJCiAgJzxkaXYgY2xhc3M9ImNmZy1wYW5lbCI+PGRpdiBjbGFzcz0iY2ZnLWhlYWQiPjxoMz48c3BhbiBjbGFzcz0iYmFyIGFtYmVyIj48L3NwYW4+5b2T5YmN5a6J6KOF5L+h5oGvPC9oMz48L2Rpdj48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuOTtjb2xvcjp2YXIoLS10eHQyKSIgaWQ9Imluc3RhbGxJbmZvIj4nKwogICc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+5q2j5Zyo5qOA5rWL5a6J6KOF5pa55byP4oCmPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Im1hcmdpbjoxNHB4IDJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InNhdmVDZmdVSSgpIj7kv53lrZjphY3nva48L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4iIG9uY2xpY2s9InJlc2V0Q2ZnVUkoKSI+5oGi5aSN6buY6K6kPC9idXR0b24+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iY2ZnLXBhbmVsIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48ZGl2IGNsYXNzPSJjZmctYm9keSIgc3R5bGU9InBhZGRpbmc6NHB4IDAiPicrCiAgJzxhIGhyZWY9Im1haWx0bzptbGluazc5OEBvdXRsb29rLmNvbSIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7inInvuI88L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+bWxpbms3OThAb3V0bG9vay5jb208L3NwYW4+PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGEgaHJlZj0iaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPIiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7irZA8L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjYwMCI+R2l0SHViIOS7k+W6kzwvc3Bhbj48L3NwYW4+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxM3B4O2NvbG9yOnZhcigtLXR4dDMpIj5jbHVjazc5OC9aRUVITzwvc3Bhbj48L2E+JysKICAnPGRpdiBzdHlsZT0iaGVpZ2h0OjFweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO21hcmdpbjowIDE2cHgiPjwvZGl2PicrCiAgJzxhIGhyZWY9Imh0dHBzOi8vYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4IiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47cGFkZGluZzoxMnB4IDE2cHg7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6dmFyKC0tYnJhbmQpIj48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweCI+PHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxNnB4Ij7wn5KXPC9zcGFuPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTRweDtmb250LXdlaWdodDo2MDAiPueIseWPkeeUtSDCtyDmlK/mjIHkvZzogIU8L3NwYW4+PC9zcGFuPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQzKSI+YWZkaWFuLmNvbS9hL2x1Y2t5Nzk4PC9zcGFuPjwvYT4nKwogICc8ZGl2IHN0eWxlPSJoZWlnaHQ6MXB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7bWFyZ2luOjAgMTZweCI+PC9kaXY+JysKICAnPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEycHggMTZweCI+PHNwYW4gc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHgiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTZweCI+8J+Tizwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjE0cHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOnZhcigtLXR4dDIpIj7niYjmnKwgLyDmm7TmlrDmo4DmtYs8L3NwYW4+PC9zcGFuPjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHgiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTNweDtjb2xvcjp2YXIoLS10eHQzKSI+JytBUFBfVkVSU0lPTisnPC9zcGFuPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgaWQ9InZlckNoZWNrQnRuIiBvbmNsaWNrPSJjaGVja1ZlcnNpb24odHJ1ZSkiPuajgOafpeabtOaWsDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nKwogICc8ZGl2IGlkPSJ2ZXJFeHRyYSIgc3R5bGU9InBhZGRpbmc6MCAxNnB4IDEycHg7Zm9udC1zaXplOjEycHg7bGluZS1oZWlnaHQ6MS43NTtjb2xvcjp2YXIoLS10eHQzKSI+Jyt2ZXJFeHRyYUh0bWwoKSsnPC9kaXY+JysKICAnPC9kaXY+PC9kaXY+JysKICAnPGRpdiBjbGFzcz0iZm9vdCI+5p6B5qC4IFpFRUhPIOmdouadvyAnK0FQUF9WRVJTSU9OKycgwrcgJysoaXNQcm94eU1vZGUoKT8n6LSm5Y+35LiO5a+G6ZKl5a2Y5YKo5LqO6ISa5pys5ZCO56uv77yI5pys5py65oyB5LmF5YyW77yJJzon5pWw5o2u5a2Y5YKo5LqO5pys5py65rWP6KeI5ZmoIGxvY2FsU3RvcmFnZScpKyc8YnI+PGEgY2xhc3M9ImxpbmsiIGhyZWY9Imh0dHBzOi8vYWZkaWFuLmNvbS9hL2x1Y2t5Nzk4IiB0YXJnZXQ9Il9ibGFuayIgcmVsPSJub29wZW5lciI+54ix5Y+R55S1IMK3IGFmZGlhbi5jb20vYS9sdWNreTc5ODwvYT48L2Rpdj4nOwogIC8vIOWwj+e7hOS7tui9pui+huS4i+aLieWIneWni+WMlu+8iOWbnuWhq+W3suS/neWtmOeahOmAieaLqe+8iQogIGNvbnN0IHdzZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndpZGdldF9hY2MiKTsKICBpZih3c2VsKXsKICAgIGNvbnN0IGN1cj1nZXRDZmcoKS53aWRnZXRWZWhpY2xlO2xldCBjdXJVaWQ9IiIsY3VyVmluPSIiOwogICAgaWYoY3VyKXtjb25zdCBwPWN1ci5zcGxpdCgifCIpO2N1clVpZD1wWzBdfHwiIjtjdXJWaW49cFsxXXx8IiI7fQogICAgaWYoY3VyVWlkKXdzZWwudmFsdWU9Y3VyVWlkOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndpZGdldF92ZWgiKS5pbm5lckhUTUw9d2lkZ2V0VmVoT3B0aW9ucyh3c2VsLnZhbHVlfHwiIik7CiAgICBpZihjdXJWaW4pe2NvbnN0IHZzZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIndpZGdldF92ZWgiKTtmb3IobGV0IGk9MDtpPHZzZWwub3B0aW9ucy5sZW5ndGg7aSsrKXtpZih2c2VsLm9wdGlvbnNbaV0udmFsdWU9PT1jdXJWaW4pe3ZzZWwuc2VsZWN0ZWRJbmRleD1pO2JyZWFrfX19CiAgfQogIGNvbnN0IHdmU2VsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ3aWRnZXRfZm9udCIpOwogIGlmKHdmU2VsKXdmU2VsLnZhbHVlPVN0cmluZyhnZXRDZmcoKS53aWRnZXRGb250fHwxKTsKICAvLyDog4zmma/pooTop4jlm57loasKICBjb25zdCBicD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiYmdQcmV2aWV3Iik7CiAgaWYoYnApe2NvbnN0IGJnPWdldENmZygpLmN1c3RvbUJnO2lmKGJnKXticC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2U9InVybCgiK2JnKyIpIjticC50ZXh0Q29udGVudD0iIjt9fQogIGxvYWRQaWNDZmcoKTsKICByZW5kZXJJbnN0YWxsSW5mbygpOwogIFdhbGxwYXBlck1nci5zeW5jVUkoKTsKfQovKiA9PT09PT09PT09PT09PT09PSDlvZPliY3lronoo4Xkv6Hmga8gPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gaW5zdGFsbEVudk5hbWUoKXsKICBpZihpc0RlbW8oKSlyZXR1cm4gIua8lOekuuaooeW8j++8iOekuuS+i+aVsOaNru+8iSI7CiAgY29uc3QgcD0odHlwZW9mIGxvY2F0aW9uIT09InVuZGVmaW5lZCImJmxvY2F0aW9uLnByb3RvY29sKXx8IiI7CiAgaWYocD09PSJ6ZWVobzoiKXJldHVybiAiaU9TIEFwcO+8iOaegeaguOetvuWIsOmdouadv++8iSI7CiAgaWYodHlwZW9mIG5hdmlnYXRvciE9PSJ1bmRlZmluZWQiJiYvRWxlY3Ryb24vaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnR8fCIiKSlyZXR1cm4gIuahjOmdoueJiO+8iFdpbmRvd3PvvIkiOwogIGlmKGlzUHJveHlNb2RlKCkpcmV0dXJuICLku6PnkIbohJrmnKwiOwogIHJldHVybiAi5rWP6KeI5ZmoIjsKfQphc3luYyBmdW5jdGlvbiByZW5kZXJJbnN0YWxsSW5mbygpewogIGNvbnN0IGJveD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW5zdGFsbEluZm8iKTsKICBsZXQgaHRtbD0nPGRpdiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHgiPjxiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQpIj7ov5DooYznjq/looPvvJo8L2I+JytpbnN0YWxsRW52TmFtZSgpKyc8L2Rpdj4nOwogIC8vIOWOn+eUn+ahpeaOpeiHquajgO+8muihjOi9puiusOW9leS7quahpeeUseWOn+eUn+azqOWFpe+8jOe8uuWkseaXtuWvueW6lOWKn+iDveS4jeWPr+eUqAogIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjhweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuWOn+eUn+ahpeaOpe+8mjwvYj7orrDlvZXku6ogJysoKHR5cGVvZiBkYXNoY2FtSGFuZGxlcj09PSJmdW5jdGlvbiIpPyfinJMg5Y+v55SoJzon4pyXIOacquazqOWFpScpKyc8L2Rpdj4nOwogIGxldCBpbmZvPW51bGw7CiAgdHJ5e2luZm89YXdhaXQgQmFja2VuZC5pbnN0YWxsSW5mbygpO31jYXRjaChlKXtpbmZvPW51bGx9CiAgaWYoIWluZm98fCFpbmZvLmlvcyl7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuetvuWQjeaWueW8j+S7heaUr+aMgSBpT1MgQXBwIOWGheafpeeci++8iOivu+WPluW9k+WJjeWuieijheWMheeahOetvuWQjeaPj+i/sOaWh+S7tu+8ieOAgjwvZGl2Pic7CiAgfSBlbHNlIHsKICAgIGNvbnN0IG09aW5mby5zaWduTWV0aG9kfHwidW5rbm93biI7CiAgICBjb25zdCBsYWJlbD17dHJvbGxzdG9yZToi5beo6a2UIFRyb2xsU3RvcmXvvIjmsLjkuYXnrb7lkI3vvIkiLGVudGVycHJpc2U6IuS8geS4muetvuWQje+8iOWIhuWPke+8iSIsc2lkZWxvYWQ6IuS4quS6uuiHquetvu+8iDcg5aSp5pyJ5pWI5pyf77yJIixkZXZlbG9wZXI6IuW8gOWPkeiAhSAvIFRlc3RGbGlnaHTvvIjplb/mnJ/vvIkiLHVua25vd246IuaXoOazleehruWumiJ9W21dfHwi5peg5rOV56Gu5a6aIjsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuWuieijheaWueW8j++8mjwvYj4nK2xhYmVsKyc8L2Rpdj4nOwogICAgaWYoaW5mby5leHBpcmF0aW9uKXsKICAgICAgbGV0IGV4dHJhPSIiOwogICAgICBpZih0eXBlb2YgaW5mby5kYXlzUmVtYWluPT09Im51bWJlciImJmlzRmluaXRlKGluZm8uZGF5c1JlbWFpbikmJmluZm8uZGF5c1JlbWFpbj49MClleHRyYT0n77yI5Ymp5L2Z57qmICcraW5mby5kYXlzUmVtYWluKycg5aSp77yJJzsKICAgICAgaHRtbCs9JzxkaXYgc3R5bGU9Im1hcmdpbi1ib3R0b206NnB4Ij48YiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0KSI+562+5ZCN5pyJ5pWI5pyf6Iez77yaPC9iPicrZXNjKFN0cmluZyhpbmZvLmV4cGlyYXRpb24pLnJlcGxhY2UoIlQiLCIgIikucmVwbGFjZSgiWiIsIiIpKSsnICcrZXh0cmErJzwvZGl2Pic7CiAgICB9CiAgICBpZihpbmZvLnRlYW1OYW1lfHxpbmZvLnRlYW1JZCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjZweCI+PGIgc3R5bGU9ImNvbG9yOnZhcigtLXR4dCkiPuetvuWQjeWboumYn++8mjwvYj4nK2VzYyhpbmZvLnRlYW1OYW1lfHxpbmZvLnRlYW1JZCkrJzwvZGl2Pic7CiAgICB9CiAgICBpZihtPT09InNpZGVsb2FkIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5Liq5Lq66Ieq562+IDcg5aSp5Yiw5pyf5ZCO77yM6ZyA6L+e5o6l55S16ISR55SoIEFsdFN0b3JlIC8gU2lkZWxvYWRseSDph43mlrDnrb7lkI3vvJvlu7rorq7mlLnnlKjlt6jprZQgVHJvbGxTdG9yZSDmsLjkuYXnrb7lkI3jgII8L2Rpdj4nO30KICAgIGVsc2UgaWYobT09PSJlbnRlcnByaXNlIil7aHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjZweCI+5aaC6YGH44CM5pyq5Y+X5L+h5Lu755qE5byA5Y+R6ICF44CN77yM6K+35ZyoIOiuvue9riDihpIg6YCa55SoIOKGkiBWUE7kuI7orr7lpIfnrqHnkIYg5L+h5Lu75a+55bqU5LyB5Lia6K+B5Lmm44CCPC9kaXY+Jzt9CiAgICBlbHNlIGlmKG09PT0idHJvbGxzdG9yZSIpe2h0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo2cHgiPuW3sumAmui/hyBUcm9sbFN0b3JlIOWuieijhe+8jOawuOS5heacieaViOOAgeS4jeaAleaOieetvu+8jOaXoOmcgOeUteiEkee7reetvuOAgjwvZGl2Pic7fQogIH0KICBpZihib3gpYm94LmlubmVySFRNTD1odG1sOwp9Ci8qID09PT09PT09PT09PT09PT09IOWwj+e7hOS7tui9pui+humAieaLqSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiB3aWRnZXRBY2NPcHRpb25zKCl7CiAgY29uc3QgbGlzdD1TVEFURS5kYXRhfHxbXTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuICc8b3B0aW9uIHZhbHVlPSIiPuaaguaXoOi0puWPt+aVsOaNru+8iOivt+WFiOWcqOmmlumhteWIt+aWsOWKoOi9ve+8iTwvb3B0aW9uPic7CiAgcmV0dXJuIGxpc3QubWFwKChhLGkpPT57CiAgICBjb25zdCBubT1lc2MoKGEudmVoaWNsZSYmKGEudmVoaWNsZS52ZWhpY2xlTmFtZXx8YS52ZWhpY2xlLnZlaGljbGVUeXBlKSl8fGEudXNlck5hbWV8fCgi6LSm5Y+3IisoaSsxKSkpOwogICAgcmV0dXJuICc8b3B0aW9uIHZhbHVlPSInK2VzYyhhLnVzZXJJZHx8IiIpKyciIGRhdGEtaT0iJytpKyciPicrbm0rJzwvb3B0aW9uPic7CiAgfSkuam9pbigiIik7Cn0KZnVuY3Rpb24gd2lkZ2V0VmVoT3B0aW9ucyh1aWQpewogIGNvbnN0IGxpc3Q9U1RBVEUuZGF0YXx8W107CiAgY29uc3QgYT1saXN0LmZpbmQoeD0+U3RyaW5nKHgudXNlcklkfHwiIik9PT1TdHJpbmcodWlkKSk7CiAgaWYoIWF8fCFhLnZlaGljbGV8fCFhLnZlaGljbGUuaGFzVmVoaWNsZSlyZXR1cm4gJzxvcHRpb24gdmFsdWU9IiI+6K+l6LSm5Y+35pqC5peg57uR5a6a6L2m6L6GPC9vcHRpb24+JzsKICBjb25zdCB2PWEudmVoaWNsZTsKICBjb25zdCBhcnI9KEFycmF5LmlzQXJyYXkodi52ZWhpY2xlcykmJnYudmVoaWNsZXMubGVuZ3RoKT92LnZlaGljbGVzLm1hcCh4PT4oe25hbWU6eC52ZWhpY2xlVHlwZXx8eC5uYW1lfHx4LnZpbk5vLHZpbjp4LnZpbk5vfSkpOlt7bmFtZTp2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lfHx2LnZpbk5vLHZpbjp2LnZpbk5vfV07CiAgcmV0dXJuIGFyci5tYXAoeD0+JzxvcHRpb24gdmFsdWU9IicrZXNjKHgudmluKSsnIj4nK2VzYyh4Lm5hbWUpKyc8L29wdGlvbj4nKS5qb2luKCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRBY2NDaGFuZ2VkKCl7CiAgY29uc3Qgc2VsPWVsKCJ3aWRnZXRfYWNjIik7aWYoIXNlbClyZXR1cm47CiAgZWwoIndpZGdldF92ZWgiKS5pbm5lckhUTUw9d2lkZ2V0VmVoT3B0aW9ucyhzZWwudmFsdWV8fCIiKTsKfQpmdW5jdGlvbiB3aWRnZXRTZWxlY3Rpb25UZXh0KCl7CiAgY29uc3QgYWNjPWVsKCJ3aWRnZXRfYWNjIiksdmVoPWVsKCJ3aWRnZXRfdmVoIik7CiAgaWYoIWFjY3x8IXZlaHx8IWFjYy52YWx1ZXx8IXZlaC52YWx1ZSlyZXR1cm4gIiI7CiAgcmV0dXJuIGFjYy52YWx1ZSsifCIrdmVoLnZhbHVlOwp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE2Ljkg6L2m6L6G5Zu+54mH5pu/5o2iID09PT09PT09PT09PT09PT09ICovCmNvbnN0IFBJQ19DQVRBTE9HPVt7bjoi5LiN5pu/5o2i77yI5a6Y5pa55Y6f5Zu+77yJIix1OiIifSx7bjoiQUU1aSDnlLXovbvmkakgwrcg5pif5YWJ6buRIix1OiJodHRwczovL2FrYS5kb3ViYW9jZG4uY29tL3MvTGJIemZDSnE1WSJ9LHtuOiJBRTVpIOeUtei9u+aRqSDCtyDpgJ/mhJ/ngbAiLHU6Imh0dHBzOi8vYWthLmRvdWJhb2Nkbi5jb20vcy9velJLSWNhU1pHIn0se246IkFFNWkg55S16L275pGpIMK3IOaYn+WFieeZvSIsdToiaHR0cHM6Ly9ha2EuZG91YmFvY2RuLmNvbS9zL041ZDlBM21zUFkifSx7bjoiQUU1aSDnlLXovbvmkakgwrcg5p6B5qC45qmZIix1OiJodHRwczovL2FrYS5kb3ViYW9jZG4uY29tL3MvUnNWRFZHTUl2RiJ9LHtuOiJBRTVpIFBybyDlrpjmlrkgwrcg54GwIix1OiJodHRwczovL29zcy1jZm1vdG8uemVlaG9ldi5jb20vdXBsb2Fkcy96ZWVoby1jbGllbnQtcGMvbWVkaWEvMTc1ODE3MjY0MTY4NC5wbmcifSx7bjoiQUU1aSBQcm8gTWF4IOWumOaWuSDCtyDnmb0iLHU6Imh0dHBzOi8vb3NzLWNmbW90by56ZWVob2V2LmNvbS91cGxvYWRzL3plZWhvLWNsaWVudC1wYy9tZWRpYS8xNzU4MTcyNjMwODU3LnBuZyJ9LHtuOiJBRTggUysgTVkyNSDlrpjmlrkiLHU6Imh0dHBzOi8vb3NzLWNmbW90by56ZWVob2V2LmNvbS91cGxvYWRzL3plZWhvLWNsaWVudC1wYy9tZWRpYS8xNzg0NjI2Njc4MjIyLnBuZyJ9XTsKbGV0IFBJQ19DRkc9e307CmZ1bmN0aW9uIHBpY0tub3duKHUpe3JldHVybiBQSUNfQ0FUQUxPRy5zb21lKG89Pm8udSYmby51PT09dSl9CmZ1bmN0aW9uIHBpY1Jvdyh2aW4sbmFtZSxhY2MpewogIGNvbnN0IGN1cj1QSUNfQ0ZHW3Zpbl18fCIiOwogIGNvbnN0IG9wdHM9UElDX0NBVEFMT0cubWFwKG89Pic8b3B0aW9uIHZhbHVlPSInK2VzYyhvLnUpKyciJysoKG8udXx8IiIpPT09Y3VyPyIgc2VsZWN0ZWQiOiIiKSsiPiIrZXNjKG8ubikrIjwvb3B0aW9uPiIpLmpvaW4oIiIpKyc8b3B0aW9uIHZhbHVlPSJfX2N1c3RvbV9fIicrKGN1ciYmIXBpY0tub3duKGN1cik/IiBzZWxlY3RlZCI6IiIpKyI+6Ieq5a6a5LmJIFVSTOKApjwvb3B0aW9uPiI7CiAgY29uc3Qgc2hvd0N1c3RvbT1jdXImJiFwaWNLbm93bihjdXIpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iZi1pdGVtIiBzdHlsZT0ibWFyZ2luLWJvdHRvbToxMnB4IiBkYXRhLXZpbj0iJytlc2ModmluKSsnIj48bGFiZWw+Jytlc2MobmFtZSkrKGFjYz8nIDxzcGFuIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTFweCI+KCcrZXNjKGFjYykrJyk8L3NwYW4+JzonJykrJyDCtyA8Y29kZSBzdHlsZT0iZm9udC1zaXplOjEwcHgiPicrZXNjKFN0cmluZyh2aW4pLnNsaWNlKC02KSkrJzwvY29kZT48L2xhYmVsPicrCiAgJzxzZWxlY3Qgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxM3B4IiBvbmNoYW5nZT0icGljU2VsQ2hhbmdlZCh0aGlzKSI+JytvcHRzKyc8L3NlbGVjdD4nKwogICc8aW5wdXQgY2xhc3M9InBpYy1jdXN0b20iIHBsYWNlaG9sZGVyPSLoh6rlrprkuYnlm77niYcgVVJM77yIaHR0cHMg5byA5aS077yM5bu66K6u5a6Y5pa5IE9TUy/lm77luornm7Tpk77vvIkiIHZhbHVlPSInK2VzYyhzaG93Q3VzdG9tP2N1cjoiIikrJyIgc3R5bGU9ImRpc3BsYXk6Jysoc2hvd0N1c3RvbT8iYmxvY2siOiJub25lIikrJzttYXJnaW4tdG9wOjZweDt3aWR0aDoxMDAlO3BhZGRpbmc6OXB4IDExcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTJweDtib3gtc2l6aW5nOmJvcmRlci1ib3giPjwvZGl2Pic7Cn0KZnVuY3Rpb24gcGljU2VsQ2hhbmdlZChzKXtjb25zdCBpdGVtPXMuY2xvc2VzdCgiLmYtaXRlbSIpO2NvbnN0IGlucD1pdGVtP2l0ZW0ucXVlcnlTZWxlY3RvcigiLnBpYy1jdXN0b20iKTpudWxsO2lmKCFpbnApcmV0dXJuO2lmKHMudmFsdWU9PT0iX19jdXN0b21fXyIpe2lucC5zdHlsZS5kaXNwbGF5PSJibG9jayI7aW5wLmZvY3VzKCl9ZWxzZXtpbnAuc3R5bGUuZGlzcGxheT0ibm9uZSJ9fQpmdW5jdGlvbiBwaWNSb3dzSHRtbCgpewogIGNvbnN0IGxpc3Q9U1RBVEUuZGF0YXx8W107Y29uc3Qgcm93cz1bXTtjb25zdCBzZWVuPXt9OwogIGZvcihjb25zdCBhIG9mIGxpc3QpewogICAgY29uc3Qgdj1hLnZlaGljbGU7CiAgICBpZih2JiZ2Lmhhc1ZlaGljbGUpewogICAgICBjb25zdCBhcnI9KEFycmF5LmlzQXJyYXkodi52ZWhpY2xlcykmJnYudmVoaWNsZXMubGVuZ3RoKT92LnZlaGljbGVzOlt7dmVoaWNsZVR5cGU6di52ZWhpY2xlVHlwZXx8di52ZWhpY2xlTmFtZSx2aW5Obzp2LnZpbk5vfV07CiAgICAgIGZvcihjb25zdCB4IG9mIGFycil7Y29uc3QgdmluPVN0cmluZyh4LnZpbk5vfHwiIikudHJpbSgpO2lmKCF2aW58fHNlZW5bdmluXSljb250aW51ZTtzZWVuW3Zpbl09MTtyb3dzLnB1c2goe3ZpbixuYW1lOlN0cmluZyh4LnZlaGljbGVUeXBlfHx4Lm5hbWV8fHYudmVoaWNsZVR5cGV8fHYudmVoaWNsZU5hbWV8fCLovabovoYiKSxhY2M6YS51c2VyTmFtZXx8IiJ9KX0KICAgIH0KICB9CiAgZm9yKGNvbnN0IHZpbiBvZiBPYmplY3Qua2V5cyhQSUNfQ0ZHKSl7aWYoIXNlZW5bdmluXSlyb3dzLnB1c2goe3ZpbixuYW1lOiLlt7LphY3nva7ovabovoYiLGFjYzoiIn0pfQogIHJldHVybiByb3dzLmxlbmd0aD9yb3dzLm1hcChyPT5waWNSb3coci52aW4sci5uYW1lLHIuYWNjKSkuam9pbigiIik6JzxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTZweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTNweCI+5pyq5qOA5rWL5Yiw5bey57uR5a6a6L2m6L6G77yM5Y+v5Zyo5LiL5pa55oyJIFZJTiDmiYvliqjmt7vliqA8L2Rpdj4nOwp9CmZ1bmN0aW9uIHBpY01hbnVhbEh0bWwoKXsKICBjb25zdCBvcHRzPVBJQ19DQVRBTE9HLm1hcChvPT4nPG9wdGlvbiB2YWx1ZT0iJytlc2Moby51KSsnIj4nK2VzYyhvLm4pKyc8L29wdGlvbj4nKS5qb2luKCIiKTsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6NHB4Ij48bGFiZWw+5oyJIFZJTiDmiYvliqjmt7vliqDvvIjlrozmlbQgVklOIOingSBBcHAg6L2m6L6G5L+h5oGv77yJPC9sYWJlbD48ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjhweDtmbGV4LXdyYXA6d3JhcCI+PGlucHV0IGlkPSJwaWNfbWFudWFsX3ZpbiIgcGxhY2Vob2xkZXI9IuWujOaVtCBWSU7vvIgxN+S9je+8iSIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MTUwcHg7cGFkZGluZzo5cHggMTFweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxMnB4O2JveC1zaXppbmc6Ym9yZGVyLWJveCI+PHNlbGVjdCBpZD0icGljX21hbnVhbF9waWMiIHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjEzMHB4O3BhZGRpbmc6OXB4IDEwcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkMik7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTJweCI+JytvcHRzKyc8L3NlbGVjdD48YnV0dG9uIGNsYXNzPSJidG4gc20gcHJpbWFyeSIgb25jbGljaz0iYWRkUGljTWFudWFsKCkiPua3u+WKoDwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7Cn0KZnVuY3Rpb24gbG9hZFBpY1Jvd3MoKXtjb25zdCBib3g9ZWwoInBpY0xpc3QiKTtpZighYm94KXJldHVybjtib3guaW5uZXJIVE1MPXBpY1Jvd3NIdG1sKCkrcGljTWFudWFsSHRtbCgpfQpmdW5jdGlvbiBhZGRQaWNNYW51YWwoKXsKICBjb25zdCB2aW49KChlbCgicGljX21hbnVhbF92aW4iKXx8e30pLnZhbHVlfHwiIikudHJpbSgpOwogIGNvbnN0IHU9KGVsKCJwaWNfbWFudWFsX3BpYyIpfHx7fSkudmFsdWV8fCIiOwogIGlmKCF2aW4pe3RvYXN0KCLor7fovpPlhaXlrozmlbQgVklOIiwiZXJyIik7cmV0dXJufQogIGlmKHUpUElDX0NGR1t2aW5dPXU7ZWxzZSBkZWxldGUgUElDX0NGR1t2aW5dOwogIGxvYWRQaWNSb3dzKCk7Cn0KZnVuY3Rpb24gY29sbGVjdFBpY0NmZygpewogIGNvbnN0IG91dD17fTsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjcGljTGlzdCAuZi1pdGVtW2RhdGEtdmluXSIpLmZvckVhY2goaXRlbT0+ewogICAgY29uc3QgdmluPWl0ZW0uZ2V0QXR0cmlidXRlKCJkYXRhLXZpbiIpO2lmKCF2aW4pcmV0dXJuOwogICAgY29uc3Qgcz1pdGVtLnF1ZXJ5U2VsZWN0b3IoInNlbGVjdCIpO2NvbnN0IGlucD1pdGVtLnF1ZXJ5U2VsZWN0b3IoIi5waWMtY3VzdG9tIik7CiAgICBjb25zdCB1PXMudmFsdWU9PT0iX19jdXN0b21fXyI/KGlucD9pbnAudmFsdWUudHJpbSgpOiIiKTpzLnZhbHVlOwogICAgaWYodSYmL15odHRwcz86Wy9dWy9dLy50ZXN0KHUpKW91dFt2aW5dPXU7CiAgfSk7CiAgcmV0dXJuIG91dDsKfQphc3luYyBmdW5jdGlvbiBsb2FkUGljQ2ZnKCl7CiAgUElDX0NGRz17fTsKICB0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCgiL2FwaS9waWMtY2ZnIikudGhlbih4PT54Lmpzb24oKSk7aWYociYmci5vaylQSUNfQ0ZHPXIucGljc3x8e319Y2F0Y2goZSl7UElDX0NGRz1nZXRDZmcoKS5waWNzfHx7fX0KICBsb2FkUGljUm93cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHNhdmVQaWNDZmcoKXsKICBjb25zdCBwaWNzPWNvbGxlY3RQaWNDZmcoKTtQSUNfQ0ZHPXBpY3M7CiAgaWYoaXNQcm94eU1vZGUoKSl7CiAgICB0cnl7Y29uc3Qgcj1hd2FpdCBmZXRjaCgiL2FwaS9waWMtY2ZnIix7bWV0aG9kOiJQT1NUIixoZWFkZXJzOnsiQ29udGVudC1UeXBlIjoiYXBwbGljYXRpb24vanNvbiJ9LGJvZHk6SlNPTi5zdHJpbmdpZnkoe3BpY3N9KX0pLnRoZW4oeD0+eC5qc29uKCkpOwogICAgICBpZihyJiZyLm9rKXt0b2FzdCgi5Zu+54mH5pu/5o2i5bey5L+d5a2Y77yIIityLmNvdW50KyIg6L6G6L2m77yJ77yM5omT5byA5p6B5qC4QXBw6L2m6L6G6aG15Y2z55Sf5pWIIiwib2siKX1lbHNle3RvYXN0KCLkv53lrZjlpLHotKU6IisoKHImJnIuZXJyb3IpfHwi5pyq55+lIiksImVyciIpfQogICAgfWNhdGNoKGUpe3RvYXN0KCLkv53lrZjlpLHotKU6IitlLCJlcnIiKX0KICB9ZWxzZXtjb25zdCBjPWdldENmZygpO2MucGljcz1waWNzO3NhdmVDZmcoYyk7dG9hc3QoIuW3suS/neWtmOWIsOacrOWcsO+8iOa1j+iniOWZqOaooeW8j+S4jeaUueWGmeWumOaWuUFwcO+8iSIsImluZm8iKX0KfQovKiA9PT09PT09PT09PT09PT09PSDoh6rlrprkuYnog4zmma/vvIh2Mi4xNi41NSDotbfnlLEgV2FsbHBhcGVyTWdyIOaOpeeuoe+8jOaXp+Wtl+auteWPquWBmuWFvOWuue+8iSA9PT09PT09PT09PT09PT09PSAqLwovKiA9PT09PT09PT09PT09PT09PSDmiYvmnLrlj7fnmbvlvZXvvIjlhY3mipPljIXvvIkgPT09PT09PT09PT09PT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gc2VuZFNtc0NvZGUoKXsKICBjb25zdCBwaG9uZT0oZWwoInBsX3Bob25lIik/LnZhbHVlfHwiIikudHJpbSgpOwogIGlmKCEvXjFcZHsxMH0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpeato+ehrueahDEx5L2N5omL5py65Y+3IiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX3NlbmRfYnRuIik7YnRuLmRpc2FibGVkPXRydWU7YnRuLnRleHRDb250ZW50PSLlj5HpgIHkuK3igKYiOwogIGNvbnN0IGQ9YXdhaXQgQmFja2VuZC5zZW5kQ29kZShwaG9uZSk7CiAgaWYoZCYmZC5vayl7dG9hc3QoZC5tZXNzYWdlfHwi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTtsZXQgdD02MDtidG4udGV4dENvbnRlbnQ9IumHjeaWsOiOt+WPligiK3QrInMpIjsKICAgIGNvbnN0IGl2PXNldEludGVydmFsKCgpPT57dC0tO2lmKHQ8PTApe2NsZWFySW50ZXJ2YWwoaXYpO2J0bi50ZXh0Q29udGVudD0i6I635Y+W6aqM6K+B56CBIjtidG4uZGlzYWJsZWQ9ZmFsc2U7fWVsc2UgYnRuLnRleHRDb250ZW50PSLph43mlrDojrflj5YoIit0KyJzKSI7fSwxMDAwKTsKICB9ZWxzZXt0b2FzdCgoZCYmZC5tZXNzYWdlKXx8IuWPkemAgeWksei0pe+8jOivt+ajgOafpee9kee7nCIsImVyciIpO2J0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IuiOt+WPlumqjOivgeeggSI7fQp9CmFzeW5jIGZ1bmN0aW9uIHBob25lTG9naW5VSSgpewogIGNvbnN0IHBob25lPShlbCgicGxfcGhvbmUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgY29uc3QgY29kZT0oZWwoInBsX2NvZGUiKT8udmFsdWV8fCIiKS50cmltKCk7CiAgaWYoIS9eMVxkezEwfSQvLnRlc3QocGhvbmUpKXt0b2FzdCgi6K+36L6T5YWl5q2j56Gu55qEMTHkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm47fQogIGlmKCFjb2RlKXt0b2FzdCgi6K+36L6T5YWl55+t5L+h6aqM6K+B56CBIiwiZXJyIik7cmV0dXJuO30KICBjb25zdCBidG49ZWwoInBsX2xvZ2luX2J0biIpO2J0bi5kaXNhYmxlZD10cnVlO2J0bi50ZXh0Q29udGVudD0i55m75b2V5Lit4oCmIjsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQucGhvbmVMb2dpbihwaG9uZSxjb2RlLCIiKTsKICBpZihkJiZkLm9rKXt0b2FzdChkLm1lc3NhZ2V8fCLnmbvlvZXmiJDlip8iLCJvayIpO3NldFRpbWVvdXQoKCk9PmxvY2F0aW9uLnJlbG9hZCgpLDEyMDApO30KICBlbHNle3RvYXN0KChkJiZkLm1lc3NhZ2UpfHwi55m75b2V5aSx6LSlIiwiZXJyIik7fQogIGJ0bi5kaXNhYmxlZD1mYWxzZTtidG4udGV4dENvbnRlbnQ9IueZu+W9leW5tua3u+WKoOi0puWPtyI7Cn0KLy8gdjIuMTQuMjEg562+5ZCN5a+G6ZKl6YWN572u6Z2i5p2/5bey5Yig6Zmk77yaYXBwL2g1L0FFUyDlr4bpkqXnm7TmjqXmsr/nlKjlvZPliY3lgLzvvIjlhoXnva7pu5jorqTvvInvvIzkuI3lho3ku47ovpPlhaXmoYbor7vlj5YKLy8gdjIuMTQuMjEg6aOO6Zmp56Gu6K6k5pS55by556qX77ya5L+d5a2Y6YWN572u5pe25rK/55So5b2T5YmNIHZlaGljbGVDb250cm9sUmlza++8jOS4jea4heepuuWQjOaEj+eKtuaAgQpmdW5jdGlvbiBjb2xsZWN0Q2ZnVUkoKXtjb25zdCBjdXI9Z2V0Q2ZnKCk7cmV0dXJue2FwcDp7YXBwSWQ6Y3VyLmFwcC5hcHBJZCxhcHBTZWNyZXQ6Y3VyLmFwcC5hcHBTZWNyZXR9LGg1OnthcHBJZDpjdXIuaDUuYXBwSWQsYXBwU2VjcmV0OmN1ci5oNS5hcHBTZWNyZXR9LHZlaGljbGVBZXNLZXk6Y3VyLnZlaGljbGVBZXNLZXksdmVoaWNsZUNvbnRyb2xSaXNrOmN1ci52ZWhpY2xlQ29udHJvbFJpc2ssYXV0b1JlZnJlc2hTZWM6bm9ybWFsaXplUmVmcmVzaFNlYyhjdXIuYXV0b1JlZnJlc2hTZWN8fDYwKSxzZXJ2ZXJCYXNlOmN1ci5zZXJ2ZXJCYXNlfHwiIixhdXRvU2lnbmluOmVsKCJhdXRvX3NpZ25pbiIpP2VsKCJhdXRvX3NpZ25pbiIpLmNoZWNrZWQ6ZmFsc2UsYXV0b1NpZ25pblRpbWU6KHZhbCgiY2ZnX3NpZ25pbl90aW1lIil8fCIwNzowMCIpLHZlaGljbGVNb25pdG9yOmVsKCJ2ZWhpY2xlX21vbml0b3IiKT9lbCgidmVoaWNsZV9tb25pdG9yIikuY2hlY2tlZDpmYWxzZSx2ZWhpY2xlQWxlcnRQdXNoOmVsKCJ2ZWhpY2xlX2FsZXJ0X3B1c2giKT9lbCgidmVoaWNsZV9hbGVydF9wdXNoIikuY2hlY2tlZDp0cnVlLHdpZGdldFZlaGljbGU6d2lkZ2V0U2VsZWN0aW9uVGV4dCgpfHxjdXIud2lkZ2V0VmVoaWNsZSx3aWRnZXRGb250Ok51bWJlcih2YWwoIndpZGdldF9mb250IikpfHwxLGN1c3RvbUJnOmN1ci5jdXN0b21CZyxwaWNzOihjdXIucGljc3x8e30pLGNvbW11bml0eTp7ZW5hYmxlUG9zdDplbCgiY29tbV9wb3N0IikuY2hlY2tlZCxlbmFibGVMaWtlOmVsKCJjb21tX2xpa2UiKS5jaGVja2VkLGVuYWJsZUNvbW1lbnQ6ZWwoImNvbW1fY29tbWVudCIpLmNoZWNrZWQsZW5hYmxlU2hhcmU6ZWwoImNvbW1fc2hhcmUiKS5jaGVja2VkLGVuYWJsZURlbGV0ZTplbCgiY29tbV9kZWxldGUiKS5jaGVja2VkfX19CmZ1bmN0aW9uIHZhbChpZCl7Y29uc3QgZT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7cmV0dXJuIGU/ZS52YWx1ZToiIn0KZnVuY3Rpb24gZWwoaWQpe3JldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCl9CmFzeW5jIGZ1bmN0aW9uIHNhdmVDZmdVSSgpe2NvbnN0IGM9Y29sbGVjdENmZ1VJKCk7Y29uc3Qgb2s9YXdhaXQgQmFja2VuZC5zYXZlQ29uZmlnKGMpO2lmKG9rKXtpZihpc1Byb3h5TW9kZSgpKXthcHBseVJlbW90ZUNmZyhjKTtTVEFURS5wYW5lbExvYWRlZD1mYWxzZX10b2FzdCgi6YWN572u5bey5L+d5a2YIiwib2siKTtzdGFydEF1dG9SZWZyZXNoKGMuYXV0b1JlZnJlc2hTZWMpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIil9Ci8vIHYyLjE0LjIxIOetvuWQjeWvhumSpemdouadv+W3suWIoOmZpO+8muaBouWkjem7mOiupOaXtuWvhumSpeebtOaOpeWGmeWbnuWGhee9rum7mOiupOWAvApmdW5jdGlvbiByZXNldENmZ1VJKCl7aWYoZWwoImF1dG9fc2lnbmluIikpZWwoImF1dG9fc2lnbmluIikuY2hlY2tlZD1mYWxzZTtpZihlbCgidmVoaWNsZV9hbGVydF9wdXNoIikpZWwoInZlaGljbGVfYWxlcnRfcHVzaCIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY2ZnX3NpZ25pbl90aW1lIikpZWwoImNmZ19zaWduaW5fdGltZSIpLnZhbHVlPSIwNzowMCI7aWYoZWwoImNvbW1fcG9zdCIpKWVsKCJjb21tX3Bvc3QiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fbGlrZSIpKWVsKCJjb21tX2xpa2UiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fY29tbWVudCIpKWVsKCJjb21tX2NvbW1lbnQiKS5jaGVja2VkPXRydWU7aWYoZWwoImNvbW1fc2hhcmUiKSllbCgiY29tbV9zaGFyZSIpLmNoZWNrZWQ9dHJ1ZTtpZihlbCgiY29tbV9kZWxldGUiKSllbCgiY29tbV9kZWxldGUiKS5jaGVja2VkPXRydWU7Y29uc3QgYz1nZXRDZmcoKTtjLmFwcD17YXBwSWQ6REVGQVVMVF9DRkcuYXBwLmFwcElkLGFwcFNlY3JldDpERUZBVUxUX0NGRy5hcHAuYXBwU2VjcmV0fTtjLmg1PXthcHBJZDpERUZBVUxUX0NGRy5oNS5hcHBJZCxhcHBTZWNyZXQ6REVGQVVMVF9DRkcuaDUuYXBwU2VjcmV0fTtjLnZlaGljbGVBZXNLZXk9REVGQVVMVF9DRkcudmVoaWNsZUFlc0tleTtjLnZlaGljbGVDb250cm9sUmlzaz0iIjtjLndpZGdldFZlaGljbGU9IiI7Yy5jdXN0b21CZz0iIjtzYXZlQ2ZnKGMpO2FwcGx5Q3VzdG9tQmcoKTtpZihlbCgid2lkZ2V0X2FjYyIpKXtlbCgid2lkZ2V0X2FjYyIpLnZhbHVlPSIiO2VsKCJ3aWRnZXRfdmVoIikuaW5uZXJIVE1MPSIiO31jb25zdCBicD1lbCgiYmdQcmV2aWV3Iik7aWYoYnApe2JwLnN0eWxlLmJhY2tncm91bmRJbWFnZT0iIjticC50ZXh0Q29udGVudD0i5pyq6YCJ5oupIjt9dG9hc3QoIuW3suaBouWkjem7mOiupO+8iOmcgOeCueWHu+S/neWtmO+8iSIsImluZm8iKX0KZnVuY3Rpb24gYWRkQWNjb3VudFVJKCl7Y2ZnQWNjb3VudHMucHVzaCh7dXNlck5hbWU6IiIsdXNlcklkOiIiLHRva2VuOiIiLGJhcmtLZXk6IiJ9KTtjb25zdCBsaXN0PWVsKCJhY2NMaXN0Iik7Y29uc3QgaWR4PWNmZ0FjY291bnRzLmxlbmd0aC0xO2NvbnN0IGh0bWw9JzxkaXYgY2xhc3M9ImFjYy1lZGl0IiBkYXRhLWk9IicraWR4KyciPjxkaXYgY2xhc3M9ImFjYy1lZGl0LWhlYWQiPjxzcGFuIGNsYXNzPSJhY2MtZWRpdC10aXRsZSI+PHNwYW4gY2xhc3M9Im4iPicrU3RyaW5nKGlkeCsxKSsnPC9zcGFuPui0puWPtyAnK1N0cmluZyhpZHgrMSkrJ++8iOaWsO+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iYWN0cyI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBpZD0idWlkQnRuXycraWR4KyciIG9uY2xpY2s9ImZldGNoVXNlcklkVUkoJytpZHgrJykiPuiOt+WPlklEPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIGRhbmdlciIgb25jbGljaz0iZGVsZXRlQWNjb3VudFVJKCcraWR4KycpIj7liKDpmaQ8L2J1dHRvbj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iZm9ybS1ncmlkIj48ZGl2IGNsYXNzPSJmLWl0ZW0iPjxsYWJlbD7mmLXnp7A8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX25hbWVfJytpZHgrJyIgcGxhY2Vob2xkZXI9IuWmgiBsdWNreTc5OCI+PC9kaXY+PGRpdiBjbGFzcz0iZi1pdGVtIj48bGFiZWw+55So5oi3SUQ8L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3VpZF8nK2lkeCsnIiBwbGFjZWhvbGRlcj0i55WZ56m65Y+v54K544CM6I635Y+WSUTjgI0iPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkF1dGhvcml6YXRpb24gVG9rZW48L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWNjX3Rva2VuXycraWR4KyciIHBsYWNlaG9sZGVyPSJhNzQ3NzljNy3igKYiPjwvZGl2PjxkaXYgY2xhc3M9ImYtaXRlbSIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPkJhcmsg6YCa55+lIEtlee+8iOmAieWhq++8iTwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJhY2NfYmFya18nK2lkeCsnIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu6IGh0dHBzOi8v5Z+f5ZCNL0tleSI+PC9kaXY+PC9kaXY+JztpZihsaXN0LnF1ZXJ5U2VsZWN0b3IoIi5hY2MtZWRpdCIpfHxsaXN0LnF1ZXJ5U2VsZWN0b3IoIltzdHlsZSo9J3RleHQtYWxpZ24nXSIpKXtsaXN0Lmluc2VydEFkamFjZW50SFRNTCgiYmVmb3JlZW5kIixodG1sKX1lbHNle2xpc3QuaW5uZXJIVE1MPWh0bWx9fQpmdW5jdGlvbiBkZWxldGVBY2NvdW50VUkoaWR4KXtjb25zdCByb3c9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFjYy1lZGl0W2RhdGEtaT0iJytpZHgrJyJdJyk7aWYocm93KXtyb3cucmVtb3ZlKCk7Y2ZnQWNjb3VudHMuc3BsaWNlKGlkeCwxKTt0b2FzdCgi5bey5Yig6Zmk77yI6ZyA54K55Ye75L+d5a2Y77yJIiwiaW5mbyIpfX0KZnVuY3Rpb24gY29sbGVjdEFjY291bnRzVUkoKXtjb25zdCByb3dzPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNhY2NMaXN0IC5hY2MtZWRpdCIpO2NvbnN0IGxpc3Q9W107cm93cy5mb3JFYWNoKHJvdz0+e2NvbnN0IGk9cm93LmdldEF0dHJpYnV0ZSgiZGF0YS1pIik7Y29uc3QgdG9rZW49ZWwoImFjY190b2tlbl8iK2kpPy52YWx1ZXx8IiI7aWYodG9rZW4udHJpbSgpKXtsaXN0LnB1c2goe3VzZXJOYW1lOmVsKCJhY2NfbmFtZV8iK2kpPy52YWx1ZXx8IiIsdXNlcklkOmVsKCJhY2NfdWlkXyIraSk/LnZhbHVlfHwiIix0b2tlbjpjbGVhblRva2VuKHRva2VuKSxiYXJrS2V5OmNsZWFuQmFya0tleShlbCgiYWNjX2JhcmtfIitpKT8udmFsdWV8fCIiKX0pfX0pO3JldHVybiBsaXN0fQphc3luYyBmdW5jdGlvbiBzYXZlQWNjb3VudHNVSSgpe2NvbnN0IGxpc3Q9Y29sbGVjdEFjY291bnRzVUkoKS5tYXAoYT0+KHt1c2VyTmFtZTooYS51c2VyTmFtZXx8IiIpLnRyaW0oKSx1c2VySWQ6KGEudXNlcklkfHwiIikudHJpbSgpLHRva2VuOmNsZWFuVG9rZW4oYS50b2tlbiksYmFya0tleTpjbGVhbkJhcmtLZXkoYS5iYXJrS2V5KX0pKTtjb25zdCBvaz1hd2FpdCBCYWNrZW5kLnNhdmVBY2NvdW50cyhsaXN0KTtpZihvayl7aWYoaXNQcm94eU1vZGUoKSlTVEFURS5wYW5lbEFjY291bnRzPWxpc3Q7dG9hc3QoIuaegeaguOi0puWPt+W3suS/neWtmCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKX0KYXN5bmMgZnVuY3Rpb24gZmV0Y2hVc2VySWRVSShpZHgpe2NvbnN0IHRva2VuPWNsZWFuVG9rZW4oZWwoImFjY190b2tlbl8iK2lkeCk/LnZhbHVlfHwiIik7Y29uc3QgYnRuPWVsKCJ1aWRCdG5fIitpZHgpO2lmKCF0b2tlbil7dG9hc3QoIuivt+WFiOWhq+WGmSBUb2tlbiIsImVyciIpO3JldHVybn1idG4udGV4dENvbnRlbnQ9IuiOt+WPluS4reKApiI7YnRuLmRpc2FibGVkPXRydWU7Y29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldFVzZXJpZCh0b2tlbik7aWYoZCYmZC5vayYmZC51c2VySWQpe2lmKGVsKCJhY2NfdWlkXyIraWR4KSllbCgiYWNjX3VpZF8iK2lkeCkudmFsdWU9ZC51c2VySWQ7aWYoZC51c2VyTmFtZSYmZWwoImFjY19uYW1lXyIraWR4KSYmIWVsKCJhY2NfbmFtZV8iK2lkeCkudmFsdWUpZWwoImFjY19uYW1lXyIraWR4KS52YWx1ZT1kLnVzZXJOYW1lO3RvYXN0KCLojrflj5bmiJDlip/vvJoiKyhkLnVzZXJOYW1lfHxkLnVzZXJJZCksIm9rIil9ZWxzZXt0b2FzdCgi6I635Y+W5aSx6LSl77yaIisoKGQmJmQuZXJyb3IpfHwi5pyq55+l6ZSZ6K+vIiksImVyciIpfWJ0bi50ZXh0Q29udGVudD0i6I635Y+WSUQiO2J0bi5kaXNhYmxlZD1mYWxzZX0KCi8qID09PT09PT09PT09PT09PT09IOWkh+S7vSAvIOaBouWkjSA9PT09PT09PT09PT09PT09PSAqLwpmdW5jdGlvbiBleHBvcnRCYWNrdXBVSSgpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJiYWNrdXBBcmVhIik7aWYoIWVsKXt0b2FzdCgi55WM6Z2i5pyq5bCx57uqIiwiZXJyIik7cmV0dXJufWVsLnZhbHVlPSLnlJ/miJDkuK3igKYiO0JhY2tlbmQuYmFja3VwKCkudGhlbihkPT57aWYoZCYmZC5vayl7ZWwudmFsdWU9SlNPTi5zdHJpbmdpZnkoZCxudWxsLDIpO3RvYXN0KCLlpIfku73lt7LnlJ/miJDvvIzlj6/lpI3liLbkv53lrZgiLCJvayIpfWVsc2V7ZWwudmFsdWU9IiI7dG9hc3QoIuWvvOWHuuWksei0pe+8miIrKChkJiZkLmVycm9yKXx8IuaXoOazlei/nuaOpeiEmuacrOWQjuerryIpLCJlcnIiKX19KX0KZnVuY3Rpb24gY29weUJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImJhY2t1cEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZSl7dG9hc3QoIuivt+WFiOeCueWHu+OAjOS4gOmUruWvvOWHuuWkh+S7veOAjSIsImVyciIpO3JldHVybn1pZihuYXZpZ2F0b3IuY2xpcGJvYXJkJiZuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCl7bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZWwudmFsdWUpLnRoZW4oKCk9PnRvYXN0KCLlt7LlpI3liLbliLDliarotLTmnb8iLCJvayIpLCgpPT57ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX0pfWVsc2V7ZWwuc2VsZWN0KCk7ZG9jdW1lbnQuZXhlY0NvbW1hbmQoImNvcHkiKTt0b2FzdCgi5bey5aSN5Yi25Yiw5Ymq6LS05p2/Iiwib2siKX19CmZ1bmN0aW9uIGltcG9ydEJhY2t1cFVJKCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoImltcG9ydEFyZWEiKTtpZighZWx8fCFlbC52YWx1ZS50cmltKCkpe3RvYXN0KCLor7flhYjnspjotLTlpIfku73lhoXlrrkiLCJlcnIiKTtyZXR1cm59Y29uZmlybURpYWxvZygi5oGi5aSN5aSH5Lu9Iiwi5bCG6KaG55uW5b2T5YmN5YWo6YOo6LSm5Y+35LiO6Z2i5p2/6YWN572u77yM5q2k5pON5L2c5LiN5Y+v5pKk6ZSA44CCIiwiaW1wb3J0QmFja3VwTm93Iil9CmFzeW5jIGZ1bmN0aW9uIGltcG9ydEJhY2t1cE5vdygpe2NvbnN0IGVsPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJpbXBvcnRBcmVhIik7Y29uc3Qgdj1lbD9lbC52YWx1ZS50cmltKCk6IiI7aWYoIXYpe3RvYXN0KCLlpIfku73lhoXlrrnkuLrnqboiLCJlcnIiKTtyZXR1cm59Y29uc3QgZD1hd2FpdCBCYWNrZW5kLnJlc3RvcmVCYWNrdXAodik7aWYoZCYmZC5vayl7dG9hc3QoIuaBouWkjeaIkOWKn++8miIrKGQuY291bnR8fDApKyIg5Liq6LSm5Y+3Iiwib2siKTtpZihpc1Byb3h5TW9kZSgpKXtTVEFURS5wYW5lbEFjY291bnRzPVtdO1NUQVRFLnBhbmVsTG9hZGVkPWZhbHNlfVNUQVRFLmRhdGE9W107cmVuZGVyQ2ZnKCk7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLmgaLlpI3lpLHotKXvvJoiKygoZCYmZC5lcnJvcil8fCLlpIfku73lhoXlrrnmoLzlvI/plJnor68iKSwiZXJyIil9CgovKiA9PT09PT09PT09PT09PT09PSDmvJTnpLrmlbDmja7vvIg/ZGVtbyDpooTop4jnlKjvvIzkuI3ogZTnvZHvvIkgPT09PT09PT09PT09PT09PT0gKi8KZnVuY3Rpb24gaXNEZW1vKCl7cmV0dXJuIGxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCJkZW1vIik+PTB9CmZ1bmN0aW9uIGRlbW9DYWwoKXsKICBjb25zdCBub3c9bmV3IERhdGUoKSx5PW5vdy5nZXRGdWxsWWVhcigpLG09bm93LmdldE1vbnRoKCkrMSxkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKSxwPW49PlN0cmluZyhuKS5wYWRTdGFydCgyLCIwIiksb3V0PVtdOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9eSsiLSIrcChtKSsiLSIrcChkKTsKICAgIGlmKGRzPnkrIi0iK3AobSkrIi0iK3Aobm93LmdldERhdGUoKSkpYnJlYWs7CiAgICBpZihkPT09M3x8ZD09PTExKWNvbnRpbnVlOyAgICAgICAgICAvLyDmvJTnpLrvvJrkuKTlpKnmvI/nrb4KICAgIG91dC5wdXNoKHtjcmVhdGVEYXRlOmRzLHNpZ25TdGF0dWU6NX0pOwogIH0KICByZXR1cm4gb3V0Owp9CmNvbnN0IERFTU9fSU5URUdSQUw9e29rOnRydWUsdG90YWw6e2ludGVncmFsVG90YWw6IjEyLDg4MCJ9LGV4cGlyZTpbe2ludGVncmFsU2NvcmU6MzIwLGV4cGlyeURhdGVTdHI6IjIwMjYtMTItMzEifV0sZGV0YWlsOlsKICB7bmFtZToi5q+P5pel562+5YiwIixpbnRlZ3JhbFNjb3JlOjYsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuekvuWMuuWPkeW4liIsaW50ZWdyYWxTY29yZToxLG15RGF0ZVN0cjoiMjAyNi0wOS0yOSAwNzowMCJ9LAogIHtuYW1lOiLnpL7ljLrngrnotZ4iLGludGVncmFsU2NvcmU6MSxteURhdGVTdHI6IjIwMjYtMDktMjkgMDc6MDAifSwKICB7bmFtZToi56S+5Yy65YiG5LqrIixpbnRlZ3JhbFNjb3JlOjEsbXlEYXRlU3RyOiIyMDI2LTA5LTI5IDA3OjAwIn0sCiAge25hbWU6IuebsuebkuWlluWKsSIsaW50ZWdyYWxTY29yZTo2LG15RGF0ZVN0cjoiMjAyNi0wOS0yOCAwNzowMCJ9LAogIHtuYW1lOiLooaXnrb7mtojogJciLGludGVncmFsU2NvcmU6LTEsbXlEYXRlU3RyOiIyMDI2LTA5LTI3IDIxOjEwIn0KXX07CmNvbnN0IERFTU9fU1VQUExFTUVOVD17Y291bnQ6e29rOnRydWUsZGF0YTp7Y291bnQ6MixjYXJkTnVtOjJ9fSxtb250aDp7b2s6dHJ1ZSxkYXRhOntub3dTaWduRGV0YWlsVm9zOltdfX19Owpjb25zdCBERU1PX01PTklUT1I9e29rOnRydWUsc25hcHNob3Q6e3ZpbjoiTEI3Sk0xQzEwTkEwMDAwMDEiLHNvYzo3NixyYW5nZTo2Myx2b2x0YWdlOjg0LjUsY3VycmVudDowLGNoYXJnZVN0YXRlOiLmnKrlhYXnlLUiLGhlYWRMb2NrOiIxIixvZmZsaW5lOmZhbHNlLHJlZnJlc2hUaW1lOiIyMDI2LTA5LTI5IDAzOjEwIixmcm9udFByZXNzdXJlOiIyLjM1YmFyIixyZWFyUHJlc3N1cmU6IjIuNDBiYXIiLGZyb250VGVtcDoiMzHCsEMiLHJlYXJUZW1wOiIzMsKwQyIsYmF0dGVyeVRlbXA6MjYsdG9kYXlEaXN0YW5jZToxMi42LHRvZGF5RHVyYXRpb246MzQsdG9kYXlNYXhTcGVlZDo1NixhZGRyZXNzOiLnpo/lu7rnnIHlroHlvrfluILolYnln47ljLrkuJzkvqjlvIDlj5HljLoiLHNlcnZpY2VFbmREYXRlOiIyMDI3LTAzLTE4In0sCiAgdmVoaWNsZXM6W3t2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVUeXBlOiJBRTQgTUFYMisifSx7dmVoaWNsZU5hbWU6IuaegeaguCBBRTYiLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZVR5cGU6IkFFNiJ9XX07CmNvbnN0IERFTU9fQ1RSTF9PUFRTPXtvazp0cnVlLGNoYXJnZVBvd2VyOlt7a2V5OiI0MDAifSx7a2V5OiI4MDAifSx7a2V5OiIxMDAwIn1dLGdlYXJzOlsiMjUiLCI0NSIsIjYwIl19Owpjb25zdCBERU1PX0lORk89e29rOnRydWUsdW5yZWFkOnt0b3RhbDozfSxwcml6ZVJlY29yZHM6e3JlY29yZHM6W3twcml6ZXNOYW1lOiLnp6/liIYgKzYiLGNyZWF0ZVRpbWU6IjIwMjYtMDktMjggMDc6MDAiLGludGVncmFsOjZ9LHtwcml6ZXNOYW1lOiLooaXnrb7ljaEgw5cxIixjcmVhdGVUaW1lOiIyMDI2LTA5LTIxIDA3OjAwIn1dfSxjb3Vwb25zOntyZWNvcmRzOlt7fSx7fSx7fV19LG90YTpbXX07Ci8qIHYyLjE2LjAg6aqR6KGM5ryU56S65pWw5o2u77ya5ZCI5oiQ6L2o6L+577yI56Gu5a6a5oCn55Sf5oiQ77yJ77yM5pyI5bqm6K6w5b2V5LiO6L2o6L+55omr5o+P57uT5p6c5L+d5oyB5LiA6Ie0ICovCmZ1bmN0aW9uIGRlbW9UcmFjayhzZWVkLHN0ZXBzLGRheSl7CiAgbGV0IHM9c2VlZD4+PjA7CiAgbGV0IGxvbj0xMTkuNTUwOSxsYXQ9MjYuNjY1NCxoZGc9NDUsb3V0PVtdOwogIGNvbnN0IGQwPW5ldyBEYXRlKCk7ZDAuc2V0RGF0ZShkYXkpO2QwLnNldEhvdXJzKDE0LDIwLDAsMCk7CiAgY29uc3QgdDA9ZDAuZ2V0VGltZSgpKyhzZWVkJTEzKSo2MDAwMDsKICBmb3IobGV0IGk9MDtpPHN0ZXBzO2krKyl7CiAgICBjb25zdCBwaD1pL3N0ZXBzOwogICAgY29uc3QgdGFyZ2V0PTQ1KzUwKk1hdGguc2luKHBoKk1hdGguUEkqMi42KSsxNCpNYXRoLnNpbihwaCpNYXRoLlBJKjYuMysoc2VlZCU3KSk7CiAgICBoZGc9aGRnKyh0YXJnZXQtaGRnKSowLjMyOwogICAgbGV0IHY9MzQrMTMqTWF0aC5zaW4ocGgqTWF0aC5QSSozLjMrKHNlZWQlNSkpKzEuNSpNYXRoLnNpbihwaCpNYXRoLlBJKjE3KTsKICAgIGlmKGk+TWF0aC5mbG9vcihzdGVwcyowLjYwKSYmaTxNYXRoLmZsb29yKHN0ZXBzKjAuNjQpKXYtPTI0OwogICAgdj1NYXRoLm1heCg2LE1hdGgubWluKDY0LHYpKTsKICAgIGNvbnN0IHJhZD1oZGcqTWF0aC5QSS8xODA7CiAgICBjb25zdCBzdGVwTT12KjEwMDAvMzYwMCoyOwogICAgbGF0Kz1zdGVwTSpNYXRoLmNvcyhyYWQpLzExMTMyMDsKICAgIGxvbis9c3RlcE0qTWF0aC5zaW4ocmFkKS8oMTExMzIwKk1hdGguY29zKGxhdCpNYXRoLlBJLzE4MCkpOwogICAgb3V0LnB1c2gobG9uLnRvRml4ZWQoNikrIiwiK2xhdC50b0ZpeGVkKDYpKyIsIit2LnRvRml4ZWQoMSkrIiwiKyh0MCtpKjIwMDApKTsKICB9CiAgcmV0dXJuIG91dC5qb2luKCImIik7Cn0KZnVuY3Rpb24gZGVtb1JpZGVEYXlzKCl7CiAgY29uc3Qgbm93PW5ldyBEYXRlKCk7Y29uc3QgY3VyPW5vdy5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpO2NvbnN0IHA9bj0+U3RyaW5nKG4pLnBhZFN0YXJ0KDIsIjAiKTsKICByZXR1cm4gW3tkYXlUaW1lOmN1cisiLiIrcCgxMCkscmlkZXM6W3tyaWRlSWQ6IkRFTU8tUjEiLHRyYWplY3Rvcnk6ZGVtb1RyYWNrKDExLDkwLDEwKX0se3JpZGVJZDoiREVNTy1SMiIsdHJhamVjdG9yeTpkZW1vVHJhY2soMjMsNzAsMTApfV19LAogICAgICAgICAge2RheVRpbWU6Y3VyKyIuIitwKDgpLHJpZGVzOlt7cmlkZUlkOiJERU1PLVIzIix0cmFqZWN0b3J5OmRlbW9UcmFjayg3LDExMCw4KX1dfV07Cn0KZnVuY3Rpb24gZGVtb1JpZGVUcmFjayhwYWdlKXsKICBpZihwYWdlJiZwYWdlPjEpcmV0dXJue29rOnRydWUscGFnZTpwYWdlLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsZGF5czpbXX07CiAgcmV0dXJue29rOnRydWUscGFnZToxLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsZGF5czpkZW1vUmlkZURheXMoKS5tYXAoZD0+KHtkYXlUaW1lOmQuZGF5VGltZSxoaXN0b3J5TGlzdDpkLnJpZGVzfSkpfTsKfQpmdW5jdGlvbiBkZW1vUmlkZU1vbnRoKG1vbnRoKXsKICBjb25zdCBub3c9bmV3IERhdGUoKTtjb25zdCBjdXI9bm93LmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7Y29uc3QgcD1uPT5TdHJpbmcobikucGFkU3RhcnQoMiwiMCIpOwogIGlmKG1vbnRoJiZtb250aCE9PWN1cilyZXR1cm57b2s6dHJ1ZSxtb250aDptb250aCx2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLHZlaGljbGVOYW1lOiJaRUVITyBBRTQiLGRhdGE6e3JpZGVNaWxlYWdlVG90YWw6MCxyaWRlUmVjb3JkTGlzdDpbXX19OwogIGNvbnN0IHNjYW49cmlkZURheVNjYW4oZGVtb1JpZGVUcmFjaygxKS5kYXlzKTsKICBjb25zdCBtaz0oZCxleHRyYSk9PnsKICAgIGNvbnN0IGM9c2NhbltkXXx8bnVsbDsKICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtkYXRlOmQsCiAgICAgIHJpZGVNaWxlYWdlOihjJiZjLmttPjApP2Mua20udG9GaXhlZCgxKToiMCIsCiAgICAgIHJpZGluZ1RpbWVEYXlVbml0TWludXRlOihjJiZjLmR1cj4wKT9TdHJpbmcoTWF0aC5yb3VuZChjLmR1cikpOiIwIiwKICAgICAgbWF4U3BlZWQ6KGMmJmMubWF4Vj4wKT9TdHJpbmcoTWF0aC5yb3VuZChjLm1heFYpKToiMCIsCiAgICAgIGFjY2VsZXJhdGlvblRpbWVzRGF5OiIwIixicmFrZXNUaW1lc0RheToiMCIsYmVuZGluZ1RpbWVzRGF5OiIwIn0sZXh0cmF8fHt9KTsKICB9OwogIGNvbnN0IHJlY29yZHM9WwogICAge2RhdGU6Y3VyKyIuIitwKDMpLHJpZGVNaWxlYWdlOiIxMi40IixyaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZToiNDYiLG1heFNwZWVkOiI1OCIsYWNjZWxlcmF0aW9uVGltZXNEYXk6IjEiLGJyYWtlc1RpbWVzRGF5OiIwIixiZW5kaW5nVGltZXNEYXk6IjAifSwKICAgIHtkYXRlOmN1cisiLiIrcCg1KSxyaWRlTWlsZWFnZToiOC44IixyaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZToiMzEiLG1heFNwZWVkOiI1MiIsYWNjZWxlcmF0aW9uVGltZXNEYXk6IjAiLGJyYWtlc1RpbWVzRGF5OiIxIixiZW5kaW5nVGltZXNEYXk6IjQifSwKICAgIG1rKGN1cisiLiIrcCg4KSksCiAgICBtayhjdXIrIi4iK3AoMTApLHthY2NlbGVyYXRpb25UaW1lc0RheToiMSJ9KQogIF07CiAgcmV0dXJue29rOnRydWUsbW9udGg6Y3VyLHZpbk5vOiJMQjdKTTFDMTBOQTAwMDAwMSIsdmVoaWNsZU5hbWU6IlpFRUhPIEFFNCIsZGF0YTp7cmlkZU1pbGVhZ2VUb3RhbDoyNjguNSxyaWRlUmVjb3JkTGlzdDpyZWNvcmRzfX07Cn0KY29uc3QgREVNT19EQVRBPVsKe3VzZXJOYW1lOiLpmL/ms70iLHVzZXJJZDoiMjAyNTEwMDkxMjM0NTY3OCIsc2NvcmU6MTI4ODAsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NDIsdG9kYXlTY29yZToxMixzaWduQ291bnQ6MzYsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToiWkVFSE8gQUU0Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDEiLGJhdHRlcnlQZXJjZW50Ojc2LHJlc2lkdWFsUmFuZ2VLbTo2MyxyYW5nZUVzdGltYXRlZDpmYWxzZSxjaGFyZ2VTdGF0ZToi5pyq5YWF55S1Iix2b2x0YWdlOjg0LjUsY3VycmVudDowLGJhdHRlcnlUZW1wOjI2LGZyb250UHJlc3N1cmU6IjIuMzViYXIiLHJlYXJQcmVzc3VyZToiMi40MGJhciIsZnJvbnRUZW1wOiIzMcKwQyIscmVhclRlbXA6IjMywrBDIix0b2RheURpc3RhbmNlOjEyLjYsdG9kYXlEdXJhdGlvbjozNCx0b2RheU1heFNwZWVkOjU2LGxhc3RSaWRlTWlsZWFnZTo4LjIsdG90YWxNaWxlYWdlOjI3MTA1LjIseWVzdGVyZGF5RGlzdGFuY2U6ODguNCxvbmxpbmU6IjEiLHBvd2VyU3RhdHVzOiIwIixsb2NrU3RhdGU6IjEiLGN1c2hpb25TdGF0ZToiMCIsYWRkcmVzczoi56aP5bu655yB5a6B5b635biC6JWJ5Z+O5Yy65Lic5L6o5byA5Y+R5Yy6Iixsb2NhdGlvblRpbWU6IjA4OjEyIixsb25naXR1ZGU6MTE5LjU1MDksbGF0aXR1ZGU6MjYuNjY1NCxzZXJ2aWNlRW5kRGF0ZToiMjAyNy0wMy0xOCJ9fSwKe3VzZXJOYW1lOiLlsI/mu6EiLHVzZXJJZDoiMjAyNjAxMDExMTIyMzM0NCIsc2NvcmU6NTIwLHNpZ25lZFRvZGF5OmZhbHNlLGNvbnRpbnVlRGF5czozLHRvZGF5U2NvcmU6MCxzaWduQ291bnQ6OSx0b2tlblZhbGlkOmZhbHNlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNiIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNyIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA4IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDkiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0xMCIsc2lnbmVkOmZhbHNlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6dHJ1ZSx2ZWhpY2xlTmFtZToi5p6B5qC4IEFFNiIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAyIixiYXR0ZXJ5UGVyY2VudDoyMyxyZXNpZHVhbFJhbmdlS206MjAscmFuZ2VFc3RpbWF0ZWQ6dHJ1ZSxjaGFyZ2VTdGF0ZToi5YWF55S15LitIix2b2x0YWdlOjg2LjIsY3VycmVudDo1LjQsYmF0dGVyeVRlbXA6MzEsdG90YWxNaWxlYWdlOjAseWVzdGVyZGF5RGlzdGFuY2U6MCxjdXJyZW50VmluOiJMQjdKTTFDMTBOQTAwMDAwMiIsdmVoaWNsZXM6W3tuYW1lOiLmnoHmoLggQUU2Iix2aW5ObzoiTEI3Sk0xQzEwTkEwMDAwMDIifSx7bmFtZToiQUU1aVByb01heCIsdmluTm86IkxCN0pNMUMxME5BMDAwMDAzIn1dLGZyb250UHJlc3N1cmU6IjIuMTBiYXIiLHJlYXJQcmVzc3VyZToiIixmcm9udFRlbXA6IiIscmVhclRlbXA6IiIsdG9kYXlEaXN0YW5jZTowLHRvZGF5RHVyYXRpb246MCx0b2RheU1heFNwZWVkOjAsbGFzdFJpZGVNaWxlYWdlOjAsb25saW5lOiIwIixwb3dlclN0YXR1czoiMSIsbG9ja1N0YXRlOiIwIixjdXNoaW9uU3RhdGU6IjEiLGFkZHJlc3M6IiIsbG9jYXRpb25UaW1lOiIiLGxvbmdpdHVkZToiIixsYXRpdHVkZToiIixzZXJ2aWNlRW5kRGF0ZToiIn19LAp7dXNlck5hbWU6Imx15bCP5Y+3Iix1c2VySWQ6IjIwMjYwOTI1MDAwOTQxMjgzIixzY29yZToxMTUsc2lnbmVkVG9kYXk6dHJ1ZSxjb250aW51ZURheXM6NCx0b2RheVNjb3JlOjQsc2lnbkNvdW50OjQsdG9rZW5WYWxpZDp0cnVlLGxhc3Q3Olt7ZGF0ZToiMDktMDQiLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wNSIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA2IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMDciLHNpZ25lZDp0cnVlLGlzVG9kYXk6ZmFsc2V9LHtkYXRlOiIwOS0wOCIsc2lnbmVkOnRydWUsaXNUb2RheTpmYWxzZX0se2RhdGU6IjA5LTA5IixzaWduZWQ6dHJ1ZSxpc1RvZGF5OmZhbHNlfSx7ZGF0ZToiMDktMTAiLHNpZ25lZDp0cnVlLGlzVG9kYXk6dHJ1ZX1dLHZlaGljbGU6e2hhc1ZlaGljbGU6ZmFsc2V9fQpdOwpjb25zdCBERU1PX0xPR1M9Wwp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxMiIsdHlwZToic2lnbmluIix1c2VyTmFtZToi6Zi/5rO9IixzdWNjZXNzOnRydWUsdG90YWxHYWluOjEyLHNpZ25pblNjb3JlOjYsYmxpbmRCb3hTY29yZTo2LGludGVyYWN0U2NvcmU6MCxjb250aW51ZURheXM6NDIsc3RlcHM6WyLnrb7liLDmiJDlip8gKzYiLCLnm7Lnm5LojrflvpcgKzYgKOenr+WIhikiLCLnm7Lnm5LmnKrop6PplIEoMzYvMzApIl19LAp7dGltZToiMjAyNi0wOS0xMCAwNzowMDoxNSIsdHlwZToic2lnbmluIix1c2VyTmFtZToi5bCP5ruhIixzdWNjZXNzOmZhbHNlLGVycm9yOiJUb2tlbuW3sui/h+acnyIsc3RlcHM6WyLnrb7liLDlpLHotKU6IOivt+WFiOeZu+W9lSJdfSwKe3RpbWU6IjIwMjYtMDktMDkgMjI6MzE6MDUiLHR5cGU6InZlaGljbGUiLHVzZXJOYW1lOiLpmL/ms70iLHN1Y2Nlc3M6dHJ1ZSxhY3Rpb25UZXh0OiLkupHnq6/lvIDplIEiLG1lc3NhZ2U6IuS6keerr+W8gOmUgeaMh+S7pOW3suS4i+WPkSIsc3RlcHM6W119Cl07CgovKiA9PT09PT09PT09PT09PT09PSDliLfmlrAgJiDliJ3lp4vljJYgPT09PT09PT09PT09PT09PT0gKi8KbGV0IGxvYWRpbmc9ZmFsc2U7Ci8vIOWFpeWcuumXquWxj++8mumhtemdouWPr+S6pOS6ku+8iOmqqOaetuWxj+W3sua4suafk++8ieWNs+aSpOS4i++8jOS4jeWGjeetiee9kee7nOaVsOaNru+8m+aVsOaNruWIsOi+vuWQjuWGjeWhq+WFhQpmdW5jdGlvbiBoaWRlU3BsYXNoKCl7Y29uc3Qgcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgic3BsYXNoIik7aWYoIXMpcmV0dXJuO3MuY2xhc3NMaXN0LmFkZCgib3V0Iik7c2V0VGltZW91dCgoKT0+e2lmKHMucGFyZW50Tm9kZSlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocyl9LDQ1MCl9CmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBbGwoc2lsZW50KXsKICBpZihsb2FkaW5nKXJldHVybjtsb2FkaW5nPXRydWU7CiAgaWYoIXNpbGVudCl7Y29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VIb21lIik7aWYoIVNUQVRFLmRhdGEubGVuZ3RoKWVsLmlubmVySFRNTD1za2VsZXRvbkhvbWUoKX0KICBoaWRlU3BsYXNoKCk7CiAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLmdldERhc2hib2FyZCgpOwogIGxvYWRpbmc9ZmFsc2U7CiAgaWYoZCYmZC5vayl7U1RBVEUuZGF0YT1kLmFjY291bnRzfHxbXTtTVEFURS50c1RleHQ9Zm10VGltZShkLnRpbWVzdGFtcHx8bmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtTVEFURS5wcm94eT1pc1Byb3h5TW9kZSgpO3JlbmRlckhvbWUoKX0KICBlbHNle2NvbnN0IGhpbnQ9ZCYmZC5yYXcmJmQucmF3LmVycm9yP25ldHdvcmtIaW50KGQucmF3KToiIjtjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZUhvbWUiKTtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nKyhoaW50fHxlc2MoKGQmJmQuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+35qOA5p+l572R57uc6L+e5o6lIikpKyc8L3A+PGRpdiBjbGFzcz0iYnRuLXJvdyIgc3R5bGU9Imp1c3RpZnktY29udGVudDpjZW50ZXIiPjxidXR0b24gY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeivlTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biIgb25jbGljaz0ic3dpdGNoVGFiKFwnY2ZnXCcpIj7mo4Dmn6Xorr7nva48L2J1dHRvbj48L2Rpdj48L2Rpdj4nfQp9Ci8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg56ev5YiG6aG1ID09PT09PT09PT09PT09PT09ICovCmxldCBQVD17YWNjSWR4OjAsbW9udGg6IiIsbW9udGhTZXREYXk6IiJ9OwpmdW5jdGlvbiBwdEFjY291bnRzKCl7cmV0dXJuIFNUQVRFLmRhdGEmJlNUQVRFLmRhdGEubGVuZ3RoP1NUQVRFLmRhdGE6KFNUQVRFLnBhbmVsQWNjb3VudHN8fFtdKS5tYXAoYT0+KHt1c2VyTmFtZTphLnVzZXJOYW1lfHwi6LSm5Y+3Iix1c2VySWQ6YS51c2VySWR8fCIifSkpfQpmdW5jdGlvbiBhY2NDaGlwc0h0bWwocHJlZml4KXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTsKICBpZighbGlzdC5sZW5ndGgpcmV0dXJuIiI7CiAgY29uc3QgY3VyPXByZWZpeD09PSJwdCI/UFQuYWNjSWR4OihwcmVmaXg9PT0icnQiP1JULmFjY0lkeDpWSC5hY2NJZHgpOwogIHJldHVybiAnPGRpdiBjbGFzcz0iYWNjLWNoaXBzIj4nK2xpc3QubWFwKChhLGkpPT4nPGJ1dHRvbiBjbGFzcz0iYWNjLWNoaXAgJysoaT09PWN1cj8nb24nOicnKSsnIiBvbmNsaWNrPSJwaWNrQWNjKFwnJytwcmVmaXgrJ1wnLCcraSsnKSI+Jytlc2MoYS51c2VyTmFtZXx8KCLotKblj7ciKyhpKzEpKSkrJzwvYnV0dG9uPicpLmpvaW4oIiIpKyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIHBpY2tBY2MocHJlZml4LGkpe2lmKHByZWZpeD09PSJwdCIpe1BULmFjY0lkeD1pO3JlbmRlclBvaW50cygpfWVsc2UgaWYocHJlZml4PT09InJ0Iil7UlQuYWNjSWR4PWk7UlQudHJhY2tzPW51bGw7UlQudHJhY2tzQXQ9IiI7UlQudHJhY2tzUmlkZXM9MDtSVC50cmFja3NEYXlzPTA7UlQuc2NhbkVycj0iIjtSVC52aW49IiI7cmVuZGVyUmlkZVBhZ2UoKX1lbHNle1ZILmFjY0lkeD1pO1ZILnZpbj0iIjtyZW5kZXJWZWhpY2xlUGFnZSgpfX0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUG9pbnRzKCl7CiAgY29uc3QgZWw9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInBhZ2VQb2ludHMiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFBULmFjY0lkeD49bGlzdC5sZW5ndGgpUFQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUFQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicHQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3np6/liIbmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICAvLyB2Mi4xNC4yMCDml6Xljobot6jmnIjkv67mraPvvJrpnaLmnb/luLjpqbvml7YgUFQubW9udGgg5Y+v6IO95rue55WZ5LiK5pyI44CC6Leo5Yiw5paw5pyI5Lu977yI5LuK5aSp5LiN5piv6K6+572u6K+l5pyI5Lu96YKj5aSp77yJ5ZCO6Ieq5Yqo5Zue5Yiw5b2T5YmN5pyI77yMCiAgLy8g6YG/5YWNIDEw5pyIMeWPtyDml7bml6Xljobku43lgZzlnKggOeaciDMw5Y+377yI5LiK5pyI77yJ5pi+56S65LiN5YeG56Gu44CCCiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPV9ub3cuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgX3RkeT1fbm93LmdldEZ1bGxZZWFyKCkrIi0iK1N0cmluZyhfbm93LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcoX25vdy5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICBpZihQVC5tb250aCYmUFQubW9udGhTZXREYXkmJlBULm1vbnRoU2V0RGF5IT09X3RkeSYmUFQubW9udGg8X2N1ck0pe1BULm1vbnRoPSIiO1BULm1vbnRoU2V0RGF5PSIiO30KICBjb25zdCBtb250aD1QVC5tb250aHx8X2N1ck07CiAgY29uc3QgW2l0LGNhbCxjbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC5pbnRlZ3JhbChhY2MudXNlcklkLDEpLAogICAgQmFja2VuZC5zdXBwbGVtZW50KCJtb250aCIsYWNjLnVzZXJJZCx7bW9udGg6bW9udGh9KSwKICAgIEJhY2tlbmQuc3VwcGxlbWVudCgiY291bnQiLGFjYy51c2VySWQse30pCiAgXSk7CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJwdCIpOwogIC8vIOaAu+iniO+8iHYyLjE0LjIwIOWFvOWuuSBkYXRhIOS4uue6r+aVsOWtl+aIluWvueixoeS4pOenjei/lOWbnu+8iQogIGNvbnN0IHRvdGFsPShpdCYmaXQudG90YWwhPW51bGwpPygodHlwZW9mIGl0LnRvdGFsPT09Im51bWJlciJ8fCh0eXBlb2YgaXQudG90YWw9PT0ic3RyaW5nIiYmaXQudG90YWwhPT0iIikpP1N0cmluZyhpdC50b3RhbCk6ZGVlcFBpY2soaXQudG90YWwsWyJpbnRlZ3JhbFRvdGFsIiwidG90YWxJbnRlZ3JhbCIsInNjb3JlIiwiaW50ZWdyYWwiLCJ0b3RhbCJdLDQpKToiIjsKICBjb25zdCBjYXJkTnVtPShjbnQmJmNudC5kYXRhIT1udWxsKT8oKHR5cGVvZiBjbnQuZGF0YT09PSJudW1iZXIifHwodHlwZW9mIGNudC5kYXRhPT09InN0cmluZyImJmNudC5kYXRhIT09IiIpKT9TdHJpbmcoY250LmRhdGEpOmRlZXBQaWNrKGNudC5kYXRhLFsiY291bnQiLCJjYXJkTnVtIiwiY2FyZENvdW50IiwibnVtYmVyIiwibnVtIiwic2lnbkNvdW50Iiwic2lnblN1cHBsZW1lbnRDb3VudCIsInJlaXNzdWVDYXJkTnVtIiwic3VwcGxlbWVudENhcmROdW0iLCJjYXJkVG90YWwiLCJ0b3RhbCJdLDQpKToiIjsKICBodG1sKz0nPGRpdiBjbGFzcz0icHQtZ3JpZCI+JwogICAgKyc8ZGl2IGNsYXNzPSJwdC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5b2T5YmN5oC756ev5YiGPC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj4nK2VzYyh0b3RhbHx8Ii0tIikrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icHQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuihpeetvuWNoTwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MoY2FyZE51bXx8Ii0tIikrJzwvZGl2PjxkaXYgY2xhc3M9InN1YiI+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiIG9uY2xpY2s9InN1cEdhaW4oKSI+56ev5YiG5YWR5o2i6KGl562+5Y2hPC9idXR0b24+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nOwogIC8vIOebsuebkui/m+W6pu+8iHYyLjE0LjE0IOi1t+eUsemmlumhtei/geenu+iHs+atpO+8iQogIGNvbnN0IGNvbnQ9TnVtYmVyKGFjYy5jb250aW51ZURheXN8fDApOwogIGNvbnN0IGJEYXk9Y29udD09PTA/MDooKGNvbnQtMSklMzApKzE7Y29uc3QgYlJvdW5kPWNvbnQ9PT0wPzA6TWF0aC5jZWlsKGNvbnQvMzApO2NvbnN0IGJQY3Q9TWF0aC5yb3VuZCgoYkRheS8zMCkqMTAwKTsKICBodG1sKz0nPGRpdiBjbGFzcz0iYmxpbmQiIHN0eWxlPSJtYXJnaW46MCAwIDEycHgiPjxkaXYgY2xhc3M9ImJsaW5kLXRvcCI+PHNwYW4+55uy55uS6L+b5bqm77yI56ysJytiUm91bmQrJ+i9ru+8iTwvc3Bhbj48c3BhbiBjbGFzcz0iciBudW0iPicrYkRheSsnIC8gMzAgwrcgJytiUGN0KyclIMK3IOi/nuetviAnK2NvbnQrJyDlpKk8L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz0iYmxpbmQtYmFyIj48ZGl2IGNsYXNzPSJibGluZC1maWxsIiBzdHlsZT0id2lkdGg6JytiUGN0KyclIj48L2Rpdj48L2Rpdj48L2Rpdj4nOwogIC8vIOetvuWIsOaXpeWOhgogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNoZWNrKyfnrb7liLDml6XljoYgwrcgJytlc2MobW9udGgpKyc8L2g0PjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icHRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PC9kaXY+JzsKICBjb25zdCBkYXlzPShjYWwmJmNhbC5kYXRhJiZjYWwuZGF0YS5ub3dTaWduRGV0YWlsVm9zKXx8W107CiAgaWYoZGF5cy5sZW5ndGgpewogICAgaHRtbCs9Y2FsSHRtbChkYXlzLG1vbnRoLGFjYy51c2VySWQpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPicrKGNhbCYmY2FsLm1lc3NhZ2U/ZXNjKGNhbC5tZXNzYWdlKToi5pel5Y6G5Yqg6L295aSx6LSl77yI5Y+v6IO96ZmQ5rWB77yM56iN5ZCO5YaN6K+V77yJIikrJzwvZGl2Pic7CiAgfQogIGh0bWwrPSc8L2Rpdj4nOwogIC8vIHYyLjE0LjIxIOWIoOmZpOenr+WIhua1geawtO+8iOenr+WIhuivpuaDhe+8ieWMuuWdlwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJmb290Ij7np6/liIbmlbDmja7mnaXoh6rmnoHmoLjlrp7ml7YgQVBJIMK3IOihpeetvumZkCAzMCDlpKnlhoXmvI/nrb7vvIzmr4/mrKHmtojogJcgMSDlvKDooaXnrb7ljaE8L2Rpdj4nOwogIGVsLmlubmVySFRNTD1odG1sOwp9CmZ1bmN0aW9uIGNhbEh0bWwoZGF5cyxtb250aCx1c2VySWQpewogIGNvbnN0IHltPW1vbnRoLnNwbGl0KCItIik7Y29uc3QgeT1OdW1iZXIoeW1bMF0pLG09TnVtYmVyKHltWzFdKTsKICBjb25zdCBmaXJzdD1uZXcgRGF0ZSh5LG0tMSwxKS5nZXREYXkoKTsKICBjb25zdCBkaW09bmV3IERhdGUoeSxtLDApLmdldERhdGUoKTsKICBjb25zdCB0b2RheT1uZXcgRGF0ZSgpO2NvbnN0IHRTdHI9dG9kYXkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKHRvZGF5LmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyItIitTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIik7CiAgbGV0IGg9JzxkaXYgY2xhc3M9ImNhbC1ncmlkIj4nOwogIFsi5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl0uZm9yRWFjaCh3PT57aCs9JzxkaXYgY2xhc3M9ImNhbC13ZCI+Jyt3Kyc8L2Rpdj4nfSk7CiAgZm9yKGxldCBpPTA7aTxmaXJzdDtpKyspaCs9JzxkaXYgY2xhc3M9ImNhbC1kIGJsYW5rIj48L2Rpdj4nOwogIGZvcihsZXQgZD0xO2Q8PWRpbTtkKyspewogICAgY29uc3QgZHM9bW9udGgrIi0iK1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIik7CiAgICBjb25zdCBlbnRyeT1kYXlzLmZpbmQoeD0+eC5jcmVhdGVEYXRlPT09ZHMpOwogICAgY29uc3Qgc2lnbmVkPWVudHJ5JiYoZW50cnkuc2lnblN0YXR1ZT09M3x8ZW50cnkuc2lnblN0YXR1ZT09NXx8ZW50cnkuc2lnblN0YXR1ZT09MCk7CiAgICBjb25zdCBpc1RvZGF5PWRzPT09dFN0cjsKICAgIGNvbnN0IGZ1dHVyZT1kcz50U3RyOwogICAgbGV0IGNscz0iY2FsLWQiKyhzaWduZWQ/IiBzaWduZWQiOihmdXR1cmU/IiBmdXR1cmUiOihlbnRyeT8iIG1pc3MiOiIiKSkpOwogICAgaWYoaXNUb2RheSljbHMrPSIgdG9kYXkiOwogICAgY29uc3QgY2xpY2thYmxlPSFzaWduZWQmJiFmdXR1cmUmJmVudHJ5OwogICAgaCs9JzxkaXYgY2xhc3M9IicrY2xzKyciICcrKGNsaWNrYWJsZT8nc3R5bGU9ImN1cnNvcjpwb2ludGVyIiBvbmNsaWNrPSJzdXBDb25zdW1lKFwnJytkcysnXCcsXCcnK2VzYyh1c2VySWQpKydcJykiJzonJykrJz4nCiAgICAgICsnPHNwYW4+JytkKyc8L3NwYW4+JwogICAgICArJzxzcGFuIGNsYXNzPSJkb3QiPicrKHNpZ25lZD8i4pyTIjooZnV0dXJlPyIiOihlbnRyeT8i5ryPIjoiIikpKSsnPC9zcGFuPicKICAgICAgKyc8L2Rpdj4nOwogIH0KICBoKz0nPC9kaXY+JzsKICBoKz0nPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+54K55Ye744CM5ryP44CN5pel5pyf5L2/55So6KGl562+5Y2h6KGl562+77yI6ZyA5YWI5pyJ6KGl562+5Y2h77yJPC9kaXY+JzsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBwdE1vbnRoU2hpZnQoZGlyKXsKICBjb25zdCBjdXI9UFQubW9udGh8fG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKG5ldyBEYXRlKCkuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIik7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCItIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBQVC5tb250aD15KyItIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIC8vIOiusOW9leiuvue9ruivpeaciOS7veeahOW9k+Wkqe+8jOi3qOaciOWQjiByZW5kZXJQb2ludHMg5o2u5q2k5oqK5rue55WZ55qE5LiK5pyI6Ieq5Yqo5aSN5L2N5Yiw5b2T5YmN5pyICiAgY29uc3QgZD1uZXcgRGF0ZSgpOwogIFBULm1vbnRoU2V0RGF5PWQuZ2V0RnVsbFllYXIoKSsiLSIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi0iK1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIHJlbmRlclBvaW50cygpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cENvbnN1bWUoZGF0ZSx1c2VySWQpewogIGNvbmZpcm1EaWFsb2coIuenr+WIhuihpeetviIsIuS9v+eUqCAxIOW8oOihpeetvuWNoeihpeetviAiK2RhdGUrIiDvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi6KGl562+5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImNvbnN1bWUiLHVzZXJJZCx7ZGF0ZVRpbWU6ZGF0ZX0pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuihpeetvuaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLooaXnrb7lpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOihpeetviIpOwp9CmFzeW5jIGZ1bmN0aW9uIHN1cEdhaW4oKXsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtQVC5hY2NJZHhdO2lmKCFhY2N8fCFhY2MudXNlcklkKXJldHVybjsKICBjb25maXJtRGlhbG9nKCLlhZHmjaLooaXnrb7ljaEiLCLkvb/nlKjnp6/liIblhZHmjaIgMSDlvKDooaXnrb7ljaHvvJ8iLGFzeW5jIGZ1bmN0aW9uKCl7CiAgICB0b2FzdCgi5YWR5o2i5Lit4oCmIiwiaW5mbyIpOwogICAgY29uc3QgZD1hd2FpdCBCYWNrZW5kLnN1cHBsZW1lbnQoImdhaW4iLGFjYy51c2VySWQse30pOwogICAgaWYoZCYmZC5vayl7dG9hc3QoIuWFkeaNouaIkOWKnyIsIm9rIik7cmVuZGVyUG9pbnRzKCl9CiAgICBlbHNlIHRvYXN0KCLlhZHmjaLlpLHotKXvvJoiKygoZCYmKGQubWVzc2FnZXx8ZC5lcnJvcikpfHwi5pyq55+lIiksImVyciIpOwogIH0sIuehruiupOWFkeaNoiIpOwp9CgovKiA9PT09PT09PT09PT09PT09PSB2Mi4xNi4wIOmqkeihjOmhte+8iOmakOiXj+mqkeihjOaVsOaNru+8muaegemAny/mgKXliqDpgJ8v5oCl5Yi5L+WOi+W8r++8iSA9PT09PT09PT09PT09PT09PSAqLwpsZXQgUlQ9e2FjY0lkeDowLG1vbnRoOiIiLG1vbnRoU2V0RGF5OiIiLHRyYWNrczpudWxsLHRyYWNrc0F0OiIiLHRyYWNrc1JpZGVzOjAsdHJhY2tzRGF5czowLHNjYW5uaW5nOmZhbHNlLHNjYW5FcnI6IiIsdmluOiIiLGRheUNhY2hlOltdfTsKZnVuY3Rpb24gcnRDdXJNb250aCgpe2NvbnN0IG49bmV3IERhdGUoKTtyZXR1cm4gbi5nZXRGdWxsWWVhcigpKyIuIitTdHJpbmcobi5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKX0KZnVuY3Rpb24gcnRNb250aFNoaWZ0KGRpcil7CiAgY29uc3QgY3VyPVJULm1vbnRofHxydEN1ck1vbnRoKCk7CiAgY29uc3QgeW09Y3VyLnNwbGl0KCIuIik7bGV0IHk9TnVtYmVyKHltWzBdKSxtPU51bWJlcih5bVsxXSkrZGlyOwogIGlmKG08MSl7bT0xMjt5LS19aWYobT4xMil7bT0xO3krK30KICBSVC5tb250aD15KyIuIitTdHJpbmcobSkucGFkU3RhcnQoMiwiMCIpOwogIGNvbnN0IGQ9bmV3IERhdGUoKTtSVC5tb250aFNldERheT1kLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICByZW5kZXJSaWRlUGFnZSgpOwp9CmZ1bmN0aW9uIHJ0V2Vla2RheShkayl7CiAgdHJ5e2NvbnN0IHA9U3RyaW5nKGRrfHwiIikuc3BsaXQoIi4iKTtjb25zdCBkPW5ldyBEYXRlKE51bWJlcihwWzBdKSxOdW1iZXIocFsxXSktMSxOdW1iZXIocFsyXSkpO2lmKGlzTmFOKGQuZ2V0VGltZSgpKSlyZXR1cm4iIjtyZXR1cm4gIiDlkagiK1si5pelIiwi5LiAIiwi5LqMIiwi5LiJIiwi5ZubIiwi5LqUIiwi5YWtIl1bZC5nZXREYXkoKV19Y2F0Y2goZSl7cmV0dXJuIiJ9Cn0KZnVuY3Rpb24gcnREYXlIdG1sKGQsaSl7CiAgY29uc3QgbWQ9U3RyaW5nKGQuZGt8fCIiKS5zcGxpdCgiLiIpOwogIGNvbnN0IGxhYmVsPW1kLmxlbmd0aD09PTM/KG1kWzFdKyIuIittZFsyXSk6U3RyaW5nKGQuZGt8fCIiKTsKICBjb25zdCBrbVR4dD1kLmttPjA/KGQua20+PTEwMD9kLmttLnRvRml4ZWQoMCk6ZC5rbS50b0ZpeGVkKDEpKSsia20iOiIiOwogIGNvbnN0IGR1clR4dD1kLmR1cj4wPyhmbXRNaW4oZC5kdXIpfHwoTWF0aC5yb3VuZChkLmR1cikrIm1pbiIpKToiIjsKICBjb25zdCBjbGljaz1kLnJpZGVzLmxlbmd0aD8nIHN0eWxlPSJjdXJzb3I6cG9pbnRlciIgb25jbGljaz0icnRSaWRlU2hlZXQoJytpKycpIic6IiI7CiAgcmV0dXJuICc8ZGl2IGNsYXNzPSJydC1kYXkiJytjbGljaysnPicKICAgICsnPGRpdiBjbGFzcz0icnQtdG9wIj48c3BhbiBjbGFzcz0icnQtZGF0ZSI+Jytlc2MobGFiZWwpKyc8c3BhbiBjbGFzcz0id2QiPicrZXNjKHJ0V2Vla2RheShkLmRrKSkrJzwvc3Bhbj48L3NwYW4+PHNwYW4gY2xhc3M9InJ0LWttIG51bSI+Jytlc2MoW2ttVHh0LGR1clR4dF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oIiDCtyAiKXx8Ii0tIikrJzwvc3Bhbj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNoaXBzIj4nCiAgICArJzxzcGFuIGNsYXNzPSJydC1jaGlwIj7mnoHpgJ88YiBjbGFzcz0ibnVtIj4nKyhkLm1heFY+MD9NYXRoLnJvdW5kKGQubWF4Vik6Ii0tIikrJzwvYj48L3NwYW4+JwogICAgKyc8c3BhbiBjbGFzcz0icnQtY2hpcCI+5oCl5Yqg6YCfPGIgY2xhc3M9Im51bSI+JytkLmFjY2VsKyc8L2I+PC9zcGFuPicKICAgICsnPHNwYW4gY2xhc3M9InJ0LWNoaXAnKyhkLmNhbD8nIGNhbCc6JycpKyciPuaApeWIuTxiIGNsYXNzPSJudW0iPicrZC5icmFrZXMrJzwvYj48L3NwYW4+JwogICAgKyc8c3BhbiBjbGFzcz0icnQtY2hpcCcrKGQuY2FsPycgY2FsJzonJykrJyI+5Y6L5byvPGIgY2xhc3M9Im51bSI+JytkLmJlbmRzKyc8L2I+PC9zcGFuPicKICAgICsoZC5yaWRlcy5sZW5ndGg/JzxzcGFuIGNsYXNzPSJydC1jaGlwIGxpbmsiPui9qOi/uSAnK2QucmlkZXMubGVuZ3RoKycg6LafIOKAujwvc3Bhbj4nOiIiKQogICAgKyc8L2Rpdj48L2Rpdj4nOwp9CmZ1bmN0aW9uIHJ0UmlkZVNoZWV0KGkpewogIGNvbnN0IGQ9KFJULmRheUNhY2hlfHxbXSlbaV07CiAgaWYoIWR8fCFkLnJpZGVzfHwhZC5yaWRlcy5sZW5ndGgpcmV0dXJuOwogIGNvbnN0IGh0bWw9ZC5yaWRlcy5tYXAocj0+ewogICAgY29uc3Qgc3RhcnQ9ci50MHN0cj9yLnQwc3RyLnNsaWNlKDExLDE2KTooci50MD9mbXRUaW1lKG5ldyBEYXRlKHIudDApLnRvSVNPU3RyaW5nKCkpLnNsaWNlKDExLDE2KToiLS06LS0iKTsKICAgIGNvbnN0IGVuZD1yLnQxc3RyP3IudDFzdHIuc2xpY2UoMTEsMTYpOiIiOwogICAgY29uc3Qga209ci5zcnZLbT4wP3Iuc3J2S206ci5rbTsKICAgIGNvbnN0IGR1cj1yLnNydkR1cj4wP3Iuc3J2RHVyOnIuZHVyOwogICAgY29uc3QgYXZnPWR1cj4wPyhrbS8oZHVyLzYwKSk6MDsKICAgIHJldHVybiAnPGRpdiBjbGFzcz0iZmxvdy1pdGVtIj48ZGl2IHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjAiPjxkaXYgY2xhc3M9Im5tIj4nK2VzYyhzdGFydCkrKGVuZD8oJyDihpIgJytlc2MoZW5kKSk6IiIpKycg6aqR6KGMPC9kaXY+JwogICAgICArKHIuYWRkcj8nPGRpdiBjbGFzcz0idG0iIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3JtYWwiPicrZXNjKHIuYWRkcikrJzwvZGl2Pic6IiIpCiAgICAgICsnPGRpdiBjbGFzcz0idG0iPicrZXNjKGttLnRvRml4ZWQoMSkpKydrbSDCtyAnK2VzYyhmbXRNaW4oZHVyKXx8KE1hdGgucm91bmQoZHVyKSsibWluIikpKycgwrcg5Z2H6YCfICcrTWF0aC5yb3VuZChhdmcpKydrbS9oIMK3IOaegemAnyAnK01hdGgucm91bmQoci5tYXhWKSsnPC9kaXY+JwogICAgICArJzxkaXYgY2xhc3M9InRtIj7mgKXliqDpgJ8gJytyLnNydkFjY2VsKycgwrcg5oCl5Yi5ICcrci5icmFrZXMrJyDCtyDljovlvK8gJytyLmJlbmRzKyfvvIjpmpDol4/nrpfms5XvvIk8L2Rpdj48L2Rpdj4nCiAgICAgICsoci50aHVtYj8nPGltZyBzcmM9IicrZXNjKHIudGh1bWIpKyciIHN0eWxlPSJ3aWR0aDo1MnB4O2hlaWdodDo1MnB4O2JvcmRlci1yYWRpdXM6MTBweDtvYmplY3QtZml0OmNvdmVyO21hcmdpbi1sZWZ0OjhweDtmbGV4LXNocmluazowIiBvbmVycm9yPSJ0aGlzLnJlbW92ZSgpIj4nOiIiKQogICAgICArJzwvZGl2Pic7CiAgfSkuam9pbigiIik7CiAgb3BlblNoZWV0KChkLmRrfHwiIikrIiDpqpHooYzmmI7nu4YiLEkubWFwLGh0bWwrJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPumHjOeoiy/ml7bplb8v5p6B6YCfL+aApeWKoOmAn+S4uuacjeWKoeerr+ecn+WAvO+8iOaApeWKoOmAnz3mnI3liqHnq6/orqHmrKHvvInvvJvmgKXliLkv5Y6L5byv5Li66ZqQ6JeP566X5rOV6K6h5pWw77yI56e75qSNIFNwZWVkSHVudGVy77yM5Y+M56qX5Y+j5ZCI5bm25ZCOIMOXMi41IOagh+Wumu+8iTwvZGl2PicpOwp9CmFzeW5jIGZ1bmN0aW9uIHJ0U2NhbigpewogIGlmKFJULnNjYW5uaW5nKXJldHVybjsKICBjb25zdCBsaXN0PXB0QWNjb3VudHMoKTtjb25zdCBhY2M9bGlzdFtSVC5hY2NJZHhdfHx7fTsKICBpZighYWNjLnVzZXJJZCl7dG9hc3QoIuivpei0puWPt+e8uuWwkeeUqOaIt0lEIiwiZXJyIik7cmV0dXJufQogIGNvbnN0IG1vbnRoPVJULm1vbnRofHxydEN1ck1vbnRoKCk7CiAgUlQuc2Nhbm5pbmc9dHJ1ZTtSVC5zY2FuRXJyPSIiO3JlbmRlclJpZGVQYWdlKCk7CiAgdG9hc3QoIuato+WcqOaLieWPliAiK21vbnRoKyIg6L2o6L+55bm26K6h566X6ZqQ6JeP5pWw5o2u4oCmIiwiaW5mbyIpOwogIGxldCBhbGxEYXlzPVtdLHJpZGVzPTAsZXJyPSIiOwogIHRyeXsKICAgIGZvcihsZXQgcGFnZT0xO3BhZ2U8PTE1O3BhZ2UrKyl7CiAgICAgIGNvbnN0IHI9YXdhaXQgQmFja2VuZC5yaWRlVHJhY2soYWNjLnVzZXJJZCxSVC52aW58fCIiLHBhZ2UsMjAsbW9udGgpOwogICAgICBpZighcnx8IXIub2spe2Vycj0ociYmKHIuZXJyb3J8fHIubWVzc2FnZSkpfHwi5o6l5Y+j5peg5ZON5bqUIjticmVha30KICAgICAgaWYoci52aW5ObyYmIVJULnZpbilSVC52aW49ci52aW5ObzsKICAgICAgY29uc3QgZGF5cz1BcnJheS5pc0FycmF5KHIuZGF5cyk/ci5kYXlzOltdOwogICAgICBsZXQgY250PTA7CiAgICAgIGZvcihjb25zdCBkZCBvZiBkYXlzKWlmKGRkJiZBcnJheS5pc0FycmF5KGRkLmhpc3RvcnlMaXN0KSljbnQrPWRkLmhpc3RvcnlMaXN0Lmxlbmd0aDsKICAgICAgYWxsRGF5cz1hbGxEYXlzLmNvbmNhdChkYXlzKTtyaWRlcys9Y250OwogICAgICBpZihjbnQ9PT0wKWJyZWFrOwogICAgfQogIH1jYXRjaChlKXtlcnI9U3RyaW5nKGUpfQogIGlmKGFsbERheXMubGVuZ3RoKXsKICAgIFJULnRyYWNrcz1yaWRlRGF5U2NhbihhbGxEYXlzKTsKICAgIFJULnRyYWNrc0F0PWZtdFRpbWUobmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtSVC50cmFja3NSaWRlcz1yaWRlczsKICAgIGxldCBuRGF5cz0wO2Zvcihjb25zdCBrIGluIFJULnRyYWNrcylpZihSVC50cmFja3Nba10mJlJULnRyYWNrc1trXS5yaWRlcyYmUlQudHJhY2tzW2tdLnJpZGVzLmxlbmd0aCluRGF5cysrOwogICAgUlQudHJhY2tzRGF5cz1uRGF5czsKICAgIGlmKCFuRGF5cylSVC5zY2FuRXJyPSLmjqXlj6Plt7Lov57pgJrvvIzkvYbmnKrov5Tlm57ovajov7nmlbDmja7vvIjor6XovabmmoLml6Dljoblj7Lovajov7norrDlvZXvvIkiOwogIH1lbHNlewogICAgUlQuc2NhbkVycj1lcnJ8fCLmnKrlj5bliLDovajov7nmlbDmja7vvIjor6Xovablj6/og73msqHmnInljoblj7Lovajov7norrDlvZXvvIkiOwogIH0KICBSVC5zY2FubmluZz1mYWxzZTsKICByZW5kZXJSaWRlUGFnZSgpOwogIGlmKFJULnNjYW5FcnIpdG9hc3QoUlQuc2NhbkVyciwiZXJyIik7ZWxzZSB0b2FzdCgi6L2o6L+55omr5o+P5a6M5oiQ77yaIityaWRlcysiIOi2n+ihjOeoiyIsIm9rIik7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyUmlkZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVJpZGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFJULmFjY0lkeD49bGlzdC5sZW5ndGgpUlQuYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbUlQuYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgicnQiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PHA+6K+35Yiw6K6+572u6aG16KGl5YWo55So5oi3SUQ8L3A+PC9kaXY+JztyZXR1cm59CiAgY29uc3QgX25vdz1uZXcgRGF0ZSgpOwogIGNvbnN0IF9jdXJNPXJ0Q3VyTW9udGgoKTsKICBjb25zdCBfdGR5PV9ub3cuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKF9ub3cuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikrIi4iK1N0cmluZyhfbm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwiMCIpOwogIGlmKFJULm1vbnRoJiZSVC5tb250aFNldERheSYmUlQubW9udGhTZXREYXkhPT1fdGR5JiZSVC5tb250aDxfY3VyTSl7UlQubW9udGg9IiI7UlQubW9udGhTZXREYXk9IiI7fQogIGNvbnN0IG1vbnRoPVJULm1vbnRofHxfY3VyTTsKICBlbC5pbm5lckhUTUw9YWNjQ2hpcHNIdG1sKCJydCIpKyc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmc6NDBweCAyMHB4Ij48cCBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MykiPuWKoOi9vemqkeihjOaVsOaNruS4reKApjwvcD48L2Rpdj4nOwogIGNvbnN0IHJlcz1hd2FpdCBCYWNrZW5kLnJpZGVNb250aChhY2MudXNlcklkLG1vbnRoLFJULnZpbnx8IiIpOwogIGlmKHJlcyYmcmVzLnZpbk5vJiYhUlQudmluKVJULnZpbj1yZXMudmluTm87CiAgbGV0IGh0bWw9YWNjQ2hpcHNIdG1sKCJydCIpOwogIGlmKCFyZXN8fCFyZXMub2spewogICAgZWwuaW5uZXJIVE1MPWh0bWwrJzxkaXYgY2xhc3M9ImVtcHR5Ij48aDM+6aqR6KGM5pWw5o2u5Yqg6L295aSx6LSlPC9oMz48cD4nK2VzYygocmVzJiZyZXMuZXJyb3IpfHwi572R57uc5byC5bi477yM6K+356iN5ZCO6YeN6K+VIikrJzwvcD48ZGl2IGNsYXNzPSJidG4tcm93IiBzdHlsZT0ianVzdGlmeS1jb250ZW50OmNlbnRlciI+PGJ1dHRvbiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9InJlbmRlclJpZGVQYWdlKCkiPumHjeivlTwvYnV0dG9uPjwvZGl2PjwvZGl2Pic7CiAgICByZXR1cm47CiAgfQogIGNvbnN0IHJlY29yZHM9KHJlcy5kYXRhJiZBcnJheS5pc0FycmF5KHJlcy5kYXRhLnJpZGVSZWNvcmRMaXN0KSk/cmVzLmRhdGEucmlkZVJlY29yZExpc3Q6W107CiAgY29uc3QgaXNDdXI9KG1vbnRoPT09X2N1ck0pOwogIC8vIOWQiOW5tui9qOi/ueiuoeeul+e7k+aenO+8mumHjOeoiy/mnoHpgJ/mnI3liqHnq6/pnZ4w5LyY5YWI44CB5Li6MOihpeeul++8m+aApeWIuS/ljovlvK/mjInovajov7nph43nrpfvvIjmnI3liqHnq6/luLjlubTkuLow77yJCiAgY29uc3QgZGF5cz1bXTsKICBmb3IoY29uc3QgcmVjIG9mIHJlY29yZHMpewogICAgaWYoIXJlY3x8dHlwZW9mIHJlYyE9PSJvYmplY3QiKWNvbnRpbnVlOwogICAgY29uc3QgZGs9cmlkZU5vcm1EYXkocmVjLmRhdGUpfHxTdHJpbmcocmVjLmRhdGV8fCIiKTsKICAgIGNvbnN0IGNvbXA9KFJULnRyYWNrcyYmZGsmJlJULnRyYWNrc1tka10pfHxudWxsOwogICAgY29uc3Qgc3J2S209cmlkZU51bShyZWMucmlkZU1pbGVhZ2UpLHNydkR1cj1yaWRlTnVtKHJlYy5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZSksc3J2TWF4PXJpZGVOdW0ocmVjLm1heFNwZWVkKTsKICAgIGRheXMucHVzaCh7CiAgICAgIGRrOmRrLAogICAgICBrbTpzcnZLbT4wP3NydkttOihjb21wP2NvbXAua206MCksCiAgICAgIGR1cjpzcnZEdXI+MD9zcnZEdXI6KGNvbXA/Y29tcC5kdXI6MCksCiAgICAgIG1heFY6c3J2TWF4PjA/c3J2TWF4Oihjb21wP2NvbXAubWF4VjowKSwKICAgICAgYWNjZWw6cmlkZU51bShyZWMuYWNjZWxlcmF0aW9uVGltZXNEYXkpLAogICAgICBicmFrZXM6Y29tcD9jb21wLmJyYWtlczpyaWRlTnVtKHJlYy5icmFrZXNUaW1lc0RheSksCiAgICAgIGJlbmRzOmNvbXA/Y29tcC5iZW5kczpyaWRlTnVtKHJlYy5iZW5kaW5nVGltZXNEYXkpLAogICAgICBjYWw6ISFjb21wLAogICAgICByaWRlczooY29tcCYmY29tcC5yaWRlcyl8fFtdCiAgICB9KTsKICB9CiAgZGF5cy5zb3J0KChhLGIpPT5TdHJpbmcoYi5kaykubG9jYWxlQ29tcGFyZShTdHJpbmcoYS5kayksInpoIikpOwogIGNvbnN0IHZpc2libGU9ZGF5cy5maWx0ZXIoZD0+ZC5rbT4wfHxkLmR1cj4wfHxkLm1heFY+MHx8ZC5hY2NlbD4wfHxkLmJyYWtlcz4wfHxkLmJlbmRzPjApOwogIFJULmRheUNhY2hlPXZpc2libGU7CiAgbGV0IHN1bUttPTAsc3VtRHVyPTAsbWF4Vj0wLHN1bUE9MCxzdW1CPTAsc3VtRD0wOwogIGZvcihjb25zdCBkIG9mIHZpc2libGUpe3N1bUttKz1kLmttO3N1bUR1cis9ZC5kdXI7aWYoZC5tYXhWPm1heFYpbWF4Vj1kLm1heFY7c3VtQSs9ZC5hY2NlbDtzdW1CKz1kLmJyYWtlcztzdW1EKz1kLmJlbmRzfQogIGNvbnN0IGR1clR4dD1zdW1EdXI+PTYwPyhNYXRoLmZsb29yKHN1bUR1ci82MCkrImgiK1N0cmluZyhNYXRoLnJvdW5kKHN1bUR1ciU2MCkpLnBhZFN0YXJ0KDIsIjAiKSsibSIpOihzdW1EdXI+MD8oTWF0aC5yb3VuZChzdW1EdXIpKyJtaW4iKToiMCIpOwogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLm1hcCsn6ZqQ6JeP6aqR6KGM5pWw5o2uIMK3ICcrZXNjKG1vbnRoKSsnPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icnRNb250aFNoaWZ0KC0xKSI+5LiK5pyIPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBvbmNsaWNrPSJydE1vbnRoU2hpZnQoMSkiPuS4i+aciDwvYnV0dG9uPjwvc3Bhbj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWdyaWQiPicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPumHjOeoizwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2Moc3VtS20+MD9zdW1LbS50b0ZpeGVkKDEpOiIwIikrJzxzcGFuIGNsYXNzPSJ1Ij5rbTwvc3Bhbj48L2Rpdj48L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7ml7bplb88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0iPicrZXNjKGR1clR4dCkrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuaegemAnzwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSI+Jytlc2MobWF4Vj4wP1N0cmluZyhNYXRoLnJvdW5kKG1heFYpKToiLS0iKSsnPHNwYW4gY2xhc3M9InUiPmttL2g8L3NwYW4+PC9kaXY+PC9kaXY+JwogICAgKyc8L2Rpdj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWdyaWQzIj4nCiAgICArJzxkaXYgY2xhc3M9InJ0LWNlbGwiPjxkaXYgY2xhc3M9ImxiIj7mgKXliqDpgJ88L2Rpdj48ZGl2IGNsYXNzPSJ2bCBudW0gYnJhbmQiPicrc3VtQSsnPC9kaXY+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJydC1jZWxsIj48ZGl2IGNsYXNzPSJsYiI+5oCl5Yi5PC9kaXY+PGRpdiBjbGFzcz0idmwgbnVtIGJyYW5kIj4nK3N1bUIrJzwvZGl2PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0icnQtY2VsbCI+PGRpdiBjbGFzcz0ibGIiPuWOi+W8rzwvZGl2PjxkaXYgY2xhc3M9InZsIG51bSBicmFuZCI+JytzdW1EKyc8L2Rpdj48L2Rpdj4nCiAgICArJzwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iaGludCI+5a6Y5pa5IEFwcCDmiorov5nkupvlrZfmrrXol4/kuobotbfmnaXvvIjovablnovog73lipvkvY3mjqfliLbvvInjgILmgKXliqDpgJ/mnaXoh6rmnI3liqHnq6/vvJvmgKXliLkv5Y6L5byv5Y+v54K544CM5omr5o+P6L2o6L+544CN5oyJ6aqR6KGM6L2o6L+56YeN566X44CCPC9kaXY+PC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5zY29vdGVyKyfmr4/ml6XorrDlvZU8L2g0PjxzcGFuIHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweCI+JwogICAgKyhSVC5zY2FubmluZz8nPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIiBzdHlsZT0ib3BhY2l0eTouNiI+5omr5o+P5Lit4oCmPC9idXR0b24+JzonPGJ1dHRvbiBjbGFzcz0iYnRuIHNtIHByaW1hcnkiIG9uY2xpY2s9InJ0U2NhbigpIj7miavmj4/ovajov7k8L2J1dHRvbj4nKQogICAgKyc8L3NwYW4+PC9kaXY+JzsKICBpZih2aXNpYmxlLmxlbmd0aCl7CiAgICBodG1sKz12aXNpYmxlLm1hcCgoZCxpKT0+cnREYXlIdG1sKGQsaSkpLmpvaW4oIiIpOwogIH1lbHNlewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4O3BhZGRpbmc6OHB4IDAiPuivpeaciOaaguaXoOmqkeihjOiusOW9le+8iOaNouS4quaciOS7veaIluehruiupOi0puWPt+W3sue7keWumui9pui+hu+8iTwvZGl2Pic7CiAgfQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50Ij7ovajov7nmjInmiYDpgInmnIjku73mn6Xor6LvvIjmr4/mrKEgMjAg6Laf6Ieq5Yqo57+76aG177yM5pyA5aSaIDE1IOmhte+8iTwvZGl2Pic7CiAgaWYoUlQudHJhY2tzQXQpaHRtbCs9JzxkaXYgY2xhc3M9ImhpbnQiPuS4iuasoeaJq+aPj++8micrZXNjKFJULnRyYWNrc0F0KSsnIMK3ICcrTnVtYmVyKFJULnRyYWNrc1JpZGVzfHwwKSsnIOi2nyAvICcrTnVtYmVyKFJULnRyYWNrc0RheXN8fDApKycg5aSpPC9kaXY+JzsKICBpZihSVC5zY2FuRXJyKWh0bWwrPSc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0iY29sb3I6dmFyKC0tZXJyKSI+Jytlc2MoUlQuc2NhbkVycikrJzwvZGl2Pic7CiAgaHRtbCs9JzwvZGl2Pic7CiAgaHRtbCs9JzxkaXYgY2xhc3M9ImZvb3QiPuaVsOaNruadpea6kO+8muaegeaguCBteVJpZGVJbmZvIC8gcmlkZXRyYWNrX3YyIMK3IOWOi+W8ry/mgKXliLnnrpfms5Xnp7vmpI3oh6ogWmVlaG8gU3BlZWRIdW50ZXLvvIhBR1BMLTMuMO+8ie+8jOS7heS+m+WtpuS5oOeglOeptjwvZGl2Pic7CiAgZWwuaW5uZXJIVE1MPWh0bWw7Cn0KCi8qID09PT09PT09PT09PT09PT09IHYyLjE0Ljkg6L2m6L6G6aG177yI55uR5o6nICsg6L2m5o6n5omp5bGVICsg5L+h5oGv5Lit5b+D77yJID09PT09PT09PT09PT09PT09ICovCmxldCBWSD17YWNjSWR4OjAsdmluOiIiLGNwOiIiLGxvY2tUeXBlOiIxIixiczpudWxsfTsKLy8gdjIuMTYuNiDmr4/ovabni6znq4vnlLXmsaDorr7nva7vvJrlrZjlgqjnu5PmnoQgeyAiPHZpbj4iOiB7YWgsdkZ1bGwsdkVtcHR5fSB977yb5pen54mI5omB5bmz5qC85byP5Zyo6K+75Y+WL+S/neWtmOaXtui/geenu+WIsOS8oOWFpeeahCB2aW4KZnVuY3Rpb24gcmlkZUJhdHRDZmcodmluKXt0cnl7Y29uc3Qgcz1KU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCJ6aF9iYXR0X2NmZyIpfHwie30iKXx8e307aWYodHlwZW9mIHMuYWghPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkZ1bGwhPT0idW5kZWZpbmVkInx8dHlwZW9mIHMudkVtcHR5IT09InVuZGVmaW5lZCIpe2NvbnN0IG09e307aWYodmluKW1bdmluXT17YWg6TnVtYmVyKHMuYWh8fDApLHZGdWxsOk51bWJlcihzLnZGdWxsfHwwKSx2RW1wdHk6TnVtYmVyKHMudkVtcHR5fHwwKX07bG9jYWxTdG9yYWdlLnNldEl0ZW0oInpoX2JhdHRfY2ZnIixKU09OLnN0cmluZ2lmeShtKSk7cmV0dXJuIG1bdmluXXx8e307fXJldHVybiAodmluJiZzW3Zpbl0pfHx7fTt9Y2F0Y2goZSl7cmV0dXJue319fQpmdW5jdGlvbiBzYXZlQmF0dENmZygpewogIGNvbnN0IHZpbj1WSC52aW58fCIiO2lmKCF2aW4pe3RvYXN0KCLor7flhYjpgInmi6novabovoblho3kv53lrZgiLCJlcnIiKTtyZXR1cm47fQogIGNvbnN0IGFoPU51bWJlcigoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInZoX2JhdHRfYWgiKXx8e30pLnZhbHVlfHwwKTsKICBjb25zdCB2RnVsbD1OdW1iZXIoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJ2aF9iYXR0X3ZmdWxsIil8fHt9KS52YWx1ZXx8MCk7CiAgbGV0IHM7dHJ5e3M9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiemhfYmF0dF9jZmciKXx8Int9Iil8fHt9fWNhdGNoKGUpe3M9e319CiAgY29uc3QgbWFwPSh0eXBlb2Ygcy5haCE9PSJ1bmRlZmluZWQifHx0eXBlb2Ygcy52RnVsbCE9PSJ1bmRlZmluZWQifHx0eXBlb2Ygcy52RW1wdHkhPT0idW5kZWZpbmVkIik/e306czsKICBjb25zdCBjdXI9bWFwW3Zpbl18fHt9OwogIG1hcFt2aW5dPXthaDphaD4wP2FoOjAsdkZ1bGw6dkZ1bGw+MD92RnVsbDowLHZFbXB0eTpjdXIudkVtcHR5fHwwfTsKICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemhfYmF0dF9jZmciLEpTT04uc3RyaW5naWZ5KG1hcCkpOwogIHRvYXN0KCLnlLXmsaDorr7nva7lt7Lkv53lrZjvvIjnu5HlrprlvZPliY3ovabovobvvIkiLCJvayIpO3JlbmRlclZlaGljbGVQYWdlKCk7Cn0KYXN5bmMgZnVuY3Rpb24gcmVuZGVyVmVoaWNsZVBhZ2UoKXsKICBjb25zdCBlbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicGFnZVZlaGljbGUiKTtpZighZWwpcmV0dXJuOwogIGNvbnN0IGxpc3Q9cHRBY2NvdW50cygpOwogIGlmKCFsaXN0Lmxlbmd0aCl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+PGgzPuaaguaXoOi0puWPtzwvaDM+PHA+6K+35YWI5Zyo6aaW6aG15Yqg6L295pWw5o2u5oiW5Zyo6K6+572u6aG15re75Yqg6LSm5Y+3PC9wPjwvZGl2Pic7cmV0dXJufQogIGlmKFZILmFjY0lkeD49bGlzdC5sZW5ndGgpVkguYWNjSWR4PTA7CiAgY29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTsKICBpZighYWNjLnVzZXJJZCl7ZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiPjxoMz7or6XotKblj7fnvLrlsJHnlKjmiLdJRDwvaDM+PC9kaXY+JztyZXR1cm59CiAgZWwuaW5uZXJIVE1MPWFjY0NoaXBzSHRtbCgidmgiKSsnPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nOjQwcHggMjBweCI+PHAgc3R5bGU9ImNvbG9yOnZhcigtLXR4dDMpIj7liqDovb3ovabovobmlbDmja7kuK3igKY8L3A+PC9kaXY+JzsKICBsZXQgbW9uPWF3YWl0IEJhY2tlbmQudmVoaWNsZU1vbml0b3IoYWNjLnVzZXJJZCwiIik7CiAgY29uc3QgdmVoTGlzdD0obW9uJiZBcnJheS5pc0FycmF5KG1vbi52ZWhpY2xlcykpP21vbi52ZWhpY2xlczpbXTsKICBpZihWSC52aW4mJm1vbiYmbW9uLm9rJiZtb24uc25hcHNob3QmJm1vbi5zbmFwc2hvdC52aW4hPT1WSC52aW4pewogICAgY29uc3QgbW9uMj1hd2FpdCBCYWNrZW5kLnZlaGljbGVNb25pdG9yKGFjYy51c2VySWQsVkgudmluKTsKICAgIGlmKG1vbjImJm1vbjIub2spe21vbjIudmVoaWNsZXM9dmVoTGlzdDttb249bW9uMn0KICB9CiAgY29uc3QgW29wdHMsaW5mbyxic109YXdhaXQgUHJvbWlzZS5hbGwoWwogICAgQmFja2VuZC52ZWhpY2xlQ29udHJvbEV4dCh7YWN0aW9uOiJvcHRpb25zIix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn0pLAogICAgQmFja2VuZC5pbmZvQ2VudGVyKGFjYy51c2VySWQsVkgudmlufHwiIiksCiAgICBCYWNrZW5kLmJhdHRlcnlTdGF0ZShhY2MudXNlcklkLFZILnZpbnx8IiIpCiAgXSk7CiAgVkguYnM9KGJzJiZicy5vayk/YnM6bnVsbDsKICBsZXQgaHRtbD1hY2NDaGlwc0h0bWwoInZoIik7CiAgLy8g5b2T5YmN5bGV56S66L2m6L6G77yIdjIuMTYuNu+8mueUteaxoOiuvue9ruaMieatpCB2aW4g54us56uL5L+d5a2Y77yb5Y2V6L2m6LSm5Y+3IFZILnZpbiDmgZLkuLrnqbrvvIzpnIDlm57loavvvIkKICBjb25zdCBjdXJWaW49VkgudmlufHwobW9uJiZtb24uc25hcHNob3Q/bW9uLnNuYXBzaG90LnZpbjoodmVoTGlzdFswXXx8e30pLnZpbk5vKXx8IiI7CiAgVkgudmluPWN1clZpbjsKICAvLyDovabovobpgInmi6nvvIjlpJrovabvvIkKICBpZih2ZWhMaXN0Lmxlbmd0aD4xKXsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJvcHQtcm93Ij4nK3ZlaExpc3QubWFwKHY9Pic8YnV0dG9uIGNsYXNzPSJvcHQtY2hpcCAnKyhjdXJWaW49PT12LnZpbk5vPydvbic6JycpKyciIG9uY2xpY2s9IlZILnZpbj1cJycrZXNjKHYudmluTm8pKydcJztyZW5kZXJWZWhpY2xlUGFnZSgpIj4nK2VzYyh2LnZlaGljbGVUeXBlfHx2LnZlaGljbGVOYW1lfHx2LnZpbk5vKSsnPC9idXR0b24+Jykuam9pbigiIikrJzwvZGl2Pic7CiAgfQogIC8vIOeKtuaAgeebkeaOp+WNoQogIGh0bWwrPSc8ZGl2IGNsYXNzPSJwYW5lbC1jYXJkIj48ZGl2IGNsYXNzPSJwYy1oZWFkIj48aDQ+JytJLmNhcisn6L2m6L6G54q25oCBPC9oND48c3BhbiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHgiPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2hvd1ZlaGljbGVEZXRhaWwoJytWSC5hY2NJZHgrJykiPuivpuaDhTwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0icmVuZGVyVmVoaWNsZVBhZ2UoKSI+5Yi35pawPC9idXR0b24+PC9zcGFuPjwvZGl2Pic7CiAgaWYobW9uJiZtb24ub2smJm1vbi5zbmFwc2hvdCl7CiAgICBjb25zdCBzbj1tb24uc25hcHNob3Q7CiAgICBjb25zdCBzb2NDb2w9c24uc29jPD0yMD8idmFyKC0tZXJyKSI6c24uc29jPD01MD8idmFyKC0td2FybikiOiJ2YXIoLS1vaykiOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnlLXph488L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBzdHlsZT0iY29sb3I6Jytzb2NDb2wrJyI+Jysoc24uc29jIT1udWxsP3NuLnNvYysiJSI6Ii0tIikrJzwvc3Bhbj48L2Rpdj4nOwogICAgaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj7liankvZnnu63oiKo8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nKyhzbi5yYW5nZSE9bnVsbD9zbi5yYW5nZSsiIGttIjoiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPum+meWktOmUgTwvc3Bhbj48c3BhbiBjbGFzcz0idiI+Jysoc24uaGVhZExvY2s9PT0iMSI/IuW3sumUgSI6IuacqumUgSIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5Zyo57q/54q25oCBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iY29sb3I6Jysoc24ub2ZmbGluZT8idmFyKC0tZXJyKSI6InZhcigtLW9rKSIpKyciPicrKHNuLm9mZmxpbmU/Iuemu+e6v++8iD4zMOWIhumSn+acquS4iuaKpe+8iSI6IuWcqOe6vyIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5pyA5ZCO5LiK5oqlPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPicrZXNjKHNuLnJlZnJlc2hUaW1lfHwiLS0iKSsnPC9zcGFuPjwvZGl2Pic7CiAgfWVsc2V7CiAgICBodG1sKz0nPGRpdiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHgiPicrZXNjKChtb24mJihtb24uZXJyb3J8fG1vbi5tZXNzYWdlKSl8fCLlv6vnhafojrflj5blpLHotKUiKSsnPC9kaXY+JzsKICB9CiAgaHRtbCs9JzwvZGl2Pic7CiAgLy8g6L2m6L6G5o6n5Yi25Y2h77yI5LuO6aaW6aG16L+B56e76L+H5p2l77yJCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabovobmjqfliLY8L2g0PjwvZGl2PicKICAgICsnPGRpdiBjbGFzcz0iY3RybC1ncmlkIj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iZmluZCIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnZmluZFwnLHRoaXMpIj4nK0kuYmVsbCsn5a+76L2mPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biIgZGF0YS1hY3Q9ImxvdWRGaW5kIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb3VkRmluZFwnLHRoaXMpIj4nK0kudm9sKyfpuKPnrJs8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIiBkYXRhLWFjdD0iY3VzaGlvbiIgb25jbGljaz0iY3RybEFjdCgnK1ZILmFjY0lkeCsnLFwnY3VzaGlvblwnLHRoaXMpIj4nK0kuc2VhdCsn5Z2Q5Z6rPC9idXR0b24+JwogICAgKyc8YnV0dG9uIGNsYXNzPSJjdHJsLWJ0biB1bmxvY2siIGRhdGEtYWN0PSJ1bmxvY2siIG9uY2xpY2s9ImN0cmxBY3QoJytWSC5hY2NJZHgrJyxcJ3VubG9ja1wnLHRoaXMpIj4nK0kudW5sb2NrKyflvIDplIE8L2J1dHRvbj4nCiAgICArJzxidXR0b24gY2xhc3M9ImN0cmwtYnRuIGxvY2siIGRhdGEtYWN0PSJsb2NrIiBvbmNsaWNrPSJjdHJsQWN0KCcrVkguYWNjSWR4KycsXCdsb2NrXCcsdGhpcykiPicrSS5sb2NrKyflhbPplIE8L2J1dHRvbj4nCiAgICArJzwvZGl2PjwvZGl2Pic7CiAgLy8g6L2m5o6n5omp5bGV5Y2hCiAgaHRtbCs9JzxkaXYgY2xhc3M9InBhbmVsLWNhcmQiPjxkaXYgY2xhc3M9InBjLWhlYWQiPjxoND4nK0kuemFwKyfovabmjqfmianlsZU8L2g0PjwvZGl2Pic7CiAgY29uc3QgY3BzPShvcHRzJiZBcnJheS5pc0FycmF5KG9wdHMuY2hhcmdlUG93ZXIpKT9vcHRzLmNoYXJnZVBvd2VyOltdOwogIGlmKGNwcy5sZW5ndGgpewogICAgaHRtbCs9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQyKTttYXJnaW4tYm90dG9tOjRweCI+5YWF55S15Yqf546H77yIV++8iTwvZGl2PjxkaXYgY2xhc3M9Im9wdC1yb3ciPicKICAgICAgK2Nwcy5tYXAobz0+JzxidXR0b24gY2xhc3M9Im9wdC1jaGlwICcrKFZILmNwPT09by5rZXk/J29uJzonJykrJyIgb25jbGljaz0iVkguY3A9XCcnK2VzYyhvLmtleSkrJ1wnO3JlbmRlclZlaGljbGVQYWdlKCkiPicrKG8ua2V5PT09IjEyMDAiPyLml6DpmZDliLYiOmVzYyhvLmtleSkpKyc8L2J1dHRvbj4nKS5qb2luKCIiKQogICAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSBwcmltYXJ5IiBvbmNsaWNrPSJleHRTZXQoXCdjaGFyZ2VQb3dlclwnKSI+6K6+572uPC9idXR0b24+PC9kaXY+JzsKICB9CiAgLy8gdjIuMTYuNSDlhYXnlLXliankvZnml7bpl7TvvIjlhYXnlLXkuK3kuJTlt7Lorr7lrrnph4/miY3mmL7npLrvvIkrIOeUteaxoOiuvue9ru+8iHYyLjE2LjYg5oyJIHZpbiDni6znq4vvvIkKICBjb25zdCBiYz1yaWRlQmF0dENmZyhjdXJWaW4pOwogIGlmKFZILmJzJiZWSC5icy5jaGFyZ2luZyYmTnVtYmVyKGJjLmFoKT4wJiZWSC5icy5zb2M+MCYmVkguYnMuc29jPDEwMCYmVkguYnMuY3VycmVudD4wLjUpewogICAgY29uc3QgcmVtYWluTWluPU1hdGgubWF4KDEsTWF0aC5yb3VuZChOdW1iZXIoYmMuYWgpKigxMDAtVkguYnMuc29jKS8xMDAvVkguYnMuY3VycmVudCo2MCkpOwogICAgY29uc3QgaGg9TWF0aC5mbG9vcihyZW1haW5NaW4vNjApLG1tPXJlbWFpbk1pbiU2MDsKICAgIGNvbnN0IG9mZlR4dD0oVkguYnMuZnVsbENoYXJnZVRpbWVTZWNvbmQ+MCk/KCIgwrcg5a6Y5pa557qmICIrTWF0aC5yb3VuZChWSC5icy5mdWxsQ2hhcmdlVGltZVNlY29uZC82MCkrIiDliIYiKToiIjsKICAgIGh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+4o+xIOWFheeUteWJqeS9mTwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPue6piAnKygoaGg+MD9oaCsiIOaXtiAiOiIiKSttbSsiIOWIhiIpKyc8L3NwYW4+PC9kaXY+JwogICAgICArJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJtYXJnaW4tdG9wOjJweCI+5Lyw566XICcrVkguYnMuY3VycmVudC50b0ZpeGVkKDEpKydBIMK3ICcrVkguYnMuc29jKyclIOKGkiAnKyhiYy52RnVsbD4wP2JjLnZGdWxsKyJWIjoi5YWF5ruhIikrb2ZmVHh0Kyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo2cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi10b3A6OHB4O2ZsZXgtd3JhcDp3cmFwIj48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEycHg7Y29sb3I6dmFyKC0tdHh0MikiPueUteaxoOiuvue9rjwvc3Bhbj4nCiAgICArJzxpbnB1dCBpZD0idmhfYmF0dF9haCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLlrrnph48gQWgiIHZhbHVlPSInKyhiYy5haHx8IiIpKyciIHN0eWxlPSJ3aWR0aDo4NnB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDIpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo4cHg7Y29sb3I6dmFyKC0tdHh0KTtwYWRkaW5nOjZweCA4cHg7Zm9udC1zaXplOjEycHgiPicKICAgICsnPGlucHV0IGlkPSJ2aF9iYXR0X3ZmdWxsIiB0eXBlPSJudW1iZXIiIGlucHV0bW9kZT0iZGVjaW1hbCIgcGxhY2Vob2xkZXI9Iua7oeeUtSBWIiB2YWx1ZT0iJysoYmMudkZ1bGx8fCIiKSsnIiBzdHlsZT0id2lkdGg6ODZweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O2NvbG9yOnZhcigtLXR4dCk7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4Ij4nCiAgICArJzxidXR0b24gY2xhc3M9ImJ0biBzbSIgb25jbGljaz0ic2F2ZUJhdHRDZmcoKSI+5L+d5a2YPC9idXR0b24+PC9kaXY+JwogICAgKyc8ZGl2IGNsYXNzPSJoaW50IiBzdHlsZT0ibWFyZ2luLXRvcDo0cHgiPuiuvue9ruWuuemHj+WQju+8jOWFheeUteS4reiHquWKqOS8sOeul+OAjOWFheeUteWJqeS9meOAje+8iOWuuemHj8OXKDEwMOKIkueUtemHjyUpLzEwMMO35YWF55S155S15rWB77yJ77yb5q+P6L2m54us56uL5L+d5a2Y77yM5pyq6K6+572u5LiN5pi+56S6PC9kaXY+JzsKICAvLyB2Mi4xNC4yMSDliKDpmaTpmZDpgJ/moaPkvY3orr7nva4KICBodG1sKz0nPC9kaXY+JzsKICAvLyDkv6Hmga/kuK3lv4PljaEKICBodG1sKz0nPGRpdiBjbGFzcz0icGFuZWwtY2FyZCI+PGRpdiBjbGFzcz0icGMtaGVhZCI+PGg0PicrSS5iZWxsKyfkv6Hmga/kuK3lv4M8L2g0PjwvZGl2Pic7CiAgaWYoaW5mbyYmaW5mby5vayl7CiAgICBjb25zdCB1bj1pbmZvLnVucmVhZCE9bnVsbD9kZWVwUGljayhpbmZvLnVucmVhZCxbInRvdGFsIiwiY291bnQiLCJ1blJlYWRDb3VudCIsIm51bSJdLDMpOiIiOwogICAgaWYodW4hPT0iIilodG1sKz0nPGRpdiBjbGFzcz0ibW9uLXJvdyI+PHNwYW4gY2xhc3M9ImsiPuacquivu+a2iOaBrzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPicrZXNjKHVuKSsnPC9zcGFuPjwvZGl2Pic7CiAgICBjb25zdCBwcml6ZXM9KGluZm8ucHJpemVSZWNvcmRzJiYoaW5mby5wcml6ZVJlY29yZHMucmVjb3Jkc3x8aW5mby5wcml6ZVJlY29yZHMubGlzdHx8aW5mby5wcml6ZVJlY29yZHMpKXx8W107CiAgICBpZihBcnJheS5pc0FycmF5KHByaXplcykmJnByaXplcy5sZW5ndGgpewogICAgICBodG1sKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbjo4cHggMCA0cHgiPuebsuebki/kuK3lpZborrDlvZU8L2Rpdj4nOwogICAgICBodG1sKz1wcml6ZXMuc2xpY2UoMCw1KS5tYXAocD0+JzxkaXYgY2xhc3M9ImZsb3ctaXRlbSI+PGRpdj48ZGl2IGNsYXNzPSJubSI+Jytlc2MocC5wcml6ZXNOYW1lfHxwLm5hbWV8fCLlpZblk4EiKSsnPC9kaXY+PGRpdiBjbGFzcz0idG0iPicrZXNjKHAuY3JlYXRlVGltZXx8cC5jcmVhdGVEYXRlfHwiIikrJzwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9InNjIHBsdXMiIHN0eWxlPSJmb250LXNpemU6MTJweCI+Jytlc2MocC5pbnRlZ3JhbD8oIisiK3AuaW50ZWdyYWwpOiIiKSsnPC9kaXY+PC9kaXY+Jykuam9pbigiIik7CiAgICB9CiAgICBjb25zdCBjb3Vwb25zPShpbmZvLmNvdXBvbnMmJihpbmZvLmNvdXBvbnMucmVjb3Jkc3x8aW5mby5jb3Vwb25zLmxpc3R8fGluZm8uY291cG9ucykpfHxbXTsKICAgIGlmKEFycmF5LmlzQXJyYXkoY291cG9ucykmJmNvdXBvbnMubGVuZ3RoKWh0bWwrPSc8ZGl2IGNsYXNzPSJtb24tcm93Ij48c3BhbiBjbGFzcz0iayI+5LyY5oOg5Yi4PC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytjb3Vwb25zLmxlbmd0aCsnIOW8oDwvc3Bhbj48L2Rpdj4nOwogICAgaWYoaW5mby5vdGEhPW51bGwpaHRtbCs9JzxkaXYgY2xhc3M9Im1vbi1yb3ciPjxzcGFuIGNsYXNzPSJrIj5PVEEg5Y2H57qnPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IiBzdHlsZT0iZm9udC1zaXplOjEycHgiPicrKEFycmF5LmlzQXJyYXkoaW5mby5vdGEpJiZpbmZvLm90YS5sZW5ndGg/IuacieaWsOeJiOacrCI6IuW3suaYr+acgOaWsCIpKyc8L3NwYW4+PC9kaXY+JzsKICAgIGNvbnN0IHZtcz0oaW5mby52ZWhpY2xlTWVzc2FnZXMmJkFycmF5LmlzQXJyYXkoaW5mby52ZWhpY2xlTWVzc2FnZXMuYWxlcnRzKSk/aW5mby52ZWhpY2xlTWVzc2FnZXMuYWxlcnRzOltdOwogICAgaWYodm1zLmxlbmd0aCl7CiAgICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjEwcHggMCA0cHgiPui9pui+huaPkOmGku+8iOmch+WKqC/lv5jlhbPplIEv55S15rGg77yJPC9kaXY+JzsKICAgICAgaHRtbCs9dm1zLnNsaWNlKDAsNSkubWFwKG09Pic8ZGl2IGNsYXNzPSJmbG93LWl0ZW0iPjxkaXY+PGRpdiBjbGFzcz0ibm0iPicrZXNjKG0uY29udGVudHx8Iui9pui+hua2iOaBryIpKyc8L2Rpdj48ZGl2IGNsYXNzPSJ0bSI+Jytlc2MoW20uZGV0YWlsLG0uYWRkcmVzcyxtLnRpbWVdLmZpbHRlcihCb29sZWFuKS5qb2luKCIgwrcgIikuc2xpY2UoMCw2NCkpKyc8L2Rpdj48L2Rpdj48L2Rpdj4nKS5qb2luKCIiKTsKICAgIH0KICB9ZWxzZXsKICAgIGh0bWwrPSc8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCI+Jytlc2MoKGluZm8mJihpbmZvLmVycm9yfHxpbmZvLm1lc3NhZ2UpKXx8IuS/oeaBr+S4reW/g+WKoOi9veWksei0pSIpKyc8L2Rpdj4nOwogIH0KICBodG1sKz0nPC9kaXY+JzsKICBodG1sKz0nPGRpdiBjbGFzcz0iZm9vdCI+6L2m5o6n5omp5bGV5oyH5Luk57uP5LqR56uv5LiL5Y+R77yM5ZON5bqU5Y+v6IO96L6D5oWiPC9kaXY+JzsKICBlbC5pbm5lckhUTUw9aHRtbDsKfQoKYXN5bmMgZnVuY3Rpb24gZXh0U2V0KGFjdGlvbil7CiAgY29uc3QgbGlzdD1wdEFjY291bnRzKCk7Y29uc3QgYWNjPWxpc3RbVkguYWNjSWR4XTtpZighYWNjfHwhYWNjLnVzZXJJZClyZXR1cm47CiAgY29uc3QgYm9keT17YWN0aW9uOmFjdGlvbix1c2VySWQ6YWNjLnVzZXJJZCx2aW46VkgudmlufHwiIn07CiAgaWYoYWN0aW9uPT09ImNoYXJnZVBvd2VyIil7aWYoIVZILmNwKXt0b2FzdCgi6K+35YWI6YCJ5oup5YWF55S15Yqf546HIiwiZXJyIik7cmV0dXJufWJvZHkudmFsdWU9VkguY3B9CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIsImluZm8iKTsKICBjb25zdCBkPWF3YWl0IEJhY2tlbmQudmVoaWNsZUNvbnRyb2xFeHQoYm9keSk7CiAgdG9hc3QoKGQmJmQubWVzc2FnZSl8fCgoZCYmZC5vayk/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLChkJiZkLm9rKT8ib2siOiJlcnIiKTsKfQoKZnVuY3Rpb24gaW5pdCgpewogIGFwcGx5VGhlbWUoKTtXYWxscGFwZXJNZ3IuaW5pdCgpO21vdW50U2lnbmluRmFiKCk7CiAgcmVuZGVyQ2ZnKCk7CiAgaWYobG9jYXRpb24uc2VhcmNoLmluZGV4T2YoImRlbW8iKT49MCl7CiAgICBTVEFURS5kYXRhPURFTU9fREFUQTtTVEFURS50c1RleHQ9Zm10VGltZShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1NUQVRFLnByb3h5PWZhbHNlOwogICAgcmVuZGVySG9tZSgpO2hpZGVTcGxhc2goKTtyZXR1cm47CiAgfQogIHN0YXJ0QXV0b1JlZnJlc2goKTtyZWZyZXNoQWxsKGZhbHNlKTsKICAvLyB2Mi4xNS42IOeJiOacrOajgOa1i++8mummluWxj+a4suafk+WQjumdmem7mOajgOafpeS4gOasoe+8iOacieaWsOeJiOacrOaJjeaPkOekuu+8iQogIGlmKCFpc0RlbW8oKSlzZXRUaW1lb3V0KCgpPT5jaGVja1ZlcnNpb24oZmFsc2UpLDE1MDApOwogIC8vIOWFnOW6le+8muaegeerr+aDheWGteS4i+ivt+axgumVv+aXtumXtOaXoOWTjeW6lO+8jOmXquWxj+S5n+S4jeiDveS4gOebtOaMoeS9j+eVjOmdogogIHNldFRpbWVvdXQoaGlkZVNwbGFzaCwxMjAwMCk7Cn0KaW5pdCgpOwo8L3NjcmlwdD4KPCEtLV9fSlM1X18tLT4K";
function __appDecodeUtf8(b64){
  const bin = atob(b64); const out = []; let i = 0;
  while (i < bin.length) {
    const c1 = bin.charCodeAt(i++) & 0xff;
    if (c1 < 0x80) { out.push(String.fromCharCode(c1)); continue; }
    const c2 = bin.charCodeAt(i++) & 0xff;
    if ((c1 & 0xe0) === 0xc0) { out.push(String.fromCharCode(((c1 & 0x1f) << 6) | (c2 & 0x3f))); continue; }
    const c3 = bin.charCodeAt(i++) & 0xff;
    if ((c1 & 0xf0) === 0xe0) { out.push(String.fromCharCode(((c1 & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f))); continue; }
    const c4 = bin.charCodeAt(i++) & 0xff;
    const cp = ((c1 & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
    const u = cp - 0x10000;
    out.push(String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3ff)));
  }
  return out.join("");
}
function __APP_HTML(){ return __appDecodeUtf8(__APP_HTML_B64); }
// v2.16.14 单账号版专用界面（?single=1）：签到 + 车控 + 车辆状态 + Token 导入
const __SINGLE_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCxpbml0aWFsLXNjYWxlPTEsbWF4aW11bS1zY2FsZT0xLHVzZXItc2NhbGFibGU9bm8sdmlld3BvcnQtZml0PWNvdmVyIj4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtY2FwYWJsZSIgY29udGVudD0ieWVzIj4KPG1ldGEgbmFtZT0idGhlbWUtY29sb3IiIGNvbnRlbnQ9IiMwNzBCMTYiPgo8dGl0bGU+5p6B5qC4IFpFRUhPIMK3IOWNlei0puWPt+eJiDwvdGl0bGU+CjxzdHlsZT4KKnttYXJnaW46MDtwYWRkaW5nOjA7Ym94LXNpemluZzpib3JkZXItYm94Oy13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjp0cmFuc3BhcmVudH0KOnJvb3R7LS1iZzojMDcwQjE2Oy0tY2FyZDpyZ2JhKDE0NiwxNzAsMjA1LC4wNik7LS1jYXJkMzojMEMxNTI2Oy0tbGluZTpyZ2JhKDE0NiwxNzAsMjA1LC4xMyk7LS1saW5lMjpyZ2JhKDE0NiwxNzAsMjA1LC4yMik7LS10eHQ6I0VBRjFGQjstLXR4dDI6IzkzQTBCODstLXR4dDM6IzVFNkU4ODstLWJyYW5kOiMyQkQ0RjI7LS1icmFuZFNvZnQ6cmdiYSg0MywyMTIsMjQyLC4xMyk7LS1vazojM0REQzk3Oy0td2FybjojRjdCOTU1Oy0tZXJyOiNGOTcwNkE7LS12aW86I0I3QTZGQjstLWdyYWQ6bGluZWFyLWdyYWRpZW50KDEzNWRlZywjMkJENEYyLCMwRThGQjIpfQpodG1sLGJvZHl7aGVpZ2h0OjEwMCV9CmJvZHl7Zm9udC1mYW1pbHk6LWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsIlBpbmdGYW5nIFNDIiwiSGVsdmV0aWNhIE5ldWUiLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10eHQpO2ZvbnQtc2l6ZToxNXB4O2xpbmUtaGVpZ2h0OjEuNTstd2Via2l0LWZvbnQtc21vb3RoaW5nOmFudGlhbGlhc2VkO292ZXJmbG93LXg6aGlkZGVuOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lOy13ZWJraXQtdG91Y2gtY2FsbG91dDpub25lfQppbnB1dCx0ZXh0YXJlYXstd2Via2l0LXVzZXItc2VsZWN0OnRleHQ7dXNlci1zZWxlY3Q6dGV4dDstd2Via2l0LXRvdWNoLWNhbGxvdXQ6ZGVmYXVsdH0KaW1ney13ZWJraXQtdXNlci1kcmFnOm5vbmV9Ci5udW17Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouYmctZ2xvd3twb3NpdGlvbjpmaXhlZDtpbnNldDowO3BvaW50ZXItZXZlbnRzOm5vbmU7ei1pbmRleDowO2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KDU1JSAzNiUgYXQgMTAlIC00JSxyZ2JhKDQzLDIxMiwyNDIsLjE2KSx0cmFuc3BhcmVudCA2MiUpLHJhZGlhbC1ncmFkaWVudCg0NiUgMzIlIGF0IDk0JSA0JSxyZ2JhKDE0LDE0MywxNzgsLjEzKSx0cmFuc3BhcmVudCA2MiUpLHJhZGlhbC1ncmFkaWVudCg2MCUgNDAlIGF0IDUwJSAxMDglLHJnYmEoMTI0LDEwNywyNDAsLjA5KSx0cmFuc3BhcmVudCA2NSUpfQpoZWFkZXJ7cG9zaXRpb246c3RpY2t5O3RvcDowO3otaW5kZXg6NjA7cGFkZGluZzpjYWxjKDEycHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpIDE4cHggMTJweDtiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuODIpOy13ZWJraXQtYmFja2Ryb3AtZmlsdGVyOmJsdXIoMjJweCkgc2F0dXJhdGUoMS41KTtiYWNrZHJvcC1maWx0ZXI6Ymx1cigyMnB4KSBzYXR1cmF0ZSgxLjUpO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMXB4fQoubG9nb3t3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtib3gtc2hhZG93OjAgNnB4IDE4cHggcmdiYSgxNCwxNDMsMTc4LC4zMik7ZmxleC1zaHJpbms6MH0KLmxvZ28gc3Zne3dpZHRoOjIycHg7aGVpZ2h0OjIycHh9Ci5idHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5idCBoMXtmb250LXNpemU6MTZweDtmb250LXdlaWdodDo4MDA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4fQouYmFkZ2V7Zm9udC1zaXplOjlweDtmb250LXdlaWdodDo4MDA7bGV0dGVyLXNwYWNpbmc6LjZweDtjb2xvcjojMDQxMjFDO2JhY2tncm91bmQ6dmFyKC0tYnJhbmQpO2JvcmRlci1yYWRpdXM6NXB4O3BhZGRpbmc6MnB4IDVweH0KLmJ0IHB7Zm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoxcHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4fQouZG90e3dpZHRoOjZweDtoZWlnaHQ6NnB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6dmFyKC0tb2spO2JveC1zaGFkb3c6MCAwIDZweCB2YXIoLS1vayl9Ci5kb3Qub2Zme2JhY2tncm91bmQ6dmFyKC0tdHh0Myk7Ym94LXNoYWRvdzpub25lfQouaWNvbi1idG57d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXItcmFkaXVzOjExcHg7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTtmbGV4LXNocmluazowfQouaWNvbi1idG4gc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9Ci5pY29uLWJ0bjphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45Mil9Cm1haW57cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoxO3BhZGRpbmc6MTRweCAxNnB4IGNhbGMoMjJweCArIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSl9Ci50YWItcGFnZXtkaXNwbGF5Om5vbmV9LnRhYi1wYWdlLm9ue2Rpc3BsYXk6YmxvY2t9Ci5jYXJke2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjIwcHg7cGFkZGluZzoxNnB4O21hcmdpbi1ib3R0b206MTRweDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59Ci5jYXJkLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjEycHh9Ci5jYXJkLWhlYWQgaDN7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweH0KLmNhcmQtaGVhZCBoMyBpe3dpZHRoOjNweDtoZWlnaHQ6MTNweDtib3JkZXItcmFkaXVzOjJweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtkaXNwbGF5OmJsb2NrfQouY2FyZC1oZWFkIGgzIGkuZ3JlZW57YmFja2dyb3VuZDp2YXIoLS1vayl9LmNhcmQtaGVhZCBoMyBpLnZpb3tiYWNrZ3JvdW5kOnZhcigtLXZpbyl9Ci5taW5pLWJ0bntmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMjgpO2JvcmRlci1yYWRpdXM6OXB4O3BhZGRpbmc6NXB4IDEwcHh9Ci5oZXJve3Bvc2l0aW9uOnJlbGF0aXZlO292ZXJmbG93OmhpZGRlbjttYXJnaW46MCAwIDE2cHg7cGFkZGluZzoxNnB4O2JvcmRlci1yYWRpdXM6MjBweDtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMTgpO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE1NWRlZyxyZ2JhKDQzLDIxMiwyNDIsLjE1KSxyZ2JhKDE0LDE0MywxNzgsLjA0KSA1OCUsdHJhbnNwYXJlbnQpLHZhcigtLWNhcmQpfQouaGVyby10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDtwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjF9Ci52cGlje3dpZHRoOjEzMnB4O2hlaWdodDo4NnB4O2ZsZXgtc2hyaW5rOjA7Ym9yZGVyLXJhZGl1czoxNHB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE2MGRlZywjMUEyNzQyLCMwQjEzMjIpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7b3ZlcmZsb3c6aGlkZGVuO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0KLnZwaWMgaW1ne3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7b2JqZWN0LWZpdDpjb250YWluO2ZpbHRlcjpkcm9wLXNoYWRvdygwIDZweCAxMnB4IHJnYmEoMCwwLDAsLjQpKX0KLnZpbmZve2ZsZXg6MTttaW4td2lkdGg6MH0KLnZuYW1le2ZvbnQtc2l6ZToxOXB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzotLjJweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci52bWV0YXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjNweDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXB9Ci52dGFnc3tkaXNwbGF5OmZsZXg7Z2FwOjZweDttYXJnaW4tdG9wOjhweDtmbGV4LXdyYXA6d3JhcH0KLnRhZ3tmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Ym9yZGVyLXJhZGl1czo3cHg7cGFkZGluZzozcHggN3B4fQoudGFnLm9re2NvbG9yOnZhcigtLW9rKTtiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMTMpO2JvcmRlcjoxcHggc29saWQgcmdiYSg2MSwyMjAsMTUxLC4yNSl9Ci50YWcuY3l7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNDMsMjEyLDI0MiwuMjUpfQoudGFnLm9mZntjb2xvcjp2YXIoLS10eHQzKTtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQouaGVyby1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4O21hcmdpbi10b3A6MTRweDtwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjF9Ci5oZ3tiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuNTUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6OXB4IDExcHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5oZyAudntmb250LXNpemU6MTlweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNX0KLmhnIC52IHNtYWxse2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tbGVmdDoxcHh9Ci5oZyAubHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLXRvcDoycHh9Ci5yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEwcHggMDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7Zm9udC1zaXplOjEzcHg7Z2FwOjEwcHh9Ci5yb3c6bGFzdC1jaGlsZHtib3JkZXItYm90dG9tOm5vbmV9Ci5yb3cgLmt7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHg7ZmxleC1zaHJpbms6MH0KLnJvdyAudntmb250LXdlaWdodDo3MDA7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpyaWdodDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5zaWduLWhlcm97ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTRweH0KLnJpbmd7d2lkdGg6OTJweDtoZWlnaHQ6OTJweDtwb3NpdGlvbjpyZWxhdGl2ZTtmbGV4LXNocmluazowfQoucmluZyBzdmd7d2lkdGg6OTJweDtoZWlnaHQ6OTJweDt0cmFuc2Zvcm06cm90YXRlKC05MGRlZyl9Ci5yaW5nIC50cntzdHJva2U6cmdiYSgxNDYsMTcwLDIwNSwuMTYpO2ZpbGw6bm9uZTtzdHJva2Utd2lkdGg6Nn0KLnJpbmcgLmFyY3tzdHJva2U6IzJCRDRGMjtmaWxsOm5vbmU7c3Ryb2tlLXdpZHRoOjY7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWRhc2hhcnJheToyNTc7c3Ryb2tlLWRhc2hvZmZzZXQ6MjU3O3RyYW5zaXRpb246c3Ryb2tlLWRhc2hvZmZzZXQgLjVzfQoucmluZyAuY3twb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJ9Ci5yaW5nIC5jIGJ7Zm9udC1zaXplOjIycHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLWJyYW5kKX0KLnJpbmcgLmMgc3Bhbntmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMH0KLnNpZ24taW5mb3tmbGV4OjE7bWluLXdpZHRoOjB9Ci5zaWduLWluZm8gLnN0e2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHh9Ci5zaWduLWluZm8gLnN0IGVte2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayk7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjEzKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNjEsMjIwLDE1MSwuMjUpO2JvcmRlci1yYWRpdXM6N3B4O3BhZGRpbmc6MnB4IDdweH0KLnNpZ24taW5mbyAuc3QgZW0ubm97Y29sb3I6dmFyKC0td2Fybik7YmFja2dyb3VuZDpyZ2JhKDI0NywxODUsODUsLjEzKTtib3JkZXItY29sb3I6cmdiYSgyNDcsMTg1LDg1LC4yOCl9Ci5zaWduLXN0YXRze2Rpc3BsYXk6ZmxleDtnYXA6OHB4O21hcmdpbi10b3A6MTBweH0KLnNze2ZsZXg6MTtiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuNSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjExcHg7cGFkZGluZzo3cHggOXB4fQouc3MgLnZ7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6ODAwfS5zcyAubHtmb250LXNpemU6OXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDttYXJnaW4tdG9wOjFweH0KLmJsaW5ke21hcmdpbi10b3A6MTJweH0KLmJsaW5kLXRvcHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NXB4fQouYmxpbmQtYmFye2hlaWdodDo3cHg7Ym9yZGVyLXJhZGl1czo5OXB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTQpO292ZXJmbG93OmhpZGRlbn0KLmJsaW5kLWZpbGx7aGVpZ2h0OjEwMCU7d2lkdGg6MDtib3JkZXItcmFkaXVzOjk5cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTt0cmFuc2l0aW9uOndpZHRoIC41c30KLmJ0bi1tYWlue3dpZHRoOjEwMCU7bWFyZ2luLXRvcDoxNHB4O3BhZGRpbmc6MTNweDtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzouNHB4O2JveC1zaGFkb3c6MCA4cHggMjJweCByZ2JhKDE0LDE0MywxNzgsLjM1KSxpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsLjMpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6N3B4fQouYnRuLW1haW46YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTcpfQouYnRuLW1haW4uYnVzeXtvcGFjaXR5Oi42O3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5idG4tbWFpbiBzdmd7d2lkdGg6MTZweDtoZWlnaHQ6MTZweH0KLmN0cmwtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg1LDFmcik7Z2FwOjlweH0KLmN0cmx7YmFja2dyb3VuZDpyZ2JhKDcsMTEsMjIsLjUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxNHB4O3BhZGRpbmc6MTJweCA0cHggMTBweDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O2NvbG9yOnZhcigtLXR4dDIpfQouY3RybDphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45NCl9Ci5jdHJsIHN2Z3t3aWR0aDoyMXB4O2hlaWdodDoyMXB4fQouY3RybCBzcGFue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmN0cmwudW5sb2Nre2NvbG9yOnZhcigtLW9rKTtib3JkZXItY29sb3I6cmdiYSg2MSwyMjAsMTUxLC4yOCk7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjA3KX0KLmN0cmwubG9ja3tjb2xvcjp2YXIoLS1lcnIpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yOCk7YmFja2dyb3VuZDpyZ2JhKDI0OSwxMTIsMTA2LC4wNyl9Ci5zdC1ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6OXB4fQouc3Rje2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTNweDtwYWRkaW5nOjExcHggOXB4O3RleHQtYWxpZ246Y2VudGVyfQouc3RjIC52e2ZvbnQtc2l6ZToxN3B4O2ZvbnQtd2VpZ2h0OjkwMH0uc3RjIC52IHNtYWxse2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjYwMH0uc3RjIC5se2ZvbnQtc2l6ZTo5cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi10b3A6MnB4fQouYmlnLWN0cmx7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDoxMHB4fQouYmN7cGFkZGluZzoxNnB4IDE0cHg7Ym9yZGVyLXJhZGl1czoxNnB4O2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC41KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7Y29sb3I6dmFyKC0tdHh0KX0KLmJjOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk3KX0KLmJjIHN2Z3t3aWR0aDoyNHB4O2hlaWdodDoyNHB4O2ZsZXgtc2hyaW5rOjB9Ci5iYyBie2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmJsb2NrfQouYmMgc3Bhbntmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKX0KLmJjLnVubG9ja3tib3JkZXItY29sb3I6cmdiYSg2MSwyMjAsMTUxLC4zKTtiYWNrZ3JvdW5kOnJnYmEoNjEsMjIwLDE1MSwuMDgpO2NvbG9yOnZhcigtLW9rKX0KLmJjLmxvY2t7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjMpO2JhY2tncm91bmQ6cmdiYSgyNDksMTEyLDEwNiwuMDgpO2NvbG9yOnZhcigtLWVycil9Ci5iYy53aWRle2dyaWQtY29sdW1uOnNwYW4gMn0KLm9wdC1yb3d7ZGlzcGxheTpmbGV4O2dhcDo3cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luOjRweCAwIDhweH0KLmNoaXB7cGFkZGluZzo3cHggMTJweDtib3JkZXItcmFkaXVzOjEwcHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7YmFja2dyb3VuZDp2YXIoLS1jYXJkMyk7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwfQouY2hpcC5vbntiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5hY2MtY2FyZHtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxNTBkZWcscmdiYSg0MywyMTIsMjQyLC4xMiksdHJhbnNwYXJlbnQgNjAlKSx2YXIoLS1jYXJkKTtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4yKX0KLmFjYy10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweH0KLmF2YXRhcnt3aWR0aDo0NHB4O2hlaWdodDo0NHB4O2JvcmRlci1yYWRpdXM6MTNweDtiYWNrZ3JvdW5kOnZhcigtLWdyYWQpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtmb250LXNpemU6MThweDtmb250LXdlaWdodDo5MDA7Y29sb3I6IzA0MTIxQztmbGV4LXNocmluazowfQouYWNjLXRvcCBie2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmJsb2NrfQouYWNjLXRvcCBzcGFue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpfQouYWNjLW9re2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjgwMDtjb2xvcjp2YXIoLS1vayk7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjEzKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoNjEsMjIwLDE1MSwuMjUpO2JvcmRlci1yYWRpdXM6N3B4O3BhZGRpbmc6M3B4IDhweDttYXJnaW4tbGVmdDphdXRvfQouYWNjLW9rLm5ve2NvbG9yOnZhcigtLXdhcm4pO2JhY2tncm91bmQ6cmdiYSgyNDcsMTg1LDg1LC4xMyk7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ3LDE4NSw4NSwuMjgpfQouaW1wb3J0e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O21hcmdpbi10b3A6MTNweH0KLmltcG9ydC1idG57ZmxleDoxO3BhZGRpbmc6MTFweCA2cHg7Ym9yZGVyLXJhZGl1czoxMnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC40NSk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjVweDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Mik7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5pbXBvcnQtYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk2KX0KLmltcG9ydC1idG4gc3Zne3dpZHRoOjE5cHg7aGVpZ2h0OjE5cHh9Ci5pbXBvcnQtYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlci1jb2xvcjpyZ2JhKDQzLDIxMiwyNDIsLjM1KTtjb2xvcjp2YXIoLS1icmFuZCl9Ci5pbXBvcnQtYnRuIHNtYWxse2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuNH0KLnN3aXRjaC1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDtwYWRkaW5nOjExcHggMDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyl9Ci5zd2l0Y2gtcm93Omxhc3QtY2hpbGR7Ym9yZGVyLWJvdHRvbTpub25lfQouc3dpdGNoLXJvdyAubGJse2ZsZXg6MX0KLnN3aXRjaC1yb3cgLmxibCBie2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmJsb2NrfQouc3dpdGNoLXJvdyAubGJsIHNwYW57Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5zd3t3aWR0aDo0MnB4O2hlaWdodDoyNHB4O2JvcmRlci1yYWRpdXM6OTlweDtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjE4KTtwb3NpdGlvbjpyZWxhdGl2ZTtmbGV4LXNocmluazowO3RyYW5zaXRpb246LjJzfQouc3c6OmFmdGVye2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7bGVmdDozcHg7dG9wOjNweDt3aWR0aDoxOHB4O2hlaWdodDoxOHB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6IzdDOEFBNTt0cmFuc2l0aW9uOi4yMnN9Ci5zdy5vbntiYWNrZ3JvdW5kOnJnYmEoNDMsMjEyLDI0MiwuMjUpfQouc3cub246OmFmdGVye2xlZnQ6MjFweDtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtib3gtc2hhZG93OjAgMCA4cHggcmdiYSg0MywyMTIsMjQyLC42KX0KLmlucHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtwYWRkaW5nOjExcHggMTNweDtmb250LXNpemU6MTNweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHh9Ci5pbnAgaW5wdXR7ZmxleDoxO2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtvdXRsaW5lOm5vbmU7Y29sb3I6dmFyKC0tdHh0KTtmb250LXNpemU6MTNweDtmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sbW9ub3NwYWNlfQouaW5wIGlucHV0OjpwbGFjZWhvbGRlcntjb2xvcjp2YXIoLS10eHQzKX0KLmlucCAuYWN0e2NvbG9yOnZhcigtLWJyYW5kKTtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDA7ZmxleC1zaHJpbms6MH0KLmZpZWxke21hcmdpbi1ib3R0b206MTBweH0KLmZpZWxkIGxhYmVse2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMDtkaXNwbGF5OmJsb2NrO21hcmdpbi1ib3R0b206NnB4fQoubGluay1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtwYWRkaW5nOjEzcHggMDtib3JkZXItYm90dG9tOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4wNyk7Zm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tdHh0Mil9Ci5saW5rLXJvdzpsYXN0LWNoaWxke2JvcmRlci1ib3R0b206bm9uZX0KLmxpbmstcm93IC5ye2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZToxMnB4fQouaGludHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtsaW5lLWhlaWdodDoxLjc7bWFyZ2luLXRvcDo4cHh9Ci5lbXB0eXtwYWRkaW5nOjI2cHggMTBweDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweH0KLnRvYXN0e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6NTAlO2JvdHRvbToxMTBweDt0cmFuc2Zvcm06dHJhbnNsYXRlWCgtNTAlKSB0cmFuc2xhdGVZKDEwcHgpO2JhY2tncm91bmQ6cmdiYSgxNiwyNiw0NSwuOTYpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MTBweCAxNnB4O2JvcmRlci1yYWRpdXM6MTJweDtvcGFjaXR5OjA7cG9pbnRlci1ldmVudHM6bm9uZTt0cmFuc2l0aW9uOi4yNXM7ei1pbmRleDo1MDA7bWF4LXdpZHRoOjgwdnc7dGV4dC1hbGlnbjpjZW50ZXJ9Ci50b2FzdC5vbntvcGFjaXR5OjE7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSkgdHJhbnNsYXRlWSgwKX0KLnRvYXN0LmVycntib3JkZXItY29sb3I6cmdiYSgyNDksMTEyLDEwNiwuNSk7Y29sb3I6I0ZGRDNEMX0KLnRvYXN0Lm9re2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjUpO2NvbG9yOiNDOUY3RTN9Ci8qIOaKk+WMheaVmeeoi+W8ueWxgiAqLwouc2hlZXQtbWFza3twb3NpdGlvbjpmaXhlZDtpbnNldDowO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuNjIpO3otaW5kZXg6MzAwO2Rpc3BsYXk6bm9uZTthbGlnbi1pdGVtczpmbGV4LWVuZH0KLnNoZWV0LW1hc2sub257ZGlzcGxheTpmbGV4fQouc2hlZXR7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kOiMwRDE1MjY7Ym9yZGVyLXJhZGl1czoyMnB4IDIycHggMCAwO3BhZGRpbmc6MjBweCAxOHB4IGNhbGMoMjBweCArIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSk7Ym9yZGVyLXRvcDoxcHggc29saWQgdmFyKC0tbGluZTIpO2FuaW1hdGlvbjp1cCAuMjZzIGVhc2V9CkBrZXlmcmFtZXMgdXB7ZnJvbXt0cmFuc2Zvcm06dHJhbnNsYXRlWSgzMHB4KTtvcGFjaXR5Oi41fXRve3RyYW5zZm9ybTpub25lO29wYWNpdHk6MX19Ci5zaGVldCBoM3tmb250LXNpemU6MTZweDtmb250LXdlaWdodDo5MDA7bWFyZ2luLWJvdHRvbTo0cHh9Ci5zaGVldCAuc3Vie2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206MTJweH0KLnN0ZXB7ZGlzcGxheTpmbGV4O2dhcDoxMHB4O3BhZGRpbmc6MTBweCAwO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA3KX0KLnN0ZXAgLm57d2lkdGg6MjJweDtoZWlnaHQ6MjJweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjkwMDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC1zaHJpbms6MH0KLnN0ZXAgYntmb250LXNpemU6MTNweDtkaXNwbGF5OmJsb2NrfQouc3RlcCBzcGFue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2xpbmUtaGVpZ2h0OjEuNjV9Ci5zaGVldCAuYnRuLXJvd3tkaXNwbGF5OmZsZXg7Z2FwOjhweDttYXJnaW4tdG9wOjE0cHh9Ci5zaGVldCAuYnRue2ZsZXg6MTtwYWRkaW5nOjEycHggNnB4O2JvcmRlci1yYWRpdXM6MTJweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo4MDA7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5zaGVldCAuYnRuLnByaW1hcnl7YmFja2dyb3VuZDp2YXIoLS1ncmFkKTtjb2xvcjojMDQxMjFDfQouc2hlZXQgLmJ0bi5naG9zdHtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUyKTtjb2xvcjp2YXIoLS10eHQyKX0KLmNhcC1zdGF0ZXtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci52ZWgtcm93e2Rpc3BsYXk6ZmxleDtnYXA6NnB4O2ZsZXgtd3JhcDp3cmFwO21hcmdpbi1ib3R0b206MTBweH0KLnZlaC1jaGlwe3BhZGRpbmc6NXB4IDExcHg7Ym9yZGVyLXJhZGl1czoyMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2NvbG9yOnZhcigtLXR4dDIpO2ZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjcwMH0KLnZlaC1jaGlwLm9ue2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKX0KbmF2e3Bvc2l0aW9uOmZpeGVkO2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO3otaW5kZXg6ODA7ZGlzcGxheTpmbGV4O3BhZGRpbmc6OHB4IDEycHggY2FsYyg4cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpO2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC45KTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDI0cHgpIHNhdHVyYXRlKDEuNik7YmFja2Ryb3AtZmlsdGVyOmJsdXIoMjRweCkgc2F0dXJhdGUoMS42KTtib3JkZXItdG9wOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4xKX0KLm5hdi1pdGVte2ZsZXg6MTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6M3B4O3BhZGRpbmc6NnB4IDA7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NzAwO2JvcmRlci1yYWRpdXM6MTJweH0KLm5hdi1pdGVtIHN2Z3t3aWR0aDoyMHB4O2hlaWdodDoyMHB4fQoubmF2LWl0ZW0ub257Y29sb3I6dmFyKC0tYnJhbmQpfQouc3Bpbnt3aWR0aDoxNHB4O2hlaWdodDoxNHB4O2JvcmRlcjoycHggc29saWQgcmdiYSg0LDE4LDI4LC4zKTtib3JkZXItdG9wLWNvbG9yOiMwNDEyMUM7Ym9yZGVyLXJhZGl1czo1MCU7YW5pbWF0aW9uOnNwIC43cyBsaW5lYXIgaW5maW5pdGV9CkBrZXlmcmFtZXMgc3B7dG97dHJhbnNmb3JtOnJvdGF0ZSgzNjBkZWcpfX0KLyogdjIuMTYuMjMg6LWb5Y2a5pyL5YWL5YWF55S15Yqo55S7ICovCkBrZXlmcmFtZXMgY2hnU2Nhbnt0b3tsZWZ0OjEyNSV9fQouY2hnLWNvcm5lcntwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxNHB4O2hlaWdodDoxNHB4O3BvaW50ZXItZXZlbnRzOm5vbmU7ei1pbmRleDozfQouY2hnLWNvcm5lci50bHtsZWZ0OjA7dG9wOjA7Ym9yZGVyLWxlZnQ6MnB4IHNvbGlkICMwMEYwRkY7Ym9yZGVyLXRvcDoycHggc29saWQgIzAwRjBGRn0KLmNoZy1jb3JuZXIuYnJ7cmlnaHQ6MDtib3R0b206MDtib3JkZXItcmlnaHQ6MnB4IHNvbGlkICNGRjJCRDY7Ym9yZGVyLWJvdHRvbToycHggc29saWQgI0ZGMkJENn0KLmNoZy10e2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxDb25zb2xhcyxtb25vc3BhY2U7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOjIuNXB4O2NvbG9yOiMwMEYwRkY7dGV4dC1zaGFkb3c6MCAwIDdweCByZ2JhKDAsMjQwLDI1NSwuODUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjdweDthbmltYXRpb246Y2hnRmxpY2tlciAzLjJzIGluZmluaXRlfQouY2hnLXQgLmNue2ZvbnQtc2l6ZToxMHB4O2xldHRlci1zcGFjaW5nOjFweDtjb2xvcjojRkYyQkQ2O3RleHQtc2hhZG93OjAgMCA3cHggcmdiYSgyNTUsNDMsMjE0LC45KX0KLmNoZy10IGl7d2lkdGg6NnB4O2hlaWdodDo2cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDojM0REQzk3O2JveC1zaGFkb3c6MCAwIDhweCAjM0REQzk3O2FuaW1hdGlvbjpjaGdCbGluayAxcyBpbmZpbml0ZX0KQGtleWZyYW1lcyBjaGdCbGlua3s1MCV7b3BhY2l0eTouMn19CkBrZXlmcmFtZXMgY2hnRmxpY2tlcnswJSw5MCUsMTAwJXtvcGFjaXR5OjF9OTEle29wYWNpdHk6LjQ1fTkyJXtvcGFjaXR5OjF9OTUle29wYWNpdHk6Ljd9OTYle29wYWNpdHk6MX19Ci5jaGctcG93ZXJ7Zm9udC1mYW1pbHk6dWktbW9ub3NwYWNlLE1lbmxvLENvbnNvbGFzLG1vbm9zcGFjZTtmb250LXNpemU6MjRweDtmb250LXdlaWdodDo5MDA7bGluZS1oZWlnaHQ6MS4xNTtjb2xvcjojRUFGQkZGO3RleHQtc2hhZG93OjAgMCAxNHB4IHJnYmEoMCwyNDAsMjU1LC41NSk7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouY2hnLXBvd2VyIHNtYWxse2ZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnVpLXNhbnMtc2VyaWYsc2Fucy1zZXJpZjtjb2xvcjojRkYyQkQ2O3RleHQtc2hhZG93OjAgMCA4cHggcmdiYSgyNTUsNDMsMjE0LC43KTttYXJnaW4tbGVmdDozcHg7bGV0dGVyLXNwYWNpbmc6MXB4fQouY2hnLXJpZ2h0e3RleHQtYWxpZ246cmlnaHQ7ei1pbmRleDoxfQouY2hnLXJlbWFpbntmb250LWZhbWlseTp1aS1tb25vc3BhY2UsTWVubG8sQ29uc29sYXMsbW9ub3NwYWNlO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjkwMDtjb2xvcjojMDBGMEZGO3RleHQtc2hhZG93OjAgMCAxMHB4IHJnYmEoMCwyNDAsMjU1LC43NSk7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouY2hnLXN1Yntmb250LXNpemU6OXB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxNZW5sbyxDb25zb2xhcyxtb25vc3BhY2U7bGV0dGVyLXNwYWNpbmc6MXB4O2NvbG9yOiM4QjlFQzQ7bWFyZ2luLXRvcDozcHh9CkBrZXlmcmFtZXMgY2hnU3dlZXB7MCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTEyMCUpfTEwMCV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMzIwJSl9fQovKiB2Mi4xNi4yNiDlhYXnlLXml7bovabovobljaHniYfotZvljZrmnIvlhYsgKi8KLmhlcm8uY2hnLWhlcm97Ym9yZGVyLXJhZGl1czoycHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTI1ZGVnLHJnYmEoMCwyNDAsMjU1LC4xMikscmdiYSgyNTUsNDMsMjE0LC4wNykgNTUlLHJnYmEoOSwxNCwyOCwuMikpLCMwNzBCMTY7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDAsMjQwLDI1NSwuNSk7Ym94LXNoYWRvdzowIDAgMjBweCByZ2JhKDAsMjQwLDI1NSwuMTYpLGluc2V0IDAgMCAyNnB4IHJnYmEoMCwyNDAsMjU1LC4wNik7Y2xpcC1wYXRoOnBvbHlnb24oMCAxNHB4LDE0cHggMCxjYWxjKDEwMCUgLSAxOHB4KSAwLDEwMCUgMThweCwxMDAlIDEwMCUsMCAxMDAlKX0KLmhlcm8uY2hnLWhlcm86OmJlZm9yZXtjb250ZW50OiIiO3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7YmFja2dyb3VuZC1pbWFnZTpsaW5lYXItZ3JhZGllbnQocmdiYSgwLDI0MCwyNTUsLjA3KSAxcHgsdHJhbnNwYXJlbnQgMXB4KSxsaW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSgwLDI0MCwyNTUsLjA3KSAxcHgsdHJhbnNwYXJlbnQgMXB4KTtiYWNrZ3JvdW5kLXNpemU6MTRweCAxNHB4Oy13ZWJraXQtbWFzay1pbWFnZTpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCMwMDAgMjAlLHRyYW5zcGFyZW50IDk1JSk7bWFzay1pbWFnZTpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCMwMDAgMjAlLHRyYW5zcGFyZW50IDk1JSk7cG9pbnRlci1ldmVudHM6bm9uZX0KLmhlcm8uY2hnLWhlcm86OmFmdGVye2NvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDotNDUlO3dpZHRoOjQ1JTtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCg5MGRlZyx0cmFuc3BhcmVudCxyZ2JhKDAsMjQwLDI1NSwuMjUpLHJnYmEoMjU1LDQzLDIxNCwuMTgpLHRyYW5zcGFyZW50KTt0cmFuc2Zvcm06c2tld1goLTE4ZGVnKTthbmltYXRpb246Y2hnU2NhbiAyLjRzIGxpbmVhciBpbmZpbml0ZTtwb2ludGVyLWV2ZW50czpub25lfQouaGVyby5jaGctaGVybyAudmVoLXJvdywuaGVyby5jaGctaGVybyAuaGVyby1oZWFkLC5oZXJvLmNoZy1oZXJvIC5oZXJvLXNvYy1saW5lLC5oZXJvLmNoZy1oZXJvIC5oZXJvLXZlaGljbGUsLmhlcm8uY2hnLWhlcm8gLmhlcm8tdGlyZXMsLmhlcm8uY2hnLWhlcm8gLmhlcm8tY2hnLC5oZXJvLmNoZy1oZXJvIC5zb2MtYmFyLC5oZXJvLmNoZy1oZXJvIC5oZXJvLWxvY3twb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjJ9Ci5oZXJvLWNoZ3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjEwcHg7bWFyZ2luLXRvcDoxNHB4O3BhZGRpbmctdG9wOjEycHg7Ym9yZGVyLXRvcDoxcHggc29saWQgcmdiYSgwLDI0MCwyNTUsLjE2KX0KLmhlcm8tY2hnIC5jaGctdHthbGlnbi1zZWxmOmNlbnRlcn0KLmhlcm8tY2hnIC5jaGctcG93ZXJ7Zm9udC1zaXplOjIxcHg7bGluZS1oZWlnaHQ6MX0KLmhlcm8uY2hnLWhlcm8gLnNvYy1iYXJ7aGVpZ2h0OjlweDtib3JkZXItcmFkaXVzOjJweDtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMCwyNDAsMjU1LC4yOCk7YmFja2dyb3VuZDpyZ2JhKDAsMjQwLDI1NSwuMDgpfQouaGVyby5jaGctaGVybyAuc29jLWZpbGwuY2hne2JvcmRlci1yYWRpdXM6MnB4fQovKiB2Mi4xNi4yNCDmlrDniYjniLHovabpppbpobUgKi8KLmhlcm8taGVhZHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6ZmxleC1zdGFydDtnYXA6OHB4fQouaGVyby1uYW1le2ZvbnQtc2l6ZToxOXB4O2ZvbnQtd2VpZ2h0OjkwMDtsZXR0ZXItc3BhY2luZzotLjJweH0KLmhlcm8tc3Vie2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6M3B4O292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO3doaXRlLXNwYWNlOm5vd3JhcH0KLmhlcm8tY2hpcHN7ZGlzcGxheTpmbGV4O2dhcDo1cHg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmZsZXgtZW5kO21heC13aWR0aDo1OCV9Ci5oY2hpcHtmb250LXNpemU6OXB4O2ZvbnQtd2VpZ2h0OjgwMDtib3JkZXItcmFkaXVzOjdweDtwYWRkaW5nOjNweCA3cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjA4KTtjb2xvcjp2YXIoLS10eHQyKTt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5oY2hpcC5va3tjb2xvcjp2YXIoLS1vayk7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjEpO2JvcmRlci1jb2xvcjpyZ2JhKDYxLDIyMCwxNTEsLjI4KX0KLmhjaGlwLmNoZ3tjb2xvcjp2YXIoLS1icmFuZCk7YmFja2dyb3VuZDpyZ2JhKDQzLDIxMiwyNDIsLjEzKTtib3JkZXItY29sb3I6cmdiYSg0MywyMTIsMjQyLC4zMil9Ci8qIHYyLjE2LjI3IOWumOaWuemjjuagvOmmlumhtSAqLwouaGVyby1zb2MtbGluZXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7Z2FwOjlweDttYXJnaW4tdG9wOjEycHh9Ci5oZXJvLXNvYy1saW5lIGJ7Zm9udC1zaXplOjQycHg7Zm9udC13ZWlnaHQ6OTAwO2xpbmUtaGVpZ2h0Oi45MjtsZXR0ZXItc3BhY2luZzotMnB4O2NvbG9yOnZhcigtLWJyYW5kKTtmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXN9Ci5oZXJvLXNvYy1saW5lIGIgc21hbGx7Zm9udC1zaXplOjE0cHg7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luLWxlZnQ6MXB4O2xldHRlci1zcGFjaW5nOjB9Ci5oZXJvLXJhbmdle2ZvbnQtc2l6ZToxOHB4O2ZvbnQtd2VpZ2h0OjkwMDtjb2xvcjp2YXIoLS10eHQpO21hcmdpbi1ib3R0b206M3B4O2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLmhlcm8tcmFuZ2Ugc21hbGx7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLWxlZnQ6MXB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmhlcm8tdm9sdC1pbmxpbmV7Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1ib3R0b206NXB4O2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLmhlcm8tdm9sdC1pbmxpbmUgc21hbGx7Zm9udC1zaXplOjlweDttYXJnaW4tbGVmdDoxcHg7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oZXJvIC5zb2MtYmFye21hcmdpbi10b3A6MTBweH0KLmhlcm8tdmVoaWNsZXtoZWlnaHQ6MTkycHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbi10b3A6NnB4fQouaGVyby12ZWhpY2xlIGltZ3ttYXgtd2lkdGg6MTAwJTttYXgtaGVpZ2h0OjE5MnB4O29iamVjdC1maXQ6Y29udGFpbjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCAxOHB4IDMwcHggcmdiYSgwLDAsMCwuNSkpfQouaGVyby12ZWhpY2xlIHN2Z3t3aWR0aDo3MHB4O2hlaWdodDo3MHB4fQouaGVyby10aXJlc3tkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6NDZweDttYXJnaW4tdG9wOjJweDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tdHh0Myl9Ci5oZXJvLXRpcmVzIHNwYW57d2hpdGUtc3BhY2U6bm93cmFwfQouaGVyby10aXJlcyBie2NvbG9yOnZhcigtLXR4dCk7Zm9udC1zaXplOjEzcHg7bWFyZ2luOjAgMXB4O2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLmhlcm8tdGlyZXMgZW17Zm9udC1zdHlsZTpub3JtYWw7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEwcHg7bWFyZ2luLWxlZnQ6NHB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmhlcm8tbG9je2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweDttYXJnaW4tdG9wOjE0cHg7cGFkZGluZy10b3A6MTJweDtib3JkZXItdG9wOjFweCBzb2xpZCByZ2JhKDE0NiwxNzAsMjA1LC4xKTtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKTtmb250LXdlaWdodDo2MDB9Ci5oZXJvLWxvYyBzdmd7d2lkdGg6MTNweDtoZWlnaHQ6MTNweDtjb2xvcjp2YXIoLS1icmFuZCk7ZmxleC1zaHJpbms6MH0KLmhlcm8tbG9jIC5hZGRye2ZsZXg6MTttaW4td2lkdGg6MDtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5oZXJvLWxvYy1tZXRhe2ZsZXgtc2hyaW5rOjA7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtczt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5zb2MtYmFye2hlaWdodDo4cHg7Ym9yZGVyLXJhZGl1czo5OXB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMTQpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tdG9wOjE0cHh9Ci5zb2MtZmlsbHtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47aGVpZ2h0OjEwMCU7Ym9yZGVyLXJhZGl1czo5OXB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDkwZGVnLCMyQkQ0RjIsIzNEREM5Nyk7dHJhbnNpdGlvbjp3aWR0aCAuNnN9Ci5zb2MtZmlsbC5jaGd7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcsIzAwRjBGRiwjRkYyQkQ2KTtib3gtc2hhZG93OjAgMCAxMnB4IHJnYmEoMCwyNDAsMjU1LC41KX0KLnNvYy1maWxsLmNoZzo6YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtib3R0b206MDtsZWZ0OjA7d2lkdGg6NDUlO2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDkwZGVnLHRyYW5zcGFyZW50LHJnYmEoMjU1LDI1NSwyNTUsLjg1KSx0cmFuc3BhcmVudCk7YW5pbWF0aW9uOmNoZ1N3ZWVwIDEuNHMgbGluZWFyIGluZmluaXRlfQoucWEtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjZweDttYXJnaW46MCAwIDE4cHh9Ci5xYXtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6N3B4O3BhZGRpbmc6MnB4IDA7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lfQoucWE6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoucWEgLmlje3dpZHRoOjQ4cHg7aGVpZ2h0OjQ4cHg7Ym9yZGVyLXJhZGl1czo1MCU7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuMDYpO2JvcmRlcjoxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMTgpO2NvbG9yOnZhcigtLXR4dCl9Ci5xYSBzdmd7d2lkdGg6MjBweDtoZWlnaHQ6MjBweH0KLnFhIHNwYW57Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6NzAwO2NvbG9yOnZhcigtLXR4dDIpfQoucWEudW5sb2NrIC5pY3tjb2xvcjp2YXIoLS1vayk7YmFja2dyb3VuZDpyZ2JhKDYxLDIyMCwxNTEsLjA4KTtib3JkZXItY29sb3I6cmdiYSg2MSwyMjAsMTUxLC4yNil9Ci5xYS5sb2NrIC5pY3tjb2xvcjp2YXIoLS1lcnIpO2JhY2tncm91bmQ6cmdiYSgyNDksMTEyLDEwNiwuMDgpO2JvcmRlci1jb2xvcjpyZ2JhKDI0OSwxMTIsMTA2LC4yNil9Ci5sb2MtbmFtZXtmb250LXNpemU6MTNweDtmb250LXdlaWdodDo4MDA7bGluZS1oZWlnaHQ6MS40NX0KLmxvYy1tZXRhe2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi10b3A6N3B4O2ZvbnQtd2VpZ2h0OjYwMH0KLnJpZGUtdG9we2Rpc3BsYXk6ZmxleDtnYXA6OXB4O21hcmdpbi10b3A6NHB4fQoucmlkZS1jZWxse2ZsZXg6MTtiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuNCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo5cHggMTBweDttaW4td2lkdGg6MH0KLnJpZGUtY2VsbCBie2ZvbnQtc2l6ZToxOXB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXN9Ci5yaWRlLWNlbGwgYiBzbWFsbHtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWxlZnQ6MnB4fQoucmlkZS1jZWxsIHNwYW57ZGlzcGxheTpibG9jaztmb250LXNpemU6OS41cHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDoycHg7Zm9udC13ZWlnaHQ6NjAwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO3doaXRlLXNwYWNlOm5vd3JhcH0KLnJpZGUtYmFyc3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7Z2FwOjVweDtoZWlnaHQ6NTRweDttYXJnaW4tdG9wOjEycHh9Ci5yYntmbGV4OjE7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjRweDtoZWlnaHQ6MTAwJTtqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1lbmR9Ci5yYiAuYmFye3dpZHRoOjEwMCU7bWF4LXdpZHRoOjEzcHg7Ym9yZGVyLXJhZGl1czo0cHggNHB4IDJweCAycHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCMyQkQ0RjIscmdiYSg0MywyMTIsMjQyLC4yMikpO21pbi1oZWlnaHQ6M3B4O3RyYW5zaXRpb246aGVpZ2h0IC41c30KLnJiIC5sYntmb250LXNpemU6OHB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMH0KLnJiLm9ue2JhY2tncm91bmQ6cmdiYSg0MywyMTIsMjQyLC4wOCl9Ci5yYi5vbiAuYmFye2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZywjM0REQzk3LHJnYmEoNjEsMjIwLDE1MSwuMjUpKTtib3gtc2hhZG93OjAgMCA4cHggcmdiYSg0MywyMTIsMjQyLC40KX0KLnJiLm9uIC5sYntjb2xvcjp2YXIoLS1icmFuZCk7Zm9udC13ZWlnaHQ6OTAwfQoucmI6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTQpfQoucmlkZS1kYXl7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEzcHg7cGFkZGluZzoxMHB4IDExcHg7bWFyZ2luLXRvcDoxMXB4O2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC40KX0KLnJpZGUtZGF5LWhlYWR7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDB9Ci5yaWRlLWRheS1oZWFkIGVte2ZvbnQtc3R5bGU6bm9ybWFsO2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6NzAwfQoucmlkZS1kYXktZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgzLDFmcik7Z2FwOjdweDttYXJnaW4tdG9wOjlweH0KLnJkZ3tiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjA1KTtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzo3cHggNnB4O3RleHQtYWxpZ246Y2VudGVyfQoucmRnIGJ7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6OTAwO2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtc30KLnJkZyBiIHNtYWxse2ZvbnQtc2l6ZTo5cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1sZWZ0OjFweH0KLnJkZyBzcGFue2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjFweDtmb250LXdlaWdodDo2MDB9Ci5yaWRlLWV4dHtkaXNwbGF5OmZsZXg7Z2FwOjZweDttYXJnaW4tdG9wOjExcHg7ZmxleC13cmFwOndyYXB9Ci5yaWRlLWV4dCBzcGFue2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nOjRweCA4cHg7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDpyZ2JhKDcsMTEsMjIsLjQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Y29sb3I6dmFyKC0tdHh0Mil9Ci5yaWRlLWV4dCBie2NvbG9yOnZhcigtLWJyYW5kKTtmb250LXdlaWdodDo5MDA7bWFyZ2luLWxlZnQ6MnB4fQouaGNoaXAud2Fybntjb2xvcjp2YXIoLS13YXJuKTtiYWNrZ3JvdW5kOnJnYmEoMjQ3LDE4NSw4NSwuMTIpO2JvcmRlci1jb2xvcjpyZ2JhKDI0NywxODUsODUsLjMpfQovKiB2Mi4xNi4yNiDorr7nva7pvb/ova7pnaLmnb8gKi8KLmdlYXItc2hlZXR7bWF4LWhlaWdodDo4NnZoO292ZXJmbG93LXk6YXV0bzstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaDtwYWRkaW5nLWJvdHRvbTpjYWxjKDE2cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpfQouZ2Vhci1zaGVldCAuc2hlZXQtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO21hcmdpbi1ib3R0b206MTJweH0KLmdlYXItc2hlZXQgLnNoZWV0LWhlYWQgaDN7bWFyZ2luOjB9Ci5nY2xvc2V7d2lkdGg6MzBweDtoZWlnaHQ6MzBweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJnYmEoMTQ2LDE3MCwyMDUsLjEpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtjb2xvcjp2YXIoLS10eHQyKTtmb250LXNpemU6MTRweDtmb250LXdlaWdodDo4MDA7ZmxleC1zaHJpbms6MH0KLmdycHtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDttYXJnaW4tYm90dG9tOjhweDtiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuNDIpO292ZXJmbG93OmhpZGRlbn0KLmdycC1oZWFke2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjExcHg7cGFkZGluZzoxM3B4fQouZ3JwLWhlYWQ6YWN0aXZle2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMDYpfQouZ3JwLWlje3dpZHRoOjMycHg7aGVpZ2h0OjMycHg7Ym9yZGVyLXJhZGl1czoxMHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Y29sb3I6dmFyKC0tYnJhbmQpO2ZsZXgtc2hyaW5rOjB9Ci5ncnAtaWMgc3Zne3dpZHRoOjE3cHg7aGVpZ2h0OjE3cHh9Ci5ncnAtdHtmbGV4OjE7bWluLXdpZHRoOjB9Ci5ncnAtdCBie2ZvbnQtc2l6ZToxMy41cHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6YmxvY2t9Ci5ncnAtdCBzcGFue2ZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXR4dDMpO2Rpc3BsYXk6YmxvY2s7bWFyZ2luLXRvcDoxcHg7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7d2hpdGUtc3BhY2U6bm93cmFwfQouZ3JwLXJ7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO2ZsZXgtc2hyaW5rOjA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NXB4fQouZ3JwLXIgLmNodntkaXNwbGF5OmlubGluZS1ibG9jaztmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoxO3RyYW5zaXRpb246dHJhbnNmb3JtIC4yMnN9Ci5ncnAub24gLmdycC1yIC5jaHZ7dHJhbnNmb3JtOnJvdGF0ZSg5MGRlZyk7Y29sb3I6dmFyKC0tYnJhbmQpfQouZ3JwLWJvZHl7bWF4LWhlaWdodDowO292ZXJmbG93OmhpZGRlbjt0cmFuc2l0aW9uOm1heC1oZWlnaHQgLjI4cyBlYXNlfQouZ3JwLm9uIC5ncnAtYm9keXttYXgtaGVpZ2h0OjgyMHB4fQouZ3JwLWJvZHktaW57cGFkZGluZzoycHggMTNweCAxMnB4O2JvcmRlci10b3A6MXB4IHNvbGlkIHJnYmEoMTQ2LDE3MCwyMDUsLjA3KX0KLmdycC1ib2R5LWluIC5yb3d7cGFkZGluZzo5cHggMH0KLmdycC1ib2R5LWluIC5zd2l0Y2gtcm93e3BhZGRpbmc6MTBweCAwfQouZ3JwLWJvZHktaW4gLmhpbnR7bWFyZ2luLXRvcDo0cHh9Ci5ncnAtYm9keS1pbiAuZmllbGR7bWFyZ2luLWJvdHRvbTo5cHg7bWFyZ2luLXRvcDo2cHh9Ci5nYnRue3dpZHRoOjEwMCU7cGFkZGluZzoxMHB4O2JvcmRlci1yYWRpdXM6MTFweDtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo4MDA7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpO2JvcmRlcjoxcHggc29saWQgcmdiYSg0MywyMTIsMjQyLC4zKTtjb2xvcjp2YXIoLS1icmFuZCk7bWFyZ2luLXRvcDo4cHh9Ci5nYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk3KX0KLmdidG4uZGFuZ2Vye2JhY2tncm91bmQ6cmdiYSgyNDksMTEyLDEwNiwuMSk7Ym9yZGVyLWNvbG9yOnJnYmEoMjQ5LDExMiwxMDYsLjMpO2NvbG9yOnZhcigtLWVycil9Ci5nYWN0c3tkaXNwbGF5OmZsZXg7Z2FwOjdweDttYXJnaW4tdG9wOjhweH0KLmdhY3RzIC5nYnRue21hcmdpbi10b3A6MDtwYWRkaW5nOjEwcHggNHB4O2ZvbnQtc2l6ZToxMXB4fQovKiB2Mi4xNi4zMiDpqpHooYzlm57mlL4gKi8KLnJwLW1hc2t7cG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDtiYWNrZ3JvdW5kOiMwNTA3MEU7ei1pbmRleDo0MDA7ZGlzcGxheTpub25lO2ZsZXgtZGlyZWN0aW9uOmNvbHVtbn0KLnJwLW1hc2sub257ZGlzcGxheTpmbGV4fQoucnAtaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O3BhZGRpbmc6Y2FsYygxMnB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC10b3ApKSAxNnB4IDEwcHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMSk7ZmxleC1zaHJpbms6MH0KLnJwLWhlYWQgLnR0e3RleHQtYWxpZ246Y2VudGVyO2ZsZXg6MTttaW4td2lkdGg6MH0KLnJwLWhlYWQgLnR0IGJ7Zm9udC1zaXplOjE1cHg7Zm9udC13ZWlnaHQ6OTAwO2Rpc3BsYXk6YmxvY2s7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzfQoucnAtaGVhZCAudHQgc3BhbntkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZTo5LjVweDtjb2xvcjp2YXIoLS10eHQzKTttYXJnaW4tdG9wOjFweDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXN9Ci5ycC14e3dpZHRoOjM0cHg7aGVpZ2h0OjM0cHg7Ym9yZGVyLXJhZGl1czoxMXB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Mik7Zm9udC1zaXplOjE0cHg7ZmxleC1zaHJpbms6MH0KLnJwLXBvc3Rlci1idG57Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjMpO2JvcmRlci1yYWRpdXM6OXB4O3BhZGRpbmc6N3B4IDExcHg7ZmxleC1zaHJpbms6MH0KLnJwLWNoaXBze2Rpc3BsYXk6ZmxleDtnYXA6NnB4O3BhZGRpbmc6MTBweCAxNnB4IDA7b3ZlcmZsb3cteDphdXRvO2ZsZXgtc2hyaW5rOjB9Ci5ycC1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQoucnAtY2hpcHtmbGV4LXNocmluazowO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjgwMDtwYWRkaW5nOjVweCA5cHg7Ym9yZGVyLXJhZGl1czo4cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLXR4dDIpO3doaXRlLXNwYWNlOm5vd3JhcH0KLnJwLWNoaXAub257Ym9yZGVyLWNvbG9yOnZhcigtLWJyYW5kKTtjb2xvcjp2YXIoLS1icmFuZCk7YmFja2dyb3VuZDp2YXIoLS1icmFuZFNvZnQpfQoucnAtbWFwe2ZsZXg6MTtwb3NpdGlvbjpyZWxhdGl2ZTttYXJnaW46MTBweCAxNnB4O2JvcmRlci1yYWRpdXM6MThweDtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTttaW4taGVpZ2h0OjIyMHB4O2JhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KDcwJSA1MCUgYXQgNjAlIDMwJSxyZ2JhKDQzLDIxMiwyNDIsLjA4KSx0cmFuc3BhcmVudCA3MCUpLHJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoMGRlZyxyZ2JhKDE0NiwxNzAsMjA1LC4wNSkgMCAxcHgsdHJhbnNwYXJlbnQgMXB4IDQycHgpLHJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoOTBkZWcscmdiYSgxNDYsMTcwLDIwNSwuMDUpIDAgMXB4LHRyYW5zcGFyZW50IDFweCA0MnB4KSwjMDcwQzE4fQoucnAtbWFwIHN2Z3twb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7ei1pbmRleDoxfQoucnAtdGlsZXN7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtvdmVyZmxvdzpoaWRkZW47ZmlsdGVyOmludmVydCgxKSBodWUtcm90YXRlKDE4NWRlZykgYnJpZ2h0bmVzcyguNjIpIHNhdHVyYXRlKC41NSk7b3BhY2l0eTouOTt6LWluZGV4OjB9Ci5ycC10aWxlcyBpbWd7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MjU2cHg7aGVpZ2h0OjI1NnB4O2JvcmRlcjowO3BvaW50ZXItZXZlbnRzOm5vbmV9Ci5ycC1hdHRye3Bvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjZweDtib3R0b206NHB4O2ZvbnQtc2l6ZTo3cHg7Y29sb3I6cmdiYSgxNDYsMTcwLDIwNSwuNTUpO3otaW5kZXg6Mjtwb2ludGVyLWV2ZW50czpub25lfQoucnAtc3BlZWR7cG9zaXRpb246YWJzb2x1dGU7bGVmdDo1MCU7dG9wOjEycHg7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoLTUwJSk7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnJnYmEoNiwxNCwyNiwuOSk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjM1KTtib3JkZXItcmFkaXVzOjhweDtwYWRkaW5nOjRweCA5cHg7d2hpdGUtc3BhY2U6bm93cmFwfQoucnAtY3RybHtwYWRkaW5nOjAgMTZweDtmbGV4LXNocmluazowfQoucnAtcHJvZ3twb3NpdGlvbjpyZWxhdGl2ZTtoZWlnaHQ6MjRweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyfQoucnAtcHJvZyBpbnB1dHt3aWR0aDoxMDAlOy13ZWJraXQtYXBwZWFyYW5jZTpub25lO2hlaWdodDo0cHg7Ym9yZGVyLXJhZGl1czo5OXB4O2JhY2tncm91bmQ6cmdiYSgxNDYsMTcwLDIwNSwuMik7b3V0bGluZTpub25lfQoucnAtcHJvZyBpbnB1dDo6LXdlYmtpdC1zbGlkZXItdGh1bWJ7LXdlYmtpdC1hcHBlYXJhbmNlOm5vbmU7d2lkdGg6MTRweDtoZWlnaHQ6MTRweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOiNmZmY7Ym94LXNoYWRvdzowIDAgOHB4IHJnYmEoNDMsMjEyLDI0MiwuOCl9Ci5ycC1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDttYXJnaW4tdG9wOjJweH0KLnJwLXBsYXl7d2lkdGg6NDRweDtoZWlnaHQ6NDRweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzJCRDRGMiwjMEU4RkIyKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC1zaHJpbms6MDtjb2xvcjojMDQxMjFDO2ZvbnQtc2l6ZToxM3B4O2ZvbnQtd2VpZ2h0OjkwMH0KLnJwLXRpbWV7ZmxleDoxO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjkwMDtmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXN9Ci5ycC10aW1lIHNwYW57Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwO2ZvbnQtc2l6ZToxMHB4O21hcmdpbi1sZWZ0OjRweH0KLnJwLXNwZHtkaXNwbGF5OmZsZXg7Z2FwOjRweH0KLnJwLXNwZCBpe2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6ODAwO3BhZGRpbmc6NHB4IDdweDtib3JkZXItcmFkaXVzOjZweDtjb2xvcjp2YXIoLS10eHQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpfQoucnAtc3BkIGkub257Y29sb3I6IzA0MTIxQztiYWNrZ3JvdW5kOnZhcigtLWJyYW5kKTtib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpfQoucnAtc3RhdHN7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNCwxZnIpO2dhcDo3cHg7cGFkZGluZzoxMnB4IDE2cHggY2FsYygxNnB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKTtmbGV4LXNocmluazowfQoucmlkZS1kYXktaGVhZCBlbXttYXJnaW4tbGVmdDphdXRvfQoucmlkZS1kYXktaGVhZCAucnAtb3BlbnttYXJnaW4tbGVmdDoxMHB4O2NvbG9yOnZhcigtLWJyYW5kKTtmb250LXNpemU6OXB4O2ZvbnQtd2VpZ2h0OjgwMDtmbGV4LXNocmluazowfQovKiB2Mi4xNi4zMiDmtbfmiqUgKi8KLnBvc3Rlci1tYXNre3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7YmFja2dyb3VuZDpyZ2JhKDQsOCwxNiwuOTYpO3otaW5kZXg6NDEwO2Rpc3BsYXk6bm9uZTtmbGV4LWRpcmVjdGlvbjpjb2x1bW47cGFkZGluZzpjYWxjKDEycHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCkpIDE2cHggY2FsYygxNHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKX0KLnBvc3Rlci1tYXNrLm9ue2Rpc3BsYXk6ZmxleH0KLnBvc3Rlci10b3B7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjEwcHg7ZmxleC1zaHJpbms6MH0KLnBvc3Rlci10b3AgYntmb250LXNpemU6MTVweDtmb250LXdlaWdodDo5MDB9Ci5wb3N0ZXItd3JhcHtmbGV4OjE7bWluLWhlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcn0KLnBvc3Rlci1pbWd7bWF4LXdpZHRoOjEwMCU7bWF4LWhlaWdodDoxMDAlO2JvcmRlci1yYWRpdXM6MTRweDtib3gtc2hhZG93OjAgMThweCA0MHB4IHJnYmEoMCwwLDAsLjUpOy13ZWJraXQtdG91Y2gtY2FsbG91dDpkZWZhdWx0O3VzZXItc2VsZWN0OmF1dG99Ci5wb3N0ZXItYWN0aW9uc3tkaXNwbGF5OmZsZXg7Z2FwOjhweDttYXJnaW4tdG9wOjEycHg7ZmxleC1zaHJpbms6MH0KLnBvc3Rlci1hY3Rpb25zIC5ie2ZsZXg6MTtwYWRkaW5nOjEycHg7Ym9yZGVyLXJhZGl1czoxMnB4O3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjkwMH0KLnBvc3Rlci1hY3Rpb25zIC5iLmdob3N0e2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2NvbG9yOnZhcigtLXR4dDIpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCl9Ci5wb3N0ZXItYWN0aW9ucyAuYi5wcmltYXJ5e2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDEzNWRlZywjMkJENEYyLCMwRThGQjIpO2NvbG9yOiMwNDEyMUN9Ci8qIHYyLjE2LjMzIOmqkeihjOaciOaKpSAqLwoubW9udGgtc2hlZXR7bWF4LWhlaWdodDo4OHZoO292ZXJmbG93LXk6YXV0bzstd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzp0b3VjaDtwYWRkaW5nLWJvdHRvbTpjYWxjKDE2cHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpfQoubW9udGgtc2hlZXQgLnNoZWV0LWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjEycHh9Ci5tb250aC1zaGVldCAuc2hlZXQtaGVhZCBoM3ttYXJnaW46MH0KLm1vbnRoLWNoaXBze2Rpc3BsYXk6ZmxleDtnYXA6NnB4O292ZXJmbG93LXg6YXV0bztwYWRkaW5nLWJvdHRvbTo4cHh9Ci5tb250aC1jaGlwczo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQoubW9udGgtY2hpcHtmbGV4LXNocmluazowO2ZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjgwMDtwYWRkaW5nOjVweCAxMHB4O2JvcmRlci1yYWRpdXM6OHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7YmFja2dyb3VuZDp2YXIoLS1jYXJkKTtjb2xvcjp2YXIoLS10eHQyKTt3aGl0ZS1zcGFjZTpub3dyYXB9Ci5tb250aC1jaGlwLm9ue2JvcmRlci1jb2xvcjp2YXIoLS1icmFuZCk7Y29sb3I6dmFyKC0tYnJhbmQpO2JhY2tncm91bmQ6dmFyKC0tYnJhbmRTb2Z0KX0KLm1vbnRoLWhlcm97Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDQzLDIxMiwyNDIsLjIpO2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE0cHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTUwZGVnLHJnYmEoNDMsMjEyLDI0MiwuMTIpLHRyYW5zcGFyZW50IDYwJSkscmdiYSg3LDExLDIyLC40KX0KLm1vbnRoLWhlcm8gLm1oe2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo4MDB9Ci5tb250aC1oZXJvIC5taCBlbXtmb250LXN0eWxlOm5vcm1hbDtjb2xvcjp2YXIoLS1icmFuZCl9Ci5tb250aC1iaWd7Zm9udC1zaXplOjM2cHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLWJyYW5kKTtsaW5lLWhlaWdodDoxLjE7bWFyZ2luLXRvcDo2cHg7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQoubW9udGgtYmlnIHNtYWxse2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnZhcigtLXR4dDIpO21hcmdpbi1sZWZ0OjNweH0KLm1vbnRoLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMywxZnIpO2dhcDo3cHg7bWFyZ2luLXRvcDoxMHB4fQoubW9udGgtZ3JpZCAuY3tiYWNrZ3JvdW5kOnJnYmEoNywxMSwyMiwuNDUpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6N3B4IDZweDt0ZXh0LWFsaWduOmNlbnRlcn0KLm1vbnRoLWdyaWQgYntkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OjkwMH0KLm1vbnRoLWdyaWQgc3Bhbntmb250LXNpemU6OC41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwfQoubW9udGgtc2Vje21hcmdpbi10b3A6MTRweH0KLm1vbnRoLXNlYyBoNHtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo5MDA7bWFyZ2luLWJvdHRvbTo4cHg7Y29sb3I6dmFyKC0tdHh0Mil9Ci5tb250aC1iYXJze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6N3B4O2hlaWdodDo5MnB4fQoubWJ7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpmbGV4LWVuZDtnYXA6M3B4O2hlaWdodDoxMDAlfQoubWIgLmJ7d2lkdGg6MTAwJTttYXgtd2lkdGg6MjRweDtib3JkZXItcmFkaXVzOjRweCA0cHggMnB4IDJweDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcsIzJCRDRGMixyZ2JhKDQzLDIxMiwyNDIsLjIpKTttaW4taGVpZ2h0OjNweH0KLm1iLm9uIC5ie2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZywjM0REQzk3LHJnYmEoNjEsMjIwLDE1MSwuMjUpKTtib3gtc2hhZG93OjAgMCA4cHggcmdiYSg0MywyMTIsMjQyLC4zNSl9Ci5tYiAudntmb250LXNpemU6Ny41cHg7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NzAwfQoubWIgLmx7Zm9udC1zaXplOjhweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDB9Ci5tb250aC1kYXlze2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6MnB4O2hlaWdodDo1NnB4fQoubWR7ZmxleDoxO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpmbGV4LWVuZDtoZWlnaHQ6MTAwJTtnYXA6MnB4fQoubWQgLmJ7d2lkdGg6MTAwJTttYXgtd2lkdGg6OHB4O2JvcmRlci1yYWRpdXM6MnB4O2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZywjQjdBNkZCLHJnYmEoMTgzLDE2NiwyNTEsLjIpKTttaW4taGVpZ2h0OjJweH0KLm1kIC5se2ZvbnQtc2l6ZTo2cHg7Y29sb3I6dmFyKC0tdHh0Myk7aGVpZ2h0OjdweH0KLm1vbnRoLXRvdGFse2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKTtnYXA6N3B4fQoubW9udGgtdG90YWwgLmN7YmFja2dyb3VuZDpyZ2JhKDcsMTEsMjIsLjQ1KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjhweCA2cHg7dGV4dC1hbGlnbjpjZW50ZXJ9Ci5tb250aC10b3RhbCBie2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjE2cHg7Zm9udC13ZWlnaHQ6OTAwO2NvbG9yOnZhcigtLWJyYW5kKX0KLm1vbnRoLXRvdGFsIHNwYW57Zm9udC1zaXplOjguNXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMH0KLyogdjIuMTYuMzQg5YWF55S157uf6K6hIC8g6aaW6aG15qih5Z2XICovCi5jaGFyZ2UtZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7Z2FwOjdweH0KLmNoZy1zdGF0e2JhY2tncm91bmQ6cmdiYSg3LDExLDIyLC40NSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEycHg7cGFkZGluZzo5cHggNXB4O3RleHQtYWxpZ246Y2VudGVyfQouY2hnLXN0YXQgYntkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjkwMDtjb2xvcjp2YXIoLS1icmFuZCk7Zm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zfQouY2hnLXN0YXQgYiBzbWFsbHtmb250LXNpemU6OHB4O2NvbG9yOnZhcigtLXR4dDMpO21hcmdpbi1sZWZ0OjFweH0KLmNoZy1zdGF0IHNwYW57Zm9udC1zaXplOjguNXB4O2NvbG9yOnZhcigtLXR4dDMpO2ZvbnQtd2VpZ2h0OjcwMH0KLmdtb3Zle3dpZHRoOjI2cHg7aGVpZ2h0OjI2cHg7Ym9yZGVyLXJhZGl1czo4cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6ODAwfQouZ21vdmU6YWN0aXZle3RyYW5zZm9ybTpzY2FsZSguOTIpfQoubW9udGgtdHJhY2stc3RhdGV7Zm9udC1zaXplOjlweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bWFyZ2luLWxlZnQ6NnB4fQovKiB2Mi4xNi40MyDpmYTov5HlhYXnlLXmoakgKi8KLmNwLXNoZWV0e21heC1oZWlnaHQ6OTB2aDtvdmVyZmxvdy15OmF1dG87LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6dG91Y2g7cGFkZGluZy1ib3R0b206Y2FsYygxNnB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKX0KLmNwLWhlYWR7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjttYXJnaW4tYm90dG9tOjEwcHh9Ci5jcC1oZWFkIGgze21hcmdpbjowO2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjkwMH0KLmNwLWNhdHN7ZGlzcGxheTpmbGV4O2dhcDo2cHg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmctYm90dG9tOjhweH0KLmNwLWNhdHM6Oi13ZWJraXQtc2Nyb2xsYmFye2Rpc3BsYXk6bm9uZX0KLmNwLWNoaXB7ZmxleC1zaHJpbms6MDtmb250LXNpemU6MTBweDtmb250LXdlaWdodDo4MDA7cGFkZGluZzo2cHggMTBweDtib3JkZXItcmFkaXVzOjlweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JhY2tncm91bmQ6dmFyKC0tY2FyZCk7Y29sb3I6dmFyKC0tdHh0Mik7d2hpdGUtc3BhY2U6bm93cmFwfQouY3AtY2hpcC5vbntib3JkZXItY29sb3I6dmFyKC0tYnJhbmQpO2NvbG9yOnZhcigtLWJyYW5kKTtiYWNrZ3JvdW5kOnZhcigtLWJyYW5kU29mdCl9Ci5jcC1tYXB7cG9zaXRpb246cmVsYXRpdmU7aGVpZ2h0OjE2OHB4O2JvcmRlci1yYWRpdXM6MTRweDtvdmVyZmxvdzpoaWRkZW47Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtiYWNrZ3JvdW5kOiMwQjEzMjJ9Ci5jcC10aWxlc3twb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO292ZXJmbG93OmhpZGRlbjtmaWx0ZXI6aW52ZXJ0KDEpIGh1ZS1yb3RhdGUoMTg1ZGVnKSBicmlnaHRuZXNzKC42Mikgc2F0dXJhdGUoLjU1KTtvcGFjaXR5Oi44NX0KLmNwLXRpbGVzIGltZ3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoyNTZweDtoZWlnaHQ6MjU2cHg7Ym9yZGVyOjA7cG9pbnRlci1ldmVudHM6bm9uZX0KLmNwLW1hcCBzdmd7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MH0KLmNwLWxpc3R7bWFyZ2luLXRvcDoxMHB4O21heC1oZWlnaHQ6MzZ2aDtvdmVyZmxvdy15OmF1dG99Ci5jcC1pdGVte3BhZGRpbmc6MTBweCAycHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgxNDYsMTcwLDIwNSwuMDcpfQouY3AtaXRlbTphY3RpdmV7b3BhY2l0eTouN30KLmNwLWl0ZW0gLm57Zm9udC1zaXplOjEzcHg7Zm9udC13ZWlnaHQ6ODAwO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweH0KLmNwLWl0ZW0gLnN7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bWFyZ2luLXRvcDozcHg7bGluZS1oZWlnaHQ6MS41fQouY3AtaXRlbSAucHtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDA7Y29sb3I6dmFyKC0tb2spO21hcmdpbi10b3A6NHB4fQouY3AtaXRlbSAucC5kaW17Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC13ZWlnaHQ6NjAwfQouY3AtdGFne2ZvbnQtc2l6ZTo5cHg7Zm9udC13ZWlnaHQ6ODAwO2JvcmRlci1yYWRpdXM6NXB4O3BhZGRpbmc6MXB4IDVweDtib3JkZXI6MXB4IHNvbGlkIGN1cnJlbnRDb2xvcn0KLmNwLW5vdGV7Zm9udC1zaXplOjEwcHg7Y29sb3I6dmFyKC0tdHh0Myk7bGluZS1oZWlnaHQ6MS43O21hcmdpbi10b3A6OHB4fQouY3AtZW1wdHl7dGV4dC1hbGlnbjpjZW50ZXI7Y29sb3I6dmFyKC0tdHh0Myk7Zm9udC1zaXplOjEycHg7cGFkZGluZzoyMnB4IDhweDtsaW5lLWhlaWdodDoxLjh9Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+CjxkaXYgY2xhc3M9ImJnLWdsb3ciPjwvZGl2Pgo8aGVhZGVyPgogIDxkaXYgY2xhc3M9ImxvZ28iPjxzdmcgdmlld0JveD0iMCAwIDY0IDY0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTQgNDBjMC0xMSA4LTE5IDE4LTE5czE4IDggMTggMTkiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMzIgMzhsMTYgMTMiIHN0cm9rZT0iIzA0MTIxQyIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjQ2IiByPSI2IiBmaWxsPSIjMDQxMjFDIi8+PGNpcmNsZSBjeD0iNDUiIGN5PSI1MCIgcj0iNiIgZmlsbD0iIzA0MTIxQyIvPjwvc3ZnPjwvZGl2PgogIDxkaXYgY2xhc3M9ImJ0Ij48aDE+5p6B5qC4IFpFRUhPIDxzcGFuIGNsYXNzPSJiYWRnZSI+5Y2V6LSm5Y+354mIPC9zcGFuPjwvaDE+PHA+PGkgY2xhc3M9ImRvdCIgaWQ9InN5bmNEb3QiPjwvaT48c3BhbiBpZD0ic3luY1R4dCI+5Yqg6L295Lit4oCmPC9zcGFuPjwvcD48L2Rpdj4KICA8ZGl2IGNsYXNzPSJpY29uLWJ0biIgb25jbGljaz0icmVmcmVzaEFsbCgpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTIxIDEyYTkgOSAwIDEgMS0zLTYuNyIvPjxwYXRoIGQ9Ik0yMSAzdjZoLTYiLz48L3N2Zz48L2Rpdj4KICA8ZGl2IGNsYXNzPSJpY29uLWJ0biIgb25jbGljaz0ib3BlbkdlYXIoKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMuMiIvPjxwYXRoIGQ9Ik0xOS40IDE1YTEuNyAxLjcgMCAwIDAgLjMgMS45bC4xLjFhMiAyIDAgMSAxLTIuOCAyLjhsLS4xLS4xYTEuNyAxLjcgMCAwIDAtMS45LS4zIDEuNyAxLjcgMCAwIDAtMSAxLjVWMjFhMiAyIDAgMSAxLTQgMHYtLjFhMS43IDEuNyAwIDAgMC0xLjEtMS41IDEuNyAxLjcgMCAwIDAtMS45LjNsLS4xLjFhMiAyIDAgMSAxLTIuOC0yLjhsLjEtLjFhMS43IDEuNyAwIDAgMCAuMy0xLjkgMS43IDEuNyAwIDAgMC0xLjUtMUgzYTIgMiAwIDEgMSAwLTRoLjFhMS43IDEuNyAwIDAgMCAxLjUtMS4xIDEuNyAxLjcgMCAwIDAtLjMtMS45bC0uMS0uMWEyIDIgMCAxIDEgMi44LTIuOGwuMS4xYTEuNyAxLjcgMCAwIDAgMS45LjNIOWExLjcgMS43IDAgMCAwIDEtMS41VjNhMiAyIDAgMSAxIDQgMHYuMWExLjcgMS43IDAgMCAwIDEgMS41IDEuNyAxLjcgMCAwIDAgMS45LS4zbC4xLS4xYTIgMiAwIDEgMSAyLjggMi44bC0uMS4xYTEuNyAxLjcgMCAwIDAtLjMgMS45VjlhMS43IDEuNyAwIDAgMCAxLjUgMUgyMWEyIDIgMCAxIDEgMCA0aC0uMWExLjcgMS43IDAgMCAwLTEuNSAxeiIvPjwvc3ZnPjwvZGl2Pgo8L2hlYWRlcj4KPG1haW4+CiAgPHNlY3Rpb24gY2xhc3M9InRhYi1wYWdlIG9uIiBkYXRhLXRhYj0iaG9tZSI+CiAgICA8ZGl2IGNsYXNzPSJoZXJvIiBpZD0iaG9tZUhlcm8iPjxkaXYgY2xhc3M9ImVtcHR5Ij7mraPlnKjliqDovb3ovabovobigKY8L2Rpdj48L2Rpdj4KICAgIDxkaXYgaWQ9ImhvbWVDdHJsIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJob21lQ2hhcmdlU3RhdHMiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCIgaWQ9ImhvbWVSaWRlIj48ZGl2IGNsYXNzPSJlbXB0eSI+5q2j5Zyo5Yqg6L296aqR6KGM5pWw5o2u4oCmPC9kaXY+PC9kaXY+CiAgPC9zZWN0aW9uPgogIDxzZWN0aW9uIGNsYXNzPSJ0YWItcGFnZSIgZGF0YS10YWI9InNpZ25pbiI+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIGhlcm8iIGlkPSJzaWduSGVybyIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyIj48ZGl2IGNsYXNzPSJlbXB0eSI+5q2j5Zyo5Yqg6L294oCmPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIiBpZD0ic2lnblRhc2tzIj48L2Rpdj4KICA8L3NlY3Rpb24+CiAgPHNlY3Rpb24gY2xhc3M9InRhYi1wYWdlIiBkYXRhLXRhYj0iY29udHJvbCI+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIiBpZD0iY3RybFN0YXR1cyI+PGRpdiBjbGFzcz0iZW1wdHkiPuato+WcqOWKoOi9vei9pui+hueKtuaAgeKApjwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCIgaWQ9ImN0cmxCdG5zIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJjdHJsQ2hhcmdlIj48L2Rpdj4KICA8L3NlY3Rpb24+CiAgPHNlY3Rpb24gY2xhc3M9InRhYi1wYWdlIiBkYXRhLXRhYj0ic2V0dGluZ3MiPgogICAgPGRpdiBjbGFzcz0iY2FyZCBhY2MtY2FyZCIgaWQ9ImFjY0NhcmQiPjxkaXYgY2xhc3M9ImVtcHR5Ij7mraPlnKjliqDovb3otKblj7figKY8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJjZmdDYXJkIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJub3RpZnlDYXJkIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJtb3JlQ2FyZCI+PC9kaXY+CiAgPC9zZWN0aW9uPgo8L21haW4+CjxkaXYgY2xhc3M9InNoZWV0LW1hc2siIGlkPSJ1cGRhdGVTaGVldCI+CiAgPGRpdiBjbGFzcz0ic2hlZXQiPgogICAgPGgzPuWPkeeOsOaWsOeJiOacrDwvaDM+CiAgICA8ZGl2IGNsYXNzPSJzdWIiIGlkPSJ1cGRTdWIiPi0tPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7lvZPliY3niYjmnKw8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIiBpZD0idXBkQ3VyIj4tLTwvc3Bhbj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJvdyI+PHNwYW4gY2xhc3M9ImsiPuacgOaWsOeJiOacrDwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIGlkPSJ1cGROZXciPi0tPC9zcGFuPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGludCIgaWQ9InVwZE5vdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGRpdiBjbGFzcz0iYnRuIGdob3N0IiBvbmNsaWNrPSJjbG9zZVNoZWV0KCd1cGRhdGVTaGVldCcpIj7nqI3lkI48L2Rpdj48ZGl2IGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iZG93bmxvYWRVcGRhdGUoKSI+5LiL6L295paw54mIPC9kaXY+PC9kaXY+CiAgPC9kaXY+CjwvZGl2Pgo8ZGl2IGNsYXNzPSJzaGVldC1tYXNrIiBpZD0iY3BTaGVldCI+CiAgPGRpdiBjbGFzcz0ic2hlZXQgY3Atc2hlZXQiPgogICAgPGRpdiBjbGFzcz0iY3AtaGVhZCI+PGgzPumZhOi/keWFheeUteahqTwvaDM+PHNwYW4gY2xhc3M9InIiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKTtmb250LXNpemU6MTJweCIgb25jbGljaz0iY2xvc2VTaGVldCgnY3BTaGVldCcpIj7lhbPpl608L3NwYW4+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjcC1jYXRzIiBpZD0iY3BDYXRzIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNwLW1hcCIgaWQ9ImNwTWFwIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNwLWxpc3QiIGlkPSJjcExpc3QiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY3Atbm90ZSIgaWQ9ImNwTm90ZSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJidG4tcm93Ij48ZGl2IGNsYXNzPSJidG4gZ2hvc3QiIG9uY2xpY2s9ImNwUmVsb2FkKCkiPuWIt+aWsDwvZGl2PjxkaXYgY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJjcE9wZW5BbWFwKCkiPumrmOW+t+eci+WunuaXtuS7t+agvDwvZGl2PjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KPGRpdiBjbGFzcz0ic2hlZXQtbWFzayIgaWQ9ImdlYXJTaGVldCI+CiAgPGRpdiBjbGFzcz0ic2hlZXQgZ2Vhci1zaGVldCI+CiAgICA8ZGl2IGNsYXNzPSJzaGVldC1oZWFkIj4KICAgICAgPGRpdj48aDM+6K6+572uPC9oMz48ZGl2IGNsYXNzPSJzdWIiIHN0eWxlPSJtYXJnaW46MnB4IDAgMCI+5Y2V6LSm5Y+3IMK3IOmFjee9ruS/neWtmOWcqOacrOacujwvZGl2PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJnY2xvc2UiIG9uY2xpY2s9ImdlYXJDbG9zZSgpIj7inJU8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0iZ2Vhckxpc3QiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGludCIgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO21hcmdpbi10b3A6MTBweCI+5p6B5qC4IFpFRUhPIOmdouadvyDCtyDlvIDmupDlhY3otLnvvIznpoHmraLllK7ljZY8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+CjwvbmF2Pgo8ZGl2IGNsYXNzPSJycC1tYXNrIiBpZD0icmVwbGF5U2hlZXQiPgogIDxkaXYgY2xhc3M9InJwLWhlYWQiPgogICAgPGRpdiBjbGFzcz0icnAteCIgb25jbGljaz0icnBDbG9zZSgpIj7inJU8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InR0Ij48YiBpZD0icnBUaXRsZSI+6aqR6KGM5Zue5pS+PC9iPjxzcGFuIGlkPSJycFN1YiI+LS08L3NwYW4+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJycC1wb3N0ZXItYnRuIiBvbmNsaWNrPSJycFBvc3RlcigpIj7nlJ/miJDmtbfmiqU8L2Rpdj4KICA8L2Rpdj4KICA8ZGl2IGNsYXNzPSJycC1jaGlwcyIgaWQ9InJwUmlkZXMiPjwvZGl2PgogIDxkaXYgY2xhc3M9InJwLW1hcCIgaWQ9InJwTWFwIj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJycC1jdHJsIj4KICAgIDxkaXYgY2xhc3M9InJwLXByb2ciPjxpbnB1dCBpZD0icnBQcm9ncmVzcyIgdHlwZT0icmFuZ2UiIG1pbj0iMCIgbWF4PSIxMDAwIiB2YWx1ZT0iMCIgb25pbnB1dD0icnBTZWVrKHRoaXMudmFsdWUpIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJwLXJvdyI+CiAgICAgIDxkaXYgY2xhc3M9InJwLXBsYXkiIGlkPSJycFBsYXlCdG4iIG9uY2xpY2s9InJwVG9nZ2xlKCkiPjxzcGFuIGlkPSJycFBsYXlJY29uIj7ilrY8L3NwYW4+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InJwLXRpbWUiIGlkPSJycFRpbWUiPi0tOi0tPHNwYW4+LS06LS08L3NwYW4+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InJwLXNwZCIgaWQ9InJwU3BkIj48aSBjbGFzcz0ib24iIGRhdGEtcz0iMSIgb25jbGljaz0icnBTcGVlZCh0aGlzLmRhdGFzZXQucykiPjF4PC9pPjxpIGRhdGEtcz0iMiIgb25jbGljaz0icnBTcGVlZCh0aGlzLmRhdGFzZXQucykiPjJ4PC9pPjxpIGRhdGEtcz0iNCIgb25jbGljaz0icnBTcGVlZCh0aGlzLmRhdGFzZXQucykiPjR4PC9pPjwvZGl2PgogICAgPC9kaXY+CiAgPC9kaXY+CiAgPGRpdiBjbGFzcz0icnAtc3RhdHMiIGlkPSJycFN0YXRzIj48L2Rpdj4KPC9kaXY+CjxkaXYgY2xhc3M9InBvc3Rlci1tYXNrIiBpZD0icG9zdGVyU2hlZXQiPgogIDxkaXYgY2xhc3M9InBvc3Rlci10b3AiPjxiPumqkeihjOa1t+aKpTwvYj48ZGl2IGNsYXNzPSJycC14IiBvbmNsaWNrPSJjbG9zZVNoZWV0KCdwb3N0ZXJTaGVldCcpIj7inJU8L2Rpdj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJwb3N0ZXItd3JhcCI+PGltZyBjbGFzcz0icG9zdGVyLWltZyIgaWQ9InBvc3RlckltZyIgYWx0PSIiPjwvZGl2PgogIDxkaXYgY2xhc3M9InBvc3Rlci1hY3Rpb25zIj48ZGl2IGNsYXNzPSJiIGdob3N0IiBvbmNsaWNrPSJjbG9zZVNoZWV0KCdwb3N0ZXJTaGVldCcpIj7ov5Tlm548L2Rpdj48ZGl2IGNsYXNzPSJiIHByaW1hcnkiIG9uY2xpY2s9InNhdmVQb3N0ZXIoKSI+5L+d5a2Y5Zu+54mHPC9kaXY+PC9kaXY+CjwvZGl2Pgo8ZGl2IGNsYXNzPSJzaGVldC1tYXNrIiBpZD0iY2hnTWFuU2hlZXQiPgogIDxkaXYgY2xhc3M9InNoZWV0Ij4KICAgIDxkaXYgY2xhc3M9InNoZWV0LWhlYWQiPgogICAgICA8ZGl2PjxoMz7miYvliqjlhYXnlLXorrDlvZU8L2gzPjxkaXYgY2xhc3M9InN1YiIgc3R5bGU9Im1hcmdpbjoycHggMCAwIj7mjInlrp7pmYXotKbljZXorrDlvZXvvIznu5/orqHph4zljZXni6zlsZXnpLo8L2Rpdj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZ2Nsb3NlIiBvbmNsaWNrPSJjbG9zZVNoZWV0KCdjaGdNYW5TaGVldCcpIj7inJU8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0iY2hnTWFuQm9keSI+PC9kaXY+CiAgPC9kaXY+CjwvZGl2Pgo8ZGl2IGNsYXNzPSJzaGVldC1tYXNrIiBpZD0ibW9udGhTaGVldCI+CiAgPGRpdiBjbGFzcz0ic2hlZXQgbW9udGgtc2hlZXQiPgogICAgPGRpdiBjbGFzcz0ic2hlZXQtaGVhZCI+CiAgICAgIDxkaXY+PGgzPumqkeihjOaciOaKpTwvaDM+PGRpdiBjbGFzcz0ic3ViIiBzdHlsZT0ibWFyZ2luOjJweCAwIDAiPui/kSA2IOS4quaciOi2i+WKv+S4juacrOaciOaxh+aAuzwvZGl2PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJnY2xvc2UiIG9uY2xpY2s9ImNsb3NlU2hlZXQoJ21vbnRoU2hlZXQnKSI+4pyVPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9Im1vbnRoLWNoaXBzIiBpZD0ibW9udGhDaGlwcyI+PC9kaXY+CiAgICA8ZGl2IGlkPSJtb250aEJvZHkiPjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KPGRpdiBjbGFzcz0idG9hc3QiIGlkPSJ0b2FzdCI+PC9kaXY+CjxkaXYgY2xhc3M9InNoZWV0LW1hc2siIGlkPSJndWlkZVNoZWV0Ij4KICA8ZGl2IGNsYXNzPSJzaGVldCI+CiAgICA8aDM+5oqT5YyF5a+85YWl5pWZ56iLPC9oMz4KICAgIDxkaXYgY2xhc3M9InN1YiI+5oyJ5omL5py657O757uf6YCJ5oup5q2l6aqk77yb5Y+q5aSN5Yi2IEF1dGhvcml6YXRpb24gVG9rZW7vvIzkuI3kvJrkv67mlLnku7vkvZXmlbDmja48L2Rpdj4KICAgIDxkaXYgY2xhc3M9Im9wdC1yb3ciIHN0eWxlPSJtYXJnaW46MTBweCAwIDJweCI+CiAgICAgIDxzcGFuIGNsYXNzPSJjaGlwIG9uIiBpZD0iZ2RUYWJBIiBvbmNsaWNrPSJndWlkZVRhYignYScpIj5BbmRyb2lkPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0iY2hpcCIgaWQ9ImdkVGFiSSIgb25jbGljaz0iZ3VpZGVUYWIoJ2knKSI+aU9TPC9zcGFuPgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJndWlkZUEiPgogICAgICA8ZGl2IGNsYXNzPSJzdGVwIj48ZGl2IGNsYXNzPSJuIj4xPC9kaXY+PGRpdj48Yj7lronoo4XmipPljIXlt6Xlhbc8L2I+PHNwYW4+5o6o6I2QIFJlcWFibGUgLyBIdHRwQ2FuYXJ5IC8g5oqT5YyF57K+54G177yM6YCJ5oup44CM5Y+q5oqT5Y+W5p6B5qC4IEFwcOOAje+8jOaXoOmcgCBSb29044CCPC9zcGFuPjwvZGl2PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJzdGVwIj48ZGl2IGNsYXNzPSJuIj4yPC9kaXY+PGRpdj48Yj7lronoo4Xlubbkv6Hku7vor4HkuaY8L2I+PHNwYW4+5oyJ5bel5YW35o+Q56S65a6J6KOFIENBIOivgeS5pu+8muezu+e7n+iuvue9riDihpIg5a6J5YWoIOKGkiDliqDlr4bkuI7lh63mja4g4oaSIOWuieijheivgeS5piDihpIgQ0Eg6K+B5Lmm77yM6YCJ5oup5bel5YW35a+85Ye655qEIC5jcnQvLnBlbeOAgjwvc3Bhbj48L2Rpdj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ic3RlcCI+PGRpdiBjbGFzcz0ibiI+MzwvZGl2PjxkaXY+PGI+5aSN5Yi2IFRva2VuPC9iPjxzcGFuPuaJk+W8gOaegeaguCBBcHAg4oaSIOaIkeeahO+8iOaIlummlumhte+8ie+8jOWcqOaKk+WMheiusOW9lemHjOaJviB0YXBpLnplZWhvZXYuY29tIOeahOivt+axgu+8jOWkjeWItuivt+axguWktCBBdXRob3JpemF0aW9uIOWGkuWPt+WQjueahOaVtOaute+8iEJlYXJlciDlkI7pnaLnmoQgVVVJRO+8ieOAgjwvc3Bhbj48L2Rpdj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ic3RlcCI+PGRpdiBjbGFzcz0ibiI+NDwvZGl2PjxkaXY+PGI+5Zue5Yiw6Z2i5p2/5a+85YWlPC9iPjxzcGFuPueCueS4i+aWueOAjOeymOi0tCBUb2tlbuOAjeeymOi0tOWvvOWFpeOAguiLpeWumOaWuSBBcHAg5ZCv55So6K+B5Lmm5Zu65a6a5oqT5LiN5Yiw77yM5pS555So5omL5py65Y+36aqM6K+B56CB55m75b2V44CCPC9zcGFuPjwvZGl2PjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJndWlkZUkiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPgogICAgICA8ZGl2IGNsYXNzPSJzdGVwIj48ZGl2IGNsYXNzPSJuIj4xPC9kaXY+PGRpdj48Yj7lronoo4Xku6PnkIblt6Xlhbc8L2I+PHNwYW4+TG9vbiAvIFNoYWRvd3JvY2tldCAvIFN1cmdlIC8gUXVhbnR1bXVsdCBYIOS7u+mAieWFtuS4gOOAgjwvc3Bhbj48L2Rpdj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ic3RlcCI+PGRpdiBjbGFzcz0ibiI+MjwvZGl2PjxkaXY+PGI+5L+h5Lu7IE1JVE0g6K+B5LmmPC9iPjxzcGFuPuW3peWFt+WGheeUn+aIkOW5tuWuieijheivgeS5pu+8jOWGjeWIsCDorr7nva4g4oaSIOmAmueUqCDihpIg5YWz5LqO5pys5py6IOKGkiDor4Hkuabkv6Hku7vorr7nva4g5byA5ZCv5a6M5YWo5L+h5Lu744CCPC9zcGFuPjwvZGl2PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJzdGVwIj48ZGl2IGNsYXNzPSJuIj4zPC9kaXY+PGRpdj48Yj7mt7vliqDku5PlupPmj5Lku7bvvIjoh6rliqjmipPlj5bvvIk8L2I+PHNwYW4+TG9vbiDorqLpmIUgbW9kdWxlcy96ZWVoby5wbHVnaW7vvJtTdXJnZSDorqLpmIUgbW9kdWxlcy96ZWVoby5zZ21vZHVsZe+8m1FYIOiuoumYhSBzY3JpcHQvemVlaG9fcXguY29uZu+8jOW8gOWQryBNSVRNIOS4juiEmuacrOOAguaJk+W8gOaegeaguCBBcHDjgIzmiJHnmoTjgI3ljbPoh6rliqjojrflj5YgVG9rZW7jgII8L3NwYW4+PC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InN0ZXAiPjxkaXYgY2xhc3M9Im4iPjQ8L2Rpdj48ZGl2PjxiPuaJi+WKqOWFnOW6lTwvYj48c3Bhbj7oi6XmnKroh6rliqjlr7zlhaXvvIznlKggU3RyZWFtIOaKkyB0YXBpLnplZWhvZXYuY29tIOivt+axgu+8jOWkjeWItiBBdXRob3JpemF0aW9uIOWQjuWbnumdouadv+OAjOeymOi0tCBUb2tlbuOAjeOAgjwvc3Bhbj48L2Rpdj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iaGludCI+5LuT5bqT77yaZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITyDCtyBBbmRyb2lkIOW7uuiuriBSZXFhYmxl77ybaU9TIOW7uuiurueUqOaPkuS7tuiHquWKqOaKk+WPluOAgjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGRpdiBjbGFzcz0iYnRuIGdob3N0IiBvbmNsaWNrPSJjbG9zZVNoZWV0KCdndWlkZVNoZWV0JykiPuWFs+mXrTwvZGl2PjxkaXYgY2xhc3M9ImJ0biBnaG9zdCIgb25jbGljaz0iY2xvc2VTaGVldCgnZ3VpZGVTaGVldCcpO3Bob25lTG9naW5VSSgpIj7miYvmnLrlj7fnmbvlvZU8L2Rpdj48ZGl2IGNsYXNzPSJidG4gcHJpbWFyeSIgb25jbGljaz0iY2xvc2VTaGVldCgnZ3VpZGVTaGVldCcpO3Bhc3RlVG9rZW5VSSgpIj7nspjotLQgVG9rZW48L2Rpdj48L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8ZGl2IGNsYXNzPSJzaGVldC1tYXNrIiBpZD0idG9rZW5TaGVldCI+CiAgPGRpdiBjbGFzcz0ic2hlZXQiPgogICAgPGgzPueymOi0tCBUb2tlbjwvaDM+CiAgICA8ZGl2IGNsYXNzPSJzdWIiPuS7juaKk+WMheW3peWFt+WkjeWItiBBdXRob3JpemF0aW9u77yI5Y+v5bimIEJlYXJlciDliY3nvIDvvIzkvJroh6rliqjljrvpmaTvvIk8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+QXV0aG9yaXphdGlvbiBUb2tlbjwvbGFiZWw+PGRpdiBjbGFzcz0iaW5wIj48aW5wdXQgaWQ9InRrSW5wdXQiIHBsYWNlaG9sZGVyPSJ4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHgiIGF1dG9jb21wbGV0ZT0ib2ZmIj48L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcC1zdGF0ZSIgaWQ9InRrU3RhdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGRpdiBjbGFzcz0iYnRuIGdob3N0IiBvbmNsaWNrPSJjbG9zZVNoZWV0KCd0b2tlblNoZWV0JykiPuWPlua2iDwvZGl2PjxkaXYgY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJkb1Bhc3RlVG9rZW4oKSI+5a+85YWlPC9kaXY+PC9kaXY+CiAgPC9kaXY+CjwvZGl2PgoKPGRpdiBjbGFzcz0ic2hlZXQtbWFzayIgaWQ9InBob25lU2hlZXQiPgogIDxkaXYgY2xhc3M9InNoZWV0Ij4KICAgIDxoMz7miYvmnLrlj7fnmbvlvZU8L2gzPgogICAgPGRpdiBjbGFzcz0ic3ViIj7kvb/nlKjmnoHmoLggQXBwIOe7keWumuaJi+acuuWPt+eZu+W9le+8jOiHquWKqOWvvOWFpSBUb2tlbiDkuI7nlKjmiLcgSUQ8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+5omL5py65Y+3PC9sYWJlbD48ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0icGhQaG9uZSIgdHlwZT0idGVsIiBpbnB1dG1vZGU9Im51bWVyaWMiIHBsYWNlaG9sZGVyPSIxMSDkvY3miYvmnLrlj7ciIG1heGxlbmd0aD0iMTEiPjwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmllbGQiPjxsYWJlbD7nn63kv6Hpqozor4HnoIE8L2xhYmVsPjxkaXYgY2xhc3M9ImlucCI+PGlucHV0IGlkPSJwaENvZGUiIGlucHV0bW9kZT0ibnVtZXJpYyIgcGxhY2Vob2xkZXI9IjYg5L2N6aqM6K+B56CBIiBtYXhsZW5ndGg9IjYiPjxzcGFuIGNsYXNzPSJhY3QiIGlkPSJwaFNlbmQiIG9uY2xpY2s9InNlbmRDb2RlVUkoKSI+5Y+R6YCB6aqM6K+B56CBPC9zcGFuPjwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FwLXN0YXRlIiBpZD0icGhTdGF0ZSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJidG4tcm93Ij48ZGl2IGNsYXNzPSJidG4gZ2hvc3QiIG9uY2xpY2s9ImNsb3NlU2hlZXQoJ3Bob25lU2hlZXQnKSI+5Y+W5raIPC9kaXY+PGRpdiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9ImRvUGhvbmVMb2dpbigpIj7nmbvlvZU8L2Rpdj48L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8ZGl2IGNsYXNzPSJzaGVldC1tYXNrIiBpZD0iY29uZmlybVNoZWV0Ij4KICA8ZGl2IGNsYXNzPSJzaGVldCI+CiAgICA8aDMgaWQ9ImNmVGl0bGUiPummluasoeS9v+eUqOi9puaOpyDCtyDpo47pmannoa7orqQ8L2gzPgogICAgPGRpdiBjbGFzcz0ic3ViIiBpZD0iY2ZTdWIiPuehruiupOS4gOasoeWQju+8jOi9puaOp+aMiemSruWwhuebtOaOpeaJp+ihjO+8jOS4jeWGjemAkOasoeW8ueeql+OAgjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic3RlcCI+PGRpdiBjbGFzcz0ibiI+ITwvZGl2PjxkaXY+PGI+6aOO6Zmp5o+Q56S6PC9iPjxzcGFuPuW8gOmUgSAvIOWFs+mUgSAvIOWvu+i9piAvIOm4o+esmyAvIOaJk+W8gOWdkOWeq+Wdh+S4uuS6keerr+ecn+WunuS4i+WPke+8jOWPr+iDveWboOe9kee7nOS4jui9pui+huS/oeWPt+W7tui/n++8m+ivt+WLv+WcqOihjOmptuS4reaIluS7luS6uui9pui+huS4iuaTjeS9nO+8jOaTjeS9nOWJjeivt+ehruiupOWRqOWbtOeOr+Wig+WuieWFqOOAgjwvc3Bhbj48L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImJ0bi1yb3ciPjxkaXYgY2xhc3M9ImJ0biBnaG9zdCIgb25jbGljaz0iY2xvc2VTaGVldCgnY29uZmlybVNoZWV0JykiPuaaguS4jeS9v+eUqDwvZGl2PjxkaXYgY2xhc3M9ImJ0biBwcmltYXJ5IiBvbmNsaWNrPSJhZ3JlZVJpc2tBbmRDdHJsKCkiPuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqDwvZGl2PjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KCjxkaXYgY2xhc3M9InNoZWV0LW1hc2siIGlkPSJhYm91dFNoZWV0Ij4KICA8ZGl2IGNsYXNzPSJzaGVldCI+CiAgICA8aDM+5YWz5LqOPC9oMz4KICAgIDxkaXYgY2xhc3M9InN1YiI+5p6B5qC4IFpFRUhPIMK3IOWNlei0puWPt+eJiDwvZGl2PgogICAgPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+QXBwIOeJiOacrDwvc3Bhbj48c3BhbiBjbGFzcz0idiIgaWQ9ImFiVmVyIj4tLTwvc3Bhbj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJvdyI+PHNwYW4gY2xhc3M9ImsiPumdouadv+WGheaguDwvc3Bhbj48c3BhbiBjbGFzcz0idiIgaWQ9ImFiS2VybmVsIj4tLTwvc3Bhbj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJvdyI+PHNwYW4gY2xhc3M9ImsiPuW9k+WJjei0puWPtzwvc3Bhbj48c3BhbiBjbGFzcz0idiIgaWQ9ImFiQWNjIj4tLTwvc3Bhbj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImhpbnQiPuS7heS+m+WtpuS5oOeglOeptu+8jOivt+WLv+eUqOS6juWVhuS4muaIlui/neinhOeUqOmAlOOAgjwvZGl2PgogICAgPGRpdiBjbGFzcz0iYnRuLXJvdyI+PGRpdiBjbGFzcz0iYnRuIHByaW1hcnkiIG9uY2xpY2s9ImNsb3NlU2hlZXQoJ2Fib3V0U2hlZXQnKSI+5YWz6ZetPC9kaXY+PC9kaXY+CiAgPC9kaXY+CjwvZGl2Pgo8c2NyaXB0PgoidXNlIHN0cmljdCI7CnZhciBTPXthY2M6bnVsbCxkYXRhOm51bGwsY2ZnOm51bGwscmlkZTpudWxsLHNpZ25SZXN1bHQ6bnVsbCxsYXN0OjAsZXJyOiIiLHJpZGVEYWlseTp7fSxyaWRlU2VsOiIiLGdlYXJPcGVuOiIifTsKZnVuY3Rpb24gJChpZCl7cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKX0KZnVuY3Rpb24gZXNjKHMpe3JldHVybiBTdHJpbmcocz09bnVsbD8iIjpzKS5yZXBsYWNlKC9bJjw+IiddL2csZnVuY3Rpb24oYyl7cmV0dXJuIHsiJiI6IiZhbXA7IiwiPCI6IiZsdDsiLCI+IjoiJmd0OyIsIlwiIjoiJnF1b3Q7IiwiJyI6IiYjMzk7In1bY119KX0KZnVuY3Rpb24gbnVtKHYsZCl7dmFyIG49TnVtYmVyKHYpO3JldHVybiBpc0Zpbml0ZShuKT9uOihkPT1udWxsPzA6ZCl9CmZ1bmN0aW9uIGJhck51bSh4KXtpZih4PT1udWxsfHx4PT09IiIpcmV0dXJuIG51bGw7aWYodHlwZW9mIHg9PT0ibnVtYmVyIilyZXR1cm4gaXNGaW5pdGUoeCk/eDpudWxsO3ZhciBtPVN0cmluZyh4KS5tYXRjaCgvLT9cZCsoPzpcLlxkKyk/Lyk7cmV0dXJuIG0/cGFyc2VGbG9hdChtWzBdKTpudWxsfQpmdW5jdGlvbiB0b2FzdChtc2csdHlwZSl7dmFyIHQ9JCgidG9hc3QiKTtpZighdClyZXR1cm47dC50ZXh0Q29udGVudD1tc2c7dC5jbGFzc05hbWU9InRvYXN0IG9uIisodHlwZT8iICIrdHlwZToiIik7Y2xlYXJUaW1lb3V0KHQuX2gpO3QuX2g9c2V0VGltZW91dChmdW5jdGlvbigpe3QuY2xhc3NOYW1lPSJ0b2FzdCJ9LDI2MDApfQpmdW5jdGlvbiBhcGkocGF0aCxvcHQpe3JldHVybiBmZXRjaChwYXRoLG9wdHx8e30pLnRoZW4oZnVuY3Rpb24ocil7cmV0dXJuIHIuanNvbigpfSkuY2F0Y2goZnVuY3Rpb24oKXtyZXR1cm4gbnVsbH0pfQpmdW5jdGlvbiBwb3N0KHBhdGgsYm9keSl7cmV0dXJuIGFwaShwYXRoLHttZXRob2Q6IlBPU1QiLGhlYWRlcnM6eyJDb250ZW50LVR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sYm9keTpKU09OLnN0cmluZ2lmeShib2R5fHx7fSl9KX0KZnVuY3Rpb24gZ28obmFtZSl7ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiLnRhYi1wYWdlIikuZm9yRWFjaChmdW5jdGlvbihwKXtwLmNsYXNzTGlzdC50b2dnbGUoIm9uIixwLmRhdGFzZXQudGFiPT09bmFtZSl9KTtkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIubmF2LWl0ZW0iKS5mb3JFYWNoKGZ1bmN0aW9uKG4pe24uY2xhc3NMaXN0LnRvZ2dsZSgib24iLG4uZGF0YXNldC5uYXY9PT1uYW1lKX0pO3dpbmRvdy5zY3JvbGxUbygwLDApfQpmdW5jdGlvbiBmbXRUaW1lKHMpe3JldHVybiBTdHJpbmcoc3x8IiIpLnJlcGxhY2UoIlQiLCIgIikuc2xpY2UoMCwxNil9CmZ1bmN0aW9uIHRvZGF5U3RyKCl7dmFyIGQ9bmV3IERhdGUoKTtyZXR1cm4gZC5nZXRGdWxsWWVhcigpKyItIitTdHJpbmcoZC5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsIjAiKSsiLSIrU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCIwIil9CmZ1bmN0aW9uIG1vblN0cigpe3JldHVybiB0b2RheVN0cigpLnNsaWNlKDAsNykucmVwbGFjZSgiLSIsIi4iKX0KCgovKiA9PT09PSB2Mi4xNi4yMyDku4rml6XpqpHooYzvvJrovajov7nph43nrpfljovlvK8v5oCl5Yi5L+aegemAny/mgKXliqDpgJ/vvIjnrpfms5XlkIwgU3BlZWRIdW50ZXLvvIkgPT09PT0gKi8KdmFyIFJJREVfQ0ZHPXtCRU5EX1ZfTUlOOjIwLEJFTkRfU0VFRDo1LEJFTkRfQ1VNX01JTjoxNSxCRU5EX0NVTV9DQVA6OTAsQkVORF9DT0VGOjEuMCxCRU5EX1ZfTUFYOjgwLEJFTkRfTUlOX0tNOjEuMCxCRU5EX1NURVBfTUFYOjQ1LEJFTkRfUlVOX01JTjoxLEJFTkRfTUVSR0VfR0FQOjAsQkVORF9BTExPV19HQVA6MCxCRU5EX1NFR19ESVNUX01JTjo2LEJFTkRfR0FQX01TX01BWDoyNTAwMCxCUkFLRV9WX01JTjoxNSxCUkFLRV9XSU5fTEFSR0U6NSxCUkFLRV9XSU5fU01BTEw6MyxCUkFLRV9EVl9MQVJHRToxNSxCUkFLRV9EVl9TTUFMTDoyMCxCUkFLRV9BX01JTjowLjUsQlJBS0VfTUVSR0VfR0FQOjUsQlJBS0VfTUlOX0RVUjoxLjUsQlJBS0VfQ0FMSUI6Mi41LE1PVklOR19WX01JTjo1LE1JTl9QT0lOVFM6NCxFQVJUSF9SOjYzNzEwMDB9OwpmdW5jdGlvbiByaWRlUGFyc2VUcmFjayhzdHIpe3ZhciBwdHM9W107aWYoIXN0cilyZXR1cm4gcHRzO3ZhciBzZWc9U3RyaW5nKHN0cikuc3BsaXQoIiYiKTtmb3IodmFyIGk9MDtpPHNlZy5sZW5ndGg7aSsrKXt2YXIgcz1zZWdbaV07aWYoIXMpY29udGludWU7dmFyIHA9cy5zcGxpdCgiLCIpO2lmKHAubGVuZ3RoPDQpY29udGludWU7dmFyIGxvbj1wYXJzZUZsb2F0KHBbMF0pLGxhdD1wYXJzZUZsb2F0KHBbMV0pLHY9cGFyc2VGbG9hdChwWzJdKSx0PXBhcnNlRmxvYXQocFszXSk7aWYoIWlzRmluaXRlKGxvbil8fCFpc0Zpbml0ZShsYXQpfHwhaXNGaW5pdGUodil8fCFpc0Zpbml0ZSh0KSljb250aW51ZTtwdHMucHVzaCh7bG9uOmxvbixsYXQ6bGF0LHY6dix0OnR9KX1yZXR1cm4gcHRzfQpmdW5jdGlvbiByaWRlSGF2ZXJzaW5lKGxvbjEsbGF0MSxsb24yLGxhdDIpe3ZhciBkTGF0PShsYXQyLWxhdDEpKk1hdGguUEkvMTgwLGRMb249KGxvbjItbG9uMSkqTWF0aC5QSS8xODA7dmFyIGE9TWF0aC5zaW4oZExhdC8yKSpNYXRoLnNpbihkTGF0LzIpK01hdGguY29zKGxhdDEqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApKk1hdGguc2luKGRMb24vMikqTWF0aC5zaW4oZExvbi8yKTtyZXR1cm4gUklERV9DRkcuRUFSVEhfUioyKk1hdGguYXRhbjIoTWF0aC5zcXJ0KGEpLE1hdGguc3FydCgxLWEpKX0KZnVuY3Rpb24gcmlkZUJlYXJpbmcobG9uMSxsYXQxLGxvbjIsbGF0Mil7dmFyIHk9TWF0aC5zaW4oKGxvbjItbG9uMSkqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApO3ZhciB4PU1hdGguY29zKGxhdDEqTWF0aC5QSS8xODApKk1hdGguc2luKGxhdDIqTWF0aC5QSS8xODApLU1hdGguc2luKGxhdDEqTWF0aC5QSS8xODApKk1hdGguY29zKGxhdDIqTWF0aC5QSS8xODApKk1hdGguY29zKChsb24yLWxvbjEpKk1hdGguUEkvMTgwKTtyZXR1cm4gTWF0aC5hdGFuMih5LHgpKjE4MC9NYXRoLlBJfQpmdW5jdGlvbiByaWRlQW5nRGlmZihhLGIpe3ZhciBkPWItYTt3aGlsZShkPjE4MClkLT0zNjA7d2hpbGUoZDwtMTgwKWQrPTM2MDtyZXR1cm4gZH0KZnVuY3Rpb24gcmlkZU1pZChhLGIpe3JldHVybiBhK3JpZGVBbmdEaWZmKGEsYikvMn0KZnVuY3Rpb24gcmlkZUNhbGNNZXRyaWNzKHB0cyl7aWYoIXB0c3x8cHRzLmxlbmd0aDxSSURFX0NGRy5NSU5fUE9JTlRTKXJldHVybiBudWxsO3ZhciBtZXRlcnM9MCxtb3ZpbmdNcz0wLG1heFNwZWVkPTA7Zm9yKHZhciBpPTE7aTxwdHMubGVuZ3RoO2krKyl7dmFyIGE9cHRzW2ktMV0sYj1wdHNbaV07bWV0ZXJzKz1yaWRlSGF2ZXJzaW5lKGEubG9uLGEubGF0LGIubG9uLGIubGF0KTt2YXIgdkluPU1hdGgubWF4KGEudixiLnYpLGR0PWIudC1hLnQ7aWYodkluPlJJREVfQ0ZHLk1PVklOR19WX01JTiYmZHQ+MCYmZHQ8NjAwMDApbW92aW5nTXMrPWR0O2lmKGIudj5tYXhTcGVlZCltYXhTcGVlZD1iLnZ9dmFyIGR1cmF0aW9uTWluPU1hdGgubWF4KDAscHRzW3B0cy5sZW5ndGgtMV0udC1wdHNbMF0udCkvNjAwMDA7dmFyIG1vdmluZ01pbj1tb3ZpbmdNcy82MDAwMDt2YXIgZGlzdGFuY2VLbT1tZXRlcnMvMTAwMDtyZXR1cm57cG9pbnRzOnB0cy5sZW5ndGgsZGlzdGFuY2VLbTpkaXN0YW5jZUttLGR1cmF0aW9uTWluOmR1cmF0aW9uTWluLG1vdmluZ01pbjptb3ZpbmdNaW4sbWF4U3BlZWQ6bWF4U3BlZWQ8MD8wOm1heFNwZWVkfX0KZnVuY3Rpb24gcmlkZUNvdW50QnJha2VzKHB0cyl7dmFyIG49cHRzP3B0cy5sZW5ndGg6MDtpZihuPDQpcmV0dXJuIDA7dmFyIGNhbmRzPVtdO3ZhciBzY2FuPWZ1bmN0aW9uKHdpbixkdk1pbil7Zm9yKHZhciBpPTA7aTw9bi13aW47aSsrKXtpZihwdHNbaV0udjxSSURFX0NGRy5CUkFLRV9WX01JTiljb250aW51ZTt2YXIgbWF4Vj0tSW5maW5pdHksbWF4SWR4PWksbWluVj1JbmZpbml0eSxtaW5JZHg9aTt2YXIgdXBwZXI9TWF0aC5taW4oaSt3aW4sbi0xKTtmb3IodmFyIGo9aSsxO2o8PXVwcGVyO2orKyl7dmFyIHY9cHRzW2pdLnY7aWYodj5tYXhWKXttYXhWPXY7bWF4SWR4PWp9aWYodjxtaW5WKXttaW5WPXY7bWluSWR4PWp9fXZhciBkdj1tYXhWLW1pblY7aWYoZHY8ZHZNaW58fG1pbklkeDw9bWF4SWR4KWNvbnRpbnVlO3ZhciBkdD0ocHRzW21pbklkeF0udC1wdHNbbWF4SWR4XS50KS8xMDAwO2lmKGR0PFJJREVfQ0ZHLkJSQUtFX01JTl9EVVJ8fGR2LzMuNi9kdDxSSURFX0NGRy5CUkFLRV9BX01JTiljb250aW51ZTtjYW5kcy5wdXNoKHtpZHg6bWF4SWR4LGR2OmR2fSl9fTtzY2FuKFJJREVfQ0ZHLkJSQUtFX1dJTl9MQVJHRSxSSURFX0NGRy5CUkFLRV9EVl9MQVJHRSk7c2NhbihSSURFX0NGRy5CUkFLRV9XSU5fU01BTEwsUklERV9DRkcuQlJBS0VfRFZfU01BTEwpO2NhbmRzLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYS5pZHgtYi5pZHh9KTt2YXIgbWVyZ2VkPVtdO2Zvcih2YXIgaz0wO2s8Y2FuZHMubGVuZ3RoO2srKyl7dmFyIGM9Y2FuZHNba107aWYoIW1lcmdlZC5sZW5ndGh8fGMuaWR4LW1lcmdlZFttZXJnZWQubGVuZ3RoLTFdLmlkeD49UklERV9DRkcuQlJBS0VfTUVSR0VfR0FQKW1lcmdlZC5wdXNoKGMpO2Vsc2UgaWYoYy5kdj5tZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXS5kdiltZXJnZWRbbWVyZ2VkLmxlbmd0aC0xXT1jfXZhciByPU1hdGgucm91bmQobWVyZ2VkLmxlbmd0aCpSSURFX0NGRy5CUkFLRV9DQUxJQik7cmV0dXJuIHI8MD8wOnJ9CmZ1bmN0aW9uIHJpZGVDb3VudEJlbmRzKHB0cyl7dmFyIG49cHRzP3B0cy5sZW5ndGg6MDtpZihuPDQpcmV0dXJuIDA7dmFyIGhkZz1uZXcgQXJyYXkobi0xKTtmb3IodmFyIGk9MDtpPG4tMTtpKyspe3ZhciBhPXB0c1tpXSxiPXB0c1tpKzFdO3ZhciBkPXJpZGVIYXZlcnNpbmUoYS5sb24sYS5sYXQsYi5sb24sYi5sYXQpLHR0PWIudC1hLnQ7aGRnW2ldPShkPFJJREVfQ0ZHLkJFTkRfU0VHX0RJU1RfTUlOfHx0dD5SSURFX0NGRy5CRU5EX0dBUF9NU19NQVh8fHR0PD0wKT9OYU46cmlkZUJlYXJpbmcoYS5sb24sYS5sYXQsYi5sb24sYi5sYXQpfXZhciBzaD1uZXcgQXJyYXkobi0xKTtmb3IodmFyIGkyPTA7aTI8bi0xO2kyKyspe2lmKGlzTmFOKGhkZ1tpMl0pKXtzaFtpMl09TmFOO2NvbnRpbnVlfXZhciBwcmV2PShpMj4wJiYhaXNOYU4oaGRnW2kyLTFdKSk/aGRnW2kyLTFdOm51bGw7dmFyIG5leHQ9KGkyPG4tMiYmIWlzTmFOKGhkZ1tpMisxXSkpP2hkZ1tpMisxXTpudWxsO2lmKHByZXYhPT1udWxsJiZuZXh0IT09bnVsbClzaFtpMl09cmlkZU1pZChyaWRlTWlkKHByZXYsaGRnW2kyXSksbmV4dCk7ZWxzZSBpZihwcmV2IT09bnVsbClzaFtpMl09cmlkZU1pZChwcmV2LGhkZ1tpMl0pO2Vsc2UgaWYobmV4dCE9PW51bGwpc2hbaTJdPXJpZGVNaWQoaGRnW2kyXSxuZXh0KTtlbHNlIHNoW2kyXT1oZGdbaTJdfXZhciB0dXJuPW5ldyBBcnJheShuKS5maWxsKGZhbHNlKSxkaGRnPW5ldyBBcnJheShuKS5maWxsKDApLHNnbj1uZXcgQXJyYXkobikuZmlsbCgwKTtmb3IodmFyIGkzPTE7aTM8bi0xO2kzKyspe2lmKGlzTmFOKHNoW2kzLTFdKXx8aXNOYU4oc2hbaTNdKSljb250aW51ZTt2YXIgZDI9cmlkZUFuZ0RpZmYoc2hbaTMtMV0sc2hbaTNdKTtkaGRnW2kzXT1kMjt2YXIgdkluPU1hdGgubWF4KHB0c1tpMy0xXS52LHB0c1tpM10udik7aWYodkluPFJJREVfQ0ZHLkJFTkRfVl9NSU58fHZJbj5SSURFX0NGRy5CRU5EX1ZfTUFYKWNvbnRpbnVlO2lmKE1hdGguYWJzKGQyKT49UklERV9DRkcuQkVORF9TVEVQX01BWCljb250aW51ZTtpZihNYXRoLmFicyhkMik+PVJJREVfQ0ZHLkJFTkRfU0VFRCl7dHVybltpM109dHJ1ZTtzZ25baTNdPWQyPjA/MTotMX19dmFyIHJ1bnM9W10sY3VyPW51bGwsZ2FwPTA7Zm9yKHZhciBpND0xO2k0PG4tMTtpNCsrKXtpZih0dXJuW2k0XSl7aWYoY3VyPT09bnVsbCl7Y3VyPXtzOmk0LGU6aTQsY3VtOk1hdGguYWJzKGRoZGdbaTRdKSxzaWduOnNnbltpNF19fWVsc2UgaWYoc2duW2k0XT09PWN1ci5zaWduKXtjdXIuY3VtKz1NYXRoLmFicyhkaGRnW2k0XSl9ZWxzZXtydW5zLnB1c2goY3VyKTtjdXI9e3M6aTQsZTppNCxjdW06TWF0aC5hYnMoZGhkZ1tpNF0pLHNpZ246c2duW2k0XX19Y3VyLmU9aTQ7Z2FwPTB9ZWxzZSBpZihjdXIhPT1udWxsJiZnYXA8UklERV9DRkcuQkVORF9BTExPV19HQVApe2dhcCsrO2N1ci5lPWk0fWVsc2UgaWYoY3VyIT09bnVsbCl7cnVucy5wdXNoKGN1cik7Y3VyPW51bGx9fWlmKGN1ciE9PW51bGwpcnVucy5wdXNoKGN1cik7dmFyIGNudD0wLGxhc3RFbmQ9TmFOLGxhc3RTaWduPTA7Zm9yKHZhciBrMj0wO2syPHJ1bnMubGVuZ3RoO2syKyspe3ZhciByMj1ydW5zW2syXTtpZihyMi5jdW08UklERV9DRkcuQkVORF9DVU1fTUlOfHxyMi5jdW0+UklERV9DRkcuQkVORF9DVU1fQ0FQKWNvbnRpbnVlO2lmKHIyLmUtcjIucysxPFJJREVfQ0ZHLkJFTkRfUlVOX01JTiljb250aW51ZTt2YXIgbWF4Vj0wO2Zvcih2YXIgaj1yMi5zO2o8PXIyLmUmJmo8bjtqKyspe2lmKHB0c1tqXS52Pm1heFYpbWF4Vj1wdHNbal0udn1pZihtYXhWPlJJREVfQ0ZHLkJFTkRfVl9NQVgpY29udGludWU7aWYocjIuc2lnbj09PWxhc3RTaWduJiYhaXNOYU4obGFzdEVuZCkmJnIyLnMtbGFzdEVuZDw9UklERV9DRkcuQkVORF9NRVJHRV9HQVApe2xhc3RFbmQ9cjIuZTtjb250aW51ZX1jbnQrKztsYXN0RW5kPXIyLmU7bGFzdFNpZ249cjIuc2lnbn1yZXR1cm4gTWF0aC5yb3VuZChjbnQqUklERV9DRkcuQkVORF9DT0VGKX0KZnVuY3Rpb24gcmlkZU5vcm1EYXkocmF3KXtpZihyYXc9PW51bGwpcmV0dXJuIG51bGw7dmFyIHQ9U3RyaW5nKHJhdykudHJpbSgpO2lmKCF0KXJldHVybiBudWxsO2lmKHQubGVuZ3RoPT09OCYmL15cZHs4fSQvLnRlc3QodCkpcmV0dXJuIHQuc2xpY2UoMCw0KSsiLiIrdC5zbGljZSg0LDYpKyIuIit0LnNsaWNlKDYsOCk7dD10LnJlcGxhY2UoLy0vZywiLiIpLnJlcGxhY2UoL1wvL2csIi4iKTt2YXIgcD10LnNwbGl0KCIuIik7aWYocC5sZW5ndGg9PT0zJiYvXlxkKyQvLnRlc3QocFswXSkmJi9eXGQrJC8udGVzdChwWzFdKSYmL15cZCskLy50ZXN0KHBbMl0pKXJldHVybiBwWzBdKyIuIitTdHJpbmcocGFyc2VJbnQocFsxXSwxMCkpLnBhZFN0YXJ0KDIsIjAiKSsiLiIrU3RyaW5nKHBhcnNlSW50KHBbMl0sMTApKS5wYWRTdGFydCgyLCIwIik7cmV0dXJuIG51bGx9CmZ1bmN0aW9uIGFuYWx5emVSaWRlRGF5KGRheSl7CiAgdmFyIG91dD17bWF4U3BlZWQ6MCxiZW5kaW5nVGltZXM6MCxhY2NlbGVyYXRpb25UaW1lczowLGJyYWtlc1RpbWVzOjAsbWlsZWFnZTowLHJpZGVzOjAsZHVyYXRpb25NaW46MCxtb3ZpbmdNaW46MH07CiAgdmFyIGxpc3Q9QXJyYXkuaXNBcnJheShkYXkmJmRheS5oaXN0b3J5TGlzdCk/ZGF5Lmhpc3RvcnlMaXN0OltdOwogIGZvcih2YXIgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXsKICAgIHZhciByPWxpc3RbaV18fHt9OwogICAgdmFyIHRyYWo9U3RyaW5nKHIudHJhamVjdG9yeXx8IiIpO2lmKCF0cmFqKWNvbnRpbnVlOwogICAgdmFyIHB0cz1yaWRlUGFyc2VUcmFjayh0cmFqKTtpZihwdHMubGVuZ3RoPFJJREVfQ0ZHLk1JTl9QT0lOVFMpY29udGludWU7CiAgICB2YXIgbT1yaWRlQ2FsY01ldHJpY3MocHRzKSxicmFrZXM9cmlkZUNvdW50QnJha2VzKHB0cyksYmVuZHM9cmlkZUNvdW50QmVuZHMocHRzKTsKICAgIGlmKG0mJm0uZGlzdGFuY2VLbTxSSURFX0NGRy5CRU5EX01JTl9LTSliZW5kcz0wOwogICAgdmFyIHNtPU51bWJlcihyLm1heFNwZWVkKXx8MDsKICAgIG91dC5tYXhTcGVlZD1NYXRoLm1heChvdXQubWF4U3BlZWQsc20+MD9zbToobT9tLm1heFNwZWVkOjApKTsKICAgIG91dC5taWxlYWdlKz0obT9tLmRpc3RhbmNlS206MCk7CiAgICBvdXQuYWNjZWxlcmF0aW9uVGltZXMrPU51bWJlcihyLmFjY2VsZXJhdGlvblRpbWVzKXx8MDsKICAgIGlmKG0pe291dC5kdXJhdGlvbk1pbis9bS5kdXJhdGlvbk1pbjtvdXQubW92aW5nTWluKz1tLm1vdmluZ01pbn0KICAgIG91dC5icmFrZXNUaW1lcys9YnJha2VzO291dC5iZW5kaW5nVGltZXMrPWJlbmRzO291dC5yaWRlcysrOwogIH0KICB2YXIgc3J2S209TnVtYmVyKGRheSYmZGF5LmRheVJpZGVNaWxlYWdlKXx8MDsKICBpZihzcnZLbT4wKW91dC5taWxlYWdlPXNydkttOwogIG91dC5taWxlYWdlPU1hdGgucm91bmQob3V0Lm1pbGVhZ2UqMTApLzEwOwogIG91dC5tYXhTcGVlZD1NYXRoLnJvdW5kKG91dC5tYXhTcGVlZCoxMCkvMTA7CiAgcmV0dXJuIG91dDsKfQphc3luYyBmdW5jdGlvbiBmZXRjaFRvZGF5UmlkZSh2KXtyZXR1cm4gZmV0Y2hSaWRlRGF5KHYsdG9kYXlTdHIoKS5yZXBsYWNlKC8tL2csIi4iKSl9CmFzeW5jIGZ1bmN0aW9uIGZldGNoUmlkZURheURhdGEodixkb3QpewogIHRyeXsKICAgIGlmKCFTLmFjY3x8IXZ8fCF2LnZpbk5vfHwhZG90KXJldHVybiBudWxsOwogICAgdmFyIG1vbnRoPWRvdC5zbGljZSgwLDcpOwogICAgZm9yKHZhciBwZz0xO3BnPD0zO3BnKyspewogICAgICB2YXIgZD1hd2FpdCBhcGkoIi9hcGkvcmlkZS10cmFjaz91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoUy5hY2MudXNlcklkKSsiJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KG1vbnRoKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2LnZpbk5vKSsiJnBhZ2U9IitwZysiJnBhZ2VTaXplPTIwIik7CiAgICAgIHZhciBkYXlzPShkJiZkLmRheXMpfHxbXTsKICAgICAgaWYoIWRheXMubGVuZ3RoKWJyZWFrOwogICAgICBmb3IodmFyIGk9MDtpPGRheXMubGVuZ3RoO2krKyl7aWYocmlkZU5vcm1EYXkoZGF5c1tpXSYmZGF5c1tpXS5kYXlUaW1lKT09PWRvdClyZXR1cm4gZGF5c1tpXX0KICAgICAgdmFyIGxhc3Q9ZGF5c1tkYXlzLmxlbmd0aC0xXTt2YXIgbGQ9cmlkZU5vcm1EYXkobGFzdCYmbGFzdC5kYXlUaW1lKTsKICAgICAgaWYobGQmJmxkPGRvdClicmVhazsKICAgIH0KICAgIHJldHVybiBudWxsOwogIH1jYXRjaChlKXtyZXR1cm4gbnVsbH0KfQphc3luYyBmdW5jdGlvbiBmZXRjaFJpZGVEYXkodixkb3QpewogIHZhciBkYXk9YXdhaXQgZmV0Y2hSaWRlRGF5RGF0YSh2LGRvdCk7CiAgcmV0dXJuIGRheT9hbmFseXplUmlkZURheShkYXkpOm51bGw7Cn0KLyogPT09PT0gdjIuMTYuMjMg5YWF55S154q25oCB77ya5Yqf546HIC8g5Ymp5L2Z5pe26Ze0IC8g5Yqo55S7ID09PT09ICovCmZ1bmN0aW9uIGlzQ2hhcmdpbmcodil7dmFyIGNzPVN0cmluZygodiYmdi5jaGFyZ2VTdGF0ZSl8fCIiKTtyZXR1cm4gY3MuaW5kZXhPZigi5YWF55S1Iik+PTAmJmNzLmluZGV4T2YoIuacquWFheeUtSIpPDB9CmZ1bmN0aW9uIGZtdE1pblNlYyhzZWMpe3NlYz1NYXRoLm1heCgwLE1hdGgucm91bmQoTnVtYmVyKHNlYyl8fDApKTtpZighc2VjKXJldHVybiAiLS0iO3ZhciBoPU1hdGguZmxvb3Ioc2VjLzM2MDApLG09TWF0aC5yb3VuZCgoc2VjJTM2MDApLzYwKTtpZihoPjApcmV0dXJuIGgrIiDml7YgIisobT9tKyIg5YiGIjoiIik7cmV0dXJuIG0rIiDliIYifQpmdW5jdGlvbiBjaGFyZ2VJbmZvKHYpewogIGlmKCFpc0NoYXJnaW5nKHYpKXJldHVybiBudWxsOwogIHZhciBzb2M9TnVtYmVyKHYuYmF0dGVyeVBlcmNlbnQpfHwwLGN1cj1OdW1iZXIodi5jdXJyZW50KXx8MCx2b2x0PU51bWJlcih2LnZvbHRhZ2UpfHwwOwogIHZhciBvZmZpY2lhbD1OdW1iZXIodi5mdWxsQ2hhcmdlVGltZVNlY29uZCl8fDA7CiAgaWYoIW9mZmljaWFsKXt2YXIgb209TnVtYmVyKHYuZnVsbENoYXJnZVRpbWUpfHwwO2lmKG9tPjApb2ZmaWNpYWw9b20qNjB9CiAgdmFyIGJjPWJhdHRDZmcoY3VyVmVoVmluKCkpO3ZhciBlc3Q9MDsKICBpZihOdW1iZXIoYmMuYWgpPjAmJmN1cj4wLjMmJnNvYz4wJiZzb2M8MTAwKWVzdD1OdW1iZXIoYmMuYWgpKigxMDAtc29jKS8xMDAvY3VyKjM2MDA7CiAgcmV0dXJuIHtzb2M6c29jLHBvd2VyOmN1cj4wLjA1P01hdGgucm91bmQodm9sdCpjdXIpOjAscmVtYWluOm9mZmljaWFsPjA/b2ZmaWNpYWw6ZXN0LG9mZmljaWFsOm9mZmljaWFsPjB9Owp9Ci8qID09PT09IHYyLjE2LjQxIOWFheeUtee7n+iuoe+8muacrOWcsOiusOW9leWFheeUtei/h+eoi++8iOWumOaWuSBiYXR0ZXJ5SW5mbyDml6DmnIjluqblhYXnlLXlrZfmrrXvvIkgPT09PT0gKi8KdmFyIENIR19LRVlfUFJFRklYPSJ6aF9jaGdfc2Vzc192MV8iOwpmdW5jdGlvbiBjaGdTdG9yZSh2aW4pewogIHRyeXt2YXIgbz1KU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKENIR19LRVlfUFJFRklYK3Zpbil8fCJudWxsIik7aWYobyYmdHlwZW9mIG89PT0ib2JqZWN0Iil7aWYoIUFycmF5LmlzQXJyYXkoby5saXN0KSlvLmxpc3Q9W107cmV0dXJuIG99fWNhdGNoKGUpe30KICByZXR1cm4ge206IiIsbGlzdDpbXSxhY3Q6bnVsbCxsYXN0U29jOm51bGwsbGFzdFRzOjB9Owp9CmZ1bmN0aW9uIGNoZ1NhdmVTdG9yZSh2aW4sbyl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKENIR19LRVlfUFJFRklYK3ZpbixKU09OLnN0cmluZ2lmeShvKSl9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gY2hnQ2FwKHZpbil7CiAgdmFyIGJjPWJhdHRDZmcodmluKSxhaD1OdW1iZXIoYmMuYWgpfHwwLHZmPU51bWJlcihiYy52RnVsbCl8fDA7CiAgaWYoYWg+MCYmdmY+MClyZXR1cm4ge2t3aDphaCp2Zi8xMDAwLGRlZjpmYWxzZX07CiAgcmV0dXJuIHtrd2g6MzAqNzIvMTAwMCxkZWY6dHJ1ZX07Cn0KZnVuY3Rpb24gY2hnQWRkKHZpbixvLGRlbHRhU29jKXsKICB2YXIgY2FwPWNoZ0NhcCh2aW4pLGt3aD1jYXAua3doKmRlbHRhU29jLzEwMDsKICBpZihkZWx0YVNvYzwxfHxrd2g8PTAuMDIpcmV0dXJuIGZhbHNlOwogIG8ubGlzdC5wdXNoKHtkOnRvZGF5U3RyKCksZHNvYzpkZWx0YVNvYyxrd2g6TWF0aC5yb3VuZChrd2gqMTAwKS8xMDB9KTsKICByZXR1cm4gdHJ1ZTsKfQpmdW5jdGlvbiBjaGdEb25lKHNvYyxkZWx0YVNvYyl7CiAgdHJ5ewogICAgdmFyIGM9Uy5jZmd8fHt9O2lmKGMuY2hhcmdlRG9uZVB1c2g9PT1mYWxzZSlyZXR1cm47CiAgICB2YXIga3doPWNoZ0NhcChjdXJWZWhWaW4oKSkua3doKmRlbHRhU29jLzEwMDsKICAgIHZhciBib2R5PSLlt7LlhYXoh7MgIitNYXRoLnJvdW5kKG51bShzb2MsMCkpKyIl77yM5pys5qyh5YWF5YWl57qmICIra3doLnRvRml4ZWQoMikrIiBrV2giOwogICAgdmFyIGxvY2FsPW5hdGl2ZU5vdGlmeSgi5YWF55S15a6M5oiQIixib2R5KTsKICAgIHRvYXN0KCLlhYXnlLXlrozmiJAgwrcg5YWF5YWl57qmICIra3doLnRvRml4ZWQoMSkrIiBrV2giLCJvayIpOwogICAgaWYoIWxvY2FsJiZTLmFjYyYmUy5hY2MuYmFya0tleSlwb3N0KCIvYXBpL25vdGlmeSIse3VzZXJJZDpTLmFjYy51c2VySWQsdGl0bGU6IuaegeaguOWFheeUteWujOaIkCIsYm9keTpib2R5fSk7CiAgfWNhdGNoKGUpe30KfQpmdW5jdGlvbiBjaGdUcmFjayh2KXsKICB0cnl7CiAgICB2YXIgdmluPVN0cmluZygodiYmKHYuY3VycmVudFZpbnx8di52aW5ObykpfHwiIik7aWYoIXZpbilyZXR1cm47CiAgICB2YXIgc29jPW51bSh2LmJhdHRlcnlQZXJjZW50LG51bGwpO2lmKHNvYz09bnVsbHx8c29jPDB8fHNvYz4xMDApcmV0dXJuOwogICAgdmFyIG1rPXRvZGF5U3RyKCkuc2xpY2UoMCw3KSxvPWNoZ1N0b3JlKHZpbik7CiAgICBpZihvLm0hPT1tayl7by5tPW1rO28ubGlzdD1bXTtvLmFjdD1udWxsO28ubGFzdFNvYz1udWxsO28ubGFzdFRzPTB9CiAgICBpZihpc0NoYXJnaW5nKHYpKXsKICAgICAgaWYoIW8uYWN0KW8uYWN0PXtmcm9tOnNvYyxtYXg6c29jLHRzOkRhdGUubm93KCl9OwogICAgICBpZihzb2M+by5hY3QubWF4KW8uYWN0Lm1heD1zb2M7CiAgICB9ZWxzZSBpZihvLmFjdCl7CiAgICAgIHZhciBkbHQ9TWF0aC5tYXgoby5hY3QubWF4LHNvYyktby5hY3QuZnJvbTsKICAgICAgdmFyIGFkZGVkPWNoZ0FkZCh2aW4sbyxkbHQpO28uYWN0PW51bGw7CiAgICAgIGlmKGFkZGVkKWNoZ0RvbmUoc29jLGRsdCk7CiAgICB9ZWxzZSBpZihvLmxhc3RTb2MhPW51bGwmJnNvYy1vLmxhc3RTb2M+PTMmJihEYXRlLm5vdygpLU51bWJlcihvLmxhc3RUc3x8MCkpPDcqMjQqMzYwMCoxMDAwKXsKICAgICAgY2hnQWRkKHZpbixvLHNvYy1vLmxhc3RTb2MpOwogICAgfQogICAgby5sYXN0U29jPXNvYztvLmxhc3RUcz1EYXRlLm5vdygpOwogICAgY2hnU2F2ZVN0b3JlKHZpbixvKTsKICB9Y2F0Y2goZSl7fQp9CmZ1bmN0aW9uIGNoZ01vbnRoU3VtKHZpbil7CiAgdmFyIG89Y2hnU3RvcmUodmluKSxtaz10b2RheVN0cigpLnNsaWNlKDAsNyksa3doPTAsY250PTAsbGFzdD0iIjsKICAoby5saXN0fHxbXSkuZm9yRWFjaChmdW5jdGlvbih4KXtpZihTdHJpbmcoeC5kfHwiIikuc2xpY2UoMCw3KT09PW1rKXtrd2grPU51bWJlcih4Lmt3aCl8fDA7Y250Kys7bGFzdD14LmR9fSk7CiAgcmV0dXJuIHtrd2g6TWF0aC5yb3VuZChrd2gqMTApLzEwLGNudDpjbnQsbGFzdDpsYXN0LGRlZjpjaGdDYXAodmluKS5kZWZ9Owp9CgovKiA9PT09PSB2Mi4xNi41NCDmiYvliqjlhYXnlLXorrDlvZXvvIjmjInlrp7pmYXotKbljZXloavlhpnvvIzni6znq4vnu5/orqHvvIzkuI3lvbHlk43oh6rliqjkvLDnrpfvvIkgPT09PT0gKi8KdmFyIENIR19NQU5fS0VZPSJ6aF9jaGdfbWFudWFsX3YxXyI7CmZ1bmN0aW9uIGNoZ01hbkxpc3QodmluKXsKICB0cnl7dmFyIGE9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShDSEdfTUFOX0tFWSt2aW4pfHwiW10iKTtyZXR1cm4gQXJyYXkuaXNBcnJheShhKT9hOltdfWNhdGNoKGUpe3JldHVybltdfQp9CmZ1bmN0aW9uIGNoZ01hblNhdmUodmluLGEpe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShDSEdfTUFOX0tFWSt2aW4sSlNPTi5zdHJpbmdpZnkoYSkpfWNhdGNoKGUpe319CmZ1bmN0aW9uIGNoZ01hbk1vbnRoKHZpbil7CiAgdmFyIG1rPXRvZGF5U3RyKCkuc2xpY2UoMCw3KSxrd2g9MCxjb3N0PTAsY250PTA7CiAgY2hnTWFuTGlzdCh2aW4pLmZvckVhY2goZnVuY3Rpb24oeCl7CiAgICBpZihTdHJpbmcoeC5kfHwiIikuc2xpY2UoMCw3KT09PW1rKXtrd2grPU51bWJlcih4Lmt3aCl8fDA7Y29zdCs9TnVtYmVyKHguY29zdCl8fDA7Y250Kyt9CiAgfSk7CiAgcmV0dXJuIHtrd2g6TWF0aC5yb3VuZChrd2gqMTAwKS8xMDAsY29zdDpNYXRoLnJvdW5kKGNvc3QqMTAwKS8xMDAsY250OmNudH07Cn0KZnVuY3Rpb24gb3BlbkNoZ01hbigpe3JlbmRlckNoZ01hbigpO29wZW5TaGVldCgiY2hnTWFuU2hlZXQiKX0KZnVuY3Rpb24gcmVuZGVyQ2hnTWFuKCl7CiAgdmFyIGVsPSQoImNoZ01hbkJvZHkiKTtpZighZWwpcmV0dXJuOwogIHZhciB2aW49Y3VyVmVoVmluKCksbWFuPWNoZ01hbk1vbnRoKHZpbik7CiAgdmFyIGxpc3Q9Y2hnTWFuTGlzdCh2aW4pLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBTdHJpbmcoYi5kfHwiIikubG9jYWxlQ29tcGFyZShTdHJpbmcoYS5kfHwiIikpfSk7CiAgdmFyIHJvd3M9bGlzdC5zbGljZSgwLDQwKS5tYXAoZnVuY3Rpb24oeCl7CiAgICB2YXIga3doPU51bWJlcih4Lmt3aCl8fDAsY29zdD1OdW1iZXIoeC5jb3N0KXx8MDsKICAgIHJldHVybiAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+Jytlc2MoU3RyaW5nKHguZHx8IiIpKSsoeC5ub3RlPycgwrcgJytlc2MoU3RyaW5nKHgubm90ZSkpOicnKSsnPC9zcGFuPicrCiAgICAgICc8c3BhbiBjbGFzcz0idiBudW0iPicrKGt3aD4wP2t3aC50b0ZpeGVkKDIpKycga1doICc6JycpKyhjb3N0PjA/J8KlJytjb3N0LnRvRml4ZWQoMik6JycpKwogICAgICAnIDxzcGFuIGNsYXNzPSJhY3QiIG9uY2xpY2s9ImNoZ01hbkRlbChcJycrZXNjKFN0cmluZyh4LmlkfHwiIikpKydcJykiPuWIoOmZpDwvc3Bhbj48L3NwYW4+PC9kaXY+JzsKICB9KS5qb2luKCIiKTsKICBlbC5pbm5lckhUTUw9CiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+5pys5pyI5omL5Yqo6K6w5b2VPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+JyttYW4uY250Kycg56yUIMK3ICcrbWFuLmt3aC50b0ZpeGVkKDIpKycga1doIMK3IMKlJyttYW4uY29zdC50b0ZpeGVkKDIpKyc8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJmaWVsZCIgc3R5bGU9Im1hcmdpbi10b3A6MTBweCI+PGxhYmVsPuaXpeacnzwvbGFiZWw+PGRpdiBjbGFzcz0iaW5wIj48aW5wdXQgaWQ9ImNtX2RhdGUiIHR5cGU9ImRhdGUiIHZhbHVlPSInK3RvZGF5U3RyKCkrJyI+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJmaWVsZCI+PGxhYmVsPuWFheeUteeUtemHj++8iGtXaO+8jOWPr+WPquWhq+mHkemine+8iTwvbGFiZWw+PGRpdiBjbGFzcz0iaW5wIj48aW5wdXQgaWQ9ImNtX2t3aCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLkvovlpoIgMS44Ij48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+5a6e6ZmF6YeR6aKd77yI5YWD77yJPC9sYWJlbD48ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0iY21fY29zdCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLkvovlpoIgMy41Ij48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+5aSH5rOo77yI5Y+v6YCJ77yM5aaC56uZ54K55ZCN77yJPC9sYWJlbD48ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0iY21fbm90ZSIgdHlwZT0idGV4dCIgcGxhY2Vob2xkZXI9IuS+i+WmgiDlsI/ljLrlhYXnlLXmo5oiPjwvZGl2PjwvZGl2PicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iZ2J0biIgb25jbGljaz0iY2hnTWFuQWRkKCkiPuS/neWtmOi/meeslOiusOW9lTwvYnV0dG9uPicrCiAgICAocm93cz8nPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4Ij4nK3Jvd3MrJzwvZGl2Pic6JzxkaXYgY2xhc3M9ImhpbnQiPui/mOayoeacieiusOW9le+8jOWhq+WlveS4iumdouS4iemhueS/neWtmOWNs+WPr+OAgjwvZGl2PicpKwogICAgJzxkaXYgY2xhc3M9ImhpbnQiPuaJi+WKqOiusOW9leeLrOeri+e7n+iuoe+8jOS4jeS8muS4juiHquWKqOS8sOeul+mHjeWkjeiuoeeul++8jOeUqOS6juaMieWunumZhei0puWNleaguOWvueavj+aciOWFheeUteiKsei0ueOAgjwvZGl2Pic7Cn0KZnVuY3Rpb24gY2hnTWFuQWRkKCl7CiAgdmFyIHZpbj1jdXJWZWhWaW4oKTsKICB2YXIgZEVsPSQoImNtX2RhdGUiKSxrRWw9JCgiY21fa3doIiksY0VsPSQoImNtX2Nvc3QiKSxuRWw9JCgiY21fbm90ZSIpOwogIHZhciBkPVN0cmluZygoZEVsJiZkRWwudmFsdWUpfHwiIil8fHRvZGF5U3RyKCk7CiAgdmFyIGt3aD1OdW1iZXIoKGtFbCYma0VsLnZhbHVlKXx8MCksY29zdD1OdW1iZXIoKGNFbCYmY0VsLnZhbHVlKXx8MCk7CiAgdmFyIG5vdGU9U3RyaW5nKChuRWwmJm5FbC52YWx1ZSl8fCIiKS50cmltKCk7CiAgaWYoIShrd2g+MCkmJiEoY29zdD4wKSl7dG9hc3QoIueUtemHj+aIlumHkemineiHs+WwkeWhq+S4gOmhuSIsImVyciIpO3JldHVybn0KICB2YXIgbGlzdD1jaGdNYW5MaXN0KHZpbik7CiAgbGlzdC5wdXNoKHtpZDpTdHJpbmcoRGF0ZS5ub3coKSksZDpkLGt3aDppc0Zpbml0ZShrd2gpP2t3aDowLGNvc3Q6aXNGaW5pdGUoY29zdCk/Y29zdDowLG5vdGU6bm90ZX0pOwogIGNoZ01hblNhdmUodmluLGxpc3QpOwogIHJlbmRlckNoZ01hbigpOwogIHRyeXtyZW5kZXJIb21lKCl9Y2F0Y2goZSl7fQogIHRvYXN0KCLlt7Lkv53lrZjmiYvliqjlhYXnlLXorrDlvZUiLCJvayIpOwp9CmZ1bmN0aW9uIGNoZ01hbkRlbChpZCl7CiAgaWYoIWlkKXJldHVybjsKICB2YXIgdmluPWN1clZlaFZpbigpOwogIGNoZ01hblNhdmUodmluLGNoZ01hbkxpc3QodmluKS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIFN0cmluZyh4LmlkKSE9PVN0cmluZyhpZCl9KSk7CiAgcmVuZGVyQ2hnTWFuKCk7CiAgdHJ5e3JlbmRlckhvbWUoKX1jYXRjaChlKXt9CiAgdG9hc3QoIuW3suWIoOmZpCIsIm9rIik7Cn0KCi8qID09PT09IHYyLjE2LjQzIOmZhOi/keWFheeUteahqe+8iOmrmOW+t+WRqOi+ueaQnOe0oiArIOi3s+i9rOmrmOW+t+eci+WunuaXtuS7t++8iSA9PT09PSAqLwp2YXIgQ1BTPXtsYXQ6MCxsbmc6MCxjYXQ6ImFsbCIsaXRlbXM6W10sYnVzeTpmYWxzZSxlcnI6IiIscmFkaXVzOjMwMDAsc2VsOi0xfTsKdmFyIENQX0NBVFM9WwogIHtrOiJhbGwiLG46IuWFqOmDqCIsa3c6IuWFheeUteahqSIsYzoiI0VBRjFGQiJ9LAogIHtrOiJkYyIsbjoi5rG96L2m55u05rWB5b+r5YWFIixrdzoi55u05rWB5YWF55S15qGpIixjOiIjMkJENEYyIn0sCiAge2s6ImFjIixuOiLmsb3ovabkuqTmtYHmhaLlhYUiLGt3OiLkuqTmtYHlhYXnlLXmoakiLGM6IiNCN0E2RkIifSwKICB7azoiYm90aCIsbjoi5Lqk55u05rWB5LiA5L2TIixrdzoi5YWF55S156uZIixjOiIjM0REQzk3In0sCiAge2s6ImxvdyIsbjoiNTBW6LW35YWF55u05rWBIixrdzoi5pGp5omY6L2m55u05rWB5YWF55S15qGpIixjOiIjRjdCOTU1In0sCiAge2s6ImViaWtlIixuOiLlsI/ljLov6Lev6L655Lik6L2uIixrdzoi55S155O26L2m5YWF55S15qGpIixjOiIjRjk3MDZBIn0KXTsKZnVuY3Rpb24gY3BDYXQoayl7Zm9yKHZhciBpPTA7aTxDUF9DQVRTLmxlbmd0aDtpKyspaWYoQ1BfQ0FUU1tpXS5rPT09aylyZXR1cm4gQ1BfQ0FUU1tpXTtyZXR1cm4gQ1BfQ0FUU1swXX0KZnVuY3Rpb24gY3BDbGFzc2lmeShuYW1lLHR5cGUsc3JjKXsKICB2YXIgcz1TdHJpbmcobmFtZXx8IiIpKyIgIitTdHJpbmcodHlwZXx8IiIpOwogIGlmKC/mkanmiZh855S15pGpfDUwVnzkvY7ljosvLnRlc3QocykpcmV0dXJuICJsb3ciOwogIGlmKC/nlLXnk7bovaZ855S15Yqo6L2m5YWFfOS4pOi9rnzoh6rooYzovaZ86L2m5qOafOWFheeUteajmi8udGVzdChzKSlyZXR1cm4gImViaWtlIjsKICBpZigv5Lqk55u05rWBfOS6pFwv55u05rWBfOS4gOS9k3zmjaLnlLUvLnRlc3QocykpcmV0dXJuICJib3RoIjsKICBpZigv55u05rWBfOW/q+WFhXzotoXlhYV85aSn5Yqf546HfOmXquWFhXzotoXnuqflhYUvLnRlc3QocykpcmV0dXJuICJkYyI7CiAgaWYoL+S6pOa1gXzmhaLlhYV855uu55qE5ZywLy50ZXN0KHMpKXJldHVybiAiYWMiOwogIGlmKHNyYz09PSJkYyIpcmV0dXJuICJkYyI7CiAgaWYoc3JjPT09ImViaWtlIilyZXR1cm4gImViaWtlIjsKICByZXR1cm4gImJvdGgiOwp9CmZ1bmN0aW9uIGNwVmlzaWJsZSgpewogIGlmKENQUy5jYXQ9PT0iYWxsIilyZXR1cm4gQ1BTLml0ZW1zOwogIHJldHVybiBDUFMuaXRlbXMuZmlsdGVyKGZ1bmN0aW9uKHApe3JldHVybiBwLmNscz09PUNQUy5jYXR9KTsKfQpmdW5jdGlvbiBvcGVuQ2hhcmdlU3RhdGlvbnMoKXsKICB2YXIgdj0oUy5kYXRhJiZTLmRhdGEudmVoaWNsZSl8fHt9OwogIGlmKCFoYXNDb29yZCh2KSl7dG9hc3QoIuaaguaXoOi9pui+huWumuS9je+8jOaXoOazleaQnOe0oumZhOi/keWFheeUteahqSIsImVyciIpO3JldHVybn0KICBDUFMubGF0PU51bWJlcih2LmxhdGl0dWRlKTtDUFMubG5nPU51bWJlcih2LmxvbmdpdHVkZSk7Q1BTLnNlbD0tMTsKICBjbG9zZVNoZWV0KCJnZWFyU2hlZXQiKTsKICBjcFJlbmRlckNhdHMoKTtvcGVuU2hlZXQoImNwU2hlZXQiKTtjcERyYXdNYXAoKTtjcFJlbG9hZCgpOwp9CmZ1bmN0aW9uIGNwUmVsb2FkKCl7Y3BMb2FkKCl9CmFzeW5jIGZ1bmN0aW9uIGNwTG9hZCgpewogIHZhciBrZXk9U3RyaW5nKChTLmNmZyYmUy5jZmcuYW1hcEtleSl8fCIiKS50cmltKCk7CiAgQ1BTLmVycj0iIjtDUFMuYnVzeT10cnVlO2NwUmVuZGVyTGlzdCgpO2NwRHJhd01hcCgpOwogIGlmKCFrZXkpe0NQUy5idXN5PWZhbHNlO0NQUy5lcnI9Im5va2V5IjtjcFJlbmRlckxpc3QoKTtyZXR1cm59CiAgdmFyIGt3cz1be2s6IuWFheeUteahqSIsdDoiIn0se2s6IuebtOa1geWFheeUteahqSIsdDoiZGMifSx7azoi55S155O26L2m5YWF55S15qGpIix0OiJlYmlrZSJ9XTsKICB2YXIgYWxsPVtdLGVycj0iIjsKICBmb3IodmFyIGk9MDtpPGt3cy5sZW5ndGg7aSsrKXsKICAgIHZhciBxPSIvYXBpL2FtYXAtcG9pP2tleT0iK2VuY29kZVVSSUNvbXBvbmVudChrZXkpKyImbG5nPSIrQ1BTLmxuZy50b0ZpeGVkKDYpKyImbGF0PSIrQ1BTLmxhdC50b0ZpeGVkKDYpKyImcmFkaXVzPSIrQ1BTLnJhZGl1cysiJmtleXdvcmQ9IitlbmNvZGVVUklDb21wb25lbnQoa3dzW2ldLmspOwogICAgdmFyIHI9YXdhaXQgYXBpKHEpOwogICAgaWYociYmci5vayYmQXJyYXkuaXNBcnJheShyLnBvaXMpKXsKICAgICAgci5wb2lzLmZvckVhY2goZnVuY3Rpb24ocCl7cC5zcmM9a3dzW2ldLnQ7YWxsLnB1c2gocCl9KTsKICAgIH1lbHNlIGlmKHImJnIuZXJyb3ImJiFlcnIpZXJyPVN0cmluZyhyLmVycm9yKTsKICB9CiAgdmFyIHNlZW49e30sb3V0PVtdOwogIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKHApewogICAgaWYoIXAuaWR8fHNlZW5bcC5pZF0pcmV0dXJuO3NlZW5bcC5pZF09MTsKICAgIHAuY2xzPWNwQ2xhc3NpZnkocC5uYW1lLHAudHlwZSxwLnNyYyk7CiAgICBvdXQucHVzaChwKTsKICB9KTsKICBvdXQuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiAoYS5kaXN0YW5jZXx8MCktKGIuZGlzdGFuY2V8fDApfSk7CiAgQ1BTLml0ZW1zPW91dDtDUFMuYnVzeT1mYWxzZTtDUFMuZXJyPW91dC5sZW5ndGg/IiI6KGVycnx8Im5vbmUiKTsKICBjcFJlbmRlckNhdHMoKTtjcFJlbmRlckxpc3QoKTtjcERyYXdNYXAoKTsKfQpmdW5jdGlvbiBjcFNldENhdChrKXtDUFMuY2F0PWt8fCJhbGwiO0NQUy5zZWw9LTE7Y3BSZW5kZXJDYXRzKCk7Y3BSZW5kZXJMaXN0KCk7Y3BEcmF3TWFwKCl9CmZ1bmN0aW9uIGNwUmVuZGVyQ2F0cygpewogIHZhciBlbD0kKCJjcENhdHMiKTtpZighZWwpcmV0dXJuOwogIGVsLmlubmVySFRNTD1DUF9DQVRTLm1hcChmdW5jdGlvbihjKXsKICAgIHZhciBuPUNQUy5pdGVtcy5maWx0ZXIoZnVuY3Rpb24ocCl7cmV0dXJuIHAuY2xzPT09Yy5rfSkubGVuZ3RoOwogICAgcmV0dXJuICc8c3BhbiBjbGFzcz0iY3AtY2hpcCcrKENQUy5jYXQ9PT1jLms/JyBvbic6JycpKyciIGRhdGEtaz0iJytjLmsrJyIgb25jbGljaz0iY3BTZXRDYXQodGhpcy5kYXRhc2V0LmspIj4nK2MubisoQ1BTLml0ZW1zLmxlbmd0aD8nICcrbjonJykrJzwvc3Bhbj4nOwogIH0pLmpvaW4oIiIpOwp9CmZ1bmN0aW9uIGNwUmVuZGVyTGlzdCgpewogIHZhciBlbD0kKCJjcExpc3QiKSxudD0kKCJjcE5vdGUiKTtpZighZWwpcmV0dXJuOwogIGlmKENQUy5idXN5KXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNwLWVtcHR5Ij7mraPlnKjmkJzntKLpmYTov5HlhYXnlLXmoanigKY8L2Rpdj4nO2lmKG50KW50LnRleHRDb250ZW50PSIiO3JldHVybn0KICBpZihDUFMuZXJyPT09Im5va2V5Iil7CiAgICBlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNwLWVtcHR5Ij7mnKrphY3nva7pq5jlvrcgS2V577yM6Z2i5p2/5YaF5pqC5LiN5pi+56S656uZ54K55YiX6KGoPGJyPueCueS4i+aWueOAjOmrmOW+t+eci+WunuaXtuS7t+agvOOAjeWPr+ebtOaOpeafpeeci+mZhOi/keWFheeUteahqeS4juWunuaXtueUteS7tzxicj48c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tdHh0MikiPuWPr+WcqCDorr7nva4g4oaSIOWFheeUteS4jueUteaxoCDloavlhaXpq5jlvrcgS2V5PC9zcGFuPjwvZGl2Pic7CiAgICBpZihudCludC50ZXh0Q29udGVudD0iIjsKICAgIHJldHVybjsKICB9CiAgdmFyIGxpc3Q9Y3BWaXNpYmxlKCk7CiAgaWYoIWxpc3QubGVuZ3RoKXsKICAgIGVsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY3AtZW1wdHkiPicrKENQUy5lcnImJkNQUy5lcnIhPT0ibm9uZSI/IuaQnOe0ouWksei0pe+8miIrZXNjKENQUy5lcnIpOiLor6XliIbnsbsgMyDlhazph4zlhoXmsqHmnInmib7liLDnq5nngrkiKSsnPGJyPuWPr+eCueOAjOmrmOW+t+eci+WunuaXtuS7t+agvOOAjeaUvuWkp+iMg+WbtOafpeecizwvZGl2Pic7CiAgfWVsc2V7CiAgICBlbC5pbm5lckhUTUw9bGlzdC5tYXAoZnVuY3Rpb24ocCxpKXsKICAgICAgdmFyIGM9Y3BDYXQocC5jbHMpLGNvc3Q9U3RyaW5nKHAuY29zdHx8IiIpOwogICAgICB2YXIgcHJpY2U9Y29zdD8oJzxkaXYgY2xhc3M9InAiPuWPguiAg+S7tyDCpScrZXNjKGNvc3QpKyc8L2Rpdj4nKTonPGRpdiBjbGFzcz0icCBkaW0iPuWunuaXtuS7t+agvOingemrmOW+tzwvZGl2Pic7CiAgICAgIHZhciBkaXN0PXAuZGlzdGFuY2U+MD8ocC5kaXN0YW5jZT49MTAwMD8ocC5kaXN0YW5jZS8xMDAwKS50b0ZpeGVkKDEpKycga20nOk1hdGgucm91bmQocC5kaXN0YW5jZSkrJyBtJyk6Jyc7CiAgICAgIHJldHVybiAnPGRpdiBjbGFzcz0iY3AtaXRlbSIgb25jbGljaz0iY3BOYXYoJytpKycpIj4nKwogICAgICAgICc8ZGl2IGNsYXNzPSJuIj4nK2VzYyhwLm5hbWV8fCLlhYXnlLXnq5kiKSsnPHNwYW4gY2xhc3M9ImNwLXRhZyIgc3R5bGU9ImNvbG9yOicrYy5jKyciPicrYy5uKyc8L3NwYW4+PC9kaXY+JysKICAgICAgICAnPGRpdiBjbGFzcz0icyI+JytkaXN0KyhwLmFkZHJlc3M/KGRpc3Q/JyDCtyAnOicnKStlc2MocC5hZGRyZXNzKTonJykrJzwvZGl2PicrcHJpY2UrCiAgICAgICc8L2Rpdj4nOwogICAgfSkuam9pbigiIik7CiAgfQogIGlmKG50KW50LnRleHRDb250ZW50PSLku7fmoLzkuI7nqbrpl7LmoannlLHpq5jlvrcv6L+Q6JCl5ZWG5a6e5pe25o+Q5L6b77yb5YiX6KGo5Li65ZGo6L65IFBPSSDlj4LogIPvvIzngrnlh7vnq5nngrnmiZPlvIDpq5jlvrflr7zoiKrjgIIiOwp9CmZ1bmN0aW9uIGNwTmF2KGkpewogIHZhciBsaXN0PWNwVmlzaWJsZSgpLGl0PWxpc3RbaV07aWYoIWl0KXJldHVybjsKICB2YXIgbG9jPVN0cmluZyhpdC5sb2NhdGlvbnx8IiIpLnNwbGl0KCIsIik7CiAgaWYobG9jLmxlbmd0aDwyKXt0b2FzdCgi6K+l56uZ54K55pqC5peg5Z2Q5qCHIiwiZXJyIik7cmV0dXJufQogIHZhciB1cmw9Imh0dHBzOi8vdXJpLmFtYXAuY29tL21hcmtlcj9wb3NpdGlvbj0iK2xvY1swXSsiLCIrbG9jWzFdKyImbmFtZT0iK2VuY29kZVVSSUNvbXBvbmVudChpdC5uYW1lfHwi5YWF55S15qGpIikrIiZzcmM9emVlaG8mY29vcmRpbmF0ZT1nYW9kZSZjYWxsbmF0aXZlPTEiOwogIG9wZW5FeHRlcm5hbCh1cmwpOwp9CmZ1bmN0aW9uIGNwT3BlbkFtYXAoKXsKICBpZighQ1BTLmxhdCYmIUNQUy5sbmcpe3RvYXN0KCLmmoLml6DovabovoblrprkvY0iLCJlcnIiKTtyZXR1cm59CiAgdmFyIGM9Y3BDYXQoQ1BTLmNhdCk7CiAgdmFyIHVybD0iaHR0cHM6Ly91cmkuYW1hcC5jb20vc2VhcmNoP2tleXdvcmQ9IitlbmNvZGVVUklDb21wb25lbnQoYy5rd3x8IuWFheeUteahqSIpKyImY2VudGVyPSIrQ1BTLmxuZysiLCIrQ1BTLmxhdCsiJnJhZGl1cz0iK0NQUy5yYWRpdXMrIiZzcmM9emVlaG8mY29vcmRpbmF0ZT1nYW9kZSZjYWxsbmF0aXZlPTEiOwogIG9wZW5FeHRlcm5hbCh1cmwpOwp9CmZ1bmN0aW9uIGNwRHJhd01hcCgpewogIHZhciBib3g9JCgiY3BNYXAiKTtpZighYm94KXJldHVybjsKICB2YXIgdz1ib3guY2xpZW50V2lkdGh8fDMyMCxoPWJveC5jbGllbnRIZWlnaHR8fDE2ODsKICBpZighQ1BTLmxhdCYmIUNQUy5sbmcpe2JveC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNwLWVtcHR5Ij7mmoLml6DovabovoblrprkvY08L2Rpdj4nO3JldHVybn0KICB2YXIgej0xNSx3b3JsZD0yNTYqTWF0aC5wb3coMix6KTsKICB2YXIgbGVmdD1ycE1lcmNYKENQUy5sbmcpKndvcmxkLXcvMix0b3A9cnBNZXJjWShDUFMubGF0KSp3b3JsZC1oLzI7CiAgdmFyIHRpbGVzPSIiOwogIHZhciB0eDA9TWF0aC5mbG9vcihsZWZ0LzI1NiksdHgxPU1hdGguZmxvb3IoKGxlZnQrdykvMjU2KSx0eTA9TWF0aC5mbG9vcih0b3AvMjU2KSx0eTE9TWF0aC5mbG9vcigodG9wK2gpLzI1Nik7CiAgZm9yKHZhciB0eD10eDA7dHg8PXR4MTt0eCsrKWZvcih2YXIgdHk9dHkwO3R5PD10eTE7dHkrKyl7CiAgICBpZih0eTwwfHx0eT49TWF0aC5wb3coMix6KSljb250aW51ZTsKICAgIHZhciBzZD0oKHR4K3R5KSU0KSsxOwogICAgdGlsZXMrPSc8aW1nIHNyYz0iaHR0cHM6Ly93ZWJyZDAnK3NkKycuaXMuYXV0b25hdmkuY29tL2FwcG1hcHRpbGU/bGFuZz16aF9jbiZzaXplPTEmc2NhbGU9MSZzdHlsZT04Jng9Jyt0eCsnJnk9Jyt0eSsnJno9Jyt6KyciIHN0eWxlPSJsZWZ0OicrKHR4KjI1Ni1sZWZ0KSsncHg7dG9wOicrKHR5KjI1Ni10b3ApKydweCIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JzsKICB9CiAgdmFyIGRvdHM9IiI7CiAgY3BWaXNpYmxlKCkuZm9yRWFjaChmdW5jdGlvbihwKXsKICAgIHZhciBsb2M9U3RyaW5nKHAubG9jYXRpb258fCIiKS5zcGxpdCgiLCIpO2lmKGxvYy5sZW5ndGg8MilyZXR1cm47CiAgICB2YXIgbG9uPU51bWJlcihsb2NbMF0pLGxhdD1OdW1iZXIobG9jWzFdKTsKICAgIGlmKCFpc0Zpbml0ZShsb24pfHwhaXNGaW5pdGUobGF0KSlyZXR1cm47CiAgICB2YXIgeD1ycE1lcmNYKGxvbikqd29ybGQtbGVmdCx5PXJwTWVyY1kobGF0KSp3b3JsZC10b3A7CiAgICBpZih4PC0xMnx8eD53KzEyfHx5PC0xMnx8eT5oKzEyKXJldHVybjsKICAgIGRvdHMrPSc8Y2lyY2xlIGN4PSInK3gudG9GaXhlZCgxKSsnIiBjeT0iJyt5LnRvRml4ZWQoMSkrJyIgcj0iNC41IiBmaWxsPSInK2NwQ2F0KHAuY2xzKS5jKyciIHN0cm9rZT0iIzA2MTIxQyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4nOwogIH0pOwogIGJveC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNwLXRpbGVzIj4nK3RpbGVzKyc8L2Rpdj4nKwogICAgJzxzdmcgdmlld0JveD0iMCAwICcrdysnICcraCsnIj4nKwogICAgICAnPGNpcmNsZSBjeD0iJysody8yKSsnIiBjeT0iJysoaC8yKSsnIiByPSI3IiBmaWxsPSIjM0REQzk3IiBzdHJva2U9IiMwNjEyMUMiIHN0cm9rZS13aWR0aD0iMyIvPicrZG90cysKICAgICc8L3N2Zz4nKwogICAgJzxkaXYgc3R5bGU9InBvc2l0aW9uOmFic29sdXRlO3JpZ2h0OjZweDtib3R0b206M3B4O2ZvbnQtc2l6ZTo4cHg7Y29sb3I6cmdiYSgxNDcsMTYwLDE4NCwuNzUpIj7CqSDpq5jlvrflnLDlm748L2Rpdj4nOwp9CgovKiA9PT09PSB2Mi4xNi4yMiDovabovoblrprkvY0gLyDlhYXnlLXkuI7nlLXmsaAgLyDlrpjmlrnlhYXnlLXmoaPkvY0gPT09PT0gKi8KZnVuY3Rpb24gaGFzQ29vcmQodil7aWYoIXYpcmV0dXJuIGZhbHNlO3ZhciBsYT1OdW1iZXIodi5sYXRpdHVkZSksbG89TnVtYmVyKHYubG9uZ2l0dWRlKTtyZXR1cm4gaXNGaW5pdGUobGEpJiZpc0Zpbml0ZShsbykmJk1hdGguYWJzKGxhKTw9OTAmJk1hdGguYWJzKGxvKTw9MTgwJiYhKGxhPT09MCYmbG89PT0wKX0KZnVuY3Rpb24gbG9jVGV4dCh2KXtpZighdilyZXR1cm4gIuaaguaXoOWumuS9jSI7aWYodi5hZGRyZXNzKXJldHVybiBTdHJpbmcodi5hZGRyZXNzKTtpZihoYXNDb29yZCh2KSlyZXR1cm4gTnVtYmVyKHYubG9uZ2l0dWRlKS50b0ZpeGVkKDYpKyIsICIrTnVtYmVyKHYubGF0aXR1ZGUpLnRvRml4ZWQoNik7cmV0dXJuICLmmoLml6DlrprkvY0ifQpmdW5jdGlvbiBvcGVuVmVoTWFwKCl7dmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTtpZighaGFzQ29vcmQodikpe3RvYXN0KCLmmoLml6DmnInmlYggR1BTIOWdkOaghyIsImVyciIpO3JldHVybn1vcGVuRXh0ZXJuYWwoImh0dHBzOi8vdXJpLmFtYXAuY29tL21hcmtlcj9wb3NpdGlvbj0iK051bWJlcih2LmxvbmdpdHVkZSkrIiwiK051bWJlcih2LmxhdGl0dWRlKSsiJm5hbWU9IitlbmNvZGVVUklDb21wb25lbnQodi52ZWhpY2xlTmFtZXx8IuaIkeeahOi9pui+hiIpKX0KZnVuY3Rpb24gY3VyVmVoVmluKCl7dmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTtyZXR1cm4gdi5jdXJyZW50VmlufHx2LnZpbk5vfHwiIn0KZnVuY3Rpb24gYmF0dE1hcCgpe3RyeXt2YXIgbT1KU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCJ6aF9iYXR0X2NmZyIpfHwie30iKTtyZXR1cm4gKG0mJnR5cGVvZiBtPT09Im9iamVjdCIpP206e319Y2F0Y2goZSl7cmV0dXJue319fQpmdW5jdGlvbiBiYXR0Q2ZnKHZpbil7dmFyIG09YmF0dE1hcCgpO2lmKHR5cGVvZiBtLmFoIT09InVuZGVmaW5lZCJ8fHR5cGVvZiBtLnZGdWxsIT09InVuZGVmaW5lZCIpcmV0dXJuIG07dmFyIHM9KFMuY2ZnJiZTLmNmZy5iYXR0ZXJ5Q2ZnKXx8e307cmV0dXJuICh2aW4mJihzW3Zpbl18fG1bdmluXSkpfHx7fX0KZnVuY3Rpb24gc2F2ZUJhdHRDZmcoKXt2YXIgdmluPWN1clZlaFZpbigpO2lmKCF2aW4pe3RvYXN0KCLor7flhYjojrflj5bovabovoYiLCJlcnIiKTtyZXR1cm59dmFyIGFoPU51bWJlcigoJCgidmhfYmF0dF9haCIpfHx7fSkudmFsdWV8fDApLHZmPU51bWJlcigoJCgidmhfYmF0dF92ZnVsbCIpfHx7fSkudmFsdWV8fDApO2lmKCEoYWg+MCkpe3RvYXN0KCLor7fovpPlhaXnlLXmsaDlrrnph4/vvIhBaO+8iSIsImVyciIpO3JldHVybn12YXIgbT1iYXR0TWFwKCk7aWYodHlwZW9mIG0uYWghPT0idW5kZWZpbmVkInx8dHlwZW9mIG0udkZ1bGwhPT0idW5kZWZpbmVkIiltPXt9O21bdmluXT17YWg6YWgsdkZ1bGw6dmY+MD92ZjowfTt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oInpoX2JhdHRfY2ZnIixKU09OLnN0cmluZ2lmeShtKSl9Y2F0Y2goZSl7fXZhciBuZXh0PU9iamVjdC5hc3NpZ24oe30sUy5jZmd8fHt9KTt2YXIgYmNBbGw9T2JqZWN0LmFzc2lnbih7fSwobmV4dC5iYXR0ZXJ5Q2ZnfHx7fSkpO2JjQWxsW3Zpbl09e2FoOmFoLHZGdWxsOnZmPjA/dmY6MH07bmV4dC5iYXR0ZXJ5Q2ZnPWJjQWxsO1MuY2ZnPW5leHQ7cG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCk7dG9hc3QoIueUteaxoOiuvue9ruW3suS/neWtmCIsIm9rIik7cmVuZGVyQ2hhcmdlQ2FyZCgpfQp2YXIgQ1A9e29wdHM6bnVsbCxzZWw6bnVsbCx2aW46IiIsbG9hZGluZzpmYWxzZSxlcnI6IiJ9OwpmdW5jdGlvbiBjcExhYmVsKGspe3JldHVybiBTdHJpbmcoayk9PT0iMTIwMCI/IuaXoOmZkOWItiI6U3RyaW5nKGspKyJXIn0KZnVuY3Rpb24gY2hhcmdlQ2FyZEh0bWwoKXsKICB2YXIgdj0oUy5kYXRhJiZTLmRhdGEudmVoaWNsZSl8fHt9OwogIHZhciB2aW49Y3VyVmVoVmluKCksYmM9YmF0dENmZyh2aW4pOwogIHZhciBzb2M9TnVtYmVyKHYuYmF0dGVyeVBlcmNlbnQpfHwwLGN1cj1OdW1iZXIodi5jdXJyZW50KXx8MCx2b2x0PU51bWJlcih2LnZvbHRhZ2UpfHwwOwogIHZhciBjcz1TdHJpbmcodi5jaGFyZ2VTdGF0ZXx8IiIpOwogIHZhciBjaGFyZ2luZz1jcy5pbmRleE9mKCLlhYXnlLUiKT49MCYmY3MuaW5kZXhPZigi5pyq5YWF55S1Iik8MDsKICB2YXIgbGl2ZT0iIjsKICBpZihjaGFyZ2luZyYmY3VyPjAuMyl7bGl2ZT0nPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+4pqhIOWunuaXtuWFheeUteWKn+eOhzwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1icmFuZCkiPicrTWF0aC5yb3VuZCh2b2x0KmN1cikrJyBXPC9zcGFuPjwvZGl2Pic7CiAgICBpZihOdW1iZXIoYmMuYWgpPjAmJnNvYz4wJiZzb2M8MTAwKXt2YXIgcmVtPU1hdGgubWF4KDEsTWF0aC5yb3VuZChOdW1iZXIoYmMuYWgpKigxMDAtc29jKS8xMDAvY3VyKjYwKSksaGg9TWF0aC5mbG9vcihyZW0vNjApLG1tPXJlbSU2MDtsaXZlKz0nPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+4o+xIOWFheeUteWJqeS9me+8iOS8sOeul++8iTwvc3Bhbj48c3BhbiBjbGFzcz0idiBudW0iPue6piAnKyhoaD4wP2hoKyIg5pe2ICI6IiIpK21tKycg5YiGPC9zcGFuPjwvZGl2Pid9CiAgfQogIHZhciBvcHRzPUNQLm9wdHN8fFtdOwogIHZhciBjaGlwcz1vcHRzLmxlbmd0aD9vcHRzLm1hcChmdW5jdGlvbihvKXt2YXIgaz1TdHJpbmcoby5rZXkpO3JldHVybiAnPHNwYW4gY2xhc3M9ImNoaXAgJysoQ1Auc2VsPT09az8ib24iOiIiKSsnIiBkYXRhLWs9IicraysnIiBvbmNsaWNrPSJzZXRDcChcJycraysnXCcpIj4nK2NwTGFiZWwoaykrJzwvc3Bhbj4nfSkuam9pbigiIik6JzxzcGFuIHN0eWxlPSJmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKSI+JysoQ1AubG9hZGluZz8i5q2j5Zyo6K+75Y+W5a6Y5pa55qGj5L2N4oCmIjooQ1AuZXJyP2VzYyhDUC5lcnIpOiLngrnlj7PkuIrop5LliLfmlrDor7vlj5blrpjmlrnmoaPkvY0iKSkrJzwvc3Bhbj4nOwogIHJldHVybiAnPGRpdiBjbGFzcz0iY2FyZC1oZWFkIj48aDM+PGkgY2xhc3M9ImdyZWVuIj48L2k+5YWF55S15LiO55S15rGgPC9oMz48YnV0dG9uIGNsYXNzPSJtaW5pLWJ0biIgb25jbGljaz0ibG9hZENwKHRydWUpIj7liLfmlrA8L2J1dHRvbj48L2Rpdj4nKwogICAgbGl2ZSsKICAgICc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTFweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tdHh0Mik7bWFyZ2luOjEwcHggMCA2cHgiPuWFheeUteWKn+eOh++8iOWumOaWueaho+S9je+8iTwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ib3B0LXJvdyI+JytjaGlwcysnPGJ1dHRvbiBjbGFzcz0ibWluaS1idG4iIG9uY2xpY2s9ImFwcGx5Q3AoKSI+6K6+572uPC9idXR0b24+PC9kaXY+JysKICAgICc8ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjZweDthbGlnbi1pdGVtczpjZW50ZXI7bWFyZ2luLXRvcDo4cHg7ZmxleC13cmFwOndyYXAiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKSI+55S15rGg5a656YePPC9zcGFuPicrCiAgICAnPGlucHV0IGlkPSJ2aF9iYXR0X2FoIiB0eXBlPSJudW1iZXIiIGlucHV0bW9kZT0iZGVjaW1hbCIgcGxhY2Vob2xkZXI9IkFoIiB2YWx1ZT0iJysoYmMuYWh8fCIiKSsnIiBzdHlsZT0id2lkdGg6NzZweDtiYWNrZ3JvdW5kOnZhcigtLWNhcmQzKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6OHB4O2NvbG9yOnZhcigtLXR4dCk7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4Ij4nKwogICAgJzxzcGFuIHN0eWxlPSJmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQyKSI+5ruh55S155S15Y6LPC9zcGFuPicrCiAgICAnPGlucHV0IGlkPSJ2aF9iYXR0X3ZmdWxsIiB0eXBlPSJudW1iZXIiIGlucHV0bW9kZT0iZGVjaW1hbCIgcGxhY2Vob2xkZXI9IlYiIHZhbHVlPSInKyhiYy52RnVsbHx8IiIpKyciIHN0eWxlPSJ3aWR0aDo3MHB4O2JhY2tncm91bmQ6dmFyKC0tY2FyZDMpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo4cHg7Y29sb3I6dmFyKC0tdHh0KTtwYWRkaW5nOjZweCA4cHg7Zm9udC1zaXplOjEycHgiPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0ibWluaS1idG4iIG9uY2xpY2s9InNhdmVCYXR0Q2ZnKCkiPuS/neWtmDwvYnV0dG9uPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGludCI+5YWF55S15Yqf546H5qGj5L2N5p2l6Ieq5a6Y5pa55o6l5Y+j77yIMjAwLTEyMDBX77yMMTIwMCDkuLrml6DpmZDliLbvvInvvJvlrrnph48v5ruh55S155S15Y6L5LuF5pys5py65Lyw566X5YWF55S15Ymp5L2Z77yM5LiN5Lya5pS55YaZ6L2m6L6G44CCPC9kaXY+JzsKfQpmdW5jdGlvbiByZW5kZXJDaGFyZ2VDYXJkKCl7dmFyIGVsPSQoImN0cmxDaGFyZ2UiKTtpZihlbCllbC5pbm5lckhUTUw9Y2hhcmdlQ2FyZEh0bWwoKX0KYXN5bmMgZnVuY3Rpb24gbG9hZENwKGZvcmNlKXsKICBpZighUy5hY2MpcmV0dXJuOwogIHZhciB2aW49Y3VyVmVoVmluKCk7aWYoIXZpbilyZXR1cm47CiAgaWYoIWZvcmNlJiZDUC52aW49PT12aW4mJkNQLm9wdHMpcmV0dXJuOwogIENQLnZpbj12aW47Q1AubG9hZGluZz10cnVlO0NQLmVycj0iIjtyZW5kZXJDaGFyZ2VDYXJkKCk7CiAgdmFyIGQ9YXdhaXQgcG9zdCgiL2FwaS92ZWhpY2xlLWNvbnRyb2wtZXh0Iix7YWN0aW9uOiJvcHRpb25zIix1c2VySWQ6Uy5hY2MudXNlcklkLHZpbjp2aW59KTsKICBDUC5sb2FkaW5nPWZhbHNlOwogIGlmKGQmJkFycmF5LmlzQXJyYXkoZC5jaGFyZ2VQb3dlcikmJmQuY2hhcmdlUG93ZXIubGVuZ3RoKXtDUC5vcHRzPWQuY2hhcmdlUG93ZXJ9CiAgZWxzZXtDUC5vcHRzPW51bGw7Q1AuZXJyPShkJiZkLm1lc3NhZ2UpfHwi5a6Y5pa55qGj5L2N6K+75Y+W5aSx6LSlIn0KICByZW5kZXJDaGFyZ2VDYXJkKCk7Cn0KYXN5bmMgZnVuY3Rpb24gYXBwbHlDcCgpewogIGlmKCFTLmFjYylyZXR1cm47CiAgdmFyIHZpbj1jdXJWZWhWaW4oKTtpZighdmluKXt0b2FzdCgi5pyq6I635Y+W5Yiw6L2m6L6GIiwiZXJyIik7cmV0dXJufQogIGlmKCFDUC5zZWwpe3RvYXN0KCLor7flhYjpgInmi6nlhYXnlLXlip/njociLCJlcnIiKTtyZXR1cm59CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIpOwogIHZhciBkPWF3YWl0IHBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sLWV4dCIse2FjdGlvbjoiY2hhcmdlUG93ZXIiLHVzZXJJZDpTLmFjYy51c2VySWQsdmluOnZpbix2YWx1ZTpDUC5zZWx9KTsKICB0b2FzdCgoZCYmZC5tZXNzYWdlKXx8KGQmJmQub2s/IuaMh+S7pOW3suS4i+WPkSI6IuaMh+S7pOWksei0pSIpLGQmJmQub2s/Im9rIjoiZXJyIik7Cn0KCgoKZnVuY3Rpb24gbG9ja1RleHQodil7dmFyIGw9U3RyaW5nKCh2JiZ2LmxvY2tTdGF0ZSl8fCIiKS50cmltKCk7aWYoIWwpcmV0dXJuICIiO2lmKGw9PT0iMSIpcmV0dXJuICLlt7LlhbPplIEiO2lmKGw9PT0iMCIpcmV0dXJuICLmnKrlhbPplIEiO2lmKC/plIEvLnRlc3QobCkpcmV0dXJuIGw7cmV0dXJuICIifQpmdW5jdGlvbiBpc1ZlaExvY2tlZCh2KXt2YXIgbD1TdHJpbmcoKHYmJnYubG9ja1N0YXRlKXx8IiIpLnRyaW0oKTtpZighbClyZXR1cm4gZmFsc2U7aWYobD09PSIxIilyZXR1cm4gdHJ1ZTtpZihsPT09IjAiKXJldHVybiBmYWxzZTtpZigv5pyqfOW8gC8udGVzdChsKSlyZXR1cm4gZmFsc2U7cmV0dXJuIC/lhbN86ZSBLy50ZXN0KGwpfQpmdW5jdGlvbiBjdXNoaW9uVGV4dCh2KXt2YXIgYz1TdHJpbmcoKHYmJnYuY3VzaGlvblN0YXRlKXx8IiIpLnRyaW0oKTtpZighYylyZXR1cm4gIiI7aWYoYz09PSIxIilyZXR1cm4gIuWdkOWeq+W3suWFsyI7aWYoYz09PSIwIilyZXR1cm4gIuWdkOWeq+acquWFsyI7aWYoL1vplIHmnKrlvIDlkIjlhbNdLy50ZXN0KGMpKXJldHVybiAi5Z2Q5Z6rIitjO3JldHVybiAiIn0KZnVuY3Rpb24gZm10RHVyKG1pbil7bWluPU1hdGgubWF4KDAsTWF0aC5yb3VuZChOdW1iZXIobWluKXx8MCkpO3ZhciBoaD1NYXRoLmZsb29yKG1pbi82MCksbW09bWluJTYwO3JldHVybiBoaD4wPyhoaCsiaCIrKG1tP21tKyJtIjoiIikpOm1tKyJtIn0KdmFyIENBQ0hFX0tFWT0iemhfc2luZ2xlX2NhY2hlX3YzIjsKZnVuY3Rpb24gY2FjaGVTYXZlKCl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKENBQ0hFX0tFWSxKU09OLnN0cmluZ2lmeSh7dHM6RGF0ZS5ub3coKSxhY2M6Uy5hY2MsY2ZnOlMuY2ZnLGRhdGE6Uy5kYXRhLHJpZGU6Uy5yaWRlLHJpZGVEYXk6Uy5yaWRlRGF5LHZlcjpTLnZlcn0pKX1jYXRjaChlKXt9fQpmdW5jdGlvbiBjYWNoZUxvYWQoKXt0cnl7dmFyIGM9SlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShDQUNIRV9LRVkpfHwibnVsbCIpO2lmKCFjfHwhYy5kYXRhKXJldHVybiBmYWxzZTtpZihEYXRlLm5vdygpLU51bWJlcihjLnRzfHwwKT43Kjg2NDAwMDAwKXJldHVybiBmYWxzZTtTLmFjYz1jLmFjY3x8bnVsbDtTLmNmZz1jLmNmZ3x8bnVsbDtTLmRhdGE9Yy5kYXRhO1MucmlkZT1jLnJpZGV8fG51bGw7Uy5yaWRlRGF5PWMucmlkZURheXx8bnVsbDtTLnZlcj1jLnZlcnx8IiI7Uy5sYXN0PURhdGUubm93KCk7cmV0dXJuIHRydWV9Y2F0Y2goZSl7cmV0dXJuIGZhbHNlfX0KCgpmdW5jdGlvbiBkYXlzVW50aWwocyl7dmFyIHQ9U3RyaW5nKHN8fCIiKS50cmltKCk7aWYoIXQpcmV0dXJuIG51bGw7dmFyIHA9dC5yZXBsYWNlKC9bLlwvXS9nLCItIikuc3BsaXQoIi0iKTtpZihwLmxlbmd0aDwzKXJldHVybiBudWxsO3ZhciB5PU51bWJlcihwWzBdKSxtPU51bWJlcihwWzFdKSxkPU51bWJlcihwWzJdKTtpZigheXx8IW18fCFkKXJldHVybiBudWxsO3ZhciBlbmQ9bmV3IERhdGUoeSxtLTEsZCk7dmFyIG5vdz1uZXcgRGF0ZSgpO25vdy5zZXRIb3VycygwLDAsMCwwKTtyZXR1cm4gTWF0aC5yb3VuZCgoZW5kLmdldFRpbWUoKS1ub3cuZ2V0VGltZSgpKS84NjQwMDAwMCl9CgovKiA9PT09PSDmlbDmja7liqDovb0gPT09PT0gKi8KYXN5bmMgZnVuY3Rpb24gcmVmcmVzaEFsbChzaWxlbnQpewogICQoInN5bmNUeHQiKS50ZXh0Q29udGVudD0i5ZCM5q2l5Lit4oCmIjskKCJzeW5jRG90IikuY2xhc3NOYW1lPSJkb3QiOwogIGlmKCFTLmRhdGEmJmNhY2hlTG9hZCgpKXtyZW5kZXJIb21lKCk7cmVuZGVyU2lnbmluKCk7cmVuZGVyQ29udHJvbCgpO3JlbmRlclNldHRpbmdzKCk7cmVuZGVyR2VhcigpO30KICB2YXIgcj1hd2FpdCBQcm9taXNlLmFsbChbYXBpKCIvYXBpL2FjY291bnRzIiksYXBpKCIvYXBpL2NvbmZpZyIpLGFwaSgiL2FwaS9kYXRhIildKTsKICB2YXIgYWNjcz0oclswXSYmclswXS5hY2NvdW50cyl8fFtdO1MuYWNjPWFjY3NbMF18fG51bGw7Uy5jZmc9KHJbMV0mJnJbMV0uY29uZmlnKXx8bnVsbDsKICB2YXIgZD1yWzJdO3ZhciByb3c9KGQmJmQuYWNjb3VudHMmJmQuYWNjb3VudHNbMF0pfHxudWxsO1MuZGF0YT1yb3c7Uy52ZXI9KHJbMV0mJnJbMV0uc2NyaXB0VmVyc2lvbil8fCIiOwogIFMuZXJyPSFyWzBdPyLmnKzlnLDmnI3liqHml6Dlk43lupQiOighZD8i5pWw5o2u5o6l5Y+j5peg5ZON5bqU77yI572R57uc5oiWIFZQTiDlvbHlk43vvIkiOigocm93JiZyb3cuZXJyb3IpfHwiIikpOwogIFMucmlkZVRyYWNrcz17fTsKICBpZihyb3cmJnJvdy52ZWhpY2xlJiZyb3cudmVoaWNsZS5oYXNWZWhpY2xlKXsKICAgIHZhciB2PXJvdy52ZWhpY2xlOwogICAgUy5yaWRlPWF3YWl0IGFwaSgiL2FwaS9yaWRlLW1vbnRoP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChTLmFjYy51c2VySWQpKyImbW9udGg9Iittb25TdHIoKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2LnZpbk5vfHwiIikpOwogICAgUy5yaWRlRGF5PWF3YWl0IGZldGNoVG9kYXlSaWRlKHYpOwogICAgaWYoUy5yaWRlRGF5KXtpZighUy5yaWRlRGFpbHkpUy5yaWRlRGFpbHk9e307Uy5yaWRlRGFpbHlbdG9kYXlTdHIoKS5yZXBsYWNlKC8tL2csIi4iKV09Uy5yaWRlRGF5fQogICAgLy8g6IOO5Y6L5YG25Y+R57y65aSx77ya562JIDgwMG1zIOmHjeWPluS4gOasoe+8iOacjeWKoeerr+WxnuaAp+S4iuaKpeacieW7tui/n++8iQogICAgaWYoIShiYXJOdW0odi5mcm9udFByZXNzdXJlKT4wfHxiYXJOdW0odi5yZWFyUHJlc3N1cmUpPjApKXsKICAgICAgYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzKXtzZXRUaW1lb3V0KHJlcyw4MDApfSk7CiAgICAgIHZhciBkMj1hd2FpdCBhcGkoIi9hcGkvdmVoaWNsZT91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoUy5hY2MudXNlcklkKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2LnZpbk5vfHwiIikpOwogICAgICBpZihkMiYmZDIub2smJmQyLnJlc3VsdCkgUy5kYXRhPWQyLnJlc3VsdDsKICAgIH0KICAgIGNoZ1RyYWNrKChTLmRhdGEmJlMuZGF0YS52ZWhpY2xlKXx8dik7CiAgfQogIGlmKHJvdyYmcm93LnZlaGljbGUmJnJvdy52ZWhpY2xlLmhhc1ZlaGljbGUpY2hlY2tHZW9mZW5jZShyb3cudmVoaWNsZSk7CiAgUy5sYXN0PURhdGUubm93KCk7CiAgcmVuZGVySG9tZSgpO3JlbmRlclNpZ25pbigpO3JlbmRlckNvbnRyb2woKTtyZW5kZXJTZXR0aW5ncygpO3JlbmRlckdlYXIoKTsKICBjYWNoZVNhdmUoKTsKICAkKCJzeW5jVHh0IikudGV4dENvbnRlbnQ9KFMuYWNjPyLlt7LlkIzmraUgwrcgIituZXcgRGF0ZSgpLnRvVGltZVN0cmluZygpLnNsaWNlKDAsNSk6Iuivt+WFiOWvvOWFpSBUb2tlbiIpOwogICQoInN5bmNEb3QiKS5jbGFzc05hbWU9ImRvdCI7CiAgaWYoUy5lcnImJlMuYWNjKXRvYXN0KFMuZXJyLCJlcnIiKTsKICBlbHNlIGlmKCFzaWxlbnQpdG9hc3QoIuaVsOaNruW3suWIt+aWsCIsIm9rIik7Cn0KCi8qID09PT09IOmmlumhtSA9PT09PSAqLwpmdW5jdGlvbiByZW5kZXJIb21lKCl7CiAgdmFyIGVsPSQoImhvbWVIZXJvIik7CiAgZWwuY2xhc3NOYW1lPSJoZXJvIjsKICB2YXIgdj0oUy5kYXRhJiZTLmRhdGEudmVoaWNsZSl8fG51bGw7CiAgaWYoIVMuYWNjKXtlbC5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImVtcHR5Ij7ov5jmsqHmnInotKblj7c8YnI+PGJyPueCueWPs+S4iuinkum9v+i9riDihpIg6LSm5Y+35LiO5a+85YWlPGJyPuaKk+WMheaVmeeoiyAvIOaJi+acuuWPt+eZu+W9lSAvIOeymOi0tCBUb2tlbjwvZGl2Pic7fQogIGVsc2UgaWYoIXYpe2VsLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPicrKFMuZXJyP2VzYyhTLmVycik6Iui9pui+huaVsOaNruWKoOi9veWksei0pSIpKyc8YnI+PGJyPjxidXR0b24gY2xhc3M9Im1pbmktYnRuIiBvbmNsaWNrPSJyZWZyZXNoQWxsKCkiPumHjeaWsOWKoOi9vTwvYnV0dG9uPjwvZGl2Pic7fQogIGVsc2UgaWYoIXYuaGFzVmVoaWNsZSl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+6LSm5Y+3ICcrZXNjKFMuYWNjLnVzZXJOYW1lfHwiIikrJyDmnKrnu5HlrprovabovoY8L2Rpdj4nO30KICBlbHNlewogICAgdmFyIG9ubGluZT12Lm9ubGluZT09PSIxInx8di5vbmxpbmU9PT0iT05MSU5FInx8U3RyaW5nKHYub25saW5lfHwiIikuaW5kZXhPZigi5Zyo57q/Iik+PTA7CiAgICB2YXIgY2hhcmdpbmc9aXNDaGFyZ2luZyh2KSxjaT1jaGFyZ2luZz9jaGFyZ2VJbmZvKHYpOm51bGw7CiAgICBlbC5jbGFzc05hbWU9Imhlcm8iKyhjaGFyZ2luZz8iIGNoZy1oZXJvIjoiIik7CiAgICB2YXIgc29jPW51bSh2LmJhdHRlcnlQZXJjZW50LG51bGwpLHJhbmdlPW51bSh2LnJlc2lkdWFsUmFuZ2VLbSxudWxsKSx2b2x0PW51bSh2LnZvbHRhZ2UsbnVsbCk7CiAgICB2YXIgZnA9YmFyTnVtKHYuZnJvbnRQcmVzc3VyZSkscnA9YmFyTnVtKHYucmVhclByZXNzdXJlKSxmdD1iYXJOdW0odi5mcm9udFRlbXApLHJ0PWJhck51bSh2LnJlYXJUZW1wKTsKICAgIHZhciB2ZWhMaXN0PSh2LnZlaGljbGVzJiZBcnJheS5pc0FycmF5KHYudmVoaWNsZXMpKT92LnZlaGljbGVzOltdOwogICAgdmFyIGN1clZpbj12LmN1cnJlbnRWaW58fHYudmluTm98fCIiOwogICAgdmFyIGNoaXBzPXZlaExpc3QubGVuZ3RoPjE/JzxkaXYgY2xhc3M9InZlaC1yb3ciPicrdmVoTGlzdC5tYXAoZnVuY3Rpb24oeCl7CiAgICAgIHJldHVybiAnPHNwYW4gY2xhc3M9InZlaC1jaGlwICcrKHgudmluTm89PT1jdXJWaW4/J29uJzonJykrJyIgb25jbGljaz0ic3dpdGNoVmVoaWNsZShcJycrZXNjKHgudmluTm8pKydcJykiPicrZXNjKHgubmFtZXx8eC52aW5ObykrJzwvc3Bhbj4nOwogICAgfSkuam9pbigiIikrJzwvZGl2Pic6Jyc7CiAgICB2YXIgaW1nPXYudmVoaWNsZUltYWdlVXJsPyc8aW1nIHNyYz0iJytlc2Modi52ZWhpY2xlSW1hZ2VVcmwpKyciIGFsdD0iIj4nOic8c3ZnIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkJENEYyIiBzdHJva2Utd2lkdGg9IjMiPjxjaXJjbGUgY3g9IjE4IiBjeT0iNDYiIHI9IjkiLz48Y2lyY2xlIGN4PSI0NiIgY3k9IjQ2IiByPSI5Ii8+PHBhdGggZD0iTTE4IDQ2bDEwLTE4aDEybDYgMTgiLz48L3N2Zz4nOwogICAgdmFyIHN0YXR1c0NoaXBzPSc8c3BhbiBjbGFzcz0iaGNoaXAgJysob25saW5lPyJvayI6IiIpKyciPicrKG9ubGluZT8i4pePIOWcqOe6vyI6IuKXjyDnprvnur8iKSsnPC9zcGFuPicrCiAgICAgIChjaGFyZ2luZz8nPHNwYW4gY2xhc3M9ImhjaGlwIGNoZyI+4pqhIOWFheeUteS4rTwvc3Bhbj4nOicnKSsKICAgICAgKGN1c2hpb25UZXh0KHYpPyc8c3BhbiBjbGFzcz0iaGNoaXAiPicrZXNjKGN1c2hpb25UZXh0KHYpKSsnPC9zcGFuPic6JycpKwogICAgICAobG9ja1RleHQodik/JzxzcGFuIGNsYXNzPSJoY2hpcCI+Jytlc2MobG9ja1RleHQodikpKyc8L3NwYW4+JzonJykrCiAgICAgIChzb2MhPW51bGwmJnNvYzw9MjA/JzxzcGFuIGNsYXNzPSJoY2hpcCB3YXJuIj7kvY7nlLXph488L3NwYW4+JzonJyk7CiAgICB2YXIgdGlyZVJvdz0oZnAhPW51bGx8fHJwIT1udWxsKT8nPGRpdiBjbGFzcz0iaGVyby10aXJlcyI+JysKICAgICAgICAoZnAhPW51bGw/JzxzcGFuPuWJjSA8Yj4nK2ZwLnRvRml4ZWQoMSkrJzwvYj4gYmFyJysoZnQhPW51bGw/JzxlbT4nK2Z0KyfCsEM8L2VtPic6JycpKyc8L3NwYW4+JzonJykrCiAgICAgICAgKHJwIT1udWxsPyc8c3Bhbj7lkI4gPGI+JytycC50b0ZpeGVkKDEpKyc8L2I+IGJhcicrKHJ0IT1udWxsPyc8ZW0+JytydCsnwrBDPC9lbT4nOicnKSsnPC9zcGFuPic6JycpKwogICAgICAnPC9kaXY+JzonJzsKICAgIHZhciBsb2NUeHQ9U3RyaW5nKHYuYWRkcmVzc3x8IiIpLnRyaW0oKXx8IuaaguaXoOWumuS9jSI7CiAgICBlbC5pbm5lckhUTUw9KGNoYXJnaW5nPyc8c3BhbiBjbGFzcz0iY2hnLWNvcm5lciB0bCI+PC9zcGFuPjxzcGFuIGNsYXNzPSJjaGctY29ybmVyIGJyIj48L3NwYW4+JzonJykrY2hpcHMrCiAgICAgICc8ZGl2IGNsYXNzPSJoZXJvLWhlYWQiPjxkaXYgc3R5bGU9Im1pbi13aWR0aDowIj48ZGl2IGNsYXNzPSJoZXJvLW5hbWUiPicrZXNjKHYudmVoaWNsZU5hbWV8fHYudmVoaWNsZU1vZGVsfHwi5oiR55qE6L2m6L6GIikrJzwvZGl2PicrKHYudmVoaWNsZU1vZGVsPyc8ZGl2IGNsYXNzPSJoZXJvLXN1YiI+Jytlc2Modi52ZWhpY2xlTW9kZWwpKyc8L2Rpdj4nOicnKSsnPC9kaXY+PGRpdiBjbGFzcz0iaGVyby1jaGlwcyI+JytzdGF0dXNDaGlwcysnPC9kaXY+PC9kaXY+JysKICAgICAgJzxkaXYgY2xhc3M9Imhlcm8tdmVoaWNsZSI+JytpbWcrJzwvZGl2PicrCiAgICAgIHRpcmVSb3crCiAgICAgICc8ZGl2IGNsYXNzPSJoZXJvLXNvYy1saW5lIj48YiBjbGFzcz0ibnVtIj4nKyhzb2MhPW51bGw/c29jOictLScpKyc8c21hbGw+JTwvc21hbGw+PC9iPicrCiAgICAgICAgKHJhbmdlIT1udWxsPyc8c3BhbiBjbGFzcz0iaGVyby1yYW5nZSI+JytyYW5nZSsnPHNtYWxsPmttPC9zbWFsbD48L3NwYW4+JzonJykrCiAgICAgICAgKHZvbHQhPW51bGw/JzxzcGFuIGNsYXNzPSJoZXJvLXZvbHQtaW5saW5lIj4nK3ZvbHQrJzxzbWFsbD5WPC9zbWFsbD48L3NwYW4+JzonJykrJzwvZGl2PicrCiAgICAgICc8ZGl2IGNsYXNzPSJzb2MtYmFyIj48ZGl2IGNsYXNzPSJzb2MtZmlsbCcrKGNoYXJnaW5nPycgY2hnJzonJykrJyIgc3R5bGU9IndpZHRoOicrTWF0aC5tYXgoMCxNYXRoLm1pbigxMDAsc29jfHwwKSkrJyUiPjwvZGl2PjwvZGl2PicrCiAgICAgIChjaT8nPGRpdiBjbGFzcz0iaGVyby1jaGciPicrCiAgICAgICAgJzxkaXYgY2xhc3M9ImNoZy10Ij48aT48L2k+Q0hBUkdJTkc8c3BhbiBjbGFzcz0iY24iPuWFheeUteS4rTwvc3Bhbj48L2Rpdj4nKwogICAgICAgICc8ZGl2IGNsYXNzPSJjaGctcG93ZXIiPicrKGNpLnBvd2VyPjA/Y2kucG93ZXI6Ii0tIikrJzxzbWFsbD5XPC9zbWFsbD48L2Rpdj4nKwogICAgICAgICc8ZGl2IGNsYXNzPSJjaGctcmlnaHQiPjxkaXYgY2xhc3M9ImNoZy1yZW1haW4iPuWJqeS9mSAnK2ZtdE1pblNlYyhjaS5yZW1haW4pKyc8L2Rpdj48ZGl2IGNsYXNzPSJjaGctc3ViIj4nKyhjaS5vZmZpY2lhbD8i5a6Y5pa56aKE6K6hIjoi5Lyw566XIikrJzwvZGl2PjwvZGl2PicrCiAgICAgICc8L2Rpdj4nOicnKSsKICAgICAgJzxkaXYgY2xhc3M9Imhlcm8tbG9jIiBvbmNsaWNrPSJvcGVuVmVoTWFwKCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMjFzNy02LjEgNy0xMWE3IDcgMCAxIDAtMTQgMGMwIDQuOSA3IDExIDcgMTF6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMi40Ii8+PC9zdmc+PHNwYW4gY2xhc3M9ImFkZHIiPicrZXNjKGxvY1R4dCkrJzwvc3Bhbj48L2Rpdj4nOwogIH0KICAvLyDlv6vmjbfmk43kvZwKICB2YXIgaGM9JCgiaG9tZUN0cmwiKTsKICB2YXIgbG9ja2VkTm93PWlzVmVoTG9ja2VkKHZ8fHt9KTsKICB2YXIgbG9ja0J0bj1sb2NrZWROb3c/CiAgICAnPGRpdiBjbGFzcz0icWEgdW5sb2NrIiBkYXRhLWFjdD0idW5sb2NrIiBvbmNsaWNrPSJjdHJsKHRoaXMuZGF0YXNldC5hY3QpIj48ZGl2IGNsYXNzPSJpYyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjUiIHk9IjExIiB3aWR0aD0iMTQiIGhlaWdodD0iMTAiIHJ4PSIyIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgNy42LTEuNyIvPjwvc3ZnPjwvZGl2PjxzcGFuPuW8gOmUgTwvc3Bhbj48L2Rpdj4nOgogICAgJzxkaXYgY2xhc3M9InFhIGxvY2siIGRhdGEtYWN0PSJsb2NrIiBvbmNsaWNrPSJjdHJsKHRoaXMuZGF0YXNldC5hY3QpIj48ZGl2IGNsYXNzPSJpYyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjUiIHk9IjExIiB3aWR0aD0iMTQiIGhlaWdodD0iMTAiIHJ4PSIyIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz48L2Rpdj48c3Bhbj7lhbPplIE8L3NwYW4+PC9kaXY+JzsKICBoYy5pbm5lckhUTUw9JzxkaXYgY2xhc3M9InFhLWdyaWQiPicrCiAgICAnPGRpdiBjbGFzcz0icWEiIGRhdGEtYWN0PSJmaW5kIiBvbmNsaWNrPSJjdHJsKHRoaXMuZGF0YXNldC5hY3QpIj48ZGl2IGNsYXNzPSJpYyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjExIiBjeT0iMTEiIHI9IjciLz48cGF0aCBkPSJNMjEgMjFsLTQuMy00LjMiLz48L3N2Zz48L2Rpdj48c3Bhbj7lr7vovaY8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJxYSIgZGF0YS1hY3Q9ImxvdWRGaW5kIiBvbmNsaWNrPSJjdHJsKHRoaXMuZGF0YXNldC5hY3QpIj48ZGl2IGNsYXNzPSJpYyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0zIDEwdjRoNGw1IDRWNmwtNSA0SDN6Ii8+PHBhdGggZD0iTTE2IDlhNCA0IDAgMCAxIDAgNiIvPjwvc3ZnPjwvZGl2PjxzcGFuPum4o+esmzwvc3Bhbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9InFhIiBkYXRhLWFjdD0iY3VzaGlvbiIgb25jbGljaz0iY3RybCh0aGlzLmRhdGFzZXQuYWN0KSI+PGRpdiBjbGFzcz0iaWMiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cmVjdCB4PSI0IiB5PSIxMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjgiIHJ4PSIyIi8+PHBhdGggZD0iTTYgMTBWN2E2IDYgMCAwIDEgMTIgMHYzIi8+PC9zdmc+PC9kaXY+PHNwYW4+5Z2Q5Z6rPC9zcGFuPjwvZGl2PicrCiAgICBsb2NrQnRuKwogICAgJzwvZGl2Pic7CiAgLy8g5YWF55S157uf6K6hCiAgdmFyIGhjcz0kKCJob21lQ2hhcmdlU3RhdHMiKTsKICBpZihoY3MpewogICAgaWYoIXZ8fCF2Lmhhc1ZlaGljbGUpe2hjcy5zdHlsZS5kaXNwbGF5PSdub25lJ30KICAgIGVsc2V7CiAgICAgIHZhciBjQ250PU51bWJlcih2LmNoYXJnZUNvdW50KXx8MCxjS3doPU51bWJlcih2LnBvd2VyQ2hhcmdlTW9udGgpfHwwLGNVc2U9TnVtYmVyKHYucG93ZXJVc2VNb250aCl8fDAsY1ByaWNlPU51bWJlcigoUy5jZmcmJlMuY2ZnLmNoYXJnZVByaWNlKXx8MCk7CiAgICAgIHZhciBsb2M9Y2hnTW9udGhTdW0oU3RyaW5nKHYuY3VycmVudFZpbnx8di52aW5Ob3x8IiIpKTsKICAgICAgdmFyIGxvY2FsVXNlZD1mYWxzZTsKICAgICAgaWYoIShjS3doPjApJiZsb2Mua3doPjApe2NLd2g9bG9jLmt3aDtsb2NhbFVzZWQ9dHJ1ZX0KICAgICAgaWYoIShjQ250PjApJiZsb2MuY250PjApY0NudD1sb2MuY250OwogICAgICB2YXIga3doVHh0PWNLd2g+MD9jS3doLnRvRml4ZWQoMSkrJzxzbWFsbD5rV2g8L3NtYWxsPic6Jy0tJzsKICAgICAgdmFyIHVzZVR4dD1jVXNlPjA/Y1VzZS50b0ZpeGVkKDEpKyc8c21hbGw+a1doPC9zbWFsbD4nOictLSc7CiAgICAgIHZhciBmZWVUeHQ9KGNQcmljZT4wJiZjS3doPjApPyfCpScrKGNLd2gqY1ByaWNlKS50b0ZpeGVkKDIpOictLSc7CiAgICAgIHZhciBjaGdIaW50PWxvY2FsVXNlZD8oJzxkaXYgY2xhc3M9ImhpbnQiPuaMiemdouadv+iusOW9leeahOWFheeUtei/h+eoi+S8sOeul++8iCcrKGxvYy5kZWY/J+m7mOiupCAzMEFoLzcyVic6J+eUteaxoOWuuemHjyDDlyDnlLXph4/lop7luYUnKSsn77yJ77yb5Y+v5Zyo6K6+572uIOKGkiDlhYXnlLXkuI7nlLXmsaDloavlhpnlrp7pmYXlrrnph48nKyhjUHJpY2U+MD8n5LiO55S15Lu3JzonJykrJ+OAgjwvZGl2PicpOicnOwogICAgICB2YXIgbWFuPWNoZ01hbk1vbnRoKFN0cmluZyh2LmN1cnJlbnRWaW58fHYudmluTm98fCIiKSk7CiAgICAgIGhjcy5pbm5lckhUTUw9JzxkaXYgY2xhc3M9ImNhcmQtaGVhZCI+PGgzPjxpIGNsYXNzPSJncmVlbiI+PC9pPuWFheeUtee7n+iuoTwvaDM+PC9kaXY+JysKICAgICAgICAnPGRpdiBjbGFzcz0iY2hhcmdlLWdyaWQiPicrCiAgICAgICAgICAnPGRpdiBjbGFzcz0iY2hnLXN0YXQiPjxiIGNsYXNzPSJudW0iPicrY0NudCsnPC9iPjxzcGFuPuacrOaciOasoeaVsDwvc3Bhbj48L2Rpdj4nKwogICAgICAgICAgJzxkaXYgY2xhc3M9ImNoZy1zdGF0Ij48YiBjbGFzcz0ibnVtIj4nK2t3aFR4dCsnPC9iPjxzcGFuPuWFheWFpeeUtemHjzwvc3Bhbj48L2Rpdj4nKwogICAgICAgICAgJzxkaXYgY2xhc3M9ImNoZy1zdGF0Ij48YiBjbGFzcz0ibnVtIj4nK3VzZVR4dCsnPC9iPjxzcGFuPueUqOeUtemHjzwvc3Bhbj48L2Rpdj4nKwogICAgICAgICAgJzxkaXYgY2xhc3M9ImNoZy1zdGF0Ij48YiBjbGFzcz0ibnVtIj4nK2ZlZVR4dCsnPC9iPjxzcGFuPuS8sOeul+eUtei0uTwvc3Bhbj48L2Rpdj4nKwogICAgICAgICc8L2Rpdj4nK2NoZ0hpbnQrCiAgICAgICAgJzxkaXYgY2xhc3M9Imxpbmstcm93IiBvbmNsaWNrPSJvcGVuQ2hnTWFuKCkiPjxzcGFuPuaJi+WKqOWFheeUteiusOW9lTwvc3Bhbj48c3BhbiBjbGFzcz0iciI+JysobWFuLmNudD8obWFuLmNudCsnIOeslCDCtyDCpScrbWFuLmNvc3QudG9GaXhlZCgyKSsnIOKAuicpOifmjInlrp7pmYXotKbljZXorrDkuIDnrJQg4oC6JykrJzwvc3Bhbj48L2Rpdj4nOwogICAgICBoY3Muc3R5bGUuZGlzcGxheT0nJzsKICAgIH0KICB9CiAgLy8g5pyA6L+R6aqR6KGM77yINyDlpKnmn7Hnirblm77lj6/ngrnpgInmn6XnnIvlvZPml6XvvIkKICB2YXIgcmQ9Uy5yaWRlJiZTLnJpZGUub2s/Uy5yaWRlLmRhdGF8fHt9Ont9OwogIHZhciBsaXN0PUFycmF5LmlzQXJyYXkocmQucmlkZVJlY29yZExpc3QpP3JkLnJpZGVSZWNvcmRMaXN0OltdOwogIHZhciB0b2RheURvdD10b2RheVN0cigpLnJlcGxhY2UoLy0vZywiLiIpOwogIHZhciBjYWxjPVMucmlkZURheXx8bnVsbDsKICBpZihjYWxjKXtpZighUy5yaWRlRGFpbHkpUy5yaWRlRGFpbHk9e307aWYoIVMucmlkZURhaWx5W3RvZGF5RG90XSlTLnJpZGVEYWlseVt0b2RheURvdF09Y2FsY30KICB2YXIgdG09cmlkZURheVN0YXRzKHRvZGF5RG90KTsKICB2YXIgYnlEYXRlPXt9OwogIGxpc3QuZm9yRWFjaChmdW5jdGlvbih4KXtieURhdGVbU3RyaW5nKCh4JiZ4LmRhdGUpfHwiIikucmVwbGFjZSgvLS9nLCIuIildPU51bWJlcih4JiZ4LnJpZGVNaWxlYWdlKXx8MH0pOwogIHZhciBkYXlzNz1bXTsKICBmb3IodmFyIGk9NjtpPj0wO2ktLSl7CiAgICB2YXIgZD1uZXcgRGF0ZSgpO2Quc2V0RGF0ZShkLmdldERhdGUoKS1pKTsKICAgIHZhciBkcz1kLmdldEZ1bGxZZWFyKCkrIi4iK1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKTsKICAgIGRheXM3LnB1c2goe2RvdDpkcyxsYjpTdHJpbmcoZC5nZXREYXRlKCkpLGttOmJ5RGF0ZVtkc118fDB9KTsKICB9CiAgdmFyIG1heEttPTE7ZGF5czcuZm9yRWFjaChmdW5jdGlvbih4KXtpZih4LmttPm1heEttKW1heEttPXgua219KTsKICB2YXIgc2VsPVMucmlkZVNlbHx8dG9kYXlEb3Q7CiAgdmFyIGJhcnM9ZGF5czcubWFwKGZ1bmN0aW9uKHgpe3JldHVybiAnPGRpdiBjbGFzcz0icmInKyh4LmRvdD09PXNlbD8nIG9uJzonJykrJyIgZGF0YS1kPSInK3guZG90KyciIG9uY2xpY2s9InBpY2tSaWRlRGF5KHRoaXMuZGF0YXNldC5kKSI+PGRpdiBjbGFzcz0iYmFyIiBzdHlsZT0iaGVpZ2h0OicrTWF0aC5tYXgoNSxNYXRoLnJvdW5kKCh4LmttL21heEttKSoxMDApKSsnJSI+PC9kaXY+PGRpdiBjbGFzcz0ibGIiPicreC5sYisnPC9kaXY+PC9kaXY+J30pLmpvaW4oIiIpOwogIHZhciBtb250aEttPTAsbW9udGhNaW49MDsKICBsaXN0LmZvckVhY2goZnVuY3Rpb24oeCl7bW9udGhLbSs9TnVtYmVyKHgmJngucmlkZU1pbGVhZ2UpfHwwO21vbnRoTWluKz1OdW1iZXIoeCYmeC5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZSl8fDB9KTsKICBtb250aEttPU1hdGgucm91bmQobW9udGhLbSoxMCkvMTA7CiAgdmFyIGF2Zz1tb250aE1pbj4wP21vbnRoS20vKG1vbnRoTWluLzYwKTowOwogIHZhciBkbT1yaWRlRGF5U3RhdHMoc2VsKTsKICB2YXIgc2VsTG9hZGluZz1yaWRlRGF5TG9hZGluZyhzZWwpOwogICQoImhvbWVSaWRlIikuaW5uZXJIVE1MPQogICAgJzxkaXYgY2xhc3M9ImNhcmQtaGVhZCI+PGgzPjxpIGNsYXNzPSJ2aW8iPjwvaT7mnIDov5HpqpHooYw8L2gzPjxidXR0b24gY2xhc3M9Im1pbmktYnRuIiBvbmNsaWNrPSJvcGVuTW9udGhseSgpIj7mnIjmiqU8L2J1dHRvbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9InJpZGUtdG9wIj4nKwogICAgICAnPGRpdiBjbGFzcz0icmlkZS1jZWxsIj48YiBjbGFzcz0ibnVtIj4nKyh0bS5taWxlIT1udWxsP3RtLm1pbGU6Jy0tJykrJzxzbWFsbD5rbTwvc21hbGw+PC9iPjxzcGFuPuS7iuaXpScrKHRtLm1pbj4wPyIgwrcgIitmbXREdXIodG0ubWluKToiIikrJzwvc3Bhbj48L2Rpdj4nKwogICAgICAnPGRpdiBjbGFzcz0icmlkZS1jZWxsIj48YiBjbGFzcz0ibnVtIj4nKyhtb250aEttPjA/bW9udGhLbS50b0ZpeGVkKDEpOictLScpKyc8c21hbGw+a208L3NtYWxsPjwvYj48c3Bhbj7mnKzmnIgnKyhtb250aE1pbj4wPyIgwrcgIitmbXREdXIobW9udGhNaW4pKyhhdmc+MD8iIMK3IOWdh+mAnyAiK2F2Zy50b0ZpeGVkKDApOiIiKToiIikrJzwvc3Bhbj48L2Rpdj4nKwogICAgJzwvZGl2PicrCiAgICAobGlzdC5sZW5ndGg/JzxkaXYgY2xhc3M9InJpZGUtYmFycyI+JytiYXJzKyc8L2Rpdj4nOicnKSsKICAgICc8ZGl2IGNsYXNzPSJyaWRlLWRheSI+JysKICAgICAgJzxkaXYgY2xhc3M9InJpZGUtZGF5LWhlYWQiPjxzcGFuPicrZXNjKGZtdERvdChzZWwpKSsnIOmqkeihjDwvc3Bhbj48ZW0+Jysoc2VsTG9hZGluZz8n6K+75Y+W6L2o6L+55Lit4oCmJzooZG0uY2FsYz8n6L2o6L+56Ieq5Yqo6K6h566XJzooc2VsPT09dG9kYXlEb3Q/J+S7iuaXpSc6J+WumOaWueiusOW9lScpKSkrJzwvZW0+PHNwYW4gY2xhc3M9InJwLW9wZW4iIGRhdGEtZD0iJytzZWwrJyIgb25jbGljaz0ib3BlblJlcGxheSh0aGlzLmRhdGFzZXQuZCkiPuWbnuaUviDigLo8L3NwYW4+PC9kaXY+JysKICAgICAgJzxkaXYgY2xhc3M9InJpZGUtZGF5LWdyaWQiPicrCiAgICAgICAgcmRnKGRtLm1pbGUsJ2ttJywn6YeM56iLJykrcmRnKGRtLm1pbj4wP2RtLm1pbjpudWxsLCdtaW4nLCfml7bplb8nKStyZGcoZG0ubXgsJ2ttL2gnLCfmnoHpgJ8nKSsKICAgICAgICByZGcoZG0uYmVuZCwn5qyhJywn5Y6L5byvJykrcmRnKGRtLmFjYywn5qyhJywn5oCl5Yqg6YCfJykrcmRnKGRtLmJyaywn5qyhJywn5oCl5Yi5JykrCiAgICAgICc8L2Rpdj4nKwogICAgJzwvZGl2Pic7CiAgYXBwbHlIb21lTW9kdWxlcygpOwogIC8vIOacjeWKoeWIsOacn+aPkOmGku+8iOavj+WkqeS4gOasoe+8iQogIGlmKHYmJnYuaGFzVmVoaWNsZSl7CiAgICB2YXIgX3NkPWRheXNVbnRpbCh2LnNlcnZpY2VFbmREYXRlKTsKICAgIGlmKF9zZCE9bnVsbCYmX3NkPj0wJiZfc2Q8PTMwKXsKICAgICAgdHJ5e3ZhciBfc2s9InpoX3N2Y19yZW1pbmRfIit0b2RheVN0cigpO2lmKCFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShfc2spKXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbShfc2ssIjEiKTtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dG9hc3QoIuacjeWKoeWwhuS6jiAiK19zZCsiIOWkqeWQjuWIsOacn++8iCIrdi5zZXJ2aWNlRW5kRGF0ZSsi77yJIiwiaW5mbyIpfSw5MDApfX1jYXRjaChlKXt9CiAgICB9CiAgfQp9CgoKLyogPT09PT0g562+5Yiw6aG1ID09PT09ICovCmZ1bmN0aW9uIHJlbmRlclNpZ25pbigpewogIHZhciBlbD0kKCJzaWduSGVybyIpOwogIGlmKCFTLmFjYyl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+6L+Y5rKh5pyJ6LSm5Y+3PGJyPjxicj48YnV0dG9uIGNsYXNzPSJtaW5pLWJ0biIgb25jbGljaz0ib3BlbkdlYXIoXCdhY2NvdW50XCcpIj7ljrvlr7zlhaXotKblj7c8L2J1dHRvbj48L2Rpdj4nOyQoInNpZ25UYXNrcyIpLmlubmVySFRNTD0iIjtyZXR1cm59CiAgaWYoIVMuZGF0YSl7ZWwuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSI+JysoUy5lcnI/ZXNjKFMuZXJyKToi5pqC5peg6LSm5Y+35pWw5o2uIikrJzxicj48YnI+PGJ1dHRvbiBjbGFzcz0ibWluaS1idG4iIG9uY2xpY2s9InJlZnJlc2hBbGwoKSI+6YeN5paw5Yqg6L29PC9idXR0b24+PC9kaXY+JzskKCJzaWduVGFza3MiKS5pbm5lckhUTUw9IiI7cmV0dXJufQogIHZhciBzaWduZWQ9ISFTLmRhdGEuc2lnbmVkVG9kYXksc2NvcmU9bnVtKFMuZGF0YS50b2RheVNjb3JlKSxjb250PW51bShTLmRhdGEuY29udGludWVEYXlzKSx0b3RhbD1udW0oUy5kYXRhLnNjb3JlKSxzYz1udW0oUy5kYXRhLnNpZ25Db3VudCl8fGNvbnQ7CiAgZWwuaW5uZXJIVE1MPSc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS10eHQzKTtmb250LXdlaWdodDo3MDA7bGV0dGVyLXNwYWNpbmc6MXB4Ij7ku4rml6Xojrflvpfnp6/liIY8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Im51bSIgc3R5bGU9ImZvbnQtc2l6ZTo0OHB4O2ZvbnQtd2VpZ2h0OjkwMDtsaW5lLWhlaWdodDoxLjE1O2NvbG9yOnZhcigtLWJyYW5kKSI+Jysoc2lnbmVkPyIrIitzY29yZToiLS0iKSsnPC9kaXY+JysKICAgICc8ZGl2IHN0eWxlPSJmb250LXNpemU6MTJweDtjb2xvcjonKyhzaWduZWQ/InZhcigtLW9rKSI6InZhcigtLXdhcm4pIikrJztmb250LXdlaWdodDo4MDAiPicrKHNpZ25lZD8i4pyTIOS7iuaXpeW3suetvuWIsCI6IuWwmuacquetvuWIsCIpKyc8L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Imhlcm8tZ3JpZCIgc3R5bGU9Im1hcmdpbi10b3A6MTZweCI+JysKICAgICc8ZGl2IGNsYXNzPSJoZyI+PGRpdiBjbGFzcz0idiBudW0iPicrY29udCsnPHNtYWxsPuWkqTwvc21hbGw+PC9kaXY+PGRpdiBjbGFzcz0ibCI+6L+e57ut562+5YiwPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoZyI+PGRpdiBjbGFzcz0idiBudW0iPicrKFMuZGF0YS5zY29yZU9rPT09ZmFsc2U/Ii0tIjp0b3RhbCkrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPuaAu+enr+WIhjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGciPjxkaXYgY2xhc3M9InYgbnVtIj4nK3NjKyc8c21hbGw+LzMwPC9zbWFsbD48L2Rpdj48ZGl2IGNsYXNzPSJsIj7nm7Lnm5Lov5vluqY8L2Rpdj48L2Rpdj48L2Rpdj4nKwogICAgJzxidXR0b24gY2xhc3M9ImJ0bi1tYWluIiBpZD0ic2lnbkJ0biIgb25jbGljaz0iZG9TaWduaW4oKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNCI+PHBhdGggZD0iTTkgMTFsMyAzTDIyIDQiLz48cGF0aCBkPSJNMjEgMTJ2N2EyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoMTEiLz48L3N2Zz7kuIDplK7nrb7liLDvvIjnrb7liLAgKyDnm7Lnm5IgKyDkupLliqjvvIk8L2J1dHRvbj4nKwogICAgJzxkaXYgY2xhc3M9ImhpbnQiIHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlciI+562+5YiwICsg55uy55uSICsg5Y+R5biWIC8g54K56LWeIC8g5YiG5LqrIC8g6K+E6K6677yM5LiA5qyh5omn6KGM5a6M5oiQPC9kaXY+JzsKICAvLyDku7vliqHnu5PmnpwKICB2YXIgdD0kKCJzaWduVGFza3MiKTt2YXIgcj1TLnNpZ25SZXN1bHQ7CiAgaWYoIXIpe3QuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjYXJkLWhlYWQiPjxoMz48aSBjbGFzcz0iZ3JlZW4iPjwvaT7ku4rml6Xku7vliqE8L2gzPjwvZGl2PjxkaXYgY2xhc3M9ImVtcHR5Ij7ngrnjgIzkuIDplK7nrb7liLDjgI3mn6XnnIvmiafooYznu5Pmnpw8L2Rpdj4nO3JldHVybn0KICB0LmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2FyZC1oZWFkIj48aDM+PGkgY2xhc3M9ImdyZWVuIj48L2k+562+5Yiw57uT5p6cPC9oMz48c3BhbiBzdHlsZT0iZm9udC1zaXplOjEwcHg7Y29sb3I6Jysoci5zdWNjZXNzPyJ2YXIoLS1vaykiOiJ2YXIoLS1lcnIpIikrJyI+Jysoci5zdWNjZXNzPyLmiJDlip8gIityLnRvdGFsR2FpbisiIOWIhiI6IuWksei0pSIpKyc8L3NwYW4+PC9kaXY+JysKICAgIChyLnN0ZXBzfHxbXSkubWFwKGZ1bmN0aW9uKHMpe3JldHVybiAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayIgc3R5bGU9ImZsZXg6MTtjb2xvcjp2YXIoLS10eHQyKSI+Jytlc2MocykrJzwvc3Bhbj48L2Rpdj4nfSkuam9pbigiIik7Cn0KCi8qID09PT09IOi9puaOp+mhtSA9PT09PSAqLwpmdW5jdGlvbiByZW5kZXJDb250cm9sKCl7CiAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTsKICB2YXIgb25saW5lPXYub25saW5lPT09IjEifHx2Lm9ubGluZT09PSJPTkxJTkUifHxTdHJpbmcodi5vbmxpbmV8fCIiKS5pbmRleE9mKCLlnKjnur8iKT49MDsKICB2YXIgZnBDPWJhck51bSh2LmZyb250UHJlc3N1cmUpLHJwQz1iYXJOdW0odi5yZWFyUHJlc3N1cmUpOwogIHZhciB0aXJlQ2VsbHM9IiI7CiAgaWYoZnBDIT1udWxsJiZmcEM+MCkgdGlyZUNlbGxzKz0nPGRpdiBjbGFzcz0ic3RjIj48ZGl2IGNsYXNzPSJ2IG51bSI+JytmcEMrJzxzbWFsbD5iYXI8L3NtYWxsPjwvZGl2PjxkaXYgY2xhc3M9ImwiPuWJjeiDjuWOizwvZGl2PjwvZGl2Pic7CiAgaWYocnBDIT1udWxsJiZycEM+MCkgdGlyZUNlbGxzKz0nPGRpdiBjbGFzcz0ic3RjIj48ZGl2IGNsYXNzPSJ2IG51bSI+JytycEMrJzxzbWFsbD5iYXI8L3NtYWxsPjwvZGl2PjxkaXYgY2xhc3M9ImwiPuWQjuiDjuWOizwvZGl2PjwvZGl2Pic7CiAgJCgiY3RybFN0YXR1cyIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2FyZC1oZWFkIj48aDM+PGk+PC9pPui9pui+hueKtuaAgTwvaDM+PGJ1dHRvbiBjbGFzcz0ibWluaS1idG4iIG9uY2xpY2s9InJlZnJlc2hBbGwoKSI+5Yi35pawPC9idXR0b24+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJzdC1ncmlkIj4nKwogICAgJzxkaXYgY2xhc3M9InN0YyI+PGRpdiBjbGFzcz0idiBudW0iIHN0eWxlPSJjb2xvcjp2YXIoLS1vaykiPicrKG51bSh2LmJhdHRlcnlQZXJjZW50LG51bGwpIT1udWxsP251bSh2LmJhdHRlcnlQZXJjZW50KToiLS0iKSsnPHNtYWxsPiU8L3NtYWxsPjwvZGl2PjxkaXYgY2xhc3M9ImwiPueUtemHjzwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ic3RjIj48ZGl2IGNsYXNzPSJ2IG51bSI+JysobnVtKHYucmVzaWR1YWxSYW5nZUttLG51bGwpIT1udWxsP251bSh2LnJlc2lkdWFsUmFuZ2VLbSk6Ii0tIikrJzxzbWFsbD5rbTwvc21hbGw+PC9kaXY+PGRpdiBjbGFzcz0ibCI+57ut6IiqPC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJzdGMiPjxkaXYgY2xhc3M9InYgbnVtIj4nKyhudW0odi52b2x0YWdlLG51bGwpIT1udWxsP251bSh2LnZvbHRhZ2UpOiItLSIpKyc8c21hbGw+Vjwvc21hbGw+PC9kaXY+PGRpdiBjbGFzcz0ibCI+55S15Y6LPC9kaXY+PC9kaXY+JysKICAgIHRpcmVDZWxscysKICAgICc8ZGl2IGNsYXNzPSJzdGMiPjxkaXYgY2xhc3M9InYgbnVtIiBzdHlsZT0iZm9udC1zaXplOjEzcHg7Y29sb3I6Jysob25saW5lPyJ2YXIoLS1vaykiOiJ2YXIoLS10eHQzKSIpKyciPicrKG9ubGluZT8i5Zyo57q/Ijoi56a757q/IikrJzwvZGl2PjxkaXYgY2xhc3M9ImwiPueKtuaAgTwvZGl2PjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0icm93IiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiIG9uY2xpY2s9Im9wZW5WZWhNYXAoKSI+PHNwYW4gY2xhc3M9ImsiPvCfk40g6L2m6L6G5L2N572uPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nK2VzYyhsb2NUZXh0KHYpKSsoaGFzQ29vcmQodik/JyA8c3BhbiBzdHlsZT0iY29sb3I6dmFyKC0tYnJhbmQpIj7lnLDlm74g4oC6PC9zcGFuPic6JycpKyc8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7mnIDlkI7kuIrmiqU8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjp2YXIoLS10eHQzKSI+Jytlc2Modi5sb2NhdGlvblRpbWV8fCItLSIpKyc8L3NwYW4+PC9kaXY+JzsKICAkKCJjdHJsQnRucyIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2FyZC1oZWFkIj48aDM+PGkgY2xhc3M9InZpbyI+PC9pPui9pui+huaOp+WItjwvaDM+PC9kaXY+PGRpdiBjbGFzcz0iYmlnLWN0cmwiPicrCiAgICAnPGRpdiBjbGFzcz0iYmMiIG9uY2xpY2s9ImN0cmwoXCdmaW5kXCcpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTEiIGN5PSIxMSIgcj0iNyIvPjxwYXRoIGQ9Ik0yMSAyMWwtNC4zLTQuMyIvPjwvc3ZnPjxkaXY+PGI+5a+76L2mPC9iPjxzcGFuPuefreaMiemXqueBrzwvc3Bhbj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImJjIiBvbmNsaWNrPSJjdHJsKFwnbG91ZEZpbmRcJykiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMyAxMHY0aDRsNSA0VjZsLTUgNEgzeiIvPjxwYXRoIGQ9Ik0xNiA5YTQgNCAwIDAgMSAwIDYiLz48L3N2Zz48ZGl2PjxiPum4o+esmzwvYj48c3Bhbj7puKPnrJvpl6rnga88L3NwYW4+PC9kaXY+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJiYyIgb25jbGljaz0iY3RybChcJ2N1c2hpb25cJykiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cmVjdCB4PSI0IiB5PSIxMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjgiIHJ4PSIyIi8+PHBhdGggZD0iTTYgMTBWN2E2IDYgMCAwIDEgMTIgMHYzIi8+PC9zdmc+PGRpdj48Yj7miZPlvIDlnZDlnqs8L2I+PHNwYW4+5YKo54mp566xPC9zcGFuPjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iYmMgdW5sb2NrIiBvbmNsaWNrPSJjdHJsKFwndW5sb2NrXCcpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iNSIgeT0iMTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxMCIgcng9IjIiLz48cGF0aCBkPSJNOCAxMVY3YTQgNCAwIDAgMSA3LjYtMS43Ii8+PC9zdmc+PGRpdj48Yj7lvIDplIE8L2I+PHNwYW4+5LqR56uv5LiL5Y+RPC9zcGFuPjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iYmMgbG9jayB3aWRlIiBvbmNsaWNrPSJjdHJsKFwnbG9ja1wnKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjUiIHk9IjExIiB3aWR0aD0iMTQiIGhlaWdodD0iMTAiIHJ4PSIyIi8+PHBhdGggZD0iTTggMTFWN2E0IDQgMCAwIDEgOCAwdjQiLz48L3N2Zz48ZGl2PjxiPuWFs+mUgTwvYj48c3Bhbj7kupHnq6/kuIvlj5Egwrcg56a75byA5o+Q6YaSPC9zcGFuPjwvZGl2PjwvZGl2PjwvZGl2Pic7CiAgcmVuZGVyQ2hhcmdlQ2FyZCgpOwogIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtsb2FkQ3AoZmFsc2UpfSw2MCk7Cn0KCi8qID09PT09IOiuvue9rumhtSA9PT09PSAqLwpmdW5jdGlvbiByZW5kZXJTZXR0aW5ncygpewogIHZhciBhPVMuYWNjLGM9Uy5jZmd8fHt9OwogIGlmKCFhKXskKCJhY2NDYXJkIikuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJhY2MtdG9wIj48ZGl2IGNsYXNzPSJhdmF0YXIiPj88L2Rpdj48ZGl2IHN0eWxlPSJmbGV4OjEiPjxiPuacquWvvOWFpei0puWPtzwvYj48c3Bhbj7or7fpgInmi6nkuIDnp43mlrnlvI/lr7zlhaUgVG9rZW48L3NwYW4+PC9kaXY+PC9kaXY+JytpbXBvcnRCdG5zKCk7fQogIGVsc2V7dmFyIGluaXRpYWw9KGEudXNlck5hbWV8fCJBIikuc2xpY2UoMCwxKS50b1VwcGVyQ2FzZSgpOwogICAgJCgiYWNjQ2FyZCIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iYWNjLXRvcCI+PGRpdiBjbGFzcz0iYXZhdGFyIj4nK2VzYyhpbml0aWFsKSsnPC9kaXY+PGRpdiBzdHlsZT0iZmxleDoxIj48Yj4nK2VzYyhhLnVzZXJOYW1lfHwi5p6B5qC46LSm5Y+3IikrJzwvYj48c3Bhbj5JRCAnK2VzYyhhLnVzZXJJZHx8Ii0tIikrJzwvc3Bhbj48L2Rpdj48c3BhbiBjbGFzcz0iYWNjLW9rJysoKFMuZGF0YSYmKFMuZGF0YS50b2tlblZhbGlkPT09ZmFsc2V8fFMuZGF0YS5zY29yZU9rPT09ZmFsc2UpKT8iIG5vIjoiIikrJyI+JysoKFMuZGF0YSYmKFMuZGF0YS50b2tlblZhbGlkPT09ZmFsc2V8fFMuZGF0YS5zY29yZU9rPT09ZmFsc2UpKT8i4pyVIFRva2VuIOmAmumBk+W8guW4uCI6IuKckyBUb2tlbiDmnInmlYgiKSsnPC9zcGFuPjwvZGl2PicraW1wb3J0QnRucygpO30KICAkKCJjZmdDYXJkIikuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjYXJkLWhlYWQiPjxoMz48aSBjbGFzcz0iZ3JlZW4iPjwvaT7nrb7liLDorr7nva48L2gzPjwvZGl2PicrCiAgICBzd1Jvdygic3dfYXV0byIsIuiHquWKqOetvuWIsCIsIuWIsOeCueiHquWKqOetvuWIsO+8iOaJk+W8gCBBcHAg5pe25omn6KGM77yJIixjLmF1dG9TaWduaW49PT10cnVlKSsKICAgIHN3Um93KCJzd19ibGluZCIsIuiHquWKqOW8gOebsuebkiIsIuW8gOebkuaXpeiHquWKqOW8gOWQr++8iOmaj+etvuWIsOaJp+ihjO+8iSIsdHJ1ZSkrCiAgICBzd1Jvdygic3dfYWxlcnQiLCLovabovobmj5DphpLmjqjpgIEiLCLpnIfliqggLyDlv5jlhbPplIEgLyDnlLXmsaDmj5DphpIiLGMudmVoaWNsZUFsZXJ0UHVzaCE9PWZhbHNlKSsKICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7nrb7liLDml7bpl7Q8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj4nK2VzYyhjLmF1dG9TaWduaW5UaW1lfHwiMDc6MDAiKSsnPC9zcGFuPjwvZGl2PicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iYnRuLW1haW4iIHN0eWxlPSJtYXJnaW4tdG9wOjEycHg7cGFkZGluZzoxMXB4IiBvbmNsaWNrPSJzYXZlQ2ZnKCkiPuS/neWtmOiuvue9rjwvYnV0dG9uPic7CiAgJCgibm90aWZ5Q2FyZCIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iY2FyZC1oZWFkIj48aDM+PGkgY2xhc3M9InZpbyI+PC9pPumAmuefpTwvaDM+PC9kaXY+JysKICAgIChhJiZhLmJhcmtLZXk/JzxkaXYgY2xhc3M9ImlucCI+PHNwYW4gc3R5bGU9ImZsZXg6MTtmb250LWZhbWlseTptb25vc3BhY2U7bGV0dGVyLXNwYWNpbmc6MXB4Ij7igKLigKLigKLigKLigKLigKLigKLigKLigKLigKLigKLigKI8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdCIgb25jbGljaz0iY2xlYXJCYXJrKCkiPua4hemZpDwvc3Bhbj48L2Rpdj4nOic8ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0iYmFya0luIiBwbGFjZWhvbGRlcj0iQmFyayBLZXkg5oiW6Ieq5bu65pyN5Yqh5Zmo5Zyw5Z2AIj48c3BhbiBjbGFzcz0iYWN0IiBvbmNsaWNrPSJzYXZlQmFyaygpIj7kv53lrZg8L3NwYW4+PC9kaXY+JykrCiAgICAnPGRpdiBjbGFzcz0iaGludCI+562+5Yiw57uT5p6c44CB55uy55uS5aWW5Yqx44CB6L2m6L6G5o+Q6YaS5Lya5o6o6YCB5YiwIEJhcmsgLyDns7vnu5/pgJrnn6XjgIJCYXJrIEtleSDloavlnKjotKblj7fkuIrvvIjljZXotKblj7fniYjku4XkuIDku73vvInjgII8L2Rpdj4nOwogICQoIm1vcmVDYXJkIikuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJjYXJkLWhlYWQiPjxoMz48aT48L2k+5pu05aSaPC9oMz48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Imxpbmstcm93IiBvbmNsaWNrPSJvcGVuRXh0ZXJuYWwoXCdodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE9cJykiPjxzcGFuPuKtkCBHaXRIdWIg5LuT5bqTPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj5jbHVjazc5OC9aRUVITyDigLo8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0ib3BlbkV4dGVybmFsKFwnaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPL2lzc3Vlc1wnKSI+PHNwYW4+8J+QmyDlj43ppojpl67popg8L3NwYW4+PHNwYW4gY2xhc3M9InIiPkdpdEh1YiBJc3N1ZXMg4oC6PC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ibGluay1yb3ciIG9uY2xpY2s9Im9wZW5BYm91dCgpIj48c3Bhbj7ihLnvuI8g5YWz5LqOPC9zcGFuPjxzcGFuIGNsYXNzPSJyIiBpZD0idmVyVHh0Ij52LS0g4oC6PC9zcGFuPjwvZGl2Pic7CiAgdmFyIHZFbD0kKCJ2ZXJUeHQiKTsKICBpZih2RWwpewogICAgdmFyIGF2PSIiOwogICAgdHJ5e2F2PSh3aW5kb3cuWmVlaG9OYXRpdmUmJnR5cGVvZiBaZWVob05hdGl2ZS5hcHBWZXJzaW9uPT09ImZ1bmN0aW9uIik/U3RyaW5nKFplZWhvTmF0aXZlLmFwcFZlcnNpb24oKXx8IiIpOiIifWNhdGNoKGUpe30KICAgIHZFbC50ZXh0Q29udGVudD0idiIrKGF2fHwiMS4wLjAiKSsiIOKAuiI7CiAgfQp9CmZ1bmN0aW9uIGltcG9ydEJ0bnMoKXsKICByZXR1cm4gJzxkaXYgY2xhc3M9ImltcG9ydCI+JysKICAgICc8ZGl2IGNsYXNzPSJpbXBvcnQtYnRuIHByaW1hcnkiIG9uY2xpY2s9Im9wZW5HdWlkZSgpIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDN2MTIiLz48cGF0aCBkPSJNNyAxMGw1IDUgNS01Ii8+PHJlY3QgeD0iMyIgeT0iMTciIHdpZHRoPSIxOCIgaGVpZ2h0PSI0IiByeD0iMiIvPjwvc3ZnPuaKk+WMheaVmeeoizxzbWFsbD5BbmRyb2lkIC8gaU9TIOWIhuW8gDwvc21hbGw+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJpbXBvcnQtYnRuIiBvbmNsaWNrPSJwaG9uZUxvZ2luVUkoKSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjYiIHk9IjIiIHdpZHRoPSIxMiIgaGVpZ2h0PSIyMCIgcng9IjMiLz48cGF0aCBkPSJNMTEgMThoMiIvPjwvc3ZnPuaJi+acuuWPt+eZu+W9lTxzbWFsbD7pqozor4HnoIHnm7TmjqXnmbvlvZU8L3NtYWxsPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaW1wb3J0LWJ0biIgb25jbGljaz0icGFzdGVUb2tlblVJKCkiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNOSA5aDExdjExSDl6Ii8+PHBhdGggZD0iTTUgMTVWNWgxMCIvPjwvc3ZnPueymOi0tCBUb2tlbjxzbWFsbD7miYvliqjlr7zlhaU8L3NtYWxsPjwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGludCI+QW5kcm9pZCDnlKggUmVxYWJsZSAvIEh0dHBDYW5hcnkg5oqTIFRva2Vu77ybaU9TIOeUqCBMb29uIC8gU2hhZG93cm9ja2V0IOaPkuS7tuiHquWKqOaKk+WPluOAguaKk+S4jeWIsOWPr+ebtOaOpeaJi+acuuWPt+mqjOivgeeggeeZu+W9leOAgjwvZGl2PicrCiAgICAoUy5hY2M/JzxidXR0b24gY2xhc3M9ImJ0bi1tYWluIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4O3BhZGRpbmc6MTBweDtiYWNrZ3JvdW5kOnJnYmEoMjQ5LDExMiwxMDYsLjEyKTtjb2xvcjp2YXIoLS1lcnIpO2JveC1zaGFkb3c6bm9uZTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjQ5LDExMiwxMDYsLjMpIiBvbmNsaWNrPSJyZW1vdmVBY2NvdW50KCkiPuenu+mZpOW9k+WJjei0puWPtzwvYnV0dG9uPic6JycpOwp9CmZ1bmN0aW9uIHN3Um93KGlkLGxhYmVsLHN1Yixvbil7cmV0dXJuICc8ZGl2IGNsYXNzPSJzd2l0Y2gtcm93Ij48ZGl2IGNsYXNzPSJsYmwiPjxiPicrbGFiZWwrJzwvYj48c3Bhbj4nK3N1YisnPC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9InN3ICcrKG9uPyJvbiI6IiIpKyciIGlkPSInK2lkKyciIG9uY2xpY2s9InRvZ2dsZVN3KHRoaXMpIj48L2Rpdj48L2Rpdj4nfQpmdW5jdGlvbiB0b2dnbGVTdyhlbCl7ZWwuY2xhc3NMaXN0LnRvZ2dsZSgib24iKX0KCi8qID09PT09IOaTjeS9nCA9PT09PSAqLwphc3luYyBmdW5jdGlvbiBkb1NpZ25pbigpewogIGlmKCFTLmFjYyl7dG9hc3QoIuivt+WFiOWvvOWFpei0puWPtyIsImVyciIpO3JldHVybn0KICB2YXIgYnRuPSQoInNpZ25CdG4iKTtpZihidG4pe2J0bi5jbGFzc0xpc3QuYWRkKCJidXN5Iik7YnRuLmlubmVySFRNTD0nPHNwYW4gY2xhc3M9InNwaW4iPjwvc3Bhbj7nrb7liLDkuK3igKYnfQogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvcnVuLXNpZ25pbiIse3VzZXJJZDpTLmFjYy51c2VySWR9KTsKICBpZihidG4pe2J0bi5jbGFzc0xpc3QucmVtb3ZlKCJidXN5Iil9CiAgaWYociYmci5yZXN1bHRzJiZyLnJlc3VsdHNbMF0pe1Muc2lnblJlc3VsdD1yLnJlc3VsdHNbMF07cmVuZGVyU2lnbmluKCk7dG9hc3QoUy5zaWduUmVzdWx0LnN1Y2Nlc3M/IuetvuWIsOWujOaIkCArIitTLnNpZ25SZXN1bHQudG90YWxHYWluKyIg5YiGIjoi562+5Yiw5aSx6LSlIiwib2siKX0KICBlbHNlIHRvYXN0KCLnrb7liLDor7fmsYLlpLHotKUiLCJlcnIiKTsKICByZWZyZXNoQWxsKHRydWUpOwp9CnZhciBDVD17YWN0aW9uOm51bGx9OwpmdW5jdGlvbiBvcGVuU2hlZXQoaWQpe3ZhciBlPSQoaWQpO2lmKGUpZS5jbGFzc0xpc3QuYWRkKCJvbiIpfQpmdW5jdGlvbiBjbG9zZVNoZWV0KGlkKXt2YXIgZT0kKGlkKTtpZihlKWUuY2xhc3NMaXN0LnJlbW92ZSgib24iKX0KZnVuY3Rpb24gb3BlbkFib3V0KCl7CiAgdmFyIGF2PSIiLGtlcm5lbD0iLS0iOwogIHRyeXthdj0od2luZG93LlplZWhvTmF0aXZlJiZ0eXBlb2YgWmVlaG9OYXRpdmUuYXBwVmVyc2lvbj09PSJmdW5jdGlvbiIpP1N0cmluZyhaZWVob05hdGl2ZS5hcHBWZXJzaW9uKCl8fCIiKToiIn1jYXRjaChlKXt9CiAga2VybmVsPVMudmVyfHwiLS0iOwogIGlmKCQoImFiVmVyIikpJCgiYWJWZXIiKS50ZXh0Q29udGVudD0idiIrKGF2fHwiLS0iKTsKICBpZigkKCJhYktlcm5lbCIpKSQoImFiS2VybmVsIikudGV4dENvbnRlbnQ9a2VybmVsOwogIGlmKCQoImFiQWNjIikpJCgiYWJBY2MiKS50ZXh0Q29udGVudD1TLmFjYz8oUy5hY2MudXNlck5hbWV8fCIiKSsiIMK3ICIrKFMuYWNjLnVzZXJJZHx8IiIpOiItLSI7CiAgb3BlblNoZWV0KCJhYm91dFNoZWV0Iik7Cn0KYXN5bmMgZnVuY3Rpb24gc3dpdGNoVmVoaWNsZSh2aW4pewogIGlmKCFTLmFjYylyZXR1cm47CiAgdG9hc3QoIuWIh+aNoui9pui+huKApiIpOwogIHZhciBkPWF3YWl0IGFwaSgiL2FwaS92ZWhpY2xlP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChTLmFjYy51c2VySWQpKyImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHZpbikpOwogIGlmKGQmJmQub2smJmQucmVzdWx0KXsKICAgIFMuZGF0YT1kLnJlc3VsdDsKICAgIFMucmlkZT1hd2FpdCBhcGkoIi9hcGkvcmlkZS1tb250aD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoUy5hY2MudXNlcklkKSsiJm1vbnRoPSIrbW9uU3RyKCkrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodmluKSk7CiAgICBTLnJpZGVEYXk9YXdhaXQgZmV0Y2hUb2RheVJpZGUoUy5kYXRhLnZlaGljbGV8fHt9KTsKICAgIHJlbmRlckhvbWUoKTtyZW5kZXJTaWduaW4oKTtyZW5kZXJDb250cm9sKCk7CiAgICB0b2FzdCgi5bey5YiH5o2i6L2m6L6GIiwib2siKTsKICB9ZWxzZSB0b2FzdCgi5YiH5o2i5aSx6LSlIiwiZXJyIik7Cn0KZnVuY3Rpb24gcmlza0FncmVlZCgpe3JldHVybiBTdHJpbmcoKFMuY2ZnJiZTLmNmZy52ZWhpY2xlQ29udHJvbFJpc2spfHwiIikudHJpbSgpPT09IuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqCJ9CmZ1bmN0aW9uIGN0cmwoYWN0aW9uKXsKICBpZighUy5hY2Mpe3RvYXN0KCLor7flhYjlr7zlhaXotKblj7ciLCJlcnIiKTtyZXR1cm59CiAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTsKICBpZighdi52aW5Obyl7dG9hc3QoIuacquiOt+WPluWIsOi9pui+hiIsImVyciIpO3JldHVybn0KICBDVC5hY3Rpb249YWN0aW9uOwogIGlmKHJpc2tBZ3JlZWQoKSl7ZG9DdHJsKCk7cmV0dXJufQogIG9wZW5TaGVldCgiY29uZmlybVNoZWV0Iik7Cn0KYXN5bmMgZnVuY3Rpb24gYWdyZWVSaXNrQW5kQ3RybCgpewogIHZhciBjPU9iamVjdC5hc3NpZ24oe30sUy5jZmd8fHt9LHt2ZWhpY2xlQ29udHJvbFJpc2s6IuaIkeWQjOaEj+mjjumZqeW5tuS9v+eUqCJ9KTsKICB2YXIgcj1hd2FpdCBwb3N0KCIvYXBpL3NhdmUtY29uZmlnIixjKTsKICBpZighKHImJnIub2spKXt0b2FzdCgi6aOO6Zmp56Gu6K6k5L+d5a2Y5aSx6LSlIiwiZXJyIik7cmV0dXJufQogIFMuY2ZnPWM7Y2xvc2VTaGVldCgiY29uZmlybVNoZWV0Iik7CiAgdG9hc3QoIuW3suWQjOaEj+mjjumZqe+8jOi9puaOp+W3suWQr+eUqCIsIm9rIik7CiAgZG9DdHJsKCk7Cn0KYXN5bmMgZnVuY3Rpb24gZG9DdHJsKCl7CiAgdmFyIGFjdGlvbj1DVC5hY3Rpb247aWYoIWFjdGlvbilyZXR1cm47CiAgY2xvc2VTaGVldCgiY29uZmlybVNoZWV0Iik7CiAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTsKICB2YXIgbmFtZXM9e2ZpbmQ6IuWvu+i9piIsbG91ZEZpbmQ6Ium4o+esm+mXqueBryIsY3VzaGlvbjoi5omT5byA5Z2Q5Z6rIix1bmxvY2s6IuS6keerr+W8gOmUgSIsbG9jazoi5LqR56uv5YWz6ZSBIn07CiAgdG9hc3QoIuaMh+S7pOS4i+WPkeS4reKApiIpOwogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvdmVoaWNsZS1jb250cm9sIix7dXNlcklkOlMuYWNjLnVzZXJJZCx2aW46di52aW5ObyxhY3Rpb246YWN0aW9ufSk7CiAgdG9hc3QociYmci5vaz8oIuKchSAiK25hbWVzW2FjdGlvbl0rIuW3suS4i+WPkSIpOigi4p2MICIrKChyJiZyLm1lc3NhZ2UpfHwi5oyH5Luk5aSx6LSlIikpLHImJnIub2s/Im9rIjoiZXJyIik7CiAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hBbGwodHJ1ZSl9LDE4MDApOwp9CmZ1bmN0aW9uIHNldENwKHcpe0NQLnNlbD1TdHJpbmcodyk7ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiI2N0cmxDaGFyZ2UgLmNoaXAiKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2UuY2xhc3NMaXN0LnRvZ2dsZSgib24iLGUuZ2V0QXR0cmlidXRlKCJkYXRhLWsiKT09PVN0cmluZyh3KSl9KTt0b2FzdCgi5bey6YCJ5oupICIrKFN0cmluZyh3KT09PSIxMjAwIj8i5peg6ZmQ5Yi2IjpTdHJpbmcodykrIlciKSsi77yM54K544CM6K6+572u44CN5LiL5Y+RIil9CmFzeW5jIGZ1bmN0aW9uIHNhdmVDZmcoKXsKICB2YXIgYz1TLmNmZ3x8e307CiAgdmFyIG5leHQ9T2JqZWN0LmFzc2lnbih7fSxjLHthdXRvU2lnbmluOiQoInN3X2F1dG8iKT8kKCJzd19hdXRvIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJvbiIpOmMuYXV0b1NpZ25pbix2ZWhpY2xlQWxlcnRQdXNoOiQoInN3X2FsZXJ0Iik/JCgic3dfYWxlcnQiKS5jbGFzc0xpc3QuY29udGFpbnMoIm9uIik6Yy52ZWhpY2xlQWxlcnRQdXNofSk7CiAgdmFyIHI9YXdhaXQgcG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCk7CiAgdG9hc3QociYmci5vaz8i6K6+572u5bey5L+d5a2YIjoi5L+d5a2Y5aSx6LSlIixyJiZyLm9rPyJvayI6ImVyciIpOwogIFMuY2ZnPW5leHQ7Cn0KYXN5bmMgZnVuY3Rpb24gc2F2ZUJhcmsoKXsKICBpZighUy5hY2Mpe3RvYXN0KCLor7flhYjlr7zlhaXotKblj7ciLCJlcnIiKTtyZXR1cm59CiAgdmFyIGs9JCgiYmFya0luIik/JCgiYmFya0luIikudmFsdWUudHJpbSgpOiIiO2lmKCFrKXt0b2FzdCgi6K+36L6T5YWlIEJhcmsgS2V5IiwiZXJyIik7cmV0dXJufQogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2xpc3Q6W3t1c2VyTmFtZTpTLmFjYy51c2VyTmFtZSx1c2VySWQ6Uy5hY2MudXNlcklkLHRva2VuOlMuYWNjLnRva2VuLGJhcmtLZXk6a31dfSk7CiAgaWYociYmci5vayl7dG9hc3QoIuW3suS/neWtmCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKTsKfQphc3luYyBmdW5jdGlvbiBjbGVhckJhcmsoKXsKICBpZighUy5hY2MpcmV0dXJuOwogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2xpc3Q6W3t1c2VyTmFtZTpTLmFjYy51c2VyTmFtZSx1c2VySWQ6Uy5hY2MudXNlcklkLHRva2VuOlMuYWNjLnRva2VuLGJhcmtLZXk6IiJ9XX0pOwogIGlmKHImJnIub2spe3RvYXN0KCLlt7LmuIXpmaQiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9Cn0KZnVuY3Rpb24gb3Blbkd1aWRlKCl7Z3VpZGVUYWIoJ2EnKTtvcGVuU2hlZXQoJ2d1aWRlU2hlZXQnKX0KZnVuY3Rpb24gZ3VpZGVUYWIoayl7CiAgdmFyIGE9JCgiZ3VpZGVBIiksaT0kKCJndWlkZUkiKSx0YT0kKCJnZFRhYkEiKSx0aT0kKCJnZFRhYkkiKTsKICBpZihhKWEuc3R5bGUuZGlzcGxheT1rPT09J2EnPydibG9jayc6J25vbmUnOwogIGlmKGkpaS5zdHlsZS5kaXNwbGF5PWs9PT0naSc/J2Jsb2NrJzonbm9uZSc7CiAgaWYodGEpdGEuY2xhc3NMaXN0LnRvZ2dsZSgnb24nLGs9PT0nYScpOwogIGlmKHRpKXRpLmNsYXNzTGlzdC50b2dnbGUoJ29uJyxrPT09J2knKTsKfQp2YXIgUEg9e3RpbWVyOm51bGx9OwpmdW5jdGlvbiBwaG9uZUxvZ2luVUkoKXtvcGVuU2hlZXQoInBob25lU2hlZXQiKX0KYXN5bmMgZnVuY3Rpb24gc2VuZENvZGVVSSgpewogIHZhciBwaG9uZT0kKCJwaFBob25lIik/JCgicGhQaG9uZSIpLnZhbHVlLnRyaW0oKToiIjsKICBpZighL15cZHsxMX0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpSAxMSDkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm59CiAgdmFyIGJ0bj0kKCJwaFNlbmQiKTsKICBpZihidG4mJmJ0bi5kYXRhc2V0LmJ1c3kpcmV0dXJuOwogIGlmKGJ0bilidG4uZGF0YXNldC5idXN5PSIxIjsKICBpZigkKCJwaFN0YXRlIikpJCgicGhTdGF0ZSIpLnRleHRDb250ZW50PSLmraPlnKjlj5HpgIHpqozor4HnoIHigKYiOwogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvc2VuZC1jb2RlIix7cGhvbmU6cGhvbmV9KTsKICBpZihyJiZyLm9rKXsKICAgIGlmKCQoInBoU3RhdGUiKSkkKCJwaFN0YXRlIikudGV4dENvbnRlbnQ9IumqjOivgeeggeW3suWPkemAge+8jOivt+afpeaUtuefreS/oSI7CiAgICB0b2FzdCgi6aqM6K+B56CB5bey5Y+R6YCBIiwib2siKTsKICAgIGlmKGJ0bil7CiAgICAgIHZhciBuPTYwO2J0bi50ZXh0Q29udGVudD1uKyJzIjsKICAgICAgaWYoUEgudGltZXIpY2xlYXJJbnRlcnZhbChQSC50aW1lcik7CiAgICAgIFBILnRpbWVyPXNldEludGVydmFsKGZ1bmN0aW9uKCl7bi0tO2J0bi50ZXh0Q29udGVudD1uKyJzIjtpZihuPD0wKXtjbGVhckludGVydmFsKFBILnRpbWVyKTtidG4udGV4dENvbnRlbnQ9IuWPkemAgemqjOivgeeggSI7ZGVsZXRlIGJ0bi5kYXRhc2V0LmJ1c3k7fX0sMTAwMCk7CiAgICB9CiAgfWVsc2V7CiAgICBpZigkKCJwaFN0YXRlIikpJCgicGhTdGF0ZSIpLnRleHRDb250ZW50PSLlj5HpgIHlpLHotKXvvJoiKygociYmci5tZXNzYWdlKXx8IuacquefpemUmeivryIpOwogICAgdG9hc3QoKHImJnIubWVzc2FnZSl8fCLpqozor4HnoIHlj5HpgIHlpLHotKUiLCJlcnIiKTsKICAgIGlmKGJ0bilkZWxldGUgYnRuLmRhdGFzZXQuYnVzeTsKICB9Cn0KYXN5bmMgZnVuY3Rpb24gZG9QaG9uZUxvZ2luKCl7CiAgdmFyIHBob25lPSQoInBoUGhvbmUiKT8kKCJwaFBob25lIikudmFsdWUudHJpbSgpOiIiOwogIHZhciBjb2RlPSQoInBoQ29kZSIpPyQoInBoQ29kZSIpLnZhbHVlLnRyaW0oKToiIjsKICBpZighL15cZHsxMX0kLy50ZXN0KHBob25lKSl7dG9hc3QoIuivt+i+k+WFpSAxMSDkvY3miYvmnLrlj7ciLCJlcnIiKTtyZXR1cm59CiAgaWYoIS9eXGR7NCw2fSQvLnRlc3QoY29kZSkpe3RvYXN0KCLor7fovpPlhaXnn63kv6Hpqozor4HnoIEiLCJlcnIiKTtyZXR1cm59CiAgaWYoJCgicGhTdGF0ZSIpKSQoInBoU3RhdGUiKS50ZXh0Q29udGVudD0i55m75b2V5Lit4oCmIjsKICB2YXIgcj1hd2FpdCBwb3N0KCIvYXBpL3Bob25lLWxvZ2luIix7cGhvbmU6cGhvbmUsY29kZTpjb2RlfSk7CiAgaWYociYmci5vayl7CiAgICBjbG9zZVNoZWV0KCJwaG9uZVNoZWV0Iik7CiAgICB0b2FzdCgi55m75b2V5oiQ5YqfIiwib2siKTsKICAgIGlmKFBILnRpbWVyKXtjbGVhckludGVydmFsKFBILnRpbWVyKTtQSC50aW1lcj1udWxsfQogICAgcmVmcmVzaEFsbCh0cnVlKTsKICB9ZWxzZXsKICAgIGlmKCQoInBoU3RhdGUiKSkkKCJwaFN0YXRlIikudGV4dENvbnRlbnQ9IueZu+W9leWksei0pe+8miIrKChyJiZyLm1lc3NhZ2UpfHwi5pyq55+l6ZSZ6K+vIik7CiAgICB0b2FzdCgociYmci5tZXNzYWdlKXx8IueZu+W9leWksei0pSIsImVyciIpOwogIH0KfQpmdW5jdGlvbiBwYXN0ZVRva2VuVUkoKXtvcGVuU2hlZXQoInRva2VuU2hlZXQiKX0KYXN5bmMgZnVuY3Rpb24gZG9QYXN0ZVRva2VuKCl7CiAgdmFyIHQ9JCgidGtJbnB1dCIpPyQoInRrSW5wdXQiKS52YWx1ZS50cmltKCk6IiI7CiAgaWYoIXQpe3RvYXN0KCLor7fnspjotLQgVG9rZW4iLCJlcnIiKTtyZXR1cm59CiAgaWYoJCgidGtTdGF0ZSIpKSQoInRrU3RhdGUiKS50ZXh0Q29udGVudD0i5a+85YWl5Lit4oCmIjsKICB2YXIgcj1hd2FpdCBhcGkoIi9hcGkvcXVpY2stc2F2ZT9yZXBsYWNlPTEmZm9ybWF0PWpzb24mdG9rZW49IitlbmNvZGVVUklDb21wb25lbnQodCkpOwogIGlmKHImJnIub2spe3RvYXN0KCLlt7Llr7zlhaXvvIzmraPlnKjliLfmlrDotKblj7figKYiLCJvayIpO2Nsb3NlU2hlZXQoInRva2VuU2hlZXQiKTtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaEFsbCh0cnVlKX0sMTIwMCl9CiAgZWxzZXt2YXIgbXNnPShyJiZyLm1lc3NhZ2UpfHwiVG9rZW4g5a+85YWl5aSx6LSlIjtpZigkKCJ0a1N0YXRlIikpJCgidGtTdGF0ZSIpLnRleHRDb250ZW50PW1zZzt0b2FzdChtc2csImVyciIpfQp9CmZ1bmN0aW9uIHJlbW92ZUFjY291bnQoKXsKICBpZighY29uZmlybSgi56Gu6K6k56e76Zmk5b2T5YmN6LSm5Y+377yfIikpcmV0dXJuOwogIHBvc3QoIi9hcGkvc2F2ZS1hY2NvdW50cyIse2xpc3Q6W119KS50aGVuKGZ1bmN0aW9uKHIpe2lmKHImJnIub2spe3RvYXN0KCLlt7Lnp7vpmaQiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9fSk7Cn0KZnVuY3Rpb24gb3BlbkV4dGVybmFsKHUpe2lmKHdpbmRvdy5aZWVob05hdGl2ZSYmWmVlaG9OYXRpdmUub3BlbkV4dGVybmFsKVplZWhvTmF0aXZlLm9wZW5FeHRlcm5hbCh1KTtlbHNlIHdpbmRvdy5vcGVuKHUsIl9ibGFuayIpfQovKiB2Mi4xNi40MiDns7vnu5/pgJrnn6XvvJrlronljZMvaU9TIOWOn+eUn+ahpe+8jOa1j+iniOWZqOeOr+Wig+mAgOWbniBXZWIgTm90aWZpY2F0aW9uICovCmZ1bmN0aW9uIG5hdGl2ZU5vdGlmeSh0aXRsZSxib2R5KXsKICB0cnl7aWYod2luZG93LlplZWhvTmF0aXZlJiZ0eXBlb2YgWmVlaG9OYXRpdmUubm90aWZ5PT09ImZ1bmN0aW9uIil7WmVlaG9OYXRpdmUubm90aWZ5KFN0cmluZyh0aXRsZXx8IiIpLFN0cmluZyhib2R5fHwiIikpO3JldHVybiB0cnVlfX1jYXRjaChlKXt9CiAgdHJ5e2lmKHR5cGVvZiBOb3RpZmljYXRpb24hPT0idW5kZWZpbmVkIil7aWYoTm90aWZpY2F0aW9uLnBlcm1pc3Npb249PT0iZ3JhbnRlZCIpe25ldyBOb3RpZmljYXRpb24oU3RyaW5nKHRpdGxlfHwiIikse2JvZHk6U3RyaW5nKGJvZHl8fCIiKX0pO3JldHVybiB0cnVlfX19Y2F0Y2goZSl7fQogIHJldHVybiBmYWxzZTsKfQovKiB2Mi4xNi41MCDmiYvliqjph43mlrDmmL7npLrlhYXnlLXlrp7ml7bmtLvliqjvvIjplIHlsY/ljaHniYfooqvlhbPpl63lkI7lho3mrKHllKTotbfvvIkKICAg5pen5a6e546w55qE6Zeu6aKY77ya5Y6f55Sf5L6n6Z2Z6buY5omn6KGM77yM5LiU5o+Q56S6IHRvYXN0IOeahCB6LWluZGV4IOavlOiuvue9ruW8ueWxguS9ju+8jOW8ueWxguW8gOedgOaXtuaPkOekuuiiq+aMoeS9j++8jAogICDooajnjrDlsLHmmK/jgIzmjInkuobmsqHlj43lupTjgI3jgILnjrDlnKjlhYjnq4vljbPnu5nkuIDmnaHmj5DnpLrvvIzlho3nlLHljp/nlJ/lm57miafnnJ/lrp7nu5PmnpzjgIIgKi8Kd2luZG93Ll9femhMQVJlc3VsdD1mdW5jdGlvbihvayxtc2cpewogIHRyeXsgdG9hc3QoU3RyaW5nKG1zZ3x8KG9rPyLlt7Lph43mlrDmmL7npLrlhYXnlLXmtLvliqgiOiLmk43kvZzlpLHotKUiKSksIG9rPyJvayI6ImVyciIpOyB9Y2F0Y2goZSl7fQp9OwpmdW5jdGlvbiByZXN0YXJ0TGl2ZUFjdGl2aXR5KCl7CiAgdmFyIG5hdGl2ZT1mYWxzZTsKICB0cnl7CiAgICBpZih3aW5kb3cuWmVlaG9OYXRpdmUmJnR5cGVvZiBaZWVob05hdGl2ZS5zaG93Q2hhcmdlTGl2ZUFjdGl2aXR5PT09ImZ1bmN0aW9uIil7CiAgICAgIG5hdGl2ZT10cnVlOwogICAgICB0b2FzdCgi5q2j5Zyo6YeN5paw5pi+56S65YWF55S15rS75Yqo4oCmIiwib2siKTsKICAgICAgWmVlaG9OYXRpdmUuc2hvd0NoYXJnZUxpdmVBY3Rpdml0eSgpOwogICAgfQogIH1jYXRjaChlKXt9CiAgaWYoIW5hdGl2ZSkgdG9hc3QoIuW9k+WJjeW5s+WPsOS4jeaUr+aMgeWunuaXtua0u+WKqO+8iOS7hSBpT1MgMTYuMSvvvIkiLCJlcnIiKTsKfQovKiB2Mi4xNi41MiDkuIDplK7miZPlvIDmnKzlupTnlKjns7vnu5/orr7nva7vvIjlrp7ml7bmtLvliqjlvIDlhbPooqvns7vnu5/lhbPmjonml7bnlKjvvIkgKi8KZnVuY3Rpb24gb3BlbkxpdmVBY3Rpdml0eVNldHRpbmdzKCl7CiAgdHJ5ewogICAgaWYod2luZG93LlplZWhvTmF0aXZlJiZ0eXBlb2YgWmVlaG9OYXRpdmUub3BlbkFwcFNldHRpbmdzPT09ImZ1bmN0aW9uIil7CiAgICAgIFplZWhvTmF0aXZlLm9wZW5BcHBTZXR0aW5ncygpOwogICAgICByZXR1cm47CiAgICB9CiAgfWNhdGNoKGUpe30KICB0b2FzdCgi6K+35YiwIOezu+e7n+iuvue9riDihpIg5p6B5qC45Y2V6LSm5Y+354mIIOKGkiDlrp7ml7bmtLvliqgg5omT5byA5byA5YWzIiwiZXJyIik7Cn0KCgoKCi8qID09PT09IHYyLjE2LjI2IOaMieaXpemqkeihjOe7n+iuoSA9PT09PSAqLwpmdW5jdGlvbiBmbXREb3QoZG90KXt2YXIgcD1TdHJpbmcoZG90fHwiIikuc3BsaXQoIi4iKTtpZihwLmxlbmd0aCE9PTMpcmV0dXJuIFN0cmluZyhkb3R8fCItLSIpO3JldHVybiBOdW1iZXIocFsxXSkrIuaciCIrTnVtYmVyKHBbMl0pKyLml6UifQpmdW5jdGlvbiByZGcodix1LGwpe3JldHVybiAnPGRpdiBjbGFzcz0icmRnIj48YiBjbGFzcz0ibnVtIj4nKyh2IT1udWxsP3Y6Jy0tJykrKHYhPW51bGw/JzxzbWFsbD4nK3UrJzwvc21hbGw+JzonJykrJzwvYj48c3Bhbj4nK2wrJzwvc3Bhbj48L2Rpdj4nfQpmdW5jdGlvbiByaWRlUmVjT2YoZG90KXsKICB2YXIgcmQ9Uy5yaWRlJiZTLnJpZGUub2s/Uy5yaWRlLmRhdGF8fHt9Ont9OwogIHZhciBsaXN0PUFycmF5LmlzQXJyYXkocmQucmlkZVJlY29yZExpc3QpP3JkLnJpZGVSZWNvcmRMaXN0OltdOwogIGZvcih2YXIgaT0wO2k8bGlzdC5sZW5ndGg7aSsrKXtpZihTdHJpbmcoKGxpc3RbaV0mJmxpc3RbaV0uZGF0ZSl8fCIiKT09PWRvdClyZXR1cm4gbGlzdFtpXX0KICByZXR1cm4gbnVsbDsKfQpmdW5jdGlvbiByaWRlRGF5U3RhdHMoZG90KXsKICB2YXIgcmQ9Uy5yaWRlJiZTLnJpZGUub2s/Uy5yaWRlLmRhdGF8fHt9Ont9OwogIHZhciByZWM9cmlkZVJlY09mKGRvdCl8fHt9OwogIHZhciBjYWxjPShTLnJpZGVEYWlseSYmUy5yaWRlRGFpbHlbZG90XSl8fG51bGw7CiAgaWYoY2FsYyYmY2FsYy5lbXB0eSljYWxjPW51bGw7CiAgdmFyIG9taWxlPW51bShyZWMucmlkZU1pbGVhZ2UhPW51bGw/cmVjLnJpZGVNaWxlYWdlOm51bGwsbnVsbCk7CiAgdmFyIG9teD1udW0ocmVjLm1heFNwZWVkIT1udWxsP3JlYy5tYXhTcGVlZDpudWxsLG51bGwpOwogIHZhciBvYmVuZD1udW0ocmVjLmJlbmRpbmdUaW1lc0RheSE9bnVsbD9yZWMuYmVuZGluZ1RpbWVzRGF5OnJlYy5iZW5kaW5nVGltZXMsbnVsbCk7CiAgdmFyIG9hY2M9bnVtKHJlYy5hY2NlbGVyYXRpb25UaW1lc0RheSE9bnVsbD9yZWMuYWNjZWxlcmF0aW9uVGltZXNEYXk6cmVjLmFjY2VsZXJhdGlvblRpbWVzLG51bGwpOwogIHZhciBvYnJrPW51bShyZWMuYnJha2VzVGltZXNEYXkhPW51bGw/cmVjLmJyYWtlc1RpbWVzRGF5OnJlYy5icmFrZXNUaW1lcyxudWxsKTsKICBpZihkb3Q9PT10b2RheVN0cigpLnJlcGxhY2UoLy0vZywiLiIpKXsKICAgIGlmKG9taWxlPT1udWxsKW9taWxlPW51bShyZC5yaWRlTWlsZWFnZURheSE9bnVsbD9yZC5yaWRlTWlsZWFnZURheTpyZC5kYXlSaWRlTWlsZWFnZSxudWxsKTsKICAgIGlmKG9teD09bnVsbClvbXg9bnVtKHJkLm1heFNwZWVkIT1udWxsP3JkLm1heFNwZWVkOnJkLnRvZGF5TWF4U3BlZWQsbnVsbCk7CiAgICBpZihvYmVuZD09bnVsbClvYmVuZD1udW0ocmQuYmVuZGluZ1RpbWVzIT1udWxsP3JkLmJlbmRpbmdUaW1lczpyZC5iZW5kVGltZXMsbnVsbCk7CiAgICBpZihvYWNjPT1udWxsKW9hY2M9bnVtKHJkLmFjY2VsZXJhdGlvblRpbWVzIT1udWxsP3JkLmFjY2VsZXJhdGlvblRpbWVzOnJkLmFjY1RpbWVzLG51bGwpOwogICAgaWYob2Jyaz09bnVsbClvYnJrPW51bShyZC5icmFrZXNUaW1lcyE9bnVsbD9yZC5icmFrZXNUaW1lczpyZC5icmFrZVRpbWVzLG51bGwpOwogIH0KICB2YXIgY21pbj0oY2FsYyYmY2FsYy5kdXJhdGlvbk1pbj4wKT9NYXRoLnJvdW5kKGNhbGMuZHVyYXRpb25NaW4pOm51bGw7CiAgdmFyIG1pbj1jbWluIT1udWxsP2NtaW46KE51bWJlcihyZWMucmlkaW5nVGltZURheVVuaXRNaW51dGUpfHwwKTsKICB2YXIgbWlsZT1jYWxjP01hdGgubWF4KGNhbGMubWlsZWFnZSxvbWlsZXx8MCk6b21pbGU7CiAgdmFyIG14PWNhbGM/TWF0aC5tYXgoY2FsYy5tYXhTcGVlZCxvbXh8fDApOm9teDsKICB2YXIgYmVuZD1jYWxjP2NhbGMuYmVuZGluZ1RpbWVzOm9iZW5kOwogIHZhciBhY2M9Y2FsYz9NYXRoLm1heChjYWxjLmFjY2VsZXJhdGlvblRpbWVzLG9hY2N8fDApOm9hY2M7CiAgdmFyIGJyaz1jYWxjP2NhbGMuYnJha2VzVGltZXM6b2JyazsKICByZXR1cm4ge21pbGU6bWlsZSxteDpteCxiZW5kOmJlbmQsYWNjOmFjYyxicms6YnJrLG1pbjptaW4sY2FsYzohIWNhbGN9Owp9CmZ1bmN0aW9uIHJpZGVEYXlMb2FkaW5nKGRvdCl7dmFyIGM9Uy5yaWRlRGFpbHkmJlMucmlkZURhaWx5W2RvdF07cmV0dXJuICFjJiZkb3QhPT10b2RheVN0cigpLnJlcGxhY2UoLy0vZywiLiIpfQpmdW5jdGlvbiBwaWNrUmlkZURheShkb3QpewogIGlmKCFkb3QpcmV0dXJuOwogIFMucmlkZVNlbD1kb3Q7cmVuZGVySG9tZSgpOwogIHZhciBjPVMucmlkZURhaWx5JiZTLnJpZGVEYWlseVtkb3RdOwogIGlmKCFjKWxvYWRSaWRlRGF5KGRvdCk7Cn0KYXN5bmMgZnVuY3Rpb24gbG9hZFJpZGVEYXkoZG90KXsKICB2YXIgdj0oUy5kYXRhJiZTLmRhdGEudmVoaWNsZSl8fHt9OwogIGlmKCFTLmFjY3x8IXYudmluTm8pcmV0dXJuOwogIHZhciByPWF3YWl0IGZldGNoUmlkZURheSh2LGRvdCk7CiAgaWYoIVMucmlkZURhaWx5KVMucmlkZURhaWx5PXt9OwogIFMucmlkZURhaWx5W2RvdF09cnx8e2VtcHR5OnRydWV9OwogIHJlbmRlckhvbWUoKTsKfQoKCi8qID09PT09IHYyLjE2LjMyIOmqkeihjOi9qOi/ueWbnuaUviAvIOa1t+aKpSA9PT09PSAqLwp2YXIgUlA9e2RheToiIixyaWRlczpbXSxpZHg6MCxwdHM6W10sZHVyOjAscHJvZzowLHNwZWVkOjEscGxheWluZzpmYWxzZSxyYWY6MCxsYXN0OjAsbGVuOjAscGF0aDpudWxsLGRvdDpudWxsLHJpZGU6bnVsbCxwb3N0ZXI6IiJ9OwpmdW5jdGlvbiBycENsb3NlKCl7cnBQbGF5KGZhbHNlKTtjbG9zZVNoZWV0KCJyZXBsYXlTaGVldCIpfQpmdW5jdGlvbiBycERheVJpZGVzKGRheSl7cmV0dXJuICgoZGF5JiZkYXkuaGlzdG9yeUxpc3QpfHxbXSkuZmlsdGVyKGZ1bmN0aW9uKHIpe3JldHVybiByJiZyLnRyYWplY3RvcnkmJnJpZGVQYXJzZVRyYWNrKHIudHJhamVjdG9yeSkubGVuZ3RoPj00fSl9CmFzeW5jIGZ1bmN0aW9uIHJwRmluZFJlY2VudERheSh2LGRvdCl7CiAgdHJ5ewogICAgZm9yKHZhciBwZz0xO3BnPD0yO3BnKyspewogICAgICB2YXIgZD1hd2FpdCBhcGkoIi9hcGkvcmlkZS10cmFjaz91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoUy5hY2MudXNlcklkKSsiJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhkb3QpLnNsaWNlKDAsNykpKyImdmluPSIrZW5jb2RlVVJJQ29tcG9uZW50KHYudmluTm8pKyImcGFnZT0iK3BnKyImcGFnZVNpemU9MjAiKTsKICAgICAgdmFyIGRheXM9KGQmJmQuZGF5cyl8fFtdOwogICAgICBpZighZGF5cy5sZW5ndGgpcmV0dXJuIG51bGw7CiAgICAgIGZvcih2YXIgaT0wO2k8ZGF5cy5sZW5ndGg7aSsrKXsKICAgICAgICB2YXIgZGQ9cmlkZU5vcm1EYXkoZGF5c1tpXSYmZGF5c1tpXS5kYXlUaW1lKTsKICAgICAgICBpZihkZCYmZGQ8PWRvdCYmcnBEYXlSaWRlcyhkYXlzW2ldKS5sZW5ndGgpcmV0dXJuIGRheXNbaV07CiAgICAgIH0KICAgIH0KICAgIHJldHVybiBudWxsOwogIH1jYXRjaChlKXtyZXR1cm4gbnVsbH0KfQphc3luYyBmdW5jdGlvbiBvcGVuUmVwbGF5KGRvdCl7CiAgaWYoIVMuYWNjKXt0b2FzdCgi6K+35YWI5a+85YWl6LSm5Y+3IiwiZXJyIik7cmV0dXJufQogIHZhciB2PShTLmRhdGEmJlMuZGF0YS52ZWhpY2xlKXx8e307CiAgaWYoIXYudmluTm8pe3RvYXN0KCLmnKrojrflj5bliLDovabovoYiLCJlcnIiKTtyZXR1cm59CiAgUlAuZGF5PWRvdHx8dG9kYXlTdHIoKS5yZXBsYWNlKC8tL2csIi4iKTtSUC5pZHg9MDtSUC5yaWRlcz1bXTtSUC5wdHM9W107UlAucHJvZz0wO1JQLnBsYXlpbmc9ZmFsc2U7Y2FuY2VsQW5pbWF0aW9uRnJhbWUoUlAucmFmKTsKICAkKCJycFRpdGxlIikudGV4dENvbnRlbnQ9Zm10RG90KFJQLmRheSkrIiDpqpHooYzlm57mlL4iOwogICQoInJwU3ViIikudGV4dENvbnRlbnQ9Iuato+WcqOivu+WPlui9qOi/ueKApiI7CiAgJCgicnBSaWRlcyIpLmlubmVySFRNTD0iIjsKICAkKCJycFN0YXRzIikuaW5uZXJIVE1MPSIiOwogICQoInJwTWFwIikuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmctdG9wOjcwcHgiPuato+WcqOivu+WPlui9qOi/ueKApjwvZGl2Pic7CiAgb3BlblNoZWV0KCJyZXBsYXlTaGVldCIpOwogIHZhciBjYWNoZT1TLnJpZGVUcmFja3N8fChTLnJpZGVUcmFja3M9e30pOwogIHZhciBkYXk9Y2FjaGVbUlAuZGF5XTsKICBpZighZGF5KXtkYXk9YXdhaXQgZmV0Y2hSaWRlRGF5RGF0YSh2LFJQLmRheSk7Y2FjaGVbUlAuZGF5XT1kYXl8fHtlbXB0eTp0cnVlfX0KICB2YXIgcmlkZXM9cnBEYXlSaWRlcyhkYXkpOwogIGlmKCFyaWRlcy5sZW5ndGgpewogICAgdmFyIGFsdD1hd2FpdCBycEZpbmRSZWNlbnREYXkodixSUC5kYXkpOwogICAgaWYoYWx0KXtSUC5kYXk9cmlkZU5vcm1EYXkoYWx0LmRheVRpbWUpO2NhY2hlW1JQLmRheV09YWx0O3JpZGVzPXJwRGF5UmlkZXMoYWx0KTskKCJycFRpdGxlIikudGV4dENvbnRlbnQ9Zm10RG90KFJQLmRheSkrIiDpqpHooYzlm57mlL4ifQogIH0KICBpZighcmlkZXMubGVuZ3RoKXskKCJycE1hcCIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiIHN0eWxlPSJwYWRkaW5nLXRvcDo3MHB4Ij7or6Xml6XmsqHmnInlj6/lm57mlL7nmoTovajov7k8L2Rpdj4nOyQoInJwU3ViIikudGV4dENvbnRlbnQ9IuaXoOi9qOi/uSI7cmV0dXJufQogIFJQLnJpZGVzPXJpZGVzOwogICQoInJwUmlkZXMiKS5pbm5lckhUTUw9cmlkZXMubWFwKGZ1bmN0aW9uKHIsaSl7CiAgICB2YXIgaG09U3RyaW5nKHIuc3RhcnRUaW1lfHwiIikuc2xpY2UoMTEsMTYpOwogICAgcmV0dXJuICc8c3BhbiBjbGFzcz0icnAtY2hpcCcrKGk9PT0wPycgb24nOicnKSsnIiBkYXRhLWk9IicraSsnIiBvbmNsaWNrPSJzZWxlY3RSZXBsYXlSaWRlKHRoaXMuZGF0YXNldC5pKSI+Jytlc2MoaG18fCItLTotLSIpKycgwrcgJysoTnVtYmVyKHIucmlkZU1pbGVhZ2UpfHwwKS50b0ZpeGVkKDEpKydrbTwvc3Bhbj4nOwogIH0pLmpvaW4oIiIpOwogIHNlbGVjdFJlcGxheVJpZGUoMCk7Cn0KZnVuY3Rpb24gc2VsZWN0UmVwbGF5UmlkZShpKXsKICBpPU51bWJlcihpKXx8MDsKICBSUC5pZHg9aTtSUC5wbGF5aW5nPWZhbHNlO1JQLnByb2c9MDtjYW5jZWxBbmltYXRpb25GcmFtZShSUC5yYWYpOwogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIiNycFJpZGVzIC5ycC1jaGlwIikuZm9yRWFjaChmdW5jdGlvbihlbCl7ZWwuY2xhc3NMaXN0LnRvZ2dsZSgib24iLE51bWJlcihlbC5kYXRhc2V0LmkpPT09aSl9KTsKICB2YXIgcj1SUC5yaWRlc1tpXXx8e307CiAgUlAucmlkZT1yOwogIFJQLnB0cz1yaWRlUGFyc2VUcmFjayhyLnRyYWplY3Rvcnl8fCIiKTsKICBpZihSUC5wdHMubGVuZ3RoPDIpeyQoInJwTWFwIikuaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJlbXB0eSIgc3R5bGU9InBhZGRpbmctdG9wOjcwcHgiPui9qOi/ueeCueS4jei2szwvZGl2Pic7cmV0dXJufQogIFJQLmR1cj1NYXRoLm1heCgxMDAwLFJQLnB0c1tSUC5wdHMubGVuZ3RoLTFdLnQtUlAucHRzWzBdLnQpOwogICQoInJwU3ViIikudGV4dENvbnRlbnQ9U3RyaW5nKHIuc3RhcnRUaW1lfHwiIikrIiDihpIgIitTdHJpbmcoci5lbmRUaW1lfHwiIikuc2xpY2UoMTEsMTYpOwogIHZhciBrbT1OdW1iZXIoci5yaWRlTWlsZWFnZSl8fDAsbXg9TnVtYmVyKHIubWF4U3BlZWQpfHwwLGJlbmQ9cmlkZUNvdW50QmVuZHMoUlAucHRzKSxicms9cmlkZUNvdW50QnJha2VzKFJQLnB0cyksbWluPU1hdGgubWF4KDEsTWF0aC5yb3VuZChSUC5kdXIvNjAwMDApKTsKICAkKCJycFN0YXRzIikuaW5uZXJIVE1MPQogICAgJzxkaXYgY2xhc3M9InJkZyI+PGI+JytrbS50b0ZpeGVkKDEpKyc8c21hbGw+a208L3NtYWxsPjwvYj48c3Bhbj7ph4znqIs8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJyZGciPjxiPicrbWluKyc8c21hbGw+bWluPC9zbWFsbD48L2I+PHNwYW4+5pe26ZW/PC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0icmRnIj48Yj4nK01hdGgucm91bmQobXgpKyc8c21hbGw+a20vaDwvc21hbGw+PC9iPjxzcGFuPuaegemAnzwvc3Bhbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9InJkZyI+PGI+JysoYmVuZCticmspKyc8c21hbGw+5qyhPC9zbWFsbD48L2I+PHNwYW4+5Y6L5byvK+aApeWIuTwvc3Bhbj48L2Rpdj4nOwogIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpe2RyYXdSZXBsYXkoKTtycFVwZGF0ZSgwKTtycFBsYXkodHJ1ZSl9KTsKfQpmdW5jdGlvbiBycE1lcmNYKGxvbil7cmV0dXJuIChsb24rMTgwKS8zNjB9CmZ1bmN0aW9uIHJwTWVyY1kobGF0KXt2YXIgcz1NYXRoLnNpbihsYXQqTWF0aC5QSS8xODApO3M9TWF0aC5tYXgoLTAuOTk5OSxNYXRoLm1pbigwLjk5OTkscykpO3JldHVybiAuNS1NYXRoLmxvZygoMStzKS8oMS1zKSkvKDQqTWF0aC5QSSl9CmZ1bmN0aW9uIGRyYXdSZXBsYXkoKXsKICB2YXIgYm94PSQoInJwTWFwIik7aWYoIWJveHx8IVJQLnB0cy5sZW5ndGgpcmV0dXJuOwogIHZhciB3PWJveC5jbGllbnRXaWR0aHx8MzIwLGg9Ym94LmNsaWVudEhlaWdodHx8MzIwOwogIHZhciBtaW5Mb249SW5maW5pdHksbWF4TG9uPS1JbmZpbml0eSxtaW5MYXQ9SW5maW5pdHksbWF4TGF0PS1JbmZpbml0eTsKICBSUC5wdHMuZm9yRWFjaChmdW5jdGlvbihwKXtpZihwLmxvbjxtaW5Mb24pbWluTG9uPXAubG9uO2lmKHAubG9uPm1heExvbiltYXhMb249cC5sb247aWYocC5sYXQ8bWluTGF0KW1pbkxhdD1wLmxhdDtpZihwLmxhdD5tYXhMYXQpbWF4TGF0PXAubGF0fSk7CiAgdmFyIGN4PShycE1lcmNYKG1pbkxvbikrcnBNZXJjWChtYXhMb24pKS8yLGN5PShycE1lcmNZKG1pbkxhdCkrcnBNZXJjWShtYXhMYXQpKS8yOwogIHZhciB6PTMsd29ybGQ9MjU2Kk1hdGgucG93KDIseik7CiAgZm9yKHZhciB6ej0xNzt6ej49Mzt6ei0tKXsKICAgIHZhciB3ZD0yNTYqTWF0aC5wb3coMix6eik7CiAgICBpZigocnBNZXJjWChtYXhMb24pLXJwTWVyY1gobWluTG9uKSkqd2Q8PXctNTYmJihycE1lcmNZKG1pbkxhdCktcnBNZXJjWShtYXhMYXQpKSp3ZDw9aC01Nil7ej16ejt3b3JsZD13ZDticmVha30KICB9CiAgdmFyIGxlZnQ9Y3gqd29ybGQtdy8yLHRvcD1jeSp3b3JsZC1oLzI7CiAgZnVuY3Rpb24gcHgocCl7cmV0dXJuIFtycE1lcmNYKHAubG9uKSp3b3JsZC1sZWZ0LHJwTWVyY1kocC5sYXQpKndvcmxkLXRvcF19CiAgdmFyIHRpbGVzPSIiOwogIHZhciB0eDA9TWF0aC5mbG9vcihsZWZ0LzI1NiksdHgxPU1hdGguZmxvb3IoKGxlZnQrdykvMjU2KSx0eTA9TWF0aC5mbG9vcih0b3AvMjU2KSx0eTE9TWF0aC5mbG9vcigodG9wK2gpLzI1Nik7CiAgZm9yKHZhciB0eD10eDA7dHg8PXR4MTt0eCsrKWZvcih2YXIgdHk9dHkwO3R5PD10eTE7dHkrKyl7CiAgICBpZih0eTwwfHx0eT49TWF0aC5wb3coMix6KSljb250aW51ZTsKICAgIHZhciBzZD0oKHR4K3R5KSU0KSsxOwogICAgdGlsZXMrPSc8aW1nIHNyYz0iaHR0cHM6Ly93ZWJyZDAnK3NkKycuaXMuYXV0b25hdmkuY29tL2FwcG1hcHRpbGU/bGFuZz16aF9jbiZzaXplPTEmc2NhbGU9MSZzdHlsZT04Jng9Jyt0eCsnJnk9Jyt0eSsnJno9Jyt6KyciIHN0eWxlPSJsZWZ0OicrKHR4KjI1Ni1sZWZ0KSsncHg7dG9wOicrKHR5KjI1Ni10b3ApKydweCIgb25lcnJvcj0idGhpcy5yZW1vdmUoKSI+JzsKICB9CiAgdmFyIGxpbmU9UlAucHRzLm1hcChmdW5jdGlvbihwKXt2YXIgcT1weChwKTtyZXR1cm4gcVswXS50b0ZpeGVkKDEpKyIgIitxWzFdLnRvRml4ZWQoMSl9KTsKICB2YXIgZD0iTSIrbGluZS5qb2luKCJMIik7CiAgdmFyIGE9cHgoUlAucHRzWzBdKSxiPXB4KFJQLnB0c1tSUC5wdHMubGVuZ3RoLTFdKTsKICBib3guaW5uZXJIVE1MPSc8ZGl2IGNsYXNzPSJycC10aWxlcyI+Jyt0aWxlcysnPC9kaXY+JysKICAgICc8c3ZnIGlkPSJycFN2ZyIgdmlld0JveD0iMCAwICcrdysnICcraCsnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InJwZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPjxzdG9wIG9mZnNldD0iLjU1IiBzdG9wLWNvbG9yPSIjMkJENEYyIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkYyQkQ2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+JysKICAgICc8cGF0aCBkPSInK2QrJyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDQzLDIxMiwyNDIsLjEzKSIgc3Ryb2tlLXdpZHRoPSIxNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+JysKICAgICc8cGF0aCBkPSInK2QrJyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDQzLDIxMiwyNDIsLjMyKSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4nKwogICAgJzxwYXRoIGlkPSJycFByb2ciIGQ9IicrZCsnIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjcnBnKSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4nKwogICAgJzxjaXJjbGUgY3g9IicrYVswXS50b0ZpeGVkKDEpKyciIGN5PSInK2FbMV0udG9GaXhlZCgxKSsnIiByPSI3IiBmaWxsPSIjM0REQzk3IiBzdHJva2U9IiMwNjEyMUMiIHN0cm9rZS13aWR0aD0iMyIvPicrCiAgICAnPGNpcmNsZSBjeD0iJytiWzBdLnRvRml4ZWQoMSkrJyIgY3k9IicrYlsxXS50b0ZpeGVkKDEpKyciIHI9IjciIGZpbGw9IiNGRjJCRDYiIHN0cm9rZT0iIzA2MTIxQyIgc3Ryb2tlLXdpZHRoPSIzIi8+JysKICAgICc8Y2lyY2xlIGlkPSJycERvdCIgY3g9IicrYVswXS50b0ZpeGVkKDEpKyciIGN5PSInK2FbMV0udG9GaXhlZCgxKSsnIiByPSI2IiBmaWxsPSIjZmZmIiBzdHJva2U9IiMyQkQ0RjIiIHN0cm9rZS13aWR0aD0iMyIvPjwvc3ZnPicrCiAgICAnPGRpdiBjbGFzcz0icnAtc3BlZWQiIGlkPSJycFNwZWVkIj4wIGttL2g8L2Rpdj48ZGl2IGNsYXNzPSJycC1hdHRyIj7CqSDpq5jlvrflnLDlm748L2Rpdj4nOwogIHZhciBwcm9nPSQoInJwUHJvZyIpO1JQLnBhdGg9cHJvZztSUC5sZW49cHJvZy5nZXRUb3RhbExlbmd0aCgpOwogIHByb2cuc3R5bGUuc3Ryb2tlRGFzaGFycmF5PVJQLmxlbjtwcm9nLnN0eWxlLnN0cm9rZURhc2hvZmZzZXQ9UlAubGVuOwogIFJQLmRvdD0kKCJycERvdCIpOwp9CmZ1bmN0aW9uIHJwVXBkYXRlKHByb2cpewogIFJQLnByb2c9TWF0aC5tYXgoMCxNYXRoLm1pbigxLE51bWJlcihwcm9nKXx8MCkpOwogIGlmKFJQLnBhdGgmJlJQLmxlbj4wKXsKICAgIFJQLnBhdGguc3R5bGUuc3Ryb2tlRGFzaG9mZnNldD1SUC5sZW4qKDEtUlAucHJvZyk7CiAgICB0cnl7dmFyIHB0PVJQLnBhdGguZ2V0UG9pbnRBdExlbmd0aChSUC5sZW4qUlAucHJvZyk7aWYoUlAuZG90KXtSUC5kb3Quc2V0QXR0cmlidXRlKCJjeCIscHQueCk7UlAuZG90LnNldEF0dHJpYnV0ZSgiY3kiLHB0LnkpfX1jYXRjaChlKXt9CiAgfQogIHZhciBpZHg9UlAucHRzLmxlbmd0aD9NYXRoLm1pbihSUC5wdHMubGVuZ3RoLTEsTWF0aC5yb3VuZChSUC5wcm9nKihSUC5wdHMubGVuZ3RoLTEpKSk6MDsKICB2YXIgcD1SUC5wdHNbaWR4XXx8e3Y6MCx0OjB9OwogIGlmKCQoInJwU3BlZWQiKSkkKCJycFNwZWVkIikudGV4dENvbnRlbnQ9TWF0aC5yb3VuZChOdW1iZXIocC52KXx8MCkrIiBrbS9oIjsKICBpZigkKCJycFRpbWUiKSkkKCJycFRpbWUiKS5pbm5lckhUTUw9Zm10Q2xvY2socC50KSsnPHNwYW4+JysoUlAucHRzLmxlbmd0aD9mbXRDbG9jayhSUC5wdHNbUlAucHRzLmxlbmd0aC0xXS50KToiLS0iKSsnPC9zcGFuPic7CiAgaWYoJCgicnBQcm9ncmVzcyIpKSQoInJwUHJvZ3Jlc3MiKS52YWx1ZT1NYXRoLnJvdW5kKFJQLnByb2cqMTAwMCk7Cn0KZnVuY3Rpb24gZm10Q2xvY2sobXMpe3ZhciBkPW5ldyBEYXRlKE51bWJlcihtcyl8fDApO3JldHVybiBTdHJpbmcoZC5nZXRIb3VycygpKS5wYWRTdGFydCgyLCIwIikrIjoiK1N0cmluZyhkLmdldE1pbnV0ZXMoKSkucGFkU3RhcnQoMiwiMCIpKyI6IitTdHJpbmcoZC5nZXRTZWNvbmRzKCkpLnBhZFN0YXJ0KDIsIjAiKX0KZnVuY3Rpb24gcnBUb2dnbGUoKXsKICBpZighUlAucHRzLmxlbmd0aClyZXR1cm47CiAgaWYoUlAucHJvZz49MSl7cnBVcGRhdGUoMCk7cnBQbGF5KHRydWUpO3JldHVybn0KICBycFBsYXkoIVJQLnBsYXlpbmcpOwp9CmZ1bmN0aW9uIHJwUGxheShvbil7CiAgUlAucGxheWluZz0hIW9uOwogIGlmKCQoInJwUGxheUljb24iKSkkKCJycFBsYXlJY29uIikudGV4dENvbnRlbnQ9b24/IuKdmuKdmiI6IuKWtiI7CiAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoUlAucmFmKTsKICBpZighb24pcmV0dXJuOwogIFJQLmxhc3Q9MDsKICB2YXIgc3RlcD1mdW5jdGlvbih0cyl7CiAgICBpZighUlAucGxheWluZylyZXR1cm47CiAgICBpZighUlAubGFzdClSUC5sYXN0PXRzOwogICAgdmFyIGR0PSh0cy1SUC5sYXN0KS8xMDAwO1JQLmxhc3Q9dHM7CiAgICB2YXIgbng9UlAucHJvZytkdCpSUC5zcGVlZC8oUlAuZHVyLzEwMDApOwogICAgaWYobng+PTEpe3JwVXBkYXRlKDEpO3JwUGxheShmYWxzZSk7cmV0dXJufQogICAgcnBVcGRhdGUobngpOwogICAgUlAucmFmPXJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwKTsKICB9OwogIFJQLnJhZj1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcCk7Cn0KZnVuY3Rpb24gcnBTZWVrKHYpe3JwUGxheShmYWxzZSk7cnBVcGRhdGUoTnVtYmVyKHYpLzEwMDApfQpmdW5jdGlvbiBycFNwZWVkKGspewogIFJQLnNwZWVkPU51bWJlcihrKXx8MTsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjcnBTcGQgaSIpLmZvckVhY2goZnVuY3Rpb24oZWwpe2VsLmNsYXNzTGlzdC50b2dnbGUoIm9uIixOdW1iZXIoZWwuZGF0YXNldC5zKT09PVJQLnNwZWVkKX0pOwp9CmZ1bmN0aW9uIHJwUG9zdGVyKCl7CiAgaWYoIVJQLnB0cy5sZW5ndGgpe3RvYXN0KCLmmoLml6Dlj6/nlJ/miJDnmoTovajov7kiLCJlcnIiKTtyZXR1cm59CiAgdHJ5ewogICAgdmFyIFc9NzUwLEg9MTE4MCxjPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImNhbnZhcyIpO2Mud2lkdGg9VztjLmhlaWdodD1IOwogICAgdmFyIGc9Yy5nZXRDb250ZXh0KCIyZCIpOwogICAgdmFyIGJnPWcuY3JlYXRlTGluZWFyR3JhZGllbnQoMCwwLFcsSCk7YmcuYWRkQ29sb3JTdG9wKDAsIiMwQzJBM0MiKTtiZy5hZGRDb2xvclN0b3AoLjUyLCIjMDgxNjI1Iik7YmcuYWRkQ29sb3JTdG9wKDEsIiMwQjA3MTQiKTsKICAgIGcuZmlsbFN0eWxlPWJnO2cuZmlsbFJlY3QoMCwwLFcsSCk7CiAgICB2YXIgZ2w9Zy5jcmVhdGVSYWRpYWxHcmFkaWVudChXKi44Miw5MCwwLFcqLjgyLDkwLDU2MCk7Z2wuYWRkQ29sb3JTdG9wKDAsInJnYmEoNDMsMjEyLDI0MiwuMjIpIik7Z2wuYWRkQ29sb3JTdG9wKDEsInJnYmEoNDMsMjEyLDI0MiwwKSIpOwogICAgZy5maWxsU3R5bGU9Z2w7Zy5maWxsUmVjdCgwLDAsVyw2MjApOwogICAgZy5zdHJva2VTdHlsZT0icmdiYSgxNDYsMTcwLDIwNSwuMDcpIjtnLmxpbmVXaWR0aD0xOwogICAgZm9yKHZhciB4PTA7eDxXO3grPTQyKXtnLmJlZ2luUGF0aCgpO2cubW92ZVRvKHgsMCk7Zy5saW5lVG8oeCxIKTtnLnN0cm9rZSgpfQogICAgZm9yKHZhciB5PTA7eTxIO3krPTQyKXtnLmJlZ2luUGF0aCgpO2cubW92ZVRvKDAseSk7Zy5saW5lVG8oVyx5KTtnLnN0cm9rZSgpfQogICAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTsKICAgIGcuZmlsbFN0eWxlPSIjMkJENEYyIjtnLmZvbnQ9JzkwMCAyNnB4IC1hcHBsZS1zeXN0ZW0sIlBpbmdGYW5nIFNDIixzYW5zLXNlcmlmJztnLmZpbGxUZXh0KCJaRUVITyIsNTYsODQpOwogICAgZy5maWxsU3R5bGU9IiM1RTZFODgiO2cuZm9udD0nODAwIDEzcHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoIlJJREUgUkVDT1JEIiw1NiwxMDYpOwogICAgZy5maWxsU3R5bGU9IiNFQUYxRkIiO2cuZm9udD0nOTAwIDQ2cHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoIuWfjuW4gumqkeihjOiusOW9lSIsNTYsMTg4KTsKICAgIGcuZmlsbFN0eWxlPSIjOTNBMEI4IjtnLmZvbnQ9JzcwMCAxOHB4IC1hcHBsZS1zeXN0ZW0sIlBpbmdGYW5nIFNDIixzYW5zLXNlcmlmJzsKICAgIGcuZmlsbFRleHQoU3RyaW5nKFJQLmRheXx8IiIpLnJlcGxhY2UoL1wuL2csIi4iKSsiIMK3ICIrKHYuYWRkcmVzc3x8IuaegeaguCBaRUVITyIpLDU2LDIyNCk7CiAgICB2YXIgYng9NDIsYnk9MjcyLGJ3PVctODQsYmg9NTIwOwogICAgZy5maWxsU3R5bGU9InJnYmEoNiwxNCwyNiwuNTUpIjtnLmZpbGxSZWN0KGJ4LGJ5LGJ3LGJoKTsKICAgIGcuc3Ryb2tlU3R5bGU9InJnYmEoMTQ2LDE3MCwyMDUsLjE4KSI7Zy5zdHJva2VSZWN0KGJ4LGJ5LGJ3LGJoKTsKICAgIHZhciBtaW5Mb249SW5maW5pdHksbWF4TG9uPS1JbmZpbml0eSxtaW5MYXQ9SW5maW5pdHksbWF4TGF0PS1JbmZpbml0eTsKICAgIFJQLnB0cy5mb3JFYWNoKGZ1bmN0aW9uKHApe2lmKHAubG9uPG1pbkxvbiltaW5Mb249cC5sb247aWYocC5sb24+bWF4TG9uKW1heExvbj1wLmxvbjtpZihwLmxhdDxtaW5MYXQpbWluTGF0PXAubGF0O2lmKHAubGF0Pm1heExhdCltYXhMYXQ9cC5sYXR9KTsKICAgIHZhciBkeD1NYXRoLm1heCgxZS02LG1heExvbi1taW5Mb24pLGR5PU1hdGgubWF4KDFlLTYsbWF4TGF0LW1pbkxhdCkscGFkPTM0OwogICAgdmFyIHNjPU1hdGgubWluKChidy1wYWQqMikvZHgsKGJoLXBhZCoyKS9keSk7CiAgICB2YXIgb3g9YngrKGJ3LWR4KnNjKS8yLG95PWJ5KyhiaC1keSpzYykvMjsKICAgIGZ1bmN0aW9uIHEocCl7cmV0dXJuIFtveCsocC5sb24tbWluTG9uKSpzYyxveSsobWF4TGF0LXAubGF0KSpzY119CiAgICB2YXIgbGc9Zy5jcmVhdGVMaW5lYXJHcmFkaWVudChieCxieSxieCtidyxieStiaCk7bGcuYWRkQ29sb3JTdG9wKDAsIiMwMEYwRkYiKTtsZy5hZGRDb2xvclN0b3AoLjU1LCIjMkJENEYyIik7bGcuYWRkQ29sb3JTdG9wKDEsIiNGRjJCRDYiKTsKICAgIGcubGluZUpvaW49InJvdW5kIjtnLmxpbmVDYXA9InJvdW5kIjsKICAgIGcuYmVnaW5QYXRoKCk7UlAucHRzLmZvckVhY2goZnVuY3Rpb24ocCxpKXt2YXIgdD1xKHApO2k/Zy5saW5lVG8odFswXSx0WzFdKTpnLm1vdmVUbyh0WzBdLHRbMV0pfSk7CiAgICBnLnN0cm9rZVN0eWxlPSJyZ2JhKDQzLDIxMiwyNDIsLjE4KSI7Zy5saW5lV2lkdGg9MTQ7Zy5zdHJva2UoKTsKICAgIGcuYmVnaW5QYXRoKCk7UlAucHRzLmZvckVhY2goZnVuY3Rpb24ocCxpKXt2YXIgdD1xKHApO2k/Zy5saW5lVG8odFswXSx0WzFdKTpnLm1vdmVUbyh0WzBdLHRbMV0pfSk7CiAgICBnLnN0cm9rZVN0eWxlPWxnO2cubGluZVdpZHRoPTY7Zy5zaGFkb3dDb2xvcj0icmdiYSgwLDI0MCwyNTUsLjYpIjtnLnNoYWRvd0JsdXI9MTY7Zy5zdHJva2UoKTtnLnNoYWRvd0JsdXI9MDsKICAgIHZhciBzPXEoUlAucHRzWzBdKSxlPXEoUlAucHRzW1JQLnB0cy5sZW5ndGgtMV0pOwogICAgZy5maWxsU3R5bGU9IiMzRERDOTciO2cuYmVnaW5QYXRoKCk7Zy5hcmMoc1swXSxzWzFdLDgsMCw3KTtnLmZpbGwoKTsKICAgIGcuZmlsbFN0eWxlPSIjRkYyQkQ2IjtnLmJlZ2luUGF0aCgpO2cuYXJjKGVbMF0sZVsxXSw4LDAsNyk7Zy5maWxsKCk7CiAgICB2YXIga209TnVtYmVyKFJQLnJpZGUmJlJQLnJpZGUucmlkZU1pbGVhZ2UpfHwwLG1pbj1NYXRoLm1heCgxLE1hdGgucm91bmQoUlAuZHVyLzYwMDAwKSksbXg9TnVtYmVyKFJQLnJpZGUmJlJQLnJpZGUubWF4U3BlZWQpfHwwLGJlbmQ9cmlkZUNvdW50QmVuZHMoUlAucHRzKSxicms9cmlkZUNvdW50QnJha2VzKFJQLnB0cyk7CiAgICBnLmZpbGxTdHlsZT0iI0VBRjFGQiI7Zy5mb250PSc5MDAgODZweCAtYXBwbGUtc3lzdGVtLCJQaW5nRmFuZyBTQyIsc2Fucy1zZXJpZic7dmFyIF9rbT1rbS50b0ZpeGVkKDEpO2cuZmlsbFRleHQoX2ttLDU2LDg4MCk7dmFyIF9rdz1nLm1lYXN1cmVUZXh0KF9rbSkud2lkdGg7CiAgICBnLmZpbGxTdHlsZT0iIzkzQTBCOCI7Zy5mb250PSc4MDAgMjJweCAtYXBwbGUtc3lzdGVtLCJQaW5nRmFuZyBTQyIsc2Fucy1zZXJpZic7Zy5maWxsVGV4dCgia20iLDU2K19rdysxMCw4ODApOwogICAgdmFyIHN0YXRzPVtbIuaXtumVvyIsbWluKyIgbWluIl0sWyLmnoHpgJ8iLE1hdGgucm91bmQobXgpKyIga20vaCJdLFsi5Y6L5byvIixiZW5kKyIg5qyhIl0sWyLmgKXliLkiLGJyaysiIOasoSJdXTsKICAgIHN0YXRzLmZvckVhY2goZnVuY3Rpb24oaXQsaSl7CiAgICAgIHZhciB4MD01NitpKjE2ODsKICAgICAgZy5maWxsU3R5bGU9IiMyQkQ0RjIiO2cuZm9udD0nOTAwIDMwcHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoaXRbMV0seDAsOTY4KTsKICAgICAgZy5maWxsU3R5bGU9IiM1RTZFODgiO2cuZm9udD0nNzAwIDE1cHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoaXRbMF0seDAsOTk4KTsKICAgIH0pOwogICAgZy5maWxsU3R5bGU9IiM1RTZFODgiO2cuZm9udD0nNzAwIDE0cHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoIuaegeaguCBaRUVITyDCtyDpnaLmnb/nlJ/miJAiLDU2LEgtNDQpOwogICAgZy5maWxsU3R5bGU9IiM5M0EwQjgiO2cuZm9udD0nNzAwIDE0cHggLWFwcGxlLXN5c3RlbSwiUGluZ0ZhbmcgU0MiLHNhbnMtc2VyaWYnO2cuZmlsbFRleHQoU3RyaW5nKG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSkrIi4iK1N0cmluZyhuZXcgRGF0ZSgpLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwiMCIpKyIuIitTdHJpbmcobmV3IERhdGUoKS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIjAiKSxXLTE2MCxILTQ0KTsKICAgIFJQLnBvc3Rlcj1jLnRvRGF0YVVSTCgiaW1hZ2UvcG5nIik7CiAgICAkKCJwb3N0ZXJJbWciKS5zcmM9UlAucG9zdGVyOwogICAgb3BlblNoZWV0KCJwb3N0ZXJTaGVldCIpOwogIH1jYXRjaChlKXt0b2FzdCgi5rW35oql55Sf5oiQ5aSx6LSlIiwiZXJyIil9Cn0KZnVuY3Rpb24gc2F2ZVBvc3RlcigpewogIGlmKCFSUC5wb3N0ZXIpe3RvYXN0KCLor7flhYjnlJ/miJDmtbfmiqUiLCJlcnIiKTtyZXR1cm59CiAgdHJ5e2lmKHdpbmRvdy5aZWVob05hdGl2ZSYmdHlwZW9mIFplZWhvTmF0aXZlLnNhdmVJbWFnZT09PSJmdW5jdGlvbiIpe1plZWhvTmF0aXZlLnNhdmVJbWFnZShSUC5wb3N0ZXIpO3JldHVybn19Y2F0Y2goZSl7fQogIHZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImEiKTthLmhyZWY9UlAucG9zdGVyO2EuZG93bmxvYWQ9InplZWhvX3JpZGVfIitTdHJpbmcoUlAuZGF5fHwiIikucmVwbGFjZSgvXC4vZywiLSIpKyIucG5nIjsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO2EuY2xpY2soKTthLnJlbW92ZSgpOwogIHRvYXN0KCLlm77niYflt7LnlJ/miJDvvIzlj6/plb/mjInkv53lrZgiLCJvayIpOwp9CgoKLyogPT09PT0gdjIuMTYuMzMg6aqR6KGM5pyI5oqlID09PT09ICovCnZhciBNQz17Y2FjaGU6e30sa2V5czpbXSxzZWw6IiJ9OwpmdW5jdGlvbiBtb250aEtleXMobil7dmFyIG91dD1bXSxub3c9bmV3IERhdGUoKTtmb3IodmFyIGk9MDtpPG47aSsrKXt2YXIgZD1uZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSxub3cuZ2V0TW9udGgoKS1pLDEpO291dC5wdXNoKGQuZ2V0RnVsbFllYXIoKSsiLiIrU3RyaW5nKGQuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCIwIikpfXJldHVybiBvdXR9CmFzeW5jIGZ1bmN0aW9uIG1vbnRoRGF0YShtb24pewogIGlmKE1DLmNhY2hlW21vbl0pcmV0dXJuIE1DLmNhY2hlW21vbl07CiAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fTsKICBpZighUy5hY2N8fCF2LnZpbk5vKXJldHVybiB7fTsKICB2YXIgcj1hd2FpdCBhcGkoIi9hcGkvcmlkZS1tb250aD91c2VySWQ9IitlbmNvZGVVUklDb21wb25lbnQoUy5hY2MudXNlcklkKSsiJm1vbnRoPSIrZW5jb2RlVVJJQ29tcG9uZW50KG1vbikrIiZ2aW49IitlbmNvZGVVUklDb21wb25lbnQodi52aW5ObykpOwogIHZhciBkPShyJiZyLm9rJiZyLmRhdGEpfHx7fTsKICBNQy5jYWNoZVttb25dPWQ7cmV0dXJuIGQ7Cn0KZnVuY3Rpb24gbW9udGhTdW0obW9uKXsKICB2YXIgZD1NQy5jYWNoZVttb25dfHx7fSxsaXN0PUFycmF5LmlzQXJyYXkoZC5yaWRlUmVjb3JkTGlzdCk/ZC5yaWRlUmVjb3JkTGlzdDpbXTsKICB2YXIga209MCxtaW49MCxkYXlzPTAsbXg9MCxhY2M9MCxicms9MCxiZW5kPTA7CiAgbGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHgpewogICAgdmFyIGs9TnVtYmVyKHgmJngucmlkZU1pbGVhZ2UpfHwwO2ttKz1rOwogICAgbWluKz1OdW1iZXIoeCYmeC5yaWRpbmdUaW1lRGF5VW5pdE1pbnV0ZSl8fDA7CiAgICBpZihrPjApZGF5cysrOwogICAgdmFyIHM9TnVtYmVyKHgmJngubWF4U3BlZWQpfHwwO2lmKHM+bXgpbXg9czsKICAgIGFjYys9TnVtYmVyKHgmJnguYWNjZWxlcmF0aW9uVGltZXNEYXkpfHwwOwogICAgYnJrKz1OdW1iZXIoeCYmeC5icmFrZXNUaW1lc0RheSl8fDA7CiAgICBiZW5kKz1OdW1iZXIoeCYmeC5iZW5kaW5nVGltZXNEYXkpfHwwOwogIH0pOwogIHJldHVybiB7a206TWF0aC5yb3VuZChrbSoxMCkvMTAsbWluOm1pbixkYXlzOmRheXMsbXg6bXgsYWNjOmFjYyxicms6YnJrLGJlbmQ6YmVuZCxsaXN0Omxpc3R9Owp9CmZ1bmN0aW9uIG9wZW5Nb250aGx5KCl7CiAgaWYoIVMuYWNjKXt0b2FzdCgi6K+35YWI5a+85YWl6LSm5Y+3IiwiZXJyIik7cmV0dXJufQogIG9wZW5TaGVldCgibW9udGhTaGVldCIpOwogIE1DLmtleXM9bW9udGhLZXlzKDYpO01DLnNlbD1NQy5rZXlzWzBdOwogICQoIm1vbnRoQ2hpcHMiKS5pbm5lckhUTUw9TUMua2V5cy5tYXAoZnVuY3Rpb24oayl7cmV0dXJuICc8c3BhbiBjbGFzcz0ibW9udGgtY2hpcCcrKGs9PT1NQy5zZWw/JyBvbic6JycpKyciIGRhdGEtbT0iJytrKyciIG9uY2xpY2s9InBpY2tNb250aCh0aGlzLmRhdGFzZXQubSkiPicray5yZXBsYWNlKCIuIiwiLyIpKyc8L3NwYW4+J30pLmpvaW4oIiIpOwogICQoIm1vbnRoQm9keSIpLmlubmVySFRNTD0nPGRpdiBjbGFzcz0iZW1wdHkiPuWKoOi9veS4reKApjwvZGl2Pic7CiAgUHJvbWlzZS5hbGwoTUMua2V5cy5tYXAobW9udGhEYXRhKSkudGhlbihmdW5jdGlvbigpe3JlbmRlck1vbnRoKE1DLnNlbCl9KTsKfQpmdW5jdGlvbiBwaWNrTW9udGgobSl7CiAgTUMuc2VsPW07CiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiI21vbnRoQ2hpcHMgLm1vbnRoLWNoaXAiKS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2UuY2xhc3NMaXN0LnRvZ2dsZSgib24iLGUuZGF0YXNldC5tPT09bSl9KTsKICByZW5kZXJNb250aChtKTsKfQpmdW5jdGlvbiByZW5kZXJNb250aChtb24pewogIHZhciBzPW1vbnRoU3VtKG1vbiksdHJlbmQ9TUMua2V5cy5zbGljZSgpLnJldmVyc2UoKS5tYXAoZnVuY3Rpb24oayl7cmV0dXJuIHtrOmssa206bW9udGhTdW0oaykua219fSk7CiAgdmFyIG1heEttPTE7dHJlbmQuZm9yRWFjaChmdW5jdGlvbih4KXtpZih4LmttPm1heEttKW1heEttPXgua219KTsKICB2YXIgdHJlbmRIdG1sPXRyZW5kLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gJzxkaXYgY2xhc3M9Im1iJysoeC5rPT09bW9uPycgb24nOicnKSsnIj48c3BhbiBjbGFzcz0idiI+JysoeC5rbT4wP01hdGgucm91bmQoeC5rbSk6JycpKyc8L3NwYW4+PGRpdiBjbGFzcz0iYiIgc3R5bGU9ImhlaWdodDonK01hdGgubWF4KDQsTWF0aC5yb3VuZCh4LmttL21heEttKjEwMCkpKyclIj48L2Rpdj48c3BhbiBjbGFzcz0ibCI+JytOdW1iZXIoeC5rLnNsaWNlKDUpKSsn5pyIPC9zcGFuPjwvZGl2Pid9KS5qb2luKCIiKTsKICB2YXIgeT1OdW1iZXIobW9uLnNsaWNlKDAsNCkpLG1tPU51bWJlcihtb24uc2xpY2UoNSw3KSksbmQ9bmV3IERhdGUoeSxtbSwwKS5nZXREYXRlKCk7CiAgdmFyIGJ5PXt9O3MubGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHgpe2J5W1N0cmluZyh4LmRhdGV8fCIiKS5zcGxpdCgiLiIpWzJdfHwiIl09TnVtYmVyKHgucmlkZU1pbGVhZ2UpfHwwfSk7CiAgdmFyIG1heEQ9MTtPYmplY3Qua2V5cyhieSkuZm9yRWFjaChmdW5jdGlvbihrKXtpZihieVtrXT5tYXhEKW1heEQ9Ynlba119KTsKICB2YXIgZGF5c0h0bWw9IiI7CiAgZm9yKHZhciBkPTE7ZDw9bmQ7ZCsrKXt2YXIgdmFsPWJ5W1N0cmluZyhkKS5wYWRTdGFydCgyLCIwIildfHwwO2RheXNIdG1sKz0nPGRpdiBjbGFzcz0ibWQiPjxkaXYgY2xhc3M9ImIiIHN0eWxlPSJoZWlnaHQ6JytNYXRoLm1heCgyLE1hdGgucm91bmQodmFsL21heEQqMTAwKSkrJyUiPjwvZGl2PjxzcGFuIGNsYXNzPSJsIj4nKyhkPT09MXx8ZCU1PT09MHx8ZD09PW5kP2Q6JycpKyc8L3NwYW4+PC9kaXY+J30KICB2YXIgYXZnPXMubWluPjA/KHMua20vKHMubWluLzYwKSk6MDsKICAkKCJtb250aEJvZHkiKS5pbm5lckhUTUw9CiAgICAnPGRpdiBjbGFzcz0ibW9udGgtaGVybyI+PGRpdiBjbGFzcz0ibWgiPjxzcGFuPicrbW9uLnNsaWNlKDAsNCkrJyDlubQgJytOdW1iZXIobW9uLnNsaWNlKDUsNykpKycg5pyIPC9zcGFuPjxlbT4nK3MuZGF5cysnIOWkqemqkeihjDwvZW0+PC9kaXY+JysKICAgICAgJzxkaXYgY2xhc3M9Im1vbnRoLWJpZyBudW0iPicrcy5rbS50b0ZpeGVkKDEpKyc8c21hbGw+a208L3NtYWxsPjwvZGl2PicrCiAgICAgICc8ZGl2IGNsYXNzPSJtb250aC1ncmlkIj4nKwogICAgICAgICc8ZGl2IGNsYXNzPSJjIj48YiBjbGFzcz0ibnVtIj4nKyhzLm1pbj4wP2ZtdER1cihzLm1pbik6Jy0tJykrJzwvYj48c3Bhbj7ml7bplb88L3NwYW4+PC9kaXY+JysKICAgICAgICAnPGRpdiBjbGFzcz0iYyI+PGIgY2xhc3M9Im51bSI+JysoYXZnPjA/YXZnLnRvRml4ZWQoMCk6Jy0tJykrJzwvYj48c3Bhbj7lnYfpgJ8ga20vaDwvc3Bhbj48L2Rpdj4nKwogICAgICAgICc8ZGl2IGNsYXNzPSJjIj48YiBjbGFzcz0ibnVtIj4nKyhzLm14fHwnLS0nKSsnPC9iPjxzcGFuPuaegemAnyBrbS9oPC9zcGFuPjwvZGl2PicrCiAgICAgICc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Im1vbnRoLXNlYyI+PGg0Pui/kSA2IOS4quaciOmHjOeoizwvaDQ+PGRpdiBjbGFzcz0ibW9udGgtYmFycyI+Jyt0cmVuZEh0bWwrJzwvZGl2PjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ibW9udGgtc2VjIj48aDQ+5q+P5pel6YeM56iLPC9oND48ZGl2IGNsYXNzPSJtb250aC1kYXlzIj4nK2RheXNIdG1sKyc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Im1vbnRoLXNlYyI+PGg0PuacrOaciOe0r+iuoSA8c3BhbiBjbGFzcz0ibW9udGgtdHJhY2stc3RhdGUiIGlkPSJtdHRTdGF0ZSI+6L2o6L+56K6h566X5Lit4oCmPC9zcGFuPjwvaDQ+PGRpdiBjbGFzcz0ibW9udGgtdG90YWwiPicrCiAgICAgICc8ZGl2IGNsYXNzPSJjIj48YiBjbGFzcz0ibnVtIiBpZD0ibXR0X2FjYyI+LS08L2I+PHNwYW4+5oCl5Yqg6YCfPC9zcGFuPjwvZGl2PicrCiAgICAgICc8ZGl2IGNsYXNzPSJjIj48YiBjbGFzcz0ibnVtIiBpZD0ibXR0X2JyayI+LS08L2I+PHNwYW4+5oCl5Yi5PC9zcGFuPjwvZGl2PicrCiAgICAgICc8ZGl2IGNsYXNzPSJjIj48YiBjbGFzcz0ibnVtIiBpZD0ibXR0X2JlbmQiPi0tPC9iPjxzcGFuPuWOi+W8rzwvc3Bhbj48L2Rpdj4nKwogICAgJzwvZGl2PjwvZGl2Pic7CiAgZmlsbE1vbnRoVHJhY2sobW9uKTsKfQoKLyogPT09PT0gdjIuMTYuMzMg56e76L2m5o+Q6YaS77yI5Zu05qCP77yJID09PT09ICovCmZ1bmN0aW9uIGdlb0dldCh2aW4pe3RyeXtyZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiemhfZ2VvXyIrdmluKXx8Int9Iil8fHt9fWNhdGNoKGUpe3JldHVybnt9fX0KZnVuY3Rpb24gZ2VvU2F2ZSh2aW4sZyl7dHJ5e2xvY2FsU3RvcmFnZS5zZXRJdGVtKCJ6aF9nZW9fIit2aW4sSlNPTi5zdHJpbmdpZnkoZykpfWNhdGNoKGUpe319CmZ1bmN0aW9uIGdlb0Rpc3RNKGxhdDEsbG5nMSxsYXQyLGxuZzIpewogIHZhciBSPTYzNzEwMDAsZExhdD0obGF0Mi1sYXQxKSpNYXRoLlBJLzE4MCxkTG5nPShsbmcyLWxuZzEpKk1hdGguUEkvMTgwOwogIHZhciBhPU1hdGguc2luKGRMYXQvMikqTWF0aC5zaW4oZExhdC8yKStNYXRoLmNvcyhsYXQxKk1hdGguUEkvMTgwKSpNYXRoLmNvcyhsYXQyKk1hdGguUEkvMTgwKSpNYXRoLnNpbihkTG5nLzIpKk1hdGguc2luKGRMbmcvMik7CiAgcmV0dXJuIFIqMipNYXRoLmF0YW4yKE1hdGguc3FydChhKSxNYXRoLnNxcnQoMS1hKSk7Cn0KZnVuY3Rpb24gY2hlY2tHZW9mZW5jZSh2KXsKICB0cnl7CiAgICBpZighdnx8IXYuaGFzVmVoaWNsZXx8IWhhc0Nvb3JkKHYpKXJldHVybjsKICAgIHZhciB2aW49di52aW5Ob3x8di5jdXJyZW50VmlufHwiIjtpZighdmluKXJldHVybjsKICAgIHZhciBnPWdlb0dldCh2aW4pO2lmKCFnLm9ufHwhZy5sYXR8fCFnLmxuZylyZXR1cm47CiAgICB2YXIgZD1nZW9EaXN0TShOdW1iZXIodi5sYXRpdHVkZSksTnVtYmVyKHYubG9uZ2l0dWRlKSxOdW1iZXIoZy5sYXQpLE51bWJlcihnLmxuZykpOwogICAgdmFyIHI9TnVtYmVyKGcucnx8MzAwKTsKICAgIGlmKGQ+cil7CiAgICAgIGlmKCFnLm91dCl7Zy5vdXQ9dHJ1ZTtnLm91dEF0PURhdGUubm93KCk7Z2VvU2F2ZSh2aW4sZyk7dG9hc3QoIui9pui+huW3suenu+WHuuWbtOagjyAiK01hdGgucm91bmQoZCkrIiDnsbMiLCJlcnIiKTtwb3N0KCIvYXBpL25vdGlmeSIse3VzZXJJZDpTLmFjYyYmUy5hY2MudXNlcklkLHRpdGxlOiLmnoHmoLjnp7vovabmj5DphpIiLGJvZHk6Iui9pui+huW3suenu+WHuuWbtOagj++8jOi3neS4reW/gyAiK01hdGgucm91bmQoZCkrIiDnsbMifSl9CiAgICB9ZWxzZSBpZihnLm91dCl7Zy5vdXQ9ZmFsc2U7Z2VvU2F2ZSh2aW4sZyk7dG9hc3QoIui9pui+huW3suWbnuWIsOWbtOagj+WGhSIsIm9rIil9CiAgfWNhdGNoKGUpe30KfQpmdW5jdGlvbiBnZWFyUmFkaXVzKGVsKXsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIjZ3JwX2dlbyAuZ2VvLXIiKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe3guY2xhc3NMaXN0LnRvZ2dsZSgib24iLHg9PT1lbCl9KTsKfQpmdW5jdGlvbiBnZWFyU2V0R2VvQ2VudGVyKCl7CiAgdmFyIHY9KFMuZGF0YSYmUy5kYXRhLnZlaGljbGUpfHx7fSx2aW49Y3VyVmVoVmluKCk7CiAgaWYoIXZpbil7dG9hc3QoIuivt+WFiOiOt+WPlui9pui+hiIsImVyciIpO3JldHVybn0KICBpZighaGFzQ29vcmQodikpe3RvYXN0KCLmmoLml6DmnInmlYggR1BTIOWdkOaghyIsImVyciIpO3JldHVybn0KICB2YXIgZz1nZW9HZXQodmluKTtnLmxhdD1OdW1iZXIodi5sYXRpdHVkZSk7Zy5sbmc9TnVtYmVyKHYubG9uZ2l0dWRlKTtnLnI9Zy5yfHwzMDA7CiAgZ2VvU2F2ZSh2aW4sZyk7dG9hc3QoIuW3suiusOW9leW9k+WJjeS9jee9ruS4uuWbtOagj+S4reW/gyIsIm9rIik7cmVuZGVyR2VhcigpOwp9CmZ1bmN0aW9uIGdlYXJTYXZlR2VvKCl7CiAgdmFyIHZpbj1jdXJWZWhWaW4oKTtpZighdmluKXt0b2FzdCgi6K+35YWI6I635Y+W6L2m6L6GIiwiZXJyIik7cmV0dXJufQogIHZhciBnPWdlb0dldCh2aW4pOwogIHZhciBvbj0kKCJnX2dlb19vbiIpPyQoImdfZ2VvX29uIikuY2xhc3NMaXN0LmNvbnRhaW5zKCJvbiIpOmZhbHNlOwogIHZhciByYWQ9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcigiI2dycF9nZW8gLmdlby1yLm9uIik7CiAgaWYocmFkKWcucj1OdW1iZXIocmFkLmRhdGFzZXQucil8fDMwMDsKICBpZihvbiYmKCFnLmxhdHx8IWcubG5nKSl7dG9hc3QoIuivt+WFiOeCueOAjOS7peW9k+WJjeS9jee9ruS4uuS4reW/g+OAjSIsImVyciIpO3JldHVybn0KICBnLm9uPW9uO2cub3V0PWZhbHNlOwogIGdlb1NhdmUodmluLGcpO3RvYXN0KCLnp7vovabmj5DphpLlt7Lkv53lrZgiLCJvayIpO3JlbmRlckdlYXIoKTsKfQoKCi8qID09PT09IHYyLjE2LjM0IOmmlumhteaooeWdl+iHquWumuS5iSA9PT09PSAqLwp2YXIgSE9NRV9NT0RfTEFCRUxTPXtxdWljazoi5b+r5o235pON5L2cIixjaGFyZ2U6IuWFheeUtee7n+iuoSIscmlkZToi5pyA6L+R6aqR6KGMIn07CmZ1bmN0aW9uIGRlZmF1bHRIb21lTW9kcygpe3JldHVybiBbe2lkOiJxdWljayIsb246dHJ1ZX0se2lkOiJjaGFyZ2UiLG9uOnRydWV9LHtpZDoicmlkZSIsb246dHJ1ZX1dfQpmdW5jdGlvbiBnZXRIb21lTW9kcygpewogIHRyeXsKICAgIHZhciBhPUpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oInpoX2hvbWVfbW9kc192MSIpfHwiW10iKTsKICAgIGlmKEFycmF5LmlzQXJyYXkoYSkmJmEubGVuZ3RoKXsKICAgICAgYT1hLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geCYmSE9NRV9NT0RfTEFCRUxTW3guaWRdfSk7CiAgICAgIGRlZmF1bHRIb21lTW9kcygpLmZvckVhY2goZnVuY3Rpb24oZCl7aWYoIWEuc29tZShmdW5jdGlvbih4KXtyZXR1cm4geC5pZD09PWQuaWR9KSlhLnB1c2goZCl9KTsKICAgICAgcmV0dXJuIGE7CiAgICB9CiAgfWNhdGNoKGUpe30KICByZXR1cm4gZGVmYXVsdEhvbWVNb2RzKCk7Cn0KZnVuY3Rpb24gc2F2ZUhvbWVNb2RzKG0pe3RyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemhfaG9tZV9tb2RzX3YxIixKU09OLnN0cmluZ2lmeShtKSl9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gYXBwbHlIb21lTW9kdWxlcygpewogIHRyeXsKICAgIHZhciBzZWM9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGFiPSJob21lIl0nKTtpZighc2VjKXJldHVybjsKICAgIHZhciBtYXA9e3F1aWNrOiQoImhvbWVDdHJsIiksY2hhcmdlOiQoImhvbWVDaGFyZ2VTdGF0cyIpLHJpZGU6JCgiaG9tZVJpZGUiKX07CiAgICBnZXRIb21lTW9kcygpLmZvckVhY2goZnVuY3Rpb24obSl7CiAgICAgIHZhciBlbD1tYXBbbS5pZF07aWYoIWVsKXJldHVybjsKICAgICAgZWwuc3R5bGUuZGlzcGxheT1tLm9uPyIiOiJub25lIjsKICAgICAgc2VjLmFwcGVuZENoaWxkKGVsKTsKICAgIH0pOwogIH1jYXRjaChlKXt9Cn0KZnVuY3Rpb24gdG9nZ2xlSG9tZU1vZChlbCl7CiAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgib24iKTsKICB2YXIgbW9kcz1nZXRIb21lTW9kcygpLGlkPWVsLmRhdGFzZXQuaWQ7CiAgbW9kcy5mb3JFYWNoKGZ1bmN0aW9uKG0pe2lmKG0uaWQ9PT1pZCltLm9uPWVsLmNsYXNzTGlzdC5jb250YWlucygib24iKX0pOwogIHNhdmVIb21lTW9kcyhtb2RzKTthcHBseUhvbWVNb2R1bGVzKCk7Cn0KZnVuY3Rpb24gbW92ZUhvbWVNb2QoaWQsZGlyKXsKICB2YXIgbW9kcz1nZXRIb21lTW9kcygpLGk9LTE7CiAgZm9yKHZhciBrPTA7azxtb2RzLmxlbmd0aDtrKyspaWYobW9kc1trXS5pZD09PWlkKWk9azsKICBpZihpPDApcmV0dXJuOwogIHZhciBqPWkrKE51bWJlcihkaXIpfHwwKTsKICBpZihqPDB8fGo+PW1vZHMubGVuZ3RoKXJldHVybjsKICB2YXIgdD1tb2RzW2ldO21vZHNbaV09bW9kc1tqXTttb2RzW2pdPXQ7CiAgc2F2ZUhvbWVNb2RzKG1vZHMpO2FwcGx5SG9tZU1vZHVsZXMoKTtyZW5kZXJHZWFyKCk7Cn0KCi8qID09PT09IHYyLjE2LjM0IOaciOaKpei9qOi/ueiuoeeul+WOi+W8ry/mgKXliLkv5oCl5Yqg6YCfID09PT09ICovCmZ1bmN0aW9uIG1vbnRoVHJhY2tDYWNoZSgpe3RyeXtyZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiemhfbW9udGhfdHJhY2tzX3YyIil8fCJ7fSIpfHx7fX1jYXRjaChlKXtyZXR1cm57fX19CmZ1bmN0aW9uIG1vbnRoVHJhY2tTYXZlKGtleSx2YWwpewogIHRyeXsKICAgIHZhciBtPW1vbnRoVHJhY2tDYWNoZSgpO21ba2V5XT12YWw7CiAgICB2YXIga2V5cz1PYmplY3Qua2V5cyhtKTtpZihrZXlzLmxlbmd0aD4xMilkZWxldGUgbVtrZXlzWzBdXTsKICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCJ6aF9tb250aF90cmFja3NfdjIiLEpTT04uc3RyaW5naWZ5KG0pKTsKICB9Y2F0Y2goZSl7fQp9CmFzeW5jIGZ1bmN0aW9uIG1vbnRoVHJhY2tTdGF0cyhtb24pewogIHZhciB2PShTLmRhdGEmJlMuZGF0YS52ZWhpY2xlKXx8e307CiAgaWYoIVMuYWNjfHwhdi52aW5ObylyZXR1cm4gbnVsbDsKICB2YXIga2V5PVN0cmluZyh2LnZpbk5vKSsifCIrbW9uOwogIHZhciBjYWNoZT1tb250aFRyYWNrQ2FjaGUoKTsKICBpZihjYWNoZVtrZXldJiZjYWNoZVtrZXldLnN0YW1wJiZEYXRlLm5vdygpLWNhY2hlW2tleV0uc3RhbXA8ODY0MDAwMDApcmV0dXJuIGNhY2hlW2tleV07CiAgdmFyIG91dD17YWNjOjAsYnJrOjAsYmVuZDowLGRheXM6MCxzdGFtcDpEYXRlLm5vdygpfTsKICB2YXIgcGc9MSxsYXN0U2lnPSIiLHNlZW49e307CiAgd2hpbGUocGc8PTEwKXsKICAgIHZhciByPWF3YWl0IGFwaSgiL2FwaS9yaWRlLXRyYWNrP3VzZXJJZD0iK2VuY29kZVVSSUNvbXBvbmVudChTLmFjYy51c2VySWQpKyImbW9udGg9IitlbmNvZGVVUklDb21wb25lbnQobW9uKSsiJnZpbj0iK2VuY29kZVVSSUNvbXBvbmVudCh2LnZpbk5vKSsiJnBhZ2U9IitwZysiJnBhZ2VTaXplPTIwIik7CiAgICB2YXIgZGF5cz0ociYmci5kYXlzKXx8W107CiAgICBpZighZGF5cy5sZW5ndGgpYnJlYWs7CiAgICB2YXIgbWluRGF5PW51bGw7CiAgICBkYXlzLmZvckVhY2goZnVuY3Rpb24oZCl7CiAgICAgIHZhciBuZD1yaWRlTm9ybURheShkJiZkLmRheVRpbWUpOwogICAgICBpZighbmQpcmV0dXJuOwogICAgICBpZighbWluRGF5fHxuZDxtaW5EYXkpbWluRGF5PW5kOwogICAgICBpZihuZC5zbGljZSgwLDcpIT09bW9uKXJldHVybjsKICAgICAgaWYoc2VlbltuZF0pcmV0dXJuOwogICAgICBzZWVuW25kXT0xOwogICAgICB2YXIgYT1hbmFseXplUmlkZURheShkKTsKICAgICAgb3V0LmFjYys9YS5hY2NlbGVyYXRpb25UaW1lcztvdXQuYnJrKz1hLmJyYWtlc1RpbWVzO291dC5iZW5kKz1hLmJlbmRpbmdUaW1lcztvdXQuZGF5cysrOwogICAgfSk7CiAgICB2YXIgc2lnPVN0cmluZygoZGF5c1swXSYmZGF5c1swXS5kYXlUaW1lKXx8IiIpKyJ8IitkYXlzLmxlbmd0aDsKICAgIGlmKHNpZz09PWxhc3RTaWcpYnJlYWs7CiAgICBsYXN0U2lnPXNpZzsKICAgIGlmKG1pbkRheSYmbWluRGF5PG1vbisiLjAxIilicmVhazsKICAgIHBnKys7CiAgfQogIG1vbnRoVHJhY2tTYXZlKGtleSxvdXQpOwogIHJldHVybiBvdXQ7Cn0KZnVuY3Rpb24gZmlsbE1vbnRoVHJhY2sobW9uKXsKICB2YXIgc3Q9JCgibXR0U3RhdGUiKTsKICBpZihzdClzdC50ZXh0Q29udGVudD0i6L2o6L+56K6h566X5Lit4oCmIjsKICBtb250aFRyYWNrU3RhdHMobW9uKS50aGVuKGZ1bmN0aW9uKG8pewogICAgaWYoTUMuc2VsIT09bW9uKXJldHVybjsKICAgIGlmKCFvKXtpZihzdClzdC50ZXh0Q29udGVudD0i6L2o6L+55LiN5Y+v55SoIjtyZXR1cm59CiAgICBpZigkKCJtdHRfYWNjIikpJCgibXR0X2FjYyIpLnRleHRDb250ZW50PW8uYWNjOwogICAgaWYoJCgibXR0X2JyayIpKSQoIm10dF9icmsiKS50ZXh0Q29udGVudD1vLmJyazsKICAgIGlmKCQoIm10dF9iZW5kIikpJCgibXR0X2JlbmQiKS50ZXh0Q29udGVudD1vLmJlbmQ7CiAgICBpZihzdClzdC50ZXh0Q29udGVudD0i5oyJ6L2o6L+56K6h566XIMK3ICIrby5kYXlzKyIg5aSpIjsKICB9KS5jYXRjaChmdW5jdGlvbigpe2lmKHN0KXN0LnRleHRDb250ZW50PSLovajov7norqHnrpflpLHotKUifSk7Cn0KCi8qID09PT09IHYyLjE2LjM5IOajgOafpeabtOaWsCAvIOS4i+i9veaWsOeJiCA9PT09PSAqLwp2YXIgVVBEPXt1cmw6IiIsdGFyZ2V0OiIiLGxhdGVzdDpudWxsfTsKZnVuY3Rpb24gdXBJc0lPUygpe3JldHVybiAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCl8fCgvTWFjaW50b3NoL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSYmbmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzPjEpfQpmdW5jdGlvbiB1cFZlckNtcChhLGIpewogIHZhciB4PVN0cmluZyhhfHwiMCIpLnJlcGxhY2UoL152L2ksIiIpLnNwbGl0KCIuIikseT1TdHJpbmcoYnx8IjAiKS5yZXBsYWNlKC9edi9pLCIiKS5zcGxpdCgiLiIpOwogIGZvcih2YXIgaT0wO2k8MztpKyspe3ZhciBwPU51bWJlcih4W2ldfHwwKXx8MCxxPU51bWJlcih5W2ldfHwwKXx8MDtpZihwIT09cSlyZXR1cm4gcD5xPzE6LTF9CiAgcmV0dXJuIDA7Cn0KZnVuY3Rpb24gdXBBcHBWZXIoKXt0cnl7aWYod2luZG93LlplZWhvTmF0aXZlJiZ0eXBlb2YgWmVlaG9OYXRpdmUuYXBwVmVyc2lvbj09PSJmdW5jdGlvbiIpcmV0dXJuIFN0cmluZyhaZWVob05hdGl2ZS5hcHBWZXJzaW9uKCl8fCIiKX1jYXRjaChlKXt9cmV0dXJuIiJ9CmFzeW5jIGZ1bmN0aW9uIGZldGNoTGF0ZXN0SW5mbyhmcmVzaCl7CiAgdmFyIHI9YXdhaXQgYXBpKCIvYXBpL3ZlcnNpb24tY2hlY2siKyhmcmVzaD8iP2ZyZXNoPTEiOiIiKSk7CiAgcmV0dXJuIChyJiZyLm9rKT9yOm51bGw7Cn0KYXN5bmMgZnVuY3Rpb24gY2hlY2tVcGRhdGUobWFudWFsKXsKICBpZihtYW51YWwpdG9hc3QoIuato+WcqOajgOafpeabtOaWsOKApiIpOwogIHZhciByPWF3YWl0IGZldGNoTGF0ZXN0SW5mbyh0cnVlKTsKICBpZighcil7aWYobWFudWFsKXRvYXN0KCLmo4Dmn6Xmm7TmlrDlpLHotKXvvIzor7fnqI3lkI7ph43or5UiLCJlcnIiKTtyZXR1cm59CiAgdmFyIGxhdGVzdD1yLmxhdGVzdHx8e30sY3VyPXVwQXBwVmVyKCksaW9zPXVwSXNJT1MoKSx0YXJnZXQ9aW9zP2xhdGVzdC5pb3M6bGF0ZXN0LmFuZHJvaWQ7CiAgdmFyIGFwcE5ldz1jdXImJnRhcmdldCYmdXBWZXJDbXAodGFyZ2V0LGN1cik+MDsKICB2YXIgc2NyaXB0TmV3PXVwVmVyQ21wKGxhdGVzdC5zY3JpcHR8fCIwIixyLmN1cnJlbnR8fCIwIik+MDsKICBpZighYXBwTmV3JiYhc2NyaXB0TmV3KXsKICAgIGlmKG1hbnVhbCl7CiAgICAgIGlmKCQoInVwZFJvd1R4dCIpKSQoInVwZFJvd1R4dCIpLnRleHRDb250ZW50PSLlt7LmmK/mnIDmlrAg4oC6IjsKICAgICAgdG9hc3QoIuW3suaYr+acgOaWsOeJiOacrCIrKGN1cj8iIHYiK2N1cjoiIiksIm9rIik7CiAgICB9CiAgICByZXR1cm47CiAgfQogIFVQRC5sYXRlc3Q9bGF0ZXN0O1VQRC50YXJnZXQ9U3RyaW5nKHRhcmdldHx8bGF0ZXN0LnNjcmlwdHx8IiIpOwogIFVQRC51cmw9aW9zPyJodHRwczovL2dpdGh1Yi5jb20vY2x1Y2s3OTgvWkVFSE8vcmVsZWFzZXMvZG93bmxvYWQvaW9zLWxhdGVzdC9aZWVob1NpbmdsZVBhbmVsLmlwYSI6Imh0dHBzOi8vZ2l0aHViLmNvbS9jbHVjazc5OC9aRUVITy9yZWxlYXNlcy9kb3dubG9hZC9hbmRyb2lkLWxhdGVzdC9aZWVob1NpbmdsZVBhbmVsLmFwayI7CiAgaWYoJCgidXBkU3ViIikpJCgidXBkU3ViIikudGV4dENvbnRlbnQ9YXBwTmV3PyLlj5HnjrDmlrDniYjmnKzvvIzlu7rorq7mm7TmlrDlkI7lho3kvb/nlKgiOiLlhoXmoLjmnInmlrDniYjmnKzvvIzor7fmm7TmlrAgQXBwIjsKICBpZigkKCJ1cGRDdXIiKSkkKCJ1cGRDdXIiKS50ZXh0Q29udGVudD0oY3VyfHwiLS0iKSsoci5jdXJyZW50PyIgLyDlhoXmoLggIityLmN1cnJlbnQ6IiIpOwogIGlmKCQoInVwZE5ldyIpKSQoInVwZE5ldyIpLnRleHRDb250ZW50PShVUEQudGFyZ2V0fHwiLS0iKSsobGF0ZXN0LnNjcmlwdD8iIC8g5YaF5qC4ICIrbGF0ZXN0LnNjcmlwdDoiIik7CiAgaWYoJCgidXBkTm90ZSIpKSQoInVwZE5vdGUiKS5pbm5lckhUTUw9ZXNjKGxhdGVzdC5ub3RlfHwiIikrKGxhdGVzdC51cGRhdGVkPyI8YnI+5pu05paw5pel5pyfICIrZXNjKGxhdGVzdC51cGRhdGVkKToiIik7CiAgaWYoJCgidXBkUm93VHh0IikpJCgidXBkUm93VHh0IikudGV4dENvbnRlbnQ9IuaWsOeJiOacrCAiK1VQRC50YXJnZXQrIiDigLoiOwogIGNsb3NlU2hlZXQoImdlYXJTaGVldCIpOwogIG9wZW5TaGVldCgidXBkYXRlU2hlZXQiKTsKfQphc3luYyBmdW5jdGlvbiBhdXRvQ2hlY2tVcGRhdGUoKXsKICB0cnl7CiAgICB2YXIgcj1hd2FpdCBmZXRjaExhdGVzdEluZm8oZmFsc2UpO2lmKCFyKXJldHVybjsKICAgIHZhciBsYXRlc3Q9ci5sYXRlc3R8fHt9LGN1cj11cEFwcFZlcigpLHRhcmdldD11cElzSU9TKCk/bGF0ZXN0LmlvczpsYXRlc3QuYW5kcm9pZDsKICAgIGlmKCFjdXJ8fCF0YXJnZXR8fHVwVmVyQ21wKHRhcmdldCxjdXIpPD0wKXJldHVybjsKICAgIHZhciBrZXk9InpoX3VwZF9ub3RpY2VfIit0YXJnZXQ7CiAgICBpZihsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpKXJldHVybjsKICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwiMSIpOwogICAgdG9hc3QoIuWPkeeOsOaWsOeJiOacrCB2Iit0YXJnZXQrIu+8jOiuvue9riDihpIg5YWz5LqOIOKGkiDmo4Dmn6Xmm7TmlrAiLCJpbmZvIik7CiAgICBpZigkKCJ1cGRSb3dUeHQiKSkkKCJ1cGRSb3dUeHQiKS50ZXh0Q29udGVudD0i5paw54mI5pysICIrdGFyZ2V0KyIg4oC6IjsKICB9Y2F0Y2goZSl7fQp9CmZ1bmN0aW9uIGRvd25sb2FkVXBkYXRlKCl7CiAgaWYoIVVQRC51cmwpe3RvYXN0KCLmmoLml6DkuIvovb3lnLDlnYDvvIzor7fliLAgR2l0SHViIFJlbGVhc2VzIOS4i+i9vSIsImVyciIpO3JldHVybn0KICBjbG9zZVNoZWV0KCJ1cGRhdGVTaGVldCIpOwogIG9wZW5FeHRlcm5hbChVUEQudXJsKTsKICB0b2FzdCgi5bey5omT5byA5LiL6L296aG16Z2iIiwib2siKTsKfQoKLyogPT09PT0gdjIuMTYuMjYg6K6+572u6b2/6L2u6Z2i5p2/ID09PT09ICovCnZhciBHST17CiBzaWduOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDJsMi42IDYuMyA2LjguNS01LjIgNC40IDEuNiA2LjZMMTIgMTYuMyA2LjIgMTkuOGwxLjYtNi42TDIuNiA4LjhsNi44LS41eiIvPjwvc3ZnPicsCiBhY2M6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiLz48cGF0aCBkPSJNNCAyMWMwLTQgMy42LTYuNSA4LTYuNVMyMCAxNyAyMCAyMSIvPjwvc3ZnPicsCiBjaGc6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTMgMkw0IDE0aDZsLTEgOCA5LTEyaC02eiIvPjwvc3ZnPicsCiBiZWxsOic8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTE4IDhhNiA2IDAgMSAwLTEyIDBjMCA2LTMgNy0zIDdoMThzLTMtMS0zLTciLz48cGF0aCBkPSJNMTAgMjFhMiAyIDAgMCAwIDQgMCIvPjwvc3ZnPicsCiBnZW86Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMjFzNy02LjEgNy0xMWE3IDcgMCAxIDAtMTQgMGMwIDQuOSA3IDExIDcgMTF6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMi40Ii8+PC9zdmc+JywKIGhvbWU6Jzxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMyAxMGw5LTcgOSA3djEwYTEgMSAwIDAgMS0xIDFoLTV2LTdIOXY3SDRhMSAxIDAgMCAxLTEtMXoiLz48L3N2Zz4nLAogaW5mbzonPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48cGF0aCBkPSJNMTIgMTF2NiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iNy42IiByPSIuNiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+Jwp9OwpmdW5jdGlvbiBvcGVuR2VhcihrZXkpe2lmKGtleSlTLmdlYXJPcGVuPWtleTtyZW5kZXJHZWFyKCk7b3BlblNoZWV0KCJnZWFyU2hlZXQiKX0KZnVuY3Rpb24gZ2VhclRvZ2dsZShrKXtTLmdlYXJPcGVuPVMuZ2Vhck9wZW49PT1rPyIiOms7cmVuZGVyR2VhcigpfQpmdW5jdGlvbiBnZWFyQ2xvc2UoKXtjbG9zZVNoZWV0KCJnZWFyU2hlZXQiKX0KZnVuY3Rpb24gZ2VhclNpZ25pbigpe2Nsb3NlU2hlZXQoImdlYXJTaGVldCIpO2RvU2lnbmluKCl9CmZ1bmN0aW9uIGdlYXJHdWlkZSgpe2Nsb3NlU2hlZXQoImdlYXJTaGVldCIpO29wZW5HdWlkZSgpfQpmdW5jdGlvbiBnZWFyUGhvbmUoKXtjbG9zZVNoZWV0KCJnZWFyU2hlZXQiKTtwaG9uZUxvZ2luVUkoKX0KZnVuY3Rpb24gZ2VhclRva2VuKCl7Y2xvc2VTaGVldCgiZ2VhclNoZWV0Iik7cGFzdGVUb2tlblVJKCl9CmZ1bmN0aW9uIGdlYXJBYm91dCgpe2Nsb3NlU2hlZXQoImdlYXJTaGVldCIpO29wZW5BYm91dCgpfQphc3luYyBmdW5jdGlvbiBnZWFyU2F2ZUNmZygpewogIHZhciBjPVMuY2ZnfHx7fTsKICB2YXIgbmV4dD1PYmplY3QuYXNzaWduKHt9LGMsewogICAgYXV0b1NpZ25pbjokKCJnX3N3X2F1dG8iKT8kKCJnX3N3X2F1dG8iKS5jbGFzc0xpc3QuY29udGFpbnMoIm9uIik6Yy5hdXRvU2lnbmluLAogICAgdmVoaWNsZUFsZXJ0UHVzaDokKCJnX3N3X2FsZXJ0Iik/JCgiZ19zd19hbGVydCIpLmNsYXNzTGlzdC5jb250YWlucygib24iKTpjLnZlaGljbGVBbGVydFB1c2gsCiAgICBjaGFyZ2VEb25lUHVzaDokKCJnX3N3X2NoZ19kb25lIik/JCgiZ19zd19jaGdfZG9uZSIpLmNsYXNzTGlzdC5jb250YWlucygib24iKTpjLmNoYXJnZURvbmVQdXNoCiAgfSk7CiAgdmFyIHI9YXdhaXQgcG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCk7CiAgaWYociYmci5vayl7Uy5jZmc9bmV4dDt0b2FzdCgi6K6+572u5bey5L+d5a2YIiwib2siKTtyZW5kZXJHZWFyKCk7cmVuZGVyU2V0dGluZ3MoKX1lbHNlIHRvYXN0KCLkv53lrZjlpLHotKUiLCJlcnIiKTsKfQphc3luYyBmdW5jdGlvbiBnZWFyU2F2ZUJhcmsoKXsKICBpZighUy5hY2Mpe3RvYXN0KCLor7flhYjlr7zlhaXotKblj7ciLCJlcnIiKTtyZXR1cm59CiAgdmFyIGs9JCgiZ19iYXJrSW4iKT8kKCJnX2JhcmtJbiIpLnZhbHVlLnRyaW0oKToiIjsKICBpZighayl7dG9hc3QoIuivt+i+k+WFpSBCYXJrIEtleSIsImVyciIpO3JldHVybn0KICB2YXIgcj1hd2FpdCBwb3N0KCIvYXBpL3NhdmUtYWNjb3VudHMiLHtsaXN0Olt7dXNlck5hbWU6Uy5hY2MudXNlck5hbWUsdXNlcklkOlMuYWNjLnVzZXJJZCx0b2tlbjpTLmFjYy50b2tlbixiYXJrS2V5Omt9XX0pOwogIGlmKHImJnIub2spe3RvYXN0KCLlt7Lkv53lrZgiLCJvayIpO3JlZnJlc2hBbGwodHJ1ZSl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7Cn0KYXN5bmMgZnVuY3Rpb24gZ2VhckNsZWFyQmFyaygpewogIGlmKCFTLmFjYylyZXR1cm47CiAgdmFyIHI9YXdhaXQgcG9zdCgiL2FwaS9zYXZlLWFjY291bnRzIix7bGlzdDpbe3VzZXJOYW1lOlMuYWNjLnVzZXJOYW1lLHVzZXJJZDpTLmFjYy51c2VySWQsdG9rZW46Uy5hY2MudG9rZW4sYmFya0tleToiIn1dfSk7CiAgaWYociYmci5vayl7dG9hc3QoIuW3sua4hemZpCIsIm9rIik7cmVmcmVzaEFsbCh0cnVlKX0KfQphc3luYyBmdW5jdGlvbiBnZWFyU2F2ZUNoYXJnZSgpewogIHZhciBwPU51bWJlcigoJCgiZ19jaGFyZ2VfcHJpY2UiKXx8e30pLnZhbHVlfHwwKTsKICBpZighKHA+MCkpe3RvYXN0KCLor7fovpPlhaXnlLXku7fvvIjlhYMva1do77yJIiwiZXJyIik7cmV0dXJufQogIHZhciBuZXh0PU9iamVjdC5hc3NpZ24oe30sUy5jZmd8fHt9LHtjaGFyZ2VQcmljZTpwfSk7CiAgdmFyIHI9YXdhaXQgcG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCk7CiAgaWYociYmci5vayl7Uy5jZmc9bmV4dDt0b2FzdCgi55S15Lu35bey5L+d5a2YIiwib2siKTtyZW5kZXJHZWFyKCk7cmVuZGVySG9tZSgpfWVsc2UgdG9hc3QoIuS/neWtmOWksei0pSIsImVyciIpOwp9CmFzeW5jIGZ1bmN0aW9uIGdlYXJTYXZlQW1hcEtleSgpewogIHZhciBrPVN0cmluZygoJCgiZ19hbWFwX2tleSIpfHx7fSkudmFsdWV8fCIiKS50cmltKCk7CiAgdmFyIG5leHQ9T2JqZWN0LmFzc2lnbih7fSxTLmNmZ3x8e30se2FtYXBLZXk6a30pOwogIHZhciByPWF3YWl0IHBvc3QoIi9hcGkvc2F2ZS1jb25maWciLG5leHQpOwogIGlmKHImJnIub2spe1MuY2ZnPW5leHQ7dG9hc3Qoaz8i6auY5b63IEtleSDlt7Lkv53lrZgiOiLlt7LmuIXpmaTpq5jlvrcgS2V5Iiwib2siKTtyZW5kZXJHZWFyKCl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7Cn0KYXN5bmMgZnVuY3Rpb24gZ2VhcldpZGdldEZvbnQodil7CiAgdmFyIHZhbD1OdW1iZXIodil8fDE7CiAgdmFyIG5leHQ9T2JqZWN0LmFzc2lnbih7fSxTLmNmZ3x8e30se3dpZGdldEZvbnQ6dmFsfSk7CiAgdmFyIHI9YXdhaXQgcG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCk7CiAgaWYociYmci5vayl7Uy5jZmc9bmV4dDt0b2FzdCgi5bCP57uE5Lu25a2X5Y+35bey5L+d5a2Y77yM54K55bCP57uE5Lu25Y+z5LiK6KeS5Yi35paw55Sf5pWIIiwib2siKTtyZW5kZXJHZWFyKCl9ZWxzZSB0b2FzdCgi5L+d5a2Y5aSx6LSlIiwiZXJyIik7Cn0KZnVuY3Rpb24gZ2VhclNhdmVCYXR0KCl7CiAgdmFyIHZpbj1jdXJWZWhWaW4oKTsKICBpZighdmluKXt0b2FzdCgi6K+35YWI6I635Y+W6L2m6L6GIiwiZXJyIik7cmV0dXJufQogIHZhciBhaD1OdW1iZXIoKCQoImdfYmF0dF9haCIpfHx7fSkudmFsdWV8fDApLHZmPU51bWJlcigoJCgiZ19iYXR0X3ZmdWxsIil8fHt9KS52YWx1ZXx8MCk7CiAgaWYoIShhaD4wKSl7dG9hc3QoIuivt+i+k+WFpeeUteaxoOWuuemHj++8iEFo77yJIiwiZXJyIik7cmV0dXJufQogIHZhciBtPWJhdHRNYXAoKTtpZih0eXBlb2YgbS5haCE9PSJ1bmRlZmluZWQifHx0eXBlb2YgbS52RnVsbCE9PSJ1bmRlZmluZWQiKW09e307CiAgbVt2aW5dPXthaDphaCx2RnVsbDp2Zj4wP3ZmOjB9OwogIHRyeXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiemhfYmF0dF9jZmciLEpTT04uc3RyaW5naWZ5KG0pKX1jYXRjaChlKXt9CiAgLy8gdjIuMTYuNDcg5ZCM5q2l5Yiw5YaF5qC46YWN572u77yM5L6b5bCP57uE5Lu2L+WunuaXtua0u+WKqOS8sOeul+WFheeUteWJqeS9meaXtumXtAogIHZhciBuZXh0PU9iamVjdC5hc3NpZ24oe30sUy5jZmd8fHt9KTsKICB2YXIgYmNBbGw9T2JqZWN0LmFzc2lnbih7fSwobmV4dC5iYXR0ZXJ5Q2ZnfHx7fSkpOwogIGJjQWxsW3Zpbl09e2FoOmFoLHZGdWxsOnZmPjA/dmY6MH07CiAgbmV4dC5iYXR0ZXJ5Q2ZnPWJjQWxsOwogIFMuY2ZnPW5leHQ7CiAgcG9zdCgiL2FwaS9zYXZlLWNvbmZpZyIsbmV4dCkudGhlbihmdW5jdGlvbihyKXsKICAgIGlmKHImJnIub2spe3RvYXN0KCLnlLXmsaDorr7nva7lt7Lkv53lrZgiLCJvayIpfWVsc2V7dG9hc3QoIuW3suWtmOacrOacuu+8jOacjeWKoeerr+WQjOatpeWksei0pSIsImVyciIpfQogICAgcmVuZGVyR2VhcigpO3JlbmRlckNoYXJnZUNhcmQoKTtyZW5kZXJIb21lKCk7CiAgfSk7Cn0KZnVuY3Rpb24gcmVuZGVyR2VhcigpewogIHZhciBlbD0kKCJnZWFyTGlzdCIpO2lmKCFlbClyZXR1cm47CiAgdmFyIGE9Uy5hY2MsYz1TLmNmZ3x8e30sZD1TLmRhdGF8fHt9OwogIHZhciBiYz1iYXR0Q2ZnKGN1clZlaFZpbigpKTsKICB2YXIgc2Q9ISFkLnNpZ25lZFRvZGF5OwogIHZhciBjb250PW51bShkLmNvbnRpbnVlRGF5cyksdG90YWw9bnVtKGQuc2NvcmUpOwogIHZhciB0b2tCYWQ9ISEoZC50b2tlblZhbGlkPT09ZmFsc2V8fGQuc2NvcmVPaz09PWZhbHNlKTsKICB2YXIgYXBwVmVyPSIiOwogIHRyeXthcHBWZXI9KHdpbmRvdy5aZWVob05hdGl2ZSYmdHlwZW9mIFplZWhvTmF0aXZlLmFwcFZlcnNpb249PT0iZnVuY3Rpb24iKT9TdHJpbmcoWmVlaG9OYXRpdmUuYXBwVmVyc2lvbigpfHwiIik6IiJ9Y2F0Y2goZSl7fQogIHZhciBvcGVuPVMuZ2Vhck9wZW58fCIiOwogIGZ1bmN0aW9uIGdycChrLGljLHRpdGxlLHN1YixyaWdodCxib2R5KXsKICAgIHJldHVybiAnPGRpdiBjbGFzcz0iZ3JwJysob3Blbj09PWs/JyBvbic6JycpKyciIGlkPSJncnBfJytrKyciPicrCiAgICAgICc8ZGl2IGNsYXNzPSJncnAtaGVhZCIgZGF0YS1nPSInK2srJyIgb25jbGljaz0iZ2VhclRvZ2dsZSh0aGlzLmRhdGFzZXQuZykiPicrCiAgICAgICAgJzxkaXYgY2xhc3M9ImdycC1pYyI+JytpYysnPC9kaXY+JysKICAgICAgICAnPGRpdiBjbGFzcz0iZ3JwLXQiPjxiPicrdGl0bGUrJzwvYj48c3Bhbj4nK3N1YisnPC9zcGFuPjwvZGl2PicrCiAgICAgICAgJzxkaXYgY2xhc3M9ImdycC1yIj48c3Bhbj4nK3JpZ2h0Kyc8L3NwYW4+PHNwYW4gY2xhc3M9ImNodiI+4oC6PC9zcGFuPjwvZGl2PicrCiAgICAgICc8L2Rpdj4nKwogICAgICAnPGRpdiBjbGFzcz0iZ3JwLWJvZHkiPjxkaXYgY2xhc3M9ImdycC1ib2R5LWluIj4nK2JvZHkrJzwvZGl2PjwvZGl2PjwvZGl2Pic7CiAgfQogIHZhciBzaWduQm9keT0KICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7ku4rml6XnirbmgIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjonKyhzZD8idmFyKC0tb2spIjoidmFyKC0td2FybikiKSsnIj4nKyhzZD8i5bey562+5YiwICsiK251bShkLnRvZGF5U2NvcmUpOiLmnKrnrb7liLAiKSsnPC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+6L+e57ut562+5YiwPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytjb250Kycg5aSpPC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+5oC756ev5YiGPC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+JysoZC5zY29yZU9rPT09ZmFsc2U/Ii0tIjp0b3RhbCkrJzwvc3Bhbj48L2Rpdj4nKwogICAgc3dSb3coImdfc3dfYXV0byIsIuiHquWKqOetvuWIsCIsIuaJk+W8gOW6lOeUqCAvIOWIsOeCueaXtuiHquWKqOetvuWIsCIsYy5hdXRvU2lnbmluPT09dHJ1ZSkrCiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+562+5Yiw5pe26Ze0PC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytlc2MoYy5hdXRvU2lnbmluVGltZXx8IjA3OjAwIikrJzwvc3Bhbj48L2Rpdj4nKwogICAgJzxidXR0b24gY2xhc3M9ImdidG4iIG9uY2xpY2s9ImdlYXJTYXZlQ2ZnKCkiPuS/neWtmOW8gOWFs+iuvue9rjwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iZ2J0biIgb25jbGljaz0iZ2VhclNpZ25pbigpIj7nq4vljbPnrb7liLDvvIjnrb7liLAgKyDnm7Lnm5IgKyDkupLliqjvvIk8L2J1dHRvbj4nOwogIHZhciBhY2NCb2R5PQogICAgJzxkaXYgY2xhc3M9InJvdyI+PHNwYW4gY2xhc3M9ImsiPuW9k+WJjei0puWPtzwvc3Bhbj48c3BhbiBjbGFzcz0idiI+Jytlc2MoYT8oKGEudXNlck5hbWV8fCLmnoHmoLjotKblj7ciKSsiIMK3IElEICIrKGEudXNlcklkfHwiLS0iKSk6IuacquWvvOWFpSIpKyc8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj5Ub2tlbiDnirbmgIE8L3NwYW4+PHNwYW4gY2xhc3M9InYiIHN0eWxlPSJjb2xvcjonKyh0b2tCYWQ/InZhcigtLXdhcm4pIjoidmFyKC0tb2spIikrJyI+JysoYT8odG9rQmFkPyLpgJrpgZPlvILluLgiOiLmnInmlYgiKToi5pyq5a+85YWlIikrJzwvc3Bhbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImdhY3RzIj48ZGl2IGNsYXNzPSJnYnRuIiBvbmNsaWNrPSJnZWFyR3VpZGUoKSI+5oqT5YyF5pWZ56iLPC9kaXY+PGRpdiBjbGFzcz0iZ2J0biIgb25jbGljaz0iZ2VhclBob25lKCkiPuaJi+acuuWPt+eZu+W9lTwvZGl2PjxkaXYgY2xhc3M9ImdidG4iIG9uY2xpY2s9ImdlYXJUb2tlbigpIj7nspjotLQgVG9rZW48L2Rpdj48L2Rpdj4nKwogICAgKGE/JzxidXR0b24gY2xhc3M9ImdidG4gZGFuZ2VyIiBvbmNsaWNrPSJyZW1vdmVBY2NvdW50KCkiPuenu+mZpOW9k+WJjei0puWPtzwvYnV0dG9uPic6JycpOwogIHZhciBjaGdCb2R5PQogICAgJzxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+55S15rGg5a656YeP77yIQWjvvIk8L2xhYmVsPjxkaXYgY2xhc3M9ImlucCI+PGlucHV0IGlkPSJnX2JhdHRfYWgiIHR5cGU9Im51bWJlciIgaW5wdXRtb2RlPSJkZWNpbWFsIiBwbGFjZWhvbGRlcj0i5L6L5aaCIDMwIiB2YWx1ZT0iJysoYmMuYWh8fCIiKSsnIj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImZpZWxkIj48bGFiZWw+5ruh55S155S15Y6L77yIVu+8iTwvbGFiZWw+PGRpdiBjbGFzcz0iaW5wIj48aW5wdXQgaWQ9ImdfYmF0dF92ZnVsbCIgdHlwZT0ibnVtYmVyIiBpbnB1dG1vZGU9ImRlY2ltYWwiIHBsYWNlaG9sZGVyPSLkvovlpoIgODQiIHZhbHVlPSInKyhiYy52RnVsbHx8IiIpKyciPjwvZGl2PjwvZGl2PicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iZ2J0biIgb25jbGljaz0iZ2VhclNhdmVCYXR0KCkiPuS/neWtmOeUteaxoOiuvue9rjwvYnV0dG9uPicrCiAgICAnPGRpdiBjbGFzcz0iZmllbGQiIHN0eWxlPSJtYXJnaW4tdG9wOjEwcHgiPjxsYWJlbD7nlLXku7fvvIjlhYMva1do77yJPC9sYWJlbD48ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0iZ19jaGFyZ2VfcHJpY2UiIHR5cGU9Im51bWJlciIgaW5wdXRtb2RlPSJkZWNpbWFsIiBwbGFjZWhvbGRlcj0i5L6L5aaCIDAuNiIgdmFsdWU9IicrZXNjKFN0cmluZyhjLmNoYXJnZVByaWNlfHwiIikpKyciPjwvZGl2PjwvZGl2PicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iZ2J0biIgb25jbGljaz0iZ2VhclNhdmVDaGFyZ2UoKSI+5L+d5a2Y55S15Lu3PC9idXR0b24+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6NnB4IiBvbmNsaWNrPSJjbG9zZVNoZWV0KFwnZ2VhclNoZWV0XCcpO29wZW5DaGdNYW4oKSI+PHNwYW4+5omL5Yqo5YWF55S16K6w5b2VPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj7mjInlrp7pmYXotKbljZXorrDkuIDnrJQg4oC6PC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0ibGluay1yb3ciIHN0eWxlPSJtYXJnaW4tdG9wOjZweCIgb25jbGljaz0ib3BlbkNoYXJnZVN0YXRpb25zKCkiPjxzcGFuPumZhOi/keWFheeUteahqTwvc3Bhbj48c3BhbiBjbGFzcz0iciI+55u05rWBIC8g5Lqk5rWBIC8g5Lik6L2uIOKAujwvc3Bhbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImZpZWxkIiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiPjxsYWJlbD7pq5jlvrcgS2V577yI5Y+v6YCJ77yM55So5LqO6Z2i5p2/5YaF5pCc57Si77yJPC9sYWJlbD48ZGl2IGNsYXNzPSJpbnAiPjxpbnB1dCBpZD0iZ19hbWFwX2tleSIgdHlwZT0idGV4dCIgcGxhY2Vob2xkZXI9IumrmOW+t+W8gOaUvuW5s+WPsCBXZWIg5pyN5YqhIEtleSIgdmFsdWU9IicrZXNjKFN0cmluZyhjLmFtYXBLZXl8fCIiKSkrJyI+PHNwYW4gY2xhc3M9ImFjdCIgb25jbGljaz0iZ2VhclNhdmVBbWFwS2V5KCkiPuS/neWtmDwvc3Bhbj48L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhpbnQiPuS4jeWhq+S5n+iDveeUqO+8mueCueW8ueWxgumHjOOAjOmrmOW+t+eci+WunuaXtuS7t+agvOOAjeebtOaOpei3s+mrmOW+t++8jOermeeCueOAgeepuumXsuahqeS4juWunuaXtueUteS7t+eUsemrmOW+t+WxleekuuOAgjwvZGl2Pic7CiAgdmFyIG50Qm9keT0KICAgIHN3Um93KCJnX3N3X2FsZXJ0Iiwi6L2m6L6G5o+Q6YaS5o6o6YCBIiwi6ZyH5YqoIC8g5b+Y5YWz6ZSBIC8g55S15rGg5ouU5Ye6IC8g5L2O55S16YePIixjLnZlaGljbGVBbGVydFB1c2ghPT1mYWxzZSkrCiAgICBzd1JvdygiZ19zd19jaGdfZG9uZSIsIuWFheeUteWujOaIkOaPkOmGkiIsIuWFhea7oeaIluaLlOaequWQjuaPkOekuuacrOasoeWFheWFpeeUtemHjyIsYy5jaGFyZ2VEb25lUHVzaCE9PWZhbHNlKSsKICAgICc8YnV0dG9uIGNsYXNzPSJnYnRuIiBvbmNsaWNrPSJnZWFyU2F2ZUNmZygpIj7kv53lrZjlvIDlhbPorr7nva48L2J1dHRvbj4nKwogICAgJzxkaXYgY2xhc3M9ImZpZWxkIiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4Ij48bGFiZWw+QmFyayBLZXk8L2xhYmVsPjxkaXYgY2xhc3M9ImlucCI+JysKICAgICAgKGEmJmEuYmFya0tleT8nPHNwYW4gc3R5bGU9ImZsZXg6MTtmb250LWZhbWlseTptb25vc3BhY2U7bGV0dGVyLXNwYWNpbmc6MXB4Ij7igKLigKLigKLigKLigKLigKLigKLigKLigKLigKLigKLigKI8L3NwYW4+PHNwYW4gY2xhc3M9ImFjdCIgb25jbGljaz0iZ2VhckNsZWFyQmFyaygpIj7muIXpmaQ8L3NwYW4+JzonPGlucHV0IGlkPSJnX2JhcmtJbiIgcGxhY2Vob2xkZXI9IkJhcmsgS2V5IOaIluiHquW7uuacjeWKoeWZqOWcsOWdgCI+PHNwYW4gY2xhc3M9ImFjdCIgb25jbGljaz0iZ2VhclNhdmVCYXJrKCkiPuS/neWtmDwvc3Bhbj4nKSsKICAgICc8L2Rpdj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9Imxpbmstcm93IiBvbmNsaWNrPSJyZXN0YXJ0TGl2ZUFjdGl2aXR5KCkiPjxzcGFuPumHjeaWsOaYvuekuuWFheeUtea0u+WKqDwvc3Bhbj48c3BhbiBjbGFzcz0iciI+aU9TIOmUgeWxjyAvIOeBteWKqOWymyDigLo8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0ib3BlbkxpdmVBY3Rpdml0eVNldHRpbmdzKCkiPjxzcGFuPuezu+e7n+WunuaXtua0u+WKqOW8gOWFszwvc3Bhbj48c3BhbiBjbGFzcz0iciI+5omT5byA57O757uf6K6+572uIOKAujwvc3Bhbj48L2Rpdj4nKwogICAgJzxkaXYgY2xhc3M9ImhpbnQiPuiLpeeBteWKqOWymyAvIOWunuaXtua0u+WKqOS4gOebtOS4jeaYvuekuu+8muWcqCBUcm9sbFN0b3JlIOmHjOaKiuacrOW6lOeUqOS7juOAjOezu+e7n+OAjeeKtuaAgeWIh+aNouS4uuOAjOeUqOaIt+OAjeeKtuaAge+8jOmHjeWQr+aJi+acuuWQjuWGjeeCueS4iumdouOAjOmHjeaWsOaYvuekuuWFheeUtea0u+WKqOOAjeOAgjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0iaGludCI+562+5Yiw57uT5p6c44CB55uy55uS5aWW5Yqx44CB6L2m6L6G5o+Q6YaS5Lya5o6o6YCB5YiwIEJhcmsgLyDns7vnu5/pgJrnn6XjgII8L2Rpdj4nOwogIHZhciBobT1nZXRIb21lTW9kcygpOwogIHZhciBob21lQm9keT1obS5tYXAoZnVuY3Rpb24obSl7CiAgICByZXR1cm4gJzxkaXYgY2xhc3M9InN3aXRjaC1yb3ciPjxkaXYgY2xhc3M9ImxibCI+PGI+JytIT01FX01PRF9MQUJFTFNbbS5pZF0rJzwvYj48c3Bhbj4nKyhtLmlkPT09InF1aWNrIj8i5a+76L2mIC8g6bij56ybIC8g5Z2Q5Z6rIC8g6ZSBIjptLmlkPT09ImNoYXJnZSI/IuacrOaciOasoeaVsCAvIOeUtemHjyAvIOeUtei0uSI6Ijcg5aSp5p+x54q25Zu+5LiO6L2o6L+55Zue5pS+IikrJzwvc3Bhbj48L2Rpdj4nKwogICAgICAnPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4Ij4nKwogICAgICAgICc8c3BhbiBjbGFzcz0iZ21vdmUiIGRhdGEtaWQ9IicrbS5pZCsnIiBkYXRhLWQ9Ii0xIiBvbmNsaWNrPSJtb3ZlSG9tZU1vZCh0aGlzLmRhdGFzZXQuaWQsdGhpcy5kYXRhc2V0LmQpIj7ihpE8L3NwYW4+JysKICAgICAgICAnPHNwYW4gY2xhc3M9Imdtb3ZlIiBkYXRhLWlkPSInK20uaWQrJyIgZGF0YS1kPSIxIiBvbmNsaWNrPSJtb3ZlSG9tZU1vZCh0aGlzLmRhdGFzZXQuaWQsdGhpcy5kYXRhc2V0LmQpIj7ihpM8L3NwYW4+JysKICAgICAgICAnPGRpdiBjbGFzcz0ic3cnKyhtLm9uPyIgb24iOiIiKSsnIiBkYXRhLWlkPSInK20uaWQrJyIgb25jbGljaz0idG9nZ2xlSG9tZU1vZCh0aGlzKSI+PC9kaXY+JysKICAgICAgJzwvZGl2PjwvZGl2Pic7CiAgfSkuam9pbigiIik7CiAgdmFyIGdwPWdlb0dldChjdXJWZWhWaW4oKSk7CiAgdmFyIGdlb0JvZHk9CiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+5Zu05qCP54q25oCBPC9zcGFuPjxzcGFuIGNsYXNzPSJ2Ij4nKyhncC5vbj8oZ3AubGF0PyLlt7LlvIDlkK8gwrcgIisoZ3Aucnx8MzAwKSsiIOexsyI6IuW3suW8gOWQryDCtyDmnKrorr7nva7kuK3lv4MiKToi5pyq5byA5ZCvIikrJzwvc3Bhbj48L2Rpdj4nKwogICAgc3dSb3coImdfZ2VvX29uIiwi56e76L2m5o+Q6YaSIiwi6L2m6L6G56e75Ye65Zu05qCP5pe25o+Q56S65bm25o6o6YCBIEJhcmsiLGdwLm9uPT09dHJ1ZSkrCiAgICAnPGRpdiBjbGFzcz0ib3B0LXJvdyIgc3R5bGU9Im1hcmdpbi10b3A6NnB4Ij4nK1sxMDAsMzAwLDUwMCwxMDAwXS5tYXAoZnVuY3Rpb24ocil7cmV0dXJuICc8c3BhbiBjbGFzcz0iY2hpcCBnZW8tcicrKE51bWJlcihncC5yfHwzMDApPT09cj8nIG9uJzonJykrJyIgZGF0YS1yPSInK3IrJyIgb25jbGljaz0iZ2VhclJhZGl1cyh0aGlzKSI+JytyKydtPC9zcGFuPid9KS5qb2luKCIiKSsnPC9kaXY+JysKICAgICc8YnV0dG9uIGNsYXNzPSJnYnRuIiBvbmNsaWNrPSJnZWFyU2V0R2VvQ2VudGVyKCkiPuS7peW9k+WJjeS9jee9ruS4uuS4reW/gzwvYnV0dG9uPicrCiAgICAnPGJ1dHRvbiBjbGFzcz0iZ2J0biIgb25jbGljaz0iZ2VhclNhdmVHZW8oKSI+5L+d5a2Y5Zu05qCP6K6+572uPC9idXR0b24+JysKICAgICc8ZGl2IGNsYXNzPSJoaW50Ij7pnaLmnb/miZPlvIDmiJbliLfmlrDml7bmo4DmtYvvvJvnp7vlh7rlm7TmoI/kvJrmj5DnpLrlubbmjqjpgIEgQmFya++8iOmcgOW3sue7keWumiBCYXJrIEtlee+8ieOAgjwvZGl2Pic7CiAgdmFyIGFiQm9keT0KICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7lupTnlKjniYjmnKw8L3NwYW4+PHNwYW4gY2xhc3M9InYgbnVtIj52Jytlc2MoYXBwVmVyfHwiLS0iKSsnPC9zcGFuPjwvZGl2PicrCiAgICAnPGRpdiBjbGFzcz0icm93Ij48c3BhbiBjbGFzcz0iayI+6ISa5pys5YaF5qC4PC9zcGFuPjxzcGFuIGNsYXNzPSJ2IG51bSI+Jytlc2MoUy52ZXJ8fCItLSIpKyc8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0iY2hlY2tVcGRhdGUodHJ1ZSkiPjxzcGFuPuajgOafpeabtOaWsDwvc3Bhbj48c3BhbiBjbGFzcz0iciIgaWQ9InVwZFJvd1R4dCI+dicrZXNjKGFwcFZlcnx8Ii0tIikrJyDigLo8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0ib3BlbkV4dGVybmFsKFwnaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPXCcpIj48c3Bhbj5HaXRIdWIg5LuT5bqTPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj5jbHVjazc5OC9aRUVITyDigLo8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0ib3BlbkV4dGVybmFsKFwnaHR0cHM6Ly9hZmRpYW4uY29tL2EvbHVja3k3OThcJykiPjxzcGFuPueIseWPkeeUtSDCtyDmlK/mjIHkvZzogIU8L3NwYW4+PHNwYW4gY2xhc3M9InIiPmFmZGlhbi5jb20vYS9sdWNreTc5OCDigLo8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJsaW5rLXJvdyIgb25jbGljaz0ib3BlbkV4dGVybmFsKFwnaHR0cHM6Ly9naXRodWIuY29tL2NsdWNrNzk4L1pFRUhPL2lzc3Vlc1wnKSI+PHNwYW4+5Y+N6aaI6Zeu6aKYPC9zcGFuPjxzcGFuIGNsYXNzPSJyIj5HaXRIdWIgSXNzdWVzIOKAujwvc3Bhbj48L2Rpdj4nKwogICAgJzxidXR0b24gY2xhc3M9ImdidG4iIG9uY2xpY2s9ImdlYXJBYm91dCgpIj7lhbPkuo7mnKzlupTnlKg8L2J1dHRvbj4nOwogIHZhciB3Zj1OdW1iZXIoYy53aWRnZXRGb250KXx8MTsKICB2YXIgd2ZOYW1lPXdmPj0xLjM/IueJueWkpyI6d2Y+PTEuMTU/IuWkp+WPtyI6Iuagh+WHhiI7CiAgdmFyIHdmQm9keT0KICAgICc8ZGl2IGNsYXNzPSJyb3ciPjxzcGFuIGNsYXNzPSJrIj7lvZPliY3lrZflj7c8L3NwYW4+PHNwYW4gY2xhc3M9InYiPicrd2ZOYW1lKyc8L3NwYW4+PC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJvcHQtcm93IiBzdHlsZT0ibWFyZ2luLXRvcDo4cHgiPicrCiAgICAgIFtbMSwi5qCH5YeGIl0sWzEuMTUsIuWkp+WPtyJdLFsxLjMsIueJueWkpyJdXS5tYXAoZnVuY3Rpb24oeCl7CiAgICAgICAgcmV0dXJuICc8c3BhbiBjbGFzcz0iY2hpcCcrKE1hdGguYWJzKHdmLXhbMF0pPDAuMDE/JyBvbic6JycpKyciIG9uY2xpY2s9ImdlYXJXaWRnZXRGb250KCcreFswXSsnKSI+Jyt4WzFdKyc8L3NwYW4+JzsKICAgICAgfSkuam9pbigiIikrCiAgICAnPC9kaXY+JysKICAgICc8ZGl2IGNsYXNzPSJoaW50Ij7osIPmlbTmoYzpnaLlsI/nu4Tku7bnmoTlrZflj7fvvJvkv53lrZjlkI7ngrnlsI/nu4Tku7blj7PkuIrop5LliLfmlrDvvIjmiJbnrYnkuIvkuIDmrKHoh6rliqjliLfmlrDvvInnlJ/mlYjjgII8L2Rpdj4nOwogIGVsLmlubmVySFRNTD0KICAgIGdycCgic2lnbiIsR0kuc2lnbiwi562+5Yiw5LiO56ev5YiGIiwoc2Q/IuS7iuaXpeW3suetvuWIsCI6IuS7iuaXpeacquetvuWIsCIpKyIgwrcg6L+e562+ICIrY29udCsiIOWkqSIsKHNkPyIrIitudW0oZC50b2RheVNjb3JlKToi5b6F562+5YiwIiksc2lnbkJvZHkpKwogICAgZ3JwKCJhY2NvdW50IixHSS5hY2MsIui0puWPt+S4juWvvOWFpSIsYT9lc2MoYS51c2VyTmFtZXx8IuaegeaguOi0puWPtyIpOiLmnKrlr7zlhaXotKblj7cgwrcg54K55q2k5a+85YWlIiwoYT8i5bey55m75b2VIjoi5pyq55m75b2VIiksYWNjQm9keSkrCiAgICBncnAoImNoYXJnZSIsR0kuY2hnLCLlhYXnlLXkuI7nlLXmsaAiLCLnlLXmsaDlrrnph48gIisoKGJjLmFofHwwKT4wP2JjLmFoKyIgQWgiOiLmnKrorr7nva4iKSsiIMK3IOWFheeUteWJqeS9meaXtumXtOS8sOeulyIsKChiYy5haHx8MCk+MD8i5bey6K6+572uIjoi5pyq6K6+572uIiksY2hnQm9keSkrCiAgICBncnAoIm5vdGlmeSIsR0kuYmVsbCwi6YCa55+l5LiO5o+Q6YaSIiwi6L2m6L6G5o+Q6YaSICIrKGMudmVoaWNsZUFsZXJ0UHVzaCE9PWZhbHNlPyLlt7LlvIDlkK8iOiLlt7LlhbPpl60iKSsiIMK3IEJhcmsg5o6o6YCBIiwoYSYmYS5iYXJrS2V5PyLlt7Lnu5HlrpoiOiLmnKrnu5HlrpoiKSxudEJvZHkpKwogICAgZ3JwKCJnZW8iLEdJLmdlbywi56e76L2m5o+Q6YaSIiwoZ3Aub24/KGdwLmxhdD8i5bey5byA5ZCvIMK3IOWNiuW+hCAiKyhncC5yfHwzMDApKyIg57GzIjoi5bey5byA5ZCvIMK3IOacquiuvue9ruS4reW/gyIpOiLovabovobnp7vlh7rojIPlm7Tml7bmj5DphpIiKSwoZ3Aub24/IuW3suW8gOWQryI6IuacquW8gOWQryIpLGdlb0JvZHkpKwogICAgZ3JwKCJob21lIixHSS5ob21lLCLpppbpobXmmL7npLoiLCLlv6vmjbfmk43kvZwgLyDlhYXnlLXnu5/orqEgLyDmnIDov5HpqpHooYwg55qE5pi+56S65LiO5o6S5bqPIiwi6Ieq5a6a5LmJIixob21lQm9keSkrCiAgICBncnAoIndpZGdldCIsR0kuaG9tZSwi5qGM6Z2i5bCP57uE5Lu2Iiwi5a2X5Y+3ICIrd2ZOYW1lKyIgwrcg5a6J5Y2TIC8gaU9TIOWwj+e7hOS7tuWQjOatpSIsd2ZOYW1lLHdmQm9keSkrCiAgICBncnAoImFib3V0IixHSS5pbmZvLCLlhbPkuo4iLCLniYjmnKwgIitlc2MoYXBwVmVyfHxTLnZlcnx8Ii0tIikrIiDCtyDlvIDmupDlhY3otLkiLCJ2Iitlc2MoYXBwVmVyfHxTLnZlcnx8Ii0tIiksYWJCb2R5KTsKfQoKLyogPT09PT0gdjIuMTYuMjYg56aB5q2i6ZW/5oyJ6YCJ5oup77yI6L6T5YWl5qGG6Zmk5aSW77yJID09PT09ICovCmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoImNvbnRleHRtZW51IixmdW5jdGlvbihlKXsKICB2YXIgdD1lLnRhcmdldDsKICBpZih0JiYodC50YWdOYW1lPT09IklOUFVUInx8dC50YWdOYW1lPT09IlRFWFRBUkVBIikpcmV0dXJuOwogIGUucHJldmVudERlZmF1bHQoKTsKfSx7cGFzc2l2ZTpmYWxzZX0pOwoKaWYoY2FjaGVMb2FkKCkpe3JlbmRlckhvbWUoKTtyZW5kZXJTaWduaW4oKTtyZW5kZXJDb250cm9sKCk7cmVuZGVyU2V0dGluZ3MoKTtyZW5kZXJHZWFyKCk7dmFyIF9jZD1uZXcgRGF0ZSgpOyQoInN5bmNUeHQiKS50ZXh0Q29udGVudD0i57yT5a2YIMK3ICIrU3RyaW5nKF9jZC5nZXRIb3VycygpKS5wYWRTdGFydCgyLCIwIikrIjoiK1N0cmluZyhfY2QuZ2V0TWludXRlcygpKS5wYWRTdGFydCgyLCIwIikrIiDCtyDmm7TmlrDkuK0iO30KcmVmcmVzaEFsbCh0cnVlKTsKc2V0VGltZW91dChmdW5jdGlvbigpe2F1dG9DaGVja1VwZGF0ZSgpfSw0MDAwKTsKc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtpZihEYXRlLm5vdygpLVMubGFzdD4xMjAwMDApcmVmcmVzaEFsbCh0cnVlKX0sMzAwMDApOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg==";
function __SINGLE_HTML(){ return __appDecodeUtf8(__SINGLE_HTML_B64); }

// 批量执行签到：逐账号签到 + 写运行日志 + 每账号独立 Bark 推送 + 失败重试队列 + 汇总本地通知（v2.14.9）
async function runSigninBatch(targets, cfg, opts) {
  opts = opts || {};
  const results = [];
  for (const acc of targets) {
    const r = await runSigninForAccount(acc, cfg);
    results.push(r);
    // 写入日志
    const _d = new Date();
    const _ds = _d.getFullYear() + "-" + String(_d.getMonth()+1).padStart(2,"0") + "-" + String(_d.getDate()).padStart(2,"0");
    addLog({
      time: _d.toLocaleString("zh-CN", { hour12: false }),
      date: _ds,
      type: "signin",
      userName: r.userName,
      userId: r.userId,
      success: r.success,
      totalGain: r.totalGain,
      signinScore: r.signinScore,
      blindBoxScore: r.blindBoxScore,
      interactScore: r.interactScore,
      continueDays: r.continueDays,
      error: r.error,
      steps: r.steps
    });
    // 每账号独立 Bark：仅签到成功且该账号填了 Bark Key 时推送
    if (r.success && acc.barkKey && String(acc.barkKey).trim()) {
      try {
        const _bt = "极核签到成功 · " + (r.userName || "");
        const _bScore = r.blindBoxScore || 0;
        const _bDay = (r.continueDays || 0) === 0 ? 0 : (((r.continueDays || 0) - 1) % 30) + 1;
        const _bRemain = 30 - _bDay;
        const _bbTxt = _bScore >= 10 ? "盲盒" + _bScore : "距盲盒" + _bRemain + "天";
        const _bb = "今日获得 " + r.totalGain + " 分（签到" + r.signinScore + " / " + _bbTxt + " / 互动" + r.interactScore + "），连签 " + r.continueDays + " 天";
        await barkPush(acc.barkKey, _bt, _bb);
      } catch(e) {}
    }
  }
  // v2.14.9 失败自动重试：记录失败账号队列，下次打开面板/触发签到时若已过间隔则自动补一轮
  try {
    const failedIds = [];
    results.forEach((r, i) => { if (!r.success && targets[i]) failedIds.push(String(targets[i].userId || "")); });
    const cleanIds = failedIds.filter(Boolean);
    if (cleanIds.length) {
      $.setdata(JSON.stringify({ time: Date.now(), userIds: cleanIds }), "zeeho_retry_queue");
      console.log("[重试] " + cleanIds.length + " 个账号签到失败，已入延迟重试队列");
    } else {
      $.setdata("", "zeeho_retry_queue");
    }
  } catch(e) {}
  // v2.14.9 汇总通知（原生本地通知优先，回退全局 Bark）
  if (opts.notify !== false && results.length) {
    try {
      const okN = results.filter(r => r.success).length;
      const failN = results.length - okN;
      const gain = results.reduce((sum, r) => sum + (r.totalGain || 0), 0);
      const t = failN ? "极核签到部分失败" : "极核签到完成";
      const b = results.length + " 个账号：" + okN + " 成功" + (failN ? " / " + failN + " 失败（稍后自动重试）" : "") + "，共 +" + gain + " 积分";
      notifyPush(t, b, cfg);
    } catch(e) {}
  }
  return results;
}

// v2.14.9 失败重试队列检查：距入队已过间隔（默认2分钟）则自动重签一轮（打开面板补签模型）
async function checkRetryQueue(cfg) {
  try {
    const raw = $.getdata("zeeho_retry_queue");
    if (!raw) return null;
    const q = JSON.parse(raw);
    if (!q || !Array.isArray(q.userIds) || !q.userIds.length) return null;
    const delayMs = 2 * 60 * 1000;
    if (Date.now() - (Number(q.time) || 0) < delayMs) return null;
    $.setdata("", "zeeho_retry_queue");
    const accounts = getAccounts();
    const targets = accounts.filter(a => q.userIds.indexOf(String(a.userId)) >= 0);
    if (!targets.length) return null;
    console.log("[重试] 自动重试 " + targets.length + " 个失败账号");
    return await runSigninBatch(targets, cfg, { notify: true });
  } catch(e) { return null; }
}

// ========== v2.14.9 车辆快照（轻量：SOC/续航/龙头锁/离线判断） ==========
async function fetchVehicleSnapshots(acc, cfg, vin) {
  try {
    const query = "vinNo=" + encodeURIComponent(vin);
    const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/app/vehicles/properties/snapshots?" + query, appQueryGetHeaders(acc, query, cfg));
    if (res.code != "10000" || !res.data) return null;
    const props = res.data.iotProperties || [];
    const pick = (id) => props.find(p => String(p.identify || "").toLowerCase() === id.toLowerCase()) || null;
    const socIt = pick("BMSSOC"), mileIt = pick("HMIRidableMile"), lockIt = pick("HeadLockState");
    // 取全部属性中的最新时间戳判断在线（单一属性可能滞后，避免误判离线）
    let ts = 0;
    for (const p of props) { const t = Number(p.time) || 0; if (t > ts) ts = t; }
    return {
      vin: vin,
      soc: socIt ? Number(socIt.value) : null,
      range: mileIt ? Number(mileIt.value) : null,
      headLock: lockIt ? String(lockIt.value) : "",
      ts: ts,
      refreshTime: res.data.refreshTime || "",
      offline: ts > 0 ? (Date.now() - ts > 30 * 60 * 1000) : false
    };
  } catch(e) { return null; }
}

// v2.14.13 监控离线判断：以官方在线状态（TBOX 网络连接状态）为准，而非属性上报时间戳。
// 修复：停放后 TBOX 休眠、属性停报，时间戳很快"过期"，按时间戳判断会在 30 分钟后误报离线（车辆其实正常）。
//   - 官方状态在线 / 停放休眠（sleep/休眠）→ 不离线（停放是正常状态）
//   - 官方状态明确断开（offline/disconnect）→ 离线
//   - 官方状态未知 → 回退属性时间戳但阈值放宽到 2 小时，宁可少报不误报
function isMonitorOffline(onlineStr, ts) {
  const s = String(onlineStr || "").toLowerCase().trim();
  const onVals = ["1", "on", "online", "true", "在线", "已在线", "connected", "normal", "sleep", "休眠"];
  const offVals = ["0", "off", "offline", "false", "离线", "未在线", "已离线", "disconnect", "disconnected"];
  if (s) {
    if (onVals.includes(s)) return false;
    if (offVals.includes(s)) return true;
  }
  // 官方状态未知：回退属性时间戳，阈值放宽到 2 小时，避免停放误报
  if (ts > 0) return (Date.now() - ts) > 120 * 60 * 1000;
  return false;
}

// v2.14.9 车辆监控引擎（打开面板补查模型）：充满/离线状态变化时本地通知，状态记录去重
async function checkVehicleMonitor(cfg) {
  if (!cfg.vehicleMonitor) return;
  try {
    const accounts = getAccounts();
    if (!accounts.length) return;
    let state = {};
    try { state = JSON.parse($.getdata("zeeho_vehmon_state") || "{}"); } catch(e) {}
    for (const acc of accounts) {
      try {
        const list = await fetchVehicleList(acc, cfg);
        if (!list || !list.length) continue;
        const veh = list[0];
        const snap = await fetchVehicleSnapshots(acc, cfg, veh.vinNo);
        if (!snap) continue;
        // 官方在线状态（TBOX）：widgets 接口，取不到则空串，回退时间戳逻辑
        let onlineStr = "";
        try {
          const w = await fetchVehicleWidgets(acc, cfg, veh.vinNo);
          if (w) onlineStr = w.online || "";
        } catch(e) {}
        const offline = isMonitorOffline(onlineStr, snap.ts);
        const key = String(acc.userId || "") + ":" + veh.vinNo;
        const prev = state[key] || {};
        const name = (acc.userName || "") + " · " + (veh.name || veh.vehicleName || veh.vinNo);
        if (snap.soc >= 100 && prev.socFull !== true) {
          // 官方续航字段充满时常为 0/空，兜底按满电 150km 估算
          const fullRange = snap.range || Math.round(snap.soc * 1.5);
          notifyPush("车辆已充满", name + " 电量 " + snap.soc + "%，续航 " + fullRange + " km", cfg);
          state[key] = Object.assign({}, prev, { socFull: true });
        } else if (snap.soc !== null && snap.soc < 100 && prev.socFull === true) {
          state[key] = Object.assign({}, prev, { socFull: false });
        }
        if (offline && prev.offline !== true) {
          notifyPush("车辆离线", name + " TBOX 网络断开（停放休眠不算离线）", cfg);
          state[key] = Object.assign({}, prev, { offline: true });
        } else if (!offline && prev.offline === true) {
          state[key] = Object.assign({}, prev, { offline: false });
        }
      } catch(e) {}
    }
    $.setdata(JSON.stringify(state), "zeeho_vehmon_state");
  } catch(e) {}
}

// v2.14.9 通用：按 userId 找账号（找不到兜底第一个）
function findAccByUserId(userId) {
  const accounts = getAccounts();
  let acc = accounts.find(a => String(a.userId) === String(userId));
  if (!acc && accounts.length) acc = accounts[0];
  return acc || null;
}
// v2.14.9 通用：账号基础请求头
function accHeaders(acc, signH) {
  const ua = randomDeviceUA();   // v2.16.57：每次请求都用新的官方格式指纹
  const h = {
    "Authorization": "Bearer " + cleanToken(acc.token),
    "Content-Type": "application/json;charset=UTF-8",
    "interfaceversion": "2",
    "User-Agent": ua,
    "x-app-info": ua,
    ...signH
  };
  if (acc.userId) h["user_id"] = String(acc.userId);
  return h;
}

// v2.15.5 面板打开维护（响应后后台执行，不阻塞首屏）：
// 定时签到（打开面板补签引擎）+ 失败重试队列 + 车辆监控。
// iOS 原生 App 在「原生直出面板页」后调 /api/panel-open 触发，语义与「打开面板」一致。
async function runPanelOpenMaintenance() {
  if (runPanelOpenMaintenance._running) return;
  runPanelOpenMaintenance._running = true;
  // 定时签到（补签引擎）：设置页开启后，每天首次打开面板且已过设定时间 → 全账号签到一次（日期标记去重）
  try {
    const _cfg0 = getConfig();
    if (_cfg0.autoSignin) {
      const _now = new Date();
      const _today = _now.getFullYear() + "-" + String(_now.getMonth()+1).padStart(2,"0") + "-" + String(_now.getDate()).padStart(2,"0");
      const _hm = String(_now.getHours()).padStart(2,"0") + ":" + String(_now.getMinutes()).padStart(2,"0");
      const _last = ($.getdata("zeeho_autosign_lastdate") || "");
      if (_hm >= _cfg0.autoSigninTime && _last !== _today) {
        $.setdata(_today, "zeeho_autosign_lastdate");
        const _accs = getAccounts();
        if (_accs.length) {
          console.log("[定时签到] 已过 " + _cfg0.autoSigninTime + "，自动补签 " + _accs.length + " 个账号");
          await runSigninBatch(_accs, _cfg0);
        }
      }
    }
  } catch(e) { console.log("[定时签到] 异常: " + e); }
  try { await checkRetryQueue(getConfig()); } catch(e) {}
  try { await checkVehicleMonitor(getConfig()); } catch(e) {}
  try { await pushVehicleAlerts(getConfig()); } catch(e) { console.log("[车辆提醒] 检查异常: " + e); }
  runPanelOpenMaintenance._running = false;
}

// ========== v2.15.6 软件版本检测 ==========
// 上游版本清单：jsDelivr 优先（国内可达），GitHub raw 兜底；本地缓存 6 小时避免频繁请求。
const VERSION_JSON_URLS = [
  "https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/repo/version.json",
  "https://raw.githubusercontent.com/cluck798/ZEEHO/main/repo/version.json"
];
const VERSION_CK = "zeeho_vercheck";
const VERSION_CACHE_MS = 6 * 3600 * 1000;
function verNum(s) {
  const m = String(s || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? (Number(m[1]) * 1000000 + Number(m[2]) * 1000 + Number(m[3])) : 0;
}
async function fetchLatestVersion(force) {
  if (!force) {
    try {
      const cached = $.getdata(VERSION_CK);
      if (cached) {
        const o = JSON.parse(cached);
        if (o && o.ts && (Date.now() - o.ts) < VERSION_CACHE_MS && o.latest && o.latest.script) {
          return { latest: o.latest, cached: true };
        }
      }
    } catch(e) {}
  }
  // v2.16.2 加固：jsDelivr 对 @main 分支文件有最长约 12 小时缓存（曾出现其仍返回 2.15.6，
  // 导致“检查更新”误判为已是最新）。改为两源并发拉取、取版本号更高者：
  // raw 约 5 分钟级更新（新版本发布后能立刻探测到），jsDelivr 兜底国内网络可达性。
  const fetched = await Promise.all(VERSION_JSON_URLS.map(async (u) => {
    try {
      const res = await httpGet(u + "?t=" + Math.floor(Date.now() / 300000), {});
      let o = null;
      if (res && res.script) o = res;
      else if (res && typeof res.raw === "string") { try { o = JSON.parse(res.raw); } catch(e) {} }
      return (o && o.script) ? o : null;
    } catch(e) { return null; }
  }));
  let best = null;
  for (const o of fetched) {
    if (o && (!best || verNum(o.script) > verNum(best.script))) best = o;
  }
  if (best) {
    try { $.setdata(JSON.stringify({ ts: Date.now(), latest: best }), VERSION_CK); } catch(e) {}
    return { latest: best, cached: false };
  }
  return { latest: null, cached: false, error: "版本信息获取失败（网络不可达）" };
}

!(async () => {
  if (typeof $request === "undefined" || !$request) {
    $.log("极核看板增强版：请通过重写规则访问 http://zeeho.box");
    $done();
    return;
  }

  const url = $request.url || "";
  // 自动识别当前入口域名：Loon=http://zeeho.box，QX=http://www.example.com
  try { const _u = new URL(url); PANEL_HOST = _u.origin; } catch (e) {}
  // 极核API请求由前面的autoCapture处理，主入口跳过，避免$done调用两次
  if (url.includes('zeehoev.com')) {
    console.log('[主入口] 跳过非面板请求: ' + url.substring(0, 80));
    return; // autoCapture会调用$done
  }
  const method = ($request.method || "GET").toUpperCase();
  let path = "/";
  try {
    const u = new URL(url);
    path = u.pathname || "/";
  } catch(e) { path = "/"; }

  // ========== 定时签到（补签引擎） ==========
  // 代理脚本无常驻进程，采用"打开面板补签"模型：设置页开启后，
  // 每天首次打开面板且当前时间已过设定时间 → 自动为全部账号执行一次签到（写日志+推Bark，与手动一致）。
  // 以 store 里的日期标记去重，同一天只补一次。
  if (method === "GET" && (path === "/" || path === "")) {
    try {
      const _cfg0 = getConfig();
      if (_cfg0.autoSignin) {
        const _now = new Date();
        const _today = _now.getFullYear() + "-" + String(_now.getMonth()+1).padStart(2,"0") + "-" + String(_now.getDate()).padStart(2,"0");
        const _hm = String(_now.getHours()).padStart(2,"0") + ":" + String(_now.getMinutes()).padStart(2,"0");
        const _last = ($.getdata("zeeho_autosign_lastdate") || "");
        if (_hm >= _cfg0.autoSigninTime && _last !== _today) {
          // 先写标记防并发重复触发
          $.setdata(_today, "zeeho_autosign_lastdate");
          const _accs = getAccounts();
          if (_accs.length) {
            console.log("[定时签到] 已过 " + _cfg0.autoSigninTime + "，自动补签 " + _accs.length + " 个账号");
            await runSigninBatch(_accs, _cfg0);
          }
        }
      }
    } catch(e) { console.log("[定时签到] 异常: " + e); }
  }

  // ========== v2.14.9 打开面板时：失败重试队列 + 车辆监控 ==========
  if (method === "GET" && (path === "/" || path === "")) {
    try { await checkRetryQueue(getConfig()); } catch(e) {}
    try { await checkVehicleMonitor(getConfig()); } catch(e) {}
  }

  // ========== v2.15.5 原生 App 快路径：面板 HTML 由原生直出，用它触发同一套「打开面板」维护 ==========
  // 先立即响应，维护改到响应后后台执行（不再 await 网络任务挡在首屏前面）
  if (method === "GET" && path === "/api/panel-open") {
    sendResp(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" }, '{"ok":true}');
    setTimeout(function(){ runPanelOpenMaintenance(); }, 0);
    return;
  }

  // ========== v2.15.6 API: 软件版本检测（/api/version-check?fresh=1 强制刷新） ==========
  if (method === "GET" && path === "/api/version-check") {
    const force = /fresh=1/.test(url);
    const vr = await fetchLatestVersion(force);
    const cur = SCRIPT_VERSION.replace(/^v/, "");
    const latest = vr.latest || null;
    sendResp(200, { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-cache" }, JSON.stringify({
      ok: !!latest,
      error: vr.error || "",
      cached: !!vr.cached,
      current: cur,
      latest: latest,
      hasUpdate: latest ? verNum(latest.script) > verNum(cur) : false
    }));
    return;
  }

  // API: 保存配置
  if (method === "POST" && path === "/api/save-config") {
    const body = parseBody($request);
    // v2.16.9 设置页表单不含 pics，保存其它配置时保留车辆图片替换配置
    try { if (body && body.pics === undefined) { const _p = JSON.parse($.getdata(CK_CONFIG) || "{}"); if (_p && _p.pics) body.pics = _p.pics; } } catch(e) {}
    try { if (body && body.vehicleAlertPush === undefined) { const _p2 = JSON.parse($.getdata(CK_CONFIG) || "{}"); body.vehicleAlertPush = !(_p2 && _p2.vehicleAlertPush === false); } } catch(e) {}
    const ok = saveConfig(body);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok }));
    return;
  }

  // API: 自定义提醒推送（移车提醒等，走当前账号的 Bark Key）
  if (method === "POST" && path === "/api/notify") {
    try {
      const body = parseBody($request);
      const acc = (body.userId ? findAccByUserId(String(body.userId)) : null) || (getAccounts()[0] || null);
      const pushed = !!(acc && acc.barkKey);
      if (pushed) await barkPush(acc.barkKey, String(body.title || "极核提醒"), String(body.body || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, pushed: pushed }));
    } catch (e) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) }));
    }
    return;
  }

  // API: 验证用户ID与Token是否匹配
  if (method === "POST" && path === "/api/verify-account") {
    const body = parseBody($request);
    const userId = String(body.userId || "");
    const token = cleanToken(body.token || "");
    const cfg = getConfig();
    let valid = false;
    let message = "";
    let returnedId = "";
    if (!userId || !token) {
      message = "用户ID和Token不能为空";
    } else {
      try {
        const signH = getSign("app", {}, '', cfg);
        const res = await httpGet(`https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${userId}`, {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          "user_id": userId,
          ...signH
        });
        if (res.code == "10000" && res.data) {
          returnedId = String(res.data.id || res.data.userId || "");
          if (returnedId === userId) {
            valid = true;
            message = "验证通过，Token与用户ID匹配";
          } else {
            valid = false;
            message = `Token不匹配！该Token属于用户ID: ${returnedId || "未知"}，不是 ${userId}`;
          }
        } else if (res.code == "40001" || res.code == 401) {
          valid = false;
          message = "Token已过期，请重新获取";
        } else {
          valid = false;
          message = "验证失败: " + (res.message || res.code || "未知错误");
        }
      } catch(e) {
        valid = false;
        message = "验证异常: " + String(e);
      }
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ valid: valid, message: message, returnedId: returnedId }));
    return;
  }

  // API: 根据Token自动获取用户ID
  if (method === "POST" && path === "/api/get-userid") {
    const body = parseBody($request);
    const token = cleanToken(body.token || "");
    const cfg = getConfig();
    let userId = "";
    let userName = "";
    let error = null;
    if (!token) {
      error = "请先输入Token";
    } else {
      const baseHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        "interfaceversion": "2"
      };
      // 递归搜索对象中的 userId 字段
      const findUserId = (obj, depth = 0) => {
        if (!obj || depth > 5) return "";
        if (typeof obj === "string" || typeof obj === "number") return "";
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (/user.?id|uid|create.?by|owner.?id/i.test(key) && val && typeof val !== "object") {
            const s = String(val);
            if (s.length >= 10 && /^\d+$/.test(s)) return s;
          }
          if (val && typeof val === "object") {
            const found = findUserId(val, depth + 1);
            if (found) return found;
          }
        }
        return "";
      };
      // 方式0（最优先，最可靠）：调用 H5 端 baseInfo 接口，不需要 user_id，从 token 直接获取用户信息
      try {
        const signH0 = getSign("h5", { server_name: "SMART" }, '', cfg);
        const res0 = await httpGet("https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART", { ...baseHeaders, ...signH0 });
        if (res0 && String(res0.code) === "10000" && res0.data) {
          userId = String(res0.data.id || "");
          userName = String(res0.data.nickName || "");
        }
      } catch(e) {}
      // 方式1：调用 /setting（不带userId）获取当前用户信息
      if (!userId) {
      try {
        const signH = getSign("app", {}, '', cfg);
        const res = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting", { ...baseHeaders, ...signH });
        if (res.code == "10000" && res.data) {
          userId = String(res.data.id || res.data.userId || "");
          userName = String(res.data.nickName || "");
        }
        if (!userId && res.data) userId = findUserId(res.data);
      } catch(e) {}
      }
      // 方式2：调用积分接口获取用户信息
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const res = await httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare", { ...baseHeaders, ...signH });
          if (res && res.data) userId = findUserId(res.data);
        } catch(e) {}
      }
      // 方式3：从 vehicle/list 响应中递归搜索 userId
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const res = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", { ...baseHeaders, ...signH });
          if (res && res.data) userId = findUserId(res.data);
          // 也搜索整个响应
          if (!userId && res) userId = findUserId(res);
        } catch(e) {}
      }
      // 方式4：调用 homeRideInfo（需要先获取车辆VIN）
      if (!userId) {
        try {
          const signH = getSign("app", {}, '', cfg);
          const listRes = await httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list", { ...baseHeaders, ...signH });
          let vinNo = "";
          const d = listRes?.data;
          if (Array.isArray(d)) vinNo = d[0]?.vinNo || d[0]?.frameNo || "";
          else if (Array.isArray(d?.list)) vinNo = d.list[0]?.vinNo || "";
          else if (Array.isArray(d?.records)) vinNo = d.records[0]?.vinNo || "";
          if (vinNo) {
            const qRide = `vinNo=${encodeURIComponent(vinNo)}`;
            const rideRes = await httpGet(`https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/homeRideInfo?${qRide}`, appQueryGetHeaders({ token: token, userId: "" }, qRide, cfg));
            if (rideRes && rideRes.data) userId = findUserId(rideRes.data);
          }
        } catch(e) {}
      }
      // 方式5：社区接口（粉丝列表/关注列表/用户信息），这些接口响应中通常包含 userId
      if (!userId) {
        const socialUrls = [
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/fans/list?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/follower/list?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/user/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/my/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/fans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/fans/myFans?page=1&pageSize=1",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/user/info",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/my/info",
          "https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/userInfo"
        ];
        for (const url of socialUrls) {
          if (userId) break;
          try {
            const qSoc = url.split("?")[1] || "";
            const res = await httpGet(url, appQueryGetHeaders({ token: token, userId: "" }, qSoc, cfg));
            if (res && res.data) {
              userId = findUserId(res.data);
              if (!userId && res) userId = findUserId(res);
              // 尝试从昵称中获取 userName
              if (!userName && res.data) {
                const findName = (obj, depth = 0) => {
                  if (!obj || depth > 4) return "";
                  for (const key of Object.keys(obj)) {
                    if (/nick.?name|user.?name|name/i.test(key) && obj[key] && typeof obj[key] === "string") return obj[key];
                    if (obj[key] && typeof obj[key] === "object") {
                      const n = findName(obj[key], depth + 1);
                      if (n) return n;
                    }
                  }
                  return "";
                };
                userName = findName(res.data);
              }
            }
          } catch(e) {}
        }
      }
      if (!userId) error = "自动获取失败，请手动填写用户ID（或打开极核App-我的页面自动捕获）";
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: !!userId, userId: userId, userName: userName, error: error }));
    return;
  }

  // API: 快速保存（客户端通过 zeeho.box 链接直接保存，GET请求，参数在query里）
  // API: 发送短信验证码（手机号登录，免抓包）——走 App 网关，与登录同验证码池
  if (method === "POST" && path === "/api/send-code") {
    const body = parseBody($request);
    const phone = String(body.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "手机号格式不正确（应为11位）" }));
      return;
    }
    const cfg = getConfig();
    // 发码走 App 网关（与 loginByPhone 同一验证码池；签名按 GET 风格，URL入签）
    // 曾误以为"App 网关旧 GET 已废弃返回 permit error"，实为签名风格错误所致，勿改回 H5（H5 发的码登录侧取不到）
    const url = `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/authCode/${encodeURIComponent(phone)}`;
    const signH = appGatewaySign(url, "GET", {}, '', cfg);
    const res = await httpGet(url, {
      "Content-Type": "application/json;charset=UTF-8",
      "User-Agent": "okhttp/4.9.2",
      ...signH
    });
    if (res && String(res.code) === "10000") {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, message: "验证码已发送，请查收短信" }));
    } else {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "发送失败: " + ((res && (res.message || res.msg)) || "未知错误") }));
    }
    return;
  }

  // API: 手机号 + 短信验证码登录（免抓包），成功后自动写入账号列表
  if (method === "POST" && path === "/api/phone-login") {
    const body = parseBody($request);
    const phone = String(body.phone || "").trim();
    const code = String(body.code || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "手机号格式不正确（应为11位）" }));
      return;
    }
    if (!code) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "请填写短信验证码" }));
      return;
    }
    const cfg = getConfig();
    // 登录请求体与参考实现（HomeAssistant zeeho 集成，实测可用）完全一致：phone + authCode
    const payload = { phone: phone, authCode: code };
    // 登录必须带 OAuth2 Basic 凭据（逆向自极核 App，固定 mck:123456 → base64 bWNrOjEyMzQ1Ng==）
    // 留空则用内置默认值；用户抓包发现变化时可在面板输入框覆盖
    const basicAuth = String((body && body.basicAuth) || cfg.basicAuth || "bWNrOjEyMzQ1Ng==").trim().replace(/^Basic\s+/i, "");
    // 走 App 网关（与发码同一验证码池）
    const loginUrl = "https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/user/loginByPhone";
    // ⚠️ 虽然是 POST，签名必须按 GET 风格（URL入签、body 不入签，与参考实现一致）：
    //    用 POST 风格签名(query+body) 服务端签名校验不过，返回"验证码有误或已过期"
    const signH = appGatewaySign(loginUrl, "GET", {}, '', cfg);
    const loginHeaders = { "Content-Type": "application/json;charset=UTF-8", "User-Agent": "okhttp/4.9.2", ...signH };
    if (basicAuth) loginHeaders["Authorization"] = "Basic " + basicAuth;
    const loginRes = await httpPost(
      loginUrl,
      loginHeaders,
      payload,
      20000
    );
    const tokenInfo = loginRes && loginRes.data && loginRes.data.tokenInfo;
    const accessToken = tokenInfo && String(tokenInfo.access_token || "");
    if (!loginRes || String(loginRes.code) !== "10000" || !accessToken) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "登录失败: " + ((loginRes && (loginRes.message || loginRes.msg)) || "验证码有误或已过期"), detail: loginRes }));
      return;
    }
    // 用登录 Token 自动获取用户ID与昵称（H5 baseInfo，与「获取ID」一致）
    // 用户ID与昵称：优先用登录响应自带字段（App loginByPhone 响应 data 直接返回 id/phone/nickName），失败再查 H5 baseInfo
    let userId = String((loginRes.data && (loginRes.data.id || loginRes.data.userId)) || "").trim();
    let userName = String((loginRes.data && (loginRes.data.nickName || loginRes.data.username)) || "").trim();
    if (!userId) {
      try {
        const signH0 = getSign("h5", { server_name: "SMART" }, '', cfg);
        const infoRes = await httpGet("https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART", {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json;charset=UTF-8",
          "interfaceversion": "2",
          ...signH0
        });
        if (infoRes && String(infoRes.code) === "10000" && infoRes.data) {
          userId = String(infoRes.data.id || "");
          userName = String(infoRes.data.nickName || "");
        }
      } catch(e) {}
    }
    // 追加/更新账号：同一 Token 或同一用户ID视为同一账号（刷新Token），否则新增
    const list = getAccounts();
    let replaced = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && (String(list[i].token || "") === accessToken || (list[i].userId && userId && String(list[i].userId) === userId))) {
        list[i].token = accessToken;
        if (userId) list[i].userId = userId;
        if (userName) list[i].userName = userName;
        replaced = true;
        break;
      }
    }
    const newAcc = { userName: userName || phone, userId: userId, token: accessToken, barkKey: "", userAgent: "" };
    if (!replaced) list.push(newAcc);
    saveAccounts(list);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, message: replaced ? "登录成功，已更新该账号" : "登录成功，已添加账号", account: newAcc }));
    return;
  }

  if (path === "/api/quick-save" || path === "/quick-save") {
    const _qs = new URL(url).searchParams;
    const _json = (_qs.get("format") || "") === "json";
    const _reply = (obj) => {
      if (_json) sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(obj));
      else sendResp(200, { "Content-Type": "text/html; charset=utf-8" }, '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + (obj.ok ? "配置已保存" : "导入失败") + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#F0F4F8;padding:30px 16px}.card{background:#fff;border-radius:14px;padding:30px 20px;max-width:420px;margin:0 auto;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}.icon{width:60px;height:60px;border-radius:50%;background:' + (obj.ok ? "#D1FAE5" : "#FEE2E2") + ';color:' + (obj.ok ? "#059669" : "#DC2626") + ';font-size:30px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.title{font-size:18px;font-weight:700;margin-bottom:8px}.info{font-size:13px;color:#64748B;line-height:1.8;margin-bottom:20px}.info b{color:#0F172A}.btn{display:inline-block;padding:10px 24px;border-radius:8px;background:#0891B2;color:#fff;text-decoration:none;font-size:14px;font-weight:600;margin:4px}.btn2{background:#fff;color:#475569;border:1px solid #E2E8F0}.warn{font-size:12px;color:#DC2626;margin-top:10px;text-align:left}</style></head><body><div class="card"><div class="icon">' + (obj.ok ? "✓" : "✕") + '</div><div class="title">' + (obj.ok ? "配置保存成功" : "导入失败") + '</div><div class="info">' + (obj.ok ? ('昵称：<b>' + obj.userName + '</b><br>用户ID：<b>' + obj.userId + '</b>' + (obj.warn ? '<div class="warn">⚠️ ' + obj.warn + '</div>' : '')) : ('<div class="warn">' + obj.message + '</div>')) + '</div><a href="' + PANEL_HOST + '/" class="btn">查看面板</a><a href="' + PANEL_HOST + '/config" class="btn btn2">配置页</a></div></body></html>');
    };
    try {
      const u = new URL(url);
      const qName = u.searchParams.get('name') || '';
      const qToken = cleanToken(u.searchParams.get('token') || '');
      const qReplace = u.searchParams.get('replace') === '1' || u.searchParams.get('replace') === 'true';
      if (!qToken) { _reply({ ok: false, message: "Token 为空" }); return; }
      const cfg = getConfig();
      // 自动获取用户ID（H5 通道）
      let qUid = '';
      let qNick = qName;
      let fetchErr = '';
      try {
        const signHeaders = getSign('h5', { server_name: 'SMART' }, '', cfg);
        const res = await httpGet('https://h5.zeehoev.com/cfmotoservermine/baseInfo?server_name=SMART', {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': 'Bearer ' + qToken,
          ...signHeaders
        });
        if (res && String(res.code) === '10000' && res.data) {
          qUid = String(res.data.id || '');
          qNick = res.data.nickName || qName;
        } else {
          fetchErr = res?.message || res?.msg || '获取用户ID失败';
        }
      } catch(e) { fetchErr = String(e); }
      // v2.16.22 Token 通道校验：H5 能识别但 App 网关拒绝的 Token（常见于只抓到 h5.zeehoev.com 的
      // Authorization）会导致总积分 0、无车辆/定位、车控与社区全部失败，必须拦下并提示重新抓包
      let appReject = '';
      try {
        const appSign = getSign('app', {}, '', cfg);
        const ar = await httpGet('https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list', {
          'Authorization': 'Bearer ' + qToken,
          'Content-Type': 'application/json;charset=UTF-8',
          'interfaceversion': '2',
          'user_id': qUid || '',
          ...appSign
        });
        const txt = String((ar && (ar.error || ar.message || ar.msg || ar.code)) || '');
        if (ar && String(ar.code) === '10000') appReject = '';
        else if (/invalid_token|token已失效|401|40001/i.test(txt)) appReject = '该 Token 仅 H5 通道有效（App 网关拒绝），导入后总积分/车辆/定位/车控都会失效。请重新「自动抓包」并打开极核 App 首页（只抓 tapi 请求），或改用手机号验证码登录。';
      } catch(e) {}
      if (appReject) { _reply({ ok: false, message: appReject }); return; }
      // H5 baseInfo 失败时，再走 App setting / vehicle/list 兜底解析真实数字 ID（避免保存 temp_xxx）
      if (!qUid) {
        try {
          const signH = getSign('app', {}, '', cfg);
          const r1 = await httpGet('https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting', {
            'Authorization': 'Bearer ' + qToken,
            'Content-Type': 'application/json;charset=UTF-8',
            'interfaceversion': '2',
            ...signH
          });
          if (r1 && r1.data) {
            const id1 = String(r1.data.id || r1.data.userId || '');
            if (/^\d+$/.test(id1)) qUid = id1;
            if (!qNick && r1.data.nickName) qNick = String(r1.data.nickName);
          }
        } catch(e) {}
      }
      if (!qUid) {
        try {
          const fUid = (obj, depth) => {
            if (!obj || depth > 5 || typeof obj !== 'object') return '';
            for (const k of Object.keys(obj)) {
              const v = obj[k];
              if (/user.?id|uid|create.?by|owner.?id/i.test(k) && v && typeof v !== 'object') {
                const s = String(v);
                if (/^\d+$/.test(s) && s.length >= 6) return s;
              }
              if (v && typeof v === 'object') {
                const f = fUid(v, depth + 1);
                if (f) return f;
              }
            }
            return '';
          };
          const signH = getSign('app', {}, '', cfg);
          const rv = await httpGet('https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/vehicle/list', {
            'Authorization': 'Bearer ' + qToken,
            'Content-Type': 'application/json;charset=UTF-8',
            'interfaceversion': '2',
            ...signH
          });
          if (rv && String(rv.code) === '10000') {
            const f = fUid(rv);
            if (f) qUid = f;
          }
        } catch(e) {}
      }
      // 获取失败用临时ID
      if (!qUid) qUid = 'temp_' + qToken.substring(0, 8);
      // 保存到账号列表：单账号版 replace=1 直接覆盖，避免旧 Token（如 h5-only）残留成为「当前账号」
      let accounts = qReplace ? [] : getAccounts();
      const idx = accounts.findIndex(a => String(a.userId) === String(qUid) || cleanToken(a.token) === qToken);
      const acc = { userName: qNick || ('账号' + (accounts.length + 1)), userId: qUid, token: qToken };
      if (idx >= 0) accounts[idx] = Object.assign({}, accounts[idx], acc);
      else accounts.push(acc);
      saveAccounts(accounts);
      console.log('[快速保存] 账号已保存: ' + acc.userName + ' (' + qUid + ')' + (qReplace ? ' [单账号覆盖]' : '') + (fetchErr ? ' [获取ID失败: '+fetchErr+']' : ''));
      _reply({ ok: true, userName: acc.userName, userId: qUid, warn: fetchErr ? ('自动获取用户ID失败（' + fetchErr + '），已用临时ID保存，可在配置页点「获取ID」重试') : '' });
    } catch(e) {
      _reply({ ok: false, message: '保存异常：' + String(e) });
    }
    return;
  }

  // API: 保存账号
  if (method === "POST" && path === "/api/save-accounts") {
    const body = parseBody($request);
    const rawList = Array.isArray(body.accounts) ? body.accounts : [];
    // 存盘前统一剥离 Bearer 前缀，仅保留 Token 本体；其余字段（含每账号 barkKey）原样保留
    const list = rawList.map(function(a) {
      return Object.assign({}, a, {
        token: cleanToken(a.token || ""),
        barkKey: cleanBarkKey(a.barkKey || "")
      });
    });
    const ok = saveAccounts(list);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok, count: list.length }));
    return;
  }


  // API: 获取全部数据（账号+车辆+配置）
  if (method === "GET" && path === "/api/data") {
    const cfg = getConfig();
    const accounts = getAccounts();
    // 并发3路拉取（原串行逐个等待，多账号时明显卡顿）
    const data = await fetchAllAccounts(accounts, cfg, 3);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
      accounts: data,
      config: { appId: cfg.app.appId, h5AppId: cfg.h5.appId, community: cfg.community },
      timestamp: new Date().toISOString(),
      total: accounts.length
    }));
    return;
  }

  // API: 多车切换 - 获取指定账号指定车辆数据
  if (method === "GET" && path === "/api/vehicle") {
    try {
      const _u = new URL(url);
      const userId = String(_u.searchParams.get("userId") || "");
      const vin = String(_u.searchParams.get("vin") || "");
      const cfg = getConfig();
      const accounts = getAccounts();
      const acc = accounts.find(a => String(a.userId) === String(userId));
      if (!acc || !vin) {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "参数错误" }));
        return;
      }
      const result = await fetchAccountData(acc, cfg, vin);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, result: result }));
    } catch (e) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) }));
    }
    return;
  }

    // ========== v2.16.0 API: 隐藏骑行数据 · 月度汇总（myRideInfo 透传，面板「骑行」页用） ==========
  if (method === "GET" && path === "/api/ride-month") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideMonth(acc, getConfig(), String(_u.searchParams.get("month") || ""), String(_u.searchParams.get("vin") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.0 API: 隐藏骑行数据 · 轨迹分页（ridetrack_v2 透传，面板「扫描轨迹」用） ==========
  if (method === "GET" && path === "/api/ride-track") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const r = await fetchRideTrackPage(acc, getConfig(), _u.searchParams.get("page"), _u.searchParams.get("pageSize"), String(_u.searchParams.get("vin") || ""), String(_u.searchParams.get("month") || ""));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

    // API: 获取完整配置（面板模式设置页回填账号密钥用）
  if (method === "GET" && path === "/api/config") {
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, config: getConfig(), scriptVersion: SCRIPT_VERSION }));
    return;
  }

    // API: 获取完整账号列表（含 Token / Bark Key，设置页回填用）
  if (method === "GET" && path === "/api/accounts") {
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, accounts: getAccounts() }));
    return;
  }

  // API: 获取运行日志
  if (method === "GET" && path === "/api/get-logs") {
    const logs = getLogs();
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ logs: logs }));
    return;
  }

  // API: 清空运行日志
  if (method === "POST" && path === "/api/clear-logs") {
    const ok = clearLogs();
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: ok }));
    return;
  }

  // API: 手动执行签到
  if (method === "POST" && path === "/api/run-signin") {
    const body = parseBody($request);
    const cfg = getConfig();
    const accounts = getAccounts();
    const targets = body.all ? accounts : accounts.filter(a => String(a.userId) === String(body.userId));
    const results = await runSigninBatch(targets, cfg);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, results: results }));
    return;
  }

  // API: 车辆远程控制（find寻车 / loudFind鸣笛闪灯 / cushion开坐垫 / unlock开锁 / lock关锁）
  if (method === "POST" && path === "/api/vehicle-control") {
    const body = parseBody($request);
    const action = String(body.action || "");
    const cfg = getConfig();
    const accounts = getAccounts();
    // 按 userId 定位账号；找不到时兜底取第一个
    let acc = accounts.find(a => String(a.userId) === String(body.userId));
    if (!acc && body.userId) acc = accounts[0];
    if (!acc && accounts.length) acc = accounts[0];
    if (!acc) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未找到账号，请先在配置页添加" }));
      return;
    }
    if (!VEHICLE_ACTION_TEXT[action]) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "非法操作类型" }));
      return;
    }
    // 2026-09-20 修复：支持传入指定 VIN，切换车辆后控车操作对应选中车辆而非默认第一台
    const customVin = String(body.vin || "").trim();
    const r = await vehicleControl(acc, action, cfg, customVin);
    console.log(`[车辆控制] ${acc.userName} ${VEHICLE_ACTION_TEXT[action]} => ${r.ok ? "成功" : "失败:" + r.message}`);
    // 控车操作写入运行日志（type=vehicle，日志页可按“控车”筛选）
    try {
      const _vd = new Date();
      const _vds = _vd.getFullYear() + "-" + String(_vd.getMonth()+1).padStart(2,"0") + "-" + String(_vd.getDate()).padStart(2,"0");
      addLog({
        time: _vd.toLocaleString("zh-CN", { hour12: false }),
        date: _vds,
        type: "vehicle",
        action: action,
        actionText: VEHICLE_ACTION_TEXT[action] || "车辆控制",
        userName: acc.userName || "未知",
        userId: acc.userId,
        success: !!r.ok,
        message: r.message || "",
        error: r.ok ? "" : (r.message || "指令失败")
      });
    } catch(e) {}
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
    return;
  }

  // ========== v2.14.9 API: 积分全家桶（流水/总积分/过期/签到统计） ==========
  if (method === "GET" && path === "/api/integral") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const page = Number(_u.searchParams.get("page")) || 1;
      const pageSize = Number(_u.searchParams.get("pageSize")) || 20;
      const T = "https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine";
      const [dt, tot, exp, cnt] = await Promise.all([
        httpGet(T + "/integral/detail?page=" + page + "&pageSize=" + pageSize, appQueryGetHeaders(acc, "page=" + page + "&pageSize=" + pageSize, cfg)),
        httpGet(T + "/integral/totalIntegral", accHeaders(acc, getSign("app", {}, '', cfg))),
        httpGet(T + "/integral/expire", accHeaders(acc, getSign("app", {}, '', cfg))),
        httpGet(T + "/signin/count", accHeaders(acc, getSign("app", {}, '', cfg)))
      ]);
      // v2.14.20 防御：官方 /integral/detail 的 data 可能为数组或 {records/list/rows}，统一归一为数组
      let detailArr = [];
      if (dt && dt.code == "10000") {
        const dd = dt.data;
        if (Array.isArray(dd)) detailArr = dd;
        else if (dd && Array.isArray(dd.records)) detailArr = dd.records;
        else if (dd && Array.isArray(dd.list)) detailArr = dd.list;
        else if (dd && Array.isArray(dd.rows)) detailArr = dd.rows;
        else if (dd && Array.isArray(dd.detail)) detailArr = dd.detail;
      }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
        ok: true,
        detail: detailArr,
        detailError: dt && dt.code != "10000" ? (dt.message || "") : "",
        total: (tot && tot.code == "10000") ? tot.data : null,
        expire: (exp && exp.code == "10000") ? (exp.data || []) : [],
        signinCount: (cnt && cnt.code == "10000") ? cnt.data : null
      }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 积分补签（补签卡数/日历/连签/兑换/使用补签卡） ==========
  if (path === "/api/supplement") {
    try {
      const _u = new URL(url);
      const body = method === "POST" ? parseBody($request) : {};
      const acc = findAccByUserId(_u.searchParams.get("userId") || body.userId || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const action = String(_u.searchParams.get("action") || body.action || "count");
      const dateTime = String(_u.searchParams.get("dateTime") || body.dateTime || "");
      // 2026-10-13 路径修复：consume（补签）/ gain（积分兑换）必须走官方新路径（含 /H5/），
      // 旧路径 /cfmotoservermine/signInSupplement/* 已被 WAF 拦为 430/30125 permit error
      const H = "https://h5.zeehoev.com/cfmotoservermine/H5/signInSupplement";
      let res = null;
      if (action === "count") {
        // 2026-10-12 HAR 实证：官方 POST /count 的签名把 body "{}" 纳入（md5(sha1("{}"+param+secret)) 与官方样本逐位一致）；
        // 不签 body 会被 WAF 判 430/30121 permit error（补签卡数量/补签流程因此报错）
        res = await httpPost(H + "/count", accHeaders(acc, getSign("h5", {}, "{}", cfg)), "{}");
      } else if (action === "page") {
        // 2026-09-27: 官方已将 /page 改为 POST，分页参数放 body 内（GET 返回 40000）
        const page = Number(_u.searchParams.get("page")) || 1, pageSize = Number(_u.searchParams.get("pageSize")) || 10;
        const pageBody = JSON.stringify({ page: page, pageSize: pageSize });
        res = await httpPost(H + "/page", accHeaders(acc, getSign("h5", {}, pageBody, cfg)), pageBody);
      } else if (action === "continuity") {
        res = await httpGet(H + "/continuity?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else if (action === "detail") {
        res = await httpGet(H + "/detail?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else if (action === "month") {
        // 整月签到日历：YYYY-MM，返回 nowSignDetailVos（补签日历渲染用）
        const month = String(_u.searchParams.get("month") || "");
        if (!/^\d{4}-\d{2}$/.test(month)) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "月份格式应为 YYYY-MM" })); return; }
        res = await httpGet("https://h5.zeehoev.com/cfmotoservermine/H5/signin/info?month=" + encodeURIComponent(month), accHeaders(acc, getSign("h5", { month: month }, '', cfg)));
      } else if (action === "gain") {
        // 积分兑换补签卡：sourceType 1=积分兑换 2=盲盒 3=赠送 4=活动
        res = await httpGet(H + "/gain?sourceType=1", accHeaders(acc, getSign("h5", { sourceType: 1 }, '', cfg)));
      } else if (action === "consume") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTime)) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "日期格式应为 YYYY-MM-DD" })); return; }
        res = await httpGet(H + "/consume?dateTime=" + encodeURIComponent(dateTime), accHeaders(acc, getSign("h5", { dateTime: dateTime }, '', cfg)));
      } else {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未知 action" })); return;
      }
      const okFlag = res && res.code == "10000";
      console.log("[补签] " + action + " => " + (res ? res.code + " " + (res.message || "") : "无响应"));
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: !!okFlag, code: res ? res.code : "", message: res ? (res.message || "") : "无响应", data: res ? res.data : null }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.9 API: 车辆图片替换配置 ==========
  if (path === "/api/pic-cfg") {
    if (method === "GET") {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, pics: getConfig().pics || {} }));
      return;
    }
    if (method === "POST") {
      let r = { ok: false };
      try {
        const body = JSON.parse($request.body || "{}");
        let c = {}; try { c = JSON.parse($.getdata(CK_CONFIG) || "{}") || {}; } catch(e) {}
        const next = {};
        const src = (body.pics && typeof body.pics === "object") ? body.pics : {};
        for (const k of Object.keys(src)) { const u = String(src[k] || "").trim(); if (/^https?:\/\//.test(u)) next[String(k).trim()] = u; }
        c.pics = next;
        saveConfig(c);
        r = { ok: true, count: Object.keys(next).length };
      } catch(e) { r = { ok: false, error: String(e) }; }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(r));
      return;
    }
  }

  // ========== v2.16.5 API: 电池/充电状态（充电剩余时间估算用：电流/电量/电压/充电中） ==========
  if (method === "GET" && path === "/api/battery-state") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      let vin = String(_u.searchParams.get("vin") || "").trim();
      if (!vin) {
        const list = await fetchVehicleList(acc, cfg) || [];
        const vehicles = list.filter(x => !/模拟/.test(String(x.name || "") + " " + String(x.vehicleType || "")));
        if (!vehicles.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未获取到绑定车辆" })); return; }
        vin = vehicles[0].vinNo;
      }
      const b = await fetchBatteryChargeState(acc, cfg, vin);
      if (!b) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "充电状态获取失败" })); return; }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, vinNo: vin, charging: /充电/.test(String(b.chargeState || "")), current: b.current, soc: b.soc, voltage: b.voltage, chargeState: b.chargeState, fullChargeTime: b.fullChargeTime, fullChargeTimeSecond: b.fullChargeTimeSecond }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 车辆状态监控（快照 + 离线判断） ==========
  if (method === "GET" && path === "/api/vehicle-monitor") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      let vin = String(_u.searchParams.get("vin") || "").trim();
      let vehicles = [];
      if (!vin) {
        vehicles = await fetchVehicleList(acc, cfg) || [];
        if (!vehicles.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未获取到绑定车辆" })); return; }
        vin = vehicles[0].vinNo;
      }
      const snap = await fetchVehicleSnapshots(acc, cfg, vin);
      if (!snap) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "快照获取失败" })); return; }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, snapshot: snap, vehicles: vehicles }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.14.12 API: 后台监控 tick（原生定时器周期调用，跑充满/离线去重检查并本地通知） ==========
  if (method === "GET" && path === "/api/vehicle-monitor-tick") {
    // v2.16.46 车辆提醒（震动/忘关锁/电池拔出/低电量）也纳入 3 分钟 tick，不再只靠打开面板时才检查
    try {
      const cfg = getConfig();
      if (cfg.vehicleAlertPush !== false) await pushVehicleAlerts(cfg);
    } catch(e) {}
    try { await checkVehicleMonitor(getConfig()); } catch(e) {}
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true }));
    return;
  }

  // ========== v2.14.21 API: 小组件快照（iOS WidgetKit 读取；主 App 周期调用并写入 App Group 共享目录） ==========
  if (method === "GET" && path === "/api/widget-snapshot") {
    try {
      const cfg = getConfig();
      const accounts = getAccounts();
      if (!accounts.length) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "暂无账号" })); return; }
      // 小组件显示车辆：cfg.widgetVehicle = "userId|vin"，未配置取第一个账号第一台车
      let userId = "", vin = "";
      const wv = String(cfg.widgetVehicle || "");
      if (wv.indexOf("|") > 0) { const p = wv.split("|"); userId = p[0] || ""; vin = p[1] || ""; }
      let acc = userId ? accounts.find(a => String(a.userId) === String(userId)) : null;
      if (!acc) acc = accounts[0];
      const data = await fetchAccountData(acc, cfg, vin || undefined);
      const v = data.vehicle || {};
      // v2.16.47 剩余时间兜底：官方字段常为空，按电池容量（Ah）与充电电流估算，与面板口径一致
      let remainSec = Number(v.fullChargeTimeSecond) || 0;
      if (!remainSec) {
        const fm = Number(v.fullChargeTime) || 0;
        if (fm > 0) remainSec = fm * 60;
      }
      const socNum = Number(v.batteryPercent) || 0;
      const curNum = Number(v.current) || 0;
      if (!remainSec && socNum > 0 && socNum < 100 && curNum > 0.3) {
        const bcAll = (cfg.batteryCfg && typeof cfg.batteryCfg === "object") ? cfg.batteryCfg : {};
        const bc = bcAll[String(v.vinNo || v.currentVin || "")] || {};
        const ah = Number(bc.ah) || 30;
        remainSec = Math.round(ah * (100 - socNum) / 100 / curNum * 3600);
      }
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({
        ok: true, ts: new Date().toISOString(),
        accountName: data.userName || "", userId: data.userId || "",
        vehicleName: v.vehicleName || "", vehicleModel: v.vehicleModel || "",
        hasVehicle: !!v.hasVehicle,
        soc: v.batteryPercent || 0, range: v.residualRangeKm || 0, rangeEstimated: !!v.rangeEstimated,
        voltage: v.voltage || 0, current: v.current || 0, chargeState: v.chargeState || "未充电",
        chargeKnown: !!v.chargeKnown,
        fontScale: Number(cfg.widgetFont) || 1,
        power: Math.round((Number(v.voltage) || 0) * (Number(v.current) || 0)),
        chargeRemainSec: remainSec,
        vehicleImageUrl: v.vehicleImageUrl || "",
        address: v.address || "",
        lockState: v.lockState || "",
        cushionState: v.cushionState || "",
        frontPressure: v.frontPressure || "", frontTemp: v.frontTemp || "",
        rearPressure: v.rearPressure || "", rearTemp: v.rearTemp || "",
        online: v.online || "",
        score: data.score || 0, continueDays: data.continueDays || 0, todayScore: data.todayScore || 0,
        signedToday: !!data.signedToday,
        todayDistance: v.todayDistance || 0, totalMileage: v.totalMileage || 0
      }));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // ========== v2.16.43 API: 附近充电桩（高德周边搜索代理，避免 WebView 跨域） ==========
  if (method === "GET" && path === "/api/amap-poi") {
    const fail = (m) => sendResp(200, { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-cache" }, JSON.stringify({ ok: false, error: m }));
    try {
      const qs = {};
      (url.split("?")[1] || "").split("&").forEach(kv => {
        if (!kv) return;
        const i = kv.indexOf("=");
        const k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)) || "");
        const v = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1));
        if (k) qs[k] = v;
      });
      const key = String(qs.key || "").trim();
      const lng = Number(qs.lng), lat = Number(qs.lat);
      const kw = String(qs.keyword || "充电桩");
      const radius = Math.min(10000, Math.max(500, Number(qs.radius) || 3000));
      if (!key) { fail("未配置高德 Key"); return; }
      if (!isFinite(lng) || !isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { fail("坐标无效"); return; }
      const apiUrl = "https://restapi.amap.com/v3/place/around?key=" + encodeURIComponent(key) +
        "&location=" + lng.toFixed(6) + "," + lat.toFixed(6) +
        "&radius=" + radius + "&keywords=" + encodeURIComponent(kw) +
        "&offset=25&page=1&extensions=all&sortrule=distance";
      const res = await httpGet(apiUrl);
      if (!res || res.status !== "1") { fail(String((res && (res.info || res.infocode)) || "高德接口无响应")); return; }
      const pois = (res.pois || []).map(p => ({
        id: String(p.id || ""),
        name: String(p.name || ""),
        address: String(p.address || ""),
        distance: Number(p.distance) || 0,
        location: String(p.location || ""),
        type: String(p.type || ""),
        tel: String(p.tel || ""),
        cost: String((p.biz_ext && p.biz_ext.cost) || ""),
        rating: String((p.biz_ext && p.biz_ext.rating) || "")
      }));
      sendResp(200, { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-cache" }, JSON.stringify({ ok: true, count: pois.length, pois: pois }));
    } catch (e) {
      fail(String(e));
    }
    return;
  }

  // ========== v2.14.9 API: 车控扩展（充电功率/限速档位/防盗/音效/储物箱） ==========
  if (method === "POST" && path === "/api/vehicle-control-ext") {
    try {
      const body = parseBody($request);
      const cfg = getConfig();
      const acc = findAccByUserId(body.userId || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未找到账号" })); return; }
      const action = String(body.action || "");
      let vin = String(body.vin || "").trim();
      let deviceName = "";
      const list = await fetchVehicleList(acc, cfg) || [];
      if (!vin && list.length) vin = list[0].vinNo;
      const veh = list.find(v => v.vinNo === vin) || list[0] || {};
      deviceName = veh.deviceName || "";
      if (!vin) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未获取到绑定车辆" })); return; }
      // 2026-09-27: 官方已将 vehicleSet 写操作迁移到新协议 addVehicleSet。
      // 旧端点 /vehicleSet/chargePower 在 OAuth 层直接返回 401 invalid_token（token 实际有效），面板曾误报"token已失效"。
      // 新协议需官方协议头（appid + 官方UA + 含body签名），即 socialHeaders 同款（HAR 抓包 1:1 复刻，实测 code 10000）。
      const base = accHeaders(acc, {});
      const T = "https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp";
      let res = null, okMsg = "指令已下发";
      if (action === "options") {
        // 充电功率选项必须带 flag=1 才返回新档位 200-1200（不带返回旧档 350-1900），且需官方协议头
        const cpQuery = "vinNo=" + encodeURIComponent(vin) + "&flag=1";
        const cp = await httpGet(T + "/vehicleSet/chargePower/options?" + cpQuery, socialHeaders(cleanToken(acc.token), acc.userId, cpQuery, '', cfg));
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true, chargePower: cp && cp.code == "10000" ? cp.data : [] }));
        return;
      } else if (action === "chargePower") {
        // 新协议 addVehicleSet：serviceCode 603980102 = CHARGING_POWER_STANDARD（200-1200，步长100）
        const val = String(body.value || "");
        const payload = JSON.stringify({ serviceCode: 603980102, commandParam: val, flag: true, vin: vin, vehicleSetEnum: "CHARGING_POWER_STANDARD", message: 0 });
        res = await httpPost(T + "/vehicleSet/addVehicleSet", socialHeaders(cleanToken(acc.token), acc.userId, '', payload, cfg), payload);
        // v2.16.5：1200 档实际语义为「无限制」，文案修正（下发值不变）
        okMsg = "充电功率已设为 " + (val === "1200" ? "无限制" : val + "W");
      } else if (action === "vcuStealControl") {
        // 防盗：需 vinNo + lockType + 云端设备号(deviceName) + 手机号
        const payload = JSON.stringify({ vinNo: vin, lockType: String(body.lockType || ""), deviceName: deviceName, phone: String(body.phone || acc.phone || "") });
        res = await httpPost(T + "/vehicleSet/vcuStealControl", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "防盗指令已下发";
      } else if (action === "soundEffect") {
        const payload = JSON.stringify({ vinNo: vin, deviceName: deviceName, soundStatus: String(body.value || "") });
        res = await httpPost(T + "/vehicleSet/setSoundStatus", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "音效指令已下发";
      } else if (action === "storageBox") {
        const payload = JSON.stringify({ vinNo: vin });
        res = await httpPost(T + "/vehicleSet/storageBox/dismantle", { ...base, ...getSign("app", {}, payload, cfg) }, payload);
        okMsg = "储物箱指令已下发（需VIP）";
      } else {
        sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: "未知操作类型" })); return;
      }
      const chk = vehicleCheckRes(res, okMsg);
      // 其余旧端点（限速/音效/防盗/储物箱）若也被官方迁移，会返回 invalid_token，不一定真是 token 失效，避免误报
      if (!chk.ok && /token已失效/.test(String(chk.message || ""))) chk.message = "官方接口调用失败（接口可能已变更，请先在首页确认 token 是否有效）";
      console.log("[车控扩展] " + action + " => " + (chk.ok ? "成功" : "失败:" + chk.message));
      try {
        const _vd = new Date();
        addLog({
          time: _vd.toLocaleString("zh-CN", { hour12: false }),
          date: _vd.getFullYear() + "-" + String(_vd.getMonth()+1).padStart(2,"0") + "-" + String(_vd.getDate()).padStart(2,"0"),
          type: "vehicle", action: "ext:" + action, actionText: "车控扩展·" + action,
          userName: acc.userName || "未知", userId: acc.userId,
          success: !!chk.ok, message: chk.message || "", error: chk.ok ? "" : (chk.message || "指令失败")
        });
      } catch(e) {}
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(chk));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, message: String(e) })); }
    return;
  }

  // ========== v2.14.9 API: 信息聚合中心（未读消息/活动/优惠券/OTA/盲盒记录/骑行排行） ==========
  if (method === "GET" && path === "/api/info-center") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const cfg = getConfig();
      const hd = (query) => appQueryGetHeaders(acc, query, cfg);
      let vin = String(_u.searchParams.get("vin") || "").trim();
      const out = { ok: true };
      const tasks = [
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/app/Message/allUnRead", hd("")).then(r => { out.unread = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mall/cfmotoservermall/app/coupon/myCoupons?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.coupons = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/activityPrizeRecord/app/page?page=1&pageSize=10", hd("page=1&pageSize=10")).then(r => { out.prizeRecords = r && r.code == "10000" ? r.data : null; }),
        httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/riderank", hd("")).then(r => { out.riderank = r && r.code == "10000" ? r.data : null; }),
        fetchVehicleMessages(acc, cfg, 10).then(r => { out.vehicleMessages = r && r.ok ? { noRead: r.noRead, alerts: r.alerts } : null; })
      ];
      if (!vin) {
        try { const list = await fetchVehicleList(acc, cfg) || []; if (list.length) vin = list[0].vinNo; } catch(e) {}
      }
      if (vin) {
        tasks.push(httpGet("https://tapi.zeehoev.com/v1.0/app/cfmotoserverapp/ota/list?vinNo=" + encodeURIComponent(vin), hd("vinNo=" + encodeURIComponent(vin))).then(r => { out.ota = r && r.code == "10000" ? r.data : null; }));
      }
      await Promise.all(tasks);
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(out));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // API: 车辆消息（v2.16.13；onlyAlert=1 仅返回 messageType 302 车辆提醒）
  if (method === "GET" && path === "/api/vehicle-messages") {
    try {
      const _u = new URL(url);
      const acc = findAccByUserId(_u.searchParams.get("userId") || "");
      if (!acc) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "未找到账号" })); return; }
      const onlyAlert = _u.searchParams.get("onlyAlert") === "1";
      const r = await fetchVehicleMessages(acc, getConfig(), Number(_u.searchParams.get("pageSize")) || 20);
      const out = onlyAlert ? { ok: r.ok, error: r.error, noRead: r.noRead, messages: r.alerts || [] } : r;
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(out));
    } catch(e) { sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: String(e) })); }
    return;
  }

  // API: 当前安装信息（iOS 签名方式检测 / 运行环境）
  if (method === "GET" && path === "/api/app-install-info") {
    let env = "unknown";
    if (typeof module !== "undefined" && module.exports) env = "desktop";
    else if (typeof $task !== "undefined") env = "quantumultx";
    else if (typeof $rocket !== "undefined") env = "shadowrocket";
    else if (typeof $loon !== "undefined") env = "loon";
    else if (typeof $environment !== "undefined" && $environment["surge-version"]) env = "surge";
    else if (typeof $environment !== "undefined" && $environment["stash-version"]) env = "stash";
    const info = { env: env, ios: false, signMethod: "", hasProvision: false, expiration: "", expirationUnix: 0, daysRemain: 0, teamId: "", teamName: "", provisionsAllDevices: false, deviceCount: 0 };
    if (env === "loon" && typeof $appInstallInfo === "function") {
      try {
        const ni = $appInstallInfo();
        if (ni && typeof ni === "object") Object.assign(info, ni, { ios: true, env: "ios" });
      } catch (e) {}
    }
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(info));
    return;
  }

  // API: 一键备份全部账号+面板配置
  if (method === "GET" && path === "/api/backup") {
    const payload = {
      ok: true,
      app: "极核ZEEHO",
      type: "zeeho_backup",
      version: SCRIPT_VERSION,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      accounts: getAccounts(),
      config: getConfig()
    };
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify(payload));
    return;
  }

  // API: 导入恢复备份（body.json 为完整备份 JSON 字符串，或 body.data 为备份对象）
  if (method === "POST" && path === "/api/import") {
    const body = parseBody($request);
    let bk = null;
    try {
      bk = typeof body.json === "string" && body.json.trim() ? JSON.parse(body.json) : (body.data || body);
    } catch(e) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "备份内容不是有效JSON" }));
      return;
    }
    if (!bk || (bk.type !== "zeeho_backup" && !Array.isArray(bk.accounts))) {
      sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: "备份格式不正确" }));
      return;
    }
    // 恢复账号：统一清洗 Token / BarkKey（与保存账号同一逻辑）
    const list = (Array.isArray(bk.accounts) ? bk.accounts : []).map(a => Object.assign({}, a, {
      token: cleanToken(a.token || ""),
      barkKey: cleanBarkKey(a.barkKey || "")
    }));
    const accOk = saveAccounts(list);
    // 恢复配置：缺失字段沿用当前值
    let cfgOk = true;
    if (bk.config && typeof bk.config === "object") {
      try {
        const cur = getConfig();
        const next = {
          app: { appId: bk.config.app?.appId || cur.app.appId, appSecret: bk.config.app?.appSecret || cur.app.appSecret },
          h5: { appId: bk.config.h5?.appId || cur.h5.appId, appSecret: bk.config.h5?.appSecret || cur.h5.appSecret },
          community: {
            enablePost: bk.config.community?.enablePost !== false,
            enableLike: bk.config.community?.enableLike !== false,
            enableComment: bk.config.community?.enableComment !== false,
            enableShare: bk.config.community?.enableShare !== false,
            enableDelete: bk.config.community?.enableDelete !== false
          },
          vehicleAesKey: String(bk.config.vehicleAesKey || "").trim(),
          autoRefreshSec: normalizeRefreshSec(bk.config.autoRefreshSec)
        };
        cfgOk = saveConfig(next);
      } catch(e) { cfgOk = false; }
    }
    console.log(`[备份恢复] 账号 ${list.length} 个，配置${cfgOk ? "已" : "未"}恢复 (${SCRIPT_VERSION})`);
    sendResp(200, { "Content-Type": "application/json" }, JSON.stringify({ ok: accOk, count: list.length, configOk: cfgOk }));
    return;
  }

  // 配置页
  if (path === "/config") {
    const cfg = getConfig();
    const accounts = getAccounts();
    const html = renderConfig(accounts, cfg);
    sendResp(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, html);
    return;
  }

  // v2.16.14 单账号版：?single=1 返回单账号专用界面（隐藏多账号管理）
  try {
    const _su = new URL(url);
    if (_su.searchParams.get("single") === "1") {
      sendResp(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, '<script>window.__PANEL_MODE__=1<\/script>' + __SINGLE_HTML());
      return;
    }
  } catch(e) {}

  // 看板页（默认）→ 输出整合后的 LITE 轻应用界面（数据走本机 /api/*，前端自动进入面板模式）
  sendResp(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, '<script>window.__PANEL_MODE__=1<\/script>' + __APP_HTML());
})();;

// ========== Env 类（兼容各代理工具） ==========
function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;"POST"===t&&(s=this.post);const i=new Promise((t,i)=>{s.call(this,e,(e,s,o)=>{e?i(e):t(s)})});return e.timeout?((e,t=1e3)=>Promise.race([e,new Promise((e,s)=>{setTimeout(()=>{s(new Error("请求超时"))},t)})]))(i,e.timeout):i}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null){try{return JSON.stringify(e)}catch{return t}}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(e),o=s?this.getval(s):"";if(o)try{const e=JSON.parse(o);t=e?this.lodash_get(e,i,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(t),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const t=JSON.parse(a);this.lodash_set(t,o,e),s=this.setval(JSON.stringify(t),i)}catch(t){const r={};this.lodash_set(r,o,e),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(e,t);return s}lodash_get(e,t,s){const i=t.replace(/\[(\d+)\]/g,".$1").split(".");let o=e;for(const e of i)if(o=Object(o)[e],void 0===o)return s;return o}lodash_set(e,t,s){return Object(e)!==e||(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce((e,s,i)=>Object(e[s])===e[s]?e[s]:e[s]=(Math.abs(t[i+1])|0)===+t[i+1]?[]:{},e)[t[t.length-1]]=s),e}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);case"Node.js":return this.data=this.loaddata(),this.data[e];default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);case"Node.js":return this.data=this.loaddata(),this.data[t]=e,this.writedata(),!0;default:return this.data&&this.data[t]||null}}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t);if(!s&&!i)return{};{const i=s?e:t;try{return JSON.parse(this.fs.readFileSync(i))}catch(e){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t),o=JSON.stringify(this.data);s?this.fs.writeFileSync(e,o):i?this.fs.writeFileSync(t,o):this.fs.writeFileSync(e,o)}}get(e,t=()=>{}){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$httpClient.get(e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(e),this.got(e).then(e=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=e,n=s.decode(a,this.encoding);t(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:i,response:o}=e;t(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(e,t=()=>{}){const s=e.method?e.method.toLocaleLowerCase():"post";switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$httpClient[s](e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":e.method=s,$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(e);const{url:o,...r}=e;this.got[s](o,r).then(e=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=e,n=i.decode(a,this.encoding);t(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:s,response:o}=e;t(s,o,o&&i.decode(o.rawBody,this.encoding))})}}queryStr(e){let t="";for(const s in e){let i=e[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),t+=`${s}=${i}&`)}return t=t.substring(0,t.length-1),t}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.map(e=>e??String(e)).join(this.logSeparator))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(e);break;case"Node.js":process.exit(0)}}}(e,t)}