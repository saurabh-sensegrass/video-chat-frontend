"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Video,
  Shield,
  Users,
  Monitor,
  Mic,
  Lock,
  Download,
  ArrowRight,
  Sparkles,
  MessageSquare,
  LogOut,
  Bell,
  Camera,
  CheckCircle2,
} from "lucide-react";

/**
 * Request common PWA permissions (notification, camera, mic).
 * Only triggers when running in standalone (installed) mode.
 */
function requestAppPermissions() {
  // Notifications
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Camera + Mic — requesting getUserMedia triggers the browser prompt
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Immediately stop tracks — we just needed the permission grant
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch(() => {
        // User denied or device unavailable — that's fine
      });
  }

  // Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { timeout: 5000 },
    );
  }
}

type PermissionStatus = "granted" | "denied" | "prompt" | "unknown";

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const isLoggedIn = !!user;

  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  // Permission statuses
  const [notifPerm, setNotifPerm] = useState<PermissionStatus>("unknown");
  const [cameraPerm, setCameraPerm] = useState<PermissionStatus>("unknown");
  const [micPerm, setMicPerm] = useState<PermissionStatus>("unknown");

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    if (isStandalone) {
      setTimeout(() => setIsInstalled(true), 0);
    }

    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Check and update permission statuses
  useEffect(() => {
    const checkPermissions = async () => {
      // Notification
      if ("Notification" in window) {
        setNotifPerm(Notification.permission as PermissionStatus);
      }

      // Camera & Mic via Permissions API
      if (navigator.permissions) {
        try {
          const cam = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          setCameraPerm(cam.state as PermissionStatus);
          cam.addEventListener("change", () =>
            setCameraPerm(cam.state as PermissionStatus),
          );
        } catch {
          // Permissions API not supported for camera on this browser
        }

        try {
          const mic = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setMicPerm(mic.state as PermissionStatus);
          mic.addEventListener("change", () =>
            setMicPerm(mic.state as PermissionStatus),
          );
        } catch {
          // Permissions API not supported for microphone on this browser
        }
      }
    };

    checkPermissions();
  }, [permissionsRequested]);

  // Auto-request permissions when in standalone (installed) mode
  useEffect(() => {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    if (isStandalone && !permissionsRequested) {
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        requestAppPermissions();
        setPermissionsRequested(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [permissionsRequested]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    const promptEvent = installPrompt as Event & {
      prompt: () => void;
      userChoice: Promise<{ outcome: string }>;
    };
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  const handleRequestPermissions = () => {
    requestAppPermissions();
    setPermissionsRequested(true);
  };

  const features = [
    {
      icon: Video,
      title: "1-to-1 Video Calls",
      description:
        "Crystal-clear private video calls with real-time WebRTC streaming.",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      icon: Monitor,
      title: "Screen Sharing",
      description:
        "Share your screen during calls for presentations and collaboration.",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      icon: Shield,
      title: "Host Controls",
      description:
        "Mute, disable camera, manage permissions, and kick participants.",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Mic,
      title: "Real-time Status",
      description:
        "See your partner's mic and camera status live on the video feed.",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Users,
      title: "Guest Rooms",
      description:
        "Create instant video rooms — no sign-up required for guests.",
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      icon: Lock,
      title: "Encrypted Chat",
      description:
        "Authenticated users get end-to-end encrypted messaging and video.",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  const getPermIcon = (status: PermissionStatus) => {
    if (status === "granted")
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (status === "denied")
      return (
        <span className="w-3.5 h-3.5 text-red-400 text-xs font-bold">✕</span>
      );
    return (
      <span className="w-3.5 h-3.5 text-zinc-500 text-xs font-bold">?</span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              VideoChat
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/chat"
                  className="px-3 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 sm:gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Open Chat</span>
                  <span className="inline sm:hidden">Chat</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/join-room"
                  className="px-3 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Guest Video Room</span>
                  <span className="inline sm:hidden">Guest Room</span>
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-medium text-indigo-300 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Private &amp; Secure Video Calling
          </div>

          {isLoggedIn && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-300 mb-6 ml-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Signed in as {user?.email?.split("@")[0]}
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Video calls made{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              simple &amp; private
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create instant video rooms for guests or sign in for encrypted chat
            and video. No downloads required — works right in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/join-room"
              className="group flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-500/30 hover:scale-[1.02]"
            >
              <Users className="w-5 h-5" />
              Guest Video Room
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {isLoggedIn ? (
              <Link
                href="/chat"
                className="flex items-center gap-2 px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl transition-all border border-zinc-700/50 hover:border-zinc-600/50"
              >
                <MessageSquare className="w-5 h-5" />
                Open Chat
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl transition-all border border-zinc-700/50 hover:border-zinc-600/50"
              >
                <Lock className="w-5 h-5" />
                Sign In to Chat
              </Link>
            )}

            {installPrompt && !isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold rounded-2xl transition-all border border-emerald-500/30 hover:border-emerald-500/50"
              >
                <Download className="w-5 h-5" />
                Download App
              </button>
            )}

            {isInstalled && (
              <div className="flex items-center gap-2 px-6 py-3 text-sm text-emerald-400 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Download className="w-4 h-4" />
                App Installed
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Permissions Card — shown in installed app mode */}
      {isInstalled && (
        <section className="max-w-6xl mx-auto px-6 pb-8 w-full">
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  App Permissions
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Grant permissions for the best experience.
                </p>
              </div>
              <button
                onClick={handleRequestPermissions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Request All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-zinc-300 flex-1">
                  Notifications
                </span>
                {getPermIcon(notifPerm)}
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="text-sm text-zinc-300 flex-1">Camera</span>
                {getPermIcon(cameraPerm)}
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <Mic className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-300 flex-1">Microphone</span>
                {getPermIcon(micPerm)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Everything you need
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto">
            A modern video chat platform packed with features for seamless
            communication.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 bg-zinc-900/80 border border-zinc-800/50 rounded-2xl hover:border-zinc-700/50 transition-all hover:shadow-xl hover:shadow-zinc-950/50"
            >
              <div
                className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 sm:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              href="/join-room"
              className="group flex flex-col items-center text-center p-6 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
            >
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-1">Guest Video Room</h3>
              <p className="text-xs text-zinc-500">
                No account needed. Create or join a room instantly.
              </p>
            </Link>

            {isLoggedIn ? (
              <Link
                href="/chat"
                className="group flex flex-col items-center text-center p-6 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
              >
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="font-semibold mb-1">Open Chat</h3>
                <p className="text-xs text-zinc-500">
                  Jump straight to your encrypted chat &amp; video.
                </p>
              </Link>
            ) : (
              <Link
                href="/login"
                className="group flex flex-col items-center text-center p-6 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
              >
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-1">Sign In</h3>
                <p className="text-xs text-zinc-500">
                  Access encrypted chat and authenticated video calls.
                </p>
              </Link>
            )}

            <Link
              href={isLoggedIn ? "/chat" : "/join-room"}
              className="group flex flex-col items-center text-center p-6 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
            >
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">
                {isLoggedIn ? "Start Video Call" : "Quick Call"}
              </h3>
              <p className="text-xs text-zinc-500">
                {isLoggedIn
                  ? "Call your chat partner directly."
                  : "Jump into a video room — no sign-up needed."}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium">VideoChat</span>
          </div>
          <p>Private &amp; secure video calling platform.</p>
        </div>
      </footer>
    </div>
  );
}
