import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, BookOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { getSeatingPlan } from '../services/api';

const SeatingPlan = () => {
    const navigate = useNavigate();
    const [seatingPlan, setSeatingPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');

    const normalizeEntry = (exam) => ({
        date: exam.date || exam.Date || '',
        courseCode: exam.courseCode || exam.CourseCode || exam.col0 || '',
        courseName: exam.courseName || exam.CourseName || exam.Subject || exam.col1 || '',
        status: exam.status || exam.Status || '',
        exam: exam.exam || exam.Exam || exam['exam type'] || '',
        room: exam.room || exam.Room || exam['room no'] || exam.RoomNo || '',
        reportingTime: exam.reportingTime || exam.ReportingTime || exam.Time || exam['reporting time'] || '',
        seatNo: exam.seatNo || exam.SeatNo || exam.Seat || exam['seat no'] || '',
        dutyId: exam.dutyId || exam.DutyID || exam.DutyId || '',
    });

    const fetchSeating = async (force = false) => {
        const cookies = localStorage.getItem('umsy_cookies');
        const reg = localStorage.getItem('umsy_regno');
        
        if (!cookies && !reg) {
            setLoading(false);
            return;
        }

        if (force) {
            setIsSyncing(true);
        } else {
            setLoading(true);
        }
        setError('');

        try {
            // First load from localStorage cache if non-empty
            const cached = localStorage.getItem('umsy_seating_plan');
            if (cached && !force) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSeatingPlan(parsed);
                        setLoading(false);
                        return;
                    }
                } catch (e) { /* ignore parse error */ }
            }

            // Call Seating Plan API
            const res = await getSeatingPlan(cookies, force);
            if (res.success && res.data) {
                setSeatingPlan(res.data);
                localStorage.setItem('umsy_seating_plan', JSON.stringify(res.data));
            } else {
                setError(res.error || 'Failed to fetch seating plan');
            }
        } catch (err) {
            console.error('Error fetching seating plan:', err);
            setError(err.message || 'Error occurred while loading seating plan');
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchSeating();
    }, []);

    const handleSync = () => {
        fetchSeating(true);
    };

    return (
        <main className="flex-1 p-4 lg:p-10 pb-24 lg:pb-10 bg-[#f6f8fa] dark:bg-zinc-950 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-8 w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Seating Plan</h1>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your official exam seating and timing details</p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-800 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4.5 w-4.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-bold hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-3 border-zinc-900 dark:border-white/20 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 animate-pulse">Loading exam schedules...</p>
                    </div>
                ) : error ? (
                    <div className="p-6 bg-red-50 dark:bg-red-500/5 rounded-3xl border border-red-200/50 dark:border-red-500/10 flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-800 dark:text-red-400 text-sm">Failed to Load</h3>
                            <p className="text-xs text-red-650 dark:text-red-400/80 mt-1">{error}</p>
                            <button
                                onClick={() => fetchSeating(true)}
                                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                                Retry Fetching
                            </button>
                        </div>
                    </div>
                ) : !seatingPlan || seatingPlan.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-10 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 rounded-3xl shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                            <MapPin className="h-10 w-10 text-slate-350 dark:text-zinc-500" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">No Exams Found</h4>
                        <p className="text-sm text-gray-400 dark:text-zinc-500 mt-2 leading-relaxed max-w-sm">
                            We couldn't find any upcoming seating plans for your account. If you have active exams, click Refresh to fetch live from UMS.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Information Banner */}
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <p className="leading-relaxed">
                                <strong>Date Sheet Overview:</strong> Exam schedules are fetched directly from UMS. If room or seating details show <em>"Awaited"</em>, UMS releases exact room allocations closer to exam dates.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            {(() => {
                                // Deduplicate by courseCode
                                const uniqueEntries = seatingPlan.reduce((acc, current) => {
                                    const exam = normalizeEntry(current);
                                    const key = exam.courseCode || JSON.stringify(exam);
                                    if (!acc.has(key)) acc.set(key, exam);
                                    else {
                                        // Merge details if key exists
                                        const existing = acc.get(key);
                                        if (!existing.date && exam.date) existing.date = exam.date;
                                        if (!existing.reportingTime && exam.reportingTime) existing.reportingTime = exam.reportingTime;
                                        if (!existing.room && exam.room) existing.room = exam.room;
                                        if (!existing.exam && exam.exam) existing.exam = exam.exam;
                                    }
                                    return acc;
                                }, new Map());

                                return Array.from(uniqueEntries.values()).map((exam, idx) => {
                                    const isAwaited = !exam.room || exam.instructionAwaited;

                                    return (
                                        <div
                                            key={idx}
                                            className="p-6 sm:p-7 rounded-[32px] bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 space-y-5"
                                        >
                                            {/* Header Row */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                                        <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {exam.courseCode || 'Examination'}
                                                        </h3>
                                                        {exam.courseName && (
                                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                                                                {exam.courseName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {exam.status && (
                                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold rounded-full uppercase tracking-wider">
                                                            {exam.status}
                                                        </span>
                                                    )}
                                                    {exam.exam && (
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-full">
                                                            {exam.exam}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                                {/* Date */}
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/50 border border-slate-100 dark:border-zinc-800 flex items-center gap-3">
                                                    <Calendar className="w-5 h-5 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Date</p>
                                                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                                            {exam.date || 'Date Awaited'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Time */}
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/50 border border-slate-100 dark:border-zinc-800 flex items-center gap-3">
                                                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Time</p>
                                                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                                            {exam.reportingTime && exam.reportingTime.length < 25
                                                                ? exam.reportingTime
                                                                : 'Time Awaited'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Room */}
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/50 border border-slate-100 dark:border-zinc-800 flex items-center gap-3">
                                                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Room / Seat</p>
                                                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                                            {exam.room ? `Room: ${exam.room}` : 'Instruction Awaited'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status / Awaited Note */}
                                            {isAwaited && (
                                                <div className="pt-2 text-[11px] text-slate-450 dark:text-zinc-500 font-medium flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                    <span>Room assignment and entry instructions are pending release on UMS. Check back prior to exam.</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SeatingPlan;
