/**
 * Finds visible words written inside a component instead of in the strings file, and old terms (the "Today" column
 * of the rename map) in any text. Used by labelsInOnePlace.test.js, so a label added later in the wrong place
 * fails a test instead of slipping in.
 *
 * It reads the code, not the screen: it parses each file and looks at
 *   - text written between tags (<p>Close</p>),
 *   - attributes that are read aloud or shown (aria-label, title, placeholder, ...), and any attribute it does not know,
 *   - object fields and default values called label, title, words, description, placeholder and the like.
 * Anything that is a class name, an address, a key or another technical value is ignored.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { OLD_TERMS } from './renameMap';

const NEWLOOK = path.join(__dirname, '..');

// Files that hold sample content, data tables or the strings themselves are not scanned for stray words
const SKIP = [
  /\.test\./,
  /^labels\//,
  /^redirects\/redirectTable\.js$/,
  /^strings(\.[a-z]+)?\.js$/,
  /^(ComponentPage|DataDemo|OverlayDemo|ShellDemo)\.jsx$/,
  /^newLookRoutes\.js$/,
];

export const filesToScan = (dir = NEWLOOK, base = NEWLOOK) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) return filesToScan(full, base);
    if (!/\.(js|jsx)$/.test(entry.name) || SKIP.some((re) => re.test(rel))) return [];
    return [{ rel, full }];
  });

const TECHNICAL_ATTRIBUTES = new Set([
  'className', 'key', 'ref', 'type', 'role', 'id', 'htmlFor', 'to', 'href', 'variant', 'size', 'tone', 'icon', 'name', 'kind', 'as', 'level',
  'align', 'tabIndex', 'autoComplete', 'inputMode', 'target', 'rel', 'scope', 'method', 'status', 'forceState', 'value', 'status', 'mode',
  'viewBox', 'fill', 'stroke', 'strokeLinecap', 'strokeLinejoin', 'focusable', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'strokeDasharray',
  'aria-live', 'aria-haspopup', 'aria-expanded', 'aria-current', 'aria-atomic', 'aria-modal', 'aria-autocomplete', 'aria-keyshortcuts', 'aria-controls',
  'aria-labelledby', 'aria-describedby', 'aria-selected', 'aria-checked', 'aria-pressed', 'aria-busy', 'aria-invalid', 'aria-activedescendant', 'aria-hidden',
  'aria-disabled', 'xmlns', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'step', 'disabled', 'checked', 'open', 'hidden', 'onClick',
]);

const VISIBLE_KEYS = new Set([
  'label', 'title', 'description', 'placeholder', 'words', 'header', 'hint', 'message', 'note', 'subtitle', 'caption', 'text', 'helper', 'error',
  'action', 'tooltip', 'heading', 'name_', 'content',
]);
const VISIBLE_PARAM = /(^(label|title|description|placeholder|message|subtitle|caption|helper|text)$)|(Label$|Placeholder$|Text$|Title$|Message$)/;
const LETTERS = /[A-Za-z]{2,}/;

const textOf = (node) => {
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral') return node.quasis.map((q) => q.value.cooked).join(' ');
  return null;
};

const walk = (node, visit, parent = null) => {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  Object.keys(node).forEach((key) => {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') return;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => walk(c, visit, node));
    else if (child && typeof child.type === 'string') walk(child, visit, node);
  });
};

/** Every piece of text in the file: { text, line, kind } where kind says where it was found */
export const textsIn = (source) => {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const found = [];
  walk(ast.program, (node, parent) => {
    const line = node.loc ? node.loc.start.line : 0;
    if (node.type === 'JSXText' && LETTERS.test(node.value)) found.push({ text: node.value.trim(), line, kind: 'text' });
    if (node.type === 'JSXAttribute' && node.value) {
      const name = node.name.type === 'JSXIdentifier' ? node.name.name : `${node.name.namespace.name}:${node.name.name.name}`;
      const literal = node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
      const text = literal && textOf(literal);
      const isData = name.startsWith('data-') || name.startsWith('on') || TECHNICAL_ATTRIBUTES.has(name);
      if (text !== null && text !== undefined && LETTERS.test(text)) found.push({ text, line, kind: isData ? 'technical' : `attribute ${name}` });
    }
    if (node.type === 'JSXExpressionContainer' && parent && parent.type === 'JSXElement') {
      const text = textOf(node.expression);
      if (text && LETTERS.test(text)) found.push({ text, line, kind: 'text' });
    }
    if (node.type === 'ObjectProperty' && !node.computed) {
      const key = node.key.name || node.key.value;
      const text = textOf(node.value);
      if (text && LETTERS.test(text)) found.push({ text, line, kind: VISIBLE_KEYS.has(key) ? `field ${key}` : 'technical' });
    }
    if (node.type === 'AssignmentPattern' && node.left.type === 'Identifier') {
      const text = textOf(node.right);
      if (text && LETTERS.test(text)) found.push({ text, line, kind: VISIBLE_PARAM.test(node.left.name) ? `default ${node.left.name}` : 'technical' });
    }
    if (node.type === 'StringLiteral' && LETTERS.test(node.value)) found.push({ text: node.value, line, kind: 'any' });
    if (node.type === 'TemplateLiteral') {
      const text = textOf(node);
      if (text && LETTERS.test(text)) found.push({ text, line, kind: 'any' });
    }
  });
  return found;
};

/** Visible words written in the file itself */
export const strayWords = (source) => textsIn(source).filter((t) => t.kind !== 'any' && t.kind !== 'technical');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OLD_RE = OLD_TERMS.map((term) => ({ term, re: new RegExp(`(^|[^A-Za-z0-9])${escape(term)}($|[^A-Za-z0-9])`, 'i') }));

/** Old terms (from the rename map) found in any text of the file */
export const oldTermsIn = (source) => {
  const hits = [];
  textsIn(source).forEach(({ text, line }) => OLD_RE.forEach(({ term, re }) => re.test(text) && hits.push({ term, text, line })));
  return hits;
};
