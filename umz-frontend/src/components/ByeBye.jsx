import React from 'react';
import { ShieldAlert, Heart } from 'lucide-react';

const ByeBye = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        <div className="flex justify-center">
          <div className="p-4 rounded-3xl bg-secondary/50 backdrop-blur-sm border border-border/50 shadow-xl shadow-black/5 animate-bounce-slow">
            <ShieldAlert size={64} className="text-primary" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
            Farewell.
          </h1>
          <p className="text-xl md:text-2xl font-medium text-muted-foreground leading-relaxed">
            This website is <span className="text-foreground">permanently shut down</span>.
          </p>
        </div>
        
        <div className="h-px w-24 bg-border mx-auto" />
        
        <div className="flex items-center justify-center space-x-2 text-muted-foreground font-semibold">
          <span>Thank you for being with us</span>
          <Heart size={20} className="text-destructive fill-destructive animate-pulse" />
        </div>
        
        <div className="pt-8">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em] font-bold">
            Project UMZ • End of Service
          </p>
        </div>
      </div>
      
      {/* Visual restriction: Prevent interactions and scrolling */}
      <style dangerouslySetInnerHTML={{ __html: `
        body { 
          overflow: hidden !important; 
          user-select: none !important;
          pointer-events: none !important;
        }
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

export default ByeBye;
