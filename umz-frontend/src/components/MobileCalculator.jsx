import React, { useState, useEffect } from 'react';
import { ChevronDown, Info, Plus, ChevronRight, Calculator, RotateCcw, TrendingUp, BookOpen, Trash2, ChevronLeft, Share2, Layers, CheckCircle2, PieChart, BarChart2, AlertCircle } from 'lucide-react';

const gradePoints = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "E": 0, "F": 0,
};

const MobileCalculator = ({ semesterData = [], resultData = null }) => {
    const getSemLabel = (tid) => {
        const idStr = String(tid);
        if (idStr.length < 6) return `Term ${tid}`;
        const year = parseInt(idStr[0]);
        const semInYear = parseInt(idStr[idStr.length - 1]);
        const semNum = (year - 1) * 2 + (semInYear === 1 ? 1 : 2);
        const romans = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
        return `Sem ${romans[semNum] || semNum}`;
    };

    const [calcMode, setCalcMode] = useState(() => {
        return localStorage.getItem('umz_calc_last_mode') || 'tgpa';
    }); // 'tgpa' or 'cgpa'
    const [selectedSemester, setSelectedSemester] = useState(() => {
        return localStorage.getItem('umz_calc_selected_sem') || '';
    });
    const [subjects, setSubjects] = useState(() => {
        const saved = localStorage.getItem('umz_calc_subjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [result, setResult] = useState(null);
    const [view, setView] = useState(() => {
        return localStorage.getItem('umz_calc_view') || 'menu';
    }); // 'menu', 'edit', 'result'
    const [semesters, setSemesters] = useState(() => {
        const saved = localStorage.getItem('umz_calc_semesters');
        return saved ? JSON.parse(saved) : [];
    }); // Overall CGPA state
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isManual, setIsManual] = useState(() => {
        return localStorage.getItem('umz_calc_is_manual') === 'true';
    });
    const [error, setError] = useState('');

    // Persist State
    useEffect(() => {
        localStorage.setItem('umz_calc_last_mode', calcMode);
        localStorage.setItem('umz_calc_selected_sem', selectedSemester);
        localStorage.setItem('umz_calc_subjects', JSON.stringify(subjects));
        localStorage.setItem('umz_calc_view', view);
        localStorage.setItem('umz_calc_semesters', JSON.stringify(semesters));
        localStorage.setItem('umz_calc_is_manual', isManual);
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
            } else {
                const sem = semesterData.find(s => String(s.term) === String(val));
                if (sem?.subjects?.length > 0) {
                    setSubjects(sem.subjects.map(subject => {
                        const [code, ...nameParts] = subject.course.split('::');
                        const creditVal = subject.credit ?? subject.credits ?? subject.Credit ?? subject.CourseCredit ?? '0';
                        return {
                            id: crypto.randomUUID(),
                            code: code?.trim() || '',
                            name: nameParts.join('::').trim() || code?.trim() || 'Subject',
                            grade: subject.grade || '',
                            credit: creditVal.toString(),
                        };
                    }));
                }
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
        if (val >= 9) return { label: 'Outstanding', color: 'text-emerald-600 bg-emerald-50' };
        if (val >= 8) return { label: 'Excellent', color: 'text-blue-600 bg-blue-50' };
        if (val >= 7) return { label: 'Good', color: 'text-indigo-600 bg-indigo-50' };
        if (val >= 6) return { label: 'Average', color: 'text-amber-600 bg-amber-50' };
        return { label: 'Poor', color: 'text-red-600 bg-red-50' };
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
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{isManual ? 'Manual Mode' : getSemLabel(selectedSemester)}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{isManual ? 'Custom Entry' : 'Academic Term'}</p>
                        </div>
                    </div>
                    <button onClick={() => setView('menu')} className="px-4 py-1.5 bg-white dark:bg-gray-800 rounded-full text-[10px] font-bold text-blue-600 shadow-sm border border-gray-100 dark:border-gray-700">
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
                            <div className="flex justify-center mb-1"><s.icon className="w-4 h-4 text-blue-500/50" /></div>
                            <p className="text-[10px] font-bold text-gray-400 leading-none">{s.label}</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Subjects List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Subjects</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSubjects(subjects.map(s => ({...s, grade: ''})))} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                            {isManual && (
                                <button onClick={() => setSubjects([...subjects, { id: crypto.randomUUID(), code: '', name: '', grade: '', credit: '' }])} className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {subjects.map((sub, idx) => (
                            <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-50 dark:border-gray-700 p-4 shadow-sm flex items-center gap-4 relative">
                                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 border border-gray-100 dark:border-gray-800">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isManual ? (
                                        <div className="space-y-2">
                                            <input 
                                                value={sub.name}
                                                onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, name: e.target.value} : s))}
                                                placeholder="Subject Name"
                                                className="w-full bg-transparent text-[13px] font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 focus:border-blue-500 outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number"
                                                    value={sub.credit}
                                                    onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, credit: e.target.value} : s))}
                                                    placeholder="Credits"
                                                    className="w-full text-[10px] font-bold text-gray-400 bg-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">{sub.code}</p>
                                            <p className="text-[13px] font-bold text-gray-800 dark:text-white truncate">{sub.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{sub.credit} Credits</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative shrink-0">
                                        <select 
                                            value={sub.grade}
                                            onChange={e => setSubjects(subjects.map(s => s.id === sub.id ? {...s, grade: e.target.value} : s))}
                                            className={`appearance-none h-10 pl-4 pr-10 rounded-2xl text-xs font-bold border-none transition-colors ${sub.grade ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-gray-50 text-gray-400 dark:bg-gray-900'}`}
                                        >
                                            <option value="">Grade</option>
                                            {Object.keys(gradePoints).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${sub.grade ? 'text-emerald-500' : 'text-gray-300'}`} />
                                    </div>
                                    {isManual && subjects.length > 1 && (
                                        <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
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
                    className="fixed bottom-24 left-4 right-4 h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all z-20"
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
                <div className="flex flex-col min-h-full bg-[#fdfdfd] dark:bg-gray-950 pb-20 animate-in slide-in-from-right duration-500">
                {/* Header */}
                <div className="flex items-center justify-between py-4">
                    <button onClick={() => setView('edit')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{calcMode.toUpperCase()} Result</h2>
                    <button className="p-2 -mr-2 text-gray-600 dark:text-gray-400">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100/50 dark:border-gray-800 shadow-sm relative overflow-hidden mb-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <p className="text-[13px] font-bold text-gray-900 dark:text-white">Your {calcMode.toUpperCase()}</p>
                            <div className="flex items-baseline gap-1">
                                <h1 className="text-6xl font-black text-blue-600 dark:text-blue-500 tracking-tighter">{result.gpa}</h1>
                                <span className="text-gray-300 dark:text-gray-600 font-bold text-lg">/ 10</span>
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
                                    className="stroke-gray-100 dark:stroke-gray-800 fill-none"
                                    strokeWidth="8"
                                />
                                <circle 
                                    cx="56" cy="56" r={radius}
                                    className="stroke-blue-600 dark:stroke-blue-500 fill-none transition-all duration-1000 ease-out"
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{result.percentage}%</p>
                                <p className="text-[8px] font-medium text-gray-400 uppercase mt-1">Percentage</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grade Distribution */}
                {result.counts && (
                    <div className="space-y-4 mb-8">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white px-2">Grade Distribution</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                            {Object.entries(result.counts).map(([grade, count], i) => {
                                const colors = [
                                    'bg-emerald-50 text-emerald-600 border-emerald-100',
                                    'bg-green-50 text-green-600 border-green-100',
                                    'bg-blue-50 text-blue-600 border-blue-100',
                                    'bg-indigo-50 text-indigo-600 border-indigo-100',
                                    'bg-orange-50 text-orange-600 border-orange-100',
                                    'bg-gray-50 text-gray-600 border-gray-100',
                                    'bg-red-50 text-red-600 border-red-100'
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
                        className="w-full h-14 rounded-2xl  dark:bg-white text-gray-900 outline-1 outline-gray-900 dark:text-gray-900 flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all"
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
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 shadow-inner">
                <button 
                    onClick={() => { setCalcMode('tgpa'); setView('menu'); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${calcMode === 'tgpa' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}
                >
                    TGPA
                </button>
                <button 
                    onClick={() => { setCalcMode('cgpa'); setView('menu'); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${calcMode === 'cgpa' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}
                >
                    CGPA
                </button>
            </div>

            {calcMode === 'tgpa' ? (
                /* TGPA Selection View */
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 shadow-sm p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1">Select Semester / Term</h3>
                        
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <select 
                                value={selectedSemester}
                                onChange={handleSemesterChange}
                                className="w-full h-14 pl-14 pr-12 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-semibold appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                <option value="" disabled>Choose semester</option>
                                {(resultData?.semesters || []).map(s => (
                                    <option key={s.termId} value={s.termId}>{getSemLabel(s.termId)}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-gray-50 dark:bg-gray-700" />
                            <span className="text-[10px] font-bold uppercase text-gray-300 dark:text-gray-600">or</span>
                            <div className="h-px flex-1 bg-gray-50 dark:bg-gray-700" />
                        </div>

                        <button 
                            onClick={handleManualAdd}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex items-center gap-4 text-left group active:scale-[0.98] transition-all"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-gray-900 dark:text-white">Add subjects manually</p>
                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">Start from scratch</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            ) : (
                /* CGPA (Overall) Grid View */
                <div className="space-y-6">
                    <div className="flex items-center justify-end px-1">
                        <button onClick={resetToDefault} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">
                            Reset All Data
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {semesters.map((sem, idx) => (
                            <div key={sem.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-50 dark:border-gray-700 p-4 shadow-sm space-y-3 relative group">
                                <button 
                                    onClick={() => setSemesters(semesters.filter(s => s.id !== sem.id))}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all z-10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <div className="flex flex-col items-center text-center space-y-2">
                                    <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{getSemLabel(sem.termId)}</p>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={sem.tgpa}
                                        onChange={e => setSemesters(semesters.map(s => s.id === sem.id ? {...s, tgpa: e.target.value} : s))}
                                        placeholder="0.00"
                                        className="w-full h-11 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center text-sm font-bold text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Add Term Card */}
                        <button 
                            onClick={() => setSemesters([...semesters, { id: crypto.randomUUID(), termId: '', tgpa: '' }])}
                            className="bg-gray-50/50 dark:bg-gray-900/30 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800 p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] text-gray-400 active:scale-95 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Add Term</span>
                        </button>
                    </div>

                    <button 
                        onClick={handleCalculateCGPA}
                        className="fixed bottom-24 left-4 right-4 h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all z-20"
                    >
                        <Calculator className="w-5 h-5" />
                        Calculate Overall CGPA
                    </button>
                </div>
            )}

            {/* Grade Reference (common) */}
            {calcMode === 'tgpa' && (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-50 dark:border-gray-700 p-6 space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Grade Points Reference</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                        {Object.entries(gradePoints).slice(0, 8).map(([grade, pts]) => (
                            <div key={grade} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 text-center border border-gray-100 dark:border-gray-700/50">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{grade}</p>
                                <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">{pts} pts</p>
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
