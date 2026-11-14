import WidgetKit

// Swift 类默认运行时名是「模块名.类名」，用 @objc(WidgetBridge) 固定成无前缀名，
// 否则 ObjC 的 NSClassFromString(@"WidgetBridge") 取到 nil，小组件时间线不会立即刷新。
@objcMembers
@objc(WidgetBridge)
class WidgetBridge: NSObject {
    @objc static func reloadAll() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
