"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
// import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  encryptE2EEMessage,
  decryptE2EEMessage,
  importPublicKey,
  importPrivateKey,
} from "@/lib/crypto";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Send,
  PhoneOff,
  Phone,
  Settings2,
  Moon,
  X,
  Maximize,
  Minimize,
  Check,
  CheckCheck,
  Smile,
  MessageSquare,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

type Message = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  message: string;
  isRead?: boolean;
  created_at: string;
  isEphemeral?: boolean;
};

type UserProfile = {
  id: string;
  email: string;
  is_active: boolean;
  lastSeen?: string;
};

// Extracted to prevent chat typing from re-rendering the video/WebRTC hooks excessively (React best practices: rendering-activity / rerender-defer-reads)
function VideoModal({
  webrtc,
  ephemeralMessages,
  currentUserId,
  targetUserId,
  socket,
  onLocalSend,
}: {
  webrtc: ReturnType<typeof useWebRTC>;
  ephemeralMessages: Message[];
  currentUserId: string;
  targetUserId?: string;
  socket: Socket | null;
  onLocalSend: (msg: Message) => void;
}) {
  const [filter, setFilter] = useState("none");
  const [ephemeralMsg, setEphemeralMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false); // Default to collapsed per common UX
  const ephemeralEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    isCameraOn,
    isMicOn,
    acceptCall,
    rejectCall,
    endCall,
    toggleCamera,
    toggleMic,
  } = webrtc;

  useEffect(() => {
    ephemeralEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ephemeralMessages]);

  const sendEphemeralMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ephemeralMsg.trim() || !targetUserId || callState !== "connected")
      return;

    // To display locally instantly, we could lift this up natively or rely on the parent socket handling it.
    // For simplicity, we just trigger the server logic which reflects it to peers.
    // Since we filtered ephemeral messages from props, we just emit here.
    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender_id: currentUserId,
      message: ephemeralMsg,
      created_at: new Date().toISOString(),
      isEphemeral: true,
    };

    socket?.emit("ephemeral-message", newMsg.message, targetUserId);
    onLocalSend(newMsg);
    setEphemeralMsg("");

    // As an optimization, we rely on the backend emitting it back to us, or we'd need to hoist state.
    // Given the architecture, the parent state handles it, but since we emit it, we should manually append it
    // or refactor the socket to broadcast clearly. We'll leave the state at the parent.
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error("Error attempting to open fullscreen", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/90 p-4 md:p-8 flex flex-col md:flex-row gap-6 lg:gap-8 backdrop-blur-md overscroll-none"
    >
      {/* Video Area */}
      <div className="flex-1 flex flex-col h-full rounded-3xl overflow-hidden relative bg-zinc-900 border border-zinc-800">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-6 left-6 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </button>
        {/* Remote Video (Main) */}
        {callState === "connected" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transition-all"
            style={{
              filter:
                filter === "grayscale"
                  ? "grayscale(100%) brightness(1.15)"
                  : filter === "sepia"
                    ? "sepia(100%) brightness(1.15)"
                    : filter === "brightness"
                      ? "brightness(150%)"
                      : filter === "contrast"
                        ? "contrast(150%) brightness(1.15)"
                        : "brightness(1.15)",
              transform: "scaleX(-1)", // Mirrored for the remote person
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
            {callState === "calling" ? (
              <>
                <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Phone className="w-8 h-8" />
                </div>
                <p className="text-xl font-medium text-zinc-300">Calling...</p>
              </>
            ) : callState === "receiving" ? (
              <>
                <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <Phone className="w-8 h-8" />
                </div>
                <p className="text-xl font-medium text-zinc-300 mb-8">
                  Incoming Call
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={acceptCall}
                    className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-green-500/20"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                  <button
                    onClick={rejectCall}
                    className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-red-500/20"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Local Video (PiP) */}
        <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] md:aspect-video bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/50">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)", filter: "brightness(1.15)" }} // Mirrored self-view + bumped brightness
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-zinc-500" />
            </div>
          )}
        </div>

        {/* Media Controls */}
        {callState === "connected" && (
          <div className="absolute bottom-4 lg:bottom-8 left-1/2 -translate-x-1/2 w-[90%] md:w-auto max-w-md flex flex-wrap justify-center items-center gap-2 sm:gap-4 bg-zinc-950/80 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 rounded-3xl sm:rounded-full border border-zinc-800 shadow-2xl">
            <button
              onClick={toggleMic}
              className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${isMicOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isMicOn ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleCamera}
              className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${isCameraOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isCameraOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
            <div className="hidden sm:block w-px h-8 bg-zinc-800 mx-1 sm:mx-2 shrink-0"></div>
            <div className="relative group shrink-0">
              <button className="w-10 sm:w-12 h-10 sm:h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-white transition-colors">
                <Settings2 className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 w-32 origin-bottom">
                {["none", "grayscale", "sepia", "brightness", "contrast"].map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-sm py-2 px-3 rounded-lg text-left capitalize transition-colors ${filter === f ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                    >
                      {f}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-zinc-800 mx-1 sm:mx-2 shrink-0"></div>
            <button
              onClick={() => setShowChat((prev) => !prev)}
              className={`w-10 sm:w-12 h-10 sm:h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${showChat ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
            >
              <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <button
              onClick={endCall}
              className="w-12 sm:w-14 h-12 sm:h-14 shrink-0 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-red-600/30 ml-auto sm:ml-0"
            >
              <PhoneOff className="w-5 sm:w-6 h-5 sm:h-6" />
            </button>
          </div>
        )}
      </div>
      {/* Ephemeral Chat Panel */}
      {callState === "connected" && showChat && (
        <div className="absolute md:relative bottom-4 right-4 md:bottom-auto md:right-auto z-40 h-[50dvh] md:h-full w-[calc(100%-32px)] sm:w-[350px] md:w-80 lg:w-96 flex flex-col bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300 shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              In-Call Chat{" "}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-normal text-zinc-500 bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded-full">
                Not Saved
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 sm:p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {ephemeralMessages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-900/20"
                        : "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={ephemeralEndRef} />
          </div>
          <form
            onSubmit={sendEphemeralMessage}
            className="p-3 sm:p-4 bg-zinc-900/50 border-t border-zinc-800/80"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={ephemeralMsg}
                onChange={(e) => setEphemeralMsg(e.target.value)}
                placeholder="Send ephemeral message..."
                className="w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={!ephemeralMsg.trim()}
                className="absolute right-2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:hover:text-indigo-400 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user, profile, loading, logout } = useAuth();
  const { socket, connected } = useSocket();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [saveHistory, setSaveHistory] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const initCryptoKeys = async (targetUserKey?: string) => {
      try {
        const privStr = user?.privateKey;
        if (privStr) {
          privateKeyRef.current = await importPrivateKey(privStr);
        }
        if (user?.publicKey) {
          myPublicKeyRef.current = await importPublicKey(user.publicKey);
        }
        if (targetUserKey) {
          targetPublicKeyRef.current = await importPublicKey(targetUserKey);
        }
      } catch (err) {
        console.error("Failed to init crypto keys", err);
      }
    };

    const fetchInitialData = async () => {
      if (!user) return;
      const token = user.token || (user as any)?.accessToken;
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
          setTargetUser(data.targetUser);
          setSaveHistory(data.saveHistory);

          await initCryptoKeys(data.targetUser?.publicKey);

          let msgs = data.messages;
          if (privateKeyRef.current) {
            try {
              msgs = await Promise.all(
                data.messages.map(async (m: Message) => {
                  if (m.message && m.message.includes("encryptedData")) {
                    const decryptedText = await decryptE2EEMessage(
                      m.message,
                      privateKeyRef.current!,
                      m.sender_id === user.id,
                    );
                    return { ...m, message: decryptedText };
                  }
                  return m;
                }),
              );
            } catch (err) {
              console.error("History decryption error", err);
            }
          }
          setMessages(msgs);
        }
      } catch (e) {
        console.error("Failed fetching chat initialization data", e);
      }

      // OLD SUPABASE LOGIC (COMMENTED OUT)
      /*
      // Fetch target user (the other user in the system)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "user")
        .neq("id", user.id)
        .limit(1);

      if (profiles && profiles.length > 0) {
        setTargetUser(profiles[0]);
      }

      // Fetch settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("save_chat_history")
        .eq("id", 1)
        .single();

      if (settingsData) {
        setSaveHistory(settingsData.save_chat_history);
      }

      // Fetch history
      const { data: msgHistory } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (msgHistory) {
        setMessages(msgHistory);
      }
      */
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
      if (
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("New Message", {
          body: decryptedMsg.message,
          silent: true,
        });
      }

      // If document is visible, immediately emit read receipt back
      if (!document.hidden && user?.id === decryptedMsg.receiver_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === decryptedMsg.id ? { ...m, isRead: true } : m,
          ),
        );
        socket.emit("mark-messages-read", { senderId: decryptedMsg.sender_id });
      }
    };

    const handleEphemeral = (data: {
      content: string;
      senderId: string;
      timestamp: string;
    }) => {
      // Ephemeral messages are added to UI but never saved to DB, marked with a flag
      const msg: Message = {
        id: crypto.randomUUID(),
        sender_id: data.senderId,
        message: data.content,
        created_at: data.timestamp,
        isEphemeral: true,
      };
      messageSoundRef.current?.play().catch(console.error);
      setMessages((prev) => [...prev, msg]);
      toast(`In-Call Message: ${data.content}`, { icon: "💬" });

      if (
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("New In-Call Message", {
          body: data.content,
          silent: true,
        });
      }
    };

    const handleOnlineUsers = (users: string[]) => {
      setOnlineUsers(users);
    };

    const handleIncomingCall = ({ callerId }: { callerId: string }) => {
      toast("Incoming Video Call...", { icon: "📞", duration: 5000 });
      if (
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Incoming Video Call", {
          body: "Someone is calling you",
          silent: true,
        });
      }
    };

    const handleUserTyping = ({ senderId }: { senderId: string }) => {
      if (targetUser && targetUser.id === senderId) {
        setRemoteTyping(true);
      }
    };

    const handleUserStopTyping = ({ senderId }: { senderId: string }) => {
      if (targetUser && targetUser.id === senderId) {
        setRemoteTyping(false);
      }
    };

    const handleMessagesRead = ({ readerId }: { readerId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.receiver_id === readerId && !msg.isRead
            ? { ...msg, isRead: true }
            : msg,
        ),
      );
    };

    const handleUserOffline = ({
      userId,
      lastSeen,
    }: {
      userId: string;
      lastSeen: string;
    }) => {
      if (targetUser && targetUser.id === userId) {
        setTargetUser((prev) => (prev ? { ...prev, lastSeen } : prev));
      }
    };

    socket.on("message-receive", handleMessage);
    socket.on("ephemeral-receive", handleEphemeral);
    socket.on("online-users", handleOnlineUsers);
    socket.on("webrtc-incoming-call", handleIncomingCall);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("user-offline", handleUserOffline);

    // Initial check to mark messages read if target user is active in view
    if (user && targetUser && !document.hidden) {
      socket.emit("mark-messages-read", { senderId: targetUser.id });
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && user && targetUser) {
        socket.emit("mark-messages-read", { senderId: targetUser.id });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("message-receive", handleMessage);
      socket.off("ephemeral-receive", handleEphemeral);
      socket.off("online-users", handleOnlineUsers);
      socket.off("webrtc-incoming-call", handleIncomingCall);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("user-offline", handleUserOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    } else {
      console.warn("Missing public keys, sending plaintext fallback");
    }

    const newMsg: Message = {
      id: crypto.randomUUID(), // Optimistic ID
      sender_id: user.id,
      receiver_id: targetUser.id,
      message: inputMsg, // UI shows plaintext IMMEDIATELY
      isRead: false,
      created_at: new Date().toISOString(),
    };

    setInputMsg("");
    setShowEmojiPicker(false);
    setMessages((prev) => [...prev, newMsg]);

    socket?.emit("message", {
      id: newMsg.id,
      content: payloadString, // Send ENCRYPTED to server
      receiverId: targetUser.id,
      timestamp: newMsg.created_at,
    });

    // OLD SUPABASE PERSISTENCE LOGIC (COMMENTED OUT)
    /*
    if (saveHistory) {
      const { error } = await supabase.from("messages").insert({
        id: newMsg.id,
        sender_id: user.id,
        receiver_id: targetUser.id,
        message: newMsg.message,
      });
      if (error) console.error("Error saving message", error);
    }
    */
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMsg(e.target.value);

    if (!socket || !targetUser) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { receiverId: targetUser.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop-typing", { receiverId: targetUser.id });
    }, 2000);
  };

  // When call ends or page refreshes, ephemeral messages should vanish.
  // We can filter them out when call state changes to idle.
  useEffect(() => {
    if (callState === "idle") {
      setMessages((prev) => prev.filter((m) => !m.isEphemeral));
    }
  }, [callState]);

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return "Offline";
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Last seen today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return `Last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputMsg((prev) => prev + emojiData.emoji);
  };

  if (loading || !user)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Loading...
      </div>
    );

  const isTargetOnline = targetUser
    ? onlineUsers.includes(targetUser.id)
    : false;

  return (
    <div className="fixed inset-0 w-full bg-zinc-950 flex flex-col lg:flex-row overflow-hidden overscroll-none">
      {/* Video Call Modal Overlay */}
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

      {/* Main Persistent Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col h-full bg-zinc-950 overflow-hidden relative">
        {/* Chat Header */}
        <header className="h-[72px] lg:h-20 shrink-0 border-b border-zinc-800/80 flex items-center justify-between px-4 lg:px-10 bg-zinc-950/50 backdrop-blur-md z-10 w-full">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 overflow-hidden">
            {profile?.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors mr-1 sm:mr-2 hidden lg:block"
              >
                Admin Panel
              </button>
            )}
            <div className="hidden lg:block w-px h-6 bg-zinc-800 mr-1 sm:mr-2 shrink-0"></div>

            {/* Header Avatar */}
            {targetUser && (
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-zinc-800 border border-zinc-700 font-semibold text-zinc-300 flex items-center justify-center shrink-0 shadow-md text-sm sm:text-base">
                {targetUser.email.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-lg font-semibold text-zinc-100 flex items-center gap-2 truncate">
                {targetUser ? targetUser.email.split("@")[0] : "Waiting..."}
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <div
                  className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full shrink-0 ${isTargetOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-zinc-600"}`}
                ></div>
                <span className="text-[10px] sm:text-xs text-zinc-400 truncate">
                  {isTargetOnline
                    ? "Online"
                    : formatLastSeen(targetUser?.lastSeen)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
            <button
              onClick={() => targetUser && initiateCall(targetUser.id)}
              disabled={!isTargetOnline || callState !== "idle"}
              className="flex items-center justify-center gap-2 w-10 sm:w-auto h-10 sm:h-auto px-0 sm:px-4 py-0 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:shadow-none shrink-0"
            >
              <Video className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Start Video Call</span>
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 sm:p-2.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 lg:p-10 space-y-4 lg:space-y-6 flex flex-col w-full scroll-smooth">
          {!saveHistory && (
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-xs font-medium text-zinc-400 rounded-full border border-zinc-800">
                <Settings2 className="w-3.5 h-3.5" />
                Chat history is currently disabled by Admin
              </span>
            </div>
          )}

          {messages
            .filter((m) => !m.isEphemeral)
            .map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] lg:max-w-[60%] px-5 py-3 rounded-3xl text-[15px] leading-relaxed relative ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-900/10"
                        : "bg-zinc-900 text-zinc-200 rounded-bl-sm border border-zinc-800"
                    }`}
                  >
                    {msg.message}
                    <div
                      className={`text-[10px] mt-2 opacity-60 flex items-center gap-1 ${isMe ? "justify-end text-indigo-100" : "text-zinc-400"}`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMe &&
                        (msg.isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}

          {remoteTyping && targetUser && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 text-zinc-400 px-4 py-3 rounded-3xl rounded-bl-sm border border-zinc-800 flex items-center gap-1.5 w-16 h-10">
                <div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="w-full px-4 py-3 lg:p-8 shrink-0 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/80 z-20 sticky bottom-0">
          <form
            onSubmit={sendMessage}
            className="relative lg:max-w-4xl mx-auto flex items-center gap-2 w-full"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-zinc-400 transition-colors shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-4 z-50">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={Theme.DARK}
                    lazyLoadEmojis={true}
                  />
                </div>
              )}
            </div>

            <input
              type="text"
              value={inputMsg}
              onChange={handleInputChange}
              disabled={!targetUser || !connected}
              placeholder={
                connected
                  ? targetUser
                    ? "Type a message..."
                    : "Waiting for another user to join..."
                  : "Connecting to server..."
              }
              className="w-full pl-4 lg:pl-6 pr-14 lg:pr-16 py-3 lg:py-4 bg-zinc-900 border border-zinc-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl lg:rounded-2xl text-[14px] lg:text-base text-zinc-100 placeholder:text-zinc-500 transition-all shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || !targetUser || !connected}
              className="absolute right-2 lg:right-3 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg lg:rounded-xl transition-colors shadow-lg shadow-indigo-900/20 disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Hidden Audio Elements */}
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
