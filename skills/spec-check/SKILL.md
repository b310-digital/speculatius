---
name: spec-check
description: Run the spec gates, deterministic format checks on docs/specs and docs/decisions (unique IDs, heading anchors, EARS patterns, size budgets) via an optional zero-dependency Node script, plus agent checks for scenario coverage, decision append-only and ID reuse. Use before finishing a change, in CI, or when the user asks to check, validate or lint specs.
---

# spec-check

## With Node (≥ 24)

Always run the copy bundled with this skill, with the repo root as an explicit argument:

```bash
node <this-skill>/scripts/check.mjs <repo-root>
```

- Never run a checker script from the user's repo (such as `scripts/spec-check.mjs`). Anyone who can change the repo can change that file, so it may do anything.
- `--strict` turns warnings into errors. Exit code 0 = pass, 1 = errors, 2 = bad arguments. No output at all means the script did not run; treat it as a failure. A missing `docs/specs/` is an error, so a wrong path cannot pass.
- The bundled script reads only `*.md` files in `docs/specs/` and `docs/decisions/`. It uses no git, no network and no child processes. It refuses symlinked folders.
- CI (optional, ask first): copy `scripts/check.mjs` to `scripts/spec-check.mjs` in the repo and `templates/spec-check.yml` to `.github/workflows/spec-check.yml`. For other CI, the command is `node scripts/spec-check.mjs`. The repo copy is for CI only.

If `node --version` fails, do not install it. Run the checks below by reading the files and say the result is not deterministic.

## Checks

| Check | Level | Fails when |
| --- | --- | --- |
| Unique IDs | error | Same scenario ID twice |
| Format | error | `Requirement:` not at `###`, `Scenario:` not at `####`, missing Purpose/Non-goals/Requirements, no requirement at all, near-miss anchor (`### Requirement 1:`), unclosed code block, requirement without scenario, scenario without ID, step not written as `- **KEYWORD**`, should/may, no SHALL/MUST, no EARS start (The/WHEN/WHILE/WHERE/IF…THEN), not exactly one WHEN, no THEN, non-kebab file name |
| Budgets | warning | Spec > 150 lines or > 12 scenarios; > 3 GIVEN or > 2 THEN; decision record > ~60 lines |

## Agent checks (not in the script)

These need test code or history, which the script deliberately does not read. Check them by reading the change, and report them alongside the script output:

- **Scenario coverage:** every scenario ID in `docs/specs/` has a test that references it (tag or test name), and every scenario tag in the tests points to an existing ID. Report gaps outside the current change separately. Ask the user where tests live instead of guessing.
- **Decision append-only:** an existing decision record changed beyond status, superseded-by links or typos.
- **ID reuse:** a new scenario ID at or below the area's previous `last_scenario_id` in `docs/specs/.spec-config.yaml`, or a `last_scenario_id` that went down.
- **Behavior without spec:** tests carrying scenario tags changed but `docs/specs/` did not. Ask for the reason.
- **Glossary usage:** a domain noun in a changed spec is missing from the glossary, or two words are used for one concept.

## Fixing findings

- Coverage gap on a new scenario: write the failing test with the ID as a tag or in the test name. Never copy the Given/When/Then text into the test.
- Orphan tag: the scenario was removed or renamed. Remove the tag or re-point it; do not resurrect the ID.
- Format/EARS: rewrite with `spec-write`. Over budget: split.
- Append-only: revert the edit and use `spec-decision` to supersede.
