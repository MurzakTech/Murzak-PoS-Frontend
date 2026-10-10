/**
 * Checking a sheet of opening stock (item code and quantity) row by row.
 *
 * Recording stock changes real quantities, so nothing is guessed: a row whose
 * quantity is empty, negative or not a number is reported with its row number
 * instead of being dropped, and a code that appears twice is refused instead
 * of being counted twice. Only a quantity of exactly 0 is skipped quietly,
 * because there is nothing to record for it.
 */
import { parseAmount, MAX_ROWS } from './productImport';

const ALIASES = {
  item_code: ['itemcode', 'code', 'sku', 'productcode'],
  qty: ['qty', 'quantity', 'stock', 'openingstock', 'stockqty', 'onhand', 'qtyonhand'],
  item_name: ['itemname', 'name', 'productname', 'product'], // helpful to people, not sent to the server
};
const FIELD_FOR = {};
Object.entries(ALIASES).forEach(([field, names]) => {
  FIELD_FOR[field.replace(/[^a-z0-9]/g, '')] = field;
  names.forEach((n) => { FIELD_FOR[n] = field; });
});
const squash = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isBlankRow = (cells) => cells.every((c) => String(c ?? '').trim() === '');

/**
 * Returns:
 *   fileProblems   problems with the file as a whole
 *   valid          [{ rowNumber, itemName, stock: { item_code, qty } }] rows to record
 *   invalid        [{ rowNumber, itemCode, problems, cells }] rows that cannot be used
 *   zeroRows       [{ rowNumber, itemCode }] rows with a quantity of 0, left out on purpose
 *   unknownColumns headings that are not used
 *   headings, total
 */
export const checkStockSheet = (sheet) => {
  const result = { fileProblems: [], valid: [], invalid: [], zeroRows: [], unknownColumns: [], headings: [], total: 0 };
  const rows = (sheet || []).map((r) => (Array.isArray(r) ? r : []));

  if (rows.length === 0 || isBlankRow(rows[0])) {
    result.fileProblems.push('The file is empty. The first row must hold the column headings: item_code and qty.');
    return result;
  }

  const headings = rows[0].map((h) => String(h ?? '').trim());
  result.headings = headings;
  const columns = {};
  headings.forEach((h, i) => {
    if (!h) return;
    const field = FIELD_FOR[squash(h)];
    if (field && columns[field] === undefined) columns[field] = i;
    else if (!field) result.unknownColumns.push(h);
  });

  const missing = ['item_code', 'qty'].filter((f) => columns[f] === undefined);
  if (missing.length) {
    result.fileProblems.push(
      `The first row must contain ${missing.map((m) => `"${m}"`).join(' and ')}. We found: ${headings.filter(Boolean).join(', ') || 'no headings'}. Download the template to see the layout.`
    );
    return result;
  }

  const body = rows.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 })).filter((r) => !isBlankRow(r.cells));
  result.total = body.length;
  if (body.length === 0) {
    result.fileProblems.push('The file has headings but no rows under them.');
    return result;
  }
  if (body.length > MAX_ROWS) {
    result.fileProblems.push(`The file has ${body.length} rows. Please split it into files of ${MAX_ROWS} or fewer and import them one after the other.`);
    return result;
  }

  const get = (cells, field) => (columns[field] === undefined ? '' : String(cells[columns[field]] ?? '').trim());
  const seen = new Map(); // lower-case code -> first row number

  body.forEach(({ cells, rowNumber }) => {
    const problems = [];
    const itemCode = get(cells, 'item_code');
    const rawQty = get(cells, 'qty');
    let qty = null;

    const lastFilled = cells.reduce((last, c, i) => (String(c ?? '').trim() !== '' ? i : last), -1);
    if (lastFilled >= headings.length) {
      problems.push('This row has more columns than the headings. If a code contains a comma, put it in quotation marks.');
    }

    if (!itemCode) problems.push('Item code is empty.');
    else {
      const key = itemCode.toLowerCase();
      if (seen.has(key)) problems.push(`Item code "${itemCode}" was already used on row ${seen.get(key)}. Combine the quantities into one row.`);
      else seen.set(key, rowNumber);
    }

    if (rawQty === '') problems.push('Quantity is empty.');
    else {
      qty = parseAmount(rawQty);
      if (qty === null) problems.push(`Quantity "${rawQty}" is not a number.`);
      else if (qty < 0) problems.push('Quantity cannot be negative.');
    }

    if (problems.length) {
      result.invalid.push({ rowNumber, itemCode, problems, cells });
    } else if (qty === 0) {
      result.zeroRows.push({ rowNumber, itemCode });
    } else {
      result.valid.push({ rowNumber, itemName: get(cells, 'item_name'), stock: { item_code: itemCode, qty } });
    }
  });

  return result;
};

/** The template people fill in. The BOM makes Excel read the file as UTF-8. */
export const STOCK_TEMPLATE_CSV =
  '\uFEFFitem_code,item_name,qty\r\n' +
  'ITEM001,Tusker Lager 500ml,100\r\n' +
  'ITEM002,Fanta 500ml,50\r\n';

export const STOCK_WORDING = {
  noun: 'item',
  verb: 'recorded',
  where: 'the stock list',
  skippedText: (n) => `${n} ${n === 1 ? 'was' : 'were'} skipped.`,
};

/** Today's date as YYYY-MM-DD in the person's own timezone (toISOString would give the UTC date, a day behind after midnight in Kenya) */
export const localDateString = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
