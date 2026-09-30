import Foundation
import Network

/// Motoplay 投屏管理器：通过 WiFi 直连车机 TFT 屏幕，发送导航指令
/// 数据流：WKWebView 高德JS导航 → WKScriptMessageHandler → MotoplayManager → TCP → 车机TFT
class MotoplayManager: NSObject {

    // MARK: - 单例
    static let shared = MotoplayManager()

    // MARK: - 常量
    /// 车机 WiFi 热点默认 IP
    private static let instrumentHost = "192.168.0.1"
    /// 车机 TCP 端口（从二进制提取，常见端口逐一尝试）
    private static let instrumentPort: NWEndpoint.Port = 6000

    // MARK: - 投屏命令类型（从 CFMotoplayMotoplayInstrumentCommandManager 逆向）
    enum CastCommand: String {
        case startNavigation = "START_NAVIGATION"
        case stopNavigation = "STOP_NAVIGATION"
        case zoomMap = "ZOOM_MAP"
        case moveMap = "MOVE_MAP"
        case selectAddressAndPlan = "SELECT_ADDRESS_AND_PLAN"
        case routeList = "ROUTE_LIST"
        case selectRoute = "SELECT_ROUTE"
        case overviewMap = "OVERVIEW_MAP"
        case speed = "SPEED"
        case mapStyle = "MAPSTYLE"
        case setVoiceMode = "SET_VOICE_MODE"
        case castScreenType = "CAST_SCREEN_TYPE"
        case backSelectAddress = "BACK_SELECT_ADDRESS"
        case selectAddress = "SELECT_ADDRESS"
    }

    // MARK: - TCP 连接
    private var connection: NWConnection?
    private(set) var isConnected = false

    // MARK: - 回调
    var onStatusChange: ((String) -> Void)?

    // MARK: - WiFi 检测
    /// 检测当前是否连接到车机 WiFi（192.168.0.1）
    /// iOS 无法直接获取 WiFi SSID（需 NEHotspotConfiguration 或 CoreLocation 权限），
    /// 改用 TCP 连接探测：尝试连接 192.168.0.1:6000，成功则认为已连接车机 WiFi
    func checkConnection(completion: @escaping (Bool) -> Void) {
        if isConnected { completion(true); return }
        connect { [weak self] success in
            self?.isConnected = success
            completion(success)
        }
    }

    // MARK: - TCP 连接
    /// 建立 TCP 连接到车机
    func connect(completion: @escaping (Bool) -> Void) {
        let host = NWEndpoint.Host(MotoplayManager.instrumentHost)
        let conn = NWConnection(host: host, port: MotoplayManager.instrumentPort, using: .tcp)
        conn.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.isConnected = true
                self?.notify("已连接车机")
                completion(true)
            case .failed, .cancelled:
                self?.isConnected = false
                self?.notify("连接失败")
                completion(false)
            case .waiting:
                self?.notify("正在连接车机…")
            default:
                break
            }
        }
        conn.start(queue: .global(qos: .utility))
        self.connection = conn
        // 5秒超时
        DispatchQueue.global().asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self = self else { return }
            if !self.isConnected {
                self.connection?.cancel()
                self.connection = nil
                completion(false)
            }
        }
    }

    // MARK: - 断开
    func disconnect() {
        connection?.cancel()
        connection = nil
        isConnected = false
        notify("已断开车机")
    }

    // MARK: - 发送投屏命令
    /// 发送投屏命令到车机 TFT
    /// - Parameters:
    ///   - command: 命令类型
    ///   - data: 命令数据（JSON 字符串）
    ///   - completion: 发送结果
    func sendCommand(_ command: CastCommand, data: String, completion: @escaping (Bool) -> Void) {
        guard let conn = connection, isConnected else {
            // 未连接 → 自动连接 → 重试
            connect { [weak self] success in
                guard success, let self = self else { completion(false); return }
                self.sendCommandInternal(command, data: data, completion: completion)
            }
            return
        }
        sendCommandInternal(command, data: data, completion: completion)
    }

    private func sendCommandInternal(_ command: CastCommand, data: String, completion: @escaping (Bool) -> Void) {
        guard let conn = connection else { completion(false); return }

        // 协议格式：4字节长度 + 命令类型字符串 + JSON数据
        // 参考 sendCustomProtocolData:cmdType:callBack: 格式
        let cmdStr = command.rawValue
        let jsonData = data.data(using: .utf8) ?? Data()
        let cmdData = cmdStr.data(using: .utf8) ?? Data()

        // 构造数据包：[命令类型长度(4B)][命令类型][数据]
        var packet = Data()
        var cmdLen = UInt32(cmdData.count).bigEndian
        packet.append(Data(bytes: &cmdLen, count: 4))
        packet.append(cmdData)
        packet.append(jsonData)

        conn.send(content: packet, completion: .contentProcessed { error in
            if let error = error {
                self.notify("发送失败: \(error.localizedDescription)")
                completion(false)
            } else {
                completion(true)
            }
        })
    }

    // MARK: - 便捷方法
    /// 发送开始导航指令
    func startNavigation(routeData: [String: Any], completion: @escaping (Bool) -> Void) {
        let json = (try? JSONSerialization.data(withJSONObject: routeData)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        sendCommand(.startNavigation, data: json, completion: completion)
    }

    /// 发送停止导航指令
    func stopNavigation(completion: @escaping (Bool) -> Void) {
        sendCommand(.stopNavigation, data: "{}", completion: completion)
    }

    /// 发送当前位置/速度更新
    func updateSpeed(_ speed: Double, completion: @escaping (Bool) -> Void) {
        sendCommand(.speed, data: "{\"speed\":\(speed)}", completion: completion)
    }

    // MARK: - 状态回调
    private func notify(_ msg: String) {
        DispatchQueue.main.async {
            self.onStatusChange?(msg)
        }
    }

    // MARK: - ObjC 桥接方法（供 NSClassFromString 调用）
    @objc static func mpConnect(_ callback: @escaping (Bool) -> Void) {
        shared.connect(completion: callback)
    }

    @objc static func mpDisconnect() {
        shared.disconnect()
    }

    @objc static func mpIsConnected() -> Bool {
        return shared.isConnected
    }

    @objc static func mpSendNavData(_ command: String, data: String, callback: @escaping (Bool) -> Void) {
        guard let cmd = CastCommand(rawValue: command) else {
            callback(false); return
        }
        shared.sendCommand(cmd, data: data, completion: callback)
    }
}
