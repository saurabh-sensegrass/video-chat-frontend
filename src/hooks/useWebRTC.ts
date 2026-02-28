import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState = "idle" | "calling" | "receiving" | "connected";

export function useWebRTC(
  socket: Socket | null,
  currentUserId: string | undefined,
) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // STUN ONLY
  const getRTCConfiguration = (): RTCConfiguration => ({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const stopMediaTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const endCall = useCallback(() => {
    if (socket && remoteUserId && callState !== "idle") {
      socket.emit("webrtc-call-end", { receiverId: remoteUserId });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopMediaTracks(localStream);
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [socket, remoteUserId, callState, localStream, stopMediaTracks]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      // Fallback or alert would go here in a full app
      return null;
    }
  };

  const createPeerConnection = (stream: MediaStream, partnerId: string) => {
    const pc = new RTCPeerConnection(getRTCConfiguration());

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
          receiverId: partnerId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const initiateCall = async (receiverId: string) => {
    if (!socket || callState !== "idle") return;
    setRemoteUserId(receiverId);
    setCallState("calling");
    socket.emit("webrtc-call-initiate", { receiverId });
  };

  const acceptCall = async () => {
    if (!socket || !remoteUserId) return;

    const stream = await initLocalStream();
    if (!stream) {
      rejectCall();
      return;
    }

    setCallState("connected");
    socket.emit("webrtc-call-accept", { callerId: remoteUserId });

    // We wait for the caller to send the offer after we accept
  };

  const rejectCall = () => {
    if (!socket || !remoteUserId) return;
    socket.emit("webrtc-call-reject", { callerId: remoteUserId });
    setCallState("idle");
    setRemoteUserId(null);
  };

  // Listeners
  useEffect(() => {
    if (!socket || !currentUserId) return;

    socket.on("webrtc-incoming-call", ({ callerId }: { callerId: string }) => {
      if (callState === "idle") {
        setRemoteUserId(callerId);
        setCallState("receiving");
      } else {
        // Busy
        socket.emit("webrtc-call-reject", { callerId });
      }
    });

    socket.on(
      "webrtc-call-accepted",
      async ({ receiverId }: { receiverId: string }) => {
        if (callState === "calling" && remoteUserId === receiverId) {
          setCallState("connected");
          const stream = await initLocalStream();
          if (!stream) {
            endCall();
            return;
          }

          const pc = createPeerConnection(stream, receiverId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-offer", { offer, receiverId });
          } catch (err) {
            console.error("Error creating offer", err);
          }
        }
      },
    );

    socket.on(
      "webrtc-call-rejected",
      ({ receiverId }: { receiverId: string }) => {
        if (callState === "calling" && remoteUserId === receiverId) {
          alert("Call was rejected");
          setCallState("idle");
          setRemoteUserId(null);
        }
      },
    );

    socket.on(
      "webrtc-offer",
      async ({
        offer,
        senderId,
      }: {
        offer: RTCSessionDescriptionInit;
        senderId: string;
      }) => {
        if (callState === "connected" && remoteUserId === senderId) {
          // If we haven't created a stream yet (which we should have on acceptCall)
          let stream = localStream;
          if (!stream) {
            stream = await initLocalStream();
            if (!stream) return;
          }

          let pc = peerConnectionRef.current;
          if (!pc) {
            pc = createPeerConnection(stream, senderId);
          }

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("webrtc-answer", { answer, receiverId: senderId });
        }
      },
    );

    socket.on(
      "webrtc-answer",
      async ({
        answer,
        senderId,
      }: {
        answer: RTCSessionDescriptionInit;
        senderId: string;
      }) => {
        if (peerConnectionRef.current && remoteUserId === senderId) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
        }
      },
    );

    socket.on(
      "webrtc-ice-candidate",
      async ({
        candidate,
        senderId,
      }: {
        candidate: RTCIceCandidateInit;
        senderId: string;
      }) => {
        if (peerConnectionRef.current && remoteUserId === senderId) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          } catch (e) {
            console.error("Error adding received ice candidate", e);
          }
        }
      },
    );

    socket.on("webrtc-call-ended", ({ senderId }: { senderId: string }) => {
      if (remoteUserId === senderId) {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        stopMediaTracks(localStream);
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setRemoteUserId(null);
      }
    });

    return () => {
      socket.off("webrtc-incoming-call");
      socket.off("webrtc-call-accepted");
      socket.off("webrtc-call-rejected");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("webrtc-call-ended");
    };
  }, [
    socket,
    callState,
    currentUserId,
    remoteUserId,
    localStream,
    stopMediaTracks,
    endCall,
  ]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [localStream]);

  return {
    callState,
    remoteUserId,
    localVideoRef,
    remoteVideoRef,
    isCameraOn,
    isMicOn,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleCamera,
    toggleMic,
  };
}
