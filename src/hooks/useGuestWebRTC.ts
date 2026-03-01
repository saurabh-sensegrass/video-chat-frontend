import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState = "idle" | "connected";

export function useGuestWebRTC(socket: Socket | null, roomId: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopMediaTracks(localStreamRef.current);
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setCallState("idle");

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [socket, roomId, callState, stopMediaTracks]);

  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      // First try to get devices to see if we have permissions and info
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

      // If we didn't have devices before (permissions just granted), get them now
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
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setIsCameraOn(false);
      setIsMicOn(false);
      return null;
    }
  }, []);

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
        console.log("Received remote track");
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
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
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
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
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setCallState("idle");
      }
    });

    socket.on("user-left", ({ userId }) => {
      if (userId !== socket.id) {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setCallState("idle");
      }
    });

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("webrtc-call-ended");
      socket.off("user-left");
    };
  }, [socket, roomId, initLocalStream, createPeerConnection]);

  // Host Action Listener
  useEffect(() => {
    if (!socket) return;
    socket.on("host-action", ({ action }: { action: string }) => {
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
  }, [socket, isScreenSharing]);

  // Reactively attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // Reactively attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

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

      // Update React State carefully
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setCurrentCameraId(nextCameraId);

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
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
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
        if (localVideoRef.current) {
          const previewStream = new MediaStream([screenTrack]);
          localVideoRef.current.srcObject = previewStream;
        }
      }
    } catch (err) {
      console.error("Error toggling screen share", err);
    }
  }, [isScreenSharing]);

  return {
    callState,
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
  };
}
