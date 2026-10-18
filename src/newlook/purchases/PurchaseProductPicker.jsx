import React, { useEffect, useRef, useState } from 'react';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { findProductsToBuy } from '../../api/purchasesListApi';
import T from './strings.purchases';

const PAUSE_MS = 250;

/**
 * Search the shop's products by name or code and pick one to add to the purchase. The first products are listed at once,
 * so a small shop can just pick. Picking calls onAdd(product) and clears the search so the next product can be found.
 */
const PurchaseProductPicker = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const ticket = useRef(0);

  useEffect(() => {
    ticket.current += 1;
    const mine = ticket.current;
    const timer = setTimeout(
      () => {
        setState((s) => ({ ...s, status: 'loading' }));
        findProductsToBuy({ search: text })
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
  }, [text]);

  return (
    <div className="nl-buy-picker">
      <Field id="np-add" label={T.form.addProduct} value={text} onChange={setText} placeholder={T.form.addPlaceholder} helper={T.form.addHelper} autoComplete="off" />
      <div className="nl-buy-picker__results" aria-live="polite">
        {state.status === 'error' ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{T.form.addFailed}</span>
          </p>
        ) : null}
        {state.status === 'ready' && state.rows.length === 0 ? <p className="nl-helper">{T.form.addNone}</p> : null}
        {state.status === 'ready' && state.rows.length > 0 ? (
          <ul className="nl-buy-picker__list" aria-label={T.form.resultsLabel}>
            {state.rows.map((row) => (
              <li key={row.item_code}>
                <button
                  type="button"
                  className="nl-buy-picker__option"
                  onClick={() => {
                    onAdd(row);
                    setText('');
                  }}
                >
                  {row.cost === null ? fill(T.form.resultNoCost, { name: row.item_name }) : fill(T.form.result, { name: row.item_name, cost: formatMoney(row.cost) })}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default PurchaseProductPicker;
