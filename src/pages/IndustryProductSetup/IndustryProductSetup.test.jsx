import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import IndustryProductSetup from './index';
import authReducer from '../../store/authSlice';
import productReducer from '../../store/productSlice';
import productSeedingReducer from '../../store/productSeedingSlice';
import warehouseReducer from '../../store/warehouseSlice';
import notificationReducer from '../../store/notificationSlice';
import axiosInstance from '../../api/axiosInstance';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));

// jsdom has no File.arrayBuffer or TextDecoder, which every modern browser has
beforeAll(() => {
  if (typeof global.TextDecoder === 'undefined') {
    // eslint-disable-next-line global-require
    global.TextDecoder = require('util').TextDecoder;
  }
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = function arrayBuffer() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }
  window.URL.createObjectURL = jest.fn(() => 'blob:x');
  window.URL.revokeObjectURL = jest.fn();
});

const SEED = [
  { sku: 'REST-001', name: 'Veg Burger', status: 'available' },
  { sku: 'REST-002', name: 'Chicken Burger', status: 'available' },
  { sku: 'REST-003', name: 'Tusker Lager', status: 'available' },
];
const GROUPS = [{ name: 'Food', item_group_name: 'Food' }, { name: 'Beer', item_group_name: 'Beer' }];

let seedList;
let createReply;

beforeEach(() => {
  seedList = SEED;
  createReply = { status: 'partial_success', items_created: ['SA-REST-001'], items_failed: [{ item_code: 'REST-002', item_name: 'Chicken Burger', error_message: 'Out of range.' }], total_received: 2 };
  axiosInstance.get.mockReset().mockResolvedValue({ data: { message: { item_groups: GROUPS } } });
  axiosInstance.post.mockReset().mockImplementation((url) => {
    if (url.endsWith('seed_products')) return Promise.resolve({ data: { message: { status: 'success', total_products: seedList.length, products: seedList } } });
    if (url.endsWith('create_seed_item')) return Promise.resolve({ data: { message: createReply } });
    return Promise.reject(new Error(`unexpected call ${url}`));
  });
});

const renderPage = ({ warehouse = { name: 'Main Store - SA', warehouse_name: 'Main Store' } } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, product: productReducer, productSeeding: productSeedingReducer, warehouse: warehouseReducer, notification: notificationReducer },
    preloadedState: {
      auth: { ...authReducer(undefined, { type: 'init' }), user: { company: 'Shop A Ltd' }, industries: [{ industry_code: 'REST', industry_name: 'Restaurant & Food Service' }] },
      warehouse: { ...warehouseReducer(undefined, { type: 'init' }), activeWarehouse: warehouse },
    },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <IndustryProductSetup industryCode="REST" />
      </MemoryRouter>
    </Provider>
  );
};

const loaded = async () => {
  await waitFor(() => expect(screen.getByText('Veg Burger')).toBeInTheDocument());
  await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
};
const tick = (name) => fireEvent.click(screen.getByLabelText(`Tick ${name}`));
const typePrice = (name, value) => fireEvent.change(screen.getByLabelText(`Selling price for ${name}`), { target: { value } });
const pickCategory = async (label, option) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};
const pressCreate = (count) => fireEvent.click(screen.getByRole('button', { name: `Create Items (${count})` }));
const createCalls = () => axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('create_seed_item'));
const csv = (text) => new File([text], 'prices.csv', { type: 'text/csv' });
const upload = async (file) => {
  await act(async () => { fireEvent.change(document.querySelector('input[type=file]'), { target: { files: [file] } }); });
  await waitFor(() => expect(screen.queryByText('Reading file...')).not.toBeInTheDocument());
};

describe('Starter products page', () => {
  it('lists the starter products with no price or category filled in, rather than a price of 0', async () => {
    renderPage();
    await loaded();
    expect(screen.getByLabelText('Selling price for Veg Burger')).toHaveValue(null);
    expect(screen.getAllByText('Uncategorised')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Create Items (0)' })).toBeDisabled();
  });

  it('will not save a ticked product that has no price, and says which one', async () => {
    renderPage();
    await loaded();
    tick('Veg Burger');
    pressCreate(1);

    expect(await screen.findByText(/1 ticked product needs attention before saving/)).toBeInTheDocument();
    expect(screen.getByText('Veg Burger: Enter a selling price.')).toBeInTheDocument();
    expect(createCalls()).toHaveLength(0);
  });

  it('will not save a price of 0 either', async () => {
    renderPage();
    await loaded();
    tick('Veg Burger');
    typePrice('Veg Burger', '0');
    pressCreate(1);
    expect(await screen.findByText(/The selling price is 0/)).toBeInTheDocument();
    expect(createCalls()).toHaveLength(0);
  });

  it('clears the warning as soon as the price is entered, then saves with the chosen category', async () => {
    renderPage();
    await loaded();
    tick('Veg Burger');
    pressCreate(1);
    await screen.findByText(/needs attention before saving/);

    typePrice('Veg Burger', '350');
    await pickCategory('Category for Veg Burger', 'Food');
    await waitFor(() => expect(screen.queryByText(/needs attention before saving/)).not.toBeInTheDocument());
    pressCreate(1);

    await waitFor(() => expect(createCalls()).toHaveLength(1));
    const body = createCalls()[0][1];
    expect(body).toMatchObject({ price_list: 'Standard Selling', buying_price_list: 'Standard Buying', company: 'Shop A Ltd', industry: 'REST', warehouse: 'Main Store - SA' });
    expect(body.items).toEqual([{ item_code: 'REST-001', item_name: 'Veg Burger', item_price: 350, item_group: 'Food', uom: 'Nos' }]);
  });

  it('records opening stock in the active store, with its cost', async () => {
    renderPage();
    await loaded();
    tick('Tusker Lager');
    typePrice('Tusker Lager', '250');
    fireEvent.change(screen.getByLabelText('Buying price for Tusker Lager'), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText('Quantity for Tusker Lager'), { target: { value: '24' } });
    pressCreate(1);

    await waitFor(() => expect(createCalls()).toHaveLength(1));
    expect(createCalls()[0][1].items[0]).toMatchObject({ item_code: 'REST-003', item_price: 250, buying_price: 180, qty: 24, warehouse: 'Main Store - SA', basic_rate: 180 });
  });

  it('asks for a store when stock is entered but none is chosen', async () => {
    renderPage({ warehouse: null });
    await loaded();
    tick('Tusker Lager');
    typePrice('Tusker Lager', '250');
    fireEvent.change(screen.getByLabelText('Quantity for Tusker Lager'), { target: { value: '24' } });
    pressCreate(1);
    expect(await screen.findByText('Tusker Lager: Choose a store in the top bar before adding stock quantities.')).toBeInTheDocument();
    expect(createCalls()).toHaveLength(0);
  });

  it('ticks every product from the header, not only the ones on the current page', async () => {
    seedList = Array.from({ length: 60 }, (_, i) => ({ sku: `REST-${100 + i}`, name: `Product ${100 + i}`, status: 'available' }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Product 100')).toBeInTheDocument());
    expect(screen.queryByText('Product 159')).not.toBeInTheDocument(); // only page 1 is on screen

    fireEvent.click(screen.getByLabelText('Tick all 60 products'));
    expect(screen.getByRole('button', { name: 'Create Items (60)' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Tick all 60 products'));
    expect(screen.getByRole('button', { name: 'Create Items (0)' })).toBeDisabled();
  });

  it('only ticks the products that match a search when "tick all" is used', async () => {
    renderPage();
    await loaded();
    fireEvent.change(screen.getByPlaceholderText(/Search products/), { target: { value: 'burger' } });
    fireEvent.click(screen.getByLabelText('Tick all 2 products'));
    expect(screen.getByRole('button', { name: 'Create Items (2)' })).toBeInTheDocument();
  });

  it('sets a category and a price for all ticked products at once', async () => {
    renderPage();
    await loaded();
    tick('Veg Burger');
    tick('Chicken Burger');
    await pickCategory('Set category for ticked products', 'Food');
    fireEvent.change(screen.getByLabelText('Selling price for ticked products'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set price' }));

    expect(screen.getByLabelText('Selling price for Veg Burger')).toHaveValue(400);
    expect(screen.getByLabelText('Selling price for Chicken Burger')).toHaveValue(400);
    expect(screen.getByLabelText('Selling price for Tusker Lager')).toHaveValue(null); // not ticked: untouched
    expect(within(screen.getByLabelText('Category for Veg Burger')).getByText('Food')).toBeInTheDocument();
  });

  it('fills prices from an uploaded spreadsheet and ticks the products it filled in', async () => {
    renderPage();
    await loaded();
    await upload(csv('item_code,category,selling_price,quantity\r\nREST-001,Food,"1,200",5\r\nREST-003,Beer,250,\r\n'));

    expect(await screen.findByText('File applied')).toBeInTheDocument();
    expect(screen.getByText(/2 products updated/)).toBeInTheDocument();
    expect(screen.getByLabelText('Selling price for Veg Burger')).toHaveValue(1200);
    expect(screen.getByLabelText('Quantity for Veg Burger')).toHaveValue(5);
    expect(screen.getByLabelText('Selling price for Tusker Lager')).toHaveValue(250);
    expect(screen.getByRole('button', { name: 'Create Items (2)' })).toBeEnabled();
  });

  it('reports rows of the file it could not use, and still applies the rest', async () => {
    renderPage();
    await loaded();
    await upload(csv('item_code,selling_price\r\nREST-001,abc\r\nREST-002,500\r\n'));

    expect(await screen.findByText(/1 row was skipped/)).toBeInTheDocument();
    expect(screen.getByText(/Row 2 \(REST-001\): The selling price "abc" is not a valid amount\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Selling price for Chicken Burger')).toHaveValue(500);
    expect(screen.getByLabelText('Selling price for Veg Burger')).toHaveValue(null);
  });

  it('refuses a file with no item_code column and leaves the list alone', async () => {
    renderPage();
    await loaded();
    await upload(csv('name,price\r\nBurger,5\r\n'));
    expect(await screen.findByText(/must contain "item_code"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Items (0)' })).toBeDisabled();
  });

  it('still accepts the old JSON file layout', async () => {
    renderPage();
    await loaded();
    const json = JSON.stringify({ price_list: 'Standard Selling', items: [{ item_code: 'REST-002', item_name: 'Chicken Burger', item_price: 620, qty: 3 }] });
    await upload(new File([json], 'old.json', { type: 'application/json' }));
    await waitFor(() => expect(screen.getByLabelText('Selling price for Chicken Burger')).toHaveValue(620));
  });

  it('gives a spreadsheet of the list to fill in', async () => {
    renderPage();
    await loaded();
    const clicked = [];
    const realCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = realCreate(tag);
      if (tag === 'a') el.click = () => clicked.push(el.download);
      return el;
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download list' }));
    document.createElement.mockRestore();
    expect(clicked).toEqual(['starter_products.csv']);
  });

  it('shows what the server did when only some products were saved', async () => {
    renderPage();
    await loaded();
    tick('Veg Burger');
    tick('Chicken Burger');
    typePrice('Veg Burger', '350');
    typePrice('Chicken Burger', '400');
    pressCreate(2);

    expect(await screen.findByText('Some products need attention')).toBeInTheDocument();
    expect(screen.getByText(/Chicken Burger: Out of range\./)).toBeInTheDocument();
  });

  it('shows the reason once when the starter products cannot be loaded', async () => {
    axiosInstance.post.mockImplementation(() => Promise.reject({ response: { status: 503, data: {} } }));
    renderPage();
    const messages = await screen.findAllByText(/busy or being updated/);
    expect(messages).toHaveLength(1);
  });
});
