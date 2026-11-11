import React, { useEffect, useState } from 'react';

export const InitialOpenSplash: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(true);
  const [fading, setFading] = useState<boolean>(false);

  useEffect(() => {
    // Only show once per session for a seamless experience
    const hasSeen = sessionStorage.getItem('dhanvantri_splash_seen');
    if (hasSeen) {
      setVisible(false);
      return;
    }

    // Mark as seen immediately
    sessionStorage.setItem('dhanvantri_splash_seen', 'true');

    // Begin fade out after 700ms
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 700);

    // Completely unmount after 1050ms
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 1050);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background pointer-events-none transition-opacity duration-300 ease-out ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4 text-center p-6 animate-scale-in">
        <div className="relative">
          <img
            src="/clinic-icon.svg"
            alt="Dhanvantri Clinic Logo"
            className="w-24 h-24 rounded-full shadow-2xl animate-float-gentle"
          />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping pointer-events-none" />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Dhanvantri Clinic
          </h1>
          <p className="text-sm font-semibold text-primary mt-1">
            Dr Yogesh • BTM Layout, Bengaluru
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mt-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Digital Queue System</span>
        </div>
      </div>
    </div>
  );
};
