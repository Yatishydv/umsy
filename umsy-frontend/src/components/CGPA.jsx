import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Calculator, BookOpen, ChevronDown, ChevronUp, ChevronLeft, GraduationCap, TrendingUp, Star, Award, BarChart3, Zap } from 'lucide-react';
import { getStudentInfo, getResult, getMarks } from '../services/api';
import TPGACalculator from './TPGACalculator';
import OverallCGPACalculator from './OverallCGPACalculator';
import MobileCalculator from './MobileCalculator';

const gradeColorMap = {
    'O':  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: '#10B981' },
    'A+': { bg: 'bg-[#bef227]/10', text: 'text-[#bef227]', border: 'border-[#bef227]/20', dot: '#bef227' },
    'A':  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: '#3B82F6' },
    'B+': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: '#8B5CF6' },
    'B':  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: '#F59E0B' },
    'C+': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: '#F97316' },
    'C':  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: '#FB7185' },
    'D':  { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', dot: '#71717A' },
    'E':  { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: '#EF4444' },
    'F':  { bg: 'bg-red-600/10', text: 'text-red-500', border: 'border-red-600/20', dot: '#DC2626' },
    'P':  { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: '#14B8A6' },
};
const gradeStyle = (g) => gradeColorMap[g] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', dot: '#6B7280' };

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const tgpaVal = payload.find(p => p.dataKey === 'tgpa')?.value;
        const cgpaVal = payload.find(p => p.dataKey === 'cgpa')?.value;
        return (
            <div className="bg-[#1c312e] text-white p-3.5 rounded-2xl border border-white/10 shadow-xl text-[10px] font-black uppercase tracking-wider space-y-2 min-w-[125px]">
                <p className="text-slate-400 border-b border-white/5 pb-1 font-extrabold">{label}</p>
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        TGPA:
                    </span>
                    <span className="text-white font-black">{tgpaVal !== undefined ? parseFloat(tgpaVal).toFixed(2) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-bold text-[#bef227]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#bef227]" />
                        CGPA:
                    </span>
                    <span className="text-[#bef227] font-black">{cgpaVal !== undefined ? parseFloat(cgpaVal).toFixed(2) : '—'}</span>
                </div>
            </div>
        );
    }
    return null;
};

const PerformanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1c312e] text-white p-3 rounded-2xl border border-white/10 shadow-xl text-[10px] font-black uppercase tracking-wider space-y-1.5 min-w-[110px]">
                <p className="text-slate-400 border-b border-white/5 pb-1 font-extrabold">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 font-bold" style={{ color: p.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}:
                        </span>
                        <span style={{ color: p.color }} className="font-black">{p.value}%</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/* ─── Skeleton ─── */
const CGPASkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800" />
            <div className="space-y-2">
                <div className="h-5 w-48 bg-zinc-800 rounded-xl" />
                <div className="h-3 w-32 bg-zinc-800/60 rounded-lg" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1 h-48 bg-zinc-800/50 rounded-3xl" />
            <div className="lg:col-span-4 h-72 bg-zinc-800/50 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-zinc-800/50 rounded-3xl" />
            <div className="h-80 bg-zinc-800/50 rounded-3xl" />
        </div>
    </div>
);

const CGPA = () => {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [marksData, setMarksData] = useState([]);
    const [expandedTerms, setExpandedTerms] = useState({});
    const [loading, setLoading] = useState(true);
    const [resultLoading, setResultLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('umsy_cgpa_active_tab') || 'view');
    const [mobileTab, setMobileTab] = useState(() => localStorage.getItem('umsy_cgpa_mobile_tab') || 'overall');
    const [calcMode, setCalcMode] = useState(() => localStorage.getItem('umsy_cgpa_calc_mode') || 'term');

    useEffect(() => { localStorage.setItem('umsy_cgpa_mobile_tab', mobileTab); }, [mobileTab]);

    const fetchResultData = async (force = false) => {
        if (!force) {
            const cached = localStorage.getItem('umsy_result_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setResultData(parsed);
                    const exp = {};
                    (parsed.semesters || []).forEach(s => { exp[s.termId] = false; });
                    (parsed.rplGrades || []).forEach(g => { exp['rpl_' + g.termId] = false; });
                    setExpandedTerms(exp);
                    return;
                } catch { localStorage.removeItem('umsy_result_data'); }
            }
        }
        const cookies = localStorage.getItem('umsy_cookies');
        if (!cookies) return;
        try {
            setResultLoading(true);
            const res = await getResult(cookies);
            setResultData(res.data);
            localStorage.setItem('umsy_result_data', JSON.stringify(res.data));
            const exp = {};
            (res.data.semesters || []).forEach(s => { exp[s.termId] = false; });
            (res.data.rplGrades || []).forEach(g => { exp['rpl_' + g.termId] = false; });
            setExpandedTerms(exp);
        } catch (e) { console.error('Result fetch error:', e.message); }
        finally { setResultLoading(false); }
    };

    const fetchMarksData = async () => {
        const cached = localStorage.getItem('umsy_marks_data');
        if (cached) {
            try { setMarksData(JSON.parse(cached)); return; } 
            catch { localStorage.removeItem('umsy_marks_data'); }
        }
        const cookies = localStorage.getItem('umsy_cookies');
        if (!cookies) return;
        try {
            const res = await getMarks(cookies);
            setMarksData(res.data || []);
            localStorage.setItem('umsy_marks_data', JSON.stringify(res.data || []));
        } catch (e) { console.warn('Marks fetch failed:', e.message); }
    };

    useEffect(() => {
        const fetchData = async () => {
            const cachedInfo = localStorage.getItem('umsy_student_info');
            if (cachedInfo) {
                try {
                    setStudentInfo(JSON.parse(cachedInfo));
                    setLoading(false);
                } catch { localStorage.removeItem('umsy_student_info'); }
            }
            const cookies = localStorage.getItem('umsy_cookies');
            if (!cookies) { setLoading(false); return; }
            if (!cachedInfo) {
                try {
                    setLoading(true);
                    const result = await getStudentInfo(cookies);
                    setStudentInfo(result.data);
                    localStorage.setItem('umsy_student_info', JSON.stringify(result.data));
                } catch (err) {
                    setError(err.message || 'Failed to load CGPA data');
                } finally { setLoading(false); }
            }
        };
        fetchData();
        fetchResultData();
        fetchMarksData();
    }, [navigate]);

    useEffect(() => { localStorage.setItem('umsy_cgpa_active_tab', activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem('umsy_cgpa_calc_mode', calcMode); }, [calcMode]);

    /* ── Cross-term performance data (from /marks) ── */
    const crossTermData = marksData
        .filter(term => /^\d+$/.test(term.termId) && term.termId.length >= 6)
        .map(term => {
            const tid = String(term.termId);
            const year = parseInt(tid[0]);
            const semInYear = parseInt(tid[tid.length - 1]);
            const semNum = (year - 1) * 2 + (semInYear === 1 ? 1 : 2);
            const toRoman = (n) => ({ 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' }[n] || n);
            const assessmentAvgs = {};
            if (term.subjects && term.subjects.length > 0) {
                term.subjects.forEach(subject => {
                    subject.marksBreakdown.forEach(mark => {
                        let typeName = mark.type;
                        if (typeName.toLowerCase().includes('attendance')) typeName = 'Attendance';
                        else if (typeName.toLowerCase().includes('continuous')) typeName = 'CA';
                        else if (typeName.toLowerCase().includes('mid')) typeName = 'Mid Term';
                        else if (typeName.toLowerCase().includes('practical') && typeName.toLowerCase().includes('end')) typeName = 'Practical';
                        else if (typeName.toLowerCase().includes('end')) typeName = 'End Term';
                        if (!assessmentAvgs[typeName]) assessmentAvgs[typeName] = { total: 0, count: 0 };
                        const marksMatch = String(mark.marks || '').match(/(\d+\.?\d*)\/(\d+\.?\d*)/);
                        if (marksMatch) {
                            const obtained = parseFloat(marksMatch[1]);
                            const outOf = parseFloat(marksMatch[2]);
                            const percentage = outOf > 0 ? (obtained / outOf) * 100 : 0;
                            if (!isNaN(percentage)) {
                                assessmentAvgs[typeName].total += percentage;
                                assessmentAvgs[typeName].count += 1;
                            }
                        }
                    });
                });
            }
            const termData = { term: term.termId, semNum, name: `Sem ${toRoman(semNum)}` };
            Object.keys(assessmentAvgs).forEach(type => {
                termData[type] = Math.round(assessmentAvgs[type].total / assessmentAvgs[type].count);
            });
            return termData;
        }).sort((a, b) => a.semNum - b.semNum);

    const assessmentTypes = crossTermData.length > 0
        ? [...new Set(crossTermData.flatMap(term => Object.keys(term).filter(key => key !== 'term' && key !== 'name' && key !== 'semNum')))]
        : [];

    const lineColors = {
        'Attendance': '#10B981',
        'CA': '#3B82F6',
        'Mid Term': '#F59E0B',
        'End Term': '#EF4444',
        'Practical': '#8B5CF6'
    };

    const toggleTerm = (id) => setExpandedTerms(prev => ({ ...prev, [id]: !prev[id] }));

    const getTrendData = () => {
        const toRoman = (n) => ({ 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' }[n] || n);
        if (resultData?.semesters && resultData.semesters.length > 0) {
            const sorted = [...resultData.semesters].sort((a, b) => (parseInt(a.termId) || 0) - (parseInt(b.termId) || 0));
            let cumulativePoints = 0;
            let cumulativeCredits = 0;
            return sorted.map(t => {
                let semCredits = 0;
                let semPoints = 0;
                if (t.subjects) {
                    t.subjects.forEach(sub => {
                        const gpMap = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C+': 5, 'C': 5, 'D': 4, 'E': 0, 'F': 0 };
                        const points = gpMap[sub.grade] || 0;
                        const cred = parseFloat(sub.credit) || 0;
                        semCredits += cred;
                        semPoints += (points * cred);
                    });
                }
                if (semCredits === 0) {
                    semCredits = 20;
                    semPoints = (parseFloat(t.tgpa) || 0) * 20;
                }
                cumulativePoints += semPoints;
                cumulativeCredits += semCredits;
                const calculatedCgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : 0;
                return {
                    name: `Sem ${toRoman(t.termId)}`,
                    tgpa: parseFloat(t.tgpa) || 0,
                    cgpa: parseFloat(calculatedCgpa.toFixed(2)) || parseFloat(t.cgpa) || 0
                };
            });
        }
        if (studentInfo?.TermwiseCGPA && studentInfo.TermwiseCGPA.length > 0) {
            return [...studentInfo.TermwiseCGPA]
                .sort((a, b) => (parseInt(a.term) || 0) - (parseInt(b.term) || 0))
                .map(t => ({
                    name: `Sem ${toRoman(t.term)}`,
                    tgpa: parseFloat(t.tgpa) || 0,
                    cgpa: parseFloat(t.cgpa) || 0
                }));
        }
        return [
            { name: 'Sem I', tgpa: 7.2, cgpa: 7.2 },
            { name: 'Sem II', tgpa: 7.8, cgpa: 7.5 },
            { name: 'Sem III', tgpa: 8.1, cgpa: 7.7 },
            { name: 'Sem IV', tgpa: 7.9, cgpa: 7.79 }
        ];
    };

    const getGradeDistribution = () => {
        if (!resultData?.semesters) return [];
        const counts = {};
        const allSubjects = [...(resultData.semesters || []).flatMap(s => s.subjects || [])];
        allSubjects.forEach(sub => {
            if (sub.grade) counts[sub.grade] = (counts[sub.grade] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([grade, count]) => ({
                name: grade,
                value: count,
                fill: gradeStyle(grade).dot
            }))
            .sort((a, b) => b.value - a.value);
    };

    if (loading) {
        return (
            <>
                <div className="lg:hidden px-4 py-6"><CGPASkeleton /></div>
                <div className="hidden lg:block"><CGPASkeleton /></div>
            </>
        );
    }

    const trendData = getTrendData();
    const gradeDistribution = getGradeDistribution();
    const totalCourses = gradeDistribution.reduce((a, b) => a + b.value, 0);
    const cgpaValue = parseFloat(studentInfo?.CGPA) || 0;
    const cgpaPercent = (cgpaValue / 10) * 100;

    return (
        <>
            {/* ═══════════ MOBILE VIEW ═══════════ */}
            <div className="lg:hidden flex flex-col min-h-full">

                {/* Segmented Control */}
                <div className="px-4 pt-4">
                    <div className="flex p-1 bg-[#1c312e] rounded-2xl border border-white/5">
                        <button 
                            onClick={() => setMobileTab('overall')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === 'overall' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-500'}`}
                        >
                            <BarChart3 className="h-3 w-3" />
                            Overview
                        </button>
                        <button 
                            onClick={() => setMobileTab('calculator')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === 'calculator' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-500'}`}
                        >
                            <Calculator className="h-3 w-3" />
                            Calculator
                        </button>
                    </div>
                </div>

                <div className="flex-1 pb-24 px-4 pt-6 space-y-6">
                    {mobileTab === 'calculator' ? (
                        <MobileCalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} marksData={marksData} />
                    ) : (
                        <>
                            {/* ─── CGPA Ring ─── */}
                            <div className="bg-[#1c312e] rounded-3xl p-6 border border-white/5 relative overflow-hidden shadow-lg">
                                <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#bef227]/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#bef227]/3 rounded-full blur-2xl pointer-events-none" />
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="relative w-28 h-28 flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'CGPA', value: cgpaValue },
                                                        { name: 'Remaining', value: 10 - cgpaValue }
                                                    ]}
                                                    cx="50%" cy="50%"
                                                    innerRadius={40} outerRadius={52}
                                                    paddingAngle={0} cornerRadius={30}
                                                    dataKey="value" startAngle={90} endAngle={-270}
                                                >
                                                    <Cell fill="#bef227" stroke="none" />
                                                    <Cell fill="rgba(255,255,255,0.06)" stroke="none" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-[#bef227] leading-none">{studentInfo?.CGPA || '—'}</span>
                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">CGPA</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Percentile</p>
                                            <p className="text-lg font-black text-white">{cgpaPercent.toFixed(0)}%</p>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-[#bef227] to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${cgpaPercent}%` }} />
                                        </div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Out of 10.0</p>
                                    </div>
                                </div>
                            </div>

                            {/* ─── CGPA Progression Chart ─── */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 text-[#bef227]" />
                                    CGPA Progression
                                </h3>
                                <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-4 shadow-lg">
                                    <div className="flex items-center gap-4 mb-4 text-[8px] font-black uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5 text-slate-400">
                                            <span className="w-2 h-2 rounded-full bg-slate-400" />TGPA
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[#bef227]">
                                            <span className="w-2 h-2 rounded-full bg-[#bef227]" />CGPA
                                        </span>
                                    </div>
                                    <div className="h-52 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ left: 5, right: 10, top: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} dy={10} padding={{ left: 10, right: 10 }} />
                                                <YAxis hide domain={[0, 10]} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line type="monotone" dataKey="tgpa" stroke="#94a3b8" strokeWidth={2.5} dot={{ fill: '#94a3b8', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                <Line type="monotone" dataKey="cgpa" stroke="#bef227" strokeWidth={2.5} dot={{ fill: '#bef227', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Grades Distribution ─── */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-[#bef227]" />
                                    Grades Distribution
                                </h3>
                                <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-5 shadow-lg">
                                    <div className="relative h-52 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={gradeDistribution}
                                                    cx="50%" cy="50%"
                                                    innerRadius={55} outerRadius={80}
                                                    paddingAngle={3} cornerRadius={8}
                                                    dataKey="value"
                                                >
                                                    {gradeDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: '#1c312e', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', fontSize: '10px', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-black text-white leading-none">{totalCourses}</span>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Courses</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-4">
                                        {gradeDistribution.map((entry, i) => {
                                            const cfg = gradeStyle(entry.name);
                                            return (
                                                <div key={i} className={`flex flex-col items-center p-2 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                                                    <span className={`text-[10px] font-black ${cfg.text}`}>{entry.name}</span>
                                                    <span className="text-sm font-black text-white leading-none mt-1">{entry.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ─── Performance Across Terms ─── */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5 text-[#bef227]" />
                                    Performance Across Terms
                                </h3>
                                {crossTermData.length > 0 ? (
                                    <>
                                        <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-4 shadow-lg">
                                            <div className="h-56 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={crossTermData} margin={{ left: 15, right: 15, top: 15, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} dy={10} interval={0} padding={{ left: 15, right: 15 }} />
                                                        <YAxis hide domain={[0, 105]} />
                                                        <Tooltip content={<PerformanceTooltip />} />
                                                        {assessmentTypes.map((type) => (
                                                            <Line
                                                                key={type}
                                                                type="monotone"
                                                                dataKey={type}
                                                                name={type}
                                                                stroke={lineColors[type] || '#6B7280'}
                                                                strokeWidth={2.5}
                                                                dot={{ r: 3.5, fill: lineColors[type] || '#6B7280', strokeWidth: 0 }}
                                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                                                isAnimationActive={false}
                                                            />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 px-1">
                                            {assessmentTypes.map(type => (
                                                <div key={type} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1c312e] rounded-xl border border-white/5">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lineColors[type] }} />
                                                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-8 text-center">
                                        <p className="text-xs font-bold text-slate-500">No performance data available</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══════════ DESKTOP VIEW ═══════════ */}
            <div className="hidden lg:flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#1c312e] flex items-center justify-center border border-white/5 shadow-lg">
                            <GraduationCap className="w-6 h-6 text-[#bef227]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Academic Profile</h1>
                            <p className="text-xs text-slate-450 dark:text-zinc-500 font-bold">CGPA analytics and term-wise performance metrics</p>
                        </div>
                    </div>
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-[#1c312e] rounded-2xl border border-slate-200/60 dark:border-white/5">
                        <button onClick={() => setActiveTab('view')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'view' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500'}`}>
                            Overview
                        </button>
                        <button onClick={() => setActiveTab('calculator')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'calculator' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500'}`}>
                            Calculator
                        </button>
                    </div>
                </div>

                {activeTab === 'view' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Top Stats Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* CGPA Card */}
                            <div className="lg:col-span-1 bg-[#1c312e] rounded-3xl p-8 flex flex-col justify-center shadow-xl border border-white/5 relative overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#bef227]/8 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#bef227]/5 rounded-full blur-2xl pointer-events-none" />
                                <div className="relative z-10">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Current CGPA</p>
                                    <p className="text-5xl font-black text-[#bef227] mb-1">{studentInfo?.CGPA || '—'}</p>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-3 mb-2">
                                        <div className="h-full bg-gradient-to-r from-[#bef227] to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${cgpaPercent}%` }} />
                                    </div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Out of 10.0</p>
                                </div>
                            </div>

                            {/* CGPA Progression Chart */}
                            <div className="lg:col-span-4 bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest">Academic Progression</h3>
                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5 text-slate-500">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                                            TGPA (Term)
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[#bef227]">
                                            <span className="w-2 h-2 rounded-full bg-[#bef227]" />
                                            CGPA (Cumulative)
                                        </span>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={trendData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/[0.04]" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line type="monotone" dataKey="tgpa" stroke="#94a3b8" strokeWidth={3} dot={{ fill: '#94a3b8', r: 5, strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                        <Line type="monotone" dataKey="cgpa" stroke="#bef227" strokeWidth={3} dot={{ fill: '#bef227', r: 5, strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Grade Distribution */}
                            <div className="bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 p-6">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-[#bef227]" />
                                    Grades Distribution
                                </h3>
                                <div className="relative h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={gradeDistribution}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={90}
                                                paddingAngle={3} cornerRadius={10}
                                                dataKey="value"
                                            >
                                                {gradeDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: '#1c312e', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', fontSize: '10px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{totalCourses}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Courses</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 gap-2 mt-5">
                                    {gradeDistribution.map((entry, i) => {
                                        const cfg = gradeStyle(entry.name);
                                        return (
                                            <div key={i} className={`flex flex-col items-center p-2.5 rounded-2xl ${cfg.bg} border ${cfg.border} hover:scale-105 transition-transform`}>
                                                <span className={`text-[10px] font-black ${cfg.text}`}>{entry.name}</span>
                                                <span className="text-sm font-black text-slate-800 dark:text-white leading-none mt-1">{entry.value}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Performance Across Terms */}
                            <div className="bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 p-6">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5 text-[#bef227]" />
                                    Performance Across Terms
                                </h3>
                                {crossTermData.length > 0 ? (
                                    <>
                                        <div className="h-56 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={crossTermData} margin={{ left: 15, right: 15, top: 10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={8} interval={0} padding={{ left: 15, right: 15 }} />
                                                    <YAxis hide domain={[0, 105]} />
                                                    <Tooltip content={<PerformanceTooltip />} />
                                                    {assessmentTypes.map((type) => (
                                                        <Line
                                                            key={type}
                                                            type="monotone"
                                                            dataKey={type}
                                                            name={type}
                                                            stroke={lineColors[type] || '#6B7280'}
                                                            strokeWidth={2.5}
                                                            dot={{ r: 3.5, fill: lineColors[type] || '#6B7280', strokeWidth: 0 }}
                                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                                            isAnimationActive={false}
                                                        />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {assessmentTypes.map(type => (
                                                <div key={type} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lineColors[type] }} />
                                                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-56 gap-3">
                                        <Zap className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
                                        <p className="text-xs font-bold text-slate-400 dark:text-zinc-500">No performance data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Semester Accordion List */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Award className="h-3.5 w-3.5 text-[#bef227]" />
                                Term-wise Breakdown
                            </h3>
                            {(resultData?.semesters || []).map(sem => (
                                <div key={sem.termId} className="bg-white dark:bg-[#1c312e] rounded-3xl border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-sm">
                                    <button onClick={() => toggleTerm(sem.termId)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-5 text-left">
                                            <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center font-black text-slate-900 dark:text-[#bef227] text-sm border border-slate-100 dark:border-white/5">{sem.termId}</div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">Semester {sem.termId}</p>
                                                <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{(sem.subjects || []).length} Subjects · {sem.tgpa ? `TGPA ${sem.tgpa}` : 'Pending'}</p>
                                            </div>
                                        </div>
                                        {expandedTerms[sem.termId] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                    </button>
                                    {expandedTerms[sem.termId] && (
                                        <div className="px-5 pb-5 animate-in slide-in-from-top duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                {(sem.subjects || []).map((sub, i) => {
                                                    const cfg = gradeStyle(sub.grade);
                                                    return (
                                                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{sub.name || sub.code}</p>
                                                                <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase font-mono tracking-tighter mt-0.5">{sub.code} · {sub.credit} Credits</p>
                                                            </div>
                                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{sub.grade || '—'}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex gap-1 bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 p-1.5">
                            <button onClick={() => setCalcMode('term')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${calcMode === 'term' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                <Star className="w-4 h-4" /> Term GPA
                            </button>
                            <button onClick={() => setCalcMode('overall')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${calcMode === 'overall' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                <GraduationCap className="w-4 h-4" /> Overall CGPA
                            </button>
                        </div>
                        {calcMode === 'term' ? (
                            <TPGACalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} marksData={marksData} />
                        ) : (
                            <OverallCGPACalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} marksData={marksData} />
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default CGPA;