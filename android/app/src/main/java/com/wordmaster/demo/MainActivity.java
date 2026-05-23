package com.wordmaster.demo;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

    private boolean webViewConfigured = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onStart() {
        super.onStart();
        applyImmersiveSystemUi();
        configureWebViewForGame();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveSystemUi();
            configureWebViewForGame();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveSystemUi();
        configureWebViewForGame();
    }

    private void applyImmersiveSystemUi() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }
        controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
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
