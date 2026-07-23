import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveSession } from '../services/api';

const CookieCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const rawCookie = searchParams.get('cookie');
        if (rawCookie) {
            const cleanCookie = decodeURIComponent(rawCookie);
            localStorage.setItem('umsy_cookies', cleanCookie);
            
            const regno = localStorage.getItem('umsy_regno');
            if (regno) {
                saveSession(regno, cleanCookie).catch(() => {});
            }

            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 400);
        } else {
            navigate('/login', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white font-sans">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#bef227] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-black tracking-tight">Syncing Session to UMSY...</h2>
                <p className="text-xs text-slate-400">Authenticating session and opening your dashboard...</p>
            </div>
        </div>
    );
};

export default CookieCallback;
