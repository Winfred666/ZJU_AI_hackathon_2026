import { Chapter } from "@/types";

const CHAPTER_REGEX = /^第[\d一二三四五六七八九十百千]+章\s*[^\n]*/m;

// Patterns that signal a TOC page
// Search for TOC markers within page text (no ^/$ — page text has no line breaks)
const TOC_START_PATTERNS = [
  /目\s*录/,           // "目录" or "目 录"
  /目\s*次/,           // "目次"
  /Contents/i,         // English
];
const TOC_END_PATTERNS = [
  CHAPTER_REGEX,
  /前\s*言/,
  /绪\s*论/,
  /引\s*言/,
];
// Minimum TOC content length (chars) — shorter = likely false positive
const TOC_MIN_LENGTH = 80;

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
 *
 * Logic:
 *  1. Estimate lines-per-page from totalPages.
 *  2. Search only the first 25% of the document (TOC always in front matter).
 *  3. Look for a TOC_START marker (目录 / 目次 / Contents).
 *  4. Once found, look for a TOC_END marker (first chapter heading / 前言 / 绪论 / 引言).
 *  5. If no end marker, assume TOC spans ~4 pages from start.
 *  6. Return the extracted text and the page range.
 */
export function extractTOC(fullText: string, totalPages: number): {
  tocText: string;
  pageRange: { start: number; end: number } | null;
} {
  // Each array element = one page of text (joined without spaces by readPages)
  const pages = fullText.split("\n");
  // Search all available pages (caller already limits how many pages to read)
  const searchPages = pages.length;

  let tocStartPage = -1;
  let tocEndPage = -1;

  for (let i = 0; i < searchPages; i++) {
    const pageText = pages[i];
    if (tocStartPage === -1) {
      if (TOC_START_PATTERNS.some((p) => p.test(pageText))) {
        tocStartPage = i;
      }
    } else {
      // Scan forward for end marker
      for (let j = i; j < searchPages && j <= tocStartPage + 10; j++) {
        if (TOC_END_PATTERNS.some((p) => p.test(pages[j]))) {
          tocEndPage = j;
          break;
        }
      }
      if (tocEndPage === -1) tocEndPage = tocStartPage + 5;

      const candidateText = pages.slice(tocStartPage, tocEndPage + 1).join("\n").trim();

      // A real TOC has multiple chapter entries (not just a single mention)
      const chapterMatches = candidateText.match(/第[一二三四五六七八九十\d]+章/g);
      const hasMultipleChapters = chapterMatches !== null && chapterMatches.length >= 3;
      const isLongEnough = candidateText.length >= TOC_MIN_LENGTH;

      if (hasMultipleChapters && isLongEnough) {
        return {
          tocText: candidateText,
          pageRange: { start: tocStartPage + 1, end: tocEndPage + 1 },
        };
      }

      // False positive — reset
      tocStartPage = -1;
      tocEndPage = -1;
    }
  }

  return { tocText: "", pageRange: null };
}

/**
 * Extract only the first N pages of text.
 * Used as fallback when TOC extraction fails on large files.
 */
export function extractFirstNPages(
  fullText: string,
  totalPages: number,
  n: number,
): string {
  const lines = fullText.split("\n");
  const linesPerPage = Math.max(1, Math.floor(lines.length / totalPages));
  const endLine = Math.min(n * linesPerPage, lines.length);
  return lines.slice(0, endLine).join("\n").trim();
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
