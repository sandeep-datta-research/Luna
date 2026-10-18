package com.luna.aihub;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Opt-in foreground microphone service for the "Hey Luna" phrase.
 * Android's system speech recognizer is used; this is not an offline,
 * low-power keyword model and may depend on the installed speech service/network.
 */
public class LunaWakeWordService extends Service {
    public static final String ACTION_WAKE_WORD = "com.luna.aihub.WAKE_WORD";
    public static final String ACTION_STATUS = "com.luna.aihub.WAKE_STATUS";
    public static final String EXTRA_STATUS = "status";
    private static final String CHANNEL_ID = "luna_wake_word";
    private static final int NOTIFICATION_ID = 7301;
    private static final String TAG = "LunaWakeWord";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean running = false;
    private boolean recognitionActive = false;

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if ("STOP".equals(action)) {
            stopListening();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            broadcastStatus("Speech recognition is unavailable on this device.");
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            running = true;
            startForeground(NOTIFICATION_ID, buildNotification());
            createRecognizer();
            startRecognition();
            broadcastStatus("Wake-word listening is on. Say Hey Luna.");
        }
        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Luna voice wake word", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Visible notification while Luna listens for the wake phrase.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = openIntent == null ? null : PendingIntent.getActivity(
            this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT |
            (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        builder.setContentTitle("Luna voice assistant")
            .setContentText("Listening for “Hey Luna” · tap to open")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE);
        if (pendingIntent != null) builder.setContentIntent(pendingIntent);
        return builder.build();
    }

    private void createRecognizer() {
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception ignored) {}
        }
        recognizer = SpeechRecognizer.createSpeechRecognizer(getApplicationContext());
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(android.os.Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() { recognitionActive = false; }
            @Override public void onError(int error) {
                recognitionActive = false;
                if (running) handler.postDelayed(() -> startRecognition(), error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? 1200 : 650);
            }
            @Override public void onResults(android.os.Bundle results) {
                recognitionActive = false;
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null) {
                    for (String match : matches) {
                        String normalized = match == null ? "" : match.toLowerCase(Locale.ROOT)
                            .replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
                        if (normalized.contains("hey luna") || normalized.contains("hey loona") ||
                            normalized.equals("luna") || normalized.startsWith("hey luna ")) {
                            Intent wake = new Intent(ACTION_WAKE_WORD);
                            wake.setPackage(getPackageName());
                            wake.putExtra("transcript", match);
                            sendBroadcast(wake);
                            break;
                        }
                    }
                }
                if (running) handler.postDelayed(() -> startRecognition(), 350);
            }
            @Override public void onPartialResults(android.os.Bundle partialResults) {}
            @Override public void onEvent(int eventType, android.os.Bundle params) {}
        });
    }

    private void startRecognition() {
        if (!running || recognitionActive || recognizer == null) return;
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 4);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            recognitionActive = true;
            recognizer.startListening(intent);
        } catch (Exception error) {
            recognitionActive = false;
            Log.w(TAG, "Could not start speech recognition", error);
            if (running) handler.postDelayed(() -> startRecognition(), 1500);
        }
    }

    private void broadcastStatus(String status) {
        Intent event = new Intent(ACTION_STATUS);
        event.setPackage(getPackageName());
        event.putExtra(EXTRA_STATUS, status);
        sendBroadcast(event);
    }

    private void stopListening() {
        running = false;
        recognitionActive = false;
        handler.removeCallbacksAndMessages(null);
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception ignored) {}
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
        broadcastStatus("Wake-word listening is off.");
    }

    @Override public void onDestroy() {
        stopListening();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}