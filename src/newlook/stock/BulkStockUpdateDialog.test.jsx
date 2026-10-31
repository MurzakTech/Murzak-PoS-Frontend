import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import BulkStockUpdateDialog from './BulkStockUpdateDialog';
import { bulkUpdateStock, currentStock, findProducts } from '../../api/stockLevelsApi';

jest.mock('../../api/stockLevelsApi', () => ({
  bulkUpdateStock: jest.fn(),
  currentStock: jest.fn(),
  findProducts: jest.fn(),
}));

const TWO_STORES = [
  { value: 'Store A', label: 'Store A' },
  { value: 'Store B', label: 'Store B' },
];

const renderDialog = (props = {}) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  render(
    <MemoryRouter>
      <ToastProvider>
        <BulkStockUpdateDialog
          open
          onClose={onClose}
          onSaved={onSaved}
          stores={TWO_STORES}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>
  );
  return { onClose, onSaved };
};

describe('BulkStockUpdateDialog', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    currentStock.mockResolvedValue({});
    findProducts.mockResolvedValue([
      { item_code: 'ITEM-1', item_name: 'Sugar 1kg', qty: 10, unit: 'Nos' },
      { item_code: 'ITEM-2', item_name: 'Flour 2kg', qty: 25, unit: 'Nos' },
    ]);
  });

  test('renders dialog with store selector, entry methods, and update modes', async () => {
    renderDialog();
    expect(await screen.findByRole('dialog', { name: /Bulk stock update/i })).toBeInTheDocument();
    expect(screen.getByText('Upload spreadsheet')).toBeInTheDocument();
    expect(screen.getByText(/Quick table entry|Quick entry/i)).toBeInTheDocument();
    expect(screen.getByText('Download CSV template')).toBeInTheDocument();
  });

  test('switches to manual entry and allows adding a product', async () => {
    renderDialog();
    const quickEntryBtn = screen.getByRole('radio', { name: /Quick/i });
    userEvent.click(quickEntryBtn);

    // Wait for product picker input to appear
    const picker = await screen.findByPlaceholderText(/Type a name or code/i);
    expect(picker).toBeInTheDocument();

    // Select product from picker
    const productOption = await screen.findByRole('button', { name: /Sugar 1kg/i });
    userEvent.click(productOption);

    // Should appear in table
    expect(await screen.findByText('Sugar 1kg')).toBeInTheDocument();
    expect(screen.getByText(/Total items:/i)).toBeInTheDocument();
  });

  test('calls bulkUpdateStock and notifies on submit', async () => {
    bulkUpdateStock.mockResolvedValue({
      warehouse: 'Store A',
      updatedCount: 1,
      unchangedCount: 0,
      reconciliation: 'MAT-RECO-001',
    });

    const { onSaved, onClose } = renderDialog();
    userEvent.click(screen.getByRole('radio', { name: /Quick/i }));

    const productOption = await screen.findByRole('button', { name: /Sugar 1kg/i });
    userEvent.click(productOption);

    const submitBtn = await screen.findByRole('button', { name: /Update stock \(1\)/i });
    userEvent.click(submitBtn);

    await waitFor(() => {
      expect(bulkUpdateStock).toHaveBeenCalledWith(
        expect.objectContaining({
          store: 'Store A',
          mode: 'set',
          items: expect.arrayContaining([
            expect.objectContaining({ item_code: 'ITEM-1' }),
          ]),
        })
      );
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('shows what the store holds now, as the server reports it, and the difference', async () => {
    currentStock.mockResolvedValue({ 'ITEM-1': 4 });
    renderDialog();
    userEvent.click(screen.getByRole('radio', { name: /Quick/i }));
    userEvent.click(await screen.findByRole('button', { name: /Sugar 1kg/i }));

    // The picker said 10; the server says the store holds 4, so the new figure (10) is a rise of 6
    expect(await screen.findByText('+6')).toBeInTheDocument();
    expect(currentStock).toHaveBeenCalledWith({ codes: ['ITEM-1'], store: 'Store A' });
  });

  test('says in plain words what each update type does', async () => {
    renderDialog();
    expect(screen.getByText(/becomes the stock in the store/i)).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: /Add or take away/i }));
    expect(screen.getByText(/Put a minus sign in front to take stock away/i)).toBeInTheDocument();
  });
});
