import React, { useEffect, useRef } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import Icon from '../components/Icon';
import useLeaveGuard from '../forms/useLeaveGuard';
import T from './strings.settings';

const W = T.shell;

/**
 * One card of the Settings page (Spec: Page patterns, "Settings page"): its own Save button that says "Saved" when it
 * works, an error in words when it does not, and a question before the person leaves with changes that are not saved.
 * Cards save on their own, so one card's save never touches another.
 *
 *   id            the card's name in the address (?section=<id> highlights it)
 *   dirty         something has been changed and not saved (turns the leave question on)
 *   saved         the last save worked (shown until the card changes again)
 *   saving        a save is running
 *   error         a sentence for a problem that is not about one field (a refusal from the server)
 *   onSave, onUndo  what the buttons do
 *   canEdit       false hides Save (the person may look but not change)
 *   highlighted   the address asked for this card: it is outlined and brought into view
 *
 * A card with nothing to save (a list of links, a read-only line) is a Card from the shared components, not this.
 */
const SettingsCard = ({ id, title, subtitle, dirty = false, saved = false, saving = false, error = '', onSave, onUndo, canEdit = true, highlighted = false, children }) => {
  const guard = useLeaveGuard(dirty);
  const box = useRef(null);

  useEffect(() => {
    if (highlighted && box.current && box.current.scrollIntoView) box.current.scrollIntoView({ block: 'start' });
  }, [highlighted]);

  const status = saving ? W.status.saving : dirty ? W.status.notSaved : saved ? W.status.saved : '';

  return (
    <div ref={box} id={id ? `settings-card-${id}` : undefined} className={['nl-settings-card', highlighted && 'is-highlighted'].filter(Boolean).join(' ')} data-card={id}>
      <Card title={title} subtitle={subtitle}>
        <form
          className="nl-settings-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!saving && dirty && onSave) onSave();
          }}
        >
          <div className="nl-settings-fields">{children}</div>
          {error ? (
            <p className="nl-settings-error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
            </p>
          ) : null}
          {canEdit ? (
            <div className="nl-settings-footer">
              <p className={`nl-settings-status${saved && !dirty && !saving ? ' is-saved' : ''}`} role="status">
                {saved && !dirty && !saving ? <Icon name="check" /> : null}
                {status}
              </p>
              <div className="nl-settings-buttons">
                {dirty && onUndo ? (
                  <Button variant="ghost" onClick={onUndo} disabled={saving}>
                    {W.undo}
                  </Button>
                ) : null}
                <Button type="submit" loading={saving} disabled={!dirty}>
                  {W.save}
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </Card>
      <ConfirmDialog open={guard.open} title={W.leave.title} message={W.leave.message} confirmLabel={W.leave.leave} cancelLabel={W.leave.stay} destructive onConfirm={guard.leave} onCancel={guard.stay} />
    </div>
  );
};

export default SettingsCard;
