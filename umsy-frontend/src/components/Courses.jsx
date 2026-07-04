import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, X, ChevronLeft, Calendar } from 'lucide-react';
import Sidebar from './Sidebar';
import { getCourses } from '../services/api';

const CoursesSkeleton = () => (
    <div className="flex-1 pb-24 px-4 pt-6 space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
                    <div className="h-4.5 w-5/6 bg-gray-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="text-right space-y-2">
                    <div className="h-5 w-10 bg-gray-200 dark:bg-zinc-800 rounded ml-auto" />
                    <div className="h-3.5 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
                </div>
            </div>
        ))}
    </div>
);

const DesktopCoursesSkeleton = () => (
    <div className="hidden lg:block max-w-5xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-4.5 w-32 bg-gray-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="h-10 w-56 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-3xl divide-y divide-slate-100 dark:divide-zinc-800/80">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded" />
                        <div className="h-4.5 w-72 bg-gray-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="text-right space-y-2">
                        <div className="h-5 w-10 bg-gray-200 dark:bg-zinc-800 rounded ml-auto" />
                        <div className="h-4.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const Courses = () => {
    const navigate = useNavigate();
    const [courses, setCourses]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [search, setSearch]         = useState('');

    useEffect(() => {
        const load = async () => {
            const cookies = localStorage.getItem('umsy_cookies');
            const cachedCourses = localStorage.getItem('umsy_courses_data');
            
            if (cachedCourses) {
                try { 
                    setCourses(JSON.parse(cachedCourses)); 
                    setLoading(false); 
                } catch { 
                    localStorage.removeItem('umsy_courses_data'); 
                }
            }

            if (cookies) {
                try {
                    const result = await getCourses(cookies);
                    setCourses(result.data);
                    localStorage.setItem('umsy_courses_data', JSON.stringify(result.data));
                } catch (err) { 
                    setError(err.message); 
                    if (err.message.includes('session') || err.message.includes('unauthorized')) {
                        localStorage.removeItem('umsy_cookies');
                        window.dispatchEvent(new CustomEvent('trigger-resync'));
                    }
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
            <>
                <CoursesSkeleton />
                <DesktopCoursesSkeleton />
            </>
        );
    }

    return (
        <>
            {/* MOBILE VIEW */}
            <div className="lg:hidden flex flex-col min-h-full">
                {/* Search */}
                <div className="px-4 pt-4 pb-2">
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#bef227] transition-all">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search courses…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 text-xs bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-bold"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800">
                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 space-y-4 mt-2">
                    {filteredCourses.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-12 flex flex-col items-center gap-2 text-center shadow-sm">
                            <BookOpen className="h-7 w-7 text-slate-350 dark:text-zinc-650" />
                            <p className="text-xs font-bold text-slate-400">No courses found</p>
                        </div>
                    ) : (
                        filteredCourses.map((course, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 p-4 flex items-center justify-between gap-4 shadow-sm group hover:border-[#bef227] transition-all duration-300 animate-in fade-in duration-300">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 mb-1 font-mono uppercase">{course.courseCode}</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{course.courseName}</p>
                                    {course.term && <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-wider">Term {course.term}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-[#1c312e] dark:text-[#bef227]">{course.attendance || '—'}%</p>
                                    <p className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Attendance</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden lg:flex flex-col gap-6">
                <div className="flex items-center justify-between pt-2">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Courses Section</h1>
                        <p className="text-xs text-slate-450 dark:text-zinc-500 mt-0.5">{courses.length} enrolled subjects</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search courses…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 h-11 text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 text-slate-800 dark:text-white placeholder-slate-400 w-60 transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-[28px] overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-sm">
                    {filteredCourses.length === 0 ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
                            <BookOpen className="w-8 h-8 text-slate-350 dark:text-zinc-650" />
                            <p className="text-xs font-bold text-slate-400">No matching subjects found</p>
                        </div>
                    ) : (
                        filteredCourses.map((course, index) => {
                            const att = parseInt(course.attendance) || 0;
                            const badgeCls = att >= 75 
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' 
                                : att >= 65 
                                    ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' 
                                    : 'text-red-700 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30';
                            return (
                                <div key={index} className="flex items-center gap-4 px-6 py-4.5 hover:bg-slate-50/50 dark:hover:bg-zinc-850/45 transition-colors">
                                    <div className="shrink-0 w-8 h-8 rounded-2xl bg-[#1c312e] dark:bg-zinc-800 text-[#bef227] dark:text-white flex items-center justify-center text-xs font-black">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-mono font-black text-slate-400 dark:text-zinc-500 tracking-wider mb-0.5 uppercase">{course.courseCode}</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{course.courseName}</p>
                                        <div className="flex items-center gap-3 mt-1 text-[9px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                                            {course.term && <span>Term {course.term}</span>}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right flex items-center gap-4">
                                        <div>
                                            <p className="text-base font-black text-slate-900 dark:text-white leading-none">{att}%</p>
                                            <span className={`text-[8px] font-black uppercase border rounded-full px-2 py-0.5 inline-block mt-1 ${badgeCls}`}>Attendance</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default Courses;
