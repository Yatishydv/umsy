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
import android.graphics.Color;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Random;

public class LiveNotificationService extends Service {
    private static final String CHANNEL_ID = "LiveNotificationChannel";
    private static final String ALERT_CHANNEL_ID = "SarcasticAlertChannel";
    private static final int NOTIFICATION_ID = 101;
    private static final int ALERT_NOTIFICATION_ID = 102;
    private NotificationManager notificationManager;
    private Handler handler;
    private Runnable runnable;
    private String lastAlertedClassKey = "";

    // ── Sarcastic and funny quote pools ──────────────────────────────────────
    private static final String[] MORNING_QUOTES = {
        "Rise and shine... or don't. UMS doesn't care about your sleep cycle anyway.",
        "It's 4 AM. Even the university servers are asleep, but here you are, awake.",
        "Time to wake up and start preparing your excuses for missing 9 AM lectures.",
        "Good morning! Remember, every hour you sleep is an hour you aren't thinking of your CGPA.",
        "Another day, another opportunity to pretend you understand what the professor is saying.",
        "Wake up! The world needs people who can handle UMS login errors."
    };

    private static final String[] CLASS_TIME_ROASTS = {
        "Your professor is talking. Your brain cells are packing their bags and leaving.",
        "UMSY Tip: nod every 5 seconds to trick the teacher into thinking you are listening.",
        "Are you learning or just collecting attendance percentage like Pokémon cards?",
        "Don't worry if you don't understand the lecture. No one else does either.",
        "Drink some water. Dehydration will make this boring lecture feel even longer.",
        "Drinking water reminder: your body is 70% water, but your brain in this class is 100% blank."
    };

    private static final String[] AFTER_CLASS_ROASTS = {
        "Classes are finally over! Time to lie down and ignore all your assignments.",
        "Homework is just another word for 'doing the professor's job at home'. Go ignore it.",
        "Drinking water: the only thing you've successfully passed today.",
        "Have you checked your attendance? Go look, it might need some emergency prayers."
    };

    private static final String[] LOW_CGPA_ROASTS = {
        "Your CGPA is currently trying to find a shovel to dig itself deeper.",
        "Studies show that studying actually helps your CGPA. Shocking, right?",
        "With that CGPA, you might want to start practicing saying: 'Would you like fries with that?'"
    };

    private static final String[] BACKLOGS_ROASTS = {
        "Backlogs count is rising. Are you collecting them as souvenirs?",
        "Remember: backlogs are like toxic exes. They will keep showing up until you deal with them."
    };

    private static final String[] GOODNIGHT_QUOTES = {
        "Goodnight. May your dreams be less messy than the UMS grading system.",
        "Go to sleep. Tomorrow is another day of disappointing your academic advisor.",
        "Sleep well. The backlogs will wait for you tomorrow.",
        "Goodnight! Don't let the horror of tomorrow's 9 AM class keep you awake."
    };

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannels();
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
                    checkSarcasticAlerts();
                    handler.postDelayed(this, 60000); // Check every 1 minute
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
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            String timetableStr = prefs.getString("timetable_data", null);

            if (timetableStr == null) {
                return "No classes scheduled or timetable not synced.";
            }

            JSONObject fullTimetable = new JSONObject(timetableStr);
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
            String[] days = new String[]{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
            String todayStr = days[dayOfWeek - 1];

            JSONArray schedule = fullTimetable.optJSONArray(todayStr);
            if (schedule == null || schedule.length() == 0) {
                return "🏖️ Holiday! No classes scheduled for today.";
            }

            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            String currentTime = timeFormat.format(new Date());
            int currentMinutes = parseTimeToMinutes(currentTime);

            int firstClassStartMins = Integer.MAX_VALUE;
            int lastClassEndMins = Integer.MIN_VALUE;
            for (int i = 0; i < schedule.length(); i++) {
                JSONObject cls = schedule.getJSONObject(i);
                String timeRange = cls.optString("time", "");
                if (timeRange.contains("-")) {
                    String[] parts = timeRange.split("-");
                    int startMins = parseTimeToMinutes(parts[0].trim());
                    int endMins = parseTimeToMinutes(parts[1].trim());
                    if (startMins < firstClassStartMins) firstClassStartMins = startMins;
                    if (endMins > lastClassEndMins) lastClassEndMins = endMins;
                }
            }

            // Class status visibility enforcer: only show stats starting from 1 hour before first class
            // up to 1 hour after the last class ends. Outside this phase, display day completed/holiday status.
            if (currentMinutes < (firstClassStartMins - 60) || currentMinutes > (lastClassEndMins + 60)) {
                if (currentMinutes > (lastClassEndMins + 60)) {
                    return "🎉 Day Completed! Classes silent notifications closed.";
                } else {
                    return "⏳ Classes starting later today.";
                }
            }

            String currentClass = null;
            String nextClass = null;
            int minutesLeft = -1;

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
                        // Check if next class starts in 5 minutes
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
                String text = "🟢 Ongoing: " + currentClass + " (" + minutesLeft + "m left)";
                if (nextClass != null) {
                    text += " | ⏭️ Next: " + nextClass;
                }
                return text;
            } else if (nextClass != null) {
                if (currentMinutes >= firstClassStartMins) {
                    return "🍽️ Break! Grab lunch & drink water! 💧 | ⏭️ Next: " + nextClass;
                } else {
                    return "⏳ Next: " + nextClass;
                }
            } else {
                return "🎉 Day Completed! No more classes today.";
            }

        } catch (Exception e) {
            Log.e("LiveNotification", "Error parsing timetable", e);
            return "Failed to parse timetable data.";
        }
    }

    private void checkSarcasticAlerts() {
        try {
            SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            
            // Get current time details
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            int currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY);
            int currentMinutes = currentHour * 60 + calendar.get(java.util.Calendar.MINUTE);
            String todayDateStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());

            // ── Phase 1: Goodnight Alert (Exactly at 9 PM / 21:00) ─────────────────
            if (currentHour == 21 && currentMinutes >= 1260 && currentMinutes < 1275) {
                String lastGoodnight = prefs.getString("last_goodnight_date", "");
                if (!lastGoodnight.equals(todayDateStr)) {
                    prefs.edit().putString("last_goodnight_date", todayDateStr).apply();
                    triggerSarcasticAlert("Goodnight! 😴", getRandomQuote(GOODNIGHT_QUOTES));
                }
                return; // Stop checking further alerts for this tick
            }

            // Fetch timetable to calculate class hours
            String timetableStr = prefs.getString("timetable_data", null);
            int firstClassStartMins = 540; // Default 9 AM
            int lastClassEndMins = 1020;  // Default 5 PM
            boolean hasClasses = false;

            if (timetableStr != null) {
                JSONObject fullTimetable = new JSONObject(timetableStr);
                int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
                String[] days = new String[]{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
                String todayStr = days[dayOfWeek - 1];

                JSONArray schedule = fullTimetable.optJSONArray(todayStr);
                if (schedule != null && schedule.length() > 0) {
                    hasClasses = true;
                    int calculatedFirst = Integer.MAX_VALUE;
                    int calculatedLast = Integer.MIN_VALUE;
                    for (int i = 0; i < schedule.length(); i++) {
                        JSONObject cls = schedule.getJSONObject(i);
                        String timeRange = cls.optString("time", "");
                        if (timeRange.contains("-")) {
                            String[] parts = timeRange.split("-");
                            int startMins = parseTimeToMinutes(parts[0].trim());
                            int endMins = parseTimeToMinutes(parts[1].trim());
                            if (startMins < calculatedFirst) calculatedFirst = startMins;
                            if (endMins > calculatedLast) calculatedLast = endMins;
                        }
                    }
                    if (calculatedFirst != Integer.MAX_VALUE) firstClassStartMins = calculatedFirst;
                    if (calculatedLast != Integer.MIN_VALUE) lastClassEndMins = calculatedLast;
                }
            }

            // Enforce minimum gap of 20 minutes between consecutive notification alerts
            long lastAlertTime = prefs.getLong("last_sarcastic_alert_time", 0);
            long nowMs = System.currentTimeMillis();
            if (nowMs - lastAlertTime < 20 * 60 * 1000) {
                return; // Enforce minimum interval
            }

            // Roll random probability (5% chance of triggering notification during this tick)
            if (Math.random() > 0.05) {
                return;
            }

            // ── Phase 2: Morning Alerts (4:00 AM to 1 hour before first class) ──
            if (currentMinutes >= 240 && currentMinutes < (firstClassStartMins - 60)) {
                triggerSarcasticAlert("Wakey Wakey! ☕", getRandomQuote(MORNING_QUOTES));
                prefs.edit().putLong("last_sarcastic_alert_time", nowMs).apply();
            }
            // ── Phase 3: Class Time Roasts (Within class phase hours) ─────────────────
            else if (hasClasses && currentMinutes >= (firstClassStartMins - 60) && currentMinutes <= (lastClassEndMins + 60)) {
                triggerSarcasticAlert("Class Roaster 🔥", getRandomQuote(CLASS_TIME_ROASTS));
                prefs.edit().putLong("last_sarcastic_alert_time", nowMs).apply();
            }
            // ── Phase 4: After-Class Alerts (1 hour after classes end up to 8:00 PM) ──
            else if (currentMinutes > (lastClassEndMins + 60) && currentMinutes < 1200) {
                // Personalize roasts based on CGPA and backlogs
                ArrayList<String> candidateQuotes = new ArrayList<>();
                for (String q : AFTER_CLASS_ROASTS) candidateQuotes.add(q);

                try {
                    String infoStr = prefs.getString("umsy_student_info", null);
                    if (infoStr != null) {
                        JSONObject info = new JSONObject(infoStr);
                        double cgpa = info.optDouble("CGPA", 10.0);
                        if (cgpa < 7.5) {
                            for (String q : LOW_CGPA_ROASTS) candidateQuotes.add(q);
                        }
                    }

                    String resultStr = prefs.getString("umsy_result_data", null);
                    if (resultStr != null) {
                        JSONObject res = new JSONObject(resultStr);
                        int backlogs = 0;
                        JSONArray semesters = res.optJSONArray("semesters");
                        if (semesters != null) {
                            for (int s = 0; s < semesters.length(); s++) {
                                JSONArray subjects = semesters.getJSONObject(s).optJSONArray("subjects");
                                if (subjects != null) {
                                    for (int sb = 0; sb < subjects.length(); sb++) {
                                        String grade = subjects.getJSONObject(sb).optString("grade", "").trim().toUpperCase();
                                        if (grade.equals("E") || grade.equals("F") || grade.equals("G") || grade.equals("I")) {
                                            backlogs++;
                                        }
                                    }
                                }
                            }
                        }
                        if (backlogs > 0) {
                            for (String q : BACKLOGS_ROASTS) candidateQuotes.add(q);
                        }
                    }
                } catch (Exception parseEx) {
                    Log.w("LiveNotification", "Failed to personalize roasts", parseEx);
                }

                String finalQuote = candidateQuotes.get(new Random().nextInt(candidateQuotes.size()));
                triggerSarcasticAlert("Evening Roast 💀", finalQuote);
                prefs.edit().putLong("last_sarcastic_alert_time", nowMs).apply();
            }

        } catch (Exception e) {
            Log.e("LiveNotification", "Error checking sarcastic alerts", e);
        }
    }

    private String getRandomQuote(String[] quotes) {
        return quotes[new Random().nextInt(quotes.length)];
    }

    private void triggerSarcasticAlert(String title, String content) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Sarcastic Notification Alerts",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Delivers funny and sarcastic roasts and reminders");
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }

        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 2, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification alert = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(Color.parseColor("#BEF227"))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build();

        if (nm != null) {
            nm.notify(ALERT_NOTIFICATION_ID, alert);
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
        
        String roomText = room.isEmpty() ? "" : " | 📍 Room " + room;
        String content = "🎓 Course: " + courseCode + roomText + "\n⏳ Starts in " + minutes + " minutes (at " + startTime + ")";
        
        Notification alert = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("🚨 Next Class Starting Soon!")
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(Color.parseColor("#BEF227"))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();
                
        if (nm != null) {
            nm.notify(103, alert);
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

        String title = "⏰ UMSY Live Status";
        if (text.contains("Holiday")) {
            title = "🏖️ Day Off - UMSY";
        } else if (text.contains("Completed")) {
            title = "🎉 Day Completed - UMSY";
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setSmallIcon(android.R.drawable.ic_menu_today)
                .setColor(Color.parseColor("#BEF227"))
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .build();
    }

    private void createNotificationChannels() {
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
        return null;
    }
}
