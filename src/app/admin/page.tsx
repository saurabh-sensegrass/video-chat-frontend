"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Settings,
  Users,
  MessageSquareOff,
  UserPlus,
  Power,
  Shield,
  Home,
  LogOut,
  Mail,
  Lock,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";

type UserProfile = {
  id: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [saveChatHistory, setSaveChatHistory] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");

  // Protect route
  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      router.push("/chat"); // Redirect non-admins
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchUsers();
      fetchSettings();
    }
  }, [profile]);

  const fetchUsers = async () => {
    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError("Failed to fetch users: " + err.message);
    }
  };

  const fetchSettings = async () => {
    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/settings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data) setSaveChatHistory(data.save_chat_history);
      }
    } catch (err: any) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword,
          }),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create user");
      }

      setSuccessMsg("User created successfully");
      setNewUserEmail("");
      setNewUserPassword("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    setError("");
    setSuccessMsg("");

    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/users/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        },
      );

      if (!res.ok) throw new Error("Failed to update status");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSettings = async () => {
    setError("");
    setSuccessMsg("");

    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const newValue = !saveChatHistory;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/settings`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ save_chat_history: newValue }),
        },
      );

      if (!res.ok) throw new Error("Failed to update settings");
      setSaveChatHistory(newValue);
      setSuccessMsg("Settings updated");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const clearMessages = async () => {
    if (!confirm("Are you sure you want to clear all chat history?")) return;
    setError("");
    setSuccessMsg("");

    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/admin/messages`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to clear messages");
      setSuccessMsg("Chat history cleared");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return null;

  const userLimitReached = users.length >= 2;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Glassmorphism Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-6 duration-700">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield className="w-8 h-8 text-indigo-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Admin <span className="text-zinc-500 font-medium">Console</span>
              </h1>
              <p className="text-zinc-500 font-medium mt-1">
                Operational Environment Control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="px-5 py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all text-sm font-bold text-red-400 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Action Status Messages */}
        <div className="space-y-4 mb-8">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <UserCheck className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar Navigation */}
          <nav className="lg:col-span-3 space-y-3">
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all group ${activeTab === "users" ? "bg-indigo-600 shadow-lg shadow-indigo-600/30" : "bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800"}`}
            >
              <Users
                className={`w-5 h-5 ${activeTab === "users" ? "text-white" : "text-zinc-500 group-hover:text-indigo-400"}`}
              />
              <span
                className={`font-bold ${activeTab === "users" ? "text-white" : "text-zinc-300"}`}
              >
                User Base
              </span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all group ${activeTab === "settings" ? "bg-indigo-600 shadow-lg shadow-indigo-600/30" : "bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800"}`}
            >
              <Settings
                className={`w-5 h-5 ${activeTab === "settings" ? "text-white" : "text-zinc-500 group-hover:text-indigo-400"}`}
              />
              <span
                className={`font-bold ${activeTab === "settings" ? "text-white" : "text-zinc-300"}`}
              >
                Parameters
              </span>
            </button>
            <div className="pt-6 mt-6 border-t border-zinc-800">
              <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600 mb-4">
                  Quota Enforcement
                </p>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-black text-white">
                    {users.length}{" "}
                    <span className="text-xs text-zinc-500 font-medium">
                      / 2
                    </span>
                  </span>
                  <span className="text-xs font-bold text-zinc-500 underline decoration-indigo-500/50 underline-offset-4">
                    Max Capacity
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${users.length >= 2 ? "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" : "bg-zinc-600"}`}
                    style={{ width: `${(users.length / 2) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </nav>

          {/* Tab Content */}
          <main className="lg:col-span-9 animate-in fade-in duration-500">
            {activeTab === "users" ? (
              <div className="space-y-8">
                {/* Onboarding Form */}
                <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                      <UserPlus className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">
                      Onboard User
                    </h2>
                  </div>

                  <form
                    onSubmit={handleCreateUser}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="email"
                        placeholder="End-user Email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="password"
                        placeholder="Security Key"
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={actionLoading || userLimitReached}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        {userLimitReached
                          ? "Personnel Limit Reached"
                          : "Activate User Subscription"}
                        <ChevronRight className="inline-block w-4 h-4 ml-2 group-hover:ml-3 transition-all" />
                      </button>
                    </div>
                  </form>
                </section>

                {/* Master User List */}
                <section className="bg-zinc-900 shadow-2xl rounded-3xl border border-zinc-800 overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold">Node Inventory</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                        <tr>
                          <th className="px-6 py-4">Identity</th>
                          <th className="px-6 py-4 hidden sm:table-cell">
                            Operational Status
                          </th>
                          <th className="px-6 py-4 text-right">
                            Access Control
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="group hover:bg-white/5 transition-colors"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                  <Mail className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-zinc-100">
                                    {user.email}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 font-medium">
                                    Joined{" "}
                                    {new Date(
                                      user.created_at,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 hidden sm:table-cell">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${user.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
                                />
                                {user.is_active ? "Operational" : "Restricted"}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() =>
                                  toggleUserStatus(user.id, user.is_active)
                                }
                                className={`p-2.5 rounded-xl transition-all shadow-md active:scale-95 ${user.is_active ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"}`}
                                aria-label={
                                  user.is_active
                                    ? `Deactivate ${user.email}`
                                    : `Activate ${user.email}`
                                }
                                title={
                                  user.is_active ? "Deactivate" : "Activate"
                                }
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-6 py-12 text-center text-zinc-600 italic text-sm"
                            >
                              Core user base is currently empty.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : (
              /* Global Parameters Panel */
              <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-md space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                    <Settings className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Global Parameters
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl group transition-all hover:border-indigo-500/30">
                    <div>
                      <h3 className="font-black text-white text-lg tracking-tight">
                        Persistent Communication Log
                      </h3>
                      <p
                        id="chat-history-description"
                        className="text-sm text-zinc-500 mt-1 max-w-md"
                      >
                        Synchronize all encrypted messages to the central ledger
                        for auditing.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={saveChatHistory}
                        onChange={toggleSettings}
                        aria-label="Save chat history"
                        aria-describedby="chat-history-description"
                      />
                      <div className="w-12 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-400 after:border-zinc-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white" />
                    </label>
                  </div>

                  <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                      <MessageSquareOff className="w-5 h-5" />
                      <h3 className="font-black text-lg">
                        Destructive Operations
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-500">
                      Irreversibly purge all stored communication data from the
                      production database.
                    </p>
                    <button
                      onClick={clearMessages}
                      className="w-full py-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-black rounded-2xl border border-red-900/40 transition-all uppercase tracking-widest text-[10px]"
                    >
                      Execute Protocol: Clear History
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
