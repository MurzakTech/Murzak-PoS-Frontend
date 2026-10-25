import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  ShopNotFoundError,
  getShop,
  listShopProducts,
  payForOrder,
  placeOrder,
  quoteDelivery,
  trackOrder,
} from '../../api/storefrontApi';
import { saveCart, loadCart } from './cart';
import { recallOrder, rememberOrder } from './orderMemory';
import ShopApp from './ShopApp';
import TrackPage from './TrackPage';

jest.mock('../../api/storefrontApi', () => {
  class ShopNotFoundError extends Error {}
  return {
    __esModule: true,
    ShopNotFoundError,
    getShop: jest.fn(),
    listShopProducts: jest.fn(),
    quoteDelivery: jest.fn(),
    placeOrder: jest.fn(),
    payForOrder: jest.fn(),
    trackOrder: jest.fn(),
  };
});
// The picture needs the app's theme; the tests are about the shop, not the artwork
jest.mock('../../components/Common/ProductImage', () => ({ __esModule: true, default: () => <div data-testid="picture" /> }));

const SHOP = {
  slug: 'duka',
  store_name: 'Duka ya Amina',
  tagline: 'Fresh every day',
  whatsapp_number: '254712345678',
  delivery_enabled: true,
  pickup_enabled: true,
  pickup_address: 'Moi Avenue 4',
  delivery_note: '',
  payment_options: ['cash', 'mpesa'],
  minimum_order: 0,
  currency: 'KES',
  categories: ['Food', 'Drinks'],
  delivery: { mode: 'free', flat_fee: null, areas: [], needs_location: false, longest_distance_km: null, free_above: null },
};
const RICE = { item_code: 'RICE', item_name: 'Rice', category: 'Food', unit: 'Kg', price: 150, in_stock: true, low_stock: null, description: '', image: '' };
const TEA = { item_code: 'TEA', item_name: 'Tea', category: 'Drinks', unit: '', price: 80, in_stock: true, low_stock: 3, description: '', image: '' };
const SODA = { item_code: 'SODA', item_name: 'Soda', category: 'Drinks', unit: '', price: 60, in_stock: false, low_stock: null, description: '', image: '' };

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shop/:slug/*" element={<ShopApp />} />
        <Route path="/track/:token" element={<TrackPage />} />
      </Routes>
    </MemoryRouter>
  );

const basketWith = (...pairs) =>
  saveCart('duka', {
    lines: pairs.map(([product, qty]) => ({
      item_code: product.item_code,
      item_name: product.item_name,
      price: product.price,
      unit: product.unit,
      image: '',
      category: product.category,
      max: 99,
      qty,
    })),
  });

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  Object.defineProperty(window.navigator, 'language', { value: 'en-KE', configurable: true });
  getShop.mockResolvedValue(SHOP);
  listShopProducts.mockResolvedValue({ rows: [RICE, TEA, SODA], total: 3, page: 1 });
});

describe('the shop front page', () => {
  test('shows the shop and its products', async () => {
    renderAt('/shop/duka');
    expect(await screen.findByRole('heading', { level: 1, name: 'Duka ya Amina' })).toBeInTheDocument();
    expect(screen.getByText('Fresh every day')).toBeInTheDocument();
    expect(await screen.findByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('KES 150')).toBeInTheDocument();
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
  });

  test('a product that is out of stock cannot be added', async () => {
    renderAt('/shop/duka');
    await screen.findByText('Soda');
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add soda/i })).not.toBeInTheDocument();
  });

  test('adding a product shows how many are in the basket and what it comes to', async () => {
    renderAt('/shop/duka');
    userEvent.click(await screen.findByRole('button', { name: 'Add Rice to basket' }));
    expect(screen.getByRole('group', { name: 'Rice' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'More Rice' }));
    expect(screen.getAllByText(/2 in basket/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 in basket KES 300/)).toBeInTheDocument();
    expect(loadCart('duka').lines[0]).toMatchObject({ item_code: 'RICE', qty: 2 });
  });

  test('a basket kept on the phone is still there next time', async () => {
    basketWith([RICE, 3]);
    renderAt('/shop/duka');
    expect(await screen.findByText(/3 in basket KES 450/)).toBeInTheDocument();
  });

  test('cannot add more than what is left', async () => {
    renderAt('/shop/duka');
    userEvent.click(await screen.findByRole('button', { name: 'Add Tea to basket' }));
    const more = screen.getByRole('button', { name: 'More Tea' });
    userEvent.click(more);
    userEvent.click(more);
    expect(more).toBeDisabled();
    expect(loadCart('duka').lines[0].qty).toBe(3);
  });

  test('searching and choosing a category ask the shop again', async () => {
    renderAt('/shop/duka');
    await screen.findByText('Rice');
    userEvent.type(screen.getByLabelText('Search products'), 'tea');
    await waitFor(() => expect(listShopProducts).toHaveBeenLastCalledWith(expect.objectContaining({ slug: 'duka', search: 'tea' })));
    userEvent.click(screen.getByRole('button', { name: 'Drinks' }));
    await waitFor(() => expect(listShopProducts).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Drinks' })));
  });

  test('shows more products when there are more', async () => {
    listShopProducts
      .mockResolvedValueOnce({ rows: [RICE], total: 2, page: 1 })
      .mockResolvedValueOnce({ rows: [TEA], total: 2, page: 2 });
    renderAt('/shop/duka');
    await screen.findByText('Rice');
    userEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('Tea')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  test('a shop that is not open says so', async () => {
    getShop.mockRejectedValue(new ShopNotFoundError('closed'));
    renderAt('/shop/nowhere');
    expect(await screen.findByText('This shop is not open')).toBeInTheDocument();
    expect(listShopProducts).not.toHaveBeenCalled();
  });

  test('a shop that cannot be reached offers to try again', async () => {
    getShop.mockRejectedValueOnce(new Error('offline'));
    renderAt('/shop/duka');
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Rice')).toBeInTheDocument();
  });

  test('the words can be switched to Swahili and are remembered', async () => {
    renderAt('/shop/duka');
    await screen.findByText('Rice');
    userEvent.click(screen.getByRole('button', { name: 'Switch to Kiswahili' }));
    expect(await screen.findByRole('button', { name: 'Weka Rice kwenye kikapu' })).toBeInTheDocument();
    expect(localStorage.getItem('murzak_shop_language')).toBe('sw');
  });
});

describe('the basket', () => {
  test('lets the shopper change quantities, remove things and go to checkout', async () => {
    basketWith([RICE, 2], [TEA, 1]);
    renderAt('/shop/duka');
    userEvent.click((await screen.findAllByRole('button', { name: /in basket/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Your basket' });
    expect(within(dialog).getByText('KES 380')).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Remove Tea' }));
    expect(within(dialog).queryByText('Tea')).not.toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Checkout' }));
    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });

  test('will not go to checkout below the smallest order', async () => {
    getShop.mockResolvedValue({ ...SHOP, minimum_order: 500 });
    basketWith([RICE, 1]);
    renderAt('/shop/duka');
    userEvent.click((await screen.findAllByRole('button', { name: /in basket/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Your basket' });
    expect(within(dialog).getByText(/Add KES 350 more/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });
});

describe('checkout', () => {
  const fillDetails = () => {
    userEvent.type(screen.getByLabelText('Your name'), 'Amina Wanjiru');
    userEvent.type(screen.getByLabelText('Phone number'), '0712 345 678');
  };

  test('an empty basket sends the shopper back to the shop', async () => {
    renderAt('/shop/duka/checkout');
    expect(await screen.findByText('Your basket is empty')).toBeInTheDocument();
  });

  test('says what is missing and sends nothing', async () => {
    basketWith([RICE, 1]);
    renderAt('/shop/duka/checkout');
    userEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a Kenyan mobile number, like 0712 345 678.')).toBeInTheDocument();
    expect(screen.getByText('Please enter the address to deliver to.')).toBeInTheDocument();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  test('places a free-delivery order and shows where it is', async () => {
    basketWith([RICE, 2]);
    placeOrder.mockResolvedValue({ order: 'SO-1', token: 'tok-abcdefgh', total: 300, deliveryFee: 0, paymentPrompt: null, whatsappLink: 'https://wa.me/254712345678?text=Hi' });
    trackOrder.mockResolvedValue({ order: 'SO-1', status: 'New', deliveryMethod: 'Delivery', paid: false, total: 300, date: '2026-10-25', shop: 'Duka ya Amina' });
    renderAt('/shop/duka/checkout');
    await screen.findByRole('heading', { name: 'Checkout' });
    fillDetails();
    userEvent.type(screen.getByLabelText('Delivery address'), 'Moi Avenue 4, Nairobi');
    userEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByText('Thank you! We have your order.')).toBeInTheDocument();
    const sent = placeOrder.mock.calls[0][0];
    expect(sent).toMatchObject({
      slug: 'duka',
      customerName: 'Amina Wanjiru',
      deliveryMethod: 'Delivery',
      payment: 'cash',
      address: 'Moi Avenue 4, Nairobi',
      lines: [{ item_code: 'RICE', qty: 2 }],
    });
    expect(JSON.stringify(sent)).not.toMatch(/price|rate|fee/i);
    // The basket is emptied and the phone remembers how the order is paid
    expect(loadCart('duka').lines).toEqual([]);
    expect(recallOrder('tok-abcdefgh')).toMatchObject({ payment: 'cash' });
    expect(screen.getByText('Order SO-1')).toBeInTheDocument();
  });

  test('charges the delivery fee for the area, as the shop worked it out', async () => {
    getShop.mockResolvedValue({ ...SHOP, delivery: { ...SHOP.delivery, mode: 'area', areas: [{ name: 'Westlands', fee: 200 }, { name: 'Kasarani', fee: 300 }] } });
    quoteDelivery.mockResolvedValue({ deliverable: true, fee: 200, distanceKm: null, message: '' });
    basketWith([RICE, 2]);
    renderAt('/shop/duka/checkout');
    userEvent.click(await screen.findByRole('combobox', { name: /your area/i }));
    userEvent.click(screen.getByRole('option', { name: /Westlands/ }));

    await waitFor(() => expect(quoteDelivery).toHaveBeenCalledWith(expect.objectContaining({ slug: 'duka', area: 'Westlands', lines: [{ item_code: 'RICE', qty: 2 }] })));
    const summary = screen.getByText('Order summary').closest('section');
    await waitFor(() => expect(within(summary).getByText('Total to pay').closest('div')).toHaveTextContent('KES 500'));
    expect(within(summary).getByText('Delivery').closest('div')).toHaveTextContent('KES 200');
  });

  test('a place the shop will not deliver to blocks the order and says why', async () => {
    getShop.mockResolvedValue({
      ...SHOP,
      delivery: { ...SHOP.delivery, mode: 'area', areas: [{ name: 'Westlands', fee: 200 }] },
    });
    quoteDelivery.mockResolvedValue({ deliverable: false, fee: 0, distanceKm: null, message: 'Please choose one of the areas we deliver to.' });
    basketWith([RICE, 1]);
    renderAt('/shop/duka/checkout');
    userEvent.click(await screen.findByRole('combobox', { name: /your area/i }));
    userEvent.click(screen.getByRole('option', { name: /Westlands/ }));
    expect(await screen.findByText('Please choose one of the areas we deliver to.')).toBeInTheDocument();
    fillDetails();
    userEvent.type(screen.getByLabelText('Delivery address'), 'Moi Avenue 4, Nairobi');
    userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(placeOrder).not.toHaveBeenCalled();
  });

  test('pickup needs no address and no fee', async () => {
    getShop.mockResolvedValue({ ...SHOP, delivery: { ...SHOP.delivery, mode: 'flat', flat_fee: 150 } });
    placeOrder.mockResolvedValue({ order: 'SO-2', token: 'tok-pickup01', total: 150, deliveryFee: 0, paymentPrompt: null, whatsappLink: '' });
    trackOrder.mockResolvedValue({ order: 'SO-2', status: 'New', deliveryMethod: 'Pickup', paid: false, total: 150, date: '', shop: 'Duka ya Amina' });
    basketWith([RICE, 1]);
    renderAt('/shop/duka/checkout');
    userEvent.click(await screen.findByRole('radio', { name: 'Pickup' }));
    expect(screen.getByText('Collect from: Moi Avenue 4')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delivery address')).not.toBeInTheDocument();
    fillDetails();
    userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await waitFor(() => expect(placeOrder).toHaveBeenCalled());
    expect(placeOrder.mock.calls[0][0]).toMatchObject({ deliveryMethod: 'Pickup', address: undefined });
    expect(quoteDelivery).not.toHaveBeenCalled();
  });

  test('the shop\'s own refusal is shown and the basket is kept', async () => {
    placeOrder.mockRejectedValue(new Error('Sorry, not enough stock for: Rice.'));
    basketWith([RICE, 2]);
    renderAt('/shop/duka/checkout');
    await screen.findByRole('heading', { name: 'Checkout' });
    fillDetails();
    userEvent.type(screen.getByLabelText('Delivery address'), 'Moi Avenue 4, Nairobi');
    userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(await screen.findByText('Sorry, not enough stock for: Rice.')).toBeInTheDocument();
    expect(loadCart('duka').lines).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled();
  });

  test('only the ways the shop offers can be chosen', async () => {
    getShop.mockResolvedValue({ ...SHOP, delivery_enabled: false, payment_options: ['cash'] });
    basketWith([RICE, 1]);
    renderAt('/shop/duka/checkout');
    await screen.findByRole('heading', { name: 'Checkout' });
    expect(screen.queryByRole('radio', { name: 'Delivery' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pickup' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Pay now with M-Pesa' })).not.toBeInTheDocument();
  });
});

describe('the order page', () => {
  const order = (over = {}) => ({ order: 'SO-1', status: 'Confirmed', deliveryMethod: 'Delivery', paid: false, total: 500, date: '2026-10-25', shop: 'Duka ya Amina', ...over });

  test('shows the steps, the total and whether it is paid', async () => {
    trackOrder.mockResolvedValue(order());
    renderAt('/track/tok-abcdefgh');
    expect(await screen.findByText('Order SO-1')).toBeInTheDocument();
    expect(screen.getByText('Confirmed by the shop')).toHaveTextContent('Confirmed by the shop');
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Confirmed by the shop');
    expect(screen.getByText('KES 500')).toBeInTheDocument();
    expect(screen.getByText('Not paid yet')).toBeInTheDocument();
  });

  test('a cancelled order says so', async () => {
    trackOrder.mockResolvedValue(order({ status: 'Cancelled' }));
    renderAt('/track/tok-abcdefgh');
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Status' })).not.toBeInTheDocument();
  });

  test('an order not paid by M-Pesa can send the prompt again', async () => {
    rememberOrder('tok-abcdefgh', { payment: 'mpesa', whatsappLink: 'https://wa.me/254712345678?text=Hi' });
    trackOrder.mockResolvedValue(order());
    payForOrder.mockResolvedValue({ sent: true, paid: false, message: 'Check your phone' });
    renderAt('/track/tok-abcdefgh');
    userEvent.click(await screen.findByRole('button', { name: 'Send M-Pesa prompt' }));
    expect(await screen.findByText('Check your phone and enter your M-Pesa PIN.')).toBeInTheDocument();
    expect(payForOrder).toHaveBeenCalledWith('tok-abcdefgh');
    expect(screen.getByRole('link', { name: 'Confirm on WhatsApp' })).toHaveAttribute('href', 'https://wa.me/254712345678?text=Hi');
  });

  test('a cash order is told it is paid on delivery and is offered no prompt', async () => {
    rememberOrder('tok-abcdefgh', { payment: 'cash' });
    trackOrder.mockResolvedValue(order());
    renderAt('/track/tok-abcdefgh');
    expect(await screen.findByText('You pay when you receive your order.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send M-Pesa prompt' })).not.toBeInTheDocument();
  });

  test('a paid order is not asked for money', async () => {
    rememberOrder('tok-abcdefgh', { payment: 'mpesa' });
    trackOrder.mockResolvedValue(order({ paid: true }));
    renderAt('/track/tok-abcdefgh');
    expect(await screen.findByText('Paid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send M-Pesa prompt' })).not.toBeInTheDocument();
  });

  test('a code that is not known is "not found"', async () => {
    trackOrder.mockRejectedValue(new ShopNotFoundError('x'));
    renderAt('/track/zzzzzzzz');
    expect(await screen.findByText('We could not find that order')).toBeInTheDocument();
  });
});

describe('a product up close', () => {
  const LONG = { ...RICE, description: 'Pishori rice, 2 kg bag.\nGrown in Mwea.', images: ['/files/a.jpg', '/files/b.jpg'], image: '/files/main.jpg' };

  test('a product with a description or extra photos can be opened, and added from there', async () => {
    listShopProducts.mockResolvedValue({ rows: [LONG, TEA], total: 2, page: 1 });
    renderAt('/shop/duka');
    expect(screen.queryByRole('button', { name: 'About Tea' })).not.toBeInTheDocument();
    userEvent.click(await screen.findByRole('button', { name: 'About Rice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rice' });
    expect(within(dialog).getByText(/Pishori rice, 2 kg bag/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('button', { name: /Show photo/ })).toHaveLength(3);
    userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(loadCart('duka').lines[0]).toMatchObject({ item_code: 'RICE', qty: 1 });
  });

  test('a product with nothing more to say has no details link', async () => {
    renderAt('/shop/duka');
    await screen.findByText('Rice');
    expect(screen.queryByRole('button', { name: /About/ })).not.toBeInTheDocument();
  });
});

describe('the shop\'s name and logo', () => {
  test('the logo is in the header and the shop\'s name is in the tab, and the tab goes back when the shop is left', async () => {
    const before = document.title;
    getShop.mockResolvedValue({ ...SHOP, logo: '/files/logo.png' });
    const { unmount } = renderAt('/shop/duka');
    await screen.findByRole('heading', { level: 1, name: 'Duka ya Amina' });
    expect(document.querySelector('.sf-header__logo').getAttribute('src')).toBe(`${window.location.origin}/files/logo.png`);
    expect(document.title).toBe('Duka ya Amina');
    expect(document.head.querySelector('meta[property="og:image"]').getAttribute('content')).toBe(`${window.location.origin}/files/logo.png`);
    unmount();
    expect(document.title).toBe(before);
  });

  test('a shop without a logo keeps the plain icon', async () => {
    renderAt('/shop/duka');
    await screen.findByRole('heading', { level: 1, name: 'Duka ya Amina' });
    expect(document.querySelector('.sf-header__logo')).toBeNull();
  });
});
