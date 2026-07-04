package com.timeshift_games.word_master;

import android.speech.tts.TextToSpeech;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** 释义弹窗：调用 Android 系统 TTS 朗读英文单词。 */
@CapacitorPlugin(name = "WordSpeech")
public class WordSpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private final AtomicBoolean ttsReady = new AtomicBoolean(false);
    private PluginCall pendingSpeakCall;

    @Override
    public void load() {
        tts =
            new TextToSpeech(
                getContext(),
                status -> {
                    if (status == TextToSpeech.SUCCESS && tts != null) {
                        int langResult = tts.setLanguage(Locale.US);
                        if (
                            langResult == TextToSpeech.LANG_MISSING_DATA
                                || langResult == TextToSpeech.LANG_NOT_SUPPORTED
                        ) {
                            tts.setLanguage(Locale.ENGLISH);
                        }
                        ttsReady.set(true);
                        PluginCall pending = pendingSpeakCall;
                        pendingSpeakCall = null;
                        if (pending != null) {
                            performSpeak(pending);
                        }
                    } else {
                        ttsReady.set(false);
                        PluginCall pending = pendingSpeakCall;
                        pendingSpeakCall = null;
                        if (pending != null) {
                            pending.reject("TTS unavailable");
                        }
                    }
                }
            );
    }

    @PluginMethod
    public void speak(PluginCall call) {
        if (tts == null) {
            call.reject("TTS unavailable");
            return;
        }
        if (!ttsReady.get()) {
            pendingSpeakCall = call;
            return;
        }
        performSpeak(call);
    }

    private void performSpeak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("empty text");
            return;
        }
        tts.stop();
        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "word_master_speech");
        if (result == TextToSpeech.ERROR) {
            call.reject("speak failed");
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        pendingSpeakCall = null;
        if (tts != null) {
            tts.stop();
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        pendingSpeakCall = null;
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.handleOnDestroy();
    }
}
