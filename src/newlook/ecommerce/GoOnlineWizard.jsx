import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getEcommerceProducts } from '../../api/ecommerceApi';
import { setItemsOnline } from '../../api/onlineStoreApi';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import fill from '../labels/fill';
import S from './strings.ecommerce';
import { shopLink } from './shareModel';
import { firstOpenStep, isSimpleDelivery, stepProblems, WIZARD_DELIVERY_MODES, WIZARD_STEPS } from './wizardModel';

const W = S.wizard;
const T = S.store;
const PAGE = 100;
const PRODUCTS_TAB = '/ecommerce?tab=products';
const QR_SIZE = 160;

/** Every product of the business, shown in the online store, in as many calls as it takes. Resolves with how many. */
export const showAllProducts = async ({ company, warehouse }) => {
  const codes = [];
  for (let page = 1; ; page += 1) {
    const result = await getEcommerceProducts({ company, warehouse, visibility: 'all', page, pageSize: PAGE });
    result.rows.forEach((row) => codes.push(row.item_code));
    if (!result.rows.length || codes.length >= result.total) break;
  }
  for (let i = 0; i < codes.length; i += PAGE) {
    await setItemsOnline({ itemCodes: codes.slice(i, i + PAGE), show: true, company });
  }
  return codes.length;
};

/**
 * "Go online": a short guided path through the My online store settings, one question at a time, ending with the store open and
 * its link ready to share. It works on the page's own form, so nothing is entered twice, and nothing is saved until the last step.
 */
const GoOnlineWizard = ({ open, onClose, form, set, saved, slugCheck, extra, company, link, onOpenStore, onProductsShown, onCopy, onShare }) => {
  const context = useMemo(() => ({ form, slugCheck, saved, productCount: extra.productCount, mpesaReady: extra.mpesaReady }), [form, slugCheck, saved, extra]);
  const [index, setIndex] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState(false);

  // Start where the owner left off: the first step that still needs something
  useEffect(() => {
    if (!open) return;
    setIndex(WIZARD_STEPS.indexOf(firstOpenStep(context)));
    setAttempted(false);
    setMessage('');
    setOpened(false);
    // Only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const step = WIZARD_STEPS[index];
  const problems = stepProblems(step, context);
  const shown = (key) => (attempted && problems[key] ? W[problems[key]] : undefined);
  const last = index === WIZARD_STEPS.length - 1;

  const next = () => {
    setAttempted(true);
    setMessage('');
    if (Object.keys(problems).length) return;
    setAttempted(false);
    setIndex(index + 1);
  };
  const back = () => {
    setAttempted(false);
    setMessage('');
    setIndex(Math.max(0, index - 1));
  };

  const showAll = async () => {
    setWorking(true);
    setMessage('');
    try {
      const count = await showAllProducts({ company, warehouse: form.warehouse });
      onProductsShown(count);
      setMessage(fill(W.showedAll, { count }));
    } catch (error) {
      setMessage(error.message || W.showAllFailed);
    } finally {
      setWorking(false);
    }
  };

  const openStore = async () => {
    setWorking(true);
    setMessage('');
    const ok = await onOpenStore();
    setWorking(false);
    if (ok) setOpened(true);
    else setMessage(W.openFailed);
  };

  if (opened) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={W.openedTitle}
        description={W.openedIntro}
        closeLabel={W.close}
        footer={<Button onClick={onClose}>{W.done}</Button>}
      >
        <div className="nl-wizard">
          <span className="nl-label">{T.link}</span>
          <div className="nl-ecommerce__share-box">
            <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{link}</span>
            <Button variant="secondary" size="small" onClick={onCopy}>
              {T.copy}
            </Button>
            <Button variant="secondary" size="small" icon="globe" onClick={onShare}>
              {T.shareWhatsApp}
            </Button>
          </div>
          <QRCodeSVG value={link} size={QR_SIZE} level="M" includeMargin role="img" aria-label={T.qrLabel} />
        </div>
      </Dialog>
    );
  }

  const modeOptions = WIZARD_DELIVERY_MODES.map((value) => ({ value, label: T.modes[value] }));

  return (
    <Dialog
      open
      onClose={onClose}
      busy={working}
      title={`${W.title}: ${W.stepNames[step]}`}
      description={fill(W.stepOf, { step: index + 1, total: WIZARD_STEPS.length })}
      closeLabel={W.cancel}
      footer={
        <>
          {index > 0 ? (
            <Button variant="secondary" disabled={working} onClick={back}>
              {W.back}
            </Button>
          ) : null}
          {last ? (
            <Button loading={working} onClick={openStore}>
              {working ? W.opening : W.openStore}
            </Button>
          ) : (
            <Button disabled={working} onClick={next}>
              {W.next}
            </Button>
          )}
        </>
      }
    >
      <div className="nl-wizard">
        {step === 'name' ? (
          <>
            <p className="nl-store__help">{W.nameIntro}</p>
            <Field label={T.storeName} value={form.store_name} error={shown('store_name')} onChange={(store_name) => set({ store_name })} data-autofocus />
            <Field
              label={T.slug}
              helper={slugCheck.state === 'checking' ? T.slugChecking : slugCheck.state === 'free' ? T.slugFree : T.slugHelp}
              error={shown('slug') || (slugCheck.state === 'taken' ? slugCheck.message : undefined)}
              value={form.slug}
              onChange={(value) => set({ slug: value.toLowerCase() })}
              autoComplete="off"
            />
            <Field label={T.whatsapp} helper={T.whatsappHelp} value={form.whatsapp_number} onChange={(whatsapp_number) => set({ whatsapp_number })} inputMode="tel" />
          </>
        ) : null}

        {step === 'receive' ? (
          <>
            <p className="nl-store__help">{W.receiveIntro}</p>
            <Checkbox label={T.delivery} checked={form.delivery_enabled} onChange={(delivery_enabled) => set({ delivery_enabled })} />
            <Checkbox label={T.pickup} checked={form.pickup_enabled} onChange={(pickup_enabled) => set({ pickup_enabled })} />
            {shown('receive') ? (
              <p className="nl-store__help" role="alert">
                {shown('receive')}
              </p>
            ) : null}
            {form.pickup_enabled ? (
              <Field label={T.pickupAddress} value={form.pickup_address} error={shown('pickup_address')} onChange={(pickup_address) => set({ pickup_address })} />
            ) : null}
            {form.delivery_enabled ? (
              isSimpleDelivery(form.delivery_mode) ? (
                <>
                  <Segmented label={T.mode} options={modeOptions} value={form.delivery_mode} onChange={(delivery_mode) => set({ delivery_mode })} />
                  {form.delivery_mode === 'flat' ? (
                    <Field label={T.flatFee} kind="money" value={form.delivery_flat_fee} error={shown('delivery_flat_fee')} onChange={(delivery_flat_fee) => set({ delivery_flat_fee })} />
                  ) : null}
                  <p className="nl-store__help">{W.simpleFeesNote}</p>
                </>
              ) : (
                <p className="nl-store__help">{fill(W.keepFees, { mode: T.modes[form.delivery_mode].toLowerCase() })}</p>
              )
            ) : null}
          </>
        ) : null}

        {step === 'pay' ? (
          <>
            <p className="nl-store__help">{W.payIntro}</p>
            <Checkbox label={T.cash} checked={form.accept_cash} onChange={(accept_cash) => set({ accept_cash })} />
            <p className="nl-store__help">{T.cashHelp}</p>
            <Checkbox label={T.mpesa} checked={form.accept_mpesa} disabled={!extra.mpesaReady && !form.accept_mpesa} onChange={(accept_mpesa) => set({ accept_mpesa })} />
            <p className="nl-store__help">{extra.mpesaReady ? T.mpesaHelp : T.mpesaNotReady}</p>
            {shown('pay') ? (
              <p className="nl-store__help" role="alert">
                {shown('pay')}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'products' ? (
          <>
            <p className="nl-store__help">{W.productsIntro}</p>
            <p role="status">{extra.productCount > 0 ? fill(W.productsHave, { count: extra.productCount }) : W.productsNone}</p>
            <div>
              <Button variant="secondary" loading={working} onClick={showAll}>
                {working ? W.showingAll : W.showAll}
              </Button>
            </div>
            <p className="nl-store__help">
              <Link to={PRODUCTS_TAB}>{W.chooseThem}</Link>
            </p>
            {message ? (
              <p className="nl-store__help" role="status">
                {message}
              </p>
            ) : null}
            {shown('products') ? (
              <p className="nl-store__help" role="alert">
                {shown('products')}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'open' ? (
          <>
            <p className="nl-store__help">{W.openIntro}</p>
            <dl className="nl-wizard__summary">
              <div>
                <dt>{T.storeName}</dt>
                <dd>{form.store_name}</dd>
              </div>
              <div>
                <dt>{T.link}</dt>
                <dd>{shopLink(form.slug.trim().toLowerCase())}</dd>
              </div>
            </dl>
            {message ? (
              <p className="nl-store__help" role="alert">
                {message}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
};

export default GoOnlineWizard;
