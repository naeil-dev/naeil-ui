import React from "react";
import { createRoot } from "react-dom/client";
import { NaeilThemeProvider } from "@naeil/ui/naeil-shell";
import "./globals.css";
createRoot(document.getElementById("root")!).render(<NaeilThemeProvider><main><h1>Rendered theme content</h1><p>The first background must match the preference.</p></main></NaeilThemeProvider>);
