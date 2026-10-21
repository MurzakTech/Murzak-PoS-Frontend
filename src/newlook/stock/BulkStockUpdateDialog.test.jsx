import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import BulkStockUpdateDialog from './BulkStockUpdateDialog';
import { bulkUpdateStock, findProducts } from '../../api/stockLevelsApi';

jest.mock('../../api/stockLevelsApi', () => ({
  bulkUpdateStock: jest.fn(),
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
});
