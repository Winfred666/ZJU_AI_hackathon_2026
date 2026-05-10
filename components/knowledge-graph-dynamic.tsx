"use client";

import dynamic from "next/dynamic";

// G6 depends on browser Canvas — disable SSR to avoid hydration mismatches
export const KnowledgeGraphDynamic = dynamic(
  () =>
    import("./knowledge-graph").then((mod) => ({
      default: mod.KnowledgeGraphView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
        加载图谱中...
      </div>
    ),
  },
);
