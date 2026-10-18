import { logoProblem } from './LetterHeadCard';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

it('accepts no logo or an https address, and refuses anything else', () => {
  expect(logoProblem('')).toBe('');
  expect(logoProblem('https://acme.co.ke/logo.png')).toBe('');
  expect(logoProblem('http://acme.co.ke/logo.png')).toMatch(/https/);
  expect(logoProblem('C:\\logo.png')).toMatch(/https/);
});
