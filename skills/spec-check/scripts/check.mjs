#!/usr/bin/env node
// speculatius spec-check: format gates for docs/specs and docs/decisions.
// Reads only *.md files in those two folders. Symlinks are never followed. Node >= 18.
// Usage: node check.mjs [ROOT] [--strict]    Exit code 1 on errors (or warnings with --strict), 2 on bad arguments.

import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Size budgets. Exceeding one gives a warning, which fails the run only with --strict.
const MAX = { specLines: 150, scenarios: 12, given: 3, then: 2, decisionLines: 60 };
// Level-2 headings every spec needs. Compared without regard to case.
const SECTIONS = ['Purpose', 'Non-goals', 'Requirements'];

// An issue is { level, line, msg }. Line 0 means the issue is about a folder, not a line in a file.
const error = (line, msg) => ({ level: 'error', line, msg });
const warning = (line, msg) => ({ level: 'warning', line, msg });

// 'ok', 'missing' or 'symlink' for root/dir. Every segment is checked, so a symlinked docs/ is caught too.
function dirState(root, dir) {
  let path = root;
  for (const part of dir.split('/')) {
    path = join(path, part);
    let st;
    try { st = lstatSync(path); } catch { return 'missing'; }
    if (st.isSymbolicLink()) return 'symlink';
    if (!st.isDirectory()) return 'missing';
  }
  return 'ok';
}

// Regular *.md files below root/dir, relative to root. Symlinks are neither files nor dirs here, so they are skipped.
function markdown(root, dir) {
  const entries = readdirSync(join(root, dir), { withFileTypes: true });
  return entries.flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return markdown(root, p);
    return e.isFile() && e.name.endsWith('.md') ? [p] : [];
  });
}

// Reads a spec into its sections, requirements and scenarios. It only collects facts; the check functions judge them.
//
// 1. Lines inside code blocks are dropped, so an example in a block is not counted as a real requirement or scenario.
// 2. A heading that starts with "Requirement:" opens a requirement, one that starts with "Scenario:" opens a scenario.
//    A scenario belongs to the requirement that is open at that point.
// 3. Any other heading closes the open scenario. At level 1 to 3 it also closes the open requirement.
// 4. A line below a scenario heading is counted as a step. Any other line below a requirement heading
//    is added to the requirement statement.
export function parseSpec(text) {
  const all = text.replace(/\n$/, '').split('\n');
  const { lines, openFence } = withoutCodeBlocks(all);
  const spec = { lines: all.length, sections: new Set(), requirements: [], scenarios: [], badAnchors: [], openFence };
  let req = null;
  let scn = null;

  for (const { n, text: line } of lines) {
    const heading = parseHeading(line);
    if (!heading) {
      if (scn) countStep(scn, line);
      else if (req) addStatementLine(req, line);
      continue;
    }
    scn = null;
    if (heading.title.startsWith('Requirement:')) {
      req = newRequirement(heading, n);
      spec.requirements.push(req);
    } else if (heading.title.startsWith('Scenario:')) {
      scn = newScenario(heading, n, req);
      spec.scenarios.push(scn);
      if (req) req.scenarios++;
    } else {
      // A near miss such as "### Requirement 1: …" is not parsed, so it is recorded for an error.
      if (/^(requirement|scenario)\b/i.test(heading.title)) spec.badAnchors.push(n);
      if (heading.level === 2) spec.sections.add(heading.title.trim().toLowerCase());
      if (heading.level <= 3) req = null;
    }
  }
  return spec;
}

// Returns the lines outside fenced code blocks as { n, text }, with n the 1-based line number in the file.
// openFence is the line of a code block that is still open at the end of the file, else 0.
// A fence is 3 or more backticks or tildes. It closes on a bare line of the same character that is at least as long.
function withoutCodeBlocks(all) {
  const lines = [];
  let fence = null; // opening marker of the current code block, e.g. '```' or '~~~~'
  let openedAt = 0;
  all.forEach((text, i) => {
    const [, mark, rest] = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/) ?? [];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && !rest.trim()) fence = null;
    } else if (mark && !(mark[0] === '`' && rest.includes('`'))) {
      // A backtick line with another backtick after the marker is inline code, not a fence.
      fence = mark;
      openedAt = i + 1;
    } else {
      lines.push({ n: i + 1, text });
    }
  });
  return { lines, openFence: fence ? openedAt : 0 };
}

// Returns { level, title } for a heading line such as "### Requirement: Retry", else null.
function parseHeading(line) {
  const [, hashes, title] = line.match(/^ {0,3}(#+)\s+(.*)/) ?? [];
  return hashes ? { level: hashes.length, title } : null;
}

// A requirement starts with its name and an empty statement. scenarios counts the scenarios below it.
function newRequirement({ level, title }, line) {
  return { name: title.slice('Requirement:'.length).trim(), line, level, text: '', done: false, scenarios: 0 };
}

// A scenario starts with its ID, or null when the heading has none, and zero steps of every kind.
function newScenario({ level, title }, line, req) {
  const id = title.match(/^Scenario:\s*([A-Z][A-Z0-9]*-\d{3,})(\s|$)/)?.[1] ?? null;
  return { id, line, level, inRequirement: !!req, GIVEN: 0, WHEN: 0, THEN: 0, stray: 0, malformed: 0, last: null };
}

// Adds a line to the requirement statement. The statement is the first paragraph below the heading
// and ends at the first blank line, so a rationale paragraph after it is not checked.
function addStatementLine(req, line) {
  if (req.done) return;
  if (line.trim()) req.text = `${req.text} ${line.trim()}`.trim();
  else if (req.text) req.done = true;
}

// Counts one line of a scenario as a step. A step is a bullet whose first word is a bold keyword: "- **WHEN** …".
// AND and BUT count toward the keyword before them, so "THEN, AND" gives two THEN steps.
// An AND or BUT before any keyword is counted as stray.
function countStep(scn, line) {
  const kw = line.match(/^\s*[-*]\s+\*\*(GIVEN|WHEN|THEN|AND|BUT)\*\*/)?.[1];
  if (!kw) {
    // A list item that reads like a step but is not "- **KEYWORD**" would otherwise go uncounted.
    if (/^\s*([-*+]|\d+\.)\s+\W*(given|when|then|and|but)\b/i.test(line)) scn.malformed++;
    return;
  }
  if (kw !== 'AND' && kw !== 'BUT') scn.last = kw;
  if (scn.last) scn[scn.last]++;
  else scn.stray++;
}

// Checks that concern the file as a whole:
// - The file name is a kebab-case capability name that starts with a letter, such as billing-retries.md.
// - The spec has the sections Purpose, Non-goals and Requirements. It also has at least one requirement.
//   An index.md without requirements is the overview of a split capability and is exempt from both.
// - Every code block is closed, because the parser skips everything after an open one.
// - No heading is a near miss of the two anchors, such as "### Requirement 1: …". The parser does not see those.
function checkFile(file, spec) {
  const name = basename(file);
  const out = [];
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*\.md$/.test(name)) out.push(error(1, 'file name must be a kebab-case capability name, no numbers or dates first'));
  const isFolderIndex = name === 'index.md' && spec.requirements.length === 0;
  if (!isFolderIndex) {
    for (const s of SECTIONS) if (!spec.sections.has(s.toLowerCase())) out.push(error(1, `missing "## ${s}" section`));
    if (!spec.requirements.length) out.push(error(1, 'no "### Requirement: <name>" found'));
  }
  if (spec.openFence) out.push(error(spec.openFence, 'code block is never closed; the rest of the file is not checked'));
  for (const n of spec.badAnchors) out.push(error(n, 'heading must read exactly "### Requirement: <name>" or "#### Scenario: <ID> <name>"'));
  return out;
}

// Checks one requirement. Only its statement is checked, which is the first paragraph below the heading.
// - The heading is at level 3 and at least one scenario follows it.
// - The statement contains SHALL or MUST in capitals and neither "should" nor "may".
// - The statement starts with an EARS keyword: The (always), WHEN (event), WHILE (state),
//   WHERE (optional feature) or IF (unwanted event). A statement that starts with IF also needs THEN.
function checkRequirement(r) {
  const name = `requirement "${r.name}"`;
  const weak = r.text.match(/\b(should|may)\b/)?.[1];
  const out = [];
  if (r.level !== 3) out.push(error(r.line, '"Requirement:" must be a level-3 heading'));
  if (!r.scenarios) out.push(error(r.line, `${name} has no scenario`));
  if (!/\b(SHALL|MUST)\b/.test(r.text)) out.push(error(r.line, `${name} needs SHALL or MUST`));
  if (weak) out.push(error(r.line, `${name} uses "${weak}"`));
  if (!/^(The|WHEN|WHILE|WHERE|IF)\b/.test(r.text)) out.push(error(r.line, `${name} must start with an EARS pattern: The / WHEN / WHILE / WHERE / IF…THEN`));
  else if (r.text.startsWith('IF') && !/\bTHEN\b/.test(r.text)) out.push(error(r.line, `${name} has IF without THEN`));
  return out;
}

// Checks one scenario.
// - The heading is at level 4, carries an ID such as BILL-003 and is below a requirement.
// - There is exactly one WHEN step, because two triggers are two scenarios, and at least one THEN step.
// - Every line that reads like a step has the form "- **KEYWORD** …", and no AND or BUT comes before the first keyword.
// - More than 3 GIVEN or 2 THEN steps give a warning.
function checkScenario(s) {
  const name = `scenario ${s.id ?? '(no ID)'}`;
  const out = [];
  if (s.level !== 4) out.push(error(s.line, '"Scenario:" must be a level-4 heading'));
  if (!s.id) out.push(error(s.line, 'scenario needs an ID: "#### Scenario: <AREA>-<NNN> <name>"'));
  if (!s.inRequirement) out.push(error(s.line, `${name} is outside a requirement`));
  if (s.WHEN !== 1) out.push(error(s.line, `${name} needs exactly one WHEN, found ${s.WHEN}`));
  if (!s.THEN) out.push(error(s.line, `${name} has no THEN`));
  if (s.malformed) out.push(error(s.line, `${name} has ${s.malformed} step(s) not written as "- **GIVEN|WHEN|THEN|AND**"`));
  if (s.stray) out.push(error(s.line, `${name} starts with AND/BUT before any GIVEN, WHEN or THEN`));
  if (s.GIVEN > MAX.given) out.push(warning(s.line, `${name} has ${s.GIVEN} GIVEN steps, budget ${MAX.given}`));
  if (s.THEN > MAX.then) out.push(warning(s.line, `${name} has ${s.THEN} THEN steps, budget ${MAX.then}`));
  return out;
}

// Warns when a spec is longer than 150 lines or has more than 12 scenarios. Either means the spec describes more than one capability.
function checkSpecBudget(spec) {
  const out = [];
  if (spec.lines > MAX.specLines) out.push(warning(1, `${spec.lines} lines, budget ~${MAX.specLines}: split into a folder with index.md`));
  if (spec.scenarios.length > MAX.scenarios) out.push(warning(1, `${spec.scenarios.length} scenarios, budget ${MAX.scenarios}`));
  return out;
}

// Warns when a decision record is longer than one page, about 60 lines. Nothing else in a decision record is checked.
function checkDecisionBudget(text) {
  const lines = text.replace(/\n$/, '').split('\n').length;
  return lines > MAX.decisionLines ? [warning(1, `${lines} lines, budget one page (~${MAX.decisionLines})`)] : [];
}

// Reports a scenario ID that an earlier scenario already uses, in this file or in one read before it.
// ids maps each scenario ID to the "file:line" of its first use and is shared across all specs.
function checkUniqueIds(file, spec, ids) {
  const out = [];
  for (const s of spec.scenarios.filter((x) => x.id)) {
    if (ids.has(s.id)) out.push(error(s.line, `duplicate scenario ID ${s.id}, first in ${ids.get(s.id)}`));
    else ids.set(s.id, `${file}:${s.line}`);
  }
  return out;
}

// Checks every spec below root/docs/specs and every decision record below root/docs/decisions.
// Returns the issues with their position, the counts, and ok. ok is false when there is an error,
// or with strict any issue at all. Reads files only; prints nothing.
export function run(root, { strict = false } = {}) {
  const issues = [];
  const ids = new Map();
  const report = (file, found) => issues.push(...found.map((x) => ({ ...x, at: x.line ? `${file}:${x.line}` : file })));
  const read = (file) => readFileSync(join(root, file), 'utf8');

  // docs/specs is required, docs/decisions optional. Symlinked folders are refused, so the scan stays inside root.
  const folder = (dir, required) => {
    const state = dirState(root, dir);
    if (state === 'ok') return markdown(root, dir);
    if (state === 'symlink') report(dir, [error(0, `${dir} or a parent folder is a symlink; not read`)]);
    else if (required) report(dir, [error(0, `${dir} not found under ${root}`)]);
    return [];
  };

  let scenarios = 0;
  const specs = folder('docs/specs', true);
  for (const file of specs) {
    const spec = parseSpec(read(file));
    scenarios += spec.scenarios.length;
    report(file, [
      ...checkFile(file, spec),
      ...spec.requirements.flatMap(checkRequirement),
      ...spec.scenarios.flatMap(checkScenario),
      ...checkSpecBudget(spec),
      ...checkUniqueIds(file, spec, ids),
    ]);
  }

  const decisions = folder('docs/decisions', false);
  for (const file of decisions) report(file, checkDecisionBudget(read(file)));

  const ok = !issues.some((x) => x.level === 'error' || strict);
  return { ok, issues, specs: specs.length, scenarios, decisions: decisions.length };
}

// Command line. Runs only when this file is started directly, not when a test imports it.
// Both paths are resolved first: argv[1] still contains symlinks and import.meta.url does not, so a plain
// comparison is false when the script is started through a symlink, and the check would not run.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const roots = args.filter((a) => !a.startsWith('--'));
  if (roots.length > 1 || args.some((a) => a.startsWith('--') && a !== '--strict')) {
    console.error('Usage: node check.mjs [ROOT] [--strict]');
    process.exit(2);
  }
  const res = run(roots[0] ?? '.', { strict: args.includes('--strict') });
  for (const x of res.issues) console.log(`${x.level === 'error' ? 'ERROR' : 'WARN '} ${x.at}  ${x.msg}`);
  const errors = res.issues.filter((x) => x.level === 'error').length;
  console.log(`\n${res.specs} specs, ${res.scenarios} scenarios, ${res.decisions} decisions: ${errors} errors, ${res.issues.length - errors} warnings`);
  process.exitCode = res.ok ? 0 : 1;
}
