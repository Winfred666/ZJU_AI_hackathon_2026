export const NS = {
  textbook: (id: string) => `textbook:${id}`,
  tocGraph: (id: string) => `tocGraph:${id}`,
  drillGraph: (textbookId: string, chapterId: string) =>
    `drill:${textbookId}:${chapterId}`,
  fileHash: (sha256: string) => `fileHash:${sha256}`,
} as const;
