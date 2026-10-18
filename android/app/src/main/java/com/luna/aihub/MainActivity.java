package com.luna.aihub;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LunaVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}