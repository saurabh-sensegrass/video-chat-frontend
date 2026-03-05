"use client";

import React, { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Message, UserProfile } from "./types";
import { CallType } from "@/hooks/useWebRTC";
import {
  Send,
  Smile,
  Phone,
  Video,
  Shield,
  Check,
  CheckCheck,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

/**
 * Formats a lastSeen date string into a human-readable relative format.
 * - Today: "Today 04:10 PM"
 * - Yesterday: "Yesterday 04:10 PM"
 * - 2-3 days ago: Day name, e.g. "Monday 04:10 PM"
 * - Older: "02 March 2026 at 04:10 PM"
 */
function formatLastSeen(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();

  // Strip time to compare calendar dates
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    return `Today ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday ${timeStr}`;
  }
  if (diffDays >= 2 && diffDays <= 3) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return `${dayName} ${timeStr}`;
  }

  // Older than 3 days: "02 March 2026 at 04:10 PM"
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year} at ${timeStr}`;
}

interface ChatWindowProps {
  messages: Message[];
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  targetUser: UserProfile | null;
  user: any;
  onlineUsers: string[];
  remoteTyping: boolean;
  initiateCall: (id: string, callType: CallType) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onEmojiClick: (emojiData: any) => void;
  onBack: () => void;
}

export function ChatWindow({
  messages,
  inputMsg,
  setInputMsg,
  sendMessage,
  targetUser,
  user,
  onlineUsers,
  remoteTyping,
  initiateCall,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  messagesEndRef,
  onEmojiClick,
  onBack,
}: ChatWindowProps) {
  const isOnline = targetUser && onlineUsers.includes(targetUser.id);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const callMenuRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  React.useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, emojiPickerRef, setShowEmojiPicker]);

  // Close call menu on outside click
  useEffect(() => {
    if (!showCallMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        callMenuRef.current &&
        !callMenuRef.current.contains(event.target as Node)
      ) {
        setShowCallMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCallMenu]);

  const handleCallOption = (callType: CallType) => {
    if (!isOnline || !targetUser) return;
    setShowCallMenu(false);
    initiateCall(targetUser.id, callType);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/20">
      {targetUser ? (
        <>
          {/* Top Bar */}
          <div className="h-20 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Back button — visible on small screens only */}
              <button
                onClick={onBack}
                className="md:hidden p-2 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                title="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative">
                <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700/50">
                  <span className="text-lg font-bold text-zinc-400 uppercase">
                    {targetUser.email[0]}
                  </span>
                </div>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-100 truncate text-[15px]">
                  {targetUser.email.split("@")[0]}
                </h3>
                <div className="flex items-center gap-1.5 leading-none">
                  {isOnline ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-500/80 font-medium">
                        Active now
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 font-medium italic">
                      {targetUser.lastSeen
                        ? `Last seen ${formatLastSeen(targetUser.lastSeen)}`
                        : "Offline"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/10">
                  <Shield className="w-3 h-3" />
                  E2EE Active
                </div>
              </div>
              <div className="relative" ref={callMenuRef}>
                <button
                  onClick={() => isOnline && setShowCallMenu((prev) => !prev)}
                  disabled={!isOnline}
                  className={`group w-11 h-11 text-white rounded-xl flex items-center justify-center transition-all border ${
                    isOnline
                      ? "bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 border-indigo-400/20"
                      : "bg-zinc-700 border-zinc-600/30 cursor-not-allowed opacity-50"
                  }`}
                  title={isOnline ? "Start Call" : "User is offline"}
                >
                  <Phone className="w-5 h-5" />
                  {isOnline && (
                    <ChevronDown className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-indigo-300" />
                  )}
                </button>

                {showCallMenu && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.7)] overflow-hidden z-[100] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => handleCallOption("video")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Video Call
                    </button>
                    <div className="h-px bg-zinc-800 mx-2" />
                    <button
                      onClick={() => handleCallOption("audio")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-green-600/20 hover:text-green-300 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Audio Call
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Shield className="w-12 h-12 mb-4 text-indigo-500" />
                <p className="text-zinc-200 font-bold mb-1">
                  Secure Chat Initialized
                </p>
                <p className="text-xs text-zinc-500 max-w-[200px]">
                  Messages are end-to-end encrypted and visible only to you and{" "}
                  {targetUser.email.split("@")[0]}.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender_id === user?.id;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameSender = prevMsg?.sender_id === msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isSameSender ? "-mt-4" : ""}`}
                  >
                    {!isSameSender && (
                      <span className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-widest mb-1.5 ml-1 mr-1">
                        {isMe ? "You" : targetUser.email.split("@")[0]}
                      </span>
                    )}
                    <div className="relative group max-w-[85%] sm:max-w-[70%] lg:max-w-md">
                      <div
                        className={`px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed shadow-sm transition-all ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-none border border-indigo-500/20 shadow-indigo-900/10"
                            : "bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50 shadow-black/10"
                        } ${msg.isEphemeral ? "border-dashed border-indigo-400" : ""}`}
                      >
                        {msg.message}
                      </div>

                      <div
                        className={`mt-1 flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <span className="text-[10px] font-bold text-zinc-600">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMe && (
                          <div className="flex">
                            {msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-zinc-600" />
                            )}
                          </div>
                        )}
                        {msg.isEphemeral && (
                          <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/20 font-black uppercase">
                            Burned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {remoteTyping && (
              <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-left-2">
                <div className="bg-zinc-800/50 px-3 py-2 rounded-2xl rounded-tl-none border border-zinc-700/30">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 sm:p-6 bg-zinc-900/40 backdrop-blur-md border-t border-zinc-800/50">
            <form onSubmit={sendMessage} className="relative max-w-5xl mx-auto">
              <div className="relative flex items-center bg-zinc-950/80 border border-zinc-800 rounded-2xl transition-all focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-2xl pl-2 pr-2 py-2">
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-50">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={"dark" as any}
                        autoFocusSearch={false}
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type an encrypted message..."
                  className="flex-1 bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 px-3 py-2 text-sm sm:text-base focus:ring-0 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={!inputMsg.trim()}
                  className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl flex items-center justify-center transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center opacity-50 p-6">
          <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 border border-zinc-700/50 shadow-2xl">
            <Shield className="w-10 h-10 text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-200 mb-2">
            Pick a secure contact
          </h2>
          <p className="text-zinc-500 text-center max-w-xs text-sm">
            Select someone from the sidebar to establish an end-to-end encrypted
            connection.
          </p>
        </div>
      )}
    </div>
  );
}
