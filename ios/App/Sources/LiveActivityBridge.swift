// LiveActivityBridge.swift — 充电实时活动的启停与刷新（供 ObjC 通过 runtime 调用）
// ObjC 侧：Class c = NSClassFromString(@"ZeehoLiveActivityBridge"); [c performSelector:@selector(updateWithInfo:) withObject:dict];
// 注意：Swift 类默认运行时名是「模块名.类名」，必须用 @objc(ZeehoLiveActivityBridge) 固定成无前缀名，
// 否则 ObjC 的 NSClassFromString(@"ZeehoLiveActivityBridge") 取到 nil，实时活动会静默不生效。
import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

@objcMembers
@objc(ZeehoLiveActivityBridge)
final class ZeehoLiveActivityBridge: NSObject {

    /// info: charging(Bool) / soc(Int) / power(Int) / remain(Int 秒) / voltage(Double) / vehicleName / vin
    @objc static func update(withInfo info: NSDictionary) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.1, *) else { return }
        let charging = (info["charging"] as? NSNumber)?.boolValue ?? false
        if !charging {
            Task { await endAll() }
            return
        }
        let soc = (info["soc"] as? NSNumber)?.intValue ?? 0
        let power = (info["power"] as? NSNumber)?.intValue ?? 0
        let remain = (info["remain"] as? NSNumber)?.intValue ?? 0
        let voltage = (info["voltage"] as? NSNumber)?.doubleValue ?? 0
        let name = (info["vehicleName"] as? String) ?? "极核 ZEEHO"
        let vin = (info["vin"] as? String) ?? ""
        let state = ZeehoChargeAttributes.ContentState(
            soc: soc, power: power, remainSeconds: remain, voltage: voltage, charging: true
        )
        // 版本变更后强制重建一次活动，避免旧版本（旧扩展）创建的卡片一直渲染不出来
        let ver = (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? ""
        let key = "zh_la_render_ver"
        let versionChanged = UserDefaults.standard.string(forKey: key) != ver
        if versionChanged { UserDefaults.standard.set(ver, forKey: key) }
        // 面板「重新显示充电活动」手动触发时也重建，避免旧活动停在已结束/不渲染的状态
        let manual = (info["restart"] as? NSNumber)?.boolValue ?? false
        Task { await push(state: state, name: name, vin: vin, restart: versionChanged || manual, manual: manual) }
        #endif
    }

    /// 手动结束（退出充电页 / 停止充电）
    @objc static func end() {
        #if canImport(ActivityKit)
        guard #available(iOS 16.1, *) else { return }
        Task { await endAll() }
        #endif
    }

    #if canImport(ActivityKit)
    @available(iOS 16.1, *)
    private static func endAll() async {
        for act in Activity<ZeehoChargeAttributes>.activities {
            if #available(iOS 16.2, *) {
                await act.end(nil, dismissalPolicy: .immediate)
            } else {
                await act.end(dismissalPolicy: .immediate)
            }
        }
    }

    @available(iOS 16.1, *)
    private static func push(state: ZeehoChargeAttributes.ContentState, name: String, vin: String, restart: Bool, manual: Bool) async {
        if restart {
            let had = !Activity<ZeehoChargeAttributes>.activities.isEmpty
            await endAll()
            // iOS 16.1 刚结束的活动会短暂占用额度，立刻 request 可能抛 targetMaximumExceeded
            if had { try? await Task.sleep(nanoseconds: 1000_000_000) }
        } else if let act = Activity<ZeehoChargeAttributes>.activities.first {
            if #available(iOS 16.2, *) {
                await act.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(1800)))
            } else {
                await act.update(using: state)
            }
            NSLog("[ZH] 实时活动已更新 %d%% %dW", state.soc, state.power)
            if manual { postResult(true, "已重新显示充电活动，请查看锁屏 / 灵动岛") }
            return
        }
        if !ActivityAuthorizationInfo().areActivitiesEnabled {
            NSLog("[ZH] 实时活动被系统关闭")
            if manual { postResult(false, "系统已关闭实时活动：设置 → 极核 ZEEHO → 实时活动") }
            return
        }
        let attrs = ZeehoChargeAttributes(vehicleName: name, vin: vin)
        if await request(attrs: attrs, state: state) {
            NSLog("[ZH] 实时活动已启动 %d%% %dW", state.soc, state.power)
            if manual { postResult(true, "已重新显示充电活动，请查看锁屏 / 灵动岛") }
            return
        }
        // 失败兜底：iOS 16.1 偶发额度/缓存问题，结束残留活动后重试一次
        await endAll()
        try? await Task.sleep(nanoseconds: 1200_000_000)
        if await request(attrs: attrs, state: state) {
            NSLog("[ZH] 实时活动重试成功 %d%% %dW", state.soc, state.power)
            if manual { postResult(true, "已重新显示充电活动，请查看锁屏 / 灵动岛") }
        } else {
            NSLog("[ZH] 实时活动启动失败（已重试）")
            if manual { postResult(false, "实时活动启动失败，请重启手机后再试") }
        }
    }

    @available(iOS 16.1, *)
    private static func request(attrs: ZeehoChargeAttributes, state: ZeehoChargeAttributes.ContentState) async -> Bool {
        do {
            if #available(iOS 16.2, *) {
                _ = try Activity.request(
                    attributes: attrs,
                    content: ActivityContent(state: state, staleDate: Date().addingTimeInterval(1800)),
                    pushType: nil
                )
            } else {
                _ = try Activity.request(attributes: attrs, contentState: state, pushType: nil)
            }
            return true
        } catch {
            NSLog("[ZH] 实时活动启动失败: %@", String(describing: error))
            return false
        }
    }

    /// 把真实结果回执给面板（App 内 NotificationCenter → WebViewController → JS toast）
    private static func postResult(_ ok: Bool, _ msg: String) {
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: Notification.Name("ZHLiveActivityResult"),
                object: nil,
                userInfo: ["ok": ok, "msg": msg]
            )
        }
    }
    #endif
}
