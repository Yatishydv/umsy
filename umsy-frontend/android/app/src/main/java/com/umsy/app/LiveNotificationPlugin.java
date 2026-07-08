package com.umsy.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.content.SharedPreferences;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(
    name = "LiveNotification",
    permissions = {
        @Permission(
            strings = { android.Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
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

    @PluginMethod
    public void getVersionCode(PluginCall call) {
        try {
            int versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = (int) getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).getLongVersionCode();
            } else {
                versionCode = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionCode;
            }
            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get version code: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null) {
            call.reject("URL is required");
            return;
        }

        // Run the download in a background thread
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(urlString);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.connect();

                    if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                        call.reject("Server returned HTTP " + connection.getResponseCode());
                        return;
                    }

                    int fileLength = connection.getContentLength();
                    File apkFile = new File(getContext().getCacheDir(), "update.apk");
                    
                    // Delete old APK if exists
                    if (apkFile.exists()) {
                        apkFile.delete();
                    }

                    InputStream input = connection.getInputStream();
                    FileOutputStream output = new FileOutputStream(apkFile);

                    byte[] data = new byte[4096];
                    long total = 0;
                    int count;
                    int lastProgress = 0;

                    while ((count = input.read(data)) != -1) {
                        total += count;
                        // Publish progress
                        if (fileLength > 0) {
                            int progress = (int) (total * 100 / fileLength);
                            if (progress > lastProgress) {
                                lastProgress = progress;
                                JSObject progressObj = new JSObject();
                                progressObj.put("progress", progress);
                                notifyListeners("downloadProgress", progressObj);
                            }
                        }
                        output.write(data, 0, count);
                    }

                    output.flush();
                    output.close();
                    input.close();

                    // Download complete, launch package installer
                    Uri apkUri = FileProvider.getUriForFile(
                        getContext(), 
                        getContext().getPackageName() + ".fileprovider", 
                        apkFile
                    );

                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getContext().startActivity(intent);

                    JSObject result = new JSObject();
                    result.put("completed", true);
                    call.resolve(result);

                } catch (Exception e) {
                    call.reject("Download failed: " + e.getMessage());
                }
            }
        }).start();
    }
}
