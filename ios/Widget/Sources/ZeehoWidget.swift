// ZeehoWidget.swift — iOS 桌面小组件（WidgetKit）
// 数据来源：主 App 周期调用 /api/widget-snapshot 并写入 App Group 共享目录 widget_snapshot.json
// 小组件每 15 分钟读取共享文件刷新；点击小组件跳回 App
import WidgetKit
import SwiftUI

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
}

enum SharedStore {
    static let groupID = "group.com.zeeho.signpanel"
    static func load() -> ZeehoSnapshot? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        let file = url.appendingPathComponent("widget_snapshot.json")
        guard let data = try? Data(contentsOf: file) else { return nil }
        return try? JSONDecoder().decode(ZeehoSnapshot.self, from: data)
    }
}

struct ZeehoEntry: TimelineEntry {
    let date: Date
    let snap: ZeehoSnapshot?
}

struct ZeehoProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZeehoEntry {
        ZeehoEntry(date: Date(), snap: nil)
    }
    func getSnapshot(in context: Context, completion: @escaping (ZeehoEntry) -> Void) {
        completion(ZeehoEntry(date: Date(), snap: SharedStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ZeehoEntry>) -> Void) {
        let entry = ZeehoEntry(date: Date(), snap: SharedStore.load())
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

struct HeaderView: View {
    let snap: ZeehoSnapshot?
    var body: some View {
        HStack(spacing: 6) {
            Text(snap?.vehicleName ?? "ZEEHO")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            Spacer()
            if let cs = snap?.chargeState, cs != "未充电" {
                Text(cs).font(.system(size: 9, weight: .bold)).foregroundColor(zhBrand)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(zhBrand.opacity(0.16)).cornerRadius(6)
            } else if let on = snap?.online, on == "1" {
                Text("在线").font(.system(size: 9, weight: .bold)).foregroundColor(zhOk)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(zhOk.opacity(0.16)).cornerRadius(6)
            }
        }
    }
}

struct SmallWidgetView: View {
    let snap: ZeehoSnapshot?
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
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HeaderView(snap: snap)
            Spacer()
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(snap?.soc ?? 0)%")
                            .font(.system(size: 30, weight: .heavy, design: .rounded))
                            .foregroundColor(socColor(snap?.soc ?? 0))
                        Text("\(snap?.range ?? 0) km")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(zhTxt2)
                    }
                    Text("电压 \(String(format: "%.1f", snap?.voltage ?? 0))V · \(snap?.chargeState ?? "未充电")")
                        .font(.system(size: 10, weight: .semibold)).foregroundColor(zhTxt2)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("积分 \(snap?.score ?? 0)")
                        .font(.system(size: 11, weight: .bold)).foregroundColor(zhOk)
                    Text("连签 \(snap?.continueDays ?? 0) 天")
                        .font(.system(size: 10, weight: .semibold)).foregroundColor(.white)
                    Text("今 +\(snap?.todayScore ?? 0)")
                        .font(.system(size: 10, weight: .semibold)).foregroundColor(zhBrand)
                }
            }
            HStack {
                Text("更新 \(fmtTime(snap?.ts))")
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
}

struct LargeWidgetView: View {
    let snap: ZeehoSnapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HeaderView(snap: snap)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(snap?.soc ?? 0)%")
                    .font(.system(size: 46, weight: .heavy, design: .rounded))
                    .foregroundColor(socColor(snap?.soc ?? 0))
                Text("\(snap?.range ?? 0)km").font(.system(size: 18, weight: .bold)).foregroundColor(zhTxt2)
                Text("\(String(format: "%.1f", snap?.voltage ?? 0))V").font(.system(size: 15, weight: .bold)).foregroundColor(zhTxt2)
            }
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.12))
                    Capsule().fill(socColor(snap?.soc ?? 0))
                        .frame(width: g.size.width * CGFloat(snap?.soc ?? 0) / 100)
                }
            }
            .frame(height: 7)
            HStack(spacing: 8) {
                cell("今日骑行", String(format: "%.1f km", snap?.todayDistance ?? 0))
                cell("总里程", String(format: "%.0f km", snap?.totalMileage ?? 0))
            }
            HStack(spacing: 8) {
                cell("总积分", "\(snap?.score ?? 0)")
                cell("连签", "\(snap?.continueDays ?? 0) 天")
            }
            Spacer()
            HStack {
                Text("更新 \(fmtTime(snap?.ts)) · \(snap?.accountName ?? "")")
                Spacer()
                Text(snap?.signedToday == true ? "✓ 已签到" : "未签到")
                    .foregroundColor(snap?.signedToday == true ? zhOk : zhTxt2)
            }
            .font(.system(size: 9, weight: .semibold)).foregroundColor(zhTxt2.opacity(0.8))
        }
        .padding(16)
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
            case .systemMedium: MediumWidgetView(snap: entry.snap)
            case .systemLarge: LargeWidgetView(snap: entry.snap)
            default: SmallWidgetView(snap: entry.snap)
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
        .description("电量 / 续航 / 签到 / 积分实时状态")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
