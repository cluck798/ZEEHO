// WebViewController.m — 面板容器
// WKWebView 加载 zeeho://panel/，所有请求经 WKURLSchemeHandler 交给
// ZHDispatcher（JavaScriptCore 引擎）运行核心脚本，1:1 复刻桌面版架构。
#import "WebViewController.h"
#import "ZHDispatcher.h"
#import <WebKit/WebKit.h>

static NSString * const kPanelScheme = @"zeeho";

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

#pragma mark - 请求体读取（兼容 HTTPBody / HTTPBodyStream 两种形态）

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
    return nil;
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
    NSDictionary *headers = urlSchemeTask.request.allHTTPHeaderFields ?: @{};

    __weak typeof(self) weakSelf = self;
    [self.dispatcher dispatchURL:urlStr method:method headers:headers body:body completion:^(NSInteger status, NSDictionary *respHeaders, NSString *respBody) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf || ![strongSelf.activeTasks containsObject:urlSchemeTask]) return;
        [strongSelf.activeTasks removeObject:urlSchemeTask];
        @try {
            NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:reqURL
                                                                        statusCode:status
                                                                       HTTPVersion:@"HTTP/1.1"
                                                                      headerFields:respHeaders];
            [urlSchemeTask didReceiveResponse:response];
            NSData *data = [respBody dataUsingEncoding:NSUTF8StringEncoding] ?: [NSData data];
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
