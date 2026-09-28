// ZHDispatcher.m — JavaScriptCore 引擎
// 每次请求创建独立 JSContext，注入 $loon/$request/$done/$persistentStore/$httpClient/
// 定时器/atob 等 shim，原封不动运行 zeeho_box_enhanced.js（Loon 分支）。
// 语义与桌面版 desktop/engine.js 保持一致：
//   - 持久化：Documents/store.json，结构 {"kv": {...}}
//   - HTTP：NSURLSession（原生发出，天然绕过 CORS）
//   - $done({response:{status,headers,body}}) → 响应回 WKURLSchemeTask
//   - 180s 兜底超时
#import "ZHDispatcher.h"
#import <JavaScriptCore/JavaScriptCore.h>
#import <UserNotifications/UserNotifications.h>

static const NSTimeInterval kDispatchGuardTimeout = 180.0;

@interface ZHDispatcher ()
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSString *> *kv;
@property (nonatomic, copy) NSString *storePath;
@property (nonatomic, copy) NSString *scriptSource;
@property (nonatomic, copy) NSString *shimSource;
@property (nonatomic, strong) NSURLSession *session;
@end

@implementation ZHDispatcher

- (instancetype)init {
    if ((self = [super init])) {
        NSString *docs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
        _storePath = [docs stringByAppendingPathComponent:@"store.json"];
        _kv = [self loadStore];
        _scriptSource = [self loadBundleText:@"zeeho_box_enhanced" ofType:@"js"];
        _shimSource = [self loadBundleText:@"shim" ofType:@"js"];
        NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
        config.timeoutIntervalForRequest = 60;
        config.timeoutIntervalForResource = 180;
        _session = [NSURLSession sessionWithConfiguration:config];
    }
    return self;
}

#pragma mark - 持久化（与桌面版 store.json 同结构）

- (NSMutableDictionary<NSString *, NSString *> *)loadStore {
    NSData *data = [NSData dataWithContentsOfFile:self.storePath];
    if (data) {
        id obj = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
        id kv = [obj isKindOfClass:[NSDictionary class]] ? obj[@"kv"] : nil;
        if ([kv isKindOfClass:[NSDictionary class]]) {
            NSMutableDictionary *out = [NSMutableDictionary dictionary];
            [kv enumerateKeysAndObjectsUsingBlock:^(id key, id value, BOOL *stop) {
                if ([key isKindOfClass:[NSString class]]) out[key] = [NSString stringWithFormat:@"%@", value];
            }];
            return out;
        }
    }
    return [NSMutableDictionary dictionary];
}

- (void)saveStore {
    NSData *data = [NSJSONSerialization dataWithJSONObject:@{ @"kv": self.kv }
                                                  options:NSJSONWritingPrettyPrinted
                                                    error:NULL];
    if (data) [data writeToFile:self.storePath atomically:YES];
}

- (NSString *)loadBundleText:(NSString *)name ofType:(NSString *)ext {
    NSString *path = [[NSBundle mainBundle] pathForResource:name ofType:ext];
    if (!path) return nil;
    return [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:NULL];
}

#pragma mark - 分发

- (void)dispatchURL:(NSString *)url
             method:(NSString *)method
            headers:(NSDictionary *)headers
               body:(NSString *)body
         completion:(ZHDispatchCompletion)completion {
    if (!self.scriptSource.length) {
        completion(500, @{ @"Content-Type": @"text/plain; charset=utf-8" }, @"未找到核心脚本");
        return;
    }

    JSContext *ctx = [[JSContext alloc] init];
    __block BOOL finished = NO;
    void (^finish)(NSInteger, NSDictionary *, NSString *) = ^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {
        if (finished) return;
        finished = YES;
        dispatch_async(dispatch_get_main_queue(), ^{
            completion(status, respHeaders ?: @{}, respBody ?: @"");
        });
    };

    ctx.exceptionHandler = ^(JSContext *context, JSValue *exception) {
        NSString *msg = [exception toString] ?: @"未知JS异常";
        NSLog(@"[ZH] JS 异常: %@", msg);
        finish(500, @{ @"Content-Type": @"text/plain; charset=utf-8" }, [@"脚本执行异常: " stringByAppendingString:msg]);
    };

    NSMutableDictionary *timers = [NSMutableDictionary dictionary];
    __block NSInteger nextTimerId = 1;

    // ---- console ----
    ctx[@"__log"] = ^(NSString *message) {
        NSLog(@"[panel] %@", message);
    };

    // ---- $done 后端 ----
    ctx[@"__finish"] = ^(NSInteger status, NSString *headersJson, NSString *respBody) {
        NSDictionary *respHeaders = @{};
        NSData *data = [headersJson dataUsingEncoding:NSUTF8StringEncoding];
        if (data) {
            id obj = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
            if ([obj isKindOfClass:[NSDictionary class]]) respHeaders = obj;
        }
        finish(status, respHeaders, respBody);
    };

    // ---- $persistentStore 后端 ----
    ctx[@"__storeRead"] = ^id(NSString *key) {
        NSString *value = self.kv[key];
        return value ? (id)value : (id)[NSNull null];
    };
    ctx[@"__storeWrite"] = ^(NSString *value, NSString *key) {
        self.kv[key] = value;
        [self saveStore];
    };

    // ---- $httpClient 后端（NSURLSession） ----
    ctx[@"__http"] = ^(NSString *httpMethod, NSString *optsJson, JSValue *callback) {
        NSDictionary *opts = @{};
        NSData *data = [optsJson dataUsingEncoding:NSUTF8StringEncoding];
        if (data) {
            id obj = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
            if ([obj isKindOfClass:[NSDictionary class]]) opts = obj;
        }
        NSString *urlString = [opts[@"url"] isKindOfClass:[NSString class]] ? opts[@"url"] : nil;
        NSURL *target = urlString.length ? [NSURL URLWithString:urlString] : nil;
        if (!target) {
            [callback callWithArguments:@[ @"无效的请求URL", @0, @"{}", @"" ]];
            return;
        }
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:target];
        request.HTTPMethod = httpMethod.length ? httpMethod : @"GET";
        NSDictionary *reqHeaders = [opts[@"headers"] isKindOfClass:[NSDictionary class]] ? opts[@"headers"] : nil;
        [reqHeaders enumerateKeysAndObjectsUsingBlock:^(id key, id value, BOOL *stop) {
            if ([key isKindOfClass:[NSString class]]) {
                [request setValue:[NSString stringWithFormat:@"%@", value] forHTTPHeaderField:key];
            }
        }];
        id bodyValue = opts[@"body"];
        if (bodyValue && ![request.HTTPMethod isEqualToString:@"GET"] && ![request.HTTPMethod isEqualToString:@"HEAD"]) {
            NSString *bodyString = [bodyValue isKindOfClass:[NSString class]] ? bodyValue : [NSString stringWithFormat:@"%@", bodyValue];
            request.HTTPBody = [bodyString dataUsingEncoding:NSUTF8StringEncoding];
        }
        if ([opts[@"timeout"] isKindOfClass:[NSNumber class]] && [opts[@"timeout"] doubleValue] > 0) {
            request.timeoutInterval = [opts[@"timeout"] doubleValue];
        }
        NSURLSessionDataTask *task = [self.session dataTaskWithRequest:request
                                                     completionHandler:^(NSData *respData, NSURLResponse *response, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (error) {
                    [callback callWithArguments:@[ error.localizedDescription ?: @"网络请求失败", @0, @"{}", @"" ]];
                    return;
                }
                NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
                NSString *respBody = @"";
                if (respData) {
                    NSString *text = [[NSString alloc] initWithData:respData encoding:NSUTF8StringEncoding];
                    respBody = text ?: @"";
                }
                NSString *respHeadersJson = @"{}";
                NSDictionary *allHeaders = [httpResponse isKindOfClass:[NSHTTPURLResponse class]] ? httpResponse.allHeaderFields : @{};
                NSData *headerData = [NSJSONSerialization dataWithJSONObject:allHeaders options:0 error:NULL];
                if (headerData) {
                    respHeadersJson = [[NSString alloc] initWithData:headerData encoding:NSUTF8StringEncoding] ?: @"{}";
                }
                [callback callWithArguments:@[ [NSNull null], @(httpResponse.statusCode), respHeadersJson, respBody ]];
            });
        }];
        [task resume];
    };

    // ---- 定时器 ----
    ctx[@"__setTimeout"] = ^id(JSValue *fn, double delayMs) {
        NSInteger timerId = nextTimerId++;
        NSNumber *key = @(timerId);
        dispatch_block_t block = dispatch_block_create(0, ^{
            [timers removeObjectForKey:key];
            if (fn && ![fn isUndefined]) [fn callWithArguments:@[]];
        });
        timers[key] = block;
        int64_t delay = (int64_t)(MAX(delayMs, 0.0) * NSEC_PER_MSEC);
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, delay), dispatch_get_main_queue(), block);
        return @(timerId);
    };

    ctx[@"__setInterval"] = ^id(JSValue *fn, double delayMs) {
        NSInteger timerId = nextTimerId++;
        NSNumber *key = @(timerId);
        int64_t delay = (int64_t)(MAX(delayMs, 1.0) * NSEC_PER_MSEC);
        __block void (^scheduleNext)(void);
        scheduleNext = ^{
            dispatch_block_t block = dispatch_block_create(0, ^{
                if (fn && ![fn isUndefined]) [fn callWithArguments:@[]];
                if (timers[key]) scheduleNext();
            });
            timers[key] = block;
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, delay), dispatch_get_main_queue(), block);
        };
        scheduleNext();
        return @(timerId);
    };

    ctx[@"__clearTimer"] = ^(double timerId) {
        NSNumber *key = @((NSInteger)timerId);
        dispatch_block_t block = timers[key];
        if (block) {
            dispatch_block_cancel(block);
            [timers removeObjectForKey:key];
        }
    };

    // ---- atob / btoa（二进制字符串语义，逐字节对应） ----
    ctx[@"__atob"] = ^NSString *(NSString *base64) {
        NSData *data = [[NSData alloc] initWithBase64EncodedString:base64
                                                           options:NSDataBase64DecodingIgnoreUnknownCharacters];
        if (!data) return @"";
        return [[NSString alloc] initWithData:data encoding:NSISOLatin1StringEncoding] ?: @"";
    };
    ctx[@"__btoa"] = ^NSString *(NSString *binary) {
        NSData *data = [binary dataUsingEncoding:NSISOLatin1StringEncoding allowLossyConversion:YES];
        return [data base64EncodedStringWithOptions:0] ?: @"";
    };

    // ---- v2.14.9 本地通知（UNUserNotificationCenter） ----
    // 脚本侧 notifyPush() 调 $notification.post(title, subtitle, body) → shim 转发到此
    ctx[@"__notify"] = ^(NSString *title, NSString *subtitle, NSString *body) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        void (^schedule)(void) = ^{
            UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
            content.title = title.length ? title : @"极核签到面板";
            if (subtitle.length) content.subtitle = subtitle;
            content.body = body.length ? body : @"";
            content.sound = [UNNotificationSound defaultSound];
            NSString *identifier = [NSString stringWithFormat:@"zeeho.%f", [[NSDate date] timeIntervalSince1970]];
            UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier
                                                                                  content:content
                                                                                  trigger:nil];
            [center addNotificationRequest:request withCompletionHandler:^(NSError *err) {
                if (err) NSLog(@"[ZH] 本地通知失败: %@", err.localizedDescription);
            }];
        };
        [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
            if (settings.authorizationStatus == UNAuthorizationStatusAuthorized ||
                settings.authorizationStatus == UNAuthorizationStatusProvisional) {
                schedule();
            } else {
                [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                                      completionHandler:^(BOOL granted, NSError *err) {
                    if (granted) schedule();
                    else NSLog(@"[ZH] 通知权限未授予");
                }];
            }
        }];
    };

    // ---- 安装信息（读取 embedded.mobileprovision，判断当前安装包的签名方式） ----
    ctx[@"__installInfo"] = ^NSDictionary *{
        NSMutableDictionary *info = [NSMutableDictionary dictionary];
        NSString *provPath = [[NSBundle mainBundle] pathForResource:@"embedded" ofType:@"mobileprovision"];
        if (!provPath.length) {
            // 无描述文件：TrollStore / 免签
            info[@"signMethod"] = @"trollstore";
            info[@"hasProvision"] = @NO;
            return info;
        }
        NSString *raw = [NSString stringWithContentsOfFile:provPath encoding:NSUTF8StringEncoding error:NULL];
        NSRange start = [raw rangeOfString:@"<?xml"];
        NSRange end = [raw rangeOfString:@"</plist>"];
        if (!raw.length || start.location == NSNotFound || end.location == NSNotFound) {
            info[@"signMethod"] = @"unknown";
            info[@"hasProvision"] = @YES;
            return info;
        }
        NSRange plistRange = NSMakeRange(start.location, end.location + end.length - start.location);
        NSString *plistStr = [raw substringWithRange:plistRange];
        NSData *plistData = [plistStr dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *plist = [NSPropertyListSerialization propertyListWithData:plistData options:NSPropertyListImmutable format:NULL error:NULL];
        if (![plist isKindOfClass:[NSDictionary class]]) {
            info[@"signMethod"] = @"unknown";
            info[@"hasProvision"] = @YES;
            return info;
        }
        info[@"hasProvision"] = @YES;
        // 团队标识（TeamIdentifier 为数组）
        NSArray *teamArr = plist[@"TeamIdentifier"];
        if ([teamArr isKindOfClass:[NSArray class]] && teamArr.count && [teamArr[0] isKindOfClass:[NSString class]]) {
            info[@"teamId"] = teamArr[0];
        }
        if ([plist[@"TeamName"] isKindOfClass:[NSString class]]) info[@"teamName"] = plist[@"TeamName"];
        // 过期时间（ISO，UTC）
        NSDate *exp = plist[@"ExpirationDate"];
        if ([exp isKindOfClass:[NSDate class]]) {
            NSDateFormatter *df = [[NSDateFormatter alloc] init];
            df.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
            df.timeZone = [NSTimeZone timeZoneWithName:@"UTC"];
            df.dateFormat = @"yyyy-MM-dd'T'HH:mm:ss'Z'";
            info[@"expiration"] = [df stringFromDate:exp];
            info[@"expirationUnix"] = @((long long)[exp timeIntervalSince1970]);
            info[@"daysRemain"] = @((NSInteger)([exp timeIntervalSinceNow] / 86400.0));
        }
        // 是否企业分发（ProvisionsAllDevices=true）
        id allDev = plist[@"ProvisionsAllDevices"];
        BOOL provAll = [allDev isKindOfClass:[NSNumber class]] && [allDev boolValue];
        info[@"provisionsAllDevices"] = @(provAll);
        // 设备数（ProvisionedDevices）
        NSArray *devs = plist[@"ProvisionedDevices"];
        if ([devs isKindOfClass:[NSArray class]]) info[@"deviceCount"] = @(devs.count);
        // 判定签名方式
        if (provAll) {
            info[@"signMethod"] = @"enterprise";
        } else {
            NSTimeInterval remain = [exp isKindOfClass:[NSDate class]] ? [exp timeIntervalSinceNow] : 0;
            info[@"signMethod"] = (remain <= 86400.0 * 15) ? @"sideload" : @"developer";
        }
        return info;
    };

    // ---- 注入 $request，运行 shim + 核心脚本 ----
    NSMutableDictionary *request = [NSMutableDictionary dictionary];
    request[@"url"] = url ?: @"";
    request[@"method"] = method.length ? method : @"GET";
    request[@"headers"] = headers ?: @{};
    if (body) request[@"body"] = body;
    ctx[@"$request"] = request;

    [ctx evaluateScript:self.shimSource];
    [ctx evaluateScript:self.scriptSource];

    // 兜底超时（与桌面版一致）
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kDispatchGuardTimeout * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        finish(500, @{ @"Content-Type": @"text/plain; charset=utf-8" }, @"脚本执行超时(180s)");
    });
}

@end
