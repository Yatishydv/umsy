import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';

const gradePoints = {
    "O": 10, "o": 10,
    "A+": 9, "a+": 9,
    "A": 8, "a": 8,
    "B+": 7, "b+": 7,
    "B": 6, "b": 6,
    "C": 5, "c": 5,
    "D": 4, "d": 4,
    "E": 0, "e": 0,
    "F": 0, "f": 0,
};

const gradeOptions = ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F'];

const getGPAMessage = (gpa) => {
    if (gpa >= 9.0) return 'Outstanding! 🌟';
    if (gpa >= 8.0) return 'Excellent! 💫';
    if (gpa >= 7.0) return 'Very Good! ⭐';
    if (gpa >= 6.0) return 'Good! 👍';
    if (gpa >= 5.0) return 'Keep Going! 💪';
    return 'You Can Do It! 🎯';
};

const TPGACalculator = ({ semesterData = [], resultData = null }) => {
    const [subjects, setSubjects] = useState([]);
    const [result, setResult] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [manualCount, setManualCount] = useState('');
    const [editingCreditId, setEditingCreditId] = useState(null);

    // ── Cache ──────────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const cached = localStorage.getItem('umz_tgpa_calculator');
            if (cached) {
                const p = JSON.parse(cached);
                if (p.subjects?.length > 0) {
                    setSubjects(p.subjects);
                    setSelectedSemester(p.selectedSemester || '');
                    if (p.result) setResult(p.result);
                }
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (subjects.length > 0) {
            localStorage.setItem('umz_tgpa_calculator', JSON.stringify({ subjects, result, selectedSemester }));
        }
    }, [subjects, result, selectedSemester]);

    // ── Semester select ────────────────────────────────────────────────────
    const handleSemesterSelect = (e) => {
        const termId = e.target.value;
        setSelectedSemester(termId);
        if (!termId) return;

        // Prefer resultData (has credit)
        const resultSem = resultData?.semesters?.find(s => s.termId === termId);
        if (resultSem?.subjects?.length > 0) {
            setSubjects(resultSem.subjects.map(sub => ({
                id: crypto.randomUUID(),
                courseCode: sub.code || '',
                courseName: sub.name || sub.code || 'Subject',
                grade: sub.grade || '',
                credit: sub.credit != null ? sub.credit.toString() : '',
            })));
            setResult(null);
            return;
        }

        // Fallback: TermwiseCGPA
        const sem = semesterData.find(s => s.term === termId);
        if (sem?.subjects?.length > 0) {
            setSubjects(sem.subjects.map(subject => {
                const [code, ...nameParts] = subject.course.split('::');
                return {
                    id: crypto.randomUUID(),
                    courseCode: code?.trim() || '',
                    courseName: nameParts.join('::').trim() || code?.trim() || 'Subject',
                    grade: subject.grade || '',
                    credit: subject.credit?.toString() || '',
                };
            }));
            setResult(null);
        }
    };

    // ── Manual add ────────────────────────────────────────────────────────
    const handleGenerateManual = () => {
        const n = parseInt(manualCount);
        if (!n || n < 1 || n > 20) return;
        setSubjects(Array.from({ length: n }, () => ({
            id: crypto.randomUUID(), courseCode: '', courseName: '', grade: '', credit: ''
        })));
        setSelectedSemester('');
        setResult(null);
        setManualCount('');
    };

    const handleAdd = () => {
        setSubjects(prev => [...prev, { id: crypto.randomUUID(), courseCode: '', courseName: '', grade: '', credit: '' }]);
        setResult(null);
    };

    const handleRemove = (id) => setSubjects(prev => prev.filter(s => s.id !== id));

    const handleChange = (id, field, value) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
        setResult(null);
    };

    // ── Calculate ─────────────────────────────────────────────────────────
    const handleCalculate = () => {
        let totalPoints = 0, totalCredits = 0;
        for (let i = 0; i < subjects.length; i++) {
            const grade = subjects[i].grade.trim().toUpperCase();
            const credit = parseFloat(subjects[i].credit);
            if (!grade || isNaN(credit)) { alert(`Fill all fields for subject ${i + 1}`); return; }
            if (!Object.prototype.hasOwnProperty.call(gradePoints, grade)) { alert(`Invalid grade "${grade}" for subject ${i + 1}`); return; }
            totalPoints += gradePoints[grade] * credit;
            totalCredits += credit;
        }
        if (totalCredits === 0) { alert('Total credits cannot be zero'); return; }
        const gpa = Math.round((totalPoints / totalCredits) * 100) / 100;
        setResult({ gpa, message: getGPAMessage(gpa) });
    };

    const handleReset = () => {
        setSubjects([]);
        setResult(null);
        setSelectedSemester('');
        setManualCount('');
        localStorage.removeItem('umz_tgpa_calculator');
    };

    // ── Semester options ───────────────────────────────────────────────────
    const semesterOptions = resultData?.semesters?.length > 0
        ? resultData.semesters.map(s => ({ value: s.termId, label: `Term ${s.termId}${s.tgpa ? ` — ${s.tgpa}` : ''}` }))
        : semesterData.map(s => ({ value: s.term, label: `Sem ${s.term} — TGPA ${s.tgpa}` }));

    const hasSubjects = subjects.length > 0;

    return (
        <div className="space-y-6 pb-20">

            {/* ── Mobile Top Bar: cleaner picker ── */}
            <div className="lg:hidden bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-4">
                {semesterOptions.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">
                            Auto-fill from semester
                        </label>
                        <select
                            value={selectedSemester}
                            onChange={handleSemesterSelect}
                            className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Choose semester…</option>
                            {semesterOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="number"
                        min="1" max="20"
                        value={manualCount}
                        onChange={e => setManualCount(e.target.value)}
                        placeholder="Manual subjects (e.g. 6)"
                        className="flex-1 h-12 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                    />
                    <button
                        onClick={handleGenerateManual}
                        className="px-6 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        Generate
                    </button>
                </div>

                {hasSubjects && (
                    <button
                        onClick={handleReset}
                        className="w-full h-10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset All Subjects
                    </button>
                )}
            </div>

            {/* ── Desktop Top Bar: preserved ── */}
            <div className="hidden lg:flex bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-wrap items-end gap-4">
                {semesterOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                        <label className="text-xs font-medium text-gray-500">Auto-fill from semester</label>
                        <select
                            value={selectedSemester}
                            onChange={handleSemesterSelect}
                            className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                            <option value="">Choose semester…</option>
                            {semesterOptions.map(o => (o.value && <option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-500">Manual subjects</label>
                        <input
                            type="number"
                            value={manualCount}
                            onChange={e => setManualCount(e.target.value)}
                            placeholder="e.g. 6"
                            className="h-10 px-3 min-w-[350px] border border-gray-200 rounded-lg text-sm text-center"
                        />
                    </div>
                    <button onClick={handleGenerateManual} className="h-10 px-15 bg-gray-900 text-white rounded-lg text-sm font-medium">Generate</button>
                </div>
                {hasSubjects && (
                    <button onClick={handleReset} className="h-10 px-4 flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg ml-auto">
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                )}
            </div>

            {/* ── Subject Cards Grid ── */}
            {hasSubjects && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {subjects.map((sub, idx) => (
                        <div
                            key={sub.id}
                            className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4 relative shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            {/* Remove */}
                            <button
                                onClick={() => handleRemove(sub.id)}
                                className="absolute top-4 right-4 p-2 rounded-xl text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Header */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                                    {idx + 1}
                                </div>

                                <div className="flex-1 min-w-0 pr-6">
                                    {sub.courseCode && (
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter mb-0.5">
                                            {sub.courseCode}
                                        </p>
                                    )}
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">
                                        {sub.courseName || "Subject"}
                                    </p>
                                </div>
                            </div>

                            {/* Middle row: credits + grade */}
                            <div className="flex items-center justify-between gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Credits</span>
                                    {editingCreditId === sub.id ? (
                                        <input
                                            type="number"
                                            min="0.5" max="10" step="0.5"
                                            value={sub.credit}
                                            autoFocus
                                            onChange={e => handleChange(sub.id, 'credit', e.target.value)}
                                            onBlur={() => setEditingCreditId(null)}
                                            onKeyDown={e => e.key === 'Enter' && setEditingCreditId(null)}
                                            className="w-20 h-10 px-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-900 dark:border-white rounded-xl text-sm font-black text-center focus:outline-none"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setEditingCreditId(sub.id)}
                                            className="h-10 px-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-black min-w-[60px] transition-colors flex items-center justify-center"
                                        >
                                            {sub.credit || "—"}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pr-1">Grade</label>
                                    <select
                                        value={sub.grade}
                                        onChange={(e) => handleChange(sub.id, "grade", e.target.value)}
                                        className="h-10 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm font-black text-gray-800 dark:text-gray-100 min-w-[120px] focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Select Grade</option>
                                        {gradeOptions.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAdd}
                        className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all min-h-[160px]"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Add Subject</span>
                    </button>
                </div>
            )}

            {/* ── Calculate ── */}
            {hasSubjects && (
                <button
                    onClick={handleCalculate}
                    className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
                >
                    Calculate TGPA
                </button>
            )}

            {/* ── Result ── */}
            {result && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-500">
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Your Term GPA</p>
                    <div className="relative inline-block mb-4">
                        <p className="text-8xl font-black text-white tracking-tighter">{result.gpa.toFixed(2)}</p>
                        <div className="absolute -top-2 -right-4 bg-yellow-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg rotate-12">
                            OUT OF 10
                        </div>
                    </div>
                    <p className="text-blue-100 text-lg font-bold">{result.message}</p>
                </div>
            )}

            {/* ── Grade reference ── */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest text-center">Grade Points Reference</p>
                <div className="grid grid-cols-4 gap-2">
                    {[['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['D', 4], ['E/F', 0]].map(([g, p]) => (
                        <div key={g} className="text-center py-2.5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="font-black text-gray-900 dark:text-white text-xs">{g}</div>
                            <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">{p} PTS</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TPGACalculator;

