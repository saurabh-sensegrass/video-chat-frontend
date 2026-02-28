"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  ArrowRight,
  Link as LinkIcon,
  Users,
  Shield,
} from "lucide-react";

export default function JoinVideoPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = () => {
    setIsCreating(true);
    // Generate a simple room ID
    const roomId =
      crypto.randomUUID().split("-")[0] +
      "-" +
      crypto.randomUUID().split("-")[1];
    router.push(`/join-video/${roomId}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden relative selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="mb-10 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full pb-2"></div>
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-indigo-400/20 relative z-10 transform transition-transform hover:scale-105 duration-300">
                <Video className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Instant Video Calls
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Create a secure, private room instantly. No account required. Share
            the link and connect face-to-face in seconds.
          </p>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <button
              onClick={createRoom}
              disabled={isCreating}
              className="relative z-10 w-full group flex items-center justify-center gap-3 px-8 py-5 sm:py-6 bg-zinc-100 hover:bg-white disabled:bg-zinc-300 disabled:cursor-not-allowed text-zinc-900 font-bold text-lg rounded-2xl transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-1"
            >
              <Video className="w-6 h-6" />
              <span>{isCreating ? "Creating Room..." : "Create New Room"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-3 text-indigo-400 border border-zinc-700/50">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  Encrypted
                </h3>
                <p className="text-xs text-zinc-500">
                  Secure WebRTC peer-to-peer connection
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-3 text-purple-400 border border-zinc-700/50">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  1-on-1
                </h3>
                <p className="text-xs text-zinc-500">
                  Exclusive rooms limited to 2 participants
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-3 text-blue-400 border border-zinc-700/50">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  Shareable
                </h3>
                <p className="text-xs text-zinc-500">
                  Instant access via simple URL link
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-6 text-center text-zinc-600 text-sm">
        <p>Powered by WebRTC & Socket.io</p>
      </div>
    </div>
  );
}
