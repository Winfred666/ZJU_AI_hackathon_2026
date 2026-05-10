import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RAGChat } from "./rag-chat";

describe("RAGChat", () => {
  it("renders section heading", () => {
    render(<RAGChat textbookId="tb1" indexReady />);
    expect(screen.getByText("RAG 问答")).toBeInTheDocument();
  });

  it("shows placeholder when no messages", () => {
    render(<RAGChat textbookId="tb1" indexReady />);
    expect(screen.getByText(/AI 将从教材中检索回答/)).toBeInTheDocument();
  });

  it("disables input and button when index is not ready", () => {
    render(<RAGChat textbookId="tb1" indexReady={false} />);
    expect(screen.getByPlaceholderText("输入问题...")).toBeDisabled();
    // The send button should be disabled
    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) =>
      b.querySelector(".lucide-send"),
    );
    expect(sendButton).toBeDisabled();
  });

  it("enables input when index is ready", () => {
    render(<RAGChat textbookId="tb1" indexReady />);
    expect(screen.getByPlaceholderText("输入问题...")).not.toBeDisabled();
  });

  it("renders send icon button", () => {
    const { container } = render(<RAGChat textbookId="tb1" indexReady />);
    expect(container.querySelector(".lucide-send")).toBeTruthy();
  });
});
