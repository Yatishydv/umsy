import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BookOpen, RefreshCw, Tag } from 'lucide-react';
import Sidebar from './Sidebar';
import { getResult } from '../services/api';

const gradeColors = {
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

const gradeLabel = (g) => gradeColors[g] || 'bg-gray-100 text-gray-600';

const Result = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedTerms, setExpandedTerms] = useState({});

    const fetchData = async (force = false) => {
        setLoading(true);
        setError('');

        if (!force) {
            const cached = localStorage.getItem('umz_result_data');
            if (cached) {
                try {
                    setData(JSON.parse(cached));
                    setLoading(false);
                    return;
                } catch { localStorage.removeItem('umz_result_data'); }
            }
        }

        const cookies = localStorage.getItem('umz_cookies');
        if (!cookies) { setLoading(false); return; }

        try {
            const res = await getResult(cookies);
            setData(res.data);
            localStorage.setItem('umz_result_data', JSON.stringify(res.data));
            // Expand all by default
            const expanded = {};
            (res.data?.semesters || []).forEach((s) => { expanded[s.termId] = true; });
            // Also expand RPL groups
            (res.data?.rplGrades || []).forEach((g) => { expanded['rpl_' + g.termId] = true; });
            setExpandedTerms(expanded);
        } catch (err) {
            setError(err.message || 'Failed to fetch result');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Expand all semesters on first data load
    useEffect(() => {
        if (data?.semesters && Object.keys(expandedTerms).length === 0) {
            const expanded = {};
            data.semesters.forEach((s) => { expanded[s.termId] = true; });
            (data.rplGrades || []).forEach((g) => { expanded['rpl_' + g.termId] = true; });
            setExpandedTerms(expanded);
        }
    }, [data]);

    const toggleTerm = (termId) => {
        setExpandedTerms((prev) => ({ ...prev, [termId]: !prev[termId] }));
    };

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-r-transparent" />
                        <p className="mt-4 text-sm text-gray-500">Loading result data...</p>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Error ─── */
    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <p className="text-gray-700 font-medium mb-1">Error</p>
                        <p className="text-sm text-gray-500">{error}</p>
                        <button onClick={() => fetchData(true)} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                            Retry
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── No data ─── */
    if (!data) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 p-8 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">No result data available. Please log in first.</p>
                </main>
            </div>
        );
    }

    const { cgpa, semesters, rplGrades = [] } = data;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1">Academic Result</h1>
                            <p className="text-gray-500">Subject-wise grades and credits across all semesters</p>
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>

                    {/* CGPA Card */}
                    {cgpa && (
                        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-8 text-white flex items-center gap-6">
                            <div>
                                <p className="text-sm font-medium opacity-75 mb-1">Cumulative GPA</p>
                                <p className="text-6xl font-bold">{cgpa}</p>
                                <p className="text-sm opacity-60 mt-2">Out of 10.0</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-sm opacity-75">Total Semesters</p>
                                <p className="text-4xl font-bold">{semesters.length}</p>
                            </div>
                        </div>
                    )}

                    {/* Semester Accordion */}
                    <div className="space-y-4">
                        {semesters.map((sem) => {
                            const isOpen = expandedTerms[sem.termId];
                            const totalCredits = sem.subjects.reduce((a, s) => a + (s.credit || 0), 0);

                            return (
                                <div
                                    key={sem.termId}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                                >
                                    {/* Semester Header */}
                                    <button
                                        onClick={() => toggleTerm(sem.termId)}
                                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-900">Term {sem.termId}</p>
                                                <p className="text-xs text-gray-500">
                                                    {sem.subjects.length} subjects · {totalCredits.toFixed(1)} credits
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {sem.tgpa && (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg text-sm font-bold">
                                                    TGPA {sem.tgpa}
                                                </span>
                                            )}
                                            {isOpen ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Subject Table */}
                                    {isOpen && (
                                        <div className="border-t border-gray-100">
                                            {/* Table header */}
                                            <div className="grid grid-cols-12 px-6 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                <div className="col-span-2">Code</div>
                                                <div className="col-span-7">Course Name</div>
                                                <div className="col-span-1 text-center">Credits</div>
                                                <div className="col-span-2 text-center">Grade</div>
                                            </div>

                                            {/* Rows */}
                                            {sem.subjects.map((sub, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`grid grid-cols-12 px-6 py-3 items-center text-sm border-t border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                                                >
                                                    <div className="col-span-2 font-mono text-xs text-gray-500">{sub.code}</div>
                                                    <div className="col-span-7 font-medium text-gray-900 pr-4">{sub.name}</div>
                                                    <div className="col-span-1 text-center text-gray-600 font-medium">
                                                        {sub.credit != null ? sub.credit.toFixed(1) : '—'}
                                                    </div>
                                                    <div className="col-span-2 text-center">
                                                        {sub.grade ? (
                                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${gradeLabel(sub.grade)}`}>
                                                                {sub.grade}
                                                            </span>
                                                        ) : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* RPL Grades Section */}
                    {rplGrades.length > 0 && (
                        <div className="space-y-4">
                            {/* RPL Section Header */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-amber-200" />
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Recognition of Prior Learning (RPL)</span>
                                </div>
                                <div className="flex-1 h-px bg-amber-200" />
                            </div>

                            {/* RPL Note */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    ⚠️ Only RPL course grades are currently visible. CGPA will be updated after full result declaration for the corresponding regular term.
                                </p>
                            </div>

                            {/* RPL Accordion */}
                            {rplGrades.map((grp) => {
                                const key = 'rpl_' + grp.termId;
                                const isOpen = expandedTerms[key];
                                return (
                                    <div key={key} className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
                                        {/* Group Header */}
                                        <button
                                            onClick={() => toggleTerm(key)}
                                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                                                    <Tag className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-semibold text-gray-900">RPL — Term {grp.termId}</p>
                                                    <p className="text-xs text-gray-500">{grp.subjects.length} subject{grp.subjects.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            {isOpen
                                                ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                                : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </button>

                                        {/* RPL Subject Rows */}
                                        {isOpen && (
                                            <div className="border-t border-amber-50">
                                                <div className="grid grid-cols-12 px-6 py-2 bg-amber-50/60 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                                    <div className="col-span-2">Code</div>
                                                    <div className="col-span-8">Course Name</div>
                                                    <div className="col-span-2 text-center">Grade</div>
                                                </div>
                                                {grp.subjects.map((sub, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`grid grid-cols-12 px-6 py-3 items-center text-sm border-t border-amber-50 hover:bg-amber-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-amber-50/20'}`}
                                                    >
                                                        <div className="col-span-2 font-mono text-xs text-gray-500">{sub.code}</div>
                                                        <div className="col-span-8 font-medium text-gray-900 pr-4">{sub.name}</div>
                                                        <div className="col-span-2 text-center">
                                                            {sub.grade ? (
                                                                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${gradeLabel(sub.grade)}`}>
                                                                    {sub.grade}
                                                                </span>
                                                            ) : '—'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default Result;
