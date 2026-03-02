"use client";

import { useEffect, useRef, useState } from "react";

export function ParagliderCursor({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const gliderRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const visible = useRef(false);
  const direction = useRef(1); // 1 = right, -1 = left
  const [show, setShow] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      target.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      // Track direction for tilt
      const dx = target.current.x - pos.current.x;
      if (Math.abs(dx) > 1) {
        direction.current = dx > 0 ? 1 : -1;
      }
      if (!visible.current) {
        visible.current = true;
        setShow(true);
        // Snap to initial position (no lag on first enter)
        pos.current = { ...target.current };
      }
    };

    const onLeave = () => {
      visible.current = false;
      setShow(false);
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    let raf: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.06);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.06);

      if (gliderRef.current) {
        const dx = target.current.x - pos.current.x;
        const tilt = Math.max(-15, Math.min(15, dx * 0.3));
        gliderRef.current.style.transform = `translate(${pos.current.x - 24}px, ${pos.current.y - 32}px) rotate(${tilt}deg)`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  return (
    <div
      ref={gliderRef}
      className="pointer-events-none absolute left-0 top-0 z-20 transition-opacity duration-300"
      style={{ opacity: show ? 1 : 0 }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Canopy */}
        <path
          d="M8 22 Q12 6 32 4 Q52 6 56 22 Q44 18 32 20 Q20 18 8 22Z"
          fill="white"
          fillOpacity="0.7"
        />
        {/* Lines */}
        <line x1="12" y1="21" x2="30" y2="42" stroke="white" strokeWidth="0.6" opacity="0.5" />
        <line x1="22" y1="19" x2="31" y2="42" stroke="white" strokeWidth="0.6" opacity="0.5" />
        <line x1="32" y1="18" x2="32" y2="42" stroke="white" strokeWidth="0.6" opacity="0.5" />
        <line x1="42" y1="19" x2="33" y2="42" stroke="white" strokeWidth="0.6" opacity="0.5" />
        <line x1="52" y1="21" x2="34" y2="42" stroke="white" strokeWidth="0.6" opacity="0.5" />
        {/* Person */}
        <circle cx="32" cy="45" r="2.5" fill="white" fillOpacity="0.8" />
        <path
          d="M30 48 L32 56 L34 48"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        <path
          d="M28 51 L32 49 L36 51"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
