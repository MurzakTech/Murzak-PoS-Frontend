#!/usr/bin/env node
/*
 * The test gate: runs the automated tests and refuses a deploy that breaks one that was passing.
 *
 *     node scripts/test-gate.js             run the tests and judge them (used by the workflows)
 *     node scripts/test-gate.js --update    run the tests and rewrite the list of known failures
 *
 * WHY IT IS NOT JUST "npm test"
 *   The deploy used to run the tests with continue-on-error, so a failing test never stopped
 *   anything, and failures piled up unnoticed (83 tests were failing when this was written). Simply
 *   making the tests compulsory would have blocked every deploy until all of them were repaired.
 *
 *   So the tests that already fail are written down in test-known-failures.json, and the rule is:
 *     - a test on that list may keep failing (it is old debt, to be repaired and taken off the list);
 *     - ANY OTHER test failing stops the deploy.
 *   The list can only be made longer by a person choosing to, in a commit that a reviewer sees.
 *
 * KEEPING THE LIST HONEST
 *   When a listed test starts passing, the gate says so and asks for it to be taken off the list
 *   (run with --update and commit the file). It does not fail for that, so repairing a test never
 *   blocks a deploy. Do not add a test to the list to get a deploy through: repair the test, or the
 *   code it caught.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LIST_FILE = path.join(ROOT, 'test-known-failures.json');
const update = process.argv.includes('--update');

/** One line per failing test: "<file> :: <test name>", or just "<file>" when the file could not run. */
function failuresFrom(report) {
  const failed = new Set();
  for (const suite of report.testResults || []) {
    const file = path.relative(ROOT, suite.name).split(path.sep).join('/');
    const tests = (suite.assertionResults || []).filter((t) => t.status === 'failed');
    tests.forEach((t) => failed.add(`${file} :: ${t.fullName}`));
    // A file that fails without a single failing test did not run at all (a broken import, say).
    if (suite.status === 'failed' && tests.length === 0) failed.add(file);
  }
  return failed;
}

function runTests() {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'test-gate-')), 'report.json');
  const run = spawnSync(
    'npx',
    ['react-scripts', 'test', '--watchAll=false', '--ci', '--json', `--outputFile=${out}`],
    { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CI: 'true' }, shell: process.platform === 'win32' },
  );
  if (!fs.existsSync(out)) {
    console.error('\nTEST GATE: the tests did not produce a report, so nothing can be judged. Stopping.');
    process.exit(run.status || 1);
  }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

function main() {
  const report = runTests();
  const failing = failuresFrom(report);

  if (update) {
    const list = [...failing].sort();
    fs.writeFileSync(LIST_FILE, `${JSON.stringify(list, null, 2)}\n`);
    console.log(`\nTEST GATE: wrote ${list.length} known failure(s) to ${path.basename(LIST_FILE)}.`);
    return;
  }

  const known = new Set(JSON.parse(fs.readFileSync(LIST_FILE, 'utf8')));
  const broken = [...failing].filter((t) => !known.has(t)).sort();
  const repaired = [...known].filter((t) => !failing.has(t)).sort();

  console.log(`\nTEST GATE: ${report.numPassedTests} passed, ${failing.size} failed (${known.size} on the known list).`);
  if (repaired.length) {
    console.log(`\n${repaired.length} test(s) on the known list now pass. Take them off the list`);
    console.log('(node scripts/test-gate.js --update, then commit test-known-failures.json):');
    repaired.forEach((t) => console.log(`  + ${t}`));
  }
  if (broken.length) {
    console.error(`\nSTOPPED: ${broken.length} test(s) that were passing now fail:`);
    broken.forEach((t) => console.error(`  x ${t}`));
    console.error('\nRepair the code or the test. Do not add these to the known list to get past this.');
    process.exit(1);
  }
  console.log('\nNo test that was passing has been broken.');
}

if (require.main === module) main();

module.exports = { failuresFrom };
