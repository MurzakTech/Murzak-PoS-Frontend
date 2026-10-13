import React from 'react';
import Button from '../components/Button';
import FilterRow from '../components/FilterRow';
import S from '../strings';

const T = S.home.filters;

export const HOME_PERIODS = [
  { value: 'today', label: T.periods.today },
  { value: '7d', label: T.periods.sevenDays },
  { value: '30d', label: T.periods.thirtyDays },
  { value: 'month', label: T.periods.month },
  { value: 'custom', label: T.periods.custom },
];

/**
 * The filter row of Home (Spec: Dashboard, "Filter row"): period, store (only with two or more locations), staff and
 * Export. It applies to the tiles and charts, not to the hero band above. The choices live in the address, so a refresh
 * or a shared link opens the same view; this row only shows what it is given and reports changes.
 *
 *   stores   [{ value, label }] to choose from; the Store box appears only with two or more
 *   staff    [{ value, label }] to choose from; empty hides the box (a cashier sees only their own sales)
 */
const HomeFilters = ({ period, from, to, onPeriod, onRange, store, onStore, stores = [], staff, onStaff, staffList = [], onExport, canExport }) => {
  const dropdowns = [];
  if (stores.length >= 2) dropdowns.push({ key: 'store', label: T.store, options: [{ value: '', label: T.allStores }, ...stores], value: store, onChange: onStore });
  if (staffList.length > 0) dropdowns.push({ key: 'staff', label: T.staff, options: [{ value: '', label: T.allStaff }, ...staffList], value: staff, onChange: onStaff });
  return (
    <div className="nl-home__filters">
      <FilterRow period={period} onPeriod={onPeriod} periods={HOME_PERIODS} from={from} to={to} onRange={onRange} dropdowns={dropdowns} />
      <Button variant="secondary" onClick={onExport} disabled={!canExport} className="nl-home__export">
        {T.export}
      </Button>
    </div>
  );
};

export default HomeFilters;
