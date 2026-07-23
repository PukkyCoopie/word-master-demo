package com.timeshift_games.word_master;

import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** 释义弹窗：调用 Android 系统 TTS 朗读英文单词。 */
@CapacitorPlugin(name = "WordSpeech")
public class WordSpeechPlugin extends Plugin {

    private static final String UTTERANCE_ID = "word_master_speech";
    private static final long INIT_WAIT_MS = 8000L;
    private static final long SPEAK_START_TIMEOUT_MS = 2500L;

    private TextToSpeech tts;
    private final AtomicBoolean ttsReady = new AtomicBoolean(false);
    private final AtomicBoolean languageOk = new AtomicBoolean(false);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall pendingSpeakCall;
    private PluginCall activeSpeakCall;
    private Runnable initWaitTimeout;
    private Runnable speakStartTimeout;

    @Override
    public void load() {
        tts =
            new TextToSpeech(
                getContext(),
                status -> {
                    cancelInitWaitTimeout();
                    if (status == TextToSpeech.SUCCESS && tts != null) {
                        languageOk.set(applyEnglishLanguage(tts));
                        tts.setOnUtteranceProgressListener(createProgressListener());
                        ttsReady.set(true);
                        PluginCall pending = pendingSpeakCall;
                        pendingSpeakCall = null;
                        if (pending != null) {
                            if (!languageOk.get()) {
                                pending.reject("TTS language unavailable");
                            } else {
                                performSpeak(pending);
                            }
                        }
                    } else {
                        ttsReady.set(false);
                        languageOk.set(false);
                        PluginCall pending = pendingSpeakCall;
                        pendingSpeakCall = null;
                        if (pending != null) {
                            pending.reject("TTS unavailable");
                        }
                    }
                }
            );
    }

    private UtteranceProgressListener createProgressListener() {
        return new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
                if (!UTTERANCE_ID.equals(utteranceId)) return;
                mainHandler.post(
                    () -> {
                        cancelSpeakStartTimeout();
                        PluginCall call = activeSpeakCall;
                        activeSpeakCall = null;
                        if (call != null) {
                            call.resolve();
                        }
                    }
                );
            }

            @Override
            public void onDone(String utteranceId) {
                // no-op：成功已在 onStart resolve
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onError(String utteranceId) {
                rejectActiveSpeak(utteranceId);
            }

            @Override
            public void onError(String utteranceId, int errorCode) {
                rejectActiveSpeak(utteranceId);
            }
        };
    }

    private void rejectActiveSpeak(String utteranceId) {
        if (!UTTERANCE_ID.equals(utteranceId)) return;
        mainHandler.post(
            () -> {
                cancelSpeakStartTimeout();
                PluginCall call = activeSpeakCall;
                activeSpeakCall = null;
                if (call != null) {
                    call.reject("speak failed");
                }
            }
        );
    }

    /** 尝试美式 / 通用英文；两者都不可用则返回 false。 */
    private static boolean applyEnglishLanguage(TextToSpeech engine) {
        if (isLanguageUsable(engine, Locale.US)) {
            int set = engine.setLanguage(Locale.US);
            return isSetLanguageOk(set);
        }
        if (isLanguageUsable(engine, Locale.ENGLISH)) {
            int set = engine.setLanguage(Locale.ENGLISH);
            return isSetLanguageOk(set);
        }
        if (isLanguageUsable(engine, Locale.UK)) {
            int set = engine.setLanguage(Locale.UK);
            return isSetLanguageOk(set);
        }
        return false;
    }

    private static boolean isLanguageUsable(TextToSpeech engine, Locale locale) {
        int avail = engine.isLanguageAvailable(locale);
        return (
            avail == TextToSpeech.LANG_AVAILABLE
                || avail == TextToSpeech.LANG_COUNTRY_AVAILABLE
                || avail == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE
        );
    }

    private static boolean isSetLanguageOk(int setResult) {
        return (
            setResult != TextToSpeech.LANG_MISSING_DATA
                && setResult != TextToSpeech.LANG_NOT_SUPPORTED
        );
    }

    @PluginMethod
    public void getAvailability(PluginCall call) {
        JSObject ret = new JSObject();
        boolean ready = tts != null && ttsReady.get();
        boolean ok = ready && languageOk.get();
        ret.put("available", ok);
        if (!ready) {
            ret.put("reason", tts == null ? "unavailable" : "initializing");
        } else if (!languageOk.get()) {
            ret.put("reason", "language");
        } else {
            ret.put("reason", "ok");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        if (tts == null) {
            call.reject("TTS unavailable");
            return;
        }
        if (!ttsReady.get()) {
            pendingSpeakCall = call;
            scheduleInitWaitTimeout(call);
            return;
        }
        if (!languageOk.get()) {
            call.reject("TTS language unavailable");
            return;
        }
        performSpeak(call);
    }

    private void scheduleInitWaitTimeout(PluginCall call) {
        cancelInitWaitTimeout();
        initWaitTimeout =
            () -> {
                initWaitTimeout = null;
                if (pendingSpeakCall == call) {
                    pendingSpeakCall = null;
                    call.reject("TTS init timeout");
                }
            };
        mainHandler.postDelayed(initWaitTimeout, INIT_WAIT_MS);
    }

    private void cancelInitWaitTimeout() {
        if (initWaitTimeout != null) {
            mainHandler.removeCallbacks(initWaitTimeout);
            initWaitTimeout = null;
        }
    }

    private void performSpeak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("empty text");
            return;
        }
        cancelSpeakStartTimeout();
        if (activeSpeakCall != null) {
            activeSpeakCall.reject("interrupted");
            activeSpeakCall = null;
        }
        tts.stop();
        activeSpeakCall = call;
        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID);
        if (result == TextToSpeech.ERROR) {
            activeSpeakCall = null;
            call.reject("speak failed");
            return;
        }
        speakStartTimeout =
            () -> {
                speakStartTimeout = null;
                PluginCall pending = activeSpeakCall;
                activeSpeakCall = null;
                if (pending != null) {
                    try {
                        tts.stop();
                    } catch (Exception ignored) {}
                    pending.reject("speak start timeout");
                }
            };
        mainHandler.postDelayed(speakStartTimeout, SPEAK_START_TIMEOUT_MS);
    }

    private void cancelSpeakStartTimeout() {
        if (speakStartTimeout != null) {
            mainHandler.removeCallbacks(speakStartTimeout);
            speakStartTimeout = null;
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        cancelInitWaitTimeout();
        cancelSpeakStartTimeout();
        pendingSpeakCall = null;
        if (activeSpeakCall != null) {
            activeSpeakCall.reject("stopped");
            activeSpeakCall = null;
        }
        if (tts != null) {
            tts.stop();
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        cancelInitWaitTimeout();
        cancelSpeakStartTimeout();
        pendingSpeakCall = null;
        activeSpeakCall = null;
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ttsReady.set(false);
        languageOk.set(false);
        super.handleOnDestroy();
    }
}
