import { formatAmount, limitProblem } from './Approvals';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

describe('limitProblem', () => {
  it('accepts empty, zero and positive numbers', () => {
    expect(limitProblem('')).toBe('');
    expect(limitProblem('0')).toBe('');
    expect(limitProblem('15000.50')).toBe('');
  });

  it('refuses a negative number and nonsense', () => {
    expect(limitProblem('-1')).toMatch(/below zero/);
    expect(limitProblem('abc')).toMatch(/number/);
  });
});

it('shows amounts with two decimals', () => {
  expect(formatAmount(1500)).toMatch(/1,?500\.00/);
  expect(formatAmount(null)).toMatch(/0\.00/);
});
