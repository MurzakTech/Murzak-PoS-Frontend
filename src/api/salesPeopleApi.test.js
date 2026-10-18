import axiosInstance from './axiosInstance';
import { createSalesPerson, getCommissionReport, listSalesPeople, monthRange, rateProblem, updateSalesPerson } from './salesPeopleApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());
const ok = (data) => ({ data: { message: { success: true, data } } });

it('lists the active sales people of the business', async () => {
  axiosInstance.get.mockResolvedValue(ok({ data: [{ name: 'Jane' }], count: 1 }));
  expect(await listSalesPeople('Acme')).toEqual([{ name: 'Jane' }]);
  expect(axiosInstance.get.mock.calls[0][1]).toEqual({ params: { company: 'Acme', include_disabled: 0 } });
});

it('adds a person with a number for the rate', async () => {
  axiosInstance.post.mockResolvedValue(ok({ name: 'Jane' }));
  await createSalesPerson('Acme', { name: 'Jane', commissionRate: '5', user: '' });
  expect(axiosInstance.post.mock.calls[0][1]).toEqual({
    company: 'Acme', sales_person_name: 'Jane', commission_rate: 5, user: undefined,
  });
});

it('sends only what was changed, and can unlink a login', async () => {
  axiosInstance.post.mockResolvedValue(ok({ name: 'Jane' }));
  await updateSalesPerson('Acme', 'Jane', { user: '', enabled: false });
  expect(axiosInstance.post.mock.calls[0][1]).toEqual({ company: 'Acme', name: 'Jane', user: '', enabled: 0 });
});

it('reads the commission report with its totals', async () => {
  axiosInstance.get.mockResolvedValue(ok({ data: [{ sales_person: 'Jane', commission: 86.21 }], totals: { commission: 86.21 } }));
  const report = await getCommissionReport('Acme', { fromDate: '2026-10-01', toDate: '2026-10-31' });
  expect(report.rows).toHaveLength(1);
  expect(report.totals.commission).toBe(86.21);
});

it('checks the rate before sending it', () => {
  expect(rateProblem('')).toBe('');
  expect(rateProblem('5')).toBe('');
  expect(rateProblem('101')).toMatch(/between 0 and 100/);
  expect(rateProblem('-1')).toMatch(/between 0 and 100/);
  expect(rateProblem('x')).toMatch(/number/);
});

it('finds the first and last day of a month, including a leap February', () => {
  expect(monthRange(new Date(2026, 9, 12))).toEqual({ fromDate: '2026-10-01', toDate: '2026-10-31' });
  expect(monthRange(new Date(2028, 1, 10))).toEqual({ fromDate: '2028-02-01', toDate: '2028-02-29' });
});
