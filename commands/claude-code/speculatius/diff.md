# Speculatius: Spec Diff

Compare explored specs (`.speculatius/specs/`) against OpenSpec specs (`openspec/specs/`)
and produce a structured diff report.

## Prerequisites
- `.speculatius/specs/` must exist (run `/speculatius:explore` first)
- `openspec/specs/` must exist

## Process

### Step 1: Capability Mapping
List every folder in both directories. Categorize:
- **Matched**: exists in both
- **New (undocumented)**: in `.speculatius/specs/` only
- **Missing from app**: in `openspec/specs/` only

### Step 2: Requirement-Level Diff (matched capabilities only)
Read both spec files, compare requirement by requirement. `[NOT TESTED]` scenarios
are coverage gaps, not drift — only flag drift when explored spec actively
contradicts the OpenSpec spec.

Categorize each requirement into exactly one bucket:
- **Aligned**: explored behavior matches OpenSpec spec
- **Drifted**: explored behavior actively contradicts OpenSpec spec
- **Underspecified**: requirement in explored spec but NOT in OpenSpec spec
- **Overspecified**: requirement in OpenSpec spec, not observed in app, AND exploration
  DID test the relevant area (not `[NOT TESTED]`)
- **Coverage Gap**: OpenSpec spec has requirement that exploration didn't exercise

**Directionality rule**: If the OpenSpec spec already has a requirement that the
explored spec doesn't mention, that is a **Coverage Gap**, NOT underspecified.
Only flag underspecified when the explored spec has something the OpenSpec spec lacks.
Search by name AND semantic content — the same behavior may have a different name.

### Step 3: Scenario Coverage Summary
Per matched capability, count: Confirmed, Not Tested, Drifted, New scenarios.

## Output

Write `.speculatius/diff-report.md` with these sections:

### Header
Date, app URL (from `.speculatius/sitemap.md`), explored/existing capability counts.

### Coverage Summary
    **Coverage**: {confirmed}/{total} scenarios confirmed, {not_tested} not tested,
    {drifted} drifted, {new} new

### Summary Table
Columns: Category, Count, Capabilities.

### Per-Capability Coverage
Per matched capability: `| {capability} | Confirmed | Not Tested | Drifted | New |`

### Drifted Requirements
Per drifted requirement:
- Heading: `### {capability} → Requirement: {name}`
- **OpenSpec**: requirement name + file path
- **Explored**: requirement name + file path
- **Confidence**: HIGH or LOW
- Side-by-side table: Behavior, Delta, Recommendation
- Recommendation: UPDATE, INVESTIGATE, or ACCEPT_DRIFT

### New Capabilities
Per undocumented capability:
- **Observed behavior**, **Explored spec** path, **Recommendation**: ADD_SPEC or IGNORE

### Missing Capabilities
Per capability in specs but not in app:
- **Spec says**, **Possible reasons**, **Recommendation**: INVESTIGATE, REMOVE_SPEC, or FLAG_FOR_REVIEW

### Underspecified Requirements
Per requirement in explored spec but NOT in OpenSpec spec:
- **App does (not in spec)**, **Recommendation**: EXPAND_SPEC

### Overspecified Requirements
Per requirement in OpenSpec spec but not observed (and exploration DID test it):
- **Spec says**, **App does**, **Recommendation**: REMOVE_FROM_SPEC, INVESTIGATE, or FLAG_FOR_REVIEW

### Coverage Gaps
Per requirement exploration didn't test:
- **Spec says**, **Why not tested**, **Recommendation**: RE_EXPLORE or ACCEPT

## After Writing the Report
1. Present Coverage Summary and Summary Table
2. Highlight surprises (new capabilities, significant drifts, low coverage)
3. Ask which items the user wants to act on
4. Do NOT generate change proposals — that's `/speculatius:reconcile`
