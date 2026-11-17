import { defineConfig } from "tsup";

// Head/bootstrap consumers must not enter a client component graph.
export default defineConfig({
  tsconfig: "tsconfig.build.json",
  entry: ["src/theme-bootstrap.tsx"],
  format: ["esm"],
  dts: true,
  splitting: false,
  clean: false,
  outDir: "dist",
  external: ["react", "react/jsx-runtime"],
});
