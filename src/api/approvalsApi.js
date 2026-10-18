import { callServer } from './serverCall';

/**
 * Approvals: a refund or a purchase order above a limit waits for a manager.
 * Each business sets its own limits (0 switches a check off).
 */

const APPROVALS = 'murzak_pos.api.approvals_api';

export const STATUSES = ['Pending', 'Approved', 'Rejected'];

export const getApprovalSettings = async (company) => {
  const body = await callServer(`${APPROVALS}.get_approval_settings`, { company }, { get: true, fallback: 'The approval limits could not be loaded.' });
  return {
    refundLimit: Number(body.data?.refund_limit) || 0,
    purchaseOrderLimit: Number(body.data?.purchase_order_limit) || 0,
  };
};

export const saveApprovalSettings = async (company, { refundLimit, purchaseOrderLimit }) => {
  const body = await callServer(`${APPROVALS}.save_approval_settings`, {
    company,
    refund_limit: Number(refundLimit) || 0,
    purchase_order_limit: Number(purchaseOrderLimit) || 0,
  }, { fallback: 'The approval limits could not be saved.' });
  return {
    refundLimit: Number(body.data?.refund_limit) || 0,
    purchaseOrderLimit: Number(body.data?.purchase_order_limit) || 0,
  };
};

export const listApprovals = async (company, status) => {
  const body = await callServer(`${APPROVALS}.list_approvals`, { company, status }, { get: true, fallback: 'The approval requests could not be loaded.' });
  return body.data?.data || [];
};

export const approveRequest = (name) =>
  callServer(`${APPROVALS}.approve_request`, { name }, { fallback: 'The request could not be approved.' });

export const rejectRequest = (name, reason) =>
  callServer(`${APPROVALS}.reject_request`, { name, reason }, { fallback: 'The request could not be rejected.' });

/** True when a server reply says the document was saved but is waiting for approval. */
export const isWaitingForApproval = (reply) =>
  Boolean(reply?.approval?.approval_required || reply?.data?.approval_required || reply?.code === 'APPROVAL_REQUIRED');

/** One plain sentence for the person who just sent a refund or an order that now waits. */
export const waitingMessage = (reply) => {
  const info = reply?.approval || reply?.data || {};
  const what = info.document ? ` (${info.document})` : '';
  return `This is above the approval limit, so it was saved${what} and sent to a manager. It is not final until they approve it.`;
};
