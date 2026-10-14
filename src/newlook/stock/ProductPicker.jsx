import React, { useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Field from '../components/Field';
import Icon from '../components/Icon';
import fill from '../labels/fill';
import { findProducts } from '../../api/stockLevelsApi';
import { qtyWithUnit } from './stockModel';
import T from './strings.stock';

const PAUSE_MS = 250;

/**
 * Choose one product for a short form. Type a name or code and pick from the list; the first products are listed at once,
 * so a small shop can just pick. Once a product is chosen it is shown with the stock in hand and a way to change it.
 *
 *   value    the chosen product { item_code, item_name, unit, qty } or null
 *   onChange(product | null)
 *   store    the store to read the stock from (all stores when empty)
 *   error    shown beside the field when nothing is chosen
 */
const ProductPicker = ({ value, onChange, store, error, autoFocus = true }) => {
  const [text, setText] = useState('');
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const ticket = useRef(0);

  useEffect(() => {
    if (value) return undefined;
    ticket.current += 1;
    const mine = ticket.current;
    const timer = setTimeout(
      () => {
        setState((s) => ({ ...s, status: 'loading' }));
        findProducts({ search: text, store })
          .then((rows) => {
            if (ticket.current === mine) setState({ status: 'ready', rows });
          })
          .catch(() => {
            if (ticket.current === mine) setState({ status: 'error', rows: [] });
          });
      },
      text ? PAUSE_MS : 0
    );
    return () => {
      clearTimeout(timer);
      ticket.current += 1;
    };
  }, [text, store, value]);

  if (value) {
    return (
      <div className="nl-picker" role="group" aria-label={T.picker.label}>
        <span className="nl-label">{T.picker.label}</span>
        <div className="nl-picker__chosen">
          <span className="nl-picker__name">{fill(T.picker.chosen, { name: value.item_name, qty: qtyWithUnit(value.qty, value.unit) })}</span>
          <Button variant="ghost" size="small" onClick={() => onChange(null)}>
            {T.picker.change}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="nl-picker">
      <Field label={T.picker.label} value={text} onChange={setText} placeholder={T.picker.placeholder} helper={T.picker.helper} error={error} autoComplete="off" data-autofocus={autoFocus ? '' : undefined} />
      <div className="nl-picker__results" aria-live="polite">
        {state.status === 'error' ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{T.picker.loadFailed}</span>
          </p>
        ) : null}
        {state.status === 'ready' && state.rows.length === 0 ? <p className="nl-helper">{T.picker.none}</p> : null}
        {state.status === 'ready' && state.rows.length > 0 ? (
          <ul className="nl-picker__list" aria-label={T.picker.results}>
            {state.rows.map((row) => (
              <li key={row.item_code}>
                <button type="button" className="nl-picker__option" onClick={() => onChange(row)}>
                  {fill(T.picker.option, { name: row.item_name, qty: qtyWithUnit(row.qty, row.unit) })}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default ProductPicker;
