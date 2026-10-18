import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a list's page, rows per page, search, period and filters in the web address, so a refresh or a shared
 * link opens the same view (Part 1, Page patterns: "Filters live in the address"; Pagination: "the page and the
 * choice live in the address"). A value equal to its default is left out of the address to keep links short.
 *
 *   page       1, 2, 3 ...   (any invalid value is page 1)
 *   size       rows per page: 10, 20, 50 or 100, and 20 when anything else is given, so it is never blank
 *   q          the search text
 *   period     a preset such as "7d" ("30d" or the given default when absent), with from and to for "custom"
 *   filters    any further keys named in filterKeys, such as status or category
 *   state      keys named in stateKeys that belong in the address but are not filters, such as the row that is
 *              open; they are not counted by hasFilters and Clear filters leaves them alone
 *
 * set(patch) changes some values and returns to page 1 unless the patch sets the page itself.
 * clear() removes every filter (not the rows per page). hasFilters says whether any filter is set.
 */
export const PAGE_SIZES = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

export default function useListParams({ defaultPeriod = '30d', filterKeys = [], stateKeys = [] } = {}) {
  const [search, setSearch] = useSearchParams();

  const values = useMemo(() => {
    const size = toPositiveInt(search.get('size'), DEFAULT_PAGE_SIZE);
    const filters = {};
    filterKeys.forEach((key) => {
      filters[key] = search.get(key) || '';
    });
    const state = {};
    stateKeys.forEach((key) => {
      state[key] = search.get(key) || '';
    });
    return {
      state,
      page: toPositiveInt(search.get('page'), 1),
      size: PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
      q: search.get('q') || '',
      period: search.get('period') || defaultPeriod,
      from: search.get('from') || '',
      to: search.get('to') || '',
      filters,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, defaultPeriod, filterKeys.join('|'), stateKeys.join('|')]);

  const set = useCallback(
    (patch, { replace = false } = {}) => {
      const next = new URLSearchParams(search);
      const apply = (key, value, fallback) => {
        if (value === undefined) return;
        if (value === '' || value === null || String(value) === String(fallback)) next.delete(key);
        else next.set(key, String(value));
      };
      Object.entries(patch).forEach(([key, value]) => {
        if (key === 'page') apply('page', value, 1);
        else if (key === 'size') apply('size', value, DEFAULT_PAGE_SIZE);
        else if (key === 'period') apply('period', value, defaultPeriod);
        else apply(key, value, '');
      });
      if (!('page' in patch)) next.delete('page'); // any other change returns to the first page
      setSearch(next, { replace });
    },
    [search, setSearch, defaultPeriod]
  );

  const hasFilters = Boolean(values.q || values.from || values.to || values.period !== defaultPeriod || Object.values(values.filters).some(Boolean));

  const clear = useCallback(() => {
    const next = new URLSearchParams(search);
    ['q', 'period', 'from', 'to', 'page', ...filterKeys].forEach((key) => next.delete(key));
    setSearch(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, setSearch, filterKeys.join('|')]);

  return { ...values, set, clear, hasFilters };
}
