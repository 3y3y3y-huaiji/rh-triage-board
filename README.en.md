# rh-triage-board

A pure-static Cloudflare Pages triage board for [`leanprover-community/riemann-hypothesis`](https://github.com/leanprover-community/riemann-hypothesis), providing merge-queue visibility, PR conflict radar, Mega-Refactor diff-overflow alerts, batch subsumption de-noising, and compute-tiered low-barrier task discovery.

[中文](README.md) · [Docs Index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [CI / CD](docs/CI.md)

## Highlights

- **Pure-Static Zero-Backend Sync**: GitHub Actions fetches upstream state every 15 minutes into `/data/board.json` and deploys straight to Cloudflare Pages without committing generated JSON back to `main`.
- **Conflict Radar & Mega-Refactor Alerts**: Detects file/directory overlaps across open PRs and flags diff-overflow or `changed_files === 0` mega-refactors as `Mega-Refactor / Global Conflict Risk`.
- **Batch Subsumption De-noising**: Parses `#NNN` references from Batch PRs to highlight fragment PRs that no longer need individual review or rebase.
- **Up for Grabs & Contributor Guardrails**: Labels tasks by compute tier (`No Compile` / `16GB Laptop` / `Large Runner`), warns on refactor hotspots, and surfaces upstream `AGENTS.md` (#312) rules.
- **Bilingual UI & Offline Mock Fallback**: Automatically falls back to an embedded mock snapshot when `/data/board.json` is absent.

## Quick Start

```bash
pnpm install
pnpm dev
```

Fetch a live upstream snapshot locally (optionally with `GITHUB_TOKEN`):

```bash
pnpm run fetch:board
```

## Verification

Run lightweight checks locally (Playwright E2E runs automatically in GitHub Actions):

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run verify:docs
pnpm test
pnpm run build && pnpm run verify:build
```
