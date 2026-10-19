/**
 * Ticket P6-1: the contrast rules of the Accessibility table, worked out from tokens.css for the pairs that the rest of the
 * redesign actually uses, in both themes. (tokens.test.js holds the headline pairs; these are the ones found by the axe scan
 * and the soft, hovered and open-row backgrounds.)
 */
import fs from 'fs';
import path from 'path';

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');
const css = read('tokens.css');

const block = (selector) => {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const out = {};
  css
    .slice(open + 1, close)
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/);
      if (m) out[m[1]] = m[2];
    });
  return out;
};
const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark']") };

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// color-mix(in srgb, a share%, b)
const mix = (a, b, share) => a.map((v, i) => v * share + b[i] * (1 - share));
// the ink at 8% laid over a background (a hovered row)
const hover = (t, bg) => mix(rgb(t.ink), rgb(t[bg]), 0.08);

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_name, t) => {
  it('keeps text at 4.5:1 on the page, card, field and soft fills for ink, ink-2, muted and brand-text', () => {
    ['bg', 'surface', 'field', 'soft', 'selected-row'].forEach((bg) => {
      ['ink', 'ink-2', 'muted', 'brand-text'].forEach((fg) => {
        if (fg === 'muted' && (bg === 'soft' || bg === 'track')) return; // quiet text is not set on the soft fill (see the next test)
        expect(ratio(rgb(t[fg]), rgb(t[bg]))).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('keeps the quiet words of a soft card (ink-2) and its change words (a little ink in the mix) at 4.5:1', () => {
    expect(ratio(rgb(t['ink-2']), rgb(t.soft))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(mix(rgb(t.good), rgb(t.ink), 0.8), rgb(t.soft))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(mix(rgb(t.bad), rgb(t.ink), 0.8), rgb(t.soft))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps status words at 4.5:1 on a hovered or open table row (82% of the colour, the rest ink)', () => {
    ['warn', 'bad', 'good'].forEach((tone) => {
      const word = mix(rgb(t[tone]), rgb(t.ink), 0.82);
      expect(ratio(word, rgb(t['selected-row']))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(word, hover(t, 'surface'))).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps the focus ring (3:1 needed) and the input border (3:1 on the field) in range', () => {
    expect(ratio(rgb(t['brand-text']), rgb(t.bg))).toBeGreaterThanOrEqual(3);
    expect(ratio(rgb(t['brand-text']), rgb(t.surface))).toBeGreaterThanOrEqual(3);
    expect(ratio(rgb(t['input-border']), rgb(t.field))).toBeGreaterThanOrEqual(3);
  });

  it('keeps text on the brand fill at 4.5:1', () => {
    expect(ratio(rgb(t['on-brand']), rgb(t.brand))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the stylesheets that hold the fixes', () => {
  it('mixes ink into status words on hovered and open rows', () => {
    const data = read('components/data-components.css');
    ['warn', 'bad', 'good'].forEach((tone) => expect(data).toContain(`.nl-status--${tone}`));
    expect(data).toMatch(/color-mix\(in srgb, var\(--warn\) 82%, var\(--ink\)\)/);
  });

  it('draws a focus ring on the chart svg that takes the keyboard', () => {
    expect(read('charts/charts.css')).toMatch(/\.recharts-surface:focus-visible\s*\{[^}]*var\(--focus-ring\)/);
  });

  it('draws the focus ring on the till controls, inside dialogs and menus too', () => {
    expect(read('till/till-controls.css')).toMatch(/\.nl-till-active :focus-visible[^{]*\{[^}]*var\(--focus-ring\)/);
  });

  it('never sets text in the brand colour, only in brand-text', () => {
    const files = ['components/components.css', 'components/data-components.css', 'components/overlay-components.css', 'home/home.css', 'shell/shell.css', 'till/pay.css', 'till/till.css', 'reports/reports.css', 'settings/settings.css', 'setup/setup.css', 'auth/auth.css'];
    files.forEach((f) => expect(read(f)).not.toMatch(/[^-]color:\s*var\(--brand\)/));
  });
});
