import React, { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { SkeletonText } from '../components/Skeleton';
import Switch from '../components/Switch';
import { useAccess } from '../access/AccessProvider';
import { deactivateGateway, getPaymentGateways, listReceivingAccounts, saveMpesaSettings, sendMpesaTestPayment, testGateway } from '../../api/paymentGatewayApi';
import fill from '../labels/fill';
import { DARAJA_SANDBOX, MPESA_DEFAULTS, fromServer, needsAsking, problems, savedSecrets, statusOf, toSave } from './mpesaModel';
import SecretField from './SecretField';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const M = T.mpesa;

/**
 * Settings, Till and payments, M-Pesa: the Daraja keys and the shortcode, saved, tested and turned off here, through the same server
 * calls the current Payment gateways screen uses. Keys are password boxes and a saved key is never shown again. Only the owner can
 * change them. Going live and turning M-Pesa off ask first. Pesapal and PayPal stay on the current screen.
 *
 *   load, save, test, testWithPhone, turnOff, loadAccounts   injectable for tests; they default to the server calls
 */
const MpesaCard = ({ load = getPaymentGateways, save = saveMpesaSettings, test = testGateway, testWithPhone = sendMpesaTestPayment, turnOff = deactivateGateway, loadAccounts = listReceivingAccounts }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const owner = access.tier === 'owner';
  const [state, setState] = useState({ status: 'loading', overview: null });
  const [values, setValues] = useState(MPESA_DEFAULTS);
  const [wasSaved, setWasSaved] = useState(savedSecrets(null));
  const [accounts, setAccounts] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null); // { tone: 'success' | 'warning' | 'error', text }
  const [advanced, setAdvanced] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [asking, setAsking] = useState(null); // 'live' | 'off'

  const reload = useCallback(() => {
    if (!company) return Promise.resolve();
    return load(company)
      .then((overview) => {
        setState({ status: 'ready', overview });
        setValues(fromServer(overview.mpesa));
        setWasSaved(savedSecrets(overview.mpesa));
      })
      .catch(() => setState({ status: 'error', overview: null }));
  }, [company, load]);

  useEffect(() => {
    if (!owner) return;
    setState({ status: 'loading', overview: null });
    reload();
    loadAccounts(company)
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, [owner, company, reload, loadAccounts]);

  if (!owner) return null;

  const saved = state.overview && state.overview.mpesa;
  const set = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const isTill = values.shortcode_type === 'BuyGoods';
  const live = values.environment === 'Production';

  const doSave = async () => {
    const found = problems(values);
    const shown = {};
    Object.keys(found).forEach((key) => {
      shown[key] = M.problems[found[key]];
    });
    setErrors(shown);
    if (Object.keys(found).length) {
      setResult({ tone: 'error', text: M.fillIn });
      return;
    }
    setBusy('save');
    setResult(null);
    try {
      const reply = await save(company, toSave(values));
      const warn = reply.c2b_message && /could not/i.test(reply.c2b_message);
      setResult({ tone: warn ? 'warning' : 'success', text: reply.c2b_message || M.savedLine });
      await reload();
    } catch (error) {
      setResult({ tone: 'error', text: error.message });
    }
    setBusy('');
  };

  const onSaveClick = () => {
    // Going live is asked about once; every other save goes straight through
    if (needsAsking(saved || { environment: 'Sandbox' }, values) === 'goLive') setAsking('live');
    else doSave();
  };

  const doTest = async (withPhone) => {
    setBusy('test');
    setResult(null);
    try {
      const reply = withPhone ? await testWithPhone(company, testPhone) : await test(company, 'mpesa');
      let text = reply.message || '';
      if (reply.test_payment) {
        text += reply.test_payment.success ? M.testPromptSent : fill(M.testPromptFailed, { reason: reply.test_payment.message });
      }
      if (reply.callback_problem) setResult({ tone: 'warning', text: fill(M.testHowever, { message: text, problem: reply.callback_problem }) });
      else setResult({ tone: 'success', text });
    } catch (error) {
      setResult({ tone: 'error', text: error.message });
    }
    setBusy('');
  };

  const doTurnOff = async () => {
    setBusy('save');
    setResult(null);
    try {
      await turnOff(company, 'mpesa');
      setResult({ tone: 'success', text: M.turnedOff });
      await reload();
    } catch (error) {
      setResult({ tone: 'error', text: error.message });
    }
    setBusy('');
  };

  const status = statusOf(saved);
  const chip = <Chip icon={status === 'live' ? 'check' : status === 'test' ? 'alert' : 'info'} tone={status === 'live' ? 'brand' : 'neutral'}>{M.status[status]}</Chip>;

  let body;
  if (state.status === 'loading') body = <div aria-busy="true" aria-label={M.loading}><SkeletonText lines={5} /></div>;
  else if (state.status === 'error') body = <EmptyState icon="alert" tone="error" title={M.errorTitle} description={M.errorText} action={{ label: T.shell.retry, onClick: reload }} level={3} />;
  else {
    const callbackProblem = state.overview && state.overview.callback_problem;
    body = (
      <div className="nl-settings-list nl-mpesa">
        {callbackProblem ? <p className="nl-error" role="status">{fill(M.callbackProblem, { reason: callbackProblem })}</p> : null}

        <Segmented
          label={M.mode}
          value={values.environment}
          onChange={set('environment')}
          options={[
            { value: 'Sandbox', label: M.modeTest },
            { value: 'Production', label: M.modeLive },
          ]}
        />
        <Segmented
          label={M.payInto}
          value={values.shortcode_type}
          onChange={set('shortcode_type')}
          options={[
            { value: 'BuyGoods', label: M.payTill },
            { value: 'Paybill', label: M.payPaybill },
          ]}
        />
        {!live ? (
          <div>
            <Button variant="ghost" size="small" onClick={() => setValues((v) => ({ ...v, shortcode_type: 'Paybill', shortcode: DARAJA_SANDBOX.shortcode, passkey: DARAJA_SANDBOX.passkey, till_number: '' }))}>
              {M.useTestShortcode}
            </Button>
          </div>
        ) : null}

        <div className="nl-settings-fields">
          <Field id="mpesa-shortcode" label={isTill ? M.shortcodeTill : M.shortcodePaybill} value={values.shortcode} onChange={set('shortcode')} error={errors.shortcode} inputMode="numeric" autoComplete="off" />
          {isTill ? <Field id="mpesa-till" label={M.tillNumber} helper={M.tillNumberHelp} value={values.till_number} onChange={set('till_number')} error={errors.till_number} inputMode="numeric" autoComplete="off" /> : <Field id="mpesa-prefix" label={M.prefix} helper={M.prefixHelp} value={values.account_reference_prefix} onChange={set('account_reference_prefix')} autoComplete="off" />}
          <SecretField id="mpesa-key" label={M.consumerKey} helper={M.keyHelp} value={values.consumer_key} wasSaved={wasSaved.consumer_key} onChange={set('consumer_key')} error={errors.consumer_key} />
          <SecretField id="mpesa-secret" label={M.consumerSecret} helper={M.keyHelp} value={values.consumer_secret} wasSaved={wasSaved.consumer_secret} onChange={set('consumer_secret')} error={errors.consumer_secret} />
          <SecretField id="mpesa-passkey" label={M.passkey} helper={M.passkeyHelp} value={values.passkey} wasSaved={wasSaved.passkey} onChange={set('passkey')} error={errors.passkey} />
          <Select id="mpesa-account" label={M.account} helper={M.accountHelp} placeholder={M.accountChoose} options={accounts} value={values.payment_account} onChange={set('payment_account')} error={errors.payment_account} />
        </div>

        <ul className="nl-settings-switches">
          <li className="nl-settings-switch">
            <Switch label={M.manualCode} checked={Boolean(Number(values.allow_manual_code))} onChange={(on) => set('allow_manual_code')(on ? 1 : 0)} />
          </li>
          <li className="nl-settings-switch">
            <Switch label={M.c2b} checked={Boolean(Number(values.enable_c2b))} onChange={(on) => set('enable_c2b')(on ? 1 : 0)} />
            {Boolean(Number(values.enable_c2b)) && live ? <p className="nl-settings-hint">{M.c2bLive}</p> : null}
          </li>
        </ul>

        <div>
          <Button variant="ghost" size="small" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>
            {advanced ? M.advancedHide : M.advanced}
          </Button>
          {advanced ? (
            <div className="nl-settings-fields">
              <Field id="mpesa-wait" label={M.wait} helper={M.waitHelp} value={String(values.payment_timeout)} onChange={(v) => set('payment_timeout')(v.replace(/\D/g, ''))} error={errors.payment_timeout} inputMode="numeric" autoComplete="off" />
              <Field id="mpesa-initiator" label={M.initiator} value={values.initiator_name} onChange={set('initiator_name')} autoComplete="off" />
              <SecretField id="mpesa-credential" label={M.credential} helper={M.credentialHelp} value={values.security_credential} wasSaved={wasSaved.security_credential} onChange={set('security_credential')} />
              {saved && saved.effective_callback_url ? <Field id="mpesa-callback" label={M.callback} helper={M.callbackHelp} value={saved.effective_callback_url} readOnly /> : null}
            </div>
          ) : null}
        </div>

        {result ? (
          <p className={result.tone === 'error' ? 'nl-error' : 'nl-settings-note'} role={result.tone === 'error' ? 'alert' : 'status'}>
            {result.text}
          </p>
        ) : null}

        <div className="nl-settings-actions">
          <Button variant="primary" loading={busy === 'save'} disabled={Boolean(busy)} onClick={onSaveClick}>
            {busy === 'save' ? M.saving : M.save}
          </Button>
          {saved ? (
            <Button variant="secondary" loading={busy === 'test'} disabled={Boolean(busy)} onClick={() => doTest(false)}>
              {busy === 'test' ? M.testing : M.test}
            </Button>
          ) : null}
          {saved && saved.is_active ? (
            <Button variant="ghost" disabled={Boolean(busy)} onClick={() => setAsking('off')}>
              {M.turnOff}
            </Button>
          ) : null}
        </div>
        {saved ? (
          <div className="nl-settings-actions">
            <Field id="mpesa-test-phone" label={M.testPhone} placeholder={M.testPhonePlaceholder} value={testPhone} onChange={setTestPhone} inputMode="tel" autoComplete="off" />
            <Button variant="secondary" disabled={!testPhone.trim() || Boolean(busy)} onClick={() => doTest(true)}>
              {M.testPrompt}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const ask = asking ? (asking === 'live' ? M.liveAsk : M.offAsk) : null;
  return (
    <div className="nl-settings-card" data-card="mpesa">
      <Card title={M.title} subtitle={M.subtitle} actions={chip}>
        {body}
      </Card>
      {ask ? (
        <ConfirmDialog
          open
          title={ask.title}
          message={ask.message}
          confirmLabel={ask.yes}
          cancelLabel={ask.no}
          destructive
          onConfirm={() => {
            const which = asking;
            setAsking(null);
            if (which === 'live') doSave();
            else doTurnOff();
          }}
          onCancel={() => setAsking(null)}
        />
      ) : null}
    </div>
  );
};

export default MpesaCard;
