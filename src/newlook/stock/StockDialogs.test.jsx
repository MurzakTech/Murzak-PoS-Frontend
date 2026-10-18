/**
 * The short forms of ticket P4-4: Stock in, and Stock out or write-off. A write-off cannot be saved without a reason
 * (AC-27): the Save button stays off and the reason box shows what is missing beside it until one is chosen.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import StockInDialog from './StockInDialog';
import StockOutDialog from './StockOutDialog';
import { findProducts, stockIn, stockOut } from '../../api/stockLevelsApi';

jest.mock('../../api/stockLevelsApi', () => ({ findProducts: jest.fn(), stockIn: jest.fn(), stockOut: jest.fn() }));

const MILK = { item_code: 'MLK', item_name: 'Maziwa 500ml', category: 'Maziwa', unit: 'Nos', qty: 4 };
const FLOUR = { item_code: 'UNG', item_name: 'Unga wa Ngano 2kg', category: 'Unga', unit: 'Nos', qty: 40 };
const TWO_STORES = [
  { value: 'Duka Kuu - DS', label: 'Duka Kuu' },
  { value: 'Duka la Pili - DS', label: 'Duka la Pili' },
];

const show = (element) =>
  render(
    <MemoryRouter>
      <ToastProvider>{element}</ToastProvider>
    </MemoryRouter>
  );

const chooseProduct = async (name) => {
  userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
};
const reasonBox = () => screen.getByRole('combobox', { name: /Why is it leaving/ });

beforeEach(() => {
  jest.resetAllMocks();
  findProducts.mockResolvedValue([MILK, FLOUR]);
});

describe('Stock out or write-off', () => {
  const open = (props = {}) => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    show(<StockOutDialog open onClose={onClose} onSaved={onSaved} {...props} />);
    return { onClose, onSaved };
  };

  test('is a dialog with a product, a quantity, a reason and a note', async () => {
    open();
    const dialog = await screen.findByRole('dialog', { name: 'Stock out or write-off' });
    expect(within(dialog).getByLabelText('Quantity')).toBeInTheDocument();
    expect(reasonBox()).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Note (optional)')).toBeInTheDocument();
    expect(await within(dialog).findByRole('list', { name: 'Matching products' })).toBeInTheDocument();
  });

  test('the reasons are Damaged, Expired, Lost, Used in the shop and Other with a note', async () => {
    open({ initialProduct: MILK });
    userEvent.click(reasonBox());
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Damaged', 'Expired', 'Lost', 'Used in the shop', 'Other, with a note']);
  });

  test('the Save button is off and the reason box shows its error beside it until a reason is given', async () => {
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '1');
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
    expect(reasonBox()).toHaveAccessibleDescription('Choose a reason before you save');
    expect(reasonBox()).toBeInvalid();
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Damaged' }));
    expect(screen.queryByText('Choose a reason before you save')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeEnabled();
  });

  test('without a reason nothing is sent, even when Save is pressed', async () => {
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '1');
    userEvent.click(screen.getByRole('button', { name: 'Save stock out' }));
    expect(stockOut).not.toHaveBeenCalled();
  });

  test('is saved with a reason: one call with the product, quantity, reason and note, then it closes and the list reloads', async () => {
    stockOut.mockResolvedValue({ entry: 'MAT-STE-1', item_code: 'MLK', qty: 2, reason: 'damaged', in_stock: 2 });
    const { onClose, onSaved } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '2');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Damaged' }));
    userEvent.type(screen.getByLabelText('Note (optional)'), 'two bottles fell');
    userEvent.click(screen.getByRole('button', { name: 'Save stock out' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(stockOut).toHaveBeenCalledTimes(1);
    expect(stockOut).toHaveBeenCalledWith({ itemCode: 'MLK', qty: 2, reason: 'damaged', store: undefined, note: 'two bottles fell' });
    expect(onSaved).toHaveBeenCalled();
    expect(await screen.findByText('Took out 2 of Maziwa 500ml. Now 2 pieces in stock.')).toBeInTheDocument();
  });

  test('the reason Other also needs a note before Save is on', async () => {
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '1');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Other, with a note' }));
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
    const note = screen.getByLabelText('Note');
    userEvent.type(note, 'x');
    userEvent.clear(note);
    expect(note).toHaveAccessibleDescription('Add a short note for the reason Other');
    userEvent.type(note, 'a gift to the school');
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeEnabled();
  });

  test('taking out more than is in stock is refused beside the quantity', async () => {
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '9');
    expect(screen.getByLabelText('Quantity')).toHaveAccessibleDescription('Only 4 in stock');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Lost' }));
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
  });

  test('a quantity of zero or letters cannot be saved', async () => {
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Lost' }));
    userEvent.type(screen.getByLabelText('Quantity'), '0');
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
    userEvent.clear(screen.getByLabelText('Quantity'));
    userEvent.type(screen.getByLabelText('Quantity'), 'abc');
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
  });

  test('the product is chosen from a list that can be searched', async () => {
    open();
    await screen.findByRole('dialog');
    await chooseProduct('Unga wa Ngano');
    expect(screen.getByText('Unga wa Ngano 2kg (40 pieces in stock)')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Change product' }));
    expect(await screen.findByLabelText('Product')).toBeInTheDocument();
  });

  test('searching asks the server for matching products after a pause', async () => {
    open();
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Product'), 'maz');
    await waitFor(() => expect(findProducts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'maz' })));
  });

  test('a refusal from the server is shown in the dialog and the dialog stays open', async () => {
    stockOut.mockRejectedValue(new Error('There is only 4 in stock, so 5 cannot be taken out.'));
    const { onClose } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '2');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Expired' }));
    userEvent.click(screen.getByRole('button', { name: 'Save stock out' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('The stock was not taken out. There is only 4 in stock, so 5 cannot be taken out.');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeEnabled();
  });

  test('with two stores the person must say which store', async () => {
    open({ initialProduct: MILK, stores: TWO_STORES });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '1');
    userEvent.click(reasonBox());
    userEvent.click(screen.getByRole('option', { name: 'Lost' }));
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeDisabled();
    userEvent.click(screen.getByRole('combobox', { name: 'Take it from' }));
    userEvent.click(screen.getByRole('option', { name: 'Duka la Pili' }));
    expect(screen.getByRole('button', { name: 'Save stock out' })).toBeEnabled();
  });

  test('with one store no store is asked for', async () => {
    open({ initialProduct: MILK, stores: [TWO_STORES[0]] });
    await screen.findByRole('dialog');
    expect(screen.queryByRole('combobox', { name: 'Take it from' })).not.toBeInTheDocument();
  });

  test('Escape closes it without sending anything', async () => {
    const { onClose } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.keyboard('{esc}');
    expect(onClose).toHaveBeenCalled();
    expect(stockOut).not.toHaveBeenCalled();
  });
});

describe('Stock in', () => {
  const open = (props = {}) => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    show(<StockInDialog open onClose={onClose} onSaved={onSaved} {...props} />);
    return { onClose, onSaved };
  };

  test('is a dialog that says it is for stock that did not come from a supplier bill', async () => {
    open();
    const dialog = await screen.findByRole('dialog', { name: 'Stock in' });
    expect(within(dialog).getByText(/did not come from a supplier bill/)).toBeInTheDocument();
  });

  test('saving with nothing filled in shows the errors beside the fields and sends nothing', async () => {
    open();
    await screen.findByRole('dialog');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    expect(screen.getByLabelText('Quantity')).toHaveAccessibleDescription('Enter a quantity above zero');
    expect(screen.getByLabelText('Product')).toHaveAccessibleDescription('Choose a product');
    expect(stockIn).not.toHaveBeenCalled();
  });

  test('is saved with a product, a quantity and a note', async () => {
    stockIn.mockResolvedValue({ entry: 'MAT-STE-2', item_code: 'MLK', qty: 12, in_stock: 16 });
    const { onClose, onSaved } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '12');
    userEvent.type(screen.getByLabelText('Note (optional)'), 'from the depot');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(stockIn).toHaveBeenCalledTimes(1);
    expect(stockIn).toHaveBeenCalledWith({ itemCode: 'MLK', qty: 12, store: undefined, note: 'from the depot', unitCost: undefined });
    expect(onSaved).toHaveBeenCalled();
    expect(await screen.findByText('Added 12 of Maziwa 500ml. Now 16 pieces in stock.')).toBeInTheDocument();
  });

  test('a quantity with a decimal point is kept', async () => {
    stockIn.mockResolvedValue({ in_stock: 30.5 });
    open({ initialProduct: { ...MILK, unit: 'Kg' } });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '2.5');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    await waitFor(() => expect(stockIn).toHaveBeenCalled());
    expect(stockIn.mock.calls[0][0].qty).toBe(2.5);
  });

  test('the cost per unit is offered only to a person who may see cost, and is sent', async () => {
    stockIn.mockResolvedValue({ in_stock: 20 });
    open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    expect(screen.queryByLabelText('Cost per unit (optional)')).not.toBeInTheDocument();
  });

  test('with cost permission the cost goes to the server', async () => {
    stockIn.mockResolvedValue({ in_stock: 20 });
    open({ initialProduct: MILK, showCost: true });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '4');
    userEvent.type(screen.getByLabelText('Cost per unit (optional)'), '55');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    await waitFor(() => expect(stockIn).toHaveBeenCalled());
    expect(stockIn.mock.calls[0][0].unitCost).toBe(55);
  });

  test('with two stores the store must be chosen, and is sent', async () => {
    stockIn.mockResolvedValue({ in_stock: 20 });
    open({ initialProduct: MILK, stores: TWO_STORES });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '4');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    expect(stockIn).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('combobox', { name: 'Put it in' }));
    userEvent.click(screen.getByRole('option', { name: 'Duka la Pili' }));
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    await waitFor(() => expect(stockIn).toHaveBeenCalledWith(expect.objectContaining({ store: 'Duka la Pili - DS' })));
  });

  test('a refusal from the server stays in the dialog as an alert', async () => {
    stockIn.mockRejectedValue(new Error('Item MLK does not exist.'));
    const { onClose } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '4');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('The stock was not added. Item MLK does not exist.');
    expect(onClose).not.toHaveBeenCalled();
  });

  test('pressing Save twice sends one request', async () => {
    let finish;
    stockIn.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { onClose } = open({ initialProduct: MILK });
    await screen.findByRole('dialog');
    userEvent.type(screen.getByLabelText('Quantity'), '4');
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    userEvent.click(screen.getByRole('button', { name: 'Save stock in' }));
    expect(stockIn).toHaveBeenCalledTimes(1);
    finish({ in_stock: 8 });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
