/**
 * Reading a spreadsheet of products, checking it row by row, and describing
 * what the server did with it.
 *
 * Why this exists: the first version of the import page cut each line at every
 * comma, so a name such as "Burger, Cheese" or a price such as "1,200" was
 * silently mangled, and real Excel files could not be read at all. Everything
 * here works on plain values (no browser APIs) so it can be tested directly.
 */

export const MAX_ROWS = 2000;
const MAX_TEXT = 140; // ERPNext limit for item codes and names

// ---------------------------------------------------------------- reading files

/** Which character separates the columns? Excel in some regions saves with ; or tabs. */
const detectDelimiter = (text) => {
  let inQuotes = false;
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const best = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ',');
  return counts[best] > 0 ? best : ',';
};

/**
 * Turns CSV text into rows of cells. Follows the usual CSV rules: a cell in
 * double quotes may contain commas and line breaks, and "" inside quotes means
 * one quote mark. Handles Windows, Mac and Unix line endings and a leading BOM.
 */
export const parseCsv = (input) => {
  const text = String(input ?? '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      endRow();
    } else if (ch === '\n') {
      endRow();
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) endRow();

  return { rows, unclosedQuote: inQuotes };
};

/** Excel cells arrive typed (numbers, dates, true/false); the checker works with text. */
export const cellsToText = (rows) =>
  rows.map((row) =>
    row.map((value) => {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value);
    })
  );

// ---------------------------------------------------------------- columns

// Heading as written in the file (lower case, letters and digits only) -> field we use.
const ALIASES = {
  item_code: ['itemcode', 'code', 'sku', 'productcode', 'itemno', 'itemnumber'],
  item_name: ['itemname', 'name', 'productname', 'product', 'item'],
  item_group: ['itemgroup', 'category', 'group', 'productcategory'],
  stock_uom: ['stockuom', 'uom', 'unit', 'unitofmeasure'],
  standard_rate: ['standardrate', 'price', 'sellingprice', 'saleprice', 'rate', 'unitprice'],
  description: ['description', 'details'],
  is_stock_item: ['isstockitem', 'stockitem', 'maintainstock', 'trackstock'],
  is_sales_item: ['issalesitem', 'salesitem', 'forsale'],
  is_purchase_item: ['ispurchaseitem', 'purchaseitem'],
  brand: ['brand'],
  barcode: ['barcode', 'ean', 'upc'],
};

const FIELD_FOR_HEADING = {};
Object.entries(ALIASES).forEach(([field, names]) => {
  FIELD_FOR_HEADING[field.replace(/[^a-z0-9]/g, '')] = field;
  names.forEach((n) => {
    FIELD_FOR_HEADING[n] = field;
  });
});

const squash = (heading) => String(heading ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Works out which column holds which field. Returns { columns: {field: index}, unknown: [headings] } */
export const mapHeadings = (headings) => {
  const columns = {};
  const unknown = [];
  headings.forEach((heading, index) => {
    const raw = String(heading ?? '').trim();
    if (!raw) return;
    const field = FIELD_FOR_HEADING[squash(raw)];
    if (field && columns[field] === undefined) columns[field] = index;
    else unknown.push(raw);
  });
  return { columns, unknown };
};

// ---------------------------------------------------------------- values

/**
 * Reads a price the way people write it: 250, 1,200, 1 200.50, KES 1,200,
 * Ksh 350/=, 12,5. Returns null when it cannot be understood as a number.
 */
export const parseAmount = (value) => {
  let s = String(value ?? '').trim();
  if (s === '') return null;
  s = s.replace(/(kes|ksh|kshs|sh|usd|\$)/gi, '').replace(/\/=|=\/|=/g, '').replace(/[\s ']/g, '');
  if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalised;
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: whichever comes last is the decimal point
    normalised = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Commas only: 1,200 or 1,200,000 are thousands; 12,5 or 12,50 is a decimal
    normalised = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : /^-?\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : null;
  } else if ((s.match(/\./g) || []).length > 1) {
    // 1.200.000 written with dots as thousands
    normalised = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : null;
  } else {
    normalised = s;
  }
  if (normalised === null) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
};

const YES = ['1', 'true', 'yes', 'y'];
const NO = ['0', 'false', 'no', 'n'];

/** true / false for yes-no cells, undefined when blank, null when it is neither */
const parseFlag = (value) => {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === '') return undefined;
  if (YES.includes(s)) return true;
  if (NO.includes(s)) return false;
  return null;
};

// ---------------------------------------------------------------- checking rows

const isBlankRow = (cells) => cells.every((c) => String(c ?? '').trim() === '');

/**
 * Checks every row of a sheet (first row = headings).
 *
 * Returns:
 *   fileProblems  problems with the file as a whole (no data, missing columns...)
 *   valid         [{ rowNumber, product }] rows that can be imported
 *   invalid       [{ rowNumber, itemCode, itemName, problems, cells }] rows that cannot
 *   warnings      [{ rowNumber, itemCode, message }] rows that import but deserve a look
 *   unknownColumns headings we do not use (they are ignored, and we say so)
 *   total         how many rows with data were found
 */
export const checkProductSheet = (sheet) => {
  const result = { fileProblems: [], valid: [], invalid: [], warnings: [], unknownColumns: [], headings: [], total: 0 };
  const rows = (sheet || []).map((r) => (Array.isArray(r) ? r : []));

  if (rows.length === 0 || isBlankRow(rows[0])) {
    result.fileProblems.push('The file is empty. The first row must hold the column headings, such as item_code and item_name.');
    return result;
  }

  const headings = rows[0].map((h) => String(h ?? '').trim());
  result.headings = headings;
  const { columns, unknown } = mapHeadings(headings);
  result.unknownColumns = unknown;

  const missing = ['item_code', 'item_name'].filter((f) => columns[f] === undefined);
  if (missing.length) {
    result.fileProblems.push(
      `The first row must contain ${missing.map((m) => `"${m}"`).join(' and ')}. We found: ${headings.filter(Boolean).join(', ') || 'no headings'}. Download the template to see the layout.`
    );
    return result;
  }

  const body = rows.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 })).filter((r) => !isBlankRow(r.cells));
  result.total = body.length;

  if (body.length === 0) {
    result.fileProblems.push('The file has headings but no products under them.');
    return result;
  }
  if (body.length > MAX_ROWS) {
    result.fileProblems.push(`The file has ${body.length} products. Please split it into files of ${MAX_ROWS} or fewer and import them one after the other.`);
    return result;
  }

  const get = (cells, field) => (columns[field] === undefined ? '' : String(cells[columns[field]] ?? '').trim());
  const seenCodes = new Map(); // lower-case code -> first row number

  body.forEach(({ cells, rowNumber }) => {
    const problems = [];
    const itemCode = get(cells, 'item_code');
    const itemName = get(cells, 'item_name');

    // A row with more filled cells than there are headings almost always means an unquoted comma
    const lastFilled = cells.reduce((last, c, i) => (String(c ?? '').trim() !== '' ? i : last), -1);
    if (lastFilled >= headings.length) {
      problems.push('This row has more columns than the headings. If a name or price contains a comma, put it in quotation marks, for example "Burger, Cheese".');
    }

    if (!itemCode) problems.push('Item code is empty.');
    else if (itemCode.length > MAX_TEXT) problems.push(`Item code is longer than ${MAX_TEXT} characters.`);
    if (!itemName) problems.push('Item name is empty.');
    else if (itemName.length > MAX_TEXT) problems.push(`Item name is longer than ${MAX_TEXT} characters.`);

    if (itemCode) {
      const key = itemCode.toLowerCase();
      if (seenCodes.has(key)) problems.push(`Item code "${itemCode}" was already used on row ${seenCodes.get(key)}.`);
      else seenCodes.set(key, rowNumber);
    }

    const warnings = [];
    let price = 0;
    const rawPrice = get(cells, 'standard_rate');
    if (rawPrice === '') {
      warnings.push('No price given, so it will be saved with a price of 0. Set it before selling.');
    } else {
      const parsed = parseAmount(rawPrice);
      if (parsed === null) problems.push(`Price "${rawPrice}" is not a number.`);
      else if (parsed < 0) problems.push('Price cannot be negative.');
      else price = parsed;
    }

    const flags = {};
    [['is_stock_item', true], ['is_sales_item', true], ['is_purchase_item', false]].forEach(([field, fallback]) => {
      const flag = parseFlag(get(cells, field));
      if (flag === null) problems.push(`${field} must be yes/no, 1/0 or true/false (found "${get(cells, field)}").`);
      flags[field] = flag === undefined || flag === null ? fallback : flag;
    });

    if (problems.length) {
      result.invalid.push({ rowNumber, itemCode, itemName, problems, cells });
      return;
    }

    result.valid.push({
      rowNumber,
      product: {
        item_code: itemCode,
        item_name: itemName,
        item_group: get(cells, 'item_group'),
        stock_uom: get(cells, 'stock_uom') || 'Nos',
        standard_rate: price,
        description: get(cells, 'description'),
        is_stock_item: flags.is_stock_item,
        is_sales_item: flags.is_sales_item,
        is_purchase_item: flags.is_purchase_item,
        brand: get(cells, 'brand'),
        barcode: get(cells, 'barcode'),
      },
    });
    warnings.forEach((message) => result.warnings.push({ rowNumber, itemCode, message }));
  });

  return result;
};

/** Text of a CSV listing the rows that could not be imported, with the reason, so they can be fixed and sent again */
export const problemRowsCsv = (check) => {
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [...check.headings, 'problem'].map(quote).join(',');
  const lines = check.invalid.map((r) => {
    const padded = check.headings.map((_, i) => r.cells[i] ?? '');
    return [...padded, r.problems.join(' ')].map(quote).join(',');
  });
  return [header, ...lines].join('\r\n');
};

// ---------------------------------------------------------------- server reply

const count = (value) => (Array.isArray(value) ? value.length : Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null);

const firstDefined = (...values) => values.find((v) => v !== undefined && v !== null);

const describeFailure = (f) => {
  if (typeof f === 'string') return f;
  if (!f || typeof f !== 'object') return 'A product could not be saved.';
  const who = f.item_name || f.item_code || f.name || f.code || 'A product';
  const why = f.error_message || f.error || f.message || f.reason;
  return why ? `${who}: ${String(why).replace(/\.$/, '')}` : who;
};

/**
 * Describes the server's reply in plain words. The reply format is not fixed
 * (older and newer servers name the counts differently), so this looks for the
 * usual names and says only what it can actually see. It never claims more
 * products were saved than the server reported.
 *
 * Returns { created, skipped, failed, failures[], serverMessage, reference, problems, text }
 * where created/skipped/failed are numbers, or null when the server did not say.
 */
export const summarizeBulkCreate = (data, sent, wording = {}) => {
  const { noun = 'product', verb = 'saved', where = 'the product list', skippedText } = wording;
  const reply = data && typeof data === 'object' ? data : {};
  const created = count(firstDefined(reply.created, reply.created_count, reply.success_count, reply.items_created));
  const skipped = count(firstDefined(reply.skipped, reply.skipped_count, reply.items_skipped, reply.existing));
  const failureList = [reply.failed, reply.failed_items, reply.items_failed, reply.errors].find(Array.isArray) || [];
  const failed = failureList.length || count(firstDefined(reply.failed, reply.failed_count, reply.error_count)) || 0;
  const serverMessage = typeof reply.message === 'string' ? reply.message : typeof data === 'string' ? data : '';
  const failures = failureList.map(describeFailure);
  // Some servers also name the document they created (a stock entry, for example)
  const reference = [reply.stock_entry_name, reply.stock_entry, reply.reference].find((v) => typeof v === 'string' && v) || reply.stock_entry?.name || '';
  const plural = (n) => `${noun}${n === 1 ? '' : 's'}`;

  const parts = [];
  if (created !== null) parts.push(`${created} ${plural(created)} ${verb}.`);
  if (skipped) parts.push(skippedText ? skippedText(skipped) : `${skipped} already existed, so ${skipped === 1 ? 'it was' : 'they were'} left as is.`);
  if (failed) parts.push(`${failed} could not be ${verb}.`);
  if (parts.length === 0) parts.push(serverMessage || `${sent} ${plural(sent)} sent. The server did not say how many were ${verb}, so check ${where}.`);

  const problems = !!failed || (created !== null && created === 0 && !skipped);
  return { created, skipped, failed, failures, serverMessage, reference, problems, text: parts.join(' ') };
};
