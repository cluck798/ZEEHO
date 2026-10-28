// ZeehoWidget.swift — iOS 桌面小组件（WidgetKit）
// 数据来源：主 App 周期调用 /api/widget-snapshot 并写入 App Group 共享目录
//   widget_snapshot.json（数据）、widget_vehicle.png（车辆照片，v2.16.45）
// 小组件每 15 分钟读取共享文件刷新；点击小组件跳回 App
// v2.16.45 布局对齐安卓：车型/坐垫·车锁 → 车辆照片 + 胎压/定位/签到 → 电量续航电压 + 进度条
import WidgetKit
import SwiftUI
import UIKit

struct ZeehoSnapshot: Codable {
    let ok: Bool?
    let ts: String?
    let accountName: String?
    let vehicleName: String?
    let vehicleModel: String?
    let hasVehicle: Bool?
    let soc: Int?
    let range: Int?
    let voltage: Double?
    let current: Double?
    let chargeState: String?
    let online: String?
    let score: Int?
    let continueDays: Int?
    let todayScore: Int?
    let signedToday: Bool?
    let todayDistance: Double?
    let totalMileage: Double?
    // v2.16.45 车辆卡片新增字段
    let address: String?
    let lockState: String?
    let cushionState: String?
    let frontPressure: String?
    let frontTemp: String?
    let rearPressure: String?
    let rearTemp: String?
    let power: Int?
    let chargeRemainSec: Int?
    let vehicleImageUrl: String?
}

enum SharedStore {
#if SINGLE_WIDGET
    static let groupID = "group.com.zeeho.signpanel.single"
#else
    static let groupID = "group.com.zeeho.signpanel"
#endif
    static func load() -> ZeehoSnapshot? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        let file = url.appendingPathComponent("widget_snapshot.json")
        guard let data = try? Data(contentsOf: file) else { return nil }
        return try? JSONDecoder().decode(ZeehoSnapshot.self, from: data)
    }
    static func vehicleImage() -> UIImage? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        let file = url.appendingPathComponent("widget_vehicle.png")
        guard let data = try? Data(contentsOf: file) else { return nil }
        return UIImage(data: data)
    }
}

struct ZeehoEntry: TimelineEntry {
    let date: Date
    let snap: ZeehoSnapshot?
    let image: UIImage?
}

struct ZeehoProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZeehoEntry {
        ZeehoEntry(date: Date(), snap: nil, image: nil)
    }
    func getSnapshot(in context: Context, completion: @escaping (ZeehoEntry) -> Void) {
        completion(ZeehoEntry(date: Date(), snap: SharedStore.load(), image: SharedStore.vehicleImage()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ZeehoEntry>) -> Void) {
        let entry = ZeehoEntry(date: Date(), snap: SharedStore.load(), image: SharedStore.vehicleImage())
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// ---------- 样式 ----------
let zhBg = Color(red: 10/255, green: 15/255, blue: 30/255)
let zhBrand = Color(red: 43/255, green: 212/255, blue: 242/255)
let zhOk = Color(red: 61/255, green: 220/255, blue: 151/255)
let zhErr = Color(red: 249/255, green: 112/255, blue: 106/255)
let zhTxt2 = Color(red: 147/255, green: 160/255, blue: 184/255)
let zhDim = Color(red: 94/255, green: 110/255, blue: 136/255)
let zhLine = Color(red: 146/255, green: 170/255, blue: 205/255).opacity(0.18)

func fmtTime(_ iso: String?) -> String {
    guard let iso = iso else { return "--:--" }
    let f = ISO8601DateFormatter()
    guard let d = f.date(from: iso) else { return "--:--" }
    let df = DateFormatter()
    df.dateFormat = "HH:mm"
    return df.string(from: d)
}

func socColor(_ soc: Int) -> Color {
    if soc <= 20 { return zhErr }
    if soc <= 50 { return Color(red: 247/255, green: 185/255, blue: 85/255) }
    return zhOk
}

func isOnline(_ s: String?) -> Bool {
    guard let s = s else { return false }
    return s.contains("ONLINE") || s.contains("在线")
}

func isCharging(_ s: String?) -> Bool {
    guard let s = s, s.contains("充电") else { return false }
    return !s.contains("未充电")
}

/// 与服务端一致：1=已关锁，0=未关锁，文本含未/开=未关
func lockText(_ s: String?) -> String {
    let t = (s ?? "").trimmingCharacters(in: .whitespaces)
    if t.isEmpty { return "" }
    if t == "1" { return "已关锁" }
    if t == "0" { return "未关锁" }
    if t.contains("未") || t.contains("开") { return "未关锁" }
    if t.contains("关") || t.contains("锁") { return "已关锁" }
    return ""
}

func cushionText(_ s: String?) -> String {
    let t = (s ?? "").trimmingCharacters(in: .whitespaces)
    if t.isEmpty { return "" }
    if t == "1" { return "坐垫已关" }
    if t == "0" { return "坐垫未关" }
    if t.contains("未") || t.contains("开") { return "坐垫未关" }
    if t.contains("关") || t.contains("合") || t.contains("锁") { return "坐垫已关" }
    return "坐垫" + t
}

func pressureValue(_ s: String?) -> String {
    let t = (s ?? "").trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t == "未绑定" || t == "null" { return "" }
    return t
}

func tireLine(_ prefix: String, _ p: String?, _ temp: String?) -> String {
    let v = pressureValue(p)
    if v.isEmpty { return "" }
    let t = (temp ?? "").trimmingCharacters(in: .whitespaces)
    return "\(prefix) \(v)" + (t.isEmpty ? "" : " \(t)")
}

func remainText(_ sec: Int?) -> String {
    let s = sec ?? 0
    if s <= 0 { return "" }
    let m = max(1, s / 60)
    return m >= 60 ? "\(m / 60) 时" + (m % 60 > 0 ? " \(m % 60) 分" : "") : "\(m) 分"
}

// ---------- 组件 ----------
struct HeaderView: View {
    let snap: ZeehoSnapshot?
    var body: some View {
        HStack(spacing: 6) {
            Text(snap?.vehicleName ?? "ZEEHO")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            Spacer()
            if isCharging(snap?.chargeState) {
                chip("充电中", zhBrand)
            } else if isOnline(snap?.online) {
                chip("在线", zhOk)
            }
        }
    }
    private func chip(_ text: String, _ color: Color) -> some View {
        Text(text).font(.system(size: 9, weight: .bold)).foregroundColor(color)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(color.opacity(0.16)).cornerRadius(6)
    }
}

struct ChipRow: View {
    let snap: ZeehoSnapshot?
    var body: some View {
        HStack(spacing: 1) {
            Text(snap?.vehicleModel ?? "").font(.system(size: 10, weight: .semibold)).foregroundColor(zhDim).lineLimit(1)
            Spacer()
            let seat = cushionText(snap?.cushionState)
            let lock = lockText(snap?.lockState)
            if !seat.isEmpty { smallChip(seat) }
            if !lock.isEmpty { smallChip(lock) }
        }
    }
    private func smallChip(_ text: String) -> some View {
        Text(text).font(.system(size: 9, weight: .bold)).foregroundColor(zhTxt2)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(Color(red: 17/255, green: 26/255, blue: 43/255))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(zhLine, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

/// 照片 + 胎压 / 定位 / 签到（位于电量区上方）
struct VehicleInfoView: View {
    let snap: ZeehoSnapshot?
    let image: UIImage?
    var photoW: CGFloat = 92
    var photoH: CGFloat = 62
    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            if let img = image {
                Image(uiImage: img)
                    .resizable().scaledToFit()
                    .frame(width: photoW, height: photoH)
                    .padding(3)
                    .background(Color(red: 11/255, green: 19/255, blue: 34/255))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(zhLine, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            VStack(alignment: .leading, spacing: 2) {
                let f = tireLine("前", snap?.frontPressure, snap?.frontTemp)
                let r = tireLine("后", snap?.rearPressure, snap?.rearTemp)
                if !f.isEmpty { Text(f).font(.system(size: 9.5, weight: .semibold)).foregroundColor(zhTxt2) }
                if !r.isEmpty { Text(r).font(.system(size: 9.5, weight: .semibold)).foregroundColor(zhTxt2) }
                if let addr = snap?.address, !addr.isEmpty {
                    Text("📍 " + addr).font(.system(size: 9.5, weight: .semibold)).foregroundColor(zhTxt2).lineLimit(1)
                }
                Text(snap?.signedToday == true ? "今日已签到 · +\(snap?.todayScore ?? 0) 分" : "今日未签到")
                    .font(.system(size: 9.5, weight: .semibold))
                    .foregroundColor(snap?.signedToday == true ? zhOk : zhTxt2)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
    }
}

struct BatteryView: View {
    let snap: ZeehoSnapshot?
    var socSize: CGFloat = 26
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(snap?.soc ?? 0)").font(.system(size: socSize, weight: .heavy, design: .rounded))
                    .foregroundColor(socColor(snap?.soc ?? 0))
                Text("%").font(.system(size: 11, weight: .bold)).foregroundColor(zhTxt2)
                Text("\(snap?.range ?? 0) km").font(.system(size: 12, weight: .bold)).foregroundColor(zhTxt2)
                Spacer()
                if let v = snap?.voltage, v > 0 {
                    Text("\(Int(v)) V").font(.system(size: 11, weight: .bold)).foregroundColor(zhTxt2)
                }
            }
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color(red: 36/255, green: 49/255, blue: 70/255))
                    Capsule().fill(zhBrand)
                        .frame(width: max(0, g.size.width * CGFloat(min(100, max(0, snap?.soc ?? 0))) / 100))
                }
            }
            .frame(height: 5)
        }
    }
}

struct StateLine: View {
    let snap: ZeehoSnapshot?
    var body: some View {
        HStack(spacing: 4) {
            if isCharging(snap?.chargeState) {
                let p = snap?.power ?? 0
                let rm = remainText(snap?.chargeRemainSec)
                Text("⚡ 充电中" + (p > 0 ? " · \(p)W" : "") + (rm.isEmpty ? "" : " · 剩余 \(rm)"))
                    .font(.system(size: 9.5, weight: .semibold)).foregroundColor(zhBrand).lineLimit(1)
            } else {
                let d = snap?.todayDistance ?? 0
                Text((snap?.chargeState ?? "未充电") + (d > 0 ? String(format: " · 今日 %.1f km", d) : ""))
                    .font(.system(size: 9.5, weight: .semibold)).foregroundColor(zhTxt2).lineLimit(1)
            }
            Spacer()
            Text("更新 \(fmtTime(snap?.ts))").font(.system(size: 9, weight: .semibold)).foregroundColor(zhTxt2.opacity(0.75))
        }
    }
}

// ---------- 家族布局 ----------
struct SmallWidgetView: View {
    let snap: ZeehoSnapshot?
    let image: UIImage?
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HeaderView(snap: snap)
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(snap?.soc ?? 0)%")
                    .font(.system(size: 30, weight: .heavy, design: .rounded))
                    .foregroundColor(socColor(snap?.soc ?? 0))
                Text("\(snap?.range ?? 0)km")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(zhTxt2)
            }
            Text("连签 \(snap?.continueDays ?? 0) 天 · \(snap?.signedToday == true ? "已签到" : "未签到")")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(zhTxt2)
                .lineLimit(1)
            Text("更新 \(fmtTime(snap?.ts))")
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(zhTxt2.opacity(0.7))
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(zhBg)
    }
}

struct MediumWidgetView: View {
    let snap: ZeehoSnapshot?
    let image: UIImage?
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HeaderView(snap: snap)
            ChipRow(snap: snap)
            VehicleInfoView(snap: snap, image: image, photoW: 84, photoH: 56)
            BatteryView(snap: snap, socSize: 26)
            StateLine(snap: snap)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(zhBg)
    }
}

struct LargeWidgetView: View {
    let snap: ZeehoSnapshot?
    let image: UIImage?
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HeaderView(snap: snap)
            ChipRow(snap: snap)
            VehicleInfoView(snap: snap, image: image, photoW: 116, photoH: 82)
            BatteryView(snap: snap, socSize: 40)
            HStack(spacing: 8) {
                cell("今日骑行", String(format: "%.1f km", snap?.todayDistance ?? 0))
                cell("总里程", String(format: "%.0f km", snap?.totalMileage ?? 0))
            }
            Spacer(minLength: 0)
            HStack {
                Text(snap?.accountName ?? "")
                Spacer()
                Text(snap?.signedToday == true ? "✓ 已签到" : "未签到")
                    .foregroundColor(snap?.signedToday == true ? zhOk : zhTxt2)
            }
            .font(.system(size: 9, weight: .semibold)).foregroundColor(zhTxt2.opacity(0.8))
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(zhBg)
    }
    func cell(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(k).font(.system(size: 9, weight: .semibold)).foregroundColor(zhTxt2)
            Text(v).font(.system(size: 13, weight: .bold)).foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(Color.white.opacity(0.05)).cornerRadius(10)
    }
}

struct ZeehoWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: ZeehoEntry
    var body: some View {
        Group {
            switch family {
            case .systemMedium: MediumWidgetView(snap: entry.snap, image: entry.image)
            case .systemLarge: LargeWidgetView(snap: entry.snap, image: entry.image)
            default: SmallWidgetView(snap: entry.snap, image: entry.image)
            }
        }
        .widgetURL(URL(string: "zeehopanel://widget"))
    }
}

@main
struct ZeehoWidget: Widget {
    let kind = "ZeehoWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZeehoProvider()) { entry in
            ZeehoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("极核 ZEEHO")
        .description("车辆照片 / 胎压 / 定位 / 电量续航 / 充电 / 签到")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
