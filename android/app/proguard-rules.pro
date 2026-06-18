# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# TapTap SDK：注解类仅编译期使用，R8 可忽略
-dontwarn com.taptap.sdk.servicemanager.annotation.Service
-dontwarn com.taptap.sdk.startup.annotation.Initialize

# OkHttp 可选 TLS 后端（TapTap / 网络库）；未打包 conscrypt 时 R8 需忽略
-dontwarn org.conscrypt.Conscrypt
-dontwarn org.conscrypt.OpenSSLProvider

# Capacitor WebView 桥与自定义插件
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
  @com.getcapacitor.PluginMethod *;
}
-keep class com.timeshift_games.word_master.** { *; }
