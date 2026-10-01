/**
 * Stock Transfer Workflow Utilities
 * Helper functions for workflow validation and state management
 */

/**
 * Validate workflow transition
 * @param {string} currentStatus - Current transfer status
 * @param {string} action - Action being performed
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export const validateWorkflowTransition = (currentStatus, action) => {
  const validTransitions = {
    'Draft': ['submit'],
    'Submitted': ['approve', 'cancel'],
    'Approved': ['dispatch', 'cancel'],
    'In Transit': ['receive', 'cancel'],
    'Partially In Transit': ['receive', 'cancel'],
    'Completed': [],
    'Partially Received': ['receive'],
    'Cancelled': [],
  };

  const allowedActions = validTransitions[currentStatus] || [];
  
  if (!allowedActions.includes(action)) {
    return {
      valid: false,
      error: `Cannot ${action} a transfer with status: ${currentStatus}`,
    };
  }

  return { valid: true };
};

/**
 * Get next workflow step
 * @param {string} currentStatus - Current transfer status
 * @returns {string|null} Next workflow step
 */
export const getNextWorkflowStep = (currentStatus) => {
  const stepMap = {
    'Draft': 'approve',
    'Submitted': 'approve',
    'Approved': 'dispatch',
    'In Transit': 'receive',
    'Partially In Transit': 'receive',
    'Completed': null,
    'Partially Received': 'receive',
    'Cancelled': null,
  };

  return stepMap[currentStatus] || null;
};

/**
 * Check if workflow can proceed
 * @param {Object} request - Transfer request object
 * @param {string} action - Action to perform
 * @returns {{canProceed: boolean, reason?: string}} Check result
 */
export const canProceedWithWorkflow = (request, action) => {
  if (!request) {
    return { canProceed: false, reason: 'Transfer request not found' };
  }

  const validation = validateWorkflowTransition(request.status, action);
  if (!validation.valid) {
    return { canProceed: false, reason: validation.error };
  }

  // Additional checks based on action
  switch (action) {
    case 'approve':
      if (request.status !== 'Submitted') {
        return { canProceed: false, reason: 'Only submitted requests can be approved' };
      }
      break;
    case 'dispatch':
      if (request.status !== 'Approved') {
        return { canProceed: false, reason: 'Only approved requests can be dispatched' };
      }
      if (!request.items || request.items.length === 0) {
        return { canProceed: false, reason: 'No items to dispatch' };
      }
      break;
    case 'receive':
      if (request.status !== 'In Transit' && request.status !== 'Partially In Transit') {
        return { canProceed: false, reason: 'Only in-transit requests can be received' };
      }
      if (!request.items || request.items.length === 0) {
        return { canProceed: false, reason: 'No items to receive' };
      }
      // Check if there are items that haven't been fully received
      const hasRemainingItems = request.items.some((item) => {
        const remaining = (item.requested_qty || 0) - (item.received_qty || 0);
        return remaining > 0;
      });
      if (!hasRemainingItems) {
        return { canProceed: false, reason: 'All items have been received' };
      }
      break;
    default:
      break;
  }

  return { canProceed: true };
};

/**
 * Get workflow action button state
 * @param {Object} request - Transfer request object
 * @returns {Object} Button states for each action
 */
export const getWorkflowActionStates = (request) => {
  if (!request) {
    return {
      canApprove: false,
      canDispatch: false,
      canReceive: false,
      canCancel: false,
    };
  }

  const approveCheck = canProceedWithWorkflow(request, 'approve');
  const dispatchCheck = canProceedWithWorkflow(request, 'dispatch');
  const receiveCheck = canProceedWithWorkflow(request, 'receive');
  const cancelCheck = validateWorkflowTransition(request.status, 'cancel');

  return {
    canApprove: approveCheck.canProceed,
    canDispatch: dispatchCheck.canProceed,
    canReceive: receiveCheck.canProceed,
    canCancel: cancelCheck.valid,
    approveReason: approveCheck.reason,
    dispatchReason: dispatchCheck.reason,
    receiveReason: receiveCheck.reason,
  };
};

/**
 * Format workflow error message
 * @param {string} action - Action that failed
 * @param {string} reason - Reason for failure
 * @returns {string} Formatted error message
 */
export const formatWorkflowError = (action, reason) => {
  return `Cannot ${action} transfer: ${reason}`;
};

/**
 * Get workflow progress percentage
 * @param {Object} request - Transfer request object
 * @returns {number} Progress percentage (0-100)
 */
export const getWorkflowProgress = (request) => {
  if (!request) return 0;

  const statusProgress = {
    'Draft': 0,
    'Submitted': 20,
    'Approved': 40,
    'In Transit': 60,
    'Partially In Transit': 60,
    'Partially Received': 80,
    'Completed': 100,
    'Cancelled': 0,
  };

  return statusProgress[request.status] || 0;
};

