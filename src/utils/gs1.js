/**
 * Reading the GS1 2D code printed on medicine packs (a DataMatrix, as Kenya's track-and-trace rules require).
 *
 * The code holds several fields, each starting with a two-digit Application Identifier:
 *   01  the product number (GTIN, 14 digits)       17  the expiry date (YYMMDD; DD 00 means the end of the month)
 *   10  the batch (lot) number, up to 20 characters 21  the pack's serial number, up to 20 characters
 * A field of variable length (10, 21) ends at a group separator character, or at the end of the code. Scanners that type
 * into the browser often drop that separator, so a batch followed by "17YYMMDD" is split on the date when it is real.
 * Scanners may also send the code as "(01)...(17)...", or with a "]d2" prefix: both are read.
 *
 * Plain logic, tested on its own.
 */

const GS = '\u001d';
const FIXED = { '01': 14, 11: 6, 15: 6, 17: 6 };
const VARIABLE = { 10: 20, 21: 20 };

const pad = (n) => String(n).padStart(2, '0');

/** "270331" → "2027-03-31"; "270300" → "2027-03-31" (the last day of the month); null when not a real date */
export const expiryFromYymmdd = (text) => {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(text || '');
  if (!m) return null;
  const year = 2000 + Number(m[1]);
  const month = Number(m[2]);
  let day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  const last = new Date(year, month, 0).getDate();
  if (day === 0) day = last;
  if (day > last) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
};

const fromParentheses = (text) => {
  const out = {};
  const re = /\((\d{2})\)([^(]*)/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].trim();
  return out;
};

const fromRaw = (text) => {
  const out = {};
  let i = 0;
  while (i < text.length) {
    if (text[i] === GS) {
      i += 1;
      continue;
    }
    const ai = text.slice(i, i + 2);
    i += 2;
    if (FIXED[ai]) {
      out[ai] = text.slice(i, i + FIXED[ai]);
      i += FIXED[ai];
    } else if (VARIABLE[ai]) {
      const stop = text.indexOf(GS, i);
      let value = stop === -1 ? text.slice(i) : text.slice(i, stop);
      i = stop === -1 ? text.length : stop + 1;
      // No separator: an expiry date may have been typed straight after the batch
      if (stop === -1 && !out['17']) {
        const tail = /17(\d{6})$/.exec(value);
        if (tail && value.length > 8 && expiryFromYymmdd(tail[1])) {
          out['17'] = tail[1];
          value = value.slice(0, -8);
        }
      }
      out[ai] = value.slice(0, VARIABLE[ai]);
    } else {
      return null; // a field this reader does not know: not a code it can trust
    }
  }
  return out;
};

/**
 * The pack's fields: { gtin, expiry (yyyy-mm-dd or null), batch, serial }, or null when the text is not a GS1 code that
 * starts with a product number. Ordinary barcodes (EAN-13 and the like) give null, so they are matched as before.
 */
export const parseGs1 = (raw) => {
  let text = String(raw || '').replace(/<GS>/gi, GS).trim();
  text = text.replace(/^\][A-Za-z]\d/, ''); // the symbology prefix some scanners add (]d2, ]Q3, ]C1)
  if (!text) return null;
  const fields = text.startsWith('(') ? fromParentheses(text) : /^01\d{14}/.test(text) && text.length > 16 ? fromRaw(text) : null;
  if (!fields || !/^\d{14}$/.test(fields['01'] || '')) return null;
  return {
    gtin: fields['01'],
    expiry: fields['17'] ? expiryFromYymmdd(fields['17']) : null,
    batch: fields['10'] || '',
    serial: fields['21'] || '',
  };
};

/** Whether a barcode kept on a product is the same product number as a GTIN (leading zeros ignored: EAN-13 = GTIN-14) */
export const sameGtin = (barcode, gtin) => {
  const a = String(barcode || '').trim().replace(/^0+/, '');
  const b = String(gtin || '').trim().replace(/^0+/, '');
  return Boolean(a) && /^\d+$/.test(a) && a === b;
};

/** Whether a pack has expired on the day given (yyyy-mm-dd strings compare as dates) */
export const isExpired = (expiry, todayIso) => Boolean(expiry) && expiry < todayIso;
