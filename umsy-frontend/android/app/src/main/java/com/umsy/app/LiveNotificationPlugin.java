package com.umsy.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.content.SharedPreferences;
import android.app.PendingIntent;
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

    @PluginMethod
    public void triggerWelcomeNotification(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", android.content.Context.MODE_PRIVATE);
            String infoStr = prefs.getString("umsy_student_info", null);
            String firstName = "";
            double cgpa = 8.0;
            if (infoStr != null) {
                try {
                    org.json.JSONObject info = new org.json.JSONObject(infoStr);
                    String fullName = info.optString("Name", "");
                    if (!fullName.isEmpty()) {
                        firstName = fullName.split(" ")[0];
                    }
                    cgpa = info.optDouble("CGPA", 8.0);
                } catch (Exception e) {}
            }

            final String finalName = firstName.isEmpty() ? "Legend" : firstName;
            final double finalCgpa = cgpa;

            // Fetch dynamic welcome roast asynchronously
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String fallback = "Hey " + finalName + "! Welcome to UMSY. Ready to check your " + finalCgpa + " CGPA?";
                    try {
                        URL url = new URL("https://umsy-backend.onrender.com/api/generate-roast");
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json; utf-8");
                        conn.setRequestProperty("Accept", "application/json");
                        conn.setDoOutput(true);
                        conn.setConnectTimeout(4000);
                        conn.setReadTimeout(4000);

                        org.json.JSONObject jsonParam = new org.json.JSONObject();
                        jsonParam.put("name", finalName);
                        jsonParam.put("cgpa", finalCgpa);
                        jsonParam.put("timeOfDay", "welcome");

                        try (java.io.OutputStream os = conn.getOutputStream()) {
                            byte[] input = jsonParam.toString().getBytes("utf-8");
                            os.write(input, 0, input.length);
                        }

                        int code = conn.getResponseCode();
                        if (code == 200) {
                            try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), "utf-8"))) {
                                StringBuilder response = new StringBuilder();
                                String responseLine = null;
                                while ((responseLine = br.readLine()) != null) {
                                    response.append(responseLine.trim());
                                }
                                org.json.JSONObject res = new org.json.JSONObject(response.toString());
                                if (res.optBoolean("success", false)) {
                                    String roast = res.optString("roast", "");
                                    if (!roast.isEmpty()) {
                                        showSystemNotification("UMsy Welcome", roast);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        android.util.Log.e("LiveNotification", "Failed to fetch AI welcome", e);
                    }
                    showSystemNotification("UMsy Welcome", fallback);
                }
            }).start();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    private void showSystemNotification(String title, String content) {
        android.app.NotificationManager nm = (android.app.NotificationManager) getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        String channelId = "WelcomeChannel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    channelId,
                    "Welcome Alerts",
                    android.app.NotificationManager.IMPORTANCE_DEFAULT
            );
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }

        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(getContext(), 10, intent, PendingIntent.FLAG_IMMUTABLE);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), channelId)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(content))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(android.graphics.Color.parseColor("#BEF227"))
                .setContentIntent(pi)
                .setAutoCancel(true);

        if (nm != null) {
            nm.notify(105, builder.build());
        }
    }
}
