/**
 * P6-4: with the New look on, the till says "piece" for "Nos", puts a space after KES, and words a few buttons as a verb and its object.
 * With the New look off the same pieces say exactly what they said before.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { lightTheme } from '../../../theme';
import { NewLookContext } from '../../../newlook/NewLookProvider';
import ProductPanel from './ProductPanel';
import OrderPanel from './OrderPanel';
import ReceiptDialog from './ReceiptDialog';
import PhoneSaleBar from './PhoneSaleBar';
import HeldSalesDialog from './HeldSalesDialog';
import OfflineSalesBar from './OfflineSalesBar';
import NotFound from '../../NotFound';
import { BrandContext } from '../../../newlook/brand/BrandProvider';

jest.mock('../../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Demo Shop' } }) } });
const withLook = (enabled, ui) => (
  <Provider store={store}>
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <NewLookContext.Provider value={{ enabled, status: 'ready', company: 'Demo', setEnabled: async () => true }}>{ui}</NewLookContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  </Provider>
);

const CART = [{ item_code: 'A', item_name: 'Foam roller', qty: 1, rate: 1250, uom: 'Nos', discount_amount: 0, warehouse: '' }];
const TOTALS = { itemsTotal: 1250, itemDiscount: 0, manualDiscount: 0, loyaltyDiscount: 0, grandTotal: 1250 };
const orderPanel = (extra = {}) => (
  <OrderPanel
    cart={CART}
    readOnly={false}
    currency="KES"
    customer="Walk-in customer"
    onCustomerClick={() => {}}
    onInc={() => {}}
    onDec={() => {}}
    onSetQty={() => {}}
    onRemove={() => {}}
    warehouses={[]}
    defaultWarehouse=""
    onChangeWarehouse={() => {}}
    totals={TOTALS}
    manualDiscountType="percentage"
    manualDiscountValue={0}
    onManualDiscountChange={() => {}}
    onCheckout={() => {}}
    onHold={() => {}}
    onClear={() => {}}
    {...extra}
  />
);

describe('the product tile', () => {
  const panel = () => (
    <ProductPanel
      searchTerm=""
      setSearchTerm={() => {}}
      searchInputRef={{ current: null }}
      onSearchEnter={() => {}}
      categories={[]}
      selectedCategory="All"
      setSelectedCategory={() => {}}
      products={[{ item_code: 'A', item_name: 'Foam roller', item_group: 'Gear' }]}
      visibleCount={50}
      onShowMore={() => {}}
      isLoading={false}
      hasStore
      addToCart={() => {}}
      getTileData={() => ({ price: 1250, originalPrice: null, discountLabel: null, stockQty: 10, cartQty: 0, uom: 'Nos' })}
    />
  );

  test('New look: "per piece"', () => {
    render(withLook(true, panel()));
    expect(screen.getByText('per piece')).toBeInTheDocument();
    expect(screen.queryByText(/Nos/)).not.toBeInTheDocument();
  });

  test('old look: unchanged', () => {
    render(withLook(false, panel()));
    expect(screen.getByText('per Nos')).toBeInTheDocument();
  });
});

describe('the sale in progress', () => {
  test('New look: the unit is a plain word, and the total has a space after KES', () => {
    render(withLook(true, orderPanel()));
    expect(screen.getByText('piece')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^KES 1,250$/);
  });

  test('New look: the discount form has verbs and objects', () => {
    render(withLook(true, orderPanel({ manualDiscountValue: 10, totals: { ...TOTALS, manualDiscount: 125 } })));
    userEvent.click(screen.getByRole('button', { name: /Change discount/ }));
    expect(screen.getByRole('button', { name: 'Apply discount' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove discount' })).toBeInTheDocument();
  });

  test('old look: unchanged', () => {
    render(withLook(false, orderPanel()));
    expect(screen.getByText('Nos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^KES1,250$/);
    userEvent.click(screen.getByRole('button', { name: /Add discount/ }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  test('a read-only line says "1 piece" and "12 pieces"', () => {
    render(withLook(true, orderPanel({ readOnly: true, cart: [{ ...CART[0], qty: 12 }, { ...CART[0], item_code: 'B', item_name: 'Oil', qty: 1 }] })));
    expect(screen.getByText('12 pieces')).toBeInTheDocument();
    expect(screen.getByText('1 piece')).toBeInTheDocument();
  });
});

describe('the button that takes payment', () => {
  test('New look: Pay, with the total', () => {
    render(withLook(true, orderPanel()));
    expect(screen.getByRole('button', { name: /^Pay KES 1,250/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Charge/ })).not.toBeInTheDocument();
  });
  test('New look: Pay on its own while the sale is empty', () => {
    render(withLook(true, orderPanel({ cart: [], totals: { ...TOTALS, itemsTotal: 0, grandTotal: 0 } })));
    expect(screen.getByRole('button', { name: /^Pay$/ })).toBeDisabled();
  });
  test('old look: unchanged, Charge', () => {
    render(withLook(false, orderPanel()));
    expect(screen.getByRole('button', { name: /^Charge KES\s?1,250/ })).toBeInTheDocument();
  });
  test('the phone bar says Pay in the New look and Charge in the old look', () => {
    const bar = () => <PhoneSaleBar itemCount={2} total={1250} currency="KES" onViewSale={() => {}} onCharge={() => {}} />;
    const { unmount } = render(withLook(true, bar()));
    expect(screen.getByRole('button', { name: /^Pay KES 1,250/ })).toBeInTheDocument();
    unmount();
    render(withLook(false, bar()));
    expect(screen.getByRole('button', { name: /^Charge KES\s?1,250/ })).toBeInTheDocument();
  });
});

describe('the receipt after a sale', () => {
  const receipt = () => (
    <ReceiptDialog
      open
      invoice={{ name: 'ACC-PSINV-2026-00099', grand_total: 1250 }}
      saleData={{ items: CART.map((i) => ({ ...i, subtotal: 1250 })), paymentMode: 'Cash', amountGiven: 1500, grandTotal: 1250, timestamp: new Date('2026-10-18T14:52:00') }}
      companyName="Demo Shop"
      cashierName="Amina Wanjiku"
      currency="KES"
      onNewSale={() => {}}
      onPrint={() => {}}
      onViewInvoice={() => {}}
    />
  );
  test('New look: the quantity line uses the plain unit', () => {
    render(withLook(true, receipt()));
    expect(screen.getByText('1 piece x 1,250')).toBeInTheDocument();
  });
  test('old look: unchanged', () => {
    render(withLook(false, receipt()));
    expect(screen.getByText('1 Nos x 1,250')).toBeInTheDocument();
  });
  test('New look: the short number leads and the full system reference follows', () => {
    render(withLook(true, receipt()));
    expect(screen.getByText('#0099')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('ACC-PSINV-2026-00099')).toBeInTheDocument();
  });
  test('old look: the system number only, as before', () => {
    render(withLook(false, receipt()));
    expect(screen.getByText('ACC-PSINV-2026-00099')).toBeInTheDocument();
    expect(screen.queryByText('#0099')).not.toBeInTheDocument();
    expect(screen.queryByText('Reference')).not.toBeInTheDocument();
  });
});

describe('held sales', () => {
  const dialog = () => <HeldSalesDialog open held={[]} canRecall currency="KES" now={new Date()} onClose={() => {}} onRecall={() => {}} onDelete={() => {}} onRename={() => {}} />;
  test('New look: the closing button is "Close"', () => {
    render(withLook(true, dialog()));
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });
  test('old look: "Done"', () => {
    render(withLook(false, dialog()));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('the offline bar', () => {
  const sale = { id: 'OFF-1', soldAt: '18/10/2026 14:52', status: 'pending', payload: { items: [{}], customer: 'Walk-in customer' }, receipt: { grandTotal: 800 } };
  const bar = () => <OfflineSalesBar online={false} syncing={false} sales={[sale]} pending={[sale]} needsAttention={[]} onSyncNow={() => {}} />;
  test('New look: "1 item", never "item(s)"', () => {
    render(withLook(true, bar()));
    userEvent.click(screen.getByRole('button', { name: 'View' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/1 item ·/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/item\(s\)/)).not.toBeInTheDocument();
  });
  test('old look: unchanged', () => {
    render(withLook(false, bar()));
    userEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(within(screen.getByRole('dialog')).getByText(/1 item\(s\)/)).toBeInTheDocument();
  });
});

describe('a page that does not exist', () => {
  test('New look: no error number, one way forward', () => {
    render(withLook(true, <NotFound />));
    expect(screen.getByRole('heading', { name: 'We could not find that page' })).toBeInTheDocument();
    expect(screen.queryByText('404')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
  });
  test('old look: unchanged', () => {
    render(withLook(false, <NotFound />));
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});

describe('the shop receipt after a sale (ticket P7-3)', () => {
  const brand = { logo: '/files/logo.png', accent: 'teal', tagline: 'Fresh every day', footer: 'Exchange within 7 days', style: 'a4', social: '@demoshop', website: 'www.demoshop.co.ke' };
  const business = { companyName: 'Demo Shop', taxId: 'P000000000A', address: { line1: '1 Test Road', city: 'Nairobi', pincode: '00100' }, phone: '0711000000' };
  const sale = () => (
    <ReceiptDialog
      open
      invoice={{ name: 'ACC-PSINV-2026-00099', grand_total: 1250 }}
      saleData={{ items: CART.map((i) => ({ ...i, subtotal: 1250 })), payments: [{ mode_of_payment: 'Cash', amount: 1250 }], paymentMode: 'Cash', amountGiven: 1500, grandTotal: 1250, timestamp: new Date('2026-10-18T14:52:00') }}
      companyName="Demo Shop"
      cashierName="Amina Wanjiku"
      currency="KES"
      onNewSale={() => {}}
      onPrint={() => {}}
      onViewInvoice={() => {}}
    />
  );
  test('New look: the dialog shows the shop header, the footer and the chosen style', () => {
    render(withLook(true, <BrandContext.Provider value={{ brand, business, status: 'ready', applySaved: () => {} }}>{sale()}</BrandContext.Provider>));
    expect(screen.getByRole('article', { name: 'Sales receipt' })).toHaveClass('nl-rcpt--a4');
    expect(screen.getByText('KRA PIN: P000000000A')).toBeInTheDocument();
    expect(screen.getByText('Fresh every day')).toBeInTheDocument();
    expect(screen.getByText('Exchange within 7 days')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Payments')).getByText('Change')).toBeInTheDocument();
    expect(screen.getByLabelText('Payments')).toHaveTextContent('KES 250');
  });
  test('New look with no brand set up: a plain receipt, nothing missing that matters', () => {
    render(withLook(true, sale()));
    expect(screen.getByRole('article', { name: 'Sales receipt' })).toHaveClass('nl-rcpt--thermal80');
    expect(screen.getByText('#0099')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });
  test('old look: the receipt is exactly as before, whatever the brand', () => {
    render(withLook(false, <BrandContext.Provider value={{ brand, business, status: 'ready', applySaved: () => {} }}>{sale()}</BrandContext.Provider>));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Fresh every day')).not.toBeInTheDocument();
    expect(screen.getByText('Thank you for shopping with us.')).toBeInTheDocument();
  });
});
