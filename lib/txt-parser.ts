import { Chapter } from "@/types";

const CHAPTER_REGEX = /^第[\d一二三四五六七八九十百千]+章\s*[^\n]*/m;

export function parseTxtContent(rawText: string, textbookId: string): {
  chapters: Chapter[];
  fullText: string;
} {
  const fullText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\f/g, "\n");
  const lines = fullText.split("\n");
  const chapterHeads: { title: string; startLine: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(CHAPTER_REGEX);
    if (match) chapterHeads.push({ title: match[0].trim(), startLine: i });
  }

  if (chapterHeads.length === 0) {
    return {
      fullText,
      chapters: [{
        chapterId: `${textbookId}_ch1`,
        title: "全文",
        pageStart: 1,
        pageEnd: Math.ceil(fullText.length / 1500),
        content: fullText,
        charCount: fullText.length,
      }],
    };
  }

  const chapters = chapterHeads.map((ch, idx) => {
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

  return { chapters, fullText };
}
