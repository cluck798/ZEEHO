// ZeehoChargeActivity.swift — 充电实时活动（Live Activity）共享数据模型
// 同时编译进 App 与小组件扩展两个 target（见 project.yml 的 Shared 目录）。
// v1.2.65：展示文案（充电中 / 已充满 / 剩余 X 分 / 功率 / 电压 / 图标名）全部由 App 传入，
// 扩展内不再写死中文，避免扩展资源异常时出现空文案。
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
        // 展示文案（由 App 计算后传入）
        public var title: String
        public var socText: String
        public var powerText: String
        public var remainText: String
        public var voltageText: String
        public var symbolName: String

        public init(soc: Int, power: Int, remainSeconds: Int, voltage: Double, charging: Bool,
                    title: String = "充电中", socText: String = "", powerText: String = "",
                    remainText: String = "", voltageText: String = "", symbolName: String = "bolt.fill") {
            self.soc = soc
            self.power = power
            self.remainSeconds = remainSeconds
            self.voltage = voltage
            self.charging = charging
            self.title = title
            self.socText = socText
            self.powerText = powerText
            self.remainText = remainText
            self.voltageText = voltageText
            self.symbolName = symbolName
        }

        /// 兼容旧活动（旧字段里没有文案字段），解码失败时回落到默认值
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            soc = (try? c.decode(Int.self, forKey: .soc)) ?? 0
            power = (try? c.decode(Int.self, forKey: .power)) ?? 0
            remainSeconds = (try? c.decode(Int.self, forKey: .remainSeconds)) ?? 0
            voltage = (try? c.decode(Double.self, forKey: .voltage)) ?? 0
            charging = (try? c.decode(Bool.self, forKey: .charging)) ?? true
            title = (try? c.decode(String.self, forKey: .title)) ?? "充电中"
            socText = (try? c.decode(String.self, forKey: .socText)) ?? "\(soc)%"
            powerText = (try? c.decode(String.self, forKey: .powerText)) ?? (power > 0 ? "\(power)W" : "--")
            remainText = (try? c.decode(String.self, forKey: .remainText)) ?? ""
            voltageText = (try? c.decode(String.self, forKey: .voltageText)) ?? ""
            symbolName = (try? c.decode(String.self, forKey: .symbolName)) ?? "bolt.fill"
        }

        enum CodingKeys: String, CodingKey {
            case soc, power, remainSeconds, voltage, charging
            case title, socText, powerText, remainText, voltageText, symbolName
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
