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

@end

NS_ASSUME_NONNULL_END
