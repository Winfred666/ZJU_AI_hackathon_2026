<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
