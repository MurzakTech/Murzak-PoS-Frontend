import fill from '../../labels/fill';
import { MAX_ROWS, parseAmount } from '../../../utils/productImport';
import T from './strings.import';
import products from '../strings.products';

/**
 * Reading the product spreadsheet of the redesign (ticket P7-1). The file reading itself (CSV and Excel) is the shared
 * readProductFile; this file knows the columns of the new sheet, checks each row quickly in the browser (so a typing
 * mistake is found before anything is sent) and turns each good row into the plain values the server call takes.
 * The server checks everything again; nothing here is trusted by it.
 *
 * Plain values only, no browser APIs, so every rule can be tested directly.
 */
export const MAX_TEXT = 140;
export const MAX_IMPORT_ROWS = MAX_ROWS;

// The columns, in the order of the template. aliases: other ways people write the heading (letters and digits only, lower case).
export const COLUMNS = [
  { field: 'item_code', required: true },
  { field: 'item_name', required: true },
  { field: 'category' },
  { field: 'unit' },
  { field: 'price' },
  { field: 'cost_price' },
  { field: 'opening_stock' },
  { field: 'store' },
  { field: 'low_stock_level' },
  { field: 'description' },
  { field: 'brand' },
  { field: 'barcode' },
  { field: 'image' },
  { field: 'is_service' },
  { field: 'vat_class' },
].map((column) => ({ ...column, aliases: T.aliases[column.field] }));

const squash = (text) => String(text === null || text === undefined ? '' : text).toLowerCase().replace(/[^a-z0-9]/g, '');

const HEADING_FIELD = {};
COLUMNS.forEach(({ field, aliases }) => {
  HEADING_FIELD[squash(field)] = field;
  aliases.forEach((a) => {
    HEADING_FIELD[a] = field;
  });
});
// The earlier sheet said "is_stock_item"; its opposite is "is a service"
HEADING_FIELD[squash('is_stock_item')] = 'is_stock_item';
HEADING_FIELD.stockitem = 'is_stock_item';
HEADING_FIELD.maintainstock = 'is_stock_item';
HEADING_FIELD.trackstock = 'is_stock_item';

/** Which column holds which field: { columns: {field: index}, unknown: [headings we do not use] } */
export const mapColumns = (headings) => {
  const columns = {};
  const unknown = [];
  headings.forEach((heading, index) => {
    const raw = String(heading === null || heading === undefined ? '' : heading).trim();
    if (!raw) return;
    const field = HEADING_FIELD[squash(raw)];
    if (field && columns[field] === undefined) columns[field] = index;
    else unknown.push(raw);
  });
  return { columns, unknown };
};

// ---------------------------------------------------------------- units in plain words

/**
 * The stored name of a unit from what a person wrote: the stored name itself (Kg), its plain words (kilogram, kilograms) or a
 * common short form (kgs). Capitals and spaces do not matter. Returns the stored name, or null when the shop has no such unit
 * (the row then says so; a unit is never dropped silently). shopUnits: [{ name }] or ['Kg', ...].
 * Helper B's resolveUnit in unitWords.js does the same job with the shop's industry units; once it is merged this can call it.
 */
export const resolveUnitName = (text, shopUnits) => {
  const key = squash(text);
  if (!key) return null;
  const names = (shopUnits || []).map((u) => (typeof u === 'string' ? u : u && (u.name || u.uom_name))).filter(Boolean);
  const stored = names.find((n) => squash(n) === key);
  if (stored) return stored;
  const own = Object.prototype.hasOwnProperty.call(products.units, key) ? products.units[key] : null;
  if (!own) return null;
  return (
    names.find((n) => {
      const pair = Object.prototype.hasOwnProperty.call(products.units, squash(n)) ? products.units[squash(n)] : null;
      return pair && pair[0] === own[0];
    }) || null
  );
};

// ---------------------------------------------------------------- yes and no

const YES = ['1', 'true', 'yes', 'y', 'ndiyo'];
const NO = ['0', 'false', 'no', 'n', 'hapana'];
const flag = (value) => {
  const s = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  if (s === '') return undefined;
  if (YES.includes(s)) return true;
  if (NO.includes(s)) return false;
  return null;
};

// ---------------------------------------------------------------- checking the sheet

const isBlankRow = (cells) => cells.every((c) => String(c === null || c === undefined ? '' : c).trim() === '');

/**
 * Checks a sheet (first row = headings) in the browser.
 * Returns { fileProblems[], rows[{ rowNumber, payload }], invalid[{ rowNumber, itemCode, itemName, problems[], cells }],
 * unknownColumns[], headings[], total }. `payload` is what is sent to the server for that row.
 */
export const checkSheet = (sheet, { shopUnits = [] } = {}) => {
  const result = { fileProblems: [], rows: [], invalid: [], unknownColumns: [], headings: [], total: 0 };
  const rows = (sheet || []).map((r) => (Array.isArray(r) ? r : []));
  const P = T.fileProblems;

  if (rows.length === 0 || isBlankRow(rows[0])) {
    result.fileProblems.push(P.empty);
    return result;
  }
  const headings = rows[0].map((h) => String(h === null || h === undefined ? '' : h).trim());
  result.headings = headings;
  const { columns, unknown } = mapColumns(headings);
  result.unknownColumns = unknown;

  const missing = ['item_code', 'item_name'].filter((f) => columns[f] === undefined);
  if (missing.length) {
    result.fileProblems.push(fill(P.missing, { names: missing.map((m) => `"${m}"`).join(' and '), found: headings.filter(Boolean).join(', ') || P.noHeadings }));
    return result;
  }

  const body = rows.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 })).filter((r) => !isBlankRow(r.cells));
  result.total = body.length;
  if (body.length === 0) {
    result.fileProblems.push(P.noRows);
    return result;
  }
  if (body.length > MAX_IMPORT_ROWS) {
    result.fileProblems.push(fill(P.tooMany, { count: body.length, max: MAX_IMPORT_ROWS }));
    return result;
  }

  const get = (cells, field) => (columns[field] === undefined ? '' : String(cells[columns[field]] === null || cells[columns[field]] === undefined ? '' : cells[columns[field]]).trim());
  const seen = new Map();
  const R = T.rowProblems;

  body.forEach(({ cells, rowNumber }) => {
    const problems = [];
    const itemCode = get(cells, 'item_code');
    const itemName = get(cells, 'item_name');

    const lastFilled = cells.reduce((last, c, i) => (String(c === null || c === undefined ? '' : c).trim() !== '' ? i : last), -1);
    if (lastFilled >= headings.length) problems.push(R.wide);

    if (!itemCode) problems.push(R.codeEmpty);
    else if (itemCode.length > MAX_TEXT) problems.push(fill(R.codeLong, { max: MAX_TEXT }));
    if (!itemName) problems.push(R.nameEmpty);
    else if (itemName.length > MAX_TEXT) problems.push(fill(R.nameLong, { max: MAX_TEXT }));
    if (itemCode) {
      const key = itemCode.toLowerCase();
      if (seen.has(key)) problems.push(fill(R.codeTwice, { code: itemCode, row: seen.get(key) }));
      else seen.set(key, rowNumber);
    }

    const payload = { row_number: rowNumber, item_code: itemCode, item_name: itemName };
    ['category', 'brand', 'description', 'barcode', 'store', 'image', 'vat_class'].forEach((field) => {
      const value = get(cells, field);
      if (value !== '') payload[field] = value;
    });

    const unit = get(cells, 'unit');
    if (unit) payload.unit = resolveUnitName(unit, shopUnits) || unit;

    ['price', 'cost_price', 'opening_stock', 'low_stock_level'].forEach((field) => {
      const raw = get(cells, field);
      if (raw === '') return;
      const parsed = parseAmount(raw);
      const name = T.fieldNames[field];
      if (parsed === null) problems.push(fill(R.number, { field: name, value: `"${raw}"` }));
      else if (parsed < 0) problems.push(fill(R.negative, { field: name }));
      else payload[field] = String(parsed);
    });

    const service = flag(get(cells, 'is_service'));
    const stockItem = flag(get(cells, 'is_stock_item'));
    if (service === null) problems.push(fill(R.yesNo, { field: T.fieldNames.is_service, value: `"${get(cells, 'is_service')}"` }));
    else if (service !== undefined) payload.is_service = service ? 'yes' : 'no';
    else if (stockItem === false) payload.is_service = 'yes';

    if (problems.length) {
      result.invalid.push({ rowNumber, itemCode, itemName, problems, cells });
      return;
    }
    result.rows.push({ rowNumber, payload });
  });

  return result;
};

// ---------------------------------------------------------------- the template

const quote = (value) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** The CSV template: the headings and two sample rows. The BOM at the start makes Excel open it as UTF-8. */
export const templateCsv = () => {
  const headings = COLUMNS.map((c) => c.field);
  const samples = [
    ['TUSK500', 'Tusker Lager 500ml', 'Drinks', products.defaultUnit, '250', '190', '48', '', '12', 'Bottled lager', 'Tusker', '6161100012345', 'https://example.com/photos/tusker.jpg', '', 'standard'],
    ['CUT01', 'Haircut', 'Services', products.defaultUnit, '300', '', '', '', '', 'Standard cut', '', '', 'haircut.jpg', 'yes', ''],
  ];
  return `﻿${[headings, ...samples].map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`;
};
