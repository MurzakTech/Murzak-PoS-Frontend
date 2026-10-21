import React from 'react';
import { formatMoney } from '../components/format';
import PurchaseStatus from './PurchaseStatus';
import { dateCell, dueInfo } from './purchasesModel';
import fill from '../labels/fill';
import T from './strings.purchases';

/**
 * Rows as cards, for phones (below 768px, Spec: Responsive table). Each card is one purchase and opens its panel.
 */
const PurchaseCards = ({ rows, label, onOpen, selectedKey }) => (
  <ul className="nl-purchases-cards" aria-label={label}>
    {rows.map((row) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && (selectedKey === row.id || selectedKey === row.number || (row.number && row.number.replace(/^#/, '') === String(selectedKey).replace(/^#/, '')));
      const due = dueInfo(row);
      return (
        <li key={row.id}>
          <button
            type="button"
            className={['nl-purchases-card', selected && 'is-selected'].filter(Boolean).join(' ')}
            data-key={row.id}
            aria-current={selected ? 'true' : undefined}
            onClick={() => onOpen(row.id)}
          >
            <span className="nl-purchases-card__top">
              <strong className="nl-purchases-card__head">{row.number}</strong>
              <span className="nl-purchases-card__aside">{formatMoney(row.total)}</span>
            </span>
            <span className="nl-purchases-card__line">{row.supplier}</span>
            <span className="nl-purchases-card__line">{dateCell(row.date)}</span>
            {row.bill_no ? <span className="nl-purchases-card__line">{fill(T.billNo, { number: row.bill_no })}</span> : null}
            {due ? <span className="nl-purchases-card__line">{due.text}</span> : null}
            <span className="nl-purchases-card__foot">
              <PurchaseStatus status={row.status} />
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

export default PurchaseCards;
