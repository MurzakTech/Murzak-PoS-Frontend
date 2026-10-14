/**
 * The New and Edit customer forms (ticket P4-7, acceptance check AC-26): the till's quick-add fields, name and mobile required,
 * errors beside the field and in the summary at the top, "Not saved yet" until a save, a question before leaving with changes,
 * group and area only for shops that use them, and Disabled when editing.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import NewCustomerPage from './NewCustomerPage';
import EditCustomerPage from './EditCustomerPage';
import { createCustomer, getCustomerFormOptions, getCustomerOverview, updateCustomer } from '../../api/customersListApi';

jest.mock('../../api/customersListApi', () => ({
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  getCustomerOverview: jest.fn(),
  getCustomerFormOptions: jest.fn(),
}));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } } }),
}));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const EXISTING = {
  id: 'CUST-0007',
  name: 'Wanjiru Kamau',
  type: 'Company',
  mobile: '+254712345678',
  email: 'wanjiru@demo.test',
  tax_id: 'A012345678Z',
  group: 'Commercial',
  territory: 'Nairobi',
  disabled: false,
  features: { groups: false, territories: false },
};

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/new-look/customers/new']}>
      <ToastProvider>
        <Link to="/new-look/sales">Sales</Link>
        <Routes>
          <Route path="/new-look/customers/new" element={<NewCustomerPage />} />
          <Route path="*" element={<p>Somewhere else</p>} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );

const renderEdit = (id = 'CUST-0007') =>
  render(
    <MemoryRouter initialEntries={[`/new-look/customers/${id}/edit`]}>
      <ToastProvider>
        <Routes>
          <Route path="/new-look/customers/:id/edit" element={<EditCustomerPage />} />
          <Route path="*" element={<p>Somewhere else</p>} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );

const where = () => screen.getByTestId('where').textContent;
const type = (label, text) => userEvent.type(screen.getByLabelText(label), text);
const fillRequired = () => {
  type('Customer name', 'Amina Hassan');
  type('Mobile number', '0712 345 678');
};

beforeEach(() => {
  jest.resetAllMocks();
  getCustomerFormOptions.mockResolvedValue({ features: { groups: false, territories: false }, groups: [], territories: [] });
  getCustomerOverview.mockResolvedValue({ ...EXISTING });
  createCustomer.mockResolvedValue({ id: 'CUST-0099', name: 'Amina Hassan' });
  updateCustomer.mockResolvedValue({ id: 'CUST-0007' });
});

describe('the New customer form (AC-26)', () => {
  test('has the till quick-add fields: name, mobile, type, and under More options the email and KRA PIN', async () => {
    renderNew();
    expect(await screen.findByRole('heading', { level: 1, name: 'New customer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toBeVisible();
    expect(screen.getByLabelText('Mobile number')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Customer type' })).toHaveTextContent('Individual');
    expect(screen.getByLabelText('Email (optional)')).not.toBeVisible();
    expect(screen.getByLabelText('KRA PIN (optional)')).not.toBeVisible();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByLabelText('Email (optional)')).toBeVisible();
    expect(screen.getByLabelText('KRA PIN (optional)')).toBeVisible();
  });

  test('the type offers Individual, Company and Partnership as the till does', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('combobox', { name: 'Customer type' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Individual', 'Company', 'Partnership']);
  });

  test('shows the mobile format as help', async () => {
    renderNew();
    expect(await screen.findByText('For example 0712 345 678')).toBeInTheDocument();
  });

  test('says "Not saved yet" before a save', async () => {
    renderNew();
    expect(await screen.findByText('Not saved yet')).toBeInTheDocument();
  });

  test('has Cancel, Save and add another, and Save in a footer', async () => {
    renderNew();
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and add another' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save customer' })).toBeInTheDocument();
  });

  test('group and area are not shown for a shop that does not use them', async () => {
    renderNew();
    await screen.findByLabelText('Customer name');
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.queryByRole('combobox', { name: 'Group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Area' })).not.toBeInTheDocument();
  });

  test('group and area are under More options for a shop that uses them', async () => {
    getCustomerFormOptions.mockResolvedValue({ features: { groups: true, territories: true }, groups: ['Individual', 'Commercial'], territories: ['Nairobi', 'Mombasa'] });
    renderNew();
    const group = await screen.findByRole('combobox', { name: 'Group', hidden: true });
    expect(group).not.toBeVisible();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    userEvent.click(group);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['-', 'Individual', 'Commercial']);
    userEvent.click(screen.getByRole('option', { name: 'Commercial' }));
    expect(screen.getByRole('combobox', { name: 'Area' })).toBeInTheDocument();
  });
});

describe('what must be filled in', () => {
  test('a name and a mobile number are required: the errors show beside the fields and in the summary', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save customer' }));
    expect(createCustomer).not.toHaveBeenCalled();
    const alert = (await screen.findAllByRole('alert')).find((a) => within(a).queryByText('Fix 2 things before saving'));
    expect(alert).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Enter the customer name' })).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Enter a mobile number' })).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toHaveAccessibleDescription('Enter the customer name');
    expect(screen.getByLabelText('Customer name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Mobile number')).toHaveAccessibleDescription('Enter a mobile number');
  });

  test('a link in the summary takes the keyboard to the field', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save customer' }));
    userEvent.click(await screen.findByRole('button', { name: 'Enter a mobile number' }));
    expect(screen.getByLabelText('Mobile number')).toHaveFocus();
  });

  test('one problem says "Fix 1 thing"', async () => {
    renderNew();
    type('Customer name', 'Amina');
    userEvent.click(await screen.findByRole('button', { name: 'Save customer' }));
    expect(await screen.findByText('Fix 1 thing before saving')).toBeInTheDocument();
  });

  test('a mobile number that is not Kenyan is explained, with an example', async () => {
    renderNew();
    fillRequired();
    userEvent.clear(screen.getByLabelText('Mobile number'));
    type('Mobile number', '12345');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findAllByText('That does not look like a Kenyan mobile number. Try 0712 345 678')).toHaveLength(2);
    expect(createCustomer).not.toHaveBeenCalled();
  });

  test('typing in a field with an error takes that error away', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save customer' }));
    await screen.findByText('Fix 2 things before saving');
    type('Customer name', 'A');
    expect(screen.getByLabelText('Customer name')).not.toHaveAttribute('aria-invalid');
  });

  test('an email that is wrong opens More options and is explained beside the field', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    type('Email (optional)', 'not-an-email');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect((await screen.findAllByText('That does not look like an email address')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Email (optional)')).toBeVisible();
    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute('aria-invalid', 'true');
  });

  test('a wrong email hidden under More options opens it by itself', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    type('Email (optional)', 'x');
    userEvent.click(screen.getByRole('button', { name: 'Fewer options' }));
    expect(screen.getByLabelText('Email (optional)')).not.toBeVisible();
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(screen.getByLabelText('Email (optional)')).toBeVisible());
  });

  test('a KRA PIN of the wrong shape is explained', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    type('KRA PIN (optional)', '12345');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect((await screen.findAllByText(/A KRA PIN is a letter, nine digits and a letter/)).length).toBeGreaterThan(0);
  });
});

describe('saving', () => {
  test('Save sends the mobile number in its stored form, the type, and goes to the list with the new customer open', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    type('Email (optional)', 'amina@demo.test');
    type('KRA PIN (optional)', 'a012345678z');
    userEvent.click(screen.getByRole('combobox', { name: 'Customer type' }));
    userEvent.click(screen.getByRole('option', { name: 'Company' }));
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    expect(createCustomer).toHaveBeenCalledWith({
      name: 'Amina Hassan',
      mobile: '+254712345678',
      email: 'amina@demo.test',
      taxId: 'A012345678Z',
      type: 'Company',
      group: undefined,
      territory: undefined,
      company: 'Demo Shop',
    });
    await waitFor(() => expect(where()).toBe('/new-look/customers?open=CUST-0099'));
    expect(await screen.findByText('Amina Hassan saved')).toBeInTheDocument();
  });

  test('a mobile number typed with +254 or without the zero is accepted', async () => {
    renderNew();
    type('Customer name', 'Amina');
    type('Mobile number', '712345678');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(createCustomer).toHaveBeenCalledWith(expect.objectContaining({ mobile: '+254712345678' })));
  });

  test('Save and add another saves, says Saved, empties the form and keeps the type', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('combobox', { name: 'Customer type' }));
    userEvent.click(screen.getByRole('option', { name: 'Partnership' }));
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toHaveValue('');
    expect(screen.getByLabelText('Mobile number')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Customer type' })).toHaveTextContent('Partnership');
    expect(screen.getByLabelText('Customer name')).toHaveFocus();
    expect(where()).toBe('/new-look/customers/new');
    expect(await screen.findByText('Amina Hassan saved. Add the next customer.')).toBeInTheDocument();
  });

  test('a name the shop already has is explained beside the name field', async () => {
    const error = new Error("Customer 'Amina Hassan' already exists");
    error.code = 'duplicate';
    createCustomer.mockRejectedValue(error);
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect((await screen.findAllByText('You already have a customer called Amina Hassan')).length).toBe(2);
    expect(screen.getByLabelText('Customer name')).toHaveAttribute('aria-invalid', 'true');
    expect(where()).toBe('/new-look/customers/new');
  });

  test('any other failure is a plain message and the form keeps what was typed', async () => {
    createCustomer.mockRejectedValue(new Error('We could not reach the Murzak server. Check your internet connection and try again.'));
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findByText(/We could not reach the Murzak server/)).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toHaveValue('Amina Hassan');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });

  test('pressing Enter in a field saves', async () => {
    renderNew();
    type('Customer name', 'Amina');
    type('Mobile number', '0712345678{enter}');
    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
  });
});

describe('leaving with changes (AC-26)', () => {
  test('a form nobody has touched lets you go at once', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('link', { name: 'Sales' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
  });

  test('with changes, a link elsewhere asks first, and Stay keeps the form', async () => {
    renderNew();
    type('Customer name', 'Amina');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    expect(within(dialog).getByText(/changes that are not saved yet/)).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Customer name')).toHaveValue('Amina');
    expect(where()).toBe('/new-look/customers/new');
  });

  test('with changes, Leave without saving goes on', async () => {
    renderNew();
    type('Customer name', 'Amina');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
    expect(where()).toBe('/new-look/sales');
  });

  test('with changes, Cancel asks first', async () => {
    renderNew();
    type('Customer name', 'Amina');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });

  test('with nothing changed, Cancel goes back to the list', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(where()).toBe('/new-look/customers'));
  });

  test('after a save there is nothing to lose any more', async () => {
    renderNew();
    fillRequired();
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await screen.findByText('Saved');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('the Edit customer form', () => {
  test('starts with the customer\'s own details, the mobile written 0712 345 678', async () => {
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    expect(screen.getByRole('heading', { level: 1, name: 'Edit customer' })).toBeInTheDocument();
    expect(screen.getByText('Change the details of Wanjiru Kamau')).toBeInTheDocument();
    expect(screen.getByLabelText('Mobile number')).toHaveValue('0712 345 678');
    expect(screen.getByRole('combobox', { name: 'Customer type' })).toHaveTextContent('Company');
    expect(screen.getByLabelText('Email (optional)')).toHaveValue('wanjiru@demo.test');
    expect(screen.getByLabelText('KRA PIN (optional)')).toHaveValue('A012345678Z');
    expect(screen.getByRole('checkbox', { name: 'Disabled' })).not.toBeChecked();
    expect(getCustomerOverview).toHaveBeenCalledWith('CUST-0007', 'Demo Shop');
  });

  test('says "Not saved yet" and has no Save and add another', async () => {
    renderEdit();
    await screen.findByLabelText('Customer name');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and add another' })).not.toBeInTheDocument();
  });

  test('a change and Save sends the update, leaves an unchanged mobile alone and goes to the list with the customer open', async () => {
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    userEvent.clear(screen.getByLabelText('Customer name'));
    type('Customer name', 'Wanjiru K. Kamau');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledTimes(1));
    const sent = updateCustomer.mock.calls[0][0];
    expect(sent).toMatchObject({ id: 'CUST-0007', company: 'Demo Shop', name: 'Wanjiru K. Kamau', disabled: false, type: 'Company' });
    expect(sent.mobile).toBeUndefined();
    await waitFor(() => expect(where()).toBe('/new-look/customers?open=CUST-0007'));
  });

  test('the Disabled box is sent with the save', async () => {
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    userEvent.click(screen.getByRole('checkbox', { name: 'Disabled' }));
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith(expect.objectContaining({ disabled: true })));
  });

  test('clearing the email sends an empty email so it is removed', async () => {
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    userEvent.clear(screen.getByLabelText('Email (optional)'));
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith(expect.objectContaining({ email: '' })));
  });

  test('a customer saved without a mobile can still be edited without one', async () => {
    getCustomerOverview.mockResolvedValue({ ...EXISTING, mobile: '' });
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/before saving/)).not.toBeInTheDocument();
  });

  test('a changed mobile is checked and sent in its stored form', async () => {
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Mobile number')).toHaveValue('0712 345 678'));
    userEvent.clear(screen.getByLabelText('Mobile number'));
    type('Mobile number', '0733 000 111');
    userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith(expect.objectContaining({ mobile: '+254733000111' })));
  });

  test('group and area appear when the shop uses them, with the customer\'s own choice', async () => {
    getCustomerFormOptions.mockResolvedValue({ features: { groups: true, territories: false }, groups: ['Individual', 'Commercial'], territories: [] });
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
    expect(await screen.findByRole('combobox', { name: 'Group', hidden: true })).toHaveTextContent('Commercial');
  });

  test('a customer that cannot be loaded shows a retry', async () => {
    getCustomerOverview.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    renderEdit();
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByLabelText('Customer name')).toHaveValue('Wanjiru Kamau'));
  });

  test('an id with spaces and slashes is read back from the address', async () => {
    renderEdit('CUST%20A%2FB');
    await screen.findByLabelText('Customer name');
    expect(getCustomerOverview).toHaveBeenCalledWith('CUST A/B', 'Demo Shop');
  });
});
