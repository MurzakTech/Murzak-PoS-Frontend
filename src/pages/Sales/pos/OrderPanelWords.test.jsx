import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '../../../theme';
import OrderPanel from './OrderPanel';

const panel = (props = {}) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <OrderPanel
        cart={[{ item_code: 'BURGER', item_name: 'Beef burger', qty: 1, rate: 700, subtotal: 700, options_text: 'Well done; Extra cheese (+50)' }]}
        readOnly={false}
        currency="KES"
        customer={{ name: 'Walk-in', detail: '' }}
        onCustomerClick={() => {}}
        onInc={() => {}}
        onDec={() => {}}
        onSetQty={() => {}}
        onRemove={() => {}}
        warehouses={[]}
        defaultWarehouse=""
        onChangeWarehouse={() => {}}
        totals={{ itemsTotal: 700, itemDiscount: 0, manualDiscount: 0, loyaltyDiscount: 0, grandTotal: 700 }}
        manualDiscountType="percentage"
        manualDiscountValue={0}
        onManualDiscountChange={() => {}}
        onCheckout={() => {}}
        onHold={() => {}}
        onClear={() => {}}
        {...props}
      />
    </ThemeProvider>
  );

test('a restaurant till settles a bill for a guest, and shows the dish options', () => {
  panel({ words: { charge: 'Settle bill', customer: 'Guest' } });
  expect(screen.getByRole('button', { name: /Settle bill/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Guest: Walk-in/ })).toBeInTheDocument();
  expect(screen.getByText('Well done; Extra cheese (+50)')).toBeInTheDocument();
});

test('a general shop keeps the words it had', () => {
  panel();
  expect(screen.getByRole('button', { name: /^Pay KES/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Customer: Walk-in/ })).toBeInTheDocument();
});
