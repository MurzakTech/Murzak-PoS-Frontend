import React from 'react';
import Button from './Button';
import Select from './Select';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from './useListParams';
import { formatShowing } from './format';
import S from '../strings';
import fill from '../labels/fill';

const T = S.components.pagination;

/**
 * Pagination (Part 1, Components): "Showing 20 of 135" on the left; rows per page, Previous and Next on the right.
 * Rows per page is 20 by default and never blank. The page and the choice belong in the address: connect
 * onPage and onSize to useListParams().set so a refresh or a shared link opens the same page.
 *
 *   total   how many rows there are in all (with the filters applied); when 0 nothing is drawn, because the
 *           table already shows its empty state
 *   shown   how many rows are on this page (worked out from page, size and total when not given)
 */
const Pagination = ({ page = 1, size = DEFAULT_PAGE_SIZE, total, shown, onPage, onSize, sizes = PAGE_SIZES, className = '' }) => {
  if (!total) return null;
  const rowsPerPage = sizes.includes(size) ? size : DEFAULT_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(total / rowsPerPage));
  const current = Math.min(Math.max(1, page), pages);
  const onThisPage = shown !== undefined ? shown : Math.min(rowsPerPage, total - (current - 1) * rowsPerPage);

  return (
    <nav className={`nl-pagination ${className}`.trim()} aria-label={T.navigation}>
      <p className="nl-pagination__showing" role="status">
        {formatShowing(onThisPage, total)}
      </p>
      <div className="nl-pagination__controls">
        <Select
          inline
          size="small"
          label={T.rowsPerPage}
          options={sizes.map((n) => ({ value: n, label: String(n) }))}
          value={rowsPerPage}
          onChange={(value) => onSize && onSize(Number(value))}
        />
        <span className="nl-pagination__page">
          {fill(T.page, { current, pages })}
        </span>
        <Button variant="secondary" size="small" icon="chevronLeft" disabled={current <= 1} onClick={() => onPage && onPage(current - 1)}>
          {T.previous}
        </Button>
        <Button variant="secondary" size="small" icon="chevronRight" iconEnd disabled={current >= pages} onClick={() => onPage && onPage(current + 1)}>
          {T.next}
        </Button>
      </div>
    </nav>
  );
};

export default Pagination;
