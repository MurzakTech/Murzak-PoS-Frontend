/* eslint-disable testing-library/no-node-access -- a card is found from its own heading with closest(), because a card has no role or label of its own to ask for */
/**
 * Settings, Brand (ticket P7-3): the logo and the colour (a short list, no typing), the words on the receipt and the receipt style, each
 * card saving on its own, a preview of a made-up sale, and the owner-only rule.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { BrandContext } from './BrandProvider';
import BrandSection from './BrandSection';
import { DEFAULT_BRAND } from './brandModel';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const BRAND = { ...DEFAULT_BRAND, tagline: 'Fresh every day' };

const show = (tier = 'owner', props = {}) => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const applySaved = jest.fn();
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <BrandContext.Provider value={{ brand: BRAND, business: { companyName: 'Shop A', address: {} }, status: 'ready', applySaved }}>
            <BrandSection {...props} />
          </BrandContext.Provider>
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
  return { applySaved };
};

const card = (name) => screen.getByRole('heading', { name }).closest('section');

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('shows the three cards, the preview and the saved values', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(BRAND) });
  expect(await screen.findByLabelText('Tagline')).toHaveValue('Fresh every day');
  ['Logo and colour', 'Words on your receipt', 'Receipt style', 'How your receipt will look'].forEach((name) => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
  expect(screen.getByRole('article', { name: 'Sales receipt' })).toBeInTheDocument();
});

test('there is no box to type a colour: the colours are a list of named choices, each with a word', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(BRAND) });
  await screen.findByLabelText('Tagline');
  const group = screen.getByRole('radiogroup', { name: 'Brand colour' });
  const names = within(group).getAllByRole('radio').map((r) => r.textContent);
  expect(names).toEqual(['Indigo', 'Blue', 'Teal', 'Green', 'Amber', 'Red', 'Pink', 'Purple', 'Slate']);
  expect(within(group).getByRole('radio', { name: 'Indigo' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.queryByLabelText(/hex|#/i)).not.toBeInTheDocument();
});

test('choosing a colour saves only the colour card, shows Saved and tells the screens', async () => {
  const save = jest.fn().mockImplementation(async (fields) => ({ ...BRAND, ...fields }));
  const { applySaved } = show('owner', { load: jest.fn().mockResolvedValue(BRAND), save });
  await screen.findByLabelText('Tagline');
  userEvent.click(screen.getByRole('radio', { name: 'Teal' }));
  expect(screen.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');
  expect(within(card('Logo and colour')).getByText('Not saved yet')).toBeInTheDocument();
  userEvent.click(within(card('Logo and colour')).getByRole('button', { name: 'Save' }));
  await within(card('Logo and colour')).findByText('Saved');
  expect(save).toHaveBeenCalledWith({ logo: '', accent: 'teal' }, 'Shop A');
  expect(applySaved).toHaveBeenCalledWith(expect.objectContaining({ accent: 'teal' }));
  expect(screen.getByRole('article')).toHaveAttribute('data-swatch', 'teal');
});

test('the arrow keys move between the colours', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(BRAND) });
  await screen.findByLabelText('Tagline');
  screen.getByRole('radio', { name: 'Indigo' }).focus();
  userEvent.keyboard('{arrowright}');
  expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Blue' })).toHaveFocus();
});

test('words: too long or markup is told in words beside the field, and nothing is sent', async () => {
  const save = jest.fn();
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), save });
  await screen.findByLabelText('Tagline');
  userEvent.clear(screen.getByLabelText('Tagline'));
  userEvent.paste(screen.getByLabelText('Tagline'), 'a'.repeat(85));
  userEvent.type(screen.getByLabelText('Social media name (optional)'), 'my shop');
  userEvent.type(screen.getByLabelText('Website (optional)'), 'nonsense');
  userEvent.click(within(card('Words on your receipt')).getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('This is too long. Please shorten it.')).toBeInTheDocument();
  expect(screen.getByText(/Use letters, numbers, dots and underscores only/)).toBeInTheDocument();
  expect(screen.getByText('Enter a website address such as www.myshop.co.ke.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

test('words: the footer, social name and website are saved', async () => {
  const save = jest.fn().mockImplementation(async (fields) => ({ ...BRAND, ...fields, social: '@myshop', website: 'www.myshop.co.ke' }));
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), save });
  await screen.findByLabelText('Tagline');
  userEvent.type(screen.getByLabelText('Message at the bottom'), 'Thank you');
  userEvent.type(screen.getByLabelText('Social media name (optional)'), 'myshop');
  userEvent.type(screen.getByLabelText('Website (optional)'), 'https://www.myshop.co.ke/');
  userEvent.click(within(card('Words on your receipt')).getByRole('button', { name: 'Save' }));
  await within(card('Words on your receipt')).findByText('Saved');
  expect(save).toHaveBeenCalledWith({ tagline: 'Fresh every day', footer: 'Thank you', social: '@myshop', website: 'www.myshop.co.ke' }, 'Shop A');
});

test('style: choosing A4 changes the preview before saving and saves on its own card', async () => {
  const save = jest.fn().mockImplementation(async (fields) => ({ ...BRAND, ...fields }));
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), save });
  await screen.findByLabelText('Tagline');
  expect(screen.getByRole('article')).toHaveClass('nl-rcpt--thermal80');
  userEvent.click(screen.getByRole('radio', { name: /A4 page/ }));
  expect(screen.getByRole('article')).toHaveClass('nl-rcpt--a4');
  userEvent.click(within(card('Receipt style')).getByRole('button', { name: 'Save' }));
  await within(card('Receipt style')).findByText('Saved');
  expect(save).toHaveBeenCalledWith({ style: 'a4' }, 'Shop A');
});

test('a logo of the wrong type or over 1 MB is refused in words and never uploaded', async () => {
  const upload = jest.fn();
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), upload });
  await screen.findByLabelText('Tagline');
  const input = screen.getByLabelText('Logo picture');
  userEvent.upload(input, new File(['x'], 'logo.svg', { type: 'image/svg+xml' }), { applyAccept: false });
  expect(await screen.findByText('Choose a JPG, PNG or WebP picture.')).toBeInTheDocument();
  userEvent.upload(input, new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
  expect(await screen.findByText('That picture is larger than 1 MB. Choose a smaller one.')).toBeInTheDocument();
  expect(upload).not.toHaveBeenCalled();
});

test('a good logo is uploaded, shown, and saved with the card; it can be removed', async () => {
  const upload = jest.fn().mockResolvedValue('/files/logo.png');
  const save = jest.fn().mockImplementation(async (fields) => ({ ...BRAND, ...fields }));
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), upload, save });
  await screen.findByLabelText('Tagline');
  userEvent.upload(screen.getByLabelText('Logo picture'), new File(['x'], 'logo.png', { type: 'image/png' }));
  await waitFor(() => expect(screen.getAllByRole('img', { name: 'Your logo' })[0]).toHaveAttribute('src', expect.stringContaining('/files/logo.png')));
  userEvent.click(within(card('Logo and colour')).getByRole('button', { name: 'Save' }));
  await within(card('Logo and colour')).findByText('Saved');
  expect(save).toHaveBeenCalledWith({ logo: '/files/logo.png', accent: 'indigo' }, 'Shop A');
  userEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
  expect(screen.getByText('No logo yet')).toBeInTheDocument();
});

test('a refusal from the server is shown on the card', async () => {
  const save = jest.fn().mockRejectedValue(new Error('Only a business owner can do this.'));
  show('owner', { load: jest.fn().mockResolvedValue(BRAND), save });
  await screen.findByLabelText('Tagline');
  userEvent.click(screen.getByRole('radio', { name: 'Red' }));
  userEvent.click(within(card('Logo and colour')).getByRole('button', { name: 'Save' }));
  expect(await within(card('Logo and colour')).findByRole('alert')).toHaveTextContent('Only a business owner can do this.');
});

test('a cashier can look but not change: no Save, fields locked, a note says why', async () => {
  show('cashier', { load: jest.fn().mockResolvedValue(BRAND) });
  expect(await screen.findByText('Only the business owner can change these.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Tagline')).toHaveAttribute('readonly');
  expect(screen.getByRole('radio', { name: 'Red' })).toBeDisabled();
});

test('when the brand cannot be loaded there is a plain message and a way to try again', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(BRAND);
  show('owner', { load });
  expect(await screen.findByText('We could not load your brand')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByLabelText('Tagline')).toBeInTheDocument();
});
