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
        Task { await push(state: state, name: name, vin: vin) }
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
    private static func push(state: ZeehoChargeAttributes.ContentState, name: String, vin: String) async {
        if let act = Activity<ZeehoChargeAttributes>.activities.first {
            if #available(iOS 16.2, *) {
                await act.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(1800)))
            } else {
                await act.update(using: state)
            }
            NSLog("[ZH] 实时活动已更新 %d%% %dW", state.soc, state.power)
            return
        }
        let attrs = ZeehoChargeAttributes(vehicleName: name, vin: vin)
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
            NSLog("[ZH] 实时活动已启动 %d%% %dW", state.soc, state.power)
        } catch {
            NSLog("[ZH] 实时活动启动失败: %@", String(describing: error))
        }
    }
    #endif
}
