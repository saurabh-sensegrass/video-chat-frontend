"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import {
  encryptE2EEMessage,
  decryptE2EEMessage,
  importPublicKey,
  importPrivateKey,
} from "@/lib/crypto";
import { toast } from "react-hot-toast";
import { sendAppNotification } from "@/lib/notifications";
import { Message, UserProfile } from "./types";
import { useParams, useRouter } from "next/navigation";

const isEncryptedMessage = (text: string) => {
  if (!text) return false;
  try {
    const parsed = JSON.parse(text);
    return (
      typeof parsed === "object" && parsed !== null && "encryptedData" in parsed
    );
  } catch {
    return false;
  }
};

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  inputMsg: string;
  setInputMsg: React.Dispatch<React.SetStateAction<string>>;
  targetUser: UserProfile | null;
  availableUsers: UserProfile[];
  onlineUsers: string[];
  saveHistory: boolean;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  unreadUserIds: string[];
  setUnreadUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  isTyping: boolean;
  remoteTyping: boolean;
  webrtc: ReturnType<typeof useWebRTC>;
  sendMessage: (e: React.FormEvent) => Promise<void>;
  targetPublicKeyRef: React.RefObject<CryptoKey | null>;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messageSoundRef: React.RefObject<HTMLAudioElement | null>;
  ringtoneSoundRef: React.RefObject<HTMLAudioElement | null>;
  callerRingtoneSoundRef: React.RefObject<HTMLAudioElement | null>;
  callAcceptedSoundRef: React.RefObject<HTMLAudioElement | null>;
  callEndedSoundRef: React.RefObject<HTMLAudioElement | null>;
  user: any;
  socket: any;
  loading: boolean;
  isLoadingUsers: boolean;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, logout } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const params = useParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [saveHistory, setSaveHistory] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadUserIds, setUnreadUserIds] = useState<string[]>([]);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const socketRef = useRef(socket);
  const [remoteTyping, setRemoteTyping] = useState(false);

  // E2EE Keys
  const myPublicKeyRef = useRef<CryptoKey | null>(null);
  const targetPublicKeyRef = useRef<CryptoKey | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const webrtc = useWebRTC(socket, user?.id);
  const { callState } = webrtc;

  const messageSoundRef = useRef<HTMLAudioElement>(null);
  const ringtoneSoundRef = useRef<HTMLAudioElement>(null);
  const callerRingtoneSoundRef = useRef<HTMLAudioElement>(null);
  const callAcceptedSoundRef = useRef<HTMLAudioElement>(null);
  const callEndedSoundRef = useRef<HTMLAudioElement>(null);
  const prevCallState = useRef(callState);

  // Derive targetUser from URL parameter
  const userIdParam = params?.userId as string | undefined;
  const targetUser = availableUsers.find((u) => u.id === userIdParam) || null;
  const targetUserRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    targetUserRef.current = targetUser;
  }, [targetUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Handle call sounds
  useEffect(() => {
    if (callState === "calling" && prevCallState.current === "idle") {
      callerRingtoneSoundRef.current?.play().catch(console.error);
    } else if (callState === "receiving" && prevCallState.current === "idle") {
      ringtoneSoundRef.current?.play().catch(console.error);
    } else if (
      callState === "connected" &&
      (prevCallState.current === "receiving" ||
        prevCallState.current === "calling")
    ) {
      ringtoneSoundRef.current?.pause();
      if (ringtoneSoundRef.current) ringtoneSoundRef.current.currentTime = 0;
      callerRingtoneSoundRef.current?.pause();
      if (callerRingtoneSoundRef.current)
        callerRingtoneSoundRef.current.currentTime = 0;
      callAcceptedSoundRef.current?.play().catch(console.error);
    } else if (callState === "idle" && prevCallState.current !== "idle") {
      ringtoneSoundRef.current?.pause();
      if (ringtoneSoundRef.current) ringtoneSoundRef.current.currentTime = 0;
      callerRingtoneSoundRef.current?.pause();
      if (callerRingtoneSoundRef.current)
        callerRingtoneSoundRef.current.currentTime = 0;
      callEndedSoundRef.current?.play().catch(console.error);
    }
    prevCallState.current = callState;
  }, [callState]);

  // Handle targetUser public key import and unread clear
  useEffect(() => {
    let isAborted = false;

    if (targetUser) {
      setUnreadUserIds((prev) => prev.filter((id) => id !== targetUser.id));

      if (targetUser.publicKey) {
        importPublicKey(targetUser.publicKey)
          .then((key) => {
            if (isAborted) return;
            targetPublicKeyRef.current = key;
          })
          .catch((err) => {
            if (isAborted) return;
            console.error(
              "Failed to import public key for user",
              targetUser.id,
              err,
            );
            targetPublicKeyRef.current = null;
            toast.error(
              "Security error: Could not verify user identity. Messaging might be unencrypted.",
            );
          });
      } else {
        targetPublicKeyRef.current = null;
      }
    } else {
      targetPublicKeyRef.current = null;
    }

    return () => {
      isAborted = true;
    };
  }, [targetUser]);

  // Initialization & Data Fetching
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const initCryptoKeys = async (firstUserKey?: string) => {
      try {
        if (user?.privateKey)
          privateKeyRef.current = await importPrivateKey(user.privateKey);
        if (user?.publicKey)
          myPublicKeyRef.current = await importPublicKey(user.publicKey);
        if (firstUserKey)
          targetPublicKeyRef.current = await importPublicKey(firstUserKey);
      } catch (err) {
        console.error("Failed to init crypto keys", err);
      }
    };

    const fetchInitialData = async () => {
      if (!user) return;
      const token = user.token || (user as any).accessToken;
      if (!token) return;

      await initCryptoKeys();

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

          let msgs = data.messages || [];
          if (privateKeyRef.current) {
            msgs = await Promise.all(
              msgs.map(async (m: Message) => {
                if (isEncryptedMessage(m.message)) {
                  try {
                    const decryptedText = await decryptE2EEMessage(
                      m.message,
                      privateKeyRef.current!,
                      m.sender_id === user.id,
                    );
                    return { ...m, message: decryptedText };
                  } catch (err) {
                    console.error("Failed to decrypt initial message:", err);
                    return m;
                  }
                }
                return m;
              }),
            );
          }
          setMessages(msgs);
          setSaveHistory(data.saveHistory);
        }
      } catch (e) {
        console.error("Failed fetching chat initialization data", e);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // Seamless Read Receipts processing
  useEffect(() => {
    if (!socket || !targetUser || !user) return;

    // Check if there are any unread messages SENT BY the targetUser TO the current user
    const hasUnread = messages.some(
      (m) =>
        !m.isRead && m.sender_id === targetUser.id && m.receiver_id === user.id,
    );

    if (hasUnread) {
      // Tell down-stream to mark them as read DB-side and inform sender via broadcast
      socket.emit("mark-messages-read", { senderId: targetUser.id });

      // Aggressively update local react state so it's instantly seamless in UI
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === targetUser.id &&
          m.receiver_id === user.id &&
          !m.isRead
            ? { ...m, isRead: true }
            : m,
        ),
      );
    }
  }, [messages, targetUser, socket, user]);

  // Socket Listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleMessage = async (msg: Message) => {
      let decryptedText = msg.message;
      if (isEncryptedMessage(msg.message) && privateKeyRef.current) {
        try {
          decryptedText = await decryptE2EEMessage(
            msg.message,
            privateKeyRef.current,
            msg.sender_id === user.id,
          );
        } catch (err) {
          console.error("Failed to decrypt incoming message:", err);
          decryptedText = msg.message;
        }
      }
      const decryptedMsg = { ...msg, message: decryptedText };
      messageSoundRef.current?.play().catch(console.error);
      setMessages((prev) => [...prev, decryptedMsg]);

      const isFromCurrentTarget =
        targetUserRef.current?.id === decryptedMsg.sender_id;
      if (!isFromCurrentTarget) {
        toast(
          `New message from ${decryptedMsg.sender_id === user.id ? "you" : "someone"}`,
          { icon: "✉️" },
        );
        setUnreadUserIds((prev) => {
          if (!prev.includes(decryptedMsg.sender_id)) {
            return [...prev, decryptedMsg.sender_id];
          }
          return prev;
        });
      }

      sendAppNotification("New Message", decryptedMsg.message);

      if (
        !document.hidden &&
        user.id === decryptedMsg.receiver_id &&
        isFromCurrentTarget
      ) {
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
      if (targetUserRef.current?.id === senderId) setRemoteTyping(true);
    };

    const handleUserStopTyping = ({ senderId }: { senderId: string }) => {
      if (targetUserRef.current?.id === senderId) setRemoteTyping(false);
    };

    const handleMessagesRead = ({ readerId }: { readerId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === user.id && m.receiver_id === readerId && !m.isRead
            ? { ...m, isRead: true }
            : m,
        ),
      );
    };

    const handleUserOffline = ({ userId, lastSeen }: any) => {
      // update availableUsers lastSeen
      setAvailableUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, lastSeen } : u)),
      );
    };

    const handleIncomingCall = ({
      callType: incomingType,
    }: {
      callType?: string;
    }) => {
      const callLabel = incomingType === "audio" ? "Audio" : "Video";
      toast(`Incoming ${callLabel} Call...`, { icon: "📞", duration: 5000 });
      sendAppNotification(
        "Incoming Call",
        `Someone is calling you (${callLabel})`,
      );
    };

    socket.on("message-receive", handleMessage);
    socket.on("ephemeral-receive", handleEphemeral);
    socket.on("online-users", handleUserOnline);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("user-offline", handleUserOffline);
    socket.on("webrtc-incoming-call", handleIncomingCall);

    return () => {
      socket.off("message-receive", handleMessage);
      socket.off("ephemeral-receive", handleEphemeral);
      socket.off("online-users", handleUserOnline);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("user-offline", handleUserOffline);
      socket.off("webrtc-incoming-call", handleIncomingCall);
    };
  }, [socket, user]);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && socketRef.current && targetUserRef.current) {
        socketRef.current.emit("stop-typing", {
          receiverId: targetUserRef.current.id,
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !targetUserRef.current) return;

    if (inputMsg.length > 0) {
      if (!isTypingRef.current) {
        setIsTyping(true);
        socketRef.current.emit("typing", {
          receiverId: targetUserRef.current.id,
        });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (targetUserRef.current) {
          socketRef.current?.emit("stop-typing", {
            receiverId: targetUserRef.current.id,
          });
        }
      }, 2000);
    } else {
      if (isTypingRef.current) {
        setIsTyping(false);
        socketRef.current.emit("stop-typing", {
          receiverId: targetUserRef.current.id,
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [inputMsg]);

  const handleInputChange = (valueOrUpdater: React.SetStateAction<string>) => {
    setInputMsg(valueOrUpdater);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currTarget = targetUserRef.current;
    if (!inputMsg.trim() || !user || !currTarget) return;

    if (isTyping) {
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket?.emit("stop-typing", { receiverId: currTarget.id });
    }

    let payloadString = inputMsg;
    if (myPublicKeyRef.current && targetPublicKeyRef.current) {
      try {
        payloadString = await encryptE2EEMessage(
          inputMsg,
          myPublicKeyRef.current,
          targetPublicKeyRef.current,
        );
      } catch (err) {
        console.error("Encryption failed:", err);
        toast.error("Encryption failed. Message was not sent securely.");
        return; // Abort send entirely
      }
    }

    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      receiver_id: currTarget.id,
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
      receiverId: currTarget.id,
      timestamp: newMsg.created_at,
    });
  };

  useEffect(() => {
    if (callState === "idle") {
      setMessages((prev) => prev.filter((m) => !m.isEphemeral));
    }
  }, [callState]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        inputMsg,
        setInputMsg: handleInputChange,
        targetUser,
        availableUsers,
        onlineUsers,
        saveHistory,
        showEmojiPicker,
        setShowEmojiPicker,
        unreadUserIds,
        setUnreadUserIds,
        isTyping,
        remoteTyping,
        webrtc,
        sendMessage,
        targetPublicKeyRef,
        emojiPickerRef,
        messagesEndRef,
        messageSoundRef,
        ringtoneSoundRef,
        callerRingtoneSoundRef,
        callAcceptedSoundRef,
        callEndedSoundRef,
        user,
        socket,
        loading,
        isLoadingUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
