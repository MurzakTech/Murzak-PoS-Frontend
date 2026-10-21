import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesReturnDialog from './SalesReturnDialog';
import { createSalesReturn } from '../../store/salesSlice';
import { getSale } from '../../api/salesListApi';

const mockDispatch = jest.fn();
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('../../store/salesSlice', () => ({
  createSalesReturn: jest.fn((payload) => ({ type: 'sales/createSalesReturn', payload })),
}));

jest.mock('../../api/salesListApi', () => ({
  getSale: jest.fn(),
}));

const SAMPLE_SALE = {
  id: 'ACC-SINV-2026-00001',
  doctype: 'Sales Invoice',
  receipt: '#0001',
  customer: { name: 'Jane Doe', mobile: '0712345678' },
  lines: [
    { item_code: 'ITEM-01', item_name: 'Sugar 1kg', qty: 3, rate: 150, amount: 450 },
    { item_code: 'ITEM-02', item_name: 'Rice 2kg', qty: 2, rate: 300, amount: 600 },
  ],
};

describe('SalesReturnDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with pre-filled sale items and calculates refund', () => {
    render(<SalesReturnDialog sale={SAMPLE_SALE} onClose={jest.fn()} onDone={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Record return' })).toBeInTheDocument();
    expect(screen.getByText('Sugar 1kg')).toBeInTheDocument();
    expect(screen.getByText('Rice 2kg')).toBeInTheDocument();
    // 3 * 150 + 2 * 300 = 1050
    expect(screen.getByText(/1,050/)).toBeInTheDocument();
  });

  test('toggling item checkbox updates total refund', () => {
    render(<SalesReturnDialog sale={SAMPLE_SALE} onClose={jest.fn()} onDone={jest.fn()} />);

    const sugarCheckbox = screen.getByRole('checkbox', { name: /Sugar 1kg/i });
    userEvent.click(sugarCheckbox);

    // Only Rice is selected: 2 * 300 = 600
    expect(screen.getAllByText(/600/).length).toBeGreaterThanOrEqual(1);
  });

  test('submitting dispatches createSalesReturn and calls onDone', async () => {
    mockDispatch.mockImplementation(async (action) => ({
      type: 'sales/createSalesReturn/fulfilled',
      payload: { name: 'ACC-SINV-RET-0001' },
    }));

    const onDone = jest.fn();
    render(<SalesReturnDialog sale={SAMPLE_SALE} onClose={jest.fn()} onDone={onDone} />);

    const reasonInput = screen.getByLabelText(/Reason for return/i);
    userEvent.type(reasonInput, 'Customer changed mind');

    const submitBtn = screen.getByRole('button', { name: 'Record return' });
    userEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSalesReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'Jane Doe',
          return_against: 'ACC-SINV-2026-00001',
          reason: 'Customer changed mind',
          items: [
            { item_code: 'ITEM-01', item_name: 'Sugar 1kg', qty: 3, rate: 150 },
            { item_code: 'ITEM-02', item_name: 'Rice 2kg', qty: 2, rate: 300 },
          ],
        })
      );
    });

    expect(onDone).toHaveBeenCalled();
  });

  test('standalone mode allows finding invoice by number', async () => {
    getSale.mockResolvedValue(SAMPLE_SALE);

    render(<SalesReturnDialog sale={null} onClose={jest.fn()} onDone={jest.fn()} />);

    const input = screen.getByLabelText(/Invoice or Receipt number/i);
    userEvent.type(input, '#0001');

    const findBtn = screen.getByRole('button', { name: 'Find invoice' });
    userEvent.click(findBtn);

    await waitFor(() => {
      expect(getSale).toHaveBeenCalledWith('#0001');
      expect(screen.getByText('Sugar 1kg')).toBeInTheDocument();
    });
  });
});
