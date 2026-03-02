"use client";

import { useRef } from "react";
import { HeroScene } from "@/components/hero-scene";
import { ParagliderCursor } from "@/components/paraglider-cursor";

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* 3D Scene — background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60">
        <HeroScene />
      </div>

      {/* Paraglider follows mouse — desktop only */}
      <div className="hidden md:block">
        <ParagliderCursor containerRef={heroRef} />
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/50"
        >
          <path d="M7 13l5 5 5-5" />
          <path d="M7 6l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
}
