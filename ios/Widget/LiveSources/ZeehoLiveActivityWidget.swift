// ZeehoLiveActivityWidget.swift — 充电实时活动专用扩展（锁屏卡片 + 灵动岛）
// 独立成一个 app-extension：iOS 16.1 有已知系统问题——同一 WidgetBundle 里同时存在
// 桌面小组件与实时活动时，灵动岛/锁屏实时活动可能不显示。把实时活动单独放一个扩展可规避。
import WidgetKit
import SwiftUI

#if canImport(ActivityKit)
import ActivityKit

// 本扩展独立模块，颜色常量自带一份（不能引用桌面小组件模块里的常量）
private let laBg = Color(red: 10/255, green: 15/255, blue: 30/255)
private let laBrand = Color(red: 43/255, green: 212/255, blue: 242/255)
private let laTxt2 = Color(red: 147/255, green: 160/255, blue: 184/255)

@available(iOS 16.1, *)
struct ZeehoChargeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ZeehoChargeAttributes.self) { context in
            ZeehoChargeLockView(state: context.state, name: context.attributes.vehicleName)
                .activityBackgroundTint(laBg)
                .activitySystemActionForegroundColor(.white)
                .widgetURL(panelURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: context.state.symbolName)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(laBrand)
                        Text(context.state.title)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.socText)
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 7) {
                        ProgressCapsule(progress: Double(min(100, max(0, context.state.soc))) / 100.0)
                            .frame(height: 6)
                        HStack {
                            Text(context.state.powerText)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(laBrand)
                            Spacer()
                            Text(context.state.remainText)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(laTxt2)
                        }
                    }
                    .padding(.horizontal, 2)
                }
            } compactLeading: {
                Image(systemName: context.state.symbolName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(laBrand)
            } compactTrailing: {
                Text(context.state.socText)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .monospacedDigit()
            } minimal: {
                Image(systemName: context.state.symbolName)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(laBrand)
            }
            .widgetURL(panelURL)
            .keylineTint(laBrand)
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
private struct ProgressCapsule: View {
    let progress: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.18))
                Capsule().fill(laBrand)
                    .frame(width: max(0, g.size.width * CGFloat(progress)))
            }
        }
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
                    Circle().fill(laBrand).frame(width: 7, height: 7)
                    Text(name + " " + state.title)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(state.socText)
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()
                }
                ProgressCapsule(progress: Double(min(100, max(0, state.soc))) / 100.0)
                    .frame(height: 6)
            }
            VStack(alignment: .trailing, spacing: 3) {
                Text(state.powerText)
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(laBrand)
                    .monospacedDigit()
                Text(state.remainText)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(laTxt2)
                if !state.voltageText.isEmpty {
                    Text(state.voltageText)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(laTxt2.opacity(0.85))
                }
            }
            .frame(width: 78, alignment: .trailing)
        }
        .padding(14)
    }
}

@main
struct ZeehoLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        ZeehoChargeLiveActivity()
    }
}
#endif
