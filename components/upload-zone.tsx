"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

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
      className={`border-2 border-dashed p-4 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept=".pdf,.txt,.md" multiple className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length > 0) onUpload(files); e.target.value = ""; }} />
      <Upload className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">拖拽文件或<Button variant="link" size="sm" className="px-1" onClick={() => inputRef.current?.click()} disabled={disabled}>点击上传</Button></p>
      <p className="text-xs text-muted-foreground">支持 PDF、TXT、MD</p>
    </Card>
  );
}
