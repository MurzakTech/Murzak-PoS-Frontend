/**
 * Stock Transfer Utility Helpers
 * Helper functions for stock transfer operations
 */

/**
 * Format date for API (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string|null} Formatted date string or null
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse and format
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return null;
};

/**
 * Format time for API (HH:MM:SS)
 * @param {string|Date} time - Time to format
 * @returns {string|null} Formatted time string or null
 */
export const formatTimeForAPI = (time) => {
  if (!time) return null;
  
  if (typeof time === 'string') {
    // If already in HH:MM:SS format, return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    // If in HH:MM format, add seconds
    if (/^\d{2}:\d{2}$/.test(time)) {
      return `${time}:00`;
    }
    return time;
  }
  
  if (time instanceof Date) {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  return null;
};

/**
 * Get status color for Material Request status (for MUI Chip)
 * @param {string} status - Status string
 * @returns {string} MUI color name
 */
export const getStatusColor = (status) => {
  const statusColors = {
    'Draft': 'default',
    'Pending': 'warning',
    'Submitted': 'info',
    'Approved': 'success',
    'In Transit': 'warning',
    'Partially In Transit': 'warning',
    'Completed': 'success',
    'Partially Received': 'info',
    'Cancelled': 'error',
  };
  return statusColors[status] || 'default';
};

/**
 * Validate transfer items
 * @param {Array} items - Array of items to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export const validateTransferItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  
  for (const item of items) {
    if (!item.item_code || typeof item.item_code !== 'string' || item.item_code.trim() === '') {
      return { valid: false, error: 'Item code is required for all items' };
    }
    
    const qty = item.qty || item.dispatched_qty || item.received_qty;
    if (qty === undefined || qty === null || isNaN(qty) || qty <= 0) {
      return { valid: false, error: 'Quantity must be greater than 0 for all items' };
    }
  }
  
  return { valid: true };
};

/**
 * Calculate transfer progress percentage
 * @param {Object} request - Transfer request object
 * @returns {number} Progress percentage (0-100)
 */
export const calculateTransferProgress = (request) => {
  if (!request || !request.items || !Array.isArray(request.items)) {
    return 0;
  }
  
  const totalRequested = request.items.reduce(
    (sum, item) => sum + (item.requested_qty || 0),
    0
  );
  
  const totalReceived = request.items.reduce(
    (sum, item) => sum + (item.received_qty || 0),
    0
  );
  
  if (totalRequested === 0) return 0;
  
  return Math.round((totalReceived / totalRequested) * 100);
};

/**
 * Get current workflow step based on status
 * @param {string} status - Transfer request status
 * @returns {string|null} Current workflow step
 */
export const getWorkflowStep = (status) => {
  const stepMap = {
    'Draft': 'create',
    'Pending': 'approve',
    'Submitted': 'approve',
    'Approved': 'dispatch',
    'In Transit': 'receive',
    'Partially In Transit': 'receive',
    'Completed': 'complete',
    'Partially Received': 'receive',
    'Cancelled': 'cancelled',
  };
  
  return stepMap[status] || null;
};

/**
 * Check if transfer can be approved
 * @param {Object} request - Transfer request object
 * @returns {boolean} Whether transfer can be approved
 * Note: Status field does NOT change to "Approved" after approval. Check is_approved or approval_status to determine approval state.
 */
export const canApproveTransfer = (request) => {
  if (!request) return false;
  // Can approve if status is Submitted/Pending AND not already approved
  const isSubmittedOrPending = request.status === 'Pending' || request.status === 'Submitted';
  const isNotApproved = !request.is_approved && request.approval_status !== 'Approved';
  return isSubmittedOrPending && isNotApproved;
};

/**
 * Check if transfer can be dispatched
 * @param {Object} request - Transfer request object
 * @returns {boolean} Whether transfer can be dispatched
 * Note: Can dispatch when status is "Pending" or when approved (check is_approved or approval_status).
 * Cannot dispatch if already in transit or completed.
 */
export const canDispatchTransfer = (request) => {
  if (!request) return false;
  // Cannot dispatch if already in transit or completed
  const isInProgress = request.status === 'In Transit' || request.status === 'Partially In Transit' || 
                       request.status === 'Completed' || request.status === 'Partially Received';
  if (isInProgress) return false;
  // Allow dispatch for Pending status or approved requests
  if (request.status === 'Pending') return true;
  // Check is_approved or approval_status, NOT status field
  return request.is_approved === true || request.approval_status === 'Approved';
};

/**
 * Check if transfer can be received
 * @param {Object} request - Transfer request object
 * @returns {boolean} Whether transfer can be received
 */
export const canReceiveTransfer = (request) => {
  if (!request) return false;
  return request.status === 'In Transit' || request.status === 'Partially In Transit';
};

/**
 * Format transfer request for display
 * @param {Object} request - Transfer request object
 * @returns {Object} Formatted request object
 */
export const formatTransferRequest = (request) => {
  if (!request) return null;
  
  return {
    ...request,
    progress: calculateTransferProgress(request),
    workflowStep: getWorkflowStep(request.status),
    canApprove: canApproveTransfer(request),
    canDispatch: canDispatchTransfer(request),
    canReceive: canReceiveTransfer(request),
  };
};

/**
 * Validate transfer form data
 * @param {Object} data - Form data to validate
 * @returns {{valid: boolean, errors: Object}} Validation result
 */
export const validateTransferForm = (data) => {
  const errors = {};
  
  if (!data.company || typeof data.company !== 'string' || data.company.trim() === '') {
    errors.company = 'Company is required';
  }
  
  if (!data.posting_date) {
    errors.posting_date = 'Posting date is required';
  }
  
  if (!data.posting_time) {
    errors.posting_time = 'Posting time is required';
  }
  
  if (!data.from_warehouse || typeof data.from_warehouse !== 'string' || data.from_warehouse.trim() === '') {
    errors.from_warehouse = 'Source warehouse is required';
  }
  
  if (!data.to_warehouse || typeof data.to_warehouse !== 'string' || data.to_warehouse.trim() === '') {
    errors.to_warehouse = 'Destination warehouse is required';
  }
  
  if (data.from_warehouse && data.to_warehouse && data.from_warehouse === data.to_warehouse) {
    errors.to_warehouse = 'Source and destination warehouses must be different';
  }
  
  const itemsValidation = validateTransferItems(data.items);
  if (!itemsValidation.valid) {
    errors.items = itemsValidation.error;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get default posting date (today)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getDefaultPostingDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get default posting time (current time)
 * @returns {string} Time string in HH:MM:SS format
 */
export const getDefaultPostingTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
};

/**
 * Check if item is fully received
 * @param {Object} item - Transfer item object
 * @returns {boolean} Whether item is fully received
 */
export const isItemFullyReceived = (item) => {
  if (!item) return false;
  const requested = item.requested_qty || 0;
  const received = item.received_qty || 0;
  return requested > 0 && received >= requested;
};

/**
 * Check if item is partially received
 * @param {Object} item - Transfer item object
 * @returns {boolean} Whether item is partially received
 */
export const isItemPartiallyReceived = (item) => {
  if (!item) return false;
  const requested = item.requested_qty || 0;
  const received = item.received_qty || 0;
  return requested > 0 && received > 0 && received < requested;
};

/**
 * Get remaining quantity to receive
 * @param {Object} item - Transfer item object
 * @returns {number} Remaining quantity
 */
export const getRemainingQuantity = (item) => {
  if (!item) return 0;
  const requested = item.requested_qty || 0;
  const received = item.received_qty || 0;
  return Math.max(0, requested - received);
};

