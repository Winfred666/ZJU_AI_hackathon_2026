"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Brain, Network, Loader2 } from "lucide-react";

export function KnowledgePanel({ textbookId, hasGraph, isExtracting, isIndexing, onExtract, onBuildIndex }: {
  textbookId: string | null; hasGraph: boolean; isExtracting: boolean; isIndexing: boolean;
  onExtract: () => void; onBuildIndex: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">知识处理</h3>
      <Separator />
      <Button size="sm" className="w-full" disabled={!textbookId || isExtracting} onClick={onExtract}>
        {isExtracting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Brain className="mr-2 size-4" />}提取知识
      </Button>
      <Button variant="outline" size="sm" className="w-full" disabled={!textbookId || !hasGraph || isIndexing} onClick={onBuildIndex}>
        {isIndexing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Network className="mr-2 size-4" />}建立索引
      </Button>
    </div>
  );
}
