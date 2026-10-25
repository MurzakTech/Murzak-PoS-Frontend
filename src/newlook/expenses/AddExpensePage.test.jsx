/* eslint-disable testing-library/no-node-access --
   The hidden file chooser has no role a query can find, and the check that a photo is only offered under More options needs the folded box. */
/**
 * The Add expense form (ticket P5-1, acceptance check AC-30), checked at the screen level against the Form page pattern: amount in
 * shillings, category, paid from, date, note and the optional receipt photo (preview, remove, size check), "Not saved yet" then
 * "Saved", Save and add another, errors beside the field and in the summary, a question before leaving with changes, a retry that never
 * saves twice, and owners and managers only.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import AddExpensePage from './AddExpensePage';
import { createExpense, getExpenseOptions } from '../../api/expensesApi';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/expensesApi', () => ({
  createExpense: jest.fn(),
  getExpenseOptions: jest.fn(),
  listExpenses: jest.fn(),
  getReceipt: jest.fn(),
}));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } } }),
}));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const OPTIONS = {
  company: 'Demo Shop',
  today: '2026-10-17',
  categories: [
    { id: 'Airtime - DS', label: 'Airtime', group: 'Indirect Expenses' },
    { id: 'Office Rent - DS', label: 'Office Rent', group: 'Indirect Expenses' },
  ],
  paidFrom: [
    { key: 'cash', label: 'Cash', available: true, reason: '', modeOfPayment: 'Cash' },
    { key: 'mpesa', label: 'M-Pesa', available: false, reason: 'no_account', modeOfPayment: '' },
    { key: 'bank', label: 'Bank', available: true, reason: '', modeOfPayment: 'Bank Draft' },
  ],
  limits: {},
};

const renderForm = async (tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const view = render(
    <MemoryRouter initialEntries={['/new-look/expenses/new']}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <Link to="/new-look/sales">Sales</Link>
          <Routes>
            <Route path="/new-look/expenses/new" element={<AddExpensePage />} />
            <Route path="*" element={<p>Somewhere else</p>} />
          </Routes>
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const type = (label, text) => userEvent.type(screen.getByLabelText(label), text);
const pick = (label, option) => {
  userEvent.click(screen.getByRole('combobox', { name: label }));
  userEvent.click(screen.getByRole('option', { name: option }));
};
const png = (size) => {
  const file = new File(['abc'], 'receipt.png', { type: 'image/png' });
  if (size) Object.defineProperty(file, 'size', { value: size });
  return file;
};
const choosePhoto = (file) => userEvent.upload(screen.getByLabelText('Receipt photo', { selector: 'input' }), file);
const fillGood = async () => {
  await screen.findByLabelText('Amount');
  type('Amount', '1500');
  pick('Category', 'Office Rent');
  type('Note', 'Rent for October');
};
const save = () => userEvent.click(screen.getByRole('button', { name: 'Save expense' }));

beforeEach(() => {
  jest.resetAllMocks();
  getExpenseOptions.mockResolvedValue(OPTIONS);
  createExpense.mockResolvedValue({ expense: { id: 'ACC-JV-1' }, repeat: false });
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the form (Form page pattern)', () => {
  test('asks for the amount first, then category, paid from, date and note, and folds the photo under More options', async () => {
    await renderForm();
    expect(await screen.findByRole('heading', { level: 1, name: 'Add expense' })).toBeInTheDocument();
    await screen.findByLabelText('Amount');
    const labels = ['Amount', 'Category', 'Paid from', 'Date', 'Note'];
    labels.forEach((label) => expect(screen.getByLabelText(label)).toBeVisible());
    const order = labels.map((label) => screen.getByLabelText(label));
    order.slice(1).forEach((el, i) => expect(order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()); // eslint-disable-line no-bitwise
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Receipt photo', { selector: 'input' })).not.toBeVisible();
  });

  test('the amount is in shillings: KES in front, digits only', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    expect(screen.getByText('KES')).toBeInTheDocument();
    type('Amount', '12a3');
    expect(screen.getByLabelText('Amount')).toHaveValue('123');
    expect(screen.getByText('In shillings, no cents.')).toBeInTheDocument();
  });

  test('starts with today in the date field and the first way of paying the shop can use', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    await waitFor(() => expect(screen.getByLabelText('Date')).toHaveValue('17/10/2026'));
    expect(screen.getByRole('combobox', { name: 'Paid from' })).toHaveTextContent('Cash');
  });

  test('says "Not saved yet" until a real save', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  test('offers only the categories the books already have', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    userEvent.click(screen.getByRole('combobox', { name: 'Category' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Airtime', 'Office Rent']);
  });

  test('a way of paying the shop has not set up says so and cannot be chosen', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    expect(screen.getByText('M-Pesa has no account linked to it yet. Ask your accountant to link one.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('combobox', { name: 'Paid from' }));
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Cash', 'M-Pesa (not set up)', 'Bank']);
    expect(options[1]).toHaveAttribute('aria-disabled', 'true');
  });

  test('the note counts what is left', async () => {
    await renderForm();
    await screen.findByLabelText('Note');
    expect(screen.getByText('Optional, up to 140 characters. 140 left.')).toBeInTheDocument();
    type('Note', 'Charcoal');
    expect(screen.getByText('Optional, up to 140 characters. 132 left.')).toBeInTheDocument();
  });
});

describe('paying from the till drawer', () => {
  test('a cash expense offers to take the money from the till drawer, ticked, and asks nothing special when left ticked', async () => {
    await renderForm();
    await fillGood();
    expect(screen.getByRole('checkbox', { name: 'Take it from the till drawer' })).toBeChecked();
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    expect(createExpense.mock.calls[0][0].fromTill).toBeUndefined();
  });

  test('unticking it sends that the cash did not come from the drawer', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('checkbox', { name: 'Take it from the till drawer' }));
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ paidFrom: 'cash', fromTill: false }));
  });

  test('only cash can come out of a drawer, so the choice goes away for the bank', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    expect(screen.getByRole('checkbox', { name: 'Take it from the till drawer' })).toBeInTheDocument();
    pick('Paid from', 'Bank');
    expect(screen.queryByRole('checkbox', { name: 'Take it from the till drawer' })).not.toBeInTheDocument();
  });

  test('after saving it says what the drawer should now hold', async () => {
    createExpense.mockResolvedValue({ expense: { id: 'ACC-JV-1' }, repeat: false, till: { shift: 'POS-OPE-1', cashInTill: 250 } });
    await renderForm();
    await fillGood();
    save();
    expect(await screen.findByText('Expense of KES 1,500 saved Taken from the till. The drawer should now hold KES 250.')).toBeInTheDocument();
  });
});

describe('saving', () => {
  test('saves one expense with what was typed and goes back to the list', async () => {
    await renderForm();
    await fillGood();
    save();
    await waitFor(() => expect(where()).toBe('/new-look/expenses'));
    expect(createExpense).toHaveBeenCalledTimes(1);
    expect(createExpense).toHaveBeenCalledWith({
      amount: '1500',
      category: 'Office Rent - DS',
      paidFrom: 'cash',
      date: '2026-10-17',
      note: 'Rent for October',
      receipt: undefined,
      company: 'Demo Shop',
      requestId: expect.stringMatching(/^exp-/),
    });
    expect(await screen.findByText('Expense of KES 1,500 saved')).toBeInTheDocument();
  });

  test('a different paid from and date are sent as chosen', async () => {
    await renderForm();
    await fillGood();
    pick('Paid from', 'Bank');
    userEvent.clear(screen.getByLabelText('Date'));
    type('Date', '16102026');
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ paidFrom: 'bank', date: '2026-10-16' }));
  });

  test('Save and add another keeps the category, paid from and date, clears the rest, says Saved and takes the keyboard to the amount', async () => {
    await renderForm();
    await fillGood();
    pick('Paid from', 'Bank');
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    expect(await screen.findByText('Expense of KES 1,500 saved. You can add the next one.')).toBeInTheDocument();
    expect(where()).toBe('/new-look/expenses/new');
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Office Rent');
    expect(screen.getByRole('combobox', { name: 'Paid from' })).toHaveTextContent('Bank');
    expect(screen.getByLabelText('Date')).toHaveValue('17/10/2026');
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveFocus());
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
  });

  test('the next expense gets a request id of its own', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await screen.findByText(/You can add the next one/);
    type('Amount', '300');
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(2));
    const [first, second] = createExpense.mock.calls.map((c) => c[0].requestId);
    expect(first).not.toBe(second);
  });

  test('changing the form after a save goes back to "Not saved yet"', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await screen.findByText('Saved');
    type('Amount', '5');
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });

  test('a retry after a bad connection uses the same request id, so it can never save twice', async () => {
    createExpense.mockRejectedValueOnce(new Error('We could not reach the Murzak server. Check your internet connection and try again.'));
    await renderForm();
    await fillGood();
    save();
    expect(await screen.findAllByText(/could not reach the Murzak server/)).not.toHaveLength(0);
    expect(where()).toBe('/new-look/expenses/new');
    save();
    await waitFor(() => expect(where()).toBe('/new-look/expenses'));
    expect(createExpense).toHaveBeenCalledTimes(2);
    expect(createExpense.mock.calls[0][0].requestId).toBe(createExpense.mock.calls[1][0].requestId);
  });

  test('a second tap while saving does not send it again', async () => {
    let finish;
    createExpense.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await renderForm();
    await fillGood();
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    expect(createExpense).toHaveBeenCalledTimes(1);
    finish({ expense: { id: 'X' }, repeat: false });
    await waitFor(() => expect(where()).toBe('/new-look/expenses'));
  });
});

describe('errors', () => {
  test('an empty form shows what is missing beside each field and in the summary at the top', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    save();
    expect(createExpense).not.toHaveBeenCalled();
    const alert = (await screen.findAllByRole('alert')).find((a) => within(a).queryByText('Fix 2 things before saving'));
    expect(alert).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Enter the amount' })).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Choose a category' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('Enter the amount');
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('Choose a category').length).toBeGreaterThan(1);
    await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveFocus());
  });

  test('a link in the summary takes the keyboard to the field', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    save();
    userEvent.click(await screen.findByRole('button', { name: 'Choose a category' }));
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveFocus();
  });

  test('an amount of zero is refused', async () => {
    await renderForm();
    await fillGood();
    userEvent.clear(screen.getByLabelText('Amount'));
    type('Amount', '0');
    save();
    expect((await screen.findAllByText('The amount must be more than 0')).length).toBe(2);
    expect(createExpense).not.toHaveBeenCalled();
  });

  test('a date after today is refused', async () => {
    await renderForm();
    await fillGood();
    userEvent.clear(screen.getByLabelText('Date'));
    type('Date', '18102026');
    save();
    expect((await screen.findAllByText('The date cannot be in the future')).length).toBe(2);
    expect(createExpense).not.toHaveBeenCalled();
  });

  test('a date that is not finished is refused', async () => {
    await renderForm();
    await fillGood();
    userEvent.clear(screen.getByLabelText('Date'));
    type('Date', '1610');
    save();
    expect((await screen.findAllByText('Enter the date, for example 16/10/2026')).length).toBe(2);
  });

  test('a note over 140 characters is refused and the counter shows nothing left', async () => {
    await renderForm();
    await fillGood();
    userEvent.clear(screen.getByLabelText('Note'));
    userEvent.paste(screen.getByLabelText('Note'), 'a'.repeat(141));
    expect(screen.getByText('Optional, up to 140 characters. 0 left.')).toBeInTheDocument();
    save();
    expect((await screen.findAllByText('The note can be at most 140 characters')).length).toBe(2);
    expect(createExpense).not.toHaveBeenCalled();
  });

  test('typing in a field with an error takes that error away', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    save();
    await screen.findAllByText('Enter the amount');
    type('Amount', '5');
    await waitFor(() => expect(screen.queryByText('Enter the amount')).not.toBeInTheDocument());
  });

  test('the server explaining a way of paying that is not set up shows beside Paid from, and in the summary', async () => {
    const error = new Error('This shop has no Bank account set up, so an expense cannot be paid from Bank. Choose another way, or ask your accountant to link an account to it.');
    error.code = 'no_account';
    error.field = 'paid_from';
    createExpense.mockRejectedValue(error);
    await renderForm();
    await fillGood();
    pick('Paid from', 'Bank');
    save();
    expect((await screen.findAllByText(/This shop has no Bank account set up/)).length).toBe(2);
    expect(screen.getByRole('combobox', { name: 'Paid from' })).toHaveFocus();
    expect(where()).toBe('/new-look/expenses/new');
  });

  test('an answer about the whole form is shown at the top and in a message', async () => {
    createExpense.mockRejectedValue(new Error('The expense was not saved, so nothing was changed. Please try again.'));
    await renderForm();
    await fillGood();
    save();
    await waitFor(() => expect(screen.getAllByRole('alert').some((a) => within(a).queryByText('The expense was not saved, so nothing was changed. Please try again.'))).toBe(true));
    expect(where()).toBe('/new-look/expenses/new');
  });
});

describe('the receipt photo', () => {
  test('opens More options to choose a photo; the photo shows with its name and size and can be taken away', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText('Optional. A picture of the receipt, up to 5 MB.')).toBeVisible();
    choosePhoto(png());
    const preview = await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    expect(preview).toHaveAttribute('src', 'data:image/png;base64,YWJj');
    expect(screen.getByText('receipt.png (0 MB)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose another photo' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.queryByRole('img', { name: 'Photo of the receipt you chose' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeInTheDocument();
  });

  test('is sent with the expense, in the same call', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ receipt: 'data:image/png;base64,YWJj' }));
  });

  test('a photo that was removed is not sent', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    expect(createExpense.mock.calls[0][0].receipt).toBeUndefined();
  });

  test('a photo over 5 MB is refused with its size, before anything is sent', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png(6.4 * 1024 * 1024));
    expect((await screen.findAllByText('This photo is 6.4 MB. Choose one of 5 MB or less.')).length).toBe(2);
    expect(screen.queryByRole('img', { name: 'Photo of the receipt you chose' })).not.toBeInTheDocument();
  });

  test('a file that is not a picture is refused', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' }));
    expect((await screen.findAllByText('Choose a picture (JPG, PNG, GIF or WebP).')).length).toBe(2);
  });

  test('the chooser only offers pictures', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    expect(screen.getByLabelText('Receipt photo', { selector: 'input' })).toHaveAttribute('accept', 'image/jpeg,image/png,image/gif,image/webp');
  });

  test('a refused photo stops the save until it is replaced or removed, and the problem is in the summary', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png(9 * 1024 * 1024));
    await screen.findAllByText('This photo is 9 MB. Choose one of 5 MB or less.');
    save();
    expect(createExpense).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'This photo is 9 MB. Choose one of 5 MB or less.' })).toBeInTheDocument();
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    save();
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
  });

  test('a photo problem the server finds opens More options and shows beside the photo', async () => {
    const error = new Error('The receipt must be a photo (JPG, PNG, GIF or WebP).');
    error.field = 'receipt';
    createExpense.mockRejectedValue(error);
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    save();
    expect((await screen.findAllByText('The receipt must be a photo (JPG, PNG, GIF or WebP).')).length).toBe(2);
    expect(screen.getByRole('button', { name: 'Choose another photo' })).toBeVisible();
  });

  test('Save and add another clears the photo', async () => {
    await renderForm();
    await fillGood();
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await screen.findByText(/You can add the next one/);
    expect(screen.queryByRole('img', { name: 'Photo of the receipt you chose' })).not.toBeInTheDocument();
  });
});

describe('leaving with changes', () => {
  test('a form nobody has touched lets you go at once', async () => {
    await renderForm();
    userEvent.click(await screen.findByRole('link', { name: 'Sales' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
  });

  test('with changes, a link elsewhere asks first, and Stay keeps the form', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    type('Amount', '50');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Amount')).toHaveValue('50');
    expect(where()).toBe('/new-look/expenses/new');
  });

  test('with changes, Leave without saving goes on', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    type('Amount', '50');
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }));
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
  });

  test('with changes, Cancel asks first; with none, Cancel goes back to the list', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    type('Amount', '50');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });

  test('with nothing changed, Cancel goes back to the expenses', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(where()).toBe('/new-look/expenses'));
  });

  test('choosing only a photo counts as a change', async () => {
    await renderForm();
    await screen.findByLabelText('Amount');
    userEvent.click(screen.getByRole('button', { name: 'More options' }));
    choosePhoto(png());
    await screen.findByRole('img', { name: 'Photo of the receipt you chose' });
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });
});

describe('when the choices cannot be used', () => {
  test('if they cannot be loaded, says so and offers to try again', async () => {
    getExpenseOptions.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    await renderForm();
    expect(await screen.findByRole('heading', { name: 'The choices could not be loaded.' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument();
  });

  test('a shop with no expense accounts is told what to do', async () => {
    getExpenseOptions.mockResolvedValue({ ...OPTIONS, categories: [] });
    await renderForm();
    expect(await screen.findByText(/Your books have no expense accounts to choose from yet/)).toBeInTheDocument();
  });

  test('a shop with no way of paying set up is told what to do', async () => {
    getExpenseOptions.mockResolvedValue({ ...OPTIONS, paidFrom: OPTIONS.paidFrom.map((p) => ({ ...p, available: false, reason: 'no_mode' })) });
    await renderForm();
    expect(await screen.findByText(/No way of paying is set up yet/)).toBeInTheDocument();
  });
});

describe('owners and managers only', () => {
  test('a manager sees the form', async () => {
    await renderForm('manager');
    expect(await screen.findByLabelText('Amount')).toBeInTheDocument();
  });

  test('a cashier sees a plain message with a way back to Home, and nothing is asked for', async () => {
    await renderForm('cashier');
    expect(await screen.findByRole('heading', { name: 'Expenses are for owners and managers' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(getExpenseOptions).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(where()).toBe('/new-look');
  });
});
