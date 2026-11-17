import React from "react";
import { hydrateRoot } from "react-dom/client";
import { NaeilThemeProvider, useNaeilTheme } from "../../src/components/naeil-theme-provider";

function Controls() {
  const { setTheme } = useNaeilTheme();
  return <main>{["light", "dark", "system"].map(value => <button key={value} onClick={() => setTheme(value)}>{value}</button>)}</main>;
}
export function ThemeFixture() {
  return <NaeilThemeProvider><NaeilThemeProvider><Controls /></NaeilThemeProvider></NaeilThemeProvider>;
}
if (typeof window !== "undefined") hydrateRoot(document.getElementById("root")!, <ThemeFixture />);
