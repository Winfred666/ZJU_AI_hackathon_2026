import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadZone } from "./upload-zone";

describe("UploadZone", () => {
  it("renders upload prompt", () => {
    render(<UploadZone onUpload={vi.fn()} />);
    expect(screen.getByText(/拖拽文件或/)).toBeInTheDocument();
    expect(screen.getByText(/点击上传/)).toBeInTheDocument();
  });

  it("is clickable and has button role", () => {
    render(<UploadZone onUpload={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows supported formats", () => {
    render(<UploadZone onUpload={vi.fn()} />);
    expect(screen.getByText(/PDF、TXT、MD/)).toBeInTheDocument();
  });

  it("renders upload icon", () => {
    const { container } = render(<UploadZone onUpload={vi.fn()} />);
    expect(container.querySelector(".lucide-upload")).toBeTruthy();
  });

  it("is disabled when disabled prop is true", () => {
    render(<UploadZone onUpload={vi.fn()} disabled />);
    const card = screen.getByRole("button");
    expect(card).toHaveClass("cursor-not-allowed");
    expect(card).toHaveAttribute("tabindex", "-1");
  });
});
