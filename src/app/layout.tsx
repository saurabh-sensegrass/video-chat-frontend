import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { Toaster } from "react-hot-toast";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen overscroll-none`}
      >
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster position="top-right" />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
