"use client";

import { UploadZone } from "@/components/upload-zone";
import { FileList } from "@/components/file-list";
import { KnowledgeGraphView } from "@/components/knowledge-graph";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { RAGChat } from "@/components/rag-chat";
import { Separator } from "@/components/ui/separator";
import { useSessionStore } from "@/hooks/use-knowledge-graph";
import { Textbook, KnowledgeGraph } from "@/types";
import { useCallback } from "react";

export default function HomePage() {
  const { textbooks, currentTextbookId, knowledgeGraph, ragReady, isLoading,
    addTextbooks, selectTextbook, setKnowledgeGraph, setRagReady, setLoading, setError } = useSessionStore();

  const handleUpload = useCallback(async (files: File[]) => {
    setLoading(true); setError(null);
    try {
      const fd = new FormData(); files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.textbooks) {
        addTextbooks(data.textbooks as Textbook[]);
        if (data.textbooks.length > 0 && !currentTextbookId) selectTextbook(data.textbooks[0].textbookId);
      }
    } catch { setError("上传失败"); }
    finally { setLoading(false); }
  }, [addTextbooks, currentTextbookId, selectTextbook, setError, setLoading]);

  const handleExtract = useCallback(async () => {
    if (!currentTextbookId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/knowledge/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ textbookId: currentTextbookId }) });
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.graph) setKnowledgeGraph(data.graph as KnowledgeGraph);
    } catch { setError("知识提取失败"); }
    finally { setLoading(false); }
  }, [currentTextbookId, setError, setKnowledgeGraph, setLoading]);

  const handleBuildIndex = useCallback(async () => {
    if (!currentTextbookId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ textbookId: currentTextbookId, question: "索引初始化" }) });
      const data = await res.json();
      if (!data.error) setRagReady(true);
    } catch { setError("索引建立失败"); }
    finally { setLoading(false); }
  }, [currentTextbookId, setError, setLoading, setRagReady]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <h1 className="text-lg font-semibold text-balance">学科知识整合智能体</h1>
        {isLoading && <span className="text-xs text-muted-foreground">处理中...</span>}
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/5 min-w-[220px] flex-col border-r">
          <div className="p-3"><UploadZone onUpload={handleUpload} disabled={isLoading} /></div>
          <Separator />
          <FileList textbooks={textbooks} selectedId={currentTextbookId} onSelect={selectTextbook} />
        </div>
        <div className="flex w-1/2 flex-col border-r bg-muted/20">
          <div className="flex-1 p-2"><KnowledgeGraphView graph={knowledgeGraph} loading={isLoading} /></div>
        </div>
        <div className="flex w-[30%] min-w-[280px] flex-col p-3">
          <KnowledgePanel textbookId={currentTextbookId} hasGraph={!!knowledgeGraph}
            isExtracting={isLoading} isIndexing={isLoading}
            onExtract={handleExtract} onBuildIndex={handleBuildIndex} />
          <Separator className="my-3" />
          <div className="flex-1"><RAGChat textbookId={currentTextbookId} indexReady={ragReady} /></div>
        </div>
      </div>
    </div>
  );
}
