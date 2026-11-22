#!/usr/bin/env node
// speculatius spec-check: format gates for docs/specs and docs/decisions.
// Reads only *.md files in those two folders. Symlinks are never followed. Node >= 24.
// Usage: node check.mjs [ROOT] [--strict]
// Exit code 1 on errors (or warnings with --strict), 2 on bad arguments.

import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';

const USAGE = 'Usage: node check.mjs [ROOT] [--strict]';

// Size budgets. Exceeding one gives a warning, which fails the run only with --strict.
const MAX = { specLines: 150, scenarios: 12, given: 3, then: 2, decisionLines: 60 };

// Level-2 headings every spec needs. Compared without regard to case.
const SECTIONS = ['Purpose', 'Non-goals', 'Requirements'];

// A kebab-case capability name that starts with a letter, such as billing-retries.md.
const FILE_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.md$/;
// A heading line such as "### Requirement: Retry".
const HEADING = /^ {0,3}(?<hashes>#+)\s+(?<title>.*)/;
// A heading that looks like an anchor but is not one, such as "### Requirement 1: Retry".
const NEAR_MISS_ANCHOR = /^(requirement|scenario)\b/i;
// A code fence: 3 or more backticks or tildes, then an optional info string.
const FENCE = /^ {0,3}(?<mark>`{3,}|~{3,})(?<rest>.*)$/;
// A scenario heading with an ID such as BILL-003.
const SCENARIO_ID = /^Scenario:\s*(?<id>[A-Z][A-Z0-9]*-\d{3,})(?:\s|$)/;
// A step: a bullet whose first word is a bold keyword, such as "- **WHEN** a charge fails".
const STEP = /^\s*[-*]\s+\*\*(?<keyword>GIVEN|WHEN|THEN|AND|BUT)\*\*/;
// A list item that reads like a step but is not written as one, such as "- when a charge fails".
const MALFORMED_STEP = /^\s*([-*+]|\d+\.)\s+\W*(given|when|then|and|but)\b/i;
// How a requirement statement may start: The (always), WHEN (event), WHILE (state),
// WHERE (optional feature) or IF (unwanted event).
const EARS_START = /^(The|WHEN|WHILE|WHERE|IF)\b/;

// An issue is { level, line, msg }. Line 0 means the issue is about a folder, not a line in a file.
const error = (line, msg) => ({ level: 'error', line, msg });
const warning = (line, msg) => ({ level: 'warning', line, msg });

// Splits a file into lines. Accepts LF and CRLF, and does not count the final newline as a line.
function splitLines(text) {
  return text.replace(/\r?\n$/, '').split(/\r?\n/);
}

// 'ok', 'missing' or 'symlink' for root/dir. Every segment is checked, so a symlinked docs/ is caught too.
function dirState(root, dir) {
  let path = root;
  for (const segment of dir.split('/')) {
    path = join(path, segment);
    let stats;
    try {
      stats = lstatSync(path);
    } catch {
      return 'missing'; // also when root itself is a file
    }
    if (stats.isSymbolicLink()) return 'symlink';
    if (!stats.isDirectory()) return 'missing';
  }
  return 'ok';
}

// Regular *.md files below root/dir, relative to root.
// Symlinks are neither files nor directories here, so they are skipped.
function markdownFiles(root, dir) {
  const entries = readdirSync(join(root, dir), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(root, path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

// Reads a spec into its sections, requirements and scenarios. It only groups lines; the check functions judge them.
//
// 1. Lines inside code blocks are dropped, so an example in a block is not counted as a real requirement or scenario.
// 2. A heading that starts with "Requirement:" opens a requirement, one that starts with "Scenario:" opens a scenario.
//    A scenario belongs to the requirement that is open at that point.
// 3. Any other heading closes the open scenario. At level 1 to 3 it also closes the open requirement.
// 4. A line below a scenario heading belongs to the scenario.
//    Any other line below a requirement heading belongs to the requirement.
export function parseSpec(text) {
  const allLines = splitLines(text);
  const { lines, openFence } = withoutCodeBlocks(allLines);
  const spec = {
    lines: allLines.length,
    sections: new Set(),
    requirements: [],
    scenarios: [],
    badAnchors: [],
    openFence,
  };
  let requirement = null;
  let scenario = null;

  for (const { number, text: line } of lines) {
    const heading = parseHeading(line);
    if (!heading) {
      (scenario ?? requirement)?.lines.push(line);
      continue;
    }
    scenario = null;
    if (heading.title.startsWith('Requirement:')) {
      requirement = newRequirement(heading, number);
      spec.requirements.push(requirement);
    } else if (heading.title.startsWith('Scenario:')) {
      scenario = newScenario(heading, number, requirement);
      spec.scenarios.push(scenario);
      if (requirement) requirement.scenarios++;
    } else {
      // The parser does not see a near miss as an anchor, so it is recorded for an error.
      if (NEAR_MISS_ANCHOR.test(heading.title)) spec.badAnchors.push(number);
      if (heading.level === 2) spec.sections.add(heading.title.trim().toLowerCase());
      if (heading.level <= 3) requirement = null;
    }
  }
  return spec;
}

// Returns the lines outside fenced code blocks as { number, text }, with number the 1-based line number in the file.
// openFence is the line of a code block that is still open at the end of the file, else 0.
// A fence closes on a bare line of the same character that is at least as long as the opening one.
function withoutCodeBlocks(allLines) {
  const lines = [];
  let fence = null; // opening marker of the current code block, such as '```' or '~~~~'
  let openedAt = 0;

  allLines.forEach((text, index) => {
    const number = index + 1;
    const { mark, rest } = text.match(FENCE)?.groups ?? {};
    if (fence) {
      const closes = mark?.[0] === fence[0] && mark.length >= fence.length && !rest.trim();
      if (closes) fence = null;
      return;
    }
    // A backtick line with another backtick after the marker is inline code, not a fence.
    const opens = mark && !(mark[0] === '`' && rest.includes('`'));
    if (opens) {
      fence = mark;
      openedAt = number;
    } else {
      lines.push({ number, text });
    }
  });
  return { lines, openFence: fence ? openedAt : 0 };
}

// Returns { level, title } for a heading line, else null.
function parseHeading(line) {
  const { hashes, title } = line.match(HEADING)?.groups ?? {};
  return hashes ? { level: hashes.length, title } : null;
}

// lines are the lines below the heading, up to the first scenario. scenarios counts the scenarios below it.
function newRequirement({ level, title }, line) {
  const name = title.slice('Requirement:'.length).trim();
  return { name, line, level, lines: [], scenarios: 0 };
}

// id is null when the heading has none. lines are the lines below the heading.
function newScenario({ level, title }, line, requirement) {
  const id = title.match(SCENARIO_ID)?.groups.id ?? null;
  return { id, line, level, inRequirement: requirement !== null, lines: [] };
}

// The requirement statement: the first paragraph below the heading, joined into one line.
// It ends at the first blank line, so a rationale paragraph after it is not checked.
function statementOf(requirement) {
  const trimmed = requirement.lines.map((line) => line.trim());
  const start = trimmed.findIndex((line) => line !== '');
  if (start === -1) return '';
  const end = trimmed.indexOf('', start);
  return trimmed.slice(start, end === -1 ? undefined : end).join(' ');
}

// Counts the steps of a scenario per keyword.
// AND and BUT count toward the keyword before them, so "THEN, AND" gives two THEN steps.
// stray counts AND or BUT before any keyword. malformed counts lines that read like a step but are not written as one.
function countSteps(lines) {
  const steps = { GIVEN: 0, WHEN: 0, THEN: 0, stray: 0, malformed: 0 };
  let current = null; // the GIVEN, WHEN or THEN that a following AND or BUT continues

  for (const line of lines) {
    const keyword = line.match(STEP)?.groups.keyword;
    if (!keyword) {
      if (MALFORMED_STEP.test(line)) steps.malformed++;
      continue;
    }
    if (keyword !== 'AND' && keyword !== 'BUT') current = keyword;
    if (current) steps[current]++;
    else steps.stray++;
  }
  return steps;
}

// Checks that concern the file as a whole:
// - The file name is a kebab-case capability name.
// - The spec has every section in SECTIONS and at least one requirement.
//   An index.md without requirements is the overview of a split capability and is exempt from both.
// - Every code block is closed, because the parser skips everything after an open one.
// - No heading is a near miss of the two anchors.
function checkFile(file, spec) {
  const name = basename(file);
  const issues = [];

  if (!FILE_NAME.test(name)) {
    issues.push(error(1, 'file name must be a kebab-case capability name, no numbers or dates first'));
  }
  const isFolderIndex = name === 'index.md' && spec.requirements.length === 0;
  if (!isFolderIndex) {
    for (const section of SECTIONS) {
      if (!spec.sections.has(section.toLowerCase())) issues.push(error(1, `missing "## ${section}" section`));
    }
    if (spec.requirements.length === 0) issues.push(error(1, 'no "### Requirement: <name>" found'));
  }
  if (spec.openFence) {
    issues.push(error(spec.openFence, 'code block is never closed; the rest of the file is not checked'));
  }
  for (const line of spec.badAnchors) {
    issues.push(error(line, 'heading must read exactly "### Requirement: <name>" or "#### Scenario: <ID> <name>"'));
  }
  return issues;
}

// Checks one requirement. Only its statement is checked, see statementOf.
// - The heading is at level 3 and at least one scenario follows it.
// - The statement contains SHALL or MUST in capitals and neither "should" nor "may".
// - The statement starts with an EARS keyword. A statement that starts with IF also needs THEN.
function checkRequirement(requirement) {
  const name = `requirement "${requirement.name}"`;
  const statement = statementOf(requirement);
  const weakWord = statement.match(/\b(should|may)\b/)?.[1];
  const issues = [];
  const fail = (msg) => issues.push(error(requirement.line, msg));

  if (requirement.level !== 3) fail('"Requirement:" must be a level-3 heading');
  if (requirement.scenarios === 0) fail(`${name} has no scenario`);
  if (!/\b(SHALL|MUST)\b/.test(statement)) fail(`${name} needs SHALL or MUST`);
  if (weakWord) fail(`${name} uses "${weakWord}"`);
  if (!EARS_START.test(statement)) {
    fail(`${name} must start with an EARS pattern: The / WHEN / WHILE / WHERE / IF…THEN`);
  } else if (statement.startsWith('IF') && !/\bTHEN\b/.test(statement)) {
    fail(`${name} has IF without THEN`);
  }
  return issues;
}

// Checks one scenario.
// - The heading is at level 4, carries an ID and is below a requirement.
// - There is exactly one WHEN step, because two triggers are two scenarios, and at least one THEN step.
// - Every line that reads like a step is written as one, and no AND or BUT comes before the first keyword.
// - More GIVEN or THEN steps than MAX allows give a warning.
function checkScenario(scenario) {
  const name = `scenario ${scenario.id ?? '(no ID)'}`;
  const steps = countSteps(scenario.lines);
  const issues = [];
  const fail = (msg) => issues.push(error(scenario.line, msg));
  const warn = (msg) => issues.push(warning(scenario.line, msg));

  if (scenario.level !== 4) fail('"Scenario:" must be a level-4 heading');
  if (!scenario.id) fail('scenario needs an ID: "#### Scenario: <AREA>-<NNN> <name>"');
  if (!scenario.inRequirement) fail(`${name} is outside a requirement`);
  if (steps.WHEN !== 1) fail(`${name} needs exactly one WHEN, found ${steps.WHEN}`);
  if (steps.THEN === 0) fail(`${name} has no THEN`);
  if (steps.malformed) fail(`${name} has ${steps.malformed} step(s) not written as "- **GIVEN|WHEN|THEN|AND**"`);
  if (steps.stray) fail(`${name} starts with AND/BUT before any GIVEN, WHEN or THEN`);
  if (steps.GIVEN > MAX.given) warn(`${name} has ${steps.GIVEN} GIVEN steps, budget ${MAX.given}`);
  if (steps.THEN > MAX.then) warn(`${name} has ${steps.THEN} THEN steps, budget ${MAX.then}`);
  return issues;
}

// Warns when a spec exceeds MAX.specLines or MAX.scenarios. Either means the spec describes more than one capability.
function checkSpecBudget(spec) {
  const issues = [];
  if (spec.lines > MAX.specLines) {
    issues.push(warning(1, `${spec.lines} lines, budget ~${MAX.specLines}: split into a folder with index.md`));
  }
  if (spec.scenarios.length > MAX.scenarios) {
    issues.push(warning(1, `${spec.scenarios.length} scenarios, budget ${MAX.scenarios}`));
  }
  return issues;
}

// Warns when a decision record is longer than one page, MAX.decisionLines.
// Nothing else in a decision record is checked.
function checkDecisionBudget(text) {
  const lines = splitLines(text).length;
  if (lines <= MAX.decisionLines) return [];
  return [warning(1, `${lines} lines, budget one page (~${MAX.decisionLines})`)];
}

// Reports a scenario ID that an earlier scenario already uses, in this file or in one read before it.
// firstUse maps each scenario ID to the "file:line" of its first use. It is shared across all specs and updated here.
function checkUniqueIds(file, spec, firstUse) {
  const issues = [];
  for (const { id, line } of spec.scenarios) {
    if (!id) continue;
    if (firstUse.has(id)) issues.push(error(line, `duplicate scenario ID ${id}, first in ${firstUse.get(id)}`));
    else firstUse.set(id, `${file}:${line}`);
  }
  return issues;
}

// Checks every spec below root/docs/specs and every decision record below root/docs/decisions.
// Returns the issues with their position, the counts, and ok. ok is false when there is an error,
// or with strict any issue at all. Reads files only; prints nothing.
export function run(root, { strict = false } = {}) {
  const issues = [];
  const firstUse = new Map();
  const read = (file) => readFileSync(join(root, file), 'utf8');
  const report = (file, found) => {
    for (const issue of found) issues.push({ ...issue, at: issue.line ? `${file}:${issue.line}` : file });
  };

  // The *.md files of a folder in a fixed order, so every machine reports the same.
  // A symlinked folder is refused, so the scan stays inside root.
  const filesIn = (dir, { required }) => {
    const state = dirState(root, dir);
    if (state === 'ok') return markdownFiles(root, dir).toSorted();
    if (state === 'symlink') report(dir, [error(0, `${dir} or a parent folder is a symlink; not read`)]);
    else if (required) report(dir, [error(0, `${dir} not found under ${root}`)]);
    return [];
  };

  let scenarios = 0;
  const specs = filesIn('docs/specs', { required: true });
  for (const file of specs) {
    const spec = parseSpec(read(file));
    scenarios += spec.scenarios.length;
    report(file, [
      ...checkFile(file, spec),
      ...spec.requirements.flatMap(checkRequirement),
      ...spec.scenarios.flatMap(checkScenario),
      ...checkSpecBudget(spec),
      ...checkUniqueIds(file, spec, firstUse),
    ]);
  }

  const decisions = filesIn('docs/decisions', { required: false });
  for (const file of decisions) report(file, checkDecisionBudget(read(file)));

  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.length - errors;
  const ok = errors === 0 && (!strict || warnings === 0);
  return { ok, issues, errors, warnings, specs: specs.length, scenarios, decisions: decisions.length };
}

// Returns { root, strict } for valid arguments, else null.
function parseCli(args) {
  try {
    const { values, positionals } = parseArgs({
      args,
      options: { strict: { type: 'boolean', default: false } },
      allowPositionals: true,
    });
    if (positionals.length > 1) return null;
    return { root: positionals[0] ?? '.', strict: values.strict };
  } catch {
    return null; // parseArgs throws on an unknown option
  }
}

function main() {
  const cli = parseCli(process.argv.slice(2));
  if (!cli) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  const result = run(cli.root, { strict: cli.strict });
  for (const { level, at, msg } of result.issues) {
    console.log(`${level === 'error' ? 'ERROR' : 'WARN '} ${at}  ${msg}`);
  }
  const { specs, scenarios, decisions, errors, warnings } = result;
  const counts = `${specs} specs, ${scenarios} scenarios, ${decisions} decisions`;
  console.log(`\n${counts}: ${errors} errors, ${warnings} warnings`);
  process.exitCode = result.ok ? 0 : 1;
}

// Runs only when this file is started directly, not when a test imports it.
if (import.meta.main) main();
