"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ParagliderCursor } from "@/components/paraglider-cursor";

const LazyHeroScene = dynamic(
  () => import("@/components/hero-scene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full md:h-[550px] bg-[radial-gradient(ellipse_at_center,var(--muted)_0%,transparent_70%)]" />
    ),
  },
);

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [shouldMountScene, setShouldMountScene] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldMountScene(true);
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsInView(visible);
        if (visible) setShouldMountScene(true); // lazy-mount once
      },
      {
        root: null,
        rootMargin: "300px 0px",
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* 3D Scene — background (lazy + viewport aware) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60">
        {shouldMountScene ? <LazyHeroScene active={isInView} /> : null}
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
