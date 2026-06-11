import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, X, ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import { getCourses } from '../services/api';

const Courses = () => {
    const navigate = useNavigate();
    const [courses, setCourses]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [search, setSearch]         = useState('');

    useEffect(() => {
        const load = async () => {
            const cookies = localStorage.getItem('umz_cookies');
            const cachedCourses = localStorage.getItem('umz_courses_data');
            
            if (cachedCourses) {
                try { 
                    setCourses(JSON.parse(cachedCourses)); 
                    setLoading(false); 
                } catch { 
                    localStorage.removeItem('umz_courses_data'); 
                }
            }

            if (cookies) {
                try {
                    setLoading(true);
                    const result = await getCourses(cookies);
                    setCourses(result.data);
                    localStorage.setItem('umz_courses_data', JSON.stringify(result.data));
                } catch (err) { 
                    setError(err.message); 
                } finally { 
                    setLoading(false); 
                }
            } else {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredCourses = courses.filter(c =>
        !search ||
        c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
        c.courseName?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                        <p className="mt-3 text-sm text-gray-400">Loading courses…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-plus-jakarta">
            <Sidebar />

            <main className="flex-1 overflow-y-auto lg:p-0">
                <div className="lg:hidden flex flex-col min-h-full">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Courses Section</h1>
                        <div className="w-9" />
                    </div>

                    {/* Body */}
                    <div className="flex-1 pb-24">
                        {/* Search */}
                        <div className="px-4 pt-4 pb-2">
                            <div className="relative">
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-3 py-2.5 shadow-sm">
                                    <Search className="h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search courses…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <X className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 space-y-4 mt-2">
                            {filteredCourses.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-12 flex flex-col items-center gap-2 text-center">
                                    <BookOpen className="h-7 w-7 text-gray-200 dark:text-gray-700" />
                                    <p className="text-sm font-medium text-gray-400">No courses found</p>
                                </div>
                            ) : (
                                filteredCourses.map((course, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm animate-in fade-in duration-300">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 mb-1 font-mono uppercase">{course.courseCode}</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{course.courseName}</p>
                                            {course.term && <p className="text-[10px] text-gray-400 mt-0.5">Term {course.term}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900 dark:text-white">{course.attendance || '—'}%</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Attendance</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden lg:block max-w-5xl mx-auto px-6 lg:px-10 py-8 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Academic Records</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{courses.length} enrolled subjects</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search courses…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 text-gray-900 dark:text-white placeholder-gray-400 w-56"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
                        {filteredCourses.map((course, index) => {
                            const att = parseInt(course.attendance) || 0;
                            const badgeCls = att >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : att >= 65 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
                            return (
                                <div key={index} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 tracking-wide">{course.courseCode}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{course.courseName}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {course.term && <span className="text-xs text-gray-400">Term {course.term}</span>}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-base font-bold text-gray-900 dark:text-white">{att}%</p>
                                        <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${badgeCls}`}>Attendance</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Courses;
