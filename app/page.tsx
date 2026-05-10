"use client";

import { UploadZone } from "@/components/upload-zone";
import { FileList } from "@/components/file-list";
import { KnowledgeGraphView } from "@/components/knowledge-graph";
import { RAGChat } from "@/components/rag-chat";
import { MergeConfirmDialog } from "@/components/merge-confirm-dialog";
import { useSessionStore } from "@/hooks/use-knowledge-graph";
import { Textbook, KnowledgeGraph, TOCGraph, KnowledgeNode, MergeConfig } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/utils";
import { sha256Browser } from "@/lib/utils/hash";

export default function HomePage() {
  const {
    textbooks, currentTextbookId, knowledgeGraph, ragReady, isLoading,
    loadTextbooks, addTextbooks, removeTextbook, selectTextbook,
    setTOCGraph, mergeSubGraph, mergeGraphs, setRagReady, setLoading, setError,
  } = useSessionStore();

  const [mergePending, setMergePending] = useState<{ sourceId: string; targetId: string } | null>(null);

  useEffect(() => { loadTextbooks(); }, [loadTextbooks]);

  const handleUpload = useCallback(async (files: File[]) => {
    setLoading(true); setError(null);
    try {
      for (const file of files) {
        // Check SHA-256 hash BEFORE uploading — skip if already cached
        const buf = await file.arrayBuffer();
        const hash = await sha256Browser(buf);

        const checkRes = await fetch(`/api/files/check?hash=${encodeURIComponent(hash)}`);
        const checkData = await checkRes.json();

        if (checkData.found && checkData.textbook) {
          // File already parsed — use cached data, no upload needed
          console.log(`[upload] ${file.name} — SKIP (cached, ${hash.slice(0, 8)}...)`);
          addTextbooks([checkData.textbook as Textbook]);
          if (checkData.tocGraph) {
            setTOCGraph(checkData.textbook.textbookId, checkData.tocGraph as TOCGraph);
          }
          if (!currentTextbookId) selectTextbook(checkData.textbook.textbookId);
          continue;
        }

        // New file — upload
        let data: any;
        if (file.size < 2 * 1024 * 1024) {
          const fd = new FormData();
          fd.append("files", file);
          const res = await fetch("/api/parse", { method: "POST", body: fd });
          data = await res.json();
        } else {
          const CHUNK_SIZE = 2 * 1024 * 1024;
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          const fileId = crypto.randomUUID();
          for (let i = 0; i < totalChunks; i++) {
            const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const fd = new FormData();
            fd.append("fileId", fileId);
            fd.append("chunkIndex", String(i));
            fd.append("totalChunks", String(totalChunks));
            fd.append("filename", file.name);
            fd.append("chunk", chunk);
            const res = await fetch("/api/upload/chunk", { method: "POST", body: fd });
            data = await res.json();
            if (data.status === "complete") break;
          }
        }
        if (data.error) { setError(data.error); return; }
        if (data.textbooks) {
          const newBooks = data.textbooks as Textbook[];
          addTextbooks(newBooks);
          if (data.tocGraphs) {
            for (const [id, tg] of Object.entries(data.tocGraphs)) {
              setTOCGraph(id, tg as TOCGraph | null);
            }
          }
          if (newBooks[0] && !currentTextbookId) selectTextbook(newBooks[0].textbookId);
        }
      }
    } catch { setError("上传失败"); }
    finally { setLoading(false); }
  }, [addTextbooks, currentTextbookId, selectTextbook, setError, setLoading, setTOCGraph]);

  const handleSelectTextbook = useCallback((id: string) => {
    selectTextbook(id);
    // Load TOC graph for selected textbook if we have it
    // (already loaded on upload, just need to switch)
  }, [selectTextbook]);

  const handleNodeDoubleClick = useCallback(async (node: KnowledgeNode) => {
    if (!node.isTocNode || !node.pageRange) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/knowledge/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textbookId: node.textbookId,
          chapterId: node.id,
          pageStart: node.pageRange.start,
          pageEnd: node.pageRange.end,
          chapterTitle: node.name,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.subGraph) {
        mergeSubGraph(node.textbookId, data.subGraph as KnowledgeGraph);
      }
    } catch { setError("章节钻取失败"); }
    finally { setLoading(false); }
  }, [mergeSubGraph, setError, setLoading]);

  const handleMerge = useCallback((sourceId: string, targetId: string) => {
    setMergePending({ sourceId, targetId });
  }, []);

  const handleMergeConfirm = useCallback((config: MergeConfig) => {
    if (!mergePending) return;
    mergeGraphs(mergePending.sourceId, mergePending.targetId, config);
    setMergePending(null);
  }, [mergePending, mergeGraphs]);

  const handleMergeCancel = useCallback(() => {
    setMergePending(null);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background selection:bg-primary/10">
      <header className="flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="text-xs font-bold">ZJU</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground/90">
            医学知识整合智能体（请上传小文件，双击节点能展开更多！）
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">V0.1</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="flex w-1/5 min-w-[240px] flex-col border-r bg-muted/5">
          <div className="p-4">
            <UploadZone onUpload={handleUpload} disabled={isLoading} />
          </div>
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            文献列表
          </div>
          <div className="flex-1 overflow-hidden">
            <FileList
              textbooks={textbooks}
              selectedId={currentTextbookId}
              onSelect={handleSelectTextbook}
              onMerge={handleMerge}
            />
          </div>
        </aside>

        <section className="relative flex flex-1 flex-col bg-background p-4">
          <div className={cn(
            "flex-1 rounded-xl border bg-card shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-all duration-700",
            knowledgeGraph ? "border-primary/10" : "border-dashed"
          )}>
            <KnowledgeGraphView
              graph={knowledgeGraph}
              loading={isLoading}
              onNodeDoubleClick={handleNodeDoubleClick}
            />
          </div>
        </section>

        <aside className="flex w-[340px] flex-col border-l bg-muted/5 p-4">
          <RAGChat textbookId={currentTextbookId} indexReady={ragReady} />
        </aside>
        {mergePending && (
          <MergeConfirmDialog
            open={true}
            sourceTitle={
              textbooks.find((t) => t.textbookId === mergePending.sourceId)?.title ?? ""
            }
            targetTitle={
              textbooks.find((t) => t.textbookId === mergePending.targetId)?.title ?? ""
            }
            onConfirm={handleMergeConfirm}
            onCancel={handleMergeCancel}
          />
        )}
      </main>
    </div>
  );
}
