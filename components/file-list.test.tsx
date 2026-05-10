import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileList } from "./file-list";
import type { Textbook } from "@/types";

const sampleTextbooks: Textbook[] = [
  {
    textbookId: "tb1",
    filename: "生理学.pdf",
    title: "生理学",
    status: "ready",
    totalPages: 300,
    totalChars: 450000,
    chapters: [],
    tocText: "",
    tocPageRange: null,
    uploadedAt: Date.now(),
  },
  {
    textbookId: "tb2",
    filename: "免疫学.txt",
    title: "医学免疫学",
    status: "parsing",
    totalPages: 200,
    totalChars: 300000,
    chapters: [],
    tocText: "",
    tocPageRange: null,
    uploadedAt: Date.now(),
  },
  {
    textbookId: "tb3",
    filename: "病理学.md",
    title: "病理学",
    status: "error",
    errorMessage: "解析失败",
    totalPages: 0,
    totalChars: 0,
    chapters: [],
    tocText: "",
    tocPageRange: null,
    uploadedAt: Date.now(),
  },
];

describe("FileList", () => {
  it("shows empty state when no textbooks", () => {
    render(<FileList textbooks={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("暂无教材")).toBeInTheDocument();
  });

  it("renders all textbooks", () => {
    render(
      <FileList textbooks={sampleTextbooks} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("生理学")).toBeInTheDocument();
    expect(screen.getByText("医学免疫学")).toBeInTheDocument();
    expect(screen.getByText("病理学")).toBeInTheDocument();
  });

  it("shows file info with char count", () => {
    render(
      <FileList textbooks={sampleTextbooks} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/450k字/)).toBeInTheDocument();
  });

  it("highlights selected textbook", () => {
    const { container } = render(
      <FileList textbooks={sampleTextbooks} selectedId="tb1" onSelect={vi.fn()} />,
    );
    // The selected button should have the ring class
    const selected = container.querySelector(".ring-1");
    expect(selected).toBeTruthy();
  });

  it("calls onSelect when textbook clicked", () => {
    const onSelect = vi.fn();
    render(
      <FileList textbooks={sampleTextbooks} selectedId={null} onSelect={onSelect} />,
    );
    screen.getByText("生理学").click();
    expect(onSelect).toHaveBeenCalledWith("tb1");
  });
});
