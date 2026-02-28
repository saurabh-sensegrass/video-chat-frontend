"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
import {
  Settings,
  Users,
  MessageSquareOff,
  UserPlus,
  Power,
  Shield,
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

  if (loading) return null; // or standard loading spinner

  // Exclude admin from creating users count.
  const regularUsersCount = users.filter((u) => u.role === "user").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium"
          >
            Sign out
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-900/50 rounded-xl text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-900/50 rounded-xl text-green-200">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Actions & Settings */}
          <div className="space-y-8">
            {/* Create User Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-zinc-400" />
                <h2 className="text-xl font-semibold">Create User</h2>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="User Email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 text-zinc-100"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || regularUsersCount >= 2}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regularUsersCount >= 2 ? "User Limit Reached" : "Add User"}
                </button>
              </form>
              <p className="text-xs text-zinc-500 mt-4 text-center">
                {regularUsersCount} / 2 User Slots Filled
              </p>
            </div>

            {/* Global Settings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-zinc-400" />
                <h2 className="text-xl font-semibold">System Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-200">
                      Save Chat History
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      If disabled, new messages won't be saved to DB.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={saveChatHistory}
                      onChange={toggleSettings}
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <button
                    onClick={clearMessages}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-medium rounded-xl border border-red-900/50 transition-colors"
                  >
                    <MessageSquareOff className="w-4 h-4" />
                    Clear All Chat History
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: User Management */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-zinc-400" />
                <h2 className="text-xl font-semibold">User Management</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/50 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="px-4 py-4 font-medium">{user.email}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${user.role === "admin" ? "bg-indigo-500/20 text-indigo-300" : "bg-zinc-800 text-zinc-300"}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
                          >
                            {user.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {user.role !== "admin" && (
                            <button
                              onClick={() =>
                                toggleUserStatus(user.id, user.is_active)
                              }
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors inline-block"
                              title={
                                user.is_active ? "Disable User" : "Enable User"
                              }
                            >
                              <Power
                                className={`w-4 h-4 ${user.is_active ? "text-red-400" : "text-green-400"}`}
                              />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-zinc-500"
                        >
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
