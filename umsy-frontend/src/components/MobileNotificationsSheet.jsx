import React, { useState, useEffect } from 'react';
import { X, Bell, ChevronRight, Megaphone, Briefcase, BookOpen, Tag, ExternalLink, Mail, User, Calendar } from 'lucide-react';

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
                    className="inline-flex items-center gap-0.5 text-[#bef227] hover:text-[#d4ff5c] underline underline-offset-2 break-all font-bold"
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
    const text = `${msg.subject || ''} ${msg.sender || ''}`.toLowerCase();
    if (text.includes('placement') || text.includes('career') || text.includes('job')) 
        return { label: 'Placement', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20', Icon: Briefcase };
    if (text.includes('exam') || text.includes('result') || text.includes('marks') || text.includes('grade')) 
        return { label: 'Academic', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-100 dark:border-violet-500/20', Icon: BookOpen };
    if (text.includes('hostel') || text.includes('room') || text.includes('shift')) 
        return { label: 'Hostel', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', Icon: Tag };
    return { label: 'Notification', color: 'text-emerald-600 dark:text-[#bef227]', bg: 'bg-emerald-50 dark:bg-[#bef227]/10', border: 'border-emerald-100 dark:border-[#bef227]/20', Icon: Megaphone };
};

const MobileNotificationsSheet = ({ isOpen, onClose, messages = [] }) => {
    const [expandedIdx, setExpandedIdx] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const t = setTimeout(() => setMounted(false), 350);
            return () => clearTimeout(t);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!mounted) return null;

    return (
        /* Full-screen overlay with centered modal */
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative z-10 bg-white dark:bg-[#121214] rounded-[28px] overflow-hidden flex flex-col w-full max-w-lg border border-slate-200/60 dark:border-zinc-800 shadow-2xl"
                style={{
                    maxHeight: '80vh',
                    transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
                    opacity: isOpen ? 1 : 0,
                    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-800/80 flex-shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#bef227]/10 border border-[#bef227]/20 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-emerald-600 dark:text-[#bef227]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">My Messages</h2>
                            <p className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
                                {messages.length} {messages.length === 1 ? 'message' : 'messages'} from university
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-zinc-800 hover:text-slate-950 dark:hover:text-white border border-slate-200/30 dark:border-zinc-700/50 active:scale-90 transition-all flex items-center justify-center"
                    >
                        <X className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 no-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-center">
                                <Bell className="h-7 w-7 text-slate-400 dark:text-zinc-650" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">No messages yet</p>
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
                                    className={`bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 cursor-pointer overflow-hidden transition-all duration-200 border ${isExpanded ? 'border-[#bef227]/30 dark:border-[#bef227]/20 shadow-sm' : 'border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700'}`}
                                    style={{
                                        animation: isOpen ? `msg-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards ${idx * 0.06}s` : 'none',
                                        opacity: 0,
                                        transform: 'translateY(12px)'
                                    }}
                                >
                                    {/* Top row */}
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg} border ${cat.border}`}>
                                            <CatIcon className={`h-4 w-4 ${cat.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`text-[7px] font-black uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                                                {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#bef227] flex-shrink-0 animate-pulse" />}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-snug pr-6">
                                                {msg.subject || 'No Subject'}
                                            </p>
                                        </div>
                                        <ChevronRight
                                            className={`h-3.5 w-3.5 flex-shrink-0 mt-2.5 transition-all duration-200 ${isExpanded ? 'rotate-90 text-[#bef227]' : 'text-slate-400 dark:text-zinc-600'}`}
                                        />
                                    </div>

                                    {/* Content */}
                                    {msg.content && (
                                        <div className={`mt-3 pl-12 transition-all duration-300 ${isExpanded ? '' : 'max-h-10 overflow-hidden'}`}>
                                            <p className={`text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                {renderWithLinks(msg.content)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Meta info when expanded */}
                                    {isExpanded && (msg.sender || msg.date) && (
                                        <div className="flex flex-wrap items-center gap-4 mt-3 pl-12 pt-3 border-t border-slate-100 dark:border-zinc-800/80 animate-in fade-in duration-200">
                                            {msg.sender && (
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-slate-400 dark:text-zinc-650" />
                                                    <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{msg.sender}</span>
                                                </div>
                                            )}
                                            {msg.date && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-slate-400 dark:text-zinc-650" />
                                                    <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{msg.date}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <style>{`
                    @keyframes msg-fade-in {
                        from {
                            opacity: 0;
                            transform: translateY(12px) scale(0.98);
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
