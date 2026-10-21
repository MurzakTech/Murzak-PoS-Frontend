import { callServer } from './serverCall';

/**
 * Frappe Health / Pharmacy Integration API for Murzak POS
 *
 * Connects Murzak POS to Frappe Health (frappe/healthcare domain) DocTypes:
 * - Patient (linked to Customer) & Medical Record
 * - Patient Encounter & Drug Prescription
 * - FEFO (First-Expiry, First-Out) Serial & Batch tracking
 * - Controlled Substances & Statutory Poison Dispensing Register (Kenya PPB compliance)
 */

const HEALTH = 'murzak_pos.api.pharmacy_health_api';

/**
 * Look up a patient by phone number, National ID, or name.
 * Returns Patient details along with linked ERPNext Customer and documented drug allergies.
 *
 * @param {Object} params
 * @param {string} params.term - Phone, National ID, or Patient name
 * @param {string} [params.company]
 */
export const lookupPatient = async ({ term, company } = {}) => {
  const reply = await callServer(
    `${HEALTH}.lookup_patient`,
    { term, company },
    { get: true, fallback: 'Could not find patient record.' }
  );
  return reply.data || reply;
};

/**
 * Search patients by name, phone, or ID.
 */
export const searchPatients = async (query) => {
  const term = typeof query === 'string' ? query : query?.term || '';
  const reply = await lookupPatient({ term });
  return Array.isArray(reply) ? reply : reply ? [reply] : [];
};

/**
 * Get active, pending prescriptions for a patient.
 *
 * Each prescription line includes drug code, dosage, frequency, duration,
 * units remaining to be dispensed, and prescribing practitioner.
 *
 * @param {Object} params
 * @param {string} [params.patient_id]
 * @param {string} [params.phone]
 * @param {string} [params.status='Pending'] - 'Pending' | 'Partially Dispensed' | 'Completed'
 */
export const getPatientPrescriptions = async ({ patient_id, phone, status = 'Pending' } = {}) => {
  const reply = await callServer(
    `${HEALTH}.get_prescriptions`,
    { patient_id, phone, status },
    { get: true, fallback: 'Could not load patient prescriptions.' }
  );
  return reply.data || [];
};

/**
 * Fetch available stock batches for a medicine sorted by FEFO (First-Expiry First-Out).
 * Expired batches are automatically flagged to block sale.
 *
 * @param {Object} params
 * @param {string} params.item_code
 * @param {string} [params.warehouse]
 */
export const getItemBatches = async ({ item_code, warehouse } = {}) => {
  const reply = await callServer(
    `${HEALTH}.get_item_batches`,
    { item_code, warehouse },
    { get: true, fallback: 'Could not load medicine batches.' }
  );
  return reply.data || [];
};

/**
 * Fetch available batches for a drug item sorted by FEFO (First-Expiry, First-Out).
 */
export const getBatchesFEFO = async (itemCodeOrObj, maybeWarehouse) => {
  const item_code = typeof itemCodeOrObj === 'string' ? itemCodeOrObj : itemCodeOrObj?.item_code;
  const warehouse = typeof itemCodeOrObj === 'string' ? maybeWarehouse : itemCodeOrObj?.warehouse;
  return getItemBatches({ item_code, warehouse });
};

/**
 * Clinical safety pre-check before completing sale:
 * Checks for:
 * 1. Documented patient drug allergies against cart items
 * 2. Unprescribed prescription-only or controlled medicines in cart
 * 3. Expired batches
 *
 * @param {Object} data
 * @param {string} data.patient_id
 * @param {Array<Object>} data.cart_items
 */
export const validateClinicalSafety = async ({ patient_id, cart_items } = {}) => {
  const reply = await callServer(
    `${HEALTH}.validate_clinical_safety`,
    { patient_id, cart_items },
    { fallback: 'Clinical validation could not be completed.' }
  );
  return reply.data || reply;
};

/**
 * Record a finalized dispensing log entry into the Pharmacy Dispensing Register
 * (Kenya Pharmacy and Poisons Board statutory register compliant).
 *
 * @param {Object} data
 * @param {string} data.company
 * @param {string} data.invoice_id - POS Invoice ID
 * @param {string} data.patient_id
 * @param {string} data.patient_name
 * @param {string} data.prescriber_name - Doctor / Practitioner
 * @param {string} [data.prescriber_reg_no] - Medical Council Registration Number
 * @param {string} [data.prescription_ref] - Prescription slip number / barcode
 * @param {string} data.dispensing_pharmacist - User / Pharmacist who dispensed
 * @param {Array<Object>} data.items - Dispensed drug lines with batch numbers and quantities
 */
export const recordDispense = async (data) => {
  const reply = await callServer(
    `${HEALTH}.record_dispense`,
    data,
    { fallback: 'Could not record dispensing in register.' }
  );
  return reply.data || reply;
};

/**
 * Export or view the Statutory Dispensing Register for a date range and poison schedule.
 *
 * @param {Object} params
 * @param {string} params.company
 * @param {string} params.from_date - YYYY-MM-DD
 * @param {string} params.to_date - YYYY-MM-DD
 * @param {string} [params.poison_schedule] - 'All' | 'Part 1 Poison' | 'Part 2 Poison' | 'Controlled'
 */
export const getDispensingRegister = async ({ company, from_date, to_date, poison_schedule } = {}) => {
  const reply = await callServer(
    `${HEALTH}.get_dispensing_register`,
    { company, from_date, to_date, poison_schedule },
    { get: true, fallback: 'Could not load dispensing register.' }
  );
  return reply.data || [];
};


/**
 * Cross-references patient allergy profile against prescription medication lines.
 *
 * @param {Object} params
 * @param {Array<string|Object>} params.patientAllergies
 * @param {Array<Object>} params.prescriptionItems
 * @returns {{ safe: boolean, warnings: Array<Object> }}
 */
export const validatePrescriptionSafety = ({ patientAllergies = [], prescriptionItems = [] } = {}) => {
  const warnings = [];
  const normalizedAllergies = patientAllergies
    .map((a) => (typeof a === 'string' ? a : a.allergy || a.substance || '').trim())
    .filter(Boolean);

  for (const item of prescriptionItems) {
    const drugName = item.drug_name || item.item_name || item.item_code || '';
    const lowerDrug = drugName.toLowerCase();

    for (const allergen of normalizedAllergies) {
      const lowerAllergen = allergen.toLowerCase();
      const isMatch =
        lowerDrug.includes(lowerAllergen) ||
        (lowerAllergen.includes('penicillin') &&
          (lowerDrug.includes('amox') || lowerDrug.includes('ampic') || lowerDrug.includes('penic')));

      if (isMatch) {
        warnings.push({
          drug: drugName,
          allergen,
          severity: 'critical',
          message: `Patient has recorded allergy to ${allergen}. Prescribed ${drugName} may trigger an adverse reaction!`,
        });
      }
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
};
