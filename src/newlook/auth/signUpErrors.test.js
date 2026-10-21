import { plainSignUpError } from './signUpErrors';
import T from './strings.auth';

describe('plainSignUpError', () => {
  test('offline messages map to T.errors.offline', () => {
    const res = plainSignUpError('You are offline');
    expect(res.kind).toBe('offline');
    expect(res.text).toBe(T.errors.offline);
  });

  test('network rejections map to T.errors.network', () => {
    const res = plainSignUpError('Network Error: could not reach host');
    expect(res.kind).toBe('network');
    expect(res.text).toBe(T.errors.network);
  });

  test('slow/timeout rejections map to T.errors.slow', () => {
    const res = plainSignUpError('Request timed out');
    expect(res.kind).toBe('slow');
    expect(res.text).toBe(T.errors.slow);
  });

  test('busy server rejections map to T.errors.busy', () => {
    const res = plainSignUpError('Service temporarily unavailable');
    expect(res.kind).toBe('busy');
    expect(res.text).toBe(T.errors.busy);
  });

  test('duplicate email highlights the email field with helpful text', () => {
    const res = plainSignUpError('Email test@example.com already exists');
    expect(res.kind).toBe('emailTaken');
    expect(res.field).toBe('email');
    expect(res.text).toContain('already exists');
  });

  test('duplicate phone highlights the phone field with helpful text', () => {
    const res = plainSignUpError('Mobile phone 254712345678 already registered');
    expect(res.kind).toBe('phoneTaken');
    expect(res.field).toBe('phone');
    expect(res.text).toContain('already exists');
  });

  test('password rules refusal highlights password field', () => {
    const res = plainSignUpError('Password must contain special characters');
    expect(res.kind).toBe('password');
    expect(res.field).toBe('password');
    expect(res.text).toBe('Password must contain special characters');
  });

  test('structured WEAK_PASSWORD refusal extracts requirements list', () => {
    const res = plainSignUpError({
      code: 'WEAK_PASSWORD',
      message: 'Password does not meet security requirements.',
      requirements: ['at least 8 characters', 'one uppercase letter', 'one symbol'],
    });
    expect(res.kind).toBe('password');
    expect(res.field).toBe('password');
    expect(res.text).toContain('at least 8 characters, one uppercase letter, one symbol');
  });

  test('generic errors map to other', () => {
    const res = plainSignUpError('Something unusual happened');
    expect(res.kind).toBe('other');
    expect(res.field).toBeNull();
    expect(res.text).toBe('Something unusual happened');
  });
});
