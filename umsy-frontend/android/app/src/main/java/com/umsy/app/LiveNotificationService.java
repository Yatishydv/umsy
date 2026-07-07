package com.umsy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LiveNotificationService extends Service {
    private static final String CHANNEL_ID = "LiveNotificationChannel";
    private static final int NOTIFICATION_ID = 101;
    private NotificationManager notificationManager;
    private Handler handler;
    private Runnable runnable;
    private String lastAlertedClassKey = "";

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification("Fetching class data..."));
        startTimer();
        return START_STICKY;
    }

    private void startTimer() {
        if (handler == null) {
            handler = new Handler(Looper.getMainLooper());
        }
        if (runnable == null) {
            runnable = new Runnable() {
                @Override
                public void run() {
                    updateNotificationText();
                    handler.postDelayed(this, 60000); // update every 1 minute
                }
            };
            handler.post(runnable);
        }
    }

    private void updateNotificationText() {
        String text = getTimetableText();
        Notification notification = buildNotification(text);
        notificationManager.notify(NOTIFICATION_ID, notification);
    }

    private String getTimetableText() {
        try {
            // Capacitor stores preferences in a file named "CapacitorStorage"
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            String timetableStr = prefs.getString("timetable_data", null);

            if (timetableStr == null) {
                return "No classes scheduled or timetable not synced.";
            }

            // Parse JSON structure saved by the frontend (Map of days -> array of classes)
            JSONObject fullTimetable = new JSONObject(timetableStr);
            
            // Get current day string (e.g. "Monday")
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
            String[] days = new String[]{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
            String todayStr = days[dayOfWeek - 1];

            JSONArray schedule = fullTimetable.optJSONArray(todayStr);
            if (schedule == null || schedule.length() == 0) {
                return "No classes scheduled for today.";
            }

            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = timeFormat.format(new Date());

            String currentClass = null;
            String nextClass = null;
            int minutesLeft = -1;
            
            int currentMinutes = parseTimeToMinutes(currentTime);

            for (int i = 0; i < schedule.length(); i++) {
                JSONObject cls = schedule.getJSONObject(i);
                String timeRange = cls.optString("time", "");
                String className = cls.optString("courseCode", "Class");
                String room = cls.optString("room", "");
                String roomSuffix = room.isEmpty() ? "" : " (Rm: " + room + ")";
                
                if (timeRange.contains("-")) {
                    String[] parts = timeRange.split("-");
                    String startTimeStr = parts[0].trim();
                    String endTimeStr = parts[1].trim();

                    int startMins = parseTimeToMinutes(startTimeStr);
                    int endMins = parseTimeToMinutes(endTimeStr);

                    if (currentMinutes >= startMins && currentMinutes < endMins) {
                        currentClass = className + roomSuffix;
                        minutesLeft = endMins - currentMinutes;
                    } else if (currentMinutes < startMins) {
                        if (nextClass == null) {
                            nextClass = className + roomSuffix + " at " + startTimeStr;
                        }
                        // Check if this next class starts in 5 minutes
                        int timeDiff = startMins - currentMinutes;
                        if (timeDiff > 0 && timeDiff <= 5) {
                            String alertKey = className + "_" + startTimeStr;
                            if (!alertKey.equals(lastAlertedClassKey)) {
                                lastAlertedClassKey = alertKey;
                                triggerNextClassAlert(className, room, startTimeStr, timeDiff);
                            }
                        }
                    }
                }
            }

            if (currentClass != null) {
                String text = "Ongoing: " + currentClass + " (" + minutesLeft + "m left)";
                if (nextClass != null) {
                    text += " | Next: " + nextClass;
                }
                return text;
            } else if (nextClass != null) {
                return "Next: " + nextClass;
            } else {
                return "No more classes today.";
            }

        } catch (Exception e) {
            Log.e("LiveNotification", "Error parsing timetable", e);
            return "Failed to parse timetable data.";
        }
    }

    private void triggerNextClassAlert(String courseCode, String room, String startTime, int minutes) {
        String channelId = "NextClassAlertChannel";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Next Class Alert Channel",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts you 5 minutes before your next class starts");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 250, 500});
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
        
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_IMMUTABLE);
        
        String roomText = room.isEmpty() ? "" : " in Room " + room;
        String content = "Your next class " + courseCode + " starts in " + minutes + " minutes" + roomText + " at " + startTime + "!";
        
        Notification alert = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Next Class Starting Soon!")
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();
                
        if (nm != null) {
            nm.notify(102, alert);
        }
    }
    
    private int parseTimeToMinutes(String timeStr) {
        try {
            String[] parts = timeStr.split(":");
            return Integer.parseInt(parts[0].trim()) * 60 + Integer.parseInt(parts[1].trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private Notification buildNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this,
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("UMSY Class Status")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_today)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Class Notification Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Shows current class status");
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not binding
    }
}
