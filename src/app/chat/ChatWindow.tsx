"use client";

import React, { useRef, useEffect } from "react";
import { Message, UserProfile } from "./types";
import { Send, Smile, Phone, Shield, Check, CheckCheck } from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  targetUser: UserProfile | null;
  user: any;
  onlineUsers: string[];
  remoteTyping: boolean;
  initiateCall: (id: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
}: ChatWindowProps) {
  const isOnline = targetUser && onlineUsers.includes(targetUser.id);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/20">
      {targetUser ? (
        <>
          {/* Top Bar */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md">
            <div className="flex items-center gap-4">
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
                <h3 className="font-bold text-zinc-100 flex items-center gap-2 truncate text-[15px]">
                  {targetUser.email.split("@")[0]}
                  <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase rounded border border-green-500/20">
                    Trusted
                  </span>
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
                        ? `Last seen ${new Date(targetUser.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
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
              <button
                onClick={() => initiateCall(targetUser.id)}
                className="group w-11 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 border border-indigo-400/20"
                title="Start Video Call"
              >
                <Phone className="w-5 h-5 group-hover:animate-shake" />
              </button>
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
