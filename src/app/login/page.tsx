"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  generateRSAKeyPair,
  exportPublicKey,
  exportPrivateKey,
} from "@/lib/crypto";
import { useRouter } from "next/navigation";
import { Video, Shield } from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Generate E2EE Key Pair strictly in React Memory for THIS session ONLY
      const keyPair = await generateRSAKeyPair();
      const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
      const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);

      // 2. Pass credentials and keys to NextAuth (Keys will be wrapped Server-Side)
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        publicKey: pubKeyBase64,
        privateKey: privKeyBase64,
      });

      if (result?.error) {
        throw new Error("Invalid credentials or inactive account");
      }

      if (result?.ok) {
        // Assume default redirect to chat. If they are an admin,
        // the AuthProvider layout will redirect them if necessary, or they can navigate there manually.
        router.push("/chat");
      }

      // OLD SUPABASE LOGIC (COMMENTED OUT)
      /*
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check profile validity if auth succeeds
      if (data.user) {
        // The AuthContext will fetch the profile, but for redirect logic we might need to know role
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profileData) {
          await supabase.auth.signOut();
          throw new Error("Profile not found.");
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          throw new Error(
            "Your account is inactive. Please contact the admin.",
          );
        }

        if (profileData.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/chat");
        }
      }
      */
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 transform transition-all">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-500/20 rounded-full">
            <Video className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-zinc-100 mb-8 tracking-tight">
          Comm<span className="text-indigo-400">Sphere</span>
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-200 bg-red-900/30 border border-red-900/50 rounded-lg flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium text-zinc-400 mb-1.5"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-100 transition-colors"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-zinc-400 mb-1.5"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-zinc-100 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
