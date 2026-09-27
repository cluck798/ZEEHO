// ZHDiagService.m — iOS 车辆诊断服务
// 协议参数 1:1 移植自桌面版 zeeho-diag（lib/protocol.js、diagClient.js、vehicleService.js）：
//   - BLE 扫描 zeehok1-* 广播（CoreBluetooth）
//   - WiFi 凭证推导（蓝牙名/VIN → SSID/密码）
//   - DoIP(ISO 13400) over TCP 192.168.49.1:13400（Network.framework）
//   - UDS 只读诊断：车辆信息 / VCDM 在线检测 / 故障码
#import "ZHDiagService.h"
#import <Network/Network.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import <UIKit/UIKit.h>

#pragma mark - DoIP 常量（与 protocol.js 一致）

static NSString * const kDoipHost = @"192.168.49.1";
static const char *kDoipPortC = "13400";
static const uint8_t  kDoipVersion = 3;
static const uint16_t kDoipSourceAddress = 3584;   // 0x0E00
static const uint16_t kDoipTargetVCDM = 1;
static const uint16_t kPayloadRouteActiveReq = 5;
static const uint16_t kPayloadAliveCheckReq = 7;
static const uint16_t kPayloadDiagnosticMessage = 32769; // 0x8001
static const NSUInteger kDoipHeaderLength = 8;
static const NSTimeInterval kDiagResponseTimeout = 3.0;
static const NSTimeInterval kConnectTimeout = 5.0;
static const NSTimeInterval kHeartbeatInterval = 2.0;
static const NSInteger kDiagRetries = 4;

// UDS 指令表（十进制，首字节为长度，与 protocol.js UDS 一致）
static const uint8_t kUdsReadVin[]            = {3, 34, 241, 144}; // 0xF190
static const uint8_t kUdsReadSwVersion[]      = {3, 34, 241, 149}; // 0xF195
static const uint8_t kUdsReadPartNumber[]     = {3, 34, 241, 135}; // 0xF187
static const uint8_t kUdsReadSupplier[]       = {3, 34, 241, 138}; // 0xF18A
static const uint8_t kUdsReadMileage[]        = {3, 34, 242, 1};   // 0xF201
static const uint8_t kUdsReadImei[]           = {3, 34, 7, 0};     // 0x0700
static const uint8_t kUdsReadCardCount[]      = {3, 34, 6, 3};     // 0x0603
static const uint8_t kUdsReadFaultCode[]      = {3, 25, 2, 9};     // 19 02 09
static const uint8_t kUdsNodeOnlineCheckEnd[] = {4, 49, 2, 81, 0}; // 31 02 51 00

static const uint16_t kDidVin        = 0xF190;
static const uint16_t kDidSwVersion  = 0xF195;
static const uint16_t kDidPartNumber = 0xF187;
static const uint16_t kDidSupplier   = 0xF18A;
static const uint16_t kDidMileage    = 0xF201;
static const uint16_t kDidCardCount  = 0x0603;
static const uint16_t kDidImei       = 0x0700;

// 串行步骤块（车辆信息逐 DID 读取）
typedef void (^ZHStep)(void (^done)(void));

#pragma mark - 字节工具

static void zhAppend16BE(NSMutableData *d, uint16_t v) {
    uint8_t b[2] = { (uint8_t)(v >> 8), (uint8_t)(v & 0xFF) };
    [d appendBytes:b length:2];
}
static void zhAppend32BE(NSMutableData *d, uint32_t v) {
    uint8_t b[4] = { (uint8_t)(v >> 24), (uint8_t)(v >> 16), (uint8_t)(v >> 8), (uint8_t)v };
    [d appendBytes:b length:4];
}
static uint32_t zhRead32BE(const uint8_t *b, NSUInteger len, NSUInteger off) {
    if (off + 4 > len) return 0;
    return ((uint32_t)b[off] << 24) | ((uint32_t)b[off + 1] << 16) | ((uint32_t)b[off + 2] << 8) | b[off + 3];
}
static NSString *zhHex(NSData *data) {
    const uint8_t *b = data.bytes;
    NSMutableString *s = [NSMutableString stringWithCapacity:data.length * 2];
    for (NSUInteger i = 0; i < data.length; i++) [s appendFormat:@"%02X", b[i]];
    return s;
}
static NSData *zhUdsData(const uint8_t *bytes, NSUInteger len) {
    return [NSData dataWithBytes:bytes length:len];
}
// nw_error_t（C 不透明类型）→ 可读错误描述
static NSString *zhNWErrorDescription(nw_error_t error) {
    if (!error) return @"";
    CFErrorRef cf = nw_error_copy_cf_error(error);
    if (!cf) {
        return [NSString stringWithFormat:@"code=%d domain=%d",
                nw_error_get_error_code(error), (int)nw_error_get_error_domain(error)];
    }
    NSString *desc = (__bridge_transfer NSString *)CFErrorCopyDescription(cf);
    CFRelease(cf);
    return desc ?: @"";
}

// DoIP PDU 构造
static NSData *zhDoipPdu(uint16_t payloadType, NSData *payload) {
    NSMutableData *d = [NSMutableData data];
    uint8_t ver = kDoipVersion, inv = (uint8_t)(~kDoipVersion & 0xFF);
    [d appendBytes:&ver length:1];
    [d appendBytes:&inv length:1];
    zhAppend16BE(d, payloadType);
    zhAppend32BE(d, (uint32_t)payload.length);
    [d appendData:payload];
    return d;
}
static NSData *zhRouteActivationPdu(void) {
    NSMutableData *p = [NSMutableData data]; // 12 字节，与 buildRouteActivationReqPdu 一致
    zhAppend16BE(p, kDoipSourceAddress);
    zhAppend16BE(p, kDoipTargetVCDM);
    uint8_t routeType = 1, priority = 0;
    [p appendBytes:&routeType length:1];
    [p appendBytes:&priority length:1];
    uint8_t reserved[4] = {0};
    [p appendBytes:reserved length:4];
    zhAppend16BE(p, 30); // routeTimeout
    return zhDoipPdu(kPayloadRouteActiveReq, p);
}
static NSData *zhAliveCheckPdu(void) {
    NSMutableData *p = [NSMutableData data];
    zhAppend16BE(p, kDoipSourceAddress);
    zhAppend16BE(p, kDoipTargetVCDM);
    uint8_t routeType = 1, priority = 0;
    [p appendBytes:&routeType length:1];
    [p appendBytes:&priority length:1];
    uint8_t reserved[4] = {0};
    [p appendBytes:reserved length:4];
    zhAppend16BE(p, 30);
    return zhDoipPdu(kPayloadAliveCheckReq, p);
}
static NSData *zhDiagnosticPdu(NSData *uds) {
    NSMutableData *p = [NSMutableData data];
    zhAppend16BE(p, kDoipSourceAddress);
    zhAppend16BE(p, kDoipTargetVCDM);
    [p appendData:uds];
    return zhDoipPdu(kPayloadDiagnosticMessage, p);
}

#pragma mark - UDS 响应解析（移植 parseReadDid* 系列）

// 在 udsData 中定位 62 <didHi> <didLo>，返回偏移，未找到 -1
static NSInteger zhFindDidOffset(NSData *uds, uint16_t did) {
    if (uds.length < 3) return -1;
    const uint8_t *b = uds.bytes;
    uint8_t hi = (did >> 8) & 0xFF, lo = did & 0xFF;
    for (NSUInteger i = 0; i + 3 <= uds.length; i++) {
        if (b[i] == 0x62 && b[i + 1] == hi && b[i + 2] == lo) return (NSInteger)i;
    }
    return -1;
}
static NSString *zhParseDidAscii(NSData *uds, uint16_t did) {
    NSInteger off = zhFindDidOffset(uds, did);
    if (off < 0) return @"";
    NSUInteger start = (NSUInteger)off + 3;
    if (uds.length <= start) return @"";
    NSData *sub = [uds subdataWithRange:NSMakeRange(start, uds.length - start)];
    return [[NSString alloc] initWithData:sub encoding:NSISOLatin1StringEncoding] ?: @"";
}
static long long zhParseDidUnsigned(NSData *uds, uint16_t did) {
    NSInteger off = zhFindDidOffset(uds, did);
    if (off < 0) return -1;
    NSUInteger start = (NSUInteger)off + 3;
    if (uds.length <= start) return -1;
    const uint8_t *b = uds.bytes;
    long long value = 0;
    for (NSUInteger i = start; i < uds.length; i++) value = (value << 8) | b[i];
    return value;
}

#pragma mark - ZHDiagService

@interface ZHDiagService () <CBCentralManagerDelegate>
// 网络
@property (nonatomic, strong) nw_connection_t conn;
@property (nonatomic, strong) dispatch_queue_t netQueue;
@property (nonatomic, strong) NSMutableData *rxBuffer;
@property (nonatomic, assign) BOOL connected;
@property (nonatomic, strong) dispatch_source_t heartbeatTimer;
// 当前等待的诊断响应（单消息模式，与 diagClient.js pendingDiag 一致）
@property (nonatomic, strong) NSRegularExpression *pendingPattern;
@property (nonatomic, copy) void (^pendingResolve)(NSData *pdu);
// BLE
@property (nonatomic, strong) CBCentralManager *central;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSDictionary *> *bleDevices;
@property (nonatomic, copy) void (^bleFinish)(NSArray *devices);
@end

@implementation ZHDiagService

+ (instancetype)shared {
    static ZHDiagService *inst;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ inst = [[ZHDiagService alloc] init]; });
    return inst;
}

- (instancetype)init {
    if ((self = [super init])) {
        _netQueue = dispatch_queue_create("zeeho.diag.net", DISPATCH_QUEUE_SERIAL);
        _rxBuffer = [NSMutableData data];
    }
    return self;
}

- (void)emitEvent:(NSString *)type message:(NSString *)message {
    ZHDiagEventHandler handler = self.eventHandler;
    if (handler) handler(type, message);
}
- (void)log:(NSString *)fmt, ... {
    va_list args;
    va_start(args, fmt);
    NSString *msg = [[NSString alloc] initWithFormat:fmt arguments:args];
    va_end(args);
    NSLog(@"[diag] %@", msg);
    [self emitEvent:@"log" message:msg];
}

#pragma mark - JS 桥入口

- (void)handleOp:(NSString *)op
            args:(NSDictionary *)args
           reply:(void (^)(id _Nullable, NSString *_Nullable))reply {
    args = [args isKindOfClass:[NSDictionary class]] ? args : @{};
    if ([op isEqualToString:@"bleScan"]) {
        double duration = [args[@"durationMs"] isKindOfClass:[NSNumber class]] ? [args[@"durationMs"] doubleValue] : 12000;
        [self bleScanWithDuration:duration reply:reply];
    } else if ([op isEqualToString:@"wifiCredentials"]) {
        NSDictionary *cred = nil;
        if ([args[@"deviceName"] isKindOfClass:[NSString class]]) {
            cred = [self credentialsFromDeviceName:args[@"deviceName"]];
        } else if ([args[@"vin"] isKindOfClass:[NSString class]]) {
            cred = [self credentialsFromVin:args[@"vin"]];
        }
        if (cred) reply(cred, nil);
        else reply(nil, @"无法推导 WiFi 凭证（蓝牙名后缀或 VIN 不足 8 位）");
    } else if ([op isEqualToString:@"openWifiSettings"]) {
        NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
        dispatch_async(dispatch_get_main_queue(), ^{
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
        });
        reply(@{ @"ok": @YES, @"message": @"已打开系统设置，请连接推导出的 ZEEHO 热点后返回" }, nil);
    } else if ([op isEqualToString:@"diagConnect"]) {
        [self diagConnectWithReply:reply];
    } else if ([op isEqualToString:@"diagDisconnect"]) {
        [self diagDisconnect];
        reply(@{ @"ok": @YES }, nil);
    } else if ([op isEqualToString:@"readVehicleInfo"]) {
        [self readVehicleInfoWithReply:reply];
    } else if ([op isEqualToString:@"checkOnline"]) {
        [self checkVcdmOnlineWithReply:reply];
    } else if ([op isEqualToString:@"readFaultCodes"]) {
        [self readFaultCodesWithReply:reply];
    } else {
        reply(nil, [@"未知操作: " stringByAppendingString:op ?: @""]);
    }
}

#pragma mark - WiFi 凭证推导（与 wifi.js 一致）

- (NSDictionary *)credentialsFromDeviceName:(NSString *)name {
    NSArray *parts = [NSString stringWithFormat:@"%@", name].componentsSeparatedByString:@"-"];
    if (parts.count < 2) return nil;
    NSString *suffix = parts.lastObject;
    if (suffix.length < 8) return nil;
    return @{
        @"ssid": [@"ZEEHO-" stringByAppendingString:[suffix substringFromIndex:suffix.length - 6]],
        @"password": [suffix substringFromIndex:suffix.length - 8]
    };
}
- (NSDictionary *)credentialsFromVin:(NSString *)vin {
    NSString *v = [NSString stringWithFormat:@"%@", vin].stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    if (v.length < 8) return nil;
    return @{
        @"ssid": [v substringFromIndex:v.length - 6],
        @"password": [v substringFromIndex:v.length - 8]
    };
}

#pragma mark - BLE 扫描（CoreBluetooth）

- (void)bleScanWithDuration:(double)durationMs reply:(void (^)(id, NSString *))reply {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.bleFinish) { reply(nil, @"已有扫描进行中"); return; }
        self.bleDevices = [NSMutableDictionary dictionary];
        __block BOOL finished = NO;
        void (^finish)(void) = ^{
            if (finished) return;
            finished = YES;
            [self stopBleScan];
            NSMutableArray *list = [NSMutableArray array];
            [self.bleDevices enumerateKeysAndObjectsUsingBlock:^(NSString *key, NSDictionary *dev, BOOL *stop) {
                [list addObject:dev];
            }];
            [list sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) {
                return [b[@"rssi"] compare:a[@"rssi"]];
            }];
            self.bleFinish = nil;
            [self log:@"蓝牙扫描结束，发现 %lu 台车辆设备", (unsigned long)list.count];
            reply(list, nil);
        };
        self.bleFinish = ^(NSArray *devices) { finish(); };
        if (!self.central) {
            self.central = [[CBCentralManager alloc] initWithDelegate:self queue:dispatch_get_main_queue()
                                                              options:@{ CBCentralManagerOptionShowPowerAlertKey: @YES }];
        }
        if (self.central.state == CBManagerStatePoweredOn) {
            [self startBleScan];
        } else {
            [self log:@"等待蓝牙状态就绪（当前 %ld）…", (long)self.central.state];
        }
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(MAX(durationMs, 1000) * NSEC_PER_MSEC)),
                       dispatch_get_main_queue(), finish);
    });
}

- (void)startBleScan {
    [self.central scanForPeripheralsWithServices:nil options:nil];
    [self log:@"开始蓝牙扫描（zeehok1-*）…"];
}
- (void)stopBleScan {
    if (self.central.isScanning) [self.central stopScan];
}

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    if (central.state == CBManagerStatePoweredOn && self.bleFinish && !central.isScanning) {
        [self startBleScan];
    } else if (central.state == CBManagerStateUnauthorized && self.bleFinish) {
        [self log:@"蓝牙权限未授予，请到系统设置允许本应用使用蓝牙"];
    }
}

- (void)centralManager:(CBCentralManager *)central
 didDiscoverPeripheral:(CBPeripheral *)peripheral
     advertisementData:(NSDictionary *)advertisementData
                  RSSI:(NSNumber *)RSSI {
    if (!self.bleFinish) return;
    NSString *name = advertisementData[CBAdvertisementDataLocalNameKey];
    if (![name isKindOfClass:[NSString class]] || !name.length) name = peripheral.name;
    if (![name isKindOfClass:[NSString class]]) return;
    static NSRegularExpression *re = nil;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ re = [NSRegularExpression regularExpressionWithPattern:@"^zeehok1-[0-9a-z]{10}$"
                                                                           options:NSRegularExpressionCaseInsensitive error:NULL]; });
    if ([re numberOfMatchesInString:name options:0 range:NSMakeRange(0, name.length)] == 0) return;
    NSInteger rssi = RSSI.integerValue;
    if (rssi <= -95) return; // 与桌面版 MIN_RSSI 一致
    NSString *key = peripheral.identifier.UUIDString ?: name;
    BOOL isNew = self.bleDevices[key] == nil;
    self.bleDevices[key] = @{ @"name": name, @"rssi": @(rssi), @"address": key };
    if (isNew) [self log:@"发现设备 %@ RSSI=%ld", name, (long)rssi];
}

#pragma mark - DoIP 连接（Network.framework）

- (void)diagConnectWithReply:(void (^)(id, NSString *))reply {
    if (self.connected) {
        // 已连接：重新路由激活后直接返回成功
        [self sendPdu:zhRouteActivationPdu()];
        reply(@{ @"ok": @YES, @"message": @"诊断已连接（重新路由激活）" }, nil);
        return;
    }
    [self log:@"TCP 连接 %@:%s …", kDoipHost, kDoipPortC];
    nw_endpoint_t endpoint = nw_endpoint_create_host(kDoipHost.UTF8String, kDoipPortC);
    nw_parameters_t params = nw_parameters_create_secure_tcp(NW_PARAMETERS_DISABLE_PROTOCOL,
                                                             NW_PARAMETERS_DISABLE_PROTOCOL);
    nw_connection_t conn = nw_connection_create(endpoint, params);
    self.conn = conn;
    self.rxBuffer = [NSMutableData data];
    __block BOOL settled = NO;
    nw_connection_set_queue(conn, self.netQueue);
    nw_connection_set_state_changed_handler(conn, ^(nw_connection_state_t state, nw_error_t error) {
        if (state == NW_CONNECTION_STATE_READY) {
            if (!settled) {
                settled = YES;
                self.connected = YES;
                [self log:@"TCP 已连接 %@:%s", kDoipHost, kDoipPortC];
                [self startReceiveLoop];
                [self sendPdu:zhRouteActivationPdu()];
                [self log:@"路由激活请求已发送"];
                [self startHeartbeat];
                reply(@{ @"ok": @YES, @"message": [NSString stringWithFormat:@"已连接车机网关 %@（路由激活+心跳已启动）", kDoipHost] }, nil);
            }
        } else if (state == NW_CONNECTION_STATE_FAILED || state == NW_CONNECTION_STATE_CANCELLED) {
            NSString *msg = error ? zhNWErrorDescription(error) : @"连接失败";
            [self log:@"TCP 连接失败: %@", msg];
            [self handleConnectionClosed];
            if (!settled) {
                settled = YES;
                reply(@{ @"ok": @NO,
                         @"message": [NSString stringWithFormat:@"无法连接 %@:13400。请确认手机已连接车辆 ZEEHO 热点且车辆已开机。(%@)", kDoipHost, msg ?: @""] }, nil);
            }
        }
    });
    nw_connection_start(conn);
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kConnectTimeout * NSEC_PER_SEC)), self.netQueue, ^{
        if (!settled) {
            settled = YES;
            [self log:@"TCP 连接超时"];
            [self diagDisconnect];
            reply(@{ @"ok": @NO, @"message": @"TCP 连接超时（5s）。请确认手机已连接车辆 ZEEHO 热点。" }, nil);
        }
    });
}

- (void)diagDisconnect {
    dispatch_async(self.netQueue, ^{
        [self stopHeartbeat];
        nw_connection_t conn = self.conn;
        if (conn) {
            self.conn = NULL;
            nw_connection_cancel(conn);
        }
        self.connected = NO;
        self.rxBuffer = [NSMutableData data];
        [self resolvePendingWithPdu:nil];
    });
}

- (void)handleConnectionClosed {
    [self stopHeartbeat];
    if (self.conn) {
        nw_connection_t conn = self.conn;
        self.conn = NULL;
        nw_connection_cancel(conn);
    }
    self.connected = NO;
    self.rxBuffer = [NSMutableData data];
    [self resolvePendingWithPdu:nil];
    [self log:@"TCP 连接已关闭"];
}

- (void)startReceiveLoop {
    nw_connection_t conn = self.conn;
    if (!conn) return;
    nw_connection_receive(conn, 1, 65536, ^(dispatch_data_t content, nw_content_context_t context, bool is_complete, nw_error_t error) {
        if (content) {
            NSMutableData *chunk = [NSMutableData data];
            dispatch_data_apply(content, ^bool(dispatch_data_t region, size_t offset, const void *buffer, size_t size) {
                [chunk appendBytes:buffer length:size];
                return true;
            });
            [self appendRx:chunk];
        }
        if (error || is_complete) {
            if (error) [self log:@"TCP 接收错误: %@", zhNWErrorDescription(error)];
            [self handleConnectionClosed];
            return;
        }
        if (self.conn == conn) [self startReceiveLoop];
    });
}

// 从字节流切出完整 DoIP PDU（移植 extractCompleteDoipPdus）
- (void)appendRx:(NSData *)chunk {
    [self.rxBuffer appendData:chunk];
    NSMutableData *rx = self.rxBuffer;
    while (rx.length >= kDoipHeaderLength) {
        const uint8_t *b = rx.bytes;
        uint8_t version = b[0], inverse = b[1];
        BOOL valid = (version == 255) || (((version ^ inverse) == 255) && (version == 1 || version == 2 || version == 3));
        if (!valid) {
            [rx replaceBytesInRange:NSMakeRange(0, 1) withBytes:NULL length:0];
            continue;
        }
        uint32_t payloadLen = zhRead32BE(b, rx.length, 4);
        NSUInteger total = kDoipHeaderLength + payloadLen;
        if (rx.length < total) break;
        NSData *pdu = [rx subdataWithRange:NSMakeRange(0, total)];
        [rx replaceBytesInRange:NSMakeRange(0, total) withBytes:NULL length:0];
        [self dispatchPdu:pdu];
    }
}

// PDU 分发（移植 diagClient._dispatchPdu，按整包 hex 前缀）
- (void)dispatchPdu:(NSData *)pdu {
    NSString *hex = zhHex(pdu);
    [self emitEvent:@"pdu" message:hex];
    if ([hex hasPrefix:@"03FC0006"]) { [self log:@"路由激活响应: %@", hex]; return; }
    if ([hex hasPrefix:@"03FC0008"]) { return; } // alive check 响应
    if ([hex hasPrefix:@"03FC80020000000700010E00003E80"]) { return; } // tester present 响应
    if ([hex hasPrefix:@"03FC8001"] || [hex hasPrefix:@"03FC8003"] || [hex hasPrefix:@"03FC8002"]) {
        NSRegularExpression *pattern = self.pendingPattern;
        void (^resolve)(NSData *) = self.pendingResolve;
        if (resolve && (!pattern || [pattern numberOfMatchesInString:hex options:0 range:NSMakeRange(0, hex.length)] > 0)) {
            [self resolvePendingWithPdu:pdu];
        }
        return;
    }
}

- (void)resolvePendingWithPdu:(NSData *)pdu {
    void (^resolve)(NSData *) = self.pendingResolve;
    self.pendingResolve = nil;
    self.pendingPattern = nil;
    if (resolve) resolve(pdu);
}

- (void)sendPdu:(NSData *)pdu {
    nw_connection_t conn = self.conn;
    if (!conn || !self.connected) return;
    dispatch_data_t data = dispatch_data_create(pdu.bytes, pdu.length, self.netQueue, DISPATCH_DATA_DESTRUCTOR_DEFAULT);
    nw_connection_send(conn, data, NW_CONNECTION_DEFAULT_MESSAGE_CONTEXT, true, ^(nw_error_t error) {
        if (error) [self log:@"TCP 发送失败: %@", zhNWErrorDescription(error)];
    });
}

- (void)startHeartbeat {
    [self stopHeartbeat];
    dispatch_source_t timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, self.netQueue);
    dispatch_source_set_timer(timer,
                              dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kHeartbeatInterval * NSEC_PER_SEC)),
                              (uint64_t)(kHeartbeatInterval * NSEC_PER_SEC),
                              (uint64_t)(0.2 * NSEC_PER_SEC));
    __weak typeof(self) weakSelf = self;
    dispatch_source_set_event_handler(timer, ^{
        __strong typeof(weakSelf) self = weakSelf;
        if (self.connected) [self sendPdu:zhAliveCheckPdu()];
    });
    dispatch_resume(timer);
    self.heartbeatTimer = timer;
}
- (void)stopHeartbeat {
    if (self.heartbeatTimer) {
        dispatch_source_cancel(self.heartbeatTimer);
        self.heartbeatTimer = nil;
    }
}

#pragma mark - 诊断消息收发（移植 diagnosticMessage / WithRetry）

/// 发送一条 UDS 并等待响应，超时返回 nil（在 netQueue 上回调）
- (void)diagnosticMessage:(NSData *)uds
              matchPattern:(NSString *)pattern
                   timeout:(NSTimeInterval)timeout
                     reply:(void (^)(NSData *pdu))reply {
    dispatch_async(self.netQueue, ^{
        if (!self.connected) { reply(nil); return; }
        [self resolvePendingWithPdu:nil]; // 串行：结束上一个 pending
        NSRegularExpression *re = nil;
        if (pattern.length) {
            re = [NSRegularExpression regularExpressionWithPattern:pattern options:NSRegularExpressionCaseInsensitive error:NULL];
        }
        self.pendingPattern = re;
        self.pendingResolve = reply;
        [self log:@"诊断请求: %@", zhHex(zhDiagnosticPdu(uds))];
        [self sendPdu:zhDiagnosticPdu(uds)];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeout * NSEC_PER_SEC)), self.netQueue, ^{
            if (self.pendingResolve == reply) {
                [self log:@"诊断响应超时: %@", zhHex(uds)];
                [self resolvePendingWithPdu:nil];
            }
        });
    });
}

// 解析诊断 PDU 的 UDS 载荷（移植 parseDiagData）
- (NSData *)parseUdsPayload:(NSData *)pdu {
    if (pdu.length <= kDoipHeaderLength) return nil;
    NSData *payload = [pdu subdataWithRange:NSMakeRange(kDoipHeaderLength, pdu.length - kDoipHeaderLength)];
    if (payload.length < 8) return nil;
    return [payload subdataWithRange:NSMakeRange(8, payload.length - 8)];
}

/// 带重试的诊断（移植 diagnosticMessageWithRetry：4 次，重试前重新路由激活+心跳）
- (void)diagnosticMessageWithRetry:(NSData *)uds
                       matchPattern:(NSString *)pattern
                            attempt:(NSInteger)attempt
                              reply:(void (^)(NSData *udsData))reply {
    if (attempt >= kDiagRetries) { reply(nil); return; }
    __weak typeof(self) weakSelf = self;
    void (^send)(void) = ^{
        __strong typeof(weakSelf) self = weakSelf;
        [self diagnosticMessage:uds matchPattern:pattern timeout:kDiagResponseTimeout reply:^(NSData *pdu) {
            __strong typeof(weakSelf) self = weakSelf;
            if (!pdu) {
                [self diagnosticMessageWithRetry:uds matchPattern:pattern attempt:attempt + 1 reply:reply];
                return;
            }
            NSData *udsData = [self parseUdsPayload:pdu];
            if (!udsData.length) {
                [self diagnosticMessageWithRetry:uds matchPattern:pattern attempt:attempt + 1 reply:reply];
                return;
            }
            reply(udsData);
        }];
    };
    if (attempt == 0) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.05 * NSEC_PER_SEC)), self.netQueue, send);
    } else {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), self.netQueue, ^{
            __strong typeof(weakSelf) self = weakSelf;
            if (self.connected) {
                [self sendPdu:zhRouteActivationPdu()];
                [self startHeartbeat];
            }
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.05 * NSEC_PER_SEC)), self.netQueue, send);
        });
    }
}

/// 确保已连接并完成路由激活（未连接时先连接）
- (void)ensureConnected:(void (^)(BOOL ok, NSString *error))done {
    if (self.connected) { done(YES, nil); return; }
    [self diagConnectWithReply:^(id result, NSString *error) {
        BOOL ok = [result[@"ok"] boolValue];
        done(ok, ok ? nil : (result[@"message"] ?: error ?: @"连接失败"));
    }];
}

#pragma mark - 读取车辆信息（移植 readVehicleInfo）

- (void)readVehicleInfoWithReply:(void (^)(id, NSString *))reply {
    [self ensureConnected:^(BOOL ok, NSString *error) {
        if (!ok) { reply(@{ @"ok": @NO, @"message": error ?: @"诊断未连接" }, nil); return; }
        NSMutableDictionary *info = [NSMutableDictionary dictionary];
        info[@"vin"] = @""; info[@"softwareVersion"] = @""; info[@"partNumber"] = @"";
        info[@"supplierName"] = @""; info[@"imei"] = @"";
        info[@"totalMileage"] = [NSNull null]; info[@"cardCount"] = [NSNull null];

        NSArray<ZHStep> *steps = @[
            [self stepReadUds:zhUdsData(kUdsReadVin, sizeof(kUdsReadVin)) did:kDidVin into:info key:@"vin" parse:^id(NSData *uds) {
                NSString *vin = zhParseDidAscii(uds, kDidVin);
                return vin.length == 17 ? vin : @"";
            }],
            [self stepReadUds:zhUdsData(kUdsReadSwVersion, sizeof(kUdsReadSwVersion)) did:kDidSwVersion into:info key:@"softwareVersion" parse:^id(NSData *uds) {
                return zhParseDidAscii(uds, kDidSwVersion);
            }],
            [self stepReadUds:zhUdsData(kUdsReadPartNumber, sizeof(kUdsReadPartNumber)) did:kDidPartNumber into:info key:@"partNumber" parse:^id(NSData *uds) {
                return [zhParseDidAscii(uds, kDidPartNumber) stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
            }],
            [self stepReadUds:zhUdsData(kUdsReadSupplier, sizeof(kUdsReadSupplier)) did:kDidSupplier into:info key:@"supplierName" parse:^id(NSData *uds) {
                return zhParseDidAscii(uds, kDidSupplier);
            }],
            [self stepReadUds:zhUdsData(kUdsReadMileage, sizeof(kUdsReadMileage)) did:kDidMileage into:info key:@"totalMileage" parse:^id(NSData *uds) {
                long long raw = zhParseDidUnsigned(uds, kDidMileage);
                if (raw < 0) return (id)[NSNull null];
                return @((double)raw * 0.1);
            }],
            [self stepReadUds:zhUdsData(kUdsReadImei, sizeof(kUdsReadImei)) did:kDidImei into:info key:@"imei" parse:^id(NSData *uds) {
                return zhParseDidAscii(uds, kDidImei);
            }],
            [self stepReadUds:zhUdsData(kUdsReadCardCount, sizeof(kUdsReadCardCount)) did:kDidCardCount into:info key:@"cardCount" parse:^id(NSData *uds) {
                NSInteger off = zhFindDidOffset(uds, kDidCardCount);
                if (off < 0) return (id)[NSNull null];
                NSUInteger start = (NSUInteger)off + 3;
                if (uds.length <= start) return (id)[NSNull null];
                uint8_t count = ((const uint8_t *)uds.bytes)[start];
                return count <= 2 ? @(count) : (id)[NSNull null];
            }],
        ];
        [self runSequential:steps completion:^{
            [self log:@"车辆信息读取完成"];
            reply(@{ @"ok": @YES, @"info": info }, nil);
        }];
    }];
}

- (ZHStep)stepReadUds:(NSData *)uds
                  did:(uint16_t)did
                 into:(NSMutableDictionary *)info
                  key:(NSString *)key
                parse:(id (^)(NSData *uds))parse {
    __weak typeof(self) weakSelf = self;
    return [^void(void (^done)(void)) {
        __strong typeof(weakSelf) self = weakSelf;
        [self diagnosticMessageWithRetry:uds matchPattern:nil attempt:0 reply:^(NSData *udsData) {
            __strong typeof(weakSelf) self = weakSelf;
            if (udsData) {
                id value = parse(udsData);
                if (value) info[key] = value;
                [self log:@"%@: %@", key, [value isKindOfClass:[NSString class]] && [value length] ? value : @"(已读取)"];
            } else {
                [self log:@"读取 %@ 失败（超时/无响应）", key];
            }
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)), self.netQueue, done);
        }];
    } copy];
}

- (void)runSequential:(NSArray<ZHStep> *)steps completion:(void (^)(void))completion {
    __block NSUInteger i = 0;
    __block void (^next)(void);
    next = ^{
        if (i >= steps.count) { completion(); return; }
        void (^step)(void (^)(void)) = steps[i++];
        step(next);
    };
    next();
}

#pragma mark - VCDM 在线检测（移植 checkVcdmNodeOnline）

- (void)checkVcdmOnlineWithReply:(void (^)(id, NSString *))reply {
    [self ensureConnected:^(BOOL ok, NSString *error) {
        if (!ok) { reply(@{ @"online": @NO, @"message": error ?: @"诊断未连接" }, nil); return; }
        __weak typeof(self) weakSelf = self;
        [self diagnosticMessage:zhUdsData(kUdsNodeOnlineCheckEnd, sizeof(kUdsNodeOnlineCheckEnd))
                    matchPattern:@"710251" timeout:kDiagResponseTimeout reply:^(NSData *pdu) {
            __strong typeof(weakSelf) self = weakSelf;
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)), self.netQueue, ^{
                __strong typeof(weakSelf) self = weakSelf;
                [self diagnosticMessage:zhUdsData(kUdsReadFaultCode, sizeof(kUdsReadFaultCode))
                            matchPattern:@"[0-9a-fA-F]{26,28}590209|00010E00007F0111"
                                 timeout:kDiagResponseTimeout reply:^(NSData *pdu2) {
                    __strong typeof(weakSelf) self = weakSelf;
                    BOOL online = NO;
                    if (pdu2) {
                        NSData *udsData = [self parseUdsPayload:pdu2];
                        online = udsData && [zhHex(udsData) containsString:@"590209"];
                    }
                    [self log:@"VCDM 节点: %@", online ? @"在线" : @"离线/无响应"];
                    reply(@{ @"online": @(online) }, nil);
                }];
            });
        }];
    }];
}

#pragma mark - 故障码（移植 readFaultCodes）

- (void)readFaultCodesWithReply:(void (^)(id, NSString *))reply {
    [self ensureConnected:^(BOOL ok, NSString *error) {
        if (!ok) { reply(@{ @"ok": @NO, @"message": error ?: @"诊断未连接" }, nil); return; }
        __weak typeof(self) weakSelf = self;
        [self diagnosticMessageWithRetry:zhUdsData(kUdsReadFaultCode, sizeof(kUdsReadFaultCode))
                             matchPattern:nil attempt:0 reply:^(NSData *udsData) {
            __strong typeof(weakSelf) self = weakSelf;
            if (!udsData.length) {
                reply(@{ @"ok": @NO, @"message": @"读故障码失败（超时/无响应）" }, nil);
                return;
            }
            NSString *hex = zhHex(udsData);
            [self log:@"故障码响应: %@", hex];
            reply(@{ @"ok": @YES, @"hex": hex }, nil);
        }];
    }];
}

@end
