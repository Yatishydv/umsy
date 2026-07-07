import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarCheck,
    Award,
    GraduationCap,
    Calendar,
    Trophy,
    BookOpen,
    RefreshCw,
    LogOut,
    Sun,
    Moon,
    X,
    ChevronRight,
    Settings,
    Eye,
    AlertCircle,
    Download
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import PrivacySettingsModal from './PrivacySettingsModal';
import { getStudentInfo, tokenLoginV04, getStudentInfoV04, startLogin, completeLogin } from '../services/api';
import CaptchaModal from './CaptchaModal';

const MobileSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState('light');
    const [studentName, setStudentName] = useState('Student');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentPhoto, setStudentPhoto] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const settingsRef = useRef(null);
    const [alertMessage, setAlertMessage] = useState(null);

    // Captcha modal state
    const [showCaptchaModal, setShowCaptchaModal] = useState(false);
    const [captchaImage, setCaptchaImage] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [captchaLoading, setCaptchaLoading] = useState(false);

    // Listen to global open/close events
    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        const handleClose = () => setIsOpen(false);
        window.addEventListener('toggle-mobile-sidebar', handleToggle);
        window.addEventListener('close-mobile-sidebar', handleClose);
        return () => {
            window.removeEventListener('toggle-mobile-sidebar', handleToggle);
            window.removeEventListener('close-mobile-sidebar', handleClose);
        };
    }, []);

    // Handle click outside settings dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSettingsOpen]);

    // Initialize theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('umsy_theme') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Load student info
    useEffect(() => {
        const loadStudentInfo = () => {
            const storedInfo = localStorage.getItem('umsy_student_info');
            if (storedInfo) {
                try {
                    const info = JSON.parse(storedInfo);
                    setStudentName(info.StudentName || 'Student');
                    setStudentEmail(info.StudentEmail || '');
                    if (info.StudentPicture) {
                        setStudentPhoto(`data:image/png;base64,${info.StudentPicture}`);
                    } else {
                        setStudentPhoto('');
                    }
                } catch (error) {
                    console.error('Error parsing student info in MobileSidebar:', error);
                }
            }
        };
        loadStudentInfo();
        window.addEventListener('storage', loadStudentInfo);
        window.addEventListener('student-info-updated', loadStudentInfo);
        return () => {
            window.removeEventListener('storage', loadStudentInfo);
            window.removeEventListener('student-info-updated', loadStudentInfo);
        };
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleResync = async () => {
        try {
            setIsSettingsOpen(false);
            const cookies = localStorage.getItem('umsy_cookies');

            if (cookies) {
                try {
                    setCaptchaLoading(true);
                    await getStudentInfo(cookies);
                    setCaptchaLoading(false);
                    localStorage.removeItem('umsy_student_info');
                    localStorage.removeItem('umsy_attendance_data');
                    localStorage.removeItem('umsy_marks_data');
                    localStorage.removeItem('umsy_courses_data');
                    localStorage.removeItem('umsy_timetable_data');
                    window.location.reload();
                    return;
                } catch (testError) {
                    setCaptchaLoading(false);
                    localStorage.removeItem('umsy_cookies');
                    localStorage.removeItem('umsy_result_data');
                    localStorage.removeItem('umsy_ai_buddy_history');
                }
            }

            const savedRegno = localStorage.getItem('umsy_regno');
            const savedPassword = localStorage.getItem('umsy_password');
            const isV04 = localStorage.getItem('umsy_is_v04') === 'true';

            if (!savedRegno || !savedPassword) {
                setAlertMessage('Session expired. Please login again.');
                handleLogout();
                return;
            }

            setCaptchaLoading(true);

            if (isV04) {
                const result = await tokenLoginV04(savedRegno, savedPassword);
                if (result.success && result.cookies) {
                    localStorage.setItem('umsy_cookies', result.cookies);
                    localStorage.setItem('umsy_is_v04', 'true');
                    localStorage.removeItem('umsy_student_info');
                    localStorage.removeItem('umsy_attendance_data');
                    localStorage.removeItem('umsy_marks_data');
                    localStorage.removeItem('umsy_courses_data');
                    localStorage.removeItem('umsy_timetable_data');
                    localStorage.removeItem('umsy_result_data');

                    try {
                        const infoRes = await getStudentInfoV04(result.cookies);
                        if (infoRes?.data) {
                            localStorage.setItem('umsy_student_info', JSON.stringify(infoRes.data));
                        }
                    } catch (fetchErr) {
                        console.warn('Profile fetch on resync failed:', fetchErr.message);
                    }
                    setCaptchaLoading(false);
                    window.location.reload();
                } else {
                    throw new Error('Token login failed');
                }
            } else {
                const result = await startLogin(savedRegno, savedPassword);
                setSessionId(result.sessionId);
                setCaptchaImage(result.captchaImage);
                setShowCaptchaModal(true);
                setCaptchaLoading(false);
            }
        } catch (error) {
            setCaptchaLoading(false);
            console.error('Error during resync:', error);
            setAlertMessage('Failed to start resync. Please try again.');
        }
    };

    const handleThemeToggle = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('umsy_theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const menuItems = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { name: "Attendance", icon: CalendarCheck, path: "/attendance" },
        { name: "Grades", icon: Award, path: "/grades" },
        { name: "CGPA", icon: GraduationCap, path: "/cgpa" },
        { name: "timetable", icon: Calendar, path: "/time-table" },
        { name: "Ranking", icon: Trophy, path: "/ranking" },
        { name: "Courses", icon: BookOpen, path: "/courses" }
    ];

    const getInitials = (name) => {
        if (!name) return 'ST';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            {/* Overlay backdrop */}
            {isOpen && (
                <div
                    className="lg:hidden fixed top-[72px] bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300 animate-in fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar container */}
            <aside
                className={`
                    fixed lg:hidden top-[72px] bottom-0 left-0 z-50
                    w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-zinc-800/50
                    flex flex-col shadow-2xl
                    transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
                    ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
                `}
            >
                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto p-4 pt-2.5 space-y-1">
                    {menuItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate(item.path);
                                }}
                                className={`
                                    w-full flex items-center justify-between px-4 py-3 rounded-2xl
                                    text-sm font-semibold transition-all duration-200 active:scale-98
                                    ${isActive
                                        ? 'bg-[#bef227] text-[#1c312e] shadow-lg shadow-[#bef227]/10'
                                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/50 hover:text-slate-900 dark:hover:text-white'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5" />
                                    <span className="capitalize">{item.name}</span>
                                </div>
                                <ChevronRight className={`h-4 w-4 opacity-40 transition-transform ${isActive ? 'rotate-90 text-[#1c312e]' : ''}`} />
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div className="my-4 border-t border-slate-100 dark:border-zinc-800/50" />

                    {/* Settings Dropdown Item */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="cursor-pointer w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/50 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Settings className="h-5 w-5" />
                                <span>Settings</span>
                            </div>
                            <ChevronRight className={`h-4 w-4 opacity-45 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {isSettingsOpen && (
                            <div className="mt-1 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-150">
                                {/* Theme Selector */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/40">
                                    <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">Theme</p>
                                    <div className="flex bg-slate-200/40 dark:bg-zinc-800/40 rounded-xl p-1">
                                        <button
                                            onClick={() => handleThemeToggle('light')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'light'
                                                ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <Sun className="h-3.5 w-3.5" />
                                            <span>Light</span>
                                        </button>
                                        <button
                                            onClick={() => handleThemeToggle('dark')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'dark'
                                                ? 'bg-white dark:bg-zinc-850 text-slate-800 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <Moon className="h-3.5 w-3.5" />
                                            <span>Dark</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsPrivacyModalOpen(true);
                                        setIsSettingsOpen(false);
                                    }}
                                    className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
                                >
                                    <Eye className="h-4 w-4 text-slate-500" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white">Privacy Settings</p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleResync}
                                    className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
                                >
                                    <RefreshCw className="h-4 w-4 text-slate-500 animate-spin-hover" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white">Resync Data</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Install for Android Button */}
                {!Capacitor.isNativePlatform() && (
                    <div className="px-4 pb-4">
                        <a
                            href="/umsy.apk"
                            download="umsy.apk"
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#bef227] hover:bg-[#a6d81d] text-[#1c312e] rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-98 shadow-md"
                        >
                            <Download className="w-4 h-4" />
                            Install for Android
                        </a>
                    </div>
                )}

                {/* User Profile Card */}
                <div className="border-t border-slate-100 dark:border-zinc-800/80 p-4 bg-slate-50/50 dark:bg-zinc-950/20">
                    <div className="flex items-center gap-3 px-2 py-1.5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 dark:bg-zinc-800 text-white font-semibold text-sm overflow-hidden">
                            {studentPhoto ? (
                                <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" />
                            ) : getInitials(studentName)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                {studentName}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold truncate">
                                {studentEmail || 'Student Account'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="cursor-pointer p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-550/10 rounded-xl transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Captcha Modal */}
            <CaptchaModal
                isOpen={showCaptchaModal}
                onClose={() => setShowCaptchaModal(false)}
                captchaImage={captchaImage}
                onSubmit={async (captcha) => {
                    try {
                        setCaptchaLoading(true);
                        const result = await completeLogin(sessionId, captcha);
                        if (result.success) {
                            if (result.cookies) localStorage.setItem('umsy_cookies', result.cookies);
                            localStorage.removeItem('umsy_student_info');
                            localStorage.removeItem('umsy_attendance_data');
                            localStorage.removeItem('umsy_marks_data');
                            localStorage.removeItem('umsy_courses_data');
                            localStorage.removeItem('umsy_timetable_data');
                            setShowCaptchaModal(false);
                            setCaptchaLoading(false);
                            window.location.reload();
                        }
                    } catch (error) {
                        setCaptchaLoading(false);
                        setAlertMessage('Invalid captcha. Please try again.');
                    }
                }}
                onReload={async () => {
                    try {
                        setCaptchaLoading(true);
                        const savedRegno = localStorage.getItem('umsy_regno');
                        const savedPassword = localStorage.getItem('umsy_password');
                        const result = await startLogin(savedRegno, savedPassword);
                        setSessionId(result.sessionId);
                        setCaptchaImage(result.captchaImage);
                    } catch (e) {
                        setAlertMessage('Failed to reload captcha.');
                    } finally {
                        setCaptchaLoading(false);
                    }
                }}
                loading={captchaLoading}
            />

            {/* Privacy Settings Modal */}
            <PrivacySettingsModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
            />

            {/* Custom Alert Modal */}
            {alertMessage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMessage(null)} />
                    <div className="relative bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-250 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">UMSY Warning</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold mb-6 leading-relaxed">{alertMessage}</p>
                        <button
                            onClick={() => setAlertMessage(null)}
                            className="w-full py-3 bg-[#bef227] hover:bg-[#a6d81d] text-[#1c312e] rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 border border-white/10"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileSidebar;

