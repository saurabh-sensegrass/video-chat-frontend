"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";

type Profile = {
  id: string;
  email: string;
  role: "superadmin" | "admin" | "user";
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
    logout: async () => {
      // Clear push subscription from the backend DB so logged-out users
      // don't receive PWA push notifications. Offline (but logged-in) users
      // keep their subscription and still receive push.
      try {
        const token = user?.token;
        if (token) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/push/unsubscribe`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );
        }
      } catch (err) {
        console.error("Failed to clear push subscription on logout:", err);
      }

      // Also unsubscribe from the browser PushManager
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
      } catch (err) {
        console.error(
          "Failed to unsubscribe from browser push on logout:",
          err,
        );
      }

      signOut({ callbackUrl: "/login" });
    },
    // login function removed: NextAuth handles sign in via signIn()
  };
};
