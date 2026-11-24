---
name: mathlib-pr-conventions
description: >-
  Guidelines and automated checker for authoring, reviewing, and formatting Pull Requests (PRs)
  and commit messages for Mathlib4. Enforces official community conventions: conventional commits,
  concise descriptions without LLM fluff, mandatory LLM-generated declaration, line length ≤ 100,
  and Zulip review standards. Use whenever preparing, drafting, or submitting PRs to Mathlib4.
---

# Mathlib4 Pull Request & Community Conventions

This skill provides guidelines and an automated verification tool to draft Pull Requests (PRs)
and commit messages that strictly conform to the Mathlib4 community review standards.

## Overview & The Core Lesson

Mathlib maintainers (e.g. Zulip PR reviews) strictly enforce:
1. **Conventional PR Titles**: Format `<type>(<optional-scope>): <subject>`.
2. **Minimalist, Human-Readable Descriptions**: No marketing fluff, no verbose boilerplate,
   no unsolicited tutorials. "At least half of typical AI-generated descriptions are superfluous."
3. **Mandatory LLM-generated Disclosure**: Whenever LLM assistance is used, declare it explicitly
   and apply the `LLM-generated` label/tag.
4. **Line Length & Code Hygiene**: Max 100 characters per line, clean imports, 0 warnings.

---

## 1. PR Title Conventions

Format:
```text
<type>(<optional-scope>): <subject>
```

- `<type>`: `feat`, `fix`, `doc`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`.
- `<optional-scope>`: Module path without leading `Mathlib/`, e.g. `NumberTheory/Carmichael`.
- `<subject>`:
  - **Imperative, present tense**: use `add`, `prove`, `change` (never `added`, `adds`, `changes`).
  - **Lowercase initial**: e.g. `prove 561 is the minimal Carmichael number`.
  - **No trailing period**: no `.` at the end.

---

## 2. PR Description (Body) Conventions

### Principles
- **State the mathematical change directly**: What is added or changed?
- **State the motivation**: Why is this needed? (e.g. "Addresses the open TODO in `Mathlib.NumberTheory.Carmichael`").
- **Contrast with previous state**: "Previously, Carmichael numbers were defined but no bound on the smallest number was proven."
- **Avoid superfluous text**: DO NOT explain basic mathematics to Mathlib maintainers. DO NOT paste full Lean code transcripts into the PR description unless strictly necessary.

### Mandatory LLM Disclosure Footer
Mathlib requires declaring AI assistance. Include this exact standard section in the footer:

```markdown
---

### LLM Disclosure
- [x] This PR was prepared with the assistance of an LLM. All proofs and statements have been formally verified by Lean 4 and checked for correctness.
```

---

## 3. Automated Validation Script

Run the built-in validator using Python:

```bash
python .agents/skills/mathlib-pr-conventions/scripts/validate_pr.py \
  --title "feat(NumberTheory/Carmichael): prove 561 is the minimal Carmichael number" \
  --body-file pr_body.md \
  --check-llm
```

## 4. Pre-Submission Checklist

- [ ] PR Title matches regex `^(feat|fix|doc|style|refactor|test|chore|perf|ci)(\([A-Za-z0-9_/]+\))?: [a-z0-9].+[^.]$`.
- [ ] Description is brief (< 20 lines preferred), free of conversational AI padding.
- [ ] LLM disclosure box is checked.
- [ ] Code compiles cleanly with `lake env lean -D warningAsError=true`.
- [ ] Code line width is strictly ≤ 100 chars.
- [ ] All 14 linters (`#lint`) pass with 0 errors.
