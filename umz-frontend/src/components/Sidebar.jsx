import React, { useState, useEffect, useRef } from 'react';
import logoUMz from '../assets/logoUMz.png';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarCheck,
    FileText,
    Award,
    Calendar,
    MessageSquare,
    Settings,
    HelpCircle,
    ChevronRight,
    Menu,
    X,
    LogOut,
    RefreshCw,
    Sun,
    Moon,
    Trophy,
    Eye,
    Home,
    Sparkles
} from 'lucide-react';
import { startLogin, completeLogin, getStudentInfo, tokenLoginV04, getStudentInfoV04, getResultV04, getMarksV04, getCourses, getAttendanceDetails, getTimeTable } from '../services/api';
import CaptchaModal from './CaptchaModal';
import PrivacySettingsModal from './PrivacySettingsModal';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [theme, setTheme] = useState('light');
    const [studentName, setStudentName] = useState('Student');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentPhoto, setStudentPhoto] = useState('');
    const settingsRef = useRef(null);

    // Captcha modal state
    const [showCaptchaModal, setShowCaptchaModal] = useState(false);
    const [captchaImage, setCaptchaImage] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [captchaLoading, setCaptchaLoading] = useState(false);

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

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

    // Initialize theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('umz_theme') || 'light';
        setTheme(savedTheme);

        // Apply theme to document
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        // Function to load student info from localStorage
        const loadStudentInfo = () => {
            const storedInfo = localStorage.getItem('umz_student_info');
            if (storedInfo) {
                try {
                    const info = JSON.parse(storedInfo);
                    setStudentName(info.StudentName || 'Student');
                    setStudentEmail(info.StudentEmail || '');

                    // Convert base64 StudentPicture to data URL
                    if (info.StudentPicture) {
                        setStudentPhoto(`data:image/png;base64,${info.StudentPicture}`);
                    } else {
                        setStudentPhoto('');
                    }
                } catch (error) {
                    console.error('Error parsing student info:', error);
                }
            }
        };

        // Load on mount
        loadStudentInfo();

        // Listen for storage changes (when localStorage is updated)
        window.addEventListener('storage', loadStudentInfo);

        // Also check when navigating (in case data was just fetched)
        const intervalId = setInterval(loadStudentInfo, 1000);

        // Cleanup
        return () => {
            window.removeEventListener('storage', loadStudentInfo);
            clearInterval(intervalId);
        };
    }, [location.pathname]);

    const handleLogout = () => {
        // Keep only credentials and theme — clear every other key
        const keep = new Set(['umz_regno', 'umz_password', 'theme']);
        Object.keys(localStorage).forEach(key => {
            if (!keep.has(key)) localStorage.removeItem(key);
        });

        // Redirect to login
        navigate('/v04/login');
    };

    const handleResync = async () => {
        try {
            setIsSettingsOpen(false);

            // Check if cookies exist
            const cookies = localStorage.getItem('umz_cookies');

            if (cookies) {
                // Cookies exist - but they might be expired, so test them first
                try {
                    setCaptchaLoading(true);
                    console.log('🔍 Testing cookie validity...');

                    // Try a small API call to test if cookies are valid
                    await getStudentInfo(cookies);

                    // Cookies are valid! Just clear cache and reload
                    console.log('✅ Cookies valid, clearing cache and reloading');
                    setCaptchaLoading(false);
                    localStorage.removeItem('umz_student_info');
                    localStorage.removeItem('umz_attendance_data');
                    localStorage.removeItem('umz_marks_data');
                    localStorage.removeItem('umz_courses_data');
                    localStorage.removeItem('umz_timetable_data');

                    window.location.reload();
                    return;
                } catch (testError) {
                    // Cookies are expired or invalid
                    console.log('❌ Cookies expired/invalid, starting V04 token resync:', testError.message);
                    setCaptchaLoading(false);

                    // Remove expired cookies and session-specific data
                    localStorage.removeItem('umz_cookies');
                    localStorage.removeItem('umz_result_data');
                    localStorage.removeItem('umz_ai_buddy_history');

                    // Fall through to V04 token login flow below
                }
            }

            // No cookies OR expired cookies - need to re-authenticate
            const savedRegno = localStorage.getItem('umz_regno');

            if (!savedRegno) {
                alert('Session expired. Please login again.');
                handleLogout();
                return;
            }

            // Perform token-based login process of refetching the regno with the token
            setCaptchaLoading(true);
            const result = await tokenLoginV04(savedRegno);

            if (result.success && result.cookies) {
                localStorage.setItem('umz_cookies', result.cookies);
                localStorage.setItem('umz_is_v04', 'true');

                // Clear stale cache
                localStorage.removeItem('umz_student_info');
                localStorage.removeItem('umz_attendance_data');
                localStorage.removeItem('umz_marks_data');
                localStorage.removeItem('umz_courses_data');
                localStorage.removeItem('umz_timetable_data');
                localStorage.removeItem('umz_result_data');

                // Fetch student basic profile information (includes messages and termwise CGPA)
                try {
                    const infoRes = await getStudentInfoV04(result.cookies);
                    if (infoRes?.data) {
                        localStorage.setItem('umz_student_info', JSON.stringify(infoRes.data));
                    }
                } catch (fetchErr) {
                    console.warn('⚠️ Profile fetch on resync failed:', fetchErr.message);
                }

                setCaptchaLoading(false);
                window.location.reload();
            } else {
                throw new Error('Token login failed');
            }
        } catch (error) {
            setCaptchaLoading(false);
            console.error('Error during resync:', error);
            alert('Failed to start resync. Please try again or login manually.');
        }
    };

    const handleReloadCaptcha = async () => {
        try {
            setCaptchaLoading(true);
            const savedRegno = localStorage.getItem('umz_regno');
            const savedPassword = localStorage.getItem('umz_password');

            const result = await startLogin(savedRegno, savedPassword);
            setSessionId(result.sessionId);
            setCaptchaImage(result.captchaImage);
        } catch (error) {
            console.error('Error reloading captcha:', error);
            alert('Failed to reload captcha. Please try again.');
        } finally {
            setCaptchaLoading(false);
        }
    };

    const handleCaptchaSubmit = async (captcha) => {
        try {
            setCaptchaLoading(true);
            const result = await completeLogin(sessionId, captcha);

            if (result.success) {
                // Store new cookies
                if (result.cookies) {
                    localStorage.setItem('umz_cookies', result.cookies);
                }

                // Clear cached data
                localStorage.removeItem('umz_student_info');
                localStorage.removeItem('umz_attendance_data');
                localStorage.removeItem('umz_marks_data');
                localStorage.removeItem('umz_courses_data');
                localStorage.removeItem('umz_timetable_data');

                // Close modal and reload
                setShowCaptchaModal(false);
                setCaptchaLoading(false);
                window.location.reload();
            }
        } catch (error) {
            setCaptchaLoading(false);
            alert('Invalid captcha. Please try again.');
            console.error('Error completing login:', error);
        }
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('umz_theme', newTheme);
        setIsSettingsOpen(false);

        // Apply or remove dark class from document root
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Register external resync trigger (for mobile dashboard button)
    useExternalResync(handleResync);

    const menuSections = [
        {
            title: "General",
            items: [
                { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
                { name: "Courses", icon: MessageSquare, path: "/courses" },
                { name: "Attendance", icon: CalendarCheck, path: "/attendance" },
                { name: "Marks", icon: FileText, path: "/marks" },
                { name: "Cgpa", icon: Award, path: "/cgpa" },
                { name: "Time Table", icon: Calendar, path: "/time-table" },
                { name: "Ranking", icon: Trophy, path: "/ranking" },
            ]
        },
        {
            title: "Hostel",
            items: [
                { name: "Hostel", icon: Home, path: "/mutual-shift" },
            ]
        },
        {
            title: "AI",
            items: [
                { name: "AI Buddy", icon: Sparkles, path: "/ai-buddy" },
            ]
        },
        {
            title: "Other",
            items: [
                { name: "Settings", icon: Settings, isDropdown: true },
                { name: "Help Center", icon: HelpCircle, path: "/help" },
            ]
        }
    ];

    const getInitials = (name) => {
        if (!name) return 'ST';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            {/* Mobile Toggle Button - hidden since bottom nav handles mobile nav */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="cursor-pointer hidden lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Toggle menu"
            >
                {isMobileOpen ? (
                    <X className="h-6 w-6 text-gray-900" />
                ) : (
                    <Menu className="h-6 w-6 text-gray-900" />
                )}
            </button>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-40
                    w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
                    flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo/Branding Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg">
                            {/* <span className="text-white font-bold text-xl">U</span> */}
                            <img src={logoUMz} alt="" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-mono text-gray-900 dark:text-white">UMZ</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">UMS Made Zippy</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {menuSections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-6">
                            {/* Section Title */}
                            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {section.title}
                            </h3>

                            {/* Menu Items */}
                            <nav className="space-y-1">
                                {section.items.map((item, itemIndex) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;

                                    // Settings dropdown item
                                    if (item.isDropdown) {
                                        return (
                                            <div key={itemIndex} className="relative" ref={settingsRef}>
                                                <button
                                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                                    className="cursor-pointer w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon className="h-5 w-5" />
                                                        <span>{item.name}</span>
                                                    </div>
                                                    <ChevronRight
                                                        className={`h-4 w-4 text-gray-400 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`}
                                                    />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {isSettingsOpen && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden">
                                                        {/* Theme Toggle Tabs */}
                                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Theme</p>
                                                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                                                <button disabled="true"
                                                                    onClick={() => {
                                                                        if (theme !== 'light') {
                                                                            setTheme('light');
                                                                            localStorage.setItem('umz_theme', 'light');
                                                                            document.documentElement.classList.remove('dark');
                                                                        }
                                                                    }}
                                                                    className={`cursor-not-allowed flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${theme === 'light'
                                                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                                        }`}
                                                                >
                                                                    <Sun className="h-4 w-4" />
                                                                    <span>Light</span>
                                                                </button>
                                                                <button disabled="true"
                                                                    onClick={() => {
                                                                        if (theme !== 'dark') {
                                                                            setTheme('dark');
                                                                            localStorage.setItem('umz_theme', 'dark');
                                                                            document.documentElement.classList.add('dark');
                                                                        }
                                                                    }}
                                                                    className={`cursor-not-allowed flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${theme === 'dark'
                                                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                                        }`}
                                                                >
                                                                    <Moon className="h-4 w-4" />
                                                                    <span>Dark</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                setIsPrivacyModalOpen(true);
                                                                setIsSettingsOpen(false);
                                                            }}
                                                            className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                        >
                                                            <Eye className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">Privacy</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-300">Control visibility</p>
                                                            </div>
                                                        </button>

                                                        <button
                                                            onClick={handleResync}
                                                            className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                        >
                                                            <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">Resync Data</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-300">Clear cache & refetch</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Regular navigation links
                                    return (
                                        <Link
                                            key={itemIndex}
                                            to={item.path}
                                            onClick={() => setIsMobileOpen(false)}
                                            className={`
                                                flex items-center justify-between px-3 py-2 rounded-lg
                                                text-sm font-medium transition-colors
                                                ${isActive
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-5 w-5" />
                                                <span>{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.badge && (
                                                    <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-gray-900 rounded-full">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                {item.hasChevron && (
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })
                                }
                            </nav>
                        </div>
                    ))}
                </div>

                {/* User Profile Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {/* Profile Header - Clickable */}
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-semibold text-sm overflow-hidden">
                            {studentPhoto ? (
                                <img
                                    src={studentPhoto}
                                    alt={studentName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ display: studentPhoto ? 'none' : 'flex' }}
                            >
                                {getInitials(studentName)}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {studentName}
                            </p>
                            {studentEmail && (
                                <p className="text-xs text-gray-500 truncate">
                                    {studentEmail}
                                </p>
                            )}
                        </div>
                        <ChevronRight
                            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isProfileOpen ? 'rotate-90' : ''}`}
                        />
                    </button>

                    {/* Logout Button - Collapsible */}
                    <div className={`overflow-hidden transition-all duration-200 ${isProfileOpen ? 'max-h-20 mt-2' : 'max-h-0'}`}>
                        <button
                            onClick={handleLogout}
                            className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Loading Overlay - Shows while fetching captcha */}
            {captchaLoading && !showCaptchaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">Initializing Session</p>
                            <p className="text-sm text-gray-500 mt-1">Please wait...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Captcha Modal */}
            <CaptchaModal
                isOpen={showCaptchaModal}
                onClose={() => setShowCaptchaModal(false)}
                captchaImage={captchaImage}
                onSubmit={handleCaptchaSubmit}
                onReload={handleReloadCaptcha}
                loading={captchaLoading}
            />

            {/* Privacy Settings Modal */}
            <PrivacySettingsModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
            />
        </>
    );
};

// Separate effect to handle external resync triggers
const useExternalResync = (handler) => {
    useEffect(() => {
        const listener = () => handler();
        window.addEventListener('trigger-resync', listener);
        return () => window.removeEventListener('trigger-resync', listener);
    }, [handler]);
};

export default Sidebar;
