// ZeehoChargeActivity.swift — 充电实时活动（Live Activity）共享数据模型
// 同时编译进 App 与小组件扩展两个 target（见 project.yml 的 Shared 目录）。
import Foundation

#if canImport(ActivityKit)
import ActivityKit

/// 充电中锁屏 / 灵动岛展示的实时活动属性。
@available(iOS 16.1, *)
public struct ZeehoChargeAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var soc: Int
        public var power: Int
        public var remainSeconds: Int
        public var voltage: Double
        public var charging: Bool

        public init(soc: Int, power: Int, remainSeconds: Int, voltage: Double, charging: Bool) {
            self.soc = soc
            self.power = power
            self.remainSeconds = remainSeconds
            self.voltage = voltage
            self.charging = charging
        }
    }

    public var vehicleName: String
    public var vin: String

    public init(vehicleName: String, vin: String) {
        self.vehicleName = vehicleName
        self.vin = vin
    }
}
#endif
