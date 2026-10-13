import React from 'react';
import { Skeleton, useDelayedFlag } from './Skeleton';

/**
 * The summary row above a list (Part 1, Page patterns): up to three numbers that answer "how am I doing?"
 * for the list below, such as Total sales, Received and Unpaid. Missing values show a dash, never a blank.
 *
 *   items    [{ label, value, note? }]   value is text already formatted (for example "KES 24,750")
 *   loading  shows a grey shape after 200 ms; the space is reserved so nothing jumps
 */
const SummaryRow = ({ items, loading = false, label = 'Summary', className = '' }) => {
  const showSkeleton = useDelayedFlag(loading);
  return (
    <dl className={`nl-summary ${className}`.trim()} aria-label={label} aria-busy={loading || undefined}>
      {items.slice(0, 3).map((item) => (
        <div className="nl-summary__item" key={item.label}>
          <dt className="nl-label">{item.label}</dt>
          <dd className="nl-summary__value">
            {loading ? showSkeleton ? <Skeleton width="60%" height="var(--kpi-size)" /> : null : item.value === undefined || item.value === null || item.value === '' ? '–' : item.value}
          </dd>
          {item.note && !loading ? <dd className="nl-summary__note">{item.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
};

export default SummaryRow;
