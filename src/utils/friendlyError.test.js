import { friendlyErrorMessage, humanizeMessage, humanizeTitle, MESSAGES, GENERIC } from './friendlyError';

const axiosError = (status, data) => ({ isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data } });

describe('friendly error messages', () => {
  test('keeps a clear server sentence, without the exception name or HTML', () => {
    const err = axiosError(417, {
      exception: 'frappe.exceptions.ValidationError: Item SKU-001 is out of stock',
      exc_type: 'ValidationError',
      _server_messages: JSON.stringify([JSON.stringify({ message: 'Item <strong>SKU-001</strong> is out of stock', indicator: 'red', title: 'Message' })]),
    });
    expect(friendlyErrorMessage(err)).toBe('Item SKU-001 is out of stock.');
  });

  test('reads the message inside the backend reply format', () => {
    expect(friendlyErrorMessage(axiosError(400, { message: { status: 'error', message: 'Invalid or missing warehouse.' } }))).toBe('Invalid or missing warehouse.');
  });

  test('never shows a traceback or programming error', () => {
    const tb = 'Traceback (most recent call last):\n  File "/apps/frappe/app.py", line 95, in application\nTypeError: login_user() missing 1 required positional argument';
    expect(friendlyErrorMessage(axiosError(500, { exc: tb, exception: "TypeError: login_user() missing 1 required positional argument: 'email'" }))).toBe(MESSAGES.server);
    expect(humanizeMessage("'NoneType' object has no attribute 'name'")).toBe(GENERIC);
  });

  test('replaces the backend catch-all that appends the raw exception', () => {
    const text = 'Something went wrong while processing your request. Please try again later. If the issue persists, contact support with the following error details. Error: (1054, "Unknown column")';
    expect(friendlyErrorMessage(axiosError(200, { message: { status: 'error', message: text } }))).toBe(MESSAGES.server);
  });

  test('explains network problems and timeouts', () => {
    expect(friendlyErrorMessage({ isAxiosError: true, message: 'Network Error', request: {} })).toBe(MESSAGES.network);
    expect(friendlyErrorMessage({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded', request: {} })).toBe(MESSAGES.timeout);
    expect(humanizeMessage('Request failed with status code 502')).toBe(MESSAGES.unavailable);
  });

  test('maps sign-in, permission and session problems', () => {
    expect(friendlyErrorMessage(axiosError(401, { message: 'Not authenticated' }))).toBe(MESSAGES.session);
    expect(friendlyErrorMessage(axiosError(401, { exc_type: 'AuthenticationError', message: 'Incorrect password' }))).toBe(MESSAGES.login);
    expect(friendlyErrorMessage(axiosError(403, { message: 'Insufficient Permission for Item' }))).toBe(MESSAGES.permission);
    expect(humanizeMessage('frappe.exceptions.AuthenticationError: Invalid login credentials')).toBe(MESSAGES.login);
    expect(friendlyErrorMessage(axiosError(417, { exc_type: 'TimestampMismatchError' }))).toBe(MESSAGES.modified);
  });

  test('uses the fallback for empty or odd values', () => {
    expect(humanizeMessage(undefined, 'Could not load products.')).toBe('Could not load products.');
    expect(humanizeMessage('[object Object]')).toBe(GENERIC);
    expect(friendlyErrorMessage(axiosError(500, '<!DOCTYPE html><html>Internal Server Error</html>'))).toBe(MESSAGES.server);
  });

  test('tidies a plain message into a sentence', () => {
    expect(humanizeMessage('customer name is required')).toBe('Customer name is required.');
    expect(humanizeMessage('[Item, ITEM-001]: item_group')).toBe('Some required information is missing: item group.');
  });

  test('pop-up titles read like plain speech', () => {
    expect(humanizeTitle('Failed to fetch sales invoices')).toBe('Could not load sales invoices');
    expect(humanizeTitle('Failed to create Product')).toBe('Could not create Product');
    expect(humanizeTitle('Error')).toBeNull();
    expect(humanizeTitle('Till open')).toBe('Till open');
  });
});
