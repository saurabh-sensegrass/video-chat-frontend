import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { toast } from "react-hot-toast";

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
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);
  const [isRemoteMicOn, setIsRemoteMicOn] = useState(true);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const endCallRef = useRef<() => void>(() => {});

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

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    stopMediaTracks(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setIsCameraOn(true);
    setIsMicOn(true);
    setIsRemoteCameraOn(true);
    setIsRemoteMicOn(true);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [socket, remoteUserId, callState, stopMediaTracks]);

  // Keep endCallRef in sync with the latest endCall implementation
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      endCallRef.current();
    };
  }, []);

  const initLocalStream = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      const constraints: MediaStreamConstraints = {
        video: currentCameraId
          ? { deviceId: { exact: currentCameraId } }
          : true,
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoDevices.length === 0 || !videoDevices[0].label) {
        const newDevices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = newDevices.filter(
          (device) => device.kind === "videoinput",
        );
      }

      setAvailableCameras(videoDevices);

      const currentTrack = stream.getVideoTracks()[0];
      if (currentTrack) {
        const activeDevice = videoDevices.find(
          (d) =>
            d.label === currentTrack.label ||
            d.deviceId === currentTrack.getSettings()?.deviceId,
        );
        if (activeDevice) {
          setCurrentCameraId(activeDevice.deviceId);
        } else if (videoDevices.length > 0) {
          setCurrentCameraId(videoDevices[0].deviceId);
        }

        const facingMode = currentTrack.getSettings()?.facingMode;
        setIsFrontCamera(facingMode !== "environment");
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
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
        endCallRef.current();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const cancelCall = () => {
    if (!socket || !remoteUserId) return;
    socket.emit("webrtc-call-end", { receiverId: remoteUserId });
    setCallState("idle");
    setRemoteUserId(null);
    clearCallTimeout();
  };

  const initiateCall = async (receiverId: string) => {
    if (!socket || callState !== "idle") return;
    setRemoteUserId(receiverId);
    setCallState("calling");
    socket.emit("webrtc-call-initiate", { receiverId });

    // Set 50s timeout for auto cancellation
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      // If the timeout fires, it means the peer hasn't accepted/rejected
      // We can directly call cancelCall since we're tracking the timeout clearance correctly.
      cancelCall();
      toast("Call unanswered", { icon: "📴" });
    }, 50000);
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

  const switchCamera = async () => {
    if (availableCameras.length < 2 || !localStreamRef.current) return;
    try {
      const currentIndex = availableCameras.findIndex(
        (c) => c.deviceId === currentCameraId,
      );
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCamera = availableCameras[nextIndex];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCamera.deviceId } },
        audio: isMicOn,
      });

      const newVideoTrack = stream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(
          (s) => s.track && s.track.kind === "video",
        );
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Update the existing stream in-place
      const currentStream = localStreamRef.current;
      if (currentStream) {
        currentStream.getVideoTracks().forEach((track) => track.stop());
        const oldTrack = currentStream.getVideoTracks()[0];
        if (oldTrack) currentStream.removeTrack(oldTrack);
        currentStream.addTrack(newVideoTrack);
      }
      setLocalStream(currentStream);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setCurrentCameraId(nextCamera.deviceId);
      const facingMode = newVideoTrack.getSettings()?.facingMode;
      setIsFrontCamera(facingMode !== "environment");

      if (!isCameraOn) {
        newVideoTrack.enabled = false;
      }
    } catch (error) {
      console.error("Error switching cameras:", error);
    }
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
          clearCallTimeout();
          setCallState("connected");
          const stream = await initLocalStream();
          if (!stream) {
            endCallRef.current();
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
          clearCallTimeout();
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
        if (callState === "connected" && remoteUserId === senderId) {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(answer),
            );
          }
        }
      },
    );

    socket.on(
      "webrtc-media-toggle",
      ({ isCameraOn: rCam, isMicOn: rMic, senderId }) => {
        if (callState === "connected" && remoteUserId === senderId) {
          if (rCam !== undefined) setIsRemoteCameraOn(rCam);
          if (rMic !== undefined) setIsRemoteMicOn(rMic);
        }
      },
    );

    socket.on(
      "webrtc-screen-share-status",
      ({ isScreenSharing: rScreen, senderId }) => {
        if (callState === "connected" && remoteUserId === senderId) {
          setIsRemoteScreenSharing(rScreen);
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
        if (callState === "receiving") {
          toast("Missed Call", { icon: "📵" });
        }
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        stopMediaTracks(localStreamRef.current);
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setRemoteUserId(null);
        setIsScreenSharing(false);
        setIsRemoteScreenSharing(false);
        setIsCameraOn(true);
        setIsMicOn(true);
        setIsRemoteCameraOn(true);
        setIsRemoteMicOn(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
      clearCallTimeout();
    };
  }, [
    socket,
    currentUserId,
    callState,
    remoteUserId,
    localStream,
    acceptCall,
    stopMediaTracks,
  ]);

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current
        .getTracks()
        .find((track) => track.kind === "video");
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        if (socket && remoteUserId) {
          socket.emit("webrtc-media-toggle", {
            receiverId: remoteUserId,
            isCameraOn: videoTrack.enabled,
          });
        }
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current
        .getTracks()
        .find((track) => track.kind === "audio");
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        if (socket && remoteUserId) {
          socket.emit("webrtc-media-toggle", {
            receiverId: remoteUserId,
            isMicOn: audioTrack.enabled,
          });
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (callState !== "connected" || !socket || !remoteUserId) return;

    try {
      if (isScreenSharing) {
        // Stop screen share
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setIsScreenSharing(false);
        socket.emit("webrtc-screen-share-status", {
          receiverId: remoteUserId,
          isScreenSharing: false,
        });

        // Revert to camera
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        // Fix local video preview
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } else {
        // Start screen share
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
          }
          setIsScreenSharing(false);
          socket.emit("webrtc-screen-share-status", {
            receiverId: remoteUserId,
            isScreenSharing: false,
          });
          const videoTrack = localStreamRef.current?.getVideoTracks()[0];
          if (videoTrack && peerConnectionRef.current) {
            const sender = peerConnectionRef.current
              .getSenders()
              .find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(videoTrack).catch(console.error);
          }
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };

        screenTrackRef.current = screenTrack;
        setIsScreenSharing(true);
        socket.emit("webrtc-screen-share-status", {
          receiverId: remoteUserId,
          isScreenSharing: true,
        });

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Preview local screen share
        if (localVideoRef.current) {
          const previewStream = new MediaStream([screenTrack]);
          localVideoRef.current.srcObject = previewStream;
        }
      }
    } catch (err) {
      console.error("Error toggling screen share", err);
    }
  };

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    remoteUserId,
    isCameraOn,
    isMicOn,
    isRemoteCameraOn,
    isRemoteMicOn,
    availableCameras,
    isFrontCamera,
    initiateCall,
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
  };
}
