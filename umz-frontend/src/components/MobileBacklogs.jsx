import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CheckCircle2, FolderCheck, BookOpen, GraduationCap } from 'lucide-react';
import nobacklogImg from '../assets/nobacklog.png';

const MobileBacklogs = () => {
    const navigate = useNavigate();
    const [backlogs, setBacklogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cached = localStorage.getItem('umz_result_data');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const backlogList = [];
                const backlogGrades = new Set(['E', 'F', 'G', 'I']);

                
                // Also check regular grades if they exist in a similar structure
                if (parsed.semesters) {
                    parsed.semesters.forEach(sem => {
                        (sem.subjects || []).forEach(sub => {
                            if (sub.grade && backlogGrades.has(sub.grade.trim().toUpperCase())) {
                                backlogList.push({ ...sub, semester: sem.semester });
                            }
                        });
                    });
                }

                setBacklogs(backlogList);
            } catch (e) {
                console.error("Error parsing results for backlogs", e);
            }
        }
        setLoading(false);
    }, []);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="p-2 -ml-2 text-gray-900 dark:text-white active:scale-90 transition-transform"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">Backlogs</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </div>

            <div className="max-w-md mx-auto px-6 pt-6 mt-25 flex flex-col items-center">
                {backlogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center w-full mt-10">
                        {/* Large Empty State Image */}
                        <div className="relative mb-10 w-full flex justify-center">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gray-100/40 dark:bg-gray-800/20 rounded-full blur-3xl" />
                            <div className="relative w-72 h-72 flex items-center justify-center">
                                <img 
                                    src={nobacklogImg} 
                                    alt="No backlogs" 
                                    className="w-full h-full object-contain drop-shadow-2xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 -mt-25">
                            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">Great!</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-light leading-relaxed">
                                You have no reappear or active backlogs.<br />Keep up the good work.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 w-full">
                        {backlogs.map((sub, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg text-[8px] font-bold tracking-widest uppercase">
                                                SEM {sub.semester}
                                            </span>
                                            <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg text-[8px] font-bold tracking-widest uppercase">
                                                Grade {sub.grade}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sub.code}</h3>
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter truncate max-w-[200px]">{sub.title}</p>
                                    </div>
                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-500">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileBacklogs;
