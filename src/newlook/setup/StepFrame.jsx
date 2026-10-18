import React, { useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { FormPage } from '../forms';
import fill from '../labels/fill';
import { STEP_KEYS, stepNumber, stepStatus, previousKey } from './setupModel';
import T from './strings.setup';
import './setup.css';

/** The list of the six steps: where you are, what is done and what was skipped (words as well as marks) */
export const StepList = ({ state, current }) => (
  <ol className="nl-setup-steps" aria-label={T.listLabel}>
    {STEP_KEYS.map((key) => {
      const status = stepStatus(state, key, current);
      return (
        <li key={key} className={`nl-setup-steps__item is-${status}`} aria-current={status === 'current' ? 'step' : undefined}>
          {status === 'done' ? <Icon name="check" /> : null}
          <span>{T.steps[key]}</span>{' '}
          {status !== 'todo' ? <span className="nl-setup-steps__state">({T.stepState[status]})</span> : null}
        </li>
      );
    })}
  </ol>
);

/**
 * The frame every step sits in: the Form page (title, "Not saved yet" or "Saved", errors, sticky footer) with the list of steps
 * above the step's own fields, and Back, Skip this step and Skip for now below them. A step gives it what is special:
 *
 *   ctx        what the wizard offers (state, step, back, skip, skipAll, complete, leave)
 *   stepKey    this step
 *   heading, help   the step's own title and one line of help
 *   dirty, saved    the Form page's "Not saved yet" and "Saved"
 *   errors     [{ id, message }] for the fields with a problem
 *   onSave     what Save and continue does (default: mark the step done and move on); it may throw, and the message is shown
 *   saveLabel  replaces the default words of the Save button
 *   canSkip    false for a step that should not offer "Skip this step"
 */
const StepFrame = ({ ctx, stepKey, heading, help, dirty = false, saved = false, errors = [], onSave, saveLabel, canSkip = true, children }) => {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const alive = useRef(true);
  const title = useRef(null);
  useEffect(() => {
    alive.current = true;
    // A new step starts at its heading, so a screen reader hears where it is
    if (title.current) title.current.focus();
    return () => {
      alive.current = false;
    };
  }, []);

  const run = (work) => async () => {
    setBusy(true);
    setFailure('');
    try {
      await work();
    } catch (error) {
      if (alive.current) setFailure((error && error.message) || T.saveFailed);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const last = stepKey === STEP_KEYS[STEP_KEYS.length - 1];
  const back = previousKey(stepKey);
  const all = failure ? [...errors, { id: 'setup-general', message: failure }] : errors;

  return (
    <FormPage
      title={T.title}
      subtitle={fill(T.subtitle, { number: stepNumber(stepKey), total: STEP_KEYS.length })}
      dirty={dirty}
      saved={saved}
      saving={busy}
      errors={all}
      onSave={run(onSave || (() => (last ? ctx.finishWith(stepKey) : ctx.complete(stepKey))))}
      onCancel={ctx.leave}
      saveLabel={saveLabel || (last ? T.actions.finish : T.actions.next)}
    >
      <div id="setup-general" tabIndex={-1} />
      <StepList state={ctx.state} current={stepKey} />
      {ctx.state.finished ? <p className="nl-setup-note">{T.finishedAgain}</p> : null}
      <div className="nl-setup-heading">
        <h2 className="nl-setup-heading__title" tabIndex={-1} ref={title}>
          {heading}
        </h2>
        {help ? <p className="nl-setup-heading__text">{help}</p> : null}
      </div>
      {children}
      <div className="nl-setup-tools">
        {back ? (
          <Button variant="ghost" icon="chevronLeft" disabled={busy} onClick={() => ctx.goTo(back)}>
            {T.actions.back}
          </Button>
        ) : null}
        <span className="nl-setup-tools__spacer" />
        {canSkip ? (
          <Button variant="secondary" disabled={busy} onClick={run(() => ctx.skip(stepKey))}>
            {T.actions.skipStep}
          </Button>
        ) : null}
      </div>
      <div className="nl-setup-skipall">
        <Button variant="ghost" size="small" disabled={busy} onClick={run(() => ctx.skipAll())}>
          {T.actions.skipSetup}
        </Button>
        <p className="nl-setup-note">{T.skipSetupHelp}</p>
      </div>
    </FormPage>
  );
};

export default StepFrame;
