"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const ACCENT_PRESETS = [
  { name: "블루 (기본)", hue: 259, chroma: 0.214 },
  { name: "퍼플", hue: 303, chroma: 0.22 },
  { name: "그린", hue: 162, chroma: 0.17 },
  { name: "오렌지", hue: 55, chroma: 0.22 },
  { name: "레드", hue: 25, chroma: 0.24 },
] as const;

function generateAccentScale(hue: number, chroma: number) {
  // Generate a 50-950 OKLCH scale for the given hue/chroma
  const steps = [
    { name: "50", l: 0.97, c: chroma * 0.065 },
    { name: "100", l: 0.932, c: chroma * 0.15 },
    { name: "200", l: 0.882, c: chroma * 0.275 },
    { name: "300", l: 0.809, c: chroma * 0.49 },
    { name: "400", l: 0.707, c: chroma * 0.77 },
    { name: "500", l: 0.623, c: chroma },
    { name: "600", l: 0.546, c: chroma * 1.14 },
    { name: "700", l: 0.488, c: chroma * 1.13 },
    { name: "800", l: 0.424, c: chroma * 0.93 },
    { name: "900", l: 0.379, c: chroma * 0.68 },
    { name: "950", l: 0.282, c: chroma * 0.42 },
  ];
  return steps.map((s) => ({
    name: s.name,
    value: `oklch(${s.l} ${Number(s.c.toFixed(3))} ${hue})`,
  }));
}

export function AccentPicker() {
  const [active, setActive] = useState(0);

  function applyAccent(index: number) {
    setActive(index);
    const preset = ACCENT_PRESETS[index];
    const scale = generateAccentScale(preset.hue, preset.chroma);
    const root = document.documentElement;
    for (const step of scale) {
      root.style.setProperty(`--accent-${step.name}`, step.value);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACCENT_PRESETS.map((preset, i) => (
        <Button
          key={preset.name}
          variant={active === i ? "default" : "outline"}
          size="sm"
          onClick={() => applyAccent(i)}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
