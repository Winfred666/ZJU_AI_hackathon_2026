"use client";

import { useEffect, useRef, useCallback } from "react";
import { KnowledgeGraph as KG, KnowledgeNode } from "@/types";
import { Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    import("@antv/g6").then((mod) => {
      if (token !== tokenRef.current) return;
      const G6Graph = mod.Graph as any;

      if (graphRef.current) {
        // Instead of destroying, just update data if instance exists
        const textbookColors = ["#1e3a8a", "#b91c1c", "#15803d", "#a21caf", "#c2410c"];
        const uniqueTextbookIds = [...new Set(graph.nodes.map((n) => n.textbookId))];
        const colorMap = new Map(uniqueTextbookIds.map((id, i) => [id, textbookColors[i % textbookColors.length]]));
        graphRef.current.updateData({
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            style: {
              size: 24,
              fill: colorMap.get(n.textbookId) ?? theme.nodeFill,
              stroke: colorMap.get(n.textbookId) ?? theme.nodeFill,
              labelText: n.name,
              labelPlacement: "bottom",
              labelFontSize: 10,
              labelFill: theme.nodeLabel,
              labelFontWeight: "500",
              labelOffsetY: 4,
            },
            data: { label: n.name, category: n.category },
          })),
          edges: graph.relations.map((r) => ({
            source: r.source,
            target: r.target,
            style: {
              stroke: theme.edgeStroke,
              endArrow: true,
              lineWidth: 1,
              labelText: r.relationType === "prerequisite" ? "前置" : "包含",
              labelFill: theme.edgeLabel,
              labelFontSize: 9,
              labelBackground: true,
              labelBackgroundFill: "#fff",
              labelBackgroundOpacity: 0.9,
              labelBackgroundRadius: 4,
              labelPadding: [2, 4],
            },
            data: {
              label: r.relationType === "prerequisite" ? "前置" : "包含",
              relationType: r.relationType,
            },
          })),
        });
        graphRef.current.render();
        return;
      }

      if (!containerRef.current) return;

      containerRef.current.innerHTML = "";

      // Calculate container dimensions for initial random scatter
      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 600;

      const textbookColors = ["#1e3a8a", "#b91c1c", "#15803d", "#a21caf", "#c2410c"];
      const uniqueTextbookIds = [...new Set(graph.nodes.map((n) => n.textbookId))];
      const colorMap = new Map(uniqueTextbookIds.map((id, i) => [id, textbookColors[i % textbookColors.length]]));

      const g = new G6Graph({
        container: containerRef.current!,
        autoFit: "view",
        data: {
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            // Smaller initial scatter area (200x200) to prevent sparseness
            style: {
              x: (Math.random() - 0.5) * 200 + width / 2,
              y: (Math.random() - 0.5) * 200 + height / 2,
              size: 24,
              fill: colorMap.get(n.textbookId) ?? theme.nodeFill,
              stroke: colorMap.get(n.textbookId) ?? theme.nodeFill,
              labelText: n.name,
              labelPlacement: "bottom",
              labelFontSize: 10,
              labelFill: theme.nodeLabel,
              labelFontWeight: "500",
              labelOffsetY: 4,
            },
            data: { label: n.name, category: n.category },
          })),
          edges: graph.relations.map((r) => ({
            source: r.source,
            target: r.target,
            style: {
              stroke: theme.edgeStroke,
              endArrow: true,
              lineWidth: 1,
              labelText: r.relationType === "prerequisite" ? "前置" : "包含",
              labelFill: theme.edgeLabel,
              labelFontSize: 9,
              labelBackground: true,
              labelBackgroundFill: "#fff",
              labelBackgroundOpacity: 0.9,
              labelBackgroundRadius: 4,
              labelPadding: [2, 4],
            },
            data: {
              label: r.relationType === "prerequisite" ? "前置" : "包含",
              relationType: r.relationType,
            },
          })),
        },
        layout: {
          type: "d3-force",
          linkDistance: 80,
          manyBody: {
            strength: -80, // Lower repulsion
            distanceMax: 300,
          },
          collide: {
            radius: 30,
            strength: 0.7,
          },
          velocityDecay: 0.2,
          alphaDecay: 0.03,
          animate: true,
        },
        node: {
          state: {
            active: { halo: true, haloFill: theme.nodeFill, haloOpacity: 0.15 },
            selected: { stroke: theme.nodeFill, lineWidth: 3 },
          },
        },
        behaviors: [
          "zoom-canvas",
          "drag-canvas",
          {
            type: "drag-element",
            enableTransient: true, // Key for conductive drag
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



  if (!graph || graph.nodes.length === 0) {
    if (loading) {
      return (
        <div className="flex size-full items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary/80" />
            <div className="text-xs font-medium text-muted-foreground/80 tracking-wider">
              正在生成知识图谱...
            </div>
          </div>
        </div>
      );
    }
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
    <div className="relative size-full overflow-hidden rounded-xl bg-background/50">
      <div ref={containerRef} className="size-full" data-testid="knowledge-graph" />
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary/80" />
            <div className="text-xs font-medium text-muted-foreground/80 tracking-wider">
              正在扩展知识图谱...
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background/80 px-3 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-opacity duration-300">
        Double click to extend graph
      </div>
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
