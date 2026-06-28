package com.timeshift_games.word_master;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
        return major > 0 && major < MIN_WEBVIEW_CHROME_MAJOR;
    }

    private int resolveWebViewChromeMajor() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.content.pm.PackageInfo pkg = WebView.getCurrentWebViewPackage();
            if (pkg != null && pkg.versionName != null) {
                int major = parseMajorVersion(pkg.versionName);
                if (major > 0) {
                    return major;
                }
            }
        }

        WebView probe = null;
        try {
            probe = new WebView(this);
            String ua = probe.getSettings().getUserAgentString();
            return parseChromeMajorFromUserAgent(ua);
        } catch (Exception ignored) {
            return 0;
        } finally {
            if (probe != null) {
                probe.destroy();
            }
        }
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
            .setMessage(
                "当前 Android System WebView 版本过低，无法运行游戏。"
                    + "请在应用商店更新「Android System WebView」或 Google Chrome 后重试。"
            )
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

    private void openWebViewUpdatePage() {
        String[] packageNames = new String[] {
            "com.google.android.webview",
            "com.android.chrome",
        };
        for (String packageName : packageNames) {
            try {
                Intent marketIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + packageName)
                );
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(marketIntent);
                return;
            } catch (Exception ignored) {
                try {
                    Intent webIntent = new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=" + packageName)
                    );
                    webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(webIntent);
                    return;
                } catch (Exception ignoredWeb) {
                    // try next package
                }
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
