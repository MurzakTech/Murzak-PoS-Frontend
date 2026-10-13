/**
 * Ticket P1-1: the design tokens. These tests are acceptance checks AC-01 and AC-02 for the token file:
 * the values match the Build Pack's Part 1 tables exactly, the contrast rules hold in both themes, and no
 * redesigned file hard-codes a colour of its own.
 */
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { ThemeProvider, useThemeMode } from '../theme/ThemeProvider';

const NEWLOOK = __dirname;
const css = fs.readFileSync(path.join(NEWLOOK, 'tokens.css'), 'utf8');

// Split the file into its light block (:root) and its dark block (:root[data-theme='dark']) and read the names
const block = (selector) => {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const out = {};
  css
    .slice(open + 1, close)
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
      if (m) out[m[1]] = m[2].trim();
    });
  return out;
};
const light = block(':root {');
const dark = block(":root[data-theme='dark']");

// Part 1, Design system, Colour table (name: [light, dark])
const COLOURS = {
  bg: ['#f4f4f8', '#0e0f14'],
  surface: ['#ffffff', '#171821'],
  ink: ['#12131a', '#f0efec'],
  'ink-2': ['#4a4b57', '#c3c2b7'],
  muted: ['#6b6c78', '#9a9aa8'],
  line: ['#e6e6ee', '#262735'],
  base: ['#cfcfdb', '#383848'],
  'input-border': ['#8a8b99', '#6b6c80'],
  field: ['#fafafc', '#1d1e29'],
  brand: ['#4f46e5', '#7c75f0'],
  'brand-text': ['#4f46e5', '#8f89f3'],
  'on-brand': ['#ffffff', '#0e0f14'],
  soft: ['#eeedfd', '#23224a'],
  track: ['#e8e7fb', '#2a2a52'],
  'selected-row': ['#f3f2ff', '#1f1f3d'],
  good: ['#006300', '#0ca30c'],
  bad: ['#c93232', '#e66767'],
  warn: ['#a85d00', '#e0a040'],
  'series-1': ['#4f46e5', '#7c75f0'],
  'series-2': ['#eb6834', '#d95926'],
  'series-3': ['#1baf7a', '#199e70'],
  'series-4': ['#eda100', '#c98500'],
  compare: ['#9a9bb0', '#9a9bb0'],
};

describe('AC-01: colour tokens match the Colour table in both themes', () => {
  test('there are exactly the 23 colour tokens of Part 1, no more', () => {
    expect(Object.keys(COLOURS)).toHaveLength(23);
    const hexTokens = Object.keys(light).filter((n) => /^#[0-9a-f]{6}$/i.test(light[n]));
    expect(hexTokens.sort()).toEqual(Object.keys(COLOURS).sort());
  });

  test.each(Object.entries(COLOURS))('%s has the light and dark values of the table', (name, [lightValue, darkValue]) => {
    expect(light[name]).toBe(lightValue);
    expect(dark[name]).toBe(darkValue);
  });

  test('the dark block sets the same names as the light block, so no component needs a dark-only rule', () => {
    const darkColours = Object.keys(dark).filter((n) => n !== 'ink-rgb').sort();
    expect(darkColours).toEqual(Object.keys(COLOURS).sort());
  });

  test('the ink channels used for shadows are the ink colour of each theme', () => {
    const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
    expect(light['ink-rgb']).toBe(channels(light.ink));
    expect(dark['ink-rgb']).toBe(channels(dark.ink));
  });
});

describe('Part 1 type, space, shape and elevation tokens', () => {
  test.each([
    ['page-title-size', '28px'],
    ['page-title-weight', '700'],
    ['page-title-spacing', '-0.02em'],
    ['card-title-size', '17px'],
    ['card-title-size-small', '15px'],
    ['card-title-weight', '600'],
    ['body-size', '14px'],
    ['body-line', '1.5'],
    ['table-size', '13.5px'],
    ['caption-size', '12.5px'],
    ['label-size', '11.5px'],
    ['label-weight', '700'],
    ['label-spacing', '0.06em'],
    ['kpi-size', '22px'],
    ['kpi-weight', '700'],
    ['hero-size', '44px'],
    ['hero-weight', '700'],
    ['card-padding', '20px'],
    ['card-gap', '16px'],
    ['page-gutter', '24px'],
    ['content-max', '1240px'],
    ['radius-card', '14px'],
    ['radius-tile', '12px'],
    ['radius-input', '10px'],
    ['radius-button', '10px'],
    ['radius-button-small', '8px'],
    ['radius-pill', '999px'],
    ['control-height', '40px'],
    ['control-height-till', '44px'],
    ['control-height-small', '32px'],
    ['icon-size', '18px'],
    ['icon-stroke', '1.8px'],
    ['focus-ring-width', '2px'],
    ['focus-ring-offset', '2px'],
  ])('%s is %s', (name, value) => {
    expect(light[name]).toBe(value);
  });

  test('the spacing scale is 4, 8, 12, 16, 20, 24, 32, 40', () => {
    const scale = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => light[`space-${i}`]);
    expect(scale).toEqual(['4px', '8px', '12px', '16px', '20px', '24px', '32px', '40px']);
  });

  test('cards have a 1px line and no shadow; menus and dialogs use the ink at 10% and 12%', () => {
    expect(light['card-border']).toBe('1px solid var(--line)');
    expect(light['shadow-card']).toBe('none');
    expect(light['shadow-menu']).toBe('0 8px 24px rgb(var(--ink-rgb) / 0.1)');
    expect(light['shadow-dialog']).toBe('0 12px 32px rgb(var(--ink-rgb) / 0.12)');
  });

  test('the focus ring is 2px in brand-text with a 2px offset', () => {
    expect(light['focus-ring']).toBe('var(--focus-ring-width) solid var(--brand-text)');
  });

  test('the font is Inter, with the weights 400, 500, 600 and 700', () => {
    expect(light['font-family']).toMatch(/^'Inter Variable', Inter,/);
    expect([light['font-weight-regular'], light['font-weight-medium'], light['font-weight-semibold'], light['font-weight-bold']]).toEqual(['400', '500', '600', '700']);
  });
});

// WCAG relative luminance and contrast ratio
const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('AC-02: contrast rules hold in both themes', () => {
  const themes = { light, dark };

  describe.each(Object.keys(themes))('%s theme', (mode) => {
    const t = themes[mode];

    test.each([
      ['ink', 'surface'],
      ['ink', 'bg'],
      ['ink-2', 'surface'],
      ['muted', 'surface'],
      ['muted', 'bg'],
      ['brand-text', 'surface'],
      ['brand-text', 'soft'], // the pair that failed (4.05:1) with the old brand colour in the dark theme
      ['on-brand', 'brand'],
      ['good', 'surface'],
      ['bad', 'surface'],
      ['warn', 'surface'],
    ])('text %s on %s is at least 4.5:1', (fg, bg) => {
      expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
    });

    test('the input border stands out from the input fill by at least 3:1 (WCAG 1.4.11)', () => {
      expect(ratio(t['input-border'], t.field)).toBeGreaterThanOrEqual(3);
    });

    test('the focus ring (brand-text) stands out from the page and from cards by at least 3:1', () => {
      expect(ratio(t['brand-text'], t.bg)).toBeGreaterThanOrEqual(3);
      expect(ratio(t['brand-text'], t.surface)).toBeGreaterThanOrEqual(3);
    });
  });

  // The figures the Spec quotes, so a changed colour that moves them is noticed
  test.each([
    ['dark, brand on soft (the old failure)', () => ratio('#7c75f0', dark.soft), 4.05],
    ['dark, brand-text on soft (the fix)', () => ratio(dark['brand-text'], dark.soft), 5.03],
    ['light, series-3 on surface', () => ratio(light['series-3'], light.surface), 2.82],
    ['light, series-4 on surface', () => ratio(light['series-4'], light.surface), 2.17],
    ['light, compare on surface', () => ratio(light.compare, light.surface), 2.73],
    ['light, input-border on field', () => ratio(light['input-border'], light.field), 3.23],
    ['dark, input-border on field', () => ratio(dark['input-border'], dark.field), 3.21],
    ['light, focus ring on page', () => ratio(light['brand-text'], light.bg), 5.73],
    ['dark, focus ring on page', () => ratio(dark['brand-text'], dark.bg), 6.42],
  ])('%s measures %s', (_name, measure, expected) => {
    expect(measure()).toBeCloseTo(expected, 1);
  });

  test('light series-3, series-4 and compare are below 3:1, so a series must also be labelled (Spec: colour is never the only signal)', () => {
    ['series-3', 'series-4', 'compare'].forEach((name) => {
      expect(ratio(light[name], light.surface)).toBeLessThan(3);
    });
  });
});

describe('no redesigned file hard-codes a colour', () => {
  const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
  const files = fs
    .readdirSync(NEWLOOK)
    .filter((f) => /\.(js|jsx|css)$/.test(f) && !/\.test\.(js|jsx)$/.test(f) && f !== 'tokens.css');

  test('the redesigned files are found', () => {
    expect(files).toEqual(expect.arrayContaining(['NewLookShell.jsx', 'NewLookGate.jsx', 'NewLookProvider.jsx']));
  });

  test.each(files)('%s uses only tokens', (file) => {
    const lines = fs.readFileSync(path.join(NEWLOOK, file), 'utf8').split('\n');
    const offenders = lines.filter((l) => COLOUR.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    expect(offenders).toEqual([]);
  });
});

describe('the theme class that switches light to dark', () => {
  const Toggle = () => {
    const { toggleColorMode } = useThemeMode();
    return <button onClick={toggleColorMode}>switch</button>;
  };

  test('the root element carries data-theme and it follows the theme toggle', () => {
    localStorage.setItem('themeMode', 'light');
    render(
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    act(() => screen.getByText('switch').click());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    localStorage.clear();
  });
});
