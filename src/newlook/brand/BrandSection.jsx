import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { SkeletonText } from '../components/Skeleton';
import { productImageUrl } from '../../utils/productArt';
import { getBrand, setBrand, uploadLogo } from '../../api/brandApi';
import { useAccess } from '../access/AccessProvider';
import SettingsCard from '../settings/SettingsCard';
import useSettingsUser from '../settings/useSettingsUser';
import Receipt from '../receipt/Receipt';
import { useBrand } from './BrandProvider';
import { ACCENTS, DEFAULT_BRAND, GROUPS, LIMITS, LOGO_ACCEPT, STYLES, brandProblems, groupChanged, logoProblem, tidied } from './brandModel';
import './brand.css';
import T from './strings.brand';

/** The shop shown in the preview when its real details have not loaded */
const SAMPLE_BUSINESS = { companyName: T.preview.shop, address: { line1: '', line2: '', city: '', pincode: '' }, phone: '', taxId: '' };

const AccentChoice = ({ value, onChange, disabled }) => {
  const refs = useRef([]);
  const move = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step || disabled) return;
    event.preventDefault();
    const next = (index + step + ACCENTS.length) % ACCENTS.length;
    onChange(ACCENTS[next]);
    if (refs.current[next]) refs.current[next].focus();
  };
  return (
    <div className="nl-brand-field is-wide">
      <p className="nl-brand-label" id="brand-colour-label">
        {T.look.colour}
      </p>
      <div role="radiogroup" aria-labelledby="brand-colour-label" className="nl-brand-swatches">
        {ACCENTS.map((key, i) => {
          const on = key === value;
          return (
            <button
              key={key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              className={['nl-brand-swatch', on && 'is-selected'].filter(Boolean).join(' ')}
              onClick={() => onChange(key)}
              onKeyDown={(event) => move(event, i)}
            >
              <span className="nl-brand-swatch__chip" data-swatch={key} aria-hidden="true">
                {on ? <Icon name="check" /> : null}
              </span>
              <span className="nl-brand-swatch__name">{T.accents[key]}</span>
            </button>
          );
        })}
      </div>
      <p className="nl-brand-helper">{T.look.colourHelper}</p>
    </div>
  );
};

const LogoChoice = ({ value, onChange, upload, disabled }) => {
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, error: '' });
  const url = value ? productImageUrl({ image: value }) : null;

  const picked = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) {
      setState({ busy: false, error: problem === 'size' ? T.look.sizeWrong : T.look.typeWrong });
      return;
    }
    setState({ busy: true, error: '' });
    try {
      onChange(await upload(file));
      setState({ busy: false, error: '' });
    } catch (e) {
      setState({ busy: false, error: e && e.message ? e.message : T.look.uploadFailed });
    }
  };

  return (
    <div className="nl-brand-field is-wide">
      <p className="nl-brand-label" id="brand-logo-label">
        {T.look.logo}
      </p>
      <div className="nl-brand-logo" aria-labelledby="brand-logo-label" role="group">
        <div className="nl-brand-logo__frame">{url ? <img src={url} alt={T.look.logoAlt} /> : <span>{T.look.logoNone}</span>}</div>
        <div className="nl-brand-logo__buttons">
          <Button variant="secondary" disabled={disabled || state.busy} loading={state.busy} onClick={() => input.current && input.current.click()}>
            {state.busy ? T.look.uploading : url ? T.look.replace : T.look.choose}
          </Button>
          {url ? (
            <Button variant="ghost" disabled={disabled || state.busy} onClick={() => onChange('')}>
              {T.look.remove}
            </Button>
          ) : null}
          <input ref={input} type="file" accept={LOGO_ACCEPT} className="nl-visually-hidden" tabIndex={-1} aria-label={T.look.inputLabel} onChange={picked} />
        </div>
      </div>
      {state.error ? (
        <p className="nl-brand-error" role="alert">
          <Icon name="alert" />
          <span>{state.error}</span>
        </p>
      ) : (
        <p className="nl-brand-helper">{T.look.logoHelper}</p>
      )}
    </div>
  );
};

const StyleChoice = ({ value, onChange, disabled }) => (
  <div className="nl-brand-field is-wide">
    <p className="nl-brand-label" id="brand-style-label">
      {T.style.label}
    </p>
    <div role="radiogroup" aria-labelledby="brand-style-label" className="nl-brand-styles">
      {STYLES.map((key) => {
        const on = key === value;
        return (
          <button key={key} type="button" role="radio" aria-checked={on} disabled={disabled} className={['nl-brand-style', on && 'is-selected'].filter(Boolean).join(' ')} onClick={() => onChange(key)}>
            <span className="nl-brand-style__name">
              {on ? <Icon name="check" /> : null}
              {T.style[key]}
            </span>
            <span className="nl-brand-style__help">{T.style[`${key}Help`]}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Settings, Brand (ticket P7-3): the logo and the one accent colour (chosen from a short list, never typed), the words on the receipt
 * (tagline, message at the bottom, social name, website) and the receipt style. Each card saves on its own and says "Saved". A made-up
 * sale below shows the receipt as it will look, using what is typed, before it is saved.
 *
 *   load, save, upload   injectable for tests; they default to the server calls
 */
const BrandSection = ({ load = getBrand, save = setBrand, upload = uploadLogo }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const { applySaved, business } = useBrand();
  const owner = access.tier === 'owner';
  const [state, setState] = useState({ status: 'loading', saved: DEFAULT_BRAND });
  const [draft, setDraft] = useState(DEFAULT_BRAND);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState({});
  const [saving, setSaving] = useState('');
  const [failure, setFailure] = useState({});

  const reload = useCallback(() => {
    setState({ status: 'loading', saved: DEFAULT_BRAND });
    load(company || undefined)
      .then((brand) => {
        setState({ status: 'ready', saved: brand });
        setDraft(brand);
      })
      .catch(() => setState({ status: 'error', saved: DEFAULT_BRAND }));
  }, [load, company]);
  useEffect(reload, [reload]);

  const set = (key) => (value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDone({});
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (group) => {
    const found = brandProblems(draft);
    const shown = {};
    GROUPS[group].forEach((key) => {
      if (found[key]) shown[key] = T.words[found[key]] || T.problem[found[key]];
    });
    setErrors((e) => ({ ...e, ...shown }));
    if (Object.keys(shown).length) return;
    setSaving(group);
    setFailure((f) => ({ ...f, [group]: '' }));
    try {
      const sent = await save(tidied(draft, GROUPS[group]), company || undefined);
      setState({ status: 'ready', saved: sent });
      setDraft((d) => {
        const next = { ...d };
        GROUPS[group].forEach((key) => {
          next[key] = sent[key];
        });
        return next;
      });
      applySaved(sent);
      setDone((d) => ({ ...d, [group]: true }));
    } catch (e) {
      setFailure((f) => ({ ...f, [group]: e.message }));
    } finally {
      setSaving('');
    }
  };

  const undo = (group) => {
    setDraft((d) => {
      const next = { ...d };
      GROUPS[group].forEach((key) => {
        next[key] = state.saved[key];
      });
      return next;
    });
    setErrors({});
    setFailure((f) => ({ ...f, [group]: '' }));
  };

  if (state.status === 'loading') {
    return (
      <Card title={T.look.title}>
        <div aria-busy="true" aria-label={T.loading}>
          <SkeletonText lines={5} />
        </div>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card>
        <EmptyState icon="alert" tone="error" title={T.errorTitle} description={T.errorText} action={{ label: T.retry, onClick: reload }} level={3} />
      </Card>
    );
  }

  const readOnly = !owner;
  const card = (group, copy, fields) => (
    <SettingsCard
      id={`brand-${group}`}
      title={copy.title}
      subtitle={copy.subtitle}
      dirty={groupChanged(group, draft, state.saved)}
      saved={Boolean(done[group])}
      saving={saving === group}
      error={failure[group] || ''}
      canEdit={owner}
      onSave={() => submit(group)}
      onUndo={() => undo(group)}
    >
      {fields}
    </SettingsCard>
  );
  const disabled = readOnly || Boolean(saving);
  const previewBusiness = business && (business.companyName || business.name) ? business : SAMPLE_BUSINESS;

  return (
    <>
      {readOnly ? <p className="nl-settings-note">{T.ownerNote}</p> : null}
      {card(
        'look',
        T.look,
        <>
          <LogoChoice value={draft.logo} onChange={set('logo')} upload={upload} disabled={disabled} />
          <AccentChoice value={draft.accent} onChange={set('accent')} disabled={disabled} />
        </>
      )}
      {card(
        'words',
        T.words,
        <>
          <Field id="brand-tagline" label={T.words.tagline} helper={T.words.taglineHelper} value={draft.tagline} onChange={set('tagline')} error={errors.tagline} readOnly={disabled} maxLength={LIMITS.tagline + 20} className="is-wide" />
          <Field id="brand-footer" label={T.words.footer} helper={T.words.footerHelper} value={draft.footer} onChange={set('footer')} error={errors.footer} readOnly={disabled} maxLength={LIMITS.footer + 20} className="is-wide" />
          <Field id="brand-social" label={T.words.social} helper={T.words.socialHelper} value={draft.social} onChange={set('social')} error={errors.social} readOnly={disabled} />
          <Field id="brand-website" label={T.words.website} helper={T.words.websiteHelper} value={draft.website} onChange={set('website')} error={errors.website} readOnly={disabled} inputMode="url" />
        </>
      )}
      {card('style', T.style, <StyleChoice value={draft.style} onChange={set('style')} disabled={disabled} />)}
      <Card title={T.preview.title} subtitle={T.preview.subtitle}>
        <div className="nl-brand-preview" data-style={draft.style}>
          <Receipt receipt={T.sample} brand={tidied(draft, GROUPS.look.concat(GROUPS.words))} business={previewBusiness} style={draft.style} pageSize={false} />
        </div>
        <p className="nl-settings-hint">{T.preview.note}</p>
      </Card>
    </>
  );
};

export default BrandSection;
