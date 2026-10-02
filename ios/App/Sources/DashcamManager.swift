import Foundation
import Network
import UIKit

/// 行车记录仪管理器：检测记录仪 WiFi 热点 + 调起 RTSP 播放器
///
/// 行车记录仪与车机 TFT 是两个独立设备：
/// - 车机 TFT：192.168.0.1:6000（TCP 投屏，由 MotoplayManager 管）
/// - 行车记录仪：192.168.49.1:554（RTSP 直播，由本类管）
///
/// 用户需先在系统设置手动连接行车记录仪 WiFi（iOS 无法主动连 WiFi）
class DashcamManager: NSObject {

    // MARK: - 单例
    static let shared = DashcamManager()

    // MARK: - 常量
    private static let dashcamHost = "192.168.49.1"
    private static let dashcamPort: NWEndpoint.Port = 554  // RTSP 默认端口

    // MARK: - 状态
    private(set) var isConnected = false

    // MARK: - 连接探测
    /// TCP 探测 192.168.49.1:554，成功说明手机已连上行车记录仪 WiFi
    func checkConnection(completion: @escaping (Bool) -> Void) {
        if isConnected { completion(true); return }
        let host = NWEndpoint.Host(DashcamManager.dashcamHost)
        let conn = NWConnection(host: host, port: DashcamManager.dashcamPort, using: .tcp)
        var finished = false
        conn.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                if finished { return }
                finished = true
                self?.isConnected = true
                conn.cancel()
                completion(true)
            case .failed, .cancelled:
                if finished { return }
                finished = true
                self?.isConnected = false
                completion(false)
            default:
                break
            }
        }
        conn.start(queue: .global(qos: .utility))
        // 5 秒超时
        DispatchQueue.global().asyncAfter(deadline: .now() + 5) {
            if !finished {
                finished = true
                conn.cancel()
                self.isConnected = false
                completion(false)
            }
        }
    }

    // MARK: - ObjC 桥接方法（供 NSClassFromString 调用）
    /// 检测是否已连上行车记录仪 WiFi
    @objc static func mpCheckDashcam(_ callback: @escaping (Bool) -> Void) {
        shared.checkConnection(completion: callback)
    }

    /// 调起 RTSP 播放器（先探测，成功后 present）
    @objc static func mpPresentPlayer(_ rootVC: UIViewController, callback: @escaping (Bool) -> Void) {
        shared.checkConnection { ok in
            DispatchQueue.main.async {
                if ok {
                    let player = DashcamPlayerViewController()
                    player.modalPresentationStyle = .fullScreen
                    rootVC.present(player, animated: true)
                    callback(true)
                } else {
                    // 弹窗提示连 WiFi
                    let alert = UIAlertController(
                        title: "未连接行车记录仪",
                        message: "请先在系统设置连接行车记录仪 WiFi（默认 SSID: ZEEHO-DashCam）后重试。\nIP: 192.168.49.1  端口: 554",
                        preferredStyle: .alert
                    )
                    alert.addAction(UIAlertAction(title: "好的", style: .default))
                    rootVC.present(alert, animated: true)
                    callback(false)
                }
            }
        }
    }
}
