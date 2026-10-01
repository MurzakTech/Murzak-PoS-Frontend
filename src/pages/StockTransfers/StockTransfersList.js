import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { 
  Add, 
  Visibility, 
  CheckCircle, 
  LocalShipping, 
  Inventory,
  Send,
  Cancel,
  SwapHoriz,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useTransferRequests } from '../../hooks/useTransferRequests';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStatusColor } from '../../utils/stockTransferHelpers';
import {
  submitMaterialRequest,
  approveStockTransfer,
  cancelStockTransferRequest,
  dispatchStock,
  setPageSize,
} from '../../store/stockTransferSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

/**
 * Stock Transfers List Page
 * Displays all stock transfer requests with filtering and pagination
 */
const StockTransfersList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Use the custom hook for transfer requests
  const {
    requests,
    pagination,
    filters,
    loading,
    updateFilters,
    resetFilters,
    setPage,
    refetch,
  } = useTransferRequests({
    filters: {},
    autoFetch: true,
  });

  const { isLoading, isApproving, isDispatching, isReceiving } = useAppSelector(
    (state) => state.stockTransfer
  );

  // Fetch warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  const [searchTerm, setSearchTerm] = useState('');

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    updateFilters({ search_term: value }); // Already resets page to 1
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    updateFilters({ [key]: value === '' ? null : value }); // Already resets page to 1
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    resetFilters(); // Already resets page to 1
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    setPage(newPage + 1);
    refetch();
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    setPage(1);
    refetch();
  };

  // Handle view details
  const handleView = (requestId) => {
    navigate(`/stock-transfers/${requestId}`);
  };

  // Handle submit (Draft → Submitted)
  const handleSubmit = async (requestId) => {
    try {
      const result = await dispatch(submitMaterialRequest({ request_id: requestId }));
      if (result.type === 'stockTransfer/submitMaterialRequest/fulfilled') {
        refetch(); // Refresh the list
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  // Handle cancel
  const handleCancel = async (requestId) => {
    try {
      const result = await dispatch(cancelStockTransferRequest({ 
        request_id: requestId,
        reason: '' 
      }));
      if (result.type === 'stockTransfer/cancelStockTransferRequest/fulfilled') {
        refetch(); // Refresh the list
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  // Handle approve (Submitted/Pending → Approved)
  // Note: Status field does NOT change to "Approved" after approval. The approval_status field or is_approved flag indicates approval.
  // Pending and Submitted are equivalent - both mean submitted and waiting for approval
  // Use approve_stock_transfer by default (only use workflow endpoint if workflow is explicitly configured)
  const handleApprove = async (requestId, status) => {
    try {
      const currentUser = user?.email || user?.name;
      if (!currentUser) {
        dispatch(showNotification({
          message: 'User email is required for approval',
          severity: 'error',
          title: 'Error',
        }));
        return;
      }

      // Build payload - include is_approved: true for Pending status
      const payload = {
        request_id: requestId,
        approved_by: currentUser,
        approval_notes: '',
      };
      
      // For Pending status, include is_approved: true in payload
      if (status === 'Pending') {
        payload.is_approved = true;
      }

      // Use standard approve endpoint (works for both Submitted and Pending status)
      const result = await dispatch(
        approveStockTransfer(payload)
      );

      if (result.type === 'stockTransfer/approveStockTransfer/fulfilled') {
        refetch();
      }
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  // Handle dispatch (Approved → In Transit)
  const handleDispatch = async (requestId) => {
    try {
      // Navigate to dispatch page for item selection
      navigate(`/stock-transfers/${requestId}/dispatch`);
    } catch (error) {
      console.error('Error dispatching:', error);
    }
  };

  // Handle receive (In Transit → Completed)
  const handleReceive = async (requestId) => {
    try {
      // Navigate to receive page for item confirmation
      navigate(`/stock-transfers/${requestId}/receive`);
    } catch (error) {
      console.error('Error receiving:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Check if actions are available for a request
  const getAvailableActions = (request) => {
    const isDirectTransfer = request.is_direct_transfer || request.type === 'direct';
    const actions = [];
    
    if (!isDirectTransfer) {
      // Draft → Submitted/Pending (Submit action)
      if (request.status === 'Draft') {
        actions.push({ 
          label: 'Submit', 
          action: () => handleSubmit(request.name), 
          color: 'info',
          icon: Send 
        });
      }
      
      // Submitted/Pending → Approved
      // Note: Status field does NOT change to "Approved" after approval. Check is_approved or approval_status.
      // Can approve if status is Submitted/Pending AND not already approved
      const isSubmittedOrPending = request.status === 'Submitted' || request.status === 'Pending';
      const isNotApproved = !request.is_approved && request.approval_status !== 'Approved';
      if (isSubmittedOrPending && isNotApproved) {
        actions.push({ 
          label: 'Approve', 
          action: () => handleApprove(request.name, request.status), 
          color: 'success',
          icon: CheckCircle 
        });
      }
      
      // Pending/Approved → In Transit
      // Allow dispatch for Pending status or approved requests (not already in transit/completed)
      const isInProgress = request.status === 'In Transit' || request.status === 'Partially In Transit' || request.status === 'Completed' || request.status === 'Partially Received';
      const isApproved = request.is_approved === true || request.approval_status === 'Approved';
      const canDispatch = !isInProgress && (request.status === 'Pending' || isApproved);
      if (canDispatch) {
        actions.push({ 
          label: 'Dispatch', 
          action: () => handleDispatch(request.name), 
          color: 'primary',
          icon: LocalShipping 
        });
      }
      
      // In Transit → Completed
      if (request.status === 'In Transit' || request.status === 'Partially In Transit') {
        actions.push({ 
          label: 'Receive', 
          action: () => handleReceive(request.name), 
          color: 'warning',
          icon: Inventory 
        });
      }
      
      // Cancel action (available for Draft, Pending, Submitted, or approved but not dispatched - not In Transit)
      // Can cancel if Draft, or if submitted/pending/approved but not yet in transit
      const canCancel = request.status === 'Draft' || 
                       request.status === 'Pending' || 
                       request.status === 'Submitted' || 
                       (isApproved && request.status !== 'In Transit' && request.status !== 'Partially In Transit');
      if (canCancel && request.status !== 'Completed' && request.status !== 'Partially Received' && request.status !== 'Cancelled') {
        actions.push({ 
          label: 'Cancel', 
          action: () => handleCancel(request.name), 
          color: 'error',
          icon: Cancel 
        });
      }
    }
    
    return actions;
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Request ID',
      width: '12%',
      render: (value, row) => {
        const isDirectTransfer = row.is_direct_transfer || row.type === 'direct';
        return (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {value || 'N/A'}
            </Typography>
            {isDirectTransfer && (
              <Chip
                label="Direct"
                size="small"
                color="info"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        );
      },
    },
    {
      field: 'date',
      header: 'Date',
      width: '10%',
      render: (value, row) => (
        <Typography variant="body2">
          {formatDate(row.requested_on || row.posting_date)}
        </Typography>
      ),
    },
    {
      field: 'origin_warehouse',
      header: 'From Warehouse',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'destination_warehouse',
      header: 'To Warehouse',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'requested_by',
      header: 'Requested By',
      width: '12%',
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '14%',
      render: (value, row) => {
        const status = value || 'Draft';
        const statusColor = getStatusColor(status);
        const statusMap = {
          'Draft': '#64748B',
          'Submitted': '#3B82F6',
          'Pending': '#F59E0B',
          'Approved': '#10B981',
          'In Transit': '#8B5CF6',
          'Partially In Transit': '#A855F7',
          'Completed': '#10B981',
          'Partially Received': '#F59E0B',
          'Cancelled': '#EF4444',
        };
        const color = statusMap[status] || statusColor?.main || '#64748B';
        
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <StatusChip
              status={status.toLowerCase().replace(/\s+/g, '_')}
              label={status}
              color={color}
            />
            {(row.is_approved || row.approval_status === 'Approved') && (
              <Chip
                label="Approved"
                color="success"
                size="small"
                variant="outlined"
                sx={{ width: 'fit-content' }}
              />
            )}
            {!row.is_approved && row.approval_status === 'Pending Approval' && (
              <Chip
                label="Pending Approval"
                color="warning"
                size="small"
                variant="outlined"
                sx={{ width: 'fit-content' }}
              />
            )}
          </Box>
        );
      },
    },
    {
      field: 'dispatched_by',
      header: 'Dispatched By',
      width: '10%',
      render: (value) => {
        if (!value) return '-';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocalShipping fontSize="small" color="action" />
            <Typography variant="body2">{value}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'received_by',
      header: 'Received By',
      width: '10%',
      render: (value) => {
        if (!value) return '-';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Inventory fontSize="small" color="success" />
            <Typography variant="body2">{value}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'goods_received_note',
      header: 'GRN',
      width: '10%',
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '8%',
      align: 'right',
      render: (value, row) => {
        const availableActions = getAvailableActions(row);
        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(row.name);
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {availableActions.length > 0 && (
              <>
                {availableActions.map((action, idx) => {
                  const Icon = action.icon || Visibility;
                  const isProcessing = 
                    (action.label === 'Approve' && isApproving) ||
                    (action.label === 'Dispatch' && isDispatching) ||
                    (action.label === 'Receive' && isReceiving) ||
                    (action.label === 'Submit' && isLoading);
                  
                  return (
                    <Tooltip key={idx} title={action.label}>
                      <span>
                        <IconButton
                          size="small"
                          color={action.color}
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.action();
                          }}
                        >
                          {isProcessing ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Icon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  );
                })}
              </>
            )}
          </Box>
        );
      },
    },
  ], [isApproving, isDispatching, isReceiving, isLoading, handleView, handleSubmit, handleApprove, handleDispatch, handleReceive, handleCancel]);

  // Calculate stats
  const totalRequests = pagination?.total || requests.length;
  const draftRequests = requests.filter(r => r.status === 'Draft').length;
  const inTransitRequests = requests.filter(r => 
    r.status === 'In Transit' || r.status === 'Partially In Transit'
  ).length;
  const completedRequests = requests.filter(r => r.status === 'Completed').length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      value: filters.status || '',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Submitted', label: 'Submitted' },
        { value: 'Approved', label: 'Approved' },
        { value: 'In Transit', label: 'In Transit' },
        { value: 'Partially In Transit', label: 'Partially In Transit' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Partially Received', label: 'Partially Received' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
      width: 150,
    },
    {
      type: 'select',
      key: 'origin_warehouse',
      label: 'Origin Warehouse',
      value: filters.origin_warehouse || '',
      options: [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map(w => ({
          value: w.name || w,
          label: w.warehouse_name || w.name || w,
        })),
      ],
      width: 160,
    },
    {
      type: 'select',
      key: 'destination_warehouse',
      label: 'Destination Warehouse',
      value: filters.destination_warehouse || '',
      options: [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map(w => ({
          value: w.name || w,
          label: w.warehouse_name || w.name || w,
        })),
      ],
      width: 160,
    },
    {
      type: 'date',
      key: 'from_date',
      label: 'From Date',
      value: filters.from_date || '',
      width: 140,
    },
    {
      type: 'date',
      key: 'to_date',
      label: 'To Date',
      value: filters.to_date || '',
      width: 140,
    },
  ], [filters, warehouses]);

  return (
    <Box>
      <PageHeader
        title="Stock Transfer Requests"
        subtitle="View and manage stock transfer requests and direct transfers"
        icon={SwapHoriz}
        stats={[
          { value: totalRequests, label: 'Total Requests', color: 'primary.main' },
          { value: draftRequests, label: 'Draft', color: 'default' },
          { value: inTransitRequests, label: 'In Transit', color: 'info.main' },
          { value: completedRequests, label: 'Completed', color: 'success.main' },
        ]}
        actions={[
          {
            label: 'Create Transfer Request',
            icon: <Add />,
            onClick: () => navigate('/stock-transfers/create-request'),
            variant: 'outlined',
          },
          {
            label: 'Create Direct Transfer',
            icon: <Add />,
            onClick: () => navigate('/stock-transfers/create'),
            variant: 'contained',
          },
        ]}
        loading={loading && requests.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search transfers..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={requests}
        loading={loading}
        emptyMessage="No transfer requests found. Create a new transfer request to get started."
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || requests.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onRowClick={(row) => handleView(row.name)}
        rowKey="name"
      />
    </Box>
  );
};

export default StockTransfersList;
