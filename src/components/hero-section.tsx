"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ChevronsDown, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "@/app/hero.module.css";

function WaterVideo({ source, active, onBlocked, onFailure }: {
  source: string;
  active: boolean;
  onBlocked: () => void;
  onFailure: (source: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    if (active) {
      video.play().catch((error: unknown) => {
        // A failed file is not a user pause: another theme can still play.
        if (!cancelled && error instanceof DOMException && error.name === "NotAllowedError") {
          onBlocked();
        }
      });
    } else {
      video.pause();
    }
    return () => {
      cancelled = true;
      video.pause();
    };
  }, [active, onBlocked]);

  return (
    <video
      ref={videoRef}
      className={styles.water}
      data-ready={ready}
      src={source}
      muted
      playsInline
      loop
      preload="none"
      tabIndex={-1}
      onPlaying={() => setReady(true)}
      onError={() => {
        setReady(false);
        onFailure(source);
      }}
    />
  );
}

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const t = useTranslations("hero");
  const source = motionAllowed && resolvedTheme
    ? `/images/hero/sunset-water-${resolvedTheme === "dark" ? "dark" : "light"}.mp4`
    : undefined;
  const active = inView && pageVisible && !paused && !!source && failedSource !== source;
  const handleBlocked = useCallback(() => setPaused(true), []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      data-active={active}
      aria-label={t("sceneLabel")}
    >
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.photograph}>
          {/* Only the recorded water strip plays; the approved sky/land stay still. */}
          {source && (
            <WaterVideo
              key={source}
              source={source}
              active={active}
              onBlocked={handleBlocked}
              onFailure={setFailedSource}
            />
          )}
        </div>
      </div>

      <Button asChild variant="ghost" size="icon" className={styles.scrollHint}>
        <a href="#projects" aria-label={t("viewProjects")}>
          <ChevronsDown aria-hidden="true" />
        </a>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.motionControl}
        hidden={!source || failedSource === source}
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? t("resumeMotion") : t("pauseMotion")}
        title={paused ? t("resumeMotion") : t("pauseMotion")}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
    </section>
  );
}
