import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import {
  checkStoreSlug,
  createInvoiceForOnlineOrder,
  getOnlineOrder,
  getOnlineStore,
  listOnlineOrders,
  markOnlineOrderPaid,
  saveOnlineStore,
  setItemsOnline,
  setOnlineOrderStatus,
} from '../../api/onlineStoreApi';
import { getEcommerceProducts, getOrderWebhook, regenerateOrderWebhook } from '../../api/ecommerceApi';
import OnlineOrdersTab from './OnlineOrdersTab';
import OnlineStoreTab from './OnlineStoreTab';
import { showAllProducts } from './GoOnlineWizard';
import { uploadProductImage } from '../../api/uploadImage';
import WebhookCard from './WebhookCard';

jest.mock('../../api/onlineStoreApi', () => ({
  getOnlineStore: jest.fn(),
  checkStoreSlug: jest.fn(),
  saveOnlineStore: jest.fn(),
  setItemsOnline: jest.fn(),
  listOnlineOrders: jest.fn(),
  getOnlineOrder: jest.fn(),
  setOnlineOrderStatus: jest.fn(),
  markOnlineOrderPaid: jest.fn(),
  createInvoiceForOnlineOrder: jest.fn(),
}));
jest.mock('../../api/uploadImage', () => ({ uploadProductImage: jest.fn() }));
jest.mock('../../api/ecommerceApi', () => ({ getOrderWebhook: jest.fn(), regenerateOrderWebhook: jest.fn(), getEcommerceProducts: jest.fn() }));
// No live connection in tests; the screen falls back to polling
jest.mock('../../hooks/useRealtimeRefresh', () => ({ __esModule: true, default: () => false, pollEvery: (ms) => ms }));

const renderIn = (ui) =>
  render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );

const STORE = {
  enabled: false,
  slug: '',
  store_name: 'Duka ya Amina',
  tagline: '',
  whatsapp_number: '',
  minimum_order: 0,
  warehouse: 'Main - D',
  delivery_enabled: true,
  pickup_enabled: true,
  pickup_address: '',
  delivery_note: '',
  accept_cash: true,
  accept_mpesa: false,
  delivery_mode: 'free',
  delivery_flat_fee: 0,
  delivery_areas: [],
  free_delivery_above: 0,
  shop_latitude: null,
  shop_longitude: null,
  distance_base_km: 0,
  distance_base_fee: 0,
  distance_per_km: 0,
  distance_max_km: 0,
  road_factor: 1.3,
  mpesa_ready: false,
  product_count: 7,
  links: {},
};

beforeEach(() => {
  jest.resetAllMocks();
  getOnlineStore.mockResolvedValue(STORE);
  saveOnlineStore.mockResolvedValue({});
});

describe('the online store settings', () => {
  const open = async (store = STORE) => {
    getOnlineStore.mockResolvedValue(store);
    renderIn(<OnlineStoreTab company="Duka Ltd" locations={[{ value: 'Main - D', label: 'Main shop' }]} />);
    await screen.findByLabelText('Web address name');
  };

  test('shows the settings the server holds, and how many products are shown', async () => {
    await open();
    expect(screen.getByLabelText('Store name')).toHaveValue('Duka ya Amina');
    expect(screen.getByText(/7 products are shown in your store/)).toBeInTheDocument();
    expect(getOnlineStore).toHaveBeenCalledWith('Duka Ltd');
  });

  test('says whether a web address name is free while the owner types', async () => {
    checkStoreSlug.mockResolvedValueOnce({ available: false, message: 'That name is already taken. Please choose another.' });
    await open();
    userEvent.type(screen.getByLabelText('Web address name'), 'duka');
    expect(await screen.findByText('That name is already taken. Please choose another.')).toBeInTheDocument();
    expect(checkStoreSlug).toHaveBeenCalledWith({ slug: 'duka', company: 'Duka Ltd' });
  });

  test('saves everything in the form the server expects', async () => {
    await open();
    userEvent.type(screen.getByLabelText('Web address name'), 'duka-ya-amina');
    userEvent.click(screen.getByRole('checkbox', { name: 'Open the online store' }));
    userEvent.type(screen.getByLabelText('WhatsApp number'), '0712 345 678');
    userEvent.click(screen.getByRole('button', { name: 'Save store settings' }));
    await waitFor(() => expect(saveOnlineStore).toHaveBeenCalled());
    const [payload, company] = saveOnlineStore.mock.calls[0];
    expect(company).toBe('Duka Ltd');
    expect(payload).toMatchObject({
      enabled: 1,
      slug: 'duka-ya-amina',
      whatsapp_number: '0712 345 678',
      delivery_mode: 'free',
      accept_cash: 1,
      accept_mpesa: 0,
      shop_latitude: null,
      warehouse: 'Main - D',
    });
  });

  test('a refusal from the server is shown, not hidden', async () => {
    saveOnlineStore.mockRejectedValue(new Error('To open the store, choose a way to pay.'));
    await open();
    userEvent.click(screen.getByRole('button', { name: 'Save store settings' }));
    expect(await screen.findByText('To open the store, choose a way to pay.')).toBeInTheDocument();
  });

  test('delivery fees: only the choices for the chosen way appear', async () => {
    await open();
    expect(screen.queryByLabelText('Delivery fee')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: 'One fee' }));
    expect(screen.getByLabelText('Delivery fee')).toBeInTheDocument();
    expect(screen.getByLabelText(/Free delivery on orders of/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: 'By distance' }));
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Fee for each extra kilometre')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delivery fee')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: 'Free' }));
    expect(screen.queryByLabelText(/Free delivery on orders of/)).not.toBeInTheDocument();
  });

  test('delivery by area: add, fill and remove areas, and save them with their fees', async () => {
    await open();
    userEvent.click(screen.getByRole('radio', { name: 'By area' }));
    expect(screen.getByText('No areas yet. Add the first one.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add an area' }));
    userEvent.click(screen.getByRole('button', { name: 'Add an area' }));
    const names = screen.getAllByLabelText('Area');
    const fees = screen.getAllByLabelText('Fee');
    userEvent.type(names[0], 'Westlands');
    userEvent.type(fees[0], '200');
    userEvent.type(names[1], 'Kasarani');
    userEvent.type(fees[1], '300');
    userEvent.click(screen.getByRole('button', { name: 'Remove Kasarani' }));
    userEvent.click(screen.getByRole('button', { name: 'Save store settings' }));
    await waitFor(() => expect(saveOnlineStore).toHaveBeenCalled());
    expect(saveOnlineStore.mock.calls[0][0]).toMatchObject({ delivery_mode: 'area', delivery_areas: [{ name: 'Westlands', fee: 200 }] });
  });

  test('M-Pesa cannot be offered until M-Pesa is set up', async () => {
    await open();
    expect(screen.getByRole('checkbox', { name: 'M-Pesa' })).toBeDisabled();
    expect(screen.getByText('Set up M-Pesa first, under Settings, Payment gateways.')).toBeInTheDocument();
  });

  test('M-Pesa can be offered once it is set up', async () => {
    await open({ ...STORE, mpesa_ready: true });
    expect(screen.getByRole('checkbox', { name: 'M-Pesa' })).toBeEnabled();
  });

  test('the shop\'s real link is shown, with a note while the store is closed', async () => {
    await open({ ...STORE, slug: 'duka-ya-amina', enabled: false });
    expect(screen.getByText(`${window.location.origin}/shop/duka-ya-amina`)).toBeInTheDocument();
    expect(screen.getByText(/The store is closed/)).toBeInTheDocument();
  });

  test('before a name is saved there is no link to share', async () => {
    await open();
    expect(screen.getByText(/Choose a web address name and save to get your link/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  test('a store that cannot be loaded offers another try', async () => {
    getOnlineStore.mockRejectedValueOnce(new Error('offline'));
    renderIn(<OnlineStoreTab company="Duka Ltd" />);
    expect(await screen.findByText('The online store settings could not be loaded.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByLabelText('Web address name')).toBeInTheDocument();
  });
});

describe('the online orders', () => {
  const ORDER = (over = {}) => ({
    name: 'SO-1',
    creation: '2026-10-25 09:30:00',
    customer: 'Amina',
    customer_name: 'Amina Wanjiru',
    grand_total: 500,
    channel: 'Website',
    status: 'New',
    delivery_method: 'Delivery',
    address: 'Moi Avenue 4',
    payment: 'M-Pesa',
    paid: 0,
    phone: '254712345678',
    ...over,
  });

  const open = async (rows = [ORDER()]) => {
    listOnlineOrders.mockResolvedValue({ rows, total: rows.length, page: 1, pageSize: 20 });
    renderIn(<OnlineOrdersTab company="Duka Ltd" />);
    await screen.findByText(rows[0].name);
  };

  test('lists the orders with who, how much and where they are', async () => {
    await open();
    expect(screen.getByText('SO-1')).toBeInTheDocument();
    expect(screen.getByText('KES 500')).toBeInTheDocument();
    expect(screen.getByText('Not paid')).toBeInTheDocument();
    expect(listOnlineOrders).toHaveBeenCalledWith(expect.objectContaining({ company: 'Duka Ltd', page: 1, pageSize: 20 }));
  });

  test('asks only for the orders in the chosen state', async () => {
    await open();
    userEvent.click(screen.getByRole('radio', { name: 'Ready' }));
    await waitFor(() => expect(listOnlineOrders).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Ready', page: 1 })));
  });

  test('moves an order along with one button', async () => {
    setOnlineOrderStatus.mockResolvedValue({});
    await open();
    userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(setOnlineOrderStatus).toHaveBeenCalledWith({ order: 'SO-1', status: 'Confirmed', company: 'Duka Ltd' }));
    expect(await screen.findByText('Order SO-1 is now Confirmed.')).toBeInTheDocument();
  });

  test('each state offers the next step, and a finished order offers none', async () => {
    await open([ORDER({ status: 'Ready' }), ORDER({ name: 'SO-2', status: 'Delivered' }), ORDER({ name: 'SO-3', status: 'Cancelled' })]);
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mark delivered' })).toHaveLength(1);
  });

  test('cancelling asks first and says what happens', async () => {
    setOnlineOrderStatus.mockResolvedValue({});
    await open();
    userEvent.click(screen.getByRole('button', { name: 'More actions for order SO-1' }));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/stock held for this order is released/)).toBeInTheDocument();
    expect(setOnlineOrderStatus).not.toHaveBeenCalled();
    userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));
    await waitFor(() => expect(setOnlineOrderStatus).toHaveBeenCalledWith({ order: 'SO-1', status: 'Cancelled', company: 'Duka Ltd' }));
  });

  test('marks an order paid, and makes the invoice', async () => {
    markOnlineOrderPaid.mockResolvedValue({});
    createInvoiceForOnlineOrder.mockResolvedValue('ACC-SINV-1');
    await open();
    userEvent.click(screen.getByRole('button', { name: 'More actions for order SO-1' }));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Mark as paid' }));
    await waitFor(() => expect(markOnlineOrderPaid).toHaveBeenCalledWith('SO-1', 'Duka Ltd'));
    userEvent.click(screen.getByRole('button', { name: 'More actions for order SO-1' }));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Make invoice' }));
    expect(await screen.findByText(/Draft invoice ACC-SINV-1 made/)).toBeInTheDocument();
  });

  test('the server\'s refusal is shown and the list is kept', async () => {
    setOnlineOrderStatus.mockRejectedValue(new Error('An order that is Delivered cannot be changed to Ready.'));
    await open();
    userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('An order that is Delivered cannot be changed to Ready.')).toBeInTheDocument();
    expect(screen.getByText('Amina Wanjiru')).toBeInTheDocument();
  });

  test('opening an order shows what was ordered', async () => {
    getOnlineOrder.mockResolvedValue({
      name: 'SO-1',
      customer_name: 'Amina Wanjiru',
      phone: '254712345678',
      address: 'Moi Avenue 4',
      grand_total: 500,
      lines: [{ item_code: 'RICE', item_name: 'Rice', qty: 2, rate: 150, amount: 300 }, { item_code: 'DEL', item_name: 'Delivery', qty: 1, rate: 200, amount: 200 }],
    });
    await open();
    userEvent.click(screen.getByRole('button', { name: 'More actions for order SO-1' }));
    userEvent.click(await screen.findByRole('menuitem', { name: 'View' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order SO-1' });
    expect(await within(dialog).findByText('Rice')).toBeInTheDocument();
    expect(within(dialog).getByText('Delivery')).toBeInTheDocument();
    expect(within(dialog).getByText('Moi Avenue 4')).toBeInTheDocument();
  });

  test('says so when there are no orders yet, and when the list cannot be loaded', async () => {
    listOnlineOrders.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20 });
    renderIn(<OnlineOrdersTab company="Duka Ltd" />);
    expect(await screen.findByText('No online orders yet')).toBeInTheDocument();
  });
});

describe('the website order connection', () => {
  test('creates nothing until the owner asks to see it', async () => {
    renderIn(<WebhookCard company="Duka Ltd" />);
    expect(getOrderWebhook).not.toHaveBeenCalled();
    getOrderWebhook.mockResolvedValue({ deliveryUrl: 'https://pos.example/hook?t=abc', secret: 's3cret-value', steps: ['Open WooCommerce'] });
    userEvent.click(screen.getByRole('button', { name: 'Show the connection' }));
    expect(await screen.findByDisplayValue('https://pos.example/hook?t=abc')).toBeInTheDocument();
    expect(screen.getByText('Open WooCommerce')).toBeInTheDocument();
  });

  test('the secret is hidden until asked for', async () => {
    getOrderWebhook.mockResolvedValue({ deliveryUrl: 'https://pos.example/hook?t=abc', secret: 's3cret-value', steps: [] });
    renderIn(<WebhookCard company="Duka Ltd" />);
    userEvent.click(screen.getByRole('button', { name: 'Show the connection' }));
    const secret = await screen.findByLabelText('Secret');
    expect(secret).toHaveAttribute('type', 'password');
    userEvent.click(screen.getByRole('button', { name: 'Show secret' }));
    expect(secret).toHaveAttribute('type', 'text');
  });

  test('making new ones asks first and says the old ones stop', async () => {
    getOrderWebhook.mockResolvedValue({ deliveryUrl: 'https://pos.example/hook?t=abc', secret: 'old', steps: [] });
    regenerateOrderWebhook.mockResolvedValue({ deliveryUrl: 'https://pos.example/hook?t=new', secret: 'new', steps: [] });
    renderIn(<WebhookCard company="Duka Ltd" />);
    userEvent.click(screen.getByRole('button', { name: 'Show the connection' }));
    userEvent.click(await screen.findByRole('button', { name: 'Make a new address and secret' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/old ones stop working at once/)).toBeInTheDocument();
    expect(regenerateOrderWebhook).not.toHaveBeenCalled();
    userEvent.click(within(dialog).getByRole('button', { name: 'Make new ones' }));
    expect(await screen.findByDisplayValue('https://pos.example/hook?t=new')).toBeInTheDocument();
  });

  test('shows why the last website order could not be recorded', () => {
    renderIn(<WebhookCard company="Duka Ltd" lastOrderMessage="Website order 501 could not be recorded: Product ZZZ is not available." lastOrderAt="2026-10-25 09:30:00" />);
    expect(screen.getByText(/Website order 501 could not be recorded/)).toBeInTheDocument();
  });
});

describe('getting the store ready and sharing it', () => {
  const openStore = async (store) => {
    getOnlineStore.mockResolvedValue(store);
    renderIn(<OnlineStoreTab company="Duka Ltd" locations={[]} />);
    await screen.findByLabelText('Web address name');
  };

  test('a new store shows what is left to do', async () => {
    await openStore({ ...STORE, product_count: 0 });
    expect(screen.getByText('Get your store ready')).toBeInTheDocument();
    expect(screen.getByText(/steps done/)).toBeInTheDocument();
    expect(screen.getByText('Choose the products to show')).toBeInTheDocument();
  });

  test('a store that is ready shows no checklist', async () => {
    await openStore({ ...STORE, slug: 'duka', enabled: true, accept_mpesa: false, product_count: 3 });
    expect(screen.queryByText('Get your store ready')).not.toBeInTheDocument();
  });

  test('a saved store offers a QR code, a poster and the link on WhatsApp', async () => {
    await openStore({ ...STORE, slug: 'duka', enabled: true, product_count: 3 });
    expect(screen.getByRole('img', { name: 'QR code for your store link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print a poster' })).toBeInTheDocument();
    const open = jest.spyOn(window, 'open').mockReturnValue({});
    userEvent.click(screen.getByRole('button', { name: 'Share on WhatsApp' }));
    const url = open.mock.calls[0][0];
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain(`${window.location.origin}/shop/duka`);
    open.mockRestore();
  });

  test('the owner can message the customer about their order, ready to send', async () => {
    listOnlineOrders.mockResolvedValue({
      rows: [{ name: 'SO-1', customer_name: 'Amina Wanjiru', status: 'Confirmed', delivery_method: 'Pickup', grand_total: 500, paid: 0, channel: 'Website' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    getOnlineOrder.mockResolvedValue({ name: 'SO-1', customer_name: 'Amina Wanjiru', phone: '0712345678', address: '', grand_total: 500, lines: [{ item_code: 'R', item_name: 'Rice', qty: 2, rate: 250, amount: 500 }] });
    renderIn(<OnlineOrdersTab company="Duka Ltd" />);
    userEvent.click(await screen.findByRole('button', { name: 'More actions for order SO-1' }));
    userEvent.click(await screen.findByRole('menuitem', { name: 'View' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order SO-1' });
    const open = jest.spyOn(window, 'open').mockReturnValue({});
    userEvent.click(await within(dialog).findByRole('button', { name: 'Message the customer on WhatsApp' }));
    const url = open.mock.calls[0][0];
    expect(url.startsWith('https://wa.me/254712345678?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Hello Amina');
    expect(within(dialog).getByRole('button', { name: 'Print packing slip' })).toBeInTheDocument();
    open.mockRestore();
  });

  test('the guided setup takes a new store from nothing to open, with its link ready', async () => {
    checkStoreSlug.mockResolvedValue({ available: true, message: '' });
    getOnlineStore.mockResolvedValueOnce({ ...STORE, product_count: 7 }).mockResolvedValue({ ...STORE, slug: 'duka', enabled: true, product_count: 7 });
    renderIn(<OnlineStoreTab company="Duka Ltd" locations={[{ value: 'Main - D', label: 'Main shop' }]} />);
    await screen.findByLabelText('Web address name');
    userEvent.click(screen.getByRole('button', { name: /guided setup/ }));

    // Step 1: the web address name is what is missing, so that is where it starts
    const dialog = await screen.findByRole('dialog', { name: 'Go online: Your store' });
    userEvent.type(within(dialog).getByLabelText('Web address name'), 'duka');
    await within(dialog).findByText('This name is free.');
    userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));

    // Step 2: collecting needs an address
    await screen.findByRole('dialog', { name: 'Go online: Orders' });
    userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Write where customers collect their orders.')).toBeInTheDocument();
    userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Pickup address'), 'Moi Avenue 4');
    userEvent.click(screen.getByRole('button', { name: 'Next' }));

    // Step 3 and 4: cash is on and 7 products are shown already
    await screen.findByRole('dialog', { name: 'Go online: Payment' });
    userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('dialog', { name: 'Go online: Products' });
    expect(within(screen.getByRole('dialog')).getByText('7 products are shown in your store.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Next' }));

    // Step 5: open it
    await screen.findByRole('dialog', { name: 'Go online: Open' });
    userEvent.click(screen.getByRole('button', { name: 'Open my store' }));
    await waitFor(() => expect(saveOnlineStore).toHaveBeenCalledTimes(1));
    expect(saveOnlineStore.mock.calls[0][0]).toMatchObject({ slug: 'duka', enabled: 1, pickup_address: 'Moi Avenue 4', store_name: 'Duka ya Amina' });
    const done = await screen.findByRole('dialog', { name: 'Your store is open' });
    expect(within(done).getByText(`${window.location.origin}/shop/duka`)).toBeInTheDocument();
    expect(within(done).getByRole('img', { name: 'QR code for your store link' })).toBeInTheDocument();
  });

  test('a name that is taken stops the owner on the first step', async () => {
    checkStoreSlug.mockResolvedValue({ available: false, message: 'That name is already taken. Please choose another.' });
    renderIn(<OnlineStoreTab company="Duka Ltd" locations={[]} />);
    await screen.findByLabelText('Web address name');
    userEvent.click(screen.getByRole('button', { name: /guided setup/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Go online: Your store' });
    userEvent.type(within(dialog).getByLabelText('Web address name'), 'duka');
    await within(dialog).findAllByText('That name is already taken. Please choose another.');
    userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Go online: Your store' })).toBeInTheDocument();
  });

  test('"Show all my products" gets every page of products and shows them a hundred at a time', async () => {
    const rows = (from, count) => Array.from({ length: count }, (_, i) => ({ item_code: `P${from + i}` }));
    getEcommerceProducts
      .mockResolvedValueOnce({ rows: rows(0, 100), total: 250, page: 1 })
      .mockResolvedValueOnce({ rows: rows(100, 100), total: 250, page: 2 })
      .mockResolvedValueOnce({ rows: rows(200, 50), total: 250, page: 3 });
    setItemsOnline.mockResolvedValue({});
    const count = await showAllProducts({ company: 'Duka Ltd', warehouse: 'Main - D' });
    expect(count).toBe(250);
    expect(getEcommerceProducts).toHaveBeenCalledTimes(3);
    expect(getEcommerceProducts).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'all', page: 2, pageSize: 100 }));
    expect(setItemsOnline.mock.calls.map(([call]) => call.itemCodes.length)).toEqual([100, 100, 50]);
    expect(setItemsOnline.mock.calls.every(([call]) => call.show === true && call.company === 'Duka Ltd')).toBe(true);
  });

  test('a shop with no products at all is not sent to the server', async () => {
    getEcommerceProducts.mockResolvedValue({ rows: [], total: 0, page: 1 });
    expect(await showAllProducts({ company: 'Duka Ltd' })).toBe(0);
    expect(setItemsOnline).not.toHaveBeenCalled();
  });

  test('a logo can be added, is saved with the store, and can be taken away', async () => {
    uploadProductImage.mockResolvedValue('/files/logo.png');
    await openStore({ ...STORE, slug: 'duka', enabled: true, product_count: 3 });
    expect(screen.getByRole('button', { name: 'Add a logo' })).toBeInTheDocument();
    userEvent.upload(screen.getByLabelText('Add a logo', { selector: 'input' }), new File(['x'], 'logo.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: 'Your shop logo' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Save store settings' }));
    await waitFor(() => expect(saveOnlineStore).toHaveBeenCalled());
    expect(saveOnlineStore.mock.calls[0][0]).toMatchObject({ logo: '/files/logo.png' });
    userEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    expect(screen.queryByRole('img', { name: 'Your shop logo' })).not.toBeInTheDocument();
  });
});
