import React from 'react';
import { StatusLabel } from '../components/Chip';
import { formatMoney } from '../components/format';
import { categoryLabel, statusView, stockText } from './productsModel';

/**
 * Rows as cards, for phones (below 768px, Spec: Responsive table). Each card is one product and opens its panel.
 */
const ProductCards = ({ rows, label, onOpen, selectedKey }) => (
  <ul className="nl-products-cards" aria-label={label}>
    {rows.map((row) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && selectedKey === row.item_code;
      const view = statusView(row.status);
      return (
        <li key={row.item_code}>
          <button type="button" className={['nl-products-card', selected && 'is-selected'].filter(Boolean).join(' ')} data-key={row.item_code} aria-current={selected ? 'true' : undefined} onClick={() => onOpen(row.item_code)}>
            <span className="nl-products-card__top">
              <strong className="nl-products-card__head">{row.item_name}</strong>
              <span className="nl-products-card__aside">{formatMoney(row.price)}</span>
            </span>
            <span className="nl-products-card__line">{row.item_code}</span>
            <span className="nl-products-card__line">{categoryLabel(row.category)}</span>
            <span className="nl-products-card__line">{stockText(row)}</span>
            <span className="nl-products-card__foot">
              <StatusLabel status={view.status}>{view.words}</StatusLabel>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

export default ProductCards;
