<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PDF 上传解析策略

所有 PDF 解析发生在 `app/api/parse/route.ts`，核心原则：**只向 OpenAI API 上传解析后的文字，永不上传原始 PDF 二进制**。

## 分档解析逻辑

| 条件 | 策略 | 状态 |
|------|------|------|
| 文件 < 50KB **或** 页数 ≤ 10 | 全文解析，发送前 30,000 字符给 LLM | `full` |
| 文件 ≥ 50KB **且** 前 25 页找到目录 | 仅提取目录文字，发送给 LLM 生成章节关系图 | `toc_only` |
| 文件 ≥ 50KB **且** 前 25 页无目录 | 仅解析前 20 页，发送给 LLM | `partial` |

## 目录识别

在 PDF 前 25% 页面中搜索 `目录` / `目次` / `Contents` 标记，找到后向下搜索第一个章节标题（`第X章`）或 `前言`/`绪论`/`引言` 作为目录结束边界。未找到结束标记时假定目录占 4 页。

## LLM 调用加速

- 目录文字上限 50,000 字符
- 正文文字上限 30,000 字符  
- 每次 LLM 调用仅发送纯文本，不携带 PDF 二进制或 base64
- 大文件跳过逐页全量解析，仅读取所需页面范围

## PDF 页面按需提取

原始 PDF buffer 缓存在 `pdfBufferStore`，双击知识图谱节点时由 `app/api/knowledge/drill/route.ts` 按需读取指定页码范围，解析后发送文字到 LLM。

# Test maintenance rules

- Tests **must** focus on structure and core logic — test component existence, event callbacks, data flow, and validation behaviour. Avoid asserting on UI text strings that change frequently with design iterations.
- When a test fails because UI text/content changed, **always read the latest source code first** to understand the new expected behaviour, then **update the stale test** — never revert the frontend code to match an outdated test.
- Prefer `getByRole` / `getByTestId` / semantic queries over exact `getByText` strings.
- For visual-only changes (colours, spacing, themes like the medical-blue palette), tests should not need updating — they test behaviour, not aesthetics.

# E2E test workflow

**ALWAYS rebuild before running E2E tests** to ensure the latest code is tested:

```bash
npm run build && npx playwright test --headed --workers=1 e2e/full-flow.spec.ts
```

Or for dev mode (faster iteration, uses running dev server):

```bash
npx playwright test --headed --workers=1 e2e/full-flow.spec.ts
```

## Visual inspection (headed mode)

```bash
# Full-flow upload test — visible browser, single window, 60 s pause to inspect
npx playwright test --headed --workers=1 e2e/full-flow.spec.ts

# Step-by-step debug with Playwright Inspector (persistent browser)
npx playwright test --headed --workers=1 --debug e2e/full-flow.spec.ts
```

Rules:
- **Rebuild** (`npm run build`) before running E2E tests to test the latest code. Skip only if iterating rapidly with a running dev server.
- **Always** use `--workers=1` for headed runs — prevents multiple browser windows from overlapping.
- **Each headed test** must call `visualPause(page)` at the end, which keeps the browser open **60 seconds** so a human can inspect layout, colours, and interactions. (The pause is skipped automatically in CI mode.)
- When a test result looks wrong in headed mode, **inspect the DOM in DevTools first** before assuming the code is broken — the issue may be visual-only (CSS, theme, animation).
- Full-flow tests (upload → parse → extract → graph) live in `e2e/full-flow.spec.ts`. Component-level checks live in `e2e/home.spec.ts`.
