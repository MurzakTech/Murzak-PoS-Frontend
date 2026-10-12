import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NewLook from './NewLook';
import { useNewLook } from '../../newlook/NewLookProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../newlook/NewLookProvider');
jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

const setEnabled = jest.fn();

const show = (look = {}) => {
  useNewLook.mockReturnValue({ enabled: false, status: 'ready', company: 'Shop A', setEnabled, ...look });
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <NewLook />
      </MemoryRouter>
    </ThemeProvider>
  );
};

const toggle = () => screen.getByRole('switch', { name: /use the new look in this shop/i });

beforeEach(() => {
  jest.resetAllMocks();
  setEnabled.mockResolvedValue(true);
});

test('shows the shop and that the New look is off by default', () => {
  show();
  expect(screen.getByText('New look for Shop A')).toBeInTheDocument();
  expect(screen.getByText('Off')).toBeInTheDocument();
  expect(toggle()).not.toBeChecked();
  expect(screen.queryByRole('link', { name: /open the new look/i })).not.toBeInTheDocument();
});

test('turning it on asks first, and does nothing if the owner keeps it off', () => {
  show();
  userEvent.click(toggle());
  expect(screen.getByText('Turn on the New look?')).toBeInTheDocument();
  expect(setEnabled).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Keep it off' }));
  expect(setEnabled).not.toHaveBeenCalled();
});

test('confirming turns it on and says Saved', async () => {
  show();
  userEvent.click(toggle());
  userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(true));
  expect(await screen.findByText(/^Saved\./)).toBeInTheDocument();
});

test('turning it off needs no confirmation and takes effect at once', async () => {
  show({ enabled: true });
  expect(screen.getByText('On')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open the new look/i })).toHaveAttribute('href', '/new-look');
  userEvent.click(toggle());
  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(false));
  expect(screen.queryByText('Turn on the New look?')).not.toBeInTheDocument();
  expect(await screen.findByText(/^Saved\./)).toBeInTheDocument();
});

test('a refused change shows the reason in words, not "Saved"', async () => {
  setEnabled.mockRejectedValue(new Error('You do not have permission to do this.'));
  show();
  userEvent.click(toggle());
  userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to do this.');
  expect(screen.queryByText(/^Saved\./)).not.toBeInTheDocument();
});

test('the switch cannot be used until the current setting is known', () => {
  show({ status: 'loading' });
  expect(toggle()).toBeDisabled();
});

test('when the server could not be asked, the page says so', () => {
  show({ status: 'error' });
  expect(screen.getByText(/could not check the setting/i)).toBeInTheDocument();
});
