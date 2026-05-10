import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KnowledgePanel } from "./knowledge-panel";

describe("KnowledgePanel", () => {
  it("renders section heading", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isExtracting={false}
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByText("知识处理")).toBeInTheDocument();
  });

  it("disables buttons when no textbook selected", () => {
    render(
      <KnowledgePanel
        textbookId={null}
        hasGraph={false}
        isExtracting={false}
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /提取知识/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /建立索引/ })).toBeDisabled();
  });

  it("enables extract when textbook is selected", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isExtracting={false}
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /提取知识/ })).not.toBeDisabled();
  });

  it("enables index button only when graph exists", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph
        isExtracting={false}
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /建立索引/ })).not.toBeDisabled();
  });

  it("disables index button when no graph", () => {
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isExtracting={false}
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /建立索引/ })).toBeDisabled();
  });

  it("shows loader when extracting", () => {
    const { container } = render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isExtracting
        isIndexing={false}
        onExtract={vi.fn()}
        onBuildIndex={vi.fn()}
      />,
    );
    expect(container.querySelector(".lucide-loader-circle")).toBeTruthy();
  });

  it("calls onExtract when button clicked", () => {
    const onExtract = vi.fn();
    render(
      <KnowledgePanel
        textbookId="tb1"
        hasGraph={false}
        isExtracting={false}
        isIndexing={false}
        onExtract={onExtract}
        onBuildIndex={vi.fn()}
      />,
    );
    screen.getByRole("button", { name: /提取知识/ }).click();
    expect(onExtract).toHaveBeenCalledOnce();
  });
});
