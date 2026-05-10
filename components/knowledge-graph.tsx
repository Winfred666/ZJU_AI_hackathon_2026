"use client";

import { useEffect, useRef } from "react";
import { Graph } from "@antv/g6";

// ------ Types (mirrors V0.1 schema) ------

interface KnowledgeNode {
  id: string;
  name: string;
  definition: string;
  category: "核心概念" | "定理" | "方法" | "现象";
  chapter: string;
  page: number;
}

interface KnowledgeRelation {
  source: string;
  target: string;
  relationType: "prerequisite" | "contains";
  description: string;
}

interface KnowledgeGraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeRelation[];
  className?: string;
}

// ------ Category → colour mapping ------

const categoryPalette: Record<KnowledgeNode["category"], string> = {
  "核心概念": "#7e3feb",
  "定理": "#f59e0b",
  "方法": "#10b981",
  "现象": "#3b82f6",
};

// ------ Helper: build G6 data ------

function buildGraphData(nodes: KnowledgeNode[], edges: KnowledgeRelation[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      data: n as unknown as Record<string, unknown>,
      style: { fill: categoryPalette[n.category] },
    })),
    edges: edges.map((e) => ({
      id: `${e.source}-${e.target}-${e.relationType}`,
      source: e.source,
      target: e.target,
      data: e as unknown as Record<string, unknown>,
    })),
  };
}

const edgeDashPattern: Record<KnowledgeRelation["relationType"], number[]> = {
  prerequisite: [6, 4],
  contains: [],
};

// ------ Component ------

export function KnowledgeGraph({
  nodes,
  edges,
  className,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const data = buildGraphData(nodes, edges);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = new Graph({
      container: containerRef.current,
      autoFit: "view",
      // G6 v5 style callbacks receive NodeData / EdgeData whose `.data` is
      // Record<string, unknown> — cast to our known types internally.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      node: {
        style: {
          size: 48,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelText: (d: any) => (d.data as KnowledgeNode)?.name ?? d.id,
          labelFill: "#1a1a1a",
          labelFontSize: 12,
          labelPlacement: "bottom",
          labelOffsetY: 8,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fill: (d: any) => (d.style as { fill?: string })?.fill ?? "#7e3feb",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stroke: (d: any) =>
            (d.style as { fill?: string })?.fill ?? "#7e3feb",
          lineWidth: 2,
        },
        state: {
          active: { halo: true, haloFill: "#7e3feb", haloOpacity: 0.3 },
        },
      },
      edge: {
        style: {
          lineWidth: 2,
          stroke: "#8b9baf",
          endArrow: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineDash: (d: any) => {
            const t = (d.data as KnowledgeRelation)?.relationType;
            return t ? edgeDashPattern[t] : [];
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelText: (d: any) =>
            (d.data as KnowledgeRelation)?.relationType === "prerequisite"
              ? "前置"
              : "包含",
          labelFill: "#8b9baf",
          labelFontSize: 10,
          labelBackground: true,
          labelBackgroundFill: "#fff",
          labelBackgroundOpacity: 0.8,
          labelBackgroundRadius: 4,
          labelPadding: [1, 4],
        },
      },
      layout: {
        type: "d3-force",
        linkDistance: 180,
        collide: 60,
        manyBody: { strength: -400 },
        animated: true,
      },
      behaviors: [
        "zoom-canvas",
        "drag-canvas",
        "drag-element",
        "hover-element",
      ],
      animation: true,
    });

    graph.render();
    graphRef.current = graph;

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [nodes, edges]);

  return <div ref={containerRef} className={className} />;
}
