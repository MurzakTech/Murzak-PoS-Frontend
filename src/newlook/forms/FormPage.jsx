import React, { useId, useState } from 'react';
import Button from '../components/Button';
import { ConfirmDialog } from '../components/Dialog';
import Icon from '../components/Icon';
import { PageHeader } from '../shell';
import fill from '../labels/fill';
import useLeaveGuard from './useLeaveGuard';
import T from './strings.forms';
import './forms.css';

/**
 * The Form page pattern (Spec: Page patterns): one column up to 640px wide with the essential fields first and the rest
 * under "More options", and a sticky footer that holds Cancel, Save and add another, and Save. The page says "Not saved yet"
 * until a real save and then "Saved"; leaving with unsaved changes asks first; errors show beside the field (the screen's job,
 * through each Field's `error`) and again in a summary at the top that links to each field.
 *
 *   title, subtitle   the page header
 *   dirty             anything has been changed and not saved (turns the leave question on)
 *   saved             the last save worked (shown as "Saved" until the form changes again)
 *   saving            a save is running (Save shows a spinner and waits)
 *   errors            [{ id, message }]: the id of each field with a problem, and what is wrong with it
 *   onSave, onSaveAndAdd, onCancel   what the buttons do; omit onSaveAndAdd to hide that button
 *   saveLabel         the primary button's words (default Save)
 */
export const MoreOptions = ({ children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="nl-more">
      <Button variant="ghost" size="small" icon={open ? 'chevronDown' : 'plus'} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={id}>
        {open ? T.moreOptions.hide : T.moreOptions.show}
      </Button>
      <div id={id} hidden={!open} className="nl-more__body">
        {children}
      </div>
    </div>
  );
};

const FormPage = ({ title, subtitle, dirty = false, saved = false, saving = false, errors = [], onSave, onSaveAndAdd, onCancel, saveLabel = T.actions.save, children }) => {
  const guard = useLeaveGuard(dirty);
  const status = saving ? T.status.saving : saved && !dirty ? T.status.saved : T.status.notSaved;
  const focusField = (id) => {
    const el = document.getElementById(id);
    if (el) el.focus();
  };

  return (
    <div className="nl-form-page">
      <PageHeader title={title} subtitle={subtitle} />
      <form
        className="nl-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && onSave) onSave();
        }}
      >
        {errors.length > 0 ? (
          <div className="nl-form__summary" role="alert">
            <Icon name="alert" />
            <div>
              <p className="nl-form__summary-title">{errors.length === 1 ? T.summary.one : fill(T.summary.many, { count: errors.length })}</p>
              <ul>
                {errors.map((error) => (
                  <li key={error.id}>
                    <button type="button" className="nl-form__summary-link" onClick={() => focusField(error.id)}>
                      {error.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <div className="nl-form__fields">{children}</div>
        <div className="nl-form__footer">
          <p className={`nl-form__status${saved && !dirty ? ' is-saved' : ''}`} role="status">
            {saved && !dirty && !saving ? <Icon name="check" /> : null}
            {status}
          </p>
          <div className="nl-form__buttons">
            {onCancel ? (
              <Button variant="ghost" onClick={onCancel} disabled={saving}>
                {T.actions.cancel}
              </Button>
            ) : null}
            {onSaveAndAdd ? (
              <Button variant="secondary" onClick={onSaveAndAdd} disabled={saving}>
                {T.actions.saveAndAdd}
              </Button>
            ) : null}
            <Button type="submit" loading={saving}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog open={guard.open} title={T.leave.title} message={T.leave.message} confirmLabel={T.leave.leave} cancelLabel={T.leave.stay} destructive onConfirm={guard.leave} onCancel={guard.stay} />
    </div>
  );
};

export default FormPage;
