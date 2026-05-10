"use client";

import { create } from "zustand";
import { Textbook, KnowledgeGraph, TOCGraph } from "@/types";

interface SessionState {
  textbooks: Textbook[];
  currentTextbookId: string | null;
  knowledgeGraph: KnowledgeGraph | null;
  ragReady: boolean;
  isLoading: boolean;
  error: string | null;

  addTextbooks: (textbooks: Textbook[]) => void;
  selectTextbook: (id: string | null) => void;
  /** Set the TOC-level graph (from parse response) */
  setTOCGraph: (graph: TOCGraph | null) => void;
  /** Merge a drill-down sub-graph into the existing graph */
  mergeSubGraph: (subGraph: KnowledgeGraph) => void;
  setRagReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  textbooks: [],
  currentTextbookId: null,
  knowledgeGraph: null,
  ragReady: false,
  isLoading: false,
  error: null,

  addTextbooks: (textbooks) => set((s) => ({ textbooks: [...s.textbooks, ...textbooks] })),
  selectTextbook: (id) => set({ currentTextbookId: id, knowledgeGraph: null, ragReady: false }),

  setTOCGraph: (tocGraph) =>
    set({
      knowledgeGraph: tocGraph
        ? { nodes: tocGraph.nodes, relations: tocGraph.relations }
        : null,
    }),

  mergeSubGraph: (subGraph) =>
    set((s) => {
      if (!s.knowledgeGraph) {
        return { knowledgeGraph: subGraph };
      }
      // Merge: remove nodes with same IDs, add new ones
      const existingIds = new Set(s.knowledgeGraph.nodes.map((n) => n.id));
      const newNodes = subGraph.nodes.filter((n) => !existingIds.has(n.id));
      const newRelations = subGraph.relations.filter(
        (r) => !s.knowledgeGraph!.relations.some(
          (er) => er.source === r.source && er.target === r.target,
        ),
      );
      return {
        knowledgeGraph: {
          nodes: [...s.knowledgeGraph.nodes, ...newNodes],
          relations: [...s.knowledgeGraph.relations, ...newRelations],
        },
      };
    }),

  setRagReady: (ready) => set({ ragReady: ready }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
