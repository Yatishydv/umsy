package com.umsy.app;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.content.SharedPreferences;

@CapacitorPlugin(name = "LiveNotification")
public class LiveNotificationPlugin extends Plugin {

    @PluginMethod
    public void saveTimetable(PluginCall call) {
        try {
            String data = call.getString("data");
            if (data != null) {
                SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", android.content.Context.MODE_PRIVATE);
                prefs.edit().putString("timetable_data", data).apply();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to save timetable: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), LiveNotificationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), LiveNotificationService.class);
            getContext().stopService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop service: " + e.getMessage());
        }
    }
}
