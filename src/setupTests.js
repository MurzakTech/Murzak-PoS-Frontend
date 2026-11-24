// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { _resetQueryCacheForTest } from './newlook/hooks/useDataQuery';

// React Router 7 uses TextEncoder, which the test browser (jsdom) does not provide. Real browsers have it.
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

beforeEach(() => {
  _resetQueryCacheForTest();
});
