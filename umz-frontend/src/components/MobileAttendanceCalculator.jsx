import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Briefcase, ChevronDown, BookOpen, Target, Trash2, RotateCcw, Settings, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const MobileAttendanceCalculator = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [courseInputs, setCourseInputs] = useState({});
    const [overallAttendance, setOverallAttendance] = useState(0);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [globalDates, setGlobalDates] = useState(() => {
        const cached = localStorage.getItem('umz_mobile_calc_global_dates');
        return cached ? JSON.parse(cached) : {
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
        };
    });

    useEffect(() => {
        localStorage.setItem('umz_mobile_calc_global_dates', JSON.stringify(globalDates));
    }, [globalDates]);

    useEffect(() => {
        if (Object.keys(courseInputs).length > 0) {
            localStorage.setItem('umz_mobile_calc_inputs', JSON.stringify(courseInputs));
        }
    }, [courseInputs]);

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

    const applyGlobalDates = () => {
        setCourseInputs(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(code => {
                updated[code] = {
                    ...updated[code],
                    startDate: globalDates.startDate,
                    endDate: globalDates.endDate
                };
            });
            return updated;
        });
        setShowGlobalSettings(false);
    };

    const removeSubject = (courseCode) => {
        setAttendanceData(prev => prev.filter(item => item.courseCode !== courseCode));
    };

    useEffect(() => {
        // Fetch official overall attendance from student info
        const studentInfoRaw = localStorage.getItem('umz_student_info');
        if (studentInfoRaw) {
            try {
                const info = JSON.parse(studentInfoRaw);
                const agg = parseFloat(info.AggAttendance || 0);
                setOverallAttendance(agg);
            } catch (e) {
                console.error("Error parsing student info", e);
            }
        }

        const cachedData = localStorage.getItem('umz_attendance_data');
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const seenCodes = new Set();
            const unique = (parsed || []).filter(item => {
                if (seenCodes.has(item.courseCode)) return false;
                seenCodes.add(item.courseCode);
                return true;
            });
            setAttendanceData(unique);

            // Try to load cached inputs
            const cachedInputs = localStorage.getItem('umz_mobile_calc_inputs');
            let initialInputs = {};
            if (cachedInputs) {
                try { initialInputs = JSON.parse(cachedInputs); } catch (e) { }
            }

            unique.forEach(item => {
                if (!initialInputs[item.courseCode]) {
                    const currentPct = item.summaryPercent
                        ? parseFloat(item.summaryPercent.replace('%', ''))
                        : (item.totalRecords > 0 ? ((item.presentCount + (parseInt(item.od) || 0)) / item.totalRecords) * 100 : 0);

                    initialInputs[item.courseCode] = {
                        target: Math.max(75, Math.ceil(currentPct)),
                        lecturesPerWeek: 4,
                        startDate: globalDates.startDate,
                        endDate: globalDates.endDate
                    };
                }
            });
            setCourseInputs(initialInputs);
        }
        setLoading(false);
    }, []);

    const calculateResults = (subject) => {
        const input = courseInputs[subject.courseCode];
        if (!input) return null;

        const present = (subject.presentCount || 0) + (parseInt(subject.od) || 0);
        const total = subject.totalRecords || 0;
        const lecturesPerWeek = parseInt(input.lecturesPerWeek) || 4;
        const target = parseFloat(input.target) || 75;

        // Calculate weeks left from dates
        let weeksLeft = 0;
        if (input.startDate && input.endDate) {
            const start = new Date(input.startDate);
            const end = new Date(input.endDate);
            const today = new Date();
            const effectiveStart = today > start ? today : start;
            const diffTime = end.getTime() - effectiveStart.getTime();
            weeksLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
        }

        const classesLeft = weeksLeft * lecturesPerWeek;
        const totalFutureClasses = total + classesLeft;
        const currentPct = total > 0 ? (present / total) * 100 : 0;

        const maxPossible = totalFutureClasses > 0 ? ((present + classesLeft) / totalFutureClasses) * 100 : 0;
        const minPossible = totalFutureClasses > 0 ? (present / totalFutureClasses) * 100 : 0;

        let mustAttend = 0;
        let canBunk = 0;
        let achievable = target >= minPossible && target <= maxPossible;

        if (achievable) {
            const minNeeded = Math.ceil((target * totalFutureClasses / 100) - present);
            mustAttend = Math.max(0, minNeeded);
            canBunk = Math.max(0, classesLeft - mustAttend);
        }

        return {
            currentPct,
            maxPossible,
            minPossible,
            mustAttend,
            canBunk,
            classesLeft,
            weeksLeft,
            target,
            achievable,
            isAboveTarget: currentPct >= target
        };
    };

    const overallStats = React.useMemo(() => {
        let total = 0, attended = 0, od = 0;
        attendanceData.forEach(item => {
            total += (item.totalRecords || 0);
            attended += (item.presentCount || 0);
            od += (parseInt(item.od) || 0);
        });
        const pct = total > 0 ? ((attended + od) / total) * 100 : 0;
        return { total, attended, od, pct };
    }, [attendanceData]);

    const realAttendence = localStorage.getItem('umz_student_info')

    if (loading) return null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Minimal Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-7 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowGlobalSettings(true);
                    }}
                    className="absolute top-3 right-3 p-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-500 dark:text-gray-400 active:bg-blue-50 dark:active:bg-blue-900/30 active:text-blue-600 transition-all z-20 shadow-sm"
                >
                    <Settings className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Overall Attendance</p>
                        <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">{overallAttendance.toFixed(2)}%</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`w-2 h-2 rounded-full ${overallAttendance >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                {overallAttendance >= 75 ? 'On track' : 'Action required'}
                            </p>
                        </div>
                    </div>
                    <div className="relative w-20 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { value: overallAttendance },
                                        { value: 100 - overallAttendance }
                                    ]}
                                    innerRadius={30}
                                    outerRadius={40}
                                    paddingAngle={0}
                                    cornerRadius={40}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                >
                                    <Cell fill={overallAttendance >= 75 ? '#10B981' : '#F59E0B'} stroke="none" />
                                    <Cell fill="#F3F4F6" className="dark:fill-gray-700" stroke="none" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-900 dark:text-white">{Math.round(overallAttendance)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Settings Modal */}
            {showGlobalSettings && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Global Settings</h3>
                            <button onClick={() => setShowGlobalSettings(false)} className="p-2 text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                Set default dates for all subjects. Individual subject settings will be updated.
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Default Start Date</label>
                                    <input
                                        type="date"
                                        value={globalDates.startDate}
                                        onChange={(e) => setGlobalDates(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Default End Date</label>
                                    <input
                                        type="date"
                                        value={globalDates.endDate}
                                        onChange={(e) => setGlobalDates(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={applyGlobalDates}
                                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-gray-900/10 active:scale-[0.98] transition-all mt-4"
                            >
                                Apply to All Subjects
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subtle Summary Row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total', value: overallStats.total, icon: Calendar, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/50' },
                    { label: 'Attended', value: overallStats.attended, icon: CheckSquare, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/50' },
                    { label: 'Duty L.', value: overallStats.od, icon: Briefcase, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
                        <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-2.5 ${stat.color}`}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Refined Courses List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subjects List</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-gray-400 active:text-blue-500 transition-all"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase">Reset</span>
                    </button>
                </div>
                {attendanceData.map((course, idx) => {
                    const isExpanded = expandedCourse === course.courseCode;
                    const results = calculateResults(course);
                    if (!results) return null;

                    return (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all">
                            <button
                                onClick={() => setExpandedCourse(isExpanded ? null : course.courseCode)}
                                className="w-full p-5 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        {rplSubjectMap[(course.courseCode || '').trim().toUpperCase()] && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-md text-[8px] font-bold tracking-tight mb-1">
                                                🏅 RPL · Grade {rplSubjectMap[(course.courseCode || '').trim().toUpperCase()]}
                                            </span>
                                        )}
                                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{course.courseCode}</h4>
                                        <p className="text-[9px] font-medium text-gray-400 truncate max-w-[140px] uppercase tracking-tighter">{course.courseTitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-bold ${results.currentPct >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {results.currentPct.toFixed(1)}%
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSubject(course.courseCode); }}
                                            className="p-2 text-gray-300 active:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-5 pb-6 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="h-px bg-gray-50 dark:bg-gray-700/50 w-full" />

                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { l: 'Attended', v: course.presentCount },
                                            { l: 'Total', v: course.totalRecords },
                                            { l: 'Duty L.', v: course.od || 0 }
                                        ].map((s, i) => (
                                            <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl text-center border border-gray-100/50 dark:border-gray-800">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">{s.l}</p>
                                                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{s.v}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 px-1">
                                        {[
                                            { l: 'Weeks Left', v: results.weeksLeft, c: 'text-gray-900 dark:text-white' },
                                            { l: 'Classes Left', v: results.classesLeft, c: 'text-blue-500' },
                                            { l: 'Can Bunk', v: results.canBunk, c: results.canBunk > 0 ? 'text-emerald-500' : 'text-red-500' }
                                        ].map((s, i) => (
                                            <div key={i} className="text-center">
                                                <p className="text-[9px] font-bold text-gray-300 uppercase mb-0.5">{s.l}</p>
                                                <p className={`text-lg font-semibold ${s.c}`}>{s.v}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Guidance</p>
                                            <span className="text-[9px] font-bold text-blue-500 uppercase">Target: {results.target}%</span>
                                        </div>
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {results.achievable
                                                ? `Attend at least ${results.mustAttend} out of ${results.classesLeft} classes`
                                                : `Goal unreachable (Max: ${results.maxPossible.toFixed(1)}%)`}
                                        </p>
                                        {results.achievable && (
                                            <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${(results.currentPct / results.target) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-gray-400 uppercase px-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={courseInputs[course.courseCode].startDate}
                                                onChange={(e) => setCourseInputs(prev => ({
                                                    ...prev,
                                                    [course.courseCode]: { ...prev[course.courseCode], startDate: e.target.value }
                                                }))}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-gray-400 uppercase px-1">End Date</label>
                                            <input
                                                type="date"
                                                value={courseInputs[course.courseCode].endDate}
                                                onChange={(e) => setCourseInputs(prev => ({
                                                    ...prev,
                                                    [course.courseCode]: { ...prev[course.courseCode], endDate: e.target.value }
                                                }))}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-gray-400 uppercase px-1">Lec/Wk</label>
                                            <input
                                                type="number"
                                                value={courseInputs[course.courseCode].lecturesPerWeek}
                                                onChange={(e) => setCourseInputs(prev => ({
                                                    ...prev,
                                                    [course.courseCode]: { ...prev[course.courseCode], lecturesPerWeek: e.target.value }
                                                }))}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-gray-400 uppercase px-1">Target %</label>
                                            <input
                                                type="number"
                                                value={courseInputs[course.courseCode].target}
                                                onChange={(e) => setCourseInputs(prev => ({
                                                    ...prev,
                                                    [course.courseCode]: { ...prev[course.courseCode], target: e.target.value }
                                                }))}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="h-4" /> {/* Footer Spacer */}
        </div>
    );
};

export default MobileAttendanceCalculator;
