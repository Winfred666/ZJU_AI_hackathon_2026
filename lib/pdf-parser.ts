import { Chapter } from "@/types";

const CHAPTER_REGEX = /^第[\d一二三四五六七八九十百千]+章\s*[^\n]*/m;

// Patterns that signal a TOC page
const TOC_START_PATTERNS = [
  /^\s*目\s*录\s*$/m,
  /^\s*目\s*次\s*$/m,
  /^\s*Contents\s*$/im,
];
const TOC_END_PATTERNS = [
  CHAPTER_REGEX,
  /^\s*前\s*言\s*$/m,
  /^\s*绪\s*论\s*$/m,
  /^\s*引\s*言\s*$/m,
];

export function extractChapters(fullText: string, textbookId: string): Chapter[] {
  const lines = fullText.split("\n");
  const chapterHeads: { title: string; startLine: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(CHAPTER_REGEX);
    if (match) {
      chapterHeads.push({ title: match[0].trim(), startLine: i });
    }
  }

  if (chapterHeads.length === 0) {
    return [{
      chapterId: `${textbookId}_ch1`,
      title: "全文",
      pageStart: 1,
      pageEnd: Math.ceil(fullText.length / 1500),
      content: fullText,
      charCount: fullText.length,
    }];
  }

  return chapterHeads.map((ch, idx) => {
    const nextStart = idx < chapterHeads.length - 1 ? chapterHeads[idx + 1].startLine : lines.length;
    const content = lines.slice(ch.startLine, nextStart).join("\n").trim();
    return {
      chapterId: `${textbookId}_ch${String(idx + 1).padStart(2, "0")}`,
      title: ch.title,
      pageStart: Math.floor(ch.startLine / 40) + 1,
      pageEnd: Math.floor(nextStart / 40) + 1,
      content,
      charCount: content.length,
    };
  });
}

/**
 * Extract the table-of-contents from a PDF's full text.
 * Scans first ~25% of pages for TOC start/end markers.
 * Returns the TOC text and page range, or null if not found.
 */
export function extractTOC(fullText: string, totalPages: number): {
  tocText: string;
  pageRange: { start: number; end: number } | null;
} {
  const lines = fullText.split("\n");
  const linesPerPage = Math.max(1, Math.floor(lines.length / totalPages));
  // Only search first 25% of document for TOC
  const searchLines = Math.floor(lines.length * 0.25);

  let tocStartLine = -1;
  let tocEndLine = -1;

  for (let i = 0; i < searchLines; i++) {
    const line = lines[i].trim();
    if (tocStartLine === -1) {
      if (TOC_START_PATTERNS.some((p) => p.test(line))) {
        tocStartLine = i;
      }
    } else if (tocEndLine === -1) {
      if (TOC_END_PATTERNS.some((p) => p.test(line))) {
        tocEndLine = i;
        break;
      }
    }
  }

  if (tocStartLine === -1) {
    return { tocText: "", pageRange: null };
  }

  if (tocEndLine === -1) {
    // Fallback: TOC is typically 2-5 pages
    tocEndLine = tocStartLine + linesPerPage * 4;
  }

  const tocText = lines.slice(tocStartLine, tocEndLine).join("\n").trim();

  return {
    tocText,
    pageRange: {
      start: Math.floor(tocStartLine / linesPerPage) + 1,
      end: Math.ceil(tocEndLine / linesPerPage),
    },
  };
}

/**
 * Extract text from a specific page range of a PDF.
 * Used for drill-down: re-read only the chapter's pages.
 */
export function extractPageRange(
  fullText: string,
  totalPages: number,
  pageStart: number,
  pageEnd: number,
): string {
  const lines = fullText.split("\n");
  const linesPerPage = Math.max(1, Math.floor(lines.length / totalPages));
  const startLine = (pageStart - 1) * linesPerPage;
  const endLine = Math.min(pageEnd * linesPerPage, lines.length);
  return lines.slice(startLine, endLine).join("\n").trim();
}

export function estimatePages(text: string): number {
  return Math.max(1, Math.ceil(text.length / 1500));
}

export function getTextbookTitle(filename: string): string {
  return filename.replace(/\.(pdf|txt|md)$/i, "").replace(/[_\-]/g, " ");
}
