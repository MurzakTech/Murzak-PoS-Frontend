/**
 * Medical insurance at a pharmacy till: what the patient pays now (the co-payment) and what the insurer owes.
 * The server (insurance_rules.py) uses the same rule and keeps the co-payment as what was actually paid.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** The patient's co-payment: the larger of the insurer's percent and its fixed amount, never more than the bill */
export const copayFor = (insurer, total) => {
  const bill = Math.max(Number(total) || 0, 0);
  if (!insurer) return bill;
  const percent = (bill * (Number(insurer.copay_percent) || 0)) / 100;
  return round2(Math.min(bill, Math.max(percent, Number(insurer.copay_amount) || 0)));
};

/**
 * The payment lines that split a bill between the patient and the insurer: the co-payment by the mode chosen (left out
 * when there is none) and the rest on credit to the insurer.
 */
export const insuranceLines = (insurer, total, mode = 'Cash') => {
  const copay = copayFor(insurer, total);
  const rest = round2(Math.max((Number(total) || 0) - copay, 0));
  const lines = [];
  if (copay > 0) lines.push({ mode, amount: copay });
  if (rest > 0) lines.push({ mode: 'Credit', amount: rest });
  return lines.length ? lines : [{ mode, amount: 0 }];
};

/** Whether the insurance details are enough to claim: the insurer, the patient's name and the member number */
export const isInsuranceComplete = (record) => Boolean(record && record.insurer && String(record.patient || '').trim() && String(record.member_no || '').trim());

/** The insurance details as the server takes them with the sale */
export const insurancePayload = (record) =>
  record
    ? {
        insurer: record.insurer,
        patient: String(record.patient || '').trim(),
        member_no: String(record.member_no || '').trim(),
        scheme: String(record.scheme || '').trim(),
        preauth: String(record.preauth || '').trim(),
      }
    : null;
