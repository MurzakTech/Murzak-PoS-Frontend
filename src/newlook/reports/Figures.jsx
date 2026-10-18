import React from 'react';
import Icon from '../components/Icon';
import { Skeleton, useDelayedFlag } from '../components/Skeleton';
import S from '../strings';

/**
 * The three to five numbers above the charts of a report. Each is a label, the number, and under it an optional note
 * and a change on the period before, drawn with an arrow and words and never as colour alone (green and red only say
 * good and bad, and always sit beside the arrow). `goodWhen` says which way is good news: more revenue is good, more
 * running costs are not.
 *
 *   items    [{ key, label, value, note?, change?: { direction, text }, goodWhen?, strong? }]
 *   loading  shows grey shapes after 200 ms; the space is reserved so nothing jumps
 */
const Figures = ({ items, loading = false, count = 3, label }) => {
  const showSkeleton = useDelayedFlag(loading);
  if (loading) {
    return (
      <dl className="nl-figures" aria-label={label} aria-busy="true">
        {Array.from({ length: count }, (_, i) => (
          <div className="nl-figure" key={i}>
            <dt className="nl-label">&nbsp;</dt>
            <dd className="nl-figure__value">{showSkeleton ? <Skeleton width="60%" height="var(--kpi-size)" /> : null}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="nl-figures" aria-label={label}>
      {items.map((item) => {
        const change = item.change;
        const moves = change && (change.direction === 'up' || change.direction === 'down');
        const mood = moves ? (change.direction === (item.goodWhen || 'up') ? 'good' : 'bad') : 'neutral';
        return (
          <div className={['nl-figure', item.strong && 'is-strong'].filter(Boolean).join(' ')} key={item.key}>
            <dt className="nl-label">{item.label}</dt>
            <dd className="nl-figure__value">{item.value === undefined || item.value === null || item.value === '' ? S.components.summaryRow.noValue : item.value}</dd>
            {item.note ? <dd className="nl-figure__note">{item.note}</dd> : null}
            {change ? (
              <dd className={`nl-figure__change is-${mood}`}>
                {moves ? <Icon name={change.direction === 'up' ? 'arrowUp' : 'arrowDown'} /> : null}
                <span>{change.text}</span>
              </dd>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
};

export default Figures;
