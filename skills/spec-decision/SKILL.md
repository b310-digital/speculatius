---
name: spec-decision
description: Record one hard-to-reverse technical decision as an append-only record in docs/decisions/NNNN-title.md, or supersede an existing one. Use when the user makes or asks about an architecture, dependency, interface or non-functional decision, wants an ADR, or wants to reverse an earlier decision.
---

# spec-decision

Decision records say why the system is built as it is, including what was rejected. Agents read the current files and skip `git log`. When the rejected alternatives stay in the text, agents stop proposing them again.

## Is a record needed?

Yes for: structure, dependencies, interfaces, data storage, non-functional characteristics, anything expensive to undo.
No for: reversible choices. Decide and move on. Say so to the user instead of writing a record.

## New record

1. Create `docs/decisions/` if missing. Next number: highest `NNNN` in `docs/decisions/` + 1 (`0001` for the first), zero-padded to four digits. Title in kebab-case: `0008-use-event-store.md`.
2. Fill `template.md` from this folder. One decision, one page (~60 lines) maximum.
3. Alternatives considered: at least one, each with the concrete reason it lost.
4. Consequences: good and bad. A record with only good consequences is incomplete.
5. Update `docs/architecture.md` if the decision changes current structure, linking to the record.

## Reversing a decision

Never rewrite an existing record's content. Instead:

1. Write a new record whose Context names the old one and why it no longer applies.
2. In the old record change only the status line: `Status: Superseded by [0012](0012-title.md)`.
3. Update `docs/architecture.md` to the new current state.

Allowed edits to an existing record: status, superseded-by links, typos. `spec-check` and the `spec-plan` review flag other edits.

## Reading

`docs/architecture.md` comes first. Read superseded records only when the decision is being revisited.
