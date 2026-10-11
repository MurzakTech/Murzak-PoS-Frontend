/**
 * Prescription-only medicines. A product marked prescription-only needs a patient and a prescriber on the
 * sale, which the server also checks and writes on the invoice. Plain logic, tested on its own.
 */

const text = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** A cart line or product that is marked prescription-only (the flag arrives as 1/0 or true/false) */
export const isPrescriptionOnly = (item) => Boolean(item) && (item.prescription_only === true || item.prescription_only === 1 || item.custom_prescription_only === 1 || item.custom_prescription_only === true);

/** The names of the prescription-only items in a cart, each once */
export const prescriptionItems = (cart) => [...new Set((cart || []).filter(isPrescriptionOnly).map((l) => l.item_name || l.item_code))];

/** The dispensing record tidied: patient, prescriber and an optional prescription reference */
export const cleanDispensing = (raw) => ({
  patient: text(raw && raw.patient).slice(0, 140),
  prescriber: text(raw && raw.prescriber).slice(0, 140),
  reference: text(raw && raw.reference).slice(0, 60),
});

/** A prescription sale needs at least who it is for and who prescribed it */
export const isDispensingComplete = (raw) => {
  const d = cleanDispensing(raw);
  return Boolean(d.patient && d.prescriber);
};
