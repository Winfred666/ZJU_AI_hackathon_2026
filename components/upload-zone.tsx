"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTS = [".pdf", ".txt", ".md", ".docx", ".xlsx", ".xls"];

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  return ACCEPTED_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export function UploadZone({ onUpload, disabled }: { onUpload: (files: File[]) => void; disabled?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
    if (files.length > 0) onUpload(files);
  }, [onUpload]);

  return (
    <Card
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-all",
        isDragging
          ? "border-primary bg-accent/50 ring-4 ring-primary/5"
          : "border-muted-foreground/20 bg-background hover:bg-accent/10"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTS.join(",")}
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
      <p className="text-sm font-semibold text-foreground">
        拖拽文件或
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 px-1 font-bold text-primary underline-offset-4 hover:underline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          点击上传
        </Button>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">支持 PDF、TXT、MD、Word (DOCX)、Excel (XLSX/XLS)</p>
    </Card>
  );
}
