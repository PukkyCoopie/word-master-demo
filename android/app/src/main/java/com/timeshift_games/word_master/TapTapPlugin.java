package com.timeshift_games.word_master;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.taptap.sdk.core.TapTapEvent;
import com.taptap.sdk.cloudsave.ArchiveData;
import com.taptap.sdk.cloudsave.ArchiveMetadata;
import com.taptap.sdk.cloudsave.internal.TapCloudSaveRequestCallback;
import com.taptap.sdk.achievement.TapTapAchievement;
import com.taptap.sdk.compliance.TapTapCompliance;
import com.taptap.sdk.kit.internal.callback.TapTapCallback;
import com.taptap.sdk.kit.internal.exception.TapTapException;
import com.taptap.sdk.leaderboard.androidx.TapTapLeaderboard;
import com.taptap.sdk.leaderboard.callback.ITapTapLeaderboardResponseCallback;
import com.taptap.sdk.leaderboard.data.request.SubmitScoresRequest;
import com.taptap.sdk.leaderboard.data.response.SubmitScoresResponse;
import com.taptap.sdk.login.Scopes;
import com.taptap.sdk.login.TapTapAccount;
import com.taptap.sdk.login.TapTapLogin;
import com.taptap.sdk.moment.TapTapMoment;
import com.taptap.sdk.review.TapTapReview;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

@CapacitorPlugin(name = "TapTap")
public class TapTapPlugin extends Plugin {

    private static TapTapPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void initSdk(PluginCall call) {
        TapTapBridge.init(getContext());
        call.resolve();
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = call.getString("name");
        String propertiesJson = call.getString("propertiesJson", "{}");
        if (name == null || name.trim().isEmpty()) {
            call.reject("name is required");
            return;
        }
        try {
            JSONObject props = new JSONObject(propertiesJson);
            TapTapEvent.logEvent(name.trim(), props);
            call.resolve();
        } catch (Exception exception) {
            call.reject("logEvent failed", exception);
        }
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

    static void dispatchCloudSaveStatus(int code) {
        TapTapPlugin plugin = instance;
        if (plugin == null) {
            return;
        }
        JSObject payload = new JSObject();
        payload.put("code", code);
        plugin.notifyListeners("cloudSaveStatus", payload);
    }

    @PluginMethod
    public void cloudSaveGetArchiveList(PluginCall call) {
        TapTapCloudSaveBridge.getArchiveList(
            new TapCloudSaveRequestCallback() {
                @Override
                public void onArchiveListResult(List<ArchiveData> list) {
                    com.getcapacitor.JSArray arr = new com.getcapacitor.JSArray();
                    if (list != null) {
                        for (ArchiveData archive : list) {
                            arr.put(TapTapCloudSaveBridge.archiveDataToJson(archive));
                        }
                    }
                    JSObject ret = new JSObject();
                    ret.put("archives", arr);
                    call.resolve(ret);
                }

                @Override
                public void onRequestError(int errorCode, String errorMessage) {
                    call.reject(formatCloudSaveError(errorCode, errorMessage));
                }

                @Override
                public void onArchiveCreated(ArchiveData archiveData) {}

                @Override
                public void onArchiveUpdated(ArchiveData archiveData) {}

                @Override
                public void onArchiveDeleted(ArchiveData archiveData) {}

                @Override
                public void onArchiveDataResult(byte[] bytes) {}

                @Override
                public void onArchiveCoverResult(byte[] bytes) {}
            }
        );
    }

    @PluginMethod
    public void cloudSaveCreateArchive(PluginCall call) {
        if (!resolveCloudSaveUpload(call)) {
            return;
        }
        String archiveName = call.getString("archiveName");
        String archiveSummary = call.getString("archiveSummary", "");
        String archiveExtra = call.getString("archiveExtra", "");
        Integer playtime = call.getInt("archivePlaytime", 0);
        String dataJson = call.getString("dataJson");
        String filePath = call.getString("filePath");
        if (archiveName == null || archiveName.trim().isEmpty()) {
            call.reject("archiveName is required");
            return;
        }
        if (dataJson == null && filePath == null) {
            call.reject("dataJson or filePath is required");
            return;
        }
        android.content.Context context = getContext();
        if (context == null) {
            call.reject("Context unavailable");
            return;
        }
        try {
            String resolvedPath = filePath;
            if (resolvedPath == null || resolvedPath.trim().isEmpty()) {
                resolvedPath = TapTapCloudSaveBridge.writeTempArchiveFile(context, dataJson).getAbsolutePath();
            }
            ArchiveMetadata metadata =
                TapTapCloudSaveBridge.buildMetadata(
                    archiveName.trim(),
                    archiveSummary != null ? archiveSummary : "",
                    archiveExtra != null ? archiveExtra : "",
                    playtime != null ? playtime : 0
                );
            TapTapCloudSaveBridge.createArchive(
                metadata,
                resolvedPath,
                archiveResultCallback(call)
            );
        } catch (Exception exception) {
            call.reject(exception.getMessage() != null ? exception.getMessage() : "Create archive failed");
        }
    }

    @PluginMethod
    public void cloudSaveUpdateArchive(PluginCall call) {
        if (!resolveCloudSaveUpload(call)) {
            return;
        }
        String archiveUuid = call.getString("archiveUuid");
        String archiveName = call.getString("archiveName");
        String archiveSummary = call.getString("archiveSummary", "");
        String archiveExtra = call.getString("archiveExtra", "");
        Integer playtime = call.getInt("archivePlaytime", 0);
        String dataJson = call.getString("dataJson");
        String filePath = call.getString("filePath");
        if (archiveUuid == null || archiveUuid.trim().isEmpty()) {
            call.reject("archiveUuid is required");
            return;
        }
        if (archiveName == null || archiveName.trim().isEmpty()) {
            call.reject("archiveName is required");
            return;
        }
        if (dataJson == null && filePath == null) {
            call.reject("dataJson or filePath is required");
            return;
        }
        android.content.Context context = getContext();
        if (context == null) {
            call.reject("Context unavailable");
            return;
        }
        try {
            String resolvedPath = filePath;
            if (resolvedPath == null || resolvedPath.trim().isEmpty()) {
                resolvedPath = TapTapCloudSaveBridge.writeTempArchiveFile(context, dataJson).getAbsolutePath();
            }
            ArchiveMetadata metadata =
                TapTapCloudSaveBridge.buildMetadata(
                    archiveName.trim(),
                    archiveSummary != null ? archiveSummary : "",
                    archiveExtra != null ? archiveExtra : "",
                    playtime != null ? playtime : 0
                );
            TapTapCloudSaveBridge.updateArchive(
                archiveUuid.trim(),
                metadata,
                resolvedPath,
                archiveResultCallback(call)
            );
        } catch (Exception exception) {
            call.reject(exception.getMessage() != null ? exception.getMessage() : "Update archive failed");
        }
    }

    @PluginMethod
    public void cloudSaveGetArchiveData(PluginCall call) {
        String archiveUuid = call.getString("archiveUuid");
        String archiveFileId = call.getString("archiveFileId");
        if (archiveUuid == null || archiveUuid.trim().isEmpty()) {
            call.reject("archiveUuid is required");
            return;
        }
        if (archiveFileId == null || archiveFileId.trim().isEmpty()) {
            call.reject("archiveFileId is required");
            return;
        }
        TapTapCloudSaveBridge.getArchiveData(
            archiveUuid.trim(),
            archiveFileId.trim(),
            new TapCloudSaveRequestCallback() {
                @Override
                public void onArchiveDataResult(byte[] bytes) {
                    JSObject ret = new JSObject();
                    if (bytes == null || bytes.length == 0) {
                        ret.put("dataJson", "");
                    } else {
                        ret.put("dataJson", new String(bytes, StandardCharsets.UTF_8));
                    }
                    call.resolve(ret);
                }

                @Override
                public void onRequestError(int errorCode, String errorMessage) {
                    call.reject(formatCloudSaveError(errorCode, errorMessage));
                }

                @Override
                public void onArchiveCreated(ArchiveData archiveData) {}

                @Override
                public void onArchiveUpdated(ArchiveData archiveData) {}

                @Override
                public void onArchiveDeleted(ArchiveData archiveData) {}

                @Override
                public void onArchiveListResult(List<ArchiveData> list) {}

                @Override
                public void onArchiveCoverResult(byte[] bytes) {}
            }
        );
    }

    @PluginMethod
    public void cloudSaveDeleteArchive(PluginCall call) {
        String archiveUuid = call.getString("archiveUuid");
        if (archiveUuid == null || archiveUuid.trim().isEmpty()) {
            call.reject("archiveUuid is required");
            return;
        }
        TapTapCloudSaveBridge.deleteArchive(
            archiveUuid.trim(),
            archiveResultCallback(call)
        );
    }

    private static boolean resolveCloudSaveUpload(PluginCall call) {
        call.save();
        return true;
    }

    private static TapCloudSaveRequestCallback archiveResultCallback(PluginCall call) {
        return new TapCloudSaveRequestCallback() {
            @Override
            public void onArchiveCreated(ArchiveData archiveData) {
                call.resolve(TapTapCloudSaveBridge.archiveDataToJson(archiveData));
            }

            @Override
            public void onArchiveUpdated(ArchiveData archiveData) {
                call.resolve(TapTapCloudSaveBridge.archiveDataToJson(archiveData));
            }

            @Override
            public void onArchiveDeleted(ArchiveData archiveData) {
                call.resolve(TapTapCloudSaveBridge.archiveDataToJson(archiveData));
            }

            @Override
            public void onRequestError(int errorCode, String errorMessage) {
                call.reject(formatCloudSaveError(errorCode, errorMessage));
            }

            @Override
            public void onArchiveListResult(List<ArchiveData> list) {}

            @Override
            public void onArchiveDataResult(byte[] bytes) {}

            @Override
            public void onArchiveCoverResult(byte[] bytes) {}
        };
    }

    private static String formatCloudSaveError(int errorCode, String errorMessage) {
        String message = errorMessage != null ? errorMessage : "Cloud save request failed";
        return errorCode + ":" + message;
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
        ret.put("clientId", context.getString(R.string.taptap_client_id));
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
    public void unlockAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId");
        if (achievementId == null || achievementId.trim().isEmpty()) {
            call.reject("achievementId is required");
            return;
        }
        TapTapAchievement.unlock(achievementId.trim());
        call.resolve();
    }

    @PluginMethod
    public void incrementAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId");
        if (achievementId == null || achievementId.trim().isEmpty()) {
            call.reject("achievementId is required");
            return;
        }
        Integer steps = call.getInt("steps", 1);
        int delta = steps != null ? Math.max(1, steps) : 1;
        TapTapAchievement.increment(achievementId.trim(), delta);
        call.resolve();
    }

    @PluginMethod
    public void setAchievementToastEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        TapTapAchievement.setToastEnable(Boolean.TRUE.equals(enabled));
        call.resolve();
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        TapTapAchievement.showAchievements();
        call.resolve();
    }

    @PluginMethod
    public void openLeaderboard(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        if (leaderboardId == null || leaderboardId.trim().isEmpty()) {
            call.reject("leaderboardId is required");
            return;
        }
        String collection = call.getString("collection", "public");
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        TapTapLeaderboard.openLeaderboard(activity, leaderboardId.trim(), collection);
        call.resolve();
    }

    @PluginMethod
    public void submitLeaderboardScores(PluginCall call) {
        JSArray scoresArray = call.getArray("scores");
        if (scoresArray == null || scoresArray.length() == 0) {
            call.reject("scores is required");
            return;
        }
        List<SubmitScoresRequest.ScoreItem> items = new ArrayList<>();
        try {
            for (int i = 0; i < scoresArray.length(); i++) {
                JSONObject item = scoresArray.getJSONObject(i);
                if (item == null) continue;
                String leaderboardId = item.optString("leaderboardId", "");
                if (leaderboardId.trim().isEmpty()) continue;
                long score = item.optLong("score", 0L);
                items.add(new SubmitScoresRequest.ScoreItem(leaderboardId.trim(), score));
            }
        } catch (Exception exception) {
            call.reject("Invalid scores payload");
            return;
        }
        if (items.isEmpty()) {
            call.reject("scores is empty");
            return;
        }
        TapTapLeaderboard.submitScores(
            items,
            new ITapTapLeaderboardResponseCallback<SubmitScoresResponse>() {
                @Override
                public void onSuccess(SubmitScoresResponse response) {
                    call.resolve();
                }

                @Override
                public void onFailure(int code, String message) {
                    String detail = message != null ? message : "submitLeaderboardScores failed";
                    call.reject(detail, String.valueOf(code));
                }
            }
        );
    }

    @PluginMethod
    public void openReview(PluginCall call) {
        TapTapReview.openReview();
        call.resolve();
    }

    @PluginMethod
    public void openMomentScene(PluginCall call) {
        String sceneId = call.getString("sceneId");
        if (sceneId == null || sceneId.trim().isEmpty()) {
            call.reject("sceneId is required");
            return;
        }
        TapTapMoment.openScene(sceneId.trim());
        call.resolve();
    }

    @PluginMethod
    public void openExternalUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
        activity.startActivity(intent);
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
