import { mpesaChargeAmount, normalizeKenyanPhone } from './paymentGatewayApi';

// The helpers tested here never call the server
jest.mock('./axiosInstance', () => ({ __esModule: true, default: {} }));

describe('normalizeKenyanPhone', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['0712 345 678', '254712345678'],
    ['+254 712-345-678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['0110345678', '254110345678'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '0212345678', '25471234567', '+1 202 555 0101', null, undefined])('rejects %s', (input) => {
    expect(normalizeKenyanPhone(input)).toBe('');
  });
});

describe('mpesaChargeAmount', () => {
  it('keeps whole shillings', () => {
    expect(mpesaChargeAmount(250)).toBe(250);
  });

  it('rounds cents up so the business is never short', () => {
    expect(mpesaChargeAmount(100.4)).toBe(101);
    expect(mpesaChargeAmount('99.01')).toBe(100);
  });

  it('ignores floating point noise', () => {
    expect(mpesaChargeAmount(0.1 + 0.2 + 99.7)).toBe(100);
  });

  it('never charges less than one shilling', () => {
    expect(mpesaChargeAmount(0)).toBe(1);
  });
});
