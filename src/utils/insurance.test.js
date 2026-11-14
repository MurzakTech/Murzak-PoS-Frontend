import { copayFor, insuranceLines, insurancePayload, isInsuranceComplete } from './insurance';

const AAR = { name: 'AAR', copay_percent: 10, copay_amount: 200, customer: 'AAR Insurance' };

test('the co-payment is the larger of the percent and the amount, never more than the bill', () => {
  expect(copayFor(AAR, 5000)).toBe(500);
  expect(copayFor(AAR, 1000)).toBe(200);
  expect(copayFor(AAR, 150)).toBe(150);
  expect(copayFor({ copay_percent: 0, copay_amount: 0 }, 900)).toBe(0);
});

test('the bill splits into the co-payment and the rest on credit to the insurer', () => {
  expect(insuranceLines(AAR, 5000, 'M-Pesa')).toEqual([
    { mode: 'M-Pesa', amount: 500 },
    { mode: 'Credit', amount: 4500 },
  ]);
  expect(insuranceLines({ copay_percent: 0, copay_amount: 0 }, 900)).toEqual([{ mode: 'Credit', amount: 900 }]);
  expect(insuranceLines(AAR, 150)).toEqual([{ mode: 'Cash', amount: 150 }]);
});

test('a claim needs the insurer, the patient and the member number', () => {
  expect(isInsuranceComplete({ insurer: 'AAR', patient: 'Wanjiru', member_no: 'A-1' })).toBe(true);
  expect(isInsuranceComplete({ insurer: 'AAR', patient: ' ', member_no: 'A-1' })).toBe(false);
  expect(isInsuranceComplete(null)).toBe(false);
  expect(insurancePayload({ insurer: 'AAR', customer: 'X', rule: AAR, patient: ' Wanjiru ', member_no: 'A-1' })).toEqual({
    insurer: 'AAR',
    patient: 'Wanjiru',
    member_no: 'A-1',
    scheme: '',
    preauth: '',
  });
});
