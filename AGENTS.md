<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Test maintenance rules

- Tests **must** focus on structure and core logic — test component existence, event callbacks, data flow, and validation behaviour. Avoid asserting on UI text strings that change frequently with design iterations.
- When a test fails because UI text/content changed, **always read the latest source code first** to understand the new expected behaviour, then **update the stale test** — never revert the frontend code to match an outdated test.
- Prefer `getByRole` / `getByTestId` / semantic queries over exact `getByText` strings.
- For visual-only changes (colours, spacing, themes like the medical-blue palette), tests should not need updating — they test behaviour, not aesthetics.
