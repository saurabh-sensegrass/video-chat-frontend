"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRouter } from "next/navigation";
import {
  encryptE2EEMessage,
  decryptE2EEMessage,
  importPublicKey,
  importPrivateKey,
} from "@/lib/crypto";
import { toast } from "react-hot-toast";
import { EmojiClickData } from "emoji-picker-react";
import { sendAppNotification } from "@/lib/notifications";
import { Shield } from "lucide-react";

import { Message, UserProfile } from "./types";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { VideoModal } from "./VideoModal";

export default function ChatPage() {
  const { user, profile, loading, logout } = useAuth();
  const { socket, connected } = useSocket();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [saveHistory, setSaveHistory] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [remoteTyping, setRemoteTyping] = useState(false);

  // E2EE Keys
  const myPublicKeyRef = useRef<CryptoKey | null>(null);
  const targetPublicKeyRef = useRef<CryptoKey | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const webrtc = useWebRTC(socket, user?.id);
  const { callState, initiateCall } = webrtc;

  const messageSoundRef = useRef<HTMLAudioElement>(null);
  const ringtoneSoundRef = useRef<HTMLAudioElement>(null);
  const callAcceptedSoundRef = useRef<HTMLAudioElement>(null);
  const callEndedSoundRef = useRef<HTMLAudioElement>(null);
  const prevCallState = useRef(callState);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (
      (callState === "receiving" || callState === "calling") &&
      prevCallState.current === "idle"
    ) {
      ringtoneSoundRef.current?.play().catch(console.error);
    } else if (
      callState === "connected" &&
      (prevCallState.current === "receiving" ||
        prevCallState.current === "calling")
    ) {
      ringtoneSoundRef.current?.pause();
      if (ringtoneSoundRef.current) ringtoneSoundRef.current.currentTime = 0;
      callAcceptedSoundRef.current?.play().catch(console.error);
    } else if (callState === "idle" && prevCallState.current !== "idle") {
      ringtoneSoundRef.current?.pause();
      if (ringtoneSoundRef.current) ringtoneSoundRef.current.currentTime = 0;
      callEndedSoundRef.current?.play().catch(console.error);
    }
    prevCallState.current = callState;
  }, [callState]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const initCryptoKeys = async (targetUserKey?: string) => {
      try {
        if (user?.privateKey)
          privateKeyRef.current = await importPrivateKey(user.privateKey);
        if (user?.publicKey)
          myPublicKeyRef.current = await importPublicKey(user.publicKey);
        if (targetUserKey)
          targetPublicKeyRef.current = await importPublicKey(targetUserKey);
      } catch (err) {
        console.error("Failed to init crypto keys", err);
      }
    };

    const fetchInitialData = async () => {
      if (!user) return;
      const token = user.token || (user as any).accessToken;
      if (!token) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/chat/init`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setAvailableUsers(data.availableUsers || []);
          if (data.availableUsers?.length > 0) {
            setTargetUser(data.availableUsers[0]);
            await initCryptoKeys(data.availableUsers[0].publicKey);
          }
          setSaveHistory(data.saveHistory);

          let msgs = data.messages || [];
          if (privateKeyRef.current) {
            msgs = await Promise.all(
              msgs.map(async (m: Message) => {
                if (m.message?.includes("encryptedData")) {
                  try {
                    const decryptedText = await decryptE2EEMessage(
                      m.message,
                      privateKeyRef.current!,
                      m.sender_id === user.id,
                    );
                    return { ...m, message: decryptedText };
                  } catch {
                    return m;
                  }
                }
                return m;
              }),
            );
          }
          setMessages(msgs);
        }
      } catch (e) {
        console.error("Failed fetching chat initialization data", e);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessage = async (msg: Message) => {
      let decryptedText = msg.message;
      if (msg.message.includes("encryptedData") && privateKeyRef.current) {
        decryptedText = await decryptE2EEMessage(
          msg.message,
          privateKeyRef.current,
          msg.sender_id === user.id,
        );
      }
      const decryptedMsg = { ...msg, message: decryptedText };
      messageSoundRef.current?.play().catch(console.error);
      setMessages((prev) => [...prev, decryptedMsg]);
      toast("New message received", { icon: "✉️" });
      sendAppNotification("New Message", decryptedMsg.message);

      if (!document.hidden && user.id === decryptedMsg.receiver_id) {
        socket.emit("mark-messages-read", { senderId: decryptedMsg.sender_id });
      }
    };

    const handleEphemeral = (data: any) => {
      const msg: Message = {
        id: crypto.randomUUID(),
        sender_id: data.senderId,
        message: data.content,
        created_at: data.timestamp,
        isEphemeral: true,
      };
      setMessages((prev) => [...prev, msg]);
    };

    const handleUserOnline = (users: string[]) => setOnlineUsers(users);
    const handleUserTyping = ({ senderId }: { senderId: string }) => {
      if (targetUser?.id === senderId) setRemoteTyping(true);
    };
    const handleUserStopTyping = ({ senderId }: { senderId: string }) => {
      if (targetUser?.id === senderId) setRemoteTyping(false);
    };
    const handleMessagesRead = ({ readerId }: { readerId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.receiver_id === readerId && !m.isRead ? { ...m, isRead: true } : m,
        ),
      );
    };
    const handleUserOffline = ({ userId, lastSeen }: any) => {
      if (targetUser?.id === userId)
        setTargetUser((prev) => (prev ? { ...prev, lastSeen } : prev));
    };

    socket.on("message-receive", handleMessage);
    socket.on("ephemeral-receive", handleEphemeral);
    socket.on("online-users", handleUserOnline);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("user-offline", handleUserOffline);
    socket.on("webrtc-incoming-call", () => {
      toast("Incoming Video Call...", { icon: "📞", duration: 5000 });
      sendAppNotification("Incoming Video Call", "Someone is calling you");
    });

    return () => {
      socket.off("message-receive", handleMessage);
      socket.off("ephemeral-receive", handleEphemeral);
      socket.off("online-users", handleUserOnline);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("user-offline", handleUserOffline);
      socket.off("webrtc-incoming-call");
    };
  }, [socket, user, targetUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !user || !targetUser) return;

    let payloadString = inputMsg;
    if (myPublicKeyRef.current && targetPublicKeyRef.current) {
      payloadString = await encryptE2EEMessage(
        inputMsg,
        myPublicKeyRef.current,
        targetPublicKeyRef.current,
      );
    }

    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      receiver_id: targetUser.id,
      message: inputMsg,
      isRead: false,
      created_at: new Date().toISOString(),
    };

    setInputMsg("");
    setShowEmojiPicker(false);
    setMessages((prev) => [...prev, newMsg]);

    socket?.emit("message", {
      id: newMsg.id,
      content: payloadString,
      receiverId: targetUser.id,
      timestamp: newMsg.created_at,
    });
  };

  useEffect(() => {
    if (callState === "idle") {
      setMessages((prev) => prev.filter((m) => !m.isEphemeral));
    }
  }, [callState]);

  const handleSetTargetUser = async (u: UserProfile) => {
    setTargetUser(u);
    if (!u.publicKey) {
      targetPublicKeyRef.current = null;
      return;
    }

    try {
      const key = await importPublicKey(u.publicKey);
      targetPublicKeyRef.current = key;
    } catch (err) {
      console.error("Failed to import public key for user", u.id, err);
      targetPublicKeyRef.current = null;
      toast.error(
        "Security error: Could not verify user identity. Messaging might be unencrypted.",
      );
    }
  };

  if (loading || !user)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Loading...
      </div>
    );

  if (profile?.role === "admin" || profile?.role === "superadmin") {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
        <Shield className="w-16 h-16 text-red-500/50 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Chat Disabled</h1>
        <p className="max-w-md text-zinc-500">
          Administrators cannot participate in messaging.
        </p>
        <button
          onClick={() =>
            router.push(
              profile?.role === "superadmin" ? "/superadmin" : "/admin",
            )
          }
          className="mt-8 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full bg-zinc-950 flex flex-col lg:flex-row overflow-hidden overscroll-none">
      {callState !== "idle" && (
        <VideoModal
          webrtc={webrtc}
          ephemeralMessages={messages.filter((m) => m.isEphemeral)}
          currentUserId={user.id}
          targetUserId={targetUser?.id}
          socket={socket}
          onLocalSend={(msg) => setMessages((prev) => [...prev, msg])}
        />
      )}

      <ChatSidebar
        availableUsers={availableUsers}
        onlineUsers={onlineUsers}
        targetUser={targetUser}
        setTargetUser={handleSetTargetUser}
        user={user}
        logout={logout}
        router={router}
      />

      <ChatWindow
        messages={messages.filter(
          (m) =>
            !m.isEphemeral &&
            targetUser &&
            (m.sender_id === targetUser.id || m.receiver_id === targetUser.id),
        )}
        inputMsg={inputMsg}
        setInputMsg={setInputMsg}
        sendMessage={sendMessage}
        targetUser={targetUser}
        user={user}
        onlineUsers={onlineUsers}
        remoteTyping={remoteTyping}
        initiateCall={initiateCall}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiPickerRef={emojiPickerRef}
        messagesEndRef={messagesEndRef}
      />

      <audio ref={messageSoundRef} src="/sounds/message.mp3" preload="auto" />
      <audio
        ref={ringtoneSoundRef}
        src="/sounds/ringtone.mp3"
        loop
        preload="auto"
      />
      <audio
        ref={callAcceptedSoundRef}
        src="/sounds/call-accepted.mp3"
        preload="auto"
      />
      <audio
        ref={callEndedSoundRef}
        src="/sounds/call-ended.mp3"
        preload="auto"
      />
    </div>
  );
}
