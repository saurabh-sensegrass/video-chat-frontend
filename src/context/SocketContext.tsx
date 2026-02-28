"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
// import { supabase } from "../lib/supabaseClient";

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let newSocket: Socket | null = null;

    const initSocket = async () => {
      // Only connect if user is authenticated
      if (!user) {
        if (socket) {
          socket.disconnect();
          setSocket(null);
          setConnected(false);
        }
        return;
      }

      // OLD SUPABASE LOGIC (COMMENTED OUT)
      /*
      // Get the current session to get a fresh JWT
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      */

      // NEW NEXTAUTH / MONGODB LOGIC
      const token = user.token || (user as any)?.accessToken; // Accommodate standard API maps

      if (!token) return;

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

      newSocket = io(backendUrl, {
        auth: { token },
      });

      newSocket.on("connect", () => {
        setConnected(true);
      });

      newSocket.on("disconnect", () => {
        setConnected(false);
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
