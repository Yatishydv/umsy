import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  Search, 
  Trophy, 
  User, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone, 
  AlertCircle,
  ExternalLink,
  MapPin,
  Clock
} from 'lucide-react';
import { getPlacementData } from '../services/api';

const Placements = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, recent, profile

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cookies = localStorage.getItem('umz_cookies');
      const response = await getPlacementData(cookies);
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch placement data');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 animate-pulse font-medium">Fetching placement portal data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-red-700 mb-6 max-w-md">{error}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredDrives = data?.upcomingDrives?.filter(drive => 
    drive.company.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Placements</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            Your professional journey starts here
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Placement Status</p>
            <p className="text-sm font-bold text-indigo-600">{data?.profile?.status || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Announcements Carousel / HelloBar */}
      {data?.announcements?.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Briefcase className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm mb-0.5">Important Update</p>
              <div className="text-sm text-indigo-50 whitespace-nowrap overflow-hidden animate-marquee">
                {data.announcements.join(' • ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile & Record Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{data?.profile?.name}</h2>
              <p className="text-sm text-slate-500">{data?.profile?.regNo}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <GraduationCap className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Program & CGPA</p>
                <p className="text-sm font-semibold">{data?.profile?.program} • {data?.profile?.cgpa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Email Address</p>
                <p className="text-sm font-semibold truncate max-w-[200px]">{data?.profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Contact Number</p>
                <p className="text-sm font-semibold">{data?.profile?.contact}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Backlogs</p>
                <p className={`text-lg font-black ${parseInt(data?.profile?.backlogs) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {data?.profile?.backlogs}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Placement ID</p>
                <p className="text-lg font-black text-indigo-600">{data?.profile?.placementId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Object.entries(data?.placementRecord || {}).map(([label, value], idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-indigo-200 transition-all group">
              <p className="text-xs text-slate-500 font-medium leading-tight mb-2 h-8 overflow-hidden line-clamp-2">
                {label}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2 md:p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 md:px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Upcoming Drives
          </button>
          <button 
            onClick={() => setActiveTab('recent')}
            className={`px-4 md:px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'recent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Recent Results
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-11 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {activeTab === 'upcoming' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDrives.length > 0 ? (
              filteredDrives.map((drive, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      drive.status.toLowerCase().includes('open') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {drive.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{drive.company}</h3>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Drive Date: {drive.driveDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Register By: {drive.registerBy}</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hall Ticket</span>
                      <span className="text-sm font-bold text-slate-700">{drive.hallTicket}</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm hover:translate-x-1 transition-transform">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No upcoming drives found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search term</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data?.recentResults?.map((result, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-indigo-100 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{result.title}</h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full whitespace-nowrap">
                    {result.date}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {result.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
};

export default Placements;
