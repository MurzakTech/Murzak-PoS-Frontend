import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { SkeletonText } from '../components/Skeleton';
import { listOutletIndustries, setOutletIndustry } from '../../api/industryApi';
import fill from '../labels/fill';
import T from '../industry/strings.industry';
import useSettingsUser from './useSettingsUser';

const W = T.outlets;
const FOLLOW = '__business';

/**
 * Settings, Business: "Kind of shop, by store". Each store can be its own kind of shop, so one business can run a
 * restaurant till and a pharmacy counter side by side. The owner picks; a manager can see. A choice is saved at once.
 * Shows nothing when the stores cannot be read (an older server, or a cashier): it is an extra, never a blocker.
 *
 *   load, save   injectable for tests; default to the server calls
 */
const OutletIndustryCard = ({ load = listOutletIndustries, save = setOutletIndustry }) => {
  const { company } = useSettingsUser();
  const [state, setState] = useState({ status: 'loading', data: null });
  const [savingStore, setSavingStore] = useState('');
  const [message, setMessage] = useState({ text: '', error: false });

  const read = useCallback(() => {
    let live = true;
    load(company || undefined)
      .then((data) => live && setState(data && Array.isArray(data.outlets) ? { status: 'ready', data } : { status: 'none', data: null }))
      .catch(() => live && setState({ status: 'none', data: null }));
    return () => {
      live = false;
    };
  }, [company, load]);

  useEffect(() => read(), [read]);

  if (state.status === 'none') return null;

  const data = state.data;
  const businessLabel = data
    ? (data.outlets.find((o) => !o.industry) || {}).label || data.options.find((o) => o.value === data.business_profile)?.label || data.business_profile
    : '';

  const choose = async (outlet, value) => {
    const industry = value === FOLLOW ? '' : value;
    if (industry === (outlet.industry || '')) return;
    setSavingStore(outlet.warehouse);
    setMessage({ text: '', error: false });
    try {
      await save({ warehouse: outlet.warehouse, industry, company: company || undefined });
      setMessage({ text: fill(W.saved, { store: outlet.name }), error: false });
      read();
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setSavingStore('');
    }
  };

  let body;
  if (state.status === 'loading') {
    body = (
      <div aria-busy="true" aria-label={W.loading}>
        <SkeletonText lines={2} />
      </div>
    );
  } else {
    const options = [{ value: FOLLOW, label: fill(W.followBusiness, { label: businessLabel }) }, ...data.options.map((o) => ({ value: o.value, label: o.label }))];
    body = (
      <>
        {data.outlets.map((outlet) => (
          <Select
            key={outlet.warehouse}
            id={`outlet-industry-${outlet.warehouse}`}
            label={outlet.name}
            options={options}
            value={outlet.industry || FOLLOW}
            onChange={(value) => choose(outlet, value)}
            disabled={!data.can_change || savingStore === outlet.warehouse}
          />
        ))}
        {!data.can_change ? <p className="nl-settings-note">{W.ownerOnly}</p> : null}
        {message.text ? (
          <p className={message.error ? 'nl-settings-error' : 'nl-settings-status is-saved'} role={message.error ? 'alert' : 'status'}>
            <Icon name={message.error ? 'alert' : 'check'} />
            <span>{message.text}</span>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="nl-settings-card" data-card="outlet-industry">
      <Card title={W.title} subtitle={W.text}>
        {body}
      </Card>
    </div>
  );
};

export default OutletIndustryCard;
