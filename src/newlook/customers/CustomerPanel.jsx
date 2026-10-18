import React, { useState } from 'react';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { removeCreditLimit, updateCustomer } from '../../api/customersListApi';
import CreditSection from './CreditSection';
import { AssignDialog, HistoryDialog, RedeemDialog } from './LoyaltyDialogs';
import LoyaltySection from './LoyaltySection';
import StatementSection from './StatementSection';
import { defaultMessage, lastPurchaseDetail, shownPhone, whatsappLink } from './customersModel';
import { useCreditLimit, useCustomerOverview, useLoyaltyBalance } from './useCustomersData';
import T from './strings.customers';

/**
 * The customer panel of the Customers page (ticket P4-7, acceptance check AC-28). It asks the server for the customer itself, so
 * the list and the panel load, fail and retry independently.
 *
 * Shows the facts, the balance owed and the last purchase, a WhatsApp message that is ready to send (the app sends nothing; the
 * owner presses send in WhatsApp), then the Statement, Credit and Loyalty sections. Balance, statement and credit are drawn only
 * for an owner or manager (the server also refuses a cashier). Buttons: Send on WhatsApp, Edit, Disable. The customer number is
 * under Details.
 *
 * Every question and dialog (disable, remove the credit limit, the three loyalty dialogs) is drawn here, beside the detail card
 * and not inside it: the card closes itself on Escape, and a dialog inside it would lose its own Escape to the card.
 *
 *   id, company, shop   which customer, which business, and the business name used in messages
 *   summary             the list row, used for the title while the panel loads
 *   canSeeMoney         whether this person may see balances, statements and credit
 *   onEdit()            opens the edit form
 *   onChanged()         called after the customer is disabled or enabled, so the list can refresh
 */
const CustomerPanel = ({ id, company, shop, summary, canSeeMoney, position, onClose, onPrevious, onNext, onEdit, onChanged }) => {
  const { status, data: customer, reload } = useCustomerOverview(id, company);
  const toast = useToast();
  const [typed, setTyped] = useState(null);
  const [dialog, setDialog] = useState('');
  const [busy, setBusy] = useState(false);
  const credit = useCreditLimit(id, company, canSeeMoney);
  const points = useLoyaltyBalance(id, company);

  const loading = status === 'loading' && !customer;
  const failed = status === 'error';
  const shown = customer || null;
  const name = (shown && shown.name) || (summary && summary.name);
  const disabled = shown ? shown.disabled : summary && summary.disabled;
  const hasBalance = Boolean(shown && shown.balance !== undefined && shown.balance !== null);
  const balance = hasBalance ? shown.balance : 0;

  // The message starts as a reminder when they owe, and is the owner's to change; nothing is sent by the app
  const ready = shown ? defaultMessage({ name: shown.name, balance: hasBalance ? balance : 0, shop }) : '';
  const message = typed === null ? ready : typed;
  const link = shown ? whatsappLink(shown.mobile, message) : '';
  const noMobile = Boolean(shown && !link);
  const owes = hasBalance && balance > 0;

  const change = async (nextDisabled) => {
    setBusy(true);
    try {
      await updateCustomer({ id, disabled: nextDisabled, company });
      toast.success(fill(nextDisabled ? T.disable.done : T.disable.undone, { name }));
      setDialog('');
      reload();
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(T.disable.failed);
    } finally {
      setBusy(false);
    }
  };

  const removeLimit = async () => {
    setBusy(true);
    try {
      await removeCreditLimit({ customer: id, company });
      toast.success(T.credit.removed);
      setDialog('');
      credit.reload();
    } catch (e) {
      toast.error(T.credit.failed);
    } finally {
      setBusy(false);
    }
  };

  const actions = [];
  if (shown && link) actions.push({ key: 'whatsapp', label: owes ? T.whatsapp.reminderButton : T.whatsapp.button, onClick: () => window.open(link, '_blank', 'noopener,noreferrer') });
  if (shown) actions.push({ key: 'edit', label: T.panel.edit, icon: 'settings', onClick: onEdit });
  if (shown) actions.push(disabled ? { key: 'enable', label: T.panel.enable, onClick: () => change(false) } : { key: 'disable', label: T.panel.disable, onClick: () => setDialog('disable') });
  const [primary, ...secondary] = actions;

  return (
    <>
      <DetailPanel
        title={name || T.panel.loadingTitle}
        status={shown || summary ? disabled ? <Chip icon="x">{T.status.disabled}</Chip> : <Chip icon="check">{T.status.active}</Chip> : null}
        position={position}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        loading={loading}
        primary={primary}
        secondary={secondary.slice(0, 3)}
        details={shown ? [{ label: T.panel.detailsNumber, value: shown.id }] : []}
      >
        {failed ? (
          <EmptyState icon="alert" tone="error" level={3} title={T.panel.errorTitle} description={T.panel.errorText} action={{ label: T.panel.retry, onClick: reload }} />
        ) : shown ? (
          <div className="nl-customer-panel">
            {disabled ? <p className="nl-customer-panel__note">{T.panel.disabledNote}</p> : null}

            <DetailFacts
              facts={[
                { label: T.panel.mobile, value: shownPhone(shown.mobile) === T.noValue ? '' : shownPhone(shown.mobile) },
                { label: T.panel.email, value: shown.email },
                { label: T.panel.kraPin, value: shown.tax_id },
                { label: T.panel.type, value: T.types[shown.type] || shown.type },
                ...(shown.features && shown.features.groups ? [{ label: T.panel.group, value: shown.group }] : []),
                ...(shown.features && shown.features.territories ? [{ label: T.panel.area, value: shown.territory }] : []),
              ]}
            />

            <DetailFacts
              facts={[
                ...(hasBalance ? [{ label: T.panel.balance, value: <strong className="nl-customer-panel__balance">{owes ? formatMoney(balance) : T.panel.owesNothing}</strong> }] : []),
                { label: T.panel.lastPurchase, value: lastPurchaseDetail(shown.last_purchase) },
              ]}
            />

            <section className="nl-customer-panel__section" aria-label={T.whatsapp.title}>
              <h3 className="nl-label">{T.whatsapp.title}</h3>
              {noMobile ? (
                <p className="nl-customer-panel__note">
                  {T.whatsapp.noMobile}{' '}
                  <button type="button" className="nl-customer-panel__link" onClick={onEdit}>
                    {T.whatsapp.addMobile}
                  </button>
                </p>
              ) : (
                <Field id={`nl-customer-message-${id}`} label={T.whatsapp.messageLabel} helper={T.whatsapp.messageHelp} value={message} onChange={setTyped} />
              )}
            </section>

            {canSeeMoney ? <StatementSection customer={shown} company={company} shop={shop} /> : null}
            {canSeeMoney ? <CreditSection customer={shown} company={company} credit={credit} onRemove={() => setDialog('removeLimit')} /> : null}
            <LoyaltySection customer={shown} balance={points} onOpen={setDialog} />
          </div>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={dialog === 'disable'}
        title={fill(T.disable.title, { name })}
        message={fill(T.disable.message, { name })}
        confirmLabel={T.disable.confirm}
        cancelLabel={T.disable.cancel}
        destructive
        loading={busy}
        onConfirm={() => change(true)}
        onCancel={() => setDialog('')}
      />
      <ConfirmDialog
        open={dialog === 'removeLimit'}
        title={T.credit.removeTitle}
        message={fill(T.credit.removeMessage, { name })}
        confirmLabel={T.credit.removeConfirm}
        cancelLabel={T.credit.removeCancel}
        destructive
        loading={busy}
        onConfirm={removeLimit}
        onCancel={() => setDialog('')}
      />
      {shown ? (
        <>
          <AssignDialog
            open={dialog === 'assign'}
            customer={shown}
            company={company}
            onClose={() => setDialog('')}
            onDone={() => {
              setDialog('');
              reload();
            }}
          />
          <RedeemDialog
            open={dialog === 'redeem'}
            customer={shown}
            company={company}
            points={points.status === 'ready' ? points.data.points : 0}
            onClose={() => setDialog('')}
            onDone={() => {
              setDialog('');
              points.reload();
            }}
          />
          <HistoryDialog open={dialog === 'history'} customer={shown} company={company} onClose={() => setDialog('')} />
        </>
      ) : null}
    </>
  );
};

export default CustomerPanel;
