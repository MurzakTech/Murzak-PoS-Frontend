/* eslint-disable testing-library/no-node-access --
   Three checks need structure no role query can express: that a difference label is the status element with its icon
   (closest and querySelector for the svg), that the current step is the list item holding the words, and that an error
   sits inside the review card (closest section). */
/**
 * Count stock, the guided count (ticket P4-4, AC-27): choose what to count, type what is on the shelves against what the
 * system expects, see each difference as an icon and a word and a total, then review and confirm. Confirming saves the
 * count once.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import CountStockFlow from './CountStockFlow';
import { getCountSheet, submitCount } from '../../api/stockLevelsApi';

jest.mock('../../api/stockLevelsApi', () => ({ getCountSheet: jest.fn(), submitCount: jest.fn() }));

const SHEET = {
  warehouse: 'Duka Kuu - DS',
  total: 3,
  truncated: false,
  rows: [
    { item_code: 'MLK', item_name: 'Maziwa 500ml', category: 'Maziwa', unit: 'Nos', expected: 4 },
    { item_code: 'MCH', item_name: 'Mchele Pishori', category: 'Nafaka', unit: 'Kg', expected: 25.5 },
    { item_code: 'UNG', item_name: 'Unga wa Ngano 2kg', category: 'Unga', unit: 'Nos', expected: 40 },
  ],
};
const TWO_STORES = [
  { value: 'Duka Kuu - DS', label: 'Duka Kuu' },
  { value: 'Duka la Pili - DS', label: 'Duka la Pili' },
];

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderFlow = (props = {}) =>
  render(
    <MemoryRouter initialEntries={['/new-look/stock/count']}>
      <ToastProvider>
        <CountStockFlow rootPath="/new-look/stock" categories={['Maziwa', 'Nafaka', 'Unga']} {...props} />
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );

const counted = (name) => screen.getByLabelText(`Counted: ${name}`);
const start = async () => {
  userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
  await screen.findByLabelText('Counted: Maziwa 500ml');
};
const typeCounts = (milk, rice, flour) => {
  if (milk !== undefined) userEvent.type(counted('Maziwa 500ml'), String(milk));
  if (rice !== undefined) userEvent.type(counted('Mchele Pishori'), String(rice));
  if (flour !== undefined) userEvent.type(counted('Unga wa Ngano 2kg'), String(flour));
};

beforeEach(() => {
  jest.resetAllMocks();
  getCountSheet.mockResolvedValue(SHEET);
  submitCount.mockResolvedValue({
    warehouse: 'Duka Kuu - DS',
    differences: [],
    totals: { lines: 3, short: 1, over: 1, matches: 1, net_difference: 1 },
    reconciliation: 'MAT-RECO-1',
  });
});

describe('step 1: what to count', () => {
  test('starts by asking what to count, with the three steps named', () => {
    renderFlow();
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1Choose what to count', '2Count', '3Review and confirm']);
    expect(within(steps).getByText('Choose what to count').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Step 1 of 3: Choose what to count')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'The whole store' })).toBeChecked();
  });

  test('says nothing changes until the count is confirmed', () => {
    renderFlow();
    expect(screen.getByText(/Nothing changes until you confirm/)).toBeInTheDocument();
  });

  test('offers the longer count by role, as a link to the current screen', () => {
    renderFlow();
    const link = screen.getByRole('link', { name: 'Count in three steps by role' });
    expect(link).toHaveAttribute('href', '/inventory/multi-level-reconciliation?legacy=1');
  });

  test('counting the whole store asks the server for the whole store', async () => {
    renderFlow();
    await start();
    expect(getCountSheet).toHaveBeenCalledWith({ scope: 'all', category: undefined, store: undefined });
  });

  test('counting one category needs a category first, then asks for that category', async () => {
    renderFlow();
    userEvent.click(screen.getByRole('radio', { name: 'One category' }));
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveAccessibleDescription('Choose a category to count');
    expect(getCountSheet).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('combobox', { name: 'Category' }));
    userEvent.click(screen.getByRole('option', { name: 'Nafaka' }));
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    await screen.findByLabelText('Counted: Maziwa 500ml');
    expect(getCountSheet).toHaveBeenCalledWith({ scope: 'category', category: 'Nafaka', store: undefined });
  });

  test('with two stores the store to count must be chosen', async () => {
    renderFlow({ stores: TWO_STORES });
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    expect(screen.getByRole('combobox', { name: 'Store to count' })).toHaveAccessibleDescription('Choose which store you are counting');
    expect(getCountSheet).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('combobox', { name: 'Store to count' }));
    userEvent.click(screen.getByRole('option', { name: 'Duka la Pili' }));
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    await screen.findByLabelText('Counted: Maziwa 500ml');
    expect(getCountSheet).toHaveBeenCalledWith(expect.objectContaining({ store: 'Duka la Pili - DS' }));
  });

  test('with one store no store is asked for', () => {
    renderFlow({ stores: [TWO_STORES[0]] });
    expect(screen.queryByRole('combobox', { name: 'Store to count' })).not.toBeInTheDocument();
  });
});

describe('step 2: expected against counted', () => {
  test('shows what the system expects for each product, with the unit in plain words', async () => {
    renderFlow();
    await start();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Product', 'Expected', 'Counted', 'Difference']);
    expect(within(screen.getByRole('row', { name: /Maziwa 500ml/ })).getByText('4 pieces')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Mchele Pishori/ })).getByText('25.5 kilograms')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Unga wa Ngano/ })).getByText('40 pieces')).toBeInTheDocument();
  });

  test('until something is typed each product says Not counted', async () => {
    renderFlow();
    await start();
    expect(screen.getAllByText('Not counted')).toHaveLength(3);
  });

  test('shows the difference as an icon and a word: Short, Over or Matches', async () => {
    renderFlow();
    await start();
    typeCounts(3, 25.5, 42);
    const milk = screen.getByRole('row', { name: /Maziwa 500ml/ });
    const rice = screen.getByRole('row', { name: /Mchele Pishori/ });
    const flour = screen.getByRole('row', { name: /Unga wa Ngano/ });
    expect(within(milk).getByText('Short by 1')).toBeInTheDocument();
    expect(within(milk).getByText('Short by 1').closest('.nl-status')).toHaveAttribute('data-difference', 'short');
    expect(within(milk).getByText('Short by 1').closest('.nl-status').querySelector('svg')).toBeInTheDocument();
    expect(within(rice).getByText('Matches')).toBeInTheDocument();
    expect(within(flour).getByText('Over by 2')).toBeInTheDocument();
  });

  test('shows a total: how many were counted, short, over and matching, and the net difference', async () => {
    renderFlow();
    await start();
    typeCounts(3, 25.5, 42);
    expect(screen.getByText('3 counted: 1 short, 1 over, 1 match')).toBeInTheDocument();
    expect(screen.getByText('Net difference: +1')).toBeInTheDocument();
  });

  test('a decimal count against a decimal expectation reads right', async () => {
    renderFlow();
    await start();
    typeCounts(undefined, 24.75);
    expect(within(screen.getByRole('row', { name: /Mchele Pishori/ })).getByText('Short by 0.75')).toBeInTheDocument();
  });

  test('Review is off until at least one product is counted', async () => {
    renderFlow();
    await start();
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
    expect(screen.getByText('Count at least one product to review')).toBeInTheDocument();
    typeCounts(4);
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled();
  });

  test('something that is not a number is flagged beside the box and blocks Review', async () => {
    renderFlow();
    await start();
    typeCounts(4);
    userEvent.type(counted('Mchele Pishori'), 'abc');
    expect(counted('Mchele Pishori')).toHaveAccessibleDescription('Enter a number, zero or more');
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
  });

  test('a count of zero is a real count', async () => {
    renderFlow();
    await start();
    typeCounts(0);
    expect(within(screen.getByRole('row', { name: /Maziwa 500ml/ })).getByText('Short by 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled();
  });

  test('a product can be found in a long list', async () => {
    renderFlow();
    await start();
    userEvent.type(screen.getByRole('textbox', { name: 'Search stock' }), 'unga');
    expect(screen.queryByRole('row', { name: /Maziwa 500ml/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Unga wa Ngano/ })).toBeInTheDocument();
  });

  test('counting only one product shows only that row', async () => {
    renderFlow({ itemCode: 'UNG' });
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    await screen.findByLabelText('Counted: Unga wa Ngano 2kg');
    expect(screen.queryByLabelText('Counted: Maziwa 500ml')).not.toBeInTheDocument();
  });

  test('if the list cannot load it says so and can try again', async () => {
    getCountSheet.mockRejectedValueOnce(new Error('The server is busy.'));
    renderFlow();
    userEvent.click(screen.getByRole('button', { name: 'Start counting' }));
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByLabelText('Counted: Maziwa 500ml');
    expect(getCountSheet).toHaveBeenCalledTimes(2);
  });

  test('says when a very long store was cut', async () => {
    getCountSheet.mockResolvedValue({ ...SHEET, truncated: true });
    renderFlow();
    await start();
    expect(screen.getByText(/more products than fit in one count/)).toBeInTheDocument();
  });
});

describe('step 3: review and confirm', () => {
  const toReview = async (milk, rice, flour) => {
    renderFlow();
    await start();
    typeCounts(milk, rice, flour);
    userEvent.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('heading', { name: 'Check your count' });
  };

  test('lists only the products that differ and says how many matched', async () => {
    await toReview(3, 25.5, 42);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(screen.getByText('1 counted products match and are not listed.')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Short by 1')).toBeInTheDocument();
  });

  test('when every count matches it says nothing will change', async () => {
    await toReview(4, 25.5, 40);
    expect(screen.getByText(/Nothing will change/)).toBeInTheDocument();
  });

  test('Confirm count saves the counted products once, for the store the list came from', async () => {
    await toReview(3, 25.5, 42);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    await screen.findByRole('heading', { name: 'Count saved' });
    expect(submitCount).toHaveBeenCalledTimes(1);
    expect(submitCount).toHaveBeenCalledWith({
      counts: [
        { item_code: 'MLK', counted: 3 },
        { item_code: 'MCH', counted: 25.5 },
        { item_code: 'UNG', counted: 42 },
      ],
      store: 'Duka Kuu - DS',
    });
  });

  test('pressing Confirm twice saves once', async () => {
    let finish;
    submitCount.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await toReview(3, undefined, undefined);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    expect(submitCount).toHaveBeenCalledTimes(1);
    finish({ warehouse: 'Duka Kuu - DS', differences: [], totals: { lines: 1, short: 1, over: 0, matches: 0, net_difference: -1 }, reconciliation: 'R1' });
    await screen.findByRole('heading', { name: 'Count saved' });
  });

  test('when the server changed nothing it says so', async () => {
    submitCount.mockResolvedValue({ warehouse: 'Duka Kuu - DS', differences: [], totals: { lines: 1, short: 0, over: 0, matches: 1, net_difference: 0 }, reconciliation: null });
    await toReview(4, undefined, undefined);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    expect(await screen.findByText('Nothing was changed, because every count matched.')).toBeInTheDocument();
  });

  test('a refusal stays on the review and can be tried again', async () => {
    submitCount.mockRejectedValueOnce(new Error('The server is busy.'));
    await toReview(3, undefined, undefined);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    expect(await within(screen.getByRole('heading', { name: 'Check your count' }).closest('section')).findByRole('alert')).toHaveTextContent('The count was not saved. The server is busy.');
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    await screen.findByRole('heading', { name: 'Count saved' });
    expect(submitCount).toHaveBeenCalledTimes(2);
  });

  test('Back keeps what was typed', async () => {
    await toReview(3, 25.5, 42);
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Counted: Maziwa 500ml')).toHaveValue('3');
    expect(counted('Unga wa Ngano 2kg')).toHaveValue('42');
  });

  test('after saving, Back to stock levels goes to the overview', async () => {
    await toReview(3, undefined, undefined);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    userEvent.click(await screen.findByRole('button', { name: 'Back to stock levels' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/stock');
  });

  test('Count again starts over at step 1 with nothing typed', async () => {
    await toReview(3, undefined, undefined);
    userEvent.click(screen.getByRole('button', { name: 'Confirm count' }));
    userEvent.click(await screen.findByRole('button', { name: 'Count again' }));
    expect(screen.getByText('Step 1 of 3: Choose what to count')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Start counting' })).toBeInTheDocument();
  });

  test('Nothing is sent before Confirm', async () => {
    await toReview(3, 25.5, 42);
    expect(submitCount).not.toHaveBeenCalled();
  });
});
