import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '../../../theme';
import OrderPanel from './OrderPanel';
import { packageAppointmentForTill } from '../../../newlook/appointments/appointmentsModel';

const renderWithTheme = (ui) => render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);

describe('Clinical and Appointment Cart Ingestion & OrderPanel UI', () => {
  const sampleAppointment = {
    name: 'APT-100',
    customer_name: 'Kelvin Mwangi',
    customer_phone: '0700123456',
    staff: 'Stylist Lucy',
    services: [
      { item_code: 'HAIR-TREATMENT', item_name: 'Deep Conditioning & Styling', rate: 2500 },
    ],
  };

  test('packageAppointmentForTill packages customer, staff, and services for the Till', () => {
    const payload = packageAppointmentForTill(sampleAppointment);
    expect(payload.source).toBe('appointment');
    expect(payload.customer_name).toBe('Kelvin Mwangi');
    expect(payload.customer_phone).toBe('0700123456');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toEqual({
      item_code: 'HAIR-TREATMENT',
      item_name: 'Deep Conditioning & Styling',
      rate: 2500,
      qty: 1,
      staff: 'Stylist Lucy',
      is_service: true,
    });
  });

  test('OrderPanel renders "Clinical Rx" button when onOpenClinicalRx is provided', () => {
    const onOpenClinicalRx = jest.fn();
    renderWithTheme(
      <OrderPanel
        cart={[]}
        readOnly={false}
        currency="KES"
        customer={{ name: 'Kelvin Mwangi', detail: '0700123456' }}
        onCustomerClick={() => {}}
        onInc={() => {}}
        onDec={() => {}}
        onSetQty={() => {}}
        onRemove={() => {}}
        warehouses={[]}
        defaultWarehouse=""
        onChangeWarehouse={() => {}}
        totals={{ itemsTotal: 0, itemDiscount: 0, manualDiscount: 0, loyaltyDiscount: 0, grandTotal: 0 }}
        manualDiscountType="percentage"
        manualDiscountValue={0}
        onManualDiscountChange={() => {}}
        onCheckout={() => {}}
        onHold={() => {}}
        onClear={() => {}}
        onOpenClinicalRx={onOpenClinicalRx}
      />
    );

    const rxBtn = screen.getByRole('button', { name: 'Clinical Rx' });
    expect(rxBtn).toBeInTheDocument();
    fireEvent.click(rxBtn);
    expect(onOpenClinicalRx).toHaveBeenCalledTimes(1);
  });

  test('OrderPanel displays staff and FEFO batch chips on cart lines', () => {
    const clinicalCart = [
      {
        item_code: 'HAIR-TREATMENT',
        item_name: 'Deep Conditioning & Styling',
        rate: 2500,
        qty: 1,
        subtotal: 2500,
        staff: 'Stylist Lucy',
        discount_amount: 0,
      },
      {
        item_code: 'AMOX-500',
        item_name: 'Amoxicillin 500mg',
        rate: 50,
        qty: 20,
        subtotal: 1000,
        batch_no: 'B2026-X9',
        expiry_date: '2026-12-31',
        prescription_only: true,
        discount_amount: 0,
      },
    ];

    renderWithTheme(
      <OrderPanel
        cart={clinicalCart}
        readOnly={false}
        currency="KES"
        customer={{ name: 'Jane Doe', detail: 'Walk-in' }}
        onCustomerClick={() => {}}
        onInc={() => {}}
        onDec={() => {}}
        onSetQty={() => {}}
        onRemove={() => {}}
        warehouses={[]}
        defaultWarehouse=""
        onChangeWarehouse={() => {}}
        totals={{ itemsTotal: 3500, itemDiscount: 0, manualDiscount: 0, loyaltyDiscount: 0, grandTotal: 3500 }}
        manualDiscountType="percentage"
        manualDiscountValue={0}
        onManualDiscountChange={() => {}}
        onCheckout={() => {}}
        onHold={() => {}}
        onClear={() => {}}
      />
    );

    // Verify staff attribution chip
    expect(screen.getByText('Staff: Stylist Lucy')).toBeInTheDocument();

    // Verify Rx only chip and FEFO batch chip
    expect(screen.getByText('Rx only')).toBeInTheDocument();
    expect(screen.getByText(/Batch: B2026-X9 \(Exp: 2026-12-31\)/)).toBeInTheDocument();
  });
});
