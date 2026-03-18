# Speculatius: Init

Set up Speculatius in the current project. Run once before `/speculatius:explore`.

## Process

### Step 1: Create `.speculatius/` directory

```
.speculatius/
  specs/
```

### Step 2: Update `.gitignore`

Append if not already present:

    # Speculatius (regenerable)
    .speculatius/

    # Playwright MCP console logs (regenerable)
    .playwright-mcp/

### Step 3: Configure Playwright MCP

Check for existing config in: `.mcp.json`, `.claude/settings.json`,
`~/.claude.json`, `.cursor/mcp.json`, `.vscode/settings.json`.

**If found**: confirm with the user.

**If not found**: ask the user to choose:

1. **Claude Code** — run `claude mcp add playwright -- npx -y @playwright/mcp@latest`
2. **Cursor** — create `.cursor/mcp.json` with playwright server entry
3. **HTTP/SSE** — ask for the URL
4. **Manual** — show the standard config:
   ```json
   { "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] } } }
   ```

### Step 4: Write `.speculatius/config.yaml`

```yaml
playwright:
  integration: {claude-code|cursor|vscode|http|manual}
  url: null  # only for http integration
app_url: null
auth: null  # or credentials block — see below
```

Ask the user for a default app URL. Store as hostname:port (not IP) —
the explore command resolves at runtime.

Ask if the app requires authentication for exploration:

    Does the app require login for exploration? (yes/no)

If yes, ask for test credentials and add to config:

```yaml
auth:
  login_url: /login          # route with login form
  username_field: email       # form field name/label for username
  password_field: password    # form field name/label for password
  username: test_user
  password: testesttest
  success_indicator: /dashboard  # URL or element that confirms login succeeded
```

All fields are optional except `username` and `password`. The explore command
will auto-fill and submit the login form when it encounters auth-gated pages.

### Step 5: Update OpenSpec config (if present)

If `openspec/config.yaml` exists and doesn't mention Speculatius, ask to add:
- To `context:`: `Browser exploration: Playwright MCP available via Speculatius` and
  `Exploration output: .speculatius/ contains discovered specs from app exploration`
- To `rules.specs:`: `Cross-reference .speculatius/ when available to validate against observed behavior`

### Step 6: Summary

Print what was configured. Tell the user to run `/speculatius:explore`.

## Rules
- Never overwrite existing configuration — check first, ask if in doubt
- Be explicit about every file created or modified
