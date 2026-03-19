# Speculatius: App Exploration

Use Playwright MCP to systematically explore the running application and produce
behavioral spec files describing what the app actually does.

## Input

- **APP_URL**: URL to explore. Falls back to `.speculatius/config.yaml` `app_url`. Ask if neither exists.
- **SCOPE** (optional): Specific routes or areas to focus on (e.g., "/settings/*")
- **--force** (optional): When set, delete all previously explored specs before starting.
  This performs a clean exploration — no merging with existing specs.

Verify `.speculatius/config.yaml` exists — if not, tell the user to run `/speculatius:init`.

### Force Mode

When `--force` is passed:
1. Delete all files under `.speculatius/specs/` and `.speculatius/sitemap.md`
2. Confirm deletion count to the user (e.g., "Removed 9 existing spec folders")
3. Proceed with a fresh exploration — write all specs from scratch

Without `--force`, existing spec files are preserved and updated in place (default behavior).

**URL Resolution**: If APP_URL contains a hostname (not IP), resolve with
`getent hosts <hostname>` and use the IP for Playwright navigation. Always resolve
fresh — container IPs change between restarts.

**Authentication**: If `.speculatius/config.yaml` has an `auth` block with
credentials, auto-login when encountering auth-gated pages:
1. Navigate to `auth.login_url` (default: look for a login link/form on the current page)
2. Fill `auth.username_field` with `auth.username` and `auth.password_field` with `auth.password`
3. Submit the form
4. Verify success via `auth.success_indicator` (URL redirect or element presence)
5. Continue exploration — cookies persist across navigation

If auto-login fails, fall back to asking the user to log in manually.

## Exploration Strategy

### Phase 1: Sitemap Discovery
1. Search codebase for route definitions (router configs, route decorators) as a baseline
2. Navigate to root URL, read accessibility tree, follow all navigation links
3. Cross-reference browser routes against source-code routes — flag unreachable ones
4. Record each route's title, auth requirements, and key components
5. Write `.speculatius/sitemap.md`

### Phase 2: Page-by-Page Exploration
For each route:
1. Navigate and take an accessibility snapshot
2. **Activate the primary entity first** (select a node, focus a form) — many UIs
   disable controls until something is selected. Re-snapshot after activation.
3. Document: page purpose, UI components, available actions (in active state),
   data displayed, conditional UI, **observed default values** (pin exact values
   for regression detection)

### Phase 3: Flow Exploration
For each interactive flow (forms, CRUD, toggles):
- [ ] **Happy path**: valid data → record success feedback
- [ ] **Empty submission**: record validation errors and exact messages
- [ ] **Invalid data**: one invalid value per field type → record messages
- [ ] **Toggle states**: flip, record changes, flip back, verify revert
- [ ] **Toggle effects**: navigate to the affected area and document the **observable
      outcome** — don't just document the toggle exists, document what it does
- [ ] **Cancel/close**: verify no side effects
- [ ] **Guard rails**: auth redirects, permission-denied, rate limits, confirmations

### Phase 4: Edge Behavior
Once per page:
- [ ] **Modals/dialogs**: open every one, document title/content/actions/dismiss
- [ ] **Dropdown menus**: open every trigger, document all items
- [ ] **Tooltips**: hover icon-only buttons, record text
- [ ] **Keyboard shortcuts**: find and record all, test at least 3
- [ ] **Toasts**: note position, message text, auto-dismiss timing
- [ ] **Empty states**: record message/illustration

## Output

### Artifact 1: `.speculatius/sitemap.md`
- Header: date, app URL, scope
- Routes Discovered table: Route, Page Title, Auth Required, Key Components
- Navigation Structure: top nav, sidebar, footer, dropdowns
- Routes NOT Explored table: Route, Reason
- Unmapped OpenSpec Specs: spec folders with no corresponding explored capability

### Artifact 2: `.speculatius/specs/{capability}/spec.md`
One file per logical capability. Name folders to match `openspec/specs/` where possible.

Format:
```
# {Capability Name}
Brief description.

## Requirements

### Requirement: {Name}
The system SHALL ...

#### Scenarios
- **{scenario}**: Given ..., when ..., then ...
```

## Rules
- Observable behavior only — no implementation guesses
- Confidence levels: **SHALL** (confirmed), **SHOULD** (inconsistent), **[NOT TESTED]** (not exercised)
- Auth-gated pages: auto-login if credentials configured, otherwise STOP and ask user
- Document errors as-is — they are valuable data
- Don't explore third-party embeds
- Match capability folder names to `openspec/specs/` where possible
- Create sitemap FIRST, then capability specs
