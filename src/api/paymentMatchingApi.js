import { callServer } from './serverCall';

/**
 * Payment matching: bring in the M-Pesa statement and see which payments do not match it.
 * The server matches each paid-in line to the sale that holds its M-Pesa receipt number.
 */

const MATCHING = 'murzak_pos.api.payment_matching_api';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const setupPaymentMatching = (company) =>
  callServer(`${MATCHING}.setup_payment_clearing`, { company }, { fallback: 'Payment matching could not be set up.' });

export const importStatement = async (company, csvText) => {
  const body = await callServer(`${MATCHING}.import_mpesa_statement`, { company, csv_text: csvText }, {
    fallback: 'The statement could not be imported.',
  });
  return body.data || {};
};

export const matchStatement = async (company) => {
  const body = await callServer(`${MATCHING}.match_mpesa_statement`, { company }, { fallback: 'The statement could not be matched.' });
  return body.data || {};
};

export const getExceptions = async (company, days) => {
  const body = await callServer(`${MATCHING}.get_payment_exceptions`, { company, days }, {
    get: true,
    fallback: 'The list of payments that do not match could not be loaded.',
  });
  return body.data?.data || [];
};

/** One plain sentence about what an import did. */
export const importSummary = (result) => {
  const parts = [`${result.imported || 0} statement lines added`];
  if (result.already_imported) parts.push(`${result.already_imported} were already there`);
  if (result.repeated_in_file) parts.push(`${result.repeated_in_file} repeated in the file`);
  if (result.not_completed) parts.push(`${result.not_completed} not completed (left out)`);
  const m = result.matching || {};
  parts.push(`${m.reconciled || 0} matched to a sale`);
  if (m.left) parts.push(`${m.left} could not be matched`);
  if (m.failed) parts.push(`${m.failed} failed and need attention`);
  return `${parts.join(', ')}.`;
};

/** Why a file cannot be sent, or '' when it can. */
export const fileProblem = (file) => {
  if (!file) return 'Choose the statement file first.';
  if (file.size > MAX_FILE_BYTES) return 'This file is too large. Download the statement for a shorter period.';
  if (file.name && !/\.(csv|txt)$/i.test(file.name)) return 'Choose the CSV file downloaded from the M-Pesa portal.';
  return '';
};
