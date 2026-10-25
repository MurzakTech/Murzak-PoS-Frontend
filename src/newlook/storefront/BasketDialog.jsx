import React from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../components/format';
import Stepper from './Stepper';

/** The shopper's basket: what is in it, how many, what it comes to, and the way on to checkout. */
const BasketDialog = ({ open, onClose, onCheckout, shop, cart, subtotal, dispatch, t }) => {
  const minimum = Number(shop?.minimum_order) || 0;
  const short = minimum > subtotal ? minimum - subtotal : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('basketTitle')}
      closeLabel={t('close')}
      footer={
        cart.lines.length ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('keepShopping')}
            </Button>
            <Button disabled={short > 0} onClick={onCheckout}>
              {t('checkout')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t('keepShopping')}
          </Button>
        )
      }
    >
      {cart.lines.length === 0 ? (
        <EmptyState icon="inbox" title={t('basketEmpty')} description={t('basketEmptyHelp')} level={3} />
      ) : (
        <div className="sf-basket">
          <ul className="sf-basket__lines">
            {cart.lines.map((line) => (
              <li key={line.item_code} className="sf-basket__line">
                <div className="sf-basket__what">
                  <span className="sf-basket__name">{line.item_name}</span>
                  <span className="sf-basket__price">{formatMoney(line.price * line.qty)}</span>
                </div>
                <div className="sf-basket__controls">
                  <Stepper
                    name={line.item_name}
                    qty={line.qty}
                    max={line.max}
                    t={t}
                    onChange={(qty) => dispatch({ type: 'set', item_code: line.item_code, qty })}
                  />
                  <Button
                    variant="ghost"
                    size="small"
                    aria-label={t('remove', { name: line.item_name })}
                    onClick={() => dispatch({ type: 'remove', item_code: line.item_code })}
                  >
                    {t('removeShort')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <dl className="sf-basket__totals">
            <div>
              <dt>{t('subtotal')}</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
          </dl>
          {short > 0 ? (
            <p className="sf-note sf-note--warn" role="status">
              {t('minimumNotMet', { amount: formatMoney(short) })}
            </p>
          ) : null}
          <p className="sf-note">{t('priceNote')}</p>
        </div>
      )}
    </Dialog>
  );
};

export default BasketDialog;
