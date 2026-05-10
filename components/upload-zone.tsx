"use client";

import { useCallback, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadZone({ onUpload, disabled }: { onUpload: (files: File[]) => void; disabled?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "application/pdf" || f.name.endsWith(".txt") || f.name.endsWith(".md"));
    if (files.length > 0) onUpload(files);
  }, [onUpload]);

  return (
    <Card
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-all",
        !disabled && "cursor-pointer",
        isDragging
          ? "border-primary bg-accent/50 ring-4 ring-primary/5"
          : "border-muted-foreground/20 bg-background hover:bg-accent/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        if (disabled) return;
        handleDrop(e);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        data-testid="file-input"
        accept=".pdf,.txt,.md"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onUpload(files);
          e.target.value = "";
        }}
      />
      <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-accent/30 text-primary">
        <Upload className="size-6" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        拖拽文件或点击上传
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">支持 PDF、TXT、MD</p>
    </Card>
  );
}
