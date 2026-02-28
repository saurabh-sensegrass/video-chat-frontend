"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface GuestSocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const GuestSocketContext = createContext<GuestSocketContextType>({
  socket: null,
  connected: false,
});

export function GuestSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    console.log("Initializing guest socket...");

    // Connect specifically to the /guest namespace without auth tokens
    const socketInstance = io(`${backendUrl}/guest`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on("connect", () => {
      console.log("Guest socket connected:", socketInstance.id);
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Guest socket disconnected");
      setConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Guest socket connection error:", error);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        console.log("Cleaning up guest socket connection");
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <GuestSocketContext.Provider value={{ socket, connected }}>
      {children}
    </GuestSocketContext.Provider>
  );
}

export function useGuestSocket() {
  return useContext(GuestSocketContext);
}
