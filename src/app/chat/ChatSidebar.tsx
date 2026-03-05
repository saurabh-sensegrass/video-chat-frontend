"use client";

import { useState } from "react";
import { UserProfile } from "./types";
import { Search, User as UserIcon, LogOut, Home } from "lucide-react";

interface ChatSidebarProps {
  availableUsers: UserProfile[];
  onlineUsers: string[];
  unreadUserIds: string[];
  targetUser: UserProfile | null;
  setTargetUser: (user: UserProfile) => void;
  user: any;
  logout: () => void;
  router: any;
  isLoadingUsers: boolean;
}

export function ChatSidebar({
  availableUsers,
  onlineUsers,
  unreadUserIds,
  targetUser,
  setTargetUser,
  user,
  logout,
  router,
  isLoadingUsers,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = availableUsers.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800/80 shrink-0 h-full">
      <div className="p-6 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-100 tracking-tight">
                Messages
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                {(() => {
                  const c = onlineUsers.filter((id) => id !== user?.id).length;
                  return `${c} ${c === 1 ? "user" : "users"} online`;
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
            title="Go Home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm text-zinc-100 transition-all placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {isLoadingUsers ? (
          // Skeleton Loader
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/20 border border-transparent animate-pulse"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                <div className="h-3 bg-zinc-800/50 rounded w-1/3"></div>
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-80 pt-10">
            <UserIcon className="w-10 h-10 mb-4 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelected = targetUser?.id === u.id;
            const isOnline = onlineUsers.includes(u.id);

            return (
              <button
                key={u.id}
                onClick={() => setTargetUser(u)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${
                  isSelected
                    ? "bg-indigo-600/10 border border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                    : "hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700/50 shadow-inner">
                    <span className="text-lg font-bold text-zinc-400 uppercase">
                      {u.email?.[0] || "?"}
                    </span>
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-4 border-zinc-900 rounded-full shadow-sm"></div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p
                      className={`font-semibold truncate text-[15px] ${isSelected ? "text-indigo-300" : "text-zinc-200"}`}
                    >
                      {u.email?.split("@")[0] || "Unknown User"}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500 truncate font-medium">
                    {isOnline ? "Active now" : "Offline"}
                  </p>
                </div>
                {unreadUserIds.includes(u.id) && !isSelected && (
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg shadow-red-500/40 animate-pulse"></div>
                )}
                {isSelected && (
                  <div className="w-1.5 h-8 bg-indigo-500 rounded-full absolute left-0"></div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/40">
        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700/50">
              <span className="text-sm font-bold text-zinc-400 uppercase">
                {user?.email?.[0] || "?"}
              </span>
            </div>
            <div className="max-w-[120px]">
              <p className="text-sm font-bold text-zinc-100 truncate">
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Logged In
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
