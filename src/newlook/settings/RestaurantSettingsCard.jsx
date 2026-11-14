import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { SkeletonText } from '../components/Skeleton';
import { getRestaurantSettings, listOutletIndustries, saveRestaurantSettings } from '../../api/industryApi';
import fill from '../labels/fill';
import { DAYS, blankHappyHour, fromForm, toForm } from '../industry/restaurantSettingsModel';
import T from '../industry/strings.industry';
import useSettingsUser from './useSettingsUser';

const W = T.restaurantSettings;

/**
 * Settings, Business, for a restaurant or bar: the service charge, delivery platforms and their commission, happy hours
 * and each store's tables. Saved together. The owner and managers can change it; others see nothing.
 *
 *   load, loadStores, save   injectable for tests; default to the server calls
 */
const RestaurantSettingsCard = ({ load = getRestaurantSettings, loadStores = listOutletIndustries, save = saveRestaurantSettings }) => {
  const { company } = useSettingsUser();
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(null);
  const [canChange, setCanChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([load(company || undefined), loadStores(company || undefined).catch(() => ({ outlets: [] }))])
      .then(([settings, outletData]) => {
        if (!live) return;
        const list = (outletData && outletData.outlets) || [];
        setStores(list);
        setCanChange(settings?.can_change === true);
        setForm(toForm(settings, list));
      })
      .catch(() => live && setHidden(true));
    return () => {
      live = false;
    };
  }, [company, load, loadStores]);

  if (hidden) return null;

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setMessage({ text: '', error: false });
  };
  const updateRow = (key, index, patch) => update({ [key]: form[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const removeRow = (key, index) => update({ [key]: form[key].filter((_, i) => i !== index) });

  const submit = async () => {
    setSaving(true);
    setMessage({ text: '', error: false });
    try {
      const saved = await save({ settings: fromForm(form), company: company || undefined });
      setForm(toForm(saved, stores));
      setMessage({ text: W.saved, error: false });
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  let body;
  if (!form) {
    body = (
      <div aria-busy="true" aria-label={W.loading}>
        <SkeletonText lines={3} />
      </div>
    );
  } else {
    const locked = !canChange;
    body = (
      <>
        <Field id="rs-service" label={W.serviceCharge} helper={W.serviceChargeHelper} inputMode="decimal" value={form.serviceCharge} disabled={locked} onChange={(v) => update({ serviceCharge: v.replace(/[^\d.]/g, '') })} />

        <h3 className="nl-settings-subtitle">{W.platformsTitle}</h3>
        <p className="nl-settings-note">{W.platformsHelper}</p>
        {form.platforms.map((p, i) => (
          <div className="nl-products-formgroup" key={`p${i}`}>
            <Field id={`rs-platform-${i}`} label={W.platformName} value={p.name} disabled={locked} onChange={(v) => updateRow('platforms', i, { name: v })} />
            <Field id={`rs-commission-${i}`} label={W.commission} inputMode="decimal" value={p.commission} disabled={locked} onChange={(v) => updateRow('platforms', i, { commission: v.replace(/[^\d.]/g, '') })} />
            {!locked ? (
              <Button variant="ghost" size="small" onClick={() => removeRow('platforms', i)}>
                {fill(W.remove, { name: p.name || W.platformName })}
              </Button>
            ) : null}
          </div>
        ))}
        {!locked ? (
          <Button variant="secondary" size="small" icon="plus" onClick={() => update({ platforms: [...form.platforms, { name: '', commission: '' }] })}>
            {W.addPlatform}
          </Button>
        ) : null}

        <h3 className="nl-settings-subtitle">{W.happyTitle}</h3>
        <p className="nl-settings-note">{W.happyHelper}</p>
        {form.happyHours.length === 0 ? <p className="nl-settings-note">{W.noHappy}</p> : null}
        {form.happyHours.map((h, i) => (
          <fieldset className="nl-products-formgroup" key={`h${i}`} disabled={locked}>
            <Field id={`rs-hh-name-${i}`} label={W.happyName} placeholder={W.happyNamePlaceholder} value={h.name} onChange={(v) => updateRow('happyHours', i, { name: v })} />
            <div role="group" aria-label={W.happyDays}>
              {DAYS.map((d) => (
                <Checkbox
                  key={d}
                  label={W.days[d]}
                  checked={h.days.includes(d)}
                  onChange={(on) => updateRow('happyHours', i, { days: on ? DAYS.filter((x) => x === d || h.days.includes(x)) : h.days.filter((x) => x !== d) })}
                />
              ))}
            </div>
            <Field id={`rs-hh-start-${i}`} label={W.happyStart} placeholder="17:00" value={h.start} onChange={(v) => updateRow('happyHours', i, { start: v })} />
            <Field id={`rs-hh-end-${i}`} label={W.happyEnd} placeholder="19:00" value={h.end} onChange={(v) => updateRow('happyHours', i, { end: v })} />
            <Field id={`rs-hh-percent-${i}`} label={W.happyPercent} inputMode="decimal" value={h.percent} onChange={(v) => updateRow('happyHours', i, { percent: v.replace(/[^\d.]/g, '') })} />
            <Field id={`rs-hh-groups-${i}`} label={W.happyGroups} helper={W.happyGroupsHelper} value={h.groups} onChange={(v) => updateRow('happyHours', i, { groups: v })} />
            <Field id={`rs-hh-items-${i}`} label={W.happyItems} value={h.items} onChange={(v) => updateRow('happyHours', i, { items: v })} />
            {!locked ? (
              <Button variant="ghost" size="small" onClick={() => removeRow('happyHours', i)}>
                {fill(W.remove, { name: h.name || W.happyName })}
              </Button>
            ) : null}
          </fieldset>
        ))}
        {!locked ? (
          <Button variant="secondary" size="small" icon="plus" onClick={() => update({ happyHours: [...form.happyHours, blankHappyHour()] })}>
            {W.addHappy}
          </Button>
        ) : null}

        <h3 className="nl-settings-subtitle">{W.tablesTitle}</h3>
        <p className="nl-settings-note">{W.tablesHelper}</p>
        {stores.map((s) => (
          <Field key={s.warehouse} id={`rs-tables-${s.warehouse}`} label={s.name} value={form.tables[s.warehouse] || ''} disabled={locked} onChange={(v) => update({ tables: { ...form.tables, [s.warehouse]: v } })} />
        ))}

        {locked ? (
          <p className="nl-settings-note">{W.readOnly}</p>
        ) : (
          <div className="nl-settings-footer">
            <span />
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
    <div className="nl-settings-card" data-card="restaurant-settings">
      <Card title={W.title} subtitle={W.subtitle}>
        {body}
      </Card>
    </div>
  );
};

export default RestaurantSettingsCard;
