"use client";

import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  barCount?: number;
  className?: string;
  /** Color of the active bars (CSS color value) */
  barColor?: string;
  /** Color of the dormant/idle bars */
  idleColor?: string;
  /** Vertical size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Real-time audio visualizer that renders animated vertical bars
 * based on frequency data from a MediaStream's audio track.
 *
 * Uses the Web Audio API (AudioContext + AnalyserNode) for
 * lightweight frequency analysis at ~30fps via requestAnimationFrame.
 *
 * Automatically goes dormant (flat bars) when:
 * - the stream is null
 * - the mic is muted (isMuted=true)
 * - no significant audio is detected
 */
export function AudioVisualizer({
  stream,
  isMuted = false,
  barCount = 4,
  className = "",
  barColor = "#818cf8", // indigo-400
  idleColor = "#3f3f46", // zinc-700
  size = "sm",
}: AudioVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(() =>
    new Array(barCount).fill(0),
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If muted or no stream, show idle bars
    if (!stream || isMuted) {
      setLevels(new Array(barCount).fill(0));
      return;
    }

    // Check stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevels(new Array(barCount).fill(0));
      return;
    }

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume().catch(console.error);
      }
    } catch {
      return;
    }

    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64; // Small FFT for perf; gives 32 frequency bins
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;

    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch {
      ctx.close();
      return;
    }
    sourceRef.current = source;
    source.connect(analyser);
    // Do NOT connect to ctx.destination — we don't want to hear ourselves

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // Sample evenly-spaced frequency bins and normalize 0-1
      const step = Math.max(1, Math.floor(dataArray.length / barCount));
      const newLevels: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(i * step, dataArray.length - 1);
        // Emphasize voice range (lower bins) with a slight boost
        const raw = dataArray[idx] / 255;
        newLevels.push(Math.min(1, raw * 1.4));
      }
      setLevels(newLevels);

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      source.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream, isMuted, barCount]);

  const barHeights: Record<
    string,
    { min: number; max: number; width: string; gap: string }
  > = {
    sm: { min: 4, max: 14, width: "w-[3px]", gap: "gap-[2px]" },
    md: { min: 6, max: 20, width: "w-1", gap: "gap-[3px]" },
    lg: { min: 8, max: 28, width: "w-1.5", gap: "gap-1" },
  };

  const { min, max, width, gap } = barHeights[size];

  return (
    <div
      className={`flex items-center ${gap} ${className}`}
      aria-label="Audio level indicator"
      role="img"
    >
      {levels.map((level, i) => {
        const isActive = level > 0.05;
        const height = isActive ? min + level * (max - min) : min;
        return (
          <div
            key={i}
            className={`${width} rounded-full transition-all duration-100`}
            style={{
              height: `${height}px`,
              backgroundColor: isActive ? barColor : idleColor,
              opacity: isActive ? 0.9 + level * 0.1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
