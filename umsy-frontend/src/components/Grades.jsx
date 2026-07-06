import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Search, SlidersHorizontal, X, GraduationCap, Tag, Star, Filter, ChevronDown, Check, FileText, LayoutGrid, ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import HeaderNav from './HeaderNav';
import { getCourses, getResult, getResultV04, getMarks, getMarksV04 } from '../services/api';

const GradesSkeleton = () => (
    <div className="flex-1 pb-24 px-4 pt-6 space-y-5 animate-pulse">
        {/* Term Performance Card Skeleton */}
        <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-5 text-white relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <div className="h-2.5 w-24 bg-slate-800 rounded" />
                    <div className="h-8 w-20 bg-slate-800 rounded-md" />
                </div>
                <div className="text-right space-y-1.5 flex flex-col items-end">
                    <div className="h-2.5 w-12 bg-slate-800 rounded" />
                    <div className="h-5 w-20 bg-slate-800 rounded-md" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
            </div>
            <GraduationCap className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-5 rotate-12" />
        </div>

        {/* Subject Card Skeletons */}
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 flex items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 min-w-0 space-y-2.5 pl-2">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-3.5 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                        </div>
                        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-150 dark:border-gray-700 flex flex-col items-center justify-center space-y-1">
                        <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-2 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DesktopGradesSkeleton = () => (
    <div className="hidden lg:block max-w-5xl mx-auto px-6 lg:px-10 py-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-start">
            <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800/80 rounded-md" />
            </div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800/80 rounded-xl" />
        </div>

        <div className="h-11 w-full bg-gray-200 dark:bg-gray-800/80 rounded-xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-md" />
                            <div className="h-3.5 w-16 bg-gray-200 dark:bg-gray-800 rounded-md" />
                        </div>
                        <div className="h-4.5 w-5/6 bg-gray-200 dark:bg-gray-800 rounded-md" />
                        <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-800 rounded-md" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gray-150 dark:bg-gray-800 flex flex-col items-center justify-center space-y-1">
                        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-2 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Helpers for matching Roman numeral term IDs
const isRoman = (str) => typeof str === 'string' && /^[IVXivx]+$/.test(str);

const romanToInt = (roman) => {
    const map = { I: 1, V: 5, X: 10, L: 50 };
    let total = 0;
    const r = String(roman).toUpperCase();
    for (let i = 0; i < r.length; i++) {
        const current = map[r[i]];
        const next = map[r[i + 1]];
        if (next && current < next) {
            total += next - current;
            i++;
        } else {
            total += current;
        }
    }
    return total;
};

const intToRoman = (num) => {
    const map = {
        M: 1000, CM: 900, D: 500, CD: 400,
        C: 100, XC: 90, L: 50, XL: 40,
        X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let roman = '';
    for (let key in map) {
        while (num >= map[key]) {
            roman += key;
            num -= map[key];
        }
    }
    return roman;
};

/* Grade colour mapping */
const gradeConfig = (g) => {
    const map = {
        'O':  { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', accent: 'bg-violet-500' },
        'A+': { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-500' },
        'A':  { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', accent: 'bg-blue-500' },
        'B+': { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', accent: 'bg-amber-500' },
        'B':  { text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', accent: 'bg-orange-500' },
        'C+': { text: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', accent: 'bg-pink-500' },
        'C':  { text: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-500' },
        'D':  { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', accent: 'bg-gray-400' },
        'E':  { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', accent: 'bg-red-500' },
        'F':  { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', accent: 'bg-red-600' },
    };
    return map[g] || { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', accent: 'bg-gray-300' };
};

const grades = ['O', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F'];

const Grades = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMarksPath = location.pathname === '/marks';

    const [courses, setCourses]       = useState([]);
    const [resultData, setResultData] = useState(null);
    const [marksData, setMarksData]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    
    // Persist View State
    const [search, setSearch]         = useState(() => localStorage.getItem('umsy_grades_search') || '');
    const [activeSem, setActiveSem]   = useState('');
    const [viewMode, setViewMode]     = useState(() => {
        if (isMarksPath) return 'marks';
        return localStorage.getItem('umsy_grades_view_mode') || 'grades';
    });
    const [selectedGrades, setSelectedGrades] = useState(() => {
        try { return JSON.parse(localStorage.getItem('umsy_grades_selected')) || []; }
        catch { return []; }
    });

    const [showGradePicker, setShowGradePicker] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);
    const tabRefs = useRef({});
    const prevLatestSemRef = useRef('');

    // Save state to localStorage
    useEffect(() => { localStorage.setItem('umsy_grades_search', search); }, [search]);
    useEffect(() => { if (activeSem) localStorage.setItem('umsy_grades_active_sem', activeSem); }, [activeSem]);
    useEffect(() => { localStorage.setItem('umsy_grades_view_mode', viewMode); }, [viewMode]);
    useEffect(() => { localStorage.setItem('umsy_grades_selected', JSON.stringify(selectedGrades)); }, [selectedGrades]);

    useEffect(() => {
        const load = async () => {
            const si = localStorage.getItem('umsy_student_info');
            if (si) { try { setStudentInfo(JSON.parse(si)); } catch {} }

            const cookies = localStorage.getItem('umsy_cookies');
            const isV04 = localStorage.getItem('umsy_is_v04') === 'true';

            // Load Results/Grades
            const cachedResult = localStorage.getItem('umsy_result_data');
            let hasNullCredits = false;
            if (cachedResult) {
                try {
                    const parsed = JSON.parse(cachedResult);
                    setResultData(parsed);
                    if (parsed) {
                        if (parsed.semesters) {
                            for (const sem of parsed.semesters) {
                                if (sem.subjects) {
                                    for (const sub of sem.subjects) {
                                        if (sub.credit === null || sub.credit === undefined) {
                                            hasNullCredits = true;
                                            break;
                                        }
                                    }
                                }
                                if (hasNullCredits) break;
                            }
                        }
                        if (parsed.rplGrades && !hasNullCredits) {
                            for (const sem of parsed.rplGrades) {
                                if (sem.subjects) {
                                    for (const sub of sem.subjects) {
                                        if (sub.credit === null || sub.credit === undefined) {
                                            hasNullCredits = true;
                                            break;
                                        }
                                    }
                                }
                                if (hasNullCredits) break;
                            }
                        }
                    }
                } catch {}
            }

            if ((!cachedResult || hasNullCredits) && cookies) {
                try {
                    const res = isV04
                        ? await getResultV04(cookies)
                        : await getResult(cookies);
                    setResultData(res.data);
                    localStorage.setItem('umsy_result_data', JSON.stringify(res.data));
                } catch (e) { console.warn('Result fetch failed:', e.message); }
            }

            // Load Marks
            const cachedMarks = localStorage.getItem('umsy_marks_data');
            let hasNullMarksCredits = false;
            if (cachedMarks) {
                try {
                    const parsed = JSON.parse(cachedMarks);
                    setMarksData(parsed);
                    if (parsed && Array.isArray(parsed)) {
                        for (const term of parsed) {
                            if (term.subjects) {
                                for (const sub of term.subjects) {
                                    if (sub.credit === null || sub.credit === undefined) {
                                        hasNullMarksCredits = true;
                                        break;
                                    }
                                }
                            }
                            if (hasNullMarksCredits) break;
                        }
                    }
                } catch {}
            }

            if ((!cachedMarks || hasNullMarksCredits) && cookies) {
                try {
                    const res = isV04
                        ? await getMarksV04(cookies)
                        : await getMarks(cookies);
                    setMarksData(res.data || []);
                    localStorage.setItem('umsy_marks_data', JSON.stringify(res.data || []));
                } catch (e) { console.warn('Marks fetch failed:', e.message); }
            }

            // Load Courses (still needed to match attendance in grades view)
            const cachedCourses = localStorage.getItem('umsy_courses_data');
            if (cachedCourses) {
                try { setCourses(JSON.parse(cachedCourses)); setLoading(false); }
                catch { localStorage.removeItem('umsy_courses_data'); setLoading(false); }
            } else if (cookies) {
                try {
                    const result = await getCourses(cookies);
                    setCourses(result.data);
                    localStorage.setItem('umsy_courses_data', JSON.stringify(result.data));
                } catch (err) { console.error('Course fetch failed:', err.message); }
                finally { setLoading(false); }
            } else {
                setLoading(false);
            }
        };
        load();
    }, []);

    const termMapping = React.useMemo(() => {
        const termIds = new Set();
        if (resultData?.semesters) {
            resultData.semesters.forEach(s => { if (s.termId) termIds.add(String(s.termId)); });
        }
        if (marksData) {
            marksData.forEach(tm => { if (tm.termId) termIds.add(String(tm.termId)); });
        }
        if (courses) {
            courses.forEach(c => { if (c.term) termIds.add(String(c.term)); });
        }

        const uniqueTerms = Array.from(termIds);

        // Separate Roman and purely numeric regular terms
        const romanTerms = uniqueTerms.filter(id => isRoman(id));
        const numericRegularTerms = uniqueTerms.filter(id => /^\d{6}$/.test(id));
        const nonRegularTerms = uniqueTerms.filter(id => !isRoman(id) && !/^\d{6}$/.test(id));

        // Sort Roman terms
        romanTerms.sort((a, b) => romanToInt(a) - romanToInt(b));

        // Sort numeric regular terms
        numericRegularTerms.sort((a, b) => parseInt(a) - parseInt(b));

        const mapping = {};

        // Map Roman terms
        romanTerms.forEach((id, idx) => {
            mapping[id] = `Sem ${idx + 1}`;
        });

        // Map numeric regular terms
        numericRegularTerms.forEach((id, idx) => {
            mapping[id] = `Sem ${idx + 1}`;
        });

        // Map non-regular terms to their raw IDs (e.g. '12324B'), considering 'R' suffix as RPL
        nonRegularTerms.forEach(id => {
            if (/r$/i.test(id)) {
                mapping[id] = `RPL — ${id}`;
            } else {
                mapping[id] = id;
            }
        });

        return mapping;
    }, [resultData, marksData, courses]);

    const allSubjects = React.useMemo(() => {
        const rows = [];
        const processedTermIds = new Set();
        
        if (resultData && resultData.semesters && resultData.semesters.length > 0) {
            (resultData.semesters || []).forEach((sem, semIdx) => {
                (sem.subjects || []).forEach(sub => {
                    const matchedCourse = courses.find(c =>
                        c.courseCode && sub.code &&
                        c.courseCode.toLowerCase().includes(sub.code.toLowerCase().split('-')[0])
                    );
                    
                    // Find marks for this subject
                    const regularMarks = (marksData || []).filter(tm => /^\d{6}$/.test(tm.termId));
                    let termMarks = (marksData || []).find(tm => String(tm.termId) === String(sem.termId));
                    if (!termMarks && isRoman(sem.termId)) {
                        const idx = romanToInt(sem.termId) - 1;
                        if (idx >= 0 && idx < regularMarks.length) {
                            termMarks = regularMarks[idx];
                        }
                    }
                    if (!termMarks && regularMarks.length > 0 && semIdx < regularMarks.length) {
                        termMarks = regularMarks[semIdx];
                    }

                    if (termMarks?.termId) {
                        processedTermIds.add(String(termMarks.termId));
                    }

                    const subMarks = termMarks?.subjects?.find(ms => 
                        ms.courseCode && sub.code &&
                        ms.courseCode.toLowerCase().includes(sub.code.toLowerCase().split('-')[0])
                    );

                    let termInfo = (studentInfo?.TermwiseCGPA || []).find(t => String(t.term) === String(sem.termId));
                    if (!termInfo) {
                        const idx = isRoman(sem.termId) ? (romanToInt(sem.termId) - 1) : semIdx;
                        if (idx >= 0 && idx < (studentInfo?.TermwiseCGPA || []).length) {
                            termInfo = studentInfo.TermwiseCGPA[idx];
                        }
                    }

                    const mappedTitle = termMapping[sem.termId] || `Sem ${sem.termId}`;

                    rows.push({
                        name: sub.name || subMarks?.courseName || '',
                        code: sub.code || subMarks?.courseCode || '',
                        credit: sub.credit,
                        grade: sub.grade || '—',
                        termId: termMarks?.termId || sem.termId,
                        termTitle: mappedTitle,
                        attendance: matchedCourse?.attendance || null,
                        type: 'semester',
                        tgpa: sem.tgpa || termInfo?.tgpa || '—',
                        cgpa: termInfo?.cgpa || '—',
                        marks: subMarks?.marksBreakdown || []
                    });
                });
            });

            (resultData.rplGrades || []).forEach((grp, grpIdx) => {
                (grp.subjects || []).forEach(sub => {
                    const mappedTitle = termMapping[grp.termId] ? `RPL — ${termMapping[grp.termId]}` : `RPL — Sem ${grp.termId}`;
                    
                    // Find marks for this RPL subject
                    const regularMarks = (marksData || []).filter(tm => /^\d{6}$/.test(tm.termId));
                    let termMarks = (marksData || []).find(tm => String(tm.termId) === String(grp.termId));
                    if (!termMarks && isRoman(grp.termId)) {
                        const idx = romanToInt(grp.termId) - 1;
                        if (idx >= 0 && idx < regularMarks.length) {
                            termMarks = regularMarks[idx];
                        }
                    }
                    if (!termMarks && regularMarks.length > 0 && grpIdx < regularMarks.length) {
                        termMarks = regularMarks[grpIdx];
                    }

                    if (termMarks?.termId) {
                        processedTermIds.add(String(termMarks.termId));
                    }

                    const subMarks = termMarks?.subjects?.find(ms => 
                        ms.courseCode && sub.code &&
                        ms.courseCode.toLowerCase().includes(sub.code.toLowerCase().split('-')[0])
                    );

                    rows.push({
                        name: sub.name || subMarks?.courseName || '',
                        code: sub.code || subMarks?.courseCode || '',
                        credit: sub.credit,
                        grade: sub.grade || '—',
                        termId: termMarks?.termId || grp.termId,
                        termTitle: mappedTitle,
                        attendance: null,
                        type: 'rpl',
                        tgpa: null,
                        cgpa: null,
                        marks: subMarks?.marksBreakdown || []
                    });
                });
            });

            // Process leftover marksData (backlog, RPL, etc.)
            (marksData || []).forEach(term => {
                if (processedTermIds.has(String(term.termId))) return;

                (term.subjects || []).forEach(sub => {
                    const matchedCourse = courses.find(c =>
                        c.courseCode && sub.courseCode &&
                        c.courseCode.toLowerCase().includes(sub.courseCode.toLowerCase().split('-')[0])
                    );

                    const termInfo = (studentInfo?.TermwiseCGPA || []).find(t => String(t.term) === String(term.termId));
                    const mappedTitle = termMapping[term.termId] || term.termId;
                    const isRpl = /r$/i.test(String(term.termId));

                    rows.push({
                        name: sub.courseName || '',
                        code: sub.courseCode || '',
                        credit: sub.credit !== undefined ? sub.credit : null,
                        grade: '—',
                        termId: term.termId,
                        termTitle: mappedTitle,
                        attendance: matchedCourse?.attendance || null,
                        type: isRpl ? 'rpl' : 'backlog',
                        tgpa: termInfo?.tgpa || '—',
                        cgpa: termInfo?.cgpa || '—',
                        marks: sub.marksBreakdown || []
                    });
                });
            });
        } else if (marksData && marksData.length > 0) {
            // Fallback: Build from marksData and courses
            marksData.forEach(term => {
                (term.subjects || []).forEach(sub => {
                    const matchedCourse = courses.find(c =>
                        c.courseCode && sub.courseCode &&
                        c.courseCode.toLowerCase().includes(sub.courseCode.toLowerCase().split('-')[0])
                    );

                    const termInfo = (studentInfo?.TermwiseCGPA || []).find(t => String(t.term) === String(term.termId));
                    const mappedTitle = termMapping[term.termId] || `Sem ${term.termId}`;

                    rows.push({
                        name: sub.courseName || '',
                        code: sub.courseCode || '',
                        credit: sub.credit !== undefined ? sub.credit : null,
                        grade: '—',
                        termId: term.termId,
                        termTitle: mappedTitle,
                        attendance: matchedCourse?.attendance || null,
                        type: 'semester',
                        tgpa: termInfo?.tgpa || '—',
                        cgpa: termInfo?.cgpa || '—',
                        marks: sub.marksBreakdown || []
                    });
                });
            });
        }

        return rows;
    }, [resultData, courses, studentInfo, termMapping, marksData]);

    const semList = React.useMemo(() => {
        if (allSubjects.length === 0) return [];
        let titles = [...new Set(allSubjects.map(s => s.termTitle))];
        if (viewMode === 'grades') {
            titles = titles.filter(t => t.startsWith('Sem '));
        }
        titles.sort((a, b) => {
            const isRplA = a.includes('RPL');
            const isRplB = b.includes('RPL');
            if (isRplA && !isRplB) return 1; // RPL comes last
            if (!isRplA && isRplB) return -1;

            const isSemA = a.startsWith('Sem ');
            const isSemB = b.startsWith('Sem ');
            
            if (isSemA && !isSemB) return -1; // Sem X comes first
            if (!isSemA && isSemB) return 1;
            
            if (isSemA && isSemB) {
                const numA = parseInt(a.replace('Sem ', ''));
                const numB = parseInt(b.replace('Sem ', ''));
                return numB - numA; // Sem 5, Sem 4... (newest first)
            }
            
            // Otherwise, both are raw term IDs, sort them descending numerically/alphabetically
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            if (numA !== numB) {
                return numB - numA;
            }
            return String(b).localeCompare(String(a));
        });
        return titles;
    }, [allSubjects, viewMode]);

    useEffect(() => {
        if (semList.length > 0) {
            const cached = localStorage.getItem('umsy_grades_active_sem');
            if (cached && semList.includes(cached)) {
                setActiveSem(cached);
            }
        }
    }, [semList]);

    useEffect(() => {
        if (activeSem && tabRefs.current[activeSem]) {
            tabRefs.current[activeSem].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeSem]);

    const groupedFiltered = React.useMemo(() => {
        const filtered = allSubjects.filter(s => {
            const matchSem = s.termTitle === activeSem;
            const matchSearch = !search ||
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.code.toLowerCase().includes(search.toLowerCase());
            const matchGrade = viewMode === 'marks' || selectedGrades.length === 0 || selectedGrades.includes(s.grade);
            return matchSem && matchSearch && matchGrade;
        });

        const groupsMap = {};
        filtered.forEach(s => {
            if (!groupsMap[s.termTitle]) groupsMap[s.termTitle] = [];
            groupsMap[s.termTitle].push(s);
        });

        return Object.keys(groupsMap).map(title => ({
            title,
            subjects: groupsMap[title],
            type: groupsMap[title][0].type,
            tgpa: groupsMap[title][0].tgpa,
            cgpa: groupsMap[title][0].cgpa,
            termId: groupsMap[title][0].termId
        }));
    }, [allSubjects, activeSem, search, selectedGrades, viewMode]);

    const toggleGrade = (g) => {
        setSelectedGrades(prev => 
            prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g]
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-plus-jakarta">
                <Sidebar />

                <main className="flex-1 overflow-y-auto lg:p-0">
                    {/* MOBILE SKELETON */}
                    <div className="lg:hidden flex flex-col min-h-full">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                                {isMarksPath ? 'Marks Section' : 'Grades Section'}
                            </h1>
                            <div className="w-9" />
                        </div>

                        {/* View Switcher & Search Bar */}
                        <div className="px-4 pt-4 pb-2 space-y-3">
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                <div className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm flex items-center justify-center gap-2">
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    Grades
                                </div>
                                <div className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-center text-gray-400 flex items-center justify-center gap-2">
                                    <FileText className="h-3.5 w-3.5" />
                                    Marks
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-3 py-2.5 shadow-sm">
                                    <Search className="h-4 w-4 text-gray-400" />
                                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Sem Tabs Placeholder */}
                        <div className="px-4 pb-3">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 animate-pulse">
                                {['Sem 6', 'Sem 5', 'Sem 4', 'Sem 3'].map((s, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold ${
                                            idx === 1
                                                ? 'bg-gray-900 text-white dark:bg-gray-800'
                                                : 'bg-gray-150 dark:bg-gray-800/40 text-gray-400'
                                        }`}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <GradesSkeleton />
                    </div>

                    {/* DESKTOP SKELETON */}
                    <DesktopGradesSkeleton />
                </main>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW */}
            <div className="lg:hidden flex flex-col min-h-full">
                {/* Body */}
                <div className="flex-1 pb-24">
                    {/* Semester Navigation Tabs */}
                    {semList.length > 0 && (
                        <div className="px-4 py-3 overflow-x-auto no-scrollbar border-b border-zinc-100/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900">
                            <div className="flex gap-1.5 min-w-max">
                                {semList.map(title => (
                                    <button
                                        key={title}
                                        ref={el => tabRefs.current[title] = el}
                                        onClick={() => {
                                            setActiveSem(title);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            activeSem === title 
                                                ? 'bg-[#1c312e] dark:bg-[#bef227] text-white dark:text-[#1c312e] border-transparent' 
                                                : 'bg-white dark:bg-zinc-900 text-slate-500 border-slate-200/60 dark:border-zinc-800'
                                        }`}
                                    >
                                        {title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!activeSem ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-150/45 dark:border-zinc-800/80 rounded-3xl m-4">
                            <SlidersHorizontal className="h-8 w-8 text-[#bef227] mb-3" />
                            <h3 className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider">Select Semester</h3>
                            <p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed">Please select a semester at the top to unlock search filters and view your grades/marks.</p>
                        </div>
                    ) : (
                        <React.Fragment>
                            {/* View Switcher & Search */}
                            <div className="px-4 pt-4 pb-2 space-y-3">
                                {/* Segmented Control */}
                                <div className="flex p-1 bg-slate-100 dark:bg-zinc-850 rounded-2xl">
                                    <button 
                                        onClick={() => setViewMode('grades')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'grades' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        Grades
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('marks')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'marks' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Marks
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-[#bef227] transition-all">
                                            <Search className="h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={`Search ${viewMode === 'grades' ? 'grades' : 'marks'}…`}
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                className="flex-1 text-xs font-bold bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                                            />
                                            {search && (
                                                <button onClick={() => setSearch('')} className="p-0.5 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-850">
                                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                            )}
                                            {viewMode === 'grades' && (
                                                <button 
                                                    onClick={() => setShowGradePicker(!showGradePicker)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showGradePicker || selectedGrades.length > 0 ? 'bg-[#bef227] text-[#1c312e]' : 'bg-slate-50 dark:bg-zinc-850 text-slate-400'}`}
                                                >
                                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Grade Picker Dropdown */}
                                    {viewMode === 'grades' && showGradePicker && (
                                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-3 shadow-md animate-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800/80">
                                                <span className="text-[10px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Filter by Grade</span>
                                                {selectedGrades.length > 0 && (
                                                    <button onClick={() => setSelectedGrades([])} className="text-[9px] font-black uppercase tracking-widest text-red-500">Clear</button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {grades.map(g => {
                                                    const isSel = selectedGrades.includes(g);
                                                    const cfg = gradeConfig(g);
                                                    return (
                                                        <button
                                                            key={g}
                                                            onClick={() => toggleGrade(g)}
                                                            className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                                                                isSel 
                                                                    ? `${cfg.bg} ${cfg.text} border ${cfg.border} ring-2 ring-emerald-500/10` 
                                                                    : 'bg-slate-50 dark:bg-zinc-850 text-slate-500 border border-transparent'
                                                            }`}
                                                        >
                                                            {g}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="px-4 space-y-6 mt-3">
                                {groupedFiltered.length === 0 ? (
                                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-12 text-center shadow-sm">
                                        <BookOpen className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-450 uppercase tracking-widest">No matching records found</p>
                                    </div>
                                ) : (
                                    groupedFiltered.map((group, gIdx) => {
                                        const totalCredits = group.subjects.reduce((sum, s) => sum + (s.credit || 0), 0);
                                        return (
                                            <div key={group.title} className="space-y-4 animate-in fade-in duration-300">
                                                {/* Stats Card */}
                                        {viewMode === 'grades' && group.type !== 'rpl' && group.tgpa && selectedGrades.length === 0 && (
                                            <div className="bg-[#1c312e] rounded-3xl p-5 text-white shadow-md relative overflow-hidden border border-white/5">
                                                <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#bef227]/5 rounded-full blur-2xl pointer-events-none" />
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Term Performance</p>
                                                        <h3 className="text-3xl font-black text-[#bef227]">{group.tgpa} <span className="text-xs font-bold text-white uppercase tracking-widest opacity-60">TGPA</span></h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sem ID</p>
                                                        <p className="text-sm font-black text-white">{group.termId}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-350">
                                                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {group.subjects.length} Subjects</span>
                                                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {totalCredits.toFixed(1)} Credits</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Subject Cards */}
                                        <div className="space-y-3">
                                            {group.subjects.map((sub, idx) => {
                                                const cfg = gradeConfig(sub.grade);
                                                
                                                if (viewMode === 'marks') {
                                                    const totalObtained = Math.round(sub.marks.reduce((sum, m) => {
                                                        const parts = (m.weightage || '').split('/');
                                                        const val = parseFloat(parts[0]);
                                                        return sum + (isNaN(val) ? 0 : val);
                                                    }, 0) * 100) / 100;

                                                    return (
                                                        <div key={`${gIdx}-${idx}`} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-5 shadow-sm">
                                                            <div className="flex items-center justify-between mb-3.5">
                                                                <div className="flex-1 min-w-0">
                                                                    {sub.name && sub.name !== 'N/A' && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-850 text-[9px] font-black text-slate-450 dark:text-zinc-500 font-mono tracking-wider uppercase">{sub.code}</span>
                                                                    )}
                                                                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate mt-1">{sub.name && sub.name !== 'N/A' ? sub.name : sub.code}</h4>
                                                                </div>
                                                                <div className="text-right ml-4">
                                                                    <p className="text-lg font-black text-[#1c312e] dark:text-[#bef227]">{totalObtained}<span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">/100</span></p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                                                                {sub.marks.length > 0 ? (
                                                                    <>
                                                                        <div className="grid grid-cols-[1fr_80px_60px] gap-3 px-1 mb-2.5">
                                                                            <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-left">Assessment Type</span>
                                                                            <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center">Obtained</span>
                                                                            <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-right">Weightage</span>
                                                                        </div>
                                                                        <div className="space-y-2.5">
                                                                            {sub.marks.map((m, mIdx) => (
                                                                                <div key={mIdx} className="grid grid-cols-[1fr_80px_60px] gap-3 items-center">
                                                                                    <span className="text-[10px] font-medium text-slate-550 dark:text-zinc-400 truncate text-left">{m.type}</span>
                                                                                    <span className="text-[10px] font-black text-slate-800 dark:text-white text-center">{m.marks}</span>
                                                                                    <span className="text-[10px] font-black text-blue-600 dark:text-[#bef227] text-right">{m.weightage}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center py-2 gap-1 opacity-40">
                                                                        <FileText className="h-4 w-4 text-slate-400" />
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No marks breakdown available</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={`${gIdx}-${idx}`}
                                                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 p-4 flex items-center justify-between gap-4 shadow-sm group hover:border-[#bef227] transition-all duration-300 relative overflow-hidden"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                {sub.name && sub.name !== 'N/A' && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-850 text-[9px] font-black text-slate-450 dark:text-zinc-500 font-mono tracking-wider uppercase">{sub.code}</span>
                                                                )}
                                                                {sub.attendance && (
                                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${parseInt(sub.attendance) >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                        {sub.attendance}% Att.
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">
                                                                {sub.name && sub.name !== 'N/A' ? sub.name : sub.code}
                                                            </p>
                                                            <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                                                                <Star className="h-2.5 w-2.5" /> {sub.credit != null ? `${sub.credit.toFixed(1)} Credits` : '— Credits'}
                                                            </p>
                                                        </div>
                                                        <div className={`flex-shrink-0 w-11 h-11 rounded-2xl ${cfg.bg} flex flex-col items-center justify-center border ${cfg.border} transition-all`}>
                                                            <span className={`text-sm font-black ${cfg.text}`}>{sub.grade}</span>
                                                            <span className={`text-[7px] font-black uppercase opacity-65 ${cfg.text}`}>Grade</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                            </div>
                        </React.Fragment>
                    )}
                </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden lg:flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Academic Records</h1>
                    <p className="text-xs text-slate-450 dark:text-zinc-500 mt-0.5">Performance tracking and grades overview</p>
                </div>

                {/* Desktop Semester Tabs */}
                {semList.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-zinc-150/40 dark:border-zinc-800/40">
                        {semList.map(title => (
                            <button
                                key={title}
                                onClick={() => setActiveSem(title)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                    activeSem === title 
                                        ? 'bg-[#1c312e] dark:bg-[#bef227] text-white dark:text-[#1c312e] border-transparent shadow-sm' 
                                        : 'bg-white dark:bg-zinc-900 text-slate-500 border-slate-200/60 dark:border-zinc-800 hover:border-[#bef227]/30'
                                }`}
                            >
                                {title}
                            </button>
                        ))}
                    </div>
                )}

                {!activeSem ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-16 text-center shadow-sm">
                        <SlidersHorizontal className="w-8 h-8 text-[#bef227] mx-auto mb-3" />
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Select Semester</h3>
                        <p className="text-xs text-slate-450 mt-1">Please select a semester at the top to unlock search filters and view your grades/marks.</p>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-3">
                                {/* Selector */}
                                <div className="flex p-1 bg-slate-100 dark:bg-zinc-850 rounded-2xl w-48">
                                    <button 
                                        onClick={() => setViewMode('grades')}
                                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'grades' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Grades
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('marks')}
                                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'marks' ? 'bg-[#bef227] text-[#1c312e] shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Marks
                                    </button>
                                </div>

                                {/* Search bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${viewMode === 'grades' ? 'grades' : 'marks'}…`}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-10 pr-4 h-11 text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 text-slate-800 dark:text-white placeholder-slate-400 w-56 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grade picker on desktop */}
                        {viewMode === 'grades' && (
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-[22px] p-4 shadow-sm flex items-center gap-4 animate-in slide-in-from-top-2">
                                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">Filter Grades</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {grades.map(g => {
                                        const isSel = selectedGrades.includes(g);
                                        const cfg = gradeConfig(g);
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => toggleGrade(g)}
                                                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                                    isSel 
                                                        ? `${cfg.bg} ${cfg.text} border ${cfg.border} ring-2 ring-emerald-500/10` 
                                                        : 'bg-slate-50 dark:bg-zinc-850 text-slate-500 border border-transparent'
                                                }`}
                                            >
                                                {g}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                )}

                {/* Main dynamic card grid on desktop */}
                {activeSem && (
                    <div className="space-y-6">
                    {groupedFiltered.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-16 text-center shadow-sm">
                            <BookOpen className="w-8 h-8 text-slate-350 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No academic records match the search filter</p>
                        </div>
                    ) : (
                        groupedFiltered.map((group, gIdx) => {
                            const totalCredits = group.subjects.reduce((sum, s) => sum + (s.credit || 0), 0);
                            return (
                                <div key={group.title} className="space-y-4 animate-in fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-2">
                                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            Semester {group.termId} {group.type === 'rpl' && <span className="text-[10px] text-slate-400">(Re-appear)</span>}
                                        </h2>
                                        {viewMode === 'grades' && group.type !== 'rpl' && group.tgpa && selectedGrades.length === 0 && (
                                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                <span>TGPA: <strong className="text-[#1c312e] dark:text-[#bef227] font-black">{group.tgpa}</strong></span>
                                                <span>·</span>
                                                <span>{group.subjects.length} Subjects</span>
                                                <span>·</span>
                                                <span>{totalCredits.toFixed(1)} Credits</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {group.subjects.map((sub, idx) => {
                                            const cfg = gradeConfig(sub.grade);

                                            if (viewMode === 'marks') {
                                                const totalObtained = Math.round(sub.marks.reduce((sum, m) => {
                                                    const parts = (m.weightage || '').split('/');
                                                    const val = parseFloat(parts[0]);
                                                    return sum + (isNaN(val) ? 0 : val);
                                                }, 0) * 100) / 100;

                                                return (
                                                    <div key={`${gIdx}-${idx}`} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-850 text-[9px] font-black text-slate-450 dark:text-zinc-500 font-mono tracking-wider uppercase">{sub.code}</span>
                                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate mt-1.5">{sub.name && sub.name !== 'N/A' ? sub.name : sub.code}</h4>
                                                            </div>
                                                            <div className="text-right ml-4 shrink-0">
                                                                <p className="text-lg font-black text-[#1c312e] dark:text-[#bef227]">{totalObtained}<span className="text-[10px] text-slate-450 font-bold">/100</span></p>
                                                            </div>
                                                        </div>
                                                        <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-3 flex-1">
                                                            {sub.marks.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {sub.marks.map((m, mIdx) => (
                                                                        <div key={mIdx} className="flex justify-between items-center text-[10px]">
                                                                            <span className="font-medium text-slate-500 dark:text-zinc-400 truncate w-32">{m.type}</span>
                                                                            <span className="font-black text-slate-850 dark:text-white">{m.marks}</span>
                                                                            <span className="font-black text-blue-600 dark:text-[#bef227]">{m.weightage}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center py-6 gap-1 opacity-30">
                                                                    <FileText className="w-5 h-5 text-slate-400" />
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No marks</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={`${gIdx}-${idx}`} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-5 shadow-sm flex items-center justify-between gap-4 group hover:border-[#bef227] transition-all duration-300">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-850 text-[9px] font-black text-slate-450 dark:text-zinc-500 font-mono tracking-wider uppercase">{sub.code}</span>
                                                            {sub.attendance && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider ${parseInt(sub.attendance) >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                    {sub.attendance}% Att.
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                            {sub.name && sub.name !== 'N/A' ? sub.name : sub.code}
                                                        </p>
                                                        <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                                                            <Star className="h-2.5 w-2.5" /> {sub.credit != null ? `${sub.credit.toFixed(1)} Credits` : '— Credits'}
                                                        </p>
                                                    </div>
                                                    <div className={`shrink-0 w-11 h-11 rounded-2xl ${cfg.bg} flex flex-col items-center justify-center border ${cfg.border} transition-all`}>
                                                        <span className={`text-sm font-black ${cfg.text}`}>{sub.grade}</span>
                                                        <span className={`text-[7px] font-black uppercase opacity-65 ${cfg.text}`}>Grade</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    </div>
                )}
            </div>
        </>
    );
};

export default Grades;
