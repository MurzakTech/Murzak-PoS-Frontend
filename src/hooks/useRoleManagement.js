import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createRole,
  updateRole,
  deleteRole,
  disableRole,
  enableRole,
  assignPermissions,
  getRolePermissions,
  removePermissions,
  listRoles,
  getRoleDetails,
  clearSelectedRole,
  clearError,
  setFilters,
  clearFilters,
  setPagination,
} from '../store/roleSlice';

export const useRoleManagement = () => {
  const dispatch = useAppDispatch();
  const {
    roles,
    selectedRole,
    rolePermissions,
    isLoading,
    isLoadingRoles,
    isLoadingPermissions,
    isLoadingDetails,
    error,
    filters,
    pagination,
  } = useAppSelector((state) => state.role);

  const handleCreateRole = useCallback(async (roleData) => {
    return await dispatch(createRole(roleData));
  }, [dispatch]);

  const handleUpdateRole = useCallback(async (roleName, updates) => {
    return await dispatch(updateRole({ roleName, ...updates }));
  }, [dispatch]);

  const handleDeleteRole = useCallback(async (roleName) => {
    return await dispatch(deleteRole(roleName));
  }, [dispatch]);

  const handleDisableRole = useCallback(async (roleName) => {
    return await dispatch(disableRole(roleName));
  }, [dispatch]);

  const handleEnableRole = useCallback(async (roleName) => {
    return await dispatch(enableRole(roleName));
  }, [dispatch]);

  const handleAssignPermissions = useCallback(async (roleName, doctype, permissions, options = {}) => {
    return await dispatch(assignPermissions({
      roleName,
      doctype,
      permissions,
      permlevel: options.permlevel || 0,
      ifOwner: options.ifOwner || false,
    }));
  }, [dispatch]);

  const handleGetRolePermissions = useCallback(async (roleName, doctype = null) => {
    return await dispatch(getRolePermissions({ roleName, doctype }));
  }, [dispatch]);

  const handleRemovePermissions = useCallback(async (roleName, doctype, options = {}) => {
    return await dispatch(removePermissions({
      roleName,
      doctype,
      permlevel: options.permlevel || 0,
      ifOwner: options.ifOwner || false,
    }));
  }, [dispatch]);

  const handleListRoles = useCallback(async (listFilters = {}, paginationOptions = {}) => {
    return await dispatch(listRoles({
      ...filters,
      ...listFilters,
      page: paginationOptions.page || pagination.page,
      pageSize: paginationOptions.pageSize || pagination.pageSize,
    }));
  }, [dispatch, filters, pagination]);

  const handleGetRoleDetails = useCallback(async (roleName) => {
    return await dispatch(getRoleDetails(roleName));
  }, [dispatch]);

  const refetchRoles = useCallback(() => {
    return dispatch(listRoles({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }));
  }, [dispatch, filters, pagination]);

  const handleClearSelectedRole = useCallback(() => {
    dispatch(clearSelectedRole());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSetFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const handleSetPagination = useCallback((newPagination) => {
    dispatch(setPagination(newPagination));
  }, [dispatch]);

  const getPermissionsForRole = useCallback((roleName) => {
    return rolePermissions[roleName] || [];
  }, [rolePermissions]);

  const isAutomaticRole = useCallback((role) => {
    return role?.is_automatic === true || 
           role?.is_automatic === 1 ||
           ['Administrator', 'Guest', 'All', 'Desk User'].includes(role?.name || role?.role_name);
  }, []);

  return {
    roles,
    selectedRole,
    rolePermissions,
    isLoading,
    isLoadingRoles,
    isLoadingPermissions,
    isLoadingDetails,
    error,
    filters,
    pagination,
    createRole: handleCreateRole,
    updateRole: handleUpdateRole,
    deleteRole: handleDeleteRole,
    disableRole: handleDisableRole,
    enableRole: handleEnableRole,
    assignPermissions: handleAssignPermissions,
    getRolePermissions: handleGetRolePermissions,
    removePermissions: handleRemovePermissions,
    listRoles: handleListRoles,
    getRoleDetails: handleGetRoleDetails,
    refetchRoles,
    clearSelectedRole: handleClearSelectedRole,
    clearError: handleClearError,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    setPagination: handleSetPagination,
    getPermissionsForRole,
    isAutomaticRole,
  };
};

export default useRoleManagement;
