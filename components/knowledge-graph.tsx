"use client";

import { useEffect, useRef } from "react";
import { KnowledgeGraph as KG } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

// G6 v5.1.1 calls console.error internally during destroy() with
// "[G6 …] The graph instance has been destroyed". This fires harmlessly
// in React Strict Mode (double-invoke effects). Suppress just G6 noise.
function silenceG6Console<T>(fn: () => T): T {
  const prev = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[G6")) return;
    prev.apply(console, args);
  };
  try {
    return fn();
  } finally {
    console.error = prev;
  }
}

export function KnowledgeGraphView({
  graph,
  loading,
}: {
  graph: KG | null;
  loading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ destroy: () => void } | null>(null);
  // Token-based stale-import guard: each effect invocation gets a unique
  // token. When an async import resolves it checks whether a newer effect
  // has already been scheduled (React Strict Mode double-invoke, HMR).
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!graph || !containerRef.current) return;

    const token = ++tokenRef.current;

    // Clear any previous G6 canvas left by Strict Mode double-invoke
    if (graphRef.current) {
      silenceG6Console(() => graphRef.current!.destroy());
      graphRef.current = null;
    }
    containerRef.current.innerHTML = "";

    import("@antv/g6").then((mod) => {
      // Bail if a newer effect invocation has started (Stale import from
      // Strict Mode double-invoke or rapid dependency changes).
      if (token !== tokenRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const G6Graph = mod.Graph as any;

      const g = new G6Graph({
        container: containerRef.current!,
        autoFit: "view",
        data: {
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            data: { label: n.name, category: n.category },
          })),
          edges: graph.relations.map((r) => ({
            source: r.source,
            target: r.target,
            data: {
              label: r.relationType === "prerequisite" ? "前置" : "包含",
              relationType: r.relationType,
            },
          })),
        },
        layout: {
          type: "d3-force",
          linkDistance: 150,
          collide: 50,
          manyBody: { strength: -300 },
          animate: true,
        },
        node: {
          style: {
            size: 42,
            labelText: (d: { data?: { label?: string } }) =>
              d.data?.label ?? "",
            labelPlacement: "bottom",
            labelFontSize: 11,
            labelFill: "#1a1a1a",
            labelOffsetY: 6,
          },
          palette: {
            field: (d: { data?: { category?: string } }) => d.data?.category,
            color: ["#7e3feb", "#f59e0b", "#10b981", "#3b82f6"],
          },
          state: {
            active: { halo: true, haloFill: "#7e3feb", haloOpacity: 0.25 },
          },
        },
        edge: {
          style: {
            stroke: (d: { data?: { relationType?: string } }) =>
              d.data?.relationType === "prerequisite" ? "#ef4444" : "#8b9baf",
            lineDash: (d: { data?: { relationType?: string } }) =>
              d.data?.relationType === "prerequisite" ? [6, 4] : [],
            endArrow: true,
            lineWidth: 2,
            labelText: (d: { data?: { label?: string } }) =>
              d.data?.label ?? "",
            labelFill: "#8b9baf",
            labelFontSize: 10,
            labelBackground: true,
            labelBackgroundFill: "#fff",
            labelBackgroundOpacity: 0.8,
            labelBackgroundRadius: 4,
            labelPadding: [1, 4],
          },
        },
        behaviors: [
          "zoom-canvas",
          "drag-canvas",
          "drag-element",
          "hover-element",
        ],
        animation: true,
      });

      g.render();
      graphRef.current = g;
    });

    return () => {
      if (graphRef.current) {
        silenceG6Console(() => graphRef.current!.destroy());
        graphRef.current = null;
      }
    };
  }, [graph]);

  if (loading) return <Skeleton className="size-full" />;
  if (!graph || graph.nodes.length === 0) {
    return (
      <div
        className="flex size-full items-center justify-center text-sm text-muted-foreground"
        data-testid="knowledge-graph-empty"
      >
        暂无知识图谱
      </div>
    );
  }
  return (
    <div ref={containerRef} className="size-full" data-testid="knowledge-graph" />
  );
}
