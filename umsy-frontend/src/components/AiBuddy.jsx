import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Sparkles, Bot, User, Trash2, RefreshCw, ChevronDown, 
    BarChart2, GraduationCap, AlertTriangle, TrendingUp, Award, FileText,
    MessageSquare, Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendAIBuddyMessage } from '../services/api';

// ── Inline markdown renderer ──────────────────────────────────────────────────
function RenderMarkdown({ text }) {
    const lines = text.split('\n');
    return (
        <div className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-1" />;
                if (line.match(/^[\*\-•]\s+/)) {
                    return (
                        <div key={i} className="flex gap-2 items-start pl-1">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-650 flex-shrink-0" />
                            <span className="leading-relaxed">{renderInline(line.replace(/^[\*\-•]\s+/, ''))}</span>
                        </div>
                    );
                }
                const numMatch = line.match(/^(\d+)\.\s+/);
                if (numMatch) {
                    return (
                        <div key={i} className="flex gap-2 items-start pl-1">
                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-550 mt-0.5 flex-shrink-0">{numMatch[1]}.</span>
                            <span className="leading-relaxed">{renderInline(line.replace(/^\d+\.\s+/, ''))}</span>
                        </div>
                    );
                }
                if (line.startsWith('## ')) return <p key={i} className="text-xs font-black text-slate-900 dark:text-white mt-3 mb-1 uppercase tracking-wider">{renderInline(line.slice(3))}</p>;
                if (line.startsWith('# '))  return <p key={i} className="text-sm font-black text-slate-900 dark:text-white mt-4 mb-1.5 uppercase tracking-wide">{renderInline(line.slice(2))}</p>;
                return <p key={i} className="leading-relaxed">{renderInline(line)}</p>;
            })}
        </div>
    );
}

function renderInline(text) {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i} className="font-extrabold text-slate-950 dark:text-[#bef227]">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
            return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono text-slate-800 dark:text-zinc-200 border border-slate-200/30 dark:border-zinc-700/50">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
    });
}

// ── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
    { icon: BarChart2, label: 'Attendance summary',  text: 'Give me a summary of my attendance for all subjects.' },
    { icon: GraduationCap, label: 'CGPA overview',        text: 'What is my current CGPA and how has it changed term by term?' },
    { icon: AlertTriangle, label: 'Low attendance',       text: 'Which subjects have attendance below 75%? How many classes do I need?' },
    { icon: TrendingUp, label: 'Improve CGPA',         text: 'Based on my grades, what should I focus on to improve my CGPA?' },
    { icon: Award, label: 'Best subjects',        text: 'In which subjects have I performed the best?' },
    { icon: FileText, label: 'Full report',          text: 'Give me a complete academic performance report with suggestions.' },
];

// ── Gather UMS data from localStorage (lean — no per-class records) ───────────
function gatherUMSData() {
    const safe = (key) => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } };
    const attendance = safe('umsy_attendance_data');
    const attendanceLean = Array.isArray(attendance)
        ? attendance.map(({ records: _r, ...rest }) => rest)
        : null;
    return {
        studentInfo: safe('umsy_student_info'),
        attendance:  attendanceLean,
        result:      safe('umsy_result_data'),
    };
}

export default function AiBuddy() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState(() => {
        try { return JSON.parse(localStorage.getItem('umsy_ai_buddy_history')) || []; } catch { return []; }
    });
    const [input, setInput]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [studentPhoto, setStudentPhoto] = useState('');

    const bottomRef    = useRef(null);
    const containerRef = useRef(null);
    const inputRef     = useRef(null);

    const studentName = (() => {
        try { return JSON.parse(localStorage.getItem('umsy_student_info'))?.Name?.split(' ')[0] || 'there'; }
        catch { return 'there'; }
    })();

    // Persist history
    useEffect(() => {
        localStorage.setItem('umsy_ai_buddy_history', JSON.stringify(messages));
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Load student photo
    useEffect(() => {
        const storedInfo = localStorage.getItem('umsy_student_info');
        if (storedInfo) {
            try {
                const info = JSON.parse(storedInfo);
                if (info.StudentPicture) {
                    setStudentPhoto(`data:image/png;base64,${info.StudentPicture}`);
                }
            } catch (e) {
                console.error('Error loading student photo in UMSY AI:', e);
            }
        }
    }, []);

    // Scroll-to-bottom button
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const sendMessage = async (text) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setInput('');
        setError('');

        const userMsg = { role: 'user', text: msg, ts: Date.now() };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);

        try {
            const data    = gatherUMSData();
            const history = next.slice(-10).map(m => ({ role: m.role, text: m.text }));
            const res     = await sendAIBuddyMessage(msg, data, history.slice(0, -1));
            setMessages(prev => [...prev, { role: 'assistant', text: res.reply, ts: Date.now() }]);
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    };

    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem('umsy_ai_buddy_history');
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/20 font-plus-jakarta">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#bef227] to-[#d4ff5c]/60 flex items-center justify-center shadow-lg shadow-[#bef227]/10 border border-white/20">
                            <Cpu className="w-4 h-4 text-[#1c312e]" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            UMSY AI
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Online Assistant</p>
                    </div>
                </div>

                {!isEmpty && (
                    <button
                        onClick={clearHistory}
                        className="cursor-pointer p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-550/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-100 dark:hover:border-red-500/20 mr-12"
                        title="Clear history"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-5 no-scrollbar bg-slate-50/30 dark:bg-zinc-900/5 relative"
            >
                {/* Welcome layout */}
                {isEmpty && (
                    <div className="flex flex-col items-center justify-center min-h-[90%] gap-8 py-4 text-center px-4">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-[#bef227] to-[#d4ff5c]/50 flex items-center justify-center mx-auto mb-4.5 shadow-xl shadow-[#bef227]/10 border border-white/20 relative">
                                <Sparkles className="w-7 h-7 text-[#1c312e]" />
                                <div className="absolute inset-0 rounded-[24px] border border-[#bef227]/30 animate-ping opacity-25 pointer-events-none" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Hey {studentName}!</h3>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">
                                I am your UMS intelligence partner. How can I help you today?
                            </p>
                        </div>

                        {/* Quick Prompts */}
                        <div className="grid grid-cols-2 gap-3 w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-600">
                            {QUICK_PROMPTS.map(p => {
                                const Icon = p.icon;
                                return (
                                    <button
                                        key={p.label}
                                        onClick={() => sendMessage(p.text)}
                                        className="cursor-pointer flex flex-col items-center gap-2.5 p-4 bg-white dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/80 rounded-[28px] text-center hover:border-[#bef227] dark:hover:border-[#bef227]/40 hover:shadow-lg hover:shadow-[#bef227]/5 hover:-translate-y-0.5 transition-all duration-300 group shadow-sm active:scale-[0.98]"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-zinc-850 flex items-center justify-center flex-shrink-0 group-hover:bg-[#bef227]/10 transition-colors border border-slate-100 dark:border-zinc-800">
                                            <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-[#bef227]" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-white leading-tight uppercase tracking-widest">{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Message Bubbles */}
                {messages.map((msg, i) => (
                    <div 
                        key={i} 
                        className={`flex gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border overflow-hidden ${
                            msg.role === 'user' 
                                ? 'bg-slate-900 border-slate-850 dark:bg-zinc-800 dark:border-zinc-700' 
                                : 'bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800'
                        }`}>
                            {msg.role === 'user'
                                ? (studentPhoto 
                                    ? <img src={studentPhoto} alt="User" className="w-full h-full object-cover" />
                                    : <User className="w-3.5 h-3.5 text-white" />)
                                : <Bot className="w-3.5 h-3.5 text-slate-650 dark:text-zinc-400" />
                            }
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[76%] rounded-[20px] px-4.5 py-3.5 shadow-sm border ${
                            msg.role === 'user'
                                ? 'bg-slate-900 dark:bg-zinc-800 text-white border-slate-850 dark:border-zinc-700 rounded-tr-[4px] text-xs font-semibold leading-relaxed'
                                : 'bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm border-slate-200/50 dark:border-zinc-800/80 rounded-tl-[4px]'
                        }`}>
                            {msg.role === 'assistant'
                                ? <RenderMarkdown text={msg.text} />
                                : <p className="text-xs font-semibold leading-relaxed">{msg.text}</p>
                            }
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                    <div className="flex gap-3.5 items-start animate-in fade-in duration-200">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Bot className="w-3.5 h-3.5 text-slate-650 dark:text-zinc-400" />
                        </div>
                        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm border border-slate-200/50 dark:border-zinc-800/80 rounded-[20px] rounded-tl-[4px] px-5 py-4 shadow-sm">
                            <div className="flex gap-1.5 items-center h-3">
                                {[0, 1, 2].map(d => (
                                    <div
                                        key={d}
                                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600 animate-bounce"
                                        style={{ animationDelay: `${d * 150}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-450 shadow-sm">
                        <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 underline decoration-2">Dismiss</button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom */}
            {showScrollBtn && (
                <div className="relative">
                    <button
                        onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="absolute bottom-3 right-6 w-8.5 h-8.5 bg-white dark:bg-zinc-900 border border-slate-250/20 dark:border-zinc-800 rounded-full flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-slate-50 shadow-md transition-colors z-10 active:scale-90"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input Bar */}
            <div className="flex-shrink-0 px-6 py-4.5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-t border-slate-100 dark:border-zinc-800/80 flex flex-col gap-3">
                {/* Suggestions chips */}
                {!isEmpty && (
                    <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar select-none" style={{ scrollbarWidth: 'none' }}>
                        {QUICK_PROMPTS.slice(0, 4).map(p => (
                            <button
                                key={p.label}
                                onClick={() => sendMessage(p.text)}
                                className="cursor-pointer flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800/80 hover:border-[#bef227] dark:hover:border-[#bef227]/40 rounded-xl text-[10px] font-black text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="relative flex items-center">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Ask UMSY AI anything..."
                        rows={1}
                        className="w-full resize-none bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800 rounded-[24px] pl-4 pr-14 py-3.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder:text-zinc-650 focus:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all shadow-inner max-h-32 min-h-[46px] leading-relaxed"
                        style={{ scrollbarWidth: 'thin' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2.5 bottom-2 w-9.5 h-9.5 rounded-2xl bg-[#bef227] hover:bg-[#a6d81d] text-[#1c312e] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0 border border-white/10"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
