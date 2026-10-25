import { DEFAULT_KIND, KINDS, entryFor, firstReason, hasAmount, movementLine, newClientId, problemWith, reasonOptions, reasonWord, reasonsFor, savedMessage, totalLines } from './cashModel';

describe('the kinds and their reasons', () => {
  test('taking cash out is the usual thing, so it comes first and is the default', () => {
    expect(KINDS[0]).toBe('Paid Out');
    expect(DEFAULT_KIND).toBe('Paid Out');
  });

  test('the server list of reasons is used when it sent one', () => {
    expect(reasonsFor('Paid In', { 'Paid In': ['A', 'B'] })).toEqual(['A', 'B']);
    expect(firstReason('Paid In', { 'Paid In': ['A', 'B'] })).toBe('A');
  });

  test('the usual reasons are used before the server has answered', () => {
    expect(reasonsFor('Safe Drop', null)).toEqual(['Bank deposit', 'Other']);
    expect(reasonsFor('Paid Out', {})[0]).toBe('Petty cash');
    expect(reasonsFor('Surprise', null)).toEqual([]);
  });

  test('a reason is shown in words, and one this version does not know is shown as the server wrote it', () => {
    expect(reasonWord('Customer refund')).toBe('Customer refund');
    expect(reasonWord('Something new')).toBe('Something new');
    expect(reasonOptions('Safe Drop', null)).toEqual([
      { value: 'Bank deposit', label: 'Bank deposit' },
      { value: 'Other', label: 'Other' },
    ]);
  });
});

describe('what can be saved', () => {
  test('an amount is whole shillings above zero', () => {
    expect(hasAmount('300')).toBe(true);
    for (const bad of ['', '0', '00', '12.5', '-4', 'abc', null, undefined]) expect(hasAmount(bad)).toBe(false);
  });

  test('a mistake is said in words, and a good entry has none', () => {
    expect(problemWith({ digits: '', reason: 'Petty cash', note: '' })).toMatch(/amount/i);
    expect(problemWith({ digits: '50', reason: 'Other', note: ' ' })).toMatch(/what the money was for/i);
    expect(problemWith({ digits: '50', reason: 'Other', note: 'Taxi' })).toBe('');
    expect(problemWith({ digits: '50', reason: 'Petty cash', note: '' })).toBe('');
  });

  test('what goes to the server is a number, a trimmed note and the till reference', () => {
    expect(entryFor({ session: 'S', kind: 'Paid In', digits: '1000', reason: 'Float top-up', note: '  extra  ', clientId: 'c' })).toEqual({
      session: 'S',
      kind: 'Paid In',
      amount: 1000,
      reason: 'Float top-up',
      note: 'extra',
      clientId: 'c',
    });
  });

  test('every new movement gets its own till reference, a plain one', () => {
    const a = newClientId();
    const b = newClientId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9._:-]{1,64}$/);
  });
});

describe('the words that come back', () => {
  test('a recorded movement reads as a line with its note', () => {
    expect(movementLine({ kind: 'Paid Out', amount: 300, reason: 'Petty cash', note: 'tea', recorded_at: '12:30' })).toBe('12:30 take out KES 300 for Petty cash (tea)');
    expect(movementLine({ kind: 'Safe Drop', amount: 5000, reason: 'Bank deposit', recorded_at: '17:05' })).toBe('17:05 to the safe KES 5,000 for Bank deposit');
  });

  test('the saved message says what the drawer should hold, or that it was saved before', () => {
    expect(savedMessage({ duplicate: false, cash_in_till: 2710 })).toBe('Saved. The drawer should now hold KES 2,710.');
    expect(savedMessage({ duplicate: true, cash_in_till: null })).toBe('This was already saved.');
    expect(savedMessage({ duplicate: false, cash_in_till: null })).toBe('');
  });

  test('the totals leave out the kinds with nothing in them', () => {
    expect(totalLines({ 'Paid In': 1000, 'Paid Out': 0, 'Safe Drop': 400 })).toEqual(['Put in: KES 1,000', 'To the safe: KES 400']);
    expect(totalLines(null)).toEqual([]);
  });
});
