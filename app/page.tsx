import { KnowledgeGraphDynamic } from "@/components/knowledge-graph-dynamic";

const demoNodes = [
  {
    id: "n1",
    name: "静息电位",
    definition: "细胞在安静状态下膜内外存在的电位差",
    category: "核心概念" as const,
    chapter: "第一章 绪论",
    page: 12,
  },
  {
    id: "n2",
    name: "动作电位",
    definition: "细胞受到刺激时膜电位发生的快速、可逆的翻转",
    category: "核心概念" as const,
    chapter: "第一章 绪论",
    page: 15,
  },
  {
    id: "n3",
    name: "阈电位",
    definition: "触发动作电位所需的临界膜电位值",
    category: "核心概念" as const,
    chapter: "第一章 绪论",
    page: 17,
  },
  {
    id: "n4",
    name: "钠钾泵",
    definition: "主动转运Na+和K+的跨膜蛋白",
    category: "方法" as const,
    chapter: "第二章 细胞膜",
    page: 30,
  },
  {
    id: "n5",
    name: "电压门控钠通道",
    definition: "膜电位变化时开放的钠离子选择性通道",
    category: "方法" as const,
    chapter: "第二章 细胞膜",
    page: 33,
  },
  {
    id: "n6",
    name: "全或无定律",
    definition: "动作电位一旦触发即达到最大值，不因刺激强度增大而增大",
    category: "定理" as const,
    chapter: "第一章 绪论",
    page: 18,
  },
  {
    id: "n7",
    name: "去极化",
    definition: "膜电位绝对值减小的过程",
    category: "现象" as const,
    chapter: "第一章 绪论",
    page: 16,
  },
  {
    id: "n8",
    name: "复极化",
    definition: "膜电位恢复至静息电位的过程",
    category: "现象" as const,
    chapter: "第一章 绪论",
    page: 16,
  },
];

const demoEdges = [
  {
    source: "n1",
    target: "n2",
    relationType: "prerequisite" as const,
    description: "理解动作电位需先掌握静息电位",
  },
  {
    source: "n1",
    target: "n3",
    relationType: "prerequisite" as const,
    description: "阈电位基于静息电位定义",
  },
  {
    source: "n3",
    target: "n2",
    relationType: "prerequisite" as const,
    description: "达到阈电位即触发动作电位",
  },
  {
    source: "n2",
    target: "n6",
    relationType: "contains" as const,
    description: "动作电位遵循全或无定律",
  },
  {
    source: "n2",
    target: "n7",
    relationType: "contains" as const,
    description: "动作电位包含去极化过程",
  },
  {
    source: "n2",
    target: "n8",
    relationType: "contains" as const,
    description: "动作电位包含复极化过程",
  },
  {
    source: "n5",
    target: "n7",
    relationType: "prerequisite" as const,
    description: "电压门控钠通道开放引发去极化",
  },
  {
    source: "n4",
    target: "n8",
    relationType: "prerequisite" as const,
    description: "钠钾泵驱动复极化",
  },
  {
    source: "n2",
    target: "n4",
    relationType: "contains" as const,
    description: "动作电位涉及钠钾泵",
  },
  {
    source: "n2",
    target: "n5",
    relationType: "contains" as const,
    description: "动作电位涉及电压门控钠通道",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          学科知识整合智能体
        </h1>
        <span className="text-xs text-zinc-400">V0.1 MVP</span>
      </header>

      <main className="flex flex-1">
        {/* Left panel — textbook management (placeholder) */}
        <aside className="w-[20%] min-w-[200px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
            教材管理
          </h2>
          <div className="flex flex-col gap-2">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center text-xs text-zinc-400 cursor-pointer hover:border-purple-400 transition-colors">
              拖拽或点击上传 PDF
            </div>
            <div className="text-xs text-zinc-500 mt-3 space-y-1">
              <div className="flex items-center justify-between py-1 px-2 rounded bg-purple-50 dark:bg-purple-900/20">
                <span>生理学.pdf</span>
                <span className="text-green-600 text-[10px]">已解析</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center — knowledge graph */}
        <section className="flex-1 relative bg-zinc-50 dark:bg-zinc-950">
          <KnowledgeGraphDynamic
            nodes={demoNodes}
            edges={demoEdges}
            className="w-full h-full"
          />
        </section>

        {/* Right panel — function panel (placeholder) */}
        <aside className="w-[30%] min-w-[280px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            功能面板
          </h2>
          <button className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer">
            提取知识
          </button>
          <button className="w-full py-2 px-4 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
            构建图谱
          </button>
          <button className="w-full py-2 px-4 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
            建立索引
          </button>

          <hr className="my-2 border-zinc-200 dark:border-zinc-800" />

          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            RAG 问答
          </h3>
          <textarea
            className="w-full p-3 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 resize-none h-24"
            placeholder="输入问题，基于教材知识库回答..."
          />
          <button className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors cursor-pointer">
            发送
          </button>
        </aside>
      </main>
    </div>
  );
}
