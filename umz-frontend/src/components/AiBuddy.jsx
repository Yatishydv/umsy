import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Sparkles, Bot, User, Trash2, RefreshCw, ChevronDown, 
    BarChart2, GraduationCap, AlertTriangle, TrendingUp, Award, FileText,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { sendAIBuddyMessage } from '../services/api';

// ── Inline markdown renderer ──────────────────────────────────────────────────
function RenderMarkdown({ text }) {
    const lines = text.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-1" />;
                if (line.match(/^[\*\-•]\s+/)) {
                    return (
                        <div key={i} className="flex gap-2 items-start">
                            <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{renderInline(line.replace(/^[\*\-•]\s+/, ''))}</span>
                        </div>
                    );
                }
                const numMatch = line.match(/^(\d+)\.\s+/);
                if (numMatch) {
                    return (
                        <div key={i} className="flex gap-2 items-start">
                            <span className="text-xs font-semibold text-gray-400 mt-0.5 flex-shrink-0">{numMatch[1]}.</span>
                            <span className="text-sm text-gray-700">{renderInline(line.replace(/^\d+\.\s+/, ''))}</span>
                        </div>
                    );
                }
                if (line.startsWith('## ')) return <p key={i} className="text-sm font-bold text-gray-900 mt-2">{renderInline(line.slice(3))}</p>;
                if (line.startsWith('# '))  return <p key={i} className="text-base font-bold text-gray-900 mt-2">{renderInline(line.slice(2))}</p>;
                return <p key={i} className="text-sm text-gray-700 leading-relaxed">{renderInline(line)}</p>;
            })}
        </div>
    );
}

function renderInline(text) {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
            return <code key={i} className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono text-gray-800">{part.slice(1, -1)}</code>;
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
    const attendance = safe('umz_attendance_data');
    const attendanceLean = Array.isArray(attendance)
        ? attendance.map(({ records: _r, ...rest }) => rest)
        : null;
    return {
        studentInfo: safe('umz_student_info'),
        attendance:  attendanceLean,
        result:      safe('umz_result_data'),
    };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AiBuddy() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState(() => {
        try { return JSON.parse(localStorage.getItem('umz_ai_buddy_history')) || []; } catch { return []; }
    });
    const [input, setInput]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const bottomRef    = useRef(null);
    const containerRef = useRef(null);
    const inputRef     = useRef(null);

    const studentName = (() => {
        try { return JSON.parse(localStorage.getItem('umz_student_info'))?.Name?.split(' ')[0] || 'there'; }
        catch { return 'there'; }
    })();

    // Persist history
    useEffect(() => {
        localStorage.setItem('umz_ai_buddy_history', JSON.stringify(messages));
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

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
        localStorage.removeItem('umz_ai_buddy_history');
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* ── Header ── */}
                <div className="flex-shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="p-2 -ml-2 text-gray-900 dark:text-white active:scale-90 transition-transform"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI Buddy</h1>
                        {!isEmpty ? (
                            <button
                                onClick={clearHistory}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Clear history"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {/* <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Live</span> */}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Messages area ── */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-y-auto px-6 lg:px-10 pb-4 space-y-4 relative"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
                >
                    {/* ── Welcome ── */}
                    {isEmpty && (
                        <div className="flex flex-col items-center justify-center min-h-[80%] gap-8 py-8 text-center px-4">
                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4 shadow-xl">
                                    <Sparkles className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">Hey {studentName}!</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto">
                                    Ask me anything about your academics
                                </p>
                            </div>

                            {/* Quick prompt cards - 2 columns */}
                            <div className="grid grid-cols-2 gap-2.5 w-full max-w-xl">
                                {QUICK_PROMPTS.map(p => {
                                    const Icon = p.icon;
                                    return (
                                        <button
                                            key={p.label}
                                            onClick={() => sendMessage(p.text)}
                                            className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-center hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group shadow-sm"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                                <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white leading-tight uppercase tracking-tight">{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Message bubbles ── */}
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                msg.role === 'user' ? 'bg-gray-900' : 'bg-white border border-gray-200'
                            }`}>
                                {msg.role === 'user'
                                    ? <User className="w-4 h-4 text-white" />
                                    : <Bot className="w-4 h-4 text-gray-600" />
                                }
                            </div>

                            {/* Bubble */}
                            <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                                msg.role === 'user'
                                    ? 'bg-gray-900 text-white rounded-tr-sm'
                                    : 'bg-white border border-gray-100 rounded-tl-sm'
                            }`}>
                                {msg.role === 'assistant'
                                    ? <RenderMarkdown text={msg.text} />
                                    : <p className="text-sm leading-relaxed">{msg.text}</p>
                                }
                            </div>
                        </div>
                    ))}

                    {/* ── Typing indicator ── */}
                    {loading && (
                        <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Bot className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                <div className="flex gap-1.5 items-center h-4">
                                    {[0, 1, 2].map(d => (
                                        <div
                                            key={d}
                                            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                                            style={{ animationDelay: `${d * 150}ms` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="flex-1">{error}</span>
                            <button onClick={() => setError('')} className="text-xs text-red-400 hover:text-red-600 underline">Dismiss</button>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Scroll-to-bottom */}
                {showScrollBtn && (
                    <div className="relative">
                        <button
                            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="absolute bottom-2 right-8 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-md transition-colors z-10"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── Input bar ── */}
                <div className="flex-shrink-0 px-4 lg:px-10 pt-4 pb-20 lg:pb-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    {/* Quick chips when chat is active */}
                    {!isEmpty && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                            {QUICK_PROMPTS.slice(0, 4).map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => sendMessage(p.text)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900 rounded-lg text-xs font-semibold text-gray-500 hover:text-blue-600 transition-all shadow-sm"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-3 items-end">
                        <div className="flex-1">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Message your AI Buddy..."
                                rows={1}
                                className="w-full resize-none bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-2xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner max-h-32"
                                style={{ scrollbarWidth: 'thin' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
                        >
                            <Send className="w-5 h-5 text-white" />
                        </button>
                    </form>
                    {/* <p className="text-center text-[9px] font-medium text-gray-400 mt-3 uppercase tracking-widest">Powered by Gemini AI</p> */}
                </div>
            </main>
        </div>
    );
}
