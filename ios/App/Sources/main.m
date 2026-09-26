// main.m — 入口 + 崩溃捕获（诊断版）
// 启动即安装信号/异常处理器，崩溃时把原因与堆栈写入 Documents/crash.log，
// 下次启动由 AppDelegate 弹窗展示，便于无电脑连接定位闪退原因。
#import <UIKit/UIKit.h>
#import <signal.h>
#import <execinfo.h>
#import "AppDelegate.h"

static NSString *ZHCrashLogPath(void) {
    NSString *docs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    return [docs stringByAppendingPathComponent:@"crash.log"];
}

static void ZHWriteCrashInfo(NSString *reason) {
    NSMutableArray *lines = [NSMutableArray array];
    [lines addObject:[NSString stringWithFormat:@"crash_time: %@", [NSDate date]]];
    [lines addObject:[NSString stringWithFormat:@"reason: %@", reason ?: @"unknown"]];
    void *frames[64];
    int n = backtrace(frames, 64);
    char **syms = backtrace_symbols(frames, n);
    if (syms) {
        for (int i = 0; i < n; i++) {
            if (syms[i]) [lines addObject:[NSString stringWithUTF8String:syms[i]]];
        }
        free(syms);
    }
    [[lines componentsJoinedByString:@"\n"] writeToFile:ZHCrashLogPath()
                                              atomically:YES
                                                encoding:NSUTF8StringEncoding
                                                   error:NULL];
}

static void ZHSignalHandler(int sig) {
    signal(sig, SIG_DFL);
    ZHWriteCrashInfo([NSString stringWithFormat:@"signal %d", sig]);
    raise(sig);
}

static void ZHUncaughtExceptionHandler(NSException *exception) {
    NSString *stack = [exception.callStackSymbols componentsJoinedByString:@"\n"] ?: @"";
    ZHWriteCrashInfo([NSString stringWithFormat:@"uncaught exception: %@\n%@", exception.reason ?: @"", stack]);
}

int main(int argc, char *argv[]) {
    @autoreleasepool {
        signal(SIGSEGV, ZHSignalHandler);
        signal(SIGBUS, ZHSignalHandler);
        signal(SIGABRT, ZHSignalHandler);
        signal(SIGILL, ZHSignalHandler);
        signal(SIGTRAP, ZHSignalHandler);
        NSSetUncaughtExceptionHandler(ZHUncaughtExceptionHandler);
        return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
    }
}
