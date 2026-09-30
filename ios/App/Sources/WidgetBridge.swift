import WidgetKit

@objcMembers class WidgetBridge: NSObject {
    @objc static func reloadAll() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
