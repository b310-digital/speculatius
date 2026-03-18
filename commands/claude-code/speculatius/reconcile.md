# Speculatius: Reconcile Specs

Turn diff report findings into OpenSpec changes by delegating to `/opsx:ff`.

**Key principle**: Speculatius reconcile is an orchestrator. It NEVER writes OpenSpec
files directly. Instead, it invokes `/opsx:ff` for each capability, which handles
artifact creation through OpenSpec's own workflow (validation, formatting, conventions).

## Prerequisites
- `.speculatius/diff-report.md` must exist (run `/speculatius:diff` first)
- `openspec/specs/` must exist

If the diff report doesn't exist, tell the user to run `/speculatius:diff` first.

## Process

### Step 1: Read and Present (grouped by capability)
1. Read `.speculatius/diff-report.md`
2. Group all actionable items by capability. Actionable items are:
   - DRIFTED items with recommendation UPDATE
   - NEW items with recommendation ADD_SPEC
   - UNDERSPECIFIED items with recommendation EXPAND_SPEC
3. Skip items marked INVESTIGATE, ACCEPT_DRIFT, IGNORE, ACCEPT, RE_EXPLORE,
   or FLAG_FOR_REVIEW

### Step 1b: Validate actionable items against main specs

**CRITICAL**: The diff report may contain false positives where it flags items as
UNDERSPECIFIED (EXPAND_SPEC) but the OpenSpec main spec already has the requirement.
This happens when the *explored* spec is less detailed than the OpenSpec spec — the
diff tool can confuse the direction.

For each EXPAND_SPEC item:
1. Read the corresponding `openspec/specs/{capability}/spec.md`
2. Search for the requirement by name AND by semantic content (the same behavior
   may be documented under a different requirement name)
3. If a matching requirement already exists in the main spec, **drop the item**
   from the actionable list and note: "Already documented in OpenSpec spec —
   skipped (diff report false positive)"

Present the validated list, noting any dropped items:

    Dropped 2 items (already in OpenSpec specs):
    - branch-colors: "First-level branches have distinct colors" — already in spec
    - node-operations: "Add Detached Node" — already in spec as "Requirement: Add Detached Node"

4. Present remaining items **grouped by capability**, not as a flat list:

       1. branch-colors (1 item)
          - EXPAND: Manual node/text color pickers
       2. import-export (2 items)
          - EXPAND: Export formats (SVG, PNG, JPG, PDF)
          - EXPAND: Export keyboard shortcut (ctrl+e)
       3. mind-map-core (5 items)
          - EXPAND: Landing page
          - EXPAND: Map info and deletion
          ...

   This grouping matches the proposal granularity (one per capability).

### Step 2: Get User Selection
Ask the user which capabilities to act on. Accept:
- Individual numbers ("3")
- Ranges ("1-4")
- Comma-separated ("1, 3, 5")
- "all"

### Step 3: Check for Existing Changes
Before creating anything, check `openspec/changes/` for existing changes that
target the same capabilities. If found, warn the user:

    ⚠ Found existing change "expand-settings-spec" targeting the settings capability.
    Options:
    1. Skip this capability
    2. Delete the existing change and create a fresh one
    3. Continue anyway (may cause conflicts during sync)

### Step 4: Determine Change Type
For each selected capability, determine whether it's a spec-only change (no code
needed) or requires implementation:

- **Spec-only**: All items are EXPAND_SPEC or UPDATE (documenting existing behavior)
- **Code-needed**: Items describe behavior that doesn't exist yet (rare in reconcile,
  but possible for ADD_SPEC of new capabilities)

### Step 5: Create Changes via /opsx:ff (sequential)

Run `/opsx:ff` directly in the main conversation context for each capability,
one at a time. Do NOT use background agents — they cannot get Write/Bash
permissions approved by the user, causing silent failures.

For each capability, derive:
- **Change name**: `{action}-{capability}-spec` where action is `expand`, `update`,
  or `document` based on the dominant category
- **Description**: A complete description that includes:
  - What category of change this is (expand/update/document)
  - The specific requirements to add/modify (from the diff report)
  - The source material path (`.speculatius/specs/{capability}/spec.md`)
  - The existing spec path (`openspec/specs/{capability}/spec.md`)
  - For spec-only changes: explicit note that design.md should say
    "Spec-only change, documenting existing behavior" and tasks.md should have
    a single task "Update spec — no code changes required"
  - The delta spec content to use (read from the diff report's underspecified/
    drifted sections, cross-referenced with `.speculatius/specs/{capability}/spec.md`)

Run `/opsx:ff {change-name}` with the full description for each capability
sequentially. Show progress as each completes:

    ✓ 1/3 expand-import-export-spec — all artifacts created
    ✓ 2/3 expand-mind-map-core-spec — all artifacts created
    ✓ 3/3 expand-settings-spec — all artifacts created

### Step 6: Verify and Report

After all changes are created:

1. Verify each change was created:
   ```bash
   openspec status --change "{change-name}" --json
   ```
2. List all changes created with their paths
3. For spec-only changes, provide the exact batch archive command:

       All changes are spec-only (documenting existing behavior). To apply them:
       /opsx:bulk-archive expand-branch-colors-spec expand-import-export-spec ...

   Or to review first:
       /opsx:verify {change-name}

## Rules
- **NEVER write OpenSpec files directly** — always delegate to `/opsx:ff`
- **NEVER use background agents** for `/opsx:ff` — they cannot get Write/Bash
  permissions from the user. Run `/opsx:ff` sequentially in the main context.
- **Always validate EXPAND_SPEC items** against main specs before presenting to
  the user (Step 1b). Drop false positives where the OpenSpec spec already has
  the requirement.
- Always ask for user confirmation before creating any changes
- ONE change per capability, never per requirement
- Always reference the diff report and explored specs as source material
- Check for existing changes before creating new ones
- For spec-only batches, always end with the exact `/opsx:bulk-archive` command
