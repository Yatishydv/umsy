import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cookie as CookieIcon, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Cookie = () => {
    const navigate = useNavigate();
    const [cookie, setCookie] = useState('_ga_B0Z6G6GCD8=');
    const [showGuide, setShowGuide] = useState(false);
    const [guideTab, setGuideTab] = useState('desktop');

    const handleContinue = () => {
        if (!cookie.trim()) return;
        localStorage.setItem('umz_cookies', cookie);
        localStorage.removeItem('umz_is_v04');
        navigate('/dashboard');
    };

    const copyBookmarklet = () => {
        const code = "javascript:(function(){const name='_ga_B0Z6G6GCD8';const cookies=document.cookie.split(';');let found=null;for(let c of cookies){c=c.trim();if(c.startsWith(name+'=')){found=c.split('=')[1];break;}}if(found){const msg='Found: '+found+'\\n\\nCopied to clipboard! If it failed, copy it manually from the box below:';const val=prompt(msg,found);if(val){navigator.clipboard.writeText(found).catch(()=>{});}}else{alert('Cookie \"'+name+'\" not found!');}})();";
        navigator.clipboard.writeText(code);
        alert('Updated Bookmarklet code copied!');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 overflow-hidden relative">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-black/10 space-y-6">
                    
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="p-5 rounded-3xl bg-primary/10 border border-primary/20 animate-bounce-slow">
                                <CookieIcon size={48} className="text-primary" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-background border border-border shadow-lg">
                                <ShieldCheck size={20} className="text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Session Gateway
                        </h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Import your session cookies to securely access the UMZ dashboard.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Paste your cookies here..."
                                className="w-full bg-secondary/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-mono text-sm placeholder:font-sans placeholder:text-muted-foreground/60"
                                value={cookie}
                                onChange={(e) => setCookie(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                            />
                        </div>

                        <button 
                            onClick={handleContinue}
                            disabled={!cookie.trim()}
                            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20 group"
                        >
                            <span>Enter Dashboard</span>
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={() => setShowGuide(!showGuide)}
                            className="text-xs cursor-pointer text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mx-auto"
                        >
                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">?</span>
                            How to find your session cookie?
                        </button>
                        
                        {showGuide && (
                            <div className="mt-4 p-4 rounded-2xl bg-secondary/20 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex p-1 bg-background/50 rounded-xl mb-4 border border-border/50">
                                    <button 
                                        onClick={() => setGuideTab('desktop')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${guideTab === 'desktop' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Desktop
                                    </button>
                                    <button 
                                        onClick={() => setGuideTab('android')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${guideTab === 'android' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Android
                                    </button>
                                </div>

                                {guideTab === 'desktop' ? (
                                    <ol className="text-[11px] text-muted-foreground space-y-2 list-decimal list-inside">
                                        <li>Login to your <span className="text-foreground font-medium">UMS Portal</span></li>
                                        <li>Open DevTools (F12) → <span className="text-foreground font-medium">Application</span></li>
                                        <li>Go to <span className="text-foreground font-medium">Cookies</span> section</li>
                                        <li>Copy the value of <span className="text-primary font-mono font-bold">_ga_B0Z6G6GCD8</span></li>
                                        <li>Avoid values starting with <span className="text-primary font-mono font-bold">GS1.1...</span></li>
                                    </ol>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-foreground uppercase opacity-70">Method 1: Kiwi Browser</p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Use <span className="text-foreground font-medium">Kiwi Browser</span>. Go to Menu → <span className="text-foreground font-medium">Developer Tools</span> to find cookies just like on Desktop.
                                            </p>
                                        </div>
                                        <div className="h-px bg-border/50" />
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-foreground uppercase opacity-70">Method 2: Bookmarklet (Easiest)</p>
                                            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                                                <li>Copy the code below</li>
                                                <li>Create a bookmark named <span className="text-foreground font-medium">"Get Cookie"</span></li>
                                                <li>Paste code into the <span className="text-foreground font-medium">URL</span> field</li>
                                                <li>Go to UMS, type "Get Cookie" in address bar and click it</li>
                                            </ol>
                                            <button 
                                                onClick={copyBookmarklet}
                                                className="mt-2 w-full py-2 bg-background border border-border/50 rounded-lg text-[10px] font-bold hover:bg-secondary/50 transition-all flex items-center justify-center gap-2"
                                            >
                                                Copy Bookmarklet Code
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-bold">
                            UMZ Security Protocol • V3.0
                        </p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
                    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite;
                }
            `}} />
        </div>
    );
};

export default Cookie;
