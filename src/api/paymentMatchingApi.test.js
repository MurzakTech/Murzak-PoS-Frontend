import axiosInstance from './axiosInstance';
import { fileProblem, getExceptions, importStatement, importSummary, MAX_FILE_BYTES } from './paymentMatchingApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());

it('sends the statement text under the name the server reads', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: true, data: { imported: 2, matching: { reconciled: 2, left: 0, failed: 0 } } } } });
  const result = await importStatement('Acme', 'Receipt No.,Paid In\nQ1,100');
  expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.payment_matching_api.import_mpesa_statement', {
    company: 'Acme', csv_text: 'Receipt No.,Paid In\nQ1,100',
  });
  expect(result.imported).toBe(2);
});

it('says in plain words what an import did', () => {
  expect(importSummary({ imported: 11, repeated_in_file: 1, not_completed: 1, matching: { reconciled: 7, left: 4, failed: 0 } }))
    .toBe('11 statement lines added, 1 repeated in the file, 1 not completed (left out), 7 matched to a sale, 4 could not be matched.');
  expect(importSummary({ imported: 0, already_imported: 11, matching: { reconciled: 0, left: 0 } }))
    .toBe('0 statement lines added, 11 were already there, 0 matched to a sale.');
});

it('refuses a missing, oversized or wrong kind of file before sending it', () => {
  expect(fileProblem(null)).toMatch(/Choose/);
  expect(fileProblem({ name: 'a.csv', size: MAX_FILE_BYTES + 1 })).toMatch(/too large/);
  expect(fileProblem({ name: 'a.xlsx', size: 10 })).toMatch(/CSV/);
  expect(fileProblem({ name: 'statement.CSV', size: 10 })).toBe('');
});

it('returns the exceptions list', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { data: [{ reference: 'Q1' }], count: 1 } } } });
  expect(await getExceptions('Acme', 3)).toEqual([{ reference: 'Q1' }]);
});

it('shows the server refusal as the error', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'The statement has no payments in it.' } } });
  await expect(importStatement('Acme', 'x')).rejects.toThrow('no payments');
});
