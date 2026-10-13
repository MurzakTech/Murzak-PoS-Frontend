/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   These tests check structure that no role or label query can express: that a header cell is a column header,
   that a skeleton shape is hidden from screen readers, that an icon sits beside its words. */
/**
 * Ticket P1-4: the data components (Table and summary row, Pagination, Filter row, Tabs, Detail panel, Empty
 * state, Skeleton, Segmented control and the list hook) and their sample-data page. Acceptance check AC-04:
 * each component exists once, with its states; plus the behaviour and accessibility rules of Part 1.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import ComponentPage from '../ComponentPage';
import {
  DetailFacts,
  DetailPanel,
  EmptyState,
  FilterRow,
  ListWithDetail,
  LoadingGate,
  Pagination,
  Segmented,
  SKELETON_DELAY_MS,
  SkeletonRows,
  SummaryRow,
  Table,
  Tabs,
  ToastProvider,
  formatCount,
  formatMoney,
  formatShowing,
  useListParams,
} from './index';

const css = fs.readFileSync(path.join(__dirname, 'data-components.css'), 'utf8');
const block = (selector) => {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`));
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
};

const Where = () => {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}`}</output>;
};
const inRouter = (ui, entry = '/list') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      {ui}
      <Where />
    </MemoryRouter>
  );

describe('formats', () => {
  test('money is KES with thousands commas and no decimals unless there are cents', () => {
    expect(formatMoney(2350)).toBe('KES 2,350');
    expect(formatMoney(2350.5)).toBe('KES 2,350.50');
    expect(formatMoney(-120)).toBe('-KES 120');
    expect(formatMoney('')).toBe('');
    expect(formatMoney(undefined)).toBe('');
  });
  test('counts carry their noun and "Showing x of y" is exact', () => {
    expect(formatCount(1, 'item')).toBe('1 item');
    expect(formatCount(7, 'item')).toBe('7 items');
    expect(formatCount(2, 'person', 'people')).toBe('2 people');
    expect(formatShowing(20, 135)).toBe('Showing 20 of 135');
  });
});

describe('Skeleton and loading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('shows nothing grey for the first 200ms, then the shapes; never a spinner', () => {
    const { container } = render(
      <LoadingGate loading skeleton={<SkeletonRows rows={2} columns={3} />} minHeight="100px">
        <p>Loaded</p>
      </LoadingGate>
    );
    expect(SKELETON_DELAY_MS).toBe(200);
    expect(container.querySelector('.nl-skeleton')).toBeNull();
    act(() => jest.advanceTimersByTime(199));
    expect(container.querySelector('.nl-skeleton')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(container.querySelectorAll('.nl-skeleton').length).toBe(6);
    expect(container.querySelector('.nl-spinner')).toBeNull();
  });

  test('reserves the space, marks the region busy and tells screen readers it is loading', () => {
    const { container } = render(
      <LoadingGate loading skeleton={<SkeletonRows />} minHeight="200px" label="Loading the list">
        <p>Loaded</p>
      </LoadingGate>
    );
    const region = container.querySelector('.nl-loading');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region.style.minHeight).toBe('200px');
    expect(screen.getByRole('status')).toHaveTextContent('Loading the list');
  });

  test('a quick answer never flashes the shapes', () => {
    const { container, rerender } = render(
      <LoadingGate loading skeleton={<SkeletonRows />}>
        <p>Loaded</p>
      </LoadingGate>
    );
    act(() => jest.advanceTimersByTime(100));
    rerender(
      <LoadingGate loading={false} skeleton={<SkeletonRows />}>
        <p>Loaded</p>
      </LoadingGate>
    );
    act(() => jest.advanceTimersByTime(500));
    expect(screen.getByText('Loaded')).toBeInTheDocument();
    expect(container.querySelector('.nl-skeleton')).toBeNull();
  });

  test('the shapes are hidden from screen readers and the shimmer stops for reduced motion', () => {
    const { container } = render(<SkeletonRows rows={1} columns={2} />);
    expect(container.querySelector('.nl-skeleton-rows')).toHaveAttribute('aria-hidden', 'true');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.nl-skeleton\s*\{\s*animation: none/);
  });
});

describe('EmptyState', () => {
  test('has an icon, a headline, one sentence and one primary action', async () => {
    const onClick = jest.fn();
    const { container } = render(<EmptyState title="No customers yet" description="Add your first customer." action={{ label: 'Add a customer', icon: 'plus', onClick }} />);
    expect(screen.getByRole('heading', { name: 'No customers yet' })).toBeInTheDocument();
    expect(screen.getByText('Add your first customer.')).toBeInTheDocument();
    expect(container.querySelector('.nl-empty__icon svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Add a customer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  test('the error version says what went wrong in words, not only in colour', () => {
    const { container } = render(<EmptyState icon="alert" tone="error" title="We could not load this" description="Try again." />);
    expect(container.querySelector('.nl-empty')).toHaveClass('is-error');
    expect(screen.getByRole('heading', { name: 'We could not load this' })).toBeInTheDocument();
  });
});

describe('Segmented control', () => {
  const options = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
  ];

  test('is a group of radio buttons with the chosen one marked', () => {
    render(<Segmented label="Period" options={options} value="7d" onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Period' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveAttribute('aria-checked', 'false');
  });

  test('only the chosen segment is in the Tab order; arrow keys move and choose; Home and End jump', async () => {
    const seen = [];
    const Host = () => {
      const [value, setValue] = React.useState('7d');
      return (
        <Segmented
          label="Period"
          options={options}
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    };
    render(<Host />);
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveAttribute('tabindex', '-1');
    screen.getByRole('radio', { name: '7 days' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveAttribute('aria-checked', 'true');
    expect(seen).toEqual(['30d', '7d', 'today', '30d', 'today']);
  });

  test('the selected segment is soft fill, brand-text, 600 weight', () => {
    const rule = block('.nl-segmented__item.is-selected');
    expect(rule).toMatch(/background-color:\s*var\(--soft\)/);
    expect(rule).toMatch(/color:\s*var\(--brand-text\)/);
    expect(rule).toMatch(/font-weight:\s*var\(--font-weight-semibold\)/);
  });
});

describe('Tabs', () => {
  const tabs = [
    { key: 'all', label: 'All sales', to: '/sales' },
    { key: 'unpaid', label: 'Unpaid', to: '/sales/unpaid', count: 7 },
    { key: 'returns', label: 'Returns', to: '/sales/returns' },
  ];

  test('each tab is a real link, so a link, a refresh or Back opens the same tab', () => {
    inRouter(<Tabs label="Sales views" tabs={tabs} value="unpaid" />, '/sales/unpaid');
    expect(screen.getByRole('tablist', { name: 'Sales views' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Unpaid/ })).toHaveAttribute('href', '/sales/unpaid');
    expect(screen.getByRole('tab', { name: /All sales/ })).toHaveAttribute('href', '/sales');
  });

  test('the open tab is selected and has the count chip with its words', () => {
    inRouter(<Tabs label="Sales views" tabs={tabs} value="unpaid" />);
    expect(screen.getByRole('tab', { name: /Unpaid/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /All sales/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('7 items')).toHaveTextContent('7');
    const selected = block('.nl-tab.is-selected');
    expect(selected).toMatch(/border-bottom-color:\s*var\(--brand-text\)/);
    expect(selected).toMatch(/color:\s*var\(--brand-text\)/);
    expect(block('.nl-tab')).toMatch(/border-bottom:\s*2px solid transparent/);
  });

  test('arrow keys open the next and previous tab', async () => {
    inRouter(<Tabs label="Sales views" tabs={tabs} value="all" />, '/sales');
    screen.getByRole('tab', { name: /All sales/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('where')).toHaveTextContent('/sales/unpaid');
    await userEvent.keyboard('{End}');
    expect(screen.getByTestId('where')).toHaveTextContent('/sales/returns');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('where')).toHaveTextContent('/sales');
  });
});

describe('Table', () => {
  const columns = [
    { key: 'id', header: 'Sale' },
    { key: 'customer', header: 'Customer' },
    { key: 'amount', header: 'Amount', money: true },
  ];
  const rows = [
    { id: '0003', customer: 'Amina', amount: 2350 },
    { id: '0002', customer: 'Kiprop', amount: 450.5 },
    { id: '0001', customer: 'Njeri', amount: 12000 },
  ];

  test('hidden helper text inside the table stays inside it (it must not widen the page on a phone)', () => {
    expect(block('.nl-table-wrap')).toMatch(/position:\s*relative/);
  });

  test('has a header in label style, scoped column headers, and money right-aligned as KES', () => {
    render(<Table caption="Sales" columns={columns} rows={rows} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Sale', 'Customer', 'Amount']);
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveClass('is-right');
    expect(screen.getByRole('cell', { name: 'KES 2,350' })).toHaveClass('is-right');
    expect(screen.getByRole('cell', { name: 'KES 450.50' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Sales' })).toBeInTheDocument();
    expect(block('.nl-table th')).toMatch(/font-size:\s*var\(--label-size\)/);
    expect(block('.nl-table th')).toMatch(/text-transform:\s*uppercase/);
    expect(block('.nl-table th')).toMatch(/position:\s*sticky/);
    expect(block('.nl-table td')).toMatch(/padding:\s*var\(--space-3\)/);
    expect(block('.nl-table .is-right')).toMatch(/text-align:\s*right/);
  });

  test('hover is a light overlay and the open row has the selected-row fill plus a bar, not colour alone', () => {
    expect(css).toMatch(/\.nl-table tbody tr:hover td[\s\S]*?rgb\(var\(--ink-rgb\) \/ 0\.08\)/);
    expect(block('.nl-table tbody tr.is-selected td')).toMatch(/background-color:\s*var\(--selected-row\)/);
    expect(block('.nl-table tbody tr.is-selected td:first-child')).toMatch(/box-shadow:\s*inset/);
  });

  test('a row opens by click, Enter or Space, and the open row is marked for screen readers', async () => {
    const onRowOpen = jest.fn();
    const { rerender } = render(<Table caption="Sales" columns={columns} rows={rows} onRowOpen={onRowOpen} />);
    await userEvent.click(screen.getByText('Amina'));
    expect(onRowOpen).toHaveBeenLastCalledWith(rows[0]);
    const second = screen.getByText('Kiprop').closest('tr');
    second.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowOpen).toHaveBeenLastCalledWith(rows[1]);
    await userEvent.keyboard(' ');
    expect(onRowOpen).toHaveBeenCalledTimes(3);
    rerender(<Table caption="Sales" columns={columns} rows={rows} onRowOpen={onRowOpen} selectedKey="0002" />);
    expect(screen.getByText('Kiprop').closest('tr')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Amina').closest('tr')).not.toHaveAttribute('aria-current');
  });

  test('tells screen readers how to open a row', () => {
    render(<Table caption="Sales" columns={columns} rows={rows} onRowOpen={() => {}} />);
    expect(screen.getByRole('table', { name: /Press Enter on a row to open its details/ })).toBeInTheDocument();
  });

  test('arrow keys move between rows', async () => {
    render(<Table caption="Sales" columns={columns} rows={rows} onRowOpen={() => {}} />);
    screen.getByText('Amina').closest('tr').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('Kiprop').closest('tr')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByText('Amina').closest('tr')).toHaveFocus();
  });

  test('a button inside a row does its own job and does not open the row', async () => {
    const onRowOpen = jest.fn();
    const onMenu = jest.fn();
    const withButton = [...columns, { key: 'menu', header: 'Actions', render: () => <button type="button" onClick={onMenu}>More</button> }];
    render(<Table caption="Sales" columns={withButton} rows={rows.slice(0, 1)} onRowOpen={onRowOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(onRowOpen).not.toHaveBeenCalled();
  });

  describe('when the table is wider than its space', () => {
    const OriginalObserver = global.ResizeObserver;
    afterEach(() => {
      global.ResizeObserver = OriginalObserver;
      delete HTMLElement.prototype.scrollWidth;
      delete HTMLElement.prototype.clientWidth;
    });
    const wide = () => {
      global.ResizeObserver = class {
        observe() {}
        disconnect() {}
      };
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 900 });
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 600 });
    };

    test('it scrolls sideways instead of losing its right-hand columns, and the keyboard can reach it', () => {
      wide();
      const { container, rerender } = render(<Table caption="Sales" columns={columns} rows={rows} />);
      expect(container.querySelector('.nl-table-wrap')).toHaveClass('is-scrollable');
      expect(screen.getByRole('region', { name: 'Sales' })).toHaveAttribute('tabindex', '0');
      expect(css).toMatch(/\.nl-table-wrap\.has-max-height,\s*\.nl-table-wrap\.is-scrollable\s*\{\s*overflow:\s*auto/);
      // rows that take focus are already a way in
      rerender(<Table caption="Sales" columns={columns} rows={rows} onRowOpen={() => {}} />);
      expect(screen.queryByRole('region')).toBeNull();
    });

    test('a table that fits is not a scrolling region', () => {
      const { container } = render(<Table caption="Sales" columns={columns} rows={rows} />);
      expect(container.querySelector('.nl-table-wrap')).not.toHaveClass('is-scrollable');
      expect(screen.queryByRole('region')).toBeNull();
    });
  });

  test('a short value such as a date can be kept on one line', () => {
    render(<Table caption="Sales" columns={[{ key: 'id', header: 'Sale', nowrap: true }]} rows={[{ id: '0001' }]} />);
    expect(screen.getByRole('cell', { name: '0001' })).toHaveClass('is-nowrap');
  });

  test('rows that cannot be opened are not focusable', () => {
    render(<Table caption="Sales" columns={columns} rows={rows} />);
    expect(screen.getByText('Amina').closest('tr')).not.toHaveAttribute('tabindex');
  });

  test('empty: names the next action', async () => {
    const action = jest.fn();
    render(<Table caption="Sales" columns={columns} rows={[]} empty={{ title: 'No sales yet', description: 'Sales appear here.', action: { label: 'Make a sale', onClick: action } }} />);
    expect(screen.getByRole('heading', { name: 'No sales yet' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Make a sale' }));
    expect(action).toHaveBeenCalled();
    expect(screen.queryByRole('table')).toBeNull();
  });

  test('error: says what happened and offers Try again', async () => {
    const onRetry = jest.fn();
    render(<Table caption="Sales" columns={columns} rows={rows} error onRetry={onRetry} />);
    expect(screen.getByRole('heading', { name: 'We could not load this list' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('loading: marked busy, a status for screen readers, rows reserved at the same height as real rows', () => {
    const { container } = render(<Table caption="Sales" columns={columns} rows={[]} loading />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the list');
    expect(screen.queryByRole('heading')).toBeNull();
    const height = (selector) => block(selector).match(/height:\s*(calc\([^;]+\))/)[1];
    expect(height('.nl-skeleton-row')).toBe(height('.nl-table td'));
  });
});

describe('SummaryRow', () => {
  test('shows up to three numbers, each with its label', () => {
    render(
      <SummaryRow
        items={[
          { label: 'Total sales', value: 'KES 24,750', note: '12 sales' },
          { label: 'Received', value: 'KES 20,000' },
          { label: 'Unpaid', value: 'KES 4,750' },
          { label: 'A fourth', value: 'ignored' },
        ]}
      />
    );
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Total sales', 'Received', 'Unpaid']);
    expect(screen.getByText('KES 24,750')).toBeInTheDocument();
    expect(screen.getByText('12 sales')).toBeInTheDocument();
    expect(screen.queryByText('A fourth')).toBeNull();
  });

  test('a missing number is a dash, never a blank', () => {
    render(<SummaryRow items={[{ label: 'Unpaid', value: undefined }]} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  test('while loading it is busy and shows no numbers', () => {
    render(<SummaryRow loading items={[{ label: 'Unpaid', value: 'KES 1' }]} />);
    expect(screen.queryByText('KES 1')).toBeNull();
    expect(screen.getByLabelText('Summary')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Pagination', () => {
  test('says "Showing x of y" on the left and offers rows per page, Previous and Next', () => {
    render(<Pagination page={1} size={20} total={135} onPage={() => {}} onSize={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 20 of 135');
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    expect(screen.getByText('Page 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  test('the last page shows the rows that are left, and Next is off', () => {
    render(<Pagination page={7} size={20} total={135} onPage={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 15 of 135');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  test('Previous and Next report the page to go to', async () => {
    const onPage = jest.fn();
    render(<Pagination page={3} size={20} total={135} onPage={onPage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).toHaveBeenLastCalledWith(4);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPage).toHaveBeenLastCalledWith(2);
  });

  test('rows per page is 20 by default and never blank, even for a strange value', () => {
    const { rerender } = render(<Pagination total={50} />);
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    rerender(<Pagination size={37} total={50} />);
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 20 of 50');
  });

  test('choosing another size reports a number', async () => {
    const onSize = jest.fn();
    render(<Pagination size={20} total={135} onSize={onSize} />);
    await userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    await userEvent.click(screen.getByRole('option', { name: /50/ }));
    expect(onSize).toHaveBeenCalledWith(50);
  });

  test('draws nothing when there are no rows, because the table shows its empty state', () => {
    const { container } = render(<Pagination total={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FilterRow', () => {
  test('offers the four presets and marks the chosen one', async () => {
    const onPeriod = jest.fn();
    render(<FilterRow period="30d" onPeriod={onPeriod} />);
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Today', '7 days', '30 days', 'Custom']);
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    expect(onPeriod).toHaveBeenCalledWith('7d');
  });

  test('Custom shows two day-first date fields and warns when the end is before the start', () => {
    render(<FilterRow period="custom" onPeriod={() => {}} from="2026-10-12" to="2026-10-01" onRange={() => {}} />);
    expect(screen.getByLabelText('From')).toHaveValue('12/10/2026');
    expect(screen.getByLabelText('To')).toHaveValue('01/10/2026');
    expect(screen.getByText('The end date is before the start date')).toBeInTheDocument();
  });

  test('the date fields are hidden for the other presets', () => {
    render(<FilterRow period="7d" onPeriod={() => {}} onRange={() => {}} />);
    expect(screen.queryByLabelText('From')).toBeNull();
  });

  describe('search', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('has a visible label, and sends the text after a short pause, not on every key', () => {
      const onSearch = jest.fn();
      render(<FilterRow onSearch={onSearch} searchLabel="Search sales" />);
      const box = screen.getByRole('searchbox', { name: 'Search sales' });
      // userEvent v13 with fake timers: type without delay
      userEvent.type(box, 'ami');
      expect(onSearch).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(300));
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('ami');
    });

    test('Enter sends it at once', () => {
      const onSearch = jest.fn();
      render(<FilterRow onSearch={onSearch} />);
      userEvent.type(screen.getByRole('searchbox'), 'ami{enter}');
      expect(onSearch).toHaveBeenCalledWith('ami');
    });

    test('follows the address when the filters are cleared elsewhere', () => {
      const { rerender } = render(<FilterRow onSearch={() => {}} search="ami" />);
      expect(screen.getByRole('searchbox')).toHaveValue('ami');
      rerender(<FilterRow onSearch={() => {}} search="" />);
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });
  });

  test('shows at most two dropdowns, each with a visible label', () => {
    const opts = [{ value: '', label: 'All' }];
    render(
      <FilterRow
        dropdowns={[
          { key: 'a', label: 'Status', options: opts, value: '', onChange: () => {} },
          { key: 'b', label: 'Method', options: opts, value: '', onChange: () => {} },
          { key: 'c', label: 'Third', options: opts, value: '', onChange: () => {} },
        ]}
      />
    );
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Third')).toBeNull();
  });

  test('"Clear filters" appears only when a filter is set', async () => {
    const onClear = jest.fn();
    const { rerender } = render(<FilterRow onSearch={() => {}} hasFilters={false} onClear={onClear} />);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    rerender(<FilterRow onSearch={() => {}} hasFilters onClear={onClear} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('useListParams: filters live in the address', () => {
  const Probe = ({ options }) => {
    const p = useListParams(options);
    return (
      <div>
        <output data-testid="values">{JSON.stringify({ page: p.page, size: p.size, q: p.q, period: p.period, status: p.filters.status, has: p.hasFilters, open: p.state.open })}</output>
        <button type="button" onClick={() => p.set({ q: 'amina' })}>search</button>
        <button type="button" onClick={() => p.set({ page: 3 })}>page3</button>
        <button type="button" onClick={() => p.set({ size: 50 })}>size50</button>
        <button type="button" onClick={() => p.set({ size: 20, period: '30d' })}>defaults</button>
        <button type="button" onClick={() => p.set({ open: '0033', page: p.page })}>open</button>
        <button type="button" onClick={p.clear}>clear</button>
      </div>
    );
  };
  const options = { filterKeys: ['status'], stateKeys: ['open'] };
  const values = () => JSON.parse(screen.getByTestId('values').textContent);

  test('opens the same view from a link: page, size, search, period and filters', () => {
    inRouter(<Probe options={options} />, '/list?page=3&size=50&q=amina&period=7d&status=unpaid');
    expect(values()).toEqual({ page: 3, size: 50, q: 'amina', period: '7d', status: 'unpaid', has: true, open: '' });
  });

  test('defaults: page 1, 20 rows, 30 days, nothing filtered', () => {
    inRouter(<Probe options={options} />);
    expect(values()).toEqual({ page: 1, size: 20, q: '', period: '30d', status: '', has: false, open: '' });
  });

  test('rows per page can never be blank or strange: anything else is 20', () => {
    const { unmount } = inRouter(<Probe options={options} />, '/list?size=7');
    expect(values().size).toBe(20);
    unmount();
    inRouter(<Probe options={options} />, '/list?size=');
    expect(values().size).toBe(20);
  });

  test('a bad page number is page 1', () => {
    inRouter(<Probe options={options} />, '/list?page=-4');
    expect(values().page).toBe(1);
  });

  test('changing a filter writes it to the address and goes back to page 1', async () => {
    inRouter(<Probe options={options} />, '/list?page=4');
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/list?q=amina');
    expect(values().page).toBe(1);
  });

  test('setting the page keeps the other values; values equal to their defaults leave the address', async () => {
    inRouter(<Probe options={options} />, '/list?q=amina&size=50');
    await userEvent.click(screen.getByRole('button', { name: 'page3' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/list?q=amina&size=50&page=3');
    await userEvent.click(screen.getByRole('button', { name: 'defaults' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/list?q=amina');
  });

  test('the open row is in the address but is not a filter, and Clear filters leaves it', async () => {
    inRouter(<Probe options={options} />, '/list?q=amina&status=paid');
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(values().open).toBe('0033');
    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(values()).toMatchObject({ q: '', status: '', has: false, open: '0033' });
  });
});

describe('DetailPanel', () => {
  const panel = (props = {}) => (
    <DetailPanel title="Sale 0033" status={<span>Paid</span>} onClose={() => {}} {...props}>
      <DetailFacts facts={[{ label: 'Customer', value: 'Amina Hassan' }, { label: 'Cashier', value: '' }]} />
    </DetailPanel>
  );

  test('has a title, status, key facts and a Close button', async () => {
    const onClose = jest.fn();
    render(panel({ onClose }));
    expect(screen.getByRole('region', { name: 'Sale 0033' })).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Amina Hassan')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape closes it', async () => {
    const onClose = jest.fn();
    render(panel({ onClose }));
    screen.getByRole('button', { name: 'Close details' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('opening moves the focus to the title; closing returns it to the row that opened it', () => {
    const Host = ({ open }) => (
      <>
        <button type="button">row</button>
        {open ? panel() : null}
      </>
    );
    const { rerender } = render(<Host open={false} />);
    screen.getByRole('button', { name: 'row' }).focus();
    rerender(<Host open />);
    expect(screen.getByRole('heading', { name: 'Sale 0033' })).toHaveFocus();
    rerender(<Host open={false} />);
    expect(screen.getByRole('button', { name: 'row' })).toHaveFocus();
  });

  test('Previous and Next row: off at the ends, and they report the move', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const { rerender } = render(panel({ onNext, position: '1 of 20' }));
    expect(screen.getByRole('button', { name: 'Previous item' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next item' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    rerender(panel({ onPrevious, onNext: undefined }));
    expect(screen.getByRole('button', { name: 'Next item' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous item' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  test('one primary action and at most three secondary ones', () => {
    render(
      panel({
        primary: { label: 'Print receipt', onClick: () => {} },
        secondary: ['A', 'B', 'C', 'D'].map((label) => ({ label, onClick: () => {} })),
      })
    );
    expect(screen.getByRole('button', { name: 'Print receipt' })).toHaveClass('nl-btn--primary');
    expect(screen.getAllByRole('button', { name: /^[A-D]$/ })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'D' })).toBeNull();
  });

  test('system references sit under Details, which starts closed', () => {
    const { container } = render(panel({ details: [{ label: 'Sales invoice', value: 'ACC-PSINV-2026-00005' }] }));
    const fold = container.querySelector('details');
    expect(fold).not.toHaveAttribute('open');
    expect(within(fold).getByText('Details')).toBeInTheDocument();
    expect(within(fold).getByText('ACC-PSINV-2026-00005')).toBeInTheDocument();
  });

  test('is 4 of 12 columns beside the list, a full page below 1100px', () => {
    expect(css).toMatch(/@media \(min-width: 1100px\)[\s\S]*?grid-template-columns: repeat\(12,[\s\S]*?grid-column: span 8[\s\S]*?grid-column: span 4/);
    expect(css).toMatch(/@media \(max-width: 1099px\)\s*\{\s*\.nl-split\.has-detail \.nl-split__list\s*\{\s*display: none/);
    expect(block('.nl-detail')).toMatch(/border-radius:\s*var\(--radius-card\)/);
  });

  test('ListWithDetail shows the list alone, then both when a row is open', () => {
    const { container, rerender } = render(<ListWithDetail list={<p>the list</p>} detail={null} />);
    expect(container.querySelector('.nl-split')).not.toHaveClass('has-detail');
    expect(screen.queryByRole('region')).toBeNull();
    rerender(<ListWithDetail list={<p>the list</p>} detail={panel()} />);
    expect(container.querySelector('.nl-split')).toHaveClass('has-detail');
    expect(screen.getByText('the list')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sale 0033' })).toBeInTheDocument();
  });
});

describe('Styles', () => {
  test('tap targets are at least 44px below 768px', () => {
    const small = css.slice(css.indexOf('/* ---------- Small screens'));
    expect(small).toMatch(/\.nl-segmented__item,\s*\.nl-tab\s*\{\s*min-height:\s*var\(--control-height-till\)/);
    expect(small).toMatch(/\.nl-select--small \.nl-select__button\s*\{\s*min-height:\s*var\(--control-height-till\)/);
  });

  test('the new keyboard targets have the 2px brand-text ring', () => {
    expect(css).toMatch(/\.nl-segmented__item:focus-visible,\s*\.nl-tab:focus-visible[\s\S]*?outline:\s*var\(--focus-ring\)/);
    expect(css).toMatch(/\.nl-table tbody tr:focus-visible\s*\{\s*outline:\s*var\(--focus-ring\)/);
  });

  test('uses no colour of its own: only tokens', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(/);
  });
});

describe('The sample-data page', () => {
  const show = (entry = '/new-look/components') =>
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[entry]}>
          <ToastProvider>
            <ComponentPage />
          </ToastProvider>
          <Where />
        </MemoryRouter>
      </ThemeProvider>
    );

  test('shows the list page: tabs, summary, filters, table and "Showing 20 of 135"', () => {
    show();
    expect(screen.getByRole('tablist', { name: 'Sales views' })).toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search sales' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Sales, newest first/ })).toBeInTheDocument();
    // 30 days is the default period; the made-up data has 4 sales a day
    expect(screen.getByText(/^Showing 20 of 120$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  test('opening a row opens the panel, writes it to the address and Next moves to the following sale', async () => {
    show();
    const first = screen.getAllByRole('row')[1];
    await userEvent.click(first);
    const panel = screen.getByRole('region', { name: /^Sale / });
    expect(screen.getByTestId('where').textContent).toMatch(/open=/);
    expect(within(panel).getByRole('button', { name: 'Previous item' })).toBeDisabled();
    const before = screen.getByTestId('where').textContent;
    await userEvent.click(within(panel).getByRole('button', { name: 'Next item' }));
    expect(screen.getByTestId('where').textContent).not.toBe(before);
    expect(within(screen.getByRole('region', { name: /^Sale / })).getByRole('button', { name: 'Previous item' })).toBeEnabled();
    await userEvent.click(within(panel).getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('region', { name: /^Sale / })).toBeNull();
    expect(screen.getByTestId('where').textContent).not.toMatch(/open=/);
  });

  test('a link opens the same view: page, rows per page, filter and open sale come from the address', () => {
    show('/new-look/components?page=2&size=10&status=paid&open=0120');
    expect(screen.getByText(/^Showing 10 of /)).toBeInTheDocument();
    expect(screen.getByText(/^Page 2 of /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(10);
    rows.forEach((tr) => expect(within(tr).getByText('Paid')).toBeInTheDocument());
  });

  test('the unpaid tab is a link to its own address and filters the list', async () => {
    show();
    await userEvent.click(screen.getByRole('tab', { name: /Unpaid/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('?tab=unpaid');
    const rows = screen.getAllByRole('row').slice(1);
    rows.forEach((tr) => expect(tr.textContent).toMatch(/Unpaid|Overdue/));
  });

  test('every state can be shown: loading, empty and error', async () => {
    show('/new-look/components?view=empty');
    expect(screen.getByRole('heading', { name: 'No sales yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  test('error state offers Try again that brings the data back', async () => {
    show('/new-look/components?view=error');
    expect(screen.getByRole('heading', { name: 'We could not load this list' })).toBeInTheDocument();
    // the first "Try again" is the list's own; the later one belongs to the static error example
    await userEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    expect(screen.getByRole('table', { name: /Sales, newest first/ })).toBeInTheDocument();
  });

  test('a search with no match offers to clear the filters', async () => {
    show('/new-look/components?q=zzzz');
    expect(screen.getByRole('heading', { name: 'No sales match' })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('heading', { name: 'No sales match' }).parentElement).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('where')).not.toHaveTextContent('q=zzzz');
  });
});
