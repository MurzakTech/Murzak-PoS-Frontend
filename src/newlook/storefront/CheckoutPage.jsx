import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { placeOrder, quoteDelivery } from '../../api/storefrontApi';
import { isValidKenyanMobile } from '../../utils/phone';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { formatMoney } from '../components/format';
import { emptyCart, orderLines, saveCart } from './cart';
import Frame from './Frame';
import { rememberOrder } from './orderMemory';
import { logoUrl } from './shopMeta';
import { useShop } from './ShopProvider';

const LOCATION_TIMEOUT_MS = 15000;
// About one metre; more digits would only pretend to be more exact than a phone can be
const roundPlace = (n) => Math.round(n * 100000) / 100000;

/** Who you are, how you want it, how you pay; then the shop's fee for getting it to you, and the order. */
const CheckoutPage = () => {
  const { slug, shop, status, t, language, setLanguage, cart, dispatch, subtotal } = useShop();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [place, setPlace] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const delivery = shop?.delivery || { mode: 'free', areas: [] };
  const mode = delivery.mode;

  // Start on delivery when the shop delivers, and on the first way to pay the shop accepts
  useEffect(() => {
    if (!shop) return;
    setMethod((current) => current || (shop.delivery_enabled ? 'Delivery' : shop.pickup_enabled ? 'Pickup' : ''));
    setPayment((current) => current || (shop.payment_options || [])[0] || '');
  }, [shop]);

  const lines = useMemo(() => orderLines(cart), [cart]);
  const basketKey = JSON.stringify(lines);

  // Ask the shop what delivery costs whenever what it depends on changes
  const ready = method === 'Delivery' && ((mode === 'area' && area) || (mode === 'distance' && place) || mode === 'flat');
  const asked = useRef(0);
  useEffect(() => {
    if (!ready || !lines.length) {
      setQuote(null);
      setQuoteError('');
      setQuoting(false);
      return undefined;
    }
    const id = ++asked.current;
    setQuoting(true);
    setQuoteError('');
    quoteDelivery({ slug, lines, area: mode === 'area' ? area : undefined, latitude: place?.latitude, longitude: place?.longitude })
      .then((result) => {
        if (id === asked.current) setQuote(result);
      })
      .catch((error) => {
        if (id !== asked.current) return;
        setQuote(null);
        setQuoteError(error.message);
      })
      .finally(() => {
        if (id === asked.current) setQuoting(false);
      });
    return () => {
      asked.current += 1;
    };
    // The basket is compared by its contents (basketKey), not by identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, slug, area, place, mode, basketKey]);

  if (status === 'loading' || !shop) {
    return (
      <Frame t={t} language={language} onLanguage={setLanguage} title={t(status === 'loading' ? 'loading' : 'shop')}>
        {status === 'closed' || status === 'error' ? (
          <EmptyState icon="store" title={t(status === 'closed' ? 'closedTitle' : 'loadFailed')} />
        ) : null}
      </Frame>
    );
  }

  const homeTo = `/shop/${slug}`;
  const frameProps = { t, language, onLanguage: setLanguage, title: shop.store_name, homeTo, logo: logoUrl(shop.logo) };

  if (cart.lines.length === 0) {
    return (
      <Frame {...frameProps}>
        <EmptyState icon="inbox" title={t('basketEmpty')} description={t('basketEmptyHelp')} action={{ label: t('backToShop'), onClick: () => navigate(homeTo) }} />
      </Frame>
    );
  }

  const minimum = Number(shop.minimum_order) || 0;
  const belowMinimum = minimum > subtotal;
  const needsFee = method === 'Delivery' && mode !== 'free';
  const fee = needsFee && quote?.deliverable ? quote.fee : 0;
  const total = subtotal + fee;

  const problems = {};
  if (name.trim().length < 2) problems.name = 'needName';
  if (!isValidKenyanMobile(phone)) problems.phone = 'needPhone';
  if (!method) problems.method = 'needMethod';
  if (method === 'Delivery') {
    if (mode === 'area' && !area) problems.area = 'needArea';
    if (mode === 'distance' && !place) problems.place = 'locationNeeded';
    if (address.trim().length < 5) problems.address = 'needAddress';
  }
  if (!payment) problems.payment = 'needPayment';
  const feeReady = !needsFee || (quote && quote.deliverable && !quoting);
  const shown = (key) => (attempted && problems[key] ? t(problems[key]) : undefined);

  const shareLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError(t('locationFailed'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setPlace({ latitude: roundPlace(position.coords.latitude), longitude: roundPlace(position.coords.longitude) });
      },
      () => {
        setLocating(false);
        setLocationError(t('locationFailed'));
      },
      { timeout: LOCATION_TIMEOUT_MS, maximumAge: 60000 }
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setAttempted(true);
    setSubmitError('');
    if (Object.keys(problems).length || !feeReady || belowMinimum) return;
    setSubmitting(true);
    try {
      const order = await placeOrder({
        slug,
        customerName: name.trim(),
        phone,
        lines,
        deliveryMethod: method,
        payment,
        address: method === 'Delivery' ? address.trim() : undefined,
        notes: notes.trim() || undefined,
        area: method === 'Delivery' && mode === 'area' ? area : undefined,
        latitude: method === 'Delivery' && mode === 'distance' ? place?.latitude : undefined,
        longitude: method === 'Delivery' && mode === 'distance' ? place?.longitude : undefined,
      });
      rememberOrder(order.token, { payment, whatsappLink: order.whatsappLink });
      // Emptied in storage right now, not left to the usual save: this page closes at once, and a basket left behind would
      // come back on the shopper's next visit and invite them to order the same things twice
      saveCart(slug, emptyCart());
      dispatch({ type: 'clear' });
      navigate(`/track/${order.token}`, { replace: true, state: { fresh: { order: order.order, prompt: order.paymentPrompt } } });
    } catch (error) {
      setSubmitError(error.message);
      setSubmitting(false);
    }
  };

  const methodOptions = [
    shop.delivery_enabled && { value: 'Delivery', label: t('delivery') },
    shop.pickup_enabled && { value: 'Pickup', label: t('pickup') },
  ].filter(Boolean);
  const payOptions = (shop.payment_options || []).map((p) => ({ value: p, label: t(p === 'mpesa' ? 'payMpesa' : 'payCash') }));
  const areaOptions = (delivery.areas || []).map((a) => ({ value: a.name, label: t('areaFee', { name: a.name, amount: formatMoney(a.fee) }) }));

  return (
    <Frame {...frameProps}>
      <form className="sf-checkout" onSubmit={submit} noValidate>
        <div className="sf-checkout__back">
          <Button as={Link} to={homeTo} variant="ghost" size="small" icon="chevronLeft">
            {t('backToShop')}
          </Button>
        </div>
        <h2 className="sf-title">{t('checkoutTitle')}</h2>

        <Card title={t('yourDetails')} level={3}>
          <div className="sf-fields">
            <Field label={t('name')} value={name} onChange={setName} error={shown('name')} autoComplete="name" />
            <Field
              label={t('phone')}
              helper={t('phoneHelp')}
              value={phone}
              onChange={setPhone}
              error={shown('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </Card>

        <Card title={t('howToReceive')} level={3}>
          <div className="sf-fields">
            <Segmented label={t('howToReceive')} options={methodOptions} value={method} onChange={setMethod} />
            {method === 'Pickup' && shop.pickup_address ? <p className="sf-note">{t('pickupAt', { address: shop.pickup_address })}</p> : null}
            {method === 'Delivery' ? (
              <>
                {mode === 'area' ? (
                  <Select label={t('area')} placeholder={t('chooseArea')} options={areaOptions} value={area} onChange={setArea} error={shown('area')} />
                ) : null}
                {mode === 'distance' ? (
                  <div className="sf-location">
                    <Button variant="secondary" icon="globe" loading={locating} onClick={shareLocation}>
                      {locating ? t('locating') : place ? t('locationShared') : t('useLocation')}
                    </Button>
                    {locationError ? (
                      <p className="sf-note sf-note--bad" role="alert">
                        {locationError}
                      </p>
                    ) : null}
                    {shown('place') ? (
                      <p className="sf-note sf-note--bad" role="alert">
                        {shown('place')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <Field label={t('address')} helper={t('addressHelp')} value={address} onChange={setAddress} error={shown('address')} autoComplete="street-address" />
                {shop.delivery_note ? <p className="sf-note">{shop.delivery_note}</p> : null}
                {delivery.free_above ? <p className="sf-note">{t('freeAbove', { amount: formatMoney(delivery.free_above) })}</p> : null}
                {mode === 'distance' && delivery.longest_distance_km ? <p className="sf-note">{t('upToKm', { km: delivery.longest_distance_km })}</p> : null}
              </>
            ) : null}
            {attempted && problems.method ? (
              <p className="sf-note sf-note--bad" role="alert">
                {t(problems.method)}
              </p>
            ) : null}
          </div>
        </Card>

        <Card title={t('howToPay')} level={3}>
          <div className="sf-fields">
            <div role="radiogroup" aria-label={t('howToPay')} className="sf-choices">
              {payOptions.map((option) => (
                <label key={option.value} className={['sf-choice', payment === option.value && 'is-on'].filter(Boolean).join(' ')}>
                  <input type="radio" name="payment" value={option.value} checked={payment === option.value} onChange={() => setPayment(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <Field label={t('notes')} value={notes} onChange={setNotes} maxLength={500} />
          </div>
        </Card>

        <Card title={t('summary')} level={3}>
          <dl className="sf-summary">
            <div>
              <dt>{t('goods')}</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            {method === 'Delivery' ? (
              <div>
                <dt>{t('deliveryFee')}</dt>
                <dd>
                  {mode === 'free'
                    ? t('deliveryFree')
                    : quoting
                      ? t('calculating')
                      : quote?.deliverable
                        ? quote.fee === 0
                          ? t('deliveryFree')
                          : formatMoney(quote.fee)
                        : t('deliveryPending')}
                </dd>
              </div>
            ) : null}
            <div className="sf-summary__total">
              <dt>{t('grandTotal')}</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
          {quote && !quote.deliverable ? (
            <p className="sf-note sf-note--bad" role="alert">
              {quote.message || t('notDeliverable')}
            </p>
          ) : null}
          {quoteError ? (
            <p className="sf-note sf-note--bad" role="alert">
              {quoteError}
            </p>
          ) : null}
          {belowMinimum ? (
            <p className="sf-note sf-note--warn" role="status">
              {t('minimumNotMet', { amount: formatMoney(minimum - subtotal) })}
            </p>
          ) : null}
          <p className="sf-note">{t('priceNote')}</p>
          {submitError ? (
            <p className="sf-note sf-note--bad" role="alert">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" size="till" loading={submitting} disabled={submitting} className="sf-submit">
            {submitting ? t('placing') : t('placeOrder')}
          </Button>
        </Card>
      </form>
    </Frame>
  );
};

export default CheckoutPage;
