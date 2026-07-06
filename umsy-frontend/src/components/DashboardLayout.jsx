import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bot, Sparkles, X } from 'lucide-react';
import Sidebar from './Sidebar';
import HeaderNav from './HeaderNav';
import AiBuddy from './AiBuddy';

const DashboardLayout = () => {
    const location = useLocation();
    const [isAiOpen, setIsAiOpen] = useState(false);

    // Draggable position state
    const [position, setPosition] = useState({ x: window.innerWidth - 90, y: window.innerHeight - 90 });
    const positionRef = useRef(position);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    // Keep floating button in bounds on resize
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => {
                const next = {
                    x: Math.max(20, Math.min(window.innerWidth - 68, prev.x)),
                    y: Math.max(20, Math.min(window.innerHeight - 68, prev.y))
                };
                positionRef.current = next;
                return next;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mouse handlers for dragging
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
        hasDragged.current = false;
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;

        const clampedX = Math.max(20, Math.min(window.innerWidth - 68, newX));
        const clampedY = Math.max(20, Math.min(window.innerHeight - 68, newY));

        const next = { x: clampedX, y: clampedY };
        positionRef.current = next;
        setPosition(next);
        hasDragged.current = true;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        const btnSize = 48; // w-12 is 48px
        const padding = 20;

        const corners = [
            { x: padding, y: padding },
            { x: w - btnSize - padding, y: padding },
            { x: padding, y: h - btnSize - padding },
            { x: w - btnSize - padding, y: h - btnSize - padding }
        ];

        let closest = corners[0];
        let minDist = Infinity;

        corners.forEach(c => {
            const dist = Math.hypot(positionRef.current.x - c.x, positionRef.current.y - c.y);
            if (dist < minDist) {
                minDist = dist;
                closest = c;
            }
        });

        positionRef.current = closest;
        setPosition(closest);
    };

    // Touch handlers for mobile dragging
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setIsDragging(true);
        dragStart.current = { x: touch.clientX - positionRef.current.x, y: touch.clientY - positionRef.current.y };
        hasDragged.current = false;
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.current.x;
        const newY = touch.clientY - dragStart.current.y;

        const clampedX = Math.max(20, Math.min(window.innerWidth - 68, newX));
        const clampedY = Math.max(20, Math.min(window.innerHeight - 68, newY));

        const next = { x: clampedX, y: clampedY };
        positionRef.current = next;
        setPosition(next);
        hasDragged.current = true;
    };

    // Bind document mouse events while dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    const handleButtonClick = (e) => {
        if (hasDragged.current) {
            // It was a drag, don't open modal
            return;
        }
        setIsAiOpen(true);
    };

    // Map URL path to activeTab string
    const getActiveTab = (pathname) => {
        if (pathname.includes('/dashboard')) return 'dashboard';
        if (pathname.includes('/attendance')) return 'attendance';
        if (pathname.includes('/grades') || pathname.includes('/marks')) return 'grades';
        if (pathname.includes('/time-table')) return 'timetable';
        if (pathname.includes('/cgpa')) return 'cgpa';
        if (pathname.includes('/ranking')) return 'ranking';
        if (pathname.includes('/courses')) return 'courses';
        return 'dashboard';
    };

    const activeTab = getActiveTab(location.pathname);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 font-plus-jakarta relative">
            {/* Persistent Sidebar for mobile layout (hidden on desktop lg:hidden) */}
            <Sidebar />

            <main className="flex-1 min-h-screen lg:p-0">
                {/* DESKTOP LAYOUT */}
                <div className="hidden lg:flex flex-col min-h-screen bg-[#f8fafc] dark:bg-zinc-900 w-full">
                    <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 transition-colors duration-500 min-h-screen relative">
                        {/* Persistent Navbar header - Sticky at top of the window */}
                        <div className="sticky top-0 bg-[#f8fafc] dark:bg-zinc-900 z-50 pt-6 lg:pt-8 pb-2">
                            <HeaderNav activeTab={activeTab} />
                        </div>
                        
                        {/* Subpage content injection slot */}
                        <div className="flex-1 pb-12">
                            <Outlet />
                        </div>
                    </div>
                </div>

                {/* MOBILE VIEW LAYOUT */}
                <div className="lg:hidden flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 relative">
                    {/* Sticky Mobile Nav */}
                    <div className="sticky top-0 bg-gray-50 dark:bg-zinc-950 z-50 pt-2 pb-2">
                        <HeaderNav activeTab={activeTab} />
                    </div>
                    <div className="flex-1 mt-4 pb-28">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* DRAGGABLE FLOATING AI BUDDY FAB BUTTON */}
            <button
                type="button"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onClick={handleButtonClick}
                style={{
                    position: 'fixed',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    zIndex: 9999,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.19, 1, 0.22, 1)'
                }}
                className="w-12 h-12 bg-[#bef227] hover:bg-[#a6d81d] text-[#1c312e] rounded-full flex items-center justify-center shadow-2xl border border-white/10 active:scale-95 transition-all duration-150 group font-black text-xs uppercase tracking-widest"
            >
                AI
            </button>

            {/* AI BUDDY FLOATING MODAL */}
            {isAiOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-3xl w-full max-w-3xl h-[650px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in duration-200 p-6">
                        {/* Close button */}
                        <button
                            onClick={() => setIsAiOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-90 z-[10001]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <AiBuddy />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
