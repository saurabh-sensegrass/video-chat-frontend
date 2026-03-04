"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  UserPlus,
  Power,
  ShieldCheck,
  Home,
  LogOut,
  ChevronRight,
  UserCheck,
  Mail,
  Calendar,
  Layers,
  Search,
} from "lucide-react";

type AdminProfile = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
};

type UserProfile = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export default function SuperAdminPage() {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();

  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [selectedAdminUsers, setSelectedAdminUsers] = useState<UserProfile[]>(
    [],
  );
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Protect route
  useEffect(() => {
    if (!loading && (!profile || profile.role !== "superadmin")) {
      router.push("/chat");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (profile?.role === "superadmin") {
      fetchAdmins();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedAdminId) {
      fetchAdminUsers(selectedAdminId);
    } else {
      setSelectedAdminUsers([]);
    }
  }, [selectedAdminId]);

  const fetchAdmins = async () => {
    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/superadmin/admins`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        let errMsg = "Failed to fetch admins";
        try {
          const body = await res.json();
          errMsg = body.message || body.error || errMsg;
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAdmins(data);
    } catch (err: any) {
      console.error("SuperAdmin Fetch Error:", err);
      setError(err.message || "Failed to fetch admins");
    }
  };

  const fetchAdminUsers = async (adminId: string) => {
    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/superadmin/admins/${adminId}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSelectedAdminUsers(data);
    } catch (err: any) {
      setError("Failed to fetch admin users: " + err.message);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    setActionLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/superadmin/admins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: newAdminEmail,
            password: newAdminPassword,
          }),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create admin");
      }

      setSuccessMsg("Admin created successfully");
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAdminStatus = async (id: string, currentStatus: boolean) => {
    setError("");
    setSuccessMsg("");

    const token = profile?.token || (profile as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/superadmin/admins/${id}`,
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
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return null;

  const filteredAdmins = admins.filter((a) =>
    a.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg ring-1 ring-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Super Control Panel
              </h1>
              <p className="text-zinc-500 font-medium mt-1">
                Management Hierarchy Overview
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push("/")}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Portal</span>
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all duration-300 text-sm font-semibold text-red-400 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </nav>
        </header>

        {/* Notifications */}
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 min-w-[320px] max-w-md pointer-events-none">
          {error && (
            <div className="p-4 bg-zinc-900/90 border-l-4 border-red-500 rounded-lg shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-full duration-300 pointer-events-auto flex gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-white">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-zinc-900/90 border-l-4 border-emerald-500 rounded-lg shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-full duration-300 pointer-events-auto flex gap-3">
              <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-white">{successMsg}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Dashboard Area */}
          <main className="lg:col-span-8 space-y-8 order-2 lg:order-1">
            {/* Admin Stats & List */}
            <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-md">
              <div className="p-6 border-b border-zinc-800/50 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-xl font-bold">Administrator Network</h2>
                  <span className="ml-2 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                    {admins.length} Total
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none w-full sm:w-64 transition-all"
                  />
                </div>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {filteredAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className={`group transition-all duration-300 hover:bg-zinc-800/20 ${selectedAdminId === admin.id ? "bg-indigo-500/5" : ""}`}
                  >
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2.5 rounded-xl ${selectedAdminId === admin.id ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-500"} transition-colors`}
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-zinc-100">
                              {admin.email}
                            </h3>
                            {!admin.is_active && (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{" "}
                              {new Date(admin.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-indigo-400/80">
                              <Layers className="w-3 h-3" /> {admin.user_count}
                              /2 Users
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setSelectedAdminId(
                              selectedAdminId === admin.id ? null : admin.id,
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${selectedAdminId === admin.id ? "bg-indigo-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                        >
                          {selectedAdminId === admin.id
                            ? "Hide Users"
                            : "View Users"}
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-300 ${selectedAdminId === admin.id ? "rotate-90" : ""}`}
                          />
                        </button>

                        <button
                          onClick={() =>
                            toggleAdminStatus(admin.id, admin.is_active)
                          }
                          className={`p-2 rounded-lg transition-all ${admin.is_active ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`}
                          title={admin.is_active ? "Deactivate" : "Activate"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable User Section */}
                    {selectedAdminId === admin.id && (
                      <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-zinc-950/80 rounded-2xl border border-zinc-800/50 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-4 px-2">
                            Assigned Users
                          </h4>
                          {selectedAdminUsers.length > 0 ? (
                            <div className="space-y-3">
                              {selectedAdminUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-300">
                                      {user.email}
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}
                                  >
                                    {user.is_active ? "Active" : "Disabled"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-zinc-600 italic text-sm">
                              No users managed by this admin yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredAdmins.length === 0 && (
                  <div className="p-12 text-center text-zinc-600">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p>No administrators found matching your search.</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          {/* Sidebar / Quick Actions */}
          <aside className="lg:col-span-4 space-y-8 order-1 lg:order-2">
            {/* Create Admin Panel */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-[1px] rounded-[2rem] shadow-2xl">
              <div className="bg-zinc-900 rounded-[1.95rem] p-8 h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                    <UserPlus className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Expand Team
                  </h2>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-indigo-400" />
                      <input
                        type="email"
                        placeholder="admin@enterprise.com"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                      Access Key
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                  >
                    {actionLoading
                      ? "Initializing..."
                      : "Onboard Administrator"}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-md">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">
                Network Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                  <span className="text-sm font-medium text-zinc-400">
                    Total Users
                  </span>
                  <span className="text-lg font-bold text-white">
                    {admins.reduce((acc, curr) => acc + curr.user_count, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                  <span className="text-sm font-medium text-zinc-400">
                    Security Nodes
                  </span>
                  <span className="text-lg font-bold text-indigo-400">
                    {admins.filter((a) => a.is_active).length}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
