import { formatMoney } from '../../components/format';
import fill from '../../labels/fill';
import { unitWord } from '../unitWords';
import T from './strings.import';

/**
 * The plain rules behind the Import products page (ticket P7-1): putting the browser's own findings together with the server's
 * preview, the words for what was understood and what will happen, and the filter. No React here, so each rule is tested alone.
 */
export const PAGE_SIZE = 50;

const changeValue = (field, value) => {
  if (value === '' || value === null || value === undefined) return T.changeEmpty;
  if (field === 'price' || field === 'cost_price') return formatMoney(value);
  return String(value);
};

/** "price: KES 250 to KES 300" for one change the server reported */
export const changeText = (change) =>
  fill(T.change, { field: T.fields[change.field] || change.field, from: changeValue(change.field, change.from), to: changeValue(change.field, change.to) });

/** The cells the server understood, as short phrases for one row ("Category: Drinks", "Price: KES 250"). Empty cells are left out. */
export const understoodLines = (understood) => {
  const u = understood || {};
  const U = T.understood;
  const lines = [];
  if (u.category) lines.push(fill(U.category, { value: u.category }));
  if (u.unit) lines.push(fill(U.unit, { value: unitWord(u.unit) || u.unit }));
  if (u.price !== null && u.price !== undefined) lines.push(fill(U.price, { value: formatMoney(u.price) }));
  if (u.cost_price !== null && u.cost_price !== undefined) lines.push(fill(U.cost, { value: formatMoney(u.cost_price) }));
  if (u.opening_stock) lines.push(fill(U.stock, { value: u.opening_stock }));
  if (u.store && u.opening_stock) lines.push(fill(U.store, { value: u.store }));
  if (u.low_stock_level) lines.push(fill(U.low, { value: u.low_stock_level }));
  if (u.brand) lines.push(fill(U.brand, { value: u.brand }));
  if (u.barcode) lines.push(fill(U.barcode, { value: u.barcode }));
  if (u.image && u.image.kind) lines.push(fill(U.image, { value: u.image.kind === 'link' ? U.imageLink : u.image.value }));
  if (u.is_service) lines.push(U.service);
  if (u.vat_class && u.vat_class !== 'standard') lines.push(fill(U.vat, { value: T.vat[u.vat_class] || u.vat_class }));
  return lines;
};

/**
 * One list of rows for the page: the rows the browser already refused, and the rows the server looked at, in file order.
 * Each is { row, code, name, action, will, understood[], changes[], problems[], notes[] }; action is create, update, unchanged
 * or invalid. A row the browser refused never reached the server.
 */
export const previewRows = (check, preview) => {
  const rows = [];
  (check ? check.invalid : []).forEach((r) =>
    rows.push({ id: r.rowNumber, row: r.rowNumber, code: r.itemCode, name: r.itemName, action: T.keys.invalid, will: T.actions.invalid, understood: [], changes: [], problems: r.problems, notes: [] })
  );
  (preview ? preview.rows : []).forEach((r) =>
    rows.push({
      id: r.row,
      row: r.row,
      code: r.item_code,
      name: r.item_name,
      action: r.action,
      will: r.will,
      understood: r.action === T.keys.invalid ? [] : understoodLines(r.understood),
      changes: (r.changes || []).map(changeText),
      problems: (r.problems || []).map((p) => p.message),
      notes: r.notes || [],
    })
  );
  return rows.sort((a, b) => a.row - b.row);
};

/** The numbers over the whole file: how many rows will be added, updated, left alone and left out (browser and server together) */
export const countsOf = (check, preview) => {
  const server = preview ? preview.counts : { create: 0, update: 0, unchanged: 0, invalid: 0 };
  return { create: server.create, update: server.update, unchanged: server.unchanged, invalid: server.invalid + (check ? check.invalid.length : 0) };
};

/** Does this row need a look: it is left out, or it has something worth reading */
export const needsAttention = (row) => row.action === T.keys.invalid || row.problems.length > 0 || row.notes.length > 0;

export const filterRows = (rows, filter) => (filter === 'attention' ? rows.filter(needsAttention) : rows);

/** How many rows the button will import (new and updated rows) */
export const importCount = (counts) => counts.create + counts.update;

/** The words of the main button */
export const saveLabel = (counts) => {
  const n = counts ? importCount(counts) : 0;
  if (n === 1) return T.saveOne;
  return n > 1 ? fill(T.save, { count: n }) : T.saveNone;
};

/** The rows to send to the server: those the browser accepted, with the sheet's own row numbers */
export const rowsToSend = (check) => (check ? check.rows.map((r) => r.payload) : []);

/** The rows of a finished import that need a second look (could not be saved, left out, or with a note) */
export const resultNeedsAttention = (row) => row.status === 'failed' || row.status === 'left_out' || (row.notes || []).length > 0 || (row.problems || []).length > 0;

/** The lines under the result heading */
export const resultLines = (result) => {
  const R = T.result;
  const lines = [];
  if (result.categoriesCreated.length) lines.push(fill(R.categories, { list: result.categoriesCreated.join(', ') }));
  if (result.brandsCreated.length) lines.push(fill(R.brands, { list: result.brandsCreated.join(', ') }));
  if (result.stock.problem) lines.push(fill(R.stockProblem, { problem: result.stock.problem }));
  else if (result.stock.rows) lines.push(fill(R.stockAdded, { rows: result.stock.rows }));
  if (result.picturesAdded) lines.push(fill(R.pictures, { count: result.picturesAdded }));
  if (result.photosProblem) lines.push(result.photosProblem);
  return lines;
};

/** Did the import finish with anything that needs attention? */
export const resultHasTrouble = (result) => result.counts.failed > 0 || result.counts.left_out > 0 || Boolean(result.stock.problem);
