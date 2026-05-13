import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Globe } from 'lucide-react';

const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState(() => localStorage.getItem('umz_last_search_url') || '');
    const inputRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('umz_last_search_url', url);
    }, [url]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        let finalUrl = url.trim();
        
        // Check if it's a valid URL or IP address
        // If it doesn't start with http:// or https://, prepend http://
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'http://' + finalUrl;
        }

        try {
            window.location.href = finalUrl;
        } catch (error) {
            console.error('Invalid URL:', error);
        }
    };

    return (
        <div className="lg:hidden">
            {/* Mini Search Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 left-4 z-[60] w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 active:scale-95 transition-all duration-300"
                aria-label="Open Search"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Search Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Search Bar Container */}
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in slide-in-from-top-8 duration-500">
                        <form onSubmit={handleSearch} className="p-4">
                            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-gray-950 transition-all duration-300">
                                <Globe className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Enter URL or IP (e.g. 10.234.7.190:5173)"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-500 text-sm"
                                />
                                {url && (
                                    <button 
                                        type="button" 
                                        onClick={() => setUrl('')}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium px-1">
                                    Quickly navigate to any local or web address
                                </p>
                                <button
                                    type="submit"
                                    disabled={!url.trim()}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Go <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
