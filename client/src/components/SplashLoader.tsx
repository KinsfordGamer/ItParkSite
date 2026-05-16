import React, { useEffect, useState } from 'react';

const SplashLoader: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onFinish, 600);
          }, 300);
          return 100;
        }
        // Accelerate towards end
        const increment = prev < 70 ? Math.random() * 8 + 4 : Math.random() * 3 + 1;
        return Math.min(prev + increment, 100);
      });
    }, 80);
    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0f172a 100%)',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
            top: '-100px',
            left: '-100px',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            bottom: '-80px',
            right: '-80px',
            animation: 'pulse 4s ease-in-out infinite 2s',
          }}
        />
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-indigo-400"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
              animation: `float ${Math.random() * 10 + 15}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo with glowing ring */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #6366f1)',
              animation: 'spin 3s linear infinite',
              padding: '3px',
              borderRadius: '50%',
              width: '130px',
              height: '130px',
              top: '-5px',
              left: '-5px',
            }}
          />
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-50"
            style={{
              background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #6366f1)',
              animation: 'spin 3s linear infinite',
              padding: '3px',
              borderRadius: '50%',
              width: '130px',
              height: '130px',
              top: '-5px',
              left: '-5px',
            }}
          />
          {/* Logo container */}
          <div
            className="relative w-28 h-28 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4), inset 0 0 20px rgba(255,255,255,0.05)' }}
          >
            <img
              src="/Logo.jpg"
              alt="IT Park Surxondaryo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-3xl font-black uppercase tracking-[0.2em] text-white leading-tight"
            style={{ textShadow: '0 0 30px rgba(99,102,241,0.8)' }}
          >
            IT Park Surxondaryo
          </h1>
          <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em] mt-2 opacity-80">
            CRM Premium Platform
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
                boxShadow: '0 0 10px #6366f1',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
              Yuklanmoqda...
            </p>
            <p className="text-indigo-400 text-[10px] font-black tabular-nums">
              {Math.round(progress)}%
            </p>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
              style={{
                animation: 'bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(15px); }
          66% { transform: translateY(15px) translateX(-10px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashLoader;
