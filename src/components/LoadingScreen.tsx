"use client";

import { useEffect, useState } from "react";
import { Video } from "lucide-react";

/**
 * A premium loading/splash screen shown while the app initialises.
 * Intended mainly for the PWA (standalone) mode, but works everywhere.
 */
export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        // Accelerate near the end
        const increment = prev < 70 ? 8 : prev < 90 ? 4 : 2;
        return Math.min(prev + increment, 100);
      });
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center gap-8 select-none">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse">
          <Video className="w-10 h-10 text-white" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Comm<span className="text-indigo-400">Sphere</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Secure Video Chat</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-48">
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600 text-center mt-2">
          {progress < 100 ? "Loading..." : "Ready"}
        </p>
      </div>
    </div>
  );
}
