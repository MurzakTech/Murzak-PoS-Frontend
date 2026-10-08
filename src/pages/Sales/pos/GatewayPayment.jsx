import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CheckCircle, ContentCopy, OpenInNew, PhoneAndroid, QrCode2, Refresh, Sms } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import {
  cancelGatewayPayment,
  checkGatewayPayment,
  checkMpesaPayment,
  createGatewayCheckout,
  findMpesaPaymentByCode,
  listUnclaimedMpesaPayments,
  mpesaChargeAmount,
  normalizeKenyanPhone,
  sendMpesaPrompt,
} from '../../../api/paymentGatewayApi';
import { money } from './money';

const POLL_MS = 3000;
const GATEWAY_LABELS = { mpesa: 'M-Pesa', pesapal: 'Pesapal', paypal: 'PayPal', bank: 'Bank' };

/**
 * Collects one payment line through a gateway and reports it to the parent once it is
 * confirmed, as { confirmed, transactionId, reference, amount, label }.
 *
 * - mpesa:   send a prompt to the customer's phone, or match the code of a payment they made
 *            straight to the till
 * - pesapal / paypal: show a QR code the customer scans to pay on their phone
 * - bank:    record the transfer or deposit slip reference
 */
const GatewayPayment = ({ kind, option = {}, mode, amount, currency, company, saleReference, customerPhone, customerName, value, onChange }) => {
  if (value?.confirmed) {
    return <Confirmed value={value} currency={currency} onUndo={() => onChange(null)} />;
  }
  if (kind === 'mpesa') {
    return <MpesaCollect option={option} amount={amount} currency={currency} company={company} saleReference={saleReference} customerPhone={customerPhone} onChange={onChange} />;
  }
  if (kind === 'pesapal' || kind === 'paypal') {
    return <OnlineCollect kind={kind} option={option} mode={mode} amount={amount} currency={currency} company={company} saleReference={saleReference} customerPhone={customerPhone} customerName={customerName} onChange={onChange} />;
  }
  if (kind === 'bank') {
    return <BankReference mode={mode} amount={amount} currency={currency} onChange={onChange} />;
  }
  return null;
};

const Confirmed = ({ value, currency, onUndo }) => (
  <Alert
    severity="success"
    icon={<CheckCircle />}
    action={!value.transactionId ? <Button color="inherit" size="small" onClick={onUndo}>Change</Button> : null}
  >
    <b>{value.label}</b> {money(value.amount, currency)} received
    {value.reference ? <> &middot; ref <b>{value.reference}</b></> : null}. Press <b>Complete sale</b>.
  </Alert>
);

// Polls fn every POLL_MS while active; stops when fn returns true or on unmount.
const usePoll = (active, fn) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!active) return undefined;
    let stopped = false;
    let timer;
    const tick = async () => {
      if (stopped) return;
      let done = false;
      try {
        done = await fnRef.current();
      } catch (e) {
        done = false; // a failed check is retried on the next tick
      }
      if (!stopped && !done) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active]);
};

// ---------------------------------------------------------------------------
// M-Pesa
// ---------------------------------------------------------------------------

const MpesaCollect = ({ option, amount, currency, company, saleReference, customerPhone, onChange }) => {
  const canUseCode = Boolean(option.c2b_enabled || option.allow_manual_code);
  const [method, setMethod] = useState('prompt');
  return (
    <Stack spacing={1.5}>
      {canUseCode && (
        <ToggleButtonGroup exclusive size="small" value={method} onChange={(e, v) => v && setMethod(v)} fullWidth>
          <ToggleButton value="prompt"><PhoneAndroid fontSize="small" sx={{ mr: 1 }} />Send prompt to phone</ToggleButton>
          <ToggleButton value="code"><Sms fontSize="small" sx={{ mr: 1 }} />Customer already paid</ToggleButton>
        </ToggleButtonGroup>
      )}
      {method === 'prompt' ? (
        <MpesaPrompt amount={amount} currency={currency} company={company} saleReference={saleReference} customerPhone={customerPhone} onChange={onChange} />
      ) : (
        <MpesaCode option={option} amount={amount} currency={currency} company={company} onChange={onChange} />
      )}
    </Stack>
  );
};

const MpesaPrompt = ({ amount, currency, company, saleReference, customerPhone, onChange }) => {
  const [phone, setPhone] = useState(customerPhone || '');
  const [state, setState] = useState('idle'); // idle | sending | waiting | failed
  const [message, setMessage] = useState('');
  const [txn, setTxn] = useState(null);
  const charge = mpesaChargeAmount(amount);
  const normalized = normalizeKenyanPhone(phone);

  useEffect(() => {
    if (customerPhone && !phone) setPhone(customerPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

  const send = async () => {
    setState('sending');
    setMessage('');
    try {
      const res = await sendMpesaPrompt({ company, phoneNumber: normalized, amount: charge, reference: saleReference });
      setTxn(res.transaction);
      setState('waiting');
    } catch (e) {
      setMessage(e.message);
      setState('failed');
    }
  };

  usePoll(state === 'waiting' && txn?.transaction_id, async () => {
    const res = await checkMpesaPayment(txn.transaction_id);
    const t = res.transaction;
    if (t.status === 'Success') {
      onChange({ confirmed: true, transactionId: t.transaction_id, reference: t.mpesa_receipt_number, amount: Number(t.amount) || charge, label: 'M-Pesa' });
      return true;
    }
    if (t.status !== 'Pending') {
      setMessage(t.message || t.result_description || 'The payment did not go through.');
      setState('failed');
      return true;
    }
    return false;
  });

  return (
    <Stack spacing={1.5}>
      <TextField
        label="Customer's M-Pesa number"
        placeholder="0712 345 678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={state === 'sending' || state === 'waiting'}
        error={Boolean(phone) && !normalized}
        helperText={phone && !normalized ? 'Enter a Safaricom number such as 0712 345 678' : ' '}
        inputProps={{ inputMode: 'tel', autoComplete: 'off' }}
        sx={{ maxWidth: 360 }}
      />
      {state === 'waiting' ? (
        <Alert severity="info" icon={<CircularProgress size={20} />} action={<Button color="inherit" size="small" onClick={() => setState('idle')}>Stop waiting</Button>}>
          Prompt sent. Ask the customer to enter their M-Pesa PIN for <b>{money(charge, currency)}</b>. This screen updates by itself.
        </Alert>
      ) : (
        <Box>
          <Button variant="contained" size="large" startIcon={state === 'sending' ? <CircularProgress size={20} color="inherit" /> : <PhoneAndroid />} disabled={!normalized || state === 'sending'} onClick={send}>
            {state === 'failed' ? 'Send prompt again' : `Send ${money(charge, currency)} prompt`}
          </Button>
          {charge !== Number(amount) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              M-Pesa takes whole shillings, so {money(amount, currency)} is rounded up to {money(charge, currency)}.
            </Typography>
          )}
        </Box>
      )}
      {state === 'failed' && message && <Alert severity="error">{message}</Alert>}
    </Stack>
  );
};

const MpesaCode = ({ option, amount, currency, company, onChange }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [recent, setRecent] = useState([]);
  const charge = mpesaChargeAmount(amount);
  const cleanCode = code.trim().toUpperCase();
  const validCode = /^[A-Z0-9]{8,12}$/.test(cleanCode);

  const loadRecent = useCallback(async () => {
    if (!option.c2b_enabled) return;
    try {
      const res = await listUnclaimedMpesaPayments(company);
      setRecent(res.transactions || []);
    } catch (e) {
      setRecent([]);
    }
  }, [company, option.c2b_enabled]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const accept = (t) => {
    if (Number(t.amount) + 1 < Number(amount)) {
      setMessage({ severity: 'error', text: `That payment was ${money(t.amount, currency)}, less than the ${money(amount, currency)} due. Use split payment for the rest.` });
      return;
    }
    onChange({ confirmed: true, transactionId: t.transaction_id, reference: t.mpesa_receipt_number, amount: Number(amount), label: 'M-Pesa' });
  };

  const check = async () => {
    setBusy(true);
    setMessage(null);
    setNotFound(false);
    try {
      const res = await findMpesaPaymentByCode(company, cleanCode);
      if (res.already_used) setMessage({ severity: 'error', text: `Code ${cleanCode} is already used on sale ${res.transaction.invoice}.` });
      else accept(res.transaction);
    } catch (e) {
      setNotFound(true);
      setMessage({ severity: option.allow_manual_code ? 'warning' : 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {option.pay_to && (
        <Typography variant="body2" color="text.secondary">
          Customer pays {money(charge, currency)} to {option.pay_to_type === 'Till' ? 'Till' : 'Paybill'} <b>{option.pay_to}</b>, then reads you the code from their M-Pesa message.
        </Typography>
      )}
      {recent.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary">Recent payments to your till</Typography>
          <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 220, overflowY: 'auto' }}>
            {recent.map((t) => (
              <ListItemButton key={t.transaction_id} onClick={() => accept(t)}>
                <ListItemText
                  primary={<><b>{money(t.amount, currency)}</b> &middot; {t.mpesa_receipt_number}</>}
                  secondary={[t.payer_name, t.created_at ? new Date(t.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null].filter(Boolean).join(' · ')}
                />
              </ListItemButton>
            ))}
          </List>
          <Button size="small" startIcon={<Refresh />} onClick={loadRecent} sx={{ mt: 0.5 }}>Refresh</Button>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label="M-Pesa code"
          placeholder="e.g. SJK4H7Q2XP"
          value={code}
          onChange={(e) => { setCode(e.target.value); setNotFound(false); setMessage(null); }}
          inputProps={{ style: { textTransform: 'uppercase' }, autoComplete: 'off' }}
          sx={{ width: 240 }}
        />
        <Button variant="contained" size="large" disabled={!validCode || busy} onClick={check} sx={{ height: 56 }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : 'Check code'}
        </Button>
      </Box>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {notFound && option.allow_manual_code && validCode && (
        <Box>
          <Button variant="outlined" onClick={() => onChange({ confirmed: true, reference: cleanCode, amount: Number(amount), label: 'M-Pesa (code entered by cashier)' })}>
            I have seen the M-Pesa message: record {cleanCode}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Only do this after checking the customer's message shows {money(charge, currency)} paid to your business.
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Pesapal and PayPal
// ---------------------------------------------------------------------------

const OnlineCollect = ({ kind, option, mode, amount, currency, company, saleReference, customerPhone, customerName, onChange }) => {
  const label = GATEWAY_LABELS[kind];
  const [phone, setPhone] = useState(customerPhone || '');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | creating | waiting | failed
  const [message, setMessage] = useState('');
  const [txn, setTxn] = useState(null);
  const [copied, setCopied] = useState(false);
  const needsContact = kind === 'pesapal';
  const normalizedPhone = normalizeKenyanPhone(phone);
  const contactOk = !needsContact || normalizedPhone || /\S+@\S+\.\S+/.test(email);

  const start = async () => {
    setState('creating');
    setMessage('');
    try {
      const res = await createGatewayCheckout({
        company,
        gateway: kind,
        amount,
        reference: saleReference,
        phoneNumber: normalizedPhone,
        email,
        customerName,
      });
      setTxn(res.transaction);
      setState('waiting');
    } catch (e) {
      setMessage(e.message);
      setState('failed');
    }
  };

  const stop = async () => {
    const id = txn?.transaction_id;
    setState('idle');
    setTxn(null);
    if (id) {
      try {
        const res = await cancelGatewayPayment(id);
        // It may have gone through just before the cashier gave up
        if (res.transaction?.status === 'Success') confirm(res.transaction);
      } catch (e) {
        // nothing to undo
      }
    }
  };

  const confirm = (t) =>
    onChange({ confirmed: true, transactionId: t.transaction_id, reference: t.confirmation_code || t.merchant_reference, amount: Number(t.amount), label: t.payment_method ? `${label} (${t.payment_method})` : label });

  usePoll(state === 'waiting' && txn?.transaction_id, async () => {
    const res = await checkGatewayPayment(txn.transaction_id);
    const t = res.transaction;
    if (t.status === 'Success') {
      confirm(t);
      return true;
    }
    if (t.status !== 'Pending') {
      setMessage(t.result_description || 'The payment did not go through.');
      setState('failed');
      return true;
    }
    return false;
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(txn.checkout_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  if (state === 'waiting' && txn) {
    const converted = txn.charged_currency && txn.charged_currency !== txn.currency;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' }, gap: 2.5, alignItems: 'center' }}>
        <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, border: 1, borderColor: 'divider', justifySelf: { xs: 'center', sm: 'start' } }}>
          <QRCodeSVG value={txn.checkout_url} size={196} level="M" />
        </Box>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Customer scans to pay {converted ? `${txn.charged_currency} ${Number(txn.charged_amount).toFixed(2)}` : money(amount, currency)}</Typography>
          {converted && (
            <Typography variant="body2" color="text.secondary">
              {money(amount, currency)} converted at {Number(txn.exchange_rate).toPrecision(4)} because {label} cannot charge in {currency}.
            </Typography>
          )}
          <Alert severity="info" icon={<CircularProgress size={20} />}>
            Waiting for the customer to finish on their phone. This screen updates by itself.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" startIcon={<ContentCopy />} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            <Button size="small" startIcon={<OpenInNew />} href={txn.checkout_url} target="_blank" rel="noopener noreferrer">Open on this screen</Button>
            <Button size="small" color="inherit" onClick={stop}>Cancel</Button>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {kind === 'pesapal'
          ? 'Pesapal lets the customer pay by card, M-Pesa or Airtel Money on their own phone.'
          : 'The customer pays with their PayPal account or card on their own phone.'}
      </Typography>
      {needsContact && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField label="Customer phone" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} inputProps={{ inputMode: 'tel' }} sx={{ width: 220 }} />
          <TextField label="or email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ width: 240 }} />
        </Box>
      )}
      <Box>
        <Button variant="contained" size="large" startIcon={state === 'creating' ? <CircularProgress size={20} color="inherit" /> : <QrCode2 />} disabled={!contactOk || state === 'creating'} onClick={start}>
          {state === 'failed' ? 'Try again' : `Show ${mode || label} QR code`}
        </Button>
        {needsContact && !contactOk && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Pesapal needs the customer's phone number or email.
          </Typography>
        )}
      </Box>
      {state === 'failed' && message && <Alert severity="error">{message}</Alert>}
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Bank transfer / deposit
// ---------------------------------------------------------------------------

const BankReference = ({ mode, amount, currency, onChange }) => {
  const [reference, setReference] = useState('');
  const clean = reference.trim();
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Check that {money(amount, currency)} has reached your account (bank app, SMS alert or deposit slip), then record its reference.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField label={`${mode} reference`} placeholder="Transfer, EFT or slip number" value={reference} onChange={(e) => setReference(e.target.value)} sx={{ width: 280 }} />
        <Button variant="contained" size="large" disabled={clean.length < 3} sx={{ height: 56 }} onClick={() => onChange({ confirmed: true, reference: clean.toUpperCase(), amount: Number(amount), label: mode })}>
          Record payment
        </Button>
      </Box>
    </Stack>
  );
};

export default GatewayPayment;
