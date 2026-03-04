"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Message } from "./types";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Socket } from "socket.io-client";
import {
  VideoOff,
  MicOff,
  ZoomIn,
  ZoomOut,
  Minimize,
  Maximize,
  MonitorUp,
  Phone,
  PhoneOff,
  Mic,
  Video,
  RefreshCcw,
  ScreenShare,
  ScreenShareOff,
  Settings2,
  MessageSquare,
  Moon,
  X,
  Send,
} from "lucide-react";

export function VideoModal({
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
  const [showChat, setShowChat] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [remoteVideoZoom, setRemoteVideoZoom] = useState(1);
  const ephemeralEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(ephemeralMessages.length);

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    isCameraOn,
    isMicOn,
    isRemoteCameraOn,
    isRemoteMicOn,
    availableCameras,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    toggleScreenShare,
    isScreenSharing,
    isRemoteScreenSharing,
    isFrontCamera,
  } = webrtc;

  useEffect(() => {
    ephemeralEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ephemeralMessages]);

  // Detect new incoming ephemeral messages: show toast and set unread badge
  useEffect(() => {
    if (ephemeralMessages.length > prevMessageCountRef.current) {
      const latestMsg = ephemeralMessages[ephemeralMessages.length - 1];
      // Only notify for messages from the other person
      if (latestMsg && latestMsg.sender_id !== currentUserId) {
        if (!showChat) {
          setHasUnread(true);
          toast(latestMsg.message, {
            icon: "💬",
            duration: 3000,
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #3f3f46",
            },
          });
        }
      }
    }
    prevMessageCountRef.current = ephemeralMessages.length;
  }, [ephemeralMessages, showChat, currentUserId]);

  // Clear unread badge when chat panel is opened
  useEffect(() => {
    if (showChat) {
      setHasUnread(false);
    }
  }, [showChat]);

  const sendEphemeralMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ephemeralMsg.trim() || !targetUserId || callState !== "connected")
      return;

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
      className="fixed inset-0 z-50 bg-black p-2 sm:p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 backdrop-blur-md overscroll-none h-[100dvh]"
    >
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden relative bg-zinc-900 border border-zinc-800">
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {callState === "connected" && (
          <div className="absolute top-4 right-20 sm:top-6 sm:right-28 lg:right-32 z-10 flex flex-col gap-2">
            <button
              onClick={() =>
                setRemoteVideoZoom((prev) => Math.min(prev + 0.2, 3))
              }
              className="w-8 h-8 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() =>
                setRemoteVideoZoom((prev) => Math.max(prev - 0.2, 1))
              }
              className="w-8 h-8 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {remoteVideoZoom > 1 && (
              <button
                onClick={() => setRemoteVideoZoom(1)}
                className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-in fade-in zoom-in duration-200"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {callState === "connected" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full transition-all ${!isRemoteCameraOn ? "opacity-0" : "opacity-100"} ${isRemoteScreenSharing ? "object-contain bg-zinc-900/50" : "sm:object-cover object-contain"}`}
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
                transform: `${isRemoteScreenSharing ? "" : "scaleX(-1) "}scale(${remoteVideoZoom})`,
              }}
            />
            {isRemoteScreenSharing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-indigo-500/90 text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm animate-pulse border border-white/20">
                <MonitorUp className="w-3.5 h-3.5" />
                Partner is sharing screen
              </div>
            )}
            {!isRemoteCameraOn && !isRemoteScreenSharing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-800 rounded-full flex items-center justify-center shadow-xl shadow-black/50 mb-6 border-4 border-zinc-700/50">
                  <VideoOff className="w-10 h-10 sm:w-14 sm:h-14 text-zinc-500" />
                </div>
                <p className="text-lg sm:text-xl font-medium text-zinc-400">
                  Camera is turned off
                </p>
                {!isRemoteMicOn && (
                  <div className="mt-4 flex items-center text-red-400 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20">
                    <MicOff className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">
                      Microphone muted
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
            {callState === "calling" ? (
              <>
                <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Phone className="w-8 h-8" />
                </div>
                <p className="text-xl font-medium text-zinc-300 mb-8">
                  Calling...
                </p>
                <button
                  onClick={cancelCall}
                  className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-red-500/20"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
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

        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-24 sm:w-40 md:w-48 aspect-[3/4] md:aspect-video bg-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/50 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full transition-all ${isScreenSharing ? "object-contain bg-zinc-900/50" : "object-cover"}`}
            style={{
              transform: isScreenSharing
                ? "none"
                : isFrontCamera
                  ? "scaleX(-1)"
                  : "none",
              filter: "brightness(1.15)",
            }}
          />
          {!isCameraOn && !isScreenSharing && (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-zinc-500" />
            </div>
          )}
          {isScreenSharing && (
            <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[2px] flex items-center justify-center border-2 border-indigo-500 rounded-2xl">
              <div className="bg-indigo-500 text-white p-2 rounded-lg shadow-lg">
                <MonitorUp className="w-5 h-5 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {callState === "connected" && (
          <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto flex items-center justify-center gap-1.5 sm:gap-3 bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-4 rounded-3xl sm:rounded-full border border-zinc-800 shadow-2xl z-50">
            <button
              onClick={toggleMic}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${isMicOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isMicOn ? (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <button
              onClick={toggleCamera}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${isCameraOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isCameraOn ? (
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            {availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="w-9 h-9 sm:w-12 sm:h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex shrink-0 items-center justify-center text-white transition-colors"
                title="Switch Camera"
              >
                <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <button
              onClick={toggleScreenShare}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex shrink-0 items-center justify-center transition-colors ${!isScreenSharing ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"}`}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              {isScreenSharing ? (
                <ScreenShareOff className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            <div className="hidden xs:block w-px h-6 sm:h-8 bg-zinc-800 mx-0.5 sm:mx-1 shrink-0"></div>
            <div className="relative group shrink-0">
              <button className="w-9 h-9 sm:w-12 sm:h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-white transition-colors">
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
            <div className="hidden xs:block w-px h-6 sm:h-8 bg-zinc-800 mx-0.5 sm:mx-1 shrink-0"></div>
            <button
              onClick={() => setShowChat((prev) => !prev)}
              className={`relative w-9 h-9 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${showChat ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {hasUnread && !showChat && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
              )}
            </button>
            <button
              onClick={endCall}
              className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg shadow-red-600/30 ml-1 sm:ml-2"
            >
              <PhoneOff className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          </div>
        )}
      </div>

      {callState === "connected" && showChat && (
        <div className="relative md:relative h-[40dvh] md:h-full w-full md:w-80 lg:w-96 flex flex-col bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shrink-0 animate-in slide-in-from-bottom-8 md:slide-in-from-right-8 duration-300 shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              In-Call Chat
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-normal text-zinc-500 bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded-full">
                Not Saved
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 sm:p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
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
                className="absolute right-2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg"
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
