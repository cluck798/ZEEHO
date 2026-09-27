// WebViewController.m — 面板容器
// WKWebView 加载 zeeho://panel/，所有请求经 WKURLSchemeHandler 交给
// ZHDispatcher（JavaScriptCore 引擎）运行核心脚本，1:1 复刻桌面版架构。
#import "WebViewController.h"
#import "ZHDispatcher.h"
#import <WebKit/WebKit.h>

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

@interface WebViewController () <WKURLSchemeHandler, WKNavigationDelegate, WKUIDelegate>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) ZHDispatcher *dispatcher;
@property (nonatomic, strong) NSHashTable<id<WKURLSchemeTask>> *activeTasks;
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

@end
