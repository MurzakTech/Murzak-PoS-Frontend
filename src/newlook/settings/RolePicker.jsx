import React, { useId } from 'react';
import { Chip } from '../components/Chip';
import Icon from '../components/Icon';
import { TIERS } from './teamModel';
import T from './strings.settings';

/**
 * Choose what a person will do: three cards, one for each kind (Owner, Manager or Cashier), each saying in plain words who it is
 * for and what that kind can and cannot do. The Owner card carries an Admin mark, because the owner is the person who adds people
 * and changes the shop's settings. It is a radio group, so the arrow keys move between the cards and a screen reader reads each
 * card's whole description.
 *
 *   value     the chosen kind ('owner', 'manager' or 'cashier')
 *   onChange(kind)
 *   disabled  the kind cannot be changed (the person is yourself, or the only owner); `note` says why, once, under the cards
 *   label     the group's name
 *   error     a problem to show under the cards
 */
const RolePicker = ({ value, onChange, disabled = false, note, label, error }) => {
  const name = useId();
  const noteId = `${name}-note`;
  return (
    <fieldset className="nl-rolepicker" disabled={disabled} aria-describedby={note || error ? noteId : undefined}>
      <legend className="nl-label">{label}</legend>
      <div className="nl-rolepicker__cards">
        {TIERS.map((kind) => {
          const chosen = value === kind;
          return (
            <label key={kind} className={['nl-rolecard', chosen && 'is-chosen', disabled && 'is-disabled'].filter(Boolean).join(' ')}>
              <input type="radio" className="nl-rolecard__input" name={name} value={kind} checked={chosen} onChange={() => onChange(kind)} />
              <span className="nl-rolecard__top">
                <span className="nl-rolecard__title">{T.team.roles[kind]}</span>
                {kind === 'owner' ? <Chip tone="brand">{T.team.adminBadge}</Chip> : null}
                {chosen ? <Icon name="check" /> : null}
              </span>
              <span className="nl-rolecard__who">{T.team.roleWho[kind]}</span>
              <span className="nl-rolecard__can">{T.team.roleHints[kind]}</span>
            </label>
          );
        })}
      </div>
      {note || error ? (
        <p id={noteId} className={error ? 'nl-settings-error' : 'nl-settings-hint'} role={error ? 'alert' : undefined}>
          {error || note}
        </p>
      ) : null}
    </fieldset>
  );
};

export default RolePicker;
