import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the app title", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /知识整合智能体/i }),
    ).toBeInTheDocument();
  });

  it("renders the upload zone", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /点击上传/i }),
    ).toBeInTheDocument();
  });

  it("renders knowledge action buttons", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /RAG 索引/i }),
    ).toBeInTheDocument();
  });

  it("renders RAG chat section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /RAG 问答/i }),
    ).toBeInTheDocument();
  });

  it("shows empty graph placeholder", () => {
    render(<Home />);
    expect(screen.getByText("暂无知识图谱")).toBeInTheDocument();
  });
});
