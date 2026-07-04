import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, GraduationCap, Award, Settings } from 'lucide-react';

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

const getGPAMessage = (gpa) => {
    if (gpa >= 9.0) return 'Outstanding! 🌟';
    if (gpa >= 8.0) return 'Excellent! 💫';
    if (gpa >= 7.0) return 'Very Good! ⭐';
    if (gpa >= 6.0) return 'Good! 👍';
    if (gpa >= 5.0) return 'Keep Going! 💪';
    return 'You Can Do It! 🎯';
};

const TPGACalculator = ({ semesterData = [], resultData = null, marksData = [] }) => {
    const [subjects, setSubjects] = useState([]);
    const [result, setResult] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [manualCount, setManualCount] = useState('');
    const [editingCreditId, setEditingCreditId] = useState(null);

    // Load from cache
    useEffect(() => {
        try {
            const cached = localStorage.getItem('umsy_tgpa_calculator');
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

    // Save to cache
    useEffect(() => {
        if (subjects.length > 0) {
            localStorage.setItem('umsy_tgpa_calculator', JSON.stringify({ subjects, selectedSemester, result }));
        }
    }, [subjects, selectedSemester, result]);

    const handleSemesterSelect = (e) => {
        const termVal = e.target.value;
        setSelectedSemester(termVal);
        setResult(null);

        if (!termVal) {
            setSubjects([]);
            return;
        }

        // Fill from resultData
        const foundSem = (resultData?.semesters || []).find(s => String(s.termId) === termVal);
        if (foundSem && foundSem.subjects?.length > 0) {
            const mapped = foundSem.subjects.map(sub => ({
                id: crypto.randomUUID(),
                courseCode: sub.code,
                courseName: sub.name,
                credit: sub.credit || "4.0",
                grade: sub.grade || "",
            }));
            setSubjects(mapped);
            return;
        }

        // Fill from marksData (distinct course items)
        const semMarks = (marksData || []).filter(m => String(m.termId || m.term) === termVal);
        if (semMarks.length > 0) {
            const unique = [];
            const codes = new Set();
            semMarks.forEach(item => {
                if (item.courseCode && !codes.has(item.courseCode)) {
                    codes.add(item.courseCode);
                    unique.push({
                        id: crypto.randomUUID(),
                        courseCode: item.courseCode,
                        courseName: item.courseName || item.courseCode,
                        credit: item.credit || "4.0",
                        grade: "",
                    });
                }
            });
            if (unique.length > 0) {
                setSubjects(unique);
                return;
            }
        }

        // Default skeleton if not found
        setSubjects(Array.from({ length: 6 }, () => ({
            id: crypto.randomUUID(),
            courseCode: "",
            courseName: "",
            credit: "4.0",
            grade: "",
        })));
    };

    const handleGenerateManual = () => {
        const count = parseInt(manualCount);
        if (isNaN(count) || count < 1 || count > 20) {
            alert('Please enter a count between 1 and 20');
            return;
        }
        setSelectedSemester('');
        setResult(null);
        setSubjects(Array.from({ length: count }, () => ({
            id: crypto.randomUUID(),
            courseCode: "",
            courseName: "",
            credit: "4.0",
            grade: "",
        })));
    };

    const handleAdd = () => {
        setSubjects(prev => [
            ...prev,
            { id: crypto.randomUUID(), courseCode: "", courseName: "", credit: "4.0", grade: "" }
        ]);
        setResult(null);
    };

    const handleRemove = (id) => {
        setSubjects(prev => prev.filter(s => s.id !== id));
        setResult(null);
    };

    const handleChange = (id, field, value) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
        setResult(null);
    };

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
        localStorage.removeItem('umsy_tgpa_calculator');
    };

    // Build semester auto-fill list
    const semesterOptions = React.useMemo(() => {
        const list = [];
        const seenSemNums = new Set();
        
        const getLabel = (tid) => {
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

        const addTerm = (termId, tgpa = null) => {
            if (!termId) return;
            if (!isRegularTerm(termId)) return;
            const semNum = getSemesterNumber(termId);
            if (semNum && !seenSemNums.has(semNum)) {
                seenSemNums.add(semNum);
                list.push({
                    value: String(termId),
                    semNum: semNum,
                    label: `${getLabel(termId)}${tgpa ? ` — TGPA ${tgpa}` : ''}`
                });
            }
        };

        (resultData?.semesters || []).forEach(s => addTerm(s.termId, s.tgpa));
        (marksData || []).forEach(s => addTerm(s.termId || s.term));
        (semesterData || []).forEach(s => addTerm(s.term || s.termId, s.tgpa));

        list.sort((a, b) => b.semNum - a.semNum);
        return list;
    }, [resultData, marksData, semesterData]);

    const hasSubjects = subjects.length > 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Auto-fill Picker Section */}
            <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-6 flex flex-col md:flex-row gap-4 items-end">
                {semesterOptions.length > 0 && (
                    <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">
                            Auto-fill from semester
                        </label>
                        <select
                            value={selectedSemester}
                            onChange={handleSemesterSelect}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all"
                        >
                            <option value="">Choose semester…</option>
                            {semesterOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="w-full md:w-auto flex gap-2">
                    <div className="flex-1 md:w-48 space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1 md:hidden">
                            Manual count
                        </label>
                        <input
                            type="number"
                            min="1" max="20"
                            value={manualCount}
                            onChange={e => setManualCount(e.target.value)}
                            placeholder="Manual count (e.g. 6)"
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleGenerateManual}
                        className="px-6 h-11 bg-[#bef227] text-[#1c312e] hover:opacity-95 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                        Generate
                    </button>
                </div>

                {hasSubjects && (
                    <button
                        onClick={handleReset}
                        className="w-full md:w-auto h-11 flex items-center justify-center gap-1.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-2xl active:scale-95 transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset List
                    </button>
                )}
            </div>

            {/* Subject Grid */}
            {hasSubjects && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((sub, idx) => (
                        <div
                            key={sub.id}
                            className="bg-[#1c312e] rounded-3xl border border-white/5 p-5 flex flex-col gap-4 relative group hover:border-[#bef227]/30 transition-all duration-300"
                        >
                            {/* Remove button */}
                            <button
                                onClick={() => handleRemove(sub.id)}
                                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Info Headers */}
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#bef227]/10 text-[#bef227] flex items-center justify-center text-xs font-black flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    {sub.courseCode && (
                                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5">
                                            {sub.courseCode}
                                        </p>
                                    )}
                                    <p className="text-xs font-bold text-white leading-tight truncate">
                                        {sub.courseName || `Subject #${idx + 1}`}
                                    </p>
                                </div>
                            </div>

                            {/* Credit and Grade inputs */}
                            <div className="flex items-center justify-between gap-4 pt-1">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Credits</span>
                                    {editingCreditId === sub.id ? (
                                        <input
                                            type="number"
                                            min="0.5" max="10" step="0.5"
                                            value={sub.credit}
                                            autoFocus
                                            onChange={e => handleChange(sub.id, 'credit', e.target.value)}
                                            onBlur={() => setEditingCreditId(null)}
                                            onKeyDown={e => e.key === 'Enter' && setEditingCreditId(null)}
                                            className="w-16 h-10 px-2 bg-white/5 border-2 border-[#bef227] rounded-xl text-xs font-black text-white text-center focus:outline-none"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setEditingCreditId(sub.id)}
                                            className="h-10 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black min-w-[50px] transition-all flex items-center justify-center"
                                        >
                                            {sub.credit || "4.0"}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pr-1">Grade</label>
                                    <select
                                        value={sub.grade}
                                        onChange={(e) => handleChange(sub.id, "grade", e.target.value)}
                                        className="h-10 px-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white min-w-[110px] focus:outline-none focus:border-[#bef227] focus:ring-2 focus:ring-[#bef227]/20 transition-all"
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

                    {/* Add subject card */}
                    <button
                        onClick={handleAdd}
                        className="bg-[#1c312e]/50 rounded-3xl border-2 border-dashed border-white/10 p-5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-[#bef227]/30 hover:text-[#bef227] transition-all min-h-[150px] active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-extrabold uppercase tracking-widest">Add Subject</span>
                    </button>
                </div>
            )}

            {/* Calculate Trigger */}
            {hasSubjects && (
                <button
                    onClick={handleCalculate}
                    className="w-full h-14 bg-[#bef227] text-[#1c312e] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                    Calculate TGPA
                </button>
            )}

            {/* Result display */}
            {result && (
                <div className="bg-[#1c312e] rounded-[2.5rem] shadow-xl p-8 border border-white/5 text-center relative overflow-hidden animate-in zoom-in duration-300">
                    <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#bef227]/5 rounded-full blur-3xl pointer-events-none" />
                    <p className="text-[#bef227] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Calculated Term GPA</p>
                    <div className="relative inline-block mb-4">
                        <p className="text-8xl font-black text-white tracking-tighter leading-none">{result.gpa.toFixed(2)}</p>
                        <div className="absolute -top-3 -right-6 bg-[#bef227] text-[#1c312e] text-[9px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider rotate-12">
                            Out of 10
                        </div>
                    </div>
                    <p className="text-white text-lg font-bold">{result.message}</p>
                </div>
            )}

            {/* Grade points reference card */}
            <div className="bg-[#1c312e] rounded-3xl border border-white/5 p-5">
                <p className="text-[9px] font-black text-slate-500 mb-4 uppercase tracking-widest text-center">Grade Points System</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[['O', 10], ['A+', 9], ['A', 8], ['B+', 7], ['B', 6], ['C', 5], ['D', 4], ['E/F', 0]].map(([g, p]) => (
                        <div key={g} className="text-center py-2 bg-white/5 rounded-xl border border-white/5">
                            <div className="font-black text-[#bef227] text-[11px]">{g}</div>
                            <div className="text-[8px] font-extrabold text-slate-500 mt-0.5">{p} PTS</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TPGACalculator;
