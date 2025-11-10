package com.stubly.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(StorageManagerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
