"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";

type Profile = {
  id: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  publicKey?: string;
  token?: string;
  privateKey?: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export const useAuth = () => {
  const { data: session, status } = useSession();
  const user = (session?.user as Profile) || null;

  return {
    user,
    profile: user,
    loading: status === "loading",
    logout: () => signOut({ callbackUrl: "/login" }),
    // login function removed: NextAuth handles sign in via signIn()
  };
};
