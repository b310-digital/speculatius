# 🍪 Speculatius

Agent skills for a short, enforced documentation process: living capability specs with executable scenarios, a lean decision log, one glossary, and plans that die at merge.

> **Beta.** Speculatius is early work and may contain errors. Review what the skills and the checker produce before you rely on it.

## The idea

Agents read every file in a repo and treat it as true. Stale or sprawling documents mislead them. This process therefore uses few documents, limits their size, and gives each a clear lifespan.

- **Write intent down before building.** A change to observable behavior starts with the spec, not the code.
- **Small documents or none.** Every artifact has a size budget; over budget means split.
- **Intent apart from implementation.** Specs describe behavior from the user's view. Technical choices go to the architecture doc and decision records.
- **The truth is executable.** Each scenario has a stable ID, and a test is tagged with that ID. The scenario text is written only in the spec.
- **Declared lifespan.** Specs, glossary and architecture doc are living and always current. Decision records are append-only, so rejected options stay visible. The change plan is deleted when the change is done.

Agents may draft scenarios, and a human approves each one. Refactors and tiny changes need no spec. Reversible choices need no decision record.

## Skills

| Skill | Call it when | What you get |
| --- | --- | --- |
| `spec-init` | You set up a repo for the process | The default files: `AGENTS.md`, glossary, `docs/architecture.md`, `docs/specs/`, `docs/decisions/`. Existing files stay untouched |
| `spec-write` | You add or change a feature, document an existing one, or have a rough idea | A short spec in `docs/specs/`. `--explore` compares directions first, `--plan` adds a reviewed change plan |
| `spec-implement` (optional) | The plan is reviewed and you want the change built | The change: failing tests first, then the code, then a review by a second agent |
| `spec-decision` | You make a technical choice that is hard to undo | A one-page record in `docs/decisions/` with the alternatives and why they lost |
| `spec-check` | You finished a change | A list of malformed or oversized specs and of scenarios without a test |
| `spec-drift` | You doubt the docs still match the code | A report of every mismatch in `.speculatius/drift-report.md` |

## Workflow

```
spec-init (once per repo)

spec-write                                   →  spec-implement         →  spec-check  →  human review  →  merge
(1. exploration, optional: --explore            (architecture draft,       (CI)
    or the idea is unclear                       failing tests @AREA-NNN,
 2. interview and spec, behavior                 implementation,
    changes only                                 fresh-context review,
 3. plan + fresh-context review,                 documentation check)
    optional: --plan or on request)
```

`spec-write` is the entry point for every idea, clear or rough. The spec is its core, and two optional steps frame it:

- **Exploration, at the start.** When the idea is not yet a clear capability, or when you pass `--explore`, `spec-write` fans out subagents and merges their findings into a gitignored exploration summary. When the chosen direction changes observable behavior, it continues with the interview and the spec in the same call. A direction without observable behavior change continues with the plan. A hard-to-reverse technical choice ends with a pointer to `spec-decision`.
- **Plan, at the end.** With `--plan`, `spec-write` continues with the plan and its review after the spec is written. Without the flag, it asks you as its last action.

Refactors and other changes without observable behavior change skip the spec: `spec-write` goes straight to the plan. Tiny changes skip the written plan.

`spec-implement` is optional. You are free to build the change with any tool or workflow you like; the plan in `.speculatius/plan.md` is plain markdown. In that case, update `docs/architecture.md` and delete the plan yourself when the change is done.

## What it produces in your repo

```
AGENTS.md                         # ~20 lines: pointers + rules
docs/
  glossary.md                     # one line per domain term (an existing glossary is reused)
  architecture.md                 # living current-state overview
  decisions/0007-event-store.md   # append-only decision records
  specs/billing-retries.md        # one capability per file
  specs/.spec-config.yaml         # last scenario ID per area
tests/…                           # tests tagged @BILL-003
.speculatius/                     # gitignored scratch: exploration summaries, drift reports, plan drafts
```

## Glossary

The skills read your glossary; they do not own it. `spec-init` uses the one your repo has and only creates a small `docs/glossary.md` if there is none. Recommendations:

- Its only purpose is to define the domain language. Code, file names, IDs, rules and notes stay out.
- One line per term: the term and a plain-language definition.
- One word per concept. Name a rejected synonym once in the definition ("Not 'client'.") instead of listing both.
- Use the same words in specs, tests and code (types, modules, events).
- Add a new term in the same change that first uses it.
- Changing what a term means affects every spec that uses it, so review it like code.

## Install

Skills follow the [Agent Skills](https://agentskills.io) format (`skills/<name>/SKILL.md`), so any harness that reads that format works.

**Claude Code (plugin)**

```bash
/plugin marketplace add b310-digital/speculatius
```

```bash
/plugin install speculatius@speculatius
```

**Any harness (copy)**

```bash
git clone https://github.com/b310-digital/speculatius /tmp/speculatius
```

```bash
cp -r /tmp/speculatius/skills/* <skills-dir>/
```

Common project skill directories (check your harness docs, these move):

| Harness | Directory |
| --- | --- |
| Claude Code | `.claude/skills/` |
| Codex | `.agents/skills/` |
| OpenCode | `.opencode/skills/` (also reads `.claude/skills/`) |
| Antigravity | `.agent/skills/` |

Run `spec-init` once per repo to create the default files (`docs/…`, `AGENTS.md`). `spec-write` runs it for you if you skip it. For an existing app, ask `spec-write` to spec one existing capability at a time.

## The check script

`skills/spec-check/scripts/check.mjs` is optional and has zero dependencies (Node ≥ 24). Without Node, the `spec-check` skill does the same checks by reading the files.

```bash
node skills/spec-check/scripts/check.mjs <repo-root>
```

The `spec-check` skill can copy it into your repo and add a GitHub Actions workflow.

## Development

```bash
npm test
```

## License

MIT
