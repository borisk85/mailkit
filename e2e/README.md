# E2E Tests

Visual and integration testing via Playwright.

## Run locally

```bash
pnpm exec playwright test
```

## Generate a new test interactively

```bash
pnpm exec playwright codegen http://localhost:3000
```

## Status

Tests will be added after MVP UI is stable (Ticket #6+). Currently empty —
Playwright MCP is used interactively during dev (see `CLAUDE.md` → UI
Verification Workflow).
