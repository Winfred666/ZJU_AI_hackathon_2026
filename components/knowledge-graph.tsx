"use client";

import { useEffect, useRef, useCallback } from "react";
import { KnowledgeGraph as KG, KnowledgeNode } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

/**
 * Utility to read CSS variables for G6 configuration
 */
function getThemeVars() {
  if (typeof window === "undefined") return null;
  const style = getComputedStyle(document.documentElement);
  return {
    nodeFill: style.getPropertyValue("--g6-node-fill").trim() || "#1e3a8a",
    nodeLabel: style.getPropertyValue("--g6-node-label").trim() || "#1e3a8a",
    edgeStroke: style.getPropertyValue("--g6-edge-stroke").trim() || "#cbd5e1",
    edgeLabel: style.getPropertyValue("--g6-edge-label").trim() || "#64748b",
    background: style.getPropertyValue("--g6-background").trim() || "transparent",
  };
}

export function KnowledgeGraphView({
  graph,
  loading,
  onNodeDoubleClick,
}: {
  graph: KG | null;
  loading?: boolean;
  onNodeDoubleClick?: (node: KnowledgeNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const tokenRef = useRef(0);

  const handleResetView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomTo(1, { duration: 500 });
      graphRef.current.fitView({ duration: 500 });
    }
  }, []);

  useEffect(() => {
    if (!graph || !containerRef.current) return;

    const token = ++tokenRef.current;
    const theme = getThemeVars();
    if (!theme) return;

    // Clear any previous G6 canvas left by Strict Mode double-invoke
    if (graphRef.current) {
      silenceG6Console(() => graphRef.current!.destroy());
      graphRef.current = null;
    }
    containerRef.current.innerHTML = "";

    import("@antv/g6").then((mod) => {
      if (token !== tokenRef.current) return;

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
          type: "force",
          linkDistance: 180,
          nodeStrength: -2000,
          edgeStrength: 0.1,
          preventOverlap: true,
          nodeSize: 40, // Larger virtual size for overlap prevention (node is 24)
          velocityDecay: 0.3, 
          alphaDecay: 0.05,
          animate: true,
        },
        node: {
          style: {
            size: 24,
            fill: theme.nodeFill,
            stroke: theme.nodeFill,
            labelText: (d: { data?: { label?: string } }) => d.data?.label ?? "",
            labelPlacement: "bottom",
            labelFontSize: 10,
            labelFill: theme.nodeLabel,
            labelFontWeight: "500",
            labelOffsetY: 4,
          },
          state: {
            active: { halo: true, haloFill: theme.nodeFill, haloOpacity: 0.15 },
            selected: { stroke: theme.nodeFill, lineWidth: 3 },
          },
        },
        edge: {
          style: {
            stroke: theme.edgeStroke,
            endArrow: true,
            lineWidth: 1,
            labelText: (d: { data?: { label?: string } }) => d.data?.label ?? "",
            labelFill: theme.edgeLabel,
            labelFontSize: 9,
            labelBackground: true,
            labelBackgroundFill: "#fff",
            labelBackgroundOpacity: 0.9,
            labelBackgroundRadius: 4,
            labelPadding: [2, 4],
          },
        },
        behaviors: [
          "zoom-canvas",
          "drag-canvas",
          {
            type: "drag-element",
            enableTransient: true,
            // In G6 v5, the layout automatically reacts to node position changes 
            // if configured correctly, but we can nudge it for more "conductivity"
          },
          "hover-element",
          "click-element",
        ],
        animation: true,
      });

      g.render();
      graphRef.current = g;

      if (onNodeDoubleClick) {
        g.on("node:dblclick", (evt: any) => {
          const nodeId = evt.target?.id;
          if (!nodeId) return;
          const node = graph.nodes.find((n) => n.id === nodeId);
          if (node?.isTocNode) {
            onNodeDoubleClick(node);
          }
        });
      }
    });

    return () => {
      if (graphRef.current) {
        silenceG6Console(() => graphRef.current!.destroy());
        graphRef.current = null;
      }
    };
  }, [graph, onNodeDoubleClick]);

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
    <div className="relative size-full overflow-hidden rounded-xl">
      <div ref={containerRef} className="size-full" data-testid="knowledge-graph" />
      <Button
        variant="outline"
        size="icon"
        className="absolute bottom-4 right-4 z-10 size-8 rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
        onClick={handleResetView}
        title="重置视图"
      >
        <Home className="size-4" />
      </Button>
    </div>
  );
}
