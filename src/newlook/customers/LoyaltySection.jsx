import React from 'react';
import Button from '../components/Button';
import { DetailFacts } from '../components/DetailPanel';
import EmptyState from '../components/EmptyState';
import T from './strings.customers';

/**
 * The Loyalty block of the customer panel (ticket P4-7, open question 16): the programme the customer is on and their points,
 * with Assign programme, Redeem points and Points history. The three dialogs are opened and drawn by the panel, outside the
 * detail card (see CreditSection for why); the programmes themselves stay in Settings.
 *
 *   customer   the panel's customer (loyalty_program)
 *   balance    the points as loaded by the panel ({ status, data: { points }, reload })
 *   onOpen(kind)   'assign', 'redeem' or 'history'
 */
const LoyaltySection = ({ customer, balance, onOpen }) => {
  const points = balance.status === 'ready' ? balance.data.points : null;
  return (
    <section className="nl-customer-panel__section" aria-label={T.loyalty.title}>
      <h3 className="nl-label">{T.loyalty.title}</h3>
      {balance.status === 'error' ? (
        <EmptyState icon="alert" tone="error" level={4} title={T.loyalty.errorText} action={{ label: T.loyalty.retry, onClick: balance.reload }} />
      ) : (
        <DetailFacts
          facts={[
            { label: T.loyalty.programme, value: customer.loyalty_program || T.loyalty.noProgramme },
            { label: T.loyalty.points, value: points === null ? T.noValue : Number(points).toLocaleString('en-US') },
          ]}
        />
      )}
      <div className="nl-customer-panel__buttons">
        <Button variant="secondary" onClick={() => onOpen('assign')}>
          {T.loyalty.assign}
        </Button>
        <Button variant="secondary" onClick={() => onOpen('redeem')}>
          {T.loyalty.redeem}
        </Button>
        <Button variant="secondary" onClick={() => onOpen('history')}>
          {T.loyalty.history}
        </Button>
      </div>
    </section>
  );
};

export default LoyaltySection;
