<h3>English | <a href="README.md">简体中文</a></h3>

# rh-triage-board

[![CI](https://github.com/3y3y3y-huaiji/rh-triage-board/actions/workflows/ci.yml/badge.svg)](https://github.com/3y3y3y-huaiji/rh-triage-board/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/3y3y3y-huaiji/rh-triage-board/badge)](https://scorecard.dev/viewer/?uri=github.com/3y3y3y-huaiji/rh-triage-board)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MulanPSL--2.0-blue)](LICENSE)

A pure-static Cloudflare Pages triage board for [`leanprover-community/riemann-hypothesis`](https://github.com/leanprover-community/riemann-hypothesis), providing merge-queue visibility, PR conflict radar, Mega-Refactor diff-overflow alerts, batch subsumption de-noising, and compute-tiered low-barrier task discovery.

Live site: <https://rh-triage-board.pages.dev>

[Docs Index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Development](docs/DEVELOPMENT.md) · [CI / CD](docs/CI.md) · [Operations](docs/OPERATIONS.md) · [Security Policy](SECURITY.md)

## Highlights

- **Pure-Static Zero-Backend Sync**: GitHub Actions fetches upstream state every 15 minutes into `/data/board.json` and deploys straight to Cloudflare Pages without committing generated JSON back to `main`.
- **Pinned Live Refresh Bar**: Sticky top bar displaying exact UTC update timestamp, 30s live relative age, upstream `main` short SHA, 15-min polling cadence, and a manual refresh trigger.
- **Conflict Radar & Mega-Refactor Alerts**: Detects file/directory overlaps across open PRs and flags diff-overflow or `changed_files === 0` mega-refactors as `Mega-Refactor / Global Conflict Risk`.
- **Batch Subsumption De-noising**: Parses `#NNN` references from Batch PRs to highlight fragment PRs that no longer need individual review or rebase.
- **Up for Grabs & Contributor Guardrails**: Labels tasks by compute tier (`No Compile` / `16GB Laptop` / `Large Runner`), warns on refactor hotspots, and surfaces upstream `AGENTS.md` (#312) rules.
- **5 Languages & Offline Mock Fallback**: Supports `en`, `zh`, `fr`, `de`, and `ja` (defaulting to English) and falls back cleanly to an embedded mock snapshot when `/data/board.json` is absent.
- **Agent-Native Static Endpoints**: Hosts `/data/board.json`, `/llms.txt`, `/skills/lean-proof-golfing.md`, and `/skills/mathlib-pr-conventions.md` for zero-rate-limit consumption by AI Agents.

## Quick Start

```bash
pnpm install
pnpm run dev
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

## Contributing & Security

- Read [AGENTS.md](AGENTS.md) and [Development Guide](docs/DEVELOPMENT.md) before making changes. Do not push directly to `main`; submit a Pull Request from a feature branch and wait for the `CI 门禁` check.
- Report unpatched vulnerabilities privately per [SECURITY.md](SECURITY.md) instead of opening public issues.

## License

Dual-licensed under either of the following licenses, at your option:

- [Apache License 2.0](LICENSE)
- [Mulan Permissive Software License v2](LICENSE-MULAN)

SPDX identifier: `(Apache-2.0 OR MulanPSL-2.0)`.
