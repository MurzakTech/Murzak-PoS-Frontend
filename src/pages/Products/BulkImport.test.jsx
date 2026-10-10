import React from 'react';
import fs from 'fs';
import path from 'path';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkImport from './BulkImport';
import authReducer from '../../store/authSlice';
import productReducer from '../../store/productSlice';
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

beforeEach(() => {
  axiosInstance.post.mockReset();
});

const renderPage = () => {
  const store = configureStore({
    reducer: { auth: authReducer, product: productReducer, notification: notificationReducer },
    preloadedState: { auth: { ...authReducer(undefined, { type: 'init' }), user: { company: 'Shop A Ltd' } } },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <BulkImport />
      </MemoryRouter>
    </Provider>
  );
};

const choose = async (file) => {
  const input = document.getElementById('file-upload');
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  // reading a file takes a moment; wait until the page has finished with it
  await waitFor(() => expect(screen.queryByText('Reading file...')).not.toBeInTheDocument());
};

const csv = (text, name = 'products.csv') => new File([text], name, { type: 'text/csv' });

const CSV_WITH_TRICKY_ROWS =
  'item_code,item_name,item_group,stock_uom,standard_rate\r\n' +
  'B001,Tusker Lager 500ml,Beer,Nos,250\r\n' +
  'B002,"Burger, Cheese",Food,Nos,650\r\n' +
  'B005,Whisky 750ml,Spirits,Nos,"1,200"\r\n' +
  'B006,Broken price,Spirits,Nos,abc\r\n';

describe('BulkImport page', () => {
  it('checks the whole file as soon as it is chosen and shows what is wrong, by row', async () => {
    renderPage();
    await choose(csv(CSV_WITH_TRICKY_ROWS));

    expect(screen.getByText('3 ready to import')).toBeInTheDocument();
    expect(screen.getByText('1 with problems')).toBeInTheDocument();
    expect(screen.getByText(/"abc" is not a number/)).toBeInTheDocument();
    expect(screen.getByText('B006')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 3 products' })).toBeEnabled();
  });

  it('sends only the good rows, flat, with names and prices intact', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { created: 3, failed: [] } } });
    renderPage();
    await choose(csv(CSV_WITH_TRICKY_ROWS));

    fireEvent.click(screen.getByRole('button', { name: 'Import 3 products' }));
    await waitFor(() => expect(screen.getByText('Import finished')).toBeInTheDocument());

    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    const [url, body] = axiosInstance.post.mock.calls[0];
    expect(url).toBe('techsavanna_pos.api.product_api.bulk_create_products');
    expect(body.company).toBe('Shop A Ltd');
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.map((p) => [p.item_code, p.item_name, p.standard_rate])).toEqual([
      ['B001', 'Tusker Lager 500ml', 250],
      ['B002', 'Burger, Cheese', 650],
      ['B005', 'Whisky 750ml', 1200],
    ]);
    expect(screen.getByText(/3 products saved\./)).toBeInTheDocument();
    expect(screen.getByText(/1 row was left out because of problems/)).toBeInTheDocument();
  });

  it('reports failures from the server instead of calling everything a success', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { created: 2, failed: [{ item_code: 'B002', error: 'Item group does not exist.' }] } } });
    renderPage();
    await choose(csv(CSV_WITH_TRICKY_ROWS));
    fireEvent.click(screen.getByRole('button', { name: 'Import 3 products' }));

    await waitFor(() => expect(screen.getByText('Some products need attention')).toBeInTheDocument());
    expect(screen.getByText(/2 products saved\. 1 could not be saved\./)).toBeInTheDocument();
    expect(screen.getByText('B002: Item group does not exist')).toBeInTheDocument();
  });

  it('keeps the file and shows the reason when the server refuses, so it can be retried', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 500, data: { message: 'Something broke' } } });
    renderPage();
    await choose(csv(CSV_WITH_TRICKY_ROWS));
    fireEvent.click(screen.getByRole('button', { name: 'Import 3 products' }));

    await waitFor(() => expect(screen.getByText('Nothing was imported')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Import 3 products' })).toBeEnabled();
    expect(screen.queryByText('Import finished')).not.toBeInTheDocument();
  });

  it('cannot be sent twice by clicking again while it is working', async () => {
    let finish;
    axiosInstance.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderPage();
    await choose(csv(CSV_WITH_TRICKY_ROWS));
    const button = screen.getByRole('button', { name: 'Import 3 products' });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Importing...' })).toBeDisabled();

    await act(async () => { finish({ data: { message: { created: 3 } } }); });
    await waitFor(() => expect(screen.getByText('Import finished')).toBeInTheDocument());
  });

  it('refuses a file without the required columns and says what it found', async () => {
    renderPage();
    await choose(csv('code,price\r\nA1,5\r\n'));
    expect(screen.getByText(/must contain "item_name"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Products' })).toBeDisabled();
  });

  it('reads a real Excel file: numeric cells, friendly headings, blank rows, first sheet only', async () => {
    renderPage();
    const bytes = fs.readFileSync(path.join(__dirname, '__fixtures__', 'products.xlsx'));
    await choose(new File([bytes], 'products.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

    await waitFor(() => expect(screen.getByText('3 ready to import')).toBeInTheDocument());
    expect(screen.getByText('1 with problems')).toBeInTheDocument();
    expect(screen.getByText('1 without a price')).toBeInTheDocument();
    expect(screen.getByText('Milk, Fresh 1L')).toBeInTheDocument();
    expect(screen.queryByText('IGNORED')).not.toBeInTheDocument();
    // blank row 4 is skipped, but the bad row is still reported at its place in the sheet
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('explains what to do with an old .xls file', async () => {
    renderPage();
    await choose(new File(['x'], 'old.xls', { type: 'application/vnd.ms-excel' }));
    expect(screen.getByText(/Old Excel files \(\.xls\) cannot be read/)).toBeInTheDocument();
  });
});
