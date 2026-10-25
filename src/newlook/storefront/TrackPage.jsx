import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ShopNotFoundError, payForOrder, trackOrder } from '../../api/storefrontApi';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import Frame from './Frame';
import { recallOrder } from './orderMemory';
import useLanguage from './useLanguage';

const REFRESH_MS = 20000;
const COPIED_MS = 3000;
const STEPS = ['New', 'Confirmed', 'Ready', 'Delivered'];
const FINISHED = ['Delivered', 'Cancelled'];

/** Where the shopper's order is. Opened from the link they were given, so it needs no sign-in and shows nothing personal. */
const TrackPage = () => {
  const { token } = useParams();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const fresh = location.state?.fresh || null;
  const memory = recallOrder(token);

  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [paying, setPaying] = useState(false);
  const [promptMessage, setPromptMessage] = useState(
    fresh?.prompt ? (fresh.prompt.sent ? t('promptSent') : fresh.prompt.message || t('promptNotSent')) : ''
  );
  const [copied, setCopied] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const result = await trackOrder(token);
      if (id !== latest.current) return;
      setOrder(result);
      setState('ready');
    } catch (error) {
      if (id !== latest.current) return;
      // A refresh that fails keeps showing what was last known
      setState((current) => (current === 'ready' ? 'ready' : error instanceof ShopNotFoundError ? 'missing' : 'error'));
    }
  }, [token]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  // Keep the page current while the order is on its way, but not while nobody is looking at it
  const finished = order && FINISHED.includes(order.status);
  useEffect(() => {
    if (state !== 'ready' || finished) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [state, finished, load]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const sendPrompt = async () => {
    setPaying(true);
    try {
      const result = await payForOrder(token);
      setPromptMessage(result.paid ? t('paid') : result.sent ? t('promptSent') : result.message || t('promptNotSent'));
      if (result.paid) load();
    } catch (error) {
      setPromptMessage(error.message || t('promptNotSent'));
    } finally {
      setPaying(false);
    }
  };

  const copyLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => setCopied(true), () => {});
    }
  };

  const frame = { t, language, onLanguage: setLanguage };

  if (state === 'loading') {
    return (
      <Frame {...frame} title={t('trackTitle')}>
        <div className="sf-track" aria-busy="true">
          <Skeleton height="120px" radius="var(--radius-card)" />
        </div>
      </Frame>
    );
  }

  if (state !== 'ready') {
    const missing = state === 'missing';
    return (
      <Frame {...frame} title={t('trackTitle')}>
        <EmptyState
          icon={missing ? 'search' : 'alert'}
          tone={missing ? 'neutral' : 'error'}
          title={t(missing ? 'orderNotFound' : 'loadFailed')}
          description={missing ? t('orderNotFoundHelp') : undefined}
          action={missing ? undefined : { label: t('retry'), onClick: load }}
        />
      </Frame>
    );
  }

  const cancelled = order.status === 'Cancelled';
  const reached = STEPS.indexOf(order.status);
  const owesMpesa = memory?.payment === 'mpesa' && !order.paid && !finished;

  return (
    <Frame {...frame} title={order.shop || t('trackTitle')}>
      <div className="sf-track">
        <div className="sf-track__head">
          <span className="sf-track__icon" aria-hidden="true">
            <Icon name={cancelled ? 'alert' : 'check'} />
          </span>
          <div>
            <h2 className="sf-title">{fresh ? t('thanks') : t('trackTitle')}</h2>
            <p className="sf-note">{t('orderNumber', { order: order.order })}</p>
          </div>
        </div>

        <Card title={t('statusLabel')} level={3}>
          {cancelled ? (
            <p className="sf-status sf-status--bad">{t('status_Cancelled')}</p>
          ) : (
            <ol className="sf-steps" aria-label={t('statusLabel')}>
              {STEPS.map((step, i) => (
                <li key={step} className={['sf-step', i <= reached && 'is-done', i === reached && 'is-current'].filter(Boolean).join(' ')} aria-current={i === reached ? 'step' : undefined}>
                  <span className="sf-step__dot" aria-hidden="true" />
                  <span>{t(`status_${step}`)}</span>
                </li>
              ))}
            </ol>
          )}
          <dl className="sf-summary">
            <div>
              <dt>{t('orderTotal')}</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
            <div>
              <dt>{order.deliveryMethod === 'Pickup' ? t('pickup') : t('delivery')}</dt>
              <dd>{order.deliveryMethod === 'Pickup' ? t('receivePickup') : t('receiveDelivery')}</dd>
            </div>
            <div>
              <dt>{order.paid ? t('paid') : t('notPaid')}</dt>
              <dd>{!order.paid && memory?.payment === 'cash' ? t('payOnDelivery') : ''}</dd>
            </div>
          </dl>
          {promptMessage ? (
            <p className="sf-note" role="status">
              {promptMessage}
            </p>
          ) : null}
          <div className="sf-actions">
            {owesMpesa ? (
              <Button loading={paying} onClick={sendPrompt}>
                {t('payNow')}
              </Button>
            ) : null}
            {memory?.whatsappLink && !finished ? (
              <Button as="a" variant="secondary" href={memory.whatsappLink} target="_blank" rel="noopener noreferrer">
                {t('confirmWhatsApp')}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={load}>
              {t('refresh')}
            </Button>
          </div>
        </Card>

        <Card level={3}>
          <p className="sf-note">{t('keepThisPage')}</p>
          <div className="sf-actions">
            <Button variant="secondary" size="small" onClick={copyLink}>
              {copied ? t('copied') : t('copyLink')}
            </Button>
          </div>
          {!finished ? <p className="sf-note">{t('updatedAuto')}</p> : null}
        </Card>
      </div>
    </Frame>
  );
};

export default TrackPage;
