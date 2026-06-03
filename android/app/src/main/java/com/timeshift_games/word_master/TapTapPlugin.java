package com.timeshift_games.word_master;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.taptap.sdk.compliance.TapTapCompliance;
import com.taptap.sdk.kit.internal.callback.TapTapCallback;
import com.taptap.sdk.kit.internal.exception.TapTapException;
import com.taptap.sdk.login.Scopes;
import com.taptap.sdk.login.TapTapAccount;
import com.taptap.sdk.login.TapTapLogin;
import java.util.Map;

@CapacitorPlugin(name = "TapTap")
public class TapTapPlugin extends Plugin {

    private static TapTapPlugin instance;

    @Override
    public void load() {
        instance = this;
        TapTapBridge.init(getContext());
    }

    static void dispatchComplianceResult(int code, Map<String, ?> extra) {
        TapTapPlugin plugin = instance;
        if (plugin == null) {
            return;
        }
        JSObject payload = new JSObject();
        payload.put("code", code);
        if (extra != null && !extra.isEmpty()) {
            JSObject extraObj = new JSObject();
            for (Map.Entry<String, ?> entry : extra.entrySet()) {
                Object value = entry.getValue();
                if (value instanceof String) {
                    extraObj.put(entry.getKey(), (String) value);
                } else if (value instanceof Number) {
                    extraObj.put(entry.getKey(), ((Number) value).doubleValue());
                } else if (value instanceof Boolean) {
                    extraObj.put(entry.getKey(), (Boolean) value);
                } else if (value != null) {
                    extraObj.put(entry.getKey(), String.valueOf(value));
                }
            }
            payload.put("extra", extraObj);
        }
        plugin.notifyListeners("complianceResult", payload);
    }

    @PluginMethod
    public void getAndroidAppInfo(PluginCall call) {
        android.content.Context context = getContext();
        if (context == null) {
            call.reject("Context unavailable");
            return;
        }
        boolean debuggable =
            (context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        JSObject ret = new JSObject();
        ret.put("packageName", context.getPackageName());
        ret.put("signatureMd5", TapTapBridge.getSigningCertificateMd5(context));
        ret.put("debuggable", debuggable);
        call.resolve(ret);
    }

    @PluginMethod
    public void getCurrentAccount(PluginCall call) {
        TapTapAccount account = TapTapLogin.getCurrentTapAccount();
        if (account == null) {
            call.resolve();
            return;
        }
        call.resolve(accountToJson(account));
    }

    @PluginMethod
    public void login(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        TapTapLogin.loginWithScopes(
            activity,
            new String[] { Scopes.SCOPE_PUBLIC_PROFILE },
            new TapTapCallback<TapTapAccount>() {
                @Override
                public void onSuccess(TapTapAccount account) {
                    call.resolve(accountToJson(account));
                }

                @Override
                public void onCancel() {
                    call.reject("Login cancelled");
                }

                @Override
                public void onFail(TapTapException exception) {
                    String message = exception != null ? exception.getMessage() : "Login failed";
                    call.reject(message != null ? message : "Login failed");
                }
            }
        );
    }

    @PluginMethod
    public void logout(PluginCall call) {
        TapTapCompliance.exit();
        TapTapLogin.logout();
        call.resolve();
    }

    @PluginMethod
    public void startCompliance(PluginCall call) {
        String userIdentifier = call.getString("userIdentifier");
        if (userIdentifier == null || userIdentifier.trim().isEmpty()) {
            call.reject("userIdentifier is required");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        TapTapCompliance.startup(activity, userIdentifier.trim());
        call.resolve();
    }

    private static JSObject accountToJson(TapTapAccount account) {
        JSObject ret = new JSObject();
        ret.put("openId", account.getOpenId());
        ret.put("unionId", account.getUnionId());
        ret.put("name", account.getName());
        ret.put("avatar", account.getAvatar());
        return ret;
    }
}
