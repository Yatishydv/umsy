import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import illustration1 from '../assets/illustration1.png';
import illustration2 from '../assets/illustration2.png';
import illustration3 from '../assets/illustration3.png';
import { v05Login, saveSession, getStudentInfo } from '../services/api';
import { Eye, EyeOff, Sun, Moon, HelpCircle, Loader2 } from 'lucide-react';

const UMS_TURNSTILE_SITEKEY = '0x4AAAAAABqizXa69CuLKKuQ';

const V05Login = ({ mode }) => {
    const navigate = useNavigate();

    // ── UI state ───────────────────────────────────────────────────────────
    const [theme, setTheme] = useState('light');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    // ── Form state ─────────────────────────────────────────────────────────
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

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

    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');

        const savedUsername = localStorage.getItem('umsy_regno');
        const savedPassword = localStorage.getItem('umsy_password');
        if (savedUsername) setUsername(savedUsername);
        if (savedPassword) setPassword(savedPassword);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // Listen for automated zero-click Turnstile token or Session from Extension
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'UMSY_TURNSTILE_TOKEN' && event.data.token) {
                console.log('⚡ Received Turnstile token automatically!');
                setTurnstileToken(event.data.token);
                setError('');
                setStatusMsg('✅ Cloudflare verified automatically!');
            }
            if ((event.data && (event.data.type === 'UMSY_AUTO_SESSION' || event.data.type === 'UMSY_RESPONSE_SESSION')) && event.data.cookies) {
                console.log('⚡ Received active session from extension!');
                const cookiesStr = event.data.cookies.trim();
                localStorage.setItem('umsy_cookies', cookiesStr);
                setStatusMsg('✅ Session auto-detected! Fetching student profile...');

                // Fetch student info using session cookie
                getStudentInfo(cookiesStr)
                    .then(info => {
                        const regno = info?.RegistrationNo || info?.RegNo || username || '12301342';
                        localStorage.setItem('umsy_student_info', JSON.stringify(info));
                        localStorage.setItem('umsy_regno', regno);
                        saveSession(regno, cookiesStr).catch(() => {});
                        setStatusMsg('✅ Auto-login complete! Redirecting...');
                        setTimeout(() => navigate('/dashboard'), 300);
                    })
                    .catch(err => {
                        console.error('Failed to fetch student info via extension session:', err);
                        const fallbackReg = username || localStorage.getItem('umsy_regno') || '12301342';
                        localStorage.setItem('umsy_regno', fallbackReg);
                        setTimeout(() => navigate('/dashboard'), 300);
                    });
            }
        };

        window.addEventListener('message', handleMessage);

        // Actively request session from extension on mount and poll every 1s
        window.postMessage({ type: 'UMSY_REQUEST_SESSION' }, '*');
        const pollInterval = setInterval(() => {
            window.postMessage({ type: 'UMSY_REQUEST_SESSION' }, '*');
        }, 1000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(pollInterval);
        };
    }, [navigate, username]);

    // Load Turnstile Script for frontend solving
    useEffect(() => {
        const scriptId = 'cf-turnstile-script';

        const renderWidget = () => {
            if (!turnstileRef.current || widgetIdRef.current !== null) return;
            if (window.turnstile) {
                try {
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
                } catch (e) {
                    console.log('Turnstile render error:', e);
                }
            }
        };

        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                if (window.turnstile) renderWidget();
            };
            document.head.appendChild(script);
        } else if (window.turnstile) {
            renderWidget();
        }

        return () => {
            if (widgetIdRef.current !== null && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {}
                widgetIdRef.current = null;
            }
        };
    }, [theme]);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };

    const openTurnstilePopup = () => {
        const width = 500;
        const height = 650;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        setStatusMsg('Opening Cloudflare verification window...');
        const popup = window.open(
            'https://ums.lpu.in/lpuums/',
            'CloudflareSolver',
            `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
        );

        if (!popup) {
            setError('Popup blocked! Please allow popups for this domain.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in both Registration Number and Password.');
            return;
        }

        setLoading(true);
        setStatusMsg('Verifying credentials via UMS...');

        try {
            // Check if user pasted an ASP.NET_SessionId cookie directly
            if (turnstileToken && turnstileToken.includes('ASP.NET_SessionId=')) {
                saveSession(username.trim(), turnstileToken.trim());
                localStorage.setItem('umsy_cookies', turnstileToken.trim());
                localStorage.setItem('umsy_regno', username.trim());
                localStorage.setItem('umsy_password', password.trim());
                localStorage.removeItem('umsy_seating_plan');

                setStatusMsg('Login successful via Session Cookie! Redirecting...');
                setTimeout(() => navigate('/dashboard'), 600);
                return;
            }

            const res = await v05Login(username.trim(), password.trim(), turnstileToken);
            if (res.success && res.cookies) {
                saveSession(username.trim(), res.cookies);
                localStorage.setItem('umsy_cookies', res.cookies);
                localStorage.setItem('umsy_regno', username.trim());
                localStorage.setItem('umsy_password', password.trim());
                localStorage.removeItem('umsy_seating_plan');

                setStatusMsg('Login successful! Redirecting...');
                setTimeout(() => navigate('/dashboard'), 600);
            } else {
                setError(res.error || 'Verification failed — please try again.');
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please check credentials.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#f8fafc] dark:bg-[#090d16] font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-300">
            {/* Left Column: Interactive Banner */}
            <div className="hidden lg:flex lg:w-1/2 p-6 flex-col justify-between relative overflow-hidden select-none">
                <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-[#eef2f6] to-[#e2e8f0] dark:from-[#111827] dark:to-[#0f172a] border border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden flex flex-col justify-between p-12 transition-colors duration-300">
                    <div className="relative z-10">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#bef227] bg-[#1c312e] px-3 py-1.5 rounded-full shadow-sm">
                            ACADEMIC SUCCESS SUITE
                        </span>
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                        <div className="w-72 h-72 mb-8 relative flex items-center justify-center">
                            {slides.map((slide, idx) => (
                                <img
                                    key={slide.id}
                                    src={slide.image}
                                    alt={slide.title}
                                    className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ease-in-out transform ${
                                        idx === currentSlide
                                            ? 'opacity-100 scale-100 translate-x-0'
                                            : 'opacity-0 scale-95 -translate-x-8 pointer-events-none'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="text-center max-w-md">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-3 transition-all duration-500">
                                {slides[currentSlide].title}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-all duration-500">
                                {slides[currentSlide].desc}
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex justify-center space-x-2">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    idx === currentSlide
                                        ? 'w-8 bg-[#bef227]'
                                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-16 relative">
                <div className="flex justify-between items-center w-full max-w-md mx-auto">
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                            UMSY <span className="text-xs bg-[#bef227] text-[#1c312e] font-extrabold px-2 py-0.5 rounded-full ml-1">HTTP v0.5</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="w-full max-w-md mx-auto my-auto py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                            Sign in (Fast HTTP)
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Enter your credentials for direct high-speed HTTP access.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-sm font-semibold animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Registration Number
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. 12301342"
                                required
                                disabled={loading}
                                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#bef227] focus:border-transparent font-medium transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#bef227] focus:border-transparent font-medium transition-all shadow-sm pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Mode 1 ONLY: Extension Helper */}
                        {mode === 'extension' && (
                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center space-y-2.5">
                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                        🧩 Chrome Extension Mode (/v05login/1)
                                    </p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                        Auto-captures Turnstile verification with zero manual steps.
                                    </p>
                                    <a
                                        href="/umsy-chrome-extension.zip"
                                        download="umsy-chrome-extension.zip"
                                        className="inline-block py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                                    >
                                        📥 Download UMSY Extension (.zip)
                                    </a>
                                    <div className="text-[10px] text-left text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 p-2.5 rounded-xl space-y-1 font-medium">
                                        <p className="font-bold text-amber-900 dark:text-amber-200">How to Install in 3 Steps:</p>
                                        <p>1. Extract the downloaded zip file.</p>
                                        <p>2. Open <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">chrome://extensions</code> in Chrome and enable <b>Developer mode</b> (top right toggle).</p>
                                        <p>3. Click <b>Load unpacked</b> and select the extracted folder.</p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-6 rounded-2xl bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black text-sm tracking-wide shadow-lg shadow-[#bef227]/20 transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <span>Sign in with Extension</span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Mode 2 ONLY: UMS Popup Helper */}
                        {mode === 'popup' && (
                            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-center space-y-2">
                                <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                                    🌐 Popup Solver Mode (/v05login/2)
                                </p>
                                <button
                                    type="button"
                                    onClick={openTurnstilePopup}
                                    className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                                >
                                    Open UMS Verification Popup
                                </button>
                            </div>
                        )}

                        {/* Mode 3 ONLY: Native Turnstile Widget */}
                        {mode === 'turnstile' && (
                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    🛡️ Turnstile Widget Mode (/v05login/3)
                                </p>
                                <div ref={turnstileRef} className="flex justify-center my-2" />
                                {turnstileToken ? (
                                    <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                        ✓ Turnstile Verified! Ready to Sign in.
                                    </p>
                                ) : (
                                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                        Check the box above to verify, then click Sign in.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Mode 4 ONLY: Instant Direct Login */}
                        {mode === 'instant' && (
                            <div className="p-4 rounded-2xl bg-lime-50 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-900/50 text-center space-y-2">
                                <p className="text-xs font-bold text-lime-800 dark:text-lime-300">
                                    ⚡ Instant Direct Login (/v05login/4)
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!username || !password) {
                                            setError('Please enter Registration Number and Password.');
                                            return;
                                        }
                                        setError('');
                                        setLoading(true);
                                        setStatusMsg('Connecting to UMS...');

                                        v05Login(username.trim(), password.trim(), '')
                                            .then(res => {
                                                if (res.success && res.cookies) {
                                                    saveSession(username.trim(), res.cookies);
                                                    localStorage.setItem('umsy_cookies', res.cookies);
                                                    localStorage.setItem('umsy_regno', username.trim());
                                                    localStorage.setItem('umsy_password', password.trim());
                                                    localStorage.removeItem('umsy_seating_plan');
                                                    setStatusMsg('Login successful! Redirecting...');
                                                    setTimeout(() => navigate('/dashboard'), 500);
                                                } else {
                                                    setError(res.error || 'Login failed — please check credentials.');
                                                    setLoading(false);
                                                }
                                            })
                                            .catch(err => {
                                                setError(err.message || 'Login failed.');
                                                setLoading(false);
                                            });
                                    }}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black text-sm tracking-wide shadow-lg shadow-[#bef227]/20 transition-all duration-200 transform active:scale-[0.98] cursor-pointer"
                                >
                                    Instant Sign in (No Cloudflare)
                                </button>
                            </div>
                        )}

                        {/* Standard Default Mode (/v05login) */}
                        {!mode && (
                            <div className="space-y-3">
                                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center space-y-2">
                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                        🧩 Option 1: Chrome Extension Solver
                                    </p>
                                    <a
                                        href="/umsy-chrome-extension.zip"
                                        download="umsy-chrome-extension.zip"
                                        className="inline-block py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer"
                                    >
                                        📥 Download Extension (.zip)
                                    </a>
                                </div>

                                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-center">
                                    <button
                                        type="button"
                                        onClick={openTurnstilePopup}
                                        className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                                    >
                                        🌐 Option 2: Open UMS Verification Popup
                                    </button>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        🛡️ Option 3: Turnstile Widget
                                    </p>
                                    <div ref={turnstileRef} className="flex justify-center my-2" />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!username || !password) {
                                            setError('Please enter Registration Number and Password.');
                                            return;
                                        }
                                        setError('');
                                        setLoading(true);
                                        setStatusMsg('Connecting to UMS...');

                                        v05Login(username.trim(), password.trim(), '')
                                            .then(res => {
                                                if (res.success && res.cookies) {
                                                    saveSession(username.trim(), res.cookies);
                                                    localStorage.setItem('umsy_cookies', res.cookies);
                                                    localStorage.setItem('umsy_regno', username.trim());
                                                    localStorage.setItem('umsy_password', password.trim());
                                                    localStorage.removeItem('umsy_seating_plan');
                                                    setStatusMsg('Login successful! Redirecting...');
                                                    setTimeout(() => navigate('/dashboard'), 500);
                                                } else {
                                                    setError(res.error || 'Login failed — please check credentials.');
                                                    setLoading(false);
                                                }
                                            })
                                            .catch(err => {
                                                setError(err.message || 'Login failed.');
                                                setLoading(false);
                                            });
                                    }}
                                    className="w-full py-3 px-6 rounded-2xl bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black text-sm tracking-wide shadow-md transition-all cursor-pointer"
                                >
                                    ⚡ Option 4: Instant Direct Login
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-600">
                    UMSY Academic Platform &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};

export default V05Login;
