#!/usr/bin/env node
/**
 * Counts hard-coded colours (hex, rgb(), rgba(), hsl(), hsla()) in the front end's source files.
 *
 * Why: the redesign keeps every colour in one place (src/newlook/tokens.css). The screens that have not been
 * rebuilt yet still hard-code theirs. Their count per file is recorded in src/newlook/colourBaseline.json and
 * src/newlook/colourBudget.test.js fails if any file gains a hard-coded colour, so the number can only go down.
 *
 * Usage:
 *   node scripts/colour-scan.js           print the counts
 *   node scripts/colour-scan.js --write   save them as the new baseline (do this after rebuilding a screen)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const BASELINE = path.join(SRC, 'newlook', 'colourBaseline.json');

// Scanned: every source file except tests, the current theme (the old look's own palette) and the new look,
// whose files are held to a stricter rule (no hard-coded colours at all, see tokens.test.js)
const SKIP_DIRS = new Set([path.join(SRC, 'theme'), path.join(SRC, 'newlook')]);
const EXT = /\.(js|jsx|css)$/;
const TEST = /\.test\.(js|jsx)$/;
const COLOUR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\brgba?\(|\bhsla?\(/g;

const walk = (dir, out = []) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(full)) walk(full, out);
    } else if (EXT.test(entry.name) && !TEST.test(entry.name)) {
      out.push(full);
    }
  });
  return out;
};

const count = (file) => (fs.readFileSync(file, 'utf8').match(COLOUR) || []).length;

/** { 'src/pages/Landing.js': 15, ... } for every scanned file that has at least one hard-coded colour */
const scan = () => {
  const result = {};
  walk(SRC)
    .sort()
    .forEach((file) => {
      const n = count(file);
      if (n > 0) result[path.relative(path.join(SRC, '..'), file).split(path.sep).join('/')] = n;
    });
  return result;
};

module.exports = { scan, count, COLOUR, BASELINE };

if (require.main === module) {
  const counts = scan();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(BASELINE, `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`Baseline saved: ${total} hard-coded colours in ${Object.keys(counts).length} files.`);
  } else {
    Object.entries(counts).forEach(([file, n]) => console.log(String(n).padStart(4), file));
    console.log(`\n${total} hard-coded colours in ${Object.keys(counts).length} files.`);
  }
}
