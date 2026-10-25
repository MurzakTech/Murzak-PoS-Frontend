import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkStoreSlug, getOnlineStore, saveOnlineStore } from '../../api/onlineStoreApi';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import S from './strings.ecommerce';

const T = S.store;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const SLUG_PAUSE_MS = 400;
const MAX_AREAS = 50;
const MODE_ORDER = ['free', 'flat', 'area', 'distance'];
const LOCATION_TIMEOUT_MS = 15000;
const PRODUCTS_TAB = '/ecommerce?tab=products';

// Whole shillings in the form (the money field takes digits only), as text
const money = (value) => (Number(value) > 0 ? String(Math.round(Number(value))) : '');
const text = (value) => (value === null || value === undefined ? '' : String(value));
const number = (value) => (value === '' || value === null || value === undefined ? 0 : Number(value));

/** The server's settings as the form holds them. */
const toForm = (d) => ({
  enabled: Boolean(d.enabled),
  slug: text(d.slug),
  store_name: text(d.store_name),
  tagline: text(d.tagline),
  whatsapp_number: text(d.whatsapp_number),
  minimum_order: money(d.minimum_order),
  warehouse: text(d.warehouse),
  delivery_enabled: d.delivery_enabled !== false,
  pickup_enabled: d.pickup_enabled !== false,
  pickup_address: text(d.pickup_address),
  delivery_note: text(d.delivery_note),
  delivery_mode: MODE_ORDER.includes(d.delivery_mode) ? d.delivery_mode : 'free',
  delivery_flat_fee: money(d.delivery_flat_fee),
  delivery_areas: (d.delivery_areas || []).map((a) => ({ name: text(a.name), fee: money(a.fee) })),
  free_delivery_above: money(d.free_delivery_above),
  shop_latitude: text(d.shop_latitude),
  shop_longitude: text(d.shop_longitude),
  distance_base_km: text(d.distance_base_km || ''),
  distance_base_fee: money(d.distance_base_fee),
  distance_per_km: money(d.distance_per_km),
  distance_max_km: text(d.distance_max_km || ''),
  road_factor: text(d.road_factor || '1.3'),
  accept_cash: d.accept_cash !== false,
  accept_mpesa: Boolean(d.accept_mpesa),
});

/** The form as the server wants it. Numbers are numbers; an empty shop location is null. */
const toPayload = (f) => ({
  enabled: f.enabled ? 1 : 0,
  slug: f.slug.trim().toLowerCase(),
  store_name: f.store_name.trim(),
  tagline: f.tagline.trim(),
  whatsapp_number: f.whatsapp_number.trim(),
  minimum_order: number(f.minimum_order),
  warehouse: f.warehouse,
  delivery_enabled: f.delivery_enabled ? 1 : 0,
  pickup_enabled: f.pickup_enabled ? 1 : 0,
  pickup_address: f.pickup_address.trim(),
  delivery_note: f.delivery_note.trim(),
  delivery_mode: f.delivery_mode,
  delivery_flat_fee: number(f.delivery_flat_fee),
  delivery_areas: f.delivery_areas.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), fee: number(a.fee) })),
  free_delivery_above: number(f.free_delivery_above),
  shop_latitude: f.shop_latitude.trim() === '' ? null : f.shop_latitude.trim(),
  shop_longitude: f.shop_longitude.trim() === '' ? null : f.shop_longitude.trim(),
  distance_base_km: number(f.distance_base_km),
  distance_base_fee: number(f.distance_base_fee),
  distance_per_km: number(f.distance_per_km),
  distance_max_km: number(f.distance_max_km),
  road_factor: number(f.road_factor) || 1.3,
  accept_cash: f.accept_cash ? 1 : 0,
  accept_mpesa: f.accept_mpesa ? 1 : 0,
});

const OnlineStoreTab = ({ company, locations = [] }) => {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState({ slug: '', enabled: false });
  const [extra, setExtra] = useState({ mpesaReady: false, productCount: 0 });
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugCheck, setSlugCheck] = useState({ state: 'idle', message: '' });
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const data = await getOnlineStore(company);
      setForm(toForm(data));
      setSaved({ slug: data.slug || '', enabled: Boolean(data.enabled) });
      setExtra({ mpesaReady: Boolean(data.mpesa_ready), productCount: data.product_count || 0 });
    } catch (error) {
      setFailed(true);
    }
  }, [company]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  // Ask whether the name is free while the owner types, after a short pause
  const slug = form?.slug.trim().toLowerCase() || '';
  useEffect(() => {
    if (!form || !slug || slug === saved.slug || !SLUG_PATTERN.test(slug)) {
      setSlugCheck({ state: 'idle', message: '' });
      return undefined;
    }
    let current = true;
    setSlugCheck({ state: 'checking', message: '' });
    const timer = setTimeout(() => {
      checkStoreSlug({ slug, company })
        .then((result) => {
          if (current) setSlugCheck(result.available ? { state: 'free', message: '' } : { state: 'taken', message: result.message });
        })
        .catch(() => {
          if (current) setSlugCheck({ state: 'idle', message: '' });
        });
    }, SLUG_PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // Only the typed name matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, saved.slug, company, Boolean(form)]);

  const link = useMemo(() => (saved.slug ? `${window.location.origin}/shop/${saved.slug}` : ''), [saved.slug]);

  const save = async () => {
    setSaving(true);
    try {
      await saveOnlineStore(toPayload(form), company);
      toast.success(T.saved);
      await load();
    } catch (error) {
      toast.error(error.message || T.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(() => toast.success(T.copied), () => {});
  };
  const shareLink = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(fill(T.shareText, { link }))}`, '_blank', 'noopener,noreferrer');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(T.locationFailed);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        set({ shop_latitude: position.coords.latitude.toFixed(6), shop_longitude: position.coords.longitude.toFixed(6) });
      },
      () => {
        setLocating(false);
        toast.error(T.locationFailed);
      },
      { timeout: LOCATION_TIMEOUT_MS }
    );
  };

  const setArea = (index, patch) => set({ delivery_areas: form.delivery_areas.map((a, i) => (i === index ? { ...a, ...patch } : a)) });

  if (failed) {
    return (
      <Card title={T.title}>
        <p role="alert">{T.loadFailed}</p>
        <Button variant="secondary" onClick={load}>
          {S.orders.refresh}
        </Button>
      </Card>
    );
  }
  if (!form) {
    return (
      <Card title={T.title} aria-busy="true">
        <Skeleton height="var(--space-8)" />
      </Card>
    );
  }

  const slugError = slugCheck.state === 'taken' ? slugCheck.message : undefined;
  const slugHelper = slugCheck.state === 'checking' ? T.slugChecking : slugCheck.state === 'free' ? T.slugFree : T.slugHelp;
  const modeOptions = MODE_ORDER.map((value) => ({ value, label: T.modes[value] }));
  const locationOptions = locations.map((l) => ({ value: l.value, label: l.label }));

  return (
    <div className="nl-store">
      <Card title={T.title} subtitle={T.intro}>
        <div className="nl-store__section">
          <h3 className="nl-store__heading">{T.addressTitle}</h3>
          <Checkbox label={T.open} checked={form.enabled} onChange={(enabled) => set({ enabled })} />
          <p className="nl-store__help">{T.openHelp}</p>
          <div className="nl-ecommerce__form-grid">
            <Field label={T.slug} helper={slugHelper} error={slugError} value={form.slug} onChange={(value) => set({ slug: value.toLowerCase() })} autoComplete="off" />
            <Field label={T.storeName} value={form.store_name} onChange={(store_name) => set({ store_name })} />
            <Field label={T.tagline} value={form.tagline} onChange={(tagline) => set({ tagline })} />
            <Field label={T.whatsapp} helper={T.whatsappHelp} value={form.whatsapp_number} onChange={(whatsapp_number) => set({ whatsapp_number })} inputMode="tel" />
            <Field label={T.minimum} helper={T.minimumHelp} kind="money" value={form.minimum_order} onChange={(minimum_order) => set({ minimum_order })} />
            {locationOptions.length ? (
              <Select
                label={T.stockLocation}
                helper={T.stockLocationHelp}
                placeholder={T.stockLocationPlaceholder}
                options={locationOptions}
                value={form.warehouse}
                onChange={(warehouse) => set({ warehouse })}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <Card title={T.receiveTitle}>
        <div className="nl-store__section">
          <Checkbox label={T.delivery} checked={form.delivery_enabled} onChange={(delivery_enabled) => set({ delivery_enabled })} />
          <p className="nl-store__help">{T.deliveryHelp}</p>
          <Checkbox label={T.pickup} checked={form.pickup_enabled} onChange={(pickup_enabled) => set({ pickup_enabled })} />
          <p className="nl-store__help">{T.pickupHelp}</p>
          <div className="nl-ecommerce__form-grid">
            {form.pickup_enabled ? <Field label={T.pickupAddress} value={form.pickup_address} onChange={(pickup_address) => set({ pickup_address })} /> : null}
            {form.delivery_enabled ? (
              <Field label={T.deliveryNote} helper={T.deliveryNoteHelp} value={form.delivery_note} onChange={(delivery_note) => set({ delivery_note })} />
            ) : null}
          </div>
        </div>
      </Card>

      {form.delivery_enabled ? (
        <Card title={T.feesTitle} subtitle={T.feesIntro}>
          <div className="nl-store__section">
            <Segmented label={T.mode} options={modeOptions} value={form.delivery_mode} onChange={(delivery_mode) => set({ delivery_mode })} />

            {form.delivery_mode === 'flat' ? (
              <div className="nl-ecommerce__form-grid">
                <Field label={T.flatFee} kind="money" value={form.delivery_flat_fee} onChange={(delivery_flat_fee) => set({ delivery_flat_fee })} />
              </div>
            ) : null}

            {form.delivery_mode === 'area' ? (
              <div className="nl-store__areas">
                <h4 className="nl-store__subheading">{T.areasTitle}</h4>
                <p className="nl-store__help">{T.areasHelp}</p>
                {form.delivery_areas.length === 0 ? <p className="nl-store__help">{T.noAreas}</p> : null}
                {form.delivery_areas.map((area, index) => (
                  // The rows have no id of their own; they are only ever added at the end or removed
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className="nl-store__area-row">
                    <Field label={T.areaName} value={area.name} onChange={(name) => setArea(index, { name })} />
                    <Field label={T.areaFee} kind="money" value={area.fee} onChange={(fee) => setArea(index, { fee })} />
                    <Button
                      variant="ghost"
                      size="small"
                      icon="x"
                      aria-label={fill(T.removeArea, { name: area.name || String(index + 1) })}
                      onClick={() => set({ delivery_areas: form.delivery_areas.filter((_a, i) => i !== index) })}
                    />
                  </div>
                ))}
                <div>
                  <Button
                    variant="secondary"
                    size="small"
                    icon="plus"
                    disabled={form.delivery_areas.length >= MAX_AREAS}
                    onClick={() => set({ delivery_areas: [...form.delivery_areas, { name: '', fee: '' }] })}
                  >
                    {T.addArea}
                  </Button>
                </div>
              </div>
            ) : null}

            {form.delivery_mode === 'distance' ? (
              <div className="nl-store__distance">
                <h4 className="nl-store__subheading">{T.shopLocation}</h4>
                <p className="nl-store__help">{T.shopLocationHelp}</p>
                <div className="nl-ecommerce__form-grid">
                  <Field label={T.latitude} value={form.shop_latitude} onChange={(shop_latitude) => set({ shop_latitude })} inputMode="decimal" />
                  <Field label={T.longitude} value={form.shop_longitude} onChange={(shop_longitude) => set({ shop_longitude })} inputMode="decimal" />
                </div>
                <div>
                  <Button variant="secondary" size="small" icon="globe" loading={locating} onClick={useMyLocation}>
                    {locating ? T.locating : T.useMyLocation}
                  </Button>
                </div>
                <div className="nl-ecommerce__form-grid">
                  <Field label={T.baseKm} value={form.distance_base_km} onChange={(distance_base_km) => set({ distance_base_km })} inputMode="decimal" />
                  <Field label={T.baseFee} kind="money" value={form.distance_base_fee} onChange={(distance_base_fee) => set({ distance_base_fee })} />
                  <Field label={T.perKm} kind="money" value={form.distance_per_km} onChange={(distance_per_km) => set({ distance_per_km })} />
                  <Field label={T.maxKm} value={form.distance_max_km} onChange={(distance_max_km) => set({ distance_max_km })} inputMode="decimal" />
                  <Field label={T.roadFactor} helper={T.roadFactorHelp} value={form.road_factor} onChange={(road_factor) => set({ road_factor })} inputMode="decimal" />
                </div>
                <p className="nl-store__help">{T.distanceNote}</p>
              </div>
            ) : null}

            {form.delivery_mode !== 'free' ? (
              <div className="nl-ecommerce__form-grid">
                <Field label={T.freeAbove} helper={T.freeAboveHelp} kind="money" value={form.free_delivery_above} onChange={(free_delivery_above) => set({ free_delivery_above })} />
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card title={T.paymentTitle}>
        <div className="nl-store__section">
          <Checkbox label={T.cash} checked={form.accept_cash} onChange={(accept_cash) => set({ accept_cash })} />
          <p className="nl-store__help">{T.cashHelp}</p>
          <Checkbox label={T.mpesa} checked={form.accept_mpesa} disabled={!extra.mpesaReady && !form.accept_mpesa} onChange={(accept_mpesa) => set({ accept_mpesa })} />
          <p className="nl-store__help">{extra.mpesaReady ? T.mpesaHelp : T.mpesaNotReady}</p>
        </div>
      </Card>

      <Card title={T.shareTitle}>
        <div className="nl-store__section">
          {link ? (
            <>
              <span className="nl-label">{T.link}</span>
              <div className="nl-ecommerce__share-box">
                <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{link}</span>
                <Button variant="secondary" size="small" onClick={copyLink}>
                  {T.copy}
                </Button>
                <Button variant="secondary" size="small" icon="globe" onClick={shareLink}>
                  {T.shareWhatsApp}
                </Button>
              </div>
              {!saved.enabled ? <p className="nl-store__help">{T.closedNote}</p> : null}
            </>
          ) : (
            <p className="nl-store__help">{T.saveFirst}</p>
          )}
          <p className="nl-store__help">
            {fill(T.productsShown, { count: extra.productCount })} <Link to={PRODUCTS_TAB}>{T.chooseProducts}</Link>
          </p>
        </div>
      </Card>

      <div className="nl-ecommerce__actions">
        <span />
        <Button variant="primary" loading={saving} onClick={save}>
          {T.save}
        </Button>
      </div>
    </div>
  );
};

export default OnlineStoreTab;
