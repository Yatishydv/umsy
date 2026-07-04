import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Info, Bell, Shield, GraduationCap, CheckCircle, AlertCircle, Menu, RefreshCw, ChevronRight, BookOpen, FileText, Award, Calendar, ClipboardList, IdCard, Ticket, Trophy, Send, X, Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import MessagesCard from './MessagesCard';
import SeatingPlanCardCompact from './SeatingPlanCardCompact';
import MobileNotificationsSheet from './MobileNotificationsSheet';
import { Building2,Bed,Table } from 'lucide-react';
import { getStudentInfo, getStudentDashboardV04, getSeatingPlan, getTimeTable, getRanking, getPendingAssignments, getLeaveSlipUrl, getLeaveSlipHtmlFromUrl, getResult, getResultV04, getMessagesV04, getAttendanceDetails, getCourses, getMarks, getMarksV04 } from '../services/api';
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
    const [isInitialFetching, setIsInitialFetching] = useState(true);
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
    const [leaveSlipData, setLeaveSlipData] = useState(null);
    const [leaveSlipLoading, setLeaveSlipLoading] = useState(false);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [backlogCount, setBacklogCount] = useState(0);
    const [attendanceData, setAttendanceData] = useState([]);
    const [coursesData, setCoursesData] = useState([]);
    const [marksData, setMarksData] = useState([]);

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

    const handleHostelLeave = async (force = false) => {
        try {
            const cookies = localStorage.getItem('umsy_cookies');
            const auth = cookies ? cookies : { regno: localStorage.getItem('umsy_regno') };

            // Start loading and open modal immediately to remove lag feeling
            setShowLeaveSlip(true);
            setLeaveSlipLoading(true);

            // Check if cached data exists
            const cached = localStorage.getItem('umsy_leave_slip');
            let cachedData = null;
            let isFresh = false;

            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    cachedData = parsed.data;
                    isFresh = (Date.now() - parsed.timestamp) < 12 * 60 * 60 * 1000;
                    
                    if (cachedData) {
                        // Immediately display the cached data to eliminate load lag!
                        setLeaveSlipData(cachedData);
                        
                        // If it's fresh and not a forced refresh, we can stop loading immediately
                        if (isFresh && !force) {
                            setLeaveSlipLoading(false);
                        }
                    }
                } catch (e) {
                    console.warn('Cache parse failed:', e);
                }
            }

            // If we have no cached data, or the cache is expired, or we want a fresh forced fetch
            if (!cachedData || !isFresh || force) {
                // If we already have fresh cached data and not forcing, skip fetch
                if (cachedData && isFresh && !force) {
                    setLeaveSlipLoading(false);
                    return;
                }

                let freshUrl = null;
                let freshData = null;

                // Try reusing the cached URL to directly fetch HTML and bypass main routing (faster)
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed.url) {
                            const directRes = await getLeaveSlipHtmlFromUrl(parsed.url, auth);
                            if (directRes.success && directRes.data) {
                                freshUrl = parsed.url;
                                freshData = directRes.data;
                            }
                        }
                    } catch (e) {
                        console.warn('Failed direct fetch from cached URL, trying full fetch:', e.message);
                    }
                }

                if (!freshData) {
                    // Full fetch (getting new URL and details)
                    const result = await getLeaveSlipUrl(auth);
                    if (result.success && result.url) {
                        freshUrl = result.url;
                        freshData = result.data || null;
                    }
                }

                if (freshData && freshUrl) {
                    setLeaveSlipData(freshData);
                    localStorage.setItem('umsy_leave_slip', JSON.stringify({
                        url: freshUrl,
                        data: freshData,
                        timestamp: Date.now()
                    }));
                } else {
                    if (!cachedData) {
                        // If no cache and failed, close modal
                        setNotifToast('Failed to generate slip');
                        setTimeout(() => setNotifToast(''), 3000);
                        setShowLeaveSlip(false);
                    } else {
                        setNotifToast('Failed to update. Showing offline data.');
                        setTimeout(() => setNotifToast(''), 3000);
                    }
                }
            }
        } catch (err) {
            console.error('Leave slip error:', err);
            setNotifToast('Error: ' + err.message);
            setTimeout(() => setNotifToast(''), 3000);
            if (!localStorage.getItem('umsy_leave_slip')) {
                setShowLeaveSlip(false);
            }
        } finally {
            setLeaveSlipLoading(false);
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
            const savedHideCGPA = localStorage.getItem('umsy_hide_cgpa') === 'true';
            const savedHideProfile = localStorage.getItem('umsy_hide_profile') === 'true';
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
            const cached = localStorage.getItem('umsy_ranking_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.regno === regno) {
                        setRanking(parsed.data);
                        return;
                    }
                } catch { localStorage.removeItem('umsy_ranking_data'); }
            }

            try {
                const res = await getRanking(regno);
                if (res.success) {
                    setRanking(res.data);
                    localStorage.setItem('umsy_ranking_data', JSON.stringify({ regno, data: res.data }));
                }
            } catch (e) {
                console.error('Ranking fetch failed:', e);
            }
        };

        const fetchData = async () => {
            const currentRegno = localStorage.getItem('umsy_regno');
            const cookies = localStorage.getItem('umsy_cookies');
            const isV04 = localStorage.getItem('umsy_is_v04') === 'true';
            
            if (!cookies && !currentRegno) {
                setLoading(false);
                return;
            }

            const auth = cookies ? cookies : { regno: currentRegno };

            // 1. Load Caches Immediately
            const cachedInfo = localStorage.getItem('umsy_student_info');
            let hasCache = false;
            if (cachedInfo) {
                try {
                    const parsed = JSON.parse(cachedInfo);
                    if (currentRegno && parsed.Registrationnumber === currentRegno) {
                        setStudentInfo(parsed);
                        hasCache = true;
                    }
                } catch (e) { localStorage.removeItem('umsy_student_info'); }
            }

            const cachedAttendance = localStorage.getItem('umsy_attendance_data');
            if (cachedAttendance) {
                try { setAttendanceData(JSON.parse(cachedAttendance)); } catch (e) { }
            }

            const cachedCourses = localStorage.getItem('umsy_courses_data');
            if (cachedCourses) {
                try { setCoursesData(JSON.parse(cachedCourses)); } catch (e) { }
            }

            const cachedMarks = localStorage.getItem('umsy_marks_data');
            if (cachedMarks) {
                try { setMarksData(JSON.parse(cachedMarks)); } catch (e) { }
            }

            // Always set loading to false immediately so the dashboard shell is rendered
            setLoading(false);

            // 2. Fetch Fresh Data in Background
            try {
                const studentRes = isV04 ? await getStudentDashboardV04(auth) : await getStudentInfo(auth);
                if (studentRes.success && studentRes.data) {
                    setStudentInfo(studentRes.data);
                    localStorage.setItem('umsy_student_info', JSON.stringify(studentRes.data));
                    window.dispatchEvent(new Event('student-info-updated'));
                    if (studentRes.data.Registrationnumber) fetchRanking(studentRes.data.Registrationnumber);
                }
            } catch (err) {
                console.warn('Dashboard info fetch failed:', err.message);
                if (!hasCache) {
                    setError(err.message || 'Failed to load dashboard data.');
                }
            } finally {
                setIsInitialFetching(false);
            }

            try {
                const attRes = await getAttendanceDetails(auth);
                if (attRes.success && attRes.data) {
                    setAttendanceData(attRes.data);
                    localStorage.setItem('umsy_attendance_data', JSON.stringify(attRes.data));
                }
            } catch (err) { console.warn('Attendance fetch failed:', err.message); }

            try {
                const coursesRes = await getCourses(auth);
                if (coursesRes.success && coursesRes.data) {
                    setCoursesData(coursesRes.data);
                    localStorage.setItem('umsy_courses_data', JSON.stringify(coursesRes.data));
                }
            } catch (err) { console.warn('Courses fetch failed:', err.message); }

            try {
                const marksRes = isV04 ? await getMarksV04(auth) : await getMarks(auth);
                if (marksRes.success && marksRes.data) {
                    setMarksData(marksRes.data);
                    localStorage.setItem('umsy_marks_data', JSON.stringify(marksRes.data));
                }
            } catch (err) { console.warn('Marks fetch failed:', err.message); }

            // Seating plan fetch
            fetchSeatingPlanData(auth);
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

        // Load timetable — cache first, then always try fresh fetch
        const loadTimetable = async () => {
            const cached = localStorage.getItem('umsy_timetable_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    console.log('📅 Using cached timetable:', Object.keys(parsed));
                    setTimetable(parsed);
                } catch (e) { localStorage.removeItem('umsy_timetable_data'); }
            }
            // Always try fetching fresh data
            const cookies = localStorage.getItem('umsy_cookies');
            const regno = localStorage.getItem('umsy_regno');
            
            if (!cookies && !regno) {
                console.warn('⚠️ No cookies or regno for timetable fetch');
                return;
            }
            
            const auth = cookies ? cookies : { regno };

            try {
                setTimetableLoading(true);
                const result = await getTimeTable(auth);
                if (result.data && Object.keys(result.data).length > 0) {
                    console.log('📅 Fresh timetable loaded:', Object.keys(result.data));
                    setTimetable(result.data);
                    localStorage.setItem('umsy_timetable_data', JSON.stringify(result.data));
                }
            } catch (e) {
                console.warn('⚠️ Could not load timetable:', e.message);
            } finally {
                setTimetableLoading(false);
            }
        };
        loadTimetable();

        // Load Pending Assignments
        const loadAssignments = async () => {
            const cookies = localStorage.getItem('umsy_cookies');
            const regno = localStorage.getItem('umsy_regno');
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

        // Load backlogs/results separately so reappear count can update dynamically
        const loadBacklogs = async () => {
            const calculateCount = (data) => {
                let count = 0;
                const backlogGrades = new Set(['E', 'F', 'G', 'I']);
                if (data && data.semesters) {
                    data.semesters.forEach(sem => {
                        (sem.subjects || []).forEach(sub => {
                            if (sub.grade && backlogGrades.has(sub.grade.trim().toUpperCase())) count++;
                        });
                    });
                }
                return count;
            };

            const cached = localStorage.getItem('umsy_result_data');
            if (cached) {
                try {
                    setBacklogCount(calculateCount(JSON.parse(cached)));
                } catch (e) {
                    localStorage.removeItem('umsy_result_data');
                }
            }

            const cookies = localStorage.getItem('umsy_cookies');
            const regno = localStorage.getItem('umsy_regno');
            const isV04 = localStorage.getItem('umsy_is_v04') === 'true';

            if (!cookies && !regno) return;
            const auth = cookies ? cookies : { regno };

            try {
                const result = isV04 ? await getResultV04(auth) : await getResult(auth);
                if (result.success && result.data) {
                    localStorage.setItem('umsy_result_data', JSON.stringify(result.data));
                    setBacklogCount(calculateCount(result.data));
                }
            } catch (e) {
                console.warn('⚠️ Could not load grades/backlogs:', e.message);
            }
        };
        loadBacklogs();
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



    if (loading || (!studentInfo && isInitialFetching)) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden animate-pulse">
                <Sidebar />
                <main className="flex flex-1 overflow-y-auto p-4 lg:p-10 pb-24 lg:pb-10 bg-[#f6f8fa] dark:bg-zinc-950">
                    <div className="max-w-7xl mx-auto space-y-8 w-full">
                        {/* Welcome Header Skeleton */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                <div className="h-8 w-56 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                <div className="h-3 w-40 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                        </div>

                        {/* 3 Stats Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-zinc-100 dark:border-zinc-800 min-h-[140px] flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                        <div className="h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="h-5 w-16 bg-gray-250 dark:bg-zinc-800 rounded-full animate-pulse" />
                                        <div className="h-5 w-5 bg-gray-250 dark:bg-zinc-800 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Middle Dashboard Content Grid Skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column Skeleton */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 border border-zinc-100 dark:border-zinc-800 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <div className="h-5 w-36 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                            <div className="h-3.5 w-48 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                            <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="h-[250px] bg-gray-100 dark:bg-zinc-850 rounded-2xl animate-pulse" />
                                </div>
                            </div>

                            {/* Right Column Skeleton */}
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 border border-zinc-100 dark:border-zinc-800 min-h-[300px] flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                                    <div className="h-3 w-40 bg-gray-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Show empty/resync state when no data and no cookies
    if (!loading && !isInitialFetching && !studentInfo && !error) {
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

            <main className="flex flex-1 overflow-y-auto p-4 lg:p-10 pb-24 lg:pb-10 bg-[#f6f8fa] dark:bg-zinc-950">
                {(() => {
                    // 1. Prepare Stacked Bar Chart Data
                    const chartData = attendanceData && attendanceData.length > 0
                        ? attendanceData.map(item => {
                            const present = parseInt(item.presentCount) || 0;
                            const total = parseInt(item.totalRecords) || 0;
                            const absent = total > present ? total - present : 0;
                            return {
                                month: item.courseCode || item.courseName?.substring(0, 5) || 'SUB',
                                present: present,
                                absent: absent
                            };
                        })
                        : [
                            { month: 'No Data', present: 0, absent: 0 }
                        ];

                    // 2. Prepare Enrolled Courses List
                    const activeCoursesList = attendanceData && attendanceData.length > 0
                        ? attendanceData.slice(0, 4)
                        : (coursesData && coursesData.length > 0 ? coursesData.slice(0, 4) : []);

                    const getSubjectMarks = (courseCode) => {
                        if (!marksData || marksData.length === 0) return '—';
                        for (const term of marksData) {
                            if (term.subjects) {
                                const found = term.subjects.find(s => 
                                    s.subjectCode?.toLowerCase() === courseCode?.toLowerCase() || 
                                    courseCode?.toLowerCase().includes(s.subjectCode?.toLowerCase()) ||
                                    s.subjectCode?.toLowerCase().includes(courseCode?.toLowerCase())
                                );
                                if (found && found.marksBreakdown) {
                                    const caMark = found.marksBreakdown.find(m => m.type.toLowerCase().includes('continuous') || m.type.toLowerCase().includes('ca'));
                                    if (caMark) return caMark.marks;
                                    const midMark = found.marksBreakdown.find(m => m.type.toLowerCase().includes('mid'));
                                    if (midMark) return midMark.marks;
                                    if (found.marksBreakdown[0]) return found.marksBreakdown[0].marks;
                                }
                            }
                        }
                        return '—';
                    };

                    // 3. Prepare Heatmap Grid from Timetable
                    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const hasTimetableData = timetable && Object.keys(timetable).length > 0 && 
                        Object.values(timetable).some(day => Array.isArray(day) && day.length > 0);
                    const realHeatmap = daysOfWeek.map(dayName => {
                        const dayClasses = timetable?.[dayName] || [];
                        const slots = Array(7).fill(0);
                        dayClasses.forEach((cls, idx) => {
                            if (idx < 7) {
                                slots[idx] = cls.type?.toLowerCase().includes('lab') ? 3 : 4;
                            }
                        });
                        return slots;
                    });

                    return (
                        <div className="max-w-7xl mx-auto space-y-8 w-full">
                            {/* Welcome Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{getGreeting()},</p>
                                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                                        {studentInfo?.StudentName || 'Student'} 👋
                                    </h1>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Here's your academic overview</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {studentInfo?.StudentPicture && (
                                        <img
                                            src={`data:image/png;base64,${studentInfo.StudentPicture}`}
                                            alt="Profile"
                                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-zinc-200 dark:ring-zinc-800"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 3 Stats Cards (FXcom style) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* CGPA Stats Card */}
                                <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">CGPA</p>
                                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
                                            {studentInfo?.CGPA || '0.00'} <span className="text-sm font-medium text-zinc-400">/ 10</span>
                                        </h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e3ffb7] text-[#558b00] dark:bg-[#2e4d00]/30 dark:text-[#a3ff2e]">
                                            {ranking?.Rank ? `#${ranking.Rank}` : '—'} Rank
                                        </span>
                                        <GraduationCap className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                                    </div>
                                </div>

                                {/* Attendance Stats Card */}
                                <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Attendance</p>
                                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
                                            {studentInfo?.AggAttendance || '0.0'}%
                                        </h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${parseFloat(studentInfo?.AggAttendance) >= 75 ? 'bg-[#e3ffb7] text-[#558b00] dark:bg-[#2e4d00]/30 dark:text-[#a3ff2e]' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-[#f87171]'}`}>
                                            {parseFloat(studentInfo?.AggAttendance) >= 75 ? 'On Track' : 'Short'}
                                        </span>
                                        <CheckCircle className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                                    </div>
                                </div>

                                {/* Backlogs Stats Card */}
                                <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Active Backlogs</p>
                                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
                                            {backlogCount} <span className="text-sm font-medium text-zinc-400">Courses</span>
                                        </h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${backlogCount === 0 ? 'bg-[#e3ffb7] text-[#558b00] dark:bg-[#2e4d00]/30 dark:text-[#a3ff2e]' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'}`}>
                                            {backlogCount === 0 ? 'Clear 🎉' : 'Pending'}
                                        </span>
                                        <AlertCircle className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                                    </div>
                                </div>
                            </div>

                            {/* Middle Dashboard Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column (Bar Chart & Active Courses Table) */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Stacked Attendance & Absent Chart */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Classes History</h3>
                                                <p className="text-xs text-zinc-400 mt-1">Present vs Absent distributions</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#b5f542]" />
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Present</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Absent</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-[250px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip cursor={{ fill: 'rgba(240, 240, 240, 0.4)' }} />
                                                    <Bar dataKey="present" stackId="a" fill="#b5f542" radius={[0, 0, 8, 8]} barSize={28} />
                                                    <Bar dataKey="absent" stackId="a" fill="#1e293b" radius={[8, 8, 0, 0]} barSize={28} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Enrolled Courses Table */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Enrolled Courses</h3>
                                            <button onClick={() => navigate('/courses')} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                                View all
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 text-xs font-semibold">
                                                        <th className="pb-3 font-medium">Code</th>
                                                        <th className="pb-3 font-medium">Course Name</th>
                                                        <th className="pb-3 font-medium text-center">Attendance</th>
                                                        <th className="pb-3 font-medium text-center">CA Marks</th>
                                                        <th className="pb-3 font-medium text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-850 text-sm">
                                                    {activeCoursesList.map((course, idx) => {
                                                        const attPercent = course.attendance != null ? course.attendance : (course.presentCount != null && course.totalRecords > 0 ? Math.round((course.presentCount / course.totalRecords) * 100) : 0);
                                                        return (
                                                            <tr key={idx} className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                                                <td className="py-4 font-bold text-zinc-900 dark:text-white">{course.courseCode || '—'}</td>
                                                                <td className="py-4 font-medium truncate max-w-xs">{course.courseName || '—'}</td>
                                                                <td className="py-4 text-center font-bold text-[#558b00] dark:text-[#a3ff2e]">
                                                                    {course.presentCount != null ? `${course.presentCount}/${course.totalRecords}` : `${attPercent}%`}
                                                                </td>
                                                                <td className="py-4 text-center font-semibold">{getSubjectMarks(course.courseCode)}</td>
                                                                <td className="py-4 text-right font-semibold text-zinc-950 dark:text-white">
                                                                    {attPercent >= 75 ? 'On Track' : 'Short'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column (Weekly Heatmap & 3 Details Circles) */}
                                <div className="space-y-6">
                                    {/* Weekly Attendance Heatmap / Attendance Bars Fallback */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Weekly Activity</h3>
                                        <p className="text-xs text-zinc-400 mb-6">{hasTimetableData ? 'Attendance intensity track' : 'Course attendance overview'}</p>
                                        {hasTimetableData ? (
                                            <React.Fragment>
                                                <div className="grid grid-cols-7 gap-2.5">
                                                    {realHeatmap.map((row, rIdx) => 
                                                        row.map((val, cIdx) => {
                                                            const dayNameHeat = daysOfWeek[rIdx];
                                                            const dayClasses = timetable?.[dayNameHeat] || [];
                                                            const classInfo = dayClasses[cIdx];
                                                            const bgColors = [
                                                                'bg-zinc-200 dark:bg-zinc-800', // 0 = free slot
                                                                'bg-[#7cb918]', // 1
                                                                'bg-[#9be11f]', // 2
                                                                'bg-[#abf22c]', // 3 = lab
                                                                'bg-[#b5f542]'  // 4 = lecture
                                                            ];
                                                            const tooltipText = classInfo 
                                                                ? `${classInfo.courseCode || 'Class'} (${classInfo.type || 'Lecture'})\nRoom: ${classInfo.room || 'N/A'}\nTime: ${classInfo.time || 'N/A'}` 
                                                                : 'Free Slot';
                                                            return (
                                                                <div 
                                                                    key={`${rIdx}-${cIdx}`} 
                                                                    className={`w-full aspect-square rounded-lg ${bgColors[val]} transition-all duration-200 hover:scale-125 hover:shadow-md cursor-pointer`}
                                                                    title={tooltipText}
                                                                />
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-7 gap-2.5 mt-2.5 text-[9px] font-bold text-zinc-400 text-center">
                                                    <span>Mon</span>
                                                    <span>Tue</span>
                                                    <span>Wed</span>
                                                    <span>Thu</span>
                                                    <span>Fri</span>
                                                    <span>Sat</span>
                                                    <span>Sun</span>
                                                </div>
                                            </React.Fragment>
                                        ) : attendanceData && attendanceData.length > 0 ? (
                                            <div className="space-y-3">
                                                {attendanceData.slice(0, 6).map((course, idx) => {
                                                    const present = parseInt(course.presentCount) || 0;
                                                    const total = parseInt(course.totalRecords) || 1;
                                                    const pct = Math.round((present / total) * 100);
                                                    const barColor = pct >= 75 ? 'bg-[#7cb918]' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
                                                    return (
                                                        <div key={idx} className="group">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]" title={course.courseName}>
                                                                    {course.courseCode || course.courseName?.substring(0, 10)}
                                                                </span>
                                                                <span className={`text-[11px] font-black ${pct >= 75 ? 'text-[#558b00]' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                                                                    {pct}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${barColor} rounded-full transition-all duration-700 group-hover:shadow-md`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[9px] text-zinc-400 mt-0.5">{present}/{total} classes attended</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">No activity data available</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Overlapping Key Metrics Circles */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[300px]">
                                        <div>
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Key Metrics</h3>
                                            <p className="text-xs text-zinc-400 mb-6">CGPA, Attendance & Fee overview</p>
                                        </div>
                                        <div className="relative h-[200px] flex items-center justify-center">
                                            <div className="absolute w-36 h-36 rounded-full bg-[#1e293b] border-2 border-white dark:border-zinc-900 flex flex-col items-center justify-center text-white -translate-x-8 -translate-y-4 shadow-lg z-10 transition-all duration-300 hover:scale-125 hover:z-30 cursor-pointer">
                                                <span className="text-2xl font-black">{studentInfo?.CGPA || '0.00'}</span>
                                                <span className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">CGPA</span>
                                            </div>
                                            <div className="absolute w-28 h-28 rounded-full bg-[#b5f542] border-2 border-white dark:border-zinc-900 flex flex-col items-center justify-center text-[#1e293b] translate-x-12 translate-y-6 shadow-lg z-20 transition-all duration-300 hover:scale-125 hover:z-30 cursor-pointer">
                                                <span className="text-xl font-black">{studentInfo?.AggAttendance || '0.0'}%</span>
                                                <span className="text-[9px] text-[#1e293b]/70 uppercase font-bold tracking-wider">Attendance</span>
                                            </div>
                                            <div className="absolute w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-850 border-2 border-white dark:border-zinc-900 flex flex-col items-center justify-center text-zinc-800 dark:text-white translate-x-6 -translate-y-16 shadow-lg z-0 transition-all duration-300 hover:scale-125 hover:z-30 cursor-pointer">
                                                <span className="text-xs font-black truncate max-w-[80px]">₹{studentInfo?.PendingFee || '0'}</span>
                                                <span className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider mt-0.5">Pending Fee</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal & Account Details Box (Only target profile details listed by user) */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Personal & Account Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs text-zinc-400">Student</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.StudentName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Registration Number</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.Registrationnumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Roll Number</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.RollNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Program</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1 truncate max-w-xs">{studentInfo?.Program || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Section</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.Section || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Mobile</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.StudentMobile || studentInfo?.MobileNumber || studentInfo?.PhoneNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Date of Birth</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1">{studentInfo?.DateofBirth || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400">Pending Fee</p>
                                        <p className="text-sm font-bold text-rose-500 mt-1">₹{studentInfo?.PendingFee || '0'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Division (Placed at the bottom) */}
                            <div className="grid grid-cols-1 gap-6">
                                <MessagesCard messages={studentInfo?.Messages || []} />
                            </div>
                        </div>
                    );
                })()}
            </main>

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
                loading={leaveSlipLoading}
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

