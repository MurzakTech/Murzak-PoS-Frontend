import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import KitchenStation from './index';
import authReducer from '../../store/authSlice';
import warehouseReducer from '../../store/warehouseSlice';
import axiosInstance from '../../api/axiosInstance';
import { defaultSettings, kitchenKey } from '../../utils/kitchenTickets';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));

const COMPANY = 'Test Co';
const sharedSettings = (over = {}) => ({
  ...defaultSettings(),
  enabled: true,
  screens: true,
  stations: [{ id: 'kitchen', name: 'Kitchen', groups: ['Food'] }, { id: 'bar', name: 'Bar', groups: ['Beer'] }],
  ...over,
});

const row = (id, over = {}) => ({
  id,
  client_id: `c${id}`,
  station: 'Kitchen',
  number: 10 + Number(id),
  round: 1,
  label: 'Table 4',
  order_type: 'table',
  sent_by_name: 'Amina',
  created_at: new Date(Date.now() - 3 * 60000).toISOString(),
  status: 'New',
  lines: { adds: [{ item_code: 'P', item_name: 'Pilau', qty: 2, note: 'no pilipili' }], changes: [], voids: [] },
  ...over,
});

let server;
const reply = (data) => Promise.resolve({ data: { message: { success: true, data } } });

const renderPage = () => {
  const store = configureStore({
    reducer: { auth: authReducer, warehouse: warehouseReducer },
    preloadedState: {
      auth: { ...authReducer(undefined, { type: 'x' }), user: { company: COMPANY, full_name: 'Cook' } },
      warehouse: { ...warehouseReducer(undefined, { type: 'x' }), warehouses: [], activeWarehouse: { name: 'Shop A' } },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <KitchenStation />
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  window.localStorage.clear();
  server = { settings: sharedSettings(), tickets: [row('1'), row('2', { station: 'Bar', label: '', order_type: 'counter', lines: { adds: [{ item_code: 'T', item_name: 'Tusker', qty: 1, note: '' }], changes: [], voids: [] } })] };
  axiosInstance.post.mockReset().mockImplementation((url, payload) => {
    if (url.endsWith('get_kitchen_settings')) return reply({ settings: server.settings });
    if (url.endsWith('list_tickets')) {
      let list = server.tickets.filter((t) => !payload.station || t.station === payload.station);
      if (payload.statuses) list = list.filter((t) => payload.statuses.includes(t.status));
      return reply(list);
    }
    if (url.endsWith('set_ticket_status')) {
      const t = server.tickets.find((x) => x.id === payload.id);
      t.status = payload.status;
      return reply(t);
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
});

describe('Kitchen station screen', () => {
  it('asks which station this screen is, and remembers the answer on the device', async () => {
    renderPage();
    expect(await screen.findByText('Which station is this screen?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kitchen' }));
    expect(await screen.findByText('Table 4')).toBeInTheDocument();
    expect(window.localStorage.getItem(`pos_station_v1:${COMPANY}`)).toBe('Kitchen');
  });

  it('shows only its own station\'s tickets, with items, notes, number and age', async () => {
    window.localStorage.setItem(`pos_station_v1:${COMPANY}`, 'Kitchen');
    renderPage();
    const card = within(await screen.findByTestId('card-1'));
    expect(card.getByText('2 x Pilau')).toBeInTheDocument();
    expect(card.getByText('no pilipili')).toBeInTheDocument();
    expect(card.getByText('#11')).toBeInTheDocument();
    expect(card.getByText('3 min')).toBeInTheDocument();
    expect(screen.queryByText('1 x Tusker')).not.toBeInTheDocument();
  });

  it('shows a counter order by its number', async () => {
    window.localStorage.setItem(`pos_station_v1:${COMPANY}`, 'Bar');
    renderPage();
    const card = within(await screen.findByTestId('card-2'));
    expect(card.getByText('Counter order')).toBeInTheDocument();
    expect(card.getByText('#12')).toBeInTheDocument();
  });

  it('moves a ticket along: Start, Ready, Served, and tells the server each time', async () => {
    window.localStorage.setItem(`pos_station_v1:${COMPANY}`, 'Kitchen');
    renderPage();
    const card = await screen.findByTestId('card-1');
    fireEvent.click(within(card).getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(server.tickets[0].status).toBe('Preparing'));
    fireEvent.click(await within(screen.getByTestId('card-1')).findByRole('button', { name: 'Ready' }));
    await waitFor(() => expect(server.tickets[0].status).toBe('Ready'));
    fireEvent.click(await within(screen.getByTestId('card-1')).findByRole('button', { name: 'Served' }));
    await waitFor(() => expect(screen.queryByTestId('card-1')).not.toBeInTheDocument());
    expect(server.tickets[0].status).toBe('Served');
  });

  it('keeps cancellations as a record on their own tab', async () => {
    server.tickets.push(row('3', { status: 'Served', lines: { adds: [], changes: [], voids: [{ item_code: 'P', item_name: 'Pilau', qty: 1, note: '' }] } }));
    window.localStorage.setItem(`pos_station_v1:${COMPANY}`, 'Kitchen');
    renderPage();
    await screen.findByTestId('card-1');
    fireEvent.click(screen.getByRole('tab', { name: 'Cancellations' }));
    const record = within(await screen.findByTestId('cancel-3'));
    expect(record.getByText('Cancelled: 1 x Pilau')).toBeInTheDocument();
  });

  it('says so when station screens are switched off', async () => {
    server.settings = sharedSettings({ screens: false });
    renderPage();
    expect(await screen.findByText('Station screens are switched off')).toBeInTheDocument();
  });

  it('says so when the server has no station screen calls yet', async () => {
    axiosInstance.post.mockReset().mockRejectedValue({ response: { status: 404, data: { exc: 'Failed to get method techsavanna_pos.api.kitchen_api.get_kitchen_settings' } } });
    renderPage();
    expect(await screen.findByText('Station screens are not available yet')).toBeInTheDocument();
  });

  it('lets the device change station', async () => {
    window.localStorage.setItem(`pos_station_v1:${COMPANY}`, 'Kitchen');
    renderPage();
    await screen.findByTestId('card-1');
    fireEvent.click(screen.getByRole('button', { name: 'Change station' }));
    expect(await screen.findByText('Which station is this screen?')).toBeInTheDocument();
    expect(window.localStorage.getItem(`pos_station_v1:${COMPANY}`)).toBeNull();
  });
});
