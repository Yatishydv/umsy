import React, { useState, useEffect } from 'react';
import { Building2, BedDouble, User, Hash, Home } from 'lucide-react';
import Sidebar from './Sidebar';
import { getHostelInfo } from '../services/api';

const HostelInfo = () => {
    const [hostelData, setHostelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const cookies = localStorage.getItem('umz_cookies');
            if (!cookies) {
                setError('No session found. Please login again.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const result = await getHostelInfo(cookies);
                setHostelData(result.data);
                setError('');
            } catch (err) {
                setError(err.message || 'Failed to fetch hostel information.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                        <p className="mt-3 text-sm text-gray-400">Loading hostel info…</p>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Error ─── */
    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Error</p>
                        <p className="text-sm text-gray-500">{error}</p>
                    </div>
                </main>
            </div>
        );
    }

    const fields = hostelData ? [
        { label: 'VID',     value: hostelData.vid,    icon: Hash       },
        { label: 'Name',    value: hostelData.name,   icon: User       },
        { label: 'Hostel',  value: hostelData.hostel, icon: Building2  },
        { label: 'Room No', value: hostelData.roomNo, icon: BedDouble  },
    ] : [];

    /* ─── Main ─── */
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8 space-y-6">

                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Hostel Info</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Your current residential assignment</p>
                    </div>

                    {hostelData ? (
                        <>
                            {/* Identity banner */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <Home className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                        {hostelData.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {hostelData.hostel} &bull; Room&nbsp;{hostelData.roomNo}
                                    </p>
                                </div>
                            </div>

                            {/* Detail grid */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
                                {fields.map(({ label, value, icon: Icon }) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between gap-4">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">
                                                {value || '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-16 text-center">
                            <Home className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-400">No hostel data found.</p>
                            <p className="text-xs text-gray-400 mt-1">Try resyncing your data in Settings.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HostelInfo;
