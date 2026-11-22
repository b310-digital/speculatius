# AGENTS.md

## Documents
- **Glossary** (`docs/glossary.md`): its only purpose is to define the domain language, one term per line. No code, no file names, no IDs, no counters, no rules, no notes.
- **Specs** (`docs/specs/<capability>.md`): what the system does and why, from the user's view. No technical detail. Always current. `docs/specs/.spec-config.yaml` stores the last scenario ID per area.
- **Architecture** (`docs/architecture.md`): how the system is built now, in about two screens. Always current.
- **Decisions** (`docs/decisions/NNNN-title.md`): why a hard-to-reverse choice was made. Append-only: never edit the content, supersede with a new record.
- **Change plan** (`.speculatius/plan.md`, gitignored): how one change gets built. Deleted when the change is done.

## Rules
- Read the glossary and the architecture doc first.
- Before changing observable behavior: update the spec, then write failing tests.
- Tests carry the scenario ID they prove (e.g. `@AREA-001`). The scenario text stays in the spec.
- Use glossary terms for domain names in specs, code and tests.
- No other files in `docs/`.
