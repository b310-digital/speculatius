---
name: spec-plan
description: Write the change plan for one change, with an ADDED/MODIFIED/REMOVED/RENAMED delta summary of spec requirements and scenario IDs on top, then review spec diff and plan automatically in a fresh context until only nitpicks remain. Explores the build approach first, with --explore or when the approach is unclear, by fanning out subagents and merging their findings into options. The plan is the input for spec-implement. Use before starting implementation of a change, when the user asks for a plan, implementation plan or plan review, after a spec was updated, or when the user wants to compare approaches for a change.
---

# spec-plan

The plan describes how one change gets built. The plan is reviewed automatically before coding. `spec-implement` builds the change from it.

## When to skip

- Under a day of work and one person: a conversation is enough, no written plan.
- Spikes and prototypes, until the team decides to keep them.

## Explore first?

Decide this before step 1. Explore first in either of these cases:

1. The user passes `--explore`, even when the approach is clear.
2. The approach is unclear: the user is choosing between several ways to build the change, the change crosses modules with no obvious starting point, or the user asks whether a refactor is worth doing. Tell the user in one line why you explore first.

To explore, read `<spec-write skill>/explore.md` and follow it. It ends either by returning to the steps below or by naming another skill. In every other case, skip that file and continue below.

## Steps

1. **Gather context as its own step.** Read the spec diff (`git diff $(git merge-base HEAD <default-branch>) -- docs`, plus new files that git does not track yet: `git ls-files --others --exclude-standard -- docs`), the glossary, `docs/architecture.md`, relevant decision records, an exploration summary (`.speculatius/*-exploration-*.md`) if there is one for this change, and the code you will touch. Do not code yet.
2. **Propose first.** Write the plan from your own understanding before the user suggests an approach. If the user already suggested one, still state your reading of the problem first.
3. **Write the plan** using the structure below to `.speculatius/plan.md`. First make sure `.speculatius/` is in the root `.gitignore`. If a plan from another change is still there, ask before overwriting it. Copying it into a PR or ticket is optional and up to the user. Never put it in `docs/`.
4. **Review automatically** (below). Do not ask whether to review; do not write code until the verdict is READY.
5. **Hand over.** The skill ends at the reviewed plan. Name `spec-implement` as the next step.

## Plan structure

```markdown
## Delta
- ADDED: <Requirement name> (BILL-005, BILL-006)
- MODIFIED: <Requirement name> (BILL-003)
- REMOVED: <Requirement name> (BILL-002, ID retired)
- RENAMED: <Old> → <New>
(or: "No observable behavior change" for refactors)

## Goal
<One or two sentences.>

## Approach
<How, and why this way. Name rejected alternatives in one line each.>

## Files
- <file or module>: <what changes>

## Risks
- <risk>: <mitigation>

## Test plan
- New failing tests first for: BILL-005, BILL-006 (layer: API)
- Updated: BILL-003
- Untagged edge-case tests: <list>

## Open questions
- <must be empty before implementation>
```

## Rules

- A behavior change without a spec diff is incomplete. If the Delta is non-empty and `docs/specs/` has no diff, stop and run `spec-write` first.
- Choose the cheapest test layer that proves each scenario.
- Keep the plan as short as the change allows. A file-level list is fine here because the plan does not outlive the change.

## Review

The reviewer did not write the plan, so it catches gaps the author overlooks. The reviewer reads only the spec diff, the plan and the files they reference.

**Fresh context.** Use the first option the harness offers:

1. A subagent or task tool with a new context (Claude Code `Agent`, OpenCode subagent, Codex sub-session).
2. A different model or CLI (e.g. `codex exec`, `claude -p`), only after the user confirms they trust this repo for that CLI. Such a CLI loads the repo's own config and hooks without asking.
3. Otherwise ask the user to paste the prompt into a new session and return the reply.

Before sending, replace `<base-sha>` with the merge-base SHA and fill in the untracked files from step 1. Pass paths, not summaries. Never pass your conclusions, chat history or opinions about the plan.

**Reviewer prompt**

```
You review a planned change before any code is written. Read only:
- the spec diff: `git diff <base-sha> -- docs`
- these new, untracked files in full: <list or "none">
- the plan: .speculatius/plan.md
- the glossary, docs/architecture.md and the files the plan names.

Reply in three parts:
1. Explain-back: in 5 sentences or fewer, what changes for the user and how it will be built.
2. Findings, each tagged BLOCKER / MAJOR / NITPICK:
   - gaps: missing scenarios, unhandled failure paths, open questions left
   - risks: wrong test layer, hidden behavior change, data migration, reversibility
   - spec rules: technical detail in a spec, should/may or no EARS pattern,
     scenario restating its requirement, two WHENs, UI steps
   - glossary: domain nouns in changed scenarios missing from the glossary,
     or two words for one concept
   - delta: does the plan's ADDED/MODIFIED/REMOVED list match the spec diff?
   - history: existing decision records edited beyond status, links or typos;
     a new scenario ID at or below the area's old `last_scenario_id` in docs/specs/.spec-config.yaml
3. Verdict: READY (nitpicks only) or REVISE.
```

**Loop**

1. Compare the explain-back with the plan. A wrong explain-back is a BLOCKER: the plan or spec is unclear.
2. Fix BLOCKER and MAJOR findings in the plan yourself. Findings in the spec go back through `spec-write`, and the user approves the change.
3. Re-run with a new fresh context. Stop at READY, or after 3 rounds; then hand the remaining findings to the user.
4. Report in a few lines: rounds run, what changed, remaining nitpicks.

The user can ask to re-run the review at any time, e.g. after editing the plan.
