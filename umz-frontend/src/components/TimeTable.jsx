import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Download } from 'lucide-react';
import Sidebar from './Sidebar';
import { getTimeTable } from '../services/api';
import { generateTimetablePDF } from '../utils/generateTimetablePDF';

const TimeTable = () => {
    const navigate = useNavigate();
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Handle PDF download
    const handleDownloadPDF = () => {
        try {
            setDownloadLoading(true);

            // Get student name from localStorage
            const studentInfo = localStorage.getItem('umz_student_info');
            let studentName = 'Student';

            if (studentInfo) {
                try {
                    const parsed = JSON.parse(studentInfo);
                    studentName = parsed.StudentName || 'Student';
                } catch (e) {
                    console.error('Error parsing student info:', e);
                }
            }

            // Generate PDF
            generateTimetablePDF(timetable, studentName);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloadLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            // First, always check for cached timetable data
            const cachedTimetable = localStorage.getItem('umz_timetable_data');
            if (cachedTimetable) {
                try {
                    const parsed = JSON.parse(cachedTimetable);
                    console.log('📦 Using cached timetable data');
                    setTimetable(parsed);
                    setLoading(false);
                    return; // Use cache, don't fetch
                } catch (e) {
                    console.error('Error parsing cached timetable data:', e);
                    localStorage.removeItem('umz_timetable_data');
                }
            }

            // No cache available - check if we have cookies
            const cookies = localStorage.getItem('umz_cookies');

            if (!cookies) {
                // No cookies and no cache - show empty state
                console.log('⚠️ No cookies and no cached timetable');
                setLoading(false);
                setError('');
                setTimetable({});
                return;
            }

            // We have cookies but no cache - fetch fresh data
            try {
                setLoading(true);
                console.log('🌐 Fetching fresh timetable from API');
                const result = await getTimeTable(cookies);
                setTimetable(result.data);

                // Store timetable data in localStorage for caching
                localStorage.setItem('umz_timetable_data', JSON.stringify(result.data));

                setError('');
            } catch (err) {
                setError(err.message);
                if (err.message.includes('session') || err.message.includes('unauthorized')) {
                    // Session expired - remove cookies
                    localStorage.removeItem('umz_cookies');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // Extract all unique time slots from the timetable
    const getTimeSlots = () => {
        const slots = new Set();
        Object.values(timetable).forEach(dayClasses => {
            dayClasses.forEach(cls => {
                if (cls.time) slots.add(cls.time);
            });
        });
        return Array.from(slots).sort();
    };

    // Get class for a specific day and time slot
    const getClassForSlot = (day, timeSlot) => {
        if (!timetable[day]) return null;
        return timetable[day].find(cls => cls.time === timeSlot);
    };

    // Get current day name (Monday, Tuesday, etc.)
    const getCurrentDay = () => {
        const dayIndex = new Date().getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dayIndex];
        // return 'Thursday';
    };

    // Check if a time slot is currently active
    const isCurrentTimeSlot = (timeSlot) => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

        // Parse time slot (e.g., "09:00-10:00")
        const [start, end] = timeSlot.split('-').map(t => {
            const [hours, minutes] = t.split(':').map(Number);
            return hours * 60 + minutes;
        });

        return currentTime >= start && currentTime < end;
    };

    // Check if a class is currently ongoing
    const isCurrentClass = (day, timeSlot) => {
        const currentDay = getCurrentDay();
        return day === currentDay && isCurrentTimeSlot(timeSlot);
    };

    const timeSlots = getTimeSlots();

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-gray-900 border-r-transparent"></div>
                        <p className="mt-4 text-sm text-gray-500">Loading timetable...</p>
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

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto p-6 lg:p-10">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-900 rounded-xl">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Time Table</h1>
                                <p className="text-gray-500">Your weekly class schedule</p>
                            </div>
                        </div>

                        {/* Download PDF Button */}
                        {Object.keys(timetable).length > 0 && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloadLoading}
                                className="flex items-center gap-2 px-4 py-2.5  text-white rounded-xl bg-gray-900 hover:scale-105 hover:shadow-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Download className="h-4 w-4" />
                                {/* <span className="font-medium">
                                    {downloadLoading ? 'Generating...' : 'Download PDF'}
                                </span> */}
                            </button>
                        )}
                    </div>

                    {/* Timetable Grid */}
                    {timeSlots.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <Calendar className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">No classes scheduled</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile scroll hint */}
                            <div className="md:hidden bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-4">
                                <p className="text-xs text-blue-900">💡 Swipe left/right to view all days</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-max text-xs">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-gray-900 to-gray-800">
                                                <th className="px-1 md:px-2 py-2 text-left text-[10px] md:text-xs font-semibold text-white border-r border-gray-700 sticky left-0 bg-gray-900 z-10 w-16 md:w-24">
                                                    <div className="flex items-center gap-0.5 md:gap-1">
                                                        <Clock className="ml-6 h-2.5 w-2.5 md:h-3 md:w-3" />
                                                        <span className="hidden sm:inline">Time</span>
                                                    </div>
                                                </th>
                                                {days.map(day => (
                                                    <th key={day} className="px-1 md:px-2 py-2 text-center text-[10px] md:text-xs font-semibold text-white border-r border-gray-700 last:border-r-0 w-20 md:w-32">
                                                        <span className="hidden sm:inline">{day.substring(0, 3)}</span>
                                                        <span className="sm:hidden">{day.substring(0, 1)}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {timeSlots.map((timeSlot, idx) => (
                                                <tr key={timeSlot} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-xs font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap sticky left-0 bg-inherit z-10">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0 sm:gap-1">
                                                            <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 text-gray-400 hidden sm:block" />
                                                            <span className="text-[8px] md:text-[10px] leading-tight">{timeSlot}</span>
                                                        </div>
                                                    </td>
                                                    {days.map(day => {
                                                        const classInfo = getClassForSlot(day, timeSlot);
                                                        const isCurrent = classInfo && isCurrentClass(day, timeSlot);

                                                        return (
                                                            <td key={`${day}-${timeSlot}`} className="px-0.5 md:px-1.5 py-1 md:py-1.5 border-r border-gray-200 last:border-r-0">
                                                                {classInfo ? (
                                                                    <div className={`border-l-2 rounded p-1 md:p-1.5 hover:shadow-md transition-shadow ${isCurrent
                                                                        ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-600 animate-pulse'
                                                                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-500'
                                                                        }`}>
                                                                        <div className="text-[8px] md:text-[10px] text-gray-700 text-center leading-tight">
                                                                            <div className={`mb-0.5 ${isCurrent ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                                                                {classInfo.type}
                                                                                {isCurrent && <span className="ml-0.5 md:ml-1">●</span>}
                                                                            </div>
                                                                            <div className="space-y-0.5">
                                                                                <div className='font-semibold'>
                                                                                    G:{classInfo.group}
                                                                                </div>
                                                                                <div className="hidden sm:block">
                                                                                    R: {classInfo.room}
                                                                                </div>
                                                                                <div className="sm:hidden text-[7px]">
                                                                                    {classInfo.room}
                                                                                </div>
                                                                                <div className="hidden sm:block">
                                                                                    S:{classInfo.section}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center text-gray-400 text-[8px] md:text-[10px] py-1">
                                                                        -
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Legend */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
                        <div className="flex items-center gap-3 md:gap-6 flex-wrap text-xs md:text-sm">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-br from-green-100 to-emerald-100 border-l-2 md:border-l-4 border-green-600 rounded"></div>
                                <span className="text-gray-600">Current</span>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-2 md:border-l-4 border-blue-500 rounded"></div>
                                <span className="text-gray-600">Scheduled</span>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="w-3 h-3 md:w-4 md:h-4 bg-white border border-gray-200 rounded"></div>
                                <span className="text-gray-600">No Class</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TimeTable;
