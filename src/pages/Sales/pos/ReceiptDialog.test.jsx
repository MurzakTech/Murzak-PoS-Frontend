import { invoiceDoctype } from './ReceiptDialog';

jest.mock('../../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

it('tells a POS invoice from a sales invoice by what the server sent', () => {
  expect(invoiceDoctype({ name: 'ACC-PSINV-2026-00004' })).toBe('POS Invoice');
  expect(invoiceDoctype({ name: 'ACC-SINV-2026-00109' })).toBe('Sales Invoice');
  expect(invoiceDoctype({ name: 'X-1', doctype: 'POS Invoice' })).toBe('POS Invoice');
  expect(invoiceDoctype(null)).toBe('Sales Invoice');
});
