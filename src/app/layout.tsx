import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { Toaster } from "react-hot-toast";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Video Chat App | Private Calls",
  description:
    "Secure, private 1-to-1 video chat application with screen sharing.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VideoChat",
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased min-h-[100dvh] overscroll-none`}
      >
        <AuthProvider>
          <SocketProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-right" />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
