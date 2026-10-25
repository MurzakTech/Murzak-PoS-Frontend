import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseReturnDialog from './PurchaseReturnDialog';
import { createPurchaseReturn, getPurchase } from '../../api/purchasesListApi';

jest.mock('../../api/purchasesListApi', () => ({
  createPurchaseReturn: jest.fn(),
  getPurchase: jest.fn(),
}));

const SAMPLE_PURCHASE = {
  id: 'PUR-ORD-2026-00001',
  number: '#O0001',
  return_target: 'ACC-PINV-2026-00001',
  supplier: { id: 'SUP-01', name: 'Bidco Africa' },
  lines: [
    { item_code: 'OIL-01', item_name: 'Cooking Oil 5L', received: 10, rate: 1200 },
    { item_code: 'FLR-01', item_name: 'Baking Flour 2kg', received: 5, rate: 200 },
  ],
};

describe('PurchaseReturnDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders pre-filled purchase items and calculates return value', () => {
    render(
      <PurchaseReturnDialog
        purchase={SAMPLE_PURCHASE}
        company="Linda mwananchi"
        onClose={jest.fn()}
        onDone={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Record purchase return' })).toBeInTheDocument();
    expect(screen.getByText('Cooking Oil 5L')).toBeInTheDocument();
    expect(screen.getByText('Baking Flour 2kg')).toBeInTheDocument();
    // 10 * 1200 + 5 * 200 = 13000
    expect(screen.getByText(/13,000/)).toBeInTheDocument();
  });

  test('toggling item checkbox updates total value', () => {
    render(
      <PurchaseReturnDialog
        purchase={SAMPLE_PURCHASE}
        company="Linda mwananchi"
        onClose={jest.fn()}
        onDone={jest.fn()}
      />
    );

    const oilCheckbox = screen.getByRole('checkbox', { name: /Cooking Oil 5L/i });
    userEvent.click(oilCheckbox);

    // Only Flour: 5 * 200 = 1000
    expect(screen.getAllByText(/1,000/).length).toBeGreaterThanOrEqual(1);
  });

  test('submitting calls createPurchaseReturn and triggers onDone', async () => {
    createPurchaseReturn.mockResolvedValue({ success: true, name: 'ACC-PINV-RET-0001' });
    const onDone = jest.fn();

    render(
      <PurchaseReturnDialog
        purchase={SAMPLE_PURCHASE}
        company="Linda mwananchi"
        onClose={jest.fn()}
        onDone={onDone}
      />
    );

    const reasonInput = screen.getByLabelText(/Reason for return/i);
    userEvent.type(reasonInput, 'Damaged during delivery');

    const submitBtn = screen.getByRole('button', { name: 'Record return' });
    userEvent.click(submitBtn);

    await waitFor(() => {
      expect(createPurchaseReturn).toHaveBeenCalledWith({
        returnAgainst: 'ACC-PINV-2026-00001',
        items: [
          { item_code: 'OIL-01', item_name: 'Cooking Oil 5L', qty: 10, rate: 1200 },
          { item_code: 'FLR-01', item_name: 'Baking Flour 2kg', qty: 5, rate: 200 },
        ],
        remarks: 'Damaged during delivery',
        company: 'Linda mwananchi',
      });
    });

    expect(onDone).toHaveBeenCalled();
  });

  test('standalone mode allows finding purchase by number', async () => {
    getPurchase.mockResolvedValue(SAMPLE_PURCHASE);

    render(
      <PurchaseReturnDialog
        purchase={null}
        company="Linda mwananchi"
        onClose={jest.fn()}
        onDone={jest.fn()}
      />
    );

    const input = screen.getByLabelText(/Purchase or Bill number/i);
    userEvent.type(input, '#O0001');

    const findBtn = screen.getByRole('button', { name: 'Find purchase' });
    userEvent.click(findBtn);

    await waitFor(() => expect(getPurchase).toHaveBeenCalledWith('#O0001', undefined, 'Linda mwananchi'));
    expect(await screen.findByText('Cooking Oil 5L')).toBeInTheDocument();
  });
});
