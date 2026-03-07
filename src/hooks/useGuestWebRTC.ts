import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState = "idle" | "connected";

export function useGuestWebRTC(socket: Socket | null, roomId: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const endCallRef = useRef<() => void>(() => {});

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isRemoteMicOn, setIsRemoteMicOn] = useState(true);
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);
  // Check localStorage to see if this user created the room
  const [isCreator, setIsCreator] = useState(false);

  // Initialize and sync isCreator based on roomId and presence of host token
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`guest_host_${roomId}`) === "true";
      const hasHostToken = !!sessionStorage.getItem(`host_token_${roomId}`);
      setIsCreator(stored || hasHostToken);
    }
  }, [roomId]);
  const [permissions, setPermissions] = useState({
    allowMic: true,
    allowCamera: true,
    allowScreenShare: true,
  });
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const localVideoElemRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElemRef = useRef<HTMLVideoElement | null>(null);

  const localVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      localVideoElemRef.current = node;
      if (localStreamRef.current) {
        node.srcObject = localStreamRef.current;
      }
    }
  }, []);

  const remoteVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node) {
        remoteVideoElemRef.current = node;
        if (remoteStream) {
          node.srcObject = remoteStream;
        }
      }
    },
    [remoteStream],
  );

  const getRTCConfiguration = (): RTCConfiguration => ({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const stopMediaTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const endCall = useCallback(() => {
    if (socket && callState !== "idle") {
      socket.emit("webrtc-call-end", { roomId });
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
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setCallState("idle");
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setIsCameraOn(true);
    setIsMicOn(true);
    setIsRemoteMicOn(true);
    setIsRemoteCameraOn(true);

    if (localVideoElemRef.current) localVideoElemRef.current.srcObject = null;
    if (remoteVideoElemRef.current) remoteVideoElemRef.current.srcObject = null;
  }, [socket, roomId, callState, stopMediaTracks]);

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

  const initLocalStream = useCallback(async () => {
    // If we already have a stream, just return it.
    // This allows the preview to use the same stream as the actual call.
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }

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
      if (localVideoElemRef.current) {
        localVideoElemRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      // Don't force-disable UI states here, let the user retry or see the error
      return null;
    }
  }, [currentCameraId]);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const pc = new RTCPeerConnection(getRTCConfiguration());

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        setRemoteStream(event.streams[0]);
        if (remoteVideoElemRef.current) {
          console.log("Attaching remote stream to video element");
          remoteVideoElemRef.current.srcObject = event.streams[0];
        } else {
          console.warn(
            "remoteVideoElemRef.current is null when track received",
          );
        }
        setCallState("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-ice-candidate", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Guest Connection state:", pc.connectionState);
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [socket, roomId],
  );

  const initiateCallOffer = useCallback(async () => {
    const stream = await initLocalStream();
    if (!stream) return;

    const pc = createPeerConnection(stream);
    try {
      console.log("Creating WebRTC offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Sending offer to room:", roomId);
      socket?.emit("webrtc-offer", { offer, roomId });
    } catch (err) {
      console.error("Error creating guest offer", err);
    }
  }, [initLocalStream, createPeerConnection, socket, roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on("webrtc-offer", async ({ offer, senderId }) => {
      if (senderId === socket.id) return;

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await initLocalStream();
        if (!stream) return;
      }

      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(stream);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc-answer", { answer, roomId });
    });

    socket.on("webrtc-answer", async ({ answer, senderId }) => {
      if (senderId === socket.id) return;

      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, senderId }) => {
      if (senderId === socket.id) return;

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        } catch (e) {
          console.error("Error adding guest ice candidate", e);
        }
      }
    });

    socket.on("webrtc-call-ended", ({ senderId }) => {
      if (senderId !== socket.id) {
        // Clean up connection with peer, but KEEP LOCAL MEDIA
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setCallState("idle");
        setIsRemoteScreenSharing(false);
        setIsRemoteMicOn(true);
        setIsRemoteCameraOn(true);
        if (remoteVideoElemRef.current)
          remoteVideoElemRef.current.srcObject = null;
      }
    });

    socket.on("user-left", ({ userId }) => {
      if (userId !== socket.id) {
        // Clean up connection with peer, but KEEP LOCAL MEDIA
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setCallState("idle");
        setIsRemoteScreenSharing(false);
        setIsRemoteMicOn(true);
        setIsRemoteCameraOn(true);
        if (remoteVideoElemRef.current)
          remoteVideoElemRef.current.srcObject = null;
      }
    });

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("webrtc-call-ended");
      socket.off("user-left");
    };
  }, [socket, roomId, initLocalStream, createPeerConnection, stopMediaTracks]);

  // Stable socket listener for creator status
  useEffect(() => {
    if (!socket) return;

    socket.on("room-creator", () => {
      setIsCreator(true);
      // Also persist to localStorage in case of reconnects
      if (typeof window !== "undefined") {
        localStorage.setItem(`guest_host_${roomId}`, "true");
      }
    });

    socket.on("room-permissions-sync", ({ permissions }) => {
      setPermissions(permissions);
    });

    socket.on("room-permissions-updated", ({ permissions: newPermissions }) => {
      setPermissions(newPermissions);

      // CRITICAL: Only force-disable tracks for the guest (non-creator)
      if (!isCreator && localStreamRef.current) {
        if (!newPermissions.allowMic && isMicOn) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = false;
            setIsMicOn(false);
          }
        }
        if (!newPermissions.allowCamera && isCameraOn) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            setIsCameraOn(false);
          }
        }
      }

      if (!isCreator && !newPermissions.allowScreenShare && isScreenSharing) {
        // Stop screen share if it was active and revoked for guest
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setIsScreenSharing(false);
        socket.emit("guest-screen-share-status", {
          roomId,
          isScreenSharing: false,
        });

        // Revert to camera
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack).catch(console.error);
        }
      }
    });

    socket.on("media-status-update", ({ isMicOn, isCameraOn }) => {
      setIsRemoteMicOn(isMicOn);
      setIsRemoteCameraOn(isCameraOn);
    });

    socket.on("kicked-out", () => {
      // Logic will be handled in page.tsx via a callback or just end call here
      endCallRef.current();
      // We'll use a custom event or state to notify page.tsx for the redirect
      window.dispatchEvent(new CustomEvent("guest-kicked-out"));
    });

    socket.on("host-disconnected", () => {
      endCallRef.current();
      window.dispatchEvent(new CustomEvent("guest-host-disconnected"));
    });

    return () => {
      socket.off("room-creator");
      socket.off("room-permissions-sync");
      socket.off("room-permissions-updated");
      socket.off("media-status-update");
      socket.off("kicked-out");
      socket.off("host-disconnected");
    };
  }, [socket, roomId, isMicOn, isCameraOn, isScreenSharing, isCreator]);

  // Sync local status to remote peer
  useEffect(() => {
    if (socket && callState === "connected") {
      socket.emit("media-status-update", {
        roomId,
        isMicOn,
        isCameraOn,
      });
    }
  }, [socket, roomId, isMicOn, isCameraOn, callState]);

  // Host Action Listener
  useEffect(() => {
    if (!socket) return;
    socket.on("host-action", ({ action }: { action: string }) => {
      if (isCreator) return; // Host should never react to their own actions
      if (action === "mute" && localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsMicOn(false);
        }
      } else if (action === "disable-camera" && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsCameraOn(false);
        }
      } else if (action === "disable-screen-share" && isScreenSharing) {
        // Automatically turn off screen share via state effect hack or manual disable
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setIsScreenSharing(false);

        // Revert track to camera
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack).catch(console.error);
        }
      }
    });

    socket.on(
      "guest-screen-share-status",
      ({ isScreenSharing }: { isScreenSharing: boolean }) => {
        setIsRemoteScreenSharing(isScreenSharing);
      },
    );

    return () => {
      socket.off("host-action");
      socket.off("guest-screen-share-status");
    };
  }, [socket, isScreenSharing, isCreator]);

  // Reactively attach local stream
  useEffect(() => {
    if (localVideoElemRef.current && localStream) {
      if (localVideoElemRef.current.srcObject !== localStream) {
        localVideoElemRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // Reactively attach remote stream
  useEffect(() => {
    if (remoteVideoElemRef.current && remoteStream) {
      if (remoteVideoElemRef.current.srcObject !== remoteStream) {
        remoteVideoElemRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  const toggleCamera = useCallback(() => {
    // Bypass check for host (creator)
    if (!isCreator && !permissions.allowCamera && !isCameraOn) return;
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [permissions.allowCamera, isCameraOn, isCreator]);

  const toggleMic = useCallback(() => {
    // Bypass check for host (creator)
    if (!isCreator && !permissions.allowMic && !isMicOn) return;
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [permissions.allowMic, isMicOn, isCreator]);

  const switchCamera = useCallback(async () => {
    if (availableCameras.length < 2 || !localStreamRef.current) return;

    try {
      const currentIndex = availableCameras.findIndex(
        (c) => c.deviceId === currentCameraId,
      );
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCameraId = availableCameras[nextIndex].deviceId;

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCameraId } },
        audio: false, // Don't replace audio track
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (!isCameraOn) {
        newVideoTrack.enabled = false;
      }

      // Stop old track
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }

      localStreamRef.current.addTrack(newVideoTrack);

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setCurrentCameraId(nextCameraId);

      // Update facing mode from the new track
      const newFacingMode = newVideoTrack.getSettings()?.facingMode;
      setIsFrontCamera(newFacingMode !== "environment");

      // Replace in peer connection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.error("Error switching camera", err);
    }
  }, [availableCameras, currentCameraId, isCameraOn]);

  const toggleScreenShare = useCallback(async () => {
    // Bypass check for host (creator)
    if (!isCreator && !permissions.allowScreenShare && !isScreenSharing) return;
    try {
      if (isScreenSharing) {
        // Stop screen share
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        setIsScreenSharing(false);
        socket?.emit("guest-screen-share-status", {
          roomId,
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
        if (localVideoElemRef.current && localStreamRef.current) {
          localVideoElemRef.current.srcObject = localStreamRef.current;
        }
      } else {
        // Start screen share
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          // Handle user pressing browser's native stop sharing button
          if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
          }
          setIsScreenSharing(false);
          socket?.emit("guest-screen-share-status", {
            roomId,
            isScreenSharing: false,
          });
          const videoTrack = localStreamRef.current?.getVideoTracks()[0];
          if (videoTrack && peerConnectionRef.current) {
            const sender = peerConnectionRef.current
              .getSenders()
              .find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(videoTrack).catch(console.error);
          }
          if (localVideoElemRef.current && localStreamRef.current) {
            localVideoElemRef.current.srcObject = localStreamRef.current;
          }
        };

        screenTrackRef.current = screenTrack;
        setIsScreenSharing(true);
        socket?.emit("guest-screen-share-status", {
          roomId,
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

        // Preview the screen share locally instead of face camera
        if (localVideoElemRef.current) {
          const previewStream = new MediaStream([screenTrack]);
          localVideoElemRef.current.srcObject = previewStream;
        }
      }
    } catch (err) {
      console.error("Error toggling screen share", err);
    }
  }, [
    isScreenSharing,
    socket,
    roomId,
    permissions.allowScreenShare,
    isCreator,
  ]);

  return {
    callState,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    isRemoteScreenSharing,
    initiateCallOffer,
    endCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    toggleScreenShare,
    availableCameras,
    initLocalStream,
    permissions,
    setPermissions,
    isCreator,
    isRemoteMicOn,
    isRemoteCameraOn,
    isFrontCamera,
  };
}
