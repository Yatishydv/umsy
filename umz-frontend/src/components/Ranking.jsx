import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Trophy, Search, TrendingUp, Users, Award, Calendar, Globe, MapPin,
    Briefcase, Mail, Phone, Clock, FileText, CheckCircle, ShieldAlert,
    ArrowLeft, Check, AlertCircle, GraduationCap
} from 'lucide-react';
import Sidebar from './Sidebar';

const Ranking = () => {
    const navigate = useNavigate();
    const [regno, setRegno] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('performance');

    // Check authentication status
    useEffect(() => {
        const cookies = localStorage.getItem('umz_cookies');
        setIsAuthenticated(!!cookies);
    }, []);

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
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {isAuthenticated && <Sidebar />}

            <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 ${!isAuthenticated ? 'mx-auto max-w-7xl' : ''} pb-24 lg:pb-10`}>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Page Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="lg:hidden p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-sm active:scale-95 transition-all"
                            title="Go Back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white mb-0.5">Student Ranking</h1>
                            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Search for student academic performance and placement info</p>
                        </div>
                    </div>

                    {/* Search Form */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="regno"
                                    className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
                                >
                                    Registration Number
                                </label>
                                <div className="relative">
                                    <input
                                        id="regno"
                                        type="text"
                                        value={regno}
                                        onChange={(e) => setRegno(e.target.value)}
                                        placeholder="Enter registration number (e.g. 12317530)"
                                        className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all text-sm font-semibold"
                                        disabled={loading}
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-gray-950 hover:bg-gray-900 disabled:bg-gray-400 dark:bg-white dark:hover:bg-gray-100 dark:disabled:bg-gray-600 text-white dark:text-gray-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4" />
                                            <span>Search</span>
                                        </>
                                    )}
                                </button>

                                {studentData && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all text-sm cursor-pointer"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>

                        {/* Error Message */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-snug">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {studentData && (
                        <div className="space-y-6">
                            {/* Student Header Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                                {studentData.Name}
                                            </h2>
                                            {studentData.status && (
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    studentData.status.toLowerCase() === 'active' 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50' 
                                                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50'
                                                }`}>
                                                    {studentData.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-semibold">
                                            Registration Number:{' '}
                                            <span className="text-gray-800 dark:text-gray-200 font-bold">
                                                {studentData.RegistrationNumber}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/30 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700/50 max-w-md">
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-0.5">Program / Course</p>
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">
                                            {studentData.Course}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                                <div className="flex space-x-1 min-w-max">
                                    {tabs.map((tab) => {
                                        const TabIcon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                                    isActive
                                                        ? 'border-gray-950 dark:border-white text-gray-950 dark:text-white'
                                                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <TabIcon className={`h-4 w-4 ${isActive ? 'scale-110 text-blue-500 dark:text-blue-400' : ''} transition-transform`} />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="min-h-[250px]">
                                {/* TAB 1: Performance */}
                                {activeTab === 'performance' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                                        {/* Rank */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 relative overflow-hidden group">
                                            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.04] dark:opacity-[0.08] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                                <Trophy className="h-24 w-24" />
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                                    <Trophy className="h-4.5 w-4.5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Rank</h3>
                                                    <p className="text-[10px] text-gray-400 font-medium">Program Standing</p>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                    #{studentData.Rank}
                                                </span>
                                                {studentData.TotalStudents && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">
                                                        /{studentData.TotalStudents.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Percentile */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 relative overflow-hidden group">
                                            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.04] dark:opacity-[0.08] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                                <TrendingUp className="h-24 w-24" />
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                                    <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Percentile</h3>
                                                    <p className="text-[10px] text-gray-400 font-medium">Relative Bracket</p>
                                                </div>
                                            </div>
                                            <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                                                {studentData.percentile || `Top ${studentData.Percentage}%`}
                                            </p>
                                        </div>

                                        {/* CGPA */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 relative overflow-hidden group">
                                            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.04] dark:opacity-[0.08] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                                <GraduationCap className="h-24 w-24" />
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                                    <GraduationCap className="h-4.5 w-4.5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current CGPA</h3>
                                                    <p className="text-[10px] text-gray-400 font-medium">Out of 10.0</p>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-0.5 mt-2">
                                                <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                    {studentData.CGPA}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">/10</span>
                                            </div>
                                        </div>

                                        {/* Secondary Stats */}
                                        <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                Academic Status Details
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {/* Backlogs */}
                                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Reappear Backlogs</span>
                                                        {parseInt(studentData.reappearBacklog || '0') > 0 ? (
                                                            <ShieldAlert className="h-4 w-4 text-red-500" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                                                        {studentData.reappearBacklog || '0'}
                                                    </p>
                                                </div>

                                                {/* Batch Year */}
                                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Batch Year</span>
                                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                                                        {studentData.BatchYear || 'N/A'}
                                                    </p>
                                                </div>

                                                {/* Status */}
                                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Academic Status</span>
                                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                                                        {studentData.status || 'Active'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: Placement & PEP */}
                                {activeTab === 'placement' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                        {/* Placement status */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                                        <Briefcase className="h-4.5 w-4.5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Placement Status</h3>
                                                        <p className="text-[10px] text-gray-400 font-medium">Campus Recruitment</p>
                                                    </div>
                                                </div>

                                                <div className="my-5">
                                                    {studentData.companySelectedIn && studentData.companySelectedIn.toLowerCase() !== 'not selected' ? (
                                                        <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white relative overflow-hidden group shadow-sm">
                                                            <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-15 pointer-events-none group-hover:scale-115 transition-transform duration-500">
                                                                <Award className="h-20 w-20" />
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Selected 🎉</span>
                                                            <h4 className="text-lg font-black mt-2 leading-snug">
                                                                {studentData.companySelectedIn}
                                                            </h4>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4.5 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-700 text-center">
                                                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Company Selection</p>
                                                            <p className="text-base font-black text-gray-700 dark:text-gray-300">
                                                                {studentData.companySelectedIn || 'Not Selected'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                                                <div>
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Placement ID</p>
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{studentData.placementId || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Opportunity Start</p>
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{studentData.opportunityStartDate || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PEP Details */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                                        <Award className="h-4.5 w-4.5 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">PEP Program</h3>
                                                        <p className="text-[10px] text-gray-400 font-medium">Training & Preparation</p>
                                                    </div>
                                                </div>

                                                <div className="my-5">
                                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider mb-0.5">Fee & Payment Details</p>
                                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                {studentData.pepFeeDetails || 'N/A'}
                                                            </p>
                                                        </div>
                                                        {studentData.pepFeeDetails && studentData.pepFeeDetails.toLowerCase().includes('paid') ? (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                                                <Check className="h-2.5 w-2.5" /> Paid
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                                                <div>
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Payment Date</p>
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{studentData.pepFeePaymentDate || 'N/A'}</p>
                                                </div>
                                                <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Active Course</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: Education */}
                                {activeTab === 'education' && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 md:p-6 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                                <GraduationCap className="h-4.5 w-4.5 text-blue-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prior Academic Performance</h3>
                                                <p className="text-[10px] text-gray-400 font-medium">Educational History Summary</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* Xth */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-900/40 transition-colors">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Class X</span>
                                                <p className="text-xl font-black text-gray-900 dark:text-white mt-3 leading-none">
                                                    {studentData.xMarks ? studentData.xMarks.split('(')[0].trim() : 'NA'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">
                                                    Year: {studentData.xMarks && studentData.xMarks.includes('(') ? studentData.xMarks.split('(')[1].replace(')', '').trim() : 'N/A'}
                                                </p>
                                            </div>

                                            {/* XIIth */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-900/40 transition-colors">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Class XII</span>
                                                <p className="text-xl font-black text-gray-900 dark:text-white mt-3 leading-none">
                                                    {studentData.xiiMarks ? studentData.xiiMarks.split('(')[0].trim() : 'NA'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">
                                                    Year: {studentData.xiiMarks && studentData.xiiMarks.includes('(') ? studentData.xiiMarks.split('(')[1].replace(')', '').trim() : 'N/A'}
                                                </p>
                                            </div>

                                            {/* Graduation */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-900/40 transition-colors">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Graduation</span>
                                                <p className="text-xl font-black text-gray-900 dark:text-white mt-3 leading-none">
                                                    {studentData.graduationMarks ? studentData.graduationMarks.split('(')[0].trim() : 'NA'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">
                                                    Year: {studentData.graduationMarks && studentData.graduationMarks.includes('(') ? studentData.graduationMarks.split('(')[1].replace(')', '').trim() : 'N/A'}
                                                </p>
                                            </div>

                                            {/* Diploma */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-900/40 transition-colors">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Diploma</span>
                                                <p className="text-xl font-black text-gray-900 dark:text-white mt-3 leading-none">
                                                    {studentData.diplomaMarks ? studentData.diplomaMarks.split('(')[0].trim() : 'NA'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">
                                                    Year: {studentData.diplomaMarks && studentData.diplomaMarks.includes('(') ? studentData.diplomaMarks.split('(')[1].replace(')', '').trim() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: Contact */}
                                {activeTab === 'contact' && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 md:p-6 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                                <Phone className="h-4.5 w-4.5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Communication & Verification</h3>
                                                <p className="text-[10px] text-gray-400 font-medium">Contact endpoints and scrap history</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                {/* Email */}
                                                <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50 rounded-xl">
                                                    <div className="w-8.5 h-8.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                        <Mail className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Email Address</p>
                                                        {studentData.email ? (
                                                            <a href={`mailto:${studentData.email}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block mt-0.5">
                                                                {studentData.email}
                                                            </a>
                                                        ) : (
                                                            <p className="text-xs font-bold text-gray-500 mt-0.5">N/A</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Phone */}
                                                <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50 rounded-xl">
                                                    <div className="w-8.5 h-8.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                        <Phone className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Contact Number</p>
                                                        {studentData.contactNo ? (
                                                            <a href={`tel:${studentData.contactNo}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline block mt-0.5">
                                                                {studentData.contactNo}
                                                            </a>
                                                        ) : (
                                                            <p className="text-xs font-bold text-gray-500 mt-0.5">N/A</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Basic details policy */}
                                                <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50 rounded-xl">
                                                    <div className="w-8.5 h-8.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Policy Acceptance</p>
                                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                                            {studentData.basicDetails || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Scraped Time */}
                                                <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50 rounded-xl">
                                                    <div className="w-8.5 h-8.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider">Information Last Updated</p>
                                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                                            {studentData.scrapedAt ? new Date(studentData.scrapedAt).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!studentData && !loading && !error && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Trophy className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                Search Student Ranking
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug max-w-sm mx-auto">
                                Enter a registration number above to view comprehensive ranking, placement, and educational history.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Ranking;
