import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoUmz from '../assets/logoUMz.png';
import loginImg1 from '../assets/login1.jpg';
import loginImg2 from '../assets/login2.jpg';
import loginImg3 from '../assets/login3.jpg';
import { tokenLoginV04, saveSession, getStudentInfoV04, getResultV04, getMarksV04, getCourses, getAttendanceDetails, getTimeTable, getMessagesV04 } from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const UmzV04Login = () => {
    const navigate = useNavigate();

    // ── UI state ───────────────────────────────────────────────────────────
    const [theme, setTheme] = useState('dark');
    const [currentSlide, setCurrentSlide] = useState(0);

    // ── Form state ─────────────────────────────────────────────────────────
    const [regno, setRegno] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [progress, setProgress] = useState(0);

    const slides = [
        { id: 'Instant Login', image: loginImg1 },
        { id: 'Track Your Academic Progress', image: loginImg2 },
        { id: 'See Yourself Improving', image: loginImg3 },
    ];

    // ── Theme init ─────────────────────────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');

        // Pre-fill saved regno
        const savedRegno = localStorage.getItem('umz_regno');
        if (savedRegno) setRegno(savedRegno);
    }, []);

    // ── Slide auto-rotate ──────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 7000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // ── Theme toggle ───────────────────────────────────────────────────────
    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setProgress(0);

        const cleanRegno = regno.trim();
        const cleanPassword = password.trim();

        if (!cleanRegno || !cleanPassword) {
            setError('Please enter both your registration number and password.');
            return;
        }

        setLoading(true);
        setStatusMsg('Verifying credentials...');

        // Smooth start progress interval up to 20%
        const startProgressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 1, 20));
        }, 120);

        try {
            const result = await tokenLoginV04(cleanRegno, cleanPassword);
            clearInterval(startProgressInterval);
            setProgress(20);

            if (result.success && result.cookies) {
                setStatusMsg('Setting up your session...');

                // Store cookies in localStorage (same as existing login flows)
                localStorage.setItem('umz_cookies', result.cookies);
                localStorage.setItem('umz_regno', cleanRegno);
                localStorage.setItem('umz_is_v04', 'true');

                // Clear any stale cached data from a different student
                const cachedInfo = localStorage.getItem('umz_student_info');
                if (cachedInfo) {
                    try {
                        const parsed = JSON.parse(cachedInfo);
                        if (parsed.Registrationnumber && parsed.Registrationnumber !== cleanRegno) {
                            localStorage.removeItem('umz_student_info');
                            localStorage.removeItem('umz_timetable_data');
                            localStorage.removeItem('umz_ranking_data');
                            localStorage.removeItem('umz_result_data');
                            localStorage.removeItem('umz_marks_data');
                            localStorage.removeItem('umz_courses_data');
                            localStorage.removeItem('umz_attendance_data');
                        }
                    } catch { }
                }

                // Persist to backend DB
                try {
                    await saveSession(cleanRegno, result.cookies);
                } catch (saveErr) {
                    console.warn('⚠️ Could not save session to backend:', saveErr.message);
                }

                // Fetch student basic profile (includes messages on backend) and result (for grades) in parallel!
                setStatusMsg('Syncing academic profile & notifications...');
                setProgress(40);

                try {
                    const [infoRes, resultRes] = await Promise.allSettled([
                        getStudentInfoV04(result.cookies),
                        getResultV04(result.cookies)
                    ]);

                    setProgress(80);

                    // 1. Process Profile Info (contains basic info and messages)
                    let studentInfo = {};
                    if (infoRes.status === 'fulfilled' && infoRes.value?.data) {
                        studentInfo = infoRes.value.data;
                    } else if (infoRes.status === 'rejected') {
                        console.warn('⚠️ Profile fetch failed:', infoRes.reason?.message);
                    }

                    // Store student info in localStorage (messages are already inside this object)
                    localStorage.setItem('umz_student_info', JSON.stringify(studentInfo));

                    // 2. Process Result (for CGPA/reappear grades)
                    if (resultRes.status === 'fulfilled' && resultRes.value?.data) {
                        localStorage.setItem('umz_result_data', JSON.stringify(resultRes.value.data));
                        
                        // Also update CGPA in studentInfo if retrieved from result
                        if (resultRes.value.data.cgpa && !studentInfo.CGPA) {
                            studentInfo.CGPA = resultRes.value.data.cgpa;
                            localStorage.setItem('umz_student_info', JSON.stringify(studentInfo));
                        }
                    } else if (resultRes.status === 'rejected') {
                        console.warn('⚠️ Result fetch failed:', resultRes.reason?.message);
                    }

                } catch (fetchErr) {
                    console.warn('⚠️ Parallel fetch on login failed:', fetchErr.message);
                }

                setProgress(100);
                navigate('/dashboard');
            }
        } catch (err) {
            clearInterval(startProgressInterval);
            setError(err.message || 'Login failed. Please try again.');
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
                                Quick Login with Registration Number
                            </p>
                            {/* Badge */}
                            <div className="mt-1 flex items-center justify-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Instant Access • V04
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-8 pt-0 space-y-6">
                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center space-y-6 py-8 animate-in fade-in zoom-in duration-300">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                className="stroke-muted/20"
                                                strokeWidth="6"
                                                fill="transparent"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                className="stroke-primary transition-all duration-300 ease-out"
                                                strokeWidth="6"
                                                fill="transparent"
                                                strokeDasharray={251.2}
                                                strokeDashoffset={251.2 - (251.2 * progress) / 100}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-black text-foreground">
                                                {progress}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-bold text-foreground tracking-tight">
                                            {statusMsg || 'Connecting...'}
                                        </p>
                                        <p className="text-xs text-muted-foreground animate-pulse">
                                            Please wait while we sync your data
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Form (Hidden when loading) */}
                            {!loading && (
                                <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {/* Registration Number */}
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="v04-regno"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Registration Number"
                                                value={regno}
                                                onChange={(e) => setRegno(e.target.value)}
                                                required
                                                className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                id="v04-password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="cursor-pointer absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        id="v04-submit"
                                        type="submit"
                                        disabled={loading || !regno.trim() || !password.trim()}
                                        className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full group"
                                    >
                                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Enter Dashboard
                                    </button>
                                </form>
                            )}


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UmzV04Login;
