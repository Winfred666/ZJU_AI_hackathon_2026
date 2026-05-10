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
import { cn } from "@/lib/utils";

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
    <div className="flex h-dvh flex-col bg-background selection:bg-primary/10">
      <header className="flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="text-xs font-bold">ZJU</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground/90">
            医学知识整合智能体
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs font-medium text-primary animate-pulse">
              <div className="size-1.5 rounded-full bg-primary" />
              处理中...
            </div>
          )}
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">V0.1 MVP</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: PDF Management */}
        <aside className="flex w-1/5 min-w-[240px] flex-col border-r bg-muted/5">
          <div className="p-4">
            <UploadZone onUpload={handleUpload} disabled={isLoading} />
          </div>
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            文献列表
          </div>
          <div className="flex-1 overflow-hidden">
            <FileList textbooks={textbooks} selectedId={currentTextbookId} onSelect={selectTextbook} />
          </div>
        </aside>

        {/* Center: Knowledge Graph View */}
        <section className="relative flex flex-1 flex-col bg-background p-4">
          <div className={cn(
            "flex-1 rounded-xl border bg-card shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-all duration-700",
            knowledgeGraph ? "border-primary/10" : "border-dashed"
          )}>
            <KnowledgeGraphView graph={knowledgeGraph} loading={isLoading} />
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border bg-background/80 px-4 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
            AntV/G6 可视化引擎
          </div>
        </section>

        {/* Right Sidebar: Controls & Chat */}
        <aside className="flex w-[340px] flex-col border-l bg-muted/5 p-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <KnowledgePanel 
              textbookId={currentTextbookId} 
              hasGraph={!!knowledgeGraph}
              isExtracting={isLoading} 
              isIndexing={isLoading}
              onExtract={handleExtract} 
              onBuildIndex={handleBuildIndex} 
            />
          </div>
          <Separator className="my-6 opacity-40" />
          <div className="flex flex-1 flex-col min-h-0">
            <RAGChat textbookId={currentTextbookId} indexReady={ragReady} />
          </div>
        </aside>
      </main>
    </div>
  );
}
