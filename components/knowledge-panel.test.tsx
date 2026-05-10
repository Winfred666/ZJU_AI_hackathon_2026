import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgePanel } from "./knowledge-panel";

describe("KnowledgePanel", () => {
  it("renders section heading", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByText("知识处理")).toBeInTheDocument();
  });

  it("shows empty state hint when no graph", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByText(/上传教材后自动生成目录图谱/)).toBeInTheDocument();
  });

  it("shows drill hint when graph exists", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByText(/双击图谱节点可深入查看章节知识/)).toBeInTheDocument();
  });

  it("disables RAG index button when no textbook", () => {
    render(
      <KnowledgePanel
        textbookId={null}
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /RAG 索引/i }),
    ).toBeDisabled();
  });

  it("disables RAG index button when hasGraph is false", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /RAG 索引/i }),
    ).toBeDisabled();
  });

  it("enables RAG index button when textbook and graph exist", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /RAG 索引/i }),
    ).not.toBeDisabled();
  });

  it("shows loader when indexing", () => {
    const { container } = render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isIndexing
        onBuildIndex={vi.fn()}
      />,
    );
    expect(container.querySelector(".lucide-loader-circle")).toBeTruthy();
  });

  it("calls onBuildIndex when button clicked", () => {
    const onBuildIndex = vi.fn();
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isIndexing={false}
        onBuildIndex={onBuildIndex}
      />,
    );
    screen.getByRole("button", { name: /RAG 索引/i }).click();
    expect(onBuildIndex).toHaveBeenCalledOnce();
  });
});
