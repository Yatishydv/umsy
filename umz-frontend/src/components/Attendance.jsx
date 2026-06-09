import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Calculator, BarChart2, ChevronLeft, CalendarCheck2, TrendingUp, BookOpen, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import Sidebar from './Sidebar';
import { getAttendanceDetails } from '../services/api';
import AttendanceCalculator from './AttendanceCalculator';
import MobileAttendanceCalculator from './MobileAttendanceCalculator';

const Attendance = () => {
    const navigate = useNavigate();

    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]           = useState('');
    const [sortBy, setSortBy]         = useState('subject');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab]   = useState(() => localStorage.getItem('umz_attendance_active_tab') || 'view');
    const [mobileTab, setMobileTab]   = useState(() => localStorage.getItem('umz_mobile_attendance_active_tab') || 'overall');

    useEffect(() => {
        const fetchAttendance = async () => {
            const cachedData = localStorage.getItem('umz_attendance_data');
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
                } catch { localStorage.removeItem('umz_attendance_data'); }
            }

            const cookies = localStorage.getItem('umz_cookies');
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
                localStorage.setItem('umz_attendance_data', JSON.stringify(uniqueData));
            } catch (err) { setError(err.message || 'Failed to load attendance'); }
            finally { setLoading(false); }
        };
        fetchAttendance();
    }, []);

    useEffect(() => { localStorage.setItem('umz_attendance_active_tab', activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem('umz_mobile_attendance_active_tab', mobileTab); }, [mobileTab]);

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
            const data = JSON.parse(localStorage.getItem('umz_student_info'));
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
            value: Math.round(getPercentage(item))
        }));
    }, [attendanceData]);

    const rplSubjectMap = React.useMemo(() => {
        try {
            const cached = localStorage.getItem('umz_result_data');
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
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                        <p className="mt-3 text-sm text-gray-400">Loading attendance…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-plus-jakarta">
            <Sidebar />

            <main className="flex-1 overflow-y-auto lg:p-0">
                {/* MOBILE VIEW */}
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
                                            <AreaChart data={trendData} margin={{ left: 15, right: 15, top: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                                <XAxis 
                                                    dataKey="subject" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 10, fill: '#9CA3AF', fontWeight: 600}} 
                                                    dy={10} 
                                                    padding={{ left: 10, right: 10 }}
                                                />
                                                <YAxis hide domain={[0, 100]} />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                                    cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </AreaChart>
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
                <div className="hidden lg:block max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{attendanceData.length} subjects tracked</p>
                        </div>
                        <div className="shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-center shadow-sm">
                            <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider font-medium">Overall</p>
                            <p className={`text-2xl font-bold ${Number(overallAttendance()) >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {overallAttendance()}%
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 gap-1">
                        <button onClick={() => setActiveTab('view')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'view' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>
                            <BarChart2 className="h-4 w-4" /> Attendance
                        </button>
                        <button onClick={() => setActiveTab('calculator')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'calculator' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>
                            <Calculator className="h-4 w-4" /> Calculator
                        </button>
                    </div>

                    {activeTab === 'view' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {attendanceData.map((item, index) => {
                                const pct = getPercentage(item);
                                const status = getStatus(pct);
                                return (
                                    <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="min-w-0 flex-1 pr-3">
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{item.courseCode}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.courseTitle}</p>
                                            </div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status.badge}`}>{status.label}</span>
                                        </div>
                                        <div className="mb-4">
                                            <div className="flex items-baseline justify-between mb-1.5">
                                                <span className={`text-2xl font-bold ${status.text}`}>{pct.toFixed(2)}%</span>
                                                <span className="text-xs text-gray-400">{item.presentCount}/{item.totalRecords} classes</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedCourse(item); setIsModalOpen(true); }} className="w-full py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-lg border border-gray-100 dark:border-gray-600">View Detailed Records</button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <AttendanceCalculator />
                    )}
                </div>
            </main>

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
        </div>
    );
};

export default Attendance;