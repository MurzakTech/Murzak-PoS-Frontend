import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Field from './Field';
import Segmented from './Segmented';
import Select from './Select';
import S from '../strings';

const T = S.components.filterRow;

/**
 * The filter row above a list (Part 1, Components and Page patterns): period presets, a search box and up to
 * two dropdowns. "Filters live in the address", so this row holds no filter of its own: it shows the values it
 * is given and reports changes. Connect it to useListParams and a refresh or a shared link opens the same view.
 * A "Clear filters" link appears only when any filter is set.
 *
 *   period, onPeriod(value)      one of PERIODS (Today, 7 days, 30 days, Custom); omit onPeriod to hide the presets
 *   from, to, onRange({from,to}) the two dates of Custom, as yyyy-mm-dd, typed day first
 *   search, onSearch(text)       the text is sent after a short pause in typing, or at once on Enter
 *   dropdowns                    up to two of { key, label, options, value, onChange }; give each an "All ..." option with value ""
 *   hasFilters, onClear          show "Clear filters"
 */
export const PERIODS = [
  { value: 'today', label: T.periods.today },
  { value: '7d', label: T.periods.sevenDays },
  { value: '30d', label: T.periods.thirtyDays },
  { value: 'custom', label: T.periods.custom },
];
export const SEARCH_PAUSE_MS = 300;
export const MAX_DROPDOWNS = 2;

const FilterRow = ({
  period,
  onPeriod,
  periods = PERIODS,
  from = '',
  to = '',
  onRange,
  search = '',
  onSearch,
  searchLabel = T.search,
  searchPlaceholder = T.searchPlaceholder,
  dropdowns = [],
  hasFilters = false,
  onClear,
  className = '',
}) => {
  // The box keeps what is being typed; the address is told after a pause
  const [text, setText] = useState(search);
  const timer = useRef(null);
  useEffect(() => {
    setText(search);
  }, [search]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const type = (value) => {
    setText(value);
    clearTimeout(timer.current);
    if (onSearch) timer.current = setTimeout(() => onSearch(value.trim()), SEARCH_PAUSE_MS);
  };
  const submit = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(timer.current);
      if (onSearch) onSearch(text.trim());
    }
  };

  const rangeError = from && to && to < from ? T.rangeError : undefined;

  return (
    <div className={`nl-filters ${className}`.trim()} role="search" aria-label={T.navigation}>
      {onPeriod ? (
        <div className="nl-filters__group">
          <span className="nl-label" aria-hidden="true">
            {T.period}
          </span>
          <Segmented label={T.period} options={periods} value={period} onChange={onPeriod} />
        </div>
      ) : null}

      {onPeriod && period === 'custom' ? (
        <>
          <Field kind="date" label={T.from} value={from} onChange={(value) => onRange && onRange({ from: value, to })} className="nl-filters__date" />
          <Field kind="date" label={T.to} value={to} error={rangeError} onChange={(value) => onRange && onRange({ from, to: value })} className="nl-filters__date" />
        </>
      ) : null}

      {onSearch ? (
        <Field
          type="search"
          icon="search"
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={text}
          onChange={type}
          onKeyDown={submit}
          className="nl-filters__search"
        />
      ) : null}

      {dropdowns.slice(0, MAX_DROPDOWNS).map((dropdown) => (
        <Select key={dropdown.key} label={dropdown.label} options={dropdown.options} value={dropdown.value} onChange={dropdown.onChange} className="nl-filters__select" />
      ))}

      {hasFilters && onClear ? (
        <Button variant="ghost" size="small" onClick={onClear} className="nl-filters__clear">
          {T.clearFilters}
        </Button>
      ) : null}
    </div>
  );
};

export default FilterRow;
