"use client";

import { useRef } from "react";

export function useSwipeDismiss({
  onDismiss,
  direction = "left",
  threshold = 60,
}: {
  onDismiss: () => void;
  direction?: "left" | "right";
  threshold?: number;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      startX.current = e.clientX;
      startY.current = e.clientY;
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.clientX - startX.current;
      const dy = Math.abs(e.clientY - startY.current);
      if (dy > 40) {
        startX.current = null;
        return;
      }
      if (direction === "left" && dx < -threshold) {
        onDismiss();
        startX.current = null;
      } else if (direction === "right" && dx > threshold) {
        onDismiss();
        startX.current = null;
      }
    },
    onPointerUp: () => {
      startX.current = null;
      startY.current = null;
    },
    onPointerCancel: () => {
      startX.current = null;
      startY.current = null;
    },
  };
}
