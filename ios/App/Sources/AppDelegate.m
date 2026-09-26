#import "AppDelegate.h"
#import "WebViewController.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    // 与面板页底色一致，启动/旋转过渡不露白边
    self.window.backgroundColor = [UIColor colorWithRed:10/255.0 green:15/255.0 blue:30/255.0 alpha:1.0];
    self.window.rootViewController = [[WebViewController alloc] init];
    [self.window makeKeyAndVisible];

    // 诊断：上次启动若崩溃，会写入 Documents/crash.log，这里弹窗展示原因
    NSString *docs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    NSString *crashLog = [docs stringByAppendingPathComponent:@"crash.log"];
    NSData *crashData = [NSData dataWithContentsOfFile:crashLog];
    if (crashData.length) {
        NSString *text = [[NSString alloc] initWithData:crashData encoding:NSUTF8StringEncoding] ?: @"(无法读取)";
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"上次启动发生崩溃"
                                                                           message:text
                                                                    preferredStyle:UIAlertControllerStyleAlert];
            [alert addAction:[UIAlertAction actionWithTitle:@"知道了" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
                [[NSFileManager defaultManager] removeItemAtPath:crashLog error:NULL];
            }]];
            [self.window.rootViewController presentViewController:alert animated:YES completion:nil];
        });
    }
    return YES;
}

@end
