import React, { useEffect, useRef, useState } from 'react';
import EmptyState from './EmptyState';
import { LoadingGate, SkeletonRows } from './Skeleton';
import { formatMoney } from './format';
import S from '../strings';
import fill from '../labels/fill';

const T = S.components.table;

/**
 * The one table of the redesign (Part 1, Components and Page patterns). A list page is configuration: give it
 * columns and rows and it builds the rest.
 *
 *   columns   [{ key, header, align?, money?, nowrap?, render?(row) }]
 *             money: right-aligned and written as KES 2,350. align="right" is for other numbers.
 *             nowrap keeps a short value such as a date or a receipt number on one line.
 *   rows      the rows on this page, newest first (the back end sorts)
 *   rowKey    the field that identifies a row (default "id")
 *   caption   what the table is, read aloud to screen readers (not shown)
 *   onRowOpen(row) makes a row open its detail panel by click, Enter or Space; selectedKey marks the open row
 *   loading   grey rows after 200 ms (never a spinner over a blank page)
 *   error     the list could not load: an error message with "Try again" (onRetry)
 *   empty     { icon?, title, description, action } shown when there are no rows; it names the next action
 *
 * The header sticks while the page scrolls while the table fits; when it is wider than its space (always on a
 * phone) it scrolls sideways instead, and the header then stays with the table.
 * Row hover is a light overlay, and the open row has the selected-row fill, a bar on its left edge and
 * aria-current, so it is never shown by colour alone. Arrow Up and Down move between rows.
 */
const INTERACTIVE = 'button, a, input, select, textarea, label, summary';

const cellClass = (column) => [(column.money || column.align === 'right') && 'is-right', column.nowrap && 'is-nowrap', column.hideOnPhone && 'hide-on-phone'].filter(Boolean).join(' ') || undefined;

const cellValue = (column, row) => {
  if (column.render) return column.render(row);
  const value = row[column.key];
  if (column.money) return formatMoney(value);
  return value === null || value === undefined || value === '' ? '' : value;
};

const Table = ({ columns, rows = [], rowKey = 'id', caption, onRowOpen, selectedKey, loading = false, error = false, onRetry, empty, skeletonRows = 8, maxHeight, className = '' }) => {
  const body = useRef(null);
  const wrap = useRef(null);
  const [scrolls, setScrolls] = useState(false);

  // A table wider than its space (many columns, or the detail panel open beside it) scrolls sideways rather than
  // losing its right-hand columns. While it fits, the header stays stuck to the top of the page instead.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [rows, columns, loading, error]);

  // When the open row changes (for example with Previous and Next), keep it in view
  useEffect(() => {
    if (selectedKey === undefined || selectedKey === null || !body.current) return;
    const row = [...body.current.querySelectorAll('tr')].find((tr) => tr.dataset.key === String(selectedKey));
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }, [selectedKey]);

  const rowHeight = '(var(--space-3) * 2 + var(--control-height-small) + 1px)';
  const reserved = `calc(${skeletonRows + 1} * ${rowHeight})`; // the rows and a header's worth

  let content;
  if (error) {
    content = (
      <EmptyState
        icon="alert"
        tone="error"
        title={T.errorTitle}
        description={T.errorDescription}
        action={onRetry ? { label: T.retry, onClick: onRetry } : undefined}
      />
    );
  } else if (!loading && rows.length === 0) {
    content = <EmptyState {...(empty || { title: T.emptyTitle, description: T.emptyDescription })} />;
  } else {
    const onKeyDown = (event, row) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowOpen(row);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling;
        if (next) next.focus();
      }
    };

    content = (
      <LoadingGate
        loading={loading}
        minHeight={reserved}
        label={T.loading}
        skeleton={
          <SkeletonRows rows={skeletonRows} columns={columns.length} />
        }
      >
        <table className="nl-table">
          <caption className="nl-visually-hidden">
            {onRowOpen ? fill(T.captionWithHint, { caption: caption === undefined || caption === null ? '' : caption }) : caption}
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cellClass(column)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={body}>
            {rows.map((row) => {
              const key = row[rowKey];
              const selected = selectedKey !== undefined && selectedKey !== null && String(selectedKey) === String(key);
              return (
                <tr
                  key={key}
                  data-key={key}
                  className={[onRowOpen && 'is-clickable', selected && 'is-selected'].filter(Boolean).join(' ') || undefined}
                  tabIndex={onRowOpen ? 0 : undefined}
                  aria-current={selected ? 'true' : undefined}
                  onClick={
                    onRowOpen
                      ? (event) => {
                          if (!event.target.closest(INTERACTIVE)) onRowOpen(row);
                        }
                      : undefined
                  }
                  onKeyDown={onRowOpen ? (event) => onKeyDown(event, row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cellClass(column)}>
                      {cellValue(column, row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </LoadingGate>
    );
  }

  return (
    <div
      ref={wrap}
      className={['nl-table-wrap', maxHeight && 'has-max-height', scrolls && 'is-scrollable', className].filter(Boolean).join(' ')}
      style={maxHeight ? { maxHeight } : undefined}
      // A table that scrolls sideways and whose rows cannot take focus gets a way in for the keyboard
      {...(scrolls && !onRowOpen ? { tabIndex: 0, role: 'region', 'aria-label': caption } : {})}
    >
      {content}
    </div>
  );
};

export default Table;
