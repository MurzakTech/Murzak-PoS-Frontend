import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { useOverlay } from './overlay';

/**
 * Dialog and confirm (Part 1, Components): a surface with a 14px corner, the dialog shadow, a 16px 700 title.
 * Focus moves in, stays inside while it is open, and returns to the button that opened it. Escape closes.
 * A click outside does NOT close it: a dialog asks for a decision, and a stray click must never lose a sale.
 *
 *   open, onClose   whether it is showing, and what happens on Escape or the Close button
 *   title           the heading (read aloud as the dialog's name)
 *   description     one sentence under the title (read aloud with it)
 *   footer          the buttons, normally Buttons from this folder
 *   busy            a save is running: Escape and Close wait, so a half-saved form cannot be dismissed
 *
 * Put data-autofocus on the control that should have focus first. If none has it, the first control does.
 */
const Dialog = ({ open, onClose, title, description, children, footer, busy = false, role = 'dialog', closeLabel = 'Close', className = '' }) => {
  if (!open) return null;
  return (
    <DialogBox onClose={onClose} title={title} description={description} footer={footer} busy={busy} role={role} closeLabel={closeLabel} className={className}>
      {children}
    </DialogBox>
  );
};

const DialogBox = ({ onClose, title, description, children, footer, busy, role, closeLabel, className }) => {
  const box = useRef(null);
  const base = useId();
  useOverlay({ containerRef: box, onClose, closeOnEscape: !busy });

  return createPortal(
    <div className="nl-overlay">
      <div
        ref={box}
        role={role}
        aria-modal="true"
        aria-labelledby={`${base}-title`}
        aria-describedby={description ? `${base}-description` : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={`nl-dialog ${className}`.trim()}
      >
        <div className="nl-dialog__header">
          <h2 id={`${base}-title`} className="nl-dialog__title">
            {title}
          </h2>
          {onClose ? <Button variant="ghost" size="small" icon="x" aria-label={closeLabel} disabled={busy} onClick={onClose} /> : null}
        </div>
        {description ? (
          <p id={`${base}-description`} className="nl-dialog__description">
            {description}
          </p>
        ) : null}
        {children ? <div className="nl-dialog__body">{children}</div> : null}
        {footer ? <div className="nl-dialog__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

/**
 * A yes or no question. Cancel is on the left and the answer on the right. A destructive answer is red text,
 * and it is never the default: focus starts on Cancel, so pressing Enter at once cannot destroy anything.
 * Say in the message what will be lost. For three or more choices (the Leave-the-till dialog) use Dialog
 * with your own buttons and put data-autofocus on the safe one.
 */
export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, loading = false, onConfirm, onCancel }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    title={title}
    description={message}
    busy={loading}
    role={destructive ? 'alertdialog' : 'dialog'}
    footer={
      <>
        <Button variant="secondary" disabled={loading} onClick={onCancel} data-autofocus={destructive ? '' : undefined}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} loading={loading} onClick={onConfirm} data-autofocus={destructive ? undefined : ''}>
          {confirmLabel}
        </Button>
      </>
    }
  />
);

export default Dialog;
