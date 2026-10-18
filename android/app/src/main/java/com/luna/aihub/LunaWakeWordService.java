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
 * User-opted-in foreground microphone service for "Hey Luna".
 * Uses Android's installed speech-recognition service, not an offline keyword model.
 * Start it from the visible app after obtaining microphone permission.
 */
public class LunaWakeWordService extends Service {
    public static final String ACTION_WAKE_WORD = "com.luna.aihub.WAKE_WORD";
    public static final String ACTION_COMMAND = "com.luna.aihub.VOICE_COMMAND";
    public static final String ACTION_STATUS = "com.luna.aihub.WAKE_STATUS";
    public static final String EXTRA_STATUS = "status";
    private static final String CHANNEL_ID = "luna_wake_word";
    private static final int NOTIFICATION_ID = 7301;
    private static final String TAG = "LunaWakeWord";
    private static final long COMMAND_WINDOW_MS = 12000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean running = false;
    private boolean recognitionActive = false;
    private boolean awaitingCommand = false;
    private final Runnable commandTimeout = () -> {
        awaitingCommand = false;
        broadcastStatus("Didn't hear a command. Say Hey Luna again.");
    };

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
                if (running) handler.postDelayed(() -> startRecognition(),
                    error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? 1200 : 650);
            }

            @Override public void onResults(android.os.Bundle results) {
                recognitionActive = false;
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                boolean handled = false;
                if (matches != null) {
                    for (String match : matches) {
                        if (match == null || match.trim().isEmpty()) continue;
                        String normalized = match.toLowerCase(Locale.ROOT);
                        boolean wakePhrase = normalized.contains("hey luna")
                            || normalized.contains("hey loona")
                            || normalized.trim().equals("luna")
                            || normalized.trim().equals("loona");

                        if (wakePhrase) {
                            broadcastWake(match);
                            String inlineCommand = textAfterWakePhrase(match);
                            if (!inlineCommand.isEmpty()) {
                                awaitingCommand = false;
                                handler.removeCallbacks(commandTimeout);
                                broadcastCommand(inlineCommand);
                            } else {
                                awaitingCommand = true;
                                handler.removeCallbacks(commandTimeout);
                                handler.postDelayed(commandTimeout, COMMAND_WINDOW_MS);
                                broadcastStatus("Luna is awake. Say your command now.");
                            }
                            handled = true;
                            break;
                        }
                    }
                    if (!handled && awaitingCommand) {
                        String command = matches.get(0).trim();
                        if (!command.isEmpty()) {
                            awaitingCommand = false;
                            handler.removeCallbacks(commandTimeout);
                            broadcastCommand(command);
                        }
                    }
                }
                if (running) handler.postDelayed(() -> startRecognition(), 350);
            }

            @Override public void onPartialResults(android.os.Bundle partialResults) {}
            @Override public void onEvent(int eventType, android.os.Bundle params) {}
        });
    }

    private String textAfterWakePhrase(String transcript) {
        String lower = transcript.toLowerCase(Locale.ROOT);
        int index = lower.indexOf("hey luna");
        int phraseLength = 8;
        if (index < 0) {
            index = lower.indexOf("hey loona");
            phraseLength = 9;
        }
        if (index < 0) {
            String normalized = lower.trim();
            return (normalized.equals("luna") || normalized.equals("loona")) ? "" : transcript.trim();
        }
        String command = transcript.substring(Math.min(transcript.length(), index + phraseLength)).trim();
        while (!command.isEmpty() && (Character.isWhitespace(command.charAt(0))
            || ",.:;!?-".indexOf(command.charAt(0)) >= 0)) {
            command = command.substring(1).trim();
        }
        return command;
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

    private void broadcastWake(String transcript) {
        Intent event = new Intent(ACTION_WAKE_WORD);
        event.setPackage(getPackageName());
        event.putExtra("transcript", transcript);
        sendBroadcast(event);
    }

    private void broadcastCommand(String transcript) {
        Intent event = new Intent(ACTION_COMMAND);
        event.setPackage(getPackageName());
        event.putExtra("transcript", transcript);
        sendBroadcast(event);
        broadcastStatus("Command received.");
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
        awaitingCommand = false;
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