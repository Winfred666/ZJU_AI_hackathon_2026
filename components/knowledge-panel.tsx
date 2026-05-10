"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Network, Loader2 } from "lucide-react";

export function KnowledgePanel({
  textbookId,
  hasGraph,
  isIndexing,
  onBuildIndex,
}: {
  textbookId: string | null;
  hasGraph: boolean;
  isIndexing: boolean;
  onBuildIndex: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">知识处理</h3>
        <p className="text-xs text-muted-foreground">
          {hasGraph
            ? "双击图谱节点可深入查看章节知识"
            : "上传教材后自动生成目录图谱"}
        </p>
      </div>
      <Separator />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={!textbookId || !hasGraph || isIndexing}
        onClick={onBuildIndex}
      >
        {isIndexing ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Network className="mr-2 size-4" />
        )}
        建立 RAG 索引
      </Button>
    </div>
  );
}
