import axiosInstance from './axiosInstance';
import {
  approveRequest, getApprovalSettings, isWaitingForApproval, listApprovals, saveApprovalSettings, waitingMessage,
} from './approvalsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());

it('reads the limits as numbers', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { refund_limit: '500', purchase_order_limit: 0 } } } });
  expect(await getApprovalSettings('Acme')).toEqual({ refundLimit: 500, purchaseOrderLimit: 0 });
  expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.approvals_api.get_approval_settings', { params: { company: 'Acme' } });
});

it('sends the limits under the names the server uses', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: true, data: { refund_limit: 100, purchase_order_limit: 2000 } } } });
  await saveApprovalSettings('Acme', { refundLimit: '100', purchaseOrderLimit: '2000' });
  expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.approvals_api.save_approval_settings', {
    company: 'Acme', refund_limit: 100, purchase_order_limit: 2000,
  });
});

it('lists requests and leaves an empty status out of the question', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { data: [{ name: 'APR-1' }], count: 1 } } } });
  expect(await listApprovals('Acme', '')).toEqual([{ name: 'APR-1' }]);
  expect(axiosInstance.get.mock.calls[0][1]).toEqual({ params: { company: 'Acme' } });
});

it('turns a refusal into a plain error that keeps the reply', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'You cannot approve your own request. Ask another manager.' } } });
  await expect(approveRequest('APR-1')).rejects.toThrow('You cannot approve your own request');
});

it('recognises a document that is waiting for approval, from a return or from an order', () => {
  expect(isWaitingForApproval({ approval: { approval_required: true, document: 'SINV-9' } })).toBe(true);
  expect(isWaitingForApproval({ code: 'APPROVAL_REQUIRED', data: { approval_required: true } })).toBe(true);
  expect(isWaitingForApproval({ approval: null, data: { name: 'SINV-9' } })).toBe(false);
  expect(waitingMessage({ approval: { document: 'SINV-9' } })).toContain('SINV-9');
});
