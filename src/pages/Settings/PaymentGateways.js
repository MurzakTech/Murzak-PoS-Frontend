import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { AccountBalance, CreditCard, ExpandLess, ExpandMore, Hub, PhoneAndroid, Public } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listCashAndBankAccounts } from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import SectionCard from '../../components/Common/SectionCard';
import {
  SAVED_SECRET,
  deactivateGateway,
  getPaymentGateways,
  saveGatewaySettings,
  saveMpesaSettings,
  sendMpesaTestPayment,
  testGateway,
} from '../../api/paymentGatewayApi';

// Safaricom's public sandbox shortcode and passkey, the same for every Daraja test app
const DARAJA_SANDBOX = { shortcode: '174379', passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' };
const PAYPAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'NZD'];

const MPESA_DEFAULTS = {
  is_active: 1,
  environment: 'Sandbox',
  shortcode_type: 'BuyGoods',
  shortcode: '',
  till_number: '',
  consumer_key: '',
  consumer_secret: '',
  passkey: '',
  payment_account: '',
  account_reference_prefix: '',
  allow_manual_code: 1,
  enable_c2b: 0,
  payment_timeout: 120,
  initiator_name: '',
  security_credential: '',
};
const ONLINE_DEFAULTS = {
  is_active: 1,
  environment: 'Sandbox',
  client_id: '',
  client_secret: '',
  payment_account: '',
  display_name: '',
  currency: '',
};

const fromServer = (defaults, data) => {
  if (!data) return { ...defaults };
  const out = { ...defaults };
  Object.keys(defaults).forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) out[k] = data[k];
  });
  return out;
};

const statusChip = (settings) => {
  if (!settings) return <Chip size="small" label="Not set up" />;
  if (!settings.is_active) return <Chip size="small" label="Off" />;
  return settings.environment === 'Production'
    ? <Chip size="small" color="success" label="Live" />
    : <Chip size="small" color="warning" label="Testing (sandbox)" />;
};

const SecretField = ({ label, value, onChange, helperText }) => {
  const saved = value === SAVED_SECRET;
  return (
    <TextField
      fullWidth
      type="password"
      label={label}
      value={saved ? '' : value}
      placeholder={saved ? 'Saved. Type a new value to replace it' : ''}
      onChange={(e) => onChange(e.target.value || (saved ? SAVED_SECRET : ''))}
      InputLabelProps={saved ? { shrink: true } : undefined}
      helperText={helperText}
      autoComplete="new-password"
    />
  );
};

const EnvironmentToggle = ({ value, onChange }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Environment</Typography>
    <ToggleButtonGroup exclusive size="small" value={value} onChange={(e, v) => v && onChange(v)}>
      <ToggleButton value="Sandbox">Testing (sandbox)</ToggleButton>
      <ToggleButton value="Production">Live (real money)</ToggleButton>
    </ToggleButtonGroup>
  </Box>
);

const AccountPicker = ({ accounts, value, onChange, helperText }) => (
  <Autocomplete
    options={accounts}
    value={value || null}
    onChange={(e, v) => onChange(v || '')}
    renderInput={(params) => <TextField {...params} label="Receiving account" helperText={helperText} required />}
  />
);

const CardActions = ({ busy, onSave, onTest, onTurnOff, saved, extra }) => (
  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', mt: 1 }}>
    {extra}
    {saved && onTurnOff && <Button color="inherit" onClick={onTurnOff} disabled={!!busy}>Turn off</Button>}
    {saved && <Button variant="outlined" onClick={onTest} disabled={!!busy}>{busy === 'test' ? <CircularProgress size={20} /> : 'Test connection'}</Button>}
    <Button variant="contained" onClick={onSave} disabled={!!busy}>{busy === 'save' ? <CircularProgress size={20} color="inherit" /> : 'Save'}</Button>
  </Box>
);

const PaymentGateways = () => {
  const dispatch = useAppDispatch();
  const { cashBankAccounts } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);
  const company = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [mpesa, setMpesa] = useState(MPESA_DEFAULTS);
  const [pesapal, setPesapal] = useState(ONLINE_DEFAULTS);
  const [paypal, setPaypal] = useState({ ...ONLINE_DEFAULTS, currency: 'USD' });
  const [busy, setBusy] = useState({});
  const [results, setResults] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const accounts = useMemo(() => (cashBankAccounts || []).map((a) => a.name).filter(Boolean), [cashBankAccounts]);

  const load = useCallback(async () => {
    if (!company) return;
    setLoadError('');
    try {
      const data = await getPaymentGateways(company);
      setOverview(data);
      setMpesa(fromServer(MPESA_DEFAULTS, data.mpesa));
      setPesapal(fromServer(ONLINE_DEFAULTS, data.pesapal));
      setPaypal(fromServer({ ...ONLINE_DEFAULTS, currency: 'USD' }, data.paypal));
    } catch (e) {
      setLoadError(e.message);
    }
  }, [company]);

  useEffect(() => {
    load();
    if (company) dispatch(listCashAndBankAccounts({ company }));
  }, [company, dispatch, load]);

  const notify = (message, severity = 'success') => dispatch(showNotification({ message, severity }));

  const run = async (key, action, fn) => {
    setBusy((b) => ({ ...b, [key]: action }));
    try {
      return await fn();
    } finally {
      setBusy((b) => ({ ...b, [key]: null }));
    }
  };

  const showResult = (key, severity, message) => setResults((r) => ({ ...r, [key]: { severity, message } }));

  // ---- M-Pesa ----
  const saveMpesa = () =>
    run('mpesa', 'save', async () => {
      if (!mpesa.shortcode || !mpesa.consumer_key || !mpesa.consumer_secret || !mpesa.passkey || !mpesa.payment_account) {
        showResult('mpesa', 'error', 'Fill in the shortcode, consumer key, consumer secret, passkey and receiving account.');
        return;
      }
      try {
        const res = await saveMpesaSettings(company, mpesa);
        notify(res.message || 'M-Pesa settings saved');
        showResult('mpesa', res.c2b_message && res.c2b_message.includes('could not') ? 'warning' : 'success', res.c2b_message || 'Saved. Press Test connection to check the keys.');
        await load();
      } catch (e) {
        showResult('mpesa', 'error', e.message);
      }
    });

  const testMpesa = (withPhone) =>
    run('mpesa', 'test', async () => {
      try {
        const res = withPhone ? await sendMpesaTestPayment(company, testPhone) : await testGateway(company, 'mpesa');
        let message = res.message;
        if (res.test_payment) {
          message += res.test_payment.success
            ? ' A KES 1 prompt was sent to the test phone. Enter the PIN to confirm the full payment path.'
            : ` The test prompt failed: ${res.test_payment.message}`;
        }
        showResult('mpesa', res.callback_problem ? 'warning' : 'success', res.callback_problem ? `${message} However: ${res.callback_problem}` : message);
      } catch (e) {
        showResult('mpesa', 'error', e.message);
      }
    });

  // ---- Pesapal / PayPal ----
  const saveOnline = (gateway, values) =>
    run(gateway, 'save', async () => {
      if (!values.client_id || !values.client_secret || !values.payment_account) {
        showResult(gateway, 'error', 'Fill in the key, the secret and the receiving account.');
        return;
      }
      try {
        const res = await saveGatewaySettings(company, gateway, values);
        notify(res.message);
        showResult(gateway, 'success', 'Saved. Press Test connection to check the keys.');
        await load();
      } catch (e) {
        showResult(gateway, 'error', e.message);
      }
    });

  const testOnline = (gateway) =>
    run(gateway, 'test', async () => {
      try {
        const res = await testGateway(company, gateway);
        showResult(gateway, 'success', res.message);
      } catch (e) {
        showResult(gateway, 'error', e.message);
      }
      await load();
    });

  const turnOff = (gateway) =>
    run(gateway, 'save', async () => {
      try {
        await deactivateGateway(company, gateway);
        notify('Turned off. It no longer shows at the till.');
        await load();
      } catch (e) {
        showResult(gateway, 'error', e.message);
      }
    });

  const setM = (field) => (value) => setMpesa((m) => ({ ...m, [field]: value }));
  const ev = (setter) => (e) => setter(e.target.value);
  const isTill = mpesa.shortcode_type === 'BuyGoods';

  if (!overview && !loadError) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  const onlineCard = (gateway, values, setValues, title, intro, keyHelp) => {
    const saved = overview?.[gateway];
    const set = (field) => (value) => setValues((v) => ({ ...v, [field]: value }));
    return (
      <SectionCard title={title} subtitle={intro} action={statusChip(saved)}>
        <Stack spacing={2}>
          <EnvironmentToggle value={values.environment} onChange={set('environment')} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField fullWidth label={gateway === 'paypal' ? 'Client ID' : 'Consumer Key'} value={values.client_id} onChange={ev(set('client_id'))} helperText={keyHelp} />
            <SecretField label={gateway === 'paypal' ? 'Secret' : 'Consumer Secret'} value={values.client_secret} onChange={set('client_secret')} />
            <AccountPicker accounts={accounts} value={values.payment_account} onChange={set('payment_account')} helperText={`Where ${title} payments are recorded in your books`} />
            <TextField fullWidth label="Name shown to customers" value={values.display_name} onChange={ev(set('display_name'))} placeholder={company} />
            {gateway === 'paypal' && (
              <TextField select fullWidth label="Charge customers in" value={values.currency || 'USD'} onChange={ev(set('currency'))} helperText={`PayPal cannot charge in ${overview?.company_currency || 'KES'}. Sales are converted using your Currency Exchange rates.`}>
                {PAYPAL_CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            )}
          </Box>
          {results[gateway] && <Alert severity={results[gateway].severity}>{results[gateway].message}</Alert>}
          {saved?.last_tested_on && !results[gateway] && (
            <Typography variant="caption" color="text.secondary">Last test {saved.last_tested_on}: {saved.last_test_result}</Typography>
          )}
          <CardActions busy={busy[gateway]} saved={!!saved} onSave={() => saveOnline(gateway, values)} onTest={() => testOnline(gateway)} onTurnOff={saved?.is_active ? () => turnOff(gateway) : null} />
        </Stack>
      </SectionCard>
    );
  };

  return (
    <Box>
      <PageHeader
        title="Payment Gateways"
        subtitle="Take M-Pesa, card, PayPal and bank payments at the till. Each business uses its own accounts and keys."
        icon={Hub}
      />

      {loadError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={load}>Retry</Button>}>{loadError}</Alert>}
      {overview?.callback_problem && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Payment providers cannot confirm payments to this server yet. {overview.callback_problem}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* ---------------- M-Pesa ---------------- */}
        <SectionCard
          title="M-Pesa (Lipa na M-Pesa)"
          subtitle="The till sends a payment prompt to the customer's phone. Keys come from your app on developer.safaricom.co.ke (Daraja)."
          action={statusChip(overview?.mpesa)}
        >
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <EnvironmentToggle value={mpesa.environment} onChange={setM('environment')} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Customers pay into</Typography>
                <ToggleButtonGroup exclusive size="small" value={mpesa.shortcode_type} onChange={(e, v) => v && setM('shortcode_type')(v)}>
                  <ToggleButton value="BuyGoods">A till (Buy Goods)</ToggleButton>
                  <ToggleButton value="Paybill">A paybill</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {mpesa.environment === 'Sandbox' && (
                <Button size="small" onClick={() => setMpesa((m) => ({ ...m, shortcode_type: 'Paybill', shortcode: DARAJA_SANDBOX.shortcode, passkey: DARAJA_SANDBOX.passkey, till_number: '' }))}>
                  Use Safaricom test shortcode
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                required
                label={isTill ? 'Store number (head office)' : 'Paybill number'}
                value={mpesa.shortcode}
                onChange={ev(setM('shortcode'))}
                inputProps={{ inputMode: 'numeric' }}
                helperText={isTill ? 'The shortcode Safaricom gave your Buy Goods account. Often different from the till number.' : 'The paybill customers pay into.'}
              />
              {isTill ? (
                <TextField fullWidth label="Till number" value={mpesa.till_number} onChange={ev(setM('till_number'))} inputProps={{ inputMode: 'numeric' }} helperText="The number on your Lipa na M-Pesa sticker. Leave empty if it equals the store number." />
              ) : (
                <TextField fullWidth label="Account number prefix (optional)" value={mpesa.account_reference_prefix} onChange={ev(setM('account_reference_prefix'))} helperText="Shown as the account number on the customer's statement, before the sale number." />
              )}
              <SecretField label="Consumer Key" value={mpesa.consumer_key} onChange={setM('consumer_key')} helperText="Daraja portal > My Apps > your app" />
              <SecretField label="Consumer Secret" value={mpesa.consumer_secret} onChange={setM('consumer_secret')} helperText="Daraja portal > My Apps > your app" />
              <SecretField label="Lipa na M-Pesa Online passkey" value={mpesa.passkey} onChange={setM('passkey')} helperText="Sent by Safaricom when the till or paybill went live (in sandbox, use the test shortcode button)." />
              <AccountPicker accounts={accounts} value={mpesa.payment_account} onChange={setM('payment_account')} helperText="Where M-Pesa takings are recorded, e.g. an 'M-Pesa' bank or cash account" />
            </Box>

            <Stack spacing={0.5}>
              <FormControlLabel control={<Switch checked={!!Number(mpesa.allow_manual_code)} onChange={(e) => setM('allow_manual_code')(e.target.checked ? 1 : 0)} />} label="Let cashiers record an M-Pesa code when the phone prompt fails" />
              <FormControlLabel control={<Switch checked={!!Number(mpesa.enable_c2b)} onChange={(e) => setM('enable_c2b')(e.target.checked ? 1 : 0)} />} label="Show payments customers make straight to the till, so cashiers can match them by code" />
              {!!Number(mpesa.enable_c2b) && mpesa.environment === 'Production' && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 6 }}>
                  Your Daraja app needs the "M-Pesa C2B" product enabled for the live shortcode. Registration happens when you save.
                </Typography>
              )}
            </Stack>

            <Box>
              <Button size="small" onClick={() => setShowAdvanced((s) => !s)} endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}>Advanced</Button>
              <Collapse in={showAdvanced}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
                  <TextField fullWidth type="number" label="Wait for the customer (seconds)" value={mpesa.payment_timeout} onChange={ev(setM('payment_timeout'))} />
                  <Box />
                  <TextField fullWidth label="Initiator name (refunds to customers, B2C)" value={mpesa.initiator_name} onChange={ev(setM('initiator_name'))} />
                  <SecretField label="Security credential (B2C)" value={mpesa.security_credential} onChange={setM('security_credential')} helperText="Generated on the Daraja portal from the initiator password." />
                  {overview?.mpesa?.effective_callback_url && (
                    <TextField fullWidth label="Callback address (automatic)" value={overview.mpesa.effective_callback_url} InputProps={{ readOnly: true }} sx={{ gridColumn: '1 / -1' }} helperText="Safaricom reports payments here. Nothing to copy: it is sent with each request." />
                  )}
                </Box>
              </Collapse>
            </Box>

            {results.mpesa && <Alert severity={results.mpesa.severity}>{results.mpesa.message}</Alert>}

            <CardActions
              busy={busy.mpesa}
              saved={!!overview?.mpesa}
              onSave={saveMpesa}
              onTest={() => testMpesa(false)}
              onTurnOff={overview?.mpesa?.is_active ? () => turnOff('mpesa') : null}
              extra={overview?.mpesa ? (
                <Box sx={{ display: 'flex', gap: 1, mr: 'auto', flexWrap: 'wrap' }}>
                  <TextField size="small" label="Test phone" placeholder="0712 345 678" value={testPhone} onChange={ev(setTestPhone)} sx={{ width: 180 }} />
                  <Button size="small" variant="outlined" startIcon={<PhoneAndroid />} disabled={!testPhone || !!busy.mpesa} onClick={() => testMpesa(true)}>Send KES 1 test prompt</Button>
                </Box>
              ) : null}
            />
          </Stack>
        </SectionCard>

        {/* ---------------- Pesapal ---------------- */}
        {onlineCard(
          'pesapal',
          pesapal,
          setPesapal,
          'Pesapal',
          'Cards (Visa, Mastercard), M-Pesa and Airtel Money through one payment page. The customer scans a QR code at the till.',
          'From your Pesapal merchant dashboard (or the sandbox keys on developer.pesapal.com)',
        )}

        {/* ---------------- PayPal ---------------- */}
        {onlineCard(
          'paypal',
          paypal,
          setPaypal,
          'PayPal',
          'For tourists and foreign customers. The customer scans a QR code and pays with PayPal or a card.',
          'developer.paypal.com > Apps & Credentials > your REST app',
        )}

        {/* ---------------- Bank ---------------- */}
        <SectionCard
          title="Bank transfers and deposits"
          subtitle="For customers who pay by bank transfer, EFT, RTGS, PesaLink or a deposit slip. The cashier records the bank's reference with the sale."
          action={<AccountBalance color="action" />}
        >
          <Stack spacing={1.5}>
            {overview?.bank_methods?.length ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {overview.bank_methods.map((m) => <Chip key={m} icon={<CreditCard />} label={m} />)}
              </Box>
            ) : (
              <Alert severity="info" icon={<Public />}>
                No bank payment methods yet. Add your bank account, then a payment method of type <b>Bank</b> linked to it.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              Every payment method of type Bank asks the cashier for a reference at the till. Card machines (PDQ) can stay as their own method without a reference.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button component={RouterLink} to="/settings/bank-accounts" variant="outlined">Bank accounts</Button>
              <Button component={RouterLink} to="/settings/payment-methods" variant="outlined">Payment methods</Button>
            </Box>
          </Stack>
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default PaymentGateways;
