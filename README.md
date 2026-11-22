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
| `spec-explore` (optional) | You have a rough idea, an unclear problem or several possible directions, and no spec yet | Subagents explore the idea per module and per hypothesis, including conflicting ones. Their findings are merged into options with trade-offs and open questions, an exploration summary in `.speculatius/`, and the next skill to call. No spec, plan or code is written |
| `spec-write` | You want to add or change a feature, or write down how an existing one behaves | A short spec of what the feature does and why, with examples, in `docs/specs/`. It asks you a few questions first if something is unclear |
| `spec-plan` | The spec is ready and you are about to start coding | A plan of how to build the change in `.speculatius/plan.md`, checked by a second agent before any code is written |
| `spec-implement` (optional) | The plan is reviewed and you want the change built | The change, built in a fixed order: an architecture draft, failing tests, the implementation and a review by a second agent. It ends with a check whether a decision record or `docs/architecture.md` needs an update, and deletes the plan |
| `spec-decision` | You make a technical choice that is hard to undo later, such as a database or a framework | A one-page record of the decision, the alternatives and why they lost, in `docs/decisions/` |
| `spec-check` | You finished a change and want to know the specs are in order | A list of specs that are malformed or too long, and of examples without a test, shown in the chat. No file is written |
| `spec-drift` | You doubt that the docs still match the code, for example before a release | A report of every place where specs, docs and code disagree, in `.speculatius/drift-report.md`. You decide what to fix |

## Workflow

```
spec-explore  →  spec-write   →  spec-plan + review  →  spec-implement         →  spec-check  →  human review  →  merge
(optional,        (interview,      (fresh-context        (architecture draft,       (CI)
 idea still        behavior         review loop)          failing tests @AREA-NNN,
 unclear)          changes only)                          implementation,
                                                          fresh-context review,
                                                          documentation check)
```

`spec-explore` is optional. Start with `spec-write` when you already know which capability you want; call `spec-explore` first when the idea is not yet a clear capability. It fans out subagents, merges their findings into a gitignored exploration summary, and ends by naming the next skill: `spec-write`, `spec-decision`, `spec-plan`, or none.

Refactors and other changes without observable behavior change start at `spec-plan`. Tiny changes skip the written plan.

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

The skills read your glossary; they do not own it. `spec-write` uses the one your repo has and only creates a small `docs/glossary.md` if there is none. Recommendations:

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

No setup step: skills create missing folders and files (`docs/…`, `AGENTS.md` lines) the first time they need them. For an existing app, ask `spec-write` to spec one existing capability at a time.

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
