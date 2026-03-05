"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChatProvider, useChat } from "./ChatContext";
import { ChatSidebar } from "./ChatSidebar";
import { VideoModal } from "./VideoModal";
import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, logout, loading } = useAuth();
  const pathname = usePathname();
  const isChatRoom = pathname !== "/chat";

  const {
    availableUsers,
    onlineUsers,
    unreadUserIds,
    targetUser,
    webrtc,
    messages,
    socket,
    setMessages,
    messageSoundRef,
    ringtoneSoundRef,
    callerRingtoneSoundRef,
    callAcceptedSoundRef,
    callEndedSoundRef,
  } = useChat();
  const router = useRouter();

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center text-zinc-400">
        Loading...
      </div>
    );
  }

  if (profile?.role === "admin" || profile?.role === "superadmin") {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
        <Shield className="w-16 h-16 text-red-500/50 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Chat Disabled</h1>
        <p className="max-w-md text-zinc-500">
          Administrators cannot participate in messaging.
        </p>
        <button
          onClick={() =>
            router.push(
              profile?.role === "superadmin" ? "/superadmin" : "/admin",
            )
          }
          className="mt-8 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full bg-zinc-950 flex flex-col md:flex-row overflow-hidden overscroll-none">
      {webrtc.callState !== "idle" && (
        <VideoModal
          webrtc={webrtc}
          ephemeralMessages={messages.filter((m) => m.isEphemeral)}
          currentUserId={user?.id}
          targetUserId={targetUser?.id}
          socket={socket}
          onLocalSend={(msg) => setMessages((prev) => [...prev, msg])}
        />
      )}

      {/* On mobile: show sidebar when not in a room, hide when chatting */}
      <div
        className={`${isChatRoom ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-col h-full`}
      >
        <ChatSidebar
          availableUsers={availableUsers}
          onlineUsers={onlineUsers}
          unreadUserIds={unreadUserIds}
          targetUser={targetUser}
          setTargetUser={(u) => {
            router.push(`/chat/${u.id}`);
          }}
          user={user}
          logout={logout}
          router={router}
        />
      </div>

      {/* Main chat window container */}
      <div
        className={`${isChatRoom ? "flex" : "hidden md:flex"} flex-1 flex-col h-full`}
      >
        {children}
      </div>

      <audio ref={messageSoundRef} src="/sounds/message.mp3" preload="auto" />
      <audio
        ref={ringtoneSoundRef}
        src="/sounds/ringtone.mp3"
        loop
        preload="auto"
      />
      <audio
        ref={callerRingtoneSoundRef}
        src="/sounds/caller-ringtone.mp3"
        loop
        preload="auto"
      />
      <audio
        ref={callAcceptedSoundRef}
        src="/sounds/call-accepted.mp3"
        preload="auto"
      />
      <audio
        ref={callEndedSoundRef}
        src="/sounds/call-ended.mp3"
        preload="auto"
      />
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </ChatProvider>
  );
}
