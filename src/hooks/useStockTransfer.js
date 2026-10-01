import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createStockTransfer,
  approveStockTransfer,
  approveStockTransferWorkflow,
  dispatchStock,
  receiveStockDestination,
  confirmReceiveTransfer,
} from '../store/stockTransferSlice';

/**
 * Custom hook for stock transfer operations
 * Provides functions to create, approve, dispatch, and receive stock transfers
 * 
 * @returns {Object} Transfer operations and state
 * @returns {Function} createTransfer - Create a direct stock transfer
 * @returns {Function} approveTransfer - Approve a transfer request (no workflow)
 * @returns {Function} approveTransferWorkflow - Approve a transfer request (with workflow)
 * @returns {Function} dispatchStock - Dispatch stock from origin warehouse
 * @returns {Function} receiveStock - Receive stock at destination warehouse
 * @returns {Function} confirmReceive - Confirm receive transfer
 * @returns {boolean} loading - Loading state
 * @returns {boolean} isCreating - Creating transfer state
 * @returns {boolean} isApproving - Approving state
 * @returns {boolean} isDispatching - Dispatching state
 * @returns {boolean} isReceiving - Receiving state
 * @returns {string|null} error - Error message
 * 
 * @example
 * const { createTransfer, loading, error } = useStockTransfer();
 * 
 * const handleCreate = async () => {
 *   try {
 *     const result = await createTransfer({
 *       company: 'Savanna Ltd',
 *       posting_date: '2025-01-20',
 *       posting_time: '10:00:00',
 *       from_warehouse: 'Stores - HO',
 *       to_warehouse: 'Stores - Branch',
 *       items: [{ item_code: 'ITEM-001', qty: 10 }],
 *       notes: 'Transfer notes'
 *     });
 *     console.log('Transfer created:', result.stock_entry);
 *   } catch (err) {
 *     console.error('Error:', err);
 *   }
 * };
 */
export const useStockTransfer = () => {
  const dispatch = useAppDispatch();
  const {
    isLoading,
    isCreating,
    isApproving,
    isDispatching,
    isReceiving,
    error,
  } = useAppSelector((state) => state.stockTransfer);

  /**
   * Create a direct stock transfer
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.company - Company name
   * @param {string} transferData.posting_date - Posting date (YYYY-MM-DD)
   * @param {string} transferData.posting_time - Posting time (HH:MM:SS)
   * @param {string} transferData.from_warehouse - Source warehouse
   * @param {string} transferData.to_warehouse - Destination warehouse
   * @param {Array} transferData.items - Array of items [{ item_code, qty }]
   * @param {string} [transferData.notes] - Optional notes
   * @returns {Promise} Promise that resolves with transfer result
   */
  const createTransfer = useCallback(
    async (transferData) => {
      return dispatch(createStockTransfer(transferData));
    },
    [dispatch]
  );

  /**
   * Approve a stock transfer request (no workflow)
   * @param {string} requestId - Material Request ID
   * @param {string} approvedBy - Approver email
   * @param {string} [approvalNotes] - Optional approval notes
   * @returns {Promise} Promise that resolves with approval result
   */
  const approveTransfer = useCallback(
    async (requestId, approvedBy, approvalNotes = '') => {
      return dispatch(
        approveStockTransfer({
          request_id: requestId,
          approved_by: approvedBy,
          approval_notes: approvalNotes,
        })
      );
    },
    [dispatch]
  );

  /**
   * Approve a stock transfer request (with workflow)
   * @param {string} requestId - Material Request ID
   * @param {string} approvedBy - Approver email (must match logged-in user)
   * @param {string} [approvalNotes] - Optional approval notes
   * @returns {Promise} Promise that resolves with approval result
   */
  const approveTransferWorkflow = useCallback(
    async (requestId, approvedBy, approvalNotes = '') => {
      return dispatch(
        approveStockTransferWorkflow({
          request_id: requestId,
          approved_by: approvedBy,
          approval_notes: approvalNotes,
        })
      );
    },
    [dispatch]
  );

  /**
   * Dispatch stock from origin warehouse
   * @param {Object} dispatchData - Dispatch data
   * @param {string} dispatchData.request_id - Material Request ID
   * @param {string} dispatchData.origin_warehouse - Origin warehouse
   * @param {Array} dispatchData.items - Array of items [{ item_code, dispatched_qty }]
   * @param {string} dispatchData.dispatched_by - Dispatcher email
   * @param {string} [dispatchData.dispatch_notes] - Optional dispatch notes
   * @returns {Promise} Promise that resolves with dispatch result
   */
  const dispatchStockTransfer = useCallback(
    async (dispatchData) => {
      return dispatch(dispatchStock(dispatchData));
    },
    [dispatch]
  );

  /**
   * Receive stock at destination warehouse
   * @param {Object} receiveData - Receive data
   * @param {string} receiveData.request_id - Material Request ID
   * @param {string} receiveData.destination_warehouse - Destination warehouse
   * @param {Array} receiveData.items - Array of items [{ item_code, received_qty }]
   * @param {string} receiveData.received_by - Receiver email
   * @param {string} [receiveData.receive_notes] - Optional receive notes
   * @param {string} [receiveData.goods_received_note] - Optional GRN number
   * @returns {Promise} Promise that resolves with receive result
   */
  const receiveStock = useCallback(
    async (receiveData) => {
      return dispatch(receiveStockDestination(receiveData));
    },
    [dispatch]
  );

  /**
   * Confirm receive transfer
   * @param {string} stockEntryName - Stock Entry name
   * @returns {Promise} Promise that resolves with confirmation result
   */
  const confirmReceive = useCallback(
    async (stockEntryName) => {
      return dispatch(confirmReceiveTransfer({ stock_entry_name: stockEntryName }));
    },
    [dispatch]
  );

  return {
    createTransfer,
    approveTransfer,
    approveTransferWorkflow,
    dispatchStock: dispatchStockTransfer,
    receiveStock,
    confirmReceive,
    loading: isLoading,
    isCreating,
    isApproving,
    isDispatching,
    isReceiving,
    error,
  };
};

