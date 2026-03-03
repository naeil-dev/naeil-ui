"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WorkflowNode {
  id: string;
  label: string;
  type: "source" | "process" | "storage" | "output" | "ai";
  /** Position in % (0–100) relative to container */
  position: { x: number; y: number };
  detail: {
    description: string;
    tech: string[];
    meta?: string;
  };
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

export interface WorkflowDiagramProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  accent: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Nodes connected to the given node (any direction). */
function connectedIds(nodeId: string, edges: WorkflowEdge[]): Set<string> {
  const ids = new Set<string>();
  ids.add(nodeId);
  for (const e of edges) {
    if (e.from === nodeId) ids.add(e.to);
    if (e.to === nodeId) ids.add(e.from);
  }
  return ids;
}

/** Build a cubic‑bezier `d` attribute (vertical flow). */
function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

/* ------------------------------------------------------------------ */
/*  Sub‑components                                                     */
/* ------------------------------------------------------------------ */

function Tooltip({
  node,
  accent,
  containerRect,
  nodeRect,
}: {
  node: WorkflowNode;
  accent: string;
  containerRect: DOMRect | null;
  nodeRect: DOMRect | null;
}) {
  if (!containerRect || !nodeRect) return null;

  const tooltipWidth = 240;
  const gap = 12;

  // Position relative to container
  const nodeCenter = nodeRect.left + nodeRect.width / 2 - containerRect.left;
  const nodeBottom = nodeRect.bottom - containerRect.top + gap;

  // Keep within container bounds
  let left = nodeCenter - tooltipWidth / 2;
  if (left < 8) left = 8;
  if (left + tooltipWidth > containerRect.width - 8)
    left = containerRect.width - tooltipWidth - 8;

  return (
    <div
      className="pointer-events-none absolute z-20 w-[240px] rounded-lg border border-border bg-popover p-3 shadow-md transition-all duration-150"
      style={{ left, top: nodeBottom }}
    >
      <p className="mb-2 text-[13px] leading-snug text-foreground">
        {node.detail.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {node.detail.tech.map((t) => (
          <span
            key={t}
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background: `color-mix(in oklch, ${accent} 10%, transparent)`,
              color: accent,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      {node.detail.meta && (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          {node.detail.meta}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile fallback — vertical pipeline                                */
/* ------------------------------------------------------------------ */

function MobilePipeline({
  nodes,
  edges,
  accent,
}: WorkflowDiagramProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Topological-ish order: sort by y position
  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);

  return (
    <div className="flex flex-col gap-0">
      {sorted.map((node, i) => {
        const isOpen = expanded === node.id;
        return (
          <div key={node.id} className="flex items-start gap-4">
            {/* Marker */}
            <div className="flex flex-col items-center">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                style={{
                  borderColor: accent,
                  background:
                    node.type === "ai" || node.type === "output"
                      ? accent
                      : "transparent",
                }}
              />
              {i < sorted.length - 1 && (
                <div className="w-px flex-1 min-h-[32px] bg-border" />
              )}
            </div>

            {/* Content */}
            <button
              type="button"
              className="mb-4 flex-1 text-left"
              onClick={() => setExpanded(isOpen ? null : node.id)}
            >
              <p className="text-[13px] font-medium text-foreground">
                {node.label}
              </p>
              {isOpen && (
                <div className="mt-2 rounded-lg border border-border bg-popover p-3">
                  <p className="mb-2 text-[12px] leading-relaxed text-muted-foreground">
                    {node.detail.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {node.detail.tech.map((t) => (
                      <span
                        key={t}
                        className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                        style={{
                          background: `color-mix(in oklch, ${accent} 10%, transparent)`,
                          color: accent,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  {node.detail.meta && (
                    <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                      {node.detail.meta}
                    </p>
                  )}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main diagram (desktop)                                             */
/* ------------------------------------------------------------------ */

export function WorkflowDiagram({
  nodes,
  edges,
  accent,
}: WorkflowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null);
  const [positions, setPositions] = useState<
    Map<string, { cx: number; cy: number }>
  >(new Map());
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  // Compute pixel centres after layout
  const measure = useCallback(() => {
    const cEl = containerRef.current;
    if (!cEl) return;
    const cRect = cEl.getBoundingClientRect();
    setContainerRect(cRect);
    const map = new Map<string, { cx: number; cy: number }>();
    nodeRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      map.set(id, {
        cx: r.left + r.width / 2 - cRect.left,
        cy: r.top + r.height / 2 - cRect.top,
      });
    });
    setPositions(map);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Re‑measure once after first paint (node refs populated)
  useEffect(() => {
    const t = setTimeout(measure, 50);
    return () => clearTimeout(t);
  }, [measure]);

  const connected = hovered ? connectedIds(hovered, edges) : null;

  const handleHover = (id: string | null) => {
    setHovered(id);
    if (id) {
      const el = nodeRefs.current.get(id);
      if (el) setHoveredRect(el.getBoundingClientRect());
    } else {
      setHoveredRect(null);
    }
  };

  const hoveredNode = hovered
    ? nodes.find((n) => n.id === hovered) ?? null
    : null;

  // Container height based on node Y spread
  const maxY = Math.max(...nodes.map((n) => n.position.y));
  const containerHeight = Math.max(400, (maxY / 100) * 600 + 60);

  return (
    <>
      {/* Desktop */}
      <div
        ref={containerRef}
        className="relative hidden md:block"
        style={{ height: containerHeight }}
        onMouseLeave={() => handleHover(null)}
      >
        {/* SVG edges */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="5"
              refX="5"
              refY="2.5"
              orient="auto"
            >
              <polygon
                points="0 0, 6 2.5, 0 5"
                fill={`color-mix(in oklch, ${accent} 30%, transparent)`}
              />
            </marker>
          </defs>
          {edges.map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;

            const isConnected =
              !connected ||
              (connected.has(edge.from) && connected.has(edge.to));
            const isDirectlyConnected =
              hovered === edge.from || hovered === edge.to;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={edgePath(from.cx, from.cy, to.cx, to.cy)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={isDirectlyConnected ? 2 : 1.5}
                  strokeOpacity={
                    !connected ? 0.15 : isConnected ? 0.4 : 0.05
                  }
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-200"
                  strokeDasharray={edge.animated ? "6 4" : undefined}
                >
                  {edge.animated && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-20"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
                {edge.label && (
                  <text
                    x={(from.cx + to.cx) / 2}
                    y={(from.cy + to.cy) / 2 - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px] font-mono"
                    opacity={!connected ? 0.4 : isConnected ? 0.7 : 0.1}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isDim = connected && !connected.has(node.id);
          const isActive = hovered === node.id;

          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-default select-none rounded-lg border px-4 py-2.5 font-mono text-[13px] font-medium transition-all duration-200"
              style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}%`,
                borderColor: isDim
                  ? "var(--border)"
                  : node.type === "ai"
                    ? `color-mix(in oklch, ${accent} ${isActive ? "50%" : "25%"}, transparent)`
                    : node.type === "output"
                      ? `color-mix(in oklch, ${accent} ${isActive ? "40%" : "18%"}, transparent)`
                      : "var(--border)",
                background: isDim
                  ? "var(--background)"
                  : node.type === "ai"
                    ? `color-mix(in oklch, ${accent} ${isActive ? "12%" : "6%"}, transparent)`
                    : "var(--background)",
                opacity: isDim ? 0.3 : 1,
                transform: `translate(-50%, -50%) ${isActive ? "scale(1.04)" : "scale(1)"}`,
                zIndex: isActive ? 10 : 1,
              }}
              onMouseEnter={() => handleHover(node.id)}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}: ${node.detail.description}`}
              onFocus={() => handleHover(node.id)}
              onBlur={() => handleHover(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleHover(hovered === node.id ? null : node.id);
                }
              }}
            >
              {node.label}
            </div>
          );
        })}

        {/* Tooltip */}
        {hoveredNode && (
          <Tooltip
            node={hoveredNode}
            accent={accent}
            containerRect={containerRect}
            nodeRect={hoveredRect}
          />
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobilePipeline nodes={nodes} edges={edges} accent={accent} />
      </div>
    </>
  );
}
