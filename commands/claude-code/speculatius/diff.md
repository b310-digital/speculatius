# Speculatius: Spec Diff

Compare explored behavioral specs against the existing OpenSpec source-of-truth specs
and produce a structured diff report.

## Prerequisites
- `.speculatius/specs/` must exist (run `/speculatius:explore` first)
- `openspec/specs/` must exist

If either is missing or empty, stop and explain what's needed.

## Process

### Step 1: Capability Mapping
List every folder in both `.speculatius/specs/` and `openspec/specs/`.
Categorize each capability:
- **Matched**: same folder name exists in both directories
- **New (undocumented)**: exists in `.speculatius/specs/` only
- **Missing from app**: exists in `openspec/specs/` only

### Step 2: Requirement-Level Diff (for matched capabilities only)
For each matched pair, read both spec files and compare requirement by requirement.

**Confidence-aware comparison**: When the explored spec uses `[NOT TESTED]` on a
scenario, treat it as a coverage gap — NOT as drift or disagreement. Only flag
drift when the explored spec actively contradicts the existing spec with a SHALL
or SHOULD statement.

Categorize each requirement into exactly one bucket:
- **Aligned**: explored behavior matches the existing spec (confirmed via SHALL)
- **Drifted**: explored behavior actively contradicts the spec — describe the
  specific delta. Both specs must have a statement about the same behavior that
  disagrees.
- **Underspecified**: explored spec has requirements not present in the existing
  spec (app does more than spec documents). **Direction check**: only flag as
  underspecified if the requirement is in the *explored* spec but NOT in the
  *existing OpenSpec* spec. If the OpenSpec spec already has the requirement but
  the explored spec doesn't mention it, that is a **Coverage Gap** (the
  exploration didn't exercise it), NOT underspecified.
- **Overspecified**: existing spec describes requirements not observed in the app
  AND the explored spec did not mark them `[NOT TESTED]`. If the explored spec
  simply didn't test the behavior, categorize as **Coverage Gap** instead.
- **Coverage Gap**: existing spec describes requirements that the exploration did
  not exercise (marked `[NOT TESTED]` or simply absent from explored spec without
  contradiction). These are NOT spec problems — they are exploration completeness
  issues.

### Step 3: Scenario Coverage Summary
For each matched capability, count:
- **Confirmed**: scenarios from the existing spec that were verified by exploration (SHALL match)
- **Not Tested**: scenarios from the existing spec that exploration did not exercise
- **Drifted**: scenarios where explored behavior contradicts the spec
- **New**: scenarios in explored spec not present in existing spec

## Output

Write a single file: `.speculatius/diff-report.md`

Structure it as follows:

### Header
- Generated date
- App URL (pull from `.speculatius/sitemap.md`)
- Count of explored capabilities and existing spec capabilities

### Coverage Summary
A high-level stats line:

    **Coverage**: {confirmed}/{total} scenarios confirmed, {not_tested} not tested,
    {drifted} drifted, {new} new

This immediately tells the user how trustworthy the diff is.

### Summary Table
A table with columns: Category, Count, Capabilities. Categories are:
Aligned, Drifted, New (undocumented), Missing from app, Underspecified,
Overspecified, Coverage Gap.

### Per-Capability Coverage Table
For each matched capability, a small table:

    | {capability} | Confirmed | Not Tested | Drifted | New |
    |---|---|---|---|---|
    | Scenarios | 5 | 2 | 1 | 3 |

### Drifted Requirements Section
For each drifted requirement, a subsection with:
- Heading: `### {capability} → Requirement: {requirement name}`
- **OpenSpec requirement**: `### Requirement: {name}` from `openspec/specs/{capability}/spec.md`
- **Explored requirement**: `### Requirement: {name}` from `.speculatius/specs/{capability}/spec.md`
- **Confidence**: HIGH (both specs have detailed scenarios) or LOW (explored spec
  only observed surface-level UI)
- A side-by-side table with columns: (blank), Spec, App
- Rows for: Behavior, Delta, Recommendation
- Recommendation must be one of: UPDATE, INVESTIGATE, ACCEPT_DRIFT

Only use DRIFTED when the explored spec **actively contradicts** the existing spec.
If the exploration simply didn't test something, that's a Coverage Gap, not drift.

Example:

    ### auth → Requirement: User Login

    **Confidence**: HIGH

    | | Spec | App |
    |---|---|---|
    | **Behavior** | Email + password login | Email + password login |
    | **Error message** | "Incorrect credentials" | "Invalid email or password" |
    | **Delta** | Error message text changed | |
    | **Recommendation** | UPDATE | |

### New Capabilities Section
For each undocumented capability:
- Heading: `### {capability}`
- **Observed behavior**: brief summary
- **Explored spec**: path to the file in `.speculatius/specs/`
- **Recommendation**: ADD_SPEC or IGNORE (with explanation)

### Missing Capabilities Section
For each capability in specs but not found in app:
- Heading: `### {capability}`
- **Spec says**: brief summary of what the spec describes
- **Possible reasons**: hypothesis — check `.speculatius/sitemap.md` for clues
  (auth-gated? external redirect? feature-flagged? backend-only? removed?)
- **Recommendation**: INVESTIGATE, REMOVE_SPEC, or FLAG_FOR_REVIEW

### Underspecified Requirements Section
For each requirement the app has but the spec doesn't cover:
- Heading: `### {capability} → {requirement name}`
- **App does (not in spec)**: description of the observed behavior
- **Explored spec reference**: `### Requirement: {name}` from `.speculatius/specs/{capability}/spec.md`
- **OpenSpec check**: confirm no matching requirement exists in `openspec/specs/{capability}/spec.md`
- **Recommendation**: EXPAND_SPEC

**IMPORTANT directionality check**: Before writing an UNDERSPECIFIED entry, read the
existing OpenSpec spec (`openspec/specs/{capability}/spec.md`) and verify the requirement
is truly absent. Search by requirement name AND by semantic content (the same behavior
may exist under a different name). If the OpenSpec spec already documents this behavior,
categorize it as **Coverage Gap** instead (the exploration missed it, not the spec).

### Overspecified Requirements Section
For each requirement the spec has but the app does NOT exhibit (and exploration
DID test the relevant area):
- Heading: `### {capability} → {requirement name}`
- **Spec says**: description of the specified behavior
- **App does**: what was actually observed (or "behavior not present")
- **Recommendation**: REMOVE_FROM_SPEC, INVESTIGATE, or FLAG_FOR_REVIEW

### Coverage Gaps Section
For each requirement the spec has that the exploration simply didn't test:
- Heading: `### {capability} → {requirement name}`
- **Spec says**: brief description
- **Why not tested**: reason (e.g., "requires drag interaction", "backend-only",
  "auth-gated", "not exercised during exploration")
- **Recommendation**: RE_EXPLORE or ACCEPT (with explanation)

## After Writing the Report

1. Present the Coverage Summary line
2. Present the Summary Table
3. Highlight anything surprising (new capabilities, significant drifts, low coverage)
4. Ask which items the user wants to act on
5. Do NOT generate change proposals — that's what `/speculatius:reconcile` is for
