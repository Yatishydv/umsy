import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Search, Filter, Users, GraduationCap, ChevronDown, 
    ArrowLeft, AlertCircle, RefreshCw, Star, Mail, Phone, Book
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

const DataPage = () => {
    const navigate = useNavigate();
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/all-data`);
                if (response.data.success) {
                    setAllData(response.data.data);
                } else {
                    setError('Failed to fetch data');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Extract unique courses and sections for dropdowns
    const courses = useMemo(() => {
        const unique = new Set(allData.map(item => item.Course).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [allData]);

    const sections = useMemo(() => {
        let filtered = allData;
        if (selectedCourse !== 'All') {
            filtered = filtered.filter(item => item.Course === selectedCourse);
        }
        const unique = new Set(filtered.map(item => item.Section).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [allData, selectedCourse]);

    // Apply filters and search
    const filteredData = useMemo(() => {
        let result = allData;

        if (selectedCourse !== 'All') {
            result = result.filter(item => item.Course === selectedCourse);
        }
        if (selectedSection !== 'All') {
            result = result.filter(item => item.Section === selectedSection);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => 
                (item.Name && item.Name.toLowerCase().includes(term)) ||
                (item.RegistrationNumber && String(item.RegistrationNumber).toLowerCase().includes(term)) ||
                (item.RollNumber && String(item.RollNumber).toLowerCase().includes(term))
            );
        }

        // Sort by RollNumber primarily, then Name
        return result.sort((a, b) => {
            const rollA = parseInt(a.RollNumber) || 999999;
            const rollB = parseInt(b.RollNumber) || 999999;
            if (rollA !== rollB) return rollA - rollB;
            
            const nameA = a.Name || '';
            const nameB = b.Name || '';
            return nameA.localeCompare(nameB);
        });
    }, [allData, selectedCourse, selectedSection, searchTerm]);

    const getAvatarUrl = (name) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=random&color=fff`;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <button 
                    onClick={() => selectedSection !== 'All' ? setSelectedSection('All') : navigate('/dashboard')}
                    className="flex items-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-4 font-medium"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {selectedSection !== 'All' ? 'Back to Sections' : 'Back to Dashboard'}
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 flex items-center tracking-tight">
                            <Users className="w-8 h-8 mr-3 text-blue-500 dark:text-blue-400" />
                            Student Data Hub
                        </h1>
                        <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Explore class and section-wise student directory</p>
                    </div>
                    
                    <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-3 border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <Users className="w-5 h-5 text-purple-500 dark:text-purple-400 mr-2" />
                        <span className="font-bold text-lg">{selectedSection === 'All' ? 0 : Math.min(filteredData.length, 500)}</span>
                        <span className="text-slate-500 dark:text-zinc-400 ml-2 text-sm font-medium">Students found</span>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 mb-8 border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, reg no, or roll no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Course Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <GraduationCap className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedSection('All'); // Reset section when course changes
                            }}
                            className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all font-medium"
                        >
                            {courses.map(course => (
                                <option key={course} value={course}>{course === 'All' ? 'All Courses' : course}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        </div>
                    </div>

                    {/* Section Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all font-medium"
                        >
                            {sections.map(section => (
                                <option key={section} value={section}>{section === 'All' ? 'All Sections' : section}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 dark:text-zinc-400 font-medium">Loading student database...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-2xl p-8 text-center shadow-sm">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 dark:text-red-300">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-6 px-5 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-red-700 dark:text-red-400 rounded-xl transition-colors font-semibold"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-200 mb-2">No students found</h3>
                        <p className="text-slate-500 dark:text-zinc-400 mb-6 font-medium">Try adjusting your filters or search term.</p>
                        <button 
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCourse('All');
                                setSelectedSection('All');
                            }}
                            className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors font-bold"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : selectedSection === 'All' ? (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-200 mb-2">Select a Section</h3>
                            <p className="text-slate-500 dark:text-zinc-400 font-medium">Choose a section below to view its students.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {sections.filter(s => s !== 'All').map((section, idx) => {
                                // Count students in this section based on current course filter
                                const studentCount = allData.filter(item => 
                                    item.Section === section && 
                                    (selectedCourse === 'All' || item.Course === selectedCourse)
                                ).length;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedSection(section)}
                                        className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all flex flex-col items-center justify-center group"
                                    >
                                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-zinc-100 mb-1">{section}</span>
                                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                            {studentCount} Students
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredData.slice(0, 500).map((student, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-sm hover:shadow-md group relative flex flex-col">
                                {/* Top colored banner */}
                                <div className="h-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 w-full absolute top-0 left-0 z-0 border-b border-slate-100 dark:border-zinc-800/50"></div>
                                
                                <div className="p-5 pt-6 relative z-10 flex-grow">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex items-center w-full">
                                            {/* Avatar - tries UMS photo proxy first, falls back to ui-avatars */}
                                            <div className="relative shrink-0">
                                                <img 
                                                    src={`${API_BASE_URL}/student-image?url=${encodeURIComponent(`https://ums.lpu.in/lpuums/StudentPhoto.aspx?id=${student.RegistrationNumber}`)}`}
                                                    onError={(e) => { e.target.src = getAvatarUrl(student.Name); }}
                                                    alt={student.Name}
                                                    className="w-14 h-14 rounded-2xl border-2 border-white dark:border-zinc-800 shadow-sm object-cover bg-slate-100 dark:bg-zinc-800"
                                                />
                                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-900 rounded-lg px-1.5 py-0.5 border border-slate-200 dark:border-zinc-700 shadow-sm">
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                                        {student.CGPA ? `${student.CGPA}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="ml-4 min-w-0 flex-1">
                                                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={student.Name}>
                                                    {student.Name || 'Unknown'}
                                                </h3>
                                                <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold font-mono mt-0.5">{student.RegistrationNumber}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-sm mt-2">
                                        <div className="flex flex-col bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <span className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Section</span>
                                            <span className="font-semibold text-slate-700 dark:text-zinc-200">{student.Section || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <span className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Roll No</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                                {student.RollNumber || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col col-span-2 bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <span className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider flex items-center mb-0.5"><Book className="w-3 h-3 mr-1"/> Course</span>
                                            <span className="font-medium text-slate-700 dark:text-zinc-300 text-xs truncate" title={student.Course}>{student.Course || 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    {(student.email || student.contactNo) && (
                                        <div className="mt-5 space-y-2">
                                            {student.email && (
                                                <div className="flex items-center text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                    <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mr-2 shrink-0">
                                                        <Mail className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <span className="truncate font-medium">{student.email}</span>
                                                </div>
                                            )}
                                            {student.contactNo && (
                                                <div className="flex items-center text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                    <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mr-2 shrink-0">
                                                        <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <span className="font-medium">{student.contactNo}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Footer */}
                                {student.Rank && (
                                    <div className="bg-slate-50 dark:bg-zinc-900/80 p-3 px-5 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-500 flex items-center uppercase tracking-wider">
                                            <Star className="w-3 h-3 text-amber-500 mr-1.5" fill="currentColor" />
                                            Overall Rank
                                        </span>
                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">#{student.Rank}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataPage;
