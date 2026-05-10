"use client";

import { Textbook } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

export function FileList({ textbooks, selectedId, onSelect }: {
  textbooks: Textbook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (textbooks.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">暂无教材</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {textbooks.map((tb) => (
          <button key={tb.textbookId} onClick={() => onSelect(tb.textbookId)}
            className={`flex items-center gap-2 rounded-md p-2 text-left text-sm transition-colors ${
              selectedId === tb.textbookId ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"}`}>
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{tb.title}</p>
              <p className="truncate text-xs text-muted-foreground">{tb.filename} · {(tb.totalChars / 1000).toFixed(0)}k字</p>
            </div>
            {tb.status === "ready" ? <CheckCircle className="size-4 text-green-500" /> :
             tb.status === "error" ? <XCircle className="size-4 text-red-500" /> :
             <Loader2 className="size-4 animate-spin text-blue-500" />}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
