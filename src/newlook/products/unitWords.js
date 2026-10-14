import T from './strings.products';

/**
 * Units in plain words (ticket P4-2). The shop stores a unit under its ERPNext name ("Nos", "Kg", "Ltr", "Box"); a person
 * reads "pieces", "kilograms", "litres", "boxes". A unit with no plain word is shown exactly as it is stored, so nothing
 * is ever hidden or guessed. The words are in strings.products.js (units); the rename map says "Nos" reads "piece".
 */
const find = (uom) => {
  const key = String(uom === null || uom === undefined ? '' : uom).trim().toLowerCase();
  return key && Object.prototype.hasOwnProperty.call(T.units, key) ? T.units[key] : null;
};

const as = (uom) => String(uom === null || uom === undefined ? '' : uom).trim();

/** The plain word for many: unitWords('Nos') gives 'pieces', unitWords('Kg') 'kilograms'. Unknown units come back as stored; nothing gives ''. */
export const unitWords = (uom) => {
  const found = find(uom);
  return found ? found[1] : as(uom);
};

/** The plain word for one: unitWord('Nos') gives 'piece' */
export const unitWord = (uom) => {
  const found = find(uom);
  return found ? found[0] : as(uom);
};

/** Capitalised for a list of choices: unitLabel('Box') gives 'Boxes' */
export const unitLabel = (uom) => {
  const text = unitWords(uom);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

/** A quantity with its unit in words: quantityText(1, 'Nos') gives '1 piece'; quantityText(12, 'Nos') '12 pieces'; quantityText(2.5, 'Kg') '2.5 kilograms' */
export const quantityText = (qty, uom) => {
  if (qty === null || qty === undefined || qty === '' || Number.isNaN(Number(qty))) return '';
  const n = Number(qty);
  const shown = n.toLocaleString('en-US', { maximumFractionDigits: 3 });
  const words = Math.abs(n) === 1 ? unitWord(uom) : unitWords(uom);
  return words ? `${shown} ${words}` : shown;
};

/** Is there a plain word for this unit? */
export const hasUnitWords = (uom) => find(uom) !== null;
