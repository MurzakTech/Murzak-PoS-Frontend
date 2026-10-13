import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import { SkeletonRows } from '../components/Skeleton';
import S from '../strings';
import fill from '../labels/fill';
import { getProductsWithoutCost } from '../../api/overviewApi';

const T = S.home.missingCost;

/**
 * "Profit not counted for N products without a cost price" (P2-7): the line under the Net profit tile and the list it opens.
 * Sales of a product with no cost price are left out of Net profit, because counting them would make every sale look like
 * pure profit. The list names each product and says where to add its cost. Only an owner or manager can reach it (the server
 * refuses a cashier, and the tile is not drawn for one).
 */
export const MissingCostLine = ({ count, onOpen }) =>
  count > 0 ? (
    <div className="nl-missing-cost">
      <p className="nl-missing-cost__line">{count === 1 ? T.lineOne : fill(T.line, { count })}</p>
      <Button variant="ghost" size="small" onClick={onOpen}>
        {T.action}
      </Button>
    </div>
  ) : null;

export const MissingCostDialog = ({ open, onClose, range, productsTo, load = getProductsWithoutCost }) => {
  const [state, setState] = useState({ status: 'loading', products: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setState({ status: 'loading', products: [] });
    load({ from: range && range.from, to: range && range.to, limit: 200 })
      .then((products) => live && setState({ status: 'ready', products }))
      .catch(() => live && setState({ status: 'error', products: [] }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt, range && range.from, range && range.to]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={T.listTitle}
      description={T.listText}
      footer={
        <Button variant="secondary" onClick={onClose} data-autofocus>
          {T.close}
        </Button>
      }
    >
      {state.status === 'loading' ? <SkeletonRows rows={4} columns={2} /> : null}
      {state.status === 'error' ? (
        <div role="alert">
          <p>{T.failed}</p>
          <Button variant="secondary" size="small" onClick={() => setAttempt((n) => n + 1)}>
            {T.retry}
          </Button>
        </div>
      ) : null}
      {state.status === 'ready' && state.products.length === 0 ? <p>{T.empty}</p> : null}
      {state.status === 'ready' && state.products.length > 0 ? (
        <ul className="nl-missing-cost__list">
          {state.products.map((p) => (
            <li key={p.item_code} className="nl-missing-cost__item">
              <div>
                <p className="nl-missing-cost__name">{p.item_name}</p>
                <p className="nl-missing-cost__sold">{fill(T.sold, { count: p.units_sold })}</p>
              </div>
              <Button as={RouterLink} to={productsTo(p)} variant="secondary" size="small" aria-label={`${T.openProduct}: ${p.item_name}`}>
                {T.openProduct}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Dialog>
  );
};
