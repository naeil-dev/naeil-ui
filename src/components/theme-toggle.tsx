"use client";

import { useNaeilTheme } from "./naeil-theme-provider";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useNaeilTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-24">
        …
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-24"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </Button>
  );
}
