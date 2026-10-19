/**
 * The gate keeps the earlier screens from flashing up while the shop's look is being learned.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NewLookContext } from './NewLookProvider';
import NewLookGate from './NewLookGate';

const show = (status) =>
  render(
    <NewLookContext.Provider value={{ enabled: false, status, company: 'Shop A', setEnabled: async () => false }}>
      <NewLookGate>
        <p>the app</p>
      </NewLookGate>
    </NewLookContext.Provider>
  );

test('while the look is not known yet, the app is held back and a short notice is shown', () => {
  show('loading');
  expect(screen.queryByText('the app')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Loading your shop');
});

test.each(['idle', 'ready', 'error'])('once it is %s, the app opens', (status) => {
  show(status);
  expect(screen.getByText('the app')).toBeInTheDocument();
});
