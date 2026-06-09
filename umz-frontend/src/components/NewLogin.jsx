import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoUmz from '../assets/logoUMz.png';
import loginImg1 from '../assets/login1.jpg';
import loginImg2 from '../assets/login2.jpg';
import loginImg3 from '../assets/login3.jpg';
import { newLogin, saveSession, getNewLoginStatus } from '../services/api';

// ─── Cloudflare Turnstile sitekey for LPU UMS ───────────────────────────────
// Extracted from the live UMS login page Cloudflare challenge network request
const UMS_TURNSTILE_SITEKEY = '0x4AAAAAABqizXa69CuLKKuQ';

const NewLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isNewLogin2 = location.pathname === '/newlogin2';

    // ── UI state ───────────────────────────────────────────────────────────
    const [theme, setTheme] = useState('dark');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    // ── Form state ─────────────────────────────────────────────────────────
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [progress, setProgress] = useState({ percent: 0, status: '' });
    const [displayedPercent, setDisplayedPercent] = useState(0);

    const turnstileRef = useRef(null);
    const widgetIdRef = useRef(null);

    const slides = [
        { id: 'Secure Login', image: loginImg1 },
        { id: 'Track Your Academic Progress', image: loginImg2 },
        { id: 'See Yourself Improving', image: loginImg3 },
    ];

    // ── Theme init ─────────────────────────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');

        const savedUsername = localStorage.getItem('umz_regno');
        const savedPassword = localStorage.getItem('umz_password');
        if (savedUsername) setUsername(savedUsername);
        if (savedPassword) setPassword(savedPassword);
    }, []);

    // ── Slide auto-rotate ──────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 7000);
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
            // Script already loading — poll until turnstile is available
            const poll = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(poll);
                    renderWidget();
                }
            }, 200);
        }

        return () => {
            // Cleanup widget on unmount
            if (widgetIdRef.current !== null && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
            }
            widgetIdRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        
        const target = progress.percent || 5;
        
        // Psychological pacing:
        // 1. If we are early (0-80), move fast to give a sense of speed
        // 2. If we are mid (80-95), move normally
        // 3. If we are late (95-99), move extremely slowly (the "wait" phase)
        
        let increment = 0;
        let delay = 0;

        if (displayedPercent < 85) {
            // Fast start: quick momentum
            increment = Math.max(1.5, (target - displayedPercent) / 8); 
            if (displayedPercent < 70) increment = Math.max(increment, 2.5);
            delay = 35;
        } else if (displayedPercent < 95) {
            // Smooth middle: steady progress
            increment = 0.4;
            delay = 60;
        } else if (displayedPercent < 99) {
            // Natural end "finish": slow but still moving visibly
            increment = 0.1;
            delay = 150;
        }

        if (displayedPercent < 99.9) {
            const timer = setTimeout(() => {
                setDisplayedPercent(prev => {
                    const next = prev + increment;
                    // If backend is ahead, jump to backend percent
                    return Math.max(next, target > prev ? target : next);
                });
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [loading, progress.percent, displayedPercent]);

    // ── Polling for login progress ─────────────────────────────────────────
    useEffect(() => {
        let pollInterval;
        if (loading && username) {
            const cleanUsername = username.trim();
            pollInterval = setInterval(async () => {
                try {
                    const data = await getNewLoginStatus(cleanUsername);
                    if (data && data.percent !== undefined) {
                        setProgress({
                            percent: data.percent,
                            status: data.status || 'Processing...'
                        });
                    }
                } catch (err) {
                    // Ignore errors during transition/start
                }
            }, 1000);
        } else {
            setProgress({ percent: 0, status: '' });
        }
        return () => clearInterval(pollInterval);
    }, [loading, username]);

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();
        setLoading(true);

        try {
            setProgress({ percent: 5, status: 'Initializing browser...' });
            
            // Format password if it's a DOB from date picker
            let finalPassword = cleanPassword;
            if (isNewLogin2 && cleanPassword.includes('-')) {
                const [y, m, d] = cleanPassword.split('-');
                finalPassword = `${d}${m}${y}`;
            }

            const result = await newLogin(cleanUsername, finalPassword, turnstileToken);

            if (result.success && result.cookies) {
                setDisplayedPercent(100);
                setProgress({ percent: 100, status: 'Success!' });

                // Store cookies in localStorage (same as existing flow)
                localStorage.setItem('umz_cookies', result.cookies);
                localStorage.setItem('umz_regno', cleanUsername);
                localStorage.setItem('umz_password', cleanPassword);
                localStorage.removeItem('umz_is_v04');

                // Persist to backend DB for cross-device access
                try {
                    await saveSession(cleanUsername, result.cookies);
                } catch (saveErr) {
                    console.warn('⚠️  Could not save session to backend:', saveErr.message);
                }

                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
            // Reset the turnstile widget on failure
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
        <div className="min-h-screen flex bg-background relative">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="cursor-pointer absolute top-4 right-4 p-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors z-50"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? (
                    <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>

            {/* Left Side – Image Slider */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="relative w-full h-full">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center space-y-4 p-8 w-full h-full flex flex-col items-center justify-center">
                                    <div className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-border/20 shadow-2xl">
                                        <img src={slide.image} alt="login" className="w-full h-full object-cover rounded-2xl" />
                                    </div>
                                    <p className="text-lg text-foreground/60 font-medium">{slide.id}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Slider Indicators */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`cursor-pointer w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-foreground w-8' : 'bg-foreground/30 hover:bg-foreground/50'}`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Right Side – Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
                <div className="w-full max-w-xl">
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-lg">
                        {/* Card Header */}
                        <div className="flex flex-col space-y-2 p-8 text-center">
                            <img src={logoUmz} className="h-35 w-auto mx-auto object-contain mb-2" alt="UMZ Logo" />
                            <p className="text-sm text-muted-foreground">
                                {isNewLogin2 ? 'Quick Login with Date of Birth' : 'Login to your UMZ Dashboard'}
                            </p>
                            {/* Badge */}
                            <div className="mt-1 flex items-center justify-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    {isNewLogin2 ? 'DOB Entry' : 'Turnstile Login'}
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-8 pt-0 space-y-6">
                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Status (during login) */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in zoom-in duration-300">
                                    <div className="relative flex items-center justify-center">
                                        {/* Background Circle */}
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="transparent"
                                                className="text-muted/10"
                                            />
                                            {/* Progress Circle */}
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="transparent"
                                                strokeDasharray={2 * Math.PI * 40}
                                                strokeDashoffset={2 * Math.PI * 40 * (1 - displayedPercent / 100)}
                                                strokeLinecap="round"
                                                className="text-primary transition-all duration-300 ease-linear"
                                            />
                                        </svg>
                                        <span className="absolute text-xl font-bold text-foreground">
                                            {Math.floor(displayedPercent)}%
                                        </span>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-medium text-foreground tracking-tight">
                                            {progress.status || 'Automating Login...'}
                                        </p>
                                        <p className="text-xs text-muted-foreground animate-pulse">
                                            Please do not close this tab
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Form (Hidden when loading) */}
                            {!loading && (
                                <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {/* Username */}
                                    <div className="space-y-2">
                                        <input
                                            id="nl-username"
                                            type="text"
                                            placeholder="Registration Number"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Password / DOB Selection */}
                                    <div className="space-y-2">
                                        {isNewLogin2 ? (
                                            <div className="relative">
                                                <input
                                                    id="nl-dob"
                                                    type="date"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    disabled={loading}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    id="nl-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    disabled={loading}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showPassword ? (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-end">
                                            <a
                                                href="https://ums.lpu.in/lpuums/forgetpassword.aspx"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Forgot your password?
                                            </a>
                                        </div>
                                    </div>

                                    {/* Cloudflare Turnstile Widget (Hidden on newlogin2) */}
                                    {!isNewLogin2 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-center">
                                                <div ref={turnstileRef} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        id="nl-submit"
                                        type="submit"
                                        disabled={loading}
                                        className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
                                    >
                                        {isNewLogin2 ? 'Enter Dashboard' : 'Login'}
                                    </button>
                                </form>
                            )}

                            {/* Link back to cookie login */}
                            <p className="text-center text-xs text-muted-foreground">
                                Prefer manual cookie entry?{' '}
                                <a href="/cookie" className="text-primary hover:underline">
                                    Session Gateway
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewLogin;
