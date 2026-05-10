"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MergeConfig } from "@/types";

interface MergeConfirmDialogProps {
  open: boolean;
  sourceTitle: string;
  targetTitle: string;
  onConfirm: (config: MergeConfig) => void;
  onCancel: () => void;
}

export function MergeConfirmDialog({
  open,
  sourceTitle,
  targetTitle,
  onConfirm,
  onCancel,
}: MergeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>合并知识图谱</DialogTitle>
          <DialogDescription>
            将 <span className="font-medium text-foreground">{sourceTitle}</span> 合并到{" "}
            <span className="font-medium text-foreground">{targetTitle}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          是否合并两个图谱中<span className="font-semibold text-foreground">同名节点</span>？
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onConfirm({ fuseSameName: false })}>
            否，保持节点独立
          </Button>
          <Button onClick={() => onConfirm({ fuseSameName: true })}>
            是，融合同名节点
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
