import React, { useState, useEffect } from 'react';
import { ChevronDown, Info, Plus, ChevronRight, Calculator, RotateCcw, TrendingUp, BookOpen, Trash2, ChevronLeft, Share2, Layers, CheckCircle2, PieChart, BarChart2, AlertCircle } from 'lucide-react';

const gradePoints = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "E": 0, "F": 0,
};

const isRomanSymbol = (str) => /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(String(str).trim());
const romanToInteger = (str) => {
    const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    return map[String(str).trim().toLowerCase()] || 0;
};

const getSemesterNumber = (tid) => {
    const idStr = String(tid).trim();
    if (isRomanSymbol(idStr)) return romanToInteger(idStr);
    if (/^\d{6}$/.test(idStr)) {
        const year = parseInt(idStr[0]);
        const semInYear = parseInt(idStr[idStr.length - 1]);
        return (year - 1) * 2 + (semInYear === 1 ? 1 : 2);
    }
    const m = idStr.match(/\d+/);
    return m ? parseInt(m[0]) : null;
};

const isRegularTerm = (tid) => {
    const idStr = String(tid).trim();
    if (isRomanSymbol(idStr)) return true;
    if (/[a-zA-Z]/.test(idStr)) return false;
    return true;
};

const MobileCalculator = ({ semesterData = [], resultData = null, marksData = [] }) => {
    const getSemLabel = (tid) => {
        const idStr = String(tid).trim();
        const romans = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
        
        if (isRomanSymbol(idStr)) return `Sem ${idStr.toUpperCase()}`;
        if (/^\d{6}$/.test(idStr)) {
            const year = parseInt(idStr[0]);
            const semInYear = parseInt(idStr[idStr.length - 1]);
            const semNum = (year - 1) * 2 + (semInYear === 1 ? 1 : 2);
            return `Sem ${romans[semNum] || semNum}`;
        }
        const m = idStr.match(/\d+/);
        if (m) {
            const num = parseInt(m[0]);
            return `Sem ${romans[num] || num}`;
        }
        return `Sem ${tid}`;
    };

    const termOptions = React.useMemo(() => {
        const list = [];
        const seenSemNums = new Set();

        const addTerm = (termId) => {
            if (!termId) return;
            if (!isRegularTerm(termId)) return;
            const semNum = getSemesterNumber(termId);
            if (semNum && !seenSemNums.has(semNum)) {
                seenSemNums.add(semNum);
                list.push({
                    value: String(termId),
                    semNum: semNum,
                    label: getSemLabel(termId)
                });
            }
        };

        (resultData?.semesters || []).forEach(s => addTerm(s.termId));
        (marksData || []).forEach(s => addTerm(s.termId || s.term));
        (semesterData || []).forEach(s => addTerm(s.term || s.termId));

        list.sort((a, b) => b.semNum - a.semNum);
        return list;
    }, [resultData, marksData, semesterData]);

    const [calcMode, setCalcMode] = useState(() => {
        return localStorage.getItem('umsy_calc_last_mode') || 'tgpa';
    }); // 'tgpa' or 'cgpa'
    const [selectedSemester, setSelectedSemester] = useState(() => {
        return localStorage.getItem('umsy_calc_selected_sem') || '';
    });
    const [subjects, setSubjects] = useState(() => {
        const saved = localStorage.getItem('umsy_calc_subjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [result, setResult] = useState(null);
    const [view, setView] = useState(() => {
        return localStorage.getItem('umsy_calc_view') || 'menu';
    }); // 'menu', 'edit', 'result'
    const [semesters, setSemesters] = useState(() => {
        const saved = localStorage.getItem('umsy_calc_semesters');
        return saved ? JSON.parse(saved) : [];
    }); // Overall CGPA state
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isManual, setIsManual] = useState(() => {
        return localStorage.getItem('umsy_calc_is_manual') === 'true';
    });
    const [error, setError] = useState('');

    // Persist State
    useEffect(() => {
        localStorage.setItem('umsy_calc_last_mode', calcMode);
        localStorage.setItem('umsy_calc_selected_sem', selectedSemester);
        localStorage.setItem('umsy_calc_subjects', JSON.stringify(subjects));
        localStorage.setItem('umsy_calc_view', view);
        localStorage.setItem('umsy_calc_semesters', JSON.stringify(semesters));
        localStorage.setItem('umsy_calc_is_manual', isManual);
    }, [calcMode, selectedSemester, subjects, view, semesters, isManual]);

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 3000);
    };

    const RenderError = () => error ? (
        <div className="fixed top-15 left-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-red-600/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{error}</p>
            </div>
        </div>
    ) : null;

    const handleSemesterChange = (e) => {
        const val = e.target.value;
        setSelectedSemester(val);
        setIsManual(false);
        if (val) {
            // Auto-fill logic
            const resultSem = resultData?.semesters?.find(s => String(s.termId) === String(val));
            const marksSem = marksData?.find(s => String(s.termId || s.term) === String(val));
            const cgpaSem = semesterData?.find(s => String(s.term || s.termId) === String(val));

            if (resultSem?.subjects?.length > 0) {
                setSubjects(resultSem.subjects.map(sub => {
                    const creditVal = sub.credit ?? sub.credits ?? sub.Credit ?? sub.CourseCredit ?? '0';
                    return {
                        id: crypto.randomUUID(),
                        code: sub.code || '',
                        name: sub.name || sub.code || 'Subject',
                        grade: sub.grade || '',
                        credit: creditVal.toString(),
                    };
                }));
            } else if (marksSem?.subjects?.length > 0) {
                setSubjects(marksSem.subjects.map(sub => {
                    const creditVal = sub.credit ?? sub.credits ?? sub.Credit ?? sub.CourseCredit ?? '0';
                    return {
                        id: crypto.randomUUID(),
                        code: sub.courseCode || '',
                        name: sub.courseName || sub.courseCode || 'Subject',
                        grade: sub.grade || '',
                        credit: creditVal.toString(),
                    };
                }));
            } else if (cgpaSem?.subjects?.length > 0) {
                setSubjects(cgpaSem.subjects.map(subject => {
                    const [code, ...nameParts] = subject.course?.split('::') || [subject.courseCode, subject.courseName];
                    const creditVal = subject.credit ?? subject.credits ?? subject.Credit ?? subject.CourseCredit ?? '0';
                    return {
                        id: crypto.randomUUID(),
                        code: code?.trim() || subject.courseCode || '',
                        name: nameParts.join('::').trim() || subject.courseName || code?.trim() || 'Subject',
                        grade: subject.grade || '',
                        credit: creditVal.toString(),
                    };
                }));
            }
            setView('edit');
        }
    };

    const handleManualAdd = () => {
        setIsManual(true);
        setSelectedSemester('Manual Entry');
        setSubjects([{ id: crypto.randomUUID(), code: '', name: '', grade: '', credit: '' }]);
        setView('edit');
    };

    const handleCalculateTGPA = () => {
        // Validation
        const incomplete = subjects.some(s => !s.grade || !s.credit || parseFloat(s.credit) <= 0);
        if (incomplete) {
            showError('Please enter grade and credits for all subjects');
            return;
        }

        let totalPoints = 0, totalCredits = 0;
        const counts = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'E/F': 0 };
        
        for (const sub of subjects) {
            const grade = sub.grade.toUpperCase();
            const gp = gradePoints[grade];
            const cr = parseFloat(sub.credit);
            
            if (gp !== undefined && !isNaN(cr)) {
                totalPoints += gp * cr;
                totalCredits += cr;
                
                // Map to distribution categories
                if (grade === 'O' || grade === 'A+') counts['A+']++;
                else if (grade === 'A') counts['A']++;
                else if (grade === 'B+') counts['B+']++;
                else if (grade === 'B') counts['B']++;
                else if (grade === 'C') counts['C']++;
                else if (grade === 'D') counts['D']++;
                else counts['E/F']++;
            }
        }
        
        if (totalCredits === 0) {
            showError('Total credits cannot be zero');
            return;
        }
        const gpa = totalPoints / totalCredits;
        setResult({
            gpa: gpa.toFixed(2),
            percentage: (gpa * 10).toFixed(1),
            totalPoints: totalPoints.toFixed(1),
            totalCredits: totalCredits,
            gradedCredits: subjects.filter(s => s.grade).reduce((acc, s) => acc + (parseFloat(s.credit) || 0), 0),
            counts
        });
        setView('result');
    };

    const getStatus = (gpa) => {
        const val = parseFloat(gpa);
        if (val >= 9) return { label: 'Outstanding', color: 'text-[#bef227] bg-[#bef227]/10' };
        if (val >= 8) return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-400/10' };
        if (val >= 7) return { label: 'Good', color: 'text-sky-400 bg-sky-400/10' };
        if (val >= 6) return { label: 'Average', color: 'text-amber-400 bg-amber-400/10' };
        return { label: 'Poor', color: 'text-red-400 bg-red-400/10' };
    };

    const handleCalculateCGPA = () => {
        const validSems = semesters.filter(s => !isNaN(parseFloat(s.tgpa)) && s.tgpa !== '');
        if (validSems.length === 0) {
            showError('Please enter at least one semester TGPA');
            return;
        }
        const sum = validSems.reduce((acc, s) => acc + parseFloat(s.tgpa), 0);
        const gpa = sum / validSems.length;
        setResult({
            gpa: gpa.toFixed(2),
            percentage: (gpa * 10).toFixed(1),
            totalPoints: '-',
            totalCredits: '-',
            gradedCredits: '-',
            counts: null
        });
        setView('result');
    };

    const resetToDefault = () => {
        if (resultData?.semesters?.length > 0) {
            setSemesters(resultData.semesters.map(s => ({
                id: crypto.randomUUID(),
                termId: s.termId,
                tgpa: s.tgpa?.toString() || ''
            })));
        } else if (semesterData?.length > 0) {
            setSemesters(semesterData.map(s => ({
                id: crypto.randomUUID(),
                termId: s.term,
                tgpa: s.tgpa?.toString() || ''
            })));
        } else {
            setSemesters([]);
        }
    };

    // Auto-seed Overall CGPA semesters
    useEffect(() => {
        if (calcMode === 'cgpa' && semesters.length === 0) {
            resetToDefault();
        }
    }, [calcMode, resultData, semesterData]);

    const stats = {
        totalCredits: subjects.reduce((acc, s) => acc + (parseFloat(s.credit) || 0), 0),
        gradedCredits: subjects.reduce((acc, s) => s.grade ? acc + (parseFloat(s.credit) || 0) : acc, 0),
        count: subjects.length
    };

    if (view === 'edit' && calcMode === 'tgpa') {
        return (
            <>
                <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
                {/* Term Header */}
                <div className="bg-[#1c312e] rounded-3xl p-4 flex items-center justify-between border border-white/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#bef227]/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-[#bef227]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{isManual ? 'Manual Mode' : getSemLabel(selectedSemester)}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isManual ? 'Custom Entry' : 'Academic Term'}</p>
                        </div>
                    </div>
                    <button onClick={() => setView('menu')} className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-bold text-[#bef227] border border-white/10">
                        Change
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Credits', value: stats.totalCredits, icon: TrendingUp },
                        { label: 'Graded Credits', value: stats.gradedCredits, icon: Calculator },
                        { label: 'Subjects', value: stats.count, icon: BookOpen }
                    ].map((s, i) => (
                        <div key={i} className="text-center space-y-1">
                            <div className="flex justify-center mb-1"><s.icon className="w-4 h-4 text-[#bef227]/40" /></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{s.label}</p>
                            <p className="text-lg font-black text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Subjects List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-white">Subjects</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSubjects(subjects.map(s => ({...s, grade: ''})))} className="text-[10px] font-bold text-[#bef227] flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                            {isManual && (
                                <button onClick={() => setSubjects([...subjects, { id: crypto.randomUUID(), code: '', name: '', grade: '', credit: '' }])} className="text-[10px] font-bold text-[#bef227] flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {subjects.map((sub, idx) => (
                            <div key={sub.id} className="bg-[#1c312e] rounded-3xl border border-white/5 p-4 shadow-sm flex items-center gap-4 relative">
                                <div className="w-10 h-10 rounded-full bg-[#bef227]/10 flex items-center justify-center text-xs font-bold text-[#bef227] shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isManual ? (
                                        <div className="space-y-2">
                                            <input 
                                                value={sub.name}
                                                onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, name: e.target.value} : s))}
                                                placeholder="Subject Name"
                                                className="w-full bg-transparent text-[13px] font-bold text-white border-b border-white/10 focus:border-[#bef227] outline-none placeholder:text-slate-600"
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number"
                                                    value={sub.credit}
                                                    onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, credit: e.target.value} : s))}
                                                    placeholder="Credits"
                                                    className="w-full text-[10px] font-bold text-slate-400 bg-transparent outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{sub.code}</p>
                                            <p className="text-[13px] font-bold text-white truncate">{sub.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{sub.credit} Credits</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative shrink-0">
                                        <select 
                                            value={sub.grade}
                                            onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, grade: e.target.value} : s))}
                                            className={`appearance-none h-10 pl-4 pr-10 rounded-2xl text-xs font-bold border-none transition-colors ${sub.grade ? 'bg-[#bef227]/10 text-[#bef227]' : 'bg-white/5 text-slate-400'}`}
                                        >
                                            <option value="">Grade</option>
                                            {Object.keys(gradePoints).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${sub.grade ? 'text-[#bef227]' : 'text-slate-600'}`} />
                                    </div>
                                    {isManual && subjects.length > 1 && (
                                        <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 active:scale-90 transition-transform">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calculate Button */}
                <button 
                    onClick={handleCalculateTGPA}
                    className="fixed bottom-24 left-4 right-4 h-14 bg-[#bef227] text-[#1c312e] rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all z-20"
                >
                    <Calculator className="w-5 h-5" />
                    Calculate
                </button>
            </div>
            <RenderError />
            </>
        );
    }

    if (view === 'result' && result) {
        const status = getStatus(result.gpa);
        const radius = 35;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (parseFloat(result.percentage) / 100) * circumference;

        return (
            <>
                <div className="flex flex-col min-h-full pb-20 animate-in slide-in-from-right duration-500">
                {/* Header */}
                <div className="flex items-center justify-between py-4">
                    <button onClick={() => setView('edit')} className="p-2 -ml-2 text-slate-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-bold text-white">{calcMode.toUpperCase()} Result</h2>
                    <button className="p-2 -mr-2 text-slate-400">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-[#1c312e] rounded-[2.5rem] p-8 border border-white/5 shadow-sm relative overflow-hidden mb-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <p className="text-[13px] font-bold text-white">Your {calcMode.toUpperCase()}</p>
                            <div className="flex items-baseline gap-1">
                                <h1 className="text-6xl font-black text-[#bef227] tracking-tighter">{result.gpa}</h1>
                                <span className="text-slate-600 font-bold text-lg">/ 10</span>
                            </div>
                            <div className={`inline-flex px-4 py-1.5 rounded-full text-[11px] font-bold ${status.color}`}>
                                {status.label}
                            </div>
                        </div>

                        {/* Circular Progress */}
                        <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                                <circle 
                                    cx="56" cy="56" r={radius}
                                    className="fill-none"
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth="8"
                                />
                                <circle 
                                    cx="56" cy="56" r={radius}
                                    className="fill-none transition-all duration-1000 ease-out"
                                    stroke="#bef227"
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-sm font-bold text-white leading-none">{result.percentage}%</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Percentage</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grade Distribution */}
                {result.counts && (
                    <div className="space-y-4 mb-8">
                        <h3 className="text-sm font-bold text-white px-2">Grade Distribution</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                            {Object.entries(result.counts).map(([grade, count], i) => {
                                const colors = [
                                    'bg-[#bef227]/10 text-[#bef227] border-[#bef227]/20',
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                    'bg-sky-500/10 text-sky-400 border-sky-500/20',
                                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                    'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                ];
                                return (
                                    <div key={grade} className={`min-w-[64px] rounded-2xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${colors[i % colors.length]}`}>
                                        <span className="text-sm font-bold">{grade}</span>
                                        <span className="text-base font-black leading-none">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-center">
                    <button 
                        onClick={() => { setView('edit'); setResult(null); }}
                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Recalculate
                    </button>
                </div>
                <RenderError />
            </div>
            </>
        );
    }

    return (
        <>
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Mode Switcher */}
            <div className="flex bg-[#1c312e] rounded-2xl p-1">
                <button 
                    onClick={() => { setCalcMode('tgpa'); setView('menu'); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${calcMode === 'tgpa' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-400'}`}
                >
                    TGPA
                </button>
                <button 
                    onClick={() => { setCalcMode('cgpa'); setView('menu'); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${calcMode === 'cgpa' ? 'bg-[#bef227] text-[#1c312e] shadow-lg' : 'text-slate-400'}`}
                >
                    CGPA
                </button>
            </div>

            {calcMode === 'tgpa' ? (
                /* TGPA Selection View */
                <div className="bg-[#1c312e] rounded-[2.5rem] border border-white/5 shadow-sm p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white px-1">Select Semester / Term</h3>
                        
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[#bef227]/10 flex items-center justify-center">
                                <Calculator className="w-4 h-4 text-[#bef227]" />
                            </div>
                            <select 
                                value={selectedSemester}
                                onChange={handleSemesterChange}
                                className="w-full h-14 pl-14 pr-12 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-white appearance-none focus:border-[#bef227] focus:ring-2 focus:ring-[#bef227]/20 transition-all"
                            >
                                <option value="" disabled>Choose semester</option>
                                {termOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">or</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <button 
                            onClick={handleManualAdd}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 text-left group active:scale-[0.98] transition-all hover:border-[#bef227]/30"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#0f1d1b] flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#bef227] transition-colors" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-white">Add subjects manually</p>
                                <p className="text-[10px] font-medium text-slate-500 mt-0.5">Start from scratch</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 group-hover:text-[#bef227] transition-all" />
                        </button>
                    </div>
                </div>
            ) : (
                /* CGPA (Overall) Grid View */
                <div className="space-y-6">
                    <div className="flex items-center justify-end px-1">
                        <button onClick={resetToDefault} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-red-400 transition-colors">
                            Reset All Data
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {semesters.map((sem, idx) => (
                            <div key={sem.id} className="bg-[#1c312e] rounded-3xl border border-white/5 p-4 shadow-sm space-y-3 relative group">
                                <button 
                                    onClick={() => setSemesters(semesters.filter(s => s.id !== sem.id))}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all z-10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <div className="flex flex-col items-center text-center space-y-2">
                                    <div className="w-9 h-9 rounded-full bg-[#bef227]/10 text-[#bef227] flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getSemLabel(sem.termId)}</p>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={sem.tgpa}
                                        onChange={e => setSemesters(semesters.map(s => s.id === sem.id ? {...s, tgpa: e.target.value} : s))}
                                        placeholder="0.00"
                                        className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl text-center text-sm font-bold text-white focus:border-[#bef227] focus:ring-2 focus:ring-[#bef227]/20 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Add Term Card */}
                        <button 
                            onClick={() => setSemesters([...semesters, { id: crypto.randomUUID(), termId: '', tgpa: '' }])}
                            className="bg-[#0f1d1b] rounded-[2rem] border-2 border-dashed border-white/10 p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] text-slate-500 active:scale-95 transition-all hover:border-[#bef227]/30 hover:text-[#bef227]"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Term</span>
                        </button>
                    </div>

                    <button 
                        onClick={handleCalculateCGPA}
                        className="fixed bottom-24 left-4 right-4 h-14 bg-[#bef227] text-[#1c312e] rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all z-20"
                    >
                        <Calculator className="w-5 h-5" />
                        Calculate Overall CGPA
                    </button>
                </div>
            )}

            {/* Grade Reference (common) */}
            {calcMode === 'tgpa' && (
                <div className="bg-[#1c312e] rounded-[2.5rem] border border-white/5 p-6 space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-white">Grade Points Reference</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                        {Object.entries(gradePoints).slice(0, 8).map(([grade, pts]) => (
                            <div key={grade} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                                <p className="text-sm font-bold text-white">{grade}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{pts} pts</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Toast */}
            <RenderError />
        </div>
        </>
    );
};

export default MobileCalculator;
