"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}

export default function PullToRefresh({
  children,
  onRefresh,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  const MAX_PULL = 80;
  const THRESHOLD = 60;

  useEffect(() => {
    // Only enable pull-to-refresh on mobile/touch devices
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pulling if we are at the very top of the page
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      currentYRef.current = e.touches[0].clientY;
      const distance = currentYRef.current - startYRef.current;

      // Only respond to downward pulls
      if (distance > 0) {
        // Prevent default scrolling when pulling down at the top
        if (e.cancelable) {
          e.preventDefault();
        }

        // Add resistance feeling
        const resistance = Math.min(distance * 0.4, MAX_PULL);
        setPullDistance(resistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance > THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD); // Hold at threshold while refreshing

        try {
          await onRefresh();
        } catch (error) {
          console.error("Refresh failed:", error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Did not pull far enough, snap back
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false, // Must be false to preventDefault
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <>
      {/* PTR Indicator Area */}
      <div
        className="fixed top-0 left-0 w-full flex justify-center items-center overflow-hidden z-[100] pointer-events-none"
        style={{
          height: `${MAX_PULL}px`,
        }}
      >
        <div
          className="bg-zinc-800 border border-zinc-700 rounded-full p-2 shadow-lg flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `translateY(${
              isRefreshing
                ? MAX_PULL / 2 - 20
                : pullDistance > 0
                  ? pullDistance - 40 // Start hidden, move down
                  : -50 // Fully hidden initially
            }px) scale(${Math.min(pullDistance / THRESHOLD, 1)})`,
            opacity: pullDistance / THRESHOLD,
          }}
        >
          <RefreshCw
            className={`w-6 h-6 text-indigo-400 ${
              isRefreshing ? "animate-spin" : ""
            }`}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`,
            }}
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div
        className="min-h-screen transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${isRefreshing ? THRESHOLD : pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </>
  );
}
