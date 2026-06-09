import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Info, Bell, Shield, GraduationCap, CheckCircle, AlertCircle, Menu, RefreshCw, ChevronRight, BookOpen, FileText, Award, Calendar, ClipboardList, IdCard, Ticket, Trophy, Send, X, Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import MessagesCard from './MessagesCard';
import SeatingPlanCardCompact from './SeatingPlanCardCompact';
import MobileNotificationsSheet from './MobileNotificationsSheet';
import { Building2,Bed,Table } from 'lucide-react';
import { getStudentInfo, getStudentDashboardV04, getSeatingPlan, getTimeTable, getRanking, getPendingAssignments, getLeaveSlipUrl, getLeaveSlipHtmlFromUrl } from '../services/api';
import { sendNotification } from '../utils/notificationHelper';
import LeaveSlipModal from './LeaveSlipModal';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const [seatingPlan, setSeatingPlan] = useState(null);
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hideCGPA, setHideCGPA] = useState(false);
    const [hideProfile, setHideProfile] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [ranking, setRanking] = useState(null);
    const [notifToast, setNotifToast] = useState('');
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [showAssignments, setShowAssignments] = useState(false);
    const [showSeatingPlan, setShowSeatingPlan] = useState(false);
    const [showLeaveSlip, setShowLeaveSlip] = useState(false);
    const [leaveSlipUrl, setLeaveSlipUrl] = useState('');
    const [leaveSlipData, setLeaveSlipData] = useState(null);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    const handleTestNotification = async () => {
        const title = 'UMz Test Notification';
        const body = 'This is a real-time test notification from your device! 🚀';

        // 🔥 Android App Bridge
        if (window.Android && window.Android.triggerNotification) {
            window.Android.triggerNotification(title, body);
            
            // 🧪 Mock a class reminder for testing (15 mins from now)
            if (window.Android.scheduleReminders) {
                const now = new Date();
                const future = new Date(now.getTime() + 15 * 60000); 
                const timeStr = `${future.getHours().toString().padStart(2, '0')}:${future.getMinutes().toString().padStart(2, '0')}-00:00`;
                const day = now.toLocaleDateString('en-US', { weekday: 'long' });
                
                const mockTimetable = {
                    [day]: [{
                        type: "TEST CLASS",
                        courseCode: "DEBUG101",
                        room: "Lab-1",
                        time: timeStr
                    }]
                };
                window.Android.scheduleReminders(JSON.stringify(mockTimetable));
                setNotifToast('Immediate test sent & Mock class synced! (Wait 1m)');
            } else {
                setNotifToast('Android notification triggered!');
            }
            
            setTimeout(() => setNotifToast(''), 3000);
            return;
        }

        // 🌐 Web Browser Fallback
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications');
            return;
        }

        try {
            let permission = Notification.permission;
            if (permission !== 'granted') {
                permission = await Notification.requestPermission();
            }

            if (permission === 'granted') {
                new Notification(title, {
                    body: body,
                    tag: 'test-notification'
                });
                setNotifToast('Test notification sent!');
                setTimeout(() => setNotifToast(''), 3000);
            } else {
                alert('Notification permission denied');
            }
        } catch (err) {
            console.error('Notification error:', err);
        }
    };

    // automated Class Reminders Logic
    useEffect(() => {
        if (!timetable || Object.keys(timetable).length === 0) return;

        const checkReminders = () => {
            const now = new Date();
            const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
            const dayClasses = timetable[currentDay] || [];
            
            if (dayClasses.length === 0) return;

            dayClasses.forEach(cls => {
                if (!cls.time) return;

                // Parse class start time (e.g., "09:00-10:00")
                const startTimeStr = cls.time.split('-')[0];
                const [hours, minutes] = startTimeStr.split(':').map(Number);
                
                const classTime = new Date(now);
                classTime.setHours(hours, minutes, 0, 0);

                const diffMs = classTime - now;
                const diffMins = Math.floor(diffMs / 60000);

                // Reminder points: 30 min and 15 min
                if (diffMins === 30 || diffMins === 15) {
                    const reminderId = `reminder-${cls.courseCode || cls.type}-${startTimeStr}-${diffMins}`;
                    const alreadySent = localStorage.getItem(reminderId);

                    if (!alreadySent) {
                        const title = `Class Reminder (${diffMins}m)`;
                        const body = `${cls.type || 'Class'}: ${cls.courseCode || ''}\nRoom: ${cls.room || 'N/A'}\nTime: ${cls.time}`;
                        
                        sendNotification(title, body);
                        localStorage.setItem(reminderId, 'sent');
                        
                        // Clean up: In a real app, you'd clean up old keys periodically
                    }
                }
            });
        };

        // Check every minute
        const interval = setInterval(checkReminders, 60000);
        checkReminders(); // Initial check

        return () => clearInterval(interval);
    }, [timetable]);

    const handleHostelLeave = async () => {
        try {
            const cookies = localStorage.getItem('umz_cookies');
            const auth = cookies ? cookies : { regno: localStorage.getItem('umz_regno') };

            // 🚀 FAST PATH: Try fetching with cached URL first
            const cached = localStorage.getItem('umz_leave_slip');
            if (cached) {
                try {
                    const { url, timestamp, data } = JSON.parse(cached);
                    const isFresh = (Date.now() - timestamp) < 12 * 60 * 60 * 1000;
                    
                    if (isFresh) {
                        setNotifToast('Generating leave slip...');
                        const directRes = await getLeaveSlipHtmlFromUrl(url, auth);
                        if (directRes.success && directRes.data) {
                            setLeaveSlipUrl(url);
                            setLeaveSlipData(directRes.data);
                            setShowLeaveSlip(true);
                            
                            localStorage.setItem('umz_leave_slip', JSON.stringify({ url, data: directRes.data, timestamp: Date.now() }));
                            setNotifToast('Slip generated');
                            setTimeout(() => setNotifToast(''), 2000);
                            return;
                        }
                    }
                } catch (e) { console.warn('Cache fetch failed:', e); }
            }

            // setNotifToast('Generating secure link...');
            const result = await getLeaveSlipUrl(auth);
            if (result.success && result.url) {
                setLeaveSlipUrl(result.url);
                setLeaveSlipData(result.data || null);
                setShowLeaveSlip(true);
                
                localStorage.setItem('umz_leave_slip', JSON.stringify({
                    url: result.url,
                    data: result.data,
                    timestamp: Date.now()
                }));
                
                // setNotifToast('Leave slip loaded');
            } else {
                setNotifToast('Failed to generate slip');
            }
            // setTimeout(() => setNotifToast(''), 3000);
        } catch (err) {
            console.error('Leave slip error:', err);
            setNotifToast('Error: ' + err.message);
            setTimeout(() => setNotifToast(''), 3000);
        }
    };

    // Sync timetable with Android for background reminders
    useEffect(() => {
        if (timetable && Object.keys(timetable).length > 0 && window.Android && window.Android.scheduleReminders) {
            console.log('🤖 Syncing timetable with Android for background alerts...');
            window.Android.scheduleReminders(JSON.stringify(timetable));
        }
    }, [timetable]);

    // Load privacy settings from localStorage
    useEffect(() => {
        const loadPrivacySettings = () => {
            const savedHideCGPA = localStorage.getItem('umz_hide_cgpa') === 'true';
            const savedHideProfile = localStorage.getItem('umz_hide_profile') === 'true';
            setHideCGPA(savedHideCGPA);
            setHideProfile(savedHideProfile);
        };

        loadPrivacySettings();

        // Listen for privacy settings changes
        window.addEventListener('privacy-settings-changed', loadPrivacySettings);

        return () => {
            window.removeEventListener('privacy-settings-changed', loadPrivacySettings);
        };
    }, []);

    useEffect(() => {
        const fetchRanking = async (regno) => {
            const cached = localStorage.getItem('umz_ranking_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.regno === regno) {
                        setRanking(parsed.data);
                        return;
                    }
                } catch { localStorage.removeItem('umz_ranking_data'); }
            }

            try {
                const res = await getRanking(regno);
                if (res.success) {
                    setRanking(res.data);
                    localStorage.setItem('umz_ranking_data', JSON.stringify({ regno, data: res.data }));
                }
            } catch (e) {
                console.error('Ranking fetch failed:', e);
            }
        };

        const fetchData = async () => {
            // First, always check for cached data
            const cachedInfo = localStorage.getItem('umz_student_info');
            const currentRegno = localStorage.getItem('umz_regno');

            if (cachedInfo) {
                try {
                    const parsed = JSON.parse(cachedInfo);
                    
                    // Verify the cache belongs to the currently logged-in regno
                    if (currentRegno && parsed.Registrationnumber && parsed.Registrationnumber !== currentRegno) {
                        console.warn('⚠️ Cached data belongs to a different student, ignoring.');
                        localStorage.removeItem('umz_student_info');
                    } else {
                        console.log('📦 Using cached student info');
                        setStudentInfo(parsed);
                        setLoading(false);

                        if (parsed.Registrationnumber) fetchRanking(parsed.Registrationnumber);

                        // Still fetch seating plan even with cached student info
                        const cookies = localStorage.getItem('umz_cookies');
                        const auth = cookies ? cookies : { regno: currentRegno };
                        fetchSeatingPlanData(auth);

                        return; // Use cache, don't fetch student info again
                    }
                } catch (e) {
                    console.error('Error parsing cached student info:', e);
                    localStorage.removeItem('umz_student_info');
                }
            }

            // No cache available - check if we have cookies or a saved session
            const cookies = localStorage.getItem('umz_cookies');
            const regno = localStorage.getItem('umz_regno');
            const isV04 = localStorage.getItem('umz_is_v04') === 'true';

            if (!cookies && !regno) {
                // No session found - show empty state
                console.log('⚠️ No session found in localStorage');
                setLoading(false);
                setError('');
                setStudentInfo(null);
                return;
            }

            const auth = cookies ? cookies : { regno };

            // We have cookies but no cache - fetch fresh data
            try {
                setLoading(true);
                console.log('🌐 Fetching fresh student info from API using:', cookies ? 'cookies' : 'regno');
                const result = isV04
                    ? await getStudentDashboardV04(auth)
                    : await getStudentInfo(auth);
                console.log('📨 Messages in response:', result.data?.Messages);
                
                const infoData = result.data || {};
                if (isV04 && !infoData.Messages) {
                    infoData.Messages = [];
                }
                
                setStudentInfo(infoData);
                if (infoData.Registrationnumber) fetchRanking(infoData.Registrationnumber);

                // Store student info in localStorage for caching
                localStorage.setItem('umz_student_info', JSON.stringify(infoData));

                // Fetch seating plan
                fetchSeatingPlanData(auth);

                setError('');
            } catch (err) {
                setError(err.message);
                if (err.message.includes('session') || err.message.includes('unauthorized')) {
                    // Session expired - remove cookies but keep trying to show cached data
                    localStorage.removeItem('umz_cookies');
                }
            } finally {
                setLoading(false);
            }
        };

        // Helper function to fetch seating plan
        const fetchSeatingPlanData = async (auth) => {
            try {
                console.log('🪑 Fetching seating plan...');
                const seatingPlanResult = await getSeatingPlan(auth);
                console.log('📋 Seating Plan Response:', seatingPlanResult);
                console.log('📋 Seating Plan Data:', seatingPlanResult.data);
                setSeatingPlan(seatingPlanResult.data);
            } catch (seatingError) {
                console.warn('⚠️ Could not fetch seating plan:', seatingError.message);
                console.error('Full seating error:', seatingError);
                // Don't fail the entire dashboard if seating plan fails
                setSeatingPlan([]);
            }
        };

        fetchData();

        // Load timetable — cache first, then API
        const loadTimetable = async () => {
            const cached = localStorage.getItem('umz_timetable_data');
            if (cached) {
                try { setTimetable(JSON.parse(cached)); return; } catch (e) { }
            }
            // No cache — try fetching fresh
            const cookies = localStorage.getItem('umz_cookies');
            const regno = localStorage.getItem('umz_regno');
            
            if (!cookies && !regno) return;
            
            const auth = cookies ? cookies : { regno };

            try {
                setTimetableLoading(true);
                const result = await getTimeTable(auth);
                setTimetable(result.data);
                localStorage.setItem('umz_timetable_data', JSON.stringify(result.data));
            } catch (e) {
                console.warn('⚠️ Could not load timetable:', e.message);
            } finally {
                setTimetableLoading(false);
            }
        };
        loadTimetable();

        // Load Pending Assignments
        const loadAssignments = async () => {
            const cookies = localStorage.getItem('umz_cookies');
            const regno = localStorage.getItem('umz_regno');
            if (!cookies && !regno) return;
            const auth = cookies ? cookies : { regno };

            try {
                setAssignmentsLoading(true);
                const result = await getPendingAssignments(auth);
                setPendingAssignments(result.data || []);
            } catch (e) {
                console.warn('⚠️ Could not load assignments:', e.message);
            } finally {
                setAssignmentsLoading(false);
            }
        };
        loadAssignments();
    }, [navigate]);

    const dayName = ['Sun','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    const todayClasses = (timetable[dayName] || []).sort((a, b) => a.time.localeCompare(b.time));

    const getCGPAData = () => {
        if (!studentInfo?.CGPA) return [];
        const cgpa = parseFloat(studentInfo.CGPA);
        const maxCGPA = 10;
        return [
            { name: 'Achieved', value: cgpa },
            { name: 'Remaining', value: Math.max(0, maxCGPA - cgpa) }
        ];
    };

    const getAttendanceData = () => {
        if (!studentInfo?.AggAttendance) return [];
        const attendance = parseFloat(studentInfo.AggAttendance);
        return [
            { name: 'Present', value: attendance },
            { name: 'Absent', value: Math.max(0, 100 - attendance) }
        ];
    };

    const backlogCount = React.useMemo(() => {
        try {
            const cached = localStorage.getItem('umz_result_data');
            if (!cached) return 0;
            const parsed = JSON.parse(cached);
            let count = 0;
            const backlogGrades = new Set(['E', 'F', 'G', 'I']);

            
            if (parsed.semesters) {
                parsed.semesters.forEach(sem => {
                    (sem.subjects || []).forEach(sub => {
                        if (sub.grade && backlogGrades.has(sub.grade.trim().toUpperCase())) count++;
                    });
                });
            }
            return count;
        } catch { return 0; }
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-gray-900 dark:border-white border-r-transparent"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show empty/resync state when no data and no cookies
    if (!loading && !studentInfo && !error) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Please click <strong>Resync Data</strong> in Settings to load your information.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error</h3>
                            <p className="text-gray-600 dark:text-gray-300">{error}</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
            <Sidebar />

            {/* ── MOBILE LAYOUT ──────────────────────────────────── */}
            <div className="lg:hidden flex flex-col w-full overflow-hidden">

                {/* Mobile Top Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                    <div className="w-8" />
                    <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
                    <div className="flex items-center gap-1">
                        <button
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90"
                            onClick={() => window.dispatchEvent(new CustomEvent('trigger-resync'))}
                            title="Resync Data"
                        >
                            <RefreshCw className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        </button>
                        <button
                            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90"
                            onClick={() => setIsNotifOpen(true)}
                        >
                            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                            {(studentInfo?.Messages?.length > 0) && (
                                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[10px] h-3 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                                    {studentInfo.Messages.length > 9 ? '9+' : studentInfo.Messages.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Scrollable Body */}
                <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-5 pt-5 bg-gray-50 dark:bg-gray-900">

                    {/* Welcome */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{getGreeting()},</p>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                                {studentInfo?.StudentName || 'Student'} 👋
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Here's your academic overview</p>
                        </div>
                        {studentInfo?.StudentPicture && (
                            <img
                                src={`data:image/png;base64,${studentInfo.StudentPicture}`}
                                alt="Profile"
                                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-700 flex-shrink-0"
                            />
                        )}
                    </div>

                    {/* Password Notice - Ultra Minimal */}
                    {studentInfo?.PasswordExpiry && (
                        <div className="flex items-center gap-3 px-4 py-4 opacity-80 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                            <div className="flex-shrink-0">
                                <Shield className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
                                <span className="font-bold text-gray-600 dark:text-gray-300">Password Expiry: </span> {studentInfo.PasswordExpiry}
                            </p>
                        </div>
                    )}

                    {/* Overview Stats 2×2 Grid */}
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Overview</p>
                        <div className="grid grid-cols-2 gap-3">
                            {studentInfo?.CGPA && (
                                <button onClick={() => navigate('/cgpa')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition-transform shadow-sm relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                            <GraduationCap className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <Info className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">CGPA</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                                        {studentInfo.CGPA}<span className="text-xs font-medium text-gray-400"> /10</span>
                                    </p>
                                </button>
                            )}
                             {studentInfo?.AggAttendance && (
                                <button onClick={() => navigate('/attendance')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition-transform shadow-sm relative group">
                                    <div className="flex items-start justify-between">
                                        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        </div>
                                        <Info className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-green-500 transition-colors" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wide mb-1">Attendance</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{studentInfo.AggAttendance}%</p>
                                </button>
                            )}
                            <button onClick={() => navigate('/backlogs')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition-transform shadow-sm">
                                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-3">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                </div>
                                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">Re/Backlogs</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{backlogCount}</p>
                            </button>
                            <button
                                onClick={() => navigate('/ranking')}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-left active:scale-95 transition-transform shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute -right-2 -bottom-2 opacity-[0.05] dark:opacity-[0.1] pointer-events-none">
                                    <Trophy className="h-16 w-16" />
                                </div>
                                <div className="flex w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 items-center justify-center mb-3">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <span className='text-gray-300 text-sm absolute right-3'>/{ranking?.TotalStudents || '—'}</span>
                                </div>
                                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">Rank</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                    <span className='text-gray-400 text-sm'>#</span>{ranking?.Rank || '—'}
                                </p>
                                {ranking?.Percentage && (
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1.5">
                                        Top {Math.round(parseFloat(ranking.Percentage))}%
                                    </p>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Today's Classes — always rendered */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Today's Classes</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{dayName}</p>
                            </div>
                            <button
                                onClick={() => navigate('/time-table')}
                                className="text-xs font-semibold text-blue-500 dark:text-blue-400 active:opacity-70"
                            >
                                View all
                            </button>
                        </div>

                        {timetableLoading ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 3 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}>
                                        <div className="w-12 flex-shrink-0 space-y-1.5">
                                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-8 animate-pulse" />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                                        </div>
                                        <div className="w-14 h-6 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : todayClasses.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-8 flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                                    {['Saturday', 'Sunday'].includes(dayName) ? 'No classes on weekends 🎉' : 'No classes scheduled today'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 pt-5 pb-2 max-h-[460px] overflow-y-auto no-scrollbar">
                                <div className="relative">

                                    {/* Continuous vertical rail */}
                                    <div className="absolute left-[52px] top-3 bottom-8 w-px bg-gray-100 dark:bg-gray-700" />

                                    {todayClasses.map((cls, idx) => {
                                        const parts = cls.time.split('-');
                                        const [sH, sM] = parts[0].split(':').map(Number);
                                        const [eH, eM] = parts[1] ? parts[1].split(':').map(Number) : [sH + 1, sM];
                                        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                                        const startMins = sH * 60 + sM;
                                        const endMins = eH * 60 + eM;
                                        const diff = startMins - nowMins;

                                        const isOngoing = nowMins >= startMins && nowMins < endMins;
                                        const isDone = nowMins >= endMins;
                                        const isNext = !isOngoing && !isDone && diff > 0 && diff <= 30;

                                        const fmt = (h, m) => {
                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                            const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                                            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                                        };

                                        return (
                                            <div key={idx} className="relative flex items-start gap-0 mb-5 last:mb-2">

                                                {/* Time column */}
                                                <div className="w-[52px] flex-shrink-0 pt-1 pr-3 text-right">
                                                    <p className={`text-[11px] font-bold leading-tight ${isOngoing ? 'text-blue-500 dark:text-blue-400' : isDone ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {fmt(sH, sM).replace(' ', '\n').split('\n')[0]}
                                                    </p>
                                                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${isOngoing ? 'text-blue-400 dark:text-blue-500' : isDone ? 'text-gray-200 dark:text-gray-700' : 'text-gray-300 dark:text-gray-600'}`}>
                                                        {fmt(sH, sM).split(' ')[1]}
                                                    </p>
                                                </div>

                                                {/* Node */}
                                                <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 16, marginTop: 4 }}>
                                                    {isOngoing ? (
                                                        <div className="relative w-4 h-4 flex items-center justify-center">
                                                            <div className="absolute -ml-3 inset-0 rounded-full bg-blue-500/20 animate-ping" />
                                                            <div className="w-3.5 h-3.5 -ml-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 z-10" />
                                                        </div>
                                                    ) : isDone ? (
                                                        <div className="w-3 h-3 -ml-4 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                                            <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-3.5 h-3.5 -ml-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600" />
                                                    )}
                                                </div>

                                                {/* Card */}
                                                <div className={`flex-1 min-w-0 ml-3 rounded-2xl px-3.5 py-3 border transition-all duration-300 ${isOngoing
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                                                        : isDone
                                                            ? 'bg-gray-50/60 dark:bg-gray-900/10 border-gray-100 dark:border-gray-800'
                                                            : 'bg-gray-50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800'
                                                    }`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className={`text-[13px] font-bold leading-snug ${isOngoing ? 'text-blue-700 dark:text-blue-300' :
                                                                isDone ? 'text-gray-400 dark:text-gray-500' :
                                                                    'text-gray-800 dark:text-gray-100'
                                                            }`}>
                                                            {cls.type}
                                                        </h4>

                                                        {/* Badge */}
                                                        {isOngoing && (
                                                            <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-blue-500 text-white">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
                                                                Live
                                                            </span>
                                                        )}
                                                        {isNext && (
                                                            <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                                                                In {diff}m
                                                            </span>
                                                        )}
                                                        {isDone && (
                                                            <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                                                                Done
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {cls.room && (
                                                            <span className={`text-[10px] font-semibold flex items-center gap-1 ${isDone ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                Room {cls.room}
                                                            </span>
                                                        )}
                                                        {cls.room && (cls.group || cls.section) && (
                                                            <span className="text-gray-200 dark:text-gray-700 text-[10px]">·</span>
                                                        )}
                                                        {cls.group && (
                                                            <span className={`text-[10px] font-semibold ${isDone ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                {cls.group}
                                                            </span>
                                                        )}
                                                        {cls.section && (
                                                            <>
                                                                <span className="text-gray-200 dark:text-gray-700 text-[10px]">·</span>
                                                                <span className={`text-[10px] font-semibold ${isDone ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                    Sec {cls.section}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-semibold ${isDone ? 'text-gray-300 dark:text-gray-600' : isOngoing ? 'text-blue-400 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {fmt(sH, sM)} – {fmt(eH, eM)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Access Section - Mobile Only */}
                    <div className="pb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Quick Access</h3>
                            {/* <button className="text-xs font-semibold text-blue-500 dark:text-blue-400">View all</button> */}
                        </div>
                        
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { name: 'Courses', icon: BookOpen, path: '/courses' },
                                // { name: 'Attendance', icon: CheckCircle, path: '/attendance' },
                                { name: 'Marks', icon: FileText, path: '/marks' },
                                // { name: 'CGPA', icon: Award, path: '/cgpa' },
                                { 
                                    name: 'Pending Assignment', 
                                    icon: ClipboardList, 
                                    action: () => setShowAssignments(true),
                                    badge: pendingAssignments.length > 0 ? pendingAssignments.length : null
                                },
                                // { name: 'Notices', icon: Bell, badge: 2 },
                                { name: 'Mutual Shift', icon: Building2, path:'/mutual-shift' },
                                { name: 'Leave Slip', icon: Bed, action: handleHostelLeave },
                                { name: 'Teacher on Leave', icon: Ticket },
                                { name: 'Seating Plan', icon: Table, action: () => setShowSeatingPlan(true) },
                                { name: 'Test Notif', icon: Send, action: handleTestNotification, isTest: true },
                                // { name: 'Coming Soon', icon: Ticket },
                            ].map((item, i) => (
                                <button 
                                    key={i}
                                    onClick={() => {
                                        if (item.action) item.action();
                                        else if (item.path) navigate(item.path);
                                    }}
                                    className={`bg-white dark:bg-gray-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 border shadow-sm active:scale-95 transition-all relative ${item.isTest ? 'border-indigo-100 dark:border-indigo-900/30' : 'border-gray-100 dark:border-gray-700/50'}`}
                                >
                                    {item.badge && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                                            {item.badge}
                                        </span>
                                    )}
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        <item.icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 text-center leading-tight">
                                        {item.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            {/* ── END MOBILE LAYOUT ─────────────────────────────── */}

            <main className="hidden lg:flex flex-1 overflow-y-auto p-6 lg:p-10">

                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Welcome Header with Password Expiry */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                Welcome back, {studentInfo?.StudentName?.split(' ')[0] || 'Student'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400">Here's your academic overview</p>
                        </div>

                        {/* Password Expiry Warning - Minimal & Subtle */}
                        {studentInfo?.PasswordExpiry && (
                            // <div className="bg-yellow-50/80 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg px-3 py-2 max-w-xs">
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                    {studentInfo.PasswordExpiry}
                                </p>
                            </div>
                            // </div>
                        )}

                        <div className="flex items-center gap-3">
                            {/* Desktop header remains minimal as Quick Access is now in the main grid */}
                        </div>
                    </div>

                    {/* Profile Information - Moved to Top */}
                    {studentInfo && (
                        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${hideProfile ? 'relative' : ''}`}>
                            <div className={`p-8 ${hideProfile ? 'blur-md select-none pointer-events-none' : ''}`}>
                                <div className="flex items-start gap-8">
                                    {studentInfo.StudentPicture && (
                                        <img
                                            src={`data:image/png;base64,${studentInfo.StudentPicture}`}
                                            alt="Student"
                                            className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-100"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{studentInfo.StudentName}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {studentInfo.Registrationnumber && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Registration Number</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.Registrationnumber}</p>
                                                </div>
                                            )}
                                            {studentInfo.RollNumber && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Roll Number</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.RollNumber}</p>
                                                </div>
                                            )}
                                            {studentInfo.Program && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Program</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.Program}</p>
                                                </div>
                                            )}
                                            {studentInfo.Section && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.Section}</p>
                                                </div>
                                            )}
                                            {studentInfo.StudentEmail && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.StudentEmail}</p>
                                                </div>
                                            )}
                                            {studentInfo.StudentMobile && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mobile</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.StudentMobile}</p>
                                                </div>
                                            )}
                                            {studentInfo.DateofBirth && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date of Birth</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.DateofBirth}</p>
                                                </div>
                                            )}
                                            {studentInfo.Gender && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.Gender}</p>
                                                </div>
                                            )}
                                            {studentInfo.BatchYear && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Batch</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.BatchYear}</p>
                                                </div>
                                            )}
                                            {studentInfo.PendingFee !== undefined && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pending Fee</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{studentInfo.PendingFee}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Charts Row - CGPA, Attendance, and Seating Plan */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* CGPA Chart */}
                        {studentInfo?.CGPA && (
                            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 border border-gray-100 dark:border-gray-700 ${hideCGPA ? 'relative' : ''}`}>
                                <div className={hideCGPA ? 'blur-md select-none pointer-events-none' : ''}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CGPA Distribution</h3>
                                        <button
                                            onClick={() => navigate('/cgpa')}
                                            className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            title="View detailed CGPA analysis"
                                        >
                                            <Info className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="relative">
                                            <ResponsiveContainer width={200} height={200}>
                                                <PieChart>
                                                    <Pie
                                                        data={getCGPAData()}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={0}
                                                        cornerRadius={40}
                                                        dataKey="value"
                                                        isAnimationActive={true}
                                                    >
                                                        <Cell fill="#111827" />
                                                        <Cell fill="#F3F4F6" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{studentInfo.CGPA}</p>
                                                    <p className="text-xs text-gray-400">/ 10</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attendance Chart */}
                        {studentInfo?.AggAttendance && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Overview</h3>
                                    <button
                                        onClick={() => navigate('/attendance')}
                                        className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="View detailed attendance"
                                    >
                                        <Info className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <ResponsiveContainer width={200} height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={getAttendanceData()}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={0}
                                                    cornerRadius={40}
                                                    dataKey="value"
                                                    isAnimationActive={true}
                                                >
                                                    <Cell fill="#10B981" />
                                                    <Cell fill="#F3F4F6" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{studentInfo.AggAttendance}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Desktop Quick Access Grid */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 border border-gray-100 dark:border-gray-700 flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Access</h3>
                            <div className="grid grid-cols-2 gap-4 flex-1">
                                {[
                                    { 
                                        name: 'Assignments', 
                                        icon: ClipboardList, 
                                        action: () => setShowAssignments(true),
                                        badge: pendingAssignments.length > 0 ? pendingAssignments.length : null
                                    },
                                    { 
                                        name: 'Seating Plan', 
                                        icon: Table, 
                                        action: () => setShowSeatingPlan(true) 
                                    },
                                    { 
                                        name: 'AI Buddy', 
                                        icon: Bot, 
                                        action: () => {} 
                                    },
                                    { 
                                        name: 'Hostel Shift', 
                                        icon: Building2, 
                                        action: () => navigate('/mutual-shift') 
                                    },
                                ].map((item, i) => (
                                    <button 
                                        key={i}
                                        onClick={item.action}
                                        className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-all active:scale-95 group relative"
                                    >
                                        {item.badge && (
                                            <span className="absolute top-3 right-3 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-sm">
                                                {item.badge}
                                            </span>
                                        )}
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <item.icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Messages Card */}
                    {studentInfo && (
                        <MessagesCard messages={studentInfo.Messages || []} />
                    )}




                    {/* Parent Information Section - Moved to Separate Card */}
                    {
                        studentInfo && (studentInfo.FatherName || studentInfo.MotherName) && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Parent Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Father */}
                                    {studentInfo.FatherName && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Father</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.FatherName}</p>
                                                </div>
                                                {studentInfo.FatherMobile && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Mobile</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.FatherMobile}</p>
                                                    </div>
                                                )}
                                                {studentInfo.FatherEmail && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.FatherEmail}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mother */}
                                    {studentInfo.MotherName && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mother</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.MotherName}</p>
                                                </div>
                                                {studentInfo.MotherMobile && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Mobile</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.MotherMobile}</p>
                                                    </div>
                                                )}
                                                {studentInfo.MotherEmail && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentInfo.MotherEmail}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div >
            </main >

            <MobileNotificationsSheet
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                messages={studentInfo?.Messages || []}
            />

            {/* Notification Toast */}
            {notifToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-2xl shadow-xl shadow-indigo-600/20 animate-in slide-in-from-bottom-full duration-300">
                    {notifToast}
                </div>
            )}

            {/* Assignments Modal */}
            <AssignmentsModal 
                isOpen={showAssignments} 
                onClose={() => setShowAssignments(false)}
                assignments={pendingAssignments}
                loading={assignmentsLoading}
            />
            {/* Seating Plan Modal */}
            <SeatingModal 
                isOpen={showSeatingPlan} 
                onClose={() => setShowSeatingPlan(false)}
                seatingPlan={seatingPlan}
            />
            <LeaveSlipModal
                isOpen={showLeaveSlip}
                onClose={() => setShowLeaveSlip(false)}
                data={leaveSlipData}
                profileImage={studentInfo?.profilePic}
                onRefresh={handleHostelLeave}
            />
        </div >
    );
};

const SeatingModal = ({ isOpen, onClose, seatingPlan }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-400">
                {/* Handle for mobile */}
                <div className="h-1 w-10 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mt-4 sm:hidden" />
                
                <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Seating Plan</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Your examination details</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-4 pb-10 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {!seatingPlan || seatingPlan.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <Table className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">No Exams Found</h4>
                            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">We couldn't find any upcoming seating plans for your account.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {seatingPlan.map((exam, idx) => (
                                <div key={idx} className="p-5 rounded-[24px] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                                                <Calendar className="h-5 w-5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{exam.Date}</p>
                                                <h4 className="text-[15px] font-bold text-gray-900 dark:text-white leading-none mt-0.5">{exam.CourseCode}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Room</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{exam.Room}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Seat Number</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{exam.SeatNo}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Time</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{exam.Time}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Duty ID</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{exam.DutyID || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AssignmentsModal = ({ isOpen, onClose, assignments, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-400">
                {/* Handle for mobile */}
                <div className="h-1 w-10 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mt-4 sm:hidden" />
                
                <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Assignments</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{assignments.length} tasks pending</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-4 pb-8 max-h-[65vh] overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                            <p className="text-[13px] font-medium text-gray-400">Updating from portal...</p>
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="h-10 w-10 text-emerald-500/80" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">You're All Set</h4>
                            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">No pending assignments found. Take some time to relax!</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {assignments.map((asgn, idx) => (
                                <a 
                                    key={idx}
                                    href={asgn.uploadLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <ClipboardList className="h-5 w-5 text-blue-500/80" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">{asgn.courseCode}</span>
                                            <span className="text-gray-300 dark:text-gray-800 text-[10px]">·</span>
                                            <span className="text-[10px] font-medium text-rose-500/80 dark:text-rose-400/80">Due {asgn.lastDate}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                                            {asgn.description}
                                        </p>
                                    </div>
                                    
                                    <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-700" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

