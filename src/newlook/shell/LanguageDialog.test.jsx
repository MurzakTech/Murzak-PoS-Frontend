/**
 * The Language choice in the account menu: it offers the languages the server gives, saves the one chosen and says so, and shows a
 * plain message when the languages cannot be loaded.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../components/Toast';
import LanguageDialog from './LanguageDialog';
import { getLanguages, setLanguage } from '../../api/languageApi';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/languageApi', () => ({
  DEFAULT_LANGUAGES: [{ code: 'en', name: 'English' }, { code: 'sw', name: 'Kiswahili' }],
  getLanguages: jest.fn(),
  setLanguage: jest.fn(),
}));

const show = (onClose = jest.fn()) =>
  render(
    <ToastProvider>
      <LanguageDialog open onClose={onClose} />
    </ToastProvider>
  );

beforeEach(() => jest.resetAllMocks());

test('saves the language chosen and closes', async () => {
  getLanguages.mockResolvedValue({ languages: [{ code: 'en', name: 'English' }, { code: 'sw', name: 'Kiswahili' }], current: 'en' });
  setLanguage.mockResolvedValue('sw');
  const onClose = jest.fn();
  show(onClose);
  userEvent.click(await screen.findByRole('combobox', { name: /Language/ }));
  userEvent.click(await screen.findByRole('option', { name: 'Kiswahili' }));
  userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(setLanguage).toHaveBeenCalledWith('sw'));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

test('a failure to load the languages is said in plain words', async () => {
  getLanguages.mockRejectedValue(new Error('network'));
  show();
  expect(await screen.findByText('The languages could not be loaded. Please try again.')).toBeInTheDocument();
});
