import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { formatMoney } from '../components/format';
import { getTillState, previewClose, closeTill } from '../../api/tillApi';
import { cashRow, countedFor, differenceHint, differenceView, hasCount, isInfoLine, openedLine, openingFloat, otherRows, sessionName } from './shiftModel';
import T from './strings.shift';
import CT from './strings.cash';
import fill from '../labels/fill';
import './till.css';

const C = T.close;
const FIELD_ID = 'nl-shift-counted';
const messageOf = (error, fallback) => (error && error.message ? error.message : fallback);

/**
 * The shift-end count (Spec: Till, "Closing the shift asks for counted cash and shows expected cash and the
 * difference"; AC-23). Two steps in one dialog, then a confirmation:
 *
 *   Count the cash       the cashier types what is in the drawer (digits only, KES). "See the difference" is on only
 *                        when a number is typed; 0 is a number.
 *   Check and end shift  the server's figures: expected cash (opening float plus cash sales), counted cash and the
 *                        difference as an icon and a word. M-Pesa and card are plain lines with nothing to count.
 *                        The session closes ONLY when the cashier presses Close till.
 *   Till closed          a role=status message with what was counted and expected, and a Done button.
 *
 *   open, onClose   showing, and what Escape, Keep selling, Back to the page and Done do (Escape waits while a call runs)
 *   session         the session record { name, cashier_name, opened_at, opening } or just its name
 *   onReport(name)  the See the shift report button of the confirmation (shown only when the parent gives it)
 *   onClosed(result) called once, when the server has closed the session (the dialog stays to show the confirmation;
 *                   the parent closes it from onClose)
 *   load, preview, close   the three server calls, replaceable in tests
 */
const ShiftCloseDialog = ({ open, ...rest }) => (open ? <ShiftClose {...rest} /> : null);

const ShiftClose = ({ onClose, session, onClosed, onReport, load = getTillState, preview = previewClose, close = closeTill }) => {
  const [step, setStep] = useState('count');
  const [digits, setDigits] = useState('');
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const gone = useRef(false);
  const working = useRef(false); // set at once, so a double press cannot start two calls before the screen redraws
  const stepBox = useRef(null);
  const doneButton = useRef(null);
  const name = sessionName(session);
  const record = session && typeof session === 'object' ? session : null;

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  const loadState = useCallback(() => {
    setLoadError('');
    Promise.resolve()
      .then(() => load({ pos_profile: record ? record.pos_profile : undefined }))
      .then((data) => !gone.current && setState(data))
      .catch(() => !gone.current && setLoadError(C.loadFailed));
    // The session record is read once, when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // After a step change the old focus is gone: move it to the new step so keyboard and screen reader users follow
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (step === 'count') {
      const input = document.getElementById(FIELD_ID);
      if (input) input.focus();
    }
    else if (step === 'done' && doneButton.current) doneButton.current.focus();
    else if (stepBox.current) stepBox.current.focus();
  }, [step]);

  const seeDifference = async () => {
    if (!hasCount(digits) || working.current) return;
    working.current = true;
    setBusy('preview');
    setError('');
    try {
      const reply = await preview({ session: name, counted: countedFor(state, digits) });
      if (gone.current) return;
      setResult(reply);
      setStep('check');
    } catch (e) {
      if (!gone.current) setError(messageOf(e, C.previewFailed));
    } finally {
      working.current = false;
      if (!gone.current) setBusy('');
    }
  };

  const closeIt = async () => {
    if (working.current) return;
    working.current = true;
    setBusy('close');
    setError('');
    try {
      const reply = await close({ session: name, counted: countedFor(state, digits) });
      if (gone.current) return;
      setResult(reply);
      setStep('done');
      if (onClosed) onClosed(reply);
    } catch (e) {
      if (!gone.current) setError(messageOf(e, C.closeFailed));
    } finally {
      working.current = false;
      if (!gone.current) setBusy('');
    }
  };

  const cash = cashRow(state);
  const lines = (result && result.lines) || [];
  const cashLine = lines.find((l) => l.key === 'cash') || null;
  const expected = cashLine ? cashLine.expected : result ? result.total_expected : 0;
  const counted = cashLine && cashLine.counted !== null ? cashLine.counted : result ? result.total_counted : 0;
  const view = result ? differenceView(result.difference, result.word) : null;
  const infoRows = state ? otherRows(state) : lines.filter((l) => l !== cashLine && isInfoLine(l));
  const floatAmount = openingFloat(record, state);
  const who = openedLine(record);

  const errorBox = error ? (
    <p role="alert" className="nl-shift__alert">
      <Icon name="alert" />
      <span>{error}</span>
    </p>
  ) : null;

  const sessionBlock = (
    <div className="nl-shift__session">
      {name ? <p className="nl-shift__strong">{fill(C.sessionLine, { session: name })}</p> : null}
      {who ? <p className="nl-shift__muted">{who}</p> : null}
      {floatAmount > 0 || cash ? <p className="nl-shift__muted">{fill(C.openingFloat, { amount: formatMoney(floatAmount) })}</p> : null}
    </div>
  );

  let body;
  let footer;
  let heading = C.countName;
  let intro = C.countIntro;

  if (step === 'count') {
    footer = (
      <>
        <Button variant="secondary" size="till" onClick={onClose} disabled={Boolean(busy)}>
          {C.cancel}
        </Button>
        <Button size="till" onClick={seeDifference} disabled={!hasCount(digits)} loading={busy === 'preview'}>
          {busy === 'preview' ? C.working : C.seeDifference}
        </Button>
      </>
    );
    body = (
      <>
        {sessionBlock}
        {loadError ? (
          <div role="alert" className="nl-shift__alert">
            <Icon name="alert" />
            <span>{loadError}</span>
            <Button variant="ghost" size="small" onClick={loadState}>
              {C.tryAgain}
            </Button>
          </div>
        ) : null}
        <Field
          kind="money"
          label={C.countedField}
          helper={C.countedHelp}
          value={digits}
          onChange={setDigits}
          maxLength={9}
          data-autofocus=""
          disabled={busy === 'preview'}
          onKeyDown={(event) => event.key === 'Enter' && seeDifference()}
          id={FIELD_ID}
        />
        {errorBox}
      </>
    );
  } else if (step === 'check') {
    heading = C.checkName;
    intro = C.checkIntro;
    footer = (
      <>
        <Button variant="secondary" size="till" onClick={() => { setError(''); setStep('count'); }} disabled={Boolean(busy)}>
          {C.back}
        </Button>
        <Button size="till" onClick={closeIt} loading={busy === 'close'}>
          {busy === 'close' ? C.closing : C.closeTill}
        </Button>
      </>
    );
    body = (
      <div ref={stepBox} tabIndex={-1} className="nl-shift__step">
        {sessionBlock}
        <table className="nl-shift__table">
          <caption className="nl-visually-hidden">{C.figures}</caption>
          <tbody>
            <tr>
              <th scope="row">
                {C.expectedCash}
                <span className="nl-shift__sub">{C.expectedParts}</span>
              </th>
              <td>{formatMoney(expected)}</td>
            </tr>
            {cash ? (
              <>
                <tr className="nl-shift__part">
                  <th scope="row">{C.partOpening}</th>
                  <td>{formatMoney(cash.opening)}</td>
                </tr>
                <tr className="nl-shift__part">
                  <th scope="row">{C.partSales}</th>
                  <td>{formatMoney(cash.sales)}</td>
                </tr>
                {cash.paid_in > 0 ? (
                  <tr className="nl-shift__part">
                    <th scope="row">{C.partPaidIn}</th>
                    <td>{formatMoney(cash.paid_in)}</td>
                  </tr>
                ) : null}
                {cash.refunds > 0 ? (
                  <tr className="nl-shift__part">
                    <th scope="row">{C.partRefunds}</th>
                    <td>{formatMoney(-cash.refunds)}</td>
                  </tr>
                ) : null}
                {cash.paid_out > 0 ? (
                  <tr className="nl-shift__part">
                    <th scope="row">{C.partPaidOut}</th>
                    <td>{formatMoney(-cash.paid_out)}</td>
                  </tr>
                ) : null}
              </>
            ) : null}
            <tr>
              <th scope="row">{C.countedCash}</th>
              <td>{formatMoney(counted)}</td>
            </tr>
            <tr className="nl-shift__difference">
              <th scope="row">{C.difference}</th>
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
        {infoRows.length ? (
          <div className="nl-shift__others">
            <h3 className="nl-shift__small-heading">{C.otherMethods}</h3>
            <ul className="nl-shift__list">
              {infoRows.map((row) => (
                <li key={row.mode}>{fill(C.noCount, { method: row.label || row.mode, amount: formatMoney(row.expected !== undefined ? row.expected : row.sales) })}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {errorBox}
      </div>
    );
  } else {
    heading = C.doneName;
    intro = undefined;
    footer = (
      <>
        {onReport ? (
          <Button variant="secondary" size="till" icon="receipt" onClick={() => onReport(name)}>
            {CT.report.seeButton}
          </Button>
        ) : null}
        <Button size="till" ref={doneButton} onClick={onClose}>
          {C.done}
        </Button>
      </>
    );
    body = (
      <div role="status" className="nl-shift__done">
        <p className="nl-shift__success">
          <Icon name="check" />
          <span>{fill(C.success, { counted: formatMoney(counted), expected: formatMoney(expected) })}</span>
        </p>
        <p className="nl-shift__word-line">{fill(C.successDifference, { difference: view.text })}</p>
        {result.outcome === 'closing' ? <p className="nl-shift__muted">{C.closingInBackground}</p> : null}
      </div>
    );
  }

  return (
    <Dialog open onClose={onClose} title={heading} description={intro} busy={Boolean(busy)} footer={footer} className="nl-shift">
      {body}
    </Dialog>
  );
};

export default ShiftCloseDialog;
