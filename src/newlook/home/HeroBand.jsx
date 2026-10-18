import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import S from '../strings';
import fill from '../labels/fill';
import ChangeLine from './ChangeLine';
import { changeInfo, money, shortDay, weekdayName } from './homeModel';

const T = S.home.hero;

/**
 * The hero band (Spec: Dashboard, "Greeting and hero band"). It always shows today, whatever the period filter says:
 * Today so far with its change against the same weekday last week, the number of sales, the average basket, cash in the
 * till with the opening float, and M-Pesa received with how many payments were recorded. The button reads "Open till"
 * when no till is open and "Count and close till" when one is. A till still open from an earlier day turns it into a
 * warning banner.
 *
 *   hero         the contract's hero object, or null while loading or when it failed
 *   today        today's date as yyyy-mm-dd (Nairobi), to tell a stale till from today's
 *   loading      show skeletons in the figures
 *   openTo / closeTo   where the till button goes
 */
const Figure = ({ label, children, note }) => (
  <div className="nl-hero__figure">
    <dt className="nl-hero__label">{label}</dt>
    <dd className="nl-hero__value">{children}</dd>
    {note ? <dd className="nl-hero__note">{note}</dd> : null}
  </div>
);

const HeroBand = ({ hero, today, loading, failed, onRetry, openTo, closeTo, weekday = weekdayName() }) => {
  if (failed) {
    return (
      <section className="nl-card nl-hero nl-hero--failed" aria-label={T.label}>
        <div className="nl-card-error">
          <Icon name="alert" />
          <p>{S.home.states.cardErrorTitle}</p>
          <Button variant="ghost" size="small" onClick={onRetry}>
            {S.home.states.retry}
          </Button>
        </div>
      </section>
    );
  }
  if (loading || !hero) {
    return (
      <section className="nl-card nl-hero" aria-label={T.label} aria-busy="true">
        <Skeleton width="220px" height="44px" />
        <Skeleton width="180px" height="16px" />
        <div className="nl-hero__figures">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height="48px" />
          ))}
        </div>
      </section>
    );
  }

  const till = hero.till || { state: 'closed' };
  const tillOpen = till.state === 'open';
  const stale = tillOpen && till.opened_on && today && till.opened_on < today;
  const change = changeInfo(hero.change_pct, T.change, { weekday });
  const cash = hero.cash_in_till;
  const mpesa = hero.mpesa;
  const payments = mpesa ? (mpesa.payments === 1 ? T.onePaymentRecorded : mpesa.payments > 0 ? fill(T.paymentsRecorded, { count: mpesa.payments }) : T.noPayments) : null;

  return (
    <section className="nl-card nl-hero" aria-label={T.label}>
      {stale ? (
        <div className="nl-hero__stale" role="alert">
          <Icon name="alert" />
          <div>
            <p className="nl-hero__stale-title">{T.staleTitle}</p>
            <p className="nl-hero__stale-text">{fill(T.staleText, { date: shortDay(till.opened_on) })}</p>
          </div>
          <Button as={RouterLink} to={closeTo} size="small">
            {T.closeTill}
          </Button>
        </div>
      ) : null}
      <div className="nl-hero__main">
        <div className="nl-hero__total">
          <p className="nl-hero__total-label">{T.title}</p>
          <p className="nl-hero__total-value" data-testid="hero-total">
            {money(hero.today_total)}
          </p>
          <ChangeLine direction={change.direction} text={change.text} />
        </div>
        {!stale ? (
          <Button as={RouterLink} to={tillOpen ? closeTo : openTo} variant={tillOpen ? 'secondary' : 'primary'} icon="till" className="nl-hero__till">
            {tillOpen ? T.closeTill : T.openTill}
          </Button>
        ) : null}
      </div>
      <dl className="nl-hero__figures">
        <Figure label={T.salesCount}>{hero.sales_count}</Figure>
        <Figure label={T.averageBasket}>{hero.sales_count ? money(hero.average_basket) : money(0)}</Figure>
        <Figure label={T.cashInTill} note={cash ? fill(T.includesFloat, { amount: money(cash.opening_float) }) : T.noTill}>
          {cash ? money(cash.amount) : '–'}
        </Figure>
        <Figure label={T.mpesaReceived} note={payments}>
          {mpesa ? money(mpesa.amount) : '–'}
        </Figure>
      </dl>
    </section>
  );
};

export default HeroBand;
