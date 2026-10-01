import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  GridLegacy as Grid,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  LocalOffer,
  Discount,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listInventoryDiscountRules,
  deleteInventoryDiscountRule,
  getInventoryDiscountRule,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  clearSelectedRule,
} from '../../store/inventoryDiscountSlice';
import { formatDiscountDisplay, formatRuleType, isDiscountRuleValidForDate } from '../../utils/discountCalculator';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const InventoryDiscounts = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    rules: rawRules,
    selectedRule,
    isLoading,
    isLoadingDetails,
    pagination,
    filters,
  } = useAppSelector((state) => state.inventoryDiscount);
  
  // Ensure rules is always an array
  const rules = Array.isArray(rawRules) ? rawRules : [];
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRuleItem, setSelectedRuleItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch discount rules on mount and when filters change
  useEffect(() => {
    if (userCompany) {
      const params = {
        ...filters,
        company: userCompany,
        page: pagination.page,
        page_size: pagination.page_size,
      };
      dispatch(listInventoryDiscountRules(params));
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setFilters({ search_term: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleFilterChange = (key, value) => {
    // Handle special case for is_active
    if (key === 'is_active') {
      dispatch(setFilters({ [key]: value === '' ? null : value })); // setFilters already resets page to 1
    } else {
      dispatch(setFilters({ [key]: value === '' ? null : value })); // setFilters already resets page to 1
    }
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPage(newPage + 1));
    const params = {
      ...filters,
      company: userCompany,
      page: newPage + 1,
      page_size: pagination.page_size,
    };
    dispatch(listInventoryDiscountRules(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      ...filters,
      company: userCompany,
      page: 1,
      page_size: newPageSize,
    };
    dispatch(listInventoryDiscountRules(params));
  };

  const handleMenuOpen = (event, rule) => {
    setAnchorEl(event.currentTarget);
    setSelectedRuleItem(rule);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRuleItem(null);
  };

  const handleViewDetails = async (rule) => {
    await dispatch(getInventoryDiscountRule({ name: rule.name }));
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (rule) => {
    navigate(`/settings/inventory-discounts/${rule.name}/edit`);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (selectedRuleItem) {
      const result = await dispatch(deleteInventoryDiscountRule({ name: selectedRuleItem.name }));
      if (result.type === 'inventoryDiscount/deleteInventoryDiscountRule/fulfilled') {
        // Refresh list
        const params = {
          ...filters,
          company: userCompany,
          page: pagination.page,
          page_size: pagination.page_size,
        };
        dispatch(listInventoryDiscountRules(params));
      }
    }
    setDeleteDialogOpen(false);
    setSelectedRuleItem(null);
  };

  const getRuleTarget = (rule) => {
    if (rule.rule_type === 'Batch') return rule.batch_no || '-';
    if (rule.rule_type === 'Item') return rule.item_code || '-';
    if (rule.rule_type === 'Item Group') return rule.item_group || '-';
    return '-';
  };

  const getRuleStatus = (rule) => {
    if (rule.is_active === 0 || rule.is_active === false) {
      return { label: 'Inactive', color: '#64748B' };
    }
    
    const today = new Date();
    if (rule.valid_from || rule.valid_upto) {
      const isValid = isDiscountRuleValidForDate(rule, today);
      if (!isValid) {
        return { label: 'Expired', color: '#EF4444' };
      }
    }
    
    return { label: 'Active', color: '#10B981' };
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Rule Name',
      width: '18%',
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {value}
          </Typography>
          {row.description && (
            <Typography variant="caption" color="text.secondary" display="block">
              {row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'rule_type',
      header: 'Type',
      width: '10%',
      render: (value) => (
        <Chip
          label={formatRuleType(value)}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'target',
      header: 'Target',
      width: '12%',
      render: (value, row) => (
        <Typography variant="body2">{getRuleTarget(row)}</Typography>
      ),
    },
    {
      field: 'discount',
      header: 'Discount',
      width: '12%',
      render: (value, row) => (
        <Chip
          label={formatDiscountDisplay(row)}
          size="small"
          color="success"
          icon={<LocalOffer sx={{ fontSize: '14px !important' }} />}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'priority',
      header: 'Priority',
      width: '8%',
      render: (value) => value || 10,
    },
    {
      field: 'warehouse',
      header: 'Warehouse',
      width: '12%',
      render: (value) => (
        <Typography variant="body2">{value || 'All Warehouses'}</Typography>
      ),
    },
    {
      field: 'valid_from',
      header: 'Valid From',
      width: '10%',
      render: (value) => (
        <Typography variant="body2">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'valid_upto',
      header: 'Valid To',
      width: '10%',
      render: (value) => (
        <Typography variant="body2">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '10%',
      render: (value, row) => {
        const status = getRuleStatus(row);
        return (
          <StatusChip
            status={status.label.toLowerCase().replace(/\s+/g, '_')}
            label={status.label}
            color={status.color}
          />
        );
      },
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '8%',
      align: 'right',
      render: (value, row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ], []);

  // Calculate stats
  const totalRules = pagination?.total || rules.length;
  const activeRules = rules.filter(r => {
    const status = getRuleStatus(r);
    return status.label === 'Active';
  }).length;
  const expiredRules = rules.filter(r => {
    const status = getRuleStatus(r);
    return status.label === 'Expired';
  }).length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'rule_type',
      label: 'Rule Type',
      value: filters.rule_type || '',
      options: [
        { value: '', label: 'All Types' },
        { value: 'Batch', label: 'Batch' },
        { value: 'Item', label: 'Item' },
        { value: 'Item Group', label: 'Item Group' },
      ],
      width: 140,
    },
    {
      type: 'select',
      key: 'is_active',
      label: 'Status',
      value: filters.is_active === null ? '' : filters.is_active,
      options: [
        { value: '', label: 'All' },
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' },
      ],
      width: 120,
    },
    {
      type: 'text',
      key: 'item_code',
      label: 'Item Code',
      value: filters.item_code || '',
      placeholder: 'Filter by item...',
      width: 140,
    },
  ], [filters]);

  return (
    <Box>
      <PageHeader
        title="Inventory Discount Rules"
        subtitle="Manage discounts for items, batches, and item groups"
        icon={Discount}
        stats={[
          { value: totalRules, label: 'Total Rules', color: 'primary.main' },
          { value: activeRules, label: 'Active', color: 'success.main' },
          { value: expiredRules, label: 'Expired', color: 'error.main' },
        ]}
        actions={[
          {
            label: 'New Discount Rule',
            icon: <Add />,
            onClick: () => navigate('/settings/inventory-discounts/new'),
            variant: 'contained',
          },
        ]}
        loading={isLoading && rules.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search rules..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={(key, value) => {
            if (key === 'is_active') {
              handleFilterChange(key, value === '' ? null : Number(value));
            } else {
              handleFilterChange(key, value);
            }
          }}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={rules}
        loading={isLoading}
        emptyMessage="No discount rules found. Click 'New Discount Rule' to create your first rule."
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || rules.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedRuleItem) {
              handleViewDetails(selectedRuleItem);
            }
          }}
        >
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedRuleItem) {
              handleEdit(selectedRuleItem);
            }
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleDelete}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          dispatch(clearSelectedRule());
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Discount Rule Details</DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedRule ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Rule Name</Typography>
                <Typography variant="body1" fontWeight="medium">{selectedRule.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Company</Typography>
                <Typography variant="body1">{selectedRule.company}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Rule Type</Typography>
                <Typography variant="body1">{formatRuleType(selectedRule.rule_type)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Target</Typography>
                <Typography variant="body1">{getRuleTarget(selectedRule)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Discount</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDiscountDisplay(selectedRule)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Priority</Typography>
                <Typography variant="body1">{selectedRule.priority || 10}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Warehouse</Typography>
                <Typography variant="body1">{selectedRule.warehouse || 'All Warehouses'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  label={getRuleStatus(selectedRule).label}
                  size="small"
                  color={getRuleStatus(selectedRule).color}
                />
              </Grid>
              {selectedRule.valid_from && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Valid From</Typography>
                  <Typography variant="body1">
                    {new Date(selectedRule.valid_from).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              {selectedRule.valid_upto && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Valid To</Typography>
                  <Typography variant="body1">
                    {new Date(selectedRule.valid_upto).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              {selectedRule.description && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedRule.description}</Typography>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography>No details available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setViewDialogOpen(false);
            dispatch(clearSelectedRule());
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Discount Rule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedRuleItem?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryDiscounts;



