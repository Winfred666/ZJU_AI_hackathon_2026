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

  it("disables index button when no textbook selected", () => {
    render(
      <KnowledgePanel
        textbookId={null}
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /建立 RAG 索引/ })).toBeDisabled();
  });

  it("enables index button only when graph exists", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /建立 RAG 索引/ })).not.toBeDisabled();
  });

  it("disables index button when no graph", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /建立 RAG 索引/ })).toBeDisabled();
  });

  it("shows hint text when no graph", () => {
    render(
      <KnowledgePanel
        textbookId={null}
        hasGraph={false}
        isIndexing={false}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByText("上传教材后自动生成目录图谱")).toBeInTheDocument();
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
    screen.getByRole("button", { name: /建立 RAG 索引/ }).click();
    expect(onBuildIndex).toHaveBeenCalledOnce();
  });
});
