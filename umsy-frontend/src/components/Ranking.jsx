import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Trophy, Search, TrendingUp, Users, Award, Calendar, Globe, MapPin,
    Briefcase, Phone, Clock, FileText, CheckCircle, ShieldAlert,
    ArrowLeft, Check, AlertCircle, GraduationCap, RefreshCw, Mail,
    ChevronDown, ChevronUp
} from 'lucide-react';

const Ranking = () => {
    const navigate = useNavigate();

    // ── Profile states ──────────────────────────────────────────────────────
    const [myRanking, setMyRanking] = useState(null);
    const [searchRanking, setSearchRanking] = useState(null);

    // ── Search & UI states ──────────────────────────────────────────────────
    const [searchRegno, setSearchRegno] = useState('');
    const [loadingMyRank, setLoadingMyRank] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [error, setError] = useState('');
    
    // Desktop View Tab State
    const [activeTab, setActiveTab] = useState('performance');

    // Mobile View Collapsible Accordion States
    const [expandedSections, setExpandedSections] = useState({
        performance: true,
        placement: false,
        education: false,
        contact: false
    });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // ── Load personal ranking on mount ──────────────────────────────────────
    useEffect(() => {
        const loadMyRanking = async () => {
            const currentRegno = localStorage.getItem('umsy_regno');
            if (!currentRegno) return;

            // 1. Try cache
            const cachedRanking = localStorage.getItem('umsy_ranking_data');
            if (cachedRanking) {
                try {
                    const parsed = JSON.parse(cachedRanking);
                    if (parsed.regno === currentRegno) {
                        setMyRanking(parsed.data);
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem('umsy_ranking_data');
                }
            }

            // 2. Fetch from API
            setLoadingMyRank(true);
            try {
                const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/ranking`;
                const payload = { registrationNumber: currentRegno };
                const response = await axios.post(url, payload);
                if (response.data?.data) {
                    setMyRanking(response.data.data);
                    localStorage.setItem('umsy_ranking_data', JSON.stringify({ regno: currentRegno, data: response.data.data }));
                }
            } catch (err) {
                console.error('Failed to load user ranking on mount:', err);
            } finally {
                setLoadingMyRank(false);
            }
        };

        loadMyRanking();
    }, []);

    // ── Handle search for others ───────────────────────────────────────────
    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');

        const cleanReg = searchRegno.trim();
        if (!cleanReg) {
            setError('Please enter a registration number');
            return;
        }

        setLoadingSearch(true);
        setSearchRanking(null);

        try {
            const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/ranking`;
            const payload = { registrationNumber: cleanReg };
            const response = await axios.post(url, payload);
            if (response.data?.data) {
                setSearchRanking(response.data.data);
                setActiveTab('performance');
                setExpandedSections({
                    performance: true,
                    placement: false,
                    education: false,
                    contact: false
                });
            } else {
                setError('No ranking details returned for this student.');
            }
        } catch (err) {
            console.error('Error searching ranking:', err);
            setError(err.response?.data?.message || 'Failed to fetch student ranking. Check registration number and try again.');
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleClearSearch = () => {
        setSearchRegno('');
        setSearchRanking(null);
        setError('');
        setActiveTab('performance');
        setExpandedSections({
            performance: true,
            placement: false,
            education: false,
            contact: false
        });
    };

    const tabs = [
        { id: 'performance', label: 'Overview & Rank', icon: Trophy },
        { id: 'placement', label: 'Placements & PEP', icon: Briefcase },
        { id: 'education', label: 'Prior Education', icon: GraduationCap },
        { id: 'contact', label: 'Contact Details', icon: Phone }
    ];

    // Helper component to render rank details card block
    const RenderRankProfile = ({ data, titleSuffix = '' }) => {
        // Headers summaries for collapsed headers on mobile
        const placementSummary = data.companySelectedIn && data.companySelectedIn.toLowerCase() !== 'not selected'
            ? data.companySelectedIn
            : 'Not Selected';

        const educationSummary = (() => {
            const parts = [];
            if (data.CGPA) parts.push(`CGPA: ${data.CGPA}`);
            if (data.xiiMarks) parts.push(`XII: ${data.xiiMarks.split('(')[0].trim()}`);
            if (data.xMarks) parts.push(`X: ${data.xMarks.split('(')[0].trim()}`);
            return parts.join(' | ') || 'No records';
        })();

        return (
            <div className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-[#1c312e] dark:bg-zinc-900 rounded-[2.5rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden shadow-xl text-white">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#bef227]/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-black tracking-tight text-white">{data.Name} {titleSuffix}</h2>
                                {data.status && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        data.status.toLowerCase() === 'active'
                                            ? 'bg-[#bef227]/10 text-[#bef227] border-[#bef227]/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {data.status}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                Reg No: <span className="text-[#bef227]">{data.RegistrationNumber}</span>
                            </p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl max-w-md">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Program / Course</p>
                            <p className="text-xs font-bold text-white leading-snug">{data.Course}</p>
                        </div>
                    </div>
                </div>

                {/* ── MOBILE ACCORDION VIEW (Cool layout without sliding tabs) ── */}
                <div className="block md:hidden space-y-4">
                    {/* 1. Academic Performance */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleSection('performance')}
                            className="w-full flex items-center justify-between p-5 text-left border-none bg-transparent"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#1c312e]/10 dark:bg-[#bef227]/10 flex items-center justify-center text-[#1c312e] dark:text-[#bef227] shrink-0">
                                    <Trophy className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Academic Standing</h4>
                                    {!expandedSections.performance && (
                                        <p className="text-[9px] text-[#bef227] font-black uppercase tracking-widest mt-0.5">
                                            Rank #{data.Rank} • CGPA {data.CGPA || '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {expandedSections.performance ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {expandedSections.performance && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-3.5 animate-in fade-in duration-200">
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Overall Rank</p>
                                    <p className="text-xl font-black text-[#1c312e] dark:text-[#bef227] mt-1.5">
                                        #{data.Rank}
                                        {data.TotalStudents && (
                                            <span className="text-[9px] text-slate-400 font-bold">/{data.TotalStudents.toLocaleString()}</span>
                                        )}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">CGPA</p>
                                    <p className="text-xl font-black text-[#1c312e] dark:text-[#bef227] mt-1.5">{data.CGPA || '—'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50 col-span-2 flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Percentile Standings</p>
                                        <p className="text-sm font-black text-[#1c312e] dark:text-[#bef227] mt-1">{data.percentile || `Top ${data.Percentage}%`}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Active Backlogs</p>
                                        <p className={`text-sm font-black mt-1 ${parseInt(data.reappearBacklog || '0') > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                            {data.reappearBacklog || '0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Placements & PEP */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleSection('placement')}
                            className="w-full flex items-center justify-between p-5 text-left border-none bg-transparent"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#1c312e]/10 dark:bg-[#bef227]/10 flex items-center justify-center text-[#1c312e] dark:text-[#bef227] shrink-0">
                                    <Briefcase className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Placement & PEP Status</h4>
                                    {!expandedSections.placement && (
                                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${placementSummary !== 'Not Selected' ? 'text-emerald-500' : 'text-slate-450'}`}>
                                            {placementSummary}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {expandedSections.placement ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {expandedSections.placement && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Placement Selection</p>
                                    {data.companySelectedIn && data.companySelectedIn.toLowerCase() !== 'not selected' ? (
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <p className="text-xs font-black text-slate-800 dark:text-white">{data.companySelectedIn}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-slate-400 mt-2">Not Selected / Pending Placement Drives</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                        <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Opportunity ID</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-white mt-1.5">{data.placementId || '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                        <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">PEP Status</p>
                                        <p className="text-xs font-black text-[#bef227] mt-1.5">{data.pepFeeDetails || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Prior Education */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleSection('education')}
                            className="w-full flex items-center justify-between p-5 text-left border-none bg-transparent"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#1c312e]/10 dark:bg-[#bef227]/10 flex items-center justify-center text-[#1c312e] dark:text-[#bef227] shrink-0">
                                    <GraduationCap className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Academic Background</h4>
                                    {!expandedSections.education && (
                                        <p className="text-[9px] text-slate-450 font-black uppercase tracking-widest mt-0.5 truncate">
                                            {educationSummary}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {expandedSections.education ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {expandedSections.education && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 gap-3.5 animate-in fade-in duration-200">
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest font-bold">Class XII</p>
                                    <p className="text-base font-black text-[#1c312e] dark:text-[#bef227] mt-1">
                                        {data.xiiMarks ? data.xiiMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest font-bold">Class X</p>
                                    <p className="text-base font-black text-[#1c312e] dark:text-[#bef227] mt-1">
                                        {data.xMarks ? data.xMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                </div>
                                {data.graduationMarks && (
                                    <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50 col-span-2">
                                        <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest font-bold">Graduation / Prior Degree</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{data.graduationMarks}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. Contact Details */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleSection('contact')}
                            className="w-full flex items-center justify-between p-5 text-left border-none bg-transparent"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#1c312e]/10 dark:bg-[#bef227]/10 flex items-center justify-center text-[#1c312e] dark:text-[#bef227] shrink-0">
                                    <Phone className="w-4.5 h-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Contact & System Info</h4>
                                    {!expandedSections.contact && (
                                        <p className="text-[9px] text-slate-450 font-black uppercase tracking-widest mt-0.5 truncate">
                                            {data.email || data.contactNo || '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {expandedSections.contact ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {expandedSections.contact && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 space-y-3.5 animate-in fade-in duration-200">
                                <div className="flex flex-col gap-2">
                                    {data.email && (
                                        <div className="flex items-center gap-2.5">
                                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                            <a href={`mailto:${data.email}`} className="text-xs font-black text-blue-500 hover:underline truncate">
                                                {data.email}
                                            </a>
                                        </div>
                                    )}
                                    {data.contactNo && (
                                        <div className="flex items-center gap-2.5 mt-1">
                                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                            <a href={`tel:${data.contactNo}`} className="text-xs font-black text-blue-500 hover:underline">
                                                {data.contactNo}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Details</p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-zinc-350 mt-1 leading-relaxed">{data.basicDetails || '—'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DESKTOP TABS VIEW (Maintained for layout density on larger screens) ── */}
                <div className="hidden md:block space-y-6">
                    {/* Capsule Tab Navigation */}
                    <div className="bg-slate-100 dark:bg-zinc-850 p-1.5 rounded-full flex gap-1 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[#bef227] text-[#1c312e] shadow-sm'
                                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <TabIcon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Views Container */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-6 shadow-sm min-h-[300px]">
                        {/* PERFORMANCE TAB */}
                        {activeTab === 'performance' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <Trophy className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Overall Rank</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        #{data.Rank}
                                        {data.TotalStudents && (
                                            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">/{data.TotalStudents.toLocaleString()}</span>
                                        )}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <TrendingUp className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Percentage / Standings</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.percentile || `Top ${data.Percentage}%`}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <Award className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Current CGPA</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.CGPA || '—'}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Active Backlogs</p>
                                    <p className={`text-3xl font-black mt-3 ${parseInt(data.reappearBacklog || '0') > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                        {data.reappearBacklog || '0'}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Batch Year</p>
                                    <p className="text-3xl font-black text-slate-800 dark:text-white mt-3">
                                        {data.BatchYear || '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* PLACEMENT TAB */}
                        {activeTab === 'placement' && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                        <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Placement Selection</p>
                                        {data.companySelectedIn && data.companySelectedIn.toLowerCase() !== 'not selected' ? (
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-505">Selected In</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white">{data.companySelectedIn}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-slate-400 mt-4">Not Selected / Pending Placement Drives</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Opportunity ID</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{data.placementId || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Drive Start Date</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{data.opportunityStartDate || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest mb-4">Professional Enhancement Programme (PEP)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">PEP Fee Details</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block ${
                                                data.pepFeeDetails && data.pepFeeDetails.toLowerCase().includes('paid')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                                            }`}>
                                                {data.pepFeeDetails || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">PEP Payment Date</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">{data.pepFeePaymentDate || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRIOR EDUCATION TAB */}
                        {activeTab === 'education' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Class X (Matriculation)</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.xMarks ? data.xMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {data.xMarks && data.xMarks.includes('(') ? data.xMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Class XII (Intermediate)</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.xiiMarks ? data.xiiMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {data.xiiMarks && data.xiiMarks.includes('(') ? data.xiiMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Graduation Records</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.graduationMarks ? data.graduationMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {data.graduationMarks && data.graduationMarks.includes('(') ? data.graduationMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Diploma Records</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {data.diplomaMarks ? data.diplomaMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {data.diplomaMarks && data.diplomaMarks.includes('(') ? data.diplomaMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* CONTACT DETAILS TAB */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-805 flex items-center justify-center text-slate-500 font-bold">
                                            <Mail className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                                            {data.email ? (
                                                <a href={`mailto:${data.email}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1">
                                                    {data.email}
                                                </a>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 mt-1">—</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-805 flex items-center justify-center text-slate-500 font-bold">
                                            <Phone className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
                                            {data.contactNo ? (
                                                <a href={`tel:${data.contactNo}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline block mt-1">
                                                    {data.contactNo}
                                                </a>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 mt-1">—</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 space-y-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Basic Details</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{data.basicDetails || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-455 dark:text-zinc-500 uppercase tracking-widest">Scraped Sync Timestamp</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                                            {data.scrapedAt ? new Date(data.scrapedAt).toLocaleString() : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20 max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1c312e] flex items-center justify-center shadow-lg">
                    <Trophy className="w-6 h-6 text-[#bef227]" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Leaderboard</h1>
                    <p className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Explore rankings, CGPA placement records, and metrics</p>
                </div>
            </div>

            {/* View Mode: Search Results Card */}
            {searchRanking ? (
                <div className="space-y-4">
                    {/* Back header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleClearSearch}
                            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200/20"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>My Ranking</span>
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#bef227] bg-[#bef227]/10 px-3 py-1 rounded-full">
                            Search Result Profile
                        </span>
                    </div>

                    <RenderRankProfile data={searchRanking} />
                </div>
            ) : (
                /* Primary View: User's own Rank details + Search bar at the bottom */
                <div className="space-y-6">
                    {/* Loading skeleton or personal profile */}
                    {loadingMyRank ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                            <RefreshCw className="w-8 h-8 animate-spin text-[#bef227] mb-3" />
                            <p className="text-xs font-bold text-slate-400">Loading your rank profile details...</p>
                        </div>
                    ) : (
                        myRanking && <RenderRankProfile data={myRanking} titleSuffix=" (You)" />
                    )}

                    {/* Search Panel Below */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Search Other Students</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mt-0.5">Lookup placements, rankings, and details by Registration Number</p>
                        </div>

                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={searchRegno}
                                    onChange={(e) => setSearchRegno(e.target.value)}
                                    placeholder="Enter Registration Number (e.g. 12301310)"
                                    className="w-full h-12 px-4 pl-11 bg-slate-50 dark:bg-zinc-850 border border-slate-200/30 dark:border-zinc-800/80 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-650 focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all shadow-inner"
                                    disabled={loadingSearch}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                            <button
                                type="submit"
                                disabled={loadingSearch}
                                className="cursor-pointer h-12 px-8 bg-[#1c312e] dark:bg-[#bef227] text-white dark:text-[#1c312e] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/5 shadow-md shadow-[#bef227]/5"
                            >
                                {loadingSearch ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    'Search'
                                )}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-center gap-3 animate-in fade-in">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ranking;
