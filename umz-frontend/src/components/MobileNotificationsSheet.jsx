import React, { useState, useEffect } from 'react';
import { X, Bell, ChevronRight, Tag, Megaphone, DollarSign, Briefcase, BookOpen, Info, ExternalLink } from 'lucide-react';

/** Splits text on URLs and returns mixed array of strings + clickable <a> elements */
const renderWithLinks = (text) => {
    if (!text) return null;
    const URL_REGEX = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0;
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 underline underline-offset-2 break-all font-medium"
                >
                    {part}
                    <ExternalLink className="h-3 w-3 flex-shrink-0 inline" />
                </a>
            );
        }
        URL_REGEX.lastIndex = 0;
        return part;
    });
};

/* Derive a category + icon from message fields */
const categorize = (msg) => {
    // const text = `${msg.subject || ''} ${msg.sender || ''}`.toLowerCase();
    // if (text.includes('placement') || text.includes('career') || text.includes('job')) return { label: 'Placement', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', Icon: Briefcase };
    // if (text.includes('fee') || text.includes('financial') || text.includes('payment') || text.includes('fund')) return { label: 'Financial', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', Icon: DollarSign };
    // if (text.includes('exam') || text.includes('result') || text.includes('marks') || text.includes('grade')) return { label: 'Academic', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', Icon: BookOpen };
    // if (text.includes('hostel') || text.includes('room') || text.includes('shift')) return { label: 'Hostel', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', Icon: Tag };
    return { label: 'New Message', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', Icon: Megaphone };
};

const MobileNotificationsSheet = ({ isOpen, onClose, messages = [] }) => {
    const [expandedIdx, setExpandedIdx] = useState(null);
    const [mounted, setMounted] = useState(false);

    /* Handle mount/unmount for animation */
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const t = setTimeout(() => setMounted(false), 350);
            return () => clearTimeout(t);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!mounted) return null;

    return (
        /* Portal-like fixed overlay */
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                style={{
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className="relative z-10 bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden flex flex-col"
                style={{
                    maxHeight: '88vh',
                    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Messages</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Message from University</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl active:scale-95 transition-transform"
                    >
                        Close
                    </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 animate-in fade-in zoom-in duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Bell className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No messages yet</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const cat = categorize(msg);
                            const CatIcon = cat.Icon;
                            const isExpanded = expandedIdx === idx;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                    className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
                                    style={{
                                        animation: isOpen ? `slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards ${idx * 0.05}s` : 'none',
                                        opacity: 0,
                                        transform: 'translateY(20px)'
                                    }}
                                >
                                    {/* Top row: icon + category + chevron */}
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                                            <CatIcon className={`h-4 w-4 ${cat.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${cat.color}`}>{cat.label}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug pr-4 truncate">
                                                {msg.subject || 'No Subject'}
                                            </p>
                                        </div>
                                        <ChevronRight
                                            className={`h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                        />
                                    </div>

                                    {/* Content preview / expanded */}
                                    {msg.content && (
                                        <p className={`text-xs text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed pl-12 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {renderWithLinks(msg.content)}
                                        </p>
                                    )}

                                    {/* Meta info when expanded */}
                                    {isExpanded && (msg.sender || msg.date) && (
                                        <div className="flex flex-wrap gap-3 mt-2.5 pl-12 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {msg.sender && (
                                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                    From: {msg.sender}
                                                </span>
                                            )}
                                            {msg.date && (
                                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                    {msg.date}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    {/* Bottom safe area spacing */}
                    <div className="h-6" />
                </div>

                <style>{`
                    @keyframes slide-up-fade {
                        from {
                            opacity: 0;
                            transform: translateY(20px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default MobileNotificationsSheet;
