package com.timeshift_games.word_master;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

    private static final int MIN_WEBVIEW_CHROME_MAJOR = 70;

    private boolean webViewConfigured = false;
    private boolean webViewBlockedDialogShown = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            boolean debuggable =
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            WebView.setWebContentsDebuggingEnabled(debuggable);
        }
        registerPlugin(TapTapPlugin.class);
        registerPlugin(UiHapticsPlugin.class);
        registerPlugin(WordSpeechPlugin.class);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (isWebViewTooOld()) {
            showWebViewBlockedDialog();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (webViewBlockedDialogShown) {
            return;
        }
        applyEdgeToEdgeSystemUi();
        configureWebViewForGame();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (webViewBlockedDialogShown) {
            return;
        }
        if (hasFocus) {
            applyEdgeToEdgeSystemUi();
            configureWebViewForGame();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (webViewBlockedDialogShown) {
            return;
        }
        applyEdgeToEdgeSystemUi();
        configureWebViewForGame();
    }

    private boolean isWebViewTooOld() {
        int major = resolveWebViewChromeMajor();
        // major == 0：无法解析时放行，避免误拦（如部分厂商 WebView 包版本号与 Chrome 不对应）
        return major > 0 && major < MIN_WEBVIEW_CHROME_MAJOR;
    }

    /**
     * 解析当前 WebView 的 Chromium 主版本。
     * 优先读 User-Agent（各厂商包内实际引擎版本）；仅 Google WebView/Chrome 才回退到包 versionName。
     */
    private int resolveWebViewChromeMajor() {
        int fromUserAgent = resolveChromeMajorFromWebViewUserAgent();
        if (fromUserAgent > 0) {
            return fromUserAgent;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageInfo pkg = WebView.getCurrentWebViewPackage();
            if (pkg != null && isGoogleWebViewPackage(pkg.packageName) && pkg.versionName != null) {
                int major = parseMajorVersion(pkg.versionName);
                if (major > 0) {
                    return major;
                }
            }
        }

        return 0;
    }

    private int resolveChromeMajorFromWebViewUserAgent() {
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            try {
                int major = parseChromeMajorFromUserAgent(
                    bridge.getWebView().getSettings().getUserAgentString()
                );
                if (major > 0) {
                    return major;
                }
            } catch (Exception ignored) {
                // fall through to probe WebView
            }
        }

        WebView probe = null;
        try {
            probe = new WebView(this);
            return parseChromeMajorFromUserAgent(probe.getSettings().getUserAgentString());
        } catch (Exception ignored) {
            return 0;
        } finally {
            if (probe != null) {
                probe.destroy();
            }
        }
    }

    private String getCurrentWebViewPackageName() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return null;
        }
        PackageInfo pkg = WebView.getCurrentWebViewPackage();
        return pkg != null ? pkg.packageName : null;
    }

    /** Google 系 WebView 的包 versionName 与 Chrome 主版本一致；厂商包（如 Honor 12.x）则不是。 */
    private boolean isGoogleWebViewPackage(String packageName) {
        return "com.google.android.webview".equals(packageName)
            || "com.android.chrome".equals(packageName);
    }

    private boolean isVendorWebViewPackage(String packageName) {
        return "com.hihonor.webview".equals(packageName)
            || "com.huawei.webview".equals(packageName);
    }

    private int parseMajorVersion(String versionName) {
        if (versionName == null || versionName.isEmpty()) {
            return 0;
        }
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < versionName.length(); i++) {
            char c = versionName.charAt(i);
            if (Character.isDigit(c)) {
                digits.append(c);
            } else if (digits.length() > 0) {
                break;
            }
        }
        if (digits.length() == 0) {
            return 0;
        }
        try {
            return Integer.parseInt(digits.toString());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private int parseChromeMajorFromUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isEmpty()) {
            return 0;
        }
        int marker = userAgent.indexOf("Chrome/");
        if (marker < 0) {
            marker = userAgent.indexOf("Chromium/");
            if (marker < 0) {
                return 0;
            }
            marker += "Chromium/".length();
        } else {
            marker += "Chrome/".length();
        }
        StringBuilder digits = new StringBuilder();
        for (int i = marker; i < userAgent.length(); i++) {
            char c = userAgent.charAt(i);
            if (Character.isDigit(c)) {
                digits.append(c);
            } else if (digits.length() > 0) {
                break;
            }
        }
        if (digits.length() == 0) {
            return 0;
        }
        try {
            return Integer.parseInt(digits.toString());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private void showWebViewBlockedDialog() {
        if (webViewBlockedDialogShown || isFinishing()) {
            return;
        }
        webViewBlockedDialogShown = true;

        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().loadUrl("about:blank");
        }

        new AlertDialog.Builder(this)
            .setTitle("系统组件过旧")
            .setMessage(buildWebViewBlockedMessage())
            .setCancelable(false)
            .setPositiveButton(
                "去更新",
                (dialog, which) -> {
                    openWebViewUpdatePage();
                    finish();
                }
            )
            .setNegativeButton(
                "退出",
                (dialog, which) -> finish()
            )
            .show();
    }

    private String buildWebViewBlockedMessage() {
        String provider = getCurrentWebViewPackageName();
        if ("com.hihonor.webview".equals(provider)) {
            return "当前 Honor WebView 内核版本过低，无法运行游戏。"
                + "请在应用市场或「设置 → 应用 → Honor WebView」中检查更新后重试。";
        }
        if ("com.huawei.webview".equals(provider)) {
            return "当前华为 WebView 内核版本过低，无法运行游戏。"
                + "请在应用市场或「设置 → 应用 → 华为 WebView」中检查更新后重试。";
        }
        return "当前系统 WebView 版本过低，无法运行游戏。"
            + "请在应用商店更新「Android System WebView」、Honor WebView 或 Google Chrome 后重试。";
    }

    private void openWebViewUpdatePage() {
        String provider = getCurrentWebViewPackageName();

        // 厂商 WebView 在国行机上通常没有 Play 商店，优先打开系统「应用信息」页
        if (isVendorWebViewPackage(provider) && openApplicationDetails(provider)) {
            return;
        }

        for (String packageName : getWebViewUpdatePackageCandidates(provider)) {
            if (tryOpenStoreListing(packageName)) {
                return;
            }
        }

        if (provider != null && openApplicationDetails(provider)) {
            return;
        }
    }

    private String[] getWebViewUpdatePackageCandidates(String currentProvider) {
        String[] fallbacks = new String[] {
            "com.hihonor.webview",
            "com.huawei.webview",
            "com.google.android.webview",
            "com.android.chrome",
        };
        if (currentProvider == null || currentProvider.isEmpty()) {
            return fallbacks;
        }
        for (String fallback : fallbacks) {
            if (currentProvider.equals(fallback)) {
                return fallbacks;
            }
        }
        return new String[] {
            currentProvider,
            fallbacks[0],
            fallbacks[1],
            fallbacks[2],
            fallbacks[3],
        };
    }

    private boolean openApplicationDetails(String packageName) {
        if (packageName == null || packageName.isEmpty()) {
            return false;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + packageName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean tryOpenStoreListing(String packageName) {
        try {
            Intent marketIntent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("market://details?id=" + packageName)
            );
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(marketIntent);
            return true;
        } catch (Exception ignored) {
            try {
                Intent webIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + packageName)
                );
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(webIntent);
                return true;
            } catch (Exception ignoredWeb) {
                return false;
            }
        }
    }

    /**
     * 边到边 + 透明系统栏（非 sticky 沉浸式）。
     * 若 hide(systemBars) 且 BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE，全面屏返回需先滑出系统栏再滑第二次才生效。
     */
    private void applyEdgeToEdgeSystemUi() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }
        controller.show(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_DEFAULT);
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
    }

    private void configureWebViewForGame() {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        webView.setBackgroundColor(Color.parseColor("#c4b7a6"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = webView.getSettings();
        // 默认 minimumFontSize=8 会把小字号（如 13–17 * --rpx）顶到至少 8px
        settings.setMinimumFontSize(1);
        settings.setMinimumLogicalFontSize(1);
        // 使用 CSS 字号，不跟系统「字体大小」设置一起放大
        settings.setTextZoom(100);

        if (!webViewConfigured) {
            webViewConfigured = true;
            webView.setWebChromeClient(new BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    if (request != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        request.deny();
                    }
                }

                @Override
                public void onGeolocationPermissionsShowPrompt(
                    String origin,
                    android.webkit.GeolocationPermissions.Callback callback
                ) {
                    if (callback != null) {
                        callback.invoke(origin, false, false);
                    }
                }
            });
        }

        clearViewInsets(webView);
        if (webView.getParent() instanceof View) {
            clearViewInsets((View) webView.getParent());
        }

        View content = findViewById(android.R.id.content);
        if (content != null) {
            clearViewInsets(content);
        }
    }

    private void clearViewInsets(View view) {
        view.setPadding(0, 0, 0, 0);
        ViewCompat.setOnApplyWindowInsetsListener(view, (v, insets) -> {
            v.setPadding(0, 0, 0, 0);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(view);
    }
}
