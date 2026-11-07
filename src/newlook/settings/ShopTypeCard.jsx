import React, { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { SkeletonText } from '../components/Skeleton';
import { getShopType, setShopType } from '../../api/shopTypeApi';
import fill from '../labels/fill';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const W = T.shopType;

/**
 * Settings, Business: "Shop type". An owner picks what kind of shop this is; a manager can see it. The server limits it: only
 * a type from the list, and once one is set it can be changed once every 30 days, so the screen says so before it asks and
 * asks again before a change. Shows nothing when the answer cannot be read (it is an extra, never a blocker).
 *
 *   load, save   injectable for tests; default to the server calls
 */
const ShopTypeCard = ({ load = getShopType, save = setShopType }) => {
  const { company } = useSettingsUser();
  const [state, setState] = useState({ status: 'loading', data: null });
  const [choice, setChoice] = useState('');
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const read = useCallback(() => {
    let live = true;
    load(company || undefined).then((data) => {
      if (!live) return;
      if (data) {
        setState({ status: 'ready', data });
        setChoice(data.current || '');
      } else setState({ status: 'none', data: null });
    });
    return () => {
      live = false;
    };
  }, [company, load]);

  useEffect(() => read(), [read]);

  if (state.status === 'none') return null;

  const data = state.data;
  const labelOf = (value) => (data && data.options.find((o) => o.value === value) ? data.options.find((o) => o.value === value).label : value);
  const locked = Boolean(data && data.next_change_on);
  const editable = Boolean(data && data.can_change && !locked);
  const changed = Boolean(data && choice && choice !== (data.current || ''));

  const apply = async () => {
    setSaving(true);
    setError('');
    try {
      const next = await save({ industry: choice, company: company || undefined });
      setAsking(false);
      setSaved(true);
      if (next) {
        setState({ status: 'ready', data: next });
        setChoice(next.current || choice);
      } else read();
    } catch (e) {
      setAsking(false);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => {
    if (!changed || saving) return;
    setSaved(false);
    if (data.current) setAsking(true);
    else apply();
  };

  let body;
  if (state.status === 'loading') {
    body = (
      <div aria-busy="true" aria-label={W.loading}>
        <SkeletonText lines={2} />
      </div>
    );
  } else {
    body = (
      <>
        <Select
          id="shop-type"
          label={W.label}
          options={data.options.map((o) => ({ value: o.value, label: o.label }))}
          value={choice}
          placeholder={W.placeholder}
          onChange={(value) => {
            setChoice(value);
            setSaved(false);
          }}
          disabled={!editable}
          helper={!data.can_change ? W.ownerOnly : locked ? fill(W.locked, { date: data.next_change_text }) : data.current ? W.limit : W.notSet}
        />
        {error ? (
          <p className="nl-settings-error" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </p>
        ) : null}
        {editable ? (
          <div className="nl-settings-footer">
            <p className={`nl-settings-status${saved && !changed ? ' is-saved' : ''}`} role="status">
              {saved && !changed ? <Icon name="check" /> : null}
              {saved && !changed ? W.saved : ''}
            </p>
            <Button onClick={onSave} disabled={!changed} loading={saving}>
              {W.save}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="nl-settings-card" data-card="shop-type">
      <Card title={W.title} subtitle={W.subtitle}>
        {body}
      </Card>
      <ConfirmDialog
        open={asking}
        title={W.confirmTitle}
        message={data ? fill(W.confirmText, { from: labelOf(data.current), to: labelOf(choice) }) : ''}
        confirmLabel={W.confirm}
        cancelLabel={data ? fill(W.cancel, { from: labelOf(data.current) }) : ''}
        loading={saving}
        onConfirm={apply}
        onCancel={() => setAsking(false)}
      />
    </div>
  );
};

export default ShopTypeCard;
