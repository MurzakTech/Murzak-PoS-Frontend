import { marginPercent, money } from './Recipes';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

it('works out the margin as a share of the price', () => {
  expect(marginPercent(100, 40)).toBe(60);
  expect(marginPercent(250, 100)).toBe(60);
  expect(marginPercent(80, 100)).toBe(-25);
});

it('has no margin for a dish with no price', () => {
  expect(marginPercent(0, 40)).toBeNull();
  expect(marginPercent(null, 40)).toBeNull();
});

it('shows money with two decimals', () => {
  expect(money(12)).toMatch(/12\.00/);
  expect(money(undefined)).toMatch(/0\.00/);
});
