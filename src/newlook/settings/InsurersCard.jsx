import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { SkeletonText } from '../components/Skeleton';
import { getInsurers, saveInsurers } from '../../api/industryApi';
import fill from '../labels/fill';
import T from '../industry/strings.industry';
import useSettingsUser from './useSettingsUser';

const W = T.insurers;

const toRows = (insurers) => (insurers || []).map((i) => ({ name: i.name || '', percent: String(i.copay_percent ?? ''), amount: String(i.copay_amount ?? ''), customer: i.customer || null }));
const fromRows = (rows) =>
  rows
    .filter((r) => r.name.trim())
    .map((r) => ({ name: r.name.trim(), copay_percent: Number(r.percent) || 0, copay_amount: Number(r.amount) || 0, customer: r.customer || undefined }));

/**
 * Settings, Business, for a pharmacy: the medical insurers it bills and each one's co-payment rule. The owner and
 * managers can change them; others see them read only. Each insurer gets its customer record when saved.
 *
 *   load, save   injectable for tests; default to the server calls
 */
const InsurersCard = ({ load = getInsurers, save = saveInsurers }) => {
  const { company } = useSettingsUser();
  const [rows, setRows] = useState(null);
  const [canChange, setCanChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    load(company || undefined)
      .then((data) => {
        if (!live) return;
        setRows(toRows(data?.insurers));
        setCanChange(data?.can_change === true);
      })
      .catch(() => live && setHidden(true));
    return () => {
      live = false;
    };
  }, [company, load]);

  if (hidden) return null;

  const update = (index, patch) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setMessage({ text: '', error: false });
  };

  const submit = async () => {
    setSaving(true);
    setMessage({ text: '', error: false });
    try {
      const saved = await save({ insurers: fromRows(rows), company: company || undefined });
      setRows(toRows(saved?.insurers));
      setMessage({ text: W.saved, error: false });
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  const locked = !canChange;
  let body;
  if (!rows) {
    body = (
      <div aria-busy="true" aria-label={W.loading}>
        <SkeletonText lines={3} />
      </div>
    );
  } else {
    body = (
      <>
        {rows.length === 0 ? <p className="nl-settings-note">{W.none}</p> : null}
        {rows.map((r, i) => (
          <div className="nl-products-formgroup" key={`ins${i}`}>
            <Field id={`ins-name-${i}`} label={W.name} placeholder={W.namePlaceholder} value={r.name} disabled={locked} onChange={(v) => update(i, { name: v })} />
            <Field id={`ins-percent-${i}`} label={W.copayPercent} inputMode="decimal" value={r.percent} disabled={locked} onChange={(v) => update(i, { percent: v.replace(/[^\d.]/g, '') })} />
            <Field id={`ins-amount-${i}`} label={W.copayAmount} inputMode="decimal" value={r.amount} disabled={locked} onChange={(v) => update(i, { amount: v.replace(/[^\d.]/g, '') })} />
            {!locked ? (
              <Button variant="ghost" size="small" onClick={() => setRows((prev) => prev.filter((_, x) => x !== i))}>
                {fill(W.remove, { name: r.name || W.name })}
              </Button>
            ) : null}
          </div>
        ))}
        <p className="nl-settings-note">{W.note}</p>
        {locked ? (
          <p className="nl-settings-note">{W.readOnly}</p>
        ) : (
          <div className="nl-settings-footer">
            <Button variant="secondary" size="small" icon="plus" onClick={() => setRows((prev) => [...prev, { name: '', percent: '', amount: '', customer: null }])}>
              {W.add}
            </Button>
            <Button onClick={submit} loading={saving}>
              {W.save}
            </Button>
          </div>
        )}
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
    <div className="nl-settings-card" data-card="insurers">
      <Card title={W.title} subtitle={W.subtitle}>
        {body}
      </Card>
    </div>
  );
};

export default InsurersCard;
