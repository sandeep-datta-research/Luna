package com.luna.aihub;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Locale;

@CapacitorPlugin(name = "LunaVoice", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class LunaVoicePlugin extends Plugin {
    private BroadcastReceiver receiver;
    private TextToSpeech textToSpeech;
    private volatile boolean ttsReady = false;

    @Override public void load() {
        textToSpeech = new TextToSpeech(getContext().getApplicationContext(), status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (!ttsReady || textToSpeech == null) return;
            textToSpeech.setLanguage(Locale.US);
            textToSpeech.setPitch(1.16f);
            textToSpeech.setSpeechRate(1.02f);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    for (Voice voice : textToSpeech.getVoices()) {
                        String name = voice.getName().toLowerCase(Locale.ROOT);
                        if (voice.getLocale().getLanguage().equalsIgnoreCase("en")
                                && (name.contains("female") || name.contains("samantha")
                                    || name.contains("aria") || name.contains("jenny")
                                    || name.contains("zira") || name.contains("kyoko"))) {
                            textToSpeech.setVoice(voice);
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }
        });

        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                if (LunaWakeWordService.ACTION_WAKE_WORD.equals(intent.getAction())) {
                    JSObject data = new JSObject();
                    data.put("transcript", intent.getStringExtra("transcript"));
                    notifyListeners("wakeWord", data);
                } else if (LunaWakeWordService.ACTION_COMMAND.equals(intent.getAction())) {
                    JSObject data = new JSObject();
                    data.put("transcript", intent.getStringExtra("transcript"));
                    notifyListeners("command", data);
                } else if (LunaWakeWordService.ACTION_STATUS.equals(intent.getAction())) {
                    JSObject data = new JSObject();
                    data.put("status", intent.getStringExtra(LunaWakeWordService.EXTRA_STATUS));
                    notifyListeners("status", data);
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(LunaWakeWordService.ACTION_WAKE_WORD);
        filter.addAction(LunaWakeWordService.ACTION_COMMAND);
        filter.addAction(LunaWakeWordService.ACTION_STATUS);
        if (Build.VERSION.SDK_INT >= 33) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    @PluginMethod public void startWakeWord(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }
        startService(call);
    }

    @PermissionCallback public void permissionCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED) startService(call);
        else call.reject("Microphone permission is required for wake-word listening.");
    }

    private void startService(PluginCall call) {
        try {
            Intent service = new Intent(getContext(), LunaWakeWordService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(service);
            else getContext().startService(service);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to start Luna voice service: " + error.getMessage(), error);
        }
    }

    @PluginMethod public void stopWakeWord(PluginCall call) {
        Intent service = new Intent(getContext(), LunaWakeWordService.class);
        getContext().stopService(service);
        call.resolve();
    }

    @PluginMethod public void speakText(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("There is no text to speak.");
            return;
        }
        if (!ttsReady || textToSpeech == null) {
            call.reject("Android text-to-speech is not ready.");
            return;
        }
        try {
            String utteranceId = "luna-" + System.currentTimeMillis();
            textToSpeech.speak(text.substring(0, Math.min(text.length(), 3500)),
                TextToSpeech.QUEUE_FLUSH, null, utteranceId);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to speak this reply: " + error.getMessage(), error);
        }
    }

    @PluginMethod public void stopSpeech(PluginCall call) {
        try {
            if (textToSpeech != null) textToSpeech.stop();
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to stop speech: " + error.getMessage(), error);
        }
    }

    @Override protected void handleOnDestroy() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
            receiver = null;
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
            ttsReady = false;
        }
        super.handleOnDestroy();
    }
}