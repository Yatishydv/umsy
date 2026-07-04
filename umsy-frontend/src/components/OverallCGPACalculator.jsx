import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Award, Calendar, RefreshCw } from 'lucide-react';

const OverallCGPACalculator = ({ semesterData = [], resultData = null }) => {
    // Build grid rows from resultData (preferred) or TermwiseCGPA fallback
    const buildFromData = (data) => {
        if (resultData?.semesters?.length > 0) {
            return resultData.semesters.map((sem) => ({
                id: crypto.randomUUID(),
                label: `Term ${sem.termId}`,
                tgpa: sem.tgpa?.toString() || '',
            }));
        }
        return data.map((sem) => ({
            id: crypto.randomUUID(),
            label: `Semester ${sem.term}`,
            tgpa: sem.tgpa?.toString() || '',
        }));
    };

    const [semesters, setSemesters] = useState(() => {
        try {
            const cached = localStorage.getItem('umsy_cgpa_overall_calculator');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed.semesters) && parsed.semesters.length > 0) {
                    return parsed.semesters;
                }
            }
        } catch { /* ignore */ }
        return [];
    });

    const [result, setResult] = useState(null);

    useEffect(() => {
        if (semesters.length === 0) {
            if (resultData?.semesters?.length > 0) {
                setSemesters(buildFromData(semesterData));
            } else if (semesterData.length > 0) {
                setSemesters(buildFromData(semesterData));
            }
        }
    }, [semesterData, resultData]);

    useEffect(() => {
        localStorage.setItem('umsy_cgpa_overall_calculator', JSON.stringify({ semesters }));
        setResult(null);
    }, [semesters]);

    const handleTGPAChange = (id, value) => {
        setSemesters((prev) =>
            prev.map((s) => (s.id === id ? { ...s, tgpa: value } : s))
        );
    };

    const handleLabelChange = (id, value) => {
        setSemesters((prev) =>
            prev.map((s) => (s.id === id ? { ...s, label: value } : s))
        );
    };

    const handleAdd = () => {
        const nextNum = semesters.length + 1;
        setSemesters((prev) => [
            ...prev,
            { id: crypto.randomUUID(), label: `Semester ${nextNum}`, tgpa: '' },
        ]);
    };

    const handleRemove = (id) => {
        setSemesters((prev) => prev.filter((s) => s.id !== id));
    };

    const handleCalculate = () => {
        if (semesters.length === 0) return;

        for (const sem of semesters) {
            const v = parseFloat(sem.tgpa);
            if (isNaN(v) || v < 0 || v > 10) {
                alert(`Enter a valid TGPA (0–10) for "${sem.label}"`);
                return;
            }
        }

        const sum = semesters.reduce((acc, s) => acc + parseFloat(s.tgpa), 0);
        const cgpa = Math.round((sum / semesters.length) * 100) / 100;
        setResult({ cgpa, numSems: semesters.length });
    };

    const handleReset = () => {
        const fresh = resultData?.semesters?.length > 0 || semesterData.length > 0
            ? buildFromData(semesterData)
            : [];
        setSemesters(fresh);
        setResult(null);
        localStorage.removeItem('umsy_cgpa_overall_calculator');
    };

    const getCGPAMessage = (cgpa) => {
        if (cgpa >= 9.0) return 'Outstanding Academic Record! 🌟';
        if (cgpa >= 8.0) return 'Excellent Performance! 💫';
        if (cgpa >= 7.0) return 'Very Good Work! ⭐';
        if (cgpa >= 6.0) return 'Good Progress! 👍';
        if (cgpa >= 5.0) return 'Keep Working Hard! 💪';
        return 'You Can Improve! 🎯';
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Info strip + Reset */}
            <div className="flex items-center justify-end">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-[#bef227] bg-[#bef227]/5 border border-[#bef227]/10 rounded-xl hover:bg-red-950/20 active:scale-95 transition-all"
                >
                    <RefreshCw className="w-3 h-3" />
                    Reset Data
                </button>
            </div>

            {/* Semester cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {semesters.map((sem, index) => (
                    <div
                        key={sem.id}
                        className="bg-[#1c312e] rounded-3xl border border-white/5 p-5 flex flex-col items-center gap-4 relative group hover:border-[#bef227]/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 40}ms` }}
                    >
                        {/* Remove button */}
                        <button
                            onClick={() => handleRemove(sem.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Term circle badge */}
                        <div className="w-10 h-10 rounded-2xl bg-[#bef227]/10 text-[#bef227] flex items-center justify-center text-xs font-black">
                            {index + 1}
                        </div>

                        {/* Editable label */}
                        <input
                            type="text"
                            value={sem.label}
                            onChange={(e) => handleLabelChange(sem.id, e.target.value)}
                            className="w-full text-[9px] font-black text-slate-500 text-center bg-transparent border-none outline-none uppercase tracking-widest focus:text-white"
                        />

                        {/* TGPA input */}
                        <div className="w-full relative">
                            <input
                                type="number"
                                value={sem.tgpa}
                                onChange={(e) => handleTGPAChange(sem.id, e.target.value)}
                                placeholder="TGPA"
                                min="0" max="10" step="0.01"
                                className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-center text-white placeholder:text-slate-600 focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all"
                            />
                        </div>
                    </div>
                ))}

                {/* Add semester card */}
                <button
                    onClick={handleAdd}
                    className="bg-transparent rounded-3xl border-2 border-dashed border-white/10 p-5 flex flex-col items-center justify-center gap-2.5 text-slate-600 hover:border-[#bef227]/30 hover:text-[#bef227] transition-all min-h-[160px] active:scale-95 group"
                >
                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Add Term</span>
                </button>
            </div>

            {/* Calculate button */}
            {semesters.length > 0 && (
                <button
                    onClick={handleCalculate}
                    className="w-full h-14 bg-[#bef227] text-[#1c312e] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                    Calculate Overall CGPA
                </button>
            )}

            {/* Result display */}
            {result && (
                <div className="bg-[#1c312e] rounded-[2.5rem] shadow-xl p-8 border border-white/5 text-center relative overflow-hidden animate-in zoom-in duration-300">
                    <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#bef227]/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <p className="text-[#bef227] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Calculated Overall CGPA</p>
                    
                    <div className="relative inline-block mb-4">
                        <p className="text-8xl font-black text-white tracking-tighter leading-none">{result.cgpa.toFixed(2)}</p>
                        <div className="absolute -top-3 -right-6 bg-[#bef227] text-[#1c312e] text-[9px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider rotate-12">
                            Out of 10
                        </div>
                    </div>
                    
                    <p className="text-white text-lg font-bold mb-2">{getCGPAMessage(result.cgpa)}</p>
                    <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                        Across {result.numSems} {result.numSems !== 1 ? 'Terms' : 'Term'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default OverallCGPACalculator;
