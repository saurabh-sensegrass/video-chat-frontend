"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";

/**
 * Client wrapper that shows a loading/splash screen while the app hydrates.
 * In standalone (PWA) mode, it shows for a noticeable duration.
 * In browser mode, it resolves immediately.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Register Service Worker for Native Notifications
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      // Show splash screen for PWA mode
      const timer = setTimeout(() => setIsReady(true), 1800);
      return () => clearTimeout(timer);
    } else {
      // Browser mode: skip splash
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
