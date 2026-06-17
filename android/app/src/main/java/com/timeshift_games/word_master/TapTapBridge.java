package com.timeshift_games.word_master;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.util.Log;
import com.taptap.sdk.achievement.TapTapAchievement;
import com.taptap.sdk.achievement.options.TapTapAchievementOptions;
import com.taptap.sdk.compliance.TapTapCompliance;
import com.taptap.sdk.compliance.TapTapComplianceCallback;
import com.taptap.sdk.compliance.option.TapTapComplianceOptions;
import com.taptap.sdk.cloudsave.TapTapCloudSave;
import com.taptap.sdk.cloudsave.internal.TapCloudSaveCallback;
import com.taptap.sdk.core.TapTapRegion;
import com.taptap.sdk.core.TapTapSdk;
import com.taptap.sdk.core.TapTapSdkOptions;

final class TapTapBridge {

    private static final String TAG = "TapTapBridge";

    private static volatile boolean initialized = false;

    private TapTapBridge() {}

    static String getSigningCertificateMd5(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            String packageName = context.getPackageName();
            PackageInfo packageInfo;
            Signature[] signatures;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
                if (packageInfo.signingInfo == null) {
                    return "";
                }
                signatures = packageInfo.signingInfo.getApkContentsSigners();
            } else {
                packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
                signatures = packageInfo.signatures;
            }
            if (signatures == null || signatures.length == 0) {
                return "";
            }
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(signatures[0].toByteArray());
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                builder.append(String.format("%02X", value));
            }
            return builder.toString();
        } catch (Exception exception) {
            Log.w(TAG, "Failed to read signing certificate MD5", exception);
            return "";
        }
    }

    static synchronized void init(Context context) {
        if (initialized) {
            return;
        }
        Context appContext = context.getApplicationContext();
        String clientId = appContext.getString(R.string.taptap_client_id);
        String clientToken = appContext.getString(R.string.taptap_client_token);

        TapTapSdkOptions coreOptions = new TapTapSdkOptions(clientId, clientToken, TapTapRegion.CN);
        coreOptions.setScreenOrientation(0);
        boolean debuggable =
            (appContext.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        coreOptions.setEnableLog(debuggable);

        TapTapComplianceOptions complianceOptions = new TapTapComplianceOptions(
            false,
            false
        );
        TapTapAchievementOptions achievementOptions = new TapTapAchievementOptions(false);

        if (debuggable) {
            Log.i(
                TAG,
                "init package="
                    + appContext.getPackageName()
                    + " signatureMd5="
                    + getSigningCertificateMd5(appContext)
                    + " clientId="
                    + clientId
            );
        }

        TapTapSdk.init(appContext, coreOptions, complianceOptions, achievementOptions);
        TapTapAchievement.setToastEnable(false);
        TapTapCompliance.registerComplianceCallback(
            new TapTapComplianceCallback() {
                @Override
                public void onComplianceResult(int code, java.util.Map<String, ?> extra) {
                    TapTapPlugin.dispatchComplianceResult(code, extra);
                }
            }
        );
        TapTapCloudSave.registerCloudSaveCallback(
            new TapCloudSaveCallback() {
                @Override
                public void onResult(int resultCode) {
                    TapTapPlugin.dispatchCloudSaveStatus(resultCode);
                }
            }
        );
        initialized = true;
    }
}
