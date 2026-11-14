import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoidApprovalDialog from './VoidApprovalDialog';
import { approveVoid, listVoidApprovers } from '../../../api/industryApi';

jest.mock('../../../api/industryApi', () => ({
  approveVoid: jest.fn(),
  listVoidApprovers: jest.fn(),
}));

const LINES = [{ item_code: 'BEER', item_name: 'Tusker', qty: 2, rate: 350 }];
const REASONS = ['Guest changed their mind', 'Wrong item entered'];

const open = (props = {}) => {
  const onApproved = jest.fn();
  const onClose = jest.fn();
  render(<VoidApprovalDialog open lines={LINES} billLabel="Table 4" warehouse="Main" company="Bar Ltd" onApproved={onApproved} onClose={onClose} {...props} />);
  return { onApproved, onClose };
};

beforeEach(() => {
  approveVoid.mockReset();
  listVoidApprovers.mockReset();
});

test('a waiter needs a manager and their password, and the item comes off only after the server approves', async () => {
  listVoidApprovers.mockResolvedValue({ needs_approver: true, approvers: [{ user: 'mgr@bar.test', name: 'Mary Manager' }], reasons: REASONS });
  approveVoid.mockResolvedValue({ void: 'V1', approved_by: 'mgr@bar.test', approved_by_name: 'Mary Manager' });
  const { onApproved } = open();
  expect(screen.getByText(/2 × Tusker on Table 4/)).toBeInTheDocument();
  await screen.findByLabelText(/Manager's password/);
  const approve = screen.getByRole('button', { name: 'Approve and remove' });
  expect(approve).toBeDisabled();

  await userEvent.click(screen.getByText('Guest changed their mind'));
  expect(approve).toBeDisabled(); // still needs the password
  await userEvent.type(screen.getByLabelText(/Manager's password/), 'secret');
  await userEvent.click(approve);

  await waitFor(() => expect(onApproved).toHaveBeenCalledWith({ approvedBy: 'Mary Manager', reason: 'Guest changed their mind' }));
  expect(approveVoid).toHaveBeenCalledWith(
    expect.objectContaining({ itemCode: 'BEER', qty: 2, rate: 350, reason: 'Guest changed their mind', billLabel: 'Table 4', warehouse: 'Main', approver: 'mgr@bar.test', password: 'secret', company: 'Bar Ltd' })
  );
});

test('a manager at the till approves their own, with a reason but no password', async () => {
  listVoidApprovers.mockResolvedValue({ needs_approver: false, approvers: [], reasons: [] });
  approveVoid.mockResolvedValue({ approved_by_name: 'Mary Manager' });
  const { onApproved } = open();
  await screen.findByText(/you approve this yourself/i);
  expect(screen.queryByLabelText(/Manager's password/)).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/Reason/), 'Spilled');
  await userEvent.click(screen.getByRole('button', { name: 'Approve and remove' }));
  await waitFor(() => expect(onApproved).toHaveBeenCalled());
  expect(approveVoid).toHaveBeenCalledWith(expect.objectContaining({ approver: '', password: '' }));
});

test('a refusal (a wrong password) keeps the item and says why', async () => {
  listVoidApprovers.mockResolvedValue({ needs_approver: true, approvers: [{ user: 'mgr@bar.test', name: 'Mary Manager' }], reasons: REASONS });
  approveVoid.mockRejectedValue(new Error("The manager's password is not right. Please try again."));
  const { onApproved } = open();
  await screen.findByLabelText(/Manager's password/);
  await userEvent.click(screen.getByText('Wrong item entered'));
  await userEvent.type(screen.getByLabelText(/Manager's password/), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Approve and remove' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/password is not right/);
  expect(onApproved).not.toHaveBeenCalled();
});

test('when the server cannot be reached, nothing can be removed', async () => {
  listVoidApprovers.mockRejectedValue(new Error('No connection.'));
  open();
  expect(await screen.findByText(/stays on the bill until a manager can approve/)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/Reason/), 'Spilled');
  expect(screen.getByRole('button', { name: 'Approve and remove' })).toBeDisabled();
});
