import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgeGraphView } from "./knowledge-graph";

// G6 requires a browser Canvas — stub it out for jsdom
vi.mock("@antv/g6", () => ({
  Graph: vi.fn(function (this: Record<string, unknown>) {
    this.render = vi.fn();
    this.destroy = vi.fn();
    return this;
  }),
}));

const sampleGraph = {
  nodes: [
    { id: "n1", name: "静息电位", definition: "定义", category: "核心概念" as const, chapter: "第一章", page: 12, textbookId: "tb1" },
    { id: "n2", name: "动作电位", definition: "定义", category: "核心概念" as const, chapter: "第一章", page: 15, textbookId: "tb1" },
  ],
  relations: [
    { source: "n1", target: "n2", relationType: "prerequisite" as const, description: "前置" },
  ],
};

describe("KnowledgeGraphView", () => {
  it("shows empty state when graph is null", () => {
    render(<KnowledgeGraphView graph={null} />);
    expect(screen.getByText("暂无知识图谱")).toBeTruthy();
  });

  it("shows empty state when graph has no nodes", () => {
    render(<KnowledgeGraphView graph={{ nodes: [], relations: [] }} />);
    expect(screen.getByText("暂无知识图谱")).toBeTruthy();
  });

  it("renders loader when loading", () => {
    render(<KnowledgeGraphView graph={null} loading />);
    expect(screen.getByText(/正在生成知识图谱/)).toBeTruthy();
  });

  it("renders container when graph has nodes", () => {
    const { container } = render(<KnowledgeGraphView graph={sampleGraph} />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });
});
