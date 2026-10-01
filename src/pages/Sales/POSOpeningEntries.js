import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  MoreVert,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Refresh,
  History,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listPOSOpeningEntries,
  getPOSOpeningEntry,
  closePOSOpeningEntry,
  cancelPOSOpeningEntry,
  setPOSOpeningEntriesFilters,
  setPOSOpeningEntriesPage,
  setPOSOpeningEntriesPageSize,
  resetPOSOpeningEntriesFilters,
  clearSelectedPOSOpeningEntry,
} from '../../store/salesSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const POSOpeningEntries = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    posOpeningEntries,
    isLoadingPOSOpeningEntries,
    isClosingPOSOpening,
    isCancellingPOSOpening,
    posOpeningEntriesPagination,
    posOpeningEntriesFilters,
  } = useAppSelector((state) => state.sales);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Fetch entries when filters or pagination changes
  const buildQueryParams = (page = posOpeningEntriesPagination.page, pageSize = posOpeningEntriesPagination.page_size) => {
    const params = {
      company: userCompany,
      limit_start: (page - 1) * pageSize,
      limit_page_length: pageSize,
    };
    Object.entries(posOpeningEntriesFilters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        params[key] = value;
      }
    });
    return params;
  };

  // Fetch entries when filters or pagination changes
  useEffect(() => {
    if (userCompany) {
      dispatch(listPOSOpeningEntries(buildQueryParams()));
    }
  }, [dispatch, userCompany, posOpeningEntriesPagination.page, posOpeningEntriesPagination.page_size, posOpeningEntriesFilters]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setPOSOpeningEntriesFilters({ search_term: value })); // Already resets page to 1
  };

  const handleFilterChange = (key, value) => {
    dispatch(setPOSOpeningEntriesFilters({ [key]: value === '' ? null : value })); // Already resets page to 1
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetPOSOpeningEntriesFilters()); // Already resets page to 1
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPOSOpeningEntriesPage(newPage + 1));
    dispatch(listPOSOpeningEntries(buildQueryParams(newPage + 1, posOpeningEntriesPagination.page_size)));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPOSOpeningEntriesPageSize(newPageSize));
    dispatch(setPOSOpeningEntriesPage(1));
    dispatch(listPOSOpeningEntries(buildQueryParams(1, newPageSize)));
  };

  const handleMenuOpen = (event, entry) => {
    setAnchorEl(event.currentTarget);
    setSelectedEntry(entry);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEntry(null);
  };

  const handleViewDetails = (entryName) => {
    dispatch(clearSelectedPOSOpeningEntry());
    navigate(`/sales/pos-opening-entries/${entryName}`);
  };

  const handleCloseClick = () => {
    setCloseDialogOpen(true);
    handleMenuClose();
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseConfirm = async () => {
    if (!selectedEntry) return;

    const result = await dispatch(closePOSOpeningEntry({
      pos_opening_entry: selectedEntry.name,
      do_not_submit: false,
    }));

    if (closePOSOpeningEntry.fulfilled.match(result)) {
      setCloseDialogOpen(false);
      setSelectedEntry(null);
      dispatch(listPOSOpeningEntries(buildQueryParams()));
    }
  };

  const handleCancelConfirm = async (reason) => {
    if (!selectedEntry) return;

    const result = await dispatch(cancelPOSOpeningEntry({
      name: selectedEntry.name,
      reason,
    }));

    if (cancelPOSOpeningEntry.fulfilled.match(result)) {
      setCancelDialogOpen(false);
      setSelectedEntry(null);
      dispatch(listPOSOpeningEntries(buildQueryParams()));
    }
  };

  const canClose = (entry) => {
    return entry?.status === 'Open';
  };

  const canCancel = (entry) => {
    return entry?.status === 'Draft' || entry?.status === 'Open';
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Entry Name',
      width: '12%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'pos_profile',
      header: 'POS Profile',
      width: '12%',
    },
    {
      field: 'company',
      header: 'Company',
      width: '12%',
    },
    {
      field: 'user',
      header: 'User/Cashier',
      width: '12%',
    },
    {
      field: 'status',
      header: 'Status',
      width: '12%',
      render: (value) => {
        const statusMap = {
          'Draft': { label: 'Draft', color: '#64748B' },
          'Open': { label: 'Open', color: '#10B981' },
          'Closed': { label: 'Closed', color: '#3B82F6' },
          'Cancelled': { label: 'Cancelled', color: '#EF4444' },
        };
        const status = statusMap[value] || { label: value || 'Unknown', color: '#64748B' };
        return (
          <StatusChip
            status={status.label.toLowerCase()}
            label={status.label}
            color={status.color}
          />
        );
      },
    },
    {
      field: 'posting_date',
      header: 'Posting Date',
      width: '12%',
      render: (value) => (
        <Typography variant="body2">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'period_start_date',
      header: 'Period Start',
      width: '14%',
      render: (value) => (
        <Typography variant="body2">
          {value ? new Date(value).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'period_end_date',
      header: 'Period End',
      width: '14%',
      render: (value) => (
        <Typography variant="body2">
          {value ? new Date(value).toLocaleString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '10%',
      align: 'right',
      render: (value, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(row.name);
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e, row);
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ], []);

  // Calculate stats
  const totalEntries = posOpeningEntriesPagination?.total || posOpeningEntries.length;
  const openEntries = posOpeningEntries.filter(e => e.status === 'Open').length;
  const closedEntries = posOpeningEntries.filter(e => e.status === 'Closed').length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'text',
      key: 'pos_profile',
      label: 'POS Profile',
      value: posOpeningEntriesFilters.pos_profile || '',
      placeholder: 'Filter by POS profile...',
      width: 140,
    },
    {
      type: 'text',
      key: 'user',
      label: 'User/Cashier',
      value: posOpeningEntriesFilters.user || '',
      placeholder: 'Filter by user...',
      width: 140,
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      value: posOpeningEntriesFilters.status || '',
      options: [
        { value: '', label: 'All Status' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Open', label: 'Open' },
        { value: 'Closed', label: 'Closed' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
      width: 120,
    },
    {
      type: 'date',
      key: 'from_date',
      label: 'From Date',
      value: posOpeningEntriesFilters.from_date || '',
      width: 140,
    },
    {
      type: 'date',
      key: 'to_date',
      label: 'To Date',
      value: posOpeningEntriesFilters.to_date || '',
      width: 140,
    },
  ], [posOpeningEntriesFilters]);

  return (
    <Box>
      <PageHeader
        title="POS Opening Entries"
        subtitle="View and manage POS session opening entries"
        icon={History}
        stats={[
          { value: totalEntries, label: 'Total Entries', color: 'primary.main' },
          { value: openEntries, label: 'Open', color: 'success.main' },
          { value: closedEntries, label: 'Closed', color: 'info.main' },
        ]}
        actions={[
          {
            label: 'Refresh',
            icon: <Refresh />,
            onClick: () => dispatch(listPOSOpeningEntries(buildQueryParams())),
            variant: 'outlined',
          },
        ]}
        loading={isLoadingPOSOpeningEntries && posOpeningEntries.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search entries..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={posOpeningEntries}
        loading={isLoadingPOSOpeningEntries}
        emptyMessage="No POS opening entries found"
        pagination={{
          page: posOpeningEntriesPagination.page,
          page_size: posOpeningEntriesPagination.page_size,
          total: posOpeningEntriesPagination.total || posOpeningEntries.length,
          total_pages: posOpeningEntriesPagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedEntry && canClose(selectedEntry) && (
          <MenuItem onClick={handleCloseClick}>
            <CloseIcon sx={{ mr: 1 }} fontSize="small" />
            Close Entry
          </MenuItem>
        )}
        {selectedEntry && canCancel(selectedEntry) && (
          <MenuItem onClick={handleCancelClick}>
            <CancelIcon sx={{ mr: 1 }} fontSize="small" />
            Cancel Entry
          </MenuItem>
        )}
      </Menu>

      {/* Close Dialog */}
      {closeDialogOpen && selectedEntry && (
        <CloseEntryDialog
          open={closeDialogOpen}
          entry={selectedEntry}
          onClose={() => {
            setCloseDialogOpen(false);
            setSelectedEntry(null);
          }}
          onConfirm={handleCloseConfirm}
          isLoading={isClosingPOSOpening}
        />
      )}

      {/* Cancel Dialog */}
      {cancelDialogOpen && selectedEntry && (
        <CancelEntryDialog
          open={cancelDialogOpen}
          entry={selectedEntry}
          onClose={() => {
            setCancelDialogOpen(false);
            setSelectedEntry(null);
          }}
          onConfirm={handleCancelConfirm}
          isLoading={isCancellingPOSOpening}
        />
      )}
    </Box>
  );
};

// Close Entry Dialog Component
const CloseEntryDialog = ({ open, entry, onClose, onConfirm, isLoading }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Close POS Opening Entry</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Are you sure you want to close this POS opening entry? This will create a POS Closing Entry
          that consolidates all invoices associated with this entry.
        </Typography>
        {entry && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2"><strong>Entry:</strong> {entry.name}</Typography>
            <Typography variant="body2"><strong>POS Profile:</strong> {entry.pos_profile}</Typography>
            <Typography variant="body2"><strong>Status:</strong> {entry.status}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Closing...' : 'Close Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Cancel Entry Dialog Component
const CancelEntryDialog = ({ open, entry, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = React.useState('');

  const handleSubmit = () => {
    onConfirm(reason);
    setReason('');
  };

  React.useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel POS Opening Entry</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Are you sure you want to cancel this POS opening entry? This action can only be performed
          if the entry has no invoices. If it has invoices, please close it instead.
        </Typography>
        {entry && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2"><strong>Entry:</strong> {entry.name}</Typography>
            <Typography variant="body2"><strong>POS Profile:</strong> {entry.pos_profile}</Typography>
            <Typography variant="body2"><strong>Status:</strong> {entry.status}</Typography>
          </Box>
        )}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Cancellation Reason (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Cancelling...' : 'Cancel Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default POSOpeningEntries;

