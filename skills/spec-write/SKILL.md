---
name: spec-write
description: Write or update a living capability spec in docs/specs/ through a short interview, with EARS requirements and Given/When/Then scenarios that carry stable IDs. Two optional steps frame the spec. At the start it explores a rough idea, with --explore or when the capability is unclear, by fanning out subagents and merging their findings into options. At the end it writes the change plan and has it reviewed in a fresh context, with --plan or after asking the user. Use before any change to observable behavior, before starting implementation of a change, when the user asks for a plan, implementation plan or plan review, when the user asks to spec, specify or describe a feature or capability, add or change a requirement or scenario, document existing behavior, or when a spec is over budget and needs splitting. Also use when the user has a vague idea, an unclear problem or several possible directions, asks to explore, brainstorm, think through or compare approaches, or asks whether something is worth building.
---

# spec-write

A spec is a non-technical description of one capability: why it exists, what it must do, and examples that prove it. It describes the system as it is on main.

Two optional steps frame the spec, each in its own file in this folder: the exploration at the start (`explore.md`) and the change plan at the end (`plan.md`). Read each file only when its step runs.

## Explore first?

Decide this before anything else, and before creating any folder. Explore first in either of these cases:

1. The user passes `--explore`, even when the request names a clear capability.
2. The capability is unclear: the user is choosing between directions, cannot name the capability, or asks whether the idea is worth building. Tell the user in one line why you explore first.

To explore, read `explore.md` in this folder and follow it. It ends by returning here, by continuing with `plan.md`, or by naming another skill. In every other case, skip `explore.md` and continue below.

## Plan only?

Skip the spec and go straight to `plan.md` in this folder in either of these cases:

1. The change has no observable behavior change, such as a refactor.
2. The spec for the change is already written, and the user asks for the plan or for a plan review.

## Missing setup

Never run `spec-init` yourself; the user decides. Create only what this spec needs:

- `docs/specs/` if the folder is missing.
- `docs/specs/.spec-config.yaml` if it is missing, with one `last_scenario_id` entry per area. If specs already exist, set each area to its highest ID in `docs/specs/`.

If `AGENTS.md`, the glossary or `docs/architecture.md` is missing, tell the user in one line that `spec-init` creates them, and continue.

## Before writing

1. Read the glossary if there is one, the target spec if it exists, and neighbouring specs to avoid overlap.
2. Take the next scenario ID per area from `docs/specs/.spec-config.yaml`: `last_scenario_id` plus one. Write the new number back in the same change. Never reuse an ID and never lower `last_scenario_id`, even when a scenario is removed. A new area prefix (e.g. `BILL`) is agreed with the user and added to the file.
3. Run the interview below.

## Interview

Ask only what is needed to write the spec, without wearing the user out.

- **Look before asking.** Answer what you can from code, existing specs, the glossary and the conversation, including an exploration summary (`.speculatius/*-exploration-*.md`) if there is one for this idea. Never ask what the repo already tells you; state it as an assumption instead.
- **Ask the biggest gap first:** purpose, non-goals, triggers and failure behavior, concrete scenario values, terms.
- **One question per turn**, at most three if they are tightly related. Offer a recommended answer or 2–4 options, so the user can reply with one word.
- **Stop** when nothing blocks writing, when the user says enough, or after 8 questions. Anything still open goes under `## Open questions`; it must be resolved before implementation, not now.
- **No interview** when the request is already clear. Say so and write the spec.
- Do not ask about implementation (data structures, endpoints, UI layout). That belongs in the plan.

## Existing behavior

When the user asks to spec something that already exists, read the code and its tests instead of interviewing. One capability at a time.

- Write only behavior the code shows. Anything you are unsure of goes under `## Open questions`.
- Where an existing test already proves a scenario, propose adding the `@<ID>` tag to it. List scenarios without a test; do not write tests yet.

## Format

Use `template.md` in this folder. Exact anchors:

- `## Purpose`, `## Non-goals`, `## Requirements`, optional `## Open questions`
- `### Requirement: <name>`: requirement names are identifiers, rename only deliberately
- `#### Scenario: <AREA>-<NNN> <name>`
- Steps as bullets with bold keywords: `- **GIVEN**`, `- **WHEN**`, `- **THEN**`, `- **AND**`
- File name: kebab-case capability name, no numbers, no dates: `docs/specs/billing-retries.md`

## Content rules

- **User's view only.** No data structures, languages, file names, endpoints or UI clicks. Those go to `architecture.md`, a decision record, or test code.
- **Purpose first** in 2–4 sentences. **Non-goals are mandatory.**
- **Requirements:** one or two sentences, SHALL or MUST, never should/may. One EARS pattern each:
  - Ubiquitous: `The <system> SHALL <response>.`
  - Event: `WHEN <trigger>, the <system> SHALL <response>.`
  - State: `WHILE <state>, the <system> SHALL <response>.`
  - Optional feature: `WHERE <feature is included>, the <system> SHALL <response>.`
  - Unwanted: `IF <unwanted event>, THEN the <system> SHALL <response>.`
  - `<system>` is a glossary term. More than three preconditions: split. Constraints that are not conditional behavior go to `architecture.md` or a decision record.
- **Scenarios:** declarative domain language, glossary terms only, ≤3 GIVEN, exactly 1 WHEN, ≤2 THEN (AND counts toward the step it follows). Concrete values. A scenario that only restates its requirement is deleted.
- **Curate:** 5–12 scenarios that define the capability. Edge cases and regressions live in tests without IDs.
- Every requirement has at least one scenario; no scenario without a requirement.

## Updating

- Edit in place, never create `-v2` copies. Removed scenarios disappear; their IDs stay retired.
- Over ~150 lines or 12 scenarios means more than one capability: turn `x.md` into `x/index.md` (family purpose and links, no requirements) plus one file per sub-capability. Each sub-file is a complete spec with its own Purpose, Non-goals and Requirements. Keep scenario IDs unchanged when moving.
- New domain term? Add it to the glossary in the same change: one line, plain words. Without a glossary, list the new terms for the user instead. The glossary contains term definitions only, never code, IDs or rules. One word per concept; ask the user for the meaning instead of inventing it.

## After writing

1. Run the checker if Node is available: `node <spec-check skill>/scripts/check.mjs <repo-root>`, as described in `spec-check`.
2. Show the user the delta as `ADDED` / `MODIFIED` / `REMOVED` / `RENAMED` requirements and scenario IDs.
3. State plainly that a human must approve every scenario before tests are written. Do not write the linked tests in the same step unless the user approved the scenarios.
4. Continue with the plan, as the last action:
   - The user passed `--plan`: read `plan.md` in this folder and follow it in the same call, without asking.
   - Otherwise: ask the user whether to continue with the plan now. On yes, read `plan.md` and follow it in the same call. On no, tell the user that `spec-write --plan` writes the plan later, and stop.
   - Skip this step when `## Open questions` is non-empty, and say which questions block the plan.
