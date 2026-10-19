/* eslint-disable testing-library/no-node-access -- a card, a row or a table row is found from its own heading or name with closest(), because none of them has a role or label of its own to ask for */
/**
 * Settings, Business (ticket P5-3, AC-32): three cards that each save on their own and say "Saved", errors beside the field,
 * a question before leaving with changes, the owner-only rule, and the link to bank accounts on the current screen.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Link, MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import BusinessSection from './BusinessSection';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const COMPANY = {
  name: 'Shop A',
  companyName: 'Shop A',
  abbr: 'SA',
  taxId: 'P000000000A',
  country: 'Kenya',
  currency: 'KES',
  address: { line1: '1 Test Road', line2: '', city: 'Nairobi', state: '', pincode: '00100' },
  phone: '0711000000',
  email: 'desk@shop-a.test',
  contact: { firstName: 'Amina', lastName: 'Otieno', email: 'amina@shop-a.test', mobile: '0722000000', phone: '' },
};

const show = (tier = 'owner', props = {}) => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <Link to="/elsewhere">Elsewhere</Link>
          <BusinessSection {...props} />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

const card = (name) => screen.getByRole('heading', { name }).closest('section');

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('shows the three cards with the business as the server has it', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  expect(await screen.findByLabelText('Tax ID (KRA PIN)')).toHaveValue('P000000000A');
  expect(screen.getByLabelText('Address')).toHaveValue('1 Test Road');
  expect(screen.getByLabelText('Town or city')).toHaveValue('Nairobi');
  expect(screen.getByLabelText('Phone', { selector: '#business-address-phone' })).toHaveValue('0711 000 000');
  expect(screen.getByLabelText('First name')).toHaveValue('Amina');
  ['Business details', 'Address and contact', 'Contact person'].forEach((name) => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
});

test('Stores has a card here, for every shop, opening the current Stores screen', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  await screen.findByLabelText('Tax ID (KRA PIN)');
  expect(screen.getByRole('heading', { name: 'Stores' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Stores/ })).toHaveAttribute('href', '/warehouses?legacy=1');
});

test('the business name, short name, country and currency are shown but cannot be typed over', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  await screen.findByLabelText('Business name');
  ['Business name', 'Short name', 'Country', 'Currency'].forEach((label) => expect(screen.getByLabelText(label)).toHaveAttribute('readonly'));
  expect(screen.getByLabelText('Business name')).toHaveValue('Shop A');
});

test('changing the tax ID says "Not saved yet", then Save sends the business and says "Saved"', async () => {
  const save = jest.fn().mockImplementation(async (company) => company);
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save });
  const tax = await screen.findByLabelText('Tax ID (KRA PIN)');
  const details = within(card('Business details'));
  expect(details.getByRole('button', { name: 'Save' })).toBeDisabled();
  userEvent.clear(tax);
  userEvent.type(tax, 'P111111111B');
  expect(details.getByText('Not saved yet')).toBeInTheDocument();
  userEvent.click(details.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({ companyName: 'Shop A', taxId: 'P111111111B', address: COMPANY.address });
  expect(await details.findByText('Saved')).toBeInTheDocument();
  expect(details.queryByText('Not saved yet')).not.toBeInTheDocument();
});

test('each card saves on its own: unsaved typing in another card is not sent', async () => {
  const save = jest.fn().mockImplementation(async (company) => company);
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save });
  const city = await screen.findByLabelText('Town or city');
  const first = screen.getByLabelText('First name');
  userEvent.clear(city);
  userEvent.type(city, 'Mombasa');
  userEvent.clear(first);
  userEvent.type(first, 'Wanjiru');
  userEvent.click(within(card('Address and contact')).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].address.city).toBe('Mombasa');
  expect(save.mock.calls[0][0].contact.firstName).toBe('Amina');
  expect(await within(card('Address and contact')).findByText('Saved')).toBeInTheDocument();
  // The other card still holds its own unsaved change
  expect(within(card('Contact person')).getByText('Not saved yet')).toBeInTheDocument();
  expect(screen.getByLabelText('First name')).toHaveValue('Wanjiru');
});

test('a missing address shows beside the field, and nothing is sent', async () => {
  const save = jest.fn();
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save });
  const line1 = await screen.findByLabelText('Address');
  userEvent.clear(line1);
  userEvent.clear(screen.getByLabelText('Town or city'));
  userEvent.click(within(card('Address and contact')).getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Enter the address.')).toBeInTheDocument();
  expect(screen.getByText('Enter the town or city.')).toBeInTheDocument();
  expect(line1).toHaveAttribute('aria-invalid', 'true');
  expect(save).not.toHaveBeenCalled();
  userEvent.type(line1, '5 New Road');
  expect(screen.queryByText('Enter the address.')).not.toBeInTheDocument();
});

test('a wrong email shows beside the field', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save: jest.fn() });
  const email = await screen.findByLabelText('Email', { selector: '#business-address-email' });
  userEvent.clear(email);
  userEvent.type(email, 'not-an-email');
  userEvent.click(within(card('Address and contact')).getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Enter an email address like name@example.com.')).toBeInTheDocument();
});

test('a refusal from the server is said in words on the card, and the card stays unsaved', async () => {
  const save = jest.fn().mockRejectedValue(new Error('Phone number is not valid.'));
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save });
  const phone = await screen.findByLabelText('Phone', { selector: '#business-address-phone' });
  userEvent.type(phone, '1');
  userEvent.click(within(card('Address and contact')).getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Phone number is not valid.');
  expect(within(card('Address and contact')).getByText('Not saved yet')).toBeInTheDocument();
});

test('leaving with changes that are not saved asks first, and Stay keeps them', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY), save: jest.fn() });
  const tax = await screen.findByLabelText('Tax ID (KRA PIN)');
  userEvent.type(tax, 'X');
  userEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));
  const ask = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
  userEvent.click(within(ask).getByRole('button', { name: 'Stay' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(tax).toHaveValue('P000000000AX');
});

test('with nothing changed, leaving does not ask', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  await screen.findByLabelText('Tax ID (KRA PIN)');
  userEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

test('undo puts the saved values back', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  const tax = await screen.findByLabelText('Tax ID (KRA PIN)');
  userEvent.type(tax, 'X');
  userEvent.click(within(card('Business details')).getByRole('button', { name: 'Undo changes' }));
  expect(tax).toHaveValue('P000000000A');
});

test('only the owner can change them: a manager can read, and has no Save', async () => {
  show('manager', { load: jest.fn().mockResolvedValue(COMPANY) });
  expect(await screen.findByText('Only the business owner can change these.')).toBeInTheDocument();
  expect(screen.getByLabelText('Tax ID (KRA PIN)')).toHaveAttribute('readonly');
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});

test('a failed load says so and tries again', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(COMPANY);
  show('owner', { load });
  expect(await screen.findByRole('heading', { name: 'We could not load your business details' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByLabelText('Tax ID (KRA PIN)')).toBeInTheDocument();
});

test('bank accounts are a link to the current screen, and no bank detail is asked for here', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(COMPANY) });
  const link = await screen.findByRole('link', { name: 'Open Bank accounts' });
  expect(link).toHaveAttribute('href', '/settings/bank-accounts?legacy=1');
  expect(screen.queryByLabelText(/account number|iban|swift|branch code/i)).not.toBeInTheDocument();
});
