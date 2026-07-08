import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Download, BookOpen, MapPin, Users, Award, AlertCircle, Bell, BellOff } from 'lucide-react';
import { getTimeTable } from '../services/api';
import { generateTimetablePDF } from '../utils/generateTimetablePDF';
import { Capacitor } from '@capacitor/core';

const TimetableSkeleton = () => (
    <div className="space-y-6 animate-pulse p-4">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            </div>
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
        <div className="h-12 w-full bg-gray-250 dark:bg-gray-800 rounded-2xl md:hidden"></div>
        <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-white dark:bg-gray-800/40 rounded-3xl border border-gray-150 dark:border-gray-800/80 p-4 flex gap-4">
                    <div className="w-20 h-full bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const TimeTable = () => {
    const navigate = useNavigate();
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [liveNotificationActive, setLiveNotificationActive] = useState(() => {
        return localStorage.getItem('live_notification_active') === 'true';
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const getCurrentDay = () => {
        const dayIndex = new Date().getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dayIndex];
    };

    const [selectedDay, setSelectedDay] = useState('Monday');

    // Sync selected day to today once data is loaded
    useEffect(() => {
        const today = getCurrentDay();
        if (days.includes(today)) {
            setSelectedDay(today);
        }
    }, [timetable]);

    // Handle PDF download
    const handleDownloadPDF = () => {
        try {
            setDownloadLoading(true);
            const studentInfo = localStorage.getItem('umsy_student_info');
            let studentName = 'Student';

            if (studentInfo) {
                try {
                    const parsed = JSON.parse(studentInfo);
                    studentName = parsed.StudentName || 'Student';
                } catch (e) {
                    console.error('Error parsing student info:', e);
                }
            }

            generateTimetablePDF(timetable, studentName);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloadLoading(false);
        }
    };

    const toggleLiveNotification = async () => {
        try {
            if (!Capacitor.isNativePlatform()) {
                alert('Live Notification is only available on the Android app.');
                return;
            }

            // Check and request notification permissions
            if (Capacitor.Plugins.LiveNotification) {
                const perm = await Capacitor.Plugins.LiveNotification.checkPermissions();
                if (perm.notifications !== 'granted') {
                    const req = await Capacitor.Plugins.LiveNotification.requestPermissions();
                    if (req.notifications !== 'granted') {
                        alert('Notification permissions are required for the live timetable widget.');
                        return;
                    }
                }
            }
            
            const newState = !liveNotificationActive;
            setLiveNotificationActive(newState);
            localStorage.setItem('live_notification_active', newState.toString());
            
            if (newState) {
                // Ensure data is in Preferences before starting
                await Capacitor.Plugins.LiveNotification.saveTimetable({
                    data: JSON.stringify(timetable)
                });
                await Capacitor.Plugins.LiveNotification.startService();
            } else {
                await Capacitor.Plugins.LiveNotification.stopService();
            }
        } catch (e) {
            console.error('Failed to toggle live notification', e);
            const revertedState = !liveNotificationActive;
            setLiveNotificationActive(revertedState);
            localStorage.setItem('live_notification_active', revertedState.toString());
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const cachedTimetable = localStorage.getItem('umsy_timetable_data');
            if (cachedTimetable) {
                try {
                    const parsed = JSON.parse(cachedTimetable);
                    setTimetable(parsed);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error('Error parsing cached timetable data:', e);
                    localStorage.removeItem('umsy_timetable_data');
                }
            }

            const cookies = localStorage.getItem('umsy_cookies');
            if (!cookies) {
                setLoading(false);
                setTimetable({});
                return;
            }

            try {
                setLoading(true);
                const result = await getTimeTable(cookies);
                setTimetable(result.data);
                localStorage.setItem('umsy_timetable_data', JSON.stringify(result.data));
                setError('');
            } catch (err) {
                setError(err.message);
                if (err.message.includes('session') || err.message.includes('unauthorized')) {
                    localStorage.removeItem('umsy_cookies');
                    window.dispatchEvent(new CustomEvent('trigger-resync'));
                }
            } finally {
                setLoading(false);
                // Also update native preferences
                if (Object.keys(timetable).length > 0 || localStorage.getItem('umsy_timetable_data')) {
                    const dataToSave = Object.keys(timetable).length > 0 ? timetable : JSON.parse(localStorage.getItem('umsy_timetable_data') || '{}');
                    try {
                        if (Capacitor.isNativePlatform() && Capacitor.Plugins.LiveNotification) {
                            await Capacitor.Plugins.LiveNotification.saveTimetable({
                                data: JSON.stringify(dataToSave)
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to save to capacitor preferences', e);
                    }
                }
            }
        };

        fetchData();
    }, [navigate]);

    const getTimeSlots = () => {
        const slots = new Set();
        Object.values(timetable).forEach(dayClasses => {
            dayClasses.forEach(cls => {
                if (cls.time) slots.add(cls.time);
            });
        });
        return Array.from(slots).sort();
    };

    const getClassForSlot = (day, timeSlot) => {
        if (!timetable[day]) return null;
        return timetable[day].find(cls => cls.time === timeSlot);
    };

    const isCurrentTimeSlot = (timeSlot) => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [start, end] = timeSlot.split('-').map(t => {
            const [hours, minutes] = t.split(':').map(Number);
            return hours * 60 + minutes;
        });

        return currentTime >= start && currentTime < end;
    };

    const isCurrentClass = (day, timeSlot) => {
        const currentDay = getCurrentDay();
        return day === currentDay && isCurrentTimeSlot(timeSlot);
    };

    const timeSlots = getTimeSlots();

    if (loading) {
        return <TimetableSkeleton />;
    }

    const hasData = Object.keys(timetable).length > 0 && timeSlots.length > 0;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Time Table</h1>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Your weekly academic schedule</p>
                </div>

                {hasData && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloadLoading}
                            className="flex items-center justify-center w-10 h-10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700/80 rounded-xl transition-all active:scale-95 shadow-sm"
                            title="Download PDF Timetable"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>

            {!hasData ? (
                <div className="max-w-md mx-auto py-16 text-center px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 mb-6">
                        <Calendar className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight">No Timetable Synced</h3>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-sm leading-relaxed mb-6">
                        Your academic timetable will automatically sync next time you log in or refresh your student session.
                    </p>
                </div>
            ) : (
                <>
                    {/* MOBILE TIMELINE VIEW */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {/* Day Selector Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 select-none snap-x">
                            {days.map(day => {
                                const isSelected = selectedDay === day;
                                const isToday = getCurrentDay() === day;
                                const classesCount = timetable[day]?.length || 0;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 snap-center flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-[#bef227] text-[#1c312e] shadow-sm'
                                                : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/40 dark:border-zinc-700/50'
                                        }`}
                                    >
                                        <span>{day.substring(0, 3)}</span>
                                        {classesCount > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                                                isSelected ? 'bg-[#1c312e]/10 text-[#1c312e]' : 'bg-slate-100 dark:bg-zinc-700 text-slate-650 dark:text-zinc-300'
                                            }`}>
                                                {classesCount}
                                            </span>
                                        )}
                                        {isToday && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Classes Timeline list */}
                        <div className="space-y-3">
                            {!timetable[selectedDay] || timetable[selectedDay].length === 0 ? (
                                <div className="bg-white dark:bg-zinc-850 rounded-3xl p-8 text-center border border-slate-150/40 dark:border-zinc-800/85">
                                    <p className="text-sm font-semibold text-slate-400 dark:text-zinc-500">No classes scheduled for {selectedDay} 🎉</p>
                                </div>
                            ) : (
                                timetable[selectedDay]
                                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                    .map((cls, idx) => {
                                        const isCurrent = isCurrentTimeSlot(cls.time);
                                        return (
                                            <div
                                                key={idx}
                                                className={`bg-white dark:bg-zinc-850 rounded-3xl p-5 border transition-all duration-350 ${
                                                    isCurrent
                                                        ? 'border-emerald-500 dark:border-emerald-500 bg-gradient-to-br from-emerald-50/30 to-green-50/10 dark:from-emerald-950/10'
                                                        : 'border-slate-100 dark:border-zinc-800/80'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                            isCurrent
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                                                        }`}>
                                                            {cls.type || 'Lecture'}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-zinc-400">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{cls.time}</span>
                                                    </div>
                                                </div>

                                                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-2 leading-tight">
                                                    {cls.courseCode}
                                                </h3>

                                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 dark:text-zinc-500 font-semibold pt-2 border-t border-slate-50 dark:border-zinc-800">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>R: {cls.room || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>S: {cls.section || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>G: {cls.group || 'All'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>

                    {/* DESKTOP GRID VIEW */}
                    <div className="hidden lg:flex flex-col gap-4">
                        <div className="bg-white dark:bg-zinc-850 rounded-[28px] border border-slate-200/50 dark:border-zinc-800/80 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-200/60 dark:border-zinc-800/80">
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 w-44">
                                                Time
                                            </th>
                                            {days.map(day => (
                                                <th key={day} className="px-4 py-4 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 text-center">
                                                    {day.substring(0, 3)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/65">
                                        {timeSlots.map((timeSlot) => (
                                            <tr key={timeSlot} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                                                <td className="px-6 py-5 text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        <span>{timeSlot}</span>
                                                    </div>
                                                </td>
                                                {days.map(day => {
                                                    const classInfo = getClassForSlot(day, timeSlot);
                                                    const isCurrent = classInfo && isCurrentClass(day, timeSlot);

                                                    return (
                                                        <td key={`${day}-${timeSlot}`} className="p-2 border-l border-slate-100/50 dark:border-zinc-800/40">
                                                            {classInfo ? (
                                                                <div className={`rounded-2xl p-3 h-full flex flex-col justify-between border transition-all ${
                                                                    isCurrent
                                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                                                        : 'bg-white dark:bg-zinc-800 border-slate-150/40 dark:border-zinc-700/50 hover:shadow-md'
                                                                }`}>
                                                                    <div className="mb-2">
                                                                        <div className="flex justify-between items-start gap-1">
                                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                                isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-zinc-700 text-slate-650 dark:text-zinc-300'
                                                                            }`}>
                                                                                {classInfo.type || 'L'}
                                                                            </span>
                                                                            {isCurrent && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                                                                        </div>
                                                                        <h4 className="text-xs font-black text-slate-800 dark:text-white tracking-tight mt-1.5 truncate">
                                                                            {classInfo.courseCode}
                                                                        </h4>
                                                                    </div>
                                                                    <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                                                                        <span>Rm: {classInfo.room || 'N/A'}</span>
                                                                        <span>Sec: {classInfo.section || 'N/A'}</span>
                                                                        <span>Grp: {classInfo.group || 'All'}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-slate-350 dark:text-zinc-600 font-black text-sm py-4">
                                                                    -
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Legends desktop */}
                        <div className="bg-white dark:bg-zinc-850 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 p-4 flex items-center justify-center gap-6 text-xs text-slate-400 dark:text-zinc-500 font-bold shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded bg-emerald-500/15 border border-emerald-500/30" />
                                <span>Active Ongoing Class</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700" />
                                <span>Scheduled Class</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TimeTable;
