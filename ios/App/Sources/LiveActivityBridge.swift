// LiveActivityBridge.swift — 充电实时活动的启停与刷新（供 ObjC 通过 runtime 调用）
// ObjC 侧：Class c = NSClassFromString(@"ZeehoLiveActivityBridge"); [c performSelector:@selector(updateWithInfo:) withObject:dict];
// 注意：Swift 类默认运行时名是「模块名.类名」，必须用 @objc(ZeehoLiveActivityBridge) 固定成无前缀名，
// 否则 ObjC 的 NSClassFromString(@"ZeehoLiveActivityBridge") 取到 nil，实时活动会静默不生效。
import Foundation
import UIKit

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
        // v1.2.65 展示文案由 App 计算后传入，扩展只负责排版
        let socText = "\(soc)%"
        let powerText = power > 0 ? "\(power)W" : "--"
        let remainText: String
        if soc >= 100 {
            remainText = "已充满"
        } else if remain > 0 {
            let m = max(1, remain / 60)
            if m >= 60 {
                let h = m / 60, mm = m % 60
                remainText = "剩余 \(h) 时" + (mm > 0 ? " \(mm) 分" : "")
            } else {
                remainText = "剩余 \(m) 分"
            }
        } else {
            remainText = "剩余 --"
        }
        let voltageText = voltage > 0 ? "\(Int(voltage))V" : ""
        let state = ZeehoChargeAttributes.ContentState(
            soc: soc, power: power, remainSeconds: remain, voltage: voltage, charging: true,
            title: "充电中", socText: socText, powerText: powerText,
            remainText: remainText, voltageText: voltageText, symbolName: "bolt.fill"
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
        // iOS 16.1 已知问题：App 用 AVAudioSessionCategoryPlayback 常驻后台时，
        // 后台更新实时活动会被系统拦掉（16.2 才修复）。更新前短暂停掉常驻音频，
        // 让系统把这次更新当作普通后台刷新，更新完立刻恢复，避免面板数据卡住。
        let bgTask = await pauseKeepAliveIfNeeded()
        await pushInner(state: state, name: name, vin: vin, restart: restart, manual: manual)
        await resumeKeepAlive(bgTask)
    }

    /// 若当前在后台则申请后台任务并暂停常驻音频；返回后台任务 id（前台时为 .invalid）
    @available(iOS 16.1, *)
    private static func pauseKeepAliveIfNeeded() async -> UIBackgroundTaskIdentifier {
        let isActive = await MainActor.run { UIApplication.shared.applicationState == .active }
        if isActive { return .invalid }
        let task = await MainActor.run {
            UIApplication.shared.beginBackgroundTask(withName: "zh-live-activity-update") {}
        }
        // 没有拿到后台执行时间就不要停音频，避免 App 直接被挂起
        if task == .invalid { return .invalid }
        await MainActor.run {
            NotificationCenter.default.post(name: Notification.Name("ZHPauseKeepAlive"), object: nil)
        }
        try? await Task.sleep(nanoseconds: 300_000_000)
        return task
    }

    @available(iOS 16.1, *)
    private static func resumeKeepAlive(_ task: UIBackgroundTaskIdentifier) async {
        guard task != .invalid else { return }
        await MainActor.run {
            NotificationCenter.default.post(name: Notification.Name("ZHResumeKeepAlive"), object: nil)
            UIApplication.shared.endBackgroundTask(task)
        }
    }

    @available(iOS 16.1, *)
    private static func pushInner(state: ZeehoChargeAttributes.ContentState, name: String, vin: String, restart: Bool, manual: Bool) async {
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
        let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
        if !enabled {
            // 系统标记为关闭时也继续尝试一次：升级/重装后这个标记可能是滞后的假值
            NSLog("[ZH] areActivitiesEnabled=false，仍尝试启动实时活动")
        }
        let attrs = ZeehoChargeAttributes(vehicleName: name, vin: vin)
        if await request(attrs: attrs, state: state) == nil {
            NSLog("[ZH] 实时活动已启动 %d%% %dW", state.soc, state.power)
            if manual { postResult(true, "已重新显示充电活动，请查看锁屏 / 灵动岛") }
            return
        }
        // 失败兜底：iOS 16.1 偶发额度/缓存问题，结束残留活动后重试一次
        await endAll()
        try? await Task.sleep(nanoseconds: 1200_000_000)
        if await request(attrs: attrs, state: state) == nil {
            NSLog("[ZH] 实时活动重试成功 %d%% %dW", state.soc, state.power)
            if manual { postResult(true, "已重新显示充电活动，请查看锁屏 / 灵动岛") }
        } else {
            NSLog("[ZH] 实时活动启动失败（已重试）")
            if manual {
                let appName = (Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String) ?? "极核"
                postResult(false, enabled
                    ? "实时活动启动失败，请重启手机后再试"
                    : "系统已关闭实时活动：设置 → \(appName) → 实时活动")
            }
        }
    }

    /// 返回 nil 表示成功，否则返回错误描述
    @available(iOS 16.1, *)
    private static func request(attrs: ZeehoChargeAttributes, state: ZeehoChargeAttributes.ContentState) async -> String? {
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
            return nil
        } catch {
            NSLog("[ZH] 实时活动启动失败: %@", String(describing: error))
            return String(describing: error)
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
