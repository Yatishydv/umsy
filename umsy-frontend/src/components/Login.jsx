import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import illustration1 from '../assets/illustration1.png';
import illustration2 from '../assets/illustration2.png';
import illustration3 from '../assets/illustration3.png';
import { tokenLoginV04, saveSession, getNewLoginStatus } from '../services/api';
import { Eye, EyeOff, Sun, Moon, HelpCircle, Loader2, KeyRound, User2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    // ── UI state ───────────────────────────────────────────────────────────
    const [theme, setTheme] = useState('light');
    const [currentSlide, setCurrentSlide] = useState(0);

    // ── Form state ─────────────────────────────────────────────────────────
    const [regno, setRegno] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [displayedPercent, setDisplayedPercent] = useState(0);

    const slides = [
        {
            id: 'Exam Mastery Hub',
            title: 'Exam Mastery Hub',
            desc: 'Unleash Your Academic Success with Exam Mastery Hub\'s Exam Excellence Platform.',
            image: illustration1
        },
        {
            id: 'Track Progress',
            title: 'Track Progress',
            desc: 'Monitor your courses, grades, and CGPA in real-time.',
            image: illustration2
        },
        {
            id: 'Get Insights',
            title: 'Get Insights',
            desc: 'Receive personalized notifications and smart study reminders.',
            image: illustration3
        }
    ];

    // ── Theme init ─────────────────────────────────────────────────────────
    useEffect(() => {
        const savedRegno = localStorage.getItem('umsy_regno');
        const savedPassword = localStorage.getItem('umsy_password');
        if (savedRegno) {
            navigate('/dashboard', { replace: true });
            return;
        }

        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');

        if (savedRegno) setRegno(savedRegno);
        if (savedPassword) setPassword(savedPassword);
    }, [navigate]);

    // ── Slide auto-rotate ──────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // ── Theme toggle ───────────────────────────────────────────────────────
    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };

    // ── Smooth percentage animation with psychological pacing ─────────────
    useEffect(() => {
        if (!loading) {
            setDisplayedPercent(0);
            return;
        }
        
        const target = progress || 5;
        let increment = 0;
        let delay = 0;

        if (displayedPercent < 85) {
            increment = Math.max(1.5, (target - displayedPercent) / 8); 
            if (displayedPercent < 70) increment = Math.max(increment, 2.5);
            delay = 35;
        } else if (displayedPercent < 95) {
            increment = 0.4;
            delay = 60;
        } else if (displayedPercent < 99) {
            increment = 0.1;
            delay = 150;
        }

        if (displayedPercent < 99.9) {
            const timer = setTimeout(() => {
                setDisplayedPercent(prev => {
                    const next = prev + increment;
                    return Math.max(next, target > prev ? target : next);
                });
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [loading, progress, displayedPercent]);

    // ── Polling for login progress ─────────────────────────────────────────
    useEffect(() => {
        let pollInterval;
        if (loading && regno) {
            const cleanRegno = regno.trim();
            pollInterval = setInterval(async () => {
                try {
                    const data = await getNewLoginStatus(cleanRegno);
                    if (data && data.percent !== undefined) {
                        setProgress(data.percent);
                        setStatusMsg(data.status || 'Processing...');
                    }
                } catch (err) {
                    // Ignore errors during transition
                }
            }, 1000);
        } else {
            setProgress(0);
            setStatusMsg('');
        }
        return () => clearInterval(pollInterval);
    }, [loading, regno]);

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const cleanRegno = regno.trim();
        const cleanPassword = password.trim();
        setLoading(true);
        setStatusMsg('Initializing browser...');

        try {
            setProgress(5);
            
            const result = await tokenLoginV04(cleanRegno, cleanPassword);

            if (result.success && result.cookies) {
                setDisplayedPercent(100);
                setProgress(100);
                setStatusMsg('Success!');

                localStorage.setItem('umsy_cookies', result.cookies);
                localStorage.setItem('umsy_regno', cleanRegno);
                localStorage.setItem('umsy_password', cleanPassword);
                localStorage.setItem('umsy_is_v04', 'true');
                localStorage.setItem('umsy_is_logging_in', 'true');

                localStorage.removeItem('umsy_student_info');
                localStorage.removeItem('umsy_timetable_data');
                localStorage.removeItem('umsy_ranking_data');
                localStorage.removeItem('umsy_result_data');
                localStorage.removeItem('umsy_marks_data');
                localStorage.removeItem('umsy_courses_data');
                localStorage.removeItem('umsy_attendance_data');

                try {
                    await saveSession(cleanRegno, result.cookies);
                } catch (saveErr) {
                    console.warn('⚠️  Could not save session to backend:', saveErr.message);
                }

                setStatusMsg('Authorized.');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 400);
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 font-plus-jakarta relative overflow-hidden">
            {/* Background Glows (Mesh-effect) */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#bef227]/10 to-transparent dark:from-[#bef227]/5 filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/5 filter blur-[120px] pointer-events-none" />

            {/* Left Side: Desktop Sliding Panel */}
            <div className="hidden lg:flex w-1/2 bg-emerald-50/50 dark:bg-zinc-900/20 border-r border-slate-200/50 dark:border-zinc-900/60 flex-col justify-between p-12 min-h-screen relative select-none">
                <div className="flex items-center gap-1.5 cursor-default text-emerald-700 dark:text-[#bef227] text-[10px] font-black uppercase tracking-widest">
                    <span>Academic Success Suite</span>
                </div>

                {/* Sliding Illustration Content */}
                <div className="my-auto relative w-full flex flex-col items-center">
                    <div className="w-full max-w-sm lg:max-w-md h-[320px] relative flex items-center justify-center">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                                    index === currentSlide 
                                        ? 'opacity-100 scale-100 translate-x-0' 
                                        : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
                                }`}
                            >
                                <img 
                                    src={slide.image} 
                                    alt={slide.title} 
                                    className="max-h-full max-w-full object-contain dark:brightness-95 dark:contrast-105"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Slide Text Description */}
                    <div className="text-center mt-8 max-w-xs">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id + '-text'}
                                className={`transition-all duration-500 ${
                                    index === currentSlide 
                                        ? 'opacity-100 block' 
                                        : 'opacity-0 hidden'
                                }`}
                            >
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                                    {slide.title}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-bold leading-relaxed tracking-wide">
                                    {slide.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Dot Indicators */}
                    <div className="flex gap-2.5 mt-8 z-10">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`cursor-pointer h-1.5 rounded-full transition-all duration-300 ${
                                    index === currentSlide 
                                        ? 'bg-emerald-600 dark:bg-[#bef227] w-6' 
                                        : 'bg-emerald-600/20 dark:bg-zinc-800 w-2'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="text-[10px] text-slate-400 dark:text-zinc-650 font-bold uppercase tracking-widest">
                    <span>© {new Date().getFullYear()} UMSY Inc.</span>
                </div>
            </div>

            {/* Right Side: Login Card Frame */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16 min-h-screen relative z-10">
                {/* Header Actions */}
                <div className="flex justify-between items-center w-full">
                    {/* Brand Name */}
                    <div className="flex items-center">
                        <span className="text-lg font-black tracking-widest text-slate-800 dark:text-slate-100 select-none uppercase">
                            umsy
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="cursor-pointer p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:scale-102 active:scale-95 transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4 text-orange-400" /> : <Moon className="h-4 w-4 text-blue-500" />}
                        </button>
                        <a 
                            href="https://ums.lpu.in/"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors px-3 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Support</span>
                        </a>
                    </div>
                </div>

                {/* Login Form Tray */}
                <div className="my-auto mx-auto w-full max-w-[390px] py-12 flex flex-col justify-center">
                    
                    {/* Styled Card for Mobile */}
                    <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-slate-100/50 dark:shadow-none">
                        
                        {/* Header text */}
                        <div className="mb-8 text-left">
                            <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight mb-2 uppercase">Sign in</h1>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-relaxed">
                                Enter your LPU UMS credentials to access your UMSY Dashboard.
                            </p>
                        </div>

                        {/* Errors */}
                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold animate-in fade-in duration-300">
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Loader */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-zinc-850" />
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#bef227] dark:border-t-[#bef227] animate-spin" />
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                        {Math.floor(displayedPercent)}%
                                    </span>
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 justify-center">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#bef227]" />
                                        <span>{statusMsg || 'Automating login...'}</span>
                                    </p>
                                    <p className="text-[9px] text-slate-400 dark:text-zinc-550 font-black uppercase tracking-widest animate-pulse">
                                        Please keep this tab open
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Input Form */
                            <form onSubmit={handleSubmit} className="space-y-5">
                                
                                {/* Reg No input */}
                                <div className="space-y-1.5">
                                    <label htmlFor="v04-regno" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                                        Registration Number
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            id="v04-regno"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="e.g. 12301927"
                                            value={regno}
                                            onChange={(e) => setRegno(e.target.value)}
                                            required
                                            className="flex h-12 w-full rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 pl-11 pr-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-zinc-650 focus-visible:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all duration-200 shadow-inner"
                                        />
                                        <User2 className="absolute left-4 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                                    </div>
                                </div>

                                {/* Password input */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="v04-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                                            Password
                                        </label>
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            id="v04-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="flex h-12 w-full rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 pl-11 pr-12 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-zinc-650 focus-visible:outline-none focus:border-[#bef227] focus:ring-4 focus:ring-[#bef227]/10 transition-all duration-200 shadow-inner"
                                        />
                                        <KeyRound className="absolute left-4 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="cursor-pointer absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-650 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <a href="https://ums.lpu.in/lpuums/forgetpassword.aspx" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline transition-all">Forgot password?</a>
                                    </div>
                                </div>

                                {/* Submit btn */}
                                <button
                                    id="v04-submit"
                                    type="submit"
                                    disabled={loading || !regno.trim() || !password.trim()}
                                    className="cursor-pointer mt-4 inline-flex items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 bg-[#bef227] hover:bg-[#a6d81d] text-[#1c312e] active:scale-[0.98] h-12 px-8 w-full shadow-lg shadow-[#bef227]/10 disabled:opacity-50 disabled:pointer-events-none border border-white/10"
                                >
                                    <span>Sign in</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer notes */}
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600 flex flex-col sm:flex-row gap-3 justify-between items-center w-full select-none border-t border-slate-200/30 dark:border-zinc-900/60 pt-4">
                    <span>Secure SSL connection</span>
                    <div className="flex gap-4">
                        <a href="/cookie" className="hover:text-[#bef227] transition-colors">Session Gateway</a>
                        <a href="#" className="hover:text-[#bef227] transition-colors">Privacy</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
