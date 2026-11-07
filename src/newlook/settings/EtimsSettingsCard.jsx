import React, { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import Field from '../components/Field';
import { SkeletonText } from '../components/Skeleton';
import Switch from '../components/Switch';
import { useAccess } from '../access/AccessProvider';
import { getEtimsDetails, saveEtimsDetails } from '../../api/taxApi';
import { changed, formFrom, needsAsking, problems } from './etimsModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const F = T.etimsForm;

/**
 * Settings, Tax: the eTIMS details an owner may change: the device serial number, whether sales and bills are sent to KRA, and test
 * mode. The PIN (from the Tax ID) and the branch (from KRA) are shown and not changed. Going live and switching reporting off ask
 * first. It never creates the eTIMS record (support does that once KRA has certified the system) and never shows a key or password.
 *
 *   load, save   injectable for tests; they default to the server calls
 */
const EtimsSettingsCard = ({ load = getEtimsDetails, save = saveEtimsDetails }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const owner = access.tier === 'owner';
  const [state, setState] = useState({ status: 'loading', details: null });
  const [values, setValues] = useState(formFrom(null));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [asking, setAsking] = useState(null);

  const reload = useCallback(() => {
    if (!company) return Promise.resolve();
    return load(company)
      .then((details) => {
        setState({ status: details ? 'ready' : 'none', details });
        setValues(formFrom(details));
      })
      .catch(() => setState({ status: 'error', details: null }));
  }, [company, load]);

  useEffect(() => {
    if (!owner) return;
    setState({ status: 'loading', details: null });
    reload();
  }, [owner, reload]);

  if (!owner) return null;

  const details = state.details;
  const doSave = async () => {
    setBusy(true);
    setResult(null);
    try {
      const reply = await save({ company, name: details.name, deviceSerial: String(values.deviceSerial || '').trim(), test: values.test, active: values.active });
      setResult({ tone: 'success', text: reply.changed.length ? F.saved : F.nothingChanged });
      await reload();
    } catch (error) {
      setResult({ tone: 'error', text: error.message });
    }
    setBusy(false);
  };

  const onSave = () => {
    const found = problems(values);
    const shown = {};
    Object.keys(found).forEach((key) => {
      shown[key] = F.problems[found[key]];
    });
    setErrors(shown);
    if (Object.keys(found).length) return;
    const ask = needsAsking(values, details);
    if (ask) setAsking(ask);
    else doSave();
  };

  let body;
  if (state.status === 'loading') body = <div aria-busy="true" aria-label={F.loading}><SkeletonText lines={4} /></div>;
  else if (state.status === 'error') body = <p className="nl-settings-hint">{F.errorText}</p>;
  else if (state.status === 'none') body = <p className="nl-settings-hint">{F.noRecord}</p>;
  else {
    body = (
      <div className="nl-settings-list">
        <div className="nl-settings-fields">
          <Field id="etims-pin" label={F.pin} helper={F.pinHelp} value={details.pin} readOnly />
          <Field id="etims-branch" label={F.branch} helper={F.branchHelp} value={details.branch} readOnly />
          <Field id="etims-serial" label={F.serial} helper={F.serialHelp} value={values.deviceSerial} error={errors.deviceSerial} onChange={(v) => { setValues((x) => ({ ...x, deviceSerial: v })); setErrors({}); }} autoComplete="off" />
        </div>
        <ul className="nl-settings-switches">
          <li className="nl-settings-switch">
            <Switch label={F.active} checked={values.active} onChange={(on) => setValues((x) => ({ ...x, active: on }))} />
            <p className="nl-settings-hint">{F.activeHelp}</p>
          </li>
          <li className="nl-settings-switch">
            <Switch label={F.test} checked={values.test} onChange={(on) => setValues((x) => ({ ...x, test: on }))} />
            <p className="nl-settings-hint">{F.testHelp}</p>
          </li>
        </ul>
        {result ? <p className={result.tone === 'error' ? 'nl-error' : 'nl-settings-note'} role={result.tone === 'error' ? 'alert' : 'status'}>{result.text}</p> : null}
        <div className="nl-settings-actions">
          <Button variant="primary" loading={busy} disabled={busy || !changed(values, details)} onClick={onSave}>
            {busy ? F.saving : F.save}
          </Button>
        </div>
      </div>
    );
  }

  const ask = asking === 'goLive' ? F.goLiveAsk : asking === 'turnOff' ? F.turnOffAsk : null;
  return (
    <div className="nl-settings-card" data-card="etims-details">
      <Card title={F.title} subtitle={F.subtitle}>
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
            setAsking(null);
            doSave();
          }}
          onCancel={() => setAsking(null)}
        />
      ) : null}
    </div>
  );
};

export default EtimsSettingsCard;
