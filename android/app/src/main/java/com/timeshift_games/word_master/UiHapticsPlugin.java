package com.timeshift_games.word_master;

import android.app.Activity;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.HapticFeedbackConstants;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 分层 UI / 游戏触感：短促、与动画相位对齐。 */
@CapacitorPlugin(name = "UiHaptics")
public class UiHapticsPlugin extends Plugin {

    private static final int TAB_SETTLE_DELAY_MS = 110;
    private static final int REJECT_SECOND_DELAY_MS = 42;
    private static final int MILESTONE_MID_DELAY_MS = 52;
    private static final int MILESTONE_END_DELAY_MS = 128;

    private final Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void click(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performCrispClick(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** Tab / 分段：软引导 → 落位清脆 */
    @PluginMethod
    public void tabSwitch(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            View decor = activity.getWindow().getDecorView();
            performSoftLead(decor, activity);
            handler.postDelayed(() -> performCrispClick(decor, activity), TAB_SETTLE_DELAY_MS);
        }
        call.resolve();
    }

    /** 浮层展开峰值（bloom） */
    @PluginMethod
    public void overlayPresent(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performBloom(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 浮层收起收尾 */
    @PluginMethod
    public void overlayDismiss(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performSoftSettle(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 棋盘选字母：单击清脆（强） */
    @PluginMethod
    public void gameSelect(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performCrispClick(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 字母入槽 / 棋盘落稳：轻引导（弱） */
    @PluginMethod
    public void gameLand(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performSoftLead(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 提交 / 购买等确认 */
    @PluginMethod
    public void gameConfirm(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performBloom(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 无效词等：双清脆 */
    @PluginMethod
    public void gameReject(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            View decor = activity.getWindow().getDecorView();
            performCrispClick(decor, activity);
            handler.postDelayed(() -> performCrispClick(decor, activity), REJECT_SECOND_DELAY_MS);
        }
        call.resolve();
    }

    /** 总分揭晓 / 胜利等强调脉冲 */
    @PluginMethod
    public void gameScorePulse(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performBloom(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 过关三连：引导 → bloom → 落点 */
    @PluginMethod
    public void gameMilestone(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            View decor = activity.getWindow().getDecorView();
            performSoftLead(decor, activity);
            handler.postDelayed(() -> performBloom(decor, activity), MILESTONE_MID_DELAY_MS);
            handler.postDelayed(() -> performCrispClick(decor, activity), MILESTONE_END_DELAY_MS);
        }
        call.resolve();
    }

    /** 失败 / Boss 警示：中等清脆 */
    @PluginMethod
    public void gameWarning(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            View decor = activity.getWindow().getDecorView();
            boolean performed =
                decor.performHapticFeedback(
                    HapticFeedbackConstants.CONTEXT_CLICK,
                    HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
                );
            if (!performed) {
                vibratePredefined(activity, VibrationEffect.EFFECT_DOUBLE_CLICK);
            }
        }
        call.resolve();
    }

    /** 成就等轻庆祝 */
    @PluginMethod
    public void gameCelebrate(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performCrispClick(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 点开预览层：弱于普通 tap */
    @PluginMethod
    public void gamePreviewOpen(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performSoftSettle(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** wobble 峰值 */
    @PluginMethod
    public void gameWobble(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performSoftLead(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 字母块删除 */
    @PluginMethod
    public void gameTileRemove(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performCrispClick(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    /** 结算 $ 逐个出现 */
    @PluginMethod
    public void gameSettleDollar(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            performSoftLead(activity.getWindow().getDecorView(), activity);
        }
        call.resolve();
    }

    private void performSoftLead(View decor, Activity activity) {
        boolean performed =
            decor.performHapticFeedback(
                HapticFeedbackConstants.CLOCK_TICK,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            );
        if (!performed) {
            vibrateWaveform(activity, new long[] { 0, 16 }, new int[] { 0, 48 });
        }
    }

    private void performCrispClick(View decor, Activity activity) {
        boolean performed =
            decor.performHapticFeedback(
                HapticFeedbackConstants.KEYBOARD_TAP,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            );
        if (!performed) {
            performed =
                decor.performHapticFeedback(
                    HapticFeedbackConstants.CONTEXT_CLICK,
                    HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
                );
        }
        if (!performed) {
            vibrateClickFallback(activity);
        }
    }

    private void performBloom(View decor, Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (vibratePredefined(activity, VibrationEffect.EFFECT_HEAVY_CLICK)) {
                return;
            }
        }
        boolean performed =
            decor.performHapticFeedback(
                HapticFeedbackConstants.CONTEXT_CLICK,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            );
        if (!performed) {
            vibrateWaveform(activity, new long[] { 0, 22 }, new int[] { 0, 168 });
        }
    }

    private void performSoftSettle(View decor, Activity activity) {
        boolean performed =
            decor.performHapticFeedback(
                HapticFeedbackConstants.KEYBOARD_TAP,
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
            );
        if (!performed) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibratePredefined(activity, VibrationEffect.EFFECT_TICK);
            } else {
                vibrateClickFallback(activity);
            }
        }
    }

    private boolean vibratePredefined(Activity activity, int effectId) {
        Vibrator vibrator = (Vibrator) activity.getSystemService(Activity.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vibrator.vibrate(VibrationEffect.createPredefined(effectId));
            return true;
        }
        return false;
    }

    private void vibrateWaveform(Activity activity, long[] timings, int[] amplitudes) {
        Vibrator vibrator = (Vibrator) activity.getSystemService(Activity.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
        } else {
            vibrateLegacy(activity, (int) timings[1]);
        }
    }

    @SuppressWarnings("deprecation")
    private void vibrateClickFallback(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (vibratePredefined(activity, VibrationEffect.EFFECT_CLICK)) {
                return;
            }
        }
        vibrateLegacy(activity, 12);
    }

    @SuppressWarnings("deprecation")
    private void vibrateLegacy(Activity activity, int durationMs) {
        Vibrator vibrator = (Vibrator) activity.getSystemService(Activity.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(durationMs);
        }
    }
}
