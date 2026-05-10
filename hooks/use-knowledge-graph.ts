"use client";

import { create } from "zustand";
import { Textbook, KnowledgeGraph, KnowledgeNode, KnowledgeRelation, TOCGraph, MergeConfig } from "@/types";

interface SessionState {
  textbooks: Textbook[];
  currentTextbookId: string | null;
  graphs: Record<string, KnowledgeGraph>;
  knowledgeGraph: KnowledgeGraph | null;
  ragReady: boolean;
  isLoading: boolean;
  error: string | null;

  loadTextbooks: () => Promise<void>;
  addTextbooks: (textbooks: Textbook[]) => void;
  removeTextbook: (id: string) => Promise<void>;
  selectTextbook: (id: string | null) => void;
  setTOCGraph: (textbookId: string, graph: TOCGraph | null) => void;
  mergeSubGraph: (textbookId: string, subGraph: KnowledgeGraph) => void;
  /** Merge two textbook graphs into a new merged graph */
  mergeGraphs: (idA: string, idB: string, config: MergeConfig) => string;
  setRagReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  textbooks: [],
  currentTextbookId: null,
  graphs: {},
  knowledgeGraph: null,
  ragReady: false,
  isLoading: false,
  error: null,

  loadTextbooks: async () => {
    try {
      const res = await fetch("/api/textbooks");
      const data = await res.json();
      if (data.textbooks) {
        set({ textbooks: data.textbooks as Textbook[] });
      }
    } catch { /* silent — server may not be ready */ }
  },

  addTextbooks: (textbooks) => set((s) => ({ textbooks: [...s.textbooks, ...textbooks] })),

  removeTextbook: async (id) => {
    const s = get();
    // Optimistic UI
    set({
      textbooks: s.textbooks.filter((tb) => tb.textbookId !== id),
      currentTextbookId: s.currentTextbookId === id ? null : s.currentTextbookId,
      knowledgeGraph: s.currentTextbookId === id ? null : s.knowledgeGraph,
    });
    try {
      await fetch(`/api/textbooks/${id}`, { method: "DELETE" });
    } catch { /* silent */ }
  },

  selectTextbook: async (id) => {
    if (!id) {
      set({ currentTextbookId: null, knowledgeGraph: null, ragReady: false });
      return;
    }
    const s = get();
    // Graph cached from upload — use immediately
    if (s.graphs[id]) {
      set({ currentTextbookId: id, knowledgeGraph: s.graphs[id], ragReady: false });
      return;
    }
    // Load graph on demand (e.g. after page refresh from persistent store)
    set({ currentTextbookId: id, knowledgeGraph: null, ragReady: false, isLoading: true });
    try {
      const res = await fetch(`/api/knowledge/${id}`);
      const data = await res.json();
      if (data.tocGraph) {
        const graph = { nodes: data.tocGraph.nodes, relations: data.tocGraph.relations };
        set((prev) => ({
          graphs: { ...prev.graphs, [id]: graph },
          knowledgeGraph: prev.currentTextbookId === id ? graph : prev.knowledgeGraph,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setTOCGraph: (textbookId, tocGraph) =>
    set((s) => {
      const graph = tocGraph
        ? { nodes: tocGraph.nodes, relations: tocGraph.relations }
        : null;
      const graphs = graph ? { ...s.graphs, [textbookId]: graph } : s.graphs;
      return {
        graphs,
        knowledgeGraph: s.currentTextbookId === textbookId ? graph : s.knowledgeGraph,
      };
    }),

  mergeSubGraph: (textbookId, subGraph) =>
    set((s) => {
      const prev = s.graphs[textbookId];
      if (!prev) return { knowledgeGraph: subGraph };
      const existingIds = new Set(prev.nodes.map((n) => n.id));
      const newNodes = subGraph.nodes.filter((n) => !existingIds.has(n.id));
      const newRelations = subGraph.relations.filter(
        (r) => !prev.relations.some((er) => er.source === r.source && er.target === r.target),
      );
      const merged: KnowledgeGraph = {
        nodes: [...prev.nodes, ...newNodes],
        relations: [...prev.relations, ...newRelations],
      };
      const graphs = { ...s.graphs, [textbookId]: merged };
      return {
        graphs,
        knowledgeGraph: s.currentTextbookId === textbookId ? merged : s.knowledgeGraph,
      };
    }),

  mergeGraphs: (idA, idB, config) => {
    const mergedId = `merged_${idA}_${idB}_${Date.now()}`;
    set((s) => {
      const graphA = s.graphs[idA];
      const graphB = s.graphs[idB];
      if (!graphA || !graphB) return {};

      const textbookA = s.textbooks.find((t) => t.textbookId === idA);
      const textbookB = s.textbooks.find((t) => t.textbookId === idB);
      if (!textbookA || !textbookB) return {};

      let nodes: KnowledgeNode[];
      let relations: KnowledgeRelation[];

      if (config.fuseSameName) {
        // Merge same-name nodes: deduplicate by lowercase name, keep first node, copy relations
        const nameMap = new Map<string, string>(); // lowercase name -> canonical node id
        const mergedNodes: KnowledgeNode[] = [];

        for (const n of [...graphA.nodes, ...graphB.nodes]) {
          const key = n.name.toLowerCase();
          const existing = nameMap.get(key);
          if (existing) continue; // skip duplicate
          nameMap.set(key, n.id);
          mergedNodes.push(n);
        }
        nodes = mergedNodes;

        // Remap relations to canonical node ids
        const remapped = new Map<string, string>();
        for (const n of [...graphA.nodes, ...graphB.nodes]) {
          const key = n.name.toLowerCase();
          const canonical = nameMap.get(key);
          if (canonical && canonical !== n.id) {
            remapped.set(n.id, canonical);
          }
        }
        const seen = new Set<string>();
        const mergedRelations: KnowledgeRelation[] = [];
        for (const r of [...graphA.relations, ...graphB.relations]) {
          const src = remapped.get(r.source) ?? r.source;
          const tgt = remapped.get(r.target) ?? r.target;
          const key = `${src}->${tgt}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mergedRelations.push({ ...r, source: src, target: tgt });
        }
        relations = mergedRelations;
      } else {
        // Keep nodes split: prefix ids with source textbook to avoid collision
        const prefixA = `${idA}::`;
        const prefixB = `${idB}::`;
        nodes = [
          ...graphA.nodes.map((n) => ({ ...n, id: prefixA + n.id, textbookId: idA })),
          ...graphB.nodes.map((n) => ({ ...n, id: prefixB + n.id, textbookId: idB })),
        ];
        const seenRel = new Set<string>();
        relations = [];
        for (const r of [
          ...graphA.relations.map((r) => ({
            ...r,
            source: prefixA + r.source,
            target: prefixA + r.target,
          })),
          ...graphB.relations.map((r) => ({
            ...r,
            source: prefixB + r.source,
            target: prefixB + r.target,
          })),
        ]) {
          const key = `${r.source}->${r.target}`;
          if (seenRel.has(key)) continue;
          seenRel.add(key);
          relations.push(r);
        }
      }

      const mergedGraph: KnowledgeGraph = { nodes, relations };

      const mergedTextbook: Textbook = {
        textbookId: mergedId,
        filename: `${textbookA.filename} + ${textbookB.filename}`,
        title: `${textbookA.title} + ${textbookB.title}`,
        totalPages: textbookA.totalPages + textbookB.totalPages,
        totalChars: textbookA.totalChars + textbookB.totalChars,
        chapters: [...textbookA.chapters, ...textbookB.chapters],
        tocText: "",
        tocPageRange: null,
        status: "full",
        statusDetail: config.fuseSameName ? "已合并（融合同名节点）" : "已合并（保持节点独立）",
        uploadedAt: Date.now(),
      };

      return {
        textbooks: [...s.textbooks, mergedTextbook],
        graphs: { ...s.graphs, [mergedId]: mergedGraph },
        currentTextbookId: mergedId,
        knowledgeGraph: mergedGraph,
        ragReady: false,
      };
    });
    return mergedId;
  },

  setRagReady: (ready) => set({ ragReady: ready }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
