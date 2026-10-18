package com.luna.aihub;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "LunaVoice", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class LunaVoicePlugin extends Plugin {
    private BroadcastReceiver receiver;

    @Override public void load() {
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

    @Override protected void handleOnDestroy() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
            receiver = null;
        }
        super.handleOnDestroy();
    }
}