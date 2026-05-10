import { Chapter } from "@/types";
import { marked, Token, Tokens } from "marked";

function extractTextFromTokens(tokens: Token[]): string {
  const parts: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const h = token as Tokens.Heading;
        parts.push(h.text);
        break;
      }
      case "paragraph": {
        const p = token as Tokens.Paragraph;
        parts.push(extractTextFromTokens(p.tokens));
        break;
      }
      case "text": {
        const t = token as Tokens.Text;
        parts.push(t.text ?? "");
        break;
      }
      case "strong": {
        const s = token as Tokens.Strong;
        parts.push(extractTextFromTokens(s.tokens));
        break;
      }
      case "em": {
        const e = token as Tokens.Em;
        parts.push(extractTextFromTokens(e.tokens));
        break;
      }
      case "link": {
        const l = token as Tokens.Link;
        parts.push(extractTextFromTokens(l.tokens ?? []));
        break;
      }
      case "codespan": {
        const c = token as Tokens.Codespan;
        parts.push(c.text);
        break;
      }
      case "code": {
        const c = token as Tokens.Code;
        parts.push(c.text);
        break;
      }
      case "list": {
        const l = token as Tokens.List;
        for (const item of l.items) {
          parts.push(extractTextFromTokens(item.tokens));
        }
        break;
      }
      case "list_item": {
        const li = token as Tokens.ListItem;
        parts.push(extractTextFromTokens(li.tokens));
        break;
      }
      case "blockquote": {
        const bq = token as Tokens.Blockquote;
        parts.push(extractTextFromTokens(bq.tokens));
        break;
      }
      case "html": {
        const htm = token as Tokens.HTML;
        parts.push(htm.text.replace(/<[^>]*>/g, ""));
        break;
      }
      case "space": {
        parts.push("\n");
        break;
      }
      default:
        break;
    }
  }

  return parts.join("\n");
}

function splitByHeadings(tokens: Token[]): { title: string; contentTokens: Token[] }[] {
  const sections: { title: string; contentTokens: Token[] }[] = [];
  let currentTitle = "全文";
  let currentTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      const h = token as Tokens.Heading;
      if (currentTokens.length > 0 || sections.length > 0) {
        if (sections.length === 0 && currentTokens.length === 0) {
          // first heading, just set title
        } else {
          sections.push({ title: currentTitle, contentTokens: currentTokens });
        }
      }
      currentTitle = h.text;
      currentTokens = [];
    } else {
      currentTokens.push(token);
    }
  }
  sections.push({ title: currentTitle, contentTokens: currentTokens });

  return sections;
}

const CHAPTER_REGEX = /^第[\d一二三四五六七八九十百千]+章\s*[^\n]*/m;

const CHAPTER_HEADING_REGEX = /^第[\d一二三四五六七八九十百千]+章/;

function looksLikeChapter(title: string): boolean {
  return CHAPTER_HEADING_REGEX.test(title);
}

export function parseMarkdown(
  buffer: Buffer,
  textbookId: string,
): { chapters: Chapter[]; fullText: string } {
  const rawText = new TextDecoder("utf-8").decode(buffer).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const tokens = marked.lexer(rawText);
  const fullText = extractTextFromTokens(tokens);
  const sections = splitByHeadings(tokens);

  const hasChapterHeadings = sections.some(s => looksLikeChapter(s.title));

  if (!hasChapterHeadings) {
    const lines = fullText.split("\n");
    const chapterHeads: { title: string; startLine: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].trim().match(CHAPTER_REGEX);
      if (match) chapterHeads.push({ title: match[0].trim(), startLine: i });
    }

    if (chapterHeads.length > 0) {
      const chapters: Chapter[] = chapterHeads.map((ch, idx) => {
        const nextStart = idx < chapterHeads.length - 1
          ? chapterHeads[idx + 1].startLine
          : lines.length;
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

  const chapters: Chapter[] = sections.map((section, idx) => {
    const content = extractTextFromTokens(section.contentTokens).trim();
    return {
      chapterId: `${textbookId}_ch${String(idx + 1).padStart(2, "0")}`,
      title: section.title,
      pageStart: idx + 1,
      pageEnd: idx + 1 + Math.ceil(content.length / 1500),
      content,
      charCount: content.length,
    };
  });

  return { chapters, fullText };
}
