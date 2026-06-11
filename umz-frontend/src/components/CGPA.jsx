import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
import { Info, Calculator, BookOpen, ChevronDown, ChevronUp, Tag, ChevronLeft, GraduationCap, TrendingUp, Star, Award, LayoutGrid } from 'lucide-react';
import Sidebar from './Sidebar';
import { getStudentInfo, getResult, getMarks } from '../services/api';
import TPGACalculator from './TPGACalculator';
import OverallCGPACalculator from './OverallCGPACalculator';
import MobileCalculator from './MobileCalculator';

const gradeColorsList = {
    'O':  'bg-violet-100 text-violet-800',
    'A+': 'bg-emerald-100 text-emerald-800',
    'A':  'bg-blue-100 text-blue-800',
    'B+': 'bg-amber-100 text-amber-800',
    'B':  'bg-orange-100 text-orange-800',
    'C+': 'bg-pink-100 text-pink-800',
    'C':  'bg-rose-100 text-rose-800',
    'D':  'bg-gray-200 text-gray-700',
    'E':  'bg-red-100 text-red-700',
    'F':  'bg-red-200 text-red-800',
};
const gradeLabel = (g) => gradeColorsList[g] || 'bg-gray-100 text-gray-600';

const CGPA = () => {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [marksData, setMarksData] = useState([]);
    const [expandedTerms, setExpandedTerms] = useState({});
    const [loading, setLoading] = useState(true);
    const [resultLoading, setResultLoading] = useState(false);
    const [error, setError] = useState('');
    const [hoveredGrade, setHoveredGrade] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('umz_cgpa_active_tab') || 'view');
    const [mobileTab, setMobileTab] = useState(() => localStorage.getItem('umz_cgpa_mobile_tab') || 'overall'); // 'overall' or 'calculator'
    const [calcMode, setCalcMode] = useState(() => localStorage.getItem('umz_cgpa_calc_mode') || 'term');

    // Persist mobileTab
    useEffect(() => {
        localStorage.setItem('umz_cgpa_mobile_tab', mobileTab);
    }, [mobileTab]);

    const fetchResultData = async (force = false) => {
        if (!force) {
            const cached = localStorage.getItem('umz_result_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setResultData(parsed);
                    const exp = {};
                    (parsed.semesters || []).forEach(s => { exp[s.termId] = false; });
                    (parsed.rplGrades || []).forEach(g => { exp['rpl_' + g.termId] = false; });
                    setExpandedTerms(exp);
                    return;
                } catch { localStorage.removeItem('umz_result_data'); }
            }
        }
        const cookies = localStorage.getItem('umz_cookies');
        if (!cookies) return;
        try {
            setResultLoading(true);
            const res = await getResult(cookies);
            setResultData(res.data);
            localStorage.setItem('umz_result_data', JSON.stringify(res.data));
            const exp = {};
            (res.data.semesters || []).forEach(s => { exp[s.termId] = false; });
            (res.data.rplGrades || []).forEach(g => { exp['rpl_' + g.termId] = false; });
            setExpandedTerms(exp);
        } catch (e) { console.error('Result fetch error:', e.message); }
        finally { setResultLoading(false); }
    };

    const fetchMarksData = async () => {
        const cached = localStorage.getItem('umz_marks_data');
        if (cached) {
            try { setMarksData(JSON.parse(cached)); return; } 
            catch { localStorage.removeItem('umz_marks_data'); }
        }
        const cookies = localStorage.getItem('umz_cookies');
        if (!cookies) return;
        try {
            const res = await getMarks(cookies);
            setMarksData(res.data || []);
            localStorage.setItem('umz_marks_data', JSON.stringify(res.data || []));
        } catch (e) { console.warn('Marks fetch failed:', e.message); }
    };

    useEffect(() => {
        const fetchData = async () => {
            const cachedInfo = localStorage.getItem('umz_student_info');
            if (cachedInfo) {
                try {
                    setStudentInfo(JSON.parse(cachedInfo));
                    setLoading(false);
                } catch { localStorage.removeItem('umz_student_info'); }
            }
            const cookies = localStorage.getItem('umz_cookies');
            if (!cookies) { setLoading(false); return; }
            if (!cachedInfo) {
                try {
                    setLoading(true);
                    const result = await getStudentInfo(cookies);
                    setStudentInfo(result.data);
                    localStorage.setItem('umz_student_info', JSON.stringify(result.data));
                } catch (err) {
                    setError(err.message || 'Failed to load CGPA data');
                } finally { setLoading(false); }
            }
        };
        fetchData();
        fetchResultData();
        fetchMarksData();
    }, [navigate]);

    useEffect(() => { localStorage.setItem('umz_cgpa_active_tab', activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem('umz_cgpa_calc_mode', calcMode); }, [calcMode]);

    const crossTermData = marksData
        .filter(term => /^\d+$/.test(term.termId) && term.termId.length >= 6)
        .map(term => {
            const tid = String(term.termId);
            const year = parseInt(tid[0]);
            const semInYear = parseInt(tid[tid.length - 1]);
            const semNum = (year - 1) * 2 + (semInYear === 1 ? 1 : 2);

            const toRoman = (n) => {
                const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
                return map[n] || n;
            };

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

                        if (!assessmentAvgs[typeName]) {
                            assessmentAvgs[typeName] = { total: 0, count: 0 };
                        }
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
        const toRoman = (n) => {
            const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
            return map[n] || n;
        };
        const raw = [...(studentInfo?.TermwiseCGPA || [])];
        return raw
            .sort((a, b) => (parseInt(a.term) || 0) - (parseInt(b.term) || 0))
            .map(t => ({
                name: `Sem ${toRoman(t.term)}`,
                tgpa: parseFloat(t.tgpa) || 0,
                cgpa: parseFloat(t.cgpa) || 0
            }));
    };

    const getGradeDistribution = () => {
        if (!resultData?.semesters) return [];
        const counts = {};
        const allSubjects = [
            ...(resultData.semesters || []).flatMap(s => s.subjects || [])
        ];

        allSubjects.forEach(sub => {
            if (sub.grade) {
                counts[sub.grade] = (counts[sub.grade] || 0) + 1;
            }
        });

        const colors = {
            'O': '#10B981', 'A+': '#3B82F6', 'A': '#6366F1', 
            'B+': '#8B5CF6', 'B': '#F59E0B', 'C': '#F97316', 
            'P': '#6B7280', 'F': '#EF4444'
        };

        return Object.entries(counts)
            .map(([grade, count]) => ({
                name: grade,
                value: count,
                fill: colors[grade] || '#CBD5E1'
            }))
            .sort((a, b) => b.value - a.value);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                        <p className="mt-4 text-sm text-gray-400">Syncing your records…</p>
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
                        <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">CGPA Analytics</h1>
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

                    <div className="flex-1 pb-24 px-4 pt-6">
                        {mobileTab === 'calculator' ? (
                            <MobileCalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} />
                        ) : (
                            <>
                                {/* Circular CGPA Chart */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative w-48 h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'CGPA', value: parseFloat(studentInfo?.CGPA) || 0 },
                                                        { name: 'Total', value: 10 - (parseFloat(studentInfo?.CGPA) || 0) }
                                                    ]}
                                                    cx="50%" cy="50%"
                                                    innerRadius={65} outerRadius={85}
                                                    paddingAngle={0} 
                                                    cornerRadius={40}
                                                    dataKey="value" startAngle={90} endAngle={-270}
                                                >
                                                    <Cell fill="#3B82F6" stroke="none" />
                                                    <Cell fill="#F3F4F6" className="dark:fill-gray-800" stroke="none" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-gray-900 dark:text-white">{studentInfo?.CGPA || '0.0'}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Current CGPA</span>
                                        </div>
                                    </div>
                                </div>


                                {/* TGPA Trend Chart */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        CGPA Progression
                                    </h3>
                                    <div className="h-56 w-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={getTrendData()} margin={{ left: 15, right: 15, top: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 600}} 
                                                    dy={10} 
                                                    padding={{ left: 10, right: 10 }}
                                                />
                                                <YAxis hide domain={[0, 10]} />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" dataKey="tgpa" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorCgpa)" dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Grades Distribution Pie Chart */}
                                <div className="space-y-4 pt-6">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-indigo-500" />
                                        Grades Distribution
                                    </h3>
                                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center shadow-sm">
                                        <div className="h-64 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={getGradeDistribution()}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={85}
                                                        paddingAngle={4} cornerRadius={10}
                                                        dataKey="value"
                                                    >
                                                        {getGradeDistribution().map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                                                    {getGradeDistribution().reduce((a, b) => a + b.value, 0)}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Courses</span>
                                            </div>
                                        </div>
                                        
                                        {/* Grade Legend Grid */}
                                        <div className="grid grid-cols-4 gap-2.5 w-full mt-6">
                                            {getGradeDistribution().map((entry, index) => (
                                                <div key={index} className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 transition-all hover:scale-[1.02]">
                                                    <span className="text-[10px] font-black" style={{ color: entry.fill }}>{entry.name}</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-none mt-1">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Marks Performance Graph (from /marks) */}
                                <div className="space-y-4 mt-6">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                        Performance Across Terms
                                    </h3>
                                    {crossTermData.length > 0 ? (
                                        <>
                                            <div className="h-64 w-full bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={crossTermData} margin={{ left: 25, right: 25, top: 15, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                                        <XAxis 
                                                            dataKey="name" 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 600}} 
                                                            dy={10} 
                                                            interval={0}
                                                            padding={{ left: 20, right: 20 }}
                                                        />
                                                        <YAxis hide domain={[0, 105]} />
                                                        <Tooltip 
                                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                            formatter={(value, name) => [`${value}%`, name]}
                                                            cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                        />
                                                        {assessmentTypes.map((type) => (
                                                            <Line
                                                                key={type}
                                                                type="monotone"
                                                                dataKey={type}
                                                                name={type}
                                                                stroke={lineColors[type] || '#6B7280'}
                                                                strokeWidth={2.5}
                                                                dot={{ r: 3.5, fill: lineColors[type] || '#6B7280', strokeWidth: 1.5, stroke: '#fff' }}
                                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                                                isAnimationActive={false}
                                                            />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-wrap gap-2 px-1">
                                                {assessmentTypes.map(type => (
                                                    <div key={type} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600/50">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lineColors[type] }} />
                                                        <span className="text-[8px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-tighter">{type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 text-center">
                                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">No performance data available</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden lg:block max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg"><GraduationCap className="w-6 h-6 text-white" /></div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Academic Profile</h1>
                                <p className="text-sm text-gray-500 font-medium">Detailed CGPA and term-wise performance metrics</p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                            <button onClick={() => setActiveTab('view')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'view' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>Overview</button>
                            <button onClick={() => setActiveTab('calculator')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'calculator' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>Calculator</button>
                        </div>
                    </div>

                    {activeTab === 'view' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-1 bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl p-8 text-white flex flex-col justify-center shadow-xl">
                                    <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-2">Current CGPA</p>
                                    <p className="text-6xl font-black mb-2">{studentInfo?.CGPA || '—'}</p>
                                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Out of 10.0</p>
                                </div>
                                <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8">TGPA Progression</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={getTrendData()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} />
                                            <YAxis domain={[0, 10]} hide />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="tgpa" fill="#111827" radius={[10, 10, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {/* Accordion list continues... */}
                            <div className="space-y-4">
                                {(resultData?.semesters || []).map(sem => (
                                    <div key={sem.termId} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                        <button onClick={() => toggleTerm(sem.termId)} className="w-full flex items-center justify-between p-6">
                                            <div className="flex items-center gap-6 text-left">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center font-black text-gray-900 dark:text-white">{sem.termId}</div>
                                                <div>
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">Semester {sem.termId}</p>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{(sem.subjects || []).length} Subjects · {sem.tgpa ? `TGPA ${sem.tgpa}` : 'Result Pending'}</p>
                                                </div>
                                            </div>
                                            {expandedTerms[sem.termId] ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                                        </button>
                                        {expandedTerms[sem.termId] && (
                                            <div className="px-6 pb-6 animate-in slide-in-from-top duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(sem.subjects || []).map((sub, i) => (
                                                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{sub.name || sub.code}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tighter">{sub.code} · {sub.credit} Credits</p>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-xl text-xs font-black ${gradeLabel(sub.grade)}`}>{sub.grade || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                             <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-2">
                                <button onClick={() => setCalcMode('term')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${calcMode === 'term' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>📘 Term GPA</button>
                                <button onClick={() => setCalcMode('overall')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${calcMode === 'overall' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>🎓 Overall CGPA</button>
                            </div>
                            {calcMode === 'term' ? (
                                <TPGACalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} />
                            ) : (
                                <OverallCGPACalculator semesterData={studentInfo?.TermwiseCGPA || []} resultData={resultData} />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CGPA;