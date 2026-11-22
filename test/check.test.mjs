import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { run, parseSpec } from '../skills/spec-check/scripts/check.mjs';

const fixture = (name) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');
const GOOD_SPEC = fixture('good-spec.md');
const BAD_SPEC = fixture('bad-spec.md');

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), 'spx-'));
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), content);
  }
  return root;
}

const msgs = (res) => res.issues.map((i) => `${i.level}: ${i.msg}`).join('\n');

test('valid spec passes', () => {
  const root = repo({ 'docs/specs/billing-retries.md': GOOD_SPEC });
  const res = run(root);
  assert.equal(res.ok, true, msgs(res));
  assert.equal(res.scenarios, 2);
  rmSync(root, { recursive: true });
});

test('format errors: heading level, should, EARS, no scenario, two WHENs', () => {
  const root = repo({ 'docs/specs/billing-retries.md': BAD_SPEC });
  const m = msgs(run(root));
  assert.match(m, /must be a level-3 heading/);
  assert.match(m, /exactly one WHEN, found 2/);
  assert.match(m, /"Notify customer" uses "should"/);
  assert.match(m, /"Notify customer" has no scenario/);
  assert.match(m, /"Suspend account" must start with an EARS pattern/);
  rmSync(root, { recursive: true });
});

test('duplicate IDs and bad file names fail', () => {
  const root = repo({
    'docs/specs/billing-retries.md': GOOD_SPEC,
    'docs/specs/2026-01-billing.md': GOOD_SPEC,
  });
  const m = msgs(run(root));
  assert.match(m, /duplicate scenario ID BILL-003/);
  assert.match(m, /duplicate scenario ID BILL-004/);
  assert.match(m, /kebab-case capability name/);
  rmSync(root, { recursive: true });
});

test('size budget is a warning, --strict makes it fail', () => {
  const root = repo({ 'docs/specs/billing-retries.md': GOOD_SPEC + '\n'.repeat(200) });
  assert.equal(run(root).ok, true);
  assert.equal(run(root, { strict: true }).ok, false);
  rmSync(root, { recursive: true });
});

test('files outside docs/specs and symlinks are not read', () => {
  const outside = repo({ 'evil.md': BAD_SPEC });
  const root = repo({ 'docs/specs/billing-retries.md': GOOD_SPEC, 'other/broken.md': BAD_SPEC });
  symlinkSync(outside, join(root, 'docs/specs/link'));
  const res = run(root);
  assert.equal(res.ok, true, msgs(res));
  assert.equal(res.specs, 1);
  rmSync(root, { recursive: true });
  rmSync(outside, { recursive: true });
});

test('oversized decision record warns', () => {
  const root = repo({ 'docs/specs/billing-retries.md': GOOD_SPEC, 'docs/decisions/0001-use-postgres.md': '# x\n'.repeat(80) });
  const res = run(root);
  assert.equal(res.ok, true);
  assert.match(msgs(res), /budget one page/);
  rmSync(root, { recursive: true });
});

const spec = (body) => `# Billing Retries\n\n## Purpose\np\n\n## Non-goals\n- n\n\n## Requirements\n\n${body}`;
const REQ = '### Requirement: Retry\nWHEN a charge fails, the billing service SHALL retry once.\n';
const SCN = '#### Scenario: BILL-001 Retry\n- **WHEN** a charge fails\n- **THEN** it is retried\n';

const errorsFor = (body) => {
  const root = repo({ 'docs/specs/billing-retries.md': spec(body) });
  const m = msgs(run(root));
  rmSync(root, { recursive: true });
  return m;
};

test('missing docs/specs fails instead of passing empty', () => {
  const root = repo({ 'README.md': 'x' });
  const res = run(root);
  assert.equal(res.ok, false);
  assert.match(msgs(res), /docs\/specs not found/);
  rmSync(root, { recursive: true });
});

test('symlinked docs/specs is refused', () => {
  const outside = repo({ 'evil.md': BAD_SPEC });
  const root = repo({ 'README.md': 'x' });
  mkdirSync(join(root, 'docs'));
  symlinkSync(outside, join(root, 'docs/specs'));
  const res = run(root);
  assert.equal(res.ok, false);
  assert.match(msgs(res), /is a symlink; not read/);
  assert.doesNotMatch(msgs(res), /Notify customer/);
  rmSync(root, { recursive: true });
  rmSync(outside, { recursive: true });
});

test('trailing newline is not counted as a line', () => {
  assert.equal(parseSpec('a\nb\n').lines, 2);
});

test('CRLF line endings are read like LF', () => {
  const body = REQ + '\n```md\n### Requirement: Example\n```\n\n' + SCN;
  assert.equal(errorsFor(body.replaceAll('\n', '\r\n')), '');
  assert.equal(parseSpec('a\r\nb\r\n').lines, 2);
});

test('files are read in a fixed order', () => {
  const root = repo({ 'docs/specs/b-second.md': spec(REQ + '\n' + SCN), 'docs/specs/a-first.md': spec(REQ + '\n' + SCN) });
  assert.match(msgs(run(root)), /first in docs\/specs\/a-first\.md:14/);
  rmSync(root, { recursive: true });
});

test('code blocks are ignored', () => {
  const body = REQ + '\n```bash\n# restart worker\n- **WHEN** example\n```\n\n' + SCN;
  const root = repo({ 'docs/specs/billing-retries.md': spec(body) });
  const res = run(root);
  assert.equal(res.ok, true, msgs(res));
  rmSync(root, { recursive: true });
});

test('rationale paragraph after the statement is not checked for weak words', () => {
  const body = REQ + '\nWithout this, customers could churn.\n\n' + SCN;
  const root = repo({ 'docs/specs/billing-retries.md': spec(body) });
  assert.equal(run(root).ok, true, msgs(run(root)));
  rmSync(root, { recursive: true });
});

test('scenario ID without a name is accepted and checked for duplicates', () => {
  const nameless = '#### Scenario: BILL-001\n- **WHEN** a charge fails\n- **THEN** it is retried\n';
  const root = repo({
    'docs/specs/billing-retries.md': spec(REQ + '\n' + nameless),
    'docs/specs/billing-refunds.md': spec(REQ + '\n' + nameless),
  });
  const m = msgs(run(root));
  assert.doesNotMatch(m, /needs an ID/);
  assert.match(m, /duplicate scenario ID BILL-001/);
  rmSync(root, { recursive: true });
});

test('leading AND is an error', () => {
  const scn = '#### Scenario: BILL-001 Retry\n- **AND** stray\n- **WHEN** a charge fails\n- **THEN** it is retried\n';
  const root = repo({ 'docs/specs/billing-retries.md': spec(REQ + '\n' + scn) });
  assert.match(msgs(run(root)), /starts with AND\/BUT/);
  rmSync(root, { recursive: true });
});

test('scenario count includes duplicates; section names ignore case', () => {
  const root = repo({
    'docs/specs/billing-retries.md': GOOD_SPEC.replace('## Non-goals', '## Non-Goals'),
    'docs/specs/billing-copy.md': GOOD_SPEC,
  });
  const res = run(root);
  assert.equal(res.scenarios, 4);
  assert.doesNotMatch(msgs(res), /missing "## Non-goals"/);
  rmSync(root, { recursive: true });
});

test('unclosed or inline-backtick fences do not hide the rest of the spec', () => {
  assert.match(errorsFor(REQ + '\n```\nexample\n\n' + SCN), /code block is never closed/);
  const inline = REQ + '\n```retry``` is a term.\n\n' + SCN.replace('- **THEN** it is retried\n', '');
  assert.match(errorsFor(inline), /has no THEN/);
  assert.equal(errorsFor(REQ + '\n~~~\n#### Scenario: nope\n~~~\n\n````\n```\n- **WHEN** x\n````\n\n' + SCN), '');
});

test('spec without requirements and near-miss anchors fail', () => {
  assert.match(errorsFor('Free prose only.\n'), /no "### Requirement: <name>" found/);
  assert.match(errorsFor(REQ + '\n#### Scenario 1: BILL-001 Retry\n- **WHEN** a\n- **THEN** b\n'), /heading must read exactly/);
});

test('malformed step lines are reported', () => {
  assert.match(errorsFor(REQ + '\n' + SCN + '- WHEN the customer opens the app\n1. **GIVEN** x\n'), /2 step\(s\) not written/);
});

test('only should and may are weak words; May as a month passes', () => {
  const ok = '### Requirement: Renew\nWHEN 1 May arrives, the billing service SHALL say the card could not be charged.\n\n' + SCN;
  assert.equal(errorsFor(ok), '');
});

test('CLI: runs through a symlink, rejects unknown arguments', () => {
  const script = fileURLToPath(new URL('../skills/spec-check/scripts/check.mjs', import.meta.url));
  const root = repo({ 'docs/specs/billing-retries.md': BAD_SPEC });
  symlinkSync(script, join(root, 'link.mjs'));
  const viaLink = spawnSync(process.execPath, [join(root, 'link.mjs'), root], { encoding: 'utf8' });
  assert.equal(viaLink.status, 1);
  assert.match(viaLink.stdout, /errors/);
  assert.equal(spawnSync(process.execPath, [script, root, '--strcit']).status, 2);
  assert.equal(spawnSync(process.execPath, [script, root, root]).status, 2);
  rmSync(root, { recursive: true });
});
