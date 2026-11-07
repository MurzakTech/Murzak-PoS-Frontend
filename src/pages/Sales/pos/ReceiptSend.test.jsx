import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ReceiptDialog from './ReceiptDialog';

jest.mock('../../../components/Common/PrintButton', () => () => null);
jest.mock('../../../newlook/NewLookProvider', () => ({ useNewLook: () => ({ enabled: false }) }));
jest.mock('../../../newlook/brand/BrandProvider', () => ({ useBrand: () => ({ brand: {}, business: {} }) }));

const base = {
  open: true,
  invoice: { name: 'ACC-PSINV-2026-00050', grand_total: 150 },
  saleData: { items: [], grandTotal: 150, paymentMode: 'Cash', amountGiven: 150, timestamp: new Date('2026-11-04T10:00:00') },
  companyName: 'Linda mwananchi',
  cashierName: 'Amina',
  currency: 'KES',
  onNewSale: () => {},
  onPrint: () => {},
  onViewInvoice: () => {},
};

const show = (props) => render(<ThemeProvider theme={createTheme()}><ReceiptDialog {...base} {...props} /></ThemeProvider>);

test('a customer with a mobile number can be sent the receipt on WhatsApp', () => {
  show({ customerMobile: '+254712345678' });
  const link = screen.getByRole('link', { name: 'Send the receipt on WhatsApp' });
  expect(link.getAttribute('href')).toContain('https://wa.me/254712345678');
});

test('without a mobile number there is nothing to send', () => {
  show({});
  expect(screen.queryByRole('link', { name: 'Send the receipt on WhatsApp' })).not.toBeInTheDocument();
});
