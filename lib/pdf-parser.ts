import { Chapter } from "@/types";

const CHAPTER_REGEX = /^第[\d一二三四五六七八九十百千]+章\s*[^\n]*/m;

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

export function estimatePages(text: string): number {
  return Math.max(1, Math.ceil(text.length / 1500));
}

export function getTextbookTitle(filename: string): string {
  return filename.replace(/\.(pdf|txt|md|docx|xlsx|xls)$/i, "").replace(/[_\-]/g, " ");
}
