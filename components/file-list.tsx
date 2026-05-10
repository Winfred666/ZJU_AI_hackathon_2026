"use client";

import { Textbook, ParseStatus } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, XCircle, BookOpen, BookMarked, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon: Record<ParseStatus, React.ReactNode> = {
  full: <CheckCircle className="size-4 text-emerald-500" />,
  partial: <BookOpen className="size-4 text-amber-500" />,
  toc_only: <BookMarked className="size-4 text-blue-500" />,
  error: <XCircle className="size-4 text-destructive" />,
};

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
          <div key={tb.textbookId} className="group relative">
            <button
              onClick={() => onSelect(tb.textbookId)}
              title={tb.status === "error" ? tb.errorMessage ?? tb.statusDetail : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors",
                selectedId === tb.textbookId
                  ? "bg-accent text-accent-foreground ring-1 ring-primary/20"
                  : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {tb.status === "toc_only" ? (
                <ScanText className={cn(
                  "size-4 shrink-0",
                  selectedId === tb.textbookId ? "text-blue-500" : "text-muted-foreground",
                )} />
              ) : (
                <FileText className={cn(
                  "size-4 shrink-0",
                  selectedId === tb.textbookId ? "text-primary" : "text-muted-foreground",
                )} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{tb.title}</p>
                <p className="truncate text-xs opacity-70">
                  {tb.statusDetail ?? tb.filename}
                </p>
              </div>
              {statusIcon[tb.status]}
            </button>

            {/* Hover tooltip for non-full status */}
            {tb.status !== "full" && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className={cn(
                    "font-medium",
                    tb.status === "error" && "text-destructive",
                  )}>
                    {tb.status === "partial" && "部分解析（双击继续）"}
                    {tb.status === "toc_only" && "目录已解析"}
                    {tb.status === "error" && "解析失败"}
                  </p>
                  <p className="text-muted-foreground">{tb.statusDetail}</p>
                  {tb.status === "error" && tb.errorMessage && (
                    <p className="mt-1 max-w-[240px] text-destructive/80">{tb.errorMessage}</p>
                  )}
                  {tb.status === "partial" && (
                    <p className="mt-1 font-medium text-amber-400">双击条目继续解析后续页面</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
