#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^ZHDiagEventHandler)(NSString *type, NSString *message);

/// 车辆诊断服务：BLE 发现 + WiFi 凭证推导 + DoIP/UDS 诊断（TCP 13400）
/// 协议参数与桌面版 zeeho-diag 一致（lib/protocol.js、diagClient.js、vehicleService.js）
@interface ZHDiagService : NSObject

+ (instancetype)shared;

/// 事件回调（type: log / pdu），可能在任意线程触发，UI 侧需自行切主线程
@property (nonatomic, copy, nullable) ZHDiagEventHandler eventHandler;

/// 处理 JS 桥诊断操作
/// op: bleScan / wifiCredentials / diagConnect / diagDisconnect /
///     readVehicleInfo / checkOnline / readFaultCodes / openWifiSettings
- (void)handleOp:(NSString *)op
            args:(NSDictionary *)args
           reply:(void (^)(id _Nullable result, NSString *_Nullable error))reply;

@end

NS_ASSUME_NONNULL_END
