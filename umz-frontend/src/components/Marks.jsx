import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getMarks } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Marks = () => {
    const navigate = useNavigate();
    const [marksData, setMarksData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTermIndex, setSelectedTermIndex] = useState(0);
    const [showGraph, setShowGraph] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // First, always check for cached data
            const cachedData = localStorage.getItem('umz_marks_data');
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    setMarksData(parsed);
                    setLoading(false);
                    return; // Use cache, don't fetch
                } catch {
                    localStorage.removeItem('umz_marks_data');
                }
            }

            // No cache available - check if we have cookies
            const cookies = localStorage.getItem('umz_cookies');

            if (!cookies) {
                // No cookies and no cache - show empty state
                setLoading(false);
                setError('');
                setMarksData([]);
                return;
            }

            // We have cookies but no cache - fetch fresh data
            try {
                setLoading(true);
                const result = await getMarks(cookies);
                setMarksData(result.data || []);
                localStorage.setItem('umz_marks_data', JSON.stringify(result.data || []));
                setError('');
            } catch (err) {
                setError(err.message || 'Failed to load marks');
                if (err.message?.includes('session') || err.message?.includes('unauthorized')) {
                    // Session expired - remove cookies
                    localStorage.removeItem('umz_cookies');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-r-transparent" />
                        <p className="mt-4 text-sm text-gray-500">Loading marks data...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
                            <p className="text-gray-600">{error}</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const selectedTerm = marksData[selectedTermIndex] || {};

    // Calculate cross-term comparison data (only for numeric term IDs)
    const crossTermData = marksData
        .filter(term => /^\d+$/.test(term.termId)) // Only numeric term IDs
        .map(term => {
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

                        const marksMatch = mark.marks.match(/(\d+)\/(\d+)/);
                        if (marksMatch) {
                            const obtained = parseFloat(marksMatch[1]);
                            const outOf = parseFloat(marksMatch[2]);
                            const percentage = outOf > 0 ? (obtained / outOf) * 100 : 0;
                            assessmentAvgs[typeName].total += percentage;
                            assessmentAvgs[typeName].count += 1;
                        }
                    });
                });
            }

            const termData = { term: term.termId };
            Object.keys(assessmentAvgs).forEach(type => {
                termData[type] = Math.round(assessmentAvgs[type].total / assessmentAvgs[type].count);
            });

            return termData;
        });

    const assessmentTypes = crossTermData.length > 0
        ? [...new Set(crossTermData.flatMap(term => Object.keys(term).filter(key => key !== 'term')))]
        : [];

    const lineColors = {
        'Attendance': '#10B981',
        'CA': '#3B82F6',
        'Mid Term': '#F59E0B',
        'End Term': '#EF4444',
        'Practical': '#8B5CF6'
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header with Tabs */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1">Marks</h1>
                            <p className="text-gray-500">View your term-wise marks breakdown</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Graph Toggle Button */}
                            <button
                                onClick={() => setShowGraph(!showGraph)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${showGraph
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {showGraph ? 'Hide Analysis' : 'Show Analysis'}
                            </button>

                            {/* Term Tabs */}
                            {marksData.length > 0 && (
                                <div className="flex-1 overflow-x-auto">
                                    <div className="flex gap-2 min-w-max sm:min-w-0">
                                        {marksData.map((term, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedTermIndex(idx)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedTermIndex === idx
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {term.termId}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cross-Term Performance Graph */}
                    {showGraph && crossTermData.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Across Terms</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={crossTermData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="term"
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        label={{ value: 'Average %', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '12px'
                                        }}
                                        labelStyle={{ color: 'white' }}
                                        itemStyle={{ color: 'white' }}
                                        formatter={(value, name) => [`${value}%`, name]}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                                        iconType="line"
                                        iconSize={14}
                                        formatter={(value) => <span style={{ color: '#6B7280', fontSize: '12px' }}>{value}</span>}
                                    />
                                    {assessmentTypes.map((type) => (
                                        <Line
                                            key={type}
                                            type="monotone"
                                            dataKey={type}
                                            name={type}
                                            stroke={lineColors[type] || '#6B7280'}
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                            isAnimationActive={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Subject Cards Grid */}
                    {selectedTerm.subjects && selectedTerm.subjects.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {selectedTerm.subjects.map((subject, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all"
                                >
                                    {/* Subject Header */}
                                    <div className="mb-4">
                                        <p className="text-xs font-mono text-gray-500 mb-1">
                                            {subject.courseCode}
                                        </p>
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {subject.courseName}
                                            </h3>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {subject.marksBreakdown.reduce((total, mark) => {
                                                        // Only count weightage if marks are present and not awaited
                                                        const hasMarks = mark.marks &&
                                                            mark.marks !== 'N/A' &&
                                                            mark.marks.trim() !== '' &&
                                                            !mark.marks.toLowerCase().includes('awaited');
                                                        if (!hasMarks) return total;

                                                        const weightageMatch = mark.weightage.match(/(\d+\.?\d*)/);
                                                        return total + (weightageMatch ? parseFloat(weightageMatch[1]) : 0);
                                                    }, 0)}
                                                    <span className="text-gray-400">/100</span>
                                                </p>
                                                {/* <p className="text-xs text-gray-500">Total Marks</p> */}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Marks Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                                        Assessment Type
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                                        Marks Obtained
                                                    </th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                                        Weightage
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subject.marksBreakdown.map((mark, markIdx) => (
                                                    <tr
                                                        key={markIdx}
                                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {mark.type}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-right text-gray-900">
                                                            {mark.marks}
                                                            {(() => {
                                                                const marksMatch = mark.marks.match(/(\d+\.?\d*)\/(\d+\.?\d*)/);
                                                                if (marksMatch) {
                                                                    const obtained = parseFloat(marksMatch[1]);
                                                                    const total = parseFloat(marksMatch[2]);
                                                                    const percentage = total > 0 ? ((obtained / total) * 100).toFixed(1) : 0;
                                                                    return <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>;
                                                                }
                                                                return null;
                                                            })()}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-right text-gray-900">
                                                            {mark.weightage}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                            <p className="text-gray-500">No marks data available for this term.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Marks;
