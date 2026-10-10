/**
 * Logic for the "starter products" page: the ready-made catalogue a business
 * picks from, adds its own prices to, and saves as real products.
 *
 * The server gives each starter product only a code and a name. Prices and
 * categories are always the owner's to supply, so this module is about making
 * that quick (fill them in from a spreadsheet) and safe (never save a product
 * without a real selling price by accident).
 */
import { parseAmount } from './productImport';

export const DEFAULT_GROUP = 'All Item Groups'; // what the server gets when no category is chosen
export const DEFAULT_UOM = 'Nos';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// ---------------------------------------------------------------- the list

/** Starter products from the server, as editable rows. Empty price/category/stock mean "not filled in yet". */
export const buildStarterItems = (seedProducts) =>
  (Array.isArray(seedProducts) ? seedProducts : [])
    .filter((p) => p && p.sku && p.name)
    .map((p) => ({
      item_code: String(p.sku),
      item_name: String(p.name),
      item_group: '',
      uom: DEFAULT_UOM,
      item_price: null,
      buying_price: null,
      qty: null,
    }));

const hasValue = (v) => v !== null && v !== undefined && v !== '';

// ---------------------------------------------------------------- checking the ticked rows

/**
 * Decides which ticked products can be saved. A product needs a selling price
 * above 0: the old page accepted 0, so it was easy to create products that
 * then sold for nothing.
 *
 * Returns { valid: [items], problems: [{ item_code, item_name, message }] }
 */
export const checkStarterSelection = (items, selected, activeWarehouseName) => {
  const valid = [];
  const problems = [];

  items.filter((item) => selected.has(item.item_code)).forEach((item) => {
    const messages = [];
    const price = item.item_price;

    if (!hasValue(price)) messages.push('Enter a selling price.');
    else if (!(price > 0)) messages.push(price < 0 ? 'The selling price cannot be negative.' : 'The selling price is 0. Enter the price you sell it for.');

    if (hasValue(item.buying_price) && !(item.buying_price >= 0)) messages.push('The buying price cannot be negative.');

    if (hasValue(item.qty)) {
      if (!Number.isInteger(item.qty) || item.qty < 0) messages.push('The quantity must be a whole number, 0 or more.');
      else if (item.qty > 0 && !activeWarehouseName) messages.push('Choose a store in the top bar before adding stock quantities.');
    }

    if (messages.length) problems.push({ item_code: item.item_code, item_name: item.item_name, message: messages.join(' ') });
    else valid.push(item);
  });

  return { valid, problems };
};

/** The request for the server: same shape as before, built in one place so it can be tested */
export const buildSeedPayload = ({ items, priceList, buyingPriceList, warehouse, company, industry }) => {
  const payload = {
    price_list: priceList,
    buying_price_list: buyingPriceList,
    items: items.map((item) => {
      const out = {
        item_code: item.item_code,
        item_name: item.item_name,
        item_price: Number(item.item_price),
        item_group: item.item_group || DEFAULT_GROUP,
        uom: item.uom || DEFAULT_UOM,
      };
      if (hasValue(item.buying_price)) out.buying_price = Number(item.buying_price);
      if (hasValue(item.qty) && item.qty > 0) {
        out.qty = item.qty;
        if (warehouse) out.warehouse = warehouse;
        if (out.buying_price !== undefined) out.basic_rate = out.buying_price; // cost used to value the opening stock
      }
      return out;
    }),
  };
  if (warehouse) payload.warehouse = warehouse;
  if (company) payload.company = company;
  if (industry) payload.industry = industry;
  return payload;
};

// ---------------------------------------------------------------- the spreadsheet round trip

const HEADINGS = ['item_code', 'item_name', 'category', 'selling_price', 'buying_price', 'quantity'];

/** The list as a CSV to fill in with Excel. The leading BOM makes Excel read it as UTF-8. */
export const starterTemplateCsv = (items) => {
  const rows = items.map((i) => [i.item_code, i.item_name, i.item_group, i.item_price ?? '', i.buying_price ?? '', i.qty ?? '']);
  return '\uFEFF' + [HEADINGS, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
};

// Heading as written in the file (lower case, letters and digits only) -> field
const ALIASES = {
  item_code: ['itemcode', 'code', 'sku', 'productcode'],
  item_name: ['itemname', 'name', 'productname', 'product'],
  item_group: ['itemgroup', 'category', 'group'],
  item_price: ['itemprice', 'sellingprice', 'price', 'saleprice', 'standardrate', 'rate'],
  buying_price: ['buyingprice', 'costprice', 'cost', 'purchaseprice', 'buyprice'],
  qty: ['qty', 'quantity', 'stock', 'openingstock', 'stockqty'],
  uom: ['uom', 'unit', 'stockuom'],
};
const FIELD_FOR = {};
Object.entries(ALIASES).forEach(([field, names]) => {
  FIELD_FOR[field.replace(/[^a-z0-9]/g, '')] = field;
  names.forEach((n) => { FIELD_FOR[n] = field; });
});
const squash = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** An old-style JSON file ({ items: [...] }) as rows, so it goes through the same checks as a spreadsheet */
export const jsonToSheet = (parsed) => {
  const list = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(list)) return null;
  const cols = ['item_code', 'item_name', 'item_group', 'item_price', 'buying_price', 'qty', 'uom'];
  return [cols, ...list.map((o) => cols.map((c) => (o && o[c] !== undefined && o[c] !== null ? String(o[c]) : '')))];
};

/**
 * Applies a filled-in sheet to the list. Products are matched by item code:
 * a matching row updates that product's price, category, stock and unit, and a
 * row with a new code and a name is added as a product of your own.
 *
 * Returns { items, touched: Set<code>, updated, added, problems: [{ rowNumber, itemCode, message }], fileProblems: [] }
 * and never changes the items when fileProblems is not empty.
 */
export const applySheetToItems = (items, sheet) => {
  const result = { items, touched: new Set(), updated: 0, added: 0, problems: [], fileProblems: [] };
  const rows = (sheet || []).map((r) => (Array.isArray(r) ? r : []));
  const blank = (cells) => cells.every((c) => String(c ?? '').trim() === '');

  if (rows.length === 0 || blank(rows[0])) {
    result.fileProblems.push('The file is empty. The first row must hold the column headings, such as item_code and selling_price.');
    return result;
  }

  const columns = {};
  rows[0].forEach((h, i) => {
    const field = FIELD_FOR[squash(h)];
    if (field && columns[field] === undefined) columns[field] = i;
  });
  if (columns.item_code === undefined) {
    result.fileProblems.push(`The first row must contain "item_code" so we know which product each row is for. We found: ${rows[0].map((h) => String(h ?? '').trim()).filter(Boolean).join(', ') || 'no headings'}. Use "Download list" to get a file in the right layout.`);
    return result;
  }

  const get = (cells, field) => (columns[field] === undefined ? '' : String(cells[columns[field]] ?? '').trim());
  const next = items.map((i) => ({ ...i }));
  const indexByCode = new Map(next.map((item, i) => [item.item_code.toLowerCase(), i]));
  const seenInFile = new Set();

  rows.slice(1).forEach((cells, i) => {
    if (blank(cells)) return;
    const rowNumber = i + 2;
    const code = get(cells, 'item_code');
    const problem = (message) => result.problems.push({ rowNumber, itemCode: code, message });

    if (!code) return problem('Item code is empty.');
    const key = code.toLowerCase();
    if (seenInFile.has(key)) return problem('This item code appears more than once in the file.');
    seenInFile.add(key);

    // Read the numbers first, so a bad cell rejects the row before anything is changed
    const read = {};
    let bad = false;
    [['item_price', 'selling price'], ['buying_price', 'buying price']].forEach(([field, label]) => {
      const raw = get(cells, field);
      if (raw === '') return;
      const n = parseAmount(raw);
      if (n === null || n < 0) { problem(`The ${label} "${raw}" is not a valid amount.`); bad = true; } else read[field] = n;
    });
    const rawQty = get(cells, 'qty');
    if (rawQty !== '') {
      const q = parseAmount(rawQty);
      if (q === null || q < 0 || !Number.isInteger(q)) { problem(`The quantity "${rawQty}" must be a whole number, 0 or more.`); bad = true; } else read.qty = q;
    }
    if (bad) return;

    const name = get(cells, 'item_name');
    const group = get(cells, 'item_group');
    const uom = get(cells, 'uom');
    const at = indexByCode.get(key);
    const isNew = at === undefined;

    if (isNew && !name) return problem('This code is not in the list and the row has no item_name, so it cannot be added.');

    const target = isNew ? { item_code: code, item_name: name, item_group: '', uom: DEFAULT_UOM, item_price: null, buying_price: null, qty: null } : next[at];
    let changed = isNew;
    const set = (field, value) => { if (target[field] !== value) { target[field] = value; changed = true; } };
    if (name) set('item_name', name);
    if (group) set('item_group', group);
    if (uom) set('uom', uom);
    Object.entries(read).forEach(([field, value]) => set(field, value));

    if (isNew) {
      next.push(target);
      indexByCode.set(key, next.length - 1);
      result.added += 1;
    } else if (changed) {
      result.updated += 1;
    }
    if (changed) result.touched.add(target.item_code);
  });

  result.items = next;
  return result;
};
