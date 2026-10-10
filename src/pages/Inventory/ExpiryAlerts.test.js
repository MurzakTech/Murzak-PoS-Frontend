import { describeDaysLeft, filterAlerts, toCsv } from './ExpiryAlerts';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

const alerts = [
  { item_name: 'Panadol 500mg', item_code: 'PANADOL', batch_no: 'B-OLD', warehouse: 'Main - A', qty: 4, stock_uom: 'Box', expiry_date: '2026-10-01', days_left: -9, status: 'Expired', stock_value: 50 },
  { item_name: 'Milk 500ml', item_code: 'MILK', batch_no: '', warehouse: 'Shop, Front', qty: 20, stock_uom: 'Nos', expiry_date: '2026-11-01', days_left: 22, status: 'Expiring soon', stock_value: 1000 },
];

describe('expiry alert helpers', () => {
  it('describes days left in plain words', () => {
    expect(describeDaysLeft(-9)).toBe('Expired 9 days ago');
    expect(describeDaysLeft(-1)).toBe('Expired yesterday');
    expect(describeDaysLeft(0)).toBe('Expires today');
    expect(describeDaysLeft(1)).toBe('Expires tomorrow');
    expect(describeDaysLeft(22)).toBe('Expires in 22 days');
  });

  it('searches item, code, batch and store', () => {
    expect(filterAlerts(alerts, 'b-old')).toHaveLength(1);
    expect(filterAlerts(alerts, 'milk')[0].item_code).toBe('MILK');
    expect(filterAlerts(alerts, '  ')).toHaveLength(2);
  });

  it('exports quoted CSV', () => {
    const [header, , second] = toCsv(alerts).split('\r\n');
    expect(header.startsWith('"Item","Item code","Batch"')).toBe(true);
    expect(second).toContain('"Shop, Front"');
  });
});
