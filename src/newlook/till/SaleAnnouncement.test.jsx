/**
 * "Sale complete, KES 100" (Accessibility rules, Messages): a polite live region at the till, only while the New look is on.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import SaleAnnouncement, { ANNOUNCE_DELAY_MS } from './SaleAnnouncement';
import ReceiptDialog from '../../pages/Sales/pos/ReceiptDialog';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../components/Common/PrintButton', () => ({ __esModule: true, default: () => null }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const invoice = { name: 'ACC-PSINV-2026-00004', grand_total: 100 };
const saleData = { items: [{ item_code: 'A', item_name: 'Foam roller', qty: 1, rate: 100, subtotal: 100, uom: 'Nos' }], customer: 'Walk-in', paymentMode: 'Cash', amountGiven: 100, grandTotal: 100, payments: [], timestamp: new Date('2026-10-18T10:00:00') };

describe('SaleAnnouncement', () => {
  it('is a polite live region that is on the page before it speaks, then says the sale and the amount', () => {
    render(<SaleAnnouncement total={100} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');
    act(() => jest.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region).toHaveTextContent('Sale complete, KES 100');
  });

  it('is kept off the screen but not hidden from a screen reader', () => {
    render(<SaleAnnouncement total={2350} />);
    const region = screen.getByRole('status');
    expect(region).toHaveClass('nl-visually-hidden');
    expect(region).not.toHaveAttribute('aria-hidden');
    act(() => jest.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region).toHaveTextContent('Sale complete, KES 2,350');
  });

  it('says cents when there are cents, and never a dollar sign', () => {
    render(<SaleAnnouncement total={99.5} />);
    act(() => jest.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent('Sale complete, KES 99.50');
  });

  it('does not speak after the sale screen is gone', () => {
    const { unmount } = render(<SaleAnnouncement total={100} />);
    unmount();
    expect(() => act(() => jest.advanceTimersByTime(ANNOUNCE_DELAY_MS))).not.toThrow();
  });
});

describe('the receipt dialog', () => {
  const dialog = (props) => <ReceiptDialog open invoice={invoice} saleData={saleData} companyName="Demo Shop" cashierName="Amina" currency="KES" onNewSale={() => {}} onPrint={() => {}} onViewInvoice={() => {}} {...props} />;

  it('has no live region of its own while the New look is off (nothing new is announced)', () => {
    render(dialog());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('carries the announcement inside the dialog when one is passed, so it is spoken even though the page behind is hidden', () => {
    render(dialog({ announcement: <SaleAnnouncement total={100} /> }));
    act(() => jest.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Sale complete, KES 100');
    expect(screen.getByRole('dialog')).toContainElement(region);
  });
});
