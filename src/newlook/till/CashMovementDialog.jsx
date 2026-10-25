import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { listCashMovements, recordCashMovement } from '../../api/shiftApi';
import { DEFAULT_KIND, KINDS, entryFor, firstReason, hasAmount, movementLine, newClientId, problemWith, reasonOptions, savedMessage, totalLines } from './cashModel';
import { sessionName } from './shiftModel';
import T from './strings.cash';
import './till.css';

const D = T.dialog;
const messageOf = (error, fallback) => (error && error.message ? error.message : fallback);

/**
 * Cash in or out of the drawer during a shift (shift management, part 1). The cashier says what happened (put in,
 * take out, to the safe), the amount, the reason and, for "Other", a few words. The server checks who may and that the
 * drawer holds what is being taken, and the count at the end of the shift adds these up.
 *
 *   open, onClose   showing, and what Escape and Done do (Escape waits while a call runs)
 *   session         the session record or just its name
 *   onRecorded(reply) called after each save, so the till can refresh what it shows
 *   load, save      the two server calls, replaceable in tests
 */
const CashMovementDialog = ({ open, ...rest }) => (open ? <CashMovement {...rest} /> : null);

const CashMovement = ({ onClose, session, onRecorded, load = listCashMovements, save = recordCashMovement }) => {
  const name = sessionName(session);
  const [kind, setKind] = useState(DEFAULT_KIND);
  const [digits, setDigits] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [list, setList] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const gone = useRef(false);
  const working = useRef(false); // set at once, so a double press cannot save twice before the screen redraws
  const clientId = useRef(newClientId());
  const offered = list ? list.reasons : null;
  const chosenReason = reason || firstReason(kind, offered);

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  const loadList = useCallback(() => {
    setLoadError('');
    Promise.resolve()
      .then(() => load(name))
      .then((data) => !gone.current && setList(data))
      .catch(() => !gone.current && setLoadError(D.loadFailed));
  }, [load, name]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const pickKind = (value) => {
    setKind(value);
    setReason('');
    setError('');
    setSaved('');
  };

  const submit = async () => {
    if (working.current) return;
    const problem = problemWith({ digits, reason: chosenReason, note });
    if (problem) {
      setError(problem);
      return;
    }
    working.current = true;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const reply = await save(entryFor({ session: name, kind, digits, reason: chosenReason, note, clientId: clientId.current }));
      if (gone.current) return;
      setSaved(savedMessage(reply));
      setDigits('');
      setNote('');
      clientId.current = newClientId(); // the next movement is a new one
      loadList();
      if (onRecorded) onRecorded(reply);
    } catch (e) {
      if (!gone.current) setError(messageOf(e, D.saveFailed));
    } finally {
      working.current = false;
      if (!gone.current) setBusy(false);
    }
  };

  const movements = (list && list.movements) || [];
  const totals = list ? totalLines(list.totals) : [];

  const footer = (
    <>
      <Button variant="secondary" size="till" onClick={onClose} disabled={busy}>
        {D.close}
      </Button>
      <Button size="till" onClick={submit} loading={busy} disabled={!hasAmount(digits)}>
        {busy ? D.saving : D.save}
      </Button>
    </>
  );

  return (
    <Dialog open onClose={onClose} title={D.name} description={D.intro} busy={busy} footer={footer} className="nl-cash">
      <div className="nl-cash__form">
        <Segmented label={D.kindGroup} value={kind} onChange={pickKind} options={KINDS.map((value) => ({ value, label: D.kinds[value] }))} />
        <p className="nl-shift__muted">{D.kindHelp[kind]}</p>
        <Field
          kind="money"
          label={D.amountField}
          helper={D.amountHelp}
          value={digits}
          onChange={setDigits}
          maxLength={9}
          data-autofocus=""
          disabled={busy}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          id="nl-cash-amount"
        />
        <Select label={D.reasonField} value={chosenReason} onChange={setReason} options={reasonOptions(kind, offered)} disabled={busy} />
        <Field label={D.noteField} helper={D.noteHelp} value={note} onChange={setNote} maxLength={140} disabled={busy} id="nl-cash-note" />
        {error ? (
          <p role="alert" className="nl-shift__alert">
            <Icon name="alert" />
            <span>{error}</span>
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="nl-shift__success">
            <Icon name="check" />
            <span>{saved}</span>
          </p>
        ) : null}
      </div>

      <div className="nl-cash__recent">
        <h3 className="nl-shift__small-heading">{D.recentName}</h3>
        {loadError ? (
          <div role="alert" className="nl-shift__alert">
            <Icon name="alert" />
            <span>{loadError}</span>
            <Button variant="ghost" size="small" onClick={loadList}>
              {D.tryAgain}
            </Button>
          </div>
        ) : movements.length === 0 ? (
          <p className="nl-shift__muted">{D.recentEmpty}</p>
        ) : (
          <>
            <ul className="nl-shift__list">
              {movements.map((m) => (
                <li key={m.id}>{movementLine(m)}</li>
              ))}
            </ul>
            {totals.length ? <p className="nl-shift__muted">{totals.join(' · ')}</p> : null}
          </>
        )}
      </div>
    </Dialog>
  );
};

export default CashMovementDialog;
