"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGuestSocket } from "@/context/GuestSocketContext";
import { useGuestWebRTC } from "@/hooks/useGuestWebRTC";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Send,
  PhoneOff,
  Moon,
  Maximize,
  Minimize,
  X,
  Copy,
  CheckCircle2,
  Users,
  RefreshCcw,
  Info,
  MonitorUp,
  MonitorOff,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-hot-toast";

type GuestMessage = {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
};

export default function GuestVideoRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { socket, connected } = useGuestSocket();
  const webrtc = useGuestWebRTC(socket, roomId);

  const [userName, setUserName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const roomDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use Refs for state inside socket callbacks to prevent listener re-attachments
  const showChatRef = useRef(false);
  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  const remoteUserNameRef = useRef<string | null>(null);
  useEffect(() => {
    remoteUserNameRef.current = remoteUserName;
  }, [remoteUserName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showRoomDetails &&
        roomDetailsRef.current &&
        !roomDetailsRef.current.contains(event.target as Node)
      ) {
        setShowRoomDetails(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRoomDetails]);

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    isCameraOn,
    isMicOn,
    initiateCallOffer,
    endCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    toggleScreenShare,
    availableCameras,
    initLocalStream,
    isScreenSharing,
    isRemoteScreenSharing,
  } = webrtc;

  // Initial Join Logic
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !socket) return;

    // Request camera access first before fully joining
    await initLocalStream();

    // Join room AFTER camera opens
    socket.emit("join-room", { roomId, userName: userName.trim() });
    setIsJoined(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Robust Socket Listeners
  useEffect(() => {
    // We register these unconditionally on mount so we never miss the 'existing-user' race condition
    if (!socket) return;

    socket.on("room-full", () => {
      setIsRoomFull(true);
      setIsJoined(false);
    });

    socket.on("room-creator", () => {
      setIsCreator(true);
    });

    socket.on("host-disconnected", () => {
      toast("The Room Host has disconnected. The call is ending.", {
        icon: "⚠️",
        duration: 5000,
      });
      setTimeout(() => {
        endCall();
        router.push("/join-video");
      }, 2000);
    });

    socket.on(
      "user-joined",
      ({
        userId,
        userName: connectedName,
      }: {
        userId: string;
        userName: string;
      }) => {
        setRemoteUserName(connectedName);
        toast(`${connectedName} joined the room!`, { icon: "👋" });
      },
    );

    // Received if we are the second person joining, telling us who is already here
    socket.on(
      "existing-user",
      ({
        userId,
        userName: existingName,
      }: {
        userId: string;
        userName: string;
      }) => {
        setRemoteUserName(existingName);
        // We are the second person, initiate the WebRTC offer asynchronously
        initiateCallOffer();
      },
    );

    socket.on("user-left", ({ userId }: { userId: string }) => {
      toast(`${remoteUserNameRef.current || "User"} left the room`, {
        icon: "👋",
      });
      setRemoteUserName(null);
    });

    socket.on(
      "guest-receive",
      (data: {
        content: string;
        senderId: string;
        senderName: string;
        timestamp: string;
      }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.content,
            timestamp: data.timestamp,
          },
        ]);
        if (!showChatRef.current) {
          toast(`New message from ${data.senderName}`, { icon: "💬" });
        }
      },
    );

    return () => {
      socket.off("room-full");
      socket.off("room-creator");
      socket.off("host-disconnected");
      socket.off("user-joined");
      socket.off("existing-user");
      socket.off("user-left");
      socket.off("guest-receive");
    };
  }, [socket, initiateCallOffer]);

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socket) return;

    const msgData = {
      id: crypto.randomUUID(),
      senderId: socket.id || "local",
      senderName: userName,
      message: inputMsg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msgData]);
    socket.emit("guest-message", { roomId, content: inputMsg });
    setInputMsg("");
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast("Link copied to clipboard!", { icon: "🔗" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDisconnect = () => {
    endCall();
    if (socket) {
      socket.disconnect();
    }
    router.push("/join-video");
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

  // NAME ENTRY SCREEN
  if (!isMounted) return null; // Prevent hydration errors by waiting for client

  if (!isJoined && !isRoomFull) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Join Video Room
            </h1>
            <p className="text-zinc-400 text-sm">
              You've been invited to a private 1-on-1 video call.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="guest-name"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Your Name
              </label>
              <input
                id="guest-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                required
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim() || !connected}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl transition-all shadow-lg overflow-hidden relative group"
            >
              <span className="relative z-10">
                {connected ? "Join Room" : "Connecting..."}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ROOM FULL SCREEN
  if (isRoomFull) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Room is Full</h1>
        <p className="text-zinc-400 max-w-md mx-auto mb-8">
          This room already has 2 participants and cannot accept more guests.
        </p>
        <button
          onClick={() => router.push("/join-video")}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
        >
          Create New Room
        </button>
      </div>
    );
  }

  // ACTIVE VIDEO ROOM SCREEN
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black p-2 sm:p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-4 lg:gap-6 overscroll-none"
    >
      {/* Video Area */}
      <div className="flex-1 flex flex-col h-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-zinc-900 border border-zinc-800">
        {/* Top Overlay Actions */}
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
          <div
            ref={roomDetailsRef}
            className={`flex flex-col gap-2 pointer-events-auto ${showRoomDetails ? "w-full max-w-sm sm:max-w-md" : ""}`}
          >
            {/* Room Details Toggle */}
            <div className="w-full flex">
              <button
                onClick={() => setShowRoomDetails((prev) => !prev)}
                className={`bg-black/50 hover:bg-black/70 backdrop-blur-md px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors cursor-pointer ${showRoomDetails ? "rounded-t-xl rounded-b-none border-b-transparent w-full" : "rounded-xl w-fit"}`}
              >
                <Info className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="text-sm font-medium text-white shadow-sm flex-1 text-left">
                  Room Details
                </span>
              </button>
            </div>

            {/* Room Details Dropdown */}
            {showRoomDetails && (
              <div className="bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700/80 rounded-b-xl rounded-tr-xl p-4 shadow-2xl w-full animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Room Info
                  </h4>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${callState === "connected" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400 animate-pulse"}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${callState === "connected" ? "bg-green-400" : "bg-yellow-400"}`}
                    ></div>
                    {callState}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-medium text-zinc-500 mb-1">
                      Room ID
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded font-mono truncate">
                        {roomId}
                      </code>
                      <button
                        onClick={copyRoomLink}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-zinc-500 border-b border-zinc-800 pb-1">
                      Participants
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-zinc-200 truncate">
                        {userName} (You)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${remoteUserName ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-zinc-500"}`}
                      >
                        {remoteUserName
                          ? remoteUserName.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <span
                        className={`text-sm truncate ${remoteUserName ? "text-zinc-200" : "text-zinc-500 italic"}`}
                      >
                        {remoteUserName || "Waiting for peer..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={copyRoomLink}
              className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors border border-white/10"
              title="Copy Room Link"
            >
              {copiedLink ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors border border-white/10"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remote Video (Main) */}
        {callState === "connected" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transition-all"
            style={{
              transform: isRemoteScreenSharing ? "none" : "scaleX(-1)", // Mirrored for the remote person unless screen sharing
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
            <div className="w-24 h-24 bg-zinc-800/80 rounded-full flex items-center justify-center mb-6 border border-zinc-700/50">
              <Users className="w-10 h-10 text-zinc-400" />
            </div>
            <h2 className="text-xl font-medium text-zinc-300 mb-2">
              You're the only one here
            </h2>
            <p className="text-sm max-w-sm mx-auto mb-6 opacity-70">
              Share the room link with someone to start the video call.
            </p>
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-xl transition-colors border border-indigo-500/20"
            >
              {copiedLink ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedLink ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* Local Video (PiP) */}
        <div
          ref={pipRef}
          className="group absolute top-16 left-4 sm:top-20 sm:left-6 w-36 sm:w-48 md:w-64 aspect-[3/4] md:aspect-video bg-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/80 z-20 touch-none"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: isScreenSharing ? "none" : "scaleX(-1)" }}
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-zinc-500" />
            </div>
          )}

          <div className="absolute bottom-2 left-2 bg-black/60 pr-2 pl-1 py-1 rounded-md text-[10px] text-white backdrop-blur-md flex items-center gap-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMic();
              }}
              className={`p-1 rounded-full bg-black/40 hover:bg-black/80 transition-colors backdrop-blur-md flex items-center justify-center ${!isMicOn ? "text-red-400 border border-red-500/30" : "text-zinc-200 border border-white/10"}`}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? (
                <Mic className="w-3 h-3" />
              ) : (
                <MicOff className="w-3 h-3" />
              )}
            </button>
            <span className="truncate max-w-[60px] sm:max-w-[80px]">
              You ({userName})
            </span>
          </div>
        </div>

        {/* Media Controls */}
        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)] sm:max-w-none flex justify-center items-center gap-2 sm:gap-3 bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-4 rounded-[2rem] sm:rounded-full border border-zinc-800 shadow-2xl z-20 overflow-x-auto no-scrollbar pointer-events-auto">
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

          <button
            onClick={toggleScreenShare}
            className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${!isScreenSharing ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"}`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <MonitorUp className="w-5 h-5" />
            )}
          </button>

          {availableCameras && availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="w-10 sm:w-12 h-10 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors bg-zinc-800 hover:bg-zinc-700 text-white"
              title="Switch Camera"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          )}

          <div className="w-px h-8 bg-zinc-800 mx-1 shrink-0"></div>

          {isCreator && (
            <button
              onClick={() => {
                setShowHostControls((prev) => !prev);
                if (!showHostControls) setShowChat(false);
              }}
              className={`w-10 sm:w-12 h-10 sm:h-12 shrink-0 rounded-full flex items-center justify-center transition-colors relative ${showHostControls ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
              title="Host Controls"
            >
              <ShieldAlert className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          )}

          <button
            onClick={() => {
              setShowChat((prev) => !prev);
              if (!showChat) setShowHostControls(false);
            }}
            className={`w-10 sm:w-12 h-10 sm:h-12 shrink-0 rounded-full flex items-center justify-center transition-colors relative ${showChat ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
          >
            <Moon className="w-4 sm:w-5 h-4 sm:h-5" />
            {!showChat && messages.length > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-950"></span>
            )}
          </button>

          <div className="w-px h-8 bg-zinc-800 mx-1 shrink-0"></div>

          <button
            onClick={handleDisconnect}
            className="w-11 sm:w-14 h-11 sm:h-14 shrink-0 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-5 sm:w-6 h-5 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Host Controls Panel */}
      {showHostControls && isCreator && (
        <div className="absolute md:relative bottom-4 right-4 md:bottom-auto md:right-auto z-40 h-[60dvh] md:h-full w-[calc(100%-32px)] sm:w-[350px] md:w-80 lg:w-96 flex flex-col bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300 shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Host Controls
            </h3>
            <button
              onClick={() => setShowHostControls(false)}
              className="p-1 sm:p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Close host controls"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
            <p className="text-xs text-zinc-400 mb-2">
              Manage the guest&apos;s media permissions below.
            </p>
            <button
              onClick={() =>
                socket?.emit("host-action", { roomId, action: "mute" })
              }
              className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50 text-white w-full text-left group"
            >
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-700 transition-colors">
                <MicOff className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Mute Guest</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Turn off their microphone
                </div>
              </div>
            </button>
            <button
              onClick={() =>
                socket?.emit("host-action", {
                  roomId,
                  action: "disable-camera",
                })
              }
              className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50 text-white w-full text-left group"
            >
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-700 transition-colors">
                <VideoOff className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Stop Camera</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Turn off their video feed
                </div>
              </div>
            </button>
            <button
              onClick={() =>
                socket?.emit("host-action", {
                  roomId,
                  action: "disable-screen-share",
                })
              }
              className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50 text-white w-full text-left group"
            >
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-700 transition-colors">
                <MonitorOff className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Stop Screen Share</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Force end their presentation
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Guest Chat Panel */}
      {showChat && (
        <div className="absolute md:relative bottom-4 right-4 md:bottom-auto md:right-auto z-40 h-[60dvh] md:h-full w-[calc(100%-32px)] sm:w-[350px] md:w-80 lg:w-96 flex flex-col bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300 shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Room Chat
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

          <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">
                No messages yet
              </div>
            ) : (
              messages.map((msg) => {
                const isMe =
                  msg.senderId === socket?.id || msg.senderId === "local";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    {!isMe && (
                      <span className="text-[10px] text-zinc-500 ml-1 mb-1">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed relative ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-900/20"
                          : "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendChatMessage}
            className="p-3 sm:p-4 bg-zinc-900/50 border-t border-zinc-800/80 shrink-0"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Type a message..."
                className="w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim()}
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
