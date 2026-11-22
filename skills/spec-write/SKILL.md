---
name: spec-write
description: Write or update a living capability spec in docs/specs/ through a short interview, with EARS requirements and Given/When/Then scenarios that carry stable IDs. Use before any change to observable behavior, when the user asks to spec, specify or describe a feature or capability, add or change a requirement or scenario, document existing behavior, or when a spec is over budget and needs splitting.
---

# spec-write

A spec is a non-technical description of one capability: why it exists, what it must do, and examples that prove it. It describes the system as it is on main.

## First run in a repo

Create only what is missing; never overwrite:

- `docs/specs/`
- A glossary: use the one the repo already has (`docs/glossary.md`, `GLOSSARY.md` or similar). Only if there is none, create `docs/glossary.md` from `glossary-template.md` in this folder.
- `docs/specs/.spec-config.yaml` from `spec-config-template.yaml` in this folder. If specs already exist, set each area's `last_scenario_id` to its highest ID in `docs/specs/`.
- `.speculatius/` in the root `.gitignore`, so plans and reports are never committed
- `AGENTS.md`: if missing, create it from `AGENTS-template.md` in this folder. If it exists, add only the missing lines from the template and limit the file to about 20 lines; adjust the glossary path if the repo keeps it elsewhere. If only `CLAUDE.md` exists, add one line pointing to `AGENTS.md`.

Tell the user which files were created.

## Before writing

1. Read the glossary, the target spec if it exists, and neighbouring specs to avoid overlap.
2. Take the next scenario ID per area from `docs/specs/.spec-config.yaml`: `last_scenario_id` plus one. Write the new number back in the same change. Never reuse an ID and never lower `last_scenario_id`, even when a scenario is removed. A new area prefix (e.g. `BILL`) is agreed with the user and added to the file.
3. Run the interview below.

## Interview

Ask only what is needed to write the spec, without wearing the user out.

- **Look before asking.** Answer what you can from code, existing specs, the glossary and the conversation, including an exploration summary from `spec-explore` (`.speculatius/*-exploration-*.md`) if there is one for this idea. Never ask what the repo already tells you; state it as an assumption instead.
- **Ask the biggest gap first:** purpose, non-goals, triggers and failure behavior, concrete scenario values, terms.
- **One question per turn**, at most three if they are tightly related. Offer a recommended answer or 2–4 options, so the user can reply with one word.
- **Stop** when nothing blocks writing, when the user says enough, or after 8 questions. Anything still open goes under `## Open questions`; it must be resolved before implementation, not now.
- **No interview** when the request is already clear. Say so and write the spec.
- **No capability yet?** If the user is still choosing between directions or cannot name the capability, suggest `spec-explore` first. It is optional; continue with the interview if the user prefers.
- Do not ask about implementation (data structures, endpoints, UI layout). That belongs in `spec-plan`.

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
- New domain term? Add it to the glossary in the same change: one line, plain words. The glossary contains term definitions only, never code, IDs or rules. One word per concept; ask the user for the meaning instead of inventing it.

## After writing

1. Run the checker if Node is available: `node <spec-check skill>/scripts/check.mjs <repo-root>`, as described in `spec-check`.
2. Show the user the delta as `ADDED` / `MODIFIED` / `REMOVED` / `RENAMED` requirements and scenario IDs.
3. State plainly that a human must approve every scenario before tests are written. Do not write the linked tests in the same step unless the user approved the scenarios.
