// WebViewController.m — 面板容器
// WKWebView 加载 zeeho://panel/，所有请求经 WKURLSchemeHandler 交给
// ZHDispatcher（JavaScriptCore 引擎）运行核心脚本，1:1 复刻桌面版架构。
#import "WebViewController.h"
#import "ZHDispatcher.h"
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

// 后台充电/离线监控轮询间隔（秒）
static const NSTimeInterval kMonitorTickInterval = 180.0;

@interface WebViewController () <WKURLSchemeHandler, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) ZHDispatcher *dispatcher;
@property (nonatomic, strong) NSHashTable<id<WKURLSchemeTask>> *activeTasks;
@property (nonatomic, strong) AVAudioPlayer *silencePlayer;
@property (nonatomic, strong) NSTimer *monitorTimer;
@property (nonatomic, strong) UIView *loadingView;
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

    // 注入 JS：hook hideSplash + Motoplay 投屏桥接
    WKUserContentController *userCtrl = [[WKUserContentController alloc] init];
    [userCtrl addScriptMessageHandler:self name:@"hideLoading"];
    [userCtrl addScriptMessageHandler:self name:@"motoplay"];
    static NSString * const kSplashHook =
    @"<script>(function(){"
    "var s=document.getElementById('splash');"
    "if(s&&s.classList.contains('out')){window.webkit.messageHandlers.hideLoading.postMessage(null);return;}"
    "var o=window.hideSplash;"
    "if(typeof o==='function'){window.hideSplash=function(){o.apply(this,arguments);"
    "if(window.webkit&&window.webkit.messageHandlers.hideLoading)window.webkit.messageHandlers.hideLoading.postMessage(null)}}"
    // Motoplay 桥接：前端通过 motoplayHandler(command,data) 调原生
    "window.motoplayHandler=function(cmd,data,cb){"
    "if(!window.webkit||!window.webkit.messageHandlers.motoplay)return cb(false);"
    "var id='mp_'+Date.now();window.__mpCbs=window.__mpCbs||{};if(cb)window.__mpCbs[id]=cb;"
    "window.webkit.messageHandlers.motoplay.postMessage({command:cmd,data:data||'',id:id})"
    "};"
    "})();</script>";
    [userCtrl addUserScript:[[WKUserScript alloc] initWithSource:kSplashHook
                                                   injectionTime:WKUserScriptInjectionTimeAtDocumentEnd
                                                forMainFrameOnly:YES]];
    config.userContentController = userCtrl;

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

    // 品牌开屏：与 HTML 闪屏视觉一致，数据就绪后淡出
    UIView *loading = [[UIView alloc] initWithFrame:self.view.bounds];
    loading.backgroundColor = [UIColor colorWithRed:10/255.0 green:15/255.0 blue:30/255.0 alpha:1.0];
    loading.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    loading.translatesAutoresizingMaskIntoConstraints = NO;

    // Logo：ZEEHO 图标图片
    UIImageView *logo = [[UIImageView alloc] init];
    logo.translatesAutoresizingMaskIntoConstraints = NO;
    logo.contentMode = UIViewContentModeScaleAspectFit;
    logo.image = [UIImage imageNamed:@"splash_icon"];
    logo.layer.cornerRadius = 24;
    logo.layer.masksToBounds = YES;

    UILabel *title = [[UILabel alloc] init];
    title.translatesAutoresizingMaskIntoConstraints = NO;
    title.text = @"极核 ZEEHO";
    title.textColor = [UIColor whiteColor];
    title.font = [UIFont systemFontOfSize:21 weight:UIFontWeightBlack];

    UILabel *sub = [[UILabel alloc] init];
    sub.translatesAutoresizingMaskIntoConstraints = NO;
    sub.text = @"签到 · 车辆 · 控车";
    sub.textColor = [UIColor colorWithRed:147/255.0 green:160/255.0 blue:184/255.0 alpha:1.0];
    sub.font = [UIFont systemFontOfSize:12 weight:UIFontWeightMedium];

    // Spinner + 文字横向排列
    UIActivityIndicatorView *spinner = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleMedium];
    spinner.translatesAutoresizingMaskIntoConstraints = NO;
    spinner.color = [UIColor colorWithRed:43/255.0 green:212/255.0 blue:242/255.0 alpha:1.0];

    UILabel *loadText = [[UILabel alloc] init];
    loadText.translatesAutoresizingMaskIntoConstraints = NO;
    loadText.text = @"正在加载数据…";
    loadText.textColor = [UIColor colorWithRed:147/255.0 green:160/255.0 blue:184/255.0 alpha:1.0];
    loadText.font = [UIFont systemFontOfSize:12 weight:UIFontWeightMedium];

    UIStackView *loadRow = [[UIStackView alloc] initWithArrangedSubviews:@[spinner, loadText]];
    loadRow.translatesAutoresizingMaskIntoConstraints = NO;
    loadRow.axis = UILayoutConstraintAxisHorizontal;
    loadRow.alignment = UIStackViewAlignmentCenter;
    loadRow.spacing = 8;

    [loading addSubview:logo];
    [loading addSubview:title];
    [loading addSubview:sub];
    [loading addSubview:loadRow];
    [self.view addSubview:loading];

    // Auto Layout 约束
    [NSLayoutConstraint activateConstraints:@[
        [loading.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [loading.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [loading.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [loading.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
        [logo.widthAnchor constraintEqualToConstant:84],
        [logo.heightAnchor constraintEqualToConstant:84],
        [logo.centerXAnchor constraintEqualToAnchor:loading.centerXAnchor],
        [logo.centerYAnchor constraintEqualToAnchor:loading.centerYAnchor constant:-50],
        [title.topAnchor constraintEqualToAnchor:logo.bottomAnchor constant:20],
        [title.centerXAnchor constraintEqualToAnchor:loading.centerXAnchor],
        [sub.topAnchor constraintEqualToAnchor:title.bottomAnchor constant:7],
        [sub.centerXAnchor constraintEqualToAnchor:loading.centerXAnchor],
        [loadRow.topAnchor constraintEqualToAnchor:sub.bottomAnchor constant:34],
        [loadRow.centerXAnchor constraintEqualToAnchor:loading.centerXAnchor],
    ]];
    [spinner startAnimating];
    // Logo 入场动画
    CAKeyframeAnimation *logoAnim = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    logoAnim.values = @[@0.6, @1.0];
    logoAnim.duration = 0.6;
    logoAnim.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    [logo.layer addAnimation:logoAnim forKey:@"popIn"];
    self.loadingView = loading;

    [self requestNotificationAuth];
    [self startBackgroundKeepAlive];
    [self startMonitorTimer];
    // 首次启动立即拉取小组件快照，不等 3 分钟定时器
    [self refreshWidgetSnapshot];
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
    // v2.14.21 桌面小组件：每次监控 tick 同步刷新 App Group 共享快照，Widget 每 15 分钟读取
    [self refreshWidgetSnapshot];
    // 后台签到：每日 7:00 后第一次 tick 触发 /api/run-signin（与 Android SignWorker 对齐）
    [self signinCheckAndFire];
}

#pragma mark - 后台定时签到

/// 每日 7:00 后第一次监控 tick 触发签到（与核心脚本 cron "0 7 * * *" 对齐）。
/// 复用现有 monitorTimer（每 3 分钟一次 + silencePlayer 静音保活），无需新增 BGTaskScheduler。
/// 用 NSUserDefaults 记录当天日期，避免一天内重复触发；失败不写记录，下次 tick 自动重试。
- (void)signinCheckAndFire {
    NSCalendar *cal = [NSCalendar currentCalendar];
    NSInteger hour = [cal component:NSCalendarUnitHour fromDate:[NSDate date]];
    if (hour < 7) return;  // 还没到 7:00

    NSDateFormatter *df = [[NSDateFormatter alloc] init];
    df.dateFormat = @"yyyy-MM-dd";
    df.timeZone = [NSTimeZone systemTimeZone];
    df.locale = [[NSLocale alloc] initWithLocaleIdentifier:@"en_US_POSIX"];
    NSString *today = [df stringFromDate:[NSDate date]];

    NSString *key = @"zeeho_last_signin_date";
    NSString *last = [[NSUserDefaults standardUserDefaults] stringForKey:key];
    if ([last isEqualToString:today]) return;  // 今天已触发过

    [self.dispatcher dispatchURL:@"http://zeeho.box/api/run-signin"
                          method:@"POST"
                         headers:@{@"Content-Type" : @"application/json"}
                            body:@"{\"all\":true}"
                      completion:^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {
        // 仅 2xx 视为成功，写入当天日期避免重复触发；失败下次 tick 还会重试
        if (status >= 200 && status < 300) {
            [[NSUserDefaults standardUserDefaults] setObject:today forKey:key];
        }
    }];
}

// 拉取 /api/widget-snapshot 并写入 App Group 共享目录 widget_snapshot.json
- (void)refreshWidgetSnapshot {
    [self.dispatcher dispatchURL:@"http://zeeho.box/api/widget-snapshot"
                          method:@"GET"
                         headers:@{}
                            body:nil
                      completion:^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {
        if (status != 200 || !respBody.length) return;
        NSURL *dir = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:@"group.com.zeeho.signpanel"];
        if (!dir) return;
        NSURL *file = [dir URLByAppendingPathComponent:@"widget_snapshot.json"];
        [respBody writeToFile:file.path atomically:YES encoding:NSUTF8StringEncoding error:NULL];
        // 通过 ObjC runtime 调用 WidgetBridge.reloadAll()（Swift 桥接类，@objcMembers 暴露到 ObjC runtime）
        Class bridgeClass = NSClassFromString(@"WidgetBridge");
        if (bridgeClass) {
            [bridgeClass performSelector:NSSelectorFromString(@"reloadAll")];
        }
    }];
}

#pragma mark - WKScriptMessageHandler

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"hideLoading"]) {
        // HTML 数据就绪，淡出加载提示
        if (self.loadingView) {
            [UIView animateWithDuration:0.3 animations:^{
                self.loadingView.alpha = 0;
            } completion:^(BOOL finished) {
                [self.loadingView removeFromSuperview];
                self.loadingView = nil;
            }];
        }
    }
    // Motoplay 投屏桥接
    if ([message.name isEqualToString:@"motoplay"]) {
        NSDictionary *body = message.body;
        NSString *cmd = body[@"command"];
        NSString *data = body[@"data"];
        NSString *cbId = body[@"id"];
        // 通过 ObjC runtime 调用 MotoplayManager
        Class mpClass = NSClassFromString(@"MotoplayManager");
        if (!mpClass) {
            [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](false)", cbId]];
            return;
        }
        if ([cmd isEqualToString:@"connect"]) {
            [mpClass performSelector:NSSelectorFromString(@"mpConnect:") withObject:^(BOOL ok) {
                [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](%@)", cbId, ok ? @"true" : @"false"]];
            }];
        } else if ([cmd isEqualToString:@"disconnect"]) {
            [mpClass performSelector:NSSelectorFromString(@"mpDisconnect")];
            [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](true)", cbId]];
        } else if ([cmd isEqualToString:@"isConnected"]) {
            BOOL ok = [mpClass performSelector:NSSelectorFromString(@"mpIsConnected")];
            [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](%@)", cbId, ok ? @"true" : @"false"]];
        } else if ([cmd isEqualToString:@"sendNavData"]) {
            // data = "COMMAND_TYPE|jsonPayload"
            static NSSet *allowedNavCommands = nil;
            if (!allowedNavCommands) {
                allowedNavCommands = [NSSet setWithArray:@[@"ROUTE", @"TURN_BY_TURN", @"ETA", @"SPEED_LIMIT", @"CLEAR"]];
            }
            NSArray *parts = [data componentsSeparatedByString:@"|"];
            if (parts.count >= 2 && [allowedNavCommands containsObject:parts[0]]) {
                NSString *command = parts[0];
                NSString *payload = [[parts subarrayWithRange:NSMakeRange(1, parts.count - 1)] componentsJoinedByString:@"|"];
                SEL sel = NSSelectorFromString(@"mpSendNavData:data:callback:");
                id (*castSel)(id, SEL, id, id, id) = (void *)[mpClass methodForSelector:sel];
                castSel(mpClass, sel, command, payload, ^(BOOL ok) {
                    [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](%@)", cbId, ok ? @"true" : @"false"]];
                });
            } else {
                [self evaluateJS:[NSString stringWithFormat:@"window.__mpCbs['%@'](false)", cbId]];
            }
        }
    }
}

// JS 执行辅助
- (void)evaluateJS:(NSString *)js {
    [self.webView evaluateJavaScript:js completionHandler:nil];
}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    // 兜底：若 JS hook 未触发（如数据极快返回或出错），15 秒后强制隐藏
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(15 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if (self.loadingView) {
            [UIView animateWithDuration:0.3 animations:^{
                self.loadingView.alpha = 0;
            } completion:^(BOOL finished) {
                [self.loadingView removeFromSuperview];
                self.loadingView = nil;
            }];
        }
    });
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

    // zeeho://panel/path?query → http://zeeho.box/path?query（脚本的标准入口域名）
    NSURL *reqURL = urlSchemeTask.request.URL;
    NSString *path = reqURL.path.length ? reqURL.path : @"/";
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
            // HTML 响应（看板页/配置页）最前面注入 fetch body 桥接垫片
            NSString *contentType = [finalHeaders[@"Content-Type"] isKindOfClass:[NSString class]] ? finalHeaders[@"Content-Type"] : @"";
            if ([contentType containsString:@"text/html"]) {
                finalBody = [kFetchBodyShim stringByAppendingString:finalBody];
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
    // mailto: 交给系统邮件 App
    if ([scheme isEqualToString:@"mailto"] || [scheme isEqualToString:@"tel"]) {
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
