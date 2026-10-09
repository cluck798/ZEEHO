#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^ZHDispatchCompletion)(NSInteger status, NSDictionary *headers, NSString *body);

/// JavaScriptCore 引擎：每次请求创建独立 JSContext 运行核心脚本（Loon 环境），
/// 与桌面版 desktop/engine.js 的语义保持一致。
@interface ZHDispatcher : NSObject

- (void)dispatchURL:(NSString *)url
             method:(NSString *)method
            headers:(NSDictionary *)headers
               body:(nullable NSString *)body
         completion:(ZHDispatchCompletion)completion;

/// 面板 HTML 原生直出（带缓存）：从核心脚本内嵌的 __APP_HTML_B64 原生解码并拼上
/// __PANEL_MODE__ 前缀，供 App 首屏快路径使用，避免首屏等待一整轮脚本求值。
/// 脚本结构变化导致提取失败时返回 nil（调用方回退引擎通道）。
- (nullable NSString *)panelHTMLLocal;

@end

NS_ASSUME_NONNULL_END
