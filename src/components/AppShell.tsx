"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { subscribeToPush } from "@/lib/notifications";
import PullToRefresh from "@/components/PullToRefresh";

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
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      // Show splash screen for PWA mode
      const timer = setTimeout(() => setIsReady(true), 1800);
      return () => clearTimeout(timer);
    } else {
      // Browser mode: skip splash
      setTimeout(() => setIsReady(true), 0);
    }
  }, []);

  const { user } = useAuth();

  useEffect(() => {
    const token =
      user?.token || (user as { accessToken?: string })?.accessToken;
    if (
      token &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // Try subscribing to push notifications once logged in
      subscribeToPush(token).catch(console.error);
    }
  }, [user]);

  const handleRefresh = async () => {
    // Wait a brief moment for the animation, then reload the page
    // This provides a "native" feel where pulling down refreshes the entire app state
    await new Promise((resolve) => setTimeout(resolve, 800));
    window.location.reload();
  };

  if (!isReady) {
    return <LoadingScreen />;
  }

  return <PullToRefresh onRefresh={handleRefresh}>{children}</PullToRefresh>;
}
