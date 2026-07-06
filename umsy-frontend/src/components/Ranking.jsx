import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Trophy, Search, TrendingUp, Users, Award, Calendar, Globe, MapPin,
    Briefcase, Mail, Phone, Clock, FileText, CheckCircle, ShieldAlert,
    ArrowLeft, Check, AlertCircle, GraduationCap, RefreshCw
} from 'lucide-react';

const Ranking = () => {
    const navigate = useNavigate();
    const [regno, setRegno] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('performance');

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!regno.trim()) {
            setError('Please enter a registration number');
            return;
        }

        setLoading(true);
        setError('');
        setStudentData(null);

        try {
            const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/ranking`;
            const payload = { registrationNumber: regno };
            const response = await axios.post(url, payload);
            setStudentData(response.data.data);
            setActiveTab('performance');
        } catch (err) {
            console.error('Error fetching ranking:', err);
            setError(err.response?.data?.message || 'Failed to fetch student ranking. Please check the registration number and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setRegno('');
        setStudentData(null);
        setError('');
    };

    const tabs = [
        { id: 'performance', label: 'Overview & Rank', icon: Trophy },
        { id: 'placement', label: 'Placements & PEP', icon: Briefcase },
        { id: 'education', label: 'Prior Education', icon: GraduationCap },
        { id: 'contact', label: 'Contact Details', icon: Phone }
    ];

    return (
        <div className="space-y-6 pb-20 max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1c312e] flex items-center justify-center shadow-lg">
                    <Trophy className="w-6 h-6 text-[#bef227]" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Academic Leaderboard</h1>
                    <p className="text-sm text-slate-500 font-medium">Search for student academic performance, rankings, and placement profiles</p>
                </div>
            </div>

            {/* Search Input Container */}
            <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-6 shadow-sm">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={regno}
                            onChange={(e) => setRegno(e.target.value)}
                            placeholder="Enter registration number (e.g. 12301310)"
                            className="w-full h-12 px-4 pl-11 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-650 focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all"
                            disabled={loading}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 sm:flex-none h-12 px-8 bg-[#1c312e] dark:bg-[#bef227] text-white dark:text-[#1c312e] rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                'Search'
                            )}
                        </button>
                        {studentData && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="h-12 px-5 bg-slate-50 dark:bg-zinc-850 border border-slate-150 dark:border-zinc-800/80 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 active:scale-95 transition-all"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-center gap-3 animate-in fade-in">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* Results Output */}
            {studentData && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Student Basic Info Card */}
                    <div className="bg-[#1c312e] dark:bg-zinc-900 rounded-[2.5rem] p-6 lg:p-8 border border-white/5 relative overflow-hidden shadow-xl text-white">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#bef227]/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-2xl font-black tracking-tight text-white">{studentData.Name}</h2>
                                    {studentData.status && (
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            studentData.status.toLowerCase() === 'active'
                                                ? 'bg-[#bef227]/10 text-[#bef227] border-[#bef227]/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {studentData.status}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                    Reg No: <span className="text-[#bef227]">{studentData.RegistrationNumber}</span>
                                </p>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl max-w-md">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Program / Course</p>
                                <p className="text-xs font-bold text-white leading-snug">{studentData.Course}</p>
                            </div>
                        </div>
                    </div>

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

                    {/* Tab Views */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/60 dark:border-zinc-800 p-6 shadow-sm min-h-[300px]">
                        {/* PERFORMANCE TAB */}
                        {activeTab === 'performance' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                                {/* Overall Rank */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <Trophy className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Overall Rank</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        #{studentData.Rank}
                                        {studentData.TotalStudents && (
                                            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">/{studentData.TotalStudents.toLocaleString()}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Percentile */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <TrendingUp className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Percentage / Standings</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.percentile || `Top ${studentData.Percentage}%`}
                                    </p>
                                </div>

                                {/* CGPA */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.03] dark:opacity-[0.06] group-hover:scale-115 transition-transform duration-300">
                                        <Award className="w-24 h-24 text-[#bef227]" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Current CGPA</p>
                                    <p className="text-3xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.CGPA || '—'}
                                    </p>
                                </div>

                                {/* Backlogs */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Active Backlogs</p>
                                    <p className={`text-3xl font-black mt-3 ${parseInt(studentData.reappearBacklog || '0') > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                        {studentData.reappearBacklog || '0'}
                                    </p>
                                </div>

                                {/* Batch Year */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Batch Year</p>
                                    <p className="text-3xl font-black text-slate-800 dark:text-white mt-3">
                                        {studentData.BatchYear || '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* PLACEMENT TAB */}
                        {activeTab === 'placement' && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Selection Card */}
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                        <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Placement Selection</p>
                                        {studentData.companySelectedIn && studentData.companySelectedIn.toLowerCase() !== 'not selected' ? (
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500">Selected In</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white">{studentData.companySelectedIn}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-slate-400 mt-4">Not Selected / Pending Placement Drives</p>
                                        )}
                                    </div>

                                    {/* Opportunity Date / ID */}
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Opportunity ID</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{studentData.placementId || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Drive Start Date</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{studentData.opportunityStartDate || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* PEP Section */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest mb-4">Professional Enhancement Programme (PEP)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">PEP Fee Details</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block ${
                                                studentData.pepFeeDetails && studentData.pepFeeDetails.toLowerCase().includes('paid')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                                            }`}>
                                                {studentData.pepFeeDetails || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">PEP Payment Date</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">{studentData.pepFeePaymentDate || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRIOR EDUCATION TAB */}
                        {activeTab === 'education' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                                {/* 10th Marks */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Class X (Matriculation)</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.xMarks ? studentData.xMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {studentData.xMarks && studentData.xMarks.includes('(') ? studentData.xMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                {/* 12th Marks */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Class XII (Intermediate)</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.xiiMarks ? studentData.xiiMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {studentData.xiiMarks && studentData.xiiMarks.includes('(') ? studentData.xiiMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                {/* Graduation */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Graduation Records</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.graduationMarks ? studentData.graduationMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {studentData.graduationMarks && studentData.graduationMarks.includes('(') ? studentData.graduationMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>

                                {/* Diploma */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5">
                                    <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Diploma Records</p>
                                    <p className="text-2xl font-black text-[#1c312e] dark:text-[#bef227] mt-3">
                                        {studentData.diplomaMarks ? studentData.diplomaMarks.split('(')[0].trim() : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-450 mt-1">
                                        Year: {studentData.diplomaMarks && studentData.diplomaMarks.includes('(') ? studentData.diplomaMarks.split('(')[1].replace(')', '').trim() : '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* CONTACT DETAILS TAB */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Email */}
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-805 flex items-center justify-center text-slate-500">
                                            <Mail className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                                            {studentData.email ? (
                                                <a href={`mailto:${studentData.email}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1">
                                                    {studentData.email}
                                                </a>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 mt-1">—</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-805 flex items-center justify-center text-slate-500">
                                            <Phone className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
                                            {studentData.contactNo ? (
                                                <a href={`tel:${studentData.contactNo}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline block mt-1">
                                                    {studentData.contactNo}
                                                </a>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 mt-1">—</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Basic Details Info */}
                                <div className="bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800/80 p-5 space-y-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Basic Details</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{studentData.basicDetails || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest">Scraped Sync Timestamp</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                                            {studentData.scrapedAt ? new Date(studentData.scrapedAt).toLocaleString() : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ranking;
