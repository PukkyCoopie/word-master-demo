package com.timeshift_games.word_master;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import com.taptap.sdk.compliance.TapTapCompliance;
import com.taptap.sdk.compliance.TapTapComplianceCallback;
import com.taptap.sdk.compliance.option.TapTapComplianceOptions;
import com.taptap.sdk.core.TapTapRegion;
import com.taptap.sdk.core.TapTapSdk;
import com.taptap.sdk.core.TapTapSdkOptions;

final class TapTapBridge {

    private static volatile boolean initialized = false;

    private TapTapBridge() {}

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

        TapTapSdk.init(appContext, coreOptions, complianceOptions);
        TapTapCompliance.registerComplianceCallback(
            new TapTapComplianceCallback() {
                @Override
                public void onComplianceResult(int code, java.util.Map<String, ?> extra) {
                    TapTapPlugin.dispatchComplianceResult(code, extra);
                }
            }
        );
        initialized = true;
    }
}
