import React, { useState } from 'react';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { saveBusinessKind } from '../../api/setupApi';
import StepFrame from './StepFrame';
import { KIND_KEYS, isPassed } from './setupModel';
import { rememberBusinessFeatures } from './useBusinessFeatures';
import T from './strings.setup';

const B = T.business;
const STEP = 'business';
const FIELD_ID = `setup-kind-${KIND_KEYS[0]}`;

/**
 * Step 1, "What do you sell?" (asked once). Four plain choices; each says what it turns on. Saving keeps the answer for the whole
 * business and turns the matching features on: nothing is ever taken away. A kind chosen at sign-up is offered as the starting choice.
 */
const BusinessStep = ({ ctx }) => {
  const { state } = ctx;
  const toast = useToast();
  const [kind, setKind] = useState(state.kind || state.suggestedKind || '');
  const [problem, setProblem] = useState('');
  const dirty = kind !== (state.kind || '');
  const suggested = !state.kind && state.suggestedKind && kind === state.suggestedKind;

  const save = async () => {
    if (!kind) {
      setProblem(B.required);
      return;
    }
    const result = await saveBusinessKind(kind, ctx.company);
    rememberBusinessFeatures(ctx.company, result);
    toast.success(kind === 'other' ? B.savedOther : fill(B.saved, { kind: B.options[kind].label }));
    await ctx.complete(STEP, { progress: result, patch: { kind: result.kind, features: result.features } });
  };

  return (
    <StepFrame ctx={ctx} stepKey={STEP} heading={B.title} help={B.help} dirty={dirty} saved={isPassed(state, STEP)} errors={problem ? [{ id: FIELD_ID, message: problem }] : []} onSave={save}>
      <fieldset className="nl-setup-kinds" aria-invalid={problem ? true : undefined}>
        <legend className="nl-label">{B.group}</legend>
        {KIND_KEYS.map((key, index) => {
          const on = kind === key;
          const words = B.options[key];
          return (
            <label key={key} className={`nl-setup-kind${on ? ' is-selected' : ''}`} htmlFor={`setup-kind-${key}`}>
              <input
                id={`setup-kind-${key}`}
                className="nl-setup-kind__input"
                type="radio"
                name="setup-kind"
                value={key}
                checked={on}
                onChange={() => {
                  setKind(key);
                  setProblem('');
                }}
                data-first={index === 0 ? true : undefined}
              />
              <span className="nl-setup-kind__mark" aria-hidden="true" />
              <span className="nl-setup-kind__body">
                <span className="nl-setup-kind__label">{words.label}</span>
                <span className="nl-setup-kind__text">{words.text}</span>
                <span className="nl-setup-kind__features">
                  <strong>{B.turnsOn}</strong> {words.features}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {problem ? (
        <p className="nl-error" role="alert">
          <Icon name="alert" />
          <span>{problem}</span>
        </p>
      ) : suggested ? (
        <p className="nl-helper">{B.fromSignup}</p>
      ) : state.kind ? (
        <p className="nl-helper">{B.already}</p>
      ) : null}
    </StepFrame>
  );
};

export default BusinessStep;
