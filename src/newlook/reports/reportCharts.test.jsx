/* eslint-disable testing-library/no-node-access --
   A chart's marks are drawn as SVG shapes that no role query reaches; the checks count bars and read the legend list. */
/**
 * The charts that are new in Reports (ticket P5-2), checked against the Spec's chart rules (AC-16, AC-17): a one-sentence
 * name that states the finding, a Chart and Table toggle with the same numbers, a legend that carries the amounts,
 * empty and loading states, and only tokens for colour.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgeChart, { AGE_COLOURS } from './AgeChart';
import BarsChart from './BarsChart';
import ColumnsChart from './ColumnsChart';
import WaterfallChart, { waterfallRows } from './WaterfallChart';
import { ageParts, barRows, columnRows, waterfallSteps } from './reportsModel';
import { COSTS, OWED, PROFIT } from './__fixtures__/reportAnswers';
import T from './strings.reports';

const WIDTH = 640;
const showTable = () => userEvent.click(screen.getByRole('radio', { name: 'Table' }));

describe('the waterfall', () => {
  const steps = waterfallSteps(PROFIT.series.waterfall);
  const draw = (extra = {}) =>
    render(<WaterfallChart title="From sales to profit (KES)" summary="From sales to profit, the last 30 days: net profit KES 23,000" steps={steps} tableHeaders={{ step: 'Step', amount: 'Amount (KES)' }} width={WIDTH} {...extra} />);

  test('the costs float down from the top of the sales and the last column stands on the line', () => {
    const rows = waterfallRows(steps);
    expect(rows.map((r) => r.range)).toEqual([[0, 100000], [38000, 100000], [23000, 38000], [0, 23000]]);
  });

  test('a loss is a last column below the line', () => {
    const rows = waterfallRows([{ key: 'sales', amount: 100 }, { key: 'cost_of_goods', amount: 80 }, { key: 'running_costs', amount: 30 }, { key: 'net_profit', amount: -10 }]);
    expect(rows[2].range).toEqual([-10, 20]);
    expect(rows[3].range).toEqual([-10, 0]);
  });

  test('the chart is named by its finding, and the table has the same four steps and amounts', () => {
    draw();
    expect(screen.getByRole('figure', { name: /net profit KES 23,000/ })).toBeInTheDocument();
    showTable();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByRole('cell', { name: '-KES 62,000' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'KES 23,000' })).toBeInTheDocument();
  });

  test('loading shows no chart, and a report with nothing in it shows the empty words', () => {
    draw({ state: 'loading' });
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  test('empty uses the words it is given, not the sales words', () => {
    draw({ steps: waterfallSteps([{ key: 'sales', amount: 0 }]), emptyTitle: 'No profit to show yet', emptyText: 'Profit appears here once you have made sales.' });
    expect(screen.getByText('No profit to show yet')).toBeInTheDocument();
    expect(screen.queryByText('No sales to show yet')).not.toBeInTheDocument();
  });
});

describe('columns over time', () => {
  const rows = columnRows(COSTS.series.by_day, 'amount', 'date');
  const draw = (extra = {}) => render(<ColumnsChart title="Running costs by day (KES)" summary="Running costs by day, the last 30 days: most on Fri 2 Oct at KES 12,000" rows={rows} valueName="Running costs" tableHeader="Day" width={WIDTH} {...extra} />);

  test('named by its finding, with a table that adds up to the total', () => {
    draw();
    expect(screen.getByRole('figure', { name: /most on Fri 2 Oct/ })).toBeInTheDocument();
    showTable();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Total')).toBeInTheDocument();
    expect(within(table).getAllByRole('cell', { name: 'KES 14,900' })).toHaveLength(1);
    expect(within(table).getByText('Tue 13 Oct (so far)')).toBeInTheDocument();
  });

  test('all zero is the empty state', () => {
    draw({ rows: rows.map((r) => ({ ...r, value: 0 })), emptyTitle: 'No running costs in this period', emptyText: 'Add an expense.' });
    expect(screen.getByText('No running costs in this period')).toBeInTheDocument();
  });

  test('an error offers a retry', async () => {
    const onRetry = jest.fn();
    draw({ state: 'error', onRetry });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('horizontal bars', () => {
  const rows = barRows(COSTS.series.categories, 'category', T.costs.otherCount);
  const draw = (extra = {}) => render(<BarsChart title="Running costs by category (KES)" summary="Running costs by category: Rent is the biggest at KES 12,000" rows={rows} valueName="Spent (KES)" nameHeader="Category" width={WIDTH} {...extra} />);

  test('the table lists every category with its share and a total', () => {
    draw();
    showTable();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: 'Rent' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '73%' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'KES 16,400' })).toBeInTheDocument();
  });

  test('a long name is cut on the axis but whole in the table', () => {
    const long = 'Electricity and water for the shop and the stores at the back';
    draw({ rows: barRows([{ category: long, amount: 5 }], 'category', T.costs.otherCount) });
    showTable();
    expect(screen.getByRole('cell', { name: long })).toBeInTheDocument();
  });

  test('no rows is the empty state', () => {
    draw({ rows: [], emptyTitle: 'Nothing here' });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('the age bar', () => {
  const parts = ageParts(OWED.series.age_bands, T.owed.bands, 'amount', 'customers');
  const words = (n) => (n === 1 ? '1 customer' : `${n} customers`);
  const draw = (extra = {}) => render(<AgeChart title="How old the debts are (KES)" summary="Money owed as at Tue 13 Oct: 0 to 7 days KES 21,000, Over 30 days KES 3,500" parts={parts} countWords={words} tableHeaders={{ band: 'Age of the debt', amount: 'Amount (KES)', customers: 'Customers' }} width={WIDTH} {...extra} />);

  test('the legend names every age with its amount and number of customers, so age is never read from colour alone', () => {
    draw();
    const legend = screen.getByRole('list', { name: 'How old the debts are (KES)' });
    const items = within(legend).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('0 to 7 daysKES 21,0001 customer');
    expect(items[3]).toHaveTextContent('Over 30 daysKES 3,5001 customer');
  });

  test('the table adds up to the total', () => {
    draw();
    showTable();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: 'KES 24,500' })).toBeInTheDocument();
  });

  test('the four ages are an ordered scale made only of tokens', () => {
    expect(AGE_COLOURS).toEqual(['var(--age-1)', 'var(--age-2)', 'var(--age-3)', 'var(--age-4)']);
  });

  test('nobody owing anything is the empty state', () => {
    draw({ parts: ageParts([], T.owed.bands, 'amount', 'customers'), emptyTitle: 'Nobody owes you money', emptyText: 'x' });
    expect(screen.getByText('Nobody owes you money')).toBeInTheDocument();
  });
});
