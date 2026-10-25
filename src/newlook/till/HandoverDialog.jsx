import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { formatMoney } from '../components/format';
import { getTillState } from '../../api/tillApi';
import { handOverTill, listHandoverPeople, previewHandover } from '../../api/shiftApi';
import { countedFor, differenceHint, differenceView, hasCount, sessionName } from './shiftModel';
import T from './strings.cash';
import fill from '../labels/fill';
import './till.css';

const H = T.handover;
const FIELD_ID = 'nl-handover-counted';
const messageOf = (error, fallback) => (error && error.message ? error.message : fallback);
const cashLineOf = (result) => (result && result.lines.find((l) => l.key === 'cash')) || null;

/**
 * Handing the till to the next cashier (shift management, part 4). The cashier counts the drawer and chooses who takes
 * over; the server closes this shift with the count and opens the next person's shift with the counted cash.
 *
 *   count    the cash counted, who takes over, an optional note. "See the difference" is on only when both are given.
 *   check    the server's figures and the difference; nothing is handed over until Hand over is pressed.
 *   done     what happened: handed over, still closing, or closed but the next shift could not be started.
 *
 *   open, onClose   showing, and what Escape, Keep the till and Done do (Escape waits while a call runs)
 *   session         the session record or just its name
 *   onHandedOver(result)  called once, when this shift is closed (the parent then shows the till as closed)
 *   loadPeople, loadState, preview, handOver   the server calls, replaceable in tests
 */
const HandoverDialog = ({ open, ...rest }) => (open ? <Handover {...rest} /> : null);

const Handover = ({ onClose, session, onHandedOver, loadPeople = listHandoverPeople, loadState = getTillState, preview = previewHandover, handOver = handOverTill }) => {
  const name = sessionName(session);
  const record = session && typeof session === 'object' ? session : null;
  const [step, setStep] = useState('count');
  const [digits, setDigits] = useState('');
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  const [people, setPeople] = useState(null);
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const gone = useRef(false);
  const working = useRef(false); // set at once, so a double press cannot start two calls before the screen redraws
  const stepBox = useRef(null);
  const doneButton = useRef(null);

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  const load = useCallback(() => {
    setLoadError('');
    Promise.resolve()
      .then(() => Promise.all([loadPeople(name), loadState({ pos_profile: record ? record.pos_profile : undefined })]))
      .then(([team, till]) => {
        if (gone.current) return;
        setPeople(team);
        setState(till);
      })
      .catch(() => !gone.current && setLoadError(H.peopleFailed));
    // The session record is read once, when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPeople, loadState, name]);

  useEffect(() => {
    load();
  }, [load]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (step === 'count') {
      const input = document.getElementById(FIELD_ID);
      if (input) input.focus();
    } else if (step === 'done' && doneButton.current) doneButton.current.focus();
    else if (stepBox.current) stepBox.current.focus();
  }, [step]);

  const ready = hasCount(digits) && Boolean(person);
  const request = () => ({ session: name, toUser: person, counted: countedFor(state, digits), note: note.trim() });
  const chosen = (people || []).find((p) => p.user === person);
  const chosenName = chosen ? chosen.name : person;

  const run = async (kind, call, next, after) => {
    if (working.current) return;
    working.current = true;
    setBusy(kind);
    setError('');
    try {
      const reply = await call(request());
      if (gone.current) return;
      setResult(reply);
      setStep(next);
      if (after) after(reply);
    } catch (e) {
      if (!gone.current) setError(messageOf(e, kind === 'preview' ? H.previewFailed : H.handOverFailed));
    } finally {
      working.current = false;
      if (!gone.current) setBusy('');
    }
  };

  const seeDifference = () => ready && run('preview', preview, 'check');
  const handIt = () => run('handover', handOver, 'done', onHandedOver);

  const cashLine = cashLineOf(result);
  const view = result ? differenceView(result.difference, result.word) : null;
  const counted = cashLine && cashLine.counted !== null ? cashLine.counted : result ? result.total_counted : 0;
  const expected = cashLine ? cashLine.expected : result ? result.total_expected : 0;

  const errorBox = error ? (
    <p role="alert" className="nl-shift__alert">
      <Icon name="alert" />
      <span>{error}</span>
    </p>
  ) : null;

  let heading = H.name;
  let intro = H.intro;
  let body;
  let footer;

  if (step === 'count') {
    const nobody = people !== null && people.length === 0;
    footer = (
      <>
        <Button variant="secondary" size="till" onClick={onClose} disabled={Boolean(busy)}>
          {H.cancel}
        </Button>
        <Button size="till" onClick={seeDifference} disabled={!ready} loading={busy === 'preview'}>
          {busy === 'preview' ? H.working : H.seeDifference}
        </Button>
      </>
    );
    body = (
      <div className="nl-handover__form">
        {loadError ? (
          <div role="alert" className="nl-shift__alert">
            <Icon name="alert" />
            <span>{loadError}</span>
            <Button variant="ghost" size="small" onClick={load}>
              {H.tryAgain}
            </Button>
          </div>
        ) : null}
        {nobody ? <p className="nl-shift__muted">{H.noPeople}</p> : null}
        <Select
          label={H.personField}
          placeholder={H.personPlaceholder}
          value={person}
          onChange={setPerson}
          options={(people || []).map((p) => ({ value: p.user, label: p.name }))}
          disabled={Boolean(busy) || nobody}
        />
        <Field
          kind="money"
          label={H.countedField}
          helper={H.countedHelp}
          value={digits}
          onChange={setDigits}
          maxLength={9}
          data-autofocus=""
          disabled={Boolean(busy)}
          onKeyDown={(event) => event.key === 'Enter' && seeDifference()}
          id={FIELD_ID}
        />
        <Field label={H.noteField} helper={H.noteHelp} value={note} onChange={setNote} maxLength={140} disabled={Boolean(busy)} id="nl-handover-note" />
        {errorBox}
      </div>
    );
  } else if (step === 'check') {
    heading = H.checkName;
    intro = H.checkIntro;
    footer = (
      <>
        <Button variant="secondary" size="till" onClick={() => { setError(''); setStep('count'); }} disabled={Boolean(busy)}>
          {H.back}
        </Button>
        <Button size="till" onClick={handIt} loading={busy === 'handover'}>
          {busy === 'handover' ? H.handingOver : H.handOver}
        </Button>
      </>
    );
    body = (
      <div ref={stepBox} tabIndex={-1} className="nl-shift__step">
        <p className="nl-shift__strong">{fill(H.takingOver, { person: chosenName })}</p>
        <table className="nl-shift__table">
          <tbody>
            <tr>
              <th scope="row">{H.expectedCash}</th>
              <td>{formatMoney(expected)}</td>
            </tr>
            <tr>
              <th scope="row">{H.countedCash}</th>
              <td>{formatMoney(counted)}</td>
            </tr>
            <tr className="nl-shift__difference">
              <th scope="row">{H.difference}</th>
              <td>
                <span role="status" className={`nl-shift__word is-${view.tone}`} data-word={view.word}>
                  <Icon name={view.icon} />
                  <span>{view.text}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="nl-shift__muted">{differenceHint(view.word)}</p>
        <p className="nl-shift__muted">{fill(H.startsWith, { person: chosenName, amount: formatMoney(counted) })}</p>
        <p className="nl-shift__muted">{H.carryNote}</p>
        {errorBox}
      </div>
    );
  } else {
    heading = H.doneName;
    intro = undefined;
    const next = result && result.nextShift;
    const amount = formatMoney(next ? next.float : result && result.float !== null ? result.float : counted);
    let line;
    if (next) line = fill(H.handedOver, { person: next.person || chosenName, amount });
    else if (result && result.outcome !== 'closed') line = fill(H.stillClosing, { person: chosenName });
    else line = fill(H.notOpened, { person: chosenName, amount });
    footer = (
      <Button size="till" ref={doneButton} onClick={onClose}>
        {H.done}
      </Button>
    );
    body = (
      <div role="status" className="nl-shift__done">
        <p className={next ? 'nl-shift__success' : 'nl-shift__alert'}>
          <Icon name={next ? 'check' : 'alert'} />
          <span>{line}</span>
        </p>
      </div>
    );
  }

  return (
    <Dialog open onClose={onClose} title={heading} description={intro} busy={Boolean(busy)} footer={footer} className="nl-shift">
      {body}
    </Dialog>
  );
};

export default HandoverDialog;
