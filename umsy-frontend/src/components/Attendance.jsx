import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Calculator, BarChart2, ChevronLeft, CalendarCheck2, TrendingUp, BookOpen, Star, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import Sidebar from './Sidebar';
import HeaderNav from './HeaderNav';
import { getAttendanceDetails } from '../services/api';
import AttendanceCalculator from './AttendanceCalculator';
import MobileAttendanceCalculator from './MobileAttendanceCalculator';

const AttendanceSkeleton = () => (
    <div className="flex-1 pb-24 px-4 pt-6 space-y-8 animate-pulse">
        {/* Circular Chart Skeleton */}
        <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 rounded-full border-[12px] border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800/80 rounded-md mb-2" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
            </div>
        </div>

        {/* Summary Stats Card Skeleton */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-5">
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800/80">
                <div className="text-center space-y-2 flex flex-col items-center justify-center">
                    <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-800/80 rounded" />
                </div>
                <div className="text-center space-y-2 flex flex-col items-center justify-center">
                    <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-800/80 rounded" />
                </div>
                <div className="text-center space-y-2 flex flex-col items-center justify-center">
                    <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-800/80 rounded" />
                </div>
            </div>
        </div>

        {/* Attendance Trend Skeleton */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <TrendingUp className="h-4 w-4 text-gray-200 dark:text-gray-800" />
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
            </div>
            <div className="h-48 w-full bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800/80 p-4 flex flex-col justify-end space-y-3">
                <div className="flex-1 border-b border-l border-gray-100 dark:border-gray-800/60 relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full text-gray-200 dark:text-gray-800/40" preserveAspectRatio="none">
                        <path d="M 0 60 Q 30 50 60 70 T 120 60 T 180 80 T 240 60 T 300 70 T 360 60 L 360 100 L 0 100 Z" fill="currentColor" opacity="0.1" />
                        <path d="M 0 60 Q 30 50 60 70 T 120 60 T 180 80 T 240 60 T 300 70 T 360 60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    </svg>
                </div>
                <div className="flex justify-between px-2">
                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-800/80 rounded" />
                    <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-800/80 rounded" />
                </div>
            </div>
        </div>

        {/* Subject Wise Attendance Skeleton */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <BookOpen className="h-4 w-4 text-gray-200 dark:text-gray-800" />
                <div className="h-4 w-44 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
            </div>

            {/* Filter pills skeleton */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                <div className="h-7 w-12 bg-gray-200 dark:bg-gray-800/80 rounded-full shrink-0" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-800/80 rounded-full shrink-0" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-800/80 rounded-full shrink-0" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-800/80 rounded-full shrink-0" />
            </div>

            {/* Subject card skeletons */}
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                                <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                            </div>
                            <div className="h-5 w-10 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                                <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800/80 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const DesktopAttendanceSkeleton = () => (
    <div className="hidden lg:block max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-6 animate-pulse">
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
                <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
            </div>
            <div className="w-32 h-16 bg-gray-200 dark:bg-gray-800/80 rounded-xl" />
        </div>

        <div className="h-11 w-full bg-gray-200 dark:bg-gray-800/80 rounded-xl" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1 pr-4">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                            <div className="h-3 w-full bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                        </div>
                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800/80 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800/80 rounded-full" />
                    </div>
                    <div className="h-8 w-full bg-gray-200 dark:bg-gray-800/80 rounded-lg" />
                </div>
            ))}
        </div>
    </div>
);

const Attendance = () => {
    const navigate = useNavigate();

    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]           = useState('');
    const [sortBy, setSortBy]         = useState('subject');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab]   = useState(() => localStorage.getItem('umsy_attendance_active_tab') || 'view');
    const [mobileTab, setMobileTab]   = useState(() => localStorage.getItem('umsy_mobile_attendance_active_tab') || 'overall');

    useEffect(() => {
        const fetchAttendance = async () => {
            const cachedData = localStorage.getItem('umsy_attendance_data');
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const seenCodes = new Set();
                    const uniqueParsed = (parsed || []).filter(item => {
                        if (seenCodes.has(item.courseCode)) return false;
                        seenCodes.add(item.courseCode);
                        return true;
                    });
                    setAttendanceData(uniqueParsed || []);
                    setLoading(false);
                    return;
                } catch { localStorage.removeItem('umsy_attendance_data'); }
            }

            const cookies = localStorage.getItem('umsy_cookies');
            if (!cookies) { setLoading(false); setAttendanceData([]); return; }

            try {
                setLoading(true);
                const result = await getAttendanceDetails(cookies);
                const rawData = result.data || [];
                const seenFetched = new Set();
                const uniqueData = rawData.filter(item => {
                    if (seenFetched.has(item.courseCode)) return false;
                    seenFetched.add(item.courseCode);
                    return true;
                });
                setAttendanceData(uniqueData);
                localStorage.setItem('umsy_attendance_data', JSON.stringify(uniqueData));
            } catch (err) { 
                setError(err.message || 'Failed to load attendance'); 
                if (err.message?.includes('session') || err.message?.includes('unauthorized')) {
                    localStorage.removeItem('umsy_cookies');
                    window.dispatchEvent(new CustomEvent('trigger-resync'));
                }
            }
            finally { setLoading(false); }
        };
        fetchAttendance();
    }, []);

    useEffect(() => { localStorage.setItem('umsy_attendance_active_tab', activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem('umsy_mobile_attendance_active_tab', mobileTab); }, [mobileTab]);

    const getPercentage = (item) => {
        if (item.summaryPercent != null) {
            const val = parseFloat(String(item.summaryPercent).replace('%', ''));
            if (!isNaN(val)) return val;
        }
        return item.totalRecords > 0 ? (item.presentCount / item.totalRecords) * 100 : 0;
    };

    const getStatus = (pct) => {
        if (pct >= 75) return { label: 'On Track', dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#10B981' };
        if (pct >= 65) return { label: 'At Risk', dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200', color: '#F59E0B' };
        return { label: 'Short', dot: 'bg-red-500', bar: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-200', color: '#EF4444' };
    };

    const overallAttendance = () => {
        try {
            const data = JSON.parse(localStorage.getItem('umsy_student_info'));
            return data?.AggAttendance || '0';
        } catch { return '0'; }
    };

    const stats = React.useMemo(() => {
        let present = 0, absent = 0, total = 0;
        attendanceData.forEach(item => {
            present += (item.presentCount || 0);
            absent += (item.absentCount || 0);
            total += (item.totalRecords || 0);
        });
        return { present, absent, total };
    }, [attendanceData]);

    const trendData = React.useMemo(() => {
        return attendanceData.map(item => ({
            subject: item.courseCode || '',
            value: Math.round(getPercentage(item)),
            Attended: item.presentCount || 0,
            Total: item.totalRecords || 0,
            DL: item.od || 0
        }));
    }, [attendanceData]);

    const rplSubjectMap = React.useMemo(() => {
        try {
            const cached = localStorage.getItem('umsy_result_data');
            if (!cached) return {};
            const parsed = JSON.parse(cached);
            const map = {};
            const goodGrades = new Set(['O', 'A+', 'A', 'B+']);
            (parsed.rplGrades || []).forEach(grp => {
                (grp.subjects || []).forEach(sub => {
                    if (sub.code && sub.grade && goodGrades.has(sub.grade.trim().toUpperCase())) {
                        map[sub.code.trim().toUpperCase()] = sub.grade.trim();
                    }
                });
            });
            return map;
        } catch { return {}; }
    }, []);

    const sortedData = [...attendanceData].sort((a, b) => {
        switch (sortBy) {
            case 'percentage': return getPercentage(b) - getPercentage(a);
            case 'lectures': return (b.totalRecords || 0) - (a.totalRecords || 0);
            default: return (a.courseCode || '').localeCompare(b.courseCode || '');
        }
    });

    const filteredData = sortedData.filter((item) => {
        if (filterStatus === 'all') return true;
        const p = getPercentage(item);
        if (filterStatus === 'good') return p >= 75;
        if (filterStatus === 'warning') return p >= 65 && p < 75;
        if (filterStatus === 'critical') return p < 65;
        return true;
    });

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-plus-jakarta">
                <Sidebar />

                <main className="flex-1 overflow-y-auto lg:p-0">
                    {/* MOBILE SKELETON */}
                    <div className="lg:hidden flex flex-col min-h-full">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Attendance</h1>
                            <div className="w-9" />
                        </div>

                        {/* Segmented Control Tabs */}
                        <div className="px-4 pt-4">
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                <div className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm">
                                    Overall
                                </div>
                                <div className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center text-gray-400">
                                    Calculator
                                </div>
                            </div>
                        </div>

                        <AttendanceSkeleton />
                    </div>

                    {/* DESKTOP SKELETON */}
                    <DesktopAttendanceSkeleton />
                </main>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW */}
            <div className="lg:hidden flex flex-col min-h-full">

                    {/* Segmented Control Tabs */}
                    <div className="px-4 pt-4">
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                            <button 
                                onClick={() => setMobileTab('overall')}
                                className={`flex-1 flex items-center justify-center py-2 rounded-xl text-[10px] font-bold transition-all ${mobileTab === 'overall' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                                Overall
                            </button>
                            <button 
                                onClick={() => setMobileTab('calculator')}
                                className={`flex-1 flex items-center justify-center py-2 rounded-xl text-[10px] font-bold transition-all ${mobileTab === 'calculator' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                                Calculator
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 pb-24 px-4 pt-6 space-y-8">
                        {mobileTab === 'calculator' ? (
                            <div className="animate-in fade-in duration-300">
                                <MobileAttendanceCalculator />
                            </div>
                        ) : (
                            <>
                                {/* Circular Chart */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative w-48 h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Attended', value: Number(overallAttendance()) },
                                                        { name: 'Total', value: 100 - Number(overallAttendance()) }
                                                    ]}
                                                    cx="50%" cy="50%"
                                                    innerRadius={65} outerRadius={85}
                                                    paddingAngle={0} 
                                                    cornerRadius={40}
                                                    dataKey="value" startAngle={90} endAngle={-270}
                                                >
                                                    <Cell fill={getStatus(Number(overallAttendance())).color} stroke="none" />
                                                    <Cell fill="#F3F4F6" className="dark:fill-gray-800" stroke="none" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-gray-900 dark:text-white">{overallAttendance()}%</span>
                                            <span className="text-[10px] font-bold text-gray-400  tracking-tighter">Overall Attendance</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Stats Card */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                                    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Present</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.present}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Absent</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.absent}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Trend */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        Attendance Trend
                                    </h3>
                                    <div className="h-48 w-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={trendData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" className="dark:stroke-zinc-800/30" />
                                                <XAxis 
                                                    dataKey="subject" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 700}} 
                                                    dy={5}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9CA3AF'}} domain={[0, 100]} />
                                                <Tooltip 
                                                    cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const d = payload[0].payload;
                                                            return (
                                                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-xl text-xs font-bold space-y-1.5 z-50">
                                                                    <p className="text-zinc-550 dark:text-zinc-400 mb-1">{d.subject}</p>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Attendance:</span>
                                                                        <span className="text-emerald-500">{d.value}%</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Classes:</span>
                                                                        <span className="text-blue-500">{d.Attended} / {d.Total}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Duty Leaves (DL):</span>
                                                                        <span className="text-amber-500">{d.DL}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={16}>
                                                    {trendData.map((entry, idx) => {
                                                        const pct = entry.value;
                                                        const color = pct >= 75 ? '#10B981' : pct >= 65 ? '#F59E0B' : '#EF4444';
                                                        return <Cell key={`cell-${idx}`} fill={color} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Subject Wise Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-emerald-500" />
                                        Subject Wise Attendance
                                    </h3>

                                    {/* Filter Controls (Moved here) */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                                        {['all', 'good', 'warning', 'critical'].map(f => (
                                            <button 
                                                key={f}
                                                onClick={() => setFilterStatus(f)}
                                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${filterStatus === f ? 'bg-gray-900 border-gray-900 text-white' : 'bg-transparent text-gray-400 border-gray-100 dark:border-gray-800'}`}
                                            >
                                                {f === 'all' ? 'All' : f === 'good' ? 'On Track' : f === 'warning' ? 'At Risk' : 'Shortage'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Detailed Subject Cards (Replacing simple list) */}
                                    <div className="space-y-3">
                                        {filteredData.map((item, index) => {
                                            const pct = getPercentage(item);
                                            const status = getStatus(pct);
                                            return (
                                                <div 
                                                    key={index} 
                                                    className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 active:scale-[0.98] transition-all" 
                                                    onClick={() => { setSelectedCourse(item); setIsModalOpen(true); }}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex-1 min-w-0 pr-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-[12px] font-bold text-gray-900 dark:text-white truncate">
                                                                    {item.courseTitle && item.courseTitle !== 'N/A' ? item.courseTitle : item.courseCode}
                                                                </h4>
                                                                {rplSubjectMap[(item.courseCode || '').trim().toUpperCase()] && (
                                                                    <span className="shrink-0 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded text-[8px] font-bold">RPL</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">{item.courseCode}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-[15px] font-black ${status.text}`}>{pct.toFixed(0)}%</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                                                            <span>{item.presentCount} / {item.totalRecords} Classes</span>
                                                            <span className={status.text}>{status.label}</span>
                                                        </div>
                                                        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${status.bar}`} 
                                                                style={{ width: `${Math.min(pct, 100)}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            {/* DESKTOP VIEW */}
            <div className="hidden lg:flex flex-col gap-6">

                    <div className="flex items-start justify-between gap-4 pt-2">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Attendance Analysis</h1>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{attendanceData.length} active courses tracked</p>
                        </div>
                        <div className="shrink-0 bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 rounded-2xl px-5 py-3 text-center shadow-sm">
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-0.5 uppercase tracking-wider font-bold">Overall Aggregate</p>
                            <p className={`text-2xl font-black ${Number(overallAttendance()) >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {overallAttendance()}%
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-zinc-800 border border-slate-200/30 rounded-full p-1.5 gap-1 max-w-sm">
                        <button onClick={() => setActiveTab('view')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'view' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>
                            <BarChart2 className="h-4.5 w-4.5" /> Attendance
                        </button>
                        <button onClick={() => setActiveTab('calculator')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'calculator' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>
                            <Calculator className="h-4.5 w-4.5" /> Calculator
                        </button>
                    </div>

                    {activeTab === 'view' ? (
                        <div className="space-y-6">
                            {/* Graphical Analysis Section for PC */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Circular gauge card */}
                                <div className="bg-white dark:bg-zinc-850 rounded-[28px] border border-slate-200/50 dark:border-zinc-800/80 p-6 flex flex-col items-center justify-center shadow-sm min-h-[220px]">
                                    <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Overall Status</h3>
                                    <div className="relative w-36 h-36">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Attended', value: Number(overallAttendance()) },
                                                        { name: 'Total', value: 100 - Number(overallAttendance()) }
                                                    ]}
                                                    cx="50%" cy="50%"
                                                    innerRadius={45} outerRadius={60}
                                                    paddingAngle={0} 
                                                    cornerRadius={40}
                                                    dataKey="value" startAngle={90} endAngle={-270}
                                                >
                                                    <Cell fill={getStatus(Number(overallAttendance())).color} stroke="none" />
                                                    <Cell fill="#F3F4F6" className="dark:fill-zinc-800" stroke="none" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">{overallAttendance()}%</span>
                                            <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Aggregate</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Trend Bar Chart card */}
                                <div className="md:col-span-2 bg-white dark:bg-zinc-850 rounded-[28px] border border-slate-200/50 dark:border-zinc-800/80 p-6 flex flex-col shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Subject-wise Attendance Overview</h3>
                                    <div className="h-36 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={trendData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" className="dark:stroke-zinc-800/30" />
                                                <XAxis 
                                                    dataKey="subject" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 700}} 
                                                    dy={5}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9CA3AF'}} domain={[0, 100]} />
                                                <Tooltip 
                                                    cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const d = payload[0].payload;
                                                            return (
                                                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-xl text-xs font-bold space-y-1.5 z-50">
                                                                    <p className="text-zinc-550 dark:text-zinc-400 mb-1">{d.subject}</p>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Attendance:</span>
                                                                        <span className="text-emerald-500">{d.value}%</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Classes:</span>
                                                                        <span className="text-blue-500">{d.Attended} / {d.Total}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <span className="text-zinc-450 font-semibold">Duty Leaves (DL):</span>
                                                                        <span className="text-amber-500">{d.DL}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={20}>
                                                    {trendData.map((entry, idx) => {
                                                        const pct = entry.value;
                                                        const color = pct >= 75 ? '#10B981' : pct >= 65 ? '#F59E0B' : '#EF4444';
                                                        return <Cell key={`cell-${idx}`} fill={color} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Subjects Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {attendanceData.map((item, index) => {
                                    const pct = getPercentage(item);
                                    const status = getStatus(pct);
                                    return (
                                        <div key={index} className="bg-white dark:bg-zinc-850 border border-slate-200/50 dark:border-zinc-800/80 rounded-[24px] p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="min-w-0 flex-1 pr-3">
                                                        <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">{item.courseCode}</h3>
                                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold mt-0.5 line-clamp-1">{item.courseTitle}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${status.badge}`}>{status.label}</span>
                                                </div>
                                                <div className="mb-4">
                                                    <div className="flex items-baseline justify-between mb-1.5">
                                                        <span className={`text-2xl font-black ${status.text}`}>{pct.toFixed(1)}%</span>
                                                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">{item.presentCount}/{item.totalRecords} classes</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => { setSelectedCourse(item); setIsModalOpen(true); }} className="w-full py-2 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700/50 text-slate-700 dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-150/40 dark:border-zinc-700 transition-colors">View Detailed Records</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <AttendanceCalculator />
                    )}
            </div>

            {/* Detail modal (shared) */}
            {isModalOpen && selectedCourse && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => { setIsModalOpen(false); setSelectedCourse(null); }}>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-gray-800">
                            <div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{selectedCourse.courseCode}</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{selectedCourse.courseTitle}</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setSelectedCourse(null); }} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                            {selectedCourse.records?.map((r, i) => (
                                <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-sm ${r.status === 'P' ? 'bg-white dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100/50 dark:border-red-900/20'}`}>
                                    <div>
                                        <p className="text-xs font-black text-gray-800 dark:text-gray-200">{r.date}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{r.time}</p>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${r.status === 'P' ? 'text-emerald-500' : 'text-red-500'}`}>{r.status === 'P' ? 'Present' : 'Absent'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Attendance;