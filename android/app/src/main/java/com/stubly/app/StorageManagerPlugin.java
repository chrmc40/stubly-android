package com.stubly.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * StorageManager Capacitor Plugin
 *
 * Manages persistent storage paths using SharedPreferences and SAF folder picker.
 */
@CapacitorPlugin(name = "StorageManager")
public class StorageManagerPlugin extends Plugin {

    private static final String PREFS_NAME = "StorageManagerPrefs";
    private static final String KEY_MOUNT_PATH = "mount_path";
    private static final int REQUEST_CODE_OPEN_DIRECTORY = 1001;

    /**
     * Get the currently configured mount path from SharedPreferences
     */
    @PluginMethod
    public void getMountPath(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        String path = prefs.getString(KEY_MOUNT_PATH, null);

        JSObject ret = new JSObject();
        ret.put("path", path);
        call.resolve(ret);
    }

    /**
     * Set the mount path in SharedPreferences
     */
    @PluginMethod
    public void setMountPath(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path is required");
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_MOUNT_PATH, path);
        editor.apply();

        call.resolve();
    }

    /**
     * Clear the stored mount path from SharedPreferences
     */
    @PluginMethod
    public void clearMountPath(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove(KEY_MOUNT_PATH);
        editor.apply();

        call.resolve();
    }

    /**
     * Open Android Storage Access Framework folder picker
     * Handles preset paths (e.g., "downloads") or opens SAF picker for custom location
     */
    @PluginMethod
    public void requestMountPath(PluginCall call) {
        String preset = call.getString("preset");

        // Handle preset paths
        if (preset != null) {
            String presetPath = resolvePresetPath(preset);
            if (presetPath != null) {
                // Store the preset path
                SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(KEY_MOUNT_PATH, presetPath);
                editor.apply();

                // Return the path
                JSObject ret = new JSObject();
                ret.put("path", presetPath);
                call.resolve(ret);
                return;
            }
        }

        // Open SAF folder picker for custom location
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);

        // Set initial location to Downloads if available (Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // You can set an initial URI here if needed
            // For now, we'll let the user start from the default location
        }

        startActivityForResult(call, intent, "handleFolderPickerResult");
    }

    /**
     * Handle the result from the SAF folder picker
     */
    @ActivityCallback
    private void handleFolderPickerResult(PluginCall call, ActivityResult result) {
        android.util.Log.d("StorageManager", "handleFolderPickerResult called");
        if (call == null) {
            android.util.Log.e("StorageManager", "PluginCall is null!");
            return;
        }

        android.util.Log.d("StorageManager", "Result code: " + result.getResultCode());
        if (result.getResultCode() != android.app.Activity.RESULT_OK) {
            call.reject("Folder selection was cancelled");
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            call.reject("No folder was selected");
            return;
        }

        Uri uri = data.getData();
        if (uri == null) {
            call.reject("Failed to get folder URI");
            return;
        }

        // Take persistable URI permissions
        final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
        } catch (SecurityException e) {
            call.reject("Failed to obtain persistent permissions: " + e.getMessage());
            return;
        }

        // Store the URI as a string
        String uriString = uri.toString();
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_MOUNT_PATH, uriString);
        editor.apply();

        // Return the URI string
        JSObject ret = new JSObject();
        ret.put("path", uriString);
        call.resolve(ret);
    }

    /**
     * Resolve preset path keywords to actual Android paths
     */
    private String resolvePresetPath(String preset) {
        switch (preset.toLowerCase()) {
            case "downloads":
                return "/storage/emulated/0/Download";
            case "documents":
                return "/storage/emulated/0/Documents";
            case "pictures":
                return "/storage/emulated/0/Pictures";
            case "movies":
                return "/storage/emulated/0/Movies";
            case "music":
                return "/storage/emulated/0/Music";
            default:
                return null;
        }
    }
}
