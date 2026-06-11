import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { RefreshCw } from 'lucide-react';
import logoUmz from '../assets/logoUMz.png';
import { startLogin, completeLogin, saveSession, getStudentInfo, healthCheck } from '../services/api';

import loginImg1 from '../assets/login1.jpg'
import loginImg2 from '../assets/login2.jpg'
import loginImg3 from '../assets/login3.jpg'

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState('light');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    // Login flow state
    const [step, setStep] = useState(1); // 1 = regno/password, 2 = captcha
    const [regno, setRegno] = useState('');
    const [password, setPassword] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [captchaImage, setCaptchaImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [serverDown, setServerDown] = useState(false);

    // Slider images (empty placeholders)
    const slides = [
        { id: "Secure Login", image: loginImg1 },
        { id: "Track Your Academic Progress", image: loginImg2 },
        { id: "See Yourself Improving", image: loginImg3 },
    ];
    
    // useEffect(() => {
    //     const checkServerStatus = async () => {
    //         try {
    //             await healthCheck();
    //         } catch (error) {
    //             console.error('🔴 API is offline:', error);
    //             setError('Server is currently offline. Please login to start the server.');
    //             setServerDown(true);
    //         }
    //     };

    //     checkServerStatus();
    // }, []);

    useEffect(() => {
        // Check for saved theme preference or default to 'dark'
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');

        // Session Auto-Recovery: ONLY if 'regno' is provided in the URL query params
        const checkExistingSession = async () => {
            const queryParams = new URLSearchParams(location.search);
            const queryRegno = queryParams.get('regno');
            const queryCookies = queryParams.get('cookies');

            // Helper to clear cache when switching users
            const clearUserCache = () => {
                console.log('🔄 Clearing user cache');
                localStorage.removeItem('umz_student_info');
                localStorage.removeItem('umz_timetable_data');
                localStorage.removeItem('umz_result_data');
                localStorage.removeItem('umz_attendance_summary');
            };

            // NEW: Direct cookie injection (for WebView/Mobile Apps)
            if (queryRegno && queryCookies) {
                try {
                    setLoading(true);
                    setError('Synchronizing mobile session...');
                    
                    const oldRegno = localStorage.getItem('umz_regno');
                    if (oldRegno !== queryRegno) clearUserCache();

                    localStorage.setItem('umz_regno', queryRegno);
                    localStorage.setItem('umz_cookies', queryCookies);
                    
                    // Sync with backend database
                    await saveSession(queryRegno, queryCookies);
                    
                    navigate('/dashboard');
                    return;
                } catch (err) {
                    console.error('Mobile sync failed:', err.message);
                    setError('Mobile sync failed. Please login manually.');
                } finally {
                    setLoading(false);
                }
            }
            
            // Existing logic: If we have ONLY a regno, try recovery from DB
            else if (queryRegno) {
                setRegno(queryRegno);
                try {
                    setLoading(true);
                    setError('Checking active session for ' + queryRegno + '...');
                    
                    const result = await getStudentInfo({ regno: queryRegno });
                    
                    if (result.success) {
                        const oldRegno = localStorage.getItem('umz_regno');
                        if (oldRegno && oldRegno !== queryRegno) clearUserCache();

                        localStorage.setItem('umz_regno', queryRegno);
                        if (result.cookies) {
                            localStorage.setItem('umz_cookies', result.cookies);
                        }
                        navigate('/dashboard');
                        return;
                    }
                } catch (err) {
                    console.log('URL session recovery failed:', err.message);
                    setError('Session recovery failed. Please login manually.');
                } finally {
                    setLoading(false);
                }
            } else {
                // Normal flow: just load saved credentials if available, but don't auto-redirect
                const savedRegno = localStorage.getItem('umz_regno');
                const savedPassword = localStorage.getItem('umz_password');
                if (savedRegno) setRegno(savedRegno);
                if (savedPassword) setPassword(savedPassword);
            }
        };

        checkExistingSession();
    }, [location.search, navigate]);

    useEffect(() => {
        // Auto-rotate slider every 5 seconds
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 7000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    /**
     * Step 1: Submit regno and password to get captcha
     */
    const handleStep1Submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await startLogin(regno, password);
            setSessionId(result.sessionId);
            setCaptchaImage(result.captchaImage);
            setStep(2); // Move to captcha step
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reload captcha - fetch a new captcha image
     */
    const handleReloadCaptcha = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await startLogin(regno, password);
            setSessionId(result.sessionId);
            setCaptchaImage(result.captchaImage);
            setCaptcha(''); // Clear captcha input
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: Submit captcha to complete login
     */
    const handleStep2Submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await completeLogin(sessionId, captcha);
            if (result.success) {
                // Store cookies if needed
                if (result.cookies) {
                    // console.log('🍪 Received cookies from backend:', result.cookies);
                    localStorage.setItem('umz_cookies', result.cookies);

                    // Save session to backend for persistence and cross-device access
                    try {
                        await saveSession(regno, result.cookies);
                    } catch (saveErr) {
                        console.error('⚠️ Failed to save session to backend:', saveErr);
                        // We don't block the user if saving to backend fails, 
                        // as they still have cookies in localStorage
                    }
                }

                // Store credentials for future use
                localStorage.setItem('umz_regno', regno);
                localStorage.setItem('umz_password', password);

                // Navigate to dashboard
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Go back to step 1
     */
    const handleBackToStep1 = () => {
        setStep(1);
        setCaptcha('');
        setCaptchaImage('');
        setSessionId('');
        setError('');
    };

    return (
        <div className="min-h-screen flex bg-background relative">
            {/* Theme Toggle Button */}
            <div className='flex justify-between items-center'>
                {/* {serverDown &&
                    <h2 className="p-4 absolute top-0 left-0 text-center font-bold text-destructive">Server is down please try after some time</h2>
                } */}
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
            </div>

            {/* Left Side - Image Slider */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Slider Container */}
                <div className="relative w-full h-full">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                                }`}
                        >
                            <div className={`w-full h-full bg-gradient-to-br ${slide.color} flex items-center justify-center`}>
                                <div className="text-center space-y-4 p-8">
                                    <div className={`w-full h-full bg-gradient-to-br ${slide.color} flex items-center justify-center`}>
                                        <div className="text-center space-y-4 p-8">
                                            <div className="w-120 h-120 mx-auto rounded-2xl bg-card/10 backdrop-blur-sm border border-border/20 flex items-center justify-center">
                                                <img src={slide.image} alt="login" className='w-full h-full object-cover rounded-2xl' />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-lg text-foreground/60 font-medium">
                                        {slide.id}

                                    </p>
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
                            className={`cursor-pointer w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                ? 'bg-foreground w-8'
                                : 'bg-foreground/30 hover:bg-foreground/50'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
                <div className="w-full max-w-xl">
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-lg">
                        {/* Card Header */}
                        <div className="flex flex-col space-y-2 p-8 text-center">
                            <img src={logoUmz} className="h-35 w-auto mx-auto object-contain mb-2" alt="UMZ Logo" />
                            <p className="text-sm text-muted-foreground">
                                {step === 1 ? 'Login to your UMZ Dashboard' : 'Enter the captcha to continue'}
                            </p>
                        </div>

                        {/* Card Content */}
                        <div className="p-8 pt-0 space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Step 1: Registration Number and Password */}
                            {step === 1 && (
                                <form onSubmit={handleStep1Submit} className="space-y-6">
                                    {/* Registration Number Input */}
                                    <div className="space-y-2">
                                        <input
                                            id="registrationNumber"
                                            type="text"
                                            placeholder="Registration Number"
                                            value={regno}
                                            onChange={(e) => setRegno(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Password Input */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-end">
                                            <a href="https://ums.lpu.in/lpuums/forgetpassword.aspx" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                                Forgot your password?
                                            </a>
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
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
                                    </div>

                                    {/* Next Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
                                    >
                                        {loading ? 'Loading...' : 'Next'}
                                    </button>
                                </form>
                            )}

                            {/* Step 2: Captcha */}
                            {step === 2 && (
                                <form onSubmit={handleStep2Submit} className="space-y-6">
                                    {/* Captcha Image */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Captcha</label>
                                            <button
                                                type="button"
                                                onClick={handleReloadCaptcha}
                                                disabled={loading}
                                                className="cursor-pointer p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Reload captcha"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="flex justify-center p-4 bg-background border border-border rounded-md">
                                            <img
                                                src={captchaImage}
                                                alt="Captcha"
                                                className="max-h-20 object-contain scale-180 rounded-md"
                                            />
                                        </div>
                                    </div>

                                    {/* Captcha Input */}
                                    <div className="space-y-2">
                                        <input
                                            id="captcha"
                                            type="text"
                                            placeholder="Enter captcha"
                                            value={captcha}
                                            onChange={(e) => setCaptcha(e.target.value.toUpperCase())}
                                            required
                                            disabled={loading}
                                            autoComplete="off"
                                            autoFocus
                                            className="inline-flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-lg tracking-wider uppercase"
                                        />
                                        {/* <p className="text-xs text-muted-foreground">
                                            Characters are automatically converted to uppercase
                                        </p> */}
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleBackToStep1}
                                            disabled={loading}
                                            className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 flex-1"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 flex-1"
                                        >
                                            {loading ? 'Logging in...' : 'Login'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Login;
