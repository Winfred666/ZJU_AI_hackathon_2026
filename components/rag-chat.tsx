"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, FileText } from "lucide-react";
import { RAGQueryResponse } from "@/types";

interface Message { role: "user" | "assistant"; content: string; citations?: RAGQueryResponse["citations"]; }

export function RAGChat({ textbookId, indexReady }: { textbookId: string | null; indexReady: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !textbookId || loading) return;
    const q = input.trim(); setInput(""); setMessages((p) => [...p, { role: "user", content: q }]); setLoading(true);
    try {
      const res = await fetch("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ textbookId, question: q }) });
      const data = await res.json();
      setMessages((p) => [...p, { role: "assistant", content: data.error ?? data.answer, citations: data.citations }]);
    } catch { setMessages((p) => [...p, { role: "assistant", content: "请求失败" }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <h3 className="text-sm font-semibold">RAG 问答</h3>
      <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-3" ref={scrollRef}>
        {messages.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">输入问题，AI 将从教材中检索回答</p>}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 flex flex-col gap-1 ${msg.role === "user" ? "items-end" : ""}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{msg.content}</div>
            {msg.citations && msg.citations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {msg.citations.map((c, ci) => (
                  <Badge key={ci} variant="secondary" className="text-xs"><FileText className="mr-1 size-3" />{c.textbook} · {c.chapter} · P{c.page}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />检索中...</div>}
      </ScrollArea>
      <div className="flex gap-2">
        <Input placeholder="输入问题..." value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
          disabled={!indexReady || loading} className="flex-1" />
        <Button size="icon" onClick={handleSend} disabled={!indexReady || loading || !input.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
