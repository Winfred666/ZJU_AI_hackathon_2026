"use client";

import { create } from "zustand";
import { Textbook, KnowledgeGraph } from "@/types";

interface SessionState {
  textbooks: Textbook[];
  currentTextbookId: string | null;
  knowledgeGraph: KnowledgeGraph | null;
  ragReady: boolean;
  isLoading: boolean;
  error: string | null;

  addTextbooks: (textbooks: Textbook[]) => void;
  selectTextbook: (id: string | null) => void;
  setKnowledgeGraph: (graph: KnowledgeGraph | null) => void;
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
  setKnowledgeGraph: (graph) => set({ knowledgeGraph: graph }),
  setRagReady: (ready) => set({ ragReady: ready }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
