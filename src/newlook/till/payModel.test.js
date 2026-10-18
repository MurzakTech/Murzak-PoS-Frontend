/**
 * Pay screen decisions (P3-2, P3-3): the choices, the quick-cash buttons, the Change line and the M-Pesa code check.
 */
import { CHOICE_ORDER, NOTES, MAX_QUICK_BUTTONS, bufferAmount, changeState, checkCode, choiceOf, cleanCode, cleanDecimal, formatBuffer, groupChoices, isMpesaMode, linesNeedingCode, manualGateway, modeForChoice, modeName, mpesaCodeState, nextBuffer, quickCash } from './payModel';

const values = (total) => quickCash(total).map((q) => q.value);

describe('the five choices', () => {
  test('are ordered Cash, M-Pesa, Card, On credit, Other', () => {
    expect(CHOICE_ORDER).toEqual(['cash', 'mpesa', 'card', 'credit', 'other']);
  });

  test('every Mode of Payment name lands in the right choice', () => {
    expect(['Cash', 'Mpesa', 'M-Pesa', 'MPESA', 'Credit Card', 'Card', 'Credit', 'Bank Draft', 'Cheque', 'Wire Transfer', 'Pesapal'].map(choiceOf)).toEqual([
      'cash', 'mpesa', 'mpesa', 'mpesa', 'card', 'card', 'credit', 'other', 'other', 'other', 'other',
    ]);
  });

  test('groups in order whatever the order of the modes', () => {
    const groups = groupChoices(['Credit', 'Bank Draft', 'Mpesa', 'Cash', 'Credit Card', 'Cheque']);
    expect(groups.map((g) => g.key)).toEqual(['cash', 'mpesa', 'card', 'credit', 'other']);
    expect(groups.find((g) => g.key === 'other').modes).toEqual(['Bank Draft', 'Cheque']);
  });

  test('shows only the choices that have a mode', () => {
    expect(groupChoices(['Cash', 'Mpesa']).map((g) => g.key)).toEqual(['cash', 'mpesa']);
    expect(groupChoices([])).toEqual([]);
    expect(groupChoices(undefined)).toEqual([]);
  });

  test('ignores blanks and repeats', () => {
    expect(groupChoices(['Cash', 'Cash', '', null, '  ']).map((g) => g.modes)).toEqual([['Cash']]);
  });

  test('picking a choice keeps the mode already chosen when it belongs to it, else uses the first', () => {
    const other = groupChoices(['Bank Draft', 'Cheque'])[0];
    expect(modeForChoice(other, 'Cheque')).toBe('Cheque');
    expect(modeForChoice(other, 'Cash')).toBe('Bank Draft');
  });

  test('knows an M-Pesa mode', () => {
    expect(isMpesaMode('Mpesa')).toBe(true);
    expect(isMpesaMode('Cash')).toBe(false);
  });

  test('mode names: Credit reads On credit, Mpesa reads M-Pesa, Credit Card reads Card, the owner\'s own names stay', () => {
    const words = { credit: 'On credit', mpesa: 'M-Pesa' };
    expect(modeName('Credit', [], words)).toBe('On credit');
    expect(modeName('Mpesa', [], words)).toBe('M-Pesa');
    expect(modeName('Credit Card', [], words)).toBe('Card');
    expect(modeName('Savings Group', [], words)).toBe('Savings Group');
  });

  test('two modes that would read the same show their real names', () => {
    const all = ['Bank Draft', 'Cheque'];
    expect(modeName('Bank Draft', all, {})).toBe('Bank Draft');
    expect(modeName('Cheque', all, {})).toBe('Cheque');
    expect(modeName('Bank Draft', ['Bank Draft'], {})).toBe('Other');
  });
});

describe('quick cash', () => {
  test('the notes go up to 2,000', () => {
    expect(NOTES).toEqual([50, 100, 200, 500, 1000, 2000]);
  });

  test('always has Exact first and always includes 2,000, even for a small total', () => {
    [35, 350, 1284, 1999, 2000].forEach((total) => {
      const q = quickCash(total);
      expect(q[0]).toEqual({ kind: 'exact', value: total });
      expect(q.map((b) => b.value)).toContain(2000);
    });
  });

  test('a small total offers every note that covers it', () => {
    expect(values(35)).toEqual([35, 50, 100, 200, 500, 1000, 2000]);
    expect(values(120)).toEqual([120, 150, 200, 500, 1000, 2000]);
  });

  test('round-ups of the old panel are kept: 1,284 offers 1,300 and 1,500', () => {
    expect(values(1284)).toEqual([1284, 1300, 1500, 2000]);
  });

  test('a total above 2,000 still offers 2,000 and the next round-ups', () => {
    expect(values(2350)).toEqual([2350, 2000, 2400, 2500, 3000]);
  });

  test('a total of zero offers only 2,000, and a negative one the same', () => {
    expect(quickCash(0)).toEqual([{ kind: 'amount', value: 2000 }]);
    expect(quickCash(-5)).toEqual([{ kind: 'amount', value: 2000 }]);
  });

  test('never offers more than the maximum, and never the same value twice', () => {
    [1, 49, 51, 99, 101, 777, 1500, 1999.5, 2001, 12345.67].forEach((total) => {
      const v = values(total);
      expect(v.length).toBeLessThanOrEqual(MAX_QUICK_BUTTONS);
      expect(new Set(v).size).toBe(v.length);
    });
  });

  test('cents are kept on Exact', () => {
    expect(quickCash(1284.5)[0]).toEqual({ kind: 'exact', value: 1284.5 });
  });
});

describe('number pad buffer', () => {
  test('digits, point, back and clear', () => {
    expect(nextBuffer('', '5')).toBe('5');
    expect(nextBuffer('5', '00')).toBe('500');
    expect(nextBuffer('', '0')).toBe('0');
    expect(nextBuffer('0', '7')).toBe('7');
    expect(nextBuffer('', '.')).toBe('0.');
    expect(nextBuffer('1.5', '.')).toBe('1.5');
    expect(nextBuffer('1.5', '00')).toBe('1.50');
    expect(nextBuffer('1.50', '3')).toBe('1.50');
    expect(nextBuffer('123', 'back')).toBe('12');
    expect(nextBuffer('123', 'clear')).toBe('');
  });

  test('stops at nine digits', () => {
    expect(nextBuffer('123456789', '1')).toBe('123456789');
  });

  test('amount and display', () => {
    expect(bufferAmount('')).toBe(0);
    expect(bufferAmount('12.5')).toBe(12.5);
    expect(formatBuffer('1250')).toBe('1,250');
    expect(formatBuffer('1250.')).toBe('1,250.');
    expect(formatBuffer('1250.5')).toBe('1,250.5');
    expect(formatBuffer('')).toBe('');
  });

  test('decimal fields keep digits and one point with two decimals', () => {
    expect(cleanDecimal('12a.345.6')).toBe('12.34');
    expect(cleanDecimal('')).toBe('');
    expect(cleanDecimal('1,000')).toBe('1000');
  });
});

describe('the Change line', () => {
  test('idle, short, give, exact', () => {
    expect(changeState(350, 0)).toEqual({ state: 'idle', change: 0, short: 0 });
    expect(changeState(350, 200)).toEqual({ state: 'short', change: 0, short: 150 });
    expect(changeState(350, 1000)).toEqual({ state: 'give', change: 650, short: 0 });
    expect(changeState(350, 350)).toEqual({ state: 'exact', change: 0, short: 0 });
  });

  test('floating point noise does not make a short', () => {
    expect(changeState(0.3, 0.1 + 0.2).state).toBe('exact');
  });
});

describe('M-Pesa confirmation code', () => {
  test('is made capitals with no spaces', () => {
    expect(cleanCode(' qgh7 xj2k 9l ')).toBe('QGH7XJ2K9L');
    expect(cleanCode(undefined)).toBe('');
  });

  test('blank is blank', () => {
    expect(checkCode('')).toEqual({ valid: false, code: '', problem: 'blank' });
    expect(checkCode('   ').problem).toBe('blank');
  });

  test('8 to 12 letters and numbers are good', () => {
    ['QGH7XJ2K', 'QGH7XJ2K9L', 'QGH7XJ2K9L12', 'qgh7xj2k9l'].forEach((c) => expect(checkCode(c).valid).toBe(true));
    expect(checkCode('qgh7 xj2k 9l').code).toBe('QGH7XJ2K9L');
  });

  test('too short, too long, and other characters are named', () => {
    expect(checkCode('QGH7XJ2').problem).toBe('short');
    expect(checkCode('QGH7XJ2K9L123').problem).toBe('long');
    expect(checkCode('QGH7-XJ2K9L').problem).toBe('chars');
    expect(checkCode('QGH7XJ2K9L!').valid).toBe(false);
  });

  test('the saved value is the one the checkout reads', () => {
    expect(manualGateway('QGH7XJ2K9L', 'M-Pesa')).toEqual({ confirmed: true, reference: 'QGH7XJ2K9L', label: 'M-Pesa', manual: true });
  });

  test('a payment the gateway confirmed counts as done and shows its reference', () => {
    expect(mpesaCodeState({ confirmed: true, reference: 'ABC12345XY', transactionId: 't1' }, '')).toEqual({ valid: true, code: 'ABC12345XY', problem: null, fromGateway: true });
    expect(mpesaCodeState({ confirmed: true, transactionId: 't1' }, '').valid).toBe(true);
  });

  test('a code typed by hand is judged by what was typed', () => {
    expect(mpesaCodeState({ confirmed: true, reference: 'QGH7XJ2K9L', manual: true }, '').valid).toBe(false);
    expect(mpesaCodeState(undefined, 'QGH7XJ2K9L').valid).toBe(true);
  });

  test('lines that still need a code: M-Pesa, amount above zero, no good code', () => {
    const lines = [
      { mode: 'Cash', amount: 100 },
      { mode: 'Mpesa', amount: 200 },
      { mode: 'Mpesa', amount: 0 },
      { mode: 'Mpesa', amount: 50, gateway: { confirmed: true, reference: 'ABC12345XY' } },
      { mode: 'Mpesa', amount: 70 },
    ];
    expect(linesNeedingCode(lines, { 1: 'short', 4: 'QGH7XJ2K9L' })).toEqual([1]);
    expect(linesNeedingCode(lines, {})).toEqual([1, 4]);
  });
});
