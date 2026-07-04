import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Award, Calendar, GraduationCap, Trophy, BookOpen, RefreshCw, Bell, LogOut } from 'lucide-react';
import MobileNotificationsSheet from './MobileNotificationsSheet';

const HeaderNav = ({ activeTab }) => {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    // Sliding indicator state
    const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const containerRef = useRef(null);
    const tabRefs = useRef({});

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { id: 'attendance', label: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { id: 'grades', label: 'Grades', path: '/grades', icon: Award },
        { id: 'cgpa', label: 'CGPA', path: '/cgpa', icon: GraduationCap },
        { id: 'timetable', label: 'timetable', path: '/time-table', icon: Calendar },
        { id: 'ranking', label: 'Ranking', path: '/ranking', icon: Trophy },
        { id: 'courses', label: 'Courses', path: '/courses', icon: BookOpen },
    ];

    useEffect(() => {
        const loadInfo = () => {
            const stored = localStorage.getItem('umsy_student_info');
            if (stored) {
                try {
                    setStudentInfo(JSON.parse(stored));
                } catch (e) {
                    console.warn('Failed to parse student info in HeaderNav:', e.message);
                }
            } else {
                setStudentInfo(null);
            }
        };

        loadInfo();
        window.addEventListener('student-info-updated', loadInfo);
        return () => window.removeEventListener('student-info-updated', loadInfo);
    }, []);

    // Update sliding capsule position
    useEffect(() => {
        const activeTabEl = tabRefs.current[activeTab];
        const containerEl = containerRef.current;
        if (activeTabEl && containerEl) {
            // Scroll active tab into view
            activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            
            const updatePosition = () => {
                const activeRect = activeTabEl.getBoundingClientRect();
                const containerRect = containerEl.getBoundingClientRect();
                setSliderStyle({
                    left: activeRect.left - containerRect.left + containerEl.scrollLeft,
                    width: activeRect.width,
                    height: activeRect.height,
                    opacity: 1
                });
            };

            // Wait a tiny bit for scroll to settle, or do it immediately
            updatePosition();
            const timer = setTimeout(updatePosition, 100);
            
            containerEl.addEventListener('scroll', updatePosition);
            return () => {
                clearTimeout(timer);
                containerEl.removeEventListener('scroll', updatePosition);
            };
        }
    }, [activeTab]);

    const handleResync = () => {
        window.dispatchEvent(new CustomEvent('trigger-resync'));
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 lg:pb-6 border-b border-slate-200/60 dark:border-zinc-800 gap-4 lg:gap-0">
            {/* Mobile Top Row / Desktop Logo Column */}
            <div className="flex items-center justify-between w-full lg:w-auto">
                {/* Logo */}
                <div className="flex items-center gap-1.5">
                    <span 
                        onClick={() => navigate('/dashboard')}
                        className="text-2xl font-black font-mono tracking-widest text-[#1c312e] dark:text-slate-100 select-none uppercase cursor-pointer"
                    >
                        umsy
                    </span>
                </div>

                {/* Mobile-only Right Tools container (hidden on desktop) */}
                <div className="flex lg:hidden items-center gap-2">
                    <button
                        onClick={handleResync}
                        className="cursor-pointer p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-555 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250 active:scale-95"
                        title="Resync Data"
                    >
                        <RefreshCw className="h-4.5 w-4.5" />
                    </button>

                    <button
                        onClick={() => setIsNotifOpen(true)}
                        className="cursor-pointer relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-555 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250 active:scale-95"
                    >
                        <Bell className="h-4.5 w-4.5" />
                        {studentInfo?.Messages?.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-850">
                        {studentInfo?.StudentPicture && (
                            <img
                                src={`data:image/png;base64,${studentInfo.StudentPicture}`}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 dark:ring-zinc-800"
                            />
                        )}
                        <button
                            onClick={handleLogout}
                            className="cursor-pointer p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Scrollable on Mobile, standard on Desktop) */}
            <div className="w-full lg:w-auto overflow-hidden">
                <div 
                    ref={containerRef}
                    className="relative flex items-center gap-1 bg-slate-100 dark:bg-zinc-850 p-1 rounded-full overflow-x-auto lg:overflow-hidden max-w-full no-scrollbar snap-x scroll-smooth select-none"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Sliding lime green background pill */}
                    <div 
                        className="absolute bg-[#bef227] rounded-full transition-all duration-300 ease-out shadow-sm pointer-events-none"
                        style={{
                            left: `${sliderStyle.left}px`,
                            width: `${sliderStyle.width}px`,
                            height: `${sliderStyle.height}px`,
                            opacity: sliderStyle.opacity,
                            top: '4px' // Centered within the padding
                        }}
                    />

                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                ref={el => tabRefs.current[tab.id] = el}
                                onClick={() => navigate(tab.path)}
                                className={`relative z-10 px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-300 select-none whitespace-nowrap shrink-0 ${
                                    isActive 
                                        ? 'text-[#1c312e]' 
                                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Desktop-only Right Tools (hidden on mobile) */}
            <div className="hidden lg:flex items-center gap-4">
                <button
                    onClick={handleResync}
                    className="cursor-pointer p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-555 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250 active:scale-95"
                    title="Resync Data"
                >
                    <RefreshCw className="h-4.5 w-4.5" />
                </button>

                <button
                    onClick={() => setIsNotifOpen(true)}
                    className="cursor-pointer relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250 active:scale-95"
                >
                    <Bell className="h-4.5 w-4.5" />
                    {studentInfo?.Messages?.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </button>

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-850">
                    {studentInfo?.StudentPicture && (
                        <img
                            src={`data:image/png;base64,${studentInfo.StudentPicture}`}
                            alt="Avatar"
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-zinc-800"
                        />
                    )}
                    <div className="hidden xl:flex flex-col items-start leading-tight">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                            {studentInfo?.StudentName?.split(' ')[0] || 'Student'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                            Active
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="cursor-pointer p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Mobile notification modal overlay */}
            <MobileNotificationsSheet
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                messages={studentInfo?.Messages || []}
            />
        </div>
    );
};

export default HeaderNav;
