"use client";

import { Shield } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-full bg-zinc-950/20 relative">
      <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 border border-zinc-700/50 shadow-2xl opacity-50">
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
  );
}
