import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { SkeletonText } from '../components/Skeleton';
import Switch from '../components/Switch';
import { PageHeader } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { getPaymentMethods, setPaymentMethod } from '../../api/paymentMethodsApi';
import './settings.css';
import T from './strings.settings';

const P = T.till.payments;

/**
 * Settings, Till and payments (ticket P3-1): the payment method switches. Cash, M-Pesa, Card and On credit are plain
 * switches; every other method the shop has sits under Other. Each switch saves on its own and says "Saved"; a refusal
 * (such as switching off the last way of taking money) comes back beside the switch in words. Only the owner can change
 * them (the server checks; the switches are also disabled for anyone else).
 *
 *   load, save   injectable for tests; they default to the server calls
 */
const TillSettingsPage = ({ load = getPaymentMethods, save = setPaymentMethod }) => {
  const access = useAccess();
  const [state, setState] = useState({ status: 'loading', data: null });
  const isOwner = access.tier === 'owner';

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null });
    load()
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => setState({ status: 'error', data: null }));
  }, [load]);
  useEffect(reload, [reload]);

  // The list from the server after each change replaces what is shown, so the switches always match what was saved
  const change = (args) => async (enabled) => {
    const data = await save({ ...args, enabled });
    setState({ status: 'ready', data });
  };

  let body;
  if (state.status === 'loading') body = <div aria-busy="true" aria-label={P.loading}><SkeletonText lines={4} /></div>;
  else if (state.status === 'error') body = <EmptyState icon="alert" tone="error" title={P.errorTitle} description={P.errorText} action={{ label: P.retry, onClick: reload }} level={3} />;
  else {
    const { methods, other } = state.data;
    body = (
      <div className="nl-settings-list">
        {!isOwner ? <p className="nl-settings-note">{P.ownerOnly}</p> : null}
        <ul className="nl-settings-switches">
          {methods.map((m) => (
            <li key={m.key} className="nl-settings-switch">
              <Switch label={m.label} checked={m.enabled} disabled={!isOwner || !m.available} onChange={change({ key: m.key })} />
              {!m.available ? <p className="nl-settings-hint">{P.notSetUp}</p> : m.needs_code ? <p className="nl-settings-hint">{P.needsCode}</p> : null}
            </li>
          ))}
        </ul>
        <h3 className="nl-settings-subtitle">{P.other}</h3>
        {other.length === 0 ? (
          <p className="nl-settings-hint">{P.noOther}</p>
        ) : (
          <ul className="nl-settings-switches">
            {other.map((m) => (
              <li key={m.mode} className="nl-settings-switch">
                <Switch label={m.label} checked={m.enabled} disabled={!isOwner || !m.available} onChange={change({ key: 'other', mode: m.mode })} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="nl-settings">
      <PageHeader title={T.till.title} subtitle={T.till.subtitle} />
      <Card title={P.title} subtitle={P.subtitle}>
        {body}
      </Card>
    </div>
  );
};

export default TillSettingsPage;
