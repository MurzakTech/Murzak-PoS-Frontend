/**
 * Ticket P1-2 / AC-03: Inter loads as one variable file, Latin subset, with font-display: swap.
 */
import fs from 'fs';
import path from 'path';

const ours = fs.readFileSync(path.join(__dirname, 'fonts.css'), 'utf8');
const pkg = path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'inter');
const packageCss = fs.readFileSync(path.join(pkg, 'wght.css'), 'utf8');

const blocks = (css) => css.match(/@font-face\s*\{[^}]*\}/g) || [];
const field = (block, name) => (block.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]?.replace(/\s+/g, ' ').trim();

describe('Inter is loaded as one Latin variable file', () => {
  const faces = blocks(ours.replace(/\/\*[\s\S]*?\*\//g, ''));

  test('there is exactly one font face, for Inter Variable', () => {
    expect(faces).toHaveLength(1);
    expect(field(faces[0], 'font-family')).toBe("'Inter Variable'");
  });

  test('it shows text at once and swaps the font in when it arrives', () => {
    expect(field(faces[0], 'font-display')).toBe('swap');
  });

  test('it is a variable font covering the weights 400, 500, 600 and 700 (100 to 900)', () => {
    expect(field(faces[0], 'font-weight')).toBe('100 900');
    expect(field(faces[0], 'src')).toMatch(/inter-latin-wght-normal\.woff2.*woff2-variations/);
  });

  test('the application does not import the seven-language package style sheet any more', () => {
    const entry = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
    expect(entry).not.toMatch(/import\s+['"]@fontsource-variable\/inter['"]/);
    expect(entry).toMatch(/import\s+['"]\.\/fonts\.css['"]/);
  });

  test("it is the package's own Latin block: same file and same character range", () => {
    const latin = blocks(packageCss).find((b) => /inter-latin-wght-normal/.test(b));
    const normal = (s) => s.replace(/\s+/g, '');
    expect(normal(field(faces[0], 'unicode-range'))).toBe(normal(field(latin, 'unicode-range')));
    expect(field(latin, 'font-weight')).toBe('100 900');
    expect(field(latin, 'font-display')).toBe('swap');
  });

  test('the design tokens name the same font family', () => {
    const tokens = fs.readFileSync(path.join(__dirname, 'newlook', 'tokens.css'), 'utf8');
    expect(tokens).toMatch(/--font-family:\s*'Inter Variable'/);
  });
});
