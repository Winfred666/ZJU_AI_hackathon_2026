"use client";

import { create } from "zustand";
import { Textbook, KnowledgeGraph, TOCGraph } from "@/types";

interface SessionState {
  textbooks: Textbook[];
  currentTextbookId: string | null;
  /** Graphs keyed by textbookId */
  graphs: Record<string, KnowledgeGraph>;
  knowledgeGraph: KnowledgeGraph | null;
  ragReady: boolean;
  isLoading: boolean;
  error: string | null;

  addTextbooks: (textbooks: Textbook[]) => void;
  selectTextbook: (id: string | null) => void;
  /** Store TOC graph for a specific textbook and show it if current */
  setTOCGraph: (textbookId: string, graph: TOCGraph | null) => void;
  /** Merge a drill-down sub-graph into the current textbook's graph */
  mergeSubGraph: (textbookId: string, subGraph: KnowledgeGraph) => void;
  setRagReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  textbooks: [],
  currentTextbookId: null,
  graphs: {},
  knowledgeGraph: null,
  ragReady: false,
  isLoading: false,
  error: null,

  addTextbooks: (textbooks) => set((s) => ({ textbooks: [...s.textbooks, ...textbooks] })),

  selectTextbook: (id) =>
    set((s) => {
      const graph = id ? s.graphs[id] ?? null : null;
      return { currentTextbookId: id, knowledgeGraph: graph, ragReady: false };
    }),

  setTOCGraph: (textbookId, tocGraph) =>
    set((s) => {
      const graph = tocGraph
        ? { nodes: tocGraph.nodes, relations: tocGraph.relations }
        : null;
      const graphs = graph ? { ...s.graphs, [textbookId]: graph } : s.graphs;
      // Show this graph if the textbook is currently selected
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
