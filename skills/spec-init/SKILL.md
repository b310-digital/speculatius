---
name: spec-init
description: Set up a repo for the spec process by creating the default files from scaffolds - AGENTS.md, docs/glossary.md, docs/architecture.md, docs/specs/ with its scenario ID config, docs/decisions/ and the .speculatius/ gitignore entry. Never overwrites existing files. Use when the user asks to init, set up, bootstrap or scaffold the spec process or the docs structure, or when another spec skill finds the setup missing.
---

# spec-init

Creates the default files of the spec process from the `scaffolds/` folder of this skill. Safe to run again: it creates only what is missing and never overwrites.

## Steps

| Target | Scaffold | Rule |
| --- | --- | --- |
| `AGENTS.md` | `scaffolds/AGENTS.md` | If it exists, add only the missing lines and limit the file to about 20 lines. If only `CLAUDE.md` exists, also add one line there pointing to `AGENTS.md`. |
| Glossary | `scaffolds/glossary.md` | Use the one the repo already has (`docs/glossary.md`, `GLOSSARY.md` or similar). Create `docs/glossary.md` only if there is none. |
| `docs/architecture.md` | `scaffolds/architecture.md` | Fill it from the code where the repo shows the answer. Leave the placeholder where it does not; never guess. |
| `docs/specs/.spec-config.yaml` | `scaffolds/spec-config.yaml` | If specs already exist, set each area's `last_scenario_id` to its highest ID in `docs/specs/`. |
| `docs/decisions/` | none | Empty folder with a `.gitkeep`. |
| Root `.gitignore` | none | Add the line `.speculatius/`, so plans and reports are never committed. |

If the repo keeps its glossary elsewhere, adjust the glossary path in `AGENTS.md`.

## After

Tell the user which files were created, which were left untouched, and which placeholders in `docs/architecture.md` are still open. Name `spec-write` as the next step.
