/**
 * The Add and Edit supplier forms (ticket P4-6, acceptance check AC-26): only the name is required, errors beside the field and in
 * the summary at the top, "Not saved yet" until a save, a question before leaving with changes, the more options folded away,
 * Enabled as a checkbox when editing, and the type and internal flag fixed once saved.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import NewSupplierPage from './NewSupplierPage';
import EditSupplierPage from './EditSupplierPage';
import { createSupplier, getSupplierOverview, listSupplierGroups, updateSupplier } from '../../api/suppliersListApi';

jest.mock('../../api/suppliersListApi', () => ({
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
  getSupplierOverview: jest.fn(),
  listSupplierGroups: jest.fn(),
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
  id: 'SUP-0007',
  name: 'Bidco Distributors',
  type: 'Company',
  group: 'Goods',
  tax_id: 'P051234567A',
  country: 'Kenya',
  currency: 'KES',
  disabled: false,
  internal: false,
  owed: 20000,
  bills: [],
};

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/new-look/suppliers/new']}>
      <ToastProvider>
        <Link to="/new-look/sales">Sales</Link>
        <Routes>
          <Route path="/new-look/suppliers/new" element={<NewSupplierPage />} />
          <Route path="*" element={<p>Somewhere else</p>} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );

const renderEdit = (id = 'SUP-0007') =>
  render(
    <MemoryRouter initialEntries={[`/new-look/suppliers/${id}/edit`]}>
      <ToastProvider>
        <Routes>
          <Route path="/new-look/suppliers/:id/edit" element={<EditSupplierPage />} />
          <Route path="*" element={<p>Somewhere else</p>} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );

const where = () => screen.getByTestId('where').textContent;
const type = (label, text) => userEvent.type(screen.getByLabelText(label), text);

beforeEach(() => {
  jest.resetAllMocks();
  listSupplierGroups.mockResolvedValue([
    { value: 'Goods', label: 'Goods' },
    { value: 'Farm', label: 'Farm' },
  ]);
  getSupplierOverview.mockResolvedValue({ ...EXISTING });
  createSupplier.mockResolvedValue({ id: 'SUP-0099', name: 'Mama Njeri Eggs' });
  updateSupplier.mockResolvedValue({ id: 'SUP-0007' });
});

describe('the Add supplier form (AC-26)', () => {
  test('asks for the name first, then the type and the tax ID, and folds the rest under More options', async () => {
    renderNew();
    expect(await screen.findByRole('heading', { level: 1, name: 'Add supplier' })).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier name')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Company');
    expect(screen.getByLabelText('Tax ID or PIN')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Supplier group', hidden: true })).not.toBeVisible();
    expect(screen.getByLabelText('Country')).not.toBeVisible();
    expect(screen.getByLabelText('Default currency')).not.toBeVisible();
    expect(screen.getByLabelText('Internal supplier')).not.toBeVisible();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('combobox', { name: 'Supplier group' })).toBeVisible();
    expect(screen.getByLabelText('Country')).toBeVisible();
    expect(screen.getByLabelText('Default currency')).toBeVisible();
    expect(screen.getByLabelText('Internal supplier')).toBeVisible();
  });

  test('does not ask for a phone or an email, which the supplier record does not keep', async () => {
    renderNew();
    await screen.findByLabelText('Supplier name');
    expect(screen.queryByLabelText(/phone|mobile/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  test('starts with Kenya and KES, as the current form does', async () => {
    renderNew();
    expect(await screen.findByLabelText('Country')).toHaveValue('Kenya');
    expect(screen.getByLabelText('Default currency')).toHaveValue('KES');
  });

  test('the type offers Company and Individual', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('combobox', { name: 'Type' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Company', 'Individual']);
  });

  test('the group offers No group and the shop groups', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'More options' }));
    userEvent.click(screen.getByRole('combobox', { name: 'Supplier group' }));
    await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['No group', 'Goods', 'Farm']));
  });

  test('says "Not saved yet" before a save', async () => {
    renderNew();
    expect(await screen.findByText('Not saved yet')).toBeInTheDocument();
  });

  test('has Cancel, Save and add another, and Save supplier in a footer', async () => {
    renderNew();
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and add another' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save supplier' })).toBeInTheDocument();
  });

  test('there is no Enabled box when adding', async () => {
    renderNew();
    await screen.findByLabelText('Supplier name');
    expect(screen.queryByLabelText('Enabled')).not.toBeInTheDocument();
  });
});

describe('errors beside the field and in the summary (AC-26)', () => {
  test('the name is required: the error shows beside the field and in the summary', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save supplier' }));
    expect(createSupplier).not.toHaveBeenCalled();
    const alert = (await screen.findAllByRole('alert')).find((a) => within(a).queryByText('Fix 1 thing before saving'));
    expect(alert).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Enter the supplier name' })).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier name')).toHaveAccessibleDescription('Enter the supplier name');
    expect(screen.getByLabelText('Supplier name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('a name of only spaces is still missing', async () => {
    renderNew();
    type('Supplier name', '   ');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect(await screen.findAllByText('Enter the supplier name')).not.toHaveLength(0);
    expect(createSupplier).not.toHaveBeenCalled();
  });

  test('a link in the summary takes the keyboard to the field', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save supplier' }));
    userEvent.click(await screen.findByRole('button', { name: 'Enter the supplier name' }));
    expect(screen.getByLabelText('Supplier name')).toHaveFocus();
  });

  test('typing in a field with an error takes that error away', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Save supplier' }));
    await screen.findAllByText('Enter the supplier name');
    type('Supplier name', 'B');
    await waitFor(() => expect(screen.queryByText('Enter the supplier name')).not.toBeInTheDocument());
  });

  test('a wrong currency hidden under More options opens it by itself and is explained beside the field', async () => {
    renderNew();
    type('Supplier name', 'Mama Njeri Eggs');
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    const currency = screen.getByLabelText('Default currency');
    userEvent.clear(currency);
    userEvent.type(currency, 'Shillings');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect((await screen.findAllByText('Use the three letters of a currency, for example KES')).length).toBe(2);
    expect(screen.getByLabelText('Default currency')).toBeVisible();
    expect(createSupplier).not.toHaveBeenCalled();
  });

  test('a name the shop already has is explained beside the name field', async () => {
    const error = new Error("A supplier with the name 'Mama Njeri Eggs' already exists.");
    error.code = 'duplicate';
    createSupplier.mockRejectedValue(error);
    renderNew();
    type('Supplier name', 'Mama Njeri Eggs');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect((await screen.findAllByText(/You already have a supplier called "Mama Njeri Eggs"/)).length).toBe(2);
    expect(screen.getByLabelText('Supplier name')).toHaveAttribute('aria-invalid', 'true');
    expect(where()).toBe('/new-look/suppliers/new');
  });

  test('a currency the server does not know is explained beside the currency field', async () => {
    createSupplier.mockRejectedValue(new Error("The currency 'XYZ' does not exist. Please select a valid currency from the list."));
    renderNew();
    type('Supplier name', 'Mama Njeri Eggs');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect((await screen.findAllByText(/The currency 'XYZ' does not exist/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Default currency')).toBeVisible();
  });

  test('any other failure is a plain message and the form keeps what was typed', async () => {
    createSupplier.mockRejectedValue(new Error('We could not reach the Murzak server. Check your internet connection and try again.'));
    renderNew();
    type('Supplier name', 'Mama Njeri Eggs');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect(await screen.findByText(/We could not reach the Murzak server/)).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier name')).toHaveValue('Mama Njeri Eggs');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });
});

describe('saving a new supplier', () => {
  test('Save with only a name works, sends the defaults and goes to the list with the supplier open', async () => {
    renderNew();
    type('Supplier name', '  Mama Njeri Eggs ');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => expect(createSupplier).toHaveBeenCalledTimes(1));
    expect(createSupplier).toHaveBeenCalledWith({ name: 'Mama Njeri Eggs', type: 'Company', taxId: '', group: undefined, country: 'Kenya', currency: 'KES', internal: false, company: 'Demo Shop' });
    await waitFor(() => expect(where()).toBe('/new-look/suppliers?open=SUP-0099'));
  });

  test('sends the type, the tax ID in capitals, the group and the internal flag', async () => {
    renderNew();
    type('Supplier name', 'Asha Flour Mill');
    userEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    userEvent.click(screen.getByRole('option', { name: 'Individual' }));
    type('Tax ID or PIN', 'p051234567a');
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    userEvent.click(screen.getByRole('combobox', { name: 'Supplier group' }));
    userEvent.click(await screen.findByRole('option', { name: 'Farm' }));
    userEvent.click(screen.getByLabelText('Internal supplier'));
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => expect(createSupplier).toHaveBeenCalledTimes(1));
    expect(createSupplier.mock.calls[0][0]).toMatchObject({ name: 'Asha Flour Mill', type: 'Individual', taxId: 'P051234567A', group: 'Farm', internal: true });
  });

  test('Save and add another saves, says Saved, empties the form and keeps the type', async () => {
    renderNew();
    type('Supplier name', 'Asha Flour Mill');
    userEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    userEvent.click(screen.getByRole('option', { name: 'Individual' }));
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await waitFor(() => expect(createSupplier).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier name')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Individual');
    expect(screen.getByLabelText('Supplier name')).toHaveFocus();
    expect(where()).toBe('/new-look/suppliers/new');
    expect(await screen.findByText('Asha Flour Mill was saved. You can add the next supplier.')).toBeInTheDocument();
  });

  test('pressing Enter in a field saves', async () => {
    renderNew();
    type('Supplier name', 'Mama Njeri Eggs{enter}');
    await waitFor(() => expect(createSupplier).toHaveBeenCalledTimes(1));
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
    type('Supplier name', 'Mama');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Supplier name')).toHaveValue('Mama');
    expect(where()).toBe('/new-look/suppliers/new');
  });

  test('with changes, Leave without saving goes on', async () => {
    renderNew();
    type('Supplier name', 'Mama');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
    expect(where()).toBe('/new-look/sales');
  });

  test('with changes, Cancel asks first', async () => {
    renderNew();
    type('Supplier name', 'Mama');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });

  test('with nothing changed, Cancel goes back to the list', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(where()).toBe('/new-look/suppliers'));
  });

  test('changing only the country counts as a change', async () => {
    renderNew();
    userEvent.click(await screen.findByRole('button', { name: 'More options' }));
    type('Country', 'a');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });
});

describe('the Edit supplier form', () => {
  test('starts with the supplier\'s own details', async () => {
    renderEdit();
    await screen.findByLabelText('Supplier name');
    expect(screen.getByRole('heading', { level: 1, name: 'Edit supplier' })).toBeInTheDocument();
    expect(getSupplierOverview).toHaveBeenCalledWith('SUP-0007', 'Demo Shop');
    expect(screen.getByLabelText('Supplier name')).toHaveValue('Bidco Distributors');
    expect(screen.getByLabelText('Tax ID or PIN')).toHaveValue('P051234567A');
    expect(screen.getByLabelText('Country')).toHaveValue('Kenya');
    expect(screen.getByLabelText('Default currency')).toHaveValue('KES');
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('combobox', { name: 'Supplier group' })).toHaveTextContent('Goods');
  });

  test('says "Not saved yet" and has no Save and add another', async () => {
    renderEdit();
    expect(await screen.findByText('Not saved yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and add another' })).not.toBeInTheDocument();
  });

  test('Enabled is a checkbox, ticked for an enabled supplier, with no Saved at once switch', async () => {
    renderEdit();
    const box = await screen.findByRole('checkbox', { name: 'Enabled' });
    expect(box).toBeChecked();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved at once/i)).not.toBeInTheDocument();
  });

  test('a disabled supplier has Enabled unticked', async () => {
    getSupplierOverview.mockResolvedValue({ ...EXISTING, disabled: true });
    renderEdit();
    expect(await screen.findByRole('checkbox', { name: 'Enabled' })).not.toBeChecked();
  });

  test('the type and the internal flag are shown but cannot be changed, and the form says why', async () => {
    renderEdit();
    expect(await screen.findByText('The type cannot be changed once the supplier is saved.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeDisabled();
    expect(screen.getByLabelText('Internal supplier')).toBeDisabled();
  });

  test('a change and Save sends the update and goes to the list with the supplier open', async () => {
    renderEdit();
    const name = await screen.findByLabelText('Supplier name');
    userEvent.clear(name);
    userEvent.type(name, 'Bidco Africa');
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => expect(updateSupplier).toHaveBeenCalledTimes(1));
    expect(updateSupplier).toHaveBeenCalledWith({ id: 'SUP-0007', name: 'Bidco Africa', group: 'Goods', taxId: 'P051234567A', country: 'Kenya', currency: 'KES', disabled: false });
    await waitFor(() => expect(where()).toBe('/new-look/suppliers?open=SUP-0007'));
  });

  test('unticking Enabled and saving sends disabled', async () => {
    renderEdit();
    userEvent.click(await screen.findByRole('checkbox', { name: 'Enabled' }));
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => expect(updateSupplier).toHaveBeenCalledTimes(1));
    expect(updateSupplier.mock.calls[0][0]).toMatchObject({ disabled: true });
  });

  test('clearing the tax ID sends an empty tax ID so it is removed', async () => {
    renderEdit();
    userEvent.clear(await screen.findByLabelText('Tax ID or PIN'));
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => expect(updateSupplier).toHaveBeenCalledTimes(1));
    expect(updateSupplier.mock.calls[0][0].taxId).toBe('');
  });

  test('the name is still required when editing', async () => {
    renderEdit();
    userEvent.clear(await screen.findByLabelText('Supplier name'));
    userEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect((await screen.findAllByText('Enter the supplier name')).length).toBe(2);
    expect(updateSupplier).not.toHaveBeenCalled();
  });

  test('leaving after a change asks first', async () => {
    renderEdit();
    await screen.findByLabelText('Supplier name');
    type('Supplier name', 'x');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });

  test('a supplier that cannot be loaded shows a retry', async () => {
    getSupplierOverview.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    renderEdit();
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Supplier name')).toHaveValue('Bidco Distributors');
  });

  test('an id with spaces and slashes is read back from the address', async () => {
    renderEdit('Bidco%20%26%20Sons');
    await screen.findByLabelText('Supplier name');
    expect(getSupplierOverview).toHaveBeenCalledWith('Bidco & Sons', 'Demo Shop');
  });
});
