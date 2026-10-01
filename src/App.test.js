import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import EmptyState from './components/Common/EmptyState';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { normalizeKenyanPhone, isValidKenyanMobile } from './utils/phone';

const wrap = (ui) => render(<ThemeProvider><MemoryRouter>{ui}</MemoryRouter></ThemeProvider>);

describe('phone numbers', () => {
  test.each([
    ['0712 345 678', '254712345678'],
    ['+254 712-345-678', '254712345678'],
    ['254712345678', '254712345678'],
    ['0112345678', '254112345678'],
  ])('%s is accepted and normalised', (input, expected) => {
    expect(isValidKenyanMobile(input)).toBe(true);
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  test.each(['', '12345', '0612345678', '+1 415 555 0100'])('%p is rejected', (input) => {
    expect(isValidKenyanMobile(input)).toBe(false);
  });
});

describe('shared components', () => {
  test('EmptyState shows its message and action', () => {
    wrap(<EmptyState title="No products yet" description="Add your first one." actions={[{ label: 'Add product' }]} />);
    expect(screen.getByText('No products yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add product' })).toBeInTheDocument();
  });

  test('ErrorBoundary shows a recovery screen instead of a blank page', () => {
    const Boom = () => {
      throw new Error('boom');
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    wrap(
      <ErrorBoundary inline>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
