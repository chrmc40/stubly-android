package com.stubly.app;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Rect;
import android.view.OrientationEventListener;
import android.view.Surface;
import android.view.View;
import android.view.WindowInsets;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    private OrientationEventListener orientationListener;
    private int lastRotation = -1;

    @Override
    public void load() {
        super.load();
        // Set up orientation listener for all rotation changes (90 ↔ 270, etc)
        orientationListener = new OrientationEventListener(getContext()) {
            @Override
            public void onOrientationChanged(int orientation) {
                int rotation = getActivity().getWindowManager().getDefaultDisplay().getRotation();
                if (rotation != lastRotation) {
                    lastRotation = rotation;
                    notifyListeners("configurationChanged", null);
                }
            }
        };

        if (orientationListener.canDetectOrientation()) {
            orientationListener.enable();
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (orientationListener != null) {
            orientationListener.disable();
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getHeights(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            View decorView = getActivity().getWindow().getDecorView();

            JSObject result = new JSObject();

            // Get rotation/orientation
            int rotation = getActivity().getWindowManager().getDefaultDisplay().getRotation();
            int orientation = 0;
            switch (rotation) {
                case Surface.ROTATION_0:
                    orientation = 0;
                    break;
                case Surface.ROTATION_90:
                    orientation = 90;
                    break;
                case Surface.ROTATION_180:
                    orientation = 180;
                    break;
                case Surface.ROTATION_270:
                    orientation = 270;
                    break;
            }
            result.put("orientation", orientation);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                WindowInsets insets = decorView.getRootWindowInsets();
                if (insets != null) {
                    android.graphics.Insets systemBars = insets.getInsets(WindowInsets.Type.systemBars());
                    android.graphics.Insets navBars = insets.getInsets(WindowInsets.Type.navigationBars());

                    // Return all insets
                    result.put("statusBar", systemBars.top);
                    result.put("navigationBar", navBars.bottom);
                    result.put("navBarLeft", navBars.left);
                    result.put("navBarRight", navBars.right);

                    // Determine which side nav bar is on
                    String navBarSide = "bottom";
                    if (navBars.left > 0) {
                        navBarSide = "left";
                    } else if (navBars.right > 0) {
                        navBarSide = "right";
                    } else if (navBars.bottom > 0) {
                        navBarSide = "bottom";
                    }
                    result.put("navBarSide", navBarSide);

                    // Get display cutout information
                    android.view.DisplayCutout cutout = insets.getDisplayCutout();
                    if (cutout != null) {
                        result.put("notch", true);
                        result.put("notchTop", cutout.getSafeInsetTop());
                        result.put("notchBottom", cutout.getSafeInsetBottom());
                        result.put("notchLeft", cutout.getSafeInsetLeft());
                        result.put("notchRight", cutout.getSafeInsetRight());
                    } else {
                        result.put("notch", false);
                        result.put("notchTop", 0);
                        result.put("notchBottom", 0);
                        result.put("notchLeft", 0);
                        result.put("notchRight", 0);
                    }
                } else {
                    result.put("statusBar", 0);
                    result.put("navigationBar", 0);
                    result.put("navBarLeft", 0);
                    result.put("navBarRight", 0);
                    result.put("navBarSide", "bottom");
                    result.put("notch", false);
                    result.put("notchTop", 0);
                    result.put("notchBottom", 0);
                    result.put("notchLeft", 0);
                    result.put("notchRight", 0);
                }
            } else {
                // Fallback for older Android versions
                Rect rect = new Rect();
                decorView.getWindowVisibleDisplayFrame(rect);
                int statusBarHeight = rect.top;

                int resourceId = getContext().getResources().getIdentifier("status_bar_height", "dimen", "android");
                if (resourceId > 0) {
                    statusBarHeight = getContext().getResources().getDimensionPixelSize(resourceId);
                }

                // For older versions, calculate actual visible nav bar
                int navigationBarHeight = 0;
                int screenHeight = decorView.getHeight();
                int contentHeight = rect.bottom;
                navigationBarHeight = screenHeight - contentHeight;

                result.put("statusBar", statusBarHeight);
                result.put("navigationBar", navigationBarHeight);
                result.put("navBarLeft", 0);
                result.put("navBarRight", 0);
                result.put("navBarSide", "bottom");
                result.put("notch", false);
                result.put("notchTop", 0);
                result.put("notchBottom", 0);
                result.put("notchLeft", 0);
                result.put("notchRight", 0);
            }

            call.resolve(result);
        });
    }
}
