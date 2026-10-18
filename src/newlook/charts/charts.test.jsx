/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   One check needs the wrapper's own attribute, which no role query can reach: that the sparkline is hidden from screen readers. */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COLOUR, MARKS, paymentColour } from './chartTheme';
import { axisDayLabel, ellipsize, fullMoney, hourLabel, percent, shortDate, shortNumber } from './chartFormat';
import { capSeries, drawsColumns, groupPayments, hoursRows, hoursTip, latestRow, peakRow, salesRows, topProductRows } from './chartData';
import { HoursChart, MonthProgress, PaymentsChart, SalesChart, Sparkline, TopProductsChart } from './index';
import { sampleHours, samplePayments, sampleProducts, sampleSales } from './sampleData';

const NAMES = { mpesa: 'M-Pesa', cash: 'Cash', card: 'Card', credit: 'On credit', other: 'Other' };

describe('chart marks (Spec: Charts)', () => {
  it('holds the numbers the Spec states', () => {
    expect(MARKS).toMatchObject({ barMaxWidth: 24, barRadius: 4, barGap: 2, lineWidth: 2, areaOpacity: 0.1, dotDiameter: 8, dotRing: 2, gridWidth: 1, drawInMs: 300, maxColours: 4 });
  });

  it('gives M-Pesa, Cash, Card and On credit series-1 to series-4, and anything else the compare grey (AC-18)', () => {
    expect(paymentColour('M-Pesa')).toBe('var(--series-1)');
    expect(paymentColour('Cash')).toBe('var(--series-2)');
    expect(paymentColour('Card')).toBe('var(--series-3)');
    expect(paymentColour('On credit')).toBe('var(--series-4)');
    expect(paymentColour('Bank transfer')).toBe('var(--compare)');
  });

  it('uses only tokens for colour, never a hex code', () => {
    Object.values(COLOUR)
      .flat()
      .forEach((value) => expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/));
  });
});

describe('chart formats', () => {
  it('shortens axis numbers but not tooltip money', () => {
    expect(shortNumber(71000)).toBe('71K');
    expect(shortNumber(1300000)).toBe('1.3M');
    expect(shortNumber(950)).toBe('950');
    expect(fullMoney(71000)).toBe('KES 71,000');
  });

  it('writes dates day first', () => {
    expect(shortDate('2026-10-08')).toBe('Thu 8 Oct');
    expect(axisDayLabel('2026-10-12', 0, undefined)).toBe('12 Oct');
    expect(axisDayLabel('2026-10-13', 1, '2026-10-12')).toBe('13');
    expect(axisDayLabel('2026-11-01', 5, '2026-10-31')).toBe('1 Nov');
  });

  it('cuts a name at 24 characters and writes hours as am and pm', () => {
    expect(ellipsize('Short')).toBe('Short');
    expect(ellipsize('Physiotherapy session, 45 minutes').length).toBeLessThanOrEqual(24);
    expect(ellipsize('Physiotherapy session, 45 minutes').endsWith('…')).toBe(true);
    expect([8, 12, 16, 19].map(hourLabel)).toEqual(['8am', '12pm', '4pm', '7pm']);
    expect(percent(1, 4)).toBe(25);
    expect(percent(1, 0)).toBe(0);
  });
});

describe('chart arithmetic', () => {
  it('draws columns below 7 days and a line from 7', () => {
    expect(drawsColumns(6)).toBe(true);
    expect(drawsColumns(7)).toBe(false);
    expect(drawsColumns(undefined)).toBe(true);
  });

  it('keeps today out of the line and out of the peak', () => {
    const rows = salesRows([{ date: '2026-10-10', revenue: 100, count: 2 }, { date: '2026-10-11', revenue: 500, count: 3, so_far: true }, { date: '2026-10-09', revenue: 300, count: 1 }]);
    expect(rows[1].line).toBeNull();
    expect(rows[1].soFarValue).toBe(500);
    expect(peakRow(rows).date).toBe('2026-10-09');
    expect(latestRow(rows).date).toBe('2026-10-09');
  });

  it('has no peak when there were no sales', () => {
    expect(peakRow(salesRows([{ date: '2026-10-10', revenue: 0, count: 0 }]))).toBeNull();
  });

  it('marks a day with no sales as empty', () => {
    expect(salesRows([{ date: '2026-10-10', revenue: 0, count: 0 }])[0].empty).toBe(true);
  });

  it('groups payments in order, folds unknown methods into Other and hides parts under 2%', () => {
    const { total, parts } = groupPayments([{ method: 'M-Pesa', amount: 900 }, { method: 'Cash', amount: 85 }, { method: 'Bank transfer', amount: 15 }], NAMES);
    expect(total).toBe(1000);
    expect(parts.map((p) => p.key)).toEqual(['mpesa', 'cash', 'other']);
    expect(parts.find((p) => p.key === 'other').drawn).toBe(false);
    expect(parts.find((p) => p.key === 'cash').drawn).toBe(true);
    expect(parts.reduce((a, p) => a + p.amount, 0)).toBe(total);
  });

  it('covers 8am to 7pm, marks one peak, and suggests cover only when the peak is twice the average', () => {
    const model = hoursRows(sampleHours);
    expect(model.data.map((d) => d.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(model.data.filter((d) => d.peak)).toHaveLength(1);
    expect(model.peak.hour).toBe(16);
    expect(hoursTip(model)).toEqual({ from: 16, to: 18 });
    const flat = hoursRows(sampleHours.map((h) => ({ ...h, average_sales: 5 })));
    expect(hoursTip(flat)).toBeNull();
  });

  it('keeps five products at most, highest first, and folds a fifth colour into Other', () => {
    const top = topProductRows(sampleProducts);
    expect(top).toHaveLength(5);
    expect(top[0].revenue).toBeGreaterThanOrEqual(top[1].revenue);
    const capped = capSeries([{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }], { name: 'Other' });
    expect(capped).toHaveLength(4);
    expect(capped[3].value).toBe(9);
  });
});

describe('chart cards', () => {
  it('names the main finding as the chart name and in a note (AC-16)', () => {
    render(<SalesChart points={sampleSales(30)} daysOfData={30} rangeLabel="last 30 days" width={600} />);
    const figure = screen.getByRole('figure');
    expect(figure).toHaveAccessibleName(/^Daily revenue \(KES\), last 30 days, peak .* at KES [\d,]+$/);
  });

  it('switches between Chart and Table, and the table total equals the chart total', async () => {
    render(<PaymentsChart rows={samplePayments} rangeLabel="last 30 days" width={600} />);
    userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    const region = screen.getByRole('region', { name: 'How customers paid (KES)' });
    const total = samplePayments.reduce((a, p) => a + p.amount, 0);
    expect(within(region).getByText(fullMoney(total))).toBeInTheDocument();
    const rows = within(region).getAllByRole('row');
    expect(rows).toHaveLength(samplePayments.length + 2); // header, one per method, footer
  });

  it('shows the legend with amounts and shares for two or more series', () => {
    render(<PaymentsChart rows={samplePayments} rangeLabel="last 30 days" width={600} />);
    const legend = screen.getByRole('list', { name: 'How customers paid (KES)' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(4);
    expect(within(legend).getByText('M-Pesa')).toBeInTheDocument();
    expect(within(legend).getByText('KES 412,000')).toBeInTheDocument();
  });

  it('shows its own empty and error states without taking the page down', () => {
    const retry = jest.fn();
    const { rerender } = render(<HoursChart rows={[]} rangeLabel="last 30 days" width={600} />);
    expect(screen.getByText('No sales to show yet')).toBeInTheDocument();
    rerender(<HoursChart rows={sampleHours} rangeLabel="last 30 days" state="error" onRetry={retry} width={600} />);
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('offers a metric switch and leaves out Profit for a cashier', () => {
    const { rerender } = render(<SalesChart points={sampleSales(30)} daysOfData={30} rangeLabel="last 30 days" width={600} />);
    expect(screen.getByRole('radio', { name: 'Profit' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: 'Sales count' }));
    expect(screen.getByRole('figure').getAttribute('aria-label')).toMatch(/^Daily sales \(number of sales\)/);
    rerender(<SalesChart points={sampleSales(30)} daysOfData={30} rangeLabel="last 30 days" width={600} metrics={['revenue', 'count']} />);
    expect(screen.queryByRole('radio', { name: 'Profit' })).not.toBeInTheDocument();
  });

  it('names a top product in full in the table view even when the axis cuts it', () => {
    render(<TopProductsChart rows={sampleProducts} rangeLabel="last 30 days" width={600} />);
    userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByText('Physiotherapy session, 45 minutes')).toBeInTheDocument();
  });

  it('draws the month progress meter and a sparkline hidden from screen readers', () => {
    const { container } = render(
      <>
        <MonthProgress day={12} days={31} />
        <Sparkline values={[1, 2, 3]} width={96} height={32} />
      </>
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Day 12 of 31');
    expect(screen.getByText('Day 12 of 31')).toBeInTheDocument();
    expect(container.querySelector('.nl-spark')).toHaveAttribute('aria-hidden', 'true');
  });
});
