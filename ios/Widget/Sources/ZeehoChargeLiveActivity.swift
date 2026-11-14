// ZeehoChargeLiveActivity.swift — 充电实时活动（锁屏卡片 + 灵动岛）
import WidgetKit
import SwiftUI

#if canImport(ActivityKit)
import ActivityKit
#endif

#if canImport(ActivityKit)
@available(iOS 16.1, *)
struct ZeehoChargeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ZeehoChargeAttributes.self) { context in
            ZeehoChargeLockView(state: context.state, name: context.attributes.vehicleName)
                .activityBackgroundTint(zhBg)
                .activitySystemActionForegroundColor(.white)
                .widgetURL(panelURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "bolt.fill").font(.system(size: 12, weight: .bold)).foregroundColor(zhBrand)
                        Text("充电中").font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.soc)%")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.16))
                                Capsule().fill(zhBrand)
                                    .frame(width: max(0, g.size.width * CGFloat(min(100, max(0, context.state.soc))) / 100))
                            }
                        }
                        .frame(height: 5)
                        HStack {
                            Text(context.state.power > 0 ? "\(context.state.power)W" : "--")
                                .font(.system(size: 11, weight: .bold)).foregroundColor(zhBrand)
                            Spacer()
                            Text(laRemainText(context.state.remainSeconds))
                                .font(.system(size: 11, weight: .semibold)).foregroundColor(zhTxt2)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: "bolt.fill").font(.system(size: 11, weight: .bold)).foregroundColor(zhBrand)
            } compactTrailing: {
                Text("\(context.state.soc)%")
                    .font(.system(size: 11, weight: .bold)).foregroundColor(.white).monospacedDigit()
            } minimal: {
                Image(systemName: "bolt.fill").font(.system(size: 12, weight: .bold)).foregroundColor(zhBrand)
            }
            .widgetURL(panelURL)
            .keylineTint(zhBrand)
        }
    }

    private var panelURL: URL? {
#if SINGLE_WIDGET
        return URL(string: "zeehosingle://widget")
#else
        return URL(string: "zeehopanel://widget")
#endif
    }
}

@available(iOS 16.1, *)
private struct ZeehoChargeLockView: View {
    let state: ZeehoChargeAttributes.ContentState
    let name: String

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Circle().fill(zhBrand).frame(width: 7, height: 7)
                    Text(name + " 充电中")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(state.soc)")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()
                    Text("%").font(.system(size: 11, weight: .bold)).foregroundColor(zhTxt2)
                }
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.14))
                        Capsule().fill(zhBrand)
                            .frame(width: max(0, g.size.width * CGFloat(min(100, max(0, state.soc))) / 100))
                    }
                }
                .frame(height: 6)
            }
            VStack(alignment: .trailing, spacing: 3) {
                Text(state.power > 0 ? "\(state.power)W" : "--")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(zhBrand)
                    .monospacedDigit()
                Text(laRemainText(state.remainSeconds))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(zhTxt2)
                if state.voltage > 0 {
                    Text("\(Int(state.voltage))V")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(zhTxt2.opacity(0.85))
                }
            }
            .frame(width: 78, alignment: .trailing)
        }
        .padding(14)
    }
}

@available(iOS 16.1, *)
private func laRemainText(_ sec: Int) -> String {
    if sec <= 0 { return "剩余 --" }
    let m = max(1, sec / 60)
    if m >= 60 {
        let h = m / 60, mm = m % 60
        return "剩余 \(h) 时" + (mm > 0 ? " \(mm) 分" : "")
    }
    return "剩余 \(m) 分"
}
#endif

// MARK: - 扩展入口（桌面小组件 + 实时活动）

@main
struct ZeehoWidgetBundle: WidgetBundle {
    var body: some Widget {
        ZeehoWidget()
        if #available(iOS 16.1, *) {
            ZeehoChargeLiveActivity()
        }
    }
}
