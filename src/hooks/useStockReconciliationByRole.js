import { useMemo } from 'react';
import { useStockReconciliation } from './useStockReconciliation';
import useRoleAccess from './useRoleAccess';

/**
 * Role mapping from user roles to workflow roles
 * Maps POS system roles to multi-level stock reconciliation workflow roles
 */
const ROLE_MAPPING = {
  // Sales User roles - can add stock take at "Pending Sales User" stage
  'Sales User': 'Sales User',
  'Sales Person': 'Sales User',
  'Sales Manager': 'Sales User', // Sales managers can perform sales user functions
  'Sales Master Manager': 'Sales User',
  'Stock User': 'Sales User', // General stock users can perform sales user stock take
  
  // Quality Manager roles - can add stock take at "Pending Quality Manager" stage
  'Quality Manager': 'Quality Manager',
  'Stock Controller': 'Quality Manager',
  
  // Stock Manager roles - can add stock take at "Pending Stock Manager" stage and submit
  'Stock Manager': 'Stock Manager',
  'Warehouse Manager': 'Stock Manager',
  'Item Manager': 'Stock Manager', // Item managers have full stock control
  'Purchase Manager': 'Stock Manager', // Purchase managers have stock oversight
  'Purchase Master Manager': 'Stock Manager',
  
  // Administrative roles - full access (Stock Manager privileges)
  'Administrator': 'Stock Manager', // Full access
  'System Manager': 'Stock Manager', // Full access
  'All': 'Stock Manager', // Full access - can do all functions
};

/**
 * Custom hook for role-based stock reconciliation operations
 * Wraps useStockReconciliation with role-based permissions and workflow logic
 * 
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.userRole] - Override user role (defaults to detected role from useRoleAccess)
 * @returns {Object} Role-based reconciliation operations and state
 * @returns {Function} addStockTake - Role-appropriate stock take function
 * @returns {boolean} canAddStockTake - Whether user can add stock take at current workflow stage
 * @returns {boolean} canSubmit - Whether user can submit reconciliation (Stock Manager only)
 * @returns {string} userRole - Detected/mapped user role
 * @returns {Object} ...rest - All properties from useStockReconciliation
 * 
 * @example
 * const { addStockTake, canAddStockTake, reconciliation, loading } = useStockReconciliationByRole();
 * 
 * const handleAddStockTake = async () => {
 *   if (!canAddStockTake) {
 *     alert('You cannot add stock take at this stage');
 *     return;
 *   }
 *   
 *   try {
 *     await addStockTake({
 *       reconciliation_name: reconciliation.name,
 *       items: [{ item_code: 'ITEM-001', qty: 10, comment: 'Counted' }],
 *     });
 *   } catch (err) {
 *     console.error('Error:', err);
 *   }
 * };
 */
export const useStockReconciliationByRole = (options = {}) => {
  const { hasRole } = useRoleAccess();
  const hook = useStockReconciliation();
  const { reconciliation } = hook;

  /**
   * Detect user role from available roles
   */
  const detectedRole = useMemo(() => {
    // If role is explicitly provided, use it
    if (options.userRole) {
      return ROLE_MAPPING[options.userRole] || options.userRole;
    }

    // Check for 'All' role first - grants full access
    if (hasRole(['System Manager'])) {
      return 'Stock Manager'; // 'All' role gets Stock Manager privileges
    }
    
    // Detect role based on user's roles
    // Priority order: Stock Manager > Quality Manager > Sales User
    // This ensures users with multiple roles get the highest privilege
    
    // Check for Stock Manager roles first (highest privilege)
    if (hasRole([
      'Stock Manager',
      'Warehouse Manager',
      'Item Manager',
      'Purchase Manager',
      'Purchase Master Manager',
      'Administrator',
      'System Manager'
    ])) {
      return 'Stock Manager';
    }
    
    // Check for Quality Manager roles
    if (hasRole(['Quality Manager', 'Stock Controller'])) {
      return 'Quality Manager';
    }
    
    // Check for Sales User roles
    if (hasRole([
      'Sales User',
      'Sales Person',
      'Sales Manager',
      'Sales Master Manager',
      'Stock User'
    ])) {
      return 'Sales User';
    }

    // Default to Sales User if no match
    return 'Sales User';
  }, [hasRole, options.userRole]);

  /**
   * Check if user can add stock take at current workflow stage
   * Users with 'All' role can add stock take at any stage
   */
  const canAddStockTake = useMemo(() => {
    if (!reconciliation) return false;

    // Check if user has 'All' role - grants access to all stages
    const hasAllRole = hasRole(['All']);
    if (hasAllRole) {
      return reconciliation.workflow_state !== 'Completed'; // Can add at any stage except completed
    }

    const workflowStatus = reconciliation.workflow_state;

    switch (workflowStatus) {
      case 'Pending Sales User':
        return detectedRole === 'Sales User';
      case 'Pending Quality Manager':
        return detectedRole === 'Quality Manager';
      case 'Pending Stock Manager':
        return detectedRole === 'Stock Manager';
      case 'Completed':
        return false; // No more edits allowed
      default:
        return false;
    }
  }, [reconciliation, detectedRole, hasRole]);

  /**
   * Check if user can submit reconciliation
   * Stock Manager or users with 'All' role can submit when workflow status is "Pending Stock Manager"
   */
  const canSubmit = useMemo(() => {
    const hasAllRole = hasRole(['All']);
    return (
      (detectedRole === 'Stock Manager' || hasAllRole) &&
      reconciliation?.workflow_state === 'Pending Stock Manager'
    );
  }, [detectedRole, reconciliation, hasRole]);

  /**
   * Get the appropriate stock take function based on user role
   */
  const addStockTake = useMemo(() => {
    switch (detectedRole) {
      case 'Sales User':
        return hook.addSalesUserStockTake;
      case 'Quality Manager':
        return hook.addQualityManagerStockTake;
      case 'Stock Manager':
        return hook.addStockManagerStockTake;
      default:
        return null;
    }
  }, [detectedRole, hook]);

  /**
   * Get role label for display
   */
  const roleLabel = useMemo(() => {
    const labels = {
      'Sales User': 'Sales User',
      'Quality Manager': 'Quality Manager',
      'Stock Manager': 'Stock Manager',
    };
    return labels[detectedRole] || detectedRole;
  }, [detectedRole]);

  return {
    ...hook,
    canAddStockTake,
    canSubmit,
    addStockTake,
    userRole: detectedRole,
    roleLabel,
  };
};

export default useStockReconciliationByRole;

