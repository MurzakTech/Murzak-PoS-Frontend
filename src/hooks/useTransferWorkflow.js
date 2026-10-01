import { useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useParams } from 'react-router-dom';
import {
  getStockTransferRequest,
  setWorkflowStep,
} from '../store/stockTransferSlice';
import {
  getWorkflowStep,
  calculateTransferProgress,
  canApproveTransfer,
  canDispatchTransfer,
  canReceiveTransfer,
  formatTransferRequest,
} from '../utils/stockTransferHelpers';

/**
 * Custom hook for managing stock transfer workflow state
 * Provides workflow state, actions, and computed properties for a specific transfer request
 * 
 * @param {string} [requestId] - Transfer request ID (optional, can be from URL params)
 * @returns {Object} Workflow state and operations
 * @returns {Object|null} request - Transfer request object
 * @returns {string|null} currentStep - Current workflow step (create, approve, dispatch, receive, complete)
 * @returns {string|null} workflowStep - Workflow step from state
 * @returns {number} progress - Transfer progress percentage (0-100)
 * @returns {boolean} canApprove - Whether transfer can be approved
 * @returns {boolean} canDispatch - Whether transfer can be dispatched
 * @returns {boolean} canReceive - Whether transfer can be received
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message
 * @returns {Function} refetch - Refetch request details
 * 
 * @example
 * // Using with URL params
 * const { request, currentStep, canApprove, loading } = useTransferWorkflow();
 * 
 * // Using with explicit request ID
 * const { request, currentStep } = useTransferWorkflow('MAT-MR-2025-00001');
 */
export const useTransferWorkflow = (requestId) => {
  const dispatch = useAppDispatch();
  const params = useParams();
  
  // Get request ID from params or prop
  const id = requestId || params?.id;
  
  const {
    selectedTransferRequest,
    currentWorkflowStep,
    isLoadingDetails,
    error,
  } = useAppSelector((state) => state.stockTransfer);

  /**
   * Refetch request details
   */
  const refetch = useCallback(() => {
    if (id) {
      dispatch(getStockTransferRequest({ request_id: id }));
    }
  }, [dispatch, id]);

  // Fetch request on mount and when ID changes
  useEffect(() => {
    if (id) {
      dispatch(getStockTransferRequest({ request_id: id }));
    }
  }, [dispatch, id]);

  // Compute current workflow step from status
  const computedStep = useMemo(() => {
    if (!selectedTransferRequest) return null;
    return getWorkflowStep(selectedTransferRequest.status);
  }, [selectedTransferRequest]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!selectedTransferRequest) return 0;
    return calculateTransferProgress(selectedTransferRequest);
  }, [selectedTransferRequest]);

  // Check action permissions
  const canApprove = useMemo(() => {
    if (!selectedTransferRequest) return false;
    return canApproveTransfer(selectedTransferRequest);
  }, [selectedTransferRequest]);

  const canDispatch = useMemo(() => {
    if (!selectedTransferRequest) return false;
    return canDispatchTransfer(selectedTransferRequest);
  }, [selectedTransferRequest]);

  const canReceive = useMemo(() => {
    if (!selectedTransferRequest) return false;
    return canReceiveTransfer(selectedTransferRequest);
  }, [selectedTransferRequest]);

  // Format request with computed properties
  const formattedRequest = useMemo(() => {
    if (!selectedTransferRequest) return null;
    return formatTransferRequest(selectedTransferRequest);
  }, [selectedTransferRequest]);

  // Set workflow step in state when computed step changes
  useEffect(() => {
    if (computedStep && computedStep !== currentWorkflowStep) {
      dispatch(setWorkflowStep(computedStep));
    }
  }, [computedStep, currentWorkflowStep, dispatch]);

  return {
    request: formattedRequest,
    currentStep: computedStep,
    workflowStep: currentWorkflowStep,
    progress,
    canApprove,
    canDispatch,
    canReceive,
    loading: isLoadingDetails,
    error,
    refetch,
  };
};

