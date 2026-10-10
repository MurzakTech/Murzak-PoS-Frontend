import { canAccessRoute } from './roleAccessConfig';

// Frappe reports "All" (and "Guest") for every signed-in user.
const cashier = ['Sales User', 'All', 'Guest'];

describe('restricted pages', () => {
  it('keeps cashiers out of returns and the audit trail, even through the All role', () => {
    expect(canAccessRoute('/sales/history', cashier)).toBe(true);
    expect(canAccessRoute('/sales/returns', cashier)).toBe(false);
    expect(canAccessRoute('/settings/audit-trail', cashier)).toBe(false);
  });

  it('lets the named roles in', () => {
    expect(canAccessRoute('/sales/returns', ['Sales Manager', 'All'])).toBe(true);
    expect(canAccessRoute('/sales/returns', ['Accounts Manager'])).toBe(true);
    expect(canAccessRoute('/settings/audit-trail', ['Auditor', 'All'])).toBe(true);
    expect(canAccessRoute('/settings/audit-trail', ['Accounts Manager'])).toBe(true);
    expect(canAccessRoute('/settings/audit-trail', ['Sales Manager', 'All'])).toBe(false);
  });

  it('always lets owners in', () => {
    expect(canAccessRoute('/settings/audit-trail', ['System Manager'])).toBe(true);
    expect(canAccessRoute('/sales/returns', ['Administrator'])).toBe(true);
  });
});
