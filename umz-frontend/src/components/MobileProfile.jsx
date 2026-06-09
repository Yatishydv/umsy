import React from 'react';
import { User, GraduationCap, Lock, Bell, Shield, LogOut, ChevronRight, Menu, Award, ChevronLeft, Mail, Phone } from 'lucide-react';

const MobileProfile = ({ studentInfo, onLogout, onNavigate }) => {
    const [activeSubView, setActiveSubView] = React.useState(null);
    const [notifStatus, setNotifStatus] = React.useState('Notification' in window ? Notification.permission : 'denied');
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const [toast, setToast] = React.useState('');

    const showDevToast = () => {
        setToast('Feature under development.');
        setTimeout(() => setToast(''), 3000);
    };

    const requestPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotifStatus(permission);
        if (permission === 'granted') {
            new Notification('Notifications Active!', {
                body: 'You will now receive real-time updates.',
                icon: '/favicon.ico'
            });
        }
    };

    const menuItems = [
        { icon: User, label: 'Personal Information', color: 'text-gray-400', subView: 'personal' },
        // { icon: GraduationCap, label: 'Academic Information', color: 'text-gray-400', subView: 'academic' },
        { icon: Lock, label: 'Change Password', color: 'text-gray-400', action: showDevToast },
        { 
            icon: Bell, 
            label: 'Notification Settings', 
            color: notifStatus === 'granted' ? 'text-emerald-500' : 'text-gray-400',
            action: requestPermission,
            badge: notifStatus === 'granted' ? 'Active' : 'Off'
        },
        { icon: Shield, label: 'Privacy Policy', color: 'text-gray-400', action: showDevToast },
        { icon: LogOut, label: 'Logout', color: 'text-red-500', isLogout: true }
    ];

    if (activeSubView === 'personal') {
        const details = [
            { label: 'Full Name', value: studentInfo?.name, icon: User },
            { label: 'Registration No', value: studentInfo?.rollNo, icon: Shield },
            { label: 'Roll Number', value: studentInfo?.actualRollNo, icon: Award },
            { label: 'Programme', value: studentInfo?.programme, icon: GraduationCap },
            { label: 'Section', value: studentInfo?.section || 'N/A', icon: Menu },
            { label: 'Email Address', value: studentInfo?.email, icon: Mail },
            { label: 'Mobile Number', value: studentInfo?.mobile || 'Not provided', icon: Phone }
        ];

        return (
            <div className="min-h-screen bg-[#fdfdfd] dark:bg-gray-950 pb-20 animate-in slide-in-from-right duration-500">
                <div className="bg-[#111827] pt-14 pb-20 px-6 rounded-b-[3rem] relative">
                    <button onClick={() => setActiveSubView(null)} className="flex items-center gap-2 text-white/50 mb-6 active:scale-95 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Personal Details</h2>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">Official Academic Records</p>
                </div>

                <div className="px-4 sm:px-6 -mt-10 space-y-3 relative z-10 pb-8">
                    {details.map((detail, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-900 p-4 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-start gap-4 active:scale-[0.99] transition-transform">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                <detail.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-[0.12em] sm:tracking-[0.15em] mb-0.5">{detail.label}</p>
                                <p className="text-[12px] sm:text-[13px] font-semibold text-gray-900 dark:text-white break-words leading-relaxed">{detail.value || 'Not provided'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfdfd] dark:bg-gray-950 pb-20 animate-in fade-in duration-500">
            {/* Dark Header */}
            <div className="bg-[#111827] pt-12 pb-20 px-6 rounded-b-[3rem] relative overflow-hidden">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -ml-32 -mb-32" />

                <div className="relative flex items-center justify-between mb-8">
                    <button className="w-10 h-10 flex items-center justify-center text-white/80">
                        {/* <Menu className="w-6 h-6" /> */}
                    </button>
                    <div className="relative">
                        <button className="w-10 h-10 flex items-center justify-center text-white/80">
                            {/* <Bell className="w-6 h-6" /> */}
                        </button>
                        {/* <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-[#111827] rounded-full" /> */}
                    </div>
                </div>

                <div className="relative flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full border-4 border-white/10 p-1 mb-4 shadow-2xl">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                            <img
                                src={studentInfo?.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=Student"}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1 tracking-tight">
                        {studentInfo?.name || "Student"}
                    </h2>
                    <p className="text-[11px] font-medium text-white/40  tracking-[0.2em]">
                        {studentInfo?.rollNo || "00000000"}
                    </p>
                    <p className="text-[11px] font-medium text-white/40  tracking-[0.2em]">
                        {studentInfo?.programme}
                    </p>
                </div>
            </div>

            {/* Menu Section */}
            <div className="px-6 -mt-10 relative z-10">
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden border border-gray-100/50 dark:border-gray-800">
                    <div className="p-2">
                        {menuItems.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (item.isLogout) setShowLogoutConfirm(true);
                                    else if (item.action) item.action();
                                    else if (item.subView) setActiveSubView(item.subView);
                                    else onNavigate?.(item.label);
                                }}
                                className="w-full group flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${item.isLogout ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                        <item.icon className={`w-5 h-5 ${item.color}`} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className={`text-[14px] font-medium tracking-tight ${item.isLogout ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${item.badge === 'Active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowLogoutConfirm(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mx-auto mb-6">
                            <LogOut className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Logout</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 px-2">Are you sure you want to end your session?</p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={onLogout}
                                className="w-full h-14 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                            >
                                Yes, Logout
                            </button>
                            <button 
                                onClick={() => setShowLogoutConfirm(false)}
                                className="w-full h-14 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-bold active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Development Toast */}
            {toast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl shadow-blue-600/20 animate-in slide-in-from-top-full duration-300">
                    {toast}
                </div>
            )}
        </div>
    );
};

export default MobileProfile;
