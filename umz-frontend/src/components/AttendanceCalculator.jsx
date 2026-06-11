import React, { useState, useEffect } from 'react';

const AttendanceCalculator = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [courseInputs, setCourseInputs] = useState({});

    useEffect(() => {
        loadAttendanceData();
    }, []);

    // Cache course inputs whenever they change
    useEffect(() => {
        if (Object.keys(courseInputs).length > 0) {
            localStorage.setItem('umz_calculator_inputs', JSON.stringify(courseInputs));
        }
    }, [courseInputs]);

    const loadAttendanceData = () => {
        try {
            setLoading(true);
            const cachedData = localStorage.getItem('umz_attendance_data');

            if (!cachedData) {
                setError('No attendance data found. Please visit the Attendance View tab first to load your data.');
                setLoading(false);
                return;
            }

            const parsed = JSON.parse(cachedData);

            // De-duplicate: keep only FIRST occurrence of each courseCode
            const seenCodes = new Set();
            const uniqueParsed = (parsed || []).filter(item => {
                if (seenCodes.has(item.courseCode)) return false;
                seenCodes.add(item.courseCode);
                return true;
            });

            setAttendanceData(uniqueParsed || []);

            // Try to load saved calculator inputs
            const cachedInputs = localStorage.getItem('umz_calculator_inputs');
            let initialInputs = {};

            if (cachedInputs) {
                try {
                    const savedInputs = JSON.parse(cachedInputs);
                    // Verify that saved inputs match current courses
                    const currentCourseCodes = (uniqueParsed || []).map(item => item.courseCode);
                    const savedCourseCodes = Object.keys(savedInputs);

                    // If courses match, use saved inputs
                    if (savedCourseCodes.every(code => currentCourseCodes.includes(code))) {
                        initialInputs = savedInputs;
                    }
                } catch (err) {
                    console.error('Error parsing cached inputs:', err);
                }
            }

            // Initialize inputs with default values for any courses not in cache
            (uniqueParsed || []).forEach(item => {
                // Only initialize if not already in cached inputs
                if (!initialInputs[item.courseCode]) {
                    // Prefer UMS-official percent; fall back to calculated
                    let currentPercentage;
                    if (item.summaryPercent != null) {
                        const val = parseFloat(String(item.summaryPercent).replace('%', ''));
                        currentPercentage = isNaN(val) ? 0 : val;
                    } else {
                        currentPercentage = item.totalRecords > 0
                            ? (item.presentCount / item.totalRecords) * 100
                            : 0;
                    }

                    initialInputs[item.courseCode] = {
                        startDate: '',
                        endDate: '',
                        lecturesPerWeek: '',
                        targetPercentage: Math.max(75, Math.ceil(currentPercentage))
                    };
                }
            });

            setCourseInputs(initialInputs);
            setLoading(false);
        } catch (err) {
            console.error('Error loading attendance data:', err);
            setError('Failed to load attendance data from cache.');
            setLoading(false);
        }
    };

    // Use UMS-official percent from summary when available; fall back to (attended+OD)/delivered.
    const getPercentage = (item) => {
        if (item.summaryPercent != null) {
            const val = parseFloat(String(item.summaryPercent).replace('%', ''));
            if (!isNaN(val)) return val;
        }
        const od = parseInt(item.od) || 0;
        const effective = (item.presentCount || 0) + od;
        const delivered = item.totalRecords || 0;
        return delivered > 0 ? (effective / delivered) * 100 : 0;
    };

    const updateInput = (courseCode, field, value) => {
        setCourseInputs(prev => ({
            ...prev,
            [courseCode]: {
                ...prev[courseCode],
                [field]: value
            }
        }));
    };

    const calculateResults = (subject) => {
        const input = courseInputs[subject.courseCode];

        // Check if all required fields are filled
        if (!input?.startDate || !input?.endDate || !input?.lecturesPerWeek) {
            return null;
        }

        // (attended + duty leaves) counts as present towards attendance
        const od = parseInt(subject.od) || 0;
        const present = (subject.presentCount || 0) + od;
        const total = subject.totalRecords || 0;
        const lecturesPerWeek = parseInt(input.lecturesPerWeek) || 0;
        const target = parseFloat(input.targetPercentage) || 75;

        // Calculate weeks remaining
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        const today = new Date();

        // Validation
        if (end <= start || lecturesPerWeek <= 0) {
            return null;
        }

        const effectiveStart = today > start ? today : start;
        const diffTime = end.getTime() - effectiveStart.getTime();
        const weeksRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));

        // Calculate classes left
        const classesLeft = weeksRemaining * lecturesPerWeek;
        const totalFutureClasses = total + classesLeft;

        // Current percentage
        const current = total > 0 ? (present / total) * 100 : 0;

        // Calculate based on whether current is above or below target
        let minToAttend, canBunk, achievable, maxPossible, minPossible;

        if (classesLeft === 0) {
            // No classes left, target cannot be changed
            minToAttend = 0;
            canBunk = 0;
            achievable = Math.abs(current - target) < 0.01; // Current is at target
            maxPossible = current;
            minPossible = current;
        } else {
            // Calculate max possible (attend all remaining)
            maxPossible = totalFutureClasses > 0
                ? ((present + classesLeft) / totalFutureClasses) * 100
                : 0;

            // Calculate min possible (attend none of remaining)
            minPossible = totalFutureClasses > 0
                ? (present / totalFutureClasses) * 100
                : 0;

            // Check if target is achievable
            achievable = target >= minPossible && target <= maxPossible;

            if (achievable) {
                // Calculate exactly how many classes needed to attend to hit target
                // Formula: (present + attended) / (total + classesLeft) = target / 100
                // Solving for attended: attended = (target * (total + classesLeft) / 100) - present
                const exactAttendNeeded = (target * totalFutureClasses / 100) - present;
                minToAttend = Math.max(0, Math.ceil(exactAttendNeeded));

                // If exactAttendNeeded is negative or zero, student can bunk all classes
                if (exactAttendNeeded <= 0) {
                    // Current is already above target, calculate max classes to bunk while maintaining target
                    // Formula: (present + attended) / (total + classesLeft) >= target / 100
                    // We want minimum attended such that: (present + attended) / (total + classesLeft) = target / 100
                    // So: attended = (target * totalFutureClasses / 100) - present
                    // If this is negative, student can bunk all remaining classes
                    const minAttendToMaintainTarget = Math.max(0, (target * totalFutureClasses / 100) - present);
                    minToAttend = Math.ceil(minAttendToMaintainTarget);
                    canBunk = classesLeft - minToAttend;
                } else {
                    canBunk = Math.max(0, classesLeft - minToAttend);
                }
            } else {
                // Target not achievable - show how many would be needed anyway
                minToAttend = Math.ceil((target * totalFutureClasses / 100) - present);
                canBunk = 0;
            }
        }

        return {
            totalClasses: total,
            classesAttended: present,
            classesLeft: classesLeft,
            canBunk: Math.max(0, canBunk),
            mustAttend: Math.max(0, minToAttend),
            currentPercentage: current.toFixed(2),
            achievable: achievable,
            maxPossible: maxPossible.toFixed(2),
            minPossible: minPossible.toFixed(2),
            target: target,
            weeksRemaining: weeksRemaining,
            currentAboveTarget: current > target
        };
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-r-transparent" />
                    <p className="mt-4 text-sm text-gray-500">Loading calculator data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 How to use:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Enter start and end dates for each course</li>
                    <li>Input the number of lectures per week</li>
                    <li>Adjust target attendance percentage if needed</li>
                    <li>Results will appear automatically when all fields are filled</li>
                </ul>
            </div>

            {/* Course Cards Grid */}
            {attendanceData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {attendanceData.map((subject, index) => {
                        const input = courseInputs[subject.courseCode] || {};
                        const results = calculateResults(subject);

                        return (
                            <div
                                key={index}
                                className="rounded-2xl shadow-sm border-2 border-gray-200 bg-white p-6"
                            >
                                {/* Course Header */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {subject.courseCode}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {subject.courseTitle}
                                    </p>
                                </div>

                                {/* Current Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b">
                                    <div>
                                        <p className="text-xs text-gray-500">Current %</p>
                                        <p className="text-lg font-bold">
                                            {getPercentage(subject).toFixed(2)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Attended / Total</p>
                                        <p className="text-lg font-bold">
                                            {(subject.presentCount || 0) + (parseInt(subject.od) || 0)} / {subject.totalRecords || 0}
                                        </p>
                                        {(parseInt(subject.od) || 0) > 0 && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                incl. {subject.od} duty leave{subject.od !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Input Fields */}
                                <div className="space-y-3 mb-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={input.startDate || ''}
                                                onChange={(e) => updateInput(subject.courseCode, 'startDate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={input.endDate || ''}
                                                onChange={(e) => updateInput(subject.courseCode, 'endDate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Lectures/Week
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={input.lecturesPerWeek || ''}
                                                onChange={(e) => updateInput(subject.courseCode, 'lecturesPerWeek', e.target.value)}
                                                placeholder="e.g., 4"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Target %
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={input.targetPercentage || ''}
                                                onChange={(e) => updateInput(subject.courseCode, 'targetPercentage', e.target.value)}
                                                placeholder="75"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Results Section */}
                                {results ? (
                                    <div className="border-t pt-4">
                                        {results.achievable ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-600 mb-1">Weeks Left</p>
                                                        <p className="text-xl font-bold text-gray-900">
                                                            {results.weeksRemaining}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-600 mb-1">Classes Left</p>
                                                        <p className="text-xl font-bold text-blue-600">
                                                            {results.classesLeft}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-600 mb-1">
                                                            {results.currentAboveTarget ? 'Min to Attend' : 'Must Attend'}
                                                        </p>
                                                        <p className="text-xl font-bold text-green-600">
                                                            {results.mustAttend}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-600 mb-1">Can Bunk</p>
                                                        <p className="text-xl font-bold text-orange-600">
                                                            {results.canBunk}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-900 text-white rounded-lg p-3 text-center">
                                                    {results.currentAboveTarget ? (
                                                        <>
                                                            <p className="text-xs opacity-90 mb-1">
                                                                To maintain at least {results.target}% attendance
                                                            </p>
                                                            <p className="text-lg font-bold">
                                                                You can bunk up to {results.canBunk} out of {results.classesLeft} classes
                                                            </p>
                                                            <p className="text-xs opacity-75 mt-1">
                                                                (Your attendance will drop from {results.currentPercentage}% to ~{results.target}%)
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs opacity-90 mb-1">
                                                                To reach {results.target}% attendance
                                                            </p>
                                                            <p className="text-lg font-bold">
                                                                Attend at least {results.mustAttend} out of {results.classesLeft} classes
                                                            </p>
                                                            <p className="text-xs opacity-75 mt-1">
                                                                (Can bunk {results.canBunk} classes)
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-100 border border-red-200 rounded-lg p-4 text-center">
                                                <p className="text-sm text-red-800 font-medium mb-1">
                                                    🚫 Target Not Achievable
                                                </p>
                                                {parseFloat(results.currentPercentage) > results.target ? (
                                                    <>
                                                        <p className="text-xs text-red-600">
                                                            Minimum possible: {results.minPossible}%
                                                        </p>
                                                        <p className="text-xs text-red-600 mt-2">
                                                            Even if you bunk all {results.classesLeft} remaining classes, your attendance will only drop to {results.minPossible}%
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-xs text-red-600">
                                                            Maximum possible: {results.maxPossible}%
                                                        </p>
                                                        <p className="text-xs text-red-600 mt-2">
                                                            Even if you attend all {results.classesLeft} remaining classes, you can only reach {results.maxPossible}%
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-gray-500 text-center italic">
                                            Fill all fields above to see calculations
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500">No attendance data available.</p>
                    <p className="text-sm text-gray-400 mt-2">Visit the Attendance View tab to load your data.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceCalculator;
