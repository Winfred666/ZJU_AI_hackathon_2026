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

  it("renders RAG chat section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /RAG 问答（TODO）/i }),
    ).toBeInTheDocument();
  });

  it("shows empty graph placeholder", () => {
    render(<Home />);
    expect(screen.getByText("暂无知识图谱")).toBeInTheDocument();
  });

  it("shows empty file list", () => {
    render(<Home />);
    expect(screen.getByText("暂无教材")).toBeInTheDocument();
  });

  it("has three-panel layout structure", () => {
    const { container } = render(<Home />);
    // Two aside panels (left: files, right: RAG) + 1 section (graph)
    expect(container.querySelectorAll("aside")).toHaveLength(2);
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });
});
