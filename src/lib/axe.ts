/**
 * Dev-only axe-core accessibility checker.
 * Dynamically imported so it's tree-shaken from production builds.
 */
export async function initAxe() {
  if (typeof window === "undefined") return;

  const React = await import("react");
  const ReactDOM = await import("react-dom");
  const axe = await import("@axe-core/react");

  // @axe-core/react expects React & ReactDOM module objects
  const axeFn = axe.default ?? axe;
  axeFn(React, ReactDOM, 1000);
}
