import { describe, it, expect } from "vitest";
import { useSessionStore } from "./use-knowledge-graph";
import { Textbook, KnowledgeGraph } from "@/types";

function makeTextbook(id: string, title: string): Textbook {
  return {
    textbookId: id, filename: `${title}.pdf`, title,
    totalPages: 10, totalChars: 1000, chapters: [],
    tocText: "", tocPageRange: null,
    status: "full", uploadedAt: Date.now(),
  };
}

describe("mergeGraphs", () => {
  it("merges two graphs with fuseSameName deduplicating by name", () => {
    const store = useSessionStore.getState();
    store.addTextbooks([
      makeTextbook("a", "Graph A"),
      makeTextbook("b", "Graph B"),
    ]);
    store.setTOCGraph("a", {
      nodes: [
        { id: "n1", name: "细胞", definition: "", category: "核心概念", chapter: "1", page: 1, textbookId: "a" },
        { id: "n2", name: "组织", definition: "", category: "核心概念", chapter: "1", page: 2, textbookId: "a" },
      ],
      relations: [
        { source: "n1", target: "n2", relationType: "prerequisite", description: "" },
      ],
      tocStructure: [],
    });
    store.setTOCGraph("b", {
      nodes: [
        { id: "m1", name: "细胞", definition: "", category: "核心概念", chapter: "2", page: 5, textbookId: "b" },
        { id: "m2", name: "器官", definition: "", category: "核心概念", chapter: "2", page: 6, textbookId: "b" },
      ],
      relations: [
        { source: "m1", target: "m2", relationType: "contains", description: "" },
      ],
      tocStructure: [],
    });

    const mergedId = store.mergeGraphs("a", "b", { fuseSameName: true });
    const merged = useSessionStore.getState().graphs[mergedId];
    expect(merged).toBeDefined();
    // "细胞" should appear only once (deduped by name)
    const cellNodes = merged!.nodes.filter((n) => n.name === "细胞");
    expect(cellNodes.length).toBe(1);
    // Should have 3 nodes total: 细胞, 组织, 器官
    expect(merged!.nodes.length).toBe(3);
    // Relations should be remapped: the "细胞" from b now maps to the canonical one
    expect(merged!.relations.length).toBe(2);
  });

  it("merges two graphs with fuseSameName false keeping nodes independent", () => {
    const store = useSessionStore.getState();
    store.addTextbooks([makeTextbook("c", "Graph C"), makeTextbook("d", "Graph D")]);
    store.setTOCGraph("c", {
      nodes: [{ id: "x1", name: "细胞", definition: "", category: "核心概念", chapter: "1", page: 1, textbookId: "c" }],
      relations: [],
      tocStructure: [],
    });
    store.setTOCGraph("d", {
      nodes: [{ id: "y1", name: "细胞", definition: "", category: "核心概念", chapter: "2", page: 5, textbookId: "d" }],
      relations: [],
      tocStructure: [],
    });

    const mergedId = store.mergeGraphs("c", "d", { fuseSameName: false });
    const merged = useSessionStore.getState().graphs[mergedId];
    // Both "细胞" nodes kept (prefixed ids)
    expect(merged!.nodes.length).toBe(2);
    const names = merged!.nodes.map((n) => n.name);
    expect(names).toEqual(["细胞", "细胞"]);
    // Ids should be prefixed
    expect(merged!.nodes[0].id).toContain("::");
    expect(merged!.nodes[1].id).toContain("::");
  });
});
