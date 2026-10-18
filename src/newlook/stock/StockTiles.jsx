import React from 'react';
import { Skeleton } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import { formatQty } from './stockModel';
import T from './strings.stock';

/**
 * The four tiles above the Overview list (Spec: "Overview shows stat tiles (stock value, items, low, out) above the
 * list"). The numbers are the server's, counted from the very rows of the list below, so a tile never disagrees with the
 * list. Items, Low and Out of stock also work as filters: press one to see only those products, press again to see all.
 * The stock value tile is left out for a person who may not see cost.
 *
 *   tiles     { items, low, out_of_stock, stock_value? } or null while loading
 *   active    the level filter now on: 'low', 'out' or ''
 *   onPick(level)
 */
const Tile = ({ label, value, pressed, onPress, hint }) => {
  const inner = (
    <>
      <span className="nl-stock-tile__label">{label}</span>
      <span className="nl-stock-tile__value">{value}</span>
    </>
  );
  if (!onPress) return <div className="nl-card nl-stock-tile">{inner}</div>;
  return (
    <button type="button" className={['nl-card', 'nl-stock-tile', 'is-button', pressed && 'is-pressed'].filter(Boolean).join(' ')} aria-pressed={pressed} onClick={onPress} title={hint}>
      {inner}
    </button>
  );
};

const StockTiles = ({ tiles, loading, showValue, active, onPick }) => {
  if (loading || !tiles) {
    return (
      <section className="nl-stock-tiles" aria-label={T.tiles.label} aria-busy="true">
        {[0, 1, 2, 3].map((n) => (
          <div className="nl-card nl-stock-tile" key={n}>
            <Skeleton width="50%" height="14px" />
            <Skeleton width="70%" height="30px" />
          </div>
        ))}
      </section>
    );
  }
  const hasValue = showValue && tiles.stock_value !== undefined && tiles.stock_value !== null;
  return (
    <section className="nl-stock-tiles" aria-label={T.tiles.label}>
      {hasValue ? <Tile label={T.tiles.stockValue} value={formatMoney(tiles.stock_value)} /> : null}
      <Tile label={T.tiles.items} value={formatQty(tiles.items)} />
      <Tile label={T.tiles.low} value={formatQty(tiles.low)} pressed={active === 'low'} onPress={() => onPick('low')} hint={T.tiles.filterHint} />
      <Tile label={T.tiles.out} value={formatQty(tiles.out_of_stock)} pressed={active === 'out'} onPress={() => onPick('out')} hint={T.tiles.filterHint} />
    </section>
  );
};

export default StockTiles;
