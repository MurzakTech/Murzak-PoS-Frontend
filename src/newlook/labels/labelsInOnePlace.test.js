/**
 * Ticket P1-10: every visible label lives in one strings file, and no old term appears in the shell or the shared
 * components. The scan reads the code (see scanLabels.js); a word written inside a component, or an old name
 * from the rename map in any text, fails here.
 */
import fs from 'fs';
import { filesToScan, oldTermsIn, strayWords, textsIn } from './scanLabels';

const files = filesToScan();
const read = (f) => fs.readFileSync(f.full, 'utf8');

describe('The scan itself', () => {
  test('sees words between tags, in read-aloud attributes, and in label fields', () => {
    const found = strayWords(`
      const A = ({ closeLabel = 'Close' }) => (
        <div aria-label="Main menu" className="nl-x" data-label="Sales">
          Hello there
          <Thing label="Save" icon="plus" />
          {'Stock levels'}
        </div>
      );
      const list = [{ label: 'Today', value: 'today' }];
    `).map((f) => f.text);
    expect(found).toEqual(expect.arrayContaining(['Close', 'Main menu', 'Hello there', 'Save', 'Stock levels', 'Today']));
  });

  test('ignores class names, addresses, keys and other technical values', () => {
    const found = strayWords(`
      const A = () => <a className="nl-btn nl-btn--small" href="/sales" role="menuitem" data-icon="check" type="button" aria-haspopup="dialog">{x}</a>;
      const b = { key: 'sales', icon: 'plus', to: '/sales/new' };
    `);
    expect(found).toEqual([]);
  });

  test('finds an old term only as a whole word, in any case', () => {
    expect(oldTermsIn("const a = 'Open the GRN list';").map((h) => h.term)).toContain('grn');
    expect(oldTermsIn("const a = 'Open the grns';")).toEqual([]);
    expect(oldTermsIn("const a = 'Material Receipts';").map((h) => h.term)).toContain('material receipts');
  });

  test('scans the shell, the shared components and the other New look screens, and skips tests, demos and data tables', () => {
    const names = files.map((f) => f.rel);
    expect(names).toEqual(expect.arrayContaining(['shell/TopBar.jsx', 'shell/navigation.js', 'components/Pagination.jsx', 'components/Toast.jsx', 'NewLookShell.jsx']));
    expect(names.some((n) => /\.test\./.test(n) || n.startsWith('labels/') || /Demo\.jsx$/.test(n) || n === 'ComponentPage.jsx')).toBe(false);
  });
});

describe('No visible word is written inside a component', () => {
  test.each(files.map((f) => [f.rel, f]))('%s', (_name, file) => {
    const stray = strayWords(read(file)).map((s) => `line ${s.line}: ${s.kind}: ${JSON.stringify(s.text)}`);
    expect(stray).toEqual([]);
  });
});

describe('No old term appears (the rename map applied)', () => {
  test.each(files.map((f) => [f.rel, f]))('%s', (_name, file) => {
    const hits = oldTermsIn(read(file)).map((h) => `line ${h.line}: "${h.term}" in ${JSON.stringify(h.text)}`);
    expect(hits).toEqual([]);
  });

  test('and not in the strings file either', () => {
    const strings = './strings';
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const { default: S } = require(strings);
    const all = [];
    const collect = (value) => {
      if (typeof value === 'string') all.push(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(S);
    expect(all.length).toBeGreaterThan(50);
    const source = `const s = ${JSON.stringify(all)};`;
    expect(oldTermsIn(source)).toEqual([]);
  });
});
