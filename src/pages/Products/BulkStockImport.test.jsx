import React from 'react';
import fs from 'fs';
import path from 'path';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkStockImport from './BulkStockImport';
import authReducer from '../../store/authSlice';
import productReducer from '../../store/productSlice';
import warehouseReducer from '../../store/warehouseSlice';
import notificationReducer from '../../store/notificationSlice';
import axiosInstance from '../../api/axiosInstance';
import { localDateString } from '../../utils/stockImport';

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

const STORES = [{ name: 'Main Store - SA', warehouse_name: 'Main Store' }, { name: 'Back Store - SA', warehouse_name: 'Back Store' }];
let importReply;
let storeList;

beforeEach(() => {
  importReply = { success_count: 2, failed_count: 0 };
  storeList = STORES;
  axiosInstance.post.mockReset().mockImplementation((url) => {
    if (url.endsWith('bulk_import_opening_stock')) return Promise.resolve({ data: { message: importReply } });
    if (/warehouse/i.test(url)) return Promise.resolve({ data: { message: { warehouses: storeList } } });
    return Promise.reject(new Error(`unexpected call ${url}`));
  });
});

const renderPage = ({ active = STORES[0] } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, product: productReducer, warehouse: warehouseReducer, notification: notificationReducer },
    preloadedState: {
      auth: { ...authReducer(undefined, { type: 'init' }), user: { company: 'Shop A Ltd' } },
      warehouse: { ...warehouseReducer(undefined, { type: 'init' }), activeWarehouse: active },
    },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <BulkStockImport />
      </MemoryRouter>
    </Provider>
  );
};

const choose = async (file) => {
  await act(async () => {
    fireEvent.change(document.getElementById('file-upload'), { target: { files: [file] } });
  });
  await waitFor(() => expect(screen.queryByText('Reading file...')).not.toBeInTheDocument());
};
const csv = (text, name = 'stock.csv') => new File([text], name, { type: 'text/csv' });
const importCalls = () => axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('bulk_import_opening_stock'));

const FILE =
  'item_code,qty\r\n' +
  'B001,100\r\n' +
  'B002,"1,250"\r\n' +
  'B003,0\r\n' +
  'B004,abc\r\n' +
  'B001,5\r\n';

describe('BulkStockImport page', () => {
  it('checks the whole file when it is chosen: what is ready, what is skipped, and what is wrong by row', async () => {
    renderPage();
    await choose(csv(FILE));

    expect(screen.getByText('2 ready to import')).toBeInTheDocument();
    expect(screen.getByText('2 with problems')).toBeInTheDocument();
    expect(screen.getByText('Quantity "abc" is not a number.')).toBeInTheDocument();
    expect(screen.getByText(/already used on row 2/)).toBeInTheDocument();
    expect(screen.getByText(/1 row has a quantity of 0 and will be skipped/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record stock for 2 items' })).toBeEnabled();
  });

  it('says exactly what will happen, then sends only the good rows to the chosen store and date', async () => {
    importReply = { success_count: 2, failed_count: 0, stock_entry_name: 'MAT-STE-0007' };
    renderPage();
    await choose(csv(FILE));
    expect(screen.getByText(`2 items will be recorded in Main Store, dated ${localDateString()}. Do not import the same file twice: the stock may be recorded twice.`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Record stock for 2 items' }));
    await waitFor(() => expect(screen.getByText('Opening stock recorded', { selector: '.MuiAlertTitle-root' })).toBeInTheDocument());

    expect(importCalls()).toHaveLength(1);
    expect(importCalls()[0][1]).toEqual({
      company: 'Shop A Ltd',
      warehouse: 'Main Store - SA',
      posting_date: localDateString(),
      stock_data: [{ item_code: 'B001', qty: 100 }, { item_code: 'B002', qty: 1250 }],
    });
    expect(screen.getByText(/2 items recorded\./)).toBeInTheDocument();
    expect(screen.getByText(/Stock was recorded in Main Store\./)).toBeInTheDocument();
    expect(screen.getByText(/Stock entry: MAT-STE-0007\./)).toBeInTheDocument();
    expect(screen.getByText(/2 rows were left out because of problems in your file/)).toBeInTheDocument();
  });

  it('records stock in whichever store is chosen on the page', async () => {
    renderPage();
    await choose(csv('item_code,qty\nA1,5\n'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Stock Location/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Back Store' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record stock for 1 item' }));

    await waitFor(() => expect(importCalls()).toHaveLength(1));
    expect(importCalls()[0][1].warehouse).toBe('Back Store - SA');
  });

  it('will not record anything while there is no store to record it in', async () => {
    storeList = []; // a new business with no stores yet (otherwise the app picks one automatically)
    renderPage({ active: null });
    await choose(csv('item_code,qty\nA1,5\n'));
    expect(screen.getByText('Choose a stock location and a posting date to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record stock for 1 item' })).toBeDisabled();
  });

  it('starts with today in the person\'s own timezone and warns about a future date', async () => {
    renderPage();
    const date = screen.getByLabelText(/Posting Date/);
    expect(date).toHaveValue(localDateString());
    fireEvent.change(date, { target: { value: '2999-01-01' } });
    expect(screen.getByText('This date is in the future.')).toBeInTheDocument();
  });

  it('cannot be sent twice by clicking again, which would record the stock twice', async () => {
    let finish;
    axiosInstance.post.mockImplementation((url) => {
      if (url.endsWith('bulk_import_opening_stock')) return new Promise((resolve) => { finish = resolve; });
      return Promise.resolve({ data: { message: { warehouses: STORES } } });
    });
    renderPage();
    await choose(csv('item_code,qty\nA1,5\n'));
    const button = screen.getByRole('button', { name: 'Record stock for 1 item' });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(importCalls()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Recording...' })).toBeDisabled();

    await act(async () => { finish({ data: { message: { success_count: 1 } } }); });
    await waitFor(() => expect(screen.getByText(/1 item recorded\./)).toBeInTheDocument());
  });

  it('clears the file after recording, so the same stock is not sent a second time by accident', async () => {
    renderPage();
    await choose(csv('item_code,qty\nA1,5\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Record stock for 1 item' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import Stock' })).toBeDisabled());
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
  });

  it('lists the items the server could not record instead of a plain success', async () => {
    importReply = { success_count: 1, failed_count: 1, errors: [{ item_code: 'A2', error: 'Item A2 does not exist.' }] };
    renderPage();
    await choose(csv('item_code,qty\nA1,5\nA2,3\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Record stock for 2 items' }));

    await waitFor(() => expect(screen.getByText('Some items need attention', { selector: '.MuiAlertTitle-root' })).toBeInTheDocument());
    expect(screen.getByText(/1 item recorded\. 1 could not be recorded\./)).toBeInTheDocument();
    expect(screen.getByText('A2: Item A2 does not exist')).toBeInTheDocument();
  });

  it('keeps the file and shows the reason when the server refuses, so it can be retried', async () => {
    axiosInstance.post.mockImplementation((url) => {
      if (url.endsWith('bulk_import_opening_stock')) return Promise.reject({ response: { status: 500, data: { message: 'Something broke' } } });
      return Promise.resolve({ data: { message: { warehouses: STORES } } });
    });
    renderPage();
    await choose(csv('item_code,qty\nA1,5\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Record stock for 1 item' }));

    await waitFor(() => expect(screen.getByText('Nothing was recorded')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Record stock for 1 item' })).toBeEnabled();
  });

  it('refuses a file without the required columns and says what it found', async () => {
    renderPage();
    await choose(csv('code,price\nA1,5\n'));
    expect(screen.getByText(/must contain "qty"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Stock' })).toBeDisabled();
  });

  it('reads a real Excel file: numeric cells, decimals, a blank row, a zero and a typo', async () => {
    renderPage();
    const bytes = fs.readFileSync(path.join(__dirname, '__fixtures__', 'stock.xlsx'));
    await choose(new File([bytes], 'stock.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

    await waitFor(() => expect(screen.getByText('2 ready to import')).toBeInTheDocument());
    expect(screen.getByText('1 with problems')).toBeInTheDocument();
    expect(screen.getByText('Quantity "lots" is not a number.')).toBeInTheDocument();
    expect(screen.getByText('Milk, Fresh 1L')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText(/1 row has a quantity of 0/)).toBeInTheDocument();
  });

  it('explains what to do with an old .xls file', async () => {
    renderPage();
    await choose(new File(['x'], 'old.xls', { type: 'application/vnd.ms-excel' }));
    expect(screen.getByText(/Old Excel files \(\.xls\) cannot be read/)).toBeInTheDocument();
  });
});
