import { unmetPasswordRules, validatePassword } from './passwordRules';

describe('password rules', () => {
  it('flags the missing symbol in the password from the bug report', () => {
    expect(unmetPasswordRules('Omerayawa123').map((r) => r.id)).toEqual(['symbol']);
    expect(validatePassword('Omerayawa123')).toBe('Still needed: a symbol.');
  });

  it('accepts any symbol, including - and _', () => {
    expect(validatePassword('Omerayawa123!')).toBe(true);
    expect(validatePassword('Omerayawa-123')).toBe(true);
    expect(validatePassword('Omerayawa_123')).toBe(true);
  });

  it('lists everything still needed', () => {
    expect(unmetPasswordRules('abc').map((r) => r.id)).toEqual(['length', 'upper', 'number', 'symbol']);
    expect(unmetPasswordRules('').length).toBe(5);
  });
});
