import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the app title", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /学科知识整合智能体/i }),
    ).toBeInTheDocument();
  });

  it("renders the three-panel layout", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /教材管理/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /功能面板/i }),
    ).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /提取知识/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /构建图谱/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /建立索引/i }),
    ).toBeInTheDocument();
  });
});
