import { defaultFilters, toCsv, formatWhen } from './AuditTrail';
import { cleanParams } from '../../api/auditApi';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

describe('audit trail helpers', () => {
  it('defaults to the last seven days, today included', () => {
    const f = defaultFilters(new Date('2026-10-10T12:00:00Z'));
    expect(f.from_date).toBe('2026-10-04');
    expect(f.to_date).toBe('2026-10-10');
    expect(f.user).toBe('');
  });

  it('exports CSV that survives commas, quotes and line breaks', () => {
    const csv = toCsv([{
      timestamp: '2026-10-10 09:00:00',
      user_name: 'Jane, Cashier',
      user: 'jane@shop.ke',
      action: 'Updated',
      module: 'Products',
      doctype: 'Item Price',
      docname: 'IP-1',
      summary: 'Price list rate: 60 → 65; note "VIP"\nsecond line',
    }]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('"When","Staff","Email","Action","Area","Document type","Document","Details"');
    expect(row).toContain('"Jane, Cashier"');
    expect(row).toContain('note ""VIP""');
  });

  it('formats server timestamps and tolerates odd values', () => {
    expect(formatWhen('')).toBe('-');
    expect(formatWhen('not a date')).toBe('not a date');
    expect(formatWhen('2026-10-10 09:00:00')).not.toBe('-');
  });

  it('sends only the filters that are set', () => {
    expect(cleanParams({ user: '', module: 'Sales', action: null, limit_start: 0 }))
      .toEqual({ module: 'Sales', limit_start: 0 });
  });
});
