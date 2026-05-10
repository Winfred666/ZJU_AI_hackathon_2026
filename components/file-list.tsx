"use client";

import { Textbook } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileList({ textbooks, selectedId, onSelect }: {
  textbooks: Textbook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (textbooks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        暂无教材
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {textbooks.map((tb) => (
          <button
            key={tb.textbookId}
            onClick={() => onSelect(tb.textbookId)}
            className={cn(
              "flex items-center gap-2 rounded-md p-2 text-left text-sm transition-colors",
              selectedId === tb.textbookId
                ? "bg-accent text-accent-foreground ring-1 ring-primary/20"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className={cn(
              "size-4 shrink-0",
              selectedId === tb.textbookId ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{tb.title}</p>
              <p className="truncate text-xs opacity-70">
                {tb.filename} · {(tb.totalChars / 1000).toFixed(0)}k字
              </p>
            </div>
            {tb.status === "ready" ? (
              <CheckCircle className="size-4 text-primary" />
            ) : tb.status === "error" ? (
              <XCircle className="size-4 text-destructive" />
            ) : (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
