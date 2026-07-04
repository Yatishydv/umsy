import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import illustration1 from '../assets/illustration1.png';
import illustration2 from '../assets/illustration2.png';
import illustration3 from '../assets/illustration3.png';
import { newLogin, saveSession, getNewLoginStatus } from '../services/api';
import { Eye, EyeOff, Sun, Moon, HelpCircle, Loader2 } from 'lucide-react';

// ─── Cloudflare Turnstile sitekey for LPU UMS ───────────────────────────────
const UMS_TURNSTILE_SITEKEY = '0x4AAAAAABqizXa69CuLKKuQ';

const UmsyV04Login = () => {
    const navigate = useNavigate();

    // ── UI state ───────────────────────────────────────────────────────────
    const [theme, setTheme] = useState('light');
    const [currentSlide, setCurrentSlide] = useState(0);

    // ── Form state ─────────────────────────────────────────────────────────
    const [regno, setRegno] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [displayedPercent, setDisplayedPercent] = useState(0);

    const turnstileRef = useRef(null);
    const widgetIdRef = useRef(null);

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
        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');

        const savedRegno = localStorage.getItem('umsy_regno');
        const savedPassword = localStorage.getItem('umsy_password');
        if (savedRegno) setRegno(savedRegno);
        if (savedPassword) setPassword(savedPassword);
    }, []);

    // ── Slide auto-rotate ──────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // ── Turnstile script loader ────────────────────────────────────────────
    useEffect(() => {
        const scriptId = 'cf-turnstile-script';

        const renderWidget = () => {
            if (!turnstileRef.current) return;
            if (widgetIdRef.current !== null) return; // already rendered

            widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                sitekey: UMS_TURNSTILE_SITEKEY,
                theme: theme,
                callback: (token) => {
                    setTurnstileToken(token);
                    setError('');
                },
                'expired-callback': () => {
                    setTurnstileToken('');
                    setError('Verification expired — please verify again.');
                },
                'error-callback': () => {
                    setTurnstileToken('');
                    setError('Verification failed — please try again.');
                },
            });
        };

        if (window.turnstile) {
            renderWidget();
        } else if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            script.onload = renderWidget;
            document.head.appendChild(script);
        } else {
            const poll = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(poll);
                    renderWidget();
                }
            }, 200);
        }

        return () => {
            if (widgetIdRef.current !== null && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
            }
            widgetIdRef.current = null;
        };
    }, [theme]);

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
            
            const result = await newLogin(cleanRegno, cleanPassword, turnstileToken);

            if (result.success && result.cookies) {
                setDisplayedPercent(100);
                setProgress(100);
                setStatusMsg('Success!');

                localStorage.setItem('umsy_cookies', result.cookies);
                localStorage.setItem('umsy_regno', cleanRegno);
                localStorage.setItem('umsy_password', cleanPassword);
                localStorage.removeItem('umsy_is_v04');

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
            if (widgetIdRef.current !== null && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
            setTurnstileToken('');
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-500 font-sans">
            
            {/* Left Side: Pastel Green Sliding Panel */}
            <div className="hidden lg:flex w-1/2 bg-[#eefaf2] dark:bg-[#121d16] flex-col justify-between p-8 lg:p-12 min-h-screen relative select-none">
                <div className="flex items-center gap-1.5 cursor-default text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                    <span>Academic Success Suite</span>
                </div>

                {/* Sliding Illustration Content */}
                <div className="my-auto relative w-full flex flex-col items-center">
                    <div className="w-full max-w-sm lg:max-w-md h-[280px] lg:h-[350px] relative flex items-center justify-center">
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
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Slide Text Description */}
                    <div className="text-center mt-6 max-w-sm">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id + '-text'}
                                className={`transition-all duration-500 ${
                                    index === currentSlide 
                                        ? 'opacity-100 block' 
                                        : 'opacity-0 hidden'
                                }`}
                            >
                                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                    {slide.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                                    {slide.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Dot Indicators */}
                    <div className="flex gap-2.5 mt-6 z-10">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`cursor-pointer w-2 h-2 rounded-full transition-all duration-300 ${
                                    index === currentSlide 
                                        ? 'bg-emerald-600 dark:bg-emerald-400 w-6' 
                                        : 'bg-emerald-600/25 dark:bg-emerald-400/25 hover:bg-emerald-600/40'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer copyright on left */}
                <div className="text-[10px] text-emerald-800/40 dark:text-emerald-400/20 font-bold">
                    <span>© {new Date().getFullYear()} UMSY Inc.</span>
                </div>
            </div>

            {/* Right Side: Clean White Login Panel */}
            <div className="w-full lg:w-1/2 bg-white dark:bg-zinc-900 flex flex-col justify-between p-6 sm:p-8 lg:p-16 min-h-screen relative transition-colors duration-500">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center w-full">
                    {/* Minimal Robotic Monospaced Text Logo */}
                    <div className="flex items-center gap-1">
                        <span className="text-2xl font-semibold font-mono tracking-widest text-slate-800 dark:text-slate-100 select-none uppercase">
                            umsy
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="cursor-pointer p-2.5 rounded-xl bg-[#f8fafc] dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-accent-foreground transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-orange-400" /> : <Moon className="h-4.5 w-4.5 text-blue-500" />}
                        </button>
                        <a 
                            href="#" 
                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/60 dark:border-zinc-700/80"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Support</span>
                        </a>
                    </div>
                </div>

                {/* Login Form Container */}
                <div className="my-auto mx-auto w-full max-w-sm py-12 flex flex-col justify-center">
                    
                    {/* Header text */}
                    <div className="mb-8 text-left">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-2">Sign in</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Enter your credentials to access your UMSY Dashboard.
                        </p>
                    </div>

                    {/* Errors */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs animate-in fade-in duration-300">
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    {/* Loader */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-10">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-zinc-800" />
                                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-slate-800 dark:border-t-emerald-400 animate-spin" />
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                    {Math.floor(displayedPercent)}%
                                </span>
                            </div>
                            <div className="text-center space-y-1.5">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 justify-center">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-800 dark:text-emerald-400" />
                                    <span>{statusMsg || 'Automating login...'}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold animate-pulse">
                                    Please keep this tab open
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Input Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Reg No input */}
                            <div className="space-y-1.5">
                                <label htmlFor="v04-regno" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Registration Number
                                </label>
                                <input
                                    id="v04-regno"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 12301342"
                                    value={regno}
                                    onChange={(e) => setRegno(e.target.value)}
                                    required
                                    className="flex h-12 w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus-visible:outline-none focus:border-slate-400 dark:focus:border-zinc-500 transition-all duration-200"
                                />
                            </div>

                            {/* Password input */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="v04-password" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Password
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        id="v04-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="flex h-12 w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-4 pr-12 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus-visible:outline-none focus:border-slate-400 dark:focus:border-zinc-500 transition-all duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                                <div className="text-right">
                                    <a href="https://ums.lpu.in/lpuums/forgetpassword.aspx" target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-all">Forgot password?</a>
                                </div>
                            </div>

                            {/* Cloudflare Turnstile Widget */}
                            <div className="space-y-1.5 flex justify-center py-2">
                                <div ref={turnstileRef} />
                            </div>

                            {/* Submit btn */}
                            <button
                                id="v04-submit"
                                type="submit"
                                disabled={loading || !regno.trim() || !password.trim()}
                                className="cursor-pointer mt-4 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-slate-800 hover:bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white active:scale-[0.98] h-12 px-8 w-full shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <span>Sign in</span>
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer notes */}
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex justify-between items-center w-full select-none border-t border-slate-100 dark:border-zinc-800 pt-4">
                    <span>Secure SSL connection</span>
                    <div className="flex gap-4">
                        <a href="/cookie" className="hover:text-slate-950 dark:hover:text-white transition-colors">Session Gateway</a>
                        <a href="#" className="hover:text-slate-950 dark:hover:text-white transition-colors">Privacy</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UmsyV04Login;
