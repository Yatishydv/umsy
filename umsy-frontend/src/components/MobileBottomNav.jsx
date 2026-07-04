import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarCheck, User, Sparkles } from 'lucide-react';

const MobileBottomNav = ({ messageCount = 0, studentPhoto = '', studentName = '' }) => {
    const location = useLocation();

    const tabs = [
        {
            name: 'Home',
            icon: LayoutDashboard,
            path: '/dashboard',
        },
        {
            name: 'Grades',
            icon: BookOpen,
            path: '/grades',
        },
        {
            name: 'AI Buddy',
            icon: Sparkles,
            path: '/ai-buddy',
            isSpecial: true,
        },
        {
            name: 'Attendance',
            icon: CalendarCheck,
            path: '/attendance',
        },
        {
            name: 'Profile',
            icon: User,
            path: '/profile',
            isProfile: true,
        },
    ];

    const handleNoticesClick = (e, tab) => {
        if (tab.scrollToMessages && location.pathname === '/dashboard') {
            e.preventDefault();
            const el = document.getElementById('mobile-messages-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const getInitials = (name) => {
        if (!name) return 'ST';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1c312e]/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-emerald-950/20 dark:border-zinc-800/80 safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-2 relative h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path;

                    if (tab.isSpecial) {
                        const isFloating = !isActive;
                        
                        return (
                            <Link
                                key={tab.name}
                                to={tab.path}
                                className={`flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFloating ? 'relative -top-5' : 'relative top-0'} group`}
                            >
                                <div className={`flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-xl ${
                                    isFloating 
                                        ? 'w-12 h-12 rounded-full bg-[#bef227] text-[#1c312e]' 
                                        : 'w-9 h-9 rounded-2xl bg-[#bef227] text-[#1c312e] shadow-emerald-500/20'
                                }`}>
                                    <Icon className={`h-5 w-5 transition-transform duration-500 ${isFloating ? 'scale-110' : 'scale-100'}`} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[10px] font-bold mt-1 transition-all duration-500 ${isActive ? 'text-[#bef227]' : 'text-slate-300 dark:text-zinc-500'}`}>
                                    {tab.name}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={tab.name}
                            to={tab.path}
                            onClick={(e) => {
                                if (tab.scrollToMessages) handleNoticesClick(e, tab);
                            }}
                            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 group"
                            style={{ minWidth: 64 }}
                        >
                            {/* Profile tab shows avatar */}
                            {tab.isProfile ? (
                                <div className={`w-7 h-7 rounded-full overflow-hidden ring-2 transition-all ${isActive ? 'ring-[#bef227]' : 'ring-emerald-800/40 dark:ring-zinc-700'}`}>
                                    {studentPhoto ? (
                                        <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#bef227] text-[#1c312e] flex items-center justify-center text-[9px] font-bold">
                                            {getInitials(studentName)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#bef227]/20' : 'group-hover:bg-emerald-900/20 dark:group-hover:bg-zinc-900'}`}>
                                        <Icon
                                            className={`h-5 w-5 transition-colors duration-200 ${isActive ? 'text-[#bef227]' : 'text-slate-300 dark:text-zinc-500 group-hover:text-slate-200 dark:group-hover:text-zinc-300'}`}
                                            strokeWidth={isActive ? 2.2 : 1.8}
                                        />
                                    </div>
                                    {/* Badge */}
                                    {tab.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-500 rounded-full leading-none">
                                            {tab.badge > 9 ? '9+' : tab.badge}
                                        </span>
                                    )}
                                </div>
                            )}

                            <span
                                className={`text-[10px] font-bold leading-none transition-colors duration-200 ${isActive ? 'text-[#bef227]' : 'text-slate-300 dark:text-zinc-500'}`}
                            >
                                {tab.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
