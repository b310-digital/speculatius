# 🍪 Speculatius

Discover what your app actually does and reconcile it with your [OpenSpec](https://github.com/Fission-AI/OpenSpec) specs.

Speculatius uses the [Playwright MCP](https://github.com/microsoft/playwright-mcp) to explore your running application through the browser, generates behavioral specs from what it observes, diffs them against your existing OpenSpec source-of-truth specs, and creates change proposals for anything that's drifted, missing, or undocumented.

It can be used to backfill specs for a brownfield application or to detect spec drift in an existing one.

## Install (Claude Code)

```bash
# 1. Copy commands into your project
cp -r commands/claude-code/speculatius .claude/commands/speculatius

# 2. Run init (sets up .speculatius/, .gitignore, Playwright MCP)
/speculatius:init
```

## Workflow

```
/speculatius:init                     One-time setup: .speculatius/, gitignore, Playwright MCP
       ↓
/speculatius:explore <url>            Walk the app, produce sitemap + behavioral specs
       ↓
   review .speculatius/specs/         Spot-check accuracy, fix capability folder names
       ↓
/speculatius:diff                     Compare explored specs vs openspec/specs/
       ↓
   review .speculatius/diff-report.md Pick which drifts/gaps to act on
       ↓
/speculatius:reconcile                Generate OpenSpec change proposals (/opsx:propose)
       ↓
/opsx:archive                         Standard OpenSpec from here
```

## What it produces

```
.speculatius/                    ← gitignored, regenerable
├── config.yaml                  ← Playwright MCP integration settings
├── sitemap.md                   ← Every route discovered + what was missed
├── specs/
│   ├── auth/spec.md             ← Behavioral spec per capability (OpenSpec-compatible)
│   ├── dashboard/spec.md
│   └── ...
└── diff-report.md               ← Structured diff: aligned, drifted, new, missing, underspecified
```

Change proposals land in `openspec/changes/` via the standard `/opsx:propose` workflow.

## Requirements

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) initialized in your project
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) (configured during `/speculatius:init`)
- Your app running locally

## Comparison

[spec-gen](https://github.com/clay-good/spec-gen) reads your code and generates specs for what the code could do. Speculatius explores your running app and generates specs for what it actually does — the same observable behaviors your functional specs describe.

## License

MIT