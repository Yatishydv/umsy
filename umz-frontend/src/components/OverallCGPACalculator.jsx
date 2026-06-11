import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const OverallCGPACalculator = ({ semesterData = [], resultData = null }) => {
    // Build grid rows from resultData (preferred) or TermwiseCGPA fallback
    const buildFromData = (data) => {
        // Prefer resultData.semesters — has accurate termId + TGPA
        if (resultData?.semesters?.length > 0) {
            return resultData.semesters.map((sem) => ({
                id: crypto.randomUUID(),
                label: `Term ${sem.termId}`,
                tgpa: sem.tgpa?.toString() || '',
            }));
        }
        // Fallback: TermwiseCGPA
        return data.map((sem) => ({
            id: crypto.randomUUID(),
            label: `Semester ${sem.term}`,
            tgpa: sem.tgpa?.toString() || '',
        }));
    };

    const [semesters, setSemesters] = useState(() => {
        // Try cache first
        try {
            const cached = localStorage.getItem('umz_cgpa_overall_calculator');
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

    // Seed from resultData (preferred) or semesterData once available (if cache was empty)
    useEffect(() => {
        if (semesters.length === 0) {
            if (resultData?.semesters?.length > 0) {
                setSemesters(buildFromData(semesterData)); // buildFromData checks resultData internally
            } else if (semesterData.length > 0) {
                setSemesters(buildFromData(semesterData));
            }
        }
    }, [semesterData, resultData]);

    // Persist to cache whenever semesters change
    useEffect(() => {
        localStorage.setItem('umz_cgpa_overall_calculator', JSON.stringify({ semesters }));
        setResult(null); // clear stale result on any change
    }, [semesters]);

    /* ─── handlers ─── */
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
        // Prefer resultData for reset, fallback to semesterData
        const fresh = resultData?.semesters?.length > 0 || semesterData.length > 0
            ? buildFromData(semesterData)
            : [];
        setSemesters(fresh);
        setResult(null);
        localStorage.removeItem('umz_cgpa_overall_calculator');
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
            <div className="flex items-center justify-end px-2">
                <button
                    onClick={handleReset}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl active:scale-95 transition-transform"
                >
                    Reset All Data
                </button>
            </div>

            {/* Semester cards */}
            <div className="grid grid-cols-2 gap-3">
                {semesters.map((sem, index) => (
                    <div
                        key={sem.id}
                        className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center gap-3 relative animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Remove button */}
                        <button
                            onClick={() => handleRemove(sem.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-xl text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Badge */}
                        <div className="w-8 h-8 rounded-2xl bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center text-xs font-black">
                            {index + 1}
                        </div>

                        {/* Editable label */}
                        <input
                            type="text"
                            value={sem.label}
                            onChange={(e) => handleLabelChange(sem.id, e.target.value)}
                            className="w-full text-[10px] font-black text-gray-400 dark:text-gray-500 text-center bg-transparent border-none outline-none uppercase tracking-tighter"
                        />

                        {/* TGPA input */}
                        <input
                            type="number"
                            value={sem.tgpa}
                            onChange={(e) => handleTGPAChange(sem.id, e.target.value)}
                            placeholder="TGPA"
                            min="0" max="10" step="0.01"
                            className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm font-black text-center text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                ))}

                {/* Add semester card */}
                <button
                    onClick={handleAdd}
                    className="bg-gray-50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all min-h-[140px] active:scale-95"
                >
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Term</span>
                </button>
            </div>

            {/* Calculate button */}
            {semesters.length > 0 && (
                <button
                    onClick={handleCalculate}
                    className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]"
                >
                    Calculate Overall CGPA
                </button>
            )}

            {/* Result */}
            {result && (
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 dark:from-violet-800 dark:to-indigo-900 rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in duration-500">
                    <p className="text-violet-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Your Overall CGPA</p>
                    <div className="relative inline-block mb-4">
                        <p className="text-8xl font-black text-white tracking-tighter">{result.cgpa.toFixed(2)}</p>
                        <div className="absolute -top-2 -right-4 bg-yellow-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg rotate-12">
                            OUT OF 10
                        </div>
                    </div>
                    <p className="text-violet-100 text-lg font-bold mb-2">{getCGPAMessage(result.cgpa)}</p>
                    <p className="text-violet-200/60 text-[10px] font-black uppercase tracking-widest">
                        Across {result.numSems} {result.numSems !== 1 ? 'Terms' : 'Term'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default OverallCGPACalculator;
