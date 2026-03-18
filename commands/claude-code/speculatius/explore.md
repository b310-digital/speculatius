# Speculatius: App Exploration

Use the Playwright MCP to systematically explore the running application and produce
behavioral spec files describing what the app actually does.

Speculatius creates a reflection of your app's behavior as OpenSpec-compatible specs —
like a cookie imprint from a mold, capturing the shape of what's actually there.

## Input

The user will provide:
- **APP_URL**: The URL to explore (e.g., http://localhost:3000 or a hostname like app:4200).
  If not provided, check `.speculatius/config.yaml` for a default `app_url`.
  If neither exists, ask the user.
- **SCOPE** (optional): Specific routes or areas to focus on (e.g., "/settings/*")

Before starting, verify that Playwright MCP is available by checking
`.speculatius/config.yaml` for the integration method. If the config doesn't
exist, tell the user to run `/speculatius:init` first.

### URL Resolution

If the APP_URL contains a hostname (not an IP), resolve it at runtime using
`getent hosts <hostname>` and use the resolved IP for Playwright navigation.
This is necessary because Playwright's browser (especially in Docker/CDP setups)
may not resolve container hostnames. Always resolve fresh — never rely on cached
IPs from config or prior runs.

## Exploration Strategy

### Phase 1: Sitemap Discovery
1. **Source-code route scan**: Before touching the browser, search the codebase for
   route definitions (e.g., Angular router configs, Next.js pages/app directory,
   React Router routes, Express/NestJS route decorators). Record all defined routes
   as a baseline — this catches routes not reachable via UI navigation (admin pages,
   error pages, deep-linked states behind feature flags).
2. Navigate to the app's root URL (or scoped URL if provided)
3. Read the accessibility tree to identify all navigation elements
4. Follow every navigation link to map all reachable routes
5. Cross-reference browser-discovered routes against source-code routes. Flag any
   source-defined routes that were not reachable via navigation.
6. Record each route's title, auth requirements, and key components
7. Write the sitemap file (see Output section)

### Phase 2: Page-by-Page Exploration
For each route discovered in Phase 1:
1. Navigate to the page
2. Take an accessibility snapshot
3. **Activate the page's primary entity before cataloging controls.** Many UIs
   disable toolbar/action buttons until something is selected (e.g., select a node
   in a mind map, select a row in a table, focus a form). Click/select the primary
   interactive element first, then re-snapshot to see the fully active UI state.
4. Identify all interactive elements (forms, buttons, links, toggles, tabs)
5. Document:
   - Page purpose (inferred from headings and content)
   - Key UI components present
   - Available user actions (in the **active** state, not the empty/disabled state)
   - Data displayed (tables, lists, cards)
   - Conditional UI (empty states, loading indicators, error states)
   - **Observed default values** (toggle states, slider min/max/step/default,
     dropdown defaults, placeholder text). Pin exact values — they are useful
     for regression detection.

### Phase 3: Flow Exploration

For each major interactive flow (forms, wizards, CRUD operations, toggles),
run through this checklist:

- [ ] **Happy path**: Fill all fields with valid data, submit. Record success feedback
      (toast, redirect, inline message, state change).
- [ ] **Empty submission**: Submit form with no input. Record which fields show
      validation errors and the exact error messages.
- [ ] **Invalid data**: Submit with at least one invalid value per field type
      (e.g., malformed email, negative number, too-long string). Record validation
      messages.
- [ ] **Toggle states**: For each toggle/switch, flip it and record what changes
      (URL, UI state, request). Flip it back and verify it reverts.
- [ ] **Toggle effects**: After toggling a setting, navigate to the area it
      affects and document the **observable outcome** (e.g., after enabling
      "Automatic branch colors", create a mind map with multiple branches and
      document the color behavior — distinct first-level colors, child
      inheritance, etc.). Don't just document the toggle exists; document what
      it does to the rest of the app.
- [ ] **Cancel/close**: If the flow has a cancel or close action, use it and verify
      no side effects occurred.
- [ ] **Guard rails**: Note auth redirects, permission-denied screens, rate limit
      responses, or confirmation dialogs that appear.

### Phase 4: Edge Behavior

Run through this checklist once per page:

- [ ] **Modals/dialogs**: Click every button that opens a modal. Document title,
      content, actions, and dismiss behavior.
- [ ] **Dropdown menus**: Click every menu trigger. Document all menu items.
- [ ] **Tooltips/popovers**: Hover over icon-only buttons or info icons. Record
      tooltip text.
- [ ] **Keyboard shortcuts**: If a shortcuts dialog or help exists, open it and
      record all shortcuts. Test at least 3 shortcuts to verify they work.
- [ ] **Toast/notification patterns**: After completing actions (create, delete,
      save), note toast position, message text, and auto-dismiss timing.
- [ ] **Empty states**: Navigate to list/table views with no data. Record the
      empty state message or illustration.

## Output

You must create TWO types of artifacts:

### Artifact 1: Sitemap — `.speculatius/sitemap.md`

A navigation map documenting every route the agent discovered. This serves as a
coverage record so we know what was explored and what was missed.

Structure it as follows:

- A header with the date, app URL, and scope
- A "Routes Discovered" table with columns: Route, Page Title, Auth Required, Key Components
- A "Navigation Structure" section listing top nav, sidebar, footer, dropdowns
- A "Routes NOT Explored" table with columns: Route, Reason (e.g., "Auth-gated",
  "External redirect", "Behind feature flag")
- An "Unmapped OpenSpec Specs" section: if `openspec/specs/` exists, list any spec
  folders that have no corresponding Speculatius capability spec. This tells the
  diff step which gaps are expected (e.g., backend-only capabilities with no UI
  surface) vs. missed during exploration.

### Artifact 2: Capability Specs — `.speculatius/specs/{capability}/spec.md`

One file per logical capability (auth, dashboard, settings, etc.). Group related
pages and flows into capabilities. Name the capability folders to match existing
`openspec/specs/` folder names where possible — this makes the diff step much cleaner.

Each spec file must use OpenSpec-compatible format:

- Top-level heading: capability name
- Brief description of what this capability does from the user's perspective
- `## Requirements` section containing one or more requirements
- Each requirement as `### Requirement: {Name}` followed by a SHALL statement
- Each requirement has an `#### Scenarios` section with Given/When/Then entries

Example of a well-formed spec:

    # Authentication

    User authentication including login, registration, and session management.

    ## Requirements

    ### Requirement: User Login
    The system SHALL allow users to authenticate via email and password.

    #### Scenarios
    - **Successful login**: Given a registered user, when they enter valid credentials
      and click "Sign In", then they are redirected to the dashboard.
    - **Invalid credentials**: Given an unregistered email, when the user submits the
      login form, then an error message "Invalid email or password" is displayed.
    - **Empty form submission**: Given an empty login form, when the user clicks
      "Sign In", then inline validation errors appear on both fields.

    ### Requirement: OAuth Login
    The system SHALL provide Google and GitHub OAuth login options.

    #### Scenarios
    - **OAuth buttons present**: Given the login page, when it loads, then "Continue
      with Google" and "Continue with GitHub" buttons are visible.

## Rules
- Focus on OBSERVABLE behavior only — no implementation guesses
- Use three confidence levels for scenarios:
  - **SHALL**: Behavior was directly observed and confirmed
  - **SHOULD**: Behavior appears intended but was observed as incomplete or inconsistent
  - **[NOT TESTED]**: Behavior is expected to exist (e.g., from UI affordances) but was
    not actually exercised during exploration. This is distinct from SHOULD — it means
    "I didn't verify this", not "I saw it behaving oddly".
- If auth-gated pages are encountered, STOP and ask the user to log in manually
  (the Playwright MCP browser window is visible — cookies persist after login)
- If a flow errors out, document the error as-is — that's valuable data
- Don't explore third-party embeds (analytics, chat widgets, external iframes)
- Name capability folders to match existing `openspec/specs/` folder names where possible
- Always create the sitemap FIRST before writing capability specs
