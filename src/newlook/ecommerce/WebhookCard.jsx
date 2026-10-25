import React, { useState } from 'react';
import { getOrderWebhook, regenerateOrderWebhook } from '../../api/ecommerceApi';
import Button from '../components/Button';
import Card from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import Field from '../components/Field';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import S from './strings.ecommerce';

const T = S.webhook;

/**
 * How a business's WooCommerce website sends its orders here: an address and a secret to paste into WooCommerce once.
 * The connection is only made (on the server) when the owner asks to see it, so opening the page creates nothing.
 */
const WebhookCard = ({ company, lastOrderMessage, lastOrderAt }) => {
  const toast = useToast();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [asking, setAsking] = useState(false);

  const show = async (action, message) => {
    setLoading(true);
    try {
      setConnection(await action(company));
      setShowSecret(false);
      if (message) toast.success(message);
    } catch (error) {
      toast.error(error.message || T.loadFailed);
    } finally {
      setLoading(false);
      setAsking(false);
    }
  };

  const copy = (value) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => toast.success(T.copied), () => {});
  };

  return (
    <Card title={T.title} subtitle={T.intro}>
      {connection ? (
        <div className="nl-store__section">
          <div className="nl-store__copy-row">
            <Field label={T.address} value={connection.deliveryUrl} readOnly onChange={() => {}} />
            <Button variant="secondary" size="small" onClick={() => copy(connection.deliveryUrl)}>
              {T.copy}
            </Button>
          </div>
          <div className="nl-store__copy-row">
            <Field label={T.secret} value={connection.secret} readOnly type={showSecret ? 'text' : 'password'} onChange={() => {}} />
            <Button variant="ghost" size="small" onClick={() => setShowSecret((on) => !on)}>
              {showSecret ? T.hideSecret : T.showSecret}
            </Button>
            <Button variant="secondary" size="small" onClick={() => copy(connection.secret)}>
              {T.copy}
            </Button>
          </div>
          {connection.steps.length ? (
            <>
              <h4 className="nl-store__subheading">{T.steps}</h4>
              <ol className="nl-store__steps">
                {connection.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          ) : null}
          <div>
            <Button variant="ghost" size="small" onClick={() => setAsking(true)}>
              {T.regenerate}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" loading={loading} onClick={() => show(getOrderWebhook)}>
          {T.show}
        </Button>
      )}
      {lastOrderMessage ? (
        <p className="nl-store__help">
          {fill(T.lastOrder, { message: lastOrderMessage })}
          {lastOrderAt ? ` ${fill(T.lastOrderAt, { when: new Date(lastOrderAt).toLocaleString() })}` : ''}
        </p>
      ) : null}
      <ConfirmDialog
        open={asking}
        title={T.regenerateTitle}
        message={T.regenerateMessage}
        confirmLabel={T.regenerateConfirm}
        destructive
        loading={loading}
        onConfirm={() => show(regenerateOrderWebhook, T.regenerated)}
        onCancel={() => setAsking(false)}
      />
    </Card>
  );
};

export default WebhookCard;
