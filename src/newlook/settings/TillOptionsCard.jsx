import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { SkeletonText } from '../components/Skeleton';
import Switch from '../components/Switch';
import { useAccess } from '../access/AccessProvider';
import { getPosProfile, updatePosProfile } from '../../api/tillOptionsApi';
import { fetchCurrentUser } from '../../store/authSlice';
import { OLD, legacy } from './settingsModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const O = T.till.options;

const SWITCHES = [
  { key: 'updateStock', label: O.updateStock, hint: O.updateStockHint },
  { key: 'allowDiscountChange', label: O.allowDiscount, hint: O.allowDiscountHint },
  { key: 'allowRateChange', label: O.allowRate, hint: O.allowRateHint },
  { key: 'allowPartialPayment', label: O.allowPartial, hint: O.allowPartialHint },
];

/**
 * Settings, Till and payments, Till options (ticket P5-3): the four switches of the till profile, through the same two
 * server calls the current Till settings screen uses. Like the payment methods, each switch saves at once and says
 * "Saved"; two quick changes are sent one after the other, each on top of the last saved set. Only the owner can change
 * them. The profile name and the kind of invoice stay on the current screen (a link).
 *
 *   load, save    injectable for tests; they default to the server calls
 *   afterSave     what to do once a change is saved; by default the signed-in person's till profile is read again, as the
 *                 current screen does, so the till sees the change
 */
const TillOptionsCard = ({ load = getPosProfile, save = updatePosProfile, afterSave }) => {
  const access = useAccess();
  const { company, dispatch } = useSettingsUser();
  const owner = access.tier === 'owner';
  const [state, setState] = useState({ status: company ? 'loading' : 'nocompany', profile: null });
  const latest = useRef(null);
  const queue = useRef(Promise.resolve());

  const reload = useCallback(() => {
    if (!company) {
      setState({ status: 'nocompany', profile: null });
      return;
    }
    setState({ status: 'loading', profile: null });
    load(company)
      .then((profile) => {
        latest.current = profile;
        setState({ status: profile ? 'ready' : 'none', profile });
      })
      .catch(() => setState({ status: 'error', profile: null }));
  }, [company, load]);
  useEffect(reload, [reload]);

  const change = (key) => (value) => {
    const run = queue.current.then(async () => {
      const saved = await save({ company, profile: { ...latest.current, [key]: value } });
      latest.current = saved;
      setState({ status: 'ready', profile: saved });
      if (afterSave) await afterSave();
      else await Promise.resolve(dispatch(fetchCurrentUser())).catch(() => undefined);
    });
    queue.current = run.catch(() => undefined);
    return run;
  };

  let body;
  if (state.status === 'loading') body = <div aria-busy="true" aria-label={O.loading}><SkeletonText lines={4} /></div>;
  else if (state.status === 'error') body = <EmptyState icon="alert" tone="error" title={O.errorTitle} description={O.errorText} action={{ label: T.shell.retry, onClick: reload }} level={3} />;
  else if (state.status === 'nocompany') body = <p className="nl-settings-hint">{T.business.noCompany}</p>;
  else if (state.status === 'none') body = <p className="nl-settings-hint">{O.noProfile}</p>;
  else {
    body = (
      <div className="nl-settings-list">
        {!owner ? <p className="nl-settings-note">{T.shell.ownerOnly}</p> : null}
        <ul className="nl-settings-switches">
          {SWITCHES.map((item) => (
            <li key={item.key} className="nl-settings-switch">
              <Switch label={item.label} checked={state.profile[item.key]} disabled={!owner} onChange={change(item.key)} />
              <p className="nl-settings-hint">{item.hint}</p>
            </li>
          ))}
        </ul>
        <p className="nl-settings-hint">{O.more}</p>
        <Button as={Link} to={legacy(OLD.tillProfile)} variant="secondary" icon="chevronRight" iconEnd>
          {O.moreLink}
        </Button>
      </div>
    );
  }

  return (
    <div className="nl-settings-card" data-card="till-options">
      <Card title={O.title} subtitle={O.subtitle}>
        {body}
      </Card>
    </div>
  );
};

export default TillOptionsCard;
