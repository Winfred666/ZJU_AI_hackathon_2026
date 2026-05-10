# 学科知识整合智能体

ZJU AI Hackathon 2026 — 5 hours fullstack AI, topic on Big Health.

## V0.1 MVP

单本教材知识图谱构建与智能问答系统。

**核心链路**: 上传 PDF 教材 → 解析章节 → LLM 提取知识点 → 力导向图谱可视化 → RAG 问答（带引用）

| 模块 | 能力 |
|------|------|
| 文件解析 | PDF / TXT / MD 上传，章节自动识别 |
| 知识提取 | 逐章 LLM 调用，输出结构化知识点 + 关系 |
| 知识图谱 | @antv/g6 力导向图，颜色区分知识类别，线型区分关系 |
| RAG 问答 | 分块 → 嵌入 → 内存向量检索 → LLM 生成 + 来源引用 |

## 代码基础

本项目 RAG 管道核心架构移植自 **[agentset-ai/agentset](https://github.com/agentset-ai/agentset)**（MIT License, 2k+ stars），参见 `docs/reuseable_repo/agentset/`。

| 源文件 (agentset) | 适配文件 (本项目) | 说明 |
|---|---|---|
| `packages/engine/src/chunk.ts` | `lib/chunker.ts` | 文档分块（去 LlamaIndex 依赖，CJK 句边界感知） |
| `packages/engine/src/embedding/index.ts` | `lib/embedder.ts` | 嵌入模型封装（OpenAI 兼容） |
| `packages/engine/src/partition/index.ts` | `lib/pdf-parser.ts` | PDF/TXT 章节解析（pdf-parse 本地解析替代外部 API） |
| `packages/engine/src/vector-store/query.ts` | `lib/vector-store.ts` | 内存向量存储 + 余弦相似度检索（替代 Pinecone/Turbopuffer） |
| `packages/engine/src/llm/index.ts` | `lib/llm.ts` | LLM 调用封装（Vercel AI SDK） |
| `packages/engine/src/env.ts` | `lib/env.ts` | Zod 校验环境变量 |

Agent 技能体系 (`.agents/skills/`, `.claude/skills/`) 同样移植自 agentset，包含 Vercel React 最佳实践、Baseline UI、Accessibility、Metadata 等规则集。

## 技术栈

Next.js 16 · React 19 · TypeScript 5 strict · Tailwind CSS 4 · shadcn/ui · Vercel AI SDK · Zod · @t3-oss/env-nextjs · pdf-parse · @antv/g6 · Zustand

## 快速开始

```bash
npm install
cp .env.example .env  # 填入 OPENAI_API_KEY
npm run dev
```

## 项目结构

```
├── app/
│   ├── layout.tsx, page.tsx          # 三栏布局主页面
│   └── api/parse|textbooks|knowledge|rag/  # API Routes
├── components/
│   ├── ui/                           # shadcn/ui 组件
│   ├── upload-zone.tsx               # 拖拽上传
│   ├── file-list.tsx                 # 教材列表
│   ├── knowledge-graph.tsx           # 力导向图谱
│   ├── knowledge-panel.tsx           # 功能面板
│   └── rag-chat.tsx                  # RAG 问答
├── lib/
│   ├── env.ts                        # Zod 环境变量
│   ├── llm.ts, embedder.ts           # LLM/Embedding 封装
│   ├── chunker.ts, vector-store.ts   # RAG 管道
│   ├── pdf-parser.ts, txt-parser.ts  # 文档解析
│   └── validators.ts                 # Zod Schemas
├── types/index.ts                    # 全局类型定义
└── hooks/use-knowledge-graph.ts      # Zustand 状态管理
```
