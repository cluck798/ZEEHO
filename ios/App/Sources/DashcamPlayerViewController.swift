import Foundation
import UIKit
import VLCKit
import Network

/// 行车记录仪 RTSP 实时预览播放器
///
/// 数据流：JS 调 window.webkit.messageHandlers.dashcam → WebViewController.m 桥接
/// → DashcamManager.mpPresentPlayer → TCP 探测 192.168.49.1:554 → DashcamPlayerViewController
/// → VLCKit 拉 rtsp://192.168.49.1 实时直播
///
/// 行车记录仪 WiFi 是独立热点（不是车机 TFT 192.168.0.1），需手机先手动连上
/// SSID 通常为 ZEEHO-DashCam 或类似名称，IP 固定 192.168.49.1
class DashcamPlayerViewController: UIViewController {

    // MARK: - 常量
    /// 行车记录仪 WiFi 默认 IP（车机 TFT 是 192.168.0.1，记录仪是 192.168.49.1，二者不同网段）
    static let dashcamHost = "192.168.49.1"
    /// RTSP 默认端口
    static let dashcamPort: NWEndpoint.Port = 554
    /// RTSP 流地址（路径可空，根路径即直播流）
    static let rtspURL = "rtsp://192.168.49.1/"

    // MARK: - 播放器
    private var mediaPlayer = VLCMediaPlayer()
    private var videoView: UIView!
    private var closeButton: UIButton!
    private var statusLabel: UILabel!
    private var reconnectButton: UIButton!
    private var hintLabel: UILabel!
    private var connectCheck: NWConnection?

    // MARK: - 生命周期
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        overrideUserInterfaceStyle = .dark
        setupUI()
        setupPlayer()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startPlayback()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopPlayback()
    }

    // MARK: - UI
    private func setupUI() {
        // 视频显示层
        videoView = UIView()
        videoView.backgroundColor = .black
        videoView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(videoView)

        // 关闭按钮（右上）
        closeButton = UIButton(type: .system)
        closeButton.setTitle("✕", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.titleLabel?.font = .systemFont(ofSize: 22, weight: .bold)
        closeButton.backgroundColor = UIColor(white: 0, alpha: 0.5)
        closeButton.layer.cornerRadius = 18
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        view.addSubview(closeButton)

        // 状态提示（居中）
        statusLabel = UILabel()
        statusLabel.text = "正在连接行车记录仪…"
        statusLabel.textColor = .white
        statusLabel.font = .systemFont(ofSize: 14, weight: .medium)
        statusLabel.textAlignment = .center
        statusLabel.backgroundColor = UIColor(white: 0, alpha: 0.5)
        statusLabel.layer.cornerRadius = 8
        statusLabel.layer.masksToBounds = true
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        // 内边距用 padding
        statusLabel.textAlignment = .center
        view.addSubview(statusLabel)

        // 重连按钮（底部）
        reconnectButton = UIButton(type: .system)
        reconnectButton.setTitle("重新连接", for: .normal)
        reconnectButton.setTitleColor(.white, for: .normal)
        reconnectButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        reconnectButton.backgroundColor = UIColor(red: 8/255, green: 145/255, blue: 178/255, alpha: 1.0)
        reconnectButton.layer.cornerRadius = 22
        reconnectButton.translatesAutoresizingMaskIntoConstraints = false
        reconnectButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 28, bottom: 10, right: 28)
        reconnectButton.addTarget(self, action: #selector(reconnectTapped), for: .touchUpInside)
        reconnectButton.isHidden = true
        view.addSubview(reconnectButton)

        // 连接提示（顶部）
        hintLabel = UILabel()
        hintLabel.text = "📡 RTSP 192.168.49.1"
        hintLabel.textColor = UIColor(white: 1, alpha: 0.7)
        hintLabel.font = .systemFont(ofSize: 11, weight: .medium)
        hintLabel.backgroundColor = UIColor(white: 0, alpha: 0.4)
        hintLabel.layer.cornerRadius = 6
        hintLabel.layer.masksToBounds = true
        hintLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hintLabel)

        NSLayoutConstraint.activate([
            videoView.topAnchor.constraint(equalTo: view.topAnchor),
            videoView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            videoView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            videoView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 36),
            closeButton.heightAnchor.constraint(equalToConstant: 36),

            hintLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            hintLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            hintLabel.heightAnchor.constraint(equalToConstant: 24),

            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            statusLabel.heightAnchor.constraint(equalToConstant: 36),
            statusLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 280),

            reconnectButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -32),
            reconnectButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            reconnectButton.heightAnchor.constraint(equalToConstant: 44),
        ])
    }

    private func setupPlayer() {
        mediaPlayer.delegate = self
        mediaPlayer.drawable = videoView
    }

    // MARK: - 播放控制
    private func startPlayback() {
        guard let url = URL(string: DashcamPlayerViewController.rtspURL) else {
            showError("RTSP 地址无效")
            return
        }
        let media = VLCMedia(url: url)
        // RTSP over TCP（避免 UDP 在 WiFi 弱信号下丢包，车机环境首选）
        media.addOption(":rtsp-tcp")
        media.addOption(":rtsp-tcp=1")
        // 网络缓冲 1000ms（默认 600ms，行车记录仪低延迟场景保留 1s 平衡卡顿）
        media.addOption(":network-caching=1000")
        // 硬解码（H.264 走 VideoToolbox，省电）
        media.addOption(":codec=avcodec")
        // 禁用音频（行车记录仪现场通常无需声音）
        media.addOption(":no-audio")

        mediaPlayer.media = media
        mediaPlayer.play()
        statusLabel.text = "正在连接 \(DashcamPlayerViewController.rtspURL)…"
        statusLabel.isHidden = false
        reconnectButton.isHidden = true
    }

    private func stopPlayback() {
        mediaPlayer.stop()
    }

    // MARK: - 按钮
    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func reconnectTapped() {
        stopPlayback()
        // 重连前再次探测 TCP，避免一直失败
        DashcamManager.shared.checkConnection { [weak self] ok in
            guard let self = self else { return }
            DispatchQueue.main.async {
                if ok {
                    self.startPlayback()
                } else {
                    self.showError("无法连接 192.168.49.1:554\n请确认已连接行车记录仪 WiFi")
                }
            }
        }
    }

    // MARK: - 状态更新
    private func updateStatus(_ text: String) {
        DispatchQueue.main.async {
            self.statusLabel.text = text
            self.statusLabel.isHidden = text.isEmpty
        }
    }

    private func showError(_ message: String) {
        DispatchQueue.main.async {
            self.statusLabel.text = message
            self.statusLabel.isHidden = false
            self.reconnectButton.isHidden = false
        }
    }
}

// MARK: - VLCMediaPlayerDelegate
extension DashcamPlayerViewController: VLCMediaPlayerDelegate {
    func mediaPlayerStateChanged(_ notification: Notification!) {
        let state = mediaPlayer.state
        switch state {
        case .playing:
            updateStatus("")
        case .buffering:
            updateStatus("缓冲中…")
        case .opening:
            updateStatus("正在打开流…")
        case .error:
            showError("连接失败\n请确认已连接行车记录仪 WiFi（ZEEHO-DashCam）")
        case .ended:
            showError("直播已结束")
        case .paused:
            updateStatus("已暂停")
        case .stopped:
            break
        @unknown default:
            break
        }
    }
}
