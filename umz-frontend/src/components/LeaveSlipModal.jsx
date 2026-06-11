import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, MapPin, User, RefreshCw, Moon, ArrowRight, ShieldCheck } from 'lucide-react';
import JsBarcode from 'jsbarcode';

const MiniRow = ({ icon: Icon, label, value, isBold }) => (
    <div className="flex items-center justify-between py-2 px-1 transition-colors">
        <div className="flex items-center gap-2.5">
            <Icon className={`h-3.5 w-3.5 text-gray-400`} />
            <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
        </div>
        <span className={`text-[12px] ${isBold ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
            {value}
        </span>
    </div>
);

const LeaveSlipSkeleton = () => (
    <div className="animate-pulse">
        {/* Compact Header Skeleton */}
        <div className="p-5 pb-3 border-b border-gray-100/60 dark:border-gray-900/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-md" />
                        <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-800 rounded-md" />
                    </div>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30" />
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30" />
                </div>
            </div>
            
            <div className="flex justify-center mt-1">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            </div>
        </div>

        {/* Ultra Compact Content Skeleton */}
        <div className="px-5 py-4 space-y-4">
            {/* Barcode Strip Skeleton */}
            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100/50 dark:border-gray-800/50 flex items-center justify-between gap-4">
                <div className="space-y-1.5 shrink-0">
                    <div className="h-2 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <div className="flex-1 h-14 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="space-y-1.5 shrink-0">
                    <div className="h-2 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
            </div>

            {/* Timeline Strip Skeleton */}
            <div className="flex items-center justify-between p-3.5 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/30 dark:border-indigo-500/10">
                <div className="space-y-1.5 flex flex-col items-center">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-3.5 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-200 dark:text-gray-800" />
                <div className="space-y-1.5 flex flex-col items-center">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-3.5 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
            </div>

            {/* Details Grid Skeleton */}
            <div className="space-y-3 px-1 py-1">
                <div className="flex justify-between items-center">
                    <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <div className="flex justify-between items-center">
                    <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
            </div>

            {/* Gate Control Skeleton */}
            <div className="space-y-2.5">
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="space-y-1.5">
                    <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                </div>
            </div>
        </div>
    </div>
);

const LeaveSlipModal = React.memo(({ isOpen, onClose, data, profileImage, onRefresh, loading }) => {
    useEffect(() => {
        if (isOpen && data) {
            // 📊 Generate Barcode using local library (bundled)
            const generateBarcode = () => {
                const canvas = document.getElementById('barcode-canvas');
                if (canvas && data.leaveCode) {
                    try {
                        JsBarcode(canvas, data.leaveCode, {
                            format: "CODE128",
                            lineColor: "#000",
                            width: 2,
                            height: 60,
                            displayValue: false,
                            margin: 0
                        });
                    } catch (e) { console.error('Barcode Error:', e); }
                }
            };
            
            const timer = setTimeout(generateBarcode, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, data]);

    if (!isOpen) return null;

    const splitDateTime = (str) => {
        if (!str) return { date: '', time: '' };
        const parts = str.split(/Time\s*-\s*/);
        return {
            date: (parts[0] || '').trim(),
            time: (parts[1] || '').trim()
        };
    };

    let dateOfReturn, dateOfLeaving, timeOfReturn, timeOfLeaving;
    if (data?.dateOfLeaving) {
        const { date, time } = splitDateTime(data.dateOfLeaving);
        dateOfLeaving = date;
        timeOfLeaving = time;
    }
    if (data?.dateOfReturn) {
        const { date, time } = splitDateTime(data.dateOfReturn);
        dateOfReturn = date;
        timeOfReturn = time;
    }

    // Use Base64 image if available (best for WebView), then profileImage, then parsed URL
    const finalProfileImg = data?.studentImageBase64 || profileImage || data?.studentImageUrl;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-all" onClick={onClose} />
            
            <div className="relative w-full sm:max-w-[400px] bg-white dark:bg-gray-950 rounded-t-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 flex flex-col transition-all">
                {loading && !data ? (
                    <>
                        {/* Close button during loading */}
                        <div className="absolute top-5 right-5 z-10">
                            <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 active:scale-90 transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <LeaveSlipSkeleton />
                    </>
                ) : (
                    <div className="transition-all duration-300 ease-in-out">
                        {/* Compact Header */}
                        <div className="p-5 pb-3 border-b border-gray-50 dark:border-gray-900/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden bg-gray-50">
                                            {finalProfileImg ? (
                                                <img src={finalProfileImg} alt="Student" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                                                    {data?.studentName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-emerald-500 border-2 border-white dark:border-gray-950 rounded-full flex items-center justify-center">
                                            <ShieldCheck className="h-2.5 w-2.5 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">{data?.studentName}</h3>
                                        <p className="text-gray-400 text-[12px] font-medium">Reg No: {data?.regNo}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => onRefresh(true)} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 active:scale-90 transition-all">
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-400 active:scale-90 transition-all">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-center mt-1">
                                <div className="inline-flex justify-center items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 dark:bg-blue-500/10 rounded-lg border border-blue-100/50 dark:border-blue-500/20">
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide ">
                                        {data?.leaveType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ultra Compact Content */}
                        <div className="px-5 py-4 space-y-4">
                            {/* Barcode Strip */}
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100/50 dark:border-gray-800/50 flex items-center justify-between gap-4">
                                <div className="text-center shrink-0">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Code</p>
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{data?.leaveCode}</p>
                                </div>
                                <div className="flex-1 flex justify-center overflow-hidden h-14 px-2 bg-white rounded-lg border border-gray-50">
                                    <canvas id="barcode-canvas" className="max-w-full h-full"></canvas>
                                </div>
                                <div className="text-center shrink-0">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ID</p>
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{data?.leaveId}</p>
                                </div>
                            </div>

                            {/* Timeline Strip */}
                            <div className="flex items-center justify-between p-3.5 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/30 dark:border-indigo-500/10">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Exit</p>
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{dateOfLeaving}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{timeOfLeaving}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-indigo-300" />
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Return</p>
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{dateOfReturn}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{timeOfReturn}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="space-y-0.5 px-1">
                                <MiniRow icon={MapPin} label="Hostel & Room" value={`${data?.hostel}, ${data?.roomNo}`} isBold />
                                <MiniRow icon={User} label="Emergency No" value={data?.contactNo} isBold />
                            </div>

                            {/* Access Panel */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gate Access Control</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {data?.gateStatus?.map((gate, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`px-2 py-0.5 rounded text-[9px] ${gate.type === 'Exit' ? 'text-rose-500' : 'text-emerald-500'} font-bold uppercase `}>
                                                    {gate.type}
                                                </div>
                                                <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300">{gate.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Authorized</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default LeaveSlipModal;
