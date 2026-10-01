import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete, Scale as ScaleIcon, Scale } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createUOM,
  getUOMs,
  updateUOM,
  deleteUOM,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';

const Units = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { uoms, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      uom_name: '',
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch UOMs on mount (fetch all, client-side pagination)
  useEffect(() => {
    if (userCompany) {
      dispatch(getUOMs({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  // Client-side search and pagination
  const filteredUOMs = useMemo(() => {
    if (!uoms || uoms.length === 0) return [];
    
    let filtered = [...uoms];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((uom) => {
        const uomName = (uom.uom_name || uom.name || '').toLowerCase();
        return uomName.includes(searchLower);
      });
    }
    
    return filtered;
  }, [uoms, searchTerm]);

  // Apply pagination
  const paginatedUOMs = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUOMs.slice(startIndex, endIndex);
  }, [filteredUOMs, page, pageSize]);

  // Calculate stats
  const totalUOMs = filteredUOMs.length;

  // Adjust page if current page becomes empty after filtering/search
  useEffect(() => {
    if (totalUOMs > 0) {
      const maxPage = Math.ceil(totalUOMs / pageSize);
      if (page > maxPage && maxPage > 0) {
        setPage(maxPage);
      }
    } else if (totalUOMs === 0 && page > 1) {
      setPage(1);
    }
  }, [totalUOMs, pageSize, page]);

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  // Search handler
  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setPage(1);
  };

  // Pagination handlers
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    setPageSize(parseInt(newPageSize, 10));
    setPage(1); // Reset to first page when page size changes
  };

  const handleEditOpen = (uom) => {
    resetEdit({
      name: uom.name,
      uom_name: uom.uom_name || uom.name,
      must_be_whole_number: uom.must_be_whole_number === 1 || uom.must_be_whole_number === true || false,
    });
    setSelectedUOM(uom);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUOM(null);
    resetEdit();
  };

  const handleDeleteOpen = (uom) => {
    setSelectedUOM(uom);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedUOM(null);
  };

  const onCreateSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const uomData = {
      company: userCompany,
      uom_name: data.uom_name,
    };

    const result = await dispatch(createUOM(uomData));

    if (result.type === 'product/createUOM/fulfilled') {
      handleCreateClose();
      dispatch(getUOMs({ company: userCompany }));
      setPage(1); // Reset to first page after creating
    }
  };

  const onEditSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Get the original name to identify which UOM to update
    const originalName = data.name || selectedUOM?.name;
    
    if (!originalName) {
      dispatch(showNotification({
        message: 'Original UOM name is required.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // API expects payload structure: { name (required), new_uom_name?, must_be_whole_number? }
    const uomData = {
      name: originalName,
      ...(data.uom_name && data.uom_name !== originalName && { 
        new_uom_name: data.uom_name 
      }),
      ...(data.must_be_whole_number !== undefined && { 
        must_be_whole_number: Boolean(data.must_be_whole_number) 
      }),
    };

    const result = await dispatch(updateUOM(uomData));

    if (result.type === 'product/updateUOM/fulfilled') {
      handleEditClose();
      dispatch(getUOMs({ company: userCompany }));
    }
  };

  const onDeleteConfirm = async () => {
    if (!userCompany || !selectedUOM) return;

    // Get the UOM name to identify which UOM to delete
    const uomName = selectedUOM.uom_name || selectedUOM.name;
    
    if (!uomName) {
      dispatch(showNotification({
        message: 'UOM name is required.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    const result = await dispatch(deleteUOM({
      uom_name: uomName,
      company: userCompany,
    }));

    if (result.type === 'product/deleteUOM/fulfilled') {
      handleDeleteClose();
      dispatch(getUOMs({ company: userCompany }));
      // Page will adjust automatically after refetch and recalculation
      // If the current page becomes empty, we'll handle it in useEffect
    }
  };

  // Prepare table columns
  const columns = [
    {
      field: 'uom_name',
      header: 'Unit Name',
      minWidth: 200,
      render: (value, row) => (
        <Typography variant="body2" fontWeight={500}>
          {value || row.name || '-'}
        </Typography>
      ),
    },
    {
      field: 'must_be_whole_number',
      header: 'Whole Number',
      minWidth: 150,
      render: (value, row) => (
        <Chip
          label={row.must_be_whole_number === 1 || row.must_be_whole_number === true ? 'Yes' : 'No'}
          size="small"
          color={row.must_be_whole_number === 1 || row.must_be_whole_number === true ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      align: 'right',
      minWidth: 100,
      render: (value, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleEditOpen(row)}
            color="primary"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteOpen(row)}
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Prepare table rows
  const rows = paginatedUOMs.map((uom) => ({
    id: uom.name,
    uom_name: uom.uom_name || uom.name,
    must_be_whole_number: uom.must_be_whole_number,
    ...uom, // Spread all original properties
  }));

  return (
    <Box>
      <PageHeader
        title="Units of Measure"
        subtitle="Manage units of measure for products"
        icon={Scale}
        stats={[
          { value: totalUOMs, label: 'Total', color: 'primary.main' },
        ]}
        actions={[
          {
            label: 'Create Unit',
            icon: <Add />,
            onClick: handleCreateOpen,
            variant: 'contained',
          },
        ]}
        backAction={{
          label: 'Back',
          onClick: () => navigate('/products'),
        }}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search units of measure..."
          onSearchChange={handleSearch}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        pagination={{
          page,
          pageSize,
          total: totalUOMs,
          totalPages: Math.ceil(totalUOMs / pageSize),
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        emptyMessage="No units of measure found. Create one to get started."
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Create Unit of Measure</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="uom_name"
                  control={createControl}
                  rules={{ required: 'Unit name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Unit Name"
                      fullWidth
                      size="small"
                      required
                      placeholder="e.g., Nos, Kg, Ltr, Box"
                      error={!!createErrors.uom_name}
                      helperText={createErrors.uom_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ScaleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>Edit Unit of Measure</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="uom_name"
                  control={editControl}
                  rules={{ required: 'Unit name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Unit Name"
                      fullWidth
                      size="small"
                      required
                      error={!!editErrors.uom_name}
                      helperText={editErrors.uom_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ScaleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Controller
                  name="must_be_whole_number"
                  control={editControl}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} size="small" />}
                      label="Must be whole number"
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
          <DialogTitle>Delete Unit of Measure</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedUOM?.uom_name || selectedUOM?.name}"?
              This action cannot be undone. Make sure this unit is not being used by any products.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={onDeleteConfirm}
              color="error"
              variant="contained"
              disabled={isLoading}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isLoading ? <CircularProgress size={18} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default Units;
