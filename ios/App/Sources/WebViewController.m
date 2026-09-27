// WebViewController.m — 面板容器
// WKWebView 加载 zeeho://panel/，所有请求经 WKURLSchemeHandler 交给
// ZHDispatcher（JavaScriptCore 引擎）运行核心脚本，1:1 复刻桌面版架构。
#import "WebViewController.h"
#import "ZHDispatcher.h"
#import "ZHDiagService.h"
#import <WebKit/WebKit.h>
#import <AVFoundation/AVFoundation.h>
#import <UserNotifications/UserNotifications.h>

static NSString * const kPanelScheme = @"zeeho";
// POST 请求体桥接头：WKWebView 对自定义 scheme 的 fetch/XHR POST 会剥离请求体
// （WebKit bug 179077 / radar 35087855，HTTPBody 与 HTTPBodyStream 均为 nil），
// 导致面板 /api/* 的 POST（签到/车控扩展/保存配置等）全部收到空 body。
// 前端 fetch 垫片（kFetchBodyShim）把 body 百分号编码后复制进该请求头，
// 原生端 readRequestBody 优先取真实 body，取不到时从该头兜底还原。
static NSString * const kBodyBridgeHeader = @"X-Zeeho-Body";

// 注入到每个 text/html 响应最前面：劫持 window.fetch，
// 把字符串请求体镜像进 X-Zeeho-Body 头（不影响原请求语义）
static NSString * const kFetchBodyShim =
@"<script>(function(){if(window.__zhBodyBridge)return;window.__zhBodyBridge=1;"
"var OF=window.fetch;if(typeof OF!=='function')return;"
"window.fetch=function(input,init){"
"try{if(init&&typeof init.body==='string'&&init.body.length){"
"var enc=encodeURIComponent(init.body);var h=init.headers;"
"if(h&&typeof h.set==='function'){h.set('X-Zeeho-Body',enc)}"
"else if(Array.isArray(h)){h.push(['X-Zeeho-Body',enc])}"
"else{var n={};if(h){for(var k in h){n[k]=h[k]}}n['X-Zeeho-Body']=enc;init.headers=n}"
"}}catch(e){}"
"return OF.apply(this,arguments)};})();</script>";

// 注入到每个 text/html 响应：面板页右下角悬浮「诊断」入口（诊断页自身不注入）
static NSString * const kDiagEntryShim =
@"<script>(function(){if(window.__zhDiagEntry)return;window.__zhDiagEntry=1;"
"if(location.pathname.indexOf('/diag')===0)return;"
"function mount(){var b=document.createElement('div');"
"b.textContent='诊断';"
"b.style.cssText='position:fixed;right:14px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:99999;"
"background:#2f9de0;color:#fff;border-radius:999px;padding:9px 15px;font-size:13px;"
"box-shadow:0 2px 12px rgba(0,0,0,.45);opacity:.92;cursor:pointer;';"
"b.addEventListener('click',function(){location.href='/diag'});"
"document.body.appendChild(b)}"
"if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);})();</script>";

// JS 字符串转义（evaluateJavaScript 注入事件用）
static NSString *ZHEscapeJsString(NSString *s) {
    NSMutableString *out = [NSMutableString stringWithCapacity:s.length + 8];
    for (NSUInteger i = 0; i < s.length; i++) {
        unichar c = [s characterAtIndex:i];
        switch (c) {
            case '\\': [out appendString:@"\\\\"]; break;
            case '"':  [out appendString:@"\\\""]; break;
            case '\n': [out appendString:@"\\n"]; break;
            case '\r': [out appendString:@"\\r"]; break;
            case 0x2028: [out appendString:@"\\u2028"]; break;
            case 0x2029: [out appendString:@"\\u2029"]; break;
            default: [out appendFormat:@"%C", c]; break;
        }
    }
    return out;
}

// 后台充电/离线监控轮询间隔（秒）
static const NSTimeInterval kMonitorTickInterval = 180.0;

@interface WebViewController () <WKURLSchemeHandler, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) ZHDispatcher *dispatcher;
@property (nonatomic, strong) NSHashTable<id<WKURLSchemeTask>> *activeTasks;
@property (nonatomic, strong) AVAudioPlayer *silencePlayer;
@property (nonatomic, strong) NSTimer *monitorTimer;
@end

@implementation WebViewController

// 面板页底色（与 LITE 界面 --bg 一致），全面屏上下露出区域不再是白/黑边
static UIColor *ZHPanelBackgroundColor(void) {
    return [UIColor colorWithRed:10/255.0 green:15/255.0 blue:30/255.0 alpha:1.0];
}

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = ZHPanelBackgroundColor();
    self.activeTasks = [NSHashTable hashTableWithOptions:NSPointerFunctionsStrongMemory];
    self.dispatcher = [[ZHDispatcher alloc] init];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    [config setURLSchemeHandler:self forURLScheme:kPanelScheme];
    config.allowsInlineMediaPlayback = YES;
    // 诊断 JS 桥（iOS 14+，带 reply 回调，页面侧用 Promise 调用）
    [config.userContentController addScriptMessageHandler:self
                                              contentWorld:WKContentWorld.pageWorld
                                                      name:@"zhDiag"];

    WKWebView *webView = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
    webView.translatesAutoresizingMaskIntoConstraints = NO;
    webView.navigationDelegate = self;
    webView.UIDelegate = self;
    webView.opaque = NO;
    webView.backgroundColor = ZHPanelBackgroundColor();
    webView.scrollView.backgroundColor = ZHPanelBackgroundColor();
    webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    [self.view addSubview:webView];
    self.webView = webView;

    // 全屏铺满：页面 CSS 已用 env(safe-area-inset-*) 自行适配刘海/Home条，
    // 原生侧不再 inset，避免全面屏上下露出黑白边
    [NSLayoutConstraint activateConstraints:@[
        [webView.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [webView.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [webView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [webView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    ]];

    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"%@://panel/", kPanelScheme]];
    [webView loadRequest:[NSURLRequest requestWithURL:url]];

    // 诊断服务事件（log / pdu）→ 页面 __zhDiagEvent
    __weak typeof(self) weakSelf = self;
    [ZHDiagService shared].eventHandler = ^(NSString *type, NSString *message) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) return;
        NSString *js = [NSString stringWithFormat:@"if(window.__zhDiagEvent)window.__zhDiagEvent(\"%@\",\"%@\")",
                        ZHEscapeJsString(type), ZHEscapeJsString(message)];
        dispatch_async(dispatch_get_main_queue(), ^{
            [strongSelf.webView evaluateJavaScript:js completionHandler:nil];
        });
    };

    [self requestNotificationAuth];
    [self startBackgroundKeepAlive];
    [self startMonitorTimer];
}

#pragma mark - 常驻后台 & 充电监控

// 启动时申请通知权限（充满/离线提醒需要）
- (void)requestNotificationAuth {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                          completionHandler:^(BOOL granted, NSError *error) {}];
}

// 常驻后台：循环播放静音音频使进程不被系统挂起，
// 锁屏/切后台后监控定时器与面板逻辑才能继续工作
- (void)startBackgroundKeepAlive {
    NSError *err = nil;
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryPlayback
             withOptions:AVAudioSessionCategoryOptionMixWithOthers
                   error:&err];
    [session setActive:YES error:&err];
    [self playSilence];
    // 音频会话被打断（来电等）结束后恢复播放
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleAudioInterruption:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:nil];
}

- (void)playSilence {
    NSString *path = [[NSBundle mainBundle] pathForResource:@"silent" ofType:@"wav"];
    if (!path.length) return;
    AVAudioPlayer *player = [[AVAudioPlayer alloc] initWithContentsOfURL:[NSURL fileURLWithPath:path] error:NULL];
    player.numberOfLoops = -1;
    player.volume = 0.0;
    [player prepareToPlay];
    [player play];
    self.silencePlayer = player;
}

- (void)handleAudioInterruption:(NSNotification *)note {
    NSNumber *typeNum = note.userInfo[AVAudioSessionInterruptionTypeKey];
    if (typeNum.unsignedIntegerValue == AVAudioSessionInterruptionTypeEnded) {
        [[AVAudioSession sharedInstance] setActive:YES error:NULL];
        if (!self.silencePlayer.isPlaying) [self.silencePlayer play];
    }
}

// 充电/离线监控定时器：每 3 分钟让脚本引擎跑一轮 checkVehicleMonitor，
// 配置未开启时脚本内部直接返回；充满/离线状态变化由脚本侧发本地通知
- (void)startMonitorTimer {
    [self.monitorTimer invalidate];
    __weak typeof(self) weakSelf = self;
    self.monitorTimer = [NSTimer scheduledTimerWithTimeInterval:kMonitorTickInterval
                                                        repeats:YES
                                                          block:^(NSTimer *timer) {
        [weakSelf runMonitorTick];
    }];
}

- (void)runMonitorTick {
    [self.dispatcher dispatchURL:@"http://zeeho.box/api/vehicle-monitor-tick"
                          method:@"GET"
                         headers:@{}
                            body:nil
                      completion:^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {}];
}

- (void)dealloc {
    [_monitorTimer invalidate];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

#pragma mark - 请求体读取（兼容 HTTPBody / HTTPBodyStream / X-Zeeho-Body 头三种形态）

- (NSString *)readRequestBody:(NSURLRequest *)request {
    if (request.HTTPBody.length) {
        return [[NSString alloc] initWithData:request.HTTPBody encoding:NSUTF8StringEncoding];
    }
    if (request.HTTPBodyStream) {
        NSInputStream *stream = request.HTTPBodyStream;
        [stream open];
        NSMutableData *data = [NSMutableData data];
        uint8_t buffer[65536];
        NSInteger read;
        while ((read = [stream read:buffer maxLength:sizeof(buffer)]) > 0) {
            [data appendBytes:buffer length:(NSUInteger)read];
        }
        [stream close];
        return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    }
    // 兜底：WebKit 剥离自定义 scheme POST 请求体，从前端垫片写入的桥接头还原
    return [self bridgeBodyFromHeaders:request.allHTTPHeaderFields];
}

- (NSString *)bridgeBodyFromHeaders:(NSDictionary *)headers {
    __block NSString *value = nil;
    [headers enumerateKeysAndObjectsUsingBlock:^(id key, id val, BOOL *stop) {
        if ([key isKindOfClass:[NSString class]] &&
            [key caseInsensitiveCompare:kBodyBridgeHeader] == NSOrderedSame) {
            value = [val isKindOfClass:[NSString class]] ? val : [NSString stringWithFormat:@"%@", val];
            *stop = YES;
        }
    }];
    if (!value.length) return nil;
    NSString *decoded = [value stringByRemovingPercentEncoding];
    return decoded.length ? decoded : nil;
}

#pragma mark - WKURLSchemeHandler

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    [self.activeTasks addObject:urlSchemeTask];

    // /diag → 原生诊断页（bundle 内 diag.html，不经核心脚本）
    NSURL *reqURL = urlSchemeTask.request.URL;
    NSString *path = reqURL.path.length ? reqURL.path : @"/";
    if ([path isEqualToString:@"/diag"]) {
        [self serveDiagPage:urlSchemeTask];
        return;
    }

    // zeeho://panel/path?query → http://zeeho.box/path?query（脚本的标准入口域名）
    NSString *urlStr = [@"http://zeeho.box" stringByAppendingString:path];
    if (reqURL.query.length) urlStr = [urlStr stringByAppendingFormat:@"?%@", reqURL.query];

    NSString *method = urlSchemeTask.request.HTTPMethod ?: @"GET";
    NSString *body = [self readRequestBody:urlSchemeTask.request];
    // 剔除 body 桥接头，避免泄漏进脚本 $request.headers
    NSDictionary *rawHeaders = urlSchemeTask.request.allHTTPHeaderFields ?: @{};
    NSMutableDictionary *headers = [NSMutableDictionary dictionaryWithCapacity:rawHeaders.count];
    [rawHeaders enumerateKeysAndObjectsUsingBlock:^(id key, id val, BOOL *stop) {
        if ([key isKindOfClass:[NSString class]] &&
            [key caseInsensitiveCompare:kBodyBridgeHeader] == NSOrderedSame) return;
        headers[key] = val;
    }];

    __weak typeof(self) weakSelf = self;
    [self.dispatcher dispatchURL:urlStr method:method headers:headers body:body completion:^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf || ![strongSelf.activeTasks containsObject:urlSchemeTask]) return;
        [strongSelf.activeTasks removeObject:urlSchemeTask];
        @try {
            // 统一禁缓存，防止 WKWebView 缓存 /api/* 的 GET 响应导致数据陈旧
            NSMutableDictionary *finalHeaders = [NSMutableDictionary dictionaryWithDictionary:respHeaders ?: @{}];
            finalHeaders[@"Cache-Control"] = @"no-store";
            NSString *finalBody = respBody ?: @"";
            // HTML 响应（看板页/配置页）最前面注入 fetch body 桥接垫片 + 诊断入口
            NSString *contentType = [finalHeaders[@"Content-Type"] isKindOfClass:[NSString class]] ? finalHeaders[@"Content-Type"] : @"";
            if ([contentType containsString:@"text/html"]) {
                finalBody = [kFetchBodyShim stringByAppendingString:finalBody];
                finalBody = [finalBody stringByAppendingString:kDiagEntryShim];
            }
            NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:reqURL
                                                                        statusCode:status
                                                                       HTTPVersion:@"HTTP/1.1"
                                                                      headerFields:finalHeaders];
            [urlSchemeTask didReceiveResponse:response];
            NSData *data = [finalBody dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data];
            [urlSchemeTask didReceiveData:data];
            [urlSchemeTask didFinish];
        } @catch (NSException *exception) {
            // 任务已被 WebKit 取消，忽略
        }
    }];
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    [self.activeTasks removeObject:urlSchemeTask];
}

#pragma mark - 诊断页与诊断桥

// /diag：返回 bundle 内 diag.html（原生诊断 UI，不经核心脚本）
- (void)serveDiagPage:(id<WKURLSchemeTask>)urlSchemeTask {
    NSString *html = @"";
    NSString *path = [[NSBundle mainBundle] pathForResource:@"diag" ofType:@"html"];
    if (path) html = [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:NULL] ?: @"";
    @try {
        NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:urlSchemeTask.request.URL
                                                                  statusCode:path ? 200 : 500
                                                                 HTTPVersion:@"HTTP/1.1"
                                                                headerFields:@{ @"Content-Type": @"text/html; charset=utf-8",
                                                                                @"Cache-Control": @"no-store" }];
        [urlSchemeTask didReceiveResponse:response];
        [urlSchemeTask didReceiveData:[html dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data]];
        [urlSchemeTask didFinish];
    } @catch (NSException *exception) {
        // 任务已被 WebKit 取消，忽略
    }
    [self.activeTasks removeObject:urlSchemeTask];
}

// JS 桥：window.webkit.messageHandlers.zhDiag.postMessage({op, args}, reply)
- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message
                 replyHandler:(void (^)(id _Nullable, NSString *_Nullable))replyHandler {
    if (![message.name isEqualToString:@"zhDiag"]) {
        replyHandler(nil, @"未知消息通道");
        return;
    }
    NSDictionary *body = [message.body isKindOfClass:[NSDictionary class]] ? message.body : @{};
    NSString *op = [body[@"op"] isKindOfClass:[NSString class]] ? body[@"op"] : @"";
    NSDictionary *args = [body[@"args"] isKindOfClass:[NSDictionary class]] ? body[@"args"] : @{};
    [[ZHDiagService shared] handleOp:op args:args reply:^(id result, NSString *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            // 错误时 reply 传 nil（JS promise reject）；成功时 result 至少为 NSNull
            replyHandler(error ? nil : (result ?: [NSNull null]), error);
        });
    }];
}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    NSString *scheme = url.scheme.lowercaseString;
    if ([scheme isEqualToString:kPanelScheme] || [scheme isEqualToString:@"about"] || scheme.length == 0) {
        decisionHandler(WKNavigationActionPolicyAllow);
        return;
    }
    // 外部链接（如地图导航）交给系统浏览器
    if ([scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"]) {
        [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
    }
    decisionHandler(WKNavigationActionPolicyCancel);
}

#pragma mark - WKUIDelegate

// window.open（面板内跳转地图等）
- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)navigationAction windowFeatures:(WKWindowFeatures *)windowFeatures {
    NSURL *url = navigationAction.request.URL;
    if (url) {
        [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
    }
    return nil;
}

// 面板 JS 的 alert/confirm 原生承接
- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))completionHandler {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:nil message:message preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"确定" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
        completionHandler();
    }]];
    [self presentViewController:alert animated:YES completion:nil];
}

- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL))completionHandler {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:nil message:message preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleCancel handler:^(UIAlertAction *action) {
        completionHandler(NO);
    }]];
    [alert addAction:[UIAlertAction actionWithTitle:@"确定" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
        completionHandler(YES);
    }]];
    [self presentViewController:alert animated:YES completion:nil];
}

// WebContent 进程被系统回收（后台内存压力）时页面会整页变白，
// 不主动 reload 将一直白屏，用户感知为闪屏/白屏，这里自动恢复
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    [webView reload];
}

@end
