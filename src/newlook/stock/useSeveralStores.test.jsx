/**
 * Does the shop sell from two or more places? Stores and the transfer screens (in the Products header's More menu) show only then.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useSeveralStores from './useSeveralStores';

jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn() }));
// eslint-disable-next-line import/first
import { listWarehouses } from '../../store/warehouseSlice';

const Probe = () => <p data-testid="answer">{String(useSeveralStores())}</p>;

const mount = (state) =>
  render(
    <Provider store={configureStore({ reducer: (s = state) => s })}>
      <Probe />
    </Provider>
  );

const user = { company: 'Demo Shop' };

// The test setup resets every mock before each test, so the answer is given here
beforeEach(() => listWarehouses.mockReturnValue({ type: 'warehouse/list/test' }));

test('one real store is not several', () => {
  mount({ auth: { user }, warehouse: { warehouses: [{ name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu' }] } });
  expect(screen.getByTestId('answer')).toHaveTextContent('false');
});

test('the folders and stock-in-production places a new business comes with do not count as stores', () => {
  mount({
    auth: { user },
    warehouse: { warehouses: [{ name: 'Duka Kuu - DS' }, { name: 'Work In Progress - DS' }, { name: 'Goods In Transit - DS' }, { name: 'All Warehouses - DS', is_group: 1 }] },
  });
  expect(screen.getByTestId('answer')).toHaveTextContent('false');
});

test('two real stores are several', () => {
  mount({ auth: { user }, warehouse: { warehouses: [{ name: 'Duka Kuu - DS' }, { name: 'Tawi - DS', warehouse_name: 'Tawi' }] } });
  expect(screen.getByTestId('answer')).toHaveTextContent('true');
});

test('it asks for the shop warehouses once it knows the shop', () => {
  mount({ auth: { user }, warehouse: { warehouses: [] } });
  expect(listWarehouses).toHaveBeenCalledWith({ company: 'Demo Shop', limit: 1000 });
});

test('with no store behind it, or no answer yet, the answer is no', () => {
  render(<Probe />);
  expect(screen.getByTestId('answer')).toHaveTextContent('false');
});
