# Keep QuickJS native bridge
-keep class com.dokar.quickjs.** { *; }

# Keep NanoHTTPD
-keep class org.nanohttpd.** { *; }

# Keep OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
