"use client";

import { create } from "zustand";
import { Textbook, KnowledgeGraph, TOCGraph } from "@/types";

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

  setRagReady: (ready) => set({ ragReady: ready }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
