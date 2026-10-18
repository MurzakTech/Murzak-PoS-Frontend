import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import S from '../strings';
import fill from '../labels/fill';
import { money, reminderLink, shortDay } from './homeModel';

const T = S.home.attention;
export const MAX_ATTENTION_ITEMS = 4;

const ICONS = { till_not_closed: 'till', out_of_stock: 'box', running_low: 'layers', customer_overdue: 'users', supplier_bill_due: 'truck' };

/** What each item says: [the name line, the detail line] */
export const describeItem = (item) => {
  switch (item.type) {
    case 'till_not_closed':
      return [item.session, fill(T.detail.till_not_closed, { date: shortDay(item.opened_on) })];
    case 'out_of_stock':
      return [item.name, T.detail.out_of_stock];
    case 'running_low':
      return [item.name, fill(T.detail.running_low, { qty: item.qty, level: item.warning_level })];
    case 'customer_overdue':
      return [item.name, fill(item.days_overdue === 1 ? T.detail.customer_overdue_one : T.detail.customer_overdue, { amount: money(item.amount), days: item.days_overdue })];
    case 'supplier_bill_due':
      return [item.supplier, fill(T.detail.supplier_bill_due, { amount: money(item.amount), date: shortDay(item.due_on) })];
    default:
      return [item.name || '', ''];
  }
};

/**
 * The Needs attention card (Spec: Dashboard, Needs attention). Up to four items, most urgent first, each with one button:
 * a till not closed (Close), out of stock and running low (Reorder), a customer overdue (Remind) and a supplier bill due
 * (Pay). Remind opens WhatsApp with a ready message that the owner sends; the app sends nothing itself. With nothing to
 * do, the card says so with a check icon.
 *
 *   items       the contract's attention list
 *   links       { close, reorder(item), pay(item), all } where each button goes
 *   shop        the business name used in the reminder
 */
const NeedsAttention = ({ items, links, shop, loading, failed, onRetry }) => {
  const body = () => {
    if (failed) {
      return (
        <div className="nl-card-error">
          <Icon name="alert" />
          <p>{S.home.states.cardErrorTitle}</p>
          <p className="nl-card-error__text">{S.home.states.cardErrorText}</p>
          <Button variant="ghost" size="small" onClick={onRetry}>
            {S.home.states.retry}
          </Button>
        </div>
      );
    }
    if (loading) {
      return (
        <div aria-busy="true" className="nl-attention__skeleton">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height="48px" />
          ))}
        </div>
      );
    }
    const shown = (items || []).slice(0, MAX_ATTENTION_ITEMS);
    if (shown.length === 0) {
      return <EmptyState icon="check" title={T.emptyTitle} description={T.emptyText} level={3} className="nl-attention__empty" />;
    }
    return (
      <ul className="nl-attention">
        {shown.map((item) => {
          const [name, detail] = describeItem(item);
          const action = T.actions[item.type];
          const what = fill(T.actionFor, { action, what: name });
          const key = `${item.type}-${item.item_code || item.customer || item.invoice || item.session}`;
          let button;
          if (item.type === 'customer_overdue') {
            button = (
              <Button as="a" size="small" variant="secondary" href={reminderLink({ mobile: item.mobile, name: item.name, amount: item.amount, shop })} target="_blank" rel="noopener noreferrer" aria-label={what}>
                {action}
              </Button>
            );
          } else {
            const to = item.type === 'till_not_closed' ? links.close : item.type === 'supplier_bill_due' ? links.pay(item) : links.reorder(item);
            button = (
              <Button as={RouterLink} to={to} size="small" variant="secondary" aria-label={what}>
                {action}
              </Button>
            );
          }
          return (
            <li key={key} className="nl-attention__item">
              <span className="nl-attention__icon">
                <Icon name={ICONS[item.type] || 'alert'} />
              </span>
              <div className="nl-attention__text">
                <p className="nl-attention__type">{T.types[item.type]}</p>
                <p className="nl-attention__name">{name}</p>
                <p className="nl-attention__detail">{detail}</p>
              </div>
              {button}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Card title={T.title} small className="nl-home__attention" actions={!failed && !loading && links.all ? <RouterLink to={links.all} className="nl-link">{T.seeAll}</RouterLink> : null}>
      {body()}
    </Card>
  );
};

export default NeedsAttention;
