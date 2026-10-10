import { groupKey } from './Security';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('qrcode.react', () => ({ QRCodeSVG: () => null }));

it('groups the setup key in fours for typing into a phone', () => {
  expect(groupKey('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567')).toBe('ABCD EFGH IJKL MNOP QRST UVWX YZ23 4567');
  expect(groupKey('')).toBe('');
});
