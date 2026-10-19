/* eslint-disable testing-library/no-node-access -- a total or payment row is found from its own label with nextSibling (the amount beside it), because a term and its amount have no role or label of their own */
/** The sale receipt (ticket P7-3): what each part shows, what is left out when there is nothing to say, and the three styles. */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Receipt from './Receipt';
import T from '../brand/strings.brand';

const RECEIPT = {
  number: '#0045',
  reference: 'ACC-PSINV-2026-00045',
  when: '21 Oct 2026, 14:32',
  cashier: 'Amina',
  customer: 'Wanjiru',
  lines: [
    { name: 'Maize flour', qty: 2, unitWord: 'packets', rate: 180, amount: 360, offer: 0 },
    { name: 'Cooking oil', qty: 1, unitWord: 'bottle', rate: 340, amount: 320, offer: 20 },
  ],
  totals: { subtotal: 700, discount: 0, offers: 20, tax: 90, total: 680, paid: 700, change: 20, outstanding: 0, cashGiven: 700 },
  payments: [
    { label: 'Cash', amount: 400, reference: '' },
    { label: 'M-Pesa', amount: 300, reference: 'QWE123RTY4' },
  ],
};
const BUSINESS = { companyName: 'Demo Shop', taxId: 'P000000000A', address: { line1: '1 Test Road', line2: '', city: 'Nairobi', pincode: '00100' }, phone: '0711000000' };
const BRAND = { logo: '/files/logo.png', accent: 'teal', tagline: 'Fresh every day', footer: 'Goods once sold can be exchanged within 7 days', social: '@demoshop', website: 'www.demoshop.co.ke' };

const show = (props = {}) => render(<Receipt receipt={RECEIPT} brand={BRAND} business={BUSINESS} {...props} />);

test('the header has the logo, shop name, tagline, address, phone and KRA PIN', () => {
  show();
  expect(screen.getByRole('img', { name: 'Logo of Demo Shop' })).toHaveAttribute('src', expect.stringContaining('/files/logo.png'));
  expect(screen.getByText('Demo Shop')).toBeInTheDocument();
  expect(screen.getByText('Fresh every day')).toBeInTheDocument();
  expect(screen.getByText('1 Test Road')).toBeInTheDocument();
  expect(screen.getByText('Nairobi 00100')).toBeInTheDocument();
  expect(screen.getByText('Tel: 0711 000 000')).toBeInTheDocument();
  expect(screen.getByText('KRA PIN: P000000000A')).toBeInTheDocument();
});

test('a plain shop (nothing set, nothing loaded) still has a title, number and totals, and no empty lines', () => {
  render(<Receipt receipt={{ ...RECEIPT, reference: '', when: '', cashier: '' }} />);
  expect(screen.getByRole('heading', { name: 'Sales receipt' })).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.queryByText(/KRA PIN/)).not.toBeInTheDocument();
  expect(screen.queryByText(/^Tel/)).not.toBeInTheDocument();
  expect(screen.queryByText('Served by')).not.toBeInTheDocument();
});

test('the short number leads and the full reference sits under it', () => {
  show();
  expect(screen.getByText('#0045')).toBeInTheDocument();
  expect(screen.getByText('Reference')).toBeInTheDocument();
  expect(screen.getByText('ACC-PSINV-2026-00045')).toBeInTheDocument();
});

test('date, cashier and customer are shown; a missing customer reads Walk-in customer', () => {
  const { unmount } = show();
  expect(screen.getByText('21 Oct 2026, 14:32')).toBeInTheDocument();
  expect(screen.getByText('Amina')).toBeInTheDocument();
  expect(screen.getByText('Wanjiru')).toBeInTheDocument();
  unmount();
  show({ receipt: { ...RECEIPT, customer: '' } });
  expect(screen.getByText('Walk-in customer')).toBeInTheDocument();
});

test('the items are a real table with quantity by price, the line total and an offer line', () => {
  show();
  const table = screen.getByRole('table', { name: 'Items sold' });
  expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Item', 'Qty', 'Price', 'Amount']);
  expect(within(table).getByText('2 packets x 180')).toBeInTheDocument();
  expect(within(table).getByText('Offer: -20')).toBeInTheDocument();
  expect(within(table).getByText('360')).toBeInTheDocument();
});

test('the totals show subtotal, offers and tax lines when they exist, then TOTAL in KES', () => {
  show();
  const totals = screen.getByLabelText('Totals');
  expect(within(totals).getByText('Subtotal').nextSibling).toHaveTextContent('KES 700');
  expect(within(totals).getByText('Offers').nextSibling).toHaveTextContent('-KES 20');
  expect(within(totals).getByText('Tax (VAT)').nextSibling).toHaveTextContent('KES 90');
  expect(within(totals).getByText('TOTAL').nextSibling).toHaveTextContent('KES 680');
});

test('a sale with no tax and no offers has no tax line and no subtotal', () => {
  show({ receipt: { ...RECEIPT, totals: { total: 680 } } });
  const totals = screen.getByLabelText('Totals');
  expect(within(totals).queryByText('Tax (VAT)')).not.toBeInTheDocument();
  expect(within(totals).queryByText('Subtotal')).not.toBeInTheDocument();
});

test('payments are listed by method with the M-Pesa code, then cash given and change', () => {
  show();
  const pay = screen.getByLabelText('Payments');
  expect(within(pay).getByText('Cash').nextSibling).toHaveTextContent('KES 400');
  expect(within(pay).getByText('M-Pesa (Code QWE123RTY4)').nextSibling).toHaveTextContent('KES 300');
  expect(within(pay).getByText('Cash given').nextSibling).toHaveTextContent('KES 700');
  expect(within(pay).getByText('Change').nextSibling).toHaveTextContent('KES 20');
});

test('money still owed is shown as Still to pay', () => {
  show({ receipt: { ...RECEIPT, totals: { ...RECEIPT.totals, change: 0, outstanding: 80, cashGiven: 0 } } });
  expect(screen.getByText('Still to pay').nextSibling).toHaveTextContent('KES 80');
});

test('the footer has the shop message, the thank you and the social name and website', () => {
  show();
  expect(screen.getByText('Goods once sold can be exchanged within 7 days')).toBeInTheDocument();
  expect(screen.getByText('Thank you for shopping with us.')).toBeInTheDocument();
  expect(screen.getByText(/@demoshop/)).toHaveTextContent('www.demoshop.co.ke');
});

test('a return and an offline sale have their own titles', () => {
  const { unmount } = show({ receipt: { ...RECEIPT, isReturn: true } });
  expect(screen.getByRole('heading', { name: 'Return receipt' })).toBeInTheDocument();
  unmount();
  show({ receipt: { ...RECEIPT, offline: true, reference: '' } });
  expect(screen.getByRole('heading', { name: 'Sales receipt, recorded offline' })).toBeInTheDocument();
});

describe('the three styles', () => {
  test.each([
    ['thermal80', '80mm 297mm'],
    ['thermal58', '58mm 297mm'],
    ['a4', 'A4'],
  ])('%s carries its own class and sets its page size', (style, size) => {
    show({ style });
    const receipt = screen.getByRole('article', { name: 'Sales receipt' });
    expect(receipt).toHaveClass(`nl-rcpt--${style}`);
    expect(document.querySelector('style').textContent).toContain(`size: ${size}`);
  });
  test('the accent is carried only as a colour NAME, from the palette', () => {
    show({ style: 'a4' });
    expect(screen.getByRole('article')).toHaveAttribute('data-swatch', 'teal');
  });
  test('the preview on Settings leaves the paper size alone', () => {
    show({ style: 'a4', pageSize: false });
    expect(document.querySelector('style')).toBeNull();
  });
  test('the sample receipt of the Brand page draws in every style', () => {
    ['thermal80', 'thermal58', 'a4'].forEach((style) => {
      const { unmount } = render(<Receipt receipt={T.sample} style={style} pageSize={false} />);
      expect(screen.getByText('Maize flour 2 kg')).toBeInTheDocument();
      unmount();
    });
  });
});
