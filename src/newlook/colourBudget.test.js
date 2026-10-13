/**
 * A ratchet on hard-coded colours in the screens that have not been rebuilt yet.
 *
 * Every screen still hard-codes some colours; they move to the design tokens (src/newlook/tokens.css) as each
 * screen is rebuilt. Until then this test keeps the count from growing: a file may have no more hard-coded
 * colours than src/newlook/colourBaseline.json records, and a file not listed there may have none.
 *
 * Rebuilt a screen? Run `node scripts/colour-scan.js --write` to lower the baseline.
 */
const { scan } = require('../../scripts/colour-scan');
const baseline = require('./colourBaseline.json');

const current = scan();

describe('hard-coded colours in the current screens can only go down', () => {
  test('no file has more than its baseline, and no new file hard-codes a colour', () => {
    const grew = Object.entries(current)
      .filter(([file, n]) => n > (baseline[file] || 0))
      .map(([file, n]) => `${file}: ${n} now, ${baseline[file] || 0} allowed`);
    expect(grew).toEqual([]);
  });

  test('the baseline lists only files that exist and still have colours (lower it when a screen is rebuilt)', () => {
    const stale = Object.keys(baseline).filter((file) => !current[file]);
    expect(stale).toEqual([]);
  });

  test('the total is recorded', () => {
    const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(total(current)).toBeLessThanOrEqual(total(baseline));
  });
});
