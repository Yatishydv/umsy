import React, { useState, useEffect } from 'react';
import { 
    Briefcase, 
    Calendar, 
    CheckCircle, 
    AlertCircle, 
    Trophy, 
    HelpCircle,
    UserCheck,
    TrendingUp,
    ShieldAlert,
    RefreshCw,
    MessageSquare,
    DollarSign,
    Zap,
    ExternalLink,
    User,
    FileText,
    Upload,
    ClipboardList,
    Award,
    Users,
    Heart,
    Settings,
    BarChart3,
    GraduationCap,
    BookOpen,
    Search,
    MessageCircle
} from 'lucide-react';
import { getPlacements } from '../services/api';

const portalPages = [
    { label: 'Resume Template', icon: FileText, url: 'frmPlacementTemplateResume.aspx', desc: 'Build & download your resume' },
    { label: 'Upload CV/Docs', icon: Upload, url: 'frmPlacementUploadCV.aspx', desc: 'Upload your CV and certificates' },
    { label: 'Skill Set & Preferences', icon: Settings, url: 'frmPlacementStudentSkillSet.aspx', desc: 'Update skills & job preferences' },
    { label: 'Job Offer Acceptance', icon: Award, url: 'frmPlacementJobAcceptance.aspx', desc: 'Accept or view job offers' },
    { label: 'Duty Leave Request', icon: BookOpen, url: 'frmPlacementDLRequest.aspx', desc: 'Request new duty leave' },
    { label: 'Details Updation', icon: Heart, url: 'frmUpdateContactDetails.aspx', desc: 'Update your contact details' },
    { label: 'Upload Independent Offer', icon: GraduationCap, url: 'frmPlacementUploadIndependentOffer.aspx', desc: 'Upload offers received independently' },
    { label: 'Student Testimonials', icon: MessageSquare, url: 'frmPlacementStudentConsent.aspx', desc: 'Submit placement testimonials' },
    { label: 'Coordinator Consent', icon: CheckCircle, url: 'frmPlacementDriveConsent.aspx', desc: 'Placement coordinator consent forms' },
    { label: 'Pay Balance Fee', icon: DollarSign, url: 'frmPlacementBalPayment.aspx', desc: 'Pay pending PEP balance fee' },
    { label: 'Reinstatement Fee Waiver', icon: ShieldAlert, url: 'frmStudentReinstatementFee.aspx', desc: 'Request reinstatement fee waiver' },
    { label: 'Drive Attendance (QR)', icon: Zap, url: 'frmPlacementDriveAttendanceByQR.aspx', desc: 'Mark drive attendance via QR' },
];

const Placements = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('profile'); // 'profile', 'active', 'scheduled', 'recent', 'fines', 'messages', 'portal', etc.
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async (forceRefetch = false) => {
        setLoading(true);
        setError(null);
        try {
            const auth = localStorage.getItem('umsy_cookies') || { regno: localStorage.getItem('umsy_regno') };
            const cachedData = localStorage.getItem('umsy_placements_data');
            
            if (cachedData && !forceRefetch) {
                setData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            const res = await getPlacements(auth);
            if (res.success && res.data) {
                setData(res.data);
                localStorage.setItem('umsy_placements_data', JSON.stringify(res.data));
            } else {
                throw new Error(res.error || 'Failed to fetch placements');
            }
        } catch (err) {
            console.error('Placements fetch error:', err);
            setError(err.message || 'Failed to load placements data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-slate-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#bef227] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 animate-pulse uppercase tracking-wider">
                    Fetching Placement Drives & Records...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900/30">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Error Loading Placements</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mb-6">{error}</p>
                <button
                    onClick={() => fetchData(true)}
                    className="flex items-center gap-2 bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black py-3 px-6 rounded-2xl transition-all active:scale-95 shadow-md shadow-[#bef227]/20 cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Sync
                </button>
            </div>
        );
    }

    const { 
        stats = {}, activeDrives = [], scheduledRounds = [], fines = [], 
        messages = [], recentDrives = [], driveRegistrations = [], 
        profile = null, dutyLeave = [], familyDetails = null, myRank = null,
        placedStudents = []
    } = data || {};

    const filteredActiveDrives = activeDrives.filter(d => 
        d.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.jobProfile?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredScheduledRounds = scheduledRounds.filter(r =>
        r.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.roundName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRecentDrives = recentDrives.filter(d =>
        d.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.salaryPackage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDriveRegs = driveRegistrations.filter(d =>
        d.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driveCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.streams?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredMessages = messages.filter(m => 
        m.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.date?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPlacedStudents = placedStudents.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vid?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDutyLeave = dutyLeave.filter(d => 
        d.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.eventType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatStatKey = (key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Briefcase className="w-7 h-7 text-[#bef227] fill-[#bef227]/10" />
                        Placement Drives
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm font-bold mt-1">
                        Track upcoming company schedules, registration status, eligible drives and statistics.
                    </p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    className="cursor-pointer self-start sm:self-center flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold py-2.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resync
                </button>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        Total Drives Held
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.total_drives_held || 0}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        Drives Eligible
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.total_drives_eligible_for || 0}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Registered
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.total_drives_registered_in || 0}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Participated
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.participated || 0}
                        </span>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-[#bef227]/10 dark:bg-[#bef227]/5 p-5 rounded-3xl border border-[#bef227]/30 dark:border-[#bef227]/25 flex flex-col justify-between shadow-sm">
                    <div className="text-[10px] font-black text-[#1c312e] dark:text-[#bef227] uppercase tracking-widest flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Selected Offers
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats.selected || 0}
                        </span>
                        {stats.selected > 0 && (
                            <span className="text-[10px] font-black uppercase text-[#1c312e] bg-[#bef227] px-2.5 py-1 rounded-full">
                                Placed
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200/50 dark:border-zinc-800/80 pb-4">
                <div className="flex flex-wrap items-center gap-2 py-1 bg-slate-50 dark:bg-zinc-800/30 p-2 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
                    {[
                        ...(profile ? [{ id: 'profile', label: 'My Profile', count: 0 }] : []),
                        { id: 'placed', label: 'Placed Students', count: placedStudents.length },
                        { id: 'recent', label: 'Recently Visited', count: recentDrives.length },
                        { id: 'messages', label: 'Messages', count: messages.length },
                        { id: 'active', label: 'Eligible/Active', count: activeDrives.length },
                        { id: 'registration', label: 'Drive Registration', count: driveRegistrations.length },
                        { id: 'scheduled', label: 'Scheduled Rounds', count: scheduledRounds.length },
                        { id: 'fines', label: 'Fines', count: fines.length },
                        ...(myRank ? [{ id: 'rank', label: 'My Rank', count: 0 }] : []),
                        { id: 'dutyleave', label: 'Duty Leave', count: dutyLeave.length },
                        ...(familyDetails ? [{ id: 'family', label: 'Family Details', count: 0 }] : []),
                        { id: 'portal', label: 'All Services', count: portalPages.length }
                    ].map(sec => (
                        <button
                            key={sec.id}
                            onClick={() => {
                                setActiveSection(sec.id);
                                setSearchQuery('');
                            }}
                            className={`cursor-pointer whitespace-nowrap px-4 py-2 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center ${
                                activeSection === sec.id
                                    ? 'bg-[#bef227] text-[#1c312e] shadow-sm'
                                    : 'bg-white dark:bg-zinc-900 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white border border-slate-200/50 dark:border-zinc-800 shadow-sm'
                            }`}
                        >
                            {sec.label}
                            {sec.count > 0 && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                    activeSection === sec.id ? 'bg-[#1c312e] text-[#bef227]' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                                }`}>
                                    {sec.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar - Rendered in its own row if applicable */}
            {activeSection !== 'fines' && activeSection !== 'portal' && activeSection !== 'profile' && activeSection !== 'rank' && activeSection !== 'family' && (
                <div className="flex justify-end">
                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            placeholder={`Search ${activeSection} drives...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl py-2 px-4 text-xs font-semibold focus:outline-none focus:border-[#bef227] dark:focus:border-[#bef227] text-slate-800 dark:text-slate-100 shadow-sm transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Tab Sections Render */}
            <div className="min-h-[25vh]">
                {/* Active drives tab */}
                {activeSection === 'active' && (
                    filteredActiveDrives.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredActiveDrives.map((drv, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-[#1c312e] dark:text-[#bef227] bg-[#bef227]/10 px-2.5 py-1 rounded-full tracking-wider border border-[#bef227]/10">
                                                {drv.driveType || 'Drive'}
                                            </span>
                                            {drv.registerBy && (
                                                <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 dark:bg-rose-500/5 px-2 py-0.5 rounded-lg border border-rose-500/10">
                                                    Apply by: {drv.registerBy}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-4 group-hover:text-[#bef227] transition-colors">
                                            {drv.company}
                                        </h3>
                                        
                                        <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400 dark:text-zinc-500">Job Profile</span>
                                                <span className="font-extrabold text-slate-700 dark:text-zinc-300">{drv.jobProfile || 'NA'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400 dark:text-zinc-500">Conducted On</span>
                                                <span className="font-extrabold text-slate-700 dark:text-zinc-300">{drv.driveDate || 'NA'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {drv.actionLink && (
                                        <div className="mt-5 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                                            <a 
                                                href={`https://ums.lpu.in/Placements/${drv.actionLink}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black text-[11px] uppercase tracking-wider py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                Register In UMS
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <Briefcase className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Active Drives</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                {searchQuery ? 'No drives matching your search criteria.' : 'You have no pending eligible drives for registration at the moment.'}
                            </p>
                        </div>
                    )
                )}

                {/* Drive Registration tab */}
                {activeSection === 'registration' && (
                    filteredDriveRegs.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20">
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Company</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Drive Code</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Salary</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Register By</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Streams</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Eligible</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                    {filteredDriveRegs.map((drv, i) => (
                                        <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40 transition-colors">
                                            <td className="p-4 text-xs font-black text-slate-900 dark:text-white max-w-[200px]">{drv.company}</td>
                                            <td className="p-4 text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-mono">{drv.driveCode}</td>
                                            <td className="p-4 text-xs font-bold text-slate-700 dark:text-zinc-300 max-w-[120px] truncate" title={drv.salary}>{drv.salary}</td>
                                            <td className="p-4 text-xs font-bold text-slate-650 dark:text-zinc-400 whitespace-nowrap">{drv.registerBy}</td>
                                            <td className="p-4 text-[10px] font-bold text-slate-500 dark:text-zinc-400 max-w-[160px] truncate" title={drv.streams}>{drv.streams}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                                                    drv.regStatus?.includes('Open')
                                                        ? 'bg-[#bef227]/20 text-[#1c312e] dark:text-[#bef227]'
                                                        : 'bg-rose-500/10 text-rose-500'
                                                }`}>
                                                    {drv.regStatus || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                                                    drv.eligible?.toLowerCase() === 'yes'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
                                                }`}>
                                                    {drv.eligible || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {drv.isRegistered ? (
                                                    <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                                                        ✓ Registered
                                                    </span>
                                                ) : drv.detailsLink ? (
                                                    <a
                                                        href={drv.detailsLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-black uppercase text-[#1c312e] dark:text-[#bef227] bg-[#bef227]/20 hover:bg-[#bef227]/30 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        Details <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-600">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Drive Registrations</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                {searchQuery ? 'No drives matching your search.' : 'Drive registration data could not be loaded. The portal session may need to be re-established.'}
                            </p>
                        </div>
                    )
                )}

                {/* Scheduled rounds tab */}
                {activeSection === 'scheduled' && (
                    filteredScheduledRounds.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20">
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Batch</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Drive Code</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Company</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Round Name</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Process Date</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Details</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                    {filteredScheduledRounds.map((rd, i) => (
                                        <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40 transition-colors">
                                            <td className="p-4 text-xs font-bold text-slate-650 dark:text-zinc-400">{rd.batchYear}</td>
                                            <td className="p-4 text-xs font-bold text-slate-650 dark:text-zinc-400">{rd.driveCode}</td>
                                            <td className="p-4 text-xs font-black text-slate-900 dark:text-white">{rd.companyName}</td>
                                            <td className="p-4 text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                                                <span className="bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-slate-200/30 dark:border-zinc-800/30">
                                                    {rd.roundName}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-slate-650 dark:text-zinc-400">{rd.processDate}</td>
                                            <td className="p-4 text-[10px] font-bold text-slate-500 dark:text-zinc-400">{rd.details}</td>
                                            <td className="p-4 text-[10px] font-bold text-amber-600 dark:text-amber-400">{rd.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <Calendar className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Scheduled Rounds</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                {searchQuery ? 'No rounds matching search query.' : 'There are no upcoming scheduled drives or evaluation rounds in UMS.'}
                            </p>
                        </div>
                    )
                )}

                {/* Recent drives tab */}
                {activeSection === 'recent' && (
                    filteredRecentDrives.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredRecentDrives.map((drv, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-500">
                                            Code: {drv.driveCode}
                                        </span>
                                        <span className="text-[10px] font-black uppercase text-[#1c312e] bg-[#bef227]/90 px-2 py-0.5 rounded-lg">
                                            Eligible
                                        </span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-3">
                                        {drv.company}
                                    </h3>
                                    
                                    <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 dark:text-zinc-500">Package</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{drv.salaryPackage}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 dark:text-zinc-500">Drive Date</span>
                                            <span className="font-bold text-slate-700 dark:text-zinc-300">{drv.driveDate}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 dark:text-zinc-500">Streams</span>
                                            <span className="font-bold text-slate-700 dark:text-zinc-300 max-w-[150px] truncate" title={drv.stream}>{drv.stream}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <Briefcase className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Recent Drive Records</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                {searchQuery ? 'No drives matching search query.' : 'No recent placement drive stats or CTC info details available.'}
                            </p>
                        </div>
                    )
                )}

                {/* Fines imposed tab */}
                {activeSection === 'fines' && (
                    fines.length > 0 ? (
                        <div className="space-y-4">
                            <div className="bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/20 rounded-3xl p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500 text-white rounded-2xl">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-rose-500 dark:text-rose-400 uppercase tracking-wider">Placement Fines Alert</h4>
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 mt-0.5">
                                        Fines are imposed for missing compulsory drives or failing to attend scheduled processes.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fines.map((fn, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/10">
                                                    Fine Imposed
                                                </span>
                                                <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-slate-500 dark:text-zinc-400">
                                                    Instance: {fn.fineInstance}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-black text-slate-900 dark:text-white mt-4">
                                                {fn.companyName}
                                            </h3>
                                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-0.5">
                                                Round: {fn.driveRound}
                                            </p>

                                            <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-400 dark:text-zinc-500">Fine Amount</span>
                                                    <span className="font-black text-rose-500 text-sm">₹{fn.fineAmount}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-400 dark:text-zinc-500">Paid Status</span>
                                                    <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md ${
                                                        fn.finePaid === fn.fineAmount 
                                                            ? 'bg-[#bef227]/25 text-[#1a2d04] dark:text-[#bef227]' 
                                                            : 'bg-rose-500/10 text-rose-500'
                                                    }`}>
                                                        {fn.finePaid === fn.fineAmount ? 'Fully Paid' : `Paid: ₹${fn.finePaid}`}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-400 dark:text-zinc-500">Receipt No</span>
                                                    <span className="font-bold text-slate-650 dark:text-zinc-300">{fn.receiptNo}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-400 dark:text-zinc-500">Drive Date</span>
                                                    <span className="font-bold text-slate-650 dark:text-zinc-300">{fn.driveDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <CheckCircle className="w-12 h-12 text-[#bef227] fill-[#bef227]/10 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Fines Imposed</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                Fantastic! You have a clean attendance record and no fines have been registered against your profile.
                            </p>
                        </div>
                    )
                )}

                {/* My Profile tab */}
                {activeSection === 'profile' && profile && (
                    <div className="space-y-4">
                        {/* Profile Header Card */}
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Photo */}
                            {profile.photo && (
                                <div className="shrink-0">
                                    <img 
                                        src={profile.photo} 
                                        alt="Student Photo" 
                                        className="w-24 h-28 object-cover rounded-2xl border-2 border-[#bef227]/30 shadow-md"
                                    />
                                </div>
                            )}
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{profile.personal?.['Name'] || profile.personal?.['name'] || 'Student'}</h2>
                                <p className="text-sm font-bold text-[#bef227] mt-1">{profile.personal?.['Registration Number'] || profile.academic?.['Registration Number'] || ''}</p>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mt-1">{profile.academic?.['Pursuing Degree'] || ''}</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                                const renderValue = (val) => {
                                    const strVal = String(val);
                                    if (strVal.startsWith('http://') || strVal.startsWith('https://')) {
                                        return (
                                            <a href={strVal} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
                                                {strVal}
                                            </a>
                                        );
                                    }
                                    return strVal;
                                };

                                return (
                                    <>
                                        {/* Personal Details */}
                                        {profile.personal && Object.keys(profile.personal).length > 0 && (
                                            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-[#bef227]" />
                                                    Personal Details
                                                </h3>
                                                <div className="space-y-3">
                                                    {Object.entries(profile.personal).map(([key, value], i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                                            <span className="font-bold text-slate-400 dark:text-zinc-500">{key}</span>
                                                            <span className="font-extrabold text-slate-700 dark:text-zinc-300 max-w-[200px] truncate text-right" title={String(value)}>
                                                                {renderValue(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Academic Details */}
                                        {profile.academic && Object.keys(profile.academic).length > 0 && (
                                            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <GraduationCap className="w-4 h-4 text-[#bef227]" />
                                                    Academic Details
                                                </h3>
                                                <div className="space-y-3">
                                                    {Object.entries(profile.academic).map(([key, value], i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                                            <span className="font-bold text-slate-400 dark:text-zinc-500">{key}</span>
                                                            <span className="font-extrabold text-slate-700 dark:text-zinc-300 max-w-[200px] truncate text-right" title={String(value)}>
                                                                {renderValue(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Contact Details */}
                                        {profile.contact && Object.keys(profile.contact).length > 0 && (
                                            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Heart className="w-4 h-4 text-[#bef227]" />
                                                    Contact Information
                                                </h3>
                                                <div className="space-y-3">
                                                    {Object.entries(profile.contact).map(([key, value], i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                                            <span className="font-bold text-slate-400 dark:text-zinc-500">{key}</span>
                                                            <span className="font-extrabold text-slate-700 dark:text-zinc-300 max-w-[200px] truncate text-right" title={String(value)}>
                                                                {renderValue(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Other Details */}
                                        {profile.other && Object.keys(profile.other).length > 0 && (
                                            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Settings className="w-4 h-4 text-[#bef227]" />
                                                    Other Details
                                                </h3>
                                                <div className="space-y-3">
                                                    {Object.entries(profile.other).map(([key, value], i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                                            <span className="font-bold text-slate-400 dark:text-zinc-500">{key}</span>
                                                            <span className="font-extrabold text-slate-700 dark:text-zinc-300 max-w-[200px] truncate text-right" title={String(value)}>
                                                                {renderValue(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* My Rank tab */}
                {activeSection === 'rank' && myRank && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-zinc-800 pb-4">
                            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-2xl">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Placement Rank</h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mt-0.5">Your current standings and PEP score</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Overall Rank</span>
                                <span className="text-3xl font-black text-[#1c312e] dark:text-[#bef227]">{myRank.overallRank || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Stream Rank</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{myRank.streamRank || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">PEP Score</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{myRank.pepScore || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center flex flex-col justify-center items-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Status</span>
                                <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg ${
                                    myRank.status?.toLowerCase().includes('placed') 
                                        ? 'bg-[#bef227] text-[#1c312e]' 
                                        : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                                }`}>
                                    {myRank.status || 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Duty Leave tab */}
                {activeSection === 'dutyleave' && (
                    filteredDutyLeave.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20">
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Event Name</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Type</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">From</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">To</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Requested</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                    {filteredDutyLeave.map((dl, i) => (
                                        <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/40 transition-colors">
                                            <td className="p-4 text-xs font-black text-slate-900 dark:text-white">{dl.eventName}</td>
                                            <td className="p-4 text-[10px] font-bold text-slate-500 dark:text-zinc-400">{dl.eventType}</td>
                                            <td className="p-4 text-xs font-bold text-slate-700 dark:text-zinc-300">{dl.fromDate}</td>
                                            <td className="p-4 text-xs font-bold text-slate-700 dark:text-zinc-300">{dl.toDate}</td>
                                            <td className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400">{dl.requestedOn}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                                                    dl.status?.toLowerCase().includes('approve')
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : dl.status?.toLowerCase().includes('reject')
                                                            ? 'bg-rose-500/10 text-rose-500'
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                                }`}>
                                                    {dl.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[10px] font-bold text-slate-500 dark:text-zinc-400 max-w-[150px] truncate" title={dl.remarks}>{dl.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <Calendar className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Duty Leaves</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                                {searchQuery ? 'No duty leave records matching your search.' : 'You have no placement duty leave records.'}
                            </p>
                        </div>
                    )
                )}

                {/* Family Details tab */}
                {activeSection === 'family' && familyDetails && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-zinc-800 pb-4">
                            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Family Details</h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mt-0.5">Parent information registered for placements</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-zinc-700 pb-2">Father's Details</h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Name</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{familyDetails.father?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Occupation</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{familyDetails.father?.occupation || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Mobile</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{familyDetails.father?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-zinc-700 pb-2">Mother's Details</h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Name</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{familyDetails.mother?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Occupation</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{familyDetails.mother?.occupation || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Mobile</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{familyDetails.mother?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Placed Students */}
                {activeSection === 'placed' && (
                    filteredPlacedStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPlacedStudents.map((stu, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                                    {stu.image ? (
                                        <img src={stu.image} alt={stu.name} className="w-14 h-14 rounded-2xl object-cover bg-slate-100 dark:bg-zinc-800" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <User className="w-6 h-6 text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{stu.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">{stu.vid} • {stu.section}</p>
                                        <div className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                            {stu.company}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-900/50 rounded-[2rem] flex items-center justify-center mb-4 border border-slate-100 dark:border-zinc-800/80">
                                <Search className="w-6 h-6 text-slate-300 dark:text-zinc-600" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No placed students found</h3>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-2 max-w-[250px]">
                                Try adjusting your search query or check back later.
                            </p>
                        </div>
                    )
                )}

                {/* Messages */}
                {activeSection === 'messages' && (
                    filteredMessages.length > 0 ? (
                        <div className="space-y-3">
                            {filteredMessages.map((msg, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                                            Notification
                                        </span>
                                        {msg.date && (
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                                                {msg.date}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 leading-relaxed">
                                        {msg.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-900/50 rounded-[2rem] flex items-center justify-center mb-4 border border-slate-100 dark:border-zinc-800/80">
                                <MessageCircle className="w-6 h-6 text-slate-300 dark:text-zinc-600" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Messages</h3>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-2 max-w-[250px]">
                                You do not have any new placement messages.
                            </p>
                        </div>
                    )
                )}

                {/* All Services Portal */}
                {activeSection === 'portal' && (
                    <div className="space-y-4">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/15 rounded-3xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500 text-white rounded-2xl">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Placement Portal Services</h4>
                                <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 mt-0.5">
                                    Access all placement services directly. These link to UMS Placement Portal.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {portalPages.map((page, idx) => {
                                const Icon = page.icon;
                                return (
                                    <a
                                        key={idx}
                                        href={`https://ums.lpu.in/Placements/${page.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#bef227]/40 dark:hover:border-[#bef227]/25 transition-all duration-300 flex items-start gap-3"
                                    >
                                        <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl group-hover:bg-[#bef227]/20 dark:group-hover:bg-[#bef227]/10 transition-colors shrink-0">
                                            <Icon className="w-4 h-4 text-slate-500 dark:text-zinc-400 group-hover:text-[#1c312e] dark:group-hover:text-[#bef227] transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#1c312e] dark:group-hover:text-[#bef227] transition-colors truncate">
                                                    {page.label}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
                                                {page.desc}
                                            </p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Placements;
