# Speculatius: Reconcile Specs

Turn diff report findings into OpenSpec changes via `/opsx:ff`.

NEVER write OpenSpec files directly — always delegate to `/opsx:ff`.

## Prerequisites
- `.speculatius/diff-report.md` must exist (run `/speculatius:diff` first)
- `openspec/specs/` must exist

## Process

### Step 1: Read, Validate, and Present

1. Read `.speculatius/diff-report.md`
2. Collect actionable items:
   - DRIFTED with recommendation UPDATE
   - NEW with recommendation ADD_SPEC
   - UNDERSPECIFIED with recommendation EXPAND_SPEC
3. Skip: INVESTIGATE, ACCEPT_DRIFT, IGNORE, ACCEPT, RE_EXPLORE, FLAG_FOR_REVIEW

4. **Validate EXPAND_SPEC items against main specs.** For each, read
   `openspec/specs/{capability}/spec.md` and search by name AND semantic content.
   If the requirement already exists, drop it and note as a false positive.

5. Group remaining items by capability and present:

       Dropped N items (already in OpenSpec specs):
       - {capability}: "{requirement}" — already in spec as "Requirement: {name}"

       Actionable:
       1. {capability} (N items)
          - EXPAND: {requirement}
          ...

### Step 2: Get User Selection
Accept: individual numbers, ranges ("1-4"), comma-separated ("1,3,5"), or "all".

### Step 3: Check for Existing Changes
Check `openspec/changes/` for changes targeting the same capabilities. If found,
warn and offer: skip, delete and recreate, or continue.

### Step 4: Create Changes via /opsx:ff

Run `/opsx:ff` sequentially in the main context — one per capability. Do NOT use
background agents (they cannot get Write/Bash permissions).

For each capability:
- **Change name**: `{action}-{capability}-spec` (expand/update/document)
- **Spec-only** (all EXPAND_SPEC or UPDATE): design says "documenting existing
  behavior", tasks has single item "Update spec — no code changes required"
- **Code-needed** (ADD_SPEC of new capabilities): normal design and tasks

Show progress: `✓ 1/N {change-name} — all artifacts created`

### Step 5: Verify and Report

1. Run `openspec status --change "{name}" --json` for each change
2. List all changes created
3. For spec-only changes, provide the exact archive command:

       /opsx:bulk-archive {change-1} {change-2} ...

   Or to review: `/opsx:verify {change-name}`

## Rules
- NEVER write OpenSpec files directly — delegate to `/opsx:ff`
- NEVER use background agents — run `/opsx:ff` sequentially in main context
- ONE change per capability, never per requirement
- Always validate EXPAND_SPEC items against main specs before presenting
- Always ask for user confirmation before creating changes
- For spec-only batches, end with the exact `/opsx:bulk-archive` command
