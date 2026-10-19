/**
 * The accent colours (ticket P7-3): every choice in the Brand list exists in the design tokens in both themes, and every pair that carries
 * text is at least 4.5:1 (on white and on the dark surface). There is no way to type a colour: the list is names only.
 */
import fs from 'fs';
import path from 'path';
import { ACCENTS, DEFAULT_ACCENT } from './brandModel';

const css = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');

const rule = (selector) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out = {};
  body.split('\n').forEach((line) => {
    const m = line.match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
    if (m) out[m[1]] = m[2].trim();
  });
  return out;
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const light = rule(':root');
const dark = rule(":root[data-theme='dark']");
const OTHERS = ACCENTS.filter((name) => name !== DEFAULT_ACCENT);

describe('every accent is a set of tokens, not a typed colour', () => {
  test('the default is the indigo already in the token file, and the others each have a light and a dark rule and a swatch', () => {
    expect(rule(`:root[data-accent='${DEFAULT_ACCENT}']`)).toBeNull();
    OTHERS.forEach((name) => {
      expect(rule(`:root[data-accent='${name}']`)).not.toBeNull();
      expect(rule(`:root[data-accent='${name}'][data-theme='dark']`)).not.toBeNull();
    });
    ACCENTS.forEach((name) => expect(rule(`[data-swatch='${name}']`)).not.toBeNull());
  });

  test('an accent changes only the brand colour and its ramp', () => {
    const allowed = ['brand', 'brand-text', 'on-brand', 'soft', 'track', 'selected-row'];
    OTHERS.forEach((name) => {
      expect(Object.keys(rule(`:root[data-accent='${name}']`)).sort()).toEqual(allowed.slice().sort());
      expect(Object.keys(rule(`:root[data-accent='${name}'][data-theme='dark']`)).sort()).toEqual(allowed.slice().sort());
    });
  });
});

describe('4.5:1 for every pair that carries text, in both themes', () => {
  const sets = ACCENTS.map((name) => {
    if (name === DEFAULT_ACCENT) return [name, light, dark];
    return [name, { ...light, ...rule(`:root[data-accent='${name}']`) }, { ...dark, ...rule(`:root[data-accent='${name}'][data-theme='dark']`) }];
  });

  test.each(sets)('%s on the light theme', (_name, l) => {
    ['surface', 'bg', 'soft', 'track', 'selected-row'].forEach((ground) => expect(ratio(l['brand-text'], l[ground])).toBeGreaterThanOrEqual(4.5));
    expect(ratio(l['on-brand'], l.brand)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(sets)('%s on the dark theme', (_name, _l, d) => {
    ['surface', 'bg', 'soft', 'track', 'selected-row'].forEach((ground) => expect(ratio(d['brand-text'], d[ground])).toBeGreaterThanOrEqual(4.5));
    expect(ratio(d['on-brand'], d.brand)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(ACCENTS)('%s as it prints on white paper reads at 4.5:1', (name) => {
    expect(ratio(rule(`[data-swatch='${name}']`)['accent-paper'], light.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
