import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgeGraph } from "./knowledge-graph";

// G6 requires a browser Canvas — stub it out for jsdom
vi.mock("@antv/g6", () => ({
  Graph: vi.fn(function (this: Record<string, unknown>) {
    this.render = vi.fn();
    this.destroy = vi.fn();
    return this;
  }),
}));

const sampleNodes = [
  {
    id: "n1",
    name: "静息电位",
    definition: "细胞在安静状态下膜内外存在的电位差",
    category: "核心概念" as const,
    chapter: "第一章 绪论",
    page: 12,
  },
  {
    id: "n2",
    name: "动作电位",
    definition: "细胞受到刺激时膜电位发生的快速、可逆的翻转",
    category: "核心概念" as const,
    chapter: "第一章 绪论",
    page: 15,
  },
  {
    id: "n3",
    name: "钠钾泵",
    definition: "主动转运Na+和K+的膜蛋白",
    category: "方法" as const,
    chapter: "第二章 细胞膜",
    page: 30,
  },
];

const sampleEdges = [
  {
    source: "n1",
    target: "n2",
    relationType: "prerequisite" as const,
    description: "理解动作电位需要先理解静息电位",
  },
  {
    source: "n2",
    target: "n3",
    relationType: "contains" as const,
    description: "动作电位过程涉及钠钾泵",
  },
];

describe("KnowledgeGraph", () => {
  it("renders a container div", () => {
    const { container } = render(
      <KnowledgeGraph nodes={sampleNodes} edges={sampleEdges} />,
    );
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it("attaches a className when passed", () => {
    render(
      <KnowledgeGraph
        nodes={sampleNodes}
        edges={sampleEdges}
        className="h-full"
      />,
    );
    expect(document.querySelector(".h-full")).toBeTruthy();
  });

  it("renders without edges (nodes only)", () => {
    const { container } = render(
      <KnowledgeGraph nodes={sampleNodes} edges={[]} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with empty data (no crash)", () => {
    const { container } = render(
      <KnowledgeGraph nodes={[]} edges={[]} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
