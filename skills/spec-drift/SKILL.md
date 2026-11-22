---
name: spec-drift
description: Produce a drift report where specs, the architecture doc, decision records and code disagree. Reports only; a human decides what to fix. Use on a schedule, before a release, or when the user asks whether specs or docs are still accurate, out of date or drifted.
---

# spec-drift

The skill lists every place where specs, docs and code disagree. A human decides each fix, because the spec is a contract. The skill never edits specs, code or decision records.

## Input

- **SCOPE** (optional): capabilities (`billing-retries`) or areas (`BILL`). Default: all of `docs/specs/`.

## Steps

1. **Run `spec-check`** first (script if Node is available). Format errors and coverage gaps go into the report as-is.
2. **Specs vs code.** For each requirement in scope, find the implementing code and its tagged tests. Classify:
   - **Aligned**: code and tagged tests do what the requirement says.
   - **Drifted**: code contradicts the requirement or scenario values (thresholds, timings, messages).
   - **Undocumented**: observable behavior in code with no requirement (new routes, commands, events, user-facing errors).
   - **Unimplemented**: requirement with no code path.
   - **Weak test**: the tagged test passes without exercising the scenario's WHEN or THEN.
3. **Architecture vs code.** Components, boundaries and data flow in `docs/architecture.md` that no longer match the code. Accepted decision records the code contradicts.
4. **Glossary.** Domain names in code that differ from glossary terms.
5. **Write the report** to `.speculatius/drift-report.md`. First make sure `.speculatius/` is in the root `.gitignore`. Never in `docs/`.
6. **Present** the counts and the top findings. Ask which to act on. Fixes go through `spec-write` (spec wrong) or a normal change with `spec-plan` (code wrong).

## Report format

```markdown
# Drift report <date>
Scope: <…>
Summary: <n> aligned, <n> drifted, <n> undocumented, <n> unimplemented, <n> weak tests, <n> doc mismatches

## Drifted
### billing-retries → Retry failed charges (BILL-003)
- Spec: retry after 24 hours
- Observed: retry after 12 hours (`<file>:<line>`)
- Confidence: HIGH | LOW
- Decide: fix code | update spec | investigate

## Undocumented
## Unimplemented
## Weak tests
## Coverage gaps (untested scenarios, orphan tags)
## Architecture and decisions
## Glossary
## Check script output
```

Every finding ends with a "Decide" line. Do not pick the answer for the human.
