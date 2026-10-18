import React from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Icon from '../components/Icon';
import T from './strings.till';
import fill from '../labels/fill';

/**
 * "Leave the till?" (Spec: Till, "asks before the cashier leaves"; AC-21): with items in the cart the cashier is offered
 * three ways out: Hold sale and leave, Leave and clear, or Stay. The first focus lands on Stay, so a stray Enter never
 * loses or moves a sale. A click outside does not close it (the shared Dialog never lets that decide anything).
 *
 *   itemCount       how many items are in the sale, for the message
 *   busy            the sale is being put on hold: the buttons wait
 *   error           why holding failed (the sale stays on screen)
 */
const LeaveTillDialog = ({ open, onStay, onHoldAndLeave, onLeaveAndClear, itemCount = 0, busy = false, error = '' }) => (
  <Dialog
    open={open}
    onClose={onStay}
    busy={busy}
    title={T.leave.title}
    description={itemCount === 1 ? T.leave.messageOne : itemCount > 1 ? fill(T.leave.messageCount, { count: itemCount }) : T.leave.message}
    footer={
      <>
        <Button variant="danger" onClick={onLeaveAndClear} disabled={busy}>
          {T.leave.clear}
        </Button>
        <Button variant="secondary" onClick={onHoldAndLeave} loading={busy} disabled={busy}>
          {busy ? T.leave.holding : T.leave.hold}
        </Button>
        <Button onClick={onStay} disabled={busy} data-autofocus>
          {T.leave.stay}
        </Button>
      </>
    }
  >
    {error ? (
      <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0, color: 'var(--bad)' }}>
        <Icon name="alert" />
        <span>{error}</span>
      </p>
    ) : null}
  </Dialog>
);

export default LeaveTillDialog;
